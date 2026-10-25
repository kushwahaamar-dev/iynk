"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { LabDock } from "@/components/dock/LabDock";
import { FigureFrame, type FigureEvent, type FigureHandle } from "@/components/figure";
import { SoundToggle, UsageToggle } from "@/components/settings";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { markDone, recordQuiz } from "@/lib/progress/progress";
import { useSaved } from "@/lib/progress/hooks";
import { progressKey } from "@/lib/progress/keys";
import { terminalKind } from "@/lib/robotics/catalog";
import { currentDraw } from "@/lib/robotics/current";
import { quizUnlocked } from "@/lib/robotics/quiz";
import { interpRunner, type TaskRunResult } from "@/lib/robotics/runner";
import { createBenchStore, type BenchEffect, type BenchSetup, type BenchState, type BenchStore, type Notice } from "@/lib/robotics/store";
import { activeFaults, currentStepIndex } from "@/lib/robotics/steps";
import { benchMoments } from "@/lib/sound/bench-moments";
import { useFigureSound, useLabMoments } from "@/lib/sound/react";
import { FaultsPanel } from "./FaultsPanel";
import { KeyHelp } from "./KeyHelp";
import { textLookup, useBenchState, useBenchT, type BenchMessages, type BenchT, type TextOf } from "./messages";
import { ModesPanel } from "./ModesPanel";
import { QuizPanel, quizTitle } from "./QuizPanel";
import { SerialPanel } from "./SerialPanel";
import { StatusPanel } from "./StatusPanel";
import { StepsPanel } from "./StepsPanel";
import { TasksPanel } from "./TasksPanel";

type Props = {
  setup: BenchSetup;
  messages: BenchMessages;
};

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

// The bridge carries only string and number data on `act` (src/components/figure/protocol.ts).
function actData(data: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(data)) if (typeof value === "string" || typeof value === "number") out[key] = value;
  return out;
}

function noticeText(notice: Notice, setup: BenchSetup, t: BenchT, tx: TextOf): string {
  const { bench } = setup;
  const stepTitle = (id: string) => {
    const step = bench.steps.find((s) => s.id === id);
    return step ? tx(step.title) : id;
  };
  switch (notice.kind) {
    case "out-of-order": {
      const step = bench.steps.find((s) => s.id === notice.step);
      return step?.refusal ? tx(step.refusal) : t("steps.outOfOrder", { step: stepTitle(notice.before) });
    }
    case "sent":
      return t("steps.sent", { step: stepTitle(notice.step) });
    case "by-hand":
      return t("steps.byHandNotice", { step: stepTitle(notice.step) });
    case "fault-seen": {
      const step = bench.steps.find((s) => s.id === notice.step);
      const fault = bench.faults.find((f) => f.id === step?.fault);
      return fault ? t("steps.faultSeen", { fix: tx(fault.fix) }) : t("steps.stepDone", { step: stepTitle(notice.step) });
    }
    case "step-done":
      return t("steps.stepDone", { step: stepTitle(notice.step) });
    case "all-done":
      return t("steps.allDone");
    case "quiz-ready": {
      const quiz = bench.quizzes.find((q) => q.id === notice.quiz);
      return quiz ? t("quiz.ready", { title: quizTitle(quiz, bench, t, tx) }) : "";
    }
    case "task-passed": {
      const task = bench.tasks.find((x) => x.id === notice.task);
      return task ? t("tasks.passedNotice", { title: tx(task.title) }) : "";
    }
    case "figure":
      return notice.text;
  }
}

function useEffects(store: BenchStore, figure: FigureHandle | null, setup: BenchSetup) {
  useEffect(() => {
    const run = (effect: BenchEffect) => {
      switch (effect.kind) {
        case "send": {
          const c = effect.command;
          if (!figure) return;
          if (c.type === "set") figure.send("set", { state: c.state });
          else if (c.type === "press") figure.send("press", c.choice === undefined ? { id: c.id } : { id: c.id, choice: c.choice });
          else if (c.type === "act") figure.send("act", c.data === undefined ? { name: c.name } : { name: c.name, data: actData(c.data) });
          else figure.send("flash", c.ms === undefined ? { text: c.text } : { text: c.text, ms: c.ms });
          return;
        }
        case "done":
          markDone(effect.key);
          return;
        case "quiz":
          recordQuiz(effect.key, effect.score, effect.total);
          return;
        case "run": {
          const task = setup.bench.tasks.find((x) => x.id === effect.task);
          if (!task) return;
          const request = {
            board: task.board,
            language: task.language,
            source: effect.source,
            world: task.world,
            runMs: task.runMs,
          };
          interpRunner(request, task.checks)
            .catch((error: unknown): TaskRunResult => ({ status: "error", line: 0, message: error instanceof Error ? error.message : String(error), serial: [] }))
            .then((result) => store.dispatch({ type: "task/result", task: task.id, result }));
          return;
        }
      }
    };
    return store.connect({ run });
  }, [store, figure, setup]);
}

