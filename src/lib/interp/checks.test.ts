// @vitest-environment node
// Every check kind on a hand-made trace. Pins are recorded by number ("9") and checked by name ("D9").
import { describe, expect, test } from "vitest";
import type { RunTrace } from "@/content/schema";
import { evaluateCheck } from "./checks";

const trace: RunTrace = {
  ms: 2000,
  error: null,
  serial: [
    { t: 10, text: "ready" },
    { t: 900, text: "reaction 231 ms" },
  ],
  pins: {
    "9": [
      { t: 0, v: 0, mode: "out" },
      { t: 500, v: 0.5, mode: "pwm" },
    ],
    "13": [
      { t: 600, v: 1, mode: "out" },
      { t: 820, v: 0, mode: "out" },
    ],
    "3": [{ t: 100, v: 90, mode: "servo" }],
    "8": [{ t: 100, v: 440, mode: "tone" }],
  },
  figure: [{ t: 300, state: { mode: "run" } }],
  inputs: [{ t: 800, input: "btn", value: 1 }],
};
const label = "x";

describe("checks on a trace", () => {
  test("runs, serial and code", () => {
    expect(evaluateCheck({ kind: "runs", minMs: 1500, label }, trace, { source: "", board: "nano" }).ok).toBe(true);
    expect(evaluateCheck({ kind: "runs", minMs: 2500, label }, trace, { source: "", board: "nano" }).ok).toBe(false);
    expect(evaluateCheck({ kind: "serial", match: "^reaction \\d+ ms$", regex: true, minCount: 1, label }, trace, { source: "", board: "nano" }).ok).toBe(true);
    expect(evaluateCheck({ kind: "serial", match: "reaction", regex: false, minCount: 1, byMs: 500, label }, trace, { source: "", board: "nano" }).ok).toBe(false);
    const code = "#include <Servo.h>\n// delay(10) in a comment\nvoid loop() { if (millis() - t > 20) {} }";
    expect(evaluateCheck({ kind: "code", must: ["millis()", "#include"], mustNot: ["delay("], label }, trace, { source: code, board: "nano" }).ok).toBe(true);
    expect(evaluateCheck({ kind: "code", must: [], mustNot: ["millis"], label }, trace, { source: code, board: "nano" }).ok).toBe(false);
  });

  test("pin levels, pwm, servo and tone at a time", () => {
    expect(evaluateCheck({ kind: "pin-level", pin: "D13", level: 1, atMs: 700, label }, trace, { source: "", board: "nano" }).ok).toBe(true);
    expect(evaluateCheck({ kind: "pin-level", pin: "D13", level: 0, atMs: 900, label }, trace, { source: "", board: "nano" }).ok).toBe(true);
    // Before the program drives a pin there is no level to check.
    expect(evaluateCheck({ kind: "pin-level", pin: "D13", level: 0, atMs: 100, label }, trace, { source: "", board: "nano" }).ok).toBe(false);
    expect(evaluateCheck({ kind: "pwm", pin: "D9", duty: [0.45, 0.55], atMs: 1000, label }, trace, { source: "", board: "nano" }).ok).toBe(true);
    expect(evaluateCheck({ kind: "pwm", pin: "D9", duty: [0.45, 0.55], atMs: 400, label }, trace, { source: "", board: "nano" }).ok).toBe(false);
    expect(evaluateCheck({ kind: "servo", pin: "D3", deg: [85, 95], atMs: 1000, label }, trace, { source: "", board: "nano" }).ok).toBe(true);
    expect(evaluateCheck({ kind: "tone", pin: "D8", hz: [430, 450], atMs: 1000, label }, trace, { source: "", board: "nano" }).ok).toBe(true);
  });

  test("responds within a time after a world event, and figure state", () => {
    const after = { t: 800, input: "btn", value: 1 };
    expect(evaluateCheck({ kind: "responds", after, pin: "D13", withinMs: 50, mode: "out", v: [0, 0], label }, trace, { source: "", board: "nano" }).ok).toBe(true);
    expect(evaluateCheck({ kind: "responds", after, pin: "D13", withinMs: 10, mode: "out", v: [0, 0], label }, trace, { source: "", board: "nano" }).ok).toBe(false);
    expect(evaluateCheck({ kind: "state", atMs: 400, equals: { mode: "run" }, label }, trace, { source: "", board: "nano" }).ok).toBe(true);
    expect(evaluateCheck({ kind: "state", atMs: 200, equals: { mode: "run" }, label }, trace, { source: "", board: "nano" }).ok).toBe(false);
  });
});
