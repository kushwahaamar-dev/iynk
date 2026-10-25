// The micro:bit content against its figure file and the app's one check path: ids that must match, and every
// lesson's code run on its scripted world through runHeadless + evaluateChecks.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import type { Lesson } from '@/content/schema';
import { defaultParams, renderTemplate, resolveText } from '@/lib/boardlab/template';
import { lessonJob, runChecks } from '@/lib/interp';
import en from '@/i18n/content/en/boards/microbit-v2.json';
import microbit from './microbit-v2';

type Part = { id: string; pins?: string[]; control?: { action: string; net?: string }; led?: { rail?: string; net?: string } };
type FigureDef = {
  name: string; parts: Part[]; circuits: Record<string, unknown>; modes: Record<string, unknown>;
  power: { sources: Record<string, unknown>; rails: Record<string, unknown> };
};

// The figure file registers itself with SL.bench.board(def); run it in a sandbox that only records the def.
function figureDef(): FigureDef {
  let def: FigureDef | null = null;
  const bench = { kinds: {}, M: {}, kind() {}, board(d: FigureDef) { def = d; } };
  vm.runInNewContext(readFileSync(join(process.cwd(), 'figures/boards/microbit-v2.js'), 'utf8'), { SL: { bench } });
  if (!def) throw new Error('figures/boards/microbit-v2.js did not register a board');
  return def;
}

const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};
const reference = (l: Lesson): string => resolveText(renderTemplate(l.code.source, l.params, defaultParams(l.params)).code, text);

describe('micro:bit content vs figure', () => {
  const def = figureDef();
  const byId = new Map(def.parts.map((p) => [p.id, p]));

  it('names every figure part, and nothing the figure does not draw', () => {
    const named = new Set(microbit.figure.parts.map((p) => p.id));
    expect(def.parts.map((p) => p.id).filter((id) => !named.has(id))).toEqual([]);
    expect([...named].filter((id) => !byId.has(id))).toEqual([]);
    expect(def.name).toBe('BBC micro:bit V2');
  });

  it('keeps ring and edge-strip nets in step with the pinout', () => {
    const rings = ['RING0', 'RING1', 'RING2', 'RING3V', 'RINGGND'].flatMap((id) => byId.get(id)?.pins ?? []);
    expect(rings).toEqual(microbit.pinout.filter((r) => r.header === 'ring').map((r) => r.net));
    expect(byId.get('EDGE')?.pins).toEqual(microbit.pinout.filter((r) => r.header === 'edge').map((r) => r.net));
    expect(microbit.pinout.filter((r) => r.header === 'edge')).toHaveLength(20);
  });

  it('wires buttons A and B to P5 and P11, and the controls to figure parts', () => {
    expect(byId.get('SW2')?.control).toMatchObject({ action: 'input', net: 'P5' });
    expect(byId.get('SW3')?.control).toMatchObject({ action: 'input', net: 'P11' });
    expect(byId.get('SW1')?.control?.action).toBe('reset');
    for (const c of microbit.controls) expect(byId.get(c.id)?.control, c.id).toBeDefined();
    for (const l of microbit.leds) expect(byId.get(l.id)?.led, l.id).toBeDefined();
    expect(byId.get('D70')?.led?.net).toBe('RUN_MIC');
  });

  it('has a figure circuit for every lesson that names one', () => {
    for (const l of microbit.lessons) if (l.circuit) expect(Object.keys(def.circuits)).toContain(l.circuit);
  });

  it('only sends fault ids, sources, modes and parts the figure knows', () => {
    const sources = Object.keys(def.power.sources), modes = Object.keys(def.modes);
    for (const f of microbit.failures) {
      if (f.figure.type !== 'set') continue;
      const s = f.figure.state as { fault?: string; power?: string | null; mode?: string; circuit?: string };
      if (s.power) expect(sources).toContain(s.power);
      if (s.mode) expect(modes).toContain(s.mode);
      if (s.circuit) expect(Object.keys(def.circuits)).toContain(s.circuit);
      if (!s.fault || s.fault === 'brownout') continue;
      const [kind, a, b] = s.fault.split(':');
      if (kind === 'missing' || kind === 'reversed') expect(byId.has(a)).toBe(true);
      if (kind === 'cold') expect(byId.has(a.split('.')[0])).toBe(true);
      if (kind === 'reverse-polarity' || kind === 'wrong-voltage') expect(sources).toContain(a);
      if (kind === 'short') expect([a, b].every((n) => n in def.power.rails || n === 'GND')).toBe(true);
    }
    for (const step of microbit.assembly) {
      if (step.action?.type === 'press' && step.action.id === 'upload') expect(modes).toContain(step.action.choice);
    }
    for (const i of microbit.power.inputs) expect(byId.has(i.part)).toBe(true);
  });

  it('has at least five failures and a quiz with three questions on every lesson', () => {
    expect(microbit.failures.length).toBeGreaterThanOrEqual(5);
    for (const l of microbit.lessons) {
      expect(l.quiz?.questions, l.id).toHaveLength(3);
      for (const q of l.quiz!.questions) expect(q.answer).toBeLessThan(q.options.length);
    }
  });
});

describe('micro:bit lessons pass their checks', () => {
  it('has at least four progressive MicroPython lessons', () => {
    expect(microbit.lessons.length).toBeGreaterThanOrEqual(4);
    expect(new Set(microbit.lessons.map((l) => l.language))).toEqual(new Set(['micropython']));
    for (const level of ['io', 'input', 'analog', 'protocol']) expect(microbit.lessons.some((l) => l.level === level)).toBe(true);
  });

  for (const l of microbit.lessons) {
    it(`${l.id}: the code passes its checks through the app check path, and an empty program does not`, () => {
      const { trace, results } = runChecks(lessonJob(microbit, l, reference(l)));
      expect(trace.error).toBeNull();
      const failed = l.checks.filter((_, i) => !results[i].ok).map((c) => c.label);
      expect(failed, `serial: ${trace.serial.slice(0, 6).map((s) => s.text).join(' | ')}`).toEqual([]);
      expect(runChecks(lessonJob(microbit, l, 'pass\n')).results.every((r) => r.ok)).toBe(false);
    });
  }
});
