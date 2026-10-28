// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LIMITS } from "../../core/limits.ts";
import type { Asset, Body, Frame, Joint, Mount, Op, Project, TestCase } from "../generated/types.ts";
import { validateOp } from "../generated/validate.mjs";
import { accept, ctxFor, deepFreeze, loadExample, refuse, roundTrip } from "./fixtures.testing.ts";

const blink = (): Project => loadExample("uno-blink-d12");
const lesson = (): Project => loadExample("lesson-uno-r3-button");
const robot = (): Project => loadExample("robot-line-follower");

const origin = { position_mm: [0, 0, 0], rpy_deg: [0, 0, 0] } as Frame["pose"];
const frame = (id: string, parent: string): Frame => ({ id, name: id, parent, pose: origin });

describe("mech.set and mech.remove", () => {
  it("adds, replaces and removes a frame", () => {
    const state = deepFreeze(robot());
    const add: Op = { k: "mech.set", collection: "frames", value: frame("frm_arm", "frm_plate") };
    expect(accept(state, [add]).state.mechanical?.frames.map((f) => f.id)).toContain("frm_arm");
    expect(roundTrip(state, [add])).toEqual([{ k: "mech.remove", collection: "frames", id: "frm_arm" }]);
    const old = state.mechanical?.frames.find((f) => f.id === "frm_caster") as Frame;
    const replace: Op = { k: "mech.set", collection: "frames", value: { ...old, name: "Ball" } };
    expect(roundTrip(state, [replace])).toEqual([{ k: "mech.set", collection: "frames", value: old }]);
    const held = deepFreeze(accept(state, [add]).state);
    expect(roundTrip(held, [{ k: "mech.remove", collection: "frames", id: "frm_arm" }])).toEqual([
      { k: "mech.set", collection: "frames", value: frame("frm_arm", "frm_plate") },
    ]);
  });

  it("creates the mechanical section and drops it again when the last entry goes", () => {
    const state = deepFreeze(blink());
    const add: Op = { k: "mech.set", collection: "frames", value: frame("frm_a", "world") };
    const out = accept(state, [add]);
    expect(out.state.mechanical).toEqual({ frames: [frame("frm_a", "world")], bodies: [], joints: [], mounts: [] });
    expect("mechanical" in accept(out.state, out.inverse).state).toBe(false);
    roundTrip(state, [add]);
  });

  it("refuses a frame cycle, a missing parent and a frame that is its own parent", () => {
    const state = deepFreeze(robot());
    const robotFrame = state.mechanical?.frames.find((f) => f.id === "frm_robot") as Frame;
    const loop: Op = { k: "mech.set", collection: "frames", value: { ...robotFrame, parent: "frm_caster" } };
    expect(refuse(state, [loop], "invariant").message).toContain("V3-FRAME-CYCLE");
    refuse(state, [{ k: "mech.set", collection: "frames", value: frame("frm_x", "frm_none") }], "missing_target");
    refuse(state, [{ k: "mech.set", collection: "frames", value: frame("frm_x", "frm_x") }], "missing_target");
  });

  it("refuses a value the schema forbids", () => {
    const state = deepFreeze(robot());
    refuse(state, [{ k: "mech.set", collection: "frames", value: { id: "frm_x" } }], "malformed");
    refuse(state, [{ k: "mech.set", collection: "bodies", value: frame("frm_x", "world") }], "malformed");
  });

  it("adds a body, a joint and a mount that name what exists", () => {
    const state = deepFreeze(robot());
    const body: Body = { id: "bdy_arm", name: "Arm", frame: "frm_plate", mass_g: 5 };
    const joint: Joint = { id: "jnt_arm", kind: "fixed", parent: "bdy_chassis", child: "bdy_arm", origin };
    const mount: Mount = { id: "mnt_arm", component: "cmp_imu", frame: "frm_plate", pose: origin };
    const out = accept(state, [
      { k: "mech.set", collection: "bodies", value: body },
      { k: "mech.set", collection: "joints", value: joint },
      { k: "mech.set", collection: "mounts", value: mount },
    ]);
    expect(out.inverse.map((op) => op.k)).toEqual(["mech.remove", "mech.remove", "mech.remove"]);
    roundTrip(state, [
      { k: "mech.set", collection: "bodies", value: body },
      { k: "mech.set", collection: "joints", value: joint },
      { k: "mech.set", collection: "mounts", value: mount },
    ]);
  });

  it("refuses a body, joint or mount that names something missing", () => {
    const state = deepFreeze(robot());
    const body: Body = { id: "bdy_arm", name: "Arm", frame: "frm_plate" };
    refuse(state, [{ k: "mech.set", collection: "bodies", value: { ...body, frame: "frm_none" } }], "missing_target");
    refuse(
      state,
      [{ k: "mech.set", collection: "bodies", value: { ...body, component: "cmp_none" } }],
      "missing_target",
    );
    const joint: Joint = { id: "jnt_arm", kind: "fixed", parent: "bdy_chassis", child: "bdy_none", origin };
    refuse(state, [{ k: "mech.set", collection: "joints", value: joint }], "missing_target");
    const driven: Joint = { ...joint, child: "bdy_caster", drive: { component: "cmp_none" } };
    refuse(state, [{ k: "mech.set", collection: "joints", value: driven }], "missing_target");
    const mount: Mount = { id: "mnt_arm", component: "cmp_none", frame: "frm_plate", pose: origin };
    refuse(state, [{ k: "mech.set", collection: "mounts", value: mount }], "missing_target");
    refuse(
      state,
      [{ k: "mech.set", collection: "mounts", value: { ...mount, component: "cmp_imu", frame: "frm_none" } }],
      "missing_target",
    );
  });

  it("refuses to remove a frame or a body that is still used, with pointers", () => {
    const state = deepFreeze(robot());
    const frames = refuse(state, [{ k: "mech.remove", collection: "frames", id: "frm_robot" }], "referenced_by");
    expect(frames.refs).toEqual([
      "/mechanical/frames/0",
      "/mechanical/frames/1",
      "/mechanical/frames/3",
      "/mechanical/frames/4",
    ]);
    const plate = refuse(state, [{ k: "mech.remove", collection: "frames", id: "frm_plate" }], "referenced_by");
    expect(plate.refs?.some((ref) => ref.startsWith("/mechanical/bodies/"))).toBe(true);
    expect(plate.refs?.some((ref) => ref.startsWith("/mechanical/mounts/"))).toBe(true);
    const body = refuse(state, [{ k: "mech.remove", collection: "bodies", id: "bdy_chassis" }], "referenced_by");
    expect(body.refs?.every((ref) => ref.startsWith("/mechanical/joints/"))).toBe(true);
    refuse(state, [{ k: "mech.remove", collection: "joints", id: "jnt_none" }], "missing_target");
  });

  it("removes a joint and a mount freely", () => {
    const state = deepFreeze(robot());
    roundTrip(state, [{ k: "mech.remove", collection: "joints", id: "jnt_caster" }]);
    roundTrip(state, [{ k: "mech.remove", collection: "mounts", id: "mnt_bat" }]);
  });
});

