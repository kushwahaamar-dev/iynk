import type { Project } from "../../project/generated/types.ts";
import { tierRank } from "./tiers.ts";
import type { Layer, Registry, Tier } from "./types.ts";

export interface LayerTier {
  layer: "execution" | "circuit" | "protocols" | "mechanics";
  tier: Tier | "none";
  entryIds: string[];
  unmodelled: string[];
}

export interface ProjectFidelity {
  layers: LayerTier[];
  summary: Tier | "none";
}

type LayerName = LayerTier["layer"];

const LAYER_ORDER: readonly LayerName[] = ["execution", "circuit", "protocols", "mechanics"];

const LAYERS_OF: Record<LayerName, readonly Layer[]> = {
  execution: ["L5"],
  circuit: ["L4"],
  protocols: ["L6"],
  mechanics: ["L7", "L8"],
};

/** The engine ids a project document names are open strings; these are the ones that have an entry. */
const ENGINE_ENTRY: Record<string, string> = {
  "iynk-interp": "runtime:arduino-subset@1",
  "iynk-mna": "engine:mna-dc-pwl@1.0.0",
};

const lowest = (tiers: readonly Tier[]): Tier | "none" => tiers.reduce<Tier | "none">((low, tier) => (low === "none" || tierRank(tier) < tierRank(low) ? tier : low), "none");

/**
 * One tier per layer, and a summary equal to the lowest. A model id or engine with no entry is listed
 * as unmodelled and does not lower the tier. `modelsOf` gives the model ids of a part descriptor.
 */
export function projectFidelity(doc: Project, reg: Registry, modelsOf: (descriptorId: string) => readonly string[]): ProjectFidelity {
  const found = new Map<LayerName, { entryIds: Set<string>; tiers: Tier[]; unmodelled: Set<string> }>();
  const bucket = (layer: LayerName) => {
    let slot = found.get(layer);
    if (!slot) found.set(layer, (slot = { entryIds: new Set(), tiers: [], unmodelled: new Set() }));
    return slot;
  };

  const add = (id: string, fallback: LayerName): void => {
    const entry = reg.get(id);
    if (!entry) {
      bucket(fallback).unmodelled.add(id);
      return;
    }
    for (const layer of LAYER_ORDER) {
      if (!LAYERS_OF[layer].some((l) => entry.layers.includes(l))) continue;
      const slot = bucket(layer);
      if (slot.entryIds.has(entry.id)) continue;
      slot.entryIds.add(entry.id);
      slot.tiers.push(entry.tier);
    }
  };

  const addEngine = (engine: string, fallback: LayerName): void => add(ENGINE_ENTRY[engine] ?? engine, fallback);

  const { runtimes, solver, physics } = doc.simulation;
  for (const runtime of runtimes) addEngine(runtime.engine, "execution");
  addEngine(solver.engine, "circuit");
  if (physics) addEngine(physics.engine, "mechanics");
  const descriptors = new Set([...doc.boards, ...doc.components].map((part) => part.definition.ref));
  for (const descriptor of descriptors) for (const id of modelsOf(descriptor)) add(id, "circuit");

  const layers = LAYER_ORDER.flatMap((layer): LayerTier[] => {
    const slot = found.get(layer);
    return slot ? [{ layer, tier: lowest(slot.tiers), entryIds: [...slot.entryIds], unmodelled: [...slot.unmodelled] }] : [];
  });
  return { layers, summary: lowest(layers.flatMap((l) => (l.tier === "none" ? [] : [l.tier]))) };
}
