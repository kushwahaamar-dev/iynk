import type { Evidence } from "../../project/diagnosis.ts";
import { NS_PER_MS } from "../core/clock.ts";
import { CELL_MIN_V, type RobotFacts, type ResetFact } from "../mech/facts.ts";
import { modelsFor } from "./models.ts";
import type { CauseId, Finding, NetView, Rule, RuleInput, SymptomId } from "./types.ts";

/** A reset this soon after a motor starts is blamed on the start, not on something else. */
const MOTOR_START_WINDOW_NS = 50 * NS_PER_MS;
const SAG_WINDOW_MS = 20;
/** The sensor array's upper limit when no descriptor gives `range_max_mm`: h_opt 3 mm plus h_range 6.5 mm. */
const DEFAULT_SENSOR_MAX_MM = 9.5;
const LOOP_OVERRUN = 2;
const DEFAULT_LOOP_PERIOD_NS = 20 * NS_PER_MS;

interface Meta {
  id: string;
  causeId: CauseId;
  symptomId: SymptomId;
  messageKey: string;
  severity?: Finding["severity"];
}

type Scan = (facts: RobotFacts, view: NetView, skip: (what: string) => void) => Omit<Finding, keyof Meta | "ruleId" | "severity">[];

const evidence = (kind: Evidence["kind"], ref: string, at: number, value: number, unit: string, causeId: CauseId): Evidence => ({
  kind,
  ref,
  at: Math.round(at),
  value: Number(value.toPrecision(12)),
  unit,
  provenance: "computed",
  tier: "T1",
  modelIds: modelsFor(causeId).map((m) => m.id),
});

function rule(meta: Meta, scan: Scan): Rule {
  return {
    id: meta.id,
    layer: "solved",
    causeId: meta.causeId,
    symptomId: meta.symptomId,
    needs: ["run"],
    enabled: true,
    check({ view, run, skipped }: RuleInput): Finding[] {
      if (!run?.robot) {
        skipped.add(meta.id, "no robot run");
        return [];
      }
      return scan(run.robot, view, (what) => skipped.add(meta.id, what)).map((f) => ({
        ruleId: meta.id,
        causeId: meta.causeId,
        symptomId: meta.symptomId,
        severity: meta.severity ?? "error",
        messageKey: meta.messageKey,
        ...f,
      }));
    },
  };
}

const sensorTooHigh = rule(
  { id: "solve:sensor-too-high@1", causeId: "sensor-too-high", symptomId: "line-not-detected", messageKey: "check.sensor-too-high" },
  (facts, view) =>
    Object.entries(facts.sensorHeights).flatMap(([sensor, heightMm]) => {
      const maxMm = view.descriptor(sensor)?.mechanics?.sensor?.range_max_mm ?? DEFAULT_SENSOR_MAX_MM;
      if (heightMm <= maxMm) return [];
      const at = facts.samples.at(-1)?.atNs ?? 0;
      return {
        targets: [{ kind: "part" as const, id: sensor }],
        evidence: [
          evidence("state", `${sensor}:height`, at, heightMm, "mm", "sensor-too-high"),
          evidence("state", `${sensor}:max-height`, at, maxMm, "mm", "sensor-too-high"),
        ],
        args: { sensor, heightMm: Number(heightMm.toFixed(1)), maxMm },
      };
    }),
);

/** A line sensor whose every channel stayed within this of one end of 0..1 is pinned. */
const PINNED_EPS = 0.02;
/** Fewer ranger samples than this say nothing about the beam. */
const MIN_RANGER_SAMPLES = 5;

const sensorSaturated = rule(
  { id: "solve:sensor-saturated@1", causeId: "sensor-saturated", symptomId: "line-not-detected", messageKey: "check.sensor-saturated", severity: "warning" },
  (facts, view, skip) =>
    facts.sensors.flatMap((s) => {
      if (s.kind !== "line" || s.samples === 0 || s.min === null || s.max === null) return [];
      const maxMm = view.descriptor(s.part)?.mechanics?.sensor?.range_max_mm ?? DEFAULT_SENSOR_MAX_MM;
      if ((facts.sensorHeights[s.part] ?? 0) > maxMm) {
        skip("sensor too high explains it");
        return [];
      }
      const low = s.max <= PINNED_EPS;
      if (!low && s.min < 1 - PINNED_EPS) return [];
      const at = facts.samples.at(-1)?.atNs ?? 0;
      return {
        targets: [{ kind: "part" as const, id: s.part }],
        evidence: [evidence("state", `${s.part}:reflectance`, at, low ? s.max : s.min, "ratio", "sensor-saturated")],
        args: { sensor: s.part, end: low ? "low" : "high", reflectance: Number((low ? s.max : s.min).toFixed(3)) },
      };
    }),
);

const rangerBeamBlocked = rule(
  { id: "solve:ranger-beam-blocked@1", causeId: "ranger-beam-blocked", symptomId: "ranger-always-near", messageKey: "check.ranger-beam-blocked" },
  (facts) =>
    facts.sensors.flatMap((s) => {
      if (s.kind !== "ranger" || s.samples < MIN_RANGER_SAMPLES || s.tooClose < s.samples) return [];
      const at = facts.samples.at(-1)?.atNs ?? 0;
      return {
        targets: [{ kind: "part" as const, id: s.part }],
        evidence: [evidence("state", `${s.part}:too-close`, at, s.tooClose, "samples", "ranger-beam-blocked")],
        args: { sensor: s.part, mount: s.mount, samples: s.samples },
      };
    }),
);

