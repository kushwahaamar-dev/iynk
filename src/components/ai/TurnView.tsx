"use client";

import { Button, Callout, Chip, Icon, cx } from "@/components/ui";
import type { Citation, ToolRecord, Turn } from "@/lib/ai/conversation";
import type { AiT } from "@/lib/ai/messages";
import { ChangeCard } from "./ChangeCard";
import { Markdown } from "./Markdown";

type TurnProps = {
  turn: Turn;
  /** First partner turn after a question: shows the avatar. */
  first: boolean;
  t: AiT;
  busy: boolean;
  onRetry(): void;
  onDecide(toolId: string, accept: boolean): void;
  onPeer(toolId: string, send: boolean): void;
  onFlash(partId: string, note: string): void;
  onInvite(): void;
};

export function TurnView({ turn, first, t, busy, onRetry, onDecide, onPeer, onFlash, onInvite }: TurnProps) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end ps-8 motion-safe:animate-rise-in">
        <p className="max-w-full whitespace-pre-wrap break-words rounded-2xl bg-hover px-4 py-3 text-sm">
          <span className="sr-only">{t("panel.you")}: </span>
          {turn.via === "voice" ? (
            <span className="me-1 inline-block align-[-3px]" aria-hidden="true">
              <Icon name="mic" size={16} />
            </span>
          ) : null}
          {turn.text}
        </p>
      </div>
    );
  }

  if (turn.role === "note") {
    const kind = t(`panel.kinds.${turn.kind}`);
    return (
      <p className="text-center text-xs text-muted">
        {t(turn.decision === "accepted" ? "panel.accepted" : "panel.rejected", { kind })}
      </p>
    );
  }

  const streaming = turn.status === "streaming";
  const labels = { code: t("panel.code"), copy: t("tools.copy"), copied: t("tools.copied") };
  return (
    <div className="flex gap-2 pe-2 motion-safe:animate-rise-in">
      <span
        aria-hidden="true"
        className={cx(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-sunken",
          !first && "invisible",
        )}
      >
        <Icon name="spark" size={16} />
      </span>
      <div className="min-w-0 flex-1 space-y-2" aria-busy={streaming}>
        <span className="sr-only">{t("panel.partner")}: </span>
        {turn.text ? (
          <div className="py-1 text-sm leading-relaxed">
            <Markdown text={turn.text} labels={labels} />
            {streaming ? <span aria-hidden="true" className="ms-0.5 inline-block h-4 w-0.5 animate-pulse bg-ink align-middle motion-reduce:animate-none" /> : null}
          </div>
        ) : streaming && !turn.tools.length ? (
          <p className="flex items-center gap-2 py-2 text-sm text-muted">
            <Dots />
            {t("panel.thinking")}
          </p>
        ) : null}

        {turn.citations.length ? <Citations citations={turn.citations} label={t("panel.sources")} /> : null}

        {turn.tools.map((tool) => (
          <ToolView key={tool.id} tool={tool} t={t} onDecide={onDecide} onPeer={onPeer} onFlash={onFlash} onInvite={onInvite} />
        ))}

        {turn.status === "stopped" ? <p className="text-xs text-muted">{t("panel.stopped")}</p> : null}
        {turn.status === "error" && turn.error ? (
          <Callout tone={turn.error === "not_configured" ? "note" : "warn"} live>
            {t(`errors.${turn.error}`)}
            {turn.error !== "not_configured" ? (
              <Button size="sm" variant="secondary" className="mt-2 flex" onClick={onRetry} disabled={busy}>
                <Icon name="refresh" size={16} />
                {t("panel.retry")}
              </Button>
            ) : null}
          </Callout>
        ) : null}
      </div>
    </div>
  );
}

function Dots() {
  return (
    <span aria-hidden="true" className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-ink motion-safe:animate-bounce"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Citations({ citations, label }: { citations: Citation[]; label: string }) {
  return (
    <div>
      <p className="kicker mb-1">{label}</p>
      <ul className="grid gap-2">
        {citations.map((citation, i) => (
          <li key={citation.url}>
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-2 rounded-lg bg-sunken p-2 no-underline motion-fade hover:bg-hover"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-info-bg text-xs font-semibold text-info tabular">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{citation.title}</span>
                <span className="block truncate text-xs text-muted">{host(citation.url)}</span>
                {citation.snippet ? <span className="line-clamp-2 text-xs text-muted">{citation.snippet}</span> : null}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ToolView({
  tool,
  t,
  onDecide,
  onPeer,
  onFlash,
  onInvite,
}: {
  tool: ToolRecord;
  t: AiT;
  onDecide(toolId: string, accept: boolean): void;
  onPeer(toolId: string, send: boolean): void;
  onFlash(partId: string, note: string): void;
  onInvite(): void;
}) {
  const card = tool.card;
  if (!card) return null;
  switch (card.kind) {
    case "highlight":
      return (
        <Callout tone="tip" title={t("tools.highlight", { part: card.partId })}>
          {card.note ? <p>{card.note}</p> : null}
          {card.shown ? (
            <Button size="sm" variant="ghost" className="mt-1 -ms-2" onClick={() => onFlash(card.partId, card.note)}>
              {t("tools.showAgain")}
            </Button>
          ) : (
            <p className="text-xs text-muted">{t("tools.highlightOff")}</p>
          )}
        </Callout>
      );
    case "change":
      return <ChangeCard card={card} t={t} onDecide={(accept) => onDecide(tool.id, accept)} />;
    case "peer":
      switch (card.status) {
        case "pending":
          return (
            <Callout tone="note" title={t("tools.askPeerPending", { name: card.peer })}>
              <p className="text-muted">{t("tools.question", { question: card.question })}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="primary" onClick={() => onPeer(tool.id, true)}>
                  {t("tools.askPeerSend")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onPeer(tool.id, false)}>
                  {t("tools.askPeerDecline")}
                </Button>
              </div>
            </Callout>
          );
        case "sent":
          return (
            <Callout tone="note" title={t("tools.askPeer", { name: card.peer })}>
              <p className="text-muted">{t("tools.question", { question: card.question })}</p>
            </Callout>
          );
        case "declined":
          return (
            <Callout tone="note">
              <p className="text-sm text-muted">{t("tools.askPeerDeclined", { name: card.peer })}</p>
            </Callout>
          );
        case "no_peer":
          return (
            <Callout tone="note">
              <p>{t("tools.askPeerNoRoom")}</p>
              <Button size="sm" variant="primary" className="mt-2" onClick={onInvite}>
                <Icon name="people" size={16} />
                {t("tools.invite")}
              </Button>
            </Callout>
          );
      }
    case "panel":
      return <Chip tone="info">{t("tools.opened", { tab: t(`tools.tabs.${card.tab}`) })}</Chip>;
  }
}
