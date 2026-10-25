import { afterEach, describe, expect, it } from 'vitest';
import en from '@/i18n/content/en/drones/whoop.json';
import { calc } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { checkBetaflightSyntax, checkCraft, openFigure, text } from './_checks';
import whoop from './whoop';

checkCraft(whoop, en, { punchAbove: 4.3, allSnippetsInEmulator: true });
checkBetaflightSyntax(whoop);

describe('whoop design', () => {
  it('names the 2S option for what it is: two 1S BT2.0 packs in series, no XT30 on a 65 mm whoop', () => {
    const labels = Object.values(whoop.design.batts).map((b) => b.label);
    expect(labels.join(' ')).not.toMatch(/XT30/);
    expect(whoop.design.batts['2s300'].label).toMatch(/2 × 1S BT2\.0 in series/);
  });

  it('flags every motor as over-spun on 2S, and the 2S text names the motors real 2S whoops use', () => {
    for (const motor of Object.keys(whoop.design.motors)) {
      expect(calc(designInput(whoop.design, { batt: '2s300', motor, prop: '31mm-4' })).over, motor).toBe(true);
    }
    expect(text(en, 'design.verdict.over')).toMatch(/12000 to 14000 KV/);
    expect(text(en, 'design.verdict.over')).not.toMatch(/19000/);
  });
});

describe('whoop frame', () => {
  it('numbers and spins the motors like Betaflight QUAD X, props in, 65 mm across the diagonal', () => {
    const a = 65 / 2 / Math.SQRT2;
    const want = [
      ['M1', -1, -1, 'CW'],
      ['M2', 1, -1, 'CCW'],
      ['M3', -1, 1, 'CCW'],
      ['M4', 1, 1, 'CW'],
    ] as const;
    whoop.frame.motors.forEach(([x, y, label, dir], i) => {
      const [id, sx, sy, spin] = want[i];
      expect([label, dir]).toEqual([id, spin]);
      expect(Math.abs(x - sx * a)).toBeLessThan(0.01);
      expect(Math.abs(y - sy * a)).toBeLessThan(0.01);
    });
    expect(whoop.frame.propDirection).toBe('props-in');
  });
});

describe('whoop flight', () => {
  const p = whoop.flight.params;
  const cli = whoop.firmware.emulator.settings;

  it('sets the same numbers in the CLI as the sim flies', () => {
    expect(cli.angle_limit).toBe(p.angleLimit);
    expect(Number(cli.roll_srate) * 10).toBe(p.acroRate);
    expect(Number(cli.pitch_srate) * 10).toBe(p.acroRate);
    expect(Number(cli.yaw_srate) * 10).toBe(p.yawRate);
    expect(cli.motor_poles).toBe(12);
    for (const e of whoop.firmware.emulator.effects) {
      for (const [name, value] of Object.entries(e.set)) {
        if (cli[e.setting] === e.equals && name in p) expect(p[name], `${e.setting} = ${e.equals}`).toBe(value);
      }
    }
  });

  it('says on screen that altitude hold is a simulator aid: a whoop has no barometer', () => {
    expect(text(en, 'flight.modes.alt.hint')).toMatch(/simulator aid/);
    expect(whoop.firmware.snippets.find((s) => s.mode === 'alt')!.code).not.toMatch(/^aux \d+ 3 /m);
  });

  it('flies its gates and checkpoints inside the living room, under the 5 m ceiling', () => {
    for (const c of whoop.courses) expect(c.field).toEqual({ w: 9, d: 9 });
    expect(p.ceiling).toBe(5);
  });
});

describe('whoop craft tests in the figure', { timeout: 30000 }, () => {
  let fig: Awaited<ReturnType<typeof openFigure>> | null = null;
  afterEach(() => {
    fig?.close();
    fig = null;
  });
  const test = (id: string) => whoop.tests.find((t) => t.id === id)!;

  it('passes the receiver test once a pack is in, and not before', async () => {
    fig = await openFigure('whoop');
    await fig.press('rxtest');
    expect(fig.status(test('rxtest'))).toBe('failed');
    await fig.run('plugIn');
    await fig.press('rxtest');
    expect(fig.status(test('rxtest'))).toBe('passed');
    expect(fig.page.notes()).toEqual([]);
  });

  it('runs the failsafe test only with the props off, and clears the pass when the props go back on', async () => {
    fig = await openFigure('whoop');
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
    expect(fig.status(test('failsafe'))).toBe('failed');
  });

  it('fails the smoke stopper on a reversed BT2.0 lead and passes it once the lead is turned round', async () => {
    fig = await openFigure('whoop');
    await fig.add('XT60', 1);
    await fig.run('smoke');
    expect(fig.status(test('smoke'))).toBe('failed');
    await fig.add('XT60', 0);
    await fig.run('smoke');
    expect(fig.status(test('smoke'))).toBe('passed');
  });
});
