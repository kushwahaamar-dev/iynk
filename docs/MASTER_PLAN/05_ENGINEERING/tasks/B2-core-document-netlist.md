# Build phase B2: Project core, document and netlist (task packages)

Written 2026-10-27 for the build plan. Plan only: nothing in `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed to write this file, and nothing was committed.
Phase card: `05_ENGINEERING/IMPLEMENTATION_ROADMAP.md` section "B2" (lines 298 to 342). This file replaces its task table with full packages and keeps its ids T-B2-01 to T-B2-16. Six tasks are added (T-B2-17 to T-B2-22); the reasons are in section 1. The review of 2026-10-27 then split four tasks into lettered parts (08a and 08b, 11a and 11b, 12a and 12b, 20a to 20c); the last section lists every review fix.
Earlier task files: none exist (`05_ENGINEERING/tasks/` was empty). B0 and B1 are known only from the roadmap rows, so every B1 name used here (`src/lib/keys`, `src/server-client/probe.ts`, `.github/workflows/ci.yml`, `scripts/ci-local.sh`) is DOCUMENTED, not VERIFIED, and only appears as a dependency, never as a file B2 edits.
Labels: VERIFIED (read in code or a file, or run, in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN, PROPOSAL.

## 0. Phase summary

| Item | Value |
|---|---|
| Goal | One canonical project document, 64 operations with inverses, validation, hash, migrations, part descriptors, a netlist that does not read the drawing, and a catalogue converter. Headless: no storage, no worker, no UI. |
| Scope | F-076, F-077, F-078, F-083, F-097 (first descriptors); R-025 to R-034, R-052 (the parts of R-052 that need no worker, see section 6). |
| Not in B2 | IndexedDB, `.iynk` files, the `ProjectWorker`, RPC (B3); running a sketch (B3, B4); Studio, views, drawing (B4); `src/protocol` (B3-01); `opImpact.ts` (the Studio phase that wires `simLink`); custom parts, the other 11 board descriptors, the 22 remaining figure parts (B5, B11). |
| Depends on | B1. Nothing from B1 is imported by B2 code. |
| Tasks | 27 (16 from the roadmap, 6 added, 5 more from splitting four tasks into lettered parts, see "Review fixes" at the end). Effort: roadmap says best 5 / expected 7 / adverse 11 weeks (ESTIMATED); the added tasks are inside that range because they split work the roadmap already counted. |
| Exit gate | `npm run check` green; `npx tsc -p tsconfig.portable.json` green; `npm run schema:check` and the examples hash test green; converter report shows 38 of 38 items (or a named list Amar accepts); apply cost measured and written down. Then Amar's OK. |
| Build branch | `build/v1`, cut from `main`. One commit per task, authored as Amar Kushwaha, no `Co-Authored-By`, no "Generated with" line. Never push, never deploy. |

### 0.1 What I checked in the code (VERIFIED, 2026-10-27)

| Fact | Evidence |
|---|---|
| The repo has no `src/core`, `src/project`, `src/parts`, `src/protocol`, no `tsconfig.portable.json`, no `src/architecture.test.ts`, no `.github/` | `ls src` shows `app components content i18n lib`; `ls tsconfig*` shows `tsconfig.json` only |
| The root `tsconfig.json` has no `allowImportingTsExtensions` and includes every `**/*.ts` | `tsconfig.json:2-30` (options), `:31-38` (include), `:39-43` (exclude `docs/MASTER_PLAN`). Root options include `noEmit: true`, so `allowImportingTsExtensions` can be added |
| Root `ajv` is 6.15.0, a transitive dependency of ESLint; `ajv/dist/standalone` does not exist there. Ajv 8 is only in `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/tools/node_modules` | `node_modules/ajv/package.json`; `ls node_modules/ajv/dist/standalone` fails. `schemas/tools/package.json` pins `ajv` 8.17.1 |
| `json-schema-to-typescript` is not installed | `ls node_modules` |
| TypeScript 5.9.3, Vitest 5.0.3 (default environment `jsdom`), Node 24.8.0 | `node_modules/typescript/package.json`, `vitest.config.mts:9`, `node --version` |
| Vitest runs `src/**/*.test.{ts,tsx}`, `figures/**/*.test.{js,mjs,ts}`, `scripts/**/*.test.{js,mjs,ts}` | `vitest.config.mts:12` |
| `npm run check` is `content:check`, `typecheck`, `lint`, `test`, `e2e` | `package.json:23` |
| `eslint.config.mjs` ignores `docs/MASTER_PLAN/**` | `eslint.config.mjs:26` |
| `src/lib` has 39 import lines from `@/components` in 34 files; 1 line is not `import type` | `grep -rn "from ['\"]@/components" src/lib` |
| `project.schema.json` is `schemaVersion` 1.1, 80 `$defs`, `Op` has 64 `oneOf` branches. They split 13 + 22 + 29 (roadmap says 14 + 22 + 28) | `python3` over `$defs/Op/oneOf`; kinds listed in T-B2-05 to T-B2-07 |
| The schema has 22 id prefixes (`ast bdy brd cmp flt frm grp ins jct jnt lbl mnt net op par prj prp rtm src usr vw wir`). ADR-0102 says 20 | `grep` of `"pattern": "^xxx_` in `project.schema.json`. The schema decides (RECONCILIATION precedence R4) |
| The schema uses no `format` keyword, so `ajv-formats` is not needed | `grep '"format"'` finds none in `project.schema.json` or `component.schema.json` |
| The five project examples are all at `schemaVersion` 1.1 and `LicenseRef-iynk-pending` already (the working tree holds the reconcile edits, uncommitted). The roadmap task "update the two stale examples" is therefore already done | `python3` over `schemas/examples/*.project.json` |
| The monitor example checkpoint hash `097630ef...` is NOT reproduced by any simple rebuild. I tried three: faults `[]` gives `0986fe91...`, faults key absent gives `1b0aa54d...`, fault kept gives `c81a895e...` (all with the `source.edit` text removed). Final document hash `8e52bbe4...` does match the PDM 9.6 table | scratch script `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/h.mjs`, run with `schemas/tools/project-lib.mjs` |
| The canonical test vector in PDM 6.3 is right: canon string is 82 bytes, SHA-256 `726a7d3b30b104e1d8ff1dc2b8184d9855e408419492c85ce39981959c0bc7e1`, chain_0 for `prj_demo` is `6193a5a8...dd2f`, chain_1 `a150f3e2...dd7c` | same scratch dir, `v.mjs` |
| 29 files in `figures/parts/`; every one has a `legs:` field; `breadboard.js` has `legs: []`, so 28 have legs. PDM 3.4 says 27 (DOCUMENTED). `mpu6050.js:55` uses `legs: LABELS` with `LABELS` a const array at `:22`; the other 27 are literal arrays | `grep -n "legs:" figures/parts/*.js` |
| Figure circuits are plain objects passed to `B.board({...})`, `B.bench({...})`, `B.module({...})`, where `B.board = register('board')` | `figures/engine/bench.js:29`; `figures/boards/uno-r3.js:155-160` (`circuit: 'blink'`, `circuits: {...}`); `figures/robotics/l298n.js:118` (`B.bench({`), `:141` (`wires: [...]` with `W('J4.1','NANO.D8',...)`) |
| `node scripts/gen-content-index.mjs --emit board/uno-r3` prints 166 KB of JSON in 0.1 s | ran it; `scripts/gen-content-index.mjs:157-167` |
| Content i18n lives in `src/i18n/content/<lang>/{boards,robotics,drones}/<id>.json` for `en de es fr hi zh` | `ls src/i18n/content` |
| Node 24.8.0 runs `.ts` files that import `.ts` files with no flag (type stripping) | ADR-0014 (VERIFIED there); the same mechanism loads the content in `gen-content-index.mjs:126-129` |

### 0.2 Shorthand used in every task

| Name | Expands to |
|---|---|
| `TL` | `npm run typecheck && npm run lint` |
| `TP` | `npx tsc -p tsconfig.portable.json` (exists from T-B2-01) |
| `V <path>` | `npx vitest run <path>` |
| `BUILD` | `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL= NEXT_DIST_DIR=.next-build npm run build` (keyless, from `01_AUDIT/runs/COMMANDS.md`; after B0 and B1 some names no longer exist, drop those) |
| `GATE` | `npm run check`, run once per phase by T-B2-21 only (it runs the Playwright suite, which takes minutes) |

### 0.3 Rules that apply to every task

| Rule | Detail |
|---|---|
| Portable code | Files under `src/core`, `src/project`, `src/parts` (not `src/parts/browser/`) use relative imports that end in `.ts`, `import type` for types, no `enum`, no parameter properties, no `namespace`, no DOM, no `node:` import, no `Date.now`, no `Math.random`. Time and randomness are injected (`Clock`, `RandomSource`, defined in T-B2-02). ADR-0014 decision 2; SYSTEM 5.2 |
| Test files | Tests next to the code, `*.test.ts`. A test under a portable folder starts with `// @vitest-environment node` so a stray DOM global fails there (the default is `jsdom`, `vitest.config.mts:9`). Tests may import `node:fs` and `node:crypto` (they are excluded from `tsconfig.portable.json`) |
| Size | At most 5 source files per task, not counting its test files. A generated set of one kind counts 1. `package.json` with its lockfile counts 1 |
| Commit | `T-B2-NN: <title>`, one commit, author Amar Kushwaha, no trailer lines. `git commit -m ... -- <the task's own paths>` so a busy tree does not leak other files in |
| Playwright | B2 has no UI. Every task says "none". The existing e2e suite still runs once in `GATE` |
| Observability | There is no runtime in B2. "Observability" for a task means the diagnostic or reject codes it can emit and the counts a test prints |
| Permissions | Only `access.*` and `actor.*` ops are permissioned (T-B2-05). Nothing else in B2 has a permission model |
| Rollback | `git revert <task commit>`; later tasks that depend on it are reverted first. No data exists to migrate. The orchestrator tags `phase-B2` after Amar's OK, not an agent |
| Words | Plain words, no em dashes. Copy changes do not occur in B2 (no UI copy) |

## 1. Changes against the roadmap card (and why)

| # | Roadmap says | This file does | Why |
|---|---|---|---|
| 1 | T-B2-05 covers 14 kinds, T-B2-07 covers 28 | 13 and 29 | Counted in the schema: `meta.set, access.grant, access.revoke, access.set, actor.set, actor.remove, board.add, board.remove, board.set, component.add, component.remove, component.set, component.swap` is 13. `license.set` goes to T-B2-07 with the other document-level ops (`guide.set`, `provenance.set`, `domain.set`, `domain.patch`) |
| 2 | T-B2-15 updates the two stale examples | Drops that; keeps the hash test; adds a falsifiable question about the checkpoint hash | The examples are already at 1.1 (section 0.1). The checkpoint `097630ef...` is not reproduced by three recipes |
| 3 | T-B2-04 generates the project validator | Also generates the component validator and types | T-B2-11a validates descriptors against `component.schema.json`; one generator, one `schema:check` |
| 4 | T-B2-04 uses "Ajv 8.17.1 as in `schemas/tools/package.json`" | Adds `ajv` 8.17.1 as a root devDependency and puts a spike (T-B2-17) in front | Root `ajv` is 6.15.0 (ESLint's). The standalone generator, the type generator and the "no runtime import" question are all unanswered. R3 mitigation in the roadmap |
| 5 | T-B2-14 is one converter task | Four: T-B2-14 (interfaces and nets), T-B2-19 (tours, lessons, tasks), T-B2-20a to 20c (benches; practice tasks and crafts; report and script), T-B2-18 (spike on reading the figure circuits) | The converter touches 38 items of 5 types and 140 projects. One agent cannot finish and verify it in one sitting. Also, a converter in a portable folder cannot read files, so the pure mapping stays in `src/project/convert/` and the file reading goes in `scripts/` |
| 6 | No V6 library pass | T-B2-22 adds V6 (`V6-INTERFACE-DRIFT`, `V6-UNKNOWN-PART`, `V6-DIGEST`, `V6-SURFACE-EMPTY`) | PDM 9.1 lists V6; the "interface drift" test (PDM 9.5) needs it |
| 7 | No docs or gate task | T-B2-21 | Roadmap "Documentation" row and the exit gate need an owner |
| 8 | `tsconfig.json` is not named in T-B2-01 | T-B2-01 edits `tsconfig.json` (`allowImportingTsExtensions`) | The app typecheck also reads the portable files, which import `./x.ts`. Without it `tsc --noEmit` fails with TS5097 |
| 9 | Roadmap Architecture row: "`src/lib` stops importing `@/components` ... as each piece moves" | Not done in B2. A ratchet test forbids growth (39 lines today) | No `src/lib` piece moves in B2. SYSTEM 5.3 rule 1 wants zero "by the end of CORE"; this conflicts with the roadmap's own scope, so it is an open question for Amar (section 8) |
| 10 | Descriptors folder | `src/parts/data/` as the roadmap rows B4 to B18 use | ADR-0200 option (a) says repo folder `parts/` with a build step to `public/parts/`. Open question (section 8) |
| 11 | Roadmap rows T-B2-08, T-B2-11, T-B2-12 are one task each | Each is split in two (08a/08b, 11a/11b, 12a/12b); T-B2-20 is split in three | Review of 2026-10-27: each was more than one sitting for one agent ("Review fixes" at the end) |

## 2. The task list

| ID | Title | Group | Depends on | Source files (excluding tests) |
|---|---|---|---|---|
| T-B2-01 | Portable toolchain, import matrix, and the Turbopack proof (AX-03) | G1 | B1 | 5 |
| T-B2-17 | Spike: Ajv 8 standalone and the type generator on the real schemas | G1 | B1 | 0 |
| T-B2-18 | Spike: read the figure circuits of all 38 items without a browser | G1 | B1 | 0 |
| T-B2-02 | `src/core` A: ids, units, `Result`, `Diagnostic`, limits | G2 | 01 | 4 |
| T-B2-03 | `src/core` B: canonical JSON, strict parse, SHA-256, PRNG | G2 | 01 | 4 |
| T-B2-04 | Generate types and standalone validators from both schemas | G2 | 01, 17 | 4 |
| T-B2-05 | `apply` A: dispatch, batches, meta, access, actor, board, component (13 kinds) | G3 | 02, 03, 04 | 5 (plus `fixtures.testing.ts`) |
| T-B2-09 | Canonical form, `stateHash`, hash chain, migrations | G3 | 02, 03, 04 | 3 |
| T-B2-11a | Part descriptor validation, semantic rules, registry | G3 | 02, 03, 04 | 3 |
| T-B2-11b | Pinned interface (`interfaceOf`), pin rules, fallback art | G3 | 02, 04 | 2 |
| T-B2-13 | Netlist from connections, holes, legacy names (C-PIN, C-LEG, RC-36) | G3 | 02, 04 | 3 |
| T-B2-06 | `apply` B: net, view, wire, group, junction, label (22 kinds) | G4 | 05 | 4 |
| T-B2-08a | Validation passes V1, V2, V4, V5 and the limits | G4 | 02, 03, 04, 09 | 2 |
| T-B2-12a | Uno R3 descriptor as data, the builtin index, the browser loader | G4 | 11a, 11b, 13 | 3 |
| T-B2-14 | Converter A: figure reading, interfaces, circuit to nets, input types | G4 | 13, 18 | 5 |
| T-B2-07 | `apply` C: sources, simulation, mechanical, params, tests, assets, deps, document-level (29 kinds), plus the inverse round trips | G5 | 06 | 4 |
| T-B2-08b | Validation pass V3: references, invariants, `checkAll`, `checkBatch` | G5 | 08a, 09, 13 | 4 |
| T-B2-12b | The six small descriptors (LED, resistor, push button, buzzer, potentiometer, SSD1306) | G5 | 12a | 2 |
| T-B2-10 | `ProjectSession`, undo and redo, `computeTouched`, local stamping | G6 | 05, 06, 07, 08b, 09 | 4 |
| T-B2-15 | Examples hash test and the checkpoint question | G6 | 04, 05, 07, 08b, 09 | 1 |
| T-B2-19 | Converter B: board tours and lessons | G6 | 14, 08b, 09 | 3 |
| T-B2-22 | V6 library pass and interface drift | G6 | 11a, 11b, 12b, 14 | 1 |
| T-B2-20a | Converter C1: robotics benches | G7 | 14, 18, 19 | 1 |
| T-B2-20b | Converter C2: practice tasks and drone crafts | G7 | 14, 19 | 2 |
| T-B2-20c | Converter C3: `convertAll`, report, manifest, the corpus script | G8 | 20a, 20b, 22 | 3 |
| T-B2-16 | Headless harness, round trips, apply cost | G9 | 10, 12a, 20c | 4 |
| T-B2-21 | Docs, corpus manifest, exit gate | G10 | all | 4 |

### 2.1 Parallel groups

Tasks in one group touch disjoint files (section 2.2). Groups run in order. A group starts when every task in the groups before it is committed on `build/v1` and its verify commands pass. At most five agents run at once.

| Group | Tasks (separate agents) | Why they are disjoint |
|---|---|---|
| G1 | T-B2-01, T-B2-17, T-B2-18 | 01 edits config files and creates the architecture test. 17 and 18 write only to scratch and to their own `08_RESEARCH_SPIKES/` report folder |
| G2 | T-B2-02, T-B2-03, T-B2-04 | `src/core` A files, `src/core` B files, `scripts/schema-gen.mjs` plus the generated folders, `package.json`, `eslint.config.mjs` |
| G3 | T-B2-05, T-B2-09, T-B2-11a, T-B2-11b, T-B2-13 | `src/project/apply/` (new); `src/project/{normalize,hash,migrate}.ts`; `src/parts/{descriptor,semantic,registry}.ts`; `src/parts/{pins,fallback}.ts`; `src/project/{netlist,holes,legacy-names}.ts` |
| G4 | T-B2-06, T-B2-08a, T-B2-12a, T-B2-14 | `apply/{net,view,wire}.ts` plus an edit of `apply/index.ts`; `src/project/{validate,limits}.ts`; `src/parts/data/uno-r3.component.json`, `builtin.ts`, `browser/load.ts`; `src/project/convert/{types,interfaces,circuit}.ts` and two scripts |
| G5 | T-B2-07, T-B2-08b, T-B2-12b | `apply/{source,sim,misc}.ts` and `apply.inverse.test.ts` plus an edit of `apply/index.ts`; `src/project/{semantic,semantic.entity,semantic.cross}.ts` plus a one-line edit of `validate.ts`; six files in `src/parts/data/` plus an edit of `builtin.ts` |
| G6 | T-B2-10, T-B2-15, T-B2-19, T-B2-22 | `src/project/{session,touched,authority}.ts` plus `src/architecture.test.ts`; `src/project/examples.test.ts`; `convert/{text,guide,lesson}.ts` and the oracle test; `src/parts/library-check.ts` |
| G7 | T-B2-20a, T-B2-20b | `convert/bench.ts`; `convert/{practice,craft}.ts` |
| G8 | T-B2-20c | `convert/index.ts`, `scripts/convert-catalogue.mjs`, `package.json` |
| G9 | T-B2-16 | One task: harness, generators, measure script, `package.json` |
| G10 | T-B2-21 | One task: docs, manifest, ignore entry, the gate |

`package.json` is edited by T-B2-01 (G1), T-B2-04 (G2), T-B2-20c (G8) and T-B2-16 (G9): always in different groups. `eslint.config.mjs` by T-B2-01 (G1) and T-B2-04 (G2). `src/project/apply/index.ts` by T-B2-05 (G3), T-B2-06 (G4), T-B2-07 (G5). `src/project/validate.ts` by T-B2-08a (G4) and T-B2-08b (G5). `src/parts/builtin.ts` by T-B2-12a (G4) and T-B2-12b (G5). `src/architecture.test.ts` by T-B2-01 (G1) and T-B2-10 (G6).

### 2.2 File ownership (file to task)

A file has one owner per group. "Later edit" names a task in a later group that edits the same file.

| File | Owner | Later edit |
|---|---|---|
| `tsconfig.portable.json`, `tsconfig.json` | T-B2-01 | none |
| `eslint.config.mjs` | T-B2-01 | T-B2-04 (ignore generated folders) |
| `package.json`, `package-lock.json` | T-B2-01 (`imports`, `typecheck`, `typecheck:portable`) | T-B2-04 (`schema:gen`, `schema:check`, `check`, devDependencies), T-B2-20c (`corpus`), T-B2-16 (`measure:apply`) |
| `src/architecture.test.ts` | T-B2-01 | T-B2-10 (FA-01 rule) |
| `src/core/ids.ts`, `units.ts`, `result.ts`, `limits.ts` and their tests | T-B2-02 | none |
| `src/core/canonical.ts`, `strict-json.ts`, `sha256.ts`, `prng.ts` and their tests | T-B2-03 | none |
| `scripts/schema-gen.mjs`, `scripts/schema-gen.test.mjs`, `src/project/generated/*`, `src/parts/generated/*` | T-B2-04 | none (regenerated, never hand-edited) |
| `src/project/apply/types.ts`, `index.ts`, `doc.ts`, `component.ts`, `board.ts`, `fixtures.testing.ts` | T-B2-05 | T-B2-06 and T-B2-07 edit `index.ts` only |
| `src/project/apply/net.ts`, `view.ts`, `wire.ts` | T-B2-06 | none |
| `src/project/apply/source.ts`, `sim.ts`, `misc.ts`, `apply.coverage.test.ts`, `apply.inverse.test.ts` | T-B2-07 | none |
| `src/project/validate.ts`, `limits.ts` | T-B2-08a | T-B2-08b (one call to `checkAll` in `validateValue`) |
| `src/project/semantic.ts`, `semantic.entity.ts`, `semantic.cross.ts` | T-B2-08b | none |
| `src/project/normalize.ts`, `hash.ts`, `migrate.ts` | T-B2-09 | none |
| `src/project/session.ts`, `touched.ts`, `authority.ts` | T-B2-10 | none |
| `src/parts/descriptor.ts`, `semantic.ts`, `registry.ts` | T-B2-11a | none |
| `src/parts/pins.ts`, `fallback.ts` | T-B2-11b | none |
| `src/parts/data/uno-r3.component.json`, `src/parts/builtin.ts`, `src/parts/browser/load.ts` | T-B2-12a | T-B2-12b (`builtin.ts` only) |
| `src/parts/data/{led-5mm,resistor,push-button-6mm,buzzer-piezo,potentiometer-10k,ssd1306}.component.json`, `src/parts/data.test.ts`, `src/parts/builtin.test.ts` | T-B2-12b | none |
| `src/parts/library-check.ts` | T-B2-22 | none |
| `src/project/netlist.ts`, `holes.ts`, `legacy-names.ts` | T-B2-13 | none |
| `src/project/convert/types.ts` (including the `Convert*` input types), `interfaces.ts`, `circuit.ts`, `input-types.drift.test.ts`, `scripts/convert-io.mjs`, `scripts/figure-extract.mjs` | T-B2-14 | none |
| `src/project/convert/text.ts`, `guide.ts`, `lesson.ts`, `figures/engine/convert-oracle.test.mjs` | T-B2-19 | none |
| `src/project/convert/bench.ts` | T-B2-20a | none |
| `src/project/convert/practice.ts`, `craft.ts` | T-B2-20b | none |
| `src/project/convert/index.ts`, `scripts/convert-catalogue.mjs`, `scripts/convert-catalogue.test.mjs` | T-B2-20c | none |
| `src/project/examples.test.ts` | T-B2-15 | none |
| `src/project/testing/harness.ts`, `generators.ts`, `scripts/measure-apply.mjs`, `roundtrip.test.ts`, `replay.test.ts`, `apply-cost.test.ts` | T-B2-16 | none |
| `docs/ARCHITECTURE.md`, `src/project/apply/README.md`, `src/project/convert/corpus.manifest.json`, `.gitignore` | T-B2-21 | none |
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/AX-03/REPORT.md` | T-B2-01 | none |
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/AX-B2-01/REPORT.md` | T-B2-17 | none |
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/AX-B2-02/REPORT.md` | T-B2-18 | none |

No B2 task edits the example project files under `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/` (RC-32: "the example file is not changed").

The schemas under `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/` are inputs. No B2 task edits `project.schema.json` or `component.schema.json`. If a task finds a schema defect it stops and reports (RECONCILIATION owns schema fixes).

## 3. Shared definitions (used by several tasks)

Names, field names and kinds come from `project.schema.json` and `PROJECT_DATA_MODEL.md` (PDM). Where this file gives a TypeScript signature it is a proposal for the module shape; a field name that comes from the schema is binding.

```ts
// src/core/result.ts  (T-B2-02)
export type Result<T, E = Failure> = { ok: true; value: T } | { ok: false; error: E };
export interface Failure { code: string; message: string; path?: string }
export type Severity = 'error' | 'warning';
/** PDM 9.1: a validation diagnostic. `path` is a JSON Pointer. */
export interface Diagnostic { code: string; severity: Severity; path: string; message: string; hint?: string }
export const ok: <T>(value: T) => Result<T, never>;
export const fail: <E>(error: E) => Result<never, E>;

// src/core/ids.ts  (T-B2-02)
export type Clock = () => number;                 // milliseconds since epoch, injected
export interface RandomSource { bytes(n: number): Uint8Array }   // injected; default wraps crypto.getRandomValues

// src/project/apply/types.ts  (T-B2-05)
export type RejectCode = 'malformed' | 'duplicate_id' | 'missing_target' | 'missing_pin' | 'pin_in_use' | 'unknown_definition'
  | 'missing_pin_map' | 'referenced_by' | 'invariant' | 'quota' | 'permission' | 'stale_base' | 'schema_mismatch';   // PDM 7.2, closed
