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
| A. Keyset cursor (last sort key, id, filter hash) signed with the server secret | Chosen |
| B. Offset and limit | Rejected: repeats and skips under inserts |
| C. Page numbers | Rejected: same |
| D. Unsigned cursors | Rejected: tampering reaches the query |

## Decision

Every list returns `{items, nextCursor}` and takes `limit` (1 to 200, default 50) and `cursor`. A tampered cursor, or one from another endpoint or filter, is 400 `bad_cursor`. No total counts.

## Technical justification

A keyset on an indexed sort key is O(page) regardless of depth. The signing key is `IYNK_SIGNING_SECRET`.

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

A client cannot show "page 3 of 9". Rotating `IYNK_SIGNING_SECRET` invalidates cursors in flight.
