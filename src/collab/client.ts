import { newId } from "../core/ids.ts";
import type { RandomSource } from "../core/ids.ts";
import { chainNext, stateHash } from "../project/hash.ts";
import type { Op, OpEnvelope, Project } from "../project/generated/types.ts";
import { CLOSE } from "../protocol/index.ts";
import type {
  ClientFrame,
  Commit,
  DeviceId,
  ErrorFrame,
  Reject,
  Resync,
  RoomId,
  ServerFrame,
  Snapshot,
  Tail,
  Welcome,
  WireEnvelope,
} from "../protocol/index.ts";
import { backoffMs } from "./backoff.ts";
import { PendingQueue } from "./queue.ts";
import type { PendingSub } from "./queue.ts";
import { applySub, explainReject, rebuildView } from "./rebase.ts";
import type { ApplyFn, Author, DropReason, RebaseReport } from "./rebase.ts";
import type { CloseEvent, RoomTransport } from "./ws-transport.ts";

export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export type ClientState = "connecting" | "authenticating" | "syncing" | "live" | "reconnecting" | "ended" | "failed";

export type ClientEvent =
  | { t: "state"; state: ClientState; detail?: string }
  | { t: "view"; confirmedSeq: number }
  | { t: "remote"; envs: OpEnvelope[] }
  | { t: "acked"; sub: number; seq0: number; seq1: number; inverse: Op[]; dup: boolean }
  | { t: "rejected"; sub: number; reason: DropReason }
  | { t: "rebase"; report: RebaseReport }
  | { t: "room"; frame: ServerFrame }
  | { t: "ended"; why: "kicked" | "closed" | "unavailable" | "superseded" };

/** What the next `hello` carries; the transport that signs it is built by `connect`, so the client hands this over. */
export type HelloState = {
  resume?: { epoch: string; seq: number; chain: string };
  local?: { rev: number; chain: string };
};

export type RoomClientOptions = {
  room: RoomId;
  me: { device: DeviceId };
  connect: (hello: HelloState) => RoomTransport;
  applyFn: ApplyFn;
  clock: () => number;
  random: () => number;
  timers: Timers;
  hidden: () => boolean;
  start?:
    | { epoch: string; seq: number; chain: string; doc: Project }
    | { local: { rev: number; chain: string; doc: Project } }
    | null;
  maxPending?: number;
  onDivergence?: (d: { reason: Resync["reason"]; seq: number }) => void;
};

type Collecting = { dropped: RebaseReport["dropped"]; localBefore: Project; until: number | null };

const MAX_PENDING = 1000;
const ACKED_KEPT = 1000;
const CHAINS_KEPT = 256;
const ENVELOPES_KEPT = 1024;

const asEnvelope = (env: WireEnvelope) => env as unknown as OpEnvelope;

export class RoomClient {
  private _state: ClientState = "connecting";
  private doc: Project | null = null;
  private seq = 0;
  private chain: string | null = null;
  private epoch: string | null = null;
  private welcomeEpoch: string | null = null;
  private actor: string | null = null;
  private epochBreak = false;
  private resyncing = false;
  private hadReady = false;
  private started = false;
  private stopped = false;
  private attempt = 0;
  private resendAttempt = 0;
  private inFlight: number | null = null;
  private backingOff = false;
  private transport: RoomTransport | null = null;
  private reconnectTimer: unknown = null;
  private resendTimer: unknown = null;
  private viewCache: Project | null = null;
  private collecting: Collecting | null = null;
  private recorded = new Map<number, string>();
  private recent: OpEnvelope[] = [];
  private acked: { sub: PendingSub; seq1: number }[] = [];
  private landed = new Set<number>();
  private readonly queue: PendingQueue;
  private readonly handlers = new Set<(e: ClientEvent) => void>();
  private readonly rnd: RandomSource;
  readonly diagnostics = { resyncs: 0, drops: 0, reconnects: 0 };

