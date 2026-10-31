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
  type NotModelledPayload,
  type OrchestratorSnapshot,
  type PinEventPayload,
  type SimEvent,
  type SimNetlist,
  type SimRunOptions,
  type SliceBudget,
  type SliceResult,
  type StepUnit,
} from "./engine.ts";
import { getAppRegistry } from "../parts/builtin.ts";
import type { PartRegistry } from "../parts/registry.ts";
import { PWL_OPTIONS } from "./analog/elements.ts";
import type { AnalogStepResult, Change, LiveAnalog, PartLayers } from "./analog/live.ts";
import { logicElementId } from "./analog/live.ts";
import { type LogicPart, createLogicPart, driveOf, stepLogic } from "./digital/logic-part.ts";
import { type BoardPinOwner, analogChangeOf, boardPinOwners } from "./digital/pins.ts";
import { makeModelEnv, resolveLayers } from "./models/kinds.ts";
import { EventQueue } from "./queue.ts";
import type { InterpSnapshotData } from "./replay/snapshot.ts";

export interface PinEdge {
  at: SimTime;
  net: string;
  level: 0 | 1 | "Z" | "X";
}

export interface Orchestrator {
  load(net: SimNetlist, opts: SimRunOptions): LoadResult;
  /** Never reads a wall clock. `exclusive` stops at `target - 1` ns and leaves the events at `target` queued. */
  runUntil(target: SimTime, budget: SliceBudget, o?: { exclusive?: boolean }): SliceResult;
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
  /**
   * An engine without its own `snapshot()` is an interpreter: its frames cannot be saved, so it gets a cut point
   * (`docHash` stands for its source, `logCursor` for the input index). `docHash` and `logCursor` come from the record.
   */
  snapshot(record: { docHash: string; logCursor: number }): OrchestratorSnapshot;
  /** Takes over the whole state of `from`, which a restore has replayed to the snapshot's time. `from` is spent afterwards. */
  adopt(from: Orchestrator): void;
}

const SLICE_NS = NS_PER_MS;
const CHECKPOINT_NS = 1000 * NS_PER_MS;
const NO_PROGRESS_LIMIT = 10_000_000;
const MAX_PARTS = 2000;
const ANALOG_ID = "engine:analog-live";
const LOGIC_ID = "engine:logic";
const ORCHESTRATOR_ID = "orchestrator";
const LOGIC_RANK = RANK.mcu + 1;

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

const isParamValue = (v: unknown): v is { path: string; value: number } =>
  typeof v === "object" && v !== null && typeof (v as { path: unknown }).path === "string" && typeof (v as { value: unknown }).value === "number";

const isPinPayload = (p: unknown): p is PinEventPayload =>
  typeof p === "object" && p !== null && typeof (p as PinEventPayload).pin === "string";

interface LogicRun {
  part: LogicPart;
  /** The solver element that drives each output net. */
  elementOf: ReadonlyMap<string, string>;
}

class SimOrchestrator implements Orchestrator, EventSink {
  private engines: Engine[];
  private queue = new EventQueue();
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
  private digital: DigitalLayer;
  private live: LiveAnalog | null;
  private owners = new Map<string, BoardPinOwner>();
  private solveAt: SimTime | null = null;
  private logic: LogicRun[] = [];
  private thunks = new Map<number, () => void>();
  private thunkSeq = 0;
  now = 0;
  readonly analog = analogHook;

