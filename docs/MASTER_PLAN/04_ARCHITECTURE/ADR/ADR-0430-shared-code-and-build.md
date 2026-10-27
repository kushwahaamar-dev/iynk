# ADR-0430: Share `core` and `protocol` source with the server through Node type stripping

Status: superseded by ADR-0014 (repository layout, three-entry imports map, toolchain), 2026-10-27, review fix. Kept for the record; the live decision and its twelve sections are in ADR-0014. Author: frontend and backend architecture seat.
Upstream: ADR-0400, ADR-0110, Node 24.8 check, R-078. Downstream: F-199, F-203. Spec: BACKEND_ARCHITECTURE section 14 (server-side detail).

## Problem

The server must run the same `apply` and validators as the browser. A separate compile step for the server adds a tool and hides stack traces.

## Constraints

1. No `eval` in validators (standalone Ajv).
2. One production dependency on the server (`ws`).
3. The web app's bundler must accept the same sources.
4. `@/` aliases do not work in Node.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Node type stripping with `#core/*` subpath imports | Ran a `.ts` file with no flag and no warning on 24.8 (VERIFIED) | **Chosen** |
| B. `esbuild` bundle | One new dev dependency | Fallback if BA-02 fails |
| C. `tsc` emit | Extra output tree | Rejected |

## Decision

1. Root `package.json` `imports` map `#core/*` and `#protocol/*` (ADR-0014 adds `#project/*`).
2. `server/tsconfig.json` sets `erasableSyntaxOnly` and `allowImportingTsExtensions`.
3. Validators are generated Ajv standalone modules.
4. Production image runs `node server/src/main.ts` with `ws` only.

## Consequences

- Check BA-02 must pass before BE-1 closes.
- Enums, namespaces and parameter properties are forbidden in shared code.

## Reverse if

Turbopack rejects `.ts` extension imports or type stripping becomes unstable. Then build the server with `esbuild`.

## Review fixes (2026-10-27)

| Issue | What was done |
|---|---|
| 11 [medium] Eight required headings missing | Not applied to this record. ADR-0014 states that it supersedes this ADR and already carries all twelve headings (read: its Decision 5 replaces the two-entry imports map, its Technical justification repeats the Node 24.8 `.ts` check). Expanding a superseded record would create a second copy to keep in step. Status line changed as ADR-0014's review note asked; the entry-point path is now `server/src/main.ts` (issue 9). |
