import type { Evidence } from "../../project/diagnosis.ts";
import { NS_PER_MS } from "../core/clock.ts";
import type { RobotFacts, RobotSample } from "../mech/facts.ts";
import { modelsFor } from "./models.ts";
import type { CauseId, Finding, NetView, Rule, RuleInput, RunFacts, SymptomId } from "./types.ts";

const STALL_WINDOW_NS = 500 * NS_PER_MS;
const DIRECTION_WINDOW_NS = 500 * NS_PER_MS;
const SLIP_WINDOW_NS = 300 * NS_PER_MS;
const ENCODER_WINDOW_NS = 300 * NS_PER_MS;
const STALL_SPEED_RAD_S = 0.05;
/** A stalled motor draws about this share of its peak current. */
const STALL_CURRENT_SHARE = 0.9;
const SLIP_SHARE = 0.2;
/** Below this the wheel is at rest and a ratio of speeds means nothing. */
const SLIP_MIN_MPS = 0.02;
const ENCODER_MIN_ANGLE_RAD = 0.01;
const MIN_TORQUE_NM = 1e-6;
const TIP_DEG = 45;
const MAX_EVIDENCE = 4;

type Held = (row: RobotSample, prev: RobotSample | undefined) => boolean;

const byJoint = (samples: readonly RobotSample[]): Map<string, RobotSample[]> => {
  const joints = new Map<string, RobotSample[]>();
  for (const s of samples) {
    const rows = joints.get(s.joint);
    if (rows) rows.push(s);
    else joints.set(s.joint, [s]);
  }
  return joints;
};

/** The first run of consecutive samples that all satisfy `held` and span at least `windowNs`. */
function firstWindow(rows: readonly RobotSample[], held: Held, windowNs: number): RobotSample[] | undefined {
  let start = -1;
  for (let i = 0; i < rows.length; i++) {
    if (!held(rows[i], rows[i - 1])) {
      start = -1;
    } else {
      if (start < 0) start = i;
      if (rows[i].atNs - rows[start].atNs >= windowNs) return rows.slice(start, i + 1);
    }
  }
  return undefined;
}

const evidence = (ref: string, at: number, value: number, unit: string, causeId: CauseId, kind: Evidence["kind"] = "state"): Evidence => ({
  kind,
  ref,
  at: Math.round(at),
  value: Number(value.toPrecision(12)),
  unit,
  provenance: "computed",
  tier: "T1",
  modelIds: modelsFor(causeId).map((m) => m.id),
});

interface Detector {
  id: string;
  causeId: CauseId;
  symptomId: SymptomId;
  messageKey: string;
  /** One finding per joint (or one for the whole robot), or nothing. */
  scan(rows: readonly RobotSample[]): { at: RobotSample; evidence: Evidence[]; args: Finding["args"] } | undefined;
}

const stall: Detector = {
  id: "solve:motor-stall@1",
  causeId: "motor-stall",
  symptomId: "robot-wont-move",
  messageKey: "check.motor-stall",
  scan(rows) {
    const peakA = Math.max(0, ...rows.map((r) => Math.abs(r.armatureA)));
    if (peakA === 0) return undefined;
    const win = firstWindow(
      rows,
      (r) => r.cmdSign !== 0 && Math.abs(r.speedRadS) < STALL_SPEED_RAD_S && Math.abs(r.armatureA) >= STALL_CURRENT_SHARE * peakA,
      STALL_WINDOW_NS,
    );
    const last = win?.at(-1);
    if (!win || !last) return undefined;
    const ref = last.joint;
    return {
      at: win[0],
      evidence: [
        evidence(`${ref}:speed`, last.atNs, last.speedRadS, "rad/s", "motor-stall"),
        evidence(`${ref}:armature`, last.atNs, last.armatureA, "A", "motor-stall"),
      ],
      args: { joint: ref, amps: Number(last.armatureA.toPrecision(3)) },
    };
  },
};

const direction: Detector = {
  id: "solve:motor-direction-reversed@1",
  causeId: "motor-direction-reversed",
  symptomId: "robot-turns-wrong-way",
  messageKey: "check.motor-direction-reversed",
  scan(rows) {
    const win = firstWindow(
      rows,
      (r) =>
        r.cmdSign !== 0 &&
        Math.abs(r.torqueNm) > MIN_TORQUE_NM &&
        Math.abs(r.speedRadS) > STALL_SPEED_RAD_S &&
        Math.sign(r.speedRadS) !== r.cmdSign,
      DIRECTION_WINDOW_NS,
    );
    const last = win?.at(-1);
    if (!win || !last) return undefined;
    return {
      at: win[0],
      evidence: [
        evidence(`${last.joint}:command`, win[0].atNs, last.cmdSign, "sign", "motor-direction-reversed"),
        evidence(`${last.joint}:speed`, last.atNs, last.speedRadS, "rad/s", "motor-direction-reversed"),
      ],
      args: { joint: last.joint },
    };
  },
};

