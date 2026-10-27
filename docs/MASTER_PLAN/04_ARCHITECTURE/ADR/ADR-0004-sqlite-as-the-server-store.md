# ADR-0004: SQLite as the server store, behind a port

Status: proposed, 2026-10-27. Author: system architecture seat.
Upstream: D-015; R-078, R-083, R-098; BRIEF 19.4 ("avoid choosing extra databases without a demonstrated need"); RS-09 caveat (server state was in memory); ADR-0104.
Downstream: `SYSTEM_ARCHITECTURE.md` 8.3 to 8.5; AR-08, AR-10, AR-11, AR-12, AR-23, AX-05; F-165.

## Problem

The self-hosted server must keep devices, buddy pairs, rooms, an ordered op log, snapshots and shares across restarts, with one data directory to back up. The repository's database code targets Postgres with TimescaleDB (`src/lib/server/db/*`, `db/migrations/0001-0003`) for a public counter, a leaderboard and a buddy pool, all of which are deleted (D-016, F-006). Which store fits a friends-sized install?

## Constraints

1. Durable across restart; an op and its sequence number commit together (R-078, R-089).
2. One file or directory to back up; backup without stopping the server (R-098).
3. No second service for a friends-sized install to run, patch or secure.
4. Single writer process is acceptable (ADR-0003).
5. Must stay replaceable (F-165 asks for Postgres as a `should`).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. SQLite through `node:sqlite` (built in) | One file, WAL, no addon | Chosen |
| B. SQLite through `better-sqlite3` | Same engine, native addon | Fallback behind the port |
| C. Append-only log files plus snapshot files | Hand-built storage | Rejected: re-implements transactions, indexes and compaction |
| D. PostgreSQL | Server database | Optional adapter later (F-165): a second service for a load one core serves |
| E. PostgreSQL with TimescaleDB | Existing code | Rejected: the only time-series consumer was deleted |
| F. Redis or a queue for rooms | Fast ephemeral state | Rejected: rooms hold state in process memory; durability comes from SQLite |

## Decision

SQLite via `node:sqlite`, one file `data/iynk.db`, WAL mode, `PRAGMA synchronous=FULL` by default (`IYNK_STORE_SYNC=normal` is the documented option), foreign keys on, `busy_timeout=5000`, migrations recorded in `schema_migrations` (BACKEND 7.3). The cross-file rule (SYSTEM_ARCHITECTURE 8.3, second review issue 7) is: default `full`, ack after COMMIT; with `normal` a power loss can lose the last few acknowledged commits, which REALTIME 11.5 handles as an epoch break. ADR-0422 and ADR-0505 say `NORMAL` and must adopt `full` as the default or state the epoch break. The cost of `full` against `normal` is UNKNOWN until AX-05 runs on Linux. All access goes through `ServerStore` in `server/src/store/`; no SQL outside that folder. Operations are group-committed (a PROPOSAL, justified by fewer transactions): ops arriving in one event-loop turn are applied to in-memory room state, written in one transaction at `setImmediate`, then acknowledged and broadcast. Schema: BACKEND_ARCHITECTURE 6.4 and 7.2 plus REALTIME 11.1, one migration list; `SYSTEM_ARCHITECTURE.md` 8.3 says which name wins. Retention of room ops and checkpoints: ADR-0505 only.

## Technical justification

The load is a few people (8 peers per room today; operator-set room count). SQLite gives transactions, a primary key that enforces `(room, seq)` order, and de-duplication of a resend after a lost ack through the stored submission (`submissions`, REALTIME 8.1 rule 4; a unique constraint on the client `opId` would turn that resend into an error), and `VACUUM INTO` for an online backup. `node:sqlite` removes the native build from the Alpine image.

## Performance data (MEASURED)

`bench-store.mjs`, Apple M4 Pro, macOS arm64, Node 24.8.0, 300-byte op bodies:

| Case | Result |
|---|---|
| WAL, FULL, 5,000 single-op transactions | 16,472 per second; p50 0.029 ms; p95 0.065 ms; p99 1.63 ms; max 5.86 ms |
| WAL, NORMAL, same | 97,999 per second; p50 0.006 ms; p99 0.030 ms |
| 10,000 ops in one transaction | 8.9 ms (FULL), 7.4 ms (NORMAL) |
| 160 KB snapshot write | p50 0.27 ms; p95 0.31 ms (FULL) |
| Read a 10,000-op tail | 3.1 ms (FULL), 2.2 ms (NORMAL) |
| Flat file append plus `fsync` per op | 246 per second; p50 4.0 ms |

Caveat: the flat-file and SQLite rows do not have equal durability on macOS (the platforms probably flush differently, HYPOTHESIS), so the 67 times gap is not a fair ratio. macOS numbers do not establish fsync durability; FULL against NORMAL cost is UNKNOWN until AX-05 runs on the Linux target (AR-10). The design load is 400 ops per second aggregate (20 rooms at 20 ops per second, REALTIME RT-1), a test load and not a forecast. The pass line is the single one of RT-1: commit p99 under 10 ms at that load, checkpoint stall under 100 ms, 0 lost acknowledged ops in 50 `kill -9` runs.

## Cost implications

None beyond disk. Estimated size per room: a gzipped snapshot of at most 159 KB (data model limit, VERIFIED there) plus the op tail (about 1.4 MB raw per 10,000 ops, RS-09 MEASURED); the store cap `IYNK_MAX_STORE_MB` (default 1024, PROPOSAL) bounds it.

## Licensing

SQLite is public domain (EXTERNAL). `node:sqlite` ships with Node (MIT, EXTERNAL). `better-sqlite3` is MIT (EXTERNAL, not checked here).

## Security implications

Tokens, invites, pairing and enrolment codes are stored as SHA-256 hashes only. No chat text, email, IP or key is stored (section 8.3). The file lives in a volume owned by the unprivileged user; backups are the operator's responsibility and contain project content.

## Reversibility

High. `ServerStore` is the seam; a Postgres adapter implements it (AR-11 keeps a second adapter's contract tests honest). Known one-way door: a single writer process.

## Migration plan

X8 creates the store and its contract tests. The old `db/migrations`, `scripts/db-migrate.mjs` and `src/lib/server/db/*` are deleted in the same phase (git history keeps them for F-165).

## Known limitations

`node:sqlite` printed an `ExperimentalWarning` on Node 24.8 (VERIFIED); its stability level must be re-read at B0 (AR-11). The two version reports on Node 24.8.0 for macOS (`process.versions.sqlite` 3.50.4, `sqlite_version()` 3.53.1) disagree; AX-05 runs `node -e` on the pinned image and records the one `select sqlite_version()` value. The API is synchronous: transactions must stay small, and long reads must be paged. Linux durability numbers are UNKNOWN.
