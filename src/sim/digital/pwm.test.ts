// @vitest-environment node
import { describe, expect, it } from "vitest";
import { averageDuty, edgesBetween } from "./pwm.ts";

const UNO = { duty: 0.25, hz: 490 };

describe("edgesBetween", () => {
  it("gives the edge times of 490 Hz at 25 percent", () => {
    expect(edgesBetween(UNO, 0, 5_000_000)).toEqual([
      { at: 0, level: 1 },
      { at: 510_204, level: 0 },
      { at: 2_040_816, level: 1 },
      { at: 2_551_020, level: 0 },
      { at: 4_081_632, level: 1 },
      { at: 4_591_836, level: 0 },
    ]);
  });

  it("returns the same edges for a window cut in two", () => {
    const whole = edgesBetween(UNO, 0, 20_000_000);
    const parts = [...edgesBetween(UNO, 0, 7_777_777), ...edgesBetween(UNO, 7_777_777, 20_000_000)];
    expect(parts).toEqual(whole);
  });

  it("finds a falling edge whose rising edge is before the window", () => {
    expect(edgesBetween(UNO, 400_000, 600_000)).toEqual([{ at: 510_204, level: 0 }]);
  });

  it("has no edges when the signal is steady", () => {
    expect(edgesBetween({ duty: 0, hz: 490 }, 0, 1e9)).toEqual([]);
    expect(edgesBetween({ duty: 1, hz: 490 }, 0, 1e9)).toEqual([]);
    expect(edgesBetween({ duty: 0.5, hz: 0 }, 0, 1e9)).toEqual([]);
  });
});

describe("averageDuty", () => {
  it("is the duty over whole cycles", () => {
    const period = 1e9 / UNO.hz;
    expect(averageDuty(UNO, 0, Math.round(period * 10))).toBeCloseTo(0.25, 4);
  });

  it("agrees with the edges over a window", () => {
    const edges = edgesBetween(UNO, 0, 1_000_000_000);
    let high = 0;
    for (let i = 0; i < edges.length; i += 2) high += (edges[i + 1]?.at ?? 1_000_000_000) - edges[i].at;
    expect(averageDuty(UNO, 0, 1_000_000_000)).toBeCloseTo(high / 1e9, 9);
  });

  it("is the duty itself when steady", () => {
    expect(averageDuty({ duty: 1, hz: 490 }, 0, 100)).toBe(1);
    expect(averageDuty({ duty: 0, hz: 490 }, 0, 100)).toBe(0);
  });
});
