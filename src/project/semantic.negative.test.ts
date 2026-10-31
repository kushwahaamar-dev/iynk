// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loadExample } from "./apply/fixtures.testing.ts";
import type { Project } from "./generated/types.ts";
import { withHoles } from "./semantic.testing.ts";
import { validateValue } from "./validate.ts";

const lesson = () => withHoles(loadExample("lesson-uno-r3-button"));

function rejects(doc: Project, code: string, path?: string): void {
  const report = validateValue(doc);
  expect(report.ok).toBe(false);
  const found = report.diagnostics.filter((d) => d.code === code);
  expect(found.length, `no ${code} in ${report.diagnostics.map((d) => d.code).join(", ")}`).toBeGreaterThan(0);
  if (path) expect(found.map((d) => d.path)).toContain(path);
}

describe("the eight V3 variants of the lesson example", () => {
  it("a wire end that is not in the wire's net", () => {
    const doc = lesson();
    doc.views[0]!.wires[0]!.from = { kind: "pin", c: "brd_uno", p: "D3" };
    rejects(doc, "V3-WIRE-END", "/views/0/wires/0/from");
  });

  it("two nets on one strip", () => {
    const doc = lesson();
    doc.views[0]!.placements[3]!.legs!.A = "d10";
    rejects(doc, "V3-STRIP-SHORT", "/views/0");
  });

  it("a pin in two nets", () => {
    const doc = lesson();
    doc.nets[1]!.connections.push({ c: "cmp_btn1", p: "P1" });
    rejects(doc, "V3-PIN-TWICE", "/nets/1/connections/2");
  });

  it("a net that names a pin its part does not have", () => {
    const doc = lesson();
    doc.nets[0]!.connections[1]!.p = "P9";
    rejects(doc, "V3-PIN", "/nets/0/connections/1");
  });

  it("a part whose definition is not in the dependencies", () => {
    const doc = lesson();
    doc.components[1]!.definition.ref = "core.unknown";
    rejects(doc, "V3-DEF", "/components/1/definition");
  });

  it("a check on a pin the board does not have", () => {
    const doc = lesson();
    Object.assign(doc.tests[0]!.checks[1]!, { pin: "D99" });
    rejects(doc, "V3-CHECK-PIN", "/tests/0/checks/1/pin");
  });

  it("two parts with one refdes", () => {
    const doc = lesson();
    doc.components[2]!.refdes = "BTN1";
    rejects(doc, "V3-REFDES", "/components/2/refdes");
  });

  it("a gap in the retained history", () => {
    const doc = loadExample("env-monitor-esp32");
    doc.history.ops[0]!.seq = 150;
    rejects(doc, "V3-HIST-SEQ", "/history/ops/0/seq");
  });
});
