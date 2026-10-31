# Content model: schema, ids, item modules, generated index

**Paths:** `src/content/schema.ts`, `src/content/ids.ts`, `src/content/index.generated.ts`, `scripts/gen-content-index.mjs`, `src/content/{boards,robotics,drones}/*.ts` (+ `*.test.ts`, `drones/_checks.ts`), prose in `src/i18n/content/<lang>/<lab>/<id>.json`, loader in `src/i18n/server.ts`.
**Entry points:** `loadBoard/loadRobotics/loadDrone` and `AVAILABLE` (`src/content/index.generated.ts:50-74`), `getContentProse` (`src/i18n/server.ts:70-84`), `npm run content:check` (`package.json:10`).
**LOC:** VERIFIED. `wc -l` of schema.ts 827, ids.ts 169, index.generated.ts 74, gen-content-index.mjs 185, i18n/server.ts 84. The 76 files in the three lab dirs hold 30,417 lines (`cat boards/*.ts robotics/*.ts drones/*.ts | wc -l`): 23,378 in the 38 item modules (`cat` of non-test, non-`_checks` files), 386 in `drones/_checks.ts` and 6,653 in 37 test files (`wc -l */*.test.ts`). The task text says 79 files; `find src/content -type f | wc -l` gives 79 including schema, ids and index.generated; the three lab dirs hold 76. Prose: 38 JSON files per language x 6 languages; English is 20,779 lines and 12,311 leaf keys (script below).
**Owner today:** "architect" owns schema.ts, ids.ts, index.generated.ts, gen-content-index.mjs; "item content agents" own `src/content/<lab>/<id>.ts` and its test (`docs/ARCHITECTURE.md:113,127`). DOCUMENTED. No human owner. The schema header says changes after 14:00 CDT Oct 24 are additive only (`schema.ts:5`).

## Purpose

One TypeScript data module per catalogue item (12 boards, 13 robotics benches, 13 drones) that holds everything the UI needs except pixels and prose: identity, pinout, power model, failure modes, build steps, lessons with starter code and pass/fail checks, quizzes, calculators, courses. Text fields hold keys into a per-language JSON file; identifiers, part numbers and code stay literal (`schema.ts:2-3`, `TextKey` at `schema.ts:25`). A generator builds a lazy registry. VERIFIED.

## Dependencies (imports in, imports out; third-party packages)

- Imports out of the content layer: `schema.ts` imports only types from `@/lib/drone/calc` (`schema.ts:10-18`) and `./ids`. Item modules `import type` only from `@/content/schema` (rule at `schema.ts:4`; the generator loads them with Node type stripping). VERIFIED: `node scripts/gen-content-index.mjs --check` loads all 38 and exits 0 (0.28 s).
- Imports into the content layer: 80+ files outside `src/content` import it (`grep -rlE "@/content/(index.generated|ids|schema)|loadBoard|loadRobotics|loadDrone" src`): all three lab pages, `src/components/{boardlab,robotics,dronelab,flight,shell,search,solana,hw}`, `src/lib/{boardlab,robotics,verify,hw}`, `src/lib/interp/checks.ts:7` (the evaluator is typed on `Check`).
- Third party: none at runtime. Tests use vitest, jsdom, `node:vm`.
- Cross-tree coupling (VERIFIED): content is paired with `figures/{boards,robotics,drones}/<id>.js` (vanilla JS figure files). Content names figure part ids, fault strings (`'cold:H1.20'`, `'missing:X1'`, `'reverse-polarity:vsys'`), mode ids, power-source keys. Per-item tests load the figure with `node:vm` and assert the two agree (`boards/pico.test.ts:19-27,38-77`).

## Public interfaces (exported functions/types/components/messages, with path:line)

