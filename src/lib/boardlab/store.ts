// The Board Lab page store (D14b). Every change goes through dispatch(action),
// so rooms, replays and the AI lab partner can watch and drive the same lab.
// The reducer is pure; side effects (the interpreter, the figure) live in
// run.ts and subscribe to the store.

import type { LabStore } from '@/components/dock/types';
import type { FailureMode, Language, ParamChip, Sheet } from '@/content/schema';
import type { PinSample, RunError } from './engine';
import { applyChip, mapChips, normalizeParams, renderTemplate, setParam, type ChipRange, type ParamValue, type ParamValues } from './template';

export type RunStatus = 'stopped' | 'compiling' | 'uploading' | 'running';
export type SerialKind = 'sys' | 'out' | 'in' | 'err' | 'note';
export type BoardView = Exclude<Sheet, 'wiring'>;

export interface SerialLine {
  id: number;
  kind: SerialKind;
  text: string;
  /** Virtual time of the line in ms (null for lab messages). */
  t: number | null;
  /** System messages are message ids with parameters, translated when shown. */
  params?: Record<string, string | number>;
}

export interface CheckResult {
  ok: boolean;
  detail?: string;
}

export interface BoardLabState {
  board: string;
  /** null on the board overview page. */
  lesson: string | null;
  variant: string | null;
  language: Language;
  /** The lesson template with {{t:}} resolved and {{p:}} slots left in. */
  template: string;
  params: ParamChip[];
  values: ParamValues;
  code: string;
  chips: ChipRange[];
  /** The learner typed in the editor (Reset puts the lesson code back). */
  edited: boolean;
  run: {
    status: RunStatus;
    /** Bumped by every Run, so a stale upload can tell it was cancelled. */
    id: number;
    error: RunError | null;
    /** Virtual ms since the program started. */
    vt: number;
  };
  serial: { lines: SerialLine[]; baud: number; sketchBaud: number; next: number };
  pins: Record<string, PinSample>;
  /** World input values by WorldInput.id. */
  inputs: Record<string, number>;
  view: BoardView;
  exploded: boolean;
  selected: string | null;
  /** Power source key in the figure (null = unplugged). */
  power: string | null;
  /** The FailureMode currently triggered. */
  fault: string | null;
  /** The figure's last `state` report. */
  figure: Record<string, unknown>;
  /** `progress` is the share of the run's virtual time done (0..1); `limit` = the run hit its 20 s budget. */
  checks: { status: 'idle' | 'running' | 'done'; results: CheckResult[]; passed: boolean; progress?: number; limit?: boolean };
  /** Assembly steps done, in order (a step stays done once its condition held). */
  assembly: string[];
}

export type BoardLabAction =
  | { type: 'code/replace'; code: string }
  | { type: 'code/reset' }
  | { type: 'param/set'; id: string; value: ParamValue }
  | { type: 'run/start' }
  | { type: 'run/stop' }
  | { type: 'run/phase'; id: number; status: RunStatus }
  | { type: 'run/error'; id: number; error: RunError }
  | { type: 'run/tick'; id: number; vt: number; pins: Record<string, PinSample> }
  | { type: 'serial/append'; lines: Omit<SerialLine, 'id'>[] }
  | { type: 'serial/send'; text: string }
  | { type: 'serial/clear' }
  | { type: 'serial/baud'; baud: number }
  | { type: 'serial/sketch-baud'; baud: number }
  | { type: 'input/set'; id: string; value: number }
  /** A phone on the Wi-Fi sends the network input's requests[value] now. */
  | { type: 'input/request'; id: string; value: number }
  | { type: 'view/set'; view: BoardView }
  | { type: 'exploded/set'; on: boolean }
  | { type: 'part/select'; id: string | null }
  | { type: 'power/set'; source: string | null }
  | { type: 'fault/trigger'; id: string }
  | { type: 'fault/clear' }
  | { type: 'variant/set'; id: string }
  | { type: 'figure/state'; state: Record<string, unknown> }
  | { type: 'checks/start' }
  | { type: 'checks/progress'; fraction: number }
  | { type: 'checks/result'; results: CheckResult[]; limit?: boolean }
  | { type: 'assembly/done'; id: string }
  | { type: 'assembly/reset' }
  /** A room hands a joiner the host's state (src/lib/realtime/store-sync.ts). */
  | { type: 'sync/hydrate'; state: unknown };

