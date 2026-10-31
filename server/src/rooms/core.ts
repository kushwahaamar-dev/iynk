import { canonicalize, utf8Encode } from "../../../src/core/canonical.ts";
import { newId } from "../../../src/core/ids.ts";
import type { Op, OpEnvelope, Project } from "../../../src/project/generated/types.ts";
import { stateHash } from "../../../src/project/hash.ts";
import { CLOSE, isRetryable } from "../../../src/protocol/close-codes.ts";
import type {
  Actor,
  Cmd,
  Commit,
  ErrorCode,
  ErrorFrame,
  RejectCode,
  Resync,
  Role,
  RoomId,
  RoomSettings,
  ServerFrame,
  Snapshot,
  Submit,
  WireEnvelope,
} from "../../../src/protocol/frames.ts";
import type { DeviceId, MemberRow, SubmissionRow } from "../store/rooms.ts";
import { aclFor, applyBatch, touchesAccess } from "./commit.ts";
import type { BatchInput, CommitWrite } from "./commit.ts";
import { DedupWindow } from "./dedup.ts";
import type { Subject } from "./permissions.ts";
import type { CoreDeps, MemberRef, Outbound, RoomInit } from "./types.ts";

const MAX_GROUP_SUBMISSIONS = 256;
const MAX_GROUP_BYTES = 4 * 1024 * 1024;
const DEDUP_KEEP = 8;
const REJECT_BURST = 20;
const BURST_WINDOW_MS = 60_000;
const CHECKS_PER_HASH = 5;

type Job =
  | { kind: "client"; m: number; device: DeviceId; f: Submit }
  | { kind: "system"; by: Actor; ops: Op[]; why: string };

type Bucket = { tokens: number; at: number };

const wire = (env: OpEnvelope): WireEnvelope => env as WireEnvelope;

const targetOf = (op: Op): string | null => {
  const named = op as { id?: unknown; actor?: unknown };
  if (typeof named.id === "string") return named.id;
  return typeof named.actor === "string" ? named.actor : null;
};

function errorFrame(code: ErrorCode, message: string, sub?: number, retryAfterMs?: number): ErrorFrame {
  const frame: ErrorFrame = { t: "error", code, message, retryable: isRetryable(code) };
  if (sub !== undefined) frame.ref = String(sub);
  if (retryAfterMs !== undefined) frame.retryAfterMs = retryAfterMs;
  return frame;
}

const toMember = (m: number, frame: ServerFrame): Outbound => ({ to: { kind: "member", m }, frame });

export class RoomCore {
  readonly id: RoomId;
  readonly epoch: string;
  readonly projectId: string;
  host: Actor | null;
  baton: Actor | null;
  settings: RoomSettings;
  state: "open" | "locked";

  readonly #deps: CoreDeps;
  readonly #dedup: DedupWindow;
  readonly #members = new Map<number, MemberRef>();
  readonly #buckets = new Map<number, Bucket>();
  readonly #rejections = new Map<number, number[]>();
  readonly #pending = new Set<string>();
  #queue: Job[] = [];
  #doc: Project;
  #seq: number;
  #chain: string;
  #nextMember = 1;
  #opsSinceCheck = 0;
  #lastCheckAt: number;
  #checks = 0;

  constructor(init: RoomInit, deps: CoreDeps) {
    this.id = init.id;
    this.epoch = init.epoch;
    this.projectId = init.projectId;
    this.host = init.host;
    this.baton = init.baton;
    this.settings = init.settings;
    this.state = init.state;
    this.#doc = init.doc;
    this.#seq = init.seq;
    this.#chain = init.chain;
    this.#deps = deps;
    this.#dedup = new DedupWindow(deps.repo, init.id, DEDUP_KEEP);
    this.#lastCheckAt = deps.clock();
  }

  get seq(): number {
    return this.#seq;
  }

  get chain(): string {
    return this.#chain;
  }

  get doc(): Project {
    return this.#doc;
  }

