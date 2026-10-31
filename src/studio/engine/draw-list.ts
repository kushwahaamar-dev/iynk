import type { Junction, Project as ProjectState, Wire, WireColor, WireEnd } from "../../project/generated/types.ts";
import { CULL_MARGIN_SCREENS, ELEMENT_BUDGET, PIN_RADIUS_MM } from "./constants.ts";
import { chooseLod } from "./lod.ts";
import type {
  ArtElement,
  ArtMode,
  ArtProvider,
  DrawItem,
  DrawList,
  DrawStats,
  Hit,
  HitTarget,
  LodLevel,
  Overlay,
  PointMm,
  RectMm,
  ResolvedPartShape,
  Rotation,
  Scene,
  SceneDiff,
  SpatialIndex,
  Viewport,
} from "./types.ts";

export type DrawListInput = {
  state: ProjectState;
  viewId: string;
  viewport: Viewport;
  art: ArtProvider;
  resolve: (defRef: string) => ResolvedPartShape;
  /** A prebuilt index of this view's targets, trusted as is. Null builds one from the targets found here. */
  index: SpatialIndex | null;
  prev: Scene | null;
  mode: ArtMode;
  overlays: readonly Overlay[];
  /** Art elements allowed in view before level 2 falls back to level 1. */
  budget?: number;
  /** Draws every part at this level and ignores the budget. For the perf harness only. */
  forceLod?: LodLevel;
  /** Items and targets a view definition built itself, in place of the placements and wires of the view. */
  fixed?: DrawList;
};

const Z_SURFACE = 0;
const Z_PART = 10;
const Z_PART_MAX = 89;
const Z_WIRE = 100;
const Z_LABEL = 200;
const Z_OVERLAY = 300;

const WIRE_HIT_MM = 0.4;
const LABEL_SIZE_MM = 2;

const WIRE_COLOUR: Record<WireColor, string> = {
  red: "var(--studio-wire-red)",
  black: "var(--studio-wire-black)",
  orange: "var(--studio-wire-orange)",
  yellow: "var(--studio-wire-yellow)",
  green: "var(--studio-wire-green)",
  blue: "var(--studio-wire-blue)",
  white: "var(--studio-wire-white)",
  purple: "var(--studio-wire-purple)",
  brown: "var(--studio-wire-brown)",
  grey: "var(--studio-wire-grey)",
};

const HIT_RANK: Record<Hit["kind"], number> = { pin: 0, hole: 1, handle: 2, junction: 3, label: 4, wire: 5, part: 6 };

const pinKey = (c: string, p: string): string => `${c}\u0000${p}`;
const finite = (...n: number[]): boolean => n.every(Number.isFinite);

function toRotation(deg: number | undefined): Rotation {
  const quarter = Math.round((deg ?? 0) / 90);
  return ((((quarter % 4) + 4) % 4) * 90) as Rotation;
}

/** Counter-clockwise rotation in a y-down frame. */
function rotate(x: number, y: number, rotation: Rotation): PointMm {
  switch (rotation) {
    case 90:
      return { x: y, y: -x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: -y, y: x };
    default:
      return { x, y };
  }
}

function boundsOf(points: readonly PointMm[], pad = 0): RectMm {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}

const touches = (a: RectMm, b: RectMm): boolean => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;
const area = (r: RectMm): number => (r.x1 - r.x0) * (r.y1 - r.y0);

export function linearIndex(targets: readonly HitTarget[]): SpatialIndex {
  return {
    query(rect) {
      const items = new Set<string>();
      for (const t of targets) if (touches(t.bbox, rect)) items.add(t.item);
      return [...items];
    },
    pick(p, slopMm) {
      let best: HitTarget | null = null;
      for (const t of targets) {
        const b = t.bbox;
        if (p.x < b.x0 - slopMm || p.x > b.x1 + slopMm || p.y < b.y0 - slopMm || p.y > b.y1 + slopMm) continue;
        if (best === null) {
          best = t;
          continue;
        }
        const dRank = HIT_RANK[t.hit.kind] - HIT_RANK[best.hit.kind];
        if (dRank < 0 || (dRank === 0 && area(b) <= area(best.bbox))) best = t;
      }
      return best?.hit ?? null;
    },
  };
}

function sameElement(a: ArtElement, b: ArtElement): boolean {
  if (a === b) return true;
  const ka = Object.keys(a) as (keyof ArtElement)[];
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
}

