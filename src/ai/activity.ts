import { addRow, emptyTotals, type Totals } from "../local/ai-usage";
import type { AiLogRow } from "./log";

export type Activity = {
  today: Totals;
  month: Totals;
  perModel: { model: string; usd: number | null; calls: number; cacheReadRatio: number }[];
  callsPerMessage: { p50: number; p95: number };
  firstTokenMs: { p50: number; p95: number };
  toolErrors: { code: string; count: number }[];
  policy: { forbiddenOps: number; modeBlocked: number; injectionFlags: number; secretsRedacted: number };
  capped: number;
};

/** Nearest rank on an unsorted list; 0 for an empty one. */
function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

function spread(values: readonly number[]): { p50: number; p95: number } {
  return { p50: percentile(values, 50), p95: percentile(values, 95) };
}

function localDay(ms: number): string {
  const d = new Date(ms);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

/** Figures for the AI activity panel. Counts only; no row text reaches the result. */
export function summarise(rows: readonly AiLogRow[], nowMs: number): Activity {
  const day = localDay(nowMs);
  const month = day.slice(0, 7);
  let today = emptyTotals();
  let thisMonth = emptyTotals();
  const models = new Map<string, { usd: number; priced: boolean; calls: number; input: number; cached: number }>();
  const perMessage = new Map<string, number>();
  const firstTokens: number[] = [];
  const errors = new Map<string, number>();
  const policy = { forbiddenOps: 0, modeBlocked: 0, injectionFlags: 0, secretsRedacted: 0 };
  let capped = 0;

  for (const row of rows) {
    if (row.day === day) today = addRow(today, row);
    if (row.day.startsWith(month)) thisMonth = addRow(thisMonth, row);

    const m = models.get(row.model) ?? { usd: 0, priced: false, calls: 0, input: 0, cached: 0 };
    m.calls += 1;
    m.input += row.inTokens;
    m.cached += row.cacheReadTokens;
    if (row.costUSD !== null) {
      m.usd += row.costUSD;
      m.priced = true;
    }
    models.set(row.model, m);

    perMessage.set(row.requestId, (perMessage.get(row.requestId) ?? 0) + 1);
    if (row.firstTokenMs > 0) firstTokens.push(row.firstTokenMs);
    for (const call of row.toolCalls) {
      if (!call.ok) errors.set(call.code ?? "unknown", (errors.get(call.code ?? "unknown") ?? 0) + 1);
    }
    policy.forbiddenOps += row.policy.forbiddenOps;
    policy.modeBlocked += row.policy.modeBlocked;
    policy.injectionFlags += row.policy.injectionFlags;
    policy.secretsRedacted += row.policy.secretsRedacted;
    if (row.outcome === "capped") capped += 1;
  }

  return {
    today,
    month: thisMonth,
    perModel: [...models]
      .map(([model, m]) => ({ model, usd: m.priced ? m.usd : null, calls: m.calls, cacheReadRatio: m.input > 0 ? m.cached / m.input : 0 }))
      .sort((a, b) => b.calls - a.calls || a.model.localeCompare(b.model)),
    callsPerMessage: spread([...perMessage.values()]),
    firstTokenMs: spread(firstTokens),
    toolErrors: [...errors].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)),
    policy,
    capped,
  };
}
