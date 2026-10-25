import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROBOTICS } from '@/content/ids';
import type { CodeTemplate, WorldModel } from '@/content/schema';
import { benchTextKeys, resolveBenchTexts } from '@/lib/robotics/text';
import { engineFaultId } from '@/lib/robotics/steps';
import { runChecks, runHeadless, sampleAt, taskJob } from '@/lib/interp';
import en from '@/i18n/content/en/robotics/hc-sr04.json';
import bench from './hc-sr04';

const root = join(__dirname, '..', '..', '..');
const benchFig = readFileSync(join(root, 'figures', 'robotics', 'hc-sr04.js'), 'utf8');
const moduleFig = readFileSync(join(root, 'figures', 'modules', 'hc-sr04.js'), 'utf8');

const leaf = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
const render = (code: CodeTemplate | string) => (typeof code === 'string' ? code : code.source).replace(/\{\{t:([^}]+)\}\}/g, (_, k: string) => String(leaf(k)));
const MAT = ['NANO', 'BUZ'];

describe('hc-sr04 content', () => {
  it('matches its ids.ts entry', () => {
    const meta = ROBOTICS['hc-sr04'];
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
      if (MAT.includes(p.id)) expect(benchFig).toMatch(new RegExp(`id: '${p.id}', (board|part):`));
      else expect(moduleFig).toMatch(new RegExp(`(id: |\\[|\\()'${p.id}', `));
    }
  });

  it('builds in factory order, sets out the mat, then breaks once per fault', () => {
    const ids = bench.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 8)).toEqual(['strip', 'smd', 'low', 'cans', 'solder', 'wire-nano', 'wire-buzzer', 'plug']);
    expect(ids.at(-1)).toBe('exploded');
    const breaks = bench.steps.filter((s) => s.kind === 'break').map((s) => s.fault);
    expect([...breaks].sort()).toEqual(bench.faults.map((f) => f.id).sort());
    for (const s of bench.steps) if (s.kind !== 'break') expect(s.refusal).toBeTruthy();
    // the mat steps are the figure's, in its order
    const mats = bench.steps.flatMap((s) => (s.action?.type === 'set' && typeof s.action.state.matStep === 'string' ? [s.action.state.matStep] : []));
    expect(mats).toEqual(['nano', 'buzzer']);
    for (const m of mats) expect(benchFig).toContain(`{ id: '${m}', label:`);
  });

  it("sends each break step its fault's command, plugged in, and the figure offers every fault", () => {
    for (const s of bench.steps.filter((x) => x.kind === 'break')) {
      const f = bench.faults.find((x) => x.id === s.fault)!;
      expect(s.action?.type).toBe('set');
      if (s.action?.type === 'set' && f.figure.type === 'set') expect(s.action.state).toMatchObject(f.figure.state);
      expect(s.done).toMatchObject({ power: 'bench', status: 'running' });
      const id = engineFaultId(f);
      // reverse polarity is the engine's own for a supply on a pin; the rest the module or the bench lists
      if (id === 'reverse-polarity:bench') expect(benchFig).toMatch(/bench: \{ label: [^}]*pin: 'VCC'/);
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

  it('keeps the Nano, the board and the buzzer inside the USB budget', () => {
    const sup = new Map(bench.current.supplies.map((s) => [s.id, s]));
    for (const l of bench.current.loads) expect(sup.has(l.supply)).toBe(true);
    const usb = bench.current.loads.filter((l) => l.supply === 'usb').reduce((a, l) => a + l.ma, 0);
    expect(usb).toBeLessThan(sup.get('usb')!.limitMa);
  });
});

describe('hc-sr04 code through the app check path', () => {
  const run = (id: string, world: WorldModel, runMs: number) =>
    runHeadless({ board: 'nano', language: 'arduino-cpp', source: render(bench.modes.find((m) => m.id === id)!.code), world, runMs });
  const at = (cm: number): WorldModel => ({ ...bench.tasks[0].world, script: [{ t: 0, input: 'sonar', value: cm }] });

  it('every sketch prints the line the figure shows first', () => {
    for (const m of bench.modes) {
      const trace = run(m.id, at(30), 300);
      expect(trace.error).toBeNull();
      expect(trace.serial[0].text).toBe(m.serial[0]);
    }
  });

  it('a wall 30 cm off reads 30 cm; an empty room reads no echo, not 0', () => {
    expect(run('wall', at(30), 1200).serial[1].text).toMatch(/^30\.\d\d cm$/);
    expect(run('open', at(450), 1200).serial[1].text).toBe('no echo');
  });

  it('the parking beeper beeps every cm x 10 ms, holds a tone under 10 cm and goes quiet with no echo', () => {
    const world: WorldModel = { ...bench.tasks[0].world, script: [{ t: 0, input: 'sonar', value: 50 }, { t: 4000, input: 'sonar', value: 8 }, { t: 6000, input: 'sonar', value: 450 }] };
    const trace = run('approach', world, 7500);
    expect(trace.error).toBeNull();
    const starts = trace.pins.D8.filter((e) => e.mode === 'tone' && e.t < 4000).map((e) => e.t);
    expect(starts.length).toBeGreaterThanOrEqual(6);
    for (let i = 1; i < starts.length; i++) expect(starts[i] - starts[i - 1]).toBeGreaterThan(480);
    expect(sampleAt(trace.pins.D8, 5000)).toMatchObject({ mode: 'tone', v: 2000 });
    expect(sampleAt(trace.pins.D8, 7000)?.mode).not.toBe('tone');
    expect(trace.serial.map((l) => l.text)).toEqual(expect.arrayContaining(['8.03 cm: STOP', 'no echo']));
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
