// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evalTrigger, parseTrigger } from "./expr.ts";
import type { Quantities } from "./expr.ts";

function quantities(values: Record<string, number>, peaks: Record<string, number> = {}, avgs: Record<string, number> = {}): Quantities {
  return { value: (n) => values[n], peak: (n) => peaks[n], avg: (n) => avgs[n] };
}

function run(src: string, q: Quantities = quantities({})): boolean | undefined {
  const parsed = parseTrigger(src);
  if (!parsed.ok) throw new Error(`${src}: bad-expr at ${parsed.error.at}`);
  return evalTrigger(parsed.value, q);
}

describe("evalTrigger", () => {
  it("binds * and / tighter than + and -", () => {
    expect(run("2 + 3 * 4 == 14")).toBe(true);
    expect(run("(2 + 3) * 4 == 20")).toBe(true);
    expect(run("10 - 4 - 3 == 3")).toBe(true);
    expect(run("8 / 2 / 2 == 2")).toBe(true);
  });

  it("binds comparison tighter than && and && tighter than ||", () => {
    expect(run("1 < 2 || 3 < 2 && 3 < 2")).toBe(true);
    expect(run("(1 < 2 || 3 < 2) && 3 < 2")).toBe(false);
  });

  it("reads unary minus and dotted names", () => {
    expect(run("vs < -0.5", quantities({ vs: -1 }))).toBe(true);
    expect(run("a.b.c > 1", quantities({ "a.b.c": 2 }))).toBe(true);
  });

  it("reads peak and avg from their own series", () => {
    const q = quantities({ i: 1 }, { i: 5 }, { i: 3 });
    expect(run("peak(i) == 5 && avg(i) == 3 && i == 1", q)).toBe(true);
  });

  it("default stands in only for a missing quantity", () => {
    expect(run("default(x, 150) == 150")).toBe(true);
    expect(run("default(x, 150) == 99", quantities({ x: 99 }))).toBe(true);
    expect(run("default(x, -2) == -2")).toBe(true);
  });

  it("cannot tell when a quantity is missing", () => {
    expect(run("y > 1")).toBeUndefined();
    expect(run("peak(i) > 1")).toBeUndefined();
    expect(run("y > 1 || 2 > 1")).toBe(true);
    expect(run("y > 1 && 2 < 1")).toBe(false);
    expect(run("y > 1 || 2 < 1")).toBeUndefined();
  });

  it("gives undefined for a division by zero", () => {
    expect(run("1 / 0 > 1")).toBeUndefined();
    expect(run("1 / (2 - 2) > 1")).toBeUndefined();
  });

  it("gives undefined for a trigger that is not a comparison", () => {
    expect(run("1 + 2")).toBeUndefined();
  });
});

describe("parseTrigger", () => {
  it("rejects 201 characters and accepts 200", () => {
    const pad = (n: number) => `1${" ".repeat(n - 1)}`;
    expect(parseTrigger(pad(200)).ok).toBe(true);
    const long = parseTrigger(pad(201));
    expect(long.ok).toBe(false);
  });

  it("rejects nesting deeper than 8", () => {
    const nest = (n: number) => `${"(".repeat(n)}1${")".repeat(n)}`;
    expect(parseTrigger(nest(8)).ok).toBe(true);
    expect(parseTrigger(nest(9)).ok).toBe(false);
  });

  it("rejects any other function call", () => {
    const r = parseTrigger("sqrt(4) > 1");
    expect(r).toEqual({ ok: false, error: { code: "bad-expr", at: 0 } });
  });

  it("reports the offset of the offending character", () => {
    expect(parseTrigger("1 + #")).toEqual({ ok: false, error: { code: "bad-expr", at: 4 } });
    expect(parseTrigger("1 +")).toEqual({ ok: false, error: { code: "bad-expr", at: 3 } });
    expect(parseTrigger("1 2")).toEqual({ ok: false, error: { code: "bad-expr", at: 2 } });
  });

  it("requires a literal fallback in default", () => {
    expect(parseTrigger("default(x, y) > 1").ok).toBe(false);
  });
});

describe("the evaluator source", () => {
  it("never reaches for eval or Function", () => {
    for (const file of ["expr.ts", "models.ts"]) {
      const text = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(text).not.toMatch(/\beval\s*\(/);
      expect(text).not.toMatch(/\bFunction\b/);
    }
  });
});
