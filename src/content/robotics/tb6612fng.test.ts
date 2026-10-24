import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROBOTICS } from '@/content/ids';
import type { Check, CodeTemplate, WorldModel } from '@/content/schema';
import * as interp from '@/lib/interp';
import en from '@/i18n/content/en/robotics/tb6612fng.json';
import bench from './tb6612fng';

const root = join(__dirname, '..', '..', '..');
const moduleFig = readFileSync(join(root, 'figures', 'modules', 'tb6612fng.js'), 'utf8');

const leaf = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);

// the generator's rule (scripts/gen-content-index.mjs): a text key is a top key or a section-prefixed dot path
const TOP = new Set(['title', 'tagline', 'overview', 'sub', 'hint', 'noun', 'practice']);
const SECTION = /^(parts|power|modes|steps|faults|status|current|tasks|quizzes)\.[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/;
function keysIn(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') {
    if (TOP.has(node) || SECTION.test(node)) out.push(node);
    for (const m of node.matchAll(/\{\{t:([^}]+)\}\}/g)) out.push(m[1]);
  } else if (Array.isArray(node)) node.forEach((v) => keysIn(v, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((v) => keysIn(v, out));
  return out;
}

// Code with {{t:key}} tokens resolved to English, as the editor shows it.
const render = (code: CodeTemplate | string) => (typeof code === 'string' ? code : code.source).replace(/\{\{t:([^}]+)\}\}/g, (_, k: string) => String(leaf(k)));

interface Sample { level: number; duty: number }
interface Result { ok: boolean; errors: string[]; serial: string; samples: Map<number, Map<string, Sample>> }

// A deterministic run on the Nano: step the virtual clock event by event, apply the world script and sample pins.
function runNano(source: string, world: WorldModel, runMs: number, at: number[]): Result {
  const run = interp.createRun({ board: 'nano', source });
  const errors = run.diagnostics.filter((d) => d.kind !== 'limit').map((d) => `${d.line}:${d.col} ${d.message}`);
  let serial = '';
  run.on('serial', (t) => { serial += t; });
  run.on('error', (e) => { errors.push(e.message); });
  const samples = new Map<number, Map<string, Sample>>();
  if (errors.length) return { ok: false, errors, serial, samples };
  run.start();
  const pinOf = (net: string) => Number(net.replace(/^D/, ''));
  const events = [...world.script].sort((a, b) => a.t - b.t);
  const times = [...new Set([...at, ...events.map((e) => e.t), runMs])].sort((a, b) => a - b);
  let now = 0;
  for (const t of times) {
    if (t > now) { run.step(t - now); now = t; }
    for (const e of events.filter((x) => x.t === t)) {
      const input = world.inputs.find((i) => i.id === e.input);
      if (input) run.input(pinOf(input.pins[0]), e.value);
    }
    if (at.includes(t)) {
      const snap = run.snapshot();
      const m = new Map<string, Sample>();
      for (const [n, v] of Object.entries(snap.pins)) m.set('D' + n, { level: v.level, duty: v.duty ?? v.level });
      samples.set(t, m);
    }
  }
  return { ok: errors.length === 0, errors, serial, samples };
}

// The check kinds these tasks use, evaluated on the samples (src/lib/interp/checks.ts is the shared evaluator).
function passes(c: Check, r: Result, source: string, runMs: number): boolean {
  const pin = (t: number, p: string) => r.samples.get(t)?.get(p);
  switch (c.kind) {
    case 'runs': return r.ok && runMs >= c.minMs;
    case 'pin-level': return pin(c.atMs, c.pin)?.level === c.level;
    case 'pwm': { const s = pin(c.atMs, c.pin); return !!s && s.duty >= c.duty[0] && s.duty <= c.duty[1]; }
    case 'serial': return r.serial.split(c.match).length - 1 >= c.minCount;
    case 'code': return c.must.every((m) => source.includes(m)) && c.mustNot.every((m) => !source.includes(m));
    default: throw new Error(`check kind ${c.kind} is not used by this bench`);
  }
}
const atTimes = (checks: Check[]) => checks.flatMap((c) => ('atMs' in c ? [c.atMs] : []));

