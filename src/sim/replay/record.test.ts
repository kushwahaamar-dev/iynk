// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateReplayLog } from "../../project/generated/validate.mjs";
import type { InputEntry, SimSettings } from "../engine.ts";
import { createOrchestrator } from "../orchestrator.ts";
import { createRecorder, fromReplayLog, toReplayLog, type ReplayRecord } from "./record.ts";
import { pinTraceHash, serialHash } from "./trace.ts";

const SETTINGS: SimSettings = { seed: 7, toleranceMode: "nominal", analog: { mode: "dc-event", stepNs: 1000 }, speed: 1 };
const PROJECT = { id: "prj_demo", revision: 3 };

const inputs: InputEntry[] = [
  { at: 10, seq: 1, kind: "pin", target: "D2", value: 0 },
  { at: 20, seq: 2, kind: "serial", target: "uart0", value: "hi\n" },
  { at: 30, seq: 3, kind: "fault", target: "r1", value: { open: true } },
  { at: 40, seq: 4, kind: "control", target: "reset", value: null },
  { at: 50, seq: 5, kind: "control", target: "power", value: false },
  { at: 60, seq: 6, kind: "analog", target: "A0", value: 2.5 },
  { at: 70, seq: 7, kind: "param", target: "pot1", value: 0.5 },
];

const record = (): ReplayRecord => ({
  format: 1,
  docHash: "ab".repeat(32),
  seed: SETTINGS.seed,
  settings: SETTINGS,
  versions: { engines: { "engine:interp-arduino@1.0.0": "1.0.0" }, models: { "led@1": "1.2.0" }, dmath: "none" },
  inputs,
  checkpoints: [
    { at: 1_000_000_000, hash: "0123456789abcdef" },
    { at: 2_000_000_000, hash: "fedcba9876543210" },
  ],
  endsAt: 2_500_000_000,
  pinTraceHash: "1111111111111111",
  serialHash: "2222222222222222",
});

const running = { engines: { "engine:interp-arduino@1.0.0": "1.0.0" } };

function log(r: ReplayRecord) {
  const out = toReplayLog(r, PROJECT);
  if ("error" in out) throw new Error(out.error);
  return out;
}

describe("record to log to spec", () => {
  it("passes the schema and keeps every field a log can carry", () => {
    const original = record();
    const out = log(original);
    expect(validateReplayLog(out), JSON.stringify(validateReplayLog.errors)).toBe(true);
    expect(out.events.map((e) => e.kind)).toEqual(["input", "input", "fault", "reset", "power", "input", "input"]);
    expect(out.project).toEqual({ ...PROJECT, stateHash: original.docHash });
    expect(out.checkpoints![0].hash).toBe(`${"0".repeat(48)}0123456789abcdef`);

    const spec = fromReplayLog(out, running);
    expect(spec).toEqual({
      docHash: original.docHash,
      seed: original.seed,
      versions: original.versions,
      inputs: original.inputs,
      checkpoints: original.checkpoints,
    });
  });

  it("handles no inputs and no checkpoints", () => {
    const empty = { ...record(), inputs: [], checkpoints: [] };
    const out = log(empty);
    expect(validateReplayLog(out)).toBe(true);
    expect(fromReplayLog(out, running)).toMatchObject({ inputs: [], checkpoints: [] });
  });
});

describe("toReplayLog refuses what the schema would", () => {
  it("a docHash of 16 hex digits", () => {
    expect(toReplayLog({ ...record(), docHash: "0123456789abcdef" }, PROJECT)).toHaveProperty("error");
  });

  it("more than 16 engine keys", () => {
    const engines = Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`engine:e${i}@1`, "1.0.0"]));
    expect(toReplayLog({ ...record(), versions: { engines, models: {}, dmath: "none" } }, PROJECT)).toHaveProperty("error");
  });

  it("a version string over 40 characters", () => {
    const versions = { ...record().versions, models: { "led@1": "1".repeat(41) } };
    expect(toReplayLog({ ...record(), versions }, PROJECT)).toEqual({ error: expect.stringContaining("model:led@1") });
  });

  it("a seed outside 32 bits", () => {
    expect(toReplayLog({ ...record(), seed: 2 ** 32 }, PROJECT)).toHaveProperty("error");
  });
});

describe("fromReplayLog", () => {
  it("refuses a log made on other engine versions and says both", () => {
    const out = fromReplayLog(log(record()), { engines: { "engine:interp-arduino@1.0.0": "2.0.0" } });
    expect(out).toEqual({ error: expect.stringContaining("engine:interp-arduino@1.0.0=1.0.0") });
    expect(out).toEqual({ error: expect.stringContaining("engine:interp-arduino@1.0.0=2.0.0") });
  });

  it("refuses a checkpoint that is not zero padded", () => {
    const out = log(record());
    out.checkpoints![0].hash = "f".repeat(64);
    expect(fromReplayLog(out, running)).toHaveProperty("error");
  });

  it("refuses an event that lost its seq, kind or target", () => {
    const out = log(record());
    out.events[0].data = {};
    expect(fromReplayLog(out, running)).toHaveProperty("error");
  });
});

describe("createRecorder", () => {
  it("reads the orchestrator and the serial output", () => {
    const orch = createOrchestrator({
      engines: [],
      digital: { load: () => [], onPin: () => {}, partStates: () => [], stateHash: () => "0" },
    });
    orch.inject({ kind: "pin", target: "D2", value: 1 });
    const serial = [{ at: 5, text: "x" }];
    const out = createRecorder(orch, { docHash: "0".repeat(64), settings: SETTINGS, engineVersions: { a: "1" }, serial: () => serial }).finish(0);
    expect(out.inputs).toEqual([{ at: 0, seq: 1, kind: "pin", target: "D2", value: 1 }]);
    expect(out.seed).toBe(7);
    expect(out.pinTraceHash).toBe(pinTraceHash([]));
    expect(out.serialHash).toBe(serialHash(serial));
    expect(out.versions).toEqual({ engines: { a: "1" }, models: {}, dmath: "none" });
  });
});
