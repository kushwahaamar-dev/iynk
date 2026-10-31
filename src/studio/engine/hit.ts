import { PIN_SLOP_PX, TOUCH_TARGET_PX } from "./constants.ts";
import { pxToMm } from "./viewport.ts";
import type { Hit, HitTarget, PointMm, RectMm, SpatialIndex, Viewport } from "./types.ts";

const CELL_MM = 50;
/** A target spanning more cells than this (a long wire, a big surface) is scanned every time instead of stored per cell. */
const MAX_CELLS = 256;
const CELL_OFFSET = 1 << 20;
const CELL_STRIDE = 1 << 22;

export const WIRE_SLOP_PX = 6;

const HIT_RANK: Record<Hit["kind"], number> = { pin: 0, hole: 1, handle: 2, junction: 3, label: 4, wire: 5, part: 6 };

const touches = (a: RectMm, b: RectMm): boolean => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;
const area = (r: RectMm): number => (r.x1 - r.x0) * (r.y1 - r.y0);
const cellOf = (mm: number): number => Math.floor(mm / CELL_MM);
const cellKey = (cx: number, cy: number): number => (cx + CELL_OFFSET) * CELL_STRIDE + cy + CELL_OFFSET;

type Span = { x0: number; y0: number; x1: number; y1: number };

function spanOf(r: RectMm): Span | null {
  const span = { x0: cellOf(r.x0), y0: cellOf(r.y0), x1: cellOf(r.x1), y1: cellOf(r.y1) };
  return (span.x1 - span.x0 + 1) * (span.y1 - span.y0 + 1) > MAX_CELLS ? null : span;
}

/** A uniform grid over the hit targets of one view. Answers like `linearIndex` but looks at a few cells, not all targets. */
export class GridIndex implements SpatialIndex {
  private slots: (HitTarget | null)[] = [];
  private cells = new Map<number, number[]>();
  private oversize = new Set<number>();
  private slotsOf = new Map<string, number[]>();

  constructor(targets: readonly HitTarget[] = []) {
    this.rebuild(targets);
  }

  rebuild(targets: readonly HitTarget[]): void {
    this.slots = [];
    this.cells.clear();
    this.oversize.clear();
    this.slotsOf.clear();
    for (const t of targets) this.add(t);
  }

  /** Swaps the targets of the draw items `ids` for `targets`. Replaced targets rank after the older ones when two tie. */
  update(ids: readonly string[], targets: readonly HitTarget[]): void {
    for (const id of ids) {
      for (const slot of this.slotsOf.get(id) ?? []) this.remove(slot);
      this.slotsOf.delete(id);
    }
    for (const t of targets) this.add(t);
  }

  query(rect: RectMm): readonly string[] {
    const items = new Set<string>();
    for (const slot of this.candidates(rect)) {
      const t = this.slots[slot];
      if (t && touches(t.bbox, rect)) items.add(t.item);
    }
    return [...items];
  }

  pick(p: PointMm, slopMm: number): Hit | null {
    const reach = { x0: p.x - slopMm, y0: p.y - slopMm, x1: p.x + slopMm, y1: p.y + slopMm };
    let best: HitTarget | null = null;
    for (const slot of this.candidates(reach)) {
      const t = this.slots[slot];
      if (!t || !touches(t.bbox, reach)) continue;
      if (best === null) {
        best = t;
        continue;
      }
      const dRank = HIT_RANK[t.hit.kind] - HIT_RANK[best.hit.kind];
      if (dRank < 0 || (dRank === 0 && area(t.bbox) <= area(best.bbox))) best = t;
    }
    return best?.hit ?? null;
  }

  private add(t: HitTarget): void {
    const slot = this.slots.push(t) - 1;
    const owned = this.slotsOf.get(t.item);
    if (owned) owned.push(slot);
    else this.slotsOf.set(t.item, [slot]);
    const span = spanOf(t.bbox);
    if (!span) {
      this.oversize.add(slot);
      return;
    }
    for (let cx = span.x0; cx <= span.x1; cx++) {
      for (let cy = span.y0; cy <= span.y1; cy++) {
        const key = cellKey(cx, cy);
        const list = this.cells.get(key);
        if (list) list.push(slot);
        else this.cells.set(key, [slot]);
      }
    }
  }

  private remove(slot: number): void {
    const t = this.slots[slot];
    if (!t) return;
    this.slots[slot] = null;
    this.oversize.delete(slot);
    const span = spanOf(t.bbox);
    if (!span) return;
    for (let cx = span.x0; cx <= span.x1; cx++) {
      for (let cy = span.y0; cy <= span.y1; cy++) {
        const key = cellKey(cx, cy);
        const list = this.cells.get(key)?.filter((s) => s !== slot);
        if (list && list.length > 0) this.cells.set(key, list);
        else this.cells.delete(key);
      }
    }
  }

  /** Slots of the targets that may touch `rect`, once each, in the order the targets were added. */
  private candidates(rect: RectMm): number[] {
    const found = new Set<number>(this.oversize);
    const span = spanOf(rect);
    if (!span) {
      for (let slot = 0; slot < this.slots.length; slot++) found.add(slot);
    } else {
      for (let cx = span.x0; cx <= span.x1; cx++) {
        for (let cy = span.y0; cy <= span.y1; cy++) for (const slot of this.cells.get(cellKey(cx, cy)) ?? []) found.add(slot);
      }
    }
    return [...found].sort((a, b) => a - b);
  }
}

/** Pins, holes and handles win inside the pin slop; otherwise a wire or a part body is found at the tighter wire slop. */
export function pickPin(index: SpatialIndex, p: PointMm, slopMm: number): Hit | null {
  const hit = index.pick(p, slopMm);
  return hit && (hit.kind === "pin" || hit.kind === "hole" || hit.kind === "handle") ? hit : null;
}

export const slopFor = (pointerType: "mouse" | "touch" | "pen"): number => (pointerType === "touch" ? TOUCH_TARGET_PX : PIN_SLOP_PX);

/** The target under a canvas pixel, in the order handle, pin, hole, then the rest at the wire slop. */
export function pickAt(index: SpatialIndex, v: Viewport, xPx: number, yPx: number, slopPx: number): Hit | null {
  const p = pxToMm(v, { x: xPx, y: yPx });
  return pickPin(index, p, slopPx / v.k) ?? index.pick(p, Math.min(slopPx, WIRE_SLOP_PX) / v.k);
}