/** The serial monitor keeps this many lines (the original kept 40). */
export const SERIAL_KEEP = 200;

export interface InitOptions {
  board: string;
  lesson: string | null;
  variant?: string | null;
  language: Language;
  template?: string;
  params?: ParamChip[];
  savedValues?: unknown;
  inputs?: Record<string, number>;
  baud?: number;
  view?: BoardView;
  power?: string | null;
}

export function initialState(o: InitOptions): BoardLabState {
  const params = o.params ?? [];
  const values = normalizeParams(params, o.savedValues);
  const { code, chips } = renderTemplate(o.template ?? '', params, values);
  return {
    board: o.board,
    lesson: o.lesson,
    variant: o.variant ?? null,
    language: o.language,
    template: o.template ?? '',
    params,
    values,
    code,
    chips,
    edited: false,
    run: { status: 'stopped', id: 0, error: null, vt: 0 },
    serial: { lines: [], baud: o.baud ?? 9600, sketchBaud: 0, next: 1 },
    pins: {},
    inputs: o.inputs ?? {},
    view: o.view ?? 'board',
    exploded: false,
    selected: null,
    power: o.power === undefined ? 'usb' : o.power,
    fault: null,
    figure: {},
    checks: { status: 'idle', results: [], passed: false, progress: 0, limit: false },
    assembly: [],
  };
}

function appendLines(s: BoardLabState, lines: Omit<SerialLine, 'id'>[]): BoardLabState['serial'] {
  if (!lines.length) return s.serial;
  let next = s.serial.next;
  const added = lines.map((l) => ({ ...l, id: next++ }));
  const all = s.serial.lines.concat(added);
  return { ...s.serial, lines: all.length > SERIAL_KEEP ? all.slice(all.length - SERIAL_KEEP) : all, next };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const VIEWS = new Set<string>(['board', 'breadboard', 'schematic', 'power']);
const orNull = (value: unknown, fallback: string | null) => (value === null || typeof value === 'string' ? value : fallback);

/**
 * Takes what a room shares from another screen's state on the same lesson:
 * the code, chips, variant, power, fault, world inputs, view and assembly.
 * Run status, pins, serial lines, check results and the figure report stay
 * this screen's own (its interpreter makes them). Anything malformed keeps
 * this screen's value.
 */
function hydrate(s: BoardLabState, raw: unknown): BoardLabState {
  if (!isRecord(raw) || raw.board !== s.board || raw.lesson !== s.lesson) return s;
  const values = normalizeParams(s.params, raw.values);
  let { code, chips } = renderTemplate(s.template, s.params, values);
  const edited = raw.edited === true && typeof raw.code === 'string';
  if (edited) {
    code = raw.code as string;
    const ids = new Set(s.params.map((p) => p.id));
    chips = (Array.isArray(raw.chips) ? raw.chips : []).filter(
      (c): c is ChipRange => isRecord(c) && ids.has(c.id as string) && typeof c.from === 'number' && typeof c.to === 'number' && c.from >= 0 && c.from <= c.to && c.to <= code.length,
    );
  }
  const inputs = { ...s.inputs };
  if (isRecord(raw.inputs)) for (const [id, value] of Object.entries(raw.inputs)) if (typeof value === 'number' && Number.isFinite(value)) inputs[id] = value;
  const baud = isRecord(raw.serial) && typeof raw.serial.baud === 'number' ? raw.serial.baud : s.serial.baud;
  return {
    ...s,
    variant: orNull(raw.variant, s.variant),
    values,
    code,
    chips,
    edited,
    serial: { ...s.serial, baud },
    inputs,
    view: typeof raw.view === 'string' && VIEWS.has(raw.view) ? (raw.view as BoardView) : s.view,
    exploded: typeof raw.exploded === 'boolean' ? raw.exploded : s.exploded,
    selected: orNull(raw.selected, s.selected),
    power: orNull(raw.power, s.power),
    fault: orNull(raw.fault, s.fault),
    assembly: Array.isArray(raw.assembly) ? raw.assembly.filter((id): id is string => typeof id === 'string') : s.assembly,
  };
}

const sameFlat = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => a[k] === b[k]);
};

