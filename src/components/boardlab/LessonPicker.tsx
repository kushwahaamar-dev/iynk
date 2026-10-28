"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Select } from "@/components/ui/Field";
import { isDone, progressKey, progressPrefix, useCount, useSaved } from "@/lib/progress";
import type { LessonLink } from "./model";
import { useText } from "./text";

const PHONE = "(max-width: 639px)";
const subscribePhone = (notify: () => void) => {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const isPhone = () => window.matchMedia(PHONE).matches;

/** Where this lesson sits among the board's lessons: previous and next, and a select of every lesson with its done mark. */
export function LessonPicker({ lang, board, lessons, current }: { lang: string; board: string; lessons: LessonLink[]; current: LessonLink }) {
  const { t } = useText();
  const router = useRouter();
  const saved = useSaved();
  const count = useCount(progressPrefix.boardLessons(board), lessons.length);
  const index = lessons.findIndex((l) => l.id === current.id);
  const prev = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
  const href = (l: LessonLink) => `/${lang}/boards/${board}/${l.id}`;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <IconButton icon="chevron-left" size="sm" label={t("lesson.prev")} shortcut="[" disabled={!prev} onClick={() => prev && router.push(href(prev))} />
      <div className="w-24 sm:w-64" data-testid="lesson-strip">
        <Select label={t("lesson.strip")} hideLabel value={current.id} onChange={(e) => router.push(href(lessons.find((l) => l.id === e.target.value) ?? current))}>
          {lessons.map((l) => (
            <option key={l.id} value={l.id} data-lesson={l.id}>
              {phone ? `${l.n} / ${lessons.length}` : `${l.n}. ${l.title}`}
              {isDone(progressKey.boardLesson(board, l.id), saved) ? ` (${t("lesson.done")})` : ""}
            </option>
          ))}
        </Select>
      </div>
      <span className="tabular hidden text-sm text-muted sm:inline" data-testid="lesson-progress">
        {t("lesson.done")} {count.done}/{count.total}
      </span>
      <IconButton icon="chevron-right" size="sm" label={t("lesson.next")} shortcut="]" disabled={!next} onClick={() => next && router.push(href(next))} />
    </div>
  );
}
