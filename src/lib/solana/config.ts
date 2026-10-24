import { PublicKey } from "@solana/web3.js";

// Client-side Solana settings. NEXT_PUBLIC_ values are inlined at build time,
// so they are read here by their literal names. SimLab is devnet-only (H11).

export const CLUSTER = "devnet";

export const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

function parseProgramId(raw: string | undefined): PublicKey | null {
  if (!raw || (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet") !== CLUSTER) return null;
  try {
    return new PublicKey(raw);
  } catch {
    return null;
  }
}

/** The simlab_passport program, or null when this deployment has none. */
export const PROGRAM_ID: PublicKey | null = parseProgramId(process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID);

export const LAMPORTS_PER_SOL = 1_000_000_000;

export function explorerUrl(kind: "tx" | "address", value: string): string {
  return `https://explorer.solana.com/${kind}/${value}?cluster=${CLUSTER}`;
}

export function isAddress(value: string): boolean {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return false;
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

export function shortAddress(value: string): string {
  return value.length > 12 ? `${value.slice(0, 4)}…${value.slice(-4)}` : value;
}
