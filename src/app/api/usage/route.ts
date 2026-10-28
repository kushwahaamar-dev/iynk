import { connection } from "next/server";
import { ledger } from "@/lib/server/ai/ledger";
import { callerKey } from "@/lib/server/ai/guard";
import { requireServerToken } from "@/lib/server/access";
import { features } from "@/lib/server/env";
import { checkOrigin, fail, featureDisabled, json } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/ratelimit";

// What this key has used so far. The ledger is memory only here, and the key is hashed and dropped.
export async function GET(req: Request) {
  await connection();
  const refused = checkOrigin(req) ?? requireServerToken(req);
  if (refused) return refused;

  const kind = new URL(req.url).searchParams.get("kind");
  if (kind !== "ai" && kind !== "search") return fail(400, "bad_request", "kind must be ai or search.");
  if (!features[kind]) return featureDisabled(kind === "ai" ? "The AI partner" : "Search");

  const limited = checkRateLimit(req, "usage", { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const caller = callerKey(req);
  if (!caller.ok) return caller.response;
  const summary = ledger.summary(ledger.keyId(caller.key));

  if (kind === "search") {
    const { today, month, monthlyCap } = summary.search;
    return json({ kind, day: summary.day, month: summary.month, today, monthTotal: month, cap: monthlyCap });
  }
  const { today, month, dailyCap } = summary.ai;
  return json({ kind, day: summary.day, month: summary.month, today, monthTotal: month, cap: dailyCap });
}
