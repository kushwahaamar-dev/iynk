import type { PhysicsFrame } from "../../core/robot-report.ts";
import type { Body, Pose, Project } from "../../project/generated/types.ts";
import type { ArtElement, DrawItem, DrawList, HitTarget, RectMm } from "../engine/types.ts";

export type LengthUnit = "mm" | "cm" | "in";

/** `dropped` counts frame entries for bodies the document does not have; `skipped` lists bodies with no footprint to draw. */
export type TopDown = DrawList & { dropped: number; skipped: string[] };

/*
 * Plan view in world millimetres, +x right and +y up, so a positive yaw turns anticlockwise. The renderer flips y.
 * Strokes of "surface" items are in millimetres (a track is as wide as the paint); every other item uses pixels.
 */

export const TRAIL_MAX = 600;

const Z_FLOOR = 0;
const Z_TRACK = 10;
const Z_WALL = 20;
const Z_BODY = 30;
const Z_SENSOR = 40;
const Z_START = 50;
const Z_TRAIL = 60;

const INK = "var(--studio-ink)";
const BODY_FILL = "var(--studio-body)";
const WHEEL_FILL = "var(--studio-pin)";
const SENSOR_COLOUR = "var(--studio-wire-blue)";
const TRAIL_COLOUR = "var(--studio-wire-red)";
const OUTLINE_PX = 1.5;
const SENSOR_DOT_MM = 3;
const START_ARROW_MM = 60;
const BEAM_STEPS = 8;
const VERTICAL = 0.999;

type Vec = [number, number, number];
type Mat = [number, number, number, number, number, number, number, number, number];
type Rigid = { p: Vec; R: Mat };
type Footprint = { kind: "circle"; x: number; y: number; r: number } | { kind: "poly"; pts: [number, number][] };

const IDENTITY: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const RAD = Math.PI / 180;

const mulMat = (a: Mat, b: Mat): Mat => {
  const out = new Array<number>(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) out[i * 3 + j]! += a[i * 3 + k]! * b[k * 3 + j]!;
  return out as Mat;
};

const transpose = (m: Mat): Mat => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

const turn = (m: Mat, v: Vec): Vec => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

const rotZ = (a: number): Mat => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1];

/** Roll, pitch and yaw about the fixed x, y and z axes, in degrees (URDF). */
function fromPose(pose: Pose): Rigid {
  const [r, p, y] = pose.rpy_deg.map((d) => d * RAD) as Vec;
  const rx: Mat = [1, 0, 0, 0, Math.cos(r), -Math.sin(r), 0, Math.sin(r), Math.cos(r)];
  const ry: Mat = [Math.cos(p), 0, Math.sin(p), 0, 1, 0, -Math.sin(p), 0, Math.cos(p)];
  return { p: [pose.position_mm[0], pose.position_mm[1], pose.position_mm[2]], R: mulMat(rotZ(y), mulMat(ry, rx)) };
}

const compose = (a: Rigid, b: Rigid): Rigid => {
  const at = turn(a.R, b.p);
  return { p: [a.p[0] + at[0], a.p[1] + at[1], a.p[2] + at[2]], R: mulMat(a.R, b.R) };
};

const invert = (a: Rigid): Rigid => {
  const R = transpose(a.R);
  const p = turn(R, a.p);
  return { p: [-p[0], -p[1], -p[2]], R };
};

const yawOf = (R: Mat): number => Math.atan2(R[3], R[0]);

/** Each frame's pose in the world. A frame whose parent chain does not end at the world is left out. */
function worldFrames(doc: Project): Map<string, Rigid> {
  const frames = new Map((doc.mechanical?.frames ?? []).map((f) => [f.id, f]));
  const resolved = new Map<string, Rigid>();
  const visit = (id: string, depth: number): Rigid | undefined => {
    const known = resolved.get(id);
    if (known) return known;
    const frame = frames.get(id);
    if (!frame || depth > frames.size) return undefined;
    const local = fromPose(frame.pose);
    const parent = frame.parent === "world" ? { p: [0, 0, 0] as Vec, R: IDENTITY } : visit(frame.parent, depth + 1);
    if (!parent) return undefined;
    const world = compose(parent, local);
    resolved.set(id, world);
    return world;
  };
  for (const id of frames.keys()) visit(id, 0);
  return resolved;
}

function hull(points: [number, number][]): [number, number][] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (pts: [number, number][]) => {
    const out: [number, number][] = [];
    for (const p of pts) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half(sorted.reverse())];
}

/** The outline of a box with half sizes `half`, seen from above. */
function boxFootprint(at: Rigid, half: Vec): Footprint {
  const corners: [number, number][] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const v = turn(at.R, [sx * half[0], sy * half[1], sz * half[2]]);
        corners.push([at.p[0] + v[0], at.p[1] + v[1]]);
      }
    }
  }
  return { kind: "poly", pts: hull(corners) };
}