function sameItem(a: DrawItem, b: DrawItem): boolean {
  if (
    a.kind !== b.kind ||
    a.z !== b.z ||
    a.lod !== b.lod ||
    a.xMm !== b.xMm ||
    a.yMm !== b.yMm ||
    a.rotation !== b.rotation ||
    a.title !== b.title ||
    a.elements.length !== b.elements.length
  ) {
    return false;
  }
  return a.elements === b.elements || a.elements.every((e, i) => sameElement(e, b.elements[i]!));
}

type PlacedPart = {
  id: string;
  surface: boolean;
  defRef: string;
  title: string;
  refdes: string;
  shape: ResolvedPartShape;
  w: number;
  h: number;
  xMm: number;
  yMm: number;
  rotation: Rotation;
  z: number;
  bbox: RectMm;
  desired: LodLevel;
};

function outline(p: PlacedPart, stroke = "var(--studio-ink)"): ArtElement {
  return { t: "rect", x: 0, y: 0, w: p.w, h: p.h, fill: "var(--studio-body)", stroke, sw: 0.3 };
}

function unknownBox(p: PlacedPart): ArtElement[] {
  return [
    outline(p, "var(--studio-warn)"),
    { t: "text", x: p.w / 2, y: p.h / 2, s: "?", size: Math.min(p.w, p.h, 4), anchor: "middle" },
  ];
}

function partElements(p: PlacedPart, lod: LodLevel, art: ArtProvider, mode: ArtMode): ArtElement[] {
  if (lod === 0) return [outline(p)];
  const body = p.shape.known ? [...art.get(p.defRef, lod, mode)] : unknownBox(p);
  if (p.surface) return body;
  for (const pin of p.shape.pins) {
    if (!pin.mechanical) body.push({ t: "circle", cx: pin.xMm, cy: pin.yMm, r: PIN_RADIUS_MM, fill: "var(--studio-pin)" });
  }
  body.push({ t: "text", x: p.w / 2, y: -0.8, s: p.refdes, size: LABEL_SIZE_MM, anchor: "middle" });
  return body;
}

function overlayItem(o: Overlay): DrawItem {
  return {
    id: o.id,
    kind: "overlay",
    z: Z_OVERLAY,
    lod: 2,
    xMm: o.xMm,
    yMm: o.yMm,
    rotation: 0,
    bbox: { x0: o.xMm, y0: o.yMm, x1: o.xMm, y1: o.yMm },
    elements: o.elements,
    title: "",
  };
}

function routeOf(wire: Wire, from: PointMm, to: PointMm): PointMm[] {
  const waypoints = (wire.route_mm ?? []).map(([x, y]) => ({ x: x as number, y: y as number }));
  if (waypoints.length === 0 && from.x !== to.x && from.y !== to.y) waypoints.push({ x: to.x, y: from.y });
  return [from, ...waypoints, to];
}

