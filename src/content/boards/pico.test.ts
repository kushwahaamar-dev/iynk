// The Pico content against its figure file and the app's one check path: ids that must match, and every lesson's
// code run on its scripted world through runHeadless + evaluateChecks, on the lesson's own variant.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import type { Lesson } from '@/content/schema';
import { defaultParams, renderTemplate, resolveText } from '@/lib/boardlab/template';
import { lessonJob, runChecks } from '@/lib/interp';
import en from '@/i18n/content/en/boards/pico.json';
import pico from './pico';

type Part = { id: string; pins?: (string | null)[]; control?: { action: string }; led?: { net?: string }; fixed?: boolean };
type FigureDef = {
  name: string; parts: Part[]; circuits: Record<string, unknown>; modes: Record<string, unknown>;
  power: { sources: Record<string, unknown>; rails: Record<string, unknown> };
  variants: Record<string, { patch: () => FigureDef }>;
};

// The figure file registers itself with SL.bench.board(def); run it in a sandbox that only records the def.
function figureDefs(): Record<string, FigureDef> {
  let def: FigureDef | null = null;
  const bench = { kinds: { qfn: { xr() {} } }, M: {}, kind() {}, board(d: FigureDef) { def = d; } };
  vm.runInNewContext(readFileSync(join(process.cwd(), 'figures/boards/pico.js'), 'utf8'), { SL: { bench } });
  if (!def) throw new Error('figures/boards/pico.js did not register a board');
  const base: FigureDef = def;
  return Object.fromEntries(Object.entries(base.variants).map(([k, v]) => [k, v.patch()]));
}

const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};
const reference = (l: Lesson): string => resolveText(renderTemplate(l.code.source, l.params, defaultParams(l.params)).code, text);

describe('pico content vs figure', () => {
  const defs = figureDefs();

  it('has the four variants on both sides, named like the products', () => {
    expect(Object.keys(defs)).toEqual(pico.variants.map((v) => v.figureVariant));
    for (const v of pico.variants) expect(defs[v.figureVariant].name).toBe(v.name);
  });

  it('names every figure part, and every named part exists in some variant', () => {
    const figIds = new Set(Object.values(defs).flatMap((d) => d.parts.map((p) => p.id)));
    const named = new Set(pico.figure.parts.map((p) => p.id));
    expect([...figIds].filter((id) => !named.has(id))).toEqual([]);
    expect([...named].filter((id) => !figIds.has(id))).toEqual([]);
  });

  it('keeps pin nets, controls and LEDs in step with the figure', () => {
    for (const d of Object.values(defs)) {
      const nets = d.parts.filter((p) => p.id === 'PINS1' || p.id === 'PINS2').flatMap((p) => p.pins ?? []);
      expect(nets).toEqual(pico.pinout.filter((r) => r.header === 'edge').map((r) => r.net));
      const sw = d.parts.find((p) => p.id === 'SW1');
      expect(sw?.control?.action).toBe('bootsel');
    }
    expect(defs.pico.parts.find((p) => p.id === 'D2')?.led?.net).toBe('GP25');
    expect(defs['pico-w'].parts.find((p) => p.id === 'D2')?.led?.net).toBe('WL_GPIO0');
    expect(pico.variants.find((v) => v.id === 'pico-w')?.leds?.[0].drivenBy).toBe('WL_GPIO0');
  });

  it('has a figure circuit for every lesson that names one', () => {
    for (const l of pico.lessons) if (l.circuit) expect(Object.keys(defs.pico.circuits)).toContain(l.circuit);
  });

  it('only sends fault ids, sources and parts the figure knows', () => {
    const d = defs.pico, parts = new Set(d.parts.map((p) => p.id)), sources = Object.keys(d.power.sources);
    for (const f of pico.failures) {
      if (f.figure.type !== 'set') continue;
      const s = f.figure.state as { fault?: string; power?: string | null; press?: { id: string } };
      if (s.power) expect(sources).toContain(s.power);
      if (s.press) expect(parts.has(s.press.id)).toBe(true);
      if (!s.fault) continue;
      const [kind, a] = s.fault.split(':');
      if (kind === 'missing' || kind === 'reversed') expect(parts.has(a)).toBe(true);
      if (kind === 'cold') expect(parts.has(a.split('.')[0])).toBe(true);
      if (kind === 'reverse-polarity' || kind === 'wrong-voltage') expect(sources).toContain(a);
    }
    for (const i of pico.power.inputs) expect(parts.has(i.part)).toBe(true);
  });

  it('marks GP0-GP22 5 V tolerant on the RP2350 boards only', () => {
    expect(pico.pinout.some((r) => r.fiveVoltTolerant)).toBe(false);
    const patch = pico.variants.find((v) => v.id === 'pico2')!.pinPatch!;
    expect(patch.map((r) => r.net)).toEqual(Array.from({ length: 23 }, (_, i) => `GP${i}`));
    expect(pico.variants.find((v) => v.id === 'pico2')!.mcu!.clockHz).toBe(150_000_000);
  });
});

describe('pico lessons pass their checks', () => {
  it('has at least four progressive lessons for every variant', () => {
    for (const v of pico.variants) {
      const ls = pico.lessons.filter((l) => !l.variants.length || l.variants.includes(v.id));
      expect(ls.length).toBeGreaterThanOrEqual(4);
      for (const level of ['io', 'input', 'analog']) expect(ls.some((l) => l.level === level)).toBe(true);
      expect(ls.some((l) => l.level === 'protocol' || l.level === 'wireless')).toBe(true);
    }
  });

  for (const l of pico.lessons) {
    it(`${l.id}: the code passes its checks through the app check path`, () => {
      const { trace, results } = runChecks(lessonJob(pico, l, reference(l)));
      expect(trace.error).toBeNull();
      const failed = l.checks.filter((_, i) => !results[i].ok).map((c) => c.label);
      expect(failed, `serial: ${trace.serial.slice(0, 6).map((s) => s.text).join(' | ')}`).toEqual([]);
    });
  }

  it('blinks the right LED on each variant', () => {
    const blink = pico.lessons.find((l) => l.id === 'blink')!;
    for (const [variant, net] of [['pico', 'GP25'], ['pico-w', 'WL_GPIO0'], ['pico2', 'GP25'], ['pico2-w', 'WL_GPIO0']] as const) {
      const { trace } = runChecks(lessonJob(pico, blink, reference(blink), variant));
      expect((trace.pins[net] ?? []).filter((e) => e.v === 1).length, variant).toBeGreaterThanOrEqual(2);
    }
  });
});
