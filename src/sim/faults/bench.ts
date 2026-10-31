import { fail, ok } from "../../core/result.ts";
import type { Failure, Result } from "../../core/result.ts";
import type { Tier } from "../registry/types.ts";
import type { CauseId } from "./types.ts";

/** What Amar measured on a real board. Either every field is null or every field is set. */
export interface BenchReal {
  value: number | null;
  photo: string | null;
  date: string | null;
  board: string | null;
}

export interface BenchRow {
  id: string;
  cause_id: CauseId;
  built: { how: "candidate" | "fault-literal" | "corpus-slot"; ref: string };
  setup: string;
  measure: { a: string; b: string; unit: "V" | "mA" | "ohm" };
  simulated: { value: number; tier: Tier; modelIds: string[] };
  real: BenchReal;
  /** Set by `scripts/bench-check-sheet.mjs` from `real` and the tolerance, never typed by hand. */
  match: boolean | null;
  note: string | null;
}

export interface BenchFixture {
  version: 1;
  board: string;
  rows: BenchRow[];
}

export interface BenchStatus {
  rows: number;
  checked: number;
  mismatches: number;
  /** R-130: two or more mismatches mean the model is wrong and gets fixed before more fault content is written. */
  modelWrong: boolean;
  causesChecked: CauseId[];
}

export type FidelityKey = "fidelity.checked" | "fidelity.notChecked";

const MODEL_WRONG_AT = 2;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function realIsComplete(real: BenchReal): boolean {
  return real.value !== null && Number.isFinite(real.value) && real.photo !== null && real.date !== null && real.board !== null;
}

const realIsEmpty = (real: BenchReal): boolean =>
  real.value === null && real.photo === null && real.date === null && real.board === null;

const failure = (path: string, message: string) => fail<Failure>({ code: "bad-bench", message, path });

function checkRow(row: unknown, path: string): Failure | undefined {
  if (!isRecord(row)) return { code: "bad-bench", message: "a row is an object", path };
  const real = row.real;
  if (!isRecord(real)) return { code: "bad-bench", message: "a row needs a real object", path: `${path}/real` };
  const filled = real as unknown as BenchReal;
  if (!realIsEmpty(filled) && !realIsComplete(filled)) {
    return { code: "bad-bench", message: "real is either all null or has value, photo, date and board all set", path: `${path}/real` };
  }
  if (row.match !== null && typeof row.match !== "boolean") {
    return { code: "bad-bench", message: "match is true, false or null", path: `${path}/match` };
  }
  if (row.match !== null && !realIsComplete(filled)) {
    return { code: "bad-bench", message: "match is set while real is not complete", path: `${path}/match` };
  }
  return undefined;
}

/** Reads the fixture and rejects a half-filled `real` and a `match` that has no result behind it. */
export function parseBench(raw: unknown): Result<BenchFixture, Failure> {
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.rows)) return failure("", "not a bench-check fixture");
  for (const [i, row] of raw.rows.entries()) {
    const bad = checkRow(row, `/rows/${i}`);
    if (bad) return fail(bad);
  }
  return ok(raw as unknown as BenchFixture);
}

/** A row counts once its result is complete and the script has compared it. */
const isChecked = (row: BenchRow): boolean => realIsComplete(row.real) && row.match !== null;

export function benchStatus(fixture: BenchFixture): BenchStatus {
  const done = fixture.rows.filter(isChecked);
  const mismatches = done.filter((r) => r.match === false).length;
  return {
    rows: fixture.rows.length,
    checked: done.length,
    mismatches,
    modelWrong: mismatches >= MODEL_WRONG_AT,
    causesChecked: [...new Set(done.filter((r) => r.match === true).map((r) => r.cause_id))],
  };
}

export function fidelityLabelFor(cause: CauseId, status: BenchStatus): FidelityKey {
  return status.causesChecked.includes(cause) ? "fidelity.checked" : "fidelity.notChecked";
}