| Export | Path:line | Shape |
|---|---|---|
| `BoardContent` | `schema.ts:435` | identity, `variants`, `mcu`, `power`, `pinout: PinRow[]`, `leds`, `controls`, `displays`, `figure`, `wireables`, `failures: FailureMode[]`, `assembly: BuildStep[]`, `lessons: Lesson[]`, `sources` |
| `RoboticsContent` | `schema.ts:521` | `board`, `modules`, `parts`, `figure`, `power`, `modes: BenchMode[]`, `steps: BuildStep[]`, `faults: FailureMode[]`, `status`, `current: CurrentModel`, `tasks: PracticeTask[]`, `quizzes` |
| `DroneContent` | `schema.ts:792` | `frame`, `design: DroneDesign` (catalogue + golden rows), `parts`, `build: DroneBuildStep[]`, `wiring`, `tests: DroneTest[]`, `firmware`, `flight: FlightConfig`, `courses: Course[]`, `quizzes` |
| `Check` (10 kinds) | `schema.ts:370-381` | `runs, serial, pin-level, pin-toggles, pwm, tone, servo, responds, code, state` |
| `FailureMode` / `FailureTrigger` / `FailureEffect` | `schema.ts:243 / 218 / 230` | see Current functionality |
| `BuildStep` | `schema.ts:256` | `kind build/break/test`, `action: BridgeCommand | null`, `done: StateCond` |
| `Lesson`, `PracticeTask` | `schema.ts:388`, `504` | code template, params, world model, scripted events, checks |
| `StateCond`, `BridgeCommand` | `schema.ts:44`, `47` | dot-path equality map; `press/act/set` message to the figure iframe |
| `BOARD_IDS`, `ROBOTICS_IDS`, `DRONE_IDS`, `MODULE_IDS` (12), `PART_IDS` (21), `BOARDS/ROBOTICS/DRONES` metadata, `isBoardId` etc. | `ids.ts:9-169` | closed `as const` unions |
| `boardLoaders/roboticsLoaders/droneLoaders`, `AVAILABLE`, `loadBoard/Robotics/Drone` | `index.generated.ts:9-74` | `Partial<Record<Id, () => import(...)>>` |
| `getContentText`, `getContentProse` | `src/i18n/server.ts:56,75` | per-file English fallback; throws only if English is missing |

## State ownership and persistence (stores, localStorage keys, server state, DB tables)

- None owned. Content is immutable module data bundled into the Next build (lazy dynamic import per item). No localStorage, no DB. VERIFIED: no state access in `schema.ts`/`ids.ts`/generator.
- Progress, code edits and verification live elsewhere (boardlab store, verify, solana). They key on item ids and lesson ids from this layer (e.g. `lessonParams()` in `src/app/[lang]/boards/_lib/load.ts:56-60`), so renaming an id breaks stored progress and on-chain claims (HYPOTHESIS for the on-chain part; not traced).
- Total serialised size of all 38 modules is 1,293 KB (`size.mjs` below); largest is `boards/uno-r3.ts` at 94 KB serialised, 2,326 source lines.

## Current functionality (what VERIFIED works, how you know)

Counts, all VERIFIED by importing every module with Node type stripping and counting arrays (`count.mjs`, scratch dir):

| Metric | Command / source | Value | README claim |
|---|---|---|---|
| Items | boards 12 + robotics 13 + drones 13 | **38** | 38 (matches) |
| Board lessons | sum of `lessons.length` | **71** | 71 (matches) |
| Bench practice tasks | sum of `tasks.length` | **31** | 31 (matches) |
| Board failures | sum of `failures.length` | **144** | 144 (matches) |
| Bench faults | sum of `faults.length` | **106** | 106 (matches) |
| Robotics steps | sum of `steps.length` | **272** | "272 assembly steps" (matches, but this is robotics only) |
| Board assembly steps | `assembly.length` | 134 | not counted in README |
| Drone build steps | `build.length` | 173 | not counted in README |
| Total build steps, all labs | 272 + 134 + 173 | **579** | README understates |
| Checks, lessons | sum of `lessons[].checks` | **292** | none |
| Checks, bench tasks | sum of `tasks[].checks` | **169** | none |
| Drone bench tests | `tests.length` | 78 | none |
| Drone courses / wiring edges / golden calc rows | | 22 / 113 / 67 | none |
| Pin rows | board `pinout` | 737 | none |
| Wireables | board | 108 | none |
| Quizzes | lesson quizzes 71 + bench 66 + drone 49 | 186 | none |
| Bench modes | | 53 | none |

