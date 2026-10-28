import { addStandardDevices, HcSr04 } from './devices';
import { InterpError, type Diagnostic } from './errors';
import { PREEMPT, type Program } from './exec';
import { getProfile, resolvePin, type BoardId, type BoardProfile, type Language } from './profiles';
import { World, type Snapshot, type WorldOptions } from './world';
import { compileSketch, type ArduinoRt } from './arduino/interp';
import { DeepSleep } from './arduino/libs';
import { PyRt, PyRaise } from './python/runtime';
import { installBuiltins, installModules, type RosMessage } from './python/modules';
import { compileVerilog, type VerilogSim } from './verilog/sim';

const SERIAL_CAP = 1_048_576;
const SERIAL_MARKER = '\r\n[output truncated at 1 MB]\r\n';

export type DeviceKind = 'mpu6050' | 'pca9685' | 'ssd1306' | 'lcd1602';

export interface RunOptions {
  board: BoardId;
  /** Board variant: 'wifi' | 'minima' (Uno R4), 'pico-w' | 'pico2' | 'pico2-w', 'v1.0' (ESP32-S3), 'pi5'. */
  variant?: string;
  /** Defaults to the board's first language. */
  language?: Language;
  source: string;
  world?: WorldOptions;
  /** Verilog: parameter overrides for the top module, e.g. { DIV: 25 }. */
  params?: Record<string, number>;
  /** I²C devices on the bus from power-on. */
  devices?: DeviceKind[];
  /** Statement budget per step() (C++/Python), default 400 000. FPGA: clock cycles per step, default 400 000. */
  budget?: number;
}

export type RunState = 'idle' | 'running' | 'stopped' | 'done' | 'error' | 'sleeping' | 'brownout' | 'unpowered';

export interface RunStatus {
  state: RunState;
  /** Simulated time in ms. */
  t: number;
  /** True when the last step could not keep up with real time (busy loop, fast FPGA clock). */
  throttled: boolean;
  /** FPGA only: simulated clock cycles so far. */
  cycles?: number;
}

export interface RunEvents {
  /** Text the program printed (Serial.print, print()); C++ println ends lines with "\r\n". */
  serial: string;
  /** Pin and display snapshot, at most 30 per simulated second, only when something changed. */
  pins: Snapshot;
  error: InterpError;
  state: RunStatus;
  /** Advice that is not an error (no PWM on that pin, 5 V on a 3.3 V pin...). */
  warn: string;
  /** ROS 2 messages published by an rclpy node (Raspberry Pi). */
  ros: RosMessage;
}

/** A running (or runnable) program on one board. */
export interface Run {
  readonly profile: BoardProfile;
  readonly language: Language;
  /** The current electrical world (replaced on reset). */
  readonly world: World;
  readonly status: RunStatus;
  /** Compile errors and warnings found before running. */
  readonly diagnostics: Diagnostic[];
  start(): void;
  stop(): void;
  /** Press RESET: reboot the program from setup() with the same inputs and devices. */
  reset(): void;
  /** Advance simulated time by `ms` (call once per animation frame with the frame time). */
  step(ms: number): void;
  /** Drive a digital input (true/1 = HIGH, null = release). FPGA: set a port or bit ("sw", "sw[3]", "btnC"). */
  input(pin: number | string, level: number | boolean | null): void;
  /** Apply a voltage to an analog pin (null disconnects). */
  analog(pin: number | string, volts: number | null): void;
  /** Send text to the program's serial input. */
  serialWrite(text: string): void;
  /** Change the supply voltage: below the brown-out threshold the board resets; negative means reversed. */
  setSupply(volts: number): void;
  /** Mark a pin's solder joint cold (intermittent) or good again. */
  coldJoint(pin: number | string, cold: boolean): void;
  /** Attach an HC-SR04 to two pins; returns it so the host can move the obstacle. */
  attachUltrasonic(trig: number | string, echo: number | string): HcSr04;
  /** Send an HTTP request to the sketch's web server (ESP32/ESP8266/Pico W). */
  request(method: string, path: string, body?: string): Promise<{ status: number; type: string; body: string }>;
  snapshot(): Snapshot;
  on<K extends keyof RunEvents>(event: K, fn: (payload: RunEvents[K]) => void): () => void;
}

