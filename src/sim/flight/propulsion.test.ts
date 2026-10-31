import { describe, expect, it } from 'vitest';
import type { MotorSI, PropSI } from '../../parts/mechanics';
import { isOutOfRange, type OutOfRange } from './guards';
import {
  dutyForThrust,
  maxThrust,
  rotorOf,
  SEA_LEVEL_AIR,
  solveRotor,
  solveStatic,
  type Drive,
  type PackModel,
  type RotorSI,
  type StaticPoint,
} from './propulsion';

const SEC_PER_MIN = 60;
const keOf = (kv: number) => SEC_PER_MIN / (2 * Math.PI * kv);

const motor = (kv: number, r: number, i0: number): MotorSI => ({
  kv_rpm_per_v: kv,
  ke_vs_per_rad: keOf(kv),
  r_ohm: r,
  i0_a: i0,
  mass_g: 30,
});
const prop = (d: number, ct0: number, cp0: number): PropSI => ({
  d_m: d,
  pitch_m: 0.1,
  blades: 2,
  ct0,
  cp0,
  mass_g: 5,
  hasAdvanceTables: false,
});

const rotor = (m: MotorSI, p: PropSI): RotorSI => {
  const r = rotorOf(m, p, SEA_LEVEL_AIR);
  if (isOutOfRange(r)) throw new Error(r.field);
  return r;
};
const point = (p: StaticPoint | OutOfRange): StaticPoint => {
  if (isOutOfRange(p)) throw new Error(p.field);
  return p;
};

const scratch = rotor(motor(1750, 0.045, 1.5), prop(0.1295, 0.12, 0.06));
const stiff: PackModel = { open_v: () => 16, r_ohm: 0, idle_a: 0 };
const soft: PackModel = { open_v: () => 16, r_ohm: 0.05, idle_a: 0.2 };

function seeded(seed: number) {
  let s = seed >>> 0;
  return (lo: number, hi: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return lo + (s / 4294967296) * (hi - lo);
  };
}

describe('solveRotor', () => {
  it('matches the scratch case at 16 V', () => {
    const m = solveRotor(scratch, 16);
    expect(m.thrust_n).toBeCloseTo(8.167, 2);
    expect(Math.abs(m.thrust_n - 8.167) / 8.167).toBeLessThan(1e-3);
    expect(Math.abs(m.current_a - 16.92) / 16.92).toBeLessThan(1e-3);
    expect(Math.abs(m.rpm - 26667) / 26667).toBeLessThan(1e-3);
  });

  it('stalls when the voltage cannot cover the no-load current', () => {
    const m = solveRotor(scratch, 0.06);
    expect(m.omega).toBe(0);
    expect(m.thrust_n).toBe(0);
    expect(m.current_a).toBeCloseTo(0.06 / 0.045, 12);
    expect(solveRotor(scratch, 0).current_a).toBe(0);
  });
});

describe('DA-04 random parts', () => {
  it('keeps the torque residual under 1e-9 and thrust non-decreasing in duty', () => {
    const u = seeded(7);
    for (let n = 0; n < 10000; n++) {
      const r = rotor(
        motor(u(50, 5000), u(0.005, 2), u(0, 5)),
        prop(u(0.03, 0.5), u(0.02, 0.3), u(0.01, 0.2)),
      );
      const v = u(1, 60);
      let last = -1;
      for (let k = 0; k <= 20; k++) {
        const m = solveRotor(r, (k / 20) * v);
        const resid = m.omega === 0 ? 0 : Math.abs(m.torque_nm - r.ke * (m.current_a - r.i0));
        expect(resid).toBeLessThan(1e-9);
        expect(m.thrust_n).toBeGreaterThanOrEqual(last);
        expect(Number.isFinite(m.current_a) && Number.isFinite(m.rpm)).toBe(true);
        last = m.thrust_n;
      }
    }
  });
});

