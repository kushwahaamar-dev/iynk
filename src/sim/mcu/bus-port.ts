import type { SimTime } from "../core/clock.ts";
import { type BusEvent, type BusOp, type BusResult, type NotModelled, type StubPolicy } from "../bus/index.ts";
import { type I2cBusModel, type I2cDevice, createI2cBus } from "../bus/i2c.ts";
import { createSpiBus } from "../bus/spi.ts";

const MIN_I2C_HZ = 1_000;
const MAX_I2C_HZ = 1_000_000;
const DEFAULT_I2C_HZ = 100_000;
const SPI_HZ = 1_000_000;

/** A register-level device written for the interpreter: whole writes and whole reads, no bus timing of its own. */
export interface LegacyI2cDevice {
  readonly address: number;
  write(bytes: number[]): void;
  read(n: number): number[];
}

export interface InterpBusOptions {
  speedHz?: number;
  stubPolicy?: StubPolicy;
  onEvent?: (e: BusEvent) => void;
  /** Virtual time in microseconds, for the events the bus emits. */
  nowUs?: () => number;
}

export interface I2cTransfer {
  ack: boolean;
  bytes: number[];
  costUs: number;
  error?: "nack-address" | "nack-data" | "stuck-low";
}

export interface InterpBus {
  attachLegacy(dev: LegacyI2cDevice): void;
  /** Applies a new I2C clock, clamped to 1 kHz to 1 MHz, and returns the speed in effect. */
  setClock(hz: number): number;
  /** One I2C transaction: write `write` to `addr7`, then read `readN` bytes after a repeated start. */
  i2c(addr7: number, write: number[], readN: number): I2cTransfer;
  spi(byte: number): { byte: number; costUs: number } | NotModelled;
}

/** Turns a whole-write, whole-read device into a byte-wise one: writes go out at STOP or the next START, a read is fetched at START. */
function adaptLegacy(dev: LegacyI2cDevice, readSize: () => number): I2cDevice {
  let pending: number[] = [];
  let writing = false;
  let incoming: number[] = [];

  const flush = (): void => {
    if (!writing) return;
    dev.write(pending);
    pending = [];
    writing = false;
  };

  return {
    addresses: [dev.address],
    start(_addr7, read) {
      flush();
      if (read) incoming = dev.read(readSize());
      else writing = true;
      return "ack";
    },
    write(byte) {
      pending.push(byte);
      return "ack";
    },
    read() {
      return incoming.shift() ?? 0xff;
    },
    stop: flush,
  };
}

export function createInterpBus(o: InterpBusOptions = {}): InterpBus {
  const nowNs = (): SimTime => Math.round((o.nowUs?.() ?? 0) * 1000);
  const busOptions = { stubPolicy: o.stubPolicy, onEvent: o.onEvent };
  let readN = 0;
  const attached: I2cDevice[] = [];
  let speedHz = DEFAULT_I2C_HZ;
  let i2cModel: I2cBusModel;

  const build = (hz: number): void => {
    const made = createI2cBus({ id: "i2c0", sda: "sda", scl: "scl", speedHz: hz }, busOptions);
    if (!made.ok) throw new Error(`i2c bus refused ${hz} Hz: ${made.error}`);
    i2cModel = made.bus;
    for (const dev of attached) i2cModel.attach(dev);
    speedHz = hz;
  };

  const made = createSpiBus({ id: "spi0", sck: "sck", mosi: "mosi", miso: "miso", mode: 0, hz: SPI_HZ, bitOrder: "msb" }, busOptions);
  if (!made.ok) throw new Error(`spi bus refused ${SPI_HZ} Hz: ${made.error}`);
  const spiModel = made.bus;

  const step = (op: BusOp): BusResult => {
    const r = i2cModel.transact(op, nowNs());
    if ("notModelled" in r) throw new Error(`i2c bus returned ${r.reason}`);
    return r;
  };

  build(o.speedHz === undefined ? DEFAULT_I2C_HZ : Math.min(MAX_I2C_HZ, Math.max(MIN_I2C_HZ, Math.round(o.speedHz))));

  return {
    attachLegacy(dev) {
      const adapter = adaptLegacy(dev, () => readN);
      const res = i2cModel.attach(adapter);
      if (res.ok) attached.push(adapter);
    },

    setClock(hz) {
      const clamped = Math.min(MAX_I2C_HZ, Math.max(MIN_I2C_HZ, Math.round(hz)));
      if (clamped !== speedHz) build(clamped);
      return clamped;
    },

    i2c(addr7, write, n) {
      readN = n;
      let costNs = 0;
      const bytes: number[] = [];
      let error: I2cTransfer["error"];

      const send = (op: BusOp): BusResult => {
        const r = step(op);
        costNs += r.costNs;
        return r;
      };
      const open = (read: boolean): boolean => {
        if (send({ kind: "i2c-start", addr7, read }).ack) return true;
        error = i2cModel.state() === "stuck-low" ? "stuck-low" : "nack-address";
        return false;
      };

      if (write.length > 0 || n === 0) {
        if (open(false)) {
          for (const byte of write) {
            if (!send({ kind: "i2c-write", byte }).ack) {
              error = "nack-data";
              break;
            }
          }
        }
      }
      if (!error && n > 0 && open(true)) {
        for (let i = 0; i < n; i++) bytes.push(send({ kind: "i2c-read", last: i === n - 1 }).byte ?? 0xff);
      }
      send({ kind: "i2c-stop" });

      return { ack: !error, bytes, costUs: costNs / 1000, error };
    },

    spi(byte) {
      const r = spiModel.transact({ kind: "spi-transfer", cs: "cs", byte }, nowNs());
      if ("notModelled" in r) return r;
      return { byte: r.byte ?? 0xff, costUs: r.costNs / 1000 };
    },
  };
}
