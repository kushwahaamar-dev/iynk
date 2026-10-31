import { fail, ok, type Failure, type Result } from "../../core/result.ts";
import type { Fault, Op, Project } from "../../project/generated/types.ts";
import { CAUSES, causeMeta, type CauseFamily } from "../../sim/faults/causes.ts";
import { buildOptions, optionSeed } from "../../sim/faults/diagnose.ts";
import { breakOps, listCandidates, pickSurprise, restoreOps, type FaultCandidate } from "../../sim/faults/generate.ts";
import { sealForSharing, type DiagnoseSpec } from "../../sim/faults/seal.ts";
import type { CauseId, NetView, SymptomId } from "../../sim/faults/types.ts";

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
  | { t: "buddy"; candidate: FaultCandidate; texts: SpecTexts };

export type BreakFailure = Failure & { code: "duplicate-fault" | "limit" | "no-candidate" };

export type BreakOutcome = {
  ops: Op[];
  candidate?: FaultCandidate;
  candidates?: FaultCandidate[];
  sealedDoc?: Project;
};

const GUIDED_KEY = "x-iynk-guided";
const OPTION_COUNT = 5;
const FALLBACK_SYMPTOM: SymptomId = "part-dead";

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
  }
}
