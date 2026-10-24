import { connection } from "next/server";
import { getSql } from "@/lib/server/db/client";
import { getLeaderboard } from "@/lib/server/db/queries";
import { leaderboardQuery } from "@/lib/server/db/schema";
import { features } from "@/lib/server/env";
import { checkOrigin, fail, json, notConfigured } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/ratelimit";

/** GET ?course=<id>&session=<own session id>&limit=1..50 → LeaderboardResponse. */
export async function GET(req: Request) {
  // Answer per request: the board changes with every lap and the env decides the feature.
  await connection();
  const badOrigin = checkOrigin(req);
  if (badOrigin) return badOrigin;
  const limited = checkRateLimit(req, "leaderboard", { limit: 300, windowMs: 60_000 });
  if (limited) return limited;
  const sql = getSql();
  if (!features.db || !sql) return notConfigured("Leaderboards");

  const query = leaderboardQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!query.success) return fail(400, "bad_request", "Give a course id, and optionally session and limit (1-50).");

  try {
    return json(await getLeaderboard(sql, query.data));
  } catch (error) {
    console.error("leaderboard: query failed:", error instanceof Error ? error.message : error);
    return fail(502, "db_unavailable", "The leaderboard database did not answer.");
  }
}
