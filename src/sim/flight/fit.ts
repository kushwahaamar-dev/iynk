import type { MotorSI } from "../../parts/mechanics.ts";
import { checkAll, isOutOfRange, type OutOfRange, type Range } from "./guards.ts";
import { rotorOf, solveRotor, type Air } from "./propulsion.ts";

export interface FitRow {
  v_pack: number;
  throttle: number;
  thrust_g: number;
  current_a: number;
}

/** Two-sided 90 percent factor for a normal residual (Q15). An estimate, not a tuning knob. */
export const BAND_FACTOR = 1.645;

export interface FitResult {
  ct0: number;
  cp0: number;
  rms_thrust: number;
  rms_current: number;
  /** Relative band on every output, or null when the fit did not converge. */
  band: number | null;
  n: number;
  v_range: readonly [number, number];
  throttle_range: readonly [number, number];
  converged: boolean;
  iterations: number;
  warnings: string[];
}

/** The `x_fit` entry stored on a prop descriptor, one per motor id it was fitted with (Q7). */
export interface FitRecord {
  motor: string;
  rows: FitRow[];
  ct0: number;
  cp0: number;
  rms_thrust: number;
  rms_current: number;
  band: number;
  v_range: [number, number];
  throttle_range: [number, number];
  made: string;
}

const START: readonly [number, number] = [0.12, 0.06];
const MIN_ROWS = 4;
const MAX_ROWS = 32;
const MAX_ITERS = 50;
const MAX_HALVINGS = 8;
const DAMPING = 1e-3;
const FD_STEP = 1e-6;
const STEP_TOL = 1e-10;
const STUCK_STEP_TOL = 1e-6;
const COEFF_MIN = 1e-6;
const COEFF_MAX = 10;
const RANGE_MARGIN = 0.05;
const G_TO_N = 9.80665e-3;

const positive = (max: number): Range => ({ min: 0, max, minExclusive: true });
const unit: Range = { min: 0, max: 1 };

type Pair = readonly [number, number];

const clampCoeff = (x: number): number => Math.min(COEFF_MAX, Math.max(COEFF_MIN, x));

/** Relative thrust and current errors of every row, thrust first, for one pair of coefficients. */
function residuals(rows: readonly FitRow[], m: MotorSI, d_m: number, escEff: number, air: Air, c: Pair): number[] | null {
  const rotor = rotorOf(
    m,
    { d_m, pitch_m: 0, blades: 2, ct0: clampCoeff(c[0]), cp0: clampCoeff(c[1]), mass_g: 0, hasAdvanceTables: false },
    air,
  );
  if (isOutOfRange(rotor)) return null;
  const thrust: number[] = [];
  const current: number[] = [];
  for (const row of rows) {
    const p = solveRotor(rotor, row.throttle * row.v_pack * escEff);
    thrust.push((p.thrust_n / G_TO_N - row.thrust_g) / row.thrust_g);
    current.push((row.throttle * p.current_a - row.current_a) / row.current_a);
  }
  return [...thrust, ...current];
}

const cost = (r: readonly number[]): number => r.reduce((s, x) => s + x * x, 0);

const rms = (r: readonly number[]): number => Math.sqrt(cost(r) / r.length);

/** Damped Gauss-Newton step for two unknowns, or null when the normal equations are singular. */
function stepFor(rows: readonly FitRow[], r: readonly number[], jac: (k: 0 | 1) => number[] | null): Pair | null {
  const j0 = jac(0);
  const j1 = jac(1);
  if (!j0 || !j1) return null;
  let a = 0;
  let b = 0;
  let c = 0;
  let g0 = 0;
  let g1 = 0;
  for (let i = 0; i < r.length; i++) {
    a += j0[i]! * j0[i]!;
    b += j0[i]! * j1[i]!;
    c += j1[i]! * j1[i]!;
    g0 += j0[i]! * r[i]!;
    g1 += j1[i]! * r[i]!;
  }
  const a2 = a * (1 + DAMPING);
  const c2 = c * (1 + DAMPING);
  const det = a2 * c2 - b * b;
  if (!(Math.abs(det) > 0) || !Number.isFinite(det)) return null;
  return [(-g0 * c2 + g1 * b) / det, (-g1 * a2 + g0 * b) / det];
}

