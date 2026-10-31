import { canonicalize, utf8Encode } from "../../core/canonical.ts";
import { fail, ok, type Result } from "../../core/result.ts";
import type { Body, BodyPhysics, Frame, Joint, Pose as DocPose, Project } from "../../project/generated/types.ts";
import type {
  BodySpec,
  ColliderShape,
  ColliderSpec,
  JointSpec,
  Pose,
  Quat,
  SceneSpec,
  StaticSpec,
  Vec3,
} from "./backend.ts";
import { type InertiaShape, inertiaOf, triangleOk } from "./inertia.ts";
import { type ComponentDescriptor, fnv1a64 } from "./ports.ts";

export interface SceneDeps {
  /** Looks a part up by its definition ref (`core.tt-motor`), not by the component instance id. */
  describe(ref: string): ComponentDescriptor | undefined;
  dmath: typeof Math;
}

export type SceneErrorCode =
  | "RB-E-TREE"
  | "RB-E-MASS"
  | "RB-E-INERTIA"
  | "RB-E-THIN"
  | "RB-E-AXIS"
  | "RB-E-LIMITS"
  | "RB-E-WHEEL"
  | "RB-E-SURFACE";

export interface SceneError {
  code: SceneErrorCode;
  path: string;
  message: string;
}

export interface SceneWarning {
  code: "RB-W-INERTIA-BOX";
  path: string;
  message: string;
}

const MM = 1e-3;
const G = 1e-3;
const G_MM2 = 1e-9;
const MIN_DIM_MM = 5;
const WHEEL_TILT = 1;
const DEFAULT_FLOOR_MM = 10_000;
const FLOOR_THICKNESS_M = 0.1;
const DEFAULT_FRICTION = 0.5;
const ROOT = "domains.robotics.data";
const IDENTITY: Quat = [0, 0, 0, 1];
const URDF_AXIS: Vec3 = [1, 0, 0];

const byId = (a: { id: string }, b: { id: string }): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const colliderOf = (bodyId: string): string => `${bodyId}.col`;

function qmul(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

function qrotate(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + y * tz - z * ty,
    v[1] + w * ty + z * tx - x * tz,
    v[2] + w * tz + x * ty - y * tx,
  ];
}

/** Roll about x, pitch about y, yaw about z, all about the fixed axes of the parent (URDF). */
function quatOfRpy(rpyDeg: readonly number[], dm: typeof Math): Quat {
  const half = (deg: number) => (deg * Math.PI) / 360;
  const [sr, sp, sy] = rpyDeg.map((d) => dm.sin(half(d)));
  const [cr, cp, cy] = rpyDeg.map((d) => dm.cos(half(d)));
  return qmul([0, 0, sy, cy], qmul([0, sp, 0, cp], [sr, 0, 0, cr]));
}

function rpyOfQuat([x, y, z, w]: Quat, dm: typeof Math): [number, number, number] {
  const r20 = 2 * (x * z - w * y);
  const r00 = 1 - 2 * (y * y + z * z);
  const r10 = 2 * (x * y + w * z);
  const flat = dm.sqrt(r00 * r00 + r10 * r10) < 1e-12;
  const pitch = dm.atan2(-r20, dm.sqrt(r00 * r00 + r10 * r10));
  const yaw = flat ? 0 : dm.atan2(r10, r00);
  const roll = flat ? dm.atan2(-2 * (y * z - w * x), 1 - 2 * (x * x + z * z)) : dm.atan2(2 * (y * z + w * x), 1 - 2 * (x * x + y * y));
  return [roll, pitch, yaw].map((r) => (r * 180) / Math.PI) as [number, number, number];
}

function poseOf(pose: DocPose, dm: typeof Math): Pose {
  return { p: [pose.position_mm[0] * MM, pose.position_mm[1] * MM, pose.position_mm[2] * MM], q: quatOfRpy(pose.rpy_deg, dm) };
}

function compose(parent: Pose, local: Pose): Pose {
  const offset = qrotate(parent.q, local.p);
  return { p: [parent.p[0] + offset[0], parent.p[1] + offset[1], parent.p[2] + offset[2]], q: qmul(parent.q, local.q) };
}

