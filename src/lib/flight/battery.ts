import type { CalcOutputs, Chemistry } from "./types";

// Open-circuit voltage per cell against state of charge, 0..1 in steps of 0.1.
const OCV: Record<Chemistry, number[]> = {
  lipo: [3.0, 3.6, 3.7, 3.75, 3.79, 3.83, 3.87, 3.92, 4.0, 4.08, 4.2],
  lihv: [3.0, 3.62, 3.74, 3.8, 3.86, 3.91, 3.97, 4.04, 4.12, 4.22, 4.35],
  liion: [2.8, 3.3, 3.45, 3.55, 3.62, 3.68, 3.75, 3.84, 3.94, 4.05, 4.2],
};

/** Warning and cut-off voltages per cell, under load. */
export const LIMITS: Record<Chemistry, { low: number; cut: number }> = {
  lipo: { low: 3.5, cut: 3.2 },
  lihv: { low: 3.55, cut: 3.25 },
  liion: { low: 3.1, cut: 2.9 },
};

/** Internal resistance per cell (ohm) times capacity (Ah): a bigger pack sags less. */
const IR_AH: Record<Chemistry, number> = { lipo: 0.0066, lihv: 0.0066, liion: 0.08 };

export const NOMINAL_CELL = 3.7;

export function ocv(chem: Chemistry, soc: number): number {
  const t = OCV[chem];
  const s = Math.max(0, Math.min(1, soc)) * 10;
  const i = Math.min(9, Math.floor(s));
  return t[i] + (t[i + 1] - t[i]) * (s - i);
}

export function cellResistance(chem: Chemistry, mah: number): number {
  return IR_AH[chem] / Math.max(0.05, mah / 1000);
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
