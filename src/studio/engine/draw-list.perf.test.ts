// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildDrawList } from "./draw-list.ts";
import { miniProject, resolveShape, stubArt, VIEW_ID } from "./testing/mini-scene.ts";

describe("buildDrawList speed", () => {
  it("builds 500 parts and 1,000 wires, all in view, within the ceiling", () => {
    const state = miniProject(500, 1000);
    const viewport = { cx_mm: 90, cy_mm: 500, k: 1.2, w: 1400, h: 1400, dpr: 1 };
    const build = () => buildDrawList({ state, viewId: VIEW_ID, viewport, art: stubArt, resolve: resolveShape, index: null, prev: null, mode: "illustrated", overlays: [] });
    build();
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      const { scene } = build();
      times.push(performance.now() - start);
      expect(scene.stats.items).toBe(1500);
    }
    times.sort((a, b) => a - b);
    const median = times[10]!;
    console.log(`buildDrawList 500 parts, 1000 wires: median ${median.toFixed(2)} ms`);
    expect(median).toBeLessThan(12);
  });
});
