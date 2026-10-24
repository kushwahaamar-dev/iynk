import "server-only";
import { features, type Features } from "@/lib/server/env";
import { checkOrigin, clientIp, fail, notConfigured } from "@/lib/server/http";
import { checkRateLimit, rateLimit, tooManyRequests } from "@/lib/server/ratelimit";
import { AiError, safetyId } from "./provider";

/** Upstream calls this instance makes per hour across all callers: a quota guard for the demo's credits. */
const AI_BUDGET = { limit: 900, windowMs: 60 * 60 * 1000 };
const IMAGE_BUDGET = { limit: 60, windowMs: 60 * 60 * 1000 };

/**
 * The checks every /api/ai/* route runs before it reads the body: our origin
 * only (H11), the feature is set up, the caller's per-minute limit, and the
 * instance-wide hourly budget.
 */
export function guardAi(req: Request, route: string, perMinute: number, feature: keyof Features = "ai"): Response | null {
  const refused = checkOrigin(req);
  if (refused) return refused;
  if (!features[feature]) return notConfigured(feature === "ai" ? "The AI partner" : `AI ${feature}`);
  const limited = checkRateLimit(req, `ai:${route}`, { limit: perMinute, windowMs: 60_000 });
  if (limited) return limited;
  const budget = rateLimit(feature === "image" ? "ai:budget:image" : "ai:budget", feature === "image" ? IMAGE_BUDGET : AI_BUDGET);
  return budget.ok ? null : tooManyRequests(budget);
}

/** The hashed caller id sent as Meta's safety_identifier. */
export const aiUser = (req: Request) => safetyId(clientIp(req));

/** Maps a failure to the contract's error response; upstream detail stays in the log. */
export function aiFailure(error: unknown): Response {
  if (error instanceof AiError) {
    if (error.code === "not_configured") return notConfigured("The AI partner");
    if (error.code === "upstream_timeout") return fail(504, "upstream_timeout");
    if (error.code === "aborted") return fail(499, "aborted", "The request was cancelled.");
    if (error.code === "upstream_busy") return fail(502, "upstream_busy", "The AI service is busy. Try again in a moment.");
    return fail(502, "upstream_failed");
  }
  console.error("[ai] unexpected error:", error instanceof Error ? `${error.name}: ${error.message}` : typeof error);
  return fail(500, "internal");
}
