"use client";

import { useCallback, useEffect, useMemo, useReducer, useState, useSyncExternalStore, type ReactNode } from "react";
import type { DroneContent } from "@/content/schema";
import { LabDock } from "@/components/dock/LabDock";
import type { FigureHandle } from "@/components/figure";
import { BreakIt } from "@/components/flight/BreakIt";
import { DailyChallengeCard, type ChallengeEntry } from "@/components/flight/DailyChallenge";
import { FlightRange } from "@/components/flight/FlightRange";
import { useRoomGhosts } from "@/components/flight/room-ghosts";
import { SoundToggle } from "@/components/settings";
import { WorkspaceBar, WorkspaceFrame } from "@/components/shell/workspace";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatStrip } from "@/components/ui/Stat";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { calc } from "@/lib/drone/calc";
import { designInput } from "@/lib/drone/design";
import { canArm, droneProgressKeys, type ArmRule } from "@/lib/dronelab/bench";
import { anyBreak, craftPatch, createFlyStore, flightCalc, flightFaults, flyPick, flyRules, type FlySource } from "@/lib/dronelab/fly";
import { readBenchSummary } from "@/lib/dronelab/session";
import { finishOf, flightOf, medalFor, parOf, sfxFor, startMode, type BreakId, type CourseText, type FlightEvent } from "@/lib/flight";
import { dailyChallenge, loadChallengeBest, readChallengeQuery, saveChallengeBest } from "@/lib/flight/challenge";
import { useBest } from "@/lib/progress/hooks";
import { progressKey } from "@/lib/progress/keys";
import { markDone, recordBest } from "@/lib/progress/progress";
import { useRoom, withRoom } from "@/lib/realtime";
import { playSound } from "@/lib/sound";
import { CraftProgress } from "./CraftProgress";
import { KeyboardHelp } from "./KeyboardHelp";
import { contentT, droneLabT, formatNumber, type ContentT, type DroneLabMessages, type DroneLabT } from "./text";

type Props = {
  lang: Locale;
  content: DroneContent;
  text: Record<string, unknown>;
  messages: DroneLabMessages;
  flight: Messages["flight"];
  /** Every craft that flies, for the daily challenge. */
  pool: ChallengeEntry[];
  /** The untranslated chip, from the server page. */
  notice?: ReactNode;
};

const noSubscribe = () => () => {};
const readSearch = () => window.location.search;
const noSearch = () => "";

