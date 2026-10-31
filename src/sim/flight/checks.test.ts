import { describe, expect, it } from 'vitest';
import { isCoreCauseId } from '../faults/cause-ids';
import { bannedHits } from './notices';
import { runChecks, THRESHOLDS, type BuildCheck, type CheckId, type CheckInput, type CheckSlot } from './checks';

const slot = (k: number, over: Partial<CheckSlot> = {}): CheckSlot => {
  const x = k % 2 === 0 ? 100 : -100;
  const y = k < 2 ? 100 : -100;
  return {
    id: `m${k}`,
    label: `Motor ${k}`,
    motor: { kv_rpm_per_v: 2400, ke_vs_per_rad: 0.004, r_ohm: 0.05, i0_a: 1, v_max: 26, mass_g: 30 },
    prop: { d_m: 0.127, pitch_m: 0.1, blades: 3, ct0: 0.1, cp0: 0.05, mass_g: 4, rpm_max: 40000, hasAdvanceTables: false },
    esc: { i_cont_a: 35, i_burst_a: 45, channels: 4, efficiency: 0.95, v_max: 26, mass_g: 10 },
    escLabel: 'ESC',
    spin: (k === 0 || k === 3) === true ? 'cw' : 'ccw',
    prop_spin: (k === 0 || k === 3) === true ? 'cw' : 'ccw',
    axis_mm: [x, y],
    z_mm: 0,
    ...over,
  };
};

const I3 = [[5, 0, 0], [0, 5, 0], [0, 0, 8]] as const;

function input(over: Partial<CheckInput> = {}): CheckInput {
  return {
    auw_n: 5,
    auw_g: 200,
    slots: [0, 1, 2, 3].map((k) => slot(k)),
    pack: { chem: 'lipo', cells: 4, parallel: 1, capacity_mah: 1300, r_cell_ohm: 0.005, c_continuous: 75, c_burst: 150, mass_g: 150 },
    packLabel: 'Pack',
    frame: { mass_g: 100, prop_max_in: 5 },
    fc: { gyro: 'icm', loop_hz_max: 8000, mass_g: 10 },
    flight: { model: 'multirotor-rigid@1', pid_hz: 1000, gyroLpfHz: 200 },
    full: { thrust_n: 20, i_pack_a: 60, i_motor_a: [15, 15, 15, 15], rpm_noload: [30000, 30000, 30000, 30000], v_cell_loaded: 3.8 },
    hover: { throttle: 0.5, torque_nm: [0.01, 0.01, 0.01, 0.01] },
    endurance: { low_s: 300, typ_s: 360, high_s: 420, basis: 'fit-band' },
    mass: { mass_g: 500, com_mm: [0, 0, 0], inertia_g_mm2: I3 },
    cg: { fraction: 0.01 },
    clash: { pairs: [], worst: null },
    classMinTW: 2,
    makerLimitsExceeded: [],
    missing: [],
    ...over,
  };
}

const pick = (i: CheckInput, id: CheckId): BuildCheck => {
  const c = runChecks(i).checks.find((x) => x.id === id);
  if (!c) throw new Error(`${id} missing`);
  return c;
};

const swap = (a: CheckSlot): CheckSlot => ({ ...a, prop_spin: a.spin === 'cw' ? 'ccw' : 'cw' });

