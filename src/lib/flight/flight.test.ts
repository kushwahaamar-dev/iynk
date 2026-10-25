import { describe, expect, it } from "vitest";
import type { DroneContent } from "@/content/schema";
import quad5 from "@/content/drones/quad5";
import { flightCalc } from "@/lib/dronelab/fly";
import { calc, type CalcBattery, type CalcFixedPart, type CalcMotor, type CalcProp } from "../drone/calc";
import catalogueData from "../drone/__fixtures__/catalogues.json";
import { calcModels } from "../drone/__fixtures__/models";
import { ocv, voltageFactor } from "./battery";
import { fromCalc } from "./from-calc";
import { createInput, DEFAULT_PAD, learnAxis, padSticks, readSticks } from "./input";
import { DEG } from "./math";
import { createSession } from "./session";
import { flightOf, medalFor, modesFor, parOf, startMode } from "./registry";
import { DEMO_MISSION } from "./route";
import { createSim, dispatch, drainEvents, frameOf, hoverCommand, replay, stepSim, type SimState } from "./sim";
import type { CalcOutputs, Course, FlightCraft, FlightEvent, Sticks } from "./types";
import { buildSolids, collide, throughGate } from "./world";

// quad5 flies from its content module through the registry, like every craft on the site
const quad5Flight = flightOf(quad5)!;
const quad5Craft = quad5Flight.craft;
const quad5Race = quad5Flight.courses.find((c) => c.id === "race")!;
const quad5Course = quad5Flight.courses.find((c) => c.id === "bando")!;

type Catalogue = { batteries: Record<string, CalcBattery>; motors: Record<string, CalcMotor>; props: Record<string, CalcProp>; fixed: CalcFixedPart[] };
const catalogues = catalogueData as unknown as Record<string, Catalogue>;

function quad5Calc(batt = "6s1100", motor = "2306-1750", prop = "5x4.3x3"): CalcOutputs {
  const c = catalogues.quad5;
  const battery = c.batteries[batt];
  const r = calc({ model: calcModels.quad5, fixed: c.fixed, battery, motor: c.motors[motor], prop: c.props[prop] });
  return fromCalc(r, battery);
}

const sticks = (s: SimState, p: Partial<Sticks>) => dispatch(s, { type: "sticks", sticks: { throttle: 0.5, yaw: 0, pitch: 0, roll: 0, ...p } });
const run = (s: SimState, seconds: number, out: FlightEvent[] = []) => {
  for (let i = 0; i < Math.round(seconds / 0.01); i++) {
    stepSim(s);
    out.push(...drainEvents(s));
  }
  return out;
};

describe("agreement with the drone calculator", () => {
  it("uses the calculator's default 5-inch numbers", () => {
    const c = quad5Calc();
    expect(c.auw).toBeCloseTo(514, 0);
    expect(c.motors).toBe(4);
    expect(c.hoverThrottle).toBeCloseTo(Math.sqrt(c.auw / (4 * c.thrustPerMotor)), 6);
  });

  it("holds a hover on exactly the calculator's hover throttle on a nominal pack", () => {
    for (const [b, m, p] of [["6s1100", "2306-1750", "5x4.3x3"], ["4s1500", "2306-2450", "5x5x3"], ["6s1800", "2207-1950", "5.1x2.5x3"]]) {
      const c = quad5Calc(b, m, p);
      expect(hoverCommand(c, c.cells * 3.7)).toBeCloseTo(c.hoverThrottle, 9);
    }
  });

  it("settles altitude hold on the hover command for the pack's voltage", () => {
    const c = quad5Calc();
    const s = createSim(quad5Craft, quad5Course, c, { mode: "alt" });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 1 });
    run(s, 1.5);
    sticks(s, { throttle: 0.5 });
    run(s, 4);
    expect(s.p[2]).toBeGreaterThan(2);
    expect(Math.abs(s.v[2])).toBeLessThan(0.05);
    expect(s.u).toBeCloseTo(hoverCommand(c, s.battery.volt), 2);
    // a full pack has more voltage than the nominal 3.7 V/cell, so it hovers a little lower
    expect(s.u).toBeLessThan(c.hoverThrottle);
    expect(s.u).toBeGreaterThan(c.hoverThrottle * 0.85);
  });

  it("draws the calculator's hover current and runs the pack flat at hover, then cuts out", () => {
    const c = quad5Calc();
    const s = createSim(quad5Craft, quad5Course, c, { mode: "alt" });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 1 });
    run(s, 1.5);
    sticks(s, { throttle: 0.5 });
    const events = run(s, 20);
    expect(s.battery.amps).toBeGreaterThan(c.hoverAmps * 0.85);
    expect(s.battery.amps).toBeLessThan(c.hoverAmps * 1.25);
    let t = 20;
    while (!events.some((e) => e.type === "battery" && e.level === "empty") && t < 1500) {
      run(s, 1, events);
      t++;
    }
    const low = events.find((e) => e.type === "battery" && e.level === "low");
    const empty = events.find((e) => e.type === "battery" && e.level === "empty");
    expect(low).toBeDefined();
    expect(empty).toBeDefined();
    expect(s.armed).toBe(false);
    // the calculator's hover time counts 80 % of the pack; the sim's runs to the cut-off
    const minutes = (empty?.t ?? 0) / 60;
    expect(minutes).toBeGreaterThan(c.mah / 1000 * 0.8 / c.hoverAmps * 60 * 0.9);
    expect(minutes).toBeLessThan(c.mah / 1000 / c.hoverAmps * 60 * 1.1);
  });
});

