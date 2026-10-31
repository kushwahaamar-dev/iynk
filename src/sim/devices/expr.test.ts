// @vitest-environment node
import { describe, expect, it } from "vitest";
import { evalExpr, parseExpr } from "./expr.ts";

const run = (src: string, env: Record<string, number> = {}): number => {
  const p = parseExpr(src);
  if (!p.ok) throw new Error(p.error);
  return evalExpr(p.ast, (n) => env[n]);
};

describe("expression grammar", () => {
  it("evaluates operators, precedence and functions", () => {
    expect(run("1 + 2 * 3 - -4")).toBe(11);
    expect(run("(1 + 2) * 3 / 2")).toBe(4.5);
    expect(run("1 < 2 + (2 >= 3) + (1 == 1) + (1 != 1)")).toBe(1);
    expect(run("min(3, 1, 2) + max(3, 1) + abs(-2) + round(2.5) + clamp(9, 0, 4)")).toBe(1 + 3 + 2 + 3 + 4);
    expect(run("x * 2", { x: 4 })).toBe(8);
  });

  it("divides by zero to NaN", () => {
    expect(run("1 / 0")).toBeNaN();
  });

  it("enforces the limits", () => {
    expect(parseExpr("1".repeat(201)).ok).toBe(false);
    expect(parseExpr(`${"(".repeat(16)}1${")".repeat(16)}`).ok).toBe(true);
    expect(parseExpr(`${"(".repeat(17)}1${")".repeat(17)}`).ok).toBe(false);
    expect(parseExpr(Array(32).fill("1").join("+")).ok).toBe(true);
    expect(parseExpr(Array(33).fill("1").join("+")).ok).toBe(false);
  });

  it.each(["constructor", "x.y", "a=1", 'constructor.constructor("return 1")()', "min(1)", "foo(1)", "__proto__"])("rejects %s", (src) => {
    expect(parseExpr(src).ok).toBe(false);
  });

  it("never throws on random input", () => {
    let seed = 12345;
    const next = (): number => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0);
    const alphabet = "0123456789abc_ +-*/<>=!(),.min";
    for (let i = 0; i < 1000; i++) {
      const src = Array.from({ length: next() % 40 }, () => alphabet[next() % alphabet.length]).join("");
      expect(() => parseExpr(src)).not.toThrow();
    }
  });
});
