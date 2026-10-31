export type PointMm = { x: number; y: number };
export type RectMm = { x0: number; y0: number; x1: number; y1: number };
export type RectPx = RectMm;

export type LodLevel = 0 | 1 | 2;
export type ArtMode = "illustrated" | "simple";
export type Rotation = 0 | 90 | 180 | 270;

/** CSS px per mm is `k`; `w` and `h` are the canvas size in CSS px. */
export type Viewport = { cx_mm: number; cy_mm: number; k: number; w: number; h: number; dpr: number };

type Paint = { fill?: string; stroke?: string; sw?: number };

/** Art in millimetres in the part frame (origin at the placement, x right, y down). Colours are CSS values or `var(--studio-*)`. */
export type ArtElement =
  | ({ t: "path"; d: string } & Paint)
  | ({ t: "rect"; x: number; y: number; w: number; h: number; rx?: number } & Paint)
  | ({ t: "circle"; cx: number; cy: number; r: number } & Paint)
  | ({ t: "ellipse"; cx: number; cy: number; rx: number; ry: number } & Paint)
  | { t: "text"; x: number; y: number; s: string; size?: number; anchor?: "start" | "middle" | "end" };

export interface ArtProvider {
  get(defRef: string, lod: LodLevel, mode: ArtMode): readonly ArtElement[];
}

export type ResolvedPartShape = {
  widthMm: number;
  heightMm: number;
  pins: { id: string; xMm: number; yMm: number; mechanical: boolean }[];
  known: boolean;
};

export type Hit =
  | { kind: "pin"; c: string; p: string }
  | { kind: "hole"; surface: string; hole: string }
  | { kind: "wire"; id: string; segment: number }
  | { kind: "handle"; of: string; handle: "leg" | "waypoint" | "rotate" | "resize"; index: number }
  | { kind: "part"; c: string }
  | { kind: "junction"; id: string }
  | { kind: "label"; id: string };

/** Something a pointer can land on. `item` is the draw item it belongs to, so culling an item culls its targets. */
export type HitTarget = { item: string; hit: Hit; bbox: RectMm };

export interface SpatialIndex {
  /** Ids of the draw items that have a target touching `rect`. */
  query(rect: RectMm): readonly string[];
  /** The best target within `slopMm` of `p`: pins first, then holes, handles, junctions, labels, wires, parts; ties go to the smaller, then the later one. */
  pick(p: PointMm, slopMm: number): Hit | null;
}

/** What a view builds for itself: the items to draw and the targets a pointer can land on. */
export type DrawList = { items: readonly DrawItem[]; targets: readonly HitTarget[] };

export type DrawItemKind = "surface" | "part" | "wire" | "air" | "hole" | "label" | "overlay";

export type DrawItem = {
  id: string;
  kind: DrawItemKind;
  z: number;
  lod: LodLevel;
  xMm: number;
  yMm: number;
  /** Counter-clockwise degrees about the item origin. */
  rotation: Rotation;
  bbox: RectMm;
  elements: readonly ArtElement[];
  title: string;
};

/** `dropped` counts placements and wires skipped for a NaN position or an end that does not resolve. */
export type DrawStats = {
  items: number;
  elements: number;
  lod: [number, number, number];
  culled: number;
  dropped: number;
  buildMs: number;
};

export type Scene = {
  viewId: string;
  items: readonly DrawItem[];
  targets: readonly HitTarget[];
  index: SpatialIndex;
  stats: DrawStats;
};

export type SceneDiff = { added: string[]; changed: string[]; removed: string[] };

/** A transient drawing on top of the document: a ghost, a rubber band, a ring or a badge. `elements` are in mm relative to `xMm`, `yMm`. */
export type Overlay = {
  id: string;
  xMm: number;
  yMm: number;
  elements: readonly ArtElement[];
};

export interface Renderer {
  mount(el: HTMLElement, opts: { locale: string; theme: "light" | "dark"; reduceMotion: boolean }): void;
  setViewport(v: Viewport): void;
  draw(scene: Scene, diff: SceneDiff): void;
  hitTest(xPx: number, yPx: number, slopPx: number): Hit | null;
  hitRect(r: RectPx, mode: "touch" | "inside"): Hit[];
  dispose(): void;
}

export type RendererCall =
  | { method: "mount"; el: HTMLElement }
  | { method: "setViewport"; viewport: Viewport }
  | { method: "draw"; scene: Scene; diff: SceneDiff }
  | { method: "hitTest"; xPx: number; yPx: number; slopPx: number }
  | { method: "hitRect"; rect: RectPx; mode: "touch" | "inside" }
  | { method: "dispose" };

export interface NullRenderer extends Renderer {
  readonly calls: readonly RendererCall[];
}

/** Draws nothing and records what it was asked, so every tool can be tested without a browser. */
export function createNullRenderer(): NullRenderer {
  const calls: RendererCall[] = [];
  return {
    calls,
    mount: (el) => void calls.push({ method: "mount", el }),
    setViewport: (viewport) => void calls.push({ method: "setViewport", viewport }),
    draw: (scene, diff) => void calls.push({ method: "draw", scene, diff }),
    hitTest(xPx, yPx, slopPx) {
      calls.push({ method: "hitTest", xPx, yPx, slopPx });
      return null;
    },
    hitRect(rect, mode) {
      calls.push({ method: "hitRect", rect, mode });
      return [];
    },
    dispose: () => void calls.push({ method: "dispose" }),
  };
}
