// Lesson checks evaluated on a deterministic run (D14c): the same source, world
// script and run length always give the same verdicts, so a server can re-run
// and verify a completion.

import type { Check, PinMode, RunTrace, StateCond } from '@/content/schema';
import type { CheckResult } from './store';

type PinEvent = RunTrace['pins'][string][number];

/** Arduino Servo library defaults: 544 µs = 0°, 2400 µs = 180°. */
export const servoDegrees = (us: number) => Math.round(((us - 544) / (2400 - 544)) * 180);

/** The pin's last recorded sample at or before `t`. */
export function sampleAt(trace: RunTrace, pin: string, t: number): PinEvent | undefined {
  const events = trace.pins[pin];
  if (!events?.length) return undefined;
  let found: PinEvent | undefined;
  for (const e of events) {
    if (e.t > t) break;
    found = e;
  }
  return found;
}

/** Times at which a digital output changed level. */
function edges(trace: RunTrace, pin: string): number[] {
  const events = trace.pins[pin] ?? [];
  const out: number[] = [];
  let last: number | null = null;
  for (const e of events) {
    if (e.mode !== 'out' && e.mode !== 'pwm') continue;
    const level = e.v >= 0.5 ? 1 : 0;
    if (last !== null && level !== last) out.push(e.t);
    last = level;
  }
  return out;
}

function lookup(state: Record<string, unknown>, path: string): unknown {
  let node: unknown = state;
  for (const part of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

export function stateMatches(state: Record<string, unknown>, cond: StateCond): boolean {
  return Object.entries(cond).every(([path, want]) => lookup(state, path) === want);
}

/** Strip // and block comments so a `code` check reads only real code. */
function codeOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ').replace(/^\s*#(?!include)[^\n]*/gm, ' ');
}

const inRange = (x: number, [lo, hi]: [number, number]) => x >= lo && x <= hi;

/**
 * One check. `pin-toggles` reads periodMs as the time between two successive
 * toggles (Blink at delay(1000) toggles every 1000 ms) and minCycles as full
 * on/off cycles, two toggles each.
 */
export function evaluateCheck(check: Check, trace: RunTrace, ctx: { source: string; figure?: Record<string, unknown> }): CheckResult {
  switch (check.kind) {
    case 'runs':
      return { ok: trace.error === null && trace.ms >= check.minMs };
    case 'serial': {
      const re = check.regex ? new RegExp(check.match) : null;
      const n = trace.serial.filter((l) => (check.byMs === undefined || l.t <= check.byMs) && (re ? re.test(l.text) : l.text.includes(check.match))).length;
      return { ok: n >= check.minCount, detail: String(n) };
    }
    case 'pin-level': {
      const e = sampleAt(trace, check.pin, check.atMs);
      return { ok: !!e && (e.v >= 0.5 ? 1 : 0) === check.level };
    }
    case 'pin-toggles': {
      const ts = edges(trace, check.pin);
      let good = 0;
      for (let i = 1; i < ts.length; i++) if (inRange(ts[i] - ts[i - 1], check.periodMs)) good++;
      // `good` intervals need good + 1 toggles; a full cycle is two toggles.
      const cycles = Math.floor((good + 1) / 2);
      return { ok: ts.length > 1 && cycles >= check.minCycles, detail: String(cycles) };
    }
    case 'pwm': {
      const e = sampleAt(trace, check.pin, check.atMs);
      return { ok: !!e && e.mode === 'pwm' && inRange(e.v, check.duty) };
    }
    case 'tone': {
      const e = sampleAt(trace, check.pin, check.atMs);
      return { ok: !!e && e.mode === 'tone' && inRange(e.v, check.hz) };
    }
    case 'servo': {
      const e = sampleAt(trace, check.pin, check.atMs);
      return { ok: !!e && e.mode === 'servo' && inRange(e.v, check.deg) };
    }
    case 'responds': {
      const from = check.after.t;
      const events = trace.pins[check.pin] ?? [];
      const hit = events.some((e) => e.t >= from && e.t <= from + check.withinMs && modeMatches(e.mode, check.mode) && inRange(e.v, check.v));
      // A level that already held when the event came and still holds counts too.
      const before = sampleAt(trace, check.pin, from);
      const held = !!before && modeMatches(before.mode, check.mode) && inRange(before.v, check.v) && !events.some((e) => e.t > from && e.t <= from + check.withinMs);
      return { ok: hit || held };
    }
    case 'code': {
      const code = codeOnly(ctx.source);
      return { ok: check.must.every((m) => code.includes(m)) && check.mustNot.every((m) => !code.includes(m)) };
    }
    case 'state':
      return { ok: !!ctx.figure && stateMatches(ctx.figure, check.equals) };
  }
}

function modeMatches(got: PinMode, want: PinMode): boolean {
  return got === want || (want === 'out' && got === 'pwm');
}

export function evaluateChecks(checks: Check[], trace: RunTrace, ctx: { source: string; figure?: Record<string, unknown> }): CheckResult[] {
  return checks.map((c) => evaluateCheck(c, trace, ctx));
}
