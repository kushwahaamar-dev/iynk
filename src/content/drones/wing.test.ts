import { afterEach, describe, expect, it } from 'vitest';
import en from '@/i18n/content/en/drones/wing.json';
import { calc, designChecks } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { checkCraft, openFigure } from './_checks';
import wing from './wing';

checkCraft(wing, en, { verdict: (pick) => (wing.design.batts[pick.batt].cg === 'tail' ? 'tail' : null) });

const lines = wing.firmware.snippets.flatMap((s) =>
  s.code
    .split('\n')
    .map((line) => ({ id: s.id, line: line.replace(/\s+#.*$/, '').trim() }))
    .filter((l) => l.line && !l.line.startsWith('#')),
);
const cli = wing.firmware.emulator.settings;

describe('wing design', () => {
  it('calls the 2306 quad motor over the ESC on every pack, and the light 3S pack tail-heavy', () => {
    for (const batt of Object.keys(wing.design.batts)) {
      expect(calc(designInput(wing.design, { batt, motor: '2306-2400', prop: '8x6' })).over, batt).toBe(true);
    }
    const light = designInput(wing.design, { ...wing.design.default, batt: '3s1300' });
    expect(designChecks(light).map((c) => c.code)).toContain('tail-heavy');
    expect(designChecks(designInput(wing.design, wing.design.default)).map((c) => c.code)).not.toContain('tail-heavy');
  });
});

// INAV 9.1.0 permanent mode ids (src/main/fc/fc_msp_box.c, docs/facts/wing.md §5.2).
const INAV_MODES = new Set([0, 1, 2, 3, 10, 11, 12, 27, 28, 35, 36, 37, 45, 53, 54, 64]);
// Settings and features older INAV had, or the original invented; none exists in 9.1.0.
const INAV_GONE = /\b(MOTOR_STOP|osd_stats_page|nav_fw_loiter_direction|vtxtable|SET-THR)\b/;

describe('wing INAV CLI', () => {
  it('writes aux lines as slot, INAV mode id, channel and a range on the 25 µs grid, one meaning per slot', () => {
    const slots = new Map<string, string>();
    for (const { id, line } of lines.filter((l) => l.line.startsWith('aux '))) {
      const m = /^aux (\d+) (\d+) (\d+) (\d+) (\d+)$/.exec(line);
      expect(m, `${id}: ${line}`).not.toBeNull();
      const [slot, mode, , from, to] = m!.slice(1).map(Number);
      expect(INAV_MODES.has(mode), `${id}: ${line}`).toBe(true);
      expect(from >= 900 && to <= 2100 && from < to && from % 25 === 0 && to % 25 === 0, `${id}: ${line}`).toBe(true);
      expect(slots.get(String(slot)) ?? line, `${id}: slot ${slot}`).toBe(line);
      slots.set(String(slot), line);
    }
  });

  it('mixes one throttle-only motor and two elevons: pitch together, roll apart', () => {
    const mmix = lines.filter((l) => l.line.startsWith('mmix ') && l.line !== 'mmix reset').map((l) => l.line);
    expect(mmix).toEqual(['mmix 0 1.000 0.000 0.000 0.000']);
    const smix = lines
      .filter((l) => l.line.startsWith('smix ') && l.line !== 'smix reset')
      .map((l) => {
        const m = /^smix (\d+) (\d+) (\d+) (-?\d+) (\d+) (-?\d+)$/.exec(l.line);
        expect(m, l.line).not.toBeNull();
        const [, , servo, input, weight] = m!.map(Number);
        return { servo, input, weight };
      });
    const w = (servo: number, input: number) => smix.find((r) => r.servo === servo && r.input === input)!.weight;
    expect(Math.sign(w(1, 1))).toBe(Math.sign(w(2, 1)));
    expect(Math.sign(w(1, 0))).toBe(-Math.sign(w(2, 0)));
    for (const r of smix) expect(Math.abs(r.weight)).toBeLessThanOrEqual(1000);
  });

  it('gives each servo a centred travel and a rate INAV accepts', () => {
    const servos = lines.filter((l) => l.line.startsWith('servo '));
    expect(servos.length).toBe(2);
    for (const { line } of servos) {
      const [, , min, max, mid, rate] = /^servo (\d+) (\d+) (\d+) (\d+) (-?\d+)$/.exec(line)!.map(Number);
      expect(min < mid && mid < max && Math.abs(rate) <= 125, line).toBe(true);
    }
  });

  it('never uses removed or invented names (a comment may name the old one)', () => {
    for (const { id, line } of lines) expect(line, id).not.toMatch(INAV_GONE);
  });
});

describe('wing flight', () => {
  const p = wing.flight.params;
  const effect = (setting: string) =>
    wing.firmware.emulator.effects.find((e) => e.setting === setting && e.equals === cli[setting])!.set;

  it('flies the numbers its CLI sets', () => {
    expect(Number(cli.max_angle_inclination_rll) / 10).toBe(p.bankLimit);
    expect(p.angleLimit).toBe(p.bankLimit);
    expect(Number(cli.nav_rth_altitude) / 100).toBe(p.rtlAlt);
    expect(Number(cli.nav_fw_loiter_radius) / 100).toBe(p.loiterRadius);
    for (const name of ['manual_roll_rate', 'manual_pitch_rate', 'nav_rth_altitude', 'nav_fw_loiter_radius', 'max_angle_inclination_rll']) {
      for (const [key, value] of Object.entries(effect(name))) expect(p[key], `${name} -> ${key}`).toBe(value);
    }
  });

  it('asks for a loiter circle the wing can fly at its reference airspeed and nav bank', () => {
    const v = Number(cli.fw_reference_airspeed) / 100;
    const tightest = (v * v) / (9.81 * Math.tan((Number(cli.nav_fw_bank_angle) * Math.PI) / 180));
    expect(p.loiterRadius).toBeGreaterThan(tightest);
  });

  it('flies home on a lost link, and its RTH goal sits on the loiter circle at the return altitude', () => {
    expect(cli.failsafe_procedure).toBe('RTH');
    expect(wing.flight.failsafes.find((f) => f.trigger === 'rx-loss')!.action).toBe('rth');
    const home = wing.courses.find((c) => c.id === 'home')!;
    const rth = home.goals[1];
    expect(Math.hypot(rth.x - home.pad[0], rth.y - home.pad[1])).toBeCloseTo(p.loiterRadius, 0);
    expect(rth.z).toBe(p.rtlAlt);
  });
});

describe('wing craft tests in the figure', { timeout: 40000 }, () => {
  let fig: Awaited<ReturnType<typeof openFigure>> | null = null;
  afterEach(() => {
    fig?.close();
    fig = null;
  });
  const test = (id: string) => wing.tests.find((t) => t.id === id)!;

  it('passes the elevon check on the right build, and not with a servo reversed or the FC backwards', async () => {
    fig = await openFigure('wing');
    await fig.press('elevons');
    expect(fig.status(test('elevons'))).toBe('failed');
    await fig.run('plugIn');
    await fig.press('elevons');
    expect(fig.status(test('elevons'))).toBe('passed');
    await fig.run('unplug');
    await fig.add('SERVOS', 1);
    expect(fig.status(test('elevons'))).toBe('failed');
    await fig.run('plugIn');
    await fig.press('elevons');
    expect(fig.status(test('elevons'))).toBe('failed');
    await fig.run('unplug');
    await fig.add('SERVOS', 0);
    await fig.add('FC', 1);
    await fig.run('plugIn');
    await fig.press('elevons');
    expect(fig.status(test('elevons'))).toBe('failed');
    expect(fig.page.notes()).toEqual([]);
  });

  it('balances on the default pack, needs a new check on another, and calls the 3S pack tail-heavy', async () => {
    fig = await openFigure('wing');
    await fig.press('cg');
    expect(fig.status(test('cg'))).toBe('passed');
    fig.st().design.batt = '3s1300';
    expect(fig.status(test('cg'))).toBe('failed');
    await fig.press('cg');
    expect(fig.status(test('cg'))).toBe('failed');
  });

  it('runs the failsafe test with the prop off, and a re-seated receiver needs it again', async () => {
    fig = await openFigure('wing');
    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(fig.status(test('failsafe'))).toBe('failed');
    await fig.run('unplug');
    await fig.remove('PROPS');
    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(fig.status(test('failsafe'))).toBe('passed');
    await fig.run('unplug');
    await fig.add('PROPS');
    expect(fig.status(test('failsafe'))).toBe('passed');
    await fig.remove('PROPS');
    await fig.remove('TOP');
    await fig.remove('RX');
    await fig.add('RX');
    expect(fig.status(test('failsafe'))).toBe('failed');
  });
});
