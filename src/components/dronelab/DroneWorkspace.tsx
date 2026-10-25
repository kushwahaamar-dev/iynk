"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { DroneContent } from "@/content/schema";
import { DRONES } from "@/content/ids";
import { LabDock } from "@/components/dock/LabDock";
import { FigureFrame, type FigureEvent, type FigureHandle, type HostCommand } from "@/components/figure";
import { SoundToggle, UsageToggle } from "@/components/settings";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Tabs } from "@/components/ui/Tabs";
import { Toggle } from "@/components/ui/Toggle";
import type { Locale } from "@/i18n/config";
import { isDesignPick } from "@/lib/drone/design";
import { buildComplete, droneProgressKeys, testStatus } from "@/lib/dronelab/bench";
import { readBench } from "@/lib/dronelab/figure";
import { readBenchSummary, writeBenchSummary } from "@/lib/dronelab/session";
import { benchSummary, createDroneLabStore, figureInitial, type DroneLabState, type DroneTab } from "@/lib/dronelab/store";
import { progressKey } from "@/lib/progress/keys";
import { markDone } from "@/lib/progress/progress";
import { droneMoments } from "@/lib/sound/moments";
import { useFigureSound, useLabMoments } from "@/lib/sound/react";
import { BuildPanel } from "./BuildPanel";
import { CliConsole } from "./CliConsole";
import { CraftProgress } from "./CraftProgress";
import { DesignPanel } from "./DesignPanel";
import { KeyboardHelp } from "./KeyboardHelp";
import { QuizPanel } from "./QuizPanel";
import { TestsPanel } from "./TestsPanel";
import { WiringPanel } from "./WiringPanel";
import { contentT, droneLabT, type DroneLabMessages } from "./text";

/** Host -> figure: the store's commands go out only through FigureFrame's handle (D14b). */
function sendTo(figure: FigureHandle, command: HostCommand) {
  if (command.type === "set") figure.send("set", { state: command.state });
  else if (command.type === "press")
    figure.send("press", { id: command.id, ...(command.choice ? { choice: command.choice } : {}) });
}

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

type Props = {
  lang: Locale;
  content: DroneContent;
  text: Record<string, unknown>;
  messages: DroneLabMessages;
};

