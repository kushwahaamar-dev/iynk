import { describe, expect, it } from "vitest";
import type { Project } from "../../project/generated/types.ts";
import { buildDrawList, linearIndex } from "./draw-list.ts";
import type { DrawListInput } from "./draw-list.ts";
import { miniProject, resolveShape, stubArt, UNKNOWN_DEF, VIEW_ID } from "./testing/mini-scene.ts";
import type { Viewport } from "./types.ts";

const WIDE: Viewport = { cx_mm: 90, cy_mm: 10, k: 4, w: 1000, h: 400, dpr: 1 };
const NEAR: Viewport = { ...WIDE, cx_mm: 5, cy_mm: 1.5 };

function input(state: Project, over: Partial<DrawListInput> = {}): DrawListInput {
  return { state, viewId: VIEW_ID, viewport: WIDE, art: stubArt, resolve: resolveShape, index: null, prev: null, mode: "illustrated", overlays: [], ...over };
}

const lodOf = (items: readonly { id: string; lod: number }[], id: string) => items.find((i) => i.id === id)?.lod;

describe("buildDrawList", () => {
  it("draws every part and wire of a small scene in view", () => {
    const { scene } = buildDrawList(input(miniProject()));
    expect(scene.items.filter((i) => i.kind === "part")).toHaveLength(20);
    expect(scene.items.filter((i) => i.kind === "wire")).toHaveLength(30);
    expect(scene.stats).toMatchObject({ items: 50, culled: 0, dropped: 0 });
  });

  it("culls items far outside the viewport but keeps their targets", () => {
    const far: Viewport = { ...WIDE, cx_mm: 0, cy_mm: 0, k: 4, w: 200, h: 100 };
    const { scene } = buildDrawList(input(miniProject(), { viewport: far }));
    const ids = new Set(scene.items.map((i) => i.id));
    expect(ids.has("cmp_0")).toBe(true);
    expect(ids.has("cmp_9")).toBe(false);
    expect(scene.stats.culled).toBeGreaterThan(0);
    expect(scene.targets.some((t) => t.hit.kind === "pin" && t.hit.c === "cmp_9")).toBe(true);
  });

  it("gives a 20 px part level 0 with no pin elements, and keeps its pins hit-testable", () => {
    const tiny: Viewport = { ...WIDE, k: 2 };
    const { scene } = buildDrawList(input(miniProject(), { viewport: tiny }));
    const item = scene.items.find((i) => i.id === "cmp_0")!;
    expect(item.lod).toBe(0);
    expect(item.elements).toHaveLength(1);
    expect(scene.targets.filter((t) => t.hit.kind === "pin" && t.hit.c === "cmp_0")).toHaveLength(2);
    expect(scene.index.pick({ x: 0, y: 1.5 }, 0.2)).toEqual({ kind: "pin", c: "cmp_0", p: "1" });
  });

  it("adds pin dots and a refdes at level 1, full art at level 2", () => {
    const mid = buildDrawList(input(miniProject(), { viewport: { ...WIDE, k: 6 } })).scene.items.find((i) => i.id === "cmp_0")!;
    expect(mid.lod).toBe(1);
    expect(mid.elements.filter((e) => e.t === "circle")).toHaveLength(2);
    expect(mid.elements.some((e) => e.t === "text" && e.s === "R1")).toBe(true);
    const big = buildDrawList(input(miniProject(), { viewport: { ...NEAR, k: 20 } })).scene.items.find((i) => i.id === "cmp_0")!;
    expect(big.lod).toBe(2);
    expect(big.elements.filter((e) => e.t === "rect")).toHaveLength(12);
  });

  it("uses level 1 art in simple mode even when large", () => {
    const { scene } = buildDrawList(input(miniProject(), { viewport: { ...NEAR, k: 20 }, mode: "simple" }));
    expect(lodOf(scene.items, "cmp_0")).toBe(1);
  });

  it("falls back to level 1 for the parts farthest from the centre when the budget runs out", () => {
    const view: Viewport = { ...WIDE, cx_mm: 0, cy_mm: 1.5, k: 20, w: 4000, h: 400 };
    const { scene } = buildDrawList(input(miniProject(), { viewport: view, budget: 80 }));
    const parts = scene.items.filter((i) => i.kind === "part");
    expect(lodOf(parts, "cmp_0")).toBe(2);
    expect(parts.some((p) => p.lod === 1)).toBe(true);
    expect(lodOf(parts, "cmp_9")).toBe(1);
    expect(scene.stats.lod[2] + scene.stats.lod[1]).toBe(20);
  });

  it("holds the element budget with the 500-part fixture", () => {
    const big = miniProject(500, 1000);
    const { scene } = buildDrawList(input(big, { viewport: { cx_mm: 190, cy_mm: 500, k: 12, w: 3000, h: 3000, dpr: 1 } }));
    expect(scene.stats.elements).toBeLessThanOrEqual(10_000 + 12);
  });

  it("ignores the budget when a level is forced", () => {
    const { scene } = buildDrawList(input(miniProject(), { budget: 1, forceLod: 2 }));
    expect(scene.items.filter((i) => i.kind === "part").every((i) => i.lod === 2)).toBe(true);
  });

  it("draws a part with no descriptor as an unknown box", () => {
    const p = miniProject(1, 0);
    p.components[0]!.definition.ref = UNKNOWN_DEF;
    const item = buildDrawList(input(p)).scene.items.find((i) => i.id === "cmp_0")!;
    expect(item.elements.some((e) => e.t === "text" && e.s === "?")).toBe(true);
    expect(item.elements.some((e) => e.t === "rect" && e.stroke === "var(--studio-warn)")).toBe(true);
  });

  it("gives a zero-size part a 1 mm box", () => {
    const { scene } = buildDrawList(input(miniProject(1, 0), { resolve: () => ({ widthMm: 0, heightMm: 0, pins: [], known: true }) }));
    expect(scene.items[0]!.bbox).toEqual({ x0: 0, y0: 0, x1: 1, y1: 1 });
  });

  it("rotates the bbox and pins about the placement", () => {
    const p = miniProject(1, 0);
    p.views[0]!.placements[0]!.rotation_deg = 90;
    const { scene } = buildDrawList(input(p));
    expect(scene.items[0]!.rotation).toBe(90);
    expect(scene.items[0]!.bbox).toEqual({ x0: 0, y0: -10, x1: 3, y1: 0 });
    const pin2 = scene.targets.find((t) => t.hit.kind === "pin" && t.hit.p === "2")!;
    expect(pin2.bbox.y0 + 0.5).toBeCloseTo(-10);
  });

  it("drops NaN positions and wires with unresolved ends, and counts them", () => {
    const p = miniProject(3, 2);
    p.views[0]!.placements[2]!.x_mm = Number.NaN;
    const { scene } = buildDrawList(input(p));
    expect(scene.items.some((i) => i.id === "cmp_2")).toBe(false);
    expect(scene.stats.dropped).toBe(2);
  });

  it("routes a wire with an elbow when it has no route", () => {
    const { scene } = buildDrawList(input(miniProject(2, 1)));
    const wire = scene.items.find((i) => i.id === "wir_0")!;
    expect(wire.elements[0]).toMatchObject({ t: "path", d: "M10 1.5L20 1.5" });
    const bent = miniProject(12, 1);
    bent.views[0]!.wires[0]!.to = { kind: "pin", c: "cmp_10", p: "1" };
    const elbow = buildDrawList(input(bent)).scene.items.find((i) => i.id === "wir_0")!;
    expect(elbow.elements[0]).toMatchObject({ d: "M10 1.5L0 1.5L0 21.5" });
  });

  it("is stable for equal input", () => {
    const state = miniProject();
    const a = buildDrawList(input(state)).scene;
    const b = buildDrawList(input(state)).scene;
    expect(b.items).toEqual(a.items);
    expect(b.targets).toEqual(a.targets);
  });

  it("reports an empty diff for an unchanged scene and one change after a part moves", () => {
    const state = miniProject();
    const first = buildDrawList(input(state));
    expect(first.diff.added).toHaveLength(50);
    const same = buildDrawList(input(state, { prev: first.scene }));
    expect(same.diff).toEqual({ added: [], changed: [], removed: [] });

    const moved = structuredClone(state);
    moved.views[0]!.placements[0]!.x_mm += 5;
    const after = buildDrawList(input(moved, { prev: first.scene })).diff;
    expect(after.changed).toContain("cmp_0");
    expect(after.changed).toContain("wir_0");
    expect(after.changed).not.toContain("cmp_5");
    expect(after.added).toEqual([]);
    expect(after.removed).toEqual([]);
  });

  it("does not flicker a part's level across rebuilds at a threshold", () => {
    const state = miniProject(1, 0);
    let prev = buildDrawList(input(state, { viewport: { ...NEAR, k: 11.5 } })).scene;
    expect(prev.items[0]!.lod).toBe(1);
    for (const k of [12.5, 11.5, 12.8, 11.9]) {
      prev = buildDrawList(input(state, { viewport: { ...NEAR, k }, prev })).scene;
      expect(prev.items[0]!.lod).toBe(1);
    }
  });

  it("rejects an unknown view", () => {
    expect(() => buildDrawList(input(miniProject(), { viewId: "vw_nope" }))).toThrow(RangeError);
  });
});