function validate(rows: readonly FitRow[], m: MotorSI, d_m: number, escEff: number, air: Air): OutOfRange | null {
  if (rows.length > MAX_ROWS) {
    return { error: "out-of-range", field: "rows", value: rows.length, min: MIN_ROWS, max: MAX_ROWS };
  }
  return (
    checkAll([
      ["ke", m.ke_vs_per_rad, positive(100)],
      ["r", m.r_ohm, positive(1000)],
      ["i0", m.i0_a, { min: 0, max: 1000 }],
      ["d_m", d_m, positive(5)],
      ["escEff", escEff, positive(1)],
      ["rho", air.rho_kgm3, positive(5)],
    ]) ??
    checkAll(
      rows.flatMap((row, i): [string, number, Range][] => [
        [`rows[${i}].throttle`, row.throttle, unit],
        [`rows[${i}].v_pack`, row.v_pack, positive(1000)],
        [`rows[${i}].thrust_g`, row.thrust_g, { min: -Number.MAX_VALUE, max: Number.MAX_VALUE }],
        [`rows[${i}].current_a`, row.current_a, { min: -Number.MAX_VALUE, max: Number.MAX_VALUE }],
      ]),
    )
  );
}

/** Fits the propeller's `ct0` and `cp0` to a manufacturer table. Duty is taken to equal throttle. */
export function fitDatasheet(
  rows: readonly FitRow[],
  m: MotorSI,
  d_m: number,
  escEff: number,
  air: Air,
): FitResult | OutOfRange {
  const bad = validate(rows, m, d_m, escEff, air);
  if (bad) return bad;
  const warnings: string[] = [];
  const used = rows.filter((row, i) => {
    const keep = row.thrust_g > 0 && row.current_a > 0;
    if (!keep) warnings.push(`row ${i + 1} dropped: thrust and current must be above zero`);
    return keep;
  });
  if (used.length < MIN_ROWS) {
    return { error: "out-of-range", field: "rows", value: used.length, min: MIN_ROWS, max: MAX_ROWS };
  }

  let c: Pair = START;
  let r = residuals(used, m, d_m, escEff, air, c);
  let converged = false;
  let iterations = 0;
  while (r && iterations < MAX_ITERS) {
    iterations++;
    const at = c;
    const base = r;
    const step = stepFor(used, base, (k) => {
      const h = FD_STEP * at[k];
      const hi = residuals(used, m, d_m, escEff, air, k === 0 ? [at[0] + h, at[1]] : [at[0], at[1] + h]);
      const lo = residuals(used, m, d_m, escEff, air, k === 0 ? [at[0] - h, at[1]] : [at[0], at[1] - h]);
      return hi && lo ? hi.map((x, i) => (x - lo[i]!) / (2 * h)) : null;
    });
    if (!step) break;
    let scale = 1;
    let accepted = false;
    for (let half = 0; half <= MAX_HALVINGS; half++, scale /= 2) {
      const next: Pair = [clampCoeff(at[0] + scale * step[0]), clampCoeff(at[1] + scale * step[1])];
      const rn = residuals(used, m, d_m, escEff, air, next);
      if (rn && cost(rn) <= cost(base)) {
        const rel = Math.hypot((next[0] - at[0]) / at[0], (next[1] - at[1]) / at[1]);
        c = next;
        r = rn;
        accepted = true;
        if (rel < STEP_TOL) converged = true;
        break;
      }
    }
    if (!accepted) {
      converged = Math.hypot(step[0] / at[0], step[1] / at[1]) < STUCK_STEP_TOL;
      break;
    }
    if (converged) break;
  }

  if (!r || !Number.isFinite(cost(r))) {
    return { error: "out-of-range", field: "rows", value: NaN, min: MIN_ROWS, max: MAX_ROWS };
  }
  const n = used.length;
  const rms_thrust = rms(r.slice(0, n));
  const rms_current = rms(r.slice(n));
  const volts = used.map((row) => row.v_pack);
  const throttles = used.map((row) => row.throttle);
  if (!converged) warnings.push("fit did not converge");
  return {
    ct0: c[0],
    cp0: c[1],
    rms_thrust,
    rms_current,
    band: converged ? BAND_FACTOR * Math.max(rms_thrust, rms_current) : null,
    n,
    v_range: [Math.min(...volts), Math.max(...volts)],
    throttle_range: [Math.min(...throttles), Math.max(...throttles)],
    converged,
    iterations,
    warnings,
  };
}

const within = (x: number, [lo, hi]: readonly [number, number]): boolean =>
  x >= lo * (1 - RANGE_MARGIN) && x <= hi * (1 + RANGE_MARGIN);

/** The relative band at an operating point; doubled, and not inside, when the point is beyond the rows' range. */
export function bandAt(f: FitResult, v_pack: number, throttle: number): { rel: number | null; inside: boolean } {
  const inside = within(v_pack, f.v_range) && within(throttle, f.throttle_range);
  if (f.band === null) return { rel: null, inside };
  return { rel: inside ? f.band : 2 * f.band, inside };
}
