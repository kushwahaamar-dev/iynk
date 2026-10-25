import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROBOTICS } from '@/content/ids';
import type { CodeTemplate, WorldModel } from '@/content/schema';
import { benchTextKeys, resolveBenchTexts } from '@/lib/robotics/text';
import { engineFaultId } from '@/lib/robotics/steps';
import { risingEdges, runChecks, runHeadless, sampleAt, taskJob } from '@/lib/interp';
import en from '@/i18n/content/en/robotics/a4988.json';
import bench from './a4988';

const root = join(__dirname, '..', '..', '..');
const benchFig = readFileSync(join(root, 'figures', 'robotics', 'a4988.js'), 'utf8');
const moduleFig = readFileSync(join(root, 'figures', 'modules', 'a4988.js'), 'utf8');

const leaf = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
const render = (code: CodeTemplate | string) => (typeof code === 'string' ? code : code.source).replace(/\{\{t:([^}]+)\}\}/g, (_, k: string) => String(leaf(k)));
const NO_WORLD: WorldModel = { inputs: [], script: [] };

describe('a4988 content', () => {
  it('matches its ids.ts entry', () => {
    const meta = ROBOTICS.a4988;
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

  it('names only parts the module or the mat draws', () => {
    for (const p of bench.figure.parts) {
      // the 0603 groups come from the module's scatter helper
      if (p.id === 'CAPS' || p.id === 'RES') expect(moduleFig).toContain(`{ id: '${p.id}', name:`);
      else if (['NANO', 'MOT', 'BATT', 'MM'].includes(p.id)) expect(benchFig).toMatch(new RegExp(`id: '${p.id}', (board|part):`));
      else expect(moduleFig).toContain(`id: '${p.id}', kind`);
    }
  });

  it('builds in factory order, sets out the mat, sets the limit, then breaks once per fault', () => {
    const ids = bench.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 11)).toEqual(['strip', 'smd', 'headers', 'solder', 'link-cap', 'wire-nano', 'wire-motor', 'wire-battery', 'wire-meter', 'plug', 'vref']);
    expect(ids.at(-1)).toBe('exploded');
    const breaks = bench.steps.filter((s) => s.kind === 'break').map((s) => s.fault);
    expect([...breaks].sort()).toEqual(bench.faults.map((f) => f.id).sort());
    for (const s of bench.steps) if (s.kind !== 'break') expect(s.refusal).toBeTruthy();
    // nothing turns until the meter reads the limit the prose asks for
    expect(bench.steps.find((s) => s.id === 'vref')!.done).toMatchObject({ mode: 'vref', 'meas.U1.set': true });
    expect(benchFig).toContain('VREF_SET');
    expect(moduleFig).toContain('const VREF_SET = .544;');
  });

  it("sends each break step its fault's command, plugged in, and the figure offers every fault", () => {
    for (const s of bench.steps.filter((x) => x.kind === 'break')) {
      const f = bench.faults.find((x) => x.id === s.fault)!;
      expect(s.action?.type).toBe('set');
      if (s.action?.type === 'set' && f.figure.type === 'set') expect(s.action.state).toMatchObject(f.figure.state);
      expect(s.done).toMatchObject({ power: 'bench', status: 'running' });
      const id = engineFaultId(f);
      // the engine offers reverse polarity on a supply with a pin and reversed:<part> for a polar part; the rest are listed
      if (id.startsWith('reversed:')) expect(moduleFig).toMatch(new RegExp(`id: '${id.slice(9)}'[^}]*polar:`));
      else if (id.startsWith('reverse-polarity:')) expect(moduleFig).toMatch(new RegExp(`${id.slice(17)}: \\{[^}]*pin: '`));
      else expect(benchFig.includes(`['${id}', '`) || moduleFig.includes(`'${id}'`)).toBe(true);
    }
  });

  it("covers the brief's failures", () => {
    const kinds = new Set(bench.faults.map((f) => f.kind));
    for (const k of ['reverse-polarity', 'brownout', 'reversed-part', 'missing-part', 'thermal'] as const) expect(kinds).toContain(k);
  });

  it('puts a quiz after every major step and one at the end', () => {
    const major = bench.steps.filter((s) => s.major).map((s) => s.id);
    const after = bench.quizzes.map((q) => q.afterStep);
    expect(after.filter((a) => a !== null).sort()).toEqual([...major].sort());
    expect(after).toContain(null);
    for (const q of bench.quizzes) for (const qq of q.questions) expect(qq.answer).toBeLessThan(qq.options.length);
  });

  it('has the sketches the figure runs: same ids, sizes and serial line', () => {
    for (const m of bench.modes) {
      expect(benchFig).toMatch(new RegExp(`${m.id}: \\{ title: [^\\n]*bytes: ${m.bytes},`));
      expect(benchFig).toContain(`'${m.serial[0]}'`);
    }
    expect(benchFig).toContain(`mode: '${bench.defaultMode}'`);
  });

  it('keeps the Nano inside its USB budget and the worst coil draw inside what the pack can give', () => {
    const sup = new Map(bench.current.supplies.map((s) => [s.id, s]));
    for (const l of bench.current.loads) expect(sup.has(l.supply)).toBe(true);
    const usb = bench.current.loads.filter((l) => l.supply === 'usb').reduce((a, l) => a + l.ma, 0);
    expect(usb).toBeLessThan(sup.get('usb')!.limitMa);
    const high = ['quiescent', 'coils-high'].map((id) => bench.current.loads.find((l) => l.id === id)!.ma).reduce((a, b) => a + b, 0);
    expect(high).toBeLessThan(sup.get('lipo')!.limitMa);
    // I_MAX² x (1.65 Ω coil + 0.64 Ω switches) / 8.4 V at 1.0 A and at 1.68 A
    expect(bench.current.loads.find((l) => l.id === 'coils')!.ma).toBeCloseTo(1000 * 2.29 / 8.4, -1);
    expect(bench.current.loads.find((l) => l.id === 'coils-high')!.ma).toBeCloseTo(1000 * 1.68 ** 2 * 2.29 / 8.4, -1);
  });
});

