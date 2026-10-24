// @vitest-environment node
// The Nano's content against its figure (figures/boards/nano.js) and the interpreter: shared ids must match, and
// every lesson's starter code must compile and pass its own checks on the scripted run.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import nano from './nano';
import en from '@/i18n/content/en/boards/nano.json';
import { createRun, getProfile, resolvePin } from '@/lib/interp';
import type { Check, Lesson, RunTrace } from '@/content/schema';

const figure = readFileSync(join(process.cwd(), 'figures/boards/nano.js'), 'utf8');
const figureParts = new Set([...figure.matchAll(/\{ id: '([A-Z0-9]+)', kind: '/g)].map((m) => m[1]));
const figureCircuits = new Set([...figure.matchAll(/\n {4}'?([a-z0-9-]+)'?: \{\n {6}title: /g)].map((m) => m[1]));
const figureSources = ['usb', 'vin', 'pin5', 'pin3'];
const headerNets = (name: string) => {
  const m = new RegExp(`const ${name} = \\[([^\\]]+)\\]`).exec(figure);
  return m ? [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]) : [];
};

const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};

/** The starter code as the editor shows it: default chips, English comments. */
function render(lesson: Lesson): string {
  return lesson.code.source
    .replace(/\{\{p:([^}]+)\}\}/g, (_, id: string) => {
      const p = lesson.params.find((q) => q.id === id);
      if (!p) throw new Error(`${lesson.id}: no param ${id}`);
      if (p.kind === 'number') return String(p.default);
      if (p.kind === 'toggle') return p.default ? p.code.on : p.code.off;
      const o = p.options.find((q) => q.value === p.default);
      if (!o) throw new Error(`${lesson.id}: param ${id} has no default option`);
      return o.code;
    })
    .replace(/\{\{t:([^}]+)\}\}/g, (_, key: string) => text(key));
}

const profile = getProfile('nano');
const pinNo = (net: string): number => {
  const d = /^D(\d+)$/.exec(net);
  const n = d ? Number(d[1]) : resolvePin(profile, net);
  if (n === undefined) throw new Error(`unknown pin ${net}`);
  return n;
};

/** A headless run of the starter code with the lesson's world script, recorded as a RunTrace. */
function runLesson(lesson: Lesson): { trace: RunTrace; source: string } {
  const source = render(lesson);
  const devices = lesson.world.inputs.flatMap((i) => (i.device.kind === 'mpu6050' ? (['mpu6050'] as const) : []));
  const run = createRun({ board: 'nano', source, devices: [...devices] });
  const trace: RunTrace = { ms: 0, error: null, serial: [], pins: {}, figure: [], inputs: [] };
  let line = '';
  run.on('serial', (chunk) => {
    for (const ch of chunk) {
      if (ch === '\n') { trace.serial.push({ t: run.status.t, text: line.replace(/\r$/, '') }); line = ''; } else line += ch;
    }
  });
  run.on('error', (e) => { trace.error ??= { line: e.line, message: e.message }; });
  run.on('pins', (snap) => {
    for (const [n, v] of Object.entries(snap.pins)) {
      const list = (trace.pins[n] ??= []);
      const val = v.duty !== undefined ? v.duty : v.level;
      const mode = v.duty !== undefined ? 'pwm' : 'out';
      const last = list[list.length - 1];
      if (!last || last.v !== val || last.mode !== mode) list.push({ t: snap.t, v: val, mode });
    }
  });
  const apply = (input: string, value: number) => {
    const w = lesson.world.inputs.find((i) => i.id === input);
    if (!w) throw new Error(`${lesson.id}: no world input ${input}`);
    const pin = pinNo(w.pins[0]);
    if (w.device.kind === 'button') {
      const up = w.device.pull === 'internal-up' || w.device.pull === 'external-up';
      run.input(pin, value ? (up ? 0 : 1) : up ? null : 0);
    } else if (w.device.kind === 'pot') run.analog(pin, (5 * (value - w.min)) / (w.max - w.min));
  };
  for (const w of lesson.world.inputs) if (w.device.kind !== 'mpu6050') apply(w.id, w.default);
  const script = [...lesson.world.script].sort((a, b) => a.t - b.t);
  run.start();
  for (let t = 0; t < lesson.runMs && !trace.error; t += 10) {
    while (script.length && script[0].t <= t) {
      const ev = script.shift()!;
      apply(ev.input, ev.value);
      trace.inputs.push(ev);
    }
    run.step(10);
  }
  for (const d of run.diagnostics) if (d.kind !== 'runtime') trace.error ??= { line: d.line, message: d.message };
  trace.ms = run.status.t;
  // exact digital edges from the world's edge trace, in ms
  for (const [us, n, level] of run.world.trace) {
    const list = (trace.pins['e' + n] ??= []);
    list.push({ t: us / 1000, v: level, mode: 'out' });
  }
  return { trace, source };
}

const levelAt = (edges: { t: number; v: number }[], t: number) => {
  let v = 0;
  for (const e of edges) { if (e.t > t) break; v = e.v; }
  return v;
};

/** The subset of src/lib/interp/checks.ts the Nano lessons use, evaluated on the recorded trace. */
function passes(c: Check, trace: RunTrace, source: string): boolean {
  switch (c.kind) {
    case 'runs': return !trace.error && trace.ms >= c.minMs;
    case 'code': return c.must.every((m) => source.includes(m)) && c.mustNot.every((m) => !source.includes(m));
    case 'serial': {
      const re = c.regex ? new RegExp(c.match) : null;
      return trace.serial.filter((l) => (c.byMs === undefined || l.t <= c.byMs) && (re ? re.test(l.text) : l.text.includes(c.match))).length >= c.minCount;
    }
    case 'pin-toggles': {
      const edges = trace.pins['e' + pinNo(c.pin)] ?? [];
      const rises = edges.filter((e, i) => e.v === 1 && (i === 0 || edges[i - 1].v === 0)).map((e) => e.t);
      let cycles = 0;
      for (let i = 1; i < rises.length; i++) { const p = rises[i] - rises[i - 1]; if (p >= c.periodMs[0] && p <= c.periodMs[1]) cycles++; }
      return cycles >= c.minCycles;
    }
    case 'pwm': {
      const list = (trace.pins[String(pinNo(c.pin))] ?? []).filter((e) => e.t <= c.atMs);
      const last = list[list.length - 1];
      // analogWrite(pin, 0) and (pin, 255) drive the pin LOW or HIGH instead of PWM, as the AVR core does
      return !!last && last.v >= c.duty[0] && last.v <= c.duty[1];
    }
    case 'responds': {
      const edges = trace.pins['e' + pinNo(c.pin)] ?? [];
      for (let t = c.after.t; t <= c.after.t + c.withinMs; t += 1) { const v = levelAt(edges, t); if (v >= c.v[0] && v <= c.v[1]) return true; }
      return false;
    }
    default: throw new Error(`check kind ${c.kind} is not used by the Nano lessons`);
  }
}

describe('nano content', () => {
  it('names only parts the figure draws', () => {
    expect(figureParts.size).toBe(26);
    for (const p of nano.figure.parts) expect(figureParts, p.id).toContain(p.id);
    expect(nano.figure.parts.map((p) => p.id).sort()).toEqual([...figureParts].sort());
    for (const l of nano.leds) expect(figureParts).toContain(l.id);
    for (const c of nano.controls) expect(figureParts).toContain(c.id);
  });

  it('has a figure circuit for every lesson, keyed by the lesson id', () => {
    for (const l of nano.lessons) { expect(l.circuit).toBe(l.id); expect(figureCircuits).toContain(l.id); }
  });

  it('matches the figure headers pin for pin', () => {
    const j1 = headerNets('J1'), j2 = headerNets('J2');
    expect(j1).toHaveLength(15);
    expect(j2).toHaveLength(15);
    for (const row of nano.pinout.filter((r) => r.header === 'J1')) expect(row.net).toBe(j1[Number(row.pin) - 1]);
    for (const row of nano.pinout.filter((r) => r.header === 'J2')) expect(row.net).toBe(j2[Number(row.pin) - 1]);
    expect(nano.pinout.filter((r) => r.header === 'J1' || r.header === 'J2')).toHaveLength(30);
  });

  it('only triggers faults the figure can show', () => {
    for (const f of nano.failures) {
      expect(f.figure.type).toBe('set');
      const state = f.figure.type === 'set' ? f.figure.state : {};
      const fault = String(state.fault);
      const [kind, a] = fault.split(':');
      expect(['reversed', 'missing', 'cold', 'reverse-polarity', 'wrong-voltage', 'short', 'brownout'], f.id).toContain(kind);
      if (kind === 'reversed' || kind === 'missing') expect(figureParts, f.id).toContain(a);
      if (kind === 'cold') expect(figureParts, f.id).toContain(a.split('.')[0]);
      if (kind === 'reverse-polarity' || kind === 'wrong-voltage') expect(figureSources, f.id).toContain(a);
      if (state.power != null) expect(figureSources).toContain(state.power);
      if (state.circuit != null) expect(figureCircuits).toContain(state.circuit);
    }
    const kinds = new Set(nano.failures.map((f) => f.kind));
    for (const k of ['reverse-polarity', 'brownout', 'wrong-voltage', 'cold-solder', 'missing-part'] as const) expect(kinds).toContain(k);
  });

  it('removes a single SMD part in one failure', () => {
    expect(nano.failures.some((f) => f.trigger.by === 'remove-part' && f.trigger.part === 'C4')).toBe(true);
  });

  for (const lesson of nano.lessons) {
    it(`lesson ${lesson.n} (${lesson.id}): starter code compiles and passes its checks`, () => {
      const { trace, source } = runLesson(lesson);
      expect(trace.error).toBeNull();
      for (const c of lesson.checks) expect(passes(c, trace, source), `${lesson.id}: ${text(c.label)}\n${trace.serial.slice(0, 8).map((l) => l.text).join('\n')}`).toBe(true);
      for (const sample of lesson.serial.sample) expect(trace.serial.map((l) => l.text), `${lesson.id} sample`).toContain(sample);
    });
  }
});
