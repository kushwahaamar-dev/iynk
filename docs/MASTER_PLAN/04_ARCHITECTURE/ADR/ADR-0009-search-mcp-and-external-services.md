# ADR-0009: Search, MCP and other external services

Status: proposed, 2026-10-27. Author: system architecture seat.
Upstream: D-015; R-007, R-008, R-011; F-154, F-155, F-157, F-158, F-167, F-194; SECURITY_BASELINE C1 to C6, M1; `ai-search-mcp.md` refactoring 4, 7.
Downstream: `SYSTEM_ARCHITECTURE.md` 6.11, 6.16, 9.2.

## Problem

Search (SerpApi) and MCP are server routes on the operator's key with CORS `*` on MCP and OpenAPI, a per-process counter that resets on restart, and a 429 mapping that hides quota exhaustion. Opening Lab tools spends quota by itself. With local-first projects, an MCP server cannot see a project that lives only in a tab.

## Constraints

1. The key is the person's; it is not stored by the server (R-011).
2. Nothing fires on opening a page (R-011).
3. MCP is key-gated and never `*` (R-007).
4. The key must not appear in a URL that a proxy or history can record.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Search through the user's server; key in a header; server builds the provider URL | Chosen | Chosen |
| B. Browser-direct search | No server | Rejected for SerpApi: key is a query parameter (EXTERNAL convention); CORS UNKNOWN |
| C. Bundle a search key | Works out of the box | Rejected: D-015 |
| D. MCP exposes everything including projects | Rich | Impossible for browser-only projects; a tab-to-MCP bridge is a HYPOTHESIS, LATER |
| E. Drop MCP | Smaller | Rejected: F-167 is `AI` phase; stateless tools are still useful |

## Decision

`POST /v1/search/{kind}` with `X-Search-Key`, enabled by `IYNK_SEARCH_PROXY=1`; results cached in `kv_cache` with a TTL; the per-day counter is in `usage`, so a restart does not reset the cap. Fan-out defaults to one engine. 429 and `quota_exhausted` stay distinct. MCP at `POST /mcp` with a key from `iynk-server mcp-key`; tools: `search_catalog`, `get_item`, `drone_calc`, `price_parts` (uses the caller's search key), `validate_project` (a document passed in), and read tools over server-held shares and room snapshots. `plan_build_night` and `get_passport` are deleted (D-016); `create_room` becomes invite-based or is dropped.

## Technical justification

Putting the provider call on the user's server keeps the key out of URLs the browser records and gives one place to count and cap. Stateless MCP tools work without browser state.

## Performance data

SerpApi results are cached; hit rate UNKNOWN. The audit measured the old quota behaviour (opening Lab tools spent quota; one 12-part check used a measurable share), not a new design.

## Cost implications

The person's own search plan. The operator pays nothing.

## Licensing

SerpApi terms are the person's. MCP SDK `@modelcontextprotocol/sdk` 1.32.2 is already a dependency (`package.json`); its licence is EXTERNAL and unchecked here.

## Security implications

Closed CORS; key discarded after each call; MCP key hashed at rest; tool output to a model is fenced by the AI client. Search text is untrusted (A3).

## Reversibility

High. Each provider is an adapter behind the route.

## Migration plan

B0: route closed or keyed (R-007), `quota_exhausted` mapping fixed. COLLAB: moved to `server/`. AI: MCP tools revised.

## Known limitations

No search without a server (until AX-02 shows a provider that allows it). MCP cannot read browser-only projects.
