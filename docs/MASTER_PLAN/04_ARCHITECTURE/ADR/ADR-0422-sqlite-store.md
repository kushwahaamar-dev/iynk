# ADR-0422: One SQLite file behind a ServerStore interface with forward-only migrations

Status: superseded by ADR-0004 (2026-10-27, review fix). Read ADR-0004 for the live decision; this file is kept for the record. Author: frontend and backend architecture seat.

Do not cite this record as live. The store is owned by ADR-0004; interface name is `ServerStore`.
Upstream: R-078 (asks for this ADR), R-083, F-165, B5-04, B7-05, K-SELF. Downstream: F-199, F-165. Spec: BACKEND_ARCHITECTURE sections 7 and 14.

## Problem

Rooms, devices, invites, shares and usage must survive a restart; the operator has one directory to back up. The Timescale schema serves features that are removed.

## Constraints

1. No second service to run.
2. Transactions for op append plus revision update.
3. Backup while running.
4. Node 24.x only (`engines`).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. `node:sqlite` | Built in; `backup()` exported; prints ExperimentalWarning in 24.8 | **Chosen** |
| B. `better-sqlite3` | Native addon | Fallback |
| C. Log files plus snapshots |  | Rejected |
| D. Postgres |  | Could: a later adapter behind ServerStore, not built, not planned in any phase (R-083, D-019) |

## Decision

1. `ServerStore` is the only importer of `node:sqlite`; contract tests run on SQLite and a memory implementation.
2. WAL, `synchronous=FULL` (ADR-0004; withdrawn here, record is superseded), `foreign_keys=ON`.
3. Forward-only SQL migrations with checksums; refuse a newer database; `backup()` before each migration; keep 3.
4. Delete `db/migrations/0001` to `0003` and the `postgres` dependency.

## Consequences

- The experimental status is a recorded risk with a known exit.
- Commit cost is synchronous on the event loop; measured by BA-05.

## Reverse if

`node:sqlite` changes incompatibly within 24.x, or BA-05 shows commit stalls above target. Then use `better-sqlite3` behind the same interface.


## Review fixes (2026-10-27)

| # | Issue | What I did |
|---|---|---|
| 1 | ADR-0422 duplicates ADR-0004 and ADR-0505 with different settings (synchronous, interface name, migration mechanism) | Applied to this file: status changed to "superseded by ADR-0004". The decision above is no longer authoritative. I did not edit ADR-0004, ADR-0505 or the other ADRs (outside my output file; each has its own editor). |

Evidence read: ADR-0004 decides `synchronous=FULL` by default (`IYNK_STORE_SYNC=normal` allowed), `ServerStore`, migrations by `PRAGMA user_version`, group commit at `setImmediate`, with a measured bench (FULL 16,472 single-op commits per second, flat file with fsync 246 per second). ADR-0505 decides `RoomStore` and `synchronous=NORMAL`. This file only repeats the choice of `node:sqlite` and adds the `Store` name (now `ServerStore`), checksummed migrations and backup-before-migrate.

### Merge instructions for the ADR-0004 editor

| Decision from ADR-0422 | Carry into ADR-0004 as |
|---|---|
| Migration mechanism: forward-only SQL files with checksums, refuse a database newer than the code, `backup()` before each migration, keep 3 backups | Replace "migrations by `PRAGMA user_version`". `user_version` may stay as the applied-version counter, but the files and checksums are the record. |
| Delete `db/migrations/0001` to `0003` and the `postgres` dependency | Already in ADR-0004 migration plan; keep. |
| Contract tests run on SQLite and a memory implementation | Add to the Reversibility section. |
| Reverse if `node:sqlite` changes incompatibly in 24.x or commit stalls exceed target (BA-05) | Add to Reversibility; fallback `better-sqlite3` behind the same port. |
| Interface name | Pick one name across ADR-0004, ADR-0505 and SYSTEM_ARCHITECTURE. ADR-0004 says `ServerStore`; ADR-0505 says `RoomStore`. Suggested split: `ServerStore` is the port, `RoomStore` is its room-facing part. Not applied by me. |
| `synchronous` default | Keep ADR-0004's FULL default: it is backed by the measurement and group commit makes it affordable. Not adopting NORMAL from this file. |

### Open conflict outside my scope

ADR-0505 says "Ack after COMMIT (`synchronous=NORMAL`)", which contradicts ADR-0004's FULL default. Whoever edits ADR-0505 should align it with ADR-0004 or state that rooms override the default. With WAL, NORMAL can lose the last committed transactions on power loss, so acking after COMMIT under NORMAL is not a durable ack.

### Other duplicate pairs named in the issue

ADR-0420 to ADR-0003, ADR-0423 to ADR-0500, ADR-0429 to ADR-0010, ADR-0430 to ADR-0014, ADR-0406 to ADR-0012 (move the 1.5 MB precache and 3 s timeout detail), ADR-0425 to ADR-0008 and ADR-0612: not applied here. They are different files, and I am the only editor of ADR-0422 only. Each needs the same "superseded by" status line and a merge into the surviving ADR by its own editor.

### Second review round (2026-10-27)

| Issue | What was done |
|---|---|
| 5 [high] Durability stated incorrectly | BACKEND_ARCHITECTURE 7.3 and 8.1 now use `synchronous=FULL` with `IYNK_STORE_SYNC=normal` as an operator option, one transaction per event-loop turn (256 ops or 4 MiB), and the persisted `submissions` table. The `NORMAL` line in the Decision above is withdrawn with the rest of this record. |
| 11 [medium] Eight required headings missing, plus licence and AX-05 for this ADR | Not applied as headings: this record is superseded by ADR-0004, which carries all twelve. The two facts the issue asked for are given here for the ADR-0004 editor and are in BACKEND_ARCHITECTURE 7.1: licences (SQLite public domain; `node:sqlite` ships in Node.js, MIT; `better-sqlite3` MIT; EXTERNAL, not re-checked) and Linux benchmark status (experiment AX-05, also AR-10 and RT-1, is open; the only commit numbers are from macOS; ADR-0004's Known limitations say "Linux durability numbers are UNKNOWN" but do not name AX-05). |

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RC-01 | Decision item 2: `synchronous=NORMAL` replaced by `synchronous=FULL` (ADR-0004; withdrawn here, record is superseded). The review-fix history above still mentions NORMAL as the withdrawn value and is left as written. |
| RC-02 | Added "Do not cite this record as live" line under the status line. Interface name `Store` replaced by `ServerStore` in the title and Decision item 1. In the historical review notes, `Store` is kept only where it quotes the old name (ADR-0004 vs ADR-0505 merge table), and one line now notes the rename. |
| Spikes | None applied; no spike id was named for this file. |

## Reconcile, second pass (2026-10-27)

| Id | Change |
|---|---|
| RC-03 | Option D (Postgres) verdict changed from "Later implementation of the same interface" to "Could: a later adapter behind ServerStore, not built, not planned in any phase (R-083, D-019)". |
