import type { MotorSI, PropSI } from "../../parts/mechanics.ts";
import { checkAll, isOutOfRange, type OutOfRange, type Range } from "./guards.ts";

export interface Air {
  rho_kgm3: number;
}

export const SEA_LEVEL_AIR: Air = { rho_kgm3: 1.225 };

/** One motor on one propeller in SI units, with the propeller folded into the two thrust and torque constants. */
export interface RotorSI {
  ke: number;
  r: number;
  i0: number;
  kT: number;
  kQ: number;
  d_m: number;
  rpmMax: number | null;
}

export interface MotorPoint {
  omega: number;
  rpm: number;
  thrust_n: number;
  torque_nm: number;
  current_a: number;
  shaft_w: number;
  electrical_w: number;
}

export interface PackModel {
  open_v(soc: number): number;
  r_ohm: number;
  idle_a: number;
}

export interface Drive {
  rotor: RotorSI;
  escEff: number;
}

export interface StaticPoint {
  v_pack: number;
  i_pack: number;
  motors: MotorPoint[];
  residual_nm: number;
}

const SAG_PASSES = 3;
const BISECT_ITERS = 40;
const RPM_PER_RAD_S = 30 / Math.PI;

const positive = (max: number): Range => ({ min: 0, max, minExclusive: true });
const unit: Range = { min: 0, max: 1 };

export function rotorOf(m: MotorSI, p: PropSI, air: Air): RotorSI | OutOfRange {
  const bad = checkAll([
    ["ke", m.ke_vs_per_rad, positive(100)],
    ["r", m.r_ohm, positive(1000)],
    ["i0", m.i0_a, { min: 0, max: 1000 }],
    ["d_m", p.d_m, positive(5)],
    ["ct0", p.ct0, positive(10)],
    ["cp0", p.cp0, positive(10)],
    ["rho", air.rho_kgm3, positive(5)],
  ]);
  if (bad) return bad;
  const d2 = p.d_m * p.d_m;
  const d4 = d2 * d2;
  const d5 = d4 * p.d_m;
  const pi2 = Math.PI * Math.PI;
  return {
    ke: m.ke_vs_per_rad,
    r: m.r_ohm,
    i0: m.i0_a,
    kT: (p.ct0 * air.rho_kgm3 * d4) / (4 * pi2),
    kQ: (p.cp0 * air.rho_kgm3 * d5) / (8 * pi2 * Math.PI),
    d_m: p.d_m,
    rpmMax: p.rpm_max ?? null,
  };
}

/** Rotor speed, thrust, torque and current at a steady state from the voltage the motor sees. */
export function solveRotor(r: RotorSI, vEff: number): MotorPoint {
  const c = r.ke * (vEff / r.r - r.i0);
  if (c <= 0) {
    const current_a = vEff / r.r;
    return { omega: 0, rpm: 0, thrust_n: 0, torque_nm: 0, current_a, shaft_w: 0, electrical_w: vEff * current_a };
  }
  const b = (r.ke * r.ke) / r.r;
  const omega = (2 * c) / (b + Math.sqrt(b * b + 4 * r.kQ * c));
  const current_a = (vEff - r.ke * omega) / r.r;
  const w2 = omega * omega;
  const torque_nm = r.kQ * w2;
  return {
    omega,
    rpm: omega * RPM_PER_RAD_S,
    thrust_n: r.kT * w2,
    torque_nm,
    current_a,
    shaft_w: torque_nm * omega,
    electrical_w: vEff * current_a,
  };
}

/** How far the solved point is from the motor torque balance, Q = ke (I - I0). A stalled rotor has none. */
const torqueResidual = (r: RotorSI, m: MotorPoint): number =>
  m.omega === 0 ? 0 : Math.abs(m.torque_nm - r.ke * (m.current_a - r.i0));

export function solveStatic(
  d: readonly Drive[],
  duty: number | readonly number[],
  soc: number,
  pack: PackModel,
): StaticPoint | OutOfRange {
  const duties = typeof duty === "number" ? d.map(() => duty) : duty;
  if (duties.length !== d.length) {
    return { error: "out-of-range", field: "duty.length", value: duties.length, min: d.length, max: d.length };
  }
  const bad = checkAll([
    ["soc", soc, unit],
    ["pack.r_ohm", pack.r_ohm, { min: 0, max: 1000 }],
    ["pack.idle_a", pack.idle_a, { min: 0, max: 1000 }],
    ...duties.map((u, i): [string, number, Range] => [`duty[${i}]`, u, unit]),
    ...d.map((x, i): [string, number, Range] => [`escEff[${i}]`, x.escEff, positive(1)]),
  ]);
  if (bad) return bad;
  const open = pack.open_v(soc);
  const openBad = checkAll([["pack.open_v", open, { min: 0, max: 1000 }]]);
  if (openBad) return openBad;

  let v_pack = open;
  let i_pack = pack.idle_a;
  let motors: MotorPoint[] = [];
  for (let pass = 0; pass < SAG_PASSES; pass++) {
    const solved = new Map<Drive, { duty: number; point: MotorPoint }>();
    motors = d.map((x, i) => {
      const u = duties[i]!;
      const hit = solved.get(x);
      if (hit && hit.duty === u) return hit.point;
      const point = solveRotor(x.rotor, u * v_pack * x.escEff);
      solved.set(x, { duty: u, point });
      return point;
    });
    i_pack = pack.idle_a;
    motors.forEach((m, i) => {
      i_pack += duties[i]! * m.current_a;
    });
    v_pack = Math.max(0, open - pack.r_ohm * i_pack);
  }
  let residual_nm = 0;
  motors.forEach((m, i) => {
    residual_nm = Math.max(residual_nm, torqueResidual(d[i]!.rotor, m));
  });
  return { v_pack, i_pack, motors, residual_nm };
}

const totalThrust = (p: StaticPoint): number => p.motors.reduce((sum, m) => sum + m.thrust_n, 0);

/** The common duty that gives the target total thrust, or 'unreachable' when full throttle falls short or an input is bad. */
export function dutyForThrust(
  d: readonly Drive[],
  soc: number,
  pack: PackModel,
  targetN: number,
  iters: number = BISECT_ITERS,
): number | "unreachable" {
  if (!(targetN >= 0) || !Number.isFinite(targetN)) return "unreachable";
  const top = maxThrust(d, soc, pack);
  if (isOutOfRange(top) || totalThrust(top) < targetN) return "unreachable";
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    const p = solveStatic(d, mid, soc, pack);
    if (isOutOfRange(p)) return "unreachable";
    if (totalThrust(p) < targetN) lo = mid;
    else hi = mid;
  }
  return hi;
}

export const maxThrust = (d: readonly Drive[], soc: number, pack: PackModel): StaticPoint | OutOfRange =>
  solveStatic(d, 1, soc, pack);
