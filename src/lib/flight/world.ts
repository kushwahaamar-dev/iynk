import { DEG } from "./math";
import type { Checkpoint, Course, Gate, HitKind, Prim } from "./types";

export const GATE_POST = 0.07; // m, gate post and bar thickness

export interface BoxSolid {
  k: "box";
  x: number;
  y: number;
  z0: number;
  z1: number;
  hw: number;
  hd: number;
  c: number;
  s: number;
  kind: HitKind;
  col: string;
  gate?: number; // index of the race gate this belongs to
}

export interface CylSolid {
  k: "cyl";
  x: number;
  y: number;
  z0: number;
  z1: number;
  r0: number;
  r1: number;
  diamond: boolean; // a 4-sided cone (roof): diamond footprint
  n: number; // sides, for drawing
  c: number;
  s: number;
  kind: HitKind;
  col: string;
}

export type Solid = BoxSolid | CylSolid;

// default colours, the same as the drawing uses
export const COLS = { box: "#d9d2c3", cyl: "#cfc8b8", trunk: "#bf8a4f", crown: "#6aa86b", roof: "#c96a4e", pole: "#8a8f93", gate: "#ece6d6", house: "#efe6d2" };

const box = (x: number, y: number, z: number, w: number, d: number, h: number, yaw: number, kind: HitKind, col: string = COLS.box): BoxSolid => ({
  k: "box",
  x,
  y,
  z0: z,
  z1: z + h,
  hw: w / 2,
  hd: d / 2,
  c: Math.cos(yaw * DEG),
  s: Math.sin(yaw * DEG),
  kind,
  col,
});

const cyl = (x: number, y: number, z: number, r: number, r1: number, h: number, n: number, rot: number, kind: HitKind, col: string = COLS.cyl): CylSolid => ({
  k: "cyl",
  x,
  y,
  z0: z,
  z1: z + h,
  r0: r,
  r1,
  diamond: n === 4,
  n,
  c: Math.cos(rot * DEG),
  s: Math.sin(rot * DEG),
  kind,
  col,
});

/** Roof of a house: a 4-sided pyramid whose base covers the walls' corners. */
export function roofOf(p: Extract<Prim, { type: "house" }>) {
  const r = (Math.hypot(p.w, p.d) / 2) * 1.02;
  const h = p.roof ?? 0.45 * Math.min(p.w, p.d);
  return { r, h, rot: (p.yaw ?? 0) + 45 };
}

export function treeParts(h: number) {
  return { trunkR: 0.16, trunkH: 0.35 * h, crownR: Math.max(0.5, 0.22 * h), crownZ: 0.3 * h, crownH: 0.7 * h };
}

export function gateSolids(g: Gate, index = 0): BoxSolid[] {
  const z = g.z ?? 0;
  const col = g.col ?? COLS.gate;
  const half = g.w / 2 + GATE_POST / 2;
  const c = Math.cos(g.heading * DEG), s = Math.sin(g.heading * DEG);
  // posts sit across the heading: offset along the left normal (-s, c)
  const px = -s * half, py = c * half;
  const out: BoxSolid[] = [
    box(g.x + px, g.y + py, 0, GATE_POST, GATE_POST, z + g.h + GATE_POST, g.heading, "gate", col),
    box(g.x - px, g.y - py, 0, GATE_POST, GATE_POST, z + g.h + GATE_POST, g.heading, "gate", col),
    box(g.x, g.y, z + g.h, GATE_POST, g.w + 2 * GATE_POST, GATE_POST, g.heading, "gate", col),
  ];
  if (z > 0) out.push(box(g.x, g.y, z - GATE_POST, GATE_POST, g.w + 2 * GATE_POST, GATE_POST, g.heading, "gate", col));
  for (const o of out) o.gate = index;
  return out;
}

