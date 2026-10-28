import { StateHasher } from "./core/hash.ts";
import { NS_PER_MS, type SimTime } from "./core/clock.ts";
import { type SimDiagnostic, simDiag } from "./core/diagnostic.ts";
import {
  RANK,
  type AnalogHook,
  type DigitalLayer,
  type Engine,
  type EventSink,
  type HostInput,
  type InputEntry,
  type LoadResult,
  type PinEventPayload,
  type SimEvent,
  type SimNetlist,
  type SimRunOptions,
  type SliceBudget,
  type SliceResult,
  type StepUnit,
} from "./engine.ts";
import { EventQueue } from "./queue.ts";

export interface PinEdge {
  at: SimTime;
  net: string;
  level: 0 | 1 | "Z" | "X";
}

export interface Orchestrator {
  load(net: SimNetlist, opts: SimRunOptions): LoadResult;
  /** Never reads a wall clock. */
  runUntil(target: SimTime, budget: SliceBudget): SliceResult;
  step(unit: StepUnit, n: number): SliceResult;
  /** Stamped with `now` and the next `seq`, appended to `inputs`. */
  inject(input: HostInput): void;
  readonly now: SimTime;
  readonly state: "idle" | "running" | "paused" | "halted" | "done";
  readonly inputs: readonly InputEntry[];
  readonly checkpoints: readonly { at: SimTime; hash: string }[];
  readonly diagnostics: readonly SimDiagnostic[];
  readonly analog: AnalogHook;
  pinEdges(): readonly PinEdge[];
}

const SLICE_NS = NS_PER_MS;
const CHECKPOINT_NS = 1000 * NS_PER_MS;
const NO_PROGRESS_LIMIT = 10_000_000;
const MAX_PARTS = 2000;

const NEVER_YIELD: SliceBudget = {
  shouldYield: () => false,
  work: { statements: Infinity, events: Infinity, outputBytes: Infinity },
};

export const analogHook: AnalogHook = {
  read: () => ({ modelled: false, reason: "not modelled yet" }),
};

function validate(net: SimNetlist): SimDiagnostic[] {
  const diagnostics: SimDiagnostic[] = [];
  const nets = new Set(net.nets.map((n) => n.id));
  if (!nets.has(net.ground)) diagnostics.push(simDiag("unknown-ground", "error", { net: net.ground }));
  if (net.parts.length > MAX_PARTS) {
    diagnostics.push(simDiag("netlist-too-large", "error", {}, { parts: net.parts.length, max: MAX_PARTS }));
  }
  const seen = new Set<string>();
  for (const part of net.parts) {
    if (seen.has(part.id)) diagnostics.push(simDiag("duplicate-part", "error", { part: part.id }));
    seen.add(part.id);
    for (const target of Object.values(part.pins)) {
      if (target !== null && !nets.has(target)) {
        diagnostics.push(simDiag("missing-net", "error", { part: part.id, net: target }));
      }
    }
  }
  return diagnostics;
}

const isPinPayload = (p: unknown): p is PinEventPayload =>
  typeof p === "object" && p !== null && typeof (p as PinEventPayload).pin === "string";

class SimOrchestrator implements Orchestrator, EventSink {
  private readonly engines: Engine[];
  private readonly queue = new EventQueue();
  private opts: SimRunOptions | null = null;
  private seq = 0;
  private stall = 0;
  private nextCheckpoint = CHECKPOINT_NS;
  private pinLevels = new Map<string, PinEdge["level"]>();
  private edges: PinEdge[] = [];
  private logged: InputEntry[] = [];
  private hashes: { at: SimTime; hash: string }[] = [];
  private problems: SimDiagnostic[] = [];
  private current: Orchestrator["state"] = "idle";
  private readonly digital: DigitalLayer;
  now = 0;
  readonly analog = analogHook;

