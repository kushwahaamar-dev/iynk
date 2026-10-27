# ADR-0508: Offline edits are rebased by replay; when that is not wanted the work becomes a fork

Status: proposed, 2026-10-27. Author: realtime-architecture seat.
Upstream: BRIEF 14 (offline editing, version conflicts); R-085, R-087, R-088; RS-09; RS-20 (not run); F-088, F-121, F-123. Spec: REALTIME_ARCHITECTURE 12.

## Problem

Friends lose connections and close laptops. The question is whether the room needs an offline merge engine.

## Constraints

1. The local store is the source of truth for a person's own copy (R-088).
2. Nothing may silently overwrite someone's work.
3. No complex distributed editing system without evidence.

## Considered options

| Option | Verdict |
|---|---|
| A. Pending queue replayed through the same server validation; dropped ops listed; fork on request | Chosen |
| B. CRDT merge of offline sessions (RS-20) | Not run, not required by D-013; the Yjs spike scenarios show invariant breaks without extra rules |
| C. Block editing while offline | Rejected: violates R-088 |
| D. Three-way merge of whole documents | Rejected: needs a document diff the model does not define |

## Decision

Pending queue up to 1,000 submissions; coalescing of repeated `view.place` and `component.set`; resend of the in-flight submission with the same `opId`; replay after the snapshot or tail, one at a time; a plain-language list of drops; "Keep a copy" forks the pre-rebase state with `meta.origin`. Forks also at room close and on a chain mismatch.

## Technical justification

This is the mechanism RS-09 already tested for dropped connections, offline edits and snapshot resume (37,170 disconnects across 30 runs, no divergence).

## Performance data

RS-09: 311 snapshot-plus-tail reconnects and 3,128 tail reconnects in the long-offline set, all converged. Replay cost is one submission per round trip: 1,000 queued at 100 ms RTT is about 100 s (ESTIMATED), so very long queues are better as forks, hence the 24 h and 1,000 limits.

## Cost implications

S5, part of the client.

## Licensing

None.

## Security implications

Replayed ops pass the same checks as live ones, including permission at replay time (a revoked editor's queue is rejected as `permission`).

## Reversibility

High. A CRDT could be added for source files only (ADR-0500).

## Migration plan

S5; tests RA-02, RA-07, RA-18.

## Known limitations

Replay is sequential and slow for long queues. Drops can surprise the person; the list explains them. No semantic merge of long concurrent sessions.
