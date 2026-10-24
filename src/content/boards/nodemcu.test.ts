// NodeMCU content: cross-checks against the figure file (one source per fact, shared ids must match) and runs
// every lesson's starter code through src/lib/interp with the lesson's world script, then evaluates its checks.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRun, getProfile, resolvePin } from '@/lib/interp';
import type { Check, Lesson } from '@/content/schema';
import board from './nodemcu';

const root = join(__dirname, '..', '..', '..');
const en = JSON.parse(readFileSync(join(root, 'src/i18n/content/en/boards/nodemcu.json'), 'utf8'));
const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};

// The figure file registers one board through SL.bench.board(def); capture the def without the engine.
type FigPart = { id: string; kind: string; pins?: string[]; led?: { net?: string; invert?: boolean }; control?: { action: string; net?: string } };
type FigDef = {
  parts: FigPart[];
  circuits: Record<string, { parts: { id: string }[]; wires: { from: string; to: string }[] }>;
  power: { sources: Record<string, unknown>; mcu: { min: number; part: string } };
  modes: Record<string, unknown>;
  faults: string[];
};
const fig: FigDef = (() => {
  let def: FigDef | null = null;
  const src = readFileSync(join(root, 'figures/boards/nodemcu.js'), 'utf8');
  new Function('SL', src)({ bench: { board: (d: FigDef) => { def = d; } } });
  if (!def) throw new Error('figure did not register a board');
  return def;
})();
const figPart = (id: string) => fig.parts.find((p) => p.id === id);

function render(lesson: Lesson): string {
  return lesson.code.source
    .replace(/\{\{p:([^}]+)\}\}/g, (_, id: string) => {
      const p = lesson.params.find((x) => x.id === id);
      if (!p) throw new Error(`${lesson.id}: no param ${id}`);
      if (p.kind === 'number') return String(p.default);
      if (p.kind === 'toggle') return p.default ? p.code.on : p.code.off;
      const opt = p.options.find((o) => o.value === p.default);
      if (!opt) throw new Error(`${lesson.id}: default ${p.default} is not an option`);
      return opt.code;
    })
    .replace(/\{\{t:([^}]+)\}\}/g, (_, key: string) => text(key));
}

interface Trace {
  error: string | null;
  ms: number;
  serial: { t: number; text: string }[];
  edges: Map<string, [number, 0 | 1][]>;
  duty: Map<string, [number, number][]>;
}

const profile = getProfile('nodemcu');
const pinNo = (net: string) => {
  const n = resolvePin(profile, net);
  if (n === undefined) throw new Error(`unknown pin ${net}`);
  return n;
};

/** Headless deterministic run: the world script drives inputs at virtual times, like the lesson completion run. */
async function runLesson(lesson: Lesson, source: string): Promise<Trace> {
  const run = createRun({ board: 'nodemcu', source });
  const tr: Trace = { error: null, ms: 0, serial: [], edges: new Map(), duty: new Map() };
  if (run.diagnostics.length) {
    tr.error = run.diagnostics.map((d) => `${d.line}: ${d.message}`).join('; ');
    return tr;
  }
  let buf = '';
  run.on('serial', (s) => {
    buf += s;
    let i: number;
    while ((i = buf.indexOf('\n')) >= 0) {
      tr.serial.push({ t: run.status.t, text: buf.slice(0, i).replace(/\r$/, '') });
      buf = buf.slice(i + 1);
    }
  });
  run.on('error', (e) => { tr.error = e.message; });
  run.on('pins', (snap) => {
    for (const [n, v] of Object.entries(snap.pins)) {
      // A PWM pin at 0 % or 100 % is a plain LOW or HIGH output; count it as duty 0 or 1.
      const name = run.world.pinName(Number(n));
      const list = tr.duty.get(name) ?? [];
      list.push([snap.t, v.duty ?? v.level]);
      tr.duty.set(name, list);
    }
  });
  const inputs = new Map(lesson.world.inputs.map((i) => [i.id, i]));
  const apply = (id: string, value: number) => {
    const inp = inputs.get(id);
    if (!inp) throw new Error(`no world input ${id}`);
    const d = inp.device;
    if (d.kind === 'button') run.input(pinNo(inp.pins[0]), value ? 0 : 1);          // FLASH: pull-up, LOW when pressed
    else if (d.kind === 'pot') run.analog(pinNo(inp.pins[0]), 3.3 * value / inp.max);
    else if (d.kind === 'divider') {                                                  // LDR: R = 10 k x (lux / 10)^-0.7
      const r = 10_000 * Math.pow(value / 10, -0.7);
      run.analog(pinNo(inp.pins[0]), 3.3 * d.fixedOhms / (r + d.fixedOhms));
    } else if (d.kind === 'network') {
      const [method, path] = d.requests[value].split(' ');
      void run.request(method, path);
    }
  };
  for (const i of lesson.world.inputs) if (i.device.kind !== 'network') apply(i.id, i.default);
  run.start();
  const script = [...lesson.world.script].sort((a, b) => a.t - b.t);
  const stepMs = 5;
  for (let t = 0; t < lesson.runMs && !tr.error; t += stepMs) {
    while (script.length && script[0].t <= t) {
      const ev = script.shift()!;
      apply(ev.input, ev.value);
    }
    run.step(stepMs);
  }
  tr.ms = run.status.t;
  for (const [us, n, level] of run.world.trace) {
    const name = run.world.pinName(n);
    const list = tr.edges.get(name) ?? [];
    list.push([us / 1000, level]);
    tr.edges.set(name, list);
  }
  run.stop();
  return tr;
}

