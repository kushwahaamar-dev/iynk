// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ZOOM_MAX, ZOOM_MIN } from "./constants.ts";
import type { Viewport } from "./types.ts";
import { fitRect, mmToPx, panBy, pxToMm, zoomAround } from "./viewport.ts";

const V: Viewport = { cx_mm: 30, cy_mm: -12, k: 4, w: 800, h: 600, dpr: 1 };

describe("viewport math", () => {
  it("maps the centre to the middle of the canvas", () => {
    expect(mmToPx(V, { x: 30, y: -12 })).toEqual({ x: 400, y: 300 });
  });

  it("round trips mm to px and back", () => {
    for (const p of [{ x: 0, y: 0 }, { x: -999.5, y: 4321.25 }, { x: 30.001, y: -12.002 }]) {
      const back = pxToMm(V, mmToPx(V, p));
      expect(back.x).toBeCloseTo(p.x, 9);
      expect(back.y).toBeCloseTo(p.y, 9);
    }
  });

  it("keeps the point under the anchor fixed within 0.01 mm over a zoom sweep", () => {
    let v = V;
    const anchor = { x: 123, y: 457 };
    const under = pxToMm(v, anchor);
    for (const factor of [1.25, 1.25, 0.8, 0.5, 3, 0.1, 1.1]) {
      v = zoomAround(v, factor, anchor);
      const now = pxToMm(v, anchor);
      expect(Math.abs(now.x - under.x)).toBeLessThan(0.01);
      expect(Math.abs(now.y - under.y)).toBeLessThan(0.01);
    }
  });

  it("clamps zoom to the range and then holds the anchor at the clamp", () => {
    expect(zoomAround(V, 1e6, { x: 0, y: 0 }).k).toBe(ZOOM_MAX);
    const low = zoomAround(V, 1e-6, { x: 10, y: 10 });
    expect(low.k).toBe(ZOOM_MIN);
    expect(pxToMm(low, { x: 10, y: 10 }).x).toBeCloseTo(pxToMm(V, { x: 10, y: 10 }).x, 9);
  });

  it("pans so the content follows the drag", () => {
    const moved = panBy(V, 40, -20);
    const p = { x: 30, y: -12 };
    const before = mmToPx(V, p);
    const after = mmToPx(moved, p);
    expect(after.x - before.x).toBeCloseTo(40, 9);
    expect(after.y - before.y).toBeCloseTo(-20, 9);
  });

  it("fits a rectangle centred with the margin on every side", () => {
    const fitted = fitRect(V, { x0: 0, y0: 0, x1: 100, y1: 50 }, 40);
    expect(fitted.k).toBeCloseTo(7.2, 9);
    expect(mmToPx(fitted, { x: 0, y: 25 }).x).toBeCloseTo(40, 9);
    expect(mmToPx(fitted, { x: 100, y: 25 }).x).toBeCloseTo(760, 9);
    expect(mmToPx(fitted, { x: 50, y: 25 }).y).toBeCloseTo(300, 9);
  });

  it("clamps a fit on a point or a huge rectangle", () => {
    expect(fitRect(V, { x0: 5, y0: 5, x1: 5, y1: 5 }, 10).k).toBe(ZOOM_MAX);
    expect(fitRect(V, { x0: 0, y0: 0, x1: 1e7, y1: 1e7 }, 10).k).toBe(ZOOM_MIN);
  });

  it("leaves a canvas with no room alone", () => {
    const empty = { ...V, w: 0, h: 0 };
    expect(fitRect(empty, { x0: 0, y0: 0, x1: 10, y1: 10 }, 10)).toBe(empty);
  });
});
