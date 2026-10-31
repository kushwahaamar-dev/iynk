# Task specifications: index of every build task

Written 2026-10-27 for the build-plan step of the iynk master plan. Plan only: no file in `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed, nothing was committed, and the task files under `05_ENGINEERING/tasks/` were read, not changed. This file is generated from those 21 files; it does not replace them.

Labels: VERIFIED (read in a file or counted by a command in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.

## 1. What this file is and how it was built

| Item | Value |
|---|---|
| Sources | `05_ENGINEERING/tasks/B0-foundation-green-safe.md` to `B20-export-physical-build.md`: 21 files, 35,622 lines (VERIFIED, `wc -l`). Phase order and names follow `IMPLEMENTATION_ROADMAP.md` section 1, which follows D-014. |
| Method | Each file carries its own task index or group table. The id, title, dependency, group and file-count cells below are copied from those tables. Where a file has no such cell, the value came from the task card (`### T-Bn-nn` heading and its Identity line) or from the file ownership paragraph. Where nothing gives a count, the cell says "see card". |
| Authority | The task file wins for ids, counts, dependencies and groups. The roadmap card rows are the original sizing (`IMPLEMENTATION_ROADMAP.md` line 38 note). If this file and a task file disagree, the task file is right and this file is stale. |
| Status | Every task is "not started". VERIFIED by script: every card states "not started" in its first 60 lines except four that carry no status line (T-B12-14, T-B12-15, T-B12-16, T-B16-35). No build code exists: `ls src` shows `app components content i18n lib` only, and the repository has the one branch `main` plus a backup branch, so `build/v1` is not cut yet (VERIFIED). |
| Files column | Source files the task edits or creates, by the roadmap counting rule (tests and fixtures free; one i18n namespace in six languages is 1; a data set of one kind is 1; `package.json` with its lockfile is 1). "see card" means the count is in the card prose and is not in an index. A count of 0 is a spike, a test-only task or a docs task. |
| Depends on | Verbatim from the task file. A bare number such as `03` or `07a` means a task of the same phase. `B3` or `B2 (T-B2-04)` means an earlier phase. "all" means every other task of the phase. |
| Group | The task file's own parallel group. Groups run in order inside a phase. Tasks in one group touch disjoint files and may be built by separate agents at the same time. |

## 2. Totals

Index rows are the tasks listed in the phase table below, spikes included. Roadmap column is the count in `IMPLEMENTATION_ROADMAP.md` section 1 (card headings, spikes of B3 and B18 excluded in some rows). They differ where a task file added spikes or combined cards.

| Phase | Name | D-014 phase | Tasks | of which spikes | Groups | Roadmap count |
|---|---|---|---|---|---|---|
| B0 | Foundation: green, safe, smaller | B0 foundation | 32 | 1 | 9 (G1 to G9) | 30 |
| B1 | Foundation: your own keys, open source, honest and light | B0 foundation | 33 | 3 | 10 (G1 to G10) | 30 |
| B2 | Project core: document and netlist | Project core | 27 | 2 | 10 (G1 to G10) | 27 |
| B3 | Project core: storage, runtime, replay | Project core | 30 | 3 | 9 (G1 to G9) | 27 |
| B4 | Studio editor: the Uno slice | Studio editor | 28 | 0 | 10 (G1a to G7b) | 28 |
| B5 | Studio editor: all boards, views, history, phone | Studio editor | 25 | 1 | 8 (G1 to G8) | 25 |
| B6 | Collaboration: server, identity, buddies | Collaboration | 25 | 1 | 9 (G1 to G8) | 25 |
| B7 | Collaboration: rooms, shares, leaderboard | Collaboration | 41 | 1 | 10 (G1 to G10) | 41 |
| B8 | Fidelity: live analog, instruments, replay | Simulation fidelity | 32 | 1 | 11 (G1 to G11) | 32 |
| B9 | Fidelity: chip engines, buses, compile, debugger | Simulation fidelity | 37 | 1 | 7 (G1 to G7) | 37 |
| B10 | Faults on any circuit | Faults | 34 | 1 | 8 (G1 to G8) | 34 |
| B11 | Components | Components | 28 | 1 | 6 (G1 to G6) | 25 |
| B12 | Labs moved in: Board lab | Labs moved in | 28 | 1 | 8 (G1 to G8) | 28 |
| B13 | Labs moved in: Robotics and Drone labs | Labs moved in | 41 | 1 | 10 (G1 to G10) | 41 |
| B14 | AI partner: keys, relay, grounded read-only | AI partner | 37 | 2 | 9 (G1 to G9) | 35 |
| B15 | AI partner: proposals and teaching modes | AI partner | 36 | 2 | 9 (G1 to G9) | 36 |
| B16 | Robotics creation: physics and line follower | Robotics creation | 41 | 2 | 12 (G0 to G11) | 41 |
| B17 | Robotics creation: arm, ROS-like graph, URDF | Robotics creation | 24 | 1 | 7 (G1 to G7) | 24 |
| B18 | Drone creation: parts, propulsion, builder | Drone creation | 42 | 2 | 10 (G1 to G10) | 40 |
| B19 | Drone creation: rigid-body flight and traces | Drone creation | 31 | 2 | 11 (G1 to G11) | 31 |
| B20 | Export and physical build | Export and build | 44 | 2 | 12 (G0 to G11) | 44 |
| | Total | | 696 | 31 | | 681 |

Spike counts use the rule "id starts with S-, or the title starts with Spike". They are a count of tasks that produce a report instead of product code.

### 2.1 Where the index and the roadmap counts differ

| Phase | Index | Roadmap | Why |
|---|---|---|---|
| B0 | 32 | 30 | The file keeps the roadmap's ids T-B0-01 to T-B0-25 and adds T-B0-26 to T-B0-32 (B0 section 0). One is a spike (T-B0-26). |
| B1 | 33 | 30 | Three spikes (S-B1-01 to S-B1-03) are listed in the index; the roadmap counts 30 build tasks. |
| B3 | 30 | 27 | Three spikes (T-B3-S1 to S3). |
| B11 | 28 | 25 | The index lists T-B11-02b2, T-B11-02c2 and T-B11-03b2, which have no card of their own; each shares a card with its sibling (02b1, 02c1, 03b1). The roadmap counts cards. |
| B14 | 37 | 35 | Two spikes (S-B14-01, S-B14-02). |
| B18 | 42 | 40 | Two spikes (T-B18-S1, T-B18-S2). |

The roadmap column sums to 681, the figure in its total row (VERIFIED). The index sums to 696, which is 15 more: B0 +2, B1 +3, B3 +3, B11 +3, B14 +2, B18 +2. A build workflow should use the index counts and treat 681 as the roadmap's original sizing.

## 3. Task tables, one per build phase

Rows are sorted by group, then by the order of the phase's own index. Task ids are written in full.

### B0. Foundation: green, safe, smaller

Source: `05_ENGINEERING/tasks/B0-foundation-green-safe.md`. 32 tasks, 9 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B0-26 | Spike: what makes the `]` shortcut miss | none | G1 | 0 | not started |
| T-B0-01 | Drone figure tests step simulated time, not the wall clock | none | G1 | 3 | not started |
| T-B0-02 | Split the basys3 display sweep; one shared test timeout | none | G1 | 1 | not started |
| T-B0-03 | Playwright isolation: blank keys, skip port 43117, no request leaves localhost | none | G1 | 2 | not started |
| T-B0-05 | Under `CI=true` a missing service fails the test and names it | none | G1 | 1 | not started |
| T-B0-07 | Secret scanner: history once, then the diff | none | G1 | 2 | not started |
| T-B0-08 | Telemetry: default off, no network call | none | G1 | 2 | not started |
| T-B0-09 | MCP drops `get_passport` and `plan_build_night` | none | G1 | 4 | not started |
| T-B0-25 | Interpreter caps: 1,000,000 elements, 1 MB serial | none | G1 | 3 | not started |
| T-B0-04 | Fix the `]` shortcut race without a retry | 03, 26 | G2 | 2 | not started |
| T-B0-06 | CI workflow and `scripts/ci-local.sh` | 03, 05, 07 | G2 | 2 | not started |
| T-B0-10 | Dock, nav, footer stop offering Passport and Verify; dock stops feeding the story log | 03 | G2 | 5 | not started |
| T-B0-20 | Remove Vercel and Vultr from the repo; `/metrics` off the proxy | none | G2 | 5 | not started |
| T-B0-11 | Remove Solana server code, the `solana` flag and its env | 10 | G3 | 4 | not started |
| T-B0-13 | Remove Build Stories, client side | 10 | G3 | 5 | not started |
| T-B0-15 | Remove Build Night | 09 | G3 | 1 | not started |
| T-B0-12 | Remove Solana client code and pages | 10, 11 | G4 | 2 | not started |
| T-B0-14 | Remove Build Stories, server side, and the image route | 13, 11 | G4 | 5 | not started |
| T-B0-16 | Remove the public buddy pool, matcher, board and live counter | 15, 03 | G4 | 5 | not started |
| T-B0-17 | Remove the telemetry route and the Postgres layer | 08, 11, 14, 16 | G5 | 4 | not started |
| T-B0-19 | Delete orphan i18n keys in six languages | 10, 12, 13, 15, 16 | G5 | 4 | not started |
| T-B0-21 | Security headers on every route; `poweredByHeader: false` | 03, 11, 20 | G5 | 1 | not started |
| T-B0-18 | Delete `solana/`, drop dependencies, rewrite `.env.example`, drop the `.vercel` ignore line | 12, 17 | G6 | 3 | not started |
| T-B0-22 | Route classes, one access helper, env switches | 14, 17 | G6 | 3 | not started |
| T-B0-28 | Telemetry leftovers: drop dead exports and constants | 08, 16, 17 | G6 | 5 | not started |
| T-B0-23 | Apply the classes: server token (401) and `feature_disabled` (501) on the kept routes | 09, 14, 22 | G7 | 5 | not started |
| T-B0-24 | `IYNK_TRUST_PROXY` gates forwarded headers; no shared `unknown` key | 22 | G7 | 1 | not started |
| T-B0-27 | Strike removed-feature lines from README | 12, 13, 15, 16, 17, 18 | G7 | 1 | not started |
| T-B0-29 | Remove CORS `*` from MCP and OpenAPI; drop the image smoke call | 23 | G8 | 4 | not started |
| T-B0-31 | Slow-test report script and the `.only` guard in `scripts/ci-local.sh` (TS-2) | 06 | G8 | 2 | not started |
| T-B0-32 | One `randomTestPort()` that never draws 43117, used by the relay tests (TS-1) | 05 | G8 | 4 | not started |
| T-B0-30 | Phase exit gate (no file changes) | all, including 31 and 32 | G9 | 0 | not started |

### B1. Foundation: your own keys, open source, honest and light

Source: `05_ENGINEERING/tasks/B1-foundation-keys-oss-honest.md`. 33 tasks, 10 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| S-B1-01 | CSP by SRI hashes: does it pass on this app (FA-05) | B0 | G1 | 1 | not started |
| S-B1-02 | Figure idle redraw: confirm the cause | B0 | G1 | 1 | not started |
| S-B1-03 | Late editor chunk and prefetch setting (FA-03) | B0 | G1 | 2 | not started |
| T-B1-01 | Keys store | B0 | G1 | 2 | not started |
| T-B1-14 | Figures are first-party test | B0 | G1 | 0 | not started |
| T-B1-17 | Licence placeholder and provenance record | B0 | G1 | 5 | not started |
| T-B1-18 | Operator, data and low-end docs | B0 | G1 | 3 | not started |
| T-B1-19 | Honest copy in six languages | B0 | G1 | 3 | not started |
| T-B1-22 | Load the editor and dock panels on demand | B0 | G1 | 3 | not started |
| T-B1-02 | Keys dialog in Settings | T-B1-01 | G2 | 2 | not started |
| T-B1-03 | Clients send the key and token headers | T-B1-01 | G2 | 4 | not started |
| T-B1-04 | Server env for bring-your-own keys | B0 | G2 | 3 | not started |
| T-B1-13 | CSP and `/boot.js` | S-B1-01 (pass), T-B1-14, T-B1-04 | G2 | 4 | not started |
| T-B1-16 | Contributor files | B0, T-B1-17, T-B1-18 | G2 | 4 | not started |
| T-B1-25 | Figure idle redraw fix (go or no-go) | S-B1-02 | G2 | 4 | not started |
| T-B1-05 | AI server takes the caller's key | T-B1-04 | G3 | 5 | not started |
| T-B1-10 | Prompt-injection quick wins | B0 | G3 | 5 | not started |
| T-B1-11 | `/config.json` and the capability probe (interim, see RC-73) | B0, T-B1-04, T-B1-10 | G3 | 4 | not started |
| T-B1-21 | Home page rewrite | T-B1-19 | G3 | 4 | not started |
| T-B1-23 | Apply the prefetch finding | S-B1-03, T-B1-13 | G3 | 3 | not started |
| T-B1-27 | Local log, error capture and viewer | T-B1-02 | G3 | 5 | not started |
| T-B1-06 | Per-key spend ledger and daily cap | T-B1-05 | G4 | 5 | not started |
| T-B1-30 | Shared `NotSetUp` component | T-B1-02 | G4 | 3 | not started |
| T-B1-07 | Usage endpoint and client reader (interim, see RC-74) | T-B1-03, T-B1-06, T-B1-11 | G5 | 3 | not started |
| T-B1-08 | Search takes the caller's key; search budget in the ledger | T-B1-06 | G5 | 1 | not started |
| T-B1-15 | README rewrite | T-B1-06, T-B1-07, T-B1-08, T-B1-11, T-B1-13, T-B1-16, T-B1-17, T-B1-18, T-B1-19, T-B1-21 | G6 | 3 | not started |
| T-B1-26 | Usage meter in the dialog | T-B1-02, T-B1-07 | G6 | 4 | not started |
| T-B1-28 | Search failure codes and no coordinate cache | T-B1-03, T-B1-08, T-B1-19 | G6 | 3 | not started |
| T-B1-09 | Search runs only on click | T-B1-02, T-B1-11, T-B1-28, T-B1-30 | G7 | 5 | not started |
| T-B1-12 | Keyless walk and "not set up" states | T-B1-05, T-B1-09, T-B1-10, T-B1-11, T-B1-27, T-B1-30 | G8 | 3 | not started |
| T-B1-20 | Copy check | T-B1-04, T-B1-08, T-B1-15, T-B1-17, T-B1-18, T-B1-19, T-B1-21 | G8 | 5 | not started |
| T-B1-24 | Performance budget job | T-B1-20, T-B1-22, T-B1-23, T-B1-25 (if not skipped), S-B1-02, S-B1-03 | G9 | 4 | not started |
| T-B1-29 | Exit gate run and evidence | all above | G10 | 2 | not started |

### B2. Project core: document and netlist

Source: `05_ENGINEERING/tasks/B2-core-document-netlist.md`. 27 tasks, 10 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B2-01 | Portable toolchain, import matrix, and the Turbopack proof (AX-03) | B1 | G1 | 5 | not started |
| T-B2-17 | Spike: Ajv 8 standalone and the type generator on the real schemas | B1 | G1 | 0 | not started |
| T-B2-18 | Spike: read the figure circuits of all 38 items without a browser | B1 | G1 | 0 | not started |
| T-B2-02 | `src/core` A: ids, units, `Result`, `Diagnostic`, limits | 01 | G2 | 4 | not started |
| T-B2-03 | `src/core` B: canonical JSON, strict parse, SHA-256, PRNG | 01 | G2 | 4 | not started |
| T-B2-04 | Generate types and standalone validators from both schemas | 01, 17 | G2 | 4 | not started |
| T-B2-05 | `apply` A: dispatch, batches, meta, access, actor, board, component (13 kinds) | 02, 03, 04 | G3 | 5 (plus `fixtures.testing.ts`) | not started |
| T-B2-09 | Canonical form, `stateHash`, hash chain, migrations | 02, 03, 04 | G3 | 3 | not started |
| T-B2-11a | Part descriptor validation, semantic rules, registry | 02, 03, 04 | G3 | 3 | not started |
| T-B2-11b | Pinned interface (`interfaceOf`), pin rules, fallback art | 02, 04 | G3 | 2 | not started |
| T-B2-13 | Netlist from connections, holes, legacy names (C-PIN, C-LEG, RC-36) | 02, 04 | G3 | 3 | not started |
| T-B2-06 | `apply` B: net, view, wire, group, junction, label (22 kinds) | 05 | G4 | 4 | not started |
| T-B2-08a | Validation passes V1, V2, V4, V5 and the limits | 02, 03, 04, 09 | G4 | 2 | not started |
| T-B2-12a | Uno R3 descriptor as data, the builtin index, the browser loader | 11a, 11b, 13 | G4 | 3 | not started |
| T-B2-14 | Converter A: figure reading, interfaces, circuit to nets, input types | 13, 18 | G4 | 5 | not started |
| T-B2-07 | `apply` C: sources, simulation, mechanical, params, tests, assets, deps, document-level (29 kinds), plus the ... | 06 | G5 | 4 | not started |
| T-B2-08b | Validation pass V3: references, invariants, `checkAll`, `checkBatch` | 08a, 09, 13 | G5 | 4 | not started |
| T-B2-12b | The six small descriptors (LED, resistor, push button, buzzer, potentiometer, SSD1306) | 12a | G5 | 2 | not started |
| T-B2-22 | V6 library pass and interface drift | 11a, 11b, 12b, 14 | G6 | 1 | not started |
| T-B2-10 | `ProjectSession`, undo and redo, `computeTouched`, local stamping | 05, 06, 07, 08b, 09 | G6 | 4 | not started |
| T-B2-19 | Converter B: board tours and lessons | 14, 08b, 09 | G6 | 3 | not started |
| T-B2-15 | Examples hash test and the checkpoint question | 04, 05, 07, 08b, 09 | G6 | 1 | not started |
| T-B2-20a | Converter C1: robotics benches | 14, 18, 19 | G7 | 1 | not started |
| T-B2-20b | Converter C2: practice tasks and drone crafts | 14, 19 | G7 | 2 | not started |
| T-B2-20c | Converter C3: `convertAll`, report, manifest, the corpus script | 20a, 20b, 22 | G8 | 3 | not started |
| T-B2-16 | Headless harness, round trips, apply cost | 10, 12a, 20c | G9 | 4 | not started |
| T-B2-21 | Docs, corpus manifest, exit gate | all | G10 | 4 | not started |

### B3. Project core: storage, runtime, replay