export function reducer(s: BoardLabState, a: BoardLabAction): BoardLabState {
  switch (a.type) {
    case 'code/replace': {
      if (a.code === s.code) return s;
      return { ...s, code: a.code, chips: mapChips(s.chips, s.code, a.code), edited: true };
    }
    case 'code/reset': {
      const { code, chips } = renderTemplate(s.template, s.params, s.values);
      return { ...s, code, chips, edited: false, run: { ...s.run, error: null } };
    }
    case 'param/set': {
      const values = setParam(s.params, s.values, a.id, a.value);
      if (sameFlat(values, s.values)) return s;
      if (!s.edited) {
        const { code, chips } = renderTemplate(s.template, s.params, values);
        return { ...s, values, code, chips };
      }
      let code = s.code;
      let chips = s.chips;
      for (const chip of s.params) {
        if (values[chip.id] === s.values[chip.id]) continue;
        ({ code, chips } = applyChip(code, chips, chip, values[chip.id]));
      }
      return { ...s, values, code, chips };
    }
    case 'run/start': {
      if (s.run.status !== 'stopped') return s;
      return {
        ...s,
        run: { status: 'compiling', id: s.run.id + 1, error: null, vt: 0 },
        serial: { ...s.serial, lines: [], sketchBaud: 0 },
        pins: {},
        checks: { status: 'idle', results: [], passed: false, progress: 0, limit: false },
      };
    }
    case 'run/stop': {
      if (s.run.status === 'stopped') return s;
      return { ...s, run: { ...s.run, status: 'stopped' }, pins: {} };
    }
    case 'run/phase': {
      if (a.id !== s.run.id || s.run.status === 'stopped') return s;
      return { ...s, run: { ...s.run, status: a.status } };
    }
    case 'run/error': {
      if (a.id !== s.run.id) return s;
      return { ...s, run: { ...s.run, status: 'stopped', error: a.error }, pins: {} };
    }
    case 'run/tick': {
      if (a.id !== s.run.id || s.run.status !== 'running') return s;
      return { ...s, run: { ...s.run, vt: a.vt }, pins: a.pins };
    }
    case 'serial/append':
      return { ...s, serial: appendLines(s, a.lines) };
    case 'serial/send': {
      if (!a.text) return s;
      return { ...s, serial: appendLines(s, [{ kind: 'in', text: a.text, t: s.run.status === 'running' ? s.run.vt : null }]) };
    }
    case 'serial/clear':
      return { ...s, serial: { ...s.serial, lines: [] } };
    case 'serial/baud':
      return a.baud === s.serial.baud ? s : { ...s, serial: { ...s.serial, baud: a.baud } };
    case 'serial/sketch-baud':
      return a.baud === s.serial.sketchBaud ? s : { ...s, serial: { ...s.serial, sketchBaud: a.baud } };
    case 'input/set':
      return s.inputs[a.id] === a.value ? s : { ...s, inputs: { ...s.inputs, [a.id]: a.value } };
    case 'input/request':
      // Every press is a new request, even the same one twice.
      return { ...s, inputs: { ...s.inputs, [a.id]: a.value } };
    case 'view/set':
      return a.view === s.view ? s : { ...s, view: a.view };
    case 'exploded/set':
      return a.on === s.exploded ? s : { ...s, exploded: a.on };
    case 'part/select':
      return a.id === s.selected ? s : { ...s, selected: a.id };
    case 'power/set':
      return a.source === s.power ? s : { ...s, power: a.source };
    case 'fault/trigger':
      return a.id === s.fault ? s : { ...s, fault: a.id };
    case 'fault/clear':
      return s.fault === null ? s : { ...s, fault: null };
    case 'variant/set':
      return a.id === s.variant ? s : { ...s, variant: a.id };
    case 'figure/state': {
      const selected = typeof a.state.selected === 'string' || a.state.selected === null ? (a.state.selected as string | null) : s.selected;
      return { ...s, figure: a.state, selected };
    }
    case 'checks/start':
      return { ...s, checks: { status: 'running', results: [], passed: false, progress: 0, limit: false } };
    case 'checks/progress': {
      const progress = Math.min(1, Math.max(0, Math.round(a.fraction * 100) / 100));
      return s.checks.status !== 'running' || progress === s.checks.progress ? s : { ...s, checks: { ...s.checks, progress } };
    }
    case 'checks/result':
      return { ...s, checks: { status: 'done', results: a.results, passed: a.results.length > 0 && a.results.every((r) => r.ok), progress: 1, limit: !!a.limit } };
    case 'assembly/done':
      return s.assembly.includes(a.id) ? s : { ...s, assembly: [...s.assembly, a.id] };
    case 'assembly/reset':
      return s.assembly.length === 0 ? s : { ...s, assembly: [] };
    case 'sync/hydrate':
      return hydrate(s, a.state);
  }
}

