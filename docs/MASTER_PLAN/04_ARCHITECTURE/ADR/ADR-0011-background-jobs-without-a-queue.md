# ADR-0011: Background jobs as in-process timers

Status: proposed, 2026-10-27. Author: system architecture seat.
Upstream: BRIEF 19.4 (queues only on demonstrated need); R-078, R-083, R-098; PROJECT_DATA_MODEL 7; ADR-0505 (snapshot and retention numbers).
Downstream: `SYSTEM_ARCHITECTURE.md` 6.15, 8.5.

## Problem

The server must expire invites, pairing offers, shares and rooms, compact op logs into snapshots, checkpoint the WAL and prune counters. Does that need a queue or a scheduler?

## Constraints

1. One process (ADR-0003); no Redis (ADR-0004).
2. Restart safe: jobs read their state from SQLite.
3. Idempotent: running twice does no harm.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. `setInterval` timers in the server process over table state | Chosen | Chosen |
| B. A job library with a queue table | Retries, visibility | Rejected: every job here is a bounded sweep with no retries to manage |
| C. OS cron and a CLI | Decoupled | Rejected: another thing to configure; the CLI commands remain for manual runs |
| D. Redis-backed queue | Scale out | Rejected: no second process |

## Decision

Jobs in `server/src/jobs/`: `expire` every 60 s (pairings, enrolments, invites, rooms past `expires_at`, shares, cache, usage older than 90 days); `compact` on the ADR-0505 schedule (snapshot every 500 ops or 10 minutes with activity, keep 8 plus named, null envelope payloads beyond the latest 20,000 ops; the numbers live in ADR-0505 and are not restated here); `checkpoint` every 5 minutes and at shutdown (`PRAGMA wal_checkpoint(TRUNCATE)`); `backup` only on command. Each job does at most one bounded transaction per run, logs its counts, and is skipped if the previous run is still in progress.

## Technical justification

Timers over table state are the smallest thing that can be correct. A restart loses no job because jobs have no private state. Compaction follows the data model's rule that retention must exceed the checkpoint interval (RS-09 found a harness error when it did not).

## Performance data

Snapshot write 0.27 ms p50 and a 10,000-op tail read 3.1 ms in the store benchmark (ADR-0004, MEASURED on macOS); sweeps are small bounded SQL statements.

## Cost implications

None.

## Licensing

None.

## Security implications

Expiry is a security control (invites and pairing offers die on time). The `expire` job is also checked at use time (a request with an expired invite fails even before the sweep), so a delayed sweep does not extend validity.

## Reversibility

High. A job is a function; moving to a queue later means calling the same functions from a worker.

## Migration plan

X8 adds the jobs with the store. Tests use a fake clock.

## Known limitations

Timer drift under heavy load delays sweeps (use-time checks cover security). Single process only.

## Review fixes (2026-10-27)

1. [medium] Compaction trigger of 1,000 ops conflicted with ADR-0505. Applied: the `compact` job now follows ADR-0505 (every 500 ops or 10 minutes with activity, keep 8 plus named, null payloads beyond 20,000 ops) by reference, and the upstream line no longer cites a 1,000-op rule. Checked ADR-0505 Decision (matches). ADR-0423 line 29 (keep two snapshots, prune at revision minus 1,500) is the older wording and is left to its own editor; ADR-0505 is the store decision and governs retention.
