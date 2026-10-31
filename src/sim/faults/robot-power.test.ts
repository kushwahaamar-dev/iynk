// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NS_PER_MS } from "../core/clock.ts";
import type { ResetFact, RobotFacts, SensorFact } from "../mech/facts.ts";
import { ROBOT_SENSOR_POWER_RULES } from "./robot-power.ts";
import type { Finding, NetView, RunFacts } from "./types.ts";

const descriptors: Record<string, unknown> = {
  qtr: { mechanics: { sensor: { range_max_mm: 9.5 } } },
  drv: { mechanics: { driver: { kind: "h-bridge", i_max_a: 1.2 } } },
  pack: { mechanics: { battery: { cells: 2 } } },
};

const view = {
  parts: () => Object.keys(descriptors),
  descriptor: (part: string) => descriptors[part],
} as unknown as NetView;

const facts = (over: Partial<RobotFacts> = {}): RobotFacts => ({
  samples: [{ atNs: 0, joint: "left", speedRadS: 5, angleRad: 0, cmdSign: 1, armatureA: 0.3, torqueNm: 0.01, surfaceSpeedMps: 0.2, groundSpeedMps: 0.2, tiltDeg: 1, driverState: "run" }],
  sensorHeights: { qtr: 3 },
  sensors: [],
  logicMinV: 4.5,
  supply: [],
  resets: [],
  decimated: false,
  ...over,
});

const reset = (over: Partial<ResetFact> = {}): ResetFact => ({ atNs: 100 * NS_PER_MS, packV: 7.4, regV: 5, railV: 5, motorStartNs: 80 * NS_PER_MS, ...over });

const run = (id: string, robot: RobotFacts | undefined): { findings: Finding[]; skipped: string[] } => {
  const rule = ROBOT_SENSOR_POWER_RULES.find((r) => r.id === id)!;
  const skipped: string[] = [];
  const findings = rule.check({ view, run: { robot } as RunFacts, skipped: { add: (_id, what) => skipped.push(what) } });
  return { findings, skipped };
};

