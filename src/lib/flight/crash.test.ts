import { describe, expect, it } from "vitest";
import quad5 from "@/content/drones/quad5";
import { flightCalc } from "@/lib/dronelab/fly";
import { causeOf, crashReplay, fixFor } from "./crash";
import { flightOf } from "./registry";
import { createSession, type FlightSession } from "./session";
import type { Course, CraftFaults, FlightEvent, Sticks } from "./types";

const { craft, courses } = flightOf(quad5)!;
const bando = courses.find((c) => c.id === "bando")!;
const calc = flightCalc(quad5, quad5.design.default);
const open: Course = { ...bando, kind: undefined, prims: [], gates: [], checkpoints: [], missions: [], field: 200, pad: [100, 100], ceiling: 60 };

const sticks = (s: FlightSession, p: Partial<Sticks>) => s.dispatch({ type: "sticks", sticks: { throttle: 0, yaw: 0, pitch: 0, roll: 0, ...p } });
/** Flies until the crash; returns the session at that moment, like the range sees it. */
function flyUntilCrash(s: FlightSession, maxS = 20) {
  const events: FlightEvent[] = [];
  while (!events.some((e) => e.type === "crash") && s.sim.step < maxS * 100) events.push(...s.tick(0.05));
  expect(events.some((e) => e.type === "crash"), "it crashed").toBe(true);
}

describe("the crash replay", () => {
  it("replays a flip from a backwards flight controller and offers to turn it round", () => {
    const faults: CraftFaults = { fcReversed: true };
    const s = createSession(craft, open, calc, { mode: "angle", faults });
    s.dispatch({ type: "arm" });
    sticks(s, { throttle: 0.7 });
    flyUntilCrash(s);
    const r = crashReplay(s.origin, s.log(), s.sim.step, true)!;
    expect(r).not.toBeNull();
    expect(r.cause).toBe("flipFc");
    expect(r.fix).toEqual({ kind: "fault", fault: "fcReversed" });
    // the crash frame is in the window, with the flight just before it and a second after it
    expect(r.frames[r.at].crashed).toBe(true);
    expect(r.frames[r.at - 1].crashed).toBe(false);
    expect(r.frames.length - r.at).toBeGreaterThan(90);
  });

  it("calls a drop from height a hard landing, and offers altitude hold to a manual throttle", () => {
    const s = createSession(craft, open, calc, { mode: "angle" });
    s.dispatch({ type: "arm" });
    sticks(s, { throttle: 0.85 });
    for (let i = 0; i < 30; i++) s.tick(0.05);
    expect(s.sim.p[2]).toBeGreaterThan(3);
    sticks(s, { throttle: 0 });
    flyUntilCrash(s);
    const r = crashReplay(s.origin, s.log(), s.sim.step, true)!;
    expect(r.cause).toBe("hardLanding");
    expect(r.fix).toEqual({ kind: "mode", mode: "alt" });
    expect(r.speed).toBeGreaterThan(3.2);
    // two seconds of flight before the impact, then one after it
    expect(r.at).toBe(200);
    expect(r.frames).toHaveLength(301);
  });

  it("names what it hit, and points to the autopilot's line", () => {
    const wall: Course = { ...open, prims: [{ type: "box", x: 100, y: 108, w: 12, d: 1, h: 8, kind: "wall" }] };
    const s = createSession(craft, wall, calc, { mode: "alt" });
    s.dispatch({ type: "arm" });
    sticks(s, { throttle: 1 });
    for (let i = 0; i < 20; i++) s.tick(0.05);
    sticks(s, { throttle: 0.5, pitch: 1 });
    flyUntilCrash(s);
    const r = crashReplay(s.origin, s.log(), s.sim.step, true)!;
    expect(r.cause).toBe("hit");
    expect(r.hit).toBe("wall");
    expect(r.fix).toEqual({ kind: "pace" });
    expect(crashReplay(s.origin, s.log(), s.sim.step, false)!.fix).toEqual({ kind: "reset" });
  });
});

describe("why it crashed", () => {
  const t = 1;
  it("blames a flat pack or a desync before the ground", () => {
    expect(causeOf("ground", {}, [{ t, type: "battery", level: "empty", chemistry: "lipo", perCell: 3.1 }])).toBe("battery");
    expect(causeOf("ground", {}, [{ t, type: "desync", motor: 3 }])).toBe("desync");
    expect(causeOf("ground", {}, [])).toBe("hardLanding");
    expect(causeOf("tree", {}, [])).toBe("hit");
    // flipping over from a backwards FC and then hitting a gate post is the FC's fault
    expect(causeOf("gate", { fcReversed: true }, [], "flipFc")).toBe("flipFc");
  });

  it("reads a wing's faults when it hits the ground", () => {
    expect(causeOf("groundWing", { servosReversed: true }, [])).toBe("servos");
    expect(causeOf("groundWing", { tailHeavy: true }, [])).toBe("tailHeavy");
    expect(causeOf("groundWing", {}, [])).toBe("wingLanding");
  });

  it("fixes a flat pack with a fresh one, and keeps altitude hold when already in it", () => {
    const alt = craft.modes.find((m) => m.id === "alt")!;
    expect(fixFor("battery", {}, craft.modes, alt, true)).toEqual({ kind: "reset" });
    expect(fixFor("hardLanding", {}, craft.modes, alt, true)).toEqual({ kind: "reset" });
  });
});
