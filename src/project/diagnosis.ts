/** 0 = no hint opened; 1 where to look; 2 what to measure; 3 the cause (SIMULATION 13.4). */
export type HintLevel = 0 | 1 | 2 | 3;

export interface Evidence {
  kind: "pin-level" | "net-voltage" | "branch-current" | "serial-line" | "state" | "timeline";
  ref: string;
  /** Simulation time in integer nanoseconds. */
  at: number;
  value: number | string;
  unit?: string;
  provenance: "computed" | "approximation" | "mocked";
  tier: "T0" | "T1" | "T2" | "T3";
  modelIds: string[];
}

/** D-010. `cause_id` is a core id from `src/sim/faults/cause-ids.ts` or an extension id (`EXTENSION_CAUSE_ID`). */
export interface Diagnosis {
  cause_id: string;
  symptom_id: string;
  evidence: Evidence[];
  hint_level: HintLevel;
}

export const EXTENSION_CAUSE_ID = /^x-[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
