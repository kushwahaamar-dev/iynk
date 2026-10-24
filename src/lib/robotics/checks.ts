// Practice-task checks evaluated on a RunTrace (schema `Check`). Pure: the same trace and source
// always give the same results, so a server can re-check a task (D14c). Defer to
// src/lib/interp/checks.ts once it exists (docs/requests/ui-robotics.md).

import type { Check, PinMode, RunTrace } from "@/content/schema";
import type { CheckResult } from "./runner";
import { condHolds } from "./state";

type Entry = RunTrace["pins"][string][number];

/** `resolve` maps a check's pin name ("D9") to the trace key the run used ("9"). */
export type PinResolver = (pin: string) => string;

function entryAt(entries: readonly Entry[] | undefined, atMs: number, modes?: readonly PinMode[]): Entry | undefined {
  let found: Entry | undefined;
  for (const entry of entries ?? []) {
    if (entry.t > atMs) break;
    if (!modes || modes.includes(entry.mode)) found = entry;
  }
  return found;
}

const within = (v: number, [lo, hi]: readonly [number, number]) => v >= lo && v <= hi;

function serialMatches(text: string, match: string, regex: boolean): boolean {
  if (!regex) return text.includes(match);
  try {
    return new RegExp(match).test(text);
  } catch {
    return false;
  }
}

function figureStateAt(trace: RunTrace, atMs: number): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const patch of trace.figure) if (patch.t <= atMs) Object.assign(state, patch.state);
  return state;
}

export function evaluateCheck(check: Check, trace: RunTrace, source: string, resolve: PinResolver): CheckResult {
  const pins = (pin: string) => trace.pins[resolve(pin)] ?? trace.pins[pin];
  switch (check.kind) {
    case "runs":
      return { pass: trace.error === null && trace.ms >= check.minMs };
    case "serial": {
      const lines = trace.serial.filter((line) => check.byMs === undefined || line.t <= check.byMs);
      const count = lines.filter((line) => serialMatches(line.text, check.match, check.regex)).length;
      return { pass: count >= check.minCount, detail: `${count}/${check.minCount}` };
    }
    case "pin-level": {
      const entry = entryAt(pins(check.pin), check.atMs, ["out", "in"]);
      return { pass: (entry?.v ?? 0) === check.level };
    }
    case "pin-toggles": {
      const rising = (pins(check.pin) ?? []).filter((e, i, all) => e.v === 1 && (i === 0 || all[i - 1].v === 0)).map((e) => e.t);
      let cycles = 0;
      for (let i = 1; i < rising.length; i += 1) if (within(rising[i] - rising[i - 1], check.periodMs)) cycles += 1;
      return { pass: cycles >= check.minCycles, detail: `${cycles}/${check.minCycles}` };
    }
    case "pwm": {
      const entry = entryAt(pins(check.pin), check.atMs, ["pwm"]);
      return { pass: entry !== undefined && within(entry.v, check.duty) };
    }
    case "tone": {
      const entry = entryAt(pins(check.pin), check.atMs, ["tone"]);
      return { pass: entry !== undefined && within(entry.v, check.hz) };
    }
    case "servo": {
      const entry = entryAt(pins(check.pin), check.atMs, ["servo"]);
      return { pass: entry !== undefined && within(entry.v, check.deg) };
    }
    case "responds": {
      const start = check.after.t;
      const hit = (pins(check.pin) ?? []).some(
        (e) => e.t >= start && e.t <= start + check.withinMs && e.mode === check.mode && within(e.v, check.v),
      );
      return { pass: hit && trace.inputs.some((e) => e.input === check.after.input && e.t === check.after.t) };
    }
    case "code": {
      // Comments do not count: C++ // and /* */, Python "# ..." (not #include or #define).
      const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/(^|\s)#\s.*$/gm, "$1");
      return { pass: check.must.every((needle) => code.includes(needle)) && check.mustNot.every((needle) => !code.includes(needle)) };
    }
    case "state":
      return { pass: condHolds(check.equals, figureStateAt(trace, check.atMs)) };
  }
}

export function evaluateChecks(checks: readonly Check[], trace: RunTrace, source: string, resolve: PinResolver): CheckResult[] {
  return checks.map((check) => evaluateCheck(check, trace, source, resolve));
}
