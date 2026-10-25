import { afterEach, describe, expect, it } from 'vitest';
import en from '@/i18n/content/en/drones/racer.json';
import { calc, designChecks } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { flightOf } from '@/lib/flight/registry';
import { checkBetaflightSyntax, checkCraft, openFigure, text } from './_checks';
import racer from './racer';

checkCraft(racer, en, { allSnippetsInEmulator: true });
checkBetaflightSyntax(racer);

describe('racer design', () => {
  it('is a 4S racer: every 4S build is race-ready, the 6S pack over-spins the 2500 KV motors', () => {
    expect(calc(designInput(racer.design, racer.design.default)).tw).toBeGreaterThan(12);
    expect(calc(designInput(racer.design, { batt: '6s1000', motor: '2207-2500', prop: '5x4.8x3' })).over).toBe(true);
    expect(calc(designInput(racer.design, { batt: '6s1000', motor: '2207-1950', prop: '5x4.8x3' })).over).toBe(false);
  });

  it('opens on a clean build, and warns on the hotter 2306 2700 KV motor, which a smoother prop clears', () => {
    const at = (pick: Partial<typeof racer.design.default>) =>
      designChecks(designInput(racer.design, { ...racer.design.default, ...pick })).map((c) => c.code);
    expect(at({})).toEqual([]);
    expect(at({ motor: '2306-2700' })).toContain('esc-overcurrent');
    expect(at({ motor: '2306-2700', prop: '5.1x3.6x3' })).not.toContain('esc-overcurrent');
    expect(text(en, 'design.verdict.ok')).toMatch(/headroom/);
  });
});

describe('racer frame', () => {
  it('numbers and spins the motors like Betaflight QUAD X, props in, on a stretched X', () => {
    const want = [
      ['M1', -1, -1, 'CW'],
      ['M2', 1, -1, 'CCW'],
      ['M3', -1, 1, 'CCW'],
      ['M4', 1, 1, 'CW'],
    ] as const;
    racer.frame.motors.forEach(([x, y, label, dir], i) => {
      const [id, sx, sy, spin] = want[i];
      expect([label, dir]).toEqual([id, spin]);
      expect([x, y]).toEqual([sx * 86, sy * 70]);
    });
    expect(racer.frame.propDirection).toBe('props-in');
    expect(Math.hypot(172, 140)).toBeCloseTo(racer.frame.sizeMm, 1);
  });
});

describe('racer flight', () => {
  const p = racer.flight.params;
  const cli = racer.firmware.emulator.settings;

  it('sets the same numbers in the CLI as the sim flies', () => {
    expect(cli.angle_limit).toBe(p.angleLimit);
    expect(Number(cli.roll_srate) * 10).toBe(p.acroRate);
    expect(Number(cli.pitch_srate) * 10).toBe(p.acroRate);
    expect(Number(cli.yaw_srate) * 10).toBe(p.yawRate);
    expect(cli.motor_poles).toBe(14);
    for (const e of racer.firmware.emulator.effects) {
      for (const [name, value] of Object.entries(e.set)) {
        if (cli[e.setting] === e.equals && name in p) expect(p[name], `${e.setting} = ${e.equals}`).toBe(value);
      }
    }
  });

  it('flies the gate race by default through six MultiGP-size gates, under a race VTX at 25 mW', () => {
    expect(racer.flight.defaultMode).toBe('race');
    const [track] = racer.courses;
    expect(track.kind).toBe('gates');
    expect(track.gates).toHaveLength(6);
    expect(track.gateSize).toEqual([1.6, 1.6]);
    expect(cli.vtx_power).toBe(1);
    expect(cli.vtx_band).toBe(5);
  });

  it('races the gates in angle or in acro, and the acro race snippet leaves the ANGLE switch alone', () => {
    const race = (id: string) => flightOf(racer)!.craft.modes.find((m) => m.id === id)!;
    expect([race('race').task, race('race').attitude]).toEqual(['race', 'angle']);
    expect([race('raceAcro').task, race('raceAcro').attitude]).toEqual(['race', 'acro']);
    expect(racer.firmware.snippets.find((s) => s.id === 'raceAcro')!.code).not.toMatch(/^aux \d+ 1 /m);
  });

  it('drops out of the sky on a lost link, the netted-track failsafe, and says so in the failsafe list', () => {
    expect(cli.failsafe_procedure).toBe('DROP');
    expect(racer.flight.failsafes.find((f) => f.trigger === 'rx-loss')!.action).toBe('drop');
  });
});

describe('racer craft tests in the figure', { timeout: 30000 }, () => {
  let fig: Awaited<ReturnType<typeof openFigure>> | null = null;
  afterEach(() => {
    fig?.close();
    fig = null;
  });
  const test = (id: string) => racer.tests.find((t) => t.id === id)!;

  it('passes the receiver test once the receiver and the flight controller are on, and not before', async () => {
    fig = await openFigure('racer');
    await fig.run('strip');
    await fig.press('rxtest');
    expect(fig.status(test('rx'))).toBe('failed');
    await fig.run('build');
    await fig.press('rxtest');
    expect(fig.status(test('rx'))).toBe('passed');
    expect(fig.page.notes()).toEqual([]);
  });

  it('runs the failsafe test only with the props off and a pack in, and clears the pass when the props go back on', async () => {
    fig = await openFigure('racer');
    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(fig.status(test('failsafe'))).toBe('failed');
    await fig.run('unplug');
    await fig.remove('PROPS');
    await fig.press('failsafe');
    expect(fig.status(test('failsafe'))).toBe('failed');
    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(fig.status(test('failsafe'))).toBe('passed');
    await fig.run('unplug');
    await fig.add('PROPS');
    expect(fig.status(test('failsafe'))).toBe('failed');
  });

  it('fails the smoke stopper on a reversed capacitor and passes it once the capacitor is turned round', async () => {
    fig = await openFigure('racer');
    await fig.add('XT60', 1);
    await fig.run('smoke');
    expect(fig.status(test('smoke'))).toBe('failed');
    await fig.add('XT60', 0);
    await fig.run('smoke');
    expect(fig.status(test('smoke'))).toBe('passed');
  });
});