Drones have no `failures`/`faults`; their equivalent is `DroneTest` (78) plus the calculator verdicts. A reader taking "failures" as a cross-lab number must note drones contribute 0. VERIFIED (`DroneContent`, `schema.ts:792-818`).

**Declarative or behavioural?** Declarative at runtime. `count.mjs` walks each default export recursively and counts `typeof === 'function'`: 0 in all 38 modules. VERIFIED. But the source is not declarative: modules use build-time TypeScript helpers to generate rows, e.g. `functionsOf`, `capsOf`, `gp()` and `pinout(ft)` in `boards/pico.ts:7-47`, `lessonText()`, `quiz()` at `pico.ts:203-217`, `fault()`, `mode()`, `breakStep()` in `robotics/hc-sr04.ts:145-170` (the last reads one array while building another). The output is plain JSON-able data. Behaviour does live in strings: starter code and reference solutions are program text in C++/MicroPython/Python/Verilog with `{{p:id}}` and `{{t:key}}` tokens (`schema.ts:275-285`), executed by `src/lib/interp`. Check regexes are strings. So the data is serialisable but the "program" is code-as-string. Drone `design.model` holds a discriminated union config for the calculator (`racer.ts:75-84`), not a function.

**What a "check" is.** A pure predicate over a deterministic `RunTrace` (`schema.ts:370-381`; trace at `schema.ts:~348`): ten kinds (`runs`, `serial` regex/count, `pin-level`, `pin-toggles`, `pwm`, `tone`, `servo`, `responds` to a scripted world event, `code` must/mustNot substring, `state` on figure state). Each carries a `label` text key. One evaluator, `src/lib/interp/checks.ts`, is shared by UI, tests and server verify (header comment, lines 1-4). Pin names are net strings tied to the board ("GP15", "D13"). So a check is generic over any code + world, but literals bind it to a board's net namespace.

**What a "fault"/"failure" is.** One shared type, `FailureMode` (`schema.ts:243`): `{id, kind (13 kinds), trigger, figure: BridgeCommand, effect, title/symptom/explanation/fix}`. `trigger` is a 10-way union describing how the learner causes it (`power-input`, `reverse`, `load`, `cold-joint`, `remove-part`, `reverse-part`, `short`, `control`, `wiring`, `setting`; `schema.ts:218-228`). `effect` is a small descriptor (`power on/off/resetting`, `halts`, per-pin stuck/noisy, `damages` part ids, `extraMa`, `serial`). The actual simulation is not here: `figure` sends an opaque state patch like `{fault: 'cold:H1.20'}` to a figure JS file that knows what that string does. `effect` is declared on the content side but only the figure and `src/lib/hw/sim.ts`/boardlab engine decide visible behaviour (how much `effect` is read by the host was not traced: UNKNOWN). Test `pico.test.ts:57-71` only checks the fault strings are well-formed and reference parts the figure has, not that the effect is physically right.

**What a "step" is.** `BuildStep` (`schema.ts:256`): `kind` build/break/test, `action` = the message "Do it" sends to the figure, `done` = a dot-path equality on the figure's reported state (`{ build: 'assembled' }`, `{ 'rails.VSYS': 4.7 }`). Completion is therefore detected by reading state from a UI iframe, not computed from the content. Break steps reference a fault id (`hc-sr04.ts:155-158`).

