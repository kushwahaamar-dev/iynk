import { lerp, wrapDeg } from "./math";
import { createSim, dispatch, drainEvents, replay, STEP, stepSim, type SimState } from "./sim";
import { DEFAULT_MODEL, modelSuffix, type FlightModelId } from "./model-id";
import type { FlightOrigin } from "./session";
import type { CalcOutputs, Course, FlightAction, FlightCraft, FlightEvent } from "./types";

// Ghosts (BUILD-PLAN §3.2 item 8). A ghost is the poses of one finished lap or run, 20 a second, played back from
// the moment the learner's own lap or run starts. Your best lap is cut from a replay of your session's log, so the
// ghost is the flight the sim really flew, not a recording that could drift from it; the autopilot's lap is flown
// headless on your design; friends' poses come live through the room (src/components/flight).

/** x, y, z (m), yaw, pitch, roll (deg). */
export type GhostPose = [number, number, number, number, number, number];

export interface GhostTrack {
  v: 1;
  craft: string;
  course: string;
  /** The flight model it was flown on; absent means the game model. */
  model?: FlightModelId;
  /** The lap or run time this track flies, s. */
  time: number;
  /** Seconds between poses. */
  dt: number;
  poses: GhostPose[];
}

export const GHOST_DT = 0.05;
const EVERY = Math.round(GHOST_DT / STEP);

const r = (v: number, k: number) => Math.round(v * k) / k;
export const poseOf = (s: SimState): GhostPose => [r(s.p[0], 100), r(s.p[1], 100), r(s.p[2], 100), r(s.yaw, 10), r(s.pitch, 10), r(s.roll, 10)];

type Finish = { time: number; demo?: boolean; best?: boolean };

/** A lap, a timed run or a timed mission: what a ghost can fly. */
export function finishOf(e: FlightEvent): Finish | null {
  if (e.type === "lap" || e.type === "run") return e;
  if (e.type === "missionDone" && e.time !== undefined) return { time: e.time, demo: e.demo, best: e.best };
  return null;
}

/** Cuts the lap that ended at `endStep` (the step count after it) out of poses sampled every EVERY steps from 0. */
function cut(poses: GhostPose[], endStep: number, time: number): GhostPose[] {
  const start = endStep - Math.round(time / STEP);
  return poses.slice(Math.max(0, Math.round(start / EVERY)), Math.min(poses.length, Math.round(endStep / EVERY) + 1));
}

function track(craft: FlightCraft, course: Course, time: number, poses: GhostPose[]): GhostTrack | null {
  return poses.length >= 2 ? { v: 1, craft: craft.id, course: course.id, time, dt: GHOST_DT, poses } : null;
}

/**
 * The ghost of a finished lap or run, from a replay of the session's log up to `steps`: the last one whose time is
 * `time`. Null when the replay does not reach it (it always does: the sim is deterministic, and a test checks it).
 */
export function ghostFromLog(origin: FlightOrigin, log: ReadonlyArray<{ step: number; action: FlightAction }>, steps: number, time: number): GhostTrack | null {
  const poses: GhostPose[] = [];
  let end = -1;
  replay(origin.craft, origin.course, origin.calc, log, steps, origin.opts, (s, events) => {
    if (s.step % EVERY === 0) poses.push(poseOf(s));
    for (const e of events) {
      const f = finishOf(e);
      if (f && Math.abs(f.time - time) < 1e-9) end = s.step;
    }
  });
  return end < 0 ? null : track(origin.craft, origin.course, time, cut(poses, end, time));
}

/** The autopilot's first full lap or run of a course on this design (its demo line), or null where it has none. */
export function paceGhost(craft: FlightCraft, course: Course, calc: CalcOutputs, maxS = 300): GhostTrack | null {
  if (!craft.modes.some((m) => m.task === "demo") || !course.missions?.some((m) => m.id === "demo")) return null;
  const s = createSim(craft, course, calc, { mode: "demo" });
  dispatch(s, { type: "arm" });
  const poses: GhostPose[] = [poseOf(s)];
  for (let k = 0; k < maxS / STEP && !s.crashed; k++) {
    stepSim(s);
    if (s.step % EVERY === 0) poses.push(poseOf(s));
    for (const e of drainEvents(s)) {
      const f = finishOf(e);
      if (f) return track(craft, course, f.time, cut(poses, s.step, f.time));
    }
  }
  return null;
}

/** Where a ghost is `t` seconds into its lap (held at either end). */
export function ghostAt(g: GhostTrack, t: number): GhostPose {
  const last = g.poses.length - 1;
  const u = Math.max(0, Math.min(last, t / g.dt));
  const i = Math.min(last - 1, Math.floor(u));
  const k = u - i;
  const a = g.poses[i], b = g.poses[i + 1];
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k), a[3] + wrapDeg(b[3] - a[3]) * k, lerp(a[4], b[4], k), lerp(a[5], b[5], k)];
}

/** The learner's clock for the ghost: seconds into the current lap or run, or null before one has started. */
export function lapClock(s: SimState): number | null {
  const start = s.course.kind === "gates" || (!s.course.kind && s.mode.task === "race") ? s.lapStart : s.runStart;
  return start === null ? null : s.t - start;
}

const isPose = (p: unknown): p is GhostPose => Array.isArray(p) && p.length === 6 && p.every((v) => typeof v === "number" && Number.isFinite(v));

/** A stored track, checked field by field (it comes back from localStorage). */
export function isGhostTrack(v: unknown): v is GhostTrack {
  const g = v as GhostTrack;
  return (
    typeof v === "object" && v !== null && g.v === 1 && typeof g.craft === "string" && typeof g.course === "string" &&
    (g.model === undefined || g.model === "flight-game@1" || g.model === "multirotor-rigid@1") &&
    typeof g.time === "number" && g.time > 0 && g.dt === GHOST_DT && Array.isArray(g.poses) && g.poses.length >= 2 && g.poses.every(isPose)
  );
}

const keyOf = (craft: string, course: string, model: FlightModelId) => `iynk:ghost:v1:${craft}:${course}${modelSuffix(model)}`;

/** Your best lap's ghost for a craft's course, from this browser. */
export function loadGhost(craft: string, course: string, model: FlightModelId = DEFAULT_MODEL): GhostTrack | null {
  try {
    const v = JSON.parse(localStorage.getItem(keyOf(craft, course, model)) ?? "null");
    return isGhostTrack(v) && v.craft === craft && v.course === course ? v : null;
  } catch {
    return null;
  }
}

/** Keeps the track when it beats the stored one; returns whether it did. */
export function saveGhost(g: GhostTrack, model: FlightModelId = DEFAULT_MODEL): boolean {
  const old = loadGhost(g.craft, g.course, model);
  if (old && old.time <= g.time) return false;
  try {
    localStorage.setItem(keyOf(g.craft, g.course, model), JSON.stringify(g));
    return true;
  } catch {
    // private mode or full storage: the ghost lasts for this visit
    return false;
  }
}