describe("robot sensor, power and timing detectors", () => {
  it("registers six rules and all of them are on", () => {
    expect(ROBOT_SENSOR_POWER_RULES).toHaveLength(6);
    expect(ROBOT_SENSOR_POWER_RULES.filter((r) => !r.enabled)).toEqual([]);
  });

  it("stays silent on healthy facts", () => {
    for (const rule of ROBOT_SENSOR_POWER_RULES) expect(run(rule.id, facts()).findings, rule.id).toEqual([]);
  });

  it("skips without a robot run", () => {
    expect(run("solve:sensor-too-high@1", undefined).skipped).toEqual(["no robot run"]);
  });

  it("finds a line sensor above its range and names the height", () => {
    const [f] = run("solve:sensor-too-high@1", facts({ sensorHeights: { qtr: 33 } })).findings;
    expect(f.causeId).toBe("sensor-too-high");
    expect(f.args).toMatchObject({ sensor: "qtr", heightMm: 33, maxMm: 9.5 });
    expect(run("solve:sensor-too-high@1", facts({ sensorHeights: { qtr: 9.5 } })).findings).toEqual([]);
  });

  it("finds a driver whose limit is reached", () => {
    const hot = facts({ samples: [{ ...facts().samples[0], armatureA: -1.2 }] });
    expect(run("solve:driver-undersized@1", hot).findings).toHaveLength(1);
  });

  it("finds a reset within 50 ms of a motor start while the pack is low", () => {
    const hit = (r: Partial<ResetFact>) => run("solve:battery-sag-reset@1", facts({ resets: [reset(r)] })).findings;
    expect(hit({ packV: 5.5 })[0].args).toMatchObject({ low: "pack", windowMs: 20 });
    expect(hit({ railV: 3.9 })[0].args).toMatchObject({ low: "logic rail" });
    expect(hit({ packV: 5.5, atNs: 130 * NS_PER_MS })).toHaveLength(1);
    expect(hit({ packV: 5.5, atNs: 131 * NS_PER_MS })).toEqual([]);
    expect(hit({ packV: 5.5, motorStartNs: null })).toEqual([]);
    expect(hit({})).toEqual([]);
  });

  it("skips battery-sag-reset when nothing reset", () => {
    expect(run("solve:battery-sag-reset@1", facts()).skipped).toEqual(["no resets"]);
  });

  it("compares the loop period p95 with twice the target", () => {
    const loop = (p95Ms: number) => facts({ loopPeriods: { n: 100, meanNs: 0, p95Ns: p95Ms * NS_PER_MS, maxNs: 0, jitterNs: 0, histogram: [] } });
    expect(run("solve:loop-too-slow@1", loop(41)).findings).toHaveLength(1);
    expect(run("solve:loop-too-slow@1", loop(40)).findings).toEqual([]);
  });

  const reading = (over: Partial<SensorFact>): SensorFact => ({ part: "qtr", binding: "line", mount: "chassis", kind: "line", samples: 200, min: 0.1, max: 0.9, noEcho: 0, tooClose: 0, ...over });

  it("finds a line sensor pinned at either end and not one that sees contrast", () => {
    const hit = (over: Partial<SensorFact>, robot: Partial<RobotFacts> = {}) => run("solve:sensor-saturated@1", facts({ sensors: [reading(over)], ...robot })).findings;
    expect(hit({ min: 0, max: 0.01 })[0].args).toMatchObject({ sensor: "qtr", end: "low" });
    expect(hit({ min: 0.99, max: 1 })[0].args).toMatchObject({ end: "high" });
    expect(hit({})).toEqual([]);
    expect(hit({ samples: 0, min: null, max: null })).toEqual([]);
    expect(hit({ min: 0, max: 0 }, { sensorHeights: { qtr: 30 } })).toEqual([]);
  });

  it("finds a ranger that only ever heard something inside its minimum range", () => {
    const hit = (over: Partial<SensorFact>) => run("solve:ranger-beam-blocked@1", facts({ sensors: [reading({ kind: "ranger", part: "sonar", mount: "nose", min: null, max: null, noEcho: 200, tooClose: 200, ...over })] })).findings;
    expect(hit({})[0].args).toMatchObject({ sensor: "sonar", mount: "nose", samples: 200 });
    expect(hit({ tooClose: 199 })).toEqual([]);
    expect(hit({ samples: 3, tooClose: 3 })).toEqual([]);
  });

  it("takes the driver from the RB-C-04 outcome when the run never reached its limit", () => {
    const stall = (over: Partial<NonNullable<RobotFacts["stall"]>>) => run("solve:driver-undersized@1", facts({ stall: { result: "fail", limitingPart: "drv", value: 2.4, limit: 1.2, ...over } })).findings;
    expect(stall({})[0].args).toMatchObject({ part: "drv", amps: 2.4, limitA: 1.2 });
    expect(stall({ limitingPart: "pack" })).toEqual([]);
    expect(stall({ result: "ok" })).toEqual([]);
  });

  it("judges the logic rail against the minimum the facts carry, not a fixed 4.5 V", () => {
    const hit = (railV: number, logicMinV?: number) => run("solve:battery-sag-reset@1", facts({ logicMinV, resets: [reset({ railV })] })).findings;
    expect(hit(3, 2.97)).toEqual([]);
    expect(hit(2.9, 2.97)[0].args).toMatchObject({ low: "logic rail" });
    expect(hit(3.9, undefined)).toEqual([]);
  });

  it("uses the pack minimum and the loop target the facts carry", () => {
    expect(run("solve:battery-sag-reset@1", facts({ packMinV: 6.5, resets: [reset({ packV: 6 })] })).findings).toHaveLength(1);
    const loop = facts({ loopTargetNs: 5 * NS_PER_MS, loopPeriods: { n: 100, meanNs: 0, p95Ns: 11 * NS_PER_MS, maxNs: 0, jitterNs: 0, histogram: [] } });
    expect(run("solve:loop-too-slow@1", loop).findings[0].args).toMatchObject({ targetMs: 5 });
  });
});
