"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LabDock } from "@/components/dock";
import { FigureFrame } from "@/components/figure";
import { SoundToggle } from "@/components/settings";
import type { FigureEvent, FigureHandle } from "@/components/figure/protocol";
import { WorkspaceBar, WorkspaceFrame } from "@/components/shell/workspace";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import type { Locale } from "@/i18n/config";
import { controlFor } from "@/lib/boardlab/inputs";
import { LessonRunner } from "@/lib/boardlab/run";
import { createBoardLabStore, figurePatch, figureState, initialState, type BoardLabState, type BoardLabStore } from "@/lib/boardlab/store";
import { markDone, progressKey, useDone } from "@/lib/progress";
import { useSettings } from "@/lib/settings/hooks";
import { boardMoments } from "@/lib/sound/moments";
import { useFigureSound, useLabMoments, useSketchTones } from "@/lib/sound/react";
import { ChecksPanel, useChecksBadge } from "./ChecksPanel";
import { CodePanel } from "./CodePanel";
import { FailurePanel } from "./FailurePanel";
import { FigureReadout } from "./FigureReadout";
import { LessonInfo, Quiz } from "./LessonInfo";
import { LessonPicker } from "./LessonPicker";
import type { LessonModel } from "./model";
import { ParamPanel } from "./ParamPanel";
import { PinReadout } from "./PinReadout";
import { ScrollRow } from "./ScrollRow";
import { SerialMonitor } from "./SerialMonitor";
import { shortcutFor, typingTarget } from "./shortcuts";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { BoardLabText, useText, type BoardLabMessages } from "./text";
import { useLab } from "./useLab";
import { LESSON_HIDDEN, VIEWS, ViewBar, hideHostDrawn, homeYaw } from "./ViewBar";
import { WireInPanel, lessonWireables } from "./WireInPanel";
import { WorldPanel } from "./WorldPanel";
import { loadValues, saveValues } from "./values";

type Props = {
  lang: Locale;
  model: LessonModel;
  messages: BoardLabMessages;
  text: Record<string, unknown>;
  /** The untranslated chip, rendered on the server. */
  notice?: ReactNode;
};

