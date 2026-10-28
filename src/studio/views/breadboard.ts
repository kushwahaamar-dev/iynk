import type { EntityId, EntityPrefix } from "../../core/ids.ts";
import type { Op } from "../../project/generated/types.ts";
import type { Descriptor } from "../../parts/descriptor.ts";
import { interfaceOf } from "../../parts/pins.ts";
import type { PartRegistry } from "../../parts/registry.ts";
import { PIN_RADIUS_MM } from "../engine/constants.ts";
import type { DrawItem, LodLevel, PointMm, RectMm, Rotation, Viewport } from "../engine/types.ts";

export const BREADBOARD_REF = "core.breadboard-half";
const BREADBOARD_VIEW = "vw_bb";
const BREADBOARD_REFDES = "BB1";
const HOLE_PITCH_MM = 2.54;
const MIN_HOLE_SPACING_PX = 8;
const Z_HOLES = 1;
const EPS = 1e-6;

/** A hole in the surface frame: origin top-left, x right, y down, like the art. */
export type HoleGeom = { hole: string; xMm: number; yMm: number; strip: string };

export type SurfaceGeom = {
  widthMm: number;
  heightMm: number;
  holes: readonly HoleGeom[];
  byName: ReadonlyMap<string, HoleGeom>;
  strips: ReadonlyMap<string, readonly HoleGeom[]>;
  cells: ReadonlyMap<string, readonly HoleGeom[]>;
};

export type IdSource = <P extends EntityPrefix>(prefix: P) => EntityId<P>;

const cellKey = (cx: number, cy: number): string => `${cx},${cy}`;
const cellOf = (v: number): number => Math.floor(v / HOLE_PITCH_MM);
const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * The holes of a surface part. A descriptor stores pin positions bottom-left with +y up; this module flips them to
 * the y-down frame of the art, so a hole drawn at `xMm`, `yMm` is the one a pointer lands on.
 */
export function holesOf(desc: Descriptor): HoleGeom[] {
  const height = desc.dimensions?.body?.h ?? 0;
  const stripOfPin = new Map<string, string>();
  for (const g of desc.groups ?? []) {
    if (g.kind !== "strip") continue;
    for (const p of g.pins) stripOfPin.set(p, g.id);
  }
  const holes: HoleGeom[] = [];
  for (const pin of desc.pins) {
    const strip = stripOfPin.get(pin.id);
    if (!pin.position || strip === undefined) continue;
    holes.push({ hole: pin.id, xMm: pin.position.x, yMm: round2(height - pin.position.y), strip });
  }
  return holes;
}

export function surfaceGeom(desc: Descriptor): SurfaceGeom {
  const holes = holesOf(desc);
  const byName = new Map<string, HoleGeom>();
  const strips = new Map<string, HoleGeom[]>();
  const cells = new Map<string, HoleGeom[]>();
  for (const h of holes) {
    byName.set(h.hole, h);
    const inStrip = strips.get(h.strip);
    if (inStrip) inStrip.push(h);
    else strips.set(h.strip, [h]);
    const key = cellKey(cellOf(h.xMm), cellOf(h.yMm));
    const inCell = cells.get(key);
    if (inCell) inCell.push(h);
    else cells.set(key, [h]);
  }
  return { widthMm: desc.dimensions?.body?.w ?? 0, heightMm: desc.dimensions?.body?.h ?? 0, holes, byName, strips, cells };
}

/** The hole nearest to `p` (surface frame) within `maxMm`, or null. Looks at the few cells around `p`, so it does not grow with the hole count. */
export function holeAt(surface: SurfaceGeom, p: PointMm, maxMm: number): string | null {
  const reach = Math.ceil(maxMm / HOLE_PITCH_MM);
  const cx = cellOf(p.x);
  const cy = cellOf(p.y);
  let best: HoleGeom | null = null;
  let bestDistance = maxMm + EPS;
  for (let dx = -reach; dx <= reach; dx++) {
    for (let dy = -reach; dy <= reach; dy++) {
      for (const h of surface.cells.get(cellKey(cx + dx, cy + dy)) ?? []) {
        const d = Math.hypot(h.xMm - p.x, h.yMm - p.y);
        if (d < bestDistance) {
          best = h;
          bestDistance = d;
        }
      }
    }
  }
  return best?.hole ?? null;
}

export function stripOf(surface: SurfaceGeom, hole: string): string {
  const geom = surface.byName.get(hole);
  if (!geom) throw new RangeError(`no hole ${hole} on this surface`);
  return geom.strip;
}

