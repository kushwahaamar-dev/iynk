# ADR-0503: Rooms are created, never implied; invites are capabilities; a stranger learns nothing

Status: proposed, 2026-10-27. Author: realtime-architecture seat.
Upstream: SECURITY_BASELINE R1, R2, R3; R-075, R-076, R-084, R-095; D-016; F-116, F-119, F-138. Spec: REALTIME_ARCHITECTURE 5.

## Problem

A join to an unknown six-character code creates a room (R3: one IP fills all 500 rooms for 30 minutes, reproduced). The code is the only credential (31^6, about 29.7 bits, R1) and the welcome frame reveals roster and item to any joiner (R2). Public rooms are gone (D-016); rooms must be invite-only among buddies.

## Constraints

1. Self-hosted, small operator effort.
2. Invite by link or to a paired buddy; revocable; expiring.
3. No room list, no probing.

## Considered options

| Option | Verdict |
|---|---|
| A. Authenticated `POST /api/rooms`; membership list; invite tokens of 128 bits redeemed over HTTP; one answer for missing and forbidden | Chosen |
| B. Keep short codes, add rate limits | Rejected: 29.7 bits stays guessable by a patient attacker, and R2 stays |
| C. Per-room password | Rejected: shared secrets leak and cannot be revoked per person |
| D. Join approval by the host for each stranger | Kept as a lock option, not the model |

## Decision

Room ids are 80-bit random addresses. Creating a room needs an enrolled device and passes quotas (6 per minute, 30 per hour, 10 stored per device, caps per server). A join to a missing room or by a non-member gets `room_unavailable` after a fixed minimum delay. Invites: direct (to a paired buddy, via the lobby socket) or link (128-bit token in the URL fragment, hash stored, TTL default 24 h, 1 use for editors, 5 for viewers). Redemption is one transaction that adds the member and writes the `access.grant` op. Registration of devices needs an enrollment code by default.

## Technical justification

Guessing an 80-bit id and then needing membership gives an attacker nothing; guessing a 128-bit token is infeasible; the cost of a junk room is a quota slot of an enrolled device.

## Performance data

UNKNOWN: none needed beyond RA-17.

## Cost implications

S1 and S3. ESTIMATED 1 week together with the store.

## Licensing

None.

## Security implications

Closes R1, R2, R3. Remaining risk: an enrolled friend can still create 10 rooms (a quota, by design). A leaked link works until used, expired or revoked, so editor links are single use.

## Reversibility

High. Quotas are configuration; invite kinds can be added.

## Migration plan

S1 stop-gap on the v1 relay; S3 final. The `probe.ts` hidden-peer roster read is deleted.

## Known limitations

Direct invites need the lobby socket; a buddy offline sees the invite on next connection (stored for its TTL). Enrollment adds setup steps (Objection O-1).