  constructor(engines: Engine[], digital: DigitalLayer, live: LiveAnalog | null) {
    this.digital = digital;
    this.live = live;
    const ids = new Set(engines.map((e) => e.id));
    if (ids.size !== engines.length) throw new Error("two engines share an id");
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

  snapshot(record: { docHash: string; logCursor: number }): OrchestratorSnapshot {
    const cut: InterpSnapshotData = { sourceHash: record.docHash, virtualNs: this.now, inputCursor: record.logCursor };
    const engines = this.engines.map((e) => e.snapshot?.() ?? { engine: e.id, engineVersion: "1", schema: 1, data: cut });
    if (this.live) engines.push(this.live.snapshot());
    return {
      format: 1,
      docHash: record.docHash,
      at: this.now,
      seqNext: this.seq + 1,
      queue: this.pending(),
      rng: {},
      logCursor: record.logCursor,
      engines,
      stateHash: this.hash(),
    };
  }

  adopt(from: Orchestrator): void {
    if (!(from instanceof SimOrchestrator)) throw new TypeError("only an orchestrator made by createOrchestrator can be adopted");
    this.engines = from.engines;
    this.digital = from.digital;
    this.live = from.live;
    this.queue = from.queue;
    this.opts = from.opts;
    this.seq = from.seq;
    this.stall = from.stall;
    this.nextCheckpoint = from.nextCheckpoint;
    this.pinLevels = from.pinLevels;
    this.edges = from.edges;
    this.logged = from.logged;
    this.hashes = from.hashes;
    this.problems = from.problems;
    this.owners = from.owners;
    this.solveAt = from.solveAt;
    this.logic = from.logic;
    this.thunks = from.thunks;
    this.thunkSeq = from.thunkSeq;
    this.now = from.now;
    this.current = from.current === "running" ? "paused" : from.current;
    for (const engine of this.engines) engine.attach(this);
  }

  /** The queued events in delivery order; the heap itself is left as it was. */
  private pending(): SimEvent[] {
    const events: SimEvent[] = [];
    for (let e = this.queue.pop(); e !== undefined; e = this.queue.pop()) events.push(e);
    for (const e of events) this.queue.push(e);
    return events;
  }

  private hash(): string {
    const hasher = new StateHasher();
    for (const engine of this.engines) hasher.str(engine.id).str(engine.stateHash());
    hasher.str(this.digital.stateHash());
    for (const { part } of this.logic) {
      hasher.str(part.instanceId).str(JSON.stringify(part.bits)).str(JSON.stringify(part.applied)).str(JSON.stringify(part.pending));
    }
    return hasher.hex();
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
    this.owners = boardPinOwners(net);
    this.solveAt = null;
    this.logic = [];
    this.thunks = new Map();
    this.thunkSeq = 0;
    if (problems.length === 0) problems.push(...this.digital.load(net));
    this.problems = problems;
    const layers = this.resolveParts(net, opts.parts ?? getAppRegistry());
    if (this.live && !problems.some((d) => d.severity === "error")) {
      const analog = this.loadAnalog(net, layers);
      this.problems = [...this.problems, ...analog];
    }
    const ok = !this.problems.some((d) => d.severity === "error");
    this.current = ok ? "idle" : "halted";
    const models = [...new Set(net.parts.map((p) => p.descriptor))].sort();
    return { ok, diagnostics: this.problems.slice(0, 1000), models };
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

  runUntil(target: SimTime, budget: SliceBudget, o?: { exclusive?: boolean }): SliceResult {
    const early = this.settled();
    if (early) return early;
    const stop = o?.exclusive ? target - 1 : target;
    if (stop <= this.now) return { reason: "target", now: this.now };
    this.current = "running";
    const end = this.opts?.endNs === undefined ? stop : Math.min(stop, this.opts.endNs);
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

  private loadAnalog(net: SimNetlist, layers: ReadonlyMap<string, PartLayers>): SimDiagnostic[] {
    const live = this.live!;
    const report = live.load(net, PWL_OPTIONS, layers);
    this.collect(live.advanceTo(0));
    this.stepLogic(0);
    return report.diagnostics;
  }

  /**
   * Resolves every placed part once, in id order. Element layers and logic outputs go to the solver; a part with
   * nothing runnable raises one `not-modelled` event. A part the registry does not hold was already reported as
   * `unknown-part` by the netlist builder.
   */
  private resolveParts(net: SimNetlist, reg: Pick<PartRegistry, "get">): Map<string, PartLayers> {
    const layers = new Map<string, PartLayers>();
    const env = makeModelEnv((ref, version) => reg.get(ref, version));
    const notModelled = (payload: NotModelledPayload): void => {
      this.emit({ at: 0, phase: 3, rank: RANK.digital, src: ORCHESTRATOR_ID, kind: "not-modelled", payload });
    };
    for (const part of [...net.parts].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
      if (part.kind === "board") continue;
      const at = part.descriptor.lastIndexOf("@");
      const def = reg.get(part.descriptor.slice(0, at), part.descriptor.slice(at + 1));
      if (def === undefined) continue;
      const resolved = resolveLayers(def, part.params, env);
      const first = resolved.layers.find((l) => l.kind === "none");
      if (!resolved.runnable && first?.kind === "none") {
        notModelled({ instanceId: part.id, layerId: first.layerId, reason: first.reason, detail: first.detail });
        continue;
      }
      const nets = new Map(Object.entries(part.pins).flatMap(([pin, netId]) => (netId === null ? [] : [[pin, netId] as const])));
      const elements = resolved.layers.filter((l) => l.kind === "element");
      const drives: PartLayers["drives"][number][] = [];
      for (const layer of resolved.layers) {
        if (layer.kind !== "logic" || !this.live) continue;
        const logicPart = createLogicPart(part.id, def, layer.model, nets);
        const partDrives = driveOf(def, logicPart);
        for (const pin of logicPart.refused) this.problems = [...this.problems, simDiag("logic-family-unknown", "warning", { part: part.id }, { pin })];
        drives.push(...partDrives);
        this.logic.push({ part: logicPart, elementOf: new Map(logicPart.outputs.map((o) => [o.netId, logicElementId(part.id, o.pinId)])) });
      }
      if (elements.length > 0 || drives.length > 0) layers.set(part.id, { elements, drives });
    }
    return layers;
  }

  /** Runs after every analog solve: reads the input nets and schedules output changes behind their delay. */
  private stepLogic(at: SimTime): void {
    const live = this.live!;
    for (const { part, elementOf } of this.logic) {
      stepLogic(
        part,
        at,
        (netId) => live.netVolts(netId) ?? NaN,
        (netId, v) => {
          const element = elementOf.get(netId);
          if (element !== undefined) this.applyAnalog(this.now, { kind: "pin", element, level: v === null ? "Z" : v === 0 ? 0 : 1 });
        },
        (atNs, fn) => {
          const key = ++this.thunkSeq;
          this.thunks.set(key, fn);
          this.enqueue({ at: atNs, phase: 3, rank: LOGIC_RANK, seq: ++this.seq, src: LOGIC_ID, kind: "logic-out", payload: { key } });
        },
        (code, detail) => {
          this.problems = [...this.problems, simDiag(code, "warning", { part: part.instanceId }, { detail })];
        },
      );
    }
  }

  /** Keeps the solver's events and its diagnostics, apart from writes to pins the circuit does not have. */
  private collect(step: AnalogStepResult): void {
    for (const event of step.events) this.enqueue({ ...event, seq: ++this.seq });
    const found = step.diagnostics.filter((d) => d.id !== "unknown-pin");
    if (found.length > 0) this.problems = [...this.problems, ...found];
  }

  /** A pin or parameter change reaches the solver now; the solve itself waits for P3 of the same timestamp. */
  private applyAnalog(at: SimTime, change: Change): void {
    this.live!.apply([change]);
    if (this.solveAt === at) return;
    this.solveAt = at;
    this.enqueue({ at, phase: 3, rank: RANK.analog, seq: ++this.seq, src: ANALOG_ID, kind: "solve", payload: null });
  }

  private deliverAnalog(e: SimEvent): void {
    if (e.kind === "solve") {
      this.solveAt = null;
      this.collect(this.live!.advanceTo(e.at));
      this.stepLogic(e.at);
      return;
    }
    const p = e.payload as { net: string; level: 0 | 1 };
    const pin = [...this.owners].find(([, owner]) => owner.net === p.net)?.[0];
    if (pin === undefined) return;
    const input: SimEvent = { ...e, phase: 0, rank: 0, src: "host", kind: "pin", payload: { target: pin, value: p.level } };
    for (const engine of this.engines) engine.onEvent(input);
  }

  private deliver(e: SimEvent): void {
    if (e.src === LOGIC_ID) {
      const { key } = e.payload as { key: number };
      const run = this.thunks.get(key);
      this.thunks.delete(key);
      run?.();
      return;
    }
    if (e.src === ANALOG_ID) {
      this.deliverAnalog(e);
      return;
    }
    if (this.live && e.phase === 0 && e.kind === "param") {
      const { target, value } = e.payload as { target: string; value: unknown };
      if (isParamValue(value)) this.applyAnalog(e.at, { kind: "param", element: target, path: value.path, value: value.value });
    }
    if (this.live && e.phase === 2 && e.kind === "pin" && isPinPayload(e.payload)) {
      const owner = this.owners.get(e.payload.pin);
      if (owner) {
        const { pin, level, duty, hz } = e.payload;
        const pwm = duty !== undefined && hz !== undefined ? { duty, hz } : undefined;
        this.applyAnalog(e.at, analogChangeOf({ board: owner.board, pin, level, pwm }));
      }
    }
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
    this.hashes.push({ at: this.nextCheckpoint, hash: this.hash() });
    this.nextCheckpoint += CHECKPOINT_NS;
  }
}

export function createOrchestrator(parts: { engines: Engine[]; digital: DigitalLayer; analog?: LiveAnalog }): Orchestrator {
  return new SimOrchestrator(parts.engines, parts.digital, parts.analog ?? null);
}
