import type { AVRADC, AVRIOPort, AVRSPI, AVRTimer, AVRTWI, AVRUSART, CPU } from "avr8js";
import { utf8Encode } from "../../core/canonical.ts";
import { clockRate, cyclesToNs, nsToCycles, NS_PER_MS, type ClockRate, type SimTime } from "../core/clock.ts";
import { simDiag, type SimDiagnostic } from "../core/diagnostic.ts";
import { StateHasher } from "../core/hash.ts";
import {
  RANK,
  type EventSink,
  type Language,
  type LoadResult,
  type McuEngine,
  type PinPort,
  type ProgramImage,
  type SimEvent,
  type SliceBudget,
} from "../engine.ts";

export type Avr8js = typeof import("avr8js");

export type AvrStopReason = "pin" | "bus" | "adc" | "break" | "budget";

export interface AvrContext {
  cpu: CPU;
  ports: Record<"B" | "C" | "D", AVRIOPort>;
  usart: AVRUSART;
  adc: AVRADC;
  twi: AVRTWI;
  spi: AVRSPI;
  timers: AVRTimer[];
  clock: ClockRate;
  cyclesToNs(c: number): SimTime;
  /** Ends the running batch right after the current instruction. Bus adapters call it from their event handlers. */
  requestStop(reason: AvrStopReason): void;
}

export interface AvrAdapter {
  readonly id: string;
  attach(ctx: AvrContext): void;
  beforeBatch?(ctx: AvrContext): void;
  afterBatch?(ctx: AvrContext): void;
}

export type AvrState = "unloaded" | "loaded" | "running" | "paused" | "error";

export interface AvrEngine extends McuEngine {
  load(image: ProgramImage): LoadResult;
  addAdapter(a: AvrAdapter): void;
  breakBitmap: Uint8Array | null;
  onBreak: ((pc: number) => void) | null;
  readonly cycles: number;
  readonly batches: number;
  readonly stoppedEarlyBy: AvrStopReason | null;
  readonly state: AvrState;
  /** Why the engine halted: illegal opcode or stack overflow, in order. */
  readonly diagnostics: readonly SimDiagnostic[];
  readonly serial: { onByte(cb: (byte: number, at: SimTime) => void): void };
}

const FLASH_BYTES = 32768;
const SRAM_BYTES = 2048;
const SRAM_START = 0x100;
const CPU_HZ = 16_000_000;
export const RATE = clockRate(125, 2);
const ENGINE_ID = "engine:avr@1.0.0";
const SMCR = 0x53;
const OP_SLEEP = 0x9588;
const OP_ERASED = 0xffff;
const IDLE_CAP = 1_000_000;
const YIELD_EVERY = 4096;
const FIRST_ANALOG = 14;
const PIN_COUNT = 20;

const PORT_PINS = {
  B: { first: 8, bits: 6 },
  C: { first: 14, bits: 6 },
  D: { first: 0, bits: 8 },
} as const;

type Level = 0 | 1 | "Z";

const pinName = (n: number): string => (n < FIRST_ANALOG ? `D${n}` : `A${n - FIRST_ANALOG}`);

function pinOf(target: string): number | undefined {
  const m = /^(?:D(\d{1,2})|A([0-5]))$/.exec(target);
  if (!m) return undefined;
  const n = m[1] !== undefined ? Number(m[1]) : FIRST_ANALOG + Number(m[2]);
  return n < PIN_COUNT ? n : undefined;
}

function failed(id: string, message: string): LoadResult {
  return { ok: false, diagnostics: [simDiag(id, "error", {}, { message })], models: [] };
}

type HexResult = { ok: true; flash: Uint8Array } | { ok: false; id: string; message: string };

/** Intel HEX into a 32 KiB flash filled with 0xFF. The importer with named errors and fuzzing is T-B9-08. */
function readHex(text: string): HexResult {
  const flash = new Uint8Array(FLASH_BYTES).fill(0xff);
  let base = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "") continue;
    if (line[0] !== ":" || line.length < 11 || line.length % 2 === 0) return { ok: false, id: "invalid-hex", message: "not an Intel HEX record" };
    const bytes: number[] = [];
    for (let i = 1; i < line.length; i += 2) bytes.push(parseInt(line.slice(i, i + 2), 16));
    const length = bytes[0];
    if (bytes.some(Number.isNaN) || bytes.length !== length + 5) return { ok: false, id: "invalid-hex", message: "a record has the wrong length" };
    if (bytes.reduce((a, b) => a + b, 0) % 256 !== 0) return { ok: false, id: "invalid-hex", message: "a record fails its checksum" };
    const type = bytes[3];
    const data = bytes.slice(4, 4 + length);
    if (type === 1) break;
    if (type === 2) base = ((data[0] << 8) | data[1]) << 4;
    else if (type === 4) base = ((data[0] << 8) | data[1]) * 65536;
    else if (type === 0) {
      const at = base + ((bytes[1] << 8) | bytes[2]);
      if (at + length > FLASH_BYTES) return { ok: false, id: "image-too-large", message: `the image is larger than ${FLASH_BYTES} bytes` };
      flash.set(data, at);
    }
  }
  return { ok: true, flash };
}

