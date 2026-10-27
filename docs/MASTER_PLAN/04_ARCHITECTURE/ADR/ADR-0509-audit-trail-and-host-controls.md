# ADR-0509: An audit trail and host controls replace public moderation

Status: proposed, 2026-10-27. Author: realtime-architecture seat.
Upstream: BRIEF 14 (audit history, host permissions); SECURITY_BASELINE R5; R-093; D-016; F-120. Spec: REALTIME_ARCHITECTURE 15.

## Problem

Kick is evaded by changing the peer id; there is no record of who did what; reports and public moderation are out of scope (invite-only rooms among buddies).

## Constraints

1. Friends, not strangers: simple controls.
2. Attribution that clients cannot forge.
3. No chat text and no personal data stored.

## Considered options

| Option | Verdict |
|---|---|
| A. Op log with server-stamped author and time, plus a room-event table, plus host commands keyed by device | Chosen |
| B. Report and review queue | Rejected: no strangers (D-016) |
| C. Client-side logs only | Rejected: forgeable and lost on reload |

## Decision

Edit history is the op log (payloads for the latest 20,000 ops, summaries after) with checkpoints that carry `author` and `stateHash`. Room events list joins, leaves, invites, roles, baton, host, runner, run controls, kick, mute, lock, settings, close, resync and reject bursts. Owners read the events; members see the change list and can undo their own last change; owners can restore a named checkpoint. Commands: kick (device ban), mute, lock, close, pass, claim, baton take, runner set.

## Technical justification

The server stamps `author.actor` and `at`; the chain makes silent edits of the log detectable at load.

## Performance data

Negligible; rows are small.

## Cost implications

Inside S3 and S4.

## Licensing

None.

## Security implications

Events never include chat, cursors or addresses. Retention equals room retention (30 days after last activity unless pinned).

## Reversibility

High.

## Migration plan

S3 table, S6 UI.

## Known limitations

An operator can read everything on their server and the note says so. Clients cannot prove to each other that the server did not drop an event.
