import { LIMITS } from "../../core/limits.ts";
import type { InterfacePin, Net, Op, PinRef, Project as ProjectState, View, Wire, WireEnd } from "../../project/generated/types.ts";
import { netlist } from "../../project/netlist.ts";
import type { InterfaceSnapshot } from "../../parts/pins.ts";
import type { IdSource } from "../views/breadboard.ts";

export const REFUSALS = [
  "same-pin",
  "no-such-pin",
  "mechanical-pin",
  "not-on-view",
  "hole-not-on-surface",
  "same-strip",
  "duplicate-wire",
  "empty-target",
  "quota",
  "permission",
  "read-only",
] as const;

export type Refusal = (typeof REFUSALS)[number];

export type WireEndRef = { kind: "pin"; c: string; p: string } | { kind: "hole"; surface: string; hole: string };

/** What the person may do with the open project: `viewer` is a room role, `read-only` an open that cannot save. */
export type Access = "edit" | "viewer" | "read-only";

export type Verdict = { ok: true } | { ok: false; code: Refusal; args: Record<string, string> };

export type StaticFlag = { rule: "short-circuit" | "output-contention"; net: string; pins: PinRef[] };

const pinKey = (c: string, p: string): string => `${c}\u0000${p}`;
const holeKey = (surface: string, hole: string): string => `${surface}\u0001${hole}`;

const endKey = (end: WireEnd): string => {
  if (end.kind === "pin") return pinKey(end.c, end.p);
  if (end.kind === "hole") return holeKey(end.surface, end.hole);
  return `\u0002${end.id}`;
};

const pairKey = (a: WireEnd, b: WireEnd): string => [endKey(a), endKey(b)].sort().join("\u0003");

export const sameEnd = (a: WireEndRef, b: WireEndRef): boolean => endKey(a) === endKey(b);

const toWireEnd = (end: WireEndRef): WireEnd => (end.kind === "pin" ? { kind: "pin", c: end.c, p: end.p } : { kind: "hole", surface: end.surface, hole: end.hole });

type IfaceIndex = {
  pins: Map<string, InterfacePin>;
  stripOfHole: Map<string, string>;
  /** Pins joined to a pin inside the part (`internal-short` and `plane` groups). */
  joined: Map<string, string[]>;
};

const ifaceIndexes = new WeakMap<InterfaceSnapshot, IfaceIndex>();

function ifaceIndex(iface: InterfaceSnapshot): IfaceIndex {
  const cached = ifaceIndexes.get(iface);
  if (cached) return cached;
  const index: IfaceIndex = { pins: new Map(iface.pins.map((p) => [p.id, p])), stripOfHole: new Map(), joined: new Map() };
  for (const group of iface.groups ?? []) {
    if (group.kind === "strip") {
      for (const pin of group.pins) index.stripOfHole.set(pin, group.id);
    } else {
      for (const pin of group.pins) index.joined.set(pin, [...(index.joined.get(pin) ?? []), ...group.pins.filter((other) => other !== pin)]);
    }
  }
  ifaceIndexes.set(iface, index);
  return index;
}

type StateIndex = {
  instances: Map<string, { refdes: string; iface: InterfaceSnapshot | undefined }>;
  netOfPin: Map<string, Net>;
  netById: Map<string, Net>;
};

const stateIndexes = new WeakMap<ProjectState, StateIndex>();

function stateIndex(state: ProjectState): StateIndex {
  const cached = stateIndexes.get(state);
  if (cached) return cached;
  const interfaces = new Map(state.dependencies.components.map((d) => [`${d.ref}@${d.version}`, d.interface]));
  const instances: StateIndex["instances"] = new Map();
  for (const inst of [...state.boards, ...state.components]) {
    instances.set(inst.id, { refdes: inst.refdes, iface: interfaces.get(`${inst.definition.ref}@${inst.definition.version}`) });
  }
  const netOfPin = new Map<string, Net>();
  for (const net of state.nets) for (const c of net.connections) netOfPin.set(pinKey(c.c, c.p), net);
  const index: StateIndex = { instances, netOfPin, netById: new Map(state.nets.map((n) => [n.id, n])) };
  stateIndexes.set(state, index);
  return index;
}

type Occupancy = { pins: PinRef[]; wires: Wire[] };

type ViewIndex = {
  surface: IfaceIndex | undefined;
  placed: Set<string>;
  wireKeys: Set<string>;
  /** What a strip holds: the pins whose legs sit in it and the wires that end in it. */
  strips: Map<string, Occupancy>;
  legStrip: Map<string, string>;
};

