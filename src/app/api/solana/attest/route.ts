import { checkOrigin, fail, json, notConfigured, parseBody } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/ratelimit";
import { attest, attestBody } from "@/lib/server/solana/attest";
import { issuerContext } from "@/lib/server/solana/context";

export async function POST(req: Request): Promise<Response> {
  const refused = checkOrigin(req) ?? checkRateLimit(req, "solana-attest", { limit: 10, windowMs: 60_000 });
  if (refused) return refused;
  const ctx = issuerContext();
  if (!ctx) return notConfigured("Proof of Build");
  const body = await parseBody(req, attestBody);
  if (!body.ok) return body.response;
  const result = await attest(ctx, body.data);
  return result.ok ? json(result.data) : fail(result.status, result.code, result.message);
}
