"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { DroneContent } from "@/content/schema";
import { LabDock } from "@/components/dock/LabDock";
import { FigureFrame, type FigureEvent, type FigureHandle, type HostCommand } from "@/components/figure";
import { SoundToggle } from "@/components/settings";
import { StageDrawer, WorkspaceBar, WorkspaceFrame } from "@/components/shell/workspace";
import { Button, ButtonLink } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Tabs } from "@/components/ui/Tabs";
import type { Locale } from "@/i18n/config";
import { isDesignPick } from "@/lib/drone/design";
import { buildComplete, droneProgressKeys, isEngineTest, testStatus } from "@/lib/dronelab/bench";
import { readBench } from "@/lib/dronelab/figure";
import { readBenchSummary, writeBenchSummary } from "@/lib/dronelab/session";
import { benchSummary, createDroneLabStore, figureInitial, type DroneLabState, type DroneTab } from "@/lib/dronelab/store";
import { progressKey } from "@/lib/progress/keys";
import { markDone } from "@/lib/progress/progress";
import { useRoom, withRoom } from "@/lib/realtime";
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
  /** The untranslated chip, from the server page. */
  notice?: ReactNode;
};

// The toolbar and tabs draw these; the status strip shows parts, battery and fault, the Tests tab the checks (stats).
const BENCH_CHROME = ["build", "strip", "explode", "plug", "wiring", "stats"];

