// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildDrawList } from "../engine/draw-list.ts";
import { miniProject, resolveShape, stubArt, VIEW_ID } from "../engine/testing/mini-scene.ts";
import { selectInRect } from "./select.ts";

const state = miniProject(500, 0);
const { scene } = buildDrawList({
  state,
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

describe("marquee budget", () => {
  it("selects over 500 parts in under 2 ms", () => {
    const everything = { x0: -1e4, y0: -1e4, x1: 1e4, y1: 1e4 };
    expect(selectInRect(scene, everything, "touch", { id: VIEW_ID }).length).toBeGreaterThan(100);
    expect(medianMs(() => selectInRect(scene, everything, "touch", { id: VIEW_ID }), 9, 50)).toBeLessThan(2);
  });
});
