import { freshBattery, currentFor, IDLE_AMPS, LIMITS, stepBattery, voltageFactor, type BatteryState } from "./battery";
import { bodyAxes, clamp, DEG, expo, G, wave, wrapDeg, type Vec3 } from "./math";
import { buildSolids, collide, passCheckpoint, throughGate, type Solid } from "./world";
import type {
  CalcOutputs,
  Course,
  CraftFaults,
  FlightAction,
  FlightCraft,
  FlightEvent,
  FlightFrame,
  FlightMode,
  Mission,
  Sticks,
} from "./types";

/** Fixed physics step. Every result is a pure function of the inputs per step. */
export const STEP = 0.01;
/** Longest frame the loop will catch up on; a stalled tab does not fast-forward the craft. */
export const MAX_FRAME = 0.1;

type Phase = "climb" | "go" | "descend" | "done";

export interface SimState {
  craft: FlightCraft;
  course: Course;
  solids: Solid[];
  calc: CalcOutputs;
  faults: CraftFaults;
  pending: { calc: CalcOutputs; faults: CraftFaults } | null;
  mode: FlightMode;
  windOn: boolean;
  step: number; // steps since the sim was created
  p: Vec3;
  v: Vec3;
  yaw: number;
  pitch: number;
  roll: number;
  u: number; // motor command after spool-up, 0..1
  thrust: number; // N
  armed: boolean;
  crashed: boolean;
  t: number; // s since arming
  airborne: boolean;
  climbedOut: boolean; // got above 0.5 m since the last landing
  battery: BatteryState;
  heat: number;
  desyncT: number;
  motorsOut: number[];
  flipWhy: "flipFc" | "flipProps" | "flipMotor" | null;
  tumble: number;
  spin: number;
  sticks: Sticks;
  // fixed wing / VTOL
  airspeed: number;
  launched: boolean;
  stalled: boolean;
  sink: number;
  tilt: number; // VTOL motor tilt 0 (up) .. 1 (forward)
  cruise: boolean;
  servo: number; // tricopter tail servo, deg
  // courses
  gate: number;
  lapStart: number | null;
  lastGateT: number;
  splits: number[];
  bestLap: number | null;
  checkpoint: number;
  runStart: number | null;
  bestRun: number | null;
  laps: number;
  crashes: number;
  // autopilots
  hold: Vec3 | null;
  phase: Phase;
  wp: number;
  wpHold: number;
  spray: boolean;
  followers: Array<{ p: Vec3; v: Vec3; yaw: number }>;
  outside: boolean;
  farOut: boolean;
  ceilingWarned: boolean;
  events: FlightEvent[];
}

const ZERO_STICKS: Sticks = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };

export function isClimbMode(m: FlightMode) {
  return m.throttle === "climb";
}

function pickMode(craft: FlightCraft, id: string): FlightMode {
  return craft.modes.find((m) => m.id === id) ?? craft.modes[0];
}

export function createSim(craft: FlightCraft, course: Course, calc: CalcOutputs, opts: { mode?: string; faults?: CraftFaults; windOn?: boolean } = {}): SimState {
  const s = {
    craft,
    course,
    solids: buildSolids(course),
    calc,
    faults: opts.faults ?? {},
    pending: null,
    mode: pickMode(craft, opts.mode ?? craft.modes[0].id),
    windOn: opts.windOn ?? false,
    step: 0,
    bestLap: null,
    bestRun: null,
    laps: 0,
    crashes: 0,
    events: [],
  } as unknown as SimState;
  resetFlight(s);
  return s;
}

