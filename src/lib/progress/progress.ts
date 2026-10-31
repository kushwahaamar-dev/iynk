// Progress actions and reads. They touch localStorage only when called, so
// they belong in event handlers and effects of Client Components.

import { mirrorLegacyDone, resetBoardRecords } from "../learn/facade";
import { getSaved, updateSaved, type QuizResult, type Saved } from "./storage";

export type Count = { done: number; total: number };

export function markDone(key: string): void {
  updateSaved((saved) => (saved.done[key] ? saved : { ...saved, done: { ...saved.done, [key]: true } }));
  mirrorLegacyDone(key);
}

export function isDone(key: string, saved: Saved = getSaved()): boolean {
  return saved.done[key] === true;
}

/** How many entries under `prefix` are done, out of `total` (shown as "done/total"). */
export function count(prefix: string, total: number, saved: Saved = getSaved()): Count {
  let done = 0;
  for (const key in saved.done) if (key.startsWith(prefix)) done += 1;
  return { done: Math.min(done, total), total };
}

/** The same for an exact list of keys, when the item lists its lessons or steps. */
export function countKeys(keys: readonly string[], saved: Saved = getSaved()): Count {
  return { done: keys.filter((key) => saved.done[key] === true).length, total: keys.length };
}

/** Keeps the best attempt (highest share of correct answers) and returns it. */
export function recordQuiz(key: string, score: number, total: number): QuizResult {
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0 || score < 0 || score > total) {
    throw new RangeError(`recordQuiz(${key}): score ${score} of ${total} is not a valid result.`);
  }
  const result = { score, total };
  const saved = updateSaved((current) => {
    const previous = current.quiz[key];
    if (previous && previous.score / previous.total >= score / total) return current;
    return { ...current, quiz: { ...current.quiz, [key]: result } };
  });
  return saved.quiz[key] ?? result;
}

export function getQuiz(key: string, saved: Saved = getSaved()): QuizResult | undefined {
  return saved.quiz[key];
}

/**
 * Keeps the best value, where "better" says which way that is (a reaction
 * time or a lap is "lower", a score is "higher"). Returns true for a new best.
 */
export function recordBest(key: string, value: number, better: "lower" | "higher"): boolean {
  if (!Number.isFinite(value)) throw new RangeError(`recordBest(${key}): ${value} is not a number.`);
  let improved = false;
  updateSaved((current) => {
    const previous = current.best[key];
    improved = previous === undefined || (better === "lower" ? value < previous : value > previous);
    return improved ? { ...current, best: { ...current.best, [key]: value } } : current;
  });
  return improved;
}

export function getBest(key: string, saved: Saved = getSaved()): number | undefined {
  return saved.best[key];
}

/** Forgets progress, quiz results and bests under `prefix` (all of them when omitted). Settings stay. */
export function resetProgress(prefix = ""): void {
  const keep = <T>(record: Record<string, T>) =>
    Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith(prefix)));
  updateSaved((saved) => ({
    ...saved,
    done: keep(saved.done) as Record<string, true>,
    quiz: keep(saved.quiz),
    best: keep(saved.best),
  }));
  resetBoardRecords(prefix);
}
