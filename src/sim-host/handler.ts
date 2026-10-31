import { runChecks } from "@/lib/interp";
import { WorkerError, type WorkerHandler } from "@/protocol";
import { NS_PER_MS, type SimTime } from "@/sim/core/clock";
import { simDiag } from "@/sim/core/diagnostic";
import type {
  DigitalLayer,
  Engine,
  McuEngine,
  PartState,
  ProgramImage,
  SimDiagnostic,
  SimNetlist,
  SimRunOptions,
  SliceBudget,
  SliceResult,
} from "@/sim/engine";
import { createOrchestrator, type Orchestrator } from "@/sim/orchestrator";
import type { ProbeHandle, ProbeTap, TraceChunk } from "@/sim/probe/tap";
import { classHashes } from "@/sim/replay/trace";
import type { DiagnosticsReply, HashesReply, IgnoredReply, PinLevel, ProbeAddReply, SimEv, SimReq, SimRunState } from "./protocol";

/** What the handler reads from an engine beyond `McuEngine`; the interpreter engines have both. */
export type SimEngine = McuEngine & {
  readonly serialLog?: ReadonlyArray<{ at: SimTime; text: string }>;
  readonly diagnostics?: readonly SimDiagnostic[];
};

export interface SimHandlerDeps {
  diag: boolean;
  /** The only wall clock; it paces the run and decides when a slice yields. */
  wallMs(): number;
  schedule(fn: () => void): void;
  makeEngine(program: ProgramImage, net: SimNetlist, opts: SimRunOptions): SimEngine;
  makeDigital(): DigitalLayer;
  /** Without it every probe is refused. The tap stays outside the orchestrator so that probes never reach a hash. */
  makeTap?(): ProbeTap & Engine;
}

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
  let pumpGen = 0;
  let emit: Emit = () => undefined;

  const post = (limit?: { kind: string; message: string }) => {
    emit({ t: "state", run, state, at: rt?.orch.now ?? 0, ...(limit ? { limit } : {}) });
  };

  function setState(next: SimRunState, limit?: { kind: string; message: string }) {
    state = next;
    post(limit);
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
    flushProbes(r, ended !== null);
    if (!ended) return false;
    setState(ended.state, ended.limit);
    return true;
  }

  function targetOf(r: Runtime): SimTime {
    const { endNs } = r.opts;
    if (speed <= 0) return endNs ?? Infinity;
    return r.anchor.sim + Math.floor((deps.wallMs() - r.anchor.wall) * NS_PER_MS * speed);
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

  function pump(r: Runtime, gen: number) {
    deps.schedule(() => {
      if (gen !== pumpGen) return;
      const started = deps.wallMs();
      const result = r.orch.runUntil(targetOf(r), {
        shouldYield: () => deps.wallMs() - started >= SLICE_WALL_MS,
        work: r.opts.limits,
      });
      if (!finish(r, result)) {
        reportSpeed(r);
        pump(r, gen);
      }
    });
  }

  function build(req: Extract<SimReq, { t: "load" }>): DiagnosticsReply {
    const digital = deps.makeDigital();
    const engine = deps.makeEngine(req.program, req.net, req.opts);
    const orch = createOrchestrator({ engines: [engine], digital });
    const loadedNet = orch.load(req.net, req.opts);
    const diagnostics = [...loadedNet.diagnostics];
    let ok = loadedNet.ok;
    if (ok) {
      const loadedProgram = engine.load(req.program);
      diagnostics.push(...loadedProgram.diagnostics);
      ok = loadedProgram.ok;
    }
    loaded = req;
    state = "idle";
    if (!ok) {
      rt = null;
      post();
      return { diagnostics };
    }
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
    };
    post();
    sendFrame(rt, true);
    return { diagnostics };
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
    const result = rt.orch.step(req.unit, req.n);
    const diagnostics: SimDiagnostic[] = [];
    if (result.reason === "unsupported") {
      const d = simDiag("step-unit-unsupported", "warning", {}, { unit: req.unit });
      diagnostics.push(d);
      emit({ t: "event", run, event: { kind: "diagnostic", message: `step by ${req.unit} is not supported yet`, at: rt.orch.now } });
    }
    if (!finish(rt, result)) setState("paused");
    return { diagnostics };
  }

  return (msg, send) => {
    emit = send;
    if (msg.t === "check") return runChecks(msg.job, { budgetMs: msg.budgetMs });
    if (msg.t === "diag") {
      if (!deps.diag || msg.op !== "stall") throw bad("diag is not enabled in this worker");
      for (;;);
    }
    if (msg.t === "load") {
      stopPump();
      run = msg.run;
      speed = msg.opts.speed;
      return build(msg);
    }
    if (msg.run !== run) return { ignored: true } satisfies IgnoredReply;
    if (msg.t === "control") return void control(msg.op);
    if (msg.t === "step") return step(msg);
    if (msg.t === "speed") return void setSpeed(msg.x);
    if (!rt) throw bad("nothing is loaded");
    if (msg.t === "input") return void rt.orch.inject(msg.input);
    return probe(rt, msg);
  };
}
