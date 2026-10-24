// ESP32-DevKitC content: data invariants, and every lesson's starter code compiled and run headless on the
// Arduino interpreter (src/lib/interp) with the lesson's world script, then its checks evaluated on that run.
// Until src/lib/interp ships its own run harness and checks.ts, the small runner and evaluator below stand in
// for them, covering only the check kinds this board uses.
import { describe, expect, it } from 'vitest';
import board from './esp32-devkitc';
import en from '@/i18n/content/en/boards/esp32-devkitc.json';
import type { Check, Lesson, ParamChip, WorldEvent } from '@/content/schema';
import { World } from '@/lib/interp/world';
import { getProfile } from '@/lib/interp/profiles';
import { compileSketch } from '@/lib/interp/arduino/interp';
import { PREEMPT } from '@/lib/interp/exec';

const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};

const chipCode = (p: ParamChip): string => {
  if (p.kind === 'number') return String(p.default);
  if (p.kind === 'toggle') return p.default ? p.code.on : p.code.off;
  const opt = p.options.find((o) => o.value === p.default);
  if (!opt) throw new Error(`chip ${p.id}: default ${p.default} is not an option`);
  return opt.code;
};

const render = (l: Lesson): string =>
  l.code.source
    .replace(/\{\{p:([^}]+)\}\}/g, (_, id: string) => {
      const p = l.params.find((q) => q.id === id);
      if (!p) throw new Error(`${l.id}: no chip ${id}`);
      return chipCode(p);
    })
    .replace(/\{\{t:([^}]+)\}\}/g, (_, key: string) => text(key));

const gpio = (net: string): number => {
  const m = /^GPIO(\d+)$/.exec(net);
  if (!m) throw new Error(`not a GPIO net: ${net}`);
  return Number(m[1]);
};

interface Run {
  world: World;
  serial: { t: number; text: string }[];
  /** PWM duty or digital level sampled at the times the checks ask for. */
  samples: Map<string, { duty: number | null; level: 0 | 1 }>;
  error: string | null;
}

/** Run a lesson headless: the same source, target and world script give the same run every time. */
function runLesson(l: Lesson, source: string): Run {
  const world = new World(getProfile('esp32-devkitc'));
  const serial: Run['serial'] = [];
  let line = '';
  world.serialOut = (t: string) => {
    for (const ch of t) {
      if (ch === '\n') {
        serial.push({ t: world.now / 1000, text: line.replace(/\r$/, '') });
        line = '';
      } else line += ch;
    }
  };
  const samples: Run['samples'] = new Map();
  const { rt } = compileSketch(source, world);
  rt.initGlobals();
  const prog = rt.program();
  let wait = 0;
  let finished = false;
  let error: string | null = null;
  const runTo = (ms: number) => {
    const target = ms * 1000;
    rt.target = target;
    while (!finished && world.now < target) {
      if (wait > world.now) {
        rt.advance(Math.min(wait, target));
        if (world.now < wait) break;
      }
      try {
        const r = prog.next();
        if (r.done) finished = true;
        else if (r.value !== PREEMPT) wait = r.value;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        finished = true;
      }
    }
    if (world.now < target) rt.advance(target);
  };

  const apply = (ev: WorldEvent) => {
    const input = l.world.inputs.find((i) => i.id === ev.input);
    if (!input) throw new Error(`${l.id}: script names unknown input ${ev.input}`);
    const d = input.device;
    if (d.kind === 'button') {
      const pressedLevel = d.pull === 'external-down' || d.pull === 'internal-down' ? 1 : 0;
      for (const p of input.pins) world.drive(gpio(p), ev.value ? pressedLevel : null);
    } else if (d.kind === 'switch') {
      for (const p of input.pins) world.drive(gpio(p), ev.value ? 1 : 0);
    } else if (d.kind === 'network') {
      const [method, path] = d.requests[ev.value].split(' ');
      void world.request(method, path);
    } else throw new Error(`${l.id}: device ${d.kind} is not modelled in this test`);
  };

  for (const input of l.world.inputs) if (input.device.kind === 'switch') apply({ t: 0, input: input.id, value: input.default });
  const sampleAt = l.checks.flatMap((c) => (c.kind === 'pwm' || c.kind === 'pin-level' ? [{ t: c.atMs, pin: c.pin }] : c.kind === 'responds' ? [{ t: c.after.t + c.withinMs, pin: c.pin }] : []));
  const marks = [
    ...l.world.script.map((ev) => ({ t: ev.t, ev })),
    ...sampleAt.map((s) => ({ t: s.t, sample: s.pin })),
  ].sort((a, b) => a.t - b.t);
  for (const m of marks) {
    runTo(m.t);
    if ('ev' in m && m.ev) apply(m.ev);
    if ('sample' in m && m.sample) {
      const st = world.pin(gpio(m.sample));
      samples.set(`${m.sample}@${m.t}`, { duty: st.mode === 'output' ? st.duty : null, level: world.level(gpio(m.sample)) });
    }
  }
  runTo(l.runMs);
  return { world, serial, samples, error };
}

