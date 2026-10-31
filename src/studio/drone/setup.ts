import type { Descriptor } from "@/parts/descriptor";
import { readBattery, readEsc, readFc, readFrame, readMotor, readProp, roleOf, type Read } from "@/parts/mechanics";
import { layoutMounts, type DroneData, type MotorSlot } from "@/project/domains/drone-ops";
import type { Resolve } from "@/project/domains/drone-semantic";
import type { Op, Project } from "@/project/generated/types";
import type { V3 } from "@/sim/flight/mass";
import { instanceFor } from "./instance";
import { bodyOps, layoutOps, type Layout, type LayoutCtx } from "./layout";

export interface SetupPicks {
  frame: Descriptor;
  layout: Layout;
  wheelbase_mm: number;
  motor: Descriptor;
  prop: Descriptor;
  esc: Descriptor;
}

interface Instance {
  id: string;
  definition: { ref: string; version: string };
}

interface Placement {
  id: string;
  position_mm: V3;
}

type Body = LayoutCtx["bodies"][number];

/** Plate, pack and stack sizes are iynk assumptions: a part carries a mass, not a size. */
const PLATE_OF_WHEELBASE = 0.3;
const PLATE_MM = 4;
const FALLBACK_WHEELBASE_MM = 200;
const PACK_MM: V3 = [75, 30, 25];
const PACK_Z_MM = -12;
const STACK_MM: V3 = [36, 36, 6];
const FC_MM: V3 = [30, 30, 6];
const STACK_Z_MM = 6;
const MOTOR_RADIUS_MM = 14;
const MOTOR_HEIGHT_MM = 14;
const MOUNT_PREFIX = "mnt_";

const massOf = (d: Descriptor | undefined, read: (d: Descriptor) => Read<{ mass_g: number }>): number | null => {
  const result = d && read(d);
  return result && result.ok ? result.value.mass_g : null;
};

/** The components and drone data the project will hold once `ops` are applied. It understands the ops the part pickers write and no others. */
function afterOps(project: Project, ops: readonly Op[]): { instances: Instance[]; data: DroneData | undefined } {
  const instances: Instance[] = [...project.components, ...project.boards];
  let data = project.domains?.drone?.data;
  for (const op of ops) {
    if (op.k === "component.add") instances.push(op.component);
    else if (op.k === "board.add") instances.push(op.board);
    else if (op.k === "domain.patch" && op.domain === "drone" && data) data = { ...data, ...op.patch } as DroneData;
  }
  return { instances, data };
}

