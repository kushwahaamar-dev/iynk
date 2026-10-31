// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Descriptor } from "../../parts/descriptor.ts";
import type { Op, Project } from "../../project/generated/types.ts";
import { createSession } from "../../project/session.ts";
import { USER, seededRandom, steppingClock } from "../../project/session.testing.ts";
import { validateRobot } from "../../sim/mech/validate.ts";
import { fromSi, parseNumber, readProps, recipe, setProp, toSi } from "./robot.ts";
import type { RecipeCtx, RobotPart } from "./robot.ts";

const FIXTURE = "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/robot-line-follower.project.json";

function emptyRobot(): Project {
  const doc = JSON.parse(readFileSync(FIXTURE, "utf8")) as Project;
  delete doc.mechanical;
  doc.components = [];
  doc.nets = [];
  doc.dependencies.components = [];
  doc.views = [];
  doc.simulation.faults = [];
  doc.simulation.instruments = [];
  doc.domains!.robotics!.data.sensors = [];
  doc.domains!.robotics!.data.bodies = {};
  doc.domains!.robotics!.data.joints = {};
  doc.domains!.robotics!.data.wheels = {};
  return doc;
}

const describePart = (id: string): Descriptor | undefined => {
  try {
    return JSON.parse(readFileSync(`src/parts/data/${id.replace("core.", "")}.component.json`, "utf8")) as Descriptor;
  } catch {
    return undefined;
  }
};

const DESCRIPTORS: Record<RobotPart, string> = {
  chassis: "core.chassis-2wd",
  "wheel-pair": "core.wheel-65",
  caster: "core.caster-ball",
  gearmotor: "core.tt-motor",
  driver: "core.tb6612fng-module",
  battery: "core.lipo-2s",
  "line-array": "core.qtr-8rc",
  ranger: "core.hc-sr04",
};

function setup() {
  const session = createSession({ state: emptyRobot(), clock: steppingClock(), rnd: seededRandom() });
  let n = 0;
  const ctx = (): RecipeCtx => ({ doc: session.state, newId: (prefix) => `${prefix}_t${++n}`, describe: describePart });
  const add = (part: RobotPart, params?: Record<string, number>) => {
    const made = recipe(part, { descriptor: DESCRIPTORS[part], params }, ctx());
    if (!made.ok) return made;
    const applied = session.apply(made.value, USER);
    if (!applied.ok) throw new Error(applied.message);
    return made;
  };
  const errors = () => validateRobot(session.state, { describe: describePart, dmath: Math }).filter((p) => p.severity === "error");
  return { session, ctx, add, errors };
}

describe("recipes", () => {
  it("build a robot with no RB-E problems, part by part", () => {
    const { add, errors } = setup();
    for (const part of Object.keys(DESCRIPTORS) as RobotPart[]) {
      expect(add(part).ok, part).toBe(true);
      if (part === "wheel-pair" || part === "line-array") expect(errors(), part).toEqual([]);
    }
    expect(errors()).toEqual([]);
  });

  it("drive the wheels from the motors whichever came first", () => {
    const wheelsFirst = setup();
    wheelsFirst.add("chassis");
    wheelsFirst.add("wheel-pair");
    wheelsFirst.add("gearmotor");
    const motorsFirst = setup();
    motorsFirst.add("chassis");
    motorsFirst.add("gearmotor");
    motorsFirst.add("wheel-pair");
    for (const { session } of [wheelsFirst, motorsFirst]) {
      const drives = session.state.mechanical!.joints.filter((j) => j.kind === "wheel").map((j) => j.drive?.component);
      expect(drives).toHaveLength(2);
      expect(drives.every((c) => c !== undefined)).toBe(true);
      expect(new Set(drives).size).toBe(2);
    }
  });

  it("give the wheels the mass and friction of the descriptor", () => {
    const { session, add } = setup();
    add("chassis");
    add("wheel-pair");
    const wheel = describePart("core.wheel-65")!.mechanics!.wheel!;
    const bodies = session.state.mechanical!.bodies.filter((b) => b.shape?.kind === "cylinder");
    expect(bodies.map((b) => b.mass_g)).toEqual([wheel.mass_g, wheel.mass_g]);
    expect(Object.values(session.state.domains!.robotics!.data.wheels).map((w) => w?.surface_mu)).toEqual([wheel.mu, wheel.mu]);
  });

  it("refuse a wheel pair before a chassis, and a second one", () => {
    const { add } = setup();
    const early = add("wheel-pair");
    expect(!early.ok && early.error.code).toBe("no-chassis");
    add("chassis");
    add("wheel-pair");
    const again = add("wheel-pair");
    expect(!again.ok && again.error.code).toBe("occupied");
  });

  it("refuse a mount place that is taken", () => {
    const { add } = setup();
    add("chassis");
    add("driver");
    const again = add("driver");
    expect(!again.ok && again.error.code).toBe("occupied");
  });

  it("refuse a part the library does not hold", () => {
    const { ctx } = setup();
    const made = recipe("chassis", { descriptor: "core.nope" }, ctx());
    expect(!made.ok && made.error.code).toBe("no-descriptor");
  });

  it("number a second sensor of a kind", () => {
    const { session, add } = setup();
    add("chassis");
    add("line-array");
    add("line-array", { xMm: 60 });
    expect(session.state.domains!.robotics!.data.sensors.map((s) => s.id)).toEqual(["line", "line-2"]);
  });

  it("are one undo each, and undo restores the document exactly", () => {
    const { session, add } = setup();
    const shape = () => structuredClone({ m: session.state.mechanical, d: session.state.domains, c: session.state.components, p: session.state.dependencies });
    const before = shape();
    add("chassis");
    add("wheel-pair");
    session.undo();
    session.undo();
    expect(shape()).toEqual(before);
  });

  it("write only through the ops the card allows", () => {
    const { ctx, add } = setup();
    add("chassis");
    for (const part of Object.keys(DESCRIPTORS) as RobotPart[]) {
      const made = recipe(part, { descriptor: DESCRIPTORS[part] }, ctx());
      const kinds = made.ok ? made.value.map((op: Op) => op.k) : [];
      expect(kinds.every((k) => ["mech.set", "domain.patch", "component.add", "dep.set"].includes(k))).toBe(true);
    }
  });
});

