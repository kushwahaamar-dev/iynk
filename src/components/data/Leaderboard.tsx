"use client";

import { useEffect, useId, useMemo, useSyncExternalStore } from "react";
import { Button, Callout, Chip, cx } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { createTranslator, type Translate } from "@/i18n/translate";
import { onFlushed, telemetrySession } from "@/lib/telemetry";
import type { LeaderboardResponse, LeaderboardRow } from "@/lib/telemetry/responses";
import { formatLap } from "./format";
import type { DataMessages } from "./messages";
import { useFeed } from "./useFeed";

type LeaderboardProps = {
  /** Course id, as the flight range names it ("quad5-bando"). */
  course: string;
  /** The course's title in the page language, for the caption. */
  courseLabel: string;
  messages: DataMessages["leaderboard"];
  /** Rows shown above the pilot's own (1-50). */
  limit?: number;
  className?: string;
};

const noSubscribe = () => () => {};

/**
 * Best lap per pilot on one course, ranked, with the pilot's own place even
 * when it is below the shown rows. It refreshes after this browser's own laps
 * reach the server, when the tab comes back, and on demand.
 */
export function Leaderboard({ course, courseLabel, messages, limit = 10, className }: LeaderboardProps) {
  const locale = useLocale();
  const t = useMemo(() => createTranslator(locale, messages, `${locale}/data.leaderboard`), [locale, messages]);
  const session = useSyncExternalStore(noSubscribe, telemetrySession, () => "");
  const params = new URLSearchParams({ course, limit: String(limit) });
  if (session) params.set("session", session);
  const feed = useFeed<LeaderboardResponse>(`/api/leaderboard?${params}`);
  const { refresh } = feed;
  const headingId = useId();

  useEffect(
    () =>
      onFlushed((kinds) => {
        if (kinds.has("flight.lap")) refresh();
      }),
    [refresh],
  );

  const board = feed.data;
  const ownBelow = board?.you && !board.rows.some((r) => r.you) ? board.you : null;

  return (
    <section aria-labelledby={headingId} className={cx("flex flex-col gap-3", className)}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id={headingId} className="font-head text-lg leading-tight">
            {t("title")}
          </h2>
          <p className="text-sm text-muted">{t("caption", { course: courseLabel })}</p>
        </div>
        {feed.status === "ready" || feed.status === "error" ? (
          <Button variant="ghost" size="sm" onClick={refresh}>
            {feed.status === "error" ? t("retry") : t("refresh")}
          </Button>
        ) : null}
      </header>

      {feed.status === "loading" ? (
        <div role="status" className="flex flex-col gap-2">
          <span className="sr-only">{t("loading")}</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 rounded-ink-sm bg-sunken motion-safe:animate-pulse" />
          ))}
        </div>
      ) : null}

      {feed.status === "off" ? (
        <Callout variant="quiet" title={t("offTitle")}>
          <span className="mt-0.5 block">{t("offBody")}</span>
        </Callout>
      ) : null}

      {feed.status === "error" ? (
        <Callout tone="warn" title={t("error")} live />
      ) : null}

      {feed.status === "ready" && board && board.rows.length === 0 ? (
        <p role="status" className="text-sm text-muted">
          {t("empty")}
        </p>
      ) : null}

      {feed.status === "ready" && board && board.rows.length > 0 ? (
        <>
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{t("caption", { course: courseLabel })}</caption>
            <thead>
              <tr className="ink-kicker text-start">
                <th scope="col" className="w-10 pb-1 text-start font-bold">
                  {t("rank")}
                </th>
                <th scope="col" className="pb-1 text-start font-bold">
                  {t("pilot")}
                </th>
                <th scope="col" className="pb-1 text-end font-bold">
                  {t("best")}
                </th>
                <th scope="col" className="w-12 pb-1 text-end font-bold">
                  {t("laps")}
                </th>
              </tr>
            </thead>
            <tbody>
              {board.rows.map((row) => (
                <BoardRow key={`${row.rank}-${row.timeMs}-${row.name ?? ""}-${row.you}`} row={row} t={t} locale={locale} />
              ))}
              {ownBelow ? (
                <>
                  <tr aria-hidden="true">
                    <td colSpan={4} className="py-1 text-center text-muted">
                      ⋯
                    </td>
                  </tr>
                  <BoardRow row={ownBelow} t={t} locale={locale} />
                </>
              ) : null}
            </tbody>
          </table>
          <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>{t("pilots", { count: board.pilots })}</span>
            <span>{board.you ? t("yourRank", { rank: board.you.rank }) : t("notOnBoard")}</span>
          </p>
        </>
      ) : null}
    </section>
  );
}

function BoardRow({ row, t, locale }: { row: LeaderboardRow; t: Translate<DataMessages["leaderboard"]>; locale: Locale }) {
  return (
    <tr aria-current={row.you ? "true" : undefined} className={cx("border-t-[1.5px] border-rule", row.you && "bg-mustard/35")}>
      <td className="py-2 pe-2 font-ui font-extrabold tabular">{row.rank}</td>
      <td className="max-w-0 py-2 pe-2">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className={cx("[overflow-wrap:anywhere]", !row.name && "italic text-muted")}>{row.name ?? t("anonymous")}</span>
          {row.you ? (
            <Chip tone="ink" className="shrink-0">
              {t("you")}
            </Chip>
          ) : null}
        </span>
      </td>
      <td className="py-2 text-end font-ui font-bold tabular">{formatLap(row.timeMs, locale)}</td>
      <td className="py-2 text-end tabular text-muted">{row.laps}</td>
    </tr>
  );
}
