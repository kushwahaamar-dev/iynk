import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROBOTICS } from '@/content/ids';
import type { CodeTemplate } from '@/content/schema';
import { benchTextKeys, resolveBenchTexts } from '@/lib/robotics/text';
import { engineFaultId } from '@/lib/robotics/steps';
import { runChecks, runHeadless, sampleAt, taskJob } from '@/lib/interp';
import en from '@/i18n/content/en/robotics/qtr-8rc.json';
import bench from './qtr-8rc';

const root = join(__dirname, '..', '..', '..');
const benchFig = readFileSync(join(root, 'figures', 'robotics', 'qtr-8rc.js'), 'utf8');
const moduleFig = readFileSync(join(root, 'figures', 'modules', 'qtr-8rc.js'), 'utf8');

const leaf = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
const render = (code: CodeTemplate | string) => (typeof code === 'string' ? code : code.source).replace(/\{\{t:([^}]+)\}\}/g, (_, k: string) => String(leaf(k)));
const MAT = ['NANO', 'DRV', 'MOTL', 'MOTR', 'BATT', 'TRACK'];

describe('qtr-8rc content', () => {
  it('matches its ids.ts entry', () => {
    const meta = ROBOTICS['qtr-8rc'];
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
      // U1-U8 come from one map in the module figure
      if (/^U\d$/.test(p.id)) expect(moduleFig).toContain("id: 'U' + (i + 1)");
      else if (MAT.includes(p.id)) expect(benchFig).toMatch(new RegExp(`id: '${p.id}', (board|part):`));
      else expect(moduleFig).toMatch(new RegExp(`(id: |\\[|\\()'${p.id}', `));
    }
  });

  it('builds in factory order, sets out the mat, then breaks once per fault', () => {
    const ids = bench.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 10)).toEqual(['strip', 'smd', 'header', 'solder', 'wire-nano', 'wire-driver', 'wire-motors', 'wire-battery', 'card', 'plug']);
    expect(ids.at(-1)).toBe('exploded');
    const breaks = bench.steps.filter((s) => s.kind === 'break').map((s) => s.fault);
    expect([...breaks].sort()).toEqual(bench.faults.map((f) => f.id).sort());
    for (const s of bench.steps) if (s.kind !== 'break') expect(s.refusal).toBeTruthy();
    // the mat steps are the figure's, in its order
    const mats = bench.steps.flatMap((s) => (s.action?.type === 'set' && typeof s.action.state.matStep === 'string' ? [s.action.state.matStep] : []));
    expect(mats).toEqual(['nano', 'driver', 'motors', 'battery', 'track']);
    for (const m of mats) expect(benchFig).toContain(`{ id: '${m}', label:`);
  });

  it("sends each break step its fault's command, plugged in, and the figure offers every fault", () => {
    for (const s of bench.steps.filter((x) => x.kind === 'break')) {
      const f = bench.faults.find((x) => x.id === s.fault)!;
      expect(s.action?.type).toBe('set');
      if (s.action?.type === 'set' && f.figure.type === 'set') expect(s.action.state).toMatchObject(f.figure.state);
      expect(s.done).toMatchObject({ power: 'bench', status: 'running' });
      const id = engineFaultId(f);
      // brownout is the engine's own (the bench has a controller); the rest the module or the bench lists
      if (id === 'brownout') expect(moduleFig).toContain("mcu: { part: 'Q1'");
      else expect(benchFig.includes(`['${id}', '`) || moduleFig.includes(`['${id}', '`) || moduleFig.includes(`'${id}'`)).toBe(true);
    }
  });

  it('puts a quiz after every major step and one at the end', () => {
    const major = bench.steps.filter((s) => s.major).map((s) => s.id);
    const after = bench.quizzes.map((q) => q.afterStep);
    expect(after.filter((a) => a !== null).sort()).toEqual([...major].sort());
    expect(after).toContain(null);
    for (const q of bench.quizzes) for (const qq of q.questions) expect(qq.answer).toBeLessThan(qq.options.length);
  });

  it('has the sketches the figure runs: same ids, sizes and first serial line', () => {
    for (const m of bench.modes) {
      expect(benchFig).toMatch(new RegExp(`${m.id}: \\{ title: [^\\n]*bytes: ${m.bytes},`));
      expect(benchFig).toContain(`'${m.serial[0]}'`);
    }
    expect(benchFig).toContain(`mode: '${bench.defaultMode}'`);
  });

  it('keeps the Nano, the array and the driver logic inside the USB budget', () => {
    const sup = new Map(bench.current.supplies.map((s) => [s.id, s]));
    for (const l of bench.current.loads) expect(sup.has(l.supply)).toBe(true);
    const usb = bench.current.loads.filter((l) => l.supply === 'usb').reduce((a, l) => a + l.ma, 0);
    expect(usb).toBeLessThan(sup.get('usb')!.limitMa);
  });
});

describe('qtr-8rc code through the app check path', () => {
  const steer = bench.tasks.find((t) => t.id === 'steer')!;

  it('the raw sketch prints its banner, then eight RC times', () => {
    const trace = runHeadless({ board: 'nano', language: 'arduino-cpp', source: render(bench.modes[0].code), world: steer.world, runMs: 2100 });
    expect(trace.error).toBeNull();
    expect(trace.serial[0].text).toBe(bench.modes[0].serial[0]);
    const times = trace.serial[1].text.split(' ').map(Number);
    expect(times).toHaveLength(8);
    for (const us of times) expect(us).toBeGreaterThanOrEqual(100);
  });

  it('the line sketch calibrates for 2 s, then prints the position', () => {
    const trace = runHeadless({ board: 'nano', language: 'arduino-cpp', source: render(bench.modes[1].code), world: steer.world, runMs: 2600 });
    expect(trace.error).toBeNull();
    expect(trace.serial[0]).toMatchObject({ text: bench.modes[1].serial[0] });
    expect(trace.serial[0].t).toBeGreaterThanOrEqual(2000);
    expect(trace.serial[1].text).toMatch(/^position \d+$/);
  });

  it('the follow sketch steers: STBY high, the wheel on the line side slower', () => {
    const trace = runHeadless({ board: 'nano', language: 'arduino-cpp', source: render(bench.modes[2].code), world: steer.world, runMs: 4600 });
    expect(trace.error).toBeNull();
    expect(trace.serial[0].text).toBe(bench.modes[2].serial[0]);
    expect(trace.serial[1].text).toMatch(/^pos \d+ L \d+ R \d+$/);
    expect(sampleAt(trace.pins.D9, 2500)?.v).toBe(1);
    // the sketch reads once a second: at 3.0 s (line under sensor 2) it slows the left wheel
    expect(sampleAt(trace.pins.D5, 3100)!.v).toBeLessThan(sampleAt(trace.pins.D6, 3100)!.v);
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
