import type { Project as ProjectState } from "../../project/generated/types.ts";
import { connectedGroups } from "../rules/connect.ts";
import type { PointMm, Scene } from "./types.ts";

export type AirWire = { net: string; a: PointMm; b: PointMm };

const distance = (a: PointMm, b: PointMm): number => Math.hypot(a.x - b.x, a.y - b.y);

type Link = { a: PointMm; b: PointMm; to: number; length: number };

/** The shortest line from any point of `tree` to any point of the group `points`. */
function nearest(tree: readonly PointMm[], points: readonly PointMm[], to: number): Link {
  let best: Link | null = null;
  for (const a of tree) {
    for (const b of points) {
      const length = distance(a, b);
      if (best === null || length < best.length) best = { a, b, to, length };
    }
  }
  return best!;
}

/**
 * The lines that join the parts of a net the view has not connected: a minimum spanning tree over the groups that
 * `connectedGroups` finds, each edge running between the two closest pins of two groups. A group with no pin in
 * `scene` is left out, since there is nowhere to draw it.
 */
export function airWires(state: ProjectState, viewId: string, scene: Scene): AirWire[] {
  const at = new Map<string, PointMm>();
  for (const { hit, bbox } of scene.targets) {
    const centre = { x: (bbox.x0 + bbox.x1) / 2, y: (bbox.y0 + bbox.y1) / 2 };
    if (hit.kind === "pin") at.set(`${hit.c}\u0000${hit.p}`, centre);
    else if (hit.kind === "hole") at.set(`${hit.surface}\u0000${hit.hole}`, centre);
  }

  const wires: AirWire[] = [];
  for (const net of state.nets) {
    const groups = connectedGroups(state, viewId, net.id)
      .map((pins) => pins.flatMap((pin) => at.get(`${pin.c}\u0000${pin.p}`) ?? []))
      .filter((points) => points.length > 0);
    const [first, ...rest] = groups;
    if (first === undefined) continue;

    let tree = [...first];
    while (rest.length > 0) {
      const links = rest.map((points, i) => nearest(tree, points, i));
      const link = links.reduce((best, next) => (next.length < best.length ? next : best));
      wires.push({ net: net.id, a: link.a, b: link.b });
      tree = [...tree, ...rest.splice(link.to, 1)[0]!];
    }
  }
  return wires;
}
