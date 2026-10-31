import { afterEach, describe, expect, it } from 'vitest';
import en from '@/i18n/content/en/drones/vtol.json';
import { calc, designChecks } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { readBench } from '@/lib/dronelab/figure';
import { flightCalc, flightFaults } from '@/lib/dronelab/fly';
import { flightOf } from '@/lib/flight/registry';
import { createSim, dispatch, drainEvents, stepSim } from '@/lib/flight/sim';
import type { CraftFaults, FlightEvent } from '@/lib/flight/types';
import { checkCraft, figureSource, openFigure } from './_checks';
import vtol from './vtol';

checkCraft(vtol, en, { allSnippetsInEmulator: true });

describe('vtol design', () => {
  const at = (pick: Partial<typeof vtol.design.default>) => {
    const input = designInput(vtol.design, { ...vtol.design.default, ...pick });
    return { r: calc(input), checks: designChecks(input).map((c) => c.code) };
  };

  it('opens on a build the design panel has no warning for', () => {
    const { r, checks } = at({});
    expect(checks).toEqual([]);
    expect(r.tw).toBeGreaterThan(2.5);
    expect(r.maxA / 3).toBeLessThan(vtol.design.model.escAmps!);
  });

  it('warns on the ESCs exactly when one motor pulls more than its 40 A rating', () => {
    for (const pick of [{}, { prop: '10x5' }, { prop: '7x4' }, { motor: '2814-700' }, { batt: '6s-4000', motor: '2814-700' }]) {
      const { r, checks } = at(pick);
      expect(checks.includes('esc-overcurrent'), JSON.stringify(pick)).toBe(r.maxA / 3 > 40);
    }
    // the bigger prop is the one that pushes the default motor past its ESC
    expect(at({ prop: '10x5' }).checks).toContain('esc-overcurrent');
  });

  it('cruises far longer than it hovers: the wing does the work', () => {
    const { r } = at({});
    expect(r.flyMin / r.hoverMin).toBeGreaterThan(2.5);
  });
});

describe('vtol frame', () => {
  const src = figureSource('vtol');
  const num = (name: string) => Number(new RegExp(`\\b${name} = (-?\\d+)`).exec(src)?.[1]);

  it('numbers its motors like ArduPilot\'s tri, M1 front right, M2 front left, M4 rear, front pair opposite', () => {
    expect(vtol.frame.layout).toBe('quadplane');
    expect(vtol.frame.motors).toEqual([
      [175, -230, 'M1', 'CW'],
      [175, 230, 'M2', 'CCW'],
      [-300, 0, 'M4', 'CW'],
    ]);
    // the figure draws the tilt pivots and the rear motor at the same places
    expect([num('PIV_X'), num('PIV_Y'), num('REAR_X')]).toEqual([175, 230, -300]);
    expect(src).toMatch(/\{ id: 'M1', at: \[PIV_X, -PIV_Y, PIV_Z\], dir: 'CW' \}/);
    expect(src).toMatch(/\{ id: 'M2', at: \[PIV_X, PIV_Y, PIV_Z\], dir: 'CCW' \}/);
  });

  it('spans the 1200 x 195 mm wing the figure draws, with the battery on the quarter-chord CG', () => {
    const [LE, TE, TIP] = [num('LE'), num('TE'), num('TIP')];
    expect(2 * TIP).toBe(vtol.frame.sizeMm);
    expect(LE - TE).toBe(195);
    expect(vtol.flight.look?.chord).toBe(0.195);
    expect(Math.abs(num('BATT_X') - (LE - 0.25 * (LE - TE)))).toBeLessThan(1);
    const look = flightOf(vtol)!.craft.look;
    expect([look.span, look.chord, look.arms]).toEqual([1.2, 0.195, 3]);
    expect(look.propR).toBeCloseTo(0.1143, 4);
  });
});

