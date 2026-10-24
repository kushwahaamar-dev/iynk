"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { LabKind } from "@/components/dock/types";
import { Button, Callout, Chip } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import { AiError, drawCover, writeStory, type AiErrorCode } from "@/lib/ai/client";
import type { AiT } from "@/lib/ai/messages";
import type { StoryResponse } from "@/lib/ai/protocol";
import type { SessionLog } from "@/lib/ai/session-log";
import { loadImage, plainStory, storyPng } from "@/lib/ai/story-png";
import { useRoom } from "@/lib/realtime";
import { PartnerIcon } from "./icons";
import { Markdown } from "./Markdown";

type Story = StoryResponse & { cover: string | null; coverFailed: boolean; helpers: Array<{ helper: string; learner: string }> };

type Phase =
  | { at: "idle" }
  | { at: "writing" }
  | { at: "drawing"; story: Story }
  | { at: "ready"; story: Story }
  | { at: "error"; code: AiErrorCode };

const noSubscribe = () => () => {};

// The last story per lab item outlives the card (switching back to the chat and back).
const stories = new Map<string, Story>();

/** The page as a link anyone can open: no room code, no hash. */
function shareUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("room");
  url.hash = "";
  return url.toString();
}

function slug(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "build-story"
  );
}

type StoryCardProps = { lab: LabKind; itemId: string; log: SessionLog; t: AiT; locale: Locale; image: boolean };

/** Build Stories (H4 /api/ai/story + /api/ai/image): the session, written up with a cover, to keep and share. */
export function StoryCard({ lab, itemId, log, t, locale, image }: StoryCardProps) {
  const key = `${lab}:${itemId}`;
  const saved = stories.get(key);
  const [phase, setPhase] = useState<Phase>(saved ? { at: "ready", story: saved } : { at: "idle" });
  const entries = useSyncExternalStore(log.subscribe, log.entries, log.entries);
  const room = useRoom();
  const abort = useRef<AbortController | null>(null);
  const headingId = useId();
  useEffect(() => () => abort.current?.abort(), []);

  async function make() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setPhase({ at: "writing" });
    const people = room
      ? [room.you, ...room.peers].map(({ name, lang }) => ({ name, lang }))
      : [{ name: log.self || t("story.me"), lang: locale }];
    try {
      const written = await writeStory(
        { lab, itemId, locale, peers: people, events: log.events() },
        { signal: controller.signal },
      );
      const story: Story = { ...written, cover: null, coverFailed: false, helpers: log.helpers() };
      if (!image || !written.imagePrompt) {
        stories.set(key, story);
        setPhase({ at: "ready", story });
        return;
      }
      setPhase({ at: "drawing", story });
      let done: Story;
      try {
        const { image: cover } = await drawCover(written.imagePrompt, { signal: controller.signal });
        done = { ...story, cover };
      } catch {
        if (controller.signal.aborted) return;
        done = { ...story, coverFailed: true };
      }
      stories.set(key, done);
      setPhase({ at: "ready", story: done });
    } catch (error) {
      if (controller.signal.aborted) return;
      setPhase({ at: "error", code: error instanceof AiError ? error.code : "upstream" });
    }
  }

  const story = phase.at === "ready" || phase.at === "drawing" ? phase.story : null;

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="font-head text-lg font-extrabold">
          {t("story.title")}
        </h3>
        <Chip tone="blush">{t("story.moments", { count: entries.length })}</Chip>
      </div>

      {phase.at === "idle" || phase.at === "error" ? (
        <>
          <p className="text-sm leading-relaxed text-muted">{t("story.intro")}</p>
          {phase.at === "error" ? (
            <Callout tone={phase.code === "not_configured" ? "note" : "warn"} live>
              {phase.code === "not_configured" ? t("story.unavailable") : t("story.failed")}
            </Callout>
          ) : null}
          {entries.length ? (
            <Button variant="primary" onClick={make} disabled={phase.at === "error" && phase.code === "not_configured"}>
              <PartnerIcon name="book" size={18} />
              {t("story.make")}
            </Button>
          ) : (
            <p className="rounded-ink border-2 border-dashed border-rule bg-surface p-3 text-sm">{t("story.empty")}</p>
          )}
        </>
      ) : null}

      {phase.at === "writing" ? (
        <div role="status" aria-busy="true" className="space-y-3 rounded-ink border-2 border-line bg-surface p-4 shadow-ink">
          <div className="h-6 w-3/4 animate-pulse rounded-ink-sm bg-mustard/60" />
          <div className="aspect-[2/1] animate-pulse rounded-ink-sm bg-sunken" />
          <p className="text-sm text-muted">{t("story.writing")}</p>
        </div>
      ) : null}

      {story ? <StoryView story={story} drawing={phase.at === "drawing"} t={t} onRemake={make} /> : null}
    </section>
  );
}

