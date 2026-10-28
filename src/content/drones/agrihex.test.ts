import { afterEach, describe, expect, it } from 'vitest';
import en from '@/i18n/content/en/drones/agrihex.json';
import { calc, designChecks } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { flightOf } from '@/lib/flight/registry';
import { checkCraft, figureSource, openFigure } from './_checks';
import agrihex from './agrihex';

checkCraft(agrihex, en, { allSnippetsInEmulator: true });

const checks = (pick: Partial<typeof agrihex.design.default>) =>
  designChecks(designInput(agrihex.design, { ...agrihex.design.default, ...pick })).map((c) => c.code);

describe('agrihex design', () => {
  it('lifts 10 L at 1.96:1 on the default build, and warns only that the hover throttle reads high', () => {
    const r = calc(designInput(agrihex.design, agrihex.design.default));
    expect(r.tw).toBeGreaterThan(agrihex.design.model.minTW);
    expect(checks({})).toEqual(['hover-high']);
    expect(en.design.verdict.ok).toMatch(/MOT_THST_HOVER/);
  });

  it('over-spins 30-inch props with 180 KV on 12S, and is too weak with 80 KV', () => {
    expect(checks({ motor: '6215-180' })).toContain('over-spin');
    expect(calc(designInput(agrihex.design, { ...agrihex.design.default, motor: '10025-80' })).weak).toBe(true);
    expect(en.quizzes.fly.kv.options['1']).toMatch(/1\.20:1/);
  });
});

