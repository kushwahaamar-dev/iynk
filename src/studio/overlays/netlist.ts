import type { Project as ProjectState } from "../../project/generated/types.ts";
import { netlist } from "../../project/netlist.ts";
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

  const pinBoxes = new Map<string, RectMm>();
  const wireBoxes = new Map<string, RectMm>();
  for (const { hit, bbox } of scene.targets) {
    if (hit.kind === "pin") pinBoxes.set(`${hit.c}/${hit.p}`, bbox);
    else if (hit.kind === "hole") pinBoxes.set(`${hit.surface}/${hit.hole}`, bbox);
    else if (hit.kind === "wire") wireBoxes.set(hit.id, union(wireBoxes.get(hit.id), bbox));
  }

  const overlays: Overlay[] = [];
  const tag = `net ${node.names[0] ?? netId} (${node.pins.length} pins)`;
  for (const pin of node.pins) {
    const box = pinBoxes.get(`${pin.c}/${pin.p}`);
    if (!box) continue;
    const elements: ArtElement[] = [
      { t: "circle", cx: 0, cy: 0, r: PIN_RADIUS_MM + RING_GAP_MM, fill: "none", stroke: INK, sw: OUTLINE_SW },
    ];
    if (overlays.length === 0) {
      elements.push({ t: "text", x: PIN_RADIUS_MM + TAG_OFFSET_MM, y: -(PIN_RADIUS_MM + TAG_OFFSET_MM), s: tag, size: TAG_SIZE_MM });
    }
    overlays.push({ id: `focus:${pin.c}/${pin.p}`, xMm: (box.x0 + box.x1) / 2, yMm: (box.y0 + box.y1) / 2, elements });
  }
  for (const wire of view.wires) {
    const box = node.nets.includes(wire.net) ? wireBoxes.get(wire.id) : undefined;
    if (!box) continue;
    overlays.push({
      id: `focus:${wire.id}`,
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
  }
  return overlays;
}
