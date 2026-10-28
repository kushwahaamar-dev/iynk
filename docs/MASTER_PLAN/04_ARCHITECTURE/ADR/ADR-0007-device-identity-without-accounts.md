# ADR-0007: Device identity without accounts

Status: proposed, 2026-10-27. Author: system architecture seat.
Supersedes: ADR-0421 (its 24 hour HMAC-signed token and per-device epoch; the device key, roles and pairing numbers carry over). Aligned with ADR-0502 (socket handshake) and API_CONTRACTS 5 (ADR-0801).
Upstream: D-013, D-015, D-016; R-007, R-075 to R-080, R-093; SECURITY_BASELINE R1 to R9, section 8 items 1 and 2; F-005, F-206.
Downstream: `SYSTEM_ARCHITECTURE.md` 9, 10; AR-06, AR-07, AR-21.

## Problem

The relay has no identity: peers choose their own ids, a second join with an existing id takes over the seat and the host role, a six-character code (about 29.7 bits) is the only secret, and every join to an unknown code creates a room (R3, R4). The Next routes have no authentication. Friends need to find each other and work on one project; strangers must not use the server. There are no accounts, email or passwords (F-169 out).

## Constraints

1. No email, password or profile.
2. A stranger who finds the URL gets nothing (R-007).
3. A lost browser store means a new device (R-077); no recovery by email.
4. The operator has a shell on the machine and no other admin surface.
5. Tokens must not appear in URLs or logs.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Device P-256 key registered at gated enrolment; opaque hashed access token; the same key signs the socket hello; pairing offers, invite capabilities, operator CLI | Chosen | Chosen |
| B. Signed (HMAC or JWT) token, or a long-lived random device secret as the only credential (R-077 wording) | | Rejected: the server always has the database, so a signature adds a key to rotate and a deny list; a bearer secret alone would let a leaked token sit in a room (ADR-0502 option B) |
| C. Shared server password | Simplest | Rejected: cannot revoke one friend; password in every request |
| D. Accounts with email or OAuth | Conventional | Rejected: F-169, D-016, and a mail service |
| E. Open enrolment (any visitor gets a token) | R-077 as worded | Rejected: defeats R-007 (Objection 3) |

## Decision

1. **Enrolment** registers a device key. The browser makes a non-extractable ECDSA P-256 key (WebCrypto, IndexedDB `keys`). `iynk-server enrol` prints `https://host/#enrol=<code>` (128-bit random, 24 hours, single use, stored as a hash; a typed 12-character form exists for people who cannot paste a link, API_CONTRACTS 5.1). The browser signs a server challenge and posts the public key (SPKI DER), the signature and the code in the body of `POST /v1/identities` (the fragment is not sent anywhere before that). Ids come from the key: `deviceId = "dev_" + base32(SHA-256(SPKI)[0..16])`. The first device uses the same path. Every later device also redeems an operator-issued code; a pairing only links two enrolled identities as buddies.
2. **Access token and sign-in**: sign-in is `POST /v1/auth/challenges` then `POST /v1/auth/tokens` with a signature over the challenge (`iynk.auth.v1`, bound to the server audience). The server returns an opaque 256-bit token (`iynk_at_` plus 43 base64url characters), shows it once, and stores only `SHA-256(token)`. It lives 12 hours (operator range 1 hour to 30 days). There is no refresh token: renewal is a new signed challenge, which the non-extractable key makes silent. The token is the HTTP credential (`Authorization: Bearer`) and is never sent on the socket. The same key signs the WebSocket hello (`iynk.ws.v2`, ADR-0502), so a leaked token cannot open a socket. Missing, malformed, revoked, expired and forged tokens and bad signatures all answer one indistinguishable 401.
3. **Pairing**: `POST /v1/pairings` creates a typed code `XXXX-XXXXXX`: a 4-character public channel plus a 6-character secret, Crockford base32, 30 secret bits, valid 10 minutes. The channel is deleted after 5 wrong attempts, so the public part lets the server count tries (R-076). The redeem route is limited per address.
4. **Invites**: 128-bit random token in a link, valid 24 hours by default, one room, revocable by the host; the room code of today is not a credential.
5. **Authority**: the server assigns every peer id and checks role on every frame: host rules, baton rules, `chat.kind` set by the server (SECURITY_BASELINE R4 to R7).
6. **Operator**: commands run in the container (`init` (prints the first enrolment code; its redeemer becomes owner), `enrol` (alias `enroll`), `devices`, `revoke`, `rooms`, `close`, `mcp-key`, `backup`, `restore`, `compact`, `diagnostics`, `check-config`); there is no admin HTTP API and `openapi.yaml` defines no `/admin/*` path.

