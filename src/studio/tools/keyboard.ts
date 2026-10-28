import { newId } from "../../core/ids.ts";
import type { InterfacePin, Op, Placement, Project as ProjectState } from "../../project/generated/types.ts";
import type { Overlay, PointMm } from "../engine/types.ts";
import { resolvePart } from "../parts-view.ts";
import { canConnect, endLabel, wireRecipe } from "../rules/connect.ts";
import type { Access, Refusal, WireEndRef } from "../rules/connect.ts";
import type { DocStore } from "../stores/doc.ts";
import { createStore } from "../stores/select.ts";
import type { Store } from "../stores/select.ts";
import type { Selectable, SessionStore } from "../stores/session.ts";
import type { IdSource } from "../views/breadboard.ts";
import { placeBatch } from "./place.ts";
import type { PlaceDeps, PlaceRefusal, Placed } from "./place.ts";
import type { ToolCtx, ToolResult } from "./types.ts";

export type AnnounceArgs = Record<string, string | number>;

export type Politeness = "polite" | "assertive";

/** `key` is a message key written `namespace.path`, like a command's `labelKey`; the live region translates it. */
export type AnnounceLine = { id: number; key: string; args: AnnounceArgs; politeness: Politeness };

export interface Announcer {
  say(key: string, args?: AnnounceArgs, politeness?: Politeness): void;
  /** The newest lines, oldest first. */
  lines: Store<readonly AnnounceLine[]>;
}

const KEPT_LINES = 20;

export function createAnnouncer(): Announcer {
  let next = 1;
  const store = createStore<readonly AnnounceLine[]>([]);
  return {
    lines: { getState: store.getState, subscribe: store.subscribe },
    say(key, args = {}, politeness = "polite") {
      const line: AnnounceLine = { id: next++, key, args, politeness };
      store.setState((lines) => [...lines, line].slice(-KEPT_LINES));
    },
  };
}

const randomIds: IdSource = (prefix) => newId(prefix);
const round2 = (n: number): number => Math.round(n * 100) / 100;

export const FINE_STEP_MM = 0.01;
export const COARSE_STEPS = 10;
export const NUDGE_COALESCE_MS = 500;

type PinEnd = Extract<WireEndRef, { kind: "pin" }>;

const holder = (state: ProjectState, id: string) => [...state.boards, ...state.components].find((x) => x.id === id);

/** The refdes of a board or part, or its id once it is gone. */
export const partName = (state: ProjectState, id: string): string => holder(state, id)?.refdes ?? id;

/** Orders part ids by refdes, R2 before R10, so walking the parts goes the same way every time. */
export const byPartName = (state: ProjectState) => (a: string, b: string): number => partName(state, a).localeCompare(partName(state, b), "en", { numeric: true });

/** One press of Enter in the palette: the part goes to the middle of the view. */
export function placeAtCentre(ctx: ToolCtx, deps: PlaceDeps, ref: string): Placed | { refused: PlaceRefusal } {
  return placeBatch(ctx, deps, ref, { x: ctx.viewport.cx_mm, y: ctx.viewport.cy_mm });
}

export type NudgeOpts = { fine: boolean; coarse: boolean };

/**
 * Arrow keys move the selected parts a grid step, ten with Shift, 0.01 mm with Alt. The steps of one key-hold add up
 * and become one `view.place` batch, so one undo takes the whole hold back (UX 10.4). A move never touches a net or a
 * leg, as with the pointer.
 */
export interface Nudger {
  nudge(ctx: ToolCtx, ids: readonly string[], dx: number, dy: number, opts: NudgeOpts): ToolResult;
  /** The batch for the steps so far, and forgets them. */
  flush(ctx: ToolCtx): ToolResult;
  discard(): void;
  /** The parts the steps so far are for; empty when nothing is waiting. */
  ids(): readonly string[];
  preview(ctx: ToolCtx): Overlay[];
}

const GHOST_SW = 0.4;
const GHOST_RX = 0.6;

