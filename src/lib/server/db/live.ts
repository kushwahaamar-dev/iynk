import "server-only";
import type { LiveResponse } from "@/lib/telemetry/responses";
import { getSql } from "./client";
import { getLiveCounters } from "./queries";

export const LIVE_TTL_MS = 10_000;

let cached: { at: number; value: LiveResponse } | null = null;
let inflight: Promise<LiveResponse> | null = null;

/**
 * The live counters, at most 10 s old. Every lobby and dashboard polls them, so
 * one instance asks the database at most once per TTL however many tabs are open,
 * and concurrent misses share a single query.
 */
export async function liveCounters(now = Date.now()): Promise<LiveResponse> {
  if (cached && now - cached.at < LIVE_TTL_MS) return cached.value;
  inflight ??= (async () => {
    const sql = getSql();
    if (!sql) throw new Error("DATABASE_URL is not set");
    try {
      const value = await getLiveCounters(sql, new Date(now));
      cached = { at: now, value };
      return value;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