export interface Reject { code: RejectCode; message: string; refs?: string[] }   // refs: JSON Pointers, for referenced_by
export interface Author { actor: string; kind: 'user' | 'ai' | 'system' | 'import'; proposal?: string; model?: string }  // OpEnvelope.author
export interface ApplyContext { author: Author; at: string /* Timestamp */; invariants?: (next: Project, prev: Project) => Diagnostic[] }
export type ApplyOutcome = { ok: true; state: Project; inverse: Op[] } | { ok: false; reject: Reject };
```

`Project`, `Op`, `OpEnvelope`, `Net`, `Wire` and the rest are the types generated by T-B2-04 from the schema. Nothing in B2 hand-writes a duplicate of a schema type (ADR-0110 decision 4).

Revision rule (decided here, PROPOSAL, because PDM 7.1 says `seq` is assigned by the authority but 2.1 says `revision` counts ops applied): `apply` adds 1 to `revision` for each op it applies and sets `meta.updatedAt` to `ctx.at`. It never touches `history`. `ProjectSession` (T-B2-10) appends the stamped envelope to `history.ops` with `seq = revision`, which is what V3-HIST-SEQ checks. A rejected op or batch changes nothing, including `revision`.

Inverse rule (decided here, PROPOSAL): the inverse of an op is the list of ordinary ops that restore every entity the op and its cascade changed, built from snapshots of the pre-state. It runs as one batch. Two judges. (1) T-B2-05 and T-B2-06 assert each returned inverse as an exact `Op[]` (a golden list), because some inverses use ops that a later task registers (T-B2-05 inverses use `net.create`, `net.connect`, `view.place`, `wire.add`, `group.set`, `label.set`, `fault.set`, `input.set`, `runtime.set`, `source.add`; T-B2-06 inverses use `fault.set` and `test.set`), and `applyBatch` answers `malformed` with `op kind not implemented: <k>` for a kind with no handler yet. A kind whose full inverse uses only handlers already registered may also assert the hash round trip in its own task. (2) Once all 64 handlers exist, `apply.inverse.test.ts` (T-B2-07) asserts the hash round trip for every cascade, and the property test in T-B2-16 does it for any generated op: `apply` then the inverse batch gives the same `stateHash` (different `revision`). Per-kind inverse tables in T-B2-05 to T-B2-07 give the main case; edge cases follow from the rule.

Structural sharing rule (FA-01, FRONTEND 6.2): `apply` returns a new state where every entity that neither the op nor its cascade changed is `===` to the one before. Handlers copy the path they change and nothing else. `computeTouched` (T-B2-10) relies on it.

## 4. Task packages

Each package has the same four parts: Identity, Intent, Implementation, Verification, Delivery. Where a field has nothing to say it says "none" and why.

---

### T-B2-01. Portable toolchain, import matrix, and the Turbopack proof (AX-03)

**Identity.** Subsystem: build tooling. Phase B2. Priority: must, first. Dependencies: B1. Status: not started. Group G1.

**Intent.**

| Field | Content |
|---|---|
| Problem | The server and the browser must run the same project code (ADR-0014). Node cannot read `@/` or `bundler` resolution, and nothing stops a portable file from importing React. Whether Turbopack accepts `.ts`-extension imports is UNKNOWN (AX-03, SYSTEM line 275, 1128) |
| Target user | The agents that build B3 to B20, then Amar when he adds the server |
| User story | As a builder, I want one place that says which module may import which, and a compiler that rejects browser code in shared folders, so the server never breaks on a stray import |
| Expected behaviour | `tsc -p tsconfig.portable.json` checks the portable folders with no DOM types. `npm run typecheck` runs it too. An import that breaks SYSTEM 5.3 fails a vitest test with the file and the module pair. A portable file runs under plain `node`. The AX-03 report says whether `next build` accepts a `.ts`-extension import and a `#core/*` import |
| Success metric | `TP` exits 0; `src/architecture.test.ts` green and red on a planted violation in its own unit test; AX-03 report has a PASS or FAIL verdict with the build output pasted |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | `tsconfig.json:2-30` (add `"allowImportingTsExtensions": true` to `compilerOptions`; `noEmit` is already true at `tsconfig.json:12`, which the option requires). `package.json:19` (`typecheck`), `package.json` top level (add `imports`). `eslint.config.mjs:5-27` (add one config object after `...nextTs`). `vitest.config.mts:12` is read, not edited |
| New files | `tsconfig.portable.json`, `src/architecture.test.ts` |
| tsconfig.portable.json | `compilerOptions`: `target ES2022`, `lib ["esnext"]`, `module esnext`, `moduleResolution bundler`, `strict true`, `noEmit true`, `allowImportingTsExtensions true`, `verbatimModuleSyntax true`, `erasableSyntaxOnly true`, `isolatedModules true`, `skipLibCheck true`, `resolveJsonModule true`, `types []`. `include`: `src/core`, `src/protocol`, `src/project`, `src/parts`, `src/sim`, `src/export`, `server`. `exclude`: `**/*.test.ts`, `**/*.testing.ts` (test support files that may read files), `src/parts/browser/**`, `**/node_modules`. Folders that do not exist yet are listed anyway (ADR-0014 decision 3); `tsc` accepts that while at least one input exists. If it errors with TS18003 before T-B2-02 lands, add `src/core/index.ts` exporting nothing in this task |
| package.json | `imports`: `#core/*` to `./src/core/*.ts`, `#protocol/*` to `./src/protocol/*.ts`, `#project/*` to `./src/project/*.ts` (ADR-0014 decision 5; no `#parts`). `scripts.typecheck` becomes `next typegen && tsc --noEmit && tsc -p tsconfig.portable.json`. Add `scripts."typecheck:portable": "tsc -p tsconfig.portable.json"` |
| eslint.config.mjs | One object: `files` = `src/core/**`, `src/protocol/**`, `src/project/**`, `src/parts/**`, `src/sim/**`, `src/export/**` (not `*.test.ts`, not `*.testing.ts` because `fixtures.testing.ts` reads files with `node:fs`, not `src/parts/browser/**`). Rules: `no-restricted-imports` with patterns `@/*`, `react`, `react-dom`, `next`, `next/*`, `node:*`, each with a message that names ADR-0014; `no-restricted-properties` for `Date.now` and `Math.random` ("inject a Clock or RandomSource"); `no-restricted-globals` for `window`, `document`, `localStorage`, `indexedDB`, `navigator`. Message text is plain: "Portable code cannot use X. See ADR-0014" |
| Modules and functions (architecture.test.ts, all local to the test file) | `type ModuleName = 'core' \| 'protocol' \| 'project' \| 'parts' \| 'sim' \| 'sim-host' \| 'local' \| 'export' \| 'studio' \| 'ai' \| 'collab' \| 'server-client' \| 'content' \| 'ui' \| 'labs' \| 'server'`; `moduleOf(path: string): ModuleName`; `importsOf(source: string): { spec: string; typeOnly: boolean }[]` (handles multi-line `import ... from`, `export ... from`, side-effect `import 'x'`, dynamic `import('x')`); `resolveSpec(fromFile: string, spec: string): string \| null` (relative, `@/`, `#core/`, `#protocol/`, `#project/`); `type EnforcedModule = 'core' \| 'protocol' \| 'project' \| 'parts' \| 'sim' \| 'export' \| 'server'`; `ALLOWED: Record<EnforcedModule, ReadonlySet<ModuleName>>` (only those seven importer rows of the SYSTEM 5.3 matrix); `isExempt(file: string): boolean` (`*.test.ts`, `*.testing.ts`, anything under `src/project/testing/`); `PARTS_TO_PROJECT_TYPE_ONLY` (parts may `import type` from project, no value import); `checkImport(fromFile, spec, typeOnly): string \| null` returns a violation message or null |
| Data model | None |
| Algorithm | The test globs `src/**/*.{ts,tsx}` and `server/**/*.ts`, maps each file to a module with `moduleOf`, resolves each import, and collects violations. Rules enforced in B2: (1) the SYSTEM 5.3 matrix, **enforced only for the importer rows `core`, `protocol`, `project`, `parts`, `sim`, `export` and `server`** (new code). An enforced module may not import `content`, `ui` or `labs` at all. The rows `content` (`src/content`, `src/i18n`), `ui` (`src/app`, `src/components`) and `labs` (`src/lib`) are **unconstrained in B2**, because the existing tree breaks the matrix for them (VERIFIED 2026-10-27 by grep: `src/content` has 112 import lines from `@/lib`, `@/components` and `@/app`, for example `src/content/schema.ts:16` and `src/content/drones/_checks.ts:9-12`; `src/lib` has 4 lines importing `@/app` and 39 lines importing `@/components`). Each is held by a ratchet instead (rule 4). (2) portable folders (`core`, `protocol`, `project`, `parts` except `browser/`, `sim`, `export`): no `node:*`, `react`, `next`, `@/`; relative imports end in `.ts`, `.mjs` or `.json`. **Exemption:** files matching `*.test.ts`, `*.testing.ts` and everything under `src/project/testing/` are exempt from rule 1 and rule 2, because tests and test support cross modules and read files on purpose (VERIFIED needs: `src/parts/data.test.ts` imports `project/legacy-names`, `src/parts/library-check.test.ts` imports `project/convert`, `src/project/convert/text.test.ts` imports `src/lib/boardlab/template.ts`, `src/project/roundtrip.test.ts` imports the converter). They are still type-checked by the root `tsconfig.json`; `tsconfig.portable.json` excludes `*.test.ts` and `*.testing.ts` only, so `harness.ts` and `generators.ts` stay under `TP` and the ESLint zone and remain portable in fact. (3) every `*.test.ts` in a portable folder has `// @vitest-environment node` in its first 3 lines; the exemption does not cover rule 3, and a `*.testing.ts` support file is not a test, so it needs no docblock. (4) three ratchets, each a number that may only go down: `@/components` import lines in `src/lib/**` at most 39 (39 lines in 34 files); import lines from `@/lib`, `@/components` or `@/app` in `src/content/**` at most 112; `@/app` import lines in `src/lib/**` at most 4. The task re-measures all three with grep at its start and writes any different measured value into the test and into OQ-4. A comment in the test says "lower these numbers when a lab moves; never raise them". **Decision recorded for the converter:** `src/project/convert/` stays inside the portable zone and imports `core` only, never `src/content` (project to content is forbidden by the matrix, and `src/content/schema.ts:16` itself imports `@/lib/drone/calc`, which is not portable). The builders are typed with a local structural input set in `src/project/convert/types.ts` (T-B2-14), and a non-portable test, `src/project/convert/input-types.drift.test.ts`, assigns the `src/content/schema.ts` types to them so that drift fails `npm run typecheck`. The matrix row `project` therefore stays "core only" |
| Validation and errors | A violation lists `file`, `line`, `from module`, `to module`, `specifier`. The test prints at most 20 and fails |
| Edge cases | `import type` only crossing is allowed where the matrix says "(types)". A barrel `index.ts` counts as its module. A file in `src/app` or `src/components` is `ui`. `src/i18n` and `src/content` are `content`. `src/lib/server/**` is `labs` in B2 (it moves in B6) |
| Permissions | None |
| Performance | The test reads about 700 files; under 3 s (ESTIMATED) |
| Migration | None |
| AX-03 proof (first step of the task) | Before any config edit: add `allowImportingTsExtensions` to `tsconfig.json`. Create three throwaway files: `src/core/ax03.ts` (`export const ax03 = 3;`), `src/app/ax03/page.tsx` that imports it twice (`../../core/ax03.ts` and, after adding `imports`, `#core/ax03`), and renders the number. Read first: `AGENTS.md`, then in `node_modules/next/dist/docs/` the guides on pages and layouts, `cacheComponents` and Turbopack (`02-pages/04-api-reference/08-turbopack.md`), because this repo runs Next 16.4.3 with `cacheComponents: true` (`next.config.ts:5`) and a static page must not read dynamic data. Run `BUILD` (never `next dev`: ports 3000 and 43117 are off limits). Run `node -e "import('./src/core/ax03.ts').then(m=>console.log(m.ax03))"`. Run `npm run typecheck`. Write the verdict and the command output into `docs/MASTER_PLAN/08_RESEARCH_SPIKES/AX-03/REPORT.md` (question, method, result, verdict, what B2 does next). Delete the three throwaway files (`git checkout`/`rm`; they are never committed). If the build fails: keep going with the rest of the task (vitest and Node do not need Turbopack), mark the verdict FAIL, state ADR-0014 option B as the fallback, and add the question to the stop message for Amar. Nothing in B2 imports portable code into a page, so a FAIL does not block B2 |

**Verification.**

| Field | Content |
|---|---|
| Unit tests (`src/architecture.test.ts`) | (a) `importsOf` on 8 snippets: single-line, multi-line, `import type`, `export * from`, side-effect, dynamic, comment containing the word `import`, a string containing `from 'x'`. (b) `checkImport`: `src/core/a.ts` importing `../project/b.ts` is a violation; `src/project/a.ts` importing `../core/b.ts` is not; `src/parts/a.ts` value-importing `../project/b.ts` is a violation, `import type` is not; `src/project/a.ts` importing `react` is a violation; a relative import without `.ts` in a portable folder is a violation. (c) the real scan finds 0 violations for the seven enforced rows. (d) the three ratchets: `@/components` in `src/lib` at most 39, `src/content` to `@/lib`, `@/components`, `@/app` at most 112, `@/app` in `src/lib` at most 4; the test prints each count. (e) every portable `*.test.ts` has the docblock. (f) exemption unit test: `src/parts/data.test.ts` value-importing `../project/legacy-names.ts` is not a violation while `src/parts/a.ts` doing the same is; `src/project/testing/harness.ts` importing `../../parts/builtin.ts` is not; `src/core/a.testing.ts` importing `node:fs` is not; a `*.test.ts` in a portable folder without the docblock still fails rule 3; `src/content/schema.ts` importing `@/lib/drone/calc` is not a violation (unconstrained row), while `src/project/convert/a.ts` importing `@/content/schema` is |
| Integration | `TP`; `node -e "import('./src/core/ax03.ts')"` during the proof; `BUILD` during the proof |
| Playwright | None. No UI |
| Fixtures | None |
| Acceptance | **Given** a portable file that imports `react`, **When** `npm run lint` runs, **Then** it fails with the ADR-0014 message. **Given** `src/core/x.ts` imports from `src/project`, **When** the vitest runs, **Then** it fails and names both files. **Given** a clean tree, **When** `npm run typecheck` runs, **Then** it runs the app check and the portable check and exits 0 |
| Observability | Test output prints the count of files scanned and the three ratchet values |
| Release blockers | `TP` red; the matrix test red; the AX-03 report missing |

**Delivery.**

| Field | Content |
|---|---|
| Definition of done | Files exist; AX-03 report committed with a verdict; throwaway files gone; `git status` shows only the task's files |
| Verify commands | `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/architecture.test.ts`; `BUILD` (proof step, output pasted into the report) |
| Documentation | AX-03 report. The module map goes in T-B2-21 |
| Rollback | Revert the commit. `tsconfig.json` loses one option; nothing else uses it yet |
| Later tasks need | `TP`, the `imports` map, the lint zone, the docblock rule, `moduleOf` (T-B2-10 extends the test), `allowImportingTsExtensions` |

---

### T-B2-17. Spike: Ajv 8 standalone and the type generator on the real schemas

**Identity.** Subsystem: schema tooling. Phase B2. Priority: must, before T-B2-04. Dependencies: B1. Status: not started. Group G1. Output: a report, no source.

**Intent.**

| Field | Content |
|---|---|
| Problem | T-B2-04 is the base of every later task and rests on four things nobody ran in the repo: Ajv 8 can emit standalone code for these schemas with no run-time import; a type generator gives usable types; JSON import attributes work; adding Ajv 8 does not break ESLint, which depends on Ajv 6 (`node_modules/ajv` is 6.15.0, VERIFIED) |
| Target user | The agent that builds T-B2-04 |
| User story | As the T-B2-04 builder, I want to know which tool options work before I write a generator around them |
| Expected behaviour | A report with a PASS or FAIL per question and the exact options that passed |
| Success metric | All six questions answered with numbers; for each FAIL a named fallback that fits in T-B2-04's file budget |

**Implementation.** Work in `/Users/amar/iynk-master-plan-scratch/buildplan/T-B2-17/` (a copy of `package.json`, `package-lock.json`, `tsconfig.portable.json` from T-B2-01 or the same options, and the four schemas). Do not touch the repo's `node_modules` or lockfile. Write `docs/MASTER_PLAN/08_RESEARCH_SPIKES/AX-B2-01/REPORT.md` with the standard headings of the other reports (Question, Why it matters, Exit condition, Environment, Method, Results, Verdict, What it does not show).

| # | Question (falsifiable) | Exit condition: PASS if | If FAIL |
|---|---|---|---|
| Q1 | Does `ajv@8.17.1` (`ajv/dist/2020.js`, `ajv/dist/standalone`) compile `project.schema.json` with both domain schemas added, and `component.schema.json` alone, under `strict: true, strictRequired: false, allErrors: true, code: { source: true, esm: true }`? | Both compile in under 10 s; project source at most 1.5 MB (PDM measured 925 KB), gzip at most 150 KB (measured 102 KB) | Record the Ajv error; try `strictTypes: "log"`, `allowUnionTypes: true` (as `component.schema.json` was checked, COMPONENT_SCHEMA 6.1); if still failing, report the schema line |
| Q2 | Does the generated module import anything at run time, and does it contain `eval` or `new Function`? | `grep -c "eval(\|new Function"` is 0 and the import list is empty, or at most three helpers from `ajv/dist/runtime/` (`equal`, `ucs2length`, `validate`) that can be inlined by the generator | Report the list; fallback: the generator copies those helpers into the output file |
| Q3 | Does the module load and validate correctly as ESM in Node 24.8 and in Vitest 5.0.3? | The five project examples and nine component examples validate; the twelve broken variants in `schemas/tools/negative-project.mjs` and the 34 in `negative.mjs` are rejected; the first-error message includes `instancePath` | Report the failing case |
| Q4 | Does `json-schema-to-typescript` (pin the newest version at least two weeks old; EXTERNAL, version UNKNOWN until `npm view`) produce types that compile under the portable options (`erasableSyntaxOnly`, `verbatimModuleSyntax`, no `enum`) and give a discriminated union on `k` with 64 members for `Op`? | `tsc` exits 0; `Op` has 64 members; count of `any` in the output is 0 or listed with the schema location | Fallback: a hand-written generator inside `schema-gen.mjs` (at most 400 lines) for the subset the schemas use (`$ref`, `$defs`, `oneOf`, `enum`, `const`, `object`, `array`, `required`, `patternProperties`, `additionalProperties`). Report which keywords the two schemas use (a script lists them) |
| Q5 | Do JSON import attributes (`import x from './a.json' with { type: 'json' }`) work from a `.ts` file under Node 24.8 type stripping, `tsc` with the portable options, and Vitest? | All three accept it | Fallback: `src/parts/builtin.ts` embeds the descriptors as `export default {...} as const` generated from the JSON by a script |
| Q6 | After adding `ajv@8.17.1` to `devDependencies` in a scratch copy of the repo manifest, does `npm install --ignore-scripts` leave ESLint working? | `npm ls ajv` shows 8.17.1 at the top and 6.x nested under ESLint, and `npx eslint --version` and `npx eslint eslint.config.mjs --quiet` exit 0 | Report; fallback: `overrides` in `package.json` is not used (it would force Ajv 8 on ESLint); instead put Ajv 8 in a root `devDependencies` alias `ajv8` (`npm:ajv@8.17.1`) and import `ajv8/dist/2020.js` in the generator |

| Field | Content |
|---|---|
| Algorithm, validation, errors, edge cases | Not applicable (spike). Edge: the version of every npm package is recorded with `npm view <pkg> time --json` to show it is at least two weeks old (house rule for pinned versions) |
| Permissions, performance, migration | Network: npm registry only. No production service, no key, no port |

**Verification.** Unit, integration, Playwright: none (the report is the product). Acceptance: **Given** the report, **When** the T-B2-04 builder reads it, **Then** each of Q1 to Q6 has a verdict, a number and an option set. Observability: the command lines and outputs are pasted. Release blocker: a missing verdict on Q1, Q4 or Q6.

**Delivery.** Definition of done: report committed. Verify: `ls docs/MASTER_PLAN/08_RESEARCH_SPIKES/AX-B2-01/REPORT.md` and read it. Documentation: the report. Rollback: delete the report. Later tasks need: T-B2-04 reads the verdicts and uses the options.

---

### T-B2-18. Spike: read the figure circuits of all 38 items without a browser

**Identity.** Subsystem: catalogue converter. Phase B2. Priority: must, before T-B2-14. Dependencies: B1. Status: not started. Group G1. Output: a report, no source.

**Intent.**

| Field | Content |
|---|---|
| Problem | The converter must derive nets by the same union-find the figure uses (PDM 11.4). The circuits live inside figure files that expect a browser global `SL` (`figures/engine/bench.js:9`, `:29`). PDM 11.4 says 56 lesson circuits and the 13 bench circuits "were not converted (UNKNOWN effort per item)". The converter's reach, and so the exit count "38 of 38", depends on this |
| Target user | The builder of T-B2-14, T-B2-19, T-B2-20a to 20c |
| User story | As the converter builder, I want to know which circuit data I can read in Node and which items need the named-list path |
| Expected behaviour | A report with a table per item: circuit found or not, how many parts and wires, which endpoints resolve |
| Success metric | Every one of the 38 items has a row; the decision rule for T-B2-20a is applied to the numbers |

**Implementation.** Work in `/Users/amar/iynk-master-plan-scratch/buildplan/T-B2-18/`; read the repo files, do not edit them. Write `docs/MASTER_PLAN/08_RESEARCH_SPIKES/AX-B2-02/REPORT.md`.

| # | Question | Method | Exit condition |
|---|---|---|---|
| Q1 | Can a plain Node script (`node:vm`, no jsdom) read the `circuits` object and the `circuit` default from each of the 12 files in `figures/boards/`? | Run the file text in a `vm` context with `SL = { bench: new Proxy(...) }` where `B.board = B.bench = B.module = (def) => captured.push(def)` and every other `B.*` property is a function that returns a Proxy; the `// @cf use` lines are comments, so the parts are not loaded | PASS if all 12 yield `circuits`, and for each board the set of circuit keys is a superset of the non-null `Lesson.circuit` values in `src/content/boards/<id>.ts` (VERIFIED expectation: 57 lessons carry a circuit, 14 do not; PDM 11.1). FAIL names the boards |
| Q2 | For the 13 benches in `figures/robotics/*.js`, can `periph`, `wires` and `pinMap` be read the same way, and how many wire endpoints resolve to a (instance, pin) pair through `pinMap` and the module figure's pin table (`figures/modules/*.js`, 12 files)? | Same `vm` approach; resolve `J4.1` (module header index) and `NANO.D8` (periph pin) | Report per bench: wires, resolved, unresolved with reason. Decision rule for T-B2-20: if at least 10 of 13 benches resolve every wire, T-B2-20 derives nets for those and lists the rest as `deferred: bench-circuit-unresolved`; if fewer, T-B2-20 stores benches as legacy data with `nets = []` for all 13 and says so in the report |
| Q3 | Which `legs` does each of the 29 files in `figures/parts/` declare? | Same `vm`; also regex as a cross-check | Count of files with a non-empty `legs` array. Expectation from a grep today: 28 (`breadboard.js` has `legs: []`; PDM 3.4 says 27, DOCUMENTED). Report both; the C-LEG test in T-B2-13 uses the measured number |
| Q4 | Which endpoint spellings occur in all circuits (`b10`, `T+12`, `IOH.5`, `POWER.6`, a net name such as `D2`, `RES1.P1`)? Does any endpoint resolve to nothing (the silent skip at `bench-solve.js:41-42`, `:55`)? | Classify every `from`/`to` and every `holes` entry with the regexes at `figures/engine/bench-bb.js:23-30` and `B.pinOf` (`:105`) | Table of spellings with counts; the list of unresolved endpoints (each is a source defect the converter reports, not a failure of the converter) |
| Q5 | Do the 13 crafts need a figure at all? | `DroneWire` has no pins (PDM 11.3), so `nets = []` | Confirm by reading `src/content/drones/quad5.ts` and one more; if any craft has pin-level wires, report it |

| Field | Content |
|---|---|
| Algorithm, validation, errors, edge cases | Not applicable. Edge: some figure files compute values with helper functions at load (`mpu6050.js:22`, `bench-bb.js:13`); the Proxy must tolerate that without throwing. If a file throws, report the error and the line |
| Permissions | None |
| Performance | Whole run under 10 s |

**Verification.** Unit, integration, Playwright: none. Acceptance: **Given** the report, **When** T-B2-20a is built, **Then** its bench rule is chosen from Q2's numbers. Observability: the extractor script from the scratch folder is pasted into the report so T-B2-14 can start from it. Release blocker: Q1 or Q2 missing.

**Delivery.** Definition of done: report committed. Verify: read it. Rollback: delete it. Later tasks need: T-B2-14 builds `scripts/figure-extract.mjs` from the spike's script; T-B2-13 uses Q3's `legs` count; T-B2-20a uses Q2's rule.

---

### T-B2-02. `src/core` A: ids, units, `Result`, `Diagnostic`, limits

**Identity.** Subsystem: core. Phase B2. Priority: must. Dependencies: T-B2-01. Status: not started. Group G2.

**Intent.**

| Field | Content |
|---|---|
| Problem | Ids, units, error shapes and size limits are used by every later task; today none exists as a shared module |
| Target user | Every later task |
| User story | As a builder, I want one place for id rules, unit rules and limits, taken from the schema, so no task invents its own |
| Expected behaviour | `newId('cmp')` returns `cmp_` plus 16 random base32 characters that match the schema pattern. `newProjectId` returns `prj_` plus a 26-character lowercase ULID. `quantiseMm(0.1+0.2)` returns `0.3`. The limits table equals the schema's `maxItems` values |
| Success metric | The schema-agreement tests pass (prefix list, patterns, limits, unit list); 100,000 generated ids have no collision and all match the pattern |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. Read: `project.schema.json` `$defs` `LocalId`, `PinId`, `Refdes`, `DefRefName`, `Timestamp`; `component.schema.json` `$defs/unit` (24 values: `V A ohm F H W Hz s degC C_per_W mm g N_m rad_per_s deg deg_per_s g0 lux ratio percent 1 bit byte ppm`) |
| New files | `src/core/ids.ts`, `src/core/units.ts`, `src/core/result.ts`, `src/core/limits.ts` (and tests `ids.test.ts`, `units.test.ts`, `result.test.ts`, `limits.test.ts`). No `globals.d.ts`: `cryptoRandom` reads `(globalThis as { crypto?: { getRandomValues<T extends ArrayBufferView>(a: T): T } }).crypto` |
| Signatures: ids.ts | `ENTITY_PREFIXES` (22 values, section 0.1); `type EntityPrefix`; `type EntityId<P extends EntityPrefix = EntityPrefix> = \`${P}_${string}\``; `ENTITY_ID_PATTERN`, `LOCAL_ID_PATTERN` (`^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$`), `PIN_ID_PATTERN` (`^[A-Za-z][A-Za-z0-9_]{0,31}$`), `REFDES_PATTERN` (`^[A-Za-z][A-Za-z0-9_]{0,15}$`), `DEF_REF_PATTERN` (the `DefRefName` pattern); `cryptoRandom: RandomSource`; `newId<P extends EntityPrefix>(prefix: P, rnd?: RandomSource): EntityId<P>`; `newProjectId(nowMs: number, rnd?: RandomSource): EntityId<'prj'>`; `uniqueId<P>(prefix: P, taken: ReadonlySet<string>, rnd?: RandomSource): EntityId<P>` (up to 8 tries, then throws `id_space_exhausted`); `isEntityId(s: unknown, prefix?: EntityPrefix): s is EntityId`; `prefixOf(id: string): EntityPrefix \| null`; `isLocalId`, `isPinId`, `isRefdes`, `isDefRefName` |
| Signatures: units.ts | `UNITS` (the 24 above) and `type Unit`; `DOCUMENT_ONLY_UNITS = ['ms', 'ns']`; `quantiseMm(v: number): number` (round to 0.001), `quantiseDeg(v)` (0.01), `quantiseMs(v)` (0.001); the formula is `Math.round(v * 1000) / 1000`, with `-0` turned into `0`; `normaliseNumber(v: number): number` (throws `RangeError` on NaN or an infinity, maps `-0` to `0`); `msToNs(ms: number): number` (round to integer; throws if `\|ms * 1e6 - round\| > 1e-6`, PDM 4.1 "fraction below 1 ns is rejected"); `nsToMs(ns: number): number`; `inLayoutRange(v)` (plus or minus 1,000,000 mm) |
| Signatures: result.ts | `Result`, `Failure`, `Severity`, `Diagnostic`, `ok`, `fail` (section 3). Plus `diag(code, severity, path, message, hint?): Diagnostic` |
| Signatures: limits.ts | `LIMITS` as a frozen object: `canonicalBytes 5242880`, `boards 16`, `components 2000`, `nets 5000`, `connectionsPerNet 2000`, `views 16`, `placementsPerView 2000`, `wiresPerView 5000`, `junctionsPerView 5000`, `labelsPerView 1000`, `sources 20`, `sourceBytes 262144`, `assets 256`, `assetBytes 16777216`, `containerBytes 134217728`, `parameters 256`, `tests 64`, `checksPerTest 200`, `worldInputs 128`, `scriptEvents 10000`, `faults 200`, `instruments 64`, `historyOps 1000`, `checkpoints 256`, `opEnvelopeBytes 65536`, `jsonDepth 32`, `interfacePins 1024`, `interfaceGroups 256`, `pinsPerGroup 256`, `interfaceParams 64`, `descriptorBytes 262144`, `layoutAbsMm 1000000` (PDM 9.4, 5.3, 4.2; COMPONENT_SCHEMA 4.1). `type LimitName`. `overLimit(name: LimitName, value: number): Diagnostic \| null` with code `V4-<NAME>` and a message that names the limit and its value |
| Data model | None stored |
| Algorithm (ids) | Random: take `ceil(n*5/8)` bytes, map 5 bits at a time to the alphabet `abcdefghijklmnopqrstuvwxyz234567`. ULID: 48-bit time as 10 Crockford characters (`0123456789abcdefghjkmnpqrstvwxyz`), then 80 random bits as 16 characters, all lowercase. Ids are never derived from names (ADR-0102) |
| Validation and errors | `newId` with an unknown prefix is a TypeScript error and throws at run time. `cryptoRandom` without `globalThis.crypto` throws `Error('no crypto.getRandomValues; pass a RandomSource')` |
| Edge cases | `msToNs(1.0000004)` is rejected, `msToNs(0.000001)` is 1. `quantiseMm(-0.0004)` is `0` not `-0`. A seeded `RandomSource` for tests is a 10-line helper inside `ids.test.ts` |
| Permissions | None |
| Performance | `newId` under 5 microseconds (ESTIMATED); not asserted |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `ids.test.ts`: every generated id matches the schema pattern for its prefix and is at most 72 characters; 100,000 ids from `cryptoRandom` have no duplicate; a fixed `RandomSource` gives fixed output (golden strings); ULID sorts by time (two calls 1 ms apart); `ENTITY_PREFIXES` equals the set of prefixes in the `^xxx_` patterns of `project.schema.json` (the test reads the schema file); each schema pattern equals `^<prefix>_[a-z0-9][a-z0-9_-]{0,63}$`; `isLocalId`/`isPinId`/`isRefdes`/`isDefRefName` accept and reject 6 cases each, including the C-LEG bare digits (`1` is not a pin id, `P1` is). `units.test.ts`: `UNITS` equals the schema enum; `quantiseMm(0.1+0.2) === 0.3`; `quantiseDeg(12.3456) === 12.35`; `-0` handling; `msToNs` cases above; `normaliseNumber(NaN)` throws. `limits.test.ts`: for each limit that the schema enforces (`boards`, `components`, `nets`, `connectionsPerNet`, `views`, `sources`, `assets`, `parameters`, `tests`, `checksPerTest`, `worldInputs`, `scriptEvents`, `faults`, `instruments`, `historyOps`, `checkpoints`, `interfacePins`, `interfaceGroups`, `pinsPerGroup`) the value equals the `maxItems` found by path in the schema; `overLimit` returns null at the limit and a diagnostic one above. `result.test.ts`: `ok`/`fail` narrow correctly (a type-level check with `// @ts-expect-error`) |
| Integration | `TP` |
| Playwright | None |
| Fixtures | The two schema files, read at test time |
| Acceptance | **Given** the schema adds a 23rd prefix, **When** the tests run, **Then** `ENTITY_PREFIXES` fails the comparison. **Given** a limit changes in the schema, **When** the tests run, **Then** `LIMITS` fails the comparison |
| Observability | None |
| Release blockers | A mismatch between `LIMITS` and the schema |

