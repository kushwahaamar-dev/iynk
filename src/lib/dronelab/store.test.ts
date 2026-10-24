// @vitest-environment node
import { describe, expect, test } from "vitest";
import { quad5Fixture as content } from "./__fixtures__/quad5";
import { armingRules, buildComplete, canArm, droneProgressKeys, stepStatus, testStatus } from "./bench";
import { holds, mergeLog, readPath } from "./figure";
import { benchSummary, createDroneLabStore, figureInitial, initialState, quizScore, reduce } from "./store";

const built = {
  fitted: 4,
  total: 4,
  placed: { FRAME: 0, XT60: 0, FC: 0, PROPS: 0 },
  next: null,
  built: true,
  smokeOk: true,
  motorOk: true,
  accOk: true,
  test: null,
  flight: {
    ready: true,
    fcReversed: false,
    propsSwapped: false,
    motorChecked: true,
    accCal: true,
    capFault: false,
    smokeTested: true,
    mistakes: [],
  },
  log: { n: 2, lines: ["-- betaflight --", "battery plugged: 25.2 V"] },
};

describe("figure state", () => {
  test("dot paths and conditions", () => {
    expect(readPath(built, "placed.FC")).toBe(0);
    expect(holds(built, { "placed.FC": 0, smokeOk: true })).toBe(true);
    expect(holds(built, { fault: null })).toBe(true);
    expect(holds({ placed: { FC: 1 } }, { "placed.FC": 0 })).toBe(false);
  });

  test("the log appends only new lines and survives a figure restart", () => {
    let log = mergeLog({ n: 0, lines: [] }, { n: 1, lines: ["a"] });
    log = mergeLog(log, { n: 3, lines: ["a", "b", "c"] });
    expect(log.lines).toEqual(["a", "b", "c"]);
    expect(mergeLog(log, { n: 3, lines: ["a", "b", "c"] })).toBe(log);
    log = mergeLog(log, { n: 1, lines: ["fresh"] });
    expect(log.lines).toEqual(["a", "b", "c", "fresh"]);
  });
});

describe("build and tests", () => {
  test("step status follows the reported placement", () => {
    const partial = { placed: { FRAME: 0, XT60: 1 }, next: "FC" };
    expect(content.build.map((s) => stepStatus(s, partial))).toEqual(["done", "flipped", "next", "todo"]);
    expect(buildComplete(content, partial)).toBe(false);
    expect(buildComplete(content, built)).toBe(true);
  });

  test("a test passes only when the learner ran it", () => {
    const smoke = content.tests[0];
    expect(testStatus(smoke, built, false)).toBe("idle");
    expect(testStatus(smoke, built, true)).toBe("passed");
    expect(testStatus(smoke, { ...built, smokeOk: false }, true)).toBe("failed");
    expect(testStatus(smoke, { ...built, test: "smoke" }, true)).toBe("running");
  });

  test("progress keys match the dashboard's", () => {
    expect(droneProgressKeys(content)).toEqual([
      "drone:quad5:build",
      "drone:quad5:test:smoke",
      "drone:quad5:test:motors",
      "drone:quad5:test:acc",
      "drone:quad5:quiz:safety",
      "drone:quad5:course:gates",
    ]);
  });
});

describe("arming rules", () => {
  test("the factory build arms", () => {
    expect(canArm(armingRules(null))).toBe(true);
  });

  test("an uncalibrated accelerometer blocks arming; a reversed FC only warns", () => {
    const flight = { ...built.flight, ready: false, accCal: false, fcReversed: true, mistakes: ["fc-reversed", "gps-reversed"] };
    const rules = armingRules({ built: true, flight });
    expect(canArm(rules)).toBe(false);
    expect(rules.find((r) => r.id === "acc")).toMatchObject({ ok: false, level: "block" });
    expect(rules.find((r) => r.id === "fcArrow")).toMatchObject({ ok: false, level: "warn" });
    expect(rules.filter((r) => r.id === "mistakes").map((r) => r.code)).toEqual(["gps-reversed"]);
  });
});

describe("store", () => {
  test("a design pick updates the state and sends the design and the calculator numbers", () => {
    const s0 = initialState(content);
    const step = reduce(content, s0, { type: "design/pick", key: "batt", value: "4s1500" });
    expect(step.state.pick.batt).toBe("4s1500");
    expect(step.send).toHaveLength(1);
    const sent = step.send[0];
    expect(sent.type).toBe("set");
    if (sent.type === "set") {
      expect(sent.state.design).toEqual({ batt: "4s1500", motor: "2306-1750", prop: "5x4.3x3" });
      expect((sent.state.calc as { V: number }).V).toBeCloseTo(14.8);
    }
    expect(reduce(content, s0, { type: "design/pick", key: "batt", value: "nope" }).state).toBe(s0);
  });

  test("engine tests run through set {run} and count once the figure reports them running", () => {
    const step = reduce(content, initialState(content), { type: "test/run", test: "acc" });
    expect(step.send).toEqual([{ type: "set", state: { run: "calibrate" } }]);
    expect(step.state.attempted.acc).toBeUndefined();
    const running = reduce(content, step.state, { type: "figure/state", state: { ...built, test: "calibrate" } }).state;
    expect(running.attempted.acc).toBe(true);
  });

  test("a test the figure reports running counts as attempted", () => {
    const s = reduce(content, initialState(content), { type: "figure/state", state: { ...built, test: "motors" } }).state;
    expect(s.attempted.motors).toBe(true);
    expect(s.log.lines).toEqual(built.log.lines);
  });

  test("CLI effects for the flight stay on the host; the figure only gets fields it accepts", () => {
    let s = initialState(content);
    s = reduce(content, s, { type: "cli/run", line: "set align_board_yaw = 180" }).state;
    const step = reduce(content, s, { type: "cli/run", line: "save" });
    expect(step.send).toEqual([]);
    expect(step.state.cli.flight).toEqual({ boardYaw: 180 });
    expect(step.state.cli.history).toEqual(["set align_board_yaw = 180", "save"]);
    expect(benchSummary(step.state).cli).toEqual({ boardYaw: 180 });
  });

  test("quiz: first picks score, a right answer ends the question", () => {
    let s = initialState(content);
    s = reduce(content, s, { type: "quiz/answer", quiz: "safety", question: "props", option: 0 }).state;
    s = reduce(content, s, { type: "quiz/answer", quiz: "safety", question: "props", option: 1 }).state;
    s = reduce(content, s, { type: "quiz/answer", quiz: "safety", question: "props", option: 0 }).state;
    s = reduce(content, s, { type: "quiz/answer", quiz: "safety", question: "smoke", option: 0 }).state;
    expect(s.quiz.safety).toEqual({ props: [0, 1], smoke: [0] });
    expect(quizScore(content, s, "safety")).toEqual({ score: 1, total: 2, finished: true });
  });

  test("the store sends commands to the connected sink and notifies subscribers", () => {
    const store = createDroneLabStore(content);
    const sent: unknown[] = [];
    let notified = 0;
    store.subscribe(() => notified++);
    const disconnect = store.connect((c) => sent.push(c));
    store.dispatch({ type: "sheet", sheet: "wiring" });
    store.dispatch({ type: "bench/run", run: "build" });
    disconnect();
    store.dispatch({ type: "bench/run", run: "strip" });
    expect(sent).toEqual([
      { type: "set", state: { sheet: "wiring" } },
      { type: "set", state: { run: "build" } },
    ]);
    expect(notified).toBe(1);
    expect(figureInitial(content, store.getState())).toMatchObject({ sheet: "wiring", design: content.design.default });
  });
});
