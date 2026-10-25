import { frameOf, replay, STEP } from "./sim";
import type { FlightOrigin } from "./session";
import type { CraftClass, CraftFaults, FlightAction, FlightEvent, FlightFrame, FlightMode, HitKind } from "./types";

// Break it and watch it fail (BUILD-PLAN §1, Most Entertaining): after a crash the range replays the last seconds
// in slow motion from the session's own log, says why it happened in plain words and offers the one change that
// fixes it.

/** What the learner can break on purpose (or a bench build broke): the sim's faults, and a motor over its rating. */
export type BreakId = keyof Required<CraftFaults> | "overKv";

export const BREAKS: Record<CraftClass, BreakId[]> = {
  multirotor: ["fcReversed", "propsSwapped", "motorDirUnchecked", "accUncalibrated", "overKv"],
  tricopter: ["fcReversed", "propsSwapped", "motorDirUnchecked", "accUncalibrated", "overKv"],
  swarm: ["fcReversed", "propsSwapped", "accUncalibrated"],
  vtol: ["fcReversed", "propsSwapped", "accUncalibrated", "servosReversed"],
  wing: ["servosReversed", "tailHeavy", "propBackwards"],
};

export type CrashCause =
  | "flipFc"
  | "flipProps"
  | "flipMotor"
  | "desync"
  | "battery"
  | "servos"
  | "tailHeavy"
  | "propBackwards"
  | "hardLanding"
  | "wingLanding"
  | "hit";

export type CrashFix = { kind: "fault"; fault: BreakId } | { kind: "mode"; mode: string } | { kind: "pace" } | { kind: "reset" };

export interface CrashReplay {
  /** One frame per physics step, from `before` seconds ahead of the crash to `after` seconds past it. */
  frames: FlightFrame[];
  /** Index of the crash in `frames`. */
  at: number;
  cause: CrashCause;
  /** What it hit (a hit), m/s at impact, and the faults that were on. */
  hit: HitKind | null;
  speed: number;
  fix: CrashFix;
}

type CrashWhy = Extract<FlightEvent, { type: "crash" }>["why"];

/** Why it crashed, from what it hit, the faults that were on and what happened in the seconds before. */
export function causeOf(why: CrashWhy, faults: CraftFaults, recent: FlightEvent[]): CrashCause {
  if (why === "flipFc" || why === "flipProps" || why === "flipMotor") return why;
  if (recent.some((e) => e.type === "battery" && e.level === "empty")) return "battery";
  if (recent.some((e) => e.type === "desync")) return "desync";
  if (why === "groundWing") {
    if (faults.servosReversed || faults.fcReversed) return "servos";
    if (faults.tailHeavy) return "tailHeavy";
    if (faults.propBackwards) return "propBackwards";
    return "wingLanding";
  }
  return why === "ground" ? "hardLanding" : "hit";
}

/** The one change that fixes a cause, given the craft's modes and whether the course has an autopilot line. */
export function fixFor(cause: CrashCause, faults: CraftFaults, modes: FlightMode[], current: FlightMode, hasPace: boolean): CrashFix {
  switch (cause) {
    case "flipFc":
      return { kind: "fault", fault: "fcReversed" };
    case "flipProps":
      return { kind: "fault", fault: "propsSwapped" };
    case "flipMotor":
      return { kind: "fault", fault: "motorDirUnchecked" };
    case "desync":
      return { kind: "fault", fault: "overKv" };
    case "servos":
      return { kind: "fault", fault: faults.servosReversed ? "servosReversed" : "fcReversed" };
    case "tailHeavy":
    case "propBackwards":
      return { kind: "fault", fault: cause };
    case "hardLanding": {
      // altitude hold flies the height for you; already in it, a fresh go is the fix
      const hold = current.throttle === "manual" ? modes.find((m) => m.throttle === "climb" && m.task === "free") : undefined;
      return hold ? { kind: "mode", mode: hold.id } : { kind: "reset" };
    }
    case "wingLanding": {
      const home = modes.find((m) => m.task === "rth");
      return home && home.id !== current.id ? { kind: "mode", mode: home.id } : { kind: "reset" };
    }
    case "hit":
      return hasPace ? { kind: "pace" } : { kind: "reset" };
    case "battery":
      return { kind: "reset" };
  }
}

/**
 * Re-runs the session's log to the crash and a little past it. `steps` is the session's step count when the crash
 * was seen (the crash is the last one before it). Null if the replay has no crash (never, the sim being
 * deterministic; a test checks it).
 */
export function crashReplay(
  origin: FlightOrigin,
  log: ReadonlyArray<{ step: number; action: FlightAction }>,
  steps: number,
  hasPace: boolean,
  { before = 2, after = 1 }: { before?: number; after?: number } = {},
): CrashReplay | null {
  const keepFrom = Math.max(0, steps - Math.round((before + 1) / STEP));
  const frames: Array<{ step: number; frame: FlightFrame }> = [];
  const events: Array<{ step: number; e: FlightEvent }> = [];
  let crash: { step: number; why: CrashWhy; faults: CraftFaults; mode: FlightMode; speed: number } | null = null;
  const { sim } = replay(origin.craft, origin.course, origin.calc, log, steps + Math.round(after / STEP), origin.opts, (s, now) => {
    if (s.step < keepFrom) return;
    frames.push({ step: s.step, frame: frameOf(s) });
    for (const e of now) {
      events.push({ step: s.step, e });
      if (e.type === "crash" && s.step <= steps) {
        // the speed it had coming in, before the impact took it off
        const prev = frames.length > 1 ? frames[frames.length - 2].frame : frameOf(s);
        crash = { step: s.step, why: e.why, faults: { ...s.faults }, mode: s.mode, speed: prev.speed };
      }
    }
  });
  const c = crash as { step: number; why: CrashWhy; faults: CraftFaults; mode: FlightMode; speed: number } | null;
  if (!c) return null;
  const from = c.step - Math.round(before / STEP), to = c.step + Math.round(after / STEP);
  const window = frames.filter((f) => f.step >= from && f.step <= to);
  const recent = events.filter((x) => x.step >= c.step - Math.round(3 / STEP) && x.step <= c.step).map((x) => x.e);
  const cause = causeOf(c.why, c.faults, recent);
  const hit = c.why === "ground" || c.why === "groundWing" || c.why.startsWith("flip") ? null : (c.why as HitKind);
  return {
    frames: window.map((f) => f.frame),
    at: window.findIndex((f) => f.step === c.step),
    cause,
    hit,
    speed: Math.round(c.speed * 10) / 10,
    fix: fixFor(cause, c.faults, sim.craft.modes, c.mode, hasPace),
  };
}
