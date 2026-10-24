import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Check, Lesson, ParamChip, WorldEvent } from '@/content/schema';
import { compileSketch } from '@/lib/interp/arduino/interp';
import { PREEMPT } from '@/lib/interp/exec';
import { getProfile } from '@/lib/interp/profiles';
import { World } from '@/lib/interp/world';
import board from './esp32-s3-devkitc-1';
import en from '../../i18n/content/en/boards/esp32-s3-devkitc-1.json';

const here = dirname(fileURLToPath(import.meta.url));
const figureSrc = readFileSync(resolve(here, '../../../figures/boards/esp32-s3-devkitc-1.js'), 'utf8');

const text = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  if (typeof v !== 'string') throw new Error(`missing text ${key}`);
  return v;
};

const chipCode = (p: ParamChip): string => {
  if (p.kind === 'number') return String(p.default);
  if (p.kind === 'toggle') return p.default ? p.code.on : p.code.off;
  return p.options.find((o) => o.value === p.default)!.code;
};

const render = (lesson: Lesson): string =>
  lesson.code.source
    .replace(/\{\{p:([^}]+)\}\}/g, (_, id: string) => chipCode(lesson.params.find((p) => p.id === id)!))
    .replace(/\{\{t:([^}]+)\}\}/g, (_, key: string) => text(key));

const pinNo = (net: string): number => {
  const m = /^GPIO(\d+)$/.exec(net);
  if (!m) throw new Error(`not a GPIO net: ${net}`);
  return Number(m[1]);
};

/** A deterministic run of one lesson: the world script applied at its times, samples taken where the checks look. */
function runLesson(lesson: Lesson, source: string) {
  const w = new World(getProfile('esp32-s3-devkitc-1'));
  let out = '';
  const lines: { t: number; text: string }[] = [];
  w.serialOut = (chunk) => {
    for (const ch of chunk) {
      if (ch === '\n') { lines.push({ t: w.now / 1000, text: out.replace(/\r$/, '') }); out = ''; } else out += ch;
    }
  };
  const { rt } = compileSketch(source, w);
  rt.initGlobals();
  const g = rt.program();
  let wait = 0;
  let finished = false;
  let error: string | null = null;
  const runTo = (ms: number) => {
    const target = ms * 1000;
    rt.target = target;
    try {
      while (!finished && w.now < target) {
        if (wait > w.now) { rt.advance(Math.min(wait, target)); if (w.now < wait) break; }
        const r = g.next();
        if (r.done) { finished = true; break; }
        if (r.value !== PREEMPT) wait = r.value;
      }
    } catch (e) {
      error = (e as Error).message;
      finished = true;
    }
    if (w.now < target) rt.advance(target);
  };

  const inputs = new Map(lesson.world.inputs.map((i) => [i.id, i]));
  const apply = (ev: WorldEvent) => {
    const inp = inputs.get(ev.input)!;
    if (inp.device.kind === 'button') {
      const n = pinNo(inp.pins[0]);
      const pressed = inp.device.pull.endsWith('up') ? 0 : 1;
      const level = ev.value ? pressed : null;
      w.drive(n, level);
      // contact bounce for bounceMs after the edge
      if (inp.device.bounceMs > 0) {
        w.driveAt(w.now + 1000, n, ev.value ? null : pressed);
        w.driveAt(w.now + Math.min(2000, inp.device.bounceMs * 500), n, level);
      }
    } else if (inp.device.kind === 'network') {
      const [method, path] = inp.device.requests[ev.value].split(' ');
      void w.request(method, path);
    }
  };

  // every time the checks or the script care about, in order
  const sampleAt = new Set<number>([lesson.runMs]);
  for (const c of lesson.checks) {
    if ('atMs' in c) sampleAt.add(c.atMs);
    if (c.kind === 'responds') sampleAt.add(c.after.t + c.withinMs);
  }
  const stops = [...new Set([...sampleAt, ...lesson.world.script.map((e) => e.t)])].sort((a, b) => a - b);
  const samples = new Map<number, { level: Map<number, number>; duty: Map<number, number | null> }>();
  for (const t of stops) {
    runTo(t);
    const level = new Map<number, number>();
    const duty = new Map<number, number | null>();
    for (const [n, p] of w.pins) { level.set(n, w.level(n)); duty.set(n, p.duty); }
    samples.set(t, { level, duty });
    for (const ev of lesson.world.script.filter((e) => e.t === t)) apply(ev);
  }
  return { w, lines, samples, error, endMs: w.now / 1000 };
}

function evaluate(check: Check, source: string, run: ReturnType<typeof runLesson>): boolean {
  switch (check.kind) {
    case 'runs':
      return run.error === null && run.endMs >= check.minMs;
    case 'serial': {
      const re = check.regex ? new RegExp(check.match) : null;
      const hits = run.lines.filter((l) => (re ? re.test(l.text) : l.text.includes(check.match)) && (check.byMs === undefined || l.t <= check.byMs));
      return hits.length >= check.minCount;
    }
    case 'pin-toggles': {
      const n = pinNo(check.pin);
      const rises = run.w.trace.filter(([, pin, lv]) => pin === n && lv === 1).map(([us]) => us / 1000);
      let cycles = 0;
      for (let i = 1; i < rises.length; i++) {
        const p = rises[i] - rises[i - 1];
        if (p >= check.periodMs[0] && p <= check.periodMs[1]) cycles++;
      }
      return cycles >= check.minCycles;
    }
    case 'pwm': {
      const d = run.samples.get(check.atMs)?.duty.get(pinNo(check.pin));
      return d != null && d >= check.duty[0] && d <= check.duty[1];
    }
    case 'responds': {
      const v = run.samples.get(check.after.t + check.withinMs)?.level.get(pinNo(check.pin));
      return v !== undefined && v >= check.v[0] && v <= check.v[1];
    }
    case 'code':
      return check.must.every((s) => source.includes(s)) && check.mustNot.every((s) => !source.includes(s));
    default:
      throw new Error(`check kind ${check.kind} is not evaluated here`);
  }
}