export function LessonWorkspace({ lang, model, messages, text, notice }: Props) {
  return (
    <BoardLabText locale={lang} messages={messages} text={text}>
      <Workspace lang={lang} model={model} notice={notice} />
    </BoardLabText>
  );
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type RailTab = "serial" | "checks" | "failures" | "quiz" | "inputs" | "params";

function Workspace({ lang, model, notice }: { lang: Locale; model: LessonModel; notice?: ReactNode }) {
  const { t, tc } = useText();
  const router = useRouter();
  const { board, lesson, template, lessons, prev, next } = model;
  const settings = useSettings();
  const doneKey = progressKey.boardLesson(board.id, lesson.id);
  const done = useDone(doneKey);

  // A lesson that needs a variant (Pico W, Uno R4 WiFi) offers only those; otherwise every variant.
  const variants = useMemo(
    () => (lesson.variants.length ? board.variants.filter((v) => lesson.variants.includes(v.id)) : board.variants),
    [board.variants, lesson.variants],
  );
  const [store] = useState<BoardLabStore>(() =>
    createBoardLabStore(
      initialState({
        board: board.id,
        lesson: lesson.id,
        variant: variants[0]?.figureVariant ?? null,
        language: lesson.language,
        template,
        params: lesson.params,
        inputs: Object.fromEntries(lesson.world.inputs.map((i) => [i.id, i.default])),
        baud: lesson.serial.baud || 9600,
        view: lesson.circuit ? "breadboard" : "board",
      }),
    ),
  );
  const figureRef = useRef<FigureHandle | null>(null);
  const [figure, setFigure] = useState<FigureHandle | null>(null);
  const attachFigure = useCallback((h: FigureHandle | null) => {
    figureRef.current = h;
    setFigure(h);
  }, []);
  const getFigure = useCallback(() => figureRef.current, []);
  const reduceRef = useRef(settings.reduceMotion);
  useEffect(() => {
    reduceRef.current = settings.reduceMotion;
  }, [settings.reduceMotion]);

  const [xr, setXr] = useState(false);
  const [yaw, setYaw] = useState(45);
  const [help, setHelp] = useState(false);
  const [pulse, setPulse] = useState<string | null>(null);
  const [tab, setTab] = useState<RailTab>("serial");
  const [expanded, setExpanded] = useState(false);

  const figureOpts = useMemo(
    () => ({ circuit: lesson.circuit, failures: board.failures, inputs: lesson.world.inputs }),
    [lesson.circuit, board.failures, lesson.world.inputs],
  );
  const chipParts = useMemo(() => Object.fromEntries(lesson.params.filter((p) => p.figure).map((p) => [p.id, p.figure!.part])), [lesson.params]);

  // Restore this lesson's saved chip values, then keep saving them (debounced).
  useEffect(() => {
    const saved = loadValues(board.id, lesson.id);
    if (saved) for (const [id, value] of Object.entries(saved)) store.dispatch({ type: "param/set", id, value });
    let timer = 0;
    let last = store.getState().values;
    const off = store.subscribe(() => {
      const values = store.getState().values;
      if (values === last) return;
      last = values;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => saveValues(board.id, lesson.id, values), 400);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, [store, board.id, lesson.id]);

  // The run loop: interpreter -> figure pins and serial monitor; figure events -> interpreter inputs.
  const runnerRef = useRef<LessonRunner | null>(null);
  useEffect(() => {
    const runner = new LessonRunner({
      store,
      board: { id: board.id, name: board.name, logicV: board.logicV, nets: board.nets },
      lesson: { world: lesson.world, runMs: lesson.runMs, checks: lesson.checks, ports: lesson.code.ports },
      failures: board.failures,
      resetControls: board.resetControls,
      figure: getFigure,
      reduceMotion: () => reduceRef.current || prefersReducedMotion(),
      onPassed: () => markDone(doneKey),
    });
    runnerRef.current = runner;
    const detach = runner.attach();
    return () => {
      detach();
      runnerRef.current = null;
      if (store.getState().run.status !== "stopped") store.dispatch({ type: "run/stop" });
    };
  }, [store, board, lesson, doneKey, getFigure]);

  // Store -> figure: send only what changed, as one `set` patch (D14b: always through FigureFrame).
  useEffect(() => {
    let last = figureState(store.getState(), figureOpts);
    return store.subscribe(() => {
      const nextState = figureState(store.getState(), figureOpts);
      const patch = figurePatch(last, nextState);
      last = nextState;
      if (Object.keys(patch).length) figureRef.current?.send("set", { state: patch });
    });
  }, [store, figureOpts]);

  useLabMoments(store, boardMoments, board.id);
  useSketchTones(store);
  const figureSound = useFigureSound();

  const view = useLab(store, (s) => s.view);
  const exploded = useLab(store, (s) => s.exploded);
  const power = useLab(store, (s) => s.power);
  const fault = useLab(store, (s) => s.fault);
  const selected = useLab(store, (s) => s.selected);
  const values = useLab(store, (s) => s.values);
  const variant = useLab(store, (s) => s.variant);
  const initial = useMemo(
    () => figureState({ ...store.getState(), view, exploded, power, fault, selected, values, variant } as BoardLabState, figureOpts),
    [store, view, exploded, power, fault, selected, values, variant, figureOpts],
  );

  const onEvent = useCallback(
    (e: FigureEvent) => {
      figureSound(e);
      if (e.type === "ready") {
        setYaw(homeYaw(figureRef.current));
        hideHostDrawn(figureRef.current, e.buttons, LESSON_HIDDEN);
        runnerRef.current?.figureReady();
        const state = (e as { state?: unknown }).state;
        if (state && typeof state === "object") store.dispatch({ type: "figure/state", state: state as Record<string, unknown> });
      } else if (e.type === "state") {
        store.dispatch({ type: "figure/state", state: e.state });
      } else if (e.type === "part" && e.act === "part" && e.id) {
        const input = lesson.world.inputs.find((i) => i.part === e.id && controlFor(i).kind === "hold");
        if (input) {
          store.dispatch({ type: "input/set", id: input.id, value: input.max });
          window.setTimeout(() => store.dispatch({ type: "input/set", id: input.id, value: input.min }), 250);
        }
      }
    },
    [store, lesson.world.inputs, figureSound],
  );

  // Run shows its output: starting a run brings the serial monitor to the front, unless the learner is
  // on a tab they play while it runs (the inputs, the parameters).
  const toggleRun = useCallback(() => {
    const status = store.getState().run.status;
    if (status === "stopped") setTab((current) => (current === "inputs" || current === "params" ? current : "serial"));
    store.dispatch({ type: status === "stopped" ? "run/start" : "run/stop" });
  }, [store]);

  const onChip = useCallback(
    (id: string) => {
      const part = chipParts[id];
      if (part) store.dispatch({ type: "part/select", id: part });
      setPulse(id);
      setTab("params");
      window.requestAnimationFrame(() => document.getElementById(`param-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
      window.setTimeout(() => setPulse((p) => (p === id ? null : p)), 900);
    },
    [store, chipParts],
  );

  // Re-run the deterministic check run on the current code without a new upload.
  const runChecks = useCallback(() => void runnerRef.current?.checkSource(store.getState().code), [store]);

  const views = lesson.circuit ? VIEWS : VIEWS.filter((v) => v !== "breadboard" && v !== "schematic");

  // Global shortcuts (ignored while typing, and with Ctrl/Cmd/Alt).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || typingTarget(document.activeElement, e.key)) return;
      const a = shortcutFor(e);
      if (!a) return;
      const s = store.getState();
      switch (a.kind) {
        case "run":
          toggleRun();
          break;
        case "view":
          if (!views.includes(a.view)) return;
          store.dispatch({ type: "view/set", view: s.view === a.view && a.view !== "board" ? "board" : a.view });
          break;
        case "exploded":
          store.dispatch({ type: "exploded/set", on: !s.exploded });
          break;
        case "seeThrough":
          setXr((on) => {
            figureRef.current?.send("xr", { on: !on });
            return !on;
          });
          break;
        case "turn":
          setYaw((y) => {
            figureRef.current?.send("view", { yaw: y + a.deg, ms: 600 });
            return y + a.deg;
          });
          break;
        case "resetView": {
          const home = homeYaw(figureRef.current);
          setYaw(home);
          figureRef.current?.send("view", { yaw: home, ms: 900 });
          break;
        }
        case "lesson": {
          const target = a.delta < 0 ? prev : next;
          if (target) router.push(`/${lang}/boards/${board.id}/${target.id}`);
          break;
        }
        case "jump": {
          const target = lessons.find((l) => l.n === a.n);
          if (target && target.id !== lesson.id) router.push(`/${lang}/boards/${board.id}/${target.id}`);
          break;
        }
        case "figure":
          figureRef.current?.focus();
          break;
        case "escape":
          if (s.selected) store.dispatch({ type: "part/select", id: null });
          return;
        case "help":
          setHelp(true);
          break;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, toggleRun, views, prev, next, lessons, lesson.id, lang, board.id, router]);

  const total = lessons.length;
  const checksBadge = useChecksBadge(store, lesson.checks.length);
  const hasInputs = lesson.world.inputs.some((i) => controlFor(i).kind !== "none");
  const current = lessons.find((l) => l.id === lesson.id) ?? { id: lesson.id, n: lesson.n, level: lesson.level, title: tc(lesson.title) };
  const wired = useMemo(() => lessonWireables(board.wireables, lesson.pins.map((p) => p.pin)), [board.wireables, lesson.pins]);

  const railTabs: TabItem[] = [
    { id: "serial", label: t("serial.tab"), content: <SerialMonitor store={store} onStop={() => store.dispatch({ type: "run/stop" })} /> },
    ...(lesson.checks.length
      ? [{ id: "checks", label: t("checks.title"), badge: checksBadge, content: <ChecksPanel store={store} checks={lesson.checks} onCheck={runChecks} done={done} /> }]
      : []),
    ...(board.failures.length
      ? [{ id: "failures", label: t("failures.title"), content: <FailurePanel store={store} failures={board.failures} figure={getFigure} circuit={lesson.circuit} /> }]
      : []),
    ...(lesson.quiz ? [{ id: "quiz", label: t("lesson.quiz"), content: <Quiz quiz={lesson.quiz} /> }] : []),
    ...(hasInputs ? [{ id: "inputs", label: t("world.title"), content: <WorldPanel store={store} inputs={lesson.world.inputs} /> }] : []),
    ...(lesson.params.length ? [{ id: "params", label: t("params.title"), content: <ParamPanel store={store} pulse={pulse} /> }] : []),
  ];

  return (
    <WorkspaceFrame
      // A wider rail than the default: room for 55-character code lines; Expand gives the code half the screen.
      className={expanded ? "[--rail-w:clamp(24rem,50vw,56rem)]" : "[--rail-w:clamp(24rem,34vw,38rem)]"}
      data-testid="lesson-workspace"
      data-lesson={lesson.id}
      bar={
        <WorkspaceBar
          back={{ href: `/${lang}/boards/${board.id}`, label: board.name }}
          tone="cobalt"
          kicker={t("lesson.of", { n: lesson.n, total })}
          title={tc(lesson.title)}
          status={
            <>
              {done && (
                <span className="inline-flex items-center gap-1 rounded-full bg-good px-2.5 py-0.5 text-xs font-semibold text-paper" data-testid="lesson-done">
                  <Icon name="check" size={12} aria-hidden="true" />
                  {t("lesson.done")}
                </span>
              )}
              {notice}
            </>
          }
          actions={
            <>
              {done && next ? (
                <ButtonLink href={`/${lang}/boards/${board.id}/${next.id}`} variant="primary" size="sm" className="max-sm:hidden">
                  {t("lesson.nextCta", { title: next.title })} ›
                </ButtonLink>
              ) : null}
              <LessonPicker lang={lang} board={board.id} lessons={lessons} current={current} />
              <SoundToggle compact />
              <IconButton
                icon="keyboard"
                size="sm"
                label={t("keys.title")}
                shortcut="?"
                aria-keyshortcuts="?"
                className="[@media(pointer:coarse)]:hidden"
                onClick={() => setHelp(true)}
              />
              <LabDock lab="board" itemId={board.id} store={store} figure={figure} />
            </>
          }
        />
      }
      stage={
        <>
          <ViewBar store={store} board={board} figure={getFigure} views={views} variants={variants} xr={xr} onXr={setXr} yaw={yaw} onYaw={setYaw} />
          <FigureFrame fill ref={attachFigure} src={board.figurePage} title={`${board.name}: ${tc(lesson.title)}`} initial={initial} onEvent={onEvent} />
          <ScrollRow label={t("readout.label")} className="min-h-8">
            <FigureReadout store={store} leds={board.leds} />
            <PinReadout store={store} />
          </ScrollRow>
        </>
      }
      rail={
        <Panel>
          <CodePanel
            store={store}
            chipParts={chipParts}
            onChip={onChip}
            onRunToggle={toggleRun}
            expanded={expanded}
            onExpand={setExpanded}
            className="lg:min-h-56 lg:flex-1"
          />
          <div className="flex min-h-0 flex-col border-t-[1.5px] border-rule lg:h-[46%] lg:shrink-0">
            <Tabs
              fill
              phoneGrid
              label={t("code.title")}
              tabs={railTabs}
              value={tab}
              onChange={(id) => setTab(id as RailTab)}
              listClassName="ws-sticky-tabs"
            />
          </div>
        </Panel>
      }
      below={
        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,72ch)_minmax(0,1fr)]">
            <div className="max-w-[72ch]">
              <LessonInfo lesson={lesson} />
            </div>
            <WireInPanel wireables={wired} all={{ href: `/${lang}/boards/${board.id}`, label: t("wire.allParts", { n: board.wireables.length, board: board.name }) }} />
          </div>
          {/* Lesson titles are long: the links wrap instead of widening a phone page. */}
          <nav aria-label={t("lesson.strip")} className="flex flex-wrap justify-between gap-3 border-t-[1.5px] border-rule pt-4">
            {prev ? (
              <ButtonLink href={`/${lang}/boards/${board.id}/${prev.id}`} variant="secondary">
                ‹ {t("lesson.prev")}: {prev.title}
              </ButtonLink>
            ) : (
              <span />
            )}
            {next && (
              <ButtonLink href={`/${lang}/boards/${board.id}/${next.id}`} variant={done ? "primary" : "secondary"}>
                {done ? t("lesson.nextCta", { title: next.title }) : `${t("lesson.next")}: ${next.title}`} ›
              </ButtonLink>
            )}
          </nav>
          <ShortcutsDialog open={help} onClose={() => setHelp(false)} />
        </div>
      }
    />
  );
}