export function DroneWorkspace({ lang, content, text, messages }: Props) {
  const t = useMemo(() => droneLabT(lang, messages), [lang, messages]);
  const ct = useMemo(() => contentT(lang, content.id, text), [lang, content.id, text]);
  const [store] = useState(() => createDroneLabStore(content));
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [figure, setFigure] = useState<FigureHandle | null>(null);
  const [flash, setFlash] = useState("");
  const enterFigure = useRef<HTMLButtonElement>(null);
  const id = content.id;
  const dispatch = store.dispatch;

  useEffect(() => (figure ? store.connect((command) => sendTo(figure, command)) : undefined), [figure, store]);
  const moments = useCallback((prev: DroneLabState, next: DroneLabState) => droneMoments(content, prev, next), [content]);
  useLabMoments(store, moments, id);
  const figureSound = useFigureSound();

  // The design picked earlier in this tab, restored after hydration so server and client render the same.
  useEffect(() => {
    const saved = readBenchSummary(id);
    if (!saved || !isDesignPick(content.design, saved.pick)) return;
    for (const key of ["batt", "motor", "prop"] as const) {
      if (saved.pick[key] !== store.getState().pick[key]) dispatch({ type: "design/pick", key, value: saved.pick[key] });
    }
  }, [id, content.design, store, dispatch]);

  useEffect(() => {
    writeBenchSummary(id, benchSummary(state));
  }, [id, state]);

  // Progress (D7): the build once every step holds, a test once the learner ran it and it passed.
  useEffect(() => {
    if (buildComplete(content, state.figure)) markDone(progressKey.droneBuild(id));
    for (const test of content.tests) {
      if (testStatus(test, state.figure, state.attempted[test.id] === true) === "passed")
        markDone(progressKey.droneTest(id, test.id));
    }
  }, [content, id, state.figure, state.attempted]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        (event.key === "f" || event.key === "F") &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !typing(event.target)
      ) {
        event.preventDefault();
        figure?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [figure]);

  const onEvent = useCallback(
    (event: FigureEvent) => {
      figureSound(event);
      switch (event.type) {
        case "ready":
          dispatch({ type: "figure/ready" });
          break;
        case "state":
          dispatch({ type: "figure/state", state: event.state });
          break;
        case "button":
          if (event.by === "user") dispatch({ type: "figure/button", id: event.id });
          break;
        case "flash":
          setFlash(event.text);
          break;
        case "focus":
          if (!event.on) enterFigure.current?.focus();
          break;
      }
    },
    [dispatch, figureSound],
  );

  const bench = readBench(state.figure);
  const initial = useMemo(() => figureInitial(content, state), [content, state]);
  const meta = DRONES[id];
  const fig = String(content.fig).padStart(2, "0");
  const fwName = t(`firmware.${content.firmware.firmware}`);
  const keys = useMemo(() => droneProgressKeys(content), [content]);
  const ready = state.figureReady;
  const tabLabel = (tab: DroneTab) => t(`workspace.tabs.${tab}`);

  const tabs = [
    {
      id: "design",
      label: tabLabel("design"),
      content: (
        <DesignPanel
          lang={lang}
          content={content}
          pick={state.pick}
          t={t}
          ct={ct}
          onPick={(key, value) => dispatch({ type: "design/pick", key, value })}
        />
      ),
    },
    {
      id: "build",
      label: tabLabel("build"),
      content: (
        <BuildPanel content={content} figure={state.figure} ready={ready} sel={state.sel} t={t} ct={ct} dispatch={dispatch} />
      ),
    },
    {
      id: "wiring",
      label: tabLabel("wiring"),
      content: (
        <WiringPanel content={content} sheet={state.sheet} sel={state.sel} ready={ready} t={t} ct={ct} dispatch={dispatch} />
      ),
    },
    {
      id: "tests",
      label: tabLabel("tests"),
      content: (
        <TestsPanel
          content={content}
          figure={state.figure}
          attempted={state.attempted}
          ready={ready}
          t={t}
          ct={ct}
          dispatch={dispatch}
        />
      ),
    },
    {
      id: "cli",
      label: tabLabel("cli"),
      content: <CliConsole content={content} cli={state.cli} t={t} ct={ct} dispatch={dispatch} />,
    },
    ...(content.quizzes.length > 0
      ? [
          {
            id: "quiz",
            label: tabLabel("quiz"),
            content: <QuizPanel content={content} state={state} t={t} ct={ct} dispatch={dispatch} />,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <nav aria-label={t("workspace.crumbs")} className="font-ui text-xs font-bold uppercase tracking-wider">
        <Link href={`/${lang}/drones`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          {t("workspace.back")}
        </Link>
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="ink-kicker">
            {t("workspace.fig", { n: fig })} · {t(`classes.${content.class}`)} · {content.firmware.version}
          </p>
          <h1 className="mt-2">{ct(content.title)}</h1>
          <p className="mt-2 text-lg text-muted">{ct(content.sub)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CraftProgress
            keys={keys}
            label={t("workspace.progress")}
            countTemplate={messages.index.progressValue}
            valueTemplate={messages.workspace.progressLabel}
          />
          <SoundToggle />
          <KeyboardHelp t={t} />
          <ButtonLink
            href={`/${lang}/drones/${id}/fly`}
            variant="primary"
            data-testid="fly-link"
            aria-describedby={`fly-note-${id}`}
          >
            {t("workspace.fly")}
          </ButtonLink>
        </div>
        <p id={`fly-note-${id}`} className="w-full text-end text-sm text-muted">
          {bench.flight?.ready ? t("workspace.flyReady") : t("workspace.flyNotReady")}
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section
          aria-label={t("workspace.figureTitle", { title: ct(content.title) })}
          className="space-y-3 self-start lg:sticky lg:top-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              label={t("workspace.view")}
              value={state.sheet === "wiring" ? "wiring" : "bench"}
              options={[
                { value: "bench", label: t("workspace.viewBench") },
                { value: "wiring", label: t("workspace.viewWiring") },
              ]}
              onChange={(v) => dispatch({ type: "sheet", sheet: v === "wiring" ? "wiring" : null })}
              size="sm"
            />
            <Toggle
              checked={state.exploded}
              onChange={(on) => dispatch({ type: "exploded", on })}
              label={t("workspace.exploded")}
              disabled={!ready}
            />
            <Button ref={enterFigure} size="sm" variant="ghost" onClick={() => figure?.focus()} aria-keyshortcuts="F">
              {t("workspace.figureFocus")}
            </Button>
          </div>
          <FigureFrame
            ref={setFigure}
            src={`${content.figure.page}?step=0&fresh=1`}
            title={t("workspace.figureTitle", { title: ct(content.title) })}
            initial={initial}
            onEvent={onEvent}
          />
          <p className="text-xs text-muted">{t("workspace.figureHint")}</p>
          <div role="status" aria-live="polite" className="min-h-6 font-ui text-sm font-bold" data-testid="figure-flash">
            {flash}
          </div>
          <dl
            aria-label={t("workspace.status.title")}
            className="grid grid-cols-3 gap-2 rounded-ink border-2 border-line bg-surface p-3 text-sm"
            data-testid="bench-status"
          >
            <div>
              <dt className="ink-kicker text-[0.65rem]">{t("workspace.status.parts")}</dt>
              <dd className="font-ui font-bold">{ready ? `${bench.fitted}/${bench.total}` : "…"}</dd>
            </div>
            <div>
              <dt className="ink-kicker text-[0.65rem]">{t("workspace.status.plugged")}</dt>
              <dd className="font-ui font-bold">
                {bench.plugged ? t("workspace.status.pluggedOn") : t("workspace.status.pluggedOff")}
              </dd>
            </div>
            <div>
              <dt className="ink-kicker text-[0.65rem]">{t("workspace.status.fault")}</dt>
              <dd className={`font-ui font-bold ${bench.fault ? "text-bad" : ""}`}>
                {bench.fault ? t("workspace.status.faultCap") : t("workspace.status.faultNone")}
              </dd>
            </div>
          </dl>
          {!ready ? <p className="text-sm text-muted">{t("workspace.status.waiting")}</p> : null}
          <section aria-label={t("log.title", { name: fwName })} className="overflow-hidden rounded-ink border-2 border-line">
            <h2 className="border-b-2 border-line bg-sunken px-3 py-1.5 font-ui text-xs font-bold uppercase tracking-wider">
              {t("log.title", { name: fwName })}
            </h2>
            <div
              role="log"
              aria-live="polite"
              tabIndex={0}
              className="max-h-40 overflow-y-auto bg-[#1d2a26] p-3 font-ui text-xs leading-relaxed text-[#8af0ae]"
              data-testid="figure-log"
            >
              {state.log.lines.length === 0 ? (
                <p className="text-[#8aa59a]">{t("log.empty")}</p>
              ) : (
                state.log.lines.slice(-40).map((line, i) => <div key={i}>{line}</div>)
              )}
            </div>
          </section>
          <LabDock lab="drone" itemId={id} store={store} figure={figure} />
        </section>

        <section aria-label={t("workspace.sections")} className="min-w-0">
          <Tabs
            label={t("workspace.sections")}
            tabs={tabs}
            value={state.tab}
            onChange={(tab) => dispatch({ type: "tab", tab: tab as DroneTab })}
            panelClassName="pt-5"
          />
        </section>
      </div>

      <section className="mt-12 grid gap-6 lg:grid-cols-2" aria-labelledby={`meet-${id}-${lang}`}>
        <div className="ink-prose">
          <h2 id={`meet-${id}-${lang}`}>{t("workspace.meet", { noun: ct(content.noun) })}</h2>
          {ct(content.overview)
            .split(/\n{2,}/)
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </div>
        <div className="ink-prose">
          <h2>{t("workspace.practice")}</h2>
          <p>{ct(content.practice)}</p>
          <p className="text-muted">{ct(content.hint)}</p>
          <p className="font-ui text-xs text-muted">
            {meta.tags.map((tag) => `#${(messages.tags as Record<string, string>)[tag] ?? tag}`).join(" ")}
          </p>
        </div>
      </section>

      <div className="mt-12">
        <UsageToggle />
      </div>
    </div>
  );
}
