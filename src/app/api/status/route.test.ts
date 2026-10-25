// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => {} }));
const configReady = vi.hoisted(() => vi.fn(async () => false));
vi.mock("@/lib/solana/config-ready", () => ({ configAccountReady: configReady }));

async function load(vars: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return import("./route");
}

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/status", () => {
  it("reports booleans only, never values", async () => {
    const { GET } = await load({ META_API_KEY: "sk-very-secret", SERPAPI_KEY: "" });
    const res = await GET(new Request("http://localhost/api/status"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain("sk-very-secret");
    const { features } = JSON.parse(text);
    expect(features.ai).toBe(true);
    expect(features.search).toBe(false);
    for (const value of Object.values(features)) expect(typeof value).toBe("boolean");
  });

  it("says Proof of Build is on only once its Config account is on devnet", async () => {
    const solana = {
      SOLANA_ISSUER_KEYPAIR: JSON.stringify(Array.from({ length: 64 }, (_, i) => i)),
      NEXT_PUBLIC_SOLANA_PROGRAM_ID: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
    };
    configReady.mockResolvedValue(false);
    let { GET } = await load(solana);
    expect((await (await GET(new Request("http://localhost/api/status"))).json()).features.solana).toBe(false);
    configReady.mockResolvedValue(true);
    ({ GET } = await load(solana));
    expect((await (await GET(new Request("http://localhost/api/status"))).json()).features.solana).toBe(true);
  });

  it("is rate limited", async () => {
    const { GET } = await load({});
    const req = () => new Request("http://localhost/api/status", { headers: { "x-real-ip": "7.7.7.7" } });
    let last: Response | undefined;
    for (let i = 0; i < 121; i++) last = await GET(req());
    expect(last?.status).toBe(429);
  });
});
