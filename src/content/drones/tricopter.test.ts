import { afterEach, describe, expect, it } from 'vitest';
import en from '@/i18n/content/en/drones/tricopter.json';
import { runnableLines } from '@/components/dronelab/CliConsole';
import { calc, designChecks } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { createCliSession, runCli, type CliContext, type CliPatch } from '@/lib/dronelab/cli';
import { readBench } from '@/lib/dronelab/figure';
import { flightFaults } from '@/lib/dronelab/fly';
import { flightOf } from '@/lib/flight/registry';
import { checkBetaflightSyntax, checkCraft, openFigure } from './_checks';
import tricopter from './tricopter';

checkCraft(tricopter, en, { allSnippetsInEmulator: true });
checkBetaflightSyntax(tricopter);

describe('tricopter design', () => {
  const at = (pick: Partial<typeof tricopter.design.default>) => {
    const input = designInput(tricopter.design, { ...tricopter.design.default, ...pick });
    return { r: calc(input), checks: designChecks(input).map((c) => c.code) };
  };

  it('is a 5:1 4S tri on every pick: none over-spins, none lacks thrust', () => {
    expect(at({}).r.tw).toBeGreaterThan(5);
    for (const batt of Object.keys(tricopter.design.batts))
      for (const motor of Object.keys(tricopter.design.motors))
        for (const prop of Object.keys(tricopter.design.props)) {
          const { r } = at({ batt, motor, prop });
          expect({ over: r.over, weak: r.weak }, `${batt} ${motor} ${prop}`).toEqual({ over: false, weak: false });
        }
  });

  // the ESC check compares one motor's full-throttle current with the ESC rating in the model
  it('warns on the ESCs exactly when one motor pulls more than its ESC is rated for', () => {
    const esc = tricopter.design.model.escAmps!;
    for (const pick of [{}, { prop: '5x5x3' }, { prop: '6x4x2' }, { motor: '2207-2150' }, { motor: '2205-2300', prop: '5x5x3' }]) {
      const { r, checks } = at(pick);
      expect(checks.includes('esc-overcurrent'), JSON.stringify(pick)).toBe(r.maxA / 3 > esc);
    }
    // the aggressive prop pulls the most, so it is the one that warns first
    expect(at({ prop: '5x5x3' }).r.maxA).toBeGreaterThan(at({}).r.maxA);
  });

  it('opens on a default with no warning, on 40 A ESCs; the aggressive prop still warns on them', () => {
    expect(tricopter.design.model.escAmps).toBe(40);
    expect(at({}).checks).toEqual([]);
    expect(at({ prop: '5x5x3' }).checks).toEqual(['esc-overcurrent']);
  });
});

describe('tricopter frame', () => {
  it('numbers and spins the motors like Betaflight TRI: M1 tail CCW, M2 front right CW, M3 front left CCW', () => {
    expect(tricopter.frame.motors).toEqual([
      [-150, 0, 'M1', 'CCW'],
      [60, -104, 'M2', 'CW'],
      [60, 104, 'M3', 'CCW'],
    ]);
    // the front pair 208 mm apart, the tail 234 mm from either front motor
    expect(Math.hypot(210, 104)).toBeCloseTo(tricopter.frame.sizeMm, 0);
    const look = flightOf(tricopter)!.craft.look;
    expect(look.arms).toBe(3);
    expect(look.frame).toBe('y');
  });

  it('balances the three motors 10 mm behind the frame centre, where the battery text puts the CG', () => {
    const x = tricopter.frame.motors.reduce((s, [mx]) => s + mx, 0) / 3;
    expect(x).toBe(-10);
    expect(en.parts.BATT.what).toMatch(/10 mm behind/);
  });
});

