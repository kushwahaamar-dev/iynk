import { DEG, type Vec3 } from "./math";
import { buildSolids, collide, type Solid } from "./world";
import type { Course, FlightCraft, Mission, Waypoint } from "./types";

// The autopilot demo's route: the course's own targets in order (the gates looping, or the checkpoints once), with
// an approach and an exit point through every gate and ring, and a way round or over whatever stands between two
// points. The sim flies it with the mission autopilot (task "demo"), so every course in the registry is proven
// flyable by the same physics the learner flies, and a newcomer can watch the line before trying it.

export const DEMO_MISSION = "demo";

/** Is the straight path a->b free of solids for a sphere of radius m? */
export function clearPath(solids: Solid[], a: Vec3, b: Vec3, m: number): boolean {
  const near = solids.filter((o) => {
    if (o.pass) return false;
    const reach = (o.k === "box" ? Math.hypot(o.hw, o.hd) : Math.max(o.r0, o.r1)) + m;
    return (
      Math.max(a[0], b[0]) > o.x - reach &&
      Math.min(a[0], b[0]) < o.x + reach &&
      Math.max(a[1], b[1]) > o.y - reach &&
      Math.min(a[1], b[1]) < o.y + reach &&
      Math.max(a[2], b[2]) > o.z0 - m &&
      Math.min(a[2], b[2]) < o.z1 + m
    );
  });
  if (!near.length) return true;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const n = Math.max(1, Math.ceil(len / Math.max(0.04, m * 0.5)));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    if (collide(near, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, m)) return false;
  }
  return true;
}

const add = (p: Vec3, d: Vec3, k: number): Vec3 => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];

/** A course target in flying order: a point to reach, or a gate or ring to fly through along `dir`. */
type Target = { c: Vec3; dir: Vec3 | null; size: number; leg: number; label: string; r: number };

/** Ways to fly from a to b for a sphere of radius m (the last point is b), simplest first. */
function leg(solids: Solid[], a: Vec3, b: Vec3, m: number, top: number): Vec3[] | null {
  const clear = (...pts: Vec3[]) => pts.every((p, i) => i === 0 || clearPath(solids, pts[i - 1], p, m));
  if (clear(a, b)) return [b];
  // straight up or down first, or level first
  const up: Vec3 = [a[0], a[1], b[2]], level: Vec3 = [b[0], b[1], a[2]];
  if (clear(a, up, b)) return [up, b];
  if (clear(a, level, b)) return [level, b];
  // round the side: one point off the middle of the line, at either end's height
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len > 1e-3) {
    const nx = -dy / len, ny = dx / len;
    const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const base = Math.max(m * 3, 0.4);
    for (const off of [1, 2, 3.5, 6, 10]) {
      if (base * off > len * 1.5) break;
      for (const side of [1, -1]) {
        for (const z of [mid[2], Math.max(a[2], b[2])]) {
          const p: Vec3 = [mid[0] + nx * base * off * side, mid[1] + ny * base * off * side, z];
          if (clear(a, p, b)) return [p, b];
        }
      }
    }
  }
  // over the top: up to the lowest clear height, across and down
  const step = Math.max(0.3, (top - Math.max(a[2], b[2])) / 40);
  for (let h = Math.max(a[2], b[2]) + step; h <= top; h += step) {
    const a2: Vec3 = [a[0], a[1], h], b2: Vec3 = [b[0], b[1], h];
    if (clear(a, a2, b2, b)) return [a2, b2, b];
  }
  return null;
}

const EXTEND = [0, 0.6, 1.2, 2, 3.5, 6];

/**
 * From `from` (leaving along `out` after a gate or ring) to `to` (entered along `inn`): the points to fly, with
 * the exit carried on and the approach drawn out where the straight end of a pass leaves the craft boxed in.
 */
function connect(solids: Solid[], from: Vec3, out: Vec3 | null, outReach: number, to: Vec3, inn: Vec3 | null, innReach: number, margins: number[], top: number): Vec3[] | null {
  for (const m of margins) {
    for (const e of out ? EXTEND.map((k) => k * outReach) : [0]) {
      const p0 = out ? add(from, out, e) : from;
      if (e && !clearPath(solids, from, p0, m)) break;
      for (const g of inn ? EXTEND.map((k) => k * innReach) : [0]) {
        const p1 = inn ? add(to, inn, -g) : to;
        if (g && !clearPath(solids, p1, to, m)) break;
        const path = leg(solids, p0, p1, m, top);
        if (path) return [...(e ? [p0] : []), ...path, ...(g ? [to] : [])];
      }
    }
  }
  return null;
}

