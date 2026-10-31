import type { Op, Placement } from "../../project/generated/types.ts";

export type AlignKind = "left" | "right" | "top" | "bottom" | "centerH" | "centerV";
export type DistributeAxis = "horizontal" | "vertical";

/** The drawn box of a placed part in view millimetres: top left corner and size. */
export interface Box {
  c: string;
  x_mm: number;
  y_mm: number;
  w_mm: number;
  h_mm: number;
}

const EPS = 1e-6;
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** One `view.place` per box that has to move by `dx`, `dy`, keeping the rest of its placement (rotation, legs). */
function shifts(view: string, boxes: readonly Box[], placements: readonly Placement[], delta: (box: Box, i: number) => [number, number]): Op[] {
  const byPart = new Map(placements.map((p) => [p.c, p]));
  const ops: Op[] = [];
  boxes.forEach((box, i) => {
    const placement = byPart.get(box.c);
    const [dx, dy] = delta(box, i);
    if (!placement || (Math.abs(dx) < EPS && Math.abs(dy) < EPS)) return;
    ops.push({ k: "view.place", view, placement: { ...placement, x_mm: round2(placement.x_mm + dx), y_mm: round2(placement.y_mm + dy) } });
  });
  return ops;
}

export function alignOps(view: string, boxes: readonly Box[], placements: readonly Placement[], kind: AlignKind): Op[] {
  if (boxes.length < 2) return [];
  const left = Math.min(...boxes.map((b) => b.x_mm));
  const right = Math.max(...boxes.map((b) => b.x_mm + b.w_mm));
  const top = Math.min(...boxes.map((b) => b.y_mm));
  const bottom = Math.max(...boxes.map((b) => b.y_mm + b.h_mm));
  const midX = boxes.reduce((sum, b) => sum + b.x_mm + b.w_mm / 2, 0) / boxes.length;
  const midY = boxes.reduce((sum, b) => sum + b.y_mm + b.h_mm / 2, 0) / boxes.length;
  switch (kind) {
    case "left":
      return shifts(view, boxes, placements, (b) => [left - b.x_mm, 0]);
    case "right":
      return shifts(view, boxes, placements, (b) => [right - (b.x_mm + b.w_mm), 0]);
    case "top":
      return shifts(view, boxes, placements, (b) => [0, top - b.y_mm]);
    case "bottom":
      return shifts(view, boxes, placements, (b) => [0, bottom - (b.y_mm + b.h_mm)]);
    case "centerH":
      return shifts(view, boxes, placements, (b) => [midX - (b.x_mm + b.w_mm / 2), 0]);
    case "centerV":
      return shifts(view, boxes, placements, (b) => [0, midY - (b.y_mm + b.h_mm / 2)]);
  }
}

/** Keeps the outermost two where they are and spaces the others so the gaps between neighbouring edges are equal. */
export function distributeOps(
  view: string,
  boxes: readonly Box[],
  placements: readonly Placement[],
  axis: DistributeAxis,
): Op[] | { error: "need-three" } {
  if (boxes.length < 3) return { error: "need-three" };
  const horizontal = axis === "horizontal";
  const start = (b: Box): number => (horizontal ? b.x_mm : b.y_mm);
  const size = (b: Box): number => (horizontal ? b.w_mm : b.h_mm);
  const sorted = [...boxes].sort((a, b) => start(a) + size(a) / 2 - (start(b) + size(b) / 2));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const free = start(last) + size(last) - start(first) - sorted.reduce((sum, b) => sum + size(b), 0);
  const gap = free / (sorted.length - 1);

  const target = new Map<string, number>();
  let edge = start(first);
  for (const box of sorted) {
    target.set(box.c, edge);
    edge += size(box) + gap;
  }
  return shifts(view, boxes, placements, (b) => {
    const d = target.get(b.c)! - start(b);
    return horizontal ? [d, 0] : [0, d];
  });
}
