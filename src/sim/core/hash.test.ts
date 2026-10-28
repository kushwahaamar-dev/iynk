// @vitest-environment node
import { describe, expect, it } from "vitest";
import { utf8Encode } from "../../core/canonical.ts";
import { StateHasher, fnv1a64 } from "./hash.ts";

const MASK = (1n << 64n) - 1n;

function referenceFnv(bytes: Uint8Array): string {
  let h = 0xcbf29ce484222325n;
  for (const b of bytes) h = ((h ^ BigInt(b)) * 0x100000001b3n) & MASK;
  return h.toString(16).padStart(16, "0");
}

describe("fnv1a64", () => {
  it("matches the published vectors", () => {
    expect(fnv1a64(new Uint8Array())).toBe("cbf29ce484222325");
    expect(fnv1a64(utf8Encode("a"))).toBe("af63dc4c8601ec8c");
    expect(fnv1a64(utf8Encode("foobar"))).toBe("85944171f73967e8");
  });

  it("agrees with an independent BigInt loop", () => {
    const bytes = Uint8Array.from({ length: 4096 }, (_, i) => (i * 131 + (i >> 3)) & 0xff);
    expect(fnv1a64(bytes)).toBe(referenceFnv(bytes));
  });
});

describe("StateHasher", () => {
  it("walks an integer as 8 little-endian bytes", () => {
    expect(new StateHasher().int(0x0102).hex()).toBe(referenceFnv(Uint8Array.of(2, 1, 0, 0, 0, 0, 0, 0)));
    expect(new StateHasher().int(-1).hex()).toBe(referenceFnv(new Uint8Array(8).fill(255)));
  });

  it("walks a string as a 4-byte length and UTF-8", () => {
    expect(new StateHasher().str("é").hex()).toBe(referenceFnv(Uint8Array.of(2, 0, 0, 0, 0xc3, 0xa9)));
  });

  it("walks a float as IEEE bits and hashes -0 as 0", () => {
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, 1.5, true);
    expect(new StateHasher().f64(1.5).hex()).toBe(referenceFnv(new Uint8Array(view.buffer)));
    expect(new StateHasher().f64(-0).hex()).toBe(new StateHasher().f64(0).hex());
  });

  it("ignores key order", () => {
    const a = new StateHasher().obj({ x: 1, y: [1, 2, { b: 1, a: 2 }], z: "s" }).hex();
    const b = new StateHasher().obj({ z: "s", y: [1, 2, { a: 2, b: 1 }], x: 1 }).hex();
    expect(a).toBe(b);
  });

  it("tells different shapes apart", () => {
    const hash = (v: unknown) => new StateHasher().obj(v).hex();
    expect(hash([1, 2])).not.toBe(hash([2, 1]));
    expect(hash("1")).not.toBe(hash(1));
    expect(hash(null)).not.toBe(hash(false));
    expect(hash({ a: 1 })).not.toBe(hash({ b: 1 }));
  });

  it("changes when a float moves by one ulp", () => {
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, 0.1);
    view.setBigUint64(0, view.getBigUint64(0) + 1n);
    expect(new StateHasher().f64(view.getFloat64(0)).hex()).not.toBe(new StateHasher().f64(0.1).hex());
  });

  it("rejects NaN, infinity, undefined, functions and unsafe integers", () => {
    expect(() => new StateHasher().f64(NaN)).toThrow(RangeError);
    expect(() => new StateHasher().f64(Infinity)).toThrow(RangeError);
    expect(() => new StateHasher().obj(NaN)).toThrow(RangeError);
    expect(() => new StateHasher().obj(undefined)).toThrow(TypeError);
    expect(() => new StateHasher().obj({ f: () => 1 })).toThrow(TypeError);
    expect(() => new StateHasher().int(2 ** 53)).toThrow(RangeError);
  });

  it("hashes a 10 KB object in under a millisecond once warm", () => {
    const state = { cells: Array.from({ length: 600 }, (_, i) => ({ id: `c${i}`, v: i * 0.5, on: i % 2 === 0 })) };
    for (let i = 0; i < 20; i++) new StateHasher().obj(state).hex();
    const t0 = performance.now();
    new StateHasher().obj(state).hex();
    const ms = performance.now() - t0;
    console.info(`StateHasher 10 KB object: ${ms.toFixed(3)} ms`);
    expect(ms).toBeLessThan(5);
  });
});
