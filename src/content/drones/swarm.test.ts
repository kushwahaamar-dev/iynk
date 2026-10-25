import { afterEach, describe, expect, it } from 'vitest';
import en from '@/i18n/content/en/drones/swarm.json';
import { runnableLines } from '@/components/dronelab/CliConsole';
import { calc } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { isEngineTest } from '@/lib/dronelab/bench';
import { createCliSession, runCli, type CliContext } from '@/lib/dronelab/cli';
import { flightCalc } from '@/lib/dronelab/fly';
import { flightOf } from '@/lib/flight/registry';
import { createSim, dispatch, drainEvents, stepSim } from '@/lib/flight/sim';
import type { FlightEvent } from '@/lib/flight/types';
import { figureSource, openFigure, text, textKeys, verdictKey } from './_checks';
import swarm from './swarm';

// _checks.ts checkCraft() assumes the engine's smoke stopper and `set` / `param set` CLI lines; a Crazyflie has
// neither (docs/requests/P2-drones-heavy-to-driver-checks-cflib.md), so this file runs the same checks its own way.

const src = figureSource('swarm');
const leaves = (node: unknown, prefix = ''): string[] =>
  node && typeof node === 'object'
    ? Object.entries(node).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k))
    : [prefix];
/** The figure's define() block from `start` up to the next line at the same indent that starts with `end`. */
const block = (start: string, end: string) => {
  const from = src.indexOf(`\n    ${start}`);
  const to = src.indexOf(`\n    ${end}`, from + 1);
  return src.slice(from, to < 0 ? undefined : to);
};
const figureParts = () => {
  const parts = block('parts: [', 'tests: {');
  const rows = [...parts.matchAll(/\{ id: '([A-Z0-9]+)', short: '([^']+)'/g)];
  return rows.map((m, i) => {
    const body = parts.slice(m.index, rows[i + 1]?.index);
    const after = /after: \[([^\]]*)\]/.exec(body)?.[1] ?? '';
    return { id: m[1], short: m[2], after: [...after.matchAll(/'([A-Z0-9]+)'/g)].map((a) => a[1]) };
  });
};

