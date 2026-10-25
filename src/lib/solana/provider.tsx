"use client";

import type { WalletError } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { RPC_URL } from "./config";
import { DevnetWalletAdapter } from "./devnet-adapter";

// Wallet Standard wallets (Phantom, Solflare, Backpack) are detected by
// WalletProvider itself; the iynk devnet wallet is the one adapter we add.

const Mounted = createContext(false);

// Connect errors surface in the wallet bar; the provider reports them here.
let lastError: WalletError | null = null;
const errorListeners = new Set<() => void>();

function reportWalletError(error: WalletError) {
  lastError = error;
  for (const listener of errorListeners) listener();
}

export function clearWalletError() {
  if (!lastError) return;
  lastError = null;
  for (const listener of errorListeners) listener();
}

function subscribeErrors(listener: () => void) {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}

/** The last wallet connection error, until cleared. */
export function useWalletError(): WalletError | null {
  return useSyncExternalStore(
    subscribeErrors,
    () => lastError,
    () => null,
  );
}

function Provider({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new DevnetWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={RPC_URL} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect localStorageKey="iynk:wallet-choice:v1" onError={reportWalletError}>
        <Mounted.Provider value>{children}</Mounted.Provider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

/**
 * Wraps its children in the Solana providers unless an outer SolanaProvider
 * already did, so a panel, a tip button and a page can each be used alone.
 */
export function SolanaProvider({ children }: { children: ReactNode }) {
  return useContext(Mounted) ? <>{children}</> : <Provider>{children}</Provider>;
}