  members(): readonly MemberRef[] {
    return [...this.#members.values()];
  }

  member(m: number): MemberRef | undefined {
    return this.#members.get(m);
  }

  addMember(ref: Omit<MemberRef, "m" | "ready">): MemberRef {
    const member: MemberRef = { ...ref, m: this.#nextMember, ready: false };
    this.#nextMember += 1;
    this.#members.set(member.m, member);
    return member;
  }

  markReady(m: number): void {
    const member = this.#members.get(m);
    if (member) member.ready = true;
  }

  removeMember(m: number): void {
    this.#members.delete(m);
    this.#buckets.delete(m);
    this.#rejections.delete(m);
  }

  submit(m: number, f: Submit): Outbound[] {
    const member = this.#members.get(m);
    if (!member) return [];
    if (!member.ready) return [toMember(m, errorFrame("not_ready", "send ready before submitting", f.sub))];
    const wait = this.#takeToken(m);
    if (wait > 0) return [toMember(m, errorFrame("rate_limited", "too many submissions", f.sub, wait))];

    const firstOpId = f.ops[0]?.opId;
    if (firstOpId === undefined) return [toMember(m, this.#rejectFrame(f.sub, "malformed", "a submission needs at least one op"))];
    const stored = this.#dedup.lookup(member.device, firstOpId);
    if (stored) {
      this.#deps.metrics.dedupHit();
      return [toMember(m, this.#dupCommit(stored, f.sub))];
    }

    const key = `${member.device}\0${firstOpId}`;
    if (this.#pending.has(key)) return [];
    this.#pending.add(key);
    this.#queue.push({ kind: "client", m, device: member.device, f });
    this.#deps.metrics.queueDepth(this.#queue.length);
    return [];
  }

  flush(): Outbound[] {
    if (this.#queue.length === 0) return [];
    const jobs = this.#queue.splice(0, MAX_GROUP_SUBMISSIONS);
    const { out, left } = this.#commitGroup(jobs);
    this.#queue.unshift(...left);
    for (const job of jobs.slice(0, jobs.length - left.length)) if (job.kind === "client") this.#pending.delete(this.#key(job));
    this.#deps.metrics.queueDepth(this.#queue.length);
    return out;
  }

  commitSystem(by: Actor, ops: Op[], why: string): Outbound[] {
    return this.#commitGroup([{ kind: "system", by, ops, why }]).out;
  }

  tick(): Outbound[] {
    const { limits, clock } = this.#deps;
    const now = clock();
    const due = this.#opsSinceCheck >= limits.checkEveryOps || (this.#opsSinceCheck > 0 && now - this.#lastCheckAt >= limits.checkEveryMs);
    if (!due) return [];
    this.#opsSinceCheck = 0;
    this.#lastCheckAt = now;
    this.#checks += 1;
    const frame: ServerFrame = { t: "check", seq: this.#seq, chain: this.#chain };
    if (this.#checks % CHECKS_PER_HASH === 0) frame.stateHash = stateHash(this.#doc);
    return [{ to: { kind: "room" }, frame }];
  }

  resync(m: number, _f: Resync): Outbound[] {
    return this.#members.has(m) ? [toMember(m, this.snapshot("resync"))] : [];
  }

  snapshot(reason: Snapshot["reason"]): Snapshot {
    return {
      t: "snapshot",
      reason,
      seq: this.#seq,
      chain: this.#chain,
      stateHash: stateHash(this.#doc),
      doc: this.#doc as unknown as Snapshot["doc"],
    };
  }

  command(m: number, c: Cmd): Outbound[] {
    const member = this.#members.get(m);
    if (!member) return [];
    if (!this.#deps.commands) return [toMember(m, errorFrame("bad_type", "commands are not available"))];
    return this.#deps.commands.handle(this, member, c);
  }

  #key(job: Extract<Job, { kind: "client" }>): string {
    return `${job.device}\0${job.f.ops[0]?.opId}`;
  }

  #takeToken(m: number): number {
    const { submitPerSec, submitBurst } = this.#deps.limits;
    const now = this.#deps.clock();
    const bucket = this.#buckets.get(m) ?? { tokens: submitBurst, at: now };
    bucket.tokens = Math.min(submitBurst, bucket.tokens + ((now - bucket.at) * submitPerSec) / 1000);
    bucket.at = now;
    this.#buckets.set(m, bucket);
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return 0;
    }
    return Math.ceil(((1 - bucket.tokens) * 1000) / submitPerSec);
  }

  #rejectFrame(sub: number, code: RejectCode, message: string, index?: number, rule?: string): ServerFrame {
    this.#deps.metrics.opRejected(code);
    return {
      t: "reject",
      sub,
      code,
      message,
      ...(index === undefined ? {} : { index }),
      ...(rule === undefined ? {} : { rule }),
    };
  }

  #noteRejection(member: MemberRef): void {
    const now = this.#deps.clock();
    const recent = (this.#rejections.get(member.m) ?? []).filter((at) => now - at < BURST_WINDOW_MS);
    recent.push(now);
    this.#rejections.set(member.m, recent);
    if (recent.length === REJECT_BURST + 1) {
      this.#deps.log?.warn("room.reject_burst", { room: this.id, actor: member.actor, rejections: recent.length });
    }
  }

  #dupCommit(row: SubmissionRow, sub: number): Commit {
    const chain = this.#deps.repo.chainAt(this.id, row.seq1) ?? this.#chain;
    const inverse = JSON.parse(row.inverse) as Op[];
    return { t: "commit", seq0: row.seq0, seq1: row.seq1, chain, ack: { sub, inverse, dup: true } };
  }

  #subject(member: MemberRef, role: Role): Subject {
    const open = this.settings.codeMode === "open";
    return {
      role,
      spectator: member.spectator,
      actor: member.actor,
      host: member.actor === this.host,
      creator: false,
      baton: open ? member.actor : this.baton,
      codeMode: "baton",
      muted: member.muted,
    };
  }

  #commitGroup(jobs: Job[]): { out: Outbound[]; left: Job[] } {
    const { repo, clock, metrics } = this.#deps;
    const now = clock();
    const date = new Date(now);
    const hasBlob = (sha256: string) => this.#deps.hasBlob(this.id, sha256);
    const out: Outbound[] = [];
    const group: CommitWrite[] = [];
    const answers: { job: Extract<Job, { kind: "client" }>; commit: Commit; row: SubmissionRow }[] = [];
    const roles = new Map<DeviceId, Role | null>();
    let rows: MemberRow[] | null = null;
    let doc = this.#doc;
    let seq = this.#seq;
    let chain = this.#chain;
    let bytes = 0;
    let used = 0;

    for (const job of jobs) {
      if (bytes >= MAX_GROUP_BYTES) break;
      used += 1;

      let subject: Subject;
      let input: BatchInput;
      let device: DeviceId;
      let member: MemberRef | undefined;
      if (job.kind === "client") {
        member = this.#members.get(job.m);
        if (!member || member.device !== job.device) continue;
        const role = roles.has(member.device) ? roles.get(member.device) : member.role;
        if (!role) continue;
        subject = this.#subject(member, role);
        input = job.f;
        device = member.device;
      } else {
        const author = this.#authorDevice(job.by);
        subject = { role: "owner", spectator: false, actor: job.by, host: false, creator: false, baton: null, codeMode: "baton", muted: false };
        input = { ops: job.ops.map((op) => ({ opId: newId("op"), base: seq, op })) };
        device = author;
      }

      const result = applyBatch(doc, subject, input, { seq, chain }, date, hasBlob, job.kind === "client" ? "client" : "server", this.#deps.apply);
      if (!result.ok) {
        const { code, message, index, rule } = result.reject;
        if (job.kind === "system") throw new Error(`system commit "${job.why}" was refused: ${code}: ${message}`);
        out.push(toMember(job.m, this.#rejectFrame(job.f.sub, code, message, index, rule)));
        if (member) this.#noteRejection(member);
        continue;
      }

      let acl: NonNullable<CommitWrite["write"]["acl"]> = [];
      if (touchesAccess(result.envs)) {
        rows ??= repo.members(this.id);
        acl = aclFor(doc, result.doc, result.envs, rows);
        for (const change of acl) {
          const role = "remove" in change ? null : (change.patch.role ?? null);
          roles.set(change.device, role);
          rows = rows.flatMap((row) => (row.device_id !== change.device ? [row] : role === null ? [] : [{ ...row, role }]));
        }
      }

      const seq0 = seq + 1;
      const seq1 = seq + result.envs.length;
      const inverse = JSON.stringify(result.inverse);
      const ops = result.envs.map((env, i) => {
        const encoded = utf8Encode(canonicalize(env));
        bytes += encoded.length;
        return {
          seq: env.seq,
          env: encoded,
          author_actor: env.author.actor,
          kind: env.op.k,
          target: targetOf(env.op),
          at: now,
          chain: result.chains[i] as string,
        };
      });
      const firstOpId = (result.envs[0] as OpEnvelope).opId;
      const events = job.kind === "system" ? [{ kind: "commit.system", actor: job.by, data: { why: job.why } }] : [];
      group.push({
        write: { room_id: this.id, device_id: device, first_op_id: firstOpId, ops, inverse, state_hash: "", at: now, events, acl },
        envs: result.envs,
      });
      const commit: Commit = { t: "commit", seq0, seq1, chain: result.chains[result.chains.length - 1] as string };
      if (job.kind === "client") {
        answers.push({
          job,
          commit: { ...commit, ack: { sub: job.f.sub, inverse: result.inverse } },
          row: { room_id: this.id, device_id: device, first_op_id: firstOpId, seq0, seq1, inverse, at: now },
        });
      }
      doc = result.doc;
      seq = seq1;
      chain = commit.chain;
    }

    const left = jobs.slice(used);
    if (group.length === 0) return { out, left };

    const hash = stateHash(doc);
    for (const { write } of group) write.state_hash = hash;
    const started = performance.now();
    try {
      repo.appendCommits(group.map((g) => g.write));
    } catch (error) {
      if (jobs.some((job) => job.kind === "system")) throw error;
      for (const { job } of answers) out.push(toMember(job.m, errorFrame("server_error", "the edit could not be saved", job.f.sub)));
      return { out, left };
    }
    metrics.commitSeconds((performance.now() - started) / 1000);

    this.#doc = doc;
    this.#seq = seq;
    this.#chain = chain;
    this.#opsSinceCheck += group.reduce((n, g) => n + g.envs.length, 0);
    metrics.opsAccepted(group.reduce((n, g) => n + g.envs.length, 0));
    for (const { row } of answers) this.#dedup.remember(row);
    this.#deps.afterCommit?.(group);
    this.#deps.checkpointer?.afterCommit(this, group);

    return { out: [...out, ...this.#frames(group, answers), ...this.#applyRoles(group)], left };
  }

  #authorDevice(by: Actor): DeviceId {
    const live = [...this.#members.values()].find((member) => member.actor === by);
    if (live) return live.device;
    const room = this.#deps.repo.getRoom(this.id);
    if (!room) throw new Error(`room ${this.id} does not exist`);
    return room.creator_device;
  }

  #frames(group: CommitWrite[], answers: { job: Extract<Job, { kind: "client" }>; commit: Commit }[]): Outbound[] {
    const out: Outbound[] = [];
    const byFirstOp = new Map(answers.map((a) => [a.job.f.ops[0]?.opId, a]));
    for (const { envs, write } of group) {
      const first = envs[0] as OpEnvelope;
      const last = envs[envs.length - 1] as OpEnvelope;
      const answer = byFirstOp.get(first.opId);
      const everyone: Commit = {
        t: "commit",
        seq0: first.seq,
        seq1: last.seq,
        chain: (write.ops[write.ops.length - 1] as { chain: string }).chain,
        envs: envs.map(wire),
      };
      if (answer) {
        out.push(toMember(answer.job.m, answer.commit));
        out.push({ to: { kind: "room", except: answer.job.m }, frame: everyone });
      } else {
        out.push({ to: { kind: "room" }, frame: everyone });
      }
    }
    return out;
  }

  #applyRoles(group: CommitWrite[]): Outbound[] {
    const out: Outbound[] = [];
    for (const { write } of group) {
      for (const change of write.acl ?? []) {
        const member = [...this.#members.values()].find((ref) => ref.device === change.device);
        if (!member) continue;
        if ("remove" in change) {
          out.push({ to: { kind: "member", m: member.m }, close: CLOSE.roomUnavailable });
          this.removeMember(member.m);
        } else if (change.patch.role) {
          member.role = change.patch.role;
        }
      }
    }
    return out;
  }
}