const driverUndersized = rule(
  { id: "solve:driver-undersized@1", causeId: "driver-undersized", symptomId: "robot-wont-move", messageKey: "check.driver-undersized" },
  (facts, view, skip) => {
    const drivers = view.parts().flatMap((part) => {
      const limitA = view.descriptor(part)?.mechanics?.driver?.i_max_a;
      return limitA === undefined ? [] : { part, limitA };
    });
    if (drivers.length !== 1) {
      skip(drivers.length === 0 ? "no driver current limit" : "more than one driver");
      return [];
    }
    const [{ part, limitA }] = drivers;
    const peak = facts.samples.reduce((top, s) => (Math.abs(s.armatureA) > Math.abs(top.armatureA) ? s : top), facts.samples[0]);
    if (peak && Math.abs(peak.armatureA) >= limitA) {
      return [{
        targets: [{ kind: "part", id: part }],
        evidence: [
          evidence("state", `${peak.joint}:armature`, peak.atNs, Math.abs(peak.armatureA), "A", "driver-undersized"),
          evidence("state", `${part}:i-max`, peak.atNs, limitA, "A", "driver-undersized"),
        ],
        args: { part, joint: peak.joint, amps: Number(Math.abs(peak.armatureA).toPrecision(3)), limitA },
      }];
    }
    const { stall } = facts;
    if (stall?.result !== "fail" || stall.limitingPart !== part || stall.value === null || stall.limit === null) return [];
    return [{
      targets: [{ kind: "part", id: part }],
      evidence: [
        evidence("state", `${part}:stall`, 0, stall.value, "A", "driver-undersized"),
        evidence("state", `${part}:i-max`, 0, stall.limit, "A", "driver-undersized"),
      ],
      args: { part, joint: "", amps: Number(stall.value.toPrecision(3)), limitA: stall.limit },
    }];
  },
);

/** Which of the two supplies is under its minimum at the reset, if either. */
function lowSupply(r: ResetFact, packMinV: number | undefined, logicMinV: number | undefined): { name: "pack" | "logic rail"; ref: string; v: number } | undefined {
  if (packMinV !== undefined && r.packV < packMinV) return { name: "pack", ref: "pack", v: r.packV };
  if (logicMinV !== undefined && r.railV < logicMinV) return { name: "logic rail", ref: "rail", v: r.railV };
  return undefined;
}

const batterySagReset = rule(
  { id: "solve:battery-sag-reset@1", causeId: "battery-sag-reset", symptomId: "robot-resets-at-start", messageKey: "check.battery-sag-reset" },
  (facts, view, skip) => {
    if (facts.resets.length === 0) {
      skip("no resets");
      return [];
    }
    const cells = view.parts().map((part) => view.descriptor(part)?.mechanics?.battery?.cells).find((n) => n !== undefined);
    const packMinV = facts.packMinV ?? (cells === undefined ? undefined : cells * CELL_MIN_V);
    if (facts.logicMinV === undefined) skip("no logic minimum");
    return facts.resets.flatMap((r) => {
      if (r.motorStartNs === null) return [];
      const after = r.atNs - r.motorStartNs;
      if (after < 0 || after > MOTOR_START_WINDOW_NS) return [];
      const low = lowSupply(r, packMinV, facts.logicMinV);
      if (!low) return [];
      return {
        targets: [{ kind: "net", id: low.ref }],
        evidence: [
          evidence("net-voltage", low.ref, r.atNs, low.v, "V", "battery-sag-reset"),
          evidence("timeline", "reset", r.atNs, after / NS_PER_MS, "ms", "battery-sag-reset"),
        ],
        args: { low: low.name, v: Number(low.v.toPrecision(3)), afterMs: Number((after / NS_PER_MS).toFixed(1)), windowMs: SAG_WINDOW_MS },
      };
    });
  },
);

const loopTooSlow = rule(
  { id: "solve:loop-too-slow@1", causeId: "loop-too-slow", symptomId: "speed-oscillates", messageKey: "check.loop-too-slow" },
  (facts, _view, skip) => {
    const loop = facts.loopPeriods;
    if (!loop || loop.n === 0) {
      skip("no loop periods");
      return [];
    }
    const targetNs = facts.loopTargetNs ?? DEFAULT_LOOP_PERIOD_NS;
    if (loop.p95Ns <= LOOP_OVERRUN * targetNs) return [];
    return [{
      targets: [{ kind: "file", id: "loop" }],
      evidence: [
        evidence("state", "loop:p95", 0, loop.p95Ns / NS_PER_MS, "ms", "loop-too-slow"),
        evidence("state", "loop:target", 0, targetNs / NS_PER_MS, "ms", "loop-too-slow"),
      ],
      args: { p95Ms: Number((loop.p95Ns / NS_PER_MS).toFixed(1)), targetMs: targetNs / NS_PER_MS },
    }];
  },
);

export const ROBOT_SENSOR_POWER_RULES: readonly Rule[] = [
  sensorTooHigh,
  sensorSaturated,
  rangerBeamBlocked,
  driverUndersized,
  batterySagReset,
  loopTooSlow,
];