describe("battery", () => {
  it("sags more on a small pack and has a per-chemistry curve", () => {
    expect(ocv("lipo", 1)).toBe(4.2);
    expect(ocv("lihv", 1)).toBe(4.35);
    expect(ocv("liion", 0)).toBe(2.8);
    const c = quad5Calc();
    expect(voltageFactor(c, c.cells * 3.7)).toBeCloseTo(1, 9);
  });
});

describe("multirotor physics", () => {
  it("tops out near 50 km/h in angle mode and banks with the correct sign", () => {
    const s = createSim(quad5Craft, quad5Course, quad5Calc(), { mode: "alt" });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 1 });
    run(s, 2);
    sticks(s, { throttle: 0.5, pitch: 1 });
    run(s, 6);
    const v = Math.hypot(s.v[0], s.v[1]);
    expect(v).toBeGreaterThan(10);
    expect(v).toBeLessThan(16);
    // yaw 90 = facing north: full forward stick flies north
    expect(s.v[1]).toBeGreaterThan(9);
    sticks(s, { throttle: 0.5, roll: 1 });
    run(s, 1.5);
    // left stick banks left: from facing north that is west (-x)
    expect(s.roll).toBeGreaterThan(30);
  });

  it("crashes on a hard landing and refuses to arm until reset", () => {
    const s = createSim(quad5Craft, quad5Course, quad5Calc(), { mode: "angle" });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 0.6 });
    run(s, 2);
    dispatch(s, { type: "disarm" });
    const ev = run(s, 4);
    expect(ev.some((e) => e.type === "crash" && e.why === "ground")).toBe(true);
    dispatch(s, { type: "arm" });
    expect(drainEvents(s).some((e) => e.type === "blocked" && e.why === "crashed")).toBe(true);
    dispatch(s, { type: "reset" });
    expect(s.crashed).toBe(false);
    expect(s.p).toEqual([20, 6, 0]);
  });

  it("blocks arming with the throttle up in a manual mode", () => {
    const s = createSim(quad5Craft, quad5Course, quad5Calc(), { mode: "angle" });
    sticks(s, { throttle: 0.3 });
    dispatch(s, { type: "arm" });
    expect(s.armed).toBe(false);
    expect(drainEvents(s)[0]).toMatchObject({ type: "blocked", why: "throttle" });
  });

  it("keeps the hover power when switching from altitude hold to angle mid-air", () => {
    const s = createSim(quad5Craft, quad5Course, quad5Calc(), { mode: "alt" });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 1 });
    run(s, 1.5);
    sticks(s, { throttle: 0.5 });
    run(s, 3);
    const z = s.p[2];
    dispatch(s, { type: "mode", mode: "angle" });
    expect(s.sticks.throttle).toBeCloseTo(s.u, 6);
    run(s, 1);
    expect(s.crashed).toBe(false);
    expect(Math.abs(s.p[2] - z)).toBeLessThan(1.5);
  });

  it("flips on take-off with the flight controller reversed", () => {
    const s = createSim(quad5Craft, quad5Course, quad5Calc(), { mode: "angle", faults: { fcReversed: true } });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 0.6 });
    const ev = run(s, 4);
    expect(ev.some((e) => e.type === "crash" && e.why === "flipFc")).toBe(true);
  });

  it("does not wipe the flight on a design change mid-air", () => {
    const s = createSim(quad5Craft, quad5Course, quad5Calc(), { mode: "alt" });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 1 });
    run(s, 1);
    const heavier = quad5Calc("6s1800");
    dispatch(s, { type: "design", calc: heavier });
    expect(s.armed).toBe(true);
    expect(s.pending).not.toBeNull();
    expect(s.calc.auw).toBeCloseTo(514, 0);
    dispatch(s, { type: "reset" });
    expect(s.calc.auw).toBe(heavier.auw);
  });

  it("drifts with real wind when nothing holds position", () => {
    const s = createSim(quad5Craft, quad5Course, quad5Calc(), { mode: "alt", windOn: true });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 1 });
    run(s, 1.5);
    sticks(s, { throttle: 0.5 });
    const x0 = s.p[0], y0 = s.p[1];
    run(s, 5);
    expect(Math.hypot(s.p[0] - x0, s.p[1] - y0)).toBeGreaterThan(4);
  });
});