const DEFAULT_BUDGET = 400_000;
const EMIT_EVERY_US = 1_000_000 / 30;

/**
 * Create a run for a board. Compilation happens here; errors are reported in
 * `diagnostics` and through the 'error' event when start() is called.
 */
export function createRun(opts: RunOptions): Run {
  return new RunImpl(opts);
}

/** Compile without running: returns the diagnostics for an editor. */
export function check(opts: RunOptions): Diagnostic[] {
  return new RunImpl(opts).diagnostics;
}

type Listener = (p: unknown) => void;

class RunImpl implements Run {
  readonly profile: BoardProfile;
  readonly language: Language;
  world!: World;
  diagnostics: Diagnostic[] = [];
  private listeners = new Map<string, Set<Listener>>();
  private state: RunState = 'idle';
  private program: Program | null = null;
  private waitUntil = 0;
  private arduino: ArduinoRt | null = null;
  private py: PyRt | null = null;
  private fpga: VerilogSim | null = null;
  private compileError: InterpError | null = null;
  private lastEmit = -Infinity;
  private throttled = false;
  private budget: number;
  private inputs = new Map<number | string, number | null>();
  private volts = new Map<number, number | null>();
  private setups: Array<(w: World) => void> = [];
  /** USB power. */
  private supply = 5;

  constructor(private opts: RunOptions) {
    this.profile = getProfile(opts.board, opts.variant);
    this.language = opts.language ?? this.profile.languages[0];
    if (!this.profile.languages.includes(this.language)) {
      throw new Error(`${this.profile.name} does not run ${this.language}; it runs ${this.profile.languages.join(' or ')}`);
    }
    this.budget = opts.budget ?? DEFAULT_BUDGET;
    this.boot(false);
  }

  get status(): RunStatus {
    const s: RunStatus = { state: this.state, t: Math.round(this.world.now / 100) / 10, throttled: this.throttled };
    if (this.fpga) s.cycles = this.fpga.cycles;
    return s;
  }

  // Lifecycle -------------------------------------------------------------------

  private boot(keepRtc: boolean): void {
    const prev = this.arduino;
    const before = this.world as World | undefined;
    this.world = new World(this.profile, this.opts.world);
    const w = this.world;
    let sent = 0;
    let marked = false;
    w.serialOut = (t) => {
      if (marked) return;
      const room = SERIAL_CAP - sent;
      if (t.length <= room) {
        sent += t.length;
        this.emit('serial', t);
        return;
      }
      if (room > 0) this.emit('serial', t.slice(0, room));
      marked = true;
      this.emit('serial', SERIAL_MARKER);
    };
    w.warn = (m) => this.emit('warn', m);
    if (this.opts.devices?.length) addStandardDevices(w, this.opts.devices);
    for (const s of this.setups) s(w);
    this.compileError = null;
    this.diagnostics = [];
    this.arduino = null;
    this.py = null;
    this.fpga = null;
    this.program = null;
    this.waitUntil = 0;
    this.lastEmit = -Infinity;
    try {
      if (this.language === 'arduino') {
        const { rt } = compileSketch(this.opts.source, w);
        // Waking from deep sleep keeps RTC_DATA_ATTR variables; initGlobals leaves set slots alone.
        if (keepRtc && prev) for (const slot of rt.rtcSlots) rt.G[slot] = prev.G[slot];
        rt.initGlobals();
        this.arduino = rt;
        this.diagnostics = rt.warnings.map((x) => x.toJSON());
      } else if (this.language === 'python') {
        const rt = new PyRt(w, this.opts.source, this.profile.opUs);
        installBuiltins(rt);
        installModules(rt, (m) => this.emit('ros', m));
        this.py = rt;
      } else {
        this.fpga = compileVerilog(this.opts.source, this.profile, this.opts.params ?? {});
        w.ports = this.fpga.outputs();
        w.duty = this.fpga.duty();
        w.seg7 = this.fpga.seg7();
      }
    } catch (e) {
      const err = e instanceof InterpError ? e : new InterpError('compile', e instanceof Error ? e.message : String(e), null);
      this.compileError = err;
      this.diagnostics = [err.toJSON()];
    }
    // Replay what the host is driving.
    for (const [pin, level] of this.inputs) this.applyInput(pin, level);
    for (const [pin, v] of this.volts) w.applyVolts(pin, v);
    for (const [sensor, v] of before?.onboard ?? []) w.onboard.set(sensor, v);
  }

