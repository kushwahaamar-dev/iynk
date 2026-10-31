// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createFactsSampler, type RobotSample } from "./facts.ts";

const sample = (atNs: number): RobotSample => ({
  atNs,
  joint: "wl",
  speedRadS: 0,
  angleRad: 0,
  cmdSign: 0,
  armatureA: 0,
  torqueNm: 0,
  surfaceSpeedMps: 0,
  groundSpeedMps: 0,
  tiltDeg: 0,
  driverState: "coast",
});

describe("facts sampler", () => {
  it("keeps everything under the cap", () => {
    const s = createFactsSampler(10);
    for (let i = 0; i < 9; i++) s.push(sample(i));
    expect(s.facts()).toMatchObject({ decimated: false, resets: [] });
    expect(s.facts().samples).toHaveLength(9);
  });

  it("drops every second sample at the cap and keeps the first and last", () => {
    const s = createFactsSampler(10);
    for (let i = 0; i < 10; i++) s.push(sample(i));
    const f = s.facts();
    expect(f.decimated).toBe(true);
    expect(f.samples.map((x) => x.atNs)).toEqual([0, 2, 4, 6, 8, 9]);
  });
});
