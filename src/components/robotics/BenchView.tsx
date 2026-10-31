"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { FigureFrame, type FigureEvent, type FigureHandle } from "@/components/figure";
import { SoundToggle } from "@/components/settings";
import { WorkspaceBar, WorkspaceFrame } from "@/components/shell/workspace";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/Panel";
import { Tabs } from "@/components/ui/Tabs";
import { useLocale } from "@/i18n/client";
import { progressKey } from "@/lib/progress/keys";
import { benchKeys, boardProduct, terminalKind } from "@/lib/robotics/catalog";
import { currentDraw } from "@/lib/robotics/current";
import { quizUnlocked } from "@/lib/robotics/quiz";
import type { FailureMode } from "@/content/schema";
import type { QuizResult } from "@/lib/progress";
import type { BenchAction, BenchSetup, BenchState, Notice } from "@/lib/robotics/session";
import { currentStepIndex } from "@/lib/robotics/steps";
import { BenchProgress } from "./BenchProgress";
import { benchChrome } from "./chrome";
import { FaultsPanel } from "./FaultsPanel";
import { KeyHelp } from "./KeyHelp";
import { textLookup, useBenchT, type BenchMessages, type BenchT, type TextOf } from "./messages";
import { ModesPanel } from "./ModesPanel";
import { QuizPanel, quizTitle } from "./QuizPanel";
import { SerialPanel } from "./SerialPanel";
import { LiveStrip, StatusPanel } from "./StatusPanel";
import { StepsPanel } from "./StepsPanel";
import { TasksPanel } from "./TasksPanel";

export type BenchViewProps = {
  setup: BenchSetup;
  messages: BenchMessages;
  state: BenchState;
  dispatch: (action: BenchAction) => void;
  active: readonly FailureMode[];
  figure: FigureHandle | null;
  /** Hands the figure's handle to the controller once the frame mounts. */
  onHandle: (handle: FigureHandle | null) => void;
  onFigure: (event: FigureEvent) => void;
  savedDone: (key: string) => boolean;
  best: (quizId: string) => QuizResult | undefined;
  /** The dock button on the old page. */
  toolbar?: ReactNode;
  /** The untranslated-prose chip, rendered on the server; it sits in the workspace bar. */
  notice?: ReactNode;
  /** Links to the neighbouring benches, rendered on the server; they close the page. */
  walk?: ReactNode;
};

type RailTab = "steps" | "faults" | "status" | "quiz";

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

// From 1024 px the workspace fills the screen and the serial drawer can be taller. Under 640 px the figure is so
// narrow that its own buttons and HUD stack above the drawing.
const WIDE = "(min-width: 64rem)";
const PHONE = "(max-width: 39.99rem)";
const matches = (query: string) => typeof window.matchMedia === "function" && window.matchMedia(query).matches;
function subscribeMedia(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const queries = [WIDE, PHONE].map((query) => window.matchMedia(query));
  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}
const useWide = () => useSyncExternalStore(subscribeMedia, () => matches(WIDE), () => true);
const usePhone = () => useSyncExternalStore(subscribeMedia, () => matches(PHONE), () => false);