  constructor(engines: Engine[], digital: DigitalLayer) {
    this.digital = digital;
    this.engines = [...engines].sort((a, b) => a.rank - b.rank || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (const engine of this.engines) engine.attach(this);
  }

  get state(): Orchestrator["state"] {
    return this.current;
  }

  private get halted(): boolean {
    return this.current === "halted";
  }

  get inputs(): readonly InputEntry[] {
    return this.logged;
  }

  get checkpoints(): readonly { at: SimTime; hash: string }[] {
    return this.hashes;
  }

  get diagnostics(): readonly SimDiagnostic[] {
    return this.problems;
  }

  pinEdges(): readonly PinEdge[] {
    return this.edges;
  }

  load(net: SimNetlist, opts: SimRunOptions): LoadResult {
    this.queue.clear();
    this.opts = opts;
    this.now = 0;
    this.seq = 0;
    this.stall = 0;
    this.nextCheckpoint = CHECKPOINT_NS;
    this.pinLevels = new Map();
    this.edges = [];
    this.logged = [];
    this.hashes = [];
    const problems = validate(net);
    if (problems.length === 0) problems.push(...this.digital.load(net));
    this.problems = problems;
    const ok = !problems.some((d) => d.severity === "error");
    this.current = ok ? "idle" : "halted";
    const models = [...new Set(net.parts.map((p) => p.descriptor))].sort();
    return { ok, diagnostics: problems.slice(0, 1000), models };
  }

  emit(e: Omit<SimEvent, "seq">): void {
    this.enqueue({ ...e, seq: ++this.seq });
  }

  inject(input: HostInput): void {
    const seq = ++this.seq;
    this.logged.push({ at: this.now, seq, ...input });
    this.enqueue({
      at: this.now,
      phase: 0,
      rank: 0,
      seq,
      src: "host",
      kind: input.kind,
      payload: { target: input.target, value: input.value },
    });
  }

  runUntil(target: SimTime, budget: SliceBudget): SliceResult {
    const early = this.settled();
    if (early) return early;
    if (target <= this.now) return { reason: "target", now: this.now };
    this.current = "running";
    const end = this.opts?.endNs === undefined ? target : Math.min(target, this.opts.endNs);
    let delivered = 0;
    while (this.now < end) {
      const horizon = Math.min(end, this.now + SLICE_NS, this.nextCheckpoint, this.nextWake());
      delivered += this.cycle(horizon, budget, Infinity);
      if (this.halted) return { reason: "halted", now: this.now };
      if (this.now < end && (budget.shouldYield() || delivered >= budget.work.events)) {
        this.current = "paused";
        return { reason: "budget", now: this.now };
      }
    }
    if (this.opts?.endNs !== undefined && this.now >= this.opts.endNs) {
      this.current = "done";
      return { reason: "done", now: this.now };
    }
    return { reason: "target", now: this.now };
  }

  step(unit: StepUnit, n: number): SliceResult {
    if (unit === "ns") return this.runUntil(this.now + n, NEVER_YIELD);
    if (unit !== "event") return { reason: "unsupported", now: this.now };
    const early = this.settled();
    if (early) return early;
    this.current = "running";
    let delivered = 0;
    while (delivered < n) {
      const due = this.nextWake();
      if (due === Infinity) {
        this.current = "done";
        return { reason: "done", now: this.now };
      }
      delivered += this.cycle(Math.min(due, this.nextCheckpoint), NEVER_YIELD, n - delivered);
      if (this.halted) return { reason: "halted", now: this.now };
    }
    return { reason: "target", now: this.now };
  }

  private settled(): SliceResult | null {
    if (this.halted) return { reason: "halted", now: this.now };
    if (this.state === "done") return { reason: "done", now: this.now };
    return null;
  }

  /** The earliest time something is scheduled: a queued event or an engine's next due time. */
  private nextWake(): SimTime {
    let wake = this.queue.peekTime() ?? Infinity;
    for (const engine of this.engines) wake = Math.min(wake, engine.nextDue() ?? Infinity);
    return wake;
  }

  /** Advances every engine to `horizon`, then delivers queued events in order up to the time all engines reached. */
  private cycle(horizon: SimTime, budget: SliceBudget, eventCap: number): number {
    this.checkpointIfDue();
    const started = this.now;
    let frontier = Math.max(horizon, this.now);
    for (const engine of this.engines) {
      frontier = Math.min(frontier, engine.advanceTo(Math.max(horizon, this.now), budget).reached);
      if (this.halted) return 0;
    }
    let delivered = 0;
    for (;;) {
      const next = this.queue.peek();
      if (next === undefined || next.at > frontier || delivered >= eventCap) break;
      this.queue.pop();
      this.advanceClock(next.at);
      this.deliver(next);
      delivered++;
      if (++this.stall >= NO_PROGRESS_LIMIT) return this.halt(simDiag("no-time-progress", "error", {}));
      if (this.halted) return delivered;
    }
    if (delivered < eventCap) this.advanceClock(frontier);
    if (this.now === started && ++this.stall >= NO_PROGRESS_LIMIT) this.halt(simDiag("no-time-progress", "error", {}));
    this.checkpointIfDue();
    return delivered;
  }

  private advanceClock(to: SimTime): void {
    if (to > this.now) {
      this.now = to;
      this.stall = 0;
    }
  }

  private deliver(e: SimEvent): void {
    if (e.phase === 3 && e.rank === RANK.digital && e.kind === "pin" && isPinPayload(e.payload)) {
      this.resolvePin(e.at, e.payload);
      return;
    }
    if (e.phase === 2 && e.kind === "pin" && isPinPayload(e.payload)) {
      this.enqueue({ ...e, phase: 3, rank: RANK.digital, seq: ++this.seq });
    }
    for (const engine of this.engines) if (engine.id !== e.src) engine.onEvent(e);
  }

  private resolvePin(at: SimTime, p: PinEventPayload): void {
    this.digital.onPin(p.pin, p.level, p.duty, at);
    if (this.pinLevels.get(p.pin) === p.level) return;
    this.pinLevels.set(p.pin, p.level);
    this.edges.push({ at, net: p.pin, level: p.level });
  }

  private enqueue(e: SimEvent): void {
    if (!this.queue.push(e)) this.halt(simDiag("event-queue-overflow", "error", {}));
  }

  private halt(diagnostic: SimDiagnostic): 0 {
    this.problems = [...this.problems, diagnostic];
    this.current = "halted";
    return 0;
  }

  private checkpointIfDue(): void {
    const pending = this.queue.peekTime();
    if (this.now < this.nextCheckpoint || (pending !== null && pending <= this.now)) return;
    const hasher = new StateHasher();
    for (const engine of this.engines) hasher.str(engine.id).str(engine.stateHash());
    hasher.str(this.digital.stateHash());
    this.hashes.push({ at: this.nextCheckpoint, hash: hasher.hex() });
    this.nextCheckpoint += CHECKPOINT_NS;
  }
}

export function createOrchestrator(parts: { engines: Engine[]; digital: DigitalLayer }): Orchestrator {
  return new SimOrchestrator(parts.engines, parts.digital);
}
