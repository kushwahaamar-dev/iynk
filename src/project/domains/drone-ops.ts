import type { IynkDroneDomainData, Mount, Op } from "../generated/types.ts";

export type DroneData = IynkDroneDomainData;
export type MotorSlot = NonNullable<DroneData["motors"]>[number];
export type MountLayout = "x" | "plus" | "h" | "hex" | "octo";

export interface LayoutMount {
  id: string;
  position_mm: readonly [number, number, number];
  rpy_deg: readonly [number, number, number];
  spin: "cw" | "ccw";
}

const patch = (value: Record<string, unknown>): Op => ({ k: "domain.patch", domain: "drone", patch: value });

const COURSE_KEYS = ["builtin", "kind", "field_m", "pad_m", "ground", "ceiling_m", "solids", "gates", "checkpoints"];
const FLIGHT_KEYS = ["model", "step_hz", "pid_hz"];

/** A merge patch replaces objects key by key, so the keys the new value leaves out are removed with null. */
function replacing<T extends object>(value: T, keys: readonly string[]): Record<string, unknown> {
  return { ...Object.fromEntries(keys.map((key) => [key, null])), ...value };
}

/** Merge patches replace arrays whole, so a slot edit carries every slot (the last write wins on a conflict). */
export function slotPatch(cur: DroneData, slot: MotorSlot): Op {
  const motors: MotorSlot[] = [...(cur.motors ?? [])];
  const at = motors.findIndex((m) => m.id === slot.id);
  if (at < 0) motors.push(slot);
  else motors[at] = slot;
  return patch({ motors });
}

export function removeSlotPatch(cur: DroneData, id: string): Op {
  return patch({ motors: (cur.motors ?? []).filter((m) => m.id !== id) });
}

export const setBatteryPatch = (componentId: string): Op => patch({ battery: componentId });

export const setControllerPatch = (boardId: string): Op => patch({ controller: boardId });

export const setFlightPatch = (f: DroneData["flight"]): Op => patch({ flight: replacing(f, FLIGHT_KEYS) });

export const setCoursePatch = (c: DroneData["course"]): Op => patch({ course: replacing(c, COURSE_KEYS) });

/** Takes a migrated craft onto the parts calculator. A craft that is already a multirotor needs no change. */
export function flipToPartsPatch(cur: DroneData): Op {
  if (cur.kind === "multirotor") return patch({});
  return patch({ kind: "multirotor", thrustSource: "parts", legacy: null });
}

export function blankMultirotor(): DroneData {
  return {
    kind: "multirotor",
    thrustSource: "parts",
    flight: { model: "multirotor-rigid@1", step_hz: 1000, pid_hz: 1000 },
    environment: {
      altitude_msl_m: 0,
      temperature_degC: 15,
      pressure_pa: 101325,
      wind: { mean_mps: [0, 0, 0], gust: { kind: "none", sigma_mps: 0, tau_s: 1 } },
      sensorFailures: [],
    },
    course: { builtin: "bando" },
    bench: { propsOff: true },
  };
}

const DIAGONAL = 0.7071067811865476;

const even = (count: number, start: number): number[] => Array.from({ length: count }, (_, k) => start + (360 / count) * k);

/** Motor angles in degrees from +x, counter-clockwise seen from above. An H frame is a rectangle, so its angles are not evenly spaced. */
const ANGLES: Record<MountLayout, number[]> = {
  x: even(4, 45),
  plus: even(4, 0),
  h: [60, 120, 240, 300],
  hex: even(6, 30),
  octo: even(8, 22.5),
};

/** Motors go around the frame and neighbours spin opposite ways. Positions are on the circle of radius wheelbase / 2. */
export function layoutMounts(layout: MountLayout, wheelbase_mm: number, z_mm: number): LayoutMount[] {
  const radius = wheelbase_mm / 2;
  return ANGLES[layout].map((degrees, k) => {
    const angle = (degrees * Math.PI) / 180;
    const x = layout === "x" ? Math.sign(Math.cos(angle)) * radius * DIAGONAL : radius * Math.cos(angle);
    const y = layout === "x" ? Math.sign(Math.sin(angle)) * radius * DIAGONAL : radius * Math.sin(angle);
    return { id: `m${k + 1}`, position_mm: [x, y, z_mm], rpy_deg: [0, 0, 0], spin: k % 2 === 0 ? "ccw" : "cw" };
  });
}

/** One `mech.set` per mount. Each mount is `mnt_` plus the slot id and carries the component `component(slotId)` names. */
export function mountOps(m: readonly LayoutMount[], frame: string, component: (slotId: string) => string): Op[] {
  return m.map((mount) => {
    const value: Mount = {
      id: `mnt_${mount.id}`,
      component: component(mount.id),
      frame,
      pose: { position_mm: [...mount.position_mm], rpy_deg: [...mount.rpy_deg] },
    };
    return { k: "mech.set", collection: "mounts", value };
  });
}
