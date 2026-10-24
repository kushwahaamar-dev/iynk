// The lesson run loop. Run: compile (600 ms) → upload (600 ms) → running on a
// virtual clock that advances with real time; pin levels go to the figure as
// `set {pins}` at most 30 times a second and serial lines go to the monitor.
// The completion checks re-run the same source headless on the lesson's world
// script, so they are a pure function of (source, board, script, runMs).

import type { FigureHandle } from '@/components/figure/protocol';
import type { Check, FailureMode, PinMode, RunTrace, WorldInput, WorldModel } from '@/content/schema';
import { evaluateChecks, servoDegrees } from './checks';
import { compile, type CompileOptions, type PinSample, type RunError, type Session } from './engine';
import { drivesFor } from './inputs';
import type { BoardLabAction, BoardLabState, BoardLabStore, SerialLine } from './store';

export const COMPILE_MS = 600;
export const UPLOAD_MS = 600;
/** With Reduce motion on, the upload waits are near-instant. */
export const FAST_MS = 30;
const FRAME_CAP_MS = 64;
const FIGURE_HZ = 30;
const UI_TICK_MS = 66;

export function traceMode(s: PinSample): PinMode {
  if (s.hz) return 'tone';
  if (s.servoUs) return 'servo';
  if (s.pwm) return 'pwm';
  if (s.mode === 'output' || s.mode === 'open_drain') return 'out';
  if (s.volts !== undefined && s.volts !== null) return 'analog';
  return s.mode === 'input_pullup' ? 'pullup' : 'in';
}

export function traceValue(s: PinSample, mode: PinMode): number {
  switch (mode) {
    case 'tone':
      return s.hz ?? 0;
    case 'servo':
      return servoDegrees(s.servoUs ?? 0);
    case 'analog':
      return s.volts ?? 0;
    default:
      return s.value;
  }
}

function applyDrives(session: Session, input: WorldInput, value: number, logicV: number): void {
  for (const d of drivesFor(input, value, logicV)) {
    if ('volts' in d) session.applyVolts(d.net, d.volts);
    else session.drive(d.net, d.level);
  }
}

export interface HeadlessOptions extends CompileOptions {
  world: WorldModel;
  runMs: number;
  logicV: number;
}

/** The deterministic run the checks read (D14c). Samples every pin each virtual millisecond. */
export function runHeadless(o: HeadlessOptions): RunTrace {
  const trace: RunTrace = { ms: 0, error: null, serial: [], pins: {}, figure: [], inputs: [] };
  const c = compile(o);
  if (!c.ok) {
    trace.error = { line: c.error.line, message: c.error.message };
    return trace;
  }
  const s = c.session;
  const byId = new Map(o.world.inputs.map((i) => [i.id, i]));
  for (const input of o.world.inputs) applyDrives(s, input, input.default, o.logicV);
  const events = [...o.world.script].sort((a, b) => a.t - b.t);
  const last = new Map<string, string>();
  let next = 0;
  // Each step runs the millisecond [t, t + 1) and stamps what changed in it with t.
  for (let t = 0; t < o.runMs; t++) {
    while (next < events.length && events[next].t <= t) {
      const e = events[next++];
      const input = byId.get(e.input);
      if (input) applyDrives(s, input, e.value, o.logicV);
      trace.inputs.push(e);
    }
    s.advanceTo(t + 1);
    for (const line of s.takeSerial()) trace.serial.push({ t: Math.floor(line.t), text: line.text });
    for (const [net, sample] of Object.entries(s.pins())) {
      const mode = traceMode(sample);
      const v = traceValue(sample, mode);
      const key = `${mode}:${v}`;
      if (last.get(net) === key) continue;
      last.set(net, key);
      (trace.pins[net] ??= []).push({ t, v, mode });
    }
    trace.ms = t + 1;
    if (s.error) {
      trace.error = { line: s.error.line, message: s.error.message };
      break;
    }
  }
  for (const line of s.flushSerial()) trace.serial.push({ t: Math.floor(line.t), text: line.text });
  return trace;
}

