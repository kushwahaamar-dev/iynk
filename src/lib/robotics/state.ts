// Reading the figure's reported state (docs/FIGURES-BENCH.md §13) by dot path.

import type { FigureState, StateCond } from "@/content/schema";

/** The value at a dot path ("rails.5V", "meas.D1.i_mA"), or undefined. */
export function valueAt(state: FigureState, path: string): unknown {
  if (path in state) return state[path];
  let node: unknown = state;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** True when every path in the condition equals its value. An empty condition never holds. */
export function condHolds(cond: StateCond, state: FigureState): boolean {
  const entries = Object.entries(cond);
  if (entries.length === 0) return false;
  return entries.every(([path, want]) => {
    const got = valueAt(state, path);
    if (want === null) return got === null || got === undefined;
    return got === want;
  });
}

/** A numeric reading: numbers as they are, booleans as 1/0, anything else NaN. */
export function numberAt(state: FigureState, path: string): number {
  const value = valueAt(state, path);
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return Number.NaN;
}
