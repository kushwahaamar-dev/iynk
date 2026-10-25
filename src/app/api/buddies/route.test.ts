// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => {} }));

const listProfiles = vi.fn();
const upsertProfile = vi.fn();
const deleteProfile = vi.fn();
vi.mock("@/lib/server/db/queries", () => ({
  listProfiles: (...args: unknown[]) => listProfiles(...args),
  upsertProfile: (...args: unknown[]) => upsertProfile(...args),
  deleteProfile: (...args: unknown[]) => deleteProfile(...args),
}));

const DB = "postgres://iynk:pw@localhost:5432/iynk";
const id = "b1d2c3e4-0000-4000-8000-123456789abc";
const token = "t0k3n-0123456789abcdef";

async function load(vars: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return import("./route");
}

let n = 0;
const req = (method: string, body?: unknown, query = "") =>
  new Request(`http://localhost/api/buddies${query}`, {
    method,
    headers: { "content-type": "application/json", "x-real-ip": `10.3.0.${++n}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const profile = { id, name: "  Ada  ", lang: "es", interests: ["drones"], built: ["drone:quad5:build"], wants: "Fly a whoop" };

beforeEach(() => {
  listProfiles.mockReset();
  upsertProfile.mockReset();
  deleteProfile.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("/api/buddies", () => {
  it("answers 503 on every method without a database", async () => {
    const { GET, POST, DELETE } = await load({ DATABASE_URL: "" });
    expect((await GET(req("GET"))).status).toBe(503);
    expect((await POST(req("POST", { profile, token }))).status).toBe(503);
    expect((await DELETE(req("DELETE", { id, token }))).status).toBe(503);
  });

  it("lists the pool without the asker", async () => {
    listProfiles.mockResolvedValue([{ ...profile, name: "Ada" }]);
    const { GET } = await load({ DATABASE_URL: DB });
    const res = await GET(req("GET", undefined, `?exclude=${id}&limit=20`));
    expect(res.status).toBe(200);
    expect((await res.json()).profiles).toHaveLength(1);
    expect(listProfiles.mock.calls[0][1]).toEqual({ exclude: id, limit: 20 });
  });

  it("opts in with a cleaned profile and returns the expiry", async () => {
    upsertProfile.mockResolvedValue({ expiresAt: new Date("2026-10-25T20:00:00Z") });
    const { POST } = await load({ DATABASE_URL: DB });
    const res = await POST(req("POST", { profile, token }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ profile: { ...profile, name: "Ada" }, expiresAt: "2026-10-25T20:00:00.000Z" });
    expect(upsertProfile.mock.calls[0][2]).toBe(token);
  });

  it("refuses someone else's id, contact-free shape violations and bad tokens", async () => {
    upsertProfile.mockResolvedValue(null);
    const { POST } = await load({ DATABASE_URL: DB });
    expect((await POST(req("POST", { profile, token }))).status).toBe(403);
    expect((await POST(req("POST", { profile: { ...profile, lang: "xx" }, token }))).status).toBe(400);
    expect((await POST(req("POST", { profile: { ...profile, name: "\u0007" }, token }))).status).toBe(400);
    expect((await POST(req("POST", { profile, token: "short" }))).status).toBe(400);
    expect((await POST(req("POST", { profile: { ...profile, interests: Array(13).fill("x") }, token }))).status).toBe(400);
  });

  it("opts out with the token, 404 otherwise", async () => {
    deleteProfile.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const { DELETE } = await load({ DATABASE_URL: DB });
    expect((await DELETE(req("DELETE", { id, token }))).status).toBe(200);
    expect((await DELETE(req("DELETE", { id, token }))).status).toBe(404);
  });
});
