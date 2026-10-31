"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";

export interface LessonHintsProps {
  levels: { level: number; text: string }[];
  opened: number;
  onOpen(level: number): void;
  messages: Messages["studio"];
  lang: Locale;
}

export function LessonHints({ levels, opened, onOpen, messages, lang }: LessonHintsProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studio`), [lang, messages]);
  if (levels.length === 0) return null;
  const next = levels.find((l) => l.level > opened);

  return (
    <section aria-label={t("lesson.guide.hints")} className="flex flex-col gap-2" data-testid="lesson-hints">
      <h3 className="text-sm font-semibold">{t("lesson.guide.hints")}</h3>
      <ol className="flex flex-col gap-2">
        {levels
          .filter((l) => l.level <= opened)
          .map((l) => (
            <li key={l.level} data-level={l.level} className="rounded-lg bg-sunken px-3 py-2 text-sm">
              <p className="max-h-48 overflow-y-auto whitespace-pre-line text-pretty">{l.text}</p>
            </li>
          ))}
      </ol>
      {next ? (
        <Button size="sm" variant="secondary" className="self-start" onClick={() => onOpen(next.level)}>
          {t("lesson.guide.hintReveal", { n: next.level })}
        </Button>
      ) : null}
    </section>
  );
}
