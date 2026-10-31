"use client";

import { useMemo } from "react";
import { Icon } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { CompletionResult } from "@/project/guided/engine";
import type { Tier } from "@/project/guided/record";

export interface CompletionLineProps {
  completion: CompletionResult | null;
  tier: Tier | null;
  legacy: boolean;
  messages: Messages["studio"];
  locale: Locale;
}

/** One plain sentence about what is left, or that the lesson is complete. */
export function CompletionLine({ completion, tier, legacy, messages, locale }: CompletionLineProps) {
  const t = useMemo(() => createTranslator(locale, messages, `${locale}/studio`), [locale, messages]);

  let text: string | null = null;
  let done = false;
  if (legacy) {
    text = t("lesson.completion.legacy");
    done = true;
  } else if (completion?.complete && tier !== null) {
    text = t("lesson.completion.done", { tier });
    done = true;
  } else if (completion && !completion.complete) {
    const reason = completion.open[0];
    if (reason && reason !== "diagnosis") text = t(`lesson.completion.open.${reason}`);
  }

  return (
    <p role="status" aria-live="polite" className="flex items-start gap-2 text-sm font-semibold" data-testid="completion-line">
      {text ? (
        <>
          <Icon name={done ? "check-circle" : "info"} size={16} aria-hidden="true" className={done ? "mt-0.5 shrink-0 text-good" : "mt-0.5 shrink-0 text-muted"} />
          <span className="text-pretty">{text}</span>
        </>
      ) : null}
    </p>
  );
}
