// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Project } from "../../project/generated/types.ts";
import { rng } from "./ports.ts";
import { buildScene, type SceneDeps, sceneHash, worldPose } from "./scene.ts";

const FIXTURE = "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/robot-line-follower.project.json";
const load = (): Project => JSON.parse(readFileSync(FIXTURE, "utf8")) as Project;

const motorPart = { mechanics: { motor: { r_ohm: 6, j_kgm2: 1e-7, gear: { ratio: 48, efficiency: 0.7 } } } };
const deps: SceneDeps = {
  describe: (ref) => (ref === "core.dc-gear-motor" ? motorPart : ref === "core.chassis-2wd" ? { mechanics: { mass_g: 120 } } : undefined) as never,
  dmath: Math,
};

function build(doc: Project) {
  const result = buildScene(doc, deps);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

function errorsOf(edit: (doc: Project) => void): string[] {
  const doc = load();
  edit(doc);
  const result = buildScene(doc, deps);
  return result.ok ? [] : result.error.map((e) => e.code);
}

describe("buildScene on the line follower", () => {
  const { scene, warnings } = build(load());

  it("lists the floor and walls, four bodies and three joints in sorted order", () => {
    expect(scene.statics.map((s) => s.id)).toEqual(["arena.floor", "arena.wall_e", "arena.wall_n", "arena.wall_s", "arena.wall_w"]);
    expect(scene.bodies.map((b) => b.id)).toEqual(["bdy_caster", "bdy_chassis", "bdy_wheel_l", "bdy_wheel_r"]);
    expect(scene.joints.map((j) => j.id)).toEqual(["jnt_caster", "jnt_wheel_l", "jnt_wheel_r"]);
    expect(warnings).toEqual([]);
  });

  it("reflects the rotor inertia onto the wheel axis", () => {
    const wheel = scene.bodies.find((b) => b.id === "bdy_wheel_l")!;
    const disc = (0.025 * 0.0325 ** 2) / 2;
    expect(wheel.inertiaKgM2[2]).toBeCloseTo(disc + 1e-7 * 48 * 48, 12);
  });

  it("gives a wheel its surface friction and the caster a min combine", () => {
    const byBody = new Map(scene.colliders.map((c) => [c.body, c]));
    expect(byBody.get("bdy_wheel_l")!.friction).toBe(0.9);
    expect(byBody.get("bdy_caster")!.frictionCombine).toBe("min");
  });

  it("puts the start pose on the robot frame", () => {
    const chassis = scene.bodies.find((b) => b.id === "bdy_chassis")!;
    expect(chassis.pose.p[0]).toBeCloseTo(0.7 + 0.01 * 0, 6);
    expect(chassis.pose.p[1]).toBeCloseTo(-0.01, 6);
  });

  it("has the golden hash (new in iynk, not the RS-13 vector)", () => {
    expect(sceneHash(scene)).toBe("1a8681bde4683221");
  });
});

describe("RA-21: creation order", () => {
  it("gives a byte-identical scene for 20 shuffles", () => {
    const reference = JSON.stringify(build(load()).scene);
    const random = rng(21, "shuffle");
    for (let n = 0; n < 20; n++) {
      const doc = load();
      for (const list of [doc.mechanical!.bodies, doc.mechanical!.joints, doc.mechanical!.frames]) {
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(random.float() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
      }
      expect(JSON.stringify(build(doc).scene)).toBe(reference);
    }
  });

  it("orders ids by code unit, not by locale", () => {
    const doc = load();
    doc.mechanical!.bodies.push({ ...doc.mechanical!.bodies[0], id: "bdy_Zeta" });
    doc.mechanical!.joints.push({ ...doc.mechanical!.joints[0], id: "jnt_x", child: "bdy_Zeta" });
    const ids = build(doc).scene.bodies.map((b) => b.id);
    expect(ids.indexOf("bdy_Zeta")).toBeLessThan(ids.indexOf("bdy_caster"));
  });
});

describe("errors", () => {
  it("reports a massless wheel with its path", () => {
    const doc = load();
    doc.mechanical!.bodies.find((b) => b.id === "bdy_wheel_l")!.mass_g = 0;
    const result = buildScene(doc, deps);
    expect(!result.ok && result.error).toContainEqual(expect.objectContaining({ code: "RB-E-MASS", path: expect.stringContaining("mechanical.bodies.") }));
  });

  it("takes a mass from the part when the body has none", () => {
    const doc = load();
    const chassis = doc.mechanical!.bodies.find((b) => b.id === "bdy_chassis")!;
    delete chassis.mass_g;
    chassis.component = "cmp_chassis";
    doc.components.push({ id: "cmp_chassis", definition: { ref: "core.chassis-2wd", version: "1.0.0" }, refdes: "C1" });
    expect(build(doc).scene.bodies.find((b) => b.id === "bdy_chassis")!.massKg).toBeCloseTo(0.12, 12);
  });

  it("flags each rule", () => {
    expect(errorsOf((d) => d.mechanical!.joints.push({ ...d.mechanical!.joints[0], id: "jnt_loop", parent: "bdy_wheel_l", child: "bdy_chassis" }))).toContain("RB-E-TREE");
    expect(errorsOf((d) => (d.mechanical!.joints.pop()))).toContain("RB-E-TREE");
    expect(errorsOf((d) => (d.mechanical!.bodies[0].inertia_g_mm2 = [1, 1, 5]))).toContain("RB-E-INERTIA");
    expect(errorsOf((d) => (d.domains!.robotics!.data.arena.statics[0].size_mm = [1800, 3, 60]))).toContain("RB-E-THIN");
    expect(errorsOf((d) => (d.mechanical!.joints[1].axis = [0, 0, 0]))).toContain("RB-E-AXIS");
    expect(errorsOf((d) => Object.assign(d.mechanical!.joints[1], { kind: "revolute", limits: { min: 10, max: 5 } }))).toContain("RB-E-LIMITS");
    expect(errorsOf((d) => Object.assign(d.mechanical!.joints[1], { kind: "revolute", limits: { min: -180, max: 180 } }))).toContain("RB-E-LIMITS");
    expect(errorsOf((d) => delete d.domains!.robotics!.data.wheels.jnt_wheel_l)).toContain("RB-E-WHEEL");
    expect(errorsOf((d) => (d.mechanical!.joints[1].axis = [0, 1, 0]))).toContain("RB-E-WHEEL");
    expect(errorsOf((d) => (d.domains!.robotics!.data.arena.floor.surface = "ice"))).toContain("RB-E-SURFACE");
  });
});

describe("worldPose", () => {
  it("composes frames in mm and degrees", () => {
    const pose = worldPose(load(), "frm_wheel_l", deps);
    expect(pose.position_mm).toEqual([0, 70, 32.5]);
    pose.rpy_deg.forEach((v, i) => expect(v).toBeCloseTo([-90, 0, 0][i], 9));
  });
});