const viewIndexes = new WeakMap<View, ViewIndex & { iface: InterfaceSnapshot | undefined }>();

function viewIndex(ix: StateIndex, view: View): ViewIndex {
  const iface = view.surface === undefined ? undefined : ix.instances.get(view.surface)?.iface;
  const cached = viewIndexes.get(view);
  if (cached && cached.iface === iface) return cached;

  const surface = iface && ifaceIndex(iface);
  const strips = new Map<string, Occupancy>();
  const legStrip = new Map<string, string>();
  const occupancy = (strip: string): Occupancy => {
    let held = strips.get(strip);
    if (!held) strips.set(strip, (held = { pins: [], wires: [] }));
    return held;
  };
  for (const pl of view.placements) {
    for (const [leg, hole] of Object.entries(pl.legs ?? {})) {
      const strip = hole === undefined ? undefined : surface?.stripOfHole.get(hole);
      if (strip === undefined) continue;
      occupancy(strip).pins.push({ c: pl.c, p: leg });
      legStrip.set(pinKey(pl.c, leg), strip);
    }
  }
  for (const wire of view.wires) {
    for (const end of [wire.from, wire.to]) {
      const strip = end.kind === "hole" && end.surface === view.surface ? surface?.stripOfHole.get(end.hole) : undefined;
      if (strip === undefined) continue;
      const held = occupancy(strip);
      if (!held.wires.includes(wire)) held.wires.push(wire);
    }
  }
  const index = {
    iface,
    surface,
    placed: new Set(view.placements.map((p) => p.c)),
    wireKeys: new Set(view.wires.map((w) => pairKey(w.from, w.to))),
    strips,
    legStrip,
  };
  viewIndexes.set(view, index);
  return index;
}

function viewOf(state: ProjectState, viewId: string): View {
  const view = state.views.find((v) => v.id === viewId);
  if (!view) throw new RangeError(`no view ${viewId}`);
  return view;
}

export function endLabel(state: ProjectState, end: WireEndRef): string {
  if (end.kind === "hole") return end.hole;
  return `${stateIndex(state).instances.get(end.c)?.refdes ?? end.c}.${end.p}`;
}

const refuse = (code: Refusal, args: Record<string, string> = {}): Verdict => ({ ok: false, code, args });

function checkEnd(state: ProjectState, ix: StateIndex, view: View, vx: ViewIndex, end: WireEndRef): Verdict | null {
  if (end.kind === "hole") {
    if (end.surface !== view.surface || !vx.surface?.stripOfHole.has(end.hole)) return refuse("hole-not-on-surface", { hole: end.hole });
    return null;
  }
  const inst = ix.instances.get(end.c);
  const pin = inst?.iface && ifaceIndex(inst.iface).pins.get(end.p);
  if (!inst || !pin) return refuse("no-such-pin", { end: endLabel(state, end) });
  if (pin.type === "mechanical" || pin.class === "mechanical") return refuse("mechanical-pin", { end: endLabel(state, end) });
  if (!vx.placed.has(end.c)) return refuse("not-on-view", { part: inst.refdes });
  return null;
}

/** The nets a wire between these ends joins and the pins that are in no net yet. A strip stands for everything held in it. */
function planEnds(ix: StateIndex, vx: ViewIndex, ends: readonly WireEndRef[]): { nets: string[]; pins: PinRef[] } {
  const nets = new Set<string>();
  const free = new Map<string, PinRef>();
  const take = (c: string, p: string) => {
    const net = ix.netOfPin.get(pinKey(c, p));
    if (net) nets.add(net.id);
    else free.set(pinKey(c, p), { c, p });
  };
  for (const end of ends) {
    if (end.kind === "pin") {
      take(end.c, end.p);
      continue;
    }
    const held = vx.strips.get(vx.surface?.stripOfHole.get(end.hole) ?? "");
    for (const pin of held?.pins ?? []) take(pin.c, pin.p);
    for (const wire of held?.wires ?? []) nets.add(wire.net);
  }
  return { nets: [...nets], pins: [...free.values()] };
}

/**
 * Whether a wire may be drawn between `a` and `b`; `b` is null when a drag ended on empty canvas. Electrical mistakes
 * are not refused (STUDIO 7.2): they come back from `wireRecipe` as flags.
 */
