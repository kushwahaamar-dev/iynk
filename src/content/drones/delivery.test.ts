import { afterEach, describe, expect, it } from 'vitest';
import en from '@/i18n/content/en/drones/delivery.json';
import { calc, designChecks } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { checkCraft, figureSource, openFigure } from './_checks';
import delivery from './delivery';

checkCraft(delivery, en, { allSnippetsInEmulator: true });

const checks = (pick: Partial<typeof delivery.design.default>) =>
  designChecks(designInput(delivery.design, { ...delivery.design.default, ...pick })).map((c) => c.code);

describe('delivery design', () => {
  it('lifts the parcel at 1.95:1 on the default build, and warns only that the hover throttle reads high', () => {
    const r = calc(designInput(delivery.design, delivery.design.default));
    expect(r.tw).toBeGreaterThan(delivery.design.model.minTW);
    expect(checks({})).toEqual(['hover-high']);
    expect(en.design.verdict.ok).toMatch(/MOT_THST_HOVER/);
  });

  it('cannot leave the ground on 4S with the 400 KV motors, and over-spins 15-inch props with 700 KV on 6S', () => {
    expect(checks({ batt: '4s10000' })).toContain('cannot-hover');
    expect(checks({ motor: '2814-700' })).toContain('over-spin');
    expect(en.quizzes.fly.fourS.why).toMatch(/0\.95:1/);
  });
});

