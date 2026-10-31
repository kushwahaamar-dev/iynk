// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Op } from "./generated/types.ts";
import { classifyImpact, classifyOp, type OpImpact } from "./opImpact.ts";

const schemaPath = join(
  process.cwd(),
  "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/project.schema.json",
);
const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as {
  $defs: { Op: { oneOf: { properties: { k: { const: string } } }[] } };
};
const schemaKinds = schema.$defs.Op.oneOf.map(
  (branch) => branch.properties.k.const,
);

const PREDICATE_KINDS = ["board.set", "component.set"];

const EXPECTED: Record<string, OpImpact> = {
  "meta.set": "none",
  "access.grant": "none",
  "access.revoke": "none",
  "access.set": "none",
  "actor.set": "none",
  "actor.remove": "none",
  "board.add": "structural",
  "board.remove": "structural",
  "component.add": "structural",
  "component.remove": "structural",
  "component.swap": "structural",
  "net.create": "structural",
  "net.connect": "structural",
  "net.disconnect": "structural",
  "net.merge": "structural",
  "net.split": "structural",
  "net.rename": "structural",
  "net.delete": "structural",
  "view.add": "none",
  "view.remove": "none",
  "view.set": "none",
  "view.place": "none",
  "view.unplace": "none",
  "wire.add": "none",
  "wire.route": "none",
  "wire.remove": "none",
  "wire.set": "none",
  "group.set": "none",
  "group.remove": "none",
  "junction.add": "none",
  "junction.remove": "none",
  "label.set": "none",
  "label.remove": "none",
  "mech.set": "structural",
  "mech.remove": "structural",
  "source.add": "source",
  "source.remove": "source",
  "source.rename": "source",
  "source.edit": "source",
  "sim.set": "structural",
  "runtime.set": "structural",
  "runtime.remove": "structural",
  "input.set": "param",
  "input.remove": "param",
  "script.set": "structural",
  "fault.set": "param",
  "fault.remove": "param",
  "instrument.set": "structural",
  "instrument.remove": "structural",
  "param.set": "param",
  "param.remove": "param",
  "test.set": "none",
  "test.remove": "none",
  "asset.add": "none",
  "asset.remove": "none",
  "dep.set": "structural",
  "dep.remove": "structural",
  "guide.set": "none",
  "provenance.set": "none",
  "license.set": "none",
  "domain.set": "structural",
  "domain.patch": "structural",
};

const op = (value: object) => value as Op;

describe("op impact table", () => {
  it("has 64 distinct kinds in the schema", () => {
    expect(schemaKinds).toHaveLength(64);
    expect(new Set(schemaKinds).size).toBe(64);
  });

  it("classifies every schema kind and no other", () => {
    expect(new Set([...Object.keys(EXPECTED), ...PREDICATE_KINDS])).toEqual(
      new Set(schemaKinds),
    );
  });

  it.each(Object.entries(EXPECTED))("%s is %s", (k, impact) => {
    expect(classifyOp(op({ k }))).toBe(impact);
  });

  it("classes component.set by the fields it patches", () => {
    expect(
      classifyOp(op({ k: "component.set", id: "c", set: { label: "R1" } })),
    ).toBe("none");
    expect(
      classifyOp(
        op({
          k: "component.set",
          id: "c",
          set: { refdes: "R2", locked: true },
        }),
      ),
    ).toBe("none");
    expect(
      classifyOp(op({ k: "component.set", id: "c", params: { ohms: 220 } })),
    ).toBe("param");
    expect(
      classifyOp(op({ k: "component.set", id: "c", set: { definition: "x" } })),
    ).toBe("structural");
    expect(
      classifyOp(
        op({
          k: "component.set",
          id: "c",
          set: { label: "R1" },
          params: { ohms: 1 },
        }),
      ),
    ).toBe("param");
  });

  it("classes board.set by the fields it patches", () => {
    expect(
      classifyOp(op({ k: "board.set", id: "b", firmware: { source: "main" } })),
    ).toBe("source");
    expect(
      classifyOp(op({ k: "board.set", id: "b", params: { clock: 1 } })),
    ).toBe("param");
    expect(
      classifyOp(op({ k: "board.set", id: "b", set: { locked: true } })),
    ).toBe("none");
    expect(
      classifyOp(op({ k: "board.set", id: "b", set: { variant: "nano" } })),
    ).toBe("structural");
  });

  it("takes the highest class of a batch", () => {
    expect(classifyImpact([])).toBe("none");
    expect(
      classifyImpact([op({ k: "view.place" }), op({ k: "param.set" })]),
    ).toBe("param");
    expect(
      classifyImpact([op({ k: "param.set" }), op({ k: "source.edit" })]),
    ).toBe("source");
    expect(
      classifyImpact([
        op({ k: "wire.add" }),
        op({ k: "net.merge" }),
        op({ k: "source.edit" }),
      ]),
    ).toBe("structural");
  });

  it("treats an unknown kind as structural", () => {
    expect(classifyOp(op({ k: "future.thing" }))).toBe("structural");
  });
});
