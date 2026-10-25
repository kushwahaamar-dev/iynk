// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveResponse } from "@/lib/telemetry/responses";

vi.mock("next/server", () => ({ connection: async () => {} }));

const getLiveCounters = vi.fn();
vi.mock("@/lib/server/db/queries", () => ({ getLiveCounters: (...args: unknown[]) => getLiveCounters(...args) }));

const DB = "postgres://iynk:pw@localhost:5432/iynk";

async function load(vars: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return import("./route");
}

const get = () => new Request("http://localhost/api/live", { headers: { "x-real-ip": "10.2.2.2" } });

const counters: LiveResponse = {
  windowMinutes: 60,
  builders: 23,
  ledsBlinked: 1204,
  dronesFlown: 41,
  lessonsPassed: 9,
  events: 5120,
  perMinute: new Array(60).fill(80),
  updatedAt: "2026-10-24T20:00:00.000Z",
};

beforeEach(() => getLiveCounters.mockReset());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("GET /api/live", () => {
  it("answers 503 without a database", async () => {
    const { GET } = await load({ DATABASE_URL: "" });
    expect((await GET(get())).status).toBe(503);
  });

  it("returns the counters with a shared cache header, and asks the database once per 10 s", async () => {
    getLiveCounters.mockResolvedValue(counters);
    const { GET } = await load({ DATABASE_URL: DB });
    const [a, b] = await Promise.all([GET(get()), GET(get())]);
    expect(await a.json()).toEqual(counters);
    expect(b.status).toBe(200);
    expect(a.headers.get("cache-control")).toContain("s-maxage=10");
    expect(getLiveCounters).toHaveBeenCalledTimes(1);
    await GET(get());
    expect(getLiveCounters).toHaveBeenCalledTimes(1);
  });

  it("asks again once the cached answer is older than 10 s", async () => {
    vi.useFakeTimers({ now: Date.parse("2026-10-24T20:00:00Z") });
    getLiveCounters.mockResolvedValue(counters);
    const { GET } = await load({ DATABASE_URL: DB });
    await GET(get());
    vi.setSystemTime(Date.parse("2026-10-24T20:00:11Z"));
    await GET(get());
    expect(getLiveCounters).toHaveBeenCalledTimes(2);
  });

  it("answers 502 when the database fails, then recovers", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getLiveCounters.mockRejectedValueOnce(new Error("timeout")).mockResolvedValue(counters);
    const { GET } = await load({ DATABASE_URL: DB });
    expect((await GET(get())).status).toBe(502);
    expect((await GET(get())).status).toBe(200);
  });
});
