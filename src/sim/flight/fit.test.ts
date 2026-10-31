import { describe, expect, it } from 'vitest';
import type { MotorSI, PropSI } from '../../parts/mechanics';
import { bandAt, BAND_FACTOR, fitDatasheet, type FitResult, type FitRow } from './fit';
import { isOutOfRange } from './guards';
import { rotorOf, SEA_LEVEL_AIR, solveRotor } from './propulsion';

const KV = 2300;
const motor: MotorSI = {
  kv_rpm_per_v: KV,
  ke_vs_per_rad: 60 / (2 * Math.PI * KV),
  r_ohm: 0.045,
  i0_a: 1.2,
  mass_g: 30,
};
const D_M = 0.127;
const ESC_EFF = 0.98;
const TRUTH = { ct0: 0.11, cp0: 0.055 };
const G_PER_N = 1 / 9.80665e-3;

const trueProp: PropSI = {
  d_m: D_M,
  pitch_m: 0.1,
  blades: 2,
  ct0: TRUTH.ct0,
  cp0: TRUTH.cp0,
  mass_g: 5,
  hasAdvanceTables: false,
};

const rotor = rotorOf(motor, trueProp, SEA_LEVEL_AIR);
if (isOutOfRange(rotor)) throw new Error(rotor.field);

