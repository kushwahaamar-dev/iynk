import { storeEvents, toRows } from "@/lib/server/db/ingest";
import { telemetryBatch } from "@/lib/server/db/schema";
import { features } from "@/lib/server/env";
import { checkOrigin, fail, json, notConfigured, parseBody } from "@/lib/server/http";
import { checkRateLimit, rateLimit, tooManyRequests } from "@/lib/server/ratelimit";
import { MAX_BODY_BYTES } from "@/lib/telemetry/kinds";

// No `runtime` export: cacheComponents rejects it, and Node.js is the default.

/**
 * POST { events: [{ ts, kind, session, room?, item?, data }] (≤ 200), sentAt? }.
 * Answers 202 { accepted, dropped } once the valid events are stored.
 * The per-IP limit is generous because a venue's Wi-Fi puts hundreds of
 * builders behind one address; each session gets its own tighter limit.
 */
export async function POST(req: Request) {
  const badOrigin = checkOrigin(req);
  if (badOrigin) return badOrigin;
  const limited = checkRateLimit(req, "telemetry", { limit: 1200, windowMs: 60_000 });
  if (limited) return limited;
  if (!features.db) return notConfigured("Telemetry");

  const body = await parseBody(req, telemetryBatch, { maxBytes: MAX_BODY_BYTES });
  if (!body.ok) return body.response;

  const now = Date.now();
  const { rows, dropped } = toRows(body.data.events, { sentAt: body.data.sentAt, now });
  if (rows.length === 0) return fail(400, "bad_request", "No event in the batch is valid.");

  for (const session of new Set(rows.map((r) => r.session))) {
    const perSession = rateLimit(`telemetry-session:${session}`, { limit: 30, windowMs: 60_000 }, now);
    if (!perSession.ok) return tooManyRequests(perSession);
  }

  try {
    await storeEvents(rows);
  } catch (error) {
    console.error("telemetry: insert failed:", error instanceof Error ? error.message : error);
    return fail(502, "db_unavailable", "The telemetry database did not answer.");
  }
  return json({ accepted: rows.length, dropped }, { status: 202 });
}
