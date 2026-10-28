// @vitest-environment node
import { describe, expect, it } from "vitest";
import { rng } from "../core/prng.ts";
import type { Diagnostic } from "../core/result.ts";
import { loadExample } from "./apply/fixtures.testing.ts";
import type { ExampleName } from "./apply/fixtures.testing.ts";
import type { Project } from "./generated/types.ts";
import { RULES, checkAll } from "./semantic.ts";
import { withHoles } from "./semantic.testing.ts";
import { validateValue } from "./validate.ts";

const EXAMPLES: ExampleName[] = ["drone-quad", "env-monitor-esp32", "lesson-uno-r3-button", "robot-line-follower", "uno-blink-d12"];

interface Case {
  rule: string;
  example?: ExampleName;
  holes?: boolean;
  /** The pointer the diagnostic must have, when the case is about one place. */
  path?: string;
  mutate: (doc: Project) => void;
}

const lessonNet = (doc: Project, id: string) => doc.nets.find((n) => n.id === id)!;
const bb = (doc: Project) => doc.views[0]!;

const CASES: Case[] = [
  { rule: "ID-DUP", path: "/components/1/id", mutate: (d) => { d.components[1]!.id = d.components[0]!.id; } },
  { rule: "ACTOR", path: "/access/owners/0", mutate: (d) => { d.access.owners = ["usr_nobody"]; } },
  { rule: "ACTOR", path: "/provenance/createdBy", mutate: (d) => { d.provenance.createdBy = "usr_nobody"; } },
  { rule: "DEF", path: "/components/0/definition", mutate: (d) => { d.components[0]!.definition.version = "9.9.9"; } },
  { rule: "DEP-DUP", mutate: (d) => { d.dependencies.components.push({ ...d.dependencies.components[0]! }); } },
  { rule: "DEP-UNUSED", mutate: (d) => { d.dependencies.components.push({ ...d.dependencies.components[0]!, ref: "core.unused" }); } },
  { rule: "REFDES", path: "/components/1/refdes", mutate: (d) => { d.components[1]!.refdes = d.components[0]!.refdes; } },
  { rule: "PARAM", path: "/components/3/params/bogus", mutate: (d) => { d.components[3]!.params = { ohms: 100, bogus: 1 }; } },
  { rule: "PARAM-REF", path: "/components/2/params/color", mutate: (d) => { d.components[2]!.params = { color: { param: "par_nope" } }; } },
  {
    rule: "PARAM-RANGE",
    path: "/components/3/params/ohms",
    mutate: (d) => {
      const resistor = d.dependencies.components.find((c) => c.ref === "core.resistor")!;
      resistor.interface.params[0]!.min = 1;
      resistor.interface.params[0]!.max = 5;
    },
  },
  {
    rule: "PARAM-RANGE",
    path: "/parameters/2/value",
    mutate: (d) => { d.parameters.push({ id: "par_gain", name: "gain", kind: "number", value: 3, min: 0, max: 10, step: 2 }); },
  },
  { rule: "PIN", path: "/nets/0/connections/0", mutate: (d) => { lessonNet(d, "net_5v").connections[0].p = "NOPE"; } },
  { rule: "PIN-TWICE", path: "/nets/1/connections/2", mutate: (d) => { lessonNet(d, "net_d13").connections.push({ c: "cmp_btn1", p: "P1" }); } },
  { rule: "NET-NAME", path: "/nets/1/name", mutate: (d) => { d.nets[1]!.name = d.nets[0]!.name; } },
  { rule: "PLACE", path: "/views/0/placements/5", mutate: (d) => { bb(d).placements[5]!.c = "cmp_ghost"; } },
  { rule: "LEGS", path: "/views/0/placements/2/legs", mutate: (d) => { bb(d).kind = "schematic"; } },
  { rule: "LEG", path: "/views/0/placements/2/legs/P9", mutate: (d) => { bb(d).placements[2]!.legs!.P9 = "e9"; } },
  { rule: "HOLE", holes: true, path: "/views/0/placements/2/legs/P1", mutate: (d) => { bb(d).placements[2]!.legs!.P1 = "z99"; } },
  { rule: "HOLE-TWICE", holes: true, path: "/views/0/placements/4/legs/P1", mutate: (d) => { bb(d).placements[4]!.legs!.P1 = "e8"; } },
  { rule: "GROUP", path: "/views/0/groups/0/members/1", mutate: (d) => { bb(d).groups = [{ id: "grp_a", members: ["cmp_led1", "cmp_ghost"] }]; } },
  {
    rule: "GROUP",
    path: "/views/0/groups/1/members/0",
    mutate: (d) => {
      bb(d).groups = [{ id: "grp_a", members: ["cmp_led1", "cmp_res1"] }, { id: "grp_b", members: ["cmp_led1", "cmp_res2"] }];
    },
  },
  { rule: "VIEW-BOARD", path: "/views/0/surface", mutate: (d) => { bb(d).kind = "schematic"; } },
  { rule: "VIEW-BOARD", path: "/views/0/placements", mutate: (d) => { bb(d).kind = "board"; delete bb(d).surface; } },
  { rule: "ROT", path: "/views/0/placements/0/rotation_deg", mutate: (d) => { bb(d).placements[0]!.rotation_deg = 45; } },
  {
    rule: "FAULT-SHAPE",
    path: "/simulation/faults/0/cause_id",
    mutate: (d) => {
      d.simulation.faults.push({ id: "flt_x", cause_id: "Bad Cause", symptom_ids: [], kind: "short", target: {}, enabled: true });
    },
  },
  { rule: "WIRE-NET", path: "/views/0/wires/0", mutate: (d) => { bb(d).wires[0]!.net = "net_ghost"; } },
  { rule: "WIRE-END", path: "/views/0/wires/0/from", mutate: (d) => { bb(d).wires[0]!.from = { kind: "pin", c: "brd_uno", p: "D3" }; } },
  { rule: "WIRE-JCT", path: "/views/0/wires/0/to", mutate: (d) => { bb(d).wires[0]!.to = { kind: "junction", id: "jct_x" }; } },
  { rule: "WIRE-SURFACE", path: "/views/0/wires/0/to", mutate: (d) => { bb(d).wires[0]!.to = { kind: "hole", surface: "cmp_res1", hole: "a8" }; } },
  { rule: "WIRE-SELF", path: "/views/0/wires/0", mutate: (d) => { bb(d).wires[0]!.to = bb(d).wires[0]!.from; } },
  { rule: "STRIP-SHORT", holes: true, path: "/views/0", mutate: (d) => { bb(d).placements[3]!.legs!.A = "d10"; } },
  { rule: "STRIP-IMPLIED", holes: true, path: "/views/0", mutate: (d) => { bb(d).placements[2]!.legs!.P2 = "d8"; } },
  { rule: "PATH", path: "/sources/0/path", mutate: (d) => { d.sources[0]!.path = "nul.txt"; } },
  { rule: "PATH", path: "/sources/1/path", mutate: (d) => { d.sources.push({ ...d.sources[0]!, id: "src_b", path: "SKETCH.ino" }); } },
  { rule: "PATH", path: "/sources/0/path", mutate: (d) => { d.sources[0]!.path = "src\\main.ino"; } },
  { rule: "SRC-BOARD", path: "/sources/0/board", mutate: (d) => { d.sources[0]!.board = "brd_ghost"; } },
  { rule: "FW", path: "/boards/0/firmware/entry", mutate: (d) => { d.boards[0]!.firmware!.entry = "src_ghost"; } },
  { rule: "RT", path: "/simulation/runtimes/0/board", mutate: (d) => { d.simulation.runtimes[0]!.board = "brd_ghost"; } },
  { rule: "INPUT-DUP", mutate: (d) => { d.simulation.world.inputs.push({ ...d.simulation.world.inputs[0]! }); } },
  { rule: "INPUT", path: "/simulation/world/inputs/0/component", mutate: (d) => { d.simulation.world.inputs[0]!.component = "cmp_ghost"; } },
  { rule: "INPUT-PIN", path: "/simulation/world/inputs/0/pins/0", mutate: (d) => { d.simulation.world.inputs[0]!.pins = [{ c: "brd_uno", p: "NOPE" }]; } },
  { rule: "SCRIPT", path: "/simulation/world/script/0/input", mutate: (d) => { d.simulation.world.script[0]!.input = "ghost"; } },
  {
    rule: "FAULT",
    path: "/simulation/faults/0/target/component",
    mutate: (d) => {
      d.simulation.faults.push({ id: "flt_x", cause_id: "open.wire", symptom_ids: [], kind: "open-wire", target: { component: "cmp_ghost" }, enabled: true });
    },
  },
  { rule: "CHECK-DUP", mutate: (d) => { d.tests[0]!.checks.push({ ...d.tests[0]!.checks[0]! }); } },
  { rule: "CHECK-PIN", path: "/tests/0/checks/1/pin", mutate: (d) => { Object.assign(d.tests[0]!.checks[1]!, { pin: "D99" }); } },
  {
    rule: "CHECK-NET",
    mutate: (d) => {
      d.tests[0]!.checks.push({ kind: "node-voltage", id: "c9", label: "x", net: "net_ghost", volts: [0, 1], atMs: 1 });
    },
  },
  { rule: "CHECK-SRC", mutate: (d) => { Object.assign(d.tests[0]!.checks[3]!, { source: "src_ghost" }); } },
  { rule: "CHECK-INPUT", path: "/tests/0/checks/0/after/input", mutate: (d) => { Object.assign(d.tests[0]!.checks[0]!, { after: { input: "ghost", t: 1, value: 1 } }); } },
  { rule: "GUIDE", path: "/guide/starter/source", mutate: (d) => { d.guide!.starter!.source = "src_ghost"; } },
  { rule: "TOKEN", path: "/meta/title", mutate: (d) => { d.meta.title += " {{p:title}}"; } },
  { rule: "FRAME", example: "robot-line-follower", path: "/mechanical/frames/0/parent", mutate: (d) => { d.mechanical!.frames[0]!.parent = "frm_ghost"; } },
  {
    rule: "FRAME-CYCLE",
    example: "robot-line-follower",
    mutate: (d) => {
      d.mechanical!.frames[2]!.parent = "frm_caster";
    },
  },
  { rule: "BODY", example: "robot-line-follower", path: "/mechanical/bodies/0/frame", mutate: (d) => { d.mechanical!.bodies[0]!.frame = "frm_ghost"; } },
  { rule: "BODY", example: "robot-line-follower", path: "/mechanical/joints/1/drive/component", mutate: (d) => { d.mechanical!.joints[1]!.drive!.component = "cmp_ghost"; } },
  { rule: "MOUNT", example: "robot-line-follower", path: "/mechanical/mounts/0/frame", mutate: (d) => { d.mechanical!.mounts[0]!.frame = "frm_ghost"; } },
  { rule: "LIMITS", example: "robot-line-follower", path: "/mechanical/joints/0/limits", mutate: (d) => { d.mechanical!.joints[0]!.limits = { effort: 1, effort_n: 1 }; } },
  { rule: "HIST-SEQ", example: "env-monitor-esp32", path: "/history/ops/1/seq", mutate: (d) => { d.history.ops[1]!.seq = 99; } },
  { rule: "HIST-HEAD", example: "env-monitor-esp32", path: "/history", mutate: (d) => { d.revision += 1; } },
  {
    rule: "HIST-CP",
    example: "env-monitor-esp32",
    path: "/history/checkpoints/1",
    mutate: (d) => {
      d.history.checkpoints.push({ revision: 500, kind: "auto", at: d.meta.updatedAt, author: d.access.owners[0], stateHash: "0".repeat(64), store: "local-db" });
    },
  },
];

