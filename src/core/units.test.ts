// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DOCUMENT_ONLY_UNITS,
  UNITS,
  inLayoutRange,
  msToNs,
  normaliseNumber,
  nsToMs,
  quantiseDeg,
  quantiseMm,
  quantiseMs,
} from "./units.ts";

const component = JSON.parse(
  readFileSync(new URL("../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/component.schema.json", import.meta.url), "utf8"),
) as { $defs: { unit: { enum: string[] } } };

describe("UNITS", () => {
  it("equals the component schema enum, in order", () => {
    expect([...UNITS]).toEqual(component.$defs.unit.enum);
    expect(UNITS).toHaveLength(24);
  });

  it("keeps ms and ns out of the file units", () => {
    for (const u of DOCUMENT_ONLY_UNITS) expect(UNITS).not.toContain(u);
  });
});

describe("quantise", () => {
  it("rounds millimetres to 0.001", () => {
    expect(quantiseMm(0.1 + 0.2)).toBe(0.3);
    expect(quantiseMm(1.23456)).toBe(1.235);
    expect(quantiseMm(-2.5)).toBe(-2.5);
  });

  it("rounds degrees to 0.01 and milliseconds to 0.001", () => {
    expect(quantiseDeg(12.3456)).toBe(12.35);
    expect(quantiseMs(0.0004)).toBe(0);
    expect(quantiseMs(1.0006)).toBe(1.001);
  });

  it("never returns -0", () => {
    expect(Object.is(quantiseMm(-0.0004), 0)).toBe(true);
    expect(Object.is(quantiseDeg(-0), 0)).toBe(true);
    expect(Object.is(normaliseNumber(-0), 0)).toBe(true);
  });

  it("rejects non-finite input", () => {
    expect(() => normaliseNumber(NaN)).toThrow(RangeError);
    expect(() => normaliseNumber(Infinity)).toThrow(RangeError);
    expect(() => quantiseMm(NaN)).toThrow(RangeError);
  });
});

describe("milliseconds and nanoseconds", () => {
  it("converts whole nanoseconds", () => {
    expect(msToNs(0.000001)).toBe(1);
    expect(msToNs(1)).toBe(1_000_000);
    expect(msToNs(2.5)).toBe(2_500_000);
    expect(nsToMs(1_500_000)).toBe(1.5);
  });

  it("rejects a fraction of a nanosecond", () => {
    expect(() => msToNs(1.0000004)).toThrow(RangeError);
    expect(() => msToNs(NaN)).toThrow(RangeError);
  });
});

describe("inLayoutRange", () => {
  it("allows plus or minus 1,000,000 mm", () => {
    expect(inLayoutRange(1_000_000)).toBe(true);
    expect(inLayoutRange(-1_000_000)).toBe(true);
    expect(inLayoutRange(1_000_000.001)).toBe(false);
    expect(inLayoutRange(NaN)).toBe(false);
  });
});
