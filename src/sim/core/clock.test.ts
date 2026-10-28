// @vitest-environment node
import { describe, expect, it } from "vitest";
import { rng } from "../../core/prng.ts";
import { NS_PER_MS, clockRate, cyclesToNs, nsToCycles } from "./clock.ts";

const RATES = [
  { name: "16 MHz", num: 125, den: 2, hz: 16_000_000 },
  { name: "125 MHz", num: 8, den: 1, hz: 125_000_000 },
  { name: "240 MHz", num: 25, den: 6, hz: 240_000_000 },
  { name: "240 Hz", num: 12_500_000, den: 3, hz: 240 },
  { name: "100 Hz", num: 10_000_000, den: 1, hz: 100 },
  { name: "1 MHz", num: 1000, den: 1, hz: 1_000_000 },
];

describe("clockRate", () => {
  it("reduces by the greatest common divisor", () => {
    expect(clockRate(250, 4)).toEqual({ num: 125, den: 2 });
    expect(clockRate(1_000_000_000, 240_000_000)).toEqual({ num: 25, den: 6 });
  });

  it("rejects zero, negative and fractional parts", () => {
    expect(() => clockRate(1, 0)).toThrow(RangeError);
    expect(() => clockRate(0, 1)).toThrow(RangeError);
    expect(() => clockRate(-1, 2)).toThrow(RangeError);
    expect(() => clockRate(1.5, 2)).toThrow(RangeError);
  });
});

describe("cyclesToNs and nsToCycles", () => {
  it.each(RATES)("$name over 1e6 cycles is exact", ({ num, den, hz }) => {
    const rate = clockRate(num, den);
    expect(rate).toEqual({ num, den });
    expect(cyclesToNs(1_000_000, rate)).toBe(Math.floor((1_000_000 * 1e9) / hz));
    expect(cyclesToNs(hz, rate)).toBe(1_000_000_000);
  });

  it("gives 62 ns for one cycle at 16 MHz", () => {
    expect(cyclesToNs(1, clockRate(125, 2))).toBe(62);
  });

  it("never misses a deadline when converting back", () => {
    const rate = clockRate(25, 6);
    for (const n of [0, 1, 7, 999, 1_000_003, 123_456_789]) {
      expect(nsToCycles(cyclesToNs(n, rate), rate)).toBeGreaterThanOrEqual(n);
    }
    expect(nsToCycles(0, rate)).toBe(0);
    expect(nsToCycles(25, rate)).toBe(6);
    expect(nsToCycles(26, rate)).toBe(7);
  });

  it("agrees with BigInt arithmetic on 1,000 drawn pairs, both below and above 2^53 in the product", () => {
    const draw = rng(0x5eed, "clock-test");
    for (let i = 0; i < 1000; i++) {
      const rate = clockRate(1 + (draw.next() % 5000), 1 + (draw.next() % 5000));
      const cycles = i % 2 === 0 ? draw.next() : draw.next() * 1024 + (draw.next() % 1024);
      const expected = (BigInt(cycles) * BigInt(rate.num)) / BigInt(rate.den);
      if (expected > BigInt(2 ** 53)) continue;
      expect(cyclesToNs(cycles, rate)).toBe(Number(expected));
      const ns = Number(expected);
      const back = (BigInt(ns) * BigInt(rate.den) + BigInt(rate.num) - 1n) / BigInt(rate.num);
      expect(nsToCycles(ns, rate)).toBe(Number(back));
    }
  });

  it("takes the BigInt path when the product passes 2^53 and stays exact", () => {
    const rate = clockRate(3, 2);
    expect(cyclesToNs(2 ** 52, rate)).toBe(3 * 2 ** 51);
    expect(nsToCycles(3 * 2 ** 51, rate)).toBe(2 ** 52);
  });

  it("rejects negative or fractional counts and results past 2^53", () => {
    const rate = clockRate(1000, 1);
    expect(() => cyclesToNs(-1, rate)).toThrow(RangeError);
    expect(() => cyclesToNs(1.5, rate)).toThrow(RangeError);
    expect(() => nsToCycles(-1, rate)).toThrow(RangeError);
    expect(() => cyclesToNs(2 ** 50, rate)).toThrow(RangeError);
  });

  it("has a millisecond constant", () => {
    expect(NS_PER_MS).toBe(1_000_000);
  });
});
