import { NS_PER_MS, type SimTime } from "../core/clock.ts";
import type { ResetFact, RobotFacts, RobotSample } from "../mech/facts.ts";
import type { RunFacts } from "./types.ts";

/** Net ids resolved by `prepareMech`. */
export interface RobotNets {
  pack: string;
  regulator: string;
  rail: string;
}

const START_WINDOW_NS = 50 * NS_PER_MS;
const START_FROM_A = 0.05;
const START_TO_A = 0.1;

function packVoltageAt(supply: RobotFacts["supply"], at: SimTime): number {
  let found = Number.NaN;
  for (const s of supply) {
    if (s.atNs > at) break;
    found = s.v;
  }
  return found;
}

/** The first sample in the window before `at` where a joint's armature current climbed from idle to running. */
function motorStartBefore(samples: readonly RobotSample[], at: SimTime): number | null {
  const previous = new Map<string, number>();
  for (const s of samples) {
    if (s.atNs > at) break;
    const before = previous.get(s.joint);
    previous.set(s.joint, s.armatureA);
    if (s.atNs >= at - START_WINDOW_NS && before !== undefined && before < START_FROM_A && s.armatureA > START_TO_A) return s.atNs;
  }
  return null;
}

export function buildResetFacts(resets: readonly SimTime[], robot: RobotFacts, node: RunFacts["node"], nets: RobotNets): ResetFact[] {
  return resets.map((atNs) => ({
    atNs,
    packV: packVoltageAt(robot.supply, atNs),
    regV: node(nets.regulator, atNs)?.v ?? Number.NaN,
    railV: node(nets.rail, atNs)?.v ?? Number.NaN,
    motorStartNs: motorStartBefore(robot.samples, atNs),
  }));
}

export function withRobotFacts(base: RunFacts, robot: RobotFacts, nets: RobotNets): RunFacts {
  return { ...base, robot: { ...robot, resets: buildResetFacts(base.resets, robot, base.node, nets) } };
}
