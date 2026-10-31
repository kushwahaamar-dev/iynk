import type { Descriptor } from "../../parts/descriptor.ts";
import type { Condition, FailureMode, InjectableFault, Quantity } from "../../parts/generated/types.ts";
import { textOf } from "../registry/from-descriptor.ts";
import type { FailureModel } from "./models.ts";
import type { CauseId } from "./types.ts";

export interface InjectableFaultRef {
  id: string;
  partId: string;
  kind: InjectableFault["kind"];
  causeId: string;
  symptomIds: string[];
  legacyId?: string;
  target?: InjectableFault["target"];
  description?: string;
  hints: { level: 1 | 2 | 3; text: string }[];
}

const MEASURE: Record<Condition["measure"], (target: string) => string> = {
  pin_voltage: (t) => `v(${t})`,
  pin_voltage_reverse: (t) => `vrev(${t})`,
  pin_current: (t) => `avg(i(${t}))`,
  pin_current_peak: (t) => `peak(i(${t}))`,
  part_power: (t) => `p(${t})`,
  junction_temperature: (t) => `tj(${t})`,
  case_temperature: (t) => `tc(${t})`,
  stall_duration: (t) => `stall(${t})`,
  supply_time_out_of_range: (t) => `supply_out_of_range(${t})`,
};

const STATE: Record<FailureMode["effect"]["state"], FailureModel["outcome"]["state"]> = {
  burnt: "open",
  open_circuit: "open",
  short_circuit: "short",
  degraded: "derated",
  latched_off: "shutdown",
  thermal_cutout: "shutdown",
  derated: "derated",
  reset: "shutdown",
  reads_zero: "derated",
};

const REFERENCE_KIND = { manufacturer: "datasheet", measured: "bench" } as const;

const numberOf = (q: Quantity): number => q.value ?? q.typ ?? q.min ?? q.max ?? 0;

function thresholdText(t: Condition["threshold"]): string {
  if (t.literal) return String(numberOf(t.literal));
  if (!t.rating) throw new Error("a threshold needs a rating or a literal");
  const rating = t.pick && t.pick !== "value" ? `rating.${t.rating}.${t.pick}` : `rating.${t.rating}`;
  return t.factor === undefined ? rating : `${t.factor} * ${rating}`;
}

function conditionText(c: Condition): string {
  return `${MEASURE[c.measure](c.target)} ${c.op} ${thresholdText(c.threshold)}`;
}

function sustainNs(conditions: readonly Condition[]): number | undefined {
  const spans = conditions.flatMap((c) => {
    if (!c.for) return [];
    if (c.for.unit !== "s") throw new Error(`a "for" window must be in seconds, not ${c.for.unit}`);
    return [numberOf(c.for) * 1e9];
  });
  return spans.length === 0 ? undefined : Math.max(...spans);
}

const slug = (key: string): string => key.replace(/_/g, "-");

function failureModel(def: Descriptor, mode: FailureMode): FailureModel {
  const major = def.version.split(".")[0];
  const window = sustainNs(mode.when);
  const reference = mode.source && mode.basis !== "simulation-assumption" ? [{ kind: REFERENCE_KIND[mode.basis], ref: mode.source.loc ? `${mode.source.src} ${mode.source.loc}` : mode.source.src }] : [];
  return {
    id: `failure:${def.id}.${slug(mode.id)}@${major}`,
    causeId: mode.cause_id as CauseId,
    appliesTo: [def.id, ...(def.identity.legacy_ids ?? [])],
    trigger: mode.when.map(conditionText).join(" && "),
    ...(window === undefined ? {} : { window: { sustainNs: window } }),
    outcome: { state: STATE[mode.effect.state], latch: mode.effect.latched },
    derivation: { text: textOf(mode.derivation), sourceIds: mode.source ? [mode.source.src] : [] },
    referenceData: reference,
    assumptions: [],
    evidenceRange: [],
    threshold: { kind: "fixed" },
    message: {
      symptomId: mode.symptom_ids[0],
      i18nKey: mode.effect.detail?.i18n_key ?? mode.derivation.i18n_key ?? `${def.id}.failure.${mode.id}`,
    },
    implementedAs: mode.implemented_as === "scripted" ? "scripted" : "threshold",
    ...(mode.hints ? { hints: mode.hints.map((h) => ({ level: h.level, text: textOf(h.text) })) } : {}),
  };
}

/** The models a descriptor authors. Modes marked `not-implemented` are documentation only and are left out. */
export function failureModelsFromDescriptor(def: Descriptor): FailureModel[] {
  return (def.failure_modes ?? []).filter((m) => m.implemented_as !== "not-implemented").map((m) => failureModel(def, m));
}

export function injectableFaultsFromDescriptor(def: Descriptor): InjectableFaultRef[] {
  return (def.injectable_faults ?? []).map((f) => ({
    id: `${def.id}.${f.id}`,
    partId: def.id,
    kind: f.kind,
    causeId: f.cause_id,
    symptomIds: f.symptom_ids,
    ...(f.legacy_id ? { legacyId: f.legacy_id } : {}),
    ...(f.target ? { target: f.target } : {}),
    ...(f.description ? { description: textOf(f.description) } : {}),
    hints: (f.hints ?? []).map((h) => ({ level: h.level, text: textOf(h.text) })),
  }));
}
