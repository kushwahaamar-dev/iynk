import type { Descriptor, Trust } from "./descriptor.ts";
import { validateDescriptor } from "./descriptor.ts";
import type { Quantity } from "./generated/types.ts";
import { qualityLabels } from "./trust.ts";
import type { QualityLabels } from "./trust.ts";
import { resolveLayers } from "../sim/models/kinds.ts";
import type { ModelEnv, NoneReason } from "../sim/models/kinds.ts";

type SlotName = "manufacturer" | "simulation" | "measured";

export interface SlotFact {
  value: Quantity;
  sourceId?: string;
  sourceTitle?: string;
  loc?: string;
  url?: string;
  rationale?: string;
  confidence?: "low" | "medium" | "high";
  unsourced: boolean;
}

export interface RatingFact {
  key: string;
  measure: string;
  role: string;
  slots: Partial<Record<SlotName, SlotFact>>;
  usedByModel: SlotName | "none";
}

export interface LayerFact {
  id: string;
  domain: string;
  kind: string;
  element?: string;
  ref?: string;
  noneReason?: NoneReason;
  detail?: string;
  equationKey?: string;
}

export interface PartFacts {
  id: string;
  version: string;
  name: string;
  trust: Trust;
  tier: string;
  status: string;
  whatItModels: string[];
  notModelled: string[];
  knownGaps: { id: string; text: string; evidence?: string }[];
  validity: string[];
  ratings: RatingFact[];
  layers: LayerFact[];
  sources: { id: string; kind: string; reliability: string; title: string; url?: string; retrieved?: string }[];
  unsourcedNumbers: string[];
  tests: { id: string; kind: string; state: "present" | "to-write"; file: string }[];
  labels: QualityLabels;
  license: string;
  thirdPartyContent: boolean;
  versions: readonly string[];
}

/** The solver's rule for each element kind it has today, as `figures/engine/bench-solve.js` applies it. */
export const ELEMENT_EQUATIONS: Readonly<Record<string, string>> = {
  wire: "V = 0 between the two ends",
  res: "V = I x R",
  pot: "R1 = R x pos, R2 = R x (1 - pos)",
  button: "closed: V = 0, open: I = 0",
  led: "I = (V - Vf) / rd for V above Vf, else 0",
  diode: "I = (V - Vf) / rd for V above Vf, else 0",
  npn: "Ic = hfe x Ib until Vce = Vcesat",
  motor: "I = V x g, with g found from the motor's current at that voltage",
  servo: "I = V x g, with g from the idle or moving current",
  stepper: "I = V / R for each coil whose far end is pulled low",
  sensor: "Vout = fixed output while the supply is within its range",
  buzzer: "active: I = (V - Vf) / rd for V above Vf, else 0",
};

const textOf = (text: Record<string, string | undefined> | undefined): string =>
  text === undefined ? "" : (text.en ?? Object.values(text).find((v) => v !== undefined) ?? "");

function quantityOf(slot: Quantity): Quantity {
  const { unit, value, min, typ, max } = slot;
  return { unit, ...(value !== undefined && { value }), ...(min !== undefined && { min }), ...(typ !== undefined && { typ }), ...(max !== undefined && { max }) };
}

function slotFact(name: SlotName, slot: Quantity & { source?: { src: string; loc?: string }; rationale?: Record<string, string | undefined>; confidence?: "low" | "medium" | "high" }, def: Descriptor): SlotFact {
  const source = slot.source === undefined ? undefined : def.sources.find((s) => s.id === slot.source?.src);
  return {
    value: quantityOf(slot),
    ...(slot.source && { sourceId: slot.source.src }),
    ...(source && { sourceTitle: source.title }),
    ...(slot.source?.loc !== undefined && { loc: slot.source.loc }),
    ...(source?.url !== undefined && { url: source.url }),
    ...(slot.rationale && { rationale: textOf(slot.rationale) }),
    ...(slot.confidence && { confidence: slot.confidence }),
    unsourced: name === "simulation" && slot.source === undefined,
  };
}

