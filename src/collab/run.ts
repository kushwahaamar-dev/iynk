import type {
  Actor,
  Cmd,
  RunCheck,
  RunEv,
  RunEvUp,
  RunFrame,
  RunReq,
  RunReqUp,
  RunState,
  RunTick,
  classifyOp,
} from "../protocol/index.ts";
import { RUN_LIMITS } from "../protocol/index.ts";
import type { SimTime } from "../sim/core/clock.ts";
import type { InputEntry } from "../sim/engine.ts";
import type { SimHost } from "../sim-host/host.ts";
import { createMirror, type Mirror, type MirrorHost, type MirrorStatus, type MirrorStop } from "./run-mirror.ts";
import { CHECK_NS, createRunner, TICK_NS, type Runner } from "./run-runner.ts";

export type RunDown = RunEv | RunTick | RunCheck | RunFrame | RunReq;
export type RunUp = RunReqUp | RunEvUp | RunTick | RunCheck | RunFrame | Cmd;

export interface RunClientState {
  status: MirrorStatus;
  role: "runner" | "mirror" | "detached";
  run: RunState;
  achievedSpeed: number;
  behindReal: boolean;
  lastCheckAt: SimTime | null;
  lastHb: string | null;
  lastHd: string | null;
  /** The runner's latest frame, kept while this copy has fallen back to frames or is catching up. */
  frame: { tNs: SimTime; frame: unknown } | null;
  /** Engines whose version here differs from the run's: what this browser has and what the run was started with. */
  mismatch: Array<{ engine: string; mine: string | null; run: string }>;
}

export interface RunClient {
  onWelcome(w: { run: RunState | null; log: readonly RunEv[] }): void;
  onFrame(f: RunDown): void;
  request(req: RunReqUp["req"], args?: unknown): void;
  detach(mode: "own" | "frames"): void;
  rejoin(): void;
  /** True when a commit with these ops would halt the run. */
  wouldHalt(ops: ReadonlyArray<{ kind: string; value?: unknown; collection?: unknown }>): boolean;
  subscribe(fn: (s: RunClientState) => void): () => void;
  dispose(): void;
  readonly state: RunClientState;
}

export interface RunClientDeps {
  send(f: RunUp): void;
  host: SimHost;
  self: Actor;
  versions: Record<string, string>;
  classifyOp: typeof classifyOp;
  /** Builds the project at `run.atSeq` and loads it into the host with the run's seed, not started, at speed 0 (as fast as the slices allow). */
  load(run: RunState): Promise<void>;
  /** The room event log; a divergence goes here and nowhere else. */
  logEvent(kind: string, data: Record<string, unknown>): void;
  now?(): number;
}

const ECHO_WAIT_MS = 2000;
const FRAME_GAP_MS = 1000 / RUN_LIMITS.framesPerSec;

