// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatValue, parseValue, quantityOf } from "./units.ts";
import type { Quantity } from "./units.ts";

const WIDE = { min: 1e-12, max: 1e9 };

type Row = [input: string, unit: Quantity, expected: number | "empty" | "nan" | "range" | "unit"];

const ROWS: Row[] = [
  ["330", "ohm", 330],
  ["330R", "ohm", 330],
  ["330r", "ohm", 330],
  ["330Ω", "ohm", 330],
  ["330 ohm", "ohm", 330],
  ["330 ohms", "ohm", 330],
  ["0.33k", "ohm", 330],
  ["0.33kΩ", "ohm", 330],
  ["4k7", "ohm", 4700],
  ["4K7", "ohm", 4700],
  ["4k7Ω", "ohm", 4700],
  ["4R7", "ohm", 4.7],
  ["2M2", "ohm", 2.2e6],
  ["4.7k", "ohm", 4700],
  ["4.7 k", "ohm", 4700],
  ["5 k", "ohm", 5000],
  ["10k", "ohm", 10000],
  ["1M", "ohm", 1e6],
  ["1MΩ", "ohm", 1e6],
  ["1G", "ohm", 1e9],
  ["1e3", "ohm", 1000],
  ["1E3", "ohm", 1000],
  ["1.5e2", "ohm", 150],
  ["  220  ", "ohm", 220],
  ["+220", "ohm", 220],
  [".5", "ohm", 0.5],
  ["5.", "ohm", 5],
  ["10u", "farad", 1e-5],
  ["10uF", "farad", 1e-5],
  ["10µF", "farad", 1e-5],
  ["100n", "farad", 1e-7],
  ["100nF", "farad", 1e-7],
  ["4n7", "farad", 4.7e-9],
  ["22p", "farad", 2.2e-11],
  ["1m", "farad", 1e-3],
  ["3.3V", "volt", 3.3],
  ["3.3v", "volt", 3.3],
  ["3V3", "volt", 3.3],
  ["5", "volt", 5],
  ["500mV", "volt", 0.5],
  ["20mA", "amp", 0.02],
  ["20m", "amp", 0.02],
  ["1A", "amp", 1],
  ["16M", "hertz", 16e6],
  ["16MHz", "hertz", 16e6],
  ["38k", "hertz", 38000],
  ["900MHz", "hertz", 9e8],
  ["10ms", "second", 0.01],
  ["10m", "second", 0.01],
  ["2s", "second", 2],
  ["0.5", "none", 0.5],
  ["12.7", "none", 12.7],
  ["0", "ohm", "range"],
  ["1e-13", "ohm", "range"],
  ["-5", "ohm", "range"],
  ["1e12", "ohm", "range"],
  ["1e999", "ohm", "range"],
  ["", "ohm", "empty"],
  ["   ", "ohm", "empty"],
  ["abc", "ohm", "nan"],
  ["4,7k", "ohm", "nan"],
  ["4,7", "ohm", "nan"],
  ["4 7", "ohm", "nan"],
  ["5  k", "ohm", "nan"],
  ["1.2.3", "ohm", "nan"],
  ["k", "ohm", "nan"],
  ["-", "ohm", "nan"],
  ["0x10", "ohm", "nan"],
  ["330F", "ohm", "unit"],
  ["330V", "ohm", "unit"],
  ["10uH", "farad", "unit"],
  ["10X", "ohm", "unit"],
  ["4k7F", "ohm", "unit"],
  ["4R7", "farad", "unit"],
  ["5k", "none", "unit"],
];

describe("parseValue", () => {
  it.each(ROWS)("reads %j as %s %s", (input, unit, expected) => {
    const parsed = parseValue(input, unit, WIDE);
    if (typeof expected === "number") expect(parsed).toEqual({ ok: true, value: expected });
    else expect(parsed).toEqual({ ok: false, reason: expected, ...WIDE });
  });

  it("has the 60 rows the card asks for", () => {
    expect(ROWS.length).toBeGreaterThanOrEqual(60);
  });

  it("accepts a value on the limits and refuses one just outside", () => {
    expect(parseValue("1000", "ohm", { min: 1000, max: 1e6 })).toEqual({ ok: true, value: 1000 });
    expect(parseValue("999", "ohm", { min: 1000, max: 1e6 })).toMatchObject({ ok: false, reason: "range" });
    expect(parseValue("1M", "ohm", { min: 1000, max: 1e6 })).toEqual({ ok: true, value: 1e6 });
    expect(parseValue("1.1M", "ohm", { min: 1000, max: 1e6 })).toMatchObject({ ok: false, reason: "range" });
  });
});

describe("formatValue", () => {
  it.each([
    [4700, "ohm", "4.7kΩ"],
    [330, "ohm", "330Ω"],
    [1e6, "ohm", "1MΩ"],
    [0.5, "ohm", "500mΩ"],
    [1e-5, "farad", "10µF"],
    [1e-7, "farad", "100nF"],
    [4.7e-9, "farad", "4.7nF"],
    [16e6, "hertz", "16MHz"],
    [0.01, "second", "10ms"],
    [3.3, "volt", "3.3V"],
    [0, "ohm", "0Ω"],
    [0.5, "none", "0.5"],
    [-4700, "ohm", "-4.7kΩ"],
  ] as [number, Quantity, string][])("writes %s %s as %s", (value, unit, text) => {
    expect(formatValue(value, unit)).toBe(text);
  });

  it("writes something parseValue reads back", () => {
    const units: Quantity[] = ["ohm", "farad", "volt", "amp", "hertz", "second", "none"];
    for (const unit of units) {
      for (const value of [0.33, 1, 4.7, 47, 330, 4700, 0.000047, 2.2e6, 1e-9, 12345.6]) {
        expect(parseValue(formatValue(value, unit), unit, { min: -1e15, max: 1e15 }), `${value} ${unit}`).toEqual({ ok: true, value });
      }
    }
  });

  it("gives an empty string for a number that is not finite", () => {
    expect(formatValue(Number.NaN, "ohm")).toBe("");
    expect(formatValue(Number.POSITIVE_INFINITY, "ohm")).toBe("");
  });
});

describe("quantityOf", () => {
  it("maps descriptor units and treats the rest as plain numbers", () => {
    expect(quantityOf("ohm")).toBe("ohm");
    expect(quantityOf("F")).toBe("farad");
    expect(quantityOf("Hz")).toBe("hertz");
    expect(quantityOf("1")).toBe("none");
    expect(quantityOf("percent")).toBe("none");
    expect(quantityOf(undefined)).toBe("none");
  });
});
