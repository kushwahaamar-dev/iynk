import type { LoopStats } from "../../core/robot-report.ts";
import type { SimTime } from "./ports.ts";

export interface RobotSample {
  atNs: SimTime;
  joint: string;
  speedRadS: number;
  angleRad: number;
  cmdSign: -1 | 0 | 1;
  armatureA: number;
  torqueNm: number;
  surfaceSpeedMps: number;
  groundSpeedMps: number;
  encoderCount?: number;
  tiltDeg: number;
  driverState: string;
}

/** Built by T-B16-40 from `RunFacts.resets`; the engine never sees an MCU reset. */
export interface ResetFact {
  atNs: SimTime;
  packV: number;
  regV: number;
  railV: number;
  motorStartNs: number | null;
}

/** What one sensor read over the run. Line sensors keep channel reflectance 0..1; rangers keep echo distance in mm. */
export interface SensorFact {
  part: string;
  binding: string;
  /** The mount id the sensor's binding names. */
  mount: string;
  kind: "line" | "ranger";
  samples: number;
  min: number | null;
  max: number | null;
  /** Ranger samples with no usable echo. */
  noEcho: number;
  /** Ranger samples where something was nearer than the minimum range and nothing else answered. */
  tooClose: number;
}

/** The static stall check (RB-C-04) as the validator reported it before the run. */
export interface StallFact {
  result: "ok" | "warn" | "fail";
  limitingPart: string | null;
  value: number | null;
  limit: number | null;
}

export interface RobotFacts {
  samples: RobotSample[];
  loopPeriods?: LoopStats;
  /** Target loop period from the project's robot settings. */
  loopTargetNs?: number;
  sensorHeights: Record<string, number>;
  sensors: SensorFact[];
  /** Lowest pack voltage the robot should see before it browns out; unknown without a battery. */
  packMinV?: number;
  /** Lowest logic rail voltage the board accepts. */
  logicMinV?: number;
  stall?: StallFact;
  supply: { atNs: SimTime; v: number }[];
  resets: ResetFact[];
  decimated: boolean;
}

/** Per-cell volts below which a lithium pack browns the robot out. */
export const CELL_MIN_V = 3;

export const MAX_SAMPLES = 20_000;

/** Drops every second entry but always keeps the first and the last. */
function thin<T>(rows: T[]): T[] {
  return rows.filter((_, i) => i % 2 === 0 || i === rows.length - 1);
}

export function createFactsSampler(maxSamples = MAX_SAMPLES) {
  let samples: RobotSample[] = [];
  let supply: RobotFacts["supply"] = [];
  const sensorHeights: Record<string, number> = {};
  const sensors = new Map<string, SensorFact>();
  let decimated = false;

  const squeeze = <T>(rows: T[]): T[] => {
    if (rows.length < maxSamples) return rows;
    decimated = true;
    return thin(rows);
  };

  return {
    push(s: RobotSample): void {
      samples.push(s);
      samples = squeeze(samples);
    },
    pushSupply(atNs: SimTime, v: number): void {
      supply.push({ atNs, v });
      supply = squeeze(supply);
    },
    setSensorHeight(sensor: string, heightMm: number): void {
      sensorHeights[sensor] = heightMm;
    },
    pushReading(key: string, start: Omit<SensorFact, "samples" | "min" | "max" | "noEcho" | "tooClose">, reading: { values: readonly number[]; tooClose?: boolean }): void {
      const fact = sensors.get(key) ?? { ...start, samples: 0, min: null, max: null, noEcho: 0, tooClose: 0 };
      sensors.set(key, fact);
      fact.samples++;
      if (reading.tooClose) fact.tooClose++;
      if (reading.values.length === 0) fact.noEcho++;
      for (const v of reading.values) {
        fact.min = fact.min === null ? v : Math.min(fact.min, v);
        fact.max = fact.max === null ? v : Math.max(fact.max, v);
      }
    },
    facts(): RobotFacts {
      return { samples: [...samples], sensorHeights: { ...sensorHeights }, sensors: [...sensors.values()].map((f) => ({ ...f })), supply: [...supply], resets: [], decimated };
    },
  };
}