**Generator.** `scripts/gen-content-index.mjs` scans dirs, ignores `.test.`/`_` files, rejects files whose id is not in `ids.ts`, writes `index.generated.ts` only if changed. `--check` loads each module, checks `id`/`lab`, and checks every string that looks like a text key resolves in the English JSON. Run: `content index: 12 boards, 13 robotics, 13 drones (unchanged)`, exit 0. VERIFIED.

**Prose binding.** `getContentProse` imports `./content/${locale}/${lab}/${id}.json` by dynamic template, falls back per-file to English (`i18n/server.ts:75-84`). Consumers wrap it with `createTranslator`; a missing key throws (`boards/_lib/load.ts:19-20`). VERIFIED by reading; the runtime throw was not exercised.

Script `parity.mjs` over all prose: 12,311 English leaf keys; es, fr, de, zh, hi each have 0 keys missing. 14-23 long strings per language are byte-identical to English (candidates for untranslated text; could be legitimate code or part names). VERIFIED.

**Tests pass.** `npx vitest run src/content` (run once): 37 files, 813 tests, all passed, 132 s wall time (611 s CPU, 8 cores used). VERIFIED. This created an untracked `.vitest/` dir that I deleted; repo state is otherwise untouched.

## Known defects (with repro or evidence)

1. **`check` only validates English**. `gen-content-index.mjs:122-133` calls `readEn` only. Other languages are protected by no script; my one-off diff (parity.mjs) found 0 missing keys today, so this is a missing guard rather than a live bug. Severity low.
2. **Text-key detection is a regex heuristic, not typed.** A string is a key if it starts with one of 26 section names plus a dot (`gen-content-index.mjs:93-100`), and `drones/_checks.ts:56-57` has a second, different list (`design|parts|build|wiring|tests|firmware|flight|courses|quizzes`). Two diverging lists. A literal like a part named `wiring.x` would be misread; a key in a new section is skipped silently. `TextKey` is `string` (`schema.ts:25`), so the compiler cannot catch a typo. Severity medium.
3. **Id lists are triplicated.** Item ids live in `ids.ts`, in the `BoardId` union in `src/lib/interp/profiles.ts:6-18` (separate type, same 12 names), and in directory/file names plus `figures/`. `ModuleId` (12) and `PartId` (21) are closed unions with figures drawn by `figures/modules/<id>.js` and `figures/parts/<id>.js` (`ids.ts:62-102`). Adding an item requires edits in at least five places. Severity medium.
4. **README says "272 assembly steps"**; that is robotics-only. The true all-lab build step total is 579. Doc defect, severity low.
5. **Hard-coded Wi-Fi credentials and a live URL in lesson code**: `wlan.connect("HackTX", "hackathon")` and `requests.get("http://worldtimeapi.org/api/ip")` in `boards/pico.ts:~173-186` (grep `"HackTX"` finds only pico.ts). The simulated network is scripted, so no real traffic, but the string teaches a throwaway password pattern and names a third-party service. Severity low.
6. **Schema is documented as frozen but is edited additively with optional fields**; `StateCond` was loosened to `Partial<Record<...>>` only so `satisfies` would type-check (`schema.ts:41-44`), so `done` objects are untyped against the figure's real state keys. Severity medium (see tech debt).

## Technical debt (table: item, path, evidence, severity, effort guess)

