import { describe, expect, it } from "vitest";
import { type ServoParams, type ServoState, stepServo, targetAngleDeg } from "./servo.ts";

const sg90: ServoParams = {
  stallTorqueNm: 0.18,
  speedSPer60deg: 0.1,
  pulseMinUs: 500,
  pulseMaxUs: 2500,
  angleRangeDeg: 180,
  deadbandUs: 5,
  iStallA: 0.65,
  iIdleA: 0.01,
};
const H = 0.0005;
const pulseFor = (deg: number) => 500 + (deg / 180) * 2000;

function run(s: ServoState, pulse: number, load: number, seconds: number) {
  let state = s;
  let last = stepServo(sg90, state, pulse, load, H);
  for (let t = 0; t < seconds; t += H) {
    last = stepServo(sg90, state, pulse, load, H);
    state = last.state;
  }
  return { ...last, state };
}

describe("servo", () => {
  it("maps pulse to angle and clamps", () => {
    expect(targetAngleDeg(sg90, 1500)).toBe(90);
    expect(targetAngleDeg(sg90, 400)).toBe(0);
    expect(targetAngleDeg(sg90, 2600)).toBe(180);
  });

  it("covers 60 degrees in speed_s_per_60deg on a free horn", () => {
    let state: ServoState = { angleDeg: 0, lastPulseUs: pulseFor(0) };
    let t = 0;
    while (state.angleDeg < 60 - 1e-9 && t < 1) {
      state = stepServo(sg90, state, pulseFor(60), 0, H).state;
      t += H;
    }
    expect(Math.abs(t - sg90.speedSPer60deg) / sg90.speedSPer60deg).toBeLessThan(0.02);
  });

  it("ignores a pulse inside the deadband", () => {
    const s: ServoState = { angleDeg: 90, lastPulseUs: 1500 };
    const out = stepServo(sg90, s, 1503, 0, H);
    expect(out.state).toEqual(s);
    expect(out.torqueNm).toBe(0);
  });

  it("saturates the torque far from the target and is proportional near it", () => {
    const far = stepServo(sg90, { angleDeg: 0, lastPulseUs: 500 }, 2500, 0, H);
    expect(far.torqueNm).toBe(0.18);
    const near = stepServo(sg90, { angleDeg: 85, lastPulseUs: 1500 }, 1500, 0, H);
    expect(near.torqueNm).toBeCloseTo(0.18 * 0.5, 9);
    const back = stepServo(sg90, { angleDeg: 180, lastPulseUs: 2500 }, 500, 0, H);
    expect(back.torqueNm).toBe(-0.18);
  });

  it("draws idle current at rest and stall current at full torque", () => {
    const rest = run({ angleDeg: 90, lastPulseUs: 1500 }, 1500, 0, 0.01);
    expect(rest.currentA).toBeCloseTo(0.01, 9);
    const stall = stepServo(sg90, { angleDeg: 0, lastPulseUs: 500 }, 2500, 0, H);
    expect(stall.currentA).toBeCloseTo(0.65, 9);
    const half = stepServo(sg90, { angleDeg: 85, lastPulseUs: 1500 }, 1500, 0, H);
    expect(half.currentA).toBeCloseTo(0.01 + 0.64 * 0.5, 9);
  });

  it("holds the last command when the pulse is outside the valid range", () => {
    const s: ServoState = { angleDeg: 90, lastPulseUs: 1500 };
    expect(stepServo(sg90, s, 100, 0, H).state.lastPulseUs).toBe(1500);
    expect(stepServo(sg90, s, 2700, 0, H).state.lastPulseUs).toBe(1500);
    expect(stepServo(sg90, s, 2550, 0, H).state.lastPulseUs).toBe(2550);
  });

  it("stalls against a load bigger than its torque and moves against a smaller one", () => {
    const s: ServoState = { angleDeg: 0, lastPulseUs: 500 };
    expect(stepServo(sg90, s, 2500, -0.3, H).state.angleDeg).toBe(0);
    expect(stepServo(sg90, s, 2500, -0.1, H).state.angleDeg).toBeGreaterThan(0);
  });
});
