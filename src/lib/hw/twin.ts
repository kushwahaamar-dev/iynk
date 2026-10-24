// The twin bridge: the running sketch's pins drive the real board (≤ 30 Hz,
// changes only), and the real board's inputs feed the lesson's world inputs
// (≤ 10 Hz per analog input with a dead band, digital edges at most every 25 ms).
// A pin-safety guard keeps the real board from driving any pin the lesson
// wires to a button or sensor, and never touches the USB serial pins 0 and 1.

import type { WorldInput } from "@/content/schema";
import { drivesFor } from "@/lib/boardlab/inputs";
import { getProfile, resolvePin, type BoardId, type BoardProfile } from "@/lib/interp/profiles";
import type { PinView } from "@/lib/interp/world";
import { supports, type FirmataBoard } from "./board";
import { PinMode } from "./firmata";

/** Sim boards numbered like an Arduino Uno, so their pins map 1:1 onto a Firmata Uno or Nano. */
export const TWIN_BOARDS: readonly BoardId[] = ["uno-r3", "nano", "uno-r4"];

/** Pins 0 and 1 carry the USB serial link Firmata itself talks over. */
const SERIAL_PINS = new Set([0, 1]);

export const OUTPUT_HZ = 30;
export const ANALOG_INPUT_MS = 100;
export const DIGITAL_INPUT_MS = 25;
/** Analog changes smaller than this (in ADC counts) wait for the settle timer instead of going out at once. */
export const ANALOG_DEAD_BAND = 3;
const SETTLE_MS = 400;
const SAMPLING_MS = 40;

export type SimFrame = {
  /** The simulated board, or null when the lab has no pin-level sim. */
  boardId: BoardId | null;
  running: boolean;
  /** The sketch's pins in board numbering (World.snapshot().pins). */
  pins: Readonly<Record<number, PinView>>;
  /** The open lesson's world inputs. */
  inputs: readonly WorldInput[];
  /** False until the lesson's inputs are known; nothing is driven before the guard knows them. */
  inputsReady: boolean;
};

/** What the twin needs from a lab; src/lib/hw/sim.ts adapts the board lab store to it. */
export interface TwinSim {
  getFrame(): SimFrame;
  subscribe(listener: () => void): () => void;
  /** Feed a world input, exactly like the inspector slider does. */
  setInput(id: string, value: number): void;
}

export type BlockReason = "serial" | "lesson-input" | "unsupported" | "tone" | "virtual-only";

export type PinRole =
  | { kind: "out"; mode: "digital" | "pwm" | "servo"; value: number }
  | { kind: "in"; mode: "digital" | "analog"; input: WorldInput }
  | { kind: "blocked"; reason: BlockReason };

export type TwinPin = { pin: number; name: string; sim: PinView | null; role: PinRole };

export type TwinReport = {
  /** False when the lab's board can't be mirrored on an Arduino (an ESP32 lesson, a drone...). */
  compatible: boolean;
  running: boolean;
  drive: boolean;
  sense: boolean;
  pins: readonly TwinPin[];
  /** Absolute-maximum current per pin for the simulated board, for the safety note. */
  pinMaxMa: number | null;
  /** Full-scale ADC voltage of the simulated board (5 V on an Uno). */
  adcVref: number | null;
};

export type TwinOptions = { drive: boolean; sense: boolean };

const ANALOG_DEVICES = new Set(["pot", "linear", "tmp36", "divider"]);
const DIGITAL_DEVICES = new Set(["button", "switch"]);

/** Board pin number for a net name such as "D13", "A0", "13" or "LED_BUILTIN". */
export function pinOfNet(profile: BoardProfile, net: string): number | undefined {
  const digital = /^D(\d+)$/.exec(net.trim());
  if (digital) return Number(digital[1]);
  return resolvePin(profile, net);
}

export function pinLabel(profile: BoardProfile | null, pin: number): string {
  if (profile) {
    for (const [name, n] of Object.entries(profile.aliases)) if (n === pin && /^A\d+$/.test(name)) return name;
  }
  return `D${pin}`;
}

