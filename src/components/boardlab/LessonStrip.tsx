"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import { progressKey, useCount, useDone } from "@/lib/progress";
import type { LessonLink } from "./model";
import { useText } from "./text";

function Card({ board, lesson, active, href }: { board: string; lesson: LessonLink; active: boolean; href: string }) {
  const { t } = useText();
  const done = useDone(progressKey.boardLesson(board, lesson.id));
  return (
    <li className="shrink-0" data-lesson={lesson.id}>
      <Link
        href={href}
        aria-current={active ? "step" : undefined}
        aria-label={`${t("lesson.card", { n: lesson.n, title: lesson.title })}${done ? ` · ${t("lesson.done")}` : ""}`}
        className={cx(
          "relative flex min-h-11 w-56 flex-col justify-between gap-1 rounded-lg border-2 bg-surface px-3 py-2 no-underline shadow-ink-sm transition-transform hover:-translate-y-0.5 sm:w-60",
          active ? "border-ink font-bold" : "border-line",
        )}
      >
        <span className="text-xs uppercase tracking-wide text-muted">{t(`level.${lesson.level}`)}</span>
        <span className="text-sm uppercase leading-tight">
          {lesson.n}. {lesson.title}
        </span>
        {done && (
          <span aria-hidden="true" className="absolute end-2 top-2 inline-flex size-5 items-center justify-center rounded-full bg-good text-paper">
            <Icon name="check" size={12} />
          </span>
        )}
      </Link>
    </li>
  );
}

/** The lessons strip: every lesson of the board, the current one marked, with done ticks and n/N. */
export function LessonStrip({ lang, board, lessons, current }: { lang: string; board: string; lessons: LessonLink[]; current: string }) {
  const { t } = useText();
  const titleId = useId();
  const list = useRef<HTMLOListElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const count = useCount(`board:${board}:lesson:`, lessons.length);

  const measure = useCallback(() => {
    const el = list.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[aria-current="step"]');
    if (active) {
      const box = active.parentElement!;
      const left = box.offsetLeft - 40;
      const right = box.offsetLeft + box.offsetWidth + 40 - el.clientWidth;
      if (el.scrollLeft > left) el.scrollLeft = Math.max(0, left);
      else if (el.scrollLeft < right) el.scrollLeft = right;
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [current, measure]);

  const step = (dir: 1 | -1) => list.current?.scrollBy({ left: dir * list.current.clientWidth * 0.7, behavior: "smooth" });

  return (
    <nav aria-labelledby={titleId} className="flex flex-col gap-2" data-testid="lesson-strip">
      <div className="flex items-center gap-3">
        <h2 id={titleId} className="text-lg">
          {t("lesson.strip")}
        </h2>
        <span className="font-mono text-sm font-bold tabular" data-testid="lesson-progress">
          {count.done}/{count.total}
        </span>
      </div>
      <div className="relative">
        {edges.left && (
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={t("lesson.earlier")}
            className="absolute start-0 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-line bg-surface shadow-ink-sm"
          >
            <Icon name="chevron-right" className="rotate-180" />
          </button>
        )}
        <ol ref={list} onScroll={measure} className="flex gap-3 overflow-x-auto scroll-smooth px-1 py-2 [scrollbar-width:thin]">
          {lessons.map((l) => (
            <Card key={l.id} board={board} lesson={l} active={l.id === current} href={`/${lang}/boards/${board}/${l.id}`} />
          ))}
        </ol>
        {edges.right && (
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={t("lesson.more")}
            className="absolute end-0 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-line bg-surface shadow-ink-sm"
          >
            <Icon name="chevron-right" />
          </button>
        )}
      </div>
    </nav>
  );
}