describe("the 5-inch course", () => {
  const solids = buildSolids(quad5Race);
  const r = quad5Craft.hitRadius;

  it("has visible, solid gates whose openings are clear", () => {
    expect(solids.filter((o) => o.kind === "gate").length).toBe(quad5Race.gates.length * 3);
    for (const g of quad5Race.gates) {
      const c = Math.cos(g.heading * DEG), s = Math.sin(g.heading * DEG);
      for (let d = -2; d <= 2; d += 0.25) expect(collide(solids, g.x + c * d, g.y + s * d, g.h / 2, r), `gate ${g.x},${g.y} at ${d}`).toBeNull();
    }
  });

  it("can be lapped on straight legs between the gates without hitting anything", () => {
    const gs = quad5Race.gates;
    for (let i = 0; i < gs.length; i++) {
      const a = gs[i], b = gs[(i + 1) % gs.length];
      for (let k = 0.15; k <= 0.85; k += 0.02) {
        const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
        expect(collide(solids, x, y, 0.8, r), `leg ${i + 1}->${((i + 1) % gs.length) + 1} at ${k.toFixed(2)}`).toBeNull();
      }
    }
  });

  it("counts a pass through a gate along its heading only", () => {
    const g = quad5Race.gates[0];
    expect(throughGate(g, [20, 10.9, 0.8], [20, 11.1, 0.8])).toBe(true);
    expect(throughGate(g, [20, 11.1, 0.8], [20, 10.9, 0.8])).toBe(false);
    expect(throughGate(g, [21, 10.9, 0.8], [21, 11.1, 0.8])).toBe(false);
  });

  it("has every checkpoint reachable below the altitude-hold top", () => {
    const top = (quad5Course.ceiling ?? quad5Craft.ceiling) - 1.79;
    const solids = buildSolids(quad5Course);
    for (const cp of quad5Course.checkpoints) {
      if (cp.heading !== undefined) {
        const c = Math.cos(cp.heading * DEG), s = Math.sin(cp.heading * DEG);
        for (let d = -1.5; d <= 1.5; d += 0.25) expect(collide(solids, cp.x + c * d, cp.y + s * d, cp.z, r), cp.label).toBeNull();
      } else {
        // some point inside the sphere is free and low enough to reach
        let ok = false;
        for (let dz = -cp.r; dz <= cp.r && !ok; dz += 0.1) {
          const z = cp.z + dz;
          if (z >= 0 && z <= top && !collide(solids, cp.x, cp.y, z, r) && Math.abs(dz) < cp.r) ok = true;
        }
        expect(ok, cp.label).toBe(true);
      }
    }
  });

  it("flies a lap of gate 1 in the race and starts the clock", () => {
    const c = quad5Calc();
    const s = createSim(quad5Craft, quad5Race, c, { mode: "race" });
    sticks(s, { throttle: 0 });
    dispatch(s, { type: "arm" });
    const ev: FlightEvent[] = [];
    // a pilot holding about a metre with the throttle and easing forward
    for (let i = 0; i < 600; i++) {
      const thr = hoverCommand(c, s.battery.volt) * 1.05 + 0.08 * (1 - s.p[2]) - 0.05 * s.v[2];
      sticks(s, { throttle: Math.max(0, Math.min(1, thr)), pitch: s.p[2] > 0.6 ? 0.25 : 0 });
      run(s, 0.01, ev);
    }
    const gate = ev.find((e) => e.type === "gate");
    expect(gate).toMatchObject({ index: 1, total: 5 });
    expect(s.lapStart).not.toBeNull();
  });
});

