import "server-only";
import { createHash } from "node:crypto";
import type { TelemetryKind } from "@/lib/telemetry/kinds";
import type { BuddyProfile, LeaderboardResponse, LeaderboardRow, LiveResponse } from "@/lib/telemetry/responses";
import type { Sql } from "./client";
import type { Profile } from "./schema";

export type EventRow = {
  ts: Date;
  kind: TelemetryKind;
  session: string;
  room: string | null;
  item: string | null;
  data: Record<string, unknown>;
};

/**
 * A Postgres array literal for a parameter cast to text[] or timestamptz[]. Not sql.array(): postgres.js serializes
 * that from an array-type table a pool fills only once a connection has fetched pg_type, so on a fresh serverless
 * instance a concurrent query went out as "a,b" and failed with "malformed array literal".
 */
export function arrayLiteral(values: readonly (string | null)[]): string {
  return `{${values.map((v) => (v === null ? "NULL" : `"${v.replace(/["\\]/g, "\\$&")}"`)).join(",")}}`;
}

/**
 * One INSERT for any number of rows: six array parameters unnested server-side,
 * so the statement and its parameter count stay the same at 1 row or 5,000.
 */
export async function insertEvents(sql: Sql, rows: readonly EventRow[]): Promise<void> {
  if (rows.length === 0) return;
  await sql`
    INSERT INTO events (ts, kind, session, room, item, data)
    SELECT u.ts, u.kind, u.session, u.room, u.item, u.data::jsonb
    FROM unnest(
      ${arrayLiteral(rows.map((r) => r.ts.toISOString()))}::timestamptz[],
      ${arrayLiteral(rows.map((r) => r.kind))}::text[],
      ${arrayLiteral(rows.map((r) => r.session))}::text[],
      ${arrayLiteral(rows.map((r) => r.room))}::text[],
      ${arrayLiteral(rows.map((r) => r.item))}::text[],
      ${arrayLiteral(rows.map((r) => JSON.stringify(r.data)))}::text[]
    ) AS u(ts, kind, session, room, item, data)`;
}

type RankedRow = { rank: number; name: string; best_ms: number; laps: number; pilots: number; you: boolean };

/** Best lap per pilot session over every day in laps_best_daily, ranked, plus the asker's own row. */
export async function getLeaderboard(
  sql: Sql,
  { course, session, limit }: { course: string; session?: string; limit: number },
): Promise<LeaderboardResponse> {
  const me = session ?? "";
  const rows = await sql<RankedRow[]>`
    WITH best AS (
      SELECT session,
             min(best_ms) AS best_ms,
             sum(laps) AS laps,
             (array_agg(name ORDER BY day DESC, best_ms ASC))[1] AS name
      FROM laps_best_daily
      WHERE course = ${course}
      GROUP BY session
    ), ranked AS (
      SELECT session, name, best_ms, laps,
             rank() OVER (ORDER BY best_ms ASC) AS rank,
             count(*) OVER () AS pilots
      FROM best
    )
    SELECT rank::int AS rank, name, best_ms::float8 AS best_ms, laps::int AS laps,
           pilots::int AS pilots, (session = ${me}) AS you
    FROM ranked
    WHERE rank <= ${limit} OR session = ${me}
    ORDER BY (session = ${me}) DESC, rank, best_ms
    LIMIT ${limit + 1}`;

  const toRow = (r: RankedRow): LeaderboardRow => ({
    rank: r.rank,
    name: r.name ? r.name : null,
    timeMs: Math.round(r.best_ms),
    laps: r.laps,
    you: r.you,
  });
  // The asker's row comes first so the LIMIT can never cut it; the board itself is by rank.
  const all = rows.map(toRow);
  const you = all.find((r) => r.you) ?? null;
  const top = all.filter((r) => r.rank <= limit).sort((a, b) => a.rank - b.rank || a.timeMs - b.timeMs).slice(0, limit);
  return { course, rows: top, you, pilots: rows[0]?.pilots ?? 0, updatedAt: new Date().toISOString() };
}

const LIVE_WINDOW_MINUTES = 60;

type LiveTotals = { builders: number; leds: number; flights: number; lessons: number; events: number };

