import { runChecks } from "@/lib/interp";
import { WorkerError, type WorkerHandler } from "@/protocol";
import { NS_PER_MS, type SimTime } from "@/sim/core/clock";
import { simDiag } from "@/sim/core/diagnostic";
import type {
  DigitalLayer,
  McuEngine,
  PartState,
  ProgramImage,
  SimDiagnostic,
  SimNetlist,
  SimRunOptions,
  SliceResult,
} from "@/sim/engine";
import { createOrchestrator, type Orchestrator } from "@/sim/orchestrator";
import type { DiagnosticsReply, IgnoredReply, PinLevel, SimEv, SimReq, SimRunState } from "./protocol";

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
}

const SLICE_WALL_MS = 12;
/** At most 30 frames per simulated second. */
const FRAME_INTERVAL_NS = Math.ceil((1000 * NS_PER_MS) / 30);
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
}

const bad = (message: string) => new WorkerError({ kind: "bad_message", message });

function eventKind(d: SimDiagnostic): "diagnostic" | "output-contention" | "no-time-progress" {
  return d.id === "output-contention" || d.id === "no-time-progress" ? d.id : "diagnostic";
}

const messageOf = (d: SimDiagnostic): string => String(d.args?.message ?? d.text_key);

export function createSimHandler(deps: SimHandlerDeps): WorkerHandler<SimReq, SimEv> {
  let run = 0;
  let state: SimRunState = "idle";
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
    if (!ended) return false;
    setState(ended.state, ended.limit);
    return true;
  }

  function targetOf(r: Runtime): SimTime {
    const { speed, endNs } = r.opts;
    if (speed <= 0) return endNs ?? Infinity;
    return r.anchor.sim + Math.floor((deps.wallMs() - r.anchor.wall) * NS_PER_MS * speed);
  }

  function pump(r: Runtime, gen: number) {
    deps.schedule(() => {
      if (gen !== pumpGen) return;
      const started = deps.wallMs();
      const result = r.orch.runUntil(targetOf(r), {
        shouldYield: () => deps.wallMs() - started >= SLICE_WALL_MS,
        work: r.opts.limits,
      });
      if (!finish(r, result)) pump(r, gen);
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
    };
    post();
    sendFrame(rt, true);
    return { diagnostics };
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
      rt.anchor = { wall: deps.wallMs(), sim: rt.orch.now };
      setState("running");
      pump(rt, ++pumpGen);
      return;
    }
    if (state !== "running") return;
    stopPump();
    sendFrame(rt, true);
    setState("paused");
  }

  function step(req: Extract<SimReq, { t: "step" }>): DiagnosticsReply {
    if (!(req.n > 0)) throw bad(`step needs n above 0, got ${req.n}`);
    if (!rt) throw bad("nothing is loaded");
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
      return build(msg);
    }
    if (msg.run !== run) return { ignored: true } satisfies IgnoredReply;
    if (msg.t === "control") return void control(msg.op);
    if (msg.t === "step") return step(msg);
    if (!rt) throw bad("nothing is loaded");
    rt.orch.inject(msg.input);
  };
}