| Item | Path | Evidence | Severity | Effort |
|---|---|---|---|---|
| Content coupled to figure JS by free strings (part ids, `fault` strings, mode ids, power keys) with tests as the only guard | `schema.ts:47-50,243-253`; `pico.test.ts:19-77`; `drones/_checks.ts:24-45` (figure source scraped with regexes: `figureParts` matches `{ id: 'X', short: '...'`) | Renaming a figure part silently breaks content until a vm test runs; drone checker parses JS with regex | high | L |
| Two parallel failure/test models (board/robotics `FailureMode`, drone `DroneTest`) and three parallel step types (`BuildStep`, `DroneBuildStep`, quiz-after-step) | `schema.ts:256,630,574` | Same idea, different shapes | medium | M |
| Item modules are large hand-written TS with copy-pasted helper definitions (`lessonText`, `chk`, `quiz` appear in 6+ board files; `grep -c "const lessonText\|const chk = " src/content/boards/*.ts`) | `boards/{basys3,de10-lite,microbit-v2,nucleo-f401re,pi4-pi5,pico}.ts` | Each file re-declares them | medium | S |
| Content is code (TS), not data: authors need a TS toolchain and Node 22.18+ type stripping; only erasable syntax allowed (`gen-content-index.mjs:9-10`) | `scripts/gen-content-index.mjs` | A non-engineer cannot add an item | high for a builder | L |
| Closed unions for ids; a runtime-created project cannot have an id type | `ids.ts` | `BOARD_IDS ... as const`, `isBoardId` | high for a builder | M |
| Single-purpose catalogue index file regenerated by script, checked in | `index.generated.ts` | `Partial<Record<...>>` of static imports; adding a user item requires a rebuild | high for a builder | M |
| Per-item test files (37) are the only validation and cost 132 s / 611 CPU-s | `vitest.txt` | One schema validator would replace most structural asserts | medium | M |
| `golden` rows and calculator fixtures from the original product (`src/lib/drone/__fixtures__/golden-*.json`) are the "truth" for drone numbers | `racer.ts:98-126`; `schema.ts:582-583` | Reference is the earlier prototype, not a physical measurement | medium | n/a |
| Hackathon-era "additive only" schema policy with logs inside docs | `schema.ts:5`; `docs/ARCHITECTURE.md:41-80` | Version history is prose, no schema version field exists in `BoardContent`/`RoboticsContent`/`DroneContent` | medium | S |

## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)

37 test files, 813 tests (VERIFIED run), 6,653 lines, 1,684 `expect(` calls (`grep -c "expect(" ... | awk`). Categories, from reading `pico.test.ts` fully and `drones/_checks.ts` (first 60 lines plus structure):

- **Self-consistency with the implementation (majority).** Each lesson's reference code is run through `runChecks(lessonJob(...))` and must pass its own checks (`pico.test.ts:100-106`). The checks, the world script and the solution were written together and executed on the project's own interpreter; passing proves author and interpreter agree, not that real hardware would behave this way. Bench `solution` is likewise "proved" to pass every check (`schema.ts:~508`).
- **Content vs figure agreement.** Part ids, nets, fault-string shapes, variants and LED nets checked against the figure JS in a vm sandbox (`pico.test.ts:38-77`). Real value, but both sides were written by the same authors.
- **Structural invariants.** Quiz has 3 questions of 3 options, answers 0-2, text non-empty (`pico.test.ts:92-98`); at least four progressive lessons per variant.
- **Hardware-derived reference values (minority).** A handful of datasheet-sourced constants are asserted by hand, e.g. RP2350 clock 150 MHz and GP0-GP22 5 V tolerance (`pico.test.ts:78-83`). The pinout tables (737 rows), power limits, brown-out volts and `maxCurrentMa` values are not compared with any datasheet extract by a test; sources are only URLs (`sources: Source[]`). Facts files `docs/facts/*.md` exist (35 files, `ls docs/facts | wc -l`) but no test links them to the TS data. Drone `golden` rows are reference values from the earlier prototype's fixtures, enforced by `drones/_checks.ts:202-206` and `quad5.test.ts` (calc vs fixture, i.e. regression, not physical truth).
- **Not tested:** a schema-level validator on all items at once; non-English prose parity; accessibility of text; that `effect` descriptors match what the figure does; that `done` conditions are reachable (some are, via figure tests that press the buttons: not traced for all 38).

## Performance characteristics (measured if you can, else ESTIMATED/UNKNOWN)

