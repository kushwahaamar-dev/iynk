import type { CheckJob, CheckOutcome } from "@/lib/interp";
import { createRpcPort, type RpcPort, type WorkerLike } from "@/protocol";
import type { HostInput, ProgramImage, SimDiagnostic, SimNetlist, SimRunOptions, StepUnit } from "@/sim/engine";
import type { ControlOp, DiagnosticsReply, SimEv, SimReq, SimRunState } from "./protocol";

type SimPort = RpcPort<SimReq, SimEv>;

export interface SimHostStats {
  runs: number;
  restarts: number;
  lastState: SimRunState | null;
}

export interface SimHost {
  load(net: SimNetlist, opts: SimRunOptions, program: ProgramImage): Promise<{ diagnostics: SimDiagnostic[]; runId: number }>;
  control(op: ControlOp): Promise<void>;
  step(unit: StepUnit, n: number): Promise<void>;
  input(i: HostInput): Promise<void>;
  check(job: CheckJob, budgetMs?: number): Promise<CheckOutcome>;
  /** Events of the current run only; a late message of an older run is dropped. */
  onEvent(fn: (e: SimEv) => void): () => void;
  /** Stops the worker. Calls fail until `restart`. */
  kill(): Promise<void>;
  /** Starts a new worker. It holds no run: send `load` again from the project. */
  restart(): Promise<void>;
  readonly state: "starting" | "ready" | "dead";
  readonly stats: Readonly<SimHostStats>;
}

export interface SimHostOptions {
  /** Builds a worker port. The default starts `sim.worker.ts`; tests pass an inline port over a handler. */
  makePort?: () => SimPort;
  /** Starts the worker as `sim-diag`, which answers `diag` requests (Diagnostics panel). */
  diag?: boolean;
}

export function createSimHost({ makePort, diag = false }: SimHostOptions = {}): SimHost {
  const build =
    makePort ??
    (() => {
      const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module", name: diag ? "sim-diag" : "sim" });
      return createRpcPort<SimReq, SimEv>(worker as unknown as WorkerLike);
    });
  const listeners = new Set<(e: SimEv) => void>();
  const stats: SimHostStats = { runs: 0, restarts: 0, lastState: null };
  let port = open();
  let runId = 0;
  let loaded = false;

  function open(): SimPort {
    const fresh = build();
    fresh.on((ev) => {
      if (ev.run !== runId) return;
      if (ev.t === "state") stats.lastState = ev.state;
      for (const fn of [...listeners]) fn(ev);
    });
    return fresh;
  }

  function current(): number {
    if (!loaded) throw new Error("load a program before using the run");
    return runId;
  }

  return {
    async load(net, opts, program) {
      runId++;
      stats.runs++;
      stats.lastState = null;
      loaded = true;
      const ack = await port.call({ t: "load", run: runId, net, opts, program });
      return { diagnostics: (ack.result as DiagnosticsReply).diagnostics, runId };
    },
    async control(op) {
      await port.call({ t: "control", run: current(), op });
    },
    async step(unit, n) {
      await port.call({ t: "step", run: current(), unit, n });
    },
    async input(input) {
      await port.call({ t: "input", run: current(), input });
    },
    async check(job, budgetMs) {
      return (await port.call({ t: "check", job, budgetMs })).result as CheckOutcome;
    },
    onEvent(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    kill: () => port.kill(0),
    async restart() {
      await port.kill(0);
      stats.restarts++;
      loaded = false;
      port = open();
    },
    get state() {
      return port.state;
    },
    stats,
  };
}