describe('vtol flight', () => {
  const p = vtol.flight.params;
  const cli = vtol.firmware.emulator.settings;
  const flight = flightOf(vtol)!;
  const craft = flight.craft;

  it('sets the same numbers in the parameters as the sim flies', () => {
    expect(cli.Q_A_ANGLE_MAX).toBe(p.angleLimit);
    expect(cli.Q_RTL_ALT).toBe(p.rtlAlt);
    expect(cli.ROLL_LIMIT_DEG).toBe(p.bankLimit);
    expect(cli.PTCH_LIM_MAX_DEG).toBe(p.pitchLimit);
    expect(cli.AIRSPEED_MIN).toBe(p.vmin);
    // AIRSPEED_MIN about 20 % over the stall, and Q_ASSIST_SPEED 3 m/s under AIRSPEED_MIN
    expect(p.vmin / p.vstall).toBeCloseTo(1.2, 5);
    expect(Number(cli.AIRSPEED_MIN) - Number(cli.Q_ASSIST_SPEED)).toBe(3);
    // the sim tilts the rotors through 90 deg in transitionS, at Q_TILT_RATE_DN
    expect(90 / Number(cli.Q_TILT_RATE_DN)).toBe(p.transitionS);
    expect(p.hoverMotors).toBe(vtol.frame.motors.length);
    for (const e of vtol.firmware.emulator.effects) {
      for (const [name, value] of Object.entries(e.set)) {
        if (cli[e.setting] === e.equals && name in p) expect(p[name], `${e.setting} = ${e.equals}`).toBe(value);
        // the factory parameters never switch a fault on
        if (cli[e.setting] === e.equals && typeof value === 'boolean') expect(value, e.setting).toBe(false);
      }
    }
  });

  it('flies as a QuadPlane: the wing\'s numbers plus the tilt', () => {
    expect(craft.class).toBe('vtol');
    expect(craft.vtol).toEqual({ vstall: 10, vmin: 12, cd: 0.07, launchSpeed: 10.5, bankLimit: 45, pitchLimit: 20, rollRate: 220, pitchRate: 140, transitionS: 6, hoverMotors: 3 });
  });

  it('hovers in the Q modes, transitions in FBWA, comes home in QRTL and flies the survey in AUTO', () => {
    expect(vtol.flight.defaultMode).toBe('qhover');
    const mode = (id: string) => craft.modes.find((m) => m.id === id)!;
    expect([mode('qhover').throttle, mode('qhover').task, mode('qhover').position]).toEqual(['climb', 'free', undefined]);
    expect([mode('qloiter').task, mode('qloiter').position]).toEqual(['free', true]);
    expect([mode('fbwa').throttle, mode('fbwa').task]).toEqual(['manual', 'transition']);
    expect(mode('qrtl').task).toBe('qrtl');
    expect([mode('auto').task, mode('auto').missionId]).toEqual(['mission', 'survey']);
    expect(vtol.courses.find((c) => c.id === 'survey')!.kind).toBe('mission');
  });

  // QHOVER up to 15 m, then FBWA with the throttle up: the rotors tilt over transitionS and the wing takes over past
  // AIRSPEED_MIN; QHOVER again tilts them back and it slows to a hover
  const transition = (faults?: CraftFaults) => {
    const course = flight.courses.find((c) => c.id === 'coast')!;
    const s = createSim(craft, course, flightCalc(vtol, vtol.design.default), { mode: 'qhover', ...(faults ? { faults } : {}) });
    const events: FlightEvent[] = [];
    const run = (seconds: number, throttle: number, pitch = 0) => {
      dispatch(s, { type: 'sticks', sticks: { throttle, yaw: 0, pitch, roll: 0 } });
      for (let i = 0; i < seconds * 100 && !s.crashed; i++) {
        stepSim(s);
        events.push(...drainEvents(s));
      }
    };
    dispatch(s, { type: 'arm' });
    run(6, 1);
    run(2, 0.5);
    const switched = s.t;
    dispatch(s, { type: 'mode', mode: 'fbwa' });
    run(12, 0.75);
    return { s, events, switched, run };
  };

  it('hands over from the rotors to the wing after a transition, and back again', () => {
    const { s, events, switched, run } = transition();
    const cruise = events.find((e) => e.type === 'transition' && e.to === 'cruise');
    expect(cruise, 'reached cruise').toBeDefined();
    expect(cruise!.t - switched).toBeGreaterThan(craft.vtol!.transitionS - 0.05);
    expect(cruise!.t - switched).toBeLessThan(craft.vtol!.transitionS + 4);
    expect(s.airspeed).toBeGreaterThan(p.vmin);
    expect(s.p[2]).toBeGreaterThan(5);
    dispatch(s, { type: 'mode', mode: 'qhover' });
    run(10, 0.5);
    expect(events.some((e) => e.type === 'transition' && e.to === 'hover')).toBe(true);
    expect(s.crashed).toBe(false);
    expect(Math.hypot(s.v[0], s.v[1])).toBeLessThan(3);
  });

  it('turns reversed tilt servos on the bench into a crash once the wing takes over', () => {
    const bench = {
      pick: vtol.design.default,
      built: true,
      flight: { ready: true, fcReversed: false, propsSwapped: false, motorChecked: true, accCal: true, capFault: false, smokeTested: true, mistakes: ['servo-reversed'] },
      cli: {},
    };
    const faults = flightFaults(vtol, { source: 'bench', bench, breaks: {} });
    expect(faults?.servosReversed).toBe(true);
    const { s, events, run } = transition({ servosReversed: true });
    expect(events.some((e) => e.type === 'transition' && e.to === 'cruise')).toBe(true);
    run(10, 0.75);
    expect(s.crashed).toBe(true);
    expect(events.find((e) => e.type === 'crash')).toBeDefined();
  });

  it('lands where it is on a lost link in a Q mode, and comes home in QRTL from a failed transition', () => {
    expect(vtol.flight.failsafes.find((f) => f.id === 'rx-loss-q')!.action).toBe('qland');
    expect(vtol.flight.failsafes.find((f) => f.id === 'transition')!.action).toBe('qrtl');
    expect(cli.Q_TRANS_FAIL_ACT).toBe(1);
    expect(cli.FS_LONG_ACTN).toBe(1);
    // 4.7.2 refuses to arm with both set
    expect(cli.Q_RTL_MODE !== 0 && cli.RTL_AUTOLAND !== 0).toBe(false);
  });

  it('keeps every checkpoint clear of the lighthouse and the mast, and lands both runs on the village pad', () => {
    for (const c of vtol.courses) {
      expect(c.goals.at(-1)).toMatchObject({ x: 60, y: 176, z: 0, land: true });
      const pad = c.prims.find((q) => q.type === 'flat' && q.x === 60 && q.y === 176 && q.w === 4);
      expect(pad, c.id).toBeDefined();
    }
    const coast = vtol.courses.find((c) => c.id === 'coast')!;
    const towers = coast.prims.filter((q) => (q.type === 'cyl' || q.type === 'pole') && q.kind === 'tower') as { x: number; y: number }[];
    for (const g of coast.goals) for (const t of towers) expect(Math.hypot(g.x - t.x, g.y - t.y) - g.r, g.label).toBeGreaterThan(2);
  });
});

