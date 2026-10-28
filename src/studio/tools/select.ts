import { newId } from "../../core/ids.ts";
import type { Op, PinRef, Placement, Project as ProjectState, View, Wire } from "../../project/generated/types.ts";
import type { ArtElement, Hit, Overlay, PointMm, RectMm, Scene } from "../engine/types.ts";
import { connectedGroups } from "../rules/connect.ts";
import type { Selectable, StatusMessage } from "../stores/session.ts";
import type { IdSource } from "../views/breadboard.ts";
import { copySelection, createClipboard, pasteBatch, pasteOffsetMm } from "./clipboard.ts";
import type { Clipboard } from "./clipboard.ts";
import type { Tool, ToolCtx, ToolKeyEvent, ToolPointerEvent, ToolResult } from "./types.ts";

export type DeleteMode = "cut-connection" | "drawing-only";

export type DeleteRefusal = "last-board" | "read-only";

const DRAG_START_PX = 4;
const GHOST_SW = 0.4;
const GHOST_RX = 0.6;
const INK = "var(--studio-ink)";
const PLACE_DECIMALS = 100;

const randomIds: IdSource = (prefix) => newId(prefix);

const keyOf = (s: Selectable): string => `${s.kind}:${s.id}`;
const same = (a: Selectable, b: Selectable): boolean => a.kind === b.kind && a.id === b.id && a.view === b.view;
const round2 = (n: number): number => Math.round(n * PLACE_DECIMALS) / PLACE_DECIMALS;

const union = (a: RectMm, b: RectMm): RectMm => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
const touches = (a: RectMm, b: RectMm): boolean => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;
const contains = (outer: RectMm, inner: RectMm): boolean => inner.x0 >= outer.x0 && inner.x1 <= outer.x1 && inner.y0 >= outer.y0 && inner.y1 <= outer.y1;
const rectOf = (a: PointMm, b: PointMm): RectMm => ({ x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) });

/** What a click on `hit` selects. A pin or a hole belongs to its part. */
function selectableOf(hit: Hit | null, view: string): Selectable | null {
  switch (hit?.kind) {
    case "part":
    case "pin":
      return { kind: "part", view, id: hit.c };
    case "hole":
      return { kind: "part", view, id: hit.surface };
    case "wire":
      return { kind: "wire", view, id: hit.id };
    case "junction":
      return { kind: "junction", view, id: hit.id };
    case "label":
      return { kind: "label", view, id: hit.id };
    default:
      return null;
  }
}

/** False once the thing the selection names is gone, as after an undo. */
export function selectableExists(state: ProjectState, item: Selectable): boolean {
  const view = state.views.find((v) => v.id === item.view);
  if (!view) return false;
  switch (item.kind) {
    case "part":
      return view.placements.some((p) => p.c === item.id);
    case "wire":
      return view.wires.some((w) => w.id === item.id);
    case "junction":
      return (view.junctions ?? []).some((j) => j.id === item.id);
    case "label":
      return (view.labels ?? []).some((l) => l.id === item.id);
  }
}

function netOfHit(state: ProjectState, hit: Hit | null, viewId: string): string | null {
  if (hit?.kind === "pin") return state.nets.find((n) => n.connections.some((pin) => pin.c === hit.c && pin.p === hit.p))?.id ?? null;
  if (hit?.kind === "wire") return state.views.find((v) => v.id === viewId)?.wires.find((w) => w.id === hit.id)?.net ?? null;
  return null;
}

const refdesOf = (state: ProjectState, id: string): string => [...state.boards, ...state.components].find((x) => x.id === id)?.refdes ?? id;

/**
 * The batch that deletes `sel`. A part goes with everything that points at it in one op (PDM 7.2). A wire goes with
 * the net ops its cut needs (PDM W5), or alone in `drawing-only`, which leaves an air wire. A wire that ends on a
 * part that is also going is left to that part's cascade. The same call tells the tool why nothing was deleted.
 */
