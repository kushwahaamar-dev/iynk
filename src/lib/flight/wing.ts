import { voltageFactor } from "./battery";
import { bodyAxes, clamp, DEG, G, wrapDeg, type Vec3 } from "./math";
import { ceilingOf, currentMission, emit, groundContact, windAt, type SimState } from "./state";

export function vtolTransition(s: SimState, a: Vec3, dt: number) {
  const vt = s.craft.vtol!;
  const wantCruise = s.mode.task === "transition";
  const step = dt / vt.transitionS;
  s.tilt = clamp(s.tilt + (wantCruise && s.p[2] > 2 ? step : -step), 0, 1);
  const fwd = Math.hypot(s.v[0], s.v[1]);
  const lift = Math.min(1, (fwd / vt.vmin) ** 2) * s.tilt;
  a[2] += lift * G;
  s.servo = s.tilt * 90;
  if (wantCruise && s.tilt >= 1 && fwd > vt.vmin * 1.1) {
    s.cruise = true;
    s.airspeed = fwd;
    s.launched = true;
    s.yaw = Math.atan2(s.v[1], s.v[0]) / DEG;
    s.pitch = 0;
    emit(s, { type: "transition", to: "cruise" });
  }
}

export function wingStep(s: SimState, dt: number) {
  const c = s.craft, calc = s.calc, st = s.sticks, w = (c.vtol ?? c.wing)!;
  const mass = (calc.auw - s.dropped) / 1000;
  const live = s.armed && !s.crashed;
  const isVtol = !!c.vtol;
  if (isVtol && (s.mode.task === "qrtl" || s.mode.task === "free")) {
    // back to hover: slow down on the wing, tilt the motors up
    s.cruise = false;
    s.v = [Math.cos(s.yaw * DEG) * s.airspeed, Math.sin(s.yaw * DEG) * s.airspeed, s.v[2]];
    s.pitch = 0;
    emit(s, { type: "transition", to: "hover" });
    return;
  }
  const rth = s.mode.task === "rth";
  const demo = s.mode.task === "demo";
  const target = demo && live ? wingTarget(s) : null;
  const gliding = !!target && target.z < 1.5;
  let thr = live ? clamp(st.throttle, 0, 1) : 0;
  // home: the craft's return altitude and loiter circle (the CLI's), else 15 m and 22 m
  const homeAlt = c.rtlAlt ?? 15;
  if (rth && live) thr = Math.min(0.8, 1.25 * calc.hoverThrottle + (s.p[2] < homeAlt - 2 ? 0.15 : 0));
  // the demo holds a slow cruise (a tight turning circle) and climbs on throttle
  if (demo && live) thr = clamp(calc.hoverThrottle + 0.08 * (w.vmin * 1.35 - s.airspeed) + (s.p[2] < (target?.z ?? 13) - 1 ? 0.12 : 0), 0.1, 0.85);
  if (gliding && live) thr = s.airspeed < w.vmin * 1.15 ? 0.25 : 0;
  s.u += (thr - s.u) * Math.min(1, 8 * dt);
  if (!s.launched) {
    if (live && thr > 0.25) {
      s.launched = true;
      s.airspeed = w.launchSpeed;
      s.p[2] = Math.max(s.p[2], 1.6);
      s.pitch = -14;
      emit(s, { type: "launch" });
    } else {
      s.v = [0, 0, 0];
      s.pitch = 0;
      s.roll = 0;
      return;
    }
  }
  // attitude
  if (rth || demo) {
    // home: circle the pad at 22 m; the demo: steer for the route's next point, then circle home
    const [hx, hy] = target ? [target.x, target.y] : s.course.pad;
    const R = c.loiterRadius ?? 22;
    const d = Math.hypot(hx - s.p[0], hy - s.p[1]);
    let head = Math.atan2(hy - s.p[1], hx - s.p[0]);
    if (!target && d < 2.2 * R) head += Math.PI / 2 - clamp((d - R) / R, -1, 1) * (Math.PI / 3);
    const err = wrapDeg(head / DEG - s.yaw) * DEG;
    const maxBank = demo ? Math.min(w.bankLimit, 50) * DEG : 0.6;
    const bank = clamp(1.4 * err, -maxBank, maxBank) / DEG;
    s.roll += (bank - s.roll) * Math.min(1, 3.5 * dt);
    const pitchT = clamp(-0.05 * ((target?.z ?? homeAlt) - s.p[2]), -0.35, gliding ? 0.1 : 0.3) / DEG;
    s.pitch += (pitchT - s.pitch) * Math.min(1, 3 * dt);
  } else if (s.mode.attitude === "angle") {
    s.roll += (st.roll * w.bankLimit - s.roll) * Math.min(1, 3.5 * dt);
    s.pitch += (st.pitch * w.pitchLimit - 3 - s.pitch) * Math.min(1, 3 * dt);
  } else {
    s.roll += st.roll * w.rollRate * dt;
    s.pitch += st.pitch * w.pitchRate * dt + (1 - Math.cos(s.roll * DEG)) * 25 * dt;
  }
  if (s.faults.servosReversed || s.faults.fcReversed) {
    s.roll += (2 * s.roll + 25) * dt;
    s.pitch += 55 * dt;
  }
  if (s.faults.tailHeavy) s.pitch -= (10 + 14 * Math.sin(5 * s.t)) * dt;
  if (s.p[2] > ceilingOf(s) - 5) s.pitch += 30 * dt;
  // stall: the nose drops and the wing rocks
  if (s.airspeed < w.vstall) {
    if (!s.stalled) {
      s.stalled = true;
      emit(s, { type: "stall" });
    }
    s.pitch += 55 * dt;
    s.roll += 40 * Math.sin(4 * s.t) * dt;
  } else if (s.airspeed > w.vstall + 3) s.stalled = false;
  s.roll = clamp(s.roll, -80, 80);
  s.pitch = clamp(s.pitch, -75, 75);
  // coordinated turn
  s.yaw += ((G * Math.tan(clamp(s.roll, -69, 69) * DEG)) / Math.max(s.airspeed, 6)) * (dt / DEG);
  const kV = s.battery.empty ? 0 : voltageFactor(calc, s.battery.volt);
  const T = s.u * s.u * ((calc.motors * calc.thrustPerMotor) / 1000) * G * kV * (s.faults.propBackwards ? 0.4 : 1);
  s.thrust = T;
  const { fwd } = bodyAxes(s.yaw, s.pitch, s.roll);
  s.airspeed = Math.max(0, s.airspeed + ((T - w.cd * s.airspeed * s.airspeed) / mass - G * fwd[2]) * dt);
  const lift = Math.min(1, (s.airspeed / w.vmin) ** 2);
  const sinkT = (1 - lift) * 6 + (s.mode.attitude === "acro" ? s.airspeed * (1 - Math.cos(s.roll * DEG)) * 0.15 : 0);
  s.sink += (sinkT - s.sink) * Math.min(1, 2 * dt);
  const [wx, wy] = windAt(s);
  s.v = [fwd[0] * s.airspeed + wx, fwd[1] * s.airspeed + wy, fwd[2] * s.airspeed - s.sink];
  for (let i = 0; i < 3; i++) s.p[i] += s.v[i] * dt;
  groundContact(s, true);
}

/** The demo route's next point for a wing, moving on once the wing passes close by (it cannot stop there). */
export function wingTarget(s: SimState) {
  const route = currentMission(s, "demo");
  if (!route) return null;
  if (s.wp >= route.waypoints.length) {
    if (route.loopFrom === undefined) return null;
    s.wp = route.loopFrom;
  }
  const w = route.waypoints[s.wp];
  const r = w.r ?? 6;
  if (Math.hypot(w.x - s.p[0], w.y - s.p[1]) < r && Math.abs(w.z - s.p[2]) < Math.max(3, r)) s.wp++;
  return w;
}
