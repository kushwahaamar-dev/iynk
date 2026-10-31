import type { SimTime } from "../core/clock.ts";
import { type BusError, type BusId, type BusOptions, type BusResult, type NetId, type NotModelled, isInt, unmodelled } from "./index.ts";

export interface UartLink {
  id: BusId;
  tx: NetId;
  rx: NetId;
  baud: number;
  format: "8N1" | "8E1" | "8N2";
}

export interface UartDevice {
  baud: number;
  receive(byte: number): void;
}

export interface UartLinkModel {
  attachDevice(d: UartDevice): { ok: true } | BusError;
  send(byte: number, atNs: SimTime): BusResult | NotModelled;
}

const BAUD_TOLERANCE = 0.03;

const garble = (byte: number): number => (byte * 167 + 13) & 0xff;

export function createUartLink(cfg: UartLink, o: BusOptions = {}): { ok: true; link: UartLinkModel } | BusError {
  if (!isInt(cfg.baud, 300, 3_000_000)) return { ok: false, error: "baud-out-of-range" };

  const bits = cfg.format === "8N1" ? 10 : 11;
  const byteNs = Math.round((bits * 1e9) / cfg.baud);
  let device: UartDevice | null = null;

  const link: UartLinkModel = {
    attachDevice(d) {
      if (!isInt(d.baud, 300, 3_000_000)) return { ok: false, error: "baud-out-of-range" };
      if (device) return { ok: false, error: "device-conflict" };
      device = d;
      return { ok: true };
    },

    send(byte, atNs) {
      if (!device) return unmodelled(cfg.id, `no device on ${cfg.rx}`, byteNs, atNs, o);
      let delivered = byte & 0xff;
      if (Math.abs(cfg.baud - device.baud) / device.baud > BAUD_TOLERANCE) {
        delivered = garble(delivered);
        o.onEvent?.({ atNs, bus: cfg.id, kind: "baud-mismatch", detail: `sender at ${cfg.baud} baud, device at ${device.baud}` });
      }
      device.receive(delivered);
      return { byte: delivered, costNs: byteNs };
    },
  };

  return { ok: true, link };
}