describe('tb6612fng content', () => {
  it('matches its ids.ts entry', () => {
    const meta = ROBOTICS.tb6612fng;
    expect(bench.fig).toBe(meta.fig);
    expect(bench.board).toBe(meta.board);
    expect(bench.modules).toEqual(meta.modules);
    expect(bench.parts).toEqual(meta.parts);
  });

  it('has every text key in the English JSON, and no empty string', () => {
    const missing = [...new Set(keysIn(bench))].filter((k) => typeof leaf(k) !== 'string' || !(leaf(k) as string).trim());
    expect(missing).toEqual([]);
  });

  it('keeps build steps in the original order with refusals, and every break step names a fault', () => {
    const ids = bench.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 6)).toEqual(['strip', 'smd', 'jp1', 'jp2', 'solder', 'plug']);
    expect(ids.at(-1)).toBe('exploded');
    const faults = new Set(bench.faults.map((f) => f.id));
    for (const s of bench.steps) {
      if (s.kind === 'break') expect(faults.has(s.fault ?? '')).toBe(true);
      else expect(s.refusal).toBeTruthy();
    }
  });

  it('covers the brief\'s failures: reverse polarity, brown-out, wrong voltage, cold solder', () => {
    const kinds = bench.faults.map((f) => f.kind);
    for (const k of ['reverse-polarity', 'brownout', 'wrong-voltage', 'cold-solder', 'reversed-part', 'missing-part'] as const) expect(kinds).toContain(k);
  });

  it('puts a quiz after every major step and one at the end', () => {
    const major = bench.steps.filter((s) => s.major).map((s) => s.id);
    const after = bench.quizzes.map((q) => q.afterStep);
    expect(after.filter((a) => a !== null).sort()).toEqual([...major].sort());
    expect(after).toContain(null);
    for (const q of bench.quizzes) for (const qq of q.questions) expect(qq.answer).toBeLessThan(qq.options.length);
  });

  it('has the same commands and serial lines as the figure', () => {
    for (const m of bench.modes) {
      expect(moduleFig).toContain(`${m.id}: { title:`);
      for (const line of m.serial) expect(moduleFig).toContain(`'${line}'`);
    }
    expect(bench.modes.map((m) => m.id)).toContain(bench.defaultMode);
    expect(moduleFig).toContain(`mode: '${bench.defaultMode}'`);
  });

  it('sums its current model against real supply limits', () => {
    const sup = new Map(bench.current.supplies.map((s) => [s.id, s]));
    for (const l of bench.current.loads) expect(sup.has(l.supply)).toBe(true);
    const start5v = bench.current.loads.find((l) => l.id === 'motors-on-5v');
    expect(start5v && start5v.ma > (sup.get('usb')?.limitMa ?? 0)).toBe(true);
    const running = bench.current.loads.filter((l) => l.supply === 'usb' && l.id !== 'motors-on-5v').reduce((a, l) => a + l.ma, 0);
    expect(running).toBeLessThan(sup.get('usb')?.limitMa ?? 0);
  });
});

describe('tb6612fng code through the interpreter', () => {
  const expectPins: Record<string, { D5: number; D7: number; D8: number; D9: number }> = {
    fwd50: { D5: 128 / 255, D7: 1, D8: 0, D9: 1 },
    fwd100: { D5: 1, D7: 1, D8: 0, D9: 1 },
    rev: { D5: 160 / 255, D7: 0, D8: 1, D9: 1 },
    brake: { D5: 1, D7: 1, D8: 1, D9: 1 },
    coast: { D5: 1, D7: 0, D8: 0, D9: 1 },
    standby: { D5: 128 / 255, D7: 1, D8: 0, D9: 0 },
  };

  for (const m of bench.modes) {
    it(`runs the ${m.id} sketch: the pins the figure shows and the serial line`, () => {
      const r = runNano(render(m.code), { inputs: [], script: [] }, 3500, [500]);
      expect(r.errors).toEqual([]);
      const s = r.samples.get(500);
      const want = expectPins[m.id];
      expect(s?.get('D9')?.level).toBe(want.D9);
      expect(s?.get('D7')?.level).toBe(want.D7);
      expect(s?.get('D8')?.level).toBe(want.D8);
      expect(s?.get('D5')?.duty).toBeCloseTo(want.D5, 2);
      expect(r.serial).toContain(m.serial[0]);
    });
  }

  for (const task of bench.tasks) {
    it(`${task.id}: the reference solution passes every check`, () => {
      const source = task.solution;
      const r = runNano(source, task.world, task.runMs, atTimes(task.checks));
      expect(r.errors).toEqual([]);
      const failed = task.checks.filter((c) => !passes(c, r, source, task.runMs)).map((c) => String(leaf(c.label)));
      expect(failed).toEqual([]);
    });

    it(`${task.id}: the starter compiles and does not already pass`, () => {
      const source = render(task.starter);
      const r = runNano(source, task.world, task.runMs, atTimes(task.checks));
      expect(r.errors).toEqual([]);
      expect(task.checks.some((c) => !passes(c, r, source, task.runMs))).toBe(true);
    });
  }
});