const encoder: Detector = {
  id: "solve:encoder-channel-swapped@1",
  causeId: "encoder-channel-swapped",
  symptomId: "encoder-count-wrong",
  messageKey: "check.encoder-channel-swapped",
  scan(rows) {
    const win = firstWindow(
      rows,
      (r, prev) =>
        prev !== undefined &&
        r.encoderCount !== undefined &&
        prev.encoderCount !== undefined &&
        r.encoderCount < prev.encoderCount &&
        r.angleRad - prev.angleRad > ENCODER_MIN_ANGLE_RAD,
      ENCODER_WINDOW_NS,
    );
    const first = win?.[0];
    const last = win?.at(-1);
    if (!win || !first || !last) return undefined;
    return {
      at: first,
      evidence: [
        evidence(`${last.joint}:angle`, last.atNs, last.angleRad - first.angleRad, "rad", "encoder-channel-swapped", "timeline"),
        evidence(`${last.joint}:count`, last.atNs, (last.encoderCount ?? 0) - (first.encoderCount ?? 0), "counts", "encoder-channel-swapped", "timeline"),
      ],
      args: { joint: last.joint },
    };
  },
};

const slip: Detector = {
  id: "solve:wheel-slip@1",
  causeId: "wheel-slip",
  symptomId: "wheel-spins-no-motion",
  messageKey: "check.wheel-slip",
  scan(rows) {
    const win = firstWindow(
      rows,
      (r) => {
        const top = Math.max(Math.abs(r.surfaceSpeedMps), Math.abs(r.groundSpeedMps));
        return top >= SLIP_MIN_MPS && Math.abs(r.surfaceSpeedMps - r.groundSpeedMps) > SLIP_SHARE * top;
      },
      SLIP_WINDOW_NS,
    );
    const last = win?.at(-1);
    if (!win || !last) return undefined;
    return {
      at: win[0],
      evidence: [
        evidence(`${last.joint}:surface-speed`, last.atNs, last.surfaceSpeedMps, "m/s", "wheel-slip"),
        evidence(`${last.joint}:ground-speed`, last.atNs, last.groundSpeedMps, "m/s", "wheel-slip"),
      ],
      args: {
        joint: last.joint,
        surface: Number(last.surfaceSpeedMps.toPrecision(3)),
        ground: Number(last.groundSpeedMps.toPrecision(3)),
      },
    };
  },
};

const tip: Detector = {
  id: "solve:tip-over@1",
  causeId: "tip-over",
  symptomId: "robot-tips-over",
  messageKey: "check.tip-over",
  scan(rows) {
    const first = rows.find((r) => Math.abs(r.tiltDeg) > TIP_DEG);
    if (!first) return undefined;
    return {
      at: first,
      evidence: [evidence(`${first.joint}:tilt`, first.atNs, first.tiltDeg, "deg", "tip-over")],
      args: { deg: Math.round(first.tiltDeg) },
    };
  },
};

function toRule(d: Detector, wholeRobot: boolean): Rule {
  return {
    id: d.id,
    layer: "solved",
    causeId: d.causeId,
    symptomId: d.symptomId,
    needs: ["run"],
    enabled: true,
    check({ run, skipped }: RuleInput): Finding[] {
      if (!run?.robot) {
        skipped.add(d.id, "no robot run");
        return [];
      }
      const groups = wholeRobot ? [run.robot.samples] : [...byJoint(run.robot.samples).values()];
      return groups.flatMap((rows) => {
        const hit = d.scan(rows);
        if (!hit) return [];
        return {
          ruleId: d.id,
          causeId: d.causeId,
          symptomId: d.symptomId,
          severity: "error",
          targets: [{ kind: "part", id: hit.at.joint }],
          evidence: hit.evidence.slice(0, MAX_EVIDENCE),
          messageKey: d.messageKey,
          args: hit.args,
        } satisfies Finding;
      });
    },
  };
}

export const ROBOT_MOTION_RULES: readonly Rule[] = [
  toRule(stall, false),
  toRule(direction, false),
  toRule(encoder, false),
  toRule(slip, false),
  toRule(tip, true),
];

/** Runs the five rules over robot facts alone. */
export function robotFindingsFrom(facts: RobotFacts): Finding[] {
  const input = { view: {} as NetView, run: { robot: facts } as RunFacts, skipped: { add: () => {} } };
  return ROBOT_MOTION_RULES.flatMap((rule) => rule.check(input));
}
