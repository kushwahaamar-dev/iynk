"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import type { Quiz, RoboticsContent } from "@/content/schema";
import type { QuizResult } from "@/lib/progress/storage";
import type { BenchAction, QuizSession } from "@/lib/robotics/store";
import type { BenchT, TextOf } from "./messages";

type Props = {
  bench: RoboticsContent;
  session: QuizSession;
  unlocked: (quiz: Quiz) => boolean;
  best: (quizId: string) => QuizResult | undefined;
  t: BenchT;
  tx: TextOf;
  dispatch: (action: BenchAction) => void;
  headingId: string;
};

export function quizTitle(quiz: Quiz, bench: RoboticsContent, t: BenchT, tx: TextOf): string {
  if (quiz.afterStep === null) return t("quiz.final");
  const step = bench.steps.find((s) => s.id === quiz.afterStep);
  return t("quiz.after", { step: step ? tx(step.title) : quiz.afterStep });
}

export function QuizPanel({ bench, session, unlocked, best, t, tx, dispatch, headingId }: Props) {
  if (bench.quizzes.length === 0) return null;
  const open = bench.quizzes.find((quiz) => quiz.id === session.open) ?? null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <h2 id={headingId} className="text-lg">
        {t("quiz.heading")}
      </h2>
      <ul className="mt-2 flex flex-col divide-y divide-rule">
        {bench.quizzes.map((quiz) => {
          const isOpen = unlocked(quiz);
          const result = best(quiz.id);
          const step = quiz.afterStep ? bench.steps.find((s) => s.id === quiz.afterStep) : undefined;
          const title = quizTitle(quiz, bench, t, tx);
          return (
            <li key={quiz.id} data-quiz={quiz.id} className={cx("-mx-4 flex min-h-14 items-center gap-3 px-4 py-3", !isOpen && "text-muted")}>
              {isOpen ? null : <Icon name="lock" size={20} className="shrink-0" />}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="text-xs text-muted">
                  {!isOpen
                    ? step
                      ? t("quiz.unlocks", { step: tx(step.title) })
                      : t("quiz.unlocksAll")
                    : result
                      ? t("quiz.best", { score: result.score, total: result.total })
                      : t("quiz.notTaken")}
                </p>
              </div>
              {isOpen ? (
                <Button
                  size="sm"
                  variant={result ? "secondary" : "primary"}
                  className="shrink-0 whitespace-nowrap"
                  aria-label={`${result ? t("quiz.retake") : t("quiz.open")}: ${title}`}
                  onClick={() => dispatch({ type: "quiz/open", quiz: quiz.id })}
                >
                  {result ? t("quiz.retake") : t("quiz.open")}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {open ? <QuizDialog quiz={open} bench={bench} session={session} best={best(open.id)} t={t} tx={tx} dispatch={dispatch} /> : null}
    </section>
  );
}

type DialogProps = {
  quiz: Quiz;
  bench: RoboticsContent;
  session: QuizSession;
  best: QuizResult | undefined;
  t: BenchT;
  tx: TextOf;
  dispatch: (action: BenchAction) => void;
};

function QuizDialog({ quiz, bench, session, best, t, tx, dispatch }: DialogProps) {
  const id = useId();
  const close = () => dispatch({ type: "quiz/close" });
  const question = quiz.questions[session.index];
  const chosen = question ? session.answers[question.id] : undefined;
  const last = session.index + 1 >= quiz.questions.length;

  if (session.result) {
    return (
      <Dialog
        open
        onClose={close}
        title={quizTitle(quiz, bench, t, tx)}
        closeLabel={t("quiz.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => dispatch({ type: "quiz/open", quiz: quiz.id })}>
              {t("quiz.retake")}
            </Button>
            <Button variant="primary" onClick={close}>
              {t("quiz.close")}
            </Button>
          </>
        }
      >
        <p className="tabular text-3xl font-bold tracking-tight" data-quiz-score>
          {t("quiz.score", { score: session.result.score, total: session.result.total })}
        </p>
        {best ? <p className="mt-2 text-sm text-muted">{t("quiz.best", { score: best.score, total: best.total })}</p> : null}
      </Dialog>
    );
  }

  if (!question) return null;
  const right = chosen === question.answer;

  return (
    <Dialog
      open
      onClose={close}
      title={quizTitle(quiz, bench, t, tx)}
      description={t("quiz.question", { n: session.index + 1, total: quiz.questions.length })}
      closeLabel={t("quiz.close")}
      footer={
        session.checked ? (
          <Button variant="primary" onClick={() => dispatch({ type: "quiz/next" })} autoFocus>
            {last ? t("quiz.finish") : t("quiz.next")}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => dispatch({ type: "quiz/check" })} disabled={chosen === undefined}>
            {t("quiz.check")}
          </Button>
        )
      }
    >
      <fieldset>
        <legend className="text-lg font-bold" id={`${id}-q`}>
          {tx(question.q)}
        </legend>
        <p className="sr-only">{t("quiz.choose")}</p>
        <div className="mt-3 flex flex-col gap-2">
          {question.options.map((option, index) => {
            const isChosen = chosen === index;
            const isAnswer = session.checked && index === question.answer;
            const isWrong = session.checked && isChosen && !right;
            return (
              <label
                key={option}
                className={cx(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2",
                  isAnswer ? "on-fill border-rule bg-good-bg" : isWrong ? "on-fill border-rule bg-bad-bg" : isChosen ? "border-ink bg-sunken" : "border-rule",
                  session.checked && "cursor-default",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-options`}
                  value={index}
                  checked={isChosen}
                  disabled={session.checked}
                  onChange={() => dispatch({ type: "quiz/choose", option: index })}
                  className="size-5"
                />
                <span>{tx(option)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div aria-live="polite" className="mt-4">
        {session.checked ? (
          <Callout tone={right ? "success" : "warn"} title={right ? t("quiz.right") : t("quiz.wrong", { answer: tx(question.options[question.answer]) })}>
            {tx(question.why)}
          </Callout>
        ) : null}
      </div>
    </Dialog>
  );
}