- Generator `--check` over all 38 items: 0.28 s wall (VERIFIED, `time`).
- Content test suite: 132 s wall, 611 s CPU, 813 tests (VERIFIED). Cost is dominated by running interpreters over every lesson and by figure vm loads.
- Runtime payload: modules load by dynamic `import()` per item (`index.generated.ts`), so a page pulls one item. Serialised size ranges to 94 KB for uno-r3 and 1,293 KB for all 38 (VERIFIED, JSON.stringify length). Compression ratio and actual route chunk size: UNKNOWN (no build run).
- `AVAILABLE` and `ids.ts` metadata are small and static. `availableBoards(lang)` imports every board module on a listing page (`boards/_lib/load.ts:50-53`): loads all 12 boards (~495 KB serialised in the 4 biggest alone) for an index page. ESTIMATED cost, not measured.

## Security risks

- **Executable content strings**: starter code and solutions are program text run by an in-browser interpreter, in a Web Worker per ARCHITECTURE v1.3. Safe for authored content; for user-authored content this is a code-execution surface that the interpreter, not the schema, must contain (HYPOTHESIS, interpreter not audited here).
- **`code` check substrings and `serial` regexes are author-supplied** (`schema.ts:370-381`, `pico.ts` `match: 'accel z (0\\.9\\d|1\\.0\\d?) g'`). A user-supplied regex evaluated in a server verifier is a ReDoS vector; today only authored regexes exist. HYPOTHESIS for the future.
- **Dynamic import path built from request-derived `lang`/`id`**: `import(\`./content/${locale}/${lab}/${id}.json\`)` (`i18n/server.ts:59`). Callers validate `id` with `isBoardId`/`AVAILABLE` and `lang` against locales first (`boards/_lib/load.ts:24` checks `isBoardId` before use). VERIFIED for boards; other labs follow the same loaders (not read line by line). For user projects the id guard disappears and this must change.
- Content `sources[].url` are rendered as links; all authored. No secrets in content (grep for `key|token|secret` not exhaustive: UNKNOWN beyond the Wi-Fi demo password).
- Hard-coded demo credentials in lesson text (see Known defects 5), low.

## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)

**Today: only on catalogue items. Several pieces are reusable if separated.**

Reusable as-is (VERIFIED by structure):
- `Check` (10 kinds), `RunTrace`, `WorldModel`/`WorldInput`/`DeviceModel`, `CodeTemplate` and `ParamChip`: board-agnostic enough that a user lesson (code + virtual world + pass criteria) works on any of the 12 boards. Board Lab already runs the same 12 interpreter profiles across 71 lessons, so this is proven for catalogue boards.
- `FailureMode` plus `FailureEffect` as a *description* is generic, and `BuildStep`/`StateCond` is a generic "do action, wait for state" step machine.

Bound to catalogue ids (VERIFIED):
- Every content module is a `.ts` file whose id must be in the closed union in `ids.ts` (`gen-content-index.mjs:65-67` rejects any other file). `loadBoardPage` returns null for ids outside `AVAILABLE` (`boards/_lib/load.ts:24`).
- `RoboticsContent.board: BoardId | null`, `modules: ModuleId[]`, `parts: PartId[]` are closed lists of drawable things (12 modules, 21 parts). A user project that uses a different part has no figure.
- Failures, faults and steps reference figure part ids and figure-internal fault strings. They only work if a figure JS file exists with the same ids and fault handlers. A user cannot author a figure.
- `PracticeTask.board: BoardId`; checks use board net names.
- Prose is `src/i18n/content/<lang>/<lab>/<id>.json` bundled at build time (no runtime store).
- `design` (drone calculator) takes catalogue maps of batteries, motors and props; `Course`/`RangePrim` could be user data but are typed inside `DroneContent`.

Reasoning: lessons/tasks/checks/faults/steps are structurally reusable; their *binding keys* (part ids, net names, fault strings, figure files, id unions, build-time prose) are not. A user-invented project needs those bindings generated or abstracted.

## Required refactoring to get there