const measure = (v_pack: number, throttle: number, noise: () => number): FitRow => {
  const p = solveRotor(rotor, throttle * v_pack * ESC_EFF);
  return {
    v_pack,
    throttle,
    thrust_g: p.thrust_n * G_PER_N * noise(),
    current_a: throttle * p.current_a * noise(),
  };
};

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const gaussianNoise = (sigma: number, rand: () => number) => () => {
  const u = 1 - rand();
  const v = rand();
  return 1 + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const THROTTLES = [0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1];
const VOLTS = [11.1, 14.8];
const grid = (noise: () => number): FitRow[] =>
  VOLTS.flatMap((v) => THROTTLES.map((t) => measure(v, t, noise)));

const fit = (rows: FitRow[]): FitResult => {
  const f = fitDatasheet(rows, motor, D_M, ESC_EFF, SEA_LEVEL_AIR);
  if (isOutOfRange(f)) throw new Error(f.field);
  return f;
};

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

describe('fitDatasheet', () => {
  it('recovers the known coefficients from noise-free rows', () => {
    const f = fit(grid(() => 1));
    expect(f.converged).toBe(true);
    expect(f.ct0).toBeCloseTo(TRUTH.ct0, 6);
    expect(f.cp0).toBeCloseTo(TRUTH.cp0, 6);
    expect(f.rms_thrust).toBeLessThan(1e-6);
    expect(f.n).toBe(16);
    expect(f.iterations).toBeLessThanOrEqual(50);
  });

  it('meets DA-05: held-out thrust within 5 percent and band coverage of 90 percent', () => {
    const noise = gaussianNoise(0.03, mulberry32(20261031));
    const clean = grid(() => 1);
    let covered = 0;
    let coveredNoisy = 0;
    let heldOut = 0;
    let goodTrials = 0;
    const TRIALS = 200;
    for (let t = 0; t < TRIALS; t++) {
      const rows = clean.map((row) => ({ ...row, thrust_g: row.thrust_g * noise(), current_a: row.current_a * noise() }));
      const f = fit(rows.filter((_, i) => i % 4 !== 3));
      const fitted = rotorOf(motor, { ...trueProp, ct0: f.ct0, cp0: f.cp0 }, SEA_LEVEL_AIR);
      if (isOutOfRange(fitted)) throw new Error(fitted.field);
      const errs = clean.flatMap((row, i) => {
        if (i % 4 !== 3) return [];
        const predicted = solveRotor(fitted, row.throttle * row.v_pack * ESC_EFF).thrust_n * G_PER_N;
        return [{ truth: Math.abs(predicted - row.thrust_g) / row.thrust_g, noisy: Math.abs(predicted - rows[i]!.thrust_g) / rows[i]!.thrust_g }];
      });
      if (median(errs.map((e) => e.truth)) < 0.05) goodTrials++;
      for (const e of errs) {
        heldOut++;
        if (f.band !== null && e.truth <= f.band) covered++;
        if (f.band !== null && e.noisy <= f.band) coveredNoisy++;
      }
    }
    const coverage = covered / heldOut;
    console.log(
      `DA-05 band coverage ${(coverage * 100).toFixed(1)} percent of the model's true error, ` +
        `${((coveredNoisy / heldOut) * 100).toFixed(1)} percent of the distance to the noisy rows, over ${heldOut} held-out points`,
    );
    expect(goodTrials / TRIALS).toBeGreaterThanOrEqual(0.95);
    expect(coverage).toBeGreaterThanOrEqual(0.9);
  });

  it('gives identical results on two runs', () => {
    const rows = grid(gaussianNoise(0.03, mulberry32(7)));
    expect(fit(rows)).toEqual(fit(rows));
  });

  it('uses the named band factor', () => {
    const f = fit(grid(gaussianNoise(0.03, mulberry32(3))));
    expect(f.band).toBe(BAND_FACTOR * Math.max(f.rms_thrust, f.rms_current));
  });

  it('rejects fewer than 4 rows and more than 32', () => {
    const rows = grid(() => 1);
    const few = fitDatasheet(rows.slice(0, 3), motor, D_M, ESC_EFF, SEA_LEVEL_AIR);
    expect(isOutOfRange(few) && few.field).toBe('rows');
    const many = fitDatasheet([...rows, ...rows, ...rows.slice(0, 1)], motor, D_M, ESC_EFF, SEA_LEVEL_AIR);
    expect(isOutOfRange(many) && many.field).toBe('rows');
  });

  it('drops rows without thrust or current, with a warning', () => {
    const rows = [...grid(() => 1), { v_pack: 11.1, throttle: 0.1, thrust_g: 0, current_a: 0.5 }];
    const f = fit(rows);
    expect(f.n).toBe(16);
    expect(f.warnings).toHaveLength(1);
    const left = fitDatasheet(rows.slice(14), motor, D_M, ESC_EFF, SEA_LEVEL_AIR);
    expect(isOutOfRange(left)).toBe(true);
  });

  it('rejects a throttle outside 0 to 1', () => {
    const rows = grid(() => 1);
    rows[2] = { ...rows[2]!, throttle: 1.2 };
    const out = fitDatasheet(rows, motor, D_M, ESC_EFF, SEA_LEVEL_AIR);
    expect(isOutOfRange(out) && out.field).toBe('rows[2].throttle');
  });

  it('gives no band when the rows are nonsense', () => {
    const rand = mulberry32(11);
    const rows: FitRow[] = Array.from({ length: 8 }, () => ({
      v_pack: 11.1,
      throttle: 0.2 + 0.1 * rand(),
      thrust_g: 1e6 * (0.5 + rand()),
      current_a: 1e-3 * (0.5 + rand()),
    }));
    const f = fitDatasheet(rows, motor, D_M, ESC_EFF, SEA_LEVEL_AIR);
    if (!isOutOfRange(f)) {
      expect(f.converged ? f.rms_thrust > 0.5 : f.band === null).toBe(true);
    }
  });
});

describe('bandAt', () => {
  const f = fit(grid(gaussianNoise(0.03, mulberry32(5))));

  it('gives the band inside the rows range', () => {
    expect(bandAt(f, 12, 0.5)).toEqual({ rel: f.band, inside: true });
  });

  it('doubles the band outside the range', () => {
    expect(bandAt(f, 22.2, 0.5)).toEqual({ rel: 2 * f.band!, inside: false });
    expect(bandAt(f, 12, 0.05).inside).toBe(false);
  });

  it('allows a 5 percent margin', () => {
    expect(bandAt(f, 11.1 * 0.96, 0.5).inside).toBe(true);
    expect(bandAt(f, 11.1 * 0.9, 0.5).inside).toBe(false);
  });

  it('has no band when the fit did not converge', () => {
    expect(bandAt({ ...f, band: null, converged: false }, 12, 0.5)).toEqual({ rel: null, inside: true });
  });
});