export function BenchWorkspace({ setup, messages }: Props) {
  const { bench } = setup;
  const t = useBenchT(messages);
  const tx = useMemo(() => textLookup(setup.texts), [setup.texts]);
  const [store] = useState(() => createBenchStore(setup));
  const state = useBenchState(store);
  const saved = useSaved();
  const [figure, setFigure] = useState<FigureHandle | null>(null);
  const [help, setHelp] = useState(false);
  const id = useId();
  const ids = {
    figure: `${id}-figure`,
    steps: `${id}-steps`,
    status: `${id}-status`,
    serial: `${id}-serial`,
    modes: `${id}-modes`,
    faults: `${id}-faults`,
    tasks: `${id}-tasks`,
    quiz: `${id}-quiz`,
  };
  const figureHeadingRef = useRef<HTMLHeadingElement>(null);
  const serialRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);

  useEffects(store, figure, setup);
  const moments = useCallback((prev: BenchState, next: BenchState) => benchMoments(bench, prev, next), [bench]);
  useLabMoments(store, moments, bench.id);
  const figureSound = useFigureSound();

  const figureState = state.figure.state;
  const active = useMemo(() => activeFaults(bench.faults, figureState), [bench.faults, figureState]);
  const draw = useMemo(() => currentDraw(bench.current, figureState, active), [bench.current, figureState, active]);

  const stepDone = useCallback(
    (stepId: string) => state.steps[stepId]?.done === true || saved.done[progressKey.roboticsStep(bench.id, stepId)] === true,
    [state.steps, saved.done, bench.id],
  );
  const savedStep = useCallback((stepId: string) => saved.done[progressKey.roboticsStep(bench.id, stepId)] === true, [saved.done, bench.id]);
  const savedTask = useCallback((taskId: string) => saved.done[progressKey.roboticsTask(bench.id, taskId)] === true, [saved.done, bench.id]);
  const best = useCallback((quizId: string) => saved.quiz[progressKey.roboticsQuiz(bench.id, quizId)], [saved.quiz, bench.id]);

  const onEvent = useCallback(
    (event: FigureEvent) => {
      figureSound(event);
      switch (event.type) {
        case "ready":
          store.dispatch({ type: "figure/ready" });
          if (event.state) store.dispatch({ type: "figure/state", state: event.state });
          return;
        case "state":
          store.dispatch({ type: "figure/state", state: event.state });
          return;
        case "flash":
          store.dispatch({ type: "figure/flash", text: event.text });
          return;
        case "focus":
          // The figure hands focus back (Escape inside it): continue from its heading.
          if (!event.on) figureHeadingRef.current?.focus();
          return;
        default:
          return;
      }
    },
    [store, figureSound],
  );

  const readyQuiz = useMemo(
    () => bench.quizzes.find((quiz) => quizUnlocked(quiz, bench.steps, stepDone) && !best(quiz.id)) ?? null,
    [bench.quizzes, bench.steps, stepDone, best],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const key = event.key.toLowerCase();
      if (event.key === "?") {
        setHelp(true);
      } else if (key === "n") {
        const step = bench.steps[currentStepIndex(bench.steps, store.getState().steps)];
        if (step) store.dispatch({ type: "step/do", step: step.id });
      } else if (key === "f") {
        figure?.focus();
      } else if (key === "q") {
        if (readyQuiz) store.dispatch({ type: "quiz/open", quiz: readyQuiz.id });
      } else if (key === "s") {
        serialRef.current?.focus();
      } else if (key === "t") {
        tasksRef.current?.querySelector<HTMLElement>("h2")?.focus();
      } else {
        return;
      }
      event.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [bench.steps, store, figure, readyQuiz]);

  const notice = state.notice;
  const selectedId = typeof figureState.selected === "string" ? figureState.selected : null;
  const selected = selectedId ? bench.figure.parts.find((part) => part.id === selectedId) : undefined;
  const runningMode = typeof figureState.mode === "string" ? figureState.mode : null;
  const dispatch = store.dispatch;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-12">
      <section aria-labelledby={ids.figure} className="flex min-w-0 flex-col gap-3 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={ids.figure} ref={figureHeadingRef} tabIndex={-1} className="text-xl outline-none">
            {t("bench.figureHeading")}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <SoundToggle />
            <Button size="sm" variant="secondary" onClick={() => figure?.focus()}>
              {t("bench.focusFigure")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setHelp(true)} aria-keyshortcuts="?">
              <Kbd aria-hidden="true">?</Kbd>
              <span className="max-sm:sr-only">{t("keys.open")}</span>
            </Button>
          </div>
        </div>
        <FigureFrame ref={setFigure} src={bench.figure.page} title={t("bench.figureTitle", { name: tx(bench.title) })} onEvent={onEvent} />
        <p className="text-sm text-muted">{t("bench.figureHint")}</p>

        <div role="status" aria-live="polite" className="min-h-11" data-notice>
          {notice ? (
            <div key={notice.seq} className="flex flex-wrap items-center gap-3 rounded-ink-sm border-2 border-line bg-surface px-3 py-2 text-sm font-bold shadow-ink-sm">
              <span className="min-w-0 flex-1">{noticeText(notice.notice, setup, t, tx)}</span>
              {notice.notice.kind === "quiz-ready" ? (
                <Button size="sm" variant="primary" onClick={() => dispatch({ type: "quiz/open", quiz: (notice.notice as { quiz: string }).quiz })}>
                  {t("quiz.open")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="ink-card p-4" data-selected-part>
          <h3 className="ink-kicker">{t("bench.selected")}</h3>
          {selected ? (
            <>
              <p className="mt-1 font-bold">
                <span className="font-ui">{selected.id}</span> · {tx(selected.name)}
              </p>
              <p className="mt-1 text-sm">{tx(selected.what)}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">{t("bench.nothingSelected")}</p>
          )}
        </div>

        <LabDock lab="robotics" itemId={bench.id} store={store} figure={figure} />
      </section>

      <div className="min-w-0 lg:col-span-5">
        <StepsPanel
          bench={bench}
          session={state.steps}
          savedDone={savedStep}
          t={t}
          tx={tx}
          dispatch={dispatch}
          onFocusFigure={() => figure?.focus()}
          headingId={ids.steps}
        />
      </div>

      <div className="min-w-0 lg:col-span-7">
        <SerialPanel
          kind={terminalKind(bench)}
          lines={state.serial.lines}
          onClear={() => dispatch({ type: "serial/clear" })}
          t={t}
          headingId={ids.serial}
          logRef={serialRef}
        />
      </div>

      <div className="min-w-0 lg:col-span-5">
        <StatusPanel bench={bench} figure={figureState} draw={draw} t={t} tx={tx} headingId={ids.status} />
      </div>

      <div className="min-w-0 lg:col-span-7">
        <ModesPanel
          bench={bench}
          selected={state.mode.selected}
          running={runningMode}
          texts={setup.texts}
          t={t}
          tx={tx}
          dispatch={dispatch}
          headingId={ids.modes}
        />
      </div>

      <div className="min-w-0 lg:col-span-5">
        <QuizPanel
          bench={bench}
          session={state.quiz}
          unlocked={(quiz) => quizUnlocked(quiz, bench.steps, stepDone)}
          best={best}
          t={t}
          tx={tx}
          dispatch={dispatch}
          headingId={ids.quiz}
        />
      </div>

      <div className="min-w-0 lg:col-span-12">
        <FaultsPanel bench={bench} active={active} t={t} tx={tx} dispatch={dispatch} headingId={ids.faults} />
      </div>

      <div className="min-w-0 lg:col-span-12" ref={tasksRef}>
        <TasksPanel bench={bench} tasks={state.tasks} savedDone={savedTask} t={t} tx={tx} dispatch={dispatch} headingId={ids.tasks} />
      </div>

      <div className="min-w-0 lg:col-span-12">
        <UsageToggle />
      </div>

      <KeyHelp open={help} onClose={() => setHelp(false)} t={t} />
    </div>
  );
}
