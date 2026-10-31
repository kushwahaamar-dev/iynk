// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Project } from "./generated/types.ts";
import { validateText, validateValue } from "./validate.ts";

const dir = join(process.cwd(), "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples");
const lesson = () => JSON.parse(readFileSync(join(dir, "lesson-uno-r3-button.project.json"), "utf8")) as Project;

describe("broken variants of the lesson example", () => {
  it("V2 rejects an id that breaks the pattern", () => {
    const doc = lesson();
    doc.components[0].id = "CMP Bad" as never;
    const report = validateValue(doc);
    expect(report.ok).toBe(false);
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "V2-pattern", path: "/components/0/id" }));
  });

  it("V2 rejects a negative simulation duration", () => {
    const doc = lesson();
    doc.simulation.duration_ms = -5;
    const report = validateValue(doc);
    expect(report.ok).toBe(false);
    expect(report.diagnostics.map((d) => d.code)).toContain("V2-exclusiveMinimum");
    expect(report.diagnostics.find((d) => d.code === "V2-exclusiveMinimum")?.path).toBe("/simulation/duration_ms");
  });

  it("V2 rejects a source path that climbs out of the project", () => {
    const doc = lesson();
    doc.sources[0].path = "../../etc/passwd";
    const report = validateValue(doc);
    expect(report.ok).toBe(false);
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "V2-pattern", path: "/sources/0/path" }));
  });

  it("V5 rejects __proto__ inside ext, with the path", () => {
    const text = JSON.stringify({ ...lesson(), ext: { a: { b: 1 } } }).replace('{"b":1}', '{"__proto__":{"x":1}}');
    const report = validateText(text);
    expect(report.ok).toBe(false);
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "V5-KEY", path: "/ext/a/__proto__" }));
  });
});
