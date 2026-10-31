import { fail, ok, type Result } from "../../core/result.ts";
import type { Mechanics } from "../../parts/generated/types.ts";
import { dmath } from "./ports.ts";

export type MechanicsMotor = NonNullable<Mechanics["motor"]>;

export interface MotorParams {
  rOhm: number;
  lHenry: number;
  keVsPerRad: number;
  jKgM2: number;
  bNmsPerRad: number;
  iNoLoadA: number;
  /** What `paramsFromDescriptor` had to work out because the descriptor did not give it. */
  derivedFrom?: string[];
}

export type Decay = "slow" | "fast" | "coast";

export interface Drive {
  /** Signed volts at the bridge output while on, after the driver drop. */
  vTerminal: number;
  duty: number;
  hz: number;
  decay: Decay;
  /** Where in the PWM period the step starts, so consecutive steps join without a seam. */
  phaseNs?: number;
}

export interface MotorState {
  /** Armature current at the start of the step. */
  iA: number;
}

export type MotorNote = "approximation" | "inductance-not-given";

export interface StepOut {
  iAvgA: number;
  /** Mean current drawn from the supply; negative when the motor feeds it. */
  supplyAvgA: number;
  iEndA: number;
  torqueShaftNm: number;
  notes: MotorNote[];
}

export interface MotorError {
  code: "missing-r" | "missing-ke";
  message: string;
}

const RPM_TO_RAD_S = (2 * Math.PI) / 60;

export function paramsFromDescriptor(m: MechanicsMotor): Result<MotorParams, MotorError> {
  const derivedFrom: string[] = [];

  let rOhm = m.r_ohm;
  if (!(rOhm > 0) && m.v_nominal && m.i_stall_a) {
    rOhm = m.v_nominal / m.i_stall_a;
    derivedFrom.push("r_ohm = v_nominal / i_stall_a");
  }
  if (!(rOhm > 0)) {
    return fail({ code: "missing-r", message: "The motor needs r_ohm, or v_nominal and i_stall_a to work it out." });
  }

  let ke = m.ke_vs_per_rad;
  if (!(ke && ke > 0) && m.kv_rpm_per_v) {
    ke = 1 / (m.kv_rpm_per_v * RPM_TO_RAD_S);
    derivedFrom.push("ke_vs_per_rad = 1 / kv");
  } else if (!(ke && ke > 0) && m.torque_stall_nm && m.i_stall_a) {
    ke = m.torque_stall_nm / m.i_stall_a;
    derivedFrom.push("ke_vs_per_rad = torque_stall_nm / i_stall_a");
  }
  if (!(ke && ke > 0)) {
    return fail({ code: "missing-ke", message: "The motor needs ke_vs_per_rad or kv_rpm_per_v." });
  }

  return ok({
    rOhm,
    lHenry: m.l_henry ?? 0,
    keVsPerRad: ke,
    jKgM2: m.j_kgm2 ?? 0,
    bNmsPerRad: m.b_nms_per_rad ?? 0,
    iNoLoadA: m.i_noload_a ?? 0,
    ...(derivedFrom.length > 0 && { derivedFrom }),
  });
}

function shaftTorque(p: MotorParams, iAvgA: number, wShaftRadS: number): number {
  return p.keVsPerRad * (iAvgA - p.iNoLoadA * Math.sign(wShaftRadS));
}

function supplySign(vTerminal: number): number {
  return vTerminal < 0 ? -1 : 1;
}

export function stepMotorDc(p: MotorParams, wShaftRadS: number, vTerminal: number): StepOut {
  const iA = (vTerminal - p.keVsPerRad * wShaftRadS) / p.rOhm;
  return {
    iAvgA: iA,
    supplyAvgA: vTerminal === 0 ? 0 : iA * supplySign(vTerminal),
    iEndA: iA,
    torqueShaftNm: shaftTorque(p, iA, wShaftRadS),
    notes: [],
  };
}

