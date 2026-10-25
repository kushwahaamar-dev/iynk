import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROBOTICS } from '@/content/ids';
import type { CodeTemplate } from '@/content/schema';
import { benchTextKeys, resolveBenchTexts } from '@/lib/robotics/text';
import { engineFaultId } from '@/lib/robotics/steps';
import { runChecks, runHeadless, taskJob } from '@/lib/interp';
import en from '@/i18n/content/en/robotics/pca9685.json';
import bench from './pca9685';

const root = join(__dirname, '..', '..', '..');
const benchFig = readFileSync(join(root, 'figures', 'robotics', 'pca9685.js'), 'utf8');
const moduleFig = readFileSync(join(root, 'figures', 'modules', 'pca9685.js'), 'utf8');

const leaf = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
const render = (code: CodeTemplate | string) => (typeof code === 'string' ? code : code.source).replace(/\{\{t:([^}]+)\}\}/g, (_, k: string) => String(leaf(k)));
const MAT = ['NANO', 'ARM', 'PACK'];

describe('pca9685 content', () => {
  it('matches its ids.ts entry', () => {
    const meta = ROBOTICS['pca9685'];
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
      // the six address jumpers come from one map in the module figure
      if (/^SJ_A\d$/.test(p.id)) expect(moduleFig).toContain("id: 'SJ_A' + i");
      else if (MAT.includes(p.id)) expect(benchFig).toMatch(new RegExp(`id: '${p.id}', (board|part):`));
      else expect(moduleFig).toMatch(new RegExp(`(id: |\\[|\\()'${p.id}', `));
    }
  });

  it('builds in factory order, sets out the mat, then breaks once per fault', () => {
    const ids = bench.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 10)).toEqual(['strip', 'smd', 'headers', 'terminal', 'cap', 'solder', 'wire-nano', 'wire-arm', 'wire-pack', 'plug']);
    expect(ids.at(-1)).toBe('exploded');
    const breaks = bench.steps.filter((s) => s.kind === 'break').map((s) => s.fault);
    expect([...breaks].sort()).toEqual(bench.faults.map((f) => f.id).sort());
    for (const s of bench.steps) if (s.kind !== 'break') expect(s.refusal).toBeTruthy();
    // the mat steps are the figure's, in its order
    const mats = bench.steps.flatMap((s) => (s.action?.type === 'set' && typeof s.action.state.matStep === 'string' ? [s.action.state.matStep] : []));
    expect(mats).toEqual(['nano', 'arm', 'pack']);
    for (const m of mats) expect(benchFig).toContain(`{ id: '${m}', label:`);
  });

  it("sends each break step its fault's command, plugged in, and the figure offers every fault", () => {
    for (const s of bench.steps.filter((x) => x.kind === 'break')) {
      const f = bench.faults.find((x) => x.id === s.fault)!;
      expect(s.action?.type).toBe('set');
      if (s.action?.type === 'set' && f.figure.type === 'set') expect(s.action.state).toMatchObject(f.figure.state);
      expect(s.done).toMatchObject({ power: 'bench', status: 'running' });
      const id = engineFaultId(f);
      // brownout is the engine's own (the board has a chip on VCC), reversed:<part> comes from a polar part; the rest the
      // module or the bench lists
      if (id === 'brownout') expect(moduleFig).toContain("mcu: { part: 'U1'");
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

  it('keeps the Nano and the chip inside the USB budget, the servos on the pack', () => {
    const sup = new Map(bench.current.supplies.map((s) => [s.id, s]));
    for (const l of bench.current.loads) expect(sup.has(l.supply)).toBe(true);
    const usb = bench.current.loads.filter((l) => l.supply === 'usb').reduce((a, l) => a + l.ma, 0);
    expect(usb).toBeLessThan(sup.get('usb')!.limitMa);
    expect(bench.current.loads.filter((l) => /idle|moving|stall/.test(l.id)).every((l) => l.supply === 'pack')).toBe(true);
  });
});

describe('pca9685 code through the app check path', () => {
  const none = { inputs: [], script: [] };
  const run = (id: string, runMs: number) =>
    runHeadless({ board: 'nano', language: 'arduino-cpp', source: render(bench.modes.find((m) => m.id === id)!.code), world: none, runMs });

  it('every sketch prints the line the figure shows first', () => {
    for (const m of bench.modes) {
      const trace = run(m.id, 300);
      expect(trace.error).toBeNull();
      expect(trace.serial[0].text).toBe(m.serial[0]);
    }
  });

  it('the sweep reports the base every 60 degrees', () => {
    const trace = run('sweep', 3200);
    expect(trace.serial.slice(1, 4).map((l) => l.text)).toEqual(['base 0 deg', 'base 60 deg', 'base 120 deg']);
  });

  it('pick and place prints one pose a second, then runs mirrored', () => {
    const trace = run('pick', 9200);
    expect(trace.error).toBeNull();
    const pick = bench.modes.find((m) => m.id === 'pick')!;
    expect(trace.serial.slice(1, 3).map((l) => l.text)).toEqual(pick.serial.slice(1));
    const poses = trace.serial.slice(1);
    for (let i = 1; i < poses.length; i++) expect(poses[i].t - poses[i - 1].t).toBe(1000);
    expect(poses[9].text).toBe('pose 2: base 135 shoulder 90 grip 150');
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

  describe('knob: the checks read the base servo on channel 0', () => {
    const knob = bench.tasks.find((t) => t.id === 'knob')!;
    const servo = knob.checks.flatMap((c, i) => (c.kind === 'servo' ? [i] : []));
    const servoResults = (source: string) => {
      const { trace, results } = runChecks(taskJob(knob, source));
      return { trace, ok: servo.map((i) => results[i].ok) };
    };

    it('the half-way, down and up checks are servo checks on PCA40.0', () => {
      expect(servo.map((i) => knob.checks[i].label)).toEqual(['tasks.knob.checks.3', 'tasks.knob.checks.4', 'tasks.knob.checks.5']);
      expect(servo.map((i) => knob.checks[i]).every((c) => c.kind === 'servo' && c.pin === 'PCA40.0')).toBe(true);
    });

    it('the starter holds the base at 90°, so only the half-way check passes; the solution follows the knob', () => {
      expect(servoResults(render(knob.starter)).ok).toEqual([true, false, false]);
      expect(servoResults(knob.solution).ok).toEqual([true, true, true]);
    });

    it('a sketch that prints the right angles but never sets the 50 Hz frame fails every pulse check', () => {
      const noFreq = knob.solution.replace('pwm.setPWMFreq(50);', '');
      expect(noFreq).not.toBe(knob.solution);
      const solved = servoResults(knob.solution);
      const forgot = servoResults(noFreq);
      expect(forgot.trace.serial.map((l) => l.text)).toEqual(solved.trace.serial.map((l) => l.text));
      expect(forgot.ok).toEqual([false, false, false]);
    });
  });
});
