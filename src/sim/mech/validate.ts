import type { RobotProblem } from "../../core/robot-report.ts";
import type { Body, Joint, Project } from "../../project/generated/types.ts";
import { H_S, couplingCheck } from "./coupling.ts";
import type { InertiaShape } from "./inertia.ts";
import { ROBOT_LIMITS, tunnelBound } from "./limits.ts";
import { paramsFromDescriptor } from "./motor.ts";
import { type SceneDeps, buildScene, geometryOf, thinnest, worldPose } from "./scene.ts";

export interface ValidateDeps extends SceneDeps {
  /** The robot's top speed; the tunnelling check is skipped without it. */
  vMaxMps?: number;
}

type Args = RobotProblem["args"];

const ROOT = "domains.robotics.data";
const ASPECT_MAX = 50;
const MASS_RATIO_MAX = 100;
const TUNNEL_SHARE = 0.5;
const FLOOR_TOUCH_MM = 1;
const MIN_DIM_MM = 5;

const error = (code: string, path: string, args: Args, messageKey = `problems.${code}`): RobotProblem => ({ code, severity: "error", path, messageKey, args });
const warning = (code: string, path: string, args: Args): RobotProblem => ({ code, severity: "warning", path, messageKey: `problems.${code}`, args });
const round = (n: number): number => Number(n.toFixed(2));

const SEVERITY_ORDER = { error: 0, warning: 1 } as const;
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function extents(shape: InertiaShape): number[] {
  switch (shape.kind) {
    case "box":
      return [...shape.size_mm];
    case "cylinder":
      return [shape.radius_mm * 2, shape.radius_mm * 2, shape.height_mm];
    case "sphere":
      return [shape.radius_mm * 2];
  }
}

type Matrix = [number[], number[], number[]];