function footprintOf(body: Body, at: Rigid, wheel: { radius_mm: number; width_mm: number } | undefined): Footprint | null {
  const shape = body.shape;
  if (!shape) return null;
  if (shape.kind === "box") return boxFootprint(at, [shape.size_mm[0] / 2, shape.size_mm[1] / 2, shape.size_mm[2] / 2]);
  if (shape.kind === "sphere") return { kind: "circle", x: at.p[0], y: at.p[1], r: shape.radius_mm };
  if (shape.kind !== "cylinder") return null;
  const r = wheel?.radius_mm ?? shape.radius_mm;
  const height = wheel?.width_mm ?? shape.height_mm;
  if (Math.abs(at.R[8]) >= VERTICAL) return { kind: "circle", x: at.p[0], y: at.p[1], r };
  return boxFootprint(at, [r, r, height / 2]);
}

const polyPath = (pts: readonly (readonly [number, number])[], close: boolean): string =>
  `M${pts.map((p) => `${round(p[0])} ${round(p[1])}`).join("L")}${close ? "Z" : ""}`;

const round = (v: number): number => Math.round(v * 100) / 100;

function boundsOf(points: readonly (readonly [number, number])[], pad = 0): RectMm {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of points) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}

function item(id: string, kind: DrawItem["kind"], z: number, title: string, bbox: RectMm, elements: ArtElement[]): DrawItem {
  return { id, kind, z, lod: 0, xMm: 0, yMm: 0, rotation: 0, bbox, elements, title };
}

function footprintItem(id: string, kind: DrawItem["kind"], z: number, title: string, fp: Footprint, paint: { fill?: string; stroke?: string; sw?: number }): DrawItem {
  if (fp.kind === "circle") {
    const bbox = { x0: fp.x - fp.r, y0: fp.y - fp.r, x1: fp.x + fp.r, y1: fp.y + fp.r };
    return item(id, kind, z, title, bbox, [{ t: "circle", cx: round(fp.x), cy: round(fp.y), r: round(fp.r), ...paint }]);
  }
  return item(id, kind, z, title, boundsOf(fp.pts), [{ t: "path", d: polyPath(fp.pts, true), ...paint }]);
}

const grey = (reflectance: number): string => {
  const level = Math.round(255 * Math.min(1, Math.max(0, reflectance)));
  return `rgb(${level} ${level} ${level})`;
};

/** The pose of a body in the document, or the one the physics reports. Roll and pitch stay from the document: the frame carries only yaw. */
function bodyPose(doc: Rigid, frame: PhysicsFrame | undefined, id: string): Rigid {
  const reported = frame?.bodies[id];
  if (!reported) return doc;
  const tilt = mulMat(rotZ(-yawOf(doc.R)), doc.R);
  return { p: [reported.p[0], reported.p[1], reported.p[2]], R: mulMat(rotZ(reported.yawRad), tilt) };
}

