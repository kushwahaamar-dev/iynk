// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeaderboardResponse } from "@/lib/telemetry/responses";

vi.mock("next/server", () => ({ connection: async () => {} }));

const getLeaderboard = vi.fn();
vi.mock("@/lib/server/db/queries", () => ({ getLeaderboard: (...args: unknown[]) => getLeaderboard(...args) }));

const DB = "postgres://simlab:pw@localhost:5432/simlab";
const session = "3f1c2d4e-5b6a-4789-9abc-def012345678";

async function load(vars: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return import("./route");
}

const get = (query: string, ip = "10.1.1.1") =>
  new Request(`http://localhost/api/leaderboard?${query}`, { headers: { "x-real-ip": ip } });

const board: LeaderboardResponse = {
  course: "quad5-bando",
  rows: [{ rank: 1, name: "Ada", timeMs: 41_002, laps: 4, you: true }],
  you: { rank: 1, name: "Ada", timeMs: 41_002, laps: 4, you: true },
  pilots: 1,
  updatedAt: "2026-10-24T20:00:00.000Z",
};

beforeEach(() => getLeaderboard.mockReset());
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/leaderboard", () => {
  it("answers 503 without a database", async () => {
    const { GET } = await load({ DATABASE_URL: "" });
    const res = await GET(get("course=quad5-bando"));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("not_configured");
  });

  it("passes the course, session and limit to the query", async () => {
    getLeaderboard.mockResolvedValue(board);
    const { GET } = await load({ DATABASE_URL: DB });
    const res = await GET(get(`course=quad5-bando&session=${session}&limit=5`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(board);
    expect(getLeaderboard.mock.calls[0][1]).toEqual({ course: "quad5-bando", session, limit: 5 });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("defaults the limit and refuses bad input", async () => {
    getLeaderboard.mockResolvedValue(board);
    const { GET } = await load({ DATABASE_URL: DB });
    await GET(get("course=quad5-bando"));
    expect(getLeaderboard.mock.calls[0][1]).toEqual({ course: "quad5-bando", limit: 10 });
    for (const q of ["", "course=Quad5 Bando", "course=quad5-bando&limit=500", `course=quad5-bando&session=x`]) {
      expect((await GET(get(q))).status).toBe(400);
    }
  });

  it("answers 502 when the database fails, without its message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await load({ DATABASE_URL: DB });
    getLeaderboard.mockRejectedValueOnce(new Error("password authentication failed for user simlab"));
    const res = await GET(get("course=quad5-bando"));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("password");
  });

  it("is rate limited per address", async () => {
    getLeaderboard.mockResolvedValue(board);
    const { GET } = await load({ DATABASE_URL: DB });
    let last: Response | undefined;
    for (let i = 0; i < 301; i++) last = await GET(get("course=quad5-bando", "10.9.9.9"));
    expect(last?.status).toBe(429);
  });
});
