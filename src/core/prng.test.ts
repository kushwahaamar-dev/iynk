// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fnv1a32, rng, rngFrom, rngState, splitmix32 } from "./prng.ts";

const take = (count: number, draw: () => number): number[] => Array.from({ length: count }, draw);

describe("rng", () => {
  it("gives the golden first eight values for seed 42 and stream noise", () => {
    const r = rng(42, "noise");
    expect(take(8, () => r.next())).toEqual([
      1352578496, 3486845824, 3733868206, 3572072512, 788069756, 3187530983, 2539516294, 2107024856,
    ]);
  });

  it("repeats the same 1,000 values for the same seed and stream", () => {
    const a = rng(7, "adc");
    const b = rng(7, "adc");
    expect(take(1000, () => a.next())).toEqual(take(1000, () => b.next()));
  });

  it("gives different values to different streams and seeds", () => {
    expect(rng(7, "a").next()).not.toBe(rng(7, "b").next());
    expect(rng(7, "a").next()).not.toBe(rng(8, "a").next());
  });

  it("keeps two streams unchanged when a third is created", () => {
    const first = rng(9, "one");
    const second = rng(9, "two");
    const before = [take(20, () => first.next()), take(20, () => second.next())];
    const again = [rng(9, "one"), rng(9, "two")];
    rng(9, "three").next();
    expect([take(20, () => again[0].next()), take(20, () => again[1].next())]).toEqual(before);
  });

  it("keeps float in [0, 1) and next in uint32", () => {
    const r = rng(1, "f");
    for (let i = 0; i < 10000; i++) {
      const f = r.float();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
    for (let i = 0; i < 1000; i++) {
      const n = r.next();
      expect(Number.isInteger(n) && n >= 0 && n <= 0xffffffff).toBe(true);
    }
  });

  it("draws gauss values with mean near 0 and deviation near 1", () => {
    const r = rng(3, "g");
    const xs = take(20000, () => r.gauss());
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(variance - 1)).toBeLessThan(0.05);
  });

  it("continues the sequence after rngState then rngFrom", () => {
    const r = rng(5, "s");
    take(37, () => r.next());
    const copy = rngFrom(rngState(r));
    expect(take(50, () => copy.next())).toEqual(take(50, () => r.next()));
  });

  it("refuses the state of a generator it did not make", () => {
    expect(() => rngState({ next: () => 0, float: () => 0, gauss: () => 0 })).toThrow(TypeError);
  });
});

describe("fnv1a32 and splitmix32", () => {
  it("matches the FNV-1a vectors", () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
    expect(fnv1a32("a")).toBe(0xe40c292c);
    expect(fnv1a32("foobar")).toBe(0xbf9cf968);
  });

  it("hashes the UTF-8 bytes of a string", () => {
    expect(fnv1a32("é")).toBe(0x1e9de8c1);
  });

  it("is repeatable and moves with the seed", () => {
    const a = splitmix32(1);
    const b = splitmix32(1);
    expect(take(5, a)).toEqual(take(5, b));
    expect(splitmix32(2)()).not.toBe(splitmix32(1)());
  });
});
