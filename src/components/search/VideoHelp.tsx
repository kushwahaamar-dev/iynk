"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import type { LabDockProps } from "@/components/dock/types";
import { Button, Callout, Icon } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { fetchVideos, type FailCode } from "@/lib/search/client";
import { useSearchT } from "@/lib/search/messages";
import { videoQuery } from "@/lib/search/topics";
import type { Video } from "@/lib/search/types";
import { PanelHead, PanelSkeleton, StatusError, external, useSearchAvailability } from "./shared";

type Outcome = { ok: true; videos: Video[] } | { ok: false; code: FailCode };

/** YouTube tutorials for the item on the bench, with a box to ask for something else. */
export function VideoHelp({ lab, itemId }: LabDockProps) {
  const locale = useLocale();
  const t = useSearchT(locale);
  const availability = useSearchAvailability();
  const fieldId = useId();
  const suggested = videoQuery(lab, itemId) ?? "";
  const [draft, setDraft] = useState(suggested);
  const [query, setQuery] = useState(suggested);
  const [result, setResult] = useState<{ key: string; outcome: Outcome } | null>(null);
  const q = query.trim();
  const key = `${locale}|${q}`;
  const active = availability === "ready" && q.length >= 2;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    fetchVideos({ q, hl: locale }, controller.signal)
      .then((r) => setResult({ key, outcome: r.ok ? { ok: true, videos: r.data.videos } : r }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [active, key, q, locale]);

  const outcome = result?.key === key ? result.outcome : null;
  const loading = active && !outcome;

  if (!t) return <PanelSkeleton />;

  function submit(event: FormEvent) {
    event.preventDefault();
    setQuery(draft);
  }

  return (
    <section className="space-y-3" aria-labelledby={`${fieldId}-title`}>
      <PanelHead id={`${fieldId}-title`} title={t("videos.title")} lede={t("videos.lede")} />
      {availability === "loading" ? <PanelSkeleton /> : null}
      {availability === "error" ? <StatusError t={t} /> : null}
      {availability === "ready" ? (
        <>
          <form onSubmit={submit} className="flex gap-2" role="search">
            <label htmlFor={fieldId} className="sr-only">
              {t("videos.query")}
            </label>
            <input
              id={fieldId}
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={160}
              className="ink-field min-w-0 flex-1"
            />
            <Button type="submit" size="sm" disabled={draft.trim().length < 2}>
              {t("videos.search")}
            </Button>
          </form>
          <div aria-live="polite" aria-busy={loading}>
            {loading ? <p className="text-sm text-muted">{t("videos.loading")}</p> : null}
            {outcome && !outcome.ok ? (
              <Callout tone="warn">{outcome.code === "rate_limited" ? t("real.rateLimited") : t("videos.failed")}</Callout>
            ) : null}
            {outcome?.ok && outcome.videos.length === 0 ? <p className="text-sm text-muted">{t("videos.empty")}</p> : null}
            {outcome?.ok && outcome.videos.length > 0 ? (
              <ul className="grid gap-2">
                {outcome.videos.map((video) => (
                  <li key={video.url}>
                    <a
                      href={video.url}
                      {...external}
                      aria-label={t("videos.watch", { title: video.title, channel: video.channel })}
                      className="-mx-2 flex gap-3 rounded-ink-sm p-2 no-underline hover:bg-sunken"
                    >
                      <span className="relative shrink-0">
                        {/* Remote thumbnails from YouTube's CDN; next/image would need its domains configured. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={video.thumbnail} alt="" width={120} height={68} loading="lazy" className="h-[68px] w-[120px] rounded-ink border-2 border-line object-cover" />
                        <Icon name="play" size={20} aria-hidden="true" className="absolute inset-0 m-auto rounded-full bg-ink p-0.5 text-paper" />
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-sm font-semibold">{video.title}</span>
                        <span className="block truncate font-ui text-xs text-muted">{video.channel}</span>
                        {video.duration ? (
                          <span className="tabular font-ui text-xs text-muted">{t("videos.duration", { duration: video.duration })}</span>
                        ) : null}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
