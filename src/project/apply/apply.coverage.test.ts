// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Op } from "../generated/types.ts";
import { IMPLEMENTED_KINDS } from "./index.ts";

const SCHEMA = new URL("../../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/project.schema.json", import.meta.url);

/** The test file that covers each kind. Adding an op to the schema fails this file until the kind is added here. */
const COVERED: Record<Op["k"], string> = {
  "meta.set": "apply.doc.test.ts",
  "access.grant": "apply.doc.test.ts",
  "access.revoke": "apply.doc.test.ts",
  "access.set": "apply.doc.test.ts",
  "actor.set": "apply.doc.test.ts",
  "actor.remove": "apply.doc.test.ts",
  "board.add": "apply.board.test.ts",
  "board.remove": "apply.board.test.ts",
  "board.set": "apply.board.test.ts",
  "component.add": "apply.component.test.ts",
  "component.remove": "apply.component.test.ts",
  "component.set": "apply.component.test.ts",
  "component.swap": "apply.component.test.ts",
  "net.create": "apply.net.test.ts",
  "net.connect": "apply.net.test.ts",
  "net.disconnect": "apply.net.test.ts",
  "net.merge": "apply.net.test.ts",
  "net.split": "apply.net.test.ts",
  "net.rename": "apply.net.test.ts",
  "net.delete": "apply.net.test.ts",
  "view.add": "apply.view.test.ts",
  "view.remove": "apply.view.test.ts",
  "view.set": "apply.view.test.ts",
  "view.place": "apply.view.test.ts",
  "view.unplace": "apply.view.test.ts",
  "group.set": "apply.view.test.ts",
  "group.remove": "apply.view.test.ts",
  "wire.add": "apply.wire.test.ts",
  "wire.route": "apply.wire.test.ts",
  "wire.remove": "apply.wire.test.ts",
  "wire.set": "apply.wire.test.ts",
  "junction.add": "apply.wire.test.ts",
  "junction.remove": "apply.wire.test.ts",
  "label.set": "apply.wire.test.ts",
  "label.remove": "apply.wire.test.ts",
  "source.add": "apply.source.test.ts",
  "source.remove": "apply.source.test.ts",
  "source.rename": "apply.source.test.ts",
  "source.edit": "apply.source.test.ts",
  "sim.set": "apply.sim.test.ts",
  "runtime.set": "apply.sim.test.ts",
  "runtime.remove": "apply.sim.test.ts",
  "input.set": "apply.sim.test.ts",
  "input.remove": "apply.sim.test.ts",
  "script.set": "apply.sim.test.ts",
  "fault.set": "apply.sim.test.ts",
  "fault.remove": "apply.sim.test.ts",
  "instrument.set": "apply.sim.test.ts",
  "instrument.remove": "apply.sim.test.ts",
  "mech.set": "apply.misc.test.ts",
  "mech.remove": "apply.misc.test.ts",
  "param.set": "apply.misc.test.ts",
  "param.remove": "apply.misc.test.ts",
  "test.set": "apply.misc.test.ts",
  "test.remove": "apply.misc.test.ts",
  "asset.add": "apply.misc.test.ts",
  "asset.remove": "apply.misc.test.ts",
  "dep.set": "apply.misc.test.ts",
  "dep.remove": "apply.misc.test.ts",
  "guide.set": "apply.misc.test.ts",
  "provenance.set": "apply.misc.test.ts",
  "license.set": "apply.misc.test.ts",
  "domain.set": "apply.misc.test.ts",
  "domain.patch": "apply.misc.test.ts",
};

interface Branch {
  $ref?: string;
  properties?: { k?: { const?: string } };
}

function schemaKinds(): string[] {
  const schema = JSON.parse(readFileSync(SCHEMA, "utf8")) as { $defs: Record<string, Branch & { oneOf?: Branch[] }> };
  return (schema.$defs.Op.oneOf ?? []).map((branch) => {
    const def = branch.$ref ? schema.$defs[branch.$ref.split("/").pop() as string] : branch;
    return def.properties?.k?.const as string;
  });
}

describe("the op vocabulary", () => {
  const kinds = schemaKinds();

  it("has 64 kinds in the schema, and a handler for each", () => {
    expect(kinds).toHaveLength(64);
    expect([...IMPLEMENTED_KINDS].sort()).toEqual([...kinds].sort());
  });

  it("names a test file for each kind, and that file builds an op of the kind", () => {
    expect(Object.keys(COVERED).sort()).toEqual([...kinds].sort());
    const missing = Object.entries(COVERED).filter(([kind, file]) => {
      const text = readFileSync(new URL(file, import.meta.url), "utf8");
      return !text.includes(`k: "${kind}"`);
    });
    console.info(
      Object.entries(COVERED)
        .map(([kind, file]) => `${kind.padEnd(16)} ${file}`)
        .join("\n"),
    );
    expect(missing).toEqual([]);
  });
});
