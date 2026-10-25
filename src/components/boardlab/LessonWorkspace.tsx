"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LabDock } from "@/components/dock";
import { FigureFrame } from "@/components/figure";
import type { FigureEvent, FigureHandle } from "@/components/figure/protocol";
import { ButtonLink } from "@/components/ui/Button";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Locale } from "@/i18n/config";
import { controlFor } from "@/lib/boardlab/inputs";
import { LessonRunner } from "@/lib/boardlab/run";
import { createBoardLabStore, figureState, initialState, type BoardLabState, type BoardLabStore } from "@/lib/boardlab/store";
import { markDone, progressKey, useDone } from "@/lib/progress";
import { useSettings } from "@/lib/settings/hooks";
import { ChecksPanel } from "./ChecksPanel";
import { CodePanel } from "./CodePanel";
import { FailurePanel } from "./FailurePanel";
import { FigureReadout } from "./FigureReadout";
import { LessonInfo } from "./LessonInfo";
import { LessonStrip } from "./LessonStrip";
import type { LessonModel } from "./model";
import { ParamPanel } from "./ParamPanel";
import { PinReadout } from "./PinReadout";
import { SerialMonitor } from "./SerialMonitor";
import { shortcutFor, typingTarget } from "./shortcuts";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { BoardLabText, useText, type BoardLabMessages } from "./text";
import { useLab } from "./useLab";
import { VIEWS, ViewBar, homeYaw } from "./ViewBar";
import { WireInPanel } from "./WireInPanel";
import { WorldPanel } from "./WorldPanel";
import { loadValues, saveValues } from "./values";

type Props = { lang: Locale; model: LessonModel; messages: BoardLabMessages; text: Record<string, unknown> };

export function LessonWorkspace({ lang, model, messages, text }: Props) {
  return (
    <BoardLabText locale={lang} messages={messages} text={text}>
      <Workspace lang={lang} model={model} />
    </BoardLabText>
  );
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Keys of `next` whose values differ from `prev` (shallow JSON compare). */
function diff(prev: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next)) if (JSON.stringify(prev[k]) !== JSON.stringify(v)) out[k] = v;
  return out;
}

function Workspace({ lang, model }: { lang: Locale; model: LessonModel }) {
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

  const figureOpts = useMemo(() => ({ circuit: lesson.circuit, failures: board.failures }), [lesson.circuit, board.failures]);
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
      const patch = diff(last, nextState);
      last = nextState;
      if (Object.keys(patch).length) figureRef.current?.send("set", { state: patch });
    });
  }, [store, figureOpts]);

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
      if (e.type === "ready") {
        setYaw(homeYaw(figureRef.current));
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
    [store, lesson.world.inputs],
  );

  const toggleRun = useCallback(() => {
    const status = store.getState().run.status;
    store.dispatch({ type: status === "stopped" ? "run/start" : "run/stop" });
  }, [store]);

  const onChip = useCallback(
    (id: string) => {
      const part = chipParts[id];
      if (part) store.dispatch({ type: "part/select", id: part });
      setPulse(id);
      document.getElementById(`param-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pb-16 pt-6 sm:px-6" data-testid="lesson-workspace" data-lesson={lesson.id}>
      <header className="flex flex-col gap-2">
        <Link href={`/${lang}/boards/${board.id}`} className="inline-flex min-h-11 items-center gap-1 self-start text-sm">
          <Icon name="chevron-right" size={16} className="rotate-180" aria-hidden="true" />
          {t("lesson.back", { board: board.name })}
        </Link>
        <p className="ink-kicker">{t("lesson.of", { n: lesson.n, total })}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl sm:text-4xl">{tc(lesson.title)}</h1>
          {done && (
            <span className="inline-flex items-center gap-1 rounded-full bg-good px-3 py-1 text-sm font-semibold text-paper" data-testid="lesson-done">
              <Icon name="check" size={14} aria-hidden="true" />
              {t("lesson.done")}
            </span>
          )}
          <Button size="sm" variant="ghost" className="ms-auto" onClick={() => setHelp(true)} title={t("keys.open")}>
            <span aria-hidden="true">?</span>
            <span>{t("keys.title")}</span>
          </Button>
        </div>
      </header>

      <LessonStrip lang={lang} board={board.id} lessons={lessons} current={lesson.id} />

      {variants.length > 1 && (
        <SegmentedControl
          label={t("board.variant")}
          value={variant ?? variants[0].figureVariant}
          onChange={(v) => store.dispatch({ type: "variant/set", id: v })}
          options={variants.map((v) => ({ value: v.figureVariant, label: v.name }))}
        />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <ViewBar store={store} board={board} figure={getFigure} views={views} xr={xr} onXr={setXr} yaw={yaw} onYaw={setYaw} />
          <FigureFrame ref={attachFigure} src={board.figurePage} title={`${board.name}: ${tc(lesson.title)}`} initial={initial} onEvent={onEvent} />
          <FigureReadout store={store} leds={board.leds} />
          <PinReadout store={store} />
          <WorldPanel store={store} inputs={lesson.world.inputs} />
          <ParamPanel store={store} pulse={pulse} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <CodePanel store={store} chipParts={chipParts} onChip={onChip} onRunToggle={toggleRun} />
          <SerialMonitor store={store} onStop={() => store.dispatch({ type: "run/stop" })} />
          <ChecksPanel store={store} checks={lesson.checks} onCheck={runChecks} done={done} />
        </div>
      </div>

      <LessonInfo lesson={lesson} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FailurePanel store={store} failures={board.failures} figure={getFigure} />
        <WireInPanel wireables={board.wireables} />
      </div>

      <LabDock lab="board" itemId={board.id} store={store} figure={figure} />

      {/* Lesson titles are long: the links wrap instead of widening a phone page. */}
      <nav aria-label={t("lesson.strip")} className="flex flex-wrap justify-between gap-3 border-t-2 border-line pt-4">
        {prev ? (
          <ButtonLink href={`/${lang}/boards/${board.id}/${prev.id}`} variant="secondary" className="max-w-full !whitespace-normal">
            ‹ {t("lesson.prev")}: {prev.title}
          </ButtonLink>
        ) : (
          <span />
        )}
        {next && (
          <ButtonLink href={`/${lang}/boards/${board.id}/${next.id}`} variant={done ? "primary" : "secondary"} className="max-w-full !whitespace-normal">
            {done ? t("lesson.nextCta", { title: next.title }) : `${t("lesson.next")}: ${next.title}`} ›
          </ButtonLink>
        )}
      </nav>

      <ShortcutsDialog open={help} onClose={() => setHelp(false)} />
    </div>
  );
}
