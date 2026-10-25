import { afterEach, describe, expect, it } from 'vitest';
import en from '@/i18n/content/en/drones/gpscam.json';
import { calc, designChecks } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { checkCraft, openFigure } from './_checks';
import gpscam from './gpscam';

checkCraft(gpscam, en, { allSnippetsInEmulator: true });

describe('gpscam design', () => {
  it('flies the default 4S build for about 20 minutes, and calls 3S too weak for a camera drone', () => {
    const r = calc(designInput(gpscam.design, gpscam.design.default));
    expect(r.hoverMin).toBeGreaterThan(19);
    expect(calc(designInput(gpscam.design, { ...gpscam.design.default, batt: '3s5000' })).weak).toBe(true);
  });

  it('warns that the default hovers high, which the ok verdict explains as the calculator being pessimistic', () => {
    const codes = designChecks(designInput(gpscam.design, gpscam.design.default)).map((c) => c.code);
    expect(codes).toEqual(['hover-high']);
    expect(en.design.verdict.ok).toMatch(/learns the real value/);
  });
});

describe('gpscam frame', () => {
  it('numbers and spins the motors like ArduCopter QUAD X, 450 mm across the diagonal', () => {
    const a = 450 / 2 / Math.SQRT2;
    const want = [
      ['M1', 1, -1, 'CCW'],
      ['M2', -1, 1, 'CCW'],
      ['M3', 1, 1, 'CW'],
      ['M4', -1, -1, 'CW'],
    ] as const;
    gpscam.frame.motors.forEach(([x, y, label, dir], i) => {
      const [id, sx, sy, spin] = want[i];
      expect([label, dir]).toEqual([id, spin]);
      expect(Math.abs(x - sx * a)).toBeLessThan(0.05);
      expect(Math.abs(y - sy * a)).toBeLessThan(0.05);
    });
  });
});

describe('gpscam flight', () => {
  const p = gpscam.flight.params;
  const cli = gpscam.firmware.emulator.settings;
  const [course] = gpscam.courses;

  it('sets the same numbers in the parameters as the sim flies', () => {
    expect(cli.ATC_ANGLE_MAX).toBe(p.angleLimit);
    expect(cli.LOIT_SPEED_MS).toBe(p.loiterSpeed);
    expect(cli.RTL_ALT_M).toBe(p.rtlAlt);
    expect(cli.PILOT_SPD_UP).toBe(p.climbRate);
    for (const e of gpscam.firmware.emulator.effects) {
      for (const [name, value] of Object.entries(e.set)) {
        if (cli[e.setting] === e.equals && name in p) expect(p[name], `${e.setting} = ${e.equals}`).toBe(value);
      }
    }
  });

  it('returns home above everything on the field', () => {
    for (const prim of course.prims) {
      if (prim.type === 'flat' || prim.type === 'disc') continue;
      const top = ('z' in prim ? prim.z ?? 0 : 0) + (prim.h ?? 0) + (prim.type === 'house' ? prim.roof ?? 0 : 0);
      expect(top, prim.type).toBeLessThan(p.rtlAlt);
    }
  });

  it('flies the inspection in AUTO: take off, four photo stops, land on the pad', () => {
    const auto = gpscam.flight.modes.find((m) => m.kind === 'auto')!;
    expect(auto.mission).toBe(course.id);
    expect(course.kind).toBe('mission');
    const photos = course.goals.filter((g) => g.action === 'photo');
    expect(photos).toHaveLength(4);
    for (const g of photos) expect(Math.hypot(g.x - 30, g.y - 30)).toBe(8);
    const home = course.goals.at(-1)!;
    expect([home.x, home.y, home.land]).toEqual([...course.pad, true]);
    expect(cli.WP_SPD).toBe(photos[0].speed);
  });

  it('keeps the camera level on its gimbal and opens in Loiter', () => {
    expect(gpscam.flight.fpv.gimbal).toBe(true);
    expect(gpscam.flight.defaultMode).toBe('loiter');
    expect(cli.MNT1_TYPE).toBe(7);
  });
});

describe('gpscam craft tests in the figure', { timeout: 300000 }, () => {
  let fig: Awaited<ReturnType<typeof openFigure>> | null = null;
  afterEach(() => {
    fig?.close();
    fig = null;
  });
  const test = (id: string) => gpscam.tests.find((t) => t.id === id)!;
  /**
   * The checks run on the figure's clock: animation frames, which jsdom spaces out and the engine caps per frame, so
   * a 4 s calibration takes 6 s of real time on an idle machine and much longer on a busy one. Wait for the result.
   */
  const until = async (id: string, want: 'passed' | 'failed', ms = 120000) => {
    const end = Date.now() + ms;
    while (fig!.status(test(id)) !== want && Date.now() < end) await new Promise((r) => setTimeout(r, 50));
    return fig!.status(test(id));
  };

  it('calibrates the compass only with the props off', async () => {
    fig = await openFigure('gpscam');
    // taking the GPS puck off clears the factory calibration
    await fig.remove('GPS');
    await fig.add('GPS');
    expect(fig.status(test('compass'))).toBe('failed');
    await fig.press('compass');
    expect(fig.status(test('compass'))).toBe('failed');
    await fig.remove('PROPS');
    await fig.press('compass');
    expect(await until('compass', 'passed')).toBe('passed');
    expect(fig.page.notes()).toEqual([]);
  });

  it('gets a GPS lock only when powered, and the pre-arm checks pass once it has one', async () => {
    fig = await openFigure('gpscam');
    await fig.press('gps');
    expect(fig.status(test('gps'))).toBe('failed');
    await fig.run('plugIn');
    await fig.press('prearm');
    expect(fig.status(test('prearm'))).toBe('failed');
    await fig.press('gps');
    expect(await until('gps', 'passed')).toBe('passed');
    await fig.press('prearm');
    expect(fig.status(test('prearm'))).toBe('passed');
  });

  it('needs a new compass calibration after the GPS is re-seated, and fails the pre-arm checks with the puck turned round', async () => {
    fig = await openFigure('gpscam');
    await fig.add('GPS', 1);
    expect(fig.status(test('compass'))).toBe('failed');
    await fig.remove('PROPS');
    await fig.press('compass');
    expect(await until('compass', 'passed')).toBe('passed');
    await fig.run('plugIn');
    await fig.press('gps');
    expect(await until('gps', 'passed')).toBe('passed');
    await fig.press('prearm');
    expect(fig.status(test('prearm'))).toBe('failed');
    expect((fig.state().log as { lines: string[] }).lines.at(-1)).toBe('PreArm: Compasses inconsistent');
  });

  it('runs the failsafe test only with the props off and the pack in, and a re-seated receiver needs it again', async () => {
    fig = await openFigure('gpscam');
    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(fig.status(test('failsafe'))).toBe('failed');
    await fig.run('unplug');
    await fig.remove('PROPS');
    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(await until('failsafe', 'passed')).toBe('passed');
    await fig.run('unplug');
    await fig.remove('RX');
    await fig.add('RX');
    expect(fig.status(test('failsafe'))).toBe('failed');
  });

  it('sweeps the gimbal once it has power, and again after the gimbal is re-seated', async () => {
    fig = await openFigure('gpscam');
    await fig.press('gimbal');
    expect(fig.status(test('gimbal'))).toBe('failed');
    await fig.run('plugIn');
    await fig.press('gimbal');
    expect(await until('gimbal', 'passed')).toBe('passed');
    await fig.run('unplug');
    await fig.remove('GIMBAL');
    await fig.add('GIMBAL');
    expect(fig.status(test('gimbal'))).toBe('failed');
  });
});