/** The course's targets in flying order (the gates on a gate course, else the checkpoints). */
function targets(course: Course): Target[] {
  const ring = (heading: number): Vec3 => [Math.cos(heading * DEG), Math.sin(heading * DEG), 0];
  const gates = course.kind ? course.kind === "gates" : course.gates.length > 0 && !course.checkpoints.length;
  if (gates) {
    return course.gates.map((g, i) => ({
      c: [g.x, g.y, (g.z ?? 0) + g.h / 2],
      dir: ring(g.heading),
      size: Math.max(g.w, 1.2),
      leg: i,
      label: "",
      r: Math.max(0.1, Math.min(g.w, g.h) / 4),
    }));
  }
  return course.checkpoints.map((cp, i) => ({
    c: [cp.x, cp.y, cp.land ? 0 : cp.z],
    dir: cp.heading === undefined ? null : ring(cp.heading),
    size: cp.heading === undefined ? cp.r : Math.max(cp.r * 2, 0.6),
    leg: i,
    label: cp.label,
    r: cp.heading === undefined ? Math.max(0.12, Math.min(cp.r * 0.5, 1)) : Math.max(0.08, Math.min(cp.r * 0.3, 0.6)),
  }));
}

/** The demo route for a craft on a course, or null when the planner finds no clear way through it. */
export function demoRoute(course: Course, craft: FlightCraft): Mission | null {
  const solids = buildSolids(course);
  if (craft.class === "wing") {
    // a wing cannot hover or climb straight up: it steers for each target's middle and is drawn round by its turns
    const pts = course.checkpoints.map((cp, i) => ({ x: cp.x, y: cp.y, z: cp.land ? 0 : cp.z, label: cp.label, r: Math.max(2, cp.r * 0.7), leg: i }));
    return pts.length ? { id: DEMO_MISSION, waypoints: pts } : null;
  }
  const hit = craft.hitRadius;
  const margins = [hit * 1.6 + 0.05, hit * 1.25 + 0.02, hit * 1.05 + 0.005];
  const top = (course.ceiling ?? craft.ceiling) - 3.2;
  const plan = targets(course);
  if (!plan.length) return null;
  const speed = Math.max(1.2, Math.min(6, course.field / 9));
  const lift = Math.max(0.5, Math.min(1.5, top / 3));
  const corner = (m: number) => Math.min(0.5, Math.max(0.12, m));
  const waypoints: Waypoint[] = [];
  const push = (p: Vec3, leg: number, label: string, r: number) => waypoints.push({ x: p[0], y: p[1], z: p[2], label, r, speed, leg });
  let at: Vec3 = [course.pad[0], course.pad[1], lift];
  let out: Vec3 | null = null;
  let outReach = 0;
  push(at, 0, "", corner(margins[0]));
  // a gate race closes the lap through the first gate again, then carries on from the second gate's leg
  const loop = course.kind === "gates";
  let loopFrom = 0;
  for (const [i, t] of (loop ? [...plan, plan[0]] : plan).entries()) {
    if (loop && i === 1) loopFrom = waypoints.length;
    if (!t.dir) {
      const path = connect(solids, at, out, outReach, t.c, null, 0, margins, top);
      if (!path) return null;
      path.forEach((p, j) => push(p, t.leg, t.label, j === path.length - 1 ? t.r : corner(margins[0])));
      at = t.c;
      out = null;
      outReach = 0;
      continue;
    }
    // through a gate or ring: the widest clear approach and exit, reached from wherever the last target left off
    let done = false;
    for (const m of margins) {
      for (const k of [2.5, 1.6, 1, 0.6, 0.35]) {
        const d = Math.max(m * 2, t.size * k);
        const a = add(t.c, t.dir, -d), e = add(t.c, t.dir, d);
        if (!clearPath(solids, a, e, m)) continue;
        const reach = Math.max(0.3, t.size * 0.5);
        const path = connect(solids, at, out, outReach, a, t.dir, reach, margins, top);
        if (!path) continue;
        for (const p of path) push(p, t.leg, t.label, t.r);
        push(e, t.leg, t.label, t.r);
        at = e;
        out = t.dir;
        outReach = reach;
        done = true;
        break;
      }
      if (done) break;
    }
    if (!done) return null;
  }
  return loop ? { id: DEMO_MISSION, waypoints, loopFrom } : { id: DEMO_MISSION, waypoints };
}
