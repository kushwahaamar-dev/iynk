import { describe, expect, it } from "vitest";
import { LOD_HYSTERESIS, LOD_LARGE_PX, LOD_SMALL_PX } from "./constants.ts";
import { chooseLod } from "./lod.ts";
import type { LodLevel } from "./types.ts";

describe("chooseLod", () => {
  it("uses the plain thresholds with no previous level", () => {
    expect(chooseLod(undefined, 20)).toBe(0);
    expect(chooseLod(undefined, LOD_SMALL_PX)).toBe(1);
    expect(chooseLod(undefined, LOD_LARGE_PX)).toBe(1);
    expect(chooseLod(undefined, LOD_LARGE_PX + 1)).toBe(2);
  });

  it("moves up only after crossing a threshold by the hysteresis", () => {
    expect(chooseLod(0, LOD_SMALL_PX * (1 + LOD_HYSTERESIS) - 0.1)).toBe(0);
    expect(chooseLod(0, LOD_SMALL_PX * (1 + LOD_HYSTERESIS) + 0.1)).toBe(1);
    expect(chooseLod(1, LOD_LARGE_PX * (1 + LOD_HYSTERESIS) - 0.1)).toBe(1);
    expect(chooseLod(1, LOD_LARGE_PX * (1 + LOD_HYSTERESIS) + 0.1)).toBe(2);
  });

  it("moves down only after crossing a threshold by the hysteresis", () => {
    expect(chooseLod(2, LOD_LARGE_PX * (1 - LOD_HYSTERESIS) + 0.1)).toBe(2);
    expect(chooseLod(2, LOD_LARGE_PX * (1 - LOD_HYSTERESIS) - 0.1)).toBe(1);
    expect(chooseLod(1, LOD_SMALL_PX * (1 - LOD_HYSTERESIS) + 0.1)).toBe(1);
    expect(chooseLod(1, LOD_SMALL_PX * (1 - LOD_HYSTERESIS) - 0.1)).toBe(0);
  });

  it("can skip a level on a jump", () => {
    expect(chooseLod(0, 500)).toBe(2);
    expect(chooseLod(2, 1)).toBe(0);
  });

  it("changes level once per crossing over a 200-step zoom sweep, in and out", () => {
    const sizes = Array.from({ length: 200 }, (_, i) => 10 * Math.pow(300 / 10, i / 199));
    for (const sweep of [sizes, [...sizes].reverse()]) {
      let level: LodLevel | undefined;
      let changes = 0;
      for (const s of sweep) {
        const next = chooseLod(level, s);
        if (level !== undefined && next !== level) changes++;
        level = next;
      }
      expect(changes).toBe(2);
    }
  });

  it("does not flicker when the size jitters around a threshold", () => {
    let level = chooseLod(undefined, LOD_LARGE_PX - 5);
    for (let i = 0; i < 50; i++) {
      const next = chooseLod(level, LOD_LARGE_PX + (i % 2 ? 4 : -4));
      expect(next).toBe(level);
      level = next;
    }
  });
});
