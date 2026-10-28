import { afterEach, describe, expect, it } from 'vitest';
import en from '@/i18n/content/en/drones/cinewhoop.json';
import { calc } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { checkBetaflightSyntax, checkCraft, openFigure, text } from './_checks';
import cinewhoop from './cinewhoop';

checkCraft(cinewhoop, en);
checkBetaflightSyntax(cinewhoop);

const snippet = (id: string) => cinewhoop.firmware.snippets.find((s) => s.id === id)!.code;
const setting = (id: string, name: string) => {
  const m = new RegExp(`^set ${name} = (\\S+)`, 'm').exec(snippet(id));
  if (!m) throw new Error(`${id} sets no ${name}`);
  return Number(m[1]);
};

describe('cinewhoop design', () => {
  it('calls 6S over-spun on the 4S motors only, and the over text names real 6S cinewhoop motors', () => {
    for (const [motor, m] of Object.entries(cinewhoop.design.motors)) {
      const r = calc(designInput(cinewhoop.design, { batt: '6s850', motor, prop: '3x3x3' }));
      expect(r.over, motor).toBe((m.maxCells ?? 6) < 6);
    }
    expect(text(en, 'design.verdict.over')).toMatch(/1700 to 2150 KV/);
  });

  it('says the 1404 needs motor_poles 12 while the 2004 build sets 14', () => {
    expect(snippet('setup')).toMatch(/^set motor_poles = 14/m);
    expect(text(en, 'parts.MOTORS.what')).toMatch(/9N12P\), so it needs motor_poles = 12/);
  });
});

describe('cinewhoop frame', () => {
  it('numbers and spins the motors like Betaflight QUAD X, props in, 147.1 mm across the diagonal', () => {
    const a = 147.1 / 2 / Math.SQRT2;
    const want = [
      ['M1', -1, -1, 'CW'],
      ['M2', 1, -1, 'CCW'],
      ['M3', -1, 1, 'CCW'],
      ['M4', 1, 1, 'CW'],
    ] as const;
    cinewhoop.frame.motors.forEach(([x, y, label, dir], i) => {
      const [id, sx, sy, spin] = want[i];
      expect([label, dir]).toEqual([id, spin]);
      expect(Math.abs(x - sx * a)).toBeLessThan(0.05);
      expect(Math.abs(y - sy * a)).toBeLessThan(0.05);
    });
    expect(cinewhoop.frame.propDirection).toBe('props-in');
  });
});

describe('cinewhoop firmware and flight', () => {
  const p = cinewhoop.flight.params;

  it('flies the numbers its CLI snippets set (ACTUAL rates: full stick = srate x 10)', () => {
    expect(setting('angle', 'angle_limit')).toBe(p.angleLimit);
    expect(setting('acro', 'roll_srate') * 10).toBe(p.acroRate);
    expect(setting('acro', 'yaw_srate') * 10).toBe(p.yawRate);
    expect(setting('cine', 'roll_srate') * 10).toBe(p.cineRate);
    expect(setting('cine', 'yaw_srate') * 10).toBe(p.cineYawRate);
    expect(setting('alt', 'alt_hold_climb_rate') / 10).toBe(p.climbRate);
  });

  it('picks the cine rate profile on a switch no flight mode uses', () => {
    const modeChannels = [...cinewhoop.firmware.snippets.map((s) => s.code).join('\n').matchAll(/^aux \d+ \d+ (\d+) /gm)].map((m) => Number(m[1]));
    const adj = /^adjrange \d+ 0 (\d+) \d+ \d+ 12 (\d+)/m.exec(snippet('cine'));
    expect(adj).not.toBeNull();
    expect(modeChannels).not.toContain(Number(adj![1]));
    expect(modeChannels).not.toContain(Number(adj![2]));
    // AUX numbers count from 1, the CLI's channels from 0
    expect(text(en, 'firmware.cine.explain')).toContain(`AUX${Number(adj![2]) + 1}`);
  });

  it('marks cine as a rate profile, not a Betaflight mode, and altitude hold as needing a barometer', () => {
    expect(snippet('cine')).toMatch(/^rateprofile 1/m);
    expect(text(en, 'firmware.cine.explain')).toMatch(/not a Betaflight flight mode/);
    expect(text(en, 'firmware.alt.explain')).toMatch(/barometer/);
  });
});

describe('cinewhoop craft tests in the figure', () => {
  let fig: Awaited<ReturnType<typeof openFigure>> | null = null;
  afterEach(() => {
    fig?.close();
    fig = null;
  });
  const test = (id: string) => cinewhoop.tests.find((t) => t.id === id)!;

  it('shows the OSD only with a battery in (the air unit runs on battery voltage)', async () => {
    fig = await openFigure('cinewhoop');
    await fig.press('osd');
    expect(fig.status(test('osd'))).toBe('failed');
    await fig.run('plugIn');
    await fig.press('osd');
    expect(fig.status(test('osd'))).toBe('passed');
    expect(fig.page.notes()).toEqual([]);
  });

  it('runs the failsafe test only with the props off', async () => {
    fig = await openFigure('cinewhoop');
    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(fig.status(test('failsafe'))).toBe('failed');
    await fig.run('unplug');
    await fig.remove('PROPS');
    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(fig.status(test('failsafe'))).toBe('passed');
  });

  it('checks the prop clearance only with the battery out, and again after a prop is refitted', async () => {
    fig = await openFigure('cinewhoop');
    await fig.run('plugIn');
    await fig.press('clearance');
    expect(fig.status(test('clearance'))).toBe('failed');
    await fig.run('unplug');
    await fig.press('clearance');
    expect(fig.status(test('clearance'))).toBe('passed');
    await fig.remove('PROPS');
    await fig.add('PROPS');
    expect(fig.status(test('clearance'))).toBe('failed');
  });

  it('passes the pre-arm check on the finished build and forgets it once the quad is taken apart', async () => {
    fig = await openFigure('cinewhoop');
    await fig.run('plugIn');
    await fig.press('arm');
    expect(fig.status(test('arm'))).toBe('passed');
    await fig.run('unplug');
    await fig.run('strip');
    expect(fig.status(test('arm'))).toBe('failed');
  });

  it('fails the smoke stopper on a capacitor fitted stripe to plus', async () => {
    fig = await openFigure('cinewhoop');
    await fig.add('XT60', 1);
    await fig.run('smoke');
    expect(fig.status(test('smoke'))).toBe('failed');
    await fig.add('XT60', 0);
    await fig.run('smoke');
    expect(fig.status(test('smoke'))).toBe('passed');
  });
});
