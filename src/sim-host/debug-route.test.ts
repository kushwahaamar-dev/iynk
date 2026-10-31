// @vitest-environment node
import { describe, expect, it } from "vitest";
import { WorkerError } from "@/protocol";
import type { PauseEvent } from "@/sim/debug/breakpoints";
import type { DigitalLayer, Engine, EventSink, McuEngine, PartState, SimNetlist, SimRunOptions } from "@/sim/engine";
import { createSimHandler, type SimEngine } from "./handler";
import type { SimEv, SimReq } from "./protocol";

const NET: SimNetlist = {
  version: 1,
  docHash: "test",
  nets: [{ id: "GND" }],
  ground: "GND",
  parts: [{ id: "u1", descriptor: "uno-r3", params: {}, pins: {}, kind: "board" }],
  settings: { seed: 1, toleranceMode: "nominal", analog: { mode: "dc-event", stepNs: 1000 }, speed: 0 },
};

const OPTS: SimRunOptions = {
  seed: 1,
  speed: 0,
  limits: { statements: Infinity, events: Infinity, outputBytes: Infinity },
  tier: "T1",
  endNs: 2_000_000,
};

const layer: DigitalLayer = {
  load: () => [],
  onPin: () => undefined,
  partStates: (): PartState[] => [],
  stateHash: () => "",
};

/** Runs to the horizon unless a breakpoint at `pauseAt` is armed and not yet passed. */
function stub(pauseAt: number | null) {
  let now = 0;
  let paused: PauseEvent | null = null;
  let armed = pauseAt !== null;
  const calls: string[] = [];
  const engine = {
    id: "u1",
    rank: 0,
    board: "uno-r3",
    language: "arduino-cpp",
    tier: "T1",
    attach: (_sink: EventSink) => undefined,
    load: () => ({ ok: true, diagnostics: [] }),
    reset: () => undefined,
    nextDue: () => now + 1000,
    onEvent: () => undefined,
    stateHash: () => String(now),
    advanceTo(horizon: number) {
      if (paused) return { reached: now, stoppedEarly: true };
      if (armed && pauseAt !== null && horizon >= pauseAt) {
        armed = false;
        now = pauseAt;
        paused = { reason: "breakpoint", file: "main.ino", line: 8, atNs: now, depth: 0 };
        return { reached: now, stoppedEarly: true };
      }
      now = horizon;
      return { reached: now, stoppedEarly: false };
    },
    debug: {
      setBreakpoints: (file: string, lines: number[]) => void calls.push(`bp ${file} ${lines.join(",")}`),
      step: () => {
        calls.push("step");
        paused = null;
      },
      resume: () => {
        calls.push("resume");
        paused = null;
      },
      inspect: () => ({ frame: 0, function: "", file: "", line: 0, locals: [], globals: [] }),
      watch: () => undefined,
      get paused() {
        return paused;
      },
      onPause: () => undefined,
    },
  } as unknown as SimEngine & Engine & McuEngine;
  return { engine, calls, time: () => now };
}

function rig(engine: SimEngine) {
  const tasks: Array<() => void> = [];
  const events: SimEv[] = [];
  let wall = 0;
  const handler = createSimHandler({
    diag: false,
    wallMs: () => (wall += 1),
    schedule: (fn) => void tasks.push(fn),
    makeEngine: () => engine,
    makeDigital: () => layer,
  });
  const send = async (msg: SimReq) => handler(msg, (ev) => events.push(ev));
  const drain = () => {
    for (let task = tasks.shift(); task; task = tasks.shift()) task();
  };
  const states = () => events.filter((e): e is Extract<SimEv, { t: "state" }> => e.t === "state");
  const paused = () =>
    events.flatMap((e) => (e.t === "event" && e.event.kind === "paused" ? [e.event] : []));
  const load = () =>
    send({ t: "load", run: 1, net: NET, opts: OPTS, program: { kind: "source", language: "arduino-cpp", files: [], entry: "main.ino" } });
  const debug = (op: Extract<SimReq, { t: "debug" }>["op"], runtime = "u1", run = 1) => send({ t: "debug", run, runtime, op });
  return { send, drain, states, paused, load, debug };
}

describe("debug routing", () => {
  it("routes set-breakpoints to the engine port", async () => {
    const s = stub(null);
    const r = rig(s.engine);
    await r.load();
    await r.debug({ op: "set-breakpoints", file: "main.ino", lines: [3, 8] });
    expect(s.calls).toEqual(["bp main.ino 3,8"]);
  });

  it("pauses at the breakpoint time and continue runs on", async () => {
    const s = stub(500_000);
    const r = rig(s.engine);
    await r.load();
    await r.send({ t: "control", run: 1, op: "run" });
    r.drain();
    expect(r.paused()).toEqual([
      { kind: "paused", runtime: "u1", reason: "breakpoint", file: "main.ino", line: 8, atNs: 500_000 },
    ]);
    expect(r.states().at(-1)).toMatchObject({ state: "paused", at: 500_000 });
    expect(s.time()).toBe(500_000);

    await r.debug({ op: "continue" });
    r.drain();
    expect(s.calls).toContain("resume");
    expect(s.time()).toBeGreaterThan(500_000);
  });

  it("steps from a pause and ignores a step while running", async () => {
    const s = stub(500_000);
    const r = rig(s.engine);
    await r.load();
    expect(await r.debug({ op: "step", unit: "line" })).toEqual({ state: "idle" });
    await r.send({ t: "control", run: 1, op: "run" });
    r.drain();
    expect(await r.debug({ op: "step", unit: "over" })).toEqual({ state: "running" });
    expect(s.calls).toEqual(["step"]);
  });

  it("answers errors for an unknown runtime, a missing port and ops not built yet", async () => {
    const s = stub(null);
    const r = rig(s.engine);
    await r.load();
    await expect(r.debug({ op: "continue" }, "nope")).rejects.toMatchObject({ kind: "unknown-runtime" });
    await expect(r.debug({ op: "inspect", frame: 0 })).rejects.toMatchObject({ kind: "not-yet" });
    await expect(r.debug({ op: "step", unit: "into" as never })).rejects.toBeInstanceOf(WorkerError);

    const bare = stub(null);
    Object.assign(bare.engine, { debug: undefined });
    const q = rig(bare.engine);
    await q.load();
    await expect(q.debug({ op: "continue" })).rejects.toMatchObject({ kind: "no-debug-port" });
  });

  it("ignores a stale run id", async () => {
    const s = stub(null);
    const r = rig(s.engine);
    await r.load();
    expect(await r.debug({ op: "continue" }, "u1", 7)).toEqual({ ignored: true });
    expect(s.calls).toEqual([]);
  });
});
