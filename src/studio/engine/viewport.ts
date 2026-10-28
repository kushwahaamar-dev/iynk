import { ZOOM_MAX, ZOOM_MIN } from "./constants.ts";
import type { PointMm, RectMm, Viewport } from "./types.ts";

export const clampZoom = (k: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, k));

/** Document millimetres to canvas pixels: `px = (mm - c) * k + size / 2`. */
export function mmToPx(v: Viewport, p: PointMm): PointMm {
  return { x: (p.x - v.cx_mm) * v.k + v.w / 2, y: (p.y - v.cy_mm) * v.k + v.h / 2 };
}

export function pxToMm(v: Viewport, p: PointMm): PointMm {
  return { x: v.cx_mm + (p.x - v.w / 2) / v.k, y: v.cy_mm + (p.y - v.h / 2) / v.k };
}

/** Scales by `factor` (clamped to the zoom range) and keeps the point under `anchorPx` where it was. */
export function zoomAround(v: Viewport, factor: number, anchorPx: PointMm): Viewport {
  const k = clampZoom(v.k * factor);
  const under = pxToMm(v, anchorPx);
  return { ...v, k, cx_mm: under.x - (anchorPx.x - v.w / 2) / k, cy_mm: under.y - (anchorPx.y - v.h / 2) / k };
}

/** Moves the content by `dxPx`, `dyPx` on screen, as a drag does. */
export function panBy(v: Viewport, dxPx: number, dyPx: number): Viewport {
  return { ...v, cx_mm: v.cx_mm - dxPx / v.k, cy_mm: v.cy_mm - dyPx / v.k };
}

/** Centres `r` and zooms until it fills the canvas less `marginPx` on each side. A canvas with no room is left alone. */
export function fitRect(v: Viewport, r: RectMm, marginPx: number): Viewport {
  const roomW = v.w - 2 * marginPx;
  const roomH = v.h - 2 * marginPx;
  if (roomW <= 0 || roomH <= 0) return v;
  const k = clampZoom(Math.min(roomW / (r.x1 - r.x0), roomH / (r.y1 - r.y0)));
  return { ...v, k, cx_mm: (r.x0 + r.x1) / 2, cy_mm: (r.y0 + r.y1) / 2 };
}
