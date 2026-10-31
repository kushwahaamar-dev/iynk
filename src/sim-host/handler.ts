import { runChecks } from "@/lib/interp";
import { withRobotFacts } from "@/sim/faults/robot-facts";
import { WorkerError, type WorkerHandler } from "@/protocol";
import { NS_PER_MS, type SimTime } from "@/sim/core/clock";
import { simDiag } from "@/sim/core/diagnostic";
import type {
  DigitalLayer,
  Engine,
  McuEngine,
  OrchestratorSnapshot,
  PartState,
  ProgramImage,
  SimDiagnostic,
  SimNetlist,
  SimRunOptions,
  InputEntry,
  SliceBudget,
  SliceResult,
} from "@/sim/engine";
import type { DebugPort, PauseEvent } from "@/sim/debug/breakpoints";
import type { Descriptor } from "@/parts/descriptor";
import type { Result } from "@/core/result";
import type { Project } from "@/project/generated/types";
import { needsPhysics, FRAME_EVERY_STEPS, type MechKit, type MechRefusal, type MechRunIo, type MechRuntime, type MechState, type RobotReport } from "./mech";
import { extractCodeFacts } from "@/sim/faults/code-facts";
import { createFaultMonitor } from "@/sim/faults/monitor";
import { buildNetView } from "@/sim/faults/netlist-view";
import { runRules } from "@/sim/faults/rules";
import { runFactsFrom } from "@/sim/faults/run-facts";
import type { CodeFacts, Rule } from "@/sim/faults/types";
import type { BoardId } from "@/lib/interp/profiles";
import { parseFirmware } from "@/sim/mcu/firmware";
import { scanBus, ScanError, type ScanSession } from "@/sim/bus/scan";
import { createOrchestrator, type Orchestrator } from "@/sim/orchestrator";
import type { ProbeHandle, ProbeTap, TraceChunk } from "@/sim/probe/tap";
import { classHashes } from "@/sim/replay/trace";
import { MAX_BREAKPOINTS_PER_FILE } from "@/sim/debug/breakpoints";
import type { DebugStepReply, DiagnosticsReply, HashesReply, IgnoredReply, PinLevel, ProbeAddReply, ScannedReply, SimEv, SimReq, SimRunState, StaticCheckReply } from "./protocol";

/** What the handler reads from an engine beyond `McuEngine`; the interpreter engines have both. */
export type SimEngine = McuEngine & {
  readonly serialLog?: ReadonlyArray<{ at: SimTime; text: string }>;
  readonly diagnostics?: readonly SimDiagnostic[];
  readonly debug?: DebugPort;
};

export interface SimHandlerDeps {
  diag: boolean;
  /** The only wall clock; it paces the run and decides when a slice yields. */
  wallMs(): number;
  schedule(fn: () => void): void;
  makeEngine(program: ProgramImage, net: SimNetlist, opts: SimRunOptions): SimEngine;
  /** Gets what `makeEngine` needs for a compiled program before the run is built; errors refuse the load. Without it `makeEngine` must cope on its own. */
  prepareHex?(): Promise<SimDiagnostic[]>;
  makeDigital(): DigitalLayer;
  /** Without it every probe is refused. The tap stays outside the orchestrator so that probes never reach a hash. */
  makeTap?(): ProbeTap & Engine;
  /** Without it `i2c-scan` is refused. Opens the I2C bus of a scratch engine; the pins are read once the sketch has run. */
  scan?(engine: SimEngine): Omit<ScanSession, "dispose">;
  /** Without it a robot project loads with no physics. */
  mech?: {
    prepare(doc: Project, net: SimNetlist, onState: (state: MechState, info?: { wireBytes?: number; reason?: string }) => void): Promise<Result<MechKit, MechRefusal>>;
    runIo(net: SimNetlist): MechRunIo;
    report(doc: Project): RobotReport;
  };
  /** Without it `static-check` finds nothing and a run posts no `findings` events. */
  faults?: {
    describe(descriptorId: string): Descriptor | undefined;
    rules(): readonly Rule[];
  };
}