What a user-authored project needs from this schema:
1. A `ProjectContent` that is JSON-serialisable, versioned (`schemaVersion`), with string ids validated at runtime (zod/valibot), stored in a DB, not a `.ts` file. Today's modules are TS-only with generator helpers; they would need to be flattened or compiled to JSON (`gen-content-index.mjs --emit` already prints `{meta,data,en}` JSON per item, `gen-content-index.mjs:156-163`, a base to build on).
2. A layout/figure description that the host can render without per-item JS: a part graph (parts, pins, nets, connections) plus a generic renderer, so "part id", "net" and "fault" are data in the project, not strings agreed with a figure file. Today geometry lives only in `figures/*.js`.
3. Faults as a data-driven rule list over that part/net graph (`remove-part X` -> effect), so the engine interprets `trigger`/`effect` (currently `effect` is descriptive, the figure does the work).
4. Prose inline per project locale (or key-less default text) rather than build-time JSON in three folders; fallback rule already exists (`getContentProse`).
5. Move reusable types (`Check`, `WorldModel`, `CodeTemplate`, `FailureMode`, `BuildStep`) to a `core` module free of lab unions; make `BoardId`/`ModuleId`/`PartId` open string types backed by a registry (and unify with `lib/interp/profiles.ts` `BoardId`).
6. Replace regex-scraped figure checks (`drones/_checks.ts`) with a typed figure manifest emitted by the figure (e.g. `figures/*.json`).
7. One schema validator (CLI and CI) replacing per-item structural tests; add locale parity and an id-collision check.
8. Typed `TextKey` (template literal types per lab, or generated from the English JSON) so `satisfies` catches missing keys at compile time.

## Recommendation: preserve | extend | replace | deprecate | investigate (one line of reasoning)

**extend** for the catalogue (the 38 items are the product's curriculum and all counts match, all 813 tests pass); **replace the id/binding layer** (closed unions, `.ts` modules, figure-string coupling) with a data-driven project model that reuses `Check`, `WorldModel`, `CodeTemplate`, `FailureMode` and `BuildStep` unchanged.

## Open questions

- How much of `FailureMode.effect` (`pins`, `damages`, `extraMa`, `serial`) is actually consumed by the host versus the figure? (`src/lib/hw/sim.ts`, boardlab engine not traced.) UNKNOWN.
- Are all `BuildStep.done` conditions reachable end to end for each of the 38 items? Figure tests may cover this; not traced.
- Which pinout and power numbers were compared to datasheets by a human or script (`docs/facts/*.md` is the claimed source; no automation links them)? UNKNOWN.
- Is the 14-23 identical-to-English strings per language a real untranslated set or intentional (part numbers, code)? Not sampled.
- Do progress, passport or on-chain records key on lesson ids (so ids are frozen)? HYPOTHESIS; not traced in `src/lib/verify` or `src/components/solana`.
- Can `PracticeTask`/`Lesson` from a user project be verified server-side (the Check evaluator is pure, per its header, but runs in a worker)? Belongs to the verify audit.

## Evidence index (scratch, reproducible)

Scripts live in `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/audit/content-schema/`: `count.mjs` (all counts and function scan; run with `node count.mjs`), `parity.mjs` (i18n parity), `size.mjs` (serialised sizes), `vitest.txt` (test run: 37 files, 813 tests passed, 132.24 s).
Sampled fully: `schema.ts`, `ids.ts`, `index.generated.ts`, `gen-content-index.mjs`, `i18n/server.ts`, `boards/pico.ts` (525 lines), `boards/pico.test.ts`, `robotics/hc-sr04.ts` (353), `drones/racer.ts` lines 1-140 of 552 (the rest, flight, courses, firmware, not read), `drones/_checks.ts` lines 1-60 of 386. Not read: the other 35 modules and 36 tests beyond counts and the grep signals above; `uno-r3.ts` (2,326 lines) only through counts.
