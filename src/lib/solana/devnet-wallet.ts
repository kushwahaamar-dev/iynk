import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { useSyncExternalStore } from "react";

// The "iynk devnet wallet": a keypair kept in this browser so a judge can
// try Proof of Build without installing a wallet. Devnet only, labelled as
// such everywhere it shows. Storage may be missing or blocked (private
// windows, previews), so every access is guarded and the wallet then simply
// does not exist.

export const DEVNET_WALLET_KEY = "iynk:wallet:v1";

type Stored = { v: 1; secretKey: string };

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedPair: Keypair | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(DEVNET_WALLET_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Keypair | null {
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as Partial<Stored>;
    if (stored.v !== 1 || typeof stored.secretKey !== "string") return null;
    return Keypair.fromSecretKey(bs58.decode(stored.secretKey));
  } catch {
    return null;
  }
}

/** The stored keypair, decoded once per stored value. */
export function getDevnetKeypair(): Keypair | null {
  if (typeof window === "undefined") return null;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedPair = parse(raw);
  }
  return cachedPair;
}

function notify() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key === null || event.key === DEVNET_WALLET_KEY) notify();
}

export function subscribeDevnetWallet(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** Makes a fresh keypair, or returns the existing one. Null when storage is unavailable. */
export function createDevnetKeypair(): Keypair | null {
  const existing = getDevnetKeypair();
  if (existing) return existing;
  const pair = Keypair.generate();
  const stored: Stored = { v: 1, secretKey: bs58.encode(pair.secretKey) };
  try {
    window.localStorage.setItem(DEVNET_WALLET_KEY, JSON.stringify(stored));
  } catch {
    return null;
  }
  notify();
  return getDevnetKeypair();
}

export function forgetDevnetKeypair(): void {
  try {
    window.localStorage.removeItem(DEVNET_WALLET_KEY);
  } catch {
    // Nothing stored that we could remove.
  }
  notify();
}

/** The secret key in the base58 form Phantom, Solflare and Backpack import. */
export function exportDevnetSecret(): string | null {
  const pair = getDevnetKeypair();
  return pair ? bs58.encode(pair.secretKey) : null;
}

const noServerWallet = () => null;

/** The devnet wallet's address, re-rendering when it is created or forgotten (also from other tabs). */
export function useDevnetAddress(): string | null {
  return useSyncExternalStore(
    subscribeDevnetWallet,
    () => getDevnetKeypair()?.publicKey.toBase58() ?? null,
    noServerWallet,
  );
}