describe('vtol craft tests in the figure', () => {
  let fig: Awaited<ReturnType<typeof openFigure>> | null = null;
  afterEach(() => {
    fig?.close();
    fig = null;
  });
  const test = (id: string) => vtol.tests.find((t) => t.id === id)!;
  const pose = (i: number) => fig!.SD.craft().motorPose(fig!.st(), i) as { tilt: number } | null;

  it('swings the rotors only with the servos and the flight controller on, the props off and a pack in', async () => {
    fig = await openFigure('vtol');
    await fig.run('strip');
    await fig.press('tilt');
    expect(fig.status(test('tilt'))).toBe('failed');
    await fig.run('build');
    // fully built: the props are on, so the test is refused and the pass the build gave stays
    expect(fig.status(test('tilt'))).toBe('passed');
    await fig.run('plugIn');
    await fig.press('tilt');
    expect(fig.st().vt.t0).toBeNull();
    await fig.run('unplug');
    await fig.remove('PROPS');
    await fig.press('tilt');
    expect(fig.st().vt.t0).toBeNull();
    await fig.run('plugIn');
    await fig.press('tilt');
    expect(fig.status(test('tilt'))).toBe('failed');
    // MANUAL swings both front rotors forward; the rear motor never tilts
    expect(fig!.until(() => (pose(0)?.tilt ?? 0) > 80)).toBe(true);
    expect(pose(1)!.tilt).toBeGreaterThan(80);
    expect(pose(2)).toBeNull();
    expect(fig!.until(() => fig!.status(test('tilt')) === 'passed')).toBe(true);
    expect(fig.page.notes()).toEqual([]);
  });

  it('fails the tilt test with the servos fitted reversed, and reports the mistake for the range', async () => {
    fig = await openFigure('vtol');
    await fig.remove('PROPS');
    await fig.add('TILT', 1);
    expect(readBench(fig.state()).flight?.mistakes).toContain('servo-reversed');
    await fig.run('plugIn');
    await fig.press('tilt');
    expect(fig.st().vt.rev).toBe(true);
    // MANUAL tilts the rotors back instead
    expect(fig!.until(() => (pose(0)?.tilt ?? 0) < -20)).toBe(true);
    await new Promise((r) => setTimeout(r, 3000));
    expect(fig.status(test('tilt'))).toBe('failed');
    await fig.run('unplug');
    await fig.add('TILT', 0);
    await fig.run('plugIn');
    await fig.press('tilt');
    expect(fig!.until(() => fig!.status(test('tilt')) === 'passed')).toBe(true);
  });

  it('checks the airspeed sensor only with a pack in', async () => {
    fig = await openFigure('vtol');
    await fig.press('airspeed');
    expect(fig.status(test('airspeed'))).toBe('failed');
    await fig.run('plugIn');
    await fig.press('airspeed');
    expect(fig.status(test('airspeed'))).toBe('passed');
  });

  it('refuses to arm with the accelerometer uncalibrated, and arms once it is calibrated', async () => {
    fig = await openFigure('vtol');
    await fig.remove('PROPS');
    await fig.run('plugIn');
    fig.st().accOk = false;
    await fig.press('prearm');
    expect(fig.status(test('prearm'))).toBe('failed');
    await fig.run('unplug');
    await fig.run('calibrate');
    expect(fig.status(test('calibrate'))).toBe('passed');
    await fig.run('plugIn');
    await fig.press('prearm');
    expect(fig.status(test('prearm'))).toBe('passed');
  });

  it('fails the smoke stopper on a reversed capacitor and passes it once the capacitor is turned round', async () => {
    fig = await openFigure('vtol');
    await fig.add('XT60', 1);
    await fig.run('smoke');
    expect(fig.status(test('smoke'))).toBe('failed');
    await fig.add('XT60', 0);
    await fig.run('smoke');
    expect(fig.status(test('smoke'))).toBe('passed');
  });
});