const IDLE_RUN: RunState = {
  runId: "",
  state: "idle",
  runner: null,
  atSeq: 0,
  seed: 0,
  speed: 1,
  horizonNs: 0,
  versions: {},
  rseq: 0,
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Lets the mirror and the runner drive the worker, which does the simulating, as if it were a synchronous orchestrator. */
function hostAdapter(host: SimHost) {
  let clock: SimTime = 0;
  let tail: Promise<unknown> = Promise.resolve();
  let hashes = { hb: "", hd: "" };
  const queue = (fn: () => Promise<unknown>) => void (tail = tail.then(fn, fn).catch(() => undefined));
  const driver: MirrorHost = {
    now: () => clock,
    runUntil(t, o) {
      const stop = o?.exclusive ? t - 1 : t;
      if (stop <= clock) return;
      clock = stop;
      queue(() => host.horizon(stop));
    },
    inject: (e: InputEntry) => queue(() => host.applyStamped(e)),
    hashes: () => hashes,
  };
  return {
    driver,
    /** The furthest instant the run may have reached. */
    ceiling: () => clock,
    settled: () => tail,
    async readHashes(tNs: SimTime) {
      await tail;
      hashes = await host.hashes(tNs);
    },
    reset() {
      clock = 0;
      tail = Promise.resolve();
    },
  };
}

export function createRunClient(d: RunClientDeps): RunClient {
  const adapter = hostAdapter(d.host);
  const listeners = new Set<(s: RunClientState) => void>();
  let state: RunClientState = {
    status: "in-sync",
    role: "mirror",
    run: IDLE_RUN,
    achievedSpeed: 0,
    behindReal: false,
    lastCheckAt: null,
    lastHb: null,
    lastHd: null,
    frame: null,
    mismatch: [],
  };
  let mirror: Mirror = createMirror(adapter.driver);
  let runner: Runner | null = null;
  let log: RunEv[] = [];
  let catching = false;
  let framesOn = false;
  let lastFrameAt = -Infinity;
  let generation = 0;
  let loopToken = 0;
  let echoWake: (() => void) | null = null;
  let chain: Promise<void> = Promise.resolve();
  let ids = 0;

  const now = d.now ?? Date.now;
  const nextId = (prefix: string) => `${prefix}-${++ids}`;

  function refresh(patch: Partial<RunClientState> = {}) {
    state = { ...state, ...patch, status: catching && mirror.status() === "in-sync" ? "catching-up" : mirror.status() };
    for (const fn of [...listeners]) fn(state);
  }

  function patchRun(patch: Partial<RunState>) {
    refresh({ run: { ...state.run, ...patch } });
  }

  function sendDetach(mode: "frames" | "sync" | "own") {
    d.send({ t: "cmd", id: nextId("rd"), name: "run.detach", args: { mode } });
  }

  function fallBack(why: MirrorStop, data: Record<string, unknown>) {
    mirror.stop(why);
    sendDetach("frames");
    d.logEvent(`run.${why}`, data);
    refresh();
  }

  function mismatches(run: RunState): RunClientState["mismatch"] {
    return Object.entries(run.versions)
      .filter(([engine, v]) => d.versions[engine] !== v)
      .map(([engine, v]) => ({ engine, mine: d.versions[engine] ?? null, run: v }));
  }

  /** Starts mirroring `run` from tick 0, then replays what the server logged so far. */
  async function begin(run: RunState, replay: readonly RunEv[]) {
    const mine = ++generation;
    loopToken++;
    runner = null;
    mirror = createMirror(adapter.driver);
    adapter.reset();
    log = [];
    catching = replay.length > 0;
    const bad = mismatches(run);
    state = { ...state, run, role: "mirror", lastCheckAt: null, lastHb: null, lastHd: null, frame: null, mismatch: bad };
    if (bad.length > 0) {
      catching = false;
      fallBack("engine-mismatch", { mismatch: bad });
      return;
    }
    refresh();
    if (catching) sendDetach("frames");
    try {
      await d.load(run);
      await d.host.horizon(0);
      await d.host.resume();
    } catch (err) {
      if (mine === generation) fallBack("halted", { error: String(err) });
      return;
    }
    if (mine !== generation) return;
    for (const ev of replay) feed(ev);
    mirror.onTick(run.horizonNs);
    await adapter.settled();
    if (mine !== generation || !catching) return;
    catching = false;
    sendDetach("sync");
    refresh();
  }

  function feed(ev: RunEv) {
    log.push(ev);
    mirror.onEv(ev);
  }

  function endRun(next: RunState["state"], patch: Partial<RunState> = {}) {
    loopToken++;
    patchRun({ state: next, ...patch });
  }

  async function reset() {
    generation++;
    loopToken++;
    runner = null;
    mirror = createMirror(adapter.driver);
    adapter.reset();
    log = [];
    try {
      await d.host.control("stop");
    } catch {
      // Nothing was loaded, so there is nothing to stop.
    }
    refresh({ role: "mirror", frame: null });
  }

  async function runControl(ev: RunEv) {
    const v = isRecord(ev.value) ? ev.value : {};
    switch (ev.target) {
      case "start":
        return begin(
          {
            ...IDLE_RUN,
            runId: `${ev.rseq}-${ev.tNs}`,
            state: "running",
            atSeq: v.atSeq as number,
            seed: v.seed as number,
            speed: v.speed as number,
            versions: v.versions as Record<string, string>,
          },
          [],
        );
        return;
      case "pause":
        return endRun("paused");
      case "resume":
        return patchRun({ state: "running" });
      case "speed":
        return patchRun({ speed: v.x as number });
      case "halt":
        return endRun("halted", { haltReason: v.reason as RunState["haltReason"] });
      case "stop":
      case "reset":
        endRun("idle");
        return reset();
    }
  }

  async function onEv(ev: RunEv) {
    if (runner?.acknowledge(ev.tNs)) echoWake?.();
    if (ev.kind === "control") await runControl(ev);
    feed(ev);
  }

  /** The server's tick or check is from another runner when it is beyond everything this one has published. */
  function foreign(tNs: SimTime): boolean {
    if (!runner || tNs <= runner.lastPublished()) return false;
    loopToken++;
    runner = null;
    d.host.setSpeed(0).catch(() => undefined);
    refresh({ role: "mirror" });
    return true;
  }

  async function onCheck(c: RunCheck) {
    if (runner && !foreign(c.tNs)) return;
    if (mirror.status() !== "in-sync") return;
    try {
      await adapter.readHashes(c.tNs);
    } catch {
      return;
    }
    const verdict = mirror.onCheck(c);
    refresh({ lastCheckAt: c.tNs, lastHb: c.hb, lastHd: c.hd });
    if (mirror.status() === "diverged") {
      fallBack("diverged", { tNs: c.tNs, hb: c.hb, hd: c.hd, equalB: verdict?.equalB, equalD: verdict?.equalD });
    }
  }

  function enqueue(job: () => void | Promise<void>) {
    chain = chain.then(job).catch(() => undefined);
  }

  function waitEcho(): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(done, ECHO_WAIT_MS);
      function done() {
        clearTimeout(timer);
        echoWake = null;
        resolve();
      }
      echoWake = done;
    });
  }

  /** Publishes one tick-sized slice after another while the run is running, and stops when its token is replaced. */
  async function loop(mine: number) {
    if (!runner) return;
    const token = ++loopToken;
    const live = () => token === loopToken && mine === generation;
    while (live() && state.run.state === "running") {
      while (runner.inflight() > 0 && live()) await waitEcho();
      if (live()) await slice(runner, token);
    }
  }

  async function slice(r: Runner, token: number) {
    const to = r.lastPublished() + TICK_NS;
    mirror.onTick(to);
    await adapter.settled();
    if (token !== loopToken) return;
    if (to % CHECK_NS === 0) await adapter.readHashes(to).catch(() => undefined);
    for (const f of r.afterSlice(to)) d.send(f);
  }

  /** The first request this browser gets as runner makes it the runner. */
  async function takeOver() {
    if (runner) return;
    runner = createRunner(adapter.driver, mirror.horizon());
    refresh({ role: "runner" });
    await d.host.setSpeed(state.run.speed).catch(() => undefined);
  }

  async function onReq(f: RunReq) {
    if (f.req === "frames") {
      framesOn = isRecord(f.args) && f.args.on === true;
      return;
    }
    await takeOver();
    const mine = generation;
    const r = runner as Runner;
    const a = isRecord(f.args) ? f.args : {};
    switch (f.req) {
      case "input": {
        const ev = r.stamp(f, adapter.ceiling());
        if (ev) d.send(ev);
        return;
      }
      case "speed":
        await d.host.setSpeed(a.x as number).catch(() => undefined);
        return;
      case "step":
        if (a.unit === "ns" && typeof a.n === "number") await stepNs(a.n, mine);
        return;
      case "start":
      case "resume":
        void loop(mine);
    }
  }

  async function stepNs(n: number, mine: number) {
    const r = runner;
    if (!r) return;
    const token = ++loopToken;
    const to = r.lastPublished() + Math.ceil(n / TICK_NS) * TICK_NS;
    while (token === loopToken && mine === generation && r.lastPublished() < to) await slice(r, token);
  }

  function onFrameData(f: RunFrame) {
    refresh({ frame: { tNs: f.tNs, frame: f.frame } });
  }

  const offHost = d.host.onEvent((e) => {
    if (e.t === "speed.report") refresh({ achievedSpeed: e.achieved, behindReal: e.behind });
    if (e.t === "frame" && runner && framesOn && now() - lastFrameAt >= FRAME_GAP_MS) {
      const frame = { pins: e.pins, parts: e.parts, serial: e.serial };
      if (JSON.stringify(frame).length > RUN_LIMITS.frameMaxBytes) return;
      lastFrameAt = now();
      d.send({ t: "run.frame", tNs: e.at, frame });
    }
  });

  return {
    onWelcome(w) {
      enqueue(async () => {
        if (!w.run) {
          if (state.run.state === "idle") return;
          generation++;
          mirror.stop("halted");
          endRun("halted", { haltReason: "server-restarted" });
          return;
        }
        const live = state.run.runId === w.run.runId && mirror.status() === "in-sync";
        if (!live) return begin(w.run, w.log);
        patchRun({ ...w.run });
        for (const ev of w.log) feed(ev);
        mirror.onTick(w.run.horizonNs);
      });
    },
    onFrame(f) {
      enqueue(async () => {
        switch (f.t) {
          case "run.ev":
            return onEv(f);
          case "run.tick":
            if (runner && !foreign(f.tNs)) return;
            mirror.onTick(f.tNs);
            return patchRun({ horizonNs: f.tNs });
          case "run.check":
            return onCheck(f);
          case "run.frame":
            return onFrameData(f);
          case "run.req":
            return onReq(f);
        }
      });
    },
    request(req, args) {
      const f: RunReqUp = { t: "run.req", id: nextId("rq"), req };
      if (args !== undefined) f.args = args;
      d.send(f);
    },
    detach(mode) {
      if (state.role === "runner") return;
      mirror.stop(mode === "own" ? "detached-own" : "frames");
      sendDetach(mode);
      refresh({ role: mode === "own" ? "detached" : "mirror" });
    },
    rejoin() {
      sendDetach("sync");
      enqueue(() => begin(state.run, log));
    },
    wouldHalt: (ops) => ops.some((op) => d.classifyOp(op) === "sim-affecting"),
    subscribe(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    dispose() {
      offHost();
      generation++;
      loopToken++;
      listeners.clear();
    },
    get state() {
      return state;
    },
  };
}
