import type { Arena, Surface, SensorBinding } from "../../project/generated/types.ts";
import type { Descriptor } from "../../parts/descriptor.ts";
import type { Pose, Quat, Ray, RayHit, Vec3 } from "./backend.ts";
import type { Rng } from "../../core/prng.ts";
import { dmath } from "./ports.ts";

export type MechanicsSensor = NonNullable<NonNullable<Descriptor["mechanics"]>["sensor"]>;

export interface SensorWorld {
  /** Pose of a body or frame in the world, metres. */
  pose(body: string): Pose;
  castRays(r: readonly Ray[]): Array<RayHit | null>;
  arena: Arena;
  surfaces: Surface[];
}

export interface LineReading {
  /** 0..1 reflectance after the height effect. */
  channels: number[];
  heightMm: number;
  /** When the sample was taken; a held reading keeps its own time, so its age is `now - atNs`. */
  atNs: number;
  note?: string;
}

export interface RangeReading {
  distanceMm: number | null;
  /** Echo pulse width; null when nothing came back, and the reader then waits out ECHO_TIMEOUT_US. */
  echoUs: number | null;
  atNs: number;
}

export type Sensor =
  | { modelled: false }
  | {
      modelled: true;
      id: string;
      /** Defaults that no descriptor or binding set, to show as "assumed". */
      assumed: string[];
      provenance: typeof PROVENANCE;
      /** Null until the first sample has passed its latency. */
      read(w: SensorWorld, atNs: number): LineReading | RangeReading | null;
      nextSampleNs(): number;
    };

export const ECHO_TIMEOUT_US = 38_000;
export const PROVENANCE = { kind: "computed", fidelity: "approximation", tier: "T1" } as const;

const MM = 1e-3;
const SPEED_OF_SOUND_MM_PER_US = 0.343;
const RING_POINTS = 8;
const RING_RATIO = 0.7;
const DEFAULT_CHANNELS = 8;
const DEFAULT_RAYS = 5;
const DEFAULT_PITCH_MM = 9.525;
const DEFAULT_H_OPT_MM = 3;
const DEFAULT_RANGE_MAX_MM = 9.5;
const DEFAULT_FOOTPRINT_MM = 6;
const DEFAULT_PERIOD_S = 0.01;
const IDENTITY: Pose = { p: [0, 0, 0], q: [0, 0, 0, 1] };

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
  return [v[0] + w * tx + y * tz - z * ty, v[1] + w * ty + z * tx - x * tz, v[2] + w * tz + x * ty - y * tx];
}

function toWorld(base: Pose, local: Pose): Pose {
  const o = qrotate(base.q, local.p);
  return { p: [base.p[0] + o[0], base.p[1] + o[1], base.p[2] + o[2]], q: qmul(base.q, local.q) };
}

