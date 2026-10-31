import { DEF_REF_PATTERN, PIN_ID_PATTERN } from "../../core/ids.ts";
import { LIMITS } from "../../core/limits.ts";
import type { Component, ComponentDependency, Net, Op, Placement, Project as ProjectState, View, Wire, WireColor, WireEnd } from "../../project/generated/types.ts";
import { validateOp } from "../../project/generated/validate.mjs";
import type { PointMm, RectMm } from "../engine/types.ts";
import type { Selectable } from "../stores/session.ts";
import type { IdSource } from "../views/breadboard.ts";

/**
 * What a copy keeps: the selected parts, where they sit, and the wires that run between two of them with the nets
 * those wires make. A wire with an end outside the selection is left behind (R-055). Ids are the source's; a paste
 * gives everything new ones. `bbox` is the box of the placement origins, not of the drawn art.
 */
export type ClipboardPayload = {
  v: 1;
  components: Component[];
  placements: Placement[];
  nets: Net[];
  wires: Wire[];
  deps: ComponentDependency[];
  bbox: RectMm;
};

export const MAX_CLIPBOARD_BYTES = 2 * 1024 * 1024;
const MARKER = "clip";
const POSITION_PLACES = 100;
const PASTE_STEPS = 2;

const pinKey = (c: string, p: string): string => `${c}\u0000${p}`;
const round2 = (n: number): number => Math.round(n * POSITION_PLACES) / POSITION_PLACES;

type PinEnd = Extract<WireEnd, { kind: "pin" }>;
type PinWire = Wire & { from: PinEnd; to: PinEnd };

const isPinWire = (wire: Wire, parts: ReadonlySet<string>): wire is PinWire =>
  wire.from.kind === "pin" && wire.to.kind === "pin" && parts.has(wire.from.c) && parts.has(wire.to.c);

export function copySelection(state: ProjectState, view: View, sel: readonly Selectable[]): ClipboardPayload {
  const chosen = new Set(sel.filter((s) => s.kind === "part" && s.view === view.id).map((s) => s.id));
  const components = state.components.filter((c) => chosen.has(c.id) && view.placements.some((p) => p.c === c.id));
  const parts = new Set(components.map((c) => c.id));
  const placements = view.placements.filter((p) => parts.has(p.c)).map(({ legs: _legs, ...rest }): Placement => rest);

  const parent = new Map<string, string>();
  const find = (key: string): string => {
    const up = parent.get(key) ?? key;
    if (up === key) return key;
    const root = find(up);
    parent.set(key, root);
    return root;
  };
  const inside = view.wires.filter((w): w is PinWire => isPinWire(w, parts));
  for (const w of inside) parent.set(find(pinKey(w.from.c, w.from.p)), find(pinKey(w.to.c, w.to.p)));

  // One net per bunch of copied wires that touch, so two wires of one source net that the selection cuts apart stay apart.
  const classOf = new Map(state.nets.map((n) => [n.id, n.class]));
  const nets = new Map<string, Net>();
  const wires = inside.map(({ route_mm: _route, ...wire }): Wire => {
    const root = find(pinKey(wire.from.c, wire.from.p));
    let net = nets.get(root);
    if (!net) {
      net = { id: `n${nets.size + 1}`, connections: [] as unknown as Net["connections"] };
      const cls = classOf.get(wire.net);
      if (cls !== undefined) net.class = cls;
      nets.set(root, net);
    }
    for (const end of [wire.from, wire.to]) {
      if (!net.connections.some((pin) => pin.c === end.c && pin.p === end.p)) net.connections.push({ c: end.c, p: end.p });
    }
    return { ...wire, net: net.id };
  });

  const origins = placements.length > 0 ? placements : [{ x_mm: 0, y_mm: 0 }];
  const xs = origins.map((p) => p.x_mm);
  const ys = origins.map((p) => p.y_mm);
  const keys = new Set(components.map((c) => `${c.definition.ref}@${c.definition.version}`));
  return {
    v: 1,
    components,
    placements,
    nets: [...nets.values()],
    wires,
    deps: state.dependencies.components.filter((d) => keys.has(`${d.ref}@${d.version}`)),
    bbox: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) },
  };
}

