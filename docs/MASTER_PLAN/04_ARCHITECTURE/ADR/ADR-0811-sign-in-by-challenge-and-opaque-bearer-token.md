# ADR-0811: Sign-in by challenge and signature, with an opaque 12-hour bearer token

Status: proposed, 2026-10-27. Author: API contracts design seat.
Refines: ADR-0007; ADR-0421 is superseded. Also refines ADR-0502 (device-key socket authentication), ADR-0007 (device identity without accounts). Does not decide the key type or the socket handshake again. Upstream: F-005, F-206, R-077, REALTIME 4.3. Downstream: AC-API-03, AC-API-10. Spec: API_CONTRACTS section 5.

## Problem

The HTTP API needs a credential that does not exist today (SECURITY_BASELINE: 23 of 23 routes unauthenticated). ADR-0421 chose a stateless HMAC token valid 24 hours; ADR-0502 signs the socket handshake with the same device key. The two documents and the API draft disagreed on token form and lifetime.

## Constraints

1. No email, no password, no account service (D-015).
2. A store leak must not give a usable credential.
3. A leaked bearer token must not be enough to sit in a room as that person (REALTIME 4.3).
4. Revocation of one device or session must be immediate.
5. Lost browser storage means a new identity (R-077).

## Considered options

| Option | Verdict |
|---|---|
| A. Challenge and signature with the device key, then an opaque random token stored as SHA-256, 12 hours | Chosen |
| B. Stateless HMAC token, 24 hours (ADR-0421 as written) | Not chosen for the HTTP API: revocation needs an epoch per device and a read of the device row on every call anyway, so statelessness buys nothing for one process |
| C. JWT | Rejected: cannot be revoked without a list |
| D. Password or magic link | Rejected: needs mail and accounts |
| E. OAuth with a provider | Rejected: a third party (D-015) |
| F. Long-lived device token (R-077 as written) | Rejected: REALTIME 4.3 says a leaked token must not suffice for the socket |

## Decision

1. The device key and its storage are ADR-0007's: ECDSA P-256, non-extractable, in IndexedDB.
2. `POST /auth/challenges` returns a nonce; the signing input is `iynk.auth.v1`, purpose, audience, challenge id, nonce and key thumbprint joined by LF; the signature is 64-byte P1363, base64url.
3. `POST /auth/tokens` returns `iynk_at_` plus 256 random bits; the server stores SHA-256. Lifetime 12 hours, operator-settable from 1 hour to 30 days.
4. Ids come from the key: `dev_` plus base32 of 16 bytes of the SPKI hash, `usr_` plus base32 of 10 bytes (RFC 4648, lower-case, no padding).
5. The socket signs again (`iynk.ws.v2`, ADR-0502); this API issues no socket ticket.
6. Enrolment needs a one-time code from the operator CLI (ADR-0007).

## Technical justification

The audience in the signed bytes stops a hostile server relaying a challenge from a real one (same reasoning as ADR-0502). An opaque hashed token can be revoked by deleting a row. The silent re-sign after a reload uses the non-extractable key, so a short lifetime costs the person nothing.

## Performance data

None measured. One P-256 verify per sign-in; Node `crypto.verify` with `dsaEncoding: ieee-p1363` (EXTERNAL assumption shared with REALTIME 4.3, to be checked at build).

## Cost implications

No external service. One SHA-256 and one row read per authenticated request.

## Licensing

WebCrypto and Node `crypto` only. No new dependency.

## Security implications

Missing, wrong, expired and revoked credentials are one indistinguishable 401. A bad signature, an unknown identity and a used challenge cost the same. Residual: script injection in the page can use the key while the page is open (CSP is the control); a stolen unlocked browser is a stolen identity.

## Reversibility

Low for the ids (they derive from the key, so changing the key type changes every id); Medium for the token form (the client treats the token as opaque, so ADR-0421's HMAC form could replace it with a server change only).

## Migration plan

BACKEND_ARCHITECTURE section 6 follows this token form and lifetime; ADR-0421 is history. Nothing is deployed yet, so no data migrates.

## Known limitations

No key rotation in v1 (a later `PUT /identities/me/key` signed by both keys is additive). No recovery of a lost browser. The ECDSA encoding assumption is unverified until build.

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RC-17 | Header line 8: "Refines ADR-0421 (HMAC valid 24 hours)" replaced by "Refines ADR-0007; ADR-0421 is superseded". The file had the older wording "Refines: ADR-0421 (device keys and tokens)", so that text was replaced; ADR-0502 stays as a refined ADR. ADR-0007 is the identity ADR; ADR-0811 (sign-in) and ADR-0502 (socket) sit under it. ADR-0421 is history. |

## Reconcile, second pass (2026-10-27)

| Id | Change |
|---|---|
| RC-17 | Decision item 1 (line 31): "The device key and its storage are ADR-0421's" is now "ADR-0007's". Migration plan (line 64): "ADR-0421 and BACKEND_ARCHITECTURE section 6 change the token form and lifetime to this one" is now "BACKEND_ARCHITECTURE section 6 follows this token form and lifetime; ADR-0421 is history". Other ADR-0421 mentions (line 8 context, the rejected option B, the reversibility note) are historical references and stay. |
