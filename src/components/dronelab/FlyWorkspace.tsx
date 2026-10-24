"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { DroneContent } from "@/content/schema";
import type { DroneId } from "@/content/ids";
import { LabDock } from "@/components/dock/LabDock";
import type { FigureHandle } from "@/components/figure";
import { FlightRange } from "@/components/flight/FlightRange";
import { Chip } from "@/components/ui/Chip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { calc } from "@/lib/drone/calc";
import { designInput } from "@/lib/drone/design";
import { canArm, droneProgressKeys, type ArmRule } from "@/lib/dronelab/bench";
import {
  contentCourseId,
  courseForEvent,
  craftPatch,
  createFlyStore,
  flightCalc,
  flightFaults,
  flyPick,
  flyRules,
  type FlySource,
} from "@/lib/dronelab/fly";
import { readBenchSummary } from "@/lib/dronelab/session";
import { quad5Course, quad5Craft, type Course as FlightCourse, type FlightCraft, type FlightEvent } from "@/lib/flight";
import { useBest } from "@/lib/progress/hooks";
import { progressKey } from "@/lib/progress/keys";
import { markDone, recordBest } from "@/lib/progress/progress";
import { CraftProgress } from "./CraftProgress";
import { KeyboardHelp } from "./KeyboardHelp";
import { contentT, droneLabT, formatNumber, type ContentT, type DroneLabMessages, type DroneLabT } from "./text";

// The flight data each craft flies with (src/lib/flight). Crafts appear here as the flight package adds them.
const RANGE: Partial<Record<DroneId, { craft: FlightCraft; courses: FlightCourse[] }>> = {
  quad5: { craft: quad5Craft, courses: [quad5Course] },
};

type Props = {
  lang: Locale;
  content: DroneContent;
  text: Record<string, unknown>;
  messages: DroneLabMessages;
  flight: Messages["flight"];
};

