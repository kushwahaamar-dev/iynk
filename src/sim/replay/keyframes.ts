import type { SimTime } from "../core/clock.ts";
import type { OrchestratorSnapshot } from "../engine.ts";

export const KEYFRAME_NS = 10_000_000_000;
export const KEYFRAME_MAX = 64;

export interface KeyframeEntry {
  snapshot: OrchestratorSnapshot;
  /** Per interpreter engine id, the statement count at the cut. */
  statements: Record<string, number>;
}

export interface Keyframes {
  /** Kept only when it lies a keyframe interval after the last one added; the oldest goes past `KEYFRAME_MAX`. */
  add(s: OrchestratorSnapshot, statements: Record<string, number>): void;
  /** The keyframe closest to `at`, the earlier one on a tie. */
  nearest(at: SimTime): KeyframeEntry | null;
  size(): number;
}

export function createKeyframes(): Keyframes {
  const kept: KeyframeEntry[] = [];
  let lastAt = -Infinity;
  return {
    add(snapshot, statements) {
      if (snapshot.at - lastAt < KEYFRAME_NS) return;
      lastAt = snapshot.at;
      kept.push({ snapshot, statements });
      if (kept.length > KEYFRAME_MAX) kept.shift();
    },
    nearest(at) {
      let best: KeyframeEntry | null = null;
      for (const k of kept) {
        if (best === null || Math.abs(k.snapshot.at - at) < Math.abs(best.snapshot.at - at)) best = k;
      }
      return best;
    },
    size: () => kept.length,
  };
}

/** Statements to replay from 0 to `at`, at the rate measured up to the keyframe. 0 when there is nothing to measure. */
export function estimateWork(k: KeyframeEntry | null, at: SimTime): number {
  if (k === null || k.snapshot.at <= 0) return 0;
  const measured = Object.values(k.statements).reduce((sum, n) => sum + n, 0);
  return Math.ceil((measured * at) / k.snapshot.at);
}
