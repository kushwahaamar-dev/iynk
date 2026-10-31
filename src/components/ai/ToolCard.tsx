"use client";

import { useState } from "react";
import type { ToolRecord } from "@/ai/host/thread";
import type { Translate } from "@/i18n/translate";

type AiMessages = typeof import("@/i18n/messages/en/ai.json");
export type AiT = Translate<AiMessages>;

const PREVIEW_LINES = 20;

/** One tool call the partner made: its name, the arguments and the result, all as plain text. */
export function ToolCard({ record, t }: { record: ToolRecord; t: AiT }) {
  const [all, setAll] = useState(false);
  const lines = record.resultText.split("\n");
  const cut = lines.length > PREVIEW_LINES;
  const shown = cut && !all ? lines.slice(0, PREVIEW_LINES).join("\n") : record.resultText;

  return (
    <section aria-label={record.name} className="space-y-2 rounded-2xl bg-surface p-3">
      <header className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h4 className="break-all font-mono text-xs font-semibold">{record.name}</h4>
        <span className={record.ok ? "text-xs text-muted" : "text-xs font-semibold text-bad"}>
          {record.ok ? t("partner.tool.ok") : t("partner.tool.failed")}
        </span>
      </header>
      <div className="space-y-1">
        <p className="text-xs text-muted">{t("partner.tool.args")}</p>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-sunken p-2 font-mono text-xs">
          {record.argsText || t("partner.tool.noArgs")}
        </pre>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted">{t("partner.tool.result")}</p>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-sunken p-2 font-mono text-xs">
          {shown || t("partner.tool.noResult")}
        </pre>
        {cut ? (
          <button
            type="button"
            aria-expanded={all}
            onClick={() => setAll((open) => !open)}
            className="rounded-md px-1 text-xs font-semibold text-accent hover:underline"
          >
            {all ? t("partner.tool.showLess") : t("partner.tool.showAll", { count: lines.length })}
          </button>
        ) : null}
      </div>
    </section>
  );
}
