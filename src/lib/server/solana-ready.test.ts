// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const configReady = vi.hoisted(() => vi.fn(async (_options?: { rpc?: string }) => true));
vi.mock("@/lib/solana/config-ready", () => ({ configAccountReady: configReady }));

const SOLANA = {
  SOLANA_ISSUER_KEYPAIR: JSON.stringify(Array.from({ length: 64 }, (_, i) => i)),
  NEXT_PUBLIC_SOLANA_PROGRAM_ID: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  SOLANA_RPC_URL: "https://rpc.example/",
};

async function load(vars: Record<string, string>) {
  vi.resetModules();
  configReady.mockReset();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return import("./solana-ready");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("solanaReady", () => {
  it("is off without the issuer key and program id, and never reads the cluster", async () => {
    const { solanaReady } = await load({});
    expect(await solanaReady()).toBe(false);
    expect(configReady).not.toHaveBeenCalled();
  });

  it("reads the Config account through the server's RPC, once for many requests", async () => {
    const { solanaReady } = await load(SOLANA);
    configReady.mockResolvedValue(true);
    expect(await Promise.all([solanaReady(), solanaReady()])).toEqual([true, true]);
    expect(await solanaReady()).toBe(true);
    expect(configReady).toHaveBeenCalledTimes(1);
    expect(configReady.mock.calls[0][0]).toMatchObject({ rpc: "https://rpc.example" });
  });

  it("asks again a minute after a miss, so a fresh deploy turns Proof of Build on", async () => {
    vi.useFakeTimers();
    const { solanaReady } = await load(SOLANA);
    configReady.mockResolvedValue(false);
    expect(await solanaReady()).toBe(false);
    vi.advanceTimersByTime(30_000);
    expect(await solanaReady()).toBe(false);
    expect(configReady).toHaveBeenCalledTimes(1);
    configReady.mockResolvedValue(true);
    vi.advanceTimersByTime(31_000);
    expect(await solanaReady()).toBe(true);
    expect(configReady).toHaveBeenCalledTimes(2);
  });

  it("counts a read slower than 2 s as not there", async () => {
    vi.useFakeTimers();
    const { solanaReady } = await load(SOLANA);
    configReady.mockImplementation(() => new Promise(() => {}));
    const answer = solanaReady();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(await answer).toBe(false);
  });
});
