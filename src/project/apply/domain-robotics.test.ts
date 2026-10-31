// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Op, Project } from "../generated/types.ts";
import { stateHash } from "../hash.ts";
import { createSession } from "../session.ts";
import { seededRandom, steppingClock, USER } from "../session.testing.ts";
import { validateValue } from "../validate.ts";
import { afterDomainOp, validateRoboticsRefs } from "./domain-robotics.ts";
import { accept, loadExample, refuse } from "./fixtures.testing.ts";

const patch = (p: Record<string, unknown>): Extract<Op, { k: "domain.patch" }> => ({ k: "domain.patch", domain: "robotics", patch: p });
const robot = (): Project => loadExample("robot-line-follower");
const ROOT = "domains.robotics.data";

describe("validateRoboticsRefs", () => {
  it("finds nothing wrong in the line follower example", () => {
    expect(validateRoboticsRefs(robot())).toEqual([]);
  });

  it("finds nothing in a project with no robotics domain", () => {
    expect(validateRoboticsRefs(loadExample("uno-blink-d12"))).toEqual([]);
  });

  it("names a body that is not in mechanical", () => {
    const doc = robot();
    doc.domains!.robotics!.data.bodies.bdy_ghost = doc.domains!.robotics!.data.bodies[Object.keys(doc.domains!.robotics!.data.bodies)[0]!];
    expect(validateRoboticsRefs(doc)).toMatchObject([{ code: "unknown-body", path: `${ROOT}.bodies.bdy_ghost` }]);
  });

  it("names a joint that is not in mechanical", () => {
    const doc = robot();
    doc.domains!.robotics!.data.joints.jnt_ghost = { damping: 0, friction_nm: 0 };
    expect(validateRoboticsRefs(doc)).toMatchObject([{ code: "unknown-joint", path: `${ROOT}.joints.jnt_ghost` }]);
  });

  it("names a wheel entry for a joint that is missing or is not a wheel", () => {
    const doc = robot();
    const wheel = Object.values(doc.domains!.robotics!.data.wheels)[0]!;
    const fixed = doc.mechanical!.joints.find((j) => j.kind !== "wheel")!;
    doc.domains!.robotics!.data.wheels[fixed.id] = wheel;
    doc.domains!.robotics!.data.wheels.jnt_ghost = wheel;
    expect(validateRoboticsRefs(doc)).toMatchObject([
      { code: "not-a-wheel", path: `${ROOT}.wheels.${fixed.id}` },
      { code: "unknown-joint", path: `${ROOT}.wheels.jnt_ghost` },
    ]);
  });

  it("names a surface that is not defined, on the floor and on a static", () => {
    const doc = robot();
    const { arena } = doc.domains!.robotics!.data;
    arena.floor.surface = "srf_ghost";
    arena.statics[0]!.surface = "srf_other";
    expect(validateRoboticsRefs(doc).map((e) => [e.code, e.path])).toEqual([
      ["unknown-surface", `${ROOT}.arena.floor.surface`],
      ["unknown-surface", `${ROOT}.arena.statics.0.surface`],
    ]);
  });

  it("names a sensor whose mount or component is missing", () => {
    const doc = robot();
    const sensor = doc.domains!.robotics!.data.sensors[0]!;
    sensor.mount = "mnt_ghost";
    sensor.component = "cmp_ghost";
    expect(validateRoboticsRefs(doc).map((e) => [e.code, e.path])).toEqual([
      ["unknown-mount", `${ROOT}.sensors.0.mount`],
      ["unknown-component", `${ROOT}.sensors.0.component`],
    ]);
  });
});

describe("afterDomainOp", () => {
  it("lets other domains through", () => {
    expect(afterDomainOp(robot(), { k: "domain.patch", domain: "drone", patch: {} })).toEqual({ ok: true });
  });

  it("returns the errors of a robotics op", () => {
    const doc = robot();
    doc.domains!.robotics!.data.arena.floor.surface = "srf_ghost";
    const result = afterDomainOp(doc, patch({}));
    expect(result.ok).toBe(false);
  });
});

describe("domain.patch on robotics", () => {
  const wheels = () => {
    const ids = Object.keys(robot().domains!.robotics!.data.bodies).filter((id) => id.includes("wheel"));
    return [ids[0]!, ids[1]!] as const;
  };

  it("keeps both edits whichever order two wheel patches arrive in", () => {
    const [left, right] = wheels();
    const a = patch({ bodies: { [left]: { friction: 0.7 } } });
    const b = patch({ bodies: { [right]: { friction: 0.9 } } });
    const ab = accept(accept(robot(), [a]).state, [b]).state;
    const ba = accept(accept(robot(), [b]).state, [a]).state;
    expect(stateHash(ab)).toBe(stateHash(ba));
    expect(ab.domains!.robotics!.data.bodies[left]!.friction).toBe(0.7);
    expect(ab.domains!.robotics!.data.bodies[right]!.friction).toBe(0.9);
  });

  it("refuses an id that does not exist, with its path", () => {
    const [left] = wheels();
    const body = robot().domains!.robotics!.data.bodies[left]!;
    const reject = refuse(robot(), [patch({ bodies: { bdy_wheel_x: body } })], "invariant");
    expect(reject.refs).toEqual([`${ROOT}.bodies.bdy_wheel_x`]);
  });

  it("refuses to remove a surface that is still in use", () => {
    const doc = robot();
    const used = doc.domains!.robotics!.data.arena.floor.surface;
    const next = doc.domains!.robotics!.data.surfaces.filter((s) => s.id !== used);
    const reject = refuse(doc, [patch({ surfaces: next })], "invariant");
    expect(reject.refs).toContain(`${ROOT}.arena.floor.surface`);
  });

  it("undoes to the exact document through a session", () => {
    const [left] = wheels();
    const session = createSession({ state: robot(), clock: steppingClock(), rnd: seededRandom() });
    const before = stateHash(session.state);
    expect(session.apply(patch({ bodies: { [left]: { friction: 0.55 } } }), USER).ok).toBe(true);
    expect(stateHash(session.state)).not.toBe(before);
    session.undo();
    expect(stateHash(session.state)).toBe(before);
  });
});

describe("validateValue", () => {
  it("reports a dangling robotics reference as a V3 error with a pointer path", () => {
    const doc = robot();
    doc.domains!.robotics!.data.arena.floor.surface = "srf_ghost";
    const report = validateValue(doc);
    expect(report.diagnostics).toContainEqual(
      expect.objectContaining({ code: "V3-ROBOTICS-UNKNOWN-SURFACE", path: "/domains/robotics/data/arena/floor/surface" }),
    );
  });

  it("passes the example", () => {
    expect(validateValue(robot()).errors).toBe(0);
  });
});
