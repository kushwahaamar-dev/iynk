import { connection } from "next/server";
import { LIVE_TTL_MS, liveCounters } from "@/lib/server/db/live";
import { features } from "@/lib/server/env";
import { checkOrigin, fail, json, notConfigured } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/ratelimit";

const ttl = Math.round(LIVE_TTL_MS / 1000);

/** GET → LiveResponse: builders, LEDs blinked, drones flown and events per minute, last 60 minutes. */
export async function GET(req: Request) {
  await connection();
  const badOrigin = checkOrigin(req);
  if (badOrigin) return badOrigin;
  const limited = checkRateLimit(req, "live", { limit: 600, windowMs: 60_000 });
  if (limited) return limited;
  if (!features.db) return notConfigured("Live counters");

  try {
    // The same answer for everyone, so the CDN may share it for the TTL too.
    return json(await liveCounters(), {
      headers: { "cache-control": `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${ttl * 3}` },
    });
  } catch (error) {
    console.error("live: query failed:", error instanceof Error ? error.message : error);
    return fail(502, "db_unavailable", "The live counter database did not answer.");
  }
}