  start(): void {
    if (this.compileError) {
      this.setState('error');
      this.emit('error', this.compileError);
      return;
    }
    if (this.state === 'running') return;
    if (this.supply < 0) {
      this.setState('unpowered');
      return;
    }
    if (!this.program && !this.fpga) this.program = this.makeProgram();
    this.setState('running');
    this.emitPins(true);
  }

  private makeProgram(): Program | null {
    if (this.arduino) return this.arduino.program();
    if (this.py) return this.py.program();
    return null;
  }

  stop(): void {
    if (this.state === 'running' || this.state === 'sleeping') this.setState('stopped');
  }

  reset(): void {
    const wasRunning = this.state === 'running' || this.state === 'sleeping' || this.state === 'brownout';
    this.boot(false);
    this.state = 'idle';
    if (wasRunning) this.start();
    else this.emitPins(true);
  }

  // Stepping ----------------------------------------------------------------------

  step(ms: number): void {
    if (this.state === 'sleeping' && this.world.now >= this.waitUntil) {
      this.boot(true);
      this.state = 'idle';
      this.start();
    }
    if (this.state !== 'running') {
      if (this.state === 'sleeping') this.world.clock.advanceTo(Math.min(this.waitUntil, this.world.now + ms * 1000));
      return;
    }
    if (this.fpga) return this.stepFpga(ms);
    const exec = (this.arduino ?? this.py)!;
    const w = this.world;
    const target = w.now + Math.max(0, ms) * 1000;
    exec.target = target;
    exec.opBudget = exec.ops + this.budget;
    this.throttled = false;
    const g = this.program!;
    try {
      while (true) {
        if (this.waitUntil > w.now) {
          exec.advance(Math.min(this.waitUntil, target));
          if (w.now < this.waitUntil) break;
        }
        if (w.now >= target) break;
        if (exec.ops >= exec.opBudget) {
          this.throttled = true;
          break;
        }
        const r = g.next();
        if (r.done) {
          this.setState('done');
          break;
        }
        if (r.value !== PREEMPT) this.waitUntil = r.value;
      }
    } catch (e) {
      this.fail(e);
    }
    this.emitPins(false);
  }

  private fail(e: unknown): void {
    if (e instanceof DeepSleep) {
      this.waitUntil = this.world.now + e.us;
      this.setState('sleeping');
      for (const p of this.world.pins.values()) {
        p.mode = 'unset';
        p.duty = null;
        p.toneHz = 0;
      }
      this.world.touch();
      return;
    }
    let err: InterpError;
    if (e instanceof PyRaise && this.py) err = this.py.toInterpError(e) as InterpError;
    else if (e instanceof InterpError) err = e;
    else err = new InterpError('runtime', e instanceof Error ? e.message : String(e), this.py?.line ?? null);
    if (this.py && !err.line && this.py.line.line) err = new InterpError(err.kind, err.message, this.py.line, err.hint);
    this.setState('error');
    this.emit('error', err);
  }

  private stepFpga(ms: number): void {
    const sim = this.fpga!;
    const want = Math.round((ms / 1000) * sim.clockHz);
    const cycles = sim.clocked ? Math.min(want, this.budget) : want;
    this.throttled = cycles < want;
    try {
      sim.run(cycles);
    } catch (e) {
      this.fail(e);
      return;
    }
    // FPGA time follows simulated cycles, so slow motion shows as slower time.
    this.world.clock.advanceTo(this.world.now + (cycles / sim.clockHz) * 1e6);
    this.world.ports = sim.outputs();
    this.world.duty = sim.duty();
    this.world.seg7 = sim.seg7();
    this.world.touch();
    this.emitPins(false);
  }