describe('agrihex frame', () => {
  it('numbers and spins the motors like ArduCopter HEXA X, 1800 mm across', () => {
    // AP_MotorsMatrix setup_hexa_matrix, X: angle clockwise from the nose and spin, M1 to M6
    const want = [
      ['M1', 90, 'CW'],
      ['M2', -90, 'CCW'],
      ['M3', -30, 'CW'],
      ['M4', 150, 'CCW'],
      ['M5', 30, 'CCW'],
      ['M6', -150, 'CW'],
    ] as const;
    agrihex.frame.motors.forEach(([x, y, label, dir], i) => {
      const [id, deg, spin] = want[i];
      const a = (deg * Math.PI) / 180;
      expect([label, dir]).toEqual([id, spin]);
      // craft frame y points left, so a clockwise angle from the nose is -y
      expect(Math.abs(x - 900 * Math.cos(a))).toBeLessThan(0.05);
      expect(Math.abs(y + 900 * Math.sin(a))).toBeLessThan(0.05);
    });
  });

  it('spins the figure’s motors in Mission Planner’s motor-test order, clockwise from the front right', () => {
    const order = [...figureSource('agrihex').matchAll(/\{ id: '(M\d)', at: \[/g)].map((m) => m[1]);
    expect(order).toEqual(['M5', 'M1', 'M4', 'M6', 'M2', 'M3']);
    expect(en.tests.motors.pass).toMatch(/A is M5, B is M1, C is M4, D is M6, E is M2, F is M3/);
  });

  it('keeps 30-inch prop tips apart on 900 mm motor spacing', () => {
    const [m1, , , , m5] = agrihex.frame.motors;
    const gap = Math.hypot(m1[0] - m5[0], m1[1] - m5[1]) - 30 * 25.4;
    expect(Math.round(gap)).toBe(138);
    expect(en.parts.PROPS.what).toMatch(/138 mm/);
  });
});

describe('agrihex firmware', () => {
  const cli = agrihex.firmware.emulator.settings;

  it('puts the six motors on MAIN 1-6 and the pump on AUX 1, as the wiring sheet draws them', () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => cli[`SERVO${n}_FUNCTION`])).toEqual([33, 34, 35, 36, 37, 38]);
    expect(cli.SERVO9_FUNCTION).toBe(22);
    expect(agrihex.wiring.find((w) => w.from === 'FC' && w.to === 'ESC')!.label).toMatch(/^MAIN 1-6 · PWM 1050-1950/);
    expect(agrihex.wiring.find((w) => w.from === 'FC' && w.to === 'PUMP')!.label).toMatch(/^AUX 1/);
    expect([cli.MOT_PWM_TYPE, cli.MOT_PWM_MIN, cli.MOT_PWM_MAX]).toEqual([0, 1050, 1950]);
  });

  it('makes the two F9Ps a moving-baseline pair with the base in front, and takes yaw from them', () => {
    expect([cli.GPS1_TYPE, cli.GPS2_TYPE]).toEqual([17, 18]);
    expect([cli.GPS1_POS_X, cli.GPS2_POS_X]).toEqual([0.17, -0.17]);
    // 340 mm between the antennas: ArduPilot wants at least 300 mm
    expect(Number(cli.GPS1_POS_X) - Number(cli.GPS2_POS_X)).toBeGreaterThanOrEqual(0.3);
    expect(cli.EK3_SRC1_YAW).toBe(2);
    expect(cli.GPS_AUTO_SWITCH).not.toBe(2);
  });

  it('reads the radar as a downward US-D1 on TELEM2, never closer than it can measure', () => {
    expect([cli.SERIAL2_PROTOCOL, cli.RNGFND1_TYPE, cli.RNGFND1_ORIENT]).toEqual([9, 11, 25]);
    expect(cli.RNGFND1_MIN).toBe(0.5);
    expect(agrihex.wiring.find((w) => w.from === 'RADAR')!.label).toMatch(/^TELEM2/);
  });

  it('runs the pump at 10 % per m/s, so 40 % along the 4 m/s rows', () => {
    expect([cli.SPRAY_ENABLE, cli.SPRAY_PUMP_RATE, cli.SPRAY_SPEED_MIN, cli.RC7_OPTION]).toEqual([1, 10, 100, 15]);
    expect(Number(cli.SPRAY_PUMP_RATE) * Number(cli.WP_SPD)).toBe(40);
    expect(en.quizzes.boom.rate.why).toMatch(/10 % × 4 = 40 %/);
  });

  it('sets 12S voltages for the battery failsafes, with a 30 % reserve', () => {
    expect(cli.BATT_LOW_VOLT).toBeCloseTo(3.5 * 12, 9);
    expect(cli.BATT_CRT_VOLT).toBeCloseTo(3.4 * 12, 9);
    expect(cli.BATT_ARM_VOLT).toBeCloseTo(4.0 * 12, 9);
    expect(Number(cli.BATT_LOW_MAH) / Number(cli.BATT_CAPACITY)).toBe(0.3);
  });

  it('never writes the pre-4.7 centimetre names outside a comment', () => {
    const old = /\b(RTL_ALT|RTL_SPEED|LOIT_SPEED|LOIT_ACC_MAX|PILOT_SPEED_UP|WPNAV_\w+|ARMING_CHECK|FS_BATT_ENABLE|GPS_TYPE|RNGFND1_(MIN|MAX)_CM|TERRAIN_FOLLOW)\b(?!_)/;
    for (const s of agrihex.firmware.snippets) {
      for (const line of s.code.split('\n')) expect(line.replace(/#.*$/, ''), s.id).not.toMatch(old);
    }
  });
});

describe('agrihex flight', () => {
  const p = agrihex.flight.params;
  const cli = agrihex.firmware.emulator.settings;
  const [course] = agrihex.courses;
  const goals = course.goals;

  it('sets the same numbers in the parameters as the sim flies', () => {
    expect(cli.ATC_ANGLE_MAX).toBe(p.angleLimit);
    expect(cli.LOIT_SPEED_MS).toBe(p.loiterSpeed);
    expect(cli.RTL_ALT_M).toBe(p.rtlAlt);
    expect(cli.PILOT_SPD_UP).toBe(p.climbRate);
    expect(cli.FENCE_ALT_MAX).toBe(p.ceiling);
    for (const e of agrihex.firmware.emulator.effects) {
      for (const [name, value] of Object.entries(e.set)) {
        if (cli[e.setting] === e.equals && name in p) expect(p[name], `${e.setting} = ${e.equals}`).toBe(value);
      }
    }
  });

  it('comes home above everything on the farm', () => {
    for (const prim of course.prims) {
      if (prim.type === 'flat' || prim.type === 'disc') continue;
      const top = ('z' in prim ? prim.z ?? 0 : 0) + (prim.h ?? 0) + (prim.type === 'house' ? prim.roof ?? 0 : 0);
      expect(top, prim.type).toBeLessThan(p.rtlAlt - 1.5);
    }
  });

  it('sprays six rows one swath apart, 2.5 m up, pump on along each row and off at each end', () => {
    const rows = goals.slice(1, 13);
    expect(rows.map((g) => g.action)).toEqual(Array.from({ length: 12 }, (_, i) => (i % 2 ? 'spray-off' : 'spray-on')));
    for (let i = 0; i < 12; i += 2) {
      const [on, off] = [rows[i], rows[i + 1]];
      expect(on.y, `row ${i / 2 + 1}`).toBe(off.y);
      expect(Math.abs(off.x - on.x), `row ${i / 2 + 1}`).toBe(36);
      expect([on.z, off.z]).toEqual([2.5, 2.5]);
      expect(off.speed).toBe(cli.WP_SPD);
    }
    const lanes = [...new Set(rows.map((g) => g.y))];
    expect(lanes.slice(1).map((y, i) => y - lanes[i])).toEqual([4, 4, 4, 4, 4]);
    // every row inside the crop block, clear of the trees, the poles and the barn by more than a swath
    const crop = course.prims.find((q) => q.type === 'flat' && q.col === '#a9c88a')!;
    if (crop.type !== 'flat') throw new Error('no crop');
    for (const g of rows) {
      expect(Math.abs(g.x - crop.x), `${g.label}`).toBeLessThan(crop.w / 2);
      expect(Math.abs(g.y - crop.y), `${g.label}`).toBeLessThan(crop.d / 2);
      for (const q of course.prims) {
        if (q.type === 'flat' || q.type === 'disc') continue;
        expect(Math.hypot(q.x - g.x, q.y - g.y), `${g.label} near ${q.type} ${q.x},${q.y}`).toBeGreaterThan(4);
      }
    }
  });

  it('flies the spray mission in AUTO and lands on the pad, opening in Loiter', () => {
    const auto = agrihex.flight.modes.find((m) => m.kind === 'auto')!;
    expect(auto.mission).toBe(course.id);
    expect(course.kind).toBe('mission');
    const home = goals.at(-1)!;
    expect([home.x, home.y, home.z, home.land]).toEqual([...course.pad, 0, true]);
    expect(agrihex.flight.defaultMode).toBe('loiter');
    const flight = flightOf(agrihex)!;
    expect(flight.craft.look.arms).toBe(6);
    expect(flight.craft.look.propR).toBeCloseTo(0.381, 3);
    expect(flight.courses[0].missions?.[0].waypoints.filter((w) => w.action === 'spray-on')).toHaveLength(6);
  });
});

describe('agrihex craft tests in the figure', () => {
  let fig: Awaited<ReturnType<typeof openFigure>> | null = null;
  afterEach(() => {
    fig?.close();
    fig = null;
  });
  const test = (id: string) => agrihex.tests.find((t) => t.id === id)!;
  const extra = () => fig!.state().extra as Record<string, unknown>;

  it('runs the pump test only on a powered, plumbed drone, and re-plumbing the pump clears it', async () => {
    fig = await openFigure('agrihex');
    await fig.remove('PROPS');
    await fig.remove('BATT');
    await fig.remove('BOOM');
    expect(fig.status(test('pump'))).toBe('failed');
    await fig.press('pump');
    expect(fig.status(test('pump'))).toBe('failed');
    await fig.add('BOOM');
    await fig.add('BATT');
    await fig.press('pump');
    expect(fig.status(test('pump'))).toBe('failed');
    await fig.run('plugIn');
    await fig.press('pump');
    expect(fig!.until(() => fig!.status(test('pump')) === 'passed')).toBe(true);
    await fig.run('unplug');
    await fig.remove('BOOM');
    await fig.remove('PUMP');
    await fig.add('PUMP');
    await fig.add('BOOM');
    expect(fig.status(test('pump'))).toBe('failed');
    expect(fig.page.notes()).toEqual([]);
  });

  it('finds the RTK masts swapped: GPS yaw 180° out, and the pre-arm refuses until they are turned round', async () => {
    fig = await openFigure('agrihex');
    await fig.remove('PROPS');
    await fig.remove('BATT');
    await fig.remove('GPS');
    await fig.add('GPS', 1);
    await fig.add('BATT');
    await fig.run('plugIn');
    await fig.press('gpsyaw');
    expect(fig!.until(() => fig!.status(test('gpsyaw')) === 'failed')).toBe(true);
    // the run finishes, and the result is a 180° error rather than "not run"
    fig!.until(() => extra().yawErr === 180);
    expect(extra().yawErr).toBe(180);
    await fig.press('prearm');
    expect(fig.status(test('prearm'))).toBe('failed');
    expect(fig.st().msg).toMatch(/EKF3 Yaw inconsistent/);

    await fig.run('unplug');
    await fig.remove('BATT');
    await fig.remove('GPS');
    await fig.add('GPS');
    await fig.add('BATT');
    await fig.run('plugIn');
    await fig.press('gpsyaw');
    expect(fig!.until(() => fig!.status(test('gpsyaw')) === 'passed')).toBe(true);
    expect(extra().yawErr).toBe(0);
    await fig.press('prearm');
    expect(fig!.until(() => fig!.status(test('prearm')) === 'passed')).toBe(true);
    expect(fig.page.notes()).toEqual([]);
  });

  it('blocks arming without the radar, and starts a fresh build with every craft check unrun', async () => {
    fig = await openFigure('agrihex');
    fig.SD.actions.strip(fig.st());
    await fig.settle();
    fig.SD.actions.build(fig.st());
    await fig.settle();
    for (const id of ['pump', 'gpsyaw', 'prearm']) expect(fig.status(test(id)), id).toBe('failed');
    await fig.remove('PROPS');
    await fig.remove('RADAR');
    await fig.run('plugIn');
    await fig.press('prearm');
    expect(fig.st().msg).toMatch(/Rangefinder 1: No Data/);
    expect(fig.status(test('prearm'))).toBe('failed');
  });
});
