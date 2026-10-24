import "server-only";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { env } from "@/lib/server/env";

// The server's devnet connection, program id and issuer key (H1, H6). The
// issuer is also the fee payer and the faucet treasury. Nothing here is ever
// logged or returned; only public keys leave this module.

export type ReadContext = { connection: Connection; programId: PublicKey };
export type IssuerContext = ReadContext & { issuer: Keypair };

const RPC_TIMEOUT_MS = 12_000;

/** One retry with jitter on 429 and 5xx, and a timeout on every RPC call (H2). */
const rpcFetch: typeof fetch = async (input, init) => {
  const attempt = () => fetch(input, { ...init, signal: AbortSignal.timeout(RPC_TIMEOUT_MS) });
  const first = await attempt();
  if (first.status !== 429 && first.status < 500) return first;
  await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 500));
  return attempt();
};

let connection: Connection | null = null;

function rpc(): Connection {
  connection ??= new Connection(env.SOLANA_RPC_URL, { commitment: "confirmed", fetch: rpcFetch, disableRetryOnRateLimit: true });
  return connection;
}

function programId(): PublicKey | null {
  if (!env.NEXT_PUBLIC_SOLANA_PROGRAM_ID) return null;
  try {
    return new PublicKey(env.NEXT_PUBLIC_SOLANA_PROGRAM_ID);
  } catch {
    return null;
  }
}

/** For reads: the program id is enough. Null when this deployment has no program. */
export function readContext(): ReadContext | null {
  const id = programId();
  return id ? { connection: rpc(), programId: id } : null;
}

let issuer: Keypair | null = null;

/** For writes: also needs the issuer key. Null when either is missing. */
export function issuerContext(): IssuerContext | null {
  const read = readContext();
  if (!read || !env.SOLANA_ISSUER_KEYPAIR) return null;
  try {
    issuer ??= Keypair.fromSecretKey(env.SOLANA_ISSUER_KEYPAIR);
  } catch {
    return null;
  }
  return { ...read, issuer };
}
