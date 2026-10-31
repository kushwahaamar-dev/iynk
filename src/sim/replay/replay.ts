import type { SimTime } from "../core/clock.ts";
import type { ReplayRecord, ReplaySpec } from "./record.ts";

export type ReplayVerdict =
  | { ok: true }
  | { ok: false; first: { at: SimTime; what: "checkpoint" | "pin-trace" | "serial"; expected: string; actual: string } };

export interface ReplayRun {
  checkpoints: ReplayRecord["checkpoints"];
  pinTraceHash: string;
  serialHash: string;
}

const ABSENT = "none";

/**
 * Re-runs a record and names the first difference: a checkpoint (earliest first), then the two summary hashes when the
 * spec carries them. A summary hash has no time of its own, so it is reported at the end of the run.
 */
export function replay(spec: ReplaySpec, run: (r: ReplaySpec) => ReplayRun): ReplayVerdict {
  const actual = run(spec);
  const count = Math.max(spec.checkpoints.length, actual.checkpoints.length);
  for (let i = 0; i < count; i++) {
    const want = spec.checkpoints[i];
    const got = actual.checkpoints[i];
    if (want?.hash === got?.hash && want?.at === got?.at) continue;
    return {
      ok: false,
      first: { at: (want ?? got).at, what: "checkpoint", expected: want?.hash ?? ABSENT, actual: got?.hash ?? ABSENT },
    };
  }
  const at = spec.endsAt ?? spec.checkpoints.at(-1)?.at ?? 0;
  if (spec.pinTraceHash !== undefined && spec.pinTraceHash !== actual.pinTraceHash) {
    return { ok: false, first: { at, what: "pin-trace", expected: spec.pinTraceHash, actual: actual.pinTraceHash } };
  }
  if (spec.serialHash !== undefined && spec.serialHash !== actual.serialHash) {
    return { ok: false, first: { at, what: "serial", expected: spec.serialHash, actual: actual.serialHash } };
  }
  return { ok: true };
}
