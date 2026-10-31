import { describe, expect, it } from "vitest";
import {
  type Drive,
  electromechanicalC,
  type MechanicsMotor,
  type MotorParams,
  paramsFromDescriptor,
  stepMotor,
  stepMotorDc,
} from "./motor.ts";

const motor: MotorParams = { rOhm: 2.5, lHenry: 1.2e-3, keVsPerRad: 0.012, jKgM2: 6e-6, bNmsPerRad: 2e-6, iNoLoadA: 0 };
const VBATT = 6;
const HZ = 490;
const STEP_S = 1 / 240;

function reference(duty: number, decay: "slow" | "coast", seconds: number): number {
  const h = 5e-6;
  const period = 1 / HZ;
  let i = 0;
  let w = 0;
  for (let t = 0; t < seconds; t += h) {
    const on = (t % period) / period < duty;
    i += (h * ((on ? VBATT : 0) - motor.rOhm * i - motor.keVsPerRad * w)) / motor.lHenry;
    if (decay === "coast" && i < 0 && !on) i = 0;
    w += (h * (motor.keVsPerRad * i - motor.bNmsPerRad * w)) / motor.jKgM2;
  }
  return w;
}

function closedForm(duty: number, decay: "slow" | "coast", seconds: number): { w: number; minI: number } {
  let w = 0;
  let iA = 0;
  let minI = 0;
  for (let n = 0; n < Math.round(seconds / STEP_S); n++) {
    const drive: Drive = { vTerminal: VBATT, duty, hz: HZ, decay, phaseNs: Math.round(n * STEP_S * 1e9) };
    const out = stepMotor(motor, { iA }, w, drive, STEP_S);
    iA = out.iEndA;
    minI = Math.min(minI, out.iAvgA, iA);
    w += (STEP_S * (out.torqueShaftNm - motor.bNmsPerRad * w)) / motor.jKgM2;
  }
  return { w, minI };
}

function dutyAveraged(duty: number, seconds: number): number {
  let w = 0;
  for (let n = 0; n < Math.round(seconds / STEP_S); n++) {
    const out = stepMotorDc(motor, w, duty * VBATT);
    w += (STEP_S * (out.torqueShaftNm - motor.bNmsPerRad * w)) / motor.jKgM2;
  }
  return w;
}

describe("motor on PWM", () => {
  for (const decay of ["slow", "coast"] as const) {
    for (const duty of [0.25, 0.5, 0.75]) {
      it(`${decay} decay at duty ${duty} is within 1 percent of the fine reference`, () => {
        const ref = reference(duty, decay, 0.5);
        const { w } = closedForm(duty, decay, 0.5);
        expect(Math.abs(w - ref) / ref).toBeLessThan(0.01);
      });
    }
  }

  it("shows the duty-averaged form is wrong in coast mode", () => {
    const ref = reference(0.25, "coast", 0.5);
    expect(Math.abs(dutyAveraged(0.25, 0.5) - ref) / ref).toBeGreaterThan(0.1);
  });

  it("never lets the current go negative in coast mode", () => {
    expect(closedForm(0.25, "coast", 0.5).minI).toBeGreaterThanOrEqual(0);
  });

  it("at duty 1 equals the algebraic armature once the current has settled", () => {
    const out = stepMotor(motor, { iA: 0.8 }, 100, { vTerminal: VBATT, duty: 1, hz: HZ, decay: "coast" }, 0.05);
    const dc = stepMotorDc(motor, 100, VBATT);
    expect(out.iEndA).toBeCloseTo(dc.iAvgA, 6);
  });

  it("flags a chopped drive without a frequency as an approximation", () => {
    const out = stepMotor(motor, { iA: 0 }, 0, { vTerminal: VBATT, duty: 0.5, hz: 0, decay: "slow" }, STEP_S);
    expect(out.notes).toEqual(["approximation"]);
    expect(out.iAvgA).toBeCloseTo(stepMotorDc(motor, 0, VBATT / 2).iAvgA, 12);
  });

  it("uses the algebraic armature per PWM state when inductance is not given", () => {
    const noL = { ...motor, lHenry: 0 };
    const out = stepMotor(noL, { iA: 0 }, 0, { vTerminal: VBATT, duty: 0.5, hz: HZ, decay: "coast" }, STEP_S);
    expect(out.notes).toEqual(["inductance-not-given"]);
    expect(out.iAvgA).toBeCloseTo(0.5 * (VBATT / motor.rOhm), 12);
  });

  it("reports the supply current of the on state only in slow decay", () => {
    const out = stepMotor(motor, { iA: 0 }, 0, { vTerminal: VBATT, duty: 0.5, hz: HZ, decay: "slow" }, 0.1);
    expect(out.supplyAvgA).toBeGreaterThan(0);
    expect(out.supplyAvgA).toBeLessThan(out.iAvgA);
  });
});

describe("paramsFromDescriptor", () => {
  it("derives resistance and ke from stall figures", () => {
    const m: MechanicsMotor = { r_ohm: 0, v_nominal: 6, i_stall_a: 2.4, torque_stall_nm: 0.0288 };
    const res = paramsFromDescriptor(m);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.rOhm).toBeCloseTo(2.5, 12);
    expect(res.value.keVsPerRad).toBeCloseTo(0.012, 12);
    expect(res.value.derivedFrom).toHaveLength(2);
  });

  it("derives ke from kv", () => {
    const res = paramsFromDescriptor({ r_ohm: 2.5, kv_rpm_per_v: 100 });
    expect(res.ok && res.value.keVsPerRad).toBeCloseTo(60 / (2 * Math.PI * 100), 12);
  });

  it("reports what is missing", () => {
    const noR = paramsFromDescriptor({ r_ohm: 0, ke_vs_per_rad: 0.01 });
    expect(!noR.ok && noR.error.code).toBe("missing-r");
    const noKe = paramsFromDescriptor({ r_ohm: 2.5 });
    expect(!noKe.ok && noKe.error.code).toBe("missing-ke");
  });
});

describe("electromechanicalC", () => {
  it("is about 10 per second for the example motor", () => {
    expect(electromechanicalC(motor)).toBeCloseTo(9.93, 2);
  });
});