describe('a4988 code through the app check path', () => {
  // ms levels, the pulses in the first second, and the half period the STEP pin keeps
  const want: Record<string, { ms: [number, number, number]; pulses: number; periodMs: number }> = {
    vref: { ms: [0, 0, 0], pulses: 0, periodMs: 0 },
    full: { ms: [0, 0, 0], pulses: 200, periodMs: 5 },
    half: { ms: [1, 0, 0], pulses: 200, periodMs: 5 },
    micro: { ms: [1, 1, 1], pulses: 800, periodMs: 1.25 },
  };
  for (const m of bench.modes) {
    it(`runs the ${m.id} sketch: the pins the figure drives and its serial line`, () => {
      const trace = runHeadless({ board: 'nano', language: 'arduino-cpp', source: render(m.code), world: NO_WORLD, runMs: 4500 });
      expect(trace.error).toBeNull();
      const w = want[m.id];
      const at = (pin: string, t: number) => sampleAt(trace.pins[pin], t)?.v;
      expect([at('D5', 500), at('D6', 500), at('D7', 500)]).toEqual(w.ms);
      expect(at('D4', 500)).toBe(1);
      const rises = risingEdges(trace.pins.D3);
      // digitalWrite itself takes a few µs, so a fast sketch falls a pulse or two behind the ideal count
      const n = rises.filter((t) => t < 1000).length;
      expect(n).toBeGreaterThanOrEqual(Math.floor(w.pulses * 0.99));
      expect(n).toBeLessThanOrEqual(w.pulses + 1);
      if (w.periodMs) expect(rises[11] - rises[10]).toBeCloseTo(w.periodMs, 1);
      expect(trace.serial[0]?.text).toBe(m.serial[0]);
      expect(new Set(trace.serial.map((l) => l.text))).toEqual(new Set(m.serial));
    });
  }

  it('prints when the figure prints: full at 1 s, half at 2 s, 1/16 at 4 s', () => {
    const first = (id: string) => {
      const m = bench.modes.find((x) => x.id === id)!;
      return runHeadless({ board: 'nano', language: 'arduino-cpp', source: render(m.code), world: NO_WORLD, runMs: 4500 }).serial[0].t;
    };
    expect(Math.round(first('full') / 1000)).toBe(1);
    expect(Math.round(first('half') / 1000)).toBe(2);
    expect(Math.round(first('micro') / 1000)).toBe(4);
  });

  for (const task of bench.tasks) {
    it(`${task.id}: the reference solution passes every check`, () => {
      const { trace, results } = runChecks(taskJob(task, task.solution));
      expect(trace.error).toBeNull();
      expect(task.checks.filter((_, i) => !results[i].ok).map((c) => String(leaf(c.label)))).toEqual([]);
    });

    it(`${task.id}: the starter runs and does not already pass`, () => {
      const { trace, results } = runChecks(taskJob(task, render(task.starter)));
      expect(trace.error).toBeNull();
      expect(results.some((r) => !r.ok)).toBe(true);
    });
  }
});