function snap(input: WorldInput, value: number): number {
  const clamped = Math.min(input.max, Math.max(input.min, value));
  if (!(input.step > 0)) return clamped;
  const steps = Math.round((clamped - input.min) / input.step);
  const decimals = (String(input.step).split(".")[1] ?? "").length;
  return Number(Math.min(input.max, input.min + steps * input.step).toFixed(decimals));
}

/** The volts the board lab's device model puts on the pin for one input value. */
function voltsAt(input: WorldInput, value: number, logicV: number): number | null {
  const drive = drivesFor(input, value, logicV)[0];
  return drive && "volts" in drive ? drive.volts : null;
}

/**
 * A real reading as the world input's own value. Analog devices invert the
 * board lab's own device model (src/lib/boardlab/inputs.ts) by bisection, so
 * the sim and the twin share one physics; every one of them is monotonic over
 * the input's range. Buttons and switches read the level their pull gives.
 * Returns null for devices that stay virtual.
 */
export function inputValue(input: WorldInput, reading: { volts: number } | { level: 0 | 1 }, logicV: number): number | null {
  const d = input.device;
  if ("level" in reading) {
    if (d.kind === "button") {
      const pressedLevel = d.pull === "external-down" || d.pull === "internal-down" ? 1 : 0;
      return reading.level === pressedLevel ? input.max : input.min;
    }
    return d.kind === "switch" ? (reading.level ? input.max : input.min) : null;
  }
  if (!ANALOG_DEVICES.has(d.kind)) return null;
  const atMin = voltsAt(input, input.min, logicV);
  const atMax = voltsAt(input, input.max, logicV);
  if (atMin === null || atMax === null || atMin === atMax) return null;
  const rising = atMax > atMin;
  let lo = input.min;
  let hi = input.max;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if ((voltsAt(input, mid, logicV) ?? 0) < reading.volts === rising) lo = mid;
    else hi = mid;
  }
  return snap(input, (lo + hi) / 2);
}

type Sense = { input: WorldInput; analog: boolean; raw: number | null; sentRaw: number | null; sentAt: number; timer: ReturnType<typeof setTimeout> | null };

export class TwinBridge {
  private options: TwinOptions;
  private readonly listeners = new Set<() => void>();
  private unsubscribe: (() => void)[] = [];
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSync = -Infinity;
  /** What each driven pin was last set to ("digital:1", "pwm:128"...). */
  private readonly driven = new Map<number, string>();
  private readonly sensing = new Map<number, Sense>();
  private report: TwinReport;
  private started = false;

  constructor(
    private readonly board: FirmataBoard,
    private readonly sim: TwinSim,
    options: TwinOptions,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.options = { ...options };
    this.report = { compatible: false, running: false, drive: options.drive, sense: options.sense, pins: [], pinMaxMa: null, adcVref: null };
  }

