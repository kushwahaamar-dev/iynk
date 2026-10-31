import { fail, ok, type Result } from "../../core/result.ts";
import type { Fault, Project } from "../../project/generated/types.ts";
import { isCauseId } from "./cause-ids.ts";

export type CauseId = string;
export type SymptomId = string;

export type ItemState = "presented" | "observing" | "picking" | "fixing" | "verified" | "revealed";

/** EDUCATION 6.4. The bug a buddy made, the options to pick from and the answer to check against. */
export interface DiagnoseSpec {
  kind: "built-wrong" | "injected";
  symptom: { id: SymptomId; text: string };
  answer: { cause_id: CauseId; fault?: string; rule?: string };
  options: { cause_id: CauseId; label: string }[];
  remedies?: { id: string; text: string; correct: boolean }[];
  explanation: string;
  readings?: { a: string; b: string; label: string }[];
  transfer?: { template: string; question: string; options: string[]; answer: number };
  review: {
    status: "draft" | "reviewed" | "model-only";
    by?: string;
    source: "own-reasoning" | "datasheet" | "bench";
    date?: string;
  };
}

export type BadSpec = { code: "bad-spec"; path: string };

const GUIDED_KEY = "x-iynk-guided";
const SPEC_PATH = `/ext/${GUIDED_KEY}/diagnose`;
const HIDDEN_FAULT_ID = "(hidden)";
const SYMPTOM_TEXT_MAX = 300;
const OPTIONS_MIN = 4;
const OPTIONS_MAX = 6;

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === "string" && v.length > 0;

function guidedOf(doc: Project): Json | undefined {
  const guided = (doc.ext as Json | undefined)?.[GUIDED_KEY];
  return isObject(guided) ? guided : undefined;
}

function check(spec: Json): string | null {
  if (spec.kind !== "built-wrong" && spec.kind !== "injected") return "/kind";
  const { symptom, answer, options, review } = spec;
  if (!isObject(symptom) || !isText(symptom.id)) return "/symptom/id";
  if (!isText(symptom.text) || symptom.text.length > SYMPTOM_TEXT_MAX) return "/symptom/text";
  if (!isObject(answer) || typeof answer.cause_id !== "string" || !isCauseId(answer.cause_id)) return "/answer/cause_id";
  if (answer.fault !== undefined && (!isText(answer.fault) || spec.kind === "built-wrong")) return "/answer/fault";
  if (answer.rule !== undefined && !isText(answer.rule)) return "/answer/rule";
  if (!Array.isArray(options) || options.length < OPTIONS_MIN || options.length > OPTIONS_MAX) return "/options";
  for (const [i, option] of options.entries()) {
    if (!isObject(option) || typeof option.cause_id !== "string" || !isCauseId(option.cause_id)) {
      return `/options/${i}/cause_id`;
    }
    if (!isText(option.label)) return `/options/${i}/label`;
  }
  if (options.filter((o) => (o as Json).cause_id === answer.cause_id).length !== 1) return "/options";
  if (!isText(spec.explanation)) return "/explanation";
  if (spec.remedies !== undefined) {
    if (!Array.isArray(spec.remedies)) return "/remedies";
    for (const [i, r] of spec.remedies.entries()) {
      if (!isObject(r) || !isText(r.id) || !isText(r.text) || typeof r.correct !== "boolean") return `/remedies/${i}`;
    }
  }
  if (spec.readings !== undefined) {
    if (!Array.isArray(spec.readings)) return "/readings";
    for (const [i, r] of spec.readings.entries()) {
      if (!isObject(r) || !isText(r.a) || !isText(r.b) || !isText(r.label)) return `/readings/${i}`;
    }
  }
  if (spec.transfer !== undefined) {
    const t = spec.transfer;
    if (!isObject(t) || !isText(t.template) || !isText(t.question)) return "/transfer";
    if (!Array.isArray(t.options) || !t.options.every(isText)) return "/transfer/options";
    if (!Number.isInteger(t.answer) || (t.answer as number) < 0 || (t.answer as number) >= t.options.length) {
      return "/transfer/answer";
    }
  }
  if (!isObject(review)) return "/review";
  if (review.status !== "draft" && review.status !== "reviewed" && review.status !== "model-only") return "/review/status";
  if (review.source !== "own-reasoning" && review.source !== "datasheet" && review.source !== "bench") {
    return "/review/source";
  }
  return null;
}

/** Reads `ext["x-iynk-guided"].diagnose`. A document without one gives `ok(null)`. */
export function readDiagnoseSpec(doc: Project): Result<DiagnoseSpec | null, BadSpec> {
  const guided = guidedOf(doc);
  if (guided === undefined || guided.diagnose === undefined) return ok(null);
  if (!isObject(guided.diagnose)) return fail({ code: "bad-spec", path: SPEC_PATH });
  const problem = check(guided.diagnose);
  if (problem !== null) return fail({ code: "bad-spec", path: SPEC_PATH + problem });
  return ok(guided.diagnose as unknown as DiagnoseSpec);
}

/** True while a diagnose item is present and the person has neither solved it nor given up. */
export function isSealed(doc: Project, state: ItemState): boolean {
  if (state === "verified" || state === "revealed") return false;
  return guidedOf(doc)?.diagnose !== undefined;
}

function withoutNote(fault: Fault): Fault {
  if (fault.note === undefined) return fault;
  const { note: _note, ...rest } = fault;
  return rest;
}

function redactSpec(spec: DiagnoseSpec): Json {
  const { answer: _answer, explanation: _explanation, options, remedies, transfer, ...visible } = spec;
  const view: Json = { ...visible, options: options.map(({ label }) => ({ label })) };
  if (remedies !== undefined) view.remedies = remedies.map(({ id, text }) => ({ id, text }));
  if (transfer !== undefined) {
    const { answer: _transferAnswer, ...question } = transfer;
    view.transfer = question;
  }
  return view;
}

/** A copy of the document with everything that names the answer taken out. Returns the input once nothing is sealed. */
export function redactForUnrevealed(doc: Project, state: ItemState): Project {
  if (!isSealed(doc, state)) return doc;
  const guided = guidedOf(doc)!;
  const read = readDiagnoseSpec(doc);
  const spec = read.ok ? read.value : null;
  const hiddenId = spec?.answer.fault;

  const { diagnose: _diagnose, ...otherGuided } = guided;
  const redactedGuided = spec === null ? otherGuided : { ...otherGuided, diagnose: redactSpec(spec) };

  const faults = doc.simulation.faults.map((f) => (f.id === hiddenId ? ({ id: HIDDEN_FAULT_ID } as Fault) : withoutNote(f)));
  const ops = doc.history.ops
    .filter(({ op }) => !((op.k === "fault.set" && op.fault.id === hiddenId) || (op.k === "fault.remove" && op.id === hiddenId)))
    .map((env) => (env.op.k === "fault.set" ? { ...env, op: { ...env.op, fault: withoutNote(env.op.fault) } } : env));

  return {
    ...doc,
    ext: { ...doc.ext, [GUIDED_KEY]: redactedGuided },
    simulation: { ...doc.simulation, faults },
    history: { ...doc.history, ops },
  };
}

/** Marks the item sealed for a file that leaves the app. The answer stays in the file so the receiver can check it. */
export function sealForSharing(doc: Project): Project {
  const guided = guidedOf(doc);
  if (guided?.diagnose === undefined) return doc;
  return { ...doc, ext: { ...doc.ext, [GUIDED_KEY]: { ...guided, sealed: true } } };
}
