// The one evaluator for content checks (schema `Check`) on a RunTrace. Board Lab lessons, Robotics
// practice tasks, the content tests and server-side verification all call `evaluateChecks`, so a
// check means the same thing everywhere. Pure: the same trace and source give the same verdicts (D14c).

import type { Check, PinMode, RunTrace, StateCond } from '@/content/schema';
import { getProfile, resolvePin, type BoardId } from './profiles';
import { pinNet } from './pins';

export interface CheckResult {
  ok: boolean;
  /** A count or measurement for the checks panel ("3", "2/5"). */
  detail?: string;
}

export interface CheckContext {
  /** The source the trace ran; `code` checks read it with comments removed. */
  source: string;
  /** The live figure state, for `state` checks (merged over the trace's figure patches). */
  figure?: Record<string, unknown>;
  /** Lets a check name a pin another way ("13", "LED_BUILTIN") than the trace's net names. */
  board?: string;
  variant?: string | null;
  nets?: Record<number, string>;
}

type PinEvent = RunTrace['pins'][string][number];

/** Arduino Servo library defaults: 544 µs = 0°, 2400 µs = 180°. */
export const servoDegrees = (us: number) => Math.round(((us - 544) / (2400 - 544)) * 180);

const inRange = (x: number, [lo, hi]: readonly [number, number]) => x >= lo && x <= hi;

/** The pin's last recorded sample at or before `t`. */
export function sampleAt(events: readonly PinEvent[] | undefined, t: number): PinEvent | undefined {
  let found: PinEvent | undefined;
  for (const e of events ?? []) {
    if (e.t > t) break;
    found = e;
  }
  return found;
}

/** Times at which a driven pin went from low to high. */
export function risingEdges(events: readonly PinEvent[] | undefined): number[] {
  const out: number[] = [];
  // Pins start low out of reset, so a first HIGH is a rising edge.
  let last = 0;
  for (const e of events ?? []) {
    if (e.mode !== 'out' && e.mode !== 'pwm') continue;
    const level = e.v >= 0.5 ? 1 : 0;
    if (last === 0 && level === 1) out.push(e.t);
    last = level;
  }
  return out;
}

function lookup(state: Record<string, unknown>, path: string): unknown {
  if (path in state) return state[path];
  let node: unknown = state;
  for (const part of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

export function stateMatches(state: Record<string, unknown>, cond: StateCond): boolean {
  return Object.entries(cond).every(([path, want]) => want === undefined || lookup(state, path) === want);
}

/** The code without comments: C/C++ `//` and block comments, Python `#` comments (not #include/#define). */
export function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/(^|\s)#(?!\s*(?:include|define|if|endif|else|pragma)\b)[^\n]*/g, '$1 ');
}

function serialMatches(text: string, match: string, regex: boolean): boolean {
  if (!regex) return text.includes(match);
  try {
    return new RegExp(match).test(text);
  } catch {
    return false;
  }
}

function figureStateAt(trace: RunTrace, atMs: number, live?: Record<string, unknown>): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const patch of trace.figure) if (patch.t <= atMs) Object.assign(state, patch.state);
  return live ? { ...state, ...live } : state;
}

function modeMatches(got: PinMode, want: PinMode): boolean {
  return got === want || (want === 'out' && got === 'pwm') || (want === 'pwm' && got === 'out');
}

/** Finds a check's pin in the trace, whichever name the check uses for it. */
function pinEvents(trace: RunTrace, pin: string, ctx: CheckContext): PinEvent[] | undefined {
  const direct = trace.pins[pin];
  if (direct || !ctx.board) return direct;
  let profile;
  try {
    profile = getProfile(ctx.board as BoardId, ctx.variant ?? undefined);
  } catch {
    return undefined;
  }
  const m = /^(?:D|GP|GPIO|P|IO)?(\d+)$/.exec(pin.trim());
  const n = resolvePin(profile, pin) ?? (m ? Number(m[1]) : undefined);
  if (n === undefined) return undefined;
  return trace.pins[pinNet(profile, n, ctx.nets)] ?? trace.pins[String(n)];
}

