# ADR-0812: Every shared secret is a capability: 128 random bits, shown once, stored as a hash, with expiry and use count

Status: proposed, 2026-10-27. Author: API contracts design seat.
Refines: ADR-0007 (enrolment and pairing), ADR-0503 (invites as capabilities). Upstream: R1, R2, R-076, R-080, R-093. Downstream: AC-API-10, AC-API-12. Spec: API_CONTRACTS section 5.1.

## Problem

Today's room codes carry about 29.7 bits and are guessable (SECURITY_BASELINE R1, R2). The server will hold pairing links, typed pairing codes, room invites, share links and enrolment codes, and each must be safe to put in a message to a friend.

## Constraints

1. A store leak must not leak working links.
2. A token must not appear in a server log.
3. A person must be able to read a pairing code aloud (R-076).
4. Wrong guesses must be countable (R-076: five wrong, code deleted).

## Considered options

| Option | Verdict |
|---|---|
| A. Random 128-bit token, SHA-256 at rest, fragment or body only; typed codes with a public channel | Chosen |
| B. Short room codes as today | Rejected: R1 |
| C. Signed self-describing tokens | Rejected: cannot be revoked or counted without a store row anyway |
| D. Per-user access lists only | Rejected: a friend with no identity yet could not be invited |

## Decision

1. Pairing, room-invite, share and enrolment tokens are 128 random bits. The enrolment token is also accepted in a 12-character typed Crockford form (60 bits) for a person who cannot paste a link.
2. Shown once; stored as SHA-256; an expiry (default 24 hours, pairings at most 7 days) and a use count.
3. Carried in a URL fragment or a body; the two share routes that must carry the token in a path are logged without it.
4. A typed pairing code is `XXXX-XXXXXX`: a 4-character public channel and a 6-character secret. A wrong secret on a live channel counts against that pairing; 5 deletes the code but not the link.
5. Missing, expired, used and revoked all answer one 404.

## Technical justification

Fragments are not sent to the server or to a `Referer`. The channel lets wrong guesses be attributed to one pairing without storing the secret in clear. A guesser limited to 10 guesses a minute reaches a live 6-character secret with probability 5 in 2^30 per live channel found (ESTIMATED, assuming uniform codes).

## Performance data

None measured. The guess odds above are arithmetic, not a measurement.

## Cost implications

None beyond one hash per redeem.

## Licensing

No new dependency.

## Security implications

Closes R1 and R2 for the self-hosted server. Residual: a link is a bearer secret until used or expired; sharing it publicly lets a stranger redeem it. The IPv6 /64 keying of rate limits (API_CONTRACTS 4.3) keeps the per-address guess limit from being bypassed.

## Reversibility

High. Lengths and lifetimes are operator settings; the token is opaque to clients.

## Migration plan

None. The old room code is deleted with the relay's memory-only state when the new rooms ship (ADR-0500).

## Known limitations

A typed code has 30 secret bits, so it is safe only with the 5-strike rule and the address limit. No way to recover a lost link except to make a new one.