export function deleteBatch(
  state: ProjectState,
  sel: readonly Selectable[],
  mode: DeleteMode,
  readOnly = false,
  ids: IdSource = randomIds,
): { batch: Op[]; label: string } | { refused: DeleteRefusal } {
  if (readOnly) return { refused: "read-only" };
  const present = sel.filter((s) => selectableExists(state, s));
  const partIds = present.filter((s) => s.kind === "part").map((s) => s.id);
  const boards = new Set(state.boards.map((b) => b.id));
  const boardsGoing = partIds.filter((id) => boards.has(id)).length;
  if (boardsGoing > 0 && boardsGoing >= state.boards.length) return { refused: "last-board" };

  const going = new Set(partIds);
  const batch: Op[] = [];
  const wireViews = new Map<string, Set<string>>();
  for (const item of present.filter((s) => s.kind === "wire")) {
    const wire = state.views.find((v) => v.id === item.view)!.wires.find((w) => w.id === item.id)!;
    if ([wire.from, wire.to].some((end) => end.kind === "pin" && going.has(end.c))) continue;
    batch.push({ k: "wire.remove", view: item.view, id: item.id });
    wireViews.set(item.view, (wireViews.get(item.view) ?? new Set()).add(item.id));
  }
  if (mode === "cut-connection") batch.push(...cutOps(state, wireViews, ids));

  for (const item of present) {
    if (item.kind === "junction") batch.push({ k: "junction.remove", view: item.view, id: item.id });
    else if (item.kind === "label") batch.push({ k: "label.remove", view: item.view, id: item.id });
  }
  for (const id of partIds) batch.push(boards.has(id) ? { k: "board.remove", id } : { k: "component.remove", id });

  const label = present.length === 1 ? (partIds.length === 1 ? `Delete ${refdesOf(state, partIds[0]!)}` : `Delete ${present[0]!.kind}`) : `Delete ${present.length} items`;
  return { batch, label };
}

/** Which wires sit in the same electrical clump as which pins, for one view: wires join the strips, junctions and pins at their ends, and a leg joins its pin to its strip. */
function clumps(state: ProjectState, view: View): { wiresAt(pin: PinRef): number; orphans(net: string): string[] } {
  const surface = state.components.find((c) => c.id === view.surface);
  const iface = surface && state.dependencies.components.find((d) => d.ref === surface.definition.ref && d.version === surface.definition.version)?.interface;
  const stripOf = new Map((iface?.groups ?? []).filter((g) => g.kind === "strip").flatMap((g) => g.pins.map((hole) => [hole, g.id] as const)));
  const parent = new Map<string, string>();
  const find = (key: string): string => {
    const up = parent.get(key) ?? key;
    if (up === key) return key;
    const root = find(up);
    parent.set(key, root);
    return root;
  };
  const pinNode = (c: string, p: string) => `p:${c}/${p}`;
  const endNode = (end: Wire["from"]): string => {
    if (end.kind === "pin") return pinNode(end.c, end.p);
    if (end.kind === "junction") return `j:${end.id}`;
    return end.surface === view.surface && stripOf.has(end.hole) ? `s:${stripOf.get(end.hole)}` : `h:${end.surface}/${end.hole}`;
  };
  for (const placement of view.placements) {
    for (const [leg, hole] of Object.entries(placement.legs ?? {})) {
      const strip = hole === undefined ? undefined : stripOf.get(hole);
      if (strip !== undefined) parent.set(find(pinNode(placement.c, leg)), find(`s:${strip}`));
    }
  }
  for (const wire of view.wires) parent.set(find(endNode(wire.from)), find(endNode(wire.to)));

  const wired = new Map<string, number>();
  const withPin = new Set<string>();
  for (const wire of view.wires) wired.set(find(endNode(wire.from)), (wired.get(find(endNode(wire.from))) ?? 0) + 1);
  for (const wire of view.wires) for (const end of [wire.from, wire.to]) if (end.kind === "pin") withPin.add(find(pinNode(end.c, end.p)));
  for (const placement of view.placements) {
    for (const leg of Object.keys(placement.legs ?? {})) withPin.add(find(pinNode(placement.c, leg)));
  }
  return {
    wiresAt: (pin) => wired.get(find(pinNode(pin.c, pin.p))) ?? 0,
    orphans: (net) => view.wires.filter((w) => w.net === net && !withPin.has(find(endNode(w.from)))).map((w) => w.id),
  };
}

/**
 * The net ops for taking these wires out of their views. What each net still joins is read from the view without the
 * wires: the largest bunch of pins keeps the net, every other bunch becomes a net of its own (a lone pin with nothing
 * wired to it just leaves the net), and wires that no longer touch any pin go too, because a net with no pin
 * cannot hold them and a later wire would join them to the wrong net.
 */
