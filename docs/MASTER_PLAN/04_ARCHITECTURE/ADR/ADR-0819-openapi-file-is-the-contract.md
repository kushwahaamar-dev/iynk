# ADR-0819: openapi.yaml is the contract, served at /v1/openapi.json

Status: proposed, 2026-10-27. Author: API contracts design seat.
Reconciles with: ADR-0420 to 0430 (backend). Upstream: BRIEF 19.5, F-167. Downstream: AC-API-01, AC-API-05, AC-API-18. Spec: API_CONTRACTS sections 14, 15.

## Problem

Two descriptions of the API (handler validation in code and a document) drift. Today the OpenAPI document is generated from the MCP tool registry only.

## Constraints

1. One source of truth for request and response shape.
2. The file must be checkable in CI.

## Considered options

| Option | Verdict |
|---|---|
| A. `openapi.yaml` is the contract; handler validation must match it; CI checks | Chosen |
| B. Generate the document from handlers (current `openApiDocument`) | Rejected: it covers only the MCP tools |
| C. Two hand-written descriptions | Rejected: drift |

## Decision

The YAML is served unchanged at `/v1/openapi.json` (AC-API-18 compares hashes). Which direction generates which (validators from the file, or the file from zod schemas) is for the backend seat under ADR-0420 to 0430; whichever is chosen, AC-API-05 must pass.

## Technical justification

A contract test driven from the file catches drift in either direction.

## Performance data

None measured. AC-API-01 ran once on an earlier version of the file (0 errors, 31 warnings, all in sibling schemas); it must be re-run after the review changes.

## Cost implications

Build-time tooling only.

## Licensing

Tool licences not checked (UNKNOWN).

## Security implications

The served document describes public and authenticated routes alike but contains no secret; it is public by design.

## Reversibility

High.

## Migration plan

Replace `src/lib/server/mcp/openapi.ts` output with the bundled file when the server package is created.

## Known limitations

The YAML and `API_CONTRACTS.md` can still disagree in prose; the last section of that file lists the open deltas.