describe('tricopter flight', () => {
  const p = tricopter.flight.params;
  const cli = tricopter.firmware.emulator.settings;
  const craft = flightOf(tricopter)!.craft;

  it('sets the same numbers in the CLI as the sim flies', () => {
    expect(cli.angle_limit).toBe(p.angleLimit);
    expect(Number(cli.roll_srate) * 10).toBe(p.acroRate);
    expect(Number(cli.pitch_srate) * 10).toBe(p.acroRate);
    expect(Number(cli.yaw_srate) * 10).toBe(p.yawRate);
    for (const e of tricopter.firmware.emulator.effects) {
      for (const [name, value] of Object.entries(e.set)) {
        if (cli[e.setting] === e.equals && name in p) expect(p[name], `${e.setting} = ${e.equals}`).toBe(value);
      }
    }
  });

  it('yaws through a rate-limited tail servo of the travel the servo snippet sets', () => {
    expect(craft.class).toBe('tricopter');
    expect(craft.tailServo).toEqual({ maxDeg: 40, rateDegS: 500 });
    expect(tricopter.firmware.snippets.find((s) => s.id === 'servo')!.code).toMatch(/about 40 deg each way/);
    expect(cli.servo_pwm_rate).toBe(333);
    expect(cli.tri_unarmed_servo).toBe('ON');
  });

  it('sets the tail servo’s centre and travel in the CLI, and leaves the reversal to a tail that needs it', () => {
    const servo = tricopter.firmware.snippets.find((s) => s.id === 'servo')!.code;
    expect(servo).toMatch(/^servo 5 1000 2000 1520 100 -1 /m);
    expect(servo).toMatch(/^servo 5 1100 1950 1520 100 -1 /m);
    // a servo fitted the right way round must not be reversed: the smix line is the one to type if the check fails
    expect(servo).toMatch(/^# {3}smix reverse 5 2 r$/m);
    expect(tricopter.firmware.emulator.commands).toEqual(expect.arrayContaining(['mixer', 'servo', 'smix']));
    expect(tricopter.firmware.snippets.map((s) => s.code).join('\n')).toMatch(/^mixer TRI\b/m);
  });

  it('runs every snippet in its CLI without an error, and saves a reversed tail as a flight patch', () => {
    const emu = tricopter.firmware.emulator;
    const ctx: CliContext = { version: tricopter.firmware.version, plugged: true, cells: 4, accCal: true, built: true };
    const enter = (lines: string[]) => {
      let session = createCliSession(emu);
      const effects: CliPatch[] = [];
      for (const line of lines) {
        const r = runCli(emu, ctx, session, line);
        expect(r.out.filter((o) => o.kind === 'err'), line).toEqual([]);
        session = r.session;
        effects.push(...r.effects);
      }
      return { session, effects };
    };
    for (const s of tricopter.firmware.snippets) {
      const lines = runnableLines(s, tricopter);
      expect(lines, s.id).not.toBeNull();
      enter(lines!);
    }
    const servo = runnableLines(tricopter.firmware.snippets.find((s) => s.id === 'servo')!, tricopter)!;
    const fixed = enter([...servo, 'smix reverse 5 2 r', 'save']);
    expect(fixed.session.savedExtra).toEqual(['servo 5 1100 1950 1520 100 -1', 'smix reverse 5 2 r']);
    expect(fixed.effects).toEqual([{ tailReverse: true }]);
  });

  it('opens in altitude hold, races the gates in angle, and flies the park run with the height held', () => {
    expect(tricopter.flight.defaultMode).toBe('althold');
    const mode = (id: string) => craft.modes.find((m) => m.id === id)!;
    expect([mode('althold').throttle, mode('althold').task]).toEqual(['climb', 'free']);
    expect([mode('race').attitude, mode('race').task]).toEqual(['angle', 'race']);
    expect([mode('park').throttle, mode('park').task]).toEqual(['climb', 'range']);
    expect(mode('acro').attitude).toBe('acro');
  });

  it('weaves the lamp posts on alternate sides and circles the fountain anticlockwise', () => {
    const park = tricopter.courses.find((c) => c.id === 'park')!;
    const lamps = park.prims.filter((q) => q.type === 'pole' && q.y === 14);
    expect(lamps).toHaveLength(4);
    park.goals.slice(0, 4).forEach((g, i) => {
      expect(g.x).toBe((lamps[i] as { x: number }).x);
      expect(Math.sign(g.y - 14)).toBe(i % 2 ? 1 : -1);
    });
    const [s, e, n, w] = park.goals.slice(4, 8).map((g) => Math.atan2(g.y - 26, g.x - 36));
    // south, east, north, west: each step turns +90 deg (anticlockwise seen from above)
    for (const [a, b] of [[s, e], [e, n], [n, w]]) expect((((b - a) * 180) / Math.PI + 360) % 360).toBeCloseTo(90, 5);
    expect(park.goals.at(-1)).toMatchObject({ x: park.pad[0], y: park.pad[1], z: 0, land: true });
  });

  it('turns a reversed tail servo on the bench into the servo fault on the range', () => {
    const flight = { ready: true, fcReversed: false, propsSwapped: false, motorChecked: true, accCal: true, capFault: false, smokeTested: true, mistakes: ['servo-reversed'] };
    const bench = { pick: tricopter.design.default, built: true, flight, cli: {} };
    expect(flightFaults(tricopter, { source: 'bench', bench, breaks: {} })?.servosReversed).toBe(true);
  });

  it('drops out of the sky on a lost link and says so in the failsafe list', () => {
    expect(cli.failsafe_procedure).toBe('DROP');
    expect(tricopter.flight.failsafes.find((f) => f.trigger === 'rx-loss')!.action).toBe('drop');
  });
});

describe('tricopter craft tests in the figure', () => {
  let fig: Awaited<ReturnType<typeof openFigure>> | null = null;
  afterEach(() => {
    fig?.close();
    fig = null;
  });
  const test = (id: string) => tricopter.tests.find((t) => t.id === id)!;

  it('sweeps the tail servo only with the servo and the flight controller on, the props off and a pack in', async () => {
    fig = await openFigure('tricopter');
    await fig.run('strip');
    await fig.press('servo');
    expect(fig.status(test('servo'))).toBe('failed');
    await fig.run('build');
    // fully built: the props are on, so the sweep is refused and the pass the build gave stays
    await fig.run('plugIn');
    await fig.press('servo');
    expect(fig.st().tri.t0).toBeNull();
    await fig.run('unplug');
    await fig.remove('PROPS');
    await fig.press('servo');
    expect(fig.st().tri.t0).toBeNull();
    await fig.run('plugIn');
    await fig.press('servo');
    expect(fig.status(test('servo'))).toBe('failed');
    expect(fig!.until(() => fig!.status(test('servo')) === 'passed')).toBe(true);
    expect(fig.page.notes()).toEqual([]);
  });

  it('fails the servo test with the servo fitted reversed, and reports the mistake for the range', async () => {
    fig = await openFigure('tricopter');
    await fig.remove('PROPS');
    await fig.add('TAILSERVO', 1);
    expect(readBench(fig.state()).flight?.mistakes).toContain('servo-reversed');
    await fig.run('plugIn');
    await fig.press('servo');
    expect(fig.st().tri.rev).toBe(true);
    await new Promise((r) => setTimeout(r, 4200));
    expect(fig.status(test('servo'))).toBe('failed');
    await fig.run('unplug');
    await fig.add('TAILSERVO', 0);
    await fig.run('plugIn');
    await fig.press('servo');
    expect(fig!.until(() => fig!.status(test('servo')) === 'passed')).toBe(true);
  });

  it('runs the failsafe test only with the props off and a pack in', async () => {
    fig = await openFigure('tricopter');
    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(fig.status(test('failsafe'))).toBe('failed');
    await fig.run('unplug');
    await fig.remove('PROPS');
    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(fig.status(test('failsafe'))).toBe('passed');
  });

  it('fails the smoke stopper on a reversed capacitor and passes it once the capacitor is turned round', async () => {
    fig = await openFigure('tricopter');
    await fig.add('XT60', 1);
    await fig.run('smoke');
    expect(fig.status(test('smoke'))).toBe('failed');
    await fig.add('XT60', 0);
    await fig.run('smoke');
    expect(fig.status(test('smoke'))).toBe('passed');
  });
});
