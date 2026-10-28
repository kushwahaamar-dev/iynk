import type { CheckJob, CheckOutcome } from "@/lib/interp";
import { createRpcPort, type RpcPort, type WorkerLike } from "@/protocol";
import type { HostInput, ProgramImage, SimDiagnostic, SimNetlist, SimRunOptions, StepUnit } from "@/sim/engine";
import type { ControlOp, DiagnosticsReply, SimEv, SimReq, SimRunState } from "./protocol";
import { createWatchdog, type KillReason, type Timers } from "./watchdog";

/** How often a running run is asked whether the worker's thread is still turning. */
const PROBE_MS = 500;

const timers: Timers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

const LIMIT_MESSAGE: Record<KillReason, string> = {
  "wall-stall": "The simulator stopped answering for 2 seconds, so it was restarted. Your project is unchanged.",
  "cancel-unanswered": "The simulator did not stop when asked, so it was restarted. Your project is unchanged.",
};

interface LoadRequest {
  net: SimNetlist;
  opts: SimRunOptions;
  program: ProgramImage;
}

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
  /** Stops the worker. Calls fail until `restart`. A stalled worker is killed and reloaded by the host itself. */
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
  let lastLoad: LoadRequest | null = null;
  let running = false;
  let lastAt = 0;
  let probe: unknown;
  let recoveries = 0;
  let recovering = false;
  const watchdog = createWatchdog({ timers, kill: recover });

  function deliver(ev: SimEv) {
    for (const fn of [...listeners]) fn(ev);
  }

  function setRunning(next: boolean) {
    if (next === running) return;
    running = next;
    if (next) {
      watchdog.beat();
      probe = timers.setTimeout(ping, PROBE_MS);
    } else {
      watchdog.disarm();
      timers.clearTimeout(probe);
    }
  }

  /**
   * A run that changes nothing posts no events, so silence is not a stall. A request for run 0 is ignored by the
   * handler without side effects, and its ack shows the worker's thread is free.
   */
  function ping() {
    if (!running) return;
    port.call({ t: "step", run: 0, unit: "ns", n: 0 }).then(
      () => running && watchdog.beat(),
      () => undefined,
    );
    probe = timers.setTimeout(ping, PROBE_MS);
  }

  async function recover(reason: KillReason) {
    if (recovering) return;
    recovering = true;
    recoveries++;
    setRunning(false);
    const again = lastLoad;
    try {
      await port.kill(0);
      stats.restarts++;
      port = open();
      if (again) await port.call({ t: "load", run: runId, ...again });
    } catch {
      // The new worker is unusable; the next call on the port fails with its own error.
    } finally {
      recovering = false;
    }
    stats.lastState = "limit";
    deliver({ t: "state", run: runId, state: "limit", at: lastAt, limit: { kind: reason, message: LIMIT_MESSAGE[reason] } });
  }

  function open(): SimPort {
    const fresh = build();
    fresh.on((ev) => {
      if (ev.run !== runId) return;
      if (ev.t === "state") {
        stats.lastState = ev.state;
        lastAt = ev.at;
        setRunning(ev.state === "running");
      } else if (running) {
        watchdog.beat();
      }
      deliver(ev);
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
      setRunning(false);
      const ack = await port.call({ t: "load", run: runId, net, opts, program });
      lastLoad = { net, opts, program };
      return { diagnostics: (ack.result as DiagnosticsReply).diagnostics, runId };
    },
    async control(op) {
      const run = current();
      const before = recoveries;
      const answerable = op === "stop" || op === "cancel";
      if (answerable) watchdog.armCancel();
      try {
        await port.call({ t: "control", run, op });
      } catch (err) {
        if (before === recoveries) throw err;
      } finally {
        if (answerable && before === recoveries) watchdog.disarm();
      }
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
    kill() {
      setRunning(false);
      return port.kill(0);
    },
    async restart() {
      setRunning(false);
      await port.kill(0);
      stats.restarts++;
      loaded = false;
      lastLoad = null;
      port = open();
    },
    get state() {
      return port.state;
    },
    stats,
  };
}
