// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Diagnosis, Evidence } from "../project/diagnosis.ts";
import { evidenceLine, exportDiagnosis, parseDiagnosis } from "./diagnosis.ts";

const reading: Evidence = { kind: "net-voltage", ref: "sda", at: 1_204_900_000, value: 0.1, unit: "V", provenance: "computed", tier: "T2", modelIds: ["res-ideal"] };
const serial: Evidence = { kind: "serial-line", ref: "serial", at: 5_000_000, value: "no ack", provenance: "mocked", tier: "T1", modelIds: [] };
const pin: Evidence = { kind: "pin-level", ref: "u1:scl", at: 0, value: 1, provenance: "approximation", tier: "T3", modelIds: [] };

const record: Diagnosis = { cause_id: "swapped-pins", symptom_id: "i2c-no-ack", evidence: [reading, serial, pin], hint_level: 0 };
const meta = { outcome: "clean", projectId: "prj_abc" } as const;

const exported = (d: Diagnosis = record) => exportDiagnosis(d, meta);
type Raw = { diagnosis: { cause_id: string; hint_level: number; evidence: Record<string, unknown>[] } };
const parseWith = (change: (file: Raw) => void) => {
  const file: Raw = JSON.parse(exported().json);
  change(file);
  return parseDiagnosis(JSON.stringify(file));
};

describe("exportDiagnosis", () => {
  it("round-trips through parseDiagnosis", () => {
    const parsed = parseDiagnosis(exported().json);
    expect(parsed).toEqual({
      ok: true,
      value: { v: 1, diagnosis: record, outcome: "clean", noEvidence: false, tierLowest: "T1", projectId: "prj_abc" },
    });
  });

  it("names the file after the cause only", () => {
    const { filename } = exported();
    expect(filename).toBe("diagnosis-swapped-pins.json");
    expect(filename).not.toContain("prj_abc");
  });

  it("writes the same text for the same record whatever the key order", () => {
    const shuffled: Diagnosis = { hint_level: 0, evidence: record.evidence, symptom_id: "i2c-no-ack", cause_id: "swapped-pins" };
    expect(exported(shuffled).json).toBe(exported().json);
  });

  it("flags a record with no evidence", () => {
    const empty = exported({ ...record, evidence: [] });
    const parsed = parseDiagnosis(empty.json);
    expect(parsed.ok && parsed.value.noEvidence).toBe(true);
    expect(empty.text).toContain("guess");
  });

  it("writes a plain summary with the evidence lines", () => {
    const { text } = exported();
    expect(text).toContain("cause: swapped-pins, symptom: i2c-no-ack, hint level 0");
    expect(text).toContain("Net voltage sda at 1,204 ms: 0.1 V");
  });
});

describe("evidenceLine", () => {
  it("rounds the time down to whole milliseconds", () => {
    const t = (key: string, args?: Record<string, string | number>) => `${key}:${args?.ms ?? ""}`;
    expect(evidenceLine(reading, t as never)).toBe("record.line:1,204");
  });
});

describe("parseDiagnosis", () => {
  it("accepts an extension cause id and refuses an unknown core one", () => {
    expect(parseWith((f) => (f.diagnosis.cause_id = "x-my-fault")).ok).toBe(true);
    expect(parseWith((f) => (f.diagnosis.cause_id = "made-up")).ok).toBe(false);
  });

  it("refuses a value over 200 characters", () => {
    const result = parseWith((f) => (f.diagnosis.evidence[1].value = "x".repeat(201)));
    expect(result).toEqual({ ok: false, error: { code: "bad-record", path: "/diagnosis/evidence/1/value" } });
  });

  it("refuses a hint level outside 0 to 3, an unknown kind and a fractional time", () => {
    expect(parseWith((f) => (f.diagnosis.hint_level = 4)).ok).toBe(false);
    expect(parseWith((f) => (f.diagnosis.evidence[0].kind = "mood")).ok).toBe(false);
    expect(parseWith((f) => (f.diagnosis.evidence[0].at = 1.5)).ok).toBe(false);
  });

  it("refuses more than 64 evidence entries", () => {
    expect(parseWith((f) => (f.diagnosis.evidence = Array.from({ length: 65 }, () => ({ ...reading })))).ok).toBe(false);
    expect(parseWith((f) => (f.diagnosis.evidence = Array.from({ length: 64 }, () => ({ ...reading })))).ok).toBe(true);
  });

  it("reports text that is not JSON", () => {
    expect(parseDiagnosis("{")).toMatchObject({ ok: false, error: { code: "bad-json" } });
  });
});
