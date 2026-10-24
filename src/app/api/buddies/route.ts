import { connection } from "next/server";
import { getSql, type Sql } from "@/lib/server/db/client";
import { deleteProfile, listProfiles, upsertProfile } from "@/lib/server/db/queries";
import { buddyDelete, buddyPost, buddyQuery } from "@/lib/server/db/schema";
import { features } from "@/lib/server/env";
import { checkOrigin, fail, json, notConfigured, parseBody } from "@/lib/server/http";
import { checkRateLimit } from "@/lib/server/ratelimit";
import type { BuddiesResponse, BuddyPostResponse } from "@/lib/telemetry/responses";

const MAX_BODY = 8 * 1024;

type Gate = { sql: Sql; refused?: undefined } | { sql?: undefined; refused: Response };

function open(req: Request, bucket: string, limit: number): Gate {
  const refused = checkOrigin(req) ?? checkRateLimit(req, bucket, { limit, windowMs: 60_000 });
  if (refused) return { refused };
  const sql = getSql();
  return features.db && sql ? { sql } : { refused: notConfigured("The buddy pool") };
}

function dbFailed(error: unknown): Response {
  console.error("buddies: query failed:", error instanceof Error ? error.message : error);
  return fail(502, "db_unavailable", "The buddy pool database did not answer.");
}

/** GET ?exclude=<own id>&limit=1..50 → { profiles } (the pool /api/ai/match reads). */
export async function GET(req: Request) {
  await connection();
  const gate = open(req, "buddies-read", 120);
  if (gate.refused) return gate.refused;
  const query = buddyQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!query.success) return fail(400, "bad_request", "exclude must be a profile id and limit 1-50.");
  try {
    const response: BuddiesResponse = { profiles: await listProfiles(gate.sql, query.data) };
    return json(response);
  } catch (error) {
    return dbFailed(error);
  }
}

/** POST { profile, token } → opts in or refreshes; the profile expires 24 h after its last POST. */
export async function POST(req: Request) {
  const gate = open(req, "buddies-write", 30);
  if (gate.refused) return gate.refused;
  const body = await parseBody(req, buddyPost, { maxBytes: MAX_BODY });
  if (!body.ok) return body.response;
  const { profile, token } = body.data;
  try {
    const saved = await upsertProfile(gate.sql, profile, token);
    if (!saved) return fail(403, "not_yours", "That profile id belongs to someone else.");
    const response: BuddyPostResponse = { profile, expiresAt: saved.expiresAt.toISOString() };
    return json(response);
  } catch (error) {
    return dbFailed(error);
  }
}

/** DELETE { id, token } → opts out now instead of waiting for the 24 h expiry. */
export async function DELETE(req: Request) {
  const gate = open(req, "buddies-write", 30);
  if (gate.refused) return gate.refused;
  const body = await parseBody(req, buddyDelete, { maxBytes: MAX_BODY });
  if (!body.ok) return body.response;
  try {
    const deleted = await deleteProfile(gate.sql, body.data.id, body.data.token);
    return deleted ? json({ deleted: true }) : fail(404, "not_found", "No profile with that id and token.");
  } catch (error) {
    return dbFailed(error);
  }
}
