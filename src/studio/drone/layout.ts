import { layoutMounts, mountOps } from "@/project/domains/drone-ops";
import type { DroneData, MotorSlot, MountLayout } from "@/project/domains/drone-ops";
import type { Op, Shape } from "@/project/generated/types";
import type { ShapeIn, V3 } from "@/sim/flight/mass";

export type Layout = MountLayout;

export interface LayoutCtx {
  /** The frame part's id. It is also the id of the mechanical frame every mount and body hangs from. */
  frameComponent: string;
  z_mm: number;
  slotComponent(slotId: string): string;
  bodies: ReadonlyArray<{ id: string; component: string; mass_g: number; shape: ShapeIn; position_mm: V3 }>;
}

export type SlotPick = { motor?: string; prop?: string; esc?: string };

function shapeOf(s: ShapeIn): Shape | undefined {
  switch (s.kind) {
    case "box":
      return { kind: "box", size_mm: [s.size_mm[0], s.size_mm[1], s.size_mm[2]] };
    case "cylinder":
      return { kind: "cylinder", radius_mm: s.radius_mm, height_mm: s.height_mm };
    case "sphere":
      return { kind: "sphere", radius_mm: s.radius_mm };
    case "mesh":
      return undefined;
  }
}

/** The mounts of a layout, the frame they hang from, and a frame and a body for each part with a mass. One batch, so one undo step. */
export function layoutOps(layout: Layout, wheelbase_mm: number, ctx: LayoutCtx): Op[] {
  const root: Op = {
    k: "mech.set",
    collection: "frames",
    value: { id: ctx.frameComponent, name: "Body (FLU)", parent: "world", pose: { position_mm: [0, 0, 0], rpy_deg: [0, 0, 0] } },
  };
  const parts = ctx.bodies.flatMap((b): Op[] => {
    const frame = `frm_${b.id}`;
    const shape = shapeOf(b.shape);
    return [
      {
        k: "mech.set",
        collection: "frames",
        value: { id: frame, name: b.id, parent: ctx.frameComponent, pose: { position_mm: [...b.position_mm], rpy_deg: [0, 0, 0] } },
      },
      {
        k: "mech.set",
        collection: "bodies",
        value: { id: b.id, name: b.id, frame, component: b.component, mass_g: b.mass_g, ...(shape && { shape }) },
      },
    ];
  });
  return [root, ...mountOps(layoutMounts(layout, wheelbase_mm, ctx.z_mm), ctx.frameComponent, ctx.slotComponent), ...parts];
}

/** One merge patch carrying every slot with the pick applied. An ESC picked for all slots is wired one channel per slot. */
export function sameForAllPatch(cur: DroneData, pick: SlotPick): Op {
  const motors = (cur.motors ?? []).map((slot, k): MotorSlot => ({ ...slot, ...pick, ...(pick.esc !== undefined && { esc_channel: k }) }));
  return { k: "domain.patch", domain: "drone", patch: { motors } };
}