function StoryView({ story, drawing, t, onRemake }: { story: Story; drawing: boolean; t: AiT; onRemake(): void }) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const credits = useMemo(() => story.helpers.map(({ helper, learner }) => t("story.helped", { helper, learner })), [story.helpers, t]);
  const shareText = t("story.shareText", { title: story.title });

  // The picture is drawn ahead of time: navigator.share() must run straight from the click.
  const [png, setPng] = useState<Blob | null>(null);
  const brand = t("story.footer");
  useEffect(() => {
    if (drawing) return;
    let live = true;
    const styles = getComputedStyle(document.body);
    const footer = `${brand} · ${window.location.host}`;
    (story.cover ? loadImage(story.cover).catch(() => null) : Promise.resolve(null))
      .then((cover) =>
        storyPng(
          { title: story.title, text: plainStory(story.story), cover, credits, footer },
          { body: styles.fontFamily, head: styles.getPropertyValue("--font-head") || styles.fontFamily },
        ),
      )
      .then((blob) => live && setPng(blob))
      .catch(() => live && setPng(null));
    return () => {
      live = false;
    };
  }, [story, drawing, credits, brand]);

  function download() {
    if (!png) return;
    const href = URL.createObjectURL(png);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${slug(story.title)}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  async function share() {
    const url = shareUrl();
    const files = png ? [new File([png], `${slug(story.title)}.png`, { type: "image/png" })] : [];
    const withFile = { title: story.title, text: shareText, url, files };
    try {
      await navigator.share(files.length && navigator.canShare?.(withFile) ? withFile : { title: story.title, text: shareText, url });
    } catch (error) {
      // The reader closing the share sheet is not an error; anything else falls back to the link.
      if (!(error instanceof DOMException && error.name === "AbortError")) await copyLink();
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function facebook() {
    const target = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}`;
    window.open(target, "_blank", "noopener,noreferrer,width=640,height=600");
  }

  const labels = { code: t("panel.code"), copy: t("tools.copy"), copied: t("tools.copied") };

  return (
    <div className="space-y-3">
      <article className="overflow-hidden rounded-ink border-2 border-line bg-surface shadow-ink motion-safe:animate-ink-pop">
        <h4 className="border-b-2 border-line bg-mustard px-4 py-3 font-head text-xl font-extrabold leading-tight text-on-color">
          {story.title}
        </h4>
        {story.cover ? (
          // A data URL from /api/ai/image: next/image adds nothing here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.cover}
            alt={t("story.coverAlt", { title: story.title })}
            className="aspect-[2/1] w-full border-b-2 border-line object-cover"
          />
        ) : drawing ? (
          <div role="status" className="flex aspect-[2/1] items-center justify-center border-b-2 border-line bg-sunken">
            <p className="flex items-center gap-2 text-sm text-muted">
              <span className="size-2 animate-ping rounded-full bg-tomato" aria-hidden="true" />
              {t("story.drawing")}
            </p>
          </div>
        ) : null}
        <div className="space-y-3 p-4 text-sm leading-relaxed">
          <Markdown text={story.story} labels={labels} />
          {story.highlights.length ? (
            <div>
              <p className="font-ui text-[0.7rem] font-extrabold uppercase tracking-wide text-muted">{t("story.highlights")}</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {story.highlights.map((item) => (
                  <li key={item}>
                    <Chip tone="mint">{item}</Chip>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {credits.length ? (
            <div>
              <p className="font-ui text-[0.7rem] font-extrabold uppercase tracking-wide text-muted">{t("story.builtBy")}</p>
              <ul className="mt-1 space-y-0.5 font-bold">
                {credits.map((line) => (
                  <li key={line} className="flex items-center gap-1.5">
                    <PartnerIcon name="people" size={16} />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <p className="border-t-2 border-dashed border-rule px-4 py-2 font-ui text-[0.7rem] text-muted">{t("story.footer")}</p>
      </article>
      {story.coverFailed ? <p className="text-xs text-muted">{t("story.noCover")}</p> : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label={t("story.share")}>
        <Button size="sm" variant="primary" onClick={download} disabled={!png}>
          <PartnerIcon name="download" size={16} />
          {t("story.download")}
        </Button>
        {canShare ? (
          <Button size="sm" onClick={share} disabled={drawing}>
            <PartnerIcon name="share" size={16} />
            {t("story.share")}
          </Button>
        ) : null}
        <Button size="sm" onClick={copyLink} aria-live="polite">
          <PartnerIcon name="link" size={16} />
          {copied ? t("story.copied") : t("story.copyLink")}
        </Button>
        <Button size="sm" onClick={facebook}>
          {t("story.facebook")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onRemake} disabled={drawing}>
          <PartnerIcon name="refresh" size={16} />
          {t("story.remake")}
        </Button>
      </div>
    </div>
  );
}
