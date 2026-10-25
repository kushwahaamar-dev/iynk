import { afterEach, describe, expect, it } from 'vitest';
import en from '@/i18n/content/en/drones/octo.json';
import { calc, designChecks, HOVER_THR_LIMIT } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { flightCalc } from '@/lib/dronelab/fly';
import { flightOf } from '@/lib/flight/registry';
import { createSim, dispatch, drainEvents, stepSim } from '@/lib/flight/sim';
import type { FlightEvent } from '@/lib/flight/types';
import { checkCraft, figureSource, openFigure } from './_checks';
import octo from './octo';

checkCraft(octo, en, { allSnippetsInEmulator: true });

const R = 680;
const CHORD = 2 * R * Math.sin(Math.PI / 8);

describe('octo design', () => {
  const at = (pick: Partial<typeof octo.design.default>) => {
    const input = designInput(octo.design, { ...octo.design.default, ...pick });
    return { r: calc(input), checks: designChecks(input).map((c) => c.code) };
  };
  // the calculator's hover-throttle rule of thumb, or the craft's own limit once its model carries one
  const hoverLimit = (octo.design.model as unknown as { hoverLimit?: number }).hoverLimit ?? HOVER_THR_LIMIT;

  it('opens on a build whose only possible note is the hover-throttle rule of thumb', () => {
    const { r, checks } = at({});
    expect(checks.filter((c) => c !== 'hover-high')).toEqual([]);
    expect(checks.includes('hover-high')).toBe(r.hoverThr > hoverLimit);
    expect(r.maxA / 8).toBeLessThan(octo.design.model.escAmps!);
  });

  it('keeps 2:1 thrust to weight on seven motors, the margin that lets it lose one', () => {
    const { r } = at({});
    expect(r.tw).toBeGreaterThan(2.3);
    expect((r.tw * 7) / 8).toBeGreaterThan(2);
  });

  it('flags the 22-inch props, and only them, as wider than the 520 mm between neighbouring motors', () => {
    expect(CHORD).toBeCloseTo(520.4, 1);
    for (const [key, prop] of Object.entries(octo.design.props)) {
      expect(at({ prop: key }).checks.includes('prop-clash'), key).toBe(2 * prop.r! > CHORD);
    }
    expect(at({ prop: '2255' }).checks).toContain('prop-clash');
    expect(2 * octo.design.props['2055'].r!).toBeLessThan(CHORD);
  });
});

describe('octo frame', () => {
  const src = figureSource('octo');
  const deg = Math.PI / 180;
  // ArduPilot's octa X: motor -> angle clockwise from the nose (AP_MotorsMatrix setup_octa_matrix, FRAME_TYPE 1)
  const ANGLES: Record<string, number> = { M1: 22.5, M2: -157.5, M3: 67.5, M4: 157.5, M5: -22.5, M6: -112.5, M7: -67.5, M8: 112.5 };

  it('numbers its motors like ArduPilot\'s octa X, alternating spin, opposite motors turning the same way', () => {
    expect(octo.frame.layout).toBe('octo');
    expect(octo.frame.sizeMm).toBe(2 * R);
    expect(octo.frame.motors.map((m) => m[2])).toEqual(['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8']);
    for (const [x, y, id] of octo.frame.motors) {
      // x forward, y left: a motor clockwise from the nose sits on the right, at negative y
      expect(x, id).toBeCloseTo(R * Math.cos(ANGLES[id] * deg), 0);
      expect(y, id).toBeCloseTo(-R * Math.sin(ANGLES[id] * deg), 0);
    }
    const spin = Object.fromEntries(octo.frame.motors.map((m) => [m[2], m[3]]));
    expect(['M1', 'M2', 'M7', 'M8'].map((m) => spin[m])).toEqual(['CW', 'CW', 'CW', 'CW']);
    expect(['M3', 'M4', 'M5', 'M6'].map((m) => spin[m])).toEqual(['CCW', 'CCW', 'CCW', 'CCW']);
  });

  it('lists the same motors in the figure, in Motor Test order A to H, clockwise from the front right', () => {
    expect(src).toMatch(/\bR = 680\b/);
    expect(src).toMatch(/numbering: 'ardupilot'/);
    const value = (token: string) => (token.startsWith('-') ? -1 : 1) * (token.endsWith('C22') ? R * Math.cos(22.5 * deg) : R * Math.sin(22.5 * deg));
    const drawn = [...src.matchAll(/\{ id: '(M\d)', at: \[(-?[CS]22), (-?[CS]22)\], dir: '(CW|CCW)' \}/g)].map((m) => ({ id: m[1], x: value(m[2]), y: value(m[3]), dir: m[4] }));
    expect(drawn.map((m) => m.id)).toEqual(['M1', 'M3', 'M8', 'M4', 'M2', 'M6', 'M7', 'M5']);
    for (const m of drawn) {
      const [x, y, , dir] = octo.frame.motors.find((c) => c[2] === m.id)!;
      expect([m.x, m.y], m.id).toEqual([expect.closeTo(x, 0), expect.closeTo(y, 0)]);
      expect(m.dir, m.id).toBe(dir);
    }
    // clockwise seen from above: each motor's bearing from the nose is 45° more than the one before
    const bearing = (m: { x: number; y: number }) => (((Math.atan2(-m.y, m.x) / deg) % 360) + 360) % 360;
    drawn.forEach((m, i) => expect(bearing(m), m.id).toBeCloseTo(22.5 + 45 * i, 3));
  });

  it('draws eight arms and the 20-inch prop on the range', () => {
    const look = flightOf(octo)!.craft.look;
    expect(look.arms).toBe(8);
    expect(look.propR).toBeCloseTo(0.254, 3);
  });
});