describe("param.set and param.remove", () => {
  it("adds, replaces and removes a parameter", () => {
    const state = deepFreeze(lesson());
    const extra = { id: "par_extra", name: "extra", kind: "toggle", value: true } as const;
    expect(roundTrip(state, [{ k: "param.set", parameter: extra }])).toEqual([{ k: "param.remove", id: "par_extra" }]);
    const logic = state.parameters[1];
    const replace: Op = { k: "param.set", parameter: { ...logic, value: "toggle" } };
    expect(roundTrip(state, [replace])).toEqual([{ k: "param.set", parameter: logic }]);
    const added = deepFreeze(accept(state, [{ k: "param.set", parameter: extra }]).state);
    expect(roundTrip(added, [{ k: "param.remove", id: "par_extra" }])).toEqual([{ k: "param.set", parameter: extra }]);
  });

  it("refuses to remove a parameter a component binds, and lists the component", () => {
    const state = deepFreeze(lesson());
    const out = refuse(state, [{ k: "param.remove", id: "par_color" }], "referenced_by");
    expect(out.refs).toEqual(["/components/2/params/color"]);
    refuse(state, [{ k: "param.remove", id: "par_none" }], "missing_target");
  });

  it("refuses to remove a parameter another parameter keeps apart from", () => {
    const base = lesson();
    base.parameters.push(
      { id: "par_hi", name: "hi", kind: "number", value: 10 },
      { id: "par_lo", name: "lo", kind: "number", value: 1, keepApart: { param: "par_hi", op: "<", gap: 2 } },
    );
    const out = refuse(deepFreeze(base), [{ k: "param.remove", id: "par_hi" }], "referenced_by");
    expect(out.refs).toEqual(["/parameters/3/keepApart"]);
  });

  it("refuses a 257th parameter", () => {
    const full = lesson();
    full.parameters = Array.from({ length: 256 }, (_, i) => ({
      id: `par_p${i}`,
      name: `p${i}`,
      kind: "toggle",
      value: true,
    }));
    refuse(
      deepFreeze(full),
      [{ k: "param.set", parameter: { id: "par_new", name: "n", kind: "toggle", value: true } }],
      "quota",
    );
  });
});