describe('delivery frame', () => {
  it('numbers and spins the motors like ArduCopter QUAD X, 690 mm across the diagonal', () => {
    const a = 690 / 2 / Math.SQRT2;
    const want = [
      ['M1', 1, -1, 'CCW'],
      ['M2', -1, 1, 'CCW'],
      ['M3', 1, 1, 'CW'],
      ['M4', -1, -1, 'CW'],
    ] as const;
    delivery.frame.motors.forEach(([x, y, label, dir], i) => {
      const [id, sx, sy, spin] = want[i];
      expect([label, dir]).toEqual([id, spin]);
      expect(Math.abs(x - sx * a)).toBeLessThan(0.05);
      expect(Math.abs(y - sy * a)).toBeLessThan(0.05);
    });
  });

  it('spins the figure’s motors in Mission Planner’s motor-test order: A = M1, B = M4, C = M2, D = M3', () => {
    const order = [...figureSource('delivery').matchAll(/\{ id: '(M\d)', at: \[/g)].map((m) => m[1]);
    expect(order).toEqual(['M1', 'M4', 'M2', 'M3']);
    expect(en.tests.motors.pass).toMatch(/A is M1, B is M4, C is M2, D is M3/);
  });
});

describe('delivery firmware', () => {
  const cli = delivery.firmware.emulator.settings;

  it('puts the four motors on AUX 1-4 and the winch on AUX 5, as the wiring sheet draws them', () => {
    expect([cli.SERVO9_FUNCTION, cli.SERVO10_FUNCTION, cli.SERVO11_FUNCTION, cli.SERVO12_FUNCTION]).toEqual([33, 34, 35, 36]);
    expect(cli.SERVO13_FUNCTION).toBe(88);
    expect(cli.WINCH_TYPE).toBe(1);
    expect(delivery.wiring.find((w) => w.from === 'FC' && w.to === 'ESC')!.label).toMatch(/^AUX 1-4/);
    expect(delivery.wiring.find((w) => w.to === 'CARGO')!.label).toMatch(/^AUX 5/);
  });

  it('talks MAVLink2 to the SiK radio on TELEM1 and to the Pi on TELEM2, and takes CRSF on TELEM3', () => {
    expect([cli.SERIAL1_PROTOCOL, cli.SERIAL1_BAUD]).toEqual([2, 57]);
    expect([cli.SERIAL2_PROTOCOL, cli.SERIAL2_BAUD]).toEqual([2, 921]);
    expect(cli.SERIAL5_PROTOCOL).toBe(23);
  });

  it('sets 6S voltages for the motors and the battery failsafes, with a 30 % reserve', () => {
    expect(cli.MOT_BAT_VOLT_MAX).toBeCloseTo(4.2 * 6, 9);
    expect(cli.MOT_BAT_VOLT_MIN).toBeCloseTo(3.3 * 6, 9);
    expect(cli.BATT_LOW_VOLT).toBeCloseTo(3.5 * 6, 9);
    expect(cli.BATT_CRT_VOLT).toBeCloseTo(3.3 * 6, 9);
    expect(Number(cli.BATT_LOW_MAH) / Number(cli.BATT_CAPACITY)).toBe(0.3);
  });

  it('never writes the pre-4.7 centimetre names outside a comment', () => {
    const old = /\b(RTL_ALT|RTL_SPEED|LOIT_SPEED|LOIT_ACC_MAX|PILOT_SPEED_UP|WPNAV_SPEED|ARMING_CHECK|FS_BATT_ENABLE)\b(?!_)/;
    for (const s of delivery.firmware.snippets) {
      for (const line of s.code.split('\n')) expect(line.replace(/#.*$/, ''), s.id).not.toMatch(old);
    }
  });
});

describe('delivery flight', () => {
  const p = delivery.flight.params;
  const cli = delivery.firmware.emulator.settings;
  const [course] = delivery.courses;
  const goal = (n: number) => course.goals[n - 1];

  it('sets the same numbers in the parameters as the sim flies', () => {
    expect(cli.ATC_ANGLE_MAX).toBe(p.angleLimit);
    expect(cli.LOIT_SPEED_MS).toBe(p.loiterSpeed);
    expect(cli.RTL_ALT_M).toBe(p.rtlAlt);
    expect(cli.PILOT_SPD_UP).toBe(p.climbRate);
    expect(cli.FENCE_ALT_MAX).toBe(p.ceiling);
    for (const e of delivery.firmware.emulator.effects) {
      for (const [name, value] of Object.entries(e.set)) {
        if (cli[e.setting] === e.equals && name in p) expect(p[name], `${e.setting} = ${e.equals}`).toBe(value);
      }
    }
  });

  it('cruises and returns home above everything on the field', () => {
    for (const prim of course.prims) {
      if (prim.type === 'flat' || prim.type === 'disc') continue;
      const top = ('z' in prim ? prim.z ?? 0 : 0) + (prim.h ?? 0) + (prim.type === 'house' ? prim.roof ?? 0 : 0);
      expect(top, prim.type).toBeLessThan(p.rtlAlt - 2);
    }
    expect([goal(2).z, goal(4).z, goal(5).z]).toEqual([p.rtlAlt, p.rtlAlt, p.rtlAlt]);
  });

  it('comes straight down over the drop zone, clear of the fences and trees, to winch the parcel down', () => {
    const drop = goal(3);
    expect([drop.x, drop.y]).toEqual([goal(2).x, goal(2).y]);
    expect([drop.z, drop.action]).toEqual([3.5, 'drop']);
    const zone = course.prims.find((q) => q.type === 'disc' && q.label === 'DROP')!;
    expect([zone.x, zone.y]).toEqual([drop.x, drop.y]);
    for (const prim of course.prims) {
      if (prim.type === 'flat' || prim.type === 'disc') continue;
      expect(Math.hypot(prim.x - drop.x, prim.y - drop.y), `${prim.type} ${prim.x},${prim.y}`).toBeGreaterThan(5);
    }
    // two 4 s loiters while 3.4 m of line goes out and comes back at WINCH_RATE_MAX
    expect(drop.hold).toBe(8);
    expect((2 * 3.4) / Number(cli.WINCH_RATE_MAX)).toBeLessThanOrEqual(drop.hold!);
    expect(delivery.firmware.snippets.find((s) => s.id === 'auto')!.code).toMatch(/NAV_LOITER_TIME 4 s[\s\S]*NAV_LOITER_TIME 4 s/);
  });

  it('flies the delivery in AUTO and lands on the pad, opening in Loiter', () => {
    const auto = delivery.flight.modes.find((m) => m.kind === 'auto')!;
    expect(auto.mission).toBe(course.id);
    expect(course.kind).toBe('mission');
    const home = course.goals.at(-1)!;
    expect([home.x, home.y, home.z, home.land]).toEqual([...course.pad, 0, true]);
    expect(cli.WP_SPD).toBe(goal(2).speed);
    expect(cli.WP_SPD_DN).toBe(goal(3).speed);
    expect(delivery.flight.defaultMode).toBe('loiter');
  });
});

describe('delivery craft tests in the figure', { timeout: 300000 }, () => {
  let fig: Awaited<ReturnType<typeof openFigure>> | null = null;
  afterEach(() => {
    fig?.close();
    fig = null;
  });
  const test = (id: string) => delivery.tests.find((t) => t.id === id)!;
  /**
   * The checks run on the figure's clock: animation frames, which jsdom spaces out and the engine caps per frame, so
   * a 5 s GPS lock takes several times longer on a busy machine. Wait for the result.
   */
  const until = async (id: string, want: 'passed' | 'failed', ms = 120000) => {
    const end = Date.now() + ms;
    while (fig!.status(test(id)) !== want && Date.now() < end) await new Promise((r) => setTimeout(r, 50));
    return fig!.status(test(id));
  };
  const extra = () => fig!.state().extra as Record<string, unknown>;

  it('calibrates the compass only with the props off, and re-seating the GPS mast clears it', async () => {
    fig = await openFigure('delivery');
    await fig.remove('GPS');
    await fig.add('GPS');
    expect(fig.status(test('compass'))).toBe('failed');
    expect(fig.status(test('gps'))).toBe('failed');
    await fig.press('compass');
    expect(fig.status(test('compass'))).toBe('failed');
    await fig.remove('PROPS');
    await fig.press('compass');
    expect(await until('compass', 'passed')).toBe('passed');
    expect(extra().compassOrient).toBe(0);
    expect(fig.page.notes()).toEqual([]);
  });

  it('finds the GPS puck turned round and calibrates it as rotated, which the arrow-forward mount avoids', async () => {
    fig = await openFigure('delivery');
    await fig.remove('PROPS');
    await fig.add('GPS', 1);
    expect(fig.status(test('compass'))).toBe('failed');
    await fig.press('compass');
    expect(await until('compass', 'passed')).toBe('passed');
    expect(extra().compassOrient).toBe(4);
    expect(fig.st().msg).toMatch(/COMPASS_ORIENT 4/);
  });

  it('runs the failsafe, winch and GPS checks on a fresh build only with the pack in, the failsafe only with the props off', async () => {
    fig = await openFigure('delivery');
    fig.SD.actions.strip(fig.st());
    await fig.settle(180000);
    fig.SD.actions.build(fig.st());
    await fig.settle(180000);
    for (const id of ['compass', 'gps', 'winch', 'failsafe']) expect(fig.status(test(id)), id).toBe('failed');

    await fig.press('failsafe');
    expect(fig.status(test('failsafe'))).toBe('failed');
    await fig.remove('PROPS');
    await fig.press('failsafe');
    await fig.press('winch');
    await fig.press('gps');
    expect(['failsafe', 'winch', 'gps'].map((id) => fig!.status(test(id)))).toEqual(['failed', 'failed', 'failed']);

    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(await until('failsafe', 'passed')).toBe('passed');
    await fig.press('winch');
    expect(await until('winch', 'passed')).toBe('passed');
    await fig.press('gps');
    expect(await until('gps', 'passed')).toBe('passed');

    await fig.run('unplug');
    await fig.remove('CARGO');
    await fig.add('CARGO');
    expect(fig.status(test('winch'))).toBe('failed');
    expect(fig.status(test('gps'))).toBe('passed');
  });
});
