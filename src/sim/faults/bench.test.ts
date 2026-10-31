import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROWS, matches, simulate } from "../../../scripts/bench-check-sheet.mjs";
import { CORE_CAUSE_IDS } from "./cause-ids.ts";
import { benchStatus, fidelityLabelFor, parseBench } from "./bench.ts";
import type { BenchFixture, BenchReal, BenchRow } from "./bench.ts";

const raw: unknown = JSON.parse(readFileSync("tests/fixtures/bench-check/uno-10.json", "utf8"));
const parsed = parseBench(raw);
const fixture = parsed.ok ? parsed.value : ({ version: 1, board: "", rows: [] } satisfies BenchFixture);

const COMPLETE: BenchReal = { value: 4.9, photo: "tests/fixtures/bench-check/photos/a.jpg", date: "2026-11-02", board: "uno-r3 clone" };

const withRow = (i: number, patch: Partial<BenchRow>): BenchFixture => ({
  ...fixture,
  rows: fixture.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)),
});

describe("bench-check fixture", () => {
  it("parses and holds the ten causes of the sheet", () => {
    expect(parsed.ok).toBe(true);
    expect(fixture.rows.map((r) => r.cause_id).sort()).toEqual(ROWS.map((r: { cause_id: string }) => r.cause_id).sort());
    for (const row of fixture.rows) expect(CORE_CAUSE_IDS as readonly string[]).toContain(row.cause_id);
    expect(new Set(fixture.rows.map((r) => r.cause_id)).size).toBe(10);
  });

  it("names a way to build every row", () => {
    for (const row of fixture.rows) {
      expect(["candidate", "fault-literal", "corpus-slot"]).toContain(row.built.how);
      expect(row.built.ref).not.toBe("");
    }
  });

  it("holds the values a fresh simulation gives", () => {
    for (const spec of ROWS) {
      const row = fixture.rows.find((r) => r.id === spec.id);
      const fresh = simulate(spec);
      expect(row?.built).toEqual(fresh.built);
      expect(row?.simulated.value).toBeCloseTo(fresh.simulated.value, 6);
    }
  });
});

describe("benchStatus", () => {
  it("counts nothing while no row has a result", () => {
    const status = benchStatus(fixture);
    expect(status.rows).toBe(10);
    expect(status).toMatchObject({ checked: 0, mismatches: 0, modelWrong: false, causesChecked: [] });
  });

  it("calls the model wrong at two mismatches", () => {
    const one = withRow(0, { real: COMPLETE, match: false });
    expect(benchStatus(one).modelWrong).toBe(false);
    const two = { ...one, rows: one.rows.map((r, j) => (j === 1 ? { ...r, real: COMPLETE, match: false } : r)) };
    expect(benchStatus(two)).toMatchObject({ checked: 2, mismatches: 2, modelWrong: true });
  });

  it("does not count a row whose match is still null", () => {
    expect(benchStatus(withRow(0, { real: COMPLETE, match: null })).checked).toBe(0);
  });
});

describe("fidelityLabelFor", () => {
  it("reads notChecked for every cause today", () => {
    const status = benchStatus(fixture);
    for (const id of CORE_CAUSE_IDS) expect(fidelityLabelFor(id, status)).toBe("fidelity.notChecked");
  });

  it("reads checked once a row of that cause matches", () => {
    const row = fixture.rows.find((r) => r.cause_id === "swapped-pins");
    const index = fixture.rows.indexOf(row as BenchRow);
    const status = benchStatus(withRow(index, { real: COMPLETE, match: true }));
    expect(fidelityLabelFor("swapped-pins", status)).toBe("fidelity.checked");
    expect(fidelityLabelFor("wrong-value", status)).toBe("fidelity.notChecked");
  });
});

describe("parseBench", () => {
  it("accepts a complete real object", () => {
    expect(parseBench(withRow(0, { real: COMPLETE, match: true })).ok).toBe(true);
  });

  it("rejects a half-filled real object", () => {
    const half = withRow(0, { real: { ...COMPLETE, photo: null } });
    expect(parseBench(half).ok).toBe(false);
  });

  it("rejects a match without a complete result", () => {
    expect(parseBench(withRow(0, { match: true })).ok).toBe(false);
  });
});

describe("matches", () => {
  it("allows 10 percent or 0.1 V", () => {
    expect(matches(4.95, 5, "V")).toBe(true);
    expect(matches(0, 0.09, "V")).toBe(true);
    expect(matches(9999, 10900, "ohm")).toBe(true);
    expect(matches(220, 10000, "ohm")).toBe(false);
  });
});