export function canConnect(state: ProjectState, viewId: string, a: WireEndRef, b: WireEndRef | null, access: Access = "edit"): Verdict {
  if (access === "read-only") return refuse("read-only");
  if (access === "viewer") return refuse("permission");
  const view = viewOf(state, viewId);
  const ix = stateIndex(state);
  const vx = viewIndex(ix, view);

  if (b !== null && sameEnd(a, b)) return refuse("same-pin", { end: endLabel(state, a) });
  const bad = checkEnd(state, ix, view, vx, a);
  if (bad) return bad;
  if (b === null) return refuse("empty-target");
  const badTarget = checkEnd(state, ix, view, vx, b);
  if (badTarget) return badTarget;

  if (a.kind === "hole" && b.kind === "hole" && vx.surface!.stripOfHole.get(a.hole) === vx.surface!.stripOfHole.get(b.hole)) {
    return refuse("same-strip", { a: a.hole, b: b.hole });
  }
  if (vx.wireKeys.has(pairKey(toWireEnd(a), toWireEnd(b)))) {
    return refuse("duplicate-wire", { a: endLabel(state, a), b: endLabel(state, b) });
  }

  const plan = planEnds(ix, vx, [a, b]);
  if (plan.nets.length === 0 && plan.pins.length === 0) return refuse("empty-target");
  if (view.wires.length >= LIMITS.wiresPerView) return refuse("quota", { limit: String(LIMITS.wiresPerView) });
  if (plan.nets.length === 0 && state.nets.length >= LIMITS.nets) return refuse("quota", { limit: String(LIMITS.nets) });
  const size = plan.pins.length + plan.nets.reduce((sum, id) => sum + ix.netById.get(id)!.connections.length, 0);
  if (size > LIMITS.connectionsPerNet) return refuse("quota", { limit: String(LIMITS.connectionsPerNet) });
  return { ok: true };
}

/** The ops that put `pins` and the nets `nets` into one net, and that net's id. With no net to join, a new one is made. */
function joinOps(nets: readonly string[], pins: readonly PinRef[], ids: IdSource): { ops: Op[]; net: string } {
  const [into, ...rest] = nets;
  if (into === undefined) {
    const id = ids("net");
    return { ops: [{ k: "net.create", net: { id, connections: [...pins] as Net["connections"] } }], net: id };
  }
  return {
    ops: [...rest.map((from): Op => ({ k: "net.merge", into, from })), ...pins.map((pin): Op => ({ k: "net.connect", net: into, pin }))],
    net: into,
  };
}

/**
 * The batch for one wire: the net ops it needs (`net.create`, `net.connect`, `net.merge`; none when both ends are
 * already one net), then `wire.add`. The caller checks `canConnect` first.
 */
export function wireRecipe(
  state: ProjectState,
  viewId: string,
  a: WireEndRef,
  b: WireEndRef,
  ids: IdSource,
): { batch: Op[]; label: string; flags: StaticFlag[] } {
  const view = viewOf(state, viewId);
  const ix = stateIndex(state);
  const plan = planEnds(ix, viewIndex(ix, view), [a, b]);
  if (plan.nets.length === 0 && plan.pins.length === 0) throw new RangeError("a wire needs a pin in at least one of its ends");

  const joined = joinOps(plan.nets, plan.pins, ids);
  const wire: Wire = { id: ids("wir"), net: joined.net, from: toWireEnd(a), to: toWireEnd(b) };
  const members = [...plan.pins, ...plan.nets.flatMap((id) => ix.netById.get(id)!.connections)];
  return {
    batch: [...joined.ops, { k: "wire.add", view: viewId, wire }],
    label: `Wire ${endLabel(state, a)} to ${endLabel(state, b)}`,
    flags: flagsOf(ix, joined.net, withJoined(ix, members)),
  };
}

/**
 * The net ops for the legs of part `c` landing in the holes `legs` (pin to hole), to go in the same batch as the
 * `view.place` that carries them (STUDIO 7.3). A strip conducts, so a leg joins what the strip already holds. A leg
 * that leaves a strip takes its pin out of the net, or splits the net, when the strip was all that joined them.
 */
