import { describe, expect, it } from "vitest";
import { percentile, summarise } from "./stats.ts";

const ONE_TO_TEN = [7, 3, 10, 1, 9, 2, 8, 4, 6, 5];

describe("percentile", () => {
  it("takes the nearest rank at p50, p95 and p100", () => {
    expect(percentile(ONE_TO_TEN, 50)).toBe(5);
    expect(percentile(ONE_TO_TEN, 95)).toBe(10);
    expect(percentile(ONE_TO_TEN, 100)).toBe(10);
    expect(percentile(ONE_TO_TEN, 0)).toBe(1);
  });

  it("does not reorder the input", () => {
    const xs = [3, 1, 2];
    percentile(xs, 50);
    expect(xs).toEqual([3, 1, 2]);
  });

  it("gives 0 for no values", () => {
    expect(percentile([], 95)).toBe(0);
  });

  it("gives the one value for every p", () => {
    expect(percentile([16.7], 0)).toBe(16.7);
    expect(percentile([16.7], 50)).toBe(16.7);
    expect(percentile([16.7], 100)).toBe(16.7);
  });
});

describe("summarise", () => {
  it("reports p50, p95, max and the count", () => {
    expect(summarise(ONE_TO_TEN)).toEqual({ p50: 5, p95: 10, max: 10, n: 10 });
  });

  it("is all zeros for no values", () => {
    expect(summarise([])).toEqual({ p50: 0, p95: 0, max: 0, n: 0 });
  });
});