interface Machine {
  ctx: AvrContext;
  levels: Level[];
  stop: AvrStopReason | null;
}

class AvrEngineImpl implements AvrEngine {
  readonly id = ENGINE_ID;
  readonly rank = RANK.mcu;
  readonly tier = "T3";
  readonly language: Language = "c-cpp";
  readonly costModel = { kind: "cycle", rate: RATE } as const;
  readonly diagnostics: SimDiagnostic[] = [];
  breakBitmap: Uint8Array | null = null;
  onBreak: ((pc: number) => void) | null = null;
  batches = 0;
  stoppedEarlyBy: AvrStopReason | null = null;
  state: AvrState = "unloaded";
  private readonly adapters: AvrAdapter[] = [];
  private readonly byteListeners: ((byte: number, at: SimTime) => void)[] = [];
  private readonly rxQueue: number[] = [];
  private flash: Uint16Array | null = null;
  private m: Machine | null = null;
  private sink: EventSink | null = null;
  private serialCount = 0;

  private readonly avr: Avr8js;
  readonly board: string;
  private readonly baud: number | undefined;

  constructor(avr: Avr8js, board: string, baud: number | undefined) {
    this.avr = avr;
    this.board = board;
    this.baud = baud;
  }

  get cycles(): number {
    return this.m?.ctx.cpu.cycles ?? 0;
  }

  private get halted(): boolean {
    return this.state === "error";
  }

  private stopOf(m: Machine): AvrStopReason | null {
    return m.stop;
  }

  private get nowNs(): SimTime {
    return cyclesToNs(this.cycles, RATE);
  }

  readonly serial = {
    onByte: (cb: (byte: number, at: SimTime) => void): void => {
      this.byteListeners.push(cb);
    },
  };

  readonly pins: PinPort = {
    read: (pin) => {
      const at = this.locate(pin);
      if (!at) return { mode: "unset", level: 0 };
      const { PinState } = this.avr;
      const state = at.port.pinState(at.bit);
      if (state === PinState.Low) return { mode: "output", level: 0 };
      if (state === PinState.High) return { mode: "output", level: 1 };
      const level = (this.machine().ctx.cpu.data[at.pinRegister] >> at.bit) & 1;
      return { mode: state === PinState.InputPullUp ? "input_pullup" : "input", level: level as 0 | 1 };
    },
    drive: (pin, level) => {
      const at = this.locate(pin);
      at?.port.setPin(at.bit, level === 1);
    },
    driveVolts: (pin, volts) => {
      if (pin >= FIRST_ANALOG && pin < PIN_COUNT) this.machine().ctx.adc.channelValues[pin - FIRST_ANALOG] = volts ?? 0;
    },
  };

  attach(sink: EventSink): void {
    this.sink = sink;
  }

  addAdapter(a: AvrAdapter): void {
    this.adapters.push(a);
    if (this.m) a.attach(this.m.ctx);
  }

  load(image: ProgramImage): LoadResult {
    if (this.board !== "uno-r3" && this.board !== "nano") return failed("unsupported-board", `${this.board} does not run on the AVR engine`);
    if (image.kind !== "hex") return failed("unsupported-image", "the AVR engine runs compiled hex, not source");
    const parsed = readHex(image.hex);
    if (!parsed.ok) return failed(parsed.id, parsed.message);
    this.flash = new Uint16Array(parsed.flash.buffer);
    this.start();
    return { ok: true, diagnostics: [], models: [] };
  }

  reset(): void {
    if (this.flash) this.start();
  }

  nextDue(): SimTime | null {
    return this.state === "loaded" || this.state === "running" || this.state === "paused" ? this.nowNs + NS_PER_MS : null;
  }

