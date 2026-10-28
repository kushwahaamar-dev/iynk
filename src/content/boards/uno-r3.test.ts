// @vitest-environment node
// The Uno R3's content against its figure (figures/boards/uno-r3.js) and the app's one check path: shared ids must
// match, the assembly must place exactly the through-hole parts, and every lesson's code must pass its own checks
// on the scripted run (runHeadless + evaluateChecks) while an empty sketch must not.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import uno from './uno-r3';
import en from '@/i18n/content/en/boards/uno-r3.json';
import type { Lesson } from '@/content/schema';
import { defaultParams, renderTemplate, resolveText } from '@/lib/boardlab/template';
import { lessonJob, runChecks } from '@/lib/interp';
import { buildFigure, loadFigure } from '../../../figures/engine/testkit.mjs';

const figure = readFileSync(join(process.cwd(), 'figures/boards/uno-r3.js'), 'utf8');
const figureKinds = new Map([...figure.matchAll(/\{ id: '([A-Z0-9-]+)', kind: '([a-z0-9-]+)'/g)].map((m) => [m[1], m[2]]));
const figureCircuits = new Set([...figure.matchAll(/\n {4}'?([a-z0-9-]+)'?: \{\n {6}title: /g)].map((m) => m[1]));
const figureSources = ['usb', 'jack', 'vin', 'pin5'];
const circuitParts = (circuit: unknown): string[] => {
  const m = typeof circuit === 'string' ? new RegExp(`\n {4}'?${circuit}'?: \\{\n {6}title: [^]*?\n {4}\\},`).exec(figure) : null;
  return m ? [...m[0].matchAll(/\{ id: '([A-Z0-9]+)', part: /g)].map((x) => x[1]) : [];
};
const THROUGH_HOLE = new Set(['socket', 'xtal', 'male', 'tact', 'female', 'usb-b', 'barrel']);

// The figure lists each header's pins left to right as drawn; IOH and IOL are numbered from the other end.
const headerPins = (id: string): string[] => {
  const m = new RegExp(`id: '${id}', kind: '[a-z-]+'[^]*?pins: (DIG|\\[[^\\]]*\\])`).exec(figure);
  if (!m) return [];
  const list = m[1] === 'DIG' ? /const DIG = (\[[^\]]*\])/.exec(figure)![1] : m[1];
  return [...list.matchAll(/'([^']*)'/g)].map((x) => x[1] || 'NC');
};

const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};

/** The lesson code as the editor shows it: default chips, English comments. */
const reference = (lesson: Lesson): string => resolveText(renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params)).code, text);
const EMPTY = 'void setup() {\n}\n\nvoid loop() {\n}\n';