describe("test.set and test.remove", () => {
  it("replaces the whole case and undoes with the old one", () => {
    const state = deepFreeze(blink());
    const old = state.tests[0];
    const next: TestCase = { ...old, name: "Renamed", checks: [old.checks[0]] };
    const out = accept(state, [{ k: "test.set", test: next }]);
    expect(out.state.tests[0].checks).toHaveLength(1);
    expect(out.inverse).toEqual([{ k: "test.set", test: old }]);
    roundTrip(state, [{ k: "test.set", test: next }]);
  });

  it("adds a case and removes it", () => {
    const state = deepFreeze(blink());
    const added: TestCase = { ...state.tests[0], id: "second" };
    expect(roundTrip(state, [{ k: "test.set", test: added }])).toEqual([{ k: "test.remove", id: "second" }]);
    const both = deepFreeze(accept(state, [{ k: "test.set", test: added }]).state);
    expect(roundTrip(both, [{ k: "test.remove", id: "second" }])).toEqual([{ k: "test.set", test: added }]);
  });

  it("refuses a repeated check id, a 65th test and a missing test", () => {
    const state = deepFreeze(blink());
    const twice: TestCase = { ...state.tests[0], checks: [state.tests[0].checks[0], state.tests[0].checks[0]] };
    refuse(state, [{ k: "test.set", test: twice }], "duplicate_id");
    const full = blink();
    full.tests = Array.from({ length: LIMITS.tests }, (_, i) => ({ ...full.tests[0], id: `t${i}` }));
    refuse(deepFreeze(full), [{ k: "test.set", test: { ...full.tests[0], id: "extra" } }], "quota");
    refuse(state, [{ k: "test.remove", id: "none" }], "missing_target");
  });
});

describe("asset.add and asset.remove", () => {
  const sha = "a".repeat(64);
  const picture: Asset = {
    id: "ast_pic",
    path: "img/pic.png",
    mediaType: "image/png",
    bytes: 120,
    sha256: sha,
    role: "image",
  };

  it("adds an asset in order and removes it", () => {
    const state = deepFreeze(blink());
    expect(roundTrip(state, [{ k: "asset.add", asset: picture }])).toEqual([{ k: "asset.remove", id: "ast_pic" }]);
    const held = deepFreeze(accept(state, [{ k: "asset.add", asset: picture }]).state);
    expect(roundTrip(held, [{ k: "asset.remove", id: "ast_pic" }])).toEqual([{ k: "asset.add", asset: picture }]);
  });

  it("refuses an id in use, a path in use ignoring case, a bad path, a 257th asset and a huge asset (the schema caps the size)", () => {
    const held = deepFreeze(accept(blink(), [{ k: "asset.add", asset: picture }]).state);
    refuse(held, [{ k: "asset.add", asset: { ...picture, path: "other.png" } }], "duplicate_id");
    refuse(held, [{ k: "asset.add", asset: { ...picture, id: "ast_two", path: "IMG/PIC.PNG" } }], "duplicate_id");
    refuse(held, [{ k: "asset.add", asset: { ...picture, id: "ast_two", path: "com1.png" } }], "malformed");
    refuse(held, [{ k: "asset.add", asset: { ...picture, id: "ast_two", bytes: LIMITS.assetBytes + 1 } }], "malformed");
    const full = blink();
    full.assets = Array.from({ length: LIMITS.assets }, (_, i) => ({ ...picture, id: `ast_a${i}`, path: `a${i}.png` }));
    refuse(deepFreeze(full), [{ k: "asset.add", asset: picture }], "quota");
  });

  it("refuses to remove the thumbnail or a mesh, and a missing asset", () => {
    const base = robot();
    base.assets = [
      picture,
      { ...picture, id: "ast_mesh", path: "arm.glb", mediaType: "model/gltf-binary", role: "model" },
    ];
    base.meta.thumbnail = "ast_pic";
    (base.mechanical?.bodies[0] as Body).shape = { kind: "mesh", asset: "ast_mesh" };
    const state = deepFreeze(base);
    expect(refuse(state, [{ k: "asset.remove", id: "ast_pic" }], "referenced_by").refs).toEqual(["/meta/thumbnail"]);
    expect(refuse(state, [{ k: "asset.remove", id: "ast_mesh" }], "referenced_by").refs).toEqual([
      "/mechanical/bodies/0/shape",
    ]);
    refuse(state, [{ k: "asset.remove", id: "ast_none" }], "missing_target");
  });
});

