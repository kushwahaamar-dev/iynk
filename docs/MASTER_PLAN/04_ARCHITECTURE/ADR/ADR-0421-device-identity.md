# ADR-0421: Device keys, short-lived signed tokens, invite and pairing enrolment

Status: superseded by ADR-0007 (enrolment, token) and ADR-0502 (socket). Original date 2026-10-27.

This record is kept only so that old references resolve. Read the replacements:

| Topic | Now defined in |
|---|---|
| Device key, enrolment, access token (opaque, stored as a hash), pairing and invites | ADR-0007 |
| Socket authentication by device-key signature | ADR-0502 |
| Instance roles `owner`, `member`, `guest` (operator-granted, not project roles) | BACKEND_ARCHITECTURE section 6.1 |

The `v1.<kid>.<deviceId>.<iat>.<exp>.<mac>` HMAC token, its 24 hour lifetime and the per-device `epoch` described in earlier drafts of this record are withdrawn.

## Review fixes (2026-10-27)

| Issue | What was done |
|---|---|
| 1 [high] Third token format duplicating ADR-0007 and ADR-0502 | Applied. Body replaced by the superseded status above. ADR-0007 already states "Supersedes: ADR-0421" and ADR-0502 defines the socket handshake (both read). Only the instance role names moved: BACKEND_ARCHITECTURE section 6.1 is renamed "Instance roles", states they are operator-granted and distinct from project roles owner/editor/commenter/viewer, and points to ADR-0007 and ADR-0502. The issue says "section 5"; the roles table lives in section 6.1, so the change was made there, with 5.1's "member or owner" routes covered by the new intro sentence. |
| Follow-up for owners (not edited here) | BACKEND_ARCHITECTURE section 6.2 still shows the HMAC token and section 1 row ADR-0421 still says "Decided"; API_CONTRACTS line 337 already flags the mismatch. Their owners should align them to ADR-0007. |

### Second review round (2026-10-27)

| Issue | What was done |
|---|---|
| 1 [blocker] Token design contradicts REALTIME 4.3, ADR-0007, API_CONTRACTS and R-077 | The follow-up row above is now done: BACKEND_ARCHITECTURE 6.2, 6.4 and 13.2 describe a 256-bit random bearer stored as SHA-256 in a `sessions` table (12 hours), a key-signed refresh and a key-signed socket handshake, with no HMAC token, epoch, `kid`, `secret.key` or `IYNK_SECRET`. The objection about R-077 was deleted. This record stays superseded by ADR-0007 and ADR-0502. |
| 11 [medium] Eight required headings missing | Not applied to this record: it is superseded and ADR-0007 carries all twelve headings (verified by reading it). |
