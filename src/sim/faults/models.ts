import { fail, ok } from "../../core/result.ts";
import type { Result } from "../../core/result.ts";
import type { Descriptor } from "../../parts/descriptor.ts";
import { isCauseId } from "./cause-ids.ts";
import { parseTrigger } from "./expr.ts";
import { failureModelsFromDescriptor } from "./from-descriptor.ts";
import { isSymptomId } from "./symptoms.ts";
import type { CauseId } from "./types.ts";
import data from "./data/failure-models.json" with { type: "json" };

export interface FailureModel {
  id: string;
  causeId: CauseId;
  appliesTo: string[];
  trigger: string;
  window?: { sustainNs: number };
  outcome: { state: "open" | "short" | "derated" | "shutdown"; params?: Record<string, number>; latch: boolean };
  derivation: { text: string; equation?: string; sourceIds: string[] };
  referenceData: { kind: "datasheet" | "bench" | "oracle"; ref: string; revision?: string }[];
  assumptions: string[];
  evidenceRange: { quantity: string; min: number; max: number; unit: string }[];
  threshold: { kind: "fixed" } | { kind: "distribution"; dist: "normal" | "lognormal"; sigmaFraction: number; stream: string };
  message: { symptomId: string; i18nKey: string };
  /** Set on models compiled from a descriptor; `scripted` ones are driven by a timer or a flag, not by the trigger. */
  implementedAs?: "threshold" | "scripted";
  hints?: { level: 1 | 2 | 3; text: string }[];
}

export type BadModel = { code: "bad-model"; path: string };

const ID = /^[a-z0-9:.-]+@[0-9]+$/;
const STATES: readonly unknown[] = ["open", "short", "derated", "shutdown"];
const REFERENCE_KINDS: readonly unknown[] = ["datasheet", "bench", "oracle"];
const DISTRIBUTIONS: readonly unknown[] = ["normal", "lognormal"];

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v !== "";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const isList = (v: unknown, each: (item: Obj) => boolean): boolean => Array.isArray(v) && v.every((x) => isObj(x) && each(x));

/** The first JSON path that breaks the FailureModel shape, or undefined when the record is sound. */
function firstBadPath(m: Obj): string | undefined {
  if (!isStr(m.id) || !ID.test(m.id)) return "/id";
  if (!isStr(m.causeId) || !isCauseId(m.causeId)) return "/causeId";
  if (!isStrings(m.appliesTo) || m.appliesTo.length === 0) return "/appliesTo";
  if (!isStr(m.trigger) || !parseTrigger(m.trigger).ok) return "/trigger";
  if (m.window !== undefined && !(isObj(m.window) && isNum(m.window.sustainNs) && m.window.sustainNs > 0)) return "/window";
  const o = m.outcome;
  if (!isObj(o) || !STATES.includes(o.state) || typeof o.latch !== "boolean") return "/outcome";
  if (o.params !== undefined && !(isObj(o.params) && Object.values(o.params).every(isNum))) return "/outcome/params";
  const d = m.derivation;
  if (!isObj(d) || !isStr(d.text)) return "/derivation/text";
  if (d.equation !== undefined && !isStr(d.equation)) return "/derivation/equation";
  if (!Array.isArray(d.sourceIds) || !d.sourceIds.every(isStr)) return "/derivation/sourceIds";
  if (!isList(m.referenceData, (r) => REFERENCE_KINDS.includes(r.kind) && isStr(r.ref) && (r.revision === undefined || isStr(r.revision)))) {
    return "/referenceData";
  }
  if (!isStrings(m.assumptions)) return "/assumptions";
  if (!isList(m.evidenceRange, (r) => isStr(r.quantity) && isNum(r.min) && isNum(r.max) && isStr(r.unit))) return "/evidenceRange";
  const t = m.threshold;
  if (!isObj(t)) return "/threshold";
  if (t.kind === "distribution") {
    if (!DISTRIBUTIONS.includes(t.dist) || !isNum(t.sigmaFraction) || !isStr(t.stream)) return "/threshold";
  } else if (t.kind !== "fixed") {
    return "/threshold/kind";
  }
  const msg = m.message;
  if (!isObj(msg) || !isStr(msg.symptomId) || !isSymptomId(msg.symptomId)) return "/message/symptomId";
  if (!isStr(msg.i18nKey)) return "/message/i18nKey";
  return undefined;
}

export function validateFailureModel(m: unknown): Result<FailureModel, BadModel> {
  if (!isObj(m)) return fail({ code: "bad-model", path: "" });
  const path = firstBadPath(m);
  return path === undefined ? ok(m as unknown as FailureModel) : fail({ code: "bad-model", path });
}

const MODELS: readonly FailureModel[] = (data as unknown[]).map((raw, i) => {
  const r = validateFailureModel(raw);
  if (!r.ok) throw new Error(`failure-models.json[${i}]${r.error.path}: bad failure model`);
  return r.value;
});

const isDuplicate = (record: FailureModel, made: readonly FailureModel[]): FailureModel | undefined =>
  made.find((m) => m.causeId === record.causeId && record.appliesTo.some((a) => !a.startsWith("family:") && m.appliesTo.includes(a)));

/** The data records plus the models the given descriptors author. Where both describe one failure the descriptor wins and `log` names the ignored record. */
export function loadFailureModels(defs: readonly Descriptor[] = [], log: (line: string) => void = () => {}): FailureModel[] {
  const made = defs.flatMap(failureModelsFromDescriptor);
  const kept = MODELS.filter((record) => {
    const twin = isDuplicate(record, made);
    if (twin) log(`failure-models.json ${record.id} is ignored in favour of ${twin.id}`);
    return !twin;
  });
  return [...kept, ...made];
}

export function modelsFor(causeId: CauseId): FailureModel[] {
  return MODELS.filter((m) => m.causeId === causeId);
}

/** A model with no reference data was never compared with anything, so its label must say so. */
export function labelKey(m: FailureModel): "faults.fidelity.notChecked" | "faults.fidelity.checked" {
  return m.referenceData.length === 0 ? "faults.fidelity.notChecked" : "faults.fidelity.checked";
}
