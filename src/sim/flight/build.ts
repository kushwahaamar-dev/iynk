import type { Descriptor } from "../../parts/descriptor.ts";
import {
  readBattery,
  readEsc,
  readFc,
  readFrame,
  readMotor,
  readProp,
  roleOf,
  type EscSI,
  type FcSI,
  type FrameSI,
  type MotorSI,
  type Need,
  type PackMech,
  type PropSI,
  type Read,
  type Role,
} from "../../parts/mechanics.ts";
import type { DroneData } from "../../project/domains/drone-ops.ts";
import type { ProjectView, Resolve } from "../../project/domains/drone-semantic.ts";
import type { Body, Frame, Pose } from "../../project/generated/types.ts";
import type { FlyChem, PackSI } from "./battery.ts";
import type { FitRecord } from "./fit.ts";
import { rotationFromRpy, type Mat3, type PlacedBody, type ShapeIn, type V3 } from "./mass.ts";

export interface BuildSlot {
  id: string;
  motor: MotorSI;
  prop: PropSI;
  esc: EscSI;
  spin: "cw" | "ccw";
  prop_spin: "cw" | "ccw";
  axis_mm: readonly [number, number];
  z_mm: number;
  thrust_axis: readonly [number, number, number];
  motorRef: string;
  propRef: string;
  escRef: string;
}

export interface Build {
  projectId: string;
  kind: "multirotor";
  slots: BuildSlot[];
  /** Null while no battery is chosen or its block cannot be read. */
  pack: PackSI | null;
  packRef: string;
  frame: FrameSI | null;
  fc: FcSI | null;
  bodies: PlacedBody[];
  flight: DroneData["flight"] & { gyroLpfHz?: number };
  /** The fit record of each slot's prop that was made with the slot's motor. */
  fits: ReadonlyMap<string, FitRecord>;
  /** Parts whose block cites a source from the maker, as `<part id>#<role>`. */
  makerRated: ReadonlySet<string>;
  assumed: string[];
  missing: Need[];
}

type Pose3 = { R: Mat3; p: V3 };

const IDENTITY: Pose3 = { R: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], p: [0, 0, 0] };
const MAKER_SOURCES = new Set(["datasheet", "application-note", "product-page"]);
const GIMBAL_COS = 1e-9;
const RAD_TO_DEG = 180 / Math.PI;

/** Field a reader may be missing and the build can still place a part with: the outputs that need it stay blocked. */
const PLACEHOLDER: Readonly<Record<string, number>> = {
  "motor.i_noload_a": 1e-9,
  "esc.i_cont_a": 1,
  "battery.capacity_mah": 1,
};
const MASS_PLACEHOLDER_G = 1;

export const makerKey = (ref: string, role: Role): string => `${ref}#${role}`;

const mulMat = (a: Mat3, b: Mat3): Mat3 =>
  a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j])) as unknown as Mat3;

const mulVec = (m: Mat3, v: V3): V3 => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];

function rpyOf(R: Mat3): V3 {
  const cosPitch = Math.hypot(R[0][0], R[1][0]);
  const pitch = Math.atan2(-R[2][0], cosPitch);
  if (cosPitch < GIMBAL_COS) return [Math.atan2(-R[1][2], R[1][1]) * RAD_TO_DEG, pitch * RAD_TO_DEG, 0];
  return [Math.atan2(R[2][1], R[2][2]) * RAD_TO_DEG, pitch * RAD_TO_DEG, Math.atan2(R[1][0], R[0][0]) * RAD_TO_DEG];
}

const compose = (parent: Pose3, local: Pose): Pose3 => {
  const offset = mulVec(parent.R, [local.position_mm[0], local.position_mm[1], local.position_mm[2]]);
  return {
    R: mulMat(parent.R, rotationFromRpy([local.rpy_deg[0], local.rpy_deg[1], local.rpy_deg[2]])),
    p: [parent.p[0] + offset[0], parent.p[1] + offset[1], parent.p[2] + offset[2]],
  };
};