describe("determinism", () => {
  it("replays a recorded flight to the same result", () => {
    const c = quad5Calc();
    const live = createSession(quad5Craft, quad5Course, c, { mode: "alt" });
    live.dispatch({ type: "arm" });
    live.dispatch({ type: "sticks", sticks: { throttle: 1, yaw: 0, pitch: 0, roll: 0 } });
    const events: FlightEvent[] = [];
    for (let f = 0; f < 120; f++) {
      events.push(...live.tick(1 / 60));
      if (f === 60) live.dispatch({ type: "sticks", sticks: { throttle: 0.5, yaw: 0.3, pitch: 0.6, roll: -0.2 } });
    }
    const steps = live.sim.step;
    const again = replay(quad5Craft, quad5Course, c, [...live.log()], steps, { mode: "alt" });
    expect(frameOf(again.sim)).toEqual(live.frame());
    expect(again.events.map((e) => e.type)).toEqual(events.map((e) => e.type));
  });
});

describe("other craft classes", () => {
  const base: FlightCraft = { ...quad5Craft, id: "test" };
  const flatCourse: Course = { ...quad5Course, missions: [], prims: [], gates: [], checkpoints: [], field: 200, pad: [100, 100], ceiling: 60 };

  it("an octocopter keeps flying with one motor out, on a higher throttle", () => {
    const octo: FlightCraft = { ...base, modes: [{ id: "althold", attitude: "angle", throttle: "climb", task: "free" }, { id: "motorfail", attitude: "angle", throttle: "climb", task: "motorfail" }] };
    const c: CalcOutputs = { auw: 15486, thrustPerMotor: 4450, motors: 8, cells: 12, mah: 22000, hoverThrottle: Math.sqrt(15486 / (8 * 4450)), hoverAmps: 50, maxAmps: 193 };
    const s = createSim(octo, flatCourse, c, { mode: "althold" });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 1 });
    run(s, 2);
    sticks(s, { throttle: 0.5 });
    run(s, 3);
    const before = s.u;
    dispatch(s, { type: "mode", mode: "motorfail" });
    run(s, 4);
    expect(s.crashed).toBe(false);
    expect(s.motorsOut).toHaveLength(1);
    expect(s.u / before).toBeGreaterThan(1.05);
    expect(s.u / before).toBeLessThan(1.1);
  });

  it("a quad that loses a motor goes down", () => {
    const quad: FlightCraft = { ...base, modes: [...base.modes, { id: "motorfail", attitude: "angle", throttle: "climb", task: "motorfail" }] };
    const s = createSim(quad, flatCourse, quad5Calc(), { mode: "alt" });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 1 });
    run(s, 2);
    dispatch(s, { type: "mode", mode: "motorfail" });
    const ev = run(s, 6);
    expect(ev.some((e) => e.type === "crash")).toBe(true);
  });

  it("a tricopter yaws through its tail servo, with lag", () => {
    const tri: FlightCraft = { ...base, tailServo: { maxDeg: 40, rateDegS: 300 } };
    const s = createSim(tri, flatCourse, quad5Calc(), { mode: "alt" });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 1 });
    run(s, 1.5);
    sticks(s, { throttle: 0.5, yaw: 1 });
    run(s, 0.05);
    expect(s.servo).toBeGreaterThan(10);
    expect(s.servo).toBeLessThan(40);
    const y0 = s.yaw;
    run(s, 1);
    expect(s.servo).toBeCloseTo(40, 5);
    expect(y0 - s.yaw).toBeGreaterThan(100); // yaw right: the heading angle falls
  });

  it("a flying wing hand-launches, cruises, and stalls when the throttle is cut", () => {
    const wing: FlightCraft = {
      ...base,
      class: "wing",
      ceiling: 60,
      wing: { vstall: 8, vmin: 10, cd: 0.012, launchSpeed: 10.5, bankLimit: 45, pitchLimit: 28, rollRate: 220, pitchRate: 140 },
      modes: [{ id: "angle", attitude: "angle", throttle: "manual", task: "free" }],
    };
    const c: CalcOutputs = { auw: 825, thrustPerMotor: 1070, motors: 1, cells: 4, mah: 3000, hoverThrottle: 0.36, hoverAmps: 6, maxAmps: 33 };
    const s = createSim(wing, flatCourse, c, { mode: "angle" });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 0.6 });
    const ev = run(s, 15);
    expect(ev.some((e) => e.type === "launch")).toBe(true);
    expect(s.airspeed).toBeGreaterThan(14);
    expect(s.p[2]).toBeGreaterThan(1.6);
    sticks(s, { throttle: 0 });
    const later = run(s, 30);
    expect(later.some((e) => e.type === "stall")).toBe(true);
  });

  it("a swarm's followers hold their slots around the leader", () => {
    const swarm: FlightCraft = { ...base, class: "swarm", swarm: { count: 4, spacing: 0.6 } };
    const s = createSim(swarm, flatCourse, quad5Calc(), { mode: "alt" });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 1 });
    run(s, 1);
    sticks(s, { throttle: 0.5 });
    run(s, 4);
    expect(s.followers).toHaveLength(3);
    const f = s.followers[0];
    expect(Math.hypot(f.p[0] - (s.p[0] + 0.6), f.p[1] - s.p[1])).toBeLessThan(0.15);
    expect(Math.abs(f.p[2] - s.p[2])).toBeLessThan(0.3);
  });
});

