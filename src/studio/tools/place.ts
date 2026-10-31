import { newId } from "../../core/ids.ts";
import { LIMITS } from "../../core/limits.ts";
import type { Board, Component, Op, ParamValue, Project as ProjectState } from "../../project/generated/types.ts";
import type { Descriptor } from "../../parts/descriptor.ts";
import { interfaceOf } from "../../parts/pins.ts";
import type { PartRegistry } from "../../parts/registry.ts";
import { PIN_RADIUS_MM } from "../engine/constants.ts";
import type { ArtElement, Overlay, PointMm, ResolvedPartShape } from "../engine/types.ts";
import { legRecipe } from "../rules/connect.ts";
import type { SessionStore } from "../stores/session.ts";
import { legsFit, surfaceGeom } from "../views/breadboard.ts";
import type { IdSource, SurfaceGeom } from "../views/breadboard.ts";
import type { Tool, ToolCtx, ToolKeyEvent, ToolPointerEvent, ToolResult } from "./types.ts";

export type PlaceRefusal = "off-board" | "quota" | "unknown-definition";

export type PlaceDeps = {
  registry: Pick<PartRegistry, "get" | "latest">;
  session: Pick<SessionStore, "getState" | "armPart" | "setTool" | "setSelection" | "setStatus">;
  ids?: IdSource;
};

export interface PlaceTool extends Tool {
  /** Picks the part the next click, tap or Enter puts down; null puts it away. */
  armPart(ref: string | null): void;
}

export type Placed = { batch: Op[]; label: string; id: string; refdes: string };

const HOLE_PITCH_MM = 2.54;
const SNAP_REACH_MM = HOLE_PITCH_MM * 1.5;
const RING_MM = PIN_RADIUS_MM + 0.6;
const SW = 0.3;
const INK = "var(--studio-ink)";
const WARN = "var(--studio-warn)";

/** The refdes letters of parts whose descriptor does not say. */
const PREFIX_OF_TAG: Record<string, string> = { led: "D", diode: "D" };
const FALLBACK_PREFIX = "U";

const REFUSAL_KEY: Record<PlaceRefusal, string> = { "off-board": "offBoard", quota: "quota", "unknown-definition": "unknownDefinition" };

const randomIds: IdSource = (prefix) => newId(prefix);
const round2 = (n: number): number => Math.round(n * 100) / 100;

export function refdesPrefix(d: Descriptor): string {
  if (d.identity.refdes_prefix) return d.identity.refdes_prefix;
  const tag = d.identity.tags?.find((t) => PREFIX_OF_TAG[t]);
  return tag ? PREFIX_OF_TAG[tag]! : FALLBACK_PREFIX;
}