/** Metres and a quaternion; undefined when the frame is unknown or its parents loop. */
function frameInWorld(frames: ReadonlyMap<string, Frame>, id: string, dm: typeof Math): Pose | undefined {
  const chain: DocPose[] = [];
  const seen = new Set<string>();
  for (let at = id; at !== "world"; ) {
    const frame = frames.get(at);
    if (!frame || seen.has(at)) return undefined;
    seen.add(at);
    chain.push(frame.pose);
    at = frame.parent;
  }
  return chain.reduceRight<Pose>((acc, pose) => compose(acc, poseOf(pose, dm)), { p: [0, 0, 0], q: IDENTITY });
}

/** Forward kinematics over `mechanical.frames`: the pose of `frame` in the world, in mm and degrees. */
export function worldPose(doc: Project, frame: string, deps: SceneDeps): DocPose {
  const frames = new Map((doc.mechanical?.frames ?? []).map((f) => [f.id, f]));
  const world = frameInWorld(frames, frame, deps.dmath);
  if (!world) throw new RangeError(`frame ${frame} is unknown or its parents loop`);
  return {
    position_mm: [world.p[0] / MM, world.p[1] / MM, world.p[2] / MM],
    rpy_deg: rpyOfQuat(world.q, deps.dmath),
  };
}

/** FNV-1a 64 over the canonical JSON of the scene, 16 hex digits. */
export function sceneHash(scene: SceneSpec): string {
  return fnv1a64(utf8Encode(canonicalize(scene)));
}

interface Geometry {
  collider?: ColliderShape;
  localPose: Pose;
  inertiaShape?: InertiaShape;
  /** The inertia comes from the bounding box of a convex hull. */
  boxed: boolean;
  comM: Vec3;
}

const CYLINDER_Z: Pose = { p: [0, 0, 0], q: [Math.SQRT1_2, 0, 0, Math.SQRT1_2] };
const ORIGIN: Pose = { p: [0, 0, 0], q: IDENTITY };

function colliderOfShape(shape: InertiaShape): Pick<Geometry, "collider" | "localPose"> {
  switch (shape.kind) {
    case "box":
      return { collider: { kind: "box", halfM: [shape.size_mm[0] * MM / 2, shape.size_mm[1] * MM / 2, shape.size_mm[2] * MM / 2] }, localPose: ORIGIN };
    case "cylinder":
      return { collider: { kind: "cylinder", radiusM: shape.radius_mm * MM, halfHeightM: (shape.height_mm * MM) / 2 }, localPose: CYLINDER_Z };
    case "sphere":
      return { collider: { kind: "sphere", radiusM: shape.radius_mm * MM }, localPose: ORIGIN };
  }
}

type Choice = BodyPhysics["collider"];

function geometryOf(body: Body, choice: Choice): Geometry {
  const none: Geometry = { localPose: ORIGIN, boxed: false, comM: [0, 0, 0] };
  let shape: InertiaShape | undefined;
  if (choice === "from-shape") {
    const own = body.shape;
    if (own?.kind === "box") shape = { kind: "box", size_mm: [own.size_mm[0], own.size_mm[1], own.size_mm[2]] };
    else if (own && own.kind !== "mesh") shape = own;
  } else if (choice.kind === "box") {
    shape = { kind: "box", size_mm: [choice.size_mm[0], choice.size_mm[1], choice.size_mm[2]] };
  } else if (choice.kind === "cylinder") {
    shape = { kind: "cylinder", radius_mm: choice.size_mm[0], height_mm: choice.size_mm[1] };
  } else if (choice.kind === "sphere") {
    shape = { kind: "sphere", radius_mm: choice.size_mm[0] };
  } else {
    const points = choice.points_mm.map((p) => [p[0] * MM, p[1] * MM, p[2] * MM] as Vec3);
    const lo = [0, 1, 2].map((a) => Math.min(...points.map((p) => p[a])));
    const hi = [0, 1, 2].map((a) => Math.max(...points.map((p) => p[a])));
    return {
      collider: { kind: "convex", pointsM: points },
      localPose: ORIGIN,
      inertiaShape: { kind: "box", size_mm: [(hi[0] - lo[0]) / MM, (hi[1] - lo[1]) / MM, (hi[2] - lo[2]) / MM] },
      boxed: true,
      comM: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2],
    };
  }
  return shape ? { ...none, ...colliderOfShape(shape), inertiaShape: shape } : none;
}