describe('runChecks', () => {
  it('returns all fourteen checks and no error for a complete input', () => {
    const r = runChecks(input());
    expect(r.checks.map((c) => c.id)).toHaveLength(14);
    expect(new Set(r.checks.map((c) => c.id)).size).toBe(14);
    expect(r.errors).toEqual([]);
    expect(r.checks.filter((c) => c.result !== 'ok').map((c) => c.id)).toEqual([]);
  });

  it('DB-C-01 warns under the class minimum and fails under 1', () => {
    expect(pick(input({ full: { ...input().full, thrust_n: 10.1 } }), 'DB-C-01').result).toBe('ok');
    expect(pick(input({ full: { ...input().full, thrust_n: 9.9 } }), 'DB-C-01').result).toBe('warn');
    const fail = pick(input({ full: { ...input().full, thrust_n: 4.9 } }), 'DB-C-01');
    expect(fail.result).toBe('fail');
    expect(fail.limit).toBe(1);
    expect(fail.cause_id).toBe('thrust-to-weight-low');
  });

  it('DB-C-02 warns above 0.6', () => {
    expect(pick(input({ hover: { throttle: 0.6, torque_nm: [0.01, 0.01, 0.01, 0.01] } }), 'DB-C-02').result).toBe('ok');
    const c = pick(input({ hover: { throttle: 0.61, torque_nm: [0.01, 0.01, 0.01, 0.01] } }), 'DB-C-02');
    expect(c.result).toBe('warn');
    expect(c.cause_id).toBe('hover-throttle-too-high');
  });

  it('DB-C-03 compares the worst motor with the ESC', () => {
    const at = (a: number) => pick(input({ full: { ...input().full, i_motor_a: [15, a, 15, 15] } }), 'DB-C-03');
    expect(at(35).result).toBe('ok');
    const warn = at(36);
    expect(warn.result).toBe('warn');
    expect(warn.limit).toBe(35);
    expect(warn.limitingPart).toBe('ESC');
    const fail = at(46);
    expect(fail.result).toBe('fail');
    expect(fail.limit).toBe(45);
    expect(fail.cause_id).toBe('esc-overcurrent');
  });

  it('DB-C-04 names the pack when its C rating is exceeded', () => {
    const at = (a: number, pack = input().pack) => pick(input({ pack, full: { ...input().full, i_pack_a: a } }), 'DB-C-04');
    expect(at(97.5).result).toBe('ok');
    const warn = at(98);
    expect(warn.result).toBe('warn');
    expect(warn.limitingPart).toBe('Pack');
    expect(warn.limit).toBeCloseTo(97.5);
    expect(at(196).result).toBe('fail');
    expect(warn.cause_id).toBe('battery-overcurrent');
  });

  it('DB-C-04 limits Li-ion packs to 45 A per parallel cell', () => {
    const pack = { ...input().pack, chem: 'liion' as const, parallel: 2, c_continuous: undefined, c_burst: undefined };
    expect(at(pack, 90).result).toBe('ok');
    expect(at(pack, 91).result).toBe('warn');
    function at(p: typeof pack, a: number) {
      return pick(input({ pack: p, full: { ...input().full, i_pack_a: a } }), 'DB-C-04');
    }
  });

  it('DB-C-04 is info when a lipo pack states no C rating', () => {
    const pack = { ...input().pack, c_continuous: undefined, c_burst: undefined };
    expect(pick(input({ pack }), 'DB-C-04').result).toBe('info');
  });

  it('DB-C-05 fails on over-spin and on voltage ratings', () => {
    expect(pick(input(), 'DB-C-05').result).toBe('ok');
    const spin = pick(input({ full: { ...input().full, rpm_noload: [30000, 40001, 30000, 30000] } }), 'DB-C-05');
    expect(spin.result).toBe('fail');
    expect(spin.limitingPart).toBe('Motor 1');
    const low = input({ slots: [0, 1, 2, 3].map((k) => slot(k, { motor: { ...slot(k).motor, v_max: 16 } })) });
    expect(pick(low, 'DB-C-05').result).toBe('fail');
    const volts = input({ slots: [0, 1, 2, 3].map((k) => slot(k, { esc: { ...slot(k).esc, v_max: 16 } })) });
    const v = pick(volts, 'DB-C-05');
    expect(v.result).toBe('fail');
    expect(v.unit).toBe('V');
  });

  it('DB-C-05 uses 4.35 V per cell for lihv', () => {
    const pack = { ...input().pack, chem: 'lihv' as const };
    const slots = [0, 1, 2, 3].map((k) => slot(k, { motor: { ...slot(k).motor, v_max: 17.2 } }));
    expect(pick(input({ pack, slots }), 'DB-C-05').result).toBe('fail');
    expect(pick(input({ slots }), 'DB-C-05').result).toBe('ok');
  });

  it('DB-C-06 names both motors of a clashing pair', () => {
    const pair = { a: 'm0', b: 'm1', centre_mm: 150, needed_mm: 180, short_mm: 30, kind: 'adjacent' as const };
    const c = pick(input({ clash: { pairs: [pair], worst: pair } }), 'DB-C-06');
    expect(c.result).toBe('fail');
    expect(c.limitingPart).toBe('m0, m1');
    expect(c.cause_id).toBe('prop-clash');
    expect(pick(input(), 'DB-C-06').result).toBe('ok');
  });

  it('DB-C-06 turns an out-of-range clash into a field error', () => {
    const r = runChecks(input({ clash: { error: 'out-of-range', field: 'discs[0].r_mm', value: 0, min: 0, max: Infinity } }));
    expect(r.checks).toHaveLength(13);
    expect(r.errors).toEqual([{ id: 'DB-E-FIELD', message_key: 'error.DB-E-FIELD', path: 'discs[0].r_mm' }]);
  });

  it('DB-C-07 fails when a prop is bigger than the frame takes', () => {
    const big = (d_m: number) => input({ slots: [0, 1, 2, 3].map((k) => slot(k, { prop: { ...slot(k).prop, d_m } })) });
    expect(pick(big(5 / 39.37), 'DB-C-07').result).toBe('ok');
    const c = pick(big(5.1 / 39.37), 'DB-C-07');
    expect(c.result).toBe('fail');
    expect(c.limit).toBe(5);
    expect(pick(input({ frame: { mass_g: 100 } }), 'DB-C-07').result).toBe('info');
  });

  it('DB-C-08 warns above 5 percent and fails above 12 percent', () => {
    const at = (fraction: number) => pick(input({ cg: { fraction } }), 'DB-C-08');
    expect(at(0.05).result).toBe('ok');
    expect(at(0.051).result).toBe('warn');
    expect(at(0.12).result).toBe('warn');
    const fail = at(0.121);
    expect(fail.result).toBe('fail');
    expect(fail.cause_id).toBe('cg-offset');
  });

  it('DB-C-09 warns under 2 minutes', () => {
    const at = (low_s: number) => pick(input({ endurance: { low_s, typ_s: 200, high_s: 300, basis: 'no-fit' } }), 'DB-C-09');
    expect(at(120).result).toBe('ok');
    expect(at(119).result).toBe('warn');
  });

  it('DB-C-10 reads the loaded cell voltage against the chemistry limits', () => {
    const at = (v_cell_loaded: number) => pick(input({ full: { ...input().full, v_cell_loaded } }), 'DB-C-10');
    expect(at(3.5).result).toBe('ok');
    expect(at(3.49).result).toBe('warn');
    expect(at(3.19).result).toBe('fail');
  });

  it('DB-C-11 fails on swapped props and warns on unbalanced yaw', () => {
    const slots = [0, 1, 2, 3].map((k) => (k === 2 ? swap(slot(k)) : slot(k)));
    const swapped = pick(input({ slots }), 'DB-C-11');
    expect(swapped.result).toBe('fail');
    expect(swapped.limitingPart).toBe('Motor 2');
    expect(swapped.cause_id).toBe('props-swapped');
    const torque = (q0: number) => pick(input({ hover: { throttle: 0.5, torque_nm: [q0, 0.01, 0.01, 0.01] } }), 'DB-C-11');
    expect(torque(0.01).result).toBe('ok');
    expect(torque(0.0112).result).toBe('ok');
    expect(torque(0.02).result).toBe('warn');
  });

  it('DB-C-12 applies to the rigid model only', () => {
    const game = pick(input({ flight: { model: 'flight-game@1' } }), 'DB-C-12');
    expect(game.result).toBe('ok');
    expect(game.value).toBeNull();
    expect(game.assumptions).toContain('not used by the game model');
    const at = (pid_hz: number, gyroLpfHz = 100) => pick(input({ flight: { model: 'multirotor-rigid@1', pid_hz, gyroLpfHz } }), 'DB-C-12');
    expect(at(8000).result).toBe('ok');
    expect(at(8001).result).toBe('fail');
    expect(at(1000, 499).result).toBe('ok');
    expect(at(1000, 500).result).toBe('warn');
  });

  it('DB-C-13 is info above 250 g', () => {
    expect(pick(input({ auw_g: 250 }), 'DB-C-13').result).toBe('ok');
    expect(pick(input({ auw_g: 251 }), 'DB-C-13').result).toBe('info');
  });

  it('DB-C-14 warns and names the first part over its maker rating', () => {
    const c = pick(input({ makerLimitsExceeded: [{ part: 'Motor 2', field: 'i_max_a' }, { part: 'ESC', field: 'v_max' }] }), 'DB-C-14');
    expect(c.result).toBe('warn');
    expect(c.limitingPart).toBe('Motor 2');
    expect(pick(input(), 'DB-C-14').result).toBe('ok');
  });

  it('leaves out a check whose input is missing', () => {
    const r = runChecks(input({ frame: null, fc: null, cg: null, endurance: null }));
    expect(r.checks.map((c) => c.id)).toEqual(['DB-C-01', 'DB-C-02', 'DB-C-03', 'DB-C-04', 'DB-C-05', 'DB-C-06', 'DB-C-10', 'DB-C-11', 'DB-C-13', 'DB-C-14']);
  });

  it('keeps the thresholds frozen and the cause ids in the registry', () => {
    expect(Object.isFrozen(THRESHOLDS)).toBe(true);
    expect(THRESHOLDS).toMatchObject({ minTW: 2, hoverThrottle: 0.6, cgWarn: 0.05, cgFail: 0.12, yawBalance: 0.05, massChipG: 250, shortFlightMin: 2, clearanceMm: 5 });
    const pair = { a: 'm0', b: 'm1', centre_mm: 1, needed_mm: 9, short_mm: 8, kind: 'adjacent' as const };
    const bad = input({
      full: { thrust_n: 4, i_pack_a: 999, i_motor_a: [99, 99, 99, 99], rpm_noload: [50000, 50000, 50000, 50000], v_cell_loaded: 3 },
      hover: { throttle: 0.9, torque_nm: [0.01, 0.01, 0.01, 0.01] },
      slots: [0, 1, 2, 3].map((k) => (k === 1 ? swap(slot(k)) : slot(k))),
      cg: { fraction: 0.2 },
      clash: { pairs: [pair], worst: pair },
    });
    const ids = runChecks(bad).checks.map((c) => c.cause_id).filter((c): c is string => c !== null);
    expect(ids.length).toBeGreaterThanOrEqual(7);
    for (const id of ids) expect(isCoreCauseId(id), id).toBe(true);
  });

  it('uses no banned word in any formula or assumption', () => {
    const all = [input(), input({ auw_g: 400, makerLimitsExceeded: [{ part: 'Pack', field: 'c' }] })].flatMap((i) => runChecks(i).checks);
    for (const c of all) expect(bannedHits([c.formula, ...c.assumptions].join(' ')), c.id).toEqual([]);
  });
});

