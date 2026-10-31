import type { SimTime } from "../core/clock.ts";

export type BusId = string;
export type NetId = string;

export interface NotModelled {
  notModelled: true;
  reason: string;
  causeId: "bus-device-not-modelled";
}

export type BusOp =
  | { kind: "i2c-start"; addr7: number; read: boolean }
  | { kind: "i2c-write"; byte: number }
  | { kind: "i2c-read"; last: boolean }
  | { kind: "i2c-stop" }
  | { kind: "spi-transfer"; cs: NetId; byte: number }
  | { kind: "uart-byte"; byte: number };

export interface BusResult {
  ack?: boolean;
  byte?: number;
  costNs: SimTime;
}

export interface BusPort {
  transact(bus: BusId, op: BusOp): BusResult | NotModelled;
}

export type StubPolicy = "fail" | "warn";

export interface BusEvent {
  atNs: SimTime;
  bus: BusId;
  kind: "nack" | "stuck-low" | "no-pullup" | "rise-time" | "not-modelled" | "spi-mode" | "baud-mismatch" | "address-conflict" | "expr-nan" | "part-not-powered" | "open-connection" | "swapped-pins";
  detail: string;
}

export interface BusOptions {
  stubPolicy?: StubPolicy;
  onEvent?: (e: BusEvent) => void;
}

export type BusError = { ok: false; error: string };

/** What a bus answers when no model is behind the call: a failure by default, `0xFF` and an event under `warn`. */
export function unmodelled(
  bus: BusId,
  reason: string,
  costNs: SimTime,
  atNs: SimTime,
  o: BusOptions,
): BusResult | NotModelled {
  if (o.stubPolicy === "warn") {
    o.onEvent?.({ atNs, bus, kind: "not-modelled", detail: reason });
    return { byte: 0xff, costNs };
  }
  return { notModelled: true, reason, causeId: "bus-device-not-modelled" };
}

export const wrongBusKind: NotModelled = { notModelled: true, reason: "wrong-bus-kind", causeId: "bus-device-not-modelled" };

export const isInt = (n: number, min: number, max: number): boolean => Number.isInteger(n) && n >= min && n <= max;
