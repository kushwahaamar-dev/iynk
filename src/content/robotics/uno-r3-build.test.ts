import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROBOTICS } from '@/content/ids';
import type { CodeTemplate, WorldModel } from '@/content/schema';
import { benchTextKeys, resolveBenchTexts } from '@/lib/robotics/text';
import { runChecks, runHeadless, sampleAt, taskJob } from '@/lib/interp';
import en from '@/i18n/content/en/robotics/uno-r3-build.json';
import bench from './uno-r3-build';

const root = join(__dirname, '..', '..', '..');
const benchFig = readFileSync(join(root, 'figures', 'robotics', 'uno-r3-build.js'), 'utf8');
const boardFig = readFileSync(join(root, 'figures', 'boards', 'uno-r3.js'), 'utf8');

const leaf = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
const render = (code: CodeTemplate | string) => (typeof code === 'string' ? code : code.source).replace(/\{\{t:([^}]+)\}\}/g, (_, k: string) => String(leaf(k)));
const NO_WORLD: WorldModel = { inputs: [], script: [] };

describe('uno-r3-build content', () => {
  it('matches its ids.ts entry', () => {
    const meta = ROBOTICS['uno-r3-build'];
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

  it('names only parts the board figure draws, or the task circuits\' breadboard parts', () => {
    for (const p of bench.figure.parts) {
      if (['R3', 'LED1', 'SW1'].includes(p.id)) expect(benchFig).toContain(`id: '${p.id}'`);
      else expect(boardFig).toContain(`id: '${p.id}', kind`);
    }
  });

  it('builds in factory order, breaks once per fault and ends on Blink', () => {
    const ids = bench.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 11)).toEqual(['unplug', 'strip', 'pick-place', 'reflow', 'low-tht', 'tall-tht', 'solder', 'chip', 'plug', 'upload', 'exploded']);
    expect(ids.at(-1)).toBe('blink');
    const breaks = bench.steps.filter((s) => s.kind === 'break').map((s) => s.fault);
    expect([...breaks].sort()).toEqual(bench.faults.map((f) => f.id).sort());
  });

  it('sends each break step the same command as its fault', () => {
    for (const s of bench.steps.filter((x) => x.kind === 'break')) {
      const f = bench.faults.find((x) => x.id === s.fault)!;
      expect(f.figure.type).toBe('set');
      expect(s.action?.type).toBe('set');
      if (s.action?.type === 'set' && f.figure.type === 'set') expect(s.action.state).toMatchObject(f.figure.state);
    }
  });

  it("covers the brief's failures", () => {
    const kinds = new Set(bench.faults.map((f) => f.kind));
    for (const k of ['reverse-polarity', 'brownout', 'wrong-voltage', 'cold-solder', 'reversed-part', 'missing-part', 'short'] as const) expect(kinds).toContain(k);
  });

  it('puts a quiz after every major step and one at the end', () => {
    const major = bench.steps.filter((s) => s.major).map((s) => s.id);
    const after = bench.quizzes.map((q) => q.afterStep);
    expect(after.filter((a) => a !== null).sort()).toEqual([...major].sort());
    expect(after).toContain(null);
    for (const q of bench.quizzes) for (const qq of q.questions) expect(qq.answer).toBeLessThan(qq.options.length);
  });

  it('has the sketches the figure runs: same ids, sizes and serial lines', () => {
    for (const m of bench.modes) {
      expect(benchFig).toMatch(new RegExp(`${m.id}: \\{ title: [^\\n]*bytes: ${m.bytes},`));
      for (const line of m.serial) expect(benchFig).toContain(line.replace(/#\d+$/, '#'));
    }
    expect(benchFig).toContain(`mode: '${bench.defaultMode}'`);
    for (const t of bench.tasks) if (t.circuit) expect(benchFig).toContain(`'${t.circuit}': {`);
  });

  it('keeps the running board inside the USB budget, and the motor over it', () => {
    const usb = bench.current.supplies.find((s) => s.id === 'usb')!;
    const running = bench.current.loads.filter((l) => l.supply === 'usb').reduce((a, l) => a + l.ma, 0);
    expect(running).toBeLessThan(usb.limitMa);
    const motor = bench.faults.find((f) => f.id === 'motor-brownout')!;
    expect(running + (motor.effect.extraMa ?? 0)).toBeGreaterThan(usb.limitMa);
  });
});

// a task's virtual run takes well under a second alone, but several seconds while the whole suite shares the CPU
const RUN_BUDGET_MS = 30_000;

describe('uno-r3-build code through the app check path', () => {
  it('runs Blink at 1 s on, 1 s off', () => {
    const trace = runHeadless({ board: 'uno-r3', language: 'arduino-cpp', source: render(bench.modes[0].code), world: NO_WORLD, runMs: 4500 });
    expect(trace.error).toBeNull();
    expect(sampleAt(trace.pins.D13, 500)?.v).toBe(1);
    expect(sampleAt(trace.pins.D13, 1500)?.v).toBe(0);
    expect(sampleAt(trace.pins.D13, 2500)?.v).toBe(1);
  });

  it('runs Serial hello: the banner, then one line a second', () => {
    const hello = bench.modes.find((m) => m.id === 'hello')!;
    const trace = runHeadless({ board: 'uno-r3', language: 'arduino-cpp', source: render(hello.code), world: NO_WORLD, runMs: 2500 });
    expect(trace.error).toBeNull();
    expect(trace.serial.map((l) => l.text).slice(0, 4)).toEqual(hello.serial);
  });

  for (const task of bench.tasks) {
    it(`${task.id}: the reference solution passes every check`, () => {
      const { trace, results } = runChecks(taskJob(task, task.solution));
      expect(trace.error).toBeNull();
      expect(task.checks.filter((_, i) => !results[i].ok).map((c) => String(leaf(c.label)))).toEqual([]);
    }, RUN_BUDGET_MS);

    it(`${task.id}: the starter runs and does not already pass`, () => {
      const { trace, results } = runChecks(taskJob(task, render(task.starter)));
      expect(trace.error).toBeNull();
      expect(results.some((r) => !r.ok)).toBe(true);
    }, RUN_BUDGET_MS);
  }
});
