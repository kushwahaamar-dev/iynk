// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LIMITS } from "../core/limits.ts";
import type { Project } from "./generated/types.ts";
import { canonicalBytes } from "./hash.ts";
import { hygieneDiagnostics, limitDiagnostics } from "./limits.ts";
import { validateText, validateValue } from "./validate.ts";

const dir = join(process.cwd(), "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples");
const doc = () => JSON.parse(readFileSync(join(dir, "uno-blink-d12.project.json"), "utf8")) as Project;

describe("limitDiagnostics", () => {
  it("accepts a size exactly at the limit and refuses one byte more", () => {
    expect(limitDiagnostics(doc(), LIMITS.canonicalBytes)).toEqual([]);
    const over = limitDiagnostics(doc(), LIMITS.canonicalBytes + 1);
    expect(over).toHaveLength(1);
    expect(over[0]).toMatchObject({ code: "V4-SIZE", severity: "error", path: "" });
  });

  it("counts source bytes, not characters", () => {
    const wide = doc();
    wide.sources[0].content = "é".repeat(LIMITS.sourceBytes / 2);
    expect(limitDiagnostics(wide, canonicalBytes(wide))).toEqual([]);
    wide.sources[0].content += "é";
    expect(wide.sources[0].content.length).toBeLessThan(LIMITS.sourceBytes);
    expect(limitDiagnostics(wide, 0)).toEqual([
      expect.objectContaining({ code: "V4-SOURCE", path: "/sources/0/content" }),
    ]);
  });

  it("is found through validateValue when the schema accepts the characters", () => {
    const wide = doc();
    wide.sources[0].content = "é".repeat(LIMITS.sourceBytes / 2 + 1);
    const report = validateValue(wide);
    expect(report.diagnostics.map((d) => d.code)).toEqual(["V4-SOURCE"]);
  });

  it("skips what it cannot read", () => {
    expect(limitDiagnostics({ sources: [null, 4, {}, { content: 1 }] } as never, 0)).toEqual([]);
    expect(limitDiagnostics(null as never, 0)).toEqual([]);
  });
});

describe("hygieneDiagnostics", () => {
  it("finds __proto__, constructor and prototype with their pointers", () => {
    const value = JSON.parse('{"a":[{"constructor":1},{"b/c":{"prototype":2}}],"__proto__":{"x":1}}') as unknown;
    expect(hygieneDiagnostics(value).map((d) => d.path).sort()).toEqual([
      "/__proto__",
      "/a/0/constructor",
      "/a/1/b~1c/prototype",
    ]);
  });

  it("finds __proto__ nested 30 deep", () => {
    let text = '{"__proto__":1}';
    for (let i = 0; i < 29; i++) text = `{"n":${text}}`;
    const found = hygieneDiagnostics(JSON.parse(text));
    expect(found).toHaveLength(1);
    expect(found[0].path).toBe("/n".repeat(29) + "/__proto__");
  });

  it("walks 10,000 levels without overflowing the stack", () => {
    let node: Record<string, unknown> = {};
    const root = node;
    for (let i = 0; i < 10_000; i++) {
      const child: Record<string, unknown> = {};
      node.n = child;
      node = child;
    }
    expect(hygieneDiagnostics(root)).toEqual([]);
  });

  it("is quiet on a clean document", () => {
    expect(hygieneDiagnostics(doc())).toEqual([]);
  });
});

describe("hostile input", () => {
  it("refuses 33 levels of nesting as V2-PARSE", () => {
    const report = validateText("[".repeat(33) + "]".repeat(33));
    expect(report.diagnostics[0]).toMatchObject({ code: "V2-PARSE" });
    expect(report.diagnostics[0].message).toContain("depth");
  });

  it("refuses an asset that claims 100 MB at V2", () => {
    const big = doc();
    big.assets = [
      { id: "ast_big", path: "big.bin", mediaType: "application/octet-stream", bytes: 100 * 1024 * 1024, sha256: "a".repeat(64), role: "binary" },
    ];
    const report = validateValue(big);
    expect(report.ok).toBe(false);
    expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: "V2-maximum", path: "/assets/0/bytes" }));
  });
});
