import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROBOTICS } from '@/content/ids';
import type { CodeTemplate } from '@/content/schema';
import { benchTextKeys, resolveBenchTexts } from '@/lib/robotics/text';
import { engineFaultId } from '@/lib/robotics/steps';
import { runChecks, runHeadless, sampleAt, taskJob } from '@/lib/interp';
import en from '@/i18n/content/en/robotics/mpu6050.json';
import bench from './mpu6050';

const root = join(__dirname, '..', '..', '..');
const benchFig = readFileSync(join(root, 'figures', 'robotics', 'mpu6050.js'), 'utf8');
const moduleFig = readFileSync(join(root, 'figures', 'modules', 'mpu6050.js'), 'utf8');

const leaf = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
const render = (code: CodeTemplate | string) => (typeof code === 'string' ? code : code.source).replace(/\{\{t:([^}]+)\}\}/g, (_, k: string) => String(leaf(k)));
const MAT = ['NANO', 'BUZ'];

describe('mpu6050 content', () => {
  it('matches its ids.ts entry', () => {
    const meta = ROBOTICS['mpu6050'];
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
    expect(ids.slice(0, 7)).toEqual(['strip', 'smd', 'header', 'solder', 'wire-nano', 'wire-buzzer', 'plug']);
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
      // reverse polarity is the engine's own for a supply on a pin, reversed:<part> comes from a polar part; the rest the
      // module or the bench lists
      if (id === 'reverse-polarity:bench') expect(benchFig).toMatch(/bench: \{ label: [^}]*pin: 'VCC'/);
      else if (id.startsWith('reversed:')) expect(moduleFig).toMatch(new RegExp(`id: '${id.slice(9)}'[^}]*polar:`));
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

describe('mpu6050 code through the app check path', () => {
  const level = bench.tasks.find((t) => t.id === 'calibrate')!.world;
  const run = (id: string, runMs: number) =>
    runHeadless({ board: 'nano', language: 'arduino-cpp', source: render(bench.modes.find((m) => m.id === id)!.code), world: level, runMs });

  it('every sketch prints the line the figure shows first', () => {
    for (const m of bench.modes) {
      const trace = run(m.id, 300);
      expect(trace.error).toBeNull();
      expect(trace.serial[0].text).toBe(m.serial[0]);
    }
  });

  it('awake and level it reads 1 g on Z; never woken it reads 0', () => {
    expect(run('flat', 1200).serial[1].text).toMatch(/^ax 0\.00 ay 0\.00 az 1\.00 g \| gx 0\.\d deg\/s$/);
    expect(run('asleep', 1200).serial[1].text).toBe('ax 0.00 ay 0.00 az 0.00 g | gx 0.0 deg/s');
  });

  it('the scanner finds the chip at 0x68', () => {
    expect(run('scan', 600).serial.map((l) => l.text)).toContain('I2C device found at address 0x68 !');
  });

  it('the tilt alarm beeps on D8 only while tipped past 20 degrees', () => {
    const tipped = bench.tasks.find((t) => t.id === 'alarm')!.world;
    const tilt = bench.modes.find((m) => m.id === 'tilt')!;
    const trace = runHeadless({ board: 'nano', language: 'arduino-cpp', source: render(tilt.code), world: tipped, runMs: 5600 });
    expect(trace.error).toBeNull();
    expect(sampleAt(trace.pins.D8, 1500)?.mode).not.toBe('tone');
    expect(sampleAt(trace.pins.D8, 2600)).toMatchObject({ mode: 'tone', v: 2000 });
    expect(trace.serial.map((l) => l.text)).toContain('roll 35 deg ALARM');
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
