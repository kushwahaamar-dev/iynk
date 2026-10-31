import type { Op, Placement, Project as ProjectState } from "../../project/generated/types.ts";
import { netlist } from "../../project/netlist.ts";
import type { Netlist, NetlistNode } from "../../project/netlist.ts";
import type { PartRegistry } from "../../parts/registry.ts";
import { symbolFor, symbolForInterface } from "./symbols.ts";
import type { SymbolPin, SymbolShape, SymbolSide } from "./symbols.ts";

/** `x_mm`, `y_mm` are the top-left corner of the unrotated symbol; a rotation or mirror turns it about its centre. */
export interface SchematicNode {
  c: string;
  refdes: string;
  x_mm: number;
  y_mm: number;
  rotation_deg: number;
  mirrored: boolean;
  auto: boolean;
  shape: SymbolShape;
}

/** `net` is the id of the netlist node the link belongs to; `pins` are the `c.p` pins it reaches. */
export interface SchematicLink {
  net: string;
  points_mm: [number, number][];
  pins: string[];
}

export interface SchematicLabel {
  net: string;
  text: string;
  x_mm: number;
  y_mm: number;
  pin: string;
}

export interface SchematicScene {
  nodes: SchematicNode[];
  links: SchematicLink[];
  labels: SchematicLabel[];
}

export class SchematicError extends Error {
  constructor(readonly code: "no-such-view") {
    super(`schematic: ${code}`);
    this.name = "SchematicError";
  }
}

const LAYER_GAP_MM = 20;
const STACK_GAP_MM = 20;
const STUB_MM = 5.08;
const MAX_LINKED_PINS = 4;
const MIN_PINS_TO_LINK = 2;
const QUANTUM = 1000;

const round3 = (n: number): number => Math.round(n * QUANTUM) / QUANTUM;
const natural = new Intl.Collator("en", { numeric: true }).compare;
const pinKey = (c: string, p: string): string => `${c}.${p}`;

type Instance = { id: string; refdes: string; ref: string; version: string; isBoard: boolean };

const SIDE_VECTOR: Record<SymbolSide, [number, number]> = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };

function instancesOf(state: ProjectState): Instance[] {
  return [
    ...state.boards.map((b) => ({ id: b.id, refdes: b.refdes, ref: b.definition.ref, version: b.definition.version, isBoard: true })),
    ...state.components.map((c) => ({ id: c.id, refdes: c.refdes, ref: c.definition.ref, version: c.definition.version, isBoard: false })),
  ];
}

function shapesOf(state: ProjectState, reg: PartRegistry, instances: readonly Instance[]): Map<string, SymbolShape> {
  const cache = new Map<string, SymbolShape>();
  const shapes = new Map<string, SymbolShape>();
  for (const inst of instances) {
    const key = `${inst.ref}@${inst.version}`;
    let shape = cache.get(key);
    if (!shape) {
      const descriptor = reg.get(inst.ref, inst.version);
      const pinned = state.dependencies.components.find((d) => d.ref === inst.ref && d.version === inst.version);
      shape = descriptor ? symbolFor(descriptor) : symbolForInterface(pinned?.interface ?? { role: inst.isBoard ? "board" : "part", pins: [], params: [] });
      cache.set(key, shape);
    }
    shapes.set(inst.id, shape);
  }
  return shapes;
}

const isRail = (state: ProjectState, node: NetlistNode): boolean =>
  node.nets.some((id) => {
    const cls = state.nets.find((n) => n.id === id)?.class;
    return cls === "power" || cls === "ground";
  });

function viewOf(state: ProjectState, viewId: string) {
  return state.views.find((v) => v.id === viewId);
}

/**
 * Parts go in columns by hops from a board over shared nets, power and ground nets ignored (they join everything).
 * Columns are spaced by their widest symbol, parts in a column are stacked in refdes order, and parts no board reaches
 * form the last column. The same document always gives the same placements.
 */