Source: `05_ENGINEERING/tasks/B3-core-storage-runtime-replay.md`. 30 tasks, 9 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B3-S1 | Spike: zip approach for `.iynkz` | none | G1 | 0 (report only) | not started |
| T-B3-S2 | Spike: IndexedDB write from a worker at `pagehide`; file handle in a worker | none | G1 | 0 | not started |
| T-B3-S3 | Spike: service worker precache source and offline reload | none | G1 | 0 | not started |
| T-B3-01 | `src/protocol` RPC envelope and ports | B2 | G1 | 4 | not started |
| T-B3-02 | Database `iynk`, the 19 stores, `Repository` interface | B2 | G1 | 4 | not started |
| T-B3-10 | `src/sim/core`: ns clock, state hash, `SimDiagnostic`; SA-11 lint; the one import-matrix change | B2 | G1 | 4 (and `src/architecture.test.ts`, a ... | not started |
| T-B3-14 | Interpreter allocation caps (SA-10 probes) | none | G1 | 4 | not started |
| T-B3-16 | Solver I: types, graph, `linsolve` | B2 | G1 | 3 | not started |
| T-B3-20 | Diagnosis record and the 45 cause ids | B2 | G1 | 2 | not started |
| T-B3-22 | IndexedDB and memory `Repository` implementations | 02 | G2 | 2 | not started |
| T-B3-11 | Engine interface and digital orchestrator core | 10 | G2 | 5 | not started |
| T-B3-17 | Solver II: stamps, `pwl` iteration, convergence | 16 | G2 | 2 | not started |
| T-B3-05 | `.iynk` and `.iynkz` read and write; file I/O | S1, B2 | G2 | 4 (5 with `fflate`) | not started |
| T-B3-03 | `ProjectWorker`, handler, host, shadow copy | 01, 22 | G3 | 5 | not started |
| T-B3-06 | Library, blank project, fork, sample project | 22 | G3 | 5 | not started |
| T-B3-07 | Provider keys move into the `keys` store | 22, B1 | G3 | 3 | not started |
| T-B3-08 | Local data export and wipe (worker and main-thread halves) | 22, 05, 10 | G3 | 2 | not started |
| T-B3-12 | Interpreters as `McuEngine` | 11 | G3 | 1 | not started |
| T-B3-18 | Solver equivalence to the old solver (SA-02) | 17 | G3 | 4 | not started |
| T-B3-04 | Autosave, crash journal, storage health, tab sync | 03, S2 | G4 | 4 | not started |
| T-B3-13 | `SimHost`, `SimWorker` and the sim protocol (SA-01) | 01, 11, 12 | G4 | 4 | not started |
| T-B3-15 | Netlist to `SimNetlist`, digital nets, world pins, binding | 11, 12 | G4 | 5 | not started |
| T-B3-19 | Deterministic run and replay (SA-06) | 10, 11, 12, 15 | G5 | 3 | not started |
| T-B3-26 | Watchdog and kill (SA-10, FA-07, AR-15) | 13, 14 | G5 | 2 | not started |
| T-B3-27 | Wire library, files, wipe and storage into the worker API | 03, 04, 05, 06, 08 | G5 | 3 | not started |
| T-B3-21 | Bare `/[lang]/studio` list page | 27, 07 | G6 | 5 | not started |
| T-B3-09 | Service worker and offline shell (FA-09 part) | 21, S3 | G7 | 5 | not started |
| T-B3-23 | Diagnostics panel: run, kill, replay, save speed | 06, 13, 15, 19, 21, 26, 27 | G7 | 4 | not started |
| T-B3-24 | Headless acceptance walk, WebKit, FA-08, AR-17 | 09, 23 | G8 | 1 | not started |
| T-B3-25 | Exit record and documentation | all | G9 | 4 (docs) | not started |

### B4. Studio editor: the Uno slice

Source: `05_ENGINEERING/tasks/B4-studio-uno.md`. 28 tasks, 10 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B4-01 | Studio route state, namespaces and the home/project switch in B3's entry component | B3 (T-B3-21 `StudioEntry`, `page.tsx`, `studio.json`; T-B3-23 Diagnostics mount) | G1a | 4 | not started |
| T-B4-03 | Renderer interface, draw list, SVG renderer with LOD and culling | B2 types only | G1a | 5 | not started |
| T-B4-18 | RS-16 mini-spike: keyboard wiring pattern | none | G1a | 0 (report) | not started |
| T-B4-26 | Op impact classes and the run-stale rule | B2 generated types (T-B2-04) | G1a | 1 | not started |
| T-B4-27 | Runtime services: one host, library, files adapter and sim host per page | B3 (T-B3-03, T-B3-05, T-B3-13, T-B3-27) | G1a | 1 (4 if the B3 load call is missing) | not started |
| T-B4-02 | Document, session and UI stores, command registry, selector stability | B3 (`ProjectSession`, `computeTouched` from T-B2-10), T-B4-03 (`Viewport`, `Hit`, `Overlay` types) | G1b | 5 | not started |
| T-B4-06 | Part art: reuse the figure art, generic fallback for any descriptor | B2 (T-B2-11 including `src/parts/fallback.ts`, T-B2-12), T-B4-03 | G1b | 4 | not started |
| T-B4-04 | EditorEngine, viewport math, spatial index, tool host | T-B4-02, T-B4-03 | G2 | 5 | not started |
| T-B4-10 | Breadboard descriptor, breadboard view, netlist overlay | T-B4-03, B2 (T-B2-11, T-B2-12 `builtin.ts`, T-B2-13) | G2 | 5 | not started |
| T-B4-11 | Undo and redo wiring, autosave link, open by hash | T-B4-01, T-B4-02, T-B4-27, B3 (T-B3-04, T-B3-06) | G2 | 5 | not started |
| T-B4-12 | Code dock bound to `sources[]`, diagnostics as markers | T-B4-01, T-B4-02 | G2 | 4 | not started |
| T-B4-13 | Run bar, serial pane, run store, sim link | T-B4-01, T-B4-02, T-B4-26, B3 (T-B3-13, T-B3-15) | G2 | 5 | not started |
| T-B4-15 | Tier label and static "What it models" panel | T-B4-01, B2 registry | G2 | 3 | not started |
| T-B4-21 | Studio settings: language, theme, sound, art mode, snap | T-B4-01, T-B4-02 | G2 | 2 | not started |
| T-B4-23 | Client-only loader and the Studio page | T-B4-01, B3 (T-B3-09 `SwRegister` mount, T-B3-21, T-B3-23), B1 (T-B1-22 `bundle-report.mjs`) | G2 | 4 | not started |
| T-B4-09 | Wiring: tool, connection rules, recipes, air wires, refusals | T-B4-02, T-B4-04, T-B4-10 | G3 | 4 | not started |
| T-B4-24 | Canvas view and scene controller | T-B4-03, T-B4-04, T-B4-23 (uses T-B4-06, T-B4-10 and T-B4-14 outputs only through the `ArtProvider` and `OverlayProviders` interfaces) | G3 | 4 | not started |
| T-B4-07 | Palette, search, placement, snap-back, unknown-part placeholder | T-B4-04, T-B4-06, T-B4-09 | G4 | 5 | not started |
| T-B4-08 | Inspector, selection tool, delete, multi-select, copy and paste, nets list | T-B4-04, T-B4-09, T-B4-10 (`focusNetOverlay`), T-B4-15 (`modelRows`) | G4 | 5 | not started |
| T-B4-14 | Live overlays: pin levels, LED state, "not modelled yet" | T-B4-03, T-B4-09 (`blink-circuit.ts`), T-B4-13 | G4 | 3 | not started |
| T-B4-16 | Home: new project, open, open from file, starters, first run | T-B4-01, T-B4-11, T-B4-23, T-B4-27, B3 (T-B3-05, T-B3-06, T-B3-21) | G4 | 5 | not started |
| T-B4-17 | Problems pane and loud, specific code feedback | T-B4-09 (`StaticFlag`), T-B4-12, T-B4-13 | G4 | 5 | not started |
| T-B4-05 | RS-01 harness: 500 parts, 1,000 wires, frame-time spec | T-B4-03, T-B4-04, T-B4-06, T-B4-08, T-B4-09, T-B4-10, T-B4-14, T-B4-24 | G5 | 5 | not started |
| T-B4-19 | Keyboard path and outline pane | T-B4-07, T-B4-08, T-B4-09, T-B4-11 (Ctrl+Z), T-B4-12 (Esc then Tab), T-B4-13, T-B4-17 (`nextProblem` for F8) | G5 | 5 | not started |
| T-B4-25b | Top bar, live region, region layout | T-B4-11, T-B4-13, T-B4-15, T-B4-19 (`Announcer`), T-B4-21 | G6a | 4 | not started |
| T-B4-25a | Workspace: the per-project object graph | T-B4-04, T-B4-07 to T-B4-17, T-B4-19, T-B4-21, T-B4-23, T-B4-24, T-B4-25b, T-B4-27 | G6b | 4 | not started |
| T-B4-20 | Keyboard-only gate and axe | T-B4-19, T-B4-25a, T-B4-25b | G7a | 0 (test only) | not started |
| T-B4-22 | The M1 walk, steps 1 to 8, budgets recorded, docs | T-B4-20 and every other task (T-B4-01 to T-B4-19, T-B4-21, T-B4-23 to T-B4-27); sequential after T-B4-20 | G7b | 0 (test and docs) | not started |

### B5. Studio editor: all boards, views, history, phone

Source: `05_ENGINEERING/tasks/B5-studio-all-boards.md`. 25 tasks, 8 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B5-15 | Board binding contract and descriptor builder | B4 | G1 | 5 | not started |
| T-B5-22 | Studio strings, six languages | B4 | G1 | 1 set | not started |
| T-B5-08 | History core, `recordCheckpoint`, `recordExport` | B4 | G1 | 4 | not started |
| T-B5-10 | `.ino` core and loss report | B4 | G1 | 2 | not started |
| T-B5-05 | Schematic model | B4 | G1 | 4 | not started |
| T-B5-07 | Align, groups, paste | B4 | G1 | 3 | not started |
| T-B5-12 | Performance budgets | B4, B1, B0 (T-B0-06) | G1 | 4 | not started |
| T-B5-20 | Spike: `.ino` coverage | none | G1 | report only | not started |
| T-B5-01 | Boards nano, uno-r4 | 15 | G2 | 5 | not started |
| T-B5-06 | Board view and pin map | 15, 22 | G2 | 3 | not started |
| T-B5-09 | Author checks | 22 | G2 | 4 | not started |
| T-B5-17 | Align and group commands, keymap rows | 07, 22 | G2 | 3 (+ the 6.11 doc rows) | not started |
| T-B5-18 | History panel, run and save hooks | 08, 22 | G2 | 2 | not started |
| T-B5-19 | Project menu and `.ino` dialog | 10, 08, 22 | G2 | 4 | not started |
| T-B5-02 | Boards esp32-devkitc, esp32-s3, nodemcu | 01 | G3 | 5 | not started |
| T-B5-16 | View registry and switcher | 05, 06, 22 | G3 | 4 to 5 | not started |
| T-B5-03 | Boards pico, micro:bit, nucleo | 02 | G4 | 5 | not started |
| T-B5-21a | Shell: view tabs, three views, pin map, view commands | 16, 06, 17, 22 | G4 | 3 | not started |
| T-B5-04 | Boards pi, basys3, de10-lite | 03 | G5 | 5 | not started |
| T-B5-21b | Shell: history, checks, menu, loss dialog, run and save hooks | 21a, 09, 18, 19, 10 | G5 | 2 | not started |
| T-B5-11 | Boards spec | 01 to 04, 21a, 21b, 17, 18, 19, 09 | G6 | 0 (test) | not started |
| T-B5-13 | Phone layout (cuttable) | 21b, 22 | G6 | 5 | not started |
| T-B5-13b | Phone sheets and light LOD (cuttable) | 13 | G7 | up to 5 | not started |
| T-B5-14 | Accessibility pass (cuttable) | 13 (if kept), 21a, 21b | G7 | up to 5 | not started |
| T-B5-23 | Documentation | 04 to 10, 12, 13 to 14 (if kept), 16 to 20, 21a, 21b | G8 | 3 | not started |

### B6. Collaboration: server, identity, buddies

Source: `05_ENGINEERING/tasks/B6-collab-server-buddies.md`. 25 tasks, 9 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B6-01a | Legacy relay moved to `server/legacy`, root tsconfig exclude | B1, B2 | G1 | 2 (plus 1 test file and a directory ... | not started |
| T-B6-01b | Server package, config and `check-config` refusals | 01a | G1 | 5 | not started |
| T-B6-15 | Spike: shared TypeScript imports from the server | 01b | G2 | 2 (1 JSON stub, 1 ADR note) | not started |
| T-B6-02 | `ServerStore` port, `node:sqlite` adapter, migrations, backup | 01b | G2 | 5 | not started |
| T-B6-13 | Structured log with redaction | 01b | G2 | 1 | not started |
| T-B6-07 | Router, route classes, limiter, CORS, error envelope | 01b | G2 | 4 | not started |
| T-B6-16 | Shared identity module (ids, codes, signing input, names) and `src/protocol` stub | B2 (T-B2-03), 15 | G3 | 2 | not started |
| T-B6-03 | Store durability harness (kill -9) | 02 | G3 | 1 | not started |
| T-B6-17 | App assembly, `main.ts`, `GET /v1/server`, health | 01b, 02, 07, 13, 15, T-B2-09 | G3 | 4 | not started |
| T-B6-19a | Strings for the Buddies page (`buddies.*`), six `together.json` | B1, T-B0-19 | G3 | 1 (six copies of one file) | not started |
| T-B6-19b | Strings for the server panel (`server.*`), six `common.json` | B1, T-B0-19 | G3 | 1 (six copies of one file) | not started |
| T-B6-20 | Deploy extras: `.dockerignore`, `deploy/.env.example`, README paths | 01a | G3 | 3 | not started |
| T-B6-04 | Identity core: enrolment codes, challenges, tokens | 02, 16, 15 | G3b | 4 | not started |
| T-B6-05 | Browser side: device key, sign-in, client | 16, T-B1-11 | G3b | 5 | not started |
| T-B6-18 | Auth and identity routes | 04, 17 | G4 | 3 | not started |
| T-B6-06 | Operator CLI | 04, 02, 13 | G4 | 3 | not started |
| T-B6-11 | Server settings, probe states, Leave server | 05, 19b, T-B3-02, B1 (T-B1-11) | G4 | 5 | not started |
| T-B6-08 | Pairing | 18, 16 | G5 | 4 | not started |
| T-B6-21 | Playwright server harness | 06, 17, 11 | G5 | 3 | not started |
| T-B6-22 | Identity hostile suite (tests only) | 18, 13 | G5 | 0 | not started |
| T-B6-12 | Compose, Caddy, Next standalone | 17, 06, 20 | G5 | 5 | not started |
| T-B6-09 | Visibility: buddy data only to buddies; remove | 08 | G6 | 2 | not started |
| T-B6-23 | Sweep and identity deletion (Leave server on the server) | 18, 08 | G6 | 5 | not started |
| T-B6-10 | Buddies page | 11, 19a, 21, 09, T-B3-02 | G7 | 5 | not started |
| T-B6-14 | Drills and `docs/SELF_HOSTING.md` | all server tasks, 12, 20 | G8 | 4 | not started |

### B7. Collaboration: rooms, shares, leaderboard

Source: `05_ENGINEERING/tasks/B7-collab-rooms-shares-board.md`. 41 tasks, 10 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B7-01 | Wire protocol v2: frames, close codes, validators | B-phases only | G1 | 4 | not started |
| T-B7-02 | Spike RS-21: browser primitives for rooms | B-phases only | G1 | 3 | not started |
| T-B7-03 | Room tables, repositories and the store seam | B-phases only | G1 | 2 | not started |
| T-B7-04 | Permission matrix, collaboration limits and route buckets | B-phases only | G1 | 5 | not started |
| T-B7-38 | Shared-code, dependency and client seams | B-phases only | G1 | 4 | not started |
| T-B7-39 | Unpair hook: one seam for rooms, invites and the lobby | B-phases only | G1 | 3 | not started |
| T-B7-05 | Room, share and board strings in six languages | 02 | G2 | 2 | not started |
| T-B7-06 | RoomCore: submit, group commit, reject, dedup, inverse, chain | 01, 03, 04, 38 | G2 | 4 | not started |
| T-B7-07 | Presence, cursors and chat on the server | 01, 04 | G2 | 4 | not started |
| T-B7-08 | Asset upload, query and download for rooms | 03, 04 | G2 | 2 | not started |
| T-B7-09 | Shares, server side | 03, 04, 38 | G2 | 5 | not started |
| T-B7-10 | Scores and the buddies-only board, server side | 03, 04 | G2 | 3 | not started |
| T-B7-11 | Client transport: WebSocket, gzip, reconnect, memory transport | 01, 02 | G2 | 4 | not started |
| T-B7-12 | Socket authentication and the session registry | 01, 02, 03 | G2 | 3 | not started |
| T-B7-13 | Checkpoints, compaction and resume | 03, 06 | G3 | 2 | not started |
| T-B7-14 | Baton, host commands and succession | 04, 06, 07 | G3 | 4 | not started |
| T-B7-15 | RoomClient: optimistic view, pending queue, rebase report | 01, 11 | G3 | 3 | not started |
| T-B7-16 | Shares, client: API, asset sync and share dialog | 05, 08, 09, 38 | G3 | 2 | not started |
| T-B7-17 | Buddies board in the fly workspace | 05, 10, 38 | G3 | 3 | not started |
| T-B7-18 | Room lifecycle, registry, quotas and room routes | 03, 04, 06, 09, 13, 14 | G4 | 3 | not started |
| T-B7-19 | RoomAuthority, document link, edit-access gate and fork helpers | 05, 15 | G4 | 4 | not started |
| T-B7-20 | Convergence harness on RoomCore: RA-01 and RA-02 with a model client | 06, 13 | G4 | 0 (tests) | not started |
| T-B7-21 | Socket dispatch, frame codec and the lobby | 06, 07, 12, 13, 14, 18 | G5 | 4 | not started |
| T-B7-22 | Rooms API client and the join flow | 05, 11, 16, 19, 38 | G5 | 2 | not started |
| T-B7-23 | Presence store and the cursor overlay | 05, 15, 19 | G5 | 3 | not started |
| T-B7-24 | Convergence with the real client: FA-13, RA-02 and RA-07 | 06, 13, 15, 19, 20 | G5 | 0 (tests) | not started |
| T-B7-41 | Lobby client, join route, commands and Studio wiring | 05, 11, 16, 22 | G6 | 4 | not started |
| T-B7-25 | Room invites and redemption | 03, 04, 18, 21 | G6 | 2 | not started |
| T-B7-27 | Code dock obeys the baton | 19, 23 | G6 | 3 | not started |
| T-B7-26 | Room dock shell: banner, side panel and toolbar areas | 05, 19, 22, 23, 41 | G7 | 5 | not started |
| T-B7-32 | Mount rooms, assets, shares, scores and the socket | 04, 08, 09, 10, 12, 18, 21, 25, 39 | G7 | 4 | not started |
| T-B7-28 | Shares, client: read-only open and "Make my copy" | 16, 19, 22, 26, 38, 41 | G8 | 3 | not started |
| T-B7-29 | Members, presence and chat panels | 05, 23, 26 | G8 | 4 | not started |
| T-B7-30 | Rebase report and room-ended notices | 15, 19, 26 | G8 | 3 | not started |
| T-B7-31 | Baton, host controls and the room menu | 05, 22, 23, 26, 41 | G8 | 5 | not started |
| T-B7-40 | End-to-end server support for Playwright | 32 | G8 | 1 | not started |
| T-B7-33 | Crash test between COMMIT and ack | 20, 32 | G8 | 1 | not started |
| T-B7-34 | Hostile-client suite and capacity test | 32 | G8 | 0 (tests) | not started |
| T-B7-35 | Two-browser room acceptance (M1 steps 9 to 11) | 22, 23, 26, 27, 29, 30, 31, 32, 40, 41 | G9 | 0 (tests) | not started |
| T-B7-36 | Share and board acceptance in the browser | 17, 28, 32, 40 | G9 | 0 (tests) | not started |
| T-B7-37 | Documentation and results records | 20, 24, 33, 34, 35 | G10 | 3 | not started |

### B8. Fidelity: live analog, instruments, replay

Source: `05_ENGINEERING/tasks/B8-fidelity-live-analog.md`. 32 tasks, 11 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B8-03 | Fidelity registry core: types, tier rules, loader, project summary | none | G1 | 5 | not started |
| T-B8-17a | Run channel, shared types: frames, validators, op classes | none | G1 | 3 | not started |
| T-B8-21 | Spike SP-B8-01: does the ADC formula move any reference run | none | G1 | 0 | not started |
| T-B8-27 | B8 copy in six languages: `fidelity`, `instruments`, `run` | none | G1 | 4 | not started |
| T-B8-30 | Per-board pin electrical model | none | G1 | 1 | not started |
| T-B8-01 | Fail loudly: SPI and UART stubs, `Serial1`, `Pin(99)`, positioned diagnostic codes | 30 | G2 | 5 | not started |
| T-B8-05a | Live analog solver: `LiveAnalog` implements `AnalogSolver` | 03, 30 | G2 | 1 | not started |
| T-B8-13 | Serial plotter | 27 | G2 | 2 | not started |
| T-B8-17b | Run channel, server side: channel, hub and wiring | 17a | G2 | 4 | not started |
| T-B8-22 | Registry data: full coverage of the 38 converted projects | 03, 27 | G2 | 1 | not started |
| T-B8-02 | Include resolution and library diagnostics | 01 | G3 | 4 | not started |
| T-B8-04 | Tier chips per layer, lowest-tier summary, registry-driven "What it models" | 03, 05a, 22, 27 | G3 | 3 | not started |
| T-B8-05b | Analog on the live path: orchestrator, pins, world, bind, ADC | 05a, 21, 30 | G3 | 4 | not started |
| T-B8-06 | Honest states: over-current, burn-out, brown-out, floating input, no-convergence | 03, 05a, 05b, 22, 27 | G4 | 5 | not started |
| T-B8-09 | `dc-event` phase order and engine tie-break | 05b | G4 | 2 | not started |
| T-B8-14 | Pause, step, speed, `behindReal` | 05b, 27 | G4 | 5 | not started |
| T-B8-07 | LED and resistor cases computed, not fixed; the 113 mA figure cannot return | 05a, 06 | G5 | 1 | not started |
| T-B8-08 | Tick budget and the 150-node measurement | 05a, 05b, 06 | G5 | 4 | not started |
| T-B8-10 | Probe tap, ring buffers, provenance | 03, 05a, 06, 09, 22 | G5 | 3 | not started |
| T-B8-15 | Snapshot and restore for the interpreters and the analog state | 05b, 06, 09 | G5 | 4 | not started |
| T-B8-16 | Replay checkpoints equal in Chromium and WebKit | 15 | G6 | 3 | not started |
| T-B8-25 | Probe, instrument and hash messages over `SimHost` | 10, 14 | G6 | 5 | not started |
| T-B8-28 | Seeded tolerance and bands | 06, 10 | G6 | 3 | not started |
| T-B8-11 | Multimeter | 10, 25, 27, 28 | G7 | 2 | not started |
| T-B8-12 | Oscilloscope and logic analyser with a table view | 10, 25, 27 | G7 | 4 | not started |
| T-B8-18 | Run channel, client: runner, mirrors, fallback, detach | 14, 15, 17a, 17b, 25 | G7 | 5 | not started |
| T-B8-20 | Instrument dock in Studio, keyboard operation, summary chip mount | 04, 11, 12, 13, 25, 27, 28 | G8 | 3 | not started |
| T-B8-23 | `docs/FIDELITY.md` generated from the registry, with a drift check | 04, 07, 22 | G8 | 3 | not started |
| T-B8-26 | Room run UI: runner badge, watching label, private run, rejoin | 18, 27 | G8 | 4 | not started |
| T-B8-29 | Mount the run client: wiring, run controls and the indicator | 14, 17b, 18, 20, 26 | G9 | 4 | not started |
| T-B8-19 | Lockstep determinism: runner plus two mirrors | 17b, 18, 26, 29 | G10 | 0 | not started |
| T-B8-24 | Exit evidence: SA and RA numbers in one file | all | G11 | 2 | not started |

### B9. Fidelity: chip engines, buses, compile, debugger

Source: `05_ENGINEERING/tasks/B9-fidelity-chip-engines.md`. 37 tasks, 7 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B9-01 | I2C, SPI, UART bus models with timing | none | G1 | 4 | not started |
| T-B9-05 | Board power-model entries | none | G1 | 2 | not started |
| T-B9-07 | avr8js engine behind `McuEngine`; build-engines script; all pinned engine packages; engine build in ... | none | G1 | 5 (`avr8js.ts`, manifest ... | not started |
| T-B9-08 | Hex and ELF import, DWARF lines, 1,000-file fuzz | none | G1 | 4 | not started |
| T-B9-16 | Newton core and diode/LED in the solver | none | G1 | 4 | not started |
| T-B9-17 | Oracle gates against recorded ngspice output | none | G1 | 1 | not started |
| T-B9-18 | Spike: transient backend verdict | none | G1 | 0 (docs and scripts) | not started |
| T-B9-20 | `dmath` bit-identical across engines | none | G1 | 2 | not started |
| T-B9-35 | `fidelity` UI namespace in six languages | none | G1 | 2 | not started |
| T-B9-03 | Devices as data: loader, register map, closed expression grammar | 01 | G2 | 5 | not started |
| T-B9-09 | Inspect gate: Yosys loader, sha256, memory rule | 07, 35 | G2 | 5 | not started |
| T-B9-11 | Interpreter `DebugPort`: breakpoints, step, `#line` map | none | G2 | 4 | not started |
| T-B9-23 | Interpreter on the bus models; fail loudly | 01 | G2 | 5 | not started |
| T-B9-24 | avr8js pin, PWM and ADC adapter; assembly fixtures | 07 | G2 | 2 (`avr8js-pins.ts`, the `asm-*.json` ... | not started |
| T-B9-25 | avr8js TWI and SPI bridge to the bus models | 07, 01 | G2 | 1 | not started |
| T-B9-34 | BJT and MOSFET Newton devices with cited parameters | 16 | G2 | 4 | not started |
| T-B9-02 | `Wire.begin` pin binding; devices from the netlist | 03, 23 | G3 | 4 (3 code files and 1 fixture set) | not started |
| T-B9-06 | World script and environment sensors | 03, 23 | G3 | 4 | not started |
| T-B9-10 | avr8js differential harness and 50-sketch corpus | 07, 08, 24 | G3 | 3 | not started |
| T-B9-19 | Transient backend per the verdict | 16, 18 | G3 | A: 4 (`transient.ts`, `companion.ts` ... | not started |
| T-B9-26 | Firmware mode switch and hex import entry | 07, 08, 24, 25, 35 | G3 | 4 | not started |
| T-B9-27 | avr8js debug adapter; SA-15 on both engines | 07, 08, 11 | G3 | 1 | not started |
| T-B9-36 | Sim-side debug routing: `debug` request and `paused` event in the handler | 11 | G3 | 2 (`handler.ts`, `protocol.ts`) | not started |
| T-B9-37 | `compile` rate-limit bucket | none | G3 | 2 (`classes.ts`, `limits.ts`) | not started |
| T-B9-04 | BME280 model, `Adafruit_BME280`, part descriptor | 02, 03, 06, 20, 23 | G4 | 5 | not started |
| T-B9-13 | Compile module on the server (needs Amar's licence answer) | 37 (gate: section 10 item 1) | G4 | 5 (`runner.ts`, `routes.ts` ... | not started |
| T-B9-22 | Analog device gates: ngspice and datasheet fixtures | 16, 17, 34 | G4 | 1 (script edit) | not started |
| T-B9-33 | Debug panel, gutter and host method | 11, 26, 35, 36 | G4 | 4 (`DebugPanel.tsx`, `CodeDock.tsx` ... | not started |
| T-B9-32 | Inspect view with DigitalJS | 09 | G4 | 3 | not started |
| T-B9-12 | Variable inspection and watch for globals | 11, 27, 33 | G5 | 4 | not started |
| T-B9-14 | Compile container and caps tests | 13 | G5 | 4 (3 new, `compose.yaml`) | not started |
| T-B9-15 | Client `CompileService` and build status | 13, 26, 35 | G5 | 3 | not started |
| T-B9-21 | Datasheet fixtures: buses, devices, MCU timing, sensors | 04, 10, 25 | G5 | 1 | not started |
| T-B9-30 | Registry complete: every part has an entry | 04, 05, 34 | G5 | 2 | not started |
| T-B9-31 | Interpreter cost table, serial timing, ADC rule | 02, 10, 23, 24 | G5 | 4 | not started |
| T-B9-28 | `docs/COMPILE.md` and fidelity docs | 13, 14, 15, 26 | G6 | 2 docs | not started |
| T-B9-29 | Exit gate: run everything and record results | all | G7 | 1 doc | not started |

### B10. Faults on any circuit

Source: `05_ENGINEERING/tasks/B10-faults-any-circuit.md`. 34 tasks, 8 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B10-00 | Spike: can the 20 slots be built from described parts? | none | G1 | 0 | not started |
| T-B10-01 | Fault types (with `NetView`, `CodeFacts`, `RunFacts`), the stored-kind to `FaultOp` map, import exception | none | G1 | 2 | not started |
| T-B10-16 | Symptom registry and cause metadata | none | G1 | 2 | not started |
| T-B10-19 | Sealed diagnose items: reader and redaction | none | G1 | 1 | not started |
| T-B10-20 | Local learning events | none | G1 | 1 | not started |
| T-B10-21 | `node-voltage` and `supply-current` checks | none | G1 | 2 | not started |
| T-B10-02 | Failure models as data | 01, 16 | G2 | 4 | not started |
| T-B10-03 | Rule runner, `buildNetView`, topology rules | 01, 16 | G2 | 3 | not started |
| T-B10-06 | Corpus: `clean/`, `broken/` spec and generator | 00, 16 | G2 | 2 | not started |
| T-B10-07 | Diagnosis session: states, evidence, options | 01, 16, 19, 20 | G2 | 2 | not started |
| T-B10-12 | `faults` namespace and fidelity labels | 16 | G2 | 2 | not started |
| T-B10-15 | Apply fault ops to a netlist and to code | 01 | G2 | 2 | not started |
| T-B10-25 | Tag the 250 catalogue faults; log their record | 16, 20 | G2 | 3 | not started |
| T-B10-26 | Diagnose item format, materialiser, lint | 16, 19 | G2 | 1 | not started |
| T-B10-22 | Fault generator and seeded pick | 01, 03, 16 | G3 | 1 | not started |
| T-B10-04 | Solved detectors | 02, 03, 15, 21 | G3 | 3 | not started |
| T-B10-05 | Code facts and code detectors | 03 | G3 | 2 | not started |
| T-B10-08 | Hint ladder: logic and component | 07, 12 | G3 | 2 | not started |
| T-B10-10 | Diagnosis record view and export | 07, 12, 20 | G3 | 2 | not started |
| T-B10-17 | Part-aware static rules | 03 | G3 | 2 | not started |
| T-B10-28 | Diagnose items 1 to 20 | 26 | G3 | 1 | not started |
| T-B10-29 | Diagnose items 21 to 40 | 26 | G3 | 1 | not started |
| T-B10-09 | Break it: tool and panel | 03, 04, 07, 12, 15, 19, 20, 22 | G4 | 2 | not started |
| T-B10-24 | Static check and findings over the worker, Problems producer, overlay (plumbing only) | 03, 04, 12 | G4 | 5 | not started |
| T-B10-11 | All 45 cause ids: detector or "no detector yet" | 03, 04, 05, 17 | G4 | 2 | not started |
| T-B10-23 | Diagnose panel and store | 07, 08, 12, 19, 20 | G4 | 2 | not started |
| T-B10-30 | Bench-check sheet (prepares R-130) | 04, 06, 15, 22 | G4 | 3 | not started |
| T-B10-14 | Fault authoring in a project and replay of a diagnosis | 09 | G5 | 2 | not started |
| T-B10-18 | Corpus gate test | 04, 05, 06, 11, 17, 21, 22, 24, 25, 28, 29 | G5 | 0 | not started |
| T-B10-27 | Transfer question | 23, 28, 29 | G5 | 4 | not started |
| T-B10-33 | I2C scan instrument | 24 | G5 | 5 | not started |
| T-B10-32 | Fault dock, commands, mounting, Check button, idle trigger, Problems footer | 09, 10, 23, 24, 30, 33 | G6 | 5 | not started |
| T-B10-13 | SA-23 walkthrough | 05, 14, 32, 33 | G7 | 1 | not started |
| T-B10-31 | `docs/FAULTS.md` | all | G8 | 1 | not started |

### B11. Components

Source: `05_ENGINEERING/tasks/B11-components.md`. 28 tasks, 6 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B11-01 | Descriptor validation context, semantic additions, copy check, CLI, `parts:check` | none | G1 | 5 | not started |
| T-B11-05a | Model kind resolvers: element, subcircuit, logic, builtin, none; extension always disabled | none | G1 | 3 | not started |
| T-B11-06 | Safe art: SVG and PNG sanitiser, art selection and pin coverage over B2's fallback | none | G1 | 3 | not started |
| T-B11-12 | Spike RS-15: Worker-kill prototype for code parts (verdict only) | none | G1 | 0 | not started |
| T-B11-13 | `parts` IndexedDB store, atomic `putMany`, wipe and export hooks | none | G1 | 5 | not started |
| T-B11-18 | i18n scaffold: namespaces `parteditor`, `partpack`, `partinfo` | none | G1 | 4 | not started |
| T-B11-02a | Registry additions, app registry, descriptor barrel generator, per-descriptor gates, `part-draft` tool ... | 01, 05a | G2 | 5 | not started |
| T-B11-04a | Part draft model: state, reducer, `toDescriptor`, live validation | 01 | G2 | 1 | not started |
| T-B11-07 | Version rules, pinned lookup, upgrade plan (digest, interface and V6 come from B2) | 01 | G2 | 1 | not started |
| T-B11-17 | Registry entries and failure models generated from descriptors (ADR-0208) | 01 | G2 | 5 | not started |
| T-B11-09 | Orchestrator runs the layer kinds; "not modelled yet" is an event | 05a, 07, 02a | G3 | 4 | not started |
| T-B11-02b1 | Convert 5 parts: rgb-led, ldr, fsr402, tmp36, diode-1n4007 | 02a, 17 | G3 | 1 | not started |
| T-B11-02c1 | Convert 5 parts: dc-motor, fan, tt-motor, servo-sg90, stepper-28byj48 | 02a, 17 | G3 | 1 | not started |
| T-B11-03a | Convert 5 modules: tb6612fng, l298n, a4988, uln2003, pca9685 | 02a, 17 | G3 | 1 | not started |
| T-B11-03b1 | Convert 3 modules: mpu6050, hc-sr04, qtr-8rc | 02a, 17 | G3 | 1 | not started |
| T-B11-04b | Part editor shell: identity, pins, groups, footprint, JSON view, save | 04a, 13, 18, 06, 07, 01, 02a | G3 | 5 | not started |
| T-B11-08 | Packs: trust ladder, import with hostile-input limits, export, dialog | 01, 05a, 06, 07, 13, 18 | G3 | 4 | not started |
| T-B11-02b2 | Convert 3 parts: npn-2n2222, tip120, multimeter | 02a, 17 | G3 | 1 | not started |
| T-B11-02c2 | Convert 3 parts: nema17, lipo-2s, aa-holder-4 | 02a, 17 | G3 | 1 | not started |
| T-B11-03b2 | Convert 3 modules: soil-moisture, traffic-light, lm2596 | 02a, 17 | G3 | 1 | not started |
| T-B11-02d | Serial: regenerate the descriptor barrel and generated entries; drop duplicate B10 failure-model records | 02b1, 02b2, 02c1, 02c2, 03a, 03b1, 03b2, 17 | G4 | 1 | not started |
| T-B11-05b | Ratings, sources, tier and model templates in the editor | 04b, 05a, 18, 02a | G4 | 5 | not started |
| T-B11-14 | Part page: ratings in three slots, sources, validity, gaps, usage in the open project (R-132, R-133) | 02a, 17, 04b, 18, 05a, 08 | G4 | 5 | not started |
| T-B11-19 | Coverage gate for the 40 figure files, and `provenance:check` | 02d, 14 | G5 | 2 | not started |
| T-B11-15 | Upgrade preview dialog (diff and golden-trace differences) | 07, 14, 02a, 18 | G5 | 5 | not started |
| T-B11-16 | Library in the palette: Add part, Import pack, library parts searchable | 13, 02a, 08, 04b, 17, 18 | G5 | 5 | not started |
| T-B11-11 | `docs/ADD_A_PART.md` and the worked example | 04b, 05b, 08 | G5 | 3 | not started |
| T-B11-10 | End to end: add a custom part, wire it, simulate it, share it, hostile inputs | all | G6 | 0 | not started |

### B12. Labs moved in: Board lab

Source: `05_ENGINEERING/tasks/B12-labs-board.md`. 28 tasks, 8 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B12-01 | Spike: what the B2 converter and the new check path get wrong on all 102 items | none | G1 | 0 | not started |
| T-B12-02 | Guided plan: JSON Schemas, types, validator, substance hash | none | G1 | 4 | not started |
| T-B12-03 | Frozen oracle: old-path verdict vectors from `main` and `build/v1` | none | G1 | 2 | not started |
| T-B12-04 | Learner record, local store and event hooks | none | G1 | 3 | not started |
| T-B12-12 | `studio` strings for lessons in six languages | none | G1 | 1 | not started |
| T-B12-05 | Guided engine: gates, completion, the edit rule | 02, 04 | G2 | 3 | not started |
| T-B12-06 | Converter: emit the plan and the wireables | 01, 02, 06a.. | G2 | 4 | not started |
| T-B12-07 | Run a project's tests as a lesson: job builder and runner | 01, 04 | G2 | 2 | not started |
| T-B12-09a | Template build script and index | 06 | G3 | 4 | not started |
| T-B12-09b | Fork and open a template | 02 | G3 | 2 | not started |
| T-B12-10 | Inputs dock and live status | 07, 12 | G3 | 5 | not started |
| T-B12-11 | Figure lens: read-only figure fed by the run | 06, 12 | G3 | 2 | not started |
| T-B12-08 | Progress import from `iynk:v1` and one store behind `src/lib/progress` | 04, 09a | G4 | 4 | not started |
| T-B12-13 | Convert Arduino boards: `uno-r3`, `nano`, `uno-r4` | 06, 09a | G4 | 2 | not started |
| T-B12-14 | Convert ESP32 family and `nodemcu` | 06, 09a | G4 | 2 | not started |
| T-B12-15 | Convert `pico`, `microbit-v2`, `nucleo-f401re`, `pi4-pi5` | 06, 09a | G4 | 2 | not started |
| T-B12-16 | Convert `basys3` and `de10-lite` (Verilog) | 06, 09a | G4 | 2 | not started |
| T-B12-17 | Guide dock: steps, quiz, completion line, reset | 02, 05, 07, 09b, 12 | G5 | 5 | not started |
| T-B12-18 | Template gallery, lesson navigation, `[` and `]`, deep links | 08, 09b, 12, 13 to 16 | G5 | 5 | not started |
| T-B12-19 | Checks view and lesson hints | 07, 12 | G5 | 3 | not started |
| T-B12-20 | Assembly guide and wire-in guide over the netlist | 05, 06, 11, 12 | G5 | 4 | not started |
| T-B12-21 | Fault lessons use the B10 faults | 05, 12 | G5 | 5 | not started |
| T-B12-22 | Edit fixtures (A15): every lesson fails `edit` at zero ops and passes after one change | 03, 05, 06, 07, 09b, 13 to 16 | G6 | 1 | not started |
| T-B12-23 | FA-14 reference-run gate: 102 of 102 equal | 03, 07, 09a, 13 to 16 | G6 | 2 | not started |
| T-B12-25 | Notice while unchecked third-party text remains (F-197 support) | 06, 12 | G6 | 4 | not started |
| T-B12-26 | Old board pages link into Studio and are marked "lesson view" | 09b | G6 | 4 | not started |
| T-B12-24 | Mount the guide in Studio; end-to-end lesson walk and axe | 08, 09b, 10, 11, 17 to 21, 26 | G7 | 2 | not started |
| T-B12-27 | `docs/LESSONS.md`, provenance rows, exit gate record | all; T-B1-17 committed | G8 | 2 | not started |

### B13. Labs moved in: Robotics and Drone labs

Source: `05_ENGINEERING/tasks/B13-labs-robotics-drones.md`. 41 tasks, 10 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B13-00 | Spike: do all 26 items round-trip through the project schema? | none | G1 | see card | not started |
| T-B13-12 | Figure idle redraw (only if T-B1-25 deferred it) | none | G1 | see card | not started |
| T-B13-13 | Freeze the old results: reference baseline | none | G1 | see card | not started |
| T-B13-14 | Calculator fixtures name their sources | none | G1 | see card | not started |
| T-B13-16 | Bench session split: reducer and types leave the store | none | G1 | see card | not started |
| T-B13-17 | Craft workshop and fly session split | none | G1 | see card | not started |
| T-B13-18 | `LabSession` runtime and the figure link | 16 | G2 | see card | not started |
| T-B13-01 | Bench converter: steps, faults, modes, status, current | 00 | G2 | see card | not started |
| T-B13-05 | Craft converter: guide, design picks, legacy-craft domain | 00 | G2 | see card | not started |
| T-B13-19 | Bench operations and selectors | 16 | G2 | see card | not started |
| T-B13-20 | Craft operations and selectors | 17 | G2 | see card | not started |
| T-B13-21 | Extract `BenchView` from `BenchWorkspace` | 16 | G2 | see card | not started |
| T-B13-22 | Extract `CraftView` and `FlyView` | 17 | G2 | see card | not started |
| T-B13-25 | Local completion record and progress keys | none | G2 | see card | not started |
| T-B13-29 | AI adapters, sound moments and `RealBuildPanel` off the store types | 16, 17 | G2 | see card | not started |
| T-B13-30 | Robotics panels A import session types | 16 | G2 | see card | not started |
| T-B13-31 | Robotics panels B import session types | 16 | G2 | see card | not started |
| T-B13-36 | Drone panels A import workshop types | 17 | G2 | see card | not started |
| T-B13-37 | Drone panels B import workshop types | 17 | G2 | see card | not started |
| T-B13-32 | Non-lab consumers leave the v1 room client | none | G2 | see card | not started |
| T-B13-15 | Lab generation script, drift check, set checks, lab template index | 01, 05 | G3 | see card | not started |
| T-B13-04 | Robotics bench in Studio: `BenchPanel` | 01, 18, 19, 21, 25, 30, 31 | G3 | see card | not started |
| T-B13-08 | Drone workshop and fly in Studio: `CraftPanel`, `FlyPanel` | 05, 18, 20, 22, 25, 36, 37 | G3 | see card | not started |
| T-B13-02 | Projects: benches 1 to 6 and their 16 tasks | 15 | G4 | see card | not started |
| T-B13-03 | Projects: benches 7 to 13 and their 15 tasks | 15 | G4 | see card | not started |
| T-B13-06 | Projects: craft 1 to 7 | 15 | G4 | see card | not started |
| T-B13-07 | Projects: craft 8 to 13 | 15 | G4 | see card | not started |
| T-B13-23 | `LabHost` and the Studio mount | 04, 08 | G4 | see card | not started |
| T-B13-26 | Show the lab sets in the template gallery | 02, 03, 06, 07, 23 | G5 | see card | not started |
| T-B13-28 | Parity gate (unit): converted equals old | 13, 02, 03, 06, 07 | G5 | see card | not started |
| T-B13-27 | English term beside the translated term | 04, 08 | G5 | see card | not started |
| T-B13-24 | Route pages open the lab in Studio, URLs kept | 23, 26 | G6 | see card | not started |
| T-B13-09 | The dock leaves the room layer: `LabRoom`, Together tab | 24 | G7 | see card | not started |
| T-B13-33 | Playwright: the lab walk on Studio | 24, 25, 26, 28 | G7 | see card | not started |
| T-B13-40 | Together lobby leaves the v1 room client | none | G7 | see card | not started |
| T-B13-38 | Remove the old workspaces (separate commit) | 24, 28, 33 | G8 | see card | not started |
| T-B13-34 | Delete the v1 room client | 09, 32, 40 | G8 | see card | not started |
| T-B13-39 | Playwright: `room` spec on the new rooms | 24, 09, 33 | G8 | see card | not started |
| T-B13-10 | Delete `server/legacy/` | 34 | G9 | see card | not started |
| T-B13-11 | Delete the robotics and dronelab stores | 38, 29, 30, 31, 36, 37, 34 | G9 | see card | not started |
| T-B13-35 | `docs/LABS.md`, results, exit gate and Amar's walk | all | G10 | see card | not started |

### B14. AI partner: keys, relay, grounded read-only

Source: `05_ENGINEERING/tasks/B14-ai-keys-relay-readonly.md`. 37 tasks, 9 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| S-B14-01 | Spike: catalogue tools outside Next | T-B6-15 | G1 | 2 (note, fixture) | not started |
| S-B14-02 | Spike: relay transport primitive | T-B6-07 | G1 | 1 (note) | not started |
| T-B14-04 | Ledger, prices, log row, usage store | T-B3-02, T-B3-22 | G1 | 4 | not started |
| T-B14-07 | Server usage persistence and migration | T-B6-02 | G1 | 2 | not started |
| T-B14-08 | Context primitives: fences, redaction, sanitising, sources | T-B2-03, T-B10-19 | G1 | 4 | not started |
| T-B14-16 | Shared relay contract and router streaming | T-B6-07 | G1 | 4 | not started |
| T-B14-18 | Provider presets and CSP origins | T-B1-13 | G1 | 2 | not started |
| T-B14-26 | Portable search files and server `zod` | T-B6-01, T-B6-15 | G1 | 5 | not started |
| T-B14-31 | Server config, module switches, probe flags | T-B6-17 | G1 | 4 | not started |
| T-B14-34 | i18n namespaces for B14 | T-B4-01 | G1 | 4 (`namespaces.ts` plus three JSON ... | not started |
| T-B14-01 | Adapter contract, errors, profiles, OpenAI-compatible adapter | 16 | G2 | 5 | not started |
| T-B14-05 | Server relay with allow-list and SSRF guard | 07, 16, 31, S-02 | G2 | 4 | not started |
| T-B14-09 | Read tools and reference grammar | 08 | G2 | 4 | not started |
| T-B14-19 | Context pack builder | 08 | G2 | 4 | not started |
| T-B14-21 | Render policy, output checks, `diff.ts` home | T-B1-10 | G2 | 5 | not started |
| T-B14-29 | MCP key, `api_tokens`, MCP authentication | 07, T-B6-06 | G2 | 3 | not started |
| T-B14-02 | Anthropic adapter | 01 | G3 | 1 | not started |
| T-B14-14 | Profile and key storage | 01, T-B3-02, T-B3-07 | G3 | 2 | not started |
| T-B14-20 | Threads, retention, Delete AI data | 04, T-B3-08, T-B3-22 | G3 | 2 | not started |
| T-B14-22 | Effect tools and the search client on `/v1` | 09, 34, T-B6-05 | G3 | 5 (plus the old keys boundary test, a ... | not started |
| T-B14-25 | Search module on the server | 26, 31, 16 | G3 | 5 | not started |
| T-B14-30 | Conversation engine, modes, citations, prompts | 01, 04, 08, 09, 19 | G3 | 5 | not started |
| T-B14-15 | AI worker, transports, key custody | 01, 02, 14, 16, 18 | G4 | 5 | not started |
| T-B14-11 | "What the partner sees" and activity panel | 19, 04, 20, 30, 34 | G4 | 3 | not started |
| T-B14-12 | Adversarial harness and key scans (AR-13) | 05, 09, 21, 22, 30 | G4 | 2 | not started |
| T-B14-27 | Tools module core: MCP and REST | 29, 31, 16, 26 | G4 | 5 | not started |
| T-B14-10b | Tool card, mode switch, panel strings | 30, 34 | G4 | 3 (`ToolCard.tsx`, `ModeSwitch.tsx` ... | not started |
| T-B14-03 | Conformance C1 to C10 and CLI | 15 | G5 | 2 | not started |
| T-B14-10a | Partner panel and turn view on the new core | 10b, 30, 21, 22, 11, 34 | G5 | 4 (`PartnerPanel.tsx`, `TurnView.tsx` ... | not started |
| T-B14-28 | Catalogue tools in the tools module | 27, 25, S-01 | G5 | 5 | not started |
| T-B14-17 | Provider settings UI | 14, 15, 18, 03, 34 | G6 | 4 | not started |
| T-B14-24 | Studio mount for the partner | 10a, 10b, 11, T-B13-09 | G6 | 5 | not started |
| T-B14-32 | Deploy kit and docs | 05, 25, 27, 29, 31 | G6 | 5 | not started |
| T-B14-06 | Delete the Next AI, search and MCP routes, the old partner stack and the server token | 05, 10a, 10b, 17, 21, 22, 24, 25, 27, 28 | G7 | 5 (the four edited files plus the ... | not started |
| T-B14-23 | Key store narrowed to the search key, decision log | 06, 17 | G8 | 3 | not started |
| T-B14-13 | AI off or offline: every editor feature works | all | G9 | 0 | not started |
| T-B14-33 | Partner e2e with a stub provider and exit evidence | all | G9 | 1 | not started |

### B15. AI partner: proposals and teaching modes

Source: `05_ENGINEERING/tasks/B15-ai-proposals-teaching.md`. 36 tasks, 9 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B15-00 | Seam check: every B14, B10, B2, B3 name this phase needs, B14 deletions, session names (test only) | B14, B10 | G1 | 0 | not started |
| T-B15-21 | Strings: proposals, modes, ladder, scaffold, draft (six languages) | B14 (T-B14-10, 34) | G1 | 1 | not started |
| T-B15-33 | Spike: dry-run cost on the 500-part scene | B2 | G1 | 0 | not started |
| T-B15-34 | Spike: project read tools over MCP (R-163) | B14 (T-B14-09, 27, 28) | G1 | 0 | not started |
| T-B15-01 | `Proposal` types, ports, risk classes, forbidden ops, static stages P1 to P5; widen `Mode` | 00 | G2 | 4 + 1 edit | not started |
| T-B15-02 | Dry run (P6, P7) and the diff summary | 01, 33 | G3 | 2 | not started |
| T-B15-03 | Stale check by base revision and line overlap; re-preview | 01 | G3 | 1 | not started |
| T-B15-06 | Gate for `propose_ops`; three-invalid rule and explanation-only fallback | 01 | G3 | 1 | not started |
| T-B15-08 | Mode exclusions in the pack: hidden checks, quiz answers, hints, fault causes | 00, 01 | G3 | 1 + 2 edits | not started |
| T-B15-09 | Hint ladder tied to `Diagnosis.hint_level`; guided-output check | 00, 01 | G3 | 2 | not started |
| T-B15-10 | Routing: tiers, escalation, user-chosen fallback list | B14 | G3 | 1 | not started |
| T-B15-16 | Evaluation fixtures and conversation types: twelve base projects built from ops | 00, B2 | G3 | 2 | not started |
| T-B15-22 | Local `proposals` store, retention, Delete AI data | 01, B3 | G3 | 1 + 1 edit | not started |
| T-B15-04a | Session batch label and `undoStackTop` (conditional: runs only if T-B15-00 reports either missing) | 00, B2 (T-B2-10) | G3 | 1 | not started |
| T-B15-04 | Accept as one undoable batch | 01, 02, 03, 04a, 22 | G4 | 1 | not started |
| T-B15-05 | Diff card: `DiffView`, `ProposalCard`, line numbers | 01, 02, 21 | G4 | 2 + 1 edit | not started |
| T-B15-12 | Scaffold checks: invariants, rules, tier label | 01, 02 | G4 | 1 | not started |
| T-B15-13 | Mode blocks `socratic` and `advanced`; tool gating per mode | 01, 06, 08, 09, 16 | G4 | 2 + 3 edits | not started |
| T-B15-15 | Compaction and cache breakpoints | B14 | G4 | 2 + 1 edit | not started |
| T-B15-17 | Evaluation set A: grounding (12) and language (4) | 16 | G4 | 1 data | not started |
| T-B15-18 | Evaluation set B: debugging (10) and safety (6) | 16 | G4 | 1 data | not started |
| T-B15-19 | Evaluation set C: modes and ladder (10), proposals (8) | 01, 16 | G4 | 1 data | not started |
| T-B15-25 | Buddy draft tool and card (sends nothing) | 01, 06 | G4 | 2 | not started |
| T-B15-23 | Proposal pipeline P1 to P8, `propose_ops`, `try_ops`, `request_ops_group`, tool registration, turn gating hook | 01 to 04, 06, 12, 13, 22, 25 | G5 | 2 + 2 edits | not started |
| T-B15-27 | Adversarial cases A: names and labels (14), imported files (14) | 01, 16 | G5 | 1 data | not started |
| T-B15-28 | Adversarial cases B: chat and room (10), tool outputs (16), memory (4) | 01, 16 | G5 | 1 data | not started |
| T-B15-29 | Adversarial cases C: rendering (6), mode bypass (6), cost (6), secret exfil (6) | 01, 16 | G5 | 1 data | not started |
| T-B15-11 | Evaluation runner, scorer, stub model, set count gate | 01, 04, 09, 13, 16 to 19, 23 | G6 | 3 | not started |
| T-B15-07 | Invariants, corpus and run of the 82-case gate on B14's compromised-model harness | 01, 06, 13, 16, 23, 27 to 29 | G6 | 3 + 2 edits | not started |
| T-B15-24 | Proposal list, taint confirm, panel wiring, proposal host | 01, 03, 04, 05, 21, 22, 23, 25 | G6 | 3 + 2 edits | not started |
| T-B15-20 | Evaluation report, defaults file, live run entry (Amar's key) | 10, 11, 16 | G7 | 4 + 1 edit | not started |
| T-B15-14 | Edit B14's mode switch (add `socratic`, `advanced`); hint bar, hint host | 01, 09, 13, 24 | G7 | 2 + 2 edits | not started |
| T-B15-26 | Ghost overlay on the canvas from the dry-run state | 01, 24 | G7 | 1 + 1 edit | not started |
| T-B15-30 | `docs/AI.md`: proposals, modes, evaluation | all build tasks | G8 | 1 edit | not started |
| T-B15-31 | Playwright: accept, undo, stale, socratic, three invalid, forbidden op | 14, 24 | G8 | 1 spec | not started |
| T-B15-32 | Exit gate: AC coverage test, `npm run check`, results table | all | G9 | 1 test + 1 edit | not started |

### B16. Robotics creation: physics and line follower

Source: `05_ENGINEERING/tasks/B16-robotics-physics.md`. 41 tasks, 12 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B16-00 | Seam check, the one ports file and the shared report types | B2, B3, B8, B9, B10, B11 and B13 committed | G0 | see card | not started |
| T-B16-01 | Physics artifact build script, pins and hashes; engine decision closed | B9 (T-B9-07 loader convention) | G0 | see card | not started |
| T-B16-20 | Battery curves to `core`, and the pack model | nothing in B16 | G0 | see card | not started |
| T-B16-21 | Spike: motor current feedback into a sagging pack | none (spike) | G0 | see card | not started |
| T-B16-24 | Robot cause rows, symptom ids and hint texts keys | B10 | G0 | see card | not started |
| T-B16-30 | Strings: the `robot` namespace in six languages | nothing in B16 | G0 | see card | not started |
| T-B16-02 | `PhysicsBackend` interface, Rapier adapter and the two hashes | T-B16-00, T-B16-01 | G1 | see card | not started |
| T-B16-04 | `domains.robotics` cross-reference rules on apply | no B16 task (B2 only) | G1 | see card | not started |
| T-B16-06 | Brushed DC motor and gearbox: closed form per PWM cycle | T-B16-00 | G1 | see card | not started |
| T-B16-09 | Loop-timing probe and PID reference law | T-B16-00 | G1 | see card | not started |
| T-B16-26 | Robot part descriptors and fidelity registry entries | T-B16-00 | G1 | 4 | not started |
| T-B16-03 | Scene builder: document to `SceneSpec` | T-B16-02, T-B16-04 | G2 | see card | not started |
| T-B16-05 | Top-down view | T-B16-00, T-B16-04, T-B16-30 | G2 | see card | not started |
| T-B16-16 | Shipped-artifact gate: RA-01 in Node, RA-27 size and pins | T-B16-01, T-B16-02 | G2 | see card | not started |
| T-B16-19 | Motor driver and servo models | T-B16-00, T-B16-06 (`Drive` and `Decay` come from `motor.ts`) | G2 | see card | not started |
| T-B16-29 | PID panel, loop-timing view and the reference sources | T-B16-00, T-B16-09, T-B16-30 | G2 | see card | not started |
| T-B16-07 | Electrical coupling, the `h*c` check and the solver `MOTOR` element | T-B16-06, T-B16-19, T-B16-20, T-B16-21 (verdict) | G3 | see card | not started |
| T-B16-08 | Sensors from bodies: line array and ultrasonic ranger | T-B16-02, T-B16-03 (`worldPose`), T-B16-04 | G3 | see card | not started |
| T-B16-10 | Drift gate: SA-16 and RA-03, RA-06 numbers | T-B16-02, T-B16-03, T-B16-06 | G3 | see card | not started |
| T-B16-11 | Robot checker (RB-C-01 to RB-C-10) and run metrics | T-B16-00, T-B16-06, T-B16-19, T-B16-20, T-B16-26 | G3 | see card | not started |
| T-B16-23 | Quadrature encoder edges | T-B16-02, T-B16-06 | G3 | see card | not started |
| T-B16-35 | Spike: does engine snapshot then restore equal continuing? | T-B16-02, T-B16-16 (the artifact hook); nothing waits on it | G3 | see card | not started |
| T-B16-17 | Robot validator: RB-E and RB-W rules and scene limits | T-B16-00, T-B16-03, T-B16-04, T-B16-07, T-B16-30 (message keys) | G4 | see card | not started |
| T-B16-22 | The mechanical engine: look-ahead step, buffers, facts | T-B16-03, T-B16-07, T-B16-08, T-B16-10 (four-wheel fixture), T-B16-19, T-B16-23 | G4 | see card | not started |
| T-B16-31 | RobotChecks panel, models list and lab guidance | T-B16-00, T-B16-11, T-B16-30 | G4 | see card | not started |
| T-B16-32 | Replay record: engine pin, physics settings, refusal | T-B16-01, T-B16-02, T-B16-03 (and B3 T-B3-19, T-B3-11) | G4 | see card | not started |
| T-B16-12 | Template 3: the line follower (first template) | T-B16-04, T-B16-11, T-B16-17, T-B16-24, T-B16-26 | G5 | see card | not started |
| T-B16-13 | Robot fault detectors I: motion | T-B16-22, T-B16-24 | G5 | see card | not started |
| T-B16-18 | Robot builder: recipes and panel | T-B16-00, T-B16-04, T-B16-05, T-B16-17, T-B16-26, T-B16-30 | G5 | see card | not started |
| T-B16-33 | SimHost wiring: lazy load, "loading physics", frames, halts, validation message | T-B16-01, T-B16-17, T-B16-22, T-B16-32 | G5 | see card | not started |
| T-B16-25 | Robot fault detectors II: sensors, power, timing | T-B16-08, T-B16-09, T-B16-11, T-B16-13, T-B16-22, T-B16-24 | G6 | 4 | not started |
| T-B16-27 | Template 1: the open-loop drive base | T-B16-12 | G6 | see card | not started |
| T-B16-34 | Perf: RA-07 first version | T-B16-01, T-B16-16, T-B16-17, T-B16-22, T-B16-33 | G6 | see card | not started |
| T-B16-40 | Run data path: robot facts for the rules, the robot store, run hashes and the test hook | T-B16-13, T-B16-22, T-B16-29, T-B16-33 | G6 | see card | not started |
| T-B16-28 | Template 2: speed control with encoders | T-B16-27, T-B16-23, T-B16-29, T-B16-33 | G7 | see card | not started |
| T-B16-38 | Live-run tests: the templates and their faults, headless | T-B16-09, T-B16-12, T-B16-13, T-B16-22, T-B16-24, T-B16-25, T-B16-27, T-B16-28, T-B16-33, T-B16-40 | G8 | see card | not started |
| T-B16-39 | Studio wiring: mount the robot panels, New project > Robot, run hash text, Problems pane | T-B16-05, T-B16-12, T-B16-18, T-B16-27, T-B16-28, T-B16-29, T-B16-30, T-B16-31, T-B16-33, T-B16-40 | G8 | see card | not started |
| T-B16-14 | Cross-browser hash job (RA-01 browsers and RA-02) | T-B16-01, T-B16-10, T-B16-12, T-B16-16, T-B16-27, T-B16-28, T-B16-33, T-B16-38, T-B16-39, T-B16-40 | G9 | see card | not started |
| T-B16-15 | Robot end-to-end: build, run, same result twice | T-B16-05, T-B16-12, T-B16-13, T-B16-18, T-B16-25, T-B16-29, T-B16-31, T-B16-33, T-B16-39, T-B16-40 | G9 | see card | not started |
| T-B16-36 | Documentation: `docs/ROBOTICS.md` and the design-document edits | all tasks except T-B16-37 | G10 | see card | not started |
| T-B16-37 | Phase gate | all other tasks | G11 | see card | not started |

### B17. Robotics creation: arm, ROS-like graph, URDF

Source: `05_ENGINEERING/tasks/B17-robotics-arm-ros-urdf.md`. 24 tasks, 7 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B17-00 | Spike: arm stability and determinism in the pinned Rapier build | none | G1 | 0 (spike folder) | not started |
| T-B17-01 | Pose maths, `tf` tree, odometry (RA-15) | none | G1 | 3 | not started |
| T-B17-06 | ROS-like graph engine: messages, topics, nodes, timers, services, parameters (RA-16 core) | none | G1 | 3 | not started |
| T-B17-08 | URDF export and the shared unit and loss tables | none | G1 | 3 | not started |
| T-B17-15 | Safe XML parser | none | G1 | 1 | not started |
| T-B17-16 | i18n scaffold: namespaces `arm`, `rosgraph`, `urdf`, `odometry` | none | G1 | 4 | not started |
| T-B17-20 | STL and OBJ mesh readers with hard limits | none | G1 | 1 | not started |
| T-B17-02 | Navigation: `waypointFollower` (N1), `OccupancyGrid` and `astar` (N2) | 01 | G2 | 2 | not started |
| T-B17-04 | Kinematics: FK, analytic and damped least squares IK, joint limits, RB-C-08 (RA-14) | 01, 00 | G2 | 4 (2 new, 2 B16 edits) | not started |
| T-B17-09 | URDF import with loss report, worker and host (RA-17, RA-19) | 08, 15, 20 | G2 | 3 | not started |
| T-B17-12 | Bind the `rclpy` mock to the graph | 06 | G2 | 5 | not started |
| T-B17-13a | Standard nodes, sensor bridge, ROS commands and the ROS engine on a fake plant | 01, 06 | G2 | 4 | not started |
| T-B17-13b | Plant adapter over the B16 mech engine, engine wiring, `rover-ros` fixture | 13a | G3 | 4 (1 new, 3 B16 edits) | not started |
| T-B17-03 | Templates 4 (obstacle avoider) and 5 (rover with odometry) | 01, 02 | G3 | 2 data | not started |
| T-B17-05 | Arm view and template 6 (planar arm, with a 200 g payload variant) | 04, 00, 16 | G3 | 4 | not started |
| T-B17-07 | Topic graph and terminal UI (RA-16 in the UI) | 06, 13a, 16 | G3 | 5 | not started |
| T-B17-10 | URDF dialog and flow | 08, 09, 16 | G3 | 3 | not started |
| T-B17-22 | ROS channel through the SimHost (commands down, snapshots and taps up) | 13a, 13b | G4 | 4 | not started |
| T-B17-14 | Template 7 (sensor-guided maze rover, ROS-like Pi 5 variant) | 02, 06, 12, 13b | G4 | 1 data | not started |
| T-B17-18 | URDF round-trip gate on templates 1, 3 and 6 (RA-18) | 05, 08, 09 | G4 | 0 (tests, fixtures) | not started |
| T-B17-19 | Odometry panel: dead reckoning against ground truth | 01, 13a, 16, 22 (and B16 T-B16-33) | G5 | 3 | not started |
| T-B17-17 | Register templates 4 to 7, mount the panels, add URDF commands | 03, 05, 07, 10, 14, 19, 22 | G6 | 4 | not started |
| T-B17-11 | Arm and graph end to end, and the template hash job | all | G7 | 1 (config) | not started |
| T-B17-21 | `docs/ROBOTICS.md` extended | all | G7 | 1 | not started |

### B18. Drone creation: parts, propulsion, builder

Source: `05_ENGINEERING/tasks/B18-drone-builder.md`. 42 tasks, 10 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B18-01 | Calculator guards: `calcChecked`, typed `out-of-range` errors, no NaN or Infinity out (DA-01) | none | G1 | 2 | not started |
| T-B18-02a | Baseline: flight test counts, craft replay hashes, tunnel reproduction with the old test (SA-13, DA-11 first ... | none | G1 | 0 | not started |
| T-B18-02b | Swept collision primitive `src/sim/flight/collide.ts` | none | G1 | 1 | not started |
| T-B18-03a | Safety notices SN-1 to SN-8 as data; namespaces `drone` and `dronebuild` scaffolded; banned-word string gate ... | none | G1 | 4 | not started |
| T-B18-04 | `domains.drone` op helpers and semantic checks | none | G1 | 3 | not started |
| T-B18-05a | Mechanics readers: typed blocks, missing-field list, kv and ke consistency (DA-03 half) | none | G1 | 1 | not started |
| T-B18-S1 | Spike: can 10 motors and 10 propellers be shipped with redistributable data? (verdict only) | none | G1 | see card | not started |
| T-B18-02d | Split 1: `state.ts` out of `sim.ts` (types, `STEP`, `emit`, small helpers) | 02a | G2 | 2 | not started |
| T-B18-03b | Content rule check and dual-use refusal set (DA-15) | 03a | G2 | 2 | not started |
| T-B18-06a | Closed-form propulsion solve, pack coupling, duty search (DA-04, DA-01) | 01, 05a | G2 | 1 | not started |
| T-B18-07a | Battery model in `src/sim/flight/battery.ts`; game battery reads the same tables | 01, 02a | G2 | 2 | not started |
| T-B18-08a | Mass, centre of mass and inertia tensor (DA-17) | 01 | G2 | 1 | not started |
| T-B18-08b | Generalised prop clash rule (DA-16) | 01 | G2 | 1 | not started |
| T-B18-02e | Split 2: `autopilot.ts` and `scoring.ts` out of `sim.ts` | 02d | G3 | 3 | not started |
| T-B18-05b | Generic drone motors and propellers (data set) | 05a, 06a, 03b | G3 | 2 | not started |
| T-B18-05c | Generic batteries and ESCs (data set) | 05a, 07a, 03b | G3 | 2 | not started |
| T-B18-05d | Generic frames and flight controllers (data set) | 05a, 03b | G3 | 2 | not started |
| T-B18-06b | Datasheet fit with residuals and error band (DA-05) | 06a | G3 | 1 | not started |
| T-B18-07b | Endurance: stepped hover to cut-off, range from the band | 06a, 07a | G3 | 1 | not started |
| T-B18-02f | Split 3: `multirotor.ts`, `wing.ts`, `swarm.ts` out of `sim.ts` | 02e | G4 | 4 | not started |
| T-B18-03c | `SafetyNotice` and first-flight panel | 03a | G4 | 4 | not started |
| T-B18-08c | Checks DB-C-01 to DB-C-14 and structural errors | 01, 06a, 07b, 08a, 08b | G4 | 1 | not started |
| T-B18-09b | Part picker with compatibility flags | 05a to 05d, 03a | G4 | 3 | not started |
| T-B18-10a | Generic craft figure from the document (DA-24) | 05a | G4 | 1 | not started |
| T-B18-S2 | Spike: how far off is the model on published motor tables? (DK-1) | S1, 06b | G4 | 0 | not started |
| T-B18-02c | Swept test wired into the flight sim (SA-13, DA-11 second half) | 02b, 02e | G5 | 2 | not started |
| T-B18-09a | Build extraction from a project and `evaluateBuild` (the numbers engine) | 04, 05a to 05d, 06b, 07b, 08a, 08c | G5 | 2 | not started |
| T-B18-09e | Part entry form from datasheet rows (R-173) | 05a, 06b, 03a | G5 | 4 | not started |
| T-B18-11c | Model-keyed ghosts and medals; "tuned to feel" label (DA-20) | 03a | G5 | 5 | not started |
| T-B18-09c | Numbers panel and checks list | 09a, 03c | G6 | 3 | not started |
| T-B18-10b | Drone BOM with SN-8 header (DA-14) | 09a, 03a | G6 | 3 | not started |
| T-B18-11a | `calcFromBuild` and `fromBuild` for the game model | 09a | G6 | 2 | not started |
| T-B18-12a | Optimiser over the parts library | 09a | G6 | 1 | not started |
| T-B18-09d1 | Build hook, slots editor and layout writers | 04, 09a, 09b | G7 | 4 | not started |
| T-B18-09f | Compare two builds side by side | 09a, 09c, 09e | G7 | 3 | not started |
| T-B18-11b | Flight craft derived from a build | 11a | G7 | 2 | not started |
| T-B18-12b | Optimiser panel | 12a, 09c, 10b | G7 | 2 | not started |
| T-B18-09d2 | Builder shell, legacy-to-parts flip, Studio mount | 09d1, 09c, 09e, 10a, 03c, 10b | G8 | 4 | not started |
| T-B18-11d | Fly tab: your build on the flight range | 11b, 11c | G8 | 2 | not started |
| T-B18-09g | Builder tabs: Compare, Optimise, Fly | 09d2, 09f, 11d, 12b, 10a, 10b | G9 | 3 | not started |
| T-B18-13 | End to end: build, read the numbers, fly it | all | G10 | 0 | not started |
| T-B18-14 | `docs/DRONES.md`, the verification record and the exit gate run | all | G10 | 2 | not started |

### B19. Drone creation: rigid-body flight and traces

Source: `05_ENGINEERING/tasks/B19-drone-rigid-flight.md`. 31 tasks, 11 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B19-01 | Math facade, vectors and quaternions, rigid types, mass properties | none | G1 | 4 | not started |
| T-B19-02 | Input log: `InputEntry` mapping and legacy log conversion | none | G1 | 1 | not started |
| T-B19-03 | Trace format, metrics, first-difference marker | none | G1 | 4 | not started |
| T-B19-04 | i18n scaffold: four namespaces | none | G1 | 1 | not started |
| T-B19-05 | Spike RS-14a: PX4 SIH reference step responses | none | G1 | 1 | not started |
| T-B19-06 | Rotor ODE with motor and ESC electrics | 01 | G2 | 1 | not started |
| T-B19-07 | Drag, wind, gusts, environment mapping | 01 | G2 | 3 | not started |
| T-B19-08 | Sensors with noise, bias and failure modes | 01 | G2 | 1 | not started |
| T-B19-09 | Flight controller parameters and mixer | 01 | G2 | 2 | not started |
| T-B19-10 | Rigid-body integrator (RK4 and Euler) | 01, 06, 07 | G3 | 1 | not started |
| T-B19-11 | Complementary estimator | 01, 08 | G3 | 1 | not started |
| T-B19-12 | Cascaded PID controller and altitude loop | 01, 09 | G3 | 2 | not started |
| T-B19-13 | Rigid parameters from a project or a calculator result | 01, 06 | G3 | 1 | not started |
| T-B19-14 | CLI parameter bindings | 09 | G3 | see card | not started |
| T-B19-15 | `multirotor-rigid@1` model: step order, battery, replay record | 02, 03, 06 to 13 | G4 | see card | not started |
| T-B19-16 | Export: parameter dump and wiring sheet | 09, 14 | G4 | see card | not started |
| T-B19-17 | Failures, ESC desync, brown-out and failsafe | 15 | G5 | see card | not started |
| T-B19-19 | Bench-flight set, envelope and the analysis worker | 03, 15 | G5 | see card | not started |
| T-B19-20 | Fidelity entries, notices on flight outputs, banned-word gate | 15, 04 | G5 | see card | not started |
| T-B19-18 | Rigid driver inside the flight session | 15, 17 | G6 | see card | not started |
| T-B19-21 | Spike RS-14b: compare with PX4 SIH, verdict, label | 03, 05, 15, 20 | G6 | see card | not started |
| T-B19-23 | Trace view with table alternative and trace shelf | 03, 04, 15, 20 | G6 | see card | not started |
| T-B19-24 | Compare view | 03, 04, 19, 20 | G6 | see card | not started |
| T-B19-25 | Envelope view and bench-flight panel | 04, 19, 20 | G6 | see card | not started |
| T-B19-26 | Optimiser check on the rigid model | 19 | G6 | 2 | not started |
| T-B19-22 | Parameter bindings panel and model picker | 04, 09, 14, 16, 18, 20 | G7 | see card | not started |
| T-B19-28 | `dmath` in flight and the SA-12 hash check | 15, 17, 18, 19 | G7 | 2 | not started |
| T-B19-27 | Flight range wiring: model, ghosts by model, medals, touch and gamepad | 18, 22 | G8 | 2 | not started |
| T-B19-31 | Mount the views in the Studio drone workspace | 18, 19, 22 to 27 | G9 | see card | not started |
| T-B19-29 | End to end: fly your build twice and compare | 01 to 28, 31 | G10 | see card | not started |
| T-B19-30 | `docs/DRONES.md` extension and phase record | 21, 28, 29 | G11 | see card | not started |

### B20. Export and physical build

Source: `05_ENGINEERING/tasks/B20-export-physical-build.md`. 44 tasks, 12 groups.

| Id | Title | Depends on | Group | Files | Status |
|---|---|---|---|---|---|
| T-B20-01 | Seam check: every earlier-phase name this phase uses (test only) | none | G0 | 0 | not started |
| T-B20-02 | Spike: can a browser flash an Uno or Nano from a hex over Web Serial (STK500v1)? | none | G0 | 0 | not started |
| T-B20-03 | Spike: which open netlist format, and may Wokwi `diagram.json` be read? | none | G0 | 0 | not started |
| T-B20-04 | Shared types (incl. `BomResult`), CSV writer with injection guard, hazard tags and mains refusal | 01 | G1 | 3 | not started |
| T-B20-05 | Strings: namespace `buildit` in six languages | 01 | G1 | 2 | not started |
| T-B20-06 | Search client: a spent quota is its own code | 01 | G1 | 2 | not started |
| T-B20-07 | IndexedDB store `price_checks` | 01 | G1 | 4 | not started |
| T-B20-08 | Build inputs and bench measurements stored as a project asset | 01, 04 | G2 | 1 | not started |
| T-B20-09 | Datasheet links, staleness, query for a missing one | 01, 04 | G2 | 1 | not started |
| T-B20-11 | Wiring guide core: ordered steps from the netlist | 01, 04, 05 | G2 | 2 | not started |
| T-B20-12 | STK500v1 protocol client and a fake Optiboot | 01, 02 | G2 | 2 | not started |
| T-B20-13 | Trace types, capture and compare (pure) | 01, 04 | G2 | 2 | not started |
| T-B20-14 | Twin re-based on Studio sim frames; lab path kept through an adapter | 01 | G2 | 4 | not started |
| T-B20-15 | Netlist text and JSON, and SVG export of schematic and wiring diagram | 01, 04 | G2 | 2 | not started |
| T-B20-16 | KiCad `.net` netlist export and import with loss report | 01, 03, 04 | G2 | 1 | not started |
| T-B20-17 | Wokwi `diagram.json` import (built only if T-B20-03 says yes) | 01, 03, 04 | G2 | 1 | not started |
| T-B20-18 | Flashing recipes (data) and flash steps | 01, 02, 04 | G2 | 3 | not started |
| T-B20-10 | `bomKey` and BOM rows from the document | 01, 04, 05, 09 | G3 | 3 | not started |
| T-B20-20 | Assembly checklist, bench test steps, guide text formats | 01, 04, 05, 11 | G3 | 3 | not started |
| T-B20-25 | Web Serial flashing for Uno and Nano | 01, 02, 12 | G3 | 3 | not started |
| T-B20-35 | Twin panel: simulated and measured side by side, record as measurement | 01, 05, 08, 13, 14 | G3 | 2 | not started |
| T-B20-19 | BOM formats (CSV, Markdown, JSON) and the export record | 01, 04, 05, 10 | G4 | 2 | not started |
| T-B20-20b | Package text renderers: flash, checklist, tests, README | 01, 04, 05, 18, 20 | G4 | 1 | not started |
| T-B20-21 | Price model: kinds, totals, budget, catalogue prices | 01, 10 | G4 | 2 | not started |
| T-B20-23 | Substitutes engine and the swap proposal | 01, 10 | G4 | 2 | not started |
| T-B20-24 | Reality gap model: five sections, bench measurements | 01, 04, 05, 08, 09, 10 | G4 | 2 | not started |
| T-B20-26 | Drone and robot extras for the build package | 01, 04, 05, 10 | G4 | 1 | not started |
| T-B20-33 | Build guide and flash panels | 01, 05, 18, 20 (25 if built) | G4 | 2 | not started |
| T-B20-22 | Price check logic: cost first, cache, matching, errors | 01, 06, 07, 19, 21 | G5 | 1 | not started |
| T-B20-27 | Build package: one deterministic zip | 01, 05, 15, 18, 19, 20, 20b, 24, 26 (16 only through an injected function) | G5 | 1 | not started |
| T-B20-31 | BOM panel and substitutes dialog | 01, 05, 19, 23 | G5 | 2 | not started |
| T-B20-34 | Reality gap page and measurements panel | 01, 05, 08, 24 | G5 | 2 | not started |
| T-B20-28 | Import hub: `.iynk`, `.iynkz`, `.ino`, package, `.net` with loss reports | 01, 27 (16 and 17 only through injected readers) | G6 | 1 | not started |
| T-B20-29 | Leave with your work: whole library in open formats | 01, 27 | G6 | 2 | not started |
| T-B20-30 | Export worker and the 500-part timing | 01, 27 | G6 | 3 | not started |
| T-B20-32 | Prices panel and the check dialog | 01, 05, 21, 22 | G6 | 2 | not started |
| T-B20-36 | Export and import dialogs, project menu entries | 01, 05, 27, 28 (29, 30 if built) | G7 | 3 | not started |
| T-B20-37a | Build it tab shell: BOM, Guide, Flash and Reality gap, read-only data | 01, 05, 31, 33, 34 | G7 | 3 | not started |
| T-B20-39 | No-affiliate test and the copy check for generated text | 01, 19, 20, 20b, 24, 27, 32 | G7 | 1 | not started |
| T-B20-37b | Build it tab actions: inputs writes, substitutes accept, price check, Hardware, Nearby, Videos, dialogs | 01, 08, 14, 22, 23, 32, 35, 36, 37a | G8 | 5 | not started |
| T-B20-38 | Old parts-list panel: retire it if the lab pages are gone, else share the price code; remove the old Nearby ... | 01, 32, 37b | G9 | 5 | not started |
| T-B20-41 | Documentation: BUILD_IT.md and the bench record sheet | 37b | G9 | 3 | not started |
| T-B20-40 | End to end: `e2e/build-it.spec.ts` | 37b, 38, 39 | G10 | 0 | not started |
| T-B20-42 | Exit gate: run everything, record the numbers | all | G11 | 0 | not started |

## 4. Build order for a workflow

### 4.1 Rules

| # | Rule |
|---|---|
| 1 | Cut `build/v1` from `main` once, before B0 task one. All 21 phases build on that branch. Never push, never deploy. (D-014, task file conventions.) |
| 2 | Phases run in the order B0, B1, ... B20. One phase is one approval unit. The orchestrator stops after each phase exit gate for Amar's OK before the next phase starts. |
| 3 | Inside a phase, run groups in order. Start a group only when every task of the previous group is committed and its proof commands pass. |
| 4 | Inside a group, tasks have disjoint files and may run in parallel, each agent in its own `git worktree` with its own `npm ci`, or one after another in a shared tree. Cherry-pick or merge one commit per task onto `build/v1` in task id order. |
| 5 | A task also waits for each task in its "Depends on" cell, which is in an earlier group except for the three same-group cases in section 6.1. |
| 6 | One commit per task, authored as Amar Kushwaha, no `Co-Authored-By` and no "Generated with" line. Message form `Bn T-Bn-nn: <what>`. |
| 7 | The last group of each phase holds its closing task (exit gate, exit evidence or documentation record), marked `*` in 4.2. A red exit command stops the run. |
| 8 | Spike tasks write a report and may change the plan for later tasks in the same phase. Read the verdict before starting a task that names the spike. |
| 9 | "For Amar" items are not tasks. Do not schedule them. See section 7. |

### 4.2 Order, phase by phase and group by group

Task numbers drop the phase prefix (`T-B7-06` is `06`; spikes keep their `S`). The closing task of each phase is marked with `*`. It sits in the last group (B14, B17 and B18 have a second task in that group; the starred one is the one the file names as the exit evidence or documentation record).

| Phase | Group | Tasks (build in this order, parallel inside the group) |
|---|---|---|
| B0 | G1 | 01, 02, 03, 05, 07, 08, 09, 25, 26 |
| B0 | G2 | 04, 06, 10, 20 |
| B0 | G3 | 11, 13, 15 |
| B0 | G4 | 12, 14, 16 |
| B0 | G5 | 17, 19, 21 |
| B0 | G6 | 18, 22, 28 |
| B0 | G7 | 23, 24, 27 |
| B0 | G8 | 29, 31, 32 |
| B0 | G9 | 30* |
| B1 | G1 | S01, S02, S03, 01, 14, 17, 18, 19, 22 |
| B1 | G2 | 02, 03, 04, 13, 16, 25 |
| B1 | G3 | 05, 10, 11, 21, 23, 27 |
| B1 | G4 | 06, 30 |
| B1 | G5 | 07, 08 |
| B1 | G6 | 15, 26, 28 |
| B1 | G7 | 09 |
| B1 | G8 | 12, 20 |
| B1 | G9 | 24 |
| B1 | G10 | 29* |
| B2 | G1 | 01, 17, 18 |
| B2 | G2 | 02, 03, 04 |
| B2 | G3 | 05, 09, 11a, 11b, 13 |
| B2 | G4 | 06, 08a, 12a, 14 |
| B2 | G5 | 07, 08b, 12b |
| B2 | G6 | 10, 15, 19, 22 |
| B2 | G7 | 20a, 20b |
| B2 | G8 | 20c |
| B2 | G9 | 16 |
| B2 | G10 | 21* |
| B3 | G1 | 01, 02, 10, 14, 16, 20, S1, S2, S3 |
| B3 | G2 | 05, 11, 17, 22 |
| B3 | G3 | 03, 06, 07, 08, 12, 18 |
| B3 | G4 | 04, 13, 15 |
| B3 | G5 | 19, 26, 27 |
| B3 | G6 | 21 |
| B3 | G7 | 09, 23 |
| B3 | G8 | 24 |
| B3 | G9 | 25* |
| B4 | G1a | 01, 03, 18, 26, 27 |
| B4 | G1b | 02, 06 |
| B4 | G2 | 04, 10, 11, 12, 13, 15, 21, 23 |
| B4 | G3 | 09, 24 |
| B4 | G4 | 07, 08, 14, 16, 17 |
| B4 | G5 | 05, 19 |
| B4 | G6a | 25b |
| B4 | G6b | 25a |
| B4 | G7a | 20 |
| B4 | G7b | 22* |
| B5 | G1 | 05, 07, 08, 10, 12, 15, 20, 22 |
| B5 | G2 | 01, 06, 09, 17, 18, 19 |
| B5 | G3 | 02, 16 |
| B5 | G4 | 03, 21a |
| B5 | G5 | 04, 21b |
| B5 | G6 | 11, 13 |
| B5 | G7 | 13b, 14 |
| B5 | G8 | 23* |
| B6 | G1 | 01a, 01b |
| B6 | G2 | 02, 07, 13, 15 |
| B6 | G3 | 03, 16, 17, 19a, 19b, 20 |
| B6 | G3b | 04, 05 |
| B6 | G4 | 06, 11, 18 |
| B6 | G5 | 08, 12, 21, 22 |
| B6 | G6 | 09, 23 |
| B6 | G7 | 10 |
| B6 | G8 | 14* |
| B7 | G1 | 01, 02, 03, 04, 38, 39 |
| B7 | G2 | 05, 06, 07, 08, 09, 10, 11, 12 |
| B7 | G3 | 13, 14, 15, 16, 17 |
| B7 | G4 | 18, 19, 20 |
| B7 | G5 | 21, 22, 23, 24 |
| B7 | G6 | 25, 27, 41 |
| B7 | G7 | 26, 32 |
| B7 | G8 | 28, 29, 30, 31, 33, 34, 40 |
| B7 | G9 | 35, 36 |
| B7 | G10 | 37* |
| B8 | G1 | 03, 17a, 21, 27, 30 |
| B8 | G2 | 01, 05a, 13, 17b, 22 |
| B8 | G3 | 02, 04, 05b |
| B8 | G4 | 06, 09, 14 |
| B8 | G5 | 07, 08, 10, 15 |
| B8 | G6 | 16, 25, 28 |
| B8 | G7 | 11, 12, 18 |
| B8 | G8 | 20, 23, 26 |
| B8 | G9 | 29 |
| B8 | G10 | 19 |
| B8 | G11 | 24* |
| B9 | G1 | 01, 05, 07, 08, 16, 17, 18, 20, 35 |
| B9 | G2 | 03, 09, 11, 23, 24, 25, 34 |
| B9 | G3 | 02, 06, 10, 19, 26, 27, 36, 37 |
| B9 | G4 | 04, 13, 22, 32, 33 |
| B9 | G5 | 12, 14, 15, 21, 30, 31 |
| B9 | G6 | 28 |
| B9 | G7 | 29* |
| B10 | G1 | 00, 01, 16, 19, 20, 21 |
| B10 | G2 | 02, 03, 06, 07, 12, 15, 25, 26 |
| B10 | G3 | 04, 05, 08, 10, 17, 22, 28, 29 |
| B10 | G4 | 09, 11, 23, 24, 30 |
| B10 | G5 | 14, 18, 27, 33 |
| B10 | G6 | 32 |
| B10 | G7 | 13 |
| B10 | G8 | 31* |
| B11 | G1 | 01, 05a, 06, 12, 13, 18 |
| B11 | G2 | 02a, 04a, 07, 17 |
| B11 | G3 | 02b1, 02b2, 02c1, 02c2, 03a, 03b1, 03b2, 04b, 08, 09 |
| B11 | G4 | 02d, 05b, 14 |
| B11 | G5 | 11, 15, 16, 19 |
| B11 | G6 | 10* |
| B12 | G1 | 01, 02, 03, 04, 12 |
| B12 | G2 | 05, 06, 07 |
| B12 | G3 | 09a, 09b, 10, 11 |
| B12 | G4 | 08, 13, 14, 15, 16 |
| B12 | G5 | 17, 18, 19, 20, 21 |
| B12 | G6 | 22, 23, 25, 26 |
| B12 | G7 | 24 |
| B12 | G8 | 27* |
| B13 | G1 | 00, 12, 13, 14, 16, 17 |
| B13 | G2 | 01, 05, 18, 19, 20, 21, 22, 25, 29, 30, 31, 32, 36, 37 |
| B13 | G3 | 04, 08, 15 |
| B13 | G4 | 02, 03, 06, 07, 23 |
| B13 | G5 | 26, 27, 28 |
| B13 | G6 | 24 |
| B13 | G7 | 09, 33, 40 |
| B13 | G8 | 34, 38, 39 |
| B13 | G9 | 10, 11 |
| B13 | G10 | 35* |
| B14 | G1 | S01, S02, 04, 07, 08, 16, 18, 26, 31, 34 |
| B14 | G2 | 01, 05, 09, 19, 21, 29 |
| B14 | G3 | 02, 14, 20, 22, 25, 30 |
| B14 | G4 | 10b, 11, 12, 15, 27 |
| B14 | G5 | 03, 10a, 28 |
| B14 | G6 | 17, 24, 32 |
| B14 | G7 | 06 |
| B14 | G8 | 23 |
| B14 | G9 | 13, 33* |
| B15 | G1 | 00, 21, 33, 34 |
| B15 | G2 | 01 |
| B15 | G3 | 02, 03, 04a, 06, 08, 09, 10, 16, 22 |
| B15 | G4 | 04, 05, 12, 13, 15, 17, 18, 19, 25 |
| B15 | G5 | 23, 27, 28, 29 |
| B15 | G6 | 07, 11, 24 |
| B15 | G7 | 14, 20, 26 |
| B15 | G8 | 30, 31 |
| B15 | G9 | 32* |
| B16 | G0 | 00, 01, 20, 21, 24, 30 |
| B16 | G1 | 02, 04, 06, 09, 26 |
| B16 | G2 | 03, 05, 16, 19, 29 |
| B16 | G3 | 07, 08, 10, 11, 23, 35 |
| B16 | G4 | 17, 22, 31, 32 |
| B16 | G5 | 12, 13, 18, 33 |
| B16 | G6 | 25, 27, 34, 40 |
| B16 | G7 | 28 |
| B16 | G8 | 38, 39 |
| B16 | G9 | 14, 15 |
| B16 | G10 | 36 |
| B16 | G11 | 37* |
| B17 | G1 | 00, 01, 06, 08, 15, 16, 20 |
| B17 | G2 | 02, 04, 09, 12, 13a |
| B17 | G3 | 03, 05, 07, 10, 13b |
| B17 | G4 | 14, 18, 22 |
| B17 | G5 | 19 |
| B17 | G6 | 17 |
| B17 | G7 | 11, 21* |
| B18 | G1 | 01, 02a, 02b, 03a, 04, 05a, S1 |
| B18 | G2 | 02d, 03b, 06a, 07a, 08a, 08b |
| B18 | G3 | 02e, 05b, 05c, 05d, 06b, 07b |
| B18 | G4 | 02f, 03c, 08c, 09b, 10a, S2 |
| B18 | G5 | 02c, 09a, 09e, 11c |
| B18 | G6 | 09c, 10b, 11a, 12a |
| B18 | G7 | 09d1, 09f, 11b, 12b |
| B18 | G8 | 09d2, 11d |
| B18 | G9 | 09g |
| B18 | G10 | 13, 14* |
| B19 | G1 | 01, 02, 03, 04, 05 |
| B19 | G2 | 06, 07, 08, 09 |
| B19 | G3 | 10, 11, 12, 13, 14 |
| B19 | G4 | 15, 16 |
| B19 | G5 | 17, 19, 20 |
| B19 | G6 | 18, 21, 23, 24, 25, 26 |
| B19 | G7 | 22, 28 |
| B19 | G8 | 27 |
| B19 | G9 | 31 |
| B19 | G10 | 29 |
| B19 | G11 | 30* |
| B20 | G0 | 01, 02, 03 |
| B20 | G1 | 04, 05, 06, 07 |
| B20 | G2 | 08, 09, 11, 12, 13, 14, 15, 16, 17, 18 |
| B20 | G3 | 10, 20, 25, 35 |
| B20 | G4 | 19, 20b, 21, 23, 24, 26, 33 |
| B20 | G5 | 22, 27, 31, 34 |
| B20 | G6 | 28, 29, 30, 32 |
| B20 | G7 | 36, 37a, 39 |
| B20 | G8 | 37b |
| B20 | G9 | 38, 41 |
| B20 | G10 | 40 |
| B20 | G11 | 42* |

Closing tasks: B0 T-B0-30; B1 T-B1-29; B2 T-B2-21; B3 T-B3-25; B4 T-B4-22; B5 T-B5-23; B6 T-B6-14; B7 T-B7-37; B8 T-B8-24; B9 T-B9-29; B10 T-B10-31; B11 T-B11-10; B12 T-B12-27; B13 T-B13-35; B14 T-B14-33; B15 T-B15-32; B16 T-B16-37; B17 T-B17-21; B18 T-B18-14; B19 T-B19-30; B20 T-B20-42. Titles say "exit gate" for B0, B1, B2, B9, B12, B13, B15, B16, B20; "exit evidence" or "phase record" for B3, B4, B8, B14, B19; documentation for B5, B6, B7, B10, B17, B18; B11 ends with an end-to-end task. VERIFIED from titles only. Each file's own exit section says which commands must be green before Amar's OK; the orchestrator reads that section at the phase stop.

### 4.3 Task count per phase, and running totals

| Phase | Tasks | Running total |
|---|---|---|
| B0 | 32 | 32 |
| B1 | 33 | 65 |
| B2 | 27 | 92 |
| B3 | 30 | 122 |
| B4 | 28 | 150 |
| B5 | 25 | 175 |
| B6 | 25 | 200 |
| B7 | 41 | 241 |
| B8 | 32 | 273 |
| B9 | 37 | 310 |
| B10 | 34 | 344 |
| B11 | 28 | 372 |
| B12 | 28 | 400 |
| B13 | 41 | 441 |
| B14 | 37 | 478 |
| B15 | 36 | 514 |
| B16 | 41 | 555 |
| B17 | 24 | 579 |
| B18 | 42 | 621 |
| B19 | 31 | 652 |
| B20 | 44 | 696 |

### 4.4 Longest chain inside a phase, where the task file states one

| Phase | Chain | Label |
|---|---|---|
| B0 | 03, 10, 11, 14, 17, 22, 23, 29, 30 | DOCUMENTED (B0 section 3) |
| B7 | 01, 06, 13, 18, 21, 25, 32, 40, 35, 37 | ESTIMATED (B7 section 6) |

Other phases do not state a chain. A scheduler can compute one from the Depends on column.

### 4.5 Cross-phase dependencies

Order on the page is D-014. Hard edges are in `IMPLEMENTATION_ROADMAP.md` section 4 (DOCUMENTED). In short: B1 needs B0; B2 needs B1; B3 needs B2; B4 needs B3; B5 needs B4; B6 needs B1 and B2; B7 needs B3, B4 and B6; B8 needs B3 and B4; B9 needs B6 and B8; B10 needs B4 and B8; B11 needs B10; B12 needs B5, B9, B10 and B11; B13 needs B11 and B12; B14 needs B3, B4 and B6; B15 needs B10 and B14; B16 needs B3 and B13; B17 needs B16; B18 needs B11 and B13; B19 needs B18; B20 needs B5, B9, B11, B17 and B19. The roadmap says B6 may move earlier (Amar's call). Task files name the exact earlier tasks they use inside each Depends on cell.

## 5. Every phase has a For Amar list

Work only a person can do is listed in each task file under a "For Amar" heading (for example choosing the licence, comparing old and new pages side by side, checking simulated faults against a real board with a multimeter, reviewing third-party content for rewrite, building a physical robot or drone). None of it is an agent task and none of it is in the tables above. The phase exit asks Amar for his OK; items marked "before the OK" in a task file are part of that stop.

| Phase | Heading in the task file |
|---|---|
| B0 | section 5. For Amar (not agent tasks) |
| B1 | section 9. For Amar (not build tasks) |
| B2 | section 7. For Amar (not build tasks) |
| B3 | section 9. For Amar |
| B4 | section 8. For Amar (not agent tasks) |
| B5 | section 6. For Amar (not build tasks) |
| B6 | section 9. For Amar |
| B7 | section 10. For Amar |
| B8 | section 12. For Amar |
| B9 | section 10. For Amar |
| B10 | section 9. For Amar |
| B11 | section 9. For Amar |
| B12 | section 9. For Amar, and questions only Amar can answer |
| B13 | section 9. For Amar |
| B14 | section 9. For Amar |
| B15 | section 6. For Amar |
| B16 | section 6. For Amar |
| B17 | section 7. For Amar |
| B18 | section 9. For Amar |
| B19 | section 9. For Amar |
| B20 | section 9. For Amar |

## 6. Things the index shows that a builder should know

### 6.1 Dependencies that sit in the same group, or in a later one

Found by checking every parseable dependency against the group order (VERIFIED by script over the tables above).

| Task | Group | Depends on | Group of the dependency | What to do |
|---|---|---|---|---|
| T-B1-13 | G2 | T-B1-04 | G2 | Commit T-B1-04 before T-B1-13 (B1 section 5 says the orchestrator does this). |
| T-B1-11 | G3 | T-B1-10 | G3 | Commit T-B1-10 before T-B1-11 (same reason; both touch `PartnerPanel.test.tsx`). |
| T-B6-01b | G1 | 01a | G1 | Build 01a first; 01b follows it in the same group. |
| T-B4-24 | G3 | T-B4-14 (G4) | G4 | Interface use only: the task file says it uses T-B4-06, 10 and 14 outputs through the `ArtProvider` and `OverlayProviders` interfaces, so it is not a build-order edge (DOCUMENTED, B4 dependency list). |

### 6.2 Task ids that look alike

| Case | Note |
|---|---|
| T-B3-S1 to S3 and T-B18-S1, S2 | Spike ids use `S` as the last part. T-B1 and T-B14 use `S-B1-nn` and `S-B14-nn`. |
| T-B4-25a, 25b; T-B6-01a, 01b; T-B11-02a, 02b1, 02b2, 02c1, 02c2, 03a, 03b1, 03b2, 05a, 05b; T-B18 and T-B19 lettered ids | Letter suffixes are separate tasks. Sort them as text. |
| B8 to B11 and B17 to B19 index cells such as `30` or `02a` | Same-phase shorthand. |

### 6.3 Files cells that the index could not give

Index tables carry a files count for every task of B0, B2 to B9, B12, B14, B15, B17 and B20. B1, B4, B10, B11 and B18 get theirs from a per-task count paragraph or the card. Three files give no count in an index and the cell says "see card": all 41 tasks of B13, 39 of 41 in B16 and 15 of 31 in B19, plus T-B18-S1. The count is in the card prose (an Identity line, a "New files" row or an ownership row). Every file states the 5-file rule in its conventions (DOCUMENTED), so a "see card" task is still within it.

## 7. Open questions the task files still carry

Copied from each file's open-question section and trimmed to the first 190 characters of the question and 140 of the default. Every question has a default the agents use if Amar does not answer (DOCUMENTED, each file says so). Full text, evidence and the task each one blocks are in the named section. A line marked "Answered" is closed in its file and is shown only as a count.

### B0

Source: `B0-foundation-green-safe.md`, section 6.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| 1 | The 4.6 grep includes README.md, but README work is B1. | T-B0-27 deletes only the lines that name removed features. |   |
| 2 | Without a proxy a route handler cannot see the peer address (`next-request.md:123`). Is one shared rate-limit bucket (`direct`) acceptable for a few friends? | Yes. Callers that matter hold the server token. |   |
| 3 | The R-005 gate "search for vercel" cannot be empty while the About page links `*.vercel.app` apps. | T-B0-20 greps for platform use, not the word. |   |
| 4 | PRD R-004 keeps buddy server code "unrouted"; BE-0 deletes the Postgres layer. | Delete (roadmap, BE-0, ADR-0004). |   |
| 5 | `Settings.telemetry` stays but does nothing in B0, and the toggle copy still says "Share anonymous usage counts". | B1 (F-016, `UsageToggle`) rewrites the copy and adds the local log. |   |
| 6 | Third-party GitHub Actions versions. | T-B0-06 reads the current stable majors from the actions' own README at build time (EXTERNAL, cannot be checked offline). |   |
| 7 | Do TS-4 (`e2e/support/axe.ts`) and TS-5 (`e2e/a11y-routes.spec.ts`) go into B1? | No. Not planned until Amar says yes; if he does, they become B1 cards in `tasks/B1-foundation-keys-oss-honest.md`. TEST_STRATEGY 12.4 step ... |   |

### B1

Source: `B1-foundation-keys-oss-honest.md`, section 10.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| Q1 | The CSP `connect-src` variable: `IYNK_CONNECT_ORIGINS` (ADR-0405, used here) or `IYNK_ALLOWED_ORIGINS` (roadmap card). `RECONCILIATION.md` had no row; RC-75 (section 2) proposes one and ... | `IYNK_CONNECT_ORIGINS`; the orchestrator adds RC-75. |   |
| Q2 | Data dir default `.iynk-data` (roadmap) vs `./data` (BACKEND); AI cap unit tokens (R-154) vs requests (BACKEND `IYNK_AI_DAILY_REQUESTS`). | `.iynk-data`, tokens; B6 reconciles. |   |
| Q3 | Figure pages need `'unsafe-inline'` scripts under their own policy (D-B1-3), which R-006 forbids for scripts. Accept as a scoped exception, or require hashing each inline script at figure ... | Accept the exception, backed by T-B1-14. |   |
| Q4 | Provider chosen by operator env (`IYNK_AI_PROVIDER`), not by the browser. A friend with a Gemini key on a Meta-configured server must ask the operator. | Operator env. |   |
| Q5 | `/config.json` gains an additive `modules` field. RC-73 (section 2) proposes the row; the field now also carries `voice`. | Add the field as an interim, remove at B6/B14. |   |
| Q6 | Partner search tools (`search_datasheet`, `find_parts`) are off in B1 because the chat request carries only the AI key. A second header `X-Iynk-Search-Key` on the chat route would keep ... | Off until B14. |   |
| Q7 | ADR-0405 says `geolocation=()`, but the Nearby panel uses the browser location API (`NearbyPanel.tsx:183`). Allow `geolocation=(self)` or drop "Use my location". | `geolocation=(self)`. |   |
| Q8 | SECURITY.md contact: GitHub private vulnerability reporting, or an email? | GitHub private reporting (no email in the repo). |   |
| Q9 | The roadmap says B1 has 25 tasks; this file has 30 build tasks and 3 spikes. Update the roadmap rows? | Yes, the orchestrator updates the roadmap table after your OK. |   |
| Q10 | Home page links point at `https://github.com/kushwahaamar-dev/iynk` (from `git remote -v`). Keep? | Keep. |   |
| Q11 | R-014's acceptance line names `docs/ARCHITECTURE.md`, but `.gitignore:63` ignores it. Track it, or accept that B1 ships `CONTRIBUTING.md` (docs index) and `docs/SERVER_AND_KEYS.md` instead? | Stays ignored; the two tracked files stand in. |   |
| Q12 | R-015 and the roadmap row say `provenance:check` "exits non-zero" and CI "reports but does not fail". Both cannot hold with one exit code. Default exit 0 with `--strict` for non-zero, as ... | Default 0, `--strict` 1; the R-015 acceptance line is read as "with `--strict`". |   |

### B2

Source: `B2-core-document-netlist.md`, section 8.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| OQ-1 | Descriptor folder: the roadmap uses `src/parts/data/`; ADR-0200 option (a) says repo-root `parts/` built to `public/parts/`. This plan follows the roadmap because rows B4, B5, B9, B11, B18 ... | T-B2-12a; one constant moves it | PROPOSAL |
| OQ-2 | Schema home: the generator reads `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/`. If `docs/MASTER_PLAN` is later archived, move the four schemas and the examples to `schemas/` at the repo root ... | T-B2-04 | PROPOSAL |
| OQ-3 | Monitor checkpoint `097630ef...` is not reproduced by three recipes. T-B2-15 builds the revision-140 state with two hand-written inverse ops, records the recomputed hash with `it.fails` ... | T-B2-15 | VERIFIED evidence, DECISION left to Amar |
| OQ-4 | SYSTEM 5.3 rule 1 wants zero `@/components` imports in `src/lib` by the end of CORE; the roadmap scope has no task that moves `src/lib` code. B2 enforces the matrix for new code only ... | T-B2-01 | UNKNOWN |
| OQ-5 | `meta.set` cannot clear `description` or `tags`, and `board.set` cannot remove `firmware`, so some inverses are not expressible in opSchema 1.1. B2 treats an empty string or array as ... | T-B2-05 | PROPOSAL |
| OQ-6 | FRONTEND 6.4's async `Authority` and `PendingBatch` are not built in B2: `ProjectSession` calls a synchronous `LocalAuthority.stamp`, so there is one counter for `seq`. B7 builds the room ... | T-B2-10 | PROPOSAL |
| OQ-7 | ADR-0110 decision 2 (no `allErrors` in production) is dropped: one validator with `allErrors: true` costs 0.63 ms at 500/1,000 (VERIFIED, PDM 9.6) | T-B2-04 | PROPOSAL |
| OQ-8 | The corpus is not committed; a 140-row manifest is, and `npm run corpus -- --check` guards drift. Committing all 140 projects would add about 5 MB (ESTIMATED from 8 to 52 KB each) | T-B2-20c, 21 | PROPOSAL |
| OQ-9 | Behavioural check parity (R-141, "same verdicts on the old and new path") needs the interpreter adapter that reads `nets`, which is B4/B5. B2 proves structural parity (checks unchanged) and ... | T-B2-19 | DOCUMENTED |
| OQ-10 | V5-SVG and the SVG corpus S1 to S12 (PDM 9.5) need the sanitiser that comes with asset import (B3). Not in B2 | T-B2-08a | DOCUMENTED |
| OQ-11 | Module refs for benches (`core.l298n` and so on) have no descriptors in B2; they are reported `no-descriptor` and their pins come from the figure module tables. Descriptors arrive in B11 ... | T-B2-20a | DOCUMENTED |
| OQ-12 | PDM 11.3 sends bench data to `domains.robotics.data` (power, modes, status, current, faultRules) and craft data to `domains.drone.data` (frame, parts, build steps, and so on). Neither ... | T-B2-20a, 20b | PROPOSAL |

### B3

Source: `B3-core-storage-runtime-replay.md`, section 10.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| U-1 | Real B2 export names and the `baseSeq` meaning of `source.edit` | Read B2's code at the start of T-B3-04, 03, 06, 15 | UNKNOWN |
| U-2 | IndexedDB write from a worker at `pagehide`; `createWritable()` in a worker | T-B3-S2 | UNKNOWN |
| U-3 | RSC requests offline; precache source | T-B3-S3 | UNKNOWN |
| U-4 | Zip approach and licence | T-B3-S1 | UNKNOWN |
| U-5 | Whether 99 golden circuits can all be generated (some lesson circuits may use parts the Uno page lacks) | T-B3-18 generator | UNKNOWN |
| U-6 | `ReplayLog` versus `ReplayRecord` field conflicts for B8 (PD-6) | RECONCILIATION update by the schema owner | UNKNOWN |
| U-7 | Whether the lesson suite slows by more than 5 percent with the allocation caps | Measured in T-B3-14 (T-B3-26 no longer touches the interpreter, PD-22) | UNKNOWN |
| U-8 | Float drift in interpreter ns timestamps over long runs (ESTIMATED under 1 ns per million statements) | SA-06 and R-048 would show a difference | HYPOTHESIS |
| U-9 | The digital-slice rule DP-1 is enough for the ten starters (R-045 HYPOTHESIS) | T-B3-15 Blink and the corpus in T-B3-19; B4 starters | HYPOTHESIS |
| U-12 | Whether Turbopack writes `<distDir>/BUILD_ID` so the T-B3-09 e2e can compare it with `NEXT_PUBLIC_BUILD_ID` | The T-B3-09 agent checks the file after `BUILD` | UNKNOWN |
| U-11 | B1's `server` token slot stays in `localStorage` until B6 (PD-16); whether that is acceptable for a token that never leaves the browser except as a header | Amar at the stop; B6 replaces it | HYPOTHESIS |

### B4

Source: `B4-studio-uno.md`, section 9.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| Q-B4-1 | SYSTEM_ARCHITECTURE line 359 says `studio` depends on `sim-host`; FRONTEND 5.3 and 6.5 say wiring modules join them and neither imports the other. Which matrix does ... | FRONTEND (D4-3). If T-B2-01 encoded SYSTEM, T-B4-13 moves `simLink.ts` into `src/studio/run/` as the roadmap row says and nothing else ... |   |
| Q-B4-2 | Keep interpreter messages in English (D4-7) or translate them in B4? | English with a visible note. |   |
| Q-B4-3 | R-066 (history and compare) and R-067 (author checks) sit in the range of the task text but the roadmap puts them in B5. | B5. |   |
| Q-B4-4 | Most B3 names are now taken from the B3 task file (`blankProject`, `forkProject`, `createProjectHost`, `createSimHost`, `host.library`, `host.files`, `writeIynk`); they are DOCUMENTED, not ... | Stop and report. |   |
| Q-B4-5 | Does `session.undo()` accept a scope or filter (T-B4-11)? | Add the optional filter (the one edit to a B2 file). |   |
| Q-B4-6 | A `notFound()` page under a layout with `ensureStatic = "navigation"` (T-B4-05 perf route): does `next build` accept it? | If the build fails, the perf page returns an empty page with `robots: noindex` instead of a 404 when the flag is off, and `docs/STUDIO.md` ... |   |
| Q-B4-7 | B3 has no call that returns a stored project to the main thread: `Repository.load` is worker-side (T-B3-02), `ProjectHost.open(projectId, state, revision)` takes the state in, and `Library` ... | T-B4-27 adds a `load` request to the three B3 `src/local` files and says so in its commit. |   |

### B5

Source: `B5-studio-all-boards.md`, section 7.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| 1 | B2 to B4 task files and code do not exist yet, so every PLANNED path is the roadmap's name, not a fact | First step of each task reads the real file; a different real name wins | UNKNOWN |
| 2 | Whether `ProjectSession` already has a checkpoint writer | T-B5-08 reads `src/project/session.ts` first; adds `recordCheckpoint` if absent, and always adds `recordExport` (no op exists for ... | UNKNOWN |
| 3 | Where B4 put `repositoryLink.ts` | The task finds it with `grep`; paths in this file are descriptions. The `Sheet` component is `src/components/ui/Sheet.tsx` (VERIFIED) | UNKNOWN |
| 4 | Whether the B2 converter can express all 11 `blink` circuits (Basys 3 and DE10-Lite use port maps) | Hand-written starter fallback is allowed (3.2) | UNKNOWN |
| 5 | The PRD says "a `checks` section"; the schema says `tests[]` | Schema wins (3.5) | DOCUMENTED, resolved |
| 6 | The roadmap says Verilog boards show "netlist inspect only"; Yosys Inspect is scheduled for B9 | Read as "no synthesis in B5" (T-B5-04). Listed in section 0.3 and For Amar item 10. If Amar meant the Inspect view must exist in B5 ... | DOCUMENTED |
| 7 | Phone numbers are emulation only | Recorded as such; real devices are For Amar | UNKNOWN |
| 8 | The 70 percent `.ino` threshold in the spike is my number | The report shows raw counts so Amar can judge | HYPOTHESIS |
| 9 | PRD R-051 says an imported `.ino` creates a project "on the Uno"; PDM 12.2 says "board guess from includes and pin use" | Default Uno; a guess only for clear Wi-Fi or Pico includes; always shown and changeable (T-B5-10, T-B5-19) | DOCUMENTED, resolved by proposal |
| 10 | Total effort | Roadmap says 4 / 6 / 10 weeks for 14 tasks. This file has 25 tasks and one spike. The extra tasks are small (strings, docs, wiring, two ... | ESTIMATED |
| 11 | `Alt+Shift` is also the Windows keyboard-layout switch | The switch fires only when Alt and Shift are pressed and released with no other key; the align chords add an arrow or letter. A Windows ... | HYPOTHESIS |

### B6

Source: `B6-collab-server-buddies.md`, section 10.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| O-1 | B6 needs `src/local/db.ts` from T-B3-02 for the `identity` and `server` stores. If Amar moves B6 before B3 (roadmap section 4 allows it) there is no database. | Then T-B6-11 first builds a minimal opener for database `iynk` version 1 with only those two stores, and T-B3-02 adopts it. The ... | UNKNOWN |
| O-2 | T-B6-15 may fail (stub packages break Turbopack or vitest). | Fallbacks are in the task. | HYPOTHESIS that it passes |
| O-3 | BE 5.1 says registration returns the instance role; openapi `Identity` has no role field and forbids extra properties. | openapi wins (R4). The role is not returned. The owner sees it with `iynk-server devices`. | VERIFIED |
| O-4 | Contract text to fix: (a) `IdentityRegister.enrollmentCode` pattern should also allow the 22-character link form; (b) enrolment and pairing links use `/together#...` here, the docs say ... | A doc fixer edits openapi, API 5.1, BE 6.3, BE 13.1 and BE 6.4. The code follows the plan text above. | VERIFIED |
| O-5 | Strike rule for typed enrolment codes (RC-18 leaves it to ADR-0424). | B6 relies on the `identity.register` bucket (5 per minute per address) over 60 bits. ESTIMATED sufficient for friends-sized use. | UNKNOWN |
| O-6 | `IYNK_MAX_IDENTITIES` is not in BE 13.1; R-078 names `IYNK_MAX_DEVICES` and `IYNK_MAX_DATA_BYTES` as PROPOSAL names and a `server_full` error. | B6 uses `IYNK_MAX_IDENTITIES` (default 100, API 4.8) and answers 409 `quota`. `server_full` and the data-bytes cap arrive with B7 storage ... | UNKNOWN |
| O-7 | openapi `Health` and BE 5.1 disagree. | BE 5.1 body (`ok`, `draining`, `store`) per its own note. | VERIFIED |
| O-8 | Idempotency-Key replay (API 4.6) has no table in BE 6.4. | Not built in B6. Duplicate `POST /pairings` makes two pairings (bounded by quota); duplicate `POST /identities` with a used code is 401. ... | UNKNOWN |
| O-9 | BE 14 plans generated Ajv validators from `server/schemas/*.json`; B6 uses hand checks per route. | Hand checks keep the server dependency-free. Revisit when B7 adds large op schemas. | UNKNOWN |
| O-10 | CM-30 says a server-side block is not claimed; block is client-enforced. | Built that way in T-B6-11. | DOCUMENTED |
| O-11 | BA-04 wording says a wrong code five times "deletes the pairing"; API 5.3 rule 2 and CM-03 say the code is deleted and the link stays. | The code is deleted, the link stays (R4). Test asserts both. | VERIFIED |
| O-12 | `docker compose build` and the Linux commit numbers are not run by agents. | A1, A5. | UNKNOWN |
| O-13 | `ws` is not added in B6; the roadmap B6 card lists it as a dependency. | B7's first server task adds it. | VERIFIED |
| O-14 | After Leave server the browser keeps its device key until `effectiveAt`, so the person can sign in and cancel (review fix 2). CM-31 says local data is cleared "after the grace" for the ... | T-B6-11 `leaveServer` keeps the key until `effectiveAt`; with grace 0 it deletes the key at once. | HYPOTHESIS that this is what Amar wants |
| O-15 | `maxHeaderSize` is Node's default (16 KB). The hostile suite asserts 431 or a closed socket for a 1 MB header, not a byte-identical 401. | No `main.ts` setting added. | VERIFIED by reading the Node default |

### B7

Source: `B7-collab-rooms-shares-board.md`, section 11.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| Q1 | Build `codeMode: "open"` (two people typing at once)? | No: baton only (D5). `room.settings` refuses `open` |   |
| Q2 | Who may change `provenance` in a room? | Owner only (D9) |   |
| Q3 | Add a route that lists shares made for me ("Shared with me", F-143)? | No: a `buddies` share is a link only a buddy can open (D11) |   |
| Q4 | Add an owner signature on shares (CM-10) and a `/restore` route for corrupt rooms? | No: neither is in the contract (D16, D17) |   |
| Q5 | When a pair is removed, also close rooms that both joined through a third person's room? | No: only rooms one of them created (T-B7-18) |   |
| Q6 | Default uses for a commenter link | 5, like a viewer (T-B7-25) |   |
| Q7 | Who may create invites: owners and the host only, or any editor? | Owners and host (T-B7-25) |   |
| Q8 | Should B7 offer per-reader chat translation (F-117 text says so)? | No: `lang` is carried so it can be added; translation is LATER with voice (RT 10) |   |

### B8

Source: `B8-fidelity-live-analog.md`, section 10.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| D-B8-1 | Engine tie-break inside one rank. `SIMULATION_ARCHITECTURE.md` 5.5 says "registration order, then engine id"; SA-08 says permuting registration changes no hash | Order by engine id only; registration order is ignored |   |
| D-B8-2 | Registry id shapes. 16.3 rule 6 says `@<major>` for every id; entry 1 is `engine:mna-dc-pwl@1.0.0` | RC-54: model ids end in `@<major>`, engine ids end in a full semver; two regexes |   |
| D-B8-3 | How a registry entry marks "approximate in this state". The type fixes `knownFailureCases` as `string[]` | Prefix convention `state:<DeviceState>:` plus `operatingRange` with `current_A` or `voltage_V` |   |
| D-B8-4 | Are `instrument.set` and `instrument.remove` sim-affecting in a room? `STUDIO_EDITOR.md:1024` lists them under "changes the run itself"; RT 13.4 does not list them as live-safe | Live-safe |   |
| D-B8-5 | How the runner learns that a member needs frames. RT 13.6 sends frames only to members who asked; it does not say how the runner knows to make them | Server sends the runner `run.req {req: 'frames', args: {on}}` when the count of frame members changes between 0 and 1; `run.detach` modes ... |   |
| D-B8-6 | Where `toleranceMode` is stored. It is in `SimSettings` (SIM 5.2) but not in the project schema (fact 20) | `simulation.solver.options.toleranceMode`, set by `sim.set { key: 'solver', value: <the whole solver object> }` (`setToleranceOp`, T-B8-20) |   |
| D-B8-7 | Failure triggers. SIM 13.3 stores a trigger as a "safe expression"; `eval` and `new Function` are banned in `src/sim` | Thresholds are code constants keyed by failure-model id; the entry states the rule in text; an evaluator is B10 |   |
| D-B8-8 | Partial exits. SA-09 (bus timing) and SA-25 (the BRIEF 30 build) need B9 models | B8 records the halves it can pass and names the open halves |   |
| D-B8-9 | Number of figures shown. SIM 14.3 gives 2 significant figures for a T1 LED current; no source gives T2 or T3 digits | T0 none, T1 two, T2 four, T3 exact for counters; PROPOSAL |   |
| D-B8-10 | Brown-out dwell and `behindReal` threshold (10 ms dwell, 0.95 of the requested speed over a 1 s window) | As stated |   |
| D-B8-11 | R-FID-4 (reality gap panel) is listed in the roadmap scope for B8 but the PRD places it in the export phase (R-189, B20) | Not built in B8 |   |
| D-B8-12 | How the live analog gets board pin numbers. `AnalogSolver.load(net, o: SolveOptions)` and `LoadReport` are binding and have no board data | A construction-time `PinDirectory` passed to `createLiveAnalog`; `load` keeps its two arguments and `SolveOptions` is untouched |   |
| D-B8-13 | Who halts a room run on an edit | Only the server: it appends a stamped `run.ev` control `halt` right after the commit frames (`RoomCore.flush()` listener); the client does ... |   |
| D-B8-14 | Names added by B8 that SIMULATION_ARCHITECTURE does not list | `LiveAnalog.netVolts`, `pinVolts`, `componentResult`, `whatIf`, `PinDirectory`, `pinElementId`, `MODEL_TABLE`, `modelIdsOf` (T-B8-05a) ... |   |

### B9

Source: `B9-fidelity-chip-engines.md`, section 12.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| 1 | Which B4 task wires `simulation.world.inputs[]` and `script[]` to run-bar sliders for Studio projects? T-B4-13 and T-B4-14 do not say. T-B9-06 provides the driver; the UI binding may be ... | The agent for T-B9-06 reads T-B4-13's `session.ts`; if it is missing it reports, and a small task is added to B9 or B10. | UNKNOWN |
| 2 | Real pull-up values on common BME280 breakouts. The plan assumes 10 kOhm and labels it assumed. | Bench or a vendor schematic. | UNKNOWN |
| 3 | Calibration data for the BME280: whether the temperature and pressure words from the Bosch compensation example are in the datasheet, and whether a real humidity dump with a URL exists. | T-B9-04 reads the datasheet and records which set it used. | UNKNOWN (HYPOTHESIS for the values in T-B9-04) |
| 4 | ESP32 brown-out hysteresis, dwell and reset times. | ESP32 datasheet, cited in T-B9-05 when read; else `assumed`. | UNKNOWN |
| 5 | Whether the in-house trapezoidal stepper meets 1 percent and the frame budget; whether ngspice WASM batch output is identical across engines. | T-B9-18. | UNKNOWN |
| 6 | Firmware mode inside a room (lockstep, replay checkpoints): avr8js state serialisation is UNKNOWN (SIM 6.7); restore is by re-run. T-B8-15 and T-B8-18 do not cover avr8js. | Not built in B9. A room whose host uses Firmware mode should fall back to frame mode (T-B8-18 mismatch rule). A later task or Amar's ... | UNKNOWN |
| 7 | UART between an MCU and a device: the model exists and a loopback is tested, but no first-release device uses UART; `SoftwareSerial` and `OneWire` report `library-not-modelled`. R-109 says ... | Amar, or a device model in a later phase. | HYPOTHESIS that this meets R-109 |
| 8 | SPI device models: none in the first release; `SPI.transfer` fails loudly with `bus-device-not-modelled`. | Same. | DOCUMENTED (ADR-0307: SPI "replaces the stub"; "a registered device is required") |
| 9 | Interpreter breakpoints inside interrupt handlers and functions called in expressions cannot pause (`runSync` is not a generator). | Documented in `FIDELITY.md`; a generator-based ISR path is a later refactor. | VERIFIED limitation (`exec.ts:116-133`) |
| 10 | DigitalJS drawing performance on large designs and in WebKit and Firefox. | T-B9-32 caps at 5,000 cells (PROPOSAL). | UNKNOWN |
| 11 | avr8js bundle size (manifest budget). | T-B9-07. | UNKNOWN until measured |
| 12 | Whether `arduino-cli` 1.5.1 and the AVR core 1.8.8 remain downloadable with the pinned sha256 when the build runs. | T-B9-08 and T-B9-14 record the sha256 they used. | UNKNOWN |

### B10

Source: `B10-faults-any-circuit.md`, section 10.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| Q1 | The roadmap card lists 14 tasks. This file has 34. May the orchestrator raise the B10 count and the total (341 to 361) and the effort (roadmap 4 / 6 / 9 weeks; this plan ESTIMATES 5 / 8 / ... | Yes |   |
| Q2 | May `src/studio` and `src/components` import `src/sim/faults/**` (pure rules, types, reducer, generator)? SYSTEM 5.3 lists no such edge, and the roadmap's own T-B8-04 (ModelsPanel from the ... | Yes, for these two folders only (T-B10-01 part B). Binding for the agents unless `DECISION_REGISTER.md` has a Q2 row that says No |   |
| Q3 | EDUCATION 6.6 lost rows 6 to 10 of the broken table. Rows rebuilt here: `part-not-powered`, `button-no-pulldown`, `open-connection`, `swapped-pins`, `wrong-pin-in-code`. Right? | Yes |   |
| Q4 | Should T-B10-21 (`node-voltage` and `supply-current` checks) move to B8 where the solver outputs are built? | Stay here so B10 is complete |   |
| Q5 | The local log is opt-in and default off (R-009, ADR-0106). R-119 wants the record "written to the local event log". Default when the switch is off: keep the record in the session and export ... | Yes |   |
| Q6 | Extension ids proposed: `x-code.serial-baud-mismatch`, `x-code.pin-mode-wrong`, `x-npn.overheat`, `x-supply-overvoltage`, `x-pot.track-overpower`, `x-diode.overcurrent`, and the catalogue ... | Yes |   |
| Q7 | SIM 13.2 `stuck` has `part` and `level` and no pin, but `stuck-level` and `boot-strap` faults name a pin. Add an optional `pin` to `stuck` in SIM 13.2 and `types.ts`? | Yes |   |
| Q8 | Nine of the 40 items (cold-solder, boot-strap, level-mismatch) have `x-` causes with no detector, so they can be `model-only` only. Keep the quota (they are good read-only explanations) or ... | Keep the quota |   |
| Q9 | PDM 5.11 says Restore "disables" the fault and the hash "returns". Disabling leaves a stored disabled fault, so the hash would differ. This plan makes Restore remove a fault Break it added ... | Yes |   |
| Q10 | Code detectors read Arduino C++ only. MicroPython `Pin(n)` and Verilog are not covered in B10. Accept? | Yes |   |
| Q11 | An unfinished diagnose item is not saved across a reload. Save it? | No |   |
| Q12 | Symptom ids: kebab (SIM 13.4, SA-23) against dotted (the example files). This plan renames the example files. Right? | Yes |   |
| Q13 | F-018 says diagnose-first on the legacy figure path first. B12 and B13 delete that path, so this plan builds diagnose-first only in Studio and only tags and logs the legacy panels. Accept? | Yes |   |
| Q14 | R-126 says the diagnosis "offers to fix either". The code fix is an operation. The wiring fix is text, because moving a leg is a hole-level edit the tool set does not expose as one batch ... | Yes |   |

### B11

Source: `B11-components.md`, section 2.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| Q1 | The roadmap says model kinds are "ideal, table, curve, piecewise-linear". The schema has six layer kinds and no `curve` or `table` data kind | The schema wins (field and module names are binding). Mapping: ideal and piecewise-linear are `element` layers (the solver's `pwl` mode) ... | DOCUMENTED |
| Q2 | Where do custom descriptors live in IndexedDB? `COMPONENT_SCHEMA.md` 4.1 and `COMPONENT_ECOSYSTEM.md` 5.4 say a store `parts` keyed `id@version`. The 19-store list in ... | Add a 20th store `parts` (T-B11-13, one database version bump). Art and test files go to the existing `assets` store by sha256 | DOCUMENTED |
| Q3 | Pack file: `.iynkpack` with `pack.json` (CS 9.10, CE 7.1, ADR-0207) against "a pack is a `.iynkz`, no new format" (`COMMUNITY.md` 3.8) | `.iynkpack`, as ADR-0207 decides. Projects that carry embedded descriptors (`.iynk`, `.iynkz`) go through the same validator, so there is ... | DOCUMENTED |
| Q4 | One descriptor can name only one figure in `visual.breadboard.figure`. Six items have a part figure and a module figure | `visual.breadboard.figure` names the **part** figure (what the breadboard view draws). The module page goes in the top-level tool key ... | HYPOTHESIS |
| Q5 | `wire` has a figure file but is a project object | `wire` gets no descriptor. The coverage test (T-B11-02a) maps 28 part files + 12 module files = 40 figure files onto 34 descriptors and ... | DOCUMENTED |
| Q6 | A part whose behaviour code exists only inside a figure page (the L298N bridge in `figures/modules/l298n.js:40-60`, power-tree rules in `figures/engine/bench.js`) is not run by the Studio ... | Honesty rule (ASSUMED, Amar may relax): `simulation.status` describes what the **Studio engine runs today**. A layer whose model the Studio ... | ASSUMED |
| Q7 | Export of a pack rewrites the `local.` namespace to the sender's handle (CE 7.2 item 6, a PROPOSAL) | Not built. A second import of the same `id@version` with different bytes is refused with both hashes (CS 6.4). Listed under "Not in this ... | DOCUMENTED |
| Q8 | Roadmap B11 lists 11 tasks and 3 / 5 / 8 weeks. This plan has 28 tasks because the 27 descriptors are split into seven data tasks of at most five descriptors each, and the UI files and the ... | Task ids T-B11-01 to T-B11-11 keep the roadmap meaning (some split into letters and digits); T-B11-12 to T-B11-19 are new. Effort ESTIMATED ... | ESTIMATED |
| Q9 | A fault-model source of truth: ADR-0208 says the descriptor is authored; B10-02 (`tasks/B10` lines 641-660) put failure models as data in the single file ... | Descriptors own `failure_modes` and `injectable_faults` for parts. T-B11-17 compiles them into the B10 model registry. Where a B10 record ... | DOCUMENTED |
| Q10 | Code-bearing pack: `COMMUNITY.md` 3.8 and CM-16 say the part arrives **disabled** and cannot be enabled before an RS-15 verdict. `PRODUCT_REQUIREMENTS.md` R-137, `COMPONENT_SCHEMA.md` ... | CM-16, because it is the phase exit gate named by the roadmap: the pack imports, the code part is stored as inert data, shown as "code part ... | DOCUMENTED |

### B12

Source: `B12-labs-board.md`, section 9.

None.

### B13

Source: `B13-labs-robotics-drones.md`, section 10.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| 4 | Whether `InviteDialog.tsx` is still imported by B6 or B7 code (finding F6). Read from the task files: yes (T-B7-28 through `index.ts:4`, T-B7-31 edits it, T-B6-10 reuses `QrCode`), so ... | not stated |   |
| 6 | The task count grew from 12 to 41. The 5-file rule forced it (findings F4, F5, and the review's T-B13-40). The roadmap total of 341 tasks grows by 29. | not stated |   |
| 7 | `docs/PROVENANCE.md` (T-B1-17) uses `status` words `cleared`, `rewrite-needed`, `own` (`tasks/B1-foundation-keys-oss-honest.md` line 826). `provenance.thirdParty[].review` in the project ... | not stated |   |
| 8 | T-B13-25 adds one optional field to B12's `LearnerRecord`: `items?: Record<string, {doneAt, by}>` (at most 128), because EDU 11.2 has no place for a craft's bench tests and courses and a ... | not stated |   |
| 9 | `content/projects/index.ts` (T-B12-09) declares `TemplateEntry` with `kind: 'lesson' \| 'tour'` and a `catalogue.lab` of `'board'`. T-B13-15 adds a separate `LabTemplateEntry` and ... | not stated |   |
| 10 | `LabHost` mounts the lab panels without `LabDock`, so the lab pages have no Partner or Build it for real tab between T-B13-24 and B14/B20. The old dock remains on the board pages. Confirm ... | not stated |   |
| 11 | `scripts/convert-labs.mjs` loads `src/content/faults/legacy-map.ts` and the converter files with Node type stripping. That works only if those files use explicit `.ts` relative imports and ... | not stated |   |

4 further item(s) in this section are marked "Answered" in the file.

### B14

Source: `B14-ai-keys-relay-readonly.md`, section 10.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| Q1 | Which env names for the relay switches (F5)? | BACKEND and BA-15 names | PROPOSAL |
| Q2 | The name and shape of B8's probe tap are unknown (the B8 task file is not yet read into this file). B3's exports are known: `keys-backend.ts`, `wipe.ts`, `db.ts` | T-B14-24 reads `src/sim-host` and adapts; the `PartnerSources` interface is the contract | UNKNOWN |
| Q3 | Does `tsconfig.json` allow `.ts` import extensions in app code (needed by T-B14-26)? T-B2-01 is meant to prove it | If not, T-B14-26 stops and reports | UNKNOWN |
| Q4 | Does `LabDock` still mount `PartnerPanel` after B13? | T-B14-24 re-greps and removes it | UNKNOWN |
| Q5 | Does `next.config.ts` in B1 build `connect-src` in a helper file the builder should edit instead? | T-B14-18 edits where B1 put it | UNKNOWN |
| Q6 | The token estimator (3.5 bytes per token, 1.15 margin) is a guess (AI_ARCHITECTURE Q8) | `correction()` learns from provider-reported input tokens; the evaluation is B15 | HYPOTHESIS |
| Q7 | The optional passphrase lock for keys (AI_ARCHITECTURE 9.2) is not built | Documented as a gap in `docs/AI.md` | PROPOSAL |
| Q8 | Price table rows are from `platform-options.md` 7.1 as of 2026-10-26 and will go stale | Stale warning at 90 days; user can edit | EXTERNAL |
| Q9 | Anthropic and other CORS and header requirements (EXTERNAL) | C1 and the live run settle them | EXTERNAL |

### B15

Source: `B15-ai-proposals-teaching.md`, section 7.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| 1 | Is the dry run fast enough in the main thread (T-B15-02) | T-B15-33 measures. FAIL adds a worker dry run task (T-B15-35) before T-B15-02 | UNKNOWN |
| 2 | Two diffs exist: B5's `compareStates` in `src/studio/history/compare.ts` (not importable from `src/ai`) and this phase's `summariseDiff` | Short term two small functions. A later cleanup moves `compareStates` to `src/project/compare.ts` and has both use it. One Source of Truth ... | PROPOSAL |
| 3 | Does the line "2 hidden checks exist" help extraction (Q6 of the architecture) | The flag `showHiddenCount` exists in T-B15-08; F2 and F3 inform it | HYPOTHESIS |
| 4 | Sharing a proposal into a room (`AI_ARCHITECTURE.md` 7.7) | Needs B7's buddy-proposal path, which is not in the B7 task list. `ingestProposal` (T-B15-23) is the receiving end and is tested; the ... | UNKNOWN |
| 5 | Does the output heuristic (more than 6 code lines, diff shapes) catch fix leaks at an acceptable false-positive rate (Q7) | The 4 extraction rows in CI prove it catches planted leaks. The false-positive rate on real answers is measured in F2 | HYPOTHESIS |
| 6 | Closed (review fix 2026-10-27): the legacy `propose_change`, `ask_peer` and `applyChange` paths are deleted by T-B14-06, which also deletes `src/lib/ai/` whole, `ChangeCard.tsx` and ... | T-B15-00 asserts the files are absent (`MUST_BE_ABSENT`) and stops B15 if any remains. T-B15-23 no longer greps for them | VERIFIED (B14 T-B14-06, "Deleted" row) |
| 7 | A settings screen for the routes file (tiers and fallback list) | Not in B15. `routing.ts` reads and writes the file; the editor can be a JSON paste in `ProviderForm` (B14) or a later task. Amar can load ... | UNKNOWN |
| 8 | Whether B4's overlay system can draw a dashed pair and an outline | T-B15-26 Step 0 | UNKNOWN |
| 9 | Whether `src/ai` is in `tsconfig.portable.json` | T-B15-00 prints the real answer; `TP` is skipped for B15 only if it is `no` | DOCUMENTED (B14 D-B14-1 and its `PORT` command say yes for non-React files) |
| 10 | The shape of the case file in B14's harness | `Case = { id, surface, class: TrustClass, plant: { patch: { path, value }[] }, script?: Script, goal: Goal }` with `Goal` of seven values ... | Closed (review fix 2026-10-27) |
| 11 | Does the stored `source.edit` in the op log keep `pos` in original or transformed form | T-B15-03 Step 0 reads PDM 7.4 and the T-B2-07 helper; the test covers both forms | UNKNOWN |
| 12 | A model that supports no tools (`tools: "json-text"` or `"none"`, `AI_ARCHITECTURE.md` 6.6): `iynk-ops` fenced block for proposals | Not built in B15. The pipeline takes parsed args, so a later adapter-level parser can feed it. Local models are Amar's call (F2 shows ... | UNKNOWN |
| 13 | Concurrent proposals from two devices on the same project | Each device has its own `proposals` store; a room orders ops. Not tested beyond the `permission` and `stale_base` rejects | UNKNOWN |
| 14 | `Proposal.status` has nine values in the schema and `ProposalRecord.state` uses the same names | closes `AI_ARCHITECTURE.md` objection 2 | VERIFIED (schema) |
| 15 | Who builds the `ProposalHost` and the hint host for the Studio panel. B14's join `linkPartner` (`partnerLink.ts`, T-B14-24) has a grep test that bans `commit(` and `session.apply`, so B15 ... | T-B15-24 Step 0 reads `Workspace.tsx` and `partnerLink.ts` as built. Default: `PartnerHost` gains optional `proposals` and `hints` fields ... | UNKNOWN |
| 16 | `ai.holdMe` and `ai.defaultMode` as settings. B14 defines `ai.retention` only (grep of B14 found no other `ai.*` setting); B14's `defaultMode(kind)` is a function | `holdMe` is a `localStorage` convenience (T-B15-14). The thread mode is `ThreadRecord.mode`. No new `ai.defaultMode` setting is built | VERIFIED (B14 grep) |

### B16

Source: `B16-robotics-physics.md`, section 7.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| Q1 | Does Rapier 0.21.0 expose joint angle, and can the combine rules and solver iterations be read back? | Compute angle from the relative quaternion with `dmath.atan2`; store what was written and mark `engine_confirmed: false` (T-B16-02 Step 0) |   |
| Q2 | Does `dmath` pass SA-12 on all four browsers (T-B9-20)? | If not, scene building, joint angles and the sensor rays are class N and RA-02 may fail on a last bit |   |
| Q3 | AA packs (alkaline, NiMH) for small robots | Not in B16; the schema allows the enum but the pack refuses without an `ocv_table` |   |
| Q4 | Template text in the other five languages | English text in the project files, UI strings in six |   |
| Q5 | Symptom id names in T-B16-24 | Proposed list |   |
| Q6 | Where `loopPeriodUs` lives: `ext["x-iynk-robot"]` today | Keep until a schema minor adds a field |   |
| Q7 | The motor-in-circuit coupling form | Decided by T-B16-21 |   |
| Q8 | Which of two cost drivers is real on a phone: step time or readback | UNKNOWN until a baseline device exists (RS-01 follow-up) |   |
| Q9 | `needsPhysics` rule (robotics domain plus a body) | Proposed |   |
| Q10 | Should `ReplayLog` in `project.schema.json` get a `physics` field (a schema minor)? Today the physics settings live in `SimSettings` and are rebuilt from the document at replay (T-B16-32) | Not added |   |
| Q11 | The loop-start signal for `LoopStats`: the MCU engine's own event if T-B3-12 emits one, else a heartbeat pin that the templates toggle (`loopPin`, T-B16-09) | Heartbeat pin |   |

### B17

Source: `B17-robotics-arm-ros-urdf.md`, section 2.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| Q1 | Roadmap row T-B17-02 says "N1 and N2 (wall follow, waypoint)". ROBOTICS 10.3 says N0 is reactive (wall follow is template code), N1 is the waypoint follower, N2 is the occupancy grid plus A* | ROB 10.3 wins. `nav1.ts` is `waypointFollower`; `nav2.ts` is `OccupancyGrid` and `astar`. Wall following is code inside templates 4 and 7 ... | DOCUMENTED |
| Q2 | Roadmap puts templates 4, 5 and 7 in one task before the ROS graph exists. Template 7 needs the graph, `rclpy` binding and N2 | T-B17-03 is templates 4 and 5. Template 7 is T-B17-14, later. Template 6 stays in T-B17-05 | DOCUMENTED |
| Q3 | ROB 10.1 says "no frame is created implicitly" and also maps ROS `map`, `odom`, `base_link` to `world`, "a robot-start frame" and the root body's frame. The document stores no robot-start ... | `tf` holds three read-only virtual aliases, named in one table in `tf.ts`: `map` = `world`; `odom` = the pose of `Arena.start` (fixed) ... | ASSUMED |
| Q4 | ROB 12.1 limits a URDF to 512 links. The robotics domain schema holds physics for 64 bodies and 32 joints, and ROB 4.5 sets scene limits of 64 bodies and 32 joints | Two layers. The XML parser caps at 512 links (parse safety). The importer refuses more than 64 links or 32 joints with ... | DOCUMENTED |
| Q5 | RA-17 says the xacro case is "refused with a hint, and the rest imports". ROB 12.1 says "error with a hint". Both can be read as whole-file refusal or partial import | Partial import. A file with xacro constructs (an `xmlns:xacro` declaration, an `xacro:` element, or a `${...}` value) still imports its ... | ASSUMED |
| Q6 | URDF `<inertial>` is a full tensor and an origin with rotation. The document holds principal moments and `com_mm` only | Use `ixx, iyy, izz`. If any product term is above 1e-9 of the largest diagonal term, or the inertial origin has a rotation, emit warnings ... | ASSUMED |
| Q7 | `<visual>` and `<collision>` have an `origin`. `Body.shape` and `BodyPhysics.collider` have none | Geometry origins are not stored. A non-identity origin is the warning `urdf-geometry-origin-dropped` with the link. Real URDFs often have ... | HYPOTHESIS |
| Q8 | The `diff_drive_controller` node (schema: `left_joint`, `right_joint` only) consumes `cmd_vel`. If the same wheel joint also has a `drive` (a motor in the netlist) the controller would ... | The controller is an ideal velocity controller for joints with no `drive`. It drives them with `setJointMotor({velocity, maxTorque ... | ASSUMED |
| Q9 | The "assumed" against "true" wheel radius for the odometry error demo (ROB 10.2) has no document field | No schema change. The physics uses `WheelSpec.radius_mm` (true). User code holds its own constant (assumed). The odometry panel plots both. ... | ASSUMED |
| Q10 | A `wheel` joint has no URDF equivalent | Exported as `continuous` with loss `urdf-wheel-surface-dropped` and `urdf-wheel-kind-lost`. A round trip returns `continuous`, not `wheel`. ... | DOCUMENTED |
| Q11 | Arm physics: does a servo-driven 3-link arm hold pose and keep the hash in the pinned Rapier build? RK-3 (stability of small robots, high mass ratios) is open and RS-13 tested wheeled ... | Spike T-B17-00 answers it first. If the arm is not stable above a measured mass ratio, the validator limit `RB-W-MASSRATIO` is set to the ... | HYPOTHESIS |
| Q12 | Topic latency. The roadmap names a "topic latency model". ROB 11.2 says delivery is same-timestamp, and RA-16 needs exact multiples of 100 ms | Default latency is 0 ns. A per-subscription `latencyNs` option exists for teaching and tests. DDS jitter, loss and discovery delay are "not ... | ASSUMED |
| Q13 | The roadmap has 11 tasks and 9 / 11 / 15 weeks. The XML parser, mesh reader, standard nodes, `rclpy` binding, i18n scaffold, panel mounting, odometry panel, round-trip gate and docs need ... | 24 tasks, ids T-B17-00 to T-B17-22, where T-B17-13 is split into 13a and 13b. Ids 01 to 11 keep the roadmap meaning (03 is narrowed by Q2). ... | ESTIMATED |
| Q14 | Task T-B17-05 and the roadmap say the arm is "kinematic". The roadmap's simulation work says torque limits go through `applyJointTorqueImpulse` | Both. FK, IK and the holding-torque check (RB-C-08) are pure functions (the "kinematic" part). In a run, servo joints are moved by the B16 ... | DOCUMENTED |
| Q15 | Topic names and namespaces. `RosConfig.namespace` is required (`^/...`); template 7 uses `/rover`; the controller topics were named without a namespace in some places | Decided once, in T-B17-06: a name without a leading slash resolves under `RosConfig.namespace` (`cmd_vel` is `/rover/cmd_vel`); a name with ... | DOCUMENTED |

### B18

Source: `B18-drone-builder.md`, section 2.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| Q1 | Key names of the drone part blocks | The schema wins. A drone motor is a descriptor with `identity.category` `drone` and `mechanics.motor.kv_rpm_per_v`. A prop is ... | DOCUMENTED |
| Q2 | Battery chemistry set | The builder flies `lipo`, `lihv`, `liion`. Any other chemistry is the structural error `DB-E-CHEMISTRY` ("not flyable in this model") | DOCUMENTED |
| Q3 | What `r_cell_ohm` and `capacity_mah` mean for a pack with `parallel` greater than 1 | `capacity_mah` is the whole pack, as on the label and in the legacy catalogue (`from-calc.ts:10`). `r_cell_ohm` is the resistance of one ... | HYPOTHESIS |
| Q4 | Where the game flight model lives after the split | B18 splits `src/lib/flight/sim.ts` into modules **inside `src/lib/flight/`** (behaviour-preserving moves, tests stay put). All new pure ... | DOCUMENTED |
| Q5 | Which numbers are class B and which class N | New B18 code uses only `+ - * /`, `Math.sqrt`, `Math.abs`, `Math.min`, `Math.max` in propulsion, battery, endurance and fit, so it is ... | ESTIMATED |
| Q6 | `domain.patch` replaces arrays whole, so two buddies editing different motor slots overwrite each other (`DRONE_ARCHITECTURE.md` Objection 4 wanted patches, but `motors` is an array in a ... | T-B18-04 writes slot edits as one patch per edit with the whole `motors` array. The last write wins on a slot conflict. Escape: the host ... | HYPOTHESIS |
| Q7 | Where a datasheet fit and a price live on a descriptor | Top-level tool keys `x_fit` and `x_price` (the schema allows `x_*`). Shapes are fixed in T-B18-06b and T-B18-05b. They are not in the ... | DOCUMENTED |
| Q8 | F-217 is "flight traces and configuration comparison". Traces need the rigid model (B19) | B18 builds the **comparison of two builds' computed numbers** (R-173 side by side, T-B18-09f). Trace recording, plots and the ... | DOCUMENTED |
| Q9 | Roadmap T-B18-12 cites DA-20 for the optimiser; DA-20 is the game-model label (Objection 7). T-B18-11 cites DA-02 | DA-20 is proven by T-B18-11c. The optimiser has its own acceptance cases and no DA number | DOCUMENTED |
| Q10 | The optimiser needs prices; R-183 (catalogue prices) is B20 | The optimiser takes a `PriceTable` argument. T-B18-05b to 05d give each shipped part an `x_price` with `as_of` and `estimate: true`. No ... | DOCUMENTED |
| Q11 | The 13 existing crafts are `legacy-craft` projects (B13). They keep `legacy-calc` and `flight-game@1`. Only `kind: "multirotor"` projects use the parts calculator | A craft has exactly one thrust source. Replacing a part in a legacy craft flips the whole craft to `parts` with a visible message ... | DOCUMENTED |
| Q12 | Shipped part data: first set from "10 motors and 10 propellers with redistributable data" (council Q12) cannot be promised | T-B18-05b to 05d ship **generic** parts authored by iynk, every number an `assumption` in the three-slot rule, status `partly-modelled` ... | ESTIMATED |
| Q13 | The 20-prompt refusal set (DA-15) needs a model to answer | CI proves the structure: the set exists with at least 20 prompts, the partner system prompt and tool schema carry the rule, and no tool can ... | HYPOTHESIS |
| Q14 | `FEATURE_CATALOGUE.md` says F-216 EXTENDs `src/components/dronelab/DesignPanel.tsx`; B13 moves the drone lab into Studio | `DesignPanel.tsx` keeps serving the 13 legacy crafts until Amar retires the old page. The builder is new Studio components in ... | DOCUMENTED |
| Q15 | The error band. `DRONE_ARCHITECTURE.md` 6.3 says the band is the larger of the two RMS residuals; DA-05 requires the displayed band to cover the actual error at 90 percent of held-out ... | ESTIMATED |   |
| Q16 | Check result values. `DRONE_ARCHITECTURE.md` 8.1 allows `ok`, `warn`, `fail`; DB-C-13 is "an informational chip" | `BuildCheck.result` also allows `info`, used by DB-C-13 only. `short-flight` stays `warn` for DB-C-09 as the doc says (the legacy level was ... | DOCUMENTED |

### B19

Source: `B19-drone-rigid-flight.md`, section 2.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| Q1 | How does the rigid model fly inside the existing range (laps, gates, checkpoints, events, ghosts, crash replay, touch sticks, gamepad) without rewriting the 1,028-line `sim.ts`? ... | Keep `SimState` as the course and event layer. The rigid model is a **dynamics driver** that replaces only the body of `multirotorStep` ... | HYPOTHESIS (a test in T-B19-18 proves 96 flight tests and 342 golden rows stay green) |
| Q2 | Rate of stick input. DRONE 11.1 maps the rigid log at `step * (1e9 / step_hz)` ns. The range reads sticks once per animation frame and logs on 10 ms game steps | In the range the rigid driver runs `step_hz / 100` sub-steps per 10 ms game step with sticks held. Actions are logged on game steps, so `at ... | DOCUMENTED deviation, stated in `docs/DRONES.md` |
| Q3 | Yaw reaction torque sign | Physics wins: a CCW rotor pushes the body clockwise. T-B19-06 fixes it by a test (`reaction torque of CCW rotors is negative about +z`). ... | VERIFIED |
| Q4 | Trace storage. DRONE 5.2 and 11.2 say traces go to `assets` with role `trace`. The schema role enum has no `trace`, and traces are outside the state hash | Bytes go to the IndexedDB `assets` store by sha256 (B3), **not** into `doc.assets`, so the document and its hash are untouched. The list of ... | ASSUMED; Amar may prefer a schema minor adding role `trace` |
| Q5 | PID gain units. DRONE 5.4 says iynk units, not Betaflight's scale factors (council Q13, GPL) | `GAIN_SCALE` constants in `params.ts` start from an analytic loop-bandwidth derivation in T-B19-09 and are tuned in T-B19-15, where the ... | HYPOTHESIS |
| Q6 | Where is `FlightModel`, `EnvironmentState`, `InputEntry`? SIMULATION 11.2 and 12.1 give the types; earlier task files give `InputEntry`, `SimTime`, `Rng`, `StateHasher` | Import from the B3 modules. `FlightModel` is created in `src/sim/flight/model.ts` here, because B18 T-B18-02 did not create it. If ... | DOCUMENTED |
| Q7 | Math functions. `Math.sin, cos, atan2, exp` differ in the last bit across engines (A12). `Math.hypot` and `Math.pow` are also not specified to the bit | All flight code calls a facade `src/sim/flight/fmath.ts`. Until T-B19-28 it forwards to `Math` (class N). T-B19-28 switches the facade to ... | cos |
| Q8 | `Rng.gauss()` from B3 may use `Math.log` and `Math.cos` | Flight draws Gaussians with `fmath.gauss(rng)` (Box-Muller over `rng.float()`, two draws per sample) so it follows `dmath`. Flight never ... | HYPOTHESIS |
| Q9 | Sensor defaults have no source (DK-7) | Defaults are written as data with `source: 'iynk assumption'` and shown on the screen. Gyro 0.005 deg/s/sqrt(Hz), accelerometer 400 ... | HYPOTHESIS |
| Q10 | The rigid model on the 13 legacy crafts. DRONE ADR-0710: one thrust source per craft | `rigidParamsFromCalc` lets a `legacy-calc` craft fly rigid with `kT` from the calculator (DA-06 second clause). Default model for the 13 ... | DOCUMENTED |
| Q11 | RS-14 needs PX4 SIH, which is not installed, and a C++ toolchain | T-B19-05 builds PX4 SIH under a time box of 1 working day. If it cannot, its report says `NOT RUN` with the exact failing command, T-B19-21 ... | ASSUMED |
| Q12 | Roadmap B19 lists 14 tasks. The 5-file rule and the F-071, F-072, F-156, R-193, R-194 scope need more | 31 tasks here (section 3 maps each to its roadmap row). Effort stays 13 / 16 / 22 weeks (DRONE section 16: D3 to D7 is 13 to 18 weeks) | ESTIMATED |
| Q13 | The roadmap scope line omits F-217 though R-175 and DRONE D4 need it | F-217 is built here. The orchestrator adds it to the scope line when Amar accepts this file | DOCUMENTED |
| Q14 | Where trace and compare results are kept in the project. DRONE 8.2 writes bench results to `tests` | Bench-flight results are not stored in the document in B19. They are recomputed on demand and shown with the document hash they ran ... | ASSUMED |

### B20

Source: `B20-export-physical-build.md`, section 2 and 10.

| Id | Question | Default or how it closes | Label |
|---|---|---|---|
| Q1 | ADR-0825 and COMMUNITY 8.2 put build inputs (budget, typed prices, `have`, `skip`, chosen parts, measurements) in `ext["iynk.build"]`. No op writes the root `ext` (64 ops, VERIFIED), so the ... | Store the same `BuildInputs` JSON as one project asset, path `build/inputs.json`, role `other`, media type `application/json`, written by a ... | HYPOTHESIS |
| Q2 | No op writes `exports[]` either (64 ops, VERIFIED) | The writer is `ProjectSession.recordExport(r: ExportRecord): void`, given by T-B5-08 (B5 lines 177 and 308; T-B5-19 calls it). Build tasks ... | DOCUMENTED |
| Q3 | IndexedDB store for price checks: COMMUNITY 8.7 names `priceChecks`; the 19-store list (B3-02) and the `parts` store added by T-B11-13 have none; other stores use snake case | Add store `price_checks` (key `queryHash:region`, value `{listings, fetchedAt, searches}`) in one database version bump (T-B20-07). It is ... | DOCUMENTED |
| Q4 | The roadmap says "Web Serial flashing for supported boards". RS-04, RS-05, RS-17 never ran; iynk produces no flashable binary by itself (COMMUNITY 8.9). A browser flash needs a hex from ... | Flash only an AVR hex that is already a project asset (role `binary`, imported by T-B9-26 or returned by the compile service T-B9-15). ... | HYPOTHESIS |
| Q5 | The twin mirrors pins with StandardFirmata on the board. A board running the person's own sketch is not a Firmata board. "Measured traces" therefore come from two sources: Firmata pin ... | `TraceSource = 'firmata-pins' \ | 'serial-text'`. Both feed `compareTraces`. The panel says which source a trace has. No claim that the twin runs the person's code |
| Q6 | The twin code imports the Board lab store (`twin.ts:8`, `sim.ts:9-10`, `HardwareTwinPanel.tsx:14`). B13 does not delete that store: it deletes the robotics and dronelab stores only, and ... | T-B20-14 writes `studio-sim.ts` (a `TwinSim` over `SimHost` frames) beside `sim.ts`. `twin.ts` and `HardwareTwinPanel.tsx` stop importing ... | HYPOTHESIS |
| Q7 | Substitutes are "reviewable `component.swap` proposals". The proposal types, diff card and one-undo accept live in B15 (AI) | T-B20-23 builds a schema `Proposal` (no `author.model`) and hands it to the B15 accept path. If B15 is cut at an earlier stop, T-B20-01 ... | DOCUMENTED |
| Q8 | PDF export of the schematic and wiring diagram (R-186). No PDF library is in `package.json` | SVG is generated by iynk. PDF is the browser's "Save as PDF" through a print stylesheet that shows one SVG per page (no dependency). Label ... | HYPOTHESIS |
| Q9 | F-211 and R-187 say "pick one netlist format"; roadmap T-B20-10 says "Wokwi-style or KiCad-style". Formats and licences are UNKNOWN | Spike T-B20-03 decides. Default if it passes: KiCad `.net` export and import, nothing else. Wokwi `diagram.json` import (T-B20-17) is built ... | HYPOTHESIS |
| Q10 | Catalogue prices exist for the drone designs only (`src/content/drones/*.ts` `price` fields). The converted drone projects (B13, B18) are components; the map from old line key to descriptor ... | `catalogue-prices.ts` is keyed by descriptor `identity.legacy_ids` plus a `match` on parameters. CM-63 pins the quad5 total at 34600 minor ... | HYPOTHESIS |
| Q11 | Roadmap rows are 15; this plan has 42. The 5-file rule, the split of BOM, guide, prices, flashing and UI, and two spikes need more rows. Ids T-B20-01 to T-B20-42 replace the roadmap ids ... | Effort ESTIMATED 7 / 10 / 15 weeks against the roadmap's 6 / 9 / 13. The orchestrator updates roadmap section 1 when Amar accepts this file | ESTIMATED |
| Q12 | A BOM or guide for a project with a `hazard:mains` part is refused (R-192). Which parts carry the tag is content | T-B20-04 ships the tag list and the refusal. Tagging the shipped descriptors is a data edit to B11's files, which this phase must not widen ... | HYPOTHESIS |
| OQ1 | Where do build inputs live, given no op writes the root `ext` (Q1)? | A project asset `build/inputs.json` |   |
| OQ2 | Which descriptor parameters split a BOM row? | `variant` parameters, and the `ohm`, `F`, `H` setting of passives (T-B20-10). The schema has no purchase marker |   |
| OQ3 | Which price shows when a typed, a catalogue and a live price all exist? | COMMUNITY's order: typed, catalogue; the live listing is shown beside it as "lowest listing found" and is not added to the total unless the ... |   |
| OQ4 | Substitutes use B15's proposal review. B15 is not in B20's roadmap dependencies | Use it. If B15 is cut, fall back to a plain preview dialog |   |
| OQ5 | Numeric defaults that are PROPOSAL: tolerance 5 percent, price cache 6 hours, history 90 days, default 12 rows and cap 24, substitute margin 20 percent, supply caution at 50 and 80 percent ... | Keep |   |
| OQ6 | PDF is made by the browser's print, not by iynk (Q8) | Keep; no PDF library |   |
| OQ7 | Recipe text is English only | Show an "English only" chip in other languages |   |

Total open items listed: 240.

### 7.1 Questions that need Amar early

These change a build path, not just a default. Each has a default, so an agent can proceed, but an answer before the phase starts avoids rework (HYPOTHESIS: ranked by what the default would cost to reverse).

| Phase | Id | Why early |
|---|---|---|
| B0 | Q4 (section 6) | The default deletes the Postgres layer that PRD R-004 kept "unrouted". Reversing means restoring code from history. |
| B1 | Q12 | The default exit code of `provenance:check` departs from the PRD wording. |
| B1 | Q3 | Figure pages keep `unsafe-inline` scripts under their own policy, which R-006 forbids for scripts. |
| B5 | item 6 | If "netlist inspect only" for Verilog boards means the Inspect view must exist in B5, T-B9-09 moves forward. |
| B7 | Q1 | Whether two people may type in code at once; the default is baton only. |
| B12 | Q1 | The gate says 102 of 102 but the card scope is 71 board lessons. |
| B13 | item 10 | The lab pages have no Partner tab between T-B13-24 and B14/B20 unless one more task is added. |

## 8. Self-check

| Check | Result |
|---|---|
| Every `### T-Bn-nn` or `### S-Bn-nn` card in the 21 files appears in a table above | VERIFIED by script: card ids minus index ids is empty for every phase; B11 has three index ids with no card (see 2.1) |
| Every row has a group | VERIFIED: no row shows `?` |
| Every dependency that names a task of the same phase exists | VERIFIED by script: no unknown id (the B15 hits were bare numbers that belonged to B14 and were ignored) |
| No task file was changed | The generator opened the 21 files read-only and wrote only this file (the folder is untracked, so `git status` cannot show it; DOCUMENTED, not diffed) |
| No em dashes | VERIFIED: `grep -c` for the em dash character returns 0 |