export function buildTopDown(doc: Project, frame?: PhysicsFrame, opts: { trail?: Array<[number, number]> } = {}): TopDown {
  const robotics = doc.domains?.robotics?.data;
  const items: DrawItem[] = [];
  const targets: HitTarget[] = [];
  const skipped: string[] = [];

  if (robotics) {
    const { arena, surfaces } = robotics;
    const surface = (id: string) => surfaces.find((s) => s.id === id);
    const [fw, fh] = arena.floor.size_mm;
    const floorBox: [number, number][] = [[-fw / 2, -fh / 2], [fw / 2, -fh / 2], [fw / 2, fh / 2], [-fw / 2, fh / 2]];
    items.push(
      item("floor", "surface", Z_FLOOR, arena.floor.surface, boundsOf(floorBox), [
        { t: "path", d: polyPath(floorBox, true), fill: grey(surface(arena.floor.surface)?.reflectance ?? 1) },
      ]),
    );

    for (const track of arena.tracks) {
      const length = track.points_mm.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - track.points_mm[i]![0], p[1] - track.points_mm[i]![1]), 0);
      if (length === 0) continue;
      const pts = track.points_mm.map((p) => [p[0], p[1]] as [number, number]);
      items.push(
        item(`track:${track.id}`, "surface", Z_TRACK, track.id, boundsOf(pts, track.width_mm / 2), [
          { t: "path", d: polyPath(pts, track.closed), stroke: grey(track.reflectance), sw: track.width_mm },
        ]),
      );
    }

    for (const wall of arena.statics) {
      const [hx, hy, hz] = wall.size_mm.map((s) => s / 2) as Vec;
      items.push(footprintItem(`wall:${wall.id}`, "surface", Z_WALL, wall.id, boxFootprint(fromPose(wall.pose), [hx, hy, hz]), { fill: INK }));
    }
  }

  const frames = worldFrames(doc);
  const bodies = doc.mechanical?.bodies ?? [];
  const wheelOf = new Map<string, { radius_mm: number; width_mm: number }>();
  for (const joint of doc.mechanical?.joints ?? []) {
    const spec = robotics?.wheels[joint.id];
    if (joint.kind === "wheel" && spec) wheelOf.set(joint.child, spec);
  }

  const docPose = new Map<string, Rigid>();
  const moved = new Map<string, Rigid>();
  for (const body of bodies) {
    const base = frames.get(body.frame);
    if (!base) {
      skipped.push(body.id);
      continue;
    }
    docPose.set(body.id, base);
    const at = bodyPose(base, frame, body.id);
    moved.set(body.id, at);
    const wheel = wheelOf.get(body.id);
    const fp = footprintOf(body, at, wheel);
    if (!fp) {
      skipped.push(body.id);
      continue;
    }
    const drawn = footprintItem(`body:${body.id}`, "part", Z_BODY, body.name, fp, { fill: wheel ? WHEEL_FILL : BODY_FILL, stroke: INK, sw: OUTLINE_PX });
    items.push(drawn);
    targets.push({ item: drawn.id, hit: { kind: "part", c: body.id }, bbox: drawn.bbox });
  }

  const dropped = frame ? Object.keys(frame.bodies).filter((id) => !docPose.has(id) && !skipped.includes(id)).length : 0;

  if (robotics) {
    const bodyOfFrame = new Map(bodies.map((b) => [b.frame, b.id]));
    const mounts = new Map((doc.mechanical?.mounts ?? []).map((m) => [m.id, m]));
    for (const sensor of robotics.sensors) {
      const mount = mounts.get(sensor.mount);
      const mountFrame = mount && frames.get(mount.frame);
      if (!mount || !mountFrame) continue;
      let at = compose(mountFrame, fromPose(mount.pose));
      const carrier = bodyOfFrame.get(mount.frame);
      const before = carrier && docPose.get(carrier);
      const after = carrier && moved.get(carrier);
      if (before && after) at = compose(compose(after, invert(before)), at);
      const params = sensor.params ?? {};
      const yaw = yawOf(at.R);
      const elements: ArtElement[] = [];
      const beam = params.beam_deg;
      const range = params.range_max_mm;
      if (sensor.query === "ray-fan" && beam && range) {
        const pts: [number, number][] = [[at.p[0], at.p[1]]];
        for (let i = 0; i <= BEAM_STEPS; i++) {
          const a = yaw + (beam * RAD * (i / BEAM_STEPS - 0.5));
          pts.push([at.p[0] + range * Math.cos(a), at.p[1] + range * Math.sin(a)]);
        }
        elements.push({ t: "path", d: polyPath(pts, true), fill: "none", stroke: SENSOR_COLOUR, sw: 1 });
      }
      const radius = (params.footprint_mm ?? SENSOR_DOT_MM) / 2;
      elements.push({ t: "circle", cx: round(at.p[0]), cy: round(at.p[1]), r: radius, fill: SENSOR_COLOUR, stroke: INK, sw: 1 });
      const reach = range && beam ? range : radius;
      items.push(item(`sensor:${sensor.id}`, "overlay", Z_SENSOR, sensor.id, boundsOf([[at.p[0], at.p[1]]], reach), elements));
    }

    const { start } = robotics.arena;
    const heading = start.yaw_deg * RAD;
    const tip: [number, number] = [start.x_mm + START_ARROW_MM * Math.cos(heading), start.y_mm + START_ARROW_MM * Math.sin(heading)];
    items.push(
      item("start", "overlay", Z_START, "start", boundsOf([[start.x_mm, start.y_mm], tip]), [
        { t: "path", d: polyPath([[start.x_mm, start.y_mm], tip], false), stroke: TRAIL_COLOUR, sw: OUTLINE_PX },
        { t: "circle", cx: start.x_mm, cy: start.y_mm, r: SENSOR_DOT_MM, fill: TRAIL_COLOUR },
      ]),
    );
  }

  const trail = opts.trail?.slice(-TRAIL_MAX) ?? [];
  if (trail.length > 1) {
    items.push(item("trail", "overlay", Z_TRAIL, "trail", boundsOf(trail), [{ t: "path", d: polyPath(trail, false), stroke: TRAIL_COLOUR, sw: OUTLINE_PX }]));
  }

  return { items, targets, dropped, skipped };
}

const UNIT_MM: Record<LengthUnit, { per: number; digits: number }> = {
  mm: { per: 1, digits: 1 },
  cm: { per: 10, digits: 2 },
  in: { per: 25.4, digits: 3 },
};

/** Position and heading of one body as the physics reports it, to 0.1 mm. An unknown body gives an empty string. */
export function poseText(doc: Project, frame: PhysicsFrame, bodyId: string, unit: LengthUnit): string {
  const reported = frame.bodies[bodyId];
  const body = doc.mechanical?.bodies.find((b) => b.id === bodyId);
  if (!reported || !body) return "";
  const { per, digits } = UNIT_MM[unit];
  const length = (mm: number) => `${(mm / per).toFixed(digits)} ${unit}`;
  const degrees = ((reported.yawRad / RAD) % 360 + 360) % 360;
  return `${body.name}: x ${length(reported.p[0])}, y ${length(reported.p[1])}, yaw ${degrees.toFixed(1)}°`;
}
