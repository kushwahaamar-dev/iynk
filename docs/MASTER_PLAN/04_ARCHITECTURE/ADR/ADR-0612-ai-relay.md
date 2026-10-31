# ADR-0612: The relay is stateless, authenticated, allowlisted and does not log bodies

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: F-004, F-193, F-199; R-007, R-008, R-154; SECURITY_BASELINE C1, C4; ADR-0600. Spec: AI_ARCHITECTURE section 9.3.

## Problem

A route that forwards requests to a URL the caller names is an SSRF and open-proxy risk, and a place keys can leak into logs.

## Constraints

1. Needed for providers that block browsers and for local servers on the host.
2. Self-hosted, one process.
3. Keys never logged.

## Considered options

| Option | Verdict |
|---|---|
| A. No relay | Rejected: some providers may be unreachable |
| B. Open forwarder | Rejected |
| C. Authenticated, allowlisted, size-limited forwarder | Chosen |

## Decision

1. `POST /v1/ai/relay` (B0 interim: `/api/ai/relay`) takes `{profile: {family, baseUrl}, path, body}` and the key in a header.
2. Needs a buddy session or device token.
3. Target host on the allowlist (presets plus operator additions); private, loopback and link-local refused after DNS resolution unless `IYNK_AI_RELAY_ALLOW_PRIVATE=1`; no redirects.
4. Body at most 1 MiB, 120 s; response streamed.
5. Logs: route, status, byte counts, duration, host.
6. The relay is off unless `IYNK_AI_ENABLE=1`.
7. Optional server-held key with per-buddy caps in the server store; off by default.

## Technical justification

The relay does not understand prompts, so it cannot be a prompt-injection target; the allowlist and DNS check address SSRF.

## Cost implications

One small route.

## Security implications

Covered in the decision; tested by AI-AC-19.

## Reversibility

Removing the route leaves `direct` profiles working.

## Known limitations

In-memory per-session limits reset on restart (documented, R-008). DNS rebinding is addressed by resolving before connecting; the implementation must connect to the resolved address.

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RC-28 | Decision 6: replaced "`IYNK_DISABLE_AI=1` turns it off" with "the relay is off unless `IYNK_AI_ENABLE=1`". Opt-in, default `0`. When off, the route answers `501 feature_disabled`. |

## Reconcile, second pass (2026-10-27)

| Id | Change |
|---|---|
| RC-21 | Decision item 1 (line 26): `POST /api/ai/relay` reworded to `POST /v1/ai/relay` (B0 interim: `/api/ai/relay`). The `/api/` path is the B0 temporary Next route only (ADR-0008 line 70). |
