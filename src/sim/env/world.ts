import { NS_PER_MS, type SimTime } from "../core/clock.ts";

export const ENV_DEFAULTS = {
  "environment.temperature": 22,
  "environment.pressure": 1013.25,
  "environment.humidity": 45,
  "environment.light": 300,
  "environment.distance": 100,
  "environment.acceleration": 0,
  "environment.magnetic": 0,
} as const;

export type EnvChannel = keyof typeof ENV_DEFAULTS;

export interface WorldInputSpec {
  id: string;
  component: string;
  device: { kind: "registry"; device: string; address?: number } | { kind: "pin"; pins: string[] };
  min: number;
  max: number;
  default: number;
  step?: number;
  quantity: string;
  unit: string;
}

/** `t` is in milliseconds, as in the project file. */
export interface ScriptEntry {
  input: string;
  t: number;
  value: number;
}

export interface WorldDriver {
  valueAt(id: string, tNs: SimTime): number;
  nextChangeAfter(tNs: SimTime): SimTime | null;
  /** Reports every change at or before `tNs` that an earlier call has not reported, in time order. */
  applyDue(tNs: SimTime, sink: (id: string, value: number, atNs: SimTime) => void): void;
  /** A live change (a slider drag): it holds from `atNs` on, like a script entry. */
  set(id: string, value: number, atNs: SimTime): void;
  /** Rewinds to the project's script and drops live changes. */
  reset(): void;
}

export type CreateWorldDriverResult =
  | { ok: true; driver: WorldDriver; warnings: string[] }
  | { ok: false; error: string };

interface Change {
  id: string;
  tNs: SimTime;
  value: number;
}

export const MAX_INPUTS = 64;
export const MAX_SCRIPT_ENTRIES = 10_000;
export const MAX_SCRIPT_MS = 86_400_000;

/** Index of the first change later than `tNs`. */
function upperBound(changes: Change[], tNs: SimTime): number {
  let lo = 0;
  let hi = changes.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (changes[mid].tNs <= tNs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function createWorldDriver(inputs: WorldInputSpec[], script: ScriptEntry[]): CreateWorldDriverResult {
  if (inputs.length > MAX_INPUTS) return { ok: false, error: "too-many-inputs" };
  if (script.length > MAX_SCRIPT_ENTRIES) return { ok: false, error: "script-too-long" };
  const specs = new Map<string, WorldInputSpec>();
  for (const spec of inputs) {
    if (specs.has(spec.id)) return { ok: false, error: "input-duplicate-id" };
    specs.set(spec.id, spec);
  }

  const warnings: string[] = [];
  const clampTo = (spec: WorldInputSpec, value: number): number => {
    const clamped = Math.min(spec.max, Math.max(spec.min, value));
    if (clamped !== value) warnings.push(`script-value-clamped:${spec.id}:${value}`);
    return clamped;
  };

  const initial: Change[] = [];
  for (const entry of script) {
    const spec = specs.get(entry.input);
    if (!spec) return { ok: false, error: "script-unknown-input" };
    if (!Number.isInteger(entry.t) || entry.t < 0 || entry.t > MAX_SCRIPT_MS) return { ok: false, error: "script-bad-time" };
    if (!Number.isFinite(entry.value)) return { ok: false, error: "script-bad-value" };
    initial.push({ id: entry.input, tNs: entry.t * NS_PER_MS, value: clampTo(spec, entry.value) });
  }
  initial.sort((a, b) => a.tNs - b.tNs);

  let timeline: Change[] = [];
  let perInput = new Map<string, Change[]>();
  let cursor = 0;

  const insert = (change: Change) => {
    timeline.splice(upperBound(timeline, change.tNs), 0, change);
    const series = perInput.get(change.id) as Change[];
    series.splice(upperBound(series, change.tNs), 0, change);
  };

  const reset = () => {
    timeline = initial.slice();
    perInput = new Map([...specs.keys()].map((id) => [id, [] as Change[]]));
    for (const change of timeline) (perInput.get(change.id) as Change[]).push(change);
    cursor = 0;
  };
  reset();

  const driver: WorldDriver = {
    valueAt(id, tNs) {
      const spec = specs.get(id);
      if (!spec) return Number.NaN;
      const series = perInput.get(id) as Change[];
      const i = upperBound(series, tNs);
      return i === 0 ? spec.default : series[i - 1].value;
    },
    nextChangeAfter(tNs) {
      const i = upperBound(timeline, tNs);
      return i < timeline.length ? timeline[i].tNs : null;
    },
    applyDue(tNs, sink) {
      while (cursor < timeline.length && timeline[cursor].tNs <= tNs) {
        const change = timeline[cursor++];
        sink(change.id, change.value, change.tNs);
      }
    },
    set(id, value, atNs) {
      const spec = specs.get(id);
      if (!spec) return;
      const at = upperBound(timeline, atNs);
      insert({ id, tNs: atNs, value: Math.min(spec.max, Math.max(spec.min, value)) });
      if (at < cursor) cursor++;
    },
    reset,
  };
  return { ok: true, driver, warnings };
}