export function buildDrawList(input: DrawListInput): { scene: Scene; diff: SceneDiff } {
  const started = performance.now();
  const { state, viewport, art, resolve, mode } = input;
  const budget = input.budget ?? ELEMENT_BUDGET;
  const view = state.views.find((v) => v.id === input.viewId);
  if (!view) throw new RangeError(`no view ${input.viewId}`);

  const prevItems = new Map<string, DrawItem>((input.prev?.viewId === view.id ? input.prev.items : []).map((i) => [i.id, i]));
  if (input.fixed) return buildFixed(input, input.fixed, prevItems, started);
  const components = new Map(state.components.map((c) => [c.id, c]));
  const shapes = new Map<string, ResolvedPartShape>();
  const shapeOf = (defRef: string): ResolvedPartShape => {
    let s = shapes.get(defRef);
    if (!s) shapes.set(defRef, (s = resolve(defRef)));
    return s;
  };

  let dropped = 0;
  const targets: HitTarget[] = [];
  const pinAt = new Map<string, PointMm>();
  const parts: PlacedPart[] = [];

  for (const pl of view.placements) {
    const comp = components.get(pl.c);
    if (pl.hidden) continue;
    if (!comp || !finite(pl.x_mm, pl.y_mm)) {
      dropped++;
      continue;
    }
    const shape = shapeOf(comp.definition.ref);
    const w = shape.widthMm > 0 ? shape.widthMm : 1;
    const h = shape.heightMm > 0 ? shape.heightMm : 1;
    const rotation = toRotation(pl.rotation_deg);
    const surface = pl.c === view.surface;
    const corners = [rotate(0, 0, rotation), rotate(w, 0, rotation), rotate(w, h, rotation), rotate(0, h, rotation)];
    const bbox = boundsOf(corners.map((c) => ({ x: c.x + pl.x_mm, y: c.y + pl.y_mm })));
    const part: PlacedPart = {
      id: pl.c,
      surface,
      defRef: comp.definition.ref,
      title: comp.label ? `${comp.refdes} ${comp.label}` : comp.refdes,
      refdes: comp.refdes,
      shape,
      w,
      h,
      xMm: pl.x_mm,
      yMm: pl.y_mm,
      rotation,
      z: surface ? Z_SURFACE : Z_PART + Math.max(0, Math.min(pl.layer ?? 0, Z_PART_MAX - Z_PART)),
      bbox,
      desired: 1,
    };
    parts.push(part);
    targets.push({ item: part.id, hit: { kind: "part", c: pl.c }, bbox });
    for (const pin of shape.pins) {
      const o = rotate(pin.xMm, pin.yMm, rotation);
      const at = { x: pl.x_mm + o.x, y: pl.y_mm + o.y };
      pinAt.set(pinKey(pl.c, pin.id), at);
      if (pin.mechanical) continue;
      const hit: Hit = surface ? { kind: "hole", surface: pl.c, hole: pin.id } : { kind: "pin", c: pl.c, p: pin.id };
      targets.push({ item: part.id, hit, bbox: boundsOf([at], PIN_RADIUS_MM) });
    }
  }

  const junctions = new Map<string, Junction>((view.junctions ?? []).map((j) => [j.id, j]));
  const endAt = (end: WireEnd): PointMm | undefined => {
    if (end.kind === "pin") return pinAt.get(pinKey(end.c, end.p));
    if (end.kind === "hole") return pinAt.get(pinKey(end.surface, end.hole));
    const j = junctions.get(end.id);
    return j ? { x: j.x_mm, y: j.y_mm } : undefined;
  };

  const wireItems: DrawItem[] = [];
  for (const wire of view.wires) {
    const from = endAt(wire.from);
    const to = endAt(wire.to);
    if (!from || !to) {
      dropped++;
      continue;
    }
    const points = routeOf(wire, from, to);
    if (!points.every((p) => finite(p.x, p.y))) {
      dropped++;
      continue;
    }
    const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join("");
    wireItems.push({
      id: wire.id,
      kind: "wire",
      z: Z_WIRE,
      lod: 2,
      xMm: 0,
      yMm: 0,
      rotation: 0,
      bbox: boundsOf(points),
      elements: [{ t: "path", d, stroke: WIRE_COLOUR[wire.color ?? "grey"], sw: 2 }],
      title: wire.net,
    });
    for (let i = 1; i < points.length; i++) {
      targets.push({
        item: wire.id,
        hit: { kind: "wire", id: wire.id, segment: i - 1 },
        bbox: boundsOf([points[i - 1]!, points[i]!], WIRE_HIT_MM),
      });
    }
  }

  const labelItems: DrawItem[] = [];
  for (const label of view.labels ?? []) {
    if (!finite(label.x_mm, label.y_mm)) {
      dropped++;
      continue;
    }
    const bbox = {
      x0: label.x_mm,
      y0: label.y_mm - LABEL_SIZE_MM,
      x1: label.x_mm + label.text.length * LABEL_SIZE_MM * 0.6,
      y1: label.y_mm,
    };
    labelItems.push({
      id: label.id,
      kind: "label",
      z: Z_LABEL,
      lod: 2,
      xMm: label.x_mm,
      yMm: label.y_mm,
      rotation: 0,
      bbox,
      elements: [{ t: "text", x: 0, y: 0, s: label.text, size: LABEL_SIZE_MM }],
      title: label.text,
    });
    targets.push({ item: label.id, hit: { kind: "label", id: label.id }, bbox });
  }

  const overlayItems = input.overlays.map(overlayItem);

  const index = input.index ?? linearIndex(targets);
  const halfW = (viewport.w / viewport.k / 2) * (1 + 2 * CULL_MARGIN_SCREENS);
  const halfH = (viewport.h / viewport.k / 2) * (1 + 2 * CULL_MARGIN_SCREENS);
  const inView = new Set(
    index.query({ x0: viewport.cx_mm - halfW, y0: viewport.cy_mm - halfH, x1: viewport.cx_mm + halfW, y1: viewport.cy_mm + halfH }),
  );

  const visibleParts = parts.filter((p) => inView.has(p.id));
  const visibleWires = wireItems.filter((w) => inView.has(w.id));
  const visibleLabels = labelItems.filter((l) => inView.has(l.id));
  const culled = parts.length - visibleParts.length + wireItems.length - visibleWires.length + labelItems.length - visibleLabels.length;

  let elementCount = overlayItems.reduce((n, o) => n + o.elements.length, 0);
  for (const w of visibleWires) elementCount += w.elements.length;
  for (const l of visibleLabels) elementCount += l.elements.length;

  const centreDistance = (p: PlacedPart): number =>
    Math.hypot((p.bbox.x0 + p.bbox.x1) / 2 - viewport.cx_mm, (p.bbox.y0 + p.bbox.y1) / 2 - viewport.cy_mm);
  const byDistance = visibleParts.toSorted((a, b) => centreDistance(a) - centreDistance(b));

  const lodCounts: [number, number, number] = [0, 0, 0];
  const partItems: DrawItem[] = [];
  for (const p of byDistance) {
    const screenPx = viewport.k * Math.max(p.w, p.h);
    let lod = input.forceLod ?? chooseLod(prevItems.get(p.id)?.lod, screenPx);
    let elements = partElements(p, lod === 2 && mode === "simple" ? 1 : lod, art, mode);
    if (lod === 2 && mode === "simple") lod = 1;
    if (lod === 2 && input.forceLod === undefined && elementCount + elements.length > budget) {
      lod = 1;
      elements = partElements(p, 1, art, mode);
    }
    elementCount += elements.length;
    lodCounts[lod]++;
    partItems.push({
      id: p.id,
      kind: p.surface ? "surface" : "part",
      z: p.z,
      lod,
      xMm: p.xMm,
      yMm: p.yMm,
      rotation: p.rotation,
      bbox: p.bbox,
      elements,
      title: p.title,
    });
  }

  const order = new Map(parts.map((p, i) => [p.id, i]));
  partItems.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  const items = [...partItems, ...visibleWires, ...visibleLabels, ...overlayItems].sort((a, b) => a.z - b.z);

  return finish({ viewId: view.id, items, targets, index, lod: lodCounts, culled, dropped, started, prevItems });
}

