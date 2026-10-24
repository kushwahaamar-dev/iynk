# SimLab on Tiger Data (hx:data)

Telemetry, leaderboards, live counters and the buddy pool, on Tiger Data (Postgres + TimescaleDB). Written 2026-10-24 by hx:data. Contract: HX-CONTRACT H8, with H2 for the route conventions and H11 for privacy.

## What judges should see

- **One database, two shapes of data.** The `events` hypertable takes the high-frequency stream: flight samples at 1 Hz, laps, lesson attempts, faults, room actions. Next to it, `profiles` is an ordinary relational table for the opt-in buddy pool, with a 24-hour expiry.
- **Continuous aggregates do the work.** The leaderboard reads `laps_best_daily` and the "right now at HackTX" counter reads `activity_1m`. Both are real-time aggregates, so a lap flown a second ago is on the board straight away, while the history comes from materialized buckets.
- **Retention without losing the board.** Raw events are dropped after 30 days. The laps aggregate refreshes only its last 3 days, so its daily bests outlive the raw laps, and the all-time board survives retention.
- **Columnstore.** Event chunks move to the columnstore after a day, segmented by `kind` and ordered by `ts DESC`.
- **A TimescaleDB job.** `simlab_expire_profiles` deletes expired profiles every 15 minutes. Reads also filter on `expires_at`, so a profile disappears at 24 hours exactly.
- **Ingest built for a venue.** Browsers batch their events. The server validates each event on its own and corrects client clock skew. Concurrent requests are coalesced into one `INSERT … SELECT FROM unnest(…)` with six array parameters, whatever the row count.

## Schema (db/migrations)

| File | What it creates |
|---|---|
| 0001_events.sql | `events (ts timestamptz, kind text, session text, room text null, item text null, data jsonb)` as a hypertable (`tsdb.hypertable`, 1-day chunks, `segmentby = kind`, `orderby = ts DESC`); index `(kind, ts DESC)`; columnstore policy after 1 day; retention 30 days |
| 0002_aggregates.sql | `laps_best_daily (day, course, session, name, best_ms, laps)` from `kind = 'flight.lap'` (refresh every 15 min over [now − 3 days, now − 1 h]); `activity_1m (bucket, kind, session, events, units)` (refresh every minute over [now − 2 h, now − 1 min]; retention 7 days). Both have `materialized_only = false`. |
| 0003_profiles.sql | `profiles (id, token_hash, name ≤ 24, lang, interests ≤ 12, built ≤ 64, wants ≤ 280, updated_at, expires_at)` with CHECK constraints; procedure `simlab_expire_profiles` registered with `add_job` every 15 minutes |

Design notes:
- `laps_best_daily` groups by session as well as course and name. That lets the API mark the asker's own row and keep two pilots who chose the same name apart. The contract's columns (course, name, min time_ms) are all there.
- `activity_1m` groups by session as well as kind. "Distinct builders in the last hour" is then a `count(DISTINCT session)` over at most a few thousand rolled-up rows instead of the raw 1 Hz samples. Summed per minute, its `events` column is the contract's "count by kind per minute". `units` adds up `data.count`, defaulting to 1, so one `led.blink` event can stand for many blinks.
- The aggregates read payload fields only after `jsonb_typeof` checks. One malformed row can never make a refresh fail. The ingest route validates these payloads strictly as well.
- Every statement is idempotent (`IF NOT EXISTS`, `if_not_exists => true`, and a guarded `add_job`).

### Applying it

1. Create a free Tiger Cloud service and copy its connection string (the service URL with `?sslmode=require`) into `.env.local` as `DATABASE_URL`, or into the Vercel project's environment.
2. `node scripts/db-migrate.mjs` applies the pending files in order. Each file runs in its own transaction under an advisory lock, and the runner records version, file and sha256 in `simlab_migrations`. A file that changed after it was applied stops the run. `--status` lists applied and pending files without changing anything. The script never prints the URL.
3. Use the direct service URL. The app sets `statement_timeout` (4 s) and `idle_in_transaction_session_timeout` (10 s) as startup parameters, and some poolers reject those. Prepared statements are off, so a transaction-mode pooler works otherwise.

## Routes

All of them call `checkOrigin`, are rate-limited (`src/lib/server/ratelimit.ts`), answer 503 `not_configured` without `DATABASE_URL`, and answer 502 `db_unavailable` when the database fails. The database's own message is never returned. None exports `runtime`, because cacheComponents rejects it and Node.js is the default. The GET handlers call `connection()` so they are never prerendered.