/** The frame's pose in the world, walking up the parent chain. A parent that is not found or a loop ends the walk. */
function worldPose(frames: readonly Frame[], id: string): Pose3 {
  const byId = new Map(frames.map((f) => [f.id, f]));
  const chain: Frame[] = [];
  const seen = new Set<string>();
  for (let f = byId.get(id); f && !seen.has(f.id); f = byId.get(f.parent)) {
    seen.add(f.id);
    chain.unshift(f);
  }
  return chain.reduce((pose, f) => compose(pose, f.pose), IDENTITY);
}

export function frameWorldPose(frames: readonly Frame[], id: string): Pose {
  const { R, p } = worldPose(frames, id);
  return { position_mm: [...p], rpy_deg: [...rpyOf(R)] };
}

function shapeOf(b: Body): ShapeIn {
  const s = b.shape;
  if (!s) return { kind: "mesh" };
  switch (s.kind) {
    case "box":
      return { kind: "box", size_mm: [s.size_mm[0], s.size_mm[1], s.size_mm[2]] };
    case "cylinder":
      return { kind: "cylinder", radius_mm: s.radius_mm, height_mm: s.height_mm };
    case "sphere":
      return { kind: "sphere", radius_mm: s.radius_mm };
    case "mesh":
      return { kind: "mesh" };
  }
}

const v3 = (v: readonly number[] | undefined): V3 | undefined => (v ? [v[0], v[1], v[2]] : undefined);

function placedBodies(p: ProjectView): PlacedBody[] {
  const { frames, bodies } = p.mechanical;
  return bodies
    .filter((b) => (b.mass_g ?? 0) > 0)
    .map((b) => {
      const { R, p: at } = worldPose(frames, b.frame);
      const com = v3(b.com_mm);
      const inertia = v3(b.inertia_g_mm2);
      return {
        id: b.id,
        mass_g: b.mass_g ?? 0,
        shape: shapeOf(b),
        ...(com && { com_mm: com }),
        ...(inertia && { inertia_g_mm2: inertia }),
        position_mm: at,
        rpy_deg: rpyOf(R),
      };
    });
}

interface Reading<T> {
  value: T | null;
  assumed: string[];
  missing: Need[];
  maker: boolean;
}

/** A reader that gives up on one missing field the solve does not use is run again with a stand-in, so the part still places. */
function readTolerant<T>(d: Descriptor, role: Role, read: (d: Descriptor) => Read<T>): Omit<Reading<T>, "maker"> {
  const first = read(d);
  if (first.ok) return { value: first.value, assumed: first.assumed, missing: [] };
  const block = d.mechanics?.[role] as Record<string, unknown> | undefined;
  const stand = Object.fromEntries(
    first.missing.map((need) => {
      const field = need.path.slice(`mechanics.${role}.`.length);
      const value = field === "mass_g" ? MASS_PLACEHOLDER_G : PLACEHOLDER[`${role}.${field}`];
      return [field, value] as const;
    }),
  );
  const tolerable = block !== undefined && Object.values(stand).every((v) => v !== undefined);
  if (!tolerable) return { value: null, assumed: [], missing: first.missing };
  const second = read({ ...d, mechanics: { ...d.mechanics, [role]: { ...block, ...stand } } } as Descriptor);
  return second.ok
    ? { value: second.value, assumed: second.assumed, missing: first.missing }
    : { value: null, assumed: [], missing: first.missing };
}

const makerSourced = (d: Descriptor, role: Role): boolean => {
  const ref = (d.mechanics?.[role] as { source?: string } | undefined)?.source;
  const kind = d.sources.find((s) => s.id === ref)?.kind;
  return kind !== undefined && MAKER_SOURCES.has(kind);
};

const packOf = ({ chemistry, ...rest }: PackMech): PackSI => ({ ...rest, chem: chemistry as FlyChem });

