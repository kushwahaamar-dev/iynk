// The deterministic check run (D14c). One source, one board, one world script and one run length
// always give the same RunTrace, so Board Lab, Robotics, the content tests and a verifying server
// agree on what a program did. Pair it with `evaluateChecks` (./checks).

import type { Language as ContentLanguage, PinMode, RunTrace, WorldInput, WorldModel } from '@/content/schema';
import { WorldBinding, runOptionsFor, type HttpExchange } from './lesson-world';
import { netResolver, pinNet } from './pins';
import { getProfile, type BoardId, type BoardProfile, type Language } from './profiles';
import { createRun, type Run } from './run';
import type { PinView, World } from './world';

export const INTERP_LANGUAGE: Record<ContentLanguage, Language> = {
  'arduino-cpp': 'arduino',
  micropython: 'python',
  python: 'python',
  verilog: 'verilog',
};

export interface HeadlessOptions {
  board: string;
  /** Board variant id ('wifi', 'pico-w', 'v1.0', 'pi5'...); null or omitted = the default. */
  variant?: string | null;
  language: ContentLanguage;
  source: string;
  world: WorldModel;
  runMs: number;
  /** I/O level for pots and dividers; defaults to the board profile's. */
  logicV?: number;
  /** Pin number -> net name overrides from the board's pinout. */
  nets?: Record<number, string>;
  /** Verilog: top-level port -> board nets, bit 0 first. */
  ports?: Record<string, string[]>;
  /** Verilog parameter overrides for the top module. */
  params?: Record<string, number>;
  /** Called every 250 virtual ms with the simulated time reached. */
  onProgress?: (doneMs: number, runMs: number) => void;
  /** Wall-clock budget in ms; a run that takes longer stops with a `limit` error. */
  budgetMs?: number;
}

export const LIMIT_MESSAGE = 'limit: the check run took too long';

/** Arduino Servo library defaults: 544 µs = 0°, 2400 µs = 180°. */
const servoDegrees = (us: number) => Math.round(((us - 544) / (2400 - 544)) * 180);

function sample(view: PinView): { mode: PinMode; v: number } {
  if (view.servoUs) return { mode: 'servo', v: servoDegrees(view.servoUs) };
  if (view.hz) return { mode: 'tone', v: view.hz };
  if (view.duty !== undefined) return { mode: 'pwm', v: view.duty };
  if (view.mode === 'output' || view.mode === 'open_drain') return { mode: 'out', v: view.level };
  if (view.volts !== undefined && view.volts !== null) return { mode: 'analog', v: view.volts };
  return { mode: view.mode === 'input_pullup' ? 'pullup' : 'in', v: view.level };
}

type Action = { t: number; seq: number; input: WorldInput; value: number };

/** World events in time order, with a button's contact bounce spelled out as extra level changes. */
function timeline(world: WorldModel): { actions: Action[]; events: WorldModel['script'] } {
  const byId = new Map(world.inputs.map((i) => [i.id, i]));
  const last = new Map(world.inputs.map((i) => [i.id, i.default]));
  const events = [...world.script].sort((a, b) => a.t - b.t);
  const actions: Action[] = [];
  let seq = 0;
  for (const e of events) {
    const input = byId.get(e.input);
    if (!input) continue;
    const before = last.get(input.id) ?? input.default;
    const d = input.device;
    if (d.kind === 'button' && d.bounceMs > 0 && (before >= 0.5) !== (e.value >= 0.5)) {
      const q = d.bounceMs / 4;
      [e.value, before, e.value, before, e.value].forEach((v, i) => actions.push({ t: e.t + i * q, seq: seq++, input, value: v }));
    } else actions.push({ t: e.t, seq: seq++, input, value: e.value });
    last.set(input.id, e.value);
  }
  actions.sort((a, b) => a.t - b.t || a.seq - b.seq);
  return { actions, events };
}