function thinnest(shape: InertiaShape): number {
  switch (shape.kind) {
    case "box":
      return Math.min(...shape.size_mm);
    case "cylinder":
      return Math.min(shape.height_mm, shape.radius_mm * 2);
    case "sphere":
      return shape.radius_mm * 2;
  }
}

const unit = (v: readonly number[], dm: typeof Math): Vec3 | undefined => {
  const n = dm.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return n > 0 ? [v[0] / n, v[1] / n, v[2] / n] : undefined;
};

/** Checks that the joints form one tree over the bodies; returns the errors. */
function checkTree(bodies: readonly Body[], joints: readonly Joint[]): SceneError[] {
  const errors: SceneError[] = [];
  const ids = new Set(bodies.map((b) => b.id));
  const parentOf = new Map<string, string>();
  joints.forEach((j, i) => {
    const path = `mechanical.joints.${i}`;
    for (const end of ["parent", "child"] as const) {
      if (!ids.has(j[end])) errors.push({ code: "RB-E-TREE", path: `${path}.${end}`, message: `${j[end]} is not a body in mechanical` });
    }
    if (!ids.has(j.parent) || !ids.has(j.child)) return;
    if (parentOf.has(j.child)) {
      errors.push({ code: "RB-E-TREE", path: `${path}.child`, message: `${j.child} is the child of more than one joint` });
    } else {
      parentOf.set(j.child, j.parent);
    }
  });
  const roots = bodies.filter((b) => !parentOf.has(b.id));
  if (roots.length !== 1) {
    errors.push({ code: "RB-E-TREE", path: "mechanical.bodies", message: `a robot needs exactly one root body, found ${roots.length}` });
    return errors;
  }
  for (const [i, b] of bodies.entries()) {
    const seen = new Set<string>();
    for (let at: string | undefined = b.id; at !== undefined; at = parentOf.get(at)) {
      if (seen.has(at)) {
        errors.push({ code: "RB-E-TREE", path: `mechanical.bodies.${i}`, message: `${b.id} is part of a loop of joints` });
        break;
      }
      seen.add(at);
    }
  }
  return errors;
}