/** The next free reference designator for each prefix: `R3` when `R1` and `R2` exist. */
function refdesAllocator(state: ProjectState): (like: string) => string {
  const top = new Map<string, number>();
  const note = (refdes: string) => {
    const match = /^([A-Za-z_]*?)(\d*)$/.exec(refdes);
    const prefix = match?.[1] ?? refdes;
    top.set(prefix, Math.max(top.get(prefix) ?? 0, Number(match?.[2] || 0)));
  };
  for (const item of [...state.boards, ...state.components]) note(item.refdes);
  return (like) => {
    const prefix = /^([A-Za-z_]*?)\d*$/.exec(like)?.[1] ?? like;
    const next = (top.get(prefix) ?? 0) + 1;
    top.set(prefix, next);
    return `${prefix}${next}`;
  };
}

/**
 * Puts the payload in `view` with the top left of its placements at `at`: the parts get new ids and the next
 * reference designators, the wires between them and their nets come with them, and a part whose definition the
 * project does not pin brings its dependency first. Legs are not copied, so a pasted part never lands in a strip.
 */
export function pasteBatch(
  state: ProjectState,
  view: View,
  payload: ClipboardPayload,
  at: PointMm,
  ids: IdSource,
): { batch: Op[]; label: string; selection: Selectable[] } {
  const batch: Op[] = [];
  const pinned = new Set(state.dependencies.components.map((d) => `${d.ref}@${d.version}`));
  for (const dependency of payload.deps) {
    if (!pinned.has(`${dependency.ref}@${dependency.version}`)) batch.push({ k: "dep.set", dependency });
  }

  const refdes = refdesAllocator(state);
  const parts = new Map<string, string>();
  for (const component of payload.components) {
    const id = ids("cmp");
    parts.set(component.id, id);
    batch.push({ k: "component.add", component: { ...component, id, refdes: refdes(component.refdes) } });
  }
  for (const placement of payload.placements) {
    batch.push({
      k: "view.place",
      view: view.id,
      placement: { ...placement, c: parts.get(placement.c)!, x_mm: round2(placement.x_mm - payload.bbox.x0 + at.x), y_mm: round2(placement.y_mm - payload.bbox.y0 + at.y) },
    });
  }

  const nets = new Map<string, string>();
  for (const net of payload.nets) {
    const id = ids("net");
    nets.set(net.id, id);
    const connections = net.connections.map((pin) => ({ c: parts.get(pin.c)!, p: pin.p }));
    batch.push({ k: "net.create", net: { ...net, id, connections: connections as Net["connections"] } });
  }
  const selection: Selectable[] = [...parts.values()].map((id) => ({ kind: "part", view: view.id, id }));
  for (const wire of payload.wires) {
    const id = ids("wir");
    const end = (e: Wire["from"]): Wire["from"] => (e.kind === "pin" ? { kind: "pin", c: parts.get(e.c)!, p: e.p } : e);
    batch.push({ k: "wire.add", view: view.id, wire: { ...wire, id, net: nets.get(wire.net)!, from: end(wire.from), to: end(wire.to) } });
    selection.push({ kind: "wire", view: view.id, id });
  }
  const count = payload.components.length;
  return { batch, label: count === 1 ? "Paste part" : `Paste ${count} parts`, selection };
}

export type Clip = ClipboardPayload;

/** The copy of the given part ids in a view, ready to paste into this project or another. */
export function copyClip(state: ProjectState, viewId: string, selected: readonly string[]): Clip {
  const view = state.views.find((v) => v.id === viewId);
  if (!view) return { v: 1, components: [], placements: [], nets: [], wires: [], deps: [], bbox: { x0: 0, y0: 0, x1: 0, y1: 0 } };
  return copySelection(state, view, selected.map((id): Selectable => ({ kind: "part", view: viewId, id })));
}

