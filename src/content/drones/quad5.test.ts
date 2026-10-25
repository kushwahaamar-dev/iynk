import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '@/i18n/content/en/drones/quad5.json';
import goldenA from '@/lib/drone/__fixtures__/golden-a.json';
import { calc, type CalcResult } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { flightOf } from '@/lib/flight/registry';
import type { DesignPick } from '@/content/schema';
import quad5 from './quad5';

type Golden = {
  craft: string;
  precision: Record<string, number>;
  rows: (DesignPick & Record<string, number | boolean | string | number[]>)[];
};

const appendixA = (goldenA as unknown as Golden[]).find((t) => t.craft === 'quad5')!;
// Vitest runs from the repo root (vitest.config.mts); the jsdom environment gives import.meta.url no file path.
const figureSource = readFileSync(join(process.cwd(), 'figures/drones/quad5.js'), 'utf8');

function text(key: string): string {
  const value = key.split('.').reduce<unknown>((node, k) => (node as Record<string, unknown> | undefined)?.[k], en);
  if (typeof value !== 'string') throw new Error(`no en text for ${key}`);
  return value;
}

/** The line the original printed under the design tiles for a build. */
function verdictKey(r: CalcResult) {
  if (r.over) return 'design.verdict.over';
  if (r.weak) return 'design.verdict.weak';
  return r.tw > 10 ? 'design.verdict.punch' : 'design.verdict.ok';
}

function verdictLine(pick: DesignPick, r: CalcResult) {
  return text(verdictKey(r))
    .replace('{kv}', String(quad5.design.motors[pick.motor].kv))
    .replace('{cells}', String(quad5.design.batts[pick.batt].cells))
    .replace('{tw}', r.tw.toFixed(1));
}

describe('quad5 design calculator', () => {
  // Three cells of the printed table were rounded twice (the calc agent's slack of 0.55 in the last digit covers
  // them); the formula, which is the original's code, gives the values below, and the Drone Lab tiles show these.
  const corrected = [
    ['6s1100', '2207-1950', '5x5x3', 'hoverMin', 10.7, 10.6],
    ['6s1100', '2306-2450', '5x4.3x3', 'maxA', 282, 283],
    ['6s1800', '2306-2450', '5x4.3x3', 'maxA', 282, 283],
  ] as const;

  it('reproduces all 27 builds of drone-lab-a Appendix A at their printed precision', () => {
    expect(appendixA.rows).toHaveLength(27);
    for (const row of appendixA.rows) {
      const pick = { batt: row.batt, motor: row.motor, prop: row.prop };
      const r = calc(designInput(quad5.design, pick));
      const at = `${pick.batt} / ${pick.motor} / ${pick.prop}`;
      for (const [field, digits] of Object.entries(appendixA.precision)) {
        const got = r[field as keyof CalcResult] as number;
        expect(Math.abs(got - (row[field] as number)), `${at} ${field}`).toBeLessThanOrEqual(0.55 * 10 ** -digits + 1e-9);
      }
      expect([r.over, r.weak], at).toEqual([row.over, row.weak]);
      expect([r.cost.electrical, r.cost.mechanical, r.cost.total], at).toEqual(row.cost);
      expect(verdictLine(pick, r), at).toBe(row.verdict);
    }
  });

  it('rounds the three twice-rounded table cells the way the tiles do', () => {
    for (const [batt, motor, prop, field, printed, tile] of corrected) {
      const row = appendixA.rows.find((r) => r.batt === batt && r.motor === motor && r.prop === prop)!;
      expect(row[field]).toBe(printed);
      const got = calc(designInput(quad5.design, { batt, motor, prop }))[field];
      expect(field === 'maxA' ? Math.round(got) : Number(got.toFixed(1))).toBe(tile);
    }
  });

  it('keeps spot golden rows whose verdict key matches the result', () => {
    expect(quad5.design.golden.length).toBeGreaterThan(0);
    for (const row of quad5.design.golden) {
      expect(verdictKey(calc(designInput(quad5.design, row.pick)))).toBe(row.verdict);
    }
  });

  it('defaults to the original build, which neither over-spins nor lacks thrust', () => {
    const r = calc(designInput(quad5.design, quad5.design.default));
    expect(quad5.design.default).toEqual({ batt: '6s1100', motor: '2306-1750', prop: '5x4.3x3' });
    expect({ over: r.over, weak: r.weak }).toEqual({ over: false, weak: false });
  });
});

