// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => {} }));

const TOKEN = "t".repeat(40);
const KEY = "iynk-canary-KEY-0001-do-not-use";
let ip = 0;
const dirs: string[] = [];

async function load(vars: Record<string, string> = {}) {
  vi.resetModules();
  vi.stubEnv("IYNK_AI_ENABLE", "1");
  vi.stubEnv("IYNK_SEARCH_ENABLE", "1");
  vi.stubEnv("SERPAPI_KEY", "x".repeat(20));
  vi.stubEnv("IYNK_TRUST_PROXY", "1");
  vi.stubEnv("IYNK_SERVER_TOKEN", TOKEN);
  dirs.push(mkdtempSync(path.join(tmpdir(), "iynk-usage-")));
  vi.stubEnv("IYNK_DATA_DIR", dirs.at(-1)!);
  vi.stubEnv("IYNK_AI_DAILY_TOKENS", "200000");
  vi.stubEnv("IYNK_SEARCH_MONTHLY", "200");
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return (await import("./route")).GET;
}

const get = (query = "kind=ai", headers: Record<string, string> = {}) =>
  new Request(`http://localhost/api/usage?${query}`, {
    headers: { "x-iynk-server-token": TOKEN, "x-iynk-provider-key": KEY, "x-real-ip": `10.2.0.${++ip}`, ...headers },
  });

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe("GET /api/usage", () => {
  it("answers zeros for a key with no usage", async () => {
    const GET = await load();
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ kind: "ai", today: { tokens: 0, requests: 0 }, monthTotal: { tokens: 0, requests: 0 }, cap: 200000 });
  });

  it("reports what the ledger counted for the caller's key, and none of it for another", async () => {
    const GET = await load();
    const { ledger } = await import("@/lib/server/ai/ledger");
    await ledger.recordAi(ledger.keyId(KEY), { tokens: 120 });
    await ledger.recordSearch(ledger.keyId(KEY), 3);
    const ai = await (await GET(get())).json();
    expect(ai.today).toEqual({ tokens: 120, requests: 1 });
    expect(ai.monthTotal).toEqual({ tokens: 120, requests: 1 });
    expect(ai.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await (await GET(get("kind=search"))).json()).toMatchObject({ kind: "search", monthTotal: 3, cap: 200 });
    const other = await (await GET(get("kind=ai", { "x-iynk-provider-key": "iynk-canary-OTHER-0002-do-not-use" }))).json();
    expect(other.today.tokens).toBe(0);
  });

  it("never puts the key in the body", async () => {
    const GET = await load();
    for (const query of ["kind=ai", "kind=search"]) expect(await (await GET(get(query))).text()).not.toContain(KEY);
  });

  it("answers 422 key_required without a key and 400 bad_key for a malformed one", async () => {
    const GET = await load();
    const missing = await GET(get("kind=ai", { "x-iynk-provider-key": "" }));
    expect(missing.status).toBe(422);
    expect((await missing.json()).error.code).toBe("key_required");
    const bad = await GET(get("kind=ai", { "x-iynk-provider-key": "has a space" }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("bad_key");
  });

  it("answers 400 bad_request for another kind", async () => {
    const GET = await load();
    for (const query of ["kind=video", ""]) {
      const res = await GET(get(query));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("bad_request");
    }
  });

  it("answers 401 without the server token and 403 from another origin", async () => {
    const GET = await load();
    expect((await GET(get("kind=ai", { "x-iynk-server-token": "" }))).status).toBe(401);
    expect((await GET(get("kind=ai", { origin: "https://evil.example" }))).status).toBe(403);
  });

  it("answers 501 feature_disabled when the module is off", async () => {
    const off = await load({ IYNK_AI_ENABLE: "" });
    const res = await off(get("kind=ai"));
    expect(res.status).toBe(501);
    expect((await res.json()).error.code).toBe("feature_disabled");
    const noSearch = await load({ IYNK_SEARCH_ENABLE: "" });
    expect((await noSearch(get("kind=search"))).status).toBe(501);
  });

  it("limits a caller to 60 a minute", async () => {
    const GET = await load();
    const same = { "x-real-ip": "10.2.9.9" };
    for (let i = 0; i < 60; i++) expect((await GET(get("kind=ai", same))).status).toBe(200);
    const res = await GET(get("kind=ai", same));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).not.toBeNull();
  });
});
