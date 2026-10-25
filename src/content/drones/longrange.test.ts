import { afterEach, describe, expect, it } from 'vitest';
import en from '@/i18n/content/en/drones/longrange.json';
import { calc } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { checkBetaflightSyntax, checkCraft, openFigure, text } from './_checks';
import longrange from './longrange';

checkCraft(longrange, en, { allSnippetsInEmulator: true });
checkBetaflightSyntax(longrange);

const code = (id: string) => longrange.firmware.snippets.find((s) => s.id === id)!.code;
const setting = (id: string, name: string) => {
  const m = new RegExp(`^set ${name} = (\\S+)`, 'm').exec(code(id));
  if (!m) throw new Error(`${id} sets no ${name}`);
  return m[1];
};

describe('longrange design', () => {
  it('calls the 4S 1700 KV motor over-spun on 6S and names the 6S motor class in its text', () => {
    for (const batt of Object.keys(longrange.design.batts)) {
      expect(calc(designInput(longrange.design, { batt, motor: '2807-1700', prop: '7x3.5x2' })).over, batt).toBe(true);
      expect(calc(designInput(longrange.design, { batt, motor: '2807-1300', prop: '7x3.5x2' })).over, batt).toBe(false);
    }
    expect(text(en, 'design.verdict.over')).toMatch(/about 1300 KV/);
  });

  it('tells the autopilot the hover throttle the calculator gives for the default build', () => {
    const r = calc(designInput(longrange.design, longrange.design.default));
    expect(Math.abs(Number(setting('rescue', 'ap_hover_throttle')) - (1000 + 1000 * r.hoverThr))).toBeLessThan(10);
  });
});

describe('longrange frame', () => {
  it('numbers and spins the motors like Betaflight QUAD X, props in, 315 mm across the diagonal', () => {
    const a = 315 / 2 / Math.SQRT2;
    const want = [
      ['M1', -1, -1, 'CW'],
      ['M2', 1, -1, 'CCW'],
      ['M3', -1, 1, 'CCW'],
      ['M4', 1, 1, 'CW'],
    ] as const;
    longrange.frame.motors.forEach(([x, y, label, dir], i) => {
      const [id, sx, sy, spin] = want[i];
      expect([label, dir]).toEqual([id, spin]);
      expect(Math.abs(x - sx * a)).toBeLessThan(0.05);
      expect(Math.abs(y - sy * a)).toBeLessThan(0.05);
    });
  });
});

describe('longrange firmware and flight', () => {
  const p = longrange.flight.params;

  it('flies the numbers its CLI snippets set', () => {
    expect(Number(setting('angle', 'angle_limit'))).toBe(p.angleLimit);
    expect(Number(setting('acro', 'roll_srate')) * 10).toBe(p.acroRate);
    expect(Number(setting('acro', 'yaw_srate')) * 10).toBe(p.yawRate);
    expect(Number(setting('alt', 'alt_hold_climb_rate')) / 10).toBe(p.climbRate);
    expect(Number(setting('rescue', 'gps_rescue_return_alt'))).toBe(p.rtlAlt);
    expect(Number(setting('rescue', 'gps_rescue_ground_speed')) / 100).toBe(p.rescueGroundSpeed);
    expect(Number(setting('rescue', 'gps_rescue_descent_dist'))).toBe(p.rescueDescentDist);
    expect(Number(setting('rescue', 'failsafe_delay')) / 10).toBe(p.failsafeDelay);
  });

  it('sets FIXED_ALT wherever it sets a return altitude (MAX_ALT ignores return_alt)', () => {
    for (const s of longrange.firmware.snippets) {
      if (/gps_rescue_return_alt/.test(s.code)) expect(s.code, s.id).toMatch(/^set gps_rescue_alt_mode = FIXED_ALT/m);
    }
  });

  it('gives the four flight channels only the rxfail modes Betaflight accepts on them (a or h)', () => {
    const lines = [...code('stage1').matchAll(/^rxfail (\d+) (\w)/gm)];
    expect(lines.length).toBeGreaterThan(0);
    for (const [line, channel, mode] of lines) if (Number(channel) < 4) expect(['a', 'h'], line).toContain(mode);
  });

  it('warns and lands at Li-ion voltages, below the LiPo defaults (350 and 330)', () => {
    const warn = Number(setting('liion', 'vbat_warning_cell_voltage'));
    const min = Number(setting('liion', 'vbat_min_cell_voltage'));
    expect(warn).toBeLessThan(350);
    expect(min).toBeLessThan(warn);
    expect(min).toBeGreaterThanOrEqual(250);
  });

  it('flies its courses on the valley field, the rescue mission included', () => {
    const rescue = longrange.courses.find((c) => c.kind === 'mission')!;
    expect(longrange.flight.modes.find((m) => m.kind === 'rth')!.mission).toBe(rescue.mission);
    expect(rescue.goals.at(-1)).toMatchObject({ x: rescue.pad[0], y: rescue.pad[1] });
    expect(Math.max(...rescue.goals.map((g) => g.z))).toBe(p.rtlAlt);
  });
});

describe('longrange craft tests in the figure', { timeout: 40000 }, () => {
  let fig: Awaited<ReturnType<typeof openFigure>> | null = null;
  afterEach(() => {
    fig?.close();
    fig = null;
  });
  const test = (id: string) => longrange.tests.find((t) => t.id === id)!;
  const extra = (name: string) => (fig!.state().extra as Record<string, unknown>)[name];

  it('passes the compass check with the module arrow forward, and not with it turned round', async () => {
    fig = await openFigure('longrange');
    await fig.press('compass');
    expect(fig.status(test('compass'))).toBe('passed');
    await fig.add('GPS', 1);
    await fig.press('compass');
    expect(fig.status(test('compass'))).toBe('failed');
    expect(extra('compassBack')).toBe(true);
  });

  it('needs a GPS lock, the props off and a battery before the failsafe test runs, then sees the rescue', async () => {
    fig = await openFigure('longrange');
    await fig.run('unplug');
    await fig.remove('PROPS');
    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(fig.status(test('failsafe'))).toBe('failed');
    await fig.press('gps');
    expect(fig.status(test('gps'))).toBe('passed');
    await fig.press('failsafe');
    expect(fig.status(test('failsafe'))).toBe('passed');
    expect(extra('rescue')).toBe('ok');
    expect(fig.page.notes()).toEqual([]);
  });
});
