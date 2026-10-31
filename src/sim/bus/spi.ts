import type { SimTime } from "../core/clock.ts";
import { type BusError, type BusId, type BusOp, type BusOptions, type BusResult, type NetId, type NotModelled, isInt, unmodelled, wrongBusKind } from "./index.ts";

export interface SpiBus {
  id: BusId;
  sck: NetId;
  mosi: NetId;
  miso: NetId;
  mode: 0 | 1 | 2 | 3;
  hz: number;
  bitOrder: "msb" | "lsb";
}

export interface SpiDevice {
  cs: NetId;
  transfer(mosi: number): number;
  select(): void;
  deselect(): void;
}

export type SpiMode = 0 | 1 | 2 | 3;

export interface SpiBusModel {
  attach(dev: SpiDevice & { modes: SpiMode[] }): { ok: true } | BusError;
  detach(dev: SpiDevice): void;
  deselect(cs: NetId): void;
  transact(op: BusOp, atNs: SimTime): BusResult | NotModelled;
}

export function createSpiBus(cfg: SpiBus, o: BusOptions = {}): { ok: true; bus: SpiBusModel } | BusError {
  if (!isInt(cfg.hz, 1_000, 50_000_000)) return { ok: false, error: "speed-out-of-range" };
  if (!isInt(cfg.mode, 0, 3)) return { ok: false, error: "mode-out-of-range" };

  const byteNs = Math.round(8e9 / cfg.hz);
  const devices = new Map<NetId, SpiDevice & { modes: SpiMode[] }>();
  let selected: NetId | null = null;

  const bus: SpiBusModel = {
    attach(dev) {
      if (devices.has(dev.cs)) return { ok: false, error: "cs-conflict" };
      devices.set(dev.cs, dev);
      return { ok: true };
    },

    detach(dev) {
      if (devices.get(dev.cs) !== dev) return;
      if (selected === dev.cs) selected = null;
      devices.delete(dev.cs);
    },

    deselect(cs) {
      if (selected !== cs) return;
      devices.get(cs)?.deselect();
      selected = null;
    },

    transact(op, atNs) {
      if (op.kind !== "spi-transfer") return wrongBusKind;
      const dev = devices.get(op.cs);
      if (!dev) return unmodelled(cfg.id, `no device on chip select ${op.cs}`, byteNs, atNs, o);

      if (selected !== op.cs) {
        if (selected !== null) devices.get(selected)?.deselect();
        selected = op.cs;
        dev.select();
      }
      if (!dev.modes.includes(cfg.mode)) {
        o.onEvent?.({ atNs, bus: cfg.id, kind: "spi-mode", detail: `bus is in mode ${cfg.mode}, the device takes ${dev.modes.join(", ")}` });
        return { byte: 0xff, costNs: byteNs };
      }
      return { byte: dev.transfer(op.byte & 0xff) & 0xff, costNs: byteNs };
    },
  };

  return { ok: true, bus };
}
