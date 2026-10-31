import type { AVRIOPort } from "avr8js";
import type { SimTime } from "../core/clock.ts";
import type { NetId } from "../bus/index.ts";
import type { AvrAdapter, AvrContext } from "./avr8js.ts";

export type PinMode = "in" | "in-pullup" | "out" | "pwm" | "analog";
export type PinLevel = "high" | "low" | "z";
export type PortName = "B" | "C" | "D";

export interface PinSink {
  drive(net: NetId, level: PinLevel, strength: "strong" | "weak", atNs: SimTime): void;
  mode(net: NetId, mode: PinMode, atNs: SimTime): void;
}

export interface PinSource {
  level(net: NetId): 0 | 1 | null;
  volts(net: NetId): number | null;
}

export interface PinSnapshot {
  atNs: SimTime;
  pins: Record<string, { mode: string; level: 0 | 1; duty?: number; hz?: number }>;
}

export type PinMap = Record<string, { port: PortName; bit: number }>;

export interface PinAdapterOptions {
  map: PinMap;
  sink: PinSink;
  source: PinSource;
  vref: number;
  onSnapshot(s: PinSnapshot): void;
}

/** Arduino numbering on the ATmega328P: D0 to D7 on PORTD, D8 to D13 on PORTB, A0 to A5 on PORTC. */
export const UNO_PIN_MAP: PinMap = Object.fromEntries([
  ...Array.from({ length: 8 }, (_, i) => [`D${i}`, { port: "D", bit: i }] as const),
  ...Array.from({ length: 6 }, (_, i) => [`D${8 + i}`, { port: "B", bit: i }] as const),
  ...Array.from({ length: 6 }, (_, i) => [`A${i}`, { port: "C", bit: i }] as const),
]);

/** avr8js `PinState`, restated so the adapter needs no runtime import of the package. */
const STATE_LOW = 0;
const STATE_HIGH = 1;
const STATE_INPUT = 2;
const STATE_PULLUP = 3;

const SNAPSHOT_EVERY_NS = 33_333_333;
const PWM_MAX_PERIOD_NS = 16_000_000;
const PWM_MIN_EDGES = 8;
const PWM_PERIODS = 8;
const RING = 64;
const ADC_SINGLE_ENDED = 0;

class EdgeRing {
  private readonly times = new Float64Array(RING);
  private readonly levels = new Uint8Array(RING);
  private head = 0;
  count = 0;
  total = 0;

  clear(): void {
    this.head = 0;
    this.count = 0;
    this.total = 0;
  }

  push(at: SimTime, level: 0 | 1): void {
    this.times[this.head] = at;
    this.levels[this.head] = level;
    this.head = (this.head + 1) % RING;
    if (this.count < RING) this.count++;
    this.total++;
  }

  get lastAt(): SimTime {
    return this.times[(this.head + RING - 1) % RING];
  }

  /** Duty and frequency over the last 8 periods, or what exists when there are fewer. */
  measure(): { duty: number; hz: number; periodNs: number } | null {
    const at = (i: number) => (this.head + RING - this.count + i) % RING;
    const rising: number[] = [];
    for (let i = 0; i < this.count; i++) if (this.levels[at(i)] === 1) rising.push(i);
    const used = rising.slice(-(PWM_PERIODS + 1));
    if (used.length < 2) return null;
    const first = used[0];
    const last = used[used.length - 1];
    const start = this.times[at(first)];
    const span = this.times[at(last)] - start;
    if (span <= 0) return null;
    let high = 0;
    let cursor = start;
    let level = 1;
    for (let i = first + 1; i <= last; i++) {
      const t = this.times[at(i)];
      if (level === 1) high += t - cursor;
      cursor = t;
      level = this.levels[at(i)];
    }
    const periods = used.length - 1;
    const prev = this.times[at(used[used.length - 2])];
    return { duty: high / span, hz: (periods * 1e9) / span, periodNs: this.times[at(last)] - prev };
  }
}

interface Pin {
  net: NetId;
  port: PortName;
  bit: number;
  state: number;
  mode: PinMode;
  ring: EdgeRing;
}

const levelOf = (state: number): 0 | 1 => (state === STATE_HIGH ? 1 : 0);

function checkMap(map: PinMap): void {
  for (const [net, { port, bit }] of Object.entries(map)) {
    if (port !== "B" && port !== "C" && port !== "D") throw new RangeError(`${net}: unknown port ${String(port)}`);
    if (!Number.isInteger(bit) || bit < 0 || bit > 7) throw new RangeError(`${net}: bit ${bit} is outside 0 to 7`);
  }
}

