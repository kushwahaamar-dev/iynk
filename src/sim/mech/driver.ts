import { fail, ok, type Result } from "../../core/result.ts";
import type { Mechanics } from "../../parts/generated/types.ts";
import type { Decay, Drive } from "./motor.ts";

export type MechanicsDriver = NonNullable<Mechanics["driver"]>;

export type TruthTable = "tb6612" | "l298n";

export interface DriverParams {
  kind: "h-bridge";
  decay: Decay;
  vdropV: number;
  iMaxA: number;
  pwmMaxHz: number;
  truth: TruthTable;
}

/** For the L298N, `pwm` is the EN pin and `stby` is not used. */
export interface PinSample {
  in1: 0 | 1;
  in2: 0 | 1;
  pwm: { duty: number; hz: number } | { level: 0 | 1 };
  stby?: 0 | 1;
}

export type DriverState = "run" | "brake" | "coast" | "standby";

export interface DriverOut {
  drive: Drive;
  state: DriverState;
  direction: -1 | 0 | 1;
  /** The PWM is faster than the module can switch, so the drive is no longer exact. */
  approximation: boolean;
}

export interface DriverError {
  code: "RB-E-DRIVE";
  message: string;
}

const TRUTH_BY_PART: Record<string, TruthTable> = {
  "core.tb6612fng-module": "tb6612",
  "core.l298n-module": "l298n",
};

export function paramsFromDescriptor(partId: string, d: MechanicsDriver): Result<DriverParams, DriverError> {
  const truth = TRUTH_BY_PART[partId];
  if (!truth) {
    return fail({ code: "RB-E-DRIVE", message: `${partId} has no driver truth table.` });
  }
  if (d.kind !== "h-bridge") {
    return fail({ code: "RB-E-DRIVE", message: `${partId} is a ${d.kind} driver, and only h-bridge is modelled.` });
  }
  return ok({
    kind: "h-bridge",
    decay: d.decay ?? "slow",
    vdropV: d.vdrop_v ?? 0,
    iMaxA: d.i_max_a ?? Number.POSITIVE_INFINITY,
    pwmMaxHz: d.pwm_max_hz ?? Number.POSITIVE_INFINITY,
    truth,
  });
}

function pwmOf(pwm: PinSample["pwm"]): { duty: number; hz: number } {
  if ("level" in pwm) return { duty: pwm.level, hz: 0 };
  return { duty: Math.min(1, Math.max(0, pwm.duty)), hz: pwm.hz };
}

/**
 * Both inputs the same is a short brake. TB6612 with PWM low also brakes (the datasheet table),
 * and with both inputs low it only coasts while PWM is high; PWM low there is not in the table
 * and is treated as coast too. L298N with EN low coasts.
 */
export function driverDrive(p: DriverParams, pins: PinSample, vSupplyV: number): DriverOut {
  const { duty, hz } = pwmOf(pins.pwm);
  const approximation = hz > p.pwmMaxHz;
  const stopped = (state: DriverState, vTerminal: number): DriverOut => ({
    drive: { vTerminal, duty: state === "brake" ? 1 : 0, hz: 0, decay: "coast" },
    state,
    direction: 0,
    approximation,
  });

  if (p.truth === "tb6612" && pins.stby !== 1) return stopped("standby", 0);
  if (p.truth === "l298n" && duty === 0) return stopped("coast", 0);
  if (pins.in1 === pins.in2) {
    if (p.truth === "tb6612" && pins.in1 === 0) return stopped("coast", 0);
    return stopped("brake", 0);
  }
  if (p.truth === "tb6612" && duty === 0) return stopped("brake", 0);

  const direction = pins.in1 === 1 ? 1 : -1;
  const volts = Math.max(0, vSupplyV - p.vdropV);
  return {
    drive: { vTerminal: direction * volts, duty, hz, decay: p.decay },
    state: "run",
    direction,
    approximation,
  };
}

export function overCurrent(p: DriverParams, iA: number): boolean {
  return Math.abs(iA) > p.iMaxA;
}