const load = (c: Case): Project => {
  const doc = loadExample(c.example ?? "lesson-uno-r3-button");
  if (c.holes) withHoles(doc);
  return doc;
};

describe("the rule table", () => {
  it("lists every rule of PDM 9.2 once, with a negative case for each", () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(CASES.map((c) => `V3-${c.rule}`))).toEqual(new Set(ids));
  });

  it("marks the batch rules the card names and leaves the whole-document rules out", () => {
    const batch = (id: string) => RULES.find((r) => r.id === id)!.batch;
    for (const id of ["V3-ID-DUP", "V3-PIN-TWICE", "V3-WIRE-END", "V3-STRIP-SHORT", "V3-FW", "V3-CHECK-PIN", "V3-FRAME-CYCLE"]) {
      expect(batch(id), id).toBe(true);
    }
    for (const id of ["V3-HIST-SEQ", "V3-HIST-HEAD", "V3-HIST-CP", "V3-TOKEN", "V3-ROT", "V3-DEP-UNUSED", "V3-STRIP-IMPLIED"]) {
      expect(batch(id), id).toBe(false);
    }
  });

  it("marks the rules the prototype did not have", () => {
    const fresh = RULES.filter((r) => !r.proto).map((r) => r.id);
    expect(fresh.sort()).toEqual(["V3-FAULT-SHAPE", "V3-GROUP", "V3-PARAM-RANGE", "V3-ROT", "V3-VIEW-BOARD", "V3-WIRE-SELF"]);
  });
});

