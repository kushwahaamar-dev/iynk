import type { Mechanics } from "../../parts/generated/types.ts";

export type MechanicsServo = NonNullable<Mechanics["servo"]>;

export interface ServoParams {
  stallTorqueNm: number;
  speedSPer60deg: number;
  pulseMinUs: number;
  pulseMaxUs: number;
  angleRangeDeg: number;
  deadbandUs: number;
  iStallA: number;
  iIdleA: number;
}

export interface ServoState {
  angleDeg: number;
  /** The command the servo is holding, which is the last pulse that was accepted. */
  lastPulseUs: number;
}

/** A hobby servo's control loop saturates this many degrees from the target (iynk assumption). */
const SATURATION_DEG = 10;
const PULSE_SLACK_US = 100;

export function paramsFromDescriptor(s: MechanicsServo): ServoParams {
  return {
    stallTorqueNm: s.stall_torque_nm,
    speedSPer60deg: s.speed_s_per_60deg,
    pulseMinUs: s.pulse_min_us ?? 1000,
    pulseMaxUs: s.pulse_max_us ?? 2000,
    angleRangeDeg: s.angle_range_deg ?? 180,
    deadbandUs: s.deadband_us ?? 0,
    iStallA: s.i_stall_a ?? 0,
    iIdleA: s.i_idle_a ?? 0,
  };
}

export function targetAngleDeg(p: ServoParams, pulseUs: number): number {
  const frac = (pulseUs - p.pulseMinUs) / (p.pulseMaxUs - p.pulseMinUs);
  return Math.min(1, Math.max(0, frac)) * p.angleRangeDeg;
}

/**
 * Advance the horn by `hS`. A pulse far outside the valid range, or inside the deadband of the
 * held command, leaves the command alone. `loadNm` opposes the motion when its sign differs
 * from the torque the servo applies; the horn holds while that load is bigger than the torque.
 */
export function stepServo(
  p: ServoParams,
  s: ServoState,
  pulseUs: number,
  loadNm: number,
  hS: number,
): { state: ServoState; torqueNm: number; currentA: number } {
  const valid = pulseUs >= p.pulseMinUs - PULSE_SLACK_US && pulseUs <= p.pulseMaxUs + PULSE_SLACK_US;
  const accepted = valid && Math.abs(pulseUs - s.lastPulseUs) >= p.deadbandUs;
  const lastPulseUs = accepted ? pulseUs : s.lastPulseUs;

  const errDeg = targetAngleDeg(p, lastPulseUs) - s.angleDeg;
  const kp = p.stallTorqueNm / SATURATION_DEG;
  const torqueNm = Math.min(p.stallTorqueNm, Math.max(-p.stallTorqueNm, kp * errDeg));

  const opposed = loadNm * torqueNm < 0 && Math.abs(loadNm) > Math.abs(torqueNm);
  const maxStepDeg = (60 / p.speedSPer60deg) * hS;
  const stepDeg = opposed ? 0 : Math.sign(errDeg) * Math.min(Math.abs(errDeg), maxStepDeg);

  const loaded = Math.abs(torqueNm) / p.stallTorqueNm;
  return {
    state: { angleDeg: s.angleDeg + stepDeg, lastPulseUs },
    torqueNm,
    currentA: p.iIdleA + (p.iStallA - p.iIdleA) * loaded,
  };
}