/** Level of an output pin at a time, from the world's edge trace (outputs start low). */
const levelAt = (run: Run, net: string, ms: number): 0 | 1 => {
  const n = gpio(net);
  let v: 0 | 1 = 0;
  for (const [us, pin, level] of run.world.trace) if (pin === n && us <= ms * 1000) v = level;
  return v;
};

function evaluate(c: Check, run: Run, source: string): boolean {
  switch (c.kind) {
    case 'serial': {
      const re = c.regex ? new RegExp(c.match) : null;
      const hits = run.serial.filter((s) => (c.byMs == null || s.t <= c.byMs) && (re ? re.test(s.text) : s.text.includes(c.match)));
      return hits.length >= c.minCount;
    }
    case 'pin-toggles': {
      const n = gpio(c.pin);
      const rises = run.world.trace.filter(([, pin, level]) => pin === n && level === 1).map(([us]) => us / 1000);
      if (rises.length < c.minCycles + 1) return false;
      const periods = rises.slice(1).map((t, i) => t - rises[i]);
      return periods.every((p) => p >= c.periodMs[0] && p <= c.periodMs[1]);
    }
    case 'pin-level':
      return levelAt(run, c.pin, c.atMs) === c.level;
    case 'responds': {
      const s = run.samples.get(`${c.pin}@${c.after.t + c.withinMs}`);
      if (!s) return false;
      const v = c.mode === 'pwm' ? (s.duty ?? s.level) : s.level;
      return v >= c.v[0] && v <= c.v[1] && levelAt(run, c.pin, c.after.t) !== s.level;
    }
    case 'pwm': {
      const s = run.samples.get(`${c.pin}@${c.atMs}`);
      return !!s && s.duty !== null && s.duty >= c.duty[0] && s.duty <= c.duty[1];
    }
    case 'code':
      return c.must.every((m) => source.includes(m)) && c.mustNot.every((m) => !source.includes(m));
    default:
      throw new Error(`check kind ${c.kind} is not evaluated by this test`);
  }
}

