import { LOD_HYSTERESIS, LOD_LARGE_PX, LOD_SMALL_PX } from "./constants.ts";
import type { LodLevel } from "./types.ts";

const THRESHOLDS = [LOD_SMALL_PX, LOD_LARGE_PX] as const;

/** The level for a part `screenPx` wide, given the level it had last time. A threshold must be passed by `LOD_HYSTERESIS` before the level moves. */
export function chooseLod(prev: LodLevel | undefined, screenPx: number): LodLevel {
  if (prev === undefined) {
    if (screenPx < LOD_SMALL_PX) return 0;
    return screenPx <= LOD_LARGE_PX ? 1 : 2;
  }
  let level: number = prev;
  while (level < 2 && screenPx > THRESHOLDS[level]! * (1 + LOD_HYSTERESIS)) level++;
  while (level > 0 && screenPx < THRESHOLDS[level - 1]! * (1 - LOD_HYSTERESIS)) level--;
  return level as LodLevel;
}