/** The lowest number after `prefix` that no board or part in the project uses. */
export function nextRefdes(state: ProjectState, prefix: string): string {
  const used = new Set([...state.boards, ...state.components].map((item) => item.refdes));
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

function defaultParams(d: Descriptor): Record<string, ParamValue> | undefined {
  const entries = (d.parameters ?? []).flatMap((p): [string, ParamValue][] => (p.default === undefined ? [] : [[p.id, p.default as ParamValue]]));
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

const geoms = new WeakMap<Descriptor, SurfaceGeom>();

function geomOf(d: Descriptor): SurfaceGeom {
  let geom = geoms.get(d);
  if (!geom) geoms.set(d, (geom = surfaceGeom(d)));
  return geom;
}

type Seat = { x: number; y: number; legs?: Record<string, string> };

/** Where the part's first pin goes: the nearest hole, within a pitch and a half of `at`, that takes every leg and is free. */
function seatOnSurface(ctx: ToolCtx, registry: PlaceDeps["registry"], shape: ResolvedPartShape, at: PointMm): Seat | null {
  const { view } = ctx;
  const surfaceId = view.surface!;
  const surfacePlacement = view.placements.find((p) => p.c === surfaceId);
  const surfaceItem = ctx.doc.state.components.find((c) => c.id === surfaceId);
  const surfaceDesc = surfaceItem && registry.get(surfaceItem.definition.ref, surfaceItem.definition.version);
  if (!surfacePlacement || !surfaceDesc) return null;
  const surface = geomOf(surfaceDesc);

  const legs = shape.pins.filter((p) => !p.mechanical);
  const anchor = legs[0];
  if (!anchor) return null;
  const offsets = Object.fromEntries(legs.map((p) => [p.id, { x: p.xMm - anchor.xMm, y: p.yMm - anchor.yMm }]));
  const taken = new Set(view.placements.flatMap((p) => Object.values(p.legs ?? {})));

  const local = { x: at.x - surfacePlacement.x_mm, y: at.y - surfacePlacement.y_mm };
  const near = surface.holes
    .map((h) => ({ h, d: Math.hypot(h.xMm - local.x, h.yMm - local.y) }))
    .filter(({ d }) => d <= SNAP_REACH_MM)
    .sort((a, b) => a.d - b.d);
  for (const { h } of near) {
    const fit = legsFit(surface, offsets, { x: h.xMm, y: h.yMm }, 0);
    if (!fit || Object.values(fit).some((hole) => taken.has(hole))) continue;
    return { x: round2(surfacePlacement.x_mm + h.xMm - anchor.xMm), y: round2(surfacePlacement.y_mm + h.yMm - anchor.yMm), legs: fit };
  }
  return null;
}

const needsSurface = (ctx: ToolCtx, d: Descriptor): boolean => ctx.view.surface !== undefined && d.identity.kind !== "board";

function snapped(ctx: ToolCtx, shape: ResolvedPartShape, at: PointMm): Seat {
  const snap = (v: number) => round2(Math.round(v / ctx.snapMm) * ctx.snapMm);
  return { x: snap(at.x - shape.widthMm / 2), y: snap(at.y - shape.heightMm / 2) };
}

function seatFor(ctx: ToolCtx, deps: PlaceDeps, d: Descriptor, shape: ResolvedPartShape, at: PointMm): Seat | null {
  return needsSurface(ctx, d) ? seatOnSurface(ctx, deps.registry, shape, at) : snapped(ctx, shape, at);
}

function overQuota(ctx: ToolCtx, d: Descriptor): boolean {
  const { state } = ctx.doc;
  const full = d.identity.kind === "board" ? state.boards.length >= LIMITS.boards : state.components.length >= LIMITS.components;
  return full || ctx.view.placements.length >= LIMITS.placementsPerView;
}

/**
 * The batch that puts one part into the open view: the dependency when the project does not pin the part yet, the part,
 * its placement and, on a breadboard, the net ops for its legs. It is all one batch, so one undo takes the part away.
 * A part that needs holes and finds none under `at` is refused and writes nothing.
 */
export function placeBatch(ctx: ToolCtx, deps: PlaceDeps, ref: string, at: PointMm): Placed | { refused: PlaceRefusal } {
  const d = deps.registry.latest(ref);
  if (!d) return { refused: "unknown-definition" };
  if (overQuota(ctx, d)) return { refused: "quota" };
  const seat = seatFor(ctx, deps, d, ctx.resolve(ref), at);
  if (!seat) return { refused: "off-board" };

  const { state } = ctx.doc;
  const ids = deps.ids ?? randomIds;
  const refdes = nextRefdes(state, refdesPrefix(d));
  const definition = { ref: d.id, version: d.version };
  const id = d.identity.kind === "board" ? ids("brd") : ids("cmp");
  const pinned = state.dependencies.components.some((dep) => dep.ref === d.id && dep.version === d.version);
  const params = defaultParams(d);

  const batch: Op[] = [];
  if (!pinned) batch.push({ k: "dep.set", dependency: { ref: d.id, version: d.version, origin: "builtin", interface: interfaceOf(d) } });
  if (d.identity.kind === "board") {
    const board: Board = { id, definition, refdes, ...(params && { params }) };
    batch.push({ k: "board.add", board });
  } else {
    const component: Component = { id, definition, refdes, ...(params && { params }) };
    batch.push({ k: "component.add", component });
  }
  batch.push({ k: "view.place", view: ctx.view.id, placement: { c: id, x_mm: seat.x, y_mm: seat.y, rotation_deg: 0, ...(seat.legs && { legs: seat.legs }) } });
  if (seat.legs) batch.push(...legRecipe(state, ctx.view.id, id, seat.legs, ids));
  return { batch, label: `Place ${refdes}`, id, refdes };
}

function ghost(shape: ResolvedPartShape, seat: Seat | null, at: PointMm): Overlay {
  const valid = seat !== null;
  const stroke = valid ? INK : WARN;
  const x = seat?.x ?? at.x - shape.widthMm / 2;
  const y = seat?.y ?? at.y - shape.heightMm / 2;
  const elements: ArtElement[] = [{ t: "rect", x: 0, y: 0, w: shape.widthMm, h: shape.heightMm, fill: "none", stroke, sw: SW }];
  for (const pin of shape.pins) {
    if (!pin.mechanical) elements.push({ t: "circle", cx: pin.xMm, cy: pin.yMm, r: RING_MM, fill: "none", stroke, sw: SW });
  }
  if (!valid) elements.push({ t: "path", d: `M0 0L${shape.widthMm} ${shape.heightMm}M${shape.widthMm} 0L0 ${shape.heightMm}`, stroke, sw: SW });
  return { id: "place:ghost", xMm: x, yMm: y, elements };
}

/**
 * R-055: pick a part in the palette, then click, tap or press Enter. A click puts the part where it points, Enter puts
 * it at the middle of the view, and a part that needs the breadboard says so when it is not over it. The tool puts
 * the part away after one placement, so a double click makes one part.
 */
export function createPlaceTool(deps: PlaceDeps): PlaceTool {
  const { session } = deps;
  let hover: PointMm | null = null;

  const armed = (): string | null => session.getState().armedPart;

  function putAway() {
    hover = null;
    session.armPart(null);
  }

  function drop(ctx: ToolCtx, at: PointMm): ToolResult {
    const ref = armed()!;
    if (ctx.doc.readOnly) {
      session.setStatus({ key: "edit.place.readOnly" });
      return { kind: "cancel" };
    }
    const placed = placeBatch(ctx, deps, ref, at);
    if ("refused" in placed) {
      session.setStatus({ key: `edit.place.${REFUSAL_KEY[placed.refused]}` });
      return { kind: "cancel" };
    }
    putAway();
    session.setTool("select");
    session.setSelection([{ kind: "part", view: ctx.view.id, id: placed.id }]);
    session.setStatus({ key: "edit.place.placed", params: { refdes: placed.refdes } });
    return { kind: "commit", batch: placed.batch, label: placed.label };
  }

  return {
    id: "place",

    armPart(ref) {
      hover = null;
      session.armPart(ref);
    },

    cursor: () => "copy",

    pointer(ev: ToolPointerEvent, ctx) {
      if (armed() === null) return { kind: "none" };
      const at = { x: ev.xMm, y: ev.yMm };
      switch (ev.type) {
        case "move":
        case "down":
          hover = at;
          return { kind: "preview" };
        case "up":
          return ev.button === 0 ? drop(ctx, at) : { kind: "none" };
        case "cancel":
          hover = null;
          return { kind: "cancel" };
      }
    },

    key(ev: ToolKeyEvent, ctx) {
      if (armed() === null) return { kind: "none" };
      if (ev.key === "Enter") return drop(ctx, { x: ctx.viewport.cx_mm, y: ctx.viewport.cy_mm });
      if (ev.key !== "Escape") return { kind: "none" };
      putAway();
      session.setTool("select");
      session.setStatus({ key: "edit.place.cancelled" });
      return { kind: "cancel" };
    },

    preview(ctx) {
      const ref = armed();
      const d = ref === null ? undefined : deps.registry.latest(ref);
      if (ref === null || !d || hover === null) return [];
      const shape = ctx.resolve(ref);
      return [ghost(shape, seatFor(ctx, deps, d, shape, hover), hover)];
    },
  };
}
