# ADR-0001: A modular monolith in the existing repository, with enforced module boundaries

Status: proposed, 2026-10-27. Author: system architecture seat.
Upstream: BRIEF 19 (modular monolith first), D-010, D-013, D-015; TECHNICAL_DEBT A2, A6, Part D; `SYSTEM_ARCHITECTURE.md` sections 5 and 15.
Related: ADR-0014, ADR-0400.
Downstream: ADR-0014, ADR-0003, every domain in `SYSTEM_ARCHITECTURE.md` section 6; AR-02, AR-03.

## Problem

The code works but its layers leak. `src/lib` imports `@/components` in 25 files (28 type-only import lines, TECHNICAL_DEBT A2, VERIFIED by the reviewer). The circuit solver reads figure globals. Four systems each invent their own way to change a lab (D5). New work (project core, Studio, a server, an AI partner, robotics, drones) will add more modules. Without rules they will import each other freely, and the simulation, which must be deterministic and run in a Worker, cannot afford hidden dependencies on React or the DOM.

## Constraints

1. Stay in the existing Next.js repository; no microservices unless a workload justifies one (BRIEF 19).
2. Simulation code must run in a Worker and in Node tests, with no DOM and no wall clock (SA-11).
3. The optional server must reuse the project document logic so one definition of a valid operation exists (ADR-0104).
4. Preserve working code until a replacement is measurably better (BRIEF 3.5).
5. A solo maintainer plus agents: rules must be checked by machines, not by review.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Module families with a one-way import matrix, enforced by lint and a test; six families "portable" | Boundaries in one repo | Chosen |
| B. Separate npm packages per module (full monorepo) | Hard boundaries, own `package.json` each | Rejected for now: adds versioning and build wiring for one team; revisit if a module needs an independent release |
| C. Microservices (simulation service, project service, AI service) | Network boundaries | Rejected: simulation must be local-first (K-LOCAL); the project service would be a database wrapper for a file; no workload needs its own deployment (section 5.1) |
| D. Keep `src/lib/*` as it is and add folders | No rules | Rejected: this is how A2 happened |

## Decision

The module map of `SYSTEM_ARCHITECTURE.md` 5.2 is the only list of modules: `core`, `protocol`, `project`, `parts`, `sim`, `sim-host`, `local`, `export`, `studio`, `ai`, `collab`, `server-client`, `labs (legacy)`, `content`, UI, plus `server/` for the optional server. The import matrix in 5.3 is the rule. `core`, `protocol`, `project`, `parts`, `sim` and `export` are portable (no `react`, DOM, `window`, `node:`; relative imports with `.ts`; erasable syntax). The server imports portable modules only. This ADR owns the module list and the matrix; ADR-0400 only adds the ESLint lint zones and the import-reading test for that list (it adds no module and no edge), and ADR-0014 owns the toolchain for portable code. The units and the canonical-JSON and hash code live once in `src/core`; `sim/core` imports them.

## Technical justification

The matrix follows the data flow: the document (`project`) is the lowest shared concept; engines (`sim`) read it; the editor, persistence, AI and collaboration all change it only through `apply`. That makes the audit's single largest structural fix (one revision-safe action protocol, D5) a consequence of the layout instead of a convention. The sim lint rule SA-11 (no `Date.now`, `Math.random`, `eval`, dynamic `import` in `sim/*`) is easy to state because `sim` is already a folder with no UI neighbours.

## Performance data

None needed: this is a source-code rule with no runtime cost. The portable rule enables measured placements elsewhere (workers, server) without copying code.

## Cost implications

One-time: moving files (section 15, X2 to X6) and writing `src/architecture.test.ts`. Ongoing: none. No paid service.

## Licensing

No new dependency. ESLint `no-restricted-imports` is built in (EXTERNAL, MIT).

## Security implications

The portable boundary is a security control: the server cannot accidentally import browser code that reads `window` or `localStorage`, and sim code cannot read the wall clock or network. It makes "the server runs data, not code" auditable by import graph (`SYSTEM_ARCHITECTURE.md` 7.2 item 4).

## Reversibility

High. Rules are lint configuration plus one test. Folders can be promoted to packages later (option B) without changing import paths if the aliases are kept.

## Migration plan

X2: create `src/core` and `src/project`, add the test with an allow-list of today's violations, then shrink the list as modules move; the list must be empty at the end of CORE (AR-02). The 28 type-only imports move with the types into the lower layer.

## Known limitations

An import-graph test does not stop a module from reaching the DOM through a global; the portable `tsconfig` (ADR-0014) removes the DOM lib for those folders to catch that. The matrix will need small amendments as modules land; amendments go in this ADR, with a date.

## Review fixes (2026-10-27)

1. [medium] Module list without `protocol`, and two ADRs claiming authority over boundaries. Applied. Checked `SYSTEM_ARCHITECTURE.md` 5.2 and 5.3 and ADR-0400 (already revised to use the 5.2 names, with `protocol` as an added row). Changes: added a `Related: ADR-0014, ADR-0400` line; replaced "ten module families" with the exact 5.2 list, which adds `protocol`, `labs (legacy)` and `server/`; corrected "five portable" to six (`protocol` added, as in 5.2 and the SYSTEM ADR index); stated that ADR-0400 only adds lint zones and the test, and ADR-0014 owns the toolchain. No module name outside 5.2 remains. Removed the stale "ten more modules" count.
