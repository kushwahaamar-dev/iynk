import type { Descriptor, Trust } from "../../parts/descriptor.ts";
import type { Text } from "../../parts/generated/types.ts";
import type { RuntimeEntries } from "./entries.ts";
import { allowedTier, tierRank } from "./tiers.ts";
import type { FidelityEntry, ParameterSource, Phenomenon, Tier } from "./types.ts";

type Slot = { unit: string; value?: number; typ?: number; min?: number; max?: number; source?: { src: string; loc?: string } };

/** The English text when there is one, otherwise the key the copy files translate. */
export function textOf(text: Text): string {
  return text.en ?? text.i18n_key ?? Object.values(text).find((t) => t !== undefined) ?? "";
}

const phenomena = (prefix: string, texts: readonly Text[]): Phenomenon[] => texts.map((t, i) => ({ id: `${prefix}-${i + 1}`, text: textOf(t) }));

const refOf = (source: Slot["source"]): string | undefined => (source ? (source.loc ? `${source.src} ${source.loc}` : source.src) : undefined);

function parameterSources(ratings: Descriptor["ratings"]): ParameterSource[] {
  const out: ParameterSource[] = [];
  for (const [param, rating] of Object.entries(ratings)) {
    if (!rating) continue;
    const slots: [Slot | undefined, ParameterSource["type"]][] = [
      [rating.manufacturer as Slot | undefined, "datasheet"],
      [rating.simulation as Slot | undefined, (rating.simulation as { derived_from?: string[] } | undefined)?.derived_from ? "fit" : "assumption"],
      [rating.measured as Slot | undefined, "measurement"],
    ];
    for (const [slot, type] of slots) {
      if (!slot) continue;
      const value = slot.value ?? slot.typ ?? slot.min ?? slot.max;
      if (value === undefined) continue;
      const ref = refOf(slot.source);
      out.push({ param, value, unit: slot.unit, type, ...(ref ? { ref } : {}) });
    }
  }
  return out;
}

/** A core part keeps the tier it asserts. Anything a person loaded is capped at T1. */
export function assertedTier(def: Descriptor, origin: Trust): Tier {
  const tier: Tier = def.simulation.tier === "none" ? "T0" : def.simulation.tier;
  return origin === "core" || tierRank(tier) <= tierRank("T1") ? tier : "T1";
}

/** The part-model entry for a descriptor. `validation` stays empty (CI writes it from `tests[]`), so the tier is also held to what the evidence in the entry supports. */
export function entryFromDescriptor(def: Descriptor, origin: Trust): FidelityEntry {
  const sim = def.simulation;
  const sources = parameterSources(def.ratings);
  const scripted = (def.failure_modes ?? []).filter((m) => m.implemented_as === "scripted");
  const mocked = [
    ...phenomena("mocked", sim.mocked ?? []),
    ...scripted.map((m) => ({ id: `scripted-${m.id}`, text: textOf(m.name ?? m.effect.detail ?? m.derivation) })),
  ];
  const entry: FidelityEntry = {
    id: `part:${def.id}@${def.version.split(".")[0]}`,
    version: def.version,
    kind: "part-model",
    title: def.identity.model,
    tier: assertedTier(def, origin),
    layers: ["L4"],
    implements: phenomena("modelled", sim.what_it_models),
    mocked,
    unsupported: phenomena("not-modelled", sim.not_modelled),
    parameterSources: sources,
    validation: [],
    errorMetrics: [],
    operatingRange: (sim.validity ?? []).map((v) => ({ quantity: v.measure, min: v.min, max: v.max, unit: v.unit, evidence: v.note ? textOf(v.note) : def.id })),
    knownFailureCases: (sim.known_gaps ?? []).map((g) => textOf(g.text)),
    performance: [],
    labels: { chip: "", summary: sources.some((p) => p.type === "assumption") ? "fidelity.summary.assumed" : "fidelity.summary" },
    status: sim.status === "not-modelled-yet" ? "planned" : "active",
  };
  const tier = tierRank(allowedTier(entry)) < tierRank(entry.tier) ? allowedTier(entry) : entry.tier;
  return { ...entry, tier, labels: { ...entry.labels, chip: `fidelity.tier.${tier}` } };
}

/** Adds the entries of the given parts to a runtime registry. Core parts are written to disk by the generator instead. */
export function registerPartEntries(reg: RuntimeEntries, defs: readonly Descriptor[], origin: Exclude<Trust, "core">): void {
  for (const def of defs) reg.add(entryFromDescriptor(def, origin), origin);
}
