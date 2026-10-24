import { act, renderHook } from "@testing-library/react";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DEVNET_WALLET_KEY, createDevnetKeypair, exportDevnetSecret, forgetDevnetKeypair, getDevnetKeypair, useDevnetAddress } from "./devnet-wallet";

afterEach(() => {
  forgetDevnetKeypair();
  vi.restoreAllMocks();
});

describe("devnet wallet store", () => {
  test("creates one keypair, keeps it and exports it as base58", () => {
    expect(getDevnetKeypair()).toBeNull();
    const pair = createDevnetKeypair();
    expect(pair).not.toBeNull();
    expect(createDevnetKeypair()?.publicKey.equals(pair!.publicKey)).toBe(true);
    const stored = JSON.parse(localStorage.getItem(DEVNET_WALLET_KEY) ?? "{}");
    expect(stored.v).toBe(1);
    expect(bs58.decode(exportDevnetSecret()!)).toHaveLength(64);
    expect(Keypair.fromSecretKey(bs58.decode(exportDevnetSecret()!)).publicKey.equals(pair!.publicKey)).toBe(true);
  });

  test("the hook follows create, forget and other tabs", () => {
    const { result } = renderHook(() => useDevnetAddress());
    expect(result.current).toBeNull();
    let address = "";
    act(() => {
      address = createDevnetKeypair()!.publicKey.toBase58();
    });
    expect(result.current).toBe(address);
    act(() => forgetDevnetKeypair());
    expect(result.current).toBeNull();

    const other = Keypair.generate();
    act(() => {
      localStorage.setItem(DEVNET_WALLET_KEY, JSON.stringify({ v: 1, secretKey: bs58.encode(other.secretKey) }));
      window.dispatchEvent(new StorageEvent("storage", { key: DEVNET_WALLET_KEY }));
    });
    expect(result.current).toBe(other.publicKey.toBase58());
  });

  test("ignores corrupt storage and survives blocked storage", () => {
    localStorage.setItem(DEVNET_WALLET_KEY, "{not json");
    expect(getDevnetKeypair()).toBeNull();
    localStorage.setItem(DEVNET_WALLET_KEY, JSON.stringify({ v: 2, secretKey: "x" }));
    expect(getDevnetKeypair()).toBeNull();
    localStorage.removeItem(DEVNET_WALLET_KEY);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(createDevnetKeypair()).toBeNull();
  });
});