## Technical justification

Entropy: today's room code gives 31^6 = 887,503,681 combinations (about 29.7 bits); a guess hits a live room with probability about 5.6e-7 with 500 rooms (SECURITY_BASELINE R1, ESTIMATED). Invites at 128 bits and pairing at 30 secret bits with the channel deleted after 5 wrong attempts and a per-address limit make guessing a non-issue for a handful of live codes. The access token is stored as a hash, so a database leak gives no usable credential, and the key never leaves the browser, so a log or proxy leak of a token cannot join a room. Server-assigned peer ids remove the takeover path by construction.

## Performance data

Not applicable for the token (hash lookup on a primary key, one indexed read per request). Signature verification at sign-in and socket hello is UNKNOWN, HYPOTHESIS far below 1 ms, measured in RA-05 (ADR-0502).

## Cost implications

None.

## Licensing

None added.

## Security implications

Closes R1 to R9 for the self-hosted server. Residual: the key in IndexedDB is usable (not readable) by any script on the origin while the page is open, and the in-memory token is readable by it (CSP is the control); a friend's compromised browser is a compromised member; the host's authority is the moderation model (no report-and-block among friends). The enrolment link is a bearer secret until used; sharing it publicly enrols strangers, so it expires in 24 hours and is single use.

## Reversibility

High. Accounts could later map onto devices (a table of accounts that own device ids). Tokens can be re-issued.

## Migration plan

COLLAB first item: relay authority (R-075) on the SQLite store, then enrolment and pairing, then rooms on invites. The R-097 hostile suite is the gate.

## Known limitations

No recovery of a lost device; the person re-pairs. No per-device permissions beyond room roles. The printed enrolment link appears in the operator's terminal and shell history if copied there. R-077 should say "opaque token plus device key" rather than "signed device token" (Objection 3 and section 10.2).

## Review fixes (2026-10-27)

| # | Issue | What I did |
|---|---|---|
| 1 (high), items 1 and 2 | Decision said a bare 256-bit device secret is the token and nothing is signed; ADR-0502 and API_CONTRACTS need a P-256 key and a signed socket hello | Applied. Items 1 and 2 rewritten: enrolment registers the SPKI public key with the one-time code (`POST /v1/identities`); the server issues an opaque 256-bit access token, hash stored, 12 hours, renewed by a new signed challenge (`/auth/challenges`, `/auth/tokens`); the same key signs the socket hello (ADR-0502). Option table, justification, performance, security and limitations text brought into line. Evidence: API_CONTRACTS 5.1, 5.2, ADR-0801; ADR-0502 Decision. |
| 1, items 3 to 5 | Keep | Kept unchanged (invite 128 bits, 24 hours; server authority). Pairing code shape later set by RC-18 below. |
| 1, item 6 and openapi.yaml | Keep CLI only; make openapi.yaml agree | Item 6 kept. No change needed to openapi.yaml: it already has no `/admin/*` paths (grep finds only the review-log comment at lines 6343 to 6351, and line 26 states there is no admin HTTP API), and API_CONTRACTS line 699 says the same. I did not edit that file. |
| Header | Add Supersedes ADR-0421 | Applied. ADR-0421 (HMAC token, 24 hours, epoch) should be marked superseded by its owner. |

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RC-14 | Decision 1, last sentence: replaced "After that, devices enrol by redeeming a pairing offer" with "Every later device also redeems an operator-issued code; a pairing only links two enrolled identities as buddies". |
| RC-18 | Decision 3 and Technical justification: pairing code is now the typed code `XXXX-XXXXXX` (4-character public channel plus 6-character secret, Crockford base32, 30 secret bits, 10 minutes, channel deleted after 5 wrong attempts). The old 8-character, 40-bit wording is gone. The note in the Review fixes table (old line 76) recording the difference with API_CONTRACTS 5.1 is deleted. |
| Spikes | None applied. |

## Reconcile, second pass (2026-10-27)

| Id | Change |
|---|---|
| RC-15 | Decision 6, operator commands: added `init` (prints the first enrolment code; its redeemer becomes owner), `compact` and `diagnostics` to match SYS 10.3; reworded "also written enroll in API_CONTRACTS; one command" to "alias `enroll`". |
