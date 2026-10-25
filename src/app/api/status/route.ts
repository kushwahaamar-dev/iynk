import { connection } from "next/server";
import { features } from "@/lib/server/env";
import { json } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/ratelimit";
import { solanaReady } from "@/lib/server/solana-ready";

// No `runtime` export: cacheComponents is on, and it rejects that config (nodejs is the default).

export async function GET(req: Request) {
  // Features come from this deployment's environment, so answer per request, never from the build.
  await connection();
  const limited = checkRateLimit(req, "status", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;
  // Proof of Build also needs its Config account on devnet; the server checks, so browsers never ask the RPC.
  return json({ features: { ...features, solana: await solanaReady() } }, { headers: { "cache-control": "public, max-age=60" } });
}
