import { freshBattery, currentFor, IDLE_AMPS, LIMITS, stepBattery, voltageFactor } from "./battery";
import { clamp, G } from "./math";
import {
  ceilingOf, countsCheckpoints, countsGates, currentMission, demoResume, emit, isClimbMode, MAX_FRAME, STEP, windAt,
  type SimState,
} from "./state";
import { worldChecks } from "./scoring";
import { buildSolids } from "./world";
import { followersStep, formation } from "./swarm";
import { multirotorStep } from "./multirotor";
import { wingStep } from "./wing";
import type {
  CalcOutputs,
  Course,
  CraftFaults,
  FlightAction,
  FlightCraft,
  FlightEvent,
  FlightFrame,
  FlightMode,
  Sticks,
} from "./types";

export { STEP, MAX_FRAME, isClimbMode, ceilingOf, type SimState };

const ZERO_STICKS: Sticks = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };

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
  s.pirouette = 0;
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
  s.legFrom = null;
  s.spray = false;
  s.dropped = 0;
  s.parcel = null;
  s.assisted = false;
  s.outside = false;
  s.farOut = false;
  s.ceilingWarned = false;
  const sw = s.craft.swarm;
  s.followers = [];
  if (sw) for (let i = 1; i < sw.count; i++) s.followers.push({ p: [px + formation(i, sw.spacing)[0], py + formation(i, sw.spacing)[1], 0], v: [0, 0, 0], yaw: 90 });
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
      s.wp = next.task === "demo" ? demoResume(s) : 0;
      s.wpHold = 0;
      s.legFrom = next.task === "demo" && s.airborne ? [s.p[0], s.p[1], s.p[2]] : null;
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
  if (s.armed && s.mode.task === "demo") s.assisted = true;
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
  if (countsGates(s)) {
    const g = course.gates[s.gate];
    return { x: g.x, y: g.y, z: (g.z ?? 0) + g.h / 2, kind: "gate", n: s.gate + 1, total: course.gates.length, label: "" };
  }
  if (countsCheckpoints(s)) {
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
    cargo: !!s.craft.payloadG && s.dropped === 0,
    parcel: s.parcel ? [r2(s.parcel[0]), r2(s.parcel[1])] : null,
  };
}

/**
 * Re-runs a recorded flight: the same inputs at the same steps give the same events. `onStep` sees the state after
 * every step with the events that step raised (ghost laps and crash replays are cut from it).
 */
export function replay(
  craft: FlightCraft,
  course: Course,
  calc: CalcOutputs,
  log: ReadonlyArray<{ step: number; action: FlightAction }>,
  steps: number,
  opts: { mode?: string; faults?: CraftFaults; windOn?: boolean } = {},
  onStep?: (s: SimState, events: FlightEvent[]) => void,
): { sim: SimState; events: FlightEvent[] } {
  const s = createSim(craft, course, calc, opts);
  const events: FlightEvent[] = [];
  let i = 0;
  for (let k = 0; k < steps; k++) {
    while (i < log.length && log[i].step <= k) dispatch(s, log[i++].action);
    stepSim(s);
    const now = drainEvents(s);
    events.push(...now);
    onStep?.(s, now);
  }
  return { sim: s, events };
}
