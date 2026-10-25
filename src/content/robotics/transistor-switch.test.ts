import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROBOTICS } from '@/content/ids';
import type { CodeTemplate, WorldModel } from '@/content/schema';
import { benchTextKeys, resolveBenchTexts } from '@/lib/robotics/text';
import { engineFaultId } from '@/lib/robotics/steps';
import { runChecks, runHeadless, sampleAt, taskJob } from '@/lib/interp';
import en from '@/i18n/content/en/robotics/transistor-switch.json';
import bench from './transistor-switch';

const root = join(__dirname, '..', '..', '..');
const benchFig = readFileSync(join(root, 'figures', 'robotics', 'transistor-switch.js'), 'utf8');

const leaf = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
const render = (code: CodeTemplate | string) => (typeof code === 'string' ? code : code.source).replace(/\{\{t:([^}]+)\}\}/g, (_, k: string) => String(leaf(k)));
const NO_WORLD: WorldModel = { inputs: [], script: [] };

describe('transistor-switch content', () => {
  it('matches its ids.ts entry', () => {
    const meta = ROBOTICS['transistor-switch'];
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

  it('names only parts the figure draws on its breadboard', () => {
    for (const p of bench.figure.parts) expect(benchFig).toContain(`id: '${p.id}', part:`);
  });

  it('builds the Nano, then the breadboard, then breaks once per fault', () => {
    const ids = bench.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 7)).toEqual(['strip', 'pnp', 'headers', 'solder', 'bb-drive', 'bb-motor', 'bb-power']);
    const breaks = bench.steps.filter((s) => s.kind === 'break').map((s) => s.fault);
    expect([...breaks].sort()).toEqual(bench.faults.map((f) => f.id).sort());
    for (const s of bench.steps) if (s.kind !== 'break' && s.id !== 'measure') expect(s.refusal).toBeTruthy();
  });

  it('sends each break step its fault\'s command, plugged in, and the figure offers every fault', () => {
    for (const s of bench.steps.filter((x) => x.kind === 'break')) {
      const f = bench.faults.find((x) => x.id === s.fault)!;
      expect(s.action?.type).toBe('set');
      if (s.action?.type === 'set' && f.figure.type === 'set') expect(s.action.state).toMatchObject(f.figure.state);
      expect(s.done).toMatchObject({ power: 'usb', status: 'running' });
      const id = engineFaultId(f);
      // brown-out is the engine's own Break it entry on any board with an MCU
      if (id !== 'brownout') expect(benchFig).toContain(`['${id}', '`);
    }
  });

  it("covers the brief's failures", () => {
    const kinds = new Set(bench.faults.map((f) => f.kind));
    for (const k of ['reverse-polarity', 'brownout', 'wrong-voltage', 'cold-solder', 'reversed-part', 'missing-part'] as const) expect(kinds).toContain(k);
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
    for (const t of bench.tasks) if (t.circuit) expect(benchFig).toContain(`'${t.circuit}': {`);
  });

  it('reads every status key the figure reports', () => {
    for (const f of bench.status) {
      const m = /^meas\.(\w+)\.(\w+)$/.exec(f.key);
      if (m) expect(benchFig).toMatch(new RegExp(`\\b${m[2]}\\b`));
    }
  });
});

describe('transistor-switch code through the app check path', () => {
  const want: Record<string, number> = { high: 1, pwm: 128 / 255, low: 0 };
  for (const m of bench.modes) {
    it(`runs the ${m.id} sketch: pin 9 and the serial lines the figure prints`, () => {
      const trace = runHeadless({ board: 'nano', language: 'arduino-cpp', source: render(m.code), world: NO_WORLD, runMs: 3500 });
      expect(trace.error).toBeNull();
      if (m.id in want) expect(sampleAt(trace.pins.D9, 500)?.v).toBeCloseTo(want[m.id], 2);
      else expect(sampleAt(trace.pins.D9, 3000)?.v).toBe(1);
      expect(trace.serial.map((l) => l.text).slice(0, m.serial.length)).toEqual(m.serial);
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