describe("linearIndex", () => {
  const targets = [
    { item: "a", hit: { kind: "part", c: "a" } as const, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } },
    { item: "a", hit: { kind: "pin", c: "a", p: "1" } as const, bbox: { x0: 0, y0: 4, x1: 1, y1: 5 } },
    { item: "b", hit: { kind: "wire", id: "b", segment: 0 } as const, bbox: { x0: 0, y0: 4, x1: 10, y1: 5 } },
  ];
  const index = linearIndex(targets);

  it("lists each touching item once", () => {
    expect(index.query({ x0: -1, y0: -1, x1: 20, y1: 20 }).toSorted()).toEqual(["a", "b"]);
    expect(index.query({ x0: 50, y0: 50, x1: 60, y1: 60 })).toEqual([]);
  });

  it("prefers pins over wires over parts", () => {
    expect(index.pick({ x: 0.5, y: 4.5 }, 0)).toEqual({ kind: "pin", c: "a", p: "1" });
    expect(index.pick({ x: 5, y: 4.5 }, 0)).toEqual({ kind: "wire", id: "b", segment: 0 });
    expect(index.pick({ x: 5, y: 8 }, 0)).toEqual({ kind: "part", c: "a" });
  });

  it("honours the slop and returns null on empty ground", () => {
    expect(index.pick({ x: 12, y: 5 }, 3)).not.toBeNull();
    expect(index.pick({ x: 30, y: 30 }, 1)).toBeNull();
  });
});
