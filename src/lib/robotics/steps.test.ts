// @vitest-environment node
import { describe, expect, test } from "vitest";
import { fixtureBench as bench } from "./__fixtures__/bench";
import { condHolds, valueAt } from "./state";
import { activeFaults, advanceSteps, canStart, currentStepIndex, emptySession, engineFaultId, faultPresent } from "./steps";

const [backwards, bypass] = bench.faults;

describe("state paths", () => {
  test("reads dot paths and flat keys", () => {
    const state = { rails: { "5V": 4.9 }, "controls.SW1": 1, meas: { D1: { i_mA: 13.6 } } };
    expect(valueAt(state, "rails.5V")).toBe(4.9);
    expect(valueAt(state, "controls.SW1")).toBe(1);
    expect(valueAt(state, "meas.D1.i_mA")).toBe(13.6);
    expect(valueAt(state, "meas.R1.i_mA")).toBeUndefined();
  });

  test("conditions need every path to match, null matches a missing value", () => {
    expect(condHolds({ build: "bare", power: null }, { build: "bare" })).toBe(true);
    expect(condHolds({ build: "bare", power: null }, { build: "bare", power: "usb" })).toBe(false);
    expect(condHolds({}, { build: "bare" })).toBe(false);
  });
});

describe("faults", () => {
  test("the engine id comes from the fault's bridge command", () => {
    expect(engineFaultId(backwards)).toBe("reversed:D1");
    expect(engineFaultId(bypass)).toBe("bypass");
  });

  test("a fault shows in state.fault or state.faults", () => {
    expect(faultPresent(backwards, { fault: { id: "reversed:D1", kind: "dark" } })).toBe(true);
    expect(faultPresent(backwards, { fault: null, faults: ["reversed:D1"] })).toBe(true);
    expect(faultPresent(backwards, { fault: null, faults: [] })).toBe(false);
    expect(activeFaults(bench.faults, { faults: ["bypass"] }).map((f) => f.id)).toEqual(["bypass"]);
  });
});

describe("step order", () => {
  test("steps complete in order and a report can finish several", () => {
    let session = emptySession(bench.steps);
    // Already assembled at load: nothing counts until the board is stripped.
    let moved = advanceSteps(bench.steps, bench.faults, session, { build: "assembled", status: "running" });
    expect(moved.completed).toEqual([]);

    moved = advanceSteps(bench.steps, bench.faults, session, { build: "bare", status: "off" });
    expect(moved.completed).toEqual(["strip"]);
    session = moved.session;
    expect(currentStepIndex(bench.steps, session)).toBe(1);

    moved = advanceSteps(bench.steps, bench.faults, session, { build: "tht", status: "off" });
    session = moved.session;
    moved = advanceSteps(bench.steps, bench.faults, session, { build: "assembled", status: "running" });
    expect(moved.completed).toEqual(["solder", "plug"]);
  });

  test("a break step needs the fault seen, then cleared, then its done state", () => {
    let session = Object.fromEntries(bench.steps.map((s) => [s.id, { done: s.id !== "flip-led", seen: false }]));
    let moved = advanceSteps(bench.steps, bench.faults, session, { status: "running", fault: null });
    expect(moved.completed).toEqual([]);

    moved = advanceSteps(bench.steps, bench.faults, session, { status: "running", fault: { id: "reversed:D1" } });
    expect(moved.seen).toEqual(["flip-led"]);
    session = moved.session;

    moved = advanceSteps(bench.steps, bench.faults, session, { status: "off", fault: null });
    expect(moved.completed).toEqual([]);
    moved = advanceSteps(bench.steps, bench.faults, session, { status: "running", fault: null });
    expect(moved.completed).toEqual(["flip-led"]);
  });

  test("a step can start once the steps before it are done", () => {
    const session = emptySession(bench.steps);
    expect(canStart(bench.steps, session, "strip")).toBe(true);
    expect(canStart(bench.steps, session, "place")).toBe(false);
    expect(canStart(bench.steps, { ...session, strip: { done: true, seen: false } }, "place")).toBe(true);
    expect(canStart(bench.steps, session, "nope")).toBe(false);
  });
});