export function DroneWorkspace({ lang, content, text, messages, notice }: Props) {
  const room = useRoom();
  const t = useMemo(() => droneLabT(lang, messages), [lang, messages]);
  const ct = useMemo(() => contentT(lang, content.id, text), [lang, content.id, text]);
  const [store] = useState(() => createDroneLabStore(content));
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [figure, setFigure] = useState<FigureHandle | null>(null);
  const [flash, setFlash] = useState("");
  const [logOpen, setLogOpen] = useState(false);
  const enterFigure = useRef<HTMLButtonElement>(null);
  const id = content.id;
  const dispatch = store.dispatch;
  // a test the figure refuses (props on, a part missing) says why only in its toast: keep the reason for the row
  const pendingRun = useRef<{ test: string; at: number } | null>(null);
  const [refusal, setRefusal] = useState<{ test: string; text: string } | null>(null);
  const runTest = useCallback(
    (test: string) => {
      pendingRun.current = { test, at: performance.now() };
      setRefusal(null);
      dispatch({ type: "test/run", test });
    },
    [dispatch],
  );

  useEffect(() => (figure ? store.connect((command) => sendTo(figure, command)) : undefined), [figure, store]);
  const moments = useCallback((prev: DroneLabState, next: DroneLabState) => droneMoments(content, prev, next), [content]);
  useLabMoments(store, moments);
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
        case "flash": {
          setFlash(event.text);
          const run = pendingRun.current;
          pendingRun.current = null;
          const test = run && performance.now() - run.at < 1500 ? content.tests.find((x) => x.id === run.test) : undefined;
          if (test && isEngineTest(test) && readBench(store.getState().figure).test !== test.button) setRefusal({ test: test.id, text: event.text });
          break;
        }
        case "focus":
          if (!event.on) enterFigure.current?.focus();
          break;
      }
    },
    [dispatch, figureSound, content.tests, store],
  );

  const bench = readBench(state.figure);
  const initial = useMemo(() => figureInitial(content, state), [content, state]);
  // the toolbar, the Build tab and the Tests tab draw these; the figure keeps its part pickers, which can also fit a
  // part the wrong way round
  const hideChrome = useMemo(() => [...BENCH_CHROME, ...content.tests.map((test) => test.button)], [content.tests]);
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
          onRun={runTest}
          refusal={refusal}
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

  const lastLine = state.log.lines[state.log.lines.length - 1];
  const nextPart = bench.next ? content.parts.find((p) => p.id === bench.next) : undefined;
  const empty = ready && bench.fitted === 0 && state.sheet !== "wiring";
  const figureTitle = t("workspace.figureTitle", { title: ct(content.title) });
  const flyNote = bench.flight?.ready ? t("workspace.flyReady") : t("workspace.flyNotReady");

  const stage = (
    <>
      {/* the readouts are the bench's one status line (the figure's HUD is hidden): where the stage is narrow (a phone,
          or Lab tools open beside it) they wrap to a line of their own rather than being cut */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1">
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
        <span className="flex shrink-0 items-center rounded-lg border border-rule p-0.5">
          <Button
            size="sm"
            variant="ghost"
            aria-pressed={state.exploded}
            onClick={() => dispatch({ type: "exploded", on: !state.exploded })}
            // the wiring sheet covers the craft: exploding it then shows nothing
            disabled={!ready || state.sheet === "wiring"}
            className="min-h-8 whitespace-nowrap px-2 py-0"
          >
            {t("workspace.exploded")}
          </Button>
        </span>
        <div className="flex shrink-0 items-center gap-x-2 max-sm:w-full sm:ms-auto">
          <dl
            aria-label={t("workspace.status.title")}
            className="flex items-center gap-x-4 whitespace-nowrap max-sm:w-full max-sm:justify-between"
            data-testid="bench-status"
          >
            <div className="flex items-baseline gap-2">
              <dt className="field-label">{t("workspace.status.parts")}</dt>
              <dd className="tabular font-ui text-sm font-semibold">{ready ? `${bench.fitted}/${bench.total}` : "…"}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="field-label">{t("workspace.status.plugged")}</dt>
              <dd className="text-sm font-semibold">{bench.plugged ? t("workspace.status.pluggedOn") : t("workspace.status.pluggedOff")}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="field-label">{t("workspace.status.fault")}</dt>
              <dd className={`text-sm font-semibold ${bench.fault ? "text-bad" : ""}`}>
                {bench.fault ? t("workspace.status.faultCap") : t("workspace.status.faultNone")}
              </dd>
            </div>
          </dl>
          <IconButton
            ref={enterFigure}
            icon="target"
            size="sm"
            label={t("workspace.figureFocus")}
            shortcut="F"
            onClick={() => figure?.focus()}
            aria-keyshortcuts="F"
            className="[@media(pointer:coarse)]:hidden"
          />
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <FigureFrame
          ref={setFigure}
          src={`${content.figure.page}?step=0&fresh=1`}
          title={figureTitle}
          initial={initial}
          onEvent={onEvent}
          hideChrome={hideChrome}
          fill
        />
        {empty ? (
          // centred between the figure's part pickers (two rows in German on a phone) and its zoom and See-through rows
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-3 py-20 sm:p-4">
            <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-surface p-3 text-center shadow-md animate-fade-in sm:p-4">
              <p className="text-base sm:text-lg">{t("workspace.empty")}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:mt-3">
                <Button variant="primary" onClick={() => dispatch({ type: "bench/run", run: "build" })} data-testid="empty-build">
                  {t("build.buildForMe")}
                </Button>
                {bench.next && nextPart ? (
                  <Button onClick={() => dispatch({ type: "bench/add", id: bench.next!, orient: 0 })}>
                    {t("build.fit", { short: nextPart.short })}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <p className="sr-only">{t("workspace.figureHint")}</p>
      <div role="status" aria-live="polite" className="sr-only" data-testid="figure-flash">
        {flash || (ready ? "" : t("workspace.status.waiting"))}
      </div>
      <StageDrawer title={t("log.title", { name: fwName })} summary={lastLine ?? t("log.empty")} open={logOpen} onOpenChange={setLogOpen} height={168}>
        <div
          role="log"
          aria-live="polite"
          aria-label={t("log.title", { name: fwName })}
          tabIndex={0}
          className="h-full overflow-y-auto bg-console p-3 font-ui text-xs leading-relaxed text-console-accent"
          data-testid="figure-log"
        >
          {state.log.lines.length === 0 ? (
            <p className="text-console-muted">{t("log.empty")}</p>
          ) : (
            state.log.lines.slice(-40).map((line, i) => <div key={i}>{line}</div>)
          )}
        </div>
      </StageDrawer>
    </>
  );

  const below = (
    <section className="grid gap-x-12 gap-y-8 lg:grid-cols-2" aria-labelledby={`meet-${id}-${lang}`}>
      <div className="prose">
        <h2 id={`meet-${id}-${lang}`}>{t("workspace.meet", { noun: ct(content.noun) })}</h2>
        {ct(content.overview)
          .split(/\n{2,}/)
          .map((para, i) => (
            <p key={i}>{para}</p>
          ))}
      </div>
      <div className="prose">
        <h2>{t("workspace.practice")}</h2>
        <p>{ct(content.practice)}</p>
        <p className="text-muted">{ct(content.hint)}</p>
      </div>
    </section>
  );

  return (
    <WorkspaceFrame
      className="[--stage-h:56svh]"
      bar={
        <WorkspaceBar
          back={{ href: `/${lang}/drones`, label: t("workspace.back") }}
          kicker={`${t("workspace.fig", { n: fig })} · ${t(`classes.${content.class}`)} · ${content.firmware.version}`}
          title={ct(content.title)}
          tone="tomato"
          status={
            <>
              {notice}
              <CraftProgress
                keys={keys}
                label={t("workspace.progress")}
                countTemplate={messages.index.progressValue}
                valueTemplate={messages.workspace.progressLabel}
                size="xs"
              />
            </>
          }
          actions={
            <>
              <ButtonLink
                href={withRoom(`/${lang}/drones/${id}/fly`, room?.id)}
                variant="primary"
                size="sm"
                data-testid="fly-link"
                aria-describedby={`fly-note-${id}`}
                title={flyNote}
                className="shrink-0 whitespace-nowrap"
              >
                {t("workspace.fly")}
              </ButtonLink>
              <span id={`fly-note-${id}`} className="sr-only">
                {flyNote}
              </span>
              <SoundToggle compact />
              <KeyboardHelp t={t} />
              <LabDock lab="drone" itemId={id} store={store} figure={figure} />
            </>
          }
        />
      }
      stage={stage}
      rail={
        <Panel className="h-full">
          <Tabs
            label={t("workspace.sections")}
            tabs={tabs}
            value={state.tab}
            onChange={(tab) => dispatch({ type: "tab", tab: tab as DroneTab })}
            fill
            phoneGrid
            listClassName="ws-sticky-tabs"
          />
        </Panel>
      }
      below={below}
    />
  );
}