  private emitPins(force: boolean): void {
    const w = this.world;
    if (!force && w.now - this.lastEmit < EMIT_EVERY_US) return;
    if (!w.takeChanged() && !force) return;
    this.lastEmit = w.now;
    this.emit('pins', w.snapshot());
  }

  // Inputs -----------------------------------------------------------------------------

  private pinNo(pin: number | string): number {
    const n = resolvePin(this.profile, pin);
    if (n === undefined) throw new Error(`unknown pin ${pin} on ${this.profile.name}`);
    return n;
  }

  private applyInput(pin: number | string, level: number | null): void {
    if (this.fpga) {
      this.fpga.setInput(String(pin), level ?? 0);
      return;
    }
    this.world.drive(this.pinNo(pin), level === null ? null : level ? 1 : 0);
  }

  input(pin: number | string, level: number | boolean | null): void {
    const v = level === null ? null : typeof level === 'boolean' ? (level ? 1 : 0) : level;
    this.inputs.set(pin, v);
    this.applyInput(pin, v);
  }

  analog(pin: number | string, volts: number | null): void {
    const n = this.pinNo(pin);
    this.volts.set(n, volts);
    this.world.applyVolts(n, volts);
  }

  serialWrite(text: string): void {
    this.world.feedSerial(text);
  }

  setSupply(volts: number): void {
    this.supply = volts;
    const w = this.world;
    const bod = this.profile.logicV >= 5 ? 2.7 : 2.44;
    if (volts < 0) {
      w.powered = false;
      this.emit('warn', 'reverse polarity: the supply is connected backwards; nothing runs (and parts without a protection diode can be destroyed)');
      this.setState('unpowered');
    } else if (volts < bod) {
      w.powered = false;
      if (this.state === 'running') this.setState('brownout');
    } else {
      w.supplyV = volts;
      const maxIn = this.profile.logicV >= 5 ? 5.5 : 3.6;
      if (volts > maxIn && volts < 6.5) this.emit('warn', `${volts.toFixed(1)} V on the ${this.profile.logicV} V rail is above the chip's absolute maximum`);
      if (this.state === 'brownout' || this.state === 'unpowered') {
        w.powered = true;
        this.reset();
        this.start();
      }
    }
    w.touch();
  }

  coldJoint(pin: number | string, cold: boolean): void {
    const n = this.pinNo(pin);
    const apply = (w: World) => (cold ? w.coldJoints.add(n) : w.coldJoints.delete(n));
    apply(this.world);
    this.setups.push(apply);
  }

  attachUltrasonic(trig: number | string, echo: number | string): HcSr04 {
    const t = this.pinNo(trig);
    const e = this.pinNo(echo);
    let dev = new HcSr04(this.world, t, e);
    const holder = { distanceCm: 25 };
    this.setups.push((w) => {
      dev = new HcSr04(w, t, e);
      dev.distanceCm = holder.distanceCm;
    });
    // A stable handle whose distance survives resets.
    return new Proxy(dev, {
      set: (_t, k, v) => {
        if (k === 'distanceCm') holder.distanceCm = v;
        (dev as unknown as Record<string | symbol, unknown>)[k] = v;
        return true;
      },
      get: (_t, k) => (dev as unknown as Record<string | symbol, unknown>)[k],
    });
  }

  request(method: string, path: string, body = ''): Promise<{ status: number; type: string; body: string }> {
    return this.world.request(method, path, body);
  }

  snapshot(): Snapshot {
    return this.world.snapshot();
  }

  // Events ---------------------------------------------------------------------------

  on<K extends keyof RunEvents>(event: K, fn: (payload: RunEvents[K]) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as Listener);
    return () => set!.delete(fn as Listener);
  }

  private emit<K extends keyof RunEvents>(event: K, payload: RunEvents[K]): void {
    const set = this.listeners.get(event);
    if (set) for (const fn of set) fn(payload);
  }

  private setState(s: RunState): void {
    if (this.state === s) return;
    this.state = s;
    this.emit('state', this.status);
  }
}