type Built = {
  viewId: string;
  items: DrawItem[];
  targets: readonly HitTarget[];
  index: SpatialIndex;
  lod: [number, number, number];
  culled: number;
  dropped: number;
  started: number;
  prevItems: ReadonlyMap<string, DrawItem>;
};

function finish(b: Built): { scene: Scene; diff: SceneDiff } {
  const diff: SceneDiff = { added: [], changed: [], removed: [] };
  const seen = new Set<string>();
  for (const item of b.items) {
    seen.add(item.id);
    const before = b.prevItems.get(item.id);
    if (!before) diff.added.push(item.id);
    else if (!sameItem(before, item)) diff.changed.push(item.id);
  }
  for (const id of b.prevItems.keys()) if (!seen.has(id)) diff.removed.push(id);

  const stats: DrawStats = {
    items: b.items.length,
    elements: b.items.reduce((n, i) => n + i.elements.length, 0),
    lod: b.lod,
    culled: b.culled,
    dropped: b.dropped,
    buildMs: performance.now() - b.started,
  };
  return { scene: { viewId: b.viewId, items: b.items, targets: b.targets, index: b.index, stats }, diff };
}

function buildFixed(input: DrawListInput, fixed: DrawList, prevItems: ReadonlyMap<string, DrawItem>, started: number) {
  const { viewport } = input;
  const halfW = (viewport.w / viewport.k / 2) * (1 + 2 * CULL_MARGIN_SCREENS);
  const halfH = (viewport.h / viewport.k / 2) * (1 + 2 * CULL_MARGIN_SCREENS);
  const window = { x0: viewport.cx_mm - halfW, y0: viewport.cy_mm - halfH, x1: viewport.cx_mm + halfW, y1: viewport.cy_mm + halfH };

  const lod: [number, number, number] = [0, 0, 0];
  const items: DrawItem[] = [];
  for (const item of fixed.items) {
    if (!touches(item.bbox, window)) continue;
    const level = item.kind === "part" ? (input.forceLod ?? chooseLod(prevItems.get(item.id)?.lod, viewport.k * Math.max(item.bbox.x1 - item.bbox.x0, item.bbox.y1 - item.bbox.y0))) : 2;
    lod[level]++;
    if (level === 0) {
      const { x0, y0, x1, y1 } = item.bbox;
      items.push({ ...item, lod: 0, elements: [{ t: "rect", x: x0, y: y0, w: x1 - x0, h: y1 - y0, fill: "var(--studio-body)", stroke: "var(--studio-ink)", sw: 0.3 }] });
    } else {
      items.push({ ...item, lod: level });
    }
  }
  items.sort((a, b) => a.z - b.z);
  const overlays = input.overlays.map(overlayItem);
  const index = input.index ?? linearIndex(fixed.targets);
  return finish({
    viewId: input.viewId,
    items: [...items, ...overlays],
    targets: fixed.targets,
    index,
    lod,
    culled: fixed.items.length - items.length,
    dropped: 0,
    started,
    prevItems,
  });
}
