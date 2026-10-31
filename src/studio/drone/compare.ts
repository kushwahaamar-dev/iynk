import type { BuildCheck, CheckId, CheckResult } from "@/sim/flight/checks";
import type { BuildOutputs } from "@/sim/flight/evaluate";

export type CompareId = "auw" | "tw" | "hoverThrottle" | "hoverAmps" | "maxAmps" | "enduranceTyp";

export interface CompareRow {
  id: CompareId;
  a: number | null;
  b: number | null;
  diff: number | null;
  pct: number | null;
  unit: string;
}

const PERCENT = 100;

const FIELDS: ReadonlyArray<{ id: CompareId; unit: string; read: (o: BuildOutputs) => number | null }> = [
  { id: "auw", unit: "g", read: (o) => o.auw_g },
  { id: "tw", unit: "ratio", read: (o) => o.tw },
  { id: "hoverThrottle", unit: "fraction", read: (o) => o.hoverThrottle },
  { id: "hoverAmps", unit: "A", read: (o) => o.hoverAmps },
  { id: "maxAmps", unit: "A", read: (o) => o.maxAmps },
  { id: "enduranceTyp", unit: "s", read: (o) => o.endurance?.typ_s ?? null },
];

function row(id: CompareId, unit: string, a: number | null, b: number | null): CompareRow {
  const diff = a === null || b === null ? null : b - a;
  const pct = diff === null || a === null || a === 0 ? null : (diff / a) * PERCENT;
  return { id, a, b, diff, pct, unit };
}

const resultOf = (checks: readonly BuildCheck[]) => new Map(checks.map((c) => [c.id, c.result]));

/** Each figure of two builds side by side, the checks whose result differs, and whether both lists of assumptions match. */
export function compareOutputs(
  a: BuildOutputs,
  b: BuildOutputs,
): { rows: CompareRow[]; checks: Array<{ id: CheckId; a: CheckResult; b: CheckResult }>; assumptionsEqual: boolean } {
  const resultsA = resultOf(a.checks);
  const resultsB = resultOf(b.checks);
  const checks: Array<{ id: CheckId; a: CheckResult; b: CheckResult }> = [];
  for (const [id, before] of resultsA) {
    const after = resultsB.get(id);
    if (after !== undefined && after !== before) checks.push({ id, a: before, b: after });
  }
  const setA = new Set(a.assumptions);
  const setB = new Set(b.assumptions);
  const assumptionsEqual = setA.size === setB.size && [...setA].every((x) => setB.has(x));
  return {
    rows: FIELDS.map((f) => row(f.id, f.unit, f.read(a), f.read(b))),
    checks,
    assumptionsEqual,
  };
}