/** The other holes of the strip the hole is in, in descriptor order. An unknown hole has none. */
export function stripPeers(surface: SurfaceGeom, hole: string): string[] {
  const geom = surface.byName.get(hole);
  if (!geom) return [];
  return (surface.strips.get(geom.strip) ?? []).filter((h) => h.hole !== hole).map((h) => h.hole);
}

function rotate(p: PointMm, rotation: Rotation): PointMm {
  switch (rotation) {
    case 90:
      return { x: p.y, y: -p.x };
    case 180:
      return { x: -p.x, y: -p.y };
    case 270:
      return { x: -p.y, y: p.x };
    default:
      return p;
  }
}

/**
 * The hole under each leg when the part sits at `origin` (surface frame) turned by `rotation`, or null when a leg is
 * more than half a pitch from a hole or two legs land in one hole.
 */
export function legsFit(
  surface: SurfaceGeom,
  legOffsetsMm: Record<string, PointMm>,
  origin: PointMm,
  rotation: Rotation,
): Record<string, string> | null {
  const fit: Record<string, string> = {};
  const taken = new Set<string>();
  for (const [leg, offset] of Object.entries(legOffsetsMm)) {
    const turned = rotate(offset, rotation);
    const hole = holeAt(surface, { x: origin.x + turned.x, y: origin.y + turned.y }, HOLE_PITCH_MM / 2);
    if (hole === null || taken.has(hole)) return null;
    taken.add(hole);
    fit[leg] = hole;
  }
  return fit;
}

/**
 * Hole dots, one draw item per strip, for the strips that touch the viewport. Nothing is drawn at level 0 or while
 * the holes are less than 8 px apart. `at` is where the surface sits in the view.
 */
export function surfaceDrawItems(
  surface: SurfaceGeom,
  viewport: Viewport,
  lod: LodLevel,
  at: { id: string; xMm: number; yMm: number },
): DrawItem[] {
  if (lod === 0 || HOLE_PITCH_MM * viewport.k <= MIN_HOLE_SPACING_PX) return [];
  const halfW = viewport.w / viewport.k / 2;
  const halfH = viewport.h / viewport.k / 2;
  const seen: RectMm = { x0: viewport.cx_mm - halfW, y0: viewport.cy_mm - halfH, x1: viewport.cx_mm + halfW, y1: viewport.cy_mm + halfH };
  const items: DrawItem[] = [];
  for (const [strip, holes] of surface.strips) {
    const bbox: RectMm = {
      x0: at.xMm + Math.min(...holes.map((h) => h.xMm)) - PIN_RADIUS_MM,
      y0: at.yMm + Math.min(...holes.map((h) => h.yMm)) - PIN_RADIUS_MM,
      x1: at.xMm + Math.max(...holes.map((h) => h.xMm)) + PIN_RADIUS_MM,
      y1: at.yMm + Math.max(...holes.map((h) => h.yMm)) + PIN_RADIUS_MM,
    };
    if (bbox.x1 < seen.x0 || bbox.x0 > seen.x1 || bbox.y1 < seen.y0 || bbox.y0 > seen.y1) continue;
    items.push({
      id: `${at.id}/${strip}`,
      kind: "hole",
      z: Z_HOLES,
      lod,
      xMm: at.xMm,
      yMm: at.yMm,
      rotation: 0,
      bbox,
      elements: holes.map((h) => ({ t: "circle", cx: h.xMm, cy: h.yMm, r: PIN_RADIUS_MM, fill: "var(--studio-pin)" })),
      title: `strip ${strip}`,
    });
  }
  return items;
}

/**
 * The one place that adds a breadboard to a project: pins the part's interface, adds it as BB1, makes it the surface
 * of the breadboard view and places it at `at`.
 */
export function breadboardBatch(registry: PartRegistry, ids: IdSource, at: PointMm): { batch: Op[]; component: string } {
  const desc = registry.latest(BREADBOARD_REF);
  if (!desc) throw new Error(`${BREADBOARD_REF} is not in the registry`);
  const component = ids("cmp");
  const batch: Op[] = [
    { k: "dep.set", dependency: { ref: desc.id, version: desc.version, origin: "builtin", interface: interfaceOf(desc) } },
    { k: "component.add", component: { id: component, definition: { ref: desc.id, version: desc.version }, refdes: BREADBOARD_REFDES } },
    { k: "view.set", id: BREADBOARD_VIEW, surface: component },
    { k: "view.place", view: BREADBOARD_VIEW, placement: { c: component, x_mm: at.x, y_mm: at.y } },
  ];
  return { batch, component };
}
