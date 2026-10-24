// @vitest-environment node
import { PublicKey } from "@solana/web3.js";
import { describe, expect, test, vi } from "vitest";
import { configAccountReady } from "./config-ready";

const programId = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function rpc(value: unknown) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const sent = JSON.parse(String(init?.body)) as { id?: unknown };
    return Response.json({ jsonrpc: "2.0", id: sent.id ?? 1, result: { context: { slot: 1 }, value } });
  });
}

const account = {
  lamports: 1000,
  owner: programId.toBase58(),
  data: [Buffer.from([1, 2, 3, 4]).toString("base64"), "base64"],
  executable: false,
  rentEpoch: 0,
  space: 4,
};

describe("configAccountReady", () => {
  test("is off when the Config account is missing or empty", async () => {
    const missing = rpc(null);
    expect(await configAccountReady({ programId, rpc: "http://rpc.test", fetch: missing })).toBe(false);
    expect(missing).toHaveBeenCalled();

    const empty = { ...account, data: ["", "base64"], space: 0 };
    expect(await configAccountReady({ programId, rpc: "http://rpc.test", fetch: rpc(empty) })).toBe(false);
  });

  test("is on when the Config account has data", async () => {
    expect(await configAccountReady({ programId, rpc: "http://rpc.test", fetch: rpc(account) })).toBe(true);
  });

  test("is off when the read fails or there is no program id", async () => {
    const down = vi.fn(async () => {
      throw new Error("rpc down");
    });
    expect(await configAccountReady({ programId, rpc: "http://rpc.test", fetch: down })).toBe(false);
    const fetch = vi.fn();
    expect(await configAccountReady({ programId: null, fetch })).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
