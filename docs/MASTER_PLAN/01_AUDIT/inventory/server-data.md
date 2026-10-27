# Server libs, API routes, database, telemetry, leaderboard, buddies, progress, settings

**Paths:** `src/lib/server/**` (78 files), `db/migrations/0001-0003*.sql`, `scripts/db-migrate.mjs`, `src/app/api/{telemetry,leaderboard,buddies,live,status}`, `src/lib/telemetry/**`, `src/lib/progress/**`, `src/lib/settings/**`, `docs/hacktx/DATA.md`.
**Entry points:** `POST /api/telemetry`, `GET /api/leaderboard`, `GET|POST|DELETE /api/buddies`, `GET /api/live`, `GET /api/status`; browser `track()/tally()` in `src/lib/telemetry/client.ts`; `getSaved()/updateSaved()` in `src/lib/progress/storage.ts`; `node scripts/db-migrate.mjs`.
**LOC:** `find src/lib/server -type f -name '*.ts' | xargs cat | wc -l` = 6942 (ts only; 8206 with the JSON fixtures). `find src/lib/server -type f | wc -l` = 78. `src/lib/telemetry` + `progress` + `settings` = 1222 (`wc -l`, includes tests). The 5 data routes = 205 lines of route code.
**Owner today:** hx:data (DATA.md line 3). Not looked up in docs/ARCHITECTURE.md §2 (UNKNOWN whether listed).

