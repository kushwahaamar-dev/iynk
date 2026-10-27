# ADR-0813: Idempotency keys on creating POSTs, ETag and If-Match on documents, no merge, explicit overwrite

Status: proposed, 2026-10-27. Author: API contracts design seat.
Upstream: A7, D5, RS-09, ADR-0104, ADR-0500. Downstream: AC-API-06, AC-API-07, F-092. Spec: API_CONTRACTS sections 4.5 to 4.7, 8.3.

## Problem

Retries over a flaky link are normal (D-011) and must not create duplicates. Two devices saving the same project must not silently lose work. A person who decides to lose one side of a conflict must still be able to say so, even when the losing copy has the lower revision.

## Constraints

1. A merge belongs to the op log in a room (ADR-0104), not to a save endpoint.
2. `revision` must not go down in ordinary saves.
3. The server never rewrites a stored document (API_CONTRACTS principle 5, with two named exceptions).

## Considered options

| Option | Verdict |
|---|---|
| A. Idempotency-Key (24 h stored response) plus If-Match, no merge, plus `?overwrite=true` | Chosen |
| B. Last writer wins | Rejected: silent loss |
| C. Automatic three-way merge | Rejected: wrong layer; rooms do it with ops |
| D. Version vector | Rejected: friends scale does not need it |
| E. No overwrite path (the first draft) | Rejected: "take mine" was unsendable when local `revision` 12 met server 15 |

## Decision

1. Creating POSTs accept `Idempotency-Key`; the first response is stored for 24 hours and replayed with `Idempotent-Replay: true`.
2. `PUT document` needs `If-Match`; a different hash is 412 with the current `ETag`; missing is 428.
3. A lower `revision` is 409 `revision_regression`, except with `?overwrite=true` plus a matching `If-Match`, from an editor or owner.
4. An overwrite is stored as the document as sent, as a new revision-list entry with `source: overwrite`; the replaced version remains readable until retention trims it.
5. `PUT /assets` is idempotent by content hash and takes no key.

## Technical justification

The matching `If-Match` proves the caller has seen the server's current state, so an overwrite is a decision, not an accident. Keeping the replaced version as an earlier entry makes the loss recoverable inside the retention window (the last 50 saves or 30 days).

## Performance data

None measured. Idempotency records are 24-hour rows; storage cost is ESTIMATED as small (responses over 64 KiB store only a pointer).

## Cost implications

One table and a sweep job (ADR-0011).

## Licensing

No new dependency.

## Security implications

A key is scoped to the identity, so one person cannot replay another's. Overwrite needs the editor role, so a viewer cannot destroy history. The overwrite path adds no way around a live room: it is 409 `room_open` like any save.

## Reversibility

High. Both mechanisms are additive and header-based.

## Migration plan

None; no server copy of projects exists today.

## Known limitations

Retention can trim the replaced version, after which an overwrite is not recoverable. The 24-hour key window is a PROPOSAL, not a measurement.