/** Back on the pad with a fresh pack. Keeps best times, the mode and the wind setting. */
export function resetFlight(s: SimState) {
  if (s.pending) {
    s.calc = s.pending.calc;
    s.faults = s.pending.faults;
    s.pending = null;
  }
  const [px, py] = s.course.pad;
  s.p = [px, py, 0];
  s.v = [0, 0, 0];
  s.yaw = 90;
  s.pitch = 0;
  s.roll = 0;
  s.u = 0;
  s.thrust = 0;
  s.armed = false;
  s.crashed = false;
  s.t = 0;
  s.airborne = false;
  s.climbedOut = false;
  s.battery = freshBattery(s.calc);
  s.heat = 0;
  s.desyncT = 0;
  s.motorsOut = [];
  s.flipWhy = null;
  s.tumble = 0;
  s.spin = 0;
  s.sticks = { ...ZERO_STICKS, throttle: isClimbMode(s.mode) ? 0.5 : 0 };
  s.airspeed = 0;
  s.launched = false;
  s.stalled = false;
  s.sink = 0;
  s.tilt = 0;
  s.cruise = false;
  s.servo = 0;
  s.gate = 0;
  s.lapStart = null;
  s.lastGateT = 0;
  s.splits = [];
  s.checkpoint = 0;
  s.runStart = null;
  s.hold = null;
  s.phase = "climb";
  s.wp = 0;
  s.wpHold = 0;
  s.spray = false;
  s.outside = false;
  s.farOut = false;
  s.ceilingWarned = false;
  const sw = s.craft.swarm;
  s.followers = [];
  if (sw) for (let i = 1; i < sw.count; i++) s.followers.push({ p: [px + formation(i, sw.spacing)[0], py + formation(i, sw.spacing)[1], 0], v: [0, 0, 0], yaw: 90 });
}

function formation(i: number, d: number): [number, number] {
  const spots: Array<[number, number]> = [[0, 0], [d, 0], [0, -d], [d, -d], [-d, 0], [-d, -d]];
  return spots[i % spots.length];
}

type EventBody = FlightEvent extends infer E ? (E extends unknown ? Omit<E, "t"> : never) : never;

const emit = (s: SimState, e: EventBody) => {
  s.events.push({ ...e, t: s.t } as FlightEvent);
};

export function ceilingOf(s: SimState) {
  return s.course.ceiling ?? s.craft.ceiling;
}

/** Applies one action. Physics only advances in stepSim. */
export function dispatch(s: SimState, a: FlightAction) {
  switch (a.type) {
    case "sticks":
      s.sticks = { throttle: clamp(a.sticks.throttle, 0, 1), yaw: clamp(a.sticks.yaw, -1, 1), pitch: clamp(a.sticks.pitch, -1, 1), roll: clamp(a.sticks.roll, -1, 1) };
      break;
    case "toggleArm":
      dispatch(s, { type: s.armed ? "disarm" : "arm" });
      break;
    case "arm":
      tryArm(s);
      break;
    case "disarm":
      if (s.armed) {
        s.armed = false;
        emit(s, { type: "disarmed" });
      }
      break;
    case "reset":
      resetFlight(s);
      break;
    case "wind":
      s.windOn = a.on;
      break;
    case "mode": {
      const next = pickMode(s.craft, a.mode);
      if (next.id === s.mode.id) break;
      const was = s.mode;
      s.mode = next;
      // switching from a climb-rate throttle to a manual one in the air keeps the current hover power
      if (was.throttle === "climb" && next.throttle === "manual") s.sticks = { ...s.sticks, throttle: s.airborne ? s.u : 0 };
      if (was.throttle === "manual" && next.throttle === "climb") s.sticks = { ...s.sticks, throttle: 0.5 };
      s.hold = null;
      s.phase = "climb";
      s.wp = 0;
      s.wpHold = 0;
      if (next.task === "motorfail" && s.armed && s.motorsOut.length === 0) {
        const m = Math.min(s.calc.motors, 3);
        s.motorsOut = [m];
        emit(s, { type: "motorOut", motor: m });
      }
      emit(s, { type: "mode", mode: next.id });
      break;
    }
    case "design":
      // never wipe a flight: on the ground and disarmed it applies now, otherwise on the next reset
      if (!s.armed && !s.airborne) {
        s.calc = a.calc;
        s.faults = a.faults ?? {};
        s.battery = freshBattery(s.calc);
        s.pending = null;
      } else s.pending = { calc: a.calc, faults: a.faults ?? s.faults };
      break;
  }
}

