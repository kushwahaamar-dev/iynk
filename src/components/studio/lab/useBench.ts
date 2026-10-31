"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { FigureEvent, FigureHandle } from "@/components/figure";
import type { FailureMode } from "@/content/schema";
import { labItemForKey } from "@/lib/learn/facade";
import { benchComplete, completeLab } from "@/lib/learn/lab-completion";
import { interpRunner, type TaskRunResult } from "@/lib/robotics/runner";
import {
  initialBenchState,
  reduceBench,
  type BenchAction,
  type BenchEffect,
  type BenchSetup,
  type BenchState,
  type FigureCommand,
} from "@/lib/robotics/session";
import { activeFaults } from "@/lib/robotics/steps";
import { benchMoments } from "@/lib/sound/bench-moments";
import { useFigureSound, useLabMoments } from "@/lib/sound/react";
import type { LearnStore } from "@/local/learn-store";
import { emptyRecord, withItem, withStep, type LearnerRecord } from "@/project/guided/record";
import { activeFaultIds } from "@/studio/lab/bench-select";
import { faultClearOps, faultTriggerOps } from "@/studio/lab/bench-ops";
import type { DocStore } from "@/studio/stores/doc";
import { useStoreSelector } from "@/studio/stores/select";
import type { QuizResult } from "@/lib/progress";
import { sendToFigure } from "./figure-link";
import { createLabSession } from "./session";

const FAULT_CLEARED: FigureCommand = { type: "set", state: { fault: null } };
// A figure that keeps reporting a different fault than the document is told a few times, then left alone.
const RESEND_LIMIT = 3;

const now = () => new Date().toISOString();
const benchProject = (benchId: string) => `prj_robotics-${benchId}`;

export type BenchArgs = {
  doc: DocStore;
  setup: BenchSetup;
  learn: LearnStore;
  /** The undo entry name of "clear every fault". */
  clearLabel: string;
};

/** The fault the document wants the figure to show: the last one enabled, since the figure holds one fault at a time. */
function wantedFault(doc: DocStore, faults: readonly FailureMode[]): FailureMode | null {
  const on = activeFaultIds(doc.getState().state);
  return faults.findLast((fault) => on.includes(fault.id)) ?? null;
}

function commandFor(fault: FailureMode | null): FigureCommand {
  return fault ? fault.figure : FAULT_CLEARED;
}

function writeProgress(learn: LearnStore, setup: BenchSetup, effect: Extract<BenchEffect, { kind: "done" | "quiz" }>) {
  const item = labItemForKey(effect.key)?.item;
  if (!item) return;
  const { bench } = setup;
  const at = now();
  const projectId = benchProject(bench.id);
  const update = (change: (record: LearnerRecord) => LearnerRecord) =>
    learn.update(projectId, (record) => change(record ?? emptyRecord(projectId, at)), at);

  if (effect.kind === "quiz" && item.kind === "quiz" && item.id !== null) {
    const quizId = item.id;
    update((record) => {
      const best = record.quiz[quizId];
      if (best && best.correct / best.total >= effect.score / effect.total) return record;
      return { ...record, quiz: { ...record.quiz, [quizId]: { answers: {}, correct: effect.score, total: effect.total } } };
    });
  } else if (effect.kind === "done" && item.kind === "step") {
    const index = bench.steps.findIndex((step) => step.id === item.id);
    if (index >= 0) update((record) => withStep(record, index, "gate", at));
  } else if (effect.kind === "done" && item.kind === "task" && item.id !== null) {
    update((record) => withItem(record, `task:${item.id}`, "gate", at));
  } else {
    return;
  }

  const record = learn.get(projectId);
  if (!record) return;
  const finished = benchComplete({
    stepsDone: bench.steps.filter((_, index) => record.steps[String(index)]).length,
    steps: bench.steps.length,
    quizzesTaken: bench.quizzes.filter((quiz) => record.quiz[quiz.id]).length,
    quizzes: bench.quizzes.length,
  });
  if (finished) completeLab(learn, projectId, "bench", at, "T0");
}

function runTask(setup: BenchSetup, taskId: string, source: string, report: (result: TaskRunResult) => void) {
  const task = setup.bench.tasks.find((x) => x.id === taskId);
  if (!task) return;
  const request = { board: task.board, language: task.language, source, world: task.world, runMs: task.runMs };
  interpRunner(request, task.checks)
    .catch((error: unknown): TaskRunResult => ({ status: "error", line: 0, message: error instanceof Error ? error.message : String(error), serial: [] }))
    .then(report);
}

/**
 * The controller of a bench open in Studio. The session holds what the old page kept in its store; which fault is on
 * lives in the document and is read from it, so undo, redo and a buddy's op reach the figure the same way a click does.
 */