/** Every cf.param.set_value line in the snippets, in order, with the code it sits in. */
const SET = /cf\.param\.set_value\('([\w.]+)', (-?\d+(?:\.\d+)?)\)/;
const setLines = swarm.firmware.snippets.flatMap((s) =>
  s.code
    .split('\n')
    .map((line) => line.replace(/\s+#.*$/, '').trim())
    .filter((line) => SET.test(line))
    .map((line) => {
      const [, name, value] = SET.exec(line)!;
      return { id: s.id, mode: s.mode, line, name, value: Number(value) };
    }),
);

describe('swarm texts and quizzes', () => {
  it('has English text for every key the item uses, and none it never shows', () => {
    const used = new Set([...textKeys(swarm), 'tagline']);
    for (const key of used) expect(() => text(en, key), key).not.toThrow();
    expect(leaves(en).filter((k) => !used.has(k) && !k.startsWith('design.verdict.'))).toEqual([]);
    expect(() => text(en, 'design.verdict.ok')).not.toThrow();
  });

  it('asks each quiz after a real build step, with the answer among the options', () => {
    const steps = new Set(swarm.build.map((s) => s.id));
    for (const quiz of swarm.quizzes) {
      if (quiz.afterStep !== null) expect(steps.has(quiz.afterStep), quiz.id).toBe(true);
      for (const q of quiz.questions) {
        expect(q.answer).toBeLessThan(q.options.length);
        q.options.forEach((o, i) => expect(o).toBe(`quizzes.${quiz.id}.${q.id}.options.${i + 1}`));
      }
    }
    expect(swarm.quizzes.some((q) => q.afterStep === null)).toBe(true);
  });
});

describe('swarm figure file', () => {
  const parts = figureParts();

  it('uses the figure’s part ids, shorts and build order, each part after the ones it needs', () => {
    const rows = parts.map((p) => [p.id, p.short]);
    expect(swarm.figure.page).toBe('/figures/drones/swarm.html');
    expect(swarm.parts.map((p) => [p.id, p.short])).toEqual(rows);
    expect(swarm.figure.parts.map((p) => [p.id, p.short])).toEqual(rows);
    const order = swarm.build.map((s) => s.part);
    expect(order).toEqual(parts.map((p) => p.id));
    for (const p of parts) {
      const step = swarm.build.find((s) => s.part === p.id)!;
      expect(step.done).toEqual({ [`placed.${p.id}`]: 0 });
      for (const need of p.after) expect(order.indexOf(need), `${p.id} after ${need}`).toBeLessThan(order.indexOf(p.id));
      if (p.after.length) expect(step.refusal, p.id).toBe(`build.${step.id}.refusal`);
    }
  });

  it('lists the same design keys, wiring edges and craft buttons as the figure', () => {
    const d = swarm.design;
    for (const key of [...Object.keys(d.batts), ...Object.keys(d.motors), ...Object.keys(d.props)]) expect(src).toContain(`'${key}': {`);
    expect(src).toContain(`default: { batt: '${d.default.batt}', motor: '${d.default.motor}', prop: '${d.default.prop}' }`);
    const edges = [...block('wiring: {', '});').matchAll(/\{ from: '(\w+)', to: '(\w+)', kind: '(\w+)'/g)].map((m) => `${m[1]}>${m[2]}:${m[3]}`);
    expect(swarm.wiring.map((w) => `${w.from}>${w.to}:${w.kind}`)).toEqual(edges);
    for (const w of swarm.wiring) expect(w.note).toBe(`wiring.${w.from}-${w.to}`);
    const buttons = [...src.matchAll(/\{ id: '(\w+)', label: '/g)].map((m) => m[1]);
    for (const t of swarm.tests.filter((x) => !isEngineTest(x))) {
      expect(buttons, t.id).toContain(t.button);
      expect(Object.keys(t.done), t.id).toEqual([`extra.${t.id}Ok`]);
    }
  });

  it('runs the motor check and the calibration but no smoke stopper: nothing in its power path is hand-soldered', () => {
    const engine = block('tests: {', 'buttons, report,');
    expect(engine).toMatch(/smoke: false/);
    expect(engine).toMatch(/motors: \{ needs: \['WIRES', 'FC'\] \}/);
    expect(engine).toMatch(/calibrate: \{ needs: \['FC'\] \}/);
    expect(swarm.tests.filter(isEngineTest).map((t) => [t.button, t.done])).toEqual([
      ['motors', { motorOk: true }],
      ['calibrate', { accOk: true }],
    ]);
    // three safety checks (motors, calibration, link loss) and two of the craft's own (link, positioning)
    expect(swarm.tests.map((t) => t.kind)).toEqual(['motor-direction', 'accel-calibration', 'radio-link', 'arming-checks', 'failsafe']);
  });
});

describe('swarm design calculator', () => {
  it('keeps spot golden rows whose verdict key matches the result', () => {
    for (const row of swarm.design.golden) {
      const r = calc(designInput(swarm.design, row.pick));
      expect(verdictKey(swarm, row.pick, r), JSON.stringify(row.pick)).toBe(row.verdict);
    }
    const r = calc(designInput(swarm.design, swarm.design.default));
    expect({ over: r.over, weak: r.weak }).toEqual({ over: false, weak: false });
    expect(r.tw).toBeCloseTo(1.887, 3);
  });

  it('says where the original’s options differ from the real parts', () => {
    expect(swarm.design.motors['7x16hp'].label).toMatch(/7 x 20/);
    expect(swarm.design.motors['8x20'].label).toMatch(/7 mm mounts/);
    expect(swarm.design.props['47mm'].label).toMatch(/47-17/);
    expect(en.design.fixed.STRAP).toMatch(/has none/);
  });
});

describe('swarm frame', () => {
  it('numbers the motors like the firmware, clockwise from the front right, 92 mm across', () => {
    expect(swarm.frame.motors).toEqual([
      [32.5, -32.5, 'M1', 'CCW'],
      [-32.5, -32.5, 'M2', 'CW'],
      [-32.5, 32.5, 'M3', 'CCW'],
      [32.5, 32.5, 'M4', 'CW'],
    ]);
    // ARM_LENGTH 46 mm from the centre to each motor
    for (const [x, y] of swarm.frame.motors) expect(Math.hypot(x, y)).toBeCloseTo(46, 0);
    expect(Math.round(Math.hypot(65, 65))).toBe(swarm.frame.sizeMm);
    expect(src).toMatch(/layout: 'cf2', wheelbase: 92, numbering: 'crazyflie'/);
  });
});

describe('swarm firmware', () => {
  const emu = swarm.firmware.emulator;

  it('has a snippet for the build and for every flight mode', () => {
    const modes = swarm.flight.modes.map((m) => m.id);
    for (const s of swarm.firmware.snippets) expect(['build', ...modes], s.id).toContain(s.mode);
    for (const m of modes) expect(swarm.firmware.snippets.some((s) => s.mode === m), m).toBe(true);
  });

  it('only sets parameters the emulator knows, within their limits, and starts it with the last value set', () => {
    expect(setLines.length).toBeGreaterThan(0);
    const last = new Map<string, number>();
    for (const { id, mode, line, name, value } of setLines) {
      expect(Object.keys(emu.settings), `${id}: ${line}`).toContain(name);
      const lim = emu.limits[name];
      if (lim?.values) expect(lim.values, `${id}: ${line}`).toContain(String(value));
      if (lim?.min !== undefined) expect(value, `${id}: ${line}`).toBeGreaterThanOrEqual(lim.min);
      if (lim?.max !== undefined) expect(value, `${id}: ${line}`).toBeLessThanOrEqual(lim.max);
      if (mode === 'build') last.set(name, value);
    }
    for (const [name, value] of last) expect(Number(emu.settings[name]), name).toBe(value);
    for (const [name, value] of Object.entries(emu.settings)) {
      const lim = emu.limits[name];
      if (lim?.values) expect(lim.values, name).toContain(String(value));
    }
  });

  it('runs every build snippet line by line in the cflib console without an error, and reads back what it set', () => {
    const ctx: CliContext = { version: swarm.firmware.version, plugged: true, cells: 1, accCal: true, built: true };
    const run = (session: ReturnType<typeof createCliSession>, line: string) => runCli(emu, ctx, session, line);
    for (const s of swarm.firmware.snippets.filter((x) => x.mode === 'build')) {
      const lines = runnableLines(s, swarm);
      expect(lines, s.id).not.toBeNull();
      let session = createCliSession(emu);
      for (const line of lines!) {
        const r = run(session, line);
        expect(r.out.filter((o) => o.kind === 'err'), `${s.id}: ${line}`).toEqual([]);
        session = r.session;
      }
    }
    const set = run(createCliSession(emu), "cf.param.set_value('posCtlPid.rLimit', 30)");
    expect(set.effects).toEqual([{ angleLimit: 30 }]);
    expect(run(set.session, "print(cf.param.get_value('posCtlPid.rLimit'))").out.at(-1)).toEqual({ kind: 'out', text: '30' });
    expect(run(set.session, "cf.param.set_value('posCtlPid.rLimitt', 3)").out.at(-1)!.text).toMatch(/not in param TOC/);
    expect(run(set.session, "cf.param.set_value('deck.bcFlow2', 0)").out.at(-1)!.kind).toBe('err');
  });

  it('shows the mode scripts as Python, with real cflib 0.1.34 calls', () => {
    const code = (id: string) => swarm.firmware.snippets.find((s) => s.id === id)!.code;
    for (const s of swarm.firmware.snippets.filter((x) => x.mode !== 'build')) expect(runnableLines(s, swarm), s.id).toBeNull();
    expect(code('hover')).toMatch(/MotionCommander\(scf, default_height=1\.0\)/);
    expect(code('show')).toMatch(/swarm\.reset_estimators\(\)/);
    expect(code('show')).toMatch(/hl\.go_to\(x \+ dx, y \+ dy, z, 0\.0, LEG\)/);
    // the legacy commander ignores thrust until it sees a zero, and caps it at 60000
    expect(code('stabilize').split('\n').find((l) => l.includes('send_setpoint'))).toMatch(/send_setpoint\(0, 0, 0, 0\)/);
    expect(20000 + 19 * 800).toBeLessThan(60000);
    // names that are gone or wrong: the deprecated platform arming call, commander.enHighLevel, `relative=` on trajectories
    for (const s of swarm.firmware.snippets) expect(s.code, s.id).not.toMatch(/platform\.send_arming_request|enHighLevel|relative=True/);
  });

  it('lights the LEDs with real led.bitmask values: bit 7 on, then the LEDs it names', () => {
    const LED = { BLUE_L: 1, GREEN_L: 2, RED_L: 4, GREEN_R: 8, RED_R: 16 };
    expect(128 + LED.GREEN_R + LED.GREEN_L).toBe(138);
    expect(128 + LED.RED_R + LED.RED_L).toBe(148);
    expect(128 + LED.BLUE_L).toBe(129);
    const show = swarm.firmware.snippets.find((s) => s.id === 'show')!.code;
    const leds = [...show.matchAll(/\(([\d.]+), ([\d.]+), ([\d.]+), (\d+)\)/g)].map((m) => Number(m[4]));
    expect(leds).toEqual([138, 148, 138, 148, 138, 129]);
  });
});

describe('swarm flight', () => {
  const p = swarm.flight.params;
  const cli = swarm.firmware.emulator.settings;
  const [course] = swarm.courses;

  it('sets the same numbers in the parameters as the sim flies', () => {
    expect(cli['posCtlPid.rLimit']).toBe(p.angleLimit);
    expect(cli['posCtlPid.pLimit']).toBe(p.angleLimit);
    expect(cli['posCtlPid.xVelMax']).toBe(p.loiterSpeed);
    expect(cli['posCtlPid.yVelMax']).toBe(p.loiterSpeed);
    expect(cli['posCtlPid.zVelMax']).toBe(p.climbRate);
    for (const e of swarm.firmware.emulator.effects) {
      for (const [name, value] of Object.entries(e.set)) {
        if (cli[e.setting] === e.equals) expect(p[name], `${e.setting} = ${e.equals}`).toBe(value);
      }
    }
    expect(swarm.flight.fpv).toEqual({ fovDeg: p.fov, camTiltDeg: p.camTilt, gimbal: false });
  });

  it('flies four drones in a 0.6 m square, every slot on the pad and in the field the whole show', () => {
    const flight = flightOf(swarm)!;
    expect(flight.craft.swarm).toEqual({ count: 4, spacing: 0.6 });
    expect(flight.craft.look.propR).toBeCloseTo(0.0225, 4);
    const slots = [[0, 0], [0.6, 0], [0, -0.6], [0.6, -0.6]];
    const show = swarm.firmware.snippets.find((s) => s.id === 'show')!.code;
    expect(show).toMatch(/SLOT = \{URIS\[0\]: \[0\.0, 0\.0\], URIS\[1\]: \[0\.6, 0\.0\], URIS\[2\]: \[0\.0, -0\.6\], URIS\[3\]: \[0\.6, -0\.6\]\}/);
    const discs = course.prims.filter((q) => q.type === 'disc' && q.r < 0.2);
    expect(discs.map((q) => [q.x, q.y])).toEqual(slots.map(([dx, dy]) => [course.pad[0] + dx, course.pad[1] + dy]));
    for (const g of course.goals) {
      for (const [dx, dy] of slots) {
        expect(g.x + dx, g.label).toBeGreaterThan(0.3);
        expect(g.x + dx, g.label).toBeLessThan(course.field.w - 0.3);
        expect(g.y + dy, g.label).toBeGreaterThan(0.3);
        expect(g.y + dy, g.label).toBeLessThan(course.field.d - 0.3);
      }
      // the Flow deck works from 0.2 to about 3 m, and the thrust fades within 3 m of the ceiling
      expect(g.z, g.label).toBeLessThanOrEqual(Math.min(3, (course.ceiling ?? p.ceiling) - 3));
    }
  });

  it('flies a five-point star point to point, the same points the show script sends', () => {
    const star = course.goals.slice(1, 7);
    const show = swarm.firmware.snippets.find((s) => s.id === 'show')!.code;
    const sent = [...show.matchAll(/\(([\d.]+), ([\d.]+), ([\d.]+), \d+\)/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
    expect(star.map((g) => [g.x, g.y, g.z])).toEqual(sent);
    const sides = star.slice(1).map((g, i) => Math.hypot(g.x - star[i].x, g.y - star[i].y));
    for (const side of sides) expect(side).toBeCloseTo(2 * 1.5 * Math.sin((72 * Math.PI) / 180), 1);
    for (const g of star) expect(g.speed).toBe(0.8);
    const home = course.goals.at(-1)!;
    expect([home.x, home.y, home.z, home.land]).toEqual([...course.pad, 0, true]);
  });

  it('flies the show in Show mode with no two drones closer than half a slot, and lands all four on the pad', () => {
    const flight = flightOf(swarm)!;
    const mode = flight.craft.modes.find((m) => m.missionId === course.id)!;
    expect(mode.id).toBe('show');
    const s = createSim(flight.craft, flight.courses[0], flightCalc(swarm, swarm.design.default), { mode: 'show' });
    dispatch(s, { type: 'arm' });
    const events: FlightEvent[] = [];
    let closest = Infinity;
    // fly to the end of the show, then 5 s more for the landing to finish
    let after = 500;
    for (let i = 0; i < 240 * 100 && !s.crashed && after > 0; i++) {
      stepSim(s);
      events.push(...drainEvents(s));
      if (events.some((e) => e.type === 'missionDone')) after--;
      const all = [s.p, ...s.followers.map((f) => f.p)];
      for (let a = 0; a < all.length; a++)
        for (let b = a + 1; b < all.length; b++) closest = Math.min(closest, Math.hypot(all[a][0] - all[b][0], all[a][1] - all[b][1], all[a][2] - all[b][2]));
    }
    expect(events.find((e) => e.type === 'crash')).toBeUndefined();
    const done = events.find((e) => e.type === 'missionDone');
    expect(done).toMatchObject({ best: true });
    const time = done && 'time' in done ? done.time : 0;
    expect(time).toBeLessThanOrEqual(course.par!.silver);
    expect(time).toBeGreaterThan(course.par!.gold);
    expect(closest).toBeGreaterThan(0.3);
    for (const p of [s.p, ...s.followers.map((f) => f.p)]) expect(p[2]).toBeLessThan(0.05);
    expect(Math.hypot(s.p[0] - course.pad[0], s.p[1] - course.pad[1])).toBeLessThan(0.4);
  });
});

describe('swarm craft tests in the figure', { timeout: 300000 }, () => {
  let fig: Awaited<ReturnType<typeof openFigure>> | null = null;
  afterEach(() => {
    fig?.close();
    fig = null;
  });
  const test = (id: string) => swarm.tests.find((t) => t.id === id)!;
  const until = async (id: string, want: 'passed' | 'failed', ms = 120000) => {
    const end = Date.now() + ms;
    while (fig!.status(test(id)) !== want && Date.now() < end) await new Promise((r) => setTimeout(r, 50));
    return fig!.status(test(id));
  };
  const extra = () => fig!.state().extra as Record<string, unknown>;

  it('has no smoke stopper, and arms the range once the motors and the sensors are checked', async () => {
    fig = await openFigure('swarm');
    const report = fig.state() as unknown as { flight: { smokeTested: boolean; ready: boolean } };
    expect(report.flight).toMatchObject({ smokeTested: true, ready: true });
    expect(fig.SD.craft().buttons.map((b: { id: string }) => b.id)).toEqual(['link', 'position', 'failsafe', 'lights']);
    expect(fig.page.notes()).toEqual([]);
  });

  it('loses three quarters of the link with the Crazyradio’s antenna off, and connects with it on', async () => {
    fig = await openFigure('swarm');
    await fig.remove('RADIO');
    await fig.add('RADIO', 1);
    await fig.press('link');
    expect(fig.st().msg).toMatch(/Plug in the battery/);
    await fig.run('plugIn');
    await fig.press('link');
    const end = Date.now() + 120000;
    while (extra().linkQ !== 23 && Date.now() < end) await new Promise((r) => setTimeout(r, 50));
    expect(extra().linkQ).toBe(23);
    expect(fig.status(test('link'))).toBe('failed');
    expect(fig.st().msg).toMatch(/antenna is not screwed on/);
    await fig.run('unplug');
    await fig.remove('RADIO');
    await fig.add('RADIO');
    await fig.run('plugIn');
    await fig.press('link');
    expect(await until('link', 'passed')).toBe('passed');
    expect(extra().linkQ).toBe(100);
    expect(fig.page.notes()).toEqual([]);
  });

  it('finds no Lighthouse deck when it is on backwards, and settles the Kalman filter once it is turned round', async () => {
    fig = await openFigure('swarm');
    await fig.remove('PROPS');
    await fig.remove('DECKL');
    await fig.add('DECKL', 1);
    await fig.run('plugIn');
    await fig.press('position');
    expect(fig.st().msg).toMatch(/deck\.bcLighthouse4 = 0: the Lighthouse deck is on backwards/);
    expect(fig.status(test('position'))).toBe('failed');
    expect((fig.state() as unknown as { flight: { mistakes: string[] } }).flight.mistakes).toContain('deck-reversed');
    await fig.run('unplug');
    await fig.remove('DECKL');
    await fig.add('DECKL');
    await fig.run('plugIn');
    await fig.press('position');
    expect(await until('position', 'passed')).toBe('passed');
    expect(fig.page.notes()).toEqual([]);
  });

  it('runs the link-loss test only with the props off, and a fresh build starts with every craft check unrun', async () => {
    fig = await openFigure('swarm');
    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(fig.st().msg).toMatch(/PROPS OFF/);
    await fig.run('unplug');
    await fig.remove('PROPS');
    await fig.remove('WIRES');
    await fig.add('WIRES');
    expect(fig.status(test('failsafe'))).toBe('failed');
    await fig.run('plugIn');
    await fig.press('failsafe');
    expect(await until('failsafe', 'passed')).toBe('passed');

    fig.SD.actions.strip(fig.st());
    await fig.settle(180000);
    fig.SD.actions.build(fig.st());
    await fig.settle(180000);
    for (const id of ['link', 'position', 'failsafe']) expect(fig.status(test(id)), id).toBe('failed');
    expect(fig.page.notes()).toEqual([]);
  });
});
