import { isRetryable } from "../../../src/protocol/close-codes.ts";
import type {
  Actor,
  ErrorCode,
  ErrorFrame,
  RunCheck,
  RunEv,
  RunEvUp,
  RunFrame,
  RunReq,
  RunReqUp,
  RunTick,
  RunCheckUp,
  RunTickUp,
} from "../../../src/protocol/frames.ts";
import { RUN_LIMITS, classifyOp } from "../../../src/protocol/run-ops.ts";
import type { RunReqName, RunState } from "../../../src/protocol/run-ops.ts";
import type { TokenBucket } from "../ws/bucket.ts";
import type { MemberRef } from "./types.ts";

type Member = MemberRef;
type RunStatus = RunState["state"];

export type RunUp = RunReqUp | RunEvUp | RunTickUp | RunCheckUp | RunFrame;
export type RunDown = RunEv | RunTick | RunCheck | RunFrame | RunReq;

export interface RoomEventInput {
  kind: string;
  by: Actor | null;
  data: Record<string, unknown>;
}

export interface RunOutcome {
  send: Array<{ to: "all" | Member; frame: RunDown }>;
  errors: Array<{ to: Member; error: ErrorFrame }>;
  events: RoomEventInput[];
}

export interface RunChannel {
  onFrame(from: Member, f: RunUp): RunOutcome;
  onCommit(seq: number, ops: ReadonlyArray<{ kind: string; value?: unknown; collection?: unknown }>): RunOutcome;
  onCmd(from: Member, name: "runner.set" | "run.detach", args: unknown): RunOutcome;
  onLeave(m: Member): RunOutcome;
  welcome(): { run: RunState | null; runner: Actor | null; log: readonly RunEv[] };
}

interface RunRoom {
  settings(): { runControl: "editors" | "host" };
  members(): readonly Member[];
  host(): Member | null;
}

/** The author of requests the server itself sends to the runner. */
const SERVER_ACTOR: Actor = "usr_server";

/** Statuses a request may start from; `null` means any. */
const REQ_FROM: Record<RunReqName, readonly RunStatus[] | null> = {
  start: ["idle", "done", "halted"],
  pause: ["running"],
  resume: ["paused"],
  step: ["paused"],
  speed: ["running", "paused"],
  input: ["running", "paused"],
  stop: null,
  reset: null,
};

