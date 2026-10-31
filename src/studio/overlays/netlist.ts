import type { Project as ProjectState } from "../../project/generated/types.ts";
import { netlist, type NetlistNode } from "../../project/netlist.ts";
import type { Problem } from "../problems.ts";
import { PIN_RADIUS_MM } from "../engine/constants.ts";
import type { ArtElement, Overlay, RectMm, Scene } from "../engine/types.ts";

const RING_GAP_MM = 0.6;
const OUTLINE_SW = 0.4;
const OUTLINE_PAD_MM = 0.5;
const TAG_SIZE_MM = 2;
const TAG_OFFSET_MM = 1.2;
const INK = "var(--studio-ink)";

const union = (a: RectMm | undefined, b: RectMm): RectMm =>
  a ? { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) } : b;

type Boxes = { pins: Map<string, RectMm>; wires: Map<string, RectMm>; parts: Map<string, RectMm> };

function boxesOf(scene: Scene): Boxes {
  const boxes: Boxes = { pins: new Map(), wires: new Map(), parts: new Map() };
  for (const { hit, bbox } of scene.targets) {
    if (hit.kind === "pin") boxes.pins.set(`${hit.c}/${hit.p}`, bbox);
    else if (hit.kind === "hole") boxes.pins.set(`${hit.surface}/${hit.hole}`, bbox);
    else if (hit.kind === "wire") boxes.wires.set(hit.id, union(boxes.wires.get(hit.id), bbox));
    else if (hit.kind === "part") boxes.parts.set(hit.c, bbox);
  }
  return boxes;
}

const ringAt = (id: string, box: RectMm, tag: string | null): Overlay => {
  const elements: ArtElement[] = [
    { t: "circle", cx: 0, cy: 0, r: PIN_RADIUS_MM + RING_GAP_MM, fill: "none", stroke: INK, sw: OUTLINE_SW },
  ];
  if (tag !== null) {
    elements.push({ t: "text", x: PIN_RADIUS_MM + TAG_OFFSET_MM, y: -(PIN_RADIUS_MM + TAG_OFFSET_MM), s: tag, size: TAG_SIZE_MM });
  }
  return { id, xMm: (box.x0 + box.x1) / 2, yMm: (box.y0 + box.y1) / 2, elements };
};

const outlineOf = (id: string, box: RectMm): Overlay => ({
  id,
  xMm: box.x0 - OUTLINE_PAD_MM,
  yMm: box.y0 - OUTLINE_PAD_MM,
  elements: [
    {
      t: "rect",
      x: 0,
      y: 0,
      w: box.x1 - box.x0 + 2 * OUTLINE_PAD_MM,
      h: box.y1 - box.y0 + 2 * OUTLINE_PAD_MM,
      rx: OUTLINE_PAD_MM,
      fill: "none",
      stroke: INK,
      sw: OUTLINE_SW,
    },
  ],
});

/** Rings the pins of an electrical node and outlines its wires; the first ring carries `tag` when there is one. */
function nodeOverlays(node: NetlistNode, view: ProjectState["views"][number], boxes: Boxes, idPrefix: string, tag: string | null): Overlay[] {
  const overlays: Overlay[] = [];
  for (const pin of node.pins) {
    const box = boxes.pins.get(`${pin.c}/${pin.p}`);
    if (box) overlays.push(ringAt(`${idPrefix}:${pin.c}/${pin.p}`, box, overlays.length === 0 ? tag : null));
  }
  for (const wire of view.wires) {
    const box = node.nets.includes(wire.net) ? boxes.wires.get(wire.id) : undefined;
    if (box) overlays.push(outlineOf(`${idPrefix}:${wire.id}`, box));
  }
  return overlays;
}

/**
 * Rings every pin and outlines every wire of the electrical node that holds `netId`, and tags the first ringed pin
 * with the net and its size. The outline and the text are the cues, so the highlight does not depend on colour.
 * Members that are not in `scene` (off screen, or in another view) are left out. The node comes from `netlist(state)`
 * only.
 */
export function focusNetOverlay(state: ProjectState, viewId: string, netId: string | null, scene: Scene): Overlay[] {
  if (netId === null) return [];
  const node = netlist(state).nodes.find((n) => n.nets.includes(netId));
  const view = state.views.find((v) => v.id === viewId);
  if (!node || !view) return [];
  return nodeOverlays(node, view, boxesOf(scene), "focus", `net ${node.names[0] ?? netId} (${node.pins.length} pins)`);
}

/**
 * Marks what the problems of a fault rule point at: a ring on each pin, an outline on each part and wire, and the
 * pins and wires of each net, all with `label` on the first mark of a target. Targets that are not in `scene` are
 * left out. Nothing is returned for no problems, which is how the marks clear.
 */
export function problemOverlays(state: ProjectState, viewId: string, problems: readonly Problem[], scene: Scene, label: string): Overlay[] {
  const view = state.views.find((v) => v.id === viewId);
  if (!view) return [];
  const nodes = netlist(state).nodes;
  const boxes = boxesOf(scene);
  const overlays = new Map<string, Overlay>();
  const add = (o: Overlay) => void overlays.set(o.id, o);
  for (const problem of problems) {
    for (const target of problem.targets ?? []) {
      const id = `problem:${problem.id}:${target.kind}:${target.id}${target.pin === undefined ? "" : `/${target.pin}`}`;
      if (target.kind === "pin") {
        const box = boxes.pins.get(`${target.id}/${target.pin}`);
        if (box) add(ringAt(id, box, label));
      } else if (target.kind === "part") {
        const box = boxes.parts.get(target.id);
        if (box) add(outlineOf(id, box));
      } else if (target.kind === "net") {
        const node = nodes.find((n) => n.id === target.id || n.nets.includes(target.id));
        if (node) for (const o of nodeOverlays(node, view, boxes, id, label)) add(o);
      }
    }
  }
  return [...overlays.values()];
}