function layOut(state: ProjectState, instances: readonly Instance[], shapes: ReadonlyMap<string, SymbolShape>, nl: Netlist): Placement[] {
  const byId = new Map(instances.map((i) => [i.id, i]));
  const neighbours = new Map<string, Set<string>>();
  for (const node of nl.nodes) {
    if (isRail(state, node)) continue;
    const members = [...new Set(node.pins.map((p) => p.c))].filter((c) => byId.has(c));
    for (const a of members) {
      for (const b of members) {
        if (a === b) continue;
        const set = neighbours.get(a);
        if (set) set.add(b);
        else neighbours.set(a, new Set([b]));
      }
    }
  }

  const order = (ids: string[]): string[] => ids.sort((a, b) => natural(byId.get(a)!.refdes, byId.get(b)!.refdes) || natural(a, b));
  const seen = new Set<string>();
  const layers: string[][] = [];
  let frontier = order(instances.filter((i) => i.isBoard).map((i) => i.id));
  while (frontier.length > 0) {
    layers.push(frontier);
    for (const id of frontier) seen.add(id);
    const next = new Set<string>();
    for (const id of frontier) for (const other of neighbours.get(id) ?? []) if (!seen.has(other)) next.add(other);
    frontier = order([...next]);
  }
  const rest = order(instances.filter((i) => !seen.has(i.id)).map((i) => i.id));
  if (rest.length > 0) layers.push(rest);

  const placements: Placement[] = [];
  let x = 0;
  for (const layer of layers) {
    let y = 0;
    for (const id of layer) {
      placements.push({ c: id, x_mm: round3(x), y_mm: round3(y) });
      y += shapes.get(id)!.h_mm + STACK_GAP_MM;
    }
    x += Math.max(...layer.map((id) => shapes.get(id)!.w_mm)) + LAYER_GAP_MM;
  }
  return placements;
}

function context(state: ProjectState, reg: PartRegistry) {
  const instances = instancesOf(state);
  const shapes = shapesOf(state, reg, instances);
  const nl = netlist(state);
  return { instances, shapes, nl };
}

/** Placements for every part and board, from the nets alone. */
export function autoLayout(state: ProjectState, viewId: string, reg: PartRegistry): Placement[] {
  if (!viewOf(state, viewId)) return [];
  const { instances, shapes, nl } = context(state, reg);
  return layOut(state, instances, shapes, nl);
}

function turn(x: number, y: number, rotation: number, mirrored: boolean): [number, number] {
  const mx = mirrored ? -x : x;
  switch (((rotation % 360) + 360) % 360) {
    case 90:
      return [-y, mx];
    case 180:
      return [-mx, -y];
    case 270:
      return [y, -mx];
    default:
      return [mx, y];
  }
}

/** Where a pin sits on the sheet, and the way it faces. */
export function pinPoint(node: SchematicNode, pin: SymbolPin): { x_mm: number; y_mm: number; dx: number; dy: number } {
  const { w_mm, h_mm } = node.shape;
  const [px, py] = turn(pin.x_mm - w_mm / 2, pin.y_mm - h_mm / 2, node.rotation_deg, node.mirrored);
  const [dx, dy] = turn(...SIDE_VECTOR[pin.side], node.rotation_deg, node.mirrored);
  return { x_mm: round3(node.x_mm + w_mm / 2 + px), y_mm: round3(node.y_mm + h_mm / 2 + py), dx, dy };
}

