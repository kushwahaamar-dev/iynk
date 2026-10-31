import { type Change, type NetId, type PartId, pinElementId } from "../analog/live.ts";
import type { SimNetlist } from "../engine.ts";

/** Emitted when a board pin's mode, level or PWM setting changes. */
export interface PinChange {
  board: PartId;
  pin: string;
  level: 0 | 1 | "Z";
  pwm?: { duty: number; hz: number };
}

export interface BoardPinOwner {
  board: PartId;
  net: NetId;
}

/** The board and net behind each pin name. As in the digital layer, the first board with a pin of that name wins. */
export function boardPinOwners(net: SimNetlist): Map<string, BoardPinOwner> {
  const owners = new Map<string, BoardPinOwner>();
  for (const part of net.parts) {
    if (part.kind !== "board") continue;
    for (const [pin, target] of Object.entries(part.pins)) {
      if (target !== null && !owners.has(pin)) owners.set(pin, { board: part.id, net: target });
    }
  }
  return owners;
}

export function analogChangeOf(c: PinChange): Change {
  const element = pinElementId(c.board, c.pin);
  return c.pwm ? { kind: "pwm", element, duty: c.pwm.duty, hz: c.pwm.hz } : { kind: "pin", element, level: c.level };
}
