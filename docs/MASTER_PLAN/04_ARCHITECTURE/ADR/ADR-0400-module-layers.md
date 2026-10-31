# ADR-0400: Frontend code uses the SYSTEM module map and import matrix, enforced by lint and a test

Status: proposed, 2026-10-27, revised after review the same day. Author: frontend and backend architecture seat.
Upstream: A2 (28 type imports from components into lib), B4-07, B7-07, D-010, SA-11, SYSTEM_ARCHITECTURE 5.2 and 5.3 (ADR-0001), ADR-0014. Downstream: F-180, F-203, every later phase. Spec: FRONTEND_ARCHITECTURE section 4.

## Problem

Logic and UI are mixed in `src/lib` and `src/components`: `lib/boardlab/store.ts` imports from `components/dock`, `src/lib/server` holds 78 files of data, AI, MCP, search and Solana. The server must import the same project code as the browser (ADR-0430), so the pure parts have to be provably free of browser globals. An earlier draft of this file invented its own layer names, which disagreed with SYSTEM ADR-0001 and would have put the lint zones, FA-02 and BACKEND's `#core/*` imports on different directories.

## Constraints

1. The server imports `core`, `project`, `parts` and `protocol`; they must run in Node with no DOM.
2. Simulation code must be free of wall clock and `Math.random` (SA-11, DET-5).
3. Working lab code is preserved until its phase (BRIEF 3.5); nothing is moved in one big change (CLAUDE.md: phases of at most 5 files).
4. Contributors and agents need a rule they can check, not a convention.
5. One module map for the whole plan: the names are SYSTEM 5.2, the matrix is SYSTEM 5.3.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Convention and review | Document the rule in CONTRIBUTING | Rejected: the audit's 28 violations came from exactly that |
| B. Monorepo with workspace packages | `core`, `sim`, `server` as npm workspaces | Rejected for now: adds build and publish machinery for one maintainer; reversible later because the directory boundaries are the same |
| C. A frontend-only layer scheme (`core`, `sim`, `host`, `studio`, `app`) | The first draft of this ADR | Rejected on review: it conflicts with SYSTEM 5.2 on where `apply`, validators, netlist, IndexedDB, collab and AI live |
| D. SYSTEM module map and matrix, plus lint zones, an import-reading test and a Node-only Vitest project | `src/core`, `project`, `parts`, `sim`, `sim-host`, `local`, `export`, `studio`, `ai`, `collab`, `server-client`, `content`, UI, `labs (legacy)`, plus `protocol` | **Chosen** |

## Decision

1. The browser app uses the module names and paths of SYSTEM 5.2 and the allowed imports of SYSTEM 5.3. FRONTEND section 4.1 maps each frontend concern to a module: ids, units, canonical JSON and hash to `core`; `ProjectSession`, `apply`, validators, migrations and netlist to `project`; wire types and the RPC envelope to `protocol`; worker hosts to `sim-host` and `local`; room client to `collab`; stores, commands, tools and the editor engine to `studio`; wiring to UI.
2. One row is added to the SYSTEM matrix: `protocol` imports `core` only and is imported by `sim-host`, `local`, `collab`, `server-client`, `ai`, UI and `server`.
3. ESLint `no-restricted-imports` zones and `src/architecture.test.ts` (SYSTEM AR-02) forbid every import the matrix does not allow; `core`, `project`, `protocol`, `sim`, `export` forbid DOM, `react`, `next`, `Worker`, wall clock and randomness.
4. A Vitest project `pure` runs the portable modules and `server` with `environment: node`.
5. New code goes into the new modules; old modules move when their phase starts, with the type moved down first and a re-export left at the old path for one release.

## Technical justification

SYSTEM 5.4 ran a `.ts` file with relative `.ts` imports on Node 24.8 with no flag and no build step (VERIFIED, scratch run), so portable folders can be shared by the server, workers and the page unchanged. A single map removes the translation step between the frontend, backend, simulation and data-model documents. Wiring (joining `DocStore`, `Repository`, `Authority` and `SimHost`) is confined to UI, so the matrix has no sideways edges between `studio`, `local`, `collab` and `sim-host`.

## Performance data

None needed at run time: the rule is a build-time and test-time check. Measured facts that motivate it: 28 type-only imports from `components` into `lib` across 25 files (VERIFIED, TECHNICAL_DEBT A2). UNKNOWN: run time of `architecture.test.ts` over the whole tree; it must stay inside the 30 s target of `npm run test:core` (ESTIMATED target, FRONTEND section 13).

## Cost implications

No new dependency: ESLint core rules and Vitest are installed. The cost is effort at FE-0 to create the directories with a README and write the zone list from the matrix, and a small ongoing cost when a module pair is legitimately added (edit one table and one config). Effort is not estimated here, as FRONTEND section 14 says.

## Licensing

ESLint 9.39.5 (MIT) and Vitest 5.0.3 (MIT), both read from the installed packages. No code is copied from a third party.

## Security implications

The boundary keeps browser-only capabilities (IndexedDB keys, `window`) out of code the server runs, and keeps `server/` from importing `src/local` or `react` (SYSTEM 5.3 rule 4). The matrix lets `ai` read keys only through `local`, which gives one place to audit key handling (R-010). It is not a sandbox: first-party code in any module can still reach same-origin storage (SYSTEM 7.2).

## Reversibility

High. The modules are directories in one package. Moving to workspaces later keeps the same boundaries. Removing the lint zones changes no runtime behaviour.

## Migration plan

FE-0 creates the module directories and the lint and test enforcement with the `protocol` row. Each later phase moves its code with the type first and a re-export at the old path for one release (SYSTEM 15.1 lists every move). The 28 type imports reach zero by the end of CORE (SYSTEM 5.3 rule 1). A move is a separate commit from a rewrite.

## Known limitations

- ESLint and a static import reader do not see `import()` with a computed string or `require` of a variable; those need a separate grep in the test.
- The matrix cells marked "(types)" need the test to tell `import type` from a value import; lint alone cannot.
- SYSTEM 5.3 does not yet have the `protocol` row, and BACKEND section 14 lists `#core/*` and `#protocol/*` but not `#project/*` or `#parts/*` (FRONTEND Objection 7).
- A contributor can still put the wrong code in the right module; the matrix limits imports, not content.

## Review fixes (2026-10-27)

| # | Issue | Action |
|---|---|---|
| 1 | [high] Missing Technical justification, Performance data, Cost, Licensing, Security implications, Migration plan, Known limitations | Checked the heading list of this file against BRIEF 19.6. All seven sections are already present, under the BRIEF's own names ("Cost implications", "Reversibility", which replace the template names "Cost" and "Reverse if"). No heading was missing, so no section was added. Content was re-read: Performance data states there is no run-time cost, cites the 28 type imports (TECHNICAL_DEBT A2, VERIFIED) and marks the `architecture.test.ts` run time UNKNOWN against the 30 s `test:core` target (FRONTEND section 13, ESTIMATED). No benchmark was invented. The same issue for ADR-0401 to 0409 and 0420 to 0430 belongs to the agents who own those files. |
