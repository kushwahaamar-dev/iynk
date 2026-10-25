import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROBOTICS } from '@/content/ids';
import type { CodeTemplate, WorldModel } from '@/content/schema';
import { benchTextKeys, resolveBenchTexts } from '@/lib/robotics/text';
import { engineFaultId } from '@/lib/robotics/steps';
import { runChecks, runHeadless, sampleAt, taskJob } from '@/lib/interp';
import en from '@/i18n/content/en/robotics/l298n.json';
import bench from './l298n';

const root = join(__dirname, '..', '..', '..');
const benchFig = readFileSync(join(root, 'figures', 'robotics', 'l298n.js'), 'utf8');
const moduleFig = readFileSync(join(root, 'figures', 'modules', 'l298n.js'), 'utf8');

const leaf = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
const render = (code: CodeTemplate | string) => (typeof code === 'string' ? code : code.source).replace(/\{\{t:([^}]+)\}\}/g, (_, k: string) => String(leaf(k)));
const NO_WORLD: WorldModel = { inputs: [], script: [] };

describe('l298n content', () => {
  it('matches its ids.ts entry', () => {
    const meta = ROBOTICS.l298n;
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
      // D1-D8 come from one map in the module figure
      if (/^D\d$/.test(p.id)) expect(moduleFig).toContain("id: 'D' + n");
      else if (['NANO', 'MOTA', 'MOTB', 'BATT'].includes(p.id)) expect(benchFig).toMatch(new RegExp(`id: '${p.id}', (board|part):`));
      else expect(moduleFig).toContain(`id: '${p.id}', kind`);
    }
  });

  it('builds in factory order, sets out the mat, then breaks once per fault', () => {
    const ids = bench.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 10)).toEqual(['strip', 'smd', 'low', 'tall', 'solder', 'caps', 'wire-nano', 'wire-motors', 'wire-battery', 'plug']);
    expect(ids.at(-1)).toBe('exploded');
    const breaks = bench.steps.filter((s) => s.kind === 'break').map((s) => s.fault);
    expect([...breaks].sort()).toEqual(bench.faults.map((f) => f.id).sort());
    for (const s of bench.steps) if (s.kind !== 'break') expect(s.refusal).toBeTruthy();
  });

  it("sends each break step its fault's command, plugged in, and the figure offers every fault", () => {
    for (const s of bench.steps.filter((x) => x.kind === 'break')) {
      const f = bench.faults.find((x) => x.id === s.fault)!;
      expect(s.action?.type).toBe('set');
      if (s.action?.type === 'set' && f.figure.type === 'set') expect(s.action.state).toMatchObject(f.figure.state);
      expect(s.done).toMatchObject({ power: 'bench', status: 'running' });
      const id = engineFaultId(f);
      // the module lists the engine's faults; the bench adds its own; reversed:<part> comes from a polar part
      if (id.startsWith('reversed:')) expect(moduleFig).toMatch(new RegExp(`id: '${id.slice(9)}'[^}]*polar:`));
      else expect(benchFig.includes(`['${id}', '`) || moduleFig.includes(`'${id}'`)).toBe(true);
    }
  });

  it("covers the brief's failures", () => {
    const kinds = new Set(bench.faults.map((f) => f.kind));
    for (const k of ['reverse-polarity', 'brownout', 'wrong-voltage', 'cold-solder', 'reversed-part', 'missing-part', 'thermal'] as const) expect(kinds).toContain(k);
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

  it('keeps the Nano inside its USB budget and the stall inside what the pack can give', () => {
    const sup = new Map(bench.current.supplies.map((s) => [s.id, s]));
    for (const l of bench.current.loads) expect(sup.has(l.supply)).toBe(true);
    const usb = bench.current.loads.filter((l) => l.supply === 'usb').reduce((a, l) => a + l.ma, 0);
    expect(usb).toBeLessThan(sup.get('usb')!.limitMa);
    const stall = ['logic', 'motors-fwd', 'stall'].map((id) => bench.current.loads.find((l) => l.id === id)!.ma).reduce((a, b) => a + b, 0);
    expect(stall).toBeLessThan(sup.get('lipo')!.limitMa);
  });
});

describe('l298n code through the app check path', () => {
  const want: Record<string, { D8: number; D7: number; D5: number; D4: number; D9: number }> = {
    fwd: { D8: 1, D7: 0, D5: 1, D4: 0, D9: 1 },
    rev: { D8: 0, D7: 1, D5: 0, D4: 1, D9: 1 },
    spin: { D8: 1, D7: 0, D5: 0, D4: 1, D9: 1 },
    brake: { D8: 1, D7: 1, D5: 1, D4: 1, D9: 1 },
    half: { D8: 1, D7: 0, D5: 1, D4: 0, D9: 128 / 255 },
  };
  for (const m of bench.modes) {
    it(`runs the ${m.id} sketch: the pins the figure drives and its serial line`, () => {
      const trace = runHeadless({ board: 'nano', language: 'arduino-cpp', source: render(m.code), world: NO_WORLD, runMs: 1000 });
      expect(trace.error).toBeNull();
      const at = (pin: string) => sampleAt(trace.pins[pin], 500)?.v;
      for (const pin of ['D8', 'D7', 'D5', 'D4'] as const) expect(at(pin)).toBe(want[m.id][pin]);
      expect(at('D9')).toBeCloseTo(want[m.id].D9, 2);
      expect(trace.serial.map((l) => l.text)).toEqual(m.serial);
    });
  }

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
