"use client";

import { useEffect, useMemo, useState } from "react";
import { contentT, type ContentT } from "@/components/dronelab/text";
import { FlightRange, type FlightStrings } from "@/components/flight/FlightRange";
import { Callout } from "@/components/ui";
import { DRONE_IDS } from "@/content/ids";
import { loadDrone } from "@/content/index.generated";
import type { DroneContent } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import { fromBuild } from "@/lib/flight/from-calc";
import { craftForBuild, STOCK_MODES } from "@/lib/flight/craft-from-build";
import { flightCourse, flightOf, parOf } from "@/lib/flight/registry";
import type { CourseText } from "@/lib/flight";
import { isOutOfRange } from "@/sim/flight/guards";
import { calcFromBuild } from "@/sim/flight/from-build";
import type { Build } from "@/sim/flight/build";
import type { BuildOutputs } from "@/sim/flight/evaluate";
import { noticesFor } from "@/sim/flight/notices";
import { ChecksList } from "./ChecksList";
import { SafetyNotice, type DroneT } from "./SafetyNotice";

const PAYLOAD_ACTIONS = new Set(["drop", "spray-on", "spray-off"]);

type Source = { content: DroneContent; text: Record<string, unknown> };

type Offer = { id: string; content: DroneContent; courseId: string; ct: ContentT };

async function loadSource(lang: Locale, id: (typeof DRONE_IDS)[number]): Promise<Source | null> {
  const content = await loadDrone(id);
  if (!content) return null;
  for (const tryLang of lang === "en" ? [lang] : [lang, "en"]) {
    try {
      const mod = (await import(`../../../i18n/content/${tryLang}/drones/${id}.json`)) as { default: Record<string, unknown> };
      return { content, text: mod.default };
    } catch {
      continue;
    }
  }
  return null;
}

/** The courses a multirotor build can fly: a payload course needs a craft that drops or sprays. */
export function offersFrom(sources: readonly Source[], lang: Locale): Offer[] {
  return sources.flatMap(({ content, text }) => {
    if (flightOf(content)?.craft.class !== "multirotor") return [];
    const ct = contentT(lang, content.id, text);
    return content.courses
      .filter((c) => !c.goals.some((g) => g.action && PAYLOAD_ACTIONS.has(g.action)))
      .map((c) => ({ id: `${content.id}.${c.id}`, content, courseId: c.id, ct }));
  });
}

function textFor(offer: Offer): CourseText {
  const { content, ct } = offer;
  const course = content.courses.find((c) => c.id === offer.courseId)!;
  const some = (pairs: [string, string][]) => Object.fromEntries(pairs.filter(([, key]) => ct.has(key)).map(([k, key]) => [k, ct(key)]));
  return {
    title: ct(course.title),
    labels: some(course.goals.map((g) => [g.label, g.label])),
    modes: some(STOCK_MODES.map((m) => [m.id, m.title])),
    hints: some(STOCK_MODES.map((m) => [m.id, m.hint])),
  };
}

/** The range, flying the craft the build describes on a course a multirotor can fly. */
export function FlyBuild({ build, out, lang, flight, drone }: { build: Build; out: BuildOutputs; lang: Locale; flight: FlightStrings; drone: DroneT }) {
  const t = useMemo(() => createTranslator(lang, flight, "flight"), [lang, flight]);
  const [sources, setSources] = useState<Source[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.all(DRONE_IDS.map((id) => loadSource(lang, id))).then((all) => {
      if (live) setSources(all.filter((s): s is Source => s !== null));
    });
    return () => {
      live = false;
    };
  }, [lang]);

  const offers = useMemo(() => (sources ? offersFrom(sources, lang) : []), [sources, lang]);
  const offer = offers.find((o) => o.id === picked) ?? offers[0];
  const craft = useMemo(() => craftForBuild(build), [build]);
  const calc = useMemo(() => {
    const raw = calcFromBuild(build);
    return isOutOfRange(raw) ? raw : fromBuild(raw);
  }, [build]);
  const course = useMemo(() => {
    if (!offer) return null;
    const source = offer.content.courses.find((c) => c.id === offer.courseId)!;
    return { flight: { ...flightCourse(offer.content, source, craft), id: offer.id }, par: parOf(source) };
  }, [offer, craft]);

  const context = { hasBattery: !!build.pack, auwG: out.auw_g ?? 0, autonomous: false };
  const notices = noticesFor("fly", context);

  if (isOutOfRange(calc)) {
    return (
      <Callout tone="warn" live>
        {t("fly.blocked", { field: calc.field })}
      </Callout>
    );
  }

  const cannotLift = out.tw !== null && out.tw < 1;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-3">
        {cannotLift ? (
          <Callout tone="warn" live>
            {t("fly.cannotLift")}
          </Callout>
        ) : null}
        {offer && course ? (
          <FlightRange
            key={offer.id}
            craft={craft}
            course={course.flight}
            calc={calc}
            t={flight}
            courseText={textFor(offer)}
            initialMode={course.flight.kind === "gates" ? "race" : "range"}
            model="flight-game@1"
            par={course.par}
          />
        ) : (
          <p className="text-sm text-muted">{t("fly.loading")}</p>
        )}
        {notices.map((n) => (
          <SafetyNotice key={n.id} id={n.id} t={drone} />
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <section aria-labelledby="fly-build-courses" className="flex flex-col gap-2">
          <h2 id="fly-build-courses" className="text-lg font-semibold text-balance">
            {t("fly.courses")}
          </h2>
          <ul className="divide-y divide-rule">
            {offers.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className="min-h-11 w-full text-start font-semibold underline-offset-4 hover:underline aria-pressed:no-underline aria-pressed:text-accent"
                  aria-pressed={o.id === offer?.id}
                  onClick={() => setPicked(o.id)}
                >
                  {o.ct(o.content.courses.find((c) => c.id === o.courseId)!.title)}
                  <span className="ms-2 text-sm font-normal text-muted">{o.ct(o.content.title)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        {cannotLift || out.errors.length > 0 ? <ChecksList checks={out.checks} errors={out.errors} t={drone} /> : null}
      </div>
    </div>
  );
}
