// Quizzes: one after each major step (Quiz.afterStep), plus an end-of-bench quiz (afterStep null).

import type { BuildStep, Quiz } from "@/content/schema";

/** Unlocked once its step is done; the end quiz once every step is done. */
export function quizUnlocked(quiz: Quiz, steps: readonly BuildStep[], isStepDone: (stepId: string) => boolean): boolean {
  if (quiz.afterStep === null) return steps.every((step) => isStepDone(step.id));
  return isStepDone(quiz.afterStep);
}

export function scoreQuiz(quiz: Quiz, answers: Readonly<Record<string, number>>): { score: number; total: number } {
  const score = quiz.questions.filter((question) => answers[question.id] === question.answer).length;
  return { score, total: quiz.questions.length };
}

/** The quiz that follows a step, if any. */
export function quizAfter(quizzes: readonly Quiz[], stepId: string): Quiz | undefined {
  return quizzes.find((quiz) => quiz.afterStep === stepId);
}