export function buildSchematicScene(state: ProjectState, viewId: string, reg: PartRegistry): SchematicScene {
  const view = viewOf(state, viewId);
  if (!view) throw new SchematicError("no-such-view");
  const { instances, shapes, nl } = context(state, reg);
  const stored = new Map(view.placements.map((p) => [p.c, p]));
  const auto = new Map(layOut(state, instances, shapes, nl).map((p) => [p.c, p]));

  const nodes: SchematicNode[] = [];
  const hidden = new Set<string>();
  const byId = new Map<string, SchematicNode>();
  for (const inst of instances) {
    const own = stored.get(inst.id);
    const at = own ?? auto.get(inst.id)!;
    const node: SchematicNode = {
      c: inst.id,
      refdes: inst.refdes,
      x_mm: at.x_mm,
      y_mm: at.y_mm,
      rotation_deg: at.rotation_deg ?? 0,
      mirrored: at.mirrored ?? false,
      auto: own === undefined,
      shape: shapes.get(inst.id)!,
    };
    byId.set(inst.id, node);
    if (own?.hidden) hidden.add(inst.id);
    else nodes.push(node);
  }

  const netOrder = new Map(state.nets.map((n, i) => [n.id, i]));
  const links: SchematicLink[] = [];
  const labels: SchematicLabel[] = [];
  for (const node of nl.nodes) {
    const ends = node.pins.flatMap((ref) => {
      const owner = byId.get(ref.c);
      const pin = owner?.shape.pins.find((p) => p.pin === ref.p);
      return owner && pin ? [{ key: pinKey(ref.c, ref.p), hidden: hidden.has(ref.c), ...pinPoint(owner, pin) }] : [];
    });
    if (ends.length === 0) continue;
    const first = Math.min(...node.nets.map((id) => netOrder.get(id) ?? Infinity));
    const text = node.names[0] ?? `N${first + 1}`;
    const routed = ends.length >= MIN_PINS_TO_LINK && ends.length <= MAX_LINKED_PINS && !isRail(state, node) && ends.every((e) => !e.hidden);
    if (routed) {
      const sorted = [...ends].sort((a, b) => a.x_mm - b.x_mm || a.y_mm - b.y_mm);
      for (let i = 1; i < sorted.length; i++) {
        const a = sorted[i - 1]!;
        const b = sorted[i]!;
        const mid = round3((a.x_mm + b.x_mm) / 2);
        links.push({
          net: node.id,
          points_mm: [[a.x_mm, a.y_mm], [mid, a.y_mm], [mid, b.y_mm], [b.x_mm, b.y_mm]],
          pins: [a.key, b.key],
        });
      }
      continue;
    }
    for (const end of ends) {
      const tip = { x_mm: round3(end.x_mm + end.dx * STUB_MM), y_mm: round3(end.y_mm + end.dy * STUB_MM) };
      if (!end.hidden) links.push({ net: node.id, points_mm: [[end.x_mm, end.y_mm], [tip.x_mm, tip.y_mm]], pins: [end.key] });
      labels.push({ net: node.id, text, x_mm: end.hidden ? end.x_mm : tip.x_mm, y_mm: end.hidden ? end.y_mm : tip.y_mm, pin: end.key });
    }
  }
  return { nodes, links, labels };
}

/** The pins each net reaches in the drawing, as `c.p` strings. Nets of one pin are left out, as in the netlist comparison. */
export function schematicNetSets(scene: SchematicScene): Set<string>[] {
  const sets = new Map<string, Set<string>>();
  const add = (net: string, pins: readonly string[]) => {
    const set = sets.get(net);
    if (set) for (const pin of pins) set.add(pin);
    else sets.set(net, new Set(pins));
  };
  for (const link of scene.links) add(link.net, link.pins);
  for (const label of scene.labels) add(label.net, [label.pin]);
  return [...sets.values()].filter((set) => set.size >= MIN_PINS_TO_LINK);
}

const SCHEMATIC_VIEW = "vw_sch";

/** Adds the schematic view a project lacks; nothing when it has one. */
export function ensureSchematicView(state: ProjectState): Op[] {
  if (state.views.some((v) => v.kind === "schematic")) return [];
  const taken = new Set(state.views.map((v) => v.id));
  let id = SCHEMATIC_VIEW;
  for (let n = 2; taken.has(id); n++) id = `${SCHEMATIC_VIEW}${n}`;
  return [{ k: "view.add", view: { id, kind: "schematic", name: "Schematic", placements: [], wires: [] } }];
}