describe('structural errors', () => {
  const ids = (i: CheckInput) => runChecks(i).errors.map((e) => e.id);

  it('DB-E-INERTIA when mass is missing or not positive definite', () => {
    expect(ids(input({ mass: null }))).toContain('DB-E-INERTIA');
    const flat = { mass_g: 1, com_mm: [0, 0, 0] as const, inertia_g_mm2: [[1, 0, 0], [0, 1, 0], [0, 0, 0]] as const };
    expect(ids(input({ mass: flat }))).toContain('DB-E-INERTIA');
    expect(ids(input())).not.toContain('DB-E-INERTIA');
  });

  it('DB-E-MIXER when the motors cannot control roll and pitch', () => {
    const line = [0, 1, 2, 3].map((k) => slot(k, { axis_mm: [k * 50, 0], spin: 'cw', prop_spin: 'cw' }));
    expect(ids(input({ slots: line }))).toContain('DB-E-MIXER');
  });

  it('DB-E-MIXER-YAW when every motor spins the same way', () => {
    const same = [0, 1, 2, 3].map((k) => slot(k, { spin: 'cw', prop_spin: 'cw' }));
    const found = ids(input({ slots: same }));
    expect(found).toContain('DB-E-MIXER-YAW');
    expect(found).not.toContain('DB-E-MIXER');
    expect(ids(input())).not.toContain('DB-E-MIXER-YAW');
  });

  it('DB-E-FIELD once per missing path', () => {
    const r = runChecks(input({ missing: [{ path: 'motor.i0_a', why: 'x' }, { path: 'esc.efficiency', why: 'y' }] }));
    expect(r.errors.filter((e) => e.id === 'DB-E-FIELD').map((e) => e.path)).toEqual(['motor.i0_a', 'esc.efficiency']);
  });

  it('DB-E-CHEMISTRY for an unknown chemistry', () => {
    const pack = { ...input().pack, chem: 'nimh' as never };
    expect(ids(input({ pack }))).toContain('DB-E-CHEMISTRY');
    expect(pick(input({ pack }), 'DB-C-10').result).toBe('info');
  });
});
