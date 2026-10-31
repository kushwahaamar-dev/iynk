import type { Component as Descriptor } from "./generated/types.ts";
import type { InterfaceSnapshot } from "./pins.ts";

export type FallbackRenderer = NonNullable<Descriptor["visual"]["fallback"]>["renderer"];
export type FallbackSide = "left" | "right" | "top" | "bottom";

/** Layout data for one of the five generic renderers. Millimetres in the part frame (origin bottom-left, +y up). */
export interface FallbackSpec {
  renderer: FallbackRenderer;
  label: string;
  bodyColour?: string;
  showPinLabels: boolean;
  body_mm: { w: number; h: number };
  /** The body and every pin, measured from the origin. */
  bounds_mm: { w: number; h: number };
  pins: { id: string; x_mm: number; y_mm: number; side?: FallbackSide }[];
}

interface LayoutPin {
  id: string;
  position?: { x: number; y: number };
}

interface Layout {
  body: { w: number; h: number };
  slots: { x: number; y: number; side?: FallbackSide }[];
}

const PITCH = 2.54;
const DIP_ROW_GAP = 7.62;
const TERMINAL_PITCH = 5.08;
const MODULE_HEIGHT = 10.16;
const MIN_BOX = 10.16;
const PLACEHOLDER_LABEL = "Unknown part";

const round2 = (n: number): number => Math.round(n * 100) / 100;

function twoLead(n: number): Layout {
  return {
    body: { w: Math.max(n - 1, 1) * PITCH, h: PITCH },
    slots: Array.from({ length: n }, (_, i) => ({ x: round2(i * PITCH), y: 0 })),
  };
}

function dip(n: number): Layout {
  const rows = Math.ceil(n / 2);
  return {
    body: { w: DIP_ROW_GAP, h: rows * PITCH },
    slots: Array.from({ length: n }, (_, i) =>
      i < rows
        ? { x: 0, y: round2((rows - i - 0.5) * PITCH), side: "left" as const }
        : { x: DIP_ROW_GAP, y: round2((i - rows + 0.5) * PITCH), side: "right" as const },
    ),
  };
}

function row(n: number, pitch: number): Layout {
  return {
    body: { w: n * pitch, h: MODULE_HEIGHT },
    slots: Array.from({ length: n }, (_, i) => ({ x: round2((i + 0.5) * pitch), y: 0, side: "bottom" as const })),
  };
}

function box(pins: LayoutPin[], sides: Record<string, FallbackSide | undefined>, minBody?: { w: number; h: number }): Layout {
  const half = Math.ceil(pins.length / 2);
  const sideOf = pins.map((p, i): FallbackSide => sides[p.id] ?? (i < half ? "left" : "right"));
  const count = (s: FallbackSide) => sideOf.filter((x) => x === s).length;
  const w = Math.max(minBody?.w ?? 0, MIN_BOX, (Math.max(count("top"), count("bottom")) + 1) * PITCH);
  const h = Math.max(minBody?.h ?? 0, MIN_BOX, (Math.max(count("left"), count("right")) + 1) * PITCH);
  const used = { left: 0, right: 0, top: 0, bottom: 0 };
  const slots = sideOf.map((side) => {
    const step = ++used[side] * PITCH;
    switch (side) {
      case "left":
        return { x: 0, y: round2(h - step), side };
      case "right":
        return { x: w, y: round2(h - step), side };
      case "top":
        return { x: round2(step), y: h, side };
      case "bottom":
        return { x: round2(step), y: 0, side };
    }
  });
  return { body: { w, h }, slots };
}

function autoLayout(renderer: FallbackRenderer, pins: LayoutPin[], sides: Record<string, FallbackSide | undefined>, dims?: { w: number; h: number }): Layout {
  switch (renderer) {
    case "generic-two-lead":
      return twoLead(pins.length);
    case "generic-dip":
      return dip(pins.length);
    case "generic-header-module":
      return row(pins.length, PITCH);
    case "generic-terminal-module":
      return row(pins.length, TERMINAL_PITCH);
    case "generic-box":
      return box(pins, sides, dims);
  }
}