export function createNudger(): Nudger {
  let waiting: { ids: readonly string[]; x: number; y: number } | null = null;

  const placed = (ctx: ToolCtx, ids: readonly string[]): Placement[] => ctx.view.placements.filter((p) => ids.includes(p.c));

  return {
    nudge(ctx, ids, dx, dy, { fine, coarse }) {
      if (ctx.doc.readOnly || placed(ctx, ids).length === 0) return { kind: "cancel" };
      const step = fine ? FINE_STEP_MM : coarse ? COARSE_STEPS * ctx.snapMm : ctx.snapMm;
      const now = waiting ?? { ids, x: 0, y: 0 };
      waiting = { ids, x: round2(now.x + dx * step), y: round2(now.y + dy * step) };
      return { kind: "preview" };
    },

    flush(ctx) {
      const done = waiting;
      waiting = null;
      if (!done || (done.x === 0 && done.y === 0)) return { kind: "none" };
      const parts = placed(ctx, done.ids);
      if (parts.length === 0) return { kind: "cancel" };
      const batch = parts.map((p): Op => ({ k: "view.place", view: ctx.view.id, placement: { ...p, x_mm: round2(p.x_mm + done.x), y_mm: round2(p.y_mm + done.y) } }));
      return { kind: "commit", batch, label: parts.length === 1 ? `Move ${partName(ctx.doc.state, parts[0]!.c)}` : `Move ${parts.length} parts` };
    },

    discard() {
      waiting = null;
    },

    ids: () => waiting?.ids ?? [],

    preview(ctx) {
      if (!waiting) return [];
      const { ids, x, y } = waiting;
      return ctx.scene.targets.flatMap(({ hit, bbox }): Overlay[] =>
        hit.kind === "part" && ids.includes(hit.c)
          ? [
              {
                id: `nudge:${hit.c}`,
                xMm: bbox.x0 + x,
                yMm: bbox.y0 + y,
                elements: [{ t: "rect", x: 0, y: 0, w: bbox.x1 - bbox.x0, h: bbox.y1 - bbox.y0, rx: GHOST_RX, fill: "none", stroke: "var(--studio-ink)", sw: GHOST_SW }],
              },
            ]
          : [],
      );
    },
  };
}

export type WirePick =
  | (Extract<ToolResult, { kind: "commit" }> & { from: string; to: string })
  | { kind: "refused"; code: Refusal; args: Record<string, string> };

const accessOf = (ctx: ToolCtx): Access => (ctx.doc.readOnly ? "read-only" : "edit");

/** The wire the pointer would draw between the same two ends, or why it cannot be drawn. */
export function pickWireEnds(ctx: ToolCtx, from: WireEndRef, to: WireEndRef, ids: IdSource = randomIds): WirePick {
  const verdict = canConnect(ctx.doc.state, ctx.view.id, from, to, accessOf(ctx));
  if (!verdict.ok) return { kind: "refused", code: verdict.code, args: verdict.args };
  const { batch, label } = wireRecipe(ctx.doc.state, ctx.view.id, from, to, ids);
  return { kind: "commit", batch, label, from: endLabel(ctx.doc.state, from), to: endLabel(ctx.doc.state, to) };
}

export type WireCommitDeps = { doc: DocStore; session: Pick<SessionStore, "setSelection">; announcer: Announcer; ids?: IdSource };

/** Makes the wire between two picked ends, says so, and selects it so the Outline moves to it. False when it was refused. */
export function commitWirePick({ doc, session, announcer, ids }: WireCommitDeps, ctx: ToolCtx, from: WireEndRef, to: WireEndRef): boolean {
  const pick = pickWireEnds(ctx, from, to, ids);
  if (pick.kind === "refused") {
    announcer.say(`studioWire.wire.refuse.${pick.code}`, pick.args, "assertive");
    return false;
  }
  const done = doc.commit(pick.batch, { label: pick.label });
  if (!done.ok) {
    announcer.say("studioWire.announce.rejected", { message: done.message }, "assertive");
    return false;
  }
  const added = pick.batch.find((op) => op.k === "wire.add");
  if (added?.k === "wire.add") session.setSelection([{ kind: "wire", view: ctx.view.id, id: added.wire.id }]);
  announcer.say("studioWire.announce.wireMade", { from: pick.from, to: pick.to });
  return true;
}

/** The part after (`dir` 1) or before (`dir` -1) the selected one in refdes order, wrapping; the first or last when nothing is selected. */
export function focusNextPart(ctx: ToolCtx, dir: 1 | -1): Selectable | null {
  const parts = ctx.view.placements.map((p) => p.c).filter((c) => c !== ctx.view.surface).sort(byPartName(ctx.doc.state));
  if (parts.length === 0) return null;
  const current = ctx.selection.find((s) => s.kind === "part" && s.view === ctx.view.id);
  const at = parts.findIndex((c) => c === current?.id);
  const next = at === -1 ? (dir === 1 ? parts[0]! : parts[parts.length - 1]!) : parts[(at + dir + parts.length) % parts.length]!;
  return { kind: "part", view: ctx.view.id, id: next };
}