  advanceTo(horizon: SimTime, budget: SliceBudget): { reached: SimTime; stoppedEarly: boolean } {
    const m = this.m;
    const now = this.nowNs;
    if (!m || this.halted || horizon <= now) return { reached: Math.max(horizon, now), stoppedEarly: false };
    this.state = "running";
    this.batches++;
    this.stoppedEarlyBy = null;
    m.stop = null;
    for (const a of this.adapters) a.beforeBatch?.(m.ctx);
    const yielded = this.run(m, nsToCycles(horizon, RATE), budget);
    for (const a of this.adapters) a.afterBatch?.(m.ctx);
    if (this.halted) return { reached: horizon, stoppedEarly: false };
    const reason = this.stopOf(m) ?? (yielded ? "budget" : null);
    this.stoppedEarlyBy = reason;
    if (reason === "break") this.state = "paused";
    return reason ? { reached: this.nowNs, stoppedEarly: true } : { reached: horizon, stoppedEarly: false };
  }

  onEvent(e: SimEvent): void {
    if (e.phase !== 0 || !this.m || typeof e.payload !== "object" || e.payload === null) return;
    const { target, value } = e.payload as { target: unknown; value: unknown };
    if (typeof target !== "string") return;
    if (e.kind === "serial") {
      if (typeof value === "string") this.serialWrite(value);
      return;
    }
    const pin = pinOf(target);
    if (pin === undefined) return;
    if (e.kind === "pin" && (value === null || typeof value === "number" || typeof value === "boolean")) {
      this.pins.drive(pin, value === null ? null : value ? 1 : 0);
    } else if (e.kind === "analog" && (value === null || typeof value === "number")) this.pins.driveVolts(pin, value);
  }

  serialWrite(text: string): void {
    for (const byte of utf8Encode(text)) this.rxQueue.push(byte);
    this.pumpRx();
  }

  stateHash(): string {
    const h = new StateHasher().str(this.board).int(this.cycles).int(this.serialCount).str(this.state);
    const cpu = this.m?.ctx.cpu;
    if (cpu) h.int(cpu.pc).int(cpu.SP).int(cpu.SREG).bytes(cpu.data);
    return h.hex();
  }

  private machine(): Machine {
    if (!this.m) throw new Error("load a program before using the pins");
    return this.m;
  }

  private locate(pin: number): { port: AVRIOPort; bit: number; pinRegister: number } | null {
    const { ports } = this.machine().ctx;
    const configs = { B: this.avr.portBConfig, C: this.avr.portCConfig, D: this.avr.portDConfig };
    for (const key of ["B", "C", "D"] as const) {
      const { first, bits } = PORT_PINS[key];
      if (pin >= first && pin < first + bits) return { port: ports[key], bit: pin - first, pinRegister: configs[key].PIN };
    }
    return null;
  }

  private start(): void {
    const avr = this.avr;
    const flash = this.flash;
    if (!flash) return;
    const cpu = new avr.CPU(new Uint16Array(flash), SRAM_BYTES);
    const ports = { B: new avr.AVRIOPort(cpu, avr.portBConfig), C: new avr.AVRIOPort(cpu, avr.portCConfig), D: new avr.AVRIOPort(cpu, avr.portDConfig) };
    const timers = [avr.timer0Config, avr.timer1Config, avr.timer2Config].map((c) => new avr.AVRTimer(cpu, c));
    const usart = new avr.AVRUSART(cpu, avr.usart0Config, CPU_HZ);
    const adc = new avr.AVRADC(cpu, avr.adcConfig);
    const twi = new avr.AVRTWI(cpu, avr.twiConfig, CPU_HZ);
    const spi = new avr.AVRSPI(cpu, avr.spiConfig, CPU_HZ);
    new avr.AVREEPROM(cpu, new avr.EEPROMMemoryBackend(1024));
    const m: Machine = {
      stop: null,
      levels: Array<Level>(PIN_COUNT).fill("Z"),
      ctx: {
        cpu,
        ports,
        usart,
        adc,
        twi,
        spi,
        timers,
        clock: RATE,
        cyclesToNs: (c) => cyclesToNs(c, RATE),
        requestStop: (reason) => {
          m.stop ??= reason;
        },
      },
    };
    if (this.baud) {
      const ubrr = Math.round(CPU_HZ / (16 * this.baud)) - 1;
      cpu.writeData(avr.usart0Config.UBRRH, ubrr >> 8);
      cpu.writeData(avr.usart0Config.UBRRL, ubrr & 0xff);
    }
    this.m = m;
    this.state = "loaded";
    this.diagnostics.length = 0;
    this.stoppedEarlyBy = null;
    this.rxQueue.length = 0;
    this.serialCount = 0;
    this.watchPins(m);
    this.watchSerial(m);
    const read = adc.onADCRead;
    adc.onADCRead = (input) => {
      m.stop ??= "adc";
      read(input);
    };
    for (const a of this.adapters) a.attach(m.ctx);
  }

