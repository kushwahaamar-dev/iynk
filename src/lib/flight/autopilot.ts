import { clamp, DEG, G, wrapDeg, type Vec3 } from "./math";
import { currentMission, emit, STEP, type SimState } from "./state";
import type { Waypoint } from "./types";

export interface Command {
  pitch: number | null; // deg target (angle) or null = sticks
  roll: number | null;
  yawRate: number | null; // deg/s
  climb: number | null; // -1..1 of climbRate
}

export function autopilot(s: SimState): Command {
  const cmd: Command = { pitch: null, roll: null, yawRate: null, climb: null };
  const m = s.mode;
  const c = s.craft;
  const speed = c.loiterSpeed ?? 5;
  const vd: [number, number] | null = (() => {
    if (m.task === "rtl" || m.task === "qrtl") return rtlVelocity(s, cmd, speed);
    if (m.task === "mission" || m.task === "figure8" || m.task === "demo") return missionVelocity(s, cmd, speed);
    if (m.position) {
      const st = s.sticks;
      const fx = Math.cos(s.yaw * DEG), fy = Math.sin(s.yaw * DEG);
      const vx = (st.pitch * fx - st.roll * fy) * speed, vy = (st.pitch * fy + st.roll * fx) * speed;
      const moving = Math.hypot(st.pitch, st.roll) > 0.05;
      if (moving || !s.hold) s.hold = [s.p[0], s.p[1], s.p[2]];
      if (moving) return [vx, vy];
      return [(s.hold[0] - s.p[0]) * 0.8, (s.hold[1] - s.p[1]) * 0.8];
    }
    return null;
  })();
  if (vd) {
    const lim = Math.tan((m.angleLimit ?? c.angleLimit) * DEG) * G;
    let ax = 2.2 * (vd[0] - s.v[0]), ay = 2.2 * (vd[1] - s.v[1]);
    const a = Math.hypot(ax, ay);
    if (a > lim) {
      ax *= lim / a;
      ay *= lim / a;
    }
    const fx = Math.cos(s.yaw * DEG), fy = Math.sin(s.yaw * DEG);
    const af = ax * fx + ay * fy, al = -ax * fy + ay * fx;
    cmd.pitch = Math.atan(af / G) / DEG;
    cmd.roll = Math.atan(al / G) / DEG;
  }
  return cmd;
}

function headTo(s: SimState, cmd: Command, x: number, y: number) {
  const want = Math.atan2(y - s.p[1], x - s.p[0]) / DEG;
  cmd.yawRate = clamp(wrapDeg(want - s.yaw) * 2, -90, 90);
}

function rtlVelocity(s: SimState, cmd: Command, speed: number): [number, number] {
  const [hx, hy] = s.course.pad;
  const alt = s.craft.rtlAlt ?? 15;
  const d = Math.hypot(hx - s.p[0], hy - s.p[1]);
  const rate = s.craft.climbRate;
  if (!s.armed) return [0, 0];
  if (s.phase === "climb") {
    cmd.climb = clamp((alt - s.p[2]) / rate, -1, 1);
    if (s.p[2] > alt - 0.5 || d < 1.5) s.phase = d < 1.5 ? "descend" : "go";
    return [0, 0];
  }
  if (s.phase === "go") {
    cmd.climb = clamp((alt - s.p[2]) / rate, -1, 1);
    headTo(s, cmd, hx, hy);
    if (d < 1) s.phase = "descend";
    const k = Math.min(speed, d * 0.6) / Math.max(1e-6, d);
    return [(hx - s.p[0]) * k, (hy - s.p[1]) * k];
  }
  cmd.climb = s.p[2] > 3 ? -1 / rate : -0.5 / rate;
  return [(hx - s.p[0]) * 0.8, (hy - s.p[1]) * 0.8];
}