export function FlyWorkspace({ lang, content, text, messages, flight, pool, notice }: Props) {
  const room = useRoom();
  const t = useMemo(() => droneLabT(lang, messages), [lang, messages]);
  const ct = useMemo(() => contentT(lang, content.id, text), [lang, content.id, text]);
  const [store] = useState(() => createFlyStore(content));
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [figure, setFigure] = useState<FigureHandle | null>(null);
  const id = content.id;
  // every craft flies from its content module (src/lib/flight/registry.ts); the courses keep their content ids
  const range = useMemo(() => flightOf(content), [content]);
  const flightCourse = range?.courses.find((c) => c.id === state.course);
  const course = content.courses.find((c) => c.id === state.course);
  const par = course ? parOf(course) : null;

  useEffect(() => {
    store.dispatch({ type: "bench/loaded", bench: readBenchSummary(id) });
  }, [id, store]);

  // a challenge link opens that day's challenge on its course (the link names the craft: this page)
  const search = useSyncExternalStore(noSubscribe, readSearch, noSearch);
  const link = useMemo(() => readChallengeQuery(search), [search]);
  useEffect(() => {
    const c = link ? dailyChallenge(link.date, pool) : null;
    if (c) store.dispatch({ type: "challenge", challenge: c });
  }, [link, pool, store]);

  const { source, bench, challenge, breaks } = state;
  const pick = useMemo(() => flyPick(content, { source, bench, challenge }), [content, source, bench, challenge]);
  const outputs = useMemo(() => flightCalc(content, pick, breaks.overKv), [content, pick, breaks.overKv]);
  const faults = useMemo(() => flightFaults(content, { source, bench, breaks }), [content, source, bench, breaks]);
  const craft = useMemo(() => (range ? craftPatch(range.craft, { source, bench }) : null), [range, source, bench]);
  const broken = anyBreak(state);
  const [, bestSaved] = useReducer((n: number) => n + 1, 0);
  // read on every render; bestSaved re-renders after a new best is saved
  const challengeBest = useSyncExternalStore(noSubscribe, () => (challenge ? loadChallengeBest(challenge.date) : null), () => null);
  const ghosts = useRoomGhosts(flightCourse?.id ?? "");
  const rules = flyRules(content, state);
  const keys = useMemo(() => droneProgressKeys(content), [content]);
  // the course's own words and the craft's own mode names, in the page's language (a missing key falls back)
  const courseText = useMemo((): CourseText | undefined => {
    if (!course) return undefined;
    const some = (pairs: [string, string][]) => Object.fromEntries(pairs.filter(([, key]) => ct.has(key)).map(([k, key]) => [k, ct(key)]));
    return {
      title: ct(course.title),
      labels: some(course.goals.map((g) => [g.label, g.label])),
      modes: some(content.flight.modes.map((m) => [m.id, m.title])),
      hints: some(content.flight.modes.map((m) => [m.id, m.hint])),
    };
  }, [content, ct, course]);

  // every event has its sound (silent until sound is on); a finished lap, run or mission counts for the course
  // flown, the autopilot demo's never does
  const onEvent = useCallback(
    (event: FlightEvent) => {
      for (const name of sfxFor(event) ?? []) playSound(name);
      if (!flightCourse) return;
      const done = finishOf(event);
      if (!done || done.demo) return;
      const key = progressKey.droneCourse(id, flightCourse.id);
      recordBest(key, done.time, "lower");
      markDone(key);
      if (broken) return;
      if (challenge && challenge.course === flightCourse.id && saveChallengeBest(challenge.date, done.time)) bestSaved();
    },
    [flightCourse, id, broken, challenge],
  );
  const onFix = useCallback((fault: BreakId) => store.dispatch({ type: "break", id: fault, on: false }), [store]);
  const isOn = (b: BreakId) => (b === "overKv" ? !!outputs.overKv : !!faults?.[b]);

  const sourceOptions: { value: FlySource; label: string }[] = [
    { value: "factory", label: t("fly.factory") },
    ...(state.bench ? [{ value: "bench" as const, label: t("fly.benchBuild") }] : []),
  ];

  const title = t("fly.title", { title: ct(content.title) });
  const rail = (
    <Panel className="h-full" bodyClassName="overflow-y-auto divide-y divide-rule px-4 [&>*]:py-4">
      {content.courses.length > 0 ? (
        <section aria-labelledby={`fly-courses-${id}`}>
          <h2 id={`fly-courses-${id}`} className="font-head text-lg">
            {t("fly.courses")}
          </h2>
          <ul className="mt-2 divide-y divide-rule">
            {content.courses.map((c) => (
              <CourseRow
                key={c.id}
                content={content}
                courseId={c.id}
                lang={lang}
                t={t}
                ct={ct}
                medals={flight.medals}
                active={c.id === state.course}
                onFly={range ? () => store.dispatch({ type: "course", id: c.id }) : undefined}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {range ? (
        <BreakIt
          craftClass={range.craft.class}
          isOn={isOn}
          changed={Object.keys(breaks).length > 0}
          broken={broken}
          onToggle={(b, on) => store.dispatch({ type: "break", id: b, on })}
          onReset={() => store.dispatch({ type: "break/reset" })}
          t={flight}
        />
      ) : null}
      <section aria-labelledby={`fly-source-${id}`} className="space-y-3">
        <h2 id={`fly-source-${id}`} className="font-head text-lg">
          {t("fly.designTitle")}
        </h2>
        {sourceOptions.length > 1 ? (
          <SegmentedControl
            label={t("fly.designTitle")}
            value={state.source}
            options={sourceOptions}
            onChange={(source) => store.dispatch({ type: "source", source })}
            size="sm"
          />
        ) : (
          <p className="text-sm text-muted">{t("fly.designFactory")}</p>
        )}
        {state.source === "factory" && sourceOptions.length > 1 ? <p className="text-sm text-muted">{t("fly.factoryNote")}</p> : null}
        <DesignSummary content={content} pick={pick} lang={lang} t={t} />
        <ArmingRules rules={rules} t={t} />
      </section>
      <DailyChallengeCard
        lang={lang}
        craftId={id}
        pool={pool}
        active={challenge}
        link={link}
        best={challengeBest}
        onFly={(c) => store.dispatch({ type: "challenge", challenge: c })}
        onStop={() => store.dispatch({ type: "challenge", challenge: null })}
        t={flight}
      />
    </Panel>
  );

  return (
    <WorkspaceFrame
      phoneStage="full"
      // on a phone the bar takes two rows: the range fills what is left of the first screen
      className="max-lg:[&>.ws>.ws-stage]:h-[calc(100svh-var(--header-h)-7rem)]"
      bar={
        <WorkspaceBar
          back={{ href: withRoom(`/${lang}/drones/${id}`, room?.id), label: t("fly.back") }}
          kicker={`${t("workspace.fig", { n: String(content.fig).padStart(2, "0") })} · ${content.firmware.version}`}
          title={title}
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
              <SoundToggle compact />
              <KeyboardHelp t={t} flight />
              <LabDock lab="drone" itemId={id} store={store} figure={figure} />
            </>
          }
        />
      }
      stage={
        craft && flightCourse ? (
          <FlightRange
            key={`${state.source}-${flightCourse.id}-${challenge?.date ?? "free"}`}
            craft={craft}
            course={flightCourse}
            calc={outputs}
            faults={faults}
            wind={challenge?.wind}
            t={flight}
            courseText={courseText}
            initialMode={startMode(content, flightCourse.id)}
            par={par}
            onEvent={onEvent}
            onFigure={setFigure}
            onFix={onFix}
            peers={ghosts.peers}
            onPose={ghosts.onPose}
            className="h-full"
          />
        ) : (
          <p className="grid h-full place-items-center rounded-xl border-2 border-dashed border-line bg-sunken p-6">{t("fly.missing")}</p>
        )
      }
      rail={rail}
    />
  );
}

function DesignSummary({
  content,
  pick,
  lang,
  t,
}: {
  content: DroneContent;
  pick: { batt: string; motor: string; prop: string };
  lang: Locale;
  t: DroneLabT;
}) {
  const r = calc(designInput(content.design, pick));
  const n = (v: number, d: number) => formatNumber(lang, v, d);
  return (
    <>
      <p className="text-sm text-muted">
        {content.design.batts[pick.batt].label} · {content.design.motors[pick.motor].label} · {content.design.props[pick.prop].label}
      </p>
      <StatStrip
        className="gap-x-4"
        stats={[
          { id: "auw", label: t("design.tiles.auw"), value: t("design.units.g", { value: n(r.auw, 0) }) },
          { id: "tw", label: t("design.tiles.tw"), value: t("design.units.tw", { value: n(r.tw, 1) }) },
          { id: "hover", label: t("design.tiles.hoverThr"), value: t("design.units.pct", { value: n(r.hoverThr * 100, 0) }) },
          { id: "fly", label: t("design.tiles.flyMin"), value: t("design.units.min", { value: n(r.flyMin, 1) }) },
        ]}
      />
    </>
  );
}

function ArmingRules({ rules, t }: { rules: ArmRule[]; t: DroneLabT }) {
  const ok = canArm(rules);
  const clean = rules.every((r) => r.ok);
  const passed = rules.filter((r) => r.ok).length;
  // all clear, the list folds to one line; anything wrong or broken on purpose keeps it open
  const [open, setOpen] = useState(false);
  const shown = open || !clean;
  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={shown}
        aria-controls="fly-arming-list"
        onClick={() => setOpen((v) => !v)}
        disabled={!clean}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg text-start hover:bg-sunken disabled:cursor-default disabled:hover:bg-transparent"
      >
        <span id="fly-arming" className="font-body text-sm font-semibold">
          {t("fly.preflight")}
        </span>
        <Chip tone={!ok ? "tomato" : clean ? "mint" : "mustard"}>{ok ? `${passed}/${rules.length} ${t("fly.ok")}` : t("fly.blocked")}</Chip>
        {clean ? (
          <Icon name="chevron-down" size={18} className={`ms-auto transition-transform ${shown ? "rotate-180" : ""}`} />
        ) : null}
      </button>
      <div id="fly-arming-list" hidden={!shown} className="space-y-2">
        <p className="text-sm text-muted">{t("fly.preflightLede")}</p>
        <ul className="space-y-2" aria-labelledby="fly-arming" data-testid="arming-rules" data-can-arm={ok}>
          {rules.map((rule, i) => (
            <li key={`${rule.id}-${i}`} className="flex items-start gap-2 text-sm" data-rule={rule.id} data-ok={rule.ok}>
              <Chip tone={rule.ok ? "mint" : rule.level === "block" || rule.broken ? "tomato" : "mustard"} className="shrink-0">
                {rule.ok ? t("fly.ok") : rule.broken ? t("fly.broken") : rule.level === "block" ? t("fly.blocked") : t("fly.warning")}
              </Chip>
              <span>
                {rule.id === "mistakes"
                  ? t("fly.rules.mistakes", { code: rule.code ?? "" })
                  : rule.id === "capFault"
                    ? t("fly.rules.capFault", { part: rule.part ?? "XT60" })
                    : t(`fly.rules.${rule.id}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CourseRow({
  content,
  courseId,
  lang,
  t,
  ct,
  medals,
  active,
  onFly,
}: {
  content: DroneContent;
  courseId: string;
  lang: Locale;
  t: DroneLabT;
  ct: ContentT;
  medals: Messages["flight"]["medals"];
  active: boolean;
  onFly?: () => void;
}) {
  const course = content.courses.find((c) => c.id === courseId)!;
  const best = useBest(progressKey.droneCourse(content.id, course.id));
  const par = parOf(course);
  const medal = best !== undefined ? medalFor(best, par) : null;
  const s = (v: number) => formatNumber(lang, v, v % 1 ? 1 : 0);
  return (
    <li className={`relative -mx-2 rounded-lg px-2 py-2 ${active ? "bg-sunken" : ""}`}>
      {active ? <span aria-hidden="true" className="absolute inset-y-2 start-0 w-1 rounded-full bg-ink" /> : null}
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <button
          type="button"
          className="min-h-11 min-w-0 text-start font-body font-semibold underline-offset-4 hover:underline aria-pressed:no-underline"
          onClick={onFly}
          aria-pressed={active}
          disabled={!onFly}
        >
          {ct(course.title)}
        </button>
        <span className="tabular font-ui text-xs font-semibold" data-testid={`best-${course.id}`}>
          {best === undefined
            ? t("fly.noBest")
            : medal
              ? t("fly.bestMedal", { s: formatNumber(lang, best, 2), medal: medals[medal] })
              : t("fly.best", { s: formatNumber(lang, best, 2) })}
        </span>
      </div>
      <p className="text-sm text-muted">{ct(course.brief)}</p>
      {par ? <p className="tabular mt-1 text-xs text-muted">{t("fly.medalTimes", { gold: s(par.gold), silver: s(par.silver), bronze: s(par.bronze) })}</p> : null}
    </li>
  );
}
