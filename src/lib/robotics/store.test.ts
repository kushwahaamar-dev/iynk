// @vitest-environment node
import { describe, expect, test } from "vitest";
import { fixtureBench as bench } from "./__fixtures__/bench";
import { createBenchStore, type BenchEffect, type BenchSetup } from "./store";

const setup: BenchSetup = {
  bench,
  starters: { "blink-led": "void setup() {}\nvoid loop() {}" },
  solutions: { "blink-led": bench.tasks[0].solution },
  texts: { "steps.place.refusal": "Strip the board first" },
};

function harness() {
  const store = createBenchStore(setup);
  const effects: BenchEffect[] = [];
  store.connect({ run: (effect) => effects.push(effect) });
  return { store, effects };
}

describe("bench store", () => {
  test("Do it sends the step's bridge command, in order only", () => {
    const { store, effects } = harness();
    store.dispatch({ type: "step/do", step: "place" });
    expect(effects).toEqual([{ kind: "send", command: { type: "flash", text: "Strip the board first", ms: 2600 } }]);
    expect(store.getState().notice?.notice).toEqual({ kind: "out-of-order", step: "place", before: "strip" });

    store.dispatch({ type: "step/do", step: "strip" });
    expect(effects.at(-1)).toEqual({ kind: "send", command: { type: "set", state: { build: "bare" } } });
  });

  test("figure reports complete steps, save progress and announce the quiz", () => {
    const { store, effects } = harness();
    store.dispatch({ type: "figure/state", state: { build: "bare", status: "off" } });
    store.dispatch({ type: "figure/state", state: { build: "tht", status: "off" } });
    store.dispatch({ type: "figure/state", state: { build: "assembled", status: "off" } });
    expect(effects.filter((e) => e.kind === "done").map((e) => (e as { key: string }).key)).toEqual([
      "robotics:led-resistor:step:strip",
      "robotics:led-resistor:step:place",
      "robotics:led-resistor:step:solder",
    ]);
    expect(store.getState().notice?.notice).toEqual({ kind: "quiz-ready", quiz: "after-solder" });
  });

  test("a step done by hand is not sent anywhere", () => {
    const { store, effects } = harness();
    for (const build of ["bare", "tht", "assembled"]) store.dispatch({ type: "figure/state", state: { build, status: "off" } });
    effects.length = 0;
    store.dispatch({ type: "step/do", step: "plug" });
    expect(effects).toEqual([]);
    expect(store.getState().notice?.notice).toEqual({ kind: "by-hand", step: "plug" });
  });

  test("serial lines append once per report number", () => {
    const { store } = harness();
    store.dispatch({ type: "figure/state", state: { serial: { n: 1, line: "-- power on --" } } });
    store.dispatch({ type: "figure/state", state: { serial: { n: 1, line: "-- power on --" } } });
    store.dispatch({ type: "figure/state", state: { serial: { n: 2, line: "I = 3.0 V / 220 = 13.6 mA" } } });
    expect(store.getState().serial.lines.map((l) => l.text)).toEqual(["-- power on --", "I = 3.0 V / 220 = 13.6 mA"]);
    store.dispatch({ type: "serial/clear" });
    expect(store.getState().serial.lines).toEqual([]);
  });

  test("modes: selecting changes the code panel only, running sends set {mode}", () => {
    const { store, effects } = harness();
    store.dispatch({ type: "mode/select", mode: "r1k" });
    expect(effects).toEqual([]);
    expect(store.getState().mode.selected).toBe("r1k");
    store.dispatch({ type: "mode/run", mode: "r220" });
    expect(effects).toEqual([{ kind: "send", command: { type: "set", state: { mode: "r220" } } }]);
    store.dispatch({ type: "mode/run", mode: "nope" });
    expect(effects).toHaveLength(1);
  });

  test("faults trigger through their bridge command and clear with fault: null", () => {
    const { store, effects } = harness();
    store.dispatch({ type: "fault/trigger", fault: "led-backwards" });
    store.dispatch({ type: "fault/clear" });
    expect(effects).toEqual([
      { kind: "send", command: { type: "set", state: { fault: "reversed:D1" } } },
      { kind: "send", command: { type: "set", state: { fault: null } } },
    ]);
  });

  test("quiz flow: choose, check, next, score recorded once", () => {
    const { store, effects } = harness();
    store.dispatch({ type: "quiz/open", quiz: "after-solder" });
    store.dispatch({ type: "quiz/check" });
    expect(store.getState().quiz.checked).toBe(false);
    store.dispatch({ type: "quiz/choose", option: 1 });
    store.dispatch({ type: "quiz/check" });
    store.dispatch({ type: "quiz/choose", option: 0 });
    expect(store.getState().quiz.answers.q1).toBe(1);
    store.dispatch({ type: "quiz/next" });
    store.dispatch({ type: "quiz/choose", option: 1 });
    store.dispatch({ type: "quiz/check" });
    store.dispatch({ type: "quiz/next" });
    expect(store.getState().quiz.result).toEqual({ score: 1, total: 2 });
    expect(effects).toEqual([{ kind: "quiz", key: "robotics:led-resistor:quiz:after-solder", score: 1, total: 2 }]);
    store.dispatch({ type: "quiz/close" });
    expect(store.getState().quiz.open).toBeNull();
  });

  test("tasks: edit, run, result, done only when every check passes", () => {
    const { store, effects } = harness();
    store.dispatch({ type: "task/edit", task: "blink-led", code: "void setup(){}" });
    store.dispatch({ type: "task/run", task: "blink-led" });
    store.dispatch({ type: "task/run", task: "blink-led" });
    expect(effects).toEqual([{ kind: "run", task: "blink-led", source: "void setup(){}" }]);
    store.dispatch({ type: "task/result", task: "blink-led", result: { status: "ok", checks: [{ pass: false }], serial: [], ms: 3000 } });
    expect(effects).toHaveLength(1);
    store.dispatch({ type: "task/solution", task: "blink-led" });
    expect(store.getState().tasks["blink-led"].code).toBe(bench.tasks[0].solution);
    store.dispatch({ type: "task/run", task: "blink-led" });
    store.dispatch({ type: "task/result", task: "blink-led", result: { status: "ok", checks: [{ pass: true }], serial: [], ms: 3000 } });
    expect(effects.at(-1)).toEqual({ kind: "done", key: "robotics:led-resistor:task:blink-led" });
    store.dispatch({ type: "task/reset", task: "blink-led" });
    expect(store.getState().tasks["blink-led"]).toEqual({ code: setup.starters["blink-led"], running: false, result: null });
  });

  test("state stays serializable", () => {
    const { store } = harness();
    store.dispatch({ type: "figure/state", state: { build: "bare", serial: { n: 1, line: "x" } } });
    expect(JSON.parse(JSON.stringify(store.getState()))).toEqual(store.getState());
  });
});
