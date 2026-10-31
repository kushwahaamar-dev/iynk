import type { Op, Placement, Project as ProjectState } from "../../project/generated/types.ts";
import type { PartRegistry } from "../../parts/registry.ts";
import { autoLayout, buildSchematicScene } from "../views/schematic.ts";
import type { SchematicNode } from "../views/schematic.ts";

export interface Move {
  c: string;
  x_mm: number;
  y_mm: number;
  rotation_deg?: number;
  mirrored?: boolean;
}

const QUANTUM = 1000;
const QUARTER_TURN = 90;

const round3 = (n: number): number => Math.round(n * QUANTUM) / QUANTUM;

function quarterTurns(deg: number): number {
  return (((Math.round(deg / QUARTER_TURN) * QUARTER_TURN) % 360) + 360) % 360;
}

/** Keeps the rotation and mirror out of the document while they are the defaults, like every other placement. */
function placementOf(base: Placement | undefined, at: { c: string; x_mm: number; y_mm: number; rotation_deg?: number; mirrored?: boolean }): Placement {
  const placement: Placement = { ...base, c: at.c, x_mm: round3(at.x_mm), y_mm: round3(at.y_mm) };
  delete placement.rotation_deg;
  delete placement.mirrored;
  const rotation = quarterTurns(at.rotation_deg ?? 0);
  if (rotation !== 0) placement.rotation_deg = rotation;
  if (at.mirrored) placement.mirrored = true;
  return placement;
}

const place = (viewId: string, placement: Placement): Op => ({ k: "view.place", view: viewId, placement });

const atNode = (node: SchematicNode) => ({ c: node.c, x_mm: node.x_mm, y_mm: node.y_mm, rotation_deg: node.rotation_deg, mirrored: node.mirrored });

/**
 * The batch for moving parts in a schematic. The first edit stores the position of every part that still has none
 * (so one drag cannot shuffle the rest), then the moves follow. Moves for parts the document lacks are dropped. Only
 * `view.place` ops, so no net or wire changes.
 */
export function schematicMoveOps(state: ProjectState, viewId: string, moves: readonly Move[], reg: PartRegistry): Op[] {
  const view = state.views.find((v) => v.id === viewId);
  if (!view) return [];
  const nodes = buildSchematicScene(state, viewId, reg).nodes;
  const known = new Set(state.boards.map((b) => b.id).concat(state.components.map((c) => c.id)));
  const wanted = new Map(moves.filter((m) => known.has(m.c)).map((m) => [m.c, m]));
  const stored = new Map(view.placements.map((p) => [p.c, p]));

  const ops: Op[] = [];
  for (const node of nodes) {
    if (!node.auto || wanted.has(node.c)) continue;
    ops.push(place(viewId, placementOf(undefined, atNode(node))));
  }
  for (const move of wanted.values()) ops.push(place(viewId, placementOf(stored.get(move.c), move)));
  return ops;
}

/** Moves the given parts by a distance; the form a drag ends in. */
export function dragOps(state: ProjectState, viewId: string, selected: readonly string[], dx_mm: number, dy_mm: number, reg: PartRegistry): Op[] {
  const chosen = new Set(selected);
  const moves = buildSchematicScene(state, viewId, reg)
    .nodes.filter((n) => chosen.has(n.c))
    .map((n): Move => ({ c: n.c, x_mm: n.x_mm + dx_mm, y_mm: n.y_mm + dy_mm, rotation_deg: n.rotation_deg, mirrored: n.mirrored }));
  return schematicMoveOps(state, viewId, moves, reg);
}

/** Throws away the stored positions and lays the schematic out again, one `view.place` per part. */
export function arrangeOps(state: ProjectState, viewId: string, reg: PartRegistry): Op[] {
  const view = state.views.find((v) => v.id === viewId);
  if (!view) return [];
  const stored = new Map(view.placements.map((p) => [p.c, p]));
  return autoLayout(state, viewId, reg).map((p) => {
    const { hidden, layer } = stored.get(p.c) ?? {};
    return place(viewId, { ...p, ...(hidden === undefined ? {} : { hidden }), ...(layer === undefined ? {} : { layer }) });
  });
}
