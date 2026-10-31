import type { Locale } from "../i18n/config.ts";
import type { Diagnosis } from "../project/diagnosis.ts";
import type { Project } from "../project/generated/types.ts";
import type { PartRegistry } from "../parts/registry.ts";

export type Tier = "T0" | "T1" | "T2" | "T3" | "not-modelled";

export interface Reading {
  target: string;
  value: number | string;
  unit: string;
  tier: Tier;
  provenance: string;
}

export interface RunSnapshot {
  phase: "idle" | "starting" | "running" | "stopped" | "done" | "error" | "limit" | "killed";
  stale: boolean;
  tNs: number;
  readings: readonly Reading[];
  pins: readonly { target: string; level: "HIGH" | "LOW" | "Z" | "PWM" }[];
  serial: readonly { tNs: number; kind: "out" | "in" | "sys"; text: string }[];
  diagnostics: readonly { message: string; code?: string; file?: string; line?: number }[];
  solver: { converged: boolean; note?: string } | null;
}

export type TraceResult =
  | {
      ok: true;
      unit: string;
      tier: Tier;
      provenance: string;
      buckets: readonly { tMs: number; min: number; max: number }[];
    }
  | { ok: false; code: "unknown_target" | "not_modelled" | "no_run" };

/** Stand-in until `src/sim/faults/seal.ts` (T-B10-19) exports the real type. */
export interface ItemState {
  itemId: string;
  phase: string;
}

/** Stand-in until `src/sim/faults/rules.ts` (T-B10-03) exports the real type. */
export interface RuleFinding {
  ruleId: string;
  targets: readonly string[];
}

export type PartRegistryView = Pick<PartRegistry, "get" | "latest" | "versions" | "list" | "has">;

/** Everything the partner may read. Each call returns the current state; nothing here writes. */
export interface PartnerSources {
  locale(): Locale;
  project(): { revision: number; stateHash: string; doc: Project };
  selection(): readonly string[];
  run(): RunSnapshot | null;
  trace(target: string, fromMs: number, toMs: number, maxPoints: number): TraceResult;
  diagnoses(): readonly Diagnosis[];
  itemState(): ItemState | null;
  registry(): PartRegistryView;
  rules(scope?: readonly string[]): readonly RuleFinding[];
  actors(): ReadonlyMap<string, string>;
}
