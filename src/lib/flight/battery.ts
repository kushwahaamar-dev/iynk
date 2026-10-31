import { CELL_LIMITS, NOMINAL_CELL, OCV_PER_CELL, defaultCellResistance, ocvAt } from "@/sim/flight/battery";
import type { CalcOutputs, Chemistry } from "./types";

export { NOMINAL_CELL };

export const LIMITS: Record<Chemistry, { low: number; cut: number }> = CELL_LIMITS;

export function ocv(chem: Chemistry, soc: number): number {
  return ocvAt(OCV_PER_CELL[chem], soc);
}

export function cellResistance(chem: Chemistry, mah: number): number {
  return defaultCellResistance(chem, mah);
}

export interface BatteryState {
  used: number; // mAh
  volt: number; // pack volts under load
  amps: number;
  low: boolean;
  empty: boolean;
  cutTimer: number; // s spent below the cut-off
}

export function freshBattery(c: CalcOutputs): BatteryState {
  const chem = c.chemistry ?? "lipo";
  return { used: 0, volt: c.cells * ocv(chem, 1), amps: 0, low: false, empty: false, cutTimer: 0 };
}

/**
 * Current drawn at a given thrust (as a fraction of the craft's weight).
 * The exponent is chosen so that hover draws calc.hoverAmps and full thrust
 * calc.maxAmps on a nominal pack; a sagging pack draws more for the same thrust.
 */
export function currentFor(c: CalcOutputs, thrustOverWeight: number, volt: number): number {
  const tw = 1 / Math.max(1e-4, c.hoverThrottle * c.hoverThrottle);
  const ratio = c.maxAmps / Math.max(1e-3, c.hoverAmps);
  const e = ratio > 1.01 && tw > 1.01 ? Math.log(ratio) / Math.log(tw) : 1.4;
  const vnom = c.cells * NOMINAL_CELL;
  return c.hoverAmps * Math.pow(Math.max(0, thrustOverWeight), e) * (vnom / Math.max(0.5 * vnom, volt));
}

export const IDLE_AMPS = 0.4; // FC, receiver and video while armed

export type BatteryNews = "low" | "empty" | null;

/** Advances the pack by dt with `amps` flowing. Returns news when a threshold is crossed. */
export function stepBattery(b: BatteryState, c: CalcOutputs, amps: number, dt: number): BatteryNews {
  const chem = c.chemistry ?? "lipo";
  b.amps = amps;
  b.used += (amps * dt) / 3.6;
  const soc = 1 - b.used / c.mah;
  const sag = amps * cellResistance(chem, c.mah);
  b.volt = c.cells * Math.max(0, ocv(chem, soc) - sag);
  const perCell = b.volt / c.cells;
  const lim = LIMITS[chem];
  let news: BatteryNews = null;
  if (!b.low && perCell < lim.low) {
    b.low = true;
    news = "low";
  }
  // A punch-out can dip below the cut-off for a moment; the ESCs cut after 0.5 s, or at once when the pack is flat.
  b.cutTimer = perCell < lim.cut ? b.cutTimer + dt : 0;
  if (!b.empty && (b.cutTimer > 0.5 || soc <= 0)) {
    b.empty = true;
    news = "empty";
  }
  return news;
}

/** Thrust scale from pack voltage: rpm follows volts, thrust follows rpm squared. */
export function voltageFactor(c: CalcOutputs, volt: number): number {
  const v = volt / (c.cells * NOMINAL_CELL);
  return v * v;
}
