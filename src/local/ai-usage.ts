import type { AiLogRow } from "../ai/log";
import { toDbError } from "./db";

export type Totals = {
  requests: number;
  inTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outTokens: number;
  usd: number;
  unpricedCalls: number;
};

export interface UsageStore {
  recordCall(row: AiLogRow): Promise<void>;
  dayTotals(day: string): Promise<Totals>;
  /** `prefix` is `YYYY-MM`. */
  monthTotals(prefix: string): Promise<Totals>;
  /** Newest first. */
  rows(sinceDay: string, limit: number): Promise<AiLogRow[]>;
  rebuildUsage(): Promise<void>;
  prune(nowMs: number): Promise<void>;
}

export const RETENTION_DAYS = 90;
export const RETENTION_ROWS = 20_000;

const DAY_MS = 24 * 60 * 60 * 1000;

export const emptyTotals = (): Totals => ({
  requests: 0,
  inTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  outTokens: 0,
  usd: 0,
  unpricedCalls: 0,
});

export function addRow(totals: Totals, row: AiLogRow): Totals {
  return {
    requests: totals.requests + 1,
    inTokens: totals.inTokens + row.inTokens,
    cacheReadTokens: totals.cacheReadTokens + row.cacheReadTokens,
    cacheWriteTokens: totals.cacheWriteTokens + row.cacheWriteTokens,
    outTokens: totals.outTokens + row.outTokens,
    usd: totals.usd + (row.costUSD ?? 0),
    unpricedCalls: totals.unpricedCalls + (row.costUSD === null ? 1 : 0),
  };
}

function sumTotals(list: readonly Totals[]): Totals {
  return list.reduce(
    (sum, t) => ({
      requests: sum.requests + t.requests,
      inTokens: sum.inTokens + t.inTokens,
      cacheReadTokens: sum.cacheReadTokens + t.cacheReadTokens,
      cacheWriteTokens: sum.cacheWriteTokens + t.cacheWriteTokens,
      outTokens: sum.outTokens + t.outTokens,
      usd: sum.usd + t.usd,
      unpricedCalls: sum.unpricedCalls + t.unpricedCalls,
    }),
    emptyTotals(),
  );
}

const usageKey = (row: Pick<AiLogRow, "provider" | "day">) => `${row.provider}:${row.day}`;
const dayOfKey = (key: string) => key.slice(key.lastIndexOf(":") + 1);

function localDay(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The rows that retention drops: older than 90 days, then the oldest beyond 20,000. */
function expiredRows(rows: readonly AiLogRow[], nowMs: number): AiLogRow[] {
  const cutoff = nowMs - RETENTION_DAYS * DAY_MS;
  const old = rows.filter((row) => row.at < cutoff);
  const kept = rows.filter((row) => row.at >= cutoff).sort((a, b) => b.at - a.at);
  return [...old, ...kept.slice(RETENTION_ROWS)];
}

function groupTotals(rows: readonly AiLogRow[]): Map<string, Totals> {
  const grouped = new Map<string, Totals>();
  for (const row of rows) grouped.set(usageKey(row), addRow(grouped.get(usageKey(row)) ?? emptyTotals(), row));
  return grouped;
}

export function memoryUsageStore(): UsageStore {
  const log = new Map<string, AiLogRow>();
  let usage = new Map<string, Totals>();
  const matching = (belongs: (day: string) => boolean) =>
    sumTotals([...usage].filter(([key]) => belongs(dayOfKey(key))).map(([, totals]) => totals));

  return {
    async recordCall(row) {
      log.set(row.id, row);
      usage.set(usageKey(row), addRow(usage.get(usageKey(row)) ?? emptyTotals(), row));
    },
    async dayTotals(day) {
      return matching((d) => d === day);
    },
    async monthTotals(prefix) {
      return matching((d) => d.startsWith(prefix));
    },
    async rows(sinceDay, limit) {
      return [...log.values()].filter((row) => row.day >= sinceDay).sort((a, b) => b.at - a.at).slice(0, limit);
    },
    async rebuildUsage() {
      usage = groupTotals([...log.values()]);
    },
    async prune(nowMs) {
      for (const row of expiredRows([...log.values()], nowMs)) log.delete(row.id);
      const cutoffDay = localDay(nowMs - RETENTION_DAYS * DAY_MS);
      for (const key of usage.keys()) if (dayOfKey(key) < cutoffDay) usage.delete(key);
    },
  };
}

function finished<T>(tx: IDBTransaction, read: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(read());
    tx.onerror = () => reject(toDbError(tx.error));
    tx.onabort = () => reject(toDbError(tx.error ?? new DOMException("transaction aborted", "AbortError")));
  });
}

function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return run();
  } catch (cause) {
    return Promise.reject(toDbError(cause));
  }
}

export function idbUsageStore(db: Pick<IDBDatabase, "transaction">): UsageStore {
  function readUsage(belongs: (day: string) => boolean): Promise<Totals> {
    return guarded(() => {
      const tx = db.transaction("ai_usage", "readonly");
      const store = tx.objectStore("ai_usage");
      const keys = store.getAllKeys();
      const values = store.getAll();
      return finished(tx, () =>
        sumTotals((values.result as Totals[]).filter((_, i) => belongs(dayOfKey(String(keys.result[i]))))),
      );
    });
  }

  function readLog(): Promise<AiLogRow[]> {
    return guarded(() => {
      const tx = db.transaction("ai_log", "readonly");
      const all = tx.objectStore("ai_log").getAll();
      return finished(tx, () => all.result as AiLogRow[]);
    });
  }

  return {
    recordCall(row) {
      return guarded(() => {
        const tx = db.transaction(["ai_log", "ai_usage"], "readwrite");
        const usage = tx.objectStore("ai_usage");
        const key = usageKey(row);
        tx.objectStore("ai_log").put(row, row.id);
        const current = usage.get(key);
        current.onsuccess = () => usage.put(addRow((current.result as Totals | undefined) ?? emptyTotals(), row), key);
        return finished(tx, () => undefined);
      });
    },

    dayTotals: (day) => readUsage((d) => d === day),
    monthTotals: (prefix) => readUsage((d) => d.startsWith(prefix)),

    async rows(sinceDay, limit) {
      const all = await readLog();
      return all.filter((row) => row.day >= sinceDay).sort((a, b) => b.at - a.at).slice(0, limit);
    },

    rebuildUsage() {
      return guarded(() => {
        const tx = db.transaction(["ai_log", "ai_usage"], "readwrite");
        const usage = tx.objectStore("ai_usage");
        const all = tx.objectStore("ai_log").getAll();
        all.onsuccess = () => {
          usage.clear();
          for (const [key, totals] of groupTotals(all.result as AiLogRow[])) usage.put(totals, key);
        };
        return finished(tx, () => undefined);
      });
    },

    prune(nowMs) {
      return guarded(() => {
        const tx = db.transaction(["ai_log", "ai_usage"], "readwrite");
        const log = tx.objectStore("ai_log");
        const usage = tx.objectStore("ai_usage");
        const cutoffDay = localDay(nowMs - RETENTION_DAYS * DAY_MS);
        const rows = log.getAll();
        const keys = usage.getAllKeys();
        rows.onsuccess = () => {
          for (const row of expiredRows(rows.result as AiLogRow[], nowMs)) log.delete(row.id);
        };
        keys.onsuccess = () => {
          for (const key of keys.result) if (dayOfKey(String(key)) < cutoffDay) usage.delete(key);
        };
        return finished(tx, () => undefined);
      });
    },
  };
}
