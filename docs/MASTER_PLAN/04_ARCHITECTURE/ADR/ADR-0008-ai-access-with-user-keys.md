# ADR-0008: AI access with keys the user brings

Status: proposed, 2026-10-27. Author: system architecture seat.
Upstream: D-015; ADR-0600, ADR-0606, ADR-0612; R-010, R-153 to R-161, R-008; F-105 to F-114, F-193; TECHNICAL_DEBT A10, D5; SECURITY_BASELINE A1 to A6; TECHNICAL_RESEARCH D11 (RS-11 PENDING); PROJECT_DATA_MODEL 13 (AI-written ops).
Downstream: `SYSTEM_ARCHITECTURE.md` 6.8, 11.1; AR-13, AR-20.

## Problem

AI calls today go through Next routes on the operator's Meta and Gemini keys, with an in-memory hourly budget, no identity, and tool output unfenced. A stale Accept overwrites newer edits (D5 defect) and the model cannot change wires at all (A10). D-015: AI uses keys the user brings; nothing depends on Amar's paid keys.

## Constraints

1. A key is entered by the person, kept in their browser, never in a project, export, room, share, log or event (R-010).
2. The model never writes the project directly; every change is reviewable and undoable (BRIEF 13.3, R-157).
3. No key means a "not set up" state, not an error.
4. Browser-direct calls may be blocked by CORS (UNKNOWN per provider).
5. A custom endpoint (a local model server) must be possible without editing code.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Adapter per provider, two transports (direct, proxy through the user's server), proposals as operations | Chosen | Chosen |
| B. Always proxy | One path, key never in page requests to third parties | Rejected as the only path: forces a server for AI (Objection 2), though kept as the `relay` transport |
| C. Always direct | No server | Rejected as the only path: CORS unknown, and some providers want the key out of the browser |
| D. A single OpenAI-compatible interface only | Smallest | Superseded by ADR-0606: the OpenAI-compatible family is one of two, beside Anthropic Messages |
| E. Model writes tool calls that edit the document | Direct tools | Rejected: unreviewable; A10 |

## Decision

`AiTransport` with two transports, `direct` (the AiWorker calls the provider) and `relay` (the AiWorker calls the iynk server's `POST /v1/ai/relay`, operation `aiRelay`, ADR-0612). Each provider profile carries `via: 'direct' | 'relay' | 'auto'` (AI_ARCHITECTURE 9.1, ADR-0600); a server-held key is a relay mode, not a third transport. Adapters follow ADR-0606: two families, Anthropic Messages and OpenAI-compatible chat (which covers Meta's and Gemini's compatibility endpoints, OpenAI, Groq, OpenRouter and local servers such as Ollama), behind one interface with a capability descriptor and no hard-coded default model (the founders' Meta and Gemini defaults in `src/lib/server/ai/provider.ts` are removed; the OpenAI-compatible request code there is reused). Keys live in the IndexedDB `keys` store and are read only by the AiWorker. The relay (ADR-0612) is stateless and forwards one call per request: body `{profile: {family, baseUrl}, path: "chat" | "models", body}`, the person's key in the `X-Iynk-Provider-Key` header (used for that call, never stored, never logged), device bearer token required, target host on the allowlist, private addresses refused after DNS unless the operator names the host, no redirects, request body capped at 1 MiB and 120 s (ADR-0612 and openapi; AI_ARCHITECTURE 9.3 says 256 KiB, a mismatch recorded in the review log), and no request or response body logged. It exists only when the operator sets `IYNK_AI_ENABLE=1`, and `IYNK_DISABLE_AI=1` turns it off (`501 feature_disabled`). Usage per day goes to `usage`. Before COLLAB the same handler is a temporary Next route `/api/ai/relay` gated by `IYNK_SERVER_TOKEN` (AI_ARCHITECTURE 9.3). The model gets a fenced read-only snapshot at revision N and read-only tools, and returns `ProposalOps{baseRevision, ops[]}`. The client dry-runs on a copy, shows a diff card, applies on Accept as one batch (`author.kind = 'ai'`, `author.proposal`), and refuses a stale base with a message. CSP `connect-src` lists the adapters' origins, the server origin and `IYNK_CONNECT_ORIGINS`.

## Technical justification

Making AI a producer of operations reuses the validation, undo, attribution and room-ordering that humans already pass through, so there is no second write path to secure. Adapters isolate provider differences; transports isolate the CORS question.

## Performance data

None measured for iynk. Model choice, cost and prompt-cache hit rate are PENDING RS-11 (exit: cheapest model at least 90 percent of the top score; at least 80 percent of prefix tokens read from cache). Token and call counts are local (R-008).

## Cost implications

Paid by the person's own key; the operator's server adds none unless the operator sets a server-side key for their own use. No cost to the project.

## Licensing

Provider terms apply to the person's account. Whether a provider's terms allow browser-embedded keys is UNKNOWN. The audience decision RS-02 (age) is shelved with D-004.

## Security implications

Prompt injection from file text, search results and chat is handled by fencing, no write tool, dry run and an Accept click (F-112, R-159). The `ask_peer` tool that wrote into a room is not carried over. A key in browser storage is exposed to any script on the origin (CSP is the control). The relay never logs keys or bodies (AR-13 scans for them).

## Reversibility

High. Transports and adapters are interfaces; swapping a provider is one module plus a test set. Removing the relay leaves `direct` profiles working.

## Migration plan

B0: keys store, settings field, temporary relay route `/api/ai/relay` (R-010, ADR-0612). COLLAB: the relay becomes `POST /v1/ai/relay` in `server/`. AI: `src/ai` replaces `src/lib/ai`; evaluation set per RS-11.

## Known limitations

CORS per provider UNKNOWN (AX-02). Local model quality is untested. A stored key is unencrypted at rest in IndexedDB; a passphrase wrap is a HYPOTHESIS. MCP clients cannot see browser-only projects (Objection 6).

## Review fixes (2026-10-27)

| # | Issue | What was done |
|---|---|---|
| 1 | Two proxy designs (`POST /v1/ai/{provider}/stream`, `IYNK_AI_PROXY`, `ProxyTransport`) against ADR-0612 and openapi `/ai/relay`; Meta and Gemini adapters against ADR-0606 | Applied. Decision now names `POST /v1/ai/relay` (`aiRelay`), the `{profile, path, body}` body, `X-Iynk-Provider-Key`, the allowlist and no body logging, `via: direct | relay | auto`, and `IYNK_AI_ENABLE`. Adapters point to ADR-0606 (two families, no default model). Transport name `ProxyTransport` became `relay`. `SYSTEM_ARCHITECTURE.md`: stale route row `POST /v1/ai/{provider}/stream` deleted from 9.2 (the `aiRelay` row already stood there); env row `IYNK_AI_PROXY` changed to `IYNK_AI_ENABLE`; 6.8 names the `via` field and ADR-0612. `BACKEND_ARCHITECTURE.md`: the route table row already read `/ai/relay`; 10.2 and 10.3 renamed `proxy` to `relay`. |
| 1a | Noted, not fixed here | ADR-0612 decision item 1 writes `/api/ai/relay`, which is the temporary B0 path only; the final path is `/v1/ai/relay`. AI_ARCHITECTURE 9.3 says 256 KiB request cap, ADR-0612 and openapi say 1 MiB. Both are in files this pass does not own; the ADR-0612 owner should settle the number. |
