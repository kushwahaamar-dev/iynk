"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { TemplateEntry } from "@/project/guided/plan";
import { boardName, titleOf, type LessonProgress } from "../TemplateGallery";

export interface LessonNavProps {
  current: string;
  templates: readonly TemplateEntry[];
  lang: Locale;
  progress(templateId: string): LessonProgress;
  onOpen(id: string): void;
  messages: Messages["studio"];
}

export function LessonNav({ current, templates, lang, progress, onOpen, messages }: LessonNavProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studio`), [lang, messages]);
  const board = templates.find((entry) => entry.id === current)?.board;
  const lessons = useMemo(
    () => (board === undefined ? [] : templates.filter((entry) => entry.board === board && entry.kind === "lesson").sort((a, b) => a.order - b.order)),
    [templates, board],
  );
  if (board === undefined) return null;

  const index = lessons.findIndex((entry) => entry.id === current);
  const previous = index > 0 ? lessons[index - 1] : undefined;
  const next = index >= 0 ? lessons[index + 1] : undefined;
  const done = lessons.filter((entry) => progress(entry.id) !== "none").length;

  return (
    <nav aria-label={t("lesson.nav.list")} className="flex flex-col gap-2">
      <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{boardName(board)}</span>
        <span className="tabular-nums text-muted">{t("lesson.nav.count", { done, total: lessons.length })}</span>
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={!previous} onClick={() => previous && onOpen(previous.id)}>
          {t("lesson.nav.prev")}
        </Button>
        <Button size="sm" variant="secondary" disabled={!next} onClick={() => next && onOpen(next.id)}>
          {t("lesson.nav.next")}
        </Button>
      </div>
      <ol className="flex flex-col gap-1">
        {lessons.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              aria-current={entry.id === current ? "step" : undefined}
              onClick={() => onOpen(entry.id)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-start text-sm motion-fade hover:bg-hover aria-[current=step]:bg-sunken aria-[current=step]:font-semibold"
            >
              <span>{titleOf(entry, lang)}</span>
              <span className="shrink-0 text-muted">{t(`lesson.gallery.progress.${progress(entry.id)}`)}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