describe('uno-r3 content', () => {
  it('names only parts the figure draws', () => {
    expect(figureKinds.size).toBe(51);
    for (const p of uno.figure.parts) expect([...figureKinds.keys()], p.id).toContain(p.id);
    for (const l of uno.leds) expect([...figureKinds.keys()]).toContain(l.id);
    for (const c of uno.controls) expect([...figureKinds.keys()]).toContain(c.id);
  });

  it('has a figure circuit for every wired lesson, keyed by the lesson id', () => {
    expect(uno.lessons).toHaveLength(16);
    for (const l of uno.lessons.filter((x) => x.circuit != null)) { expect(l.circuit).toBe(l.id); expect(figureCircuits).toContain(l.id); }
    expect(uno.lessons.filter((x) => x.circuit == null).map((x) => x.id)).toEqual(['board']);
  });

  it('matches the figure headers pin for pin', () => {
    for (const [id, reversed] of [['IOH', true], ['IOL', true], ['POWER', false], ['AD', false], ['ICSP', false], ['ICSP1', false]] as const) {
      const drawn = headerPins(id);
      const rows = uno.pinout.filter((r) => r.header === id).sort((a, b) => Number(a.pin) - Number(b.pin));
      expect(drawn.length, id).toBeGreaterThan(0);
      expect(reversed ? [...drawn].reverse() : drawn, id).toEqual(rows.map((r) => r.net));
    }
  });

  it('only triggers faults the figure can show', () => {
    for (const f of uno.failures) {
      if (f.figure.type !== 'set') continue;
      const state = f.figure.state;
      if (state.fault != null) {
        const [kind, a] = String(state.fault).split(':');
        expect(['reversed', 'missing', 'cold', 'reverse-polarity', 'wrong-voltage', 'short', 'brownout'], f.id).toContain(kind);
        // a part of the board, or a breadboard part of the circuit the failure wires
        if (kind === 'reversed' || kind === 'missing') expect([...figureKinds.keys(), ...circuitParts(state.circuit)], f.id).toContain(a);
        if (kind === 'cold') expect([...figureKinds.keys()], f.id).toContain(a.split('.')[0]);
        if (kind === 'reverse-polarity' || kind === 'wrong-voltage') expect(figureSources, f.id).toContain(a);
      }
      if (state.power != null) expect(figureSources, f.id).toContain(state.power);
      if (state.circuit != null) expect(figureCircuits, f.id).toContain(state.circuit);
    }
  });

  it('turns the Blink LED round: the sketch still drives D13, the LED stays dark until it is turned back', async () => {
    const f = uno.failures.find((x) => x.id === 'led-backwards');
    if (f?.figure.type !== 'set') throw new Error('no set failure led-backwards');
    const page = await loadFigure(buildFigure('boards/uno-r3'), { path: '/figures/boards/uno-r3.html' });
    const B = page.bench;
    const led = () => (B.report() as { meas?: Record<string, { state?: string }> }).meas?.LED1?.state;
    const lit = (state: Record<string, unknown> = {}) => {
      B.accept(state);
      B.accept({ pins: { D13: 1 } });
      B.advance(0.5);
      return led();
    };
    B.accept({ power: 'usb', circuit: 'blink' });
    expect(lit()).toBe('ok');
    expect(lit(f.figure.state)).toBe('reverse');
    expect(lit({ fault: null })).toBe('ok');
    page.close();
  });

  it('unplugs before stripping, then places every through-hole part once', () => {
    const steps = uno.assembly ?? [];
    const ids = steps.map((s) => s.id);
    expect(ids.indexOf('unplug')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('unplug')).toBeLessThan(ids.indexOf('strip'));
    const placed = steps.flatMap((s) => (s.action?.type === 'press' && s.action.id === 'place' && s.action.choice !== 'zu4' ? [s.action.choice] : []));
    const tht = [...figureKinds].filter(([, kind]) => THROUGH_HOLE.has(kind)).map(([id]) => id.toLowerCase());
    expect(placed.sort()).toEqual(tht.filter((id) => id !== 'reset').sort());
  });

  it('names only its own lesson keys in each lesson (a lesson page ships only the prose of that lesson)', () => {
    for (const lesson of uno.lessons) {
      const owners = new Set([...JSON.stringify(lesson).matchAll(/lessons\.([a-z0-9-]+)\./g)].map((m) => m[1]));
      expect([...owners], lesson.id).toEqual([lesson.id]);
    }
  });

  for (const lesson of uno.lessons) {
    it(`lesson ${lesson.n} (${lesson.id}): the code passes its checks and an empty sketch does not`, () => {
      const { trace, results } = runChecks(lessonJob(uno, lesson, reference(lesson)));
      expect(trace.error).toBeNull();
      const failed = lesson.checks.filter((_, i) => !results[i].ok).map((c) => text(c.label));
      expect(failed, trace.serial.slice(0, 8).map((l) => l.text).join('\n')).toEqual([]);
      for (const sample of lesson.serial.sample) expect(trace.serial.map((l) => l.text), `${lesson.id} sample`).toContain(sample);
      expect(runChecks(lessonJob(uno, lesson, EMPTY)).results.every((r) => r.ok)).toBe(false);
    });
  }
});
