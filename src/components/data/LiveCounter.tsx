"use client";

import { useId, useMemo } from "react";
import { Button, Callout, cx } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { createTranslator } from "@/i18n/translate";
import type { LiveResponse } from "@/lib/telemetry/responses";
import { formatCount } from "./format";
import type { DataMessages } from "./messages";
import { useFeed } from "./useFeed";

const POLL_MS = 15_000;

type LiveCounterProps = {
  messages: DataMessages["live"];
  className?: string;
};

/**
 * "Right now at HackTX: N builders, M LEDs blinked, K drones flown", plus a
 * strip of events per minute, from the activity_1m continuous aggregate.
 * Polls every 15 s while the tab is visible.
 */
export function LiveCounter({ messages, className }: LiveCounterProps) {
  const locale = useLocale();
  const t = useMemo(() => createTranslator(locale, messages, `${locale}/data.live`), [locale, messages]);
  const feed = useFeed<LiveResponse>("/api/live", { pollMs: POLL_MS });
  const headingId = useId();
  const live = feed.data;

  return (
    <section aria-labelledby={headingId} className={cx("flex flex-col gap-3", className)}>
      <header className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="font-head text-lg leading-tight">
          {t("title")}
        </h2>
        {feed.status === "ready" ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 font-ui text-xs font-bold text-muted">
            <span aria-hidden="true" className="size-2.5 rounded-full border-[1.5px] border-line bg-tomato motion-safe:animate-pulse" />
            {t("live")}
          </span>
        ) : null}
      </header>

      {feed.status === "loading" ? (
        <div role="status" className="grid grid-cols-3 gap-2">
          <span className="sr-only">{t("loading")}</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-ink-sm bg-sunken motion-safe:animate-pulse" />
          ))}
        </div>
      ) : null}

      {feed.status === "off" ? (
        <Callout variant="quiet" title={t("offTitle")}>
          <span className="mt-0.5 block">{t("offBody")}</span>
        </Callout>
      ) : null}

      {feed.status === "error" ? (
        <div className="flex flex-col items-start gap-2">
          <Callout tone="warn" title={t("error")} live className="self-stretch" />
          <Button variant="secondary" size="sm" onClick={feed.refresh}>
            {t("retry")}
          </Button>
        </div>
      ) : null}

      {feed.status === "ready" && live ? (
        <>
          <dl className="@container grid grid-cols-3 gap-3">
            <Counter value={formatCount(live.builders, locale)} label={t("builders", { count: live.builders })} />
            <Counter value={formatCount(live.ledsBlinked, locale)} label={t("leds", { count: live.ledsBlinked })} />
            <Counter value={formatCount(live.dronesFlown, locale)} label={t("drones", { count: live.dronesFlown })} />
          </dl>
          {live.events === 0 ? (
            <p className="rounded-ink-sm border-2 border-dashed border-line bg-sunken p-3 text-sm">{t("quiet")}</p>
          ) : (
            <figure className="flex flex-col gap-1">
              <Sparkline values={live.perMinute} label={t("chart")} />
              <figcaption className="text-xs text-muted">{t("window")}</figcaption>
            </figure>
          )}
        </>
      ) : null}
    </section>
  );
}

/** Number first, then its label, so each reads like "23 builders"; the number shrinks in a narrow dock. */
function Counter({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="ink-kicker leading-tight">{label}</dt>
      <dd className="tabular font-ui text-xl font-extrabold leading-tight tracking-tight @xs:text-2xl @md:text-3xl">{value}</dd>
    </div>
  );
}

function Sparkline({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values);
  const width = values.length * 4;
  const height = 32;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-10 w-full overflow-visible"
    >
      {values.map((v, i) => {
        const h = v > 0 ? Math.max(2, (v / max) * (height - 2)) : 0;
        return (
          <rect
            key={i}
            x={i * 4 + 0.5}
            y={height - h}
            width={3}
            height={h}
            className={i === values.length - 1 ? "fill-cobalt" : "fill-mint"}
          />
        );
      })}
      <line x1={0} x2={width} y1={height} y2={height} className="stroke-line" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
