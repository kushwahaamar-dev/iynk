import "server-only";
import { clientIp, fail } from "./http";

/**
 * In-memory sliding-window limiter (HX-CONTRACT H2). It is per instance: a
 * serverless deployment with several warm instances lets through up to
 * `limit` per instance, which is fine for abuse protection and quota guards.
 */

export type RateLimitOptions = { limit: number; windowMs: number };
export type RateLimitResult = { ok: boolean; remaining: number; retryAfterMs: number };

// Bounds memory when many distinct keys (or spoofed IPs) show up.
const MAX_KEYS = 10_000;
const hits = new Map<string, number[]>();

export function rateLimit(key: string, { limit, windowMs }: RateLimitOptions, now = Date.now()): RateLimitResult {
  const since = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > since);
  // Re-inserting keeps the Map in least-recently-used order for eviction.
  hits.delete(key);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, remaining: 0, retryAfterMs: Math.max(1, recent[0] + windowMs - now) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > MAX_KEYS) hits.delete(hits.keys().next().value as string);
  return { ok: true, remaining: limit - recent.length, retryAfterMs: 0 };
}

export function tooManyRequests(result: RateLimitResult): Response {
  const seconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
  return fail(429, "rate_limited", undefined, { "retry-after": String(seconds) });
}

/** Limits one caller (by IP) on one bucket; returns the 429 response or null. */
export function checkRateLimit(req: Request, bucket: string, options: RateLimitOptions): Response | null {
  const result = rateLimit(`${bucket}:${clientIp(req)}`, options);
  return result.ok ? null : tooManyRequests(result);
}
