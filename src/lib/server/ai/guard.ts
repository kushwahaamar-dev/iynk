import "server-only";
import { features, type Features } from "@/lib/server/env";
import { requireServerToken } from "@/lib/server/access";
import { checkOrigin, clientIp, fail, featureDisabled } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/ratelimit";
import { parseSecret } from "@/lib/keys/format";
import { ledger } from "./ledger";
import { AiError, safetyId } from "./provider";

/**
 * The checks every /api/ai/* route runs before it reads the body: our origin
 * only (H11), the server token, the feature is on, and the caller's per-minute limit.
 * The daily token cap is per key, so the routes check it with `aiCap` once they have the key.
 */
export function guardAi(req: Request, route: string, perMinute: number, feature: keyof Features = "ai"): Response | null {
  const refused = checkOrigin(req) ?? requireServerToken(req);
  if (refused) return refused;
  if (!features[feature]) return featureDisabled(feature === "ai" ? "The AI partner" : `AI ${feature}`);
  return checkRateLimit(req, `ai:${route}`, { limit: perMinute, windowMs: 60_000 });
}

export type CallerKey = { ok: true; key: string } | { ok: false; response: Response };

/** The provider key the caller sent for this call; it is used once and never stored. */
export function callerKey(req: Request): CallerKey {
  const header = req.headers.get("x-iynk-provider-key");
  if (!header?.trim()) return { ok: false, response: fail(422, "key_required", "Add your AI key to use this.") };
  const parsed = parseSecret(header);
  if (!parsed.ok) return { ok: false, response: fail(400, "bad_key", "That AI key does not look right.") };
  return { ok: true, key: parsed.value };
}

/** 429 with the time to the next UTC midnight when this key has used up today's tokens; null when it may go on. */
export function aiCap(keyId: string): Response | null {
  const check = ledger.checkAi(keyId);
  if (check.ok) return null;
  return fail(429, "quota_exhausted", "This key has reached its daily limit. Try again after midnight UTC.", {
    "Retry-After": String(check.retryAfterSec),
  });
}

/** The hashed caller id sent as Meta's safety_identifier. */
export const aiUser = (req: Request) => safetyId(clientIp(req));

/** Maps a failure to the contract's error response; upstream detail stays in the log. */
export function aiFailure(error: unknown): Response {
  if (error instanceof AiError) {
    if (error.code === "not_configured") return featureDisabled("The AI partner");
    if (error.code === "upstream_timeout") return fail(504, "upstream_timeout");
    if (error.code === "aborted") return fail(499, "aborted", "The request was cancelled.");
    if (error.code === "upstream_busy") return fail(502, "upstream_busy", "The AI service is busy. Try again in a moment.");
    return fail(502, "upstream_failed");
  }
  console.error("[ai] unexpected error:", error instanceof Error ? `${error.name}: ${error.message}` : typeof error);
  return fail(500, "internal");
}