function cutOps(state: ProjectState, removed: ReadonlyMap<string, ReadonlySet<string>>, ids: IdSource): Op[] {
  const nets = new Map<string, string>();
  for (const [viewId, wires] of removed) {
    for (const wire of state.views.find((v) => v.id === viewId)!.wires) if (wires.has(wire.id) && !nets.has(wire.net)) nets.set(wire.net, viewId);
  }
  const left: ProjectState = {
    ...state,
    views: state.views.map((v) => (removed.has(v.id) ? { ...v, wires: v.wires.filter((w) => !removed.get(v.id)!.has(w.id)) } : v)),
  };

  const ops: Op[] = [];
  for (const [net, viewId] of nets) {
    if (!state.nets.some((n) => n.id === net)) continue;
    const clump = clumps(left, left.views.find((v) => v.id === viewId)!);
    for (const id of clump.orphans(net)) ops.push({ k: "wire.remove", view: viewId, id });
    const [, ...apart] = connectedGroups(left, viewId, net);
    for (const group of apart) {
      if (group.length === 1 && clump.wiresAt(group[0]!) === 0) ops.push({ k: "net.disconnect", pin: group[0]! });
      else ops.push({ k: "net.split", net, into: ids("net"), pins: group as [PinRef, ...PinRef[]] });
    }
  }
  return ops;
}

export interface SelectTool extends Tool {
  state(): "idle" | "pressed" | "dragging" | "marquee";
}

export type SelectToolDeps = {
  setSelection(selection: Selectable[]): void;
  setFocusNet(net: string | null): void;
  setStatus(status: StatusMessage | null): void;
  clipboard?: Clipboard;
  ids?: IdSource;
};

type Gesture =
  | { at: "idle" }
  | { at: "pressed"; start: PointMm; startPx: PointMm; target: Selectable | null; additive: boolean; toggleOff: boolean; moved: boolean; mayDrag: boolean }
  | { at: "dragging"; start: PointMm; dx: number; dy: number }
  | { at: "marquee"; start: PointMm; end: PointMm; additive: boolean };

const IDLE: Gesture = { at: "idle" };

function placedParts(ctx: ToolCtx): Placement[] {
  const chosen = new Set(ctx.selection.filter((s) => s.kind === "part" && s.view === ctx.view.id).map((s) => s.id));
  return ctx.view.placements.filter((p) => chosen.has(p.c));
}

function partBox(scene: Scene, c: string): RectMm | null {
  const target = scene.targets.find((t) => t.hit.kind === "part" && t.hit.c === c);
  return target?.bbox ?? null;
}

/** What a marquee takes: every part, wire, junction and label whose box sits inside (a drag to the right) or touches (a drag to the left) the rectangle. */
export function selectInRect(scene: Scene, rect: RectMm, mode: "inside" | "touch", view: { id: string; surface?: string }): Selectable[] {
  const boxes = new Map<string, { item: Selectable; box: RectMm }>();
  for (const { hit, bbox } of scene.targets) {
    if (hit.kind !== "part" && hit.kind !== "wire" && hit.kind !== "junction" && hit.kind !== "label") continue;
    const item = selectableOf(hit, view.id)!;
    if (item.id === view.surface) continue;
    const key = keyOf(item);
    const seen = boxes.get(key);
    boxes.set(key, { item, box: seen ? union(seen.box, bbox) : bbox });
  }
  const found: Selectable[] = [];
  for (const { item, box } of boxes.values()) if (mode === "inside" ? contains(rect, box) : touches(rect, box)) found.push(item);
  return found;
}

const outline = (id: string, box: RectMm, extra: Partial<Extract<ArtElement, { t: "rect" }>> = {}): Overlay => ({
  id,
  xMm: box.x0,
  yMm: box.y0,
  elements: [{ t: "rect", x: 0, y: 0, w: box.x1 - box.x0, h: box.y1 - box.y0, rx: GHOST_RX, fill: "none", stroke: INK, sw: GHOST_SW, ...extra }],
});

/**
 * UX 10.1: click or tap selects, Shift or Ctrl and Cmd add, a drag from empty canvas draws a marquee, a drag from a
 * selected part moves it, and Delete, copy, cut, paste and duplicate act on the selection. A move is one `view.place`
 * per part, on release, and never touches a net or a leg (STU-11). On touch only a part that is already selected moves, so a
 * drag on anything else is left to the canvas to pan.
 */
