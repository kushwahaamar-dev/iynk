"use client";

import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { PROGRAM_ID } from "@/lib/solana/config";
import { configAddress, decodeConfigIssuer, type Credential } from "@/lib/solana/passport";
import { credentialAt, credentialsOf } from "@/lib/solana/reads";

export type ChainRead<T> = { status: "idle" } | { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

/**
 * Runs one read against Solana devnet whenever `key` changes; `key` null
 * means nothing to read. Stale answers from an earlier key are dropped.
 */
function useRead<T>(key: string | null, read: (programId: PublicKey) => Promise<T>, retry: number): ChainRead<T> {
  const [state, setState] = useState<{ key: string; retry: number; read: ChainRead<T> } | null>(null);

  useEffect(() => {
    if (!key || !PROGRAM_ID) return;
    let live = true;
    read(PROGRAM_ID).then(
      (data) => live && setState({ key, retry, read: { status: "ready", data } }),
      () => live && setState({ key, retry, read: { status: "error" } }),
    );
    return () => {
      live = false;
    };
    // `read` is rebuilt each render; `key` and `retry` say when to read again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, retry]);

  if (!key || !PROGRAM_ID) return { status: "idle" };
  return state && state.key === key && state.retry === retry ? state.read : { status: "loading" };
}

/** The issuer the program is configured with, to check who signed a credential. */
export function useConfigIssuer(): string | null {
  const { connection } = useConnection();
  const read = useRead(
    "config",
    async (programId) => {
      const info = await connection.getAccountInfo(configAddress(programId));
      return info ? decodeConfigIssuer(info.data) : null;
    },
    0,
  );
  return read.status === "ready" ? read.data : null;
}

export function useCredentialsOf(learner: string | null, retry = 0): ChainRead<Credential[]> {
  const { connection } = useConnection();
  return useRead(learner ? `learner:${learner}` : null, (programId) => credentialsOf(connection, programId, new PublicKey(learner as string)), retry);
}

export function useCredentialAt(address: string | null, retry = 0): ChainRead<Credential | null> {
  const { connection } = useConnection();
  return useRead(address ? `credential:${address}` : null, (programId) => credentialAt(connection, programId, new PublicKey(address as string)), retry);
}