export function legRecipe(state: ProjectState, viewId: string, c: string, legs: Record<string, string>, ids: IdSource): Op[] {
  const view = viewOf(state, viewId);
  const ix = stateIndex(state);
  const vx = viewIndex(ix, view);
  const stripOf = (hole: string | undefined): string | undefined => (hole === undefined ? undefined : vx.surface?.stripOfHole.get(hole));
  const seat = { c, legs };

  const netOf = new Map([...ix.netOfPin].map(([key, net]) => [key, net.id]));
  const merged = new Map<string, string>();
  const rewired = new Map<string, string>();
  const canon = (id: string): string => {
    const next = merged.get(id);
    return next === undefined ? id : canon(next);
  };
  const currentNet = (pin: PinRef): string | undefined => {
    const id = netOf.get(pinKey(pin.c, pin.p));
    return id === undefined ? undefined : canon(id);
  };
  const wiredToPin = (pin: PinRef): boolean =>
    state.views.some((v) => v.wires.some((w) => [w.from, w.to].some((end) => end.kind === "pin" && end.c === pin.c && end.p === pin.p)));
  const stripOfPin = (pin: PinRef): string | undefined => (pin.c === c ? stripOf(legs[pin.p]) : vx.legStrip.get(pinKey(pin.c, pin.p)));

  const ops: Op[] = [];
  const old = view.placements.find((p) => p.c === c)?.legs ?? {};
  const moved = new Set(Object.keys(old).filter((leg) => stripOf(old[leg]) !== stripOf(legs[leg])));
  const affected = new Set([...moved].flatMap((leg) => ix.netOfPin.get(pinKey(c, leg))?.id ?? []));
  for (const id of affected) {
    const net = ix.netById.get(id)!;
    const before = groupsOf(ix, view, vx, net);
    const after = groupsOf(ix, view, vx, net, undefined, seat);
    const reach = new Set(before.filter((group) => group.some((pin) => pin.c === c && moved.has(pin.p))).flatMap((group) => group.map((pin) => pinKey(pin.c, pin.p))));
    const touched = after.filter((group) => group.some((pin) => reach.has(pinKey(pin.c, pin.p))));
    if (touched.length < 2) continue;

    const bare = (group: PinRef[]): boolean => {
      const strips = new Set(group.flatMap((pin) => stripOfPin(pin) ?? []));
      return view.wires.some((w) => w.net === id && w.from.kind === "hole" && w.to.kind === "hole" && (strips.has(stripOf(w.from.hole) ?? "") || strips.has(stripOf(w.to.hole) ?? "")));
    };
    const keep = touched.find(bare) ?? touched[0]!;
    for (const group of touched.filter((g) => g !== keep)) {
      if (group.length === 1 && !wiredToPin(group[0]!)) {
        ops.push({ k: "net.disconnect", pin: group[0]! });
        netOf.delete(pinKey(group[0]!.c, group[0]!.p));
        continue;
      }
      const into = ids("net");
      ops.push({ k: "net.split", net: id, into, pins: group as Net["connections"] });
      for (const pin of group) netOf.set(pinKey(pin.c, pin.p), into);
      for (const wire of view.wires) {
        if (wire.net === id && [wire.from, wire.to].some((end) => end.kind === "pin" && group.some((pin) => pin.c === end.c && pin.p === end.p))) rewired.set(wire.id, into);
      }
    }
  }

  const landed = new Map<string, PinRef[]>();
  for (const [leg, hole] of Object.entries(legs)) {
    const strip = stripOf(hole);
    if (strip === undefined) continue;
    const pin = { c, p: leg };
    const occupancy = vx.strips.get(strip);
    const mates = landed.get(strip) ?? [];
    const members = [...(occupancy?.pins ?? []).filter((m) => m.c !== c), ...mates, pin];
    landed.set(strip, [...mates, pin]);

    const nets = new Set((occupancy?.wires ?? []).map((w) => canon(rewired.get(w.id) ?? w.net)));
    const free: PinRef[] = [];
    for (const member of members) {
      const net = currentNet(member);
      if (net === undefined) free.push(member);
      else nets.add(net);
    }
    if (nets.size + free.length < 2) continue;

    const joined = joinOps([...nets], free, ids);
    ops.push(...joined.ops);
    for (const member of free) netOf.set(pinKey(member.c, member.p), joined.net);
    for (const from of [...nets].slice(1)) merged.set(from, joined.net);
  }
  return ops;
}

/** Union-find over strings, small enough to write where it is used. */
function unionFind() {
  const parent = new Map<string, string>();
  const find = (key: string): string => {
    const up = parent.get(key);
    if (up === undefined || up === key) {
      parent.set(key, key);
      return key;
    }
    const root = find(up);
    parent.set(key, root);
    return root;
  };
  return { find, union: (a: string, b: string) => void parent.set(find(a), find(b)) };
}

/**
 * The pins of `net` grouped by what the view connects: its wires (except `without`), the strips their legs and wire
 * ends sit in, junctions and the shorts inside a part. With `seat`, the legs of that part are the ones given, not the
 * ones in the view. The largest group comes first.
 */
