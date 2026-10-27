# ADR-0810: REST and JSON under /v1 with one error envelope, cursor pages, idempotency keys and ETags

Status: proposed, 2026-10-27. Author: API contracts design seat.
Upstream: BRIEF 19.5, D-015, ADR-0420, ADR-0006, SECURITY_BASELINE section 3. Downstream: every route in `schemas/openapi.yaml`, F-012, F-167, F-199. Spec: API_CONTRACTS sections 3, 4.

## Problem

The server needs one API style that the app, the user's own scripts and MCP clients can use, that fits the 23 existing REST routes, and that can be linted and tested. The first draft used the prefix `/api/v1`, which the Caddy routes of ADR-0006 would have sent to the web container, not the server.

## Constraints

1. The server is a separate Node process serving `/v1/*` and `/v1/ws` (ADR-0420); the web app has no API routes.
2. Works over flaky links on low-end devices (D-011).
3. Machine-checkable (BRIEF 19.5 asks for contracts).
4. Existing UI picks translated text by error `code`, so the old `{error:{code,message}}` shape must stay valid.

## Considered options

| Option | Verdict |
|---|---|
| A. REST and JSON, OpenAPI 3.1, path version `/v1` | Chosen |
| B. GraphQL | Rejected: every part of this API is resource-shaped and the existing routes are REST |
| C. tRPC or another TypeScript-only RPC | Rejected: locks out scripts and MCP clients |
| D. gRPC-web | Rejected: needs a proxy and tooling for no gain at friends scale |
| E. No version prefix | Rejected: a breaking change then has nowhere to go |
| F. Prefix `/api/v1` | Rejected: the proxy sends only `/v1/*` to the server (ADR-0006) |

## Decision

1. Base `{origin}/v1`. A breaking change is `/v2` beside v1 for one minor release with `Deprecation` and `Sunset` headers.
2. Minor version in `Iynk-Api-Version`; additive changes only inside v1.
3. One error envelope (`error.code`, `message`, `requestId`, `details[]`) that is a superset of today's.
4. Cursor lists, `Idempotency-Key` on creating POSTs, `ETag` and `If-Match` on documents (ADR-0813, ADR-0814).
5. The socket is `wss://host/v1/ws`; its frames are REALTIME_ARCHITECTURE's.
6. Probe `GET /v1/server`, liveness `/v1/healthz`, readiness `/v1/readyz`, OpenAPI `/v1/openapi.json`.

## Technical justification

REST maps one-to-one to the resources in API_CONTRACTS section 7. OpenAPI 3.1 gives a linter (AC-API-01), generated contract tests (AC-API-05) and the document F-167 wants. The prefix removes the clash with Next's own `/api` space and with the proxy rule.

## Performance data

None measured. Targets are ESTIMATED in AC-API-20 (`GET /server` under 2 KB; a 50-item page under 30 KB gzip). No spike covers HTTP overhead; RS-09 measured the op log, not this API.

## Cost implications

No hosted service. One Node process the friend group already runs. Engineering cost: a route registry and a contract test harness, ESTIMATED at days, not weeks.

## Licensing

OpenAPI 3.1 is an open specification (EXTERNAL, not re-fetched). Linter `@redocly/cli` and test tool Schemathesis are build-time only; their licences were not checked (UNKNOWN until the build adopts them).

## Security implications

Default-deny route registry (R-007). A JSON endpoint refuses other content types (415), which stops simple cross-site form posts. Origins are an allow-list; no `*` CORS. Error bodies carry no upstream text or stack.

## Reversibility

Medium. Changing the style needs a `/v2`; changing fields inside v1 is additive. The prefix is one constant in the client and the proxy.

## Migration plan

Today's 23 `src/app/api/**` routes map per API_CONTRACTS section 12: 8 versioned (3 gated, 5 search), 4 replaced by new resources, 2 kept unrouted, 9 deleted or retired (23 in all). Removed routes return a plain 404, no redirects.

## Known limitations

No implementation exists. GraphQL-style field selection is not offered, so a client downloads whole records. Only one process is supported, so there is no cross-process rate limit.
