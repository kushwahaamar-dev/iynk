# ADR-0600: The partner runs in the browser; the model call is browser to provider with the user's key, or through a stateless relay

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: D-013, D-015; F-193, F-105, F-003, F-004; R-010, R-154; audit ai-search-mcp D1, D8, D10, SECURITY_BASELINE C1, C4. Spec: AI_ARCHITECTURE sections 4, 9.

## Problem

Today the chat loop, the prompts and the model keys live on the server (`src/app/api/ai/chat/route.ts`, `src/lib/server/ai/provider.ts`) on keys the founders pay for, with no identity and an in-memory budget that counts HTTP requests, not model calls (audit D8, D10). D-015 says nothing may depend on Amar's paid keys and the app must work with no server.

## Constraints

1. The app works with no server and no AI (F-012).
2. A key never reaches a project, room, export, log or error report (R-154).
3. A provider may refuse browser calls (CORS support is UNKNOWN per provider, F-193).
4. A self-hosted server must not become an open proxy.
5. The AI loop needs the project, which lives in the browser (ADR-0100, ADR-0106).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Keep the server-side loop, put the user's key in the server environment | Smallest change | Rejected: the server would need the project, so every request ships it; the key sits in a shared process; the loop and prompts run where the data is not |
| B. Browser loop, calls browser to provider | No server needed | Chosen as the first path |
| C. Browser loop, calls through a relay that carries the key per request | Works when a provider blocks browsers, and for local servers | Chosen as the fallback path |
| D. A hosted AI gateway | Would add accounts and cost | Rejected: nothing hosted (D-015) |

## Decision

1. The AI host (context builder, tool runner, policy engine, adapter, ledger) runs in the browser.
2. A provider profile has `via`: `direct`, `relay` or `auto`. `auto` tries direct, and on a network failure with no HTTP status tries the relay once if one is configured, then remembers the working path in the profile.
3. Keys live in the IndexedDB `keys` store only. The relay receives the key in a header per request over TLS and keeps it for the length of that request.
4. The server's Meta and Gemini keys and model names are deleted from `src/lib/server/env.ts`.
5. The browser-direct claim is never made for a provider before the conformance run (ADR-0606) records `browserDirect: yes`.

## Technical justification

The data the model needs (document, sim state, sources) is in the browser, so building the pack there avoids shipping the project to a server first. The proposal pipeline needs `apply` and the validator, which already run in the browser and workers (ADR-0104). The relay is the same OpenAI-style request, forwarded, so it adds little code.

## Performance data

No measurement exists for this decision (UNKNOWN: no browser-to-provider timing, no phone run). What is on record:

| Item | Figure | Label |
|---|---|---|
| Standard context pack build for the RS-01 scene (500 parts, 1,000 wires) | under 20 ms p95 desktop, under 80 ms at 4x CPU throttle | PROPOSAL budget, ESTIMATED; measured at the end of AI-1 (AI_ARCHITECTURE section 4.3) |
| Added hop through the relay | one extra network leg and one forwarded SSE stream; no loop, no prompts, no body parsing beyond size and target checks | ESTIMATED; first-token delta is measured in AI-1a by the `firstTokenMs` field (AI_ARCHITECTURE section 12) |
| Streaming | the adapter runs in the AI worker, so token parsing does not block the editor thread | DOCUMENTED (AI_ARCHITECTURE section 4.3) |

Because the model call dominates latency, the choice between `direct` and `relay` is expected to change first-token time by the relay hop only (ESTIMATED, assumption: the relay is on the same machine or LAN). The conformance run records `firstTokenMs` per provider and path so this can be checked rather than assumed. No bundle cost is added by an SDK: the adapter is the existing fetch client (`src/lib/server/ai/provider.ts`, 527 lines, VERIFIED by `wc -l`) moved to `src/lib/ai/adapters/openai-compat.ts`.

## Cost implications

No hosting cost. Engineering for AI-0 is the adapter move, settings page, conformance run and relay: ESTIMATED 1 to 2 person-weeks (no measurement; the existing `provider.ts` is reused).

## Licensing

No new dependency: the adapter is our own code moved from `provider.ts`, and `package.json` lists no provider SDK (VERIFIED by grep for `openai` and `@google`). The project licence is undecided (D-017). Provider terms, model licences and rate limits are the user's concern under the key they bring (AI_ARCHITECTURE section 13); the data-handling note (F-008) says so. Anything copied from third-party sites into prompts is covered by D-017 and is checked before publishing.

## Security implications

Key theft by script in the page is the main risk; controls are the CSP (R-006), no `eval`, the optional passphrase lock, and a clear statement that the lock does not stop in-page script. The relay is an SSRF and open-proxy risk, handled in ADR-0612.

## Reversibility

Reversible per provider: `via` is a profile field. If browser-direct proves unreliable everywhere, all profiles are set to `relay` without code change.

## Migration plan

1. AI-0 (inside B0): add the `keys` store and settings; move `provider.ts` to the OpenAI-compatible adapter in the browser; delete the Meta and Gemini keys and model names from `src/lib/server/env.ts`. `guard.ts` stays until the ledger lands.
2. AI-1a: add the Anthropic adapter, the conformance run, the ledger and the relay. Replace `src/app/api/ai/chat/route.ts` with the relay (a temporary Next route gated by `IYNK_SERVER_TOKEN`, then `POST /v1/ai/relay` in the server process). Delete `guard.ts` and the in-memory budget.
3. Remove the Build Stories and Build Night routes with their prompts (`/api/ai/story`, `/api/ai/image`, `/api/ai/match`, `/api/ai/plan`, `src/lib/server/ai/plan.ts`) under D-016, in the same step as the Solana and story removal in B0.
4. Keep `/api/ai/translate` and `/api/ai/transcribe` (code and tests) switched off until room chat and voice return (F-108, LATER). When the Next API routes are deleted (ADR-0003, ADR-0420), the remaining files under `src/lib/server/ai` either move to `src/lib/ai` (adapter, `sse.ts`, prompts) or go to the server module (relay). `src/lib/server/ai` and `/api/ai/*` then no longer exist.
5. Rollback per step: each step is one commit set; `via` stays a profile field, so a provider that fails in the browser is switched to `relay` without code change.

Disposition per file is in AI_ARCHITECTURE section 3 (preserve / extend / replace / remove), which this plan follows.

## Known limitations

Per-provider browser support is UNKNOWN (EXTERNAL claims about opt-in headers and local-server origin settings are not verified here). A key in browser storage is exposed to anything that runs in the page.

## Review fixes (2026-10-27)

| # | Issue | What was done |
|---|---|---|
| 1 | ADR-0600 lacks Performance data, Licensing and Migration plan | Applied. Added the three sections in the same order as ADR-0100. Performance data states that nothing is measured (UNKNOWN) and lists the pack-build budget and `firstTokenMs` check from AI_ARCHITECTURE sections 4.3 and 12. Licensing: no new dependency (grep of `package.json`), licence per D-017. Migration plan: the removal of `src/lib/server/ai` and `/api/ai/*` in steps that match AI_ARCHITECTURE sections 3 and 17.1 (AI-0, AI-1a, D-016 removals, translate and transcribe kept off). |
| 1b | Same issue for ADR-0601 to 0613, ADR-0700 to 0716, ADR-0013 | Not applied here: I edit only ADR-0600. Those files need the same headings from their owners; the ADR-0600 text is a pattern for 0601 to 0613. |