function groupsOf(
  ix: StateIndex,
  view: View,
  vx: ViewIndex,
  net: Net,
  without?: string,
  seat?: { c: string; legs: Record<string, string> },
): PinRef[][] {
  const sets = unionFind();
  const nodeOf = (end: WireEnd): string | null => {
    if (end.kind === "pin") return `p${pinKey(end.c, end.p)}`;
    if (end.kind === "junction") return `j${end.id}`;
    const strip = end.surface === view.surface ? vx.surface?.stripOfHole.get(end.hole) : undefined;
    return strip === undefined ? null : `s${strip}`;
  };
  for (const { c, p } of net.connections) {
    const here = `p${pinKey(c, p)}`;
    sets.find(here);
    const hole = seat?.c === c ? seat.legs[p] : undefined;
    const strip = seat?.c === c ? (hole === undefined ? undefined : vx.surface?.stripOfHole.get(hole)) : vx.legStrip.get(pinKey(c, p));
    if (strip !== undefined) sets.union(here, `s${strip}`);
    const iface = ix.instances.get(c)?.iface;
    for (const mate of (iface && ifaceIndex(iface).joined.get(p)) ?? []) sets.union(here, `p${pinKey(c, mate)}`);
  }
  for (const wire of view.wires) {
    if (wire.net !== net.id || wire.id === without) continue;
    const from = nodeOf(wire.from);
    const to = nodeOf(wire.to);
    if (from !== null && to !== null) sets.union(from, to);
  }

  const groups = new Map<string, PinRef[]>();
  for (const { c, p } of net.connections) {
    const root = sets.find(`p${pinKey(c, p)}`);
    groups.set(root, [...(groups.get(root) ?? []), { c, p }]);
  }
  return [...groups.values()].sort((x, y) => y.length - x.length);
}

/** The pins of a net grouped by what the view connects. The largest group comes first. */
export function connectedGroups(state: ProjectState, viewId: string, netId: string, without?: string): PinRef[][] {
  const view = viewOf(state, viewId);
  const ix = stateIndex(state);
  const net = ix.netById.get(netId);
  return net ? groupsOf(ix, view, viewIndex(ix, view), net, without) : [];
}

/** Deleting this wire: whether it was the only link between parts of its net, and the parts, the one to keep first. */
export function cutAnalysis(state: ProjectState, viewId: string, wireId: string): { splits: boolean; groups: PinRef[][] } {
  const wire = viewOf(state, viewId).wires.find((w) => w.id === wireId);
  if (!wire) throw new RangeError(`no wire ${wireId}`);
  const groups = connectedGroups(state, viewId, wire.net, wireId);
  return { splits: groups.length > 1, groups };
}

function withJoined(ix: StateIndex, pins: readonly PinRef[]): PinRef[] {
  const all = new Map(pins.map((pin) => [pinKey(pin.c, pin.p), pin]));
  for (const { c, p } of pins) {
    const iface = ix.instances.get(c)?.iface;
    for (const mate of (iface && ifaceIndex(iface).joined.get(p)) ?? []) all.set(pinKey(c, mate), { c, p: mate });
  }
  return [...all.values()];
}

function flagsOf(ix: StateIndex, net: string, pins: readonly PinRef[]): StaticFlag[] {
  const typed = (types: readonly string[]) =>
    pins.filter((pin) => {
      const iface = ix.instances.get(pin.c)?.iface;
      const type = iface && ifaceIndex(iface).pins.get(pin.p)?.type;
      return type !== undefined && types.includes(type);
    });
  const grounds = typed(["ground"]);
  const sources = typed(["power_out", "power_io"]);
  const supplies = typed(["power_out"]);
  const drivers = typed(["digital_out"]);

  const flags: StaticFlag[] = [];
  if (grounds.length > 0 && sources.length > 0) flags.push({ rule: "short-circuit", net, pins: [...sources, ...grounds] });
  const fighting = supplies.length > 1 || drivers.length > 1 || (drivers.length > 0 && supplies.length + grounds.length > 0);
  if (fighting) flags.push({ rule: "output-contention", net, pins: [...supplies, ...drivers, ...(drivers.length > 0 ? grounds : [])] });
  return flags;
}

/** Electrical mistakes the pin types alone settle, for the electrical nodes holding these nets. Advisory: nothing is refused. */
export function staticFlags(state: ProjectState, nets: string[]): StaticFlag[] {
  const ix = stateIndex(state);
  const nodes = netlist(state).nodes;
  const seen = new Set<string>();
  return nets.flatMap((id) => {
    const node = nodes.find((n) => n.nets.includes(id));
    if (!node || seen.has(node.id)) return [];
    seen.add(node.id);
    return flagsOf(ix, id, node.pins);
  });
}