const levelAt = (tr: Trace, pin: string, ms: number): 0 | 1 => {
  let v: 0 | 1 = 0;
  for (const [t, l] of tr.edges.get(pin) ?? []) if (t <= ms) v = l;
  return v;
};
const dutyAt = (tr: Trace, pin: string, ms: number): number | null => {
  let v: number | null = null;
  for (const [t, d] of tr.duty.get(pin) ?? []) if (t <= ms) v = d;
  return v;
};

function evaluate(c: Check, tr: Trace, source: string): boolean {
  switch (c.kind) {
    case 'runs': return !tr.error && tr.ms >= c.minMs;
    case 'serial': {
      const re = c.regex ? new RegExp(c.match) : null;
      return tr.serial.filter((l) => (c.byMs === undefined || l.t <= c.byMs) && (re ? re.test(l.text) : l.text.includes(c.match))).length >= c.minCount;
    }
    case 'pin-level': return levelAt(tr, c.pin, c.atMs) === c.level;
    case 'pin-toggles': {
      const rises = (tr.edges.get(c.pin) ?? []).filter(([, l]) => l === 1).map(([t]) => t);
      let ok = 0;
      for (let i = 1; i < rises.length; i++) { const p = rises[i] - rises[i - 1]; if (p >= c.periodMs[0] && p <= c.periodMs[1]) ok++; }
      return ok >= c.minCycles;
    }
    case 'pwm': { const d = dutyAt(tr, c.pin, c.atMs); return d !== null && d >= c.duty[0] && d <= c.duty[1]; }
    case 'responds': {
      for (let t = c.after.t; t <= c.after.t + c.withinMs; t += 5) {
        const v = c.mode === 'pwm' ? dutyAt(tr, c.pin, t) ?? -1 : levelAt(tr, c.pin, t);
        if (t > c.after.t && v >= c.v[0] && v <= c.v[1]) return true;
      }
      return false;
    }
    case 'code': return c.must.every((m) => source.includes(m)) && !c.mustNot.some((m) => source.includes(m));
    default: throw new Error(`check kind ${c.kind} is not evaluated here`);
  }
}