/** Builds the physics scene from the document in the one fixed order of ROBOTICS 4.4. */
export function buildScene(doc: Project, deps: SceneDeps): Result<{ scene: SceneSpec; warnings: SceneWarning[] }, SceneError[]> {
  const data = doc.domains?.robotics?.data;
  if (!data) return fail([{ code: "RB-E-TREE", path: "domains.robotics", message: "the project has no robotics domain" }]);

  const dm = deps.dmath;
  const errors: SceneError[] = [];
  const warnings: SceneWarning[] = [];
  const frames = new Map((doc.mechanical?.frames ?? []).map((f) => [f.id, f]));
  const refOf = new Map(doc.components.map((c) => [c.id, c.definition.ref]));
  const partOf = (componentId: string | undefined) => {
    const ref = componentId === undefined ? undefined : refOf.get(componentId);
    return ref === undefined ? undefined : deps.describe(ref);
  };
  const surfaces = new Map(data.surfaces.map((s) => [s.id, s]));

  const bodyDocs = doc.mechanical?.bodies ?? [];
  const jointDocs = doc.mechanical?.joints ?? [];
  errors.push(...checkTree(bodyDocs, jointDocs));

  const bodies = bodyDocs.map((body, i) => ({ body, path: `mechanical.bodies.${i}` })).sort((a, b) => byId(a.body, b.body));
  const joints = jointDocs.map((joint, i) => ({ joint, path: `mechanical.joints.${i}` })).sort((a, b) => byId(a.joint, b.joint));

  const start = data.arena.start;
  const yaw = quatOfRpy([0, 0, start.yaw_deg], dm);
  const startPose: Pose = { p: [start.x_mm * MM, start.y_mm * MM, 0], q: yaw };

  const wheelOf = new Map<string, Joint>();
  for (const { joint } of joints) if (joint.kind === "wheel") wheelOf.set(joint.child, joint);

  const bodySpecs: BodySpec[] = [];
  const colliders: ColliderSpec[] = [];
  const worldQuat = new Map<string, Quat>();

  for (const { body, path } of bodies) {
    const physics = data.bodies[body.id];
    const world = frameInWorld(frames, body.frame, dm);
    if (!world) {
      errors.push({ code: "RB-E-TREE", path: `${path}.frame`, message: `frame ${body.frame} is unknown or its parents loop` });
      continue;
    }
    worldQuat.set(body.id, world.q);

    const part = partOf(body.component);
    const massG = body.mass_g ?? part?.mechanics?.mass_g;
    if (!(massG !== undefined && massG > 0)) {
      errors.push({ code: "RB-E-MASS", path: `${path}.mass_g`, message: `${body.id} is dynamic and needs a mass above 0` });
      continue;
    }
    const massKg = massG * G;

    const geometry = geometryOf(body, physics?.collider ?? "from-shape");
    if (geometry.inertiaShape && thinnest(geometry.inertiaShape) < MIN_DIM_MM && !geometry.boxed) {
      errors.push({ code: "RB-E-THIN", path: `${path}.shape`, message: `${body.id} has a collider dimension under ${MIN_DIM_MM} mm` });
    }

    let inertia: [number, number, number];
    if (body.inertia_g_mm2) {
      inertia = [body.inertia_g_mm2[0] * G_MM2, body.inertia_g_mm2[1] * G_MM2, body.inertia_g_mm2[2] * G_MM2];
    } else if (geometry.inertiaShape) {
      inertia = inertiaOf(geometry.inertiaShape, massKg);
      if (geometry.boxed) {
        warnings.push({ code: "RB-W-INERTIA-BOX", path, message: `${body.id} takes its inertia from the bounding box of its hull` });
      }
    } else {
      errors.push({ code: "RB-E-INERTIA", path: `${path}.inertia_g_mm2`, message: `${body.id} has no shape to take an inertia from; give inertia_g_mm2` });
      continue;
    }

    if (!triangleOk(inertia)) {
      errors.push({ code: "RB-E-INERTIA", path: `${path}.inertia_g_mm2`, message: `${body.id} has an inertia that is not positive or breaks the triangle inequality` });
      continue;
    }

    const wheel = wheelOf.get(body.id);
    const motor = wheel?.drive ? partOf(wheel.drive.component)?.mechanics?.motor : undefined;
    const axis = wheel && unit(wheel.axis ?? URDF_AXIS, dm);
    // The reflected rotor is an effective inertia, not a rigid shape, so it joins after the triangle check.
    if (motor?.j_kgm2 && axis) {
      const ratio = motor.gear?.ratio ?? 1;
      const reflected = motor.j_kgm2 * ratio * ratio;
      inertia = inertia.map((i, k) => i + reflected * axis[k] * axis[k]) as [number, number, number];
    }
    const friction = wheel ? (data.wheels[wheel.id]?.surface_mu ?? physics?.friction ?? DEFAULT_FRICTION) : (physics?.friction ?? DEFAULT_FRICTION);
    const pose = compose(startPose, world);
    bodySpecs.push({
      id: body.id,
      pose,
      massKg,
      comM: body.com_mm ? [body.com_mm[0] * MM, body.com_mm[1] * MM, body.com_mm[2] * MM] : geometry.comM,
      inertiaKgM2: inertia,
      inertiaFrame: IDENTITY,
      linearDamping: physics?.damping_lin ?? 0,
      angularDamping: physics?.damping_ang ?? 0,
      ccd: physics?.fast ?? false,
    });
    if (geometry.collider) {
      colliders.push({
        id: colliderOf(body.id),
        body: body.id,
        shape: geometry.collider,
        localPose: geometry.localPose,
        friction,
        restitution: physics?.restitution ?? 0,
        ...(friction === 0 ? { frictionCombine: "min" as const } : {}),
        sensor: false,
        noCollideWith: (physics?.noCollideWith ?? []).map(colliderOf).sort(),
      });
    }
  }

  const jointSpecs: JointSpec[] = [];
  for (const { joint, path } of joints) {
    const kind = joint.kind === "fixed" || joint.kind === "prismatic" ? joint.kind : "revolute";
    const axis = kind === "fixed" ? URDF_AXIS : unit(joint.axis ?? URDF_AXIS, dm);
    if (!axis) {
      errors.push({ code: "RB-E-AXIS", path: `${path}.axis`, message: `${joint.id} has a zero axis` });
      continue;
    }

    let limits: JointSpec["limits"];
    const { min, max } = joint.limits ?? {};
    if (joint.kind === "revolute" || joint.kind === "prismatic") {
      if ((min === undefined) !== (max === undefined)) {
        errors.push({ code: "RB-E-LIMITS", path: `${path}.limits`, message: `${joint.id} needs both min and max, or neither` });
      } else if (min !== undefined && max !== undefined) {
        const factor = joint.kind === "prismatic" ? MM : Math.PI / 180;
        if (min >= max) {
          errors.push({ code: "RB-E-LIMITS", path: `${path}.limits`, message: `${joint.id} has min at or above max` });
        } else if (joint.kind === "revolute" && max - min >= 360) {
          errors.push({ code: "RB-E-LIMITS", path: `${path}.limits`, message: `${joint.id} spans 360 degrees or more; make it continuous` });
        } else {
          limits = { min: min * factor, max: max * factor };
        }
      }
    }

    if (joint.kind === "wheel") {
      const childQuat = worldQuat.get(joint.child);
      if (!data.wheels[joint.id]) {
        errors.push({ code: "RB-E-WHEEL", path: `${ROOT}.wheels.${joint.id}`, message: `${joint.id} is a wheel and needs a wheel spec` });
      } else if (childQuat && Math.abs(qrotate(childQuat, axis)[2]) > dm.sin((WHEEL_TILT * Math.PI) / 180)) {
        errors.push({ code: "RB-E-WHEEL", path: `${path}.axis`, message: `${joint.id} has an axis more than ${WHEEL_TILT} degree off horizontal` });
      }
    }

    const physics = data.joints[joint.id];
    jointSpecs.push({
      id: joint.id,
      kind,
      parent: joint.parent,
      child: joint.child,
      parentFrame: poseOf(joint.origin, dm),
      childFrame: ORIGIN,
      axis,
      ...(limits ? { limits } : {}),
      dampingNmsPerRad: physics?.damping ?? 0,
      frictionNm: physics?.friction_nm ?? 0,
    });
  }

  const statics: StaticSpec[] = [];
  const surfaceOf = (id: string, path: string) => {
    const surface = surfaces.get(id);
    if (!surface) errors.push({ code: "RB-E-SURFACE", path, message: `${id} is not in surfaces` });
    return surface;
  };
  const { floor } = data.arena;
  const floorSurface = surfaceOf(floor.surface, `${ROOT}.arena.floor.surface`);
  if (floorSurface) {
    const [w, d] = floor.size_mm[0] > 0 && floor.size_mm[1] > 0 ? floor.size_mm : [DEFAULT_FLOOR_MM, DEFAULT_FLOOR_MM];
    statics.push({
      id: "arena.floor",
      pose: { p: [0, 0, -FLOOR_THICKNESS_M / 2], q: IDENTITY },
      shape: { kind: "box", halfM: [(w * MM) / 2, (d * MM) / 2, FLOOR_THICKNESS_M / 2] },
      friction: floorSurface.mu,
      restitution: 0,
      surface: floor.surface,
    });
  }
  data.arena.statics.forEach((s, i) => {
    const path = `${ROOT}.arena.statics.${i}`;
    const surface = surfaceOf(s.surface, `${path}.surface`);
    if (Math.min(...s.size_mm) < MIN_DIM_MM) {
      errors.push({ code: "RB-E-THIN", path: `${path}.size_mm`, message: `${s.id} has a dimension under ${MIN_DIM_MM} mm` });
    }
    if (!surface) return;
    statics.push({
      id: `arena.${s.id}`,
      pose: poseOf(s.pose, dm),
      shape: { kind: "box", halfM: [(s.size_mm[0] * MM) / 2, (s.size_mm[1] * MM) / 2, (s.size_mm[2] * MM) / 2] },
      friction: surface.mu,
      restitution: 0,
      surface: s.surface,
    });
  });

  if (errors.length > 0) return fail(errors);
  const { physics } = data;
  return ok({
    scene: {
      gravity: [physics.gravity_mps2[0], physics.gravity_mps2[1], physics.gravity_mps2[2]],
      lengthScale: physics.length_scale,
      sleeping: false,
      ccd: physics.ccd,
      combine: { friction: "average", restitution: "average" },
      solverIterations: physics.params.solver_iterations,
      bodies: bodySpecs,
      colliders: colliders.sort((a, b) => byId({ id: a.body }, { id: b.body }) || byId(a, b)),
      joints: jointSpecs,
      statics: statics.sort(byId),
    },
    warnings,
  });
}
