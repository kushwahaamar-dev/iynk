// The Board Lab's live run on src/lib/interp (its createRun API). The run loop
// uses only `compile()` and the Session it returns; the completion checks go
// through src/lib/interp's own check path (startChecks), not through here.

import type { InterpTarget, Language, WorldInput, WorldModel } from '@/content/schema';
import {
  INTERP_LANGUAGE,
  WorldBinding,
  createRun,
  getProfile,
  netResolver,
  pinNet,
  runOptionsFor,
  type BoardId as InterpBoardId,
  type BoardProfile,
  type HttpExchange,
  type PinView,
  type Run,
} from '@/lib/interp';

/** Where and why code could not run. Lines are 1-based; 0 means "no line". */
export interface RunError {
  kind: 'syntax' | 'compile' | 'runtime' | 'unsupported' | 'limit';
  line: number;
  col: number;
  message: string;
  hint?: string;
}

/** One pin as the lab shows it and sends it to the figure. */
export interface PinSample {
  mode: PinView['mode'];
  /** 0/1 for digital pins, 0..1 duty for PWM. */
  value: number;
  pwm: boolean;
  hz?: number;
  servoUs?: number;
  volts?: number;
}

export interface CompileOptions {
  language: Language;
  source: string;
  board: string;
  variant?: string | null;
  target?: InterpTarget;
  /** Pin number -> net name overrides from the board's pinout (see netMap). */
  nets?: Record<number, string>;
  /** Verilog: top-level port -> board nets, bit 0 first (Lesson.code.ports). */
  ports?: Record<string, string[]>;
  /** The lesson's world: its I²C devices, sonar, Wi-Fi networks and HTTP peers are set up before power-on. */
  world?: WorldModel;
  /** The board's I/O level, which is also a pot's or divider's supply. */
  logicV?: number;
}

const NO_WORLD: WorldModel = { inputs: [], script: [] };

export interface Session {
  /** Virtual time in milliseconds since the program started. */
  readonly nowMs: number;
  /** True once the program has finished or failed. */
  readonly halted: boolean;
  /** The runtime error that stopped the program, if any. */
  readonly error: RunError | null;
  /** Baud rate the sketch opens Serial at (0 = never opened, or no UART: MicroPython over USB). */
  readonly baud: number;
  /** Run the program until virtual time `ms`. Never blocks for long: a busy loop yields after its budget. */
  advanceTo(ms: number): void;
  /** Every pin the program has touched, by net name. */
  pins(): Record<string, PinSample>;
  /** Complete serial lines printed since the last call (a trailing partial line stays buffered). */
  takeSerial(): { t: number; text: string }[];
  /** Whatever is still buffered, newline or not. */
  flushSerial(): { t: number; text: string }[];
  /** Drive an input pin from the figure: a digital level, or null to let it float. */
  drive(net: string, level: 0 | 1 | null): void;
  /** Set a world input (button, pot, sonar distance, tilt, line position, phone request) to a value now. */
  setInput(input: WorldInput, value: number): void;
  /** HTTP exchanges the world's network inputs finished since the last call. */
  takeHttp(): HttpExchange[];
  /** Text typed into the serial monitor, for Serial.read() / input(). */
  feedSerial(text: string): void;
  /** A cold solder joint on a pin: the connection drops out. */
  coldJoint(net: string, cold: boolean): void;
  /** Warnings the interpreter raised (wrong PWM pin, ISR misuse...). */
  takeWarnings(): string[];
}

export type CompileResult = { ok: true; session: Session } | { ok: false; error: RunError };

