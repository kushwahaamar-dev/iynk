import { sha256Hex } from "../../core/sha256.ts";
import type { Net, PinRef, Placement, Wire, WireEnd } from "../generated/types.ts";
import { holeToPin, stripOfHole, surfaceInterface } from "../holes.ts";
import type { InterfaceSnapshot, SurfaceKind } from "../holes.ts";
import { pinIdFromLeg } from "../legacy-names.ts";
import type { BoardInterface } from "./interfaces.ts";
import type { FigureCircuit, ReportItem } from "./types.ts";

export const BOARD_INSTANCE = "brd_main";

const BOARD_X_MM = -90;
const NET_BODY_MAX = 64;
const PART_LEG = /^([A-Za-z_][\w-]*)\.([\w+~-]+)$/;

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^[^a-z0-9]+/, "");

/** The component instance id of a circuit part: `RES1` becomes `cmp_res1`. */
export const partInstance = (circuitPartId: string): string => `cmp_${slug(circuitPartId)}`;

export interface CircuitContext {
  /** Interface of each circuit part, by circuit part id. */
  parts: Map<string, InterfaceSnapshot>;
  /** Instance id of the breadboard. */
  surface: string;
  kind: SurfaceKind;
  /** Name for the report items; the circuit title when absent. */
  item?: string;
}

export interface CircuitNets {
  nets: Net[];
  wires: Wire[];
  placements: Placement[];
  report: ReportItem[];
}

interface PinNode {
  ref: PinRef;
  /** Short name for ids of unnamed nets: refdes and pin, lower case. */
  label: string;
  order: number;
}

interface ResolvedEnd {
  node: string;
  end: WireEnd;
  pin?: PinNode;
}

interface DrawnWire {
  index: number;
  color?: string;
  /** A node of the wire's class (both ends are in it). */
  node: string;
  from: WireEnd;
  to: WireEnd;
  label: string;
}

class UnionFind {
  private parent = new Map<string, string>();

