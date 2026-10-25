import { beforeEach, describe, expect, it } from "vitest";
import quad5 from "@/content/drones/quad5";
import { flightCalc } from "@/lib/dronelab/fly";
import { finishOf, ghostAt, ghostFromLog, GHOST_DT, isGhostTrack, lapClock, loadGhost, paceGhost, poseOf, saveGhost, type GhostPose, type GhostTrack } from "./ghost";
import { flightOf } from "./registry";
import { createSession } from "./session";
import { drainEvents, stepSim } from "./sim";
import type { FlightEvent } from "./types";

const { craft, courses } = flightOf(quad5)!;
const race = courses.find((c) => c.kind === "gates")!;
const calc = flightCalc(quad5, quad5.design.default);

beforeEach(() => localStorage.clear());

describe("your best-lap ghost", () => {
  it("is the lap the sim flew: a replay of the session's log gives the same poses", () => {
    const session = createSession(craft, race, calc, { mode: "race" });
    const live = new Map<number, GhostPose>();
    const step = (n: number, out: FlightEvent[] = []) => {
      for (let i = 0; i < n; i++) {
        stepSim(session.sim);
        if (session.sim.step % 5 === 0) live.set(session.sim.step, poseOf(session.sim));
        out.push(...drainEvents(session.sim));
      }
      return out;
    };
    session.dispatch({ type: "sticks", sticks: { throttle: 0, yaw: 0, pitch: 0, roll: 0 } });
    session.dispatch({ type: "arm" });
    step(30);
    // the learner hands over to the autopilot, with the wind on, part-way through
    session.dispatch({ type: "wind", on: true });
    session.dispatch({ type: "mode", mode: "demo" });
    const events: FlightEvent[] = [];
    while (!events.some((e) => e.type === "lap") && session.sim.step < 200 * 100) step(1, events);
    const lap = events.find((e) => e.type === "lap")!;
    expect(lap).toBeDefined();
    const ghost = ghostFromLog(session.origin, session.log(), session.sim.step, finishOf(lap)!.time)!;
    expect(ghost).not.toBeNull();
    expect(ghost.time).toBe(finishOf(lap)!.time);
    expect(ghost.poses.length).toBeGreaterThan((ghost.time / GHOST_DT) * 0.95);
    expect(ghost.poses.length).toBeLessThan(ghost.time / GHOST_DT + 3);
    // every pose is one the live flight passed through, in order, ending where the lap ended
    const end = session.sim.step - (session.sim.step % 5);
    const tail = [...live.entries()].filter(([k]) => k <= end).slice(-ghost.poses.length).map(([, p]) => p);
    expect(ghost.poses).toEqual(tail);
  });

  it("keeps only the fastest lap in this browser", () => {
    const track = (time: number): GhostTrack => ({ v: 1, craft: "quad5", course: race.id, time, dt: GHOST_DT, poses: [[1, 2, 3, 0, 0, 0], [2, 3, 4, 10, 0, 0]] });
    expect(saveGhost(track(14))).toBe(true);
    expect(saveGhost(track(15))).toBe(false);
    expect(loadGhost("quad5", race.id)?.time).toBe(14);
    expect(saveGhost(track(12.5))).toBe(true);
    expect(loadGhost("quad5", race.id)?.time).toBe(12.5);
    expect(loadGhost("quad5", "other")).toBeNull();
    localStorage.setItem(`iynk:ghost:v1:quad5:${race.id}`, JSON.stringify({ v: 1, craft: "quad5", course: race.id, time: 3, dt: GHOST_DT, poses: [[1, 2]] }));
    expect(loadGhost("quad5", race.id)).toBeNull();
    expect(isGhostTrack(null)).toBe(false);
  });
});

describe("the autopilot's ghost", () => {
  it("flies one full lap of the demo line on the learner's design", () => {
    const pace = paceGhost(craft, race, calc)!;
    expect(pace).not.toBeNull();
    expect(pace.course).toBe(race.id);
    // a full lap: it starts and ends at the first gate
    const g = race.gates[0];
    const [sx, sy] = pace.poses[0], [ex, ey] = pace.poses[pace.poses.length - 1];
    expect(Math.hypot(sx - g.x, sy - g.y)).toBeLessThan(2);
    expect(Math.hypot(ex - g.x, ey - g.y)).toBeLessThan(2);
    expect(pace.time).toBeGreaterThan(5);
  });

  it("is null on a course the planner has no line for", () => {
    expect(paceGhost(craft, { ...race, missions: [] }, calc)).toBeNull();
  });
});

describe("playback", () => {
  const g: GhostTrack = { v: 1, craft: "quad5", course: "race", time: 0.1, dt: GHOST_DT, poses: [[0, 0, 1, 170, 0, 0], [1, 0, 1, -170, 10, 0], [2, 0, 2, -160, 10, 4]] };

  it("interpolates between poses, the short way round in yaw, and holds at both ends", () => {
    const mid = ghostAt(g, 0.025);
    expect(mid[0]).toBeCloseTo(0.5, 6);
    // 170 to -170 passes through 180, not through 0
    expect(Math.cos((mid[3] * Math.PI) / 180)).toBeCloseTo(-1, 6);
    expect(ghostAt(g, -1)).toEqual(g.poses[0]);
    expect(ghostAt(g, 5)).toEqual(g.poses[2]);
  });

  it("starts the clock with the learner's lap: nothing to race until the first gate", () => {
    const session = createSession(craft, race, calc, { mode: "demo" });
    session.dispatch({ type: "arm" });
    expect(lapClock(session.sim)).toBeNull();
    const events: FlightEvent[] = [];
    while (!events.some((e) => e.type === "gate") && session.sim.step < 60 * 100) events.push(...session.tick(0.05));
    expect(lapClock(session.sim)).not.toBeNull();
    expect(lapClock(session.sim)!).toBeLessThan(0.2);
  });
});
