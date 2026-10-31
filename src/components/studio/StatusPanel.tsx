"use client";

import { useMemo } from "react";
import { Callout } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { StatusView } from "@/studio/run/status";

export interface StatusPanelProps {
  view: StatusView;
  messages: Messages["studio"];
  lang: Locale;
}

export function StatusPanel({ view, messages, lang }: StatusPanelProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studio`), [lang, messages]);
  return (
    <section aria-labelledby="board-status-title" className="flex flex-col gap-2">
      <h2 id="board-status-title" className="text-base font-semibold">
        {t("lesson.status.title")}
      </h2>
      {view.kind === "brownout" ? (
        <Callout tone="danger" live>{t("lesson.status.brownout")}</Callout>
      ) : (
        <p className="text-base text-pretty">{t(view.kind === "ok" ? "lesson.status.ok" : "lesson.status.unknown")}</p>
      )}
      {view.supplyMa === null ? null : <p className="tabular font-mono text-sm">{t("lesson.status.current", { ma: view.supplyMa })}</p>}
    </section>
  );
}