export function createPinAdapter(o: PinAdapterOptions): AvrAdapter {
  checkMap(o.map);
  let ctx: AvrContext | null = null;
  let pins: Pin[] = [];
  let analog = new Set<number>();
  let dirty = false;
  let lastSnapshotAt: SimTime | null = null;

  const nowNs = (c: AvrContext): SimTime => c.cyclesToNs(c.cpu.cycles);

  const wantedMode = (p: Pin): PinMode => {
    if (p.state === STATE_PULLUP) return "in-pullup";
    if (p.state === STATE_INPUT) return p.port === "C" && analog.has(p.bit) ? "analog" : "in";
    return p.ring.total >= PWM_MIN_EDGES && p.ring.count > 0 ? "pwm" : "out";
  };

  const refresh = (p: Pin, at: SimTime): void => {
    const mode = wantedMode(p);
    if (mode === p.mode) return;
    p.mode = mode;
    dirty = true;
    o.sink.mode(p.net, mode, at);
  };

  const expire = (c: AvrContext, p: Pin): void => {
    if (p.ring.count === 0 || p.state > STATE_HIGH) return;
    const at = nowNs(c);
    const measured = p.ring.measure();
    const quiet = at - p.ring.lastAt > PWM_MAX_PERIOD_NS;
    if (quiet || (measured !== null && measured.periodNs > PWM_MAX_PERIOD_NS)) {
      p.ring.clear();
      refresh(p, at);
    }
  };

  const scan = (c: AvrContext, port: PortName): void => {
    const at = nowNs(c);
    for (const p of pins) {
      if (p.port !== port) continue;
      const state = c.ports[port].pinState(p.bit);
      if (state === p.state) continue;
      p.state = state;
      dirty = true;
      if (state === STATE_LOW || state === STATE_HIGH) {
        p.ring.push(at, levelOf(state));
        o.sink.drive(p.net, state === STATE_HIGH ? "high" : "low", "strong", at);
      } else {
        p.ring.clear();
        o.sink.drive(p.net, state === STATE_PULLUP ? "high" : "z", "weak", at);
      }
      refresh(p, at);
    }
  };

  const levelAt = (c: AvrContext, p: Pin): 0 | 1 => {
    if (p.state <= STATE_HIGH) return levelOf(p.state);
    const port: AVRIOPort = c.ports[p.port];
    return ((c.cpu.data[port.portConfig.PIN] >> p.bit) & 1) as 0 | 1;
  };

  const snapshot = (c: AvrContext): void => {
    const out: PinSnapshot["pins"] = {};
    for (const p of pins) {
      const entry: PinSnapshot["pins"][string] = { mode: p.mode, level: levelAt(c, p) };
      if (p.mode === "pwm") {
        const m = p.ring.measure();
        if (m) {
          entry.duty = m.duty;
          entry.hz = m.hz;
        }
      }
      out[p.net] = entry;
    }
    o.onSnapshot({ atNs: nowNs(c), pins: out });
  };

  return {
    id: "avr-pins",
    attach(c) {
      ctx = c;
      analog = new Set();
      dirty = false;
      lastSnapshotAt = null;
      pins = Object.entries(o.map).map(([net, { port, bit }]) => ({
        net,
        port,
        bit,
        state: STATE_INPUT,
        mode: "in",
        ring: new EdgeRing(),
      }));
      for (const port of ["B", "C", "D"] as const) c.ports[port].addListener(() => scan(c, port));
      const read = c.adc.onADCRead;
      c.adc.onADCRead = (input) => {
        if (input.type === ADC_SINGLE_ENDED && !analog.has(input.channel)) {
          analog.add(input.channel);
          const at = nowNs(c);
          for (const p of pins) if (p.port === "C" && p.bit === input.channel) refresh(p, at);
        }
        read(input);
      };
    },
    beforeBatch(c) {
      for (const p of pins) {
        if (p.port === "C") {
          const volts = o.source.volts(p.net);
          if (volts !== null) c.adc.channelValues[p.bit] = Math.min(Math.max(volts, 0), o.vref);
        }
        if (p.state === STATE_INPUT || p.state === STATE_PULLUP) {
          const level = o.source.level(p.net);
          if (level !== null) c.ports[p.port].setPin(p.bit, level === 1);
        }
      }
    },
    afterBatch(c) {
      if (ctx !== c) return;
      for (const p of pins) expire(c, p);
      const at = nowNs(c);
      if (dirty && (lastSnapshotAt === null || at - lastSnapshotAt >= SNAPSHOT_EVERY_NS)) {
        dirty = false;
        lastSnapshotAt = at;
        snapshot(c);
      }
    },
  };
}
