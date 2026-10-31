import type { LearnStore } from "@/local/learn-store";
import { emptyRecord, withCompletion, type Tier } from "@/project/guided/record";

/** A bench is complete when every step is done and every quiz is taken. */
export function benchComplete(c: { stepsDone: number; steps: number; quizzesTaken: number; quizzes: number }): boolean {
  return c.stepsDone >= c.steps && c.quizzesTaken >= c.quizzes;
}

/** A craft is complete when it is built, every bench test passed and one course is finished. */
export function craftComplete(c: { built: boolean; testsPassed: number; tests: number; courses: number }): boolean {
  return c.built && c.testsPassed >= c.tests && c.courses >= 1;
}

/** Stamps the completion once; returns false when the record already has one. `at` is passed in so nothing here reads a clock. */
export function completeLab(
  store: LearnStore,
  projectId: string,
  kind: "bench" | "craft",
  at: string,
  tier: Tier,
): boolean {
  if (store.get(projectId)?.completion) return false;
  const gates =
    kind === "bench"
      ? { checks: null, edit: null, quiz: true, goal: true }
      : { checks: true, edit: null, quiz: null, goal: true };
  store.update(
    projectId,
    (record) =>
      record?.completion
        ? record
        : withCompletion(record ?? emptyRecord(projectId, at), { gates, tier, sourceSha256: "", hintsMax: 0, engineVersions: {}, legacy: false }, at),
    at,
  );
  return true;
}
