import type { Project as ProjectState } from "../project/generated/types.ts";
import { builtinRegistry } from "../parts/builtin.ts";
import type { Descriptor } from "../parts/descriptor.ts";
import { fallbackSpec, placeholderSpec } from "../parts/fallback.ts";
import type { InterfaceSnapshot } from "../parts/pins.ts";
import type { PartRegistry } from "../parts/registry.ts";
import type { ResolvedPartShape } from "./engine/types.ts";

export type PartLookup = Pick<PartRegistry, "get" | "latest">;

/** The box a part with no interface at all is drawn as; the draw list adds the question mark. */
const UNKNOWN_BOX_MM = 10.16;

const builtin = builtinRegistry();

const round2 = (n: number): number => Math.round(n * 100) / 100;

const knownShapes = new WeakMap<Descriptor, ResolvedPartShape>();
const pinnedShapes = new WeakMap<InterfaceSnapshot, ResolvedPartShape>();

const isMechanical = (p: { type: string; class?: string }): boolean => p.type === "mechanical" || p.class === "mechanical";

/**
 * The size comes from `dimensions` when the descriptor has them, else from the generic layout. A pin keeps its own
 * position when it has one; the descriptor stores it bottom-left with +y up and the shape is top-left with +y down.
 */
function shapeOfDescriptor(d: Descriptor): ResolvedPartShape {
  const cached = knownShapes.get(d);
  if (cached) return cached;
  const dims = d.dimensions?.body ?? d.dimensions?.board;
  const generated = dims && d.pins.every((p) => p.position) ? undefined : fallbackSpec(d);
  const widthMm = dims?.w ?? generated!.body_mm.w;
  const heightMm = dims?.h ?? generated!.body_mm.h;
  const laidOut = new Map(generated?.pins.map((p) => [p.id, p]));
  const shape: ResolvedPartShape = {
    widthMm,
    heightMm,
    known: true,
    pins: d.pins.map((p) => {
      const spot = p.position ?? { x: laidOut.get(p.id)?.x_mm ?? 0, y: laidOut.get(p.id)?.y_mm ?? 0 };
      return { id: p.id, xMm: spot.x, yMm: round2(heightMm - spot.y), mechanical: isMechanical(p) };
    }),
  };
  knownShapes.set(d, shape);
  return shape;
}

function shapeOfInterface(iface: InterfaceSnapshot): ResolvedPartShape {
  const cached = pinnedShapes.get(iface);
  if (cached) return cached;
  const spec = placeholderSpec(iface);
  const spots = new Map(spec.pins.map((p) => [p.id, p]));
  const shape: ResolvedPartShape = {
    widthMm: spec.body_mm.w,
    heightMm: spec.body_mm.h,
    known: false,
    pins: iface.pins.map((p) => ({ id: p.id, xMm: spots.get(p.id)!.x_mm, yMm: round2(spec.body_mm.h - spots.get(p.id)!.y_mm), mechanical: isMechanical(p) })),
  };
  pinnedShapes.set(iface, shape);
  return shape;
}

const EMPTY_BOX: ResolvedPartShape = { widthMm: UNKNOWN_BOX_MM, heightMm: UNKNOWN_BOX_MM, known: false, pins: [] };

/**
 * What the canvas draws and hits for a part. A part the project pins and the registry holds is `known`. One the registry
 * does not hold (a document from a newer iynk, a part from a pack that is gone) takes the pins its project pinned, so
 * wires to it still land; with nothing pinned it is an empty box. A ref the project has not pinned yet reads the
 * newest registry version, which is what the palette offers.
 */
export function resolvePart(state: ProjectState, defRef: string, registry: PartLookup = builtin): ResolvedPartShape {
  const pinned = state.dependencies.components.find((d) => d.ref === defRef);
  const descriptor = pinned ? registry.get(pinned.ref, pinned.version) : registry.latest(defRef);
  if (descriptor) return shapeOfDescriptor(descriptor);
  return pinned ? shapeOfInterface(pinned.interface) : EMPTY_BOX;
}