/** Counters for the last 60 minutes (the current minute included) from activity_1m. */
export async function getLiveCounters(sql: Sql, now: Date = new Date()): Promise<LiveResponse> {
  const start = new Date(Math.floor(now.getTime() / 60_000) * 60_000 - (LIVE_WINDOW_MINUTES - 1) * 60_000);
  const [totals] = await sql<LiveTotals[]>`
    SELECT count(DISTINCT session)::int AS builders,
           coalesce(sum(units) FILTER (WHERE kind = 'led.blink'), 0)::float8 AS leds,
           coalesce(sum(units) FILTER (WHERE kind = 'flight.start'), 0)::float8 AS flights,
           coalesce(sum(units) FILTER (WHERE kind = 'lesson.pass'), 0)::float8 AS lessons,
           coalesce(sum(events), 0)::float8 AS events
    FROM activity_1m
    WHERE bucket >= ${start}`;
  const minutes = await sql<{ bucket: Date; events: number }[]>`
    SELECT bucket, sum(events)::float8 AS events
    FROM activity_1m
    WHERE bucket >= ${start}
    GROUP BY bucket
    ORDER BY bucket`;

  const perMinute = new Array<number>(LIVE_WINDOW_MINUTES).fill(0);
  for (const m of minutes) {
    const index = Math.round((new Date(m.bucket).getTime() - start.getTime()) / 60_000);
    if (index >= 0 && index < LIVE_WINDOW_MINUTES) perMinute[index] = m.events;
  }
  return {
    windowMinutes: LIVE_WINDOW_MINUTES,
    builders: totals?.builders ?? 0,
    ledsBlinked: totals?.leds ?? 0,
    dronesFlown: totals?.flights ?? 0,
    lessonsPassed: totals?.lessons ?? 0,
    events: totals?.events ?? 0,
    perMinute,
    updatedAt: now.toISOString(),
  };
}

function hashToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

type ProfileRow = { id: string; name: string; lang: BuddyProfile["lang"]; interests: string[]; built: string[]; wants: string };

/**
 * Creates or refreshes a profile and pushes its expiry 24 h out. Only the token
 * that created it may change it, unless it has already expired. Returns null
 * when the id belongs to someone else.
 */
export async function upsertProfile(sql: Sql, p: Profile, token: string): Promise<{ expiresAt: Date } | null> {
  const [row] = await sql<{ expires_at: Date }[]>`
    INSERT INTO profiles AS p (id, token_hash, name, lang, interests, built, wants, updated_at, expires_at)
    VALUES (${p.id}, ${hashToken(token)}, ${p.name}, ${p.lang}, ${arrayLiteral(p.interests)}::text[],
            ${arrayLiteral(p.built)}::text[], ${p.wants}, now(), now() + INTERVAL '24 hours')
    ON CONFLICT (id) DO UPDATE SET
      token_hash = EXCLUDED.token_hash,
      name = EXCLUDED.name,
      lang = EXCLUDED.lang,
      interests = EXCLUDED.interests,
      built = EXCLUDED.built,
      wants = EXCLUDED.wants,
      updated_at = now(),
      expires_at = now() + INTERVAL '24 hours'
    WHERE p.token_hash = EXCLUDED.token_hash OR p.expires_at <= now()
    RETURNING p.expires_at`;
  return row ? { expiresAt: new Date(row.expires_at) } : null;
}

/** The newest live profiles, at most `limit`, without the asker's own. */
export async function listProfiles(sql: Sql, { exclude, limit }: { exclude?: string; limit: number }): Promise<BuddyProfile[]> {
  const rows = await sql<ProfileRow[]>`
    SELECT id, name, lang, interests, built, wants
    FROM profiles
    WHERE expires_at > now() AND id <> ${exclude ?? ""}
    ORDER BY updated_at DESC
    LIMIT ${limit}`;
  return rows.map((r) => ({ id: r.id, name: r.name, lang: r.lang, interests: r.interests, built: r.built, wants: r.wants }));
}

/** Opting out. False when the id and token don't match a profile. */
export async function deleteProfile(sql: Sql, id: string, token: string): Promise<boolean> {
  const rows = await sql`DELETE FROM profiles WHERE id = ${id} AND token_hash = ${hashToken(token)} RETURNING id`;
  return rows.length > 0;
}