const REQ_TO: Partial<Record<RunReqName, RunStatus>> = {
  start: "running",
  pause: "paused",
  resume: "running",
  stop: "idle",
  reset: "idle",
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const isSpeed = (v: unknown): v is number => typeof v === "number" && (v === 0 || (v >= 0.01 && v <= 100));

function argsFault(req: RunReqName, args: unknown): string | null {
  switch (req) {
    case "start":
      return isRecord(args) &&
        isCount(args.atSeq) &&
        isCount(args.seed) &&
        isSpeed(args.speed) &&
        isRecord(args.versions) &&
        Object.values(args.versions).every((v) => typeof v === "string")
        ? null
        : "start needs atSeq, seed, speed and versions";
    case "speed":
      return isRecord(args) && isSpeed(args.x) ? null : "speed needs x between 0.01 and 100, or 0";
    case "step":
      return isRecord(args) && typeof args.unit === "string" && isCount(args.n) && args.n > 0 ? null : "step needs unit and n";
    default:
      return null;
  }
}

const canRun = (m: Member): boolean => !m.spectator && (m.role === "owner" || m.role === "editor");

const emptyOutcome = (): RunOutcome => ({ send: [], errors: [], events: [] });

export function createRunChannel(room: RunRoom, d: { clock(): number; bucket(): TokenBucket }): RunChannel {
  let run: RunState | null = null;
  let runnerM: number | null = null;
  let log: RunEv[] = [];
  let highNs = -1;
  let runCount = 0;
  let srvCount = 0;
  const buckets = new Map<number, TokenBucket>();
  const framers = new Set<number>();

  const status = (): RunStatus => run?.state ?? "idle";
  const live = (): boolean => status() === "running" || status() === "paused";
  const runnerRef = (): Member | undefined => (runnerM === null ? undefined : room.members().find((x) => x.m === runnerM));

  function fail(o: RunOutcome, to: Member, code: ErrorCode, message: string, ref?: string, retryAfterMs?: number): RunOutcome {
    const error: ErrorFrame = { t: "error", code, message, retryable: isRetryable(code) };
    if (ref !== undefined) error.ref = ref;
    if (retryAfterMs !== undefined) error.retryAfterMs = retryAfterMs;
    o.errors.push({ to, error });
    return o;
  }

  function serverReq(req: RunReq["req"], args: unknown): RunReq {
    srvCount += 1;
    return { t: "run.req", from: SERVER_ACTOR, id: `srv-${srvCount}`, req, args };
  }

  function askFrames(o: RunOutcome, to: Member, on: boolean): void {
    o.send.push({ to, frame: serverReq("frames", { on }) });
  }

  function framersChanged(o: RunOutcome, before: number): void {
    const target = runnerRef();
    if (!target || (before === 0) === (framers.size === 0)) return;
    askFrames(o, target, framers.size > 0);
  }

  function control(o: RunOutcome, target: string, value: Record<string, unknown>): void {
    const r = run as RunState;
    r.rseq += 1;
    const ev: RunEv = { t: "run.ev", rseq: r.rseq, tNs: r.horizonNs, kind: "control", target, value };
    if (log.length < RUN_LIMITS.logMax) log.push(ev);
    o.send.push({ to: "all", frame: ev });
  }

  function halt(o: RunOutcome, reason: NonNullable<RunState["haltReason"]>, seq?: number): void {
    const r = run as RunState;
    r.state = "halted";
    r.haltReason = reason;
    const data = seq === undefined ? { reason } : { reason, seq };
    control(o, "halt", data);
    o.events.push({ kind: "run.halt", by: null, data });
  }

  function mayControl(m: Member): boolean {
    if (!canRun(m)) return false;
    return room.settings().runControl === "editors" || room.host()?.m === m.m || runnerM === m.m;
  }

  function begin(args: Record<string, unknown>, runner: Member): void {
    runCount += 1;
    log = [];
    highNs = -1;
    run = {
      runId: `run-${d.clock().toString(36)}-${runCount}`,
      state: "running",
      runner: runner.actor,
      atSeq: args.atSeq as number,
      seed: args.seed as number,
      speed: args.speed as number,
      horizonNs: 0,
      versions: args.versions as Record<string, string>,
      rseq: 0,
    };
  }

  function request(o: RunOutcome, from: Member, f: RunReqUp): RunOutcome {
    let bucket = buckets.get(from.m);
    if (!bucket) buckets.set(from.m, (bucket = d.bucket()));
    const now = d.clock();
    if (!bucket.take(now)) return fail(o, from, "rate_limited", "too many run requests", f.id, bucket.retryAfterMs(now));
    if (!mayControl(from)) return fail(o, from, "permission", "you cannot control the run", f.id);
    const fault = argsFault(f.req, f.args);
    if (fault) return fail(o, from, "bad_run_frame", fault, f.id);
    const allowed = REQ_FROM[f.req];
    if (allowed && !allowed.includes(status())) return fail(o, from, "run_state", `${f.req} is not possible while the run is ${status()}`, f.id);

    let target = runnerRef();
    if (!target && f.req === "start") {
      target = room.host() ?? undefined;
      if (target) {
        runnerM = target.m;
        if (framers.size > 0) askFrames(o, target, true);
      }
    }
    if (!target && (f.req === "start" || f.req === "input")) return fail(o, from, "run_state", "the room has no runner", f.id);

    const args = isRecord(f.args) ? f.args : {};
    if (f.req === "start") begin(args, target as Member);
    const r = run as RunState;
    const next = REQ_TO[f.req];
    if (next) r.state = next;
    if (next === "idle") delete r.haltReason;
    if (f.req === "reset") {
      log = [];
      highNs = -1;
      r.rseq = 0;
      r.horizonNs = 0;
    }
    if (f.req === "speed") r.speed = args.x as number;
    if (f.req !== "input") {
      control(o, f.req, args);
      o.events.push({ kind: `run.${f.req}`, by: from.actor, data: args });
    }
    if (target) {
      const frame: RunReq = { t: "run.req", from: from.actor, id: f.id, req: f.req };
      if (f.args !== undefined) frame.args = f.args;
      o.send.push({ to: target, frame });
    }
    return o;
  }

  function publish(o: RunOutcome, from: Member, f: Exclude<RunUp, RunReqUp>): RunOutcome {
    if (runnerM !== from.m) return fail(o, from, "permission", "only the runner publishes run frames");
    const r = run;
    if (!r || !live()) return fail(o, from, "run_state", `no run is going: ${status()}`);
    switch (f.t) {
      case "run.tick":
        if (f.tNs < r.horizonNs) return fail(o, from, "bad_run_frame", "tick went backward");
        r.horizonNs = f.tNs;
        highNs = Math.max(highNs, f.tNs);
        o.send.push({ to: "all", frame: { t: "run.tick", tNs: f.tNs } });
        break;
      case "run.ev": {
        if (f.tNs <= highNs) return fail(o, from, "bad_run_frame", "event is not after the latest tick or event");
        if (log.length >= RUN_LIMITS.logMax) {
          halt(o, "log_full");
          return fail(o, from, "run_log_full", "the run log is full");
        }
        highNs = f.tNs;
        r.rseq += 1;
        const ev: RunEv = { t: "run.ev", rseq: r.rseq, tNs: f.tNs, kind: f.kind, target: f.target, value: f.value };
        log.push(ev);
        o.send.push({ to: "all", frame: ev });
        break;
      }
      case "run.check":
        o.send.push({ to: "all", frame: { t: "run.check", tNs: f.tNs, hb: f.hb, hd: f.hd } });
        break;
      case "run.frame":
        if (Buffer.byteLength(JSON.stringify(f)) > RUN_LIMITS.frameMaxBytes) return fail(o, from, "bad_run_frame", "frame is too large");
        for (const x of room.members()) if (framers.has(x.m)) o.send.push({ to: x, frame: f });
        break;
    }
    return o;
  }

  function setRunner(o: RunOutcome, from: Member, to: unknown): RunOutcome {
    if (room.host()?.m !== from.m) return fail(o, from, "permission", "only the host picks the runner");
    const next = room.members().find((x) => x.actor === to && canRun(x));
    if (!next) return fail(o, from, "bad_frame", "the runner must be an editor in the room");
    if (status() === "running") return fail(o, from, "run_state", "pause the run before changing the runner");
    const prev = runnerRef();
    if (prev?.m === next.m) return o;
    runnerM = next.m;
    if (framers.size > 0) {
      askFrames(o, next, true);
      if (prev) askFrames(o, prev, false);
    }
    o.events.push({ kind: "runner.set", by: from.actor, data: { to: next.actor } });
    return o;
  }

  return {
    onFrame(from, f) {
      const o = emptyOutcome();
      return f.t === "run.req" ? request(o, from, f) : publish(o, from, f);
    },

    onCommit(seq, ops) {
      const o = emptyOutcome();
      if (!live()) return o;
      const classes = ops.map(classifyOp);
      if (classes.includes("sim-affecting")) {
        halt(o, "edited", seq);
        return o;
      }
      const target = runnerRef();
      if (!target) return o;
      ops.forEach((op, i) => {
        if (classes[i] === "run-input") o.send.push({ to: target, frame: serverReq("input", { commitSeq: seq, kind: op.kind }) });
      });
      return o;
    },

    onCmd(from, name, args) {
      const o = emptyOutcome();
      const a = isRecord(args) ? args : {};
      if (name === "runner.set") return setRunner(o, from, a.to);
      const before = framers.size;
      if (a.mode === "frames") framers.add(from.m);
      else framers.delete(from.m);
      framersChanged(o, before);
      return o;
    },

    onLeave(m) {
      const o = emptyOutcome();
      buckets.delete(m.m);
      if (runnerM === m.m) {
        runnerM = null;
        if (live()) {
          (run as RunState).state = "paused";
          control(o, "pause", {});
          o.events.push({ kind: "runner.lost", by: m.actor, data: { horizonNs: (run as RunState).horizonNs } });
        }
      }
      const before = framers.size;
      framers.delete(m.m);
      framersChanged(o, before);
      return o;
    },

    welcome() {
      const runner = runnerRef()?.actor ?? null;
      return { run: run && { ...run, runner }, runner, log };
    },
  };
}
