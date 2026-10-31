import { inRange, tierRank } from "../registry/tiers.ts";
import type { Registry, Tier } from "../registry/types.ts";
import type { DeviceState } from "../analog/types.ts";
import { roundSig } from "../analog/states.ts";
import type { Provenance, Reading } from "./tap.ts";

export interface ProvenanceContext {
  /** Device states of the elements the reading comes from. */
  states: Readonly<Record<string, DeviceState>>;
  /** `current_A` and `voltage_V` of those elements. */
  quantities: Readonly<Record<string, number>>;
}

const STATE_PREFIX = (state: DeviceState): string => `state:${state}:`;

/** What produced a reading and how far to trust it. The registry entries decide; nothing is tabled here. */
export function provenanceFor(modelIds: readonly string[], ctx: ProvenanceContext, reg: Registry): { provenance: Provenance; tier: Tier; noteKey?: string } {
  const entries = modelIds.map((id) => reg.get(id));
  if (entries.length === 0 || entries.some((e) => e === undefined || e.status === "planned")) {
    return { provenance: "not-modelled", tier: "T0", noteKey: "fidelity.reading.notModelled" };
  }
  const known = entries.flatMap((e) => (e ? [e] : []));
  const tier = known.reduce<Tier>((low, e) => (tierRank(e.tier) < tierRank(low) ? e.tier : low), known[0].tier);
  const prefixes = Object.values(ctx.states).map(STATE_PREFIX);
  for (const e of known) {
    if (Object.entries(ctx.quantities).some(([quantity, value]) => inRange(e, quantity, value) === false)) {
      return { provenance: "approximation", tier, noteKey: "fidelity.reading.outsideRange" };
    }
    if (e.knownFailureCases.some((text) => prefixes.some((prefix) => text.startsWith(prefix)))) {
      return { provenance: "approximation", tier, noteKey: "fidelity.reading.knownGap" };
    }
  }
  return { provenance: "computed", tier };
}

/** Significant digits to show: T0 shows no number, T3 shows the exact quantity. */
export function digitsFor(tier: Tier): number | null {
  if (tier === "T1") return 2;
  if (tier === "T2") return 4;
  return null;
}

type Translate = (key: string, args?: Record<string, string | number>) => string;

/** A `null` reading prints no digit at all. */
export function formatReading(r: Reading, t: Translate): { text: string; aria: string } {
  if (r.value === null) {
    const text = t("fidelity.reading.notModelled");
    return { text, aria: text };
  }
  const digits = digitsFor(r.tier);
  let shown: string;
  if (typeof r.value !== "number") shown = String(r.value);
  else if (r.tier === "T0") shown = t("fidelity.reading.noNumber");
  else shown = String(digits === null ? r.value : roundSig(r.value, digits));
  const text = r.unit && typeof r.value === "number" && r.tier !== "T0" ? `${shown} ${r.unit}` : shown;
  return { text, aria: `${text}, ${t(`fidelity.provenance.${r.provenance}`)}, ${t(`fidelity.tier.${r.tier}`)}` };
}
