import { checkOrigin, clientIp, fail, json, notConfigured, parseBody } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/ratelimit";
import { issuerContext } from "@/lib/server/solana/context";
import { dripDevnetSol, faucetBody } from "@/lib/server/solana/faucet";

export async function POST(req: Request): Promise<Response> {
  const refused = checkOrigin(req) ?? checkRateLimit(req, "solana-faucet", { limit: 5, windowMs: 60_000 });
  if (refused) return refused;
  const ctx = issuerContext();
  if (!ctx) return notConfigured("The devnet faucet");
  const body = await parseBody(req, faucetBody, { maxBytes: 1024 });
  if (!body.ok) return body.response;
  const result = await dripDevnetSol(ctx, body.data.to, clientIp(req));
  return result.ok ? json(result.data) : fail(result.status, result.code, result.message);
}
