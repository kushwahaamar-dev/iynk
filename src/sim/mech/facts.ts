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

export interface RobotFacts {
  samples: RobotSample[];
  loopPeriods?: LoopStats;
  sensorHeights: Record<string, number>;
  supply: { atNs: SimTime; v: number }[];
  resets: ResetFact[];
  decimated: boolean;
}

export const MAX_SAMPLES = 20_000;

/** Drops every second entry but always keeps the first and the last. */
function thin<T>(rows: T[]): T[] {
  return rows.filter((_, i) => i % 2 === 0 || i === rows.length - 1);
}

export function createFactsSampler(maxSamples = MAX_SAMPLES) {
  let samples: RobotSample[] = [];
  let supply: RobotFacts["supply"] = [];
  const sensorHeights: Record<string, number> = {};
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
    facts(): RobotFacts {
      return { samples: [...samples], sensorHeights: { ...sensorHeights }, supply: [...supply], resets: [], decimated };
    },
  };
}
