// Checks every Drone Lab craft's content test runs: the item's texts, its figure file (part ids, build order,
// wiring sheet, test buttons), its calculator verdicts, its CLI snippets and its courses. Each <id>.test.ts calls
// checkCraft() and adds what only that craft has. The file name starts with "_", so the content index skips it.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DesignPick, DroneContent, DroneTest, FigureState } from '@/content/schema';
import { runnableLines } from '@/components/dronelab/CliConsole';
import { calc, type CalcResult } from '@/lib/drone/calc';
import { designInput } from '@/lib/drone/design';
import { isEngineTest, testStatus } from '@/lib/dronelab/bench';
import { buildFigure, loadFigure } from '../../../figures/engine/testkit.mjs';

export type Prose = Record<string, unknown>;

export function text(en: Prose, key: string): string {
  const value = key.split('.').reduce<unknown>((node, k) => (node as Record<string, unknown> | undefined)?.[k], en);
  if (typeof value !== 'string') throw new Error(`no en text for ${key}`);
  return value;
}

// Vitest runs from the repo root (vitest.config.mts); the jsdom environment gives import.meta.url no file path.
export function figureSource(id: string): string {
  return readFileSync(join(process.cwd(), `figures/drones/${id}.js`), 'utf8');
}

/** A slice of the figure's define() call: from `start` (a line at the define's indent) to the next `end`. */
function block(src: string, start: string, end: string): string {
  const from = src.indexOf(`\n    ${start}`);
  if (from < 0) throw new Error(`figure has no "${start}" block`);
  const to = src.indexOf(`\n    ${end}`, from + 1);
  return src.slice(from, to < 0 ? undefined : to);
}

function figureParts(src: string) {
  const parts = block(src, 'parts: [', 'tests: {');
  const rows = [...parts.matchAll(/\{ id: '([A-Z0-9]+)', short: '([^']+)'/g)];
  return rows.map((m, i) => {
    const body = parts.slice(m.index, rows[i + 1]?.index);
    const after = /after: \[([^\]]*)\]/.exec(body)?.[1] ?? '';
    return { id: m[1], short: m[2], after: [...after.matchAll(/'([A-Z0-9]+)'/g)].map((a) => a[1]) };
  });
}

const ENGINE_DONE: Record<string, string> = { smoke: 'smokeOk', motors: 'motorOk', calibrate: 'accOk' };
const TOP_KEYS = new Set(['title', 'tagline', 'overview', 'sub', 'hint', 'noun', 'practice']);
const KEY_RE = /^(design|parts|build|wiring|tests|firmware|flight|courses|quizzes)\.[\w-]+(\.[\w-]+)*$/;

/** Every text key the item's data names (code blocks are literal CLI, not keys). */
export function textKeys(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') {
    if (TOP_KEYS.has(node) || KEY_RE.test(node)) out.push(node);
  } else if (Array.isArray(node)) node.forEach((v) => textKeys(v, out));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) if (k !== 'code') textKeys(v, out);
  return out;
}

function leaves(node: unknown, prefix = '', out: string[] = []): string[] {
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const [k, v] of Object.entries(node)) leaves(v, prefix ? `${prefix}.${k}` : k, out);
  } else out.push(prefix);
  return out;
}

export type CraftOptions = {
  /** The craft's own verdict on top of over / weak, e.g. the wing's tail-heavy pack. */
  verdict?: (pick: DesignPick, r: CalcResult) => string | null;
  /** The original split its "parts match" line at this thrust to weight: "punch" above it, "ok" below. */
  punchAbove?: number;
  /** Every snippet's `set` lines, not only the build ones, start the CLI emulator (it shows the finished craft). */
  allSnippetsInEmulator?: boolean;
  /** The figure has `smoke: false` (a factory-built craft): the engine's tests are the motor check and calibration. */
  noSmoke?: boolean;
};

/** The key of the verdict line the original printed first for a build. */
export function verdictKey(content: DroneContent, pick: DesignPick, r: CalcResult, opts: CraftOptions = {}): string {
  if (r.over) return 'design.verdict.over';
  if (r.weak) return 'design.verdict.weak';
  const own = opts.verdict?.(pick, r);
  if (own) return `design.verdict.${own}`;
  return opts.punchAbove !== undefined && r.tw > opts.punchAbove ? 'design.verdict.punch' : 'design.verdict.ok';
}

