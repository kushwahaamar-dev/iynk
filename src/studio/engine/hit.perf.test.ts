// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildDrawList } from "./draw-list.ts";
import { GridIndex } from "./hit.ts";
import { miniProject, resolveShape, stubArt, VIEW_ID } from "./testing/mini-scene.ts";

const { scene } = buildDrawList({
  state: miniProject(500, 1000),
  viewId: VIEW_ID,
  viewport: { cx_mm: 100, cy_mm: 500, k: 1, w: 1200, h: 900, dpr: 1 },
  art: stubArt,
  resolve: resolveShape,
  index: null,
  prev: null,
  mode: "illustrated",
  overlays: [],
});

function medianMs(run: () => void, rounds: number, perRound: number): number {
  const times: number[] = [];
  for (let r = 0; r < rounds; r++) {
    const start = performance.now();
    for (let i = 0; i < perRound; i++) run();
    times.push((performance.now() - start) / perRound);
  }
  return times.sort((a, b) => a - b)[Math.floor(rounds / 2)]!;
}

describe("GridIndex budgets", () => {
  const grid = new GridIndex(scene.targets);

  it("picks on 500 parts and 1,000 wires in under 0.2 ms", () => {
    let n = 0;
    const ms = medianMs(() => grid.pick({ x: (n += 7.3) % 200, y: (n * 3.1) % 500 }, 12), 9, 2000);
    expect(ms).toBeLessThan(0.2);
  });

  it("updates the targets of one moved part in under 0.1 ms", () => {
    const own = scene.targets.filter((t) => t.item === "cmp_5");
    const ms = medianMs(() => grid.update(["cmp_5"], own), 9, 500);
    expect(ms).toBeLessThan(0.1);
  });
});