function profileFor(o: HeadlessOptions): BoardProfile | string {
  try {
    return getProfile(o.board as BoardId, o.variant ?? undefined);
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/** Run a program on the lesson's (or task's) world script and record what it did. */
export function runHeadless(o: HeadlessOptions): RunTrace {
  const trace: RunTrace = { ms: 0, error: null, serial: [], pins: {}, figure: [], inputs: [] };
  const profile = profileFor(o);
  if (typeof profile === 'string') {
    trace.error = { line: 0, message: `board:${o.board}` };
    return trace;
  }
  const language = INTERP_LANGUAGE[o.language];
  if (!language || !profile.languages.includes(language)) {
    trace.error = { line: 0, message: `language:${o.language}` };
    return trace;
  }
  const { devices, world: worldOpts } = runOptionsFor(o.world);
  let run: Run;
  try {
    run = createRun({ board: profile.id, variant: o.variant ?? undefined, language, source: o.source, devices, world: worldOpts, params: o.params });
  } catch (e) {
    trace.error = { line: 0, message: e instanceof Error ? e.message : String(e) };
    return trace;
  }
  const fatal = run.diagnostics.find((d) => d.kind !== 'runtime');
  if (fatal) {
    trace.error = { line: fatal.line, message: fatal.message };
    return trace;
  }

  const nowMs = () => run.world.now / 1000;
  let buffer = '';
  let bufferT = 0;
  run.on('serial', (text) => {
    if (!buffer) bufferT = nowMs();
    buffer += text;
    let nl = buffer.indexOf('\n');
    while (nl >= 0) {
      trace.serial.push({ t: Math.floor(bufferT), text: buffer.slice(0, nl).replace(/\r$/, '') });
      buffer = buffer.slice(nl + 1);
      bufferT = nowMs();
      nl = buffer.indexOf('\n');
    }
  });
  run.on('error', (e) => {
    trace.error ??= { line: e.line, message: e.hint ? `${e.message} (${e.hint})` : e.message };
  });

  const http: HttpExchange[] = [];
  const resolve = netResolver(profile, { nets: o.nets, ports: o.ports });
  const binding = new WorldBinding(run, o.world, { logicV: o.logicV ?? profile.logicV, resolve, onHttp: (x) => http.push(x) });
  for (const input of o.world.inputs) if (input.device.kind !== 'network') binding.apply(input, input.default);
  const { actions, events } = timeline(o.world);

  const last = new Map<string, string>();
  const push = (net: string, t: number, v: number, mode: PinMode) => {
    const key = `${mode}:${v}`;
    if (last.get(net) === key) return;
    last.set(net, key);
    (trace.pins[net] ??= []).push({ t, v, mode });
  };
  let traceWorld: World | null = null;
  let traceAt = 0;
  let seenVersion = -1;
  const record = () => {
    const w = run.world;
    if (w !== traceWorld) {
      traceWorld = w;
      traceAt = 0;
      seenVersion = -1;
    }
    for (; traceAt < w.trace.length; traceAt++) {
      const [us, n, level] = w.trace[traceAt];
      const p = w.pins.get(n);
      if (!p || p.duty !== null || p.toneHz || p.servoUs) continue;
      const mode: PinMode = p.mode === 'output' || p.mode === 'open_drain' ? 'out' : p.mode === 'input_pullup' ? 'pullup' : 'in';
      push(pinNet(profile, n, o.nets), us / 1000, level, mode);
    }
    if (w.version === seenVersion) return;
    seenVersion = w.version;
    const snap = run.snapshot();
    const t = nowMs();
    for (const [key, view] of Object.entries(snap.pins)) {
      const s = sample(view);
      push(pinNet(profile, Number(key), o.nets), t, s.v, s.mode);
    }
    if (snap.ports && o.ports) {
      for (const [port, nets] of Object.entries(o.ports)) {
        const value = snap.ports[port];
        if (value === undefined) continue;
        nets.forEach((net, bit) => push(net, t, (value >> bit) & 1, 'out'));
      }
    }
  };

  const clock = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
  const started = clock();
  let nextEvent = 0;
  let nextAction = 0;
  let nextProgress = 250;
  const advance = (toMs: number) => {
    const dt = toMs - nowMs();
    if (dt > 0) run.step(dt);
  };
  const halted = () => {
    const s = run.status.state;
    return s === 'done' || s === 'error' || trace.error !== null;
  };

  run.start();
  record();
  for (let t = 0; t < o.runMs; t++) {
    while (nextEvent < events.length && events[nextEvent].t <= t) trace.inputs.push(events[nextEvent++]);
    while (nextAction < actions.length && actions[nextAction].t < t + 1) {
      const a = actions[nextAction++];
      if (a.t > nowMs()) advance(a.t);
      binding.apply(a.input, a.value);
    }
    advance(t + 1);
    record();
    trace.ms = t + 1;
    if (halted()) {
      if (!trace.error) trace.ms = o.runMs;
      break;
    }
    if (o.onProgress && trace.ms >= nextProgress) {
      nextProgress += 250;
      o.onProgress(trace.ms, o.runMs);
    }
    if (o.budgetMs !== undefined && (t & 63) === 0 && clock() - started > o.budgetMs) {
      trace.error = { line: 0, message: LIMIT_MESSAGE };
      break;
    }
  }
  if (buffer) trace.serial.push({ t: Math.floor(bufferT), text: buffer });
  for (const list of Object.values(trace.pins)) list.sort((a, b) => a.t - b.t);
  if (http.length) trace.http = http;
  run.stop();
  return trace;
}