// A settings line: Betaflight and INAV `set name = value`, MAVProxy (ArduPilot) `param set NAME value`, cflib
// `cf.param.set_value('group.name', value)`. The cflib call can sit anywhere in a line of a Python script, and a
// script may pass a variable (`led.bitmask` from a loop): then only the name can be checked.
const SET_CLI = /^(?:set (\w+) = (\S+)|param set (\w+) (\S+))$/;
const SET_PY = /cf\.param\.set_value\('([\w.]+)', ([^)]+)\)/;
const isSet = (line: string) => line.startsWith('set ') || line.startsWith('param set ') || line.includes('cf.param.set_value(');

function setOf(line: string): { name: string; value: string | null } | null {
  const cli = SET_CLI.exec(line);
  if (cli) return { name: cli[1] ?? cli[3], value: cli[2] ?? cli[4] };
  const py = SET_PY.exec(line);
  if (!py) return null;
  const raw = py[2].trim();
  // a number the way the table holds it (Python's 3.0 is the table's 3), a quoted string without its quotes
  if (/^-?\d+(\.\d+)?$/.test(raw)) return { name: py[1], value: String(Number(raw)) };
  return { name: py[1], value: /^(['"])(.*)\1$/.exec(raw)?.[2] ?? null };
}

function snippetLines(content: DroneContent) {
  return content.firmware.snippets.flatMap((s) =>
    s.code.split('\n').map((line) => ({ id: s.id, mode: s.mode, line: line.replace(/\s+#.*$/, '').trim() })),
  );
}

export function checkCraft(content: DroneContent, en: Prose, opts: CraftOptions = {}) {
  const id = content.id;
  const src = figureSource(id);

  describe(`${id} texts and quizzes`, () => {
    it('has English text for every key the item uses, and a tagline for the index card', () => {
      for (const key of textKeys(content)) expect(() => text(en, key), key).not.toThrow();
      expect(text(en, 'tagline').length).toBeGreaterThan(0);
    });

    it('has no English text the item never shows', () => {
      const used = new Set([...textKeys(content), 'tagline']);
      // the design panel looks up design.verdict.ok by name; the other verdicts are the golden rows' keys
      const extra = leaves(en).filter((k) => !used.has(k) && !k.startsWith('design.verdict.'));
      expect(extra).toEqual([]);
      expect(() => text(en, 'design.verdict.ok')).not.toThrow();
    });

    it('asks each quiz after a real build step, with the answer among the options', () => {
      const steps = new Set(content.build.map((s) => s.id));
      for (const quiz of content.quizzes) {
        if (quiz.afterStep !== null) expect(steps.has(quiz.afterStep), quiz.id).toBe(true);
        for (const q of quiz.questions) {
          expect(q.answer, `${quiz.id}.${q.id}`).toBeLessThan(q.options.length);
          q.options.forEach((o, i) => expect(o).toBe(`quizzes.${quiz.id}.${q.id}.options.${i + 1}`));
          expect(q.why).toBe(`quizzes.${quiz.id}.${q.id}.why`);
        }
      }
      expect(content.quizzes.some((q) => q.afterStep === null)).toBe(true);
    });
  });

  describe(`${id} figure file`, () => {
    const parts = figureParts(src);

    it('uses the figure’s part ids, shorts and build order', () => {
      expect(content.figure.page).toBe(`/figures/drones/${id}.html`);
      const rows = parts.map((p) => [p.id, p.short]);
      expect(content.parts.map((p) => [p.id, p.short])).toEqual(rows);
      expect(content.figure.parts.map((p) => [p.id, p.short])).toEqual(rows);
      expect(content.build.map((s) => s.part)).toEqual(parts.map((p) => p.id));
      for (const step of content.build) expect(step.done).toEqual({ [`placed.${step.part}`]: 0 });
    });

    it('fits every part after the parts the figure needs first, and gives each of those steps a refusal', () => {
      const order = content.build.map((s) => s.part);
      for (const p of parts) {
        for (const need of p.after) expect(order.indexOf(need), `${p.id} after ${need}`).toBeLessThan(order.indexOf(p.id));
        const step = content.build.find((s) => s.part === p.id)!;
        if (p.after.length) expect(step.refusal, p.id).toBe(`build.${step.id}.refusal`);
      }
    });

    it('lists the same design keys as the figure', () => {
      const d = content.design;
      for (const key of [...Object.keys(d.batts), ...Object.keys(d.motors), ...Object.keys(d.props)]) {
        expect(src, key).toContain(`'${key}': {`);
      }
      expect(src).toContain(`default: { batt: '${d.default.batt}', motor: '${d.default.motor}', prop: '${d.default.prop}' }`);
    });

    it('lists the wiring sheet’s edges, one for one', () => {
      const sheet = block(src, 'wiring: {', '});');
      const edges = [...sheet.matchAll(/\{ from: '(\w+)', to: '(\w+)', kind: '(\w+)'/g)].map((m) => `${m[1]}>${m[2]}:${m[3]}`);
      expect(content.wiring.map((w) => `${w.from}>${w.to}:${w.kind}`)).toEqual(edges);
      for (const w of content.wiring) expect(w.note).toBe(`wiring.${w.from}-${w.to}`);
    });

    it('runs the engine’s safety tests and at least one of the craft’s own, on buttons the figure has', () => {
      const engine = block(src, 'tests: {', '},');
      const buttons = [...src.matchAll(/\{ id: '(\w+)', label: '/g)].map((m) => m[1]);
      const own = content.tests.filter((t) => !isEngineTest(t));
      const want = opts.noSmoke ? ['motors', 'calibrate'] : ['smoke', 'motors', 'calibrate'];
      expect(content.tests.filter(isEngineTest).map((t) => t.button)).toEqual(want);
      if (opts.noSmoke) expect(engine).toMatch(/\bsmoke: false\b/);
      expect(own.length).toBeGreaterThan(0);
      for (const t of content.tests.filter(isEngineTest)) {
        expect(engine, t.button).toMatch(new RegExp(`\\b${t.button}: \\{ needs`));
        expect(t.done).toEqual({ [ENGINE_DONE[t.button]]: true });
      }
      for (const t of own) {
        expect(buttons, t.id).toContain(t.button);
        // a craft test's result is what the engine reports as state.extra (api.pass(id) or the craft's report hook)
        for (const [path, want] of Object.entries(t.done)) {
          expect(path, t.id).toMatch(/^extra\.\w+$/);
          expect(want, t.id).toBe(true);
        }
      }
    });
  });

  describe(`${id} design calculator`, () => {
    it('keeps spot golden rows whose verdict key matches the result', () => {
      expect(content.design.golden.length).toBeGreaterThan(0);
      for (const row of content.design.golden) {
        const r = calc(designInput(content.design, row.pick));
        expect(verdictKey(content, row.pick, r, opts), JSON.stringify(row.pick)).toBe(row.verdict);
        expect(() => text(en, row.verdict), row.verdict).not.toThrow();
      }
    });

    it('defaults to a build that neither over-spins nor lacks thrust', () => {
      const r = calc(designInput(content.design, content.design.default));
      expect({ over: r.over, weak: r.weak }).toEqual({ over: false, weak: false });
    });
  });

  describe(`${id} firmware`, () => {
    const { snippets, emulator } = content.firmware;
    const lines = snippetLines(content);
    const valid = (name: string, value: string | number) => {
      const lim = emulator.limits[name];
      if (!lim) return true;
      if (lim.values) return lim.values.includes(String(value));
      // Betaflight and INAV settings are whole numbers; ArduPilot parameters and cflib's float ones are not
      const n = Number(value);
      const whole = emulator.kind === 'mavproxy' || emulator.kind === 'cflib-python' || Number.isInteger(n);
      return Number.isFinite(n) && whole && (lim.min === undefined || n >= lim.min) && (lim.max === undefined || n <= lim.max);
    };

    it('has a snippet for the build and for every flight mode', () => {
      const modes = content.flight.modes.map((m) => m.id);
      for (const s of snippets) expect(['build', ...modes], s.id).toContain(s.mode);
      for (const m of modes) expect(snippets.some((s) => s.mode === m), m).toBe(true);
    });

    it('only sets settings the emulator knows, within their ranges, and none it keeps read-only', () => {
      const readOnly = emulator.readOnly ?? [];
      for (const [name, value] of Object.entries(emulator.settings)) expect(valid(name, value), name).toBe(true);
      for (const name of readOnly) expect(Object.keys(emulator.settings), name).toContain(name);
      for (const { id: sid, line } of lines.filter((l) => isSet(l.line))) {
        const set = setOf(line);
        expect(set, `${sid}: ${line}`).not.toBeNull();
        const { name, value } = set!;
        expect(Object.keys(emulator.settings), `${sid}: ${name}`).toContain(name);
        expect(readOnly, `${sid}: ${line}`).not.toContain(name);
        if (value !== null) expect(valid(name, value), `${sid}: ${line}`).toBe(true);
      }
    });

    // A snippet may set a value and later put it back (a motor spun up, then stopped): its last value counts.
    it('starts the CLI emulator with the last value each snippet sets', () => {
      const from = snippets.filter((s) => opts.allSnippetsInEmulator || s.mode === 'build');
      let count = 0;
      for (const s of from) {
        const last = new Map<string, string>();
        for (const { line } of lines.filter((l) => l.id === s.id && isSet(l.line))) {
          const { name, value } = setOf(line)!;
          if (value !== null) last.set(name, value);
        }
        for (const [name, value] of last) expect(String(emulator.settings[name]), `${s.id}: ${name}`).toBe(value);
        count += last.size;
      }
      expect(count).toBeGreaterThan(0);
    });

    it('only uses commands the emulator offers', () => {
      if (emulator.kind === 'cflib-python') {
        // the mode snippets are whole Python scripts the console shows as code; a build snippet runs line by line
        for (const s of snippets.filter((x) => x.mode === 'build')) {
          const run = runnableLines(s, content);
          expect(run, s.id).not.toBeNull();
          for (const line of run!) expect(emulator.commands, `${s.id}: ${line}`).toContain(/^(?:print\()?([\w.]+)\(/.exec(line)?.[1]);
        }
        return;
      }
      for (const { id: sid, line } of lines.filter((l) => l.line && !l.line.startsWith('#'))) {
        expect(emulator.commands, `${sid}: ${line}`).toContain(line.split(' ')[0]);
      }
    });
  });

  describe(`${id} courses`, () => {
    const p = content.flight.params;

    it('flies a default mode it has, with the FPV camera of its params', () => {
      expect(content.flight.modes.map((m) => m.id)).toContain(content.flight.defaultMode);
      expect(content.flight.fpv.fovDeg).toBe(p.fov);
      expect(content.flight.fpv.camTiltDeg).toBe(p.camTilt);
    });

    it('keeps the pad, the gates and every goal on the field and under the ceiling, with par times to beat', () => {
      for (const c of content.courses) {
        const inside = (x: number, y: number) => x >= 0 && x <= c.field.w && y >= 0 && y <= c.field.d;
        expect(inside(...c.pad), `${c.id} pad`).toBe(true);
        for (const [x, y] of c.gates) expect(inside(x, y), `${c.id} gate ${x},${y}`).toBe(true);
        for (const g of c.goals) {
          expect(inside(g.x, g.y), `${c.id} ${g.label}`).toBe(true);
          expect(g.z - g.r, `${c.id} ${g.label}`).toBeLessThan(p.ceiling);
        }
        if (c.kind === 'gates') expect(c.gates.length, c.id).toBeGreaterThan(0);
        if (c.kind === 'checkpoints') expect(c.goals.length, c.id).toBeGreaterThan(0);
        if (c.kind !== 'mission') expect(c.parS, c.id).toBeGreaterThan(0);
      }
    });
  });
}

// Betaflight 2026.6.2 permanent mode ids (src/main/msp/msp_box.c) the crafts use: ARM, ANGLE, HORIZON, ALTHOLD,
// BEEPER, FLIP OVER AFTER CRASH, VTX PIT MODE, GPS RESCUE, LAUNCH CONTROL.
const BF_MODES = new Set([0, 1, 2, 3, 13, 35, 39, 46, 49]);
// Names older Betaflight had, or the originals invented; none exists in 2026.6.2.
const BF_GONE = /\b(p_level|i_level|level_limit|angle_level_strength|alt_hold_throttle_deadband|osd_timer_1|osd_stat_max_spd|mini_quad|dshot_idle_value|d_min_roll|gyro_1_sensor_align|crashflip_expo)\b/;

export function checkBetaflightSyntax(content: DroneContent) {
  describe(`${content.id} Betaflight CLI`, () => {
    const lines = snippetLines(content);

    it('writes aux lines with seven numbers, a real mode id and a range on the 25 µs grid', () => {
      for (const { id, line } of lines.filter((l) => l.line.startsWith('aux '))) {
        const n = line.split(' ').slice(1).map(Number);
        expect(n, `${id}: ${line}`).toHaveLength(7);
        expect(BF_MODES.has(n[1]), `${id}: ${line}`).toBe(true);
        expect(n[3] >= 900 && n[4] <= 2100 && n[3] < n[4] && n[3] % 25 === 0 && n[4] % 25 === 0, `${id}: ${line}`).toBe(true);
      }
    });

    it('writes serial lines as port, function bits and the four baud fields', () => {
      for (const { id, line } of lines.filter((l) => l.line.startsWith('serial '))) {
        expect(line, id).toMatch(/^serial UART\d (\d+) 115200 57600 0 115200$/);
      }
    });

    it('never uses removed or invented setting names (a comment may name the old one)', () => {
      for (const { id, line } of lines.filter((l) => !l.line.startsWith('#'))) expect(line, id).not.toMatch(BF_GONE);
      for (const name of Object.keys(content.firmware.emulator.settings)) expect(name).not.toMatch(BF_GONE);
    });

    it('places OSD elements inside the analog canvas, in profile 1', () => {
      for (const { id, line } of lines.filter((l) => /^set osd_\w+_pos = /.test(l.line))) {
        const v = Number(line.split(' = ')[1]);
        expect({ profile1: (v & 2048) !== 0, x: (v & 31) < 30, y: ((v >> 5) & 63) < 16 }, `${id}: ${line}`).toEqual({ profile1: true, x: true, y: true });
      }
    });
  });
}

/** The craft's built figure page in jsdom, driven the way the host drives it (docs/FIGURES-DRONE.md §10). */
export async function openFigure(id: string) {
  const page = await loadFigure(buildFigure(`drones/${id}`), { path: `/figures/drones/${id}.html`, frozenClock: true });
  const SD = page.drone;
  const st = () => SD.api.st;
  const state = () => SD.report() as FigureState;
  /** Steps simulated time until no test, build queue or part animation is running (the figure's clock is frozen). */
  const busy = () =>
    !!st().test ||
    st().queue.length > 0 ||
    Object.values(st().placed as Record<string, { t: number; leave: boolean }>).some((p) => p.leave || p.t < 1);
  const settle = async (maxSimSeconds = 120) => {
    if (!SD.advanceUntil(() => !busy(), maxSimSeconds)) throw new Error(`${id}: still busy after ${maxSimSeconds} simulated seconds`);
  };
  /** Steps simulated time until `ok()` holds; false if it still does not after `maxSimSeconds`. */
  const until = (ok: () => boolean, maxSimSeconds = 120): boolean => SD.advanceUntil(ok, maxSimSeconds);
  const press = async (button: string) => {
    const b = SD.craft().buttons.find((x: { id: string }) => x.id === button);
    if (!b) throw new Error(`${id}: no button ${button}`);
    b.onClick(SD.api);
    SD.kick();
    await settle();
  };
  const run = async (action: 'smoke' | 'motors' | 'calibrate' | 'plugIn' | 'unplug' | 'build' | 'strip') => {
    SD.actions[action](st());
    await settle();
  };
  const add = async (part: string, orient: 0 | 1 = 0) => {
    SD.actions.add(st(), part, orient);
    await settle();
  };
  const remove = async (part: string) => {
    SD.actions.remove(st(), part);
    await settle();
  };
  /** What the host's tests panel shows for a test the learner ran. */
  const status = (test: DroneTest) => testStatus(test, state(), true);
  return { page, SD, st, state, settle, until, press, run, add, remove, status, close: () => page.close() };
}