**Delivery.** Definition of done: four modules, four test files, `TL` and `TP` green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/core`. Documentation: JSDoc on each export, one line each. Rollback: revert. Later tasks need: `Result`, `Diagnostic`, `ok`, `fail`, `Clock`, `RandomSource`, `newId`, `uniqueId`, `LIMITS`, `quantise*`.

---

### T-B2-03. `src/core` B: canonical JSON, strict parse, SHA-256, PRNG

**Identity.** Subsystem: core. Phase B2. Priority: must. Dependencies: T-B2-01. Status: not started. Group G2.

**Intent.**

| Field | Content |
|---|---|
| Problem | The state hash must be the same in the browser, a worker, Node and the server, synchronously, with no `node:crypto` and no `TextEncoder` (the portable `lib` has neither). A plain `JSON.parse` keeps the last of two duplicate keys, so two readers could disagree (PDM 6.3) |
| Target user | T-B2-08a, T-B2-08b, T-B2-09, T-B2-10, T-B2-16 |
| User story | As the hash owner, I want one function that turns any value into the same bytes and the same hex everywhere |
| Expected behaviour | `canonicalize` of the PDM 6.3 input gives the 82-byte string; `sha256Hex` of it gives `726a7d3b30b104e1d8ff1dc2b8184d9855e408419492c85ce39981959c0bc7e1`. `parseStrict` rejects duplicate keys, depth over 32, a BOM, a lone surrogate and text over the byte cap |
| Success metric | Canonical vector test green; SHA-256 equals `node:crypto` on 1,000 random inputs; RFC 8785 vectors green |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. Reference implementation to read, not to copy and not to import in a test: `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/tools/project-lib.mjs:6-26` (`canon`, `pretty`, `chainStep`) |
| New files | `src/core/canonical.ts`, `src/core/strict-json.ts`, `src/core/sha256.ts`, `src/core/prng.ts` and tests |
| Signatures: canonical.ts | `utf8Encode(s: string): Uint8Array` (hand-written; throws `lone_surrogate`); `utf8Length(s: string): number`; `canonicalize(value: unknown): string` (RFC 8785: keys sorted by UTF-16 code unit, numbers as ECMAScript `Number::toString`, `-0` as `0`, minimal escapes, no whitespace; an object property whose value is `undefined` is skipped; `undefined`, a function, a symbol, a bigint, NaN or an infinity anywhere else throws `CanonicalError`; `null` is allowed because ops carry nulls); `prettyPrint(value: unknown): string` (same value, two-space indent, one array item per line, empty array `[]`, empty object `{}`, LF, one trailing newline); `class CanonicalError extends Error { readonly path: string }` (explicit field, not a parameter property) |
| Signatures: strict-json.ts | `interface ParseOptions { maxBytes?: number /* default LIMITS.canonicalBytes */; maxDepth?: number /* default 32 */ }`; `parseStrict(text: string, opts?: ParseOptions): Result<unknown, Failure>` with `Failure.code` one of `too_large`, `bom`, `syntax`, `duplicate_key`, `depth`, `lone_surrogate`; `Failure.path` is a JSON Pointer to the first offence where known |
| Signatures: sha256.ts | `sha256Bytes(data: Uint8Array): Uint8Array`; `sha256Hex(data: string \| Uint8Array): string` (a string is hashed as its UTF-8 bytes). Synchronous, pure, no globals |
| Signatures: prng.ts | `interface Rng { next(): number /* uint32 */; float(): number /* [0,1) */; gauss(): number }`; `rng(seed: number, stream: string): Rng`: sfc32 seeded from SplitMix32(`seed XOR fnv1a32(stream)`), as `SIMULATION_ARCHITECTURE.md` 6.5 and COMPONENT_SCHEMA line 806; `fnv1a32(s: string): number`; `splitmix32(seed: number): () => number`; `rngState(r: Rng): [number, number, number, number]` and `rngFrom(state)` so a replay can save and restore (SIM line 2145). `gauss` uses Box-Muller on two `float()` draws and does not call `Math.log`/`Math.cos` more than the spec allows: use `Math.sqrt`, `Math.log` and `Math.cos` only here and note in a comment that cross-engine last-bit differences exist (A12); T-B2-16's generators use `next()` and `float()` only |
| Data model | None |
| Algorithms | Canonicalise with a recursive writer that appends to an array of strings and joins once. Strings: `JSON.stringify(s)` already gives the minimal escapes RFC 8785 asks for (it escapes `\u0000` to `\u001f`, `"` and `\`, and leaves other code points); check for a lone surrogate first with a regex that does not use the `u` flag. Strict scan: one pass over the text keeping a stack of `Set<string>` per open object, decoding each key literal with `JSON.parse` so `"a"` and `"a"` collide; depth counted on `{` and `[`; then `JSON.parse` for the value. SHA-256: FIPS 180-4 with `Uint32Array` for the schedule and the padding rule (0x80, zeros, 64-bit length) |
| Validation and errors | As in the signatures. A BOM is rejected because the writer never emits one (PDM 6.3) |
| Edge cases | Keys that are not BMP (code points above U+FFFF) sort by their surrogate pairs, which is the RFC rule and differs from code point order: include a test. `canonicalize({a: undefined})` is `{}`. `canonicalize([undefined])` throws. `__proto__` as a key is written like any other (the writer reads `Object.keys`) |
| Permissions | None |
| Performance | SHA-256 over 340 KB (the 500 part, 1,000 net document, PDM 6.4) about 2 to 5 ms (ESTIMATED); `canonicalize` of the same about 3 to 10 ms (the Node prototype took 3.4 ms, VERIFIED). `parseStrict` of 1.6 MB under 40 ms desktop (ESTIMATED). The tests print the numbers and assert only a ceiling of 100 ms so a loaded machine does not make them flaky |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `canonical.test.ts`: the PDM 6.3 vector (build the value in code, assert the canon string, 82 UTF-8 bytes, and the hash); the RFC 8785 section 3.2.3 sorting example and the number table of Appendix B (at least 12 values, including `1e23`, `5e-324`, `-0`, `1.5e+300`); surrogate-pair key ordering; `prettyPrint` then `parseStrict` then `canonicalize` equals `canonicalize` of the input (round trip); `-0`, NaN, `undefined`; `prettyPrint(parseStrict(text).value)` equals the bytes of each of the five example files (the examples are the writer's pretty form, VERIFIED with `project-lib.mjs` in this step). The PDM 6.3 vector and every other expected value are inline literals. **No test in this task imports `project-lib.mjs`**: it imports `ajv/dist/2020.js` and compiles the schema at import (`project-lib.mjs:2`, `:35`), Ajv 8 lives only in `schemas/tools/node_modules`, which is gitignored (`.gitignore:70`) and absent on a fresh `build/v1` checkout, and root `ajv` is 6.15.0 (no `dist/2020.js`) until T-B2-04 in the same group lands. `strict-json.test.ts`: duplicate key at depth 3; duplicate through escape; depth 32 passes and 33 fails; BOM; lone surrogate in a key and in a value; 5,242,881 bytes fails with `too_large` before any parse (check the byte count is computed with `utf8Length`); valid input returns the same value as `JSON.parse`. `sha256.test.ts`: the empty string, `abc`, the two-block NIST vector, lengths 55/56/57/63/64/65 and 119/120/128, one million `a` (NIST); then 1,000 random byte arrays (lengths 0 to 300) against `node:crypto` with a seeded `rng`; the chain vector (`sha256Hex("iynk.chain.v1:prj_demo")` equals `6193a5a80a5088dbc239c4307bca5df7230dda9949008bfbf2f7a42990d3dd2f`). `prng.test.ts`: the same seed and stream give the same first 1,000 `next()` values (golden first 8); two streams differ; adding a third stream does not change the first two; `float()` is in [0,1); `rngState` then `rngFrom` continues the sequence; `fnv1a32('') === 0x811c9dc5` |
| Integration | `TP`; `node -e "import('./src/core/sha256.ts').then(m=>console.log(m.sha256Hex('abc')))"` prints `ba7816bf...15ad` (proves the file runs under Node type stripping) |
| Playwright | None |
| Fixtures | Inline vectors; `schemas/examples/*.project.json` read as bytes in `canonical.test.ts` (data files, no tool import) |
| Acceptance | **Given** the PDM 6.3 value, **When** it is canonicalised and hashed, **Then** the hash is the documented one. **Given** `{"a":1,"a":2}`, **When** `parseStrict` runs, **Then** it returns `duplicate_key` with path `/a`. **Given** a 5 MiB plus 1 byte text, **When** `parseStrict` runs, **Then** it returns `too_large` |
| Observability | The performance numbers are printed with `console.info` once per file |
| Release blockers | Any vector red; SHA-256 differs from `node:crypto` on any input |

**Delivery.** Definition of done: four modules and tests green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/core`. Documentation: JSDoc; the performance numbers go to T-B2-21. Rollback: revert. Later tasks need: `canonicalize`, `prettyPrint`, `parseStrict`, `sha256Hex`, `utf8Length`, `rng`.

---

### T-B2-04. Generate types and standalone validators from both schemas

**Identity.** Subsystem: schema tooling. Phase B2. Priority: must. Dependencies: T-B2-01, T-B2-17. Status: not started. Group G2.

**Intent.**

| Field | Content |
|---|---|
| Problem | One definition must give the types and the validator (ADR-0100, ADR-0110 decisions 1, 2 and 4). Hand-written duplicates drift (the PRD still says "a zod schema", R-025, which PDM Objection O-2 replaces) |
| Target user | T-B2-05 to T-B2-16, T-B2-22 |
| User story | As a builder, I want `Project` and `Op` types and a no-`eval` validator that always match `project.schema.json` |
| Expected behaviour | `npm run schema:gen` writes types and validators for the project schema and for the component schema. `npm run schema:check` regenerates in memory, fails if the committed files differ, and validates all examples with the generated validators |
| Success metric | `schema:check` exit 0; the 5 project and 9 component examples validate; the negative variants of `schemas/tools/negative-project.mjs` and `negative.mjs` are rejected by the generated validators; generated project validator is at most 1.5 MB source; no `eval` or `new Function` |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | `package.json:19` and `:23` (`typecheck` stays as T-B2-01 left it; `check` gains `npm run schema:check` after `content:check`); `package.json:49` (`devDependencies`: `ajv` 8.17.1, and the type generator the spike chose, both pinned exact, no caret); `eslint.config.mjs:9-27` (add `"src/**/generated/**"` to `globalIgnores`). Inputs, not edited: `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/{project,component,robotics.domain,drone.domain}.schema.json` |
| New files | `scripts/schema-gen.mjs`; generated set `src/project/generated/{types.ts,validate.mjs,validate.d.mts}` and `src/parts/generated/{types.ts,validate.mjs,validate.d.mts}` (counts as 1); `scripts/schema-gen.test.mjs` |
| Modules and functions (schema-gen.mjs) | `const SCHEMA_DIR = 'docs/MASTER_PLAN/04_ARCHITECTURE/schemas'` (one constant: if the schemas move, one line changes); `export const AJV_MODULE = 'ajv/dist/2020.js'` (or `'ajv8/dist/2020.js'` when T-B2-17 Q6 chose the alias; T-B2-15 reads it); `generate(): Promise<Map<string, string>>` returns relative path to file text; `writeAll(files)`; `checkAll(files): string[]` returns the paths whose bytes differ; `main(argv)`: no flag writes, `--check` compares and also runs `validateExamples()`; `validateExamples(): string[]` loads the generated `.mjs` validators (dynamic `import()` of the written files, or of the in-memory text via a temporary file under `os.tmpdir()`) and validates the examples: `schemas/examples/*.project.json` against the project validator, `schemas/examples/components/*.component.json` and, when the folder exists, `src/parts/data/*.component.json` against the component validator. Options come from the T-B2-17 report |
| Output: validate.mjs (project) | Exports `validateProject`, `validateOp`, `validateOpEnvelope`, `validateProposal`, `validateReplayLog`, `validateFileEnvelope` (PDM 8), and eight section validators the op handlers need because three op fields are untyped in the schema (`sim.set.value`, `mech.set.value`, `domain.set.value`) and four ops merge a patch into an open object (`board.set`, `component.set`, `domain.patch`): `validateSimulation`, `validateDomains`, `validateFrame`, `validateBody`, `validateJoint`, `validateMount`, `validateBoard`, `validateComponent`. Each has an `errors` array after a failed call. One compile with `allErrors: true`: it costs 0.63 ms for 500 parts and 1,000 wires (PDM 9.6, VERIFIED with Ajv 8.17.1 `allErrors: true`), so ADR-0110 decision 2's "no `allErrors` in production" is dropped and the recovery view just takes the first 20 errors (R-028) |
| Output: validate.d.mts | `export interface SchemaError { instancePath: string; schemaPath: string; keyword: string; message?: string; params: Record<string, unknown> }`; `export interface Validator<T = unknown> { (data: unknown): data is T; errors: SchemaError[] \| null }`; `export const validateProject: Validator<import('./types.ts').Project>`; and so on. No import from `ajv` |
| Output: types.ts | Header comment: `Generated by scripts/schema-gen.mjs. Do not edit.` plus `export const GENERATED_FROM = { 'project.schema.json': '<sha256>', ... }`. Types for `Project`, `Op` (union on `k`), `OpEnvelope`, `Proposal`, `ReplayLog`, `FileEnvelope`, `Net`, `Wire`, `View`, `Placement`, and every other `$defs` entry, named after the `$defs` key. Erasable only: no `enum` |
| Data model | The two schemas |
| Algorithm | Read schemas; add both domain schemas to Ajv before compiling the project schema (their `$id`s are referenced); compile; `standaloneCode`; post-process only what the spike said is needed (inline runtime helpers; prepend the banner with the schema hashes); run the type generator; format with a fixed formatter step so output is stable (no timestamps, no absolute paths, sorted keys) |
| Validation and errors | A schema that fails to compile stops with Ajv's message and the schema path. `--check` prints each stale file and the command to fix it (`npm run schema:gen`) |
| Edge cases | Two runs give identical bytes. Line endings are LF. The generator never reads `schemas/tools/node_modules` |
| Permissions | None |
| Performance | Generation under 30 s; not part of the dev loop. The generated validator is loaded in the worker, not the first-load bundle (BUD-05); nothing in B2 imports it from a page |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests (`scripts/schema-gen.test.mjs`, Vitest picks `scripts/**/*.test.mjs`) | Generation twice is byte-identical; `--check` passes on a clean tree; `checkAll` reports a file when one byte is changed in memory; the project validator accepts the 5 examples and rejects the 12 mutations ported from `schemas/tools/negative-project.mjs` (read that file's list; port the mutations, not the file); the component validator accepts the 9 examples and rejects the 34 mutations of `negative.mjs` (port); `grep` of the generated files finds no `eval(` and no `new Function`; `GENERATED_FROM` hashes equal `sha256` of the schema files; type-level: `src/project/generated/types.test-d.ts` is not used (no type-test tool), instead a `// @ts-expect-error` file `src/project/generated/types.check.ts` compiled by `TP`: assigning an op with an unknown `k` fails, an `Op` of kind `net.connect` without `pin` fails |
| Integration | `TP` (the generated `types.ts` must satisfy `erasableSyntaxOnly`); `BUILD` once with a throwaway page that imports `validateProject` to answer the Turbopack half of spike Q3 (record in the commit message, do not commit the page) |
| Playwright | None |
| Fixtures | `schemas/examples/*.project.json`, `schemas/examples/components/*.component.json` |
| Acceptance | **Given** a field is added to `project.schema.json`, **When** `npm run schema:check` runs, **Then** it fails and names `src/project/generated/types.ts` and `validate.mjs`. **Given** a document with `schemaVersion` `"1.2"`, **When** `validateProject` runs, **Then** it returns false with an error on `/schemaVersion` |
| Observability | `schema:gen` prints each file with its size and gzip size |
| Release blockers | A generated file containing `eval`; `schema:check` red; `ajv` 6 and 8 conflicting so `npm run lint` fails |

**Delivery.** Definition of done: scripts, generated files, package.json, eslint ignore, test. Verify: `npm run schema:gen && npm run schema:check && npm run typecheck && npm run lint`; `npx vitest run scripts/schema-gen.test.mjs`. Documentation: a header block in `schema-gen.mjs` that says how to regenerate and what to do when the schema changes. Rollback: revert; remove the two devDependencies. Later tasks need: `Project`, `Op`, `OpEnvelope`, `Net` and so on; `validateProject`/`validateOp`; the component types and validator; the `schema:check` command in the exit gate.

---

### T-B2-05. `apply` A: dispatch, batches, meta, access, actor, board, component (13 kinds)

**Identity.** Subsystem: project core (operations). Phase B2. Priority: must. Dependencies: T-B2-02, T-B2-03, T-B2-04. Status: not started. Group G3.

**Intent.**

| Field | Content |
|---|---|
| Problem | Four systems change a lab in four ways today (TECHNICAL_DEBT D5; PRD line 399). The document needs one pure function that applies an operation, returns its inverse, and never half-applies (ADR-0104 decisions 1 and 2) |
| Target user | `ProjectSession` (T-B2-10), later the room server, the AI adapter and import |
| User story | As a maker, I want every edit to be a small named change I can undo and replay |
| Expected behaviour | `apply(state, op, ctx)` returns a new state and an inverse, or a reject code and no change. A batch commits whole or not at all. The 13 kinds of this task work with cascades and inverses |
| Success metric | For each of the 13 kinds the returned `inverse` equals a golden `Op[]` (exact equality). For the eleven kinds whose full inverse uses only ops registered by this task (`meta.set`, `access.grant`, `access.revoke`, `access.set`, `actor.set`, `actor.remove`, `board.add`, `board.set`, `component.add`, `component.set`, `component.swap`) apply then inverse also restores the `stateHash`. The cascading removals `component.remove` and `board.remove` have inverses built from `net.create`, `net.connect`, `view.place`, `wire.add`, `group.set`, `label.set`, `fault.set`, `input.set`, `runtime.set` and `source.add`, which do not exist until T-B2-06 and T-B2-07, so their hash round trip is asserted in T-B2-07 (`apply.inverse.test.ts`). A rejected op leaves the hash and the reference of every entity unchanged (`===`) |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. Read: `PROJECT_DATA_MODEL.md` 7.1 to 7.4, 5.1 to 5.6; `08_RESEARCH_SPIKES/RS-09-op-log-collab/src/doc.js` (the prototype `apply`, its cascade and the text transform at `:25`) and `src/mutants.js` (the two mutants the checker must catch: a skipped cascade and a skipped op) |
| New files | `src/project/apply/types.ts`, `index.ts`, `doc.ts`, `component.ts`, `board.ts`, and a test-support file `src/project/apply/fixtures.testing.ts` (reads the five example documents with `node:fs`; excluded from `tsconfig.portable.json`). It exports `loadExample(name): Project` and `monitorAt140(): Project`: the `env-monitor-esp32` final document minus the 26-character insert `  Serial.println("boot");\n` at `/sources` entry `src_main` position 130, minus the fault `flt_swap`, with `revision` 140 and `history.ops` set to `[]` (the true revision-140 history; `baseRevision`, `baseChain` and the checkpoint stay as in the file). The hash ignores `history`, so this does not change the hash, and an empty tail matters for replay: `source.edit` transforms over the ops of `state.history.ops` with `seq > baseSeq`, so a copy that still held the two history ops would transform the replayed edit over itself. The helper edits data directly; it uses no `apply`. T-B2-07 and T-B2-15 use it |
| Signatures: types.ts | `RejectCode`, `Reject`, `Author`, `ApplyContext`, `ApplyOutcome` (section 3); `type Handler<K extends Op['k']> = (state: Project, op: Extract<Op, { k: K }>, ctx: ApplyContext) => { state: Project; inverse: Op[] } \| Reject`; `isReject(x): x is Reject`; `reject(code: RejectCode, message: string, refs?: string[]): Reject`; `upsertById<T extends { id: string }>(items: readonly T[], item: T): T[]`; `removeById`; `findById`; `allEntityIds(state: Project): Set<string>` (every id of every kind, for `duplicate_id`); `pin(c: string, p: string): string` returns `c + '/' + p`; `pointer(...parts: (string \| number)[]): string` builds a JSON Pointer with `~0` and `~1` escapes; `mergePatch(target: unknown, patch: unknown): unknown` (RFC 7396: a `null` removes a key, objects merge, anything else replaces; the one copy, used by `board.set`, `component.set` and, in T-B2-07, `domain.patch`) |
| Signatures: index.ts | `HANDLERS: Partial<{ [K in Op['k']]: Handler<K> }>`; `IMPLEMENTED_KINDS: readonly Op['k'][]` (derived from `HANDLERS`); `apply(state: Project, op: Op, ctx: ApplyContext): ApplyOutcome` (a batch of one); `applyBatch(state: Project, ops: readonly Op[], ctx: ApplyContext): ApplyOutcome` |
| Context hook | `ApplyContext.invariants?: (next: Project, prev: Project) => Diagnostic[]`. `next` and `prev` share unchanged entities by reference, so a checker can limit itself to what changed. T-B2-08b supplies the real function; T-B2-10 passes it in. Until then tests pass a small stub. Any diagnostic with `severity: 'error'` makes the batch fail with `invariant` and the message `<code>: <message>` |
| Algorithm: applyBatch | (0) an op whose `utf8Length(canonicalize(op))` is over `LIMITS.opEnvelopeBytes` (65,536) is `quota` (PDM 7.2: `quota` is a limit of PDM 9.4, and 9.4 lists the 65,536-byte op envelope); this check runs first, so a huge op is never schema-validated, and a `CanonicalError` from `canonicalize` is `malformed`; (1) `validateOp(op)` from T-B2-04 for every op; the first failure is `malformed` with the first AJV error's `instancePath` in the message; (2) the batch is also `malformed` if it has more than 480 ops (12 steps of 40, PDM 7.5); (3) fold the handlers over the ops in order, each on the state the previous one returned; a `Reject` stops the batch; (4) run `ctx.invariants(next, prev)`; (5) set `revision = prev.revision + ops.length` and `meta.updatedAt = ctx.at`; (6) `inverse` is the per-op inverses in reverse op order, each op's inverse list kept in its own order, so running the list from the front undoes the batch. Unknown or not yet implemented kind: `malformed` with `op kind not implemented: <k>` |
| Handler: meta.set | Merge `set` into `meta`. `description: ""` and `tags: []` remove the field (PROPOSAL: the schema has no way to clear them, and the document never stores an empty optional string or array, PDM 6.3 and 7.2 `wire.route`). Inverse: `meta.set` with each previous value (`""` or `[]` where the field was absent) |
| Handler: access.grant, access.revoke, access.set | Permission: the author's actor is in `access.owners`, or `ctx.author.kind === 'system'`; else `permission`. `grant` upserts `{actor, role}`; the actor must be in `actors` at batch end (invariants hook, V3-ACTOR). `revoke` of a missing grant is `missing_target`; revoking the last owner (the actor is the only entry in `access.owners`) is `invariant`. `set` takes `visibility` and/or `owners` (1 to 8, all in `actors` at batch end). Inverses: `grant` undone by `revoke` or by `grant` with the old role; `revoke` by `grant`; `set` by `set` with old values |
| Handler: actor.set, actor.remove | Same permission rule. `set` upserts by `id`. `remove` is `referenced_by` while `access.owners`, `access.grants`, `provenance.createdBy`, `provenance.contributors` or a checkpoint `author` names the actor; `refs` holds the JSON Pointers (for example `/access/owners/0`, `/provenance/contributors/1`, `/history/checkpoints/0`). Inverses: `remove` by `set` with the old record |
| Handler: board.add, board.set, board.remove | `add`: id unique across all kinds (`duplicate_id`); `definition` has a `dependencies.components` entry with interface `role: board` (`unknown_definition`); at most 16 boards (`quota`); refdes unique (V3-REFDES, invariants hook); firmware `sources` and `entry` exist (V3-FW, hook). `set`: `set` and `params` are RFC 7396 merge patches (a `null` removes a key); `set` may touch only `label`, `variant`, `powerInput`, `refdes`, plus `firmware` with value `null` to remove it (PROPOSAL: the schema offers no other way to remove firmware, so the inverse of adding firmware would not exist); `firmware` replaces the whole field; the merged board is checked with `validateBoard`. `remove`: cascade in the next row. Inverses: `add` by `remove`; `set` by `set` with previous values (`null` for keys that were absent); `remove` by the batch described under cascade |
| Cascade (`removeInstance` in `component.ts`, used by `board.remove` and `component.remove`) | In one revision: delete the instance's pins from every net; a net left empty is deleted together with its wires and junctions, unless a check, fault or label names it, in which case the op is `referenced_by` (N9); delete placements of the instance in every view with their `legs`; delete wires with a pin end on the instance (and junctions left without a wire; groups drop the removed members, and a group left with fewer than two members is deleted, G2); delete mounts, world inputs, faults that aim at it, instruments, and (boards) the runtime; sources keep existing with `board` cleared. `referenced_by` while any check names one of its pins or a net that the removal empties; `refs` lists `/tests/<n>/checks/<m>` paths. Inverse of a removal: one batch that re-adds the instance, re-creates the deleted nets with `net.create`, re-connects surviving nets with `net.connect`, re-places with `view.place`, re-adds wires, junctions, groups, labels, and restores faults, inputs, instruments, runtime, mounts and source board links (a `source.remove` plus `source.add` pair, because there is no `source.set`). The order is dependency order, so it passes the deferred invariants |
| Handler: component.add, component.set, component.remove, component.swap | `add`: as `board.add` (limit 2,000; dependency role `part`). `set`: `set` may touch `label`, `refdes`, `locked`; `params` merge; keys must exist in the pinned interface and `{param}` bindings must name a parameter (hooks V3-PARAM, V3-PARAM-REF); merged component checked with `validateComponent`. `apply` does not check `locked`: PDM 5.5 says the editor refuses to move or delete a locked part and ops from tools still apply |
| `component.swap` | The new `definition` needs a dependency entry (`unknown_definition`). Every pin of the old definition that is in a net, a placement `legs` map, a wire end, a fault target or a check must be a key of `pinMap` (`missing_pin_map`), and each mapped pin must exist in the new interface (`missing_pin`). `pinMap` must be injective (`invariant`). Rewrite the pin in nets, `legs`, wire ends. Parameters absent from the new interface are dropped. Inverse: `component.swap` back with the inverted `pinMap`, then `component.set` with the dropped params |
| State transitions | None beyond the document itself. `locked` and `visibility` are plain fields |
| Data model | `Project` from T-B2-04. Field names are the schema's |
| Input and output schemas | Input: `Op` (schema `$defs/Op`). Output: `ApplyOutcome`. The envelope is not built here |
| API contracts | `apply`, `applyBatch`, `HANDLERS`, `IMPLEMENTED_KINDS`, `Reject`, `RejectCode`, `Handler`, `Author`, `ApplyContext`. These names are used by T-B2-06, T-B2-07, T-B2-10, T-B2-16 and later by the room server |
| Validation and errors | The 13 reject codes of PDM 7.2, closed. Every rejection: no change, not even to `revision` or `updatedAt` |
| Edge cases | A batch that adds a board and the dependency entry (`dep.set`, T-B2-07) before it is valid; `dep.set` is not implemented in this task, so tests build their dependency entries into the fixture state. Adding a component whose pin ids are in `legs` of a view: not applicable until `view.place`. `component.remove` of a part with no pins in any net is a plain removal. Remove then add with the same id in one batch is allowed (the id is free after the remove) |
| Permissions | As above: `access.*`, `actor.*` only |
| Performance | PROPOSAL budget: p95 under 1 ms per op at 500 parts and 1,000 wires. Handlers copy only the path they change (structural sharing) and never `JSON.parse(JSON.stringify(...))`. Full-array scans are allowed where the schema caps the array (2,000 components) |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `apply.merge-patch.test.ts`: `mergePatch` against all 15 cases of the RFC 7396 appendix, plus `null` removal inside nested objects. `apply.batch.test.ts`: empty batch is `malformed`; atomic: batch of 3 whose third op fails changes nothing (hash and `revision` equal, and every top-level section `===`); a hook error rejects with `invariant`; 481 ops is `malformed`; an op over 65,536 bytes is `quota`; inverse order for a 3-op batch; revision grows by the op count; `updatedAt` equals `ctx.at`; unknown kind. `apply.doc.test.ts`: per kind (`meta.set`, `access.grant`, `access.revoke`, `access.set`, `actor.set`, `actor.remove`): one accept case with its inverse (golden `Op[]`, and hash back, all six kinds use only ops of this task), one reject case per applicable code, the permission matrix (owner, editor, system, stranger), last-owner rule, `referenced_by` with exact `refs`. `apply.board.test.ts` and `apply.component.test.ts`: per kind accept plus inverse (golden `Op[]` for all five kinds; hash back for `board.add`, `board.set`, `component.add`, `component.set`, `component.swap`); rejects `duplicate_id`, `unknown_definition`, `quota`, `missing_target`, `missing_pin_map`, `missing_pin`, `referenced_by`; the cascade on the lesson example (`cmp_led1` removal removes its net membership, placement and wires; the returned `inverse` equals the golden `Op[]` stored beside the test, in dependency order; the hash round trip for this case is in T-B2-07 `apply.inverse.test.ts`, because the inverse needs `net.connect`, `view.place` and `wire.add`); N9 emptied net deleted, and rejected when a check names it; RFC 7396 patches including `null` removal; swap with a dropped parameter and its inverse. Mutant tests (from RS-09 `mutants.js`): a handler variant with the cascade skipped must fail a "no dangling wire" check written in the test, so the check is known to bite |
| Integration | `TP`; the structural sharing test: apply `component.set` on one component and assert all other components, all nets and all views are `===` |
| Playwright | None |
| Fixtures | The five example projects and `monitorAt140()` through `fixtures.testing.ts`; a 500-component synthetic document is built in T-B2-16, not here |
| Acceptance | **Given** a lesson project with an LED on net `net_gnd`, **When** `component.remove` runs for the LED, **Then** the LED, its placement, its wires and its pin in `net_gnd` are gone in one revision, and the returned `inverse` equals the golden `Op[]` (the hash round trip is asserted in T-B2-07, `apply.inverse.test.ts`, once all handlers exist). **Given** a check names a pin of the LED, **When** `component.remove` runs, **Then** it is `referenced_by` with the check's pointer in `refs` and the state is unchanged. **Given** a stranger author, **When** `access.grant` runs, **Then** `permission` |
| Observability | Reject codes only; the test prints the table of kinds covered |
| Release blockers | One of the eleven hash-restoring kinds where apply then inverse changes the hash; a golden inverse that differs; a reject that mutates anything |

**Delivery.**

| Field | Content |
|---|---|
| Definition of done | Six files, tests green, `IMPLEMENTED_KINDS` has 13 entries |
| Verify commands | `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project/apply` |
| Documentation | JSDoc on the exported names; the "how to add an op" page is T-B2-21 |
| Rollback | Revert. Nothing else imports the folder yet |
| Later tasks need | `Handler`, `reject`, `upsertById`, `removeInstance`, the `invariants` hook, `fixtures.testing.ts` (`loadExample`, `monitorAt140`) |

---

### T-B2-06. `apply` B: net, view, wire, group, junction, label (22 kinds)

**Identity.** Subsystem: project core (operations). Phase B2. Priority: must. Dependencies: T-B2-05. Status: not started. Group G4.

**Intent.**

| Field | Content |
|---|---|
| Problem | Connectivity and drawing edits are the bulk of editing, and the rule "a wire never changes a net" must hold by construction (ADR-0101) |
| Target user | The Studio editor (B4), the AI adapter, the room server |
| User story | As a maker, I want cutting a drawn wire and cutting a connection to be different, explicit actions |
| Expected behaviour | The 22 kinds work with their cascades and inverses; wires add no net member; deferred invariants N1 to N3, W1 to W4, B2 and B4 can be checked at batch end |
| Success metric | The returned `inverse` equals a golden `Op[]` for all 22 kinds. Apply then inverse restores the `stateHash` for 20 of them, whose full inverse uses only ops registered by T-B2-05 and this task. `net.merge` and `net.delete` are asserted structurally here, because their inverses use `fault.set` and `test.set` (T-B2-07); their hash round trip is in `apply.inverse.test.ts`. Rejected ops leave the state `===`. Random op sequences (T-B2-16) never produce a dangling wire |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | `src/project/apply/index.ts` (edit: register the handlers; add the 22 kinds to `HANDLERS`). Read PDM 5.6, 5.7 and the 7.2 table rows for these kinds |
| New files | `src/project/apply/net.ts`, `view.ts`, `wire.ts` and tests. `view.ts` holds `view.*` and `group.*`; `wire.ts` holds `wire.*`, `junction.*`, `label.*` |
| Handlers: net.ts | `net.create {net}`: members must exist (`missing_pin`, in `nets` N1) and be free (`pin_in_use`); name unique (N3, hook); quota 5,000 nets and 2,000 members. `net.connect {net, pin, move?}`: the net must exist (`missing_target`); a pin already in another net is `pin_in_use` unless `move: true`, which first disconnects it (with its consequences) from the other net; a pin already in this net is a no-op that still counts as an op with an empty inverse. `net.disconnect {pin}`: removes the pin; wires with a pin end there are deleted; a net that would be empty is deleted with its wires and junctions unless a check, fault or label names it (`referenced_by`, N9). `net.merge {into, from}`: both exist; move members; rewrite `net` in wires, junctions, labels, faults and checks; delete `from`. `net.split {net, into, pins}`: new net `into` (id free) takes `pins`; wires wholly inside one side follow it, crossing wires are deleted, junctions follow their wire, orphan junctions are deleted. `net.rename {id, name?, class?}`: name unique; empty name removes it (same rule as `meta.set`). `net.delete {id}`: cascades its wires, junctions, labels and any fault that named it; `referenced_by` while a check names it. Inverses (main case): `create` by `delete`; `connect` by `disconnect` (or by `connect` with `move` back when the pin came from another net); `disconnect` by `connect` plus re-adding the wires it deleted (or `net.create` plus wires when the net died); `merge` by `net.split` plus `net.rename` for `from`, plus `label.set`, `fault.set`, `test.set` for each rewritten reference; `split` by `merge` plus re-adding the crossing wires; `rename` by `rename`; `delete` by the batch that re-creates the net, wires, junctions, labels, faults |
| Handlers: view.ts | `view.add {view}`: kind, `surface` rules (`surface` only for breadboard views and it must be a component whose pinned interface has role `surface`: `unknown_definition`); at most 16 views. `view.remove {id}`: deletes the view's wires, junctions, labels, groups and placements. `view.set {id, name?, surface?}`: `kind` never changes (not in the op); a surface change is `referenced_by` while the view has any `legs` or any `hole` wire end, with those as `refs`. `view.place {view, placement}`: upsert by `c`; `c` must be a board or component (`missing_target`); `legs` only in breadboard views (V3-LEGS, hook) and each leg's pin must exist and each hole must be a pin of the surface (hooks V3-LEG, V3-HOLE, V3-HOLE-TWICE, B2, B4 at batch end); at most 2,000 placements. `view.unplace {view, c}`: removes the placement and its legs, and the part from its group (G2). `group.set {view, group}`: upsert by `id`; members exist in the view and in no other group (V3-GROUP, hook), 2 to 2,000 members. `group.remove {view, id}`: only the group |
| Handlers: wire.ts | `wire.add {view, wire}`: W1 net exists, W2 each pin end is a member of `wire.net` (not a net change), W3 junction end exists in the view on the same net, W4 hole end names the view's surface, W7 not both ends the same pin; id unique; at most 5,000 wires per view. `wire.route {view, id, route_mm}`: `[]` clears the field (the document never stores an empty route). `wire.remove {view, id}`: never changes a net (W5); also leaves any group (G2). `wire.set {view, id, color?}`: omitted `color` clears it; it cannot change `net`, `from` or `to`. `junction.add`/`junction.remove`: removal deletes the wires attached and leaves its group. `label.set`/`label.remove`: upsert by `id`; removal leaves its group. The W and B rules are checked by T-B2-08b's hook at batch end; `wire.ts` checks the cheap per-op ones (existence, quota, id) itself |
| Inverses | `view.add` by `remove`; `view.remove` by one batch that re-adds the view with all its content; `view.set` by `set`; `place` by `place` with the old placement or `unplace`; `unplace` by `place` (and `group.set` to restore membership); `wire.add` by `wire.remove`; `wire.route` by `route` with the old route (`[]` if none); `wire.remove` by `wire.add` (and `group.set`); `wire.set` by `wire.set` with the old colour or none; `group.*`, `junction.*`, `label.*` by the matching pair |
| State transitions | None |
| Data model | `Net`, `View`, `Placement`, `Wire`, `WireEnd`, `Junction`, `Label`, `Group` from the generated types |
| Validation and errors | As PDM 7.2: `missing_target`, `missing_pin`, `pin_in_use`, `duplicate_id`, `referenced_by` with `refs`, `quota`, `invariant`. Per-op checks run at once; the deferred ones run at batch end through the hook |
| Edge cases | `net.merge` of a net with itself is `malformed`. `net.split` that would leave the old net empty is `invariant`. A wire whose both ends are junctions of the same net is allowed. `net.connect` with `move` to the same net is a no-op. `wire.add` before `net.connect` in the same batch is valid (W2 is deferred), in the other order it is also valid |
| Permissions | None |
| Performance | `net.connect`, `wire.add` and `view.place` are the hot path (a drag sends one `view.place` on release). They must be O(members of one net plus entities of one view); no scan of all views. Budget in T-B2-16 |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `apply.net.test.ts`, `apply.view.test.ts`, `apply.wire.test.ts`: per kind one accept with inverse and the reject codes above; the cascades on the lesson example (`net.disconnect` deletes the wires on that pin, and its inverse restores the hash: it uses `net.create`, `net.connect`, `wire.add`, `junction.add` and `group.set`, all registered by T-B2-05 and this task; `net.delete` removes labels and faults and `net.merge` rewrites a wire, a label, a fault and a check: for these two the inverse is asserted as an exact golden `Op[]` that contains `fault.set` and `test.set`, and the hash round trip is in T-B2-07 `apply.inverse.test.ts`); `view.remove` and its inverse (`view.add`, `view.place`, `wire.add`, `junction.add`, `label.set`, `group.set`) restore the hash here; a rejected op in each file leaves the state `===`; N9 both outcomes; W1 to W4, W7 as batch-level failures through a stub hook written in the test (the real rules arrive in T-B2-08b, one group later (G5), and are wired in T-B2-10, whose `session.invariants.test.ts` repeats these batch-level cases with the real `checkBatch`); G2 (group of two loses a member and disappears); `wire.route` with `[]`; `wire.set` clearing a colour; `net.split` crossing wires; `view.set` surface change with legs present is `referenced_by` with refs |
| Integration | The 22 kinds are in `IMPLEMENTED_KINDS`; `TP` |
| Playwright | None |
| Fixtures | Example projects through `fixtures.testing.ts` |
| Acceptance | **Given** a wire in a breadboard view on `net_d13`, **When** `wire.remove` runs, **Then** `net_d13` still has all its members. **Given** the same net, **When** `net.disconnect` runs for the LED pin, **Then** the wire that ended on that pin is gone, and the inverse (`net.connect` and `wire.add`, both registered at this point) brings back both and restores the `stateHash` |
| Observability | Reject codes; counts of kinds covered |
| Release blockers | Any wire add or remove that changes `nets` |

**Delivery.** Definition of done: three handler files, `index.ts` edited, tests green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project/apply`. Rollback: revert. Later tasks need: the 22 kinds in `HANDLERS`.

---

### T-B2-07. `apply` C: sources, simulation, mechanical, parameters, tests, assets, dependencies, document-level (29 kinds)

**Identity.** Subsystem: project core (operations). Phase B2. Priority: must. Dependencies: T-B2-06. Status: not started. Group G5.

**Intent.**

| Field | Content |
|---|---|
| Problem | The rest of the vocabulary: code, simulation setup, faults, checks, assets, dependencies and the document-level fields. Without it the 64 kinds are not whole and the replay cannot rebuild a lesson |
| Target user | Studio code editing (B4), faults (B10), labs (B12), robotics and drone editors (B15, B17) |
| User story | As a maker, I want code edits, faults and settings to be undoable operations like everything else |
| Expected behaviour | The 29 kinds work. `IMPLEMENTED_KINDS` equals the 64 `k` values of the schema, checked by a test that reads the schema |
| Success metric | The all-kinds coverage test; apply then inverse restores the hash for each kind of this task; and `apply.inverse.test.ts` restores the `stateHash` for every cascade that T-B2-05 and T-B2-06 could assert only structurally (`component.remove`, `board.remove`, `net.merge`, `net.delete`), repeating `net.disconnect` and `view.remove` as a cross-check |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | `src/project/apply/index.ts` (edit: register 29 handlers). Read PDM 5.8 to 5.17, 7.2 |
| New files | `src/project/apply/source.ts`, `sim.ts`, `misc.ts` and tests, among them `apply.coverage.test.ts` and `apply.inverse.test.ts` |
| source.ts | `source.add {source}`: path rules V3-PATH (unique ignoring case, no `..`, no leading `/`, no reserved Windows names), at most 20 sources and 262,144 UTF-8 bytes each (`quota`); content line ends normalised to LF; content is not NFC-normalised (PDM 6.3). `source.remove {id}`: clears `firmware.sources` of any board and rejects `referenced_by` if it is a firmware `entry`. `source.rename {id, path}`. `source.edit {id, baseSeq, pos, del, ins}`: offsets in UTF-16 code units; `pos + del` must be within the text (`malformed`); the range is transformed over every later `source.edit` of the same file found in `state.history.ops` with `seq > baseSeq` (ported from RS-09 `src/doc.js:25`: server order wins ties); a `baseSeq` below `history.baseRevision` is `stale_base`; resulting text must stay within the byte cap (`quota`). Inverse of an edit: an edit that restores the deleted text and removes the inserted text, with `baseSeq` equal to the `seq` this edit will get (`state.revision + 1`) so it transforms over later edits (PDM 7.4). The inverse of `source.add` is `source.remove`, and the other way round |
| sim.ts | `sim.set {key, value}`: `key` in `seed`, `duration_ms`, `solver`, `physics`, `environment`; the new `simulation` section is checked with `validateSimulation`. `runtime.set`/`runtime.remove`: `runtime.board` must be a board (V3-RT); at most 16. `input.set`/`input.remove`: bound to an existing component and pins (V3-INPUT, V3-INPUT-PIN); at most 128. `script.set {script}`: replaces `simulation.world.script`, sorted on write by `t`, then input id, then original order (PDM 6.2); every event names an input (V3-SCRIPT); at most 10,000. `fault.set`/`fault.remove`: upsert by `id`; target names existing components, pins or nets (V3-FAULT); at most 200; `fault.set` with `enabled` toggles. `instrument.set`/`instrument.remove`: at most 64. All inverses are the matching previous value or the matching add/remove |
| misc.ts | `mech.set {collection, value}`: upsert by the value's `id` into `frames`, `bodies`, `joints` or `mounts`; the value is checked with the matching `validateFrame` etc.; frames stay a forest (V3-FRAME-CYCLE), joints name bodies. `mech.remove`: a frame still used by children, bodies or mounts is `referenced_by`. `param.set`/`param.remove`: removal is `referenced_by` while anything binds `{param: id}` (refs list the components). `test.set`/`test.remove`: `test.set` replaces the whole case with its checks; at most 64 tests and 200 checks each; check ids unique within the test (V3-CHECK-DUP). `asset.add`/`asset.remove`: at most 256; removal `referenced_by` while `meta.thumbnail` or a source or replay refers to it. `dep.set {dependency}`: upsert by `{ref, version}`; `dep.remove {ref, version}`: `referenced_by` while a board or component uses that exact version. `guide.set {guide}`: replaces the guide. `provenance.set {thirdParty?, contributors?, remove?}`: upserts by `id` and `actor`, deletes the `remove` entries; contributors must be in `actors` (V3-ACTOR hook); this is the only op that can change a `review` state (D-017). `license.set {license}`. `domain.set {domain, value}`: replaces `domains.<domain>`; check with `validateDomains({[domain]: value})`; import and migration only (`author.kind` `import` or `system`, else `permission`). `domain.patch {domain, patch}`: RFC 7396 merge patch into `domains.<domain>.data`, checked with `validateDomains`; `null` removes keys; `schemaVersion` of the domain never changes here |
| RFC 7396 | `domain.patch` uses `mergePatch` from `apply/types.ts` (T-B2-05 owns it and tests it against the RFC 7396 appendix cases). This task adds no second copy |
| Data model, validation, errors | Generated types; reject codes as PDM 7.2 |
| Edge cases | `source.edit` with `del` beyond the end is `malformed`; an edit that inserts a lone surrogate is `malformed`; `source.rename` to a path that exists only in a different case fails V3-PATH at batch end (`invariant`). `fault.set` with a fault whose `target.nets` names a net that is deleted in the same batch fails at batch end. `dep.remove` while only a placeholder (an unknown part) uses it is still `referenced_by` |
| Permissions | `domain.set` as above; nothing else |
| Performance | `source.edit` is O(file size) plus the later edits since `baseSeq` (at most 1,000 tail ops); under 1 ms for a 64 KiB file (ESTIMATED) |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `apply.source.test.ts`: add/remove/rename accept and reject; `source.edit` insert, delete, replace, whole-file replace (`pos 0, del len, ins text`), UTF-16 offsets with an emoji, the transform over one and over three later edits (golden results ported from RS-09's doc.js cases), `stale_base`, inverse restoring text and hash, LF normalisation, byte cap. `apply.sim.test.ts`: per kind accept and reject, `sim.set` with a bad seed (4,294,967,296) rejected, script sorting, fault toggle. `apply.misc.test.ts`: per kind; `mech.set` cycle rejected; `param.remove` `referenced_by` with refs; `dep.remove` `referenced_by`; `provenance.set` review change; `domain.patch` null removal; `domain.set` permission. `apply.coverage.test.ts`: read `project.schema.json`, collect the 64 `k` values, assert `IMPLEMENTED_KINDS` equals them, and for every kind assert the test suite contains a case (the test keeps a table `COVERED: Record<Op['k'], string>` mapping each kind to the test file that covers it, and fails if a kind is missing; so adding an op to the schema fails this test until it is handled and covered). `apply.inverse.test.ts`: runs after all 64 handlers exist; for each case it applies the op, then `applyBatch(next, inverse)`, and asserts `stateHash` equal and `revision` different. Cases on the lesson example: `component.remove` of `cmp_led1`; `board.remove` of `brd_uno` with its runtime, inputs, faults and sources (a fixture state built by ops); `net.merge` where a wire, a label, a fault and a check name the merged net; `net.delete` with a label and a fault; `net.disconnect`; `view.remove`. It also asserts that the inverse lists stored as goldens in T-B2-05 and T-B2-06 still equal the live ones |
| Integration | `TP` |
| Playwright | None |
| Fixtures | Example projects; the `env-monitor-esp32` example for `source.edit` and `fault.set` (its history has exactly those two ops); `monitorAt140()` from `fixtures.testing.ts` (T-B2-05) |
| Acceptance | **Given** `monitorAt140()` from `fixtures.testing.ts` (T-B2-05: the final example minus the 26-character insert and minus fault `flt_swap`, revision 140, `history.ops` empty), **When** the two history ops of the env-monitor example are applied with `applyBatch` (one batch per envelope, `ctx.at` the envelope's `at`), **Then** the final `stateHash` is `8e52bbe4fc07a56800045de1579b8a22c725fb129a8de73e6efea5b08a3c0e79`. **Given** the schema gains a 65th op kind, **When** the tests run, **Then** `apply.coverage.test.ts` fails and names it |
| Observability | The coverage table is printed |
| Release blockers | `IMPLEMENTED_KINDS.length !== 64`; a cascade in `apply.inverse.test.ts` whose hash differs |

**Delivery.** Definition of done: three handler files, `index.ts` edited, coverage test green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project/apply`. Rollback: revert. Later tasks need: all 64 kinds; the coverage test is the guard for later schema minors; `apply.inverse.test.ts` is the guard for new inverses.

---

### T-B2-09. Canonical form, `stateHash`, hash chain, migrations

**Identity.** Subsystem: project core (serialisation). Phase B2. Priority: must. Dependencies: T-B2-02, T-B2-03, T-B2-04. Status: not started. Group G3.

**Intent.**

| Field | Content |
|---|---|
| Problem | "Same content, same bytes, same hash" (P6, DET-3) needs one function that sorts sets, quantises numbers, normalises text and hashes, and a migration chain that refuses newer files without damage (R-026, R-027) |
| Target user | The store (B3), files (B3), rooms (B7), the tests |
| User story | As a maker, I want my project to hash the same after a save, a reload and a copy, and to refuse politely when it came from a newer iynk |
| Expected behaviour | `stateHash(doc)` ignores set order, `history`, `exports`, `meta.updatedAt` and `revision`. `migrate` returns `current`, `migrated` or `newer`, and never alters its input |
| Success metric | Order independence over 1,000 shuffled documents; `stateHash` of the five examples equals PDM 9.6 (VERIFIED today with the prototype; first 16 hex: `2034a1b8f508959a`, `8e52bbe4fc07a568`, `1f6c95022ebf5736`, `f947b3b3f79a80d1`, `62e876e86e43eae9`); hash at 500 parts and 1,000 nets under 20 ms (R-026 PROPOSAL) |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. Reference: `PROJECT_DATA_MODEL.md` 6.1 to 6.4, 10; `schemas/tools/project-lib.mjs:8-30` (read only; no test in this task imports it, see T-B2-03) |
| New files | `src/project/normalize.ts`, `hash.ts`, `migrate.ts` and tests |
| normalize.ts | `normalizeForWrite(doc: Project): Project` (pure; unchanged sub-objects keep their reference; idempotent); `toCanonicalText(doc: Project): string` (= `canonicalize(normalizeForWrite(doc))`); `toFileText(doc: Project): string` (= `prettyPrint(...)`, the `.iynk` body form); `SET_SORT_KEYS` (the PDM 6.2 table as data: path pattern to key function). Rules: every set array sorted by its key by UTF-16 code unit; sequences untouched (`history.checkpoints`, `history.ops`, `exports`, `world.script` stable sorted by `t`, input id, original order, `route_mm`, `guide.steps` and the other guide sequences, `firmware.sources` is a set by id); strings that are ids, names, labels, paths and `Text` values are NFC; `sources[].content` gets LF line ends and no NFC; lengths in fields ending `_mm` to 0.001, angles in `_deg` to 0.01, authored time (`t`, `atMs`, `withinMs`, `runMs`, `duration_ms`) to 0.001 ms; `domains.*` and `ext` are not quantised (their schemas own units, RC-42); `-0` to `0`; `undefined` fields removed; `null` kept (only `StateCond` may hold one) |
| hash.ts | `stateHash(doc: Project): string` = `sha256Hex(canonicalize(stripVolatile(normalizeForWrite(doc))))` where `stripVolatile` removes `history`, `exports`, `meta.updatedAt`, `revision` (RC-31); `canonicalBytes(doc): number` (UTF-8 length of `toCanonicalText`, for V4-SIZE); `chainStart(projectId: string): string` (`sha256Hex('iynk.chain.v1:' + projectId)`); `chainNext(prev: string, envelope: OpEnvelope): string` (`sha256Hex(prev + canonicalize(envelope))`); `foldChain(baseChain: string, ops: readonly OpEnvelope[]): string`; `checkpointOf(doc, kind, label, author, at): Checkpoint` |
| migrate.ts | `CURRENT_SCHEMA_VERSION = '1.1'`; `parseSchemaVersion(v: unknown): { major: number; minor: number } \| null`; `interface Migration { from: string; to: string; run(doc: unknown): unknown }`; `MIGRATIONS: readonly Migration[] = []` (PDM 10.1: no migration exists before the first public release; the file ships empty and tested through a synthetic chain); `type MigrateResult = { kind: 'current'; doc: unknown } \| { kind: 'migrated'; doc: unknown; steps: { from: string; to: string }[]; original: unknown } \| { kind: 'newer'; version: string; message: string } \| { kind: 'invalid'; failure: Failure }`; `migrate(input: unknown, ctx: { at: string; app: string }, chain?: readonly Migration[]): MigrateResult` (the `chain` parameter exists for the test) |
| Rules implemented | M1 pure; M2 composed in order from the document's version; M3 a migration run twice gives the same bytes (the test runs every migration on its own output); M5 a document whose `schemaVersion` is greater than current, including a newer MINOR, returns `newer` with the message `made by a newer iynk, version N` and the input object untouched (`Object.isFrozen` test with a deep-frozen input); M6 `migrated` returns the original for the backup and appends `{from, to, at, app}` to `provenance.migrations` (max 64: drop the oldest); M7 a MAJOR step drops `history.ops` and keeps checkpoints; M9 `domains.*` migrate by their own chains: `migrateDomains` hook in the chain type, empty today. `invalid`: not an object, no `format` of `iynk.project`, or an unparseable version. The version check runs before schema validation because the schema pattern `^1\.` rejects a `2.0` document with a misleading message |
| Fixtures rule (M4) | `src/project/migrations/` does not exist yet. `migrate.test.ts` includes `assertFixturesComplete(chain, fs)`: for each migration it expects `src/project/migrations/fixtures/<from>-<to>/input.json` and `expected.json` and fails if missing; with zero migrations it passes vacuously, and a test with a synthetic two-step chain proves it fails when a fixture is missing |
| Data model | Generated types; `provenance.migrations` |
| Validation and errors | `normalizeForWrite` throws `CanonicalError` on NaN or an infinity (a writer that meets one fails the save, PDM 4.2) |
| Edge cases | A set array containing two elements with the same key is kept in input order (stable) and V3 reports the duplicate. NFC applies to `meta.title` but not to `sources[].content`. A document with `history.ops` longer than 1,000 is hashed anyway (history is outside the hash) |
| Permissions | None |
| Performance | `stateHash` for 500 parts and 1,000 nets: canonicalise plus hash 3.8 ms with `node:crypto` (VERIFIED, PDM 6.4); with the JS SHA-256 and `normalizeForWrite` expect 8 to 15 ms (ESTIMATED). The test prints the number and asserts under 100 ms. If the median is over 20 ms it is recorded for Amar; the hash then runs in the `ProjectWorker` (B3), which is already the plan |
| Migration | The migration framework itself |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `normalize.test.ts`: idempotent on the five examples; shuffled set order and key order give equal `toCanonicalText` over 1,000 documents (shuffle with the seeded `rng`; the documents are the examples with extra synthetic components); NFC (decomposed `é` becomes one code point in a title, not in a source); quantisation (`x_mm: 0.1+0.2` becomes `0.3`); `world.script` stable sort; `domains` untouched; `-0`; `toFileText` of each example is byte-identical to the file on disk (V1, PDM 6.1: "the examples are pretty form"). `hash.test.ts`: the five example hashes (first 16 hex as above, full value from the T-B2-15 table); hash unchanged when `revision`, `updatedAt` or `history` change; changes when a net member changes; chain vectors (`chain_0` for `prj_demo` and `chain_1`, section 0.1); `foldChain` over the env-monitor history ops; speed print. `migrate.test.ts`: current; newer major (`2.0`), newer minor (`1.2`) both `newer` with the input deep-frozen and unchanged; garbage; synthetic chain `1.0`, `1.1` run in order; M3 twice-same; M6 provenance entry; M7 history drop; missing-fixture failure |
| Integration | `TP` |
| Playwright | None |
| Fixtures | `schemas/examples/*.project.json` |
| Acceptance | **Given** a project saved to file text and parsed again, **When** `stateHash` runs on both, **Then** they are equal. **Given** a file with `schemaVersion` `"1.2"`, **When** `migrate` runs, **Then** `newer` and nothing else happens. **Given** an op applied and then its inverse, **When** hashes are compared, **Then** equal while `revision` differs (RC-31) |
| Observability | Hash timings printed; the `newer` message is the one the UI will show |
| Release blockers | Any example hash different from the table; `migrate` mutating its input |

**Delivery.** Definition of done: three modules, tests green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project/normalize.test.ts src/project/hash.test.ts src/project/migrate.test.ts`. Documentation: JSDoc; "how to write a migration" is a 10-line comment at the top of `migrate.ts`. Rollback: revert. Later tasks need: `stateHash`, `toFileText`, `toCanonicalText`, `canonicalBytes`, `chainStart`, `chainNext`, `foldChain`, `migrate`.

---

### T-B2-11a. Part descriptor validation, semantic rules, registry

**Identity.** Subsystem: parts. Phase B2. Priority: must. Dependencies: T-B2-02, T-B2-03, T-B2-04. Status: not started. Group G3. Split from the first T-B2-11 by the review of 2026-10-27; the pinned interface, pin rules and fallback art are T-B2-11b.

**Intent.**

| Field | Content |
|---|---|
| Problem | A part is data (R-029). Nothing validates a descriptor or resolves a part id |
| Target user | The document (interface snapshots), the netlist, Studio (B4), custom parts (B11) |
| User story | As a maker, I want a bad part file to be refused with a clear list of what is wrong, and a good one to be found by id and version |
| Expected behaviour | `validateDescriptor` runs the JSON Schema and cross-reference checks S-01 to S-09, S-11, S-13, S-14. `createRegistry` stores descriptors by `id@version` and refuses a second file with the same id and version but different bytes |
| Success metric | The 9 example descriptors validate; the 34 mutations of `schemas/tools/negative.mjs` are rejected, each by the rule or the schema error named for it |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. Reference: `COMPONENT_SCHEMA.md` 4.1, 4.5, 4.13, 6.1 to 6.5; `schemas/tools/semantic.mjs` (78 lines, the rules to port); `schemas/tools/negative.mjs` (read as a list of mutations to port as data; no test imports it, because it pulls in the Ajv 8 that a fresh checkout lacks) |
| New files | `src/parts/descriptor.ts`, `semantic.ts`, `registry.ts` and tests |
| descriptor.ts | `type Descriptor` (the generated component root type); `interface DescriptorCheck { ok: boolean; diagnostics: Diagnostic[] }`; `validateDescriptor(value: unknown, opts?: { origin?: 'core' \| 'local-user' \| 'imported-pack'; bytes?: number }): DescriptorCheck`: size cap 262,144 bytes (`P-SIZE`), schema (`validateComponent` from T-B2-04, diagnostics code `P-SCHEMA`, first 20 kept), then `semanticChecks`, then the id rules (`core.` only with origin `core`, `local.` for the person's own, S-15 part), then the copy check (banned word list `BANNED_WORDS = ['validated']`, D-007, over `what_it_models` and `not_modelled`, code `P-COPY`); `digestOf(d: Descriptor): string` = `'sha256:' + sha256Hex(canonicalize(d))`; `versionCompare(a: string, b: string): number` (semver) |
| semantic.ts | `semanticChecks(d: Descriptor): Diagnostic[]`: a TypeScript port of `semantic.mjs`, rule ids `S-01` (pin, source, layer, parameter ids unique; connector and group pins exist), `S-02` (every `{src}` resolves), `S-03` (rating scopes and `derived_from`), `S-04` (every rating key used exists), `S-05` (the `pick` member exists in the used slot), `S-06` (unit equals rating unit), `S-07` (every enum value used by `by_parameter` has a mapping), `S-08` (layer `reads`/`drives` resolve), `S-09` (failure and fault targets exist), `S-11` (pin positions inside the board outline), `S-13` (extension permissions name existing parameters and channels), `S-14` (`visual.breadboard.legs` are pins), plus `S-10` coverage half (`solver_requires` covers element kinds used) and `S-17` (non-core cause and symptom ids are `x-` or in the core registry; the core registry is not built in B2, so S-17 only checks the `x-` shape and is skipped for `core` origin). Each failing rule is one diagnostic: code `P-<S-id>`, path a JSON Pointer into the descriptor |
| registry.ts | `interface PartSummary { ref: string; version: string; name: string; category: string; tier: string; status: string; bytes: number; digest: string }`; `interface PartRegistry { add(value: unknown, opts?: { origin?: ...; bytes?: number }): Result<Descriptor, Diagnostic[]>; get(ref: string, version: string): Descriptor \| undefined; latest(ref: string): Descriptor \| undefined; versions(ref: string): string[]; list(): readonly PartSummary[]; resolveLegacy(legacyId: string): string \| undefined /* ref */; has(ref: string, version: string): boolean }`; `createRegistry(): PartRegistry`. `add` refuses (`P-DUP-BYTES`) the same `id@version` with a different digest; adding the same bytes twice is a no-op. A document never asks for "latest": `latest` exists for the palette only |
| Data model | `Descriptor` and its parts, from `component.schema.json` |
| Algorithm, state transitions | None beyond the above |
| Validation and errors | Diagnostics have `severity: 'error'` unless noted; a part with an error is not added; the result carries at most the first 20 (R-028 style, COMPONENT_SCHEMA 6.4) |
| Edge cases | A descriptor with newer `schema` (`iynk.component/2`) is refused with `P-NEWER` and the "made by a newer iynk" message. Unknown top-level `x_*` keys are allowed by the schema |
| Permissions | None |
| Performance | `validateDescriptor` on the largest example (L298N, 37 KB) under 5 ms (ESTIMATED) |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `descriptor.test.ts`: the 9 example descriptors pass (read from `schemas/examples/components/`); the 34 mutations from `negative.mjs` fail with a `P-SCHEMA` or `P-S-xx` diagnostic (port the list as data); `core.` with origin `local-user` fails; oversize fails; banned word fails; `digestOf` stable across key order. `semantic.test.ts`: one positive and one negative case per rule S-01 to S-14. `registry.test.ts`: add, get, latest, versions order (`1.10.0` after `1.2.0`), duplicate with different bytes refused, same bytes accepted, `resolveLegacy('led')` finds `core.led-5mm` (`identity.legacy_ids`) |
| Integration | `TP`; `src/parts/` imports only `core` and `import type` from `project` (the architecture test) |
| Playwright | None |
| Fixtures | The nine example descriptors |
| Acceptance | **Given** a descriptor with no `visual.fallback`, **When** `validateDescriptor` runs, **Then** it fails with a schema error at `/visual`. **Given** a part whose pin `P1` is missing from a `group`, **When** checked, **Then** `P-S-01` names the group. **Given** a project pins `core.led-5mm@1.0.0`, **When** version `1.1.0` is added to the registry, **Then** `get('core.led-5mm','1.0.0')` still returns the old descriptor |
| Observability | Diagnostic codes `P-SCHEMA`, `P-SIZE`, `P-NEWER`, `P-DUP-BYTES`, `P-COPY`, `P-S-01` to `P-S-17` |
| Release blockers | An example descriptor failing; a port of a rule that is weaker than `semantic.mjs` (compare outputs on the 34 mutations) |

**Delivery.** Definition of done: three modules, tests green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/parts/descriptor.test.ts src/parts/semantic.test.ts src/parts/registry.test.ts`. Documentation: JSDoc. Rollback: revert. Later tasks need: `validateDescriptor`, `createRegistry`, `digestOf`, `PartRegistry`.

---

### T-B2-11b. Pinned interface, pin rules, fallback art

**Identity.** Subsystem: parts. Phase B2. Priority: must. Dependencies: T-B2-02, T-B2-04 (it needs the generated `Descriptor` type and the core pin patterns, not T-B2-11a). Status: not started. Group G3, in parallel with T-B2-11a (the files are disjoint).

**Intent.**

| Field | Content |
|---|---|
| Problem | A project pins a snapshot of a part's interface, and a part with no artwork must still place, wire and run (F-097) |
| Target user | The document (interface snapshots), the netlist, Studio (B4), the converter |
| User story | As a maker, I want a part with no artwork to still place, wire and run |
| Expected behaviour | `interfaceOf` produces the snapshot a project pins. `checkPinRules` enforces the pin caps. `fallbackSpec` gives layout data for the five generic renderers; `placeholderSpec` does the same from a snapshot |
| Success metric | `interfaceOf` of the LED, resistor and SSD1306 descriptors equals the interface in the lesson and monitor examples (on `id`, `designator`, `type`, `polarity`, `position`, groups, params) |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. Reference: `COMPONENT_SCHEMA.md` 4.1, 4.5, 4.13; the nine example descriptors; the pinned interfaces in `lesson-uno-r3-button.project.json` and `env-monitor-esp32.project.json` |
| New files | `src/parts/pins.ts`, `fallback.ts` and tests |
| pins.ts | `type InterfaceSnapshot` (the generated `ComponentDependency['interface']`); `interfaceOf(d: Descriptor): InterfaceSnapshot`: `role` from `identity.kind` (`board` or `dev-board` category gives `board`; a descriptor with `identity.category` `breadboard` or a `surface` marker gives `surface`; everything else `part`; PROPOSAL, because the component schema has no explicit role field, so the rule is a table in this file with a test for each of the 9 examples), `pins` (`id`, `designator`, `type`, `class`, `polarity`, `position`; the legacy catalogue fields `net` and `header` are not in the component schema, so they are omitted), `groups` (descriptor `groups`), `params` (`id`, `type`, `unit`, `default`, `values`, `min`, `max` from `parameters`). `checkPinRules(d): Diagnostic[]`: at most 1,024 pins, 256 groups, 256 pins per group; pin ids match `PIN_ID_PATTERN`; group pins exist; a pin is in at most one `internal-short` group; `groupOfPin(d, pinId)`; `shortedPins(d, pinId): string[]` |
| fallback.ts | `interface FallbackSpec { renderer: 'generic-two-lead' \| 'generic-dip' \| 'generic-header-module' \| 'generic-terminal-module' \| 'generic-box'; label: string; bodyColour?: string; showPinLabels: boolean; body_mm: { w: number; h: number }; pins: { id: string; x_mm: number; y_mm: number; side?: 'left' \| 'right' \| 'top' \| 'bottom' }[] }`; `fallbackSpec(d: Descriptor): FallbackSpec`: positions from `pins[].position` when present, else an auto layout by renderer (two-lead: pins on the x axis 2.54 mm apart; dip: two columns 2.54 mm pitch, 7.62 mm apart; header-module: one row; terminal-module: one row 5.08 mm; box: sides by `visual.schematic.pin_sides`); body size from `dimensions.body` or `dimensions.board`, else computed; `placeholderSpec(iface: InterfaceSnapshot, label?: string): FallbackSpec` for the "unknown part" placeholder (R-028): same layout from the snapshot. Pure data; drawing the SVG is B4 |
| Data model | `Descriptor` from `component.schema.json`; `InterfaceSnapshot` from `project.schema.json` |
| Validation and errors | Diagnostics have `severity: 'error'`; `checkPinRules` returns at most the first 20 |
| Edge cases | A descriptor with no `pins` gives an empty snapshot (V6-SURFACE-EMPTY in T-B2-22 turns that into an error for a surface). `position` may be absent on every pin |
| Permissions, performance, migration | None. `interfaceOf` is linear in pins; 44 pins well under 1 ms |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `pins.test.ts`: `interfaceOf` for LED, resistor and SSD1306 deep-equals (on `id`, `designator`, `type`, `polarity`, `position`, groups, params) the interface entries of `lesson-uno-r3-button` and `env-monitor-esp32` for the same `ref`; role table for the 9; pin caps. `fallback.test.ts`: every renderer gives a position for every pin; no two pins at the same point; explicit positions kept; placeholder from a 44-pin snapshot |
| Integration | `TP`; `src/parts/` imports only `core` and `import type` from `project` (the architecture test) |
| Playwright | None |
| Fixtures | The nine example descriptors; the examples' interface snapshots |
| Acceptance | **Given** a descriptor with pins `A` and `K`, **When** `interfaceOf` runs, **Then** the snapshot has those two pins with the descriptor's `type` and `polarity`. **Given** a 44-pin snapshot, **When** `placeholderSpec` runs, **Then** it returns 44 distinct positions |
| Observability | Diagnostic codes from `checkPinRules`, all with the prefix `P-PIN-` |
| Release blockers | `interfaceOf` differing from a pinned interface in an example; two pins at one point |

**Delivery.** Definition of done: two modules, tests green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/parts/pins.test.ts src/parts/fallback.test.ts`. Documentation: JSDoc. Rollback: revert. Later tasks need: `interfaceOf`, `checkPinRules`, `fallbackSpec`, `placeholderSpec`, `InterfaceSnapshot`.

---

### T-B2-13. Netlist from connections, holes, and legacy names

**Identity.** Subsystem: project core (connectivity). Phase B2. Priority: must. Dependencies: T-B2-02, T-B2-04. Status: not started. Group G3.

**Intent.**

| Field | Content |
|---|---|
| Problem | Today the netlist is a by-product of the drawing and a typo in a hole name silently drops a wire (`figures/engine/bench-solve.js:41-42`, `:55`; audit A5). Everything that simulates, checks or explains needs one netlist that does not read the drawing (F-078, R-031, ADR-0101) |
| Target user | The simulator (B4 onward), the checks, the electrical-rules check (B10), the converter |
| User story | As a maker, I want the circuit to mean what I wired, whichever view I look at |
| Expected behaviour | `netlist(doc)` returns the electrical nodes from `nets` plus part-internal groups, and nothing else. Moving a part or re-routing a wire cannot change a byte of it |
| Success metric | Property test: 1,000 documents with random view content give byte-identical netlists; 500 parts and 1,000 nets in under 5 ms (R-031 PROPOSAL); the C-LEG test converts every leg of every figure part with no collision |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. Reference: `figures/engine/bench-solve.js:37-60` (the union-find to be replaced by data), `figures/engine/bench-bb.js:6-29` (`BBS`, `B.bbGeom`, `B.hole`), `PROJECT_DATA_MODEL.md` 3.4, 5.6, 5.7 |
| New files | `src/project/netlist.ts`, `holes.ts`, `legacy-names.ts` and tests |
| Roadmap wording | The roadmap row says "from parts, holes and wires only". Read it with PDM N4 and N7, which win (RECONCILIATION R4): the netlist reads `nets`, instances and the pinned `dependencies` interfaces. It reads no `views`: holes and wires are layout. Holes matter to the converter (deriving `nets` from a drawing) and to validation (B2, B4), not to `netlist()` |
| legacy-names.ts | `cleanName(s: string): string` (runs of non-alphanumerics to one `_`, ends trimmed, a leading digit gets `P`); `pinIdFromLeg(leg: string): string` (C-LEG table, first match wins: `+` `PLUS`, `-` `MINUS`, `V+` `VPLUS`, `+VS` `PLUS_VS`, rails `T+ T- B+ B-` to `RAIL_TP RAIL_TN RAIL_BP RAIL_BN`, rail holes `T+12` to `RAIL_TP12`, other runs to `_`, leading digit to `P1`; letters and digits unchanged); `boardPinIds(rows: readonly { header: string; pin: string; net?: string }[]): string[]` (C-PIN: walk in order; the first row with a given `net` takes its cleaned name; a later row with the same `net` takes `<header>_<pin>` cleaned; rows without `net` take `<header>_<pin>`; `5V` becomes `P5V`); `boardGroups(rows, ids): { id: string; kind: 'internal-short'; pins: string[] }[]` (all pins sharing one `net` name form a group of two or more); `legacyEndpointToPin(ref, ctx)` is in the converter, not here |
| holes.ts | `type SurfaceKind = 'half' \| 'full' \| 'mini'`; `interface SurfaceGeometry { cols: number; rails: boolean; railCols: number[] }`; `surfaceGeometry(kind): SurfaceGeometry` (the figure's `BBS` and `railCols` formula: `cols` 30, 63, 17; rail columns `c = 2 + k + floor(k / 5)` for `k` below `floor(cols * 5 / 6)` while `c <= cols`); `surfaceInterface(kind): InterfaceSnapshot` (role `surface`; pins: grid holes `a1`..`j30` and, when the surface has rails, `RAIL_TP<c>`, `RAIL_TN<c>`, `RAIL_BP<c>`, `RAIL_BN<c>` for each rail column `c` (RC-36); groups: `strip` per column and half (`S<c>u` rows a to e, `S<c>l` rows f to j; mini has no rails) and one `strip` per rail); `holeToPin(kind, legacyRef): string \| null` (`b10` is `b10`; `T+12` goes to the nearest rail column of that rail, as `B.hole` does at `bench-bb.js:23-30`, giving `RAIL_TP<c>`; anything else null); `stripOfHole(iface): Map<string, string>`. Counts to match: half 400 pins and 64 groups, full 838 and 130, mini 170 and 34 (PDM 5.3 and STUDIO O-S7) |
| netlist.ts | `interface NetlistNode { id: string; nets: string[]; names: string[]; pins: PinRef[] }` (`id` is `n:` plus the smallest pin key `c/p` by UTF-16 order, R-031; `nets` are the document net ids in the node, sorted; `names` their names, sorted; `pins` all member pins including those joined by groups, sorted by `c` then `p`); `interface Netlist { version: 1; nodes: NetlistNode[]; pinNode: Record<string, string>; diagnostics: Diagnostic[] }`; `netlist(doc: Project): Netlist`; `nodeOfPin(nl: Netlist, c: string, p: string): NetlistNode \| undefined`; `pinSets(nl: Netlist): string[][]` (sorted sets of `c/p`, for comparing with the figure's union-find classes); `netlistText(nl): string` (canonical, for equality tests) |
| Algorithm | Union-find over `c/p` keys (path compression, union by size). (1) For each document net, union all its connections. (2) For each instance, look up its dependency entry; for each `internal-short` or `plane` group in the interface, union the instance's pins of that group (surface `strip` groups are not used here: holes are not pins in `nets`, ADR-0101 option D). (3) A class becomes a node only if at least one document net is in it. (4) Diagnostics: `NL-JOINED-NETS` (warning) when a node holds more than one document net, naming both; `NL-SINGLE-PIN` (warning) for a net with one member (N5); `NL-UNKNOWN-DEF` (warning) for an instance with no dependency entry (V3-DEF reports the error). A closed switch (N4 last clause) is not applied: it is run-time state for the simulator |
| State transitions | None |
| Data model | Reads only `doc.nets`, `doc.boards`, `doc.components`, `doc.dependencies`. Nothing else |
| Validation and errors | `netlist` does not validate; it tolerates a dangling pin (the pin is a member of a node) so a half-broken document can still show nets; V3 reports the error |
| Edge cases | Two document nets joined only through an instance's group (the Uno ICSP pairs, PDM 3.4 C-PIN) become one node with two names. Output order does not depend on input order (sorted). Ids with a pin key containing `/`: pin ids cannot contain `/`, so `c/p` is unambiguous |
| Permissions | None |
| Performance | 500 parts, 1,000 nets, under 5 ms (R-031; the union-find is linear). Printed, ceiling asserted at 50 ms |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `legacy-names.test.ts`: the C-LEG table row by row; `5V` to `P5V`, `3V3` to `P3V3`, `J2.16` to `J2_16`; C-PIN on the Uno (44 rows, 44 unique ids, 6 groups: GND 5 pins, 5V 3 pins, pairs D11, D12, D13, RESET; PDM 3.4) and the ESP32 DevKitC (38 rows, 1 group of 3 GND), Nucleo F401RE (114 rows, 27 groups), DE10-Lite (144 rows): run on the output of `node scripts/gen-content-index.mjs --emit board/<id>` for all 12 boards (the test shells out with `node:child_process`; allowed in a test), asserts no collision and every id matches `PIN_ID_PATTERN`. The C-LEG file test: read every `figures/parts/*.js` (29 files), find `legs:` arrays (literal, or one identifier resolved to a `const NAME = [...]` in the same file, the `mpu6050.js:22` case), convert each, fail on a collision inside one part or an id that does not match the pattern; it prints the count of parts with non-empty legs (expected 28, VERIFIED by `grep`; PDM 3.4 says 27, and the doc is corrected in T-B2-21 if the count holds). `holes.test.ts`: the three counts above; first rail columns of the half board are 2, 3, 4, 5, 6, 8 (k = 5 gives 2 + 5 + 1); `holeToPin('half','T+12')` is `RAIL_TP12` and `T+13`'s nearest column is checked against the formula; `stripOfHole` for `e8` and `f8` are different strips, `a8` and `e8` the same; mini has no rails. `netlist.test.ts`: the lesson example gives exactly the five nodes of PDM 11.4 (`net_5v`, `net_d2`, `net_gnd`, `net_d13`, `net_led1a_res2p2`); the push button's `P2` is in `net_5v`'s node through its group; the poisoned-views test (a `Proxy` whose `views` getter throws; `netlist` still runs); random views property over 1,000 documents (shuffle placements, delete wires, add a second view, change coordinates, change routes): `netlistText` equal; joined-nets warning; single-pin warning; unknown definition; speed |
| Integration | `TP` |
| Playwright | None |
| Fixtures | Example projects; `figures/parts/*.js` and the emitted board JSON read at test time |
| Acceptance | **Given** the Uno pin 13 wired to an LED through a resistor and a button on pin 2 and ground, **When** `netlist` runs, **Then** exactly those connections are listed (R-031, M1 step 4). **Given** a part moved or a wire re-routed with the same ends, **When** the netlist is recomputed, **Then** it is byte-identical |
| Observability | Diagnostics `NL-*`; counts printed |
| Release blockers | `netlist` reading anything under `views`; a C-LEG collision |

**Delivery.** Definition of done: three modules and tests green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project/netlist.test.ts src/project/holes.test.ts src/project/legacy-names.test.ts`. Documentation: JSDoc; PDM 3.4 count correction listed for T-B2-21. Rollback: revert. Later tasks need: `netlist`, `pinSets`, `surfaceInterface`, `holeToPin`, `stripOfHole`, `pinIdFromLeg`, `boardPinIds`, `boardGroups`.

---

### T-B2-08a. Validation passes V1, V2, V4, V5 and the limits

**Identity.** Subsystem: project core (validation). Phase B2. Priority: must. Dependencies: T-B2-02, T-B2-03, T-B2-04, T-B2-09 (`toFileText` for V1). Status: not started. Group G4. Split from the first T-B2-08 by the review of 2026-10-27; the V3 rules are T-B2-08b.

**Intent.**

| Field | Content |
|---|---|
| Problem | A document can come from a file, a room, an import or an AI. It must be checked the same way every time, and a bad one must give a list of problems, not a crash (R-028, ADR-0110) |
| Target user | The loader (B3), the converter tests, the AI proposal dry-run (B13); T-B2-08b puts V3 on top |
| User story | As a maker, when a file is damaged I want the first 20 problems with their places and my data kept |
| Expected behaviour | `validateText` and `validateValue` run V0 (newer version), V1 (canonical bytes, warning), V2 (schema), V4 (limits) and V5 (hygiene) and return a report. T-B2-08b adds the V3 call |
| Success metric | The five examples have zero errors from these passes; the four variants of `schemas/tools/negative-project.mjs` that belong to V2 and V5 (id pattern, negative duration, path traversal at V2; `__proto__` at V5) are each rejected by the pass named for them |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. Reference: `PROJECT_DATA_MODEL.md` 9.1 to 9.4; `schemas/tools/validate-project.mjs` (252 lines, the prototype) and `schemas/tools/negative-project.mjs` (96 lines, the 12 variants; read, ported as data, never imported by a test) |
| New files | `src/project/validate.ts`, `limits.ts` and tests |
| validate.ts | `interface ValidationReport { ok: boolean; errors: number; warnings: number; diagnostics: Diagnostic[]; first20: Diagnostic[]; doc?: Project }`; `validateText(text: string): ValidationReport` (parseStrict, then V1 by comparing `toFileText(doc)` with `text` (warning `V1-EDITED-OUTSIDE`, "edited outside iynk"), then `validateValue`); `validateValue(value: unknown): ValidationReport` (migration check first: a newer version gives `V0-NEWER`; then V2, V4, V5; T-B2-08b inserts V3 between V2 and V4 with one call); `schemaDiagnostics(errors: SchemaError[]): Diagnostic[]` (code `V2-<keyword>`; the 64-branch `oneOf` of `Op` would print 64 errors for one bad op, so keep only the errors under the branch whose `k` const matches the instance's `k`, or the `k` error when none matches); `isFatal(report)` |
| limits.ts | `limitDiagnostics(doc: Project, canonicalBytes: number): Diagnostic[]` (V4: `V4-SIZE` canonical bytes over `LIMITS.canonicalBytes`; `V4-SOURCE` any source over 262,144 UTF-8 bytes; counts the schema cannot say); `hygieneDiagnostics(value: unknown): Diagnostic[]` (V5: `V5-KEY` for the keys `__proto__`, `constructor`, `prototype` at any depth, with the JSON Pointer; iterative walk, no recursion limit issues; `V5-SVG` is NOT in B2: it needs the SVG sanitiser that arrives with asset import in B3, and the corpus S1 to S12 of PDM 9.5 is listed there) |
| Algorithm | V2 first; V4 and V5 always run and guard every access, because the recovery view wants as many problems as possible, capped at the first 20 for display and 500 stored |
| State transitions, data model | None; `Diagnostic`, `Project` |
| Validation and errors | A pass never throws on a malformed document: it skips what it cannot read |
| Edge cases | `validateText` with a BOM or a duplicate key returns `V2-PARSE` with the `parseStrict` code. A document with 2,000 components and 5,000 nets (the limit) passes V2, V4 and V5 in under 40 ms (ESTIMATED from 2.14 ms Ajv at the limit, PDM 9.6) |
| Permissions, migration | None |
| Performance | V2 on 500 parts and 1,000 wires: Ajv 0.63 ms (VERIFIED, PDM 9.6) |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `validate.test.ts`: the five examples have no errors from V0, V2, V4, V5; `validateText(toFileText(doc))` has no V1 warning; one extra space gives `V1-EDITED-OUTSIDE` (warning, still ok); a newer version; garbage; first-20 truncation. `validate.negative.test.ts`: the four V2 and V5 variants (id pattern, negative duration, path traversal at V2; `__proto__` at V5), each asserting the pass and the rule id; the eight V3 variants are in T-B2-08b. `limits.test.ts`: size boundary (`canonicalBytes` exactly at and one over), source bytes with a multi-byte character, `__proto__` nested at depth 30, hostile cases from PDM 9.5 "Hostile input" except SVG and zip (zip is B3): 33-deep nesting (`parseStrict` already), a 100 MB asset claim (`size` field over the limit at V2) |
| Integration | `TP`; `src/project/validate.ts` imports only `core`, generated validators and sibling modules |
| Playwright | None |
| Fixtures | Examples; the four variants built by mutating the lesson example in the test |
| Acceptance | **Given** a document with `{"__proto__": {...}}` inside `ext`, **When** it is validated, **Then** `V5-KEY` with the path. **Given** a clean document edited by hand with different spacing, **When** validated, **Then** ok with a V1 warning. **Given** a file with a duplicate key, **When** `validateText` runs, **Then** `V2-PARSE` with code `duplicate_key` |
| Observability | Diagnostic codes `V0-NEWER`, `V1-EDITED-OUTSIDE`, `V2-*`, `V4-*`, `V5-KEY`; `first20` is what the recovery view shows |
| Release blockers | A V1, V2, V4 or V5 rule of PDM 9.2 absent here; a V2 or V5 negative variant accepted |

**Delivery.** Definition of done: two modules, tests green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project/validate.test.ts src/project/validate.negative.test.ts src/project/limits.test.ts`. Documentation: JSDoc. Rollback: revert. Later tasks need: `validateText`, `validateValue`, `limitDiagnostics`, `hygieneDiagnostics`, `ValidationReport`.

---

### T-B2-08b. Validation pass V3: references, invariants, `checkAll`, `checkBatch`

**Identity.** Subsystem: project core (validation). Phase B2. Priority: must. Dependencies: T-B2-08a, T-B2-09 (`foldChain` for the history rules), T-B2-13 (strips and holes). Status: not started. Group G5.

**Intent.**

| Field | Content |
|---|---|
| Problem | References and invariants (V3) are most of the rule list. The apply hook needs a fast batch-end version of them, and the whole-document version feeds the loader and the recovery view |
| Target user | The loader (B3), the apply hook (T-B2-10), the converter tests |
| User story | As a maker, when a wire names a net that does not exist I want to be told which wire, not to see a crash |
| Expected behaviour | `checkAll(doc)` runs every V3 rule. `checkBatch(next, prev)` runs the deferred invariants for the apply hook, limited to changed entities. `validateValue` now includes V3 |
| Success metric | The five examples pass V3 with zero errors; the eight V3 variants of `schemas/tools/negative-project.mjs` are each rejected by the rule named for them; the PDM 9.2 rules marked "Proto: no" are implemented; `checkBatch` equals `checkAll` restricted to changed ids on 100 seeded mutations |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | `src/project/validate.ts` (owned by T-B2-08a; edit: import `checkAll` and call it in `validateValue` between V2 and V4; one import and one line). Reference: PDM 9.1 to 9.4; `schemas/tools/validate-project.mjs` |
| New files | `src/project/semantic.ts`, `semantic.entity.ts`, `semantic.cross.ts` and tests. The split between the two rule files is a PROPOSAL; the rule list is PDM 9.2's |
| semantic.ts | The entry and the rule table. `RULES` as data in the file header (rule id, severity, file, "Proto: yes/no", text; the table is the contract and is exactly PDM 9.2, including the warnings V3-DEP-UNUSED, V3-STRIP-IMPLIED, V3-ROT); `checkAll(doc: Project): Diagnostic[]` (every V3 rule, history rules included); `checkBatch(next: Project, prev: Project): Diagnostic[]` (the rules the apply hook needs at batch end: V3-ID-DUP, V3-ACTOR, V3-DEF, V3-REFDES, V3-PARAM, V3-PARAM-REF, V3-PARAM-RANGE, V3-PIN, V3-PIN-TWICE, V3-NET-NAME, V3-PLACE, V3-LEGS, V3-LEG, V3-HOLE, V3-HOLE-TWICE, V3-GROUP, V3-VIEW-BOARD, V3-WIRE-NET, V3-WIRE-END, V3-WIRE-JCT, V3-WIRE-SURFACE, V3-WIRE-SELF, V3-STRIP-SHORT, V3-PATH, V3-FW, V3-RT, V3-INPUT*, V3-FAULT, V3-CHECK*, V3-FRAME*). `checkBatch` limits its per-entity rules to entities whose reference differs between `prev` and `next` (structural sharing, section 3) and runs the cross-entity uniqueness rules on the changed ids only, against index maps built once per call. History rules (V3-HIST-SEQ, V3-HIST-HEAD, V3-HIST-CP) and the chain fold run only in `checkAll` |
| semantic.entity.ts | Rules that read one entity and its pinned interface: V3-DEF, V3-PARAM, V3-PARAM-REF, V3-PARAM-RANGE, V3-PLACE, V3-LEGS, V3-LEG, V3-HOLE, V3-WIRE-END, V3-WIRE-SELF, V3-WIRE-SURFACE, V3-PATH, V3-FW, V3-RT, V3-INPUT*, V3-FAULT, V3-CHECK*, V3-FRAME*, V3-ROT, V3-DEP-UNUSED. Each rule is a function `(doc, changed?) => Diagnostic[]` that skips what it cannot read. Path rules (V3-PATH): no `..`, no leading `/`, no `\`, no control characters, no reserved Windows device names (`CON`, `NUL`, `COM1`...), unique ignoring case |
| semantic.cross.ts | Rules that compare entities: V3-ID-DUP, V3-ACTOR, V3-REFDES, V3-PIN, V3-PIN-TWICE, V3-NET-NAME, V3-HOLE-TWICE, V3-GROUP, V3-VIEW-BOARD, V3-WIRE-NET, V3-WIRE-JCT, V3-STRIP-SHORT, V3-STRIP-IMPLIED, and the history rules V3-HIST-SEQ, V3-HIST-HEAD, V3-HIST-CP. Uses `holes.ts` for strips and no netlist |
| Algorithm | As above. If V2 has errors, V3 still runs on the parts that are shaped well (each rule guards its access), capped at the first 20 for display and 500 stored |
| Data model, state transitions, permissions, migration | `Diagnostic`, `Project`. None of the others |
| Validation and errors | The rule list is the contract. A rule never throws on a malformed document |
| Edge cases | A document with 2,000 components and 5,000 nets (the limit) passes V2 to V5 in under 40 ms (ESTIMATED). `source.rename` to a path that differs only in case fails V3-PATH |
| Performance | V3 in the low milliseconds at 500 parts and 1,000 wires (ESTIMATED); `checkBatch` for one op well under 1 ms (measured in T-B2-16) |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `semantic.test.ts`: one positive and one negative per rule (60 or so cases, table-driven by rule id, both rule files); the "Proto: no" rules each have a case. `semantic.negative.test.ts`: the eight V3 variants (wire end not in its net, strip short, pin in two nets, unknown pin, unknown definition, dangling check pin, duplicate refdes, history gap), each asserting the rule id. `semantic.differential.test.ts`: `checkBatch` equals `checkAll` restricted to changed entities on 100 seeded mutations (apply a random single-entity change, compare `checkBatch(next,prev)` with the subset of `checkAll(next)` that concerns the changed ids). `validate.v3.test.ts`: the five examples have zero errors through `validateValue`; a wire whose net does not exist gives `V3-WIRE-NET` |
| Integration | `TP`; `semantic*.ts` import only `core`, `holes.ts`, `hash.ts` and siblings |
| Playwright | None |
| Fixtures | Examples; the eight variants built by mutating the lesson example in the test |
| Acceptance | **Given** a file whose wire names a net that does not exist, **When** `validateText` runs, **Then** the report has `V3-WIRE-NET` with the wire's JSON Pointer and `ok` is false. **Given** a `next` state built by hand in which one pin is a member of two nets, **When** `checkBatch(next, prev)` runs, **Then** it reports `V3-PIN-TWICE` for those nets and nothing about unchanged entities |
| Observability | Diagnostic codes `V3-*`; `first20` is what the recovery view shows |
| Release blockers | A rule present in PDM 9.2 and absent here; a V3 negative variant accepted; `checkBatch` and `checkAll` disagreeing on a changed id |

**Delivery.** Definition of done: three modules and the one-line edit of `validate.ts`, tests green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project/semantic.test.ts src/project/semantic.negative.test.ts src/project/semantic.differential.test.ts src/project/validate.v3.test.ts src/project/validate.test.ts`. Documentation: JSDoc; rule table kept in `semantic.ts` header as data. Rollback: revert (including the `validate.ts` line). Later tasks need: `checkAll`, `checkBatch`.

---

### T-B2-12a. Uno R3 descriptor as data, the builtin index, and the browser loader

**Identity.** Subsystem: parts. Phase B2. Priority: must. Dependencies: T-B2-11a, T-B2-11b, T-B2-13. Status: not started. Group G4. Split from the first T-B2-12 by the review of 2026-10-27; the six small parts are T-B2-12b.

**Intent.**

| Field | Content |
|---|---|
| Problem | R-029 asks for the first parts as data, and the biggest is the Uno R3 (44 pins, 6 groups). It is also the part every converted Uno lesson pins. The builtin index and the loader need to exist before the other six parts are added |
| Target user | The document (pinned interfaces), the converter, Studio (B4), T-B2-16 (`newProject`) |
| User story | As a maker, I want the Uno to be a plain file I can read and change |
| Expected behaviour | `core.uno-r3` validates; `builtinRegistry()` loads it; its interface equals what the lesson example pins; it points at its existing figure for artwork and has a fallback; the loader installs descriptors from a source and reports failures |
| Success metric | `validateDescriptor` passes with origin `core`; the figure path exists on disk; the Uno pin ids equal `boardPinIds` over the emitted `uno-r3` rows; `interfaceOf` of it equals the `core.uno-r3` interface in the lesson example |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. Sources to read: `docs/facts/uno-r3.md` (533 lines); `src/content/boards/uno-r3.ts:1987-2030` (pinout, `net` field per row); the example `schemas/examples/components/esp32-devkitc.component.json` (the model for a microcontroller board); the lesson example's `core.uno-r3` interface |
| New files | `src/parts/data/uno-r3.component.json`, `src/parts/builtin.ts`, `src/parts/browser/load.ts` and tests |
| Descriptor | `core.uno-r3` (new; pins from the 44 pinout rows by C-PIN, so ids equal the lesson example's `core.uno-r3` interface; groups as C-PIN rule 4). It has `visual.breadboard.figure` pointing at the existing built page `public/figures/boards/uno-r3.html` (VERIFIED to exist), `visual.fallback`, `simulation.tier` and `status` agreeing, at least one non-`to-write` test where the status says modelled, `provenance` with `LicenseRef-iynk-pending` and `thirdParty` empty or reviewed (D-017: facts files cite web sources, so the descriptor lists its sources and the review state `unchecked`; clearing that is a task for a person, section 7). It uses status `partly-modelled` tier `T1` only when `what_it_models` can say what the existing interpreter does today; otherwise `not-modelled-yet` with tier `none`. A descriptor never claims more than the code does (D-007) |
| builtin.ts | `BUILTIN_DESCRIPTORS: readonly unknown[]` built from static JSON imports with import attributes (`import uno from './data/uno-r3.component.json' with { type: 'json' }`), or the generated-TS fallback that spike T-B2-17 Q5 names; `builtinRegistry(): PartRegistry` adds every descriptor with origin `core` and throws with the diagnostics if any fails (a bad shipped descriptor is a build bug). One constant holds the data folder. T-B2-12b adds the other six to this file |
| browser/load.ts | `interface PartSource { list(): Promise<{ value: unknown; bytes: number }[]> }`; `builtinSource(): PartSource`; `fetchSource(baseUrl: string, fetchImpl: typeof fetch): PartSource` (reads `<baseUrl>/index.json`, then each file; for the future `public/parts/` build, unused in B2); `loadInto(reg: PartRegistry, src: PartSource, origin: 'core' \| 'local-user' \| 'imported-pack'): Promise<{ added: number; failed: { ref: string; diagnostics: Diagnostic[] }[] }>` (a failing file is not installed and is reported with the first 20 diagnostics, R-028). This file is the only one in `src/parts/` that may use `fetch`; the portable config excludes `src/parts/browser/` |
| Data model, algorithm, edge cases | A descriptor under 256 KiB (COMPONENT_SCHEMA 4.1). Folder choice follows the roadmap (`src/parts/data/`); ADR-0200 option (a) names `parts/` at the repo root. One constant in `builtin.ts` holds the folder, so a move is one line (open question, section 8) |
| Permissions, performance | None. Loading under 50 ms |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `src/parts/uno.data.test.ts`: the Uno passes `validateDescriptor` with origin `core`; `S-01` to `S-14` clean; the figure path exists (`fs.existsSync`); pin ids equal `boardPinIds` over the output of `node scripts/gen-content-index.mjs --emit board/uno-r3` (T-B2-13); each pin `type` is one of the schema enum; it has a fallback; banned-word copy check passes; `builtinRegistry()` has one entry, `core.uno-r3@1.0.0`; `interfaceOf` of it equals (on `id`, `designator`, `type`, `polarity`, `position`, groups) the `core.uno-r3` interface in `lesson-uno-r3-button.project.json`. `src/parts/browser/load.test.ts` (browser-side file, tested with an injected fake `fetch`): a good file is added, a file failing the schema is reported with diagnostics and not installed, a second file with the same id and different bytes is refused |
| Integration | `TP` (builtin.ts); `node -e "import('./src/parts/builtin.ts')"` loads under Node type stripping (proves the JSON import attribute form, if that was the spike's answer); `npm run schema:check` includes the descriptor (T-B2-04's `validateExamples()` reads both `schemas/examples/components/` and `src/parts/data/` when the latter exists) |
| Playwright | None |
| Fixtures | The example descriptors and facts files |
| Acceptance | **Given** a fresh clone, **When** `builtinRegistry()` runs, **Then** the Uno is present with a fallback. **Given** a descriptor with `status` `fully-modelled` and no test, **When** CI runs, **Then** it fails |
| Observability | Loader result `{added, failed}` |
| Release blockers | A descriptor claiming a tier the code does not reach; a missing figure path |

**Delivery.** Definition of done: one descriptor, `builtin.ts`, `load.ts`, tests green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/parts`; `npm run schema:check`. Documentation: a short comment block in `builtin.ts` on how to add a part (the long guide is B11). Rollback: revert. Later tasks need: `builtinRegistry`, `core.uno-r3`, `loadInto`.

---

### T-B2-12b. The six small descriptors

**Identity.** Subsystem: parts. Phase B2. Priority: must. Dependencies: T-B2-12a. Status: not started. Group G5.

**Intent.**

| Field | Content |
|---|---|
| Problem | R-029 asks for the LED, resistor, push button, buzzer, potentiometer and one existing I2C display as data. Without them the converter and the netlist have no real descriptors to pin for the parts of a lesson |
| Target user | The document (pinned interfaces), the converter (`PART_REFS` in T-B2-14 names exactly these ids; T-B2-22 compares the two), Studio (B4) |
| User story | As a maker, I want the first parts to be plain files I can read and change |
| Expected behaviour | Six descriptors validate; the registry loads them with the Uno from the builtin index; the interface of each equals what the examples pin; each points at its existing figure for artwork and has a fallback |
| Success metric | `validateDescriptor` passes for all seven (Uno plus six); every `visual.breadboard.figure.path` exists on disk; the T-B2-22 drift test passes |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | `src/parts/builtin.ts` (owned by T-B2-12a; edit: import the six files and add them to `BUILTIN_DESCRIPTORS`). Sources to read: `docs/facts/la-components.md` sections 4 (LED), 3 (resistor), 6 (push button), 7 (potentiometer), 10 (buzzer), 17 (SSD1306); the figure parts' `legs` (`figures/parts/led.js:12`, `resistor.js:16`, `push-button.js:37`, `potentiometer.js:41`, `piezo-buzzer.js:49`, `ssd1306.js:24`); the examples `schemas/examples/components/{led-5mm,resistor,ssd1306}.component.json` |
| New files | `src/parts/data/{led-5mm,resistor,push-button-6mm,buzzer-piezo,potentiometer-10k,ssd1306}.component.json` (six files, one data set), `src/parts/data.test.ts`, `src/parts/builtin.test.ts` |
| Descriptors | `core.led-5mm` (copy the example; pins `A`, `K`), `core.resistor` (copy; pins `P1`, `P2`), `core.push-button-6mm` (new; pins `P1` to `P4`; groups `g_a` = P1, P2 and `g_b` = P3, P4, as the lesson example), `core.buzzer-piezo` (new; passive piezo; pins `PLUS`, `MINUS` by C-LEG), `core.potentiometer-10k` (new; pins `P1`, `W`, `P3`), `core.ssd1306` (copy; pins `GND`, `VCC`, `SCL`, `SDA`). Each has: `visual.breadboard.figure` pointing at the existing built page under `public/figures/parts/` (VERIFIED: `public/figures/parts/led.html` exists; the task checks the other five), `visual.fallback`, `simulation.tier` and `status` agreeing, at least one non-`to-write` test where the status says modelled, `provenance` with `LicenseRef-iynk-pending` and `thirdParty` empty or reviewed (D-017; each non-generic descriptor lists its sources with the review state `unchecked`, section 7). New descriptors use status `partly-modelled` tier `T1` only when `what_it_models` can say what the existing interpreter or solver does today; otherwise `not-modelled-yet` with tier `none` (D-007) |
| Permissions, performance, migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `src/parts/data.test.ts` (covers all seven, Uno included): all pass `validateDescriptor` with origin `core`; `S-01` to `S-14` clean; every figure path exists (`fs.existsSync`); every `legs` entry of `visual.breadboard.legs` maps through `pinIdFromLeg` to a pin id (imports `project/legacy-names`, allowed in a test); each pin `type` is one of the schema enum; each descriptor has a fallback; banned-word copy check passes. `src/parts/builtin.test.ts`: `builtinRegistry()` has seven entries; `resolveLegacy('led')`, `('resistor')`, `('push-button')` resolve; `interfaceOf` of the LED, resistor and push button equals the pinned interfaces in the lesson example |
| Integration | `TP`; `node -e "import('./src/parts/builtin.ts')"`; `npm run schema:check` includes the six files through the glob of `src/parts/data/*.component.json` |
| Playwright | None |
| Fixtures | The examples and facts files |
| Acceptance | **Given** a fresh clone, **When** `builtinRegistry()` runs, **Then** the Uno, LED, resistor, push button, buzzer, potentiometer and SSD1306 are present with fallbacks. **Given** a descriptor with `status` `fully-modelled` and no test, **When** CI runs, **Then** it fails |
| Observability | Diagnostic codes of `validateDescriptor` |
| Release blockers | A descriptor claiming a tier the code does not reach; a missing figure path |

**Delivery.** Definition of done: six descriptor files, `builtin.ts` edited, two test files green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/parts`; `npm run schema:check`. Rollback: revert. Later tasks need: the seven ids (T-B2-14 copies them into `PART_REFS`).

---

### T-B2-22. V6 library pass and interface drift

**Identity.** Subsystem: parts and validation. Phase B2. Priority: should (PDM 9.1 lists it; the interface-drift test is in PDM 9.5). Dependencies: T-B2-11a, T-B2-11b (`interfaceOf`, `placeholderSpec`), T-B2-12b (the seven builtin descriptors), T-B2-14 (the `PART_REFS` table the test compares). T-B2-08 is not needed: V6 lives in `src/parts` and uses `Diagnostic` from core. Status: not started. Group G6.

**Intent.**

| Field | Content |
|---|---|
| Problem | A project pins a snapshot of each part's interface (ADR-0107). When the part library is loaded, the snapshot must be checked against the descriptor, and a missing part must become a placeholder, not an error (R-028) |
| Target user | The loader (B3), Studio (B4) |
| User story | As a maker, I want a buddy's project that uses a part I do not have to open with that part as a labelled placeholder |
| Expected behaviour | `checkLibrary(doc, registry)` returns warnings `V6-UNKNOWN-PART`, `V6-INTERFACE-DRIFT`, `V6-DIGEST`, `V6-FAULT-DRIFT` and the error `V6-SURFACE-EMPTY` |
| Success metric | Builtin parts in the examples have no drift; a surface snapshot with no pins is an error in any origin |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. Reference: PDM 5.3 and 9.1 |
| New files | `src/parts/library-check.ts` and test |
| Functions | `checkLibrary(doc: Project, reg: PartRegistry): Diagnostic[]`; `compareInterface(pinned: InterfaceSnapshot, derived: InterfaceSnapshot): string[]` (list of JSON Pointer differences; ignores the legacy `net` and `header` pin fields, which the descriptor does not carry; compares `id`, `type`, `class` when both present, `polarity`, `position`, groups by `id` and member set, params by `id`); `refreshInterface(dep, d: Descriptor): ComponentDependency` (returns the dependency with a freshly derived interface; used by the later "update part" action); `placeholderFor(dep: ComponentDependency): FallbackSpec` (via `placeholderSpec`). Rules: origin `builtin` and descriptor absent gives `V6-UNKNOWN-PART` (warning); descriptor present and snapshot differs gives `V6-INTERFACE-DRIFT` (warning; the load uses the descriptor); origin `library` or `embedded`: `dependencies[].digest` must equal `digestOf(descriptor)` else `V6-DIGEST`; a fault whose `injectable` does not resolve in the descriptor gives `V6-FAULT-DRIFT`; role `surface` with empty `pins` gives `V6-SURFACE-EMPTY` (error), even without a registry |
| Edge cases | The lesson example pins `core.breadboard-half` with empty `pins` (VERIFIED), so `checkLibrary` on it reports `V6-SURFACE-EMPTY` today; that is correct and documented: the example predates PDM amendment A-11, and the converter (T-B2-14) writes full surface snapshots. The test asserts that exact result for the example. "No `V6-SURFACE-EMPTY` for the converter's output" is asserted in T-B2-20c `index.test.ts`, after both converters exist (T-B2-14 and T-B2-19 are not both dependencies of this task) |
| Others | Permissions, performance, migration: none (linear in dependencies) |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `library-check.test.ts`: each code with a positive and a negative case; the examples against `builtinRegistry()` (LED, resistor, SSD1306, Uno snapshots: expected drift list recorded in the test as data, ideally empty; any difference is a bug in the descriptor or the example and is fixed in the descriptor); the `PART_REFS` table of T-B2-14 versus the registry (every entry that has a descriptor resolves; T-B2-14 is a declared dependency); placeholder for a 44-pin snapshot |
| Integration | `TP` |
| Playwright | None |
| Acceptance | **Given** a project whose `dependencies` pins a part not in the registry, **When** `checkLibrary` runs, **Then** one `V6-UNKNOWN-PART` warning and the instance keeps its pinned pins. **Given** a builtin pin renamed in the descriptor, **When** it runs, **Then** `V6-INTERFACE-DRIFT` names the pin |
| Release blockers | Drift between a shipped descriptor and the converter's snapshot |

**Delivery.** Definition of done: module and test green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/parts/library-check.test.ts`. Rollback: revert. Later tasks need: `checkLibrary`, `refreshInterface`.

---

### T-B2-10. `ProjectSession`, undo and redo, `computeTouched`, `LocalAuthority`

**Identity.** Subsystem: project core (session). Phase B2. Priority: must. Dependencies: T-B2-05, T-B2-06, T-B2-07, T-B2-08b (`checkBatch`), T-B2-09. Status: not started. Group G6.

**Intent.**

| Field | Content |
|---|---|
| Problem | `apply` is a pure function. Something must hold the live state, stamp envelopes, keep the hash chain and the op tail, and run undo (R-033, R-034, FA-01). It must be the only mutator |
| Target user | `DocStore` and the `ProjectWorker` (B3), Studio (B4), the room client (B7) |
| User story | As a maker, undo puts back the part and its wires together, and after a reload only my new edits can be undone |
| Expected behaviour | `createSession` returns the one object that changes the document. Each accepted batch gets envelopes with `seq`, `base`, `opId`, `at`, the history tail and the chain advance. Undo applies the inverse as new ops |
| Success metric | Replay of the session's `history.ops` from the starting state gives the live `stateHash`; undo then redo returns the state; FA-01 grep test green |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | `src/architecture.test.ts` (edit: add the FA-01 rule) |
| New files | `src/project/session.ts`, `touched.ts`, `authority.ts` and tests |
| authority.ts | One synchronous stamp function, no async interface. `interface LocalAuthority { stamp(ops: readonly Op[], author: Author): OpEnvelope[]; readonly mode: 'local' }`; `createLocalAuthority(opts: { clock: Clock; rnd: RandomSource; startRevision: number }): LocalAuthority`. `stamp` is the only place that assigns `seq`: it counts from `startRevision + 1` (previous plus 1 for each op), `base = seq - 1`, `opId = newId('op', rnd)`, `at` is the ISO time of `clock()`, `batch` is the first op's `opId` when the batch has more than one op, `author` is copied. No network, no promise. The async `Authority` of FRONTEND 6.4 (`submit`, `onRemote`, `onResync`, `PendingBatch`) is **not written in B2**: nothing in B2 would call it, and a second counter beside `stamp` would be a second source of truth for `seq`. B7 adds the room authority and may wrap `stamp` for local mode; a local authority cannot compute inverses, which is why `ProjectSession` takes them from `applyBatch` |
| touched.ts | `interface Touched { components: Set<string>; nets: Set<string>; wires: Set<string>; views: Set<string>; sources: Set<string> }` (boards count as `components`); `interface DocChange { from: number; to: number; ops: Op[]; touched: Touched; origin: 'local' \| 'remote' \| 'undo' \| 'redo' \| 'load' \| 'ai' }`; `computeTouched(before: Project, after: Project): Touched` (compare entity references in the top-level collections and in each view's wires; added, removed and changed ids are all "touched"; pure; O(entities)). It depends on the structural sharing guarantee of `apply` |
| session.ts | `interface SessionOptions { state: Project; clock: Clock; rnd: RandomSource; maxUndo?: number /* default 100 */; onCompact?: (snap: { revision: number; state: Project; stateHash: string }) => void }` (no `authority` option); `type ApplyResult = { ok: true; revision: number; inverse: Op[] } \| { ok: false; reject: RejectCode; message: string; refs?: string[] }`; `interface ProjectSession { readonly state: Project; readonly revision: number; readonly chain: string; apply(op: Op \| readonly Op[], author: Author): ApplyResult; undo(actor?: string): ApplyResult \| null; redo(actor?: string): ApplyResult \| null; canUndo(actor?: string): boolean; canRedo(actor?: string): boolean; subscribe(fn: (c: DocChange) => void): () => void; replace(state: Project): void; compact(): void }`; `createSession(opts: SessionOptions): ProjectSession`. The session creates its `LocalAuthority` from `clock`, `rnd` and `state.revision`, and re-creates it in `replace` |
| Behaviour | `apply`: `applyBatch` with `invariants: checkBatch`; on success commit the state, build envelopes with `authority.stamp(ops, author)` (synchronous; the session owns no second counter), append them to `history.ops`, advance `chain` with `chainNext`, push the inverse on the author's undo stack, clear that author's redo stack, notify subscribers with a `DocChange` (origin by `author.kind`: `user` is `local`, `ai` is `ai`, others `remote`). `undo`: pop the author's last inverse and apply it as a new batch (author unchanged); the inverse of that undo goes on the redo stack; if the inverse is rejected the entry is dropped and the reject returned (PDM 7.4: "dropped and the stack entry is lost"). Stacks are in memory only, so a new session starts empty (R-034). `replace` swaps the state for a snapshot (open, resync), clears stacks, notifies origin `load`. `compact`: when `history.ops` is longer than 1,000 the session writes a checkpoint header `{revision, kind: 'auto', at, author, stateHash, store: 'local-db'}`, calls `onCompact` so the store can keep the snapshot, drops the oldest ops keeping the last 500, advances `baseRevision` and folds `baseChain`; at most 256 checkpoints (oldest `auto` dropped first). `apply` calls `compact` itself when the tail reaches 1,000. B2 stores nothing; B3 supplies `onCompact` |
| FA-01 rule (architecture.test.ts) | Fails if any file outside `src/project/session.ts`, `src/project/testing/`, `server/`, and test files imports from `src/project/apply/` (relative or `#project/apply/...`); fails if any file other than `session.ts` assigns to a property named `state` or `revision` of a `ProjectSession` (pattern `\.(state\|revision)\s*=[^=]` in files that import `session.ts`); the future `DocStore` rule (no assigned `state` field) is added in B4 |
| Data model | `OpEnvelope`, `Checkpoint`, `History` |
| Algorithms, state transitions | Session states are implicit: the undo and redo stacks per author. A new `apply` clears that author's redo |
| Validation and errors | Reject results pass through unchanged. A batch of zero ops is `malformed` |
| Edge cases | Undo after another author changed the same part: the inverse is applied if valid (known RS-09 limit: a move undone after someone else moved the part moves it back); if the target is gone the entry is dropped. Two sessions on the same state are independent objects. `replace` with a document of another project id is allowed (open another project) |
| Permissions | `access.*` and `actor.*` are checked inside `apply` (T-B2-05) |
| Performance | `apply` through the session adds envelope building and one `chainNext` (one SHA-256 of about 300 bytes, microseconds). Measured in T-B2-16 |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `session.test.ts`: apply, envelope fields (`seq`, `base`, `opId`, `at`, `batch`), `history.ops` grows, `revision` grows, chain equals `foldChain(baseChain, ops)`; replay of `history.ops` through `applyBatch` from the starting state gives the live `stateHash`; undo a `component.remove` restores the part and wires together; redo; new edit clears redo; undo stack per author (two authors, each undoes only their own); reload (a new session) has empty stacks; dropped inverse when the target is gone; rejected apply changes nothing and adds no envelope; `compact` at 1,000 ops keeps 500, advances `baseRevision`, `foldChain` still equals `history` head, checkpoint appended, `onCompact` called with the snapshot hash; 256-checkpoint cap. `session.invariants.test.ts`: batch-level failures through the real `checkBatch`: wire to a net the pin is not in (W2), two nets on one strip (B2), a leg in a taken hole (B4), pin in two nets, duplicate refdes, `actor.set` + `access.grant` valid as one batch and invalid as two. `touched.test.ts`: component change touches one id; `component.remove` touches the component, its nets and wires; unchanged entities are not in the set; `DocChange` shape. `authority.test.ts`: `stamp` numbers `seq` from `startRevision + 1`, `base`, batch ids, determinism with a seeded `RandomSource` and a fixed clock; the session's envelopes equal `stamp`'s output |
| Integration | `TP`; the architecture test with the FA-01 rule green on the tree and red on a planted import |
| Playwright | None |
| Fixtures | The lesson and monitor examples; the monitor example's two history ops are replayed from `monitorAt140()` (T-B2-05) |
| Acceptance | **Given** a session on the lesson example, **When** I remove the LED and press undo, **Then** `stateHash` equals the starting hash and `revision` is 2 higher. **Given** I reload (new session), **When** I press undo, **Then** it returns `null`. **Given** a UI file imports `project/apply/index`, **When** the architecture test runs, **Then** it fails (FA-01) |
| Observability | The `DocChange` stream; reject codes |
| Release blockers | Replay not equal to live; a way to change the state that skips `apply` |

**Delivery.** Definition of done: three modules, architecture rule, tests green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project src/architecture.test.ts`. Documentation: JSDoc; the T-B2-21 docs note for B7 that FRONTEND 6.4's async `Authority` is not built and that its `PendingBatch` would need an `inverse` field. Rollback: revert. Later tasks need: `createSession`, `ProjectSession`, `LocalAuthority`, `createLocalAuthority`, `computeTouched`, `DocChange`.

---

### T-B2-14. Converter A: figure reading, interfaces, circuit to nets

**Identity.** Subsystem: catalogue converter. Phase B2. Priority: must. Dependencies: T-B2-13, T-B2-18. Status: not started. Group G4.

**Intent.**

| Field | Content |
|---|---|
| Problem | The 38 catalogue items must become projects whose nets are what the figure circuit means (F-077, R-032, ADR-0108). The pieces everything else in the converter needs are: reading the data (outside the portable code), the pinned interfaces of boards, parts and breadboards, and the circuit-to-nets step (PDM 11.4) |
| Target user | T-B2-19 and T-B2-20a to 20c, then every later phase that uses the corpus as a regression set |
| User story | As the maintainer, I want the old circuits turned into nets by the same rule the figure uses, so the old lessons keep meaning what they meant |
| Expected behaviour | `scripts/convert-io.mjs` loads an item (`{meta, data, en}` plus the six languages) and its figure circuits. `src/project/convert/` turns a board into an interface snapshot (C-PIN), a figure part into one (C-LEG), a breadboard into a surface snapshot, and a circuit into `nets`, `wires`, `placements` and report items |
| Success metric | For the Uno R3 `button` lesson the nets equal the PDM 11.4 table; for every board the C-PIN ids have no collision; for each of the 57 lesson circuits (expected, from the spike) the circuit converts or has a named reason |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. `scripts/gen-content-index.mjs:157-167` (`--emit`) is called, not changed. Read the T-B2-18 report first: it fixes the header-reference rule (`IOH.n` to a pin) and the extractor |
| New files | `src/project/convert/types.ts`, `interfaces.ts`, `circuit.ts` (portable, pure); `scripts/convert-io.mjs`, `scripts/figure-extract.mjs` (Node, file access) and tests, among them `src/project/convert/input-types.drift.test.ts` |
| scripts/figure-extract.mjs | `extractFigure(file: string): Promise<{ kind: 'board' \| 'bench' \| 'module' \| 'part'; def: object }>` (the `node:vm` approach of spike Q1, with the stub from the report); `extractBoardCircuits(boardId: string): Promise<Record<string, FigureCircuit>>`; `extractBench(id: string): Promise<FigureBench>`; `extractPartLegs(file: string): Promise<string[]>`. No browser, no jsdom. A figure file that throws is reported, not swallowed |
| scripts/convert-io.mjs | `loadItem(lab: 'board' \| 'robotics' \| 'drone', id: string): CatalogueItem` (runs `node scripts/gen-content-index.mjs --emit <lab>/<id>` with `execFileSync` and parses stdout; 0.1 s each); `loadTexts(lab, id): Texts` (reads `src/i18n/content/<lang>/<dir>/<id>.json` for `en de es fr hi zh`); `listItems(): { lab: string; id: string }[]` (from `src/content/ids.ts` through `--emit` index, 12 + 13 + 13 = 38) |
| types.ts | `type CatalogueItem = { lab: 'board'; id: string; meta: unknown; data: ConvertBoardContent; en: Record<string, string> } \| { lab: 'robotics'; id: string; meta: unknown; data: ConvertRoboticsContent; en: Record<string, string> } \| { lab: 'drone'; id: string; meta: unknown; data: ConvertDroneContent; en: Record<string, string> }`; `type Texts = Record<'en' \| 'de' \| 'es' \| 'fr' \| 'hi' \| 'zh', Record<string, string>>`; `interface FigureCircuit { title?: string; breadboard: 'half' \| 'full' \| 'mini'; parts: { id: string; part: string; holes?: string[]; [param: string]: unknown }[]; wires: { from: string; to: string; color?: string }[] }`; `interface ReportItem { item: string; project?: string; code: ReportCode; message: string; refs?: string[] }`; `type ReportCode = 'no-descriptor' \| 'legacy-circuit' \| 'unresolved-endpoint' \| 'unknown-part' \| 'code-comments-en-only' \| 'hidden-solution' \| 'third-party-unchecked' \| 'bench-circuit-unresolved' \| 'skipped'` |
| Converter input types (decision recorded in T-B2-01) | `types.ts` also holds the local structural input set that every builder in T-B2-19, T-B2-20a and T-B2-20b is typed with, all `Convert`-prefixed and without any import: `ConvertBuildStep`, `ConvertCheck`, `ConvertWorldModel`, `ConvertParamChip`, `ConvertCodeTemplate`, `ConvertSerialSpec`, `ConvertQuiz`, `ConvertLesson`, `ConvertBoardContent`, `ConvertBenchMode`, `ConvertFailureMode`, `ConvertStatusField`, `ConvertCurrentModel`, `ConvertPracticeTask`, `ConvertRoboticsContent`, `ConvertDroneContent` (with its parts, build steps, wiring, tests, firmware, flight, courses). Each lists only the fields the builders read (PDM 11.3 and the key lists in T-B2-20a and T-B2-20b), with plain `string` and `number` unions instead of the closed id unions. The field source is `src/content/schema.ts:44`, `:256-302`, `:303`, `:370`, `:388-460`, `:479`, `:504`, `:521`, `:792` (VERIFIED to exist). `src/project` cannot import `src/content`, and `src/content/schema.ts:16` itself imports `@/lib/drone/calc`, which is not portable. T-B2-19, T-B2-20a and T-B2-20b do not edit `types.ts`; a builder that needs a field missing here stops and reports (risk in section 9) |
| interfaces.ts | `PART_REFS: Record<string, { ref: string; version: '1.0.0' }>` (figure part id to part id; six entries are the T-B2-12b descriptors: `led` to `core.led-5mm`, `resistor` to `core.resistor`, `push-button` to `core.push-button-6mm`, `potentiometer` to `core.potentiometer-10k`, `piezo-buzzer` to `core.buzzer-piezo`, `ssd1306` to `core.ssd1306`; every other figure part id maps to `core.<id>` and is reported `no-descriptor`); `PART_GROUPS: Record<string, { id: string; pins: string[] }[]>` (the push button's two internal pairs, from the lesson example); `boardInterface(item: CatalogueItem): { snapshot: InterfaceSnapshot; ids: string[]; refToPin(ref: string): string \| null }` (C-PIN through `boardPinIds`; `type` and `class` from `PinCap[]` by a table: `gnd` is `ground`/`ground`; `power` is `power_io`/`power`; `reset`, `usb`, `nc` handled; `analog-in` is `analog_in`/`analog`; `digital` is `digital_io`/`digital`; default `digital_io`; the table is checked against the lesson example's Uno interface for `id`, `designator`, `header`, `net`, `type`); `partInterface(figurePart: string, legs: readonly string[]): InterfaceSnapshot` (C-LEG ids, `type: 'passive'`, `class: 'passive'`, groups from `PART_GROUPS`); `surfaceInterface` re-exported from `holes.ts` |
| circuit.ts | `circuitToNets(circuit: FigureCircuit, board: ReturnType<typeof boardInterface>, ctx: { parts: Map<string, InterfaceSnapshot>; surface: string /* instance id */; kind: SurfaceKind }): { nets: Net[]; wires: Wire[]; placements: Placement[]; report: ReportItem[] }`. Algorithm = PDM 11.4: (1) nodes are breadboard strips and rails (`holeToPin` then `stripOfHole`), board pins, part legs; (2) union the ends of every wire; (3) resolve board header references with `refToPin` (the `IOH.n` rule from the T-B2-18 report; net names such as `D2` resolve through the pinout; `RES1.P1` style references resolve to the part's leg pin); (4) each class with a board pin or two or more pins becomes a net: a class with board pins takes the first board pin's legacy `net` name as `name` and `net_<lowercase name>` as id; an unnamed class gets `net_` plus its sorted member keys, cleaned to `[a-z0-9_-]` and cut to 64 characters with an 8-hex suffix of the SHA-256 of the full key when it would be longer; (5) a leg alone in its class is unconnected; (6) part internal joins are groups, not nets (N8): a class that joins only two legs of one `internal-short` group yields no net; (7) every drawn wire becomes a `wire` with `net`, `from`, `to` (pin ends or hole ends); each leg becomes `placements[].legs`; coordinates `x_mm`, `y_mm` of the board and the surface are fixed constants and parts with legs get `0, 0` (as the lesson example does). An endpoint that resolves to nothing is reported `unresolved-endpoint` with the figure line of the circuit key and is **not** silently skipped (this is the defect at `bench-solve.js:41-42`) |
| Data model | Generated types; instance ids `brd_main`, `cmp_<lowercase circuit part id>`, surface `cmp_bb`, refdes = the circuit part id (`RES1`) |
| Validation and errors | Nothing throws for bad data; everything becomes a `ReportItem`. IO failures (an item that will not load) throw with the item name |
| Edge cases | A circuit part with no `holes` (a part lying on the mat) has no `legs` entry. Two wires with the same ends: two wires, one net. A board with variants uses the default variant's pinout. A lesson with `circuit: null` (14 of 71) gets no nets and no report item |
| Permissions, performance | None. Converting all 57 circuits under 10 s |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `interfaces.test.ts`: the Uno snapshot equals the lesson example's `core.uno-r3` interface on `id`, `designator`, `header`, `net`, `type`, with 44 pins and 6 groups; 12 boards, no id collision, every id matches `PIN_ID_PATTERN`; `partInterface` for the 28 figure parts with legs; push-button groups; `PART_REFS` has the six descriptor ids. `circuit.test.ts`: the `button` circuit gives the five nets of PDM 11.4 (names `5V`, `D2`, `GND`, `D13` and one unnamed) with members compared as `refdes.pin` sets; the `blink` circuit; a circuit with a typo'd hole produces `unresolved-endpoint`; a part with internal short; long unnamed net id gets the hash suffix; deterministic output (twice equal). `input-types.drift.test.ts` (a non-portable `*.test.ts`, exempt from the import matrix, T-B2-01): imports `type BoardContent`, `Lesson`, `RoboticsContent`, `PracticeTask`, `DroneContent` and the other content types from `@/content/schema` and assigns a value of each to its `Convert*` type (`const _l: ConvertLesson = {} as Lesson`), so renaming or retyping a field a builder reads fails `npm run typecheck`; one `// @ts-expect-error` assigns `{}` to `ConvertLesson` so the types are known not to be `any`; one `it` makes Vitest report the file. `figure-extract.test.mjs` and `convert-io.test.mjs` (in `scripts/`, picked up by Vitest): all 12 boards yield `circuits`; the set of circuit keys covers the lesson `circuit` values; `loadTexts` returns six languages; `listItems()` returns 38 |
| Integration | `TP` for `src/project/convert/`; the scripts run under plain `node` |
| Playwright | None |
| Fixtures | The T-B2-18 report; the lesson example as golden |
| Acceptance | **Given** the Uno R3 `button` circuit, **When** `circuitToNets` runs, **Then** it gives `5V`, `D2`, `GND`, `D13` and the LED-resistor net with the members of PDM 11.4 and 5 wires. **Given** a circuit whose wire names a hole that does not exist, **When** it runs, **Then** the report names the wire and no net is invented |
| Observability | `ReportItem` list per circuit |
| Release blockers | A silently dropped wire |

**Delivery.** Definition of done: five files, tests green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project/convert scripts/figure-extract.test.mjs scripts/convert-io.test.mjs`. Rollback: revert. Later tasks need: `boardInterface`, `partInterface`, `circuitToNets`, `PART_REFS`, the two scripts, the types including the `Convert*` input set.

---

### T-B2-19. Converter B: board tours and lessons

**Identity.** Subsystem: catalogue converter. Phase B2. Priority: must. Dependencies: T-B2-14, T-B2-08b (`validateValue` with V3), T-B2-09. Status: not started. Group G6.

**Intent.**

| Field | Content |
|---|---|
| Problem | 12 boards give 12 tours and 71 lessons (83 of the 140 projects). Each carries text in six languages, code, parameters, a world, checks and, for 57 lessons, a circuit. The 31 practice tasks belong to the 13 robotics benches (`RoboticsContent.tasks`, VERIFIED with `--emit robotics/l298n`) and are converted in T-B2-20b with the same builders |
| Target user | The regression corpus; later the Studio template picker and LABS |
| User story | As the maintainer, I want every Board Lab lesson as a project that validates and carries the same checks, code and text |
| Expected behaviour | `convertBoardTour` and `convertLesson` return a project and report items. All validate (V1 to V5). The builders in `guide.ts` are exported so T-B2-20a and T-B2-20b reuse them for benches and practice tasks |
| Success metric | The converter output for Uno R3 lesson `button` equals `schemas/examples/lesson-uno-r3-button.project.json` except for the declared differences (list below); 83 projects valid; the checks of the 71 lessons present unchanged in kind (the 461 checks counted in PDM 11.1 also include the 31 practice tasks, covered in T-B2-20b) |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. Every builder is typed with the `Convert*` input set of T-B2-14 `types.ts`, never with `src/content` types and never with an import from `src/lib` or `src/content` (the matrix forbids both, T-B2-01). Reference (read only): PDM 11.3 (type by type), 11.5; `src/content/schema.ts:44`, `:256-302`, `:303`, `:370`, `:388-460`, `:504`; `src/lib/boardlab/template.ts:22-105` (`resolveText`, `defaultParams`, `chipCode`: the rule for rendering `{{t:}}` and `{{p:}}`) |
| New files | `src/project/convert/text.ts`, `guide.ts`, `lesson.ts` and tests |
| text.ts | `toText(texts: Texts, key: string): Text` (inline six-language `Text`: `en` always, others when the file has the key; a missing `en` key is a `ReportItem` and the key itself becomes the English text so nothing is dropped); `renderTemplate(source: string, values: ParamValues, text: (k: string) => string): string` (a port of the behaviour of `template.ts`, not an import: `src/project` cannot import `src/lib`; the test compares both on every lesson's default parameters) |
| guide.ts | Builders, one per catalogue type, each a pure function of already-loaded data, typed with the `Convert*` set (`ConvertBuildStep`, `ConvertCheck`, `ConvertWorldModel`, `ConvertParamChip`, `ConvertCodeTemplate`, `ConvertSerialSpec`): `buildAssembly(steps: ConvertBuildStep[], texts)` (unchanged objects, text keys resolved), `buildQuizzes`, `buildStarter(code: ConvertCodeTemplate, params, id)` (template kept with tokens; splices from the chips: for each param chip the code text of each option), `buildParameters(chips: ConvertParamChip[], texts): Parameter[]` (kinds `number`, `choice`, `toggle`; `keepApart`; a chip with `figure` also yields a `{param}` binding on the component, returned as `bindings`), `buildChecks(checks: ConvertCheck[], texts): TestCase['checks']` (kind and fields unchanged; add `id` `chk-<n>`, `visibility`; `label` to `Text`), `buildWorld(world: ConvertWorldModel): Simulation['world']` (`part` to `component`, `pins` to pin addresses, label to text), `buildSerialSample(spec: ConvertSerialSpec)` (`sample` renamed `lines`), `buildLegacyFigure`. Anything that does not map is a `ReportItem`, never dropped |
| lesson.ts | `convertBoardTour(item, texts, ctx): ConvertResult`; `convertLesson(item, lessonId, texts, circuits, ctx): ConvertResult`; `type ConvertResult = { project: Project; report: ReportItem[] }`. Common assembly: `format`, `schemaVersion '1.1'`, `id prj_<board>-<lesson>`, `revision 0`, `meta {title, kind: 'template' \| 'lesson', locale 'en', createdAt = ctx.at, updatedAt = ctx.at, tags}`, one actor `usr_iynk`, `access` owner that actor (`visibility: 'private'`), `dependencies` (board, parts, surface from T-B2-14; `libraries` from `CodeTemplate.libraries` with ecosystem), `boards[0]` with `firmware {language, entry, sources, libraries, top?, ports?}`, `components`, `nets`, one breadboard view (or `board` view for bare-board lessons), `sources[0]` (rendered default; `board` set), `simulation {seed: 625... default from SIM 5.2: 0x2545f491, duration_ms: runMs, runtimes: [{id: rtm_main, board: brd_main, engine: 'iynk-interp'}], solver {engine: 'iynk-mna'}, world, faults: []}`, `parameters`, `assets: []`, `tests [{id, name, runMs, script: [], faults: [], checks}]`, `history` empty with `baseChain = chainStart(id)`, `provenance {createdBy, createdWith {app: 'iynk', version}, origin {kind: 'migration', catalogue {lab, id, ...}}, thirdParty [{...review: 'unchecked'}]}`, `license {spdx: 'LicenseRef-iynk-pending'}`. Every field name, enum and the exact `Runtime` and `thirdParty` shapes come from the schema and the lesson example, which is the golden |
| Declared differences from the example | Instance ids (`brd_main` for `brd_uno`; `cmp_bb` for `cmp_bb1`); the surface snapshot has pins and groups (the example has none: A-11); `createdAt`, `updatedAt` fixed to `ctx.at`; any hand edit of the prototype that the converter does not reproduce is listed in the test as data, each with a one-line reason. If the list grows past ten items the task stops and reports |
| Data model, validation | As above. `validateValue(project)` must have zero errors; warnings are reported |
| Edge cases | A lesson `variants` list sets `boards[0].variant` to the first and keeps `guide.variants`. `Verilog` lessons keep `top` and `ports`. A language outside the `Language` enum is a `ReportItem` and the file is still written with the closest allowed language. Non-English comments in starter code: `code-comments-en-only` recorded once per project (PDM 11.5) |
| Permissions, performance | None. 83 projects in under 30 s |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `text.test.ts`: `renderTemplate` equals `src/lib/boardlab/template.ts` output for every lesson of every board with default parameters (import the old function in the test only); six languages present for a known key; missing key reported. `guide.test.ts`: each builder on one real fixture, plus the lesson checks: for every lesson the converted checks deep-equal the catalogue checks after text resolution (kind and fields unchanged); the chip, token and library counts of PDM 11.1 (101 chips, 388 `{{t:}}` and 105 `{{p:}}` tokens, 19 libraries) are asserted over lessons and tasks together in T-B2-20b. `lesson.test.ts` (one `beforeAll` converts all 83 projects once; each test that uses them stays under 20 s alone and the shared 60,000 ms testTimeout applies, `vitest.config.mts:15`; if it takes longer, stop and report, do not raise a timeout): the golden comparison with the example; all 12 tours and 71 lessons convert and `validateValue` has no errors; the netlist of each converted lesson with a circuit equals the `pinSets` of its `circuitToNets` result; round trip (`toFileText` then `validateText` then equal `stateHash`); determinism (two runs byte-identical); 14 bare-board lessons have no nets |
| Integration | `TP`; the oracle test `figures/engine/convert-oracle.test.mjs`: for the Uno R3 circuits that `figures/engine/bench-solve.test.mjs` already drives, load the figure with `testkit.mjs`, run `page.bench.accept({circuit, power: 'usb'})` and `report()`, and for every measured element with a `net` field assert that the converted project's netlist puts that part's pin in the node with that name. This is the independent check that the converter's union-find matches the figure's (the converter and the figure share an algorithm, so the other tests alone would not catch a shared mistake); it covers the Uno circuits only, about 14 |
| Playwright | None |
| Fixtures | `lesson-uno-r3-button.project.json`; emitted items |
| Acceptance | **Given** the Uno R3 lesson `button`, **When** converted, **Then** it matches the example apart from the declared differences. **Given** all 83 projects, **When** validated, **Then** zero errors |
| Observability | `ReportItem` list per project; counts per code |
| Release blockers | Any converted project failing V2 to V5; a check changed in kind |

**Delivery.** Definition of done: three files, tests (including the oracle) green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project/convert figures/engine/convert-oracle.test.mjs`. Rollback: revert. Later tasks need: `convertBoardTour`, `convertLesson`, `toText`, `renderTemplate`, the builders in `guide.ts`.

---

### T-B2-20a. Converter C1: robotics benches

**Identity.** Subsystem: catalogue converter. Phase B2. Priority: must. Dependencies: T-B2-14, T-B2-18 (the bench-circuit rule), T-B2-19 (the builders). Status: not started. Group G7. Split from the first T-B2-20 by the review of 2026-10-27. T-B2-22 is not a dependency of this task.

**Intent.**

| Field | Content |
|---|---|
| Problem | 13 robotics benches are 13 of the 140 projects. Each carries 4 to 24 steps, up to 14 status fields, a power rule, 3 to 5 firmware modes and, in all, 106 faults. PDM 11.3 gives a one-line destination per field; this task needs the field-by-field rule |
| Target user | T-B2-20c (the run and the report); later phases that use the corpus |
| User story | As the maintainer, I want every bench as a valid project that keeps all of its legacy data |
| Expected behaviour | `convertBench(item, texts, bench, ctx)` returns a project of kind `bench` and report items. All 13 validate (V1 to V5) |
| Success metric | 13 of 13 benches validate with zero errors; the 106 faults are all present in `simulation.faults`; the bench-circuit rule of T-B2-18 is applied and matches the spike's table |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. Reference (read only): PDM 11.3 row `RoboticsContent`; `src/content/schema.ts:243-275` (`FailureMode`, `FailureTrigger`, `FailureEffect`, `BuildStep`), `:479-520` (`BenchMode`, `StatusField`, `CurrentModel`), `:521` (`RoboticsContent`); `ROBOTICS_ARCHITECTURE.md`; `schemas/robotics.domain.schema.json`; `$defs/Guide` and `$defs/Fault` in `project.schema.json` |
| New files | `src/project/convert/bench.ts` and `bench.test.ts` |
| Signature | `convertBench(item: CatalogueItem & { lab: 'robotics' }, texts: Texts, bench: FigureBench, ctx: ConvertContext): ConvertResult`, typed with the `Convert*` set of T-B2-14 |
| Domain data (decision) | PDM 11.3 names `domains.robotics.data.power`, `.modes`, `.faultRules`, `.status` and `.current`. `robotics.domain.schema.json` has `additionalProperties: false`, requires `physics`, `surfaces`, `bodies`, `joints`, `wheels`, `sensors` and `arena`, and has none of those five fields (VERIFIED by reading the schema). The schema decides (RECONCILIATION R4). So a converted bench has **no `domains.robotics`**, and the legacy bench data lives in the project's top-level `ext["x-iynk-legacy-bench"]` (the project `ext` is an `Ext` object: namespaced keys, at most 16). Physics for benches is B16. Open question OQ-12 asks whether RECONCILIATION wants the schema to grow these fields instead |
| Field table: identity | `lab`, `id` to project id `prj_bench-<id>` (cleaned to `[a-z0-9_-]`), `provenance.origin.catalogue {lab: 'robotics', id}`, `meta.kind 'bench'`. `fig` and the item `meta.palette` to `ext["x-iynk-legacy"] {fig, palette}`; `meta.tags` to `meta.tags` |
| Field table: text | `title` to `meta.title` and `guide.title`; `sub`, `hint`, `overview` to `guide.sub`, `guide.hint`, `guide.overview` (all keys exist in `$defs/Guide`, VERIFIED), each through `toText` |
| Field table: parts | `board` (BoardId or null) to `boards[0]` with `definition` `core.<board id>` and a `dependencies.components` entry of role `board` (null gives `boards: []`; the schema allows 0 to 16, no `minItems`, VERIFIED). `modules` (ModuleId[]) and `parts` (PartId[]) to one `components[]` each: id `cmp_<id>` cleaned, `refdes` the uppercased id, `definition` from `PART_REFS` or `core.<id>`; any id without a descriptor is reported `no-descriptor`. The pinned interface of a module comes from `FigureBench` (the module figure's pin table read by T-B2-14's extractor) |
| Field table: figure | `figure.page` and `figure.sheets` to `guide.legacyFigure {page, sheets}`; `figure.parts[]` (id, short, role, name, what) to `ext["x-iynk-legacy"].figureParts` with `name` and `what` resolved to `Text` (PDM 11.3: `FigurePart[]` moves to part descriptors, B11) |
| Field table: power and modes | `power` {source, label, ok} to `ext["x-iynk-legacy-bench"].power` (`label` and `ok` as `Text`). `modes[]` {id, instant, language, code, bytes, serial, title}: one `sources[]` entry per mode (`src_<mode id>`, `role` firmware, path `<mode id>` plus the language extension, content `renderTemplate(code, defaults, text)`), and `ext["x-iynk-legacy-bench"].modes[]` {id, instant, bytes, serial, title as `Text`, source: `src_<mode id>`}. `defaultMode` to `ext["x-iynk-legacy-bench"].defaultMode`; `boards[0].firmware.entry` is the default mode's source (only when `board` is not null) |
| Field table: steps and quizzes | `steps[]` (BuildStep, 4 to 24 per bench) to `guide.assembly` via `buildAssembly` (unchanged objects; a break step's `fault` keeps the failure id, which equals the `cause_id` below). `quizzes` to `guide.quizzes` via `buildQuizzes`. `sources` to `guide.references` |
| Field table: faults | `faults[]` (FailureMode: id, kind, trigger, figure, effect, title, symptom, explanation, fix; 106 over the 13 benches) to `simulation.faults[]`: `id` `flt_<failure id>` cleaned; `cause_id` the failure id; `symptom_ids` `[failure id]`; `kind` the failure kind (all 13 `FailureKind` values are in the `Fault.kind` enum, VERIFIED by comparing the two lists); `target` `{}`, except a `short` trigger, which sets `target.nets` when both named nets resolve; `enabled false`; `note` the English `title`; `params {trigger, effect, figure}` verbatim (`Fault.params` is an object of up to 16 keys, VERIFIED); and the four texts to `ext["x-iynk-legacy-bench"].faultText[<failure id>] {title, symptom, explanation, fix}` as `Text`. PDM 11.3's `faultRules` is this `params` pair until part descriptors own the rules (PROPOSAL) |
| Field table: status and current | `status[]` (id, key, format, label) and `current` (supplies, loads) to `ext["x-iynk-legacy-bench"].status` and `.current` verbatim, labels as `Text` |
| Field table: tasks | `tasks[]` is not converted here: T-B2-20b |
| Nets | The rule chosen from the T-B2-18 report. If at least 10 of 13 benches resolve every wire, derive nets for those through a union over `(instance, pin)` addresses (the same union-find as `circuitToNets`) and mark the rest `bench-circuit-unresolved`; otherwise all 13 keep `nets: []` and carry `legacy-circuit`. An endpoint that resolves to nothing is reported, never skipped |
| Validation and errors | Nothing throws for bad data; every unmapped field is a `ReportItem`. Every project gets the `thirdParty` entry `unchecked` (ADR-0108 item 7) |
| Permissions, performance, migration | None. 13 benches under 10 s (ESTIMATED) |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `bench.test.ts` (one `beforeAll` converts the 13 benches once; convert one item per `it` (3-item sample), with the shared `beforeAll` converting once. Each `it` stays under 20 s alone, and the shared 60,000 ms testTimeout applies. If a conversion takes longer than 20 s alone, stop and report; do not raise a timeout): all 13 convert and `validateValue` has zero errors; the sum of `simulation.faults` over the 13 is 106; every fault `kind` is in the schema enum and every `params` has `trigger`, `effect` and `figure`; each project has `ext["x-iynk-legacy-bench"]` with `power`, `modes`, `status` and `current`; one `sources` entry per mode and `boards[0].firmware.entry` is the default mode; `guide.assembly` has the same number of steps as the catalogue; the bench-circuit rule matches the T-B2-18 table; a bench with `board: null` (if one exists) has `boards: []` and validates; determinism (two runs byte-identical); round trip (`toFileText`, `validateText`, same `stateHash`) |
| Integration | `TP` |
| Playwright | None |
| Fixtures | `--emit robotics/<id>` output for the 13 benches; the T-B2-18 report |
| Acceptance | **Given** the `l298n` bench, **When** converted, **Then** the project validates, has 8 faults, 24 assembly steps, 5 sources (one per mode) and `ext["x-iynk-legacy-bench"].power.label` as `Text` (counts VERIFIED with `--emit robotics/l298n`) |
| Observability | `ReportItem` list per bench; counts per code |
| Release blockers | A bench failing V2 to V5; fewer than 106 faults; a field of the table dropped without a `ReportItem` |

**Delivery.** Definition of done: `bench.ts` and its test green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project/convert/bench.test.ts`. Rollback: revert. Later tasks need: `convertBench`.

---

### T-B2-20b. Converter C2: practice tasks and drone crafts

**Identity.** Subsystem: catalogue converter. Phase B2. Priority: must. Dependencies: T-B2-14, T-B2-19 (the builders). Status: not started. Group G7, in parallel with T-B2-20a (disjoint files). T-B2-22 is not a dependency of this task.

**Intent.**

| Field | Content |
|---|---|
| Problem | The 31 practice tasks (kind `challenge`) and the 13 drone crafts (kind `craft`) are 44 of the 140 projects. A task reuses the lesson builders; a craft carries a drone model, a frame, parts, a CLI emulator, a flight config and courses that no builder handles yet |
| Target user | T-B2-20c; later phases that use the corpus |
| User story | As the maintainer, I want every practice task and craft as a valid project, with the hidden solution kept out of the shared parts |
| Expected behaviour | `convertPracticeTask` and `convertCraft` return a project and report items. All 44 validate (V1 to V5) |
| Success metric | 31 of 31 tasks and 13 of 13 crafts validate with zero errors; the checks of lessons and tasks together are the 461 of PDM 11.1; the step count over crafts is 173 and the quiz count is 49 |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. Reference (read only): PDM 11.3 rows `PracticeTask`, `DroneContent` and the drone type rows; `src/content/schema.ts:504` (`PracticeTask`), `:792` (`DroneContent`); `DRONE_ARCHITECTURE.md` lines 189-190 and 647; `schemas/drone.domain.schema.json` |
| New files | `src/project/convert/practice.ts`, `craft.ts` and tests |
| Signatures | `convertPracticeTask(item: CatalogueItem & { lab: 'robotics' }, taskId: string, texts: Texts, boardItem: CatalogueItem & { lab: 'board' }, circuits: Record<string, FigureCircuit>, ctx: ConvertContext): ConvertResult`; `convertCraft(item: CatalogueItem & { lab: 'drone' }, texts: Texts, ctx: ConvertContext): ConvertResult` |
| Field table: practice task | `id` to project id `prj_task-<bench>-<task>` with `provenance.origin.catalogue {lab: 'robotics', id: <bench>, child: <task id>}` (the shape of the lesson example) and `meta.kind 'challenge'`. `board` to `boards[0]` (always set). `language` to `boards[0].firmware.language` and the source language. `starter` (CodeTemplate) to `sources[0]` (rendered default) plus `guide.starter` via `buildStarter`. `solution` to `ext["x-iynk-solution"]` and the report code `hidden-solution`; it is never in `guide` or `sources`. `circuit` (a key of the board's figure `circuits`, or null for the bench as built) through `circuitToNets`, or no nets when null. `world` to `simulation.world` via `buildWorld`. `runMs` to `tests[0].runMs` and `simulation.duration_ms`. `checks` to `tests[0].checks` via `buildChecks`. `title` to `meta.title` and `guide.title`; `brief` to `guide.lede`; `hints[]` to `guide.hints` as `Text[]` |
| Domain data (decision) | `drone.domain.schema.json` requires only `kind`, `thrustSource`, `flight`, `environment`, `course`, `bench`, and has none of the fields PDM 11.3 lists under `domains.drone.data` (frame, parts, build steps, tests, firmware config, flight config, ranges, goals, par times) (VERIFIED by reading the schema). The schema decides (RECONCILIATION R4). So a craft keeps a valid `domains.drone` envelope and the rest of its data lives in the project's top-level `ext["x-iynk-legacy-craft"]`. Open question OQ-12 |
| Field table: craft identity and text | `lab`, `id` to `prj_craft-<id>`, `provenance.origin.catalogue {lab: 'drone', id}`, `meta.kind 'craft'`. `fig` to `ext["x-iynk-legacy"].fig`. `class` (DroneClass) to `meta.tags` and `ext["x-iynk-legacy-craft"].class`. `title` to `meta.title` and `guide.title`; `sub`, `hint`, `overview` to `guide.sub`, `guide.hint`, `guide.overview`; `noun` and `practice` to `ext["x-iynk-legacy-craft"].noun` and `.practice` as `Text` (`Guide` has no field for them) |
| Field table: craft domain envelope | `domains.drone {schemaVersion: '1.0', data}` with `data.kind 'legacy-craft'`; `data.legacy {contentId: <id>, calcModelId: 'legacy-calc@1', flightModelId: 'flight-game@1'}` (DRONE_ARCHITECTURE 647); `data.thrustSource 'legacy-calc'`; `data.flight {model: 'flight-game@1'}`; `data.course {builtin: <courses[0].id>}`; `data.bench {propsOff: true}`; `data.environment` the neutral values of the `drone-quad` example (`temperature_degC` 15, `altitude_msl_m` 0, `pressure_pa` 101325, `wind {mean_mps [0,0,0], gust {kind 'none', sigma_mps 0, tau_s 1}}`, `sensorFailures []`; VERIFIED in the example). `validateDomains` must pass |
| Field table: craft content | `frame` (layout, sizeMm, stackMm, motors, propDirection) to `ext["x-iynk-legacy-craft"].frame`; `design` (model, fixed, batts, motors, props, default, golden) to `.design` (verbatim); `parts` (id, short, name, what) to `.parts` with `Text`; `figure.page` and `figure.sheets` to `guide.legacyFigure`, `figure.parts` to `ext["x-iynk-legacy"].figureParts`; `build` (DroneBuildStep: id, part, done, title, body) to `guide.assembly` via `buildAssembly` only (one source of truth, not copied again into `ext`); `wiring` (DroneWire: from, to, kind, label, note) to `.wiring` with `Text` (no pins, so `nets: []`, PDM 11.3); `tests` (DroneTest: id, kind, button, done, pass, fail) to `.tests`; `firmware` (firmware, version, cliName, snippets, emulator, sources) to `.firmware`; `flight` (physics, params, look, modes, defaultMode, fpv, osd, failsafes, controls) to `.flight` verbatim; `courses` (id, kind, title, brief, field, pad, ceiling, prims, gates, gateSize, goals, par) to `.courses` with `Text`. `quizzes` to `guide.quizzes`; `sources` to `guide.references` |
| Validation and errors | Nothing throws for bad data; every unmapped field is a `ReportItem`. Every project gets the `thirdParty` entry `unchecked` |
| Permissions, performance, migration | None. 44 conversions under 20 s (ESTIMATED) |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `practice.test.ts` (one `beforeAll` converts the 31 tasks and 13 crafts once; convert one item per `it` (3-item sample), with the shared `beforeAll` converting once. Each `it` stays under 20 s alone, and the shared 60,000 ms testTimeout applies. If a conversion takes longer than 20 s alone, stop and report; do not raise a timeout): all 31 tasks convert and validate; the hidden solution is in `ext["x-iynk-solution"]` and in no `guide` or `sources` text (string search over the project minus `ext`); the checks of the 71 lessons and 31 tasks together are the 461 of PDM 11.1 and deep-equal the catalogue checks after text resolution; chip counts across lessons and tasks (65 number, 35 choice, 1 toggle; 13 bound to a figure part; 6 with `keepApart`), 388 `{{t:}}` and 105 `{{p:}}` tokens, 19 distinct libraries (the lesson converter output is produced by a `beforeAll` call of `convertLesson`, so this test also needs T-B2-19). `craft.test.ts`: all 13 crafts validate, and `domains.drone.data` passes the drone domain schema; the steps over crafts sum to 173 and the quizzes to 49 (PDM 11.1); `nets` is empty; each craft has `ext["x-iynk-legacy-craft"]` with `frame`, `design`, `firmware`, `flight` and `courses`; round trip (`toFileText`, `validateText`, same `stateHash`); determinism |
| Integration | `TP` |
| Playwright | None |
| Fixtures | `--emit robotics/<id>` and `--emit drone/<id>` output |
| Acceptance | **Given** a practice task with a reference solution, **When** converted, **Then** the solution is in `ext`, the report says `hidden-solution`, and the project validates. **Given** the `quad5` craft, **When** converted, **Then** `domains.drone.data.kind` is `legacy-craft`, `course.builtin` is `race`, and the 12 build steps are in `guide.assembly` |
| Observability | `ReportItem` list per project; counts per code |
| Release blockers | A project failing V2 to V5; a solution outside `ext`; a count that differs from PDM 11.1 without a named reason |

**Delivery.** Definition of done: `practice.ts`, `craft.ts` and their tests green. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project/convert/practice.test.ts src/project/convert/craft.test.ts`. Rollback: revert. Later tasks need: `convertPracticeTask`, `convertCraft`.

---

### T-B2-20c. Converter C3: `convertAll`, report, manifest, the corpus script

**Identity.** Subsystem: catalogue converter. Phase B2. Priority: must. Dependencies: T-B2-20a, T-B2-20b, T-B2-22 (used by `index.test.ts` for the V6 assertion, see below). Status: not started. Group G8.

**Intent.**

| Field | Content |
|---|---|
| Problem | The converters exist per type; the exit gate needs one command that converts all 38 items, says for each what it did, and fails if any item fails |
| Target user | Amar at the gate; later phases that use the corpus |
| User story | As Amar, I want one command that converts all 38 items and tells me plainly which ones are whole and which are kept as legacy data and why |
| Expected behaviour | `npm run corpus` converts the 38 items to 140 projects in `.corpus/`, validates each, round-trips each, and writes `.corpus/report.md` and `.corpus/manifest.json` |
| Success metric | The report lists 38 items; a count of items converted whole; a named list of every item or project kept as legacy, each with a reason code |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | `package.json` (edit: `"corpus": "node scripts/convert-catalogue.mjs"`; place after the `schema:check` entries) |
| New files | `src/project/convert/index.ts`; `scripts/convert-catalogue.mjs`; tests `index.test.ts` and `scripts/convert-catalogue.test.mjs` |
| index.ts | `interface ConvertReport { items: { lab: string; id: string; projects: number; status: 'whole' \| 'legacy' \| 'failed'; reasons: ReportItem[] }[]; totals: { items: number; whole: number; legacy: number; failed: number; projects: number; withNets: number; noDescriptor: string[] } }`; `convertAll(items: CatalogueItem[], texts: (lab, id) => Texts, circuits: ..., ctx): { projects: { id: string; kind: string; item: string; project: Project }[]; report: ConvertReport }` (calls `convertBoardTour`, `convertLesson`, `convertBench`, `convertPracticeTask`, `convertCraft`); `renderReport(r: ConvertReport): string` (plain markdown: a totals table, a table of non-whole items with reason codes and one line each, the list of parts with no descriptor); `manifestOf(projects): { id: string; kind: string; item: string; stateHash: string; canonicalBytes: number; nets: number; warnings: number }[]` sorted by id. Status rules: `whole` = every project of the item passes V1 to V5 with no errors, round-trips to the same hash, and `netlist` computes; its circuit (if it has one) produced nets. `legacy` = valid and round-trips but at least one project carries `legacy-circuit` or `bench-circuit-unresolved`. `failed` = any project invalid. The gate counts `whole + legacy` as converted and prints the legacy list for Amar |
| scripts/convert-catalogue.mjs | Imports `src/project/convert/index.ts` directly (Node type stripping), loads the items through `convert-io.mjs`, runs `convertAll` with `ctx.at = '2026-01-01T00:00:00.000Z'` (a constant, so output is deterministic), writes each project to `<out>/<kind>/<id>.project.json` (pretty form) and `<out>/report.md`, `<out>/manifest.json`; exit code 1 if any item is `failed`. Flags: `--out <dir>` (default `.corpus`); `--only <lab/id,lab/id>` (convert just those items; used by the test); `--check` compares the fresh manifest with `src/project/convert/corpus.manifest.json` (T-B2-21 commits it) and exits 1 on any difference. A `--only` run never combines with `--check` |
| Data model, validation, edge cases | As T-B2-19. Hidden solutions stay in `ext`. Every project gets the `thirdParty` entry `unchecked` |
| Permissions, performance | None. The full run is ESTIMATED at 90 s (38 loads at 0.1 s, 140 conversions, hashing). It runs in the gate (`npm run corpus`, T-B2-21 and exit gate row 5), not in `npm test` |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | `index.test.ts` (one `beforeAll`; convert one item per `it` (3-item sample), with the shared `beforeAll` converting once. Each `it` stays under 20 s alone, and the shared 60,000 ms testTimeout applies. If a conversion takes longer than 20 s alone, stop and report; do not raise a timeout): `convertAll` on a 3-item fixture (`board/uno-r3`, `robotics/l298n`, `drone/quad5`) gives the report shape; status rules (whole, legacy, failed) each with a synthetic case; `renderReport` has no em dash and no banned word; `manifestOf` is sorted and stable; **the converter output has no `V6-SURFACE-EMPTY` error**: `checkLibrary(project, builtinRegistry())` for every converted project of the fixture (moved here from T-B2-22, because it needs T-B2-14, T-B2-19 and T-B2-22 all done). `scripts/convert-catalogue.test.mjs` (one `it` per check on the 3-item sample, shared 60,000 ms testTimeout; if the script run takes longer than 20 s alone, stop and report, do not raise a timeout): runs the script with `--only board/uno-r3,robotics/l298n,drone/quad5 --out <temp dir>`; exit 0; the number of project files equals `1 + lessons + 1 + tasks + 1` computed from `loadItem` for those three items; every project passes `validateText`; every project round-trips; running twice gives identical bytes. The full 38-item run is `npm run corpus` in the gate, once |
| Integration | `TP`; `npm run corpus` end to end (T-B2-21); `npm run corpus -- --check` after T-B2-21 |
| Playwright | None |
| Acceptance | **Given** all 38 items, **When** `npm run corpus` runs, **Then** exit 0, `140` projects, and a report whose "non-whole" table is the list for Amar. **Given** a catalogue item that uses a part with no descriptor, **When** converted, **Then** the part name is in the report (R-032), the project is valid, and the item is not dropped |
| Observability | `.corpus/report.md` |
| Release blockers | Any `failed` item; fewer than 38 items in the report |

**Delivery.** Definition of done: `index.ts`, the script, the `package.json` line, tests green, the 3-item test run. The full `npm run corpus` is run once by T-B2-21 (the agent may also run it here and paste the totals). Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project/convert/index.test.ts scripts/convert-catalogue.test.mjs`. Documentation: the report. Rollback: revert (`.corpus/` is ignored by git after T-B2-21; delete the folder). Later tasks need: `convertAll`, the report, `manifestOf`, `.corpus/`.

---

### T-B2-15. Examples hash test and the checkpoint question

**Identity.** Subsystem: project core (tests). Phase B2. Priority: must (RC-32). Dependencies: T-B2-04 (the generated validator and `AJV_MODULE`), T-B2-05 (`monitorAt140()`), T-B2-07, T-B2-08b, T-B2-09. Status: not started. Group G6.

**Intent.**

| Field | Content |
|---|---|
| Problem | RC-32 wants the five example files to be self-checking and the "Example hashes" test (PDM 9.5) in `npm run check`. The two stale examples are already fixed (section 0.1). The monitor example's checkpoint hash `097630ef...` cannot be reproduced by any recipe the planner tried. RC-32 decides that the example files are the truth and are not changed, so this task records the mismatch and does not edit the example |
| Target user | Anyone who edits an example or the hash rules |
| User story | As the maintainer, I want a red test when an example or the hash definition drifts |
| Expected behaviour | One test file checks the five examples against recorded values and the monitor example's history |
| Success metric | The test is green and is part of `npm test`, hence of `npm run check` |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | None edited. The example files are read only (RC-32: "the example file is not changed") |
| New files | `src/project/examples.test.ts` |
| Table in the test (VERIFIED today with the prototype, first 16 hex and canonical bytes) | `uno-blink-d12`: `2034a1b8f508959a`, 8,945; `env-monitor-esp32`: `8e52bbe4fc07a568` (full `8e52bbe4fc07a56800045de1579b8a22c725fb129a8de73e6efea5b08a3c0e79`), 13,196; `lesson-uno-r3-button`: `1f6c95022ebf5736`, 32,911; `robot-line-follower`: `f947b3b3f79a80d1`, 23,282; `drone-quad`: `62e876e86e43eae9`, 16,005. All five are byte-identical to the writer's pretty form (VERIFIED today with `schemas/tools/project-lib.mjs`) |
| Checks per example | (1) `validateText(file)` has no errors and no V1 warning; (2) `stateHash` equals the table; (3) `canonicalBytes` equals the table; (4) the file bytes equal `toFileText(parse(file))`; (5) `schemaVersion` is `1.1` and `license.spdx` is `LicenseRef-iynk-pending` (RC-32, RC-33); (6) the generated project validator agrees with a reference Ajv on the 5 files. Check (6) runs only after T-B2-04 (a declared dependency): the test builds its **own** Ajv 2020 instance from the module name `AJV_MODULE` exported by `scripts/schema-gen.mjs` (`ajv/dist/2020.js`, or `ajv8/dist/2020.js` when T-B2-17 Q6 chose the alias; loaded with a dynamic `import(/* @vite-ignore */ name)`), adds the two domain schemas, compiles `project.schema.json` with the options of `project-lib.mjs:30-35`, and compares the verdicts. The test **never imports `schemas/tools/project-lib.mjs`**: that file imports `ajv/dist/2020.js` and compiles at import (`project-lib.mjs:2`, `:35`), its Ajv 8 sits in the gitignored `schemas/tools/node_modules` (`.gitignore:70`), and with the alias root `ajv` stays 6.15.0. The 12 broken variants are covered in T-B2-04 and T-B2-08a/08b, not repeated here |
| Question Q-15 (falsifiable) | Q: does the revision-140 state of the monitor example, rebuilt by hand from the final document, hash to the stored checkpoint `097630efe2ac0c752bc7ad7a4650ebe1e9f1a820cf67cf4d461af110aa6d127c`? Method: run two **hand-written inverse ops** through the real `applyBatch` on the final document (the inverses cannot be computed by `apply`, because that needs the pre-state being built): `fault.remove {id: 'flt_swap'}` (the history op `fault.set` added `flt_swap`) and then `source.edit {id: 'src_main', baseSeq: 142, pos: 130, del: 26, ins: ''}` (the history op inserted 26 characters, `  Serial.println("boot");\n`, at position 130, so the inverse deletes 26 and inserts nothing). Assert (a) the result has the same `stateHash` as `monitorAt140()` from T-B2-05 (the hand-built helper and the real ops agree) and (b) the recomputed hash against `097630ef...`. Evidence so far: three recipes do not reproduce it (faults `[]`: `0986fe91...`; faults key absent: `1b0aa54d...`, which the schema forbids because `Simulation.required` includes `faults`; fault kept: `c81a895e...`). Exit: **if equal,** the test asserts it and nothing else changes. **If not equal (expected),** the test declares the checkpoint comparison as `it.fails('checkpoint 097630ef... (OQ-3)', ...)`, and a second plain test asserts the recomputed value `RECOMPUTED_140`, written into the test from the run with a comment that names OQ-3. The mismatch is then recorded and not hidden; when someone fixes the example, `it.fails` goes red and says to drop it. The commit message states both values. **The example file is not edited.** Replacing the stored hash is a decision for Amar (section 7, item 5) |
| Data model, algorithm | As above. The replay check: start from `monitorAt140()` (T-B2-05), apply the two history envelopes' ops with `applyBatch`, and compare with the final `stateHash` (the same check is T-B2-07's acceptance) |
| Others | Permissions, performance, migration: none |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | The file itself: 5 examples times 6 checks, plus Q-15 (the hand-written inverse build, the `monitorAt140()` agreement, the `it.fails` entry or the plain assertion), plus a mutation guard: change one byte of a copy of an example in memory and expect the test's comparison to fail (so the test is known to bite) |
| Integration | `npm test` includes it (`vitest.config.mts:12` globs `src/**/*.test.ts`); `npm run check` includes `npm test` (`package.json:23`) |
| Playwright | None |
| Acceptance | **Given** an edit to `lesson-uno-r3-button.project.json`, **When** `npm test` runs, **Then** it fails and names the file and the hash. **Given** the hash rule changes (for example `revision` joins the hash), **When** `npm test` runs, **Then** the table fails |
| Release blockers | A hash differing from the table without an explained cause; any edit to an example file |

**Delivery.** Definition of done: test green; Q-15 answered in the commit message. Verify: `npm run typecheck && npm run lint`; `npx vitest run src/project/examples.test.ts`. Documentation: PDM 9.6's note "Monitor checkpoint hash: UNVERIFIED" is updated in T-B2-21. Rollback: revert. Later tasks need: the table, for any schema minor.

---

### T-B2-16. Headless harness, round trips, apply cost

**Identity.** Subsystem: project core (verification). Phase B2. Priority: must. Dependencies: T-B2-10, T-B2-12a (`builtinRegistry` for the tests and the script), T-B2-20c. Status: not started. Group G9.

**Intent.**

| Field | Content |
|---|---|
| Problem | R-052 asks for a core test harness with no editor; REF-3 asks for round trips of the corpus; AR-09 asks for the cost of `apply` at 500 parts and 1,000 wires (UNKNOWN today, roadmap risk R4) |
| Target user | Every later phase; Amar at the gate for the cost decision |
| User story | As the maintainer, I want to create, edit, undo, save as text, reload and compare hashes in a test with nothing else running, and I want to know what an edit costs |
| Expected behaviour | A harness builds sessions and documents; seeded generators produce valid random ops; the round-trip suite and the cost measurement run |
| Success metric | Replay equals live over 20 seeded sessions (FA-01); every untouched entity is `===` over 100 generated ops; the corpus round-trips; `apply` p95 per op at 500 parts and 1,000 wires is measured and recorded (PROPOSAL threshold 1 ms) |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | `package.json` (edit: `"measure:apply": "node scripts/measure-apply.mjs"`) |
| New files | `src/project/testing/harness.ts`, `src/project/testing/generators.ts` (portable: no `node:`), `scripts/measure-apply.mjs`; tests `src/project/roundtrip.test.ts`, `src/project/replay.test.ts`, `src/project/apply-cost.test.ts` |
| harness.ts | `newProject(opts: { title: string; board: InterfaceSnapshot; boardRef?: { ref: string; version: string } /* default core.uno-r3 / 1.0.0 */; blink: string; seed?: number; at: string; rnd: RandomSource; actor?: string }): Project` (PRD R-025 first bullet: `format iynk.project`, `schemaVersion 1.1`, fresh `prj_` id, `meta.title`, one board whose pinned interface is the `board` argument, `components = []`, `nets = []`, one view with no placements or wires, one source `main.ino` whose content is the `blink` argument, `simulation.seed`, `revision 0`). **`harness.ts` imports no part code**: the matrix lets `project` import `core` only, and the file stays portable. Tests and `scripts/measure-apply.mjs` build the arguments themselves: `board` is `interfaceOf(builtinRegistry().get('core.uno-r3', '1.0.0')!)` and `blink` is the content of `sources[0]` in `schemas/examples/uno-blink-d12.project.json` (VERIFIED: that example has one source, `src_blink`). `session(project, seedClock?)` wrapper creating a `ProjectSession` with a fake clock and seeded random; `saveText(s: ProjectSession): string` (= `toFileText(s.state)`); `openText(text: string): Result<ProjectSession, Diagnostic[]>` (validate then session); `hashOf(s)`; `replayFrom(start: Project, ops: readonly OpEnvelope[]): Project` (applies each envelope's op in order, grouping by `batch`) |
| generators.ts | `generateOp(state: Project, r: Rng, mix?: Partial<Record<OpFamily, number>>): Op \| null` returning a valid-looking op for the current state (no randomness from `Math.random`; only `rng`); op families with weights: add component, remove component, connect pin, disconnect, merge, split, place, wire add and remove, rename, source edit, fault set, param set, test set; `generateSession(seed: number, steps: number): { start: Project; ops: Op[] }`; `bigProject(parts: number, wires: number, seed: number): Project` (500 parts and 1,000 wires for the cost run: resistors in pairs on named nets, one drawn wire per net, one breadboard view) |
| scripts/measure-apply.mjs | Imports `src/project/testing/generators.ts` and `src/project/session.ts` under Node type stripping; builds `bigProject(500, 1000)`; times 2,000 ops per family with `process.hrtime.bigint()`; prints a table `family, n, p50, p95, p99, max` in microseconds, plus `stateHash` time and `validateValue` time and `checkBatch` time and `netlist` time and the machine (`os.cpus()[0].model`, Node version, load average). Wall-clock numbers vary, so this runs on demand and its output is pasted into the commit message and into `docs/ARCHITECTURE.md` by T-B2-21; it is not a gate in `npm test` |
| roundtrip.test.ts | Table-driven over the 5 examples and a **3-item corpus sample** (`board/uno-r3`, `robotics/l298n`, `drone/quad5`) converted in-process by `convertAll` in one `beforeAll`; no test sets its own timeout (the shared testTimeout is 60,000 ms, `vitest.config.mts:15`; each `it` stays under 20 s alone, and if one takes longer, stop and report, do not raise a timeout). The full-corpus round trip is already part of the `whole` status rule of T-B2-20c and runs in the gate through `npm run corpus`, so `npm test` and `npm run check` do not convert the corpus twice. Per row: `validateText` ok, `toFileText` equal to input where the input is in pretty form, save then open then save is a fixed point, equal `stateHash` after each step, `netlist` computes. DET-3 |
| replay.test.ts | 20 seeded sessions of 200 ops each (`generateSession(1..20, 200)`): replay of the session's `history.ops` from the start state gives the live `stateHash` (DET-4, FA-01); apply then inverse restores the hash for every accepted op (the property judge of section 3); a rejected op leaves the state `===`; for 100 generated ops every entity the op and its cascade did not change is `===` before and after; the two RS-09 mutants (skip a cascade, skip an op) are injected into a copy of the handlers and the checks fail (so they bite); undo to empty returns the start `stateHash`; each reject code appears at least once in the run (the test prints the histogram, so coverage of rejects is visible) |
| apply-cost.test.ts | Smaller than the script: 500 parts, 1,000 wires, 300 ops, asserts p95 under 10 ms (a ceiling, not the 1 ms proposal, so a loaded machine does not make it flaky); prints p50 and p95 |
| Data model, algorithm | As above. The harness covers R-052 steps 1, 2 and 6 to 8 of FEATURE_PRIORITIZATION 7.2 that need no worker: create, edit by ops, undo, save to text, reopen, compare hashes. Running the Blink sketch through the worker host is B3 (and the interpreter adapter that reads `nets` is B4); R-052 is therefore only partly met in B2, and says so |
| Edge cases | A generated op may be legitimately rejected; the generator may produce ops that fail (counted), but at least 70 percent of 4,000 generated ops are accepted (otherwise the generator is useless and the test fails) |
| Permissions | Generated sessions use an owner author |
| Performance | The point of the task. Decision rule recorded for Amar: if the p95 per op at 500/1,000 is at or under 1 ms for the hot families (`view.place`, `net.connect`, `wire.add`, `component.set`) the single-thread plan stands; if over 1 ms, `apply` moves into the `ProjectWorker` for those families and the editor shows optimistic state from a lighter local path (B3 plan, roadmap R4), and Amar is told before B3 starts |
| Migration | None |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | The three test files above; plus `generators.test.ts` (`generateSession` is deterministic per seed; acceptance share at least 70 percent) |
| Integration | `TP` (harness and generators are portable); `npm run measure:apply` runs and prints |
| Playwright | None |
| Acceptance | **Given** a seed, **When** a 200-op session runs twice, **Then** the two `stateHash` values are equal. **Given** 20 sessions, **When** their logs are replayed, **Then** every replay hash equals the live hash. **Given** a 500-part project, **When** `npm run measure:apply` runs, **Then** it prints p95 per family and the commit message records them |
| Observability | The reject histogram and the cost table |
| Release blockers | Any replay mismatch; any `===` identity violation |

**Delivery.** Definition of done: harness, generators, script, three test files, numbers recorded. Verify: `npm run typecheck && npm run lint`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/project`; `npm run measure:apply`. Documentation: numbers go to `docs/ARCHITECTURE.md` in T-B2-21. Rollback: revert. Later tasks need: `newProject`, `generateSession`, `bigProject`, `replayFrom`; B3 reuses the harness for the store and worker tests.

---

### T-B2-21. Docs, corpus manifest, exit gate

**Identity.** Subsystem: documentation and release. Phase B2. Priority: must. Dependencies: all earlier tasks. Status: not started. Group G10.

**Intent.**

| Field | Content |
|---|---|
| Problem | The roadmap's Documentation row (module map, import matrix, "how to add an op") has no owner, the corpus needs a committed record, the numbers need a home, and the phase needs one run of the full gate |
| Target user | The next builder; Amar at the stop |
| User story | As Amar, I want one page that says what B2 delivered, what the numbers are and what I have to decide |
| Expected behaviour | Docs are updated, the manifest is committed, `.corpus/` is ignored, the gate runs and its output is summarised |
| Success metric | Every exit-gate command green; the stop message lists the decisions |

**Implementation.**

| Field | Content |
|---|---|
| Existing files | `docs/ARCHITECTURE.md` (edit: add the module map of SYSTEM 5.2 for `core`, `project`, `parts` and the import matrix of 5.3 as built, the portable rules, the `schema:gen` and `corpus` commands, the measured numbers of T-B2-03, 09, 13, 16, the exemption list, the three ratchets and the converter input-type decision of the architecture test (T-B2-01), and the note for B7 that the async `Authority` is not built); `.gitignore` (add `/.corpus/`) |
| New files | `src/project/apply/README.md` ("how to add an op": schema edit, `schema:gen`, handler with inverse, rule in `semantic.ts`, coverage table row, test; about 40 lines), `src/project/convert/corpus.manifest.json` (from `npm run corpus`, 140 rows) |
| Doc corrections to list (not edited, because the PDM is design input): PDM 3.4 "27 parts declare legs" (measured 28); roadmap B2 "14 / 22 / 28" (measured 13 / 22 / 29); PDM 9.6 monitor checkpoint (per Q-15; the example is not changed); PDM 11.3 targets `domains.robotics.data.*` and `domains.drone.data.*` that the domain schemas do not have (OQ-12); ADR-0102 "20 prefixes" (22); ADR-0110 decision 2 ("no `allErrors` in production", dropped); the roadmap T-B2-15 text (examples already at 1.1). They go in a list at the end of `docs/ARCHITECTURE.md` under "Corrections to the design documents" for the RECONCILIATION owner |
| Gate run | `npm run check` (content check, schema check, typecheck including portable, lint, test, e2e); `npx tsc -p tsconfig.portable.json`; `npm run schema:check`; `npm run corpus` (the one full 38-item run; commit its manifest to `src/project/convert/corpus.manifest.json`); `npm run corpus -- --check`; `npm run measure:apply`. Keyless env for the e2e part per `BUILD` in section 0.2. Re-run AX-03 with the real modules: a throwaway page importing `src/project/hash.ts` and `src/parts/builtin.ts`, `BUILD`, then delete the page |
| Others | Permissions, performance, migration: none |

**Verification.**

| Field | Content |
|---|---|
| Unit tests | None new. `npm run corpus -- --check` is the manifest test |
| Integration | The gate list above |
| Playwright | The existing suite, unchanged, as part of `npm run check` |
| Acceptance | **Given** a clean `build/v1`, **When** the gate commands run, **Then** all exit 0. **Given** the manifest, **When** the converter changes output, **Then** `--check` fails |
| Release blockers | Any gate command red |

**Delivery.** Definition of done: docs, manifest, ignore entry, gate output summarised in the stop message. Verify: the gate list. Rollback: revert. Later tasks: B3 reads `docs/ARCHITECTURE.md`.

---

## 5. Exit gate (phase B2)

| # | Check | Command | Pass condition |
|---|---|---|---|
| 1 | Whole repo | `npm run check` | exit 0 (includes `schema:check`, the portable typecheck, the examples hash test, the architecture test) |
| 2 | Portable typecheck alone | `npx tsc -p tsconfig.portable.json` | exit 0 |
| 3 | Schema in sync | `npm run schema:check` | exit 0 |
| 4 | Examples | `npx vitest run src/project/examples.test.ts` | green, five hashes equal the table |
| 5 | Converter | `npm run corpus` | 38 items in the report; 140 projects; zero `failed`; the legacy list printed for Amar |
| 6 | Apply cost | `npm run measure:apply` | table printed, numbers in the commit and in `docs/ARCHITECTURE.md`; if a hot family p95 is over 1 ms, flag it |
| 7 | All 64 kinds | `npx vitest run src/project/apply/apply.coverage.test.ts` | `IMPLEMENTED_KINDS` equals the schema's 64 |
| 8 | Replay | `npx vitest run src/project/replay.test.ts` | 20 sessions, replay equals live |
| 9 | Build still works | `BUILD` | exit 0 (nothing in B2 is imported by a page, so the app is unchanged) |
| 10 | Amar's OK | the stop message | decisions in section 8 answered or deferred |

## 6. Requirement coverage

| Requirement | Where | Notes |
|---|---|---|
| F-076, R-025 | T-B2-04, 05 to 07, 09, 16 | Document type, `newProject` in the harness |
| R-026 | T-B2-03, 09, 15 | Hash, canonical bytes, 20 ms target measured |
| R-027 | T-B2-09 | Newer version refused; no migration exists to run yet (PDM 10.1) |
| R-028 | T-B2-08a, 08b, 22 | Recovery view UI is B3; the report is built here |
| R-029, F-097 | T-B2-11a, 11b, 12a, 12b | Descriptor, registry, interface, fallback, first seven parts |
| R-030 | T-B2-02, 11 | Open ids; the closed unions in `src/content/ids.ts:22` and the second `BoardId` at `src/lib/interp/profiles.ts:6` stay until LABS moves them (PRD allows this) |
| R-031, F-078 | T-B2-13 | Netlist; the id rule uses the smallest pin key as R-031 says |
| R-032, F-077 | T-B2-14, 19, 20a, 20b, 20c | 38 items, 140 projects, report; "non-Uno boards recorded as deferred-to-LABS" in R-032 is superseded by PDM 11 (all 38 convert) |
| R-033, F-083 | T-B2-05 to 07, 10 | 64 kinds; room ordering is B7 |
| R-034 | T-B2-10 | In-memory per-author undo |
| R-052 | T-B2-16 | Partly: the worker run (steps 3 to 5) is B3 |

## 7. For Amar (not build tasks)

| # | What | Why a person must do it |
|---|---|---|
| 1 | Choose the licence (D-017) | Every descriptor and project carries `LicenseRef-iynk-pending` until then. No agent chooses it |
| 2 | Review third-party content for rewrite | The converter marks each project `thirdParty` `unchecked`; the descriptors cite web sources through `docs/facts/`. Clearing or rewriting them (F-197) is a reading task for a person, and publishing is blocked on it |
| 3 | Decide if a named list of legacy items is acceptable at the gate | The converter report may keep some benches as legacy data. That is a scope call |
| 4 | Decide what to do if `apply` is over budget | Only if T-B2-16 reports a hot-family p95 over 1 ms: move `apply` into the worker or relax the budget |
| 5 | Decide the monitor checkpoint hash (OQ-3) | T-B2-15 does not edit the example (RC-32: "the example file is not changed"). If the recomputed revision-140 hash differs from `097630ef...`, Amar decides whether to replace the stored hash in `env-monitor-esp32.project.json` (a one-line edit, then drop the `it.fails` entry) or to change the hash rule |
| 6 | Checking simulated faults on a real board with a multimeter | Not in B2 (no simulation). Listed so it is not forgotten for B10 |

## 8. Open questions and decisions this plan made

| ID | Question or decision | Label | Where it bites |
|---|---|---|---|
| OQ-1 | Descriptor folder: the roadmap uses `src/parts/data/`; ADR-0200 option (a) says repo-root `parts/` built to `public/parts/`. This plan follows the roadmap because rows B4, B5, B9, B11, B18 name `src/parts/data/` | PROPOSAL | T-B2-12a; one constant moves it |
| OQ-2 | Schema home: the generator reads `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/`. If `docs/MASTER_PLAN` is later archived, move the four schemas and the examples to `schemas/` at the repo root with `git mv` and change one constant | PROPOSAL | T-B2-04 |
| OQ-3 | Monitor checkpoint `097630ef...` is not reproduced by three recipes. T-B2-15 builds the revision-140 state with two hand-written inverse ops, records the recomputed hash with `it.fails`, and does **not** edit the example (RC-32). Amar decides the replacement (section 7, item 5) | VERIFIED evidence, DECISION left to Amar | T-B2-15 |
| OQ-4 | SYSTEM 5.3 rule 1 wants zero `@/components` imports in `src/lib` by the end of CORE; the roadmap scope has no task that moves `src/lib` code. B2 enforces the matrix for new code only (`core`, `protocol`, `project`, `parts`, `sim`, `export`, `server`) and holds the existing tree with three ratchets: `@/components` in `src/lib` at most 39 lines (34 files), `src/content` to `@/lib`, `@/components`, `@/app` at most 112 lines, `@/app` in `src/lib` at most 4 lines (all VERIFIED by grep 2026-10-27; T-B2-01 re-measures). Does Amar want a clean-up task added to B2, or accept the ratchets until the labs move? | UNKNOWN | T-B2-01 |
| OQ-5 | `meta.set` cannot clear `description` or `tags`, and `board.set` cannot remove `firmware`, so some inverses are not expressible in opSchema 1.1. B2 treats an empty string or array as removal and accepts `firmware: null` in `board.set.set`. A schema minor (1.2) that adds these would be cleaner; RECONCILIATION owns it | PROPOSAL | T-B2-05 |
| OQ-6 | FRONTEND 6.4's async `Authority` and `PendingBatch` are not built in B2: `ProjectSession` calls a synchronous `LocalAuthority.stamp`, so there is one counter for `seq`. B7 builds the room authority; a `PendingBatch` there needs an `inverse` field because a local authority cannot compute inverses | PROPOSAL | T-B2-10 |
| OQ-7 | ADR-0110 decision 2 (no `allErrors` in production) is dropped: one validator with `allErrors: true` costs 0.63 ms at 500/1,000 (VERIFIED, PDM 9.6) | PROPOSAL | T-B2-04 |
| OQ-8 | The corpus is not committed; a 140-row manifest is, and `npm run corpus -- --check` guards drift. Committing all 140 projects would add about 5 MB (ESTIMATED from 8 to 52 KB each) | PROPOSAL | T-B2-20c, 21 |
| OQ-9 | Behavioural check parity (R-141, "same verdicts on the old and new path") needs the interpreter adapter that reads `nets`, which is B4/B5. B2 proves structural parity (checks unchanged) and netlist parity (the figure engine oracle for the Uno). Behavioural parity moves to the first phase that has the adapter | DOCUMENTED | T-B2-19 |
| OQ-10 | V5-SVG and the SVG corpus S1 to S12 (PDM 9.5) need the sanitiser that comes with asset import (B3). Not in B2 | DOCUMENTED | T-B2-08a |
| OQ-11 | Module refs for benches (`core.l298n` and so on) have no descriptors in B2; they are reported `no-descriptor` and their pins come from the figure module tables. Descriptors arrive in B11 (T-B11-03) | DOCUMENTED | T-B2-20a |
| OQ-12 | PDM 11.3 sends bench data to `domains.robotics.data` (power, modes, status, current, faultRules) and craft data to `domains.drone.data` (frame, parts, build steps, and so on). Neither domain schema has those fields (`additionalProperties: false`; the robotics schema also requires `physics`, `surfaces`, `bodies`, `joints`, `wheels`, `sensors`, `arena`). B2 follows the schemas (RECONCILIATION R4): benches have no `domains.robotics`, crafts have a valid `legacy-craft` envelope, and the rest sits in the project `ext` under `x-iynk-legacy-bench` and `x-iynk-legacy-craft`. Should RECONCILIATION add these fields to the domain schemas instead (B16, B18 and B19 own those schemas)? | PROPOSAL | T-B2-20a, 20b |

## 9. Risks specific to this breakdown

| Risk | Label | Mitigation |
|---|---|---|
| Turbopack rejects `.ts` or `#core/*` imports | UNKNOWN | T-B2-01 proof first; nothing in B2 imports portable code into a page; fallback ADR-0014 option B decided at the stop |
| Root `ajv` 6 and 8 conflict | UNKNOWN | T-B2-17 Q6 before T-B2-04 |
| Figure files cannot be read in plain Node | UNKNOWN | T-B2-18 Q1; fallback in T-B2-14 is the jsdom `testkit.mjs` loader or per-board regex extraction, and the legacy path for the rest |
| `checkBatch` is too slow for the 1 ms budget | UNKNOWN | T-B2-16 measures each piece; the reference-identity scoping in T-B2-08b is the main lever |
| Seven new descriptors are authored by agents from fact sheets and may overclaim fidelity | HYPOTHESIS | D-007 copy rule in `validateDescriptor`; a person reviews at the gate (`For Amar` 2) |
| Large generated validator (about 1 MB) committed | DOCUMENTED | Same pattern as `src/content/index.generated.ts`; `schema:check` guards drift; it loads in a worker, not the first-load bundle |
| Sonnet agents hit the 5-file limit on T-B2-14 or 19 | ESTIMATED | Each is already split; if still too big the agent stops and reports rather than widening the task |
| T-B2-14 carries the whole `Convert*` input type set, and a later builder finds a field missing | HYPOTHESIS | The drift test (`input-types.drift.test.ts`) catches renamed fields, not missing ones; a builder that needs a field stops and reports, and the fix is a one-line edit of `types.ts` by the orchestrator in a follow-up commit |
| The lettered splits stretch the critical path from 8 to 10 groups | ESTIMATED | G7 and G8 run only converter tasks; T-B2-15 and T-B2-22 sit in G6 beside T-B2-10 and T-B2-19, so the extra groups add no idle agents beyond what the dependencies force |
| The architecture test leaves `content`, `ui` and `labs` unconstrained | DOCUMENTED | Three ratchets (39, 112, 4) stop growth; OQ-4 asks Amar whether to clean up |

## Review fixes (2026-10-27)

Fourteen review issues were checked against the repo and the plan. Eleven are applied (issues 4 and 12 by the first option offered) and three are applied in part (issues 1, 8 and 14); the reasons are below. This is the only agent editing this file in this step. Evidence is quoted as `path:line`.

| # | Issue | Verdict | What changed | Evidence |
|---|---|---|---|---|
| 1 | Inverses of `component.remove`, `board.remove`, `net.merge`, `net.delete`, `net.disconnect` use ops that do not exist when T-B2-05 and T-B2-06 run | Applied in part | T-B2-05 and T-B2-06 now assert every inverse as an exact golden `Op[]` and rejects as `===`. The hash round trip for `component.remove`, `board.remove`, `net.merge` and `net.delete` moved to a new file owned by T-B2-07, `apply.inverse.test.ts`. Success metrics, Acceptance, Release blockers and section 3 reworded. **Not moved:** `net.disconnect` and `view.remove`. Their inverses use only `net.create`, `net.connect`, `wire.add`, `junction.add`, `view.add`, `view.place`, `label.set`, `group.set`, all registered by T-B2-05 and T-B2-06, so their hash tests can pass in G4. T-B2-07 repeats them as a cross-check | Handler text in T-B2-06 (inverse list); the issue's own list of unregistered ops names `fault.set`, `input.set`, `runtime.set`, `source.add`, `test.set`, none of which `net.disconnect` or `view.remove` needs |
| 2 | Tests import `schemas/tools/project-lib.mjs`, which needs Ajv 8 that a fresh checkout lacks | Applied | T-B2-03 compares `prettyPrint` with the bytes of the five example files and keeps the PDM 6.3 literals inline. T-B2-09 says no test imports the file. T-B2-15 check (6) now builds its own Ajv from `AJV_MODULE` (a new export of `scripts/schema-gen.mjs`, T-B2-04) and runs only after T-B2-04, which is now a declared dependency of T-B2-15 | `project-lib.mjs:2` (`import Ajv2020 from 'ajv/dist/2020.js'`), `:35` (`ajv.compile(projectSchema)` at import); `.gitignore:70` (`docs/MASTER_PLAN/**/node_modules/`); root `ajv` 6.15.0 (section 0.1) |
| 3 | The architecture test cannot find 0 violations on the existing tree | Applied | T-B2-01 enforces the matrix only for `core`, `protocol`, `project`, `parts`, `sim`, `export`, `server`. `content`, `ui`, `labs` are unconstrained and held by three ratchets: 39 (`@/components` in `src/lib`), 112 (`src/content` to `@/lib`, `@/components`, `@/app`), 4 (`@/app` in `src/lib`). Numbers written in the test row and in OQ-4 | Re-measured with grep today: `grep -rn "from '@/\(lib\|components\|app\)" src/content` gives 112 lines; `grep -rn "from ['\"]@/app" src/lib` gives 4; `src/content/schema.ts:16`, `src/content/drones/_checks.ts:9-12`. The issue's "136 files import content or i18n" was not re-counted, and is not used |
| 4 | The converter in `src/project/convert` is typed with `src/content` types | Applied (option 1) | T-B2-14 `types.ts` holds a local structural `Convert*` input set; T-B2-14 adds `input-types.drift.test.ts`, a non-portable test that assigns the content types to them. T-B2-19, T-B2-20a and T-B2-20b use only the local set. The decision is recorded in T-B2-01 (matrix row `project` stays "core only") | `src/content/schema.ts:16` imports `@/lib/drone/calc`; PDM 11.3 type list |
| 5 | `newProject` imports the builtin Uno from `src/parts` | Applied | `newProject` takes `board: InterfaceSnapshot` and `blink: string` (plus an optional `boardRef`). Tests and `scripts/measure-apply.mjs` pass `interfaceOf(builtinRegistry().get('core.uno-r3','1.0.0'))`. T-B2-16 now also depends on T-B2-12a | `uno-blink-d12.project.json` has one source `src_blink` |
| 6 | Tests cross forbidden module pairs; exemptions undefined | Applied | T-B2-01 defines `isExempt`: `*.test.ts`, `*.testing.ts` and `src/project/testing/**` are exempt from the matrix and from rule 2. Rule 3 (docblock) still applies to `*.test.ts`. Exemption unit test (f) added. `harness.ts` is nonetheless written without part imports (issue 5), so it stays portable in fact | Cross-module tests named in T-B2-01: `parts/data.test.ts`, `parts/library-check.test.ts`, `convert/text.test.ts`, `roundtrip.test.ts` |
| 7 | T-B2-15 edits the monitor example against RC-32 | Applied | The example is not edited. The revision-140 state is built with two hand-written inverse ops (`fault.remove flt_swap`; `source.edit src_main` with `del 26`, `ins ''`, `pos 130`) through the real `applyBatch`. The recomputed hash is asserted; a mismatch is recorded with `it.fails` plus a plain test of the recomputed value, named OQ-3. The edit moved to "For Amar" item 5. File-ownership row for the example removed | RECONCILIATION RC-32: "Example files are the truth: checkpoint `097630ef...`"; the example's history: `source.edit` `del 0`, `ins` of 26 characters at `pos 130`, then `fault.set` of `flt_swap` |
| 8 | Nothing says how the revision-140 state is built for T-B2-07 | Applied with one change | `monitorAt140()` is in T-B2-05's `fixtures.testing.ts`, and T-B2-07 and T-B2-15 cite it. **Change:** the issue says to leave `history` unchanged because the hash ignores it. That is right for the hash but wrong for replay: `source.edit` transforms over `state.history.ops` with `seq > baseSeq` (T-B2-07), so a state that still holds op 141 would transform the replayed edit over itself. `monitorAt140()` therefore has `history.ops = []` (the true revision-140 history); `baseRevision`, `baseChain` and the checkpoint are as in the file | The example's `history.baseRevision` is 140 and `ops` hold seq 141 and 142 |
| 9 | T-B2-22 has undeclared dependencies and a race with T-B2-19 | Applied | T-B2-22 depends on T-B2-11a, 11b, 12b and 14 and moves to G6. The "converter output has no `V6-SURFACE-EMPTY`" assertion moved to T-B2-20c `index.test.ts`. T-B2-08 dropped from its dependencies (V6 lives in `src/parts`) | Section 2 table |
| 10 | T-B2-20 is too big and has no field mapping | Applied | Split into T-B2-20a (`bench.ts`), T-B2-20b (`practice.ts`, `craft.ts`), T-B2-20c (`index.ts`, `scripts/convert-catalogue.mjs`, `package.json`, report, manifest). Each has a field table built from the real key lists (`node scripts/gen-content-index.mjs --emit robotics/l298n` and `drone/quad5`) and from the domain schemas. The T-B2-22 dependency is dropped from 20a and 20b and kept for 20c, where `index.test.ts` uses it. **New finding while writing the tables:** PDM 11.3's `domains.robotics.data.power/modes/faultRules/status/current` and `domains.drone.data.frame/...` do not exist in the domain schemas, which set `additionalProperties: false`. The tables follow the schemas and put the legacy data in the project `ext` (OQ-12) | `schemas/robotics.domain.schema.json` (required: physics, surfaces, bodies, joints, wheels, sensors, arena; `additionalProperties` false); `schemas/drone.domain.schema.json` (required: kind, thrustSource, flight, environment, course, bench); `drone-quad.project.json` `domains.drone` |
| 11 | T-B2-08, T-B2-11, T-B2-12 are each more than one sitting | Applied | 08a (`validate.ts`, `limits.ts`: V1, V2, V4, V5) and 08b (`semantic.ts`, `semantic.entity.ts`, `semantic.cross.ts`: V3, plus a one-line edit of `validate.ts`). 11a (`descriptor.ts`, `semantic.ts`, `registry.ts`) and 11b (`pins.ts`, `fallback.ts`). 12a (Uno descriptor, `builtin.ts`, `browser/load.ts`) and 12b (six descriptors plus a `builtin.ts` edit). Groups, ownership and dependencies rewritten; the critical path is now 10 groups | Sections 2, 2.1, 2.2 |
| 12 | `createLocalAuthority` and the async `Authority` are dead code beside `ProjectSession.apply` | Applied (option 1) | `authority.ts` exports `createLocalAuthority(...)` returning `{ stamp(ops, author), mode: 'local' }`. `ProjectSession` calls `stamp` synchronously and has no `authority` option. `PendingBatch`, `SubmitResult`, `Authority`, `onRemote`, `onResync` are not written in B2. "Later tasks need", the T-B2-21 doc note and OQ-6 updated | T-B2-10 Behaviour text (envelopes, `LocalSeq`) |
| 13 | Two codes for the 65,536-byte op, and two `invariants` signatures | Applied | One code: `quota` (PDM 7.2, limit table of 9.4 lists 65,536 bytes per op envelope). The check runs first in `applyBatch`. Section 3 `ApplyContext.invariants` is `(next: Project, prev: Project) => Diagnostic[]` | `PROJECT_DATA_MODEL.md:807` (`quota`: a limit in section 9.4), `:998` (one op envelope 65,536 bytes) |
| 14 | Corpus conversion in tests exceeds Vitest's 5 s default and runs twice | Applied in part | The default is not 5 s here: `vitest.config.mts:15` sets `testTimeout: 60_000`. A 90 s full run still exceeds it, so the fix stands. Tests now use a 3-item sample (`board/uno-r3`, `robotics/l298n`, `drone/quad5`), run it once in a shared `beforeAll`, and rely on the shared 60,000 ms testTimeout: one item per `it`, each under 20 s alone, with a stop-and-report rule instead of a raised timeout (TEST_STRATEGY T5 and 3.6). The full 38-item run is `npm run corpus`, once, in the gate. `scripts/convert-catalogue.mjs` gained `--only` and `--out` for the sample test | `vitest.config.mts:15` |

### Updated task list (27 tasks)

| Group | Tasks |
|---|---|
| G1 | T-B2-01, T-B2-17, T-B2-18 |
| G2 | T-B2-02, T-B2-03, T-B2-04 |
| G3 | T-B2-05, T-B2-09, T-B2-11a, T-B2-11b, T-B2-13 |
| G4 | T-B2-06, T-B2-08a, T-B2-12a, T-B2-14 |
| G5 | T-B2-07, T-B2-08b, T-B2-12b |
| G6 | T-B2-10, T-B2-15, T-B2-19, T-B2-22 |
| G7 | T-B2-20a, T-B2-20b |
| G8 | T-B2-20c |
| G9 | T-B2-16 |
| G10 | T-B2-21 |

New open question: OQ-12 (domain schemas versus PDM 11.3). Changed open questions: OQ-3, OQ-4, OQ-6. Changed "For Amar" item: 5.

## Cross-review fixes (2026-10-27)

| # | Issue | Result | Evidence |
|---|---|---|---|
| 1 | Per-test timeouts of 120 s and 180 s contradict TEST_STRATEGY (no test file sets its own timeout) and T-B0-01's grep | Applied | Removed `{ timeout: 120_000 }` from T-B2-20a (`bench.test.ts`), T-B2-20b (`practice.test.ts`) and T-B2-20c (`index.test.ts`), and the 120 s and 180 s wording in review row 14. Each now says: convert one item per `it` (3-item sample), shared `beforeAll` converts once, each `it` under 20 s alone, shared 60,000 ms testTimeout applies (`vitest.config.mts:15`), stop and report if slower, never raise a timeout. The full 38-item run stays `npm run corpus` in the gate |
| 1b | Same defect in three places the issue did not list | Applied (same rule) | `scripts/convert-catalogue.test.mjs` (`{ timeout: 180_000 }`) in T-B2-20c, `lesson.test.ts` (`{ timeout: 120_000 }`) in T-B2-19, and `roundtrip.test.ts` (`{ timeout: 180_000 }`) in the roundtrip row. Leaving them would still fail T-B0-01's grep |

Task ids, parallel groups and file ownership are unchanged.
