# ADR-0814: Keyset cursors signed by the server, limit up to 200, no totals

Status: proposed, 2026-10-27. Author: API contracts design seat.
Upstream: BRIEF 19.5 (pagination). Downstream: AC-API-08. Spec: API_CONTRACTS section 4.4.

## Problem

Lists must page without repeating or skipping rows while rows are inserted, and a client must not be able to turn a cursor into a database probe.

## Constraints

1. Stable order per endpoint.
2. Authorisation re-checked on every page.
3. No cost of a count on every call.

## Considered options

| Option | Verdict |
|---|---|
| A. Keyset cursor (last sort key, id, filter hash) signed with an in-memory per-process key | Chosen |
| B. Offset and limit | Rejected: repeats and skips under inserts |
| C. Page numbers | Rejected: same |
| D. Unsigned cursors | Rejected: tampering reaches the query |

## Decision

Every list returns `{items, nextCursor}` and takes `limit` (1 to 200, default 50) and `cursor`. A tampered cursor, or one from another endpoint or filter, is 400 `bad_cursor`. No total counts.

The signing key is made per process at start-up and is not configured. A restart makes every old cursor invalid: the server answers with `bad_cursor` and the client restarts the list from the first page. Cursor values are only ever used as bound parameters, and access is checked again on every page.

## Technical justification

A keyset on an indexed sort key is O(page) regardless of depth. The MAC key is 32 random bytes made at process start and held in memory only: no environment variable, no secret file, nothing in `iynk.db` (RC-07, RC-17, ADR-0428).

## Performance data

None measured. AC-API-08 tests correctness under concurrent inserts and deletes; no latency number is claimed.

## Cost implications

One HMAC per page.

## Licensing

No new dependency.

## Security implications

A signed cursor closes injection through the cursor. Re-checking access per page hides rows from a grant removed mid-listing.

## Reversibility

High. Cursors are opaque; the encoding can change in a minor release.

## Migration plan

None.

## Known limitations

A client cannot show "page 3 of 9". A server restart makes a new key, so cursors in flight return `bad_cursor` and the client reloads the list from the first page. API_CONTRACTS line 228 ("valid for the life of the data") and line 886 (`IYNK_SIGNING_SECRET`) still say otherwise and need the same change.

## Reconcile, second pass (2026-10-27)

| Id | Change |
|---|---|
| RC-07 | Removed `IYNK_SIGNING_SECRET` from the Decision section. The cursor MAC key is now 32 random bytes made at process start, kept in memory. The data directory still holds only `iynk.db`, `-wal`, `-shm` and `backups/`. Note: API_CONTRACTS line 886 does not yet carry the decided "no secret" choice (it still lists `IYNK_SIGNING_SECRET`); that file is outside this edit and needs the matching change. |
| RC-17 | Same key source (no environment variable), so ADR-0428 and BACKEND_ARCHITECTURE line 613 stay true. Known limitations now say a restart invalidates cursors in flight instead of a rotation. Option A row reworded from "server secret" to "in-memory per-process key". API_CONTRACTS line 228 also needs the restart caveat. |

## Reconcile, final nits (2026-10-27)

- Restart decision recorded in the Decision section: the signing key is made per process at start-up and is not configured, so a restart makes old cursors invalid. The server answers with the cursor error (`bad_cursor`) and the client restarts the list from the first page. Bound parameters and the per-page access check stay.
