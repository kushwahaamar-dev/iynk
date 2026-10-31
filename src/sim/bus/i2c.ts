import type { SimTime } from "../core/clock.ts";
import { type BusError, type BusId, type BusOp, type BusOptions, type BusResult, type NetId, type NotModelled, isInt, wrongBusKind } from "./index.ts";

export interface I2cBus {
  id: BusId;
  sda: NetId;
  scl: NetId;
  speedHz: number;
  pullupOhms?: number;
  capacitancePf?: number;
}

export interface I2cDevice {
  readonly addresses: number[];
  start(addr7: number, read: boolean): "ack" | "nack";
  write(byte: number): "ack" | "nack";
  read(last: boolean): number;
  stop(): void;
}

export interface I2cOptions extends BusOptions {
  pullup?: "assumed" | "none";
}

export interface I2cBusModel {
  attach(dev: I2cDevice): { ok: true } | BusError;
  detach(dev: I2cDevice): void;
  transact(op: BusOp, atNs: SimTime): BusResult | NotModelled;
  state(): "idle" | "busy" | "stuck-low";
  riseTimeNs(): number | null;
}

const DEFAULT_CAPACITANCE_PF = 50;
const STANDARD_MODE_HZ = 100_000;
const FAST_MODE_HZ = 400_000;
const STANDARD_RISE_LIMIT_NS = 1000;
const FAST_RISE_LIMIT_NS = 300;

const reserved = (addr7: number): boolean => addr7 <= 0x07 || addr7 >= 0x78;

export function createI2cBus(cfg: I2cBus, o: I2cOptions = {}): { ok: true; bus: I2cBusModel } | BusError {
  if (!isInt(cfg.speedHz, 1_000, 1_000_000)) return { ok: false, error: "speed-out-of-range" };
  if (cfg.pullupOhms !== undefined && !(cfg.pullupOhms > 0)) return { ok: false, error: "pullup-out-of-range" };
  if (cfg.capacitancePf !== undefined && !(cfg.capacitancePf > 0)) return { ok: false, error: "capacitance-out-of-range" };
  if (o.pullup === "none" && cfg.pullupOhms !== undefined) return { ok: false, error: "pullup-conflict" };

  const emit = (atNs: SimTime, kind: "nack" | "stuck-low" | "rise-time" | "address-conflict", detail: string): void =>
    o.onEvent?.({ atNs, bus: cfg.id, kind, detail });

  const bitNs = 1e9 / cfg.speedHz;
  const byteNs = Math.round(9 * bitNs);
  const startNs = Math.round(10 * bitNs);
  const stopNs = Math.round(bitNs);
  const stuck = o.pullup === "none";

  const riseNs = cfg.pullupOhms === undefined ? null : 0.8473 * cfg.pullupOhms * (cfg.capacitancePf ?? DEFAULT_CAPACITANCE_PF) * 1e-3;
  const riseLimit = cfg.speedHz <= STANDARD_MODE_HZ ? STANDARD_RISE_LIMIT_NS : cfg.speedHz <= FAST_MODE_HZ ? FAST_RISE_LIMIT_NS : null;
  if (riseNs !== null && riseLimit !== null && riseNs > riseLimit) {
    emit(0, "rise-time", `${Math.round(riseNs)} ns is over the ${riseLimit} ns limit at ${cfg.speedHz} Hz`);
  }

  const devices = new Map<number, I2cDevice>();
  let busy = false;
  let active: I2cDevice | null = null;
  let reading = false;

  const stopActive = (): void => {
    active?.stop();
    active = null;
    busy = false;
  };

  const bus: I2cBusModel = {
    attach(dev) {
      if (!dev.addresses.every((a) => isInt(a, 0, 127))) return { ok: false, error: "address-out-of-range" };
      const taken = dev.addresses.find((a) => devices.has(a));
      if (taken !== undefined) {
        emit(0, "address-conflict", `address 0x${taken.toString(16)} is already taken`);
        return { ok: false, error: "address-conflict" };
      }
      for (const a of dev.addresses) devices.set(a, dev);
      return { ok: true };
    },

    detach(dev) {
      for (const a of dev.addresses) if (devices.get(a) === dev) devices.delete(a);
      if (active === dev) {
        active = null;
        busy = false;
      }
    },

    transact(op, atNs) {
      switch (op.kind) {
        case "i2c-start": {
          if (stuck) return stuckResult(atNs);
          if (busy) stopActive();
          busy = true;
          reading = op.read;
          const dev = reserved(op.addr7) ? undefined : devices.get(op.addr7);
          if (dev?.start(op.addr7, op.read) === "ack") {
            active = dev;
            return { ack: true, costNs: startNs };
          }
          emit(atNs, "nack", `no ack from address 0x${op.addr7.toString(16)}`);
          return { ack: false, costNs: startNs };
        }
        case "i2c-write": {
          if (stuck) return stuckResult(atNs);
          if (!busy) {
            emit(atNs, "nack", "write before a start condition");
            return { ack: false, costNs: 0 };
          }
          if (active === null || reading) return { ack: false, costNs: byteNs };
          return { ack: active.write(op.byte & 0xff) === "ack", costNs: byteNs };
        }
        case "i2c-read": {
          if (stuck) return stuckResult(atNs);
          if (active === null || !reading) return { byte: 0xff, costNs: byteNs };
          return { byte: active.read(op.last) & 0xff, costNs: byteNs };
        }
        case "i2c-stop": {
          if (stuck) return stuckResult(atNs);
          stopActive();
          return { costNs: stopNs };
        }
        default:
          return wrongBusKind;
      }
    },

    state: () => (stuck ? "stuck-low" : busy ? "busy" : "idle"),
    riseTimeNs: () => riseNs,
  };

  const stuckResult = (atNs: SimTime): BusResult => {
    emit(atNs, "stuck-low", "SDA and SCL have no pull-up");
    return { ack: false, costNs: 0 };
  };

  return { ok: true, bus };
}