describe('nodemcu content matches the figure', () => {
  it('pinout rows are the two 15-pin headers, nets as the figure wires them', () => {
    expect(board.pinout).toHaveLength(30);
    for (const h of ['J1', 'J2'] as const) {
      const rows = board.pinout.filter((r) => r.header === h);
      const nets = figPart(h)!.pins!.map((n, i) => n || `${h}.${i + 1}`);
      expect(rows.map((r) => r.pin)).toEqual(nets.map((_, i) => String(i + 1)));
      expect(rows.map((r) => r.net)).toEqual(nets);
    }
  });

  it('the D-pin to GPIO map agrees with the interpreter profile', () => {
    for (const r of board.pinout.filter((x) => /^D\d$/.test(x.label))) {
      const gpio = r.functions.find((f) => /^GPIO\d+$/.test(f));
      expect(Number(gpio!.slice(4)), r.label).toBe(profile.aliases[r.label]);
    }
    expect(profile.aliases.LED_BUILTIN).toBe(2);
  });

  it('every figure part has host text and nothing else is listed', () => {
    expect(board.figure.parts.map((p) => p.id).sort()).toEqual(fig.parts.map((p) => p.id).sort());
  });

  it('LEDs and controls match the figure', () => {
    for (const led of board.leds) {
      const p = figPart(led.id)!;
      expect(p.led?.net).toBe(led.drivenBy);
      expect(!!p.led?.invert).toBe(led.activeLow);
    }
    for (const c of board.controls) expect(figPart(c.id)?.control?.action).toBe(c.kind);
  });

  it('power inputs and the brown-out voltage match the figure', () => {
    expect(board.power.inputs.map((i) => i.id).sort()).toEqual(Object.keys(fig.power.sources).sort());
    expect(board.power.brownoutVolts).toBe(fig.power.mcu.min);
  });

  it('every failure names a fault the figure engine understands', () => {
    const kinds = new Set(['reversed', 'missing', 'cold', 'reverse-polarity', 'wrong-voltage', 'brownout', 'short']);
    for (const f of board.failures) {
      expect(f.figure.type, f.id).toBe('set');
      const st = f.figure.type === 'set' ? f.figure.state : {};
      if (typeof st.power === 'string') expect(Object.keys(fig.power.sources)).toContain(st.power);
      if (typeof st.fault === 'string') {
        const [kind, a] = st.fault.split(':');
        expect(kinds.has(kind), f.id).toBe(true);
        if (kind === 'reversed' || kind === 'missing') expect(figPart(a), f.id).toBeTruthy();
        if (kind === 'cold') expect(figPart(a) || figPart(a.split('.')[0]), f.id).toBeTruthy();
        if (kind === 'reverse-polarity' || kind === 'wrong-voltage') expect(Object.keys(fig.power.sources)).toContain(a);
      }
      if (st.press) expect(figPart((st.press as { id: string }).id)?.control, f.id).toBeTruthy();
    }
    const brief = ['reverse-polarity', 'brownout', 'wrong-voltage', 'cold-solder', 'missing-part', 'boot-strap'];
    for (const k of brief) expect(board.failures.some((f) => f.kind === k), k).toBe(true);
  });

  it('lesson circuits exist and their callouts point at real parts', () => {
    expect(board.lessons.map((l) => l.level)).toEqual(['io', 'input', 'analog', 'wireless']);
    for (const l of board.lessons) {
      const c = fig.circuits[l.circuit!];
      expect(c, l.id).toBeTruthy();
      for (const co of l.callouts) expect(!!figPart(co.part) || c.parts.some((p) => p.id === co.part), `${l.id} ${co.part}`).toBe(true);
      for (const p of l.params) if (p.figure) expect(c.parts.some((q) => q.id === p.figure!.part), `${l.id} ${p.id}`).toBe(true);
      const labels = new Set(board.pinout.map((r) => r.label));
      for (const p of l.pins) expect(labels.has(p.pin), `${l.id} ${p.pin}`).toBe(true);
    }
  });
});

describe('nodemcu lessons run and pass their checks', () => {
  for (const lesson of board.lessons) {
    it(`${lesson.n}. ${lesson.id}`, async () => {
      const source = render(lesson);
      const tr = await runLesson(lesson, source);
      expect(tr.error).toBeNull();
      const failed = lesson.checks.filter((c) => !evaluate(c, tr, source)).map((c) => text(c.label));
      expect(failed).toEqual([]);
      if (lesson.serial.sample.length) expect(tr.serial.length).toBeGreaterThan(0);
    });
  }

  it('the 5 GHz network never connects (2.4 GHz radio only)', async () => {
    const lesson = board.lessons.find((l) => l.id === 'webserver')!;
    const source = render(lesson).replace('"simlab-guest"', '"simlab-5G"');
    const tr = await runLesson(lesson, source);
    expect(tr.serial.some((l) => l.text.startsWith('IP address'))).toBe(false);
  });
});
