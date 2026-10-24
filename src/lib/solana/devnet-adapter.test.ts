// @vitest-environment node
// Node, not jsdom: web3.js's serializer rejects jsdom's cross-realm Uint8Arrays.
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { beforeAll, expect, test, vi } from "vitest";

const storage = new Map<string, string>();
beforeAll(() => {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    },
    addEventListener() {},
    removeEventListener() {},
  });
});

test("connects in one step, signs, and disconnects when the wallet is forgotten", async () => {
  const { DevnetWalletAdapter } = await import("./devnet-adapter");
  const { forgetDevnetKeypair, getDevnetKeypair } = await import("./devnet-wallet");
  const adapter = new DevnetWalletAdapter();
  const onDisconnect = vi.fn();
  adapter.on("disconnect", onDisconnect);
  await adapter.connect();
  const me = adapter.publicKey!;
  expect(me.equals(getDevnetKeypair()!.publicKey)).toBe(true);

  const tx = new Transaction({ feePayer: me, blockhash: Keypair.generate().publicKey.toBase58(), lastValidBlockHeight: 1 }).add(
    SystemProgram.transfer({ fromPubkey: me, toPubkey: Keypair.generate().publicKey, lamports: 1 }),
  );
  expect((await adapter.signTransaction(tx)).verifySignatures()).toBe(true);

  forgetDevnetKeypair();
  await vi.waitFor(() => expect(onDisconnect).toHaveBeenCalled());
  expect(adapter.publicKey).toBeNull();
  await expect(adapter.signTransaction(tx)).rejects.toThrow();
});
