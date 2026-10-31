// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Project } from "./generated/types.ts";
import { toFileText } from "./normalize.ts";
import { isFatal, schemaDiagnostics, validateText, validateValue } from "./validate.ts";

const dir = join(process.cwd(), "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples");
const NAMES = ["uno-blink-d12", "env-monitor-esp32", "lesson-uno-r3-button", "robot-line-follower", "drone-quad"];
const load = (name: string) => JSON.parse(readFileSync(join(dir, name + ".project.json"), "utf8")) as Project;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

describe("the five examples", () => {
  it.each(NAMES)("%s has no error from V0, V2, V4 or V5", (name) => {
    const report = validateValue(load(name));
    expect(report.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.doc).toBeDefined();
  });

  it.each(NAMES)("%s written by the writer has no V1 warning", (name) => {
    const report = validateText(toFileText(load(name)));
    expect(report.diagnostics).toEqual([]);
  });
});

describe("validateText", () => {
  const clean = toFileText(load("uno-blink-d12"));

  it("warns, and stays ok, when the text differs from the writer's bytes", () => {
    const report = validateText(clean.replace('"format": ', '"format":  '));
    expect(report.ok).toBe(true);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(1);
    expect(report.diagnostics[0]).toMatchObject({ code: "V1-EDITED-OUTSIDE", severity: "warning" });
    expect(isFatal(report)).toBe(false);
  });

  it("reports a duplicate key as V2-PARSE with the parse code", () => {
    const report = validateText('{"a": 1, "a": 2}');
    expect(report.ok).toBe(false);
    expect(report.diagnostics).toHaveLength(1);
    expect(report.diagnostics[0].code).toBe("V2-PARSE");
    expect(report.diagnostics[0].message).toContain("duplicate_key");
  });

  it("reports a byte order mark as V2-PARSE", () => {
    const report = validateText("﻿" + clean);
    expect(report.diagnostics[0]).toMatchObject({ code: "V2-PARSE" });
    expect(report.diagnostics[0].message).toContain("bom");
  });

  it("answers garbage with a list, not a crash", () => {
    for (const text of ["", "not json", "null", "[]", "42", '{"format": 7}']) {
      const report = validateText(text);
      expect(report.ok).toBe(false);
      expect(report.doc).toBeUndefined();
      expect(isFatal(report)).toBe(true);
    }
  });
});

describe("validateValue", () => {
  it("refuses a newer version with V0-NEWER and no other pass", () => {
    const doc = { ...clone(load("uno-blink-d12")), schemaVersion: "2.0" };
    const report = validateValue(doc);
    expect(report.diagnostics.map((d) => d.code)).toEqual(["V0-NEWER"]);
    expect(report.diagnostics[0].message).toContain("2.0");
    expect(report.doc).toBeUndefined();
  });

  it("does not take a newer minor version for the current one", () => {
    const report = validateValue({ ...clone(load("uno-blink-d12")), schemaVersion: "1.2" });
    expect(report.diagnostics[0].code).toBe("V0-NEWER");
  });

  it("never throws on hostile values", () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    for (const value of [undefined, null, 0, "x", [], {}, cycle, { sources: [null, 3, { content: 4 }] }]) {
      expect(() => validateValue(value)).not.toThrow();
      expect(validateValue(value).ok).toBe(false);
    }
  });

  it("counts every finding but stores 500, and shows 20 with errors first", () => {
    const doc = clone(load("uno-blink-d12")) as unknown as Record<string, unknown>;
    doc.ext = Object.fromEntries(Array.from({ length: 600 }, (_, i) => [`k${i}`, { ["__proto__"]: 1 }]));
    const report = validateValue(JSON.parse(JSON.stringify(doc)));
    expect(report.errors).toBeGreaterThan(500);
    expect(report.diagnostics).toHaveLength(500);
    expect(report.first20).toHaveLength(20);
    expect(report.first20.every((d) => d.severity === "error")).toBe(true);
  });
});

describe("schemaDiagnostics", () => {
  it("keeps one branch of the Op oneOf for a bad op", () => {
    const doc = clone(load("uno-blink-d12"));
    doc.history.ops = [
      {
        opId: "op_1",
        seq: 1,
        base: "0".repeat(64),
        author: { actor: "usr_a", kind: "user" },
        at: "2026-10-28T00:00:00Z",
        op: { k: "meta.set", set: { title: 5 } },
      },
    ] as unknown as Project["history"]["ops"];
    const report = validateValue(doc);
    const forOp = report.diagnostics.filter((d) => d.path.startsWith("/history/ops/0/op"));
    expect(forOp.length).toBeGreaterThan(0);
    expect(forOp.length).toBeLessThan(5);
    expect(forOp.some((d) => d.path === "/history/ops/0/op/set/title" && d.code === "V2-type")).toBe(true);
  });

  it("keeps one k error when no branch names the kind", () => {
    const doc = clone(load("uno-blink-d12"));
    doc.history.ops = [
      {
        opId: "op_1",
        seq: 1,
        base: "0".repeat(64),
        author: { actor: "usr_a", kind: "user" },
        at: "2026-10-28T00:00:00Z",
        op: { k: "no.such.op" },
      },
    ] as unknown as Project["history"]["ops"];
    const forOp = validateValue(doc).diagnostics.filter((d) => d.path.startsWith("/history/ops/0/op"));
    expect(forOp).toHaveLength(1);
    expect(forOp[0]).toMatchObject({ code: "V2-const", path: "/history/ops/0/op/k" });
  });

  it("names the extra property and drops repeats", () => {
    const found = schemaDiagnostics([
      { instancePath: "/a", schemaPath: "#/x", keyword: "additionalProperties", params: { additionalProperty: "colour" }, message: "must NOT have additional properties" },
      { instancePath: "/a", schemaPath: "#/y", keyword: "additionalProperties", params: { additionalProperty: "colour" }, message: "must NOT have additional properties" },
    ]);
    expect(found).toEqual([
      { code: "V2-additionalProperties", severity: "error", path: "/a", message: "must NOT have additional properties: colour" },
    ]);
  });
});