export function createSelectTool({ setSelection, setFocusNet, setStatus, clipboard = createClipboard(), ids = randomIds }: SelectToolDeps): SelectTool {
  let gesture: Gesture = IDLE;

  const readOnly = (ctx: ToolCtx): boolean => {
    if (ctx.doc.readOnly) setStatus({ key: "select.refuse.read-only" });
    return ctx.doc.readOnly;
  };

  const inView = (ctx: ToolCtx): Selectable[] => ctx.selection.filter((s) => s.view === ctx.view.id);

  function down(ev: ToolPointerEvent, ctx: ToolCtx): ToolResult {
    if (ev.button !== 0) return { kind: "none" };
    const hit = ctx.hit(ev);
    if (ev.alt) {
      setFocusNet(netOfHit(ctx.doc.state, hit, ctx.view.id));
      return { kind: "none" };
    }
    const target = selectableOf(hit, ctx.view.id);
    const additive = ev.shift || ev.ctrl;
    const start = { x: ev.xMm, y: ev.yMm };
    const startPx = { x: ev.xPx, y: ev.yPx };
    const selected = target !== null && ctx.selection.some((s) => same(s, target));
    const touch = ev.pointerType === "touch";
    if (target !== null && !selected && !touch) setSelection(additive ? [...ctx.selection, target] : [target]);
    gesture = {
      at: "pressed",
      start,
      startPx,
      target,
      additive,
      toggleOff: selected && additive,
      moved: false,
      mayDrag: target !== null && target.kind === "part" && (selected || !touch),
    };
    return { kind: "none" };
  }

  function move(ev: ToolPointerEvent, ctx: ToolCtx): ToolResult {
    if (gesture.at === "pressed") {
      if (Math.hypot(ev.xPx - gesture.startPx.x, ev.yPx - gesture.startPx.y) < DRAG_START_PX) return { kind: "none" };
      if (gesture.target === null && ev.pointerType !== "touch") {
        gesture = { at: "marquee", start: gesture.start, end: { x: ev.xMm, y: ev.yMm }, additive: gesture.additive };
      } else if (gesture.mayDrag && !ctx.doc.readOnly) {
        gesture = { at: "dragging", start: gesture.start, dx: 0, dy: 0 };
      } else {
        gesture = { ...gesture, moved: true };
        return { kind: "none" };
      }
    }
    if (gesture.at === "marquee") {
      gesture = { ...gesture, end: { x: ev.xMm, y: ev.yMm } };
      return { kind: "preview" };
    }
    if (gesture.at === "dragging") {
      const snap = ctx.snapMm > 0 ? ctx.snapMm : null;
      const step = (d: number) => round2(snap === null ? d : Math.round(d / snap) * snap);
      gesture = { ...gesture, dx: step(ev.xMm - gesture.start.x), dy: step(ev.yMm - gesture.start.y) };
      return { kind: "preview" };
    }
    return { kind: "none" };
  }

  function up(ctx: ToolCtx): ToolResult {
    const done = gesture;
    gesture = IDLE;
    if (done.at === "dragging") {
      if (done.dx === 0 && done.dy === 0) return { kind: "cancel" };
      const parts = placedParts(ctx);
      const batch = parts.map((p): Op => ({ k: "view.place", view: ctx.view.id, placement: { ...p, x_mm: round2(p.x_mm + done.dx), y_mm: round2(p.y_mm + done.dy) } }));
      return { kind: "commit", batch, label: parts.length === 1 ? `Move ${refdesOf(ctx.doc.state, parts[0]!.c)}` : `Move ${parts.length} parts` };
    }
    if (done.at === "marquee") {
      const found = selectInRect(ctx.scene, rectOf(done.start, done.end), done.end.x >= done.start.x ? "inside" : "touch", ctx.view);
      setSelection(done.additive ? [...ctx.selection, ...found.filter((f) => !ctx.selection.some((s) => same(s, f)))] : found);
      return { kind: "cancel" };
    }
    if (done.at === "pressed") {
      const { target } = done;
      if (target === null) {
        if (!done.additive && !done.moved && ctx.selection.length > 0) setSelection([]);
      } else if (!done.moved) {
        const chosen = ctx.selection.some((s) => same(s, target));
        if (done.toggleOff) setSelection(ctx.selection.filter((s) => !same(s, target)));
        else if (done.additive) setSelection(chosen ? ctx.selection : [...ctx.selection, target]);
        else if (!(chosen && ctx.selection.length === 1)) setSelection([target]);
      }
    }
    return { kind: "none" };
  }

  function remove(ctx: ToolCtx, mode: DeleteMode): ToolResult {
    const sel = inView(ctx);
    if (sel.length === 0) return { kind: "none" };
    const result = deleteBatch(ctx.doc.state, sel, mode, ctx.doc.readOnly, ids);
    if ("refused" in result) {
      setStatus({ key: `select.refuse.${result.refused}` });
      return { kind: "preview" };
    }
    if (result.batch.length === 0) return { kind: "preview" };
    setSelection([]);
    setStatus({ key: "select.deleted", params: { count: sel.length } });
    return { kind: "commit", ...result };
  }

  function copy(ctx: ToolCtx): boolean {
    const payload = copySelection(ctx.doc.state, ctx.view, inView(ctx));
    if (payload.components.length === 0) {
      setStatus({ key: "select.copy.nothing" });
      return false;
    }
    clipboard.copy(payload);
    setStatus({ key: "select.copied", params: { count: payload.components.length } });
    return true;
  }

  function paste(ctx: ToolCtx): ToolResult {
    if (readOnly(ctx)) return { kind: "preview" };
    const payload = clipboard.payload();
    if (!payload) {
      setStatus({ key: "select.paste.nothing" });
      return { kind: "preview" };
    }
    const offset = pasteOffsetMm(clipboard.claim(), ctx.snapMm);
    const { batch, label, selection } = pasteBatch(ctx.doc.state, ctx.view, payload, { x: payload.bbox.x0 + offset, y: payload.bbox.y0 + offset }, ids);
    setSelection(selection);
    setStatus({ key: "select.pasted", params: { count: payload.components.length } });
    return { kind: "commit", batch, label };
  }

  function selectAll(ctx: ToolCtx): ToolResult {
    setSelection([
      ...ctx.view.placements.map((p): Selectable => ({ kind: "part", view: ctx.view.id, id: p.c })).filter((s) => s.id !== ctx.view.surface),
      ...ctx.view.wires.map((w): Selectable => ({ kind: "wire", view: ctx.view.id, id: w.id })),
    ]);
    return { kind: "preview" };
  }

  return {
    id: "select",
    state: () => gesture.at,

    cursor: () => (gesture.at === "dragging" ? "grabbing" : gesture.at === "marquee" ? "crosshair" : "default"),

    pointer(ev, ctx) {
      switch (ev.type) {
        case "down":
          return down(ev, ctx);
        case "move":
          return move(ev, ctx);
        case "up":
          return up(ctx);
        case "cancel":
          gesture = IDLE;
          return { kind: "cancel" };
      }
    },

    key(ev: ToolKeyEvent, ctx) {
      const key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
      if (key === "Delete" || key === "Backspace") return readOnly(ctx) ? { kind: "preview" } : remove(ctx, ev.shift ? "drawing-only" : "cut-connection");
      if (key === "Escape") {
        if (ctx.selection.length === 0) return { kind: "none" };
        setSelection([]);
        return { kind: "cancel" };
      }
      if (!ev.ctrl) return { kind: "none" };
      switch (key) {
        case "a":
          return selectAll(ctx);
        case "c":
          return copy(ctx) ? { kind: "preview" } : { kind: "none" };
        case "x":
          if (readOnly(ctx) || !copy(ctx)) return { kind: "preview" };
          return remove(ctx, "cut-connection");
        case "v":
          return paste(ctx);
        case "d":
          if (readOnly(ctx) || !copy(ctx)) return { kind: "preview" };
          return paste(ctx);
        default:
          return { kind: "none" };
      }
    },

    preview(ctx) {
      if (gesture.at === "marquee") return [outline("select:marquee", rectOf(gesture.start, gesture.end))];
      if (gesture.at !== "dragging") return [];
      const { dx, dy } = gesture;
      return placedParts(ctx).flatMap((p) => {
        const box = partBox(ctx.scene, p.c);
        return box ? [outline(`select:ghost:${p.c}`, { x0: box.x0 + dx, y0: box.y0 + dy, x1: box.x1 + dx, y1: box.y1 + dy })] : [];
      });
    },
  };
}
