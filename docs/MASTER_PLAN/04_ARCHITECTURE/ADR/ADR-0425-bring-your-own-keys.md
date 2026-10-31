# ADR-0425: Keys in the browser; direct and relay transports; SSRF-guarded relay

Status: proposed, 2026-10-27. Author: frontend and backend architecture seat.
Upstream: F-193, F-194, R-010, R-011, C1 to C5, A1 to A7, D-015. Downstream: F-105, F-111, F-154, F-167. Spec: BACKEND_ARCHITECTURE section 10. Related: ADR-0008 and ADR-0612 (the system and AI seats' records of the same custody and relay rules; AI_ARCHITECTURE 9.3 is the relay contract).

## Problem

Nothing may depend on Amar's paid keys. Providers differ on browser CORS. A relay that fetches for a client is a server-side request forgery surface.

## Constraints

1. A key never enters a project, export, share, room, log or telemetry.
2. The app works with no key and says how to set one up.
3. A buddy using the host's server sends their key through the host's machine; the UI says so.
4. Provider browser support is UNKNOWN until tested.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Server-held keys only |  | Rejected: puts every buddy on the host's key |
| B. Browser-held keys, direct only |  | Insufficient: some providers block browsers |
| C. Browser-held keys with a `direct` and a `relay` transport | the relay can use a per-request key or, when the operator sets one, a server-held key | **Chosen** |

## Decision

1. Keys live in IndexedDB `keys`, read only by the `ai` worker; optional passphrase wrap.
2. `ProviderTransport` picks `direct` or `relay` from the capability probe and a tested provider table. The names are those of AI_ARCHITECTURE 9.2. A server-held key is a mode of `relay`, not a third transport.
3. The relay is `POST /v1/ai/relay` with the body of AI_ARCHITECTURE 9.3 (`{ profile: { family, baseUrl }, path, body }`) and the key in `X-Iynk-Provider-Key`.
4. Relay controls: allow-listed hosts, resolved-address checks (no private, loopback, link-local, multicast), no redirects, request at most 256 KiB, response at most 8 MiB, 120 s, header allow-list. `IYNK_AI_RELAY_ALLOW_PRIVATE=1` allows loopback and private addresses only for a host that is also on `IYNK_AI_ALLOWED_HOSTS`; the link-local range stays refused.
5. Server-held keys come from the environment or `_FILE`, with per-device daily caps, off by default.

## Consequences

- The relay needs its own hostile tests (BA-15).
- Prompt and tool orchestration are specified in the AI phase.
- AI_ARCHITECTURE 9.3 and `openapi.yaml` state 1 MiB for the request; they are to be changed to 256 KiB.

## Technical justification

Browser-direct keeps the key out of any server and needs no deployment, but whether a provider answers browser origins is a per-provider fact (F-193 says UNKNOWN; Anthropic needs an opt-in header and a local Ollama needs its allowed-origins setting, both EXTERNAL and not re-fetched). A relay on the user's own server closes the gap for providers that block browsers and for local servers the browser cannot reach. Two transports behind one adapter keep the rest of the AI code unaware of the path. The SSRF controls are the minimum for a route that fetches caller-named URLs: a name check, a check of the address the name resolves to, and a connection to that address so DNS cannot change between check and use.

## Performance data

Not measured. The relay streams the provider's body without buffering, so added latency should be one extra hop plus TLS to the provider (HYPOTHESIS). The AI conformance run (AI_ARCHITECTURE 9.4) is where first-byte time through the relay is recorded. UNKNOWN until then.

## Cost implications

ESTIMATED 3 to 5 days for the relay, the address guard and the hostile tests, assuming the existing `provider.ts` retry and SSE code is reused (judgement). Provider usage is paid by whoever owns the key: the user for a per-request key, the operator for a server-held key. No cost to the project.

## Licensing

No provider SDK is used; calls are plain `fetch`. `@modelcontextprotocol/sdk` (already a dependency) is used only by the MCP module and its licence was not re-checked here (UNKNOWN until the AI phase). Provider terms of use for relaying a user's key through a third machine are not checked (UNKNOWN).

## Security implications

Closes C1 and C2 (no free proxy on the founders' keys), C3 and C4 (persisted budgets, MCP behind a token), and the SSRF risk of the relay itself (BA-15). The key is held in memory for one call and never logged (BA-09). Residual: script on the app's origin can open the same IndexedDB, so CSP is the real defence; a buddy's key transits the host's machine in relay mode; the `IYNK_AI_RELAY_ALLOW_PRIVATE` switch widens the reach of anyone who can call the relay to the named private hosts.

## Reversibility

High. The adapter hides the transport. Reverse if RS-11 or provider tests show direct calls work everywhere: keep the relay only for streaming policies, or drop it.

## Migration plan

AI-0 (inside B0): keys store and settings, adapter, relay with allow-list, removal of the shared Meta and Gemini keys, with the current partner kept working on the new adapter. BE-4 moves the relay and the search module into `server/src/modules/` and adds persisted usage.

## Known limitations

Which providers allow direct calls is UNKNOWN. The 256 KiB request limit may be too small for a large project context; the AI phase raises it with a measurement if so. Passphrase wrap costs a prompt per session. The relay cannot rewrite a mid-stream provider error.
