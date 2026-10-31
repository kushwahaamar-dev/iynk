import { describe, expect, it } from "vitest";
import { checkVersions, rapierEngineEntries } from "./record.ts";

const pins = { version: "0.21.0", wasmSha256: "4e9890fd".padEnd(64, "a"), jsSha256: "103fa589".padEnd(64, "b") };
const rec = (engines: Record<string, string>) => ({ versions: { engines, models: {}, dmath: "none" } });

describe("rapier engine pins", () => {
  it("writes two 31 character entries", () => {
    const entries = rapierEngineEntries(pins);
    expect(Object.keys(entries)).toEqual(["engine:rapier@0.21.0", "engine:rapier-glue@0.21.0"]);
    for (const v of Object.values(entries)) expect(v).toHaveLength(31);
  });

  it("accepts the same build", () => {
    const e = rapierEngineEntries(pins);
    expect(checkVersions(rec(e), e)).toEqual({ ok: true });
  });

  it("refuses another wasm build and shows both pins", () => {
    const other = rapierEngineEntries({ ...pins, wasmSha256: "f".repeat(64) });
    expect(checkVersions(rec(rapierEngineEntries(pins)), other)).toEqual({
      ok: false,
      reason: "engine-mismatch",
      key: "engine:rapier@0.21.0",
      recorded: rapierEngineEntries(pins)["engine:rapier@0.21.0"],
      running: other["engine:rapier@0.21.0"],
    });
  });

  it("refuses a record with no rapier pin when one is running", () => {
    expect(checkVersions(rec({}), rapierEngineEntries(pins))).toMatchObject({ ok: false, reason: "engine-mismatch", recorded: undefined });
  });

  it("leaves records without rapier alone", () => {
    expect(checkVersions(rec({ "engine:avr@1.0.0": "x" }), { "engine:avr@1.0.0": "y" })).toEqual({ ok: true });
  });

  it("flags a malformed pin", () => {
    expect(checkVersions(rec({ "engine:rapier@0.21.0": "abc" }), {})).toMatchObject({ ok: false, reason: "bad-version" });
  });
});