/** Without inductance each PWM state is its own algebraic armature, weighted by how long it lasts. */
function stepMotorChopped(p: MotorParams, wShaftRadS: number, d: Drive): StepOut {
  const duty = Math.min(1, Math.max(0, d.duty));
  const on = stepMotorDc(p, wShaftRadS, d.vTerminal);
  const off =
    d.decay === "coast"
      ? { iAvgA: 0, supplyAvgA: 0 }
      : stepMotorDc(p, wShaftRadS, d.decay === "fast" ? -d.vTerminal : 0);
  const iAvgA = duty * on.iAvgA + (1 - duty) * off.iAvgA;
  return {
    iAvgA,
    supplyAvgA: duty * on.supplyAvgA + (1 - duty) * off.supplyAvgA,
    iEndA: iAvgA,
    torqueShaftNm: shaftTorque(p, iAvgA, wShaftRadS),
    notes: ["inductance-not-given"],
  };
}

/**
 * One mechanical step with the shaft speed frozen at `wShaftRadS`. Inside each PWM segment
 * the armature current is an exponential, so its integral is exact; a step is the whole
 * cycles it covers plus the partial one it ends in.
 */
export function stepMotor(p: MotorParams, s: MotorState, wShaftRadS: number, d: Drive, hS: number): StepOut {
  const chopped = d.hz > 0;
  if (!chopped && d.duty > 0 && d.duty < 1) {
    const out = stepMotorDc(p, wShaftRadS, d.duty * d.vTerminal);
    return { ...out, notes: ["approximation"] };
  }
  if (!(p.lHenry > 0)) return stepMotorChopped(p, wShaftRadS, d);

  const tauE = p.lHenry / p.rOhm;
  const eMf = p.keVsPerRad * wShaftRadS;
  const sign = supplySign(d.vTerminal);
  let i = s.iA;
  let charge = 0;
  let supplyCharge = 0;

  const run = (durS: number, vSeg: number, freewheel: boolean): number => {
    const iTarget = (vSeg - eMf) / p.rOhm;
    let spanS = durS;
    let zeroAfter = false;
    if (freewheel) {
      if (i === 0) return 0;
      if (i * iTarget < 0) {
        const toZeroS = tauE * dmath.log((i - iTarget) / -iTarget);
        if (toZeroS < durS) {
          spanS = toZeroS;
          zeroAfter = true;
        }
      }
    }
    const e = dmath.exp(-spanS / tauE);
    const q = iTarget * spanS + (i - iTarget) * tauE * (1 - e);
    i = zeroAfter ? 0 : iTarget + (i - iTarget) * e;
    return q;
  };

  const periodS = chopped ? 1 / d.hz : hS;
  const onS = d.duty >= 1 ? periodS : Math.max(0, d.duty) * periodS;
  let posS = chopped ? (((d.phaseNs ?? 0) * 1e-9) % periodS + periodS) % periodS : 0;
  let leftS = hS;
  while (leftS > 0) {
    const isOn = posS < onS;
    const edgeS = isOn ? onS : periodS;
    const durS = Math.min(edgeS - posS, leftS);
    if (isOn) {
      const q = run(durS, d.vTerminal, false);
      charge += q;
      supplyCharge += sign * q;
    } else {
      const q = run(durS, d.decay === "fast" ? -d.vTerminal : 0, d.decay === "coast");
      charge += q;
      if (d.decay === "fast") supplyCharge -= sign * q;
    }
    leftS -= durS;
    posS = durS === edgeS - posS ? edgeS : posS + durS;
    if (posS >= periodS) posS = 0;
  }

  const iAvgA = charge / hS;
  return {
    iAvgA,
    supplyAvgA: supplyCharge / hS,
    iEndA: i,
    torqueShaftNm: shaftTorque(p, iAvgA, wShaftRadS),
    notes: [],
  };
}

/** Rate, per second, at which shaft speed settles under a fixed terminal voltage. */
export function electromechanicalC(p: MotorParams): number {
  return ((p.keVsPerRad * p.keVsPerRad) / p.rOhm + p.bNmsPerRad) / p.jKgM2;
}
