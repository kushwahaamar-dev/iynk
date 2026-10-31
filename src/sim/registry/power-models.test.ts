import { describe, expect, it } from "vitest";
import { boardPower, mcuPowered, regulatorOut } from "./power-models.ts";
import type { BoardPowerModel } from "./power-models.ts";

const esp32 = (): BoardPowerModel => {
  const m = boardPower("board-power:esp32-devkitc@1");
  if (!m) throw new Error("missing entry");
  return m;
};

describe("board power models", () => {
  it("follows min(3.3, vin - 1.1) clamped at 0 from 0 to 6 V", () => {
    const { regulator } = esp32();
    for (let i = 0; i <= 60; i++) {
      const vin = i / 10;
      expect(regulatorOut(regulator, vin)).toBeCloseTo(Math.max(0, Math.min(3.3, vin - 1.1)), 9);
    }
  });

  it("gives the stated acceptance values", () => {
    const m = esp32();
    expect(regulatorOut(m.regulator, 5)).toBe(3.3);
    expect(regulatorOut(m.regulator, 3.8)).toBeCloseTo(2.7, 9);
    expect(mcuPowered(m, 2.7)).toBe(true);
    expect(regulatorOut(m.regulator, 3.4)).toBeCloseTo(2.3, 9);
    expect(mcuPowered(m, 2.3)).toBe(false);
  });

  it("powers the MCU from 2.43 V", () => {
    const m = esp32();
    expect([2.42, 2.43, 2.44].map((v) => mcuPowered(m, v))).toEqual([false, true, true]);
  });

  it("refuses a NaN input and returns undefined for an unknown board", () => {
    expect(() => regulatorOut(esp32().regulator, Number.NaN)).toThrow(RangeError);
    expect(() => mcuPowered(esp32(), Number.NaN)).toThrow(RangeError);
    expect(boardPower("board-power:nope@1")).toBeUndefined();
  });

  it("states what is not modelled, sources every number and never says validated", () => {
    const m = esp32();
    expect(m.notModelled.length).toBeGreaterThan(0);
    expect(m.parameterSources.length).toBeGreaterThanOrEqual(16);
    expect(m.parameterSources.every((p) => p.type === "assumption")).toBe(true);
    expect(JSON.stringify(m)).not.toMatch(/validated/i);
  });
});
