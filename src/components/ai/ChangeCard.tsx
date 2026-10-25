"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button, Chip, cx } from "@/components/ui";
import { diffLines, foldDiff } from "@/lib/ai/diff";
import type { AiT } from "@/lib/ai/messages";
import type { ToolCard } from "@/lib/ai/run-tools";

type Change = Extract<ToolCard, { kind: "change" }>;

const MARK = { add: "+", del: "−", same: " " } as const;

/** propose_change: the diff, why, and Accept / Reject (or Copy when the bench cannot apply it). */
export function ChangeCard({
  card,
  t,
  onDecide,
}: {
  card: Change;
  t: AiT;
  onDecide: (accept: boolean) => void;
}) {
  const rows = useMemo(() => foldDiff(diffLines(card.before, card.after)), [card.before, card.after]);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const applies = card.actions.length > 0;
  const titleId = useId();

  async function copy() {
    try {
      await navigator.clipboard.writeText(card.after);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-labelledby={titleId}
      className="overflow-hidden rounded-ink border-2 border-line bg-surface shadow-ink-sm"
    >
      <header className="flex items-center justify-between gap-2 border-b-2 border-line bg-mustard px-3 py-2 text-on-color">
        <h3 id={titleId} className="font-ui text-xs font-extrabold uppercase tracking-wide">
          {t(`tools.change.${card.change.kind}`)}
        </h3>
        {card.status !== "pending" ? (
          <Chip tone={card.status === "accepted" ? "mint" : "plain"}>
            {t(card.status === "accepted" ? "tools.accepted" : "tools.rejected")}
          </Chip>
        ) : null}
      </header>
      <p className="px-3 pt-2 text-sm">{card.change.reason}</p>
      <div
        role="group"
        tabIndex={0}
        aria-label={t("tools.diffLabel")}
        className="m-3 max-h-64 overflow-auto rounded-ink-sm border-2 border-line bg-paper font-ui text-xs leading-5"
      >
        {rows.map((row, i) =>
          row.op === "skip" ? (
            <div key={i} className="border-y border-dashed border-rule px-2 text-center text-muted">
              {t("tools.unchanged", { count: row.count })}
            </div>
          ) : (
            <div
              key={i}
              className={cx(
                "flex whitespace-pre",
                row.op === "add" && "on-fill bg-good-bg",
                row.op === "del" && "on-fill bg-bad-bg",
              )}
            >
              <span className="w-5 shrink-0 select-none text-center font-bold">{MARK[row.op]}</span>
              <span className="pe-2">{row.text || " "}</span>
            </div>
          ),
        )}
      </div>
      {card.status === "pending" ? (
        applies ? (
          <div className="flex flex-wrap gap-2 px-3 pb-3">
            <Button variant="primary" size="sm" onClick={() => onDecide(true)}>
              {t("tools.accept")}
            </Button>
            <Button size="sm" onClick={() => onDecide(false)}>
              {t("tools.reject")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2 px-3 pb-3">
            <p className="text-xs text-muted">{t("tools.manual")}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={copy} aria-live="polite">
                {copied ? t("tools.copied") : t("tools.copy")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDecide(false)}>
                {t("tools.reject")}
              </Button>
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}
