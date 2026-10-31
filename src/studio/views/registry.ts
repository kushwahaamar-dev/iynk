import type { Op, Project as ProjectState } from "../../project/generated/types.ts";
import type { PartRegistry } from "../../parts/registry.ts";
import { PIN_RADIUS_MM } from "../engine/constants.ts";
import type { ArtElement, DrawItem, DrawList, HitTarget, PointMm, RectMm } from "../engine/types.ts";
import { ensureBoardView } from "./board.ts";
import { buildSchematicScene, ensureSchematicView, pinPoint } from "./schematic.ts";
import type { SchematicNode } from "./schematic.ts";

export const VIEW_KINDS = ["breadboard", "schematic", "board"] as const;
export type ViewKind = (typeof VIEW_KINDS)[number];

export interface ViewDef {
  kind: ViewKind;
  labelKey: `views.tab.${ViewKind}`;
  surface: "canvas" | "dom";
  ensure(state: ProjectState): Op[];
  scene?(state: ProjectState, viewId: string, reg: PartRegistry): DrawList;
}

const Z_NODE = 10;
const Z_LINK = 100;
const Z_LABEL = 200;
const INK = "var(--studio-ink)";
const SYMBOL_SW = 0.3;
const LINK_SW = 0.3;
const TEXT_MM = 2;
const AUTO_MARK = "auto";
const MARK_MM = 1.4;
const MARK_GAP_MM = 0.8;

const boundsOf = (points: readonly PointMm[], pad = 0): RectMm => ({
  x0: Math.min(...points.map((p) => p.x)) - pad,
  y0: Math.min(...points.map((p) => p.y)) - pad,
  x1: Math.max(...points.map((p) => p.x)) + pad,
  y1: Math.max(...points.map((p) => p.y)) + pad,
});

function place(node: SchematicNode, x: number, y: number): PointMm {
  const p = pinPoint(node, { pin: "", x_mm: x, y_mm: y, side: "left", label: "" });
  return { x: p.x_mm, y: p.y_mm };
}

const PATH_TOKEN = /([MLHVAZ])|(-?\d*\.?\d+)/g;
const ARG_COUNT: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, A: 7, Z: 0 };

/** Symbol paths use absolute M, L, H, V, A and Z. The result is the same path in sheet millimetres, turned and mirrored like the node. */
function placePath(d: string, node: SchematicNode): string {
  const tokens = [...d.matchAll(PATH_TOKEN)].map((m) => m[1] ?? Number(m[2]));
  let out = "";
  let cur: PointMm = { x: 0, y: 0 };
  for (let i = 0; i < tokens.length; ) {
    const cmd = tokens[i++] as string;
    const args = tokens.slice(i, i + ARG_COUNT[cmd]!) as unknown as number[];
    i += args.length;
    if (cmd === "Z") {
      out += "Z";
      continue;
    }
    if (cmd === "A") {
      const [rx, ry, rot, large, sweep, x, y] = args as [number, number, number, number, number, number, number];
      cur = { x, y };
      const to = place(node, x, y);
      out += `A${rx} ${ry} ${rot} ${large} ${node.mirrored ? 1 - sweep : sweep} ${to.x} ${to.y}`;
      continue;
    }
    cur = cmd === "H" ? { x: args[0]!, y: cur.y } : cmd === "V" ? { x: cur.x, y: args[0]! } : { x: args[0]!, y: args[1]! };
    const to = place(node, cur.x, cur.y);
    out += `${cmd === "M" ? "M" : "L"}${to.x} ${to.y}`;
  }
  return out;
}

function nodeItem(node: SchematicNode): { item: DrawItem; targets: HitTarget[] } {
  const { shape } = node;
  const corners = [place(node, 0, 0), place(node, shape.w_mm, 0), place(node, shape.w_mm, shape.h_mm), place(node, 0, shape.h_mm)];
  const bbox = boundsOf(corners);
  const elements: ArtElement[] = shape.paths.map((d) => ({ t: "path", d: placePath(d, node), stroke: INK, sw: SYMBOL_SW }));
  const targets: HitTarget[] = [{ item: node.c, hit: { kind: "part", c: node.c }, bbox }];
  for (const pin of shape.pins) {
    const p = pinPoint(node, pin);
    elements.push({ t: "circle", cx: p.x_mm, cy: p.y_mm, r: PIN_RADIUS_MM, fill: "var(--studio-pin)" });
    targets.push({ item: node.c, hit: { kind: "pin", c: node.c, p: pin.pin }, bbox: boundsOf([{ x: p.x_mm, y: p.y_mm }], PIN_RADIUS_MM) });
  }
  const label = place(node, shape.label.x_mm, shape.label.y_mm);
  elements.push({ t: "text", x: label.x, y: label.y, s: node.refdes, size: TEXT_MM, anchor: "middle" });
  if (node.auto) elements.push({ t: "text", x: bbox.x0, y: bbox.y0 - MARK_GAP_MM, s: AUTO_MARK, size: MARK_MM, anchor: "start" });
  const item: DrawItem = { id: node.c, kind: "part", z: Z_NODE, lod: 2, xMm: 0, yMm: 0, rotation: 0, bbox, elements, title: node.refdes };
  return { item, targets };
}

function schematicDrawList(state: ProjectState, viewId: string, reg: PartRegistry): DrawList {
  const scene = buildSchematicScene(state, viewId, reg);
  const items: DrawItem[] = [];
  const targets: HitTarget[] = [];
  for (const node of scene.nodes) {
    const built = nodeItem(node);
    items.push(built.item);
    targets.push(...built.targets);
  }
  scene.links.forEach((link, i) => {
    const points = link.points_mm.map(([x, y]) => ({ x: x!, y: y! }));
    items.push({
      id: `${link.net}#${i}`,
      kind: "wire",
      z: Z_LINK,
      lod: 2,
      xMm: 0,
      yMm: 0,
      rotation: 0,
      bbox: boundsOf(points),
      elements: [{ t: "path", d: points.map((p, n) => `${n === 0 ? "M" : "L"}${p.x} ${p.y}`).join(""), stroke: INK, sw: LINK_SW }],
      title: link.net,
    });
  });
  for (const label of scene.labels) {
    items.push({
      id: `label:${label.pin}`,
      kind: "label",
      z: Z_LABEL,
      lod: 2,
      xMm: label.x_mm,
      yMm: label.y_mm,
      rotation: 0,
      bbox: { x0: label.x_mm, y0: label.y_mm - TEXT_MM, x1: label.x_mm + label.text.length * TEXT_MM * 0.6, y1: label.y_mm },
      elements: [{ t: "text", x: 0, y: 0, s: label.text, size: TEXT_MM }],
      title: label.text,
    });
  }
  return { items, targets };
}

export const VIEW_DEFS: readonly ViewDef[] = [
  { kind: "breadboard", labelKey: "views.tab.breadboard", surface: "canvas", ensure: () => [] },
  { kind: "schematic", labelKey: "views.tab.schematic", surface: "canvas", ensure: ensureSchematicView, scene: schematicDrawList },
  { kind: "board", labelKey: "views.tab.board", surface: "dom", ensure: ensureBoardView },
];

/** The first view of that kind in document order. */
export function viewIdFor(state: ProjectState, kind: ViewKind): string | undefined {
  return state.views.find((v) => v.kind === kind)?.id;
}
