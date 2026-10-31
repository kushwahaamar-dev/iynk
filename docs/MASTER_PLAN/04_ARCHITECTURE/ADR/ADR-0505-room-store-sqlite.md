# ADR-0505: One SQLite file holds the room log, checkpoints, ACL, invites and audit

Status: proposed, 2026-10-27. Author: realtime-architecture seat. PENDING RT-1 for performance numbers.
Upstream: R-078, R-083, R-098; F-165, F-199; D-015; RS-09 (server state was in memory); SECURITY_BASELINE R9. Spec: REALTIME_ARCHITECTURE 11.

## Problem

Rooms lose all state on restart (F-118 row). Peers supply snapshots (R9). R-078 asks for durability across restart in one data directory; R-078 also leaves "embedded SQLite against append-only log files plus snapshots" as an ADR.

## Constraints

1. One directory to back up; no external database to run (D-015).
2. Atomic: redeeming an invite, adding the ACL row, appending the `access.grant` op and the audit event.
3. Node 24 only; no native build step if avoidable.
4. Op log, checkpoints and dedup records must survive a crash between COMMIT and ack.

## Considered options

| Option | Verdict |
|---|---|
| A. `node:sqlite` in WAL mode, one file; blobs as files by hash | Chosen, through the `ServerStore` port of ADR-0004 (room tables are part of it) |
| B. `better-sqlite3` | Named replacement if A is unusable (MIT; native build) |
| C. Append-only JSONL segments plus snapshot files | Rejected: no atomicity across ACL and log |
| D. Postgres | Could, later, behind `ServerStore` (R-083); setup cost against D-015 |
| E. Memory only (RS-09) | Rejected: restart loses rooms |

## Decision

Option A with the tables of REALTIME_ARCHITECTURE 11.1. Ack after COMMIT under `synchronous=FULL` (the ADR-0004 default; `IYNK_STORE_SYNC=normal` is the one operator option). Checkpoint every 500 ops or 10 minutes with activity; keep 8 plus named. Keep envelope payloads for the latest 20,000 ops, then null them and keep summary columns. Load a room lazily; verify the chain at load; `corrupt` state on mismatch. Epoch changes on restore from older state.

## Technical justification

Size ESTIMATED from RS-09 (929 KB per 15,492 ops, 14 KB per snapshot): 1.2 MB per 20,000 ops.

## Performance data

UNKNOWN: commit p99, checkpoint stall (RB-1, RT-1). Exit for RT-1: COMMIT p99 under 10 ms at the load of RA-08, zero lost acked ops after 50 kill -9. If it fails, switch implementation (B), then restructure (C plus small SQLite for ACL).

## Cost implications

S3: ESTIMATED 4 to 6 days.

## Licensing

SQLite is public domain (EXTERNAL); `node:sqlite` ships with Node.

## Security implications

The file holds project text; permissions 0600 on the data directory; the operator can read everything (stated in the data-handling note). No chat, keys or IP addresses stored. Chain check at load detects tampering of the log file by someone without the content.

## Reversibility

High. `ServerStore` (ADR-0004) is the port; the schema is plain tables.

## Migration plan

S3. No v1 data to migrate: v1 rooms were memory only.

## Known limitations

`node:sqlite` stability is EXTERNAL and must be checked at build. Power loss can lose the last commits only when the operator picks `IYNK_STORE_SYNC=normal` (epoch break handled). Single process, single writer.

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RC-01 | Decision: ack after COMMIT under `synchronous=FULL` (ADR-0004 default; `IYNK_STORE_SYNC=normal` is the one operator option). Known limitations: power-loss line now applies only when the operator picks normal. |
| RC-02 | Options table, option A: now "through the `ServerStore` port of ADR-0004 (room tables are part of it)". Reversibility line also said `RoomStore` is an interface; changed to `ServerStore` so no `RoomStore` interface remains in this file. |
| RC-03 | Options table, option D: now "Could, later, behind `ServerStore` (R-083)". |
| Spikes | None applied in this pass. |
