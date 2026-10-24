"use client";

import { useMemo, useSyncExternalStore } from "react";
import { count, countKeys, type Count } from "./progress";
import { getSaved, getServerSaved, subscribeSaved, type QuizResult, type Saved } from "./storage";

/**
 * The saved document. The server and the first client render see "nothing
 * saved", then React re-renders with what this browser stored, so static
 * pages hydrate without a mismatch.
 */
export function useSaved(): Saved {
  return useSyncExternalStore(subscribeSaved, getSaved, getServerSaved);
}

export function useDone(key: string): boolean {
  return useSaved().done[key] === true;
}

export function useCount(prefix: string, total: number): Count {
  const saved = useSaved();
  return useMemo(() => count(prefix, total, saved), [prefix, total, saved]);
}

export function useCountKeys(keys: readonly string[]): Count {
  const saved = useSaved();
  return useMemo(() => countKeys(keys, saved), [keys, saved]);
}

export function useQuiz(key: string): QuizResult | undefined {
  return useSaved().quiz[key];
}

export function useBest(key: string): number | undefined {
  return useSaved().best[key];
}
