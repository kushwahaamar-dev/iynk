"use client";

import { useEffect } from "react";
import type { DroneContent } from "@/content/schema";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { progressKey } from "@/lib/progress/keys";
import { recordQuiz } from "@/lib/progress/progress";
import { useQuiz } from "@/lib/progress/hooks";
import { quizScore, type DroneLabAction, type DroneLabState } from "@/lib/dronelab/workshop";
import type { ContentT, DroneLabT } from "./text";

type Props = {
  content: DroneContent;
  state: DroneLabState;
  t: DroneLabT;
  ct: ContentT;
  dispatch(action: DroneLabAction): void;
};

export function QuizPanel({ content, state, t, ct, dispatch }: Props) {
  return (
    <div className="space-y-8">
      {content.quizzes.map((quiz) => (
        <QuizBlock key={quiz.id} quizId={quiz.id} content={content} state={state} t={t} ct={ct} dispatch={dispatch} />
      ))}
    </div>
  );
}

function QuizBlock({ quizId, content, state, t, ct, dispatch }: Props & { quizId: string }) {
  const quiz = content.quizzes.find((q) => q.id === quizId)!;
  const key = progressKey.droneQuiz(content.id, quiz.id);
  const saved = useQuiz(key);
  const picks = state.quiz[quiz.id] ?? {};
  const { score, total, finished } = quizScore(content, state, quiz.id);
  const step = quiz.afterStep ? content.build.find((s) => s.id === quiz.afterStep) : undefined;

  useEffect(() => {
    if (finished) recordQuiz(key, score, total);
  }, [finished, key, score, total]);

  return (
    <section aria-labelledby={`quiz-${content.id}-${quiz.id}`} className="space-y-4" data-quiz={quiz.id}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`quiz-${content.id}-${quiz.id}`} className="text-lg">
          {step ? `${t("quiz.title")} · ${ct(step.title)}` : t("quiz.title")}
        </h3>
        {saved ? (
          <span className="text-xs font-semibold tabular-nums text-muted">
            {t("quiz.best", { score: saved.score, total: saved.total })}
          </span>
        ) : null}
      </div>
      <ol className="space-y-4">
        {quiz.questions.map((question, qi) => {
          const chosen = picks[question.id] ?? [];
          const solved = chosen.includes(question.answer);
          const lastWrong = !solved && chosen.length > 0;
          return (
            <li key={question.id} className="border-t border-rule pt-4">
              <fieldset>
                <legend className="font-semibold">{t("quiz.question", { n: qi + 1, q: ct(question.q) })}</legend>
                <div className="mt-2 flex flex-col gap-2">
                  {question.options.map((option, oi) => {
                    const picked = chosen.includes(oi);
                    const right = picked && oi === question.answer;
                    const wrong = picked && oi !== question.answer;
                    return (
                      <Button
                        key={option}
                        size="sm"
                        variant="secondary"
                        aria-pressed={picked}
                        disabled={solved && !right}
                        className={`h-auto justify-start py-2 !text-start ${right ? "!bg-good-bg !text-good" : ""} ${wrong ? "line-through opacity-60" : ""}`}
                        onClick={() => dispatch({ type: "quiz/answer", quiz: quiz.id, question: question.id, option: oi })}
                      >
                        {right ? <Icon name="check" size={16} className="shrink-0" /> : null}
                        {ct(option)}
                      </Button>
                    );
                  })}
                </div>
                <div aria-live="polite" className="mt-2 text-sm">
                  {solved ? (
                    <p>
                      <span className="font-bold text-good">{t("quiz.correct")}</span> {ct(question.why)}
                    </p>
                  ) : lastWrong ? (
                    <p className="font-bold text-bad">{t("quiz.wrong")}</p>
                  ) : null}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>
      {finished ? (
        <div className="flex flex-wrap items-center gap-3" role="status">
          <span className="text-sm font-bold tabular-nums">{t("quiz.score", { score, total })}</span>
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "quiz/reset", quiz: quiz.id })}>
            {t("quiz.reset")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