/** A part reference such as `core.uno-r3@1.0.0` names the board profile `uno-r3`. */
export const boardIdOf = (descriptor: string): BoardId => descriptor.replace(/^core\./, "").replace(/@.*$/, "") as BoardId;

const TERMINAL: readonly SimRunState[] = ["done", "halted", "limit"];

const SLICE_WALL_MS = 12;
/** At most 30 frames per simulated second. */
const FRAME_INTERVAL_NS = Math.ceil((1000 * NS_PER_MS) / 30);
const MIN_SPEED = 0.01;
const MAX_SPEED = 100;
/** The span over which the achieved speed is averaged. */
const SPEED_WINDOW_MS = 1000;
/** A run is behind when it achieves less than this share of the speed asked for. */
const BEHIND_RATIO = 0.95;
const SPEED_REPORT_MS = 250;
/** At most 30 probe batches per wall second. */
const PROBE_BATCH_MS = 1000 / 30;
const MAX_CHUNK_BYTES = 512 * 1024;
/** The tap never yields: it only copies values. */
const NEVER_YIELD: SliceBudget = { shouldYield: () => false, work: { statements: Infinity, events: Infinity, outputBytes: Infinity } };
/** The scan snapshots the live run only to read its time and input cursor, so no document hash is involved. */
const SCAN_DOC_HASH = "i2c-scan";
const SERIAL_LINES_PER_FRAME = 500;
const SERIAL_CAP_CHARS = 1024 * 1024;

type Emit = (ev: SimEv) => void;

interface Runtime {
  orch: Orchestrator;
  engine: SimEngine;
  digital: DigitalLayer;
  opts: SimRunOptions;
  pins: Map<string, PinLevel>;
  edgesSeen: number;
  serialSeen: number;
  serialChars: number;
  serialCapped: boolean;
  engineDiagsSeen: number;
  orchDiagsSeen: number;
  lastParts: string | null;
  lastFrameAt: SimTime;
  anchor: { wall: number; sim: SimTime };
  /** Wall and simulated time at the end of recent slices, oldest first. */
  progress: Array<{ wall: number; sim: SimTime }>;
  lastReportWall: number;
  tap: (ProbeTap & Engine) | null;
  handles: Map<string, ProbeHandle>;
  /** Where the next chunk of a streamed probe starts. */
  subs: Map<string, SimTime>;
  /** The last reading sent per probe, without its time. */
  sentReadings: Map<string, string>;
  lastProbeWall: number;
  mech: MechRuntime | null;
  /** The frame bucket last sent; one bucket is `FRAME_EVERY_STEPS` steps. */
  mechBucket: number;
}

const bad = (message: string) => new WorkerError({ kind: "bad_message", message });

function eventKind(d: SimDiagnostic): "diagnostic" | "output-contention" | "no-time-progress" {
  return d.id === "output-contention" || d.id === "no-time-progress" ? d.id : "diagnostic";
}

const messageOf = (d: SimDiagnostic): string => String(d.args?.message ?? d.text_key);

/** Keeps the newest samples of a chunk that is over the payload cap; the rest count as dropped. */
function fitChunk(chunk: TraceChunk): TraceChunk {
  const arrays = [chunk.t, chunk.v, chunk.min, chunk.max].filter((a) => a !== undefined).length;
  const room = Math.max(1, Math.floor(MAX_CHUNK_BYTES / (arrays * 8)));
  const excess = chunk.t.length - room;
  if (excess <= 0) return chunk;
  const tail = (a: Float64Array) => a.slice(excess);
  const t = tail(chunk.t);
  return {
    ...chunk,
    from: t[0],
    t,
    v: tail(chunk.v),
    ...(chunk.min && chunk.max ? { min: tail(chunk.min), max: tail(chunk.max) } : {}),
    dropped: chunk.dropped + excess,
  };
}

