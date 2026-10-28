// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LIMITS } from "./limits.ts";
import { parseStrict } from "./strict-json.ts";

const code = (text: string, opts?: Parameters<typeof parseStrict>[1]) => {
  const result = parseStrict(text, opts);
  return result.ok ? null : result.error;
};

const nested = (depth: number) => "[".repeat(depth) + "]".repeat(depth);

describe("parseStrict", () => {
  it("returns what JSON.parse returns for valid input", () => {
    const text = '{"a":[1,2,{"b":null,"c":"x\\ny"}],"d":true,"e":-0.5e2}';
    expect(parseStrict(text)).toEqual({ ok: true, value: JSON.parse(text) });
    expect(parseStrict(" 5 ")).toEqual({ ok: true, value: 5 });
  });

  it("rejects a duplicate key with its pointer", () => {
    expect(code('{"a":1,"a":2}')).toMatchObject({ code: "duplicate_key", path: "/a" });
  });

  it("finds a duplicate key at depth 3 inside an array", () => {
    expect(code('{"x":[1,{"y":{"k":1,"j":2,"k":3}}]}')).toMatchObject({
      code: "duplicate_key",
      path: "/x/1/y/k",
    });
  });

  it("finds a duplicate written through an escape", () => {
    expect(code('{"a":1,"\\u0061":2}')).toMatchObject({ code: "duplicate_key", path: "/a" });
  });

  it("allows the same key in sibling objects", () => {
    expect(code('[{"a":1},{"a":2},{"b":{"a":3}}]')).toBeNull();
  });

  it("treats a key and a string value alike only as a key", () => {
    expect(code('{"a":"a","b":"a"}')).toBeNull();
  });

  it("accepts depth 32 and rejects depth 33", () => {
    expect(code(nested(32))).toBeNull();
    expect(code(nested(33))).toMatchObject({ code: "depth" });
    expect(code(nested(3), { maxDepth: 2 })).toMatchObject({ code: "depth" });
  });

  it("does not count brackets inside strings", () => {
    expect(code(`["${"[".repeat(100)}"]`)).toBeNull();
  });

  it("rejects a byte order mark", () => {
    expect(code("﻿{}")).toMatchObject({ code: "bom" });
  });

  it("rejects a lone surrogate in a value, a key and an escape", () => {
    expect(code('{"a":"\ud800"}')).toMatchObject({ code: "lone_surrogate", path: "/a" });
    expect(code('{"\udc00":1}')).toMatchObject({ code: "lone_surrogate" });
    expect(code('["x","\\ud800"]')).toMatchObject({ code: "lone_surrogate", path: "/1" });
    expect(code('["\\ud83d\\ude00","\u{1f600}"]')).toBeNull();
  });

  it("fails 5,242,881 bytes as too_large before parsing", () => {
    const text = '"' + "a".repeat(LIMITS.canonicalBytes - 2) + '"';
    expect(code(text)).toBeNull();
    expect(code(text + " ")).toMatchObject({ code: "too_large" });
    expect(code('"' + "é".repeat(LIMITS.canonicalBytes / 2) + '"')).toMatchObject({ code: "too_large" });
    expect(code("x".repeat(11), { maxBytes: 10 })).toMatchObject({ code: "too_large" });
  });

  it("reports bad syntax", () => {
    expect(code("{")).toMatchObject({ code: "syntax" });
    expect(code("")).toMatchObject({ code: "syntax" });
    expect(code("{'a':1}")).toMatchObject({ code: "syntax" });
  });
});