describe("input", () => {
  it("springs the throttle to the centre in climb modes and holds it in manual modes", () => {
    const inp = createInput();
    inp.keys.add("KeyW");
    expect(readSticks(inp, true, 0.016).throttle).toBe(1);
    inp.keys.clear();
    expect(readSticks(inp, true, 0.016).throttle).toBe(0.5);
    inp.keys.add("KeyW");
    for (let i = 0; i < 100; i++) readSticks(inp, false, 0.01);
    inp.keys.clear();
    expect(readSticks(inp, false, 0.01).throttle).toBeCloseTo(0.32, 2);
  });

  it("maps a Mode 2 gamepad and learns axes", () => {
    const s = padSticks([0, -1, 0.5, 0], DEFAULT_PAD);
    expect(s.throttle).toBe(1);
    expect(s.roll).toBeLessThan(0);
    expect(learnAxis([0, 0, 0, 0], [0, 0, -0.9, 0.1])).toEqual({ axis: 2, invert: true });
    expect(learnAxis([0, 0, 0, 0], [0.2, 0, 0, 0])).toBeNull();
  });
});

// every drone content module on the site, as it lands
const contentModules = import.meta.glob<{ default: DroneContent }>(["../../content/drones/*.ts", "!../../content/drones/*.test.ts", "!../../content/drones/_*.ts"], { eager: true });
const crafts = Object.values(contentModules).map((m) => m.default);

