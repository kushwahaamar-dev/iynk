# B3 task packages: Project core, storage, runtime, replay

Written 2026-10-27 for the build plan step. Plan only: no file in `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed, and nothing was committed. Refreshed 2026-10-28 against `build/v1` at `20cca05` (B0, B1 and B2 are built, and the B1 and B2 notes are folded in); the last section, "Refresh 2026-10-28", lists every change. Task ids, groups and the task count (27 tasks and 3 spikes) are unchanged, and no task is already done.
Phase: B3 of `../IMPLEMENTATION_ROADMAP.md` section 5 (rows T-B3-01 to T-B3-21). Depends on: B2 (and so on B0 and B1).
Labels: VERIFIED (read in code or a file in this step), DOCUMENTED (a plan file says it), EXTERNAL (outside fact, not checked here), ESTIMATED, HYPOTHESIS, UNKNOWN.

## 1. What this file is

This file turns the B3 phase card into tasks one agent can finish in one sitting. It follows BRIEF section 27 (identity, intent, implementation, verification, delivery). It keeps the roadmap ids T-B3-01 to T-B3-21 for the same subject and adds T-B3-22 to T-B3-27 and three spike tasks (T-B3-S1 to T-B3-S3). The roadmap row count (21) becomes 27 build tasks and 3 spikes. Section 3 lists every place this file departs from the roadmap row and why.

Scope (from the task): F-038, F-041, F-044, F-045, F-047 (digital slice), F-087, F-092, F-094, F-200, F-201, F-203; R-035 to R-049 and R-052 (the headless core test harness: T-B3-24 supplies the Node walk, T-B3-10 and T-B3-19 the determinism checks). Not in scope: the editor, analog on the live path (B8), real firmware engines, buses, any server or room code, any AI code.

Exit gate (roadmap B3): `CHECK` (`KL npm run check`, section 1.3) green; SA-01, SA-02, SA-06, SA-10, FA-07, FA-08, FA-09 recorded; headless M1 steps 1, 2, 6, 7, 8 pass (R-052); AR-17 passes. Then Amar's OK. Section 10 maps each exit item to the task that proves it.

### 1.1 Sources read for this file

| Source | What I took from it |
|---|---|
| `../IMPLEMENTATION_ROADMAP.md` sections 2, 3, B2 card, B3 card and rows | Conventions, shorthand (`TL`, `V`, `E`, `KL`, `BUILD`), the 21 rows, the B2 task ids this phase builds on |
| `../../04_ARCHITECTURE/RECONCILIATION.md` | RC-09 (19 stores), RC-11 (autosave), RC-31 (what the hash covers), RC-32, RC-36, RC-54 (replay keys), RC-58 (kill rule) |
| `../../03_PRODUCT/PRODUCT_REQUIREMENTS.md` R-035 to R-049, BUD rows | Acceptance text for each requirement |
| `../../04_ARCHITECTURE/` SIMULATION 5, 6, 7, 8, 13.4, 17, 18, 19; SYSTEM 5, 6.9, 8; FRONTEND 8; PROJECT_DATA_MODEL 12, 13; ADR-0014, 0106, 0401, 0406; `schemas/project.schema.json`, `schemas/component.schema.json`, the examples | Field names, signatures, limits, criteria SA-01..SA-12, FA-07..FA-09, AR-01..AR-17 |
| `../../08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/` (REPORT, `src/`, `data/scan.json`) | The 20 circuits, the two-line patch that exposes raw solver output, the 79-circuit scan |
| The code | `src/lib/interp/*`, `figures/engine/bench-solve.js`, `figures/engine/testkit.mjs`, `playwright.config.ts`, `vitest.config.mts`, `eslint.config.mjs`, `next.config.ts`, `src/i18n/*`, `src/app/[lang]/about/page.tsx`, Next 16.4.3 docs `lazy-loading.md`, `progressive-web-apps.md` |

### 1.2 Starting point (VERIFIED in this step)

On 2026-10-28 `build/v1` is at `20cca05`. B0, B1 and B2 are built (B2 gate green: 4395 unit tests, 145 e2e, corpus of 38 items and 140 projects). `src/core`, `src/project`, `src/parts`, `tsconfig.portable.json`, `src/architecture.test.ts` and `src/lib/keys` exist. `src/protocol`, `src/local`, `src/sim`, `src/sim-host` and `src/export` do not exist yet, so B3 creates them. The names in the table were read from the real files on 2026-10-28 (VERIFIED), and the table says where a name differs from the B2 plan. Rule for the agent that builds a task: read the real export before you use it; if a name differs from this file, use the real name and say so in the commit body; if a needed capability is missing, stop and report, and do not invent it in a B3 file. Two facts that bite: `src/core/index.ts` is still `export {};` (import by file, for example `../core/prng.ts`), and there is no `src/project/index.ts` or `src/parts/index.ts` either.

| B2 or B1 contract I rely on | Real name and path (VERIFIED 2026-10-28) | Used by |
|---|---|---|
| Document, op and envelope types | `Project`, `Op`, `OpEnvelope`, `Net`, `PinRef`, `ReplayLog`, `FileEnvelope`, ... in `src/project/generated/types.ts`; validators `validateProject`, `validateOp`, `validateOpEnvelope`, `validateReplayLog`, `validateFileEnvelope`, ... in `src/project/generated/validate.mjs`, typed by `validate.d.mts` (T-B2-04). | 03, 05, 06, 15, 19 |
| `Result`, `Failure`, `Diagnostic { code, severity, path, message, hint? }`, `ok`, `fail` | `src/core/result.ts` (T-B2-02) | all |
| `Clock = () => number` and `RandomSource { bytes(n) }`; `newId(prefix)`, `newProjectId` | `src/core/ids.ts` (T-B2-02) | 06, 07, 24 |
| `msToNs`, `LIMITS` | `src/core/units.ts`, `limits.ts` (T-B2-02) | 05, 11, 12 |
| `canonicalize`, `prettyPrint`, `utf8Encode`, `utf8Length`, `parseStrict(text, { maxBytes?, maxDepth? }): Result<unknown, Failure>`, `sha256Hex`, `sha256Bytes`, `rng(seed, stream)`, `rngState`, `rngFrom`, `splitmix32`, `fnv1a32` | `src/core/canonical.ts`, `strict-json.ts`, `sha256.ts`, `prng.ts` (T-B2-03) | 05, 10, 19 |
| `stateHash(doc)` (hash of the canonical content without `history`, `exports`, `revision` and `meta.updatedAt`), `canonicalBytes`, `chainStart`, `chainNext`, `foldChain`, `checkpointOf`; `normalizeForWrite`, `toCanonicalText`, `toFileText`; `migrate(input, { at, app })` returning `current`, `migrated`, `newer` or `invalid`; `CURRENT_SCHEMA_VERSION = "1.1"` | `src/project/hash.ts`, `normalize.ts`, `migrate.ts` (T-B2-09) | 03, 05, 06, 15, 19 |
| `validateValue(value)`, `validateText(text)`, `isFatal`, `ValidationReport { ok, errors, warnings, diagnostics, first20, doc? }` | `src/project/validate.ts` (T-B2-08) | 03, 05, 06 |
| `applyBatch(state, ops, ctx)`, `ApplyContext { author, at, invariants? }`, `ApplyOutcome` | `src/project/apply/index.ts` (T-B2-05). FA-01: only `src/project/session.ts` may import `apply/` (`src/architecture.test.ts` fails any other importer outside tests, `*.testing.ts`, `src/project/testing/` and `server/`), so every B3 file outside `src/project` changes a document only through `createSession`. A direct `applyBatch` also skips the batch invariants that the session passes (`checkBatch`) | 03 |
| `createSession(opts)`, `SessionOptions { state, clock, rnd, maxUndo?, onCompact?({ revision, state, stateHash }) }`, `ProjectSession { state, revision, chain, apply(op or ops, author), undo, redo, canUndo, canRedo, subscribe(fn: (c: DocChange) => void), replace(state), compact() }`, `DocChange { from, to, ops: Op[], touched, origin }`, `createLocalAuthority` | `src/project/session.ts`, `touched.ts`, `authority.ts` (T-B2-10). `DocChange.ops` are the ops, not the envelopes: the envelopes (`seq`, `opId`, `at`) are in `session.state.history.ops` | 03, 04, 24 |
| `netlist(doc): Netlist { version: 1, nodes: NetlistNode { id, nets, names, pins }[], pinNode: Record<'<c>/<p>', nodeId>, diagnostics }`, `nodeOfPin`, `pinSets` | `src/project/netlist.ts` (T-B2-13) | 15 |
| `createRegistry()`, `PartRegistry.get(ref, version)`, `Descriptor`, `interfaceOf`; the seven first descriptors and `builtin.ts` | `src/parts/registry.ts`, `pins.ts`, `data/`, `builtin.ts`, `browser/load.ts` (T-B2-11, T-B2-12) | 15, 21, 23 |
| Converter and corpus | `convertAll` in `src/project/convert/index.ts`, `npm run corpus` into `.corpus/` (not committed), manifest `src/project/convert/corpus.manifest.json` (T-B2-20, T-B2-21) | 19, 24 |
| The headless harness (`newProject`, `session`, `seededRandom`, `steppingClock`, `ownerOf`, `saveText`, `openText`, `hashOf`, `batchesOf`, `replayFrom`) and the seeded generators (`generateSession(seed, steps)`, `generateOp`, `startProject`, `bigProject(parts, wires, seed)`) | `src/project/testing/harness.ts` and `generators.ts`, with `src/project/roundtrip.test.ts`, `replay.test.ts` and `apply-cost.test.ts` beside them (T-B2-16). Test support, exempt from the import rules; production code never imports it | 05, 19, 23, 24 |
| `tsconfig.portable.json`, `src/architecture.test.ts`, the `package.json` `imports` map, the portable ESLint block | T-B2-01. The tsconfig `include` already lists `src/core`, `src/protocol`, `src/project`, `src/parts`, `src/sim`, `src/export` and `server`. The `imports` map has `#core/*`, `#protocol/*`, `#project/*` only (B3 files use relative `.ts` imports). `ALLOWED` holds the seven enforced rows only (`core`, `protocol`, `project`, `parts`, `sim`, `export`, `server`); `sim-host`, `local`, `studio`, `ai`, `collab`, `server-client`, `content`, `ui` and `labs` have no row, so B3 needs no matrix edit (section 3.1). A test under a portable folder must start with `// @vitest-environment node`, and a relative import in a portable folder must end in `.ts`, `.mjs` or `.json` | every portable task |
| Generated types `ReplayLog`, `WorldInput`, `PinRef`, `Project` (names are the `$defs` keys); `Project['dependencies']['components'][n].interface.role` | `src/project/generated/types.ts` (T-B2-04; B2 line 453 lists `ReplayLog` among the generated names) | 15, 19 |
| `interfaceOf(d).role` (`board`, `part`, `surface`) | `src/parts/pins.ts` (T-B2-11) | 15 |
| `KEYS_STORAGE_KEY = "iynk:keys:v1"`, `KeyKind = "ai" \| "search" \| "server"`, `setKey(kind, secret, label?)`, `removeKey`, `removeAllKeys`, `getMasked`, `readSecret`, `subscribeKeys`, `useKeys`, `redact`; stored document `KeysDoc { v: 1; ai: { key, label? } \| null; search: { key } \| null; server: { token } \| null }` | `src/lib/keys/store.ts`, `index.ts` (T-B1-01). `readSecret` is imported only by `headers.ts`, which `boundary.test.ts` holds | 07, 08 |

B2 expects two things from B3 that the roadmap rows do not name: it says "B3 supplies `onCompact`" (T-B2-10; handled in T-B3-03 and T-B3-22 through the `revisions` store) and it says the SVG sanitiser for `V5-SVG` "comes with asset import (B3)" (OQ-10 and OQ-8 of the B2 file; handled in PD-14).

### 1.3 Shorthand used in the task tables

| Name | Meaning |
|---|---|
| `TL` | `npm run typecheck && npm run lint` |
| `PT` | `npx tsc -p tsconfig.portable.json` (exists after T-B2-01) |
| `V <path>` | `npx vitest run <path>` (`vitest.config.mts:12` includes `src/**/*.test.{ts,tsx}`, `figures/**/*.test.{js,mjs,ts}` and `scripts/**/*.test.{js,mjs,ts}`; the default environment is jsdom, `testTimeout` is 60,000 at `:16`) |
| `KL` | The keyless prefix: `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_REALTIME_URL= IYNK_SERVER_TOKEN= IYNK_AI_ENABLE= IYNK_SEARCH_ENABLE= NEXT_DIST_DIR=.next-b3` (the variables that can switch a real service on, as in `scripts/ci-local.sh` and `playwright.config.ts` `BLANK`, plus the build folder; the 2026-10-27 list of Solana, Vultr and database names is gone). Defined once here. A command that builds or serves the app never runs without it. A build with `NEXT_DIST_DIR` adds that folder's types to `tsconfig.json`: run `git checkout tsconfig.json` before every commit |
| `E <spec>` | `KL npx playwright test <spec>` |
| `BUILD` | `KL npm run build` |
| `CHECK` | `KL npm run check`. `package.json:36` shows that `check` ends in `npm run e2e`, which builds and serves the app (on a random port from 40000 to 49999 that never is 3000 or 43117; a server you start yourself uses 47000 to 47999), so a bare `npm run check` is not allowed in any Verify row |
| `V` on `figures/` | `V figures/engine/bench-solve.test.mjs` is the only form. `vitest.config.mts:12` includes `figures/**/*.test.{js,mjs,ts}` and the file imports `vitest`, so `node figures/engine/bench-solve.test.mjs` does not run |
| Size S / M / L | ESTIMATED effort for one agent: S under half a day, M about one day, L about two days |

All unit tests that touch the clock inject it. No test waits on a wall-clock poll (roadmap 2.5). A test whose service is missing fails and names the service when `CI=true`.

## 2. Task index

| Id | Title | Size | Group | Depends on | Source files |
|---|---|---|---|---|---|
| T-B3-S1 | Spike: zip approach for `.iynkz` | S | G1 | none | 0 (report only) |
| T-B3-S2 | Spike: IndexedDB write from a worker at `pagehide`; file handle in a worker | S | G1 | none | 0 |
| T-B3-S3 | Spike: service worker precache source and offline reload | M | G1 | none | 0 |
| T-B3-01 | `src/protocol` RPC envelope and ports | S | G1 | B2 | 4 |
| T-B3-02 | Database `iynk`, the 19 stores, `Repository` interface | M | G1 | B2 | 4 |
| T-B3-10 | `src/sim/core`: ns clock, state hash, `SimDiagnostic`; SA-11 lint | S | G1 | B2 | 4 |
| T-B3-14 | Interpreter allocation caps (SA-10 probes) | M | G1 | none | 4 |
| T-B3-16 | Solver I: types, graph, `linsolve` | S | G1 | B2 | 3 |
| T-B3-20 | Diagnosis record and the 45 cause ids | S | G1 | B2 | 2 |
| T-B3-22 | IndexedDB and memory `Repository` implementations | M | G2 | 02 | 2 |
| T-B3-11 | Engine interface and digital orchestrator core | L | G2 | 10 | 5 |
| T-B3-17 | Solver II: stamps, `pwl` iteration, convergence | M | G2 | 16 | 2 |
| T-B3-05 | `.iynk` and `.iynkz` read and write; file I/O | M | G2 | S1, B2 | 4 (5 with `fflate`) |
| T-B3-03 | `ProjectWorker`, handler, host, shadow copy | L | G3 | 01, 22 | 5 |
| T-B3-06 | Library, blank project, fork, sample project | M | G3 | 22 | 5 |
| T-B3-07 | Provider keys move into the `keys` store | M | G3 | 22, B1 | 3 |
| T-B3-08 | Local data export and wipe (worker and main-thread halves) | S | G3 | 22, 05, 10 | 2 |
| T-B3-12 | Interpreters as `McuEngine` | M | G3 | 11 | 1 |
| T-B3-18 | Solver equivalence to the old solver (SA-02) | L | G3 | 17 | 4 |
| T-B3-04 | Autosave, crash journal, storage health, tab sync | M | G4 | 03, S2 | 4 |
| T-B3-13 | `SimHost`, `SimWorker` and the sim protocol (SA-01) | L | G4 | 01, 11, 12 | 4 |
| T-B3-15 | Netlist to `SimNetlist`, digital nets, world pins, binding | L | G4 | 11, 12 | 5 |
| T-B3-19 | Deterministic run and replay (SA-06) | M | G5 | 10, 11, 12, 15 | 3 |
| T-B3-26 | Watchdog and kill (SA-10, FA-07, AR-15) | M | G5 | 13, 14 | 2 |
| T-B3-27 | Wire library, files, wipe and storage into the worker API | M | G5 | 03, 04, 05, 06, 08 | 3 |
| T-B3-21 | Bare `/[lang]/studio` list page | M | G6 | 27, 07 | 5 |
| T-B3-09 | Service worker and offline shell (FA-09 part) | M | G7 | 21, S3 | 5 |
| T-B3-23 | Diagnostics panel: run, kill, replay, save speed | M | G7 | 06, 13, 15, 19, 21, 26, 27 | 4 |
| T-B3-24 | Headless acceptance walk, WebKit, FA-08, AR-17 | L | G8 | 09, 23 | 1 |
| T-B3-25 | Exit record and documentation | S | G9 | all | 4 (docs) |

27 build tasks and 3 spikes. Counting sources: "Source files" counts source files the task creates or edits under the roadmap 2.2 rule (tests 0, the six language copies of one namespace 1, `package.json` with its lockfile 1).

## 3. Departures from the roadmap rows, and decisions that need an owner

These are the places where reading the code and the architecture files made me change a roadmap row. Each has a default, so the build does not wait. The last column says who may overrule.

| Id | Roadmap said | This file does | Why | Overrule |
|---|---|---|---|---|
| PD-1 | `src/sim/mcu/arduino.ts`, `python.ts`, `verilog.ts` wrap `src/lib/interp` | One adapter, `src/sim-host/engines/interp-engine.ts`, over `createRun` (VERIFIED: `src/lib/interp/run.ts:98` serves all three languages) | `src/sim` is checked by `tsconfig.portable.json` (ADR-0014 decision 2: relative `.ts` imports, no parameter properties). `src/lib/interp` has extensionless imports and parameter properties (`python/runtime.ts:21` `constructor(public data: number[])`, `run.ts:131` `constructor(private opts: RunOptions)`) and SYSTEM 5.3 lets `sim` import only `core`, `project` and `parts`. A wrapper in `src/sim` would fail AR-03. The interpreters move into `src/sim` only when the labs move (SYSTEM 5.2 "labs (legacy) shrinks every phase") | Amar, if he prefers a codemod over `src/lib/interp` (about 45 files) now; it is not planned here |
| PD-2 | (not stated) | No import-matrix edit. On 2026-10-27 this row planned one edit of `src/architecture.test.ts` and the ESLint zones in T-B3-10 (six cells). The real test (T-B2-01) enforces only seven rows (`core`, `protocol`, `project`, `parts`, `sim`, `export`, `server`); `sim-host`, `local`, `studio`, `ui`, `labs` and the rest have no row, so no import of theirs can fail it. The cells M-1 to M-4 are therefore not needed, and the structure `PATH_EXCEPTIONS` is not built (section 3.1). What still holds: a file in `src/sim` or `src/export` imports only `core`, `project`, `parts` (no `protocol`, no `src/lib`) | The planned B3 imports of 03, 08, 12, 13, 23 and 27 came out of `sim-host`, `local` and `ui`, which are unconstrained, and `src/sim` and `src/export` files use only `core`, `project` and `parts` | Architecture owner, if the `sim-host` and `local` rows of SYSTEM 5.3 are to be enforced later (each as a RECONCILIATION text row, section 3.1) |
| PD-3 | T-B3-09 includes `src/sim-host/engines/loader.ts` and the engine manifest | Dropped from B3. B9 adds it with the first engine | No engine file exists before B9 (avr8js). A loader with no engine is code for an imagined case. The service worker reserves the cache name `iynk-engines-v1` and leaves it empty | Orchestrator |
| PD-4 | T-B3-04 edits `src/project/session.ts` | No edit | `ProjectSession.subscribe` already exists (SYSTEM 6.9), so autosave listens to it. This keeps a B2 file untouched | none needed |
| PD-5 | "Two-slot write" | Realised as two records per project in one IndexedDB transaction: `projects[id]` and `projects[id + "~prev"]` | IndexedDB transactions are atomic (EXTERNAL, IndexedDB specification), so the second slot is not for a torn write. It covers a record that fails its hash check on open (F-200 "recovery from a corrupt record") and gives "last good copy" a place (R-035). PROPOSAL | Architecture owner |
| PD-6 | `ReplayRecord` (SIMULATION 6.7) | Runtime type `ReplayRecord` as in SIMULATION 6.7 with a mapping to the schema's `ReplayLog` (`project.schema.json` `$defs/ReplayLog`, format `iynk.replay`) | The two disagree: `ReplayLog.engines` values have `maxLength: 40`, while `versions.rapier` and `versions.avr8js` carry a sha256 and are longer; `ReplayLog.events.kind` is `input, press, fault, edit, power, reset` while `InputEntry.kind` is `pin, analog, serial, param, fault, control`; `ReplayLog` has no `settings`, `endsAt` or summary hashes, and its `checkpoints[].hash` is 64 hex while the state hash is 16 hex (`$defs/Sha256`). RC-54 only fixed key names. B3 runs interpreters only, so version strings are short and the mapping is lossless for inputs and checkpoints (the 16 hex digits are left-padded with 48 zeros) and lossy for `settings`, `endsAt` and the two summary hashes (T-B3-19 field map). The conflict is open for B8 | Schema owner (RECONCILIATION) |
| PD-7 | T-B3-18 "converter corpus" | Corpus = the 79 lesson circuits in the repo plus the 20 RS-08 circuits = 99 (SIMULATION 7.3 G-T1; `data/scan.json` has 79 rows, VERIFIED). The old solver's results are a golden file generated once from the frozen `bench-solve.js` | The old solver only runs inside a figure page in jsdom (`figures/engine/testkit.mjs` builds it with `python3 -I figures/tools/cfbuild.py`). A golden file keeps the unit test fast and offline. The element lists that the old `netlist()` built are stored too, so SA-02 tests the solve and not the descriptor mapping (that is B8, SA-03) | Amar, if fewer than 99 circuits can be golden-tested |
| PD-8 | "pin levels and PWM duty reach part states through the netlist" | Rule DP-1 (section 6.1): a two-pin resistor is transparent for logic level and a resistor to a rail is a weak pull; every part state it makes is labelled `approximation`, tier `T0` | SIMULATION 5.3 says a net with a resistor to a pin is analog. R-045 asks for the Blink circuit (pin, 220 ohm, LED) to run on the digital slice with no solver. DP-1 is the smallest rule that does this, and B8 replaces it | Amar (R-045 is a HYPOTHESIS) |
| PD-9 | T-B3-21 also holds the walk, WebKit and the page | Split into T-B3-21 (list page), T-B3-23 (diagnostics panel) and T-B3-24 (walk, WebKit, FA-08) | One task would touch 8 source files. The browser tests for FA-07, FA-08 and SA-10 need a driver; a `window` debug hook is a code smell, so a small "Diagnostics" section on the bare page is the driver. B4 moves or deletes it | Orchestrator |
| PD-10 | SA-01 "equal in worker and in-thread" | Two legs. Leg A, vitest: 102 of 102 jobs through `createInlinePort` with `structuredClone` on every message, equal to a direct `runChecks`. Leg B, Playwright: 5 sampled lessons through a real `Worker` | A full 102 runs in a browser Worker is 28 to 61 s (SIMULATION 17.1) and needs a page driver. Leg A covers the protocol; leg B covers the real thread boundary | Orchestrator |
| PD-11 | `fake-indexeddb` as a devDependency (T-B3-02) | Same, see "For Amar" item 1 | New dependency | Amar |
| PD-12 | Interpreter clock converted to integer ns | The interpreters keep their `VirtualClock` in microsecond floats (`src/lib/interp/clock.ts:14`). The adapter converts at the edge with `Math.round(us * 1000)` and a helper `opNsOf(profile)` that returns the SIMULATION 5.4 table (Uno 1000, R4 400, ESP32 100, NodeMCU 250, Nucleo 250, Pico 4000, micro:bit 6000, Pi 50, FPGA 0) | Changing the clock inside `src/lib/interp` would touch every file there. IEEE addition and multiplication are exactly specified, so the same float sequence gives the same ns in Chromium and WebKit (EXTERNAL) | Orchestrator |
| PD-17 | Roadmap T-B3-14 edits `src/lib/interp/exec.ts` and `run.ts` for the limits | T-B3-14 edits the allocation sites (`python/runtime.ts`, `python/modules.ts`, `arduino/interp.ts`) and adds `limits.ts`. There is no `Run.cancel()` and no edit of `run.ts` or `exec.ts` in B3 (PD-22). B0 T-B0-25 (`359162e`) already capped Python `*` on str, list and tuple (`MAX_ELEMENTS` and `checkRepeat` in `python/runtime.ts`, raised as a catchable `MemoryError`), the Arduino array size (`MAX_ARRAY` in `arrayType`, raised as `InterpError('limit')`) and serial output (`SERIAL_CAP` in `run.ts`); T-B3-14 moves those two constants into `limits.ts` and adds the rest | The four SA-10 probes fail at the allocation sites, not in `exec.ts` (VERIFIED, section 11). Keeping the host kill in its own task keeps both under 5 files | none needed |
| PD-13 | (not stated) | The orchestrator advances interpreter engines in fixed 1 ms slices | `runHeadless` steps 1 ms at a time, and `Exec.idle` stops at the host step's `target` (`src/lib/interp/exec.ts:90-97`; step length changes where idle skipping stops). A fixed slice makes SA-01 and SA-06 hold by construction | none needed |
| PD-14 | (B2 OQ-10 says the SVG sanitiser arrives "with asset import (B3)"; no B3 row builds it) | `readIynkz` refuses `image/svg+xml` assets with the named error `svg-not-supported`; the asset MIME allow-list in B3 is png, jpeg, webp, plain text and octet-stream. The sanitiser and `V5-SVG` wait for the phase that adds asset import UI (B11 components) | An unsanitised SVG in a container is the only open path to script in a document (PDM 13). Refusing is safer than a rushed sanitiser in a phase that has no asset UI | Orchestrator, with Amar at the B3 stop |
| PD-15 | `src/sim/core/units.ts` and `rng.ts` | Not created. T-B3-10 imports `msToNs` and `rng` from `src/core` | T-B2-02 and T-B2-03 already ship them (`tasks/B2-core-document-netlist.md`); a second copy breaks "one source of truth" | none needed |
| PD-16 | Keys "move into the store" | Only the `ai` and `search` slots move. B1's `server` token slot stays in `localStorage["iynk:keys:v1"]` until B6 replaces it with the device key | SYSTEM 8.1 row 9 says `keys` holds AI and search provider keys only; the server bearer token has no store row until device identity exists (B6) | Orchestrator |
| PD-18 | `Engine`, `Orchestrator`, `McuEngine` as in SIMULATION 5.5, 5.6, 8.1, 17.2 and A.2 | Same signatures: `nextDue(): SimTime \| null`, `advanceTo(horizon, budget): { reached, stoppedEarly }`, `onEvent(e)`, `stateHash(): string`, `Orchestrator.load(net, opts)`, `step(unit, n)`, `inject(input: HostInput)`, `ros: 35` in `RANK`. B3 differs in six places: (1) `snapshot?()` and `restore?()` are optional on `Engine`, and `Orchestrator` has no `snapshot`/`restore`, until B8 (SIMULATION 6.7); (2) `Engine.attach(sink)` is added, because the spec gives engines no way to emit an event; (3) engines and the digital layer are passed to `createOrchestrator({ engines, digital })`, so `load(net, opts)` keeps the spec signature; (4) `StepUnit` is the spec union, but only `'ns'` and `'event'` run; `'cycle'`, `'line'`, `'statement'` return `{ reason: 'unsupported' }`; (5) `ProgramImage` has only the `source` arm and adds `entry` (the `hex` arm is B9); `LoadResult` has no `analog?` (B8); (6) the `SimReq` `load` message adds a numeric `run` id (R-041) and calls the options field `opts: SimRunOptions` (the spec's `run: RunOptions` field would collide with the id). `RunOptions` is renamed `SimRunOptions` in B3 files because `src/lib/interp/run.ts:17` already exports a different `RunOptions` | The names in SIMULATION are binding (task rules). The six differences are the smallest set that B3 needs; each is a proposed RECONCILIATION row (section 3.1) | Architecture owner |
| PD-19 | SYSTEM 8.1 row 9: `keys` rows are keyed by provider id with `{providerProfile, key, addedAt, lastUsedAt}` | B3 writes rows keyed `slot:ai` and `slot:search` with `providerProfile: null` and an extra `label?`. B14 reads by provider id and migrates the two slot rows when it adds the `ProviderProfile` (AI_ARCHITECTURE 9.1); the migration is B14's | B1 has no provider id: its `KeysDoc` has two slots (`ai`, `search`). Inventing a provider id in B3 would be a guess that B14 must undo anyway | Architecture owner (row 9 gains `label?` and the `slot:` key rule; section 3.1) |
| PD-20 | (not stated) | The sample project for Run sample, the ten-run check and the step 6 walk is `uno-blink-d12.project.json`, copied verbatim to `src/project/samples/uno-blink-d12.project.json` by T-B3-06. A test asserts the copy is byte-identical to the schema example, so the schema folder stays the one source. `blankProject` is used only by the library tests and the step 2 walk | `blankProject` has no components and no nets, so it has no ground net and no LED. `buildSimNetlist` reports `no-ground` for it and `load` rejects an unknown ground. The example has `net_gnd` (class `ground`), `cmp_led1`, `cmp_res1` and a sketch that writes D12 (VERIFIED, section 11) | Orchestrator |
| PD-21 | SIMULATION 8.8 lists a cap on dict keys | Not built in B3. `limits.ts` has no `MAX_DICT_KEYS` | None of the four SA-10 probes grows a dict, `PyDict.set` (`python/runtime.ts:31`) has no access to the meter, and an unused constant is dead code. A dict cap needs a `PyDict` constructor argument and is added when a probe needs it | Amar, if he wants the cap now |
| PD-22 | Roadmap T-B3-26: `Run.cancel()` plus a flag in `Exec.tick` | Dropped. Cancel in the handler is "stop pumping slices and ack". The hard stop is the host kill | A `cancel` message cannot be read while a synchronous step runs in a worker (no `SharedArrayBuffer`, SYSTEM 6.9 and 17.2), so the flag could never be seen in production. Between slices the handler can simply stop. The edit also put a read in the hot `tick` | Amar, if he wants `Run.cancel()` kept (then say who calls it from where) |

### 3.1 The import matrix: no edit is needed (refreshed 2026-10-28)

The matrix is SYSTEM 5.3. `src/architecture.test.ts` (T-B2-01) holds it as `ALLOWED: Record<EnforcedModule, ...>` for seven modules only: `core` (nothing), `protocol` (`core`), `project` (`core`), `parts` (`core`, and types only from `project`), `sim` and `export` (`core`, `project`, `parts`), `server` (`core`, `protocol`, `project`, `parts`, `sim`, `export`). Every other module (`sim-host`, `local`, `studio`, `ai`, `collab`, `server-client`, `content`, `ui`, `labs`) has no row and is not checked. The ESLint zones of `eslint.config.mjs` cover only the portable folders. So the six cells that the 2026-10-27 plan wanted opened do not exist as enforced cells, and T-B3-10 edits neither `src/architecture.test.ts` nor the zones. The design that those cells described still holds as a rule of thumb, and each remains a proposed text row for SYSTEM 5.3 / RECONCILIATION so that the day someone enforces the `sim-host` or `local` row, B3 code already obeys it.

| Id | Cell (row imports column) | Who needs it | Status on 2026-10-28 | Proposed RECONCILIATION row |
|---|---|---|---|---|
| M-1 | `sim-host` to `protocol` | T-B3-13 `host.ts` calls `createRpcPort` | Not enforced, nothing to do. SYSTEM 5.3 text says only `server`, `server-client`, `collab`, `local` import `protocol`; the text gains `sim-host` | RC-B3-1 |
| M-2 | `sim-host` to `sim` (values) | T-B3-13 `handler.ts` creates the orchestrator; T-B3-12 `interp-engine.ts` builds `StateHasher` and `SimTime` | Not enforced. SYSTEM 5.3 says "protocol types only" | RC-B3-2 |
| M-3 | `sim-host` to `labs`, folder `src/lib/interp/` only | T-B3-12 `interp-engine.ts` (`createRun`), T-B3-13 `handler.ts` (`runChecks`, `CheckJob`), T-B3-15 `bind.ts` (`WorldBinding`) | Not enforced; no `PATH_EXCEPTIONS` list is built. Keep the imports inside `src/lib/interp/` and note that they go away when the interpreters move into `src/sim` with the labs (B12, PD-1) | RC-B3-3 |
| M-4 | `local` to `export` | T-B3-08 `export-all.ts` calls `writeIynkz`; T-B3-27 `project-handler.ts` calls `readIynk`, `readIynkz`, `writeIynk` | Not enforced. `export` imports `core`, `project`, `parts` only, so no cycle | RC-B3-4 |
| M-5 | `UI` to `sim` | T-B3-23 builds a `SimNetlist` with `buildSimNetlist` | Design kept: T-B3-15 adds `src/sim-host/index.ts`, which re-exports `buildSimNetlist` and the `SimNetlist` type, and the page imports from `sim-host`. Not enforced either way | none |
| M-6 | `labs` (`src/lib/keys`) to `local` | T-B3-07 `hydrateKeys` needs a `KeysBackend` | Design kept: the `KeysBackend` interface and `KeyRow` type are defined in `src/lib/keys/store.ts`; `src/local/keys-backend.ts` returns an object of that shape without importing it; `ProjectList.tsx` (UI) calls `hydrateKeys(createKeysBackend(db))` | none |

More rows proposed for RECONCILIATION (the owner assigns the numbers; nobody edits `RECONCILIATION.md` in this step):

| Row | Topic | Decision |
|---|---|---|
| RC-B3-5 | `Engine`/`Orchestrator` interfaces | SIMULATION 5.5, 5.6, 17.2 and A.2 stand. The six B3 differences of PD-18 are recorded as a B3 subset, not a change of the spec |
| RC-B3-6 | `keys` store row shape | SYSTEM 8.1 row 9 gains `label?` and the rule "until B14, rows are keyed `slot:ai` and `slot:search` with `providerProfile: null`" (PD-19) |
| RC-B3-7 | `ReplayLog` against `ReplayRecord` | PD-6 gains a third conflict: `ReplayLog.checkpoints[].hash` is `Sha256` (`^[0-9a-f]{64}$`, `project.schema.json` `$defs/Sha256`) while SIMULATION 6.9 hashes are FNV-1a 64 (16 hex digits). B3 left-pads the 16 digits with 48 zeros in the log. B8 decides |
| RC-B3-8 | Name of the SIMULATION A.2 `Diagnostic` | `src/core/result.ts` already exports a different `Diagnostic { code, severity, path, message, hint? }` (T-B2-02). Sim code names the A.2 type `SimDiagnostic`; `SolveDiagnostic = SimDiagnostic`. B8 decides whether the two merge |

## 4. Parallel groups

Tasks in one group touch disjoint files, so separate agents can build them at once. Groups run in order. A task starts only when everything it depends on is in an earlier group.

| Group | Tasks | Why they are independent |
|---|---|---|
| G1 | T-B3-S1, S2, S3, T-B3-01, 02, 10, 14, 16, 20 | Spikes write reports only. 01 is `src/protocol`; 02 is the database layer and `package.json`; 10 is `src/sim/core` and `eslint.config.mjs`; 14 is inside `src/lib/interp`; 16 is `src/sim/analog` types; 20 is two small files |
| G2 | T-B3-22, 11, 17, 05 | Repository implementations; orchestrator core; solver stamps; export formats and file I/O |
| G3 | T-B3-03, 06, 07, 08, 12, 18 | Project worker and handler; library and sample; keys; wipe and export-all; interp adapter; solver equivalence |
| G4 | T-B3-04, 13, 15 | Autosave and journal; sim host and worker; netlist and digital nets |
| G5 | T-B3-19, 26, 27 | Replay; watchdog (two files); worker API wiring |
| G6 | T-B3-21 | List page |
| G7 | T-B3-09, 23 | Service worker; diagnostics panel |
| G8 | T-B3-24 | Acceptance walk |
| G9 | T-B3-25 | Exit record and docs |

Dependency note: T-B3-24 needs the whole chain 02, 22, 03, 27, 21, 23. The critical path is 02, 22, 03, 04 and 27, 21, 23, 24, 25 (nine groups). Everything on the simulation side (10, 11, 12, 15, 13, 19, 26) fits beside it.

## 5. File ownership

A file has one creating task. A later task that edits it is in a later group, so two tasks never edit one file in the same group. Test files are named in each task and belong to that task.

| File | Created by | Later edits (task, group) |
|---|---|---|
| `src/protocol/rpc.ts`, `errors.ts`, `version.ts`, `index.ts` | T-B3-01 | none |
| `src/local/db.ts`, `stores.ts`, `repository.ts` | T-B3-02 | none |
| `package.json`, `package-lock.json` | (B0 to B2) | T-B3-02 G1 (`fake-indexeddb`); T-B3-05 G2 (only if S1 picks `fflate`) |
| `src/local/idb-repository.ts`, `memory-repository.ts` | T-B3-22 | none |
| `src/local/project-protocol.ts`, `project-handler.ts`, `project.worker.ts`, `project-host.ts`, `shadow.ts` | T-B3-03 | T-B3-27 G5 (`project-handler.ts`, `project-protocol.ts`, `project-host.ts`; `project.worker.ts` only wires `self` to the handler and is not edited) |
| `src/local/autosave.ts`, `journal.ts`, `storage-health.ts`, `tab-sync.ts` | T-B3-04 | none |
| `src/export/zip.ts`, `iynk.ts`, `iynkz.ts`; `src/local/files.ts` | T-B3-05 | none |
| `src/local/library.ts`; `src/project/blank.ts`, `fork.ts`, `samples.ts`, `samples/uno-blink-d12.project.json` | T-B3-06 | none |
| `src/local/keys-backend.ts` | T-B3-07 | none |
| `src/lib/keys/store.ts`, `index.ts` | B1 | T-B3-07 G3 |
| `src/local/wipe.ts`, `export-all.ts` | T-B3-08 | none |
| `src/sim/core/clock.ts`, `hash.ts`, `diagnostic.ts` | T-B3-10 | none |
| `eslint.config.mjs` | (repo) | T-B3-10 G1 only (the SA-11 block) |
| `src/sim/engine.ts`, `orchestrator.ts`, `queue.ts`; `src/sim/digital/resolve.ts`, `pwm.ts` | T-B3-11 | none |
| `src/sim-host/engines/interp-engine.ts` | T-B3-12 | none |
| `src/sim-host/protocol.ts`, `handler.ts`, `host.ts`, `sim.worker.ts` | T-B3-13 | T-B3-26 G5 (`host.ts`) |
| `src/architecture.test.ts` | T-B2-01 | none (B3 needs no matrix edit, section 3.1) |
| `src/lib/interp/limits.ts` | T-B3-14 | none |
| `src/lib/interp/python/runtime.ts`, `python/modules.ts`, `arduino/interp.ts` | (repo) | T-B3-14 G1 |
| `src/sim/netlist.ts`, `src/sim/digital/nets.ts`, `src/sim/world-pins.ts`, `src/sim-host/engines/bind.ts`, `src/sim-host/index.ts` | T-B3-15 | none |
| `src/sim/analog/types.ts`, `graph.ts`, `linsolve.ts` | T-B3-16 | none |
| `src/sim/analog/solve.ts`, `elements.ts` | T-B3-17 | none |
| `scripts/gen-solver-golden.mjs`, `src/sim/analog/fixtures/legacy-golden.json`, `rs08-cases.ts`, `src/sim/analog/legacy-adapter.ts` | T-B3-18 | none |
| `src/sim/replay/record.ts`, `trace.ts`, `replay.ts` | T-B3-19 | none |
| `src/project/diagnosis.ts`, `src/sim/faults/cause-ids.ts` | T-B3-20 | none |
| `src/sim-host/watchdog.ts` | T-B3-26 | none |
| `src/app/[lang]/studio/page.tsx` | T-B3-21 | T-B3-09 G7 |
| `src/components/studio/StudioEntry.tsx`, `ProjectList.tsx` | T-B3-21 | T-B3-23 G7 (`StudioEntry.tsx`) |
| `src/i18n/namespaces.ts`, `src/i18n/messages/<lang>/studio.json` (6 files) | T-B3-21 | T-B3-23 G7 (the six `studio.json`) |
| `public/sw.js`, `src/local/sw-register.ts`, `src/components/studio/SwRegister.tsx` | T-B3-09 | none |
| `next.config.ts` | (repo) | T-B3-09 G7 |
| `src/components/studio/Diagnostics.tsx`, `diagnostics-run.ts` | T-B3-23 | none |
| `playwright.config.ts` | (repo) | T-B3-24 G8 |
| `docs/PROJECT_CORE.md` (B2), `docs/PROJECT_FILES.md`, `docs/DATA_HANDLING.md` (B1), `docs/MASTER_PLAN/05_ENGINEERING/results/B3.md` | (repo) / T-B3-25 | none. `docs/ARCHITECTURE.md` is git-ignored (`.gitignore:61`), so no task writes it; every `docs/ARCHITECTURE.md` entry in a Docs row below means `docs/PROJECT_CORE.md` |

G7 check: T-B3-09 edits `page.tsx`, `next.config.ts`, `sw.js`, `sw-register.ts`, `SwRegister.tsx`; T-B3-23 edits `Diagnostics.tsx`, `diagnostics-run.ts`, `StudioEntry.tsx` and the six `studio.json`. No overlap.

## 6. Rules shared by several tasks

### 6.1 Rule DP-1: the digital slice without a solver (T-B3-11, T-B3-15)

R-045 asks that pin levels and PWM duty reach part states with "the solver hook answering not modelled yet". The Blink circuit is pin, 220 ohm, LED, ground, so some rule must connect them. DP-1 is that rule. It is an approximation and every state it makes says so (`provenance: 'approximation'`, `tier: 'T0'`).

| Case | Rule |
|---|---|
| Net level | `resolve(drivers)` of SIMULATION 5.7: strong beats weak; two strong drivers that disagree give `X` and the diagnostic `output-contention`; no driver gives `Z` |
| Resistor | A two-pin part whose descriptor element is `res` passes logic level between its two nets (transparent) and, from a net to a power or ground net, is a weak driver of that rail's level. Its ohms are ignored |
| LED | Lit when its anode net reaches a high level and its cathode net reaches ground through transparent resistors only. Brightness is the PWM duty of the driving pin (1 for a steady high). Reversed LED: not lit, state `reverse` |
| Buzzer | On when its driving net toggles or holds high; frequency from the pin's `hz` (tone) |
| Button | Part input `pressed` drives the net it closes onto with a strong driver of the other side's level (to ground: low; to a rail: that level) |
| Pot, anything else with an analog element | State `{ kind: 'not-modelled' }` with the reason `needs the solver`; the part shows the mark (R-FID-1). The analog value comes from the world input as today |
| Anything unlisted | `not-modelled` |

### 6.2 Fixed slices

The orchestrator advances interpreter engines in slices of exactly 1,000,000 ns, cut short at the next input or queue time (SIMULATION 5.6 loop). Wall time never changes a slice (SIMULATION 6.1 invariant 6).

### 6.3 Boilerplate every task obeys (not repeated below)

| Item | Rule |
|---|---|
| Permissions | P0: no network, no cookies, no server. Workers get no `fetch`. Keys are never read except by T-B3-07 code. Nothing leaves the browser |
| API contracts, data model, state transitions | B3 has no network API. The contracts are the TypeScript interfaces in each task and the schema names they cite. A task shows a data model or state transitions when it has any; a task without those rows has none |
| Observability | Tests print nothing. Measured numbers go to `docs/MASTER_PLAN/05_ENGINEERING/results/B3.md` through T-B3-25; until then a task writes its numbers in its commit body |
| Rollback | `git revert` the task commit. A task that edits a shared file says so below |
| Commit | One commit, message `B3 T-B3-<nn>: <what>`, author Amar Kushwaha, no `Co-Authored-By`, no "Generated with" line. Never push |
| Edits | Before each edit, re-read the file (CLAUDE.md edit-integrity rule). After editing run `TL` |
| i18n | A copy change updates all six languages in the same commit |
| Portable folders | `src/protocol`, `src/sim`, `src/export` and `src/project` are portable (`tsconfig.portable.json`, the `eslint.config.mjs` portable block, `src/architecture.test.ts`). Their relative imports end in `.ts`; their tests start with `// @vitest-environment node`; they use no `Date.now`, `Math.random`, DOM name, `node:` import or `@/` alias (a test or `*.testing.ts` file is exempt from all but the docblock rule). A test that needs jsdom or a Worker lives outside them, in `src/local`, `src/sim-host` or `src/components` |
| FA-01 | Code outside `src/project` never imports `src/project/apply/`; it uses `createSession`. A file that imports the session must not assign to `state` or `revision` (`src/architecture.test.ts` checks both) |
| UI and copy | A task that adds anything a person sees (T-B3-21, T-B3-09's register component, T-B3-23) first reads `/Users/amar/iynk-build/state/UI_RULES.md` and the two design skills it names. It builds on `src/components/ui` (Button, Panel, Callout, Dialog, Sheet, Field, Chip, Meter, Stat, VisuallyHidden, SkipLink), not on hand-written controls, because BU restyles that kit before B4. Values: Geist, no italics, the spacing and radius steps of the file, sentence case, plain words, no exclamation marks, calm specific messages, a visible focus ring, loading and empty states, no `window.alert()`, no icon package (Phosphor is not installed yet; BU adds it). Verify with screenshots at 1440x900 and 390x844, light and dark, keyless on a port from 47000 to 47999, and stop the server. Docs and copy avoid the words `scripts/copy-check.mjs` bans (`credential`, `sponsor`, `validated`, `Vercel`, `Solana`, a test count such as "4395 tests") |

## 7. Task packages

Tasks are listed in group order (section 4), not in id order.

### T-B3-S1. Spike: zip approach for `.iynkz`

| Field | Content |
|---|---|
| Identity | Subsystem local files. Phase B3. Priority must (R-037 container). Depends on none. Status not started |
| Question | Can `.iynkz` be done with no new dependency: a store-only zip writer plus a hand-written inflate (RFC 1951, about 150 lines) in one portable `src/export/zip.ts`? The reader cannot use `DecompressionStream`: the portable tsconfig has no DOM `lib` (ADR-0014), and a stream gives no byte-exact output cap. Four clauses, all must hold: (a) two writes of one project give identical bytes in Node 24, Chromium and WebKit; (b) zips made by Python `zipfile` with deflate and by `zip -X` open; (c) the reader enforces 1,000 entries, 16 MiB per entry, 128 MiB total, 100 to 1 ratio, refuses `../`, absolute, drive-letter and duplicate or case-colliding names, and a 10 MiB deflate bomb of zeros stops at the cap, before 20 MiB inflated, in under 2 s; (d) the file is under 600 lines |
| Method | Scratch folder `/Users/amar/iynk-master-plan-scratch/build/B3-S1/`. A throwaway script writes the reader and writer, builds ten zips (valid, nested, bomb, traversal, duplicate, case-collision, 1,001 entries, 17 MiB entry, truncated, bad CRC) and runs them in Node and in Chromium and WebKit through Playwright `page.evaluate`. If a clause fails, repeat with `fflate` (MIT, EXTERNAL: read its LICENSE file; measure the gzip size of only the used functions) |
| Exit condition | PASS-own: all four clauses hold, T-B3-05 writes `src/export/zip.ts` itself. PASS-fflate: own fails, fflate passes (a), (b), (c) and adds under 15 KB gzip (ESTIMATED threshold, set here), T-B3-05 adds `fflate` pinned to a version older than two weeks. FAIL: both fail; stop and ask Amar whether to ship `.iynk` only |
| Output | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/BS-01-zip/REPORT.md` with a table of the ten cases per engine, bytes, times, and the verdict. Nothing in `src/` |
| Size and time box | S, one day (ESTIMATED) |
| Verify | The report exists, names the verdict and lists the numbers; `git status` shows only the report |
| Later tasks need | T-B3-05 reads the verdict first |

### T-B3-S2. Spike: IndexedDB at `pagehide`, and a file handle in a worker

| Field | Content |
|---|---|
| Identity | Subsystem local storage. Phase B3. Priority must (it settles FA-08's close-the-tab case). Depends on none. Status not started |
| Question | Q1: does an IndexedDB `readwrite` transaction started in a dedicated worker, from a message posted in the page's `pagehide` or `visibilitychange` (hidden) handler, commit before the tab goes away, in Chromium and WebKit (Firefox if installed)? Q2: does `FileSystemFileHandle.createWritable()` work inside a dedicated worker for a handle received by `postMessage`? |
| Method | Scratch page and worker served by a tiny static server on a random port (not 3000, not 43117). Q1: 200 trials per engine and per `durability` option (`relaxed`, `strict`): the page posts a counter to the worker, the worker writes it, Playwright closes the page with `runBeforeUnload`, a new page reads the counter. Count survivals. Q2: use an OPFS file handle from `navigator.storage.getDirectory()` as a stand-in, since a user-picked handle needs a human (see "For Amar" item 4) |
| Exit condition | Q1 PASS: at least 199 of 200 trials survive in each engine, then T-B3-04 flushes through the worker at `pagehide`. Q1 FAIL in an engine: T-B3-04 writes the last batch to the `journal` store from the main thread at `pagehide` (a single small `put`) and the worker flushes at the next open. Q2 PASS: the worker writes bytes to the handle. Q2 FAIL: the worker returns bytes and the main thread streams them (the fallback FRONTEND 8.2 already names) |
| Output | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/BS-02-idb-pagehide/REPORT.md` with survivals per engine and option |
| Size | S, one day (ESTIMATED) |
| Later tasks need | T-B3-04 sets `FlushStrategy` from the verdict; T-B3-05 and T-B3-27 set the file-write path from Q2 |

### T-B3-S3. Spike: service worker precache source and offline reload

| Field | Content |
|---|---|
| Identity | Subsystem offline shell. Phase B3. Priority must (R3 risk of the B3 card, FA-09). Depends on none. Status not started |
| Question | After one online visit, can a hand-written service worker answer a reload of a prerendered page while offline, in Chromium and WebKit, on a production build with `cacheComponents: true` (`next.config.ts:21`), and which source gives the URL list to precache: (A) files derived from the build output, or (B) the URLs found by scanning the page HTML at `install`? Second question: does a client-side navigation while offline get its RSC payload from the cache, or must it fall back to a hard navigation (ADR-0406 limitation, FA-09)? |
| Method | A throwaway `git worktree` under `/Users/amar/iynk-master-plan-scratch/build/B3-S3/` (not on `build/v1`). Add `public/sw-spike.js` there. Build keyless with `NEXT_DIST_DIR=.next-s3`, serve on a random port, use `/en/about` as the stand-in for `/en/studio` (VERIFIED it is a prerendered page, `src/app/[lang]/about/page.tsx`). Read `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` (service worker headers at lines 636-666) first. Playwright `context.setOffline(true)` then reload; count failed requests; then click a `Link` offline |
| Exit condition | Reload offline shows the page with zero failed same-origin requests, in both engines, for (A) or (B); report which one and the gzip size of the list (ceiling 1.5 MB gzip, ADR-0406, ESTIMATED). If neither works, report the smallest change that does (for example a `generateBuildId` plus a manifest script). Soft navigation: record yes or no |
| Output | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/BS-03-sw-precache/REPORT.md` |
| Size | M, one to two days (ESTIMATED) |
| Later tasks need | T-B3-09 implements the chosen source and the navigation fallback |

### T-B3-01. `src/protocol`: RPC envelope and ports

| Field | Content |
|---|---|
| Identity | Subsystem protocol. Phase B3. Priority must. Depends on B2 (T-B2-01 toolchain, T-B2-02 `Result`). Status not started |
| Problem | Three workers (`project`, `sim`, later `ai`) need one way to call, acknowledge, time out and die (FRONTEND 8.1, ADR-0404). Today `check-client.ts` hand-rolls its own (`src/lib/interp/check-client.ts:38-65`) |
| User and story | A developer: "I add a worker request in one place and get ack, error, timeout and kill for free" |
| Expected behaviour | `serveWorker(scope, handler)` is the worker-side half: it posts `ready`, answers each request with `ack` or `error`, and posts what `emit` sends. It lets `project.worker.ts` and `sim.worker.ts` contain only a wiring line (T-B3-03, T-B3-13). `createRpcPort(workerLike)` returns `call`, `on`, `kill`, `state`. `createInlinePort(handler)` has the same interface and runs the handler in the calling thread through `queueMicrotask`, cloning each message with `structuredClone` so a test sees what a worker would see. A worker that has not sent `ready` within 10 s is killed and the call fails `worker_start_timeout`. A dead worker is not restarted by the port |
| Success metric | 100 percent of the cases below pass; `PT` passes (module is portable) |
| Existing files | `src/lib/interp/check-client.ts:36-65` (precedent: `new Worker(new URL(...), { type: 'module' })` at line 38, 2 s grace at line 17). Not edited |
| New files | `src/protocol/rpc.ts`, `errors.ts`, `version.ts`, `index.ts`; tests `src/protocol/rpc.test.ts`, `inline.test.ts`, `serve.test.ts` |
| Interfaces | Those of FRONTEND 8.1 (`WorkerLike`, `RpcPort<Req, Ev>`, `createRpcPort`, `createInlinePort`; line 470-488), plus `serveWorker` and `WorkerScopeLike`, which FRONTEND 8.1 does not name but both worker entries need |
| Data model | Envelope `{ v: 1; id?: number; t: string; ... }`. Ack `{ v: 1; id; t: 'ack'; result? }`. Error `{ v: 1; id; t: 'error'; error: { kind: string; message: string; hint?: string } }`. Ready `{ v: 1; t: 'ready' }` |
| Algorithm and states | Port state `starting` to `ready` on the `ready` message; `ready` to `dead` on `kill()`, `onerror`, or the start timeout. `call` assigns a numeric `id`, stores a resolver, posts. An `ack` or `error` with a known id settles it; an unknown id is dropped. `kill(graceMs = 2000)`: reject all pending calls with `worker_killed`, call `terminate()` after the grace, resolve when done |
| Validation and errors | `v` must equal `PROTOCOL_VERSION`; a message with another `v` or no `t` is dropped and counted in `port.dropped`. `ProtocolError` kinds: `worker_start_timeout`, `worker_killed`, `call_timeout`, `bad_message`, `aborted` |
| Edge cases | `AbortSignal` already aborted; two kills in a row; `call` after death rejects at once; typed arrays in `transfer` (inline port ignores transfer but still clones) |
| Performance | Port overhead under 0.1 ms per call in Node (ESTIMATED; measured in test and printed) |
| Migration | none (new) |

```ts
// src/protocol/version.ts
export const PROTOCOL_VERSION = 1 as const;
// src/protocol/errors.ts
export type ProtocolErrorKind = 'worker_start_timeout' | 'worker_killed' | 'call_timeout' | 'bad_message' | 'aborted';
export class ProtocolError extends Error { kind: ProtocolErrorKind; constructor(kind: ProtocolErrorKind, message: string) { super(message); this.name = 'ProtocolError'; this.kind = kind; } }
// src/protocol/rpc.ts  (erasable syntax only: no parameter properties)
export type AckOf<R extends { t: string }> = { result?: unknown } & { t: 'ack' };
export interface PortOptions { startTimeoutMs?: number; defaultCallTimeoutMs?: number; timers?: { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout } }
export type WorkerHandler<Req extends { t: string }, Ev extends { t: string }> = (msg: Req, emit: (ev: Ev) => void) => Promise<unknown> | unknown;
export interface WorkerScopeLike { postMessage(msg: unknown, transfer?: unknown[]): void; onmessage: ((e: { data: unknown }) => void) | null }   // structural, so no Worker global is named
export function serveWorker<Req extends { t: string }, Ev extends { t: string }>(scope: WorkerScopeLike, handler: WorkerHandler<Req, Ev>): void;
```

| Field | Content |
|---|---|
| Unit tests | `rpc.test.ts`: call resolves on ack; rejects on error with kind, message, hint; unknown id dropped; `v` mismatch dropped and counted; start timeout with fake timers rejects `worker_start_timeout` and terminates; `kill` rejects pending with `worker_killed`; `kill` twice is safe; call after death rejects; `AbortSignal` aborts. `serve.test.ts`: `serveWorker` posts `ready` first; a handler result becomes an `ack` with the request `id`; a throw becomes an `error` with kind and message; `emit` posts the event. `inline.test.ts`: handler result round trip; message is cloned (mutating the sent object after `call` does not change what the handler saw); handler throw becomes `error`; events from `emit` reach `on` |
| Integration and e2e | none here (first browser use is T-B3-03) |
| Fixtures | A fake `WorkerLike` class in the test file |
| Acceptance | Given a fake worker that never sends `ready`, When 10 s of fake time pass, Then the next call rejects `worker_start_timeout` and `terminate` ran once. Given an inline port, When the handler mutates its input, Then the caller's object is unchanged |
| Observability | `port.dropped` counter and `port.state` for tests |
| Release blockers | A `window`, `Worker` or `document` reference in `src/protocol` (fails `PT`); a lint error |
| Definition of done | Cases pass; `TL`, `PT` green; no import outside `core` (the `src/architecture.test.ts` matrix passes) |
| Verify | `TL`; `PT`; `V src/protocol src/architecture.test.ts` |
| Docs | Add the RPC section to `docs/ARCHITECTURE.md` in T-B3-25 |
| Rollback | Revert the commit; nothing depends on it yet |
| Later tasks need | 03, 13, 26 use `createRpcPort`, `createInlinePort` and `serveWorker`; 13 defines its `Req`/`Ev` unions on top |

### T-B3-02. Database `iynk`, the 19 stores and the `Repository` interface

| Field | Content |
|---|---|
| Identity | Subsystem local storage. Phase B3. Priority must (F-200, R-035). Depends on B2. Status not started |
| Problem | Nothing a person builds survives a reload (audit A11; `src/lib/progress/storage.ts:5-6` keeps only `iynk:v1` in `localStorage`). R-035 and ADR-0106 fix one database with 19 stores |
| User and story | Amar: "closing the tab does not lose my project" |
| Expected behaviour | `openDb()` opens database `iynk` at version 1 and creates all 19 stores in one `onupgradeneeded`. Opening twice is idempotent. A newer on-disk version than the code knows is refused with `db_too_new` |
| Success metric | The upgrade creates exactly the 19 stores of SYSTEM 8.1 with the key shapes below |
| Existing files | `src/lib/progress/storage.ts:5-6` (`STORAGE_KEY = "iynk:v1"`, `STORAGE_VERSION = 1`) stays; it keeps settings only. Not edited |
| New files | `src/local/db.ts`, `stores.ts`, `repository.ts`; edit `package.json` and `package-lock.json` (devDependency `fake-indexeddb`: the agent runs `npm view fake-indexeddb version time --json`, picks the newest version published at least two weeks ago, and pins it exactly); tests `src/local/db.test.ts` |
| Data model | `stores.ts` exports `STORES` with all names and key paths: `projects` (key id; `{ doc, hash, writtenAt }`), `index` (`{ name, updatedAt, hash, board, size, hasFileCopy, archived }`), `trash` (`{ doc, deletedAt }`), `backups` (key `projectId:n`; `{ doc, hash, at }`), `assets` (key sha256; Blob), `revisions` (key `projectId:revision`), `progress`, `proposals`, `keys` (key provider id; `{ providerProfile, key, addedAt, lastUsedAt }`), `events` (autoIncrement), `errors` (autoIncrement), `server`, `ai_threads`, `ai_log`, `ai_usage` (key `provider:day`), `ai_memo`, `ai_debug`, `journal` (key project id; `{ baseRevision, edits, writtenAt }`), `identity` (key server origin). `archived` is a boolean on the `index` row (RC-09). Indexes: `index` by `updatedAt`; `trash` by `deletedAt`; `ai_threads` by `projectId` |
| Interfaces | `repository.ts` is types only (the implementations are T-B3-22): see below |
| Algorithm | One `onupgradeneeded` creates every store; later versions will add `if (old < 2)` blocks. `deleteAiStores(db)` is a helper that lists the six stores of RC-09 (`ai_threads`, `ai_log`, `ai_memo`, `ai_debug`, `proposals`, `ai_usage`) |
| Validation and errors | `DbError` kinds: `unavailable` (no `indexedDB` or blocked), `db_too_new`, `blocked`, `quota`, `aborted`. `unavailable` is how T-B3-21 shows the M1 step 1 banner |
| Edge cases | Private window where `indexedDB.open` throws; `versionchange` from a newer tab (close and report); open request `blocked` by an old tab |
| Performance | `openDb()` under 50 ms on desktop (ESTIMATED); measured and printed by the test with `fake-indexeddb` only as a smoke |
| Migration | none (database is new). The old `iynk:v1` key is read by T-B3-27 later for `progress` (PDM 11.6), not here |

```ts
// src/local/repository.ts  (types only)
// JournalRow, JournalEdit and StoreName are exported from stores.ts
export interface ProjectRecord { doc: Project; hash: string; writtenAt: number }
export interface IndexRow { name: string; updatedAt: string; hash: string; board: string; size: number; hasFileCopy: boolean; archived: boolean }
export type SaveResult =
  | { ok: true; hash: string; writtenAt: number }
  | { ok: false; kind: 'quota' | 'blocked' | 'conflict' | 'validation' | 'unavailable'; detail: string };
// What load found. 'recovered' means the current slot failed its hash check and the ~prev slot was returned (PD-5).
// 'lost' means both slots failed. 'missing' means the id has no record.
export type RecordLoad =
  | { status: 'ok'; rec: ProjectRecord }
  | { status: 'recovered'; rec: ProjectRecord }
  | { status: 'lost' }
  | { status: 'missing' };
export interface Repository {
  list(): Promise<Array<{ id: string } & IndexRow>>;
  load(id: string): Promise<RecordLoad>;
  save(id: string, rec: ProjectRecord, row: IndexRow, expect: { revision: number; hash: string } | null): Promise<SaveResult>;
  remove(id: string, deletedAt: number): Promise<void>;   // to trash
  restore(id: string): Promise<void>;
  purgeTrash(olderThan: number): Promise<number>;
  listTrash(): Promise<Array<{ id: string; name: string; deletedAt: number }>>;
  journal: { read(id: string): Promise<JournalRow | null>; append(id: string, baseRevision: number, edits: JournalEdit[], now: number): Promise<void>; clear(id: string): Promise<void> };
  backups: { put(id: string, doc: Project, hash: string, at: number): Promise<void>; list(id: string): Promise<Array<{ n: number; at: number; hash: string }>> };
  revisions: { put(id: string, revision: number, snap: { state: Project; stateHash: string }): Promise<void>; get(id: string, revision: number): Promise<{ state: Project; stateHash: string } | null>; list(id: string): Promise<number[]> };  // filled from the session's onCompact (T-B2-10); the history browser is B5
  setFileCopy(id: string, has: boolean): Promise<void>;
  clearStores(names: readonly StoreName[]): Promise<void>; // used by wipe and Delete AI data
  estimate(): Promise<{ usage: number; quota: number } | null>;
}
```

| Field | Content |
|---|---|
| Unit tests | `db.test.ts` (jsdom, `fake-indexeddb/auto`): 19 stores exist with the right key paths; reopening does not throw or duplicate; a stored version 99 gives `db_too_new`; `deleteAiStores` returns the six names; `indexedDB` undefined gives `unavailable` |
| Acceptance | Given a fresh profile, When `openDb()` runs, Then `db.objectStoreNames` has 19 names equal to SYSTEM 8.1 rows 1 to 19 |
| Observability | none beyond the typed errors |
| Release blockers | A store missing from the list; a key path that differs from SYSTEM 8.1 |
| Definition of done | 19 stores; `TL` green; the dependency is pinned exactly and the lockfile updated; "For Amar" item 1 noted in the commit body |
| Verify | `TL`; `V src/local/db.test.ts` |
| Docs | `docs/PROJECT_FILES.md` store table (T-B3-25) |
| Rollback | Revert. If Amar refuses the dependency: revert the `package.json` part and let T-B3-22 test only with the memory repository (the `idb-repository.ts` tests then use a hand-made minimal fake; ESTIMATED extra half day) |
| Later tasks need | 22 implements `Repository` (including `RecordLoad`); 03, 04, 06, 08 import `STORES` and the types. T-B3-07 does not use `Repository`: it talks to the `keys` store directly |

### T-B3-10. `src/sim/core`: integer-ns clock and state hash; lint ban (SA-11)

| Field | Content |
|---|---|
| Identity | Subsystem sim core. Phase B3. Priority must (DET-1, DET-5, SA-11). Depends on B2 (`src/core/prng.ts`, `units.ts`, `sha256.ts`). Status not started |
| Problem | No clock in the repo is integer nanoseconds, there is no 64-bit state hash, and no lint rule keeps wall time and randomness out of the simulation. Today the only breach is `src/lib/interp/headless.ts:194` (`performance.now()` budget) |
| User and story | A developer: "if I write `Math.random()` in `src/sim` the build fails" |
| Expected behaviour | `SimTime` is an integer nanosecond count; `cyclesToNs` and `nsToCycles` are exact (SIMULATION 5.4). `StateHasher` computes FNV-1a 64 over a canonical byte walk (SIMULATION 6.9). ESLint fails `Date.now`, `performance.now`, `Math.random`, `crypto.getRandomValues`, `new Date`, `eval`, `new Function`, and dynamic `import()` in `src/sim/**` source files (T-B2-01's portable block already bans `Date.now` and `Math.random` there; a later flat-config block replaces the options of the same rule from an earlier block, so the SA-11 block restates both). Test files under `src/sim` are exempt (they time themselves and build hostile inputs); they still draw any random input from `rng(seed, stream)` of `src/core`, so the tests stay deterministic |
| One source of truth | B2 already ships what the roadmap row listed here: `src/core/prng.ts` exports `rng(seed, stream)` (sfc32 seeded from SplitMix32 of `seed XOR fnv1a32(stream)`, T-B2-03, DOCUMENTED) and `src/core/units.ts` has `msToNs` (T-B2-02). This task imports them and adds no second generator and no second unit table. The roadmap's `units.ts` and `rng.ts` are therefore not created (PD-15) |
| Success metric | The vectors below pass; a planted violation of each banned form fails lint |
| Existing files | `eslint.config.mjs` (flat config, `defineConfig([...])`; the portable block for `src/core/**`, `src/protocol/**`, `src/project/**`, `src/parts/**`, `src/sim/**` and `src/export/**` sits at the top with `ignores: ["**/*.test.ts", "**/*.testing.ts", "src/parts/browser/**"]` and the rules `no-restricted-imports`, `no-restricted-properties` (`Date.now`, `Math.random`) and `no-restricted-globals`; read the file as it is on `build/v1`) is edited once: the SA-11 block, `files: ["src/sim/**/*.ts"], ignores: ["src/sim/**/*.test.ts", "src/sim/**/*.testing.ts"]`, placed after the portable block. It restates `Date.now` and `Math.random` in `no-restricted-properties` and adds `performance.now` and `crypto.getRandomValues`; `no-restricted-syntax` covers `new Date`, `eval`, `new Function` and `ImportExpression`. The glob alone also matches test files, and the plan puts banned forms in tests under `src/sim` on purpose: `queue.test.ts` and `orchestrator.test.ts` time themselves with `performance.now()`, and `linsolve.test.ts` evaluates the old function text in a `Function`. Without the `ignores` entry `npm run lint` would fail. There is no matrix edit (section 3.1): `src/architecture.test.ts` is not touched. `src/core/prng.ts`, `units.ts`, `sha256.ts` are imported, not edited; tests under `src/sim` start with `// @vitest-environment node` (section 6.3). `src/core/prng.ts`, `units.ts`, `sha256.ts` are imported, not edited |
| New files | `src/sim/core/clock.ts`, `hash.ts`, `diagnostic.ts`; edit `eslint.config.mjs` (4 source files in all); tests `src/sim/core/clock.test.ts`, `hash.test.ts`, `diagnostic.test.ts`, `src/sim/lint.test.ts` |
| Interfaces | |

```ts
// clock.ts
export type SimTime = number;                                  // integer ns, 0..2^53
export interface ClockRate { num: number; den: number }       // ns per tick = num/den, reduced
export function clockRate(num: number, den: number): ClockRate; // reduces by gcd
export function cyclesToNs(cycles: number, rate: ClockRate): SimTime;  // floor(cycles*num/den), BigInt when cycles*num >= 2^53
export function nsToCycles(ns: SimTime, rate: ClockRate): number;      // ceil
export const NS_PER_MS = 1_000_000;
// hash.ts
export class StateHasher { int(n: number): this; f64(x: number): this; str(s: string): this; bool(b: boolean): this; bytes(b: Uint8Array): this; obj(o: unknown): this; hex(): string /* 16 hex digits */ }
export function fnv1a64(bytes: Uint8Array): string;
// diagnostic.ts  (SIMULATION A.2 `Diagnostic`, renamed SimDiagnostic because src/core/result.ts has a different Diagnostic, RC-B3-8; it sits here, in G1, so T-B3-16 can import it before T-B3-11 exists)
import type { PinRef } from '../../project/generated/types.ts';   // there is no src/project/index.ts
export interface SimDiagnostic { id: string; severity: 'error' | 'warning' | 'note'; ref: { part?: string; pin?: PinRef; net?: string; file?: string; line?: number; column?: number }; text_key: string; args?: Record<string, string | number>; hint_key?: string }
export type SolveDiagnostic = SimDiagnostic;                       // SIMULATION A.2
export function simDiag(id: string, severity: SimDiagnostic['severity'], ref: SimDiagnostic['ref'], args?: SimDiagnostic['args']): SimDiagnostic;   // text_key is `diag.<id>`; throws if id is not kebab-case or is over 64 characters
```

| Field | Content |
|---|---|
| Algorithm | `StateHasher`: integers as 8-byte little-endian, floats as IEEE bits through a shared `Float64Array`/`DataView`, strings as a 4-byte length then UTF-8 (the hand-written `utf8Encode` of `src/core/canonical.ts`, because the portable `lib` has no `TextEncoder`), objects in sorted key order, `undefined` and functions rejected. FNV-1a 64 with `BigInt` (offset `0xcbf29ce484222325`, prime `0x100000001b3`, masked to 64 bits) |
| Validation and errors | `clockRate` throws on `den <= 0` or non-integers; `cyclesToNs` throws `RangeError` above `2^53` ns; `StateHasher.f64` throws on `NaN` or infinity (SIMULATION 6.4 `numeric-fault`) |
| Edge cases | `ClockRate` `{ num: 125, den: 2 }` (16 MHz): 16,000,000 cycles give exactly 1,000,000,000 ns; 1 cycle gives 62; negative cycles rejected; `-0` hashed as 0 |
| Performance | `StateHasher` over a 10 KB object under 1 ms in Node (ESTIMATED; printed) |
| Migration | none |
| Unit tests | `clock.test.ts`: the six rows of the SIMULATION 5.4 rate table (16 MHz, 125 MHz, 240 MHz, 240 Hz, 100 Hz, 1 MHz) give exact values over 1e6 cycles; `nsToCycles(cyclesToNs(n)) >= n`; the BigInt path agrees with the number path on 1,000 pairs drawn from `rng(0x5eed, 'clock-test')` (`src/core/prng.ts`, not `Math.random`). `diagnostic.test.ts`: `simDiag('no-convergence', ...)` fills `text_key: 'diag.no-convergence'`; an id with an upper-case letter or 65 characters throws. `hash.test.ts`: FNV-1a 64 of `""` is `cbf29ce484222325`, of `"a"` is `af63dc4c8601ec8c` (published FNV vectors, EXTERNAL; the test also checks them against a second, independent loop written in the test); key order does not change the hash; `NaN` throws; a one-ulp change in a float changes the hash. `lint.test.ts` (`// @vitest-environment node`): the `ESLint` class lints eight small strings with file path `src/sim/core/x.ts` and each banned form reports an error, while the same strings at `src/lib/x.ts` report none, and the same strings at `src/sim/core/x.test.ts` report none (proves the `ignores` entry). |
| Integration and e2e | `npm run lint` passes on the whole repo with the new block (no `src/sim` code exists yet, so no violations), and stays green when later tasks add test files under `src/sim` that use `performance.now()` |
| Acceptance | Given `Math.random()` in `src/sim/core/x.ts`, When ESLint runs, Then it reports a `no-restricted-properties` or `no-restricted-syntax` error naming the form |
| Release blockers | A lint block that also hits `src/lib/**` (it would break the interpreters) or `*.test.ts` under `src/sim`; a hash vector mismatch; `npm run check` red after this task |
| Definition of done | All tests pass; `TL`, `PT` green |
| Verify | `TL`; `PT`; `V src/sim/core src/sim/lint.test.ts src/architecture.test.ts` |
| Docs | one paragraph in `docs/ARCHITECTURE.md` (T-B3-25) |
| Rollback | Revert; the eslint block goes with it |
| Later tasks need | Every later task keeps `npm run check` green because this task changes only `eslint.config.mjs` and adds new `src/sim` files. 11 imports `SimTime`, `StateHasher` and `SimDiagnostic`; 16 imports `SolveDiagnostic`; 12 uses `msToNs` from core; 19 uses `StateHasher` and `rng` from core; the SA-12 `dmath` module (B9) goes next to these files |

### T-B3-14. Interpreter allocation caps (SA-10 probes)

| Field | Content |
|---|---|
| Identity | Subsystem interpreters. Phase B3. Priority must (F-044, R-018, R-043). Depends on none. Status partly done by `359162e` (B0 T-B0-25: Python repeat cap, Arduino array cap, serial cap); the rest is open, see Problem |
| Problem | Three of four allocation probes killed the host when this was written. B0 T-B0-25 (`359162e`) has since capped three things: Python `*` on a str, list or tuple (`MAX_ELEMENTS = 1_000_000` at `python/runtime.ts:228` and `checkRepeat` at `:495`, raised as a Python `MemoryError` that `try/except` can catch, so the probe `[0] * 10**9` already stops), the Arduino array size (`MAX_ARRAY` and the running product in `arrayType`, raised as `InterpError('limit')` at compile time, so the probe `int a[2000000000]` already stops) and serial output (`SERIAL_CAP` in `run.ts`, 1 MiB). Still open: `bytes(n)` and `bytearray(n)` (`python/modules.ts:159`, so the append loop), a string longer than 1 MiB (Python `s + s`, Arduino `String s += s`) and the logical heap meter. SA-10 wants an uncatchable `limit`, so the Python repeat check changes from `MemoryError` to `InterpError('limit')`. This task is half done by T-B0-25, not done |
| User and story | Amar: "a sketch that asks for 2 GB ends in a clear message and the tab stays alive" |
| Expected behaviour | Each probe ends with `InterpError('limit', ...)` naming the limit: `[0] * 10**9` (Python), an `append(bytearray(1e7))` loop (Python), `int a[2000000000]` (Arduino), `String s += s` doubling (Arduino). Limits: one array or list at most 1,000,000 elements; one string at most 1,048,576 characters (1 MiB); a logical heap meter of 64 MiB per run. No dict cap in B3 (PD-21) |
| Success metric | The four probes end in `limit` with the process alive; every existing interpreter test and the 102 lesson reference runs still pass |
| Existing files | `src/lib/interp/python/runtime.ts:228` (`MAX_ELEMENTS`), `:495` (`checkRepeat`, the `MemoryError` of T-B0-25), `:1077-1092` (the `*` branch of the binary operator, now calling `checkRepeat`); `python/runtime.ts:20-22` (`PyBytes`); `python/runtime.ts:239` (`class PyRt extends Exec`, constructed at `run.ts:188`); `arduino/interp.ts:70` (`class ArduinoRt extends Exec`, constructed at `arduino/interp.ts:151`); `python/modules.ts:159` (`bytes` builds `new Array(Number(toBig(x))).fill(0)`, `bytearray` is the same function); `arduino/interp.ts:266-282` (`arrayType` with the T-B0-25 `MAX_ARRAY` product); `arduino/interp.ts:1049` (`String +=`) and the `String +` branch just below; `src/lib/interp/errors.ts:7` (`InterpError`, kind `limit` already used at `exec.ts:123` and `exec.ts:127`); tests that pin today's messages: the `size caps` block of `python/python.test.ts` (matches `MemoryError: cannot repeat to 100000000 items (limit 1,000,000)` and `MemoryError.*limit 1,000,000`) and the `array size cap` block of `arduino/arduino.test.ts` (matches `array size 200000000 is over the limit of 1,000,000 elements`) |
| New files | `src/lib/interp/limits.ts`; edit `python/runtime.ts`, `python/modules.ts`, `arduino/interp.ts` (3 edits, 4 files in all); update the expectations in `python/python.test.ts` and `arduino/arduino.test.ts` (existing test files, not counted); tests `src/lib/interp/limits.test.ts` |
| Interfaces | |

```ts
// src/lib/interp/limits.ts
export const MAX_ELEMENTS = 1_000_000;
export const MAX_STRING = 1_048_576;
export const MAX_HEAP_BYTES = 64 * 1024 * 1024;
export class HeapMeter {                       // one per run; plain class, no parameter properties needed here
  used: number;
  charge(bytes: number, what: string): void;  // throws InterpError('limit', ...) over MAX_HEAP_BYTES
  release(bytes: number): void;
}
export function checkElements(n: number, what: string): void;   // throws InterpError('limit', `${what} of ${n} elements is over the limit of 1,000,000`)
export function checkString(len: number): void;
```

| Field | Content |
|---|---|
| Algorithm | `checkRepeat` (T-B0-25) now calls `checkElements(k * s.items.length)` and `checkString(k * s.length)` instead of throwing `MemoryError`, and `MAX_ELEMENTS` and `MAX_ARRAY` are removed in favour of `MAX_ELEMENTS` from `limits.ts`: `checkElements(k * s.items.length)` before building a repeated list or tuple; `checkString(k * s.length)` before `repeat`; `bytes(n)` and `bytearray(n)` call `checkElements(n)`; `arrayType` keeps its T-B0-25 running product and calls `checkElements` on it in place of the local `MAX_ARRAY` test (the message the Arduino test matches stays, and it names the line); `String +=` and `String +` call `checkString` on the result length. The heap meter charges 8 bytes per element for lists and arrays and 2 bytes per character for strings, on creation of any object above 1,024 elements (small objects are not metered, ESTIMATED to keep the cost near zero). One `HeapMeter` is created inside the `PyRt` constructor (`python/runtime.ts:238`) and inside the `ArduinoRt` constructor (`arduino/interp.ts:69`) and kept as `rt.heap`; `python/modules.ts` allocation sites reach it through the runtime they already receive. So `run.ts` and `exec.ts` are not edited (PD-17) |
| Validation and errors | Message text: names the thing, the size asked, the limit, and a hint ("make the array smaller"). Kind `limit` so the host maps it to `status: limit` (R-043). Python `try/except` cannot catch it because it is an `InterpError`, not a `PyRaise` |
| Edge cases | `[0] * 0`, `[0] * -3` (empty, as Python); a string of exactly 1,048,576 characters passes, one more fails; 2-D arrays `int a[1000][1001]` (1,001,000) fail; `"ab" * 600000` fails at 1,200,000 characters (string cap) and `[1, 2, 3] * 400000` fails at 1,200,000 elements (element cap); the `*` branch (`python/runtime.ts:1071-1077`) handles only `str`, `list` and `tuple`, so `bytes * n` is a `TypeError` today and is not a probe |
| Permissions | P0 |
| Performance | Caps add one integer comparison per allocation; the lesson suite time may not rise by more than 5 percent (measured: run `V src/lib/interp/lessons.test.ts` before and after, quiet machine, print both) |
| Migration | none |
| Unit tests | `limits.test.ts` (`// @vitest-environment node`): the four probes end in `limit` with the right message and the test process lives; boundary cases above; heap meter charges and releases, and `rt.heap` exists on both runtimes after construction; a program under every cap runs unchanged (a Blink and a list-comprehension of 100,000 items); the T-B0-25 tests are kept and re-pointed: the Python size-cap cases now expect `error.kind === 'limit'` (not a catchable `MemoryError`) with the same numbers, `[] * 50000000` and exactly one million items still pass, and the Arduino array tests pass unchanged |
| Integration | `V src/lib/interp` whole folder green; `lessons.test.ts` 102 of 102 as before |
| Acceptance | Given `x = [0] * 10**9`, When the Python program runs, Then the run ends with `error.kind === 'limit'`, the message says "1,000,000", and the next `createRun` in the same process works |
| Release blockers | A `MAX_DICT_KEYS` or any other constant that nothing enforces; any lesson reference run that now hits a cap (would mean a cap is below real use; raise the cap only with Amar's OK, D-014); a probe that still throws `RangeError` or kills the process |
| Definition of done | Four probes end in `limit`; all interpreter tests pass; `TL` green |
| Verify | `TL`; `V src/lib/interp` |
| Docs | none |
| Rollback | Revert the commit; the interpreters return to uncapped |
| Later tasks need | 26 maps `limit` errors to the host `limit` state; 23 shows the four probes in Diagnostics; SA-10 recorded in 25 |

### T-B3-16. Solver I: pure types, union-find graph and `linsolve`

| Field | Content |
|---|---|
| Identity | Subsystem analog solver (SIM-1). Phase B3. Priority should (F-045, R-046). Depends on B2 only. Status not started |
| Problem | `figures/engine/bench-solve.js` (431 lines) holds the linear algebra and the graph inside an IIFE that reads `SL.bench` globals (`bench-solve.js:9`). The extracted solver needs the same maths as importable, tested functions |
| User and story | A developer: "I call `linsolve(A, b)` and `UnionFind` from TypeScript with no globals" |
| Expected behaviour | `linsolve` reproduces `figures/engine/bench-solve.js:15-37` exactly: Gaussian elimination with partial pivoting, a pivot below `1e-18` skipped, an unreachable node solved to 0 V. `UnionFind` reproduces the `par`/`find`/`uni` closures at `:39-41`. Types match SIMULATION 7.2 |
| Success metric | `linsolve` agrees with a reference (`Float64Array` result of an independent LU written in the test) to 1e-12 relative on 200 random well-conditioned systems and equals the old function bit for bit on 50 systems |
| Existing files | `figures/engine/bench-solve.js:15-37` (read only; frozen, `bench-solve.test.mjs` must stay green), `:10` constants, `:39-41` union-find |
| New files | `src/sim/analog/types.ts`, `graph.ts`, `linsolve.ts`; tests beside them |
| Interfaces | |

```ts
// types.ts  (SIMULATION 7.2, only what B3 builds)
export type ElementId = string;
// Element: the union of SIMULATION 7.2. B3 builds the kinds the old solver has: R, POT, V (rail), PIN, PWM, D (diode and LED), Q (NPN), M (motor as a conductance), plus SV, TS and BZ as conductance or source elements.
export type Element = ElementR | ElementPot | ElementV | ElementPin | ElementPwm | ElementD | ElementQ | ElementM | ElementSv | ElementTs | ElementBz;
export interface SolveOptions { mode: 'pwl' | 'newton'; reltol: number; vabstol: number; iabstol: number; maxIter: number; gminSiemens: number; homotopy: Array<'gmin' | 'source'> }
export type DeviceState = 'off' | 'on' | 'sat' | 'active' | 'open' | 'burnt';
export interface SolveResult { converged: boolean; iterations: number; strategy: 'direct' | 'damped' | 'gmin-stepping' | 'source-stepping'; v: Float64Array; branch: Record<ElementId, { amps: number; volts: number; watts: number }>; state: Record<ElementId, DeviceState>; residual: { maxKclAmps: number; worstNode: number }; diagnostics: SolveDiagnostic[] }
import type { SolveDiagnostic } from '../core/diagnostic.ts';   // = SimDiagnostic (SIMULATION A.2: `SolveDiagnostic = Diagnostic`, ref.net or ref.part always set), from T-B3-10. `id` is one of 'no-convergence', 'floating-node', 'ill-conditioned', 'state-cycle', 'not-modelled-yet'; the node index goes in `args.node` and `ref.net` is the node's net id when the caller gave one, else the index as text
// graph.ts
export class UnionFind { find(a: string): string; union(a: string | null, b: string | null): void; roots(): string[] }
// linsolve.ts
export function linsolve(A: Float64Array[], b: Float64Array): Float64Array;  // mutates A and b like the original
export function conditionEstimate(A: Float64Array[]): number;                // max|a_ij| / min|a_ii|, SIMULATION 6.4
```

| Field | Content |
|---|---|
| Algorithm | Port line by line; keep `1e-18` and the row-swap order. `conditionEstimate` is new and is used by T-B3-17 to raise `ill-conditioned` above 1e15. `SolveDiagnostic` is not defined here (T-B3-10 owns it) |
| Validation and errors | `linsolve` throws `RangeError` when `A.length !== b.length`; `NaN` in the input is returned as `NaN` (the caller raises `numeric-fault`) |
| Edge cases | 1 by 1 system; a zero row; duplicate union calls; a node never unioned; 0 nodes |
| Performance | n = 14 under 0.01 ms, n = 120 under 0.5 ms in Node (RS-08 measured 0.004 and 0.18 ms for the old function, `data/` and SIMULATION 7.1); printed, not gated |
| Migration | none. The old file is not edited; it stays the frozen reference |
| Unit tests | `linsolve.test.ts`: identity, 3 by 3 known solution, singular row gives 0 V for that node, 200 random systems vs the independent LU, 50 systems bit-equal to the old function (the test loads `figures/engine/bench-solve.js` source and extracts `linsolve` by evaluating the 23-line function text in a `Function`). The test file sits in `src/sim/analog`, so the SA-11 glob matches it; it is exempt only because T-B3-10 adds `ignores: ["src/sim/**/*.test.ts"]` to that block. All 250 random systems come from `rng(seed, 'linsolve-test')` of `src/core`, never `Math.random`. `graph.test.ts`: transitive union, `null` ignored, roots stable under reordered unions |
| Acceptance | Given a random well-conditioned 40 by 40 system, When both solvers run, Then every entry is within 1e-12 relative of the reference and bit-equal to the old function |
| Release blockers | Any edit to `figures/` (the old solver is frozen until SA-02 passes, SIMULATION 18.1); a banned form (`Math.random`, `Date.now`) in a non-test `src/sim` file |
| Definition of done | Tests pass; `TL`, `PT` green; nothing under `figures/` changed, and `V figures/engine/bench-solve.test.mjs` is run once to prove it (the only form: the file imports `vitest`, so `node figures/engine/bench-solve.test.mjs` does not run) |
| Verify | `TL`; `PT`; `V src/sim/analog figures/engine/bench-solve.test.mjs` (`vitest.config.mts:12` includes `figures/**/*.test.mjs`, so this is the only form) |
| Docs | none |
| Rollback | Revert |
| Later tasks need | 17 builds `solve` on these; 18 compares against golden values |

### T-B3-20. Diagnosis record and the closed cause-id registry

| Field | Content |
|---|---|
| Identity | Subsystem faults. Phase B3. Priority must (D-010: "the diagnosis record exists before anything uses it"). Depends on B2. Status not started |
| Problem | Four documents invented cause names. SIMULATION 13.4 is the single list: 45 ids. The record shape `{cause_id, symptom_id, evidence[], hint_level}` is fixed by D-010 |
| User and story | A developer building faults (B10) or the AI partner (B14): "I import one type and one list" |
| Expected behaviour | `Diagnosis`, `Evidence`, `HintLevel` types match SIMULATION 13.4 field for field. `CORE_CAUSE_IDS` is the 45-entry list. `isCauseId(id)` accepts a core id or an extension id `x-<kebab>`; anything else is false |
| Success metric | The registry has 45 unique ids; every one is kebab-case; none starts with `electrical-`, `mech-`, `robot-`, `drone-`, `flight-` or `sim-` |
| Existing files | none. The schema has no `Diagnosis` def; `Fault.cause_id` is a plain string in `project.schema.json` (VERIFIED: the examples carry `cause_id` such as `led-reversed`) |
| New files | `src/project/diagnosis.ts`, `src/sim/faults/cause-ids.ts`; tests beside them |
| Interfaces | |

```ts
// src/project/diagnosis.ts  (types only; project imports core only, so the id list lives in sim)
export type HintLevel = 0 | 1 | 2 | 3;
export interface Evidence { kind: 'pin-level' | 'net-voltage' | 'branch-current' | 'serial-line' | 'state' | 'timeline'; ref: string; at: number /* SimTime ns */; value: number | string; unit?: string; provenance: 'computed' | 'approximation' | 'mocked'; tier: 'T0' | 'T1' | 'T2' | 'T3'; modelIds: string[] }
export interface Diagnosis { cause_id: string; symptom_id: string; evidence: Evidence[]; hint_level: HintLevel }
export const EXTENSION_CAUSE_ID = /^x-[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
// src/sim/faults/cause-ids.ts
export const CORE_CAUSE_IDS = [ 'led-no-series-resistor', 'led-reversed', 'output-contention', 'supply-shorted-to-ground', 'floating-input', 'part-not-powered', 'button-no-pulldown', 'open-connection', 'swapped-pins', 'wrong-value', 'missing-ground', 'wrong-pin-in-code', 'i2c-missing-pullup', 'bus-device-not-modelled', 'library-not-modelled', 'pin-overcurrent', 'brownout', 'motor-stall', 'reverse-polarity', 'motor-direction-reversed', 'encoder-channel-swapped', 'wheel-slip', 'driver-undersized', 'battery-sag-reset', 'sensor-too-high', 'sensor-saturated', 'ranger-beam-blocked', 'tip-over', 'loop-too-slow', 'servo-jitter-supply', 'stepper-lost-steps', 'hover-throttle-too-high', 'thrust-to-weight-low', 'esc-overcurrent', 'battery-overcurrent', 'prop-clash', 'cg-offset', 'props-swapped', 'fc-orientation-wrong', 'esc-desync', 'motor-out', 'controller-oscillation', 'gps-lost', 'link-lost', 'sensor-drift' ] as const;
export type CoreCauseId = (typeof CORE_CAUSE_IDS)[number];
export function isCoreCauseId(id: string): id is CoreCauseId;
export function isCauseId(id: string): boolean;                 // core, or matches EXTENSION_CAUSE_ID
```

| Field | Content |
|---|---|
| Algorithm | A `Set` built once from the const array; `isCauseId` returns true when the set has the id or the extension pattern matches it |
| Validation and errors | The list is copied from the table in `SIMULATION_ARCHITECTURE.md` 13.4 (VERIFIED: 45 rows, parsed in this step). If the agent finds the table changed, the table wins and the test count changes in the same commit |
| Edge cases | `x-` alone is invalid; `x-Foo` invalid (upper case); a core id with a prefix such as `x-led-reversed` is a valid extension id but not core |
| Performance | O(1) lookup |
| Migration | none |
| Unit tests | `cause-ids.test.ts`: length 45; unique; kebab-case; no forbidden prefixes; `isCauseId('led-reversed')`, `('x-my-sensor')` true, `('led_reversed')`, `('x-')`, `('')` false. `diagnosis.test.ts`: a sample `Diagnosis` for the BRIEF 30 swapped-pins case type-checks (`cause_id: 'swapped-pins'`, `symptom_id: 'i2c-no-ack'`) |
| Acceptance | Given the 45 ids, When the test runs, Then count is 45 and the naming rule holds |
| Release blockers | A 46th or a missing id; an id outside the kebab-case rule |
| Definition of done | Tests pass; `TL`, `PT` green |
| Verify | `TL`; `PT`; `V src/project/diagnosis.test.ts src/sim/faults` |
| Docs | none |
| Rollback | Revert |
| Later tasks need | B10 faults, B14 AI context and the symptom text keys read these; 24 uses a `Diagnosis` literal in the walk only as a type check |

### T-B3-22. IndexedDB and memory `Repository` implementations

| Field | Content |
|---|---|
| Identity | Subsystem local storage. Phase B3. Priority must (R-035). Depends on T-B3-02. Status not started |
| Problem | `Repository` is an interface only. The ProjectWorker needs an IndexedDB one; tests need a memory one; both must behave the same, including conflict and fallback |
| User and story | Amar: "a crash in the middle of a save leaves me a good copy; two tabs do not overwrite each other" |
| Expected behaviour | `createIdbRepository(db)` and `createMemoryRepository()` implement `Repository`. `save` writes `projects[id + '~prev']` (a copy of the current record), then `projects[id]`, then the `index` row, then clears `journal[id]`, in one `readwrite` transaction over those stores. `expect` is compared first: if the stored record's `doc.revision` or `hash` differs from `expect`, return `{ ok: false, kind: 'conflict' }` and write nothing. `load` returns `{ status: 'ok', rec }` for `projects[id]`; if its recomputed hash differs from the stored `hash`, it returns `{ status: 'recovered', rec }` with the `~prev` record; if that fails its hash check too, `{ status: 'lost' }`; a missing id gives `{ status: 'missing' }` |
| Success metric | The same contract test suite passes against both implementations |
| Existing files | none |
| New files | `src/local/idb-repository.ts`, `memory-repository.ts`; tests `src/local/repository.contract.ts` (shared cases), `idb-repository.test.ts`, `memory-repository.test.ts` |
| Algorithm | Transaction scope: `projects`, `index`, `journal`, `backups`, `trash`. `remove`: move `projects[id]` and `projects[id~prev]` to `trash` as `{ doc, deletedAt }`, delete the `index` row, in one transaction. `restore`: reverse, and recompute nothing (the stored `hash` is trusted until the worker re-validates on open). `purgeTrash(olderThan)` deletes trash rows with `deletedAt < olderThan` and returns the count. Quota: map `QuotaExceededError` to `{ ok: false, kind: 'quota' }`; `AbortError` and `InvalidStateError` to `blocked`. The journal clear is inside the save transaction (PDM 12.1: cleared in the same transaction that writes the document containing those edits) |
| State transitions | Project: `absent` to `live` (save) to `trashed` (remove) to `live` (restore) or `gone` (purge) |
| Validation and errors | `save` rejects a record whose `hash` is not 64 hex digits (`validation`). The repository does not validate documents; the worker does |
| Edge cases | First save has `expect: null`; a save with `expect` for a project that was deleted in another tab gives `conflict`; two saves racing in the same tab serialise by the transaction; `load` of a missing id returns `missing`; both slots corrupt returns `lost` (nothing is deleted; the raw rows stay for a manual look) |
| Performance | Memory repository adds no `structuredClone` of unchanged records beyond one clone per save (so a test can mutate its copy safely) |
| Migration | none |
| Unit tests | Contract cases run against both: `revisions` put, get and list; save then load round trip; second save keeps the first in `~prev`; stale `expect` conflicts and leaves the stored record untouched; corrupt current slot falls back to `~prev` with `status: 'recovered'`; both slots corrupt gives `lost`; missing id gives `missing`; remove then restore; purge counts; journal cleared by save; `index` row equals the saved record; quota error (a fake that throws) gives `quota` and keeps the last good copy; 500 saves of the same id keep exactly two project rows |
| Integration | `fake-indexeddb` for the IDB implementation; a test closes the transaction before commit (abort) and checks nothing changed |
| Acceptance | Given a project saved twice, When the current record is overwritten with garbage, Then `load` returns `{ status: 'recovered' }` with the previous version |
| Release blockers | Any case where a failed save leaves no readable copy |
| Definition of done | Contract passes on both implementations; `TL` green |
| Verify | `TL`; `V src/local` |
| Docs | store layout paragraph for `docs/PROJECT_FILES.md` (T-B3-25) |
| Rollback | Revert |
| Later tasks need | 03 (worker uses the IDB one), 04, 06, 07, 08, 27 (all take a `Repository`) |

### T-B3-11. Engine interface and the orchestrator, digital slice

| Field | Content |
|---|---|
| Identity | Subsystem simulation orchestrator (SIM-0). Phase B3. Priority must (F-047 digital, R-045). Depends on T-B3-10 (`SimTime`, `StateHasher`, `SimDiagnostic`). Status not started |
| Problem | There is no orchestrator. `Run` steps one board; nothing orders events across engines, hashes state, logs inputs or checkpoints |
| User and story | Amar: "the same project and the same seed always give the same pin trace" |
| Expected behaviour | `createOrchestrator({ engines, digital })` returns an orchestrator; `load(net, opts)` takes a `SimNetlist` and `SimRunOptions`, then `runUntil(target, budget)` or `step(unit, n)` advances time in the order of SIMULATION 5.5 and 5.6: events sorted by `(at, phase, rank, seq)`; engines free-run to the horizon; inputs enter at P0; checkpoints of every `engine.stateHash()` are written every 1,000 ms of simulated time. The solver hook answers `not-modelled-yet` for every analog quantity |
| Success metric | With two fake engines, the event order equals the order given by the tuple on 1,000 random schedules; permuting registration of same-rank engines changes no hash (SA-08 second clause) |
| Existing files | `SIMULATION_ARCHITECTURE.md` 5.5 (line 322), 5.6 (line 355), 17.2 (line 1928), A.2 (lines 2110-2160), whose signatures this task follows; `src/lib/interp/clock.ts:17-24` (sorted-array queue, kept as is; the new queue is a heap for the orchestrator only). `src/lib/interp/run.ts:59-96` (`Run` surface that T-B3-12 wraps). Not edited |
| New files | `src/sim/engine.ts` (types and `RANK` only), `orchestrator.ts`, `queue.ts`, `src/sim/digital/resolve.ts`, `pwm.ts`; tests beside them. The type definitions of `ProgramImage`, `LoadResult`, `EngineSnapshot`, `StepUnit`, `HostInput`, `SimRunOptions` are in `engine.ts` (`SimDiagnostic` is re-exported from T-B3-10's `core/diagnostic.ts`); T-B3-12, 13, 15, 19 import them from there and define none of their own |
| Interfaces | |

```ts
// engine.ts  (SIMULATION 5.4 to 5.7, 6.7 to 6.9, 8.1, 17.2, A.2; B3 subset, differences are PD-18)
import type { SimTime, ClockRate } from './core/clock.ts';       // T-B3-10
export type Language = 'arduino-cpp' | 'c-cpp' | 'micropython' | 'python' | 'verilog';   // SIMULATION 8.1. NOT the interpreter's Language of src/lib/interp/profiles.ts:20 ('arduino' | 'python' | 'verilog')
export type ProgramImage = { kind: 'source'; language: Language; files: { path: string; text: string }[]; entry: string };   // B3 subset of SIMULATION 8.1: the 'hex' arm is B9; `entry` is the path of the file that goes to the engine
export type { SimDiagnostic, SolveDiagnostic } from './core/diagnostic.ts';   // defined in T-B3-10 (RC-B3-8); `id` is kebab-case, at most 64 characters
import type { SimDiagnostic } from './core/diagnostic.ts';
export interface LoadResult { ok: boolean; diagnostics: SimDiagnostic[]; models: string[] }   // SIMULATION A.2 without `analog?` (B8); at most 1,000 diagnostics, more are cut with 'diagnostics-truncated'
export type StepUnit = 'ns' | 'event' | 'cycle' | 'line' | 'statement';       // SIMULATION 5.6; B3 runs 'ns' and 'event'
export interface WorkLimits { statements: number; events: number; outputBytes: number }
export interface SimRunOptions { seed: number; speed: number; limits: WorkLimits; tier: 'T1' | 'T3'; endNs?: SimTime }   // SIMULATION A.2 `RunOptions`, renamed because src/lib/interp/run.ts:14 exports a different RunOptions
export interface InputEntry { at: SimTime; seq: number; kind: 'pin' | 'analog' | 'serial' | 'param' | 'fault' | 'control'; target: string; value: unknown }   // SIMULATION 6.7
export interface HostInput { kind: InputEntry['kind']; target: string; value: unknown }   // SIMULATION A.2; stamped with `now` and the next `seq` by Orchestrator.inject
export interface EngineSnapshot { engine: string; engineVersion: string; schema: number; data: unknown | Uint8Array }   // SIMULATION A.2; B3 engines do not implement snapshot (PD-18)
export interface SimNetlist { version: 1; docHash: string; nets: { id: string; name?: string }[]; ground: string; parts: SimPart[]; settings: SimSettings }
export interface SimPart { id: string; descriptor: string; params: Record<string, number | string | boolean>; pins: Record<string, string | null>; kind: PartKind }
export type PartKind = 'board' | 'led' | 'resistor' | 'button' | 'buzzer' | 'pot' | 'display' | 'other';
export interface SimSettings { seed: number; toleranceMode: 'nominal'; analog: { mode: 'dc-event'; stepNs: number }; speed: number }
export type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export interface SimEvent { at: SimTime; phase: Phase; rank: number; seq: number; src: string; kind: string; payload: unknown }
export const RANK = { digital: 10, analog: 20, mcu: 30, ros: 35, bus: 40, mech: 50, flight: 60, env: 70, faults: 80, probe: 90 } as const;   // SIMULATION 5.5; `ros` is unused in B3 but the table is part of the replay record version
export interface SliceBudget { shouldYield(): boolean; work: WorkLimits }
export interface SliceResult { reason: 'target' | 'budget' | 'halted' | 'done' | 'unsupported'; now: SimTime }
export interface EventSink { emit(e: Omit<SimEvent, 'seq'>): void }   // B3 addition (PD-18): the way an engine emits a pin edge
export interface Engine {
  readonly id: string; readonly rank: number;
  nextDue(): SimTime | null;                                                      // null when the engine has nothing scheduled
  advanceTo(horizon: SimTime, budget: SliceBudget): { reached: SimTime; stoppedEarly: boolean };
  onEvent(e: SimEvent): void;
  stateHash(): string;                                                            // SIMULATION 6.9: the engine builds a StateHasher inside and returns hex()
  attach(sink: EventSink): void;                                                  // B3 addition
  snapshot?(): EngineSnapshot; restore?(s: EngineSnapshot): void;                 // optional until B8
}
export interface PinPort { read(pin: number): { mode: string; level: 0 | 1; duty?: number; hz?: number }; drive(pin: number, level: 0 | 1 | null): void; driveVolts(pin: number, volts: number | null): void }
export interface McuEngine extends Engine { readonly board: string; readonly language: Language; readonly tier: 'T1' | 'T3'; load(image: ProgramImage): LoadResult; reset(reason: 'power' | 'button' | 'brownout' | 'watchdog' | 'code'): void; readonly pins: PinPort; serialWrite(text: string, at: SimTime): void; readonly costModel: { kind: 'per-statement'; opNs: number } | { kind: 'cycle'; rate: ClockRate } }   // `serialWrite` stands in for SIMULATION's `serial: SerialPort`; `attachBus` and `debug` arrive with B9
export interface DigitalLayer { load(net: SimNetlist): SimDiagnostic[]; onPin(pin: string, level: 0 | 1 | 'Z', duty: number | undefined, at: SimTime): void; partStates(): PartState[]; stateHash(): string }
export type PartState = { part: string; kind: 'led'; lit: boolean; brightness: number; provenance: 'approximation'; tier: 'T0' } | { part: string; kind: 'buzzer'; on: boolean; hz: number; provenance: 'approximation'; tier: 'T0' } | { part: string; kind: 'button'; pressed: boolean } | { part: string; kind: 'not-modelled'; reason: string };
export interface AnalogHook { read(net: string): { modelled: false; reason: 'not modelled yet' } }
// orchestrator.ts  (SIMULATION 5.6, spec signatures; engines and the digital layer arrive through the factory, PD-18)
export interface Orchestrator {
  load(net: SimNetlist, opts: SimRunOptions): LoadResult;
  runUntil(target: SimTime, budget: SliceBudget): SliceResult;               // never reads a wall clock
  step(unit: StepUnit, n: number): SliceResult;
  inject(input: HostInput): void;                                            // stamped with `now` and the next seq, appended to `inputs`
  readonly now: SimTime;
  readonly state: 'idle' | 'running' | 'paused' | 'halted' | 'done';
  readonly inputs: readonly InputEntry[]; readonly checkpoints: readonly { at: SimTime; hash: string }[]; pinEdges(): readonly PinEdge[];   // B3 reads for the recorder (T-B3-19)
}
export function createOrchestrator(parts: { engines: Engine[]; digital: DigitalLayer }): Orchestrator;
export interface PinEdge { at: SimTime; net: string; level: 0 | 1 | 'Z' | 'X' }
```

| Field | Content |
|---|---|
| Algorithm | `queue.ts`: binary min-heap on `(at, phase, rank, seq)`, capped at 1,000,000 pending events (overflow halts with `event-queue-overflow`). `runUntil`: `horizon = min(target, now + 1_000_000, every non-null nextDue of the engines, queue.peekTime())`; each engine's `advanceTo(horizon, budget)` runs and its events come through the sink it got in `attach`; then pop every event at the next time in order. Pin writes from an MCU engine are P2 rank 30; the digital layer resolves them at P3 rank 10; part states refresh at P3; input entries are P0. `step(unit, n)`: `'ns'` is `runUntil(now + n, budget)` with a budget that never yields; `'event'` pops and delivers exactly `n` events, advancing engines to each event time first (when the queue is empty it advances to the smallest `nextDue`); any other unit returns `{ reason: 'unsupported', now }`. `inject(input)` appends `{ at: now, seq, ...input }` to `inputs` with a strictly increasing `seq` and enqueues it at P0. Every 1,000,000,000 ns the orchestrator builds one `StateHasher` (T-B3-10), feeds it each `engine.id` and `engine.stateHash()` in registration order and then `digital.stateHash()`, and stores `{ at, hash: hasher.hex() }`. `no-time-progress`: if 10,000,000 work units pass with the clock moving less than 1 ns, halt with that diagnostic (SIMULATION 6.8 rule 4). `resolve.ts` implements SIMULATION 5.7 (`resolve(drivers)`, strengths, `Z`, `X`, `output-contention`); `pwm.ts` turns `{ duty, hz }` into `edgesBetween(a, b)` (rising at `floor(k * 1e9 / hz)`, falling at that plus `round(duty * 1e9 / hz)`) and `averageDuty` |
| State transitions | `idle` to `running` on `runUntil`; `running` to `paused` on budget; to `done` at `opts.endNs`; to `halted` on a diagnostic that halts. `halted` is final until `load` |
| Validation and errors | `load` returns `ok: false` and a `SimDiagnostic` (`id` `unknown-ground`, `duplicate-part`, `missing-net`, `netlist-too-large`) for an unknown ground net, duplicate part ids, a pin naming a missing net, or a part count over 2,000 (SIMULATION 8.8 netlist cap) 
| Edge cases | Two events at one time and phase with the same rank order by `seq`; `target` below `now` is a no-op; an engine whose `nextDue()` is `null` (it never limits the horizon); `step('cycle', 1)` returns `unsupported` |
| Performance | The heap handles 1e6 push and pop in under 1.5 s in Node (ESTIMATED; printed); orchestrator overhead under 20 percent over bare `Run.step` on the Blink corpus (measured in T-B3-19) |
| Migration | none |
| Unit tests | `queue.test.ts`: order on 1,000 schedules drawn from `rng(0x5eed, 'queue-test')` (never `Math.random`) equals a sort by the tuple; overflow at the cap; the 1e6 timing uses `performance.now()`, which is allowed in test files (T-B3-10 `ignores`). `orchestrator.test.ts` with fake engines (written to the `Engine` of this file: `nextDue(): SimTime | null`, `advanceTo`, `stateHash()`): phase order P0..P6; same-rank registration permuted gives equal checkpoint hashes (SA-08); `inject` stamps `now` and orders by `seq`; `step('ns', 1_000_000)` equals `runUntil(now + 1_000_000)` (same hashes); `step('event', 3)` delivers exactly three events and leaves `now` at the third event's time; `step('statement', 1)` gives `unsupported`; `no-time-progress`; solver hook says not modelled; load diagnostics; `RANK.ros` is 35. `resolve.test.ts`: strong vs weak, two weak disagree, `Z`, contention diagnostic. `pwm.test.ts`: 490 Hz at 25 percent gives the expected edge times; average duty over 10 cycles |
| Acceptance | Given two same-rank fake engines registered in either order, When both runs finish, Then all checkpoint hashes are equal |
| Release blockers | A reference to `Date`, `performance`, `Math.random` or a DOM name in `src/sim` (lint and `PT` fail) |
| Definition of done | Tests pass; `TL`, `PT` green; SA-08 second clause shown |
| Verify | `TL`; `PT`; `V src/sim` |
| Docs | runtime diagram in `docs/ARCHITECTURE.md` (T-B3-25) |
| Rollback | Revert; nothing imports it before T-B3-12 |
| Later tasks need | 12 implements `McuEngine`; 15 implements `DigitalLayer` and `buildSimNetlist`; 13 hosts the orchestrator (`createOrchestrator({ engines, digital })`); 19 records inputs and checkpoints by calling the orchestrator directly |

### T-B3-17. Solver II: element stamps, `pwl` iteration, convergence flag

| Field | Content |
|---|---|
| Identity | Subsystem analog solver (SIM-1). Phase B3. Priority should (F-045, R-046). Depends on T-B3-16. Status not started |
| Problem | `solveSlice` and `solveCircuit` (`figures/engine/bench-solve.js:143-212`, `:249-410`) mix stamping, junction iteration, PWM slicing, motor conductance and part reports in one body with `B.*` globals. The extraction must separate them and add what the old code lacks: a convergence flag, a residual and named diagnostics |
| User and story | Amar: "the solver says when it did not converge instead of printing a wrong number" |
| Expected behaviour | `solve(input, options)` in `pwl` mode returns the SIMULATION 7.2 `SolveResult` and reproduces the old numbers. PWM elements are solved per duty slice and time-averaged as the old code does. Motors enter as a conductance `gm`, found by the old outer loop (up to 6 passes, 1 percent change) through an optional `curve(vAvg) => amps` hook |
| Success metric | Convergence report on every circuit: the three constructed non-convergent circuits report `no-convergence` with the worst node (SA-04); zero silent exits |
| Existing files | `figures/engine/bench-solve.js:143-212` (`solveSlice`: 40 rounds, `ROUNDS` at `:10`, loop `:148`, `linsolve` call `:184`, junction state updates `:185-211`, exit `:212`), `:249-300` (`solveCircuit`: PWM slices, motor passes at `:266`), `:306-410` (part reports and damage rules, NOT moved here: they are part-model rules for B10 and B11). Frozen |
| New files | `src/sim/analog/solve.ts`, `elements.ts`; tests beside them |
| Interfaces | |

```ts
// elements.ts
export const PWL_COMPAT = { railOhms: 0.5, pinOhms: 25, rbeOhms: 2, rsatOhms: 0.01, gminSiemens: 1e-9, rounds: 40, motorPasses: 6 } as const;  // bench-solve.js:10; values read by callers, never hard-coded in solve.ts
export function stampElement(el: Element, A: Float64Array[], b: Float64Array, ix: (node: number) => number, st: PwlState): void;
// solve.ts
export interface SolveInput { nodes: number; elements: Element[]; ground: number; pwmSlices?: Array<{ weight: number; high: (el: Element) => boolean }>; curve?: (elementId: string, vAvg: number) => number }
export function solve(input: SolveInput, o: SolveOptions): SolveResult;
```

| Field | Content |
|---|---|
| Algorithm | For each slice: loop up to `rounds` times: build `A` and `b` with `gmin` on the diagonal, stamp rails (`GV` to ground through `railOhms`), pins (`GV` through `pinOhms` to `vHigh` or 0), each element by kind and current junction state, `linsolve`, then update junction states with the old rules (diode on above `vf + 1e-6`, off below `vf - 1e-6`; NPN inverse detection `1e-3`, on above `vbe + 1e-6`, saturation by `vcesat`, back to active by `(Vy - Vx - vcesat) / rsat > beta * ib + 1e-7`). Stop when no state changed. After the loop compute branch currents and powers as the old `out.el`. Convergence: `converged = !changed` at exit; if the loop used all rounds and still changed, add a `SolveDiagnostic` with `id: 'no-convergence'`, `ref.net` and `args.node` set to the node of the largest KCL residual, and set `strategy: 'direct'`. Residual: the largest absolute sum of currents at any node (SIMULATION 6.9 D-residual). Condition number above 1e15: a diagnostic `ill-conditioned`. A node with no pivot: `floating-node` (the old code set it to 0 V silently, kept, now reported). Kinds the solver cannot express return `not-modelled-yet` for that element and the rest still solves |
| Validation and errors | Throws `RangeError` for node indexes out of range or a negative resistance; `NaN` anywhere halts with a `numeric-fault` `SolveDiagnostic` |
| Edge cases | No elements; all nodes floating; two sources fighting; a PWM duty of exactly 0 or 1 (no slice); duties 0.25 and 0.75 (three slices); LED reversed; NPN with base open; a stalled motor (`gm = 1 / ohms`) |
| Performance | Largest golden circuit (14 nodes, 17 elements) under 0.3 ms in Node; a synthetic 150-node mixed circuit measured and printed (SA-07 groundwork, not gated here) |
| Migration | none |
| Unit tests | `elements.test.ts`: each stamp on a 3-node toy matrix equals a hand-computed matrix. `solve.test.ts`: divider 10k/10k from 5 V gives 2.5 V within 1e-9; LED with 220 ohm from a 5 V pin gives the old 12.2 mA (value from `figures/engine/bench-solve.test.mjs` case "Blink"); resistor-less LED reports a current far above 20 mA; three constructed non-convergent circuits (an NPN loop that flips each round, a diode ring with a contradictory source pair, a PWM slice pair that flips) end `converged: false` with `no-convergence` and a node index |
| Integration | The 99-circuit equivalence is T-B3-18 |
| Acceptance | Given a circuit whose junction state flips every round, When `solve` runs, Then `converged` is `false`, `iterations` equals `rounds`, and `diagnostics` holds `no-convergence` with the worst node |
| Release blockers | Any constant duplicated outside `PWL_COMPAT`; an edit under `figures/` |
| Definition of done | Cases pass; `TL`, `PT` green |
| Verify | `TL`; `PT`; `V src/sim/analog` |
| Docs | solver section in `docs/ARCHITECTURE.md` (T-B3-25) |
| Rollback | Revert |
| Later tasks need | 18 proves equivalence; B8 adds the netlist-to-element mapping, `newton` mode and transient behind the same signature |

### T-B3-05. `.iynk` and `.iynkz`: read, write, file I/O

| Field | Content |
|---|---|
| Identity | Subsystem export and local files. Phase B3. Priority must (F-201, R-037; AR-17). Depends on T-B3-S1 and B2. Status not started |
| Problem | There is no way to keep a project outside the browser. Browsers can evict IndexedDB, so a file copy is the durable one (ADR-0106 constraint 3) |
| User and story | Amar: "I save my project to a file, put it in git, and open it on another machine with the same hash" |
| Expected behaviour | `writeIynk(doc)` returns deterministic bytes for the envelope `{ format: "iynk.file", version: 1, hash, project }`. `readIynk(bytes)` checks size, parses strictly, validates, recomputes the hash; a hash mismatch is a warning, not a refusal. `writeIynkz` and `readIynkz` do the same for the zip container. `saveToFile` uses the File System Access API where it exists and a download elsewhere; `openFile` uses a file input where the API is missing |
| Success metric | Round trip: `stateHash(readIynk(writeIynk(doc)).project) === stateHash(doc)` on the five example files and on 20 documents from the T-B2-16 generators (DET-3) |
| B2 pieces reused (DOCUMENTED in `tasks/B2-core-document-netlist.md`) | `parseStrict(text, { maxBytes, maxDepth })` (T-B2-03: rejects duplicate keys, depth over 32, BOM, lone surrogates, size), `prettyPrint` and `canonicalize` (`src/core/canonical.ts`), `toFileText(doc)` and `normalizeForWrite` (`src/project/normalize.ts`, T-B2-09), `stateHash` and `canonicalBytes` (`src/project/hash.ts`), `migrate` (result kinds `current`, `migrated`, `newer`, `invalid`), `validateValue(value)` and `validateText(text)` with a `ValidationReport` (T-B2-08), and the generated `validateFileEnvelope` (T-B2-04). This task writes none of them again |
| Existing files | `04_ARCHITECTURE/schemas/project.schema.json` `$defs/FileEnvelope` (VERIFIED: `format` const `iynk.file`, `version` const 1, `hash` 64 hex, `project` the root schema). `src/project/generated/types.ts` has `FileEnvelope` and `generated/validate.mjs` has `validateFileEnvelope`; `toFileText` and `prettyPrint` already write the pretty form with one trailing LF; no `.iynk` reader or writer exists |
| New files | `src/export/zip.ts` (writer, streaming reader, limits; per S1; or an `fflate` wrapper with the same exports), `src/export/iynk.ts`, `src/export/iynkz.ts`, `src/local/files.ts`; edit `package.json` only if S1 chose `fflate` (a fifth file); tests beside them |
| Interfaces | |

```ts
// iynk.ts  (portable)
export type ReadReport = { ok: true; project: Project; hash: string; hashMatches: boolean; warnings: Diagnostic[] } | { ok: false; error: ImportError };
export type ImportError = { kind: 'too-large' | 'bad-json' | 'duplicate-key' | 'too-deep' | 'bad-envelope' | 'newer-schema' | 'invalid' | 'zip-bomb' | 'bad-path' | 'too-many-entries' | 'entry-too-large' | 'ratio' | 'svg-not-supported'; message: string; limit?: string; path?: string };
export function writeIynk(doc: Project): Uint8Array;                  // `prettyPrint({ format, version, hash, project: normalizeForWrite(doc) })`, which already ends in one LF; UTF-8 via the core encoder
export function readIynk(bytes: Uint8Array): ReadReport;
// iynkz.ts
export function writeIynkz(doc: Project, assets: Array<{ sha256: string; bytes: Uint8Array }>): Uint8Array;
export function readIynkz(bytes: Uint8Array): Promise<ReadReport & { assets?: Array<{ sha256: string; bytes: Uint8Array }> }>;
// files.ts  (browser, main thread)
export function saveToFile(bytes: Uint8Array, suggestedName: string, existing?: FileSystemFileHandle): Promise<{ handle?: FileSystemFileHandle; via: 'handle' | 'download' }>;
export function openFile(): Promise<{ name: string; bytes: Uint8Array } | null>;
```

| Field | Content |
|---|---|
| Algorithm and limits | Read: byte length at most 5 MiB for `.iynk` (PDM 13, `LIMITS.canonicalBytes`) and 128 MiB for `.iynkz`; `parseStrict`; `validateFileEnvelope`; `migrate(env.project, { at, app: "iynk" })` first (`at` is an ISO time from the injected `Clock`), so a `newer` version becomes `newer-schema` and the bytes are handed back unopened (M1 step 2 error case); then `validateValue(env.project)`; hash compare with `stateHash`. Container (PDM 12.1): entries `project.iynk`, `assets/<sha256>`, `definitions/`, `history/`, `manifest.json` (`{ format: "iynk.container", version: 1, entries: [{ path, bytes, sha256 }] }`); at most 1,000 entries, 16 MiB per entry, 128 MiB total, ratio 100 to 1, enforced while streaming; refuse `..`, absolute paths, drive letters, backslashes, duplicate and case-colliding names. Writer: sorted entries, timestamp 1980-01-01, no extra fields. Identity is the state hash inside `project.iynk`, not the zip bytes |
| SVG assets (PD-14) | B2 leaves `V5-SVG` and the SVG sanitiser to "asset import (B3)" (`B2-core-document-netlist.md` OQ-10), but no B3 row builds it. Until a sanitiser exists, `readIynkz` refuses any asset whose MIME type is `image/svg+xml` with `svg-not-supported` and names the file. The asset allow-list in B3 is `image/png`, `image/jpeg`, `image/webp`, `text/plain`, `application/octet-stream` |
| Validation and errors | As the `ImportError` kinds; each carries the limit it hit so the UI can name it (CM-17) |
| Edge cases | BOM at the start; CRLF; empty file; a zip with `project.iynk` missing; a manifest hash that does not match an entry (warning); a project made by a newer iynk inside a container |
| Permissions | P0. File System Access needs a user gesture; `saveToFile` is called from a click handler |
| Performance | `writeIynk` at 500 parts under 15 ms in Node (the canonicalise and hash cost is 3.84 ms there, PDM 9.6 VERIFIED, plus pretty-printing); printed |
| Migration | none |
| Unit tests | `iynk.test.ts`: round trip on the five examples (`schemas/examples/*.project.json`) and 20 generated documents; deterministic bytes (two writes equal); hash mismatch is a warning with `hashMatches: false`; each `ImportError` kind has a fixture; the secret-shape scan (`sk-`, `AIza`, PEM header) warns before write. `iynkz.test.ts`: round trip with assets; the ten hostile archives from S1 (bomb, traversal, 1,001 entries, 17 MiB entry, duplicate, case collision, truncated, bad CRC, missing `project.iynk`, ratio) each give the named error in under 2 s; an SVG asset gives `svg-not-supported`. `files.test.ts` (jsdom): with `showSaveFilePicker` undefined, `saveToFile` creates an anchor with a `blob:` URL and clicks it; with a fake picker it writes through the handle |
| Fixtures | The hostile archives are built in code by the test (no binary blobs committed) |
| Acceptance | Given a saved `.iynk`, When it is opened, Then the project hash equals the saved hash. Given a 10 MiB deflate bomb, When it is opened, Then the error names the ratio or size limit and nothing over 20 MiB was inflated |
| Release blockers | A hostile fixture that is accepted; a write that is not byte-identical on a second run |
| Definition of done | Cases pass; `TL`, `PT` green; the S1 verdict is cited in the commit body |
| Verify | `TL`; `PT`; `V src/export src/local/files.test.ts` |
| Docs | `docs/PROJECT_FILES.md` (T-B3-25) |
| Rollback | Revert; if `fflate` was added, the `package.json` change goes with it |
| Later tasks need | 08 (export-all) and 27 (worker `file.*` calls) use these; 24 runs the AR-17 round trip |

### T-B3-03. `ProjectWorker` and host: shadow copy, hash, validate, write

| Field | Content |
|---|---|
| Identity | Subsystem local storage and runtime. Phase B3. Priority must (F-200, F-203, R-035; FA-07, FA-08). Depends on T-B3-01, T-B3-22, B2. Status not started |
| Problem | Canonicalise plus hash costs 3.84 ms at 500 parts and 18.5 ms at the 2,000-part limit in Node (VERIFIED, PDM 9.6). That cannot share the thread with the editor. The roadmap puts canonicalise, hash, validate and every IndexedDB write in one `project` worker per tab |
| User and story | Amar: "saving never makes the page stutter, and if the worker dies my project is unchanged" |
| Expected behaviour | The worker logic lives in `project-handler.ts` (`createProjectHandler`), a pure `WorkerHandler`; `project.worker.ts` only calls `serveWorker(self, createProjectHandler({ repo, shadowFactory: createShadow, clock }))` after opening the database. So the same code runs in the real worker and in the inline-port tests. `ProjectHost` creates the worker lazily, asks `load` for a stored project, posts `open` with a state snapshot, then `commit` batches; the worker folds each batch into its shadow copy with the same `apply` and answers an ack. On `save` (sent by autosave, T-B3-04) the worker canonicalises, hashes, validates (V1 to V5 on open, cheap path on save), writes through the `Repository`, and answers `saved`, `save_failed` or `hash_mismatch`. If the worker dies, the host recreates it from the main-thread snapshot and reports `worker_restarted` |
| Success metric | FA-07 `project` half: after killing the worker mid-session the next `saved.hash` equals the main thread's hash and the stored record equals it; FA-08 numbers are measured later in T-B3-24 |
| Existing files | `src/lib/interp/check-client.ts:38` (worker creation literal that Turbopack follows), `src/lib/interp/check.worker.ts:1-14` (worker entry shape). Not edited. `Repository` and `RecordLoad` from T-B3-02. FA-01 binds this task: `src/local` may not import `src/project/apply/`, so the shadow is a `ProjectSession`, not an `applyBatch` loop. B2 contracts: `createSession` and `ProjectSession` (`subscribe` gives a `DocChange { from, to, ops, touched, origin }`), `applyBatch`, `stateHash`, `validateValue` (names from `tasks/B2-core-document-netlist.md`, read the real exports first) |
| New files | `src/local/project-protocol.ts`, `project-handler.ts`, `project.worker.ts` (wiring only), `project-host.ts`, `shadow.ts` (5 source files); tests `shadow.test.ts`, `project-host.test.ts` |
| Interfaces | |

```ts
// project-protocol.ts  (FRONTEND 8.2 table; the library, file and storage requests are added by T-B3-27)
export type ProjectReq =
  | { v: 1; id: number; t: 'load'; projectId: string }                  // ack result: { status: RecordLoad['status']; state?: Project; revision?: number; hash?: string }; emits recovered_from_previous or record_lost
  | { v: 1; id: number; t: 'open'; projectId: string; state: Project; revision: number }
  | { v: 1; id: number; t: 'commit'; fromRevision: number; toRevision: number; ops: OpEnvelope[] }
  | { v: 1; id: number; t: 'save'; reason: SaveReason }
  | { v: 1; id: number; t: 'close'; projectId: string }
  | { v: 1; id: number; t: 'revision'; revision: number; state: Project; stateHash: string };   // the session's onCompact snapshot (T-B2-10) goes to the revisions store
export type SaveReason = 'debounce' | 'maxwait' | 'hidden' | 'pagehide' | 'manual';
export type ProjectEv =
  | { v: 1; t: 'saved'; revision: number; hash: string; writtenAt: number }
  | { v: 1; t: 'save_failed'; kind: 'quota' | 'blocked' | 'conflict' | 'validation' | 'unavailable'; detail: string }
  | { v: 1; t: 'hash_mismatch'; revision: number; workerHash: string }
  | { v: 1; t: 'worker_restarted' }
  | { v: 1; t: 'recovered_from_previous'; projectId: string; revision: number }   // load or open fell back to the ~prev slot (RecordLoad 'recovered'); the page tells the person the last save was damaged and an older copy was opened
  | { v: 1; t: 'record_lost'; projectId: string }                                  // both slots failed their hash check (RecordLoad 'lost'); nothing was deleted
  | { v: 1; t: 'degraded'; reason: 'indexeddb-unavailable' };   // the worker fell back to the memory repository; projects are not kept (M1 step 1 banner)
// shadow.ts
export interface Shadow { readonly projectId: string; readonly revision: number; readonly doc: Project; fold(ops: OpEnvelope[], from: number, to: number): { ok: true } | { ok: false; reason: 'gap' | 'reject' }; hash(): string }
export function createShadow(projectId: string, doc: Project, revision: number): Shadow;
// project-handler.ts  (no Worker global: tested through createInlinePort)
export interface ProjectHandlerDeps { repo: Repository; shadowFactory: typeof createShadow; clock: Clock /* src/core/ids.ts */ }
export function createProjectHandler(deps: ProjectHandlerDeps): WorkerHandler<ProjectReq, ProjectEv>;
// project-host.ts  (main thread; matches the Repository facade of FRONTEND 6)
export interface ProjectHost {
  load(projectId: string): Promise<{ status: RecordLoad['status']; state?: Project; revision?: number; hash?: string }>;
  open(projectId: string, state: Project, revision: number): Promise<void>;
  commit(fromRevision: number, toRevision: number, ops: OpEnvelope[]): Promise<void>;   // folds into the worker's shadow; no write
  save(reason: SaveReason): Promise<void>;                                             // writes the shadow; the result arrives as saved or save_failed
  keepRevision(snap: { revision: number; state: Project; stateHash: string }): void;   // pass this as SessionOptions.onCompact (T-B2-10: "B3 supplies onCompact")
  onEvent(fn: (ev: ProjectEv) => void): () => void;
  kill(): Promise<void>;                                                               // test hook for FA-07
  readonly state: 'starting' | 'ready' | 'dead';
}
export function createProjectHost(opts?: { port?: RpcPort<ProjectReq, ProjectEv> }): ProjectHost;  // default builds the Worker; tests pass `createInlinePort(createProjectHandler({ repo: createMemoryRepository(), ... }))`
```

| Field | Content |
|---|---|
| Algorithm | `load`: `repo.load(id)`; `ok` and `recovered` return the stored document and hash (`recovered` also emits `recovered_from_previous`); `lost` emits `record_lost` and returns no document; `missing` returns `missing`. `open`: the worker validates the document (V1 to V5, once per open, off the interaction path, FRONTEND 8.4), recomputes the hash, compares with the stored one if the project exists, and keeps the shadow. `commit`: `fromRevision` must equal the shadow's revision, else answer `hash_mismatch` and expect a new `open`; `shadow.ts` holds a `ProjectSession` made by `createSession({ state, clock, rnd })` with a clock that returns `Date.parse(batch[0].at)` before each apply. `fold` groups the envelopes into batches by their `batch` id (the rule of `batchesOf` in `src/project/testing/harness.ts`, which is test support and not importable), calls `session.apply(batch.map((e) => e.op), batch[0].author)` (the session passes the batch invariants `checkBatch`, which a bare `applyBatch` would skip), and answers `reject` on a refusal. `stateHash` ignores `history`, `revision` and `meta.updatedAt`, so hashes match even though the session stamps its own `opId`s. After each batch the shadow calls `session.replace({ ...state, history: { ...state.history, ops: [...before, ...batch] } })` so the stored history holds the main thread's envelopes exactly (`replayFrom` in the harness does the same); `replace` forgets undo, which a shadow does not need. If the 20-session test of `shadow.test.ts` shows a hash or history difference, report it and do not edit `session.ts`. The caller takes the envelopes from `session.state.history.ops` where `seq` is above `fromRevision`; if compaction (T-B2-10, tail over 1,000) removed some, the caller sends `open` with a full snapshot instead. `save`: compute `hash()` and write `{ doc, hash, writtenAt }` with `expect = { revision: lastSavedRevision, hash: lastSavedHash }` (null before the first save); two `save` requests in a row write once if nothing was committed between them. Host: calls the worker through `createRpcPort`; on `onerror` or a timeout it kills, creates a new worker, replays `open` from the last main-thread snapshot it holds, and emits `worker_restarted` |
| State transitions | Worker: `starting` to `ready` (after `ready` message) to `dead`. Shadow: `empty` to `open(rev)` to `open(rev+n)`; a gap resets to `empty` and the host re-opens |
| Validation and errors | A document that fails V2 to V5 on open answers `save_failed: validation` with the first failing rule and is not written. Conflicts come from the repository `expect` check. If `openDb()` throws `unavailable`, the worker switches to `createMemoryRepository()` and emits `degraded`, so New, Save to file and Run still work for the session |
| Edge cases | `commit` before `open`; two `open` calls for different projects (second closes the first; one project open per tab in B3); a commit batch of 500 ops; structured-clone failure of an op (should be impossible, op values are JSON) |
| Permissions | P0. The worker has IndexedDB and no network |
| Performance | Main-thread cost of `commit` is one `postMessage` of the op batch (target under 1 ms for 20 ops, measured with the inline port by structured-clone time only). Save latency is measured in T-B3-24 |
| Migration | none |
| Unit tests | `shadow.test.ts`: fold equals applying the same ops in a `ProjectSession` (hash equal) on 20 generated sessions; a gap returns `gap`; a rejected op returns `reject` and leaves the shadow unchanged. `project-host.test.ts` (an inline port over `createProjectHandler` with a memory repository, fake timers; the handler is imported from `project-handler.ts`, never from `project.worker.ts`): `load` of a project whose current slot is garbage returns the previous version and emits `recovered_from_previous`; `load` with both slots garbage emits `record_lost`; open, commit, save gives `saved` with the hash of the main-thread state; kill the port, next commit triggers `worker_restarted` and `saved` hash equals the main-thread hash (FA-07 project half); a stale `fromRevision` gives `hash_mismatch` then recovery; a repository `conflict` gives `save_failed: conflict` and the document in memory is untouched; an invalid document on `open` is refused |
| Integration and e2e | The real Worker, real IndexedDB and Turbopack bundling are first exercised by T-B3-21 and T-B3-24 (`E e2e/core.spec.ts`) |
| Acceptance | Given an open project and 50 committed ops, When the worker is killed and one more op is committed and saved, Then the next `saved.hash` equals the hash of the main-thread state and the stored record equals it |
| Observability | `hash_mismatch` events are counted in `host.stats` for the Diagnostics panel |
| Release blockers | `project-handler.ts` or `project.worker.ts` importing anything with `document` or `window`; logic in `project.worker.ts` beyond the `serveWorker` line; the main thread canonicalising or hashing on the save path (a test spies on `canonicalize` imports from `project-host.ts` and expects none) |
| Definition of done | Cases pass; `TL` green; the `new Worker(new URL('./project.worker.ts', import.meta.url), { type: 'module' })` literal is in `project-host.ts` |
| Verify | `TL`; `V src/local` |
| Docs | worker table in `docs/ARCHITECTURE.md` (T-B3-25) |
| Rollback | Revert; the repository stays usable directly |
| Later tasks need | 04 (autosave calls `commit` and `save`), 27 (adds requests to `project-handler.ts`, `project-protocol.ts`, `project-host.ts`), 21 (uses `load` and the recovery events), 23, 24 |

### T-B3-06. Library, blank project, fork

| Field | Content |
|---|---|
| Identity | Subsystem library. Phase B3. Priority must (F-092, R-038, R-039; M1 step 2). Depends on T-B3-22, B2. Status not started |
| Problem | There is no project table, no trash, no way to make a project (audit A11). M1 step 2 needs "New project, board Uno" to make a valid document at once |
| User and story | Amar: "New project gives me an Uno project with a Blink sketch in the library; delete is not forever for 30 days" |
| Expected behaviour | `blankProject` builds a valid Uno project. `forkProject` makes a new project from any document. `Library` lists, creates, renames, duplicates (same code path as fork), deletes to trash, restores, empties trash, purges after 30 days |
| Success metric | Blank and forked documents validate; fork leaves the source byte-identical; trash purge matches the clock |
| Existing files | `04_ARCHITECTURE/schemas/examples/uno-blink-d12.project.json` (VERIFIED shape: `boards[0].definition.ref "core.uno-r3"`, `firmware { entry, language "arduino-cpp", sources }`, `sources[0].content`, `simulation { seed, runtimes: [{ id "rtm_main", board, engine "iynk-interp" }], solver: { engine "iynk-mna" }, world }`, views `vw_bb` and `vw_sch`) |
| New files | `src/local/library.ts`, `src/project/blank.ts`, `src/project/fork.ts`, `src/project/samples.ts`, `src/project/samples/uno-blink-d12.project.json` (5 source files; the JSON is a verbatim copy of the schema example, PD-20); tests beside them, including `samples.test.ts` |
| Interfaces | |

```ts
// src/project/blank.ts  (portable)
export interface BlankOptions { board: 'uno'; title: string; locale: string; actor: string; now: string /* Timestamp */; id: string /* caller makes it with newProjectId; portable code draws no randomness */ }
export function blankProject(o: BlankOptions): Project;    // revision 0; seed 625341585 (0x2545f491, the world.ts default); one board brd_uno; sources [src_main main.ino with a Blink that blinks `LED_BUILTIN` (D13 on the Uno) and prints "blink" to Serial each cycle]; views vw_bb and vw_sch; no components, no nets. It therefore has no ground net, no LED part and no wire to D13: the on-board LED is not a document component. The blank project is NOT a run sample (PD-20): `buildSimNetlist` reports `no-ground` for it
// src/project/samples.ts  (portable; JSON import attribute `with { type: "json" }`, as `src/parts/builtin.ts` does)
export function sampleBlinkD12(): unknown;                  // the parsed uno-blink-d12 example: 3 nets (net_d12, net_gnd of class ground, net_led), cmp_bb1, cmp_led1, cmp_res1, a sketch that writes D12 every 500 ms. Callers pass it through validateValue before use
export const SAMPLE_BLINK_D12_ID = 'prj_uno-blink-d12';
// src/project/fork.ts
export function forkProject(src: Project, o: { id: string; now: string; actor: string; title?: string }): Project;  // new id, revision 0, history reset, provenance.origin { kind: 'fork', project, revision, stateHash }
// src/local/library.ts
export interface Library {
  list(): Promise<LibraryRow[]>;                       // newest updatedAt first, archived hidden
  create(o: { board: 'uno'; title?: string }): Promise<string>;
  rename(id: string, title: string): Promise<void>;
  fork(id: string, o?: { title?: string }): Promise<string>;   // duplicate is fork
  trash(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  emptyTrash(): Promise<number>;
  purgeExpired(): Promise<number>;                      // 30 days
  trashList(): Promise<Array<{ id: string; name: string; deletedAt: number }>>;
}
export function createLibrary(deps: { repo: Repository; clock: Clock; rnd: RandomSource; actor: string }): Library;   // Clock and RandomSource from src/core/ids.ts (T-B2-02); ids from newProjectId
```

| Field | Content |
|---|---|
| Algorithm | `blankProject` fills every required top-level key of the schema (`format, schemaVersion, id, revision, meta, actors, access, boards, components, nets, views, sources, simulation, parameters, assets, dependencies, tests, history, provenance, license`; VERIFIED list), `provenance.origin` `{ kind: 'blank' }`, license `LicenseRef-iynk-pending`. `forkProject` deep clones, sets a new id, `revision: 0`, `history` to an empty chain with `baseChain` equal to the source `stateHash`, `meta.createdAt` and `updatedAt` to `now`, and `provenance.origin` to the fork variant. Rename applies the `meta.set` op through a `ProjectSession` (`createSession`; FA-01 bars `apply` outside `src/project`) so the revision and hash change by the normal rules. `src/project/testing/harness.ts` `newProject` already builds a valid Uno project for tests (ids `brd_main`, `vw_main`, `src_main`, no `vw_sch`); `blankProject` is the product version with the ids above. Production code does not import the harness; either make `newProject` call `blankProject` when the output matches, or say in the commit body why two builders exist. Trash retention: 30 days (PROPOSAL, R-038); `purgeExpired` calls `repo.purgeTrash(now - 30 days)` |
| Validation and errors | Empty or over-120-character title rejected (`meta.title` bounds 1..120 in the schema); renaming a trashed project fails `not_found`; restore of an id that is live fails `exists` |
| Edge cases | Forking a project with assets (assets are referenced by hash and shared); forking a document that fails validation (refused); duplicate ids (new id generator collision retried 3 times) |
| Performance | `create` under 30 ms in Node with the memory repository |
| Migration | none |
| Unit tests | `blank.test.ts`: validates with `validateProject`; has exactly one board, one source named `main.ino`, views `vw_bb` and `vw_sch`, empty `components` and `nets`, a `simulation.seed`; hash is stable across two calls with the same inputs. `fork.test.ts`: new id, `revision 0`, origin kind `fork` naming the source id, revision and hash; source untouched (deep equal before and after); forks validate. `samples.test.ts`: the copied JSON is byte-identical to `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/uno-blink-d12.project.json` (reads both files); `validateValue(sampleBlinkD12())` has no errors; the sample has a net of class `ground`, exactly one `cmp_led1` and a source that contains `digitalWrite(LED_PIN, HIGH)` with `LED_PIN = 12`. `library.test.ts` (memory repo, fake clock): create then list; rename changes revision; fork lists both; trash hides, restore returns, 31 days later `purgeExpired` removes; emptyTrash count |
| Acceptance | Given an empty library, When `create({ board: 'uno' })` runs, Then `list()` returns one row with board `core.uno-r3` and the stored document validates (M1 step 2) |
| Release blockers | A blank document that fails V1 to V5 (it is the base of every later phase) |
| Definition of done | Cases pass; `TL`, `PT` green (`blank.ts` and `fork.ts` are portable) |
| Verify | `TL`; `PT`; `V src/project/blank.test.ts src/project/fork.test.ts src/local/library.test.ts` |
| Docs | `docs/PROJECT_FILES.md` (T-B3-25) |
| Rollback | Revert |
| Later tasks need | 27 exposes `Library` through the worker; 21 lists and creates; 23 and 24 run the sample (`sampleBlinkD12`), never `blankProject`; B4 reuses `blankProject` for New project |

### T-B3-07. Provider keys move into the `keys` store

| Field | Content |
|---|---|
| Identity | Subsystem local keys. Phase B3. Priority must (B1 task T-B1-01 says "B3 moves this into the IndexedDB `keys` store (T-B3-07)"). Depends on T-B3-22 and B1 (T-B1-01). Status not started |
| Problem | B1 keeps keys in `localStorage["iynk:keys:v1"]` as `KeysDoc { v: 1; ai: { key, label? } \| null; search: { key } \| null; server: { token } \| null }` behind a synchronous API (`setKey`, `readSecret`, `getMasked`, `useKeys`, `subscribeKeys`, `redact`). ADR-0106 and SYSTEM 8.1 row 9 put provider keys in the `keys` store so they sit apart from `projects` and cannot ride into an export |
| User and story | Amar: "the keys I pasted in B1 still work after the upgrade, and no export ever contains them" |
| Expected behaviour | `src/local/keys-backend.ts` reads and writes `keys` rows. `src/lib/keys/store.ts` keeps its synchronous API but backs it with an in-memory mirror that `hydrateKeys()` fills from the store at boot. The first run moves the `ai` and `search` slots out of `iynk:keys:v1` into rows keyed `slot:ai` and `slot:search` (PD-19), checks they read back, then removes those slots from the localStorage document. The `server` slot (a bearer token that B1 uses before device identity exists) stays in `iynk:keys:v1` until B6 replaces it with the device key in the `identity` store (SYSTEM 8.1 row 19). Open question U-11 |
| Success metric | After migration `iynk:keys:v1` holds no `ai` or `search` secret; the `keys` store holds rows `slot:ai` and `slot:search`; `readSecret("ai")` returns the same text; B1's tests still pass |
| Existing files | The departure from SYSTEM 8.1 row 9 (rows keyed by provider id) is PD-19. `src/lib/keys/store.ts` (`KEYS_STORAGE_KEY` :10, `KeysDoc` :16, `currentDoc` :82, `write` :104, `setKey` :121, `removeKey` :136, `removeAllKeys` :142, `getMasked` :159, `readSecret` :164, `subscribeKeys` :169, `useKeys` :197, `redact` :202) and `src/lib/keys/index.ts`, built by T-B1-01; the agent quotes the lines it edits in the commit body. `removeAllKeys` and the `persisted` flag of `MaskedKey` stay. B1 rules to keep: `readSecret` is imported only by `src/lib/keys/headers.ts` (`boundary.test.ts`), so the new backend must not import it, and `src/lib/keys` must not import `src/local` (design M-6 of section 3.1); the storage key name `KEYS_STORAGE_KEY = "iynk:keys:v1"`; the `redact` canary tests. `src/lib/progress/storage.ts:5` for the naming pattern |
| New files | `src/local/keys-backend.ts`; edit `src/lib/keys/store.ts` (adds the `KeysBackend` and `KeyRow` types, `hydrateKeys`, `restoreKeysToLocalStorage`), `src/lib/keys/index.ts` (re-export); tests `src/local/keys-backend.test.ts`, `src/lib/keys/hydrate.test.ts` |
| Interfaces | |

```ts
// src/lib/keys/store.ts additions (the interface lives here, so lib/keys never imports src/local)
export interface KeyRow { providerProfile: null /* the ProviderProfile arrives in B14, AI_ARCHITECTURE 9.1 */; key: string; label?: string; addedAt: number; lastUsedAt: number | null }
export type KeySlot = 'ai' | 'search';
export interface KeysBackend { load(): Promise<Record<KeySlot, KeyRow | null>>; save(slot: KeySlot, row: KeyRow | null): Promise<void> }   // rows are stored under the keys 'slot:ai' and 'slot:search'
export function hydrateKeys(backend: KeysBackend): Promise<{ moved: string[]; degraded: boolean }>;   // idempotent; awaited once at app start; the caller passes the backend
export function restoreKeysToLocalStorage(backend: KeysBackend): Promise<{ restored: KeySlot[] }>;     // the revert path: copies both rows back into iynk:keys:v1 and deletes them from the backend; used only by a person (or script) reverting this commit
// src/local/keys-backend.ts  (browser; imports nothing from src/lib/keys; returns an object of the KeysBackend shape)
export interface StoredKeyRow { providerProfile: null; key: string; label?: string; addedAt: number; lastUsedAt: number | null }   // the same fields as KeyRow, written out so local does not import lib
export function createKeysBackend(db: Pick<IDBDatabase, 'transaction'>): { load(): Promise<Record<'ai' | 'search', StoredKeyRow | null>>; save(slot: 'ai' | 'search', row: StoredKeyRow | null): Promise<void> };   // structural typing makes it a KeysBackend; the call `hydrateKeys(createKeysBackend(db))` in ProjectList.tsx fails to compile if the two shapes drift. Keys are deliberately not part of the Repository interface
```

| Field | Content |
|---|---|
| Algorithm | `hydrateKeys`: load rows from the backend; read the `iynk:keys:v1` document; for each of `ai` and `search` that is set in localStorage and not in the backend, `save` the row (`addedAt` = now), `load` again and compare, then rewrite the localStorage document with that slot set to `null` (keeping `v` and `server`). The mirror then holds `ai` and `search` from the backend and `server` from localStorage. `restoreKeysToLocalStorage`: load both rows, write them into the `iynk:keys:v1` document (keeping `v` and `server`), read back, then `save(slot, null)` for each; a second call restores nothing. Writes after hydration go to the backend first (fire and forget with the `persisted` flag as in B1), then update the mirror and notify subscribers. If IndexedDB is unavailable or any step throws, nothing is removed from localStorage and `degraded: true` is returned, so B1 behaviour continues |
| Validation and errors | A row without a string `key` is ignored; unreadable JSON leaves everything in place |
| Edge cases | Two tabs migrating at once (the `save` is idempotent; the second compare passes); IndexedDB blocked (degraded); callers that run before hydration get "not set up", the same as an empty store today; the `storage` event from another tab no longer carries `ai` and `search` changes, so the backend notifies other tabs through `BroadcastChannel('iynk-keys')` (id only, never the secret) |
| Permissions | This and B1's store are the only code that touches key text. Keys never enter `project`, `.iynk`, `.iynkz`, a log or an event. In B3 the read happens on the main thread; B14 moves reads into the `AiWorker` (SYSTEM 6.8) |
| Performance | `hydrateKeys` under 20 ms |
| Migration | The move above, one way. Revert plan: reverting the commit leaves the secrets in IndexedDB while B1 code reads `localStorage`; the commit therefore includes `restoreKeysToLocalStorage()` (in the interface block above, used only by that revert, listed in the commit body, removed in B4) |
| Unit tests | `keys-backend.test.ts` (fake-indexeddb): save and load round trip under the keys `slot:ai` and `slot:search`; delete; a row planted under another key is ignored. `hydrate.test.ts`: happy path moves `ai` and `search`, leaves `server`; interrupted move (throw after `save`) leaves both copies and no data loss; degraded mode keeps localStorage; the canary secret is absent from `localStorage["iynk:v1"]` and from a `JSON.stringify` of `getMasked`; second call is a no-op. `restoreKeysToLocalStorage`: after a hydrate, restore puts both secrets back into `iynk:keys:v1`, empties the backend rows and keeps `server`; a second call restores nothing; an interrupted restore (throw after the localStorage write) leaves both copies. All B1 key tests pass unchanged |
| Acceptance | Given a profile with `ai` and `search` keys in `iynk:keys:v1`, When the app starts and `hydrateKeys()` resolves, Then `localStorage` holds no `ai` or `search` secret, `keys` holds both rows, and `readSecret("ai")` returns the original text |
| Release blockers | A key text in any `exportAll` output (T-B3-08 scans) or log line; `readSecret` imported outside `headers.ts` |
| Definition of done | Cases pass; `TL` green |
| Verify | `TL`; `V src/local/keys-backend.test.ts src/lib/keys` |
| Docs | `docs/DATA_HANDLING.md` (B1) gets one line: keys live in IndexedDB `keys` (T-B3-25) |
| Rollback | As the Migration row |
| Later tasks need | B14 `AiWorker` reads the `keys` store and migrates the two `slot:` rows to provider-id rows (PD-19); 08 never reads it; 21 awaits `hydrateKeys(createKeysBackend(db))` at start |

### T-B3-08. Local data export and wipe

| Field | Content |
|---|---|
| Identity | Subsystem local data. Phase B3. Priority should (F-168, R-049). Depends on T-B3-22, T-B3-05 and T-B3-10 (`src/local/export-all.ts` imports `src/export`; M-4 of section 3.1, nothing to open). Status not started |
| Problem | There is no way to take everything out or to remove everything. R-049 asks for both, plus the AI-data delete of RC-09 |
| User and story | Amar: "Export everything gives me one archive; Wipe removes every trace and tells me what it removed" |
| Expected behaviour | The work is split by thread, because a dedicated worker has no `localStorage`, no page `ServiceWorkerContainer` it can reliably unregister, and Cache Storage is better cleared where the registration lives. Worker half (IndexedDB only): `exportAll` returns one `.iynkz`-style archive with every live project as `<id>.iynk`, a settings JSON given to it as text, and a `manifest.json`; it never reads `keys`, `server`, `identity` or `journal`. `wipeStores` clears all 19 stores. `deleteAiData(projectId?)` clears the six stores of RC-09 in one transaction. Main-thread half: `wipeBrowser` removes every `localStorage` key that starts with `iynk:` (today `iynk:v1`, `iynk:keys:v1`, which `removeAllKeys` also clears, and `iynk:log:v1` from `src/lib/telemetry/client.ts:15`; the list is read from the storage, not hard-coded), every Cache Storage entry named `iynk-*`, and unregisters the service worker. `mergeWipeReports` joins the two halves into one `WipeReport`; T-B3-27 makes the host call both |
| Success metric | The archive opens (T-B3-05 reader) and holds one `.iynk` per project with equal hashes; after `wipeStores` and `wipeBrowser`, `indexedDB.databases()` shows `iynk` empty and `caches.keys()` has no `iynk-*` |
| Existing files | `src/lib/progress/storage.ts:5` (`STORAGE_KEY`; its name is the one string `wipeBrowser` removes and the main thread reads for `settingsJson`) |
| New files | `src/local/wipe.ts`, `src/local/export-all.ts`; tests beside them |
| Interfaces | |

```ts
export interface WipeReport { stores: string[]; localStorageKeys: string[]; caches: string[]; serviceWorkers: number; errors: string[] }
export const WIPE_PHRASE = 'wipe iynk';
// worker half: touches IndexedDB through the repository and nothing else (no localStorage, caches or navigator)
export function wipeStores(repo: Pick<Repository, 'clearStores'>, confirmation: string): Promise<Pick<WipeReport, 'stores' | 'errors'>>;   // confirmation must equal WIPE_PHRASE, else throws bad_confirmation and removes nothing
export function deleteAiData(repo: Pick<Repository, 'clearStores'>, projectId?: string): Promise<void>;  // ai_threads, ai_log, ai_usage, ai_memo, ai_debug, proposals
export function exportAll(deps: { repo: Repository; settingsJson: string | null; now: () => number }): Promise<Uint8Array>;   // settingsJson is the text of the `settings` field of localStorage.getItem('iynk:v1'), read by the main thread and sent in the request
// main-thread half: browser storage only
export function wipeBrowser(deps: { local: Storage | null; caches: CacheStorage | null; sw: ServiceWorkerContainer | null }, confirmation: string): Promise<Pick<WipeReport, 'localStorageKeys' | 'caches' | 'serviceWorkers' | 'errors'>>;
export function mergeWipeReports(a: Pick<WipeReport, 'stores' | 'errors'>, b: Pick<WipeReport, 'localStorageKeys' | 'caches' | 'serviceWorkers' | 'errors'>): WipeReport;
```

| Field | Content |
|---|---|
| Algorithm | `exportAll`: `repo.list()`, for each id `repo.load` (a `recovered` record is exported and named in the manifest `warnings`; `lost` and `missing` are skipped and listed), `writeIynk`, add; the `settingsJson` text is added as `settings.json` (no `Storage` read happens here); zip with the T-B3-05 writer; a secret-shape scan (`sk-`, `AIza`, PEM header, 40+ hex) over every text entry warns in the manifest `warnings`. `wipeStores` and `wipeBrowser` each check the confirmation first (a wrong one throws `bad_confirmation` and removes nothing), then run each removal and record names even if one fails (failure is listed under `errors`). Order in the host (T-B3-27): check the phrase on the main thread, `wipeStores` in the worker, `wipeBrowser` on the main thread, `mergeWipeReports` |
| Validation and errors | `WipeReport.errors` for partial failures; the UI says what is left |
| Edge cases | Zero projects (archive has only settings and manifest); a project that fails to load (skipped, listed); IndexedDB unavailable (the worker is on the memory repository, `wipeStores` clears it, and `wipeBrowser` still clears `localStorage` and caches) |
| Permissions | P0. Wipe is destructive; it requires the typed phrase, not a click. `src/local/export-all.ts` imports `src/export` (M-4, section 3.1) |
| Performance | Export of 20 projects of 500 parts under 2 s in Node (ESTIMATED) |
| Migration | none |
| Unit tests | `export-all.test.ts`: archive round trip equals each project hash; `keys` rows planted in the repository do not appear; secret-shaped text in a source triggers a warning. `wipe.test.ts`: wrong phrase removes nothing in either half; right phrase makes `wipeStores` empty every store (run with `vi.stubGlobal('localStorage', undefined)` and `caches` and `navigator.serviceWorker` removed, which is what a dedicated worker looks like) and makes `wipeBrowser` remove `iynk:v1`, delete fake caches named `iynk-*`, leave a cache named `other` and call `unregister` on every fake registration; `mergeWipeReports` joins them; `deleteAiData` clears exactly six stores and leaves `keys`, `server`, `identity`, `journal`. `export-all.test.ts` also runs with `localStorage` undefined and gets its settings only through `settingsJson` |
| Acceptance | Given three projects and a provider key, When `exportAll` runs in a context with no `localStorage`, Then the archive has three `.iynk` files, the given `settings.json` and no key text anywhere |
| Release blockers | Key text in an archive |
| Definition of done | Cases pass; `TL` green |
| Verify | `TL`; `V src/local/export-all.test.ts src/local/wipe.test.ts` |
| Docs | `docs/DATA_HANDLING.md` wipe line (T-B3-25) |
| Rollback | Revert |
| Later tasks need | 27 exposes both halves through `host.data` (the host reads `localStorage` and passes `settingsJson`, and runs `wipeBrowser` itself); 23 shows the buttons; B14 uses `deleteAiData` |

### T-B3-12. Interpreters as `McuEngine`

| Field | Content |
|---|---|
| Identity | Subsystem MCU engines (SIM-0). Phase B3. Priority must (F-038, F-041, R-042, R-044). Depends on T-B3-11. Status not started |
| Problem | The orchestrator talks to `McuEngine`; the interpreters talk through `Run`. A wrapper must keep behaviour identical (SIMULATION 8.1: "`Run` is wrapped, not replaced") |
| User and story | Amar: "my sketch behaves exactly as before, now inside the orchestrator" |
| Expected behaviour | `createInterpEngine(opts)` implements `McuEngine` over `createRun`, for `arduino`, `python` and `verilog` with one class. `advanceTo(horizon, budget)` calls `run.step` in the orchestrator's 1 ms slices and returns `{ reached, stoppedEarly }`; every pin edge reaches the orchestrator as a P2 event with its own timestamp, through the sink given in `attach`; serial text arrives with `at`; `stateHash()` builds a `StateHasher` (T-B3-10) and folds virtual time, pin modes and levels and serial length. Types come from `src/sim/engine.ts` (T-B3-11). In this task `RunOptions` always means `src/lib/interp/run.ts:14`; the orchestrator's options type is `SimRunOptions` |
| Success metric | For every lesson reference job, serial text and the pin edge list from the engine equal `runHeadless`'s trace (SA-01 groundwork) |
| Existing files | This file imports from `src/lib/interp` (M-3 of section 3.1: `sim-host` is not an enforced module, so no cell is needed; keep the imports inside that folder). `src/lib/interp/run.ts:59-96` (`Run`), `:98` (`createRun`), `:131` (constructor), `:245` (`step`); `src/lib/interp/world.ts:368-377` (`onPinWrite`, `edge()` with the 20,000-edge `trace` cap at `:375`), `:141` (`pins` map, public); `src/lib/interp/profiles.ts:108-210` (`opUs`); `src/lib/interp/pins.ts:34-50` (`netResolver`); `src/lib/interp/headless.ts:194` (wall-clock budget; not used by this adapter) |
| New files | `src/sim-host/engines/interp-engine.ts`; test `src/sim-host/engines/interp-engine.test.ts` |
| Interfaces | |

```ts
export interface InterpEngineOptions { id: string; board: BoardId /* src/lib/interp/profiles.ts:6 */; variant?: string; language: InterpLanguage /* profiles.ts:20: 'arduino' | 'python' | 'verilog' */; seed: number; devices?: DeviceKind[]; world?: WorldOptions; params?: Record<string, number> }
export function createInterpEngine(o: InterpEngineOptions): McuEngine & { run: Run; serialLog: ReadonlyArray<{ at: SimTime; text: string }> };
export function opNsOf(profile: BoardProfile): number;     // Math.round(profile.opUs * 1000), the SIMULATION 5.4 table
export function toSimLanguage(l: InterpLanguage): Language; // 'arduino' to 'arduino-cpp', 'python' to 'python', 'verilog' to 'verilog' (inverse of INTERP_LANGUAGE in src/lib/interp/headless.ts:14)
```

| Field | Content |
|---|---|
| Algorithm | `load(image)`: source image only (`kind: 'source'`); the entry file's text goes to `createRun`; compile diagnostics are returned as `LoadResult.diagnostics`, mapped from the interpreter's `Diagnostic` (`src/lib/interp/errors.ts`, with line and column) to a `SimDiagnostic` with `ref: { file, line, column }`, `id` `compile-error` and `text_key` `diag.compile-error` (B3 shows the interpreter's own message in `args.message`; the i18n namespace is a later phase). `advanceTo(horizon, budget)`: `run.step((horizon - this.nowNs) / 1e6)`, returns `{ reached: this.nowNs, stoppedEarly: false }`; after each step, if `run.world !== this.lastWorld` (deep sleep wake or reset replaces the World), re-register `onPinWrite` and re-read the pin map. A pin edge callback pushes `{ at: Math.round(world.clock.now * 1000), kind: 'pin', payload }` through the attached `EventSink` with phase 2 and rank 30. Inputs from the orchestrator (P0) call `run.input` or `run.analog`. `nextDue()` returns `nowNs + 1_000_000` while running and `null` when `done`, `error` or `stopped`. Limits: the engine maps `error.kind === 'limit'` to a halting diagnostic `limit:<message>` |
| Validation and errors | Board id unknown: `LoadResult` with `ok: false` and a `SimDiagnostic` `unknown-board`; language not run by the board: the message `createRun` throws, returned as a diagnostic |
| Edge cases | FPGA boards (`opUs: 0`): time follows simulated cycles, `nextDue` still 1 ms; `Run` in `sleeping` state; `reset` while running; the 20,000-edge cap in `World.trace` is not used by this adapter, which keeps its own edge list (cap in the orchestrator) |
| Performance | Adapter overhead under 10 percent of `Run.step` time on Blink for 10 s virtual (measured, printed) |
| Migration | none. `src/lib/interp` is not edited (PD-1, PD-12) |
| Unit tests | `interp-engine.test.ts` (`// @vitest-environment node`): Blink on `uno-r3` gives pin 13 edges at 500 ms spacing (as `lessons.test.ts` expects) and serial lines with timestamps; Python Pico blink; one Verilog counter; compile error returns a diagnostic with a line; reset replaces the World and edges keep coming; `opNsOf` returns the SIMULATION 5.4 table for all 12 profiles in `PROFILES`; for 10 lesson jobs the edge list and serial text equal `runHeadless` output |
| Acceptance | Given the Uno Blink sketch, When the engine runs 2 s of virtual time, Then four pin-13 edges exist at 0, 500, 1000, 1500 ms (within one `opNs`) |
| Release blockers | Any change to `src/lib/interp` files (this task edits none) |
| Definition of done | Cases pass; `TL` green |
| Verify | `TL`; `V src/sim-host/engines/interp-engine.test.ts src/lib/interp` |
| Docs | none |
| Rollback | Revert |
| Later tasks need | 13 registers it in the worker; 15 binds world inputs through `engine.run`; 19 runs ten times over it |

### T-B3-18. Solver equivalence to the old solver (SA-02)

| Field | Content |
|---|---|
| Identity | Subsystem analog solver (SIM-1). Phase B3. Priority should (F-045, R-046, G-T1). Depends on T-B3-17. Status not started |
| Problem | Figures may switch to the new module only after the new solver reproduces the old one (SIMULATION 18.1, `PRODUCT_REQUIREMENTS.md` line 394). SA-02: every node voltage and branch current within 1e-9 relative on the 99 circuits |
| User and story | Amar: "the new solver gives the same numbers as the one the lessons use" |
| Expected behaviour | A generator script runs the frozen old solver over 79 lesson circuits and the 20 RS-08 circuits and writes `legacy-golden.json`: per circuit the element list the old `netlist()` built, the sources, the PWM slices, and the raw per-slice node voltages and element currents. The equivalence test feeds the same elements to `solve()` and compares |
| Success metric | 99 of 99 circuits, every quantity within 1e-9 relative (floor 1e-12 absolute); the worst relative difference is recorded |
| Existing files | `figures/engine/bench-solve.js` (frozen; read); `figures/engine/testkit.mjs:15-45` (`buildFigure`, `swapItem`, `loadFigure`; builds with `python3 -I figures/tools/cfbuild.py`, needs `python3` and jsdom `30.1.2`); `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/src/real.mjs` (`makePage`, `solveCase`, `snapshot`), `cases.mjs` (20 circuits), `bench-solve.patch` (the two-line patch: returns `R` from `netlist()` and adds `out.raw = { res, nl, els, slices }`), `data/scan.json` (79 rows) |
| New files | `scripts/gen-solver-golden.mjs`, `src/sim/analog/fixtures/legacy-golden.json`, `src/sim/analog/fixtures/rs08-cases.ts`, `src/sim/analog/legacy-adapter.ts`; test `src/sim/analog/equivalence.test.ts` |
| Interfaces | |

```ts
// legacy-adapter.ts  (portable)
export interface GoldenCircuit { id: string; source: 'lesson' | 'rs08'; nodes: number; ground: number; elements: Element[]; pwmSlices: Array<{ weight: number; highNets: string[] }>; motorGm: Record<string, number>; expected: { slices: Array<{ weight: number; v: number[]; branch: Record<string, { amps: number; volts: number }> }> } }
export function toSolveInput(g: GoldenCircuit): SolveInput;
export function compareSolution(g: GoldenCircuit, r: SolveResult): { worstRel: number; worstWhere: string; failures: string[] };
```

| Field | Content |
|---|---|
| Algorithm | `gen-solver-golden.mjs`: reads `figures/engine/bench-solve.js` text, applies the two replacements of `bench-solve.patch` in memory (the file on disk is never changed), evaluates it inside the Uno R3 figure page built by `testkit.mjs` exactly as `real.mjs` does, then for each of the 79 lesson circuits (keys from `data/scan.json`) and the 20 cases records the raw output. It also records the motor `gm` the old loop settled on (`bench-solve.js:266-277`). `--check` regenerates in memory and diffs against the file. The test converts each golden circuit into `SolveInput` and requires every node voltage and branch current within 1e-9 relative of the stored value (absolute floor 1e-12). Motors: the test passes the stored `gm` so the check covers the linear and junction solve; one extra test drives the `curve` hook with a lookup built from the recorded `(vAvg, amps)` pairs and checks the 6-pass loop reproduces `gm` within 1 percent |
| Validation and errors | If a circuit cannot be built by the generator (a part the figure page lacks), the generator lists it and exits non-zero; the count of golden circuits is asserted to be 99 in the test |
| Edge cases | Circuits with burnt parts (generator clears `st.burnt` before each solve as `real.mjs` does); the stepper circuit (14 nodes, 17 elements); circuits where the old solver left a node floating (the new solver adds `floating-node` and the voltage still equals the old 0 V) |
| Performance | The unit test, which does not rebuild figures, runs in under 5 s. The generator takes minutes (python3 builds) and is not part of `npm test` |
| Migration | none. `figures/` is untouched |
| Unit tests | `equivalence.test.ts`: 99 circuits; the `gm` loop test; a deliberate tampering test (change one golden voltage by 1e-6, expect a failure naming the circuit) |
| Integration | `node scripts/gen-solver-golden.mjs --check` run once by the agent and its output pasted in the commit body (needs `python3`, jsdom; not run in CI) |
| Acceptance | Given the golden file and the new solver, When the test runs, Then `worstRel <= 1e-9` for all 99 and the test prints the worst value and circuit |
| Release blockers | An edit under `figures/`; fewer than 99 circuits without Amar's OK ("For Amar" item 5) |
| Definition of done | 99 of 99; `TL`, `PT` green; `V figures/engine/bench-solve.test.mjs` still green (run through `V`, never `node`) |
| Verify | `TL`; `PT`; `V src/sim/analog figures/engine/bench-solve.test.mjs` (the only form for that file: it imports `vitest`, so `node figures/engine/bench-solve.test.mjs` does not run); `node scripts/gen-solver-golden.mjs --check` (a plain script, no vitest) |
| Docs | SA-02 number recorded in T-B3-25 |
| Rollback | Revert; the golden file goes with it |
| Later tasks need | B8 switches figures to the new module after this passes; B8 adds the descriptor-to-element mapping and SA-03 |

### T-B3-04. Autosave, crash journal, storage health, tab sync

| Field | Content |
|---|---|
| Identity | Subsystem local storage. Phase B3. Priority must (F-087, R-035, R-036; M1 step 7). Depends on T-B3-03 and T-B3-S2. Status not started |
| Problem | Edited work must reach disk without a button, survive a crash between keystroke and commit, warn before it is lost, and not be overwritten by a second tab |
| User and story | Amar: "I edit, reload, and it is all there; if the disk is full I am told, and my last good copy is kept" |
| Expected behaviour | `attachAutosave` listens to the session. It sends `save` 500 ms after the last commit, at most 5 s after the first unsaved commit (RC-11), when the page becomes hidden, and on `pagehide`. `journal` appends code-editor text edits per 300 ms burst. `storage-health` asks `navigator.storage.persist()` once on the first save, records the answer, estimates usage, and raises a quota warning at 80 percent or on a `quota` failure. `tab-sync` broadcasts `{id, revision, hash}` after each save and tells another tab with the same project open to show "changed in another tab" |
| Success metric | With a fake clock: the debounce, max-wait and hidden/pagehide triggers fire at the stated times on a scripted session; a reload gives an equal hash (M1 step 7) |
| Existing files | `src/lib/progress/storage.ts:5-6` (the `iynk:v1` key stays for settings; the persist answer goes to the `progress` store instead, so `Settings` is not changed). `ProjectSession.subscribe` and `DocChange` (T-B2-10, `tasks/B2-core-document-netlist.md`). Real shapes: `DocChange { from, to, ops: Op[], touched, origin }` carries no envelopes and no author, so the autosave reads the envelopes it ships from `session.state.history.ops` with `seq` above `from`; `SessionOptions.onCompact` is `({ revision, state, stateHash }) => void` and is what `host.keepRevision` plugs into. Not edited (PD-4) |
| New files | `src/local/autosave.ts`, `journal.ts`, `storage-health.ts`, `tab-sync.ts`; tests beside them |
| Interfaces | |

```ts
// autosave.ts
export interface Timers { setTimeout(fn: () => void, ms: number): number; clearTimeout(id: number): void; now(): number }
export type FlushStrategy = 'worker-at-pagehide' | 'main-journal-at-pagehide';   // set from the T-B3-S2 verdict
export interface AutosaveHandle { dispose(): void; status(): 'saved' | 'saving' | 'unsaved' | 'failed'; lastSavedAt(): number | null }
export function attachAutosave(session: Pick<ProjectSession, 'subscribe' | 'state' | 'revision'>, host: Pick<ProjectHost, 'open' | 'commit' | 'save' | 'onEvent'>, env: { timers: Timers; doc: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>; win: Pick<Window, 'addEventListener' | 'removeEventListener'>; strategy: FlushStrategy; debounceMs?: number /* 500 */; maxWaitMs?: number /* 5000 */ }): AutosaveHandle;
// journal.ts
export interface JournalEdit { src: string; pos: number; del: number; ins: string; t: number }
export function createJournalWriter(repo: Pick<Repository, 'journal'>, timers: Timers, burstMs?: number /* 300 */): { record(projectId: string, baseRevision: number, edit: JournalEdit): void; flushNow(): Promise<void> };
export function journalToOps(journal: JournalRow, current: { revision: number }): Op[] | 'stale';  // source.edit ops, or 'stale' when baseRevision differs (then copied to backups and dropped)
// storage-health.ts
export function createStorageHealth(deps: { storage: Pick<StorageManager, 'estimate' | 'persist' | 'persisted'> | undefined; repo: Pick<Repository, 'estimate'>; progress: ProgressKv; timers: Timers }): { init(): Promise<HealthState>; onSaveFailed(kind: string): void; subscribe(fn: (s: HealthState) => void): () => void };
export interface HealthState { persisted: boolean | null; usage: number | null; quota: number | null; warn: 'none' | 'near-full' | 'quota-failed' | 'unavailable'; fileNudgeDue: boolean }
export function fileNudgeDue(row: { hasFileCopy: boolean; updatedAt: string }, firstUnsavedToFileAt: number | null, now: number): boolean;   // 10 minutes of editing with no file copy
// tab-sync.ts
export function createTabSync(channel: Pick<BroadcastChannel, 'postMessage' | 'addEventListener' | 'close'> | null): { announce(m: { id: string; revision: number; hash: string }): void; onOther(fn: (m: { id: string; revision: number; hash: string }) => void): () => void };
```

| Field | Content |
|---|---|
| Algorithm | On each `DocChange` (T-B2-10: `{ from, to, ops, touched, origin }`; changes with `origin: 'load'` are ignored) the link reads the envelopes with `seq` above `change.from` from `session.state.history.ops` and calls `host.commit(change.from, change.to, envelopes)`; if compaction removed some of them it calls `host.open(...)` with the full state instead. State machine `idle` to `dirty` (first commit sets `firstUnsavedAt`, arms debounce and max-wait timers) to `saving` (after `save` is sent) to `idle` on `saved`, or to `failed` on `save_failed` (autosave stops on `quota`, shows the warning, keeps the shadow in memory; a manual save retries). Each new commit resets only the debounce timer. `visibilitychange` to hidden and `pagehide` send `save` at once with reason `hidden` or `pagehide`. With `main-journal-at-pagehide` the pagehide path also writes the pending batch's text edits to `journal` from the main thread. `journalToOps` maps `{src, pos, del, ins}` to `{ k: 'source.edit', id: src, baseSeq, pos, del, ins }`; the exact `baseSeq` meaning is defined by the B2 `apply` and must be read there (UNKNOWN today, `project.schema.json` `Op source.edit` requires `baseSeq` as an integer) |
| Validation and errors | A `saved` event whose hash differs from the host's expected hash is counted and surfaces as `hash_mismatch` handling in T-B3-03; a `save_failed: conflict` is passed to `tab-sync` consumers as "changed in another tab" and autosave pauses until the person chooses |
| Edge cases | Commit during `saving` (queues a second save); 1,000 commits in 1 s (one save); tab hidden with nothing dirty (no save); `BroadcastChannel` missing (Safari old versions: `null`, no tab sync, a note is shown); persist denied (state recorded, nudge shown); IndexedDB unavailable (`warn: 'unavailable'`) |
| Permissions | P0. `BroadcastChannel` carries ids and hashes only, never content |
| Performance | Autosave itself does no work on the main thread beyond timers and one `postMessage` |
| Migration | none |
| Unit tests | `autosave.test.ts` (fake timers and fake event targets): the five triggers; max-wait fires at 5,000 ms under a stream of commits every 100 ms; hidden with nothing dirty sends nothing; failed save stops the loop and a manual save retries; `status()` transitions. `journal.test.ts`: bursts coalesce at 300 ms; `journalToOps` replays on a matching base; a stale base returns `stale` and the caller copies it to `backups`. `storage-health.test.ts`: persist asked once; 80 percent gives `near-full`; `quota` failure gives `quota-failed`; `fileNudgeDue` true after 10 minutes and false when `hasFileCopy`. `tab-sync.test.ts`: a second instance on a fake channel sees the announcement; own messages ignored |
| Integration and e2e | Real timers and tab close are exercised in T-B3-24 (reload test, `pagehide`) |
| Acceptance | Given a scripted session of 12 commits spaced 100 ms apart, When the clock runs, Then exactly two saves happen (one at 5,000 ms max-wait, one 500 ms after the last commit) |
| Observability | `status()` and `lastSavedAt()` feed the "saved" chip in B4; counters for Diagnostics |
| Release blockers | A trigger that never fires with a fake clock; any autosave path that touches IndexedDB on the main thread other than the S2 fallback |
| Definition of done | Cases pass; `TL` green |
| Verify | `TL`; `V src/local` |
| Docs | none |
| Rollback | Revert |
| Later tasks need | 21 mounts the warnings; B4 mounts the chip; 24 measures FA-08 through it |

### T-B3-13. `SimHost`, `SimWorker` and the sim protocol

| Field | Content |
|---|---|
| Identity | Subsystem simulation host (SIM-0). Phase B3. Priority must (F-203, R-041; SA-01). Depends on T-B3-01, T-B3-11, T-B3-12. Status not started |
| Problem | The live run is on the main thread (`boardlab/engine.ts:164`, per SIMULATION 17.1); only checks use a worker. One typed protocol must carry load, run, step, input and check, with a worker that can be killed and rebuilt |
| User and story | Amar: "Run does not freeze the page, and Stop always works" |
| Expected behaviour | `SimHost` owns a `sim` worker through `createRpcPort`. `load` sends a `SimNetlist`, run options and the program; `control` runs, pauses, stops, resets or cancels; `step` advances by a unit; `input` adds an `InputEntry`; `check` runs a `CheckJob` and returns a `CheckOutcome`. Events: `frame` (at most 30 per simulated second, only on change), `state`, `event`. A `handler.ts` holds all logic so the same code runs in a Worker and in an inline port. Every message carries `v: 1` and a run id; a message with another run id is ignored (R-041) |
| Success metric | SA-01 leg A: 102 of 102 check jobs through the inline port (with `structuredClone`) give a `CheckOutcome` deep-equal to a direct `runChecks` |
| Existing files | `src/lib/interp/check.worker.ts:1-14` (first message type to move; left as is, labs move in B12), `check-client.ts:36-65` (precedent), `check-job.ts:30` (`runChecks`), `src/lib/interp/lessons.test.ts:52-113` (the 102 jobs: `boardLoaders`, `roboticsLoaders`, `lessonJob`, `taskJob`). The imports this task needs (`protocol`, `sim` values, `src/lib/interp/`) need no matrix edit, because `sim-host` has no enforced row (section 3.1). This task edits neither `eslint.config.mjs` nor `src/architecture.test.ts` |
| New files | `src/sim-host/protocol.ts`, `handler.ts`, `host.ts`, `sim.worker.ts` (4 source files; `sim.worker.ts` is only `serveWorker(self, createSimHandler(...))`); tests `handler.test.ts`, `host.test.ts`, `sa01.test.ts` |
| Interfaces | |

```ts
// protocol.ts  (SIMULATION 17.2, B3 subset; snapshot, restore, replay, probe, debug are added by B8/B9). SimNetlist, SimRunOptions, ProgramImage, StepUnit, HostInput, SimDiagnostic, PartState, SimTime come from src/sim/engine.ts and src/sim/core/clock.ts (T-B3-11, T-B3-10); CheckJob and CheckOutcome from src/lib/interp
export type SimReq =
  | { v: 1; id: number; t: 'load'; run: number; net: SimNetlist; opts: SimRunOptions; program: ProgramImage }   // `run` is the run id (R-041); SIMULATION 17.2 calls the options field `run`, see PD-18
  | { v: 1; id: number; t: 'control'; run: number; op: 'run' | 'pause' | 'stop' | 'reset' | 'cancel' }
  | { v: 1; id: number; t: 'step'; run: number; unit: StepUnit; n: number }                  // only 'ns' and 'event' run (PD-18); other units ack with the diagnostic `step-unit-unsupported`
  | { v: 1; id: number; t: 'input'; run: number; input: HostInput }
  | { v: 1; id: number; t: 'check'; job: CheckJob; budgetMs?: number }
  | { v: 1; id: number; t: 'diag'; op: 'stall' };      // answered only when the worker was created with name 'sim-diag'; busy-loops forever so the watchdog can be tested in a real browser
export type SimEv =
  | { v: 1; t: 'frame'; run: number; at: SimTime; pins: Record<string, 0 | 1 | 'Z' | 'X'>; parts: PartState[]; serial: Array<{ at: SimTime; text: string }> }
  | { v: 1; t: 'state'; run: number; state: 'idle' | 'running' | 'paused' | 'halted' | 'done' | 'limit'; at: SimTime; limit?: { kind: string; message: string } }
  | { v: 1; t: 'event'; run: number; event: { kind: 'diagnostic' | 'output-contention' | 'no-time-progress'; message: string; at: SimTime } };
// handler.ts
export interface SimHandlerDeps { diag: boolean; wallMs(): number /* the only wall clock; used for shouldYield and pacing */; schedule(fn: () => void): void; makeEngine(program: ProgramImage, net: SimNetlist, opts: SimRunOptions): McuEngine; makeDigital(): DigitalLayer }
export function createSimHandler(deps: SimHandlerDeps): WorkerHandler<SimReq, SimEv>;
// host.ts
export interface SimHost { load(net: SimNetlist, opts: SimRunOptions, program: ProgramImage): Promise<{ diagnostics: SimDiagnostic[]; runId: number }>; control(op: 'run' | 'pause' | 'stop' | 'reset' | 'cancel'): Promise<void>; step(unit: StepUnit, n: number): Promise<void>; input(i: HostInput): Promise<void>; check(job: CheckJob, budgetMs?: number): Promise<CheckOutcome>; onEvent(fn: (e: SimEv) => void): () => void; kill(): Promise<void>; restart(): Promise<void>; readonly state: 'starting' | 'ready' | 'dead' }
export function createSimHost(opts?: { port?: RpcPort<SimReq, SimEv>; diag?: boolean }): SimHost;   // default creates new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' })
```

| Field | Content |
|---|---|
| Algorithm | Handler `load`: build engines and the digital layer from the deps, `createOrchestrator({ engines, digital })`, call `orchestrator.load(net, opts)`, return `LoadResult` diagnostics; `step`: call `orchestrator.step(unit, n)` and post a frame; `control cancel`: stop scheduling slices, set the state to `idle`, ack (nothing inside a synchronous step can be interrupted, so the hard stop is the host kill of T-B3-26, PD-22); `control run`: pump loop `schedule(() => { orchestrator.runUntil(target, budget) })` where `target` is the end of the run (`speed 0`) or `elapsedWall * speed` (host pacing, using only `wallMs`, never inside `src/sim`); `shouldYield` returns true after 12 ms of wall time in a slice (SIMULATION 6.8 rule 2). A frame is posted when `now - lastFrame >= 33.3 ms of simulated time` and something changed. `check` runs `runChecks(job, { budgetMs })` and acks the outcome. `diag stall` runs `for (;;) {}` only when `deps.diag` is true; `sim.worker.ts` sets `diag` from `self.name === 'sim-diag'` and the host passes that name only when created with `diag: true` (Diagnostics panel); the production worker is named `sim`. `kill` terminates the port; `restart` creates a new worker; the caller re-sends `load` from the project (the worker keeps nothing the project does not have) |
| State transitions | `idle` to `running` to `paused` or `done` or `halted` or `limit`; `stop` and `reset` return to `idle`; a new `load` increments the run id and drops stale messages |
| Validation and errors | Unknown `run` id: ignored; a `step` with `n <= 0`: `bad_message`; a `load` whose program language is not run by the board: diagnostics, state stays `idle` |
| Edge cases | `control run` twice; `load` while running (stops the old run first); `check` while a run is live (separate handler path, not blocked); a frame with 10,000 serial lines (chunked, 1 MiB cap per run, SIMULATION 8.8) |
| Permissions | P0 |
| Performance | Frame message under 2 KB typical; a 5 s Blink run at speed 0 finishes in under 1 s wall (ESTIMATED from 62 ms per virtual second, `inventory/interp.md` via SIMULATION 17.1) |
| Migration | none. The check path is not moved here |
| Unit tests | `handler.test.ts` (fake `wallMs` and `schedule`): load then run to done; stop mid-run; `control cancel` stops pumping and acks; `diag stall` with `diag: false` is `bad_message`; `step('ns', n)` and `step('statement', 1)`; frames at most 30 per simulated second; stale run id ignored; `shouldYield` stops a slice and the next pump continues; compile error keeps `idle`. `host.test.ts` (inline port): `kill` then `restart` then `load` works; `state` values; events delivered to `onEvent`. `sa01.test.ts` (`// @vitest-environment node`, timeout 60 s per job): for every job from the lesson loaders, `host.check(job)` equals direct `runChecks(job)` (deep equal on trace and results); the test prints the count (102) |
| Integration and e2e | Real `Worker` leg of SA-01 and the kill tests: T-B3-23 and T-B3-24 |
| Acceptance | Given the 102 jobs, When each is run through the inline sim handler, Then 102 of 102 outcomes equal the direct outcomes and the starters (empty programs) still fail at least one check |
| Observability | `host.stats`: run count, restart count, last state |
| Release blockers | A time or random call inside `src/sim`; a protocol message without `v: 1`; SA-01 below 102 of 102 |
| Definition of done | Cases pass; `TL`, `PT` green; `src/architecture.test.ts` passes with no edit from this task |
| Verify | `TL`; `PT`; `V src/sim-host src/architecture.test.ts` |
| Docs | worker table and protocol link in `docs/ARCHITECTURE.md` (T-B3-25) |
| Rollback | Revert |
| Later tasks need | 26 adds the watchdog to `host.ts`; 23 drives it from the page; B12 moves the labs onto `check`. T-B3-19 does not use the handler: SA-06 runs the orchestrator directly |

### T-B3-15. Netlist to `SimNetlist`, digital nets, world pins, binding

| Field | Content |
|---|---|
| Identity | Subsystem digital slice (SIM-0). Phase B3. Priority must (F-041, F-047, R-044, R-045). Depends on T-B3-11, T-B3-12. Status not started |
| Problem | The World binds devices by figure pin names. A project must bind them through its netlist, and part states (LED lit, buzzer on) must follow pin levels with DP-1 (section 6.1) |
| User and story | Amar: "the LED follows pin 13 because the wires say so, not because a lesson says so" |
| Expected behaviour | `buildSimNetlist` turns a `Project` and a part lookup into a `SimNetlist` with diagnostics. `createDigitalNets` implements `DigitalLayer`: pin level and PWM duty in, part states out, by DP-1. `deriveInputPins` finds the board pins a world input (button, pot, HC-SR04...) reaches through the nets. `bindWorld` hands those to the existing `WorldBinding` |
| Success metric | The `uno-blink-d12` example: LED part lit while D12 is high, with brightness equal to duty for PWM; moving the wire to D13 in the document moves the LED's reaction to D13 with no change to the sketch's meaning (the audit's B2-30 defect, `TECHNICAL_DEBT.md` row B2-30) |
| Existing files | `bind.ts` imports from `src/lib/interp` (M-3, section 3.1: `sim-host` is not enforced). `src/lib/interp/lesson-world.ts:131-188` (`WorldBinding`, `resolve`), `:46-98` (`drivesFor`), `src/lib/interp/pins.ts:34-50` (`netResolver`), `src/lib/interp/world.ts:141` (`pins`), `src/project/netlist.ts` and `src/parts/registry.ts` (T-B2-13, T-B2-11; created in B2), `04_ARCHITECTURE/schemas/project.schema.json` (`Net.class` `signal, power, ground, analog`; `WorldInput.pins` "Optional once the orchestrator derives them from the netlist (F-047)"; `PinRef { c, p }`). No edit to `world.ts` (VERIFIED: nothing in `WorldBinding` needs it; the roadmap row listed an edit) |
| New files | `src/sim/netlist.ts`, `src/sim/digital/nets.ts`, `src/sim/world-pins.ts`, `src/sim-host/engines/bind.ts`, `src/sim-host/index.ts` (5 source files; `index.ts` re-exports `buildSimNetlist` and the `SimNetlist` type, so the Diagnostics panel reaches `sim` through `sim-host` and the page never imports `src/sim` itself, M-5); tests beside them |
| Interfaces | |

```ts
// src/sim/netlist.ts  (portable)
export function buildSimNetlist(doc: Project, reg: Pick<PartRegistry, 'get'>): { net: SimNetlist; diagnostics: SimDiagnostic[] };   // PartRegistry and Descriptor from src/parts (T-B2-11); SimDiagnostic from src/sim/engine.ts (T-B3-11)
// src/sim/digital/nets.ts
export function createDigitalNets(): DigitalLayer;
// src/sim/world-pins.ts
// ProjectWorldInput = Project['simulation']['world']['inputs'][number], the generated type of $defs/WorldInput (project.schema.json:2351; `component` and optional `pins: PinRef[]`)
// LegacyWorldInput = the content type of src/content/schema.ts:323 (`pins: string[]`, `part`, `gesture`, `label`), which WorldBinding reads
export function deriveInputPins(net: SimNetlist, input: ProjectWorldInput): { pins: string[]; diagnostics: SimDiagnostic[] };   // board pin names, in component pin order
// src/sim-host/engines/bind.ts
export function bindWorld(engine: ReturnType<typeof createInterpEngine>, net: SimNetlist, inputs: ProjectWorldInput[], profile: BoardProfile): WorldBinding;   // maps each input to a LegacyWorldInput: id, quantity, device, min, max, step, default, unit copy over; `pins` come from deriveInputPins; `part` is the component id; `gesture` and `label` (unused by WorldBinding) are 'tap' and the id. The agent reads the real generated type first (U-1)
```

| Field | Content |
|---|---|
| Algorithm | `buildSimNetlist`: it calls B2's `netlist(doc)` (T-B2-13, which reads `nets`, instances and pinned interfaces and never the views) and builds on its nodes, so nets joined by an internal-short group are one net; ground is the node that holds a document net of class `ground` (none: diagnostic `no-ground`); each node becomes `{ id: node.id, name: node.names[0] }`; each `boards[]` and `components[]` entry becomes a `SimPart` whose `pins` map comes from `pinNode['<c>/<p>']`; `kind` is read from the descriptor: `identity.kind === 'board'` gives `board`, a `behaviour` layer with `model.element` `led`, `res`, `button`, `buzzer`, `pot` gives `led`, `resistor`, `button`, `buzzer`, `pot`, anything else `other`. Breadboard rule: a component whose descriptor `interfaceOf(d).role` is `surface` is omitted from `SimNetlist.parts` with no diagnostic. If `reg.get(ref, version)` cannot resolve the reference, the pinned `doc.dependencies.components[].interface.role` is read instead (the example pins `core.breadboard-half` with role `surface` and no pins, VERIFIED, section 11), so a surface is still omitted without a registry entry. Any other unresolved reference becomes kind `other` with a diagnostic `unknown-part` (R-028 placeholder); `settings.seed` is `simulation.seed`; `docHash` is `stateHash(doc)`; part counts over 2,000 are refused. `createDigitalNets`: union nets through transparent resistors (DP-1), collect drivers (board pin writes strong; resistor to a rail weak; button closed strong), `resolve`, map to part states. `deriveInputPins`: for the input's `component`, take its pins in descriptor order; for each, the net; the board pins (`SimPart.kind === 'board'`) on that net that are not on a ground or power net; two board pins on one net give `ambiguous-input-pin`. `bindWorld`: pins to strings, `netResolver(profile)`, `new WorldBinding(engine.run, { inputs }, { logicV: profile.logicV, resolve })` |
| Validation and errors | As above; every diagnostic carries a part or net id |
| Edge cases | A board pin on no net (floating input: state `Z`, diagnostic `floating-input` only when read); a button across two nets with no board pin (no effect, note); an LED with only one pin connected (not lit, `open-connection`); resistor loops (union-find terminates) |
| Permissions | P0 |
| Performance | `buildSimNetlist` for 500 parts and 1,000 wires under 5 ms in Node (ESTIMATED; printed) |
| Migration | none |
| Unit tests | `netlist.test.ts`: the `uno-blink-d12` example gives 3 nodes (`net_d12`, `net_gnd`, `net_led`) and 3 parts: the board, `cmp_led1` and `cmp_res1`; the breadboard `cmp_bb1` is omitted with no diagnostic, once with a registry that lacks `core.breadboard-half` and once with one that has it; the ground node is found, `docHash` equals `stateHash`; an unknown non-surface part reference gives `unknown-part`; a document with no net of class `ground` gives `no-ground` (the blank project, PD-20). `nets.test.ts`: Blink DP-1 case (pin, resistor, LED, ground): high lights, low does not, PWM 0.25 gives brightness 0.25; reversed LED not lit; button to ground with pull-up reads low when pressed; two strong drivers disagree give `X` and `output-contention`; a pot gives `not-modelled`. `world-pins.test.ts`: button on D2 gives `['D2']`; HC-SR04 gives trig then echo; ambiguous case. `bind.test.ts` (in `src/sim-host/engines`): a button input changes the engine's pin 2 level through the netlist; moving the wire from D2 to D3 in the document changes the pin driven |
| Acceptance | Given the Blink example with its wire moved from D12 to D13 and the sketch writing D13, When it runs 1 s, Then the LED part is lit during the high half (the B2-30 case: the document, not the lesson, decides) |
| Release blockers | A part state without `provenance: 'approximation'` and `tier: 'T0'`; a figure pin name used anywhere in the binding |
| Definition of done | Cases pass; `TL`, `PT` green |
| Verify | `TL`; `PT`; `V src/sim src/sim-host/engines` |
| Docs | DP-1 paragraph in `docs/ARCHITECTURE.md` (T-B3-25) |
| Rollback | Revert |
| Later tasks need | 19 runs corpora through it; 23 builds the netlist of the sample project through `src/sim-host/index.ts`; B8 replaces DP-1 with the solver |

### T-B3-19. Deterministic run and replay

| Field | Content |
|---|---|
| Identity | Subsystem replay (SIM-0). Phase B3. Priority must (DET-1, SA-06, R-048 groundwork). Depends on T-B3-10, 11, 12, 15. It does not depend on T-B3-13: SA-06 builds the orchestrator directly with `createOrchestrator({ engines: [createInterpEngine(...)], digital: createDigitalNets() })` (the sim host and handler are not involved). Status not started |
| Problem | "Same seed, same trace" has no test and no record. A replay record must pin versions and inputs and say where two runs first differ |
| User and story | Amar: "ten runs of the same project give the same serial text and the same pin trace, and if they ever differ I see the first difference" |
| Expected behaviour | `createRecorder` builds a `ReplayRecord` from an orchestrator run. `pinTraceHash` and `serialHash` summarise a run. `replay(record, deps)` re-runs and compares the checkpoint hashes (every 1,000 ms of simulated time) and the two summary hashes, returning the first differing checkpoint |
| Success metric | SA-06: ten runs of each converted Uno project with an `arduino-cpp` source give identical serial text and pin-trace hash (class B) |
| Existing files | `04_ARCHITECTURE/SIMULATION_ARCHITECTURE.md` 6.7 (`ReplayRecord`, `InputEntry`), 6.9 (hash method); `schemas/project.schema.json:5777` `$defs/ReplayLog` and `$defs/Sha256`; `src/lib/flight/sim.ts:1008` (`replay()` precedent: re-simulate from origin plus a log; VERIFIED the function exists) |
| New files | `src/sim/replay/record.ts`, `trace.ts`, `replay.ts`; tests beside them plus `src/sim-host/replay.test.ts` (needs the interpreters, so it lives outside `src/sim`) |
| Interfaces | |

```ts
// record.ts  (RC-54 keys: models '<name>@<major>' to semver; engines 'engine:<name>@<semver>')
export interface ReplayRecord { format: 1; docHash: string; seed: number; settings: SimSettings; versions: { engines: Record<string, string>; models: Record<string, string>; dmath: string }; inputs: InputEntry[]; checkpoints: Array<{ at: SimTime; hash: string }>; endsAt: SimTime; pinTraceHash: string; serialHash: string }
export function createRecorder(o: Orchestrator, ctx: { docHash: string; settings: SimSettings; engineVersions: Record<string, string> }): { finish(endsAt: SimTime): ReplayRecord };
// ReplayLog is the generated type of $defs/ReplayLog (src/project/generated/types.ts, T-B2-04); the field table below is copied from project.schema.json:5777
export function toReplayLog(r: ReplayRecord, project: { id: string; revision: number }): ReplayLog | { error: string };      // maps to the schema's iynk.replay; refuses when a version string is over 40 characters (PD-6)
export type ReplaySpec = Pick<ReplayRecord, 'docHash' | 'seed' | 'versions' | 'inputs' | 'checkpoints'> & Partial<Pick<ReplayRecord, 'settings' | 'endsAt' | 'pinTraceHash' | 'serialHash'>>;   // what a log can carry; the optional four are not in ReplayLog
export function fromReplayLog(log: ReplayLog, running: { engines: Record<string, string> }): ReplaySpec | { error: string };
// trace.ts
export function pinTraceHash(edges: readonly PinEdge[]): string;       // StateHasher over (at, net, level) in order
export function serialHash(lines: ReadonlyArray<{ at: SimTime; text: string }>): string;
// replay.ts
export type ReplayVerdict = { ok: true } | { ok: false; first: { at: SimTime; what: 'checkpoint' | 'pin-trace' | 'serial'; expected: string; actual: string } };
export function replay(record: ReplaySpec, run: (r: ReplaySpec) => { checkpoints: ReplayRecord['checkpoints']; pinTraceHash: string; serialHash: string }): ReplayVerdict;
```

| Field | Content |
|---|---|
| Algorithm | The recorder reads `o.inputs`, `o.checkpoints` and the pin edge list. `toReplayLog` maps `InputEntry.kind` `pin, analog, serial, param` to `input`, `fault` to `fault`, and `control` to `reset` or `power` by `target`; `data` keeps the original `{ seq, kind, target, value }`; `engines` takes `versions.engines` plus `model:<id>` and `dmath` entries; any value over 40 characters returns an error (the schema limit). `replay` compares checkpoints in order, then the two summary hashes when the spec carries them |

Field map, copied from `project.schema.json:5777` (`ReplayLog` has `additionalProperties: false`; required: `format`, `version`, `project`, `engines`, `seed`, `events`):

| `ReplayLog` field (schema constraint) | `ReplayRecord` field | Rule |
|---|---|---|
| `format` (const `iynk.replay`), `version` (const 1) | `format: 1` | constants written by `toReplayLog` |
| `project.id` (`^prj_`, max 72), `project.revision` (integer, at least 0) | none | given by the caller |
| `project.stateHash` (`Sha256`, 64 hex) | `docHash` | copied; a `docHash` that is not 64 hex returns an error |
| `engines` (at most 16 keys, each value 1 to 40 characters) | `versions.engines`, `versions.models`, `versions.dmath` | keys `engine:<name>@<semver>` as they are, `model:<name>@<major>` for models, `dmath` for `dmath`; more than 16 keys or a value over 40 characters returns an error |
| `seed` (integer, 0 to 4294967295) | `seed` | copied |
| `events[].tNs` (integer, at least 0) | `inputs[].at` | copied |
| `events[].kind` (`input, press, fault, edit, power, reset`) | `inputs[].kind` | `pin, analog, serial, param` give `input`; `fault` gives `fault`; `control` gives `reset` or `power` by `target`; `press` and `edit` are never written in B3 |
| `events[].data` (object) | `inputs[].seq`, `kind`, `target`, `value` | `{ seq, kind, target, value }` so the mapping back is lossless; at most 1,000,000 events |
| `checkpoints[].tNs` | `checkpoints[].at` | copied; at most 100,000 |
| `checkpoints[].hash` (`Sha256`, 64 hex) | `checkpoints[].hash` (16 hex, FNV-1a 64) | left-padded with 48 zeros; `fromReplayLog` requires the 48 zeros and strips them (RC-B3-7) |
| none | `settings`, `endsAt`, `pinTraceHash`, `serialHash` | not carried (the schema has no place for them). `fromReplayLog` leaves them out of `ReplaySpec`; a log-based replay therefore compares checkpoints only, and the run length is the last checkpoint time plus 1,000,000,000 ns. This is a lossy step for B3 and an open point for B8 (U-6) |
| Validation and errors | `fromReplayLog(log, running)` returns `{ error }` for a log whose `engines` differ from `running.engines` and says both strings (a record never replays silently on other versions, ROBOTICS RA-22) |
| Edge cases | No inputs; a record with zero checkpoints (run shorter than 1 s); an input at `at` equal to a checkpoint time (input first, P0) |
| Performance | Recording adds under 5 percent to a 10 s Blink run (measured, printed); `pinTraceHash` over 20,000 edges under 20 ms |
| Migration | none |
| Unit tests | `record.test.ts`: round trip record to log to spec on a hand-made record, equal on every carried field and the log passes `validateReplayLog` from B2; a `docHash` of 16 hex is refused; more than 16 engine keys refused; a log whose `engines` differ from `running.engines` is refused with both strings; over-length version string refused; `trace.test.ts`: hash changes when one edge changes by 1 ns; order sensitive; `replay.test.ts`: a tampered checkpoint is reported as the first difference with its time. `src/sim-host/replay.test.ts` (`// @vitest-environment node`): for every Uno `arduino-cpp` project of the converter corpus (T-B2-20 `convertAll`, loaded in-process the way T-B2-16's `roundtrip.test.ts` does, or from `.corpus/` after `npm run corpus`; read the real helper first), ten runs of 5 s virtual give one serial hash and one pin-trace hash (SA-06); the test prints the project count; a run with a deliberately injected `Math.random` mutation in a fake engine is detected |
| Acceptance | Given the converted Uno corpus, When each project runs ten times with its recorded seed, Then all ten serial hashes are equal and all ten pin-trace hashes are equal |
| Release blockers | Any differing run in the corpus (this is the exit number SA-06) |
| Definition of done | Cases pass; `TL`, `PT` green |
| Verify | `TL`; `PT`; `V src/sim/replay src/sim-host/replay.test.ts` |
| Docs | replay paragraph and the PD-6 note in `docs/ARCHITECTURE.md` (T-B3-25) |
| Rollback | Revert |
| Later tasks need | 23 shows the ten-run check; 24 compares Chromium and WebKit hashes (R-048); B8 adds snapshots, probes and the shared run |

### T-B3-26. Watchdog, cancel and kill (SA-10, FA-07, AR-15)

| Field | Content |
|---|---|
| Identity | Subsystem simulation host. Phase B3. Priority must (F-044, R-043; BUD-12). Depends on T-B3-13 and T-B3-14. Status not started. Scope after review: two source files (PD-22) |
| Problem | A worker that is stuck inside one synchronous step never reads a `cancel` message. The host must terminate it after 2 s (RC-58) and rebuild it from the document, without losing the project |
| User and story | Amar: "if a sketch hangs the worker, the editor stays alive, I am told which limit hit, and Run works again" |
| Expected behaviour | The host arms a stall timer on every run: if no `frame`, `state` or heartbeat message arrives for 2,000 ms of wall time while the run is `running`, it terminates the worker, builds a new one, and reports `state: limit` with kind `wall-stall`. `control: cancel` and `stop` arm a 2 s answer timer; if the worker has not acked, the same kill happens. `stop` and `cancel` are two things. The handler's `cancel` is "stop pumping slices and ack" (T-B3-13); it can only be answered between slices. The hard stop is the host kill above, because nothing can interrupt a synchronous step in a worker (no `SharedArrayBuffer`, SYSTEM 6.9 and 17.2). `limit` errors from T-B3-14 already map to `state: limit` with the message in the handler (T-B3-13); this task adds nothing there. Zero-time loops end with `no-time-progress` from the orchestrator (T-B3-11) |
| Success metric | AR-15: an infinite loop in the sketch and a 2 GB allocation each end with the worker terminated or the run halted, and the main thread's frame gaps stay under 100 ms, within 2 s; the project hash is unchanged (FA-07 `sim` half: back to `ready` in under 3 s at 1x) |
| Existing files | `src/lib/interp/run.ts:229-` (`step`: `exec.opBudget = exec.ops + this.budget` per slice, the cooperative stop), `src/lib/interp/exec.ts:16` (`SYNC_LIMIT`), `:117-133` (`runSync`), `src/lib/interp/check-client.ts:17,64` (2 s grace precedent). All read only: `run.ts` and `exec.ts` are not edited (PD-22). The test-only stalling path already exists as `diag stall` in `src/sim-host/handler.ts` (T-B3-13) |
| New files | `src/sim-host/watchdog.ts`; edit `src/sim-host/host.ts` (2 source files); tests beside them |
| Interfaces | |

```ts
// watchdog.ts
export const STALL_MS = 2000;
export interface WatchdogDeps { timers: Timers; kill(reason: 'wall-stall' | 'cancel-unanswered'): Promise<void> }
export function createWatchdog(d: WatchdogDeps): { beat(): void; armCancel(): void; disarm(): void; stalled(): boolean };
```

| Field | Content |
|---|---|
| Algorithm | `beat()` resets the stall timer; `armCancel()` starts a 2,000 ms timer that kills unless `disarm()` (called on the ack). The host calls `beat()` on every message from the worker. On kill: terminate, create a new port, `restart()`, re-send `load` from the last `load` request kept in the host, set the run to `idle`, emit `state { limit }` |
| Validation and errors | Two kills in a row: the second is skipped while a restart is pending |
| Edge cases | A kill during `load`; a worker that dies by itself (`onerror`); cancel on an idle run (immediate ack) |
| Performance | The watchdog adds one timer reset per worker message; `lessons.test.ts` is not touched |
| Migration | none |
| Unit tests | `watchdog.test.ts` (fake timers): no beat for 2,000 ms kills; beats at 1,900 ms intervals never kill; `armCancel` then `disarm` at 1,999 ms does not kill; kill reason recorded. `host.test.ts` additions: a handler that never answers (a promise that never resolves) is killed after 2,000 ms of fake time and the host restarts and re-loads; hash of the project unchanged (FA-07 `sim` half). a handler built with `diag: true` that receives `diag stall` through an inline port never answers; the host test steps fake time 2,000 ms, sees the kill, the restart and the re-sent `load` (this is the unit stand-in for the real busy loop, which only a browser can show in T-B3-24) |
| Integration and e2e | Real thread, real `terminate()`, main-thread responsiveness: T-B3-23 buttons and T-B3-24 spec (rAF gap measurement) |
| Acceptance | Given a worker stuck in a synchronous busy loop (the `diag stall` path of the handler, created with `diag: true` by the Diagnostics panel), When `stop` is pressed, Then within 2,000 ms plus 100 ms the worker is terminated, a new worker is ready, and the editor's frame gaps stay under 100 ms |
| Release blockers | Any test that sleeps real time instead of stepping fake timers |
| Definition of done | Cases pass; `TL` green; no file under `src/lib/interp` changed |
| Verify | `TL`; `V src/sim-host` |
| Docs | the honest guarantee in `docs/ARCHITECTURE.md` (T-B3-25): JavaScript cannot cap a worker's heap, so the guarantee is "the tab survives" (R-043) |
| Rollback | Revert |
| Later tasks need | 23 shows the limit message; 24 records FA-07 and AR-15 |

### T-B3-27. Wire library, files, wipe and storage into the worker API

| Field | Content |
|---|---|
| Identity | Subsystem local storage. Phase B3. Priority must. Depends on T-B3-03, 04, 05, 06, 08. Status not started |
| Problem | The library, file, export and wipe modules are pure and tested against a repository. The roadmap puts every IndexedDB read and write in the `project` worker, so the page needs one typed API to call them |
| User and story | A developer building the list page: "I call `host.library.list()` and never touch IndexedDB" |
| Expected behaviour | `ProjectReq` gains `lib`, `file`, `data`, `storage` requests; `createProjectHandler` dispatches them to the existing modules; `ProjectHost` exposes `library`, `files`, `data` and `health` objects whose methods return promises. The split by thread is part of the API. The worker handles only IndexedDB work (library, file import and export, `exportAll`, `wipeStores`, `deleteAiData`, the progress copy). The main-thread host does what a worker cannot: it reads `localStorage.getItem('iynk:v1')` and sends the text in the requests that need it, and it runs `wipeBrowser` itself (localStorage, Cache Storage, service worker unregistering) |
| Success metric | Every library operation works through the inline port with a memory repository, with results equal to calling the module directly |
| Existing files | `src/local/project-protocol.ts`, `project-handler.ts`, `project-host.ts` (T-B3-03, edited here; `project.worker.ts` is not edited); modules from 04, 05, 06, 08 |
| New files | none; edit the three files above; test `src/local/api.test.ts` |
| Interfaces | |

```ts
// additions to ProjectReq
| { v: 1; id: number; t: 'lib'; call: LibCall }                 // list, create, rename, fork, trash, restore, emptyTrash, purgeExpired, trashList
| { v: 1; id: number; t: 'file'; call: { op: 'export'; id: string; kind: 'iynk' | 'iynkz' } | { op: 'import'; bytes: Uint8Array; name: string } | { op: 'markCopy'; id: string; has: boolean } }
| { v: 1; id: number; t: 'data'; call: { op: 'exportAll'; settingsJson: string | null } | { op: 'wipeStores'; confirmation: string } | { op: 'deleteAiData'; projectId?: string } }   // no localStorage, caches or serviceWorker work here: those run in the host
| { v: 1; id: number; t: 'storage'; call: { op: 'estimate' } | { op: 'persist' } }
// the 'open' request of T-B3-03 gains one optional field, read by the host from localStorage.getItem('iynk:v1') before it posts:
//   legacyProgress?: { done: unknown; quiz: unknown; best: unknown } | null
// additions to ProjectHost
readonly library: Library; readonly files: { exportProject(id: string, kind: 'iynk' | 'iynkz'): Promise<Uint8Array>; importBytes(bytes: Uint8Array, name: string): Promise<ImportOutcome>; markFileCopy(id: string, has: boolean): Promise<void> }; readonly data: { exportAll(): Promise<Uint8Array>; wipe(confirmation: string): Promise<WipeReport> /* host: checks the phrase, sends wipeStores to the worker, runs wipeBrowser({ local, caches, sw }) on the main thread, mergeWipeReports */; deleteAiData(projectId?: string): Promise<void> }; readonly health: { estimate(): Promise<{ usage: number; quota: number } | null>; persist(): Promise<boolean> };
// createProjectHost gains deps: { local: Storage | null; caches: CacheStorage | null; sw: ServiceWorkerContainer | null }  (the defaults are the page's globals; tests pass fakes)
export type ImportOutcome = { ok: true; id: string; hash: string; hashMatches: boolean; warnings: string[] } | { ok: false; error: ImportError; raw: Uint8Array };
```

| Field | Content |
|---|---|
| Algorithm | Import: `readIynk` or `readIynkz` in the worker; a project whose id already exists gets a new id through `forkProject` (no silent overwrite) and the outcome says so; a newer `schemaVersion` returns `ok: false` with the raw bytes back (M1 step 2 error case); success writes through the repository and sets `hasFileCopy` to `false` (it came from a file, but the library cannot know the file is kept; the open-from-file path sets it true when the handle exists). One-time import of the old `iynk:v1` progress into the `progress` store (PDM 11.6): the host reads `localStorage.getItem('iynk:v1')` (the worker cannot) and sends `done`, `quiz`, `best` as `legacyProgress` in the first `open` of the session; the handler copies them when the `progress` store has no `migrated:iynk-v1` row, writes that row, and leaves the localStorage key in place for one release (ADR-0106 migration step 4). `exportAll`: the host reads the `settings` field of the same key and sends it as `settingsJson`. `wipe(confirmation)`: the host checks `WIPE_PHRASE` first (wrong phrase: nothing is sent, nothing removed), then `wipeStores` in the worker, then `wipeBrowser` on the main thread, then `mergeWipeReports` |
| Validation and errors | Worker answers typed `error` messages; unknown `call.op` is `bad_message` |
| Edge cases | Import of the same file twice (second gets a new id); export of a project open in the shadow (uses the saved record, not the shadow, and says so) |
| Permissions | P0 |
| Performance | The extra requests add no cost to `commit`/`save` |
| Migration | The `iynk:v1` progress copy above |
| Unit tests | `api.test.ts` (inline port, memory repo): each library op through the host equals the direct call; import of a hostile fixture returns the named error; import of a newer-schema document returns `raw`; double import makes a fork id; `wipe` with the wrong phrase fails and removes nothing in either thread; `wipe` with the right phrase returns one merged `WipeReport` whose `stores` came from the handler and whose `localStorageKeys`, `caches` and `serviceWorkers` came from fakes passed to the host; the handler suite runs in a context where `localStorage`, `caches` and `navigator.serviceWorker` are undefined (`vi.stubGlobal`) and every library, file, `data` and `storage` call still passes, so an inline port cannot hide a worker-only failure; `iynk:v1` progress copied once (second `open` copies nothing); `exportAll` carries `settingsJson` and the handler never reads `Storage` |
| Acceptance | Given a project exported to bytes, When the bytes are imported into an empty library, Then the project is listed and its hash equals the exported one (AR-17 core) |
| Release blockers | A request that bypasses the typed union |
| Definition of done | Cases pass; `TL` green |
| Verify | `TL`; `V src/local` |
| Docs | API table in `docs/PROJECT_FILES.md` (T-B3-25) |
| Rollback | Revert (the three files return to the T-B3-03 state) |
| Later tasks need | 21, 23, 24 call only this API |

### T-B3-21. Bare `/[lang]/studio` list page

| Field | Content |
|---|---|
| Identity | Subsystem studio shell. Phase B3. Priority must (F-092, F-174 slice; M1 steps 1, 2, 7, 8 in a browser). Depends on T-B3-27. Status not started |
| Problem | Everything so far is headless. The B3 card promises "a minimal page that lists projects (no editor)": New, Open, Open from file, rename, duplicate, delete to trash, restore, and the storage and file warnings |
| User and story | Amar: "I open `/en/studio`, press New project, see it in the list, reload, and it is still there" |
| Expected behaviour | A prerendered page per language (ADR-0401). It lists projects newest first with name, board, size, a "saved to file" mark, and the used and available space. Actions per row (labelled with the project name): Open, Save to file, Rename, Duplicate, Delete. A trash section with Restore and Empty trash. Banners: IndexedDB unavailable (projects will not be kept; Save to file offered), a damaged save replaced by the previous copy (`recovered_from_previous`) or lost (`record_lost`, with Save to file for the raw record), quota failure, "changed in another tab", "not saved to a file" after 10 minutes. Open selects a project and shows title, board, revision and hash prefix; there is no canvas |
| Success metric | Playwright: New, reload, still listed; axe finds 0 serious and 0 critical violations; the page makes no request outside the app origin (M1 step 1) |
| Existing files | UI: section 6.3 "UI and copy" applies in full (read `/Users/amar/iynk-build/state/UI_RULES.md` first; build on `src/components/ui`; screenshots of the empty list, a populated list, the trash, each banner, light and dark, 1440x900 and 390x844). `src/app/[lang]/about/page.tsx:1-40` (pattern: `type Props = PageProps<"/[lang]/about">` at line 14, `isLocale`, `getT`, `alternatesFor`, `<Suspense fallback=...>` at line 36); `src/app/[lang]/layout.tsx:26` (`generateStaticParams`); `src/i18n/namespaces.ts:4,8` (`NAMESPACES`, `Messages`); `src/i18n/messages/<lang>/*.json`; `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md:94` (`ssr: false` is not allowed in a Server Component, so the dynamic import sits in a client wrapper); `e2e/boardlab.spec.ts:3,183` (axe pattern); `playwright.config.ts:48-51` (projects `chromium` and `phone`) |
| New files | `src/app/[lang]/studio/page.tsx`, `src/components/studio/StudioEntry.tsx`, `ProjectList.tsx`; edit `src/i18n/namespaces.ts`; new `src/i18n/messages/{en,de,es,fr,hi,zh}/studio.json` (counts as 1); tests `src/components/studio/ProjectList.test.tsx`, `e2e/studio-list.spec.ts` |
| Interfaces | |

```ts
// page.tsx (server): reads params, isLocale, getT(lang, 'studio'), renders <Suspense fallback><StudioEntry strings={...} lang={lang} /></Suspense>; exports generateMetadata with alternatesFor
// StudioEntry.tsx ('use client'): const ProjectList = dynamic(() => import('./ProjectList'), { ssr: false, loading: () => <div aria-busy="true" /> })
// ProjectList.tsx ('use client')
export interface ProjectListProps { strings: StudioStrings; lang: string; host?: ProjectHost }   // host injected in tests
```

| Field | Content |
|---|---|
| Algorithm | On mount: create the `ProjectHost` (T-B3-03), `await hydrateKeys(createKeysBackend(db))` (T-B3-07; `ProjectList.tsx` is UI, so it may import `src/lib/keys` and `src/local` both; the key move runs on the main thread in B3, and B14 moves key reads into the `AiWorker`, SYSTEM 6.8), call `library.purgeExpired()`, `library.list()`, `health.estimate()`, `health.persist()` once on the first save. A `degraded` event shows the IndexedDB banner. Save to file calls `host.files.exportProject(id, 'iynk')` then `saveToFile`, then `markFileCopy`. Open from file uses `openFile` then `importBytes`; a newer-schema result offers the raw bytes back as a download. All text comes from `strings`; no string is hard-coded in the component |
| State transitions | List: `loading` to `ready` or `degraded` or `error`. Row: `idle` to `busy` (during an action, button disabled with `aria-busy`) |
| Validation and errors | Rename: 1 to 120 characters, inline message. Delete asks no confirmation (trash makes it reversible). Wipe is not on this page (Settings arrives later); `data.wipe` stays reachable only from Diagnostics in B3 |
| Edge cases | Zero projects (empty state with the New button focused); 200 projects (list is a plain table, no virtualisation, ESTIMATED fine); a project that fails to open (row shows "could not open" with Save to file for the raw record) |
| Permissions | P0. No `fetch`. Lint rule `no-restricted-properties` is not added for `fetch`; the e2e request listener proves it |
| Performance | First list under 300 ms after hydration on desktop (ESTIMATED; printed by e2e) |
| Migration | none |
| Unit tests | `ProjectList.test.tsx` (RTL, jsdom, injected host over memory repository): empty state; New adds a row; rename; duplicate; delete moves to trash; restore; degraded banner appears when the host emits `degraded`; the recovered banner appears when the host emits `recovered_from_previous`; every button has an accessible name containing the project name; keyboard: Tab reaches each action, Enter activates. `messages.test.ts` (existing) proves the six `studio.json` files have the same keys |
| Playwright | `e2e/studio-list.spec.ts` (Chromium): visit `/en/studio`; no request to another origin (listener on `page.on('request')`); New project; reload; row present; Duplicate and Delete and Restore; with `page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { value: undefined }) })` the banner shows and New still works; axe on `/en/studio` with a project present has 0 serious and 0 critical |
| Acceptance | Given an empty profile, When Amar opens `/en/studio` and presses New project, Then a row "Blink" appears with board Uno; after a reload it is still there |
| Observability | Banner states are `role="status"`; the list has `data-testid="project-list"` for the specs |
| Release blockers | axe serious or critical; a request outside the origin; a hard-coded user-visible string; `next build` failing on `ssr: false` placement |
| Definition of done | Unit and e2e pass; `TL`, `BUILD` green; six languages complete |
| Verify | `TL`; `V src/components/studio src/i18n`; `BUILD`; `E e2e/studio-list.spec.ts` |
| Docs | none yet (T-B3-25) |
| Rollback | Revert; the route disappears |
| Later tasks need | 09 mounts the service worker registration here; 23 adds Diagnostics to `StudioEntry.tsx`; B4 replaces the page body with the editor |

### T-B3-09. Service worker and offline shell

| Field | Content |
|---|---|
| Identity | Subsystem offline. Phase B3. Priority must (F-094, R-040; FA-09, AR-01). Depends on T-B3-21 and T-B3-S3. Status not started |
| Problem | After one online load, the app must work with no network. `experimental.useOffline` only retries (ADR-0406); a hand-written worker is the chosen route |
| User and story | Amar: "on a train I reload `/en/studio` and my projects are there" |
| Expected behaviour | `public/sw.js` precaches the shell chosen by S3, answers navigations network-first with a 3 s timeout, `/_next/static/*` cache-first, figures stale-while-revalidate capped at 200 MB, and never caches `/v1/*`, `/api/*`, non-GET, cross-origin or WebSocket traffic. The cache name carries the build id; `activate` deletes older `iynk-*` caches; no `skipWaiting` (an open Studio session is never replaced under the user). It reserves the cache name `iynk-engines-v1` and leaves it empty (PD-3) |
| Success metric | Chromium: online load, offline reload shows the list with 0 failed same-origin requests; client navigation offline falls back to a hard navigation answered from the cache (FA-09) |
| Existing files | `next.config.ts:37-50` (`async headers()` returns the `/:path*` block with `SECURITY_HEADERS`, whose page CSP (D-022, `src/lib/csp.ts`) already has `worker-src 'self' blob:` and `connect-src 'self'`, and then the `/figures/:path*` block; add the `/sw.js` block after both, so its `Content-Security-Policy` and `Cache-Control` win over the catch-all); `next.config.ts:21` (`cacheComponents: true`) and `:22` (`partialPrefetching: true`); `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md:636-666` (the `/sw.js` header block: `Content-Type`, `Cache-Control: no-cache, no-store, must-revalidate`, CSP `default-src 'self'; script-src 'self'`); `.../05-config/01-next-config-js/generateBuildId.md` and `env.md` (read both before editing); `BS-03-sw-precache/REPORT.md` (the S3 verdict) |
| New files | `public/sw.js` (plain JavaScript, under 300 lines), `src/local/sw-register.ts`, `src/components/studio/SwRegister.tsx`; edit `next.config.ts` (a module-level `BUILD_ID` constant, `headers` for `/sw.js`, `generateBuildId: async () => BUILD_ID`, `env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID }`) and `src/app/[lang]/studio/page.tsx` (mount `<SwRegister />`); tests `src/local/sw-register.test.ts`, `e2e/offline.spec.ts` |
| Interfaces | |

```ts
// sw-register.ts
export function registerServiceWorker(deps: { nav: Pick<Navigator, 'serviceWorker'> | undefined; buildId: string; isProd: boolean; location: Pick<Location, 'protocol' | 'hostname'> }): Promise<{ registered: boolean; reason?: 'unsupported' | 'insecure' | 'development' }>;
// sw.js: version = new URL(self.location.href).searchParams.get('v'); caches 'iynk-shell-' + version, 'iynk-static-' + version, 'iynk-figures-v1', 'iynk-engines-v1'
```

| Field | Content |
|---|---|
| Build id (one value for three uses) | `env` in `next.config.ts` is read when the config loads, before Next calls `generateBuildId`, so two separate computations can differ and the service worker `?v=` would not match the build. So the id is computed once, at the top of `next.config.ts` (after the imports at line 2): `const BUILD_ID = (process.env.IYNK_BUILD_ID ??= computeBuildId())`, where `computeBuildId()` returns `process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12)`, else `git rev-parse --short=12 HEAD` through `execFileSync` in a try block, else `'t' + Date.now().toString(36)`. Writing the result back to `process.env.IYNK_BUILD_ID` means a second load of the config in a child process reads the same value (the time fallback would otherwise differ per load). The same `BUILD_ID` constant feeds `generateBuildId` (read `.../generateBuildId.md` first) and `env.NEXT_PUBLIC_BUILD_ID`, and the page passes `process.env.NEXT_PUBLIC_BUILD_ID` to `registerServiceWorker`. |
| Algorithm | Register `/sw.js?v=<buildId>` only in production and on `https:` or `localhost`; in development, unregister any existing worker. `install`: fetch and store the precache list (source from S3: build output or the HTML scan); do not `skipWaiting`. `activate`: delete caches that start with `iynk-` and are not current. `fetch`: GET and same-origin only; routing as in Expected behaviour; a navigation that fails goes to the cached HTML for the same path, else to the cached `/<lang>/studio`. Figures: put on first use; evict oldest when the cache passes 200 MB (sum of `content-length`). `message { type: 'SKIP_WAITING' }` is handled so B4 can add the update banner |
| Validation and errors | A failed precache fetch fails `install` (the old worker stays); the page works without a worker |
| Edge cases | Private window (no Cache Storage quota: registration succeeds, caching errors are swallowed); two tabs on different builds; a 404 for an old chunk (network-first falls through); Safari ITP eviction (documented in ADR-0406, the file nudge exists for this) |
| Permissions | The B1 policy has `worker-src 'self' blob:` and `script-src 'self'` (SYSTEM 7.4, FRONTEND 9.1), which allows `/sw.js` and the module workers; the e2e checks 0 `securitypolicyviolation` events. Scope `/`; same-origin GET only; never `/v1/*` or `/api/*`, so tokens and project data from a server are not stored |
| Performance | Precache under 1.5 MB gzip (ADR-0406 ESTIMATE; the measured size goes in the commit body and in T-B3-25) |
| Migration | none (no earlier worker) |
| Unit tests | `sw-register.test.ts`: development unregisters; `http:` on a non-localhost host is `insecure`; missing `serviceWorker` is `unsupported`; production registers the versioned URL, and the URL passed to `register` is exactly `/sw.js?v=` plus the `buildId` argument. A second assertion reads `next.config.ts` text and checks that `generateBuildId` and `NEXT_PUBLIC_BUILD_ID` both reference the one `BUILD_ID` constant, and that no second call to `computeBuildId` exists |
| Playwright | `e2e/offline.spec.ts`: online visit to `/en/studio`, wait for `navigator.serviceWorker.ready`, reload once (so the page is controlled), `context.setOffline(true)`, reload: heading and list visible; `/v1/anything` is not in Cache Storage; the cache name contains the build id, and that id equals `NEXT_PUBLIC_BUILD_ID` read from the page and the contents of `.next-build/BUILD_ID` (the value `generateBuildId` returned; the agent checks that Turbopack writes that file and drops this clause with a note in the commit body if it does not, UNKNOWN today) |
| Acceptance | FA-09 (list part): load `/en/studio` online once, go offline, reload, the list renders. The full FA-09 (edit, run, save offline) is part of T-B3-24 |
| Release blockers | Any cached `/v1/*` or `/api/*` entry; the worker served with a cacheable `Cache-Control`; `skipWaiting` present |
| Definition of done | Unit and e2e pass; `TL`, `BUILD` green |
| Verify | `TL`; `V src/local/sw-register.test.ts`; `BUILD`; `E e2e/offline.spec.ts` |
| Docs | offline paragraph in `docs/ARCHITECTURE.md` (T-B3-25) |
| Rollback | Ship a worker that unregisters itself and deletes `iynk-*` caches (ADR-0406 Reversibility), or revert the commit; the unregister variant is needed if a build has already been visited |
| Later tasks need | B9 adds the engine loader and fills `iynk-engines-v1`; B4 adds the update banner; 24 runs the full offline walk |

### T-B3-23. Diagnostics panel: run, kill, replay, save speed

| Field | Content |
|---|---|
| Identity | Subsystem studio shell (temporary). Phase B3. Priority must (it is the browser driver for SA-10, FA-07, AR-15, SA-01 leg B and FA-08; PD-9). Depends on T-B3-06, 13, 15, 19, 21, 26, 27. Status not started |
| Problem | The real `Worker`, real IndexedDB and real kill cannot be proved in jsdom. A `window` debug hook would put test code in the app. A visible Diagnostics section on the bare page is honest and useful to Amar |
| User and story | Amar: "I press Run sample and see serial text and the LED follow pin 12; I press Endless loop and Run works again two seconds later" |
| Expected behaviour | A collapsed `<details>` section "Diagnostics" under the list. Controls: Run sample (the `uno-blink-d12` sample project of T-B3-06, 5 simulated seconds, speed 0) shows the LED edge count, the trace hash and the serial text (empty for this sketch, shown as "no serial output"); Run ten times shows "10 of 10 equal" or the first difference; the four allocation probes and an endless loop each show `limit` or "ended at the run length" and then "worker still answers"; Stall the worker (diag) shows the kill and restart time; Kill the sim worker and Kill the project worker show the recovered hash; Save speed (500 parts) has a file input "Pick a project to time" and shows p50 and p95 commit-to-saved for the picked document; Check 5 lessons runs five board lessons through the real worker and shows "5 of 5 equal"; a frame-gap monitor shows the longest `requestAnimationFrame` gap in the last 5 s |
| Success metric | Every control writes a result to an element with a `data-testid` and `aria-live="polite"`, so T-B3-24 reads numbers from the page |
| Existing files | UI: section 6.3 "UI and copy" applies; the Diagnostics section is a temporary developer driver, so it gets the same states, focus ring and copy rules but no extra polish, and screenshots of it open, with a result shown, light and dark. `src/components/studio/StudioEntry.tsx` (T-B3-21, edited here to mount the section through `dynamic`), `src/i18n/messages/<lang>/studio.json` (T-B3-21, six files edited), `src/content/index.generated` (`boardLoaders` for the five lessons; `lessons.test.ts:52` shows the use), `src/project/samples.ts` (T-B3-06), `src/sim-host/index.ts` (T-B3-15: `buildSimNetlist` reaches the page through `sim-host`, so the page never imports `src/sim` itself, M-5), `src/parts/builtin.ts` (`builtinRegistry()`, T-B2-12), `src/export/iynk.ts` (`writeIynk`) |
| New files | `src/components/studio/Diagnostics.tsx`, `src/components/studio/diagnostics-run.ts`; edit `StudioEntry.tsx` and the six `studio.json`; test `src/components/studio/diagnostics-run.test.ts` |
| Interfaces | |

```ts
// diagnostics-run.ts  (no React; takes the hosts so tests use inline ports)
export interface DiagDeps { sim: SimHost; project: ProjectHost; library: Library; reg: Pick<PartRegistry, 'get'>; wallMs(): number; frames: { maxGapMs(): number } }
export function runSample(d: DiagDeps, seconds?: number /* 5 */): Promise<{ serial: string; ledEdges: number; ledOnMs: number; traceHash: string; limit: string | null }>;
export function runTen(d: DiagDeps): Promise<{ equal: number; of: 10; firstDiff: string | null }>;
export function runProbe(d: DiagDeps, which: 'list-repeat' | 'bytearray-loop' | 'c-array' | 'string-double' | 'endless-loop'): Promise<{ ended: 'limit' | 'run-length' | 'killed'; message: string; workerAnswers: boolean; ms: number }>;
export function runStall(d: DiagDeps): Promise<{ killedInMs: number; restartedInMs: number; maxFrameGapMs: number }>;
export function runKill(d: DiagDeps, which: 'sim' | 'project'): Promise<{ recoveredMs: number; hashBefore: string; hashAfter: string }>;
export function runSaveSpeed(d: DiagDeps, doc: Project): Promise<{ p50: number; p95: number; samples: number }>;   // the document is a parameter: the 500-part generator of B2 (src/project/testing) is test support and never ships in the app chunk
export function runLessonCheck(d: DiagDeps, count: 5): Promise<{ equal: number; of: number }>;
```

| Field | Content |
|---|---|
| Algorithm | The sample project is `sampleBlinkD12()` (PD-20), checked with `validateValue`, never `blankProject` (no ground net, no LED). `runSample` writes it with `writeIynk` and imports it through `project.files.importBytes` (so it is in the library like any file, the AR-17 path), builds a `SimNetlist` with `buildSimNetlist(doc, d.reg)`, loads it with the Blink source, runs to `done`, reads the frames and counts LED part-state changes of `cmp_led1`. `runTen` and `runLessonCheck` use the same sample and the five lessons. The four probes are the SIMULATION SA-10 sketches as constants. `runStall` creates a second `SimHost` with `diag: true`, sends `diag stall`, waits for the watchdog kill and the new `ready`. `runSaveSpeed` takes the document as a parameter, opens it, applies 30 single-op commits (`meta.set`, through a main-thread `createSession` whose `subscribe` feeds `host.commit`) each followed by `save`, and measures commit-to-`saved` with `performance.now()` (a component may use it; it is outside `src/sim`). The page gets the document from a file input that uses the existing Open from file path (`openFile` and `importBytes`, which also exercises AR-17). T-B3-24 builds the 500-part, 1,000-wire document in the Playwright process with the T-B2-16 generator (`src/project/testing/generators.ts`), writes it with `writeIynk` to a temporary file and hands it to the input with `setInputFiles`. So no test-support module is imported by an app component and none is in a dynamic chunk |
| Validation and errors | Each function returns an error string in its result instead of throwing; the section never blocks the list |
| Edge cases | Pressing two controls at once (second disabled while one runs); a worker that fails to start (message shown); no `Worker` support (inline port with a note) |
| Permissions | P0. Wipe and export-all buttons are also placed here for B3 (`data.exportAll`, `data.wipe` with the typed phrase) because the Settings page does not exist yet; they move in the settings phase |
| Performance | The section's code loads only when the `<details>` opens (dynamic import) so the first load is unchanged |
| Migration | none. B4 either moves this to `/studio/diagnostics` or deletes it; the task notes it in the commit body |
| Unit tests | `diagnostics-run.test.ts` (inline ports, memory repo, fake `wallMs`): `runSample(d, 2)` returns 4 LED edges (at 0, 500, 1,000 and 1,500 ms) on the sample project, an empty serial string and a 16-digit hash; `runTen` equal 10 of 10; each probe returns `limit`; `runKill('project')` returns equal hashes; `runSaveSpeed(d, generate500Parts())` returns numbers for 10 samples (the unit test may import the generator because it is a test file) |
| Playwright | Read by T-B3-24 |
| Acceptance | Given the page and Run sample, When it finishes, Then the result shows 10 LED edges (D12 at 0, 500, ... 4,500 ms; the test pins the run end so the edge at 5,000 ms is not counted), a 16-digit trace hash, "no serial output" and no limit |
| Release blockers | Strings that are not in the six languages; the panel loading on first paint; an import of `src/project/testing/` or any `*.test.ts` file from `Diagnostics.tsx` or `diagnostics-run.ts` (a grep in the unit test fails on it) |
| Definition of done | Unit tests pass; `TL`, `BUILD` green |
| Verify | `TL`; `V src/components/studio src/i18n`; `BUILD` |
| Docs | none |
| Rollback | Revert; the page returns to the T-B3-21 state |
| Later tasks need | 24 drives every control through Playwright |

### T-B3-24. Headless acceptance walk, WebKit, FA-08, AR-17

| Field | Content |
|---|---|
| Identity | Subsystem acceptance. Phase B3. Priority must (exit gate; R-048, AR-17, FA-07..09, SA-10, SA-01 leg B). Depends on T-B3-09 and T-B3-23. Status not started |
| Problem | R-052 (headless core test harness, must; the roadmap B3 scope lists it) has no owner yet: the Node walk below is that harness for B3. The exit gate wants M1 steps 1, 2, 6, 7, 8 passing headless, the Chromium and WebKit hashes equal, and the FA numbers measured. Nothing yet runs the whole path |
| User and story | Amar: "one command tells me the project core works in two browsers" |
| Expected behaviour | A Node walk (vitest) proves steps 1, 2, 6, 7, 8 with a memory repository, inline ports and the interpreter engine. A Playwright spec repeats them on the real page in Chromium and WebKit and records hashes. A Chromium-only spec measures FA-08. A comparison project fails when the two browsers' hashes differ and prints the first differing event |
| Success metric | All of: R-052, meaning steps 1, 2, 6, 7, 8 pass in Node (no browser, no network, `fetch` replaced by a function that throws), then in Chromium and WebKit; R-048 hashes equal; FA-07 `sim` back to ready under 3 s and `project` hash equal; FA-08 p95 under 50 ms and main-thread tasks under 8 ms during save; FA-09 passes; AR-17 passes |
| Existing files | `playwright.config.ts:7-14` (`pickPort`: a random port from 40000 to 49999, never 3000 or 43117), `:20-32` (`BLANK`, the variables blanked for the web server), `:48-51` (projects `chromium`, which ignores `*.phone.spec.ts`, and `phone`), `:53-` (webServer, `reuseExistingServer: false`); `vitest.config.mts:12` (`include` is `src/**/*.test.{ts,tsx}`, `figures/**/*.test.{js,mjs,ts}` and `scripts/**/*.test.{js,mjs,ts}`; the walk may live under `src/local`, it is not forced there, and `src/local/acceptance.test.ts` is chosen because it imports `src/local` modules); `e2e/boardlab.spec.ts` (pattern); installed browsers: WebKit is already in the local cache (VERIFIED: `~/Library/Caches/ms-playwright/webkit-2370`), otherwise `npx playwright install webkit` |
| New files | edit `playwright.config.ts`; tests `src/local/acceptance.test.ts`, `e2e/core.spec.ts`, `e2e/save-perf.spec.ts`, `e2e/r048-compare.spec.ts` |
| Interfaces | `playwright.config.ts` additions: |

```ts
{ name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: [/.*\.phone\.spec\.ts/, /r048-compare\.spec\.ts/] },
{ name: 'webkit', use: { ...devices['Desktop Safari'] }, testMatch: /core\.spec\.ts/ },
{ name: 'r048', testMatch: /r048-compare\.spec\.ts/, dependencies: ['chromium', 'webkit'] },
```

| Field | Content |
|---|---|
| Algorithm | Node walk, one `it` per step with the exact wording of FEATURE_PRIORITIZATION 7.2. Step 1: empty library; `fetch` is replaced by a function that throws, never called; IDB-unavailable repository switch gives `degraded`. Step 2: `create` gives `schemaVersion '1.1'`, board `brd_uno`, views `vw_bb` and `vw_sch`, empty `components` and `nets`, one source `main.ino`, `simulation.seed`; a newer-schema file is refused with the raw bytes returned. Step 6: the sample project (`sampleBlinkD12()`, validated, then imported through `files.importBytes`; not `blankProject`, which has no ground net or LED, PD-20) runs ten times to equal serial and pin-trace hashes; the `cmp_led1` part state is lit exactly while D12 is high (checked against the pin edge list); the four probes end `limit`. Step 7: commit ops, save, build a new host over the same repository: equal hash, undo stack empty (history before the reload point is not undoable), a quota-failing repository gives `save_failed: quota` and the last good copy stays. Step 8: export `.iynk`; open by library and by file: equal hashes. AR-17: wipe all stores then import the bytes: equal hash. Playwright `core.spec.ts`: the same on the page, with `Save to file` caught as a download, site data cleared by script (`indexedDB.deleteDatabase('iynk')`, `caches.keys()` deletion, `localStorage.clear()`), `setInputFiles` for Open from file; FA-07 kill buttons; SA-10 probes; AR-15 stall with a `requestAnimationFrame` gap recorder; SA-01 leg B; offline walk (online once, `setOffline(true)`, reload, New project, Run sample, save, list shows it); at the end it writes `{ serialHash, traceHash, hashes }` to `test-results/r048-<project>.json`. `save-perf.spec.ts`: builds the 500-part, 1,000-wire document in the Playwright process with `src/project/testing/generators.ts` (T-B2-16), writes it with `writeIynk` to `test.info().outputPath('save500.iynk')` and gives it to the Diagnostics file input with `setInputFiles` (T-B3-23), so the app ships no generator; Chromium DevTools tracing (`Tracing.start` with `devtools.timeline`), Save speed, then reads the longest `RunTask` on the main thread during saves; also the close-the-tab case: commit, close the page at once, reopen, record whether the last batch survived (recorded, not gated, per FA-08 wording). `r048-compare.spec.ts`: reads both JSON files and expects equality, printing the first differing key |
| Validation and errors | If WebKit is not installed the `webkit` project fails with the install command in the message (R-001: no skip under `CI=true`) |
| Edge cases | Download event differences in WebKit (use `page.waitForEvent('download')` and read the path); WebKit cannot use File System Access (the download path is the one under test, which is the intended M1 step 8 fallback) |
| Permissions | P0; port 43117 and 3000 never used (the config picks 40000 to 49999 minus 43117) |
| Performance | The numbers it records are the FA-08 and BUD-08 evidence (UNKNOWN until now) |
| Migration | none |
| Unit tests | `acceptance.test.ts` as above |
| Acceptance | R-052: Given a clean checkout, When `V src/local/acceptance.test.ts` runs with no network, Then the five walk steps pass and the file prints the five step names. Given `CHECK` (`KL npm run check`), When it ends, Then all three Playwright projects pass; the `r048` project reports equal hashes; `docs/.../results/B3.md` inputs exist in `test-results/` |
| Release blockers | Any red step; hashes that differ between Chromium and WebKit (stop and report; do not weaken the check, D-014); FA-08 over budget (report the number, Amar decides) |
| Definition of done | Walk and specs pass; `TL` green; `CHECK` green |
| Verify | `TL`; `V src/local/acceptance.test.ts`; `E e2e/core.spec.ts e2e/save-perf.spec.ts e2e/r048-compare.spec.ts` |
| Docs | none (T-B3-25) |
| Rollback | Revert |
| Later tasks need | 25 copies the numbers; B4 reuses `core.spec.ts` steps and extends them to steps 3 to 5 |

### T-B3-25. Exit record and documentation

| Field | Content |
|---|---|
| Identity | Subsystem docs. Phase B3. Priority must (exit gate "numbers recorded"). Depends on all tasks. Status not started |
| Problem | The exit gate says SA-01, SA-02, SA-06, SA-10, FA-07, FA-08, FA-09 are recorded, and the card promises a runtime diagram and a project-files page |
| User and story | Amar: "at the stop I read one page and see every number and every deviation" |
| Expected behaviour | `docs/MASTER_PLAN/05_ENGINEERING/results/B3.md` holds a table: criterion, threshold, measured value, command, date, machine, browser, verdict; plus the three spike verdicts and any open deviation. `docs/PROJECT_CORE.md` (B2) gets the new folders in its module map, loses its sentence that `src/protocol`, `src/sim` and `src/export` do not exist yet, and gains a runtime section (workers, ports, stores); `docs/ARCHITECTURE.md` is git-ignored and is not written. The prose avoids the words `scripts/copy-check.mjs` bans and any test count. `docs/PROJECT_FILES.md` (new) describes `.iynk`, `.iynkz`, the stores and the worker API. `docs/DATA_HANDLING.md` (B1) gets the keys and wipe lines |
| Existing files | `docs/PROJECT_CORE.md` (T-B2-21: module map, import matrix, portable rules); `docs/DATA_HANDLING.md` (B1; its "How to wipe" section lists the Settings steps and clearing site data). `docs/ARCHITECTURE.md` does not exist in the tree (git-ignored). |
| New files | `docs/PROJECT_FILES.md`, `docs/MASTER_PLAN/05_ENGINEERING/results/B3.md`; edit `docs/PROJECT_CORE.md`, `docs/DATA_HANDLING.md` |
| Algorithm | The agent runs `CHECK` (`KL npm run check`) once, then the numbers commands of section 8, once on a quiet machine and once under `LOAD` (roadmap 2.3), and copies real output. A number that was not measured is written UNKNOWN, never filled in |
| Validation | Every row names the command that produced it |
| Edge cases | A criterion that failed: the row says FAIL with the number and the task that owns the fix; the phase does not close |
| Unit tests | none (docs) |
| Acceptance | Given the results file, When Amar reads it, Then each of SA-01, SA-02, SA-06, SA-10, FA-07, FA-08, FA-09, AR-17, R-048, R-052 has a measured value and a verdict |
| Release blockers | A number without a command |
| Definition of done | File complete; `CHECK` green on the final commit; local tag `phase-B3` is made by the orchestrator after Amar's OK, not by this task |
| Verify | `TL`; `CHECK` |
| Docs | this task is the docs |
| Rollback | Revert |
| Later tasks need | B4 starts from the recorded state |

## 8. How each exit item is proved

| Exit item | Proof | Task | Command |
|---|---|---|---|
| `npm run check` | Whole suite green | 25 (and every task keeps it green) | `KL npm run check` (never bare: it ends in `npm run e2e`, which builds and serves the app) |
| SA-01 | 102 of 102 equal through the inline port; 5 sampled through a real Worker | 13 (leg A), 23 and 24 (leg B) | `V src/sim-host/sa01.test.ts`; `E e2e/core.spec.ts` |
| SA-02 | 99 of 99 circuits within 1e-9 relative, worst value printed | 18 | `V src/sim/analog/equivalence.test.ts` |
| SA-06 | Ten identical runs per converted Uno project | 19 | `V src/sim-host/replay.test.ts` |
| SA-10 | Four probes end `limit`; stall killed within 2 s | 14 (probes), 26 and 24 (kill) | `V src/lib/interp/limits.test.ts`; `E e2e/core.spec.ts` |
| FA-07 | Kill `sim` and `project` workers; project unchanged | 03 and 26 (unit), 24 (browser) | `V src/local src/sim-host`; `E e2e/core.spec.ts` |
| FA-08 | Save p95 under 50 ms at 500 parts and 1,000 wires; tasks under 8 ms | 23 and 24 | `E e2e/save-perf.spec.ts` |
| FA-09 | Offline reload, edit, run, save | 09 (list), 24 (full) | `E e2e/offline.spec.ts e2e/core.spec.ts` |
| Headless M1 steps 1, 2, 6, 7, 8 and R-052 (headless core test harness) | Node walk and browser spec | 24 | `V src/local/acceptance.test.ts`; `E e2e/core.spec.ts` |
| AR-17 | Clear site data, open `.iynk`, equal hash | 05, 27, 24 | `V src/local/acceptance.test.ts`; `E e2e/core.spec.ts` |
| R-048 | Chromium and WebKit hashes equal | 24 | `E e2e/r048-compare.spec.ts` |
| Also recorded | SA-04 (non-convergent circuits), SA-08 second clause, SA-11 lint (test files exempt, tested), AR-01, AR-02 (the existing matrix test; no new cells, section 3.1), AR-15 | 17, 11, 10, 10, 24, 26 | their unit tests; `V src/architecture.test.ts` |

## 9. For Amar

Work only a person can do, or a choice only he can make. None of this is an agent task.

| # | Item | When | Default if he says nothing |
|---|---|---|---|
| 1 | Approve the new dev dependency `fake-indexeddb` (T-B3-02), and `fflate` only if T-B3-S1 says so | Before G1 | Approve `fake-indexeddb`; refuse `fflate` unless S1 fails |
| 2 | Decide PD-1 (adapters in `src/sim-host/engines` instead of making `src/lib/interp` portable now), PD-2 (no matrix edit is needed; the cells stay as text rows, section 3.1), PD-6 (ReplayRecord and ReplayLog conflict, now three conflicts), PD-8 (rule DP-1), PD-14 (SVG assets refused in B3), PD-16 (server token stays in localStorage), PD-18 (the six B3 differences from the SIMULATION interfaces), PD-19 (`slot:` key rows), PD-20 (the sample project copy), PD-21 (no dict cap), PD-22 (no `Run.cancel()`) | Before G1 for PD-2 and PD-18 (T-B3-10 and T-B3-11 build them), before G3 for the rest | The defaults in section 3 |
| 3 | Try the Open from file and Save to file path in his own Safari (Playwright WebKit is not Safari) and in his own Chrome with a real picked file; time one save on the phone or Chromebook he has | After G8 | Not blocking; recorded as UNKNOWN |
| 4 | T-B3-S2 cannot test a user-picked file handle in a worker (the picker needs a person): a two-minute manual check in Chrome after T-B3-05 and 27 | After G5 | If it fails, the save path uses the main-thread fallback |
| 5 | Accept the SA-02 subset if fewer than 99 circuits can be golden-tested | At T-B3-18 | 99 required |
| 6 | The roadmap row count and effort for B3 change (21 to 27 tasks plus 3 spikes; effort UNKNOWN, ESTIMATED unchanged at 6, 9, 13 weeks because tasks are smaller, not fewer) | At the stop | Orchestrator updates the roadmap |
| 7 | After the stop: choose whether `build/v1` merges into `main` (a push to `main` deploys Vercel) | After B3 OK | Do not merge |

## 10. Unknowns and open questions

| # | Item | Label | What settles it |
|---|---|---|---|
| U-1 | Real B2 export names (settled 2026-10-28, section 1.2) and the `baseSeq` meaning of `source.edit` | UNKNOWN for `baseSeq` | Read B2's code at the start of T-B3-04, 03, 06, 15 |
| U-2 | IndexedDB write from a worker at `pagehide`; `createWritable()` in a worker | UNKNOWN | T-B3-S2 |
| U-3 | RSC requests offline; precache source | UNKNOWN | T-B3-S3 |
| U-4 | Zip approach and licence | UNKNOWN | T-B3-S1 |
| U-5 | Whether 99 golden circuits can all be generated (some lesson circuits may use parts the Uno page lacks) | UNKNOWN | T-B3-18 generator |
| U-6 | `ReplayLog` versus `ReplayRecord` field conflicts for B8 (PD-6) | UNKNOWN | RECONCILIATION update by the schema owner |
| U-7 | Whether the lesson suite slows by more than 5 percent with the allocation caps | UNKNOWN | Measured in T-B3-14 (T-B3-26 no longer touches the interpreter, PD-22) |
| U-8 | Float drift in interpreter ns timestamps over long runs (ESTIMATED under 1 ns per million statements) | HYPOTHESIS | SA-06 and R-048 would show a difference |
| U-9 | The digital-slice rule DP-1 is enough for the ten starters (R-045 HYPOTHESIS) | HYPOTHESIS | T-B3-15 Blink and the corpus in T-B3-19; B4 starters |
| U-12 | Whether Turbopack writes `<distDir>/BUILD_ID` so the T-B3-09 e2e can compare it with `NEXT_PUBLIC_BUILD_ID` | UNKNOWN | The T-B3-09 agent checks the file after `BUILD` |
| U-11 | B1's `server` token slot stays in `localStorage` until B6 (PD-16); whether that is acceptable for a token that never leaves the browser except as a header | HYPOTHESIS | Amar at the stop; B6 replaces it |

## 11. What I checked to write this (VERIFIED in this step)

This table is the 2026-10-27 evidence, taken at `4d11dc5` before B0 to B2 were built. Where a row says a folder or file "does not exist" or quotes a line number that has since moved, the section "Refresh 2026-10-28" at the end is the current state.

| Claim | Evidence |
|---|---|
| B0 to B2 are not built; `src/core`, `src/project`, `src/local`, `src/sim`, `src/protocol` do not exist | `ls src src/lib` at HEAD `4d11dc5` |
| `Run` surface and `createRun` serve all three languages | `src/lib/interp/run.ts:56-100` |
| Interpreters use parameter properties and extensionless imports (not portable) | `python/runtime.ts:21`, `run.ts:128`, imports at `run.ts:1-11` |
| `World.onPinWrite` and `edge()` exist; `trace` capped at 20,000 | `world.ts:368-377` |
| Allocation sites with no cap | `python/runtime.ts:1071-1077`, `python/modules.ts:159`, `arduino/interp.ts:265-278`, `:1045-1050` |
| Old solver structure and constants | `figures/engine/bench-solve.js:10,15,38,143,148,184,212,249,266,306-410` |
| Old solver runs only in a jsdom figure page via `python3 -I figures/tools/cfbuild.py` | `figures/engine/testkit.mjs:15-45` |
| 79 lesson circuits scanned, 20 RS-08 circuits, a two-line patch exposes raw output | `RS-08/data/scan.json` (79 rows), `src/cases.mjs`, `src/bench-solve.patch` |
| 45 cause ids | Parsed from `SIMULATION_ARCHITECTURE.md` 13.4 |
| Schema facts (required keys, `FileEnvelope`, `ReplayLog` limits, op kinds 64, `source.edit` fields, `Net.class`) | `schemas/project.schema.json` read with Python |
| Example document shape for the blank project | `schemas/examples/uno-blink-d12.project.json` |
| Matrix text and cells; `sim-host` row; "only server, server-client, collab, local import protocol" | `SYSTEM_ARCHITECTURE.md` 5.3 (lines 198-250) |
| `Engine`, `Orchestrator`, `HostInput`, `SolveDiagnostic = Diagnostic`, `LoadResult`, `EngineSnapshot`, `RANK` incl. `ros` 35, `HostToSim` | `SIMULATION_ARCHITECTURE.md` 5.5 (322), 5.6 (355), 8.1, 17.2 (1928), A.2 (2110-2160) |
| `ReplayLog` fields and limits; `Sha256` is 64 hex; `ReplayLog` is a generated type name | `project.schema.json:5777`, `$defs/Sha256`; `B2-core-document-netlist.md:453` |
| The `uno-blink-d12` example: nets `net_d12`, `net_gnd` (class ground), `net_led`; components `cmp_bb1`, `cmp_led1`, `cmp_res1`; breadboard pinned with role `surface` and no pins; sketch writes D12 every 500 ms with no Serial | python3 over `schemas/examples/uno-blink-d12.project.json` |
| `keys` store row shape (provider id key) | `SYSTEM_ARCHITECTURE.md` 8.1 row 9 (line 686) |
| vitest `include` covers `src`, `figures` and `scripts` | `vitest.config.mts:13` |
| `npm run check` ends in `npm run e2e` | `package.json:22-23` |
| Two `Language` types and two `WorldInput` types, and `RunOptions` already exported by the interpreters | `src/lib/interp/profiles.ts:20`, `src/content/schema.ts:28,323`, `src/lib/interp/run.ts:14`, `index.ts:14` |
| `PyDict.set`, `PyRt`, `ArduinoRt` and their construction sites; `*` handles only str, list, tuple | `python/runtime.ts:31,238,1071-1077`, `arduino/interp.ts:69,150`, `run.ts:172` |
| `docs/ARCHITECTURE.md` exists; WebKit browser cached | `ls docs`; `ls ~/Library/Caches/ms-playwright` |
| Next 16 patterns: `PageProps`, `Suspense`, `generateStaticParams`, `ssr: false` rule, SW header block | `about/page.tsx:14,36`, `layout.tsx:26`, `lazy-loading.md:94`, `progressive-web-apps.md:636-666` |

I did not run any build, test or command that changes the repository. I did not read `.env.local`.

## Review fixes (2026-10-27)

One agent edited this file against 17 review issues. Each row says what was done and the evidence. "Applied" means as the review asked; "Applied, changed" says where I chose the other option the review offered or went further.

| # | Verdict | What changed | Evidence checked |
|---|---|---|---|
| 1 | Applied | T-B3-10 scopes the SA-11 block with `ignores: ["src/sim/**/*.test.ts"]` and `lint.test.ts` proves a `*.test.ts` file is not hit. Random test input in clock, queue and linsolve tests now comes from `rng(seed, stream)` of `src/core`. T-B3-16 no longer claims "SA-11 does not apply"; it says the glob matches and the `ignores` entry exempts it. Release blockers and the integration row of T-B3-10 name the risk | The review was right: `src/sim/analog/linsolve.test.ts` matches `src/sim/**/*.ts`. `eslint.config.mjs:6-30` is a flat config with no existing `src/sim` block |
| 2 | Applied, changed | One matrix edit in T-B3-10 (G1): `sim-host` to `protocol` (M-1), `sim-host` to `sim` (M-2), `sim-host` to `src/lib/interp/` only (M-3, through a new `PATH_EXCEPTIONS` list), `local` to `export` (M-4). T-B3-13 no longer edits `eslint.config.mjs` or `src/architecture.test.ts` (4 source files). UI to `sim` is designed away: T-B3-15 adds `src/sim-host/index.ts` re-exporting `buildSimNetlist`, and Diagnostics imports from `sim-host` (UI to `sim-host` is already `x`). `lib/keys` to `local` is designed away: the `KeysBackend` interface lives in `src/lib/keys/store.ts` and `src/local/keys-backend.ts` satisfies it structurally, so no `labs` to `local` cell is needed. Section 3.1 and PD-2 list the cells. RC-B3-1 to RC-B3-8 are proposed RECONCILIATION rows; I did not edit `RECONCILIATION.md` (not my file) | `SYSTEM_ARCHITECTURE.md` 5.3 lines 198-250: `sim-host` row has `core`, `project (types)`, `sim (protocol types only)`; the text says only `server`, `server-client`, `collab`, `local` import `protocol`; `local` row has `core`, `protocol`, `project`, `parts`; UI row has no `sim` |
| 3 | Applied | T-B3-08 splits into `wipeStores(repo, confirmation)` (worker) and `wipeBrowser({ local, caches, sw }, confirmation)` (main) with `mergeWipeReports`; `exportAll` takes `settingsJson` text instead of `Storage`. T-B3-27: the worker handles IndexedDB parts only; the host reads `iynk:v1`, sends `legacyProgress` in `open` and `settingsJson` in `exportAll`, runs `wipeBrowser` itself and merges the report. Tests run the handler with `localStorage`, `caches` and `navigator.serviceWorker` undefined | A dedicated worker has no `localStorage` (EXTERNAL, HTML spec); the original `wipe` and `exportAll` signatures took `Storage` and `ServiceWorkerContainer` |
| 4 | Applied | `runSample`, `runTen`, `runLessonCheck` and the step 6 walk use `sampleBlinkD12()`, a verbatim copy of `uno-blink-d12.project.json` added by T-B3-06 (5 source files) with a byte-equality test (PD-20). `blankProject` stays for library tests and step 2. T-B3-06 says the blank Blink writes `LED_BUILTIN` (D13) and prints to Serial and that `buildSimNetlist` gives `no-ground` for it. The sample has no Serial output and 4 edges in 2 s (10 in 5 s), so the T-B3-23 acceptance and unit test were rewritten | The example has nets `net_d12`, `net_gnd` (class `ground`), `net_led`, components `cmp_bb1`, `cmp_led1`, `cmp_res1`, and a sketch with `LED_PIN = 12`, `delay(500)`, no `Serial` (python3 over the file) |
| 5 | Applied | T-B3-11 interfaces follow SIMULATION 5.5, 5.6, 17.2 and A.2: `nextDue(): SimTime \| null`, `advanceTo(horizon, budget): { reached, stoppedEarly }`, `onEvent(e)`, `stateHash()` with the `StateHasher` inside, `Orchestrator.load(net, opts)`, `step(unit, n)`, `inject(input: HostInput)`, `ros: 35` in `RANK`, `SolveDiagnostic = SimDiagnostic`, `LoadResult { ok, diagnostics, models }`. `step` is in the algorithm, the tests and `SimReq`. PD-18 lists the six B3 differences (optional snapshot until B8, `attach(sink)`, factory-supplied engines, only `ns` and `event` steps, source-only `ProgramImage`, run id in `load`). T-B3-12 and 13 were rewritten to match | SIMULATION lines 322-364, 1928-1950, 2110-2160 read |
| 6 | Applied | `ProgramImage`, `LoadResult`, `EngineSnapshot`, `StepUnit`, `HostInput`, `SimRunOptions` are defined in T-B3-11 `engine.ts`; `SimDiagnostic` in T-B3-10 `core/diagnostic.ts` (G1, so T-B3-16 can import it; this makes T-B3-10 four source files). The orchestrator option type is `SimRunOptions`. `WorldInput` has two meanings (generated `ProjectWorldInput` from `$defs/WorldInput`, content `src/content/schema.ts:323`); T-B3-15 names both and the mapping. T-B3-19 uses the generated `ReplayLog` and defines `ReplaySpec` | `src/lib/interp/run.ts:14` and `index.ts:14` export `RunOptions`; `profiles.ts:20` and `content/schema.ts:28` are two different `Language` types; `B2` line 453 lists `ReplayLog` among the generated names |
| 7 | Applied | T-B3-03 adds `src/local/project-handler.ts` with `createProjectHandler(deps)`; `project.worker.ts` only wires `serveWorker(self, handler)` (5 source files). T-B3-01 gains `serveWorker` and `WorkerScopeLike` because no worker-side wiring existed in the plan or in FRONTEND 8.1. T-B3-27 edits `project-handler.ts`, `project-protocol.ts`, `project-host.ts`; the section 5 table is updated | FRONTEND_ARCHITECTURE.md lines 470-488 define `createRpcPort` and `createInlinePort` only |
| 8 | Applied, changed | `Repository.load` returns `RecordLoad` with `status` `ok`, `recovered`, `lost` or `missing` (the review's "or `LoadResult` with a `status` field" option; the name `RecordLoad` avoids the sim `LoadResult`). T-B3-22 contract tests, T-B3-03 events (`recovered_from_previous`, `record_lost`) and T-B3-21 banners follow. I also added a `load` request to `ProjectReq`, because the plan had no way to get a stored document to the page | The original `open` took `state` from the page but nothing returned a stored document |
| 9 | Applied | PD-19: B3 rows are keyed `slot:ai` and `slot:search`; B14 migrates them; `label?` is proposed for SYSTEM 8.1 row 9 (RC-B3-6). `restoreKeysToLocalStorage` is in the interface block with a unit test | B1 `KeysDoc` has slots `ai`, `search`, `server` and no provider id (T-B3-07 problem row); SYSTEM 8.1 row 9 (line 686) is keyed by provider id |
| 10 | Applied | T-B3-24 now states the real vitest `include` and that the walk may live in `src/local`. Section 1.3 says `V figures/engine/bench-solve.test.mjs` is the only form; T-B3-16 and T-B3-18 Verify and Definition of done rows say so | `vitest.config.mts:12` includes `figures/**/*.test.{js,mjs,ts}` and `scripts/**/*.test.{js,mjs,ts}` |
| 11 | Applied | `KL` is defined once in 1.3 with `NEXT_DIST_DIR=.next-build`; `E`, `BUILD` and a new `CHECK` build on it. T-B3-24, T-B3-25 and section 8 use `CHECK`. R-052 is in the scope line, the exit gate line, T-B3-24 (the Node walk is the harness, with an acceptance line), T-B3-25's acceptance and section 8 | `package.json:22-23`: `check` ends in `npm run e2e`; roadmap line 350 lists R-052 in the B3 scope |
| 12 | Applied | T-B3-15 states the breadboard rule: a component whose `interfaceOf(d).role` is `surface`, or (when the registry cannot resolve it) whose pinned `dependencies.components[].interface.role` is `surface`, is omitted from `SimNetlist.parts` with no diagnostic. The test expects board plus 2 parts | The example pins `core.breadboard-half` with role `surface` and no pins (python3 over the file) |
| 13 | Applied | `MAX_DICT_KEYS` dropped (PD-21; SIMULATION 8.8 lists the cap, B3 defers it). The `bytes * n` edge case is replaced by `"ab" * 600000` and `[1, 2, 3] * 400000`. T-B3-14 says `HeapMeter` is created inside the `PyRt` and `ArduinoRt` constructors, so `run.ts` and `exec.ts` stay unedited | `python/runtime.ts:31` (`PyDict.set`), `:238` (`PyRt`), `:1071-1077` (`*` handles str, list, tuple), `arduino/interp.ts:69,150`, `run.ts:172` |
| 14 | Applied | `Run.cancel()` and the `run.ts`/`exec.ts` edits are dropped (PD-22). T-B3-26 is two source files (`watchdog.ts`, `host.ts`). Cancel in the handler is "stop pumping and ack"; the hard stop is the host kill. The unit test and acceptance use the existing `diag stall` path of `handler.ts` (T-B3-13) | SYSTEM 6.9 and SIMULATION 17.2: no `SharedArrayBuffer`, so a worker cannot read a message mid-step |
| 15 | Applied | Decision: SA-06 runs the orchestrator directly. "19 uses handler for replay" is gone from T-B3-13; T-B3-19 says it does not depend on 13. T-B3-19 has a field table copied from `project.schema.json:5777`. The table found a third conflict (checkpoint hash is `Sha256`, 64 hex, against 16 hex FNV), recorded in PD-6 and RC-B3-7 | `$defs/ReplayLog` and `$defs/Sha256` printed with python3 |
| 16 | Applied, changed | `BUILD_ID` is computed once at the top of `next.config.ts` and feeds `generateBuildId` and `env.NEXT_PUBLIC_BUILD_ID`. I also write it back to `process.env.IYNK_BUILD_ID`, so a second load of the config in a child process cannot produce a different time fallback. `sw-register.test.ts` asserts the registered URL carries it and that the config text has one constant. A new unknown, U-12, covers whether Turbopack writes `BUILD_ID` | `next.config.ts:1-33` read; the docs `generateBuildId.md` and `env.md` exist |
| 17 | Applied, changed | The second option: `runSaveSpeed(d, doc)` takes the document; T-B3-24 builds the 500-part document in the Playwright process with the B2 generator and uses `setInputFiles` on a Diagnostics file input that goes through the Open from file path (also AR-17). No app component imports `src/project/testing/`; a unit test greps for it. The `buildSimNetlist` import goes through `sim-host` (issue 2) | `B2` line 155: `generators.ts` is test support under `src/project/testing/` |

Side effects of the fixes, so a reader can check the counts: T-B3-03 has 5 source files; T-B3-06 has 5; T-B3-10 has 4; T-B3-13 has 4; T-B3-15 has 5; T-B3-26 has 2. All are within the limit of 5. Group order did not change. The file-ownership table (section 5) and the index (section 2) were updated to match. Items for the orchestrator: append RC-B3-1 to RC-B3-8 (section 3.1) to `RECONCILIATION.md`, and tell the owner of T-B2-01 that T-B3-10 adds `PATH_EXCEPTIONS` to `src/architecture.test.ts`.

## Refresh 2026-10-28 (against `build/v1` at `20cca05`)

Task ids, order, groups and count are unchanged (27 tasks and 3 spikes). No task is already done: `src/protocol`, `src/local`, `src/sim`, `src/sim-host` and `src/export` do not exist, and nothing in `src/lib/keys` yet touches IndexedDB. One task is half done by an earlier phase: T-B3-14 (see row 4). The notes carried from B1 and B2 (`state/notes-for-next.md`) that touch B3 are folded in below.

| # | What changed | Where fixed |
|---|---|---|
| 1 | B0, B1 and B2 are built; every B2 and B1 name in the table of section 1.2 was read from the real file. Differences from the plan: `src/core/index.ts` is `export {};` and there is no `src/project/index.ts` or `src/parts/index.ts` (import by file, and `PinRef` comes from `src/project/generated/types.ts`); validators live in `src/project/generated/validate.mjs`; `migrate` takes a `{ at, app }` context; `ValidationReport` has `first20` and `doc?`; `DocChange.ops` is `Op[]`, not envelopes; the test generators are `generateSession`, `generateOp`, `startProject`, `bigProject`, and the round-trip test is `src/project/roundtrip.test.ts` | Section 1.2, T-B3-04, T-B3-10 |
| 2 | FA-01 (T-B2-10): only `src/project/session.ts` may import `src/project/apply/`. T-B3-03 planned to fold envelopes with `applyBatch` in `src/local/shadow.ts`, and T-B3-06 planned to rename through `apply`; both would fail `src/architecture.test.ts`. The shadow is now a `ProjectSession` (a bare `applyBatch` would also skip the `checkBatch` invariants), and rename goes through a session | Section 1.2 row, section 6.3, T-B3-03, T-B3-06, T-B3-23 |
| 3 | The import matrix: the real `src/architecture.test.ts` enforces seven modules only (`core`, `protocol`, `project`, `parts`, `sim`, `export`, `server`); `sim-host`, `local`, `ui` and `labs` have no row. The planned edit of `ALLOWED`, the `PATH_EXCEPTIONS` list and the ESLint zones for M-1 to M-4 are dropped. T-B3-10 is now `eslint.config.mjs` plus three new `src/sim/core` files. The portable block already bans `Date.now` and `Math.random` in `src/sim`, so the SA-11 block restates them (a later flat-config block replaces the options of an earlier block for the same rule). Tests in `src/protocol`, `src/sim`, `src/export` and `src/project` need `// @vitest-environment node`; their relative imports end in `.ts` | PD-2, section 3.1, section 6.3, T-B3-10, ownership table |
| 4 | T-B0-25 (`359162e`) already capped Python `*` on str, list and tuple (a catchable `MemoryError`), the Arduino array size (`InterpError('limit')`) and serial output (1 MiB). The probes `[0] * 10**9` and `int a[2000000000]` therefore already stop. Open: `bytes(n)` and `bytearray(n)`, strings over 1 MiB, the heap meter, and turning the Python `MemoryError` into an uncatchable `limit`. The two T-B0-25 test blocks that pin the old message are re-pointed | PD-17, T-B3-14 |
| 5 | `docs/ARCHITECTURE.md` is git-ignored (`.gitignore:61`), so T-B3-25 and every Docs row that named it use `docs/PROJECT_CORE.md` (T-B2-21), which already holds the module map and import matrix and says the B3 folders do not exist yet | Ownership table, T-B3-25 |
| 6 | `KL` now lists the variables of `scripts/ci-local.sh` and `playwright.config.ts` (the Solana, Vultr and database names are gone). Line numbers moved: `package.json` `check` is `:36`, `vitest.config.mts` `include` is `:12`, `next.config.ts` `cacheComponents` is `:21` and `headers()` is `:37-50`, `playwright.config.ts` port `:7-14`, `BLANK` `:20-32`, projects `:48-51`, `run.ts` `RunOptions` `:17`, `Run` `:59-96`, `createRun` `:98`, constructor `:131`, `step` `:245`, `PyRt` built at `run.ts:188`, `ArduinoRt` built at `arduino/interp.ts:151`, `netResolver` `pins.ts:34-50`, `e2e/boardlab.spec.ts` axe test `:183` | Sections 1.3 and 7 |
| 7 | T-B3-09: `next.config.ts` `headers()` returns the page-wide `SECURITY_HEADERS` block first, then the figures block; the `/sw.js` block goes after both so its CSP wins. The page CSP (D-022) already allows `worker-src 'self' blob:`, which the project and sim workers need | T-B3-09 |
| 8 | T-B3-07: `src/lib/keys` is built as planned (`KeyKind` has `server` as well as `ai` and `search`; `removeAllKeys` and the `persisted` flag exist). Line numbers are now given | T-B3-07 |
| 9 | T-B3-08: besides `iynk:v1`, the app writes `iynk:keys:v1` and `iynk:log:v1` (`src/lib/telemetry/client.ts:15`) to `localStorage`. `wipeBrowser` removes every `iynk:` key. `docs/DATA_HANDLING.md` (B1) already has a "How to wipe" section that T-B3-25 extends | T-B3-08, T-B3-25 |
| 10 | UI: Amar's `UI_RULES.md` (2026-10-28) binds every task that shows something. BU restyles `src/components/ui` before B4, so the studio list and the Diagnostics panel build on that kit and add no hand-written controls; Phosphor is not installed | Section 6.3, T-B3-21, T-B3-23 |
| 11 | B2 follow-up (`measure:apply`): `net.connect`, `view.place`, `wire.add` and `component.set` take 1.2 to 6.8 ms at p95, over the 1 ms budget, so apply for them belongs in the ProjectWorker. T-B3-03 keeps the main-thread session for interaction (undo, redo and the UI need it) and the worker shadow for the save path; the numbers go to `results/B3.md` through T-B3-25 and the B4 editor decides what else moves | T-B3-03, T-B3-25 |
| 12 | B1 follow-up (idle main-thread CPU at 6.6 to 7.9 percent against a 5 percent target) and `useLabMoments`'s unused `item` parameter belong to B12 and to any task that edits a lab workspace; B3 edits neither. The lesson page gzip baseline (584,121 bytes) is not B3 work. The B2 `OQ-3` hash is not reproduced by B3 either | none needed |
| 13 | The standing OK of 2026-10-28 covers every "Amar's OK" step in this file: the `fake-indexeddb` dependency (section 9 item 1: approve it; refuse `fflate` unless S1 fails), the PD defaults of section 3, and the local tag after T-B3-25. A question that is still open after reading `DECISION_REGISTER.md` (D-022 on) and the card's own "Decided" notes is built as its safe part and reported as blocked. Items only a person can do (a real Safari, a phone, a picked file handle in a worker) stay under "For Amar" and are never counted as failures | Section 9 |

Checked and still true: `src/lib/progress/storage.ts:5-6` (`STORAGE_KEY = "iynk:v1"`), `check-client.ts:17` and `:38`, `clock.ts` (`VirtualClock` microseconds), `headless.ts:194` (`performance.now()`), `figures/engine/bench-solve.js` (431 lines), `figures/engine/testkit.mjs:15` and `bench-solve.test.mjs`, `figures/tools/cfbuild.py`, the RS-08 files (`real.mjs`, `cases.mjs`, `bench-solve.patch`, `data/scan.json`), `project.schema.json` `$defs/ReplayLog` at `:5777`, the five schema examples (`uno-blink-d12` among them, with `core.breadboard-half` unregistered), the seven built-in descriptors in `src/parts/data` and their `behaviour` layers (`identity.kind` `board`, `discrete`, `module`; `model.element` `led`, `res`, `button`, `buzzer`, `pot`), `src/app/[lang]/about/page.tsx` and `layout.tsx:26` as page patterns, no `src/app/[lang]/studio` and no `src/components/studio`, `src/i18n/namespaces.ts` (ten namespaces, no `studio`), WebKit in `~/Library/Caches/ms-playwright` (`webkit-2370`), and no `fake-indexeddb` or `fflate` in `package.json`.