/** Roll about x, pitch about y, yaw about z, applied as Rz Ry Rx like the scene builder. */
function rotationOf(rpyDeg: readonly number[], dm: typeof Math): Matrix {
  const [r, p, y] = rpyDeg.map((d) => (d * Math.PI) / 180);
  const [sr, sp, sy] = [dm.sin(r), dm.sin(p), dm.sin(y)];
  const [cr, cp, cy] = [dm.cos(r), dm.cos(p), dm.cos(y)];
  return [
    [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
    [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
    [-sp, cp * sr, cp * cr],
  ];
}

/** Half the height of the shape above and below its centre, in the world. */
function halfHeightMm(shape: InertiaShape, rot: Matrix, dm: typeof Math): number {
  switch (shape.kind) {
    case "box":
      return shape.size_mm.reduce((sum, size, j) => sum + (Math.abs(rot[2][j]) * size) / 2, 0);
    case "cylinder": {
      const along = Math.abs(rot[2][2]);
      return along * (shape.height_mm / 2) + dm.sqrt(1 - along * along) * shape.radius_mm;
    }
    case "sphere":
      return shape.radius_mm;
  }
}

type Point = readonly [number, number];

function hull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (input: readonly Point[]) => {
    const out: Point[] = [];
    for (const p of input) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

function scenePath(path: string, doc: Project): { body?: string; joint?: string; static?: string } {
  const at = /^mechanical\.(bodies|joints)\.(\d+)/.exec(path);
  if (at) {
    const item = (at[1] === "bodies" ? doc.mechanical?.bodies : doc.mechanical?.joints)?.[Number(at[2])];
    return at[1] === "bodies" ? { body: item?.id } : { joint: item?.id };
  }
  const wheel = /\.wheels\.([^.]+)$/.exec(path);
  if (wheel) return { joint: wheel[1] };
  const wall = /\.arena\.statics\.(\d+)/.exec(path);
  if (wall) return { static: doc.domains?.robotics?.data.arena.statics[Number(wall[1])]?.id };
  return path.includes(".arena.floor") ? { static: "floor" } : {};
}

function sceneProblems(doc: Project, deps: SceneDeps): RobotProblem[] {
  const result = buildScene(doc, deps);
  const data = doc.domains?.robotics?.data;
  const out: RobotProblem[] = [];
  if (!result.ok) {
    for (const e of result.error) {
      const who = scenePath(e.path, doc);
      const thing = who.body ?? who.static ?? "";
      const joint = who.joint ?? who.body ?? e.path;
      switch (e.code) {
        case "RB-E-TREE":
          out.push(error(e.code, e.path, { joint }));
          break;
        case "RB-E-MASS":
        case "RB-E-INERTIA":
          out.push(error(e.code, e.path, { body: thing }));
          break;
        case "RB-E-THIN": {
          const body = doc.mechanical?.bodies.find((b) => b.id === who.body);
          const wall = data?.arena.statics.find((s) => s.id === who.static);
          const physics = who.body === undefined ? undefined : data?.bodies[who.body];
          const shape = body && geometryOf(body, physics?.collider ?? "from-shape").inertiaShape;
          const size = wall ? Math.min(...wall.size_mm) : shape ? thinnest(shape) : 0;
          out.push(error(e.code, e.path, { body: thing, size_mm: round(size), min_mm: MIN_DIM_MM }));
          break;
        }
        case "RB-E-AXIS":
        case "RB-E-WHEEL":
          out.push(error(e.code, e.path, { joint: who.joint ?? "" }));
          break;
        case "RB-E-LIMITS": {
          const limits = doc.mechanical?.joints.find((j) => j.id === who.joint)?.limits;
          out.push(error(e.code, e.path, { joint: who.joint ?? "", min: limits?.min ?? "", max: limits?.max ?? "" }));
          break;
        }
        case "RB-E-SURFACE": {
          const id = e.path.endsWith("floor.surface") ? data?.arena.floor.surface : data?.arena.statics.find((s) => s.id === who.static)?.surface;
          out.push(error(e.code, e.path, { body: thing, surface: id ?? "" }));
          break;
        }
      }
    }
  } else {
    for (const w of result.value.warnings) {
      out.push(warning(w.code, w.path, { body: scenePath(w.path, doc).body ?? "" }));
    }
  }
  return out;
}

function hasDrive(part: ReturnType<SceneDeps["describe"]>): boolean {
  const m = part?.mechanics;
  return Boolean(m?.motor || m?.servo || m?.stepper);
}

function driveProblems(doc: Project, deps: SceneDeps): RobotProblem[] {
  const refOf = new Map(doc.components.map((c) => [c.id, c.definition.ref]));
  const out: RobotProblem[] = [];
  (doc.mechanical?.joints ?? []).forEach((joint, i) => {
    if (!joint.drive) return;
    const path = `mechanical.joints.${i}.drive.component`;
    const component = joint.drive.component;
    const ref = refOf.get(component);
    const part = ref === undefined ? undefined : deps.describe(ref);
    if (!hasDrive(part)) {
      out.push(error("RB-E-DRIVE", path, { joint: joint.id, component }));
      return;
    }
    const motor = part?.mechanics?.motor;
    const params = motor && paramsFromDescriptor(motor);
    if (!params?.ok) return;
    const check = couplingCheck(params.value, H_S, component);
    if (!check.ok) out.push(error("RB-E-COUPLING", path, { component, factor: round(check.report.hc) }));
  });
  return out;
}

function sensorProblems(doc: Project, deps: SceneDeps): RobotProblem[] {
  const refOf = new Map(doc.components.map((c) => [c.id, c.definition.ref]));
  const out: RobotProblem[] = [];
  (doc.domains?.robotics?.data.sensors ?? []).forEach((binding, i) => {
    const ref = refOf.get(binding.component);
    const part = ref === undefined ? undefined : deps.describe(ref);
    const reason = !part ? "unknown-component" : part.mechanics?.sensor?.query !== binding.query ? "not-a-sensor" : undefined;
    if (reason) {
      out.push(error("RB-E-SENSOR", `${ROOT}.sensors.${i}.component`, { sensor: binding.id, component: binding.component, reason }, `problems.RB-E-SENSOR.${reason}`));
    }
  });
  return out;
}

function limitProblems(doc: Project): RobotProblem[] {
  const data = doc.domains?.robotics?.data;
  const bodies = doc.mechanical?.bodies ?? [];
  const colliders = bodies.filter((b) => geometryOf(b, data?.bodies[b.id]?.collider ?? "from-shape").collider !== undefined).length;
  const counts = [
    { which: "bodies", count: bodies.length, max: ROBOT_LIMITS.dynamicBodies, path: "mechanical.bodies" },
    { which: "colliders", count: colliders, max: ROBOT_LIMITS.colliders, path: "mechanical.bodies" },
    { which: "joints", count: doc.mechanical?.joints.length ?? 0, max: ROBOT_LIMITS.joints, path: "mechanical.joints" },
    { which: "sensors", count: data?.sensors.length ?? 0, max: ROBOT_LIMITS.sensors, path: `${ROOT}.sensors` },
    { which: "statics", count: data?.arena.statics.length ?? 0, max: ROBOT_LIMITS.statics, path: `${ROOT}.arena.statics` },
  ];
  return counts
    .filter((c) => c.count > c.max)
    .map((c) => error("RB-E-LIMIT", c.path, { count: c.count, max: c.max }, `problems.RB-E-LIMIT.${c.which}`));
}

interface Placed {
  body: Body;
  index: number;
  shape?: InertiaShape;
  centreMm: [number, number, number];
  rot: Matrix;
}

function place(doc: Project, deps: SceneDeps): Placed[] {
  const data = doc.domains?.robotics?.data;
  const out: Placed[] = [];
  (doc.mechanical?.bodies ?? []).forEach((body, index) => {
    let pose;
    try {
      pose = worldPose(doc, body.frame, deps);
    } catch {
      return;
    }
    const geometry = geometryOf(body, data?.bodies[body.id]?.collider ?? "from-shape");
    out.push({
      body,
      index,
      shape: geometry.boxed ? undefined : geometry.inertiaShape,
      centreMm: pose.position_mm as [number, number, number],
      rot: rotationOf(pose.rpy_deg, deps.dmath),
    });
  });
  return out;
}

function massOf(body: Body, deps: SceneDeps, doc: Project): number | undefined {
  const ref = doc.components.find((c) => c.id === body.component)?.definition.ref;
  const mass = body.mass_g ?? (ref === undefined ? undefined : deps.describe(ref)?.mechanics?.mass_g);
  return mass !== undefined && mass > 0 ? mass : undefined;
}

function shapeProblems(doc: Project, deps: SceneDeps, placed: readonly Placed[]): RobotProblem[] {
  const out: RobotProblem[] = [];
  for (const { body, index, shape } of placed) {
    if (!shape) continue;
    const sides = extents(shape);
    const shortest = Math.min(...sides);
    if (shortest > 0 && Math.max(...sides) / shortest > ASPECT_MAX) {
      out.push(warning("RB-W-ASPECT", `mechanical.bodies.${index}`, { body: body.id, ratio: round(Math.max(...sides) / shortest) }));
    }
  }
  for (const [i, joint] of (doc.mechanical?.joints ?? []).entries()) {
    const ratio = massRatio(doc, deps, joint);
    if (ratio !== undefined && ratio > MASS_RATIO_MAX) {
      out.push(warning("RB-W-MASSRATIO", `mechanical.joints.${i}`, { joint: joint.id, ratio: round(ratio) }));
    }
  }
  return out;
}

function massRatio(doc: Project, deps: SceneDeps, joint: Joint): number | undefined {
  const bodies = doc.mechanical?.bodies ?? [];
  const parent = bodies.find((b) => b.id === joint.parent);
  const child = bodies.find((b) => b.id === joint.child);
  const a = parent && massOf(parent, deps, doc);
  const b = child && massOf(child, deps, doc);
  return a && b ? Math.max(a / b, b / a) : undefined;
}

function tunnelProblems(doc: Project, placed: readonly Placed[], vMaxMps: number | undefined): RobotProblem[] {
  if (vMaxMps === undefined) return [];
  const walls = doc.domains?.robotics?.data.arena.statics ?? [];
  const wallMm = Math.min(...walls.map((s) => Math.min(...s.size_mm)));
  const stepMm = tunnelBound(vMaxMps, 1 / H_S) * 1e3;
  const out: RobotProblem[] = [];
  for (const { body, index, shape } of placed) {
    if (!shape) continue;
    const thinMm = Math.min(thinnest(shape), wallMm);
    if (stepMm > TUNNEL_SHARE * thinMm) {
      out.push(warning("RB-W-TUNNEL", `mechanical.bodies.${index}`, { body: body.id, speed: vMaxMps, step_mm: round(stepMm), thin_mm: round(thinMm) }));
    }
  }
  return out;
}

function tipProblems(doc: Project, deps: SceneDeps, placed: readonly Placed[]): RobotProblem[] {
  const wheels = new Set((doc.mechanical?.joints ?? []).filter((j) => j.kind === "wheel").map((j) => j.child));
  if (wheels.size === 0) return [];

  let massG = 0;
  const com: [number, number] = [0, 0];
  const support: Point[] = [];
  for (const { body, shape, centreMm, rot } of placed) {
    const mass = massOf(body, deps, doc);
    if (mass === undefined) continue;
    const offset = body.com_mm ?? [0, 0, 0];
    const comWorld = [0, 1].map((r) => centreMm[r] + rot[r][0] * offset[0] + rot[r][1] * offset[1] + rot[r][2] * offset[2]);
    massG += mass;
    com[0] += mass * comWorld[0];
    com[1] += mass * comWorld[1];
    if (shape && centreMm[2] - halfHeightMm(shape, rot, deps.dmath) <= FLOOR_TOUCH_MM) support.push([centreMm[0], centreMm[1]]);
  }
  const corners = hull(support);
  if (massG === 0 || corners.length < 3) return [];

  const centroid = [0, 1].map((a) => corners.reduce((sum, p) => sum + p[a], 0) / corners.length);
  const widths = [0, 1].map((a) => Math.max(...corners.map((p) => p[a])) - Math.min(...corners.map((p) => p[a])));
  const halfMm = Math.min(...widths) / 2;
  const offsetMm = Math.hypot(com[0] / massG - centroid[0], com[1] / massG - centroid[1]);
  return offsetMm > halfMm ? [warning("RB-W-CG", "mechanical.bodies", { offset_mm: round(offsetMm), half_mm: round(halfMm) })] : [];
}

/** Every robot rule of ROBOTICS 4.5 against the document, sorted by severity, code and path. */
export function validateRobot(doc: Project, deps: ValidateDeps): RobotProblem[] {
  const placed = place(doc, deps);
  const problems = [
    ...sceneProblems(doc, deps),
    ...driveProblems(doc, deps),
    ...sensorProblems(doc, deps),
    ...limitProblems(doc),
    ...shapeProblems(doc, deps, placed),
    ...tunnelProblems(doc, placed, deps.vMaxMps),
    ...tipProblems(doc, deps, placed),
  ];
  return problems.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || compare(a.code, b.code) || compare(a.path, b.path),
  );
}