/** Keeps explicit positions and fills the rest from the renderer's own layout; the body is the given size or the computed one. */
function layOut(
  renderer: FallbackRenderer,
  pins: LayoutPin[],
  sides: Record<string, FallbackSide | undefined>,
  dims: { w: number; h: number } | undefined,
): Pick<FallbackSpec, "body_mm" | "bounds_mm" | "pins"> {
  const auto = autoLayout(renderer, pins, sides, dims);
  const placed = pins.map((p, i) => {
    const slot = auto.slots[i];
    const x = p.position?.x ?? slot.x;
    const y = p.position?.y ?? slot.y;
    const side = sides[p.id] ?? (p.position ? undefined : slot.side);
    return side ? { id: p.id, x_mm: x, y_mm: y, side } : { id: p.id, x_mm: x, y_mm: y };
  });
  const explicit = pins.some((p) => p.position);
  const far = { w: Math.max(...placed.map((p) => p.x_mm), 0), h: Math.max(...placed.map((p) => p.y_mm), 0) };
  const computed = explicit ? { w: Math.max(far.w + PITCH, auto.body.w), h: Math.max(far.h + PITCH, auto.body.h) } : auto.body;
  const body = renderer === "generic-box" ? auto.body : (dims ?? computed);
  const bounds = { w: Math.max(body.w, far.w), h: Math.max(body.h, far.h) };
  return { body_mm: { w: body.w, h: body.h }, bounds_mm: bounds, pins: placed };
}

/**
 * Layout for a part drawn without artwork. Pin positions come from `pins[].position` when present and from the
 * renderer's own layout when not. The body is `dimensions.body`, else `dimensions.board`, else computed. Drawing the
 * SVG is Studio's job.
 */
export function fallbackSpec(d: Descriptor): FallbackSpec {
  const fb = d.visual.fallback;
  const sides = d.visual.schematic?.pin_sides ?? {};
  const dims = d.dimensions?.body ?? d.dimensions?.board;
  const spec: FallbackSpec = {
    renderer: fb.renderer,
    label: fb.label,
    showPinLabels: fb.show_pin_labels ?? false,
    ...layOut(fb.renderer, d.pins, sides, dims && { w: dims.w, h: dims.h }),
  };
  if (fb.body_colour !== undefined) spec.bodyColour = fb.body_colour;
  return spec;
}

/** The "unknown part" placeholder (R-028): the same layout, from a pinned interface alone. */
export function placeholderSpec(iface: InterfaceSnapshot, label: string = PLACEHOLDER_LABEL): FallbackSpec {
  const renderer: FallbackRenderer = iface.pins.length <= 2 ? "generic-two-lead" : "generic-box";
  return { renderer, label, showPinLabels: true, ...layOut(renderer, iface.pins, {}, undefined) };
}

const DEFAULT_ACCURACY_MM = 0.3;
const EPSILON = 1e-9;

/**
 * Whether the fallback drawing puts every pin where the descriptor says: each pin is in the spec, an explicit position
 * is within `dimensions.accuracy` of the spec's, and the spec's pin lies inside the bounds grown by the same amount.
 */
export function pinsCovered(def: Descriptor, spec: FallbackSpec): { ok: boolean; outside: string[] } {
  const accuracy = (def.dimensions?.accuracy ?? DEFAULT_ACCURACY_MM) + EPSILON;
  const drawn = new Map(spec.pins.map((p) => [p.id, p]));
  const outside = def.pins
    .filter((pin) => {
      const spot = drawn.get(pin.id);
      if (!spot) return true;
      if (pin.position && Math.hypot(pin.position.x - spot.x_mm, pin.position.y - spot.y_mm) > accuracy) return true;
      return spot.x_mm < -accuracy || spot.y_mm < -accuracy || spot.x_mm > spec.bounds_mm.w + accuracy || spot.y_mm > spec.bounds_mm.h + accuracy;
    })
    .map((pin) => pin.id);
  return { ok: outside.length === 0, outside };
}

export type Trust = "core" | "local" | "imported";

export type ArtChoice =
  | { kind: "figure"; figure: { kind: "part" | "module" | "board"; id: string; path: string } }
  | { kind: "asset"; mediaType: "image/svg+xml" | "image/png"; sha256: string; path: string }
  | { kind: "fallback"; spec: FallbackSpec };

export type HasAsset = (sha256: string) => boolean;

/** Only a core part may name a figure page; any other part gets its first stored SVG or PNG, else the generic drawing. */
export function selectArt(def: Descriptor, trust: Trust, hasAsset: HasAsset): ArtChoice {
  const figure = def.visual.breadboard?.figure;
  if (trust === "core" && figure) return { kind: "figure", figure: { kind: figure.kind, id: figure.id, path: figure.path } };
  for (const a of def.visual.assets ?? []) {
    if ((a.media_type === "image/svg+xml" || a.media_type === "image/png") && hasAsset(a.sha256)) {
      return { kind: "asset", mediaType: a.media_type, sha256: a.sha256, path: a.path };
    }
  }
  return { kind: "fallback", spec: fallbackSpec(def) };
}
