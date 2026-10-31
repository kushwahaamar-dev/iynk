import type { SimTime } from "../core/clock.ts";
import type { SliceBudget } from "../engine.ts";
import type { ReplayRecord } from "./record.ts";
import type { EngineFactory } from "./restore.ts";

export interface ReplayMismatch {
  at: SimTime;
  expected: string;
  actual: string;
  engine?: string;
}

export type ReplayCheck = { ok: true; checkpoints: number } | { ok: false; first: ReplayMismatch };

const NEVER_YIELD: SliceBudget = {
  shouldYield: () => false,
  work: { statements: Infinity, events: Infinity, outputBytes: Infinity },
};

const ABSENT = "none";

/** Replays the inputs in `(at, seq)` order into a fresh orchestrator and names the first checkpoint that differs. */
export function replayAndCheck(rec: ReplayRecord, make: EngineFactory): ReplayCheck {
  const o = make();
  const inputs = [...rec.inputs].sort((a, b) => a.at - b.at || a.seq - b.seq);
  for (const input of inputs) {
    o.runUntil(input.at, NEVER_YIELD);
    o.inject({ kind: input.kind, target: input.target, value: input.value });
  }
  o.runUntil(rec.endsAt, NEVER_YIELD);

  const actual = o.checkpoints;
  const count = Math.max(rec.checkpoints.length, actual.length);
  for (let i = 0; i < count; i++) {
    const want = rec.checkpoints[i];
    const got = actual[i];
    if (want?.at === got?.at && want?.hash === got?.hash) continue;
    return { ok: false, first: { at: (want ?? got).at, expected: want?.hash ?? ABSENT, actual: got?.hash ?? ABSENT } };
  }
  return { ok: true, checkpoints: count };
}
