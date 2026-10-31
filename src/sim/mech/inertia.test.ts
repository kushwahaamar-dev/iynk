import { describe, expect, it } from "vitest";
import { inertiaOf, triangleOk } from "./inertia.ts";

describe("inertiaOf", () => {
  it("takes a box about each axis from the other two sides", () => {
    const [x, y, z] = inertiaOf({ kind: "box", size_mm: [160, 110, 20] }, 0.34);
    expect(x).toBeCloseTo((0.34 * (0.11 ** 2 + 0.02 ** 2)) / 12, 12);
    expect(y).toBeCloseTo((0.34 * (0.16 ** 2 + 0.02 ** 2)) / 12, 12);
    expect(z).toBeCloseTo((0.34 * (0.16 ** 2 + 0.11 ** 2)) / 12, 12);
  });

  it("puts the cylinder axis on z", () => {
    const [x, y, z] = inertiaOf({ kind: "cylinder", radius_mm: 50, height_mm: 20 }, 0.157);
    expect(z).toBeCloseTo(1.9625e-4, 10);
    expect(x).toBeCloseTo((0.157 * (3 * 0.05 ** 2 + 0.02 ** 2)) / 12, 12);
    expect(y).toBe(x);
  });

  it("gives a sphere 2mr2/5 on every axis", () => {
    const expected = (2 * 0.008 * 0.008 ** 2) / 5;
    for (const i of inertiaOf({ kind: "sphere", radius_mm: 8 }, 0.008)) expect(i).toBeCloseTo(expected, 12);
  });
});

describe("triangleOk", () => {
  it("accepts a physical body and a flat disc", () => {
    expect(triangleOk([1, 1, 1])).toBe(true);
    expect(triangleOk([1, 1, 2])).toBe(true);
  });

  it("refuses moments that break the inequality, or are not positive", () => {
    expect(triangleOk([1, 1, 3])).toBe(false);
    expect(triangleOk([0, 1, 1])).toBe(false);
  });
});