/** Reads the drone domain, the parts it names and the mechanical tree into one description of the craft. */
export function buildFromProject(
  p: ProjectView & { id: string },
  resolve: Resolve,
): { build: Build } | { error: "not-a-multirotor" | "no-drone-domain" } {
  const data = p.domains.drone?.data;
  if (!data) return { error: "no-drone-domain" };
  if (data.kind !== "multirotor") return { error: "not-a-multirotor" };

  const instances = new Map([...p.components, ...p.boards].map((i) => [i.id, i]));
  const mounts = new Map(p.mechanical.mounts.map((m) => [m.id, m]));
  const assumed = new Set<string>();
  const missing = new Map<string, Need>();
  const makerRated = new Set<string>();
  const fits = new Map<string, FitRecord>();

  const need = (n: Need, ref?: string) => {
    const key = `${ref ?? ""}|${n.path}`;
    if (!missing.has(key)) missing.set(key, ref ? { path: n.path, why: `${ref}: ${n.why}` } : n);
  };

  const cache = new Map<string, Reading<unknown> & { descriptor?: Descriptor }>();
  function part<T>(id: string, role: Role, read: (d: Descriptor) => Read<T>): { value: T | null; ref: string; descriptor?: Descriptor } {
    const instance = instances.get(id);
    if (!instance) {
      need({ path: `mechanics.${role}`, why: `${id} is not in the project` });
      return { value: null, ref: id };
    }
    const { ref, version } = instance.definition;
    const key = `${ref}@${version}#${role}`;
    let hit = cache.get(key) as (Reading<T> & { descriptor?: Descriptor }) | undefined;
    if (!hit) {
      const descriptor = resolve(instance.definition);
      if (!descriptor) {
        hit = { value: null, assumed: [], missing: [{ path: `mechanics.${role}`, why: "not in the library" }], maker: false };
      } else {
        hit = { ...readTolerant(descriptor, role, read), maker: makerSourced(descriptor, role), descriptor };
      }
      cache.set(key, hit);
    }
    hit.missing.forEach((n) => need(n, ref));
    hit.assumed.forEach((a) => assumed.add(a));
    if (hit.maker) makerRated.add(makerKey(ref, role));
    return { value: hit.value, ref, descriptor: hit.descriptor };
  }

  const slots: BuildSlot[] = [];
  for (const slot of data.motors ?? []) {
    const motor = part(slot.motor, "motor", readMotor);
    const prop = part(slot.prop, "prop", readProp);
    const esc = part(slot.esc, "esc", readEsc);

    const mount = mounts.get(slot.mount);
    let at: Pose3 = IDENTITY;
    if (mount) at = compose(worldPose(p.mechanical.frames, mount.frame), mount.pose);
    else need({ path: `mechanical.mounts.${slot.mount}`, why: `${slot.mount} is not a mount of this project` });

    const records = (prop.descriptor?.["x_fit"] as FitRecord[] | undefined) ?? [];
    const record = records.find((r) => r.motor === motor.ref);
    if (record) fits.set(slot.id, record);

    if (!motor.value || !prop.value || !esc.value) continue;
    const up = mulVec(at.R, [0, 0, 1]);
    slots.push({
      id: slot.id,
      motor: motor.value,
      prop: prop.value,
      esc: esc.value,
      spin: slot.spin,
      prop_spin: slot.prop_spin,
      axis_mm: [at.p[0], at.p[1]],
      z_mm: at.p[2],
      thrust_axis: up,
      motorRef: motor.ref,
      propRef: prop.ref,
      escRef: esc.ref,
    });
  }
  if ((data.motors ?? []).length === 0) need({ path: "domains.drone.motors", why: "the craft has no motors" });

  let pack: PackSI | null = null;
  let packRef = "";
  if (data.battery === undefined) need({ path: "domains.drone.battery", why: "no battery is chosen" });
  else {
    const battery = part(data.battery, "battery", readBattery);
    packRef = battery.ref;
    if (battery.value) pack = packOf(battery.value);
  }

  const frameId = p.components.find((c) => {
    const d = resolve(c.definition);
    return d !== undefined && roleOf(d) === "frame";
  })?.id;
  const frame = frameId === undefined ? null : part(frameId, "frame", readFrame).value;
  const fc = data.controller === undefined ? null : part(data.controller, "fc", readFc).value;

  const bodies = placedBodies(p);
  if (bodies.length === 0) need({ path: "mechanical.bodies", why: "no body has a mass" });

  const gyroLpfHz = data.fcParams?.filters.gyro_lpf_hz;
  return {
    build: {
      projectId: p.id,
      kind: "multirotor",
      slots,
      pack,
      packRef,
      frame,
      fc,
      bodies,
      flight: gyroLpfHz === undefined ? data.flight : { ...data.flight, gyroLpfHz },
      fits,
      makerRated,
      assumed: [...assumed],
      missing: [...missing.values()],
    },
  };
}
