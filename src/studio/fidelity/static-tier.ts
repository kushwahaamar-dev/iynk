import type { Project as ProjectState } from "../../project/generated/types.ts";
import type { Descriptor } from "../../parts/descriptor.ts";
import { PROFILES } from "../../lib/interp/profiles.ts";
import type { BoardId } from "../../lib/interp/profiles.ts";

export type Tier = "T0" | "T1" | "T2" | "T3" | "none";
export type ModelStatus = "modelled" | "partly-modelled" | "not-modelled-yet";

export interface ModelRow {
  c: string;
  name: string;
  tier: Tier;
  status: ModelStatus;
  models: string[];
  notModelled: string[];
}

/** The part of the registry this module reads; `PartRegistry` satisfies it. */
export interface PartLookup {
  get(ref: string, version: string): Descriptor | undefined;
}

/** Name of a row whose definition the registry does not hold; the panel swaps in the translated words. */
export const UNKNOWN_PART = "unknown part";

const RANK: Record<Exclude<Tier, "none">, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };
const CORE_PREFIX = "core.";

/** The weakest tier in use. Rows without a tier are skipped unless every row is without one. */
export function lowestTier(rows: ModelRow[]): Tier {
  let lowest: Tier = "none";
  for (const { tier } of rows) {
    if (tier !== "none" && (lowest === "none" || RANK[tier] < RANK[lowest])) lowest = tier;
  }
  return lowest;
}

const textOf = (text: Record<string, string | undefined>): string => text.en ?? Object.values(text).find((v) => v !== undefined) ?? "";

function rowOf(c: string, definition: { ref: string; version: string }, registry: PartLookup): ModelRow {
  const part = registry.get(definition.ref, definition.version);
  if (!part) return { c, name: UNKNOWN_PART, tier: "none", status: "not-modelled-yet", models: [], notModelled: [] };
  const { simulation, identity } = part;
  return {
    c,
    name: identity.model,
    tier: simulation.tier,
    status: simulation.status,
    models: simulation.what_it_models.map(textOf),
    notModelled: simulation.not_modelled.map(textOf),
  };
}

/** One row per board and component, in document order. */
export function modelRows(state: ProjectState, registry: PartLookup): ModelRow[] {
  return [...state.boards, ...state.components].map((item) => rowOf(item.id, item.definition, registry));
}

/** B4 runs one engine; `boardNotes` come from the profile of each board that has one. */
export function engineLine(state: ProjectState): { engineKey: "arduino-subset-digital"; boardNotes: string[] } {
  const boardNotes = state.boards.flatMap((board) => {
    const { ref } = board.definition;
    if (!ref.startsWith(CORE_PREFIX)) return [];
    return PROFILES[ref.slice(CORE_PREFIX.length) as BoardId]?.notes ?? [];
  });
  return { engineKey: "arduino-subset-digital", boardNotes: [...new Set(boardNotes)] };
}
