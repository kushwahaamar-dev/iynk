"use client";

import { memo, useMemo } from "react";
import type { AiT } from "@/ai/messages";
import type { ToolRecord, Turn } from "@/ai/host/thread";
import { createSeenUrls } from "@/ai/render/links";
import type { PartnerSources } from "@/ai/sources";
import { parseRef, resolveRef } from "@/ai/tools/refs";
import { Chip, Icon } from "@/components/ui";
import { Markdown, type RenderPolicy } from "./Markdown";
import { ToolCard } from "./ToolCard";

type TurnViewProps = {
  turn: Turn;
  sources: PartnerSources;
  onRefClick(raw: string): void;
  t: AiT;
  /** The reply is still arriving: show the caret, or the dots while nothing has come yet. */
  streaming?: boolean;
};

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

function policyFor(tools: readonly ToolRecord[], sources: PartnerSources, onRefClick: (raw: string) => void, t: AiT): RenderPolicy {
  const seen = createSeenUrls();
  for (const tool of tools) seen.add(tool.resultText);
  return {
    seenUrls: seen,
    resolveRef(raw) {
      const ref = parseRef(raw);
      if (!ref) return null;
      const found = resolveRef(ref, sources);
      return found.ok ? found.label : null;
    },
    onHighlight: onRefClick,
    // Links open only after a confirmation the partner strings do not cover yet, so none is offered.
    labels: { confirmTitle: "", confirmBody: "", confirm: "", cancel: "", close: "", unverified: t("partner.unverified") },
  };
}

/** One message in the thread. Tool output is shown as text only, and a reference renders as a chip only when it points at something in the project. */
function TurnViewBase({ turn, sources, onRefClick, t, streaming = false }: TurnViewProps) {
  const policy = useMemo(() => policyFor(turn.tools, sources, onRefClick, t), [turn.tools, sources, onRefClick, t]);

  if (turn.role === "user") {
    return (
      <div className="flex justify-end ps-8 motion-safe:animate-rise-in">
        <p className="max-w-full whitespace-pre-wrap break-words rounded-2xl bg-hover px-4 py-3 text-sm">
          <span className="sr-only">{t("panel.you")}: </span>
          {turn.text}
        </p>
      </div>
    );
  }

  const labels = { code: t("panel.code"), copy: t("tools.copy"), copied: t("tools.copied") };
  return (
    <div className="flex gap-2 pe-2 motion-safe:animate-rise-in">
      <span aria-hidden="true" className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-sunken">
        <Icon name="spark" size={16} />
      </span>
      <div className="min-w-0 flex-1 space-y-2" aria-busy={streaming}>
        <span className="sr-only">{t("panel.partner")}: </span>
        {turn.text ? (
          <div className="py-1 text-sm leading-relaxed">
            <Markdown text={turn.text} labels={labels} policy={policy} />
            {streaming ? (
              <span aria-hidden="true" className="ms-0.5 inline-block h-4 w-0.5 animate-pulse bg-ink align-middle motion-reduce:animate-none" />
            ) : null}
          </div>
        ) : streaming && turn.tools.length === 0 ? (
          <p className="flex items-center gap-2 py-2 text-sm text-muted">
            <Dots />
            {t("panel.thinking")}
          </p>
        ) : null}

        {turn.tools.map((record) => (
          <ToolCard key={record.id} record={record} t={t} />
        ))}

        {turn.flags.includes("unverified") ? (
          <Chip tone="warn">
            <Icon name="warn" size={16} />
            {t("partner.unverified")}
          </Chip>
        ) : null}
      </div>
    </div>
  );
}

export const TurnView = memo(TurnViewBase);