export function createSimHandler(deps: SimHandlerDeps): WorkerHandler<SimReq, SimEv> {
  let run = 0;
  let state: SimRunState = "idle";
  let speed = 0;
  let rt: Runtime | null = null;
  let loaded: Extract<SimReq, { t: "load" }> | null = null;
  let kit: MechKit | null = null;
  let pumpGen = 0;
  let horizon: SimTime | null = null;
  let stamped: InputEntry[] = [];
  let emit: Emit = () => undefined;
  const monitor = deps.faults && createFaultMonitor(deps.faults.rules());

  const post = (limit?: { kind: string; message: string }) => {
    emit({ t: "state", run, state, at: rt?.orch.now ?? 0, ...(limit ? { limit } : {}) });
  };

  function setState(next: SimRunState, limit?: { kind: string; message: string }) {
    state = next;
    post(limit);
    if (rt && (next === "paused" || TERMINAL.includes(next))) postFindings(rt);
    if (rt && TERMINAL.includes(next)) postMechReport(rt);
  }

  const boardOf = (net: SimNetlist) => ({ variant: boardIdOf(net.parts.find((p) => p.kind === "board")?.descriptor ?? "") });

  function codeFactsOf(net: SimNetlist, sources: Record<string, string>, entry: string[]): CodeFacts | undefined {
    return entry.length === 0 ? undefined : extractCodeFacts(sources, entry, boardOf(net));
  }

  function staticCheck(req: Extract<SimReq, { t: "static-check" }>): StaticCheckReply {
    if (!deps.faults) return { findings: [], skipped: {}, errors: [] };
    const view = buildNetView(req.net, deps.faults.describe);
    const code = codeFactsOf(req.net, req.sources, Object.keys(req.sources).sort());
    const { findings, skipped, errors } = runRules(deps.faults.rules(), { view, code });
    return { findings, skipped, errors };
  }

  function postFindings(r: Runtime) {
    if (!monitor || !deps.faults || !loaded) return;
    const { net, program } = loaded;
    if (program.kind !== "source") return;
    const sources = Object.fromEntries(program.files.map((f) => [f.path, f.text]));
    const base = runFactsFrom({
      endNs: r.orch.now,
      states: [],
      voltage: () => undefined,
      current: () => undefined,
      serial: [...(r.engine.serialLog ?? [])],
    });
    const facts = r.mech && kit ? withRobotFacts(base, r.mech.facts(), kit.nets) : base;
    const findings = monitor.onRunEnd(facts, buildNetView(net, deps.faults.describe), codeFactsOf(net, sources, [program.entry]));
    emit({ t: "event", run, event: { kind: "findings", findings } });
  }

  function postMechReport(r: Runtime) {
    if (r.mech) emit({ t: "mech_report", run, report: r.mech.report(r.orch.checkpoints.map((c) => c.hash)) });
  }

  /** At most one frame per `FRAME_EVERY_STEPS` steps, which is 30 per simulated second; the last one of a run is always sent. */
  function sendMech(r: Runtime, force: boolean) {
    if (!r.mech) return;
    const bucket = Math.floor(r.mech.mech.stepIndex() / FRAME_EVERY_STEPS);
    if (!force && bucket === r.mechBucket) return;
    r.mechBucket = bucket;
    emit({ t: "mech_frame", run, frame: r.mech.takeFrame() });
  }

  /** A physics fault ends the run as halted, with the code and the last state, instead of escaping the worker. */
  function advance(r: Runtime, slice: () => SliceResult): SliceResult {
    try {
      return slice();
    } catch (error) {
      const halt = r.mech?.mech.halt();
      if (!r.mech || !halt) throw error;
      emit({ t: "mech_halt", run, code: halt.code, body: halt.body, at: r.orch.now, frame: r.mech.takeFrame() });
      return { reason: "halted", now: r.orch.now };
    }
  }

  function stopPump() {
    pumpGen++;
  }

  function sendFrame(r: Runtime, force: boolean) {
    const at = r.orch.now;
    if (!force && at - r.lastFrameAt < FRAME_INTERVAL_NS) return;
    const edges = r.orch.pinEdges();
    for (let i = r.edgesSeen; i < edges.length; i++) r.pins.set(edges[i].net, edges[i].level);
    const newEdges = edges.length > r.edgesSeen;
    r.edgesSeen = edges.length;

    const log = r.engine.serialLog ?? [];
    const lines = r.serialCapped ? [] : log.slice(r.serialSeen);
    r.serialSeen = log.length;
    const parts: PartState[] = r.digital.partStates();
    const partsKey = JSON.stringify(parts);
    if (!newEdges && lines.length === 0 && partsKey === r.lastParts) return;
    r.lastParts = partsKey;
    r.lastFrameAt = at;

    const kept: typeof lines = [];
    for (const line of lines) {
      if (r.serialChars + line.text.length > SERIAL_CAP_CHARS) {
        r.serialCapped = true;
        emit({
          t: "event",
          run,
          event: { kind: "diagnostic", message: "serial output passed 1 MiB and is no longer shown", at },
        });
        break;
      }
      r.serialChars += line.text.length;
      kept.push(line);
    }
    const pins = Object.fromEntries(r.pins);
    emit({ t: "frame", run, at, pins, parts, serial: kept.slice(0, SERIAL_LINES_PER_FRAME) });
    for (let i = SERIAL_LINES_PER_FRAME; i < kept.length; i += SERIAL_LINES_PER_FRAME) {
      emit({ t: "frame", run, at, pins, parts, serial: kept.slice(i, i + SERIAL_LINES_PER_FRAME) });
    }
  }

  function readingKey(reading: unknown): string {
    return JSON.stringify({ ...(reading as object), at: 0 });
  }

  function sendReading(r: Runtime, id: string, handle: ProbeHandle) {
    const reading = r.tap!.read(handle);
    const key = readingKey(reading);
    if (r.sentReadings.get(id) === key) return;
    r.sentReadings.set(id, key);
    emit({ t: "probe.reading", run, id, reading });
  }

  /** Brings the tap to the present and, at most 30 times a second, sends the readings that changed and the new samples. */
  function flushProbes(r: Runtime, force: boolean) {
    if (!r.tap) return;
    r.tap.advanceTo(r.orch.now, NEVER_YIELD);
    const wall = deps.wallMs();
    if (!force && wall - r.lastProbeWall < PROBE_BATCH_MS) return;
    r.lastProbeWall = wall;
    for (const [id, handle] of r.handles) sendReading(r, id, handle);
    for (const [id, from] of r.subs) {
      const chunk = r.tap.stream(r.handles.get(id)!, from);
      if (chunk.t.length === 0) continue;
      r.subs.set(id, chunk.t[chunk.t.length - 1] + 1);
      emit({ t: "probe.chunk", run, chunk: fitChunk(chunk) });
    }
  }

  function probe(r: Runtime, msg: Extract<SimReq, { t: `probe.${string}` | "hashes.request" }>): ProbeAddReply | unknown {
    if (msg.t === "hashes.request") {
      if (msg.tNs !== r.orch.now) {
        throw new WorkerError({ kind: "not_at_time", message: `the run is at ${r.orch.now} ns, not ${msg.tNs} ns` });
      }
      return { tNs: r.orch.now, ...classHashes(r.orch) } satisfies HashesReply;
    }
    if (msg.t === "probe.add") {
      if (!r.tap) return { error: "unknown-target" } satisfies ProbeAddReply;
      const handle = r.tap.add(msg.spec);
      if (handle.error) return { error: handle.error } satisfies ProbeAddReply;
      r.handles.set(handle.id, handle);
      sendReading(r, handle.id, handle);
      return {} satisfies ProbeAddReply;
    }
    const handle = r.handles.get(msg.id);
    if (!handle) throw bad(`no probe ${msg.id}`);
    if (msg.t === "probe.read") return r.tap!.read(handle);
    if (msg.t === "probe.sub") {
      r.subs.set(msg.id, msg.from);
      return;
    }
    r.tap!.remove(handle);
    r.handles.delete(msg.id);
    r.subs.delete(msg.id);
    r.sentReadings.delete(msg.id);
  }

  /** Reports what the engine and the orchestrator found since the last slice; returns how they end the run, if they do. */
  function review(r: Runtime, result: SliceResult): { state: SimRunState; limit?: { kind: string; message: string } } | null {
    const found = [
      ...(r.engine.diagnostics ?? []).slice(r.engineDiagsSeen),
      ...r.orch.diagnostics.slice(r.orchDiagsSeen),
    ];
    r.engineDiagsSeen = r.engine.diagnostics?.length ?? 0;
    r.orchDiagsSeen = r.orch.diagnostics.length;
    for (const d of found) {
      emit({ t: "event", run, event: { kind: eventKind(d), message: messageOf(d), at: r.orch.now } });
    }
    const limit = found.find((d) => d.id === "limit-exceeded");
    if (limit) return { state: "limit", limit: { kind: limit.id, message: messageOf(limit) } };
    if (result.reason === "halted" || found.some((d) => d.id === "runtime-error")) return { state: "halted" };
    if (result.reason === "done" || r.engine.nextDue() === null) return { state: "done" };
    return null;
  }

  /** True when the slice ended the run. */
  function finish(r: Runtime, result: SliceResult): boolean {
    const ended = review(r, result);
    sendFrame(r, ended !== null);
    sendMech(r, ended !== null);
    flushProbes(r, ended !== null);
    if (!ended) return false;
    setState(ended.state, ended.limit);
    return true;
  }

  function paceTarget(r: Runtime): SimTime {
    const { endNs } = r.opts;
    if (speed <= 0) return endNs ?? Infinity;
    return r.anchor.sim + Math.floor((deps.wallMs() - r.anchor.wall) * NS_PER_MS * speed);
  }

  /** A room run stops at the horizon and just before the next stamped input, so that input is the first thing at its instant. */
  function targetOf(r: Runtime): SimTime {
    const next = stamped[0];
    return Math.min(paceTarget(r), horizon ?? Infinity, next ? next.at - 1 : Infinity);
  }

  function applyDueInputs(r: Runtime) {
    while (stamped.length > 0 && r.orch.now >= stamped[0].at - 1) {
      const { kind, target, value } = stamped.shift() as InputEntry;
      r.orch.inject({ kind, target, value });
    }
  }

  const atHorizon = (r: Runtime): boolean => horizon !== null && r.orch.now >= horizon;

  /** Moves the horizon; the pump sleeps while it sits on it and wakes here. */
  function setHorizon(r: Runtime | null, tNs: SimTime | null) {
    horizon = tNs;
    if (!r) return;
    if (atHorizon(r)) emit({ t: "reached", run, at: r.orch.now });
    else if (state === "running") pump(r, ++pumpGen);
  }

  /** Tells the host how much of the requested speed the last second achieved, a few times a second. */
  function reportSpeed(r: Runtime) {
    const wall = deps.wallMs();
    const { progress } = r;
    progress.push({ wall, sim: r.orch.now });
    while (progress.length > 2 && wall - progress[1].wall >= SPEED_WINDOW_MS) progress.shift();
    const first = progress[0];
    if (wall - first.wall < SPEED_WINDOW_MS || wall - r.lastReportWall < SPEED_REPORT_MS) return;
    r.lastReportWall = wall;
    const achieved = (r.orch.now - first.sim) / ((wall - first.wall) * NS_PER_MS);
    emit({ t: "speed.report", run, achieved, behind: speed > 0 && achieved < BEHIND_RATIO * speed });
  }

  function pauseAt(r: Runtime, pause: PauseEvent) {
    stopPump();
    setState("paused");
    emit({
      t: "event",
      run,
      event: {
        kind: "paused",
        runtime: r.engine.id,
        reason: pause.reason,
        file: pause.file,
        line: pause.line,
        atNs: pause.atNs,
      },
    });
  }

  function pump(r: Runtime, gen: number) {
    deps.schedule(() => {
      if (gen !== pumpGen) return;
      const started = deps.wallMs();
      const result = advance(r, () =>
        r.orch.runUntil(targetOf(r), {
          shouldYield: () => r.engine.debug?.paused != null || deps.wallMs() - started >= SLICE_WALL_MS,
          work: r.opts.limits,
        }),
      );
      if (finish(r, result)) return;
      const pause = r.engine.debug?.paused;
      if (pause) {
        pauseAt(r, pause);
        return;
      }
      applyDueInputs(r);
      reportSpeed(r);
      if (atHorizon(r)) {
        emit({ t: "reached", run, at: r.orch.now });
        return;
      }
      pump(r, gen);
    });
  }

  function refuse(req: Extract<SimReq, { t: "load" }>, diagnostics: SimDiagnostic[]): DiagnosticsReply {
    loaded = req;
    state = "idle";
    rt?.mech?.free();
    rt = null;
    post();
    return { diagnostics };
  }

  function build(req: Extract<SimReq, { t: "load" }>): DiagnosticsReply {
    const digital = deps.makeDigital();
    const engine = deps.makeEngine(req.program, req.net, req.opts);
    rt?.mech?.free();
    const mech = kit && deps.mech ? kit.start(req.net, deps.mech.runIo(req.net)) : null;
    const orch = createOrchestrator({ engines: mech ? [engine, mech.engine] : [engine], digital });
    const loadedNet = orch.load(req.net, req.opts);
    const diagnostics = [...loadedNet.diagnostics];
    let ok = loadedNet.ok;
    if (ok) {
      const loadedProgram = engine.load(req.program);
      diagnostics.push(...loadedProgram.diagnostics);
      ok = loadedProgram.ok;
    }
    if (!ok) {
      mech?.free();
      return refuse(req, diagnostics);
    }
    loaded = req;
    state = "idle";
    rt = {
      orch,
      engine,
      digital,
      opts: req.opts,
      pins: new Map(),
      edgesSeen: 0,
      serialSeen: 0,
      serialChars: 0,
      serialCapped: false,
      engineDiagsSeen: engine.diagnostics?.length ?? 0,
      orchDiagsSeen: orch.diagnostics.length,
      lastParts: null,
      lastFrameAt: -Infinity,
      anchor: { wall: 0, sim: 0 },
      progress: [],
      lastReportWall: 0,
      tap: deps.makeTap?.() ?? null,
      handles: new Map(),
      subs: new Map(),
      sentReadings: new Map(),
      lastProbeWall: -Infinity,
      mech,
      mechBucket: -1,
    };
    post();
    sendFrame(rt, true);
    sendMech(rt, true);
    return { diagnostics };
  }

  /** Brings the physics engine in, telling the Run bar as it goes, then builds the run with the robot on it. */
  async function loadRobot(req: Extract<SimReq, { t: "load" }>, robot: Project): Promise<DiagnosticsReply | IgnoredReply> {
    const prepared = await deps.mech!.prepare(robot, req.net, (s, info) => emit({ t: "mech_status", run: req.run, state: s, ...info }));
    if (run !== req.run) return { ignored: true };
    if (!prepared.ok) {
      const { problems, ...refusal } = prepared.error;
      if (problems) emit({ t: "robot_problems", run: req.run, problems, checks: [], coupling: [] });
      emit({ t: "mech_status", run: req.run, state: "failed", reason: refusal.message, refusal });
      return refuse(req, [simDiag("engine-load-failed", "error", {}, { message: refusal.message })]);
    }
    kit = prepared.value;
    const { problems, checks, coupling } = kit;
    emit({ t: "robot_problems", run: req.run, problems, checks, coupling });
    return build(req);
  }

  /** The run as it is now, rebuilt from t = 0 with its recorded inputs on engines of its own. */
  function restoreForScan(r: Runtime, snapshot: OrchestratorSnapshot): ScanSession {
    if (!loaded || !deps.scan) throw new WorkerError({ kind: "no-scan", message: "this worker cannot scan the bus" });
    const { net, opts, program } = loaded;
    const digital = deps.makeDigital();
    const engine = deps.makeEngine(program, net, opts);
    const scratch = createOrchestrator({ engines: [engine], digital });
    const loadedNet = scratch.load(net, opts);
    if (!loadedNet.ok || !engine.load(program).ok) throw new ScanError("the program did not load");
    const bus = deps.scan(engine);
    for (const input of r.orch.inputs.slice(0, snapshot.logCursor)) {
      scratch.runUntil(input.at, NEVER_YIELD);
      scratch.inject({ kind: input.kind, target: input.target, value: input.value });
    }
    scratch.runUntil(snapshot.at, NEVER_YIELD);
    if (scratch.now !== snapshot.at || scratch.snapshot(snapshot).stateHash !== snapshot.stateHash) {
      throw new ScanError("the run could not be rebuilt for the scan");
    }
    return { ...bus, dispose: () => undefined };
  }

  function i2cScan(r: Runtime, msg: Extract<SimReq, { t: "i2c-scan" }>): ScannedReply {
    const snapshot = r.orch.snapshot({ docHash: SCAN_DOC_HASH, logCursor: r.orch.inputs.length });
    try {
      return { t: "scanned", ...scanBus(snapshot, (s) => restoreForScan(r, s), { bus: msg.bus }) };
    } catch (e) {
      if (e instanceof ScanError) throw new WorkerError({ kind: "scan_failed", message: e.message });
      throw e;
    }
  }

  function anchorAtNow(r: Runtime) {
    const wall = deps.wallMs();
    r.anchor = { wall, sim: r.orch.now };
    r.progress = [{ wall, sim: r.orch.now }];
    r.lastReportWall = wall;
  }

  function setSpeed(x: number): void {
    if (Number.isNaN(x)) throw bad("speed must be a number");
    speed = x === 0 ? 0 : Math.min(MAX_SPEED, Math.max(MIN_SPEED, x));
    if (rt && state === "running") anchorAtNow(rt);
  }

  function control(op: Extract<SimReq, { t: "control" }>["op"]): void {
    if (op === "cancel") {
      stopPump();
      if (state === "running" || state === "paused") setState("idle");
      return;
    }
    if (!loaded) throw bad("nothing is loaded");
    if (op === "stop" || op === "reset") {
      stopPump();
      build(loaded);
      return;
    }
    if (!rt) throw bad("the loaded program did not compile");
    if (op === "run") {
      if (state !== "idle" && state !== "paused") return;
      anchorAtNow(rt);
      setState("running");
      pump(rt, ++pumpGen);
      return;
    }
    if (state !== "running") return;
    stopPump();
    sendFrame(rt, true);
    flushProbes(rt, true);
    setState("paused");
  }

  function step(req: Extract<SimReq, { t: "step" }>): DiagnosticsReply {
    if (!(req.n > 0)) throw bad(`step needs n above 0, got ${req.n}`);
    if (!rt) throw bad("nothing is loaded");
    if (state === "running") throw new WorkerError({ kind: "not_paused", message: "pause the run before stepping" });
    if (state === "done" || state === "halted" || state === "limit") return { diagnostics: [] };
    stopPump();
    const stepping = rt;
    const result = advance(stepping, () => stepping.orch.step(req.unit, req.n));
    const diagnostics: SimDiagnostic[] = [];
    if (result.reason === "unsupported") {
      const d = simDiag("step-unit-unsupported", "warning", {}, { unit: req.unit });
      diagnostics.push(d);
      emit({ t: "event", run, event: { kind: "diagnostic", message: `step by ${req.unit} is not supported yet`, at: rt.orch.now } });
    }
    if (!finish(rt, result)) setState("paused");
    return { diagnostics };
  }

  function debugOp(msg: Extract<SimReq, { t: "debug" }>): DebugStepReply | void {
    if (!rt) throw bad("nothing is loaded");
    if (msg.runtime !== rt.engine.id) {
      throw new WorkerError({ kind: "unknown-runtime", message: `no runtime ${msg.runtime} in this run` });
    }
    const port = rt.engine.debug;
    if (!port) throw new WorkerError({ kind: "no-debug-port", message: `${msg.runtime} cannot be debugged` });
    const { op } = msg;
    switch (op.op) {
      case "set-breakpoints":
        if (op.lines.length > MAX_BREAKPOINTS_PER_FILE) throw bad(`at most ${MAX_BREAKPOINTS_PER_FILE} breakpoints per file`);
        return port.setBreakpoints(op.file, op.lines);
      case "pause":
        return control("pause");
      case "continue":
        port.resume();
        return control("run");
      case "step":
        if (op.unit !== "line" && op.unit !== "over" && op.unit !== "out") throw bad(`unknown step unit ${String(op.unit)}`);
        if (state === "paused" && port.paused) {
          port.step(op.unit);
          control("run");
        }
        return { state };
      default:
        throw new WorkerError({ kind: "not-yet", message: `debug ${op.op} is not available yet` });
    }
  }

  return (msg, send) => {
    emit = send;
    if (msg.t === "check") return runChecks(msg.job, { budgetMs: msg.budgetMs });
    if (msg.t === "static-check") return staticCheck(msg);
    if (msg.t === "parse-firmware") return parseFirmware(msg.hex, msg.elf);
    if (msg.t === "diag") {
      if (!deps.diag || msg.op !== "stall") throw bad("diag is not enabled in this worker");
      for (;;);
    }
    if (msg.t === "load") {
      stopPump();
      run = msg.run;
      speed = msg.opts.speed;
      horizon = null;
      stamped = [];
      kit = null;
      const robot = msg.robot && deps.mech && needsPhysics(msg.robot) ? msg.robot : undefined;
      if (msg.program.kind !== "hex" || !deps.prepareHex) return robot ? loadRobot(msg, robot) : build(msg);
      return deps.prepareHex().then((blocked) => {
        if (run !== msg.run) return { ignored: true } satisfies IgnoredReply;
        if (blocked.length > 0) return refuse(msg, blocked);
        return robot ? loadRobot(msg, robot) : build(msg);
      });
    }
    if (msg.t === "robot_validate") return deps.mech ? deps.mech.report(msg.doc) : { problems: [], checks: [], coupling: [] };
    if (msg.run !== run) return { ignored: true } satisfies IgnoredReply;
    if (msg.t === "control") return void control(msg.op);
    if (msg.t === "step") return step(msg);
    if (msg.t === "speed") return void setSpeed(msg.x);
    if (msg.t === "debug") return debugOp(msg);
    if (!rt) throw bad("nothing is loaded");
    if (msg.t === "input") return void rt.orch.inject(msg.input);
    if (msg.t === "horizon") return void setHorizon(rt, msg.tNs);
    if (msg.t === "input.stamped") {
      stamped.push(msg.entry);
      stamped.sort((a, b) => a.at - b.at || a.seq - b.seq);
      applyDueInputs(rt);
      return void (state === "running" && pump(rt, ++pumpGen));
    }
    if (msg.t === "i2c-scan") return i2cScan(rt, msg);
    return probe(rt, msg);
  };
}
