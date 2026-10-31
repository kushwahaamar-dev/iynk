import type { BatteryState } from "./battery";
import { bodyAxes, clamp, DEG, wave, wrapDeg, type Vec3 } from "./math";
import { DEMO_MISSION } from "./route";
import type { Solid } from "./world";
import type { CalcOutputs, Course, CraftFaults, FlightCraft, FlightEvent, FlightMode, Mission, Sticks } from "./types";

/** Fixed physics step. Every result is a pure function of the inputs per step. */
export const STEP = 0.01;
/** Longest frame the loop will catch up on; a stalled tab does not fast-forward the craft. */
export const MAX_FRAME = 0.1;

export type Phase = "climb" | "go" | "descend" | "done";

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
  flipWhy: "flipFc" | "flipProps" | "flipMotor" | "flipServo" | null;
  pirouette: number; // s airborne with the tail servo hard over the wrong way
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
  legFrom: Vec3 | null; // the demo flies the line from here to the next waypoint (null: straight at it)
  spray: boolean;
  dropped: number; // g of payload released since the pad (the craft flies this much lighter)
  parcel: Vec3 | null; // where it was released
  assisted: boolean; // the autopilot demo flew part of this lap or run: it never sets a best time
  followers: Array<{ p: Vec3; v: Vec3; yaw: number }>;
  outside: boolean;
  farOut: boolean;
  ceilingWarned: boolean;
  events: FlightEvent[];
}

export function isClimbMode(m: FlightMode) {
  return m.throttle === "climb";
}

export type EventBody = FlightEvent extends infer E ? (E extends unknown ? Omit<E, "t"> : never) : never;

export const emit = (s: SimState, e: EventBody) => {
  s.events.push({ ...e, t: s.t } as FlightEvent);
};

export function ceilingOf(s: SimState) {
  return s.course.ceiling ?? s.craft.ceiling;
}

/** Whether the course's gates count laps now: on a gate course in every mode, otherwise in race modes. */
export function countsGates(s: SimState) {
  const kind = s.course.kind;
  return s.course.gates.length > 0 && (kind ? kind === "gates" : s.mode.task === "race");
}

/** Whether the checkpoints count a run now: on a checkpoint or mission course in every mode, else in range modes. */
export function countsCheckpoints(s: SimState) {
  const kind = s.course.kind;
  return s.course.checkpoints.length > 0 && (kind ? kind !== "gates" : s.mode.task === "range");
}

/** Where the demo route picks up: the first point leading to the next gate or checkpoint (the start when grounded). */
export function demoResume(s: SimState) {
  const route = currentMission(s, "demo");
  if (!route || !s.airborne) return 0;
  const next = countsGates(s) ? s.gate : countsCheckpoints(s) ? s.checkpoint : 0;
  const i = route.waypoints.findIndex((w, k) => k > 0 && (w.leg ?? 0) >= next);
  return i < 0 ? 0 : i;
}

export function windAt(s: SimState): [number, number] {
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

export function currentMission(s: SimState, task = s.mode.task): Mission | null {
  const ms = s.course.missions ?? [];
  if (task === "demo") return ms.find((m) => m.id === DEMO_MISSION) ?? null;
  const own = ms.filter((m) => m.id !== DEMO_MISSION);
  return own.find((m) => m.id === s.mode.missionId) ?? own[0] ?? null;
}

export function groundContact(s: SimState, wing: boolean) {
  if (s.p[2] > 0) return;
  const speed = Math.hypot(s.v[0], s.v[1], s.v[2]);
  if (!s.crashed && wing && s.launched) {
    const ok = s.airspeed < 13.5 && Math.abs(s.roll) < 25 && s.pitch > -25 && s.pitch < 30 && s.v[2] > -3.5;
    if (ok && s.armed) {
      s.armed = false;
      s.launched = false;
      s.airspeed = 0;
      emit(s, { type: "landed", mah: Math.round(s.battery.used), belly: true });
    } else crash(s, "groundWing");
  } else if (!s.crashed && !wing && s.t > 0.3) {
    const { up } = bodyAxes(s.yaw, s.pitch, s.roll);
    const tilt = Math.acos(clamp(up[2], -1, 1)) / DEG;
    const hard = (s.airborne || s.climbedOut) && (s.v[2] < -3.2 || (tilt > 55 && speed > 1.5) || speed > 6);
    // tipping over on the ground with the motors live (a flip on take-off before it lifts, a desync on the pad)
    // puts the props into the dirt: a crash, not a craft skating along on its side at full power
    const tipped = s.armed && tilt > 65;
    if (hard || tipped) crash(s, s.flipWhy ?? "ground");
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

export function crash(s: SimState, why: Extract<FlightEvent, { type: "crash" }>["why"]) {
  if (s.crashed) return;
  s.crashed = true;
  s.armed = false;
  s.crashes++;
  emit(s, { type: "crash", why });
}