export function useBench({ doc, setup, learn, clearLabel }: BenchArgs) {
  const { bench } = setup;
  const [session] = useState(() =>
    createLabSession<BenchState, BenchAction, BenchEffect>(initialBenchState(setup), (state, action) => reduceBench(setup, state, action)),
  );
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  const project = useStoreSelector(doc, (s) => s.state);
  const records = useSyncExternalStore(learn.subscribe, learn.snapshot, learn.snapshot);
  const figureSound = useFigureSound();

  const [handle, setHandle] = useState<FigureHandle | null>(null);
  const handleRef = useRef<FigureHandle | null>(null);
  const shownFault = useRef<string | null | undefined>(undefined);
  const resends = useRef(0);

  const active = useMemo(() => {
    const on = activeFaultIds(project);
    return bench.faults.filter((fault) => on.includes(fault.id));
  }, [project, bench.faults]);

  const showFault = useCallback(() => {
    const fault = wantedFault(doc, bench.faults);
    if (sendToFigure(handleRef.current, commandFor(fault))) shownFault.current = fault?.id ?? null;
  }, [doc, bench.faults]);

  useEffect(
    () =>
      doc.subscribe(() => {
        const fault = wantedFault(doc, bench.faults);
        if ((fault?.id ?? null) === shownFault.current) return;
        resends.current = 0;
        showFault();
      }),
    [doc, bench.faults, showFault],
  );

  useEffect(
    () =>
      session.connect((effect) => {
        switch (effect.kind) {
          case "send":
            sendToFigure(handle, effect.command);
            return;
          case "done":
          case "quiz":
            writeProgress(learn, setup, effect);
            return;
          case "run":
            runTask(setup, effect.task, effect.source, (result) => session.dispatch({ type: "task/result", task: effect.task, result }));
            return;
        }
      }),
    [session, handle, learn, setup],
  );

  const moments = useCallback((prev: BenchState, next: BenchState) => benchMoments(bench, prev, next), [bench]);
  useLabMoments(session, moments);

  const commitFaults = useCallback(
    (ops: ReturnType<typeof faultClearOps>, label: string) => {
      const result = doc.commit(ops, { label });
      if (!result.ok) session.dispatch({ type: "figure/flash", text: result.message });
    },
    [doc, session],
  );

  const dispatch = useCallback(
    (action: BenchAction) => {
      if (action.type === "fault/trigger") {
        const fault = bench.faults.find((f) => f.id === action.fault);
        if (fault) commitFaults(faultTriggerOps(doc.getState().state, fault.id), setup.texts[fault.title] ?? fault.id);
      } else if (action.type === "fault/clear") {
        commitFaults(faultClearOps(doc.getState().state), clearLabel);
      } else {
        session.dispatch(action);
      }
    },
    [bench.faults, doc, session, commitFaults, setup.texts, clearLabel],
  );

  const onEvent = useCallback(
    (event: FigureEvent) => {
      figureSound(event);
      switch (event.type) {
        case "ready": {
          session.dispatch({ type: "figure/ready" });
          if (event.state) session.dispatch({ type: "figure/state", state: event.state });
          resends.current = 0;
          if (wantedFault(doc, bench.faults)) showFault();
          return;
        }
        case "state": {
          session.dispatch({ type: "figure/state", state: event.state });
          const wanted = wantedFault(doc, bench.faults);
          const shown = activeFaults(bench.faults, event.state);
          const agrees = wanted ? shown.some((fault) => fault.id === wanted.id) : shown.length === 0;
          if (agrees) resends.current = 0;
          else if (resends.current < RESEND_LIMIT) {
            resends.current += 1;
            showFault();
          }
          return;
        }
        case "flash":
          session.dispatch({ type: "figure/flash", text: event.text });
          return;
        default:
          return;
      }
    },
    [session, figureSound, doc, bench.faults, showFault],
  );

  const ref = useCallback((next: FigureHandle | null) => {
    handleRef.current = next;
    setHandle(next);
  }, []);

  const savedDone = useCallback(
    (key: string) => {
      const item = labItemForKey(key)?.item;
      const record = records.get(benchProject(bench.id));
      if (!item || item.id === null || !record) return false;
      if (item.kind === "task") return record.items?.[`task:${item.id}`] !== undefined;
      const index = item.kind === "step" ? bench.steps.findIndex((step) => step.id === item.id) : -1;
      return index >= 0 && record.steps[String(index)] !== undefined;
    },
    [records, bench],
  );

  const best = useCallback(
    (quizId: string): QuizResult | undefined => {
      const entry = records.get(benchProject(bench.id))?.quiz[quizId];
      return entry ? { score: entry.correct, total: entry.total } : undefined;
    },
    [records, bench.id],
  );

  return { state, dispatch, active, figure: { handle, ref, onEvent }, savedDone, best };
}
