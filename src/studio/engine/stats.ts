export type Summary = { p50: number; p95: number; max: number; n: number };

/** Nearest rank: the smallest value that at least `p` percent of `xs` do not exceed. `p` runs from 0 to 100; no values give 0. */
export function percentile(xs: readonly number[], p: number): number {
  if (xs.length === 0) return 0;
  const sorted = xs.toSorted((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1]!;
}

export function summarise(xs: readonly number[]): Summary {
  return { p50: percentile(xs, 50), p95: percentile(xs, 95), max: percentile(xs, 100), n: xs.length };
}
