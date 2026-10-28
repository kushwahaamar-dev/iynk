// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { ReplaySpec } from "./record.ts";
import { replay, type ReplayRun } from "./replay.ts";

const spec: ReplaySpec = {
  docHash: "0".repeat(64),
  seed: 1,
  versions: { engines: {}, models: {}, dmath: "none" },
  inputs: [],
  checkpoints: [
    { at: 1_000_000_000, hash: "aaaaaaaaaaaaaaaa" },
    { at: 2_000_000_000, hash: "bbbbbbbbbbbbbbbb" },
    { at: 3_000_000_000, hash: "cccccccccccccccc" },
  ],
  endsAt: 3_500_000_000,
  pinTraceHash: "1111111111111111",
  serialHash: "2222222222222222",
};

const same = (): ReplayRun => ({ checkpoints: spec.checkpoints.map((c) => ({ ...c })), pinTraceHash: "1111111111111111", serialHash: "2222222222222222" });

describe("replay", () => {
  it("accepts a run that matches", () => {
    expect(replay(spec, same)).toEqual({ ok: true });
  });

  it("reports a tampered checkpoint as the first difference, with its time", () => {
    const verdict = replay(spec, () => {
      const run = same();
      run.checkpoints[1].hash = "dddddddddddddddd";
      run.checkpoints[2].hash = "eeeeeeeeeeeeeeee";
      return run;
    });
    expect(verdict).toEqual({ ok: false, first: { at: 2_000_000_000, what: "checkpoint", expected: "bbbbbbbbbbbbbbbb", actual: "dddddddddddddddd" } });
  });

  it("reports a checkpoint the run never reached", () => {
    const verdict = replay(spec, () => ({ ...same(), checkpoints: spec.checkpoints.slice(0, 2) }));
    expect(verdict).toEqual({ ok: false, first: { at: 3_000_000_000, what: "checkpoint", expected: "cccccccccccccccc", actual: "none" } });
  });

  it("reports a checkpoint the record never had", () => {
    const verdict = replay(spec, () => ({ ...same(), checkpoints: [...spec.checkpoints, { at: 4_000_000_000, hash: "ffffffffffffffff" }] }));
    expect(verdict).toEqual({ ok: false, first: { at: 4_000_000_000, what: "checkpoint", expected: "none", actual: "ffffffffffffffff" } });
  });

  it("falls back to the summary hashes, pin trace first", () => {
    expect(replay(spec, () => ({ ...same(), serialHash: "9" })).ok).toBe(false);
    const both = replay(spec, () => ({ ...same(), pinTraceHash: "8", serialHash: "9" }));
    expect(both).toEqual({ ok: false, first: { at: 3_500_000_000, what: "pin-trace", expected: "1111111111111111", actual: "8" } });
  });

  it("compares checkpoints only when the spec has no summary hashes", () => {
    const { pinTraceHash: _p, serialHash: _s, endsAt: _e, ...fromLog } = spec;
    expect(replay(fromLog, () => ({ ...same(), pinTraceHash: "8", serialHash: "9" }))).toEqual({ ok: true });
  });

  it("accepts a record with no checkpoints", () => {
    expect(replay({ ...spec, checkpoints: [] }, () => ({ ...same(), checkpoints: [] }))).toEqual({ ok: true });
  });
});
