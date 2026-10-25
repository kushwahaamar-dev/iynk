import { configAccountReady } from "@/lib/solana/config-ready";
import { env, features } from "./env";

// Proof of Build shows only once the program's Config account is on devnet. The server reads it for every browser,
// at most once a minute while it is missing and every ten minutes once it is there, so a page view never sends the
// browser to the public RPC (whose 429s would land in the console).
const FOUND_MS = 10 * 60_000;
const MISSING_MS = 60_000;
const TIMEOUT_MS = 2_000;

let last: { ready: boolean; at: number } | null = null;
let inflight: Promise<boolean> | null = null;

async function read(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), TIMEOUT_MS);
  });
  try {
    return await Promise.race([configAccountReady({ rpc: env.SOLANA_RPC_URL }), timedOut]);
  } finally {
    clearTimeout(timer);
  }
}

/** Whether Proof of Build is on: the issuer key and program id are set and the Config account exists. */
export async function solanaReady(): Promise<boolean> {
  if (!features.solana) return false;
  if (last && Date.now() - last.at < (last.ready ? FOUND_MS : MISSING_MS)) return last.ready;
  inflight ??= read()
    .then((ready) => {
      last = { ready, at: Date.now() };
      return ready;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