describe("checkAll", () => {
  it.each(EXAMPLES)("finds nothing in %s", (name) => {
    expect(checkAll(loadExample(name))).toEqual([]);
  });

  it("finds nothing in the lesson once its breadboard has real holes and strips", () => {
    expect(checkAll(withHoles(loadExample("lesson-uno-r3-button")))).toEqual([]);
    expect(checkAll(withHoles(loadExample("uno-blink-d12")))).toEqual([]);
  });

  it.each(CASES.map((c, i) => [`${c.rule} #${i}`, c] as const))("%s", (_name, c) => {
    const doc = load(c);
    expect(checkAll(doc).filter((d) => d.code === `V3-${c.rule}`)).toEqual([]);
    c.mutate(doc);
    const found = checkAll(doc).filter((d) => d.code === `V3-${c.rule}`);
    expect(found.length, `no V3-${c.rule}`).toBeGreaterThan(0);
    if (c.path) expect(found.map((d) => d.path)).toContain(c.path);
    const rule = RULES.find((r) => r.id === `V3-${c.rule}`)!;
    expect(new Set(found.map((d: Diagnostic) => d.severity))).toEqual(new Set([rule.severity]));
  });

  it("reports both sides of a duplicate, so either one can be fixed", () => {
    const doc = loadExample("lesson-uno-r3-button");
    doc.components[1]!.refdes = doc.components[0]!.refdes;
    expect(checkAll(doc).map((d) => d.path)).toEqual(["/components/0/refdes", "/components/1/refdes"]);
  });

  it("keeps going on a document that is not shaped like a project", () => {
    expect(checkAll(null as never)).toEqual([]);
    expect(checkAll([] as never)).toEqual([]);
    expect(checkAll({} as never)).toEqual(expect.any(Array));
    const doc = loadExample("lesson-uno-r3-button");
    (doc as unknown as Record<string, unknown>).nets = "none";
    (doc.views[0] as unknown as Record<string, unknown>).wires = [null, 7, { net: 3, from: [], to: "x" }];
    expect(() => checkAll(doc)).not.toThrow();
  });
});

describe("corrupted documents", () => {
  const JUNK: unknown[] = [null, 0, -1, "x", "", true, [], {}, [null], { a: 1 }];

  /** Every object and array in the document with its keys, so a corruption can land anywhere. */
  function containers(root: unknown): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const stack = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (typeof node !== "object" || node === null) continue;
      found.push(node as Record<string, unknown>);
      stack.push(...Object.values(node));
    }
    return found;
  }

  it("is never thrown at: 300 documents with one or two fields replaced by junk", () => {
    for (let seed = 0; seed < 300; seed++) {
      const r = rng(seed, "semantic.corrupt");
      const doc = withHoles(loadExample(EXAMPLES[r.next() % EXAMPLES.length]!));
      for (let hits = 0; hits < 1 + (r.next() % 2); hits++) {
        const all = containers(doc);
        const target = all[r.next() % all.length]!;
        const keys = Object.keys(target);
        if (keys.length === 0) continue;
        const key = keys[r.next() % keys.length]!;
        const junk = JUNK[r.next() % JUNK.length];
        if (r.next() % 4 === 0) delete target[key];
        else target[key] = structuredClone(junk);
      }
      expect(() => validateValue(doc), `seed ${seed}`).not.toThrow();
    }
  });
});
