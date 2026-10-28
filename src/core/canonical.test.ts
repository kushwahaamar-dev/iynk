// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CanonicalError, canonicalize, prettyPrint, utf8Encode, utf8Length } from "./canonical.ts";
import { parseStrict } from "./strict-json.ts";
import { sha256Hex } from "./sha256.ts";

describe("PDM 6.3 vector", () => {
  const value = {
    z: [3, { b: 2, a: 1 }],
    a: "é",
    n: [0, -0, 7.62, 1e-7, 1e23, 0.1 + 0.2, 0.3],
  };
  const canon = '{"a":"é","n":[0,0,7.62,1e-7,1e+23,0.30000000000000004,0.3],"z":[3,{"a":1,"b":2}]}';

  it("canonicalises to the documented 82 bytes", () => {
    expect(canonicalize(value)).toBe(canon);
    expect(utf8Length(canon)).toBe(82);
    expect(utf8Encode(canon)).toHaveLength(82);
  });

  it("hashes to the documented digest", () => {
    expect(sha256Hex(canonicalize(value))).toBe("726a7d3b30b104e1d8ff1dc2b8184d9855e408419492c85ce39981959c0bc7e1");
  });
});

describe("RFC 8785", () => {
  it("sorts keys as in section 3.2.3, by UTF-16 code unit", () => {
    const value = {
      "€": "Euro Sign",
      "\r": "Carriage Return",
      "דּ": "Hebrew Letter Dalet With Dagesh",
      "1": "One",
      "\u{1f600}": "Emoji: Grinning Face",
      "\u0080": "Control",
      "ö": "Latin Small Letter O With Diaeresis",
    };
    expect(canonicalize(value)).toBe(
      '{"\\r":"Carriage Return","1":"One","\u0080":"Control","\u00f6":"Latin Small Letter O With Diaeresis",' +
        '"\u20ac":"Euro Sign","\u{1f600}":"Emoji: Grinning Face","\ufb33":"Hebrew Letter Dalet With Dagesh"}',
    );
  });

  it("prints numbers as ECMAScript does", () => {
    const table: [number, string][] = [
      [0, "0"],
      [-0, "0"],
      [5e-324, "5e-324"],
      [Number.MAX_VALUE, "1.7976931348623157e+308"],
      [9007199254740992, "9007199254740992"],
      [295147905179352830000, "295147905179352830000"],
      [9.999999999999997e22, "9.999999999999997e+22"],
      [1e23, "1e+23"],
      [1.0000000000000001e23, "1.0000000000000001e+23"],
      [999999999999999700000, "999999999999999700000"],
      [999999999999999900000, "999999999999999900000"],
      [1e21, "1e+21"],
      [4.5, "4.5"],
      [0.002, "0.002"],
      [1e-7, "1e-7"],
      [1.5e300, "1.5e+300"],
    ];
    for (const [n, text] of table) expect(canonicalize(n)).toBe(text);
  });

  it("escapes only what JSON requires", () => {
    expect(canonicalize("a\"b\\c\n\u0001\u007f/é")).toBe('"a\\"b\\\\c\\n\\u0001\u007f/é"');
  });
});

describe("canonicalize", () => {
  it("orders keys by surrogate pairs, not code points", () => {
    const text = canonicalize({ "\u{10000}": 1, "￿": 2 });
    expect(text).toBe('{"\u{10000}":1,"￿":2}');
  });

  it("skips undefined properties and keeps null", () => {
    expect(canonicalize({ a: undefined })).toBe("{}");
    expect(canonicalize({ a: null, b: [null] })).toBe('{"a":null,"b":[null]}');
  });

  it("writes __proto__ like any other key", () => {
    const value = JSON.parse('{"b":1,"__proto__":2}') as unknown;
    expect(canonicalize(value)).toBe('{"__proto__":2,"b":1}');
  });

  it("throws with a pointer for values it cannot carry", () => {
    const bad: [unknown, string][] = [
      [[undefined], "/0"],
      [{ a: { b: [1, () => 1] } }, "/a/b/1"],
      [{ "a/b": Symbol("s") }, "/a~1b"],
      [{ x: 1n }, "/x"],
      [{ x: Number.NaN }, "/x"],
      [[Infinity], "/0"],
      [{ x: "\ud800" }, "/x"],
    ];
    for (const [value, path] of bad) {
      expect(() => canonicalize(value)).toThrow(CanonicalError);
      try {
        canonicalize(value);
      } catch (error) {
        expect((error as CanonicalError).path).toBe(path);
      }
    }
    expect(() => canonicalize(undefined)).toThrow(CanonicalError);
  });
});

describe("utf8", () => {
  it("encodes one to four byte characters", () => {
    expect([...utf8Encode("aé€\u{1f600}")]).toEqual([
      0x61, 0xc3, 0xa9, 0xe2, 0x82, 0xac, 0xf0, 0x9f, 0x98, 0x80,
    ]);
    expect(utf8Length("aé€\u{1f600}")).toBe(10);
  });

  it("rejects a lone surrogate", () => {
    expect(() => utf8Encode("\ud800")).toThrow("lone_surrogate");
    expect(() => utf8Encode("\udc00x")).toThrow("lone_surrogate");
  });
});

describe("prettyPrint", () => {
  it("writes two-space indent, sorted keys, empty containers and one trailing newline", () => {
    expect(prettyPrint({ b: [], a: {}, c: [1, { d: null }] })).toBe(
      '{\n  "a": {},\n  "b": [],\n  "c": [\n    1,\n    {\n      "d": null\n    }\n  ]\n}\n',
    );
    expect(prettyPrint(5)).toBe("5\n");
  });

  it("survives parseStrict then canonicalize", () => {
    const value = { n: [1, 2.5, -0.001], s: "x\ny", o: { z: true, a: [] }, u: undefined };
    const parsed = parseStrict(prettyPrint(value));
    expect(parsed.ok && canonicalize(parsed.value)).toBe(canonicalize(value));
  });
});

describe("example project files", () => {
  const dir = join(process.cwd(), "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples");
  const names = readdirSync(dir).filter((name) => name.endsWith(".project.json"));

  it("finds the five examples", () => {
    expect(names).toHaveLength(5);
  });

  it.each(names)("%s is the pretty form of its own value", (name) => {
    const text = readFileSync(join(dir, name), "utf8");
    const parsed = parseStrict(text);
    expect(parsed.ok && prettyPrint(parsed.value)).toBe(text);
  });
});