export function FlyWorkspace({ lang, content, text, messages, flight }: Props) {
  const t = useMemo(() => droneLabT(lang, messages), [lang, messages]);
  const ct = useMemo(() => contentT(lang, content.id, text), [lang, content.id, text]);
  const [store] = useState(() => createFlyStore(content));
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [figure, setFigure] = useState<FigureHandle | null>(null);
  const id = content.id;
  const range = RANGE[id];
  const [courseIndex, setCourseIndex] = useState(0);
  const flightCourse = range?.courses[courseIndex];

  useEffect(() => {
    store.dispatch({ type: "bench/loaded", bench: readBenchSummary(id) });
  }, [id, store]);

  const pick = flyPick(content, state);
  const outputs = useMemo(() => flightCalc(content, pick), [content, pick]);
  const faults = useMemo(() => flightFaults(content, state), [content, state]);
  const craft = useMemo(() => (range ? craftPatch(range.craft, state) : null), [range, state]);
  const rules = flyRules(state);
  const keys = useMemo(() => droneProgressKeys(content), [content]);
  const courseText = useMemo(() => {
    if (!flightCourse) return undefined;
    const cid = contentCourseId(content, flightCourse.id);
    const course = cid ? content.courses.find((c) => c.id === cid) : undefined;
    return course ? { title: ct(course.title) } : undefined;
  }, [content, ct, flightCourse]);

  const onEvent = useCallback(
    (event: FlightEvent) => {
      if (!flightCourse || (event.type !== "lap" && event.type !== "run" && event.type !== "missionDone")) return;
      const cid = courseForEvent(content, flightCourse.id, event.type);
      if (!cid) return;
      const key = progressKey.droneCourse(id, cid);
      if (event.type !== "missionDone") recordBest(key, event.time, "lower");
      markDone(key);
    },
    [content, flightCourse, id],
  );

  const sourceOptions: { value: FlySource; label: string }[] = [
    { value: "factory", label: t("fly.factory") },
    ...(state.bench ? [{ value: "bench" as const, label: t("fly.benchBuild") }] : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <nav aria-label={t("workspace.crumbs")} className="font-ui text-xs font-bold uppercase tracking-wider">
        <Link href={`/${lang}/drones/${id}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          {t("fly.back")}
        </Link>
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="ink-kicker">
            {t("workspace.fig", { n: String(content.fig).padStart(2, "0") })} · {content.firmware.version}
          </p>
          <h1 className="mt-2">{t("fly.title", { title: ct(content.title) })}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CraftProgress
            keys={keys}
            label={t("workspace.progress")}
            countTemplate={messages.index.progressValue}
            valueTemplate={messages.workspace.progressLabel}
          />
          <KeyboardHelp t={t} flight />
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-label={t("fly.title", { title: ct(content.title) })} className="min-w-0">
          {craft && flightCourse ? (
            <FlightRange
              key={`${state.source}-${flightCourse.id}`}
              craft={craft}
              course={flightCourse}
              calc={outputs}
              faults={faults}
              t={flight}
              courseText={courseText}
              onEvent={onEvent}
              onFigure={setFigure}
            />
          ) : (
            <p className="rounded-ink border-2 border-dashed border-line bg-sunken p-6">{t("fly.missing")}</p>
          )}
        </section>

        <aside className="space-y-6">
          <section aria-labelledby={`fly-source-${id}`} className="space-y-3">
            <h2 id={`fly-source-${id}`} className="text-lg">
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
            {state.source === "factory" ? <p className="text-sm">{t("fly.factoryNote")}</p> : null}
            <DesignSummary content={content} pick={pick} lang={lang} t={t} />
          </section>

          <ArmingRules rules={rules} t={t} />

          {content.courses.length > 0 ? (
            <section aria-labelledby={`fly-courses-${id}`} className="space-y-2">
              <h2 id={`fly-courses-${id}`} className="text-lg">
                {t("fly.courses")}
              </h2>
              <ul className="space-y-2">
                {content.courses.map((course) => (
                  <CourseRow
                    key={course.id}
                    content={content}
                    courseId={course.id}
                    lang={lang}
                    t={t}
                    ct={ct}
                    active={flightCourse ? onRange(content, flightCourse.id, course.id) : false}
                    onFly={
                      range
                        ? () => {
                            const i = range.courses.findIndex((fc) => onRange(content, fc.id, course.id));
                            if (i >= 0) setCourseIndex(i);
                          }
                        : undefined
                    }
                  />
                ))}
              </ul>
            </section>
          ) : null}
          <LabDock lab="drone" itemId={id} store={store} figure={figure} />
        </aside>
      </div>
    </div>
  );
}

/** Whether a content course is flown on this flight course (by its id, or as the range's gates/checkpoints/mission). */
function onRange(content: DroneContent, flightCourseId: string, courseId: string): boolean {
  if (contentCourseId(content, flightCourseId) === courseId) return true;
  return (["lap", "run", "missionDone"] as const).some((e) => courseForEvent(content, flightCourseId, e) === courseId);
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
      <p className="font-ui text-xs">
        {content.design.batts[pick.batt].label} · {content.design.motors[pick.motor].label} ·{" "}
        {content.design.props[pick.prop].label}
      </p>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="ink-kicker text-[0.65rem]">{t("design.tiles.auw")}</dt>
          <dd className="font-ui font-bold">{t("design.units.g", { value: n(r.auw, 0) })}</dd>
        </div>
        <div>
          <dt className="ink-kicker text-[0.65rem]">{t("design.tiles.tw")}</dt>
          <dd className="font-ui font-bold">{t("design.units.tw", { value: n(r.tw, 1) })}</dd>
        </div>
        <div>
          <dt className="ink-kicker text-[0.65rem]">{t("design.tiles.hoverThr")}</dt>
          <dd className="font-ui font-bold">{t("design.units.pct", { value: n(r.hoverThr * 100, 0) })}</dd>
        </div>
        <div>
          <dt className="ink-kicker text-[0.65rem]">{t("design.tiles.flyMin")}</dt>
          <dd className="font-ui font-bold">{t("design.units.min", { value: n(r.flyMin, 1) })}</dd>
        </div>
      </dl>
    </>
  );
}

function ArmingRules({ rules, t }: { rules: ArmRule[]; t: DroneLabT }) {
  const ok = canArm(rules);
  return (
    <section aria-labelledby="fly-arming" className="space-y-2">
      <h2 id="fly-arming" className="text-lg">
        {t("fly.preflight")}
      </h2>
      <p className="text-sm text-muted">{t("fly.preflightLede")}</p>
      <ul className="space-y-1.5" data-testid="arming-rules" data-can-arm={ok}>
        {rules.map((rule, i) => (
          <li key={`${rule.id}-${i}`} className="flex items-start gap-2 text-sm" data-rule={rule.id} data-ok={rule.ok}>
            <Chip tone={rule.ok ? "mint" : rule.level === "block" ? "tomato" : "mustard"}>
              {rule.ok ? t("fly.ok") : rule.level === "block" ? t("fly.blocked") : t("fly.warning")}
            </Chip>
            <span>{rule.id === "mistakes" ? t("fly.rules.mistakes", { code: rule.code ?? "" }) : t(`fly.rules.${rule.id}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CourseRow({
  content,
  courseId,
  lang,
  t,
  ct,
  active,
  onFly,
}: {
  content: DroneContent;
  courseId: string;
  lang: Locale;
  t: DroneLabT;
  ct: ContentT;
  active: boolean;
  onFly?: () => void;
}) {
  const course = content.courses.find((c) => c.id === courseId)!;
  const best = useBest(progressKey.droneCourse(content.id, course.id));
  return (
    <li className={`rounded-ink border-2 bg-surface p-3 ${active ? "border-ink" : "border-line"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="min-h-11 text-start font-bold underline-offset-4 hover:underline"
          onClick={onFly}
          aria-pressed={active}
          disabled={!onFly}
        >
          {ct(course.title)}
        </button>
        <span className="font-ui text-xs font-bold">
          {best !== undefined ? t("fly.best", { s: formatNumber(lang, best, 2) }) : t("fly.noBest")}
          {course.parS ? ` · ${t("fly.par", { s: formatNumber(lang, course.parS, 0) })}` : ""}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">{ct(course.brief)}</p>
    </li>
  );
}