| Route | In | Out | Limits |
|---|---|---|---|
| POST /api/telemetry | `{ events: [{ ts (epoch ms or ISO), kind, session, room?, item?, data }] (1–200), sentAt? }`, JSON ≤ 60 KiB | 202 `{ accepted, dropped }`. Invalid events are dropped one by one; 400 if none is valid | 1200/min per IP (venue NAT), 30 batches/min per session |
| GET /api/leaderboard?course=&session=&limit= | course slug, own session id (optional), limit 1–50 (default 10) | `LeaderboardResponse { course, rows: [{rank, name, timeMs, laps, you}], you, pilots, updatedAt }` | 300/min per IP |
| GET /api/live | — | `LiveResponse { windowMinutes: 60, builders, ledsBlinked, dronesFlown, lessonsPassed, events, perMinute[60], updatedAt }`. Cached 10 s in memory (single flight) and `s-maxage=10` for the CDN | 600/min per IP |
| GET /api/buddies?exclude=&limit= | own profile id, limit 1–50 (default 50) | `{ profiles: Profile[] }`, newest first, unexpired only (the pool for /api/ai/match) | 120/min per IP |
| POST /api/buddies | `{ profile: Profile, token }` (token: 16–128 chars, kept in the browser) | `{ profile, expiresAt }`. 403 `not_yours` if the id belongs to another token and hasn't expired | 30/min per IP |
| DELETE /api/buddies | `{ id, token }` | `{ deleted: true }`, or 404 | 30/min per IP |

`Profile` is HX-CONTRACT H4's shape: `{ id, name, lang, interests, built, wants }`. Names are cleaned (control, format and bidi characters removed, at most 24 code points). Only `sha256(token)` is stored. Response types live in `src/lib/telemetry/responses.ts`.

### Validation of the known payloads

| Kind | data |
|---|---|
| flight.lap | `{ course: slug, timeMs: int 1000–3 600 000, name?: string (cleaned, ≤ 24) }` plus any extra fields |
| led.blink | `{ count: int 1–100 000 }` |
| every other kind | any JSON object ≤ 2 KiB |

Timestamps: with `sentAt`, every `ts` is shifted by `serverNow − sentAt`. Events from the future are pulled back to now, and ones older than 24 hours are dropped.

## Client: `src/lib/telemetry`

```ts
import { track, tally, setTelemetryContext, onFlushed, telemetrySession, flush } from "@/lib/telemetry";

setTelemetryContext({ room: "ab23cd", item: "quad5" });                // stamped on later events
track("flight.start", { course: "quad5-bando" });
track("flight.sample", { alt: 2.1, speed: 8.4 });                       // kept at most 1 per second
track("flight.lap", { course: "quad5-bando", timeMs: 41_002, name });  // typed payload; sent at once
tally("led.blink", 1);                                                  // summed into one event per flush
```

- Queued events go out every 10 s, or at 50 events. `flight.lap`, `lesson.pass` and `credential.issued` go out at once. Each body holds at most 200 events and 60 KiB. When the page is hidden (`visibilitychange`, `pagehide`), the queue goes out through `navigator.sendBeacon`.
- Before the first send, the client asks `/api/status` once (it is HTTP-cached for 60 s). Without the db feature, or after a 503, the client drops its queue and `track()` returns at once for the rest of the page's life. It does nothing on the server.
- After a 429 or 5xx, or offline, events stay queued (at most 1000) and are retried later.
- `onFlushed(kinds => …)` fires once a batch is stored. The leaderboard uses it to refresh after your own lap.
- Privacy (H11): the session id is random (`crypto.randomUUID`) and kept in localStorage `simlab:telemetry:v1`. It is never tied to an account, because SimLab has none. There is no IP or user agent in the table, and nothing personal in the payloads; names are self-chosen.

Kinds: the contract's ten (`flight.sample`, `flight.lap`, `lesson.attempt`, `lesson.pass`, `fault`, `room.join`, `room.action`, `ai.call`, `hw.connect`, `credential.issued`), plus two additive kinds: `flight.start` (counted as "drones flown") and `led.blink` (counted as "LEDs blinked").

## Components: `src/components/data`

```tsx
// In a server page (strings load on the server, as the core does for lab strings):
import { Leaderboard, LiveCounter, getDataMessages } from "@/components/data";
const m = await getDataMessages(lang);
<LiveCounter messages={m.live} />
<Leaderboard course="quad5-bando" courseLabel={courseTitle} messages={m.leaderboard} limit={10} />
```

