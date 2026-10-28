// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loadExample } from "./apply/fixtures.testing.ts";
import type { ExampleName } from "./apply/fixtures.testing.ts";
import { toFileText } from "./normalize.ts";
import { validateText, validateValue } from "./validate.ts";

const EXAMPLES: ExampleName[] = ["drone-quad", "env-monitor-esp32", "lesson-uno-r3-button", "robot-line-follower", "uno-blink-d12"];

describe("validateValue with V3", () => {
  it.each(EXAMPLES)("%s has no errors and no warnings", (name) => {
    const report = validateValue(loadExample(name));
    expect(report.errors).toBe(0);
    expect(report.diagnostics.filter((d) => d.code.startsWith("V3-"))).toEqual([]);
  });

  it("names the wire whose net does not exist, and the file is not ok", () => {
    const doc = loadExample("lesson-uno-r3-button");
    doc.views[0]!.wires[0]!.net = "net_ghost";
    const report = validateText(toFileText(doc));
    expect(report.ok).toBe(false);
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "V3-WIRE-NET", severity: "error", path: "/views/0/wires/0" }));
    expect(report.first20[0]!.code).toBe("V3-WIRE-NET");
  });

  it("still runs on a document that failed the schema", () => {
    const doc = loadExample("lesson-uno-r3-button");
    doc.components[0]!.id = "CMP Bad" as never;
    doc.nets[0]!.connections[0]!.p = "NOPE";
    const codes = validateValue(doc).diagnostics.map((d) => d.code);
    expect(codes).toContain("V2-pattern");
    expect(codes).toContain("V3-PIN");
  });

  it("a warning does not make the document fatal", () => {
    const doc = loadExample("lesson-uno-r3-button");
    doc.views[0]!.placements[0]!.rotation_deg = 45;
    const report = validateValue(doc);
    expect(report.ok).toBe(true);
    expect(report.warnings).toBe(1);
  });
});
