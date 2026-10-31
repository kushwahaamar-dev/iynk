"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Button, ButtonLink, Chip } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import { challengeDay, challengeLink, dailyChallenge, type ChallengeCraft, type DailyChallenge } from "@/lib/flight/challenge";
import type { FlightStrings } from "./FlightRange";

/** One craft in the challenge pool, with its words in the page's language (the server page builds it). */
export type ChallengeEntry = ChallengeCraft & { title: string; courseTitles: Record<string, string>; battLabels: Record<string, string> };

/** What a challenge link carried: the day, and the time to beat. */
export type ChallengeLinkQuery = { date: string; beat: number | null; by: string | null };

type Props = {
  lang: Locale;
  craftId: string;
  pool: ChallengeEntry[];
  /** The challenge this page flies now, if any. */
  active: DailyChallenge | null;
  /** The link this page was opened with. */
  link: ChallengeLinkQuery | null;
  /** This browser's best on the active challenge, in seconds. */
  best: number | null;
  onFly: (c: DailyChallenge) => void;
  onStop: () => void;
  t: FlightStrings;
};

const noSubscribe = () => () => {};

/** Labels for a challenge: the craft, course and pack in the page's language. */
function challengeWords(pool: ChallengeEntry[], c: DailyChallenge) {
  const entry = pool.find((p) => p.id === c.craft);
  return { craft: entry?.title ?? c.craft, course: entry?.courseTitles[c.course] ?? c.course, pack: entry?.battLabels[c.batt] ?? c.batt };
}

/** The day's challenge: what it is, a button to fly it (or a link to the craft it is on), and a link to share. */
export function DailyChallengeCard({ lang, craftId, pool, active, link, best, onFly, onStop, t: dict }: Props) {
  const locale = useLocale();
  const t = useMemo(() => createTranslator(locale, dict, "flight"), [locale, dict]);
  // the day comes from the reader's clock, so the server renders nothing here
  const today = useSyncExternalStore(noSubscribe, challengeDay, () => null);
  const date = active?.date ?? link?.date ?? today;
  const c = useMemo(() => (date ? dailyChallenge(date, pool) : null), [date, pool]);
  const [shared, setShared] = useState<"copied" | "failed" | null>(null);
  if (!c) return null;

  const words = challengeWords(pool, c);
  const here = c.craft === craftId;
  const beat = best !== null ? { time: best } : undefined;
  const href = challengeLink(lang, c, beat);
  const share = async () => {
    const url = new URL(href, window.location.origin).toString();
    const text = best !== null ? t("challenge.shareBeat", { ...words, time: best.toFixed(2) }) : t("challenge.shareText", words);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: dict.challenge.title, text, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared("copied");
    } catch {
      setShared("failed");
    }
  };

  const data = { "data-testid": "daily-challenge", "data-craft": c.craft, "data-course": c.course, "data-date": c.date, "data-active": !!active };

  // the day's challenge is on another craft: one line that goes there, not a card that sends you away
  if (!active && !here) {
    return (
      <section aria-labelledby="daily-challenge-title" className="space-y-2" {...data}>
        <h2 id="daily-challenge-title" className="kicker">
          {dict.challenge.title}
        </h2>
        <p className="text-sm">{t("challenge.what", words)}</p>
        <ButtonLink href={challengeLink(lang, c)} variant="secondary" size="sm" data-testid="challenge-go">
          {t("challenge.flyThere", { craft: words.craft })}
        </ButtonLink>
      </section>
    );
  }

  return (
    <section aria-labelledby="daily-challenge-title" className="space-y-2" {...data}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="daily-challenge-title" className="text-lg font-semibold">
          {dict.challenge.title}
        </h2>
        <Chip tone={c.wind ? "cobalt" : "mint"}>{c.wind ? dict.challenge.windOn : dict.challenge.windOff}</Chip>
      </header>
      <p className="text-xs text-muted">{t("challenge.day", { date: c.date })}</p>
      <p className="font-semibold">{t("challenge.what", words)}</p>
      {link?.beat && link.date === c.date ? (
        <p className="text-sm" data-testid="challenge-beat">
          {link.by ? t("challenge.beat", { by: link.by, time: link.beat.toFixed(2) }) : t("challenge.beatAnon", { time: link.beat.toFixed(2) })}
        </p>
      ) : null}
      {active ? (
        <>
          <p className="text-sm">{dict.challenge.flying}</p>
          <p className="tabular text-sm font-semibold" data-testid="challenge-best">
            {best !== null ? t("challenge.best", { time: best.toFixed(2) }) : dict.challenge.none}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={share} data-testid="challenge-share">
              {dict.challenge.share}
            </Button>
            <Button size="sm" onClick={onStop}>
              {dict.challenge.stop}
            </Button>
          </div>
          <p className="text-sm" role="status">
            {shared === "copied" ? dict.challenge.copied : shared === "failed" ? dict.challenge.copyFailed : null}
          </p>
          <a href={href} className="text-sm underline [overflow-wrap:anywhere]" data-testid="challenge-link">
            {dict.challenge.link}
          </a>
        </>
      ) : (
        <Button variant="primary" size="sm" onClick={() => onFly(c)} data-testid="challenge-fly">
          {dict.challenge.fly}
        </Button>
      )}
    </section>
  );
}