/** The baud rate Serial.begin() opens at, read from the code (MicroPython prints over USB: 0). */
export function sketchBaud(language: Language, source: string): number {
  if (language !== 'arduino-cpp') return 0;
  const m = /Serial\.begin\s*\(\s*(\d+)/.exec(source.replace(/\/\/[^\n]*/g, ''));
  return m ? Number(m[1]) : 0;
}

class InterpSession implements Session {
  private readonly run: Run;
  private readonly profile: BoardProfile;
  private readonly nets?: Record<number, string>;
  private readonly ports?: Record<string, string[]>;
  private readonly resolve: (net: string) => number | string | undefined;
  private readonly binding: WorldBinding;
  private buffer = '';
  private bufferT = 0;
  private lines: { t: number; text: string }[] = [];
  private warnings: string[] = [];
  private http: HttpExchange[] = [];
  readonly baud: number;
  error: RunError | null = null;

  constructor(run: Run, opts: CompileOptions) {
    this.run = run;
    this.profile = run.profile;
    this.nets = opts.nets;
    this.ports = opts.ports;
    this.baud = sketchBaud(opts.language, opts.source);
    this.resolve = netResolver(this.profile, { nets: opts.nets, ports: opts.ports });
    this.binding = new WorldBinding(run, opts.world ?? NO_WORLD, {
      logicV: opts.logicV ?? this.profile.logicV,
      resolve: this.resolve,
      onHttp: (x) => this.http.push(x),
    });
    run.on('serial', (text) => this.onSerial(text));
    run.on('warn', (message) => this.warnings.push(message));
    run.on('error', (e) => {
      this.error = { kind: e.kind, line: e.line, col: e.col, message: e.message, hint: e.hint };
    });
    run.start();
  }

  get nowMs(): number {
    return this.run.world.now / 1000;
  }

  get halted(): boolean {
    const s = this.run.status.state;
    return s === 'done' || s === 'error' || this.error !== null;
  }

  private onSerial(text: string): void {
    if (!this.buffer) this.bufferT = this.nowMs;
    this.buffer += text;
    let nl = this.buffer.indexOf('\n');
    while (nl >= 0) {
      this.lines.push({ t: this.bufferT, text: this.buffer.slice(0, nl).replace(/\r$/, '') });
      this.buffer = this.buffer.slice(nl + 1);
      this.bufferT = this.nowMs;
      nl = this.buffer.indexOf('\n');
    }
  }

  advanceTo(ms: number): void {
    const dt = ms - this.nowMs;
    if (dt > 0 && !this.halted) this.run.step(dt);
  }

  pins(): Record<string, PinSample> {
    const snap = this.run.snapshot();
    const out: Record<string, PinSample> = {};
    for (const [key, view] of Object.entries(snap.pins)) {
      const pwm = view.duty !== undefined;
      const sample: PinSample = { mode: view.mode, value: pwm ? (view.duty ?? 0) : view.level, pwm };
      if (view.hz) sample.hz = view.hz;
      if (view.servoUs) sample.servoUs = view.servoUs;
      if (view.volts !== undefined) sample.volts = view.volts;
      out[pinNet(this.profile, Number(key), this.nets)] = sample;
    }
    // FPGA designs drive their ports; spread each port's bits onto the board nets.
    if (snap.ports && this.ports) {
      for (const [port, nets] of Object.entries(this.ports)) {
        const value = snap.ports[port];
        if (value === undefined) continue;
        nets.forEach((net, bit) => {
          out[net] = { mode: 'output', value: (value >> bit) & 1, pwm: false };
        });
      }
    }
    return out;
  }

  takeSerial(): { t: number; text: string }[] {
    const lines = this.lines;
    this.lines = [];
    return lines;
  }

  flushSerial(): { t: number; text: string }[] {
    if (this.buffer) {
      this.lines.push({ t: this.bufferT, text: this.buffer });
      this.buffer = '';
    }
    return this.takeSerial();
  }

  drive(net: string, level: 0 | 1 | null): void {
    const pin = this.resolve(net);
    if (pin !== undefined) this.run.input(pin, level);
  }

  setInput(input: WorldInput, value: number): void {
    this.binding.apply(input, value);
  }

  takeHttp(): HttpExchange[] {
    const http = this.http;
    this.http = [];
    return http;
  }

  feedSerial(text: string): void {
    this.run.serialWrite(text);
  }

  coldJoint(net: string, cold: boolean): void {
    const pin = this.resolve(net);
    if (typeof pin === 'number') this.run.coldJoint(pin, cold);
  }

  takeWarnings(): string[] {
    const w = this.warnings;
    this.warnings = [];
    return w;
  }
}

/** Every language the Board Lab teaches runs in this build. */
export function canRun(language: Language): boolean {
  return language in INTERP_LANGUAGE;
}

/** Parse and check the code for the board; on success the session is started at t = 0, nothing run yet. */
export function compile(opts: CompileOptions): CompileResult {
  let profile: BoardProfile;
  try {
    profile = getProfile(opts.board as InterpBoardId, opts.variant ?? undefined);
  } catch {
    return { ok: false, error: { kind: 'unsupported', line: 0, col: 0, message: `board:${opts.board}` } };
  }
  const language = INTERP_LANGUAGE[opts.language];
  if (!language || !profile.languages.includes(language)) {
    return { ok: false, error: { kind: 'unsupported', line: 0, col: 0, message: `language:${opts.language}` } };
  }
  const { devices, world } = runOptionsFor(opts.world ?? NO_WORLD);
  let run: Run;
  try {
    run = createRun({ board: profile.id, variant: opts.variant ?? undefined, language, source: opts.source, devices, world });
  } catch (e) {
    return { ok: false, error: { kind: 'compile', line: 0, col: 0, message: e instanceof Error ? e.message : String(e) } };
  }
  const fatal = run.diagnostics.find((d) => d.kind !== 'runtime');
  if (fatal) return { ok: false, error: { kind: fatal.kind, line: fatal.line, col: fatal.col, message: fatal.message, hint: fatal.hint } };
  return { ok: true, session: new InterpSession(run, opts) };
}