function distToSegmentMm(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** The painted line under (x, y) if there is one, else the floor. Millimetres in arena floor coordinates. */
export function reflectanceAt(arena: Arena, surfaces: Surface[], xMm: number, yMm: number): number {
  for (const track of arena.tracks) {
    const pts = track.points_mm;
    const last = track.closed ? pts.length : pts.length - 1;
    for (let i = 0; i < last; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (distToSegmentMm(xMm, yMm, a[0], a[1], b[0], b[1]) <= track.width_mm / 2) return track.reflectance;
    }
  }
  const floor = surfaces.find((s) => s.id === arena.floor.surface);
  if (!floor) throw new RangeError(`floor surface ${arena.floor.surface} is not in the surface table`);
  return floor.reflectance;
}

const param = (b: SensorBinding, d: MechanicsSensor, key: string): number | undefined =>
  b.params?.[key] ?? (d as Record<string, unknown>)[key] as number | undefined;

export function sampleLine(b: SensorBinding, d: MechanicsSensor, w: SensorWorld, mountPose: Pose, g: Rng, atNs: number): LineReading {
  const mount = toWorld(w.pose(b.mount), mountPose);
  const heightMm = mount.p[2] / MM;
  const channelCount = param(b, d, "channels") ?? DEFAULT_CHANNELS;
  const pitchMm = b.params?.pitch_mm ?? DEFAULT_PITCH_MM;
  const hOpt = b.params?.h_opt_mm ?? DEFAULT_H_OPT_MM;
  const hRange = b.params?.h_range_mm ?? (d.range_max_mm ?? DEFAULT_RANGE_MAX_MM) - hOpt;
  const radiusMm = (param(b, d, "footprint_mm") ?? DEFAULT_FOOTPRINT_MM) / 2;
  const sigma = param(b, d, "noise_sigma_ratio") ?? 0;

  if (heightMm < 0 || qrotate(mount.q, [0, 0, -1])[2] >= 0) {
    return { channels: new Array<number>(channelCount).fill(0), heightMm, atNs, note: heightMm < 0 ? "sensor is under the floor" : "sensor faces up" };
  }

  const offsets: Array<[number, number]> = [[0, 0]];
  for (let k = 0; k < RING_POINTS; k++) {
    const a = (2 * Math.PI * k) / RING_POINTS;
    offsets.push([radiusMm * RING_RATIO * dmath.cos(a), radiusMm * RING_RATIO * dmath.sin(a)]);
  }

  const channels: number[] = [];
  for (let c = 0; c < channelCount; c++) {
    const yMm = (c - (channelCount - 1) / 2) * pitchMm;
    const centre = toWorld(mount, { p: [0, yMm * MM, 0], q: IDENTITY.q });
    const h = centre.p[2] / MM;
    let sum = 0;
    for (const [ox, oy] of offsets) {
      const p = toWorld(mount, { p: [ox * MM, (yMm + oy) * MM, 0], q: IDENTITY.q }).p;
      sum += reflectanceAt(w.arena, w.surfaces, p[0] / MM, p[1] / MM);
    }
    const x = (h - hOpt) / hRange;
    let value = (sum / offsets.length) * Math.max(0, 1 - x * x);
    if (sigma > 0) value *= 1 + g.gauss() * sigma;
    channels.push(Math.min(1, Math.max(0, value)));
  }
  return { channels, heightMm, atNs };
}

export function sampleRange(b: SensorBinding, d: MechanicsSensor, w: SensorWorld, mountPose: Pose, g: Rng, atNs: number): RangeReading {
  const mount = toWorld(w.pose(b.mount), mountPose);
  const n = Math.max(1, Math.round(param(b, d, "rays") ?? DEFAULT_RAYS));
  const beamRad = ((param(b, d, "beam_deg") ?? 0) * Math.PI) / 180;
  const minMm = param(b, d, "range_min_mm") ?? 0;
  const maxMm = param(b, d, "range_max_mm") ?? 0;
  const maxAngle = param(b, d, "echo_max_angle_deg") ?? 90;
  const sigma = param(b, d, "noise_sigma_mm") ?? 0;

  const rays: Ray[] = [];
  for (let i = 0; i < n; i++) {
    const a = n === 1 ? 0 : -beamRad / 2 + (beamRad * i) / (n - 1);
    rays.push({ origin: mount.p, dir: qrotate(mount.q, [dmath.cos(a), dmath.sin(a), 0]), maxM: maxMm * MM });
  }

  let nearestMm: number | null = null;
  w.castRays(rays).forEach((hit, i) => {
    if (!hit) return;
    const dir = rays[i].dir;
    const cosIncidence = -(dir[0] * hit.normal[0] + dir[1] * hit.normal[1] + dir[2] * hit.normal[2]);
    const incidenceDeg = (dmath.atan2(Math.sqrt(Math.max(0, 1 - cosIncidence * cosIncidence)), cosIncidence) * 180) / Math.PI;
    const mm = hit.toiM / MM;
    if (incidenceDeg > maxAngle || mm < minMm) return;
    if (nearestMm === null || mm < nearestMm) nearestMm = mm;
  });

  if (nearestMm === null) return { distanceMm: null, echoUs: null, atNs };
  const distanceMm = Math.max(0, nearestMm + (sigma > 0 ? g.gauss() * sigma : 0));
  return { distanceMm, echoUs: (2 * distanceMm) / SPEED_OF_SOUND_MM_PER_US, atNs };
}

export function createSensor(b: SensorBinding, d: MechanicsSensor | undefined, rng: (stream: string) => Rng): Sensor {
  if (!d) return { modelled: false };
  const g = rng(`sensor:${b.component}`);
  const sample = d.query === "surface-sample" ? sampleLine : sampleRange;
  const assumed: string[] = [];
  const periodS = param(b, d, "period_s") ?? (assumed.push("period_s"), DEFAULT_PERIOD_S);
  const latencyNs = Math.round((param(b, d, "latency_s") ?? 0) * 1e9);
  const periodNs = Math.round(periodS * 1e9);

  let nextNs = 0;
  let shown: LineReading | RangeReading | null = null;
  const inFlight: Array<LineReading | RangeReading> = [];

  return {
    modelled: true,
    id: b.id,
    assumed,
    provenance: PROVENANCE,
    read(w, atNs) {
      if (atNs >= nextNs) {
        inFlight.push(sample(b, d, w, IDENTITY, g, atNs));
        nextNs = atNs + periodNs;
      }
      while (inFlight.length > 0 && inFlight[0].atNs + latencyNs <= atNs) shown = inFlight.shift() ?? shown;
      return shown;
    },
    nextSampleNs: () => nextNs,
  };
}
