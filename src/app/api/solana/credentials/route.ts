import { PublicKey } from "@solana/web3.js";
import { connection } from "next/server";
import { checkOrigin, fail, json, notConfigured } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/ratelimit";
import { walletAddress } from "@/lib/server/solana/common";
import { readContext } from "@/lib/server/solana/context";
import { credentialsOf } from "@/lib/solana/reads";

export async function GET(req: Request): Promise<Response> {
  // Credentials change on-chain at any time: answer per request, never from the build.
  await connection();
  const refused = checkOrigin(req) ?? checkRateLimit(req, "solana-credentials", { limit: 30, windowMs: 60_000 });
  if (refused) return refused;
  const learner = walletAddress.safeParse(new URL(req.url).searchParams.get("learner") ?? "");
  if (!learner.success) return fail(400, "bad_request", "Pass ?learner=<wallet address>.");
  const ctx = readContext();
  if (!ctx) return notConfigured("Proof of Build");
  try {
    const credentials = await credentialsOf(ctx.connection, ctx.programId, new PublicKey(learner.data));
    return json({ credentials });
  } catch {
    return fail(502, "upstream_failed", "Solana devnet did not answer. Try again in a moment.");
  }
}