/** One body for each part that has a mass: the frame plate, the pack, the ESCs, the controller, and a motor with its prop at every mount. */
function bodiesOf(instances: readonly Instance[], data: DroneData | undefined, mounts: readonly Placement[], resolve: Resolve): { frameId: string; bodies: Body[] } | null {
  const descriptorOf = (id: string | undefined): Descriptor | undefined => {
    const found = instances.find((i) => i.id === id);
    return found && resolve(found.definition);
  };
  const frame = instances.find((i) => {
    const d = resolve(i.definition);
    return d !== undefined && roleOf(d) === "frame";
  });
  const frameDescriptor = descriptorOf(frame?.id);
  if (!frame || !frameDescriptor) return null;

  const bodies: Body[] = [];
  const frameRead = readFrame(frameDescriptor);
  const plate = ((frameRead.ok && frameRead.value.wheelbase_mm) || FALLBACK_WHEELBASE_MM) * PLATE_OF_WHEELBASE;
  const frameMass = massOf(frameDescriptor, readFrame);
  if (frameMass !== null) bodies.push({ id: "frame", component: frame.id, mass_g: frameMass, shape: { kind: "box", size_mm: [plate, plate, PLATE_MM] }, position_mm: [0, 0, 0] });

  const slots = data?.motors ?? [];
  const packMass = massOf(descriptorOf(data?.battery), readBattery);
  if (data?.battery && packMass !== null) bodies.push({ id: "battery", component: data.battery, mass_g: packMass, shape: { kind: "box", size_mm: PACK_MM }, position_mm: [0, 0, PACK_Z_MM] });

  const perEsc = new Map<string, number>();
  for (const slot of slots) perEsc.set(slot.esc, (perEsc.get(slot.esc) ?? 0) + 1);
  for (const [id, count] of perEsc) {
    const d = descriptorOf(id);
    const mass = massOf(d, readEsc);
    const channels = d?.mechanics?.esc?.channels ?? 1;
    if (mass !== null) bodies.push({ id: `esc_${id}`, component: id, mass_g: Math.ceil(count / channels) * mass, shape: { kind: "box", size_mm: STACK_MM }, position_mm: [0, 0, STACK_Z_MM] });
  }

  const fcMass = massOf(descriptorOf(data?.controller), readFc);
  if (data?.controller && fcMass !== null) bodies.push({ id: "fc", component: data.controller, mass_g: fcMass, shape: { kind: "box", size_mm: FC_MM }, position_mm: [0, 0, STACK_Z_MM] });

  for (const slot of slots) {
    const at = mounts.find((m) => m.id === slot.mount);
    const motorMass = massOf(descriptorOf(slot.motor), readMotor);
    const propMass = massOf(descriptorOf(slot.prop), readProp);
    if (at && motorMass !== null && propMass !== null) {
      bodies.push({ id: `motor_${slot.id}`, component: slot.motor, mass_g: motorMass + propMass, shape: { kind: "cylinder", radius_mm: MOTOR_RADIUS_MM, height_mm: MOTOR_HEIGHT_MM }, position_mm: at.position_mm });
    }
  }
  return { frameId: frame.id, bodies };
}

/** Adds the mass bodies the picks in `ops` call for to the same batch, so a pick stays one undo step. Nothing is added before the frame is laid out. */
export function withBodies(project: Project, resolve: Resolve, ops: Op[]): Op[] {
  const { instances, data } = afterOps(project, ops);
  if (!data?.motors?.length) return ops;
  const mounts = project.mechanical?.mounts.map((m) => ({ id: m.id, position_mm: [m.pose.position_mm[0], m.pose.position_mm[1], m.pose.position_mm[2]] as const })) ?? [];
  const placed = bodiesOf(instances, data, mounts, resolve);
  return placed ? [...ops, ...bodyOps({ frameComponent: placed.frameId, bodies: placed.bodies })] : ops;
}

/** The first commit of a drone: the parts, the frame with a mount for every motor, one motor slot per mount, and the mass bodies. */
export function setupOps(project: Project, resolve: Resolve, picks: SetupPicks): Op[] {
  const frame = instanceFor(project, "frame", picks.frame);
  const motor = instanceFor(project, "motor", picks.motor);
  const prop = instanceFor(project, "prop", picks.prop);
  const esc = instanceFor(project, "esc", picks.esc);
  const mounts = layoutMounts(picks.layout, picks.wheelbase_mm, 0);

  const motors = mounts.map((mount, k): MotorSlot => ({
    id: mount.id,
    motor: motor.id,
    prop: prop.id,
    esc: esc.id,
    esc_channel: k,
    mount: `${MOUNT_PREFIX}${mount.id}`,
    spin: mount.spin,
    prop_spin: mount.spin,
  }));
  const picked: Op[] = [...frame.add, ...motor.add, ...prop.add, ...esc.add, { k: "domain.patch", domain: "drone", patch: { motors } }];
  const { instances, data } = afterOps(project, picked);
  const placements = mounts.map((mount) => ({ id: `${MOUNT_PREFIX}${mount.id}`, position_mm: mount.position_mm }));
  const placed = bodiesOf(instances, data, placements, resolve);
  const ctx: LayoutCtx = { frameComponent: frame.id, z_mm: 0, slotComponent: () => frame.id, bodies: placed?.bodies ?? [] };
  return [...picked, ...layoutOps(picks.layout, picks.wheelbase_mm, ctx)];
}
