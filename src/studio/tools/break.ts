import { LIMITS } from "../../core/limits.ts";
import { fail, ok, type Failure, type Result } from "../../core/result.ts";
import type { Fault, Op, Project } from "../../project/generated/types.ts";
import { isCauseId } from "../../sim/faults/cause-ids.ts";
import { CAUSES, causeMeta, type CauseFamily } from "../../sim/faults/causes.ts";
import { buildOptions, optionSeed } from "../../sim/faults/diagnose.ts";
import { breakOps, listCandidates, pickSurprise, restoreOps, type FaultCandidate } from "../../sim/faults/generate.ts";
import { faultToOps, type FaultCtx } from "../../sim/faults/ops.ts";
import { sealForSharing, type DiagnoseSpec } from "../../sim/faults/seal.ts";
import { isSymptomId } from "../../sim/faults/symptoms.ts";
import type { CauseId, FaultErrorCode, NetView, SymptomId } from "../../sim/faults/types.ts";

export type SpecTexts = {
  symptom(id: SymptomId): string;
  explanation(id: CauseId): string;
  option(id: CauseId): string;
};

export type BreakGesture =
  | { t: "list"; families?: CauseFamily[] }
  | { t: "break"; candidate: FaultCandidate }
  | { t: "surprise"; seed: number; families?: CauseFamily[] }
  | { t: "toggle"; faultId: string }
  | { t: "restore"; faultId: string }
  | { t: "buddy"; candidate: FaultCandidate; texts: SpecTexts }
  | { t: "author"; fault: AuthoredFault; ctx: FaultCtx };

export type AuthoredFault = {
  kind: Fault["kind"];
  target: Fault["target"];
  params?: Fault["params"];
  cause_id: CauseId;
  symptom_ids: SymptomId[];
  note?: string;
};

export type AuthorFailure = Failure & {
  code: "bad-cause" | "bad-symptom" | "no-symptom" | "limit" | FaultErrorCode;
};

export type BreakFailure = Failure & { code: "duplicate-fault" | "limit" | "no-candidate" | AuthorFailure["code"] };

export type BreakOutcome = {
  ops: Op[];
  candidate?: FaultCandidate;
  candidates?: FaultCandidate[];
  sealedDoc?: Project;
};

const GUIDED_KEY = "x-iynk-guided";
const OPTION_COUNT = 5;
const FALLBACK_SYMPTOM: SymptomId = "part-dead";

const ID_BODY_MAX = 64;

const missing = (faultId: string): BreakFailure => ({ code: "no-candidate", message: `the project has no fault ${faultId}` });

/** The answer first, then the causes it is mistaken for, then others of its family, then the rest of the modelled causes. */
function optionCauses(answer: CauseId): CauseId[] {
  const meta = causeMeta(answer);
  const modelled = CAUSES.filter((c) => c.modelled && c.seat === "SIM" && c.id !== answer);
  const sameFamily = modelled.filter((c) => c.family === meta?.family).map((c) => c.id);
  const rest = modelled.map((c) => c.id);
  const unique = new Set<CauseId>([answer, ...(meta?.confusableWith ?? []), ...sameFamily, ...rest]);
  return [...unique].slice(0, OPTION_COUNT);
}

export function specFromCandidate(c: FaultCandidate, texts: SpecTexts, seed: number): DiagnoseSpec {
  const symptomId = c.symptomIds[0] ?? causeMeta(c.causeId)?.symptomIds[0] ?? FALLBACK_SYMPTOM;
  const spec: DiagnoseSpec = {
    kind: "injected",
    symptom: { id: symptomId, text: texts.symptom(symptomId) },
    answer: { cause_id: c.causeId, fault: c.fault.id },
    options: optionCauses(c.causeId).map((id) => ({ cause_id: id, label: texts.option(id) })),
    explanation: texts.explanation(c.causeId),
    review: { status: "model-only", source: "own-reasoning" },
  };
  return { ...spec, options: buildOptions(spec, seed) };
}

function withFault(doc: Project, fault: Fault): Project {
  return { ...doc, simulation: { ...doc.simulation, faults: [...doc.simulation.faults, fault] } };
}

