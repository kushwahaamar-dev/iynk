// Saved progress (D7). The hooks are client-only ("use client" in hooks.ts);
// the key builders also work in Server Components.

export { progressKey, progressPrefix, type ProgressLab } from "./keys";
export {
  count,
  countKeys,
  getBest,
  getQuiz,
  isDone,
  markDone,
  recordBest,
  recordQuiz,
  resetProgress,
  type Count,
} from "./progress";
export { useBest, useCount, useCountKeys, useDone, useQuiz, useSaved } from "./hooks";
export { STORAGE_KEY, type QuizResult, type Saved } from "./storage";