describe('esp32-s3-devkitc-1 lessons', () => {
  it('has the four progressive lessons in order', () => {
    expect(board.lessons.map((l) => [l.n, l.level])).toEqual([[1, 'io'], [2, 'input'], [3, 'analog'], [4, 'wireless']]);
  });

  for (const lesson of board.lessons) {
    it(`${lesson.id}: the starter code compiles and passes every check on the scripted run`, () => {
      const source = render(lesson);
      const run = runLesson(lesson, source);
      expect(run.error).toBeNull();
      for (const check of lesson.checks) expect({ check: check.label, ok: evaluate(check, source, run) }).toEqual({ check: check.label, ok: true });
      // the sample lines the docs show are what the run prints (Wi-Fi's IP is random per seed, so match its shape)
      const printed = run.lines.map((l) => l.text);
      for (const s of lesson.serial.sample) {
        const want = new RegExp('^' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('192\\.168\\.4\\.x', '192\\.168\\.4\\.\\d+'));
        expect(printed.some((p) => want.test(p) || (/^\.+$/.test(s) && p.includes(s)))).toBe(true);
      }
    });
  }

  it('blink on a v1.1 board with the v1.0 pin lights nothing on GPIO38', () => {
    const lesson = board.lessons.find((l) => l.id === 'blink')!;
    const source = render(lesson).replace('RGB_PIN = 38', 'RGB_PIN = 48');
    const run = runLesson(lesson, source);
    expect(run.w.pixels.get(38)).toBeUndefined();
    expect(run.w.pixels.get(48)?.length).toBe(1);
  });
});

describe('esp32-s3-devkitc-1 data matches the figure', () => {
  const arr = (name: string): string[] => {
    const m = new RegExp(`const ${name} = \\[([^\\]]+)\\]`).exec(figureSrc);
    if (!m) throw new Error(`${name} not found in the figure file`);
    return [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
  };

  it('pinout rows follow the figure headers pin by pin', () => {
    for (const [header, nets, labels] of [['J1', arr('J1'), arr('J1L')], ['J3', arr('J3'), arr('J3L')]] as const) {
      const rows = board.pinout.filter((r) => r.header === header);
      expect(rows.map((r) => r.net)).toEqual(nets);
      expect(rows.map((r) => r.label)).toEqual(labels);
      expect(rows.map((r) => r.pin)).toEqual(nets.map((_, i) => String(i + 1)));
    }
  });

  it('every part, control, LED and circuit the content names exists in the figure', () => {
    const ids = new Set([...figureSrc.matchAll(/id: '([A-Z][A-Z0-9]*)'/g)].map((m) => m[1]));
    for (const m of figureSrc.matchAll(/\['(D\d+)', [\d.]+, '/g)) ids.add(m[1]);
    for (const m of figureSrc.matchAll(/chip\('([A-Z]+\d+)'/g)) ids.add(m[1]);
    for (const p of board.figure.parts) expect(ids, p.id).toContain(p.id);
    for (const c of board.controls) expect(ids, c.id).toContain(c.id);
    for (const l of board.leds) expect(ids, l.id).toContain(l.id);
    for (const l of board.lessons) expect(figureSrc, l.id).toMatch(new RegExp(`'?${l.circuit}'?: ledCircuit\\(`));
  });

  it('every failure drives a fault the figure offers or the engine generates', () => {
    const listed = /faults: \[([^\]]+)\]/.exec(figureSrc)![1];
    const own = [...listed.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    const generic = /^(brownout|reverse-polarity:(pin5|pin3)|wrong-voltage:(pin5|pin3):[\d.]+|cold:[A-Z0-9.]+|missing:[A-Z0-9]+)$/;
    for (const f of board.failures) {
      const st = f.figure.type === 'set' ? f.figure.state : {};
      if (typeof st.fault === 'string') expect(own.includes(st.fault) || generic.test(st.fault), f.id).toBe(true);
      if (typeof st.remove === 'string') expect(figureSrc, f.id).toContain(`'${st.remove}'`);
    }
  });

  it('the RGB LED is on GPIO38 for v1.1 and GPIO48 for v1.0, in the figure and the content', () => {
    expect(figureSrc).toContain("net = v10 ? 'GPIO48' : 'GPIO38'");
    expect(board.leds.find((l) => l.id === 'D6')!.drivenBy).toBe('GPIO38');
    expect(board.variants.find((v) => v.id === 'v1.0')!.leds!.find((l) => l.id === 'D6')!.drivenBy).toBe('GPIO48');
    expect(getProfile('esp32-s3-devkitc-1', 'v1.0').leds[0].pin).toBe(48);
  });
});