function sealedCopy(doc: Project, c: FaultCandidate, texts: SpecTexts): Project {
  const broken = withFault(doc, c.fault);
  const spec = specFromCandidate(c, texts, optionSeed(`${doc.id}:${c.fault.id}`));
  const guided = (doc.ext as Record<string, object> | undefined)?.[GUIDED_KEY] ?? {};
  return sealForSharing({ ...broken, ext: { ...broken.ext, [GUIDED_KEY]: { ...guided, diagnose: spec } } });
}

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "-");

/** `flt_author_<kind>_<target>`, numbered when the project already has one; cut to the schema's 64 characters after `flt_`. */
function authoredId(doc: Project, f: AuthoredFault): string {
  const { component, pin, net, nets } = f.target;
  const where = [component, pin, net, ...(nets ?? [])].filter((w) => w !== undefined);
  const body = ["author", f.kind, ...where].map(slug).join("_");
  const taken = new Set(doc.simulation.faults.map((x) => x.id));
  for (let n = 1; ; n++) {
    const suffix = n === 1 ? "" : `_${n}`;
    const id = `flt_${body.slice(0, ID_BODY_MAX - suffix.length)}${suffix}`;
    if (!taken.has(id)) return id;
  }
}

/** Writes a fault into a project, switched off, for a lesson to turn on. The dry run uses the same ops the simulator applies. */
export function authorFault(doc: Project, f: AuthoredFault, ctx: FaultCtx): Result<Op[], AuthorFailure> {
  if (!isCauseId(f.cause_id)) return fail({ code: "bad-cause", message: `${f.cause_id} is not a cause id or an x- extension` });
  if (f.symptom_ids.length === 0) return fail({ code: "no-symptom", message: "a fault needs at least one symptom" });
  const unknown = f.symptom_ids.find((s) => !isSymptomId(s));
  if (unknown !== undefined) return fail({ code: "bad-symptom", message: `${unknown} is not a symptom id or an x- extension` });
  if (doc.simulation.faults.length >= LIMITS.faults) {
    return fail({ code: "limit", message: `a project holds at most ${LIMITS.faults} faults` });
  }
  const fault: Fault = {
    id: authoredId(doc, f),
    cause_id: f.cause_id,
    symptom_ids: f.symptom_ids,
    kind: f.kind,
    target: f.target,
    enabled: false,
    ...(f.params && { params: f.params }),
    ...(f.note !== undefined && { note: f.note }),
  };
  const dry = faultToOps(fault, ctx);
  if (!dry.ok) return fail({ code: dry.error.code, message: dry.error.message });
  return ok([{ k: "fault.set", fault }]);
}

/** A tool is (doc, gesture) => ops. It never writes the document; the doc store commits what it returns. */
export function breakTool(
  doc: Project,
  view: NetView,
  sources: Record<string, string>,
  g: BreakGesture,
): Result<BreakOutcome, BreakFailure> {
  switch (g.t) {
    case "list":
      return ok({ ops: [], candidates: listCandidates(doc, view, sources, { families: g.families }) });
    case "break": {
      const made = breakOps(doc, g.candidate);
      return made.ok ? ok({ ops: made.value, candidate: g.candidate }) : fail(made.error);
    }
    case "surprise": {
      const taken = new Set(doc.simulation.faults.map((f) => f.id));
      const open = listCandidates(doc, view, sources, { families: g.families }).filter((c) => !taken.has(c.fault.id));
      const picked = pickSurprise(open, g.seed);
      if (!picked) return fail({ code: "no-candidate", message: "no fault can be added to this project" });
      const made = breakOps(doc, picked);
      return made.ok ? ok({ ops: made.value, candidate: picked }) : fail(made.error);
    }
    case "toggle": {
      const fault = doc.simulation.faults.find((f) => f.id === g.faultId);
      return fault ? ok({ ops: [{ k: "fault.set", fault: { ...fault, enabled: !fault.enabled } }] }) : fail(missing(g.faultId));
    }
    case "restore": {
      const ops = restoreOps(doc, g.faultId);
      return ops.length > 0 ? ok({ ops }) : fail(missing(g.faultId));
    }
    case "buddy": {
      const made = breakOps(doc, g.candidate);
      if (!made.ok) return fail(made.error);
      return ok({ ops: [], candidate: g.candidate, sealedDoc: sealedCopy(doc, g.candidate, g.texts) });
    }
    case "author": {
      const made = authorFault(doc, g.fault, g.ctx);
      return made.ok ? ok({ ops: made.value }) : fail(made.error);
    }
  }
}