describe("the flight registry", () => {
  it("flies quad5 from its content with the numbers the range always used", () => {
    expect(quad5Craft).toMatchObject({ id: "quad5", class: "multirotor", hitRadius: 0.16, angleLimit: 38, acroRate: 670, yawRate: 200, camTilt: 30, fov: 105, fpvProps: true });
    expect(quad5Craft.look).toMatchObject({ arms: 4, propR: 0.0635, body: [0.112, 0.046, 0.04], palette: "tomato", frame: "x", isoScale: 2 });
    expect(quad5Craft.look.armLen).toBeCloseTo(0.1125, 3);
    expect(quad5Craft.modes.find((m) => m.id === "raceAcro")).toMatchObject({ attitude: "acro", throttle: "manual", task: "race", expo: 0.7 });
    expect(quad5Craft.modes.find((m) => m.id === "range")).toMatchObject({ attitude: "angle", throttle: "climb", task: "range" });
    expect(quad5Flight.courses.map((c) => [c.id, c.kind])).toEqual([["race", "gates"], ["bando", "checkpoints"]]);
    expect(quad5Race.checkpoints).toEqual([]);
    expect(quad5Course.checkpoints.at(-1)).toMatchObject({ land: true, z: 0 });
  });

  it("hands every craft the numbers its content (and its CLI snippets) set", () => {
    expect(crafts.length).toBeGreaterThanOrEqual(2);
    for (const content of crafts) {
      const craft = flightOf(content)?.craft as unknown as Record<string, unknown> | undefined;
      expect(craft, content.id).toBeDefined();
      for (const [key, value] of Object.entries(content.flight.params)) {
        if (typeof craft![key] === "number") expect(craft![key], `${content.id}.${key}`).toBe(value);
      }
      expect((craft!.modes as { id: string }[]).map((m) => m.id), content.id).toEqual([...content.flight.modes.map((m) => m.id), "demo"]);
    }
  });

  it("opens each course in the mode that scores it", () => {
    expect(startMode(quad5, "race")).toBe("race");
    expect(startMode(quad5, "bando")).toBe("range");
    for (const content of crafts) for (const c of content.courses) expect(content.flight.modes.map((m) => m.id), `${content.id}/${c.id}`).toContain(startMode(content, c.id));
  });

  it("gives every timed course bronze, silver and gold, in that order", () => {
    expect(parOf({ parS: 20 })).toEqual({ gold: 17, silver: 20, bronze: 28 });
    expect(parOf({ par: { gold: 10, silver: 12, bronze: 15 }, parS: 99 })).toEqual({ gold: 10, silver: 12, bronze: 15 });
    expect(medalFor(16.9, parOf({ parS: 20 }))).toBe("gold");
    expect(medalFor(27, parOf({ parS: 20 }))).toBe("bronze");
    expect(medalFor(40, parOf({ parS: 20 }))).toBeNull();
    for (const content of crafts) {
      // a mission scores by finishing it; gates and checkpoints race the clock
      for (const c of content.courses.filter((x) => x.kind !== "mission" || parOf(x))) {
        const par = parOf(c);
        expect(par, `${content.id}/${c.id} has a par time`).not.toBeNull();
        expect(par!.gold, `${content.id}/${c.id}`).toBeLessThanOrEqual(par!.silver);
        expect(par!.silver, `${content.id}/${c.id}`).toBeLessThanOrEqual(par!.bronze);
      }
    }
  });
});

