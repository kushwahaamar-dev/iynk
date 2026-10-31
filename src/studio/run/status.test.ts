import { describe, expect, it } from "vitest";
import { statusFrom } from "./status";

describe("statusFrom", () => {
  it("is unknown without rails", () => {
    expect(statusFrom(null)).toEqual({ kind: "unknown", supplyMa: null });
  });

  it("reports a brown-out", () => {
    expect(statusFrom({ supplyMa: 120, vin: 3.1, brownout: true }).kind).toBe("brownout");
  });

  it("rounds the current to 0.1 mA", () => {
    expect(statusFrom({ supplyMa: 41.26, vin: 5, brownout: false })).toEqual({ kind: "ok", supplyMa: 41.3 });
  });
});
