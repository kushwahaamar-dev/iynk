# ADR-0502: Sockets are authenticated by a device key; the server derives the member identity

Status: proposed, 2026-10-27. Author: realtime-architecture seat.
Upstream: SECURITY_BASELINE R4, R5; R-075, R-077, R-080; F-005, F-119, F-206; D-015. Spec: REALTIME_ARCHITECTURE 4.

## Problem

The client picks its peer id and the relay trusts it. A second join with the host's id replaces the host's socket and inherits the host role (R4, reproduced). Bans are by that id, so they are trivial to evade (R5).

## Constraints

1. No accounts, no passwords, no email (D-015, F-206).
2. A leaked bearer token (log, proxy) must not be enough to impersonate someone in a room.
3. Works in browsers with WebCrypto; no extra dependency.
4. A buddy identity also appears in documents (`actors[].keyThumbprint`).

## Considered options

| Option | Verdict |
|---|---|
| A. Challenge and response signed with a non-extractable P-256 key, id equals hash of the public key | Chosen |
| B. Bearer token in the first frame | Rejected for sockets: a leaked token is a full impersonation. Kept for HTTP |
| C. Token in the URL query | Rejected: ends up in logs |
| D. Server-issued peer id plus a resume secret (the minimum fix in SECURITY_BASELINE) | Used as slice S1 stop-gap only |
| E. Password or email login | Rejected by D-015 |

## Decision

Device registration stores the public key and gives an HTTP token (stored as a hash). The socket starts with `challenge {nonce, aud}`; the client signs `"iynk.ws.v2\n" + aud + "\n" + nonce + "\n" + room-or-lobby` with ECDSA P-256 and SHA-256 and sends `hello`. The server verifies, maps the device to a member of the room ACL, and ignores any id the client states. One session per member per room; a newer authenticated session supersedes the older. Bans are per device. Five auth failures a minute per address lead to a five-minute refusal.

## Technical justification

The key never leaves the browser; `aud` binds the signature to this server; the nonce binds it to this connection and room. Self-certifying ids remove a registry lookup for peers.

## Performance data

UNKNOWN. HYPOTHESIS: verification is far below 1 ms. Measured in RA-05.

## Cost implications

S2: ESTIMATED 3 to 5 days.

## Licensing

None (WebCrypto, Node `crypto`).

## Security implications

Closes R4 and R5. A stolen token cannot open a socket. A stolen browser profile can (the key is non-extractable but usable by code in that profile); revocation on the server ends it (R-077). Malicious server relaying challenges is stopped by `aud`.

## Reversibility

Medium. The handshake is isolated in the first two frames; swapping the credential changes only `sig`.

## Migration plan

S1 server-issued ids and resume secrets on the v1 relay; S2 replaces them with the key handshake; v1 is not deployed by the self-hosting kit.

## Known limitations

Private windows or blocked storage can lose the key (RT-3): the person becomes a new device and re-pairs (R-077). Private-key use is possible by any script in the page origin, so the CSP of F-002 matters. Secure-context requirement (REALTIME_ARCHITECTURE 17.3).
