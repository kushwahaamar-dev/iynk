import type { Clock } from "../../deps.ts";
import type { Tx } from "../../store/port.ts";

export type Counted = { ok: true; used: number } | { ok: false; used: number; cap: number; retryAfterSeconds: number };

const SEARCH_PROVIDER = "search";
const RETENTION_DAYS = 62;
const DAY_MS = 86_400_000;

function dayOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function secondsUntil(now: number, next: number): number {
  return Math.max(1, Math.ceil((next - now) / 1000));
}

function bump(tx: Tx, day: string, provider: string, deviceId: string, column: "requests" | "searches"): void {
  tx.run(
    `INSERT INTO usage (day, provider, device_id, ${column}) VALUES (?, ?, ?, 1)
     ON CONFLICT (day, provider, device_id) DO UPDATE SET ${column} = ${column} + 1`,
    day,
    provider,
    deviceId,
  );
}

export function countRelayCall(tx: Tx, clock: Clock, deviceId: string, provider: string, cap: number): Counted {
  const now = clock.now();
  const day = dayOf(now);
  const row = tx.get<{ used: number }>(
    "SELECT COALESCE(SUM(requests), 0) AS used FROM usage WHERE day = ? AND device_id = ? AND provider LIKE 'relay:%'",
    day,
    deviceId,
  );
  const used = row?.used ?? 0;
  if (used >= cap) {
    const date = new Date(now);
    const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
    return { ok: false, used, cap, retryAfterSeconds: secondsUntil(now, midnight) };
  }
  bump(tx, day, provider, deviceId, "requests");
  return { ok: true, used: used + 1 };
}

export function countSearch(tx: Tx, clock: Clock, deviceId: string, monthlyCap: number | null): Counted {
  const now = clock.now();
  const day = dayOf(now);
  const row = tx.get<{ used: number }>(
    "SELECT COALESCE(SUM(searches), 0) AS used FROM usage WHERE substr(day, 1, 7) = ? AND device_id = ? AND provider = ?",
    day.slice(0, 7),
    deviceId,
    SEARCH_PROVIDER,
  );
  const used = row?.used ?? 0;
  if (monthlyCap !== null && used >= monthlyCap) {
    const date = new Date(now);
    const nextMonth = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
    return { ok: false, used, cap: monthlyCap, retryAfterSeconds: secondsUntil(now, nextMonth) };
  }
  bump(tx, day, SEARCH_PROVIDER, deviceId, "searches");
  return { ok: true, used: used + 1 };
}

export function addTokens(tx: Tx, clock: Clock, deviceId: string, provider: string, t: { input: number; output: number }): void {
  tx.run(
    `INSERT INTO usage (day, provider, device_id, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (day, provider, device_id) DO UPDATE SET
       input_tokens = input_tokens + excluded.input_tokens,
       output_tokens = output_tokens + excluded.output_tokens`,
    dayOf(clock.now()),
    provider,
    deviceId,
    t.input,
    t.output,
  );
}

export function pruneUsage(tx: Tx, clock: Clock): number {
  return tx.run("DELETE FROM usage WHERE day < ?", dayOf(clock.now() - RETENTION_DAYS * DAY_MS)).changes;
}