  constructor(private readonly o: RoomClientOptions) {
    this.queue = new PendingQueue(o.maxPending ?? MAX_PENDING);
    this.rnd = { bytes: (n) => Uint8Array.from({ length: n }, () => Math.floor(o.random() * 256)) };
    const start = o.start;
    if (start && "epoch" in start) {
      this.doc = start.doc;
      this.seq = start.seq;
      this.chain = start.chain;
      this.epoch = start.epoch;
    } else if (start) {
      this.doc = start.local.doc;
      this.seq = start.local.rev;
      this.chain = start.local.chain;
    }
    if (this.chain !== null) this.recorded.set(this.seq, this.chain);
  }

  get state(): ClientState {
    return this._state;
  }

  get confirmedSeq(): number {
    return this.seq;
  }

  get confirmed(): Project | null {
    return this.doc;
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  /** Computed from `confirmed` plus the pending queue and kept only until either changes. */
  getView(): Project | null {
    if (!this.doc) return null;
    this.viewCache ??= this.build().view;
    return this.viewCache;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.open();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    const transport = this.transport;
    this.transport = null;
    transport?.close();
    if (this._state !== "failed") this.setState("ended");
  }

  on(h: (e: ClientEvent) => void): () => void {
    this.handlers.add(h);
    return () => {
      this.handlers.delete(h);
    };
  }

  submit(
    ops: Op[],
    meta: { batch?: string; kind?: "user" | "ai"; proposal?: string } = {},
  ): { ok: true; sub: number } | { ok: false; reason: "queue_full" | "not_ready" | "ended" } {
    if (this._state === "ended" || this._state === "failed") return { ok: false, reason: "ended" };
    if (!this.doc) return { ok: false, reason: "not_ready" };
    const seen = this.seq + this.queue.all().reduce((n, s) => n + s.ops.length, 0);
    const pushed = this.queue.push({
      batch: meta.batch ?? null,
      kind: meta.kind ?? "user",
      ...(meta.proposal !== undefined && { proposal: meta.proposal }),
      ops: ops.map((op, i) => ({ opId: newId("op", this.rnd), base: seen + i, op })),
    });
    if (!pushed.ok) return pushed;
    const before = this.queue.length;
    this.queue.mergeTail();
    const last = this.queue.all().at(-1)!;
    if (this.queue.length < before) this.viewCache = null;
    else this.extendView(last);
    this.pump();
    return { ok: true, sub: last.sub };
  }

  /** Presence, cursor, chat and command frames: ephemeral, never queued, dropped while the socket is not open. */
  send(frame: ClientFrame): void {
    if (this._state === "live" && this.transport?.state === "open") this.transport.send(frame);
  }

  private emit(e: ClientEvent): void {
    for (const h of [...this.handlers]) h(e);
  }

  private setState(state: ClientState, detail?: string): void {
    if (this._state === state && detail === undefined) return;
    this._state = state;
    this.emit({ t: "state", state, ...(detail !== undefined && { detail }) });
  }

  private clearTimers(): void {
    if (this.reconnectTimer !== null) this.o.timers.clearTimeout(this.reconnectTimer);
    if (this.resendTimer !== null) this.o.timers.clearTimeout(this.resendTimer);
    this.reconnectTimer = this.resendTimer = null;
    this.backingOff = false;
  }

  private helloState(): HelloState {
    if (this.chain === null) return {};
    if (this.epoch !== null) return { resume: { epoch: this.epoch, seq: this.seq, chain: this.chain } };
    return this.doc ? { local: { rev: this.seq, chain: this.chain } } : {};
  }

  private open(): void {
    if (this._state !== "reconnecting") this.setState("connecting");
    const transport = this.o.connect(this.helloState());
    this.transport = transport;
    transport.onFrame((f) => {
      if (this.transport === transport) this.onFrame(f);
    });
    transport.onClose((e) => {
      if (this.transport === transport) this.onClose(e);
    });
    transport.connect();
  }

  private authorOf = (sub: PendingSub): Author => ({
    actor: this.actor ?? "usr_pending",
    kind: sub.kind,
    ...(sub.proposal !== undefined && { proposal: sub.proposal }),
  });

  private at(): string {
    return new Date(this.o.clock()).toISOString();
  }

  private build() {
    const pending = this.queue.all().filter((s) => !this.landed.has(s.sub));
    return rebuildView(this.doc!, pending, this.o.applyFn, this.authorOf, this.at());
  }

  private extendView(sub: PendingSub): void {
    if (!this.viewCache) return;
    const outcome = applySub(this.viewCache, sub, this.o.applyFn, { author: this.authorOf(sub), at: this.at() });
    if (outcome.ok) this.viewCache = outcome.state;
  }

  private onFrame(f: ServerFrame): void {
    switch (f.t) {
      case "welcome":
        return this.onWelcome(f);
      case "snapshot":
        return this.onSnapshot(f);
      case "tail":
        return this.onTail(f);
      case "ready":
        return this.onReady(f.seq);
      case "commit":
        return this.onCommit(f);
      case "reject":
        return this.onReject(f);
      case "check":
        this.onCheck(f);
        return this.emit({ t: "room", frame: f });
      case "error":
        return this.onError(f);
      case "event":
      case "presence":
      case "cursors":
      case "chat":
        return this.emit({ t: "room", frame: f });
      default:
    }
  }

  private onWelcome(f: Welcome): void {
    this.actor = f.you.actor;
    this.epochBreak = f.epochBreak === true;
    this.resyncing = false;
    this.setState("authenticating");
    this.setState("syncing");
    if (f.resume === "snapshot") {
      this.welcomeEpoch = f.room.epoch;
    } else {
      this.epoch = f.room.epoch;
      if (f.resume === "none" && (f.room.seq !== this.seq || f.room.chain !== this.chain)) this.diverge("chain");
    }
    this.emit({ t: "room", frame: f });
  }

  private onSnapshot(f: Snapshot): void {
    if (stateHash(f.doc as unknown as Project) !== f.stateHash) {
      this.o.onDivergence?.({ reason: "hash", seq: f.seq });
      if (this.resyncing) this.fail("the server sent a snapshot that does not match its hash");
      else this.diverge("hash");
      return;
    }
    if (this.welcomeEpoch !== null) this.epoch = this.welcomeEpoch;
    this.doc = f.doc as unknown as Project;
    this.seq = f.seq;
    this.chain = f.chain;
    this.recorded.clear();
    this.recorded.set(f.seq, f.chain);
    this.recent = [];
    this.landed.clear();
    this.resyncing = false;
    this.inFlight = null;
    if (this.epochBreak) {
      this.queue.requeue(this.acked.filter((a) => a.seq1 > f.seq).map((a) => a.sub));
      this.epochBreak = false;
    }
    this.acked = [];
    this.reconcile();
    this.emit({ t: "view", confirmedSeq: this.seq });
    this.pump();
  }

  private onTail(f: Tail): void {
    if (this.resyncing) return;
    if (this.absorb(f.envs, f.chain)) this.finishRemote(f.envs);
  }

  private onReady(seq: number): void {
    if (this._state !== "syncing") return;
    if (!this.resyncing && seq !== this.seq) this.diverge("chain");
    this.attempt = 0;
    this.hadReady = true;
    this.setState("live");
    if (this.collecting) this.collecting.until = this.queue.all().at(-1)?.sub ?? 0;
    this.flushReport();
    this.pump();
  }

  private onCommit(f: Commit): void {
    if (this.resyncing || !this.doc) return;
    if (f.ack) this.onAck(f, f.ack);
    else if (f.envs && this.absorb(f.envs, f.chain)) this.finishRemote(f.envs);
  }

  private onAck(f: Commit, ack: NonNullable<Commit["ack"]>): void {
    const sub = this.queue.head();
    if (!sub || sub.sub !== ack.sub) return;
    if (f.seq1 > this.seq) {
      const sameSize = f.seq1 - f.seq0 + 1 === sub.ops.length;
      if (f.seq0 !== this.seq + 1 || !sameSize) return this.diverge("chain");
      const outcome = applySub(this.doc!, sub, this.o.applyFn, { author: this.authorOf(sub), at: this.at() });
      if (!outcome.ok) return this.diverge("apply");
      this.doc = outcome.state;
      this.seq = f.seq1;
      this.chain = f.chain;
      this.record(f.seq1, f.chain);
    }
    this.queue.ack(sub.sub);
    this.landed.delete(sub.sub);
    this.inFlight = null;
    this.resendAttempt = 0;
    this.viewCache = null;
    this.acked.push({ sub, seq1: f.seq1 });
    if (this.acked.length > ACKED_KEPT) this.acked.shift();
    this.emit({
      t: "acked",
      sub: sub.sub,
      seq0: f.seq0,
      seq1: f.seq1,
      inverse: ack.inverse as unknown as Op[],
      dup: ack.dup === true,
    });
    this.emit({ t: "view", confirmedSeq: this.seq });
    this.flushReport();
    this.pump();
  }

  /** Applies server-ordered envelopes to the confirmed document, all or none, and checks the chain they end on. */
  private absorb(envs: readonly WireEnvelope[], expected: string): boolean {
    if (!this.doc || this.chain === null) return false;
    let doc = this.doc;
    let seq = this.seq;
    let chain = this.chain;
    const steps: [number, string][] = [];
    for (const env of envs) {
      if (env.seq !== seq + 1) {
        this.diverge("chain");
        return false;
      }
      const result = this.o.applyFn(doc, env.op as unknown as Op, { author: env.author, at: env.at });
      if (!result.ok) {
        this.diverge("apply");
        return false;
      }
      doc = result.state;
      seq = env.seq;
      chain = chainNext(chain, asEnvelope(env));
      steps.push([seq, chain]);
    }
    if (chain !== expected) {
      this.diverge("chain");
      return false;
    }
    this.doc = doc;
    this.seq = seq;
    this.chain = chain;
    for (const [at, value] of steps) this.record(at, value);
    const head = this.queue.head();
    if (head?.sentAt != null && envs.some((env) => env.opId === head.ops[0]!.opId)) this.landed.add(head.sub);
    this.recent.push(...envs.map(asEnvelope));
    if (this.recent.length > ENVELOPES_KEPT) this.recent.splice(0, this.recent.length - ENVELOPES_KEPT);
    return true;
  }

  private finishRemote(envs: readonly WireEnvelope[]): void {
    if (envs.length === 0) return;
    this.emit({ t: "remote", envs: envs.map(asEnvelope) });
    this.reconcile();
    this.emit({ t: "view", confirmedSeq: this.seq });
  }

  private record(seq: number, chain: string): void {
    this.recorded.set(seq, chain);
    if (this.recorded.size > CHAINS_KEPT) this.recorded.delete(this.recorded.keys().next().value!);
  }

  /** Rebuilds the view and drops the pending submissions that no longer apply, except the one the server may have taken. */
  private reconcile(): void {
    const { view, locallyInvalid } = this.build();
    this.viewCache = view;
    for (const { sub, reject, index } of locallyInvalid) {
      if (sub.sentAt !== null) continue;
      const frame: Reject = { t: "reject", sub: sub.sub, code: reject.code, index, message: reject.message };
      this.discard(sub, explainReject(frame, sub, this.recent));
    }
    this.flushReport();
  }

  private discard(sub: PendingSub, reason: DropReason): void {
    this.queue.drop(sub.sub);
    this.landed.delete(sub.sub);
    this.diagnostics.drops++;
    this.collecting?.dropped.push({ sub: sub.sub, reason, ops: sub.ops.map((o) => o.op) });
    this.emit({ t: "rejected", sub: sub.sub, reason });
  }

  private onReject(f: Reject): void {
    const sub = this.queue.head();
    if (!sub || sub.sub !== f.sub) return;
    this.settleInFlight(sub, explainReject(f, sub, this.recent));
  }

  private settleInFlight(sub: PendingSub, reason: DropReason): void {
    this.inFlight = null;
    this.discard(sub, reason);
    this.viewCache = null;
    this.emit({ t: "view", confirmedSeq: this.seq });
    this.flushReport();
    this.pump();
  }

  private onCheck(f: { seq: number; chain: string; stateHash?: string }): void {
    if (!this.doc || this.resyncing) return;
    if (f.seq === this.seq) {
      if (f.chain !== this.chain) this.diverge("chain");
      else if (f.stateHash !== undefined && this.queue.length === 0 && stateHash(this.doc) !== f.stateHash) {
        this.diverge("hash");
      }
    } else if (f.seq < this.seq) {
      const known = this.recorded.get(f.seq);
      if (known !== undefined && known !== f.chain) this.diverge("chain");
    }
  }

  private diverge(reason: Resync["reason"]): void {
    if (this.resyncing) return;
    this.resyncing = true;
    this.diagnostics.resyncs++;
    this.o.onDivergence?.({ reason, seq: this.seq });
    if (this.transport?.state === "open") {
      this.transport.send({ t: "resync", reason, seq: this.seq, chain: this.chain ?? "" });
    }
  }

  private onError(f: ErrorFrame): void {
    switch (f.code) {
      case "superseded":
        return this.end("superseded");
      case "kicked":
        return this.end("kicked");
      case "room_unavailable":
        return this.end("unavailable");
      case "unauthorized":
      case "upgrade_required":
      case "schema_mismatch":
        return this.fail(f.message);
      case "not_ready":
      case "rate_limited":
      case "server_error":
        return this.resendLater(f.retryAfterMs);
      case "permission":
      case "not_baton": {
        const sub = this.queue.head();
        if (!sub || this.inFlight !== sub.sub) return;
        const frame: Reject = { t: "reject", sub: sub.sub, code: f.code, message: f.message };
        return this.settleInFlight(sub, explainReject(frame, sub, this.recent));
      }
      default:
    }
  }

  private resendLater(retryAfterMs: number | undefined): void {
    if (this.inFlight === null) return;
    this.inFlight = null;
    this.backingOff = true;
    if (this.resendTimer !== null) this.o.timers.clearTimeout(this.resendTimer);
    const wait = retryAfterMs ?? backoffMs(this.resendAttempt++, this.o.random, this.o.hidden());
    this.resendTimer = this.o.timers.setTimeout(() => {
      this.resendTimer = null;
      this.backingOff = false;
      this.pump();
    }, wait);
  }

  /** Sends the head of the queue when nothing is in flight. A head the server may already hold goes again with the same op ids. */
  private pump(): void {
    if (this._state !== "live" || this.inFlight !== null || this.backingOff || this.resyncing) return;
    const sub = this.queue.head();
    if (!sub || this.transport?.state !== "open") return;
    this.transport.send({
      t: "submit",
      sub: sub.sub,
      ...(sub.batch !== null && { batch: sub.batch }),
      ops: sub.ops.map(({ opId, base, op }) => ({
        opId,
        base,
        op,
        kind: sub.kind,
        ...(sub.proposal !== undefined && { proposal: sub.proposal }),
      })),
    });
    this.queue.markSent(sub.sub, this.o.clock());
    this.inFlight = sub.sub;
  }

  /** Emits the collected drops once every submission that was pending at the reconnect has been settled. */
  private flushReport(): void {
    const c = this.collecting;
    if (!c || c.until === null) return;
    const settled = this.queue.all().every((s) => s.sub > c.until!);
    if (!settled) return;
    this.collecting = null;
    if (c.dropped.length > 0) {
      this.emit({ t: "rebase", report: { dropped: c.dropped, at: this.o.clock(), localBefore: c.localBefore } });
    }
  }

  private onClose(e: CloseEvent): void {
    this.transport = null;
    this.inFlight = null;
    this.resyncing = false;
    switch (e.code) {
      case CLOSE.superseded:
        return this.end("superseded");
      case CLOSE.kicked:
        return this.end("kicked");
      case CLOSE.roomUnavailable:
      case CLOSE.roomCorrupt:
        return this.end("unavailable");
      case CLOSE.unauthorized:
      case CLOSE.upgradeRequired:
        return this.fail(e.error?.message ?? `closed with ${e.code}`);
      default:
    }
    if (this.stopped) return;
    if (this.collecting) this.collecting.until = null;
    else if (this.hadReady && this.doc) this.collecting = { dropped: [], localBefore: this.getView()!, until: null };
    this.diagnostics.reconnects++;
    this.setState("reconnecting");
    const wait = e.retryAfterMs ?? backoffMs(this.attempt, this.o.random, this.o.hidden());
    this.attempt++;
    this.reconnectTimer = this.o.timers.setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, wait);
  }

  private end(why: "kicked" | "unavailable" | "superseded"): void {
    this.shutDown();
    this.setState("ended");
    this.emit({ t: "ended", why });
  }

  private fail(detail: string): void {
    this.shutDown();
    this.setState("failed", detail);
  }

  private shutDown(): void {
    this.clearTimers();
    const transport = this.transport;
    this.transport = null;
    transport?.close();
  }
}
