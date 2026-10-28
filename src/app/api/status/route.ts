import { connection } from "next/server";
import { features } from "@/lib/server/env";
import { json } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/ratelimit";

// No `runtime` export: cacheComponents is on, and it rejects that config (nodejs is the default).

export async function GET(req: Request) {
  // Features come from this deployment's environment, so answer per request, never from the build.
  await connection();
  const limited = checkRateLimit(req, "status", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;
  return json({ features }, { headers: { "cache-control": "public, max-age=60" } });
}