describe('octo flight', () => {
  const p = octo.flight.params;
  const cli = octo.firmware.emulator.settings;
  const flight = flightOf(octo)!;
  const craft = flight.craft;

  it('sets the same numbers in the parameters as the sim flies', () => {
    expect(cli.ATC_ANGLE_MAX).toBe(p.angleLimit);
    expect(cli.LOIT_SPEED_MS).toBe(p.loiterSpeed);
    expect(cli.PILOT_SPD_UP).toBe(p.climbRate);
    expect(cli.RTL_ALT_M).toBe(p.rtlAlt);
    for (const e of octo.firmware.emulator.effects) {
      for (const [name, value] of Object.entries(e.set)) {
        if (cli[e.setting] === e.equals && name in p) expect(p[name], `${e.setting} = ${e.equals}`).toBe(value);
      }
    }
  });

  it('sets the 12S numbers per cell, and the landing gear heights in metres', () => {
    expect(Number(cli.MOT_BAT_VOLT_MAX) / 12).toBeCloseTo(4.2, 5);
    expect(Number(cli.MOT_BAT_VOLT_MIN) / 12).toBeCloseTo(3.3, 5);
    expect(Number(cli.BATT_LOW_VOLT) / 12).toBeCloseTo(3.5, 5);
    expect(Number(cli.BATT_CRT_VOLT) / 12).toBeCloseTo(3.4, 5);
    expect(Number(cli.MOT_SPIN_MIN)).toBeGreaterThan(Number(cli.MOT_SPIN_ARM));
    expect([cli.SERVO9_FUNCTION, cli.RC7_OPTION]).toEqual([29, 29]);
    // retracting by height only works with LGR_RETRACT_ALT >= LGR_DEPLOY_ALT; both are metres, not centimetres
    expect(Number(cli.LGR_RETRACT_ALT)).toBeGreaterThanOrEqual(Number(cli.LGR_DEPLOY_ALT));
    expect(Number(cli.LGR_RETRACT_ALT)).toBeLessThan(10);
    expect(Number(cli.LGR_DEPLOY_ALT)).toBeGreaterThan(0);
    const servos = Array.from({ length: 8 }, (_, i) => cli[`SERVO${i + 1}_FUNCTION`]);
    expect(servos).toEqual([33, 34, 35, 36, 37, 38, 39, 40]);
  });

  it('holds position in Loiter, flies the orbit in AUTO and stops a motor in Motor out', () => {
    expect(octo.flight.defaultMode).toBe('loiter');
    const mode = (id: string) => craft.modes.find((m) => m.id === id)!;
    expect([mode('loiter').task, mode('loiter').position]).toEqual(['free', true]);
    expect([mode('motorout').task, mode('motorout').position]).toEqual(['motorfail', true]);
    expect([mode('auto').task, mode('auto').missionId]).toEqual(['mission', 'orbit']);
    expect(octo.courses.find((c) => c.id === 'orbit')!.kind).toBe('mission');
    expect(octo.flight.fpv.gimbal).toBe(true);
  });

  it('keeps flying on seven motors when one stops in a hover, on a little more throttle', () => {
    const course = flight.courses.find((c) => c.id === 'chase')!;
    const s = createSim(craft, course, flightCalc(octo, octo.design.default), { mode: 'loiter' });
    const events: FlightEvent[] = [];
    const run = (seconds: number, throttle: number) => {
      dispatch(s, { type: 'sticks', sticks: { throttle, yaw: 0, pitch: 0, roll: 0 } });
      for (let i = 0; i < seconds * 100 && !s.crashed; i++) {
        stepSim(s);
        events.push(...drainEvents(s));
      }
    };
    dispatch(s, { type: 'arm' });
    run(5, 1);
    run(4, 0.5);
    const [x0, y0, z0] = s.p;
    const u0 = s.u;
    const yaw0 = s.yaw;
    dispatch(s, { type: 'mode', mode: 'motorout' });
    run(8, 0.5);
    expect(events.some((e) => e.type === 'motorOut')).toBe(true);
    expect(s.motorsOut).toHaveLength(1);
    expect(s.crashed).toBe(false);
    expect(Math.abs(s.p[2] - z0)).toBeLessThan(1.5);
    expect(Math.hypot(s.p[0] - x0, s.p[1] - y0)).toBeLessThan(3);
    // each of the seven carries 8/7 of the thrust it did: about 7 % more throttle, and yaw drifts
    expect(s.u / u0).toBeGreaterThan(1.03);
    expect(s.u / u0).toBeLessThan(1.12);
    expect(Math.abs(s.yaw - yaw0)).toBeGreaterThan(1);
  });

  it('comes home over everything on the backlot, and keeps the orbit clear of the water tower', () => {
    for (const c of octo.courses) {
      const tops = c.prims.map((q) => ('h' in q ? (q.h ?? 0) + ('z' in q ? (q.z ?? 0) : 0) : 0));
      expect(p.rtlAlt - p.hitRadius, c.id).toBeGreaterThan(Math.max(...tops));
      expect(c.goals.at(-1)).toMatchObject({ x: 12, y: 12, z: 0, land: true });
    }
    const orbit = octo.courses.find((c) => c.id === 'orbit')!;
    const tank = orbit.prims.find((q) => q.type === 'cyl' && q.kind === 'tower' && q.z === 12) as { x: number; y: number; r: number };
    const stills = orbit.goals.filter((g) => g.action === 'photo');
    expect(stills).toHaveLength(4);
    for (const g of stills) expect(Math.hypot(g.x - tank.x, g.y - tank.y) - g.r - p.hitRadius, g.label).toBeGreaterThan(tank.r + 4);
    // the chase's tower checkpoint sits above the roof
    const chase = octo.courses.find((c) => c.id === 'chase')!;
    const over = chase.goals[3];
    expect(Math.hypot(over.x - tank.x, over.y - tank.y)).toBeLessThan(1);
    expect(over.z - over.r).toBeGreaterThan(19);
  });
});

