// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NS_PER_MS } from "../core/clock.ts";
import type { RobotFacts, RobotSample } from "../mech/facts.ts";
import { robotFindingsFrom } from "./robot.ts";

const STEP_NS = 100 * NS_PER_MS;

const sample = (i: number, over: Partial<RobotSample> = {}): RobotSample => ({
  atNs: i * STEP_NS,
  joint: "left",
  speedRadS: 10,
  angleRad: i,
  cmdSign: 1,
  armatureA: 0.2,
  torqueNm: 0.01,
  surfaceSpeedMps: 0.3,
  groundSpeedMps: 0.3,
  encoderCount: i * 10,
  tiltDeg: 2,
  driverState: "drive",
  ...over,
});

const run = (count: number, over: (i: number) => Partial<RobotSample> = () => ({})): RobotFacts => ({
  samples: Array.from({ length: count }, (_, i) => sample(i, over(i))),
  sensorHeights: {},
  supply: [],
  resets: [],
  decimated: false,
});

const ids = (facts: RobotFacts): string[] => robotFindingsFrom(facts).map((f) => f.causeId);

describe("robot motion detectors", () => {
  it("stay silent on a healthy run", () => {
    expect(ids(run(40))).toEqual([]);
  });

  it("finds a stall after half a second at peak current and no speed", () => {
    const stalled = (i: number): Partial<RobotSample> => (i >= 10 ? { speedRadS: 0, armatureA: 2 } : i === 5 ? { armatureA: 2 } : {});
    expect(ids(run(16, stalled))).toEqual(["motor-stall"]);
    expect(ids(run(15, stalled))).toEqual([]);
  });

  it("does not call a transient a stall, or a motor commanded zero", () => {
    expect(ids(run(40, (i) => (i < 4 ? { speedRadS: 0, armatureA: 2 } : {})))).toEqual([]);
    expect(ids(run(40, (i) => (i >= 10 ? { speedRadS: 0, armatureA: 2, cmdSign: 0 } : {})))).toEqual([]);
  });

  it("finds a wheel turning backward under a forward command with two pieces of evidence", () => {
    const facts = run(20, (i) => (i >= 5 ? { speedRadS: -8 } : {}));
    const [finding] = robotFindingsFrom(facts);
    expect(finding.causeId).toBe("motor-direction-reversed");
    expect(finding.evidence).toHaveLength(2);
    expect(finding.evidence.every((e) => e.tier === "T1" && e.provenance === "computed")).toBe(true);
  });

  it("needs half a second and torque for direction, and a command", () => {
    const back = (n: number) => (i: number): Partial<RobotSample> => (i >= 5 && i < 5 + n ? { speedRadS: -8 } : {});
    expect(ids(run(20, back(6)))).toEqual(["motor-direction-reversed"]);
    expect(ids(run(20, back(5)))).toEqual([]);
    expect(ids(run(20, (i) => (i >= 5 ? { speedRadS: -8, torqueNm: 0 } : {})))).toEqual([]);
    expect(ids(run(20, (i) => (i >= 5 ? { speedRadS: -8, cmdSign: 0 } : {})))).toEqual([]);
  });

  it("finds counts falling while the angle rises", () => {
    expect(ids(run(20, (i) => ({ encoderCount: -i * 10 })))).toEqual(["encoder-channel-swapped"]);
    expect(ids(run(20, (i) => ({ encoderCount: -i * 10, angleRad: -i })))).toEqual([]);
  });

  it("finds a wheel faster than the ground under it after 0.3 s", () => {
    const slipping = (n: number) => (i: number): Partial<RobotSample> => (i >= 3 && i < 3 + n ? { groundSpeedMps: 0.1 } : {});
    const [finding] = robotFindingsFrom(run(20, slipping(4)));
    expect(finding.causeId).toBe("wheel-slip");
    expect(finding.evidence.map((e) => e.value)).toEqual([0.3, 0.1]);
    expect(ids(run(20, slipping(3)))).toEqual([]);
    expect(ids(run(20, () => ({ groundSpeedMps: 0.26 })))).toEqual([]);
  });

  it("finds a tilt beyond 45 degrees once", () => {
    expect(ids(run(20, (i) => (i >= 8 ? { tiltDeg: 60 } : {})))).toEqual(["tip-over"]);
    expect(ids(run(20, () => ({ tiltDeg: 45 })))).toEqual([]);
  });
});