/**
 * The ops that put a clip in a view with its top left at `at`. A clip that does not read as one, one that would not
 * fit in the view, or an unknown view gives no ops.
 */
export function pasteOps(state: ProjectState, viewId: string, clip: Clip, at: PointMm, newId: IdSource): Op[] {
  const view = state.views.find((v) => v.id === viewId);
  if (!view || !parseClipboard(JSON.stringify({ iynk: MARKER, ...clip }))) return [];
  if (view.placements.length + clip.placements.length > LIMITS.placementsPerView) return [];
  return pasteBatch(state, view, clip, at, newId).batch;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown, max = 64): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const isCoordinate = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= LIMITS.layoutAbsMm;
const listOf = (v: unknown, max: number): unknown[] | null => (Array.isArray(v) && v.length <= max ? v : null);

const WIRE_COLORS: readonly string[] = ["red", "black", "orange", "yellow", "green", "blue", "white", "purple", "brown", "grey"];
const NET_CLASSES: readonly string[] = ["signal", "power", "ground", "analog"];

function componentOf(raw: unknown): Component | null {
  if (!isObject(raw) || !isText(raw.id) || !isText(raw.refdes, 16) || !isObject(raw.definition)) return null;
  const { ref, version } = raw.definition;
  if (typeof ref !== "string" || !DEF_REF_PATTERN.test(ref) || !isText(version, 32)) return null;
  const component: Component = { id: raw.id, definition: { ref, version }, refdes: raw.refdes };
  if (raw.label !== undefined) {
    if (typeof raw.label !== "string" || raw.label.length > 200) return null;
    component.label = raw.label;
  }
  if (raw.locked !== undefined) {
    if (typeof raw.locked !== "boolean") return null;
    component.locked = raw.locked;
  }
  if (raw.params !== undefined) {
    if (!isObject(raw.params)) return null;
    const params: NonNullable<Component["params"]> = {};
    for (const [key, value] of Object.entries(raw.params)) {
      const plain = typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
      if (!plain) return null;
      params[key] = value;
    }
    component.params = params;
  }
  return component;
}

function placementOf(raw: unknown): Placement | null {
  if (!isObject(raw) || !isText(raw.c) || !isCoordinate(raw.x_mm) || !isCoordinate(raw.y_mm)) return null;
  const placement: Placement = { c: raw.c, x_mm: raw.x_mm, y_mm: raw.y_mm };
  if (raw.rotation_deg !== undefined) {
    if (typeof raw.rotation_deg !== "number" || !Number.isFinite(raw.rotation_deg)) return null;
    placement.rotation_deg = raw.rotation_deg;
  }
  if (raw.mirrored !== undefined) {
    if (typeof raw.mirrored !== "boolean") return null;
    placement.mirrored = raw.mirrored;
  }
  if (raw.layer !== undefined) {
    if (typeof raw.layer !== "number" || !Number.isInteger(raw.layer)) return null;
    placement.layer = raw.layer;
  }
  return placement;
}

const pinOf = (raw: unknown): { c: string; p: string } | null =>
  isObject(raw) && isText(raw.c) && typeof raw.p === "string" && PIN_ID_PATTERN.test(raw.p) ? { c: raw.c, p: raw.p } : null;

function netOf(raw: unknown): Net | null {
  if (!isObject(raw) || !isText(raw.id)) return null;
  const list = listOf(raw.connections, LIMITS.connectionsPerNet);
  const connections = list?.map(pinOf);
  if (!connections?.length || connections.includes(null)) return null;
  const net: Net = { id: raw.id, connections: connections as Net["connections"] };
  if (raw.class !== undefined) {
    if (typeof raw.class !== "string" || !NET_CLASSES.includes(raw.class)) return null;
    net.class = raw.class as NonNullable<Net["class"]>;
  }
  return net;
}

