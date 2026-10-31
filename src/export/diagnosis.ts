import { prettyPrint } from "../core/canonical.ts";
import { fail, ok } from "../core/result.ts";
import type { Result } from "../core/result.ts";
import { parseStrict } from "../core/strict-json.ts";
import english from "../i18n/messages/en/faults.json";
import type { Messages } from "../i18n/namespaces.ts";
import { createTranslator } from "../i18n/translate.ts";
import type { Translate } from "../i18n/translate.ts";
import type { Diagnosis, Evidence, HintLevel } from "../project/diagnosis.ts";
import { isCauseId } from "../sim/faults/cause-ids.ts";
import { isSymptomId } from "../sim/faults/symptoms.ts";

type Outcome = "clean" | "assisted" | "helped" | "revealed";

export interface DiagnosisFile {
  v: 1;
  diagnosis: Diagnosis;
  outcome: Outcome;
  noEvidence: boolean;
  tierLowest: Evidence["tier"];
  projectId: string;
}

export type DiagnosisParseError = { code: "bad-json" | "bad-record"; path: string };

const OUTCOMES: readonly string[] = ["clean", "assisted", "helped", "revealed"];
const KINDS: readonly string[] = ["pin-level", "net-voltage", "branch-current", "serial-line", "state", "timeline"];
const PROVENANCES: readonly string[] = ["computed", "approximation", "mocked"];
const TIERS: readonly Evidence["tier"][] = ["T0", "T1", "T2", "T3"];

export const MAX_EVIDENCE = 64;
const MAX_TEXT = 200;
const MAX_MODEL_IDS = 16;
const MAX_ID = 64;

const inEnglish: Translate<Messages["faults"]> = createTranslator("en", english as Messages["faults"], "en/faults");
const ms = new Intl.NumberFormat("en");

/** One evidence entry as a sentence: what was looked at, when, what it read and how far to trust it. */
export function evidenceLine(e: Evidence, t: Translate<Messages["faults"]>): string {
  return t("record.line", {
    kind: t(`evidence.kind.${e.kind}`),
    ref: e.ref,
    ms: ms.format(Math.floor(e.at / 1e6)),
    value: e.unit ? `${e.value} ${e.unit}` : String(e.value),
    tier: t(`record.tierName.${e.tier}`),
    provenance: t(`provenance.${e.provenance}`),
  });
}

const lowestTier = (evidence: readonly Evidence[]): Evidence["tier"] =>
  evidence.reduce<Evidence["tier"]>((low, e) => (TIERS.indexOf(e.tier) < TIERS.indexOf(low) ? e.tier : low), evidence[0]?.tier ?? "T0");

export function exportDiagnosis(d: Diagnosis, meta: { outcome: Outcome; projectId: string }): { json: string; filename: string; text: string } {
  const file: DiagnosisFile = {
    v: 1,
    diagnosis: d,
    outcome: meta.outcome,
    noEvidence: d.evidence.length === 0,
    tierLowest: lowestTier(d.evidence),
    projectId: meta.projectId,
  };
  const evidence = d.evidence.length === 0 ? inEnglish("record.empty") : d.evidence.map((e) => evidenceLine(e, inEnglish)).join("; ");
  return {
    json: prettyPrint(file),
    filename: `diagnosis-${d.cause_id}.json`,
    text: `cause: ${d.cause_id}, symptom: ${d.symptom_id}, hint level ${d.hint_level}, outcome: ${meta.outcome}, evidence: ${evidence}`,
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

const bad = (path: string) => fail<DiagnosisParseError>({ code: "bad-record", path });

function evidenceProblem(raw: unknown): string | null {
  if (!isObject(raw)) return "";
  if (typeof raw.kind !== "string" || !KINDS.includes(raw.kind)) return "/kind";
  if (!isText(raw.ref, MAX_TEXT)) return "/ref";
  if (typeof raw.at !== "number" || !Number.isSafeInteger(raw.at) || raw.at < 0) return "/at";
  const numeric = typeof raw.value === "number" && Number.isFinite(raw.value);
  if (!numeric && !(typeof raw.value === "string" && raw.value.length <= MAX_TEXT)) return "/value";
  if (raw.unit !== undefined && !isText(raw.unit, MAX_ID)) return "/unit";
  if (typeof raw.provenance !== "string" || !PROVENANCES.includes(raw.provenance)) return "/provenance";
  if (typeof raw.tier !== "string" || !TIERS.includes(raw.tier as Evidence["tier"])) return "/tier";
  const ids = raw.modelIds;
  if (!Array.isArray(ids) || ids.length > MAX_MODEL_IDS || !ids.every((id) => isText(id, MAX_ID))) return "/modelIds";
  return null;
}

export function parseDiagnosis(json: string): Result<DiagnosisFile, DiagnosisParseError> {
  const parsed = parseStrict(json);
  if (!parsed.ok) return fail({ code: "bad-json", path: parsed.error.path ?? "" });
  const file = parsed.value;
  if (!isObject(file) || file.v !== 1) return bad("/v");
  if (typeof file.outcome !== "string" || !OUTCOMES.includes(file.outcome)) return bad("/outcome");
  if (typeof file.noEvidence !== "boolean") return bad("/noEvidence");
  if (typeof file.tierLowest !== "string" || !TIERS.includes(file.tierLowest as Evidence["tier"])) return bad("/tierLowest");
  if (!isText(file.projectId, MAX_ID)) return bad("/projectId");

  const d = file.diagnosis;
  if (!isObject(d)) return bad("/diagnosis");
  if (typeof d.cause_id !== "string" || !isCauseId(d.cause_id)) return bad("/diagnosis/cause_id");
  if (typeof d.symptom_id !== "string" || !isSymptomId(d.symptom_id)) return bad("/diagnosis/symptom_id");
  if (typeof d.hint_level !== "number" || ![0, 1, 2, 3].includes(d.hint_level)) return bad("/diagnosis/hint_level");
  if (!Array.isArray(d.evidence) || d.evidence.length > MAX_EVIDENCE) return bad("/diagnosis/evidence");
  for (const [i, entry] of d.evidence.entries()) {
    const problem = evidenceProblem(entry);
    if (problem !== null) return bad(`/diagnosis/evidence/${i}${problem}`);
  }

  return ok({
    v: 1,
    diagnosis: { cause_id: d.cause_id, symptom_id: d.symptom_id, evidence: d.evidence as Evidence[], hint_level: d.hint_level as HintLevel },
    outcome: file.outcome as Outcome,
    noEvidence: file.noEvidence,
    tierLowest: file.tierLowest as Evidence["tier"],
    projectId: file.projectId,
  });
}
