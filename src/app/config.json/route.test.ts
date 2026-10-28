// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => {} }));

async function load(vars: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return import("./route");
}

afterEach(() => vi.unstubAllEnvs());

describe("GET /config.json", () => {
  it("reports no server and no modules on a bare deployment", async () => {
    const { GET } = await load({ IYNK_SERVER_URL: "", IYNK_AI_ENABLE: "", IYNK_SEARCH_ENABLE: "" });
    const res = await GET();
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ server: null, protocol: 1, modules: { ai: false, search: false, voice: false } });
  });

  it("reports the server url and the enabled modules, never a secret", async () => {
    const { GET } = await load({
      IYNK_SERVER_URL: "https://srv.example",
      IYNK_AI_ENABLE: "1",
      IYNK_SERVER_TOKEN: "iynk-canary-TOKEN-0001",
    });
    const text = await (await GET()).text();
    expect(text).not.toContain("iynk-canary-TOKEN-0001");
    expect(JSON.parse(text)).toMatchObject({ server: "https://srv.example", modules: { ai: true, voice: true } });
  });

  it("turns voice off when the provider is gemini", async () => {
    const { GET } = await load({ IYNK_AI_ENABLE: "1", IYNK_AI_PROVIDER: "gemini" });
    expect((await (await GET()).json()).modules).toMatchObject({ ai: true, voice: false });
  });
});