function tryArm(s: SimState) {
  if (s.armed) return;
  if (s.crashed) return emit(s, { type: "blocked", why: "crashed" });
  if (s.p[2] > 0.05 && s.craft.class !== "wing") return emit(s, { type: "blocked", why: "air" });
  if (s.battery.empty) return emit(s, { type: "blocked", why: "battery" });
  if (s.faults.accUncalibrated) return emit(s, { type: "blocked", why: "acc" });
  if (s.mode.throttle === "manual" && s.sticks.throttle > 0.08 && s.craft.class !== "wing") return emit(s, { type: "blocked", why: "throttle" });
  s.armed = true;
  s.t = 0;
  s.hold = null;
  s.phase = "climb";
  emit(s, { type: "armed", mode: s.mode.id });
}

function windAt(s: SimState): [number, number] {
  if (!s.windOn) return [0, 0];
  const w = s.course.wind;
  const T = s.step * STEP;
  const gust = w.gust * (0.6 * wave(T, 0.7, 1.3) + 0.4 * wave(T, 1.9, 0.2));
  const cross = 0.5 * w.gust * wave(T, 0.37, 2.1);
  // `from` is where it blows from, so the air moves the other way
  const c = -Math.cos(w.from * DEG), sn = -Math.sin(w.from * DEG);
  const along = w.speed + gust;
  return [c * along - sn * cross, sn * along + c * cross];
}

/** Motor command that holds a hover at a given pack voltage (equals calc.hoverThrottle on a nominal pack). */
export function hoverCommand(calc: CalcOutputs, volt: number) {
  return Math.sqrt((calc.hoverThrottle * calc.hoverThrottle) / Math.max(1e-6, voltageFactor(calc, volt)));
}

/** Advances by one fixed step. */
export function stepSim(s: SimState) {
  const dt = STEP;
  const cls = s.craft.class;
  if (cls === "wing" || (cls === "vtol" && s.cruise)) wingStep(s, dt);
  else multirotorStep(s, dt);
  if (s.craft.swarm) followersStep(s, dt);
  worldChecks(s);
  batteryStep(s, dt);
  if (s.crashed) {
    s.tumble += 8 * dt;
    s.roll += 6 * dt;
  }
  if (s.armed) s.spin += dt * (6 + 60 * s.u * s.u);
  s.t += dt;
  s.step++;
}

/** Steps the sim through `seconds` of wall time in fixed steps (clamped). Returns the steps taken. */
export function advance(s: SimState, seconds: number, carry = 0): { steps: number; carry: number } {
  let acc = carry + Math.min(MAX_FRAME, Math.max(0, seconds));
  let steps = 0;
  while (acc >= STEP) {
    stepSim(s);
    acc -= STEP;
    steps++;
  }
  return { steps, carry: acc };
}

interface Command {
  pitch: number | null; // deg target (angle) or null = sticks
  roll: number | null;
  yawRate: number | null; // deg/s
  climb: number | null; // -1..1 of climbRate
}

