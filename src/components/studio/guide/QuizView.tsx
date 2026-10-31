"use client";

import { useMemo, useState } from "react";
import { Button, cx, Icon } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type Translate } from "@/i18n/translate";
import type { Guide } from "@/project/generated/types";
import type { LearnerRecord } from "@/project/guided/record";
import { textAt } from "./useGuide";

export type Quiz = NonNullable<Guide["quizzes"]>[number];

export interface QuizViewProps {
  quizzes: Quiz[];
  record?: LearnerRecord;
  locale: Locale;
  onAnswer(quizId: string, questionId: string, choice: number): void;
  messages: Messages["studio"];
}

type T = Translate<Messages["studio"]>;

function QuizBlock({ quiz, record, locale, onAnswer, t }: { quiz: Quiz; record?: LearnerRecord; locale: Locale; onAnswer: QuizViewProps["onAnswer"]; t: T }) {
  const [cursor, setCursor] = useState(0);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const question = quiz.questions[cursor]!;
  const given = record?.quiz[quiz.id]?.answers[question.id];
  const answered = given !== undefined;
  const picked = given ?? picks[question.id];
  const right = given === question.answer;
  const name = `${quiz.id}-${question.id}`;

  return (
    <fieldset className="flex flex-col gap-2" data-testid="guide-quiz">
      <legend className="mb-2 text-base font-semibold leading-snug text-pretty">{textAt(question.q, locale)}</legend>
      {question.options.map((option, i) => (
        <label
          key={i}
          className={cx(
            "flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm leading-snug motion-fade",
            answered ? "cursor-default" : "cursor-pointer",
            picked === i ? (answered ? (right ? "border-good bg-good-bg" : "border-bad bg-bad-bg") : "border-ink") : "border-rule",
            !answered && picked !== i && "hover:bg-sunken",
          )}
        >
          <input type="radio" className="size-4 shrink-0" name={name} checked={picked === i} disabled={answered} onChange={() => setPicks({ ...picks, [question.id]: i })} />
          <span>{textAt(option, locale)}</span>
        </label>
      ))}
      <div role="status" aria-live="polite" className="flex flex-col gap-1">
        {answered ? (
          <p className="flex items-start gap-2 text-sm">
            <Icon name={right ? "check-circle" : "warn-circle"} size={16} aria-hidden="true" className={cx("mt-0.5 shrink-0", right ? "text-good" : "text-bad")} />
            <span className="text-pretty">
              <strong className="font-semibold">{right ? t("lesson.guide.quiz.correct") : t("lesson.guide.quiz.wrong")}</strong>
              {". "}
              <strong className="font-semibold">{t("lesson.guide.quiz.why")}</strong>
              {": "}
              {textAt(question.why, locale)}
            </span>
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        {answered ? (
          cursor < quiz.questions.length - 1 ? (
            <Button size="sm" onClick={() => setCursor(cursor + 1)}>
              {t("lesson.guide.quiz.next")}
            </Button>
          ) : null
        ) : (
          <Button size="sm" variant="primary" disabled={picked === undefined} onClick={() => picked !== undefined && onAnswer(quiz.id, question.id, picked)}>
            {t("lesson.guide.quiz.answer")}
          </Button>
        )}
      </div>
    </fieldset>
  );
}

export function QuizView({ quizzes, record, locale, onAnswer, messages }: QuizViewProps) {
  const t = useMemo(() => createTranslator(locale, messages, `${locale}/studio`), [locale, messages]);
  return (
    <section aria-label={t("lesson.guide.quiz.title")} className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{t("lesson.guide.quiz.title")}</h3>
      {quizzes.map((quiz) => (
        <QuizBlock key={quiz.id} quiz={quiz} record={record} locale={locale} onAnswer={onAnswer} t={t} />
      ))}
    </section>
  );
}