  getReport = (): TwinReport => this.report;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Make the real board safe, then follow the sim. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.unsubscribe = [
      this.sim.subscribe(() => this.schedule()),
      this.board.onInput((n, v) => this.onReal(n, v)),
      this.board.onReset(() => this.restart()),
    ];
    this.makeSafe();
    this.sync();
  }

  /** StandardFirmata boots with every digital pin as OUTPUT LOW, and a button wired to 5 V would short it. */
  private makeSafe(): void {
    for (let n = 0; n < this.board.getSnapshot().pins.length; n++) {
      const pin = this.board.pin(n);
      if (SERIAL_PINS.has(n) || !pin || pin.analogChannel !== null || !supports(pin, PinMode.INPUT)) continue;
      this.board.setMode(n, PinMode.INPUT);
    }
    this.board.setSamplingInterval(SAMPLING_MS);
  }

  /** The board reset itself: forget what it was told, make it safe again and re-apply the sim. */
  private restart(): void {
    this.driven.clear();
    for (const s of this.sensing.values()) if (s.timer) clearTimeout(s.timer);
    this.sensing.clear();
    this.makeSafe();
    this.sync();
  }

  set(options: Partial<TwinOptions>): void {
    this.options = { ...this.options, ...options };
    this.sync();
  }

  /** Stop following and leave the board safe: outputs LOW and high-impedance, reporting off. */
  stop(): void {
    if (!this.started) return;
    this.started = false;
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = null;
    for (const n of [...this.driven.keys()]) this.release(n);
    for (const n of [...this.sensing.keys()]) this.unsense(n);
  }

  private schedule(): void {
    if (this.syncTimer || !this.started) return;
    const wait = Math.max(0, this.lastSync + 1000 / OUTPUT_HZ - this.now());
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      this.sync();
    }, wait);
  }

  private sync(): void {
    if (!this.started) return;
    this.lastSync = this.now();
    const frame = this.sim.getFrame();
    const compatible = !!frame.boardId && TWIN_BOARDS.includes(frame.boardId);
    const profile = compatible && frame.boardId ? getProfile(frame.boardId) : null;
    const pins: TwinPin[] = [];
    const want = new Map<number, string>();
    const sense = new Map<number, { input: WorldInput; analog: boolean }>();

    if (profile) {
      const inputs = new Map<number, WorldInput>();
      for (const input of frame.inputs) {
        for (const net of input.pins) {
          const n = pinOfNet(profile, net);
          if (n !== undefined) inputs.set(n, input);
        }
      }
      const used = new Set<number>([...inputs.keys(), ...Object.keys(frame.running ? frame.pins : {}).map(Number)]);
      for (const n of [...used].sort((a, b) => a - b)) {
        const view = frame.running ? (frame.pins[n] ?? null) : null;
        const role = this.roleOf(n, view, inputs.get(n), profile);
        pins.push({ pin: n, name: pinLabel(profile, n), sim: view, role });
        if (role.kind === "out" && this.options.drive && frame.running && frame.inputsReady) want.set(n, `${role.mode}:${role.value}`);
        if (role.kind === "in" && this.options.sense) sense.set(n, { input: role.input, analog: role.mode === "analog" });
      }
    }

    for (const n of [...this.driven.keys()]) if (!want.has(n)) this.release(n);
    for (const [n, key] of want) if (this.driven.get(n) !== key) this.drive(n, key);
    for (const n of [...this.sensing.keys()]) if (!sense.has(n)) this.unsense(n);
    for (const [n, s] of sense) if (!this.sensing.has(n)) this.startSensing(n, s.input, s.analog);

    this.report = {
      compatible,
      running: frame.running,
      drive: this.options.drive,
      sense: this.options.sense,
      pins,
      pinMaxMa: profile?.pinMaxMa ?? null,
      adcVref: profile?.adcVref ?? null,
    };
    for (const l of this.listeners) l();
  }

  private roleOf(n: number, view: PinView | null, input: WorldInput | undefined, profile: BoardProfile): PinRole {
    if (SERIAL_PINS.has(n)) return { kind: "blocked", reason: "serial" };
    const real = this.board.pin(n);
    if (input) {
      // The guard: a lesson input pin is only ever read, even if the sketch writes to it.
      const analog = ANALOG_DEVICES.has(input.device.kind);
      if (!analog && !DIGITAL_DEVICES.has(input.device.kind)) return { kind: "blocked", reason: "virtual-only" };
      if (analog ? !supports(real, PinMode.ANALOG) : !supports(real, PinMode.INPUT)) return { kind: "blocked", reason: "unsupported" };
      if (view?.mode === "output") return { kind: "blocked", reason: "lesson-input" };
      return { kind: "in", mode: analog ? "analog" : "digital", input };
    }
    if (!view || (view.mode !== "output" && !view.servoUs)) return { kind: "blocked", reason: "virtual-only" };
    if (view.servoUs) {
      return supports(real, PinMode.SERVO) ? { kind: "out", mode: "servo", value: Math.round(view.servoUs) } : { kind: "blocked", reason: "unsupported" };
    }
    if (view.hz) return { kind: "blocked", reason: "tone" };
    if (view.duty !== undefined && supports(real, PinMode.PWM)) {
      const max = 2 ** (real?.modes.get(PinMode.PWM) ?? profile.pwmBits) - 1;
      return { kind: "out", mode: "pwm", value: Math.round(view.duty * max) };
    }
    return supports(real, PinMode.OUTPUT) ? { kind: "out", mode: "digital", value: view.level } : { kind: "blocked", reason: "unsupported" };
  }

  private drive(n: number, key: string): void {
    const [mode, raw] = key.split(":");
    const value = Number(raw);
    if (mode === "servo") {
      this.board.servoAttach(n);
      this.board.analogWrite(n, value);
    } else if (mode === "pwm") {
      this.board.setMode(n, PinMode.PWM);
      this.board.analogWrite(n, value);
    } else {
      this.board.setMode(n, PinMode.OUTPUT);
      this.board.digitalWrite(n, value ? 1 : 0);
    }
    this.driven.set(n, key);
  }

  /** LOW, then high-impedance (INPUT also detaches a servo). */
  private release(n: number): void {
    const mode = this.board.pin(n)?.mode;
    if (mode === PinMode.OUTPUT) this.board.digitalWrite(n, 0);
    if (mode === PinMode.PWM) this.board.analogWrite(n, 0);
    this.board.setMode(n, PinMode.INPUT);
    this.driven.delete(n);
  }

  private startSensing(n: number, input: WorldInput, analog: boolean): void {
    if (analog) {
      this.board.setMode(n, PinMode.ANALOG);
      this.board.reportAnalog(n, true);
    } else {
      const pullUp = input.device.kind === "button" && input.device.pull === "internal-up";
      this.board.setMode(n, pullUp ? PinMode.PULLUP : PinMode.INPUT);
      this.board.reportDigitalPort(n >> 3, true);
    }
    this.sensing.set(n, { input, analog, raw: null, sentRaw: null, sentAt: -Infinity, timer: null });
  }

  private unsense(n: number): void {
    const s = this.sensing.get(n);
    if (!s) return;
    if (s.timer) clearTimeout(s.timer);
    if (s.analog) this.board.reportAnalog(n, false);
    this.sensing.delete(n);
    if (!s.analog && ![...this.sensing.entries()].some(([m, o]) => !o.analog && m >> 3 === n >> 3)) this.board.reportDigitalPort(n >> 3, false);
    this.board.setMode(n, PinMode.INPUT);
  }

  private onReal(n: number, raw: number): void {
    const s = this.sensing.get(n);
    if (!s || !this.options.sense) return;
    s.raw = raw;
    const gap = s.analog ? ANALOG_INPUT_MS : DIGITAL_INPUT_MS;
    const wait = s.sentAt + gap - this.now();
    const small = s.analog && s.sentRaw !== null && Math.abs(raw - s.sentRaw) < ANALOG_DEAD_BAND;
    if (s.timer) clearTimeout(s.timer);
    s.timer = null;
    if (wait <= 0 && !small) this.flush(n, s);
    else s.timer = setTimeout(() => this.flush(n, s), Math.max(wait, small ? SETTLE_MS : 0));
  }

  private flush(n: number, s: Sense): void {
    s.timer = null;
    if (s.raw === null || this.sensing.get(n) !== s) return;
    const frame = this.sim.getFrame();
    const profile = frame.boardId && TWIN_BOARDS.includes(frame.boardId) ? getProfile(frame.boardId) : null;
    if (!profile) return;
    const bits = this.board.pin(n)?.modes.get(PinMode.ANALOG) ?? profile.adcBits;
    const reading = s.analog ? { volts: (s.raw / (2 ** bits - 1)) * profile.adcVref } : { level: (s.raw ? 1 : 0) as 0 | 1 };
    const value = inputValue(s.input, reading, profile.logicV);
    s.sentRaw = s.raw;
    s.sentAt = this.now();
    if (value !== null) this.sim.setInput(s.input.id, value);
  }
}
