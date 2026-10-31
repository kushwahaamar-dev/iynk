import type { CheckJob, CheckOutcome } from "@/lib/interp";
import { createRpcPort, type RpcPort, type WorkerLike } from "@/protocol";
import type { SimTime } from "@/sim/core/clock";
import type { HostInput, ProgramImage, SimDiagnostic, SimNetlist, SimRunOptions, StepUnit } from "@/sim/engine";
import type { ControlOp, DiagnosticsReply, HashesReply, ProbeAddReply, ScannedReply, SimEv, SimReq, SimRunState, StaticCheckReply } from "./protocol";
import type { ProbeSpec, Reading, TraceChunk } from "@/sim/probe/tap";
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

export interface SimHostStatus {
  state: SimRunState | null;
  /** The speed asked for; 0 is as fast as the slice budget allows. */
  speed: number;
  /** What the last second of the run achieved, in simulated seconds per wall second. */
  achievedSpeed: number;
  behindReal: boolean;
}

export interface SimHostProbes {
  /** Rejects with the tap's error (`unknown-target`, `too-many-probes`). */
  add(spec: ProbeSpec): Promise<void>;
  remove(id: string): void;
  read(id: string): Promise<Reading>;
  /** Readings arrive when they change, not on a timer. */
  watch(id: string, fn: (reading: Reading) => void): () => void;
  /** Streams the samples of a probe from `from` on, at most 30 batches a second. */
  subscribe(id: string, from: SimTime, fn: (chunk: TraceChunk) => void): () => void;
}

export interface SimHost {
  load(net: SimNetlist, opts: SimRunOptions, program: ProgramImage): Promise<{ diagnostics: SimDiagnostic[]; runId: number }>;
  control(op: ControlOp): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  /** Changes the pace of the run; it applies at the next resume when the run is paused. */
  setSpeed(x: number): Promise<void>;
  /** Only a paused or idle run steps; a running one refuses with `not_paused`. */
  step(unit: StepUnit, n: number): Promise<void>;
  input(i: HostInput): Promise<void>;
  check(job: CheckJob, budgetMs?: number): Promise<CheckOutcome>;
  /**
   * Runs the fault rules over `net` and the code in `sources`. A newer call makes an older one that is still waiting
   * resolve with `note: "check.skipped"`, and so does a worker that is not ready.
   */
  staticCheck(net: SimNetlist, sources: Record<string, string>): Promise<StaticCheckResult>;
  /** Probes are cleared by `load`, `reset` and `restart`; the caller adds them again. */
  readonly probes: SimHostProbes;
  /** The class hashes of the run at `tNs`; rejects when the run is somewhere else. */
  hashes(tNs: SimTime): Promise<{ hb: string; hd: string }>;
  /** Probes 0x08 to 0x77 on a copy of the run, which is left untouched. Rejects with `scan_failed` when the copy cannot be built or no pins are bound. */
  i2cScan(bus?: string): Promise<ScannedReply>;
  /** Events of the current run only; a late message of an older run is dropped. */
  onEvent(fn: (e: SimEv) => void): () => void;
  /** Stops the worker. Calls fail until `restart`. A stalled worker is killed and reloaded by the host itself. */
  kill(): Promise<void>;
  /** Starts a new worker. It holds no run: send `load` again from the project. */
  restart(): Promise<void>;
  readonly state: "starting" | "ready" | "dead";
  readonly stats: Readonly<SimHostStats>;
  readonly status: Readonly<SimHostStatus>;
}

export interface StaticCheckResult extends StaticCheckReply {
  /** A key of the `faults` namespace, set when no check ran. */
  note?: "check.skipped";
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
  const pace = { achievedSpeed: 0, behindReal: false };
  let port = open();
  let runId = 0;
  let loaded = false;
  let lastLoad: LoadRequest | null = null;
  let running = false;
  let lastAt = 0;
  let probe: unknown;
  let recoveries = 0;
  let recovering = false;
  let reloading = false;
  let checkSeq = 0;
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
    let reloaded: Promise<unknown> = Promise.resolve();
    try {
      await port.kill(0);
      stats.restarts++;
    } catch {
      // The old worker is already gone.
    }
    // The limit is reported before the new worker is built: constructing a worker blocks the page for about a second in WebKit.
    stats.lastState = "limit";
    deliver({ t: "state", run: runId, state: "limit", at: lastAt, limit: { kind: reason, message: LIMIT_MESSAGE[reason] } });
    try {
      port = open();
      // Calls made meanwhile queue behind the load on the new port; the load's own events are not shown.
      if (again) {
        reloading = true;
        reloaded = port.call({ t: "load", run: runId, ...again }).catch(() => undefined).finally(() => void (reloading = false));
      }
    } catch {
      // The new worker is unusable; the next call on the port fails with its own error.
    }
    await reloaded;
    recovering = false;
  }

  function open(): SimPort {
    const fresh = build();
    fresh.on((ev) => {
      if (ev.run !== runId || reloading) return;
      if (ev.t === "state") {
        stats.lastState = ev.state;
        lastAt = ev.at;
        setRunning(ev.state === "running");
        if (ev.state !== "running") Object.assign(pace, { achievedSpeed: 0, behindReal: false });
      } else if (ev.t === "speed.report") {
        Object.assign(pace, { achievedSpeed: ev.achieved, behindReal: ev.behind });
        watchdog.beat();
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

  function listenFor(fn: (ev: SimEv) => void): () => void {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  }

  const probes: SimHostProbes = {
    async add(spec) {
      const { error } = (await port.call({ t: "probe.add", run: current(), spec })).result as ProbeAddReply;
      if (error) throw new Error(error);
    },
    remove(id) {
      port.call({ t: "probe.remove", run: current(), id }).catch(() => undefined);
    },
    async read(id) {
      return (await port.call({ t: "probe.read", run: current(), id })).result as Reading;
    },
    watch: (id, fn) =>
      listenFor((ev) => {
        if (ev.t === "probe.reading" && ev.id === id) fn(ev.reading);
      }),
    subscribe(id, from, fn) {
      const off = listenFor((ev) => {
        if (ev.t === "probe.chunk" && ev.chunk.id === id) fn(ev.chunk);
      });
      port.call({ t: "probe.sub", run: current(), id, from }).catch(off);
      return off;
    },
  };

  const host: SimHost = {
    async load(net, opts, program) {
      runId++;
      stats.runs++;
      stats.lastState = null;
      Object.assign(pace, { achievedSpeed: 0, behindReal: false });
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
    pause: () => host.control("pause"),
    resume: () => host.control("run"),
    async setSpeed(x) {
      const run = current();
      await port.call({ t: "speed", run, x });
      if (lastLoad) lastLoad = { ...lastLoad, opts: { ...lastLoad.opts, speed: x } };
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
    async staticCheck(net, sources) {
      const mine = ++checkSeq;
      const skipped: StaticCheckResult = { findings: [], skipped: {}, errors: [], note: "check.skipped" };
      if (port.state === "dead") return skipped;
      try {
        const reply = (await port.call({ t: "static-check", net, sources })).result as StaticCheckReply;
        return mine === checkSeq ? reply : skipped;
      } catch {
        return skipped;
      }
    },
    probes,
    async hashes(tNs) {
      const { hb, hd } = (await port.call({ t: "hashes.request", run: current(), tNs })).result as HashesReply;
      return { hb, hd };
    },
    async i2cScan(bus) {
      return (await port.call({ t: "i2c-scan", run: current(), bus })).result as ScannedReply;
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
    get status() {
      return { state: stats.lastState, speed: lastLoad?.opts.speed ?? 0, ...pace };
    },
  };
  return host;
}