describe("dep.set and dep.remove", () => {
  it("adds a version next to the old one and removes it again", () => {
    const state = deepFreeze(blink());
    const led = state.dependencies.components.find(
      (d) => d.ref === "core.led-5mm",
    ) as Project["dependencies"]["components"][number];
    const newer = { ...led, version: "1.1.0" };
    const out = accept(state, [{ k: "dep.set", dependency: newer }]);
    expect(out.state.dependencies.components.map((d) => `${d.ref}@${d.version}`)).toEqual(
      expect.arrayContaining(["core.led-5mm@1.0.0", "core.led-5mm@1.1.0"]),
    );
    expect(out.inverse).toEqual([{ k: "dep.remove", ref: "core.led-5mm", version: "1.1.0" }]);
    roundTrip(state, [{ k: "dep.set", dependency: newer }]);
    const held = deepFreeze(out.state);
    expect(roundTrip(held, [{ k: "dep.remove", ref: "core.led-5mm", version: "1.1.0" }])).toEqual([
      { k: "dep.set", dependency: newer },
    ]);
  });

  it("replaces a dependency with the same ref and version and undoes with the old one", () => {
    const state = deepFreeze(blink());
    const led = state.dependencies.components.find(
      (d) => d.ref === "core.led-5mm",
    ) as Project["dependencies"]["components"][number];
    const out = accept(state, [
      { k: "dep.set", dependency: { ...led, origin: "library", digest: `sha256:${"b".repeat(64)}` } },
    ]);
    expect(out.inverse).toEqual([{ k: "dep.set", dependency: led }]);
  });

  it("refuses to remove a version an instance uses, and a missing one", () => {
    const state = deepFreeze(blink());
    const out = refuse(state, [{ k: "dep.remove", ref: "core.led-5mm", version: "1.0.0" }], "referenced_by");
    expect(out.refs).toEqual(["/components/1"]);
    refuse(state, [{ k: "dep.remove", ref: "core.led-5mm", version: "9.9.9" }], "missing_target");
  });
});

describe("guide.set, license.set", () => {
  it("replaces the guide and undoes with the old one", () => {
    const state = deepFreeze(lesson());
    const guide = { ...(state.guide as NonNullable<Project["guide"]>), title: "New title" };
    expect(roundTrip(state, [{ k: "guide.set", guide }])).toEqual([{ k: "guide.set", guide: state.guide }]);
  });

  it("adds a guide to a project that had none, with nothing to undo it", () => {
    const state = deepFreeze(blink());
    const out = accept(state, [{ k: "guide.set", guide: { kind: "lesson", title: "Blink" } }]);
    expect(out.state.guide).toEqual({ kind: "lesson", title: "Blink" });
    expect(out.inverse).toEqual([]);
  });

  it("replaces the licence", () => {
    const state = deepFreeze(blink());
    const op: Op = { k: "license.set", license: { spdx: "MIT", holder: "Amar" } };
    expect(roundTrip(state, [op])).toEqual([{ k: "license.set", license: state.license }]);
  });
});

