import type { SimTime } from "../core/clock.ts";
import { NS_PER_MS } from "../core/clock.ts";
import type { Descriptor } from "../../parts/descriptor.ts";
import type { ElementV, SourceLimit } from "./types.ts";

/** The most a USB port gives before the 5 V rail sags. */
export const USB_LIMIT: SourceLimit = { amps: 0.5, mode: "droop" };

const HYSTERESIS_VOLTS = 0.1;
const MIN_DWELL_NS = 10 * NS_PER_MS;
const RESET_NS = 50 * NS_PER_MS;
const BISECTIONS = 30;
const MAX_DOUBLINGS = 60;

export interface BoardPower {
  boardId: string;
  /** The pin id of the rail the chip runs from; empty when the board states no minimum. */
  mcuRail: string;
  vccMinVolts: number | null;
  hysteresisVolts: number;
  minDwellNs: number;
  resetNs: number;
  source: string;
}

/** The `vcc_min` rating names the chip's rail in its scope and the voltage below which the chip resets. */
export function readBoardPower(descriptor: Descriptor): BoardPower {
  const rating = descriptor.ratings.vcc_min;
  const slot = rating && rating.used_by_model !== "none" ? rating[rating.used_by_model] : undefined;
  const volts = slot?.value;
  const known = typeof volts === "number" && Number.isFinite(volts);
  return {
    boardId: descriptor.id,
    mcuRail: known ? (rating?.scope?.pins?.[0] ?? "") : "",
    vccMinVolts: known ? volts : null,
    hysteresisVolts: HYSTERESIS_VOLTS,
    minDwellNs: MIN_DWELL_NS,
    resetNs: RESET_NS,
    source: slot?.source?.loc ?? "",
  };
}

export type LimitedSource = ElementV & { limit: SourceLimit };

export const isLimited = (el: ElementV): el is LimitedSource => el.limit?.mode === "droop";

/**
 * The series resistance that holds the source at its current limit. `solveWith` solves the circuit with that
 * resistance and returns the amps the source then carries, which only falls as the resistance rises.
 */
export function droopSource(el: LimitedSource, solveWith: (rSeriesOhms: number) => number): number {
  const target = el.limit.amps;
  let lo = Math.max(el.rSeriesOhms, 1e-3);
  if (solveWith(lo) <= target) return el.rSeriesOhms;
  let hi = lo * 2;
  for (let i = 0; i < MAX_DOUBLINGS && solveWith(hi) > target; i++) {
    lo = hi;
    hi *= 2;
  }
  for (let i = 0; i < BISECTIONS; i++) {
    const mid = (lo + hi) / 2;
    if (solveWith(mid) > target) lo = mid;
    else hi = mid;
  }
  return hi;
}

export type RailState = "ok" | "low" | "reset" | "recovering";

export interface Brownout {
  step(volts: number, at: SimTime): RailState;
}

/**
 * ok to low when the rail drops under the threshold, low to reset once it has stayed there for the dwell, held in reset
 * for `resetNs` and for as long as the rail is under threshold plus hysteresis, then recovering for one step.
 */
export function createBrownout(p: { thresholdVolts: number; hysteresisVolts: number; minDwellNs: number; resetNs: number }): Brownout {
  let state: RailState = "ok";
  let since: SimTime = 0;
  return {
    step(volts, at) {
      switch (state) {
        case "ok":
        case "recovering":
          if (volts < p.thresholdVolts) {
            state = "low";
            since = at;
          } else {
            state = "ok";
          }
          break;
        case "low":
          if (volts >= p.thresholdVolts) state = "ok";
          else if (at - since >= p.minDwellNs) {
            state = "reset";
            since = at;
          }
          break;
        case "reset":
          if (at - since >= p.resetNs && volts >= p.thresholdVolts + p.hysteresisVolts) state = "recovering";
          break;
      }
      return state;
    },
  };
}