/**
 * One check.
 * - `pin-toggles`: periodMs is the full period, rising edge to rising edge (Blink with delay(500)
 *   has a 1000 ms period); minCycles counts periods inside the range.
 * - `pwm`: a pin driven fully low or high counts as duty 0 or 1 (analogWrite(255) and duty_u16(65535)
 *   switch the pin to a plain output, as the real cores do).
 * - `responds`: the pin reaches the wanted mode/value within withinMs of the event, or already held it.
 */
export function evaluateCheck(check: Check, trace: RunTrace, ctx: CheckContext): CheckResult {
  switch (check.kind) {
    case 'runs':
      return { ok: trace.error === null && trace.ms >= check.minMs };
    case 'serial': {
      const n = trace.serial.filter((l) => (check.byMs === undefined || l.t <= check.byMs) && serialMatches(l.text, check.match, check.regex)).length;
      return { ok: n >= check.minCount, detail: `${n}/${check.minCount}` };
    }
    case 'pin-level': {
      const e = sampleAt(pinEvents(trace, check.pin, ctx), check.atMs);
      return { ok: !!e && (e.v >= 0.5 ? 1 : 0) === check.level };
    }
    case 'pin-toggles': {
      const rises = risingEdges(pinEvents(trace, check.pin, ctx));
      let cycles = 0;
      for (let i = 1; i < rises.length; i++) if (inRange(rises[i] - rises[i - 1], check.periodMs)) cycles++;
      return { ok: cycles >= check.minCycles, detail: `${cycles}/${check.minCycles}` };
    }
    case 'pwm': {
      const e = sampleAt(pinEvents(trace, check.pin, ctx), check.atMs);
      return { ok: !!e && (e.mode === 'pwm' || e.mode === 'out') && inRange(e.v, check.duty), detail: e ? String(Math.round(e.v * 1000) / 1000) : undefined };
    }
    case 'tone': {
      const e = sampleAt(pinEvents(trace, check.pin, ctx), check.atMs);
      return { ok: !!e && e.mode === 'tone' && inRange(e.v, check.hz) };
    }
    case 'servo': {
      const e = sampleAt(pinEvents(trace, check.pin, ctx), check.atMs);
      return { ok: !!e && e.mode === 'servo' && inRange(e.v, check.deg) };
    }
    case 'responds': {
      const from = check.after.t;
      const events = pinEvents(trace, check.pin, ctx) ?? [];
      const hit = events.some((e) => e.t >= from && e.t <= from + check.withinMs && modeMatches(e.mode, check.mode) && inRange(e.v, check.v));
      const before = sampleAt(events, from);
      const held = !!before && modeMatches(before.mode, check.mode) && inRange(before.v, check.v) && !events.some((e) => e.t > from && e.t <= from + check.withinMs);
      return { ok: hit || held };
    }
    case 'code': {
      const code = codeOnly(ctx.source);
      return { ok: check.must.every((m) => code.includes(m)) && check.mustNot.every((m) => !code.includes(m)) };
    }
    case 'state':
      return { ok: stateMatches(figureStateAt(trace, check.atMs, ctx.figure), check.equals) };
  }
}

type WithoutLabel<T> = T extends unknown ? Omit<T, 'label'> : never;

/** A check as a project stores it: a catalogue `Check` whose label may be inline text, plus the two analog kinds. */
export type EvaluableCheck = (WithoutLabel<Check> & { label?: unknown }) | { kind: 'node-voltage' | 'supply-current' };

/** One check of a project's own tests. The analog kinds need the circuit solver, so here they never pass. */
export function evaluateProjectCheck(check: EvaluableCheck, trace: RunTrace, ctx: CheckContext): CheckResult {
  if (check.kind === 'node-voltage' || check.kind === 'supply-current') return { ok: false, detail: 'needs-analog' };
  return evaluateCheck({ ...check, label: '' } as Check, trace, ctx);
}

export function evaluateChecks(checks: readonly Check[], trace: RunTrace, ctx: CheckContext): CheckResult[] {
  return checks.map((c) => evaluateCheck(c, trace, ctx));
}
