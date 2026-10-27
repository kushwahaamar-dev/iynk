# ADR-0816: One stateless AI relay and typed search routes; provider keys travel in a header and are never stored

Status: proposed, 2026-10-27. Author: API contracts design seat.
Refines: ADR-0612 (AI relay) and ADR-0425 (bring-your-own keys) on the wire. Upstream: C1, C3, C4, R-010, R-154, ADR-0600. Downstream: AC-API-15, AC-API-16, F-193, F-194. Spec: API_CONTRACTS section 11.

## Problem

Some AI providers block calls from a browser, and the five search routes hold real logic (normalising, pack-size detection, caching). Today both run on the founders' keys with no authentication (SECURITY_BASELINE C1).

## Constraints

1. The user's key is the budget (R-154); the server must not become a key vault.
2. The relay must not be an open proxy or reach internal hosts.
3. Both are optional and off unless the operator enables them.

## Considered options

| Option | Verdict |
|---|---|
| A. One relay route; typed search routes; key in `X-Iynk-Provider-Key`; optional operator key with a per-identity daily cap | Chosen |
| B. Keep the server-side chat loop | Rejected: ADR-0600 puts the loop in the browser |
| C. No server AI at all | Rejected for providers that block browsers |
| D. Store users' keys on the server | Rejected: makes the server a vault |

## Decision

`POST /ai/relay` forwards `chat` and `models` calls to an allow-listed host, streams the provider body, follows no redirects, blocks private addresses after DNS resolution, and caps request size at 1 MiB and time at 120 seconds. Search is `GET /search/{web,videos,nearby,events}` and `POST /search/offers`, with the key per request or from `IYNK_SEARCH_KEY`. `IYNK_DISABLE_AI` and `IYNK_DISABLE_SEARCH` answer 501.

## Technical justification

The relay forwards and the browser decides, so no AI logic sits on the server. Search normalisers are the valuable code; they stay typed and keyed per request.

## Performance data

None measured. The 120-second limit is the old `maxDuration` (VERIFIED in the repository).

## Cost implications

Zero for the operator unless they set a server key; then a daily cap per identity bounds spend. Defaults are PROPOSAL.

## Licensing

Provider terms apply to the key holder. SerpApi's terms on browser use are UNKNOWN (CORS UNKNOWN).

## Security implications

The key is redacted from logs, never stored, never in an error. SSRF controls are tested by AC-API-16. Rate limits are per identity.

## Reversibility

Medium. If providers allow browser calls the relay is never used and can be deleted with no other change.

## Migration plan

`src/app/api/ai/chat` moves to the browser; translate and transcribe stay unrouted; match, plan, story and image are deleted (D-016).

## Known limitations

A stream that breaks mid-way is not resumed. Search output depends on a third party.
