"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { sha256Hex } from "@/core/sha256";
import type { Project, Text } from "@/project/generated/types";
import { evaluateCompletion, evaluateSteps, type GuideDeps, type GuideInput, type GuideRun, type StepState } from "@/project/guided/engine";
import { readPlan, type GuidedPlan, type PlanIssue } from "@/project/guided/plan";
import { emptyRecord, withAnswer, withCompletion, withEdited, withStep, type LearnerRecord, type Tier } from "@/project/guided/record";
import { validatePlan } from "@/project/guided/validate-plan";
import type { LearnStore } from "@/local/learn-store";
import { START_LABEL } from "@/studio/fork";
import type { DocStore } from "@/studio/stores/doc";
import { useStoreSelector } from "@/studio/stores/select";

/** The substance hash costs the most, so a burst of ops is judged once (EDU 4.3). */
const EVAL_DELAY_MS = 200;

/** A plain string, or the learner's language with English as the fallback. */
export function textAt(t: Text, locale: string): string {
  return typeof t === "string" ? t : (t[locale] ?? t.en);
}

export interface UseGuideArgs {
  doc: DocStore;
  store: LearnStore;
  run: GuideRun;
  activeFaults: readonly string[];
  deps: GuideDeps;
  locale: string;
  /** The actor whose ops count as the learner's own edits. */
  localActor: string;
  engineVersions: Record<string, string>;
  now(): string;
  logEvent?(e: { kind: string; payload: Record<string, unknown> }): void;
  restoreStart(): Promise<void>;
}

export interface GuideView {
  plan: GuidedPlan | null;
  issues: PlanIssue[];
  steps: StepState[];
  viewIndex: number;
  completion: ReturnType<typeof evaluateCompletion> | null;
  record: LearnerRecord | undefined;
  unchecked: number;
  tier: Tier | null;
}

type Evaluated = { steps: StepState[]; flips: number[]; completion: ReturnType<typeof evaluateCompletion> | null };

/** The steps of a project whose plan is missing or broken: no gates, so the learner marks each one. */
const MANUAL_PLAN: GuidedPlan = { v: 1, mode: "guided", rung: "lesson", skill: [], gates: [], complete: [], tests: [] };

function readValidPlan(project: Project): { plan: GuidedPlan | null; issues: PlanIssue[] } {
  try {
    const plan = readPlan(project);
    if (plan === null) return { plan: null, issues: [] };
    const issues = validatePlan(plan, project);
    return { plan: issues.some((i) => i.severity === "error") ? null : plan, issues };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { plan: null, issues: [{ rule: "schema", severity: "error", path: "ext", message }] };
  }
}

function entrySource(project: Project): string {
  const entry = project.boards.find((b) => b.firmware)?.firmware?.entry;
  const source = project.sources.find((s) => s.id === entry) ?? project.sources.find((s) => s.role === "firmware");
  return source?.content ?? "";
}

function evaluate(project: Project, plan: GuidedPlan | null, record: LearnerRecord | undefined, a: UseGuideArgs): Evaluated {
  const startRevision = project.history.checkpoints.find((c) => c.label === START_LABEL)?.revision ?? 0;
  const input: GuideInput = {
    project,
    plan: plan ?? MANUAL_PLAN,
    record,
    run: a.run,
    activeFaults: a.activeFaults,
    history: {
      startRevision,
      localActor: a.localActor,
      ops: project.history.ops.map((e) => ({ revision: e.seq, actor: e.author.actor, kind: e.op.k })),
    },
  };
  const { steps, flips } = evaluateSteps(input, a.deps);
  return { steps, flips, completion: plan === null ? null : evaluateCompletion(input, a.deps) };
}

export function useGuide(a: UseGuideArgs): GuideView & {
  setViewIndex(i: number): void;
  stepPrev(): void;
  stepNext(): void;
  markStep(i: number): void;
  answer(quizId: string, questionId: string, choice: number): void;
  reset(): Promise<void>;
} {
  const project = useStoreSelector(a.doc, (s) => s.state);
  const projectId = project.id;
  const record = useSyncExternalStore(
    a.store.subscribe,
    () => a.store.get(projectId),
    () => undefined,
  );
  const latest = useRef(a);
  useEffect(() => {
    latest.current = a;
  });

  const { plan, issues } = useMemo(() => readValidPlan(project), [project]);
  const [evaluated, setEvaluated] = useState(() => evaluate(project, plan, record, a));
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const cur = latest.current;
      const next = evaluate(project, plan, record, cur);
      setEvaluated(next);
      if (plan === null) return;

      const at = cur.now();
      const done = next.flips;
      const edited = next.completion?.editFlip === true;
      const finished = next.completion?.complete === true && record?.completion === undefined;
      if (done.length === 0 && !edited && !finished) return;

      const gates = next.completion?.gates;
      cur.store.update(
        projectId,
        (r) => {
          let out = r ?? emptyRecord(projectId, at);
          for (const i of done) out = withStep(out, i, "gate", at);
          if (edited) out = withEdited(out, at);
          if (finished && gates) {
            out = withCompletion(
              out,
              {
                gates: { checks: gates.checks, edit: gates.edit, quiz: gates.quiz, goal: gates.goal },
                tier: cur.run?.tier ?? "T0",
                sourceSha256: sha256Hex(entrySource(project)),
                hintsMax: out.hintsMax,
                engineVersions: cur.engineVersions,
                legacy: false,
              },
              at,
            );
          }
          return out;
        },
        at,
      );
      for (const step of done) cur.logEvent?.({ kind: "step.done", payload: { projectId, step } });
      if (edited) cur.logEvent?.({ kind: "code.changed", payload: { projectId } });
      if (finished) cur.logEvent?.({ kind: "complete", payload: { projectId } });
    }, EVAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [project, plan, record, projectId, a.run, a.activeFaults, a.deps]);

  const { steps, completion } = evaluated;
  const viewIndex = Math.min(picked ?? steps.find((s) => s.state === "current")?.index ?? 0, Math.max(steps.length - 1, 0));
  const setViewIndex = (i: number) => setPicked(Math.min(Math.max(i, 0), Math.max(steps.length - 1, 0)));

  return {
    plan,
    issues,
    steps,
    viewIndex,
    completion,
    record,
    unchecked: project.provenance.thirdParty?.filter((row) => row.review === "unchecked").length ?? 0,
    tier: a.run?.tier ?? null,
    setViewIndex,
    stepPrev: () => setViewIndex(viewIndex - 1),
    stepNext: () => setViewIndex(viewIndex + 1),
    markStep(i) {
      const at = a.now();
      a.store.update(projectId, (r) => withStep(r ?? emptyRecord(projectId, at), i, "manual", at), at);
      a.logEvent?.({ kind: "step.done", payload: { projectId, step: i } });
    },
    answer(quizId, questionId, choice) {
      const quiz = project.guide?.quizzes?.find((q) => q.id === quizId);
      const question = quiz?.questions.find((q) => q.id === questionId);
      if (!quiz || !question) return;
      const at = a.now();
      const correct = choice === question.answer;
      a.store.update(projectId, (r) => withAnswer(r ?? emptyRecord(projectId, at), quizId, questionId, choice, correct, quiz.questions.length), at);
      a.logEvent?.({ kind: "quiz.answer", payload: { projectId, quiz: quizId, correct } });
    },
    reset: () => a.restoreStart(),
  };
}