describe('octo craft tests in the figure', { timeout: 300000 }, () => {
  let fig: Awaited<ReturnType<typeof openFigure>> | null = null;
  afterEach(() => {
    fig?.close();
    fig = null;
  });
  const test = (id: string) => octo.tests.find((t) => t.id === id)!;
  const logged = () => (fig!.st().log.lines as string[]).join('\n');

  it('works the landing gear only with a pack in, and forgets the pass when the craft is rebuilt', async () => {
    fig = await openFigure('octo');
    await fig.press('gear');
    expect(fig.status(test('gear'))).toBe('failed');
    await fig.run('plugIn');
    await fig.press('gear');
    expect(fig.status(test('gear'))).toBe('passed');
    expect(logged()).toContain('SERVO9 (AUX 1) LandingGear');
    await fig.run('unplug');
    await fig.run('strip');
    await fig.run('build');
    expect(fig.status(test('gear'))).toBe('failed');
    expect(fig.page.notes()).toEqual([]);
  });

  it('locks both GPS with a pack in, and needs the check again once a mast is re-seated', async () => {
    fig = await openFigure('octo');
    await fig.press('gps');
    expect(fig.status(test('gps'))).toBe('failed');
    await fig.run('plugIn');
    await fig.press('gps');
    expect(fig.status(test('gps'))).toBe('passed');
    await fig.run('unplug');
    await fig.remove('GPS');
    await fig.add('GPS');
    expect(fig.status(test('gps'))).toBe('failed');
  });

  it('will not arm with the props on, without a GPS fix or uncalibrated, and arms once all three are right', async () => {
    fig = await openFigure('octo');
    await fig.run('plugIn');
    await fig.press('prearm');
    expect(fig.status(test('prearm'))).toBe('failed');
    expect(fig.st().msg).toMatch(/^Props off/);
    await fig.run('unplug');
    await fig.remove('PROPS');
    await fig.run('plugIn');
    await fig.press('prearm');
    expect(fig.status(test('prearm'))).toBe('failed');
    expect(logged()).toContain('PreArm: GPS 1: Bad fix');
    await fig.press('gps');
    await fig.press('prearm');
    expect(fig.status(test('prearm'))).toBe('passed');
    // an uncalibrated accelerometer blocks it again, and a failed run takes the pass back
    fig.st().accOk = false;
    await fig.press('prearm');
    expect(fig.status(test('prearm'))).toBe('failed');
    expect(logged()).toContain('PreArm: 3D Accel calibration needed');
    await fig.run('unplug');
    await fig.run('calibrate');
    expect(fig.status(test('calibrate'))).toBe('passed');
    await fig.run('plugIn');
    await fig.press('prearm');
    expect(fig.status(test('prearm'))).toBe('passed');
  });

  it('fails the smoke stopper on a reversed capacitor and passes it once the capacitor is turned round', async () => {
    fig = await openFigure('octo');
    await fig.add('XT60', 1);
    await fig.run('smoke');
    expect(fig.status(test('smoke'))).toBe('failed');
    await fig.add('XT60', 0);
    await fig.run('smoke');
    expect(fig.status(test('smoke'))).toBe('passed');
  });
});
