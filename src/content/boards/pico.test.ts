// The Pico content against its figure file and the interpreters: ids that must match, and every lesson's starter
// code compiled and run headless on its scripted world, with its checks evaluated on the result.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { check as compile, createRun } from '@/lib/interp';
import type { Check, Lesson, ParamChip } from '@/content/schema';
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
const chipCode = (p: ParamChip): string =>
  p.kind === 'number' ? String(p.default) : p.kind === 'toggle' ? (p.default ? p.code.on : p.code.off) : p.options.find((o) => o.value === p.default)!.code;
const render = (l: Lesson): string =>
  l.code.source
    .replace(/\{\{p:([\w-]+)\}\}/g, (_, id: string) => chipCode(l.params.find((p) => p.id === id)!))
    .replace(/\{\{t:([^}]+)\}\}/g, (_, key: string) => text(key));

const PIN_NUM = (net: string): number => (net === 'WL_GPIO0' ? 64 : Number(net.replace(/^GP/, '')));
const language = (l: Lesson) => (l.language === 'arduino-cpp' ? 'arduino' : 'python') as 'arduino' | 'python';
const variantFor = (l: Lesson) => l.variants[0] ?? 'pico';

interface Result {
  serial: { t: number; text: string }[];
  edges: [number, number, 0 | 1][];
  duty: (pin: number, ms: number) => number;
  level: (pin: number, ms: number) => number;
  error: string | null;
  ms: number;
}

// One deterministic headless run: world script applied at its times, snapshots every 10 ms.
function runLesson(l: Lesson, variant = variantFor(l)): Result {
  const source = render(l);
  const devices = l.code.libraries.includes('mpu6050') ? (['mpu6050'] as const) : [];
  const run = createRun({ board: 'pico', variant, language: language(l), source, devices: [...devices] });
  const serial: { t: number; text: string }[] = [];
  let line = '';
  run.on('serial', (s) => {
    for (const ch of s) {
      if (ch === '\n') { serial.push({ t: run.status.t, text: line.replace(/\r$/, '') }); line = ''; } else line += ch;
    }
  });
  let error: string | null = null;
  run.on('error', (e) => (error = e.message));
  const snaps: { t: number; pins: Record<number, { level: number; duty?: number }> }[] = [];
  const script = [...l.world.script].sort((a, b) => a.t - b.t);
  run.start();
  for (let t = 0; t < l.runMs; t += 10) {
    for (const ev of script.filter((e) => e.t >= t && e.t < t + 10)) {
      const input = l.world.inputs.find((i) => i.id === ev.input)!;
      const pin = PIN_NUM(input.pins[0]);
      if (input.device.kind === 'button') run.input(pin, input.device.pull.endsWith('up') ? (ev.value ? 0 : 1) : ev.value);
      else run.analog(pin, ev.value);
    }
    run.step(10);
    snaps.push({ t: t + 10, pins: run.snapshot().pins as Record<number, { level: number; duty?: number }> });
  }
  const at = (ms: number) => snaps.find((s) => s.t >= ms) ?? snaps[snaps.length - 1];
  return {
    serial, edges: run.world.trace.slice(), error, ms: run.status.t,
    duty: (pin, ms) => { const p = at(ms).pins[pin]; return p?.duty ?? (p?.level ?? 0); },
    level: (pin, ms) => at(ms).pins[pin]?.level ?? 0,
  };
}

// A local reading of the Check kinds this board uses (src/lib/interp has no checks.ts yet).
function passes(c: Check, r: Result, source: string): boolean {
  switch (c.kind) {
    case 'runs': return !r.error && r.ms >= c.minMs;
    case 'serial': {
      const hits = r.serial.filter((s) => (c.regex ? new RegExp(c.match).test(s.text) : s.text.includes(c.match)) && (c.byMs == null || s.t <= c.byMs));
      return hits.length >= c.minCount;
    }
    case 'pin-toggles': {
      const pin = PIN_NUM(c.pin);
      const rises = r.edges.filter((e) => e[1] === pin && e[2] === 1).map((e) => e[0] / 1000);
      const periods = rises.slice(1).map((t, i) => t - rises[i]);
      return periods.length >= c.minCycles && periods.every((p) => p >= c.periodMs[0] && p <= c.periodMs[1]);
    }
    case 'pin-level': return r.level(PIN_NUM(c.pin), c.atMs) === c.level;
    case 'pwm': { const d = r.duty(PIN_NUM(c.pin), c.atMs); return d >= c.duty[0] && d <= c.duty[1]; }
    case 'responds': {
      const pin = PIN_NUM(c.pin);
      const hit = r.edges.find((e) => e[1] === pin && e[0] / 1000 >= c.after.t && e[0] / 1000 <= c.after.t + c.withinMs && e[2] >= c.v[0] && e[2] <= c.v[1]);
      return !!hit;
    }
    case 'code': return c.must.every((m) => source.includes(m)) && c.mustNot.every((m) => !source.includes(m));
    default: throw new Error(`check kind ${c.kind} is not used by the Pico`);
  }
}

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

describe('pico lessons run on the interpreter', () => {
  it('has at least four progressive lessons for every variant', () => {
    for (const v of pico.variants) {
      const ls = pico.lessons.filter((l) => !l.variants.length || l.variants.includes(v.id));
      expect(ls.length).toBeGreaterThanOrEqual(4);
      for (const level of ['io', 'input', 'analog']) expect(ls.some((l) => l.level === level)).toBe(true);
      expect(ls.some((l) => l.level === 'protocol' || l.level === 'wireless')).toBe(true);
    }
  });

  for (const l of pico.lessons) {
    it(`${l.id}: compiles and passes its checks`, () => {
      const source = render(l);
      const diags = compile({ board: 'pico', variant: variantFor(l), language: language(l), source });
      expect(diags.map((d) => `${d.line}: ${d.message}`)).toEqual([]);
      const r = runLesson(l);
      expect(r.error).toBeNull();
      const failed = l.checks.filter((c) => !passes(c, r, source)).map((c) => c.label);
      expect(failed, `serial: ${r.serial.slice(0, 6).map((s) => s.text).join(' | ')}`).toEqual([]);
    });
  }

  it('blinks the right LED on each variant', () => {
    const blink = pico.lessons.find((l) => l.id === 'blink')!;
    for (const [variant, pin] of [['pico', 25], ['pico-w', 64], ['pico2', 25], ['pico2-w', 64]] as const) {
      const r = runLesson(blink, variant);
      expect(r.edges.filter((e) => e[1] === pin && e[2] === 1).length, variant).toBeGreaterThanOrEqual(2);
    }
  });
});