function wireOf(raw: unknown): Wire | null {
  if (!isObject(raw) || !isText(raw.id) || !isText(raw.net)) return null;
  const from = isObject(raw.from) && raw.from.kind === "pin" ? pinOf(raw.from) : null;
  const to = isObject(raw.to) && raw.to.kind === "pin" ? pinOf(raw.to) : null;
  if (!from || !to) return null;
  const wire: Wire = { id: raw.id, net: raw.net, from: { kind: "pin", ...from }, to: { kind: "pin", ...to } };
  if (raw.color !== undefined) {
    if (typeof raw.color !== "string" || !WIRE_COLORS.includes(raw.color)) return null;
    wire.color = raw.color as WireColor;
  }
  return wire;
}

function everyOf<T>(list: unknown[] | null, read: (raw: unknown) => T | null): T[] | null {
  const items = list?.map(read);
  return items && !items.includes(null) ? (items as T[]) : null;
}

function boxOf(raw: unknown): RectMm | null {
  if (!isObject(raw) || ![raw.x0, raw.y0, raw.x1, raw.y1].every(isCoordinate)) return null;
  return { x0: raw.x0 as number, y0: raw.y0 as number, x1: raw.x1 as number, y1: raw.y1 as number };
}

function depOf(raw: unknown): ComponentDependency | null {
  const op = { k: "dep.set", dependency: raw };
  return validateOp(op) ? (raw as ComponentDependency) : null;
}

/** Reads a payload from text another tab or another app handed over. Anything that is not exactly a version 1 payload gives null. */
export function parseClipboard(text: string): ClipboardPayload | null {
  if (text.length > MAX_CLIPBOARD_BYTES) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(raw) || raw.iynk !== MARKER || raw.v !== 1) return null;

  const components = everyOf(listOf(raw.components, LIMITS.components), componentOf);
  const placements = everyOf(listOf(raw.placements, LIMITS.placementsPerView), placementOf);
  const nets = everyOf(listOf(raw.nets, LIMITS.nets), netOf);
  const wires = everyOf(listOf(raw.wires, LIMITS.wiresPerView), wireOf);
  const deps = everyOf(listOf(raw.deps, LIMITS.components), depOf);
  const bbox = boxOf(raw.bbox);
  if (!components || !placements || !nets || !wires || !deps || !bbox) return null;

  const parts = new Set(components.map((c) => c.id));
  const netIds = new Set(nets.map((n) => n.id));
  const placed = new Set(placements.map((p) => p.c));
  const sound =
    parts.size === components.length &&
    netIds.size === nets.length &&
    new Set(wires.map((w) => w.id)).size === wires.length &&
    placed.size === placements.length &&
    placements.every((p) => parts.has(p.c)) &&
    components.every((c) => placed.has(c.id)) &&
    nets.every((n) => n.connections.every((pin) => parts.has(pin.c))) &&
    wires.every((w) => netIds.has(w.net) && [w.from, w.to].every((end) => end.kind === "pin" && parts.has(end.c)));
  return sound ? { v: 1, components, placements, nets, wires, deps, bbox } : null;
}

export interface Clipboard {
  /** The last copy, or null before the first one. */
  payload(): ClipboardPayload | null;
  copy(payload: ClipboardPayload): void;
  /** Takes a payload from pasted text. False when the text is not one. */
  ingest(text: string): boolean;
  /** How many times the current payload has been pasted, counting this one: the paste offsets itself by this many steps. */
  claim(): number;
}

export const pasteOffsetMm = (claim: number, snapMm: number): number => claim * PASTE_STEPS * snapMm;

/** Keeps the copy in memory and, when the browser allows it, as text on the system clipboard too. */
export function createClipboard(): Clipboard {
  let held: ClipboardPayload | null = null;
  let pastes = 0;
  return {
    payload: () => held,
    copy(payload) {
      held = payload;
      pastes = 0;
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(JSON.stringify({ iynk: MARKER, ...payload })).catch(() => {});
      }
    },
    ingest(text) {
      const payload = parseClipboard(text);
      if (!payload) return false;
      held = payload;
      pastes = 0;
      return true;
    },
    claim: () => ++pastes,
  };
}
