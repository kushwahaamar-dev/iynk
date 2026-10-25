import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROBOTICS } from '@/content/ids';
import type { CodeTemplate } from '@/content/schema';
import { benchTextKeys, resolveBenchTexts } from '@/lib/robotics/text';
import { engineFaultId } from '@/lib/robotics/steps';
import { runChecks, taskJob } from '@/lib/interp';
import en from '@/i18n/content/en/robotics/lm2596.json';
import bench from './lm2596';

const root = join(__dirname, '..', '..', '..');
const benchFig = readFileSync(join(root, 'figures', 'robotics', 'lm2596.js'), 'utf8');
const moduleFig = readFileSync(join(root, 'figures', 'modules', 'lm2596.js'), 'utf8');

const leaf = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
const render = (code: CodeTemplate | string) => (typeof code === 'string' ? code : code.source).replace(/\{\{t:([^}]+)\}\}/g, (_, k: string) => String(leaf(k)));

// the converter's numbers, as figures/modules/lm2596.js computes them
const VFB = 1.23, R1 = 330, OHM_PER_TURN = 400;
const r2For = (v: number) => R1 * (v / VFB - 1);

describe('lm2596 content', () => {
  it('matches its ids.ts entry', () => {
    const meta = ROBOTICS.lm2596;
    expect(bench.fig).toBe(meta.fig);
    expect(bench.board).toBe(meta.board);
    expect(bench.modules).toEqual(meta.modules);
    // the meter is on the mat too; ids.ts lists it once the driver adds it (docs/requests/P2-rob-power-to-driver-lm2596-multimeter.md)
    expect([...bench.parts].sort()).toEqual([...new Set([...meta.parts, 'multimeter'])].sort());
  });

  it('finds every text the page shows in the English JSON', () => {
    const { missing, texts } = resolveBenchTexts(bench, en);
    expect(missing).toEqual([]);
    expect(benchTextKeys(bench).filter((k) => !texts[k].trim())).toEqual([]);
  });

  it('names only parts the module or the mat draws', () => {
    for (const p of bench.figure.parts) {
      if (['BATT', 'MM', 'MOT'].includes(p.id)) expect(benchFig).toMatch(new RegExp(`id: '${p.id}', part:`));
      else expect(moduleFig).toMatch(new RegExp(`\\{ id: '${p.id}', kind: '`));
    }
  });

  it('builds in factory order, sets 5 V with nothing on the output, then loads it, then breaks once per fault', () => {
    const ids = bench.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 14)).toEqual(['strip', 'smd', 'trimmer-display', 'caps-terminals', 'solder', 'wire-battery', 'wire-meter', 'plug',
      'show-out', 'set5', 'wire-motor', 'load', 'set33', 'set12']);
    expect(ids.at(-1)).toBe('exploded');
    const breaks = bench.steps.filter((s) => s.kind === 'break').map((s) => s.fault);
    expect([...breaks].sort()).toEqual(bench.faults.map((f) => f.id).sort());
    for (const s of bench.steps) if (s.kind !== 'break') expect(s.refusal).toBeTruthy();
    // the motor goes on with the power off, and only after the meter has read the set voltage
    expect(bench.steps.find((s) => s.id === 'wire-motor')!.action).toEqual({ type: 'set', state: { power: null, matStep: 'motor' } });
    for (const id of ['set5', 'set33', 'set12']) expect(bench.steps.find((s) => s.id === id)!.done).toMatchObject({ mode: id, 'meas.U1.set': true });
    expect(bench.steps.find((s) => s.id === 'show-out')!.action).toEqual({ type: 'press', id: 'ctl-sw1' });
    expect(moduleFig).toMatch(/id: 'SW1', kind: 'tact'[^\n]*control: \{ type: 'button'/);
  });

  it("sends each break step its fault's command, plugged in, and the figure offers every fault", () => {
    for (const s of bench.steps.filter((x) => x.kind === 'break')) {
      const f = bench.faults.find((x) => x.id === s.fault)!;
      expect(s.action?.type).toBe('set');
      if (s.action?.type === 'set' && f.figure.type === 'set') expect(s.action.state).toMatchObject(f.figure.state);
      expect(s.done).toMatchObject({ power: 'bench', status: 'running' });
      const id = engineFaultId(f);
      // the engine offers reverse polarity on a supply with a pin, reversed:<part> for a polar part and
      // wrong-voltage:<supply>:<max + 4> from the supply's rating; the rest are listed in the bench's faults
      if (id.startsWith('reversed:')) expect(moduleFig).toMatch(new RegExp(`id: '${id.slice(9)}'[^\\n]*\\n?[^\\n]*polar:`));
      else if (id.startsWith('reverse-polarity:')) expect(moduleFig).toMatch(new RegExp(`${id.slice(17)}: \\{[^}]*pin: '`));
      else if (id === 'wrong-voltage:bench:44') expect(moduleFig).toMatch(/bench: \{[^}]*max: 40 \}/);
      else expect(benchFig).toContain(`['${id}', '`);
    }
  });

  it("covers the fact sheet's failure table", () => {
    const kinds = new Set(bench.faults.map((f) => f.kind));
    for (const k of ['reverse-polarity', 'reversed-part', 'cold-solder', 'brownout', 'overcurrent', 'short', 'wrong-voltage'] as const) expect(kinds).toContain(k);
  });

  it('puts a quiz after every major step and one at the end', () => {
    const major = bench.steps.filter((s) => s.major).map((s) => s.id);
    const after = bench.quizzes.map((q) => q.afterStep);
    expect(after.filter((a) => a !== null).sort()).toEqual([...major].sort());
    expect(after).toContain(null);
    for (const q of bench.quizzes) for (const qq of q.questions) expect(qq.answer).toBeLessThan(qq.options.length);
  });

  it('prints the bench notes the figure prints, and the paper sums agree with the formula', () => {
    expect(benchFig).toContain("mode: 'found'");
    expect(bench.defaultMode).toBe('found');
    for (const m of bench.modes) {
      expect(m.serial[0]).toBe('-- bench notes --');
      expect(moduleFig).toContain(`'${m.serial[0]}'`);
      expect(moduleFig).toContain(`${m.id}: '${m.serial[1]}'`);
      expect(benchFig).toContain(`mode('${m.id}', `);
    }
    // R2 and the turns each sum quotes
    const quoted = { set5: [1011, 2.53], set33: [555, 1.39], set12: [2890, 7.22] } as const;
    for (const [id, [r2, turns]] of Object.entries(quoted)) {
      expect(r2For(id === 'set5' ? 5 : id === 'set33' ? 3.3 : 12)).toBeCloseTo(r2, -1);
      expect(r2 / OHM_PER_TURN).toBeCloseTo(turns, 1);
      const src = render(bench.modes.find((m) => m.id === id)!.code);
      expect(src).toContain(`${r2} ohm`);
      expect(src).toContain(`${turns} turns`);
    }
    expect(VFB * (1 + 10000 / R1)).toBeCloseTo(38.5, 1);
    expect(moduleFig).toContain('const VFB = 1.23, R1 = 330, OHM_TURN = 400, TURNS = 25;');
  });

  it('keeps the current model in step with the converter: power in is power out over the efficiency', () => {
    const load = (id: string) => bench.current.loads.find((l) => l.id === id)!.ma;
    const sup = bench.current.supplies[0];
    for (const l of bench.current.loads) expect(l.supply).toBe(sup.id);
    // the whole pack current, meter included, at the efficiency the figure reports
    const pack = (id: string) => load(id) + load('meter') + load('quiescent');
    // the motor at 5 V: 155 mA out at 74 % (the figure's stats, and the prose)
    expect(pack('motor-5v')).toBeCloseTo((5 * 155) / 0.74 / 8.4, -1);
    expect(load('motor-3v3')).toBeLessThan(load('motor-5v'));
    expect(load('motor-flat-out')).toBe(load('wiper-open'));
    // the held motor is 1.25 A out, far under the 4.2 A limit, so the rail holds at 5 V, at 83 %
    expect(pack('stall')).toBeCloseTo((5 * 1250) / 0.83 / 8.4, -1);
    expect(pack('stall')).toBeLessThan(sup.limitMa);
  });
});

describe('lm2596 code through the app check path', () => {
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

  it('cut-off: a version that does not latch fails once the pack bounces back', () => {
    const task = bench.tasks.find((t) => t.id === 'cut-off')!;
    const unlatched = task.solution.replace('if (!cut && pack < CUT) {', 'digitalWrite(LOAD, pack < CUT ? LOW : HIGH);\n  if (!cut && pack < CUT) {')
      .replace('    digitalWrite(LOAD, LOW);\n', '');
    expect(unlatched).not.toBe(task.solution);
    const { results } = runChecks(taskJob(task, unlatched));
    expect(results.at(-1)!.ok).toBe(false);
  });
});