  find(key: string): string {
    let root = this.parent.get(key) ?? key;
    while (root !== (this.parent.get(root) ?? root)) root = this.parent.get(root)!;
    this.parent.set(key, root);
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
}

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function unnamedNetId(labels: string[]): string {
  const key = labels.sort(byText).join("_");
  const body = slug(key);
  if (body.length <= NET_BODY_MAX) return `net_${body}`;
  const suffix = sha256Hex(key).slice(0, 8);
  return `net_${body.slice(0, NET_BODY_MAX - suffix.length - 1)}_${suffix}`;
}

function netClass(type: string): Net["class"] {
  if (type === "ground") return "ground";
  if (type.startsWith("power")) return "power";
  if (type === "analog_in") return "analog";
  return "signal";
}

/**
 * The nets, wires and placements a figure circuit means (PDM 11.4). Strips, rails, board pins and part legs are
 * nodes; the ends of every wire and the hole of every leg are joined; each class that holds a board pin or two pins
 * becomes a net. An endpoint that resolves to nothing is reported and its wire is left out, so no net is invented.
 */
export function circuitToNets(circuit: FigureCircuit, board: BoardInterface, ctx: CircuitContext): CircuitNets {
  const item = ctx.item ?? circuit.title ?? "circuit";
  const report: ReportItem[] = [];
  const reportCode = (code: ReportItem["code"], message: string, refs: string[]): void => {
    report.push({ item, code, message, refs });
  };

  const strips = stripOfHole(surfaceInterface(ctx.kind));
  const boardPins = new Map(board.snapshot.pins.map((p, i) => [p.id, { pin: p, order: i }]));
  const snapshots = new Map<string, InterfaceSnapshot>([[BOARD_INSTANCE, board.snapshot]]);
  const sets = new UnionFind();
  const pinNodes = new Map<string, PinNode>();

  const legNode = (c: string, p: string, label: string): string => {
    const key = `${c}/${p}`;
    if (!pinNodes.has(key)) pinNodes.set(key, { ref: { c, p }, label, order: 0 });
    return key;
  };
  const surfaceNode = (hole: string): string => `~${strips.get(hole) ?? hole}`;

  const placements: Placement[] = [
    { c: BOARD_INSTANCE, x_mm: BOARD_X_MM, y_mm: 0 },
    { c: ctx.surface, x_mm: 0, y_mm: 0 },
  ];

  for (const part of circuit.parts) {
    const instance = partInstance(part.id);
    const placement: Placement = { c: instance, x_mm: 0, y_mm: 0 };
    placements.push(placement);
    const snapshot = ctx.parts.get(part.id);
    if (!snapshot) {
      reportCode("unknown-part", `${part.id} (${part.part}) has no interface, so its legs are not connected`, [part.id]);
      continue;
    }
    snapshots.set(instance, snapshot);
    const holes = part.holes ?? [];
    if (holes.length === 0) continue;
    if (holes.length !== snapshot.pins.length) {
      reportCode("unresolved-endpoint", `${part.id} has ${holes.length} holes for ${snapshot.pins.length} legs`, [part.id]);
    }
    const legs: Record<string, string> = {};
    snapshot.pins.forEach((pin, i) => {
      const legacy = holes[i];
      if (legacy === undefined) return;
      const hole = holeToPin(ctx.kind, legacy);
      if (hole === null) {
        reportCode("unresolved-endpoint", `${part.id} leg ${pin.id}: hole "${legacy}" is not on the breadboard`, [part.id, legacy]);
        return;
      }
      legs[pin.id] = hole;
      sets.union(legNode(instance, pin.id, `${part.id.toLowerCase()}${pin.id.toLowerCase()}`), surfaceNode(hole));
    });
    if (Object.keys(legs).length > 0) placement.legs = legs;
  }

  const resolve = (ref: string): ResolvedEnd | null => {
    const hole = holeToPin(ctx.kind, ref);
    if (hole !== null) return { node: surfaceNode(hole), end: { kind: "hole", surface: ctx.surface, hole } };

    const leg = PART_LEG.exec(ref);
    const owner = leg && circuit.parts.find((p) => p.id === leg[1]);
    if (leg && owner) {
      const pins = ctx.parts.get(owner.id)?.pins ?? [];
      const pin = pins.find((p) => p.id === pinIdFromLeg(leg[2]!)) ?? pins.find((p) => p.id === leg[2]);
      if (pin) {
        const c = partInstance(owner.id);
        return { node: `${c}/${pin.id}`, end: { kind: "pin", c, p: pin.id }, pin: { ref: { c, p: pin.id }, label: `${owner.id.toLowerCase()}${pin.id.toLowerCase()}`, order: 0 } };
      }
    }

    const boardPin = board.refToPin(ref);
    const known = boardPin === null ? undefined : boardPins.get(boardPin);
    if (!known) return null;
    const p = known.pin.id;
    return { node: `${BOARD_INSTANCE}/${p}`, end: { kind: "pin", c: BOARD_INSTANCE, p }, pin: { ref: { c: BOARD_INSTANCE, p }, label: p, order: known.order } };
  };

  const drawn: DrawnWire[] = [];
  circuit.wires.forEach((wire, index) => {
    const from = resolve(wire.from);
    const to = resolve(wire.to);
    for (const [ref, end] of [[wire.from, from], [wire.to, to]] as const) {
      if (!end) reportCode("unresolved-endpoint", `wire ${index + 1}: "${ref}" is not a hole, a leg of this circuit or a pin of the board`, [`wire ${index + 1}`, ref]);
    }
    if (!from || !to) return;
    for (const { node, pin } of [from, to]) if (pin && !pinNodes.has(node)) pinNodes.set(node, pin);
    drawn.push({ index, color: wire.color, node: from.node, from: from.end, to: to.end, label: `${wire.from} to ${wire.to}` });
    sets.union(from.node, to.node);
  });

  const classes = new Map<string, PinNode[]>();
  for (const [key, node] of pinNodes) {
    const root = sets.find(key);
    const members = classes.get(root);
    if (members) members.push(node);
    else classes.set(root, [node]);
  }

  const joinsOneGroup = (members: PinNode[]): boolean => {
    const c = members[0]!.ref.c;
    if (members.length < 2 || members.some((m) => m.ref.c !== c)) return false;
    return (snapshots.get(c)?.groups ?? []).some(
      (g) => g.kind === "internal-short" && members.every((m) => g.pins.includes(m.ref.p)),
    );
  };

  const used = new Set<string>();
  const uniqueId = (id: string): string => {
    let next = id;
    for (let n = 2; used.has(next); n++) next = `${id}_${n}`;
    used.add(next);
    return next;
  };

  const netOfRoot = new Map<string, string>();
  const nets: Net[] = [];
  for (const [root, members] of classes) {
    const boardMembers = members.filter((m) => m.ref.c === BOARD_INSTANCE).sort((a, b) => a.order - b.order);
    if (boardMembers.length === 0 && (members.length < 2 || joinsOneGroup(members))) continue;
    const first = boardMembers[0] ? boardPins.get(boardMembers[0].ref.p)!.pin : null;
    const connections = members
      .map((m) => m.ref)
      .sort((a, b) => byText(a.c, b.c) || byText(a.p, b.p)) as Net["connections"];
    const id = uniqueId(first?.net ? `net_${slug(first.net) || "x"}` : unnamedNetId(members.map((m) => m.label)));
    const net: Net = { id, connections };
    if (first?.net) net.name = first.net;
    net.class = first ? netClass(first.type) : "signal";
    nets.push(net);
    netOfRoot.set(root, id);
  }
  nets.sort((a, b) => byText(a.id, b.id));

  const wires: Wire[] = [];
  for (const d of drawn) {
    const net = netOfRoot.get(sets.find(d.node));
    if (net === undefined) {
      reportCode("skipped", `wire ${d.index + 1} (${d.label}) joins no pin, so it has no net and is not kept`, [`wire ${d.index + 1}`]);
      continue;
    }
    const wire: Wire = { id: `wir_${d.index + 1}`, net, from: d.from, to: d.to };
    if (d.color) wire.color = d.color as Wire["color"];
    wires.push(wire);
  }

  placements.sort((a, b) => byText(a.c, b.c));
  return { nets, wires, placements, report };
}