/** Collision solids for a course: scenery plus the race gates. */
export function buildSolids(course: Course): Solid[] {
  const out: Solid[] = [];
  for (const p of course.prims) {
    switch (p.type) {
      case "box":
        out.push(box(p.x, p.y, p.z ?? 0, p.w, p.d, p.h, p.yaw ?? 0, p.kind ?? "obstacle", p.col));
        break;
      case "house": {
        out.push(box(p.x, p.y, 0, p.w, p.d, p.h, p.yaw ?? 0, p.kind ?? "building", p.col ?? COLS.house));
        const r = roofOf(p);
        out.push(cyl(p.x, p.y, p.h, r.r, 0, r.h, 4, r.rot, "roof", p.roofCol ?? COLS.roof));
        break;
      }
      case "cyl":
        out.push(cyl(p.x, p.y, p.z ?? 0, p.r, p.r1 ?? p.r, p.h, p.n ?? 14, p.rot ?? 0, p.kind ?? "obstacle", p.col));
        break;
      case "tree": {
        const t = treeParts(p.h ?? 3);
        out.push(cyl(p.x, p.y, 0, t.trunkR, t.trunkR, t.trunkH, 8, 0, "tree", COLS.trunk));
        out.push(cyl(p.x, p.y, t.crownZ, t.crownR, 0.03, t.crownH, 12, 0, "tree", p.col ?? COLS.crown));
        break;
      }
      case "pole":
        out.push(cyl(p.x, p.y, 0, p.r ?? 0.08, p.r ?? 0.08, p.h, 8, 0, p.kind ?? "pole", p.col ?? COLS.pole));
        break;
      default:
        break; // decals are flat
    }
  }
  course.gates.forEach((g, i) => out.push(...gateSolids(g, i)));
  return out;
}

/** The first solid the sphere (x, y, z, radius m) touches, or null. */
export function collide(solids: Solid[], x: number, y: number, z: number, m: number): Solid | null {
  for (const o of solids) {
    if (z < o.z0 - m || z > o.z1 + m) continue;
    const dx = x - o.x, dy = y - o.y;
    const lx = dx * o.c + dy * o.s, ly = -dx * o.s + dy * o.c;
    if (o.k === "box") {
      if (Math.abs(lx) < o.hw + m && Math.abs(ly) < o.hd + m) return o;
    } else {
      const k = Math.max(0, Math.min(1, (z - o.z0) / Math.max(1e-6, o.z1 - o.z0)));
      const r = o.r0 + (o.r1 - o.r0) * k;
      if (o.diamond ? Math.abs(lx) + Math.abs(ly) < r + m : lx * lx + ly * ly < (r + m) * (r + m)) return o;
    }
  }
  return null;
}

/** Did the segment a→b fly through the gate's opening along its heading? */
export function throughGate(g: Gate, a: [number, number, number], b: [number, number, number]): boolean {
  const c = Math.cos(g.heading * DEG), s = Math.sin(g.heading * DEG);
  const da = (a[0] - g.x) * c + (a[1] - g.y) * s;
  const db = (b[0] - g.x) * c + (b[1] - g.y) * s;
  if (!(da < 0 && db >= 0)) return false;
  const k = da / (da - db);
  const px = a[0] + (b[0] - a[0]) * k, py = a[1] + (b[1] - a[1]) * k, pz = a[2] + (b[2] - a[2]) * k;
  const lateral = -(px - g.x) * s + (py - g.y) * c;
  const z0 = g.z ?? 0;
  return Math.abs(lateral) < g.w / 2 && pz > z0 + 0.05 && pz < z0 + g.h;
}

/** Did the segment a→b pass the checkpoint (ring: crossed along the heading inside r; sphere: touched)? */
export function passCheckpoint(cp: Checkpoint, a: [number, number, number], b: [number, number, number], speed: number): boolean {
  if (cp.heading === undefined) {
    const d = Math.hypot(b[0] - cp.x, b[1] - cp.y, b[2] - cp.z);
    if (cp.land) return d < cp.r && b[2] < 0.3 && speed < 1.5;
    return d < cp.r;
  }
  const c = Math.cos(cp.heading * DEG), s = Math.sin(cp.heading * DEG);
  const da = (a[0] - cp.x) * c + (a[1] - cp.y) * s;
  const db = (b[0] - cp.x) * c + (b[1] - cp.y) * s;
  if (!(da < 0 && db >= 0)) return false;
  const k = da / (da - db);
  const px = a[0] + (b[0] - a[0]) * k, py = a[1] + (b[1] - a[1]) * k, pz = a[2] + (b[2] - a[2]) * k;
  const lateral = -(px - cp.x) * s + (py - cp.y) * c;
  return Math.hypot(lateral, pz - cp.z) < cp.r;
}