// Item prose may start lower case ("why not to use it"); a line that stands alone starts with a capital.
function capital(text: string, locale: string): string {
  return text ? text.charAt(0).toLocaleUpperCase(locale) + text.slice(1) : text;
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

// How long a notice stays on the figure. The live region keeps the text for screen readers either way;
// a ready quiz stays until it is taken or dismissed.
const NOTICE_MS = 7000;

export function BenchView({ setup, messages, state, dispatch, active, figure, onHandle, onFigure, savedDone, best, toolbar, notice: untranslated, walk }: BenchViewProps) {
  const { bench } = setup;
  const locale = useLocale();
  const t = useBenchT(messages);
  const tx = useMemo(() => textLookup(setup.texts), [setup.texts]);
  const wide = useWide();
  const phone = usePhone();
  const chrome = useMemo(() => benchChrome(bench, phone), [bench, phone]);
  const [help, setHelp] = useState(false);
  const [tab, setTab] = useState<RailTab>("steps");
  const [serialOpen, setSerialOpen] = useState(false);
  const [noticeGone, setNoticeGone] = useState<number | null>(null);
  const id = useId();
  const ids = {
    figure: `${id}-figure`,
    steps: `${id}-steps`,
    status: `${id}-status`,
    modes: `${id}-modes`,
    faults: `${id}-faults`,
    tasks: `${id}-tasks`,
    quiz: `${id}-quiz`,
    about: `${id}-about`,
    sources: `${id}-sources`,
  };
  const figureHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const serialRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);

  const figureState = state.figure.state;
  const draw = useMemo(() => currentDraw(bench.current, figureState, active), [bench.current, figureState, active]);

  const stepDone = useCallback(
    (stepId: string) => state.steps[stepId]?.done === true || savedDone(progressKey.roboticsStep(bench.id, stepId)),
    [state.steps, savedDone, bench.id],
  );
  const savedStep = useCallback((stepId: string) => savedDone(progressKey.roboticsStep(bench.id, stepId)), [savedDone, bench.id]);
  const savedTask = useCallback((taskId: string) => savedDone(progressKey.roboticsTask(bench.id, taskId)), [savedDone, bench.id]);

  const focusFigure = useCallback(() => figure?.focus(), [figure]);

  const onEvent = useCallback(
    (event: FigureEvent) => {
      onFigure(event);
      if (event.type !== "focus" || event.on) return;
      // The figure hands focus back (Escape inside it): continue from the button that went in.
      const button = focusButtonRef.current;
      if (button && button.offsetParent !== null) button.focus();
      else figureHeadingRef.current?.focus();
    },
    [onFigure],
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
        const step = bench.steps[currentStepIndex(bench.steps, state.steps)];
        if (step) dispatch({ type: "step/do", step: step.id });
      } else if (key === "f") {
        figure?.focus();
      } else if (key === "q") {
        if (readyQuiz) dispatch({ type: "quiz/open", quiz: readyQuiz.id });
      } else if (key === "s") {
        // The log lives in the drawer under the figure: open it first so there is something to focus.
        flushSync(() => setSerialOpen(true));
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
  }, [bench.steps, state.steps, dispatch, figure, readyQuiz]);

  const current = state.notice;
  // A notice leaves the figure after a few seconds; a ready quiz waits for the learner.
  useEffect(() => {
    if (!current || current.notice.kind === "quiz-ready") return;
    const seq = current.seq;
    const timer = window.setTimeout(() => setNoticeGone(seq), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [current]);
  // The figure draws its own toast for its own flashes, so those are for screen readers only.
  const noticeShown = current !== null && current.notice.kind !== "figure" && noticeGone !== current.seq;

  const selectedId = typeof figureState.selected === "string" ? figureState.selected : null;
  const selected = selectedId ? bench.figure.parts.find((part) => part.id === selectedId) : undefined;
  const runningMode = typeof figureState.mode === "string" ? figureState.mode : null;
  const keys = benchKeys(bench);
  const board = bench.board ? boardProduct(bench.id) : null;
  const doneSteps = bench.steps.filter((step) => stepDone(step.id)).length;
  const takenQuizzes = bench.quizzes.filter((quiz) => best(quiz.id)).length;
  const sub = capital(tx(bench.sub), locale);

  const bar = (
    <WorkspaceBar
      back={{ href: `/${locale}/robotics`, label: t("bench.back") }}
      tone="mint"
      kicker={
        <>
          {t("bench.kicker", { n: String(bench.fig).padStart(2, "0") })}
          {sub ? <span className="font-semibold normal-case tracking-normal"> · {sub}</span> : null}
        </>
      }
      title={tx(bench.title)}
      status={
        <>
          <BenchProgress
            keys={[...keys.steps, ...keys.tasks, ...keys.quizzes]}
            label={t("bench.progressName")}
            countTemplate={t("bench.progress", { done: "{done}", total: "{total}" })}
            valueTemplate={t("bench.progressLabel", { done: "{done}", total: "{total}" })}
            size="xs"
          />
          {untranslated}
        </>
      }
      actions={
        <>
          {bench.board && board ? (
            <Link
              href={`/${locale}/boards/${bench.board}`}
              aria-label={t("bench.boardLink", { board })}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted no-underline hover:bg-sunken hover:text-ink max-md:hidden [@media(pointer:coarse)]:min-h-11"
            >
              <Icon name="board" size={20} />
              <span className="max-w-[12rem] truncate">{board}</span>
            </Link>
          ) : null}
          <SoundToggle compact />
          <IconButton
            ref={focusButtonRef}
            size="sm"
            icon="target"
            label={t("bench.focusFigure")}
            shortcut="F"
            aria-keyshortcuts="F"
            className="[@media(pointer:coarse)]:hidden"
            onClick={focusFigure}
          />
          <IconButton
            size="sm"
            icon="keyboard"
            label={t("keys.open")}
            shortcut="?"
            aria-keyshortcuts="?"
            className="[@media(pointer:coarse)]:hidden"
            onClick={() => setHelp(true)}
          />
          {toolbar}
        </>
      }
    />
  );

  const stage = (
    <section aria-labelledby={ids.figure} className="flex min-h-0 flex-1 flex-col gap-2">
      <h2 id={ids.figure} ref={figureHeadingRef} tabIndex={-1} className="sr-only">
        {t("bench.figureHeading")}
      </h2>
      <p className="sr-only">{t("bench.figureHint")}</p>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <FigureFrame
          ref={onHandle}
          fill
          src={bench.figure.page}
          title={t("bench.figureTitle", { name: tx(bench.title) })}
          onEvent={onEvent}
          hideChrome={chrome}
        />

        <div
          data-selected-part
          className={cx(
            "pointer-events-none absolute bottom-3 start-3 max-w-[min(26rem,calc(100%-1.5rem))]",
            !selected && "hidden",
          )}
        >
          {selected ? (
            <div className="rounded-lg bg-surface/95 px-3 py-2 shadow-md">
              <p className="text-sm font-semibold leading-snug">
                <span className="sr-only">{t("bench.selected")}: </span>
                <span className="tabular font-mono">{selected.id}</span> · {tx(selected.name)}
              </p>
              <p className="mt-0.5 line-clamp-3 text-xs leading-snug text-muted">{tx(selected.what)}</p>
            </div>
          ) : null}
        </div>

        <div
          role="status"
          aria-live="polite"
          data-notice
          className={cx(
            "absolute inset-x-3 flex justify-center",
            selected ? "bottom-24" : "bottom-3",
            !noticeShown && "sr-only",
          )}
        >
          {current ? (
            <div
              key={current.seq}
              className="flex max-w-[40rem] animate-rise-in items-center gap-3 rounded-lg bg-surface px-4 py-2 text-sm font-semibold leading-snug shadow-md"
            >
              <span className="min-w-0 flex-1">{noticeText(current.notice, setup, t, tx)}</span>
              {current.notice.kind === "quiz-ready" ? (
                <Button
                  size="sm"
                  variant="primary"
                  className="shrink-0 whitespace-nowrap"
                  onClick={() => dispatch({ type: "quiz/open", quiz: (current.notice as { quiz: string }).quiz })}
                >
                  {t("quiz.open")}
                </Button>
              ) : null}
              <IconButton size="sm" icon="close" label={t("keys.close")} tooltipSide="top" className="-me-2 shrink-0" onClick={() => setNoticeGone(current.seq)} />
            </div>
          ) : null}
        </div>
      </div>

      <SerialPanel
        kind={terminalKind(bench)}
        lines={state.serial.lines}
        onClear={() => dispatch({ type: "serial/clear" })}
        open={serialOpen}
        onOpenChange={setSerialOpen}
        height={wide ? 200 : 132}
        t={t}
        logRef={serialRef}
      />
    </section>
  );

  const hasFaults = bench.faults.length > 0;
  const hasQuiz = bench.quizzes.length > 0;
  const rail = (
    <Panel>
      <LiveStrip bench={bench} figure={figureState} draw={draw} t={t} tx={tx} />
      <div className="min-h-0 flex-1">
        <Tabs
          fill
          label={t("bench.tabs.label")}
          value={tab}
          onChange={(next) => setTab(next as RailTab)}
          phoneGrid
          // Four tabs share a phone's width as four equal cells; labels and their counts may wrap.
          // Below xl the rail is 22rem, a few px short of four tabs with their counts.
          listClassName={cx("ws-sticky-tabs lg:max-xl:[&>[role=tab]]:px-2", hasFaults && hasQuiz && "max-sm:!grid-cols-4")}
          tabs={[
            {
              id: "steps",
              label: t("bench.tabs.steps"),
              badge: `${doneSteps}/${bench.steps.length}`,
              content: (
                <StepsPanel
                  bench={bench}
                  session={state.steps}
                  savedDone={savedStep}
                  t={t}
                  tx={tx}
                  dispatch={dispatch}
                  onFocusFigure={focusFigure}
                  headingId={ids.steps}
                />
              ),
            },
            ...(hasFaults
              ? [
                  {
                    id: "faults",
                    label: t("bench.tabs.faults"),
                    badge: active.length > 0 ? String(active.length) : undefined,
                    content: <FaultsPanel bench={bench} active={active} t={t} tx={tx} dispatch={dispatch} headingId={ids.faults} />,
                  },
                ]
              : []),
            {
              id: "status",
              label: t("bench.tabs.status"),
              content: <StatusPanel bench={bench} figure={figureState} draw={draw} t={t} tx={tx} headingId={ids.status} />,
            },
            ...(hasQuiz
              ? [
                  {
                    id: "quiz",
                    label: t("bench.tabs.quiz"),
                    badge: `${takenQuizzes}/${bench.quizzes.length}`,
                    content: (
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
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
    </Panel>
  );

  const hint = tx(bench.hint);
  const overview = tx(bench.overview);
  const below = (
    <div className="mx-auto flex max-w-[110rem] flex-col gap-12">
      <div className="grid grid-cols-1 gap-x-12 gap-y-10 xl:grid-cols-[minmax(0,68ch)_minmax(0,1fr)]">
        <section aria-labelledby={ids.about} className="min-w-0">
          <h2 id={ids.about} className="text-xl">
            {t("bench.overview")}
          </h2>
          {hint ? <p className="mt-3 text-lg leading-snug first-letter:uppercase">{hint}</p> : null}
          {overview ? <p className="mt-3 max-w-[68ch] leading-relaxed">{overview}</p> : null}
          {bench.sources.length > 0 ? (
            <section aria-labelledby={ids.sources} className="mt-6">
              <h3 id={ids.sources} className="kicker">
                {t("bench.sources")}
              </h3>
              <ul className="mt-1 flex flex-col text-sm">
                {bench.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-2 [@media(pointer:coarse)]:min-h-11">
                      {source.title}
                      <Icon name="external" size={16} className="shrink-0 text-muted" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </section>
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

      <div className="min-w-0" ref={tasksRef}>
        <TasksPanel bench={bench} tasks={state.tasks} savedDone={savedTask} t={t} tx={tx} dispatch={dispatch} headingId={ids.tasks} />
      </div>

      {walk}
      <KeyHelp open={help} onClose={() => setHelp(false)} t={t} />
    </div>
  );

  return <WorkspaceFrame data-bench-workspace={bench.id} bar={bar} stage={stage} rail={rail} below={below} />;
}