function ratingFacts(def: Descriptor): RatingFact[] {
  const out: RatingFact[] = [];
  for (const [key, rating] of Object.entries(def.ratings)) {
    if (rating === undefined) continue;
    const slots: RatingFact["slots"] = {};
    if (rating.manufacturer) slots.manufacturer = slotFact("manufacturer", rating.manufacturer, def);
    if (rating.simulation) slots.simulation = slotFact("simulation", rating.simulation, def);
    if (rating.measured) slots.measured = slotFact("measured", rating.measured, def);
    out.push({ key, measure: rating.measure, role: rating.role, slots, usedByModel: rating.used_by_model });
  }
  return out;
}

function layerFacts(def: Descriptor, env: ModelEnv): LayerFact[] {
  const resolved = resolveLayers(def, {}, env).layers;
  return def.behaviour.layers.map((layer, i) => {
    const { model } = layer;
    const result = resolved[i];
    return {
      id: layer.id,
      domain: layer.domain,
      kind: model.kind,
      ...(model.kind === "element" && { element: model.element }),
      ...(model.kind === "builtin" && { ref: model.ref }),
      ...(result?.kind === "none" && { noneReason: result.reason, detail: result.detail }),
      ...(model.kind === "element" && model.element in ELEMENT_EQUATIONS && { equationKey: model.element }),
    };
  });
}

function unsourcedOf(def: Descriptor, ratings: readonly RatingFact[]): string[] {
  const out = ratings.filter((r) => r.slots.simulation?.unsourced).map((r) => `ratings.${r.key}.simulation`);
  for (const layer of def.behaviour.layers) {
    const { model } = layer;
    if (model.kind !== "element" && model.kind !== "builtin") continue;
    for (const [name, param] of Object.entries(model.params ?? {})) {
      if (param?.value !== undefined && param.source === undefined) out.push(`layers.${layer.id}.params.${name}`);
    }
  }
  for (const [name, block] of Object.entries(def.mechanics ?? {})) {
    if (typeof block === "object" && block !== null && !Array.isArray(block) && !("source" in block)) out.push(`mechanics.${name}`);
  }
  return out;
}

/** Everything the part page shows, read from the descriptor alone. */
export function partFacts(def: Descriptor, trust: Trust, env: ModelEnv, versions: readonly string[]): PartFacts {
  const { simulation } = def;
  const ratings = ratingFacts(def);
  return {
    id: def.id,
    version: def.version,
    name: `${def.identity.manufacturer} ${def.identity.model}`,
    trust,
    tier: simulation.tier,
    status: simulation.status,
    whatItModels: simulation.what_it_models.map(textOf),
    notModelled: simulation.not_modelled.map(textOf),
    knownGaps: (simulation.known_gaps ?? []).map((gap) => ({ id: gap.id, text: textOf(gap.text), ...(gap.evidence !== undefined && { evidence: gap.evidence }) })),
    validity: (simulation.validity ?? []).map((v) => `${v.measure}: ${v.min}–${v.max} ${v.unit}${v.note ? `. ${textOf(v.note)}` : ""}`),
    ratings,
    layers: layerFacts(def, env),
    sources: def.sources.map((s) => ({
      id: s.id,
      kind: s.kind,
      reliability: s.reliability,
      title: s.title,
      ...(s.url !== undefined && { url: s.url }),
      ...(s.retrieved !== undefined && { retrieved: s.retrieved }),
    })),
    unsourcedNumbers: unsourcedOf(def, ratings),
    tests: (simulation.tests ?? []).map((t) => ({ id: t.id, kind: t.kind, state: t.state ?? "present", file: t.file })),
    labels: qualityLabels(def, validateDescriptor(def, { ctx: { trust } }).diagnostics),
    license: def.provenance.license,
    thirdPartyContent: def.provenance.third_party_content === true,
    versions,
  };
}
