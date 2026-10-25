import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROBOTICS } from '@/content/ids';
import type { CodeTemplate } from '@/content/schema';
import { benchTextKeys, resolveBenchTexts } from '@/lib/robotics/text';
import { currentDraw } from '@/lib/robotics/current';
import { runChecks, taskJob } from '@/lib/interp';
import en from '@/i18n/content/en/robotics/led-resistor.json';
import bench from './led-resistor';

const root = join(__dirname, '..', '..', '..');
const fig = readFileSync(join(root, 'figures', 'robotics', 'led-resistor.js'), 'utf8');

const leaf = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
const render = (code: CodeTemplate | string) => (typeof code === 'string' ? code : code.source).replace(/\{\{t:([^}]+)\}\}/g, (_, k: string) => String(leaf(k)));

// I = (V - V_F) / R, the figure's model and the facts sheet's numbers (docs/facts/trainers.md §3.1)
const amps = (ohms: number) => (5 - 2) / ohms;

describe('led-resistor content', () => {
  it('matches its ids.ts entry', () => {
    const meta = ROBOTICS['led-resistor'];
    expect(bench.fig).toBe(meta.fig);
    expect(bench.board).toBe(meta.board);
    expect(bench.modules).toEqual(meta.modules);
    expect(bench.parts).toEqual(meta.parts);
  });

  it('finds every text the page shows in the English JSON', () => {
    const { missing, texts } = resolveBenchTexts(bench, en);
    expect(missing).toEqual([]);
    expect(benchTextKeys(bench).filter((k) => !texts[k].trim())).toEqual([]);
  });

  it('names only parts the figure draws', () => {
    for (const p of bench.figure.parts) expect(fig).toContain(`{ id: '${p.id}', kind`);
  });

  it('has one mode per jumper row the figure offers, with its bench notes', () => {
    for (const m of bench.modes) {
      expect(fig).toMatch(new RegExp(`\\b${m.id}: \\{ pair: \\d, part: '\\w+', ohms: `));
      expect(fig).toMatch(new RegExp(`\\b${m.id}: \\{ title: '[^']+', instant: true`));
      for (const line of m.serial) expect(line.startsWith('I = ') ? fig.includes('I = {v} V / {r} = {ma} mA') : fig.includes(line)).toBe(true);
    }
    expect(fig).toContain(`mode: '${bench.defaultMode}'`);
  });

  it("prints the meter's numbers from Ohm's law", () => {
    expect(amps(220) * 1000).toBeCloseTo(13.6, 1);
    expect(amps(1000) * 1000).toBeCloseTo(3.0, 1);
    expect(amps(10000) * 1000).toBeCloseTo(0.3, 2);
    const shown = Object.fromEntries(bench.steps.filter((s) => s.done['meas.MM1.text']).map((s) => [s.done.mode, s.done['meas.MM1.text']]));
    expect(shown).toEqual({ r220: '13.6', r1k: '3.0', r10k: '0.30' });
    for (const [id, ohms] of [['r220', 220], ['r1k', 1000], ['r10k', 10000]] as const) {
      const notes = bench.modes.find((m) => m.id === id)!.serial.at(-1)!;
      expect(notes).toContain(`${(amps(ohms) * 1000).toFixed(ohms === 10000 ? 2 : 1)} mA`);
    }
  });

  it('builds low to tall, reads every row, breaks once per fault and ends lit on USB', () => {
    const ids = bench.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 10)).toEqual(['unplug', 'strip', 'low', 'tall', 'solder', 'jumper-meter', 'plug', 'row-1k', 'row-10k', 'row-220']);
    expect(ids.at(-1)).toBe('usb-again');
    const breaks = bench.steps.filter((s) => s.kind === 'break').map((s) => s.fault);
    expect([...breaks].sort()).toEqual(bench.faults.map((f) => f.id).sort());
  });

  it('sends each break step the same command as its fault, and asks for the same supply back', () => {
    for (const s of bench.steps.filter((x) => x.kind === 'break')) {
      const f = bench.faults.find((x) => x.id === s.fault)!;
      expect(f.figure.type).toBe('set');
      if (s.action?.type !== 'set' || f.figure.type !== 'set') throw new Error(`${s.id}: not a set command`);
      expect(s.action.state).toEqual(f.figure.state);
      expect(s.done).toEqual({ power: f.figure.state.power, status: 'running' });
    }
  });

  it("covers the brief's failures, with at least three", () => {
    const kinds = new Set(bench.faults.map((f) => f.kind));
    for (const k of ['reverse-polarity', 'brownout', 'wrong-voltage', 'cold-solder', 'reversed-part', 'missing-part', 'overcurrent'] as const) expect(kinds).toContain(k);
    expect(bench.faults.length).toBeGreaterThanOrEqual(3);
  });

  it('puts a quiz after every major step and one at the end', () => {
    const major = bench.steps.filter((s) => s.major).map((s) => s.id);
    const after = bench.quizzes.map((q) => q.afterStep);
    expect(after.filter((a) => a !== null).sort()).toEqual([...major].sort());
    expect(after).toContain(null);
    for (const q of bench.quizzes) for (const qq of q.questions) expect(qq.answer).toBeLessThan(qq.options.length);
  });

  it('reads the current draw from the meter in series', () => {
    const at220 = { power: 'usb', status: 'running', meas: { MM1: { i_mA: 13.64, text: '13.6' } } };
    const draw = currentDraw(bench.current, at220);
    expect(draw.totalMa).toBe(13.6);
    expect(draw.over).toBe(false);
    expect(currentDraw(bench.current, { power: null, meas: {} }).totalMa).toBe(0);
  });
});

describe('led-resistor tasks through the app check path', () => {
  for (const task of bench.tasks) {
    it(`${task.id}: the reference solution passes every check`, () => {
      const { trace, results } = runChecks(taskJob(task, render(task.solution)));
      expect(trace.error).toBeNull();
      expect(task.checks.filter((_, i) => !results[i].ok).map((c) => String(leaf(c.label)))).toEqual([]);
    });

    it(`${task.id}: the starter runs and does not already pass`, () => {
      const { trace, results } = runChecks(taskJob(task, render(task.starter)));
      expect(trace.error).toBeNull();
      expect(results.some((r) => !r.ok)).toBe(true);
    });
  }

  it("ohms-law: the starter's whole-number maths prints 0 mA", () => {
    const task = bench.tasks.find((t) => t.id === 'ohms-law')!;
    const { trace } = runChecks(taskJob(task, render(task.starter)));
    expect(trace.serial.map((l) => l.text)).toEqual(['220 ohm: 0 mA', '1000 ohm: 0 mA', '10000 ohm: 0 mA']);
  });
});
