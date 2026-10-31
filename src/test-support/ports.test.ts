import { describe, expect, test } from "vitest";
import { RESERVED_PORTS, randomTestPort } from "./ports";

const RESERVED_SLOT = (3117 + 0.5) / 10_000;

describe("randomTestPort", () => {
  test("skips the reserved slot and uses the next draw", () => {
    const draws = [RESERVED_SLOT, 0.25];
    expect(randomTestPort(() => draws.shift()!)).toBe(42_500);
  });

  test("real draws stay in range and never hit a reserved port", () => {
    for (let i = 0; i < 2_000; i += 1) {
      const port = randomTestPort();
      expect(port).toBeGreaterThanOrEqual(40_000);
      expect(port).toBeLessThanOrEqual(49_999);
      expect(RESERVED_PORTS.has(port)).toBe(false);
    }
  });
});
