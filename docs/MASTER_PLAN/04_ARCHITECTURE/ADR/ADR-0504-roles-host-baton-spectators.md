# ADR-0504: Roles, host, baton and spectators are enforced inside the apply path

Status: proposed, 2026-10-27. Author: realtime-architecture seat.
Upstream: SECURITY_BASELINE R5, R6; R-075, R-093, R-094; PROJECT_DATA_MODEL 5.1; F-120, F-121, F-122. Spec: REALTIME_ARCHITECTURE 6.

## Problem

The relay enforces no roles; the baton is a UI convention that any peer can set (`room.ts:589-597`, R6); the host is the first key of a Map (`room.js:47-50`).

## Constraints

1. The document's roles (`owner`, `editor`, `commenter`, `viewer`) are advisory in a file but must be enforced by a server that hosts the room (PROJECT_DATA_MODEL 5.1).
2. Team ownership: 1 to 8 owners, last owner not revocable.
3. A friends-sized room needs a person who can remove someone and recover a stuck baton.

## Considered options

| Option | Verdict |
|---|---|
| A. A permission table checked by `RoomCore` before `apply`; explicit host, creator, baton and runner fields; role changes only through `access.*` ops | Chosen |
| B. Client-side enforcement only | Rejected: R6 |
| C. Per-entity locks | Rejected: a disconnecting holder strands the entity; soft marks (`focus`) used instead |
| D. Host is always the creator | Rejected: a creator who is away would leave the room unmanageable; succession rule used |

## Decision

The table of REALTIME_ARCHITECTURE 6.2. Spectators are viewers counted separately. Host succession after 60 s grace: longest-present owner, then editor; the creator can always reclaim. The baton gates `source.*` ops on the server (default `codeMode: "baton"`), is granted by holder or host, released by holder, taken by host, and survives a disconnect for 30 s. `runControl` policy (`editors` or `host`). Mirror of ACL and document: an `access.*` op commits the document change and the ACL change in one transaction.

## Technical justification

Permission is a pure function of `(role, op.k, room settings, baton)` so it is tested exhaustively (RA-12).

## Performance data

Negligible; a table lookup per op.

## Cost implications

Inside S4: ESTIMATED 2 to 3 days including the generated matrix test.

## Licensing

None.

## Security implications

Closes R6. Commenter and viewer are identical until the schema has comment ops (UNKNOWN). Hostile valid edits remain possible for editors.

## Reversibility

High. The table is data.

## Migration plan

S1 enforces host and baton on the v1 relay; S4 moves them to `RoomCore`.

## Known limitations

No per-file baton. Soft focus marks do not prevent two people dragging one part; server order settles it.