export type BoardLabStore = LabStore<BoardLabState, BoardLabAction> & {
  /** Observe every action after it is applied (replays, rooms). */
  onAction(listener: (action: BoardLabAction, state: BoardLabState) => void): () => void;
};

export function createBoardLabStore(init: BoardLabState): BoardLabStore {
  let state = init;
  const listeners = new Set<() => void>();
  const actionListeners = new Set<(action: BoardLabAction, state: BoardLabState) => void>();
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(action) {
      const next = reducer(state, action);
      if (next === state) return;
      state = next;
      for (const l of actionListeners) l(action, state);
      for (const l of listeners) l();
    },
    onAction(listener) {
      actionListeners.add(listener);
      return () => actionListeners.delete(listener);
    },
  };
}

/** The pitches a running sketch's tone() calls hold, by net. */
export function sketchTones(pins: Record<string, PinSample>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [net, pin] of Object.entries(pins)) if (pin.hz && pin.hz > 0) out[net] = pin.hz;
  return out;
}

/** The figure state the store implies, sent as FigureFrame's `initial` after every `ready`. */
export function figureState(s: BoardLabState, opts: { circuit: string | null; failures: FailureMode[] }): Record<string, unknown> {
  const out: Record<string, unknown> = {
    view: s.view,
    exploded: s.exploded,
    circuit: opts.circuit,
    power: s.power,
    select: s.selected,
  };
  if (s.variant) out.variant = s.variant;
  const params: Record<string, Record<string, unknown>> = {};
  for (const chip of s.params) {
    if (!chip.figure) continue;
    const value = s.values[chip.id];
    const figValue = chip.kind === 'choice' ? (chip.options.find((o) => o.value === value)?.figureValue ?? value) : value;
    (params[chip.figure.part] ??= {})[chip.figure.key] = figValue;
  }
  if (Object.keys(params).length) out.params = params;
  // The figure solves a buzzer from these; {} once the last one stops.
  out.tones = sketchTones(s.pins);
  const failure = s.fault ? opts.failures.find((f) => f.id === s.fault) : undefined;
  if (failure && failure.figure.type === 'set') Object.assign(out, failure.figure.state);
  else out.fault = null;
  return out;
}

/**
 * The `set` patch that takes the figure from `prev` to `next` (two figureState results): the keys whose
 * values changed. A fault always travels with the power it needs, because the bench engine applies one
 * patch as unplug, change, plug back in: `{ fault: 'missing:Y2' }` alone would leave the board unplugged.
 */
export function figurePatch(prev: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next)) if (JSON.stringify(prev[k]) !== JSON.stringify(v)) out[k] = v;
  if ('fault' in out && 'power' in next) out.power = next.power;
  return out;
}