describe("provenance.set", () => {
  it("clears a third-party review and puts it back", () => {
    const state = deepFreeze(lesson());
    const item = (state.provenance.thirdParty ?? [])[0];
    const op: Op = { k: "provenance.set", thirdParty: [{ ...item, review: "cleared" }] };
    expect(accept(state, [op]).state.provenance.thirdParty?.[0].review).toBe("cleared");
    expect(roundTrip(state, [op])).toEqual([{ k: "provenance.set", thirdParty: [item] }]);
  });

  it("adds and removes entries, and drops a list that empties", () => {
    const state = deepFreeze(blink());
    const add: Op = {
      k: "provenance.set",
      thirdParty: [{ id: "tp2", kind: "image", what: "A photo", source: { title: "A site" }, review: "unchecked" }],
      contributors: [{ actor: "usr_amar", role: "editor" }],
    };
    expect(roundTrip(state, [add])).toEqual([
      { k: "provenance.set", remove: { thirdParty: ["tp2"], contributors: ["usr_amar"] } },
    ]);
    const held = deepFreeze(accept(state, [add]).state);
    const drop: Op = { k: "provenance.set", remove: { thirdParty: ["tp2"], contributors: ["usr_amar"] } };
    const out = accept(held, [drop]);
    expect("thirdParty" in out.state.provenance).toBe(false);
    expect("contributors" in out.state.provenance).toBe(false);
    roundTrip(held, [drop]);
  });

  it("refuses removing what is not there, setting and removing one id, and too many entries", () => {
    const state = deepFreeze(lesson());
    refuse(state, [{ k: "provenance.set", remove: { thirdParty: ["tp_none"] } }], "missing_target");
    refuse(state, [{ k: "provenance.set", remove: { contributors: ["usr_none"] } }], "missing_target");
    const item = (state.provenance.thirdParty ?? [])[0];
    refuse(state, [{ k: "provenance.set", thirdParty: [item], remove: { thirdParty: ["tp1"] } }], "malformed");
    const many = Array.from({ length: 200 }, (_, i) => ({ ...item, id: `x${i}` }));
    refuse(state, [{ k: "provenance.set", thirdParty: many }], "quota");
  });
});

describe("domain.set and domain.patch", () => {
  const importer = ctxFor({ actor: "usr_amar", kind: "import" });

  it("replaces a domain for an import or the system and undoes with the old value", () => {
    const state = deepFreeze(robot());
    const value = { ...state.domains?.robotics, schemaVersion: "1.0" } as NonNullable<Project["domains"]>["robotics"];
    const op: Op = { k: "domain.set", domain: "robotics", value: value as object };
    expect(roundTrip(state, [op], importer)).toEqual([
      { k: "domain.set", domain: "robotics", value: state.domains?.robotics },
    ]);
    roundTrip(state, [op], ctxFor({ actor: "usr_amar", kind: "system" }));
  });

  it("refuses domain.set from an editor or an AI", () => {
    const state = deepFreeze(robot());
    const op: Op = { k: "domain.set", domain: "robotics", value: state.domains?.robotics as object };
    refuse(state, [op], "permission");
    refuse(state, [op], "permission", ctxFor({ actor: "usr_amar", kind: "ai" }));
  });

  it("refuses a domain value the schema forbids", () => {
    refuse(
      deepFreeze(robot()),
      [{ k: "domain.set", domain: "robotics", value: { schemaVersion: "1.0" } }],
      "malformed",
      importer,
    );
  });

  it("merges a patch into the data, removes a key with null and undoes both", () => {
    const state = deepFreeze(robot());
    const patch = { arena: { start: { yaw_deg: 45 } }, wheels: { jnt_wheel_l: { crr: 0.02 }, jnt_wheel_r: null } };
    const out = accept(state, [{ k: "domain.patch", domain: "robotics", patch }]);
    const data = out.state.domains?.robotics?.data as {
      arena: { start: { x_mm: number; yaw_deg: number } };
      wheels: Record<string, { crr: number; radius_mm: number }>;
    };
    expect(data.arena.start).toEqual({ x_mm: 700, y_mm: 0, yaw_deg: 45 });
    expect(Object.keys(data.wheels)).toEqual(["jnt_wheel_l"]);
    expect(data.wheels.jnt_wheel_l).toMatchObject({ crr: 0.02, radius_mm: 32.5 });
    expect(out.state.domains?.robotics?.schemaVersion).toBe("1.0");
    for (const op of out.inverse) expect(validateOp(op)).toBe(true);
    roundTrip(state, [{ k: "domain.patch", domain: "robotics", patch }]);
  });

  it("refuses a patch that breaks the schema and a domain that is not there", () => {
    const state = deepFreeze(robot());
    refuse(state, [{ k: "domain.patch", domain: "robotics", patch: { arena: null } }], "malformed");
    refuse(state, [{ k: "domain.patch", domain: "drone", patch: { battery: "cmp_bat" } }], "missing_target");
  });
});