describe("setProp", () => {
  function robot() {
    const s = setup();
    for (const part of ["chassis", "wheel-pair", "caster", "gearmotor", "line-array"] as const) s.add(part);
    return s;
  }

  it("converts ounces to the kilograms the document stores as grams", () => {
    const { session, ctx } = robot();
    const chassis = session.state.mechanical!.bodies.find((b) => b.shape?.kind === "box")!;
    const ops = setProp(ctx(), { kind: "body", id: chassis.id }, "mass", toSi(4, "oz"));
    session.apply(ops, USER);
    const stored = session.state.mechanical!.bodies.find((b) => b.id === chassis.id)!.mass_g!;
    expect(stored).toBeCloseTo(113.398, 3);
    expect(fromSi(readProps(session.state, { kind: "body", id: chassis.id }).find((r) => r.prop === "mass")!.valueSi, "oz")).toBeCloseTo(4, 6);
  });

  it("moves both wheels when the track changes and keeps the document valid", () => {
    const { session, ctx, errors } = robot();
    const wheel = session.state.mechanical!.joints.find((j) => j.kind === "wheel")!;
    session.apply(setProp(ctx(), { kind: "wheel", id: wheel.id }, "track", toSi(20, "cm")), USER);
    expect(readProps(session.state, { kind: "wheel", id: wheel.id }).find((r) => r.prop === "track")!.valueSi).toBeCloseTo(0.2, 6);
    expect(errors()).toEqual([]);
  });

  it("lifts the wheel frame and the joint with the diameter", () => {
    const { session, ctx, errors } = robot();
    const wheel = session.state.mechanical!.joints.find((j) => j.kind === "wheel")!;
    session.apply(setProp(ctx(), { kind: "wheel", id: wheel.id }, "diameter", toSi(80, "mm")), USER);
    expect(session.state.domains!.robotics!.data.wheels[wheel.id]!.radius_mm).toBe(40);
    expect(errors()).toEqual([]);
  });

  it("sets the sensor height above the floor", () => {
    const { session, ctx } = robot();
    session.apply(setProp(ctx(), { kind: "sensor", id: "line" }, "height", toSi(8, "mm")), USER);
    expect(readProps(session.state, { kind: "sensor", id: "line" }).find((r) => r.prop === "height")!.valueSi).toBeCloseTo(0.008, 6);
  });

  it("ignores a value that is not a number", () => {
    const { session, ctx } = robot();
    expect(setProp(ctx(), { kind: "sensor", id: "line" }, "height", Number.NaN)).toEqual([]);
    expect(parseNumber("abc")).toBeUndefined();
    expect(parseNumber(" 2.5 ")).toBe(2.5);
    expect(session.revision).toBeGreaterThan(0);
  });
});

describe("recipe speed", () => {
  it("builds ops in a few milliseconds", () => {
    const { add, ctx } = setup();
    add("chassis");
    const start = performance.now();
    recipe("wheel-pair", { descriptor: "core.wheel-65" }, ctx());
    expect(performance.now() - start).toBeLessThan(50);
  });
});