describe("the autopilot demo", () => {
  const finish = (e: FlightEvent) => e.type === "lap" || e.type === "run" || e.type === "missionDone";

  // the demo flies the course with the learner's physics: a route that crashes means the course cannot be flown
  for (const content of crafts) {
    const flight = flightOf(content);
    for (const course of flight?.courses ?? []) {
      it(`flies ${content.id}/${course.id} to the end without a crash`, () => {
        expect(course.missions?.some((m) => m.id === DEMO_MISSION), "the planner found a route").toBe(true);
        expect(modesFor(flight!.craft, course).map((m) => m.id)).toContain("demo");
        const s = createSim(flight!.craft, course, flightCalc(content, content.design.default), { mode: "demo" });
        dispatch(s, { type: "arm" });
        const events: FlightEvent[] = [];
        for (let i = 0; i < 240 * 100 && !s.crashed && !events.some(finish); i++) {
          stepSim(s);
          events.push(...drainEvents(s));
        }
        expect(events.find((e) => e.type === "crash"), "crash").toBeUndefined();
        expect(events.some((e) => e.type === "takeoff" || e.type === "launch")).toBe(true);
        const done = events.find(finish);
        expect(done, "a lap, a run or the mission").toMatchObject({ demo: true });
        // the demo's time never counts as the learner's best
        expect(done && "best" in done ? done.best : false).toBe(false);
        expect(s.bestLap).toBeNull();
        expect(s.bestRun).toBeNull();
      });
    }
  }

  // a mission course flown by the craft's own AUTO mode, the way the learner would fly it on the real craft
  for (const content of crafts) {
    const flight = flightOf(content);
    for (const course of flight?.courses.filter((c) => c.kind === "mission") ?? []) {
      const auto = flight!.craft.modes.find((m) => m.task === "mission" && course.missions?.some((x) => x.id === m.missionId));
      if (!auto) continue;
      it(`flies ${content.id}/${course.id} in ${auto.id} from take-off to the last goal`, () => {
        const s = createSim(flight!.craft, course, flightCalc(content, content.design.default), { mode: auto.id });
        dispatch(s, { type: "arm" });
        const events: FlightEvent[] = [];
        for (let i = 0; i < 240 * 100 && !s.crashed && !events.some((e) => e.type === "missionDone"); i++) {
          stepSim(s);
          events.push(...drainEvents(s));
        }
        expect(events.find((e) => e.type === "crash"), "crash").toBeUndefined();
        expect(events.filter((e) => e.type === "checkpoint")).toHaveLength(course.checkpoints.length);
        expect(events.find((e) => e.type === "missionDone")).toMatchObject({ best: true });
      });
    }
  }

  it("is not offered on a course it has no route for", () => {
    const blocked: Course = { ...quad5Course, missions: [] };
    expect(modesFor(quad5Craft, blocked).map((m) => m.id)).not.toContain("demo");
  });
});

describe("missions that carry something", () => {
  const delivery = crafts.find((c) => c.id === "delivery");

  it("drops the parcel at the drop zone and flies home lighter", () => {
    expect(delivery, "the delivery craft's content").toBeDefined();
    const { craft, courses } = flightOf(delivery!)!;
    const parcel = delivery!.design.fixed.find((p) => p.id === "PARCEL")!.g;
    expect(craft.payloadG).toBe(parcel);
    const course = courses.find((c) => c.kind === "mission")!;
    const auto = craft.modes.find((m) => m.task === "mission")!;
    const s = createSim(craft, course, flightCalc(delivery!, delivery!.design.default), { mode: auto.id });
    expect(frameOf(s).cargo).toBe(true);
    dispatch(s, { type: "arm" });
    // the motor command while cruising at 12 m, before and after the drop
    const out: number[] = [], home: number[] = [];
    const events: FlightEvent[] = [];
    for (let i = 0; i < 240 * 100 && !s.crashed && !events.some((e) => e.type === "missionDone"); i++) {
      stepSim(s);
      events.push(...drainEvents(s));
      const cruising = Math.abs(s.p[2] - 12) < 0.3 && Math.abs(s.v[2]) < 0.1 && Math.hypot(s.v[0], s.v[1]) > 3;
      if (cruising) (s.dropped ? home : out).push(s.u);
    }
    expect(events.find((e) => e.type === "crash")).toBeUndefined();
    expect(events.find((e) => e.type === "drop")).toMatchObject({ g: parcel });
    expect(s.dropped).toBe(parcel);
    expect(frameOf(s).cargo).toBe(false);
    expect(frameOf(s).parcel).not.toBeNull();
    const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
    expect(out.length).toBeGreaterThan(50);
    expect(home.length).toBeGreaterThan(50);
    // the calculator's hover throttle falls from about 0.72 to 0.64 without the parcel
    expect(mean(home) / mean(out)).toBeLessThan(0.95);
    // a fresh pad puts the parcel back on
    dispatch(s, { type: "reset" });
    expect(s.dropped).toBe(0);
    expect(frameOf(s).cargo).toBe(true);
  });

  it("drops it when the learner flies through the drop goal by hand too", () => {
    const { craft, courses } = flightOf(delivery!)!;
    const course = courses.find((c) => c.kind === "mission")!;
    const i = course.checkpoints.findIndex((c) => c.action === "drop");
    expect(i).toBeGreaterThan(0);
    const s = createSim(craft, course, flightCalc(delivery!, delivery!.design.default), { mode: "loiter" });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 1 });
    run(s, 1);
    const cp = course.checkpoints[i];
    s.checkpoint = i;
    s.p = [cp.x, cp.y, cp.z];
    s.v = [0, 0, 0];
    const events = run(s, 0.05);
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(["checkpoint", "drop"]));
  });

  it("flies to a landing goal at its height and then comes straight down", () => {
    const [px, py] = quad5Course.pad;
    const course: Course = {
      ...quad5Course,
      kind: undefined,
      prims: [],
      gates: [],
      checkpoints: [],
      missions: [{ id: "far-land", waypoints: [{ x: px, y: py, z: 8, label: "up" }, { x: px + 15, y: py, z: 0, label: "pad", action: "land" }] }],
    };
    const craft: FlightCraft = { ...quad5Craft, modes: [{ id: "auto", attitude: "angle", throttle: "climb", task: "mission", missionId: "far-land" }] };
    const s = createSim(craft, course, quad5Calc(), { mode: "auto" });
    dispatch(s, { type: "arm" });
    let lowest = Infinity;
    let reachedTop = false;
    const events: FlightEvent[] = [];
    for (let i = 0; i < 40 * 100 && !events.some((e) => e.type === "landed"); i++) {
      stepSim(s);
      events.push(...drainEvents(s));
      if (s.p[2] > 6.5) reachedTop = true;
      const d = Math.hypot(px + 15 - s.p[0], py - s.p[1]);
      if (reachedTop && d > 3) lowest = Math.min(lowest, s.p[2]);
    }
    expect(events.find((e) => e.type === "crash")).toBeUndefined();
    expect(reachedTop).toBe(true);
    // the old autopilot glided down the whole leg; ArduCopter holds its height until it is over the pad
    expect(lowest).toBeGreaterThan(6);
    expect(events.some((e) => e.type === "missionDone")).toBe(true);
    expect(s.p[2]).toBeLessThan(0.05);
    expect(Math.hypot(px + 15 - s.p[0], py - s.p[1])).toBeLessThan(1.5);
  });
});