describe('esp32-devkitc content', () => {
  it('has the fixed ids and at least the four progressive lesson levels', () => {
    expect(board.id).toBe('esp32-devkitc');
    expect(board.lab).toBe('board');
    const levels = new Set<string>(board.lessons.map((l) => l.level));
    for (const lv of ['io', 'input', 'analog', 'wireless']) expect(levels.has(lv)).toBe(true);
    expect(board.lessons.map((l) => l.n)).toEqual(board.lessons.map((_, i) => i + 1));
  });

  it('lists all 38 header pins once, with the silkscreen labels in header order', () => {
    const j2 = board.pinout.filter((r) => r.header === 'J2').map((r) => r.label);
    const j3 = board.pinout.filter((r) => r.header === 'J3').map((r) => r.label);
    expect(j2).toEqual(['3V3', 'EN', 'VP', 'VN', '34', '35', '32', '33', '25', '26', '27', '14', '12', 'GND', '13', 'D2', 'D3', 'CMD', '5V']);
    expect(j3).toEqual(['GND', '23', '22', 'TX', 'RX', '21', 'GND', '19', '18', '5', '17', '16', '4', '0', '2', '15', 'D1', 'D0', 'CLK']);
    const keys = board.pinout.map((r) => `${r.header}.${r.pin}`);
    expect(new Set(keys).size).toBe(38);
  });

  it('marks the input-only, strapping and ADC2 pins the way the datasheet does', () => {
    const row = (net: string) => board.pinout.find((r) => r.net === net)!;
    for (const n of ['GPIO34', 'GPIO35', 'GPIO36', 'GPIO39']) {
      expect(row(n).caps).toContain('input-only');
      expect(row(n).caps).not.toContain('pwm');
    }
    for (const n of ['GPIO0', 'GPIO2', 'GPIO5', 'GPIO12', 'GPIO15']) expect(row(n).caps).toContain('strapping');
    for (const n of ['GPIO0', 'GPIO2', 'GPIO4', 'GPIO12', 'GPIO13', 'GPIO14', 'GPIO15', 'GPIO25', 'GPIO26', 'GPIO27']) {
      expect(row(n).functions.some((f) => f.startsWith('ADC2_'))).toBe(true);
    }
    for (const r of board.pinout) if (r.net.startsWith('GPIO')) expect(r.fiveVoltTolerant).toBe(false);
  });

  it('has every designed failure kind the brief asks for', () => {
    const kinds = new Set(board.failures.map((f) => f.kind));
    for (const k of ['reverse-polarity', 'brownout', 'wrong-voltage', 'cold-solder', 'missing-part', 'boot-strap']) expect(kinds.has(k as never)).toBe(true);
    expect(board.failures.some((f) => f.trigger.by === 'remove-part')).toBe(true);
    expect(board.failures.some((f) => f.trigger.by === 'power-input' && f.trigger.input === 'pin3v3' && f.trigger.volts === 5)).toBe(true);
  });

  it('fails the checks when the code or the world is wrong (the checks are not vacuous)', () => {
    const lesson = (id: string) => board.lessons.find((l) => l.id === id)!;
    const failing = (l: Lesson, source: string) => {
      const run = runLesson(l, source);
      return l.checks.filter((c) => !evaluate(c, run, source)).map((c) => c.label);
    };
    const blink = lesson('blink');
    expect(failing(blink, render(blink).replace('LED_PIN = 23', 'LED_PIN = 22'))).toContain('lessons.blink.checks.1');
    const web = lesson('web-switch');
    expect(failing(web, render(web).replace('"robotics"', '"robot1cs"'))).toEqual(expect.arrayContaining(['lessons.web-switch.checks.1', 'lessons.web-switch.checks.2']));
    const button = lesson('boot-button');
    expect(failing({ ...button, world: { ...button.world, script: [] } }, render(button))).toContain('lessons.boot-button.checks.1');
    const fade = lesson('fade');
    expect(failing(fade, render(fade).replace(/ledcWrite\(LED_PIN, maxDuty \* i \/ 50\)/g, 'ledcWrite(LED_PIN, maxDuty)'))).toContain('lessons.fade.checks.1');
  });

  for (const lesson of board.lessons) {
    describe(`lesson ${lesson.n} ${lesson.id}`, () => {
      const source = render(lesson);
      it('compiles for the ESP32 target', () => {
        expect(() => compileSketch(source, new World(getProfile('esp32-devkitc')))).not.toThrow();
      });
      it('passes every check with the starter code on the scripted run', () => {
        const run = runLesson(lesson, source);
        expect(run.error).toBeNull();
        for (const c of lesson.checks) expect({ check: c.label, ok: evaluate(c, run, source) }).toEqual({ check: c.label, ok: true });
      });
      it('prints the sample serial lines', () => {
        const run = runLesson(lesson, source);
        const printed = run.serial.map((s) => s.text);
        for (const want of lesson.serial.sample) {
          if (/[x.]{2,}|\bx\b/.test(want)) continue; // placeholders for addresses and progress dots
          expect(printed).toContain(want);
        }
      });
    });
  }
});
