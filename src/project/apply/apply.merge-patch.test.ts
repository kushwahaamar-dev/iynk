// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mergePatch } from "./types.ts";

// The fifteen examples of RFC 7396, appendix A.
const RFC_CASES: [string, unknown, unknown, unknown][] = [
  ["replaces a value", { a: "b" }, { a: "c" }, { a: "c" }],
  ["adds a key", { a: "b" }, { b: "c" }, { a: "b", b: "c" }],
  ["removes the only key", { a: "b" }, { a: null }, {}],
  ["removes one of two keys", { a: "b", b: "c" }, { a: null }, { b: "c" }],
  ["replaces an array with a string", { a: ["b"] }, { a: "c" }, { a: "c" }],
  ["replaces a string with an array", { a: "c" }, { a: ["b"] }, { a: ["b"] }],
  ["merges nested objects", { a: { b: "c" } }, { a: { b: "d", c: null } }, { a: { b: "d" } }],
  ["replaces an array whole", { a: [{ b: "c" }] }, { a: [1] }, { a: [1] }],
  ["replaces an array at the top", ["a", "b"], ["c", "d"], ["c", "d"]],
  ["replaces an object with an array", { a: "b" }, ["c"], ["c"]],
  ["replaces an object with null", { a: "foo" }, null, null],
  ["replaces an object with a string", { a: "foo" }, "bar", "bar"],
  ["keeps a null already in the target", { e: null }, { a: 1 }, { e: null, a: 1 }],
  ["treats an array target as empty", [1, 2], { a: "b", c: null }, { a: "b" }],
  ["builds nested objects and drops nulls", {}, { a: { bb: { ccc: null } } }, { a: { bb: {} } }],
];

describe("mergePatch", () => {
  it.each(RFC_CASES)("RFC 7396: %s", (_name, target, patch, expected) => {
    expect(mergePatch(target, patch)).toEqual(expected);
  });

  it("removes a key several levels down and leaves siblings alone", () => {
    const target = { a: { b: { c: 1, d: 2 }, e: 3 }, f: 4 };
    expect(mergePatch(target, { a: { b: { c: null } } })).toEqual({ a: { b: { d: 2 }, e: 3 }, f: 4 });
  });

  it("does not change its inputs", () => {
    const target = Object.freeze({ a: Object.freeze({ b: 1 }) });
    const patch = Object.freeze({ a: Object.freeze({ b: null, c: 2 }) });
    expect(mergePatch(target, patch)).toEqual({ a: { c: 2 } });
    expect(target).toEqual({ a: { b: 1 } });
  });

  it("stores a key named __proto__ as data", () => {
    const patch = JSON.parse('{"__proto__": {"polluted": true}}') as unknown;
    const merged = mergePatch({}, patch) as Record<string, unknown>;
    expect(Object.keys(merged)).toEqual(["__proto__"]);
    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
