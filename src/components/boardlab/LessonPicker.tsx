"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Popover } from "@/components/ui/Popover";
import { progressKey, progressPrefix, useCount, useDone } from "@/lib/progress";
import type { LessonLink } from "./model";
import { useText } from "./text";

function Row({ board, lesson, current, href }: { board: string; lesson: LessonLink; current: boolean; href: string }) {
  const { t } = useText();
  const done = useDone(progressKey.boardLesson(board, lesson.id));
  return (
    <li data-lesson={lesson.id}>
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={cx(
          "flex min-h-11 items-center gap-3 rounded-ink-sm px-2 py-1.5 font-body text-sm text-ink no-underline hover:bg-sunken",
          current && "bg-sunken font-semibold",
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            "tabular inline-flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] font-ui text-xs font-bold",
            done ? "border-good bg-good text-paper" : current ? "border-ink" : "border-rule text-muted",
          )}
        >
          {done ? <Icon name="check" size={12} /> : lesson.n}
        </span>
        <span className="min-w-0 flex-1 leading-snug">
          <span className="sr-only">{lesson.n}. </span>
          {lesson.title}
        </span>
        <span className="shrink-0 text-xs text-muted">{done ? t("lesson.done") : t(`level.${lesson.level}`)}</span>
      </Link>
    </li>
  );
}

/**
 * Where this lesson sits among the board's lessons: previous and next, and a
 * "2 / 16" button that opens every lesson with its done tick.
 */
export function LessonPicker({ lang, board, lessons, current }: { lang: string; board: string; lessons: LessonLink[]; current: LessonLink }) {
  const { t } = useText();
  const router = useRouter();
  const count = useCount(progressPrefix.boardLessons(board), lessons.length);
  const index = lessons.findIndex((l) => l.id === current.id);
  const prev = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const href = (l: LessonLink) => `/${lang}/boards/${board}/${l.id}`;

  return (
    <div className="flex shrink-0 items-center">
      <IconButton icon="chevron-left" size="sm" label={t("lesson.prev")} shortcut="[" disabled={!prev} onClick={() => prev && router.push(href(prev))} />
      <Popover
        label={t("lesson.strip")}
        align="end"
        className="w-[min(26rem,calc(100vw-2rem))] p-2"
        trigger={
          <button type="button" className={buttonClass("ghost", "sm", "tabular gap-1 px-2 font-ui")}>
            <span className="sr-only">{t("lesson.strip")}: </span>
            {current.n} / {lessons.length}
            <Icon name="chevron-down" size={16} aria-hidden="true" />
          </button>
        }
      >
        <nav aria-label={t("lesson.strip")} data-testid="lesson-strip">
          <p className="ink-kicker flex items-center justify-between px-2 pb-2 pt-1">
            <span>{t("lesson.strip")}</span>
            <span className="tabular" data-testid="lesson-progress">
              {t("lesson.done")} {count.done}/{count.total}
            </span>
          </p>
          <ol className="max-h-[min(32rem,70svh)] overflow-y-auto">
            {lessons.map((l) => (
              <Row key={l.id} board={board} lesson={l} current={l.id === current.id} href={href(l)} />
            ))}
          </ol>
        </nav>
      </Popover>
      <IconButton icon="chevron-right" size="sm" label={t("lesson.next")} shortcut="]" disabled={!next} onClick={() => next && router.push(href(next))} />
    </div>
  );
}