- **LiveCounter** shows "Right now at HackTX" with three counters (builders, LEDs blinked, drones flown) and 60 bars of events per minute. It polls every 15 s while the tab is visible. Numbers of 10,000 or more use the locale's compact form.
- **Leaderboard** ranks one course in a table: rank, pilot, best lap, laps. Your own row is highlighted (`aria-current`, plus a "You" chip). When your place is below the shown rows, your row appears after a gap. Under it are the pilot count and your rank.
- Both have real loading (skeleton, `role=status`), empty ("No laps yet…", "Quiet right now…"), error (with retry) and "not set up here" states. The feature state comes from `useFeatures()`, and a 503 from the route counts as "not set up". Both use the design-system Card, Stat, Callout, Chip and Button. They fit a 360 px dock.
- Strings: `src/components/data/messages/{en,es,fr,de,zh,hi}.json`, with plural forms where a count is shown. A test checks that every locale has the same keys and placeholders and isn't an English copy.

## Verification (2026-10-24)

- Unit and route tests: `npx vitest run src/lib/server/db src/lib/telemetry src/components/data src/app/api/telemetry src/app/api/leaderboard src/app/api/live src/app/api/buddies`.
- `src/lib/server/db/timescale.test.ts` runs the migrations, runs every file a second time, then runs every query against a real TimescaleDB. It uses `SIMLAB_TEST_DATABASE_URL` (a throwaway database) or starts `timescale/timescaledb:latest-pg17` in Docker on a random port, and skips when neither is available. **The Docker daemon was not running during this session, so the TimescaleDB DDL has not run on a real server yet.** Run it the moment Docker or a Tiger service is available.
- The queries (unnest insert with nulls, quotes and unicode; the ranking and own-row logic; the live counters; profile upsert, expiry and deletion) were run against real Postgres 17 semantics: PGlite 0.5.11 over its socket server, from a scratch harness outside the repo, with the aggregates replaced by plain views of the same SELECTs and `time_bucket` replaced by `date_bin`. All passed.

## Docs relied on (read 2026-10-24)

- CREATE TABLE with `tsdb.*` options, defaults, and the columnstore policy created automatically on 2.23+: https://www.tigerdata.com/docs/api/latest/hypertable/create_table
- `create_hypertable` (legacy, still supported): https://www.tigerdata.com/docs/api/latest/hypertable/create_hypertable
- Continuous aggregate syntax and options (`materialized_only`, `WITH NO DATA`): https://www.tigerdata.com/docs/api/latest/continuous-aggregates/create_materialized_view
- Refresh policy arguments: https://www.tigerdata.com/docs/api/latest/continuous-aggregates/add_continuous_aggregate_policy
- Real-time aggregates (off by default since 2.13): https://www.tigerdata.com/docs/use-timescale/latest/continuous-aggregates/real-time-aggregates
- Restrictions (DISTINCT only inside aggregates, supported joins): https://www.tigerdata.com/docs/use-timescale/latest/continuous-aggregates/about-continuous-aggregates
- Retention with continuous aggregates (keep the refresh window inside retention): https://www.tigerdata.com/docs/use-timescale/latest/data-retention/data-retention-with-continuous-aggregates
- `add_retention_policy`: https://www.tigerdata.com/docs/api/latest/data-retention/add_retention_policy
- `add_columnstore_policy` (CALL; replaces `add_compression_policy`, deprecated in 2.18): https://www.tigerdata.com/docs/api/latest/hypercore/add_columnstore_policy
- `add_job` and the `(job_id int, config jsonb)` procedure form: https://www.tigerdata.com/docs/api/latest/jobs-automation/add_job
- postgres.js 3.4.9 README in node_modules/postgres: options, `sql.array`, `.simple()`, `sslmode` from the URL.
- Next.js 16.4 bundled docs: route handlers under Cache Components (`01-getting-started/15-route-handlers.md`) and `runtime` being unsupported with cacheComponents (`route-segment-config/runtime.md`).

Third-party code: the `postgres` package (MIT). PGlite (Apache-2.0) was used only in the scratch harness and is not a dependency.

## Gaps

- The TimescaleDB DDL has not run on a real server yet (no Docker, no `DATABASE_URL` this session). See Verification.
- No wiring yet. Nothing calls `track()` and no page mounts the components. That is wave 2 (hx:dock and the page owners); docs/requests/hx-data.md lists where each kind belongs.
- Lap times are validated (range, course slug) but not replayed, so a hand-made POST could still fake a lap. The Solana attest path does the server-side replay. The leaderboard could adopt `verifyRun` if time allows.
