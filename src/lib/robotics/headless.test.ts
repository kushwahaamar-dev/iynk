// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { Check, WorldModel } from "@/content/schema";
import { getProfile } from "@/lib/interp";
import { evaluateChecks } from "./checks";
import { pinNumber, runHeadless } from "./headless";
import { interpRunner } from "./runner";

const blink = `void setup() { pinMode(9, OUTPUT); }
void loop() { digitalWrite(9, HIGH); delay(500); digitalWrite(9, LOW); delay(500); }`;
const noWorld: WorldModel = { inputs: [], script: [] };
const toggles: Check = { kind: "pin-toggles", pin: "D9", periodMs: [900, 1100], minCycles: 2, label: "x" };

describe("headless runs", () => {
  test("resolves board pin names", () => {
    const nano = getProfile("nano");
    expect(pinNumber(nano, "D9")).toBe(9);
    expect(pinNumber(nano, "A0")).toBe(14);
    expect(pinNumber(getProfile("esp32-s3-devkitc-1"), "GPIO38")).toBe(38);
  });

  test("a blink sketch toggles its pin once a second", () => {
    const trace = runHeadless({ board: "nano", language: "arduino-cpp", source: blink, world: noWorld, runMs: 3200 });
    expect(trace.error).toBeNull();
    expect(trace.ms).toBe(3200);
    expect(trace.pins["9"].filter((e) => e.v === 1).length).toBeGreaterThanOrEqual(3);
    const resolve = (pin: string) => String(pinNumber(getProfile("nano"), pin));
    expect(evaluateChecks([toggles], trace, blink, resolve)).toEqual([{ pass: true, detail: "3/2" }]);
  });

  test("the same input gives the same trace", () => {
    const a = runHeadless({ board: "nano", language: "arduino-cpp", source: blink, world: noWorld, runMs: 2000 });
    const b = runHeadless({ board: "nano", language: "arduino-cpp", source: blink, world: noWorld, runMs: 2000 });
    expect(a).toEqual(b);
  });

  test("compile errors come back with a line", async () => {
    const result = await interpRunner(
      { board: "nano", language: "arduino-cpp", source: "void setup() {\n  pinMod(9, OUTPUT);\n}\nvoid loop() {}", world: noWorld, runMs: 500 },
      [toggles],
    );
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.line).toBe(2);
  });

  test("serial lines and a button with contact bounce", async () => {
    const source = `const int BTN = 2;
volatile unsigned long pressedAt = 0;
volatile int edges = 0;
void onPress() { edges++; if (pressedAt == 0) pressedAt = millis(); }
void setup() {
  Serial.begin(9600);
  pinMode(BTN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BTN), onPress, FALLING);
  Serial.println("ready");
}
void loop() {
  if (pressedAt != 0) { delay(50); Serial.print("pressed at "); Serial.println(pressedAt); Serial.print("edges "); Serial.println(edges); pressedAt = 1; delay(100000); }
}`;
    const world: WorldModel = {
      inputs: [{ id: "btn", quantity: "button", device: { kind: "button", pull: "internal-up", bounceMs: 8 }, pins: ["D2"], part: "SW1", min: 0, max: 1, step: 1, default: 0, gesture: "press", label: "x" }],
      script: [{ t: 400, input: "btn", value: 1 }],
    };
    const result = await interpRunner({ board: "nano", language: "arduino-cpp", source, world, runMs: 1000 }, [
      { kind: "serial", match: "^pressed at 40\\d$", regex: true, minCount: 1, label: "x" },
      { kind: "serial", match: "ready", regex: false, minCount: 1, byMs: 50, label: "x" },
      { kind: "code", must: ["attachInterrupt", "millis()"], mustNot: ["delay(10)"], label: "x" },
    ]);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.serial[0]).toBe("ready");
    expect(result.checks.map((c) => c.pass)).toEqual([true, true, true]);
    // The bounce gives the interrupt more than one falling edge.
    expect(Number(result.serial.find((l) => l.startsWith("edges "))?.slice(6))).toBeGreaterThan(1);
  });
});
