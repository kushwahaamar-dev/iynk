import type { CouplingReport } from "../../core/robot-report.ts";
import { driverDrive, type DriverParams, type PinSample } from "./driver.ts";
import { outputTorque, type GearParams } from "./gearbox.ts";
import { electromechanicalC, stepMotor, type MotorParams, type MotorState } from "./motor.ts";

export const H_S = 1 / 240;

type Mode = CouplingReport["mode"];

export type CouplingCheck =
  | { ok: true; report: CouplingReport }
  | { ok: false; code: "RB-E-COUPLING"; report: CouplingReport };

/**
 * The speed loop settles at rate `c`, and one step of lag is stable while `h*c < 2`.
 * Refusing at 1 keeps a factor of two in hand.
 */
export function couplingCheck(m: MotorParams, hS: number, motorId = ""): CouplingCheck {
  const c = electromechanicalC(m);
  const hc = hS * c;
  const report: CouplingReport = { motorId, c, hc, ok: hc < 1, mode: chooseMode(m, hS, "pwm") };
  return report.ok ? { ok: true, report } : { ok: false, code: "RB-E-COUPLING", report };
}

/** The armature current only needs its exponential when L/R is long enough to show up inside a step. */
export function chooseMode(m: MotorParams, hS: number, waveform: "dc" | "pwm"): Mode {
  if (!(m.lHenry > 0)) return "algebraic";
  return waveform === "dc" && m.lHenry / m.rOhm < 2 * hS ? "algebraic" : "cycle";
}

export interface MotorStepOut {
  torqueJointNm: number;
  supplyA: number;
  notes: string[];
}

export interface MotorChannel {
  readonly id: string;
  readonly joint: string;
  /** Takes the joint speed and supply voltage from the last step and solve; the engine applies the torque. */
  begin(wJointRadS: number, vSupply: number, pins: PinSample, hS: number): MotorStepOut;
  state(): { iArmA: number; mode: Mode };
}

export function createMotorChannel(a: { motor: MotorParams; gear: GearParams; driver: DriverParams; id: string; joint: string }): MotorChannel {
  const { motor, gear, driver } = a;
  const noInductance: MotorParams = { ...motor, lHenry: 0 };
  const motorState: MotorState = { iA: 0 };
  let mode: Mode = chooseMode(motor, H_S, "pwm");
  let phaseNs = 0;
  let last: MotorStepOut = { torqueJointNm: 0, supplyA: 0, notes: [] };

  return {
    id: a.id,
    joint: a.joint,
    begin(wJointRadS, vSupply, pins, hS) {
      if (!Number.isFinite(vSupply)) {
        last = { ...last, notes: ["stale-supply"] };
        return last;
      }
      const out = driverDrive(driver, pins, vSupply);
      mode = chooseMode(motor, hS, out.drive.hz > 0 ? "pwm" : "dc");
      const step = stepMotor(
        mode === "cycle" ? motor : noInductance,
        motorState,
        gear.ratio * wJointRadS,
        { ...out.drive, phaseNs },
        hS,
      );
      motorState.iA = mode === "cycle" ? step.iEndA : 0;
      phaseNs += hS * 1e9;
      const notes: string[] = step.notes;
      if (out.approximation) notes.push("driver-pwm-too-fast");
      last = { torqueJointNm: outputTorque(gear, step.torqueShaftNm, wJointRadS), supplyA: step.supplyAvgA, notes };
      return last;
    },
    state: () => ({ iArmA: motorState.iA, mode }),
  };
}
