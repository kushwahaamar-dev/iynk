// NodeMCU content: cross-checks against the figure file (one source per fact, shared ids must match) and runs
// every lesson's code through the app's one check path (runHeadless + evaluateChecks) on its world script.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Lesson } from '@/content/schema';
import { defaultParams, renderTemplate, resolveText } from '@/lib/boardlab/template';
import { getProfile, lessonJob, runChecks } from '@/lib/interp';
import board from './nodemcu';

const root = join(__dirname, '..', '..', '..');
const en = JSON.parse(readFileSync(join(root, 'src/i18n/content/en/boards/nodemcu.json'), 'utf8'));
const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};

// The figure file registers one board through SL.bench.board(def); capture the def without the engine.
type FigPart = { id: string; kind: string; pins?: string[]; led?: { net?: string; invert?: boolean }; control?: { action: string; net?: string } };
type FigDef = {
  parts: FigPart[];
  circuits: Record<string, { parts: { id: string }[]; wires: { from: string; to: string }[] }>;
  power: { sources: Record<string, unknown>; mcu: { min: number; part: string } };
  modes: Record<string, unknown>;
  faults: string[];
};
const fig: FigDef = (() => {
  let def: FigDef | null = null;
  const src = readFileSync(join(root, 'figures/boards/nodemcu.js'), 'utf8');
  new Function('SL', src)({ bench: { board: (d: FigDef) => { def = d; } } });
  if (!def) throw new Error('figure did not register a board');
  return def;
})();
const figPart = (id: string) => fig.parts.find((p) => p.id === id);

const reference = (lesson: Lesson): string => resolveText(renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params)).code, text);
const profile = getProfile('nodemcu');

describe('nodemcu content matches the figure', () => {
  it('pinout rows are the two 15-pin headers, nets as the figure wires them', () => {
    expect(board.pinout).toHaveLength(30);
    for (const h of ['J1', 'J2'] as const) {
      const rows = board.pinout.filter((r) => r.header === h);
      const nets = figPart(h)!.pins!.map((n, i) => n || `${h}.${i + 1}`);
      expect(rows.map((r) => r.pin)).toEqual(nets.map((_, i) => String(i + 1)));
      expect(rows.map((r) => r.net)).toEqual(nets);
    }
  });

  it('the D-pin to GPIO map agrees with the interpreter profile', () => {
    for (const r of board.pinout.filter((x) => /^D\d$/.test(x.label))) {
      const gpio = r.functions.find((f) => /^GPIO\d+$/.test(f));
      expect(Number(gpio!.slice(4)), r.label).toBe(profile.aliases[r.label]);
    }
    expect(profile.aliases.LED_BUILTIN).toBe(2);
  });

  it('every figure part has host text and nothing else is listed', () => {
    expect(board.figure.parts.map((p) => p.id).sort()).toEqual(fig.parts.map((p) => p.id).sort());
  });

  it('LEDs and controls match the figure', () => {
    for (const led of board.leds) {
      const p = figPart(led.id)!;
      expect(p.led?.net).toBe(led.drivenBy);
      expect(!!p.led?.invert).toBe(led.activeLow);
    }
    for (const c of board.controls) expect(figPart(c.id)?.control?.action).toBe(c.kind);
  });

  it('power inputs and the brown-out voltage match the figure', () => {
    expect(board.power.inputs.map((i) => i.id).sort()).toEqual(Object.keys(fig.power.sources).sort());
    expect(board.power.brownoutVolts).toBe(fig.power.mcu.min);
  });

  it('every failure names a fault the figure engine understands', () => {
    const kinds = new Set(['reversed', 'missing', 'cold', 'reverse-polarity', 'wrong-voltage', 'brownout', 'short']);
    for (const f of board.failures) {
      expect(f.figure.type, f.id).toBe('set');
      const st = f.figure.type === 'set' ? f.figure.state : {};
      if (typeof st.power === 'string') expect(Object.keys(fig.power.sources)).toContain(st.power);
      if (typeof st.fault === 'string') {
        const [kind, a] = st.fault.split(':');
        expect(kinds.has(kind), f.id).toBe(true);
        if (kind === 'reversed' || kind === 'missing') expect(figPart(a), f.id).toBeTruthy();
        if (kind === 'cold') expect(figPart(a) || figPart(a.split('.')[0]), f.id).toBeTruthy();
        if (kind === 'reverse-polarity' || kind === 'wrong-voltage') expect(Object.keys(fig.power.sources)).toContain(a);
      }
      if (st.press) expect(figPart((st.press as { id: string }).id)?.control, f.id).toBeTruthy();
    }
    const brief = ['reverse-polarity', 'brownout', 'wrong-voltage', 'cold-solder', 'missing-part', 'boot-strap'];
    for (const k of brief) expect(board.failures.some((f) => f.kind === k), k).toBe(true);
  });

  it('lesson circuits exist and their callouts point at real parts', () => {
    expect(board.lessons.map((l) => l.level)).toEqual(['io', 'input', 'analog', 'wireless']);
    for (const l of board.lessons) {
      const c = fig.circuits[l.circuit!];
      expect(c, l.id).toBeTruthy();
      for (const co of l.callouts) expect(!!figPart(co.part) || c.parts.some((p) => p.id === co.part), `${l.id} ${co.part}`).toBe(true);
      for (const p of l.params) {
        const part = 'figure' in p ? p.figure?.part : undefined;
        if (part) expect(c.parts.some((q) => q.id === part), `${l.id} ${p.id}`).toBe(true);
      }
      const labels = new Set(board.pinout.map((r) => r.label));
      for (const p of l.pins) expect(labels.has(p.pin), `${l.id} ${p.pin}`).toBe(true);
    }
  });

  it('gives every lesson a three-question quiz whose answers are among its options', () => {
    for (const l of board.lessons) {
      expect(l.quiz?.questions, l.id).toHaveLength(3);
      for (const q of l.quiz!.questions) {
        expect(q.answer, `${l.id} ${q.id}`).toBeLessThan(q.options.length);
        for (const key of [q.q, q.why, ...q.options]) expect(text(key).length, key).toBeGreaterThan(0);
      }
    }
  });
});

describe('nodemcu lessons pass their checks through the app check path', () => {
  for (const lesson of board.lessons) {
    it(`${lesson.n}. ${lesson.id}`, () => {
      const source = reference(lesson);
      const { trace, results } = runChecks(lessonJob(board, lesson, source));
      expect(trace.error).toBeNull();
      expect(lesson.checks.filter((_, i) => !results[i].ok).map((c) => text(c.label))).toEqual([]);
      if (lesson.serial.sample.length) expect(trace.serial.length).toBeGreaterThan(0);
    });
  }

  it('the 5 GHz network never connects (2.4 GHz radio only)', () => {
    const lesson = board.lessons.find((l) => l.id === 'webserver')!;
    const source = reference(lesson).replace('"simlab-guest"', '"simlab-5G"');
    const { trace } = runChecks(lessonJob(board, lesson, source));
    expect(trace.serial.some((l) => l.text.startsWith('IP address'))).toBe(false);
  });
});
