// @vitest-environment node
import { describe, expect, test } from "vitest";
import { initialState as boardInitial, reducer as boardReducer, type BoardLabState } from "@/lib/boardlab/store";
import { quad5Fixture as quad5 } from "@/lib/dronelab/__fixtures__/quad5";
import { initialState as droneInitial, reduce as droneReduce, type DroneLabState } from "@/lib/dronelab/store";
import { fixtureBench as bench } from "@/lib/robotics/__fixtures__/bench";
import { createBenchStore, type BenchState } from "@/lib/robotics/store";
import { benchMoments } from "./bench-moments";
import { boardMoments, droneMoments, heldTones, type Moment } from "./moments";

describe("board moments", () => {
  const lesson = () =>
    boardInitial({ board: "uno-r3", lesson: "blink", language: "arduino-cpp", template: "void loop() {}\n", params: [], inputs: {}, view: "board" });
  const walk = (s: BoardLabState, ...actions: Parameters<typeof boardReducer>[1][]) => {
    const out: Moment[] = [];
    for (const action of actions) {
      const next = boardReducer(s, action);
      out.push(...boardMoments(s, next));
      s = next;
    }
    return out;
  };

  test("a check run is an attempt, then a pass or a fail", () => {
    const key = "board:uno-r3:lesson:blink";
    expect(walk(lesson(), { type: "checks/start" }, { type: "checks/result", results: [{ ok: true }, { ok: true }] })).toEqual([
      { kind: "attempt", key },
      { kind: "pass", key },
    ]);
    expect(walk(lesson(), { type: "checks/start" }, { type: "checks/result", results: [{ ok: true }, { ok: false }] })).toEqual([
      { kind: "attempt", key },
      { kind: "fail", key },
    ]);
  });

  test("an assembly step and a fault count; clearing a fault or changing the view doesn't", () => {
    const overview = boardInitial({ board: "uno-r3", lesson: null, language: "arduino-cpp", view: "board" });
    expect(
      walk(overview, { type: "assembly/done", id: "usb" }, { type: "fault/trigger", id: "short-5v" }, { type: "fault/clear" }, { type: "view/set", view: "power" }),
    ).toEqual([{ kind: "step", key: null }, { kind: "fault", code: "short-5v" }]);
  });
});

describe("held tones", () => {
  const running = () => {
    let s = boardInitial({ board: "uno-r3", lesson: "sound", language: "arduino-cpp", template: "void loop() {}\n", params: [], inputs: {}, view: "breadboard" });
    s = boardReducer(s, { type: "run/start" });
    s = boardReducer(s, { type: "run/phase", id: s.run.id, status: "running" });
    return boardReducer(s, { type: "run/tick", id: s.run.id, vt: 5, pins: { D8: { mode: "output", value: 1, pwm: false, hz: 262 } } });
  };
  const figure = (s: BoardLabState, state: Record<string, unknown>) => boardReducer(s, { type: "figure/state", state });

  test("a figure that solves its circuit is what sounds, at its loudness", () => {
    expect([...heldTones(figure(running(), { sound: { part: "BZ1", hz: 262, loud: 0.4, how: "tone" } }))]).toEqual([["part:BZ1", { hz: 262, loud: 0.4 }]]);
    // The buzzer is on another pin, or in backwards: the figure hears nothing, so nothing plays.
    expect(heldTones(figure(running(), { sound: null })).size).toBe(0);
  });

  test("a figure without the solver gets every tone() pitch; a stopped sketch holds none", () => {
    expect([...heldTones(figure(running(), { status: "running" }))]).toEqual([["pin:D8", { hz: 262, loud: 1 }]]);
    expect(heldTones(boardReducer(running(), { type: "run/stop" })).size).toBe(0);
  });
});

describe("bench moments", () => {
  const setup = { bench, starters: { "blink-led": "void setup() {}\nvoid loop() {}" }, solutions: { "blink-led": bench.tasks[0].solution }, texts: {} };

  test("steps done, a refused step and a fault appearing", () => {
    const store = createBenchStore(setup);
    store.connect({ run: () => {} });
    const out: Moment[] = [];
    let prev: BenchState = store.getState();
    store.subscribe(() => {
      out.push(...benchMoments(bench, prev, store.getState()));
      prev = store.getState();
    });
    store.dispatch({ type: "step/do", step: "place" });
    store.dispatch({ type: "figure/state", state: { build: "bare", status: "off" } });
    store.dispatch({ type: "figure/state", state: { build: "tht", status: "off" } });
    store.dispatch({ type: "figure/state", state: { build: "tht", status: "off", fault: "reversed:D1" } });
    expect(out).toEqual([
      { kind: "refused" },
      { kind: "step", key: "robotics:led-resistor:step:strip" },
      { kind: "step", key: "robotics:led-resistor:step:place" },
      { kind: "fault", code: "led-backwards" },
    ]);
  });

  test("a task run is an attempt, then a pass or a fail", () => {
    const store = createBenchStore(setup);
    store.connect({ run: () => {} });
    const states: BenchState[] = [store.getState()];
    store.subscribe(() => states.push(store.getState()));
    store.dispatch({ type: "task/run", task: "blink-led" });
    store.dispatch({ type: "task/result", task: "blink-led", result: { status: "ok", checks: [{ pass: true }], serial: [], ms: 10 } });
    store.dispatch({ type: "task/run", task: "blink-led" });
    store.dispatch({ type: "task/result", task: "blink-led", result: { status: "error", line: 1, message: "x", serial: [] } });
    const out = states.slice(1).flatMap((s, i) => benchMoments(bench, states[i], s));
    const key = "robotics:led-resistor:task:blink-led";
    expect(out).toEqual([
      { kind: "attempt", key },
      { kind: "pass", key },
      { kind: "attempt", key },
      { kind: "fail", key },
    ]);
  });
});

describe("drone moments", () => {
  const walk = (s: DroneLabState, ...states: Record<string, unknown>[]) => {
    const out: Moment[] = [];
    for (const state of states) {
      const next = droneReduce(quad5, s, { type: "figure/state", state }).state;
      out.push(...droneMoments(quad5, s, next));
      s = next;
    }
    return out;
  };

  test("an engine test the figure ran: attempt, then its result", () => {
    const key = "drone:quad5:test:smoke";
    expect(walk(droneInitial(quad5), { test: "smoke" }, { test: null, smokeOk: true })).toEqual([
      { kind: "attempt", key },
      { kind: "pass", key },
    ]);
    expect(walk(droneInitial(quad5), { test: "smoke" }, { test: null, smokeOk: false })).toEqual([
      { kind: "attempt", key },
      { kind: "fail", key },
    ]);
  });

  test("the build finishing, and a fault, each count once", () => {
    const all = { FRAME: 0, XT60: 0, FC: 0, PROPS: 0 };
    expect(walk(droneInitial(quad5), { placed: { FRAME: 0 } }, { placed: all }, { placed: all, fault: "XT60" }, { placed: all, fault: "XT60" })).toEqual([
      { kind: "step", key: "drone:quad5:build" },
      { kind: "fault", code: "XT60" },
    ]);
  });
});
