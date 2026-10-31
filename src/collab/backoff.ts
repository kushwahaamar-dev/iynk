const STEPS_MS = [500, 1000, 2000, 4000, 8000] as const;
const LONG_MS = 15000;
const HIDDEN_MS = 30000;

/** Reconnect delay for the given attempt (0 is the first retry), jittered by +-30 percent. */
export function backoffMs(attempt: number, rand: () => number, hidden: boolean): number {
  const base = hidden ? HIDDEN_MS : (STEPS_MS[attempt] ?? LONG_MS);
  return Math.round(base * (1 + (rand() * 0.6 - 0.3)));
}
