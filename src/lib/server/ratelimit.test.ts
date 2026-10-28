// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, rateLimit } from "./ratelimit";

describe("rateLimit", () => {
  it("allows `limit` hits per sliding window", () => {
    const opts = { limit: 3, windowMs: 1000 };
    expect(rateLimit("a", opts, 0)).toEqual({ ok: true, remaining: 2, retryAfterMs: 0 });
    expect(rateLimit("a", opts, 100).ok).toBe(true);
    expect(rateLimit("a", opts, 200).remaining).toBe(0);
    const blocked = rateLimit("a", opts, 300);
    expect(blocked.ok).toBe(false);
    // The oldest hit (t=0) leaves the window at t=1000.
    expect(blocked.retryAfterMs).toBe(700);
    expect(rateLimit("a", opts, 999).ok).toBe(false);
    expect(rateLimit("a", opts, 1001).ok).toBe(true);
  });

  it("keeps keys apart", () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit("k1", opts, 0).ok).toBe(true);
    expect(rateLimit("k2", opts, 0).ok).toBe(true);
    expect(rateLimit("k1", opts, 1).ok).toBe(false);
  });
});

describe("checkRateLimit", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("answers 429 with Retry-After per caller", async () => {
    vi.stubEnv("IYNK_TRUST_PROXY", "1");
    vi.resetModules();
    const { checkRateLimit } = await import("./ratelimit");
    const req = (ip: string) => new Request("http://localhost/api/x", { headers: { "x-real-ip": ip } });
    const opts = { limit: 2, windowMs: 60_000 };
    expect(checkRateLimit(req("9.9.9.9"), "test", opts)).toBeNull();
    expect(checkRateLimit(req("9.9.9.9"), "test", opts)).toBeNull();
    const res = checkRateLimit(req("9.9.9.9"), "test", opts);
    expect(res?.status).toBe(429);
    expect(Number(res?.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await res?.json()).error.code).toBe("rate_limited");
    expect(checkRateLimit(req("8.8.8.8"), "test", opts)).toBeNull();
  });

  it("shares one bucket across callers when no proxy is trusted", () => {
    const req = (ip: string) => new Request("http://localhost/api/x", { headers: { "x-forwarded-for": ip } });
    const opts = { limit: 2, windowMs: 60_000 };
    expect(checkRateLimit(req("1.1.1.1"), "shared", opts)).toBeNull();
    expect(checkRateLimit(req("2.2.2.2"), "shared", opts)).toBeNull();
    expect(checkRateLimit(req("3.3.3.3"), "shared", opts)?.status).toBe(429);
  });
});