  private watchPins(m: Machine): void {
    for (const key of ["B", "C", "D"] as const) {
      const port = m.ctx.ports[key];
      const { first, bits } = PORT_PINS[key];
      port.addListener(() => {
        for (let bit = 0; bit < bits; bit++) {
          const state = port.pinState(bit);
          const level: Level = state === this.avr.PinState.High ? 1 : state === this.avr.PinState.Low ? 0 : "Z";
          const pin = first + bit;
          if (m.levels[pin] === level) continue;
          m.levels[pin] = level;
          m.stop ??= "pin";
          this.sink?.emit({
            at: cyclesToNs(m.ctx.cpu.cycles, RATE),
            phase: 2,
            rank: RANK.mcu,
            src: this.id,
            kind: "pin",
            payload: { pin: pinName(pin), level },
          });
        }
      });
    }
  }

  private watchSerial(m: Machine): void {
    const { usart, cpu } = m.ctx;
    usart.onByteTransmit = (byte) => {
      const frame = 1 + usart.bitsPerChar + (usart.parityEnabled ? 1 : 0) + usart.stopBits;
      const at = cyclesToNs(cpu.cycles + Math.round((CPU_HZ / usart.baudRate) * frame), RATE);
      this.serialCount++;
      for (const cb of this.byteListeners) cb(byte, at);
    };
    usart.onRxComplete = () => this.pumpRx();
  }

  private pumpRx(): void {
    const usart = this.m?.ctx.usart;
    if (!usart) return;
    while (this.rxQueue.length > 0 && !usart.rxBusy) {
      if (!usart.writeByte(this.rxQueue[0])) break;
      this.rxQueue.shift();
    }
  }

  /** The host owns the instruction loop (SIMULATION 8.4). Returns true when the budget asked to yield. */
  private run(m: Machine, target: number, budget: SliceBudget): boolean {
    const { cpu } = m.ctx;
    const { avrInstruction } = this.avr;
    const bitmap = this.breakBitmap;
    const flash = cpu.progMem;
    let steps = 0;
    while (cpu.cycles < target && m.stop === null) {
      const word = flash[cpu.pc];
      if (word === OP_ERASED) {
        this.halt(cpu, "avr-illegal-opcode");
        return false;
      }
      avrInstruction(cpu);
      cpu.tick();
      if (word === OP_SLEEP && cpu.data[SMCR] & 1) this.idle(m, target);
      if (bitmap !== null && bitmap[cpu.pc >> 3] & (1 << (cpu.pc & 7))) {
        m.stop = "break";
        this.onBreak?.(cpu.pc);
      }
      if (++steps % YIELD_EVERY === 0) {
        if (cpu.SP < SRAM_START) {
          this.halt(cpu, "avr-stack-overflow");
          return false;
        }
        if (budget.shouldYield()) return true;
      }
    }
    if (cpu.SP < SRAM_START) this.halt(cpu, "avr-stack-overflow");
    return false;
  }

  /** Sleeping skips instruction decode and runs only the clocks until an interrupt is taken. */
  private idle(m: Machine, target: number): void {
    const { cpu } = m.ctx;
    const enabled = cpu.interruptsEnabled;
    for (let n = 0; n < IDLE_CAP && cpu.cycles < target && m.stop === null; n++) {
      cpu.cycles++;
      cpu.tick();
      if (enabled && !cpu.interruptsEnabled) return;
    }
  }

  private halt(cpu: CPU, id: "avr-illegal-opcode" | "avr-stack-overflow"): void {
    this.state = "error";
    this.diagnostics.push({ ...simDiag(id, "error", {}, { cycle: cpu.cycles, pc: cpu.pc }), hint_key: `diag.${id}.hint` });
  }
}

export function createAvrEngine(avr: Avr8js, o: { board: "uno-r3" | "nano"; baud?: number }): AvrEngine {
  return new AvrEngineImpl(avr, o.board, o.baud);
}
