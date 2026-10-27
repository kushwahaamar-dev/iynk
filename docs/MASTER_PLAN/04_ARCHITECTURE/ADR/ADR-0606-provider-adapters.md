# ADR-0606: One adapter interface with a capability descriptor; two families cover the field; local models are first-class

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: D-015; F-193, F-111; R-153, R-154; audit D14; `src/lib/server/ai/provider.ts`; platform-options 7. Spec: AI_ARCHITECTURE section 9.

## Problem

The audited provider layer is OpenAI-compatible fetch with Meta and Gemini fallbacks on server keys; model ids are env strings with no startup check (D14).

## Constraints

1. Vendor neutral; the person brings the key.
2. At least one local-model option if feasible.
3. Usage must include cached tokens for the ledger.
4. Providers differ in tool calling, caching and CORS.

## Considered options

| Option | Verdict |
|---|---|
| A. A third-party AI SDK | Rejected: adds bundle weight; the fetch client is tested (`provider.test.ts`) |
| B. Own adapter interface, families `anthropic` and `openai-compat` | Chosen |
| C. One family only | Rejected: Anthropic caching is explicit and its tool format differs |

## Decision

1. `ModelAdapter` with `stream()` and `AdapterCaps` (tools native, json-text or none; parallel tools; usage in stream; prompt cache explicit, implicit or none; context and output limits; browser-direct yes, no or unknown; privacy local or cloud).
2. Normalised events: text, tool_call (complete JSON), usage (in, cache read, cache write, out), done, error with a fixed code set.
3. Provider profile stored with the key; model ids come from the provider's model list; no model name is hard-coded as a default.
4. A ten-check conformance run (C1 to C10) fills `caps` and gates features per profile.
5. Local servers use the OpenAI-compatible family at loopback addresses; tool-less degrade path for small models.
6. A `webgpu` family can be added later (F-115) without interface change.

## Technical justification

The existing client already reads `prompt_tokens_details.cached_tokens`, assembles streamed tool calls and retries with backoff; moving it behind an interface keeps tested code.

## Cost implications

Conformance run about 10 small calls (ESTIMATED under USD 0.01).

## Security implications

Local base URLs may be http only for loopback; cloud must be https. A profile cannot set arbitrary headers beyond an allowlist.

## Reversibility

Adapters are replaceable behind the interface.

## Known limitations

Cloud preset URLs and local default ports are EXTERNAL until the conformance run passes. Local model quality is a HYPOTHESIS (Q5).
