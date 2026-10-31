import { describe, expect, it } from "vitest";
import type { DriverParams, PinSample } from "./driver.ts";
import type { GearParams } from "./gearbox.ts";
import { outputTorque } from "./gearbox.ts";
import { H_S, chooseMode, couplingCheck, createMotorChannel } from "./coupling.ts";
import { stepMotor, type MotorParams } from "./motor.ts";

const reference: MotorParams = { rOhm: 0.375, lHenry: 1e-3, keVsPerRad: 0.06, jKgM2: 1e-3, bNmsPerRad: 0, iNoLoadA: 0 };
const gear: GearParams = { ratio: 30, efficiency: 0.8, backdrivable: true, jOutKgM2: 0 };
const driver: DriverParams = { kind: "h-bridge", decay: "slow", vdropV: 0.5, iMaxA: 1.2, pwmMaxHz: 100000, truth: "tb6612" };

describe("couplingCheck", () => {
  it("gives h*c of 0.04 for the reference motor", () => {
    const r = couplingCheck(reference, H_S, "M1");
    expect(r.ok).toBe(true);
    expect(r.report.c).toBeCloseTo(9.6, 9);
    expect(r.report.hc).toBeCloseTo(0.04, 9);
  });

  it("refuses a tiny-inertia motor with c, h*c and the step", () => {
    const r = couplingCheck({ ...reference, jKgM2: 8e-6 }, H_S, "M2");
    expect(r).toMatchObject({ ok: false, code: "RB-E-COUPLING" });
    expect(r.report.hc).toBeGreaterThanOrEqual(1);
    expect(r.report.hc).toBeCloseTo(H_S * r.report.c, 12);
  });

  it("still computes h*c when L is unknown", () => {
    const r = couplingCheck({ ...reference, lHenry: 0 }, H_S);
    expect(r.report.hc).toBeCloseTo(0.04, 9);
    expect(r.report.mode).toBe("algebraic");
  });
});

describe("chooseMode", () => {
  it.each([
    [0, "pwm", "algebraic"],
    [1e-3, "pwm", "cycle"],
    [0.01, "dc", "cycle"],
    [1e-3, "dc", "algebraic"],
    [1e-6, "pwm", "cycle"],
  ] as const)("L=%s on %s drive is %s", (lHenry, waveform, expected) => {
    expect(chooseMode({ ...reference, lHenry }, H_S, waveform)).toBe(expected);
  });
});

describe("motor channel", () => {
  const pins: PinSample = { in1: 1, in2: 0, pwm: { duty: 0.5, hz: 490 }, stby: 1 };

  it("gives the joint torque of the motor step at half duty", () => {
    const ch = createMotorChannel({ motor: reference, gear, driver, id: "M1", joint: "wheel-l" });
    const out = ch.begin(2, 7.4, pins, H_S);
    const step = stepMotor(reference, { iA: 0 }, gear.ratio * 2, { vTerminal: 6.9, duty: 0.5, hz: 490, decay: "slow", phaseNs: 0 }, H_S);
    expect(out.torqueJointNm).toBeCloseTo(outputTorque(gear, step.torqueShaftNm, 2), 12);
    expect(out.supplyA).toBeCloseTo(step.supplyAvgA, 12);
    expect(ch.state().iArmA).toBeCloseTo(step.iEndA, 12);
  });

  it("draws nothing below the driver drop", () => {
    const ch = createMotorChannel({ motor: reference, gear, driver, id: "M1", joint: "wheel-l" });
    expect(ch.begin(0, 0.3, pins, H_S).supplyA).toBe(0);
  });

  it("keeps the last supply current when the solve gave no voltage", () => {
    const ch = createMotorChannel({ motor: reference, gear, driver, id: "M1", joint: "wheel-l" });
    const first = ch.begin(0, 7.4, pins, H_S);
    const stale = ch.begin(0, Number.NaN, pins, H_S);
    expect(stale.supplyA).toBe(first.supplyA);
    expect(stale.notes).toEqual(["stale-supply"]);
  });
});
