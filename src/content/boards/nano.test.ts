// @vitest-environment node
// The Nano's content against its figure (figures/boards/nano.js) and the app's one check path: shared ids must
// match, and every lesson's code must pass its own checks on the scripted run (runHeadless + evaluateChecks).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import nano from './nano';
import en from '@/i18n/content/en/boards/nano.json';
import type { Lesson } from '@/content/schema';
import { defaultParams, renderTemplate, resolveText } from '@/lib/boardlab/template';
import { lessonJob, runChecks } from '@/lib/interp';

const figure = readFileSync(join(process.cwd(), 'figures/boards/nano.js'), 'utf8');
const figureParts = new Set([...figure.matchAll(/\{ id: '([A-Z0-9]+)', kind: '/g)].map((m) => m[1]));
const figureCircuits = new Set([...figure.matchAll(/\n {4}'?([a-z0-9-]+)'?: \{\n {6}title: /g)].map((m) => m[1]));
const figureSources = ['usb', 'vin', 'pin5', 'pin3'];
const headerNets = (name: string) => {
  const m = new RegExp(`const ${name} = \\[([^\\]]+)\\]`).exec(figure);
  return m ? [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]) : [];
};

const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};

/** The lesson code as the editor shows it: default chips, English comments. */
const reference = (lesson: Lesson): string => resolveText(renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params)).code, text);

describe('nano content', () => {
  it('names only parts the figure draws', () => {
    expect(figureParts.size).toBe(26);
    for (const p of nano.figure.parts) expect(figureParts, p.id).toContain(p.id);
    expect(nano.figure.parts.map((p) => p.id).sort()).toEqual([...figureParts].sort());
    for (const l of nano.leds) expect(figureParts).toContain(l.id);
    for (const c of nano.controls) expect(figureParts).toContain(c.id);
  });

  it('has a figure circuit for every lesson, keyed by the lesson id', () => {
    for (const l of nano.lessons) { expect(l.circuit).toBe(l.id); expect(figureCircuits).toContain(l.id); }
  });

  it('matches the figure headers pin for pin', () => {
    const j1 = headerNets('J1'), j2 = headerNets('J2');
    expect(j1).toHaveLength(15);
    expect(j2).toHaveLength(15);
    for (const row of nano.pinout.filter((r) => r.header === 'J1')) expect(row.net).toBe(j1[Number(row.pin) - 1]);
    for (const row of nano.pinout.filter((r) => r.header === 'J2')) expect(row.net).toBe(j2[Number(row.pin) - 1]);
    expect(nano.pinout.filter((r) => r.header === 'J1' || r.header === 'J2')).toHaveLength(30);
  });

  it('only triggers faults the figure can show', () => {
    for (const f of nano.failures) {
      expect(f.figure.type).toBe('set');
      const state = f.figure.type === 'set' ? f.figure.state : {};
      const fault = String(state.fault);
      const [kind, a] = fault.split(':');
      expect(['reversed', 'missing', 'cold', 'reverse-polarity', 'wrong-voltage', 'short', 'brownout'], f.id).toContain(kind);
      if (kind === 'reversed' || kind === 'missing') expect(figureParts, f.id).toContain(a);
      if (kind === 'cold') expect(figureParts, f.id).toContain(a.split('.')[0]);
      if (kind === 'reverse-polarity' || kind === 'wrong-voltage') expect(figureSources, f.id).toContain(a);
      if (state.power != null) expect(figureSources).toContain(state.power);
      if (state.circuit != null) expect(figureCircuits).toContain(state.circuit);
    }
    const kinds = new Set(nano.failures.map((f) => f.kind));
    for (const k of ['reverse-polarity', 'brownout', 'wrong-voltage', 'cold-solder', 'missing-part'] as const) expect(kinds).toContain(k);
  });

  it('removes a single SMD part in one failure', () => {
    expect(nano.failures.some((f) => f.trigger.by === 'remove-part' && f.trigger.part === 'C4')).toBe(true);
  });

  for (const lesson of nano.lessons) {
    it(`lesson ${lesson.n} (${lesson.id}): the code passes its checks through the app check path`, () => {
      const { trace, results } = runChecks(lessonJob(nano, lesson, reference(lesson)));
      expect(trace.error).toBeNull();
      const failed = lesson.checks.filter((_, i) => !results[i].ok).map((c) => text(c.label));
      expect(failed, trace.serial.slice(0, 8).map((l) => l.text).join('\n')).toEqual([]);
      for (const sample of lesson.serial.sample) expect(trace.serial.map((l) => l.text), `${lesson.id} sample`).toContain(sample);
    });
  }
});
