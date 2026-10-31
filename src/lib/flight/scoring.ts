import { release } from "./autopilot";
import type { Vec3 } from "./math";
import { ceilingOf, countsCheckpoints, countsGates, crash, emit, STEP, type SimState } from "./state";
import { collide, passCheckpoint, throughGate } from "./world";

export function worldChecks(s: SimState) {
  const c = s.craft, course = s.course;
  const prev: Vec3 = [s.p[0] - s.v[0] * STEP, s.p[1] - s.v[1] * STEP, s.p[2] - s.v[2] * STEP];
  const speed = Math.hypot(s.v[0], s.v[1], s.v[2]);
  // take-off and landing
  if (!s.airborne && s.armed && s.p[2] > 0.3) {
    s.airborne = true;
    if (s.runStart === null && countsCheckpoints(s)) startRun(s);
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
  if (countsGates(s) && !s.crashed) {
    const g = course.gates[s.gate];
    if (throughGate(g, prev, s.p)) {
      const n = course.gates.length;
      const now = s.t;
      let split: number | null = null;
      if (s.gate === 0) {
        if (s.lapStart !== null && s.splits.length === n - 1) {
          const lap = now - s.lapStart;
          s.splits.push(now - s.lastGateT);
          const best = !s.assisted && (s.bestLap === null || lap < s.bestLap);
          if (best) s.bestLap = lap;
          s.laps++;
          emit(s, { type: "lap", time: lap, best, splits: s.splits.slice(), ...demoFlag(s) });
        }
        s.lapStart = now;
        s.assisted = s.mode.task === "demo";
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
  // range checkpoints, or the goals of a mission
  if (countsCheckpoints(s) && !s.crashed) {
    const cp = course.checkpoints[s.checkpoint];
    if (passCheckpoint(cp, prev, s.p, speed)) {
      const n = course.checkpoints.length;
      emit(s, { type: "checkpoint", index: s.checkpoint + 1, total: n, label: cp.label });
      if (cp.action === "drop") release(s);
      s.checkpoint++;
      if (s.checkpoint >= n) {
        const start = s.runStart ?? 0;
        const time = s.t - start;
        const best = !s.assisted && (s.bestRun === null || time < s.bestRun);
        if (best) s.bestRun = time;
        s.laps++;
        if (course.kind === "mission") emit(s, { type: "missionDone", time, best, ...demoFlag(s) });
        else emit(s, { type: "run", time, best, ...demoFlag(s) });
        s.checkpoint = 0;
        if (s.airborne) startRun(s);
        else s.runStart = null;
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

export function startRun(s: SimState) {
  s.runStart = s.t;
  s.assisted = s.mode.task === "demo";
}

export const demoFlag = (s: SimState): { demo?: true } => (s.assisted ? { demo: true } : {});
