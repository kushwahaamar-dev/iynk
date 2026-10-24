// @vitest-environment node
import { describe, expect, test } from "vitest";
import { ROBOTICS_IDS } from "@/content/ids";
import type { StatusField } from "@/content/schema";
import { fixtureBench as bench, fixtureTexts } from "./__fixtures__/bench";
import { BENCH_MONTH, benchesByMonth, benchKeys, boardProduct, nextBench, prevBench, terminalKind } from "./catalog";
import { currentDraw, currentReading } from "./current";
import { quizAfter, quizUnlocked, scoreQuiz } from "./quiz";
import { readStatus } from "./status";
import { benchTextKeys, renderCode, resolveBenchTexts } from "./text";

const field = (key: string, format: StatusField["format"]): StatusField => ({ id: key, key, format, label: "x" });

describe("current draw", () => {
  test("sums the loads whose condition holds", () => {
    const draw = currentDraw(bench.current, { status: "running", mode: "r220" });
    expect(draw.supplies[0].ma).toBe(13.6);
    expect(draw.supplies[0].loads.map((l) => l.id)).toEqual(["led"]);
    expect(draw.over).toBe(false);
    expect(draw.supplies[0].headroomMa).toBe(486.4);
  });

  test("per-unit loads scale with the state value", () => {
    const draw = currentDraw(bench.current, { status: "off", out: { PWM: 0.5 } });
    expect(draw.totalMa).toBe(50);
  });

  test("an active fault adds its extra current and can exceed the limit", () => {
    const draw = currentDraw(bench.current, { status: "running", mode: "r1k" }, [bench.faults[1]]);
    expect(draw.supplies[0].ma).toBe(903);
    expect(draw.supplies[0].over).toBe(true);
    expect(draw.supplies[0].headroomMa).toBe(-403);
    expect(currentReading(draw, "currentMa")).toBe(903);
    expect(currentReading(draw, "currentMa.usbc")).toBe(903);
    expect(currentReading(draw, "rails.5V")).toBeUndefined();
  });
});

describe("status fields", () => {
  const draw = currentDraw(bench.current, { status: "running", mode: "r220" });
  test("formats each kind of reading", () => {
    const state = { status: "running", leds: { D1: 1 }, rails: { "5V": 4.987 }, duty: 0.25, name: "r220" };
    expect(readStatus(field("status", "running"), state, draw)).toEqual({ kind: "running", running: true });
    expect(readStatus(field("leds.D1", "on-off"), state, draw)).toEqual({ kind: "on-off", on: true });
    expect(readStatus(field("leds.D1", "high-low"), state, draw)).toEqual({ kind: "high-low", high: true });
    expect(readStatus(field("rails.5V", "volts"), state, draw)).toEqual({ kind: "number", value: 4.99, unit: "volts" });
    expect(readStatus(field("duty", "percent"), state, draw)).toEqual({ kind: "number", value: 25, unit: "percent" });
    expect(readStatus(field("currentMa", "ma"), state, draw)).toEqual({ kind: "number", value: 13.6, unit: "ma" });
    expect(readStatus(field("name", "text"), state, draw)).toEqual({ kind: "text", text: "r220" });
    expect(readStatus(field("missing", "volts"), state, draw)).toEqual({ kind: "none" });
  });
});

describe("quizzes", () => {
  test("a quiz unlocks after its step, the end quiz after every step", () => {
    const [afterSolder, final] = bench.quizzes;
    expect(quizUnlocked(afterSolder, bench.steps, (id) => id === "solder")).toBe(true);
    expect(quizUnlocked(afterSolder, bench.steps, () => false)).toBe(false);
    expect(quizUnlocked(final, bench.steps, (id) => id !== "flip-led")).toBe(false);
    expect(quizUnlocked(final, bench.steps, () => true)).toBe(true);
    expect(quizAfter(bench.quizzes, "solder")?.id).toBe("after-solder");
  });

  test("scores the answers", () => {
    expect(scoreQuiz(bench.quizzes[0], { q1: 1, q2: 1 })).toEqual({ score: 1, total: 2 });
  });
});

describe("text", () => {
  test("collects every key once, including code comment tokens", () => {
    const keys = benchTextKeys(bench);
    expect(keys).toContain("modes.math");
    expect(keys).toContain("tasks.blink-led.code.setup");
    expect(keys).toContain("quizzes.final.q1.why");
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("the fixture has text for every key it uses", () => {
    expect(benchTextKeys(bench).filter((key) => !(key in fixtureTexts))).toEqual([]);
  });

  test("resolves keys from a nested tree and reports the missing ones", () => {
    const { texts, missing } = resolveBenchTexts(bench, { title: "LED + resistor", modes: { math: "Ohm's law" } });
    expect(texts.title).toBe("LED + resistor");
    expect(missing).toContain("overview");
    expect(renderCode("# {{t:modes.math}}\n{{p:x}}", texts)).toBe("# Ohm's law\n{{p:x}}");
  });
});

describe("catalog", () => {
  test("every bench sits in one month, in figure order", () => {
    expect(Object.keys(BENCH_MONTH).sort()).toEqual([...ROBOTICS_IDS].sort());
    expect(benchesByMonth().flatMap((m) => m.ids)).toEqual([...ROBOTICS_IDS]);
  });

  test("names the controller on the mat", () => {
    expect(boardProduct("tb6612fng")).toBe("Arduino Nano");
    expect(boardProduct("pi5-ros2")).toBe("Raspberry Pi 5");
    expect(boardProduct("lm2596")).toBeNull();
    expect(terminalKind({ board: null })).toBe("notes");
    expect(terminalKind({ board: "pi4-pi5" })).toBe("terminal");
  });

  test("walks the benches and lists one bench's progress keys", () => {
    expect(nextBench("uno-r3-build")).toBe("led-resistor");
    expect(nextBench("pi5-ros2")).toBeNull();
    expect(prevBench("uno-r3-build")).toBeNull();
    expect(benchKeys(bench)).toEqual({
      steps: bench.steps.map((s) => `robotics:led-resistor:step:${s.id}`),
      tasks: ["robotics:led-resistor:task:blink-led"],
      quizzes: ["robotics:led-resistor:quiz:after-solder", "robotics:led-resistor:quiz:final"],
    });
  });
});