function missionVelocity(s: SimState, cmd: Command, speed: number): [number, number] {
  const mission = currentMission(s);
  if (!mission || !s.armed) return [0, 0];
  const rate = s.craft.climbRate;
  if (s.wp >= mission.waypoints.length) {
    if (mission.rtl) return rtlVelocity(s, cmd, speed);
    // after a landing it stays down; otherwise it holds where it finished
    cmd.climb = isLanding(mission.waypoints[mission.waypoints.length - 1]) ? -0.5 / rate : 0;
    return [0, 0];
  }
  // the demo flies a tighter line through gates and rings, and talks through the course's own events instead
  const demo = s.mode.task === "demo";
  const w = mission.waypoints[s.wp];
  const dx = w.x - s.p[0], dy = w.y - s.p[1], dz = w.z - s.p[2];
  const d = Math.hypot(dx, dy);
  const landing = isLanding(w);
  const line = demo ? lineVelocity(s, w, speed) : null;
  // a landing goal is flown to at the height the craft has and then landed straight down (ArduCopter's NAV_LAND),
  // instead of gliding down across the field toward it
  const overhead = landing && d > 1.5;
  cmd.climb = line ? clamp(line[2] / rate, -1, 1) : overhead ? 0 : clamp((dz * 0.8) / rate, -1, 1);
  // over the pad it keeps coming down at a steady 0.35 m/s instead of easing off just above the ground
  if (landing && d < 1.5) cmd.climb = Math.min(cmd.climb, -0.35 / rate);
  if (d > 1.5) headTo(s, cmd, w.x, w.y);
  if (landing ? d < (w.r ?? 1.0) && s.p[2] < 0.05 : Math.hypot(d, dz) < (w.r ?? 1.0)) {
    s.wpHold += STEP;
    if (s.wpHold >= (w.hold ?? 0)) {
      if (w.action === "spray-on") s.spray = true;
      if (w.action === "spray-off") s.spray = false;
      if (w.action === "drop") release(s);
      const scored = demo || s.course.kind === "mission";
      if (!scored) emit(s, { type: "missionStep", index: s.wp + 1, total: mission.waypoints.length, label: w.label, action: w.action });
      s.wp++;
      s.wpHold = 0;
      s.legFrom = [w.x, w.y, w.z];
      if (s.wp >= mission.waypoints.length) {
        if (mission.loopFrom !== undefined) s.wp = mission.loopFrom;
        else {
          if (!scored) emit(s, { type: "missionDone" });
          s.phase = "climb";
        }
      }
    }
    if (!line) return [dx * 0.8, dy * 0.8];
  }
  if (line) return [line[0], line[1]];
  const v = Math.min(w.speed ?? speed, d * 0.6) / Math.max(1e-6, d);
  return [dx * v, dy * v];
}

/**
 * The demo's velocity: along the 3D line from the last waypoint to this one, pulled back onto it when it drifts
 * (after a hairpin, in wind), and never faster along it than the climb rate lets the height keep up.
 */
function lineVelocity(s: SimState, w: Waypoint, speed: number): Vec3 {
  const p = s.p, b: Vec3 = [w.x, w.y, w.z];
  const toB: Vec3 = [b[0] - p[0], b[1] - p[1], b[2] - p[2]];
  const rem = Math.hypot(toB[0], toB[1], toB[2]);
  const a = s.legFrom;
  const seg: Vec3 | null = a ? [b[0] - a[0], b[1] - a[1], b[2] - a[2]] : null;
  const len = seg ? Math.hypot(seg[0], seg[1], seg[2]) : 0;
  const along = a && seg && len > 1e-3 ? ((p[0] - a[0]) * seg[0] + (p[1] - a[1]) * seg[1] + (p[2] - a[2]) * seg[2]) / len : len;
  if (!a || !seg || len < 1e-3 || along >= len) {
    const k = Math.min(w.speed ?? speed, rem * 1.2 + 0.2) / Math.max(1e-6, rem);
    return [toB[0] * k, toB[1] * k, toB[2] * k];
  }
  const u: Vec3 = [seg[0] / len, seg[1] / len, seg[2] / len];
  const t = Math.max(0, along);
  const near: Vec3 = [a[0] + u[0] * t - p[0], a[1] + u[1] * t - p[1], a[2] + u[2] * t - p[2]];
  const climbCap = Math.abs(u[2]) > 1e-3 ? (0.85 * s.craft.climbRate) / Math.abs(u[2]) : Infinity;
  // off the line (a hairpin before a gate) it slows down along it until the correction has pulled it back
  const off = Math.hypot(near[0], near[1], near[2]);
  const v = Math.min(w.speed ?? speed, rem * 1.2 + 0.2, climbCap) * clamp(1 - off / 0.6, 0.15, 1);
  return [u[0] * v + near[0] * 2, u[1] * v + near[1] * 2, u[2] * v + near[2] * 2];
}

const isLanding = (w: Waypoint) => w.action === "land" || w.z <= 0.01;

/** The drop: the payload leaves the craft where it is, so it flies lighter from here to the pad. */
export function release(s: SimState) {
  const g = s.craft.payloadG;
  if (!g || s.dropped > 0) return;
  s.dropped = Math.min(g, s.calc.auw * 0.8);
  s.parcel = [s.p[0], s.p[1], 0];
  emit(s, { type: "drop", g: Math.round(s.dropped) });
}