describe('quad5 frame and figure', () => {
  it('numbers and spins the motors like Betaflight QUAD X, props in', () => {
    const a = 225 / 2 / Math.SQRT2;
    const want = [
      ['M1', -1, -1, 'CW'],
      ['M2', 1, -1, 'CCW'],
      ['M3', -1, 1, 'CCW'],
      ['M4', 1, 1, 'CW'],
    ] as const;
    expect(quad5.frame.motors).toHaveLength(4);
    quad5.frame.motors.forEach(([x, y, label, dir], i) => {
      const [id, sx, sy, spin] = want[i];
      expect([label, dir]).toEqual([id, spin]);
      expect(Math.abs(x - sx * a)).toBeLessThan(0.1);
      expect(Math.abs(y - sy * a)).toBeLessThan(0.1);
    });
    expect(quad5.frame.propDirection).toBe('props-in');
  });

  it('uses the figure file’s part ids, shorts and build order', () => {
    const block = figureSource.slice(figureSource.indexOf('parts: ['), figureSource.indexOf('tests: {'));
    const figureParts = [...block.matchAll(/\{ id: '([A-Z0-9]+)', short: '([^']+)'/g)].map((m) => [m[1], m[2]]);
    expect(figureParts).toHaveLength(12);
    expect(quad5.parts.map((p) => [p.id, p.short])).toEqual(figureParts);
    expect(quad5.figure.parts.map((p) => [p.id, p.short])).toEqual(figureParts);
    expect(quad5.build.map((s) => s.part)).toEqual(figureParts.map(([id]) => id));
    for (const step of quad5.build) expect(step.done).toEqual({ [`placed.${step.part}`]: 0 });
  });

  it('lists the same design keys as the figure', () => {
    for (const key of [...Object.keys(quad5.design.batts), ...Object.keys(quad5.design.motors), ...Object.keys(quad5.design.props)]) {
      expect(figureSource, key).toContain(`'${key}': {`);
    }
  });

  it('lists the wiring sheet’s edges, one for one', () => {
    const sheet = figureSource.slice(figureSource.indexOf('edges: ['));
    const edges = [...sheet.matchAll(/\{ from: '(\w+)', to: '(\w+)', kind: '(\w+)'/g)].map((m) => `${m[1]}>${m[2]}:${m[3]}`);
    expect(quad5.wiring.map((w) => `${w.from}>${w.to}:${w.kind}`)).toEqual(edges);
    for (const w of quad5.wiring) expect(w.note).toBe(`wiring.${w.from}-${w.to}`);
  });

  it('only runs tests the figure has buttons for', () => {
    const done = { smoke: 'smokeOk', motors: 'motorOk', calibrate: 'accOk' } as const;
    expect(quad5.tests.map((t) => t.button)).toEqual(['smoke', 'motors', 'calibrate']);
    const figureTests = figureSource.slice(figureSource.indexOf('tests: {'), figureSource.indexOf('wiring: {'));
    for (const t of quad5.tests) expect(figureTests, t.button).toMatch(new RegExp(`\\b${t.button}: \\{ needs`));
    for (const t of quad5.tests) expect(t.done).toEqual({ [done[t.button as keyof typeof done]]: true });
  });
});

describe('quad5 flight', () => {
  const p = quad5.flight.params;
  const cli = quad5.firmware.emulator.settings;
  // the range flies this module through the registry: there is no second copy of the numbers or the field
  const range = flightOf(quad5)!;

  it('flies the range’s numbers', () => {
    const craft = range.craft as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(p)) expect(craft[key], key).toBe(value);
    expect(range.craft.modes.map((m) => m.id)).toEqual([...quad5.flight.modes.map((m) => m.id), 'demo']);
    expect(quad5.flight.modes.map((m) => m.id)).toContain(quad5.flight.defaultMode);
    expect(quad5.flight.fpv).toEqual({ fovDeg: range.craft.fov, camTiltDeg: range.craft.camTilt, gimbal: false });
  });

  it('sets the same numbers in the CLI as the sim flies (one source of truth)', () => {
    expect(cli.angle_limit).toBe(p.angleLimit);
    expect(Number(cli.roll_srate) * 10).toBe(p.acroRate);
    expect(Number(cli.pitch_srate) * 10).toBe(p.acroRate);
    expect(Number(cli.yaw_srate) * 10).toBe(p.yawRate);
    expect(cli.yaw_rc_rate).toBe(cli.yaw_srate);
    expect(Number(cli.alt_hold_climb_rate) / 10).toBe(p.climbRate);
  });

  it('flies both courses on one field: the race scores the gates, the bando run the checkpoints', () => {
    const [race, bando] = quad5.courses;
    expect([race.id, race.kind, bando.id, bando.kind]).toEqual(['race', 'gates', 'bando', 'checkpoints']);
    expect(race.prims).toBe(bando.prims);
    expect(race.gates).toEqual(bando.gates);
    const [raceRange, bandoRange] = range.courses;
    expect(raceRange.gates.map((g) => [g.x, g.y, g.heading])).toEqual(race.gates);
    expect(bandoRange.checkpoints.map(({ x, y, z, r, heading }) => ({ x, y, z, r, heading }))).toEqual(
      bando.goals.map(({ x, y, z, r, heading }) => ({ x, y, z, r, heading })),
    );
    for (const g of bando.goals) expect(text(g.label), g.label).toBeTruthy();
    // every solid names what you hit, so the crash line is never the generic one
    for (const prim of race.prims) if (prim.type === 'box' || prim.type === 'cyl') expect(prim.kind, JSON.stringify(prim)).toBeDefined();
  });

  it('keeps every checkpoint below the top of altitude hold', () => {
    const ceiling = quad5.courses[1].ceiling ?? p.ceiling;
    for (const g of quad5.courses[1].goals) expect(g.z - g.r).toBeLessThan(ceiling - 3);
  });
});

describe('quad5 firmware', () => {
  const { snippets, emulator } = quad5.firmware;
  const lines = snippets.flatMap((s) => s.code.split('\n').map((line) => ({ id: s.id, line: line.replace(/\s+#.*$/, '').trim() })));

  function valid(name: string, value: string | number) {
    const lim = emulator.limits[name];
    if (!lim) return true;
    if (lim.values) return lim.values.includes(String(value));
    const n = Number(value);
    return Number.isInteger(n) && (lim.min === undefined || n >= lim.min) && (lim.max === undefined || n <= lim.max);
  }

  it('has a snippet for the build and for every flight mode', () => {
    const modes = quad5.flight.modes.map((m) => m.id);
    for (const s of snippets) expect(['build', ...modes]).toContain(s.mode);
    for (const m of modes) expect(snippets.some((s) => s.mode === m), m).toBe(true);
  });

  it('only sets settings Betaflight 2026.6.2 has, within their ranges', () => {
    for (const [name, value] of Object.entries(emulator.settings)) expect(valid(name, value), name).toBe(true);
    for (const { id, line } of lines.filter((l) => l.line.startsWith('set '))) {
      const m = /^set (\w+) = (\S+)$/.exec(line);
      expect(m, `${id}: ${line}`).not.toBeNull();
      expect(Object.keys(emulator.settings), `${id}: ${m![1]}`).toContain(m![1]);
      expect(valid(m![1], m![2]), `${id}: ${line}`).toBe(true);
    }
  });

  it('starts the CLI emulator with exactly the values the snippets set', () => {
    for (const { id, line } of lines.filter((l) => l.line.startsWith('set '))) {
      const [, name, value] = /^set (\w+) = (\S+)$/.exec(line)!;
      expect(String(emulator.settings[name]), `${id}: ${line}`).toBe(value);
    }
  });

  it('never uses the removed or invented names the originals had', () => {
    const banned = /\b(p_level|i_level|level_limit|angle_level_strength|alt_hold_throttle_deadband|osd_timer_1|osd_stat_max_spd|mini_quad|dshot_idle_value|d_min_roll|gyro_1_sensor_align)\b/;
    for (const s of snippets) expect(s.code, s.id).not.toMatch(banned);
  });

  it('writes aux and serial lines in the 2026.6 syntax', () => {
    const modeIds = new Set([0, 1, 2, 3, 13, 26, 28, 35, 36, 39, 46, 47, 49, 52]);
    for (const { id, line } of lines.filter((l) => l.line.startsWith('aux '))) {
      const n = line.split(' ').slice(1).map(Number);
      expect(n, `${id}: ${line}`).toHaveLength(7);
      expect(modeIds.has(n[1]), `${id}: ${line}`).toBe(true);
      expect(n[3] >= 900 && n[4] <= 2100 && n[3] % 25 === 0 && n[4] % 25 === 0, `${id}: ${line}`).toBe(true);
    }
    for (const { id, line } of lines.filter((l) => l.line.startsWith('serial '))) {
      expect(line, id).toMatch(/^serial UART\d (64|2048) 115200 57600 0 115200$/);
    }
  });

  it('decodes the OSD numbers the way the comments say', () => {
    const pos = (v: number) => ({ x: v & 31, y: (v >> 5) & 63, profile1: (v & 2048) !== 0 });
    expect(pos(2103)).toEqual({ x: 23, y: 1, profile1: true });
    expect(pos(2433)).toEqual({ x: 1, y: 12, profile1: true });
    expect({ source: 18 & 15, precision: (18 >> 4) & 15 }).toEqual({ source: 2, precision: 1 });
  });
});

describe('quad5 texts and quizzes', () => {
  const keyRe = /^(design|parts|build|wiring|tests|firmware|flight|courses|quizzes)\.[\w-]+(\.[\w-]+)*$/;
  const top = new Set(['title', 'tagline', 'overview', 'sub', 'hint', 'noun', 'practice']);

  function keys(node: unknown, out: string[] = []): string[] {
    if (typeof node === 'string') {
      if (top.has(node) || keyRe.test(node)) out.push(node);
    } else if (Array.isArray(node)) node.forEach((v) => keys(v, out));
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) if (k !== 'code') keys(v, out);
    return out;
  }

  it('has English text for every key the item uses, and a tagline for the index card', () => {
    for (const key of keys(quad5)) expect(() => text(key), key).not.toThrow();
    expect(text('tagline').length).toBeGreaterThan(0);
  });

  it('asks each quiz after a real build step, with the answer among the options', () => {
    const steps = new Set(quad5.build.map((s) => s.id));
    for (const quiz of quad5.quizzes) {
      if (quiz.afterStep !== null) expect(steps.has(quiz.afterStep), quiz.id).toBe(true);
      for (const q of quiz.questions) {
        expect(q.answer, `${quiz.id}.${q.id}`).toBeLessThan(q.options.length);
        q.options.forEach((o, i) => expect(o).toBe(`quizzes.${quiz.id}.${q.id}.options.${i + 1}`));
      }
    }
    expect(quad5.quizzes.some((q) => q.afterStep === null)).toBe(true);
  });
});
