import { describe, expect, test } from "vitest";
import { initialState as boardInitial, type BoardLabState } from "@/lib/boardlab/store";
import { quad5Fixture } from "@/lib/dronelab/__fixtures__/quad5";
import { initialState as droneInitial } from "@/lib/dronelab/store";
import type { BenchState } from "@/lib/robotics/store";
import { applyChange, describeBench } from "./bench";

function board(): BoardLabState {
  const state = boardInitial({ board: "uno-r3", lesson: "blink", language: "arduino-cpp", template: "void loop() {\n  digitalWrite(12, HIGH)\n}" });
  return {
    ...state,
    fault: "led-reversed",
    run: { status: "stopped", id: 1, error: { kind: "compile", line: 2, col: 25, message: "expected ';'", hint: "end the line with ;" }, vt: 0 },
    serial: { ...state.serial, lines: [{ id: 1, kind: "sys", text: "run.uploaded", t: null, params: { ms: 900 } }, { id: 2, kind: "out", text: "hello", t: 10 }] },
    pins: { "13": { mode: "output", value: 1, pwm: false }, "9": { mode: "output", value: 0.5, pwm: true } },
    checks: { status: "done", results: [{ ok: false, detail: "the LED never lit" }], passed: false },
  };
}

describe("Board Lab adapter", () => {
  test("describes the lesson, errors, pins, serial, fault and checks", () => {
    const text = describeBench("board", "uno-r3", board());
    for (const line of [
      "# board uno-r3",
      "lesson: blink",
      "power: usb",
      "## Active faults\nled-reversed",
      "line 2:25 compile: expected ';' (hint: end the line with ;)",
      "FAIL lesson check 1: the LED never lit",
      "## Code (arduino-cpp)\nvoid loop() {",
      '[lab] run.uploaded {"ms":900}',
      "hello",
      "pin 13 (output): HIGH",
      "pin 9 (output): 50% PWM",
    ]) {
      expect(text).toContain(line);
    }
  });

  test("a code change becomes code/replace; wiring changes are refused with a reason", () => {
    const result = applyChange("board", board(), { kind: "code", reason: "Use pin 13", find: "digitalWrite(12, HIGH)", replace: "digitalWrite(13, HIGH);" });
    expect(result).toEqual({
      ok: true,
      change: {
        actions: [{ type: "code/replace", code: "void loop() {\n  digitalWrite(13, HIGH);\n}" }],
        before: "void loop() {\n  digitalWrite(12, HIGH)\n}",
        after: "void loop() {\n  digitalWrite(13, HIGH);\n}",
      },
    });
    const wire = applyChange("board", board(), { kind: "wire", reason: "r", connect: [{ from: "a", to: "b" }], disconnect: [] });
    expect(wire.ok).toBe(false);
  });
});

function bench(): BenchState {
  return {
    bench: "line-follower",
    figure: { ready: true, state: { fault: "motor-stall", rails: { "5V": 4.9 } } },
    steps: { chassis: { done: true, seen: true }, motors: { done: false, seen: true } },
    mode: { selected: "follow" },
    serial: { lastN: null, nextId: 2, lines: [{ id: 1, text: "left: 512" }] },
    notice: null,
    quiz: { open: null, index: 0, answers: {}, checked: false, result: null },
    tasks: {
      blink: { code: "led.on()", running: false, result: { status: "error", line: 1, message: "NameError: led", serial: [] } },
      steer: { code: "speed = 40\nturn(speed)", running: false, result: { status: "ok", checks: [{ pass: true }, { pass: false, detail: "drifts left" }], serial: [], ms: 900 } },
    },
  } as unknown as BenchState;
}

describe("Robotics Bench adapter", () => {
  test("describes steps, mode, task code, errors, checks and faults", () => {
    const text = describeBench("robotics", "line-follower", bench());
    for (const line of [
      "build steps done: 1/2, next: motors",
      "mode: follow",
      "## Active faults\nmotor-stall",
      "task blink, line 1: NameError: led",
      "PASS task steer check 1",
      "FAIL task steer check 2: drifts left",
      "// task steer\nspeed = 40",
      "left: 512",
    ]) {
      expect(text).toContain(line);
    }
  });

  test("a code change edits the one task it quotes", () => {
    const result = applyChange("robotics", bench(), { kind: "code", reason: "Slower", find: "speed = 40", replace: "speed = 25" });
    expect(result.ok && result.change.actions).toEqual([{ type: "task/edit", task: "steer", code: "speed = 25\nturn(speed)" }]);
    expect(applyChange("robotics", bench(), { kind: "code", reason: "r", find: "", replace: "x" })).toEqual({
      ok: false,
      error: "propose_change: quote code from one task only",
    });
  });
});

describe("Drone Lab adapter", () => {
  const drone = () => ({
    ...droneInitial(quad5Fixture),
    figure: { fitted: 3, total: 9, next: "ESC", placed: { FRAME: 0, FC: 1 }, fault: null, smokeOk: true, flight: { mistakes: ["fc-reversed"] } },
  });

  test("describes the picks, what is fitted, faults and the safety state", () => {
    const state = drone();
    const text = describeBench("drone", "quad5", state);
    expect(text).toContain(`batt: ${state.pick.batt}`);
    expect(text).toContain("FC: fitted reversed");
    expect(text).toContain("## Active faults\nfc-reversed");
    expect(text).toContain("fitted 3/9");
    expect(text).toContain("safety: smoke test passed, motor check not passed yet");
  });

  test("part changes become design picks and bench actions", () => {
    const result = applyChange("drone", drone(), {
      kind: "part",
      reason: "Lighter motor",
      add: [{ part: "ESC" }],
      remove: ["FC"],
      set: [{ id: "motor", prop: "pick", value: "2207-1750" }],
    });
    expect(result.ok && result.change.actions).toEqual([
      { type: "design/pick", key: "motor", value: "2207-1750" },
      { type: "bench/add", id: "ESC", orient: 0 },
      { type: "bench/remove", id: "FC" },
    ]);
    expect(result.ok && result.change.after).toContain("motor: 2207-1750");
    expect(applyChange("drone", drone(), { kind: "part", reason: "r", add: [], remove: [], set: [{ id: "frame", prop: "size", value: 7 }] }).ok).toBe(false);
  });
});
