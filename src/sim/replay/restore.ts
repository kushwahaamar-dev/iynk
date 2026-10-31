import type { SimTime } from "../core/clock.ts";
import type { OrchestratorSnapshot, SliceBudget } from "../engine.ts";
import type { Orchestrator } from "../orchestrator.ts";
import { estimateWork, type Keyframes } from "./keyframes.ts";
import type { ReplayRecord } from "./record.ts";

export interface RestoreBudget {
  statements: number;
}

export type RestoreResult =
  | { ok: true; at: SimTime; replayedFrom: SimTime }
  | { ok: false; reason: "engine-version" | "doc-hash" | "too-long" | "unsupported-engine" | "hash-mismatch" };

/** A fresh orchestrator for the same project, loaded and at t = 0. */
export type EngineFactory = () => Orchestrator;

export const DEFAULT_RESTORE_BUDGET: RestoreBudget = { statements: 50_000_000 };

const NEVER_YIELD: SliceBudget = {
  shouldYield: () => false,
  work: { statements: Infinity, events: Infinity, outputBytes: Infinity },
};

const major = (version: string): string => version.split(".")[0];

/**
 * Brings `o` back to the moment of `s`. A scratch orchestrator replays the recorded inputs from t = 0; `o` is left
 * unchanged unless the scratch ends on the snapshot's state hash. The analog solver is reproduced by the same replay,
 * not restored from its snapshot: `LiveAnalog.restore` resets the rail states, which a replay keeps exactly.
 */
export function restoreSnapshot(
  o: Orchestrator,
  s: OrchestratorSnapshot,
  rec: ReplayRecord,
  make: EngineFactory,
  budget: RestoreBudget = DEFAULT_RESTORE_BUDGET,
  keyframes?: Keyframes,
): RestoreResult {
  if (s.docHash !== rec.docHash) return { ok: false, reason: "doc-hash" };

  const scratch = make();
  const known = new Map(scratch.snapshot({ docHash: s.docHash, logCursor: s.logCursor }).engines.map((e) => [e.engine, e]));
  for (const saved of s.engines) {
    const here = known.get(saved.engine);
    if (!here) return { ok: false, reason: "unsupported-engine" };
    if (major(here.engineVersion) !== major(saved.engineVersion)) return { ok: false, reason: "engine-version" };
  }

  if (estimateWork(keyframes?.nearest(s.at) ?? null, s.at) > budget.statements) return { ok: false, reason: "too-long" };

  for (const input of rec.inputs.slice(0, s.logCursor)) {
    scratch.runUntil(input.at, NEVER_YIELD);
    scratch.inject({ kind: input.kind, target: input.target, value: input.value });
  }
  scratch.runUntil(s.at, NEVER_YIELD);

  const replayed = scratch.snapshot({ docHash: s.docHash, logCursor: s.logCursor });
  if (scratch.now !== s.at || replayed.stateHash !== s.stateHash) return { ok: false, reason: "hash-mismatch" };

  o.adopt(scratch);
  return { ok: true, at: s.at, replayedFrom: 0 };
}