function autopilot(s: SimState): Command {
  const cmd: Command = { pitch: null, roll: null, yawRate: null, climb: null };
  const m = s.mode;
  const c = s.craft;
  const speed = c.loiterSpeed ?? 5;
  const vd: [number, number] | null = (() => {
    if (m.task === "rtl" || m.task === "qrtl") return rtlVelocity(s, cmd, speed);
    if (m.task === "mission" || m.task === "figure8") return missionVelocity(s, cmd, speed);
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

function currentMission(s: SimState): Mission | null {
  const ms = s.course.missions ?? [];
  return ms.find((m) => m.id === s.mode.missionId) ?? ms[0] ?? null;
}

function missionVelocity(s: SimState, cmd: Command, speed: number): [number, number] {
  const mission = currentMission(s);
  if (!mission || !s.armed) return [0, 0];
  if (s.wp >= mission.waypoints.length) {
    if (mission.rtl) return rtlVelocity(s, cmd, speed);
    cmd.climb = 0;
    return [0, 0];
  }
  const w = mission.waypoints[s.wp];
  const dx = w.x - s.p[0], dy = w.y - s.p[1], dz = w.z - s.p[2];
  const d = Math.hypot(dx, dy);
  cmd.climb = clamp((dz * 0.8) / s.craft.climbRate, -1, 1);
  if (d > 1.5) headTo(s, cmd, w.x, w.y);
  if (Math.hypot(d, dz) < 1.0) {
    s.wpHold += STEP;
    if (s.wpHold >= (w.hold ?? 0)) {
      if (w.action === "spray-on") s.spray = true;
      if (w.action === "spray-off") s.spray = false;
      emit(s, { type: "missionStep", index: s.wp + 1, total: mission.waypoints.length, label: w.label, action: w.action });
      s.wp++;
      s.wpHold = 0;
      if (s.wp >= mission.waypoints.length) {
        emit(s, { type: "missionDone" });
        s.phase = "climb";
      }
    }
    return [dx * 0.8, dy * 0.8];
  }
  const v = Math.min(w.speed ?? speed, d * 0.6) / Math.max(1e-6, d);
  return [dx * v, dy * v];
}

function multirotorStep(s: SimState, dt: number) {
  const c = s.craft, calc = s.calc, m = s.mode, st = s.sticks;
  const mass = calc.auw / 1000;
  const n = calc.motors;
  const lost = s.motorsOut.length + (s.desyncT > 0 ? 1 : 0);
  const tmax = ((n * calc.thrustPerMotor) / 1000) * G * Math.max(0, (n - lost) / n);
  const kV = s.battery.empty ? 0 : voltageFactor(calc, s.battery.volt);
  const live = s.armed && !s.crashed;
  const auto = live ? autopilot(s) : { pitch: null, roll: null, yawRate: null, climb: null };
  const grounded = s.p[2] <= 0.02 && s.thrust < 0.3 * mass * G;
  const rate = c.acroRate * (m.rateScale ?? 1);
  const limit = m.angleLimit ?? c.angleLimit;
  const e = m.expo ?? 0;

  // a quad has no spare motor: with one out the flight controller cannot hold the attitude
  const uncontrolled = s.motorsOut.length > 0 && n <= 4 && live;
  if (uncontrolled) {
    s.roll += 400 * dt;
    s.yaw += 300 * dt;
  } else if (grounded) {
    s.roll *= 0.8;
    s.pitch *= 0.8;
  } else if (m.attitude === "acro" && auto.pitch === null) {
    s.roll += expo(st.roll, e) * rate * dt;
    s.pitch += expo(st.pitch, e) * rate * dt;
  } else {
    const tp = auto.pitch ?? expo(st.pitch, e) * limit;
    const tr = auto.roll ?? expo(st.roll, e) * limit;
    const k = Math.min(1, c.levelRate * dt);
    s.pitch += (clamp(tp, -limit, limit) - s.pitch) * k;
    s.roll += (clamp(tr, -limit, limit) - s.roll) * k;
  }

  // yaw: props' reaction torque, or the tricopter's tail servo
  const yawCmd = auto.yawRate !== null ? -auto.yawRate / (c.yawRate * (m.rateScale ?? 1)) : expo(st.yaw, e);
  if (c.tailServo) {
    const target = clamp(yawCmd, -1, 1) * c.tailServo.maxDeg;
    const stepMax = c.tailServo.rateDegS * dt;
    s.servo += clamp(target - s.servo, -stepMax, stepMax);
    if (!grounded) s.yaw += -(s.servo / c.tailServo.maxDeg) * c.yawRate * (m.rateScale ?? 1) * dt;
  } else if (!grounded) s.yaw += -yawCmd * c.yawRate * (m.rateScale ?? 1) * dt;

  // throttle
  let cmd = 0;
  if (live) {
    if (m.throttle === "climb" || auto.climb !== null) {
      const stickClimb = Math.abs(st.throttle - 0.5) < 0.05 ? 0 : (st.throttle - 0.5) * 2;
      const climb = auto.climb ?? stickClimb;
      const up = bodyAxes(s.yaw, s.pitch, s.roll).up;
      if (s.p[2] <= 0.02 && climb <= 0 && !s.airborne) cmd = 0;
      else {
        const need = (mass * (G + 3 * (climb * c.climbRate - s.v[2]))) / Math.max(1e-6, tmax * kV) / Math.max(0.4, up[2]);
        cmd = Math.sqrt(clamp(need, 0, 1));
      }
    } else cmd = clamp(st.throttle, 0, 1);
    if (m.task === "rtl" || m.task === "qrtl") {
      if (s.phase === "descend" && s.p[2] <= 0.03 && s.airborne === false) cmd = 0;
    }
  }
  if (!live) s.u = Math.max(0, s.u - 3 * dt);
  else s.u += (cmd - s.u) * Math.min(1, c.spool * dt);

  // faults that show on take-off
  const f = s.u * s.u;
  if (live && s.t > 0.25 && f > 0.05) {
    const flip = s.faults.fcReversed ? "flipFc" : s.faults.propsSwapped ? "flipProps" : s.faults.motorDirUnchecked ? "flipMotor" : null;
    if (flip) {
      s.flipWhy = flip;
      s.roll += 900 * dt * (flip === "flipFc" ? 1 : -1);
      s.pitch += 500 * dt;
    }
  }
  if (calc.overKv && live) {
    s.heat += dt * f * 1.6;
    if (s.heat > 9 && s.desyncT <= 0) {
      s.desyncT = 0.4;
      s.heat -= 3;
      emit(s, { type: "desync", motor: Math.min(3, n) });
    }
  }
  s.heat = Math.max(0, s.heat - dt * 0.35);
  if (s.desyncT > 0) {
    s.desyncT -= dt;
    s.roll += 260 * dt;
    s.yaw += 120 * dt;
  }
  if (s.motorsOut.length && live && n > 4) s.yaw += (6 * dt * 4) / n; // less yaw authority: a slow drift

  // forces
  const ceil = ceilingOf(s);
  const fade = s.p[2] > ceil - 3 ? Math.max(0, 1 - (s.p[2] - ceil + 3) / 3) : 1;
  s.thrust = f * tmax * kV * fade;
  let { up } = bodyAxes(s.yaw, s.pitch, s.roll);
  if (c.vtol && s.tilt > 0) {
    // tilted motors push forward; the wing adds lift with airspeed
    const ax = bodyAxes(s.yaw, s.pitch, s.roll);
    const a = s.tilt * 90 * DEG;
    up = [ax.up[0] * Math.cos(a) + ax.fwd[0] * Math.sin(a), ax.up[1] * Math.cos(a) + ax.fwd[1] * Math.sin(a), ax.up[2] * Math.cos(a) + ax.fwd[2] * Math.sin(a)];
  }
  const [wx, wy] = windAt(s);
  const rx = s.v[0] - wx, ry = s.v[1] - wy, rz = s.v[2];
  const rel = Math.hypot(rx, ry, rz);
  const a: Vec3 = [
    (up[0] * s.thrust) / mass - c.drag * rx * (rel + 1),
    (up[1] * s.thrust) / mass - c.drag * ry * (rel + 1),
    (up[2] * s.thrust) / mass - c.drag * rz * (rel + 1) - G,
  ];
  if (c.vtol) vtolTransition(s, a, dt);
  if (c.tailServo && s.thrust > 0) {
    // the tilted tail motor also pushes sideways a little
    const side = (Math.sin(s.servo * DEG) * s.thrust) / 3 / mass;
    const fx = Math.cos(s.yaw * DEG), fy = Math.sin(s.yaw * DEG);
    a[0] += -side * -fy * 0.3;
    a[1] += -side * fx * 0.3;
  }
  for (let i = 0; i < 3; i++) s.v[i] += a[i] * dt;
  for (let i = 0; i < 3; i++) s.p[i] += s.v[i] * dt;
  groundContact(s, false);
}

function vtolTransition(s: SimState, a: Vec3, dt: number) {
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

function wingStep(s: SimState, dt: number) {
  const c = s.craft, calc = s.calc, st = s.sticks, w = (c.vtol ?? c.wing)!;
  const mass = calc.auw / 1000;
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
  let thr = live ? clamp(st.throttle, 0, 1) : 0;
  if (rth && live) thr = Math.min(0.8, 1.25 * calc.hoverThrottle + (s.p[2] < 13 ? 0.15 : 0));
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
  if (rth) {
    const [hx, hy] = s.course.pad;
    const R = 22;
    const d = Math.hypot(hx - s.p[0], hy - s.p[1]);
    let head = Math.atan2(hy - s.p[1], hx - s.p[0]);
    if (d < 2.2 * R) head += Math.PI / 2 - clamp((d - R) / R, -1, 1) * (Math.PI / 3);
    const err = wrapDeg(head / DEG - s.yaw) * DEG;
    const bank = clamp(1.4 * err, -0.6, 0.6) / DEG;
    s.roll += (bank - s.roll) * Math.min(1, 3.5 * dt);
    const pitchT = clamp(-0.05 * (15 - s.p[2]), -0.35, 0.3) / DEG;
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

function followersStep(s: SimState, dt: number) {
  const sw = s.craft.swarm!;
  s.followers.forEach((f, i) => {
    // each follower holds its slot in the formation around the leader (the mocap frame is shared)
    const [ox, oy] = formation(i + 1, sw.spacing);
    const tx = s.p[0] + ox, ty = s.p[1] + oy;
    if (!s.armed && f.p[2] <= 0.01) return;
    const tz = s.armed ? s.p[2] : 0;
    for (const [k, t] of [[0, tx], [1, ty], [2, tz]] as Array<[0 | 1 | 2, number]>) {
      const want = clamp((t - f.p[k]) * 2.5, -1.5, 1.5);
      f.v[k] += (want - f.v[k]) * Math.min(1, 6 * dt);
      f.p[k] += f.v[k] * dt;
    }
    f.p[2] = Math.max(0, f.p[2]);
    f.yaw += wrapDeg(s.yaw - f.yaw) * Math.min(1, 3 * dt);
  });
}

function groundContact(s: SimState, wing: boolean) {
  if (s.p[2] > 0) return;
  const speed = Math.hypot(s.v[0], s.v[1], s.v[2]);
  if (!s.crashed && (wing ? s.launched : s.airborne || s.climbedOut)) {
    if (wing) {
      const ok = s.airspeed < 13.5 && Math.abs(s.roll) < 25 && s.pitch > -25 && s.pitch < 30 && s.v[2] > -3.5;
      if (ok && s.armed) {
        s.armed = false;
        s.launched = false;
        s.airspeed = 0;
        emit(s, { type: "landed", mah: Math.round(s.battery.used), belly: true });
      } else crash(s, "groundWing");
    } else {
      const { up } = bodyAxes(s.yaw, s.pitch, s.roll);
      const tilt = Math.acos(clamp(up[2], -1, 1)) / DEG;
      if (s.t > 0.3 && (s.v[2] < -3.2 || (tilt > 55 && speed > 1.5) || speed > 6)) crash(s, s.flipWhy ?? "ground");
    }
  }
  s.p[2] = 0;
  s.v[2] = Math.max(0, s.v[2]);
  s.v[0] *= 0.8;
  s.v[1] *= 0.8;
  if (wing) {
    s.v = [0, 0, 0];
    if (!s.armed) s.launched = false;
  }
  if (!s.crashed && s.u * s.u < 0.3) {
    s.roll *= 0.8;
    s.pitch *= 0.8;
  }
}

function crash(s: SimState, why: Extract<FlightEvent, { type: "crash" }>["why"]) {
  if (s.crashed) return;
  s.crashed = true;
  s.armed = false;
  s.crashes++;
  emit(s, { type: "crash", why });
}

function worldChecks(s: SimState) {
  const c = s.craft, course = s.course;
  const prev: Vec3 = [s.p[0] - s.v[0] * STEP, s.p[1] - s.v[1] * STEP, s.p[2] - s.v[2] * STEP];
  const speed = Math.hypot(s.v[0], s.v[1], s.v[2]);
  // take-off and landing
  if (!s.airborne && s.armed && s.p[2] > 0.3) {
    s.airborne = true;
    if (s.runStart === null && s.mode.task === "range") s.runStart = s.t;
    emit(s, { type: "takeoff" });
  }
  if (s.p[2] > 0.5) s.climbedOut = true;
  if (s.airborne && s.p[2] <= 0.02 && speed < 1 && !s.crashed) {
    s.airborne = false;
    if (s.climbedOut && c.class !== "wing") emit(s, { type: "landed", mah: Math.round(s.battery.used) });
    s.climbedOut = false;
    if ((s.mode.task === "rtl" || s.mode.task === "qrtl" || (s.mode.task === "mission" && s.phase === "descend")) && s.armed) {
      s.armed = false;
      s.phase = "done";
      emit(s, { type: "disarmed" });
    }
  }
  if (!s.crashed) {
    const hit = collide(s.solids, s.p[0], s.p[1], s.p[2], c.hitRadius);
    if (hit) {
      crash(s, hit.kind);
      s.v = [s.v[0] * -0.2, s.v[1] * -0.2, Math.min(0, s.v[2])];
    }
  }
  // race gates
  if (s.mode.task === "race" && course.gates.length && !s.crashed) {
    const g = course.gates[s.gate];
    if (throughGate(g, prev, s.p)) {
      const n = course.gates.length;
      const now = s.t;
      let split: number | null = null;
      if (s.gate === 0) {
        if (s.lapStart !== null && s.splits.length === n - 1) {
          const lap = now - s.lapStart;
          s.splits.push(now - s.lastGateT);
          const best = s.bestLap === null || lap < s.bestLap;
          if (best) s.bestLap = lap;
          s.laps++;
          emit(s, { type: "lap", time: lap, best, splits: s.splits.slice() });
        }
        s.lapStart = now;
        s.splits = [];
      } else {
        split = now - s.lastGateT;
        s.splits.push(split);
      }
      s.lastGateT = now;
      emit(s, { type: "gate", index: s.gate + 1, total: n, split });
      s.gate = (s.gate + 1) % n;
    }
  }
  // range checkpoints
  if (s.mode.task === "range" && course.checkpoints.length && !s.crashed) {
    const cp = course.checkpoints[s.checkpoint];
    if (passCheckpoint(cp, prev, s.p, speed)) {
      const n = course.checkpoints.length;
      emit(s, { type: "checkpoint", index: s.checkpoint + 1, total: n, label: cp.label });
      s.checkpoint++;
      if (s.checkpoint >= n) {
        const start = s.runStart ?? 0;
        const time = s.t - start;
        const best = s.bestRun === null || time < s.bestRun;
        if (best) s.bestRun = time;
        s.laps++;
        emit(s, { type: "run", time, best });
        s.checkpoint = 0;
        s.runStart = s.airborne ? s.t : null;
      }
    }
  }
  // field edge and the soft ceiling
  const out = s.p[0] < -2 || s.p[1] < -2 || s.p[0] > course.field + 2 || s.p[1] > course.field + 2;
  if (c.class !== "wing") {
    if (out && !s.outside) emit(s, { type: "outOfField" });
    s.outside = out;
  } else {
    const far = Math.hypot(s.p[0] - course.pad[0], s.p[1] - course.pad[1]) > 90;
    if (far && !s.farOut) emit(s, { type: "farOut" });
    s.farOut = far;
  }
  const ceil = ceilingOf(s);
  if (s.p[2] > ceil - 1.5 && !s.ceilingWarned) {
    s.ceilingWarned = true;
    emit(s, { type: "ceiling", m: ceil });
  } else if (s.p[2] < ceil - 4) s.ceilingWarned = false;
}

function batteryStep(s: SimState, dt: number) {
  const calc = s.calc;
  const live = s.armed && !s.crashed;
  const weight = (calc.auw / 1000) * G;
  const amps = live ? currentFor(calc, s.thrust / weight, s.battery.volt) + IDLE_AMPS : 0;
  const news = stepBattery(s.battery, calc, amps, dt);
  const chemistry = calc.chemistry ?? "lipo";
  const perCell = s.battery.volt / calc.cells;
  if (news === "low" && live) emit(s, { type: "battery", level: "low", chemistry, perCell: LIMITS[chemistry].low });
  if (news === "empty" && live) {
    emit(s, { type: "battery", level: "empty", chemistry, perCell });
    s.armed = false; // the ESCs cut out: it falls
  }
}

/** Takes the events raised since the last call. */
export function drainEvents(s: SimState): FlightEvent[] {
  const out = s.events;
  s.events = [];
  return out;
}

function nextTarget(s: SimState): FlightFrame["next"] {
  const course = s.course;
  if (s.mode.task === "race" && course.gates.length) {
    const g = course.gates[s.gate];
    return { x: g.x, y: g.y, z: (g.z ?? 0) + g.h / 2, kind: "gate", n: s.gate + 1, total: course.gates.length, label: "" };
  }
  if (s.mode.task === "range" && course.checkpoints.length) {
    const cp = course.checkpoints[s.checkpoint];
    return { x: cp.x, y: cp.y, z: cp.z, kind: "checkpoint", n: s.checkpoint + 1, total: course.checkpoints.length, label: cp.label };
  }
  const mission = (s.mode.task === "mission" || s.mode.task === "figure8") && currentMission(s);
  if (mission && s.wp < mission.waypoints.length) {
    const w = mission.waypoints[s.wp];
    return { x: w.x, y: w.y, z: w.z, kind: "waypoint", n: s.wp + 1, total: mission.waypoints.length, label: w.label };
  }
  return { x: course.pad[0], y: course.pad[1], z: 0, kind: "home", n: 0, total: 0, label: "" };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** The render state for the range page. */
export function frameOf(s: SimState): FlightFrame {
  const w = windAt(s);
  return {
    t: r2(s.step * STEP),
    x: r2(s.p[0]) + 0,
    y: r2(s.p[1]) + 0,
    z: r2(s.p[2]) + 0,
    yaw: r2(s.yaw + (s.crashed ? s.tumble * 40 : 0)),
    pitch: r2(s.pitch),
    roll: r2(s.roll),
    speed: r2(Math.hypot(s.v[0], s.v[1], s.v[2])),
    vz: r2(s.v[2]),
    thr: r2(s.u),
    spin: r2(s.spin % (Math.PI * 2)),
    armed: s.armed,
    crashed: s.crashed,
    launched: s.launched,
    volt: r2(s.battery.volt),
    amps: r2(s.battery.amps),
    mah: Math.round(s.battery.used),
    cells: s.calc.cells,
    low: s.battery.low,
    timer: r2(s.t),
    mode: s.mode.id,
    wind: [r2(w[0]), r2(w[1])],
    windOn: s.windOn,
    next: nextTarget(s),
    gate: s.gate,
    checkpoint: s.checkpoint,
    servo: r2(s.servo),
    motorsOut: s.motorsOut.slice(),
    followers: s.followers.map((f) => [r2(f.p[0]), r2(f.p[1]), r2(f.p[2]), r2(f.yaw)] as [number, number, number, number]),
    spray: s.spray,
  };
}

/** Re-runs a recorded flight: the same inputs at the same steps give the same events. */
export function replay(
  craft: FlightCraft,
  course: Course,
  calc: CalcOutputs,
  log: Array<{ step: number; action: FlightAction }>,
  steps: number,
  opts: { mode?: string; faults?: CraftFaults; windOn?: boolean } = {},
): { sim: SimState; events: FlightEvent[] } {
  const s = createSim(craft, course, calc, opts);
  const events: FlightEvent[] = [];
  let i = 0;
  for (let k = 0; k < steps; k++) {
    while (i < log.length && log[i].step <= k) dispatch(s, log[i++].action);
    stepSim(s);
    events.push(...drainEvents(s));
  }
  return { sim: s, events };
}