Scope note. `src/lib/server` is not only data. By directory (VERIFIED, `ls`): `db/` (9 files, data layer), `ai/`, `mcp/`, `search/`, `solana/`, plus `env.ts`, `http.ts`, `ratelimit.ts`, `solana-ready.ts`. I read fully: `env.ts`, `http.ts`, `ratelimit.ts`, `db/*.ts` (non-test), the 5 routes, the 3 migrations, the migrate script, `telemetry/{kinds,client}.ts`, `progress/{storage,keys,progress}.ts`, `settings/settings.ts`, `ai/guard.ts`, DATA.md. I did NOT read: `ai/provider.ts`, `mcp/*`, `search/*`, `solana/*` (other auditors' scope), the i18n message files, the test files beyond counting `it(` blocks and running them.

## Purpose
Everything server-side that is not rendering. For the data part: take anonymous usage events from the three labs, keep them in Tiger Data (Postgres + TimescaleDB), serve a per-course lap leaderboard, a "right now" live counter, and a 24-hour opt-in buddy pool. Client side: one localStorage document (`iynk:v1`) with learning progress and settings. The AI, MCP, search and Solana proxies share the same helpers (`env`, `http`, `ratelimit`).

## Dependencies
- Third party (VERIFIED, imports): `zod` (env.ts:2, http.ts:2, db/schema.ts:2), `postgres` (postgres.js; db/client.ts:2, scripts/db-migrate.mjs:17), `server-only`, `next/server` `connection()` in 4 routes. Node `crypto` for sha256 (queries.ts:2).
- DB: TimescaleDB extension (0001:6). Requires a server that supports `tsdb.hypertable` CREATE TABLE options and `add_columnstore_policy` (2.20+ per the comment 0001:20).
- In: `src/lib/server/env.ts` is imported by all routes (`features.db` gate). `ratelimit.ts` is used by 12 non-test files (`grep -rl "checkRateLimit\|rateLimit(" src | grep -v test | wc -l` = 12). `@/i18n/config` LOCALES in schema.ts:3.
- Out/consumers of telemetry: 17 non-test source files import `@/lib/telemetry` (grep), among them Planner, Buddies, FlyWorkspace, hw/session, Leaderboard, LiveCounter, realtime provider, search/ai clients, sound/react.
- Events actually emitted by the app (`grep -rhoE '(track|tally)\("[a-z.]+"'`): ai.call 9, flight.lap 4, lesson.pass 4, led.blink 4 (tally), fault 3, flight.sample 3, lesson.attempt 3, hw.connect 2, room.join 2, flight.start 1, room.action 1, search.call 1, step.done 1. `credential.issued` is declared and treated as urgent but has zero emitters in the grep (VERIFIED, absence in the count).

## Public interfaces
| Item | Path:line | Notes |
|---|---|---|
| `env`, `envIssues`, `features`, `readEnv`, `featuresOf` | `src/lib/server/env.ts:104-108, 68, 88` | zod schema of 16 vars, never throws, falls back to default |
| `json`, `fail`, `notConfigured`, `parseBody`, `parseForm`, `clientIp`, `checkOrigin`, `withTimeout` | `src/lib/server/http.ts:16,36,41,81,103,128,138,119` | error shape `{error:{code,message}}` |
| `rateLimit`, `checkRateLimit`, `tooManyRequests` | `src/lib/server/ratelimit.ts:17,38,32` | in-memory sliding window |
| `getSql` | `src/lib/server/db/client.ts:16` | pool of 3, null without DATABASE_URL |
| `toRows`, `storeEvents`, `createIngestQueue` | `db/ingest.ts:14,82,43` | per-event validation, 25 ms coalescing |
| `insertEvents`, `getLeaderboard`, `getLiveCounters`, `upsertProfile`, `listProfiles`, `deleteProfile`, `arrayLiteral` | `db/queries.ts:30,48,94,139,159,170,22` | |
| `liveCounters` | `db/live.ts:16` | 10 s cache + single flight |
| zod: `telemetryEvent`, `telemetryBatch`, `leaderboardQuery`, `profile`, `buddyPost/Delete/Query`, `cleanName` | `db/schema.ts:43,64,69,77,90-95,18` | |
| Client: `track`, `tally`, `flush`, `onFlushed`, `setTelemetryContext`, `telemetrySession` | `telemetry/client.ts:91,106,208,118,86,64` | |
| Client: `getSaved`, `updateSaved`, `subscribeSaved`, `migrate`, `STORAGE_KEY`, `STORAGE_VERSION` | `progress/storage.ts:125,150,171,60,5,6` | |
| Client: `markDone`, `isDone`, `count`, `countKeys`, `recordQuiz`, `recordBest`, `resetProgress` | `progress/progress.ts:8-70` | |
| Client: `getSettings`, `setSetting`, `applySettingsToDocument` | `settings/settings.ts:9,13,43` | |
| Routes | see table below | |

| Route | Gate order (VERIFIED) | Limit |
|---|---|---|
| POST /api/telemetry (`route.ts:16`) | origin, per-IP rate, db feature, body (60 KiB, zod), per-event validate, per-session rate, insert | 1200/min/IP, 30/min/session |
| GET /api/leaderboard (`route.ts:10`) | origin, rate, db, query zod | 300/min/IP |
| GET/POST/DELETE /api/buddies (`route.ts:27,42,59`) | origin, rate, db, zod | 120 read, 30 write per min/IP |
| GET /api/live (`route.ts:10`) | origin, rate, db | 600/min/IP, CDN `s-maxage=10` |
| GET /api/status (`route.ts:9`) | rate only, no origin check | 120/min/IP, `max-age=60` |

## State ownership and persistence
**Postgres (Tiger Data), only when `DATABASE_URL` is set.**

| Object | Definition | Columns / shape | Indexes | Retention |
|---|---|---|---|---|
| `events` hypertable | 0001:9-20 | `ts timestamptz, kind text, session text, room text null, item text null, data jsonb default '{}'`. Chunk 1 day, segmentby `kind`, orderby `ts DESC` | `events_kind_ts_idx (kind, ts DESC)` (0001:23). No index on `session`. | 30 days (0001:30); columnstore after 1 day (0001:27) |
| `laps_best_daily` cagg | 0002:8-22 | `day, course, session, name, best_ms, laps` from `kind='flight.lap'`; real-time | none declared | **No retention policy**; refresh window 3 days, so rows are kept forever (grows by pilots x courses x days) |
| `activity_1m` cagg | 0002:31-41 | `bucket, kind, session, events, units`; real-time | none | 7 days (0002:56) |
| `profiles` | 0003:6-15 | `id pk (regex 8-64), token_hash bytea, name 1-24, lang in 6 locales, interests text[]<=12, built text[]<=64, wants<=280, updated_at, expires_at (+24h)` | `profiles_updated_at_idx`, `profiles_expires_at_idx` | 24 h, TimescaleDB job every 15 min (0003:36) plus read-time filter |
| `simlab_migrations` | db-migrate.mjs:50 | `version pk, file, checksum, applied_at` | pk | n/a |

What is written: telemetry rows (anonymous session id, kind, optional room code and item id, <=2 KiB JSON), profile rows. What is read: leaderboard (aggregate over `laps_best_daily`), live counters (`activity_1m` last 60 min), profile list (newest 50 unexpired). No other table exists. No user table, no accounts, no project table (VERIFIED: `grep -c "CREATE TABLE" db/migrations/*.sql` is 1 per file for 0001/0003 and 0 for 0002; nothing else).

**Server memory (per serverless instance):** rate-limit Map (10k keys cap), live-counter cache (10 s), ingest queue (25 ms linger, 2000 rows), postgres pool on `globalThis.__iynkSql`.

**Browser localStorage keys (VERIFIED by grep):**
| Key | Owner | Schema / version |
|---|---|---|
| `iynk:v1` | progress/storage.ts:5 | `{v:1, done:{key:true}, quiz:{key:{score,total}}, best:{key:number}, settings:{theme,sound,lofi,labels,reduceMotion,telemetry}}`. Version field `v`, `STORAGE_VERSION=1`, `MIGRATIONS` table is empty (storage.ts:58) |
| `iynk:telemetry:v1` | telemetry/client.ts:23 | `{session}` random UUID |
| `iynk:buddies:v1` | together/Buddies.tsx:22 | `{id, token}` unversioned in body, key suffix only |
| `iynk:wallet-choice:v1` | solana/provider.tsx:53 | wallet adapter |
| realtime identity `IDENTITY_KEY` | realtime/identity.ts:65 | `{v:1,name,color}` |
| Other unversioned keys: boardlab values, SerialMonitor height, FlightRange pad, flight ghost per craft/course, daily challenge best | grep above | each has its own key and shape; no shared version |
Only `iynk:v1` has a migration framework, and it is empty, so it has never been exercised on a real v1 to v2 upgrade (VERIFIED, storage.ts:58). A document with `v` greater than 1 is normalized as is and re-saved as v1 (storage.ts:70-72, 108): a downgrade rewrites newer data (VERIFIED by reading; not run).

## Current functionality
- VERIFIED by running: `npx vitest run` on ratelimit, http, db, telemetry, progress, settings and the 5 route tests: 14 files passed, 1 skipped, 83 passed, 4 skipped (the skipped file is `db/timescale.test.ts`, the only test that runs the SQL against real TimescaleDB, skipped because no Docker daemon or `IYNK_TEST_DATABASE_URL`).
- VERIFIED by reading: zod validation on every body and query; per-event drop in batches (ingest.ts:18-22); skew correction and future clamp (ingest.ts:15,25); coalesced single INSERT with unnest (queries.ts:30-43); ownership via sha256 token on profile upsert and delete (queries.ts:153, 171); name sanitising strips control/format chars (schema.ts:19).
- NOT verified: the TimescaleDB DDL has never run in a test here. DATA.md "Verification" says it had not run on a real server on 2026-10-24 (DOCUMENTED). Whether production iynk.tech has the DB connected is UNKNOWN from source (HANDOFF mentions a Vercel env; I did not read it or production).
- Without `DATABASE_URL` (VERIFIED, env.ts:46,98; routes): `features.db=false`; telemetry, leaderboard, live, buddies answer 503 `not_configured`; `/api/status` reports `db:false`; the client asks status once and then drops its queue for the page life (client.ts:179-192). Static labs, AI proxies, progress, settings keep working (progress is localStorage only). `scripts/db-migrate.mjs` prints "nothing to do" and exits 0 (db-migrate.mjs:76-79).
- Telemetry opt-out (VERIFIED client.ts:50,92,106,210,228,273): `settings.telemetry` defaults to **true** (storage.ts:38), so it is opt-out. Unticking stops `track`, `tally`, flushes, and drops queued events. UI lives in `src/components/settings/UsageToggle.tsx`. Enforcement is client-only; the server cannot tell an opted-out client from a missing one, and `curl` bypasses it.
- Progress API: pure functions over one document; quiz keeps the best ratio, best keeps lower/higher; `resetProgress(prefix)` keeps settings. Falls back to in-memory when storage throws (storage.ts:163-165).

## Known defects
| # | Defect | Evidence | Sev |
|---|---|---|---|
| 1 | Telemetry is not idempotent. No event id; a retry after a lost 202 (client "retry" path, client.ts:230-233) or a beacon requeue (client.ts:278) inserts duplicates. Duplicates inflate "LEDs blinked", "drones flown" and lesson counters (sum of units). Lap bests are min() so unaffected. | no unique key on `events`, no dedupe in `insertEvents` | medium |
| 2 | Leaderboard can be forged. `flight.lap` is range-checked (1 s to 60 min) but never replayed; the session id is any 8-64 char string chosen by the caller and the name is free text. Anyone can POST laps of 1000 ms under many sessions (30 batches/min each). DATA.md admits this (Gaps, last bullet). | schema.ts:30-34, kinds.ts LAP_MS | high for any competitive use |
| 3 | `you` flag and per-session limits trust a client-supplied session id; one person can post as another's session id if they know it (ids are random UUIDs, exposed to nobody except the owner, so low risk). Session ids are not secret from the server logs. | schema.ts:47 | low |
| 4 | `laps_best_daily` has no retention and no index; table grows without bound and the leaderboard query scans all days for a course (`GROUP BY session`). | 0002, queries.ts:54-61 | medium (scale) |
| 5 | Rate limit effectiveness (details in Security). | ratelimit.ts | high at scale |
| 6 | Migrations are not run by any build or deploy step: `grep -rn "db-migrate\|db:migrate" package.json deploy docs/*.md HANDOFF.md` has no hit in package.json or deploy; it is a manual command. A deploy against a fresh DB gives 502s, not a clear "not migrated" state. | grep (exit with no match) | medium |
| 7 | `credential.issued` kind has no emitter though listed as urgent. | grep count above | low |
| 8 | Same-key retry quirk: `flush()` re-queues the failed batch in front of the queue and slices to the last 1000, so under a long outage the oldest events are silently dropped. | client.ts:231 | low |
| 9 | Server drops events older than 24 h, but the client keeps queue only in memory, so an offline session loses data on tab close. | ingest.ts:26, client.ts:37 | low |

## Technical debt
| Item | Path | Evidence | Severity | Effort |
|---|---|---|---|---|
| Rate limiter is per-instance memory | `ratelimit.ts:15` | `const hits = new Map` | high | S (Redis/Upstash or Vercel KV) |
| `src/lib/server` mixes data, AI, MCP, search, Solana in one folder; `db/` only 9 files | tree | 78 files | low | M |
| Client trusts session for identity everywhere; no auth layer to hang a project owner on | whole | no user table | high (for product) | L |
| Only `iynk:v1` is versioned; ~8 other localStorage keys are ad hoc | grep | list above | medium | S-M |
| Empty `MIGRATIONS` table, untested upgrade path | storage.ts:58 | | medium | S |
| `timescale.test.ts` skipped without Docker; no CI evidence it runs | timescale.test.ts:29 | 4 skipped | high | S (CI service container) |
| Hand-rolled Postgres array literal instead of `sql.array` | queries.ts:22 | comment cites a postgres.js race | low | S |
| Telemetry kinds list is a closed enum; adding a kind needs a deploy of both client and server | kinds.ts:5 | | low | S |
| No schema migration down-path or rollback | db-migrate.mjs | forward-only, checksum lock | low | S |
| Free-text `wants`, `interests`, `built` flow into the AI prompt (`/api/ai/match`) | Buddies.tsx:89 | prompt-injection surface, not read in depth | medium | M (HYPOTHESIS on exploitability) |

## Test coverage
Counted with `grep -cE '^\s*(it|test)\('`: ingest 9, migrate 4, queries 5, timescale 4 (skipped), ratelimit 3, http 12, telemetry route 6, leaderboard route 5, buddies route 5, live 4, status 3, telemetry client 9, progress 11 + hooks 2, settings 5. Total 87 in these files; 83 passed, 4 skipped (VERIFIED by running).
- Nature: logic and self-consistency tests with mocked `getSql` or in-memory fakes; no hardware-derived reference values apply to this subsystem. The only test with real database semantics (`timescale.test.ts`) is skipped here. DATA.md says SQL was exercised on PGlite with views substituted for continuous aggregates and `date_bin` for `time_bucket`, so aggregate DDL, policies and retention are UNTESTED on a real server (DOCUMENTED).
- Not covered: concurrent upsert race on profiles, rate limit under multiple instances, retry duplication, behaviour when the DB is down mid-stream, localStorage v1 to v2 migration (table empty), leaderboard performance with many days.

## Performance characteristics
UNKNOWN measured (I did not load test and did not touch the DB). ESTIMATED from code: ingest does 1 INSERT per ~25 ms window regardless of request count (ingest.ts:43), pool max 3 per instance (client.ts:19), `statement_timeout` 4 s. `flight.sample` at 1 Hz per active flyer: ESTIMATE 1 row/s/flyer, so 100 concurrent flyers produce about 8.6M rows/day before the 30-day drop; columnstore after 1 day mitigates storage. Live counter: at most one DB query per 10 s per instance. Leaderboard has no cache, one aggregate query per request, 300/min/IP allowed.

## Security risks
- **Rate limiting is per serverless instance** (ratelimit.ts:5-8 says so). On Vercel with N warm instances the effective limit is N x limit, and cold starts reset it. Memory cap 10k keys with LRU eviction (ratelimit.ts:28): an attacker who rotates keys (spoofed IPs or random session ids) evicts others' counters and resets their own. VERIFIED by reading; not load-tested.
- **IP source is spoofable off-platform**: `clientIp` trusts `x-real-ip`, then `x-forwarded-for[0]`, then `cf-connecting-ip` (http.ts:130). Behind Vercel the edge sets these; on the Vultr deployment (`deploy/`, not audited here) it depends on the reverse proxy. A client-supplied `x-forwarded-for` header on an unproxied host means unlimited fresh buckets.
- **Venue-NAT tradeoff**: per-IP limit 1200/min for telemetry is high on purpose (route.ts:12), so a single attacker IP can write up to 1200 requests x 200 events per minute on one instance (ESTIMATED 240k rows/min/instance upper bound; DB pool and 4 s timeout are the real bound).
- **CSRF/origin**: `checkOrigin` allows requests with no Origin header (http.ts:138-141), so any non-browser client passes; it only blocks cross-site browsers. It is not authentication. `/api/status` skips the origin check (harmless, public).
- **Buddies and PII**: profiles hold a self-chosen name (<=24), language, interest tags, built-keys, a free-text `wants` (<=280). No location field, no contact data (0003 comment, schema.ts:77-84; VERIFIED). But `GET /api/buddies` is unauthenticated and returns the newest 50 profiles, including names and free text, to anyone (CORS blocked for browsers, open to curl). Users can type PII into name/wants. Token is client generated, stored sha256 unsalted (fine for a high-entropy token, queries.ts:129; but `token` only needs min 16 chars, schema.ts:88, so a caller can choose a weak token and be brute-forced; the app's own token is 48 base36 chars from `crypto.getRandomValues`, Buddies.tsx:27-29). Id and token use `Math`-free crypto: OK.
- **Telemetry as pseudonymous tracking**: persistent random session id in localStorage links all events of a browser for up to 30 days (events) and indefinitely in `laps_best_daily` (name + session). Opt-out default means analytics collection starts before consent; under GDPR/ePrivacy this needs legal review (HYPOTHESIS: probably needs consent or a lawful-basis note, not a lawyer's opinion). IP and user agent are not stored (DATA.md; schema columns confirm).
- **Free-form `data` jsonb** up to 2 KiB for 12 of 14 kinds (schema.ts:26-28): arbitrary attacker content stored in DB. Not rendered anywhere I found; `name` in laps is rendered on the leaderboard (React escapes).
- **Secrets**: `DATABASE_URL` never logged in the migrate script (db-migrate.mjs:93 comment); error logs print `error.message` only. I did not read any `.env.local` value.
- Error handling is consistent: 502 `db_unavailable` with console.error of the message; DB errors not leaked to clients (VERIFIED in the 4 routes). Telemetry insert failure after partial queue: all waiters in a coalesced batch fail together (ingest.ts:62), so one bad row (e.g. an invalid-JSON-in-text value) can fail other people's requests (HYPOTHESIS; validation makes it unlikely).

## Reusability for an original-project builder
Verdict: **no persistence layer exists; only catalogue-item telemetry.** (VERIFIED: tables are `events`, `profiles`, two caggs; no project, user, file or save concept.)
- A user's own project (circuit, firmware, drone config) would live nowhere today. `Saved.done` is keyed by fixed catalogue keys from `progress/keys.ts` (`board:<id>:lesson:<id>` etc.); the schema `Record<string,true>` cannot hold a document.
- `ITEM_PATTERN` and `COURSE_PATTERN` accept arbitrary slugs, so telemetry and leaderboards could carry a user-project id without schema change, but lap validation is range-only and the leaderboard is per `course` slug of a catalogue course.
- Blockers: no identity (session id is a device-local random string; clearing storage loses it); no ownership/ACL model beyond the buddy token; per-instance rate limits cannot protect a write-heavy project API; no blob storage; DB access is only through hand-written queries (no ORM, no tenancy).

## Required refactoring to get there
1. Decide identity: anonymous device token (like buddies' token) vs accounts. Add a `projects` table `(id, owner_token_hash or user_id, kind, title, doc jsonb, schema_version, created_at, updated_at, size)` with a size cap, plus `project_revisions` if undo or sharing is wanted. It fits the existing pattern: plain relational table beside the hypertable, token-hash ownership as in `upsertProfile`, zod body validation with `parseBody`, `features.db` gate, 502/503 error contract.
2. Replace the in-memory limiter with a shared store (Upstash/Vercel KV or Postgres) before exposing writes of user content. Keep the `rateLimit(key, opts)` signature so the 12 call sites do not change.
3. Add an `event_id` (uuid from the client) with `ON CONFLICT DO NOTHING` (needs a unique index including `ts` on a hypertable) or accept dedup in aggregates only.
4. Wire `db-migrate.mjs` into deploy (build step or CI), and run `timescale.test.ts` in CI with a service container.
5. Make localStorage a versioned set: one registry of keys, fill `MIGRATIONS`, add a local-project store (IndexedDB) as the offline cache for server projects.
6. Server-side replay of laps (the Solana attest path already replays per DATA.md) before ranking anything with prizes.
7. Add retention to `laps_best_daily` or a documented decision to keep it.

## Recommendation: extend
The data layer is small, validated, well-factored and its contract (503 without DB, 502 on failure, zod everywhere) is the right base for a project store; keep it, but replace the rate limiter and add identity, idempotency and migration wiring before any user content is stored.

## Open questions
- Is production iynk.tech connected to a real Tiger Data service, and have the three migrations ever been applied (`node scripts/db-migrate.mjs --status`)? Not checked (no production access).
- Does the Vultr deployment (`deploy/`, `server/`) sit behind a proxy that overwrites `x-forwarded-for`/`x-real-ip`?
- Which retention and consent stance does the founder want for telemetry (opt-in vs opt-out), and for the persistent session id?
- Are accounts planned? That changes whether projects use token-hash ownership or user ids.
- Is `docs/ARCHITECTURE.md` §2 the owner list for this area? Not read.
- Does `/api/ai/match` sanitise `wants`/`interests` against prompt injection? Not audited (AI scope).