describe("a wing's return to home", () => {
  it("climbs to the content's RTH altitude and circles home at its loiter radius", () => {
    const wing = crafts.find((c) => c.flight.physics === "fixed-wing" && typeof c.flight.params.loiterRadius === "number");
    expect(wing, "a fixed-wing craft with a loiter radius").toBeDefined();
    const { craft, courses } = flightOf(wing!)!;
    const rth = craft.modes.find((m) => m.task === "rth")!;
    const course = courses[0];
    const s = createSim(craft, course, flightCalc(wing!, wing!.design.default), { mode: craft.modes[0].id });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 0.7 });
    run(s, 6);
    dispatch(s, { type: "mode", mode: rth.id });
    const events = run(s, 90);
    expect(events.find((e) => e.type === "crash")).toBeUndefined();
    const [hx, hy] = course.pad;
    const r: number[] = [];
    for (let i = 0; i < 20; i++) {
      run(s, 1);
      r.push(Math.hypot(s.p[0] - hx, s.p[1] - hy));
    }
    const mean = r.reduce((a, b) => a + b, 0) / r.length;
    expect(mean).toBeGreaterThan(craft.loiterRadius! * 0.7);
    expect(mean).toBeLessThan(craft.loiterRadius! * 1.4);
    expect(Math.abs(s.p[2] - craft.rtlAlt!)).toBeLessThan(6);
  });
});

describe("rates", () => {
  it("applies expo to roll and pitch only: acro yaw is the CLI's straight 200 deg/s", () => {
    const s = createSim(quad5Craft, quad5Course, quad5Calc(), { mode: "alt" });
    dispatch(s, { type: "arm" });
    sticks(s, { throttle: 1 });
    run(s, 1.5);
    dispatch(s, { type: "mode", mode: "acro" });
    sticks(s, { throttle: s.u, yaw: 0.5 });
    const y0 = s.yaw;
    run(s, 0.5);
    // half stick for half a second: 50 deg at 200 deg/s with no expo (expo 0.7 would give about 18)
    expect(Math.abs(s.yaw - y0)).toBeGreaterThan(40);
    expect(Math.abs(s.yaw - y0)).toBeLessThan(55);
  });
});
