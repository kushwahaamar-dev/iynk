import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROBOTICS } from '@/content/ids';
import type { CodeTemplate } from '@/content/schema';
import { benchTextKeys, resolveBenchTexts } from '@/lib/robotics/text';
import { runChecks, taskJob } from '@/lib/interp';
import en from '@/i18n/content/en/robotics/pi5-ros2.json';
import bench from './pi5-ros2';

const root = join(__dirname, '..', '..', '..');
const benchFig = readFileSync(join(root, 'figures', 'robotics', 'pi5-ros2.js'), 'utf8');
const boardFig = readFileSync(join(root, 'figures', 'boards', 'pi4-pi5.js'), 'utf8');

const leaf = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
const render = (code: CodeTemplate | string) => (typeof code === 'string' ? code : code.source).replace(/\{\{t:([^}]+)\}\}/g, (_, k: string) => String(leaf(k)));
// the bench's supplies, as its figure lists them
const sources = (() => {
  const block = benchFig.slice(benchFig.indexOf('    sources: {'), benchFig.indexOf('  mode: '));
  return [...block.matchAll(/^ {6}(\w+): \{ label/gm)].map((m) => m[1]);
})();

describe('pi5-ros2 content', () => {
  it('matches its ids.ts entry', () => {
    const meta = ROBOTICS['pi5-ros2'];
    expect(bench.fig).toBe(meta.fig);
    expect(bench.board).toBe(meta.board);
    expect(bench.modules).toEqual(meta.modules);
    expect(bench.parts).toEqual(meta.parts);
    expect(benchFig).toContain(`pal: '${meta.palette}'`);
    expect(benchFig).toContain(`variant: '${meta.boardVariant}'`);
  });

  it('finds every text the page shows in the English JSON', () => {
    const { missing, texts } = resolveBenchTexts(bench, en);
    expect(missing).toEqual([]);
    expect(benchTextKeys(bench).filter((k) => !texts[k].trim())).toEqual([]);
  });

  it('names only parts the Pi 5 figure draws, or the bench\'s cooler', () => {
    for (const p of bench.figure.parts) {
      if (p.id === 'COOLER') expect(benchFig).toContain(`id: 'COOLER', kind: 'pi-cooler'`);
      else expect(boardFig).toMatch(new RegExp(`(id: '${p.id}', kind|const ${p.id} = \\{ id: '${p.id}')`));
    }
  });

  it('builds in factory order, then breaks it', () => {
    const ids = bench.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 8)).toEqual(['strip', 'smd', 'low', 'tall', 'solder', 'card', 'cooler', 'plug']);
    const breaks = bench.steps.filter((s) => s.kind === 'break').map((s) => s.fault);
    for (const f of breaks) expect(bench.faults.map((x) => x.id)).toContain(f);
  });

  it('sends each break step the same command as its fault, on supplies the figure has', () => {
    for (const s of bench.steps.filter((x) => x.kind === 'break')) {
      const f = bench.faults.find((x) => x.id === s.fault)!;
      expect(f.figure.type).toBe('set');
      expect(s.action?.type).toBe('set');
      if (s.action?.type === 'set' && f.figure.type === 'set') expect(s.action.state).toMatchObject(f.figure.state);
    }
    for (const f of bench.faults) {
      if (f.figure.type !== 'set') continue;
      const { power, fault } = f.figure.state as { power?: string; fault?: string };
      if (power) expect(sources).toContain(power);
      const [kind, a] = String(fault ?? '').split(':');
      if (kind === 'wrong-voltage' || kind === 'reverse-polarity') expect(sources).toContain(a);
      if (kind === 'missing' || kind === 'cold') expect(bench.figure.parts.map((p) => p.id)).toContain(a);
    }
    expect([...bench.current.supplies.map((s) => s.id)].sort()).toEqual([...sources].sort());
    expect(sources).toContain(bench.power.source);
  });

  it('covers power, heat, solder and build failures', () => {
    const kinds = new Set(bench.faults.map((f) => f.kind));
    for (const k of ['reverse-polarity', 'brownout', 'wrong-voltage', 'cold-solder', 'missing-part', 'thermal'] as const) expect(kinds).toContain(k);
  });

  it('puts a quiz after every major step and one at the end', () => {
    const major = bench.steps.filter((s) => s.major).map((s) => s.id);
    const after = bench.quizzes.map((q) => q.afterStep);
    expect(after.filter((a) => a !== null).sort()).toEqual([...major].sort());
    expect(after).toContain(null);
    for (const q of bench.quizzes) for (const qq of q.questions) expect(qq.answer).toBeLessThan(qq.options.length);
  });

  it('has the programs the figure runs, and their fixed console lines', () => {
    for (const m of bench.modes) {
      expect(benchFig).toMatch(new RegExp(`\\n  ${m.id}: \\{ title: `));
      expect(m.bytes).toBe(m.code.source.length);
    }
    expect(benchFig).toContain(`mode: '${bench.defaultMode}'`);
    const boot = bench.modes.find((m) => m.id === 'boot')!;
    for (const line of boot.serial.slice(0, 6)) expect(benchFig).toContain(line);
    const teleop = bench.modes.find((m) => m.id === 'teleop')!;
    for (const line of teleop.serial.slice(0, 3)) expect(benchFig).toContain(line);
  });

  it('keeps the 27 W supply ahead of the ROS load, and the motors over the 3 A buck', () => {
    const usb = bench.current.supplies.find((s) => s.id === 'usb')!;
    const running = bench.current.loads.filter((l) => l.supply === 'usb').reduce((a, l) => a + l.ma, 0);
    expect(running).toBeLessThan(usb.limitMa);
    const buck = bench.current.supplies.find((s) => s.id === 'pin5')!;
    const onBuck = bench.current.loads.filter((l) => l.supply === 'pin5').reduce((a, l) => a + l.ma, 0);
    const motor = bench.faults.find((f) => f.id === 'motor-brownout')!;
    expect(onBuck + (motor.effect.extraMa ?? 0)).toBeGreaterThan(buck.limitMa);
  });
});

describe('pi5-ros2 tasks through the app check path', () => {
  for (const task of bench.tasks) {
    it(`${task.id}: the reference solution passes every check`, () => {
      const { trace, results } = runChecks(taskJob(task, task.solution));
      expect(trace.error).toBeNull();
      expect(task.checks.filter((_, i) => !results[i].ok).map((c) => String(leaf(c.label)))).toEqual([]);
    });

    it(`${task.id}: the starter runs and does not already pass`, () => {
      const { results } = runChecks(taskJob(task, render(task.starter)));
      expect(results.some((r) => !r.ok)).toBe(true);
    });
  }
});