describe('solveStatic', () => {
  const drives: Drive[] = [{ rotor: scratch, escEff: 0.97 }, { rotor: scratch, escEff: 0.97 }];

  it('gives the open voltage when nothing draws current', () => {
    const p = point(solveStatic(drives, 0, 1, stiff));
    expect(p.v_pack).toBe(16);
    expect(p.i_pack).toBe(0);
  });

  it('sags the pack more as the current rises', () => {
    const half = point(solveStatic(drives, 0.5, 0.8, soft));
    const full = point(solveStatic(drives, 1, 0.8, soft));
    expect(full.i_pack).toBeGreaterThan(half.i_pack);
    expect(full.v_pack).toBeLessThan(half.v_pack);
    expect(full.v_pack).toBeLessThan(16);
    expect(full.residual_nm).toBeLessThan(1e-9);
  });

  it('takes a duty per motor and solves each', () => {
    const p = point(solveStatic(drives, [1, 0.5], 1, stiff));
    expect(p.motors[0]!.thrust_n).toBeGreaterThan(p.motors[1]!.thrust_n);
  });

  it('runs exactly three sag passes', () => {
    let calls = 0;
    const counting: PackModel = { ...soft, open_v: (s) => (calls++, 12 + 4 * s) };
    const p = point(solveStatic(drives, 1, 1, counting));
    expect(calls).toBe(1);
    let v = 16;
    for (let i = 0; i < 3; i++) {
      const m = solveRotor(scratch, v * 0.97);
      v = 16 - 0.05 * (2 * m.current_a + 0.2);
    }
    expect(p.v_pack).toBeCloseTo(v, 12);
  });

  it('reports bad inputs by field', () => {
    const field = (x: unknown) => (isOutOfRange(x) ? x.field : null);
    expect(field(solveStatic(drives, 1.1, 1, soft))).toBe('duty[0]');
    expect(field(solveStatic(drives, [1], 1, soft))).toBe('duty.length');
    expect(field(solveStatic(drives, 1, NaN, soft))).toBe('soc');
    expect(field(solveStatic(drives, NaN, 1, soft))).toBe('duty[0]');
    expect(field(solveStatic([{ rotor: scratch, escEff: 0 }], 1, 1, soft))).toBe('escEff[0]');
    expect(field(solveStatic(drives, 1, 1, { ...soft, open_v: () => Infinity }))).toBe('pack.open_v');
  });
});

describe('dutyForThrust', () => {
  const drives: Drive[] = Array.from({ length: 4 }, () => ({ rotor: scratch, escEff: 0.97 }));

  it('round-trips the thrust within 1e-9 N', () => {
    const target = 20;
    const duty = dutyForThrust(drives, 0.9, soft, target);
    expect(typeof duty).toBe('number');
    const p = point(solveStatic(drives, duty as number, 0.9, soft));
    const total = p.motors.reduce((s, m) => s + m.thrust_n, 0);
    expect(Math.abs(total - target)).toBeLessThan(1e-9);
  });

  it('is unreachable above the full-throttle thrust', () => {
    const top = point(maxThrust(drives, 0.9, soft)).motors.reduce((s, m) => s + m.thrust_n, 0);
    expect(dutyForThrust(drives, 0.9, soft, top * 1.01)).toBe('unreachable');
    expect(dutyForThrust(drives, 0.9, soft, NaN)).toBe('unreachable');
  });
});

describe('rotorOf', () => {
  const m = motor(1750, 0.045, 1.5);
  const p = prop(0.1295, 0.12, 0.06);

  it('names the field that is NaN, infinite, negative or zero', () => {
    const field = (r: unknown) => (isOutOfRange(r) ? r.field : null);
    expect(field(rotorOf({ ...m, r_ohm: NaN }, p, SEA_LEVEL_AIR))).toBe('r');
    expect(field(rotorOf({ ...m, ke_vs_per_rad: 0 }, p, SEA_LEVEL_AIR))).toBe('ke');
    expect(field(rotorOf({ ...m, i0_a: -1 }, p, SEA_LEVEL_AIR))).toBe('i0');
    expect(field(rotorOf(m, { ...p, d_m: Infinity }, SEA_LEVEL_AIR))).toBe('d_m');
    expect(field(rotorOf(m, { ...p, ct0: 0 }, SEA_LEVEL_AIR))).toBe('ct0');
    expect(field(rotorOf(m, { ...p, cp0: -0.1 }, SEA_LEVEL_AIR))).toBe('cp0');
    expect(field(rotorOf(m, p, { rho_kgm3: 0 }))).toBe('rho');
  });

  it('carries the prop speed limit', () => {
    expect(rotor(m, p).rpmMax).toBeNull();
    expect(rotor(m, { ...p, rpm_max: 30000 }).rpmMax).toBe(30000);
  });
});
