import type { Fault, Guide, Project, TestCase } from "../../project/generated/types.ts";
import type { Mode } from "../modes.ts";
import type { HintPort } from "../proposals/ports.ts";

export interface ExclusionCtx {
  mode: Mode;
  ladderLevel: 0 | 1 | 2 | 3;
  answeredQuizzes: ReadonlySet<string>;
  hint: Pick<HintPort, "redact">;
  showHiddenCount: boolean;
}

export interface Omitted {
  hiddenChecks: number;
  quizAnswers: number;
  hints: number;
  faultCauses: number;
}

type Quiz = NonNullable<Guide["quizzes"]>[number];
type Question = Quiz["questions"][number];

const teaching = (mode: Mode): boolean => mode === "socratic" || mode === "beginner";

function withoutHiddenChecks(tests: TestCase[]): { tests: TestCase[]; count: number } {
  let count = 0;
  const next = tests.map((t) => {
    const checks = t.checks.filter((c) => c.visibility !== "hidden");
    if (checks.length === t.checks.length) return t;
    count += t.checks.length - checks.length;
    return { ...t, checks: checks as TestCase["checks"] };
  });
  return { tests: count > 0 ? next : tests, count };
}

function stripQuestion(q: Question): Omit<Question, "answer" | "why"> {
  const { answer: _answer, why: _why, ...rest } = q;
  return rest;
}

function withoutQuizAnswers(quizzes: Quiz[], ctx: ExclusionCtx): { quizzes: Quiz[]; count: number } {
  let count = 0;
  const next = quizzes.map((quiz) => {
    let changed = false;
    const questions = quiz.questions.map((q) => {
      if (!teaching(ctx.mode) && ctx.answeredQuizzes.has(q.id)) return q;
      changed = true;
      count++;
      return stripQuestion(q);
    });
    return changed ? ({ ...quiz, questions } as Quiz) : quiz;
  });
  return { quizzes: count > 0 ? next : quizzes, count };
}

function changedFaults(before: readonly Fault[], after: readonly Fault[]): number {
  const replaced = before.reduce((n, f, i) => (after[i] === f ? n : n + 1), 0);
  return replaced + Math.max(0, before.length - after.length);
}

/** Entry i of `guide.hints` opens at ladder level i + 1. */
export function excludeFromProject(state: Project, ctx: ExclusionCtx): { state: Project; omitted: Omitted } {
  const omitted: Omitted = { hiddenChecks: 0, quizAnswers: 0, hints: 0, faultCauses: 0 };
  let next = state;

  const checks = withoutHiddenChecks(state.tests);
  if (checks.count > 0) {
    next = { ...next, tests: checks.tests };
    omitted.hiddenChecks = checks.count;
  }

  const guide = state.guide;
  if (guide) {
    let nextGuide = guide;
    if (guide.quizzes) {
      const quizzes = withoutQuizAnswers(guide.quizzes, ctx);
      if (quizzes.count > 0) {
        nextGuide = { ...nextGuide, quizzes: quizzes.quizzes };
        omitted.quizAnswers = quizzes.count;
      }
    }
    if (guide.hints && teaching(ctx.mode) && guide.hints.length > ctx.ladderLevel) {
      omitted.hints = guide.hints.length - ctx.ladderLevel;
      nextGuide = { ...nextGuide, hints: guide.hints.slice(0, ctx.ladderLevel) };
    }
    if (nextGuide !== guide) next = { ...next, guide: nextGuide };
  }

  const redacted = ctx.hint.redact(next);
  omitted.faultCauses = changedFaults(next.simulation.faults, redacted.simulation.faults);
  return { state: redacted, omitted };
}

/** The cause shows from level 3 and the evidence from level 2, as the Diagnose panel does. */
export function excludeFromDiagnostics<T extends { causeId?: string; evidence?: unknown }>(
  items: readonly T[],
  ctx: ExclusionCtx,
): T[] {
  return items.map((item) => {
    const dropCause = item.causeId !== undefined && ctx.ladderLevel < 3;
    const dropEvidence = item.evidence !== undefined && ctx.ladderLevel < 2;
    if (!dropCause && !dropEvidence) return item;
    const { causeId: _causeId, evidence: _evidence, ...rest } = item;
    return {
      ...rest,
      ...(dropCause ? {} : { causeId: item.causeId }),
      ...(dropEvidence ? {} : { evidence: item.evidence }),
    } as T;
  });
}

export function omittedLine(o: Omitted, show: boolean): string {
  if (!show || o.hiddenChecks === 0) return "";
  return `${o.hiddenChecks} hidden ${o.hiddenChecks === 1 ? "check exists" : "checks exist"}`;
}