const QUARTER = 90;

/** Rotation by a quarter turn (`dir` 1 clockwise). A part seated in breadboard holes stays on the grid and is skipped. */
export function rotateBatch(ctx: ToolCtx, dir: 1 | -1): { batch: Op[]; label: string } | null {
  const chosen = new Set(ctx.selection.filter((s) => s.kind === "part" && s.view === ctx.view.id).map((s) => s.id));
  const parts = ctx.view.placements.filter((p) => chosen.has(p.c) && p.legs === undefined);
  if (parts.length === 0) return null;
  const batch = parts.map((p): Op => ({ k: "view.place", view: ctx.view.id, placement: { ...p, rotation_deg: (((p.rotation_deg ?? 0) + dir * QUARTER) % 360 + 360) % 360 } }));
  return { batch, label: parts.length === 1 ? `Rotate ${partName(ctx.doc.state, parts[0]!.c)}` : `Rotate ${parts.length} parts` };
}

export type PinEntry = {
  end: PinEnd;
  part: string;
  pin: string;
  polarity?: NonNullable<InterfacePin["polarity"]>;
  net: { id: string; name?: string } | null;
  /** Labels of the first few other pins in the same net. */
  others: string[];
  moreOthers: number;
  at: PointMm | null;
};

const SHOWN_OTHERS = 3;

const isMechanical = (p: InterfacePin): boolean => p.type === "mechanical" || p.class === "mechanical";

/** Every electrical pin of every part on the view (the breadboard itself excluded), in placement order. */
export function pinEntries(state: ProjectState, viewId: string): PinEntry[] {
  const view = state.views.find((v) => v.id === viewId);
  if (!view) return [];
  const netOf = new Map<string, (typeof state.nets)[number]>();
  for (const net of state.nets) for (const { c, p } of net.connections) netOf.set(`${c}\u0000${p}`, net);

  return view.placements.flatMap((placement) => {
    const item = holder(state, placement.c);
    const iface = item && state.dependencies.components.find((d) => d.ref === item.definition.ref && d.version === item.definition.version)?.interface;
    if (!item || !iface || iface.role === "surface") return [];
    const shape = resolvePart(state, item.definition.ref);
    return iface.pins
      .filter((pin) => !isMechanical(pin))
      .map((pin): PinEntry => {
        const net = netOf.get(`${placement.c}\u0000${pin.id}`);
        const spot = shape.pins.find((s) => s.id === pin.id);
        const others = (net?.connections ?? []).filter((x) => x.c !== placement.c || x.p !== pin.id);
        return {
          end: { kind: "pin", c: placement.c, p: pin.id },
          part: item.refdes,
          pin: pin.designator ?? pin.id,
          ...(pin.polarity && { polarity: pin.polarity }),
          net: net ? { id: net.id, ...(net.name && { name: net.name }) } : null,
          others: others.slice(0, SHOWN_OTHERS).map((x) => endLabel(state, { kind: "pin", ...x })),
          moreOthers: Math.max(0, others.length - SHOWN_OTHERS),
          at: spot ? { x: placement.x_mm + spot.xMm, y: placement.y_mm + spot.yMm } : null,
        };
      });
  });
}

/** Where a wire from part `c` starts when the person has not named a pin: its first pin that is in no net yet. */
export function firstFreePin(state: ProjectState, viewId: string, c: string): PinEnd | null {
  return pinEntries(state, viewId).find((e) => e.end.c === c && e.net === null)?.end ?? null;
}

/** The net the selection stands for: a wire's own, or the net of a part's first connected pin. */
export function netOfSelection(state: ProjectState, selection: readonly Selectable[]): string | null {
  for (const item of selection) {
    if (item.kind === "wire") {
      const wire = state.views.find((v) => v.id === item.view)?.wires.find((w) => w.id === item.id);
      if (wire) return wire.net;
    } else if (item.kind === "part") {
      const net = state.nets.find((n) => n.connections.some((x) => x.c === item.id));
      if (net) return net.id;
    }
  }
  return null;
}
