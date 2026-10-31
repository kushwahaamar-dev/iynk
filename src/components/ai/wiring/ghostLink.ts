import type { DiffSummary, ProposalRecord } from "@/ai/proposals/types";
import type { Op, Placement, Project } from "@/project/generated/types";
import { PIN_RADIUS_MM } from "@/studio/engine/constants";
import type { ArtElement, Overlay, PointMm, ResolvedPartShape } from "@/studio/engine/types";
import type { SessionStore } from "@/studio/stores/session";
import type { ProposalHost } from "./proposalHost";

export const MAX_GHOSTS = 200;

const ADD = "var(--studio-ink)";
const REMOVE = "var(--studio-warn)";
const SW = 0.3;
const RING_MM = PIN_RADIUS_MM + 0.6;
const DASH_MM = 1.2;
const GAP_MM = 0.8;

export interface GhostContext {
  viewId: string;
  resolve: (defRef: string) => ResolvedPartShape;
}

interface Seat {
  placement: Placement;
  defRef: string;
}

/** Counter-clockwise in a y-down frame, as the draw list turns parts. */
function turn(x: number, y: number, deg: number | undefined): PointMm {
  switch ((((Math.round((deg ?? 0) / 90) % 4) + 4) % 4) * 90) {
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

const finite = (...n: number[]) => n.every(Number.isFinite);

function partGhost(id: string, seat: Seat, shape: ResolvedPartShape, color: string, struck: boolean): Overlay | null {
  const { placement: at } = seat;
  if (!finite(at.x_mm, at.y_mm)) return null;
  const w = shape.widthMm > 0 ? shape.widthMm : 1;
  const h = shape.heightMm > 0 ? shape.heightMm : 1;
  const corners = [turn(0, 0, at.rotation_deg), turn(w, 0, at.rotation_deg), turn(w, h, at.rotation_deg), turn(0, h, at.rotation_deg)];
  const minX = Math.min(...corners.map((c) => c.x));
  const minY = Math.min(...corners.map((c) => c.y));
  const maxX = Math.max(...corners.map((c) => c.x));
  const maxY = Math.max(...corners.map((c) => c.y));
  const elements: ArtElement[] = [{ t: "rect", x: 0, y: 0, w: maxX - minX, h: maxY - minY, fill: "none", stroke: color, sw: SW }];
  for (const pin of shape.pins) {
    if (pin.mechanical) continue;
    const o = turn(pin.xMm, pin.yMm, at.rotation_deg);
    elements.push({ t: "circle", cx: o.x - minX, cy: o.y - minY, r: RING_MM, fill: "none", stroke: color, sw: SW });
  }
  if (struck) elements.push({ t: "path", d: `M0 0L${maxX - minX} ${maxY - minY}M${maxX - minX} 0L0 ${maxY - minY}`, stroke: color, sw: SW });
  return { id, xMm: at.x_mm + minX, yMm: at.y_mm + minY, elements };
}

function dashes(from: PointMm, to: PointMm): string {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0) return "";
  const ux = (to.x - from.x) / length;
  const uy = (to.y - from.y) / length;
  let d = "";
  for (let at = 0; at < length; at += DASH_MM + GAP_MM) {
    const end = Math.min(at + DASH_MM, length);
    d += `M${from.x + ux * at} ${from.y + uy * at}L${from.x + ux * end} ${from.y + uy * end}`;
  }
  return d;
}

const dot = (key: string): [string, string] => {
  const i = key.indexOf(".");
  return [key.slice(0, i), key.slice(i + 1)];
};

/**
 * Outlines for added parts, crossed-out outlines for removed ones and dashed pairs for pins that join or part, all
 * read from the dry-run summary and the proposal's own `view.place` ops. The live document is only read.
 */
export function overlaysFor(diff: DiffSummary, ops: readonly Op[], state: Project, ctx: GhostContext): Overlay[] {
  const view = state.views.find((v) => v.id === ctx.viewId);
  if (!view) return [];

  const defOf = new Map(state.components.map((c) => [c.id, c.definition.ref]));
  for (const line of [...diff.parts.added, ...diff.parts.removed]) if (line.definition !== undefined) defOf.set(line.id, line.definition);

  const current = new Map(view.placements.filter((p) => !p.hidden).map((p) => [p.c, p]));
  const planned = new Map<string, Placement>();
  for (const op of ops) if (op.k === "view.place" && op.view === ctx.viewId) planned.set(op.placement.c, op.placement);

  const seatOf = (id: string, from: ReadonlyMap<string, Placement>): Seat | null => {
    const placement = from.get(id);
    const defRef = defOf.get(id);
    return placement && defRef !== undefined ? { placement, defRef } : null;
  };
  const addedIds = new Set(diff.parts.added.map((line) => line.id));
  const pinPoint = (key: string): PointMm | null => {
    const [c, p] = dot(key);
    const seat = seatOf(c, addedIds.has(c) ? planned : current) ?? seatOf(c, current);
    const pin = seat && ctx.resolve(seat.defRef).pins.find((candidate) => candidate.id === p);
    if (!seat || !pin) return null;
    const o = turn(pin.xMm, pin.yMm, seat.placement.rotation_deg);
    const at = { x: seat.placement.x_mm + o.x, y: seat.placement.y_mm + o.y };
    return finite(at.x, at.y) ? at : null;
  };

  const out: Overlay[] = [];
  for (const line of diff.parts.added) {
    const seat = seatOf(line.id, planned);
    const ghost = seat && partGhost(`ghost:add:${line.id}`, seat, ctx.resolve(seat.defRef), ADD, false);
    if (ghost) out.push(ghost);
  }
  for (const line of diff.parts.removed) {
    const seat = seatOf(line.id, current);
    const ghost = seat && partGhost(`ghost:remove:${line.id}`, seat, ctx.resolve(seat.defRef), REMOVE, true);
    if (ghost) out.push(ghost);
  }

  const nets = new Map(state.nets.map((net) => [net.id, net]));
  const pairs = (id: string, keys: readonly string[], anchors: readonly string[], color: string, tag: string) => {
    const points = [...anchors.slice(0, 1), ...keys].flatMap((key) => pinPoint(key) ?? []);
    if (points.length < 2) return;
    const d = points.slice(1).map((to, i) => dashes(points[i]!, to)).join("");
    if (d !== "") out.push({ id: `ghost:${tag}:${id}`, xMm: 0, yMm: 0, elements: [{ t: "path", d, stroke: color, sw: SW }] });
  };
  for (const change of diff.nets) {
    const kept = (nets.get(change.id)?.connections ?? []).map((pin) => `${pin.c}.${pin.p}`).filter((key) => !change.removed.includes(key));
    pairs(change.id, change.added, kept, ADD, "join");
    pairs(change.id, change.removed, kept, REMOVE, "part");
  }

  if (out.length <= MAX_GHOSTS) return out;
  const first = out[0]!;
  return [{ id: "ghost:count", xMm: first.xMm, yMm: first.yMm, elements: [{ t: "text", x: 0, y: 0, s: `+${out.length}`, size: 3 }] }];
}

const opsOf = ({ proposal }: ProposalRecord): Op[] => proposal.steps.flatMap((step) => step.ops);

export interface GhostLinkDeps {
  session: SessionStore;
  host: ProposalHost;
  state(): Project;
  resolve: GhostContext["resolve"];
}

/** Keeps the canvas preview in step with the selected card, and clears it when no card is selected. */
export function linkGhost(d: GhostLinkDeps): () => void {
  let ours: Overlay[] | null = null;
  let key = "";

  const sync = () => {
    const selected = d.host.selected();
    const viewId = d.session.getState().viewId;
    const next = selected?.report ? `${selected.record.proposal.id}:${selected.report.diffHash}:${viewId}` : "";
    const owned = ours !== null && d.session.getState().preview === ours;
    if (next === key && (owned || next === "")) return;
    key = next;
    if (!selected?.report) {
      if (owned) d.session.setPreview([]);
      ours = null;
      return;
    }
    ours = overlaysFor(selected.report.diff, opsOf(selected.record), d.state(), { viewId, resolve: d.resolve });
    d.session.setPreview(ours);
  };

  const stopHost = d.host.subscribe(sync);
  const stopSession = d.session.subscribe(sync);
  sync();

  return () => {
    stopHost();
    stopSession();
    if (ours !== null && d.session.getState().preview === ours) d.session.setPreview([]);
    ours = null;
  };
}