/** Timers the runner uses; tests pass a fake clock. */
export interface Scheduler {
  now(): number;
  frame(cb: (now: number) => void): number;
  cancelFrame(id: number): void;
  timeout(cb: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

export const browserScheduler: Scheduler = {
  now: () => performance.now(),
  frame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (id) => cancelAnimationFrame(id),
  timeout: (cb, ms) => window.setTimeout(cb, ms),
  clearTimeout: (id) => window.clearTimeout(id),
};

export interface RunnerEnv {
  store: BoardLabStore;
  /** Board facts for compiling and for the upload message. */
  board: { id: string; name: string; logicV: number; nets?: Record<number, string> };
  lesson: { inputs: WorldInput[]; world: WorldModel; runMs: number; checks: Check[]; ports?: Record<string, string[]> };
  /** The board's failure modes; cold joints on a pin also reach the interpreter. */
  failures?: FailureMode[];
  /** Control ids that hold the MCU in reset while pressed (the figure's RESET buttons). */
  resetControls: string[];
  figure: () => FigureHandle | null;
  reduceMotion: () => boolean;
  /** Called once per run when every check passes. */
  onPassed?: () => void;
  scheduler?: Scheduler;
}

/** Figure statuses in which the MCU runs code. A figure that has not reported yet counts as running. */
const RUNS = new Set(['running', 'uploading']);

function formatError(e: RunError): string {
  const where = e.line ? `${e.line}:${e.col} ` : '';
  return `${where}${e.message}`;
}

export class LessonRunner {
  private readonly env: RunnerEnv;
  private readonly sched: Scheduler;
  private session: Session | null = null;
  private runId = 0;
  private timers: number[] = [];
  private frameId: number | null = null;
  private lastFrame = 0;
  private lastFigure = -Infinity;
  private lastTick = -Infinity;
  private vt = 0;
  private held = false;
  private sentPins = '';
  private touched = new Set<string>();
  private lastStatus: unknown = undefined;
  private lastControls = '';
  /** The source that was uploaded; RESET reruns it even if the editor changed since. */
  private source = '';

  constructor(env: RunnerEnv) {
    this.env = env;
    this.sched = env.scheduler ?? browserScheduler;
  }

  /** Start reacting to the store; returns the detach function. */
  attach(): () => void {
    const off = this.env.store.onAction((action, state) => this.onAction(action, state));
    return () => {
      off();
      this.halt();
    };
  }

  private get state(): BoardLabState {
    return this.env.store.getState();
  }

  private dispatch(action: BoardLabAction): void {
    this.env.store.dispatch(action);
  }

  private sys(text: string, params?: Record<string, string | number>, kind: SerialLine['kind'] = 'sys'): void {
    this.dispatch({ type: 'serial/append', lines: [{ kind, text, t: null, params }] });
  }

  private onAction(action: BoardLabAction, state: BoardLabState): void {
    switch (action.type) {
      case 'run/start':
        if (state.run.status === 'compiling') this.begin(state.run.id);
        break;
      case 'run/stop':
        this.end(true);
        break;
      case 'input/set':
        if (this.session) {
          const input = this.env.lesson.inputs.find((i) => i.id === action.id);
          if (input) applyDrives(this.session, input, action.value, this.env.board.logicV);
        }
        break;
      case 'serial/send':
        this.session?.feedSerial(`${action.text}\n`);
        break;
      case 'param/set':
        // A chip changed while running: load the new code at once, without the upload wait.
        if (state.run.status === 'running') this.restart(true);
        break;
      case 'figure/state':
        this.onFigure(action.state);
        break;
      case 'fault/trigger':
      case 'fault/clear':
        this.applyColdJoints();
        break;
      default:
        break;
    }
  }

  /** A cold joint on a pin (FailureTrigger cold-joint with a pin) makes that pin drop out in the interpreter too. */
  private applyColdJoints(): void {
    if (!this.session) return;
    const active = this.state.fault;
    for (const f of this.env.failures ?? []) {
      if (f.trigger.by !== 'cold-joint' || !f.trigger.pin) continue;
      this.session.coldJoint(f.trigger.pin, f.id === active);
    }
  }

  private gate(): string | null {
    const status = this.state.figure.status;
    if (status === undefined || RUNS.has(String(status)) || status === 'powered') return null;
    if (status === 'off' || status === 'no-power') return 'refused.unplugged';
    if (status === 'brownout') return 'refused.brownout';
    if (status === 'fault') return 'refused.fault';
    return 'refused.notReady';
  }

  private compileNow(source: string): Session | null {
    const s = this.state;
    const result = compile({ language: s.language, source, board: this.env.board.id, variant: s.variant, nets: this.env.board.nets, ports: this.env.lesson.ports });
    if (!result.ok) {
      this.dispatch({ type: 'run/error', id: this.runId, error: result.error });
      if (result.error.kind === 'unsupported') this.sys('error.unsupported', undefined, 'err');
      else this.sys(formatError(result.error), undefined, 'err');
      if (result.error.hint) this.sys(result.error.hint, undefined, 'note');
      return null;
    }
    for (const input of this.env.lesson.inputs) applyDrives(result.session, input, this.state.inputs[input.id] ?? input.default, this.env.board.logicV);
    const session = result.session;
    for (const f of this.env.failures ?? []) if (f.trigger.by === 'cold-joint' && f.trigger.pin && f.id === s.fault) session.coldJoint(f.trigger.pin, true);
    return session;
  }

  private begin(id: number): void {
    this.halt();
    this.runId = id;
    const refused = this.gate();
    this.sys('upload.compiling');
    if (refused) {
      this.sys(refused, undefined, 'err');
      this.dispatch({ type: 'run/stop' });
      return;
    }
    this.source = this.state.code;
    const session = this.compileNow(this.source);
    if (!session) return;
    const wait = this.env.reduceMotion() ? FAST_MS : COMPILE_MS;
    const upWait = this.env.reduceMotion() ? FAST_MS : UPLOAD_MS;
    this.later(() => {
      this.dispatch({ type: 'run/phase', id, status: 'uploading' });
      this.sys('upload.uploading', { board: this.env.board.name });
      this.figureSet({ serial: `avrdude: ${this.env.board.name}` });
      this.later(() => {
        if (this.runId !== id || this.state.run.status !== 'uploading') return;
        this.sys('upload.done');
        this.session = session;
        this.vt = 0;
        this.held = false;
        this.dispatch({ type: 'run/phase', id, status: 'running' });
        this.lastFrame = this.sched.now();
        this.loop();
        this.later(() => this.check(id), 0);
      }, upWait);
    }, wait);
  }

  private later(cb: () => void, ms: number): void {
    const id = this.runId;
    this.timers.push(this.sched.timeout(() => this.runId === id && cb(), ms));
  }

  private loop(): void {
    this.frameId = this.sched.frame((now) => this.frame(now));
  }

  /** One animation frame: advance the virtual clock by the real time since the last frame. */
  frame(now: number): void {
    this.frameId = null;
    const session = this.session;
    if (!session || this.state.run.status !== 'running') return;
    const dt = Math.min(FRAME_CAP_MS, Math.max(0, now - this.lastFrame));
    this.lastFrame = now;
    if (!this.held) {
      this.vt += dt;
      session.advanceTo(this.vt);
    }
    const lines = session.takeSerial();
    if (lines.length) {
      this.dispatch({ type: 'serial/append', lines: lines.map((l) => ({ kind: 'out' as const, text: l.text, t: Math.round(l.t) })) });
      this.figureSet({ serial: lines[lines.length - 1].text });
    }
    const warnings = session.takeWarnings();
    if (warnings.length) this.dispatch({ type: 'serial/append', lines: warnings.map((w) => ({ kind: 'note' as const, text: w, t: Math.round(session.nowMs) })) });
    if (session.baud !== this.state.serial.sketchBaud) this.dispatch({ type: 'serial/sketch-baud', baud: session.baud });
    const pins = this.held ? {} : session.pins();
    if (now - this.lastFigure >= 1000 / FIGURE_HZ) {
      this.lastFigure = now;
      this.sendPins(pins);
    }
    if (now - this.lastTick >= UI_TICK_MS) {
      this.lastTick = now;
      this.dispatch({ type: 'run/tick', id: this.runId, vt: Math.round(this.vt), pins });
    }
    if (session.error) {
      const error = session.error;
      this.dispatch({ type: 'run/error', id: this.runId, error });
      this.sys(formatError(error), undefined, 'err');
      if (error.hint) this.sys(error.hint, undefined, 'note');
      this.end(false);
      return;
    }
    this.loop();
  }

  private sendPins(pins: Record<string, PinSample>): void {
    const levels: Record<string, number> = {};
    for (const [net, s] of Object.entries(pins)) {
      if (s.mode !== 'output' && s.mode !== 'open_drain' && !s.pwm) continue;
      levels[net] = s.value;
      this.touched.add(net);
    }
    for (const net of this.touched) if (!(net in levels)) levels[net] = 0;
    const key = JSON.stringify(levels);
    if (key === this.sentPins) return;
    this.sentPins = key;
    this.figureSet({ pins: levels });
  }

  private figureSet(state: Record<string, unknown>): void {
    this.env.figure()?.send('set', { state });
  }

  private onFigure(state: Record<string, unknown>): void {
    const status = state.status;
    const controls = (state.controls ?? {}) as Record<string, unknown>;
    const controlsKey = JSON.stringify(this.env.resetControls.map((id) => controls[id] ?? 0));
    const statusChanged = status !== this.lastStatus;
    const controlsChanged = controlsKey !== this.lastControls;
    this.lastStatus = status;
    this.lastControls = controlsKey;
    const inputs = state.inputs as Record<string, unknown> | undefined;
    if (inputs && this.session) {
      for (const [net, v] of Object.entries(inputs)) if (v === 0 || v === 1) this.session.drive(net, v);
    }
    if (!this.session || this.state.run.status !== 'running') return;
    const inReset = this.env.resetControls.some((id) => Number(controls[id] ?? 0) === 1);
    const runs = status === undefined || RUNS.has(String(status));
    if ((statusChanged || controlsChanged) && (inReset || !runs)) {
      // Held in reset, browned out or unplugged: outputs go low and time stops.
      this.held = true;
      this.sendPins({});
      return;
    }
    if (this.held && runs && !inReset) this.restart(false);
  }

  /** Start the same program again at t = 0 (RESET released, power back, or a chip changed). */
  private restart(newCode: boolean): void {
    if (newCode) this.source = this.state.code;
    const session = this.compileNow(this.source);
    if (!session) {
      this.end(false);
      return;
    }
    this.session = session;
    this.vt = 0;
    this.held = false;
    this.sys('upload.reset');
    this.dispatch({ type: 'serial/sketch-baud', baud: 0 });
    if (newCode) this.later(() => this.check(this.runId), 0);
  }

  /** The deterministic check run for the uploaded program. */
  check(id: number): void {
    if (id === this.runId) this.checkSource(this.source);
  }

  /** Check any source on the lesson's world script; marks the lesson done when every check passes. */
  checkSource(source: string): void {
    const { checks, world, runMs } = this.env.lesson;
    if (!checks.length) return;
    this.dispatch({ type: 'checks/start' });
    const s = this.state;
    const trace = runHeadless({ language: s.language, source, board: this.env.board.id, variant: s.variant, nets: this.env.board.nets, ports: this.env.lesson.ports, world, runMs, logicV: this.env.board.logicV });
    const results = evaluateChecks(checks, trace, { source, figure: s.figure });
    this.dispatch({ type: 'checks/result', results });
    if (results.every((r) => r.ok)) this.env.onPassed?.();
  }

  private halt(): void {
    for (const t of this.timers) this.sched.clearTimeout(t);
    this.timers = [];
    if (this.frameId !== null) this.sched.cancelFrame(this.frameId);
    this.frameId = null;
  }

  private end(byUser: boolean): void {
    const wasActive = this.session !== null || this.timers.length > 0;
    this.halt();
    if (this.session) {
      const rest = this.session.flushSerial();
      if (rest.length) this.dispatch({ type: 'serial/append', lines: rest.map((l) => ({ kind: 'out' as const, text: l.text, t: Math.round(l.t) })) });
    }
    this.session = null;
    this.runId = -1;
    this.sendPins({});
    this.touched.clear();
    this.sentPins = '';
    if (byUser && wasActive) this.sys('upload.stopped');
    if (this.state.run.status !== 'stopped') this.dispatch({ type: 'run/stop' });
  }
}
