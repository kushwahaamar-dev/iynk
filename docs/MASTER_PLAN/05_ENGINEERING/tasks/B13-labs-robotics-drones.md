# B13 task packages: Labs moved in, Robotics and Drone labs

Written 2026-10-27 for the build-plan step. Plan only: no file in `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed to write it, and nothing was committed.
Repo state read: `main`, HEAD `4d11dc5`, with the uncommitted reconcile edits under `docs/MASTER_PLAN` in the working tree. Task files for B0, B2, B4 to B7, B9, B10 and B12 were read. `tasks/B12-labs-board.md` exists (1124 lines, VERIFIED) and every B12 id below is its task-file id, not the roadmap card id.
Labels: VERIFIED (read in code or a file, or run, in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.

Binding inputs: `00_EXECUTIVE/DECISION_REGISTER.md` (D-013 to D-017), `03_PRODUCT/PRODUCT_REQUIREMENTS.md` R-139 to R-152 (section 10.4), `03_PRODUCT/FEATURE_CATALOGUE.md` F-057 to F-059, F-063 to F-067, F-151, F-172, F-173, F-181, `04_ARCHITECTURE/PROJECT_DATA_MODEL.md` (PDM) 5.13, 5.14, 11, `04_ARCHITECTURE/schemas/project.schema.json`, `robotics.domain.schema.json`, `drone.domain.schema.json`, `04_ARCHITECTURE/FRONTEND_ARCHITECTURE.md` (FE) 6.6, `ROBOTICS_ARCHITECTURE.md`, `DRONE_ARCHITECTURE.md` (DRN) 6.5, `REALTIME_ARCHITECTURE.md` (RT) 18, `04_ARCHITECTURE/RECONCILIATION.md` (RC-41, RC-72), `05_ENGINEERING/IMPLEMENTATION_ROADMAP.md` (card B13, section 2, section 6), the B2, B6, B7, B10, B12 task files, and the audit files named in the task.

## 1. What this phase is

| Item | Content |
|---|---|
| Goal | The 13 robotics benches and the 13 drone craft open and run as Studio projects. The old stores, the room action layer and the legacy relay are deleted. |
| Scope | F-057 to F-059, F-063 to F-067, F-151, F-172, F-173, F-181; R-139 to R-152 for robotics and drone. R-139 to R-144 are the Board lab and belong to B12. R-149 is Amar's content (section 9). F-172 is a person's review (section 9). |
| Not in it | New physics (B16, B18, B19), the drone builder (B18), real ROS 2, new lessons, deleting the Board lab store (finding F4), any claim that a simulated fault matches a real board. |
| Depends on | B12: template store T-B12-09 (`content/projects/index.ts`, `src/studio/templates.ts`, `src/studio/fork.ts`), Guide dock T-B12-17, runner T-B12-07 (`src/studio/run/lesson-job.ts`, `lesson-checks.ts`: `lessonJobFor`, `runLessonTests`), learner record T-B12-04 (`src/lib/learn/record.ts`, `store.ts`), import and facade T-B12-08 (`src/lib/learn/legacy-import.ts`, `facade.ts`), gallery T-B12-18. B11 (descriptors for the 12 modules and 21 parts). Through them B10 (faults), B7 (rooms), B6, B5, B4, B2. |
| Exit gate | `npm run check` (with `npm run labs:check` added to it by T-B13-15); e2e `robotics`, `dronelab`, `fly`, `fly-fun`, `room`, `rooms` pass; the parity numbers of section 4.7 match; Amar flies one craft and runs one bench in Studio (walk in T-B13-35). Then Amar's OK. |
| Size | 41 tasks, T-B13-00 to T-B13-40 (the roadmap card lists 12; section 2 explains why). |
| Branch and commits | Local branch `build/v1`. One commit per task, author Amar Kushwaha, message `B13 T-B13-<nn>: <what>`, no `Co-Authored-By` line, no "Generated with" line. Never push. Never deploy. Ports 3000 and 43117, `.env.local` values and production services (the live relay at rt.iynk.tech included) are off limits. |

## 2. Findings that change the roadmap card

| # | Finding | Evidence | What this plan does |
|---|---|---|---|
| F1 | The roadmap says T-B13-01 and T-B13-05 create `src/project/convert/bench.ts` and `craft.ts`. The B2 table gives those files, and `index.ts`, to T-B2-20, and T-B2-20 is written. It differs from the B13 design in four ways. (a) Its entries are `convertBench(item, texts, bench: FigureBench, ctx): ConvertResult` and `convertCraft(item, texts, ctx)`, not `convertBench(content, texts, deps)`. (b) It puts bench power, modes and fault rules in `domains.robotics.data` (conflicts with F2 and RC-41). (c) It puts the whole craft content in `domains.drone.data` (conflicts with F3). (d) It owns `convertPracticeTask(item, taskId, texts, boardItem, circuits, ctx)`, which makes a `challenge` project with the hidden solution in `ext['x-iynk-solution']`, and it gives no project id rule for benches, tasks or crafts. T-B2-20 writes only `.corpus/` (ignored by git after T-B2-21), never `content/projects` | `tasks/B2-core-document-netlist.md` line 154 (ownership), lines 1053-1100 (T-B2-20 body; the file is 1289 lines, VERIFIED) | B2's `convertBench` and `convertCraft` keep their signatures and stay the entry points; `convertBench(content, texts, deps)` is not a new public function. T-B13-01 and T-B13-05 edit the bodies to call new files (`bench-steps.ts`, `bench-sim.ts`, `craft-guide.ts`, `craft-domain.ts`). Those files replace the domain-data parts of (b) and (c) with the `ext["x-iynk-bench"]` form (F2) and the `legacy-craft` form (F3); a B2 test that expects `domains.robotics.data` or a full `domains.drone.data` is edited in the same commit and the commit body says so. `causeOf` and the project ids arrive through optional `ctx` fields. `convertPracticeTask` is the task converter, used unchanged; section 4.1 fixes the ids. Step 0 of both tasks lists the four differences it finds in the file as it stands. |
| F2 | PDM 11.3 puts bench modes, status, current, power and `faultRules` in `domains.robotics.data`. The schema forbids it: `domains.robotics.data` requires `physics, surfaces, bodies, joints, wheels, sensors, arena` and has `additionalProperties: false`. RC-41 says the typed schema wins. | `robotics.domain.schema.json` top level (VERIFIED by reading it with python3); RC-41 | Benches carry no `domains.robotics`. Bench data goes in `ext["x-iynk-bench"]` (project `ext` allows `x-` keys, 16 at most), and each fault keeps its trigger, effect and figure command in `Fault.params`. T-B13-00 checks this against the validator. |
| F3 | PDM 11.3 says the whole `DroneContent` goes to `domains.drone.data`. The drone schema has a `legacy-craft` kind that holds a pointer only (`legacy: {contentId, calcModelId, flightModelId}`), `additionalProperties: false`, and `thrustSource: "legacy-calc"`. DRN 6.5 and ADR-0710 say the same. | `drone.domain.schema.json` properties `kind`, `legacy`, `thrustSource` (VERIFIED) | A craft project holds `guide`, three `parameters` (the design picks), `domains.drone` as `legacy-craft`, and `ext["x-iynk-legacy"]`. Design catalogue, wiring, bench tests, firmware CLI, flight config and courses stay in `src/content/drones/<id>.ts`, read through `legacy.contentId`. One source, no copy. |
| F4 | The roadmap says T-B13-11 deletes the `boardlab`, `robotics` and `dronelab` stores and edits "up to 3 importers". | Importers outside the store's own folder, counted with grep: robotics store 13 files, dronelab store 13 files, boardlab store 25 files (incl. `src/lib/hw/sim.ts`, `src/lib/ai/bench/board.ts`, `src/lib/sound/react.ts`) (VERIFIED) | T-B13-11 deletes the robotics and dronelab stores only, after five mechanical tasks (29, 30, 31, 36, 37) move their importers. The boardlab store stays: the old board pages, the hardware twin (B20) and the board AI adapter still use it. Deleting it waits for Amar to retire the old board pages (section 9, item 5). |
| F5 | The roadmap lists five things for T-B13-09 to delete. B7 says "the v1 layer is deleted in B13". The v1 client is `src/lib/realtime/` (18 files with tests, plus a fixtures folder) plus 8 components in `src/components/realtime/`. 24 files outside it import it (one is a workflow script). | `ls`, grep (VERIFIED). `tasks/B7-collab-rooms-shares-board.md` lines 627 and 892 | Three tasks: T-B13-09 (lab side: `LabRoom`, the Together tab), T-B13-32 (other consumers), T-B13-34 (delete the layer). T-B13-10 deletes the relay after that. |
| F6 | `src/components/realtime/InviteDialog.tsx` exports `QrCode`. B6 says B13 must move it before deleting the file. B7 edits the same dialog in T-B7-31 (task file; the roadmap row calls it T-B7-12) and T-B7-28 imports `QrCode` through `src/components/realtime/index.ts:4`, so B7 keeps using it. | `tasks/B6-collab-server-buddies.md` F10 and line 1186; `tasks/B7-collab-rooms-shares-board.md` lines 1327, 2243, 2256 | T-B13-34 greps first. B7 imports `InviteDialog` and `QrCode`, so the file and the two exports stay. Only if the grep finds no B6 or B7 import does `QrCode` move to `src/components/ui/QrCode.tsx` and the dialog go. |
| F7 | Old rooms synced the bench's steps and figure state, so a joiner's figure walked to the host's state (`store.ts:130-155`). B7's rooms sync the project document only. | `src/lib/robotics/store.ts` `hydrate`; roadmap B7 rows | Faults and craft design picks are document data and are shared. Build steps, figure state, task code and quiz answers are per person. The old second test in `e2e/room.spec.ts` ("a bench's steps reach the joiner's figure") cannot hold; T-B13-39 replaces it. Amar decides (section 9, item 6). |
| F8 | Live ghosts of friends (`room-ghosts.ts`, F-070) ride the v1 room's pose channel. B7 has no pose channel. COMMUNITY 3.10 and CM-25 feed buddy ghosts from stored best-lap replays, which is R-193 in the drone phase. | `src/components/flight/room-ghosts.ts:1-44`; `03_PRODUCT/COMMUNITY.md` line 65 | `room-ghosts.ts` is deleted with the v1 layer. The own-best-lap ghost (`src/lib/flight/ghost.ts`) stays. `e2e/fly-fun.spec.ts:47` is rewritten to cover it, in T-B13-22, the task that stops the fly view from showing room ghosts. Amar decides (section 9, item 7). |
| F9 | `e2e/robotics.spec.ts:127-128` reads `localStorage["iynk:v1"]` after a quiz. After T-B12-04 and T-B12-08, progress lives in `LearnerRecord`s in the IndexedDB `progress` store, and T-B12-08 leaves robotics and drone keys and every `quiz` entry in `iynk:v1` untouched (its facade returns null for them). | `e2e/robotics.spec.ts` lines 105-129 (VERIFIED); `tasks/B12-labs-board.md` T-B12-08 | T-B13-25 extends the facade and the importer to those keys. T-B13-24 changes the assertion to read the learner record (through `learnStore()` or `e2e/support/idb.ts` of T-B7-32). |
| F10 | Baseline of the legacy lab tests today: 45 files, 1,190 tests, 1,189 pass, 1 timeout (`src/content/drones/wing.test.ts:118`, 40,204 ms, while the machine was loaded). The count of 78 bench tests, 342 golden rows, 272 steps, 106 faults, 31 tasks is confirmed (section 4.7). | `npx vitest run` over the lab folders, run in this step | The reference baseline (T-B13-13) uses data and the interpreter only, never the jsdom figure tests, so it does not inherit that flake. |
| F11 | `src/studio` may not import `src/lib/*` or `src/content` (SYSTEM 5.3, `studio` row). `src/components` (the UI row) may import everything. The lab logic that exists today is in `src/lib/{robotics,dronelab,flight,drone}`. | `SYSTEM_ARCHITECTURE.md` 5.3 | Pure operation builders and selectors go in `src/studio/lab/` and import only `core`, `project`, `parts`. All wiring to legacy lab logic goes in `src/components/studio/lab/`. The legacy logic modules stay where they are (they are not stores). |
| F12 | A bench fault carries a `trigger`, `effect` and `figure` command, not a netlist target. B10's `applyFault` must not try to apply such a fault to a netlist. | `src/content/schema.ts:243-254`; `tasks/B10-faults-any-circuit.md` T-B10-15 | `Fault.params.legacy = true`. T-B13-00 reads T-B10-15 and T-B13-01 adds a test that a legacy fault is skipped by the netlist applier (and edits nothing in B10 unless the test fails; then it reports). `legacyCause` is at `src/content/faults/legacy-map.ts` (T-B10-25 puts it in `content` so that UI may import it), not under `src/sim`. `src/project` still imports nothing from `src/sim` or `src/content`, so the generator injects `causeOf`. |
| F13 | The 78 bench tests are `DroneTest` with a figure `done` state condition and no time (`src/content/schema.ts:630`). The project `state` check needs `atMs`. | `schema.ts:630-640`; `project.schema.json` `Check` | Bench tests stay in content and are read through `legacy.contentId`. They are not forced into `tests[]`. |
| F14 | T-B13-12 depends on T-B1-25, which is "go or no-go". | `tasks/B1-foundation-keys-oss-honest.md` lines 101, 228-241 | T-B13-12 starts by reading `P1-figure-idle-cpu/REPORT.md` and the perf budget. If the fix landed, it closes with a note. |
| F16 | R-145 says the bench's effects move "behind the orchestrator". The sim orchestrator (B3, B8) does not run the hand-inked bench figures, which stay the bench simulator. | R-145; `figures/engine/bench-solve.js` is the solver (ROBOTICS 2) | Read as "out of the React component": effects move into the `LabSession` controller (`useBench`) with the figure link, which is the only code that sends commands to the figure. Moving bench physics into the orchestrator is B16. |
| F15 | The roadmap's `docs/LABS.md` is not in the repo. `docs/` has no lab migration note today. | `ls docs` (VERIFIED) | T-B13-35 writes it. |

## 3. Conventions

### 3.1 Proof shorthands

| Name | Expands to |
|---|---|
| `TL` | `npm run typecheck && npm run lint` |
| `V <path>` | `npx vitest run <path>` |
| `KL` | `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL=` (names that no longer exist after T-B0-12 are dropped; copied from `01_AUDIT/runs/COMMANDS.md`) |
| `E <spec>` | `KL NEXT_DIST_DIR=.next-build npx playwright test <spec>` (random port; skips 43117 after T-B0-03) |
| `SCHEMA` | `npm run schema:check` (T-B2-04) |
| `PORTABLE` | `npx tsc -p tsconfig.portable.json` (T-B2-01) |
| `SRV` | `npm run server:test` (T-B6-01) |
| `LB` | `npm run labs:check` (added by T-B13-15: regenerates all lab projects in memory and fails on any byte of drift) |
| `GATE` | `npm run check` |

Every task ends with `TL` plus the commands it names. A task is not done until they exit 0. Vitest runs under load can time out on the heavy figure tests (F10); a task that touches only data or pure code does not run those.

### 3.2 Rules every task follows

1. Step 0, name check. Files from B2 to B12 do not exist in the tree today (VERIFIED: no `src/core`, `src/project`, `src/parts`, `src/studio`, `src/local`, `content/projects`). Their names come from roadmap rows and task files. Before writing code the agent runs `ls` and `grep` for every predecessor symbol the task uses. If a name differs it adapts inside the files the task names and says so in the commit body. It never edits a predecessor file the task does not list. If a predecessor is missing it stops and reports.
2. Ids. Template and project ids follow section 4.1. If T-B2-19 or T-B2-20 chose another spelling, follow theirs and say so once.
3. Determinism. Converters take no clock and no random source. Every timestamp in a generated project is the constant `LAB_EPOCH = "2026-10-27T00:00:00.000Z"`. Object keys are written by the canonical writer of T-B2-03. Running the generator twice gives the same bytes (R-002).
4. Layering. Section 2 finding F11. `src/studio/lab/*` imports `core`, `project`, `parts` only. Anything that imports `src/lib/*` or `src/content/*` lives under `src/components/`, `src/project/convert/` (which takes lab content as an argument, never imports it), `scripts/` or tests.
5. Text. User-visible strings come from the six language namespaces (`en es fr de zh hi`, `src/i18n/config.ts:4`). No string says "validated" or "certified". No em dashes. Lesson and bench prose is copied as is; rewriting is Amar's (section 9).
6. Figures stay. The hand-inked figure iframe (`FigureFrame`, origin- and version-checked messages, `src/components/figure/FigureFrame.tsx:137,231`) is the visual and the bench simulator until the descriptors replace it (R-144). No task edits `figures/` except T-B13-12.
7. Next.js. This repo runs Next.js 16.4.3 with `cacheComponents: true` (`next.config.ts:5`). Route pages keep the existing pattern: a default export that wraps an async component in `<Suspense>` (`src/app/[lang]/robotics/[bench]/page.tsx:42-49`). Client components load on demand with `next/dynamic` (`node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`, read in this step; `ssr: false` only inside a Client Component). `generateStaticParams` and `PageProps` stay as they are. No task adds a route handler or a config key.
8. A deletion task runs only when its gate is green (T-B13-28 and T-B13-33). If the gate is red the task is skipped, the orchestrator lists it, and Amar decides at the stop (R-152: "otherwise it stays").

## 4. Shared contracts

### 4.1 Ids and where files live

| Thing | Rule | Example |
|---|---|---|
| Template id (gallery, `#/t/<id>`, `LabHost` prop) | The project id of the template file, as B12 does for lessons (`TemplateEntry.id` of T-B12-09, for example `prj_uno-r3-button`) | `prj_robotics-l298n`, `prj_drone-quad5`, `prj_robotics-l298n-spin-forward` |
| Catalogue key | `TemplateEntry.catalogue = {lab, id, child}` (the content ids, task ids read at Step 0) | `{lab: 'robotics', id: 'l298n', child: null}`, `{lab: 'drone', id: 'quad5', child: null}`, `{lab: 'robotics', id: 'l298n', child: 'spin-forward'}` |
| Project id | `prj_robotics-<bench>`, `prj_drone-<craft>`, `prj_robotics-<bench>-<task>` (pattern `^prj_[a-z0-9][a-z0-9_-]{0,63}$`). T-B2-20 gives no id rule for these (VERIFIED by reading it); T-B2-19 uses `prj_<board>-<lesson>` for lessons, and the `robotics-` and `drone-` prefixes keep the 57 lab ids apart from the 83 board ids. The generator passes the id to B2's converters through an optional `ctx.projectId(lab, id, child)` | `prj_robotics-esp32-s3-build`, `prj_drone-quad5` |
| Opened copy | Opening a template forks it (`forkTemplate`, T-B12-09): the copy has a new project id and `provenance.origin = {kind: 'fork', project: <template id>}`. `LearnerRecord.templateId` holds the template id | |
| Fault id | `flt_<content fault id>` | `flt_short-5v` |
| Parameter ids | `par_batt`, `par_motor`, `par_prop` with `name` `batt`, `motor`, `prop` | |
| Source id | `src_<bench>-<mode id>` | `src_l298n-spin` |
| Files | `content/projects/robotics/{a,b}/<id>.project.json`, `content/projects/drones/{a,b}/<id>.project.json`, task projects in the same set folder as their bench, named `<bench>--<task>.project.json` | |
| Set A benches | `uno-r3-build, led-resistor, transistor-switch, esp32-s3-build, tb6612fng, l298n` (6) with their 16 tasks | |
| Set B benches | `a4988, pca9685, mpu6050, hc-sr04, qtr-8rc, lm2596, pi5-ros2` (7) with their 15 tasks | |
| Craft set A | `quad5, whoop, cinewhoop, longrange, racer, gpscam, delivery` (7) | |
| Craft set B | `agrihex, wing, vtol, swarm, tricopter, octo` (6) | |

The order and ids are `ROBOTICS_IDS` and `DRONE_IDS` (`src/content/ids.ts:24-56`, VERIFIED). Task counts per bench are VERIFIED with `scripts/gen-content-index.mjs --emit`: 2, 2, 4, 4, 2, 2 (set A, total 16) and 2, 2, 2, 2, 2, 2, 3 (set B, total 15).

### 4.2 A bench project (what T-B13-01 produces)

| Field | Value |
|---|---|
| `meta.kind` | `bench`; `meta.title` from the bench title; `meta.tags` from `ROBOTICS[id].tags` |
| `boards[]` | the controller on the mat (`RoboticsContent.board`, with `boardVariant`) or empty when `board` is null |
| `components[]` | one placement per entry of `RoboticsContent.parts` and `.modules`, as instances of the descriptors B11 made (`src/parts/data/modules/*.component.json`, T-B11-03). A part with no descriptor is listed in the loss report and kept in `ext["x-iynk-bench"].unplaced` |
| `nets[]` | from the figure circuit when T-B2-18's Q2 rule resolved it; else empty with loss `bench-circuit-unresolved` |
| `sources[]` | one per `BenchMode`: `{id: "src_<bench>-<mode id>", path: "<mode id>.<ext>", language: mode.language, role: "firmware", board: "brd_main", content: <text rendered with the bench's texts>}`. `<ext>` is `ino` for `arduino-cpp` and `py` for `micropython` and `python`; `board` is left out when the bench has no `boards[]`. The schema requires `id, path, language, role, content` (VERIFIED in `project.schema.json` `Source`). A mode whose `code` has `top` or `ports` (Verilog only) is a loss row; none is expected (T-B13-01 Step 0 greps) |
| `simulation.faults[]` | one `Fault` per `FailureMode`: `{id: "flt_<id>", cause_id, symptom_ids, kind, target: {}, enabled: false, params: {legacy: true, trigger, effect, figure}, note: <title Text>}`. `cause_id` and `symptom_ids` come from `legacyCause()` of T-B10-25 |
| `guide` | `kind: "bench"`, `title`, `sub`, `hint`, `overview`, `assembly` (the 17 to 25 `BuildStep` objects as data), `quizzes` (`{id, afterStep?, questions[{id, q, options, answer, why}]}`; `afterStep` is the step id, and a `null` `afterStep` is written as no key, see the reverse rule below), `references` (from `sources`), `legacyFigure: {page: figure.page, sheets: figure.sheets}` (the guide has no other place for `RoboticsContent.figure`; its `parts` go to `ext["x-iynk-bench"].figureParts`) |
| `ext["x-iynk-bench"]` | `{defaultMode, modes[], status[], current, power, faultText, concept, tasks[], unplaced[], figureParts[]}` (shapes in T-B13-01; `modes[]` keeps `language` and `libraries` of the old `BenchMode`) |
| `ext["x-iynk-legacy"]` | `{fig, palette}` (PDM 11.3) |
| `provenance` | `origin: {kind: "migration", catalogue: {lab: "robotics", id}, tool}`; `thirdParty: [{id, kind: "bench-content", what, source: {title}, review: "unchecked"}]` |
| `license` | `LicenseRef-iynk-pending` (RC-33) |
| not set | `domains.robotics` (finding F2), `tests` (benches check by step conditions) |
| Reverse mapping | Restores `afterStep: null` for a quiz with no `afterStep` key. All 13 benches have exactly one such end-of-bench quiz (ids `end`, `q-end` or `final`; VERIFIED by grep: 9 literal `afterStep: null` and 4 `quiz('<id>', null, ...)` calls in `esp32-s3-build`, `led-resistor`, `lm2596`, `uno-r3-build`). The round-trip equality check of T-B13-00 and T-B13-01 compares after this restore, with `BenchMode.language` and `code.libraries` read back from `ext` and `sources[]` |

Largest bench: `pi5-ros2`, 727 source lines; text is 337 KB in English for all 13 and about 649 KB in Hindi (VERIFIED with `wc -c`). Six-language inlining makes a project about 150 to 250 KB (ESTIMATED), against the 5 MiB bare-document cap (PDM 9.4).

### 4.3 A craft project (what T-B13-05 produces)

| Field | Value |
|---|---|
| `meta.kind` | `craft` |
| `parameters[]` | three: `{id: "par_batt", name: "batt", kind: "choice", value: <design.default.batt>, options: [{value, label}]}`, same for `motor`, `prop` |
| `guide` | `kind: "craft"`, `title`, `sub`, `hint`, `overview`, `assembly` (the 9 to 16 `DroneBuildStep` objects), `quizzes`, `references`, `legacyFigure: {page, sheets: ["wiring"]}`; the craft's `noun` and `practice` texts in `ext["x-iynk-craft"]` |
| `domains.drone` | `{schemaVersion: "1.0", data: {kind: "legacy-craft", legacy: {contentId, calcModelId: "legacy-calc@1", flightModelId: "flight-game@1"}, thrustSource: "legacy-calc", flight: {model: "flight-game@1"}, environment: <defaults>, course: {builtin: <first course id>}, bench: {propsOff: true}}}` |
| `ext["x-iynk-legacy"]` | `{fig, palette}` |
| not set | `components`, `nets` (the wiring edges have no pins, PDM 11.5), `tests` (finding F13), `mechanical` |
| `provenance.thirdParty` | `unchecked` rows for the calculator constants and the golden fixtures (T-B13-14 names the sources) |

The `environment` defaults are the ones in `schemas/examples/drone-quad.project.json` (sea level, 15 degC, no wind). `calcModelId` is read as `legacy-calc@1` from DRN 6.5; the schema has no enum for it.

### 4.4 Which action goes where (the lab store replaced)

FE 6.6 gives the rule: each store action goes to exactly one place. For the two labs:

| Action (bench, `BenchAction`) | Goes to | Notes |
|---|---|---|
| `fault/trigger`, `fault/clear` | document: `fault.set` ops (`enabled` true or false) | undoable, shared in a room. The figure command is sent by the figure link from the document change, not by the reducer |
| `step/do`, `figure/*`, `part/select`, `serial/clear`, `quiz/*`, `task/*`, `mode/*` | the session (runtime, not stored) | same reducer as today (`reduceBench`), moved to `session.ts` |
| `done` and `quiz` effects | learner record (`createLearnStore` and `LearnerRecord` of T-B12-04, written with `withStep`, `withAnswer` and the `items` map of T-B13-25), keyed by project id | T-B13-25 maps the old keys through the extended facade (T-B12-08) |
| `run` effect (a practice task) | the Tasks tab keeps `interpRunner` (`src/lib/robotics/runner.ts:28`, unchanged). The same task as a `challenge` project runs through `lessonJobFor` and `runLessonTests` (T-B12-07, kind `'robotics-task'`, already used by T-B12-23) | |
| `sync/hydrate` | deleted | rooms use snapshot plus tail |

| Action (craft, `DroneLabAction`) | Goes to | Notes |
|---|---|---|
| `design/pick` | document: `param.set` on `par_batt`, `par_motor`, `par_prop` | the figure link sends `figureInitial()` after a change |
| everything else in `DroneLabAction` and all of `FlyAction` | the session | the bench build the learner made is passed to the fly view in memory, so `src/lib/dronelab/session.ts` (sessionStorage hand-off) is deleted |
| progress writes | learner record (T-B13-25) | |

### 4.5 The session runtime (T-B13-18)

```ts
// src/components/studio/lab/session.ts
export type LabSession<S, A extends { type: string }, E> = {
  getState(): S;
  subscribe(listener: () => void): () => void;
  dispatch(action: A): void;
  /** Effects are held until a handler connects, then delivered in order. Returns a disconnect. */
  connect(handler: (effect: E) => void): () => void;
};
export function createLabSession<S, A extends { type: string }, E>(
  initial: S,
  reduce: (state: S, action: A) => readonly [S, readonly E[]],
): LabSession<S, A, E>;
```

Only `reduceBench` has the `[S, E[]]` shape. The drone `reduce(content, s, action)` returns `{state, send}` and `reduceFly(content, s, action)` returns a bare `FlyState`, so T-B13-08 wraps them in two adapters before calling `createLabSession`. It has no `LabStore` type, no `sync/hydrate`, and nothing a room can patch. One copy of the "send a command to the figure" switch (today duplicated at `BenchWorkspace.tsx:122-129` and in `DroneWorkspace.tsx`) goes to `src/components/studio/lab/figure-link.ts`.

### 4.6 Error handling

All error codes are existing ones: a failed `apply` returns the `Result` of T-B2-05 and the panel shows the reject reason in a live region; a figure that never sends `ready` leaves the panel usable with the note from `robotics.bench` (existing key); a missing template shows the not-found state of `LabHost` (T-B13-23). No task adds a thrown error type.

### 4.7 Parity numbers (VERIFIED in this step with `scripts/gen-content-index.mjs --emit` over all 26 items)

| Lab | Item count | Steps / build steps | Faults | Tasks | Quizzes | Other |
|---|---|---|---|---|---|---|
| Robotics, 13 benches | 13 | 272 | 106 | 31 | 66 | modes 4,4,4,4,6,5,4,4,4,4,3,4,3 (53) |
| Drone, 13 craft | 13 | 173 | not applicable (Break it flags) | not applicable | 49 | bench tests 78, wiring edges 113, CLI snippets 131, courses 22, golden rows 342 (4 crafts x 27 plus 234, `src/lib/drone/__fixtures__/golden-{a,b}.json`) |

Counts per item (steps, faults, tasks, quizzes) are in the baseline file T-B13-13 writes. The roadmap's "96 flight tests" is wrong: `grep -cE "^\s*(it|test)\(" src/lib/flight/*.test.ts*` gives 37 + 7 + 6 + 7 = 57 (VERIFIED in this review: `flight.test.ts` 37, `challenge.test.ts` 7, `crash.test.ts` 7, `ghost.test.ts` 6). T-B13-13's test prints the count it finds and asserts that number, not 96.

## 5. Task index

| ID | Title | Priority | Group | Depends on (inside B13) | Requirements |
|---|---|---|---|---|---|
| T-B13-00 | Spike: do all 26 items round-trip through the project schema? | must | 1 | none | R-145, R-147 |
| T-B13-12 | Figure idle redraw (only if T-B1-25 deferred it) | should | 1 | none | R-152 |
| T-B13-13 | Freeze the old results: reference baseline | must | 1 | none | R-141 (parity), R-152 |
| T-B13-14 | Calculator fixtures name their sources | must | 1 | none | R-148, F-181 |
| T-B13-16 | Bench session split: reducer and types leave the store | must | 1 | none | R-145 |
| T-B13-17 | Craft workshop and fly session split | must | 1 | none | R-147 |
| T-B13-01 | Bench converter: steps, faults, modes, status, current | must | 2 | 00 | R-145 |
| T-B13-05 | Craft converter: guide, design picks, legacy-craft domain | must | 2 | 00 | R-147, R-148 |
| T-B13-19 | Bench operations and selectors | must | 2 | 16 | R-145 |
| T-B13-20 | Craft operations and selectors | must | 2 | 17 | R-147 |
| T-B13-21 | Extract `BenchView` from `BenchWorkspace` | must | 2 | 16 | R-145 |
| T-B13-22 | Extract `CraftView` and `FlyView` | must | 2 | 17 | R-147 |
| T-B13-18 | `LabSession` runtime and the figure link | must | 2 | 16 | R-145, R-147 |
| T-B13-25 | Local completion record and progress keys | must | 2 | none | F-151, R-143 |
| T-B13-29 | AI adapters, sound moments and `RealBuildPanel` off the store types | must | 2 | 16, 17 | R-152 |
| T-B13-30 | Robotics panels A import session types | must | 2 | 16 | R-152 |
| T-B13-31 | Robotics panels B import session types | must | 2 | 16 | R-152 |
| T-B13-36 | Drone panels A import workshop types | must | 2 | 17 | R-152 |
| T-B13-37 | Drone panels B import workshop types | must | 2 | 17 | R-152 |
| T-B13-32 | Non-lab consumers leave the v1 room client | must | 2 | none | RT 18 |
| T-B13-15 | Lab generation script, drift check, set checks, lab template index | must | 3 | 01, 05 | R-139 (gallery) |
| T-B13-04 | Robotics bench in Studio: `BenchPanel` | must | 3 | 01, 18, 19, 21, 25, 30, 31 | R-145, R-146 |
| T-B13-08 | Drone workshop and fly in Studio: `CraftPanel`, `FlyPanel` | must | 3 | 05, 18, 20, 22, 25, 36, 37 | R-147 |
| T-B13-02 | Projects: benches 1 to 6 and their 16 tasks | must | 4 | 15 | R-145 |
| T-B13-03 | Projects: benches 7 to 13 and their 15 tasks | must | 4 | 15 | R-145 |
| T-B13-06 | Projects: craft 1 to 7 | must | 4 | 15 | R-147 |
| T-B13-07 | Projects: craft 8 to 13 | must | 4 | 15 | R-147 |
| T-B13-23 | `LabHost` and the Studio mount | must | 4 | 04, 08 | R-145, R-147 |
| T-B13-26 | Show the lab sets in the template gallery | must | 5 | 02, 03, 06, 07, 23 | R-139 (gallery) |
| T-B13-28 | Parity gate (unit): converted equals old | must | 5 | 13, 02, 03, 06, 07 | R-141, R-152 |
| T-B13-27 | English term beside the translated term | could | 5 | 04, 08 | F-173, R-150 |
| T-B13-24 | Route pages open the lab in Studio, URLs kept | must | 6 | 23, 26 | R-151 |
| T-B13-09 | The dock leaves the room layer: `LabRoom`, Together tab | must | 7 | 24 | R-152, RT 18 |
| T-B13-40 | Together lobby leaves the v1 room client | must | 7 | none | RT 18 |
| T-B13-33 | Playwright: the lab walk on Studio | must | 7 | 24, 25, 26, 28 | R-152 |
| T-B13-38 | Remove the old workspaces (separate commit) | must | 8 | 24, 28, 33 | R-152 |
| T-B13-34 | Delete the v1 room client | must | 8 | 09, 32, 40 | RT 18 |
| T-B13-39 | Playwright: `room` spec on the new rooms | must | 8 | 24, 09, 33 | RT 18 |
| T-B13-10 | Delete `server/legacy/` | must | 9 | 34 | RT 18 |
| T-B13-11 | Delete the robotics and dronelab stores | must | 9 | 38, 29, 30, 31, 36, 37, 34 | X13 |
| T-B13-35 | `docs/LABS.md`, results, exit gate and Amar's walk | must | 10 | all | none |

The ids 00 to 40 are all used once. T-B13-35 runs last. Ids 01 to 12 keep the meaning of the roadmap rows; 00 and 13 to 40 are added. T-B13-40 is added by the review (the Together lobby imports the v1 room client and no other task owns it).

### 5.1 Parallel groups

Tasks in one group touch disjoint files (section 5.2). Groups run in order. A group starts when every task of the groups before it is committed on `build/v1` and its verify commands pass. Inside a group, separate agents may work at once.

| Group | Tasks | Why they are disjoint |
|---|---|---|
| 1 | T-B13-00, 12, 13, 14, 16, 17 | Spike report; `figures/vendor`; `src/content/labs/{baseline-rows.ts,baseline.json,reference.test.ts}`; fixtures json and `docs/PROVENANCE.md`; `src/lib/robotics/{session,store}.ts`; `src/lib/dronelab/{workshop,store,fly}.ts` |
| 2 | T-B13-01, 05, 18, 19, 20, 21, 22, 25, 29, 30, 31, 32, 36, 37 | `src/project/convert/bench*`; `src/components/studio/lab/{session,figure-link}.ts`; `convert/craft*`; `src/studio/lab/bench-*`; `src/studio/lab/craft-*`; `BenchView.tsx` + `BenchWorkspace.tsx`; `CraftView.tsx`, `FlyView.tsx`, `DroneWorkspace.tsx`, `FlyWorkspace.tsx`, `e2e/fly-fun.spec.ts`; `src/lib/learn/{facade,legacy-import,record,lab-completion}.ts`; sound and AI adapters and `RealBuildPanel`; four robotics panels; `StepsPanel`, `TasksPanel`, `messages.ts`; three drone panels; three drone panels; `src/lib/sound/react.ts` and its test, `PartnerPanel`, `DailyChallenge`, mcp `together.ts` |
| 3 | T-B13-15, 04, 08 | `scripts/convert-labs.mjs`, `package.json`, `src/content/labs/check-set.ts`, `content/projects/index.ts` and four empty set indexes; `src/components/studio/lab/{BenchPanel,useBench}.tsx` and robotics i18n; `{CraftPanel,FlyPanel,useCraft}.tsx` and dronelab i18n |
| 4 | T-B13-02, 03, 06, 07, 23 | Four separate set folders under `content/projects/`; `LabHost.tsx`, `StudioEntry.tsx`, `router.ts` |
| 5 | T-B13-26, 28, 27 | `src/studio/templates.ts` and `TemplateGallery.tsx`; tests only; `terms.ts`, `Term.tsx`, panels, common i18n |
| 6 | T-B13-24 | three lab route pages and two board pages; e2e `dock-shared.ts`, `dock.spec.ts`, `room.spec.ts`, `robotics.spec.ts`, `dronelab.spec.ts`, `fly.spec.ts` |
| 7 | T-B13-09, 33, 40 | `LabDock.tsx`, `tools.ts`, `dock/index.ts`, `LabRoom.tsx` deleted, dock tests and dock e2e files; `e2e/labs-studio.spec.ts`; `together/{Lobby,page,strings}`, `together.json` |
| 8 | T-B13-38, 34, 39 | deletions of old workspaces; deletions of `src/lib/realtime` and v1 components, `voice-wav.test.tsx`; `e2e/room.spec.ts` |
| 9 | T-B13-10, 11 | `server/legacy/`, `package.json`, deploy and README; the two stores and three trimmed files |
| 10 | T-B13-35 | docs |

### 5.2 File ownership (file to task)

A file has one owner per group. "Later" names a task in a later group that edits the same file.

| File | Owner | Later |
|---|---|---|
| `08_RESEARCH_SPIKES/RS-B13-01-lab-roundtrip/*` | T-B13-00 | none |
| `figures/vendor/colorfigures/core.js` and up to 4 more (only if needed) | T-B13-12 | none |
| `src/content/labs/baseline-rows.ts`, `src/content/labs/baseline.json`, `src/content/labs/reference.test.ts` | T-B13-13 | none |
| `src/lib/drone/__fixtures__/sources.json`, `docs/PROVENANCE.md` | T-B13-14 | T-B13-35 (adds the lab rows summary only if missing) |
| `src/lib/robotics/session.ts` | T-B13-16 | T-B13-11 (drops `hydrate` and the `sync/hydrate` case) |
| `src/lib/robotics/store.ts` | T-B13-16 | T-B13-11 (deleted) |
| `src/lib/dronelab/workshop.ts` | T-B13-17 | T-B13-11 (drops `hydrate` and the `sync/hydrate` case) |
| `src/lib/dronelab/store.ts` | T-B13-17 | T-B13-11 (deleted) |
| `src/lib/dronelab/fly.ts` | T-B13-17 | T-B13-11 (drops `createFlyStore`) |
| `src/lib/dronelab/session.ts` | none | T-B13-11 (deleted) |
| `src/components/studio/lab/session.ts`, `figure-link.ts` | T-B13-18 | none |
| `src/project/convert/bench.ts` | T-B2-20 (B2) | T-B13-01 |
| `src/project/convert/bench-steps.ts`, `bench-sim.ts` | T-B13-01 | none |
| `src/project/convert/craft.ts` | T-B2-20 (B2) | T-B13-05 |
| `src/project/convert/craft-guide.ts`, `craft-domain.ts` | T-B13-05 | none |
| `src/studio/lab/bench-ops.ts`, `bench-select.ts` | T-B13-19 | none |
| `src/studio/lab/craft-ops.ts`, `craft-select.ts` | T-B13-20 | none |
| `src/components/robotics/BenchView.tsx` | T-B13-21 | none |
| `src/components/robotics/BenchWorkspace.tsx` | T-B13-21 | T-B13-38 (deleted) |
| `src/components/dronelab/CraftView.tsx`, `FlyView.tsx` | T-B13-22 | none |
| `src/components/dronelab/DroneWorkspace.tsx`, `FlyWorkspace.tsx`, `e2e/fly-fun.spec.ts` | T-B13-22 | T-B13-38 (the two workspaces deleted) |
| `src/lib/learn/facade.ts`, `src/lib/learn/legacy-import.ts`, `src/lib/learn/record.ts` (B12 files, edited), `src/lib/learn/lab-completion.ts` (new) | T-B13-25 | none |
| `src/lib/sound/bench-moments.ts`, `moments.ts`, `src/lib/ai/bench/robotics.ts`, `drone.ts`, `src/components/search/RealBuildPanel.tsx` | T-B13-29 | none |
| `src/components/robotics/FaultsPanel.tsx`, `ModesPanel.tsx`, `QuizPanel.tsx`, `SerialPanel.tsx` | T-B13-30 | none |
| `src/components/robotics/StepsPanel.tsx`, `TasksPanel.tsx`, `messages.ts` | T-B13-31 | none |
| `src/components/dronelab/BuildPanel.tsx`, `CliConsole.tsx`, `DesignPanel.tsx` | T-B13-36 | none |
| `src/components/dronelab/QuizPanel.tsx`, `TestsPanel.tsx`, `WiringPanel.tsx` | T-B13-37 | none |
| `src/lib/sound/react.ts`, `src/lib/sound/react.test.tsx`, `src/components/ai/PartnerPanel.tsx`, `src/components/flight/DailyChallenge.tsx`, `src/lib/server/mcp/tools/together.ts` | T-B13-32 | none |
| `scripts/convert-labs.mjs`, `src/content/labs/check-set.ts`, `package.json`, `content/projects/index.ts` (B12 file, edited: lab index) | T-B13-15 | T-B13-10 (`server:test` script only) |
| `src/components/studio/lab/BenchPanel.tsx`, `useBench.ts`, `src/i18n/messages/*/robotics.json` | T-B13-04 | T-B13-27 (`BenchPanel.tsx` only) |
| `src/components/studio/lab/CraftPanel.tsx`, `FlyPanel.tsx`, `useCraft.ts`, `src/i18n/messages/*/dronelab.json` | T-B13-08 | T-B13-27 (`CraftPanel.tsx` only) |
| `content/projects/robotics/a/*`, `src/content/labs/robotics-a.test.ts` | T-B13-02 | none |
| `content/projects/robotics/b/*`, `src/content/labs/robotics-b.test.ts` | T-B13-03 | none |
| `content/projects/drones/a/*`, `src/content/labs/drones-a.test.ts` | T-B13-06 | none |
| `content/projects/drones/b/*`, `src/content/labs/drones-b.test.ts` | T-B13-07 | none |
| `src/components/studio/lab/LabHost.tsx`, `src/components/studio/StudioEntry.tsx`, `src/studio/router.ts`, `src/i18n/messages/*/studio.json` | T-B13-23 | none |
| `StudioEntry.tsx` earlier owners (read fresh at Step 0) | T-B4-01, T-B4-25a, T-B7-22, T-B7-26, T-B7-28, T-B8-20, T-B12-24 | none |
| `src/studio/templates.ts`, `src/components/studio/TemplateGallery.tsx` | T-B13-26 (edits B12's files) | none |
| `src/content/labs/parity.test.ts` | T-B13-28 | none |
| `src/i18n/terms.ts`, `src/components/ui/Term.tsx`, `src/i18n/messages/*/common.json` | T-B13-27 | none |
| `src/app/[lang]/robotics/[bench]/page.tsx`, `drones/[drone]/page.tsx`, `drones/[drone]/fly/page.tsx`, `src/app/[lang]/boards/[board]/page.tsx`, `[lesson]/page.tsx` | T-B13-24 | none (T-B13-09 does not touch them) |
| `src/components/dock/LabDock.tsx`, `LabDock.test.tsx`, `src/lib/ai/tools.ts`, `tools.test.ts`, `src/components/dock/index.ts` | T-B13-09 | none |
| `src/components/dock/LabRoom.tsx` | none | T-B13-09 (deleted) |
| `e2e/robotics.spec.ts`, `e2e/dronelab.spec.ts`, `e2e/fly.spec.ts` | T-B13-24 | none |
| `e2e/labs-studio.spec.ts` | T-B13-33 | none |
| `e2e/dock-shared.ts` | T-B13-24 (`LAB_PAGES` rows) | T-B13-09 (Together tab) |
| `e2e/dock.spec.ts` | T-B13-24 (the `data-lab-room` line) | T-B13-09 (Together cases) |
| `e2e/dock.phone.spec.ts` | T-B13-09 | none |
| `e2e/room.spec.ts` | T-B13-24 (`test.fixme` with a reason) | T-B13-39 (rewritten) |
| `src/app/[lang]/together/Lobby.tsx`, `page.tsx`, `strings.ts`, `src/i18n/messages/*/together.json` (only unused `lobby.create.*` and `lobby.join.*` keys), and its new test `Lobby.test.tsx` | T-B13-40 | none |
| `src/lib/realtime/**`, `src/components/realtime/{ChatPanel,IdentityForm,PresenceCursors,RoomBar,TogetherPanel,VoiceButton,PeerAvatar,pointing}`, `src/components/flight/room-ghosts.ts` | none | T-B13-34 (deleted); `src/components/realtime/index.ts` edited by T-B13-34 |
| `src/lib/ai/voice-wav.test.tsx` (edit: the `VoiceButton` case and its two imports go), `src/lib/boardlab/store.ts` (comment at line 101 only), `src/lib/features.ts`, `src/components/buddies/PairDialog.tsx` (only if F6 says so) | none | T-B13-34 |
| `server/legacy/**`, README paths, `deploy/*` references | none | T-B13-10 |
| `docs/LABS.md`, `docs/ARCHITECTURE.md` | T-B13-35 | none |

## 6. Task packages

A task row uses these labels. Subsystem is LABS unless stated. Phase is B13. "Default" means: permissions none (everything is local and the build calls no server); API contracts none; migration none; observability none beyond the test output; documentation none beyond `docs/LABS.md` (T-B13-35); rollback `git revert <task commit>` (later tasks that depend on it are reverted first). A task states a default only when it applies.

---

### T-B13-00 Spike RS-B13-01: do all 26 items round-trip through the project schema?

**Identity.** T-B13-00; LABS spike; B13; must; depends on T-B2-20, T-B2-18, T-B10-15, T-B10-25, T-B11-03 (earlier phases); not started.

**Intent.**
- Problem: this plan decided (findings F2, F3, F12) where bench and craft data lives. Nobody has run it against the validator. If the validator refuses it, T-B13-01 and T-B13-05 are written wrong.
- Target user: the builders of T-B13-01, T-B13-05, T-B13-15.
- User story: as the converter builder I want to know before I write it that the 26 items fit the schema without loss.
- Falsifiable question: "Can each of the 13 benches and 13 craft be converted to a project that passes `04_ARCHITECTURE/schemas/tools/validate-project.mjs` (both domain schemas loaded) and be converted back to an equal `RoboticsContent` or `DroneContent` structure (text keys resolved) with zero differences, each canonical file under 1 MiB?"
- Exit condition: PASS when 26 of 26 are valid, 26 of 26 round-trip equal, and the largest canonical file is under 1 MiB. FAIL otherwise; the report lists each failure by item and field and proposes the smallest schema-legal alternative. T-B13-01 and T-B13-05 do not start before the report exists.
- Success metric: `REPORT.md` holds a 26-row table (item, valid, round-trip equal, bytes) and answers Q1 to Q4.

**Implementation.**
- Existing files read: `src/content/schema.ts:243,256,479,504,521,792`; `src/content/ids.ts:24-56`; the B2 converter output (`src/project/convert/*`); `schemas/tools/validate-project.mjs` and `project-lib.mjs` (VERIFIED present); `schemas/examples/drone-quad.project.json` (environment defaults).
- New files: `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-B13-01-lab-roundtrip/REPORT.md` and a throwaway `prototype.mjs` in the same folder (outside `src/`).
- Questions: Q1 does a bench fault with `params: {legacy, trigger, effect, figure}` fit `Fault.params` (16 properties) and the largest `figure` command? Q2 does `ext["x-iynk-bench"]` with the status, current and fault text stay inside the project `ext` limits (16 keys) and the file cap? Q3 does a craft with `domains.drone` as `legacy-craft` pass the semantic rules DB-C-* with no `motors`? Q4 does T-B10-15's netlist applier skip a fault whose `params.legacy` is true, and does T-B10-16's detector table ignore it?
- Method: run the B2 converters in memory (`convertBench`, `convertCraft`, `convertPracticeTask` of T-B2-20); apply the mapping of sections 4.2 and 4.3 in the prototype, including the `src/content/faults/legacy-map.ts` (T-B10-25) `legacyCause` call; validate; reverse the mapping; deep-compare with `JSON.stringify` of sorted keys.
- Data model, API, state, permissions, migration: none. The script writes only into the spike folder.
- Error conditions: B2 converter output missing means stop and report.

**Verification.**
- Unit tests none (a spike). Evidence is the report.
- Acceptance. Given the converter and validator, When `node 08_RESEARCH_SPIKES/RS-B13-01-lab-roundtrip/prototype.mjs` runs, Then it prints the 26-row table and exits 0, and `REPORT.md` states PASS or FAIL with the numbers.
- Observability: one line per item (`id valid=<bool> equal=<bool> bytes=<n>`).
- Release blockers: a FAIL stops T-B13-01 and T-B13-05 until the orchestrator has chosen the alternative.

**Delivery.**
- Done when the report is committed with a verdict.
- Verify: run the prototype; `TL` unchanged.
- Rollback: delete the folder.
- Later tasks need: the verdict, the largest file size, the Q4 answer (T-B13-01 test), the environment defaults (T-B13-05).

---

### T-B13-12 Figure idle redraw (only if T-B1-25 deferred it)

**Identity.** T-B13-12; FIGURES; B13; should; depends on none; not started.

**Intent.**
- Problem: a bench in Studio keeps its figure iframe mounted for the whole session, so the idle main-thread cost measured on the bench page (48 to 65 percent, `PERFORMANCE_BASELINE.md` P1, HYPOTHESIS cause: `ui.render` replaces `art.innerHTML` every frame, `figures/vendor/colorfigures/core.js:480,497-500`) now burns the Studio tab as well.
- Target user: Amar on a laptop on battery.
- User story: as a builder who leaves a bench open, I want the machine to stay quiet.
- Expected behaviour: if `docs/MASTER_PLAN/08_RESEARCH_SPIKES/P1-figure-idle-cpu/REPORT.md` and `scripts/perf-budget.mjs` show T-B1-25 landed and the idle metric meets budget on a bench page, this task closes with a note in its commit body and changes nothing. Otherwise it applies the fix the B1 report recommends.
- Success metric: idle main thread under 5 percent (`idle.bench.mainThreadPct` from `perf-budget.mjs`) on `/en/robotics/l298n` and on the Studio bench.

**Implementation.**
- Existing files: `figures/vendor/colorfigures/core.js:480,497-500`; at most 4 more hand-edited figure sources (generated figures do not count and are rebuilt with the existing figure build).
- Algorithm: as the B1 report says; a step that has nothing to draw returns `false` so the frame driver stops.
- Edge cases: the figure must still draw after a `resume` message (`FigureFrame.tsx:217`).
- Performance: the metric above.

**Verification.**
- Unit: the figures test of T-B1-25 (`V figures`), unchanged.
- Integration: `node scripts/perf-budget.mjs` against a local keyless build.
- Playwright: none new; `E e2e/robotics.spec.ts` still passes (figure visible).
- Acceptance. Given a bench page open for 10 s with no input, When the main-thread time is sampled twice 5 s apart, Then it is under 5 percent.
- Observability: the printed metric.
- Release blockers: a figure that stops redrawing after `resume`.

**Delivery.**
- Done when the metric is under 5 percent, or the closing note is written.
- Verify: `TL`; `V figures`; `node scripts/perf-budget.mjs`.
- Rollback: revert.
- Later tasks need: nothing.

---

### T-B13-13 Freeze the old results: reference baseline

**Identity.** T-B13-13; LABS tests; B13; must; depends on none; not started.

**Intent.**
- Problem: R-141 and R-152 say a converted lab passes "the same checks" and "no worse numbers". Nothing records the old numbers except the live code. After the old workspaces go there is nothing to compare with.
- Target user: the author of the parity gate (T-B13-28) and Amar.
- User story: as the person who must trust the move, I want the old verdicts written down once, before anything is changed.
- Expected behaviour: the rows are computed in `src/content/labs/baseline-rows.ts`, which runs under vitest (it resolves the `@/` alias, `vitest.config.mts`; a plain Node script cannot import `@/lib/interp`, `src/lib/robotics/current.ts` or `src/lib/flight/*`, because Node 24 type stripping does not resolve `@/` aliases or extensionless `./state` imports; `gen-content-index.mjs` works only because the content modules have type-only imports). `reference.test.ts` recomputes the rows and compares them with `src/content/labs/baseline.json`. It writes the file instead of comparing when `UPDATE_LAB_BASELINE=1`, the way `lessons.test.ts` writes its table when `IYNK_LESSON_TABLE` is set. The file therefore cannot drift unseen.
- Success metric: the baseline holds 13 bench rows, 31 task rows, 13 craft rows; the test passes twice in a row.

**Implementation.**
- Existing files read (not edited): `src/content/robotics/*.ts`, `src/content/drones/*.ts`, `src/lib/robotics/steps.ts` (`advanceSteps`, `activeFaults`), `src/lib/robotics/current.ts` (`currentDraw`), `src/lib/interp/lessons.test.ts:55-90` (the model: `taskJob` + `runHeadless`/`evaluateChecks` through `runChecks`, one `it` per item, 60 s timeout), `src/lib/drone/calc.ts`, `src/lib/drone/design.ts`, `src/lib/dronelab/bench.ts` (`armingRules`, `canArm`), `src/lib/flight/*` (headless run as in `src/lib/flight/flight.test.ts`), `vitest.config.mts` (alias, jsdom, 60 s timeout).
- New files: `src/content/labs/baseline-rows.ts` (pure functions, no file writes), `src/content/labs/baseline.json`; test `src/content/labs/reference.test.ts`. No `scripts/lab-baseline.mjs`. If a command-line entry is wanted later it is a wrapper that spawns vitest with `UPDATE_LAB_BASELINE=1`.
- Row shapes:
```ts
type BenchRow = { id: string; steps: { id: string; doneHash: string }[]; faults: { id: string; kind: string; ruleHash: string }[];
  modes: string[]; status: string[]; currentSamples: { state: Record<string, unknown>; supply: string; ma: number }[]; quizzes: { id: string; questions: number; afterStep: string | null }[] };
type TaskRow = { bench: string; id: string; starter: { passed: boolean; failedChecks: string[] }; solution: { passed: boolean; failedChecks: string[] } };
type CraftRow = { id: string; goldenRows: number; goldenHash: string; defaultCalcHash: string; tests: string[]; armingFactory: string[]; armingBlank: string[];
  courses: { id: string; par: [number, number, number] | null }[]; snippets: number; quizzes: number; flightHash: Record<string, string> };
export function benchRows(): Promise<BenchRow[]>; export function taskRows(): Promise<TaskRow[]>; export function craftRows(): Promise<CraftRow[]>;
```
- Algorithm: hashes are SHA-256 over canonical JSON (T-B2-03 `canonicalize`; if absent, `JSON.stringify` with sorted keys). Task rows run `taskJob` through `runChecks` exactly as `lessons.test.ts:76-83` does. `currentSamples`: three states per bench chosen by the code (all off; defaults; every `when` condition true). `flightHash`: for each craft and course, a fixed 600-step run with a scripted stick sequence, hash of the final state. The test counts the `it(` and `test(` calls under `src/lib/flight` and asserts the number it finds: 57 today (37 + 7 + 6 + 7, VERIFIED), not the roadmap's 96.
- Validation: a task whose starter passes every check, or whose solution fails one, is a defect in the content and the test fails naming it.
- Edge cases: the interpreter run takes under 3 s per task alone (DOCUMENTED, `vitest.config.mts` comment); each task is its own `it` with a 60 s timeout. `reference.test.ts` does not import any jsdom figure test (finding F10).
- Performance: under 3 minutes for 31 tasks and 13 flight runs (ESTIMATED).
- Migration: none.

**Verification.**
- Unit: `reference.test.ts` recomputes every row and compares with `baseline.json`; asserts 13, 31, 13 rows; asserts the totals of section 4.7 (272, 106, 31, 66, 78, 173, 113, 131, 22, 49, 342) and the 57 flight tests; prints one line per item and the totals.
- Integration: none. Playwright: none.
- Fixtures: `baseline.json` is the fixture.
- Acceptance. Given the repo at the start of B13, When `UPDATE_LAB_BASELINE=1 npx vitest run src/content/labs/reference.test.ts` runs, Then it exits 0, writes `baseline.json` and prints the totals; Then `V src/content/labs/reference.test.ts` passes without the variable, twice.
- Observability: the printed lines.
- Release blockers: any starter that already passes, any solution that fails.

**Delivery.**
- Done when the rows module, the file and the test are committed.
- Verify: `TL`; `UPDATE_LAB_BASELINE=1 npx vitest run src/content/labs/reference.test.ts`, then `V src/content/labs/reference.test.ts`.
- Rollback: revert.
- Later tasks need: T-B13-28 compares projects with these rows; T-B13-33 uses the totals.

---

### T-B13-14 Calculator fixtures name their sources (R-148, F-181)

**Identity.** T-B13-14; DRONE data; B13; must; depends on none; not started.

**Intent.**
- Problem: the 342 golden rows are third-party derived (DRN DK-3; `src/lib/drone/__fixtures__/extract.py:3-11` says they come from `docs/research/drone-lab-a.md` Appendix A and `drone-lab-b-calc-matrix.md`, and `drone-lab-a.md:36-37` says they were compared with the live third-party `calc()`). R-148: each fixture file names its source.
- Target user: Amar, deciding what to clear or rewrite (D-017); contributors.
- User story: as Amar I want each fixture to say where it came from and its review state, so `provenance:check` lists it.
- Expected behaviour: `src/lib/drone/__fixtures__/sources.json` holds one entry per fixture file (`catalogues.json`, `golden-a.json`, `golden-b.json`) with `origin`, `rows`, `derivedFrom`, `oracle`, `source: {title}`, `review: "unchecked"`. A test fails when a fixture file has no entry or the row count differs. `docs/PROVENANCE.md` gains one row per file (format of T-B1-17).
- Success metric: 3 of 3 files named; row counts 4 crafts x 27 = 108 plus 234 = 342.

**Implementation.**
- Existing files: `src/lib/drone/__fixtures__/golden-a.json`, `golden-b.json`, `catalogues.json`, `extract.py:1-12`; `src/lib/drone/content.test.ts:6-7,26,80` (imports the two golden files); `docs/PROVENANCE.md` (T-B1-17; Step 0 reads its row format); `scripts/provenance-check.mjs` (T-B1-17).
- New files: `src/lib/drone/__fixtures__/sources.json`; test `src/lib/drone/fixtures-sources.test.ts`. Edit: `docs/PROVENANCE.md`.
- Shape:
```ts
type FixtureSource = { file: string; rows: number; origin: "third-party tables"; derivedFrom: string[]; oracle: "third-party calc() output" | "datasheet" | "none";
  source: { title: string };   // required by provenance.thirdParty[].source
  review: "unchecked" | "cleared" | "rewritten" | "not-needed"; note: string };   // the enum of project.schema.json provenance.thirdParty[].review
```
- Validation: `review` is `unchecked` for all three now. The four words are the schema enum (VERIFIED in `project.schema.json`, `Provenance.thirdParty`), so T-B13-05 copies an entry into `provenance.thirdParty` with no translation. Step 0 reads the word list of `docs/PROVENANCE.md` (T-B1-17: `cleared`, `rewrite-needed`, `own`, VERIFIED in `tasks/B1-foundation-keys-oss-honest.md` line 826). Those words differ from the schema enum; this task keeps the schema words in the sidecar, writes the `PROVENANCE.md` rows in the words T-B1-17 defined, and records the mismatch in the commit body for the orchestrator (section 10, Q7). Changing a review state is Amar's act (section 9, item 2).
- Edge cases: the golden files are arrays, so no key can be added inside them without changing their type; the names live in the sidecar. The test also fails if a new `*.json` appears in the folder without an entry.
- Migration: none.

**Verification.**
- Unit: `fixtures-sources.test.ts` (every file listed; row count matches; `review` is one of the four schema values; `source.title` is non-empty; the 342 total).
- Acceptance. Given the fixture folder, When the test runs, Then all three files have entries and the golden rows total 342. Given `npm run provenance:check`, When it runs, Then it lists the three new rows as open.
- Release blockers: a fixture file with no entry.

**Delivery.**
- Done when committed.
- Verify: `TL`; `V src/lib/drone`; `npm run provenance:check` (non-zero exit is expected until Amar clears rows).
- Rollback: revert.
- Later tasks need: T-B13-05 maps the three entries one to one into `provenance.thirdParty` of every craft (`{id, kind, what, source, review}`).

---

### T-B13-16 Bench session split: reducer, `hydrate` and types leave the store

**Identity.** T-B13-16; LABS refactor; B13; must; depends on none; not started.

**Intent.**
- Problem: `src/lib/robotics/store.ts` (337 lines) mixes the pure reducer (`reduceBench`, line 157) with store machinery (`BenchStore` line 303, `createBenchStore` line 308, `connect` line 329) and the room hand-off. `reduceBench` calls the private `hydrate()` (line 120) from its `sync/hydrate` case (line 296), and `hydrate` reads types and helpers (`isRecord`, `StepsSession`, `FigureState`, `activeFaults`) that move with the reducer. Leaving `hydrate` in `store.ts` while the reducer moves would make a circular import (`session.ts` imports `store.ts`, which re-exports `session.ts`) or a compile error. Studio needs the reducer and not the machinery.
- Target user: the builders of T-B13-04, 19, 21, 30, 31.
- User story: as the panel author I want the pure session code in its own module so the store can be deleted later.
- Expected behaviour: no behaviour change. `session.ts` exports everything pure, including `hydrate` and the `sync/hydrate` action member; `store.ts` imports from it and re-exports the same names, so all 13 importers still compile.
- Success metric: `store.test.ts` (161 lines) passes unchanged; typecheck passes with zero importer edits.

**Implementation.**
- Existing files: `src/lib/robotics/store.ts:12-100` (types `FigureCommand`, `Notice`, `QuizSession`, `TaskSession`, `SerialLine`, `BenchState`, `BenchAction`, `BenchEffect`, `BenchSetup`), `:112-155` (`isRecord`, `hydrate`), `:116-136` (`initialBenchState`), `:157-300` (`reduceBench`, with the `sync/hydrate` case at 296), `:303-337` (store).
- New file: `src/lib/robotics/session.ts` with `initialBenchState`, `reduceBench`, `hydrate` (private to the module), `isRecord`, and all types, unchanged. Edit: `store.ts` keeps only `BenchStore`, `createBenchStore`, `EffectHandlers`, `connect`, plus `export * from "./session"`.
- Signatures unchanged: `reduceBench(setup: BenchSetup, state: BenchState, action: BenchAction): [BenchState, BenchEffect[]]`.
- The `sync/hydrate` action member stays in `BenchAction` until T-B13-11, which then deletes both `hydrate` and the case. The comment on that member names `src/lib/realtime/store-sync.ts`; reword it while moving it ("v1 rooms, removed by T-B13-11") so the grep of T-B13-34 stays clean.
- Layering: `session.ts` imports `@/content/schema` types, `@/lib/progress/keys`, and sibling pure modules only. It imports nothing from `./store` and nothing from `@/components` (the type import of `LabStore` stays in `store.ts`). A test asserts it: a typecheck-level test reads `session.ts` source and fails on `from "./store"` or `@/components`.
- Edge cases: `store.test.ts` imports `createBenchStore` from `./store`; it stays valid.

**Verification.**
- Unit: `session.test.ts` is a copy of the reducer-only cases of `store.test.ts` (steps, quiz, tasks, serial, faults, and one `sync/hydrate` case) run against `session.ts`, plus the no-import-from-store assertion; `store.test.ts` unchanged.
- Acceptance. Given the repo, When `V src/lib/robotics` runs, Then both files pass; Given `npm run typecheck`, Then zero importer files changed.
- Release blockers: any importer edit; a circular import.

**Delivery.**
- Verify: `TL`; `V src/lib/robotics src/components/robotics`.
- Rollback: revert.
- Later tasks need: the stable path `@/lib/robotics/session` (T-B13-19, 21, 30, 31, 29, 11).

---

### T-B13-17 Craft workshop and fly session split

**Identity.** T-B13-17; LABS refactor; B13; must; depends on none; not started.

**Intent.**
- Problem: `src/lib/dronelab/store.ts` (292 lines) holds the workshop reducer (`reduce`, line 135), its private `hydrate()` (line 114, called from the `sync/hydrate` case at line 232) and the store (lines 248-289). `hydrate` reads `isRecord`, `Step`, `calcPatch`, `set` and the state types, which belong with the reducer. Moving `reduce` and leaving `hydrate` would make a circular import or a compile error, so `hydrate` moves too. `src/lib/dronelab/fly.ts` holds a pure `reduceFly` (line 75) beside a tiny `createFlyStore` (line 112). `session.ts` (37 lines) hands the bench build from workshop to fly page through `sessionStorage` (`iynk:dronelab:<id>`), which Studio does not need.
- User story: as the panel author I want the pure workshop and fly code apart from the stores.
- Expected behaviour: no behaviour change. New `workshop.ts` holds `DroneLabState`, `DroneLabAction` (with its `sync/hydrate` member), `initialState`, `reduce`, `hydrate` (private), `calcPatch`, `figureInitial`, `cliContext`, `benchSummary`, `BenchSummary` and the other pure names. `store.ts` keeps only `DroneLabStore` and `createDroneLabStore` and re-exports the rest. `fly.ts` already has the pure `reduceFly(content, s, action)` (line 75) apart from `createFlyStore` (line 112), so nothing is extracted there: the task only changes its `BenchSummary` import (line 10) to `./workshop`.
- Success metric: `store.test.ts` (188 lines) and `fly.test.ts` (151 lines) pass unchanged.

**Implementation.**
- Existing files: `src/lib/dronelab/store.ts:11-135,248-289`, `fly.ts:29-47,112`, `session.ts:1-37`.
- New file: `src/lib/dronelab/workshop.ts`. Edit: `store.ts`, `fly.ts`.
- The `sync/hydrate` member stays in `DroneLabAction` until T-B13-11 deletes `hydrate` and the case together. Its comment names `src/lib/realtime/store-sync.ts` (store.ts:58); reword it while moving it so the grep of T-B13-34 stays clean.
- `fly.ts` imports `BenchSummary` from `./store` (line 10); change it to `./workshop`. `session.ts` stays untouched until T-B13-11 deletes it.
- Layering: no `@/components` import in `workshop.ts` (today `store.ts:2-3` imports the types `HostCommand` and `LabStore` from components; `workshop.ts` takes over the type-only `HostCommand` import and `store.ts` keeps `LabStore`, so the ratchet count of lib-to-components import lines from T-B2-01 does not grow). `workshop.ts` imports nothing from `./store`; a test reads the source and fails on `from "./store"`.
- Edge cases: `reduce` returns `{state, send}`; `send` stays.

**Verification.**
- Unit: `workshop.test.ts` (reducer-only cases copied from `store.test.ts`, plus one `sync/hydrate` case and the no-import-from-store assertion); the type-equality assertion; existing tests unchanged.
- Acceptance. Given the repo, When `V src/lib/dronelab` runs, Then all pass; zero importer edits.
- Release blockers: any importer edit; a circular import.

**Delivery.**
- Verify: `TL`; `V src/lib/dronelab src/lib/flight`.
- Rollback: revert.
- Later tasks need: `@/lib/dronelab/workshop` (T-B13-20, 22, 29, 36, 37, 11) and `reduceFly`.

---

### T-B13-18 `LabSession` runtime and the figure link

**Identity.** T-B13-18; LABS runtime; B13; must; depends on T-B13-16; not started.

**Intent.**
- Problem: three `createXStore` functions each rebuild subscribe, dispatch and effect hand-off, and the figure-command switch is written twice (`BenchWorkspace.tsx:122-129` and `DroneWorkspace.tsx` `sendTo`). Studio needs one runtime that no room can patch.
- User story: as the Studio lab author I want one small session type.
- Expected behaviour: `createLabSession` per section 4.5. `sendToFigure(figure, command)` does what the two switches do. Effects raised before a handler connects are queued (cap 64, oldest dropped, like `LabRoom`'s `waiting`) and delivered in order on connect.
- Success metric: 100 percent line coverage of the two files by their tests.

**Implementation.**
- Existing files read: `src/lib/robotics/store.ts:303-337` (the model for `subscribe`/`connect`), `src/components/robotics/BenchWorkspace.tsx:119-135`, `src/components/figure/protocol.ts:97-125` (`HostCommand`, `FigureHandle.send`).
- New files: `src/components/studio/lab/session.ts` (section 4.5), `src/components/studio/lab/figure-link.ts`.
```ts
// FigureCommand is the type moved to src/lib/robotics/session.ts by T-B13-16 (BridgeCommand plus flash); HostCommand is src/components/figure/protocol.ts:96. Both imported, neither redefined.
// DroneWorkspace.tsx:36 sendTo takes HostCommand and handles only set and press; BenchWorkspace.tsx:122-129 handles set, press, act and flash. One shared switch handles all four and keeps today's behaviour of ignoring the rest.
export function sendToFigure(figure: FigureHandle | null, command: FigureCommand | HostCommand): boolean; // false when figure is null; a command it does not know is ignored, as DroneWorkspace.tsx:36 does today
```
- State: `getState` returns the same reference until a reducer step changes it (React `useSyncExternalStore` needs that). A listener removed during a notify is not called.
- Validation: `dispatch` of an action whose reducer returns the same state reference raises no notify.
- Edge cases: `connect` twice replaces the first handler (one handler at a time); the returned disconnect of an old handle does nothing after replacement.

**Verification.**
- Unit: `session.test.ts` (reference stability, order of effects, queue cap 64, disconnect, listener removal during notify); `figure-link.test.ts` (each command type maps to the right `figure.send` call, null figure returns false).
- Acceptance. Given a session with a reducer that emits one effect, When two actions are dispatched before `connect`, Then the handler receives both in order on connect.
- Release blockers: a notify when state is unchanged.

**Delivery.**
- Verify: `TL`; `V src/components/studio/lab`.
- Rollback: revert.
- Later tasks need: T-B13-04, 08, 21 (import `sendToFigure`).

---

### T-B13-01 Bench converter: steps, faults, modes, status, current

**Identity.** T-B13-01; LABS converter; B13; must; depends on T-B13-00 (and T-B2-19, T-B2-20, T-B10-25 from earlier phases); not started.

**Intent.**
- Problem: T-B2-20 produces a first bench project and a loss report. B13 needs the whole bench in the document: 272 steps with their done conditions, 106 faults as `Fault` instances, 53 modes as sources, status fields, the current model, the power button, the 31 task links. T-B2-20 differs from this plan in four ways (finding F1); this task replaces its domain-data parts.
- Target user: Amar opening a bench; the generator (T-B13-15).
- User story: as a learner I want every step, fault and program of the old bench to be in the project.
- Expected behaviour: B2's `convertBench(item, texts, bench: FigureBench, ctx): ConvertResult` stays the entry point and returns a `Project` per section 4.2. Its body now calls `convertSteps` and `convertBenchSim` and no longer writes `domains.robotics.data` (finding F2, RC-41). Every old value is recoverable (the round trip of T-B13-00 is a test).
- Success metric: 13 of 13 benches valid against `project.schema.json`; round trip equal; 106 faults; 272 assembly steps; 66 quizzes; 53 modes.

**Implementation.**
- Step 0. Read `src/project/convert/bench.ts` as T-B2-20 left it and list in the commit body how it differs from this task on: (a) the entry signature, (b) bench power, modes and fault rules in `domains.robotics.data`, (c) the id scheme (none given), (d) `convertPracticeTask` (kept as it is). This task replaces (b) with the `ext["x-iynk-bench"]` form and edits any B2 test that asserts the old form in the same commit. `ctx` gains the optional fields `causeOf: CauseOf` and `projectId`.
- Existing files: `src/content/schema.ts:243-254` (`FailureMode`), `:256-279` (`BuildStep`), `:463-476` (`QuizQuestion`, `Quiz`), `:479-488` (`BenchMode`), `:489-502` (`StatusField`, `CurrentModel`), `:504-520` (`PracticeTask`), `:521-548` (`RoboticsContent`); `src/lib/robotics/text.ts` (`resolveBenchTexts`, `renderCode`); B2 `src/project/convert/bench.ts` (edit), `text.ts`, `types.ts`; B10 `src/content/faults/legacy-map.ts` (`legacyCause`, T-B10-25; it sits in `content` so UI may import it). `src/project` never imports it: the script passes it in.
- New files: `src/project/convert/bench-steps.ts`, `src/project/convert/bench-sim.ts`. Edit: `src/project/convert/bench.ts` (call the two, merge into the result).
- Modules:
```ts
export type CauseOf = (f: FailureMode) => { cause_id: string; symptom_ids: string[] };
export function convertSteps(c: RoboticsContent, text: TextOf): { assembly: Record<string, unknown>[]; quizzes: GuideQuiz[] };
export function convertBenchSim(c: RoboticsContent, text: TextOf, causeOf: CauseOf): { faults: Fault[]; sources: Source[]; ext: BenchExt };
export type BenchExt = {
  defaultMode: string;
  modes: { id: string; instant: boolean; bytes: number; serial: string[]; title: Text; source: string; language: Source["language"]; libraries: string[] }[];
  status: { id: string; key: string; format: StatusField["format"]; label: Text }[];
  current: { supplies: { id: string; volts: number; limitMa: number; label: Text }[];
             loads: { id: string; supply: string; ma: number; when: StateCond; perUnit?: { key: string; maPerUnit: number }; label: Text }[] };
  power: { source: string; label: Text; ok: Text };
  faultText: Record<string, { title: Text; symptom: Text; explanation: Text; fix: Text }>;
  concept: boolean;      // true only for pi5-ros2 (R-146)
  tasks: string[];       // task project ids
  unplaced: string[];    // figure part ids with no descriptor
  figureParts: { id: string; short: string; role: string; name: Text; what: Text }[];   // FigureRef.parts
};
```
- `causeOf` is injected so `src/project` imports nothing from `src/sim` or `src/content/faults` (SYSTEM 5.3). The script passes `legacyCause` from `src/content/faults/legacy-map.ts`.
- Algorithm: assembly objects are the `BuildStep` fields (`id, kind, action, done, fault, major, title, body, refusal`: 9 keys, under the 16-key cap), `title` and `body` resolved to `Text`. Quizzes keep `afterStep` as the step id; a `null` `afterStep` is written as no key (the schema's `afterStep` is a `LocalId`), and the reverse mapping restores `null`. All 13 benches have exactly one such quiz (ids `end`, `q-end`, `final`), so the test asserts 13 quizzes without `afterStep`. Quiz questions keep `{id, q, options, answer, why}` as Texts. `Fault.kind` is the `FailureKind` (13 values, all in the project enum); `symptom_ids` may be empty only if `legacyCause` returns none; `note` is the fault title. Sources: `{id: "src_<bench>-<mode id>", path: "<mode id>.<ext>", language: mode.language, role: "firmware", board: "brd_main", content: <rendered text>}` per section 4.2; `BenchExt.modes[]` also keeps `language` and `libraries` (`BenchMode.code.libraries`) so the round trip is equal. `RoboticsContent.figure` goes to `guide.legacyFigure: {page, sheets}` and `ext["x-iynk-bench"].figureParts`.
- State, API: none.
- Validation: every `step.fault` names an existing fault id; every quiz `afterStep` names an existing step; every `StatusField.key` is a string; a mode's `code.source` renders without an unresolved `{{t:...}}`; `path` is unique ignoring case within the bench.
- Error conditions: an unresolved text key is a loss row `text-missing` and the build of that bench fails in the script (the old page hides such a bench, `src/lib/robotics/load.ts:30-33`).
- Edge cases: `board: null` benches have no `boards[]` and their sources carry no `board`; `pi5-ros2` sets `concept: true`; `esp32-s3-build` has no netlist (`board` set, nets empty).
- Permissions, performance: default; under 50 ms per bench (ESTIMATED).

**Verification.**
- Unit tests: `bench-steps.test.ts` (counts per bench against the baseline: 272 total; `afterStep` present or absent; key count under 16); `bench-sim.test.ts` (106 faults; ids unique; `params.legacy`; modes become sources with the schema's five required keys; `faultText` has four Texts each; Pi 5 only has `concept`); `bench.lab.test.ts` (13 of 13 validate with `validate.mjs` from T-B2-04; round trip with T-B13-00's reverse mapping copied as a test helper, comparing `language`, `libraries` and `afterStep: null`; a legacy fault is skipped by the netlist applier of T-B10-15, finding F12). The assertion that `BenchExt` is assignable to `BenchExtView` of T-B13-19 is not here (T-B13-19 is in the same group); it is in `useBench.test.tsx` of T-B13-04.
- Integration: runs through the real content for all 13.
- Playwright: none.
- Fixtures: the 13 loaded benches (via `scripts/gen-content-index.mjs` loading), no hand fixtures.
- Acceptance. Given the 13 benches, When converted, Then each validates and equals the original after reverse mapping. Given `flt_short-5v` style ids, Then no two collide.
- Observability: a loss report row per skipped or unplaced item, printed by the script.
- Release blockers: one bench that does not validate; a netlist applier that acts on a legacy fault; a `domains.robotics` key left in any output.

**Delivery.**
- Done when committed with the tests.
- Verify: `TL`; `PORTABLE`; `V src/project/convert`.
- Rollback: revert.
- Later tasks need: the `BenchExt` type (T-B13-04), `convertBench` (T-B13-15).

---

### T-B13-05 Craft converter: guide, design picks, legacy-craft domain

**Identity.** T-B13-05; LABS converter; B13; must; depends on T-B13-00 (and T-B2-20, T-B2-19); not started.

**Intent.**
- Problem: B2's craft output is a first cut. B13 needs the three design picks as parameters, the build steps and quizzes in the guide, and the drone domain in the `legacy-craft` form of section 4.3. T-B2-20 puts the full craft content in `domains.drone.data` (finding F3 says the schema's `legacy-craft` kind holds a pointer only); this task replaces that.
- User story: as a pilot I want my design (battery, motor, prop) saved with the project.
- Expected behaviour: B2's `convertCraft(item, texts, ctx)` stays the entry point and returns a `Project` per section 4.3. `ctx.fixtureSources` carries the T-B13-14 entries.
- Success metric: 13 of 13 valid; round trip equal; `legacy.contentId` resolves for 13 of 13.

**Implementation.**
- Step 0. Read `src/project/convert/craft.ts` as T-B2-20 left it and list in the commit body: (a) the entry signature, (b) `domains.drone.data` holding frame, parts, tests and courses (replaced here by the pointer form; any B2 test that expects it is edited in the same commit), (c) the id scheme (section 4.1).
- Existing files: `src/content/schema.ts:573-585` (`DroneDesign`: `batts`, `motors`, `props` with literal `label`s, `default`), `:592-640` (`DronePart`, `DroneBuildStep`, `DroneWire`, `DroneTest`), `:792-815` (`DroneContent`); `src/lib/drone/design.ts` (`isDesignPick`); B2 `src/project/convert/craft.ts` (edit).
- New files: `src/project/convert/craft-guide.ts`, `src/project/convert/craft-domain.ts`. Edit: `craft.ts`.
```ts
export function craftParameters(design: DroneDesign): Parameter[];                    // par_batt, par_motor, par_prop
export function craftGuide(c: DroneContent, text: TextOf): { guide: Guide; ext: Record<string, unknown> };
export function craftDomain(c: DroneContent): { schemaVersion: "1.0"; data: DroneDomainData };
export function craftThirdParty(sources: readonly FixtureSource[]): ThirdPartyItem[];  // a straight mapping of T-B13-14's sources.json
```
- Algorithm: option labels are the catalogue's literal `label` strings (not translated, as today: "Keys as the originals; `label` is the literal dropdown text", `schema.ts:568-572`); `value` is the key (`6s1100`). `course.builtin` is `courses[0].id`. `environment` is the example's defaults. `craftThirdParty` maps each sidecar entry to `{id, kind: "calculator-fixture", what: <note>, source: entry.source, review: entry.review}` with no translation: the sidecar already uses the schema's `review` words (`unchecked`, `cleared`, `rewritten`, `not-needed`) and carries the required `source.title`.
- Validation: the default pick is one of the options for each of the three parameters; `contentId` is in `DRONE_IDS`; every `thirdParty` item has `source.title`.
- Edge cases: `wing` has one motor and `octo` eight; neither matters because `motors` is absent for `legacy-craft`. `swarm` (nano swarm) has class `nano-swarm`; it is stored unchanged in `ext["x-iynk-legacy"]`.
- Permissions, performance: default.

**Verification.**
- Unit tests: `craft-guide.test.ts` (parameters per craft: batts, motors, props option counts equal the catalogue; assembly counts total 173; quizzes total 49); `craft-domain.test.ts` (validates against `drone.domain.schema.json`; `thrustSource` is `legacy-calc`); `craft.lab.test.ts` (13 of 13 validate; round trip; third-party rows present and valid for any `review` value of the enum).
- Acceptance. Given the 13 crafts, When converted, Then each validates, has exactly three parameters, and `domains.drone.data.legacy.contentId` equals the craft id.
- Release blockers: a craft whose default pick is not among the options; a full `DroneContent` left in `domains.drone.data`.

**Delivery.**
- Verify: `TL`; `PORTABLE`; `V src/project/convert`.
- Rollback: revert.
- Later tasks need: `craftParameters` shape (T-B13-20), `convertCraft` (T-B13-15).

---

### T-B13-19 Bench operations and selectors

**Identity.** T-B13-19; LABS studio; B13; must; depends on T-B13-16; not started. It declares the shape `BenchExtView` itself (the part of `ext["x-iynk-bench"]` it reads) because `src/studio` may not import `src/project/convert`. T-B13-01 is in the same group, so the assertion that its `BenchExt` is assignable to `BenchExtView` is in `useBench.test.tsx` of T-B13-04 (group 3, after both).

**Intent.**
- Problem: faults must be document operations (`fault.set`), undoable and shared; reading them back must not touch legacy code.
- User story: as a builder I want Trigger and Repair on a bench fault to be one undo step.
- Expected behaviour: pure functions that build op batches from an action and read bench data from a `Project`.
- Success metric: 100 percent of the doc-bound actions of section 4.4 covered.

**Implementation.**
- Existing files read: `src/project/apply/sim.ts` (`fault.set`, T-B2-07), `src/project/generated/types.ts` (`Operation`, `Fault`), FE 6.6.
- New files: `src/studio/lab/bench-ops.ts`, `src/studio/lab/bench-select.ts`. (Imports `core`, `project` only.)
```ts
export function faultTriggerOps(project: Project, faultId: string): Operation[];            // fault.set enabled true on flt_<id>
export function faultClearOps(project: Project): Operation[];                              // fault.set enabled false on every enabled legacy fault
export function activeFaultIds(project: Project): string[];                                // content ids, document order
export function benchFaults(project: Project): { id: string; kind: Fault["kind"]; figure: unknown; enabled: boolean }[];
export function benchExt(project: Project): BenchExtView | null;                           // ext["x-iynk-bench"], validated shape
export function isConceptBench(project: Project): boolean;                                 // R-146
```
- Algorithm: trigger on an already enabled fault returns no ops; clear with none enabled returns no ops. Only one fault is active at a time in the old UI (`fault/trigger` replaced the figure's `fault` key); to keep that, `faultTriggerOps` first disables any other enabled legacy fault in the same batch (one batch, one undo step).
- Validation: unknown fault id returns `[]` and the caller shows nothing; `benchExt` returns null on a shape mismatch.
- Edge cases: faults created by the person (no `params.legacy`) are never touched by `faultClearOps`.
- Performance: pure, linear in fault count (at most 13 per bench).

**Verification.**
- Unit tests: `bench-ops.test.ts` (apply the ops with the real `apply` from T-B2: enabled flags; undo restores the hash; one fault active at a time); `bench-select.test.ts` (8 faults, none active; after trigger one active). Both tests build their fixture from a hand-written minimal `Project`: a copy of `04_ARCHITECTURE/schemas/examples/uno-blink-d12.project.json` with `meta.kind: "bench"`, eight literal `simulation.faults` (`params: {legacy: true, figure: {...}}`) and a literal `ext["x-iynk-bench"]`. They do not call the converter, so this task stays parallel to T-B13-01.
- Acceptance. Given a converted bench, When `faultTriggerOps` for `short-5v` is applied and then undone, Then `stateHash` returns to its first value.
- Release blockers: an op batch of more than one undo step for one click.

**Delivery.**
- Verify: `TL`; `PORTABLE`; `V src/studio/lab`.
- Rollback: revert.
- Later tasks need: T-B13-04 calls these.

---

### T-B13-20 Craft operations and selectors

**Identity.** T-B13-20; LABS studio; B13; must; depends on T-B13-17; not started.

**Intent.**
- Problem: the design picks must be `param.set` ops so they persist and rooms share them.
- Expected behaviour: pure functions as in T-B13-19, for `par_batt`, `par_motor`, `par_prop`.
- Success metric: pick, undo and redo restore the hash.

**Implementation.**
- Existing files read: `src/project/apply/misc.ts` (`param.set`, T-B2-07); `src/lib/dronelab/workshop.ts` (`DesignKey = keyof DesignPick`, from T-B13-17).
- New files: `src/studio/lab/craft-ops.ts`, `src/studio/lab/craft-select.ts`.
```ts
export function pickOps(project: Project, key: "batt" | "motor" | "prop", value: string): Operation[];
export function currentPick(project: Project): { batt: string; motor: string; prop: string } | null;
export function craftContentId(project: Project): string | null;      // domains.drone.data.legacy.contentId
export function isLegacyCraft(project: Project): boolean;
```
- Validation: a value that is not among the parameter's `options` returns `[]`.
- Edge cases: a project with a missing parameter returns null from `currentPick`, and the panel shows the not-found state.

**Verification.**
- Unit tests: `craft-ops.test.ts` (apply, undo, redo, reject unknown value); `craft-select.test.ts` (a hand-written minimal `Project`, a copy of `schemas/examples/drone-quad.project.json` with literal `par_batt`, `par_motor`, `par_prop` parameters, gives its default pick; a project with a parameter missing gives null). Neither test calls the converter, so this task stays parallel to T-B13-05.
- Acceptance. Given quad5, When `pickOps` sets `batt` to another key, Then `currentPick` shows it and undo restores the first hash.

**Delivery.**
- Verify: `TL`; `PORTABLE`; `V src/studio/lab`.
- Rollback: revert.
- Later tasks need: T-B13-08.

---

### T-B13-21 Extract `BenchView` from `BenchWorkspace`

**Identity.** T-B13-21; LABS UI refactor; B13; must; depends on T-B13-16; not started.

**Intent.**
- Problem: `BenchWorkspace.tsx` (565 lines) is the page, its store, its effects and its layout in one component (`createBenchStore` at line 168, `useEffects` at 119-155, `<LabDock>` at 354). Studio needs the layout without the store and the page chrome.
- User story: as the Studio author I want to reuse the bench screen as a component.
- Expected behaviour: `BenchView` renders everything the page renders inside the workspace frame except the dock and the room: tabs (steps, faults, status, tasks, quiz, serial), figure frame, live strip, notices, shortcuts (`?`, `s`, arrows). It takes its state and a `dispatch` as props. `BenchWorkspace` becomes `BenchView` plus the old store and `LabDock`, so the old page keeps working.
- Success metric: `BenchWorkspace.test.tsx` and `robotics.spec.ts` pass unchanged.

**Implementation.**
- Existing files: `src/components/robotics/BenchWorkspace.tsx:24` (store imports), `:119-155` (`useEffects`), `:168-169` (store creation), `:196` (effects use), `:249-290` (shortcuts), `:354` (`LabDock`).
- New file: `src/components/robotics/BenchView.tsx`. Edit: `BenchWorkspace.tsx`.
```ts
export type BenchViewProps = {
  setup: BenchSetup;
  messages: BenchMessages;
  state: BenchState;
  dispatch: (action: BenchAction) => void;
  active: readonly FailureMode[];            // from the document in Studio, from the figure state on the old page
  figure: FigureHandle | null;
  onFigure: (event: FigureEvent) => void;    // FigureFrame events go back to the controller
  savedDone: (key: string) => boolean;
  best: (quizId: string) => QuizResult | undefined;
  toolbar?: ReactNode;                        // the dock button on the old page; Studio's own in Studio
  notice?: ReactNode; walk?: ReactNode;
};
export function BenchView(props: BenchViewProps): JSX.Element;
```
- Algorithm: move, do not rewrite. Keep every `data-*` attribute the e2e specs read (`data-step`, `data-quiz`, `data-quiz-score`, `data-serial`, `[data-failure]`).
- Edge cases: `LabDock` is not rendered by `BenchView`; the shortcut `?` dialog is.
- Validation: none new.

**Verification.**
- Unit: `BenchWorkspace.test.tsx` (existing, 162 lines) unchanged; new `BenchView.test.tsx` renders with a fixed state and asserts the six tabs and the `?` dialog.
- Playwright: `E e2e/robotics.spec.ts` unchanged.
- Acceptance. Given the L298N bench state with one fault active, When `BenchView` renders, Then the Break it tab marks that fault and offers Repair.
- Release blockers: any e2e selector lost.

**Delivery.**
- Verify: `TL`; `V src/components/robotics`; `E e2e/robotics.spec.ts`.
- Rollback: revert.
- Later tasks need: T-B13-04 renders `BenchView`; T-B13-38 deletes `BenchWorkspace`.

---

### T-B13-22 Extract `CraftView` and `FlyView`

**Identity.** T-B13-22; LABS UI refactor; B13; must; depends on T-B13-17; not started.

**Intent.**
- Problem: `DroneWorkspace.tsx` (425 lines; store at line 63, figure connect at 83, `useRoom` at 22 and 60, links at 388, `LabDock` at 403) and `FlyWorkspace.tsx` (409 lines; `createFlyStore` at 62, `useRoom`/`withRoom` at 31 and 58, `LabDock` at 245) bind to the room, the dock and the stores.
- Expected behaviour: `CraftView` and `FlyView` take state and `dispatch` as props; no `useRoom`, no `withRoom`, no `useRoomGhosts`. The old workspaces wrap them with the old stores until T-B13-38. The fly view keeps `FlightRange`, `BreakIt`, `DailyChallengeCard`, the buddies board slot from T-B7-17 (`BuddyBoard.tsx`, which T-B7-17 mounts inside `FlyWorkspace.tsx`; Step 0 re-reads that file and moves the element into the `board` prop node) and the medals.
- Success metric: `dronelab.spec.ts` and `fly.spec.ts` pass unchanged on the old pages; no import of `@/lib/realtime` remains in the two new files.

**Implementation.**
- Existing files: `src/components/dronelab/DroneWorkspace.tsx:19-23,60-95,383-405`, `FlyWorkspace.tsx:24,31,58-93,225,245`; `src/components/flight/room-ghosts.ts` (not imported any more by the view; `FlightRange`'s `peers` prop gets `[]` until deletion).
- New files: `src/components/dronelab/CraftView.tsx`, `FlyView.tsx`. Edit: `DroneWorkspace.tsx`, `FlyWorkspace.tsx`.
```ts
export type CraftViewProps = { lang: Locale; content: DroneContent; text: ContentT; messages: DroneLabMessages; state: DroneLabState;
  dispatch: (action: DroneLabAction) => void; figure: FigureHandle | null; onFigure: (e: FigureEvent) => void; flyHref: string; toolbar?: ReactNode; notice?: ReactNode };
export type FlyViewProps = { lang: Locale; content: DroneContent; messages: DroneLabMessages; flightMessages: Messages["flight"]; state: FlyState;
  dispatch: (action: FlyAction) => void; pool: ChallengeEntry[]; backHref: string; board?: ReactNode; toolbar?: ReactNode; notice?: ReactNode };
```
- Algorithm: move, do not rewrite. The `sessionStorage` hand-off (`readBenchSummary`, `writeBenchSummary`) becomes a prop: `FlyViewProps.state.bench`.
- Edge cases: ghosts disappear on the old fly page too (finding F8); the own-best ghost stays.

**Verification.**
- Unit: `DesignPanel.test.tsx` (existing) unchanged; new `CraftView.test.tsx`, `FlyView.test.tsx` render with fixed state and assert the tabs and the arming list.
- Playwright: `E e2e/dronelab.spec.ts e2e/fly.spec.ts e2e/fly-fun.spec.ts` on the old routes.
- Acceptance. Given quad5 and the factory build, When `FlyView` renders, Then the arming rules list shows and the course picker lists 2 courses.
- Playwright edit in this task: `e2e/fly-fun.spec.ts:34-75` ("a friend's craft flies a lap beside you as a ghost") needs the old room and the Together tab, and `FlyView` shows no friend ghosts (finding F8). The test is rewritten here to fly two laps and see the own-best ghost (`flight.ghosts` labels), on the old `/en/drones/quad5/fly` page, so no commit is red. `dockCopy` and `openDock` imports go with it.
- Release blockers: a red `fly-fun.spec.ts`; any friend-ghost code left in `FlyView`.

**Delivery.**
- Verify: `TL`; `V src/components/dronelab src/components/flight`; `E e2e/dronelab.spec.ts e2e/fly.spec.ts e2e/fly-fun.spec.ts`.
- Rollback: revert.
- Later tasks need: T-B13-08 renders both views; T-B13-38 deletes the two workspaces.

---

### T-B13-25 Lab progress on the learner record (F-151, R-143)

**Identity.** T-B13-25; LABS local; B13; must; depends on T-B12-04 (learner record and store) and T-B12-08 (import and facade); not started.

**Intent.**
- Problem: F-151 asks for a local record of what was completed, stamped with the tier, replacing the Proof of Build wording. Benches and craft write progress under old keys (`robotics:<bench>:step:<step>`, `robotics:<bench>:task:<task>`, `robotics:<bench>:quiz:<quiz>`, `drone:<id>:build`, `drone:<id>:test:<test>`, `drone:<id>:course:<course>`, `drone:<id>:quiz:<quiz>`, `src/lib/progress/keys.ts:3-14`) that must map onto learner records. B12 already owns the record: T-B12-04 defines `LearnerRecord` and `CompletionRecord` (EDU 11.2) in `src/lib/learn/record.ts` with `withStep`, `withAnswer`, `withCompletion` and `createLearnStore`; T-B12-08 defines `projectIdForKey`, `keyForProject` and `importLegacyProgress` and returns null for robotics and drone keys (its finding F7: "left for B13"). This task does not define a second `CompletionRecord` and does not touch `src/local/progress.ts`.
- Target user: Amar, looking at his own progress.
- User story: as a builder I want a list of benches I finished and craft I flew, saved in this browser only, and the old index pages still showing it.
- Expected behaviour: (1) `facade.ts` maps robotics and drone keys to project ids and back (`projectIdForKey` and `keyForProject` return bench, task and craft ids; a new `labItemForKey(key)` returns the record item). (2) `legacy-import.ts` gains `importLegacyLabProgress`, which imports the robotics and drone `done` keys and the `quiz` entries into records. (3) The facade reads robotics and drone `done` and `quiz` through the learner store once the labs marker exists, so `BenchProgress.tsx`, `CraftProgress.tsx` and the dashboard keep working. (4) `lab-completion.ts` decides completion and writes it through `withCompletion`. Nothing is sent anywhere.
- Success metric: the 272 step keys, 31 task keys, 66 quiz keys of benches and the 173 build, 78 test, 22 course and 49 quiz keys of crafts all map; none maps to two projects.

**Implementation.**
- Existing files: `src/lib/progress/keys.ts:3-34` (read only; `progressKey`, `progressPrefix`), `src/lib/progress/storage.ts` (`STORAGE_KEY` `iynk:v1`, `Saved.quiz: Record<string, {score, total}>`); B12 `src/lib/learn/{record,store,facade,legacy-import}.ts` (Step 0 reads their exact signatures and the marker form `IMPORT_MARKER = 'iynk:v1:imported'`); `src/studio/fidelity/static-tier.ts` (T-B4-15) for the tier label.
- New file: `src/lib/learn/lab-completion.ts`. Edit: `src/lib/learn/facade.ts`, `src/lib/learn/legacy-import.ts`, `src/lib/learn/record.ts`. Tests beside each.
```ts
// record.ts: one optional field next to steps, bounded like them (EDU 11.2 has no place for craft tests and courses)
//   items?: Record<string, { doneAt: string; by: 'gate' | 'manual' }>;   // keys: 'build', 'test:<id>', 'course:<id>', 'task:<id>'; at most 128
//   export const MAX_ITEMS = 128; export function withItem(r: LearnerRecord, key: string, by: 'gate' | 'manual', now: string): LearnerRecord;
// facade.ts: the return type of projectIdForKey widens kind to 'lesson' | 'assembly' | 'bench' | 'task' | 'craft'
export type LabItem = { kind: 'step' | 'task' | 'quiz' | 'build' | 'test' | 'course'; id: string | null };
export function labItemForKey(key: string): { projectId: string; item: LabItem } | null;
// legacy-import.ts
export const LABS_IMPORT_MARKER = 'iynk:v1:imported-labs';
export function importLegacyLabProgress(deps: ImportDeps & { stepIndex(projectId: string, stepId: string): number | null }): Promise<ImportReport>;
// lab-completion.ts
export function benchComplete(c: { stepsDone: number; steps: number; quizzesTaken: number; quizzes: number }): boolean;
export function craftComplete(c: { built: boolean; testsPassed: number; tests: number; courses: number }): boolean;
export function completeLab(store: LearnStore, projectId: string, kind: 'bench' | 'craft', at: string, tier: Tier): boolean;   // false when the record already has a completion
```
- Algorithm. Keys: `robotics:<b>:step:<s>` maps to `prj_robotics-<b>` and `steps[String(index of s in guide.assembly)]` with `by: 'manual'` (index from `stepIndex`); `robotics:<b>:task:<t>` to the task project `prj_robotics-<b>-<t>`, a record with a legacy completion as T-B12-08 writes for board lessons; `robotics:<b>:quiz:<q>` and `drone:<id>:quiz:<q>` read `Saved.quiz[key]` into `quiz[q] = {answers: {}, correct: score, total}`; `drone:<id>:build`, `:test:<t>`, `:course:<c>` to `prj_drone-<id>` `items['build']`, `items['test:<t>']`, `items['course:<c>']`. The tier is the project's static tier (T0 or T1 per PDM 11.5); `at` is passed in, so no function reads a clock. A bench is complete when every step is done and every quiz is taken; a craft when the build is done, every bench test passed and one course is finished. `completeLab` calls `withCompletion` with `gates` `{checks: null, edit: null, quiz: true, goal: true}` for a bench and `{checks: true, edit: null, quiz: null, goal: true}` for a craft, and writes once.
- The labs import has its own marker because an install that already ran B12's import has `iynk:v1:imported` set, and that run skipped robotics and drone keys. Same safeguards as T-B12-08: idempotent, marker only after read-back, `iynk:v1` never deleted or edited, a key whose project has no template listed in the report. A fork reads as done through `templateId` the way T-B12-08's `boardDone` resolves board forks (Step 0 reads it and does the same).
- Validation: unknown prefix returns null (the import leaves the old key where it is).
- Error conditions: a failed write sets `persistError()` (T-B12-04) and the panel shows nothing new (the old key still holds the data, R3 mitigation in the roadmap).
- Permissions: local only. Migration: the old `iynk:v1` key is not removed (PDM 11.6). `record.ts` is B12's file: the one added field is optional, so every B12 record stays valid (section 10, Q8).

**Verification.**
- Unit tests: `facade.test.ts` additions (round trip over all keys generated from the 26 items; B12's 71 + 12 board cases unchanged); `legacy-import.test.ts` additions (an `iynk:v1` with all 272 bench step keys imports 272 steps under 13 project ids; quiz entries import; the second run imports 0; a prior B12 marker does not stop the labs import; `iynk:v1` unchanged byte for byte); `lab-completion.test.ts` (completion rules; idempotent write); `record.test.ts` additions (`withItem` bound).
- Acceptance. Given an `iynk:v1` blob with all 272 bench step keys, When Studio first opens, Then the learner store holds 272 steps under 13 project ids and `iynk:v1` is unchanged; Then `BenchProgress` on the index page counts the same steps.
- Observability: the import returns counts `{imported, skipped, byPrefix}`.
- Release blockers: a key that maps to two projects; a second `CompletionRecord` type; a lost done flag.

**Delivery.**
- Verify: `TL`; `V src/lib/learn src/lib/progress src/components/robotics src/components/dronelab`.
- Rollback: revert.
- Later tasks need: T-B13-04 and T-B13-08 call `labItemForKey`, `withStep`, `withItem`, `completeLab`.

---

### T-B13-29 AI adapters, sound moments and `RealBuildPanel` off the store types

**Identity.** T-B13-29; LABS cleanup; B13; must; depends on T-B13-16, T-B13-17; not started.

**Intent.**
- Problem: five files import types from the stores that T-B13-11 deletes: `src/lib/ai/bench/robotics.ts:6`, `src/lib/ai/bench/drone.ts`, `src/lib/sound/bench-moments.ts`, `src/lib/sound/moments.ts`, `src/components/search/RealBuildPanel.tsx`.
- Expected behaviour: only import paths change. B14 rewrites the partner on the context builder; until then the adapters read the same state shapes.
- Success metric: zero imports of `@/lib/robotics/store` or `@/lib/dronelab/store` in these five.

**Implementation.**
- Existing files: the five above; tests `src/lib/ai/bench-labs.test.ts`, `src/lib/sound/moments.test.ts` (their imports change too).
- Change: `@/lib/robotics/store` to `@/lib/robotics/session`; `@/lib/dronelab/store` to `@/lib/dronelab/workshop`. `createXStore` imports in the two tests change to the session reducer or are replaced by plain state literals.
- Edge cases: none; type-only.

**Verification.**
- Unit: `V src/lib/ai src/lib/sound src/components/search`.
- Acceptance. Given a grep of the five files, Then no store path remains.
- Release blockers: a behaviour change in a test expectation.

**Delivery.**
- Verify: `TL`; `V src/lib/ai src/lib/sound src/components/search`.
- Rollback: revert.
- Later tasks need: T-B13-11 (the grep that proves the stores have no importer).

---

### T-B13-30 Robotics panels A import session types

**Identity.** T-B13-30; LABS cleanup; B13; must; depends on T-B13-16; not started.

**Intent.** Mechanical. `FaultsPanel.tsx:5`, `ModesPanel.tsx:7`, `QuizPanel.tsx:11`, `SerialPanel.tsx:6` import types from `@/lib/robotics/store`. Change to `@/lib/robotics/session`. `FaultsPanel` keeps the `onExplain` prop that T-B10-25 added.

**Implementation.** Edit the four files, imports only. Edge cases: none. Validation: none.

**Verification.** Unit: `V src/components/robotics`. Acceptance: Given a grep, Then these four files import nothing from the store. Release blockers: any change other than the import lines.

**Delivery.** Verify: `TL`; `V src/components/robotics`. Rollback: revert. Later tasks need: T-B13-11.

---

### T-B13-31 Robotics panels B import session types

**Identity.** T-B13-31; LABS cleanup; B13; must; depends on T-B13-16; not started.

**Intent.** Mechanical. `StepsPanel.tsx:10`, `TasksPanel.tsx:10`, `messages.ts:8` (also `useBenchState(store: BenchStore)` at the end of `messages.ts`).

**Implementation.** Edit the three files. In `messages.ts` the `BenchStore` type stays imported from `./store` through T-B13-38 and is removed with the hook `useBenchState` by T-B13-11, because only `BenchWorkspace` uses it. Imports of `BenchAction`, `TaskSession`, `BenchState` change to `session`.

**Verification.** `V src/components/robotics`; grep as above.

**Delivery.** Verify: `TL`; `V src/components/robotics`. Rollback: revert. Later tasks need: T-B13-11.

---

### T-B13-36 Drone panels A import workshop types

**Identity.** T-B13-36; LABS cleanup; B13; must; depends on T-B13-17; not started.

**Intent.** Mechanical. `BuildPanel.tsx`, `CliConsole.tsx`, `DesignPanel.tsx` import types from `@/lib/dronelab/store`. Change to `@/lib/dronelab/workshop`.

**Implementation.** Edit the three files, imports only.

**Verification.** `V src/components/dronelab` (includes `DesignPanel.test.tsx`).

**Delivery.** Verify: `TL`; `V src/components/dronelab`. Rollback: revert. Later tasks need: T-B13-11.

---

### T-B13-37 Drone panels B import workshop types

**Identity.** T-B13-37; LABS cleanup; B13; must; depends on T-B13-17; not started.

**Intent.** Mechanical. `QuizPanel.tsx`, `TestsPanel.tsx`, `WiringPanel.tsx` in `src/components/dronelab/` import types from the store. Change as in T-B13-36.

**Verification.** `V src/components/dronelab`.

**Delivery.** Verify: `TL`; `V src/components/dronelab`. Rollback: revert. Later tasks need: T-B13-11.

---

### T-B13-32 Non-lab consumers leave the v1 room client

**Identity.** T-B13-32; REALTIME cleanup; B13; must; depends on none; not started.

**Intent.**
- Problem: four source files outside the lab pages use the v1 client that T-B13-34 deletes: `src/lib/sound/react.ts:7,78` (`isHydrating`), `src/components/ai/PartnerPanel.tsx` (`useRoom`, `useTogether`, the peers tool, `together.start()`), `src/components/flight/DailyChallenge.tsx:9,49` (`useIdentity`), `src/lib/server/mcp/tools/together.ts:4-5,74` (room links from `config` and constants from `protocol`). T-B0-13 deletes `StoryCard.tsx`, `useBuildLog.ts`, `session-log.ts` and `story-png.ts` and edits `PartnerPanel.tsx` (`tasks/B0-foundation-green-safe.md` lines 172 and 199), so none of them is in this task, and the `PartnerPanel.tsx` line numbers (24, 96-174) will have moved: locate the code by symbol (`useRoom`, `useTogether`), not by line. `src/lib/sound/react.test.tsx:5-6` imports `RoomClient` from `@/lib/realtime/room` and `attachStore` from `@/lib/realtime/store-sync`; it belongs to this task.
- Expected behaviour: each file loses its room reads and keeps working without a room. The `isHydrating` guard in `react.ts` is removed (there is no hydrate), and the `react.test.tsx` case that builds a `RoomClient` and calls `attachStore` (around lines 95-110) is deleted with its two imports. The partner's `peers` tool returns an empty list and the room-linked branch is removed; B14 rewrites the panel. `DailyChallenge` takes the pilot name from the new identity store if B6 provides one (`src/server-client/profile.ts`), else from its existing local name. The MCP `together` tool is removed from its registry with a note (the relay it links to is gone); its registry test is updated.
- Success metric: zero imports of `@/lib/realtime` in these files and in `react.test.tsx`.

**Implementation.**
- Existing files: as above. Edit four source files: `src/lib/sound/react.ts`, `src/components/ai/PartnerPanel.tsx`, `src/components/flight/DailyChallenge.tsx`, `src/lib/server/mcp/tools/together.ts`; tests `src/lib/sound/react.test.tsx`, `PartnerPanel.test.tsx`, the mcp tool-list test.
- Edge cases: the AI tool schema in `src/lib/ai/tools.ts` names `peers`/`ask_peer`; this task keeps their schema (B14 owns it) and returns "no room" results.
- Validation: `V src/components/ai src/lib/sound src/lib/server/mcp`.
- Performance, permissions: default.

**Verification.**
- Unit: `PartnerPanel.test.tsx` (existing; `FULL` features object at line 68 has `realtime: false`), `src/lib/sound/react.test.tsx`, the mcp tool-list test; each edited to the new reality.
- Acceptance. Given a grep, Then none of the four files and `react.test.tsx` imports `@/lib/realtime`. Given the partner panel with no room, Then it renders and answers a prompt with the existing fake provider.
- Release blockers: the partner panel failing to render.

**Delivery.**
- Verify: `TL`; `V src/components/ai src/lib/sound src/lib/server/mcp src/components/flight`.
- Rollback: revert.
- Later tasks need: T-B13-34 (the grep that proves the layer has no importer).

---

### T-B13-15 Lab generation script, drift check, set checks

**Identity.** T-B13-15; LABS tooling; B13; must; depends on T-B13-01, T-B13-05; not started.

**Intent.**
- Problem: the project files are generated from `src/content` (still the source, finding in section 4) and committed. Without a check they drift.
- Target user: every later task; Amar when he edits a bench.
- User story: as a maintainer I want one command that rewrites the lab projects and one that says if they are stale.
- Expected behaviour: `node scripts/convert-labs.mjs --write [--set robotics-a|robotics-b|drones-a|drones-b]` converts and writes `content/projects/<lab>/<set>/*.project.json` and each set's `index.ts`; `--check` converts in memory and exits 1 naming every file whose bytes differ. `npm run labs:check` runs `--check` and is appended to `npm run check`.
- Success metric: `--check` is clean after `--write`; clean again on a second run (no clock, no random).

**Implementation.**
- Existing files: `package.json:23` (the `check` script), `scripts/gen-content-index.mjs:126-129` (how Node loads `.ts` content), `scripts/convert-io.mjs` and `scripts/convert-catalogue.mjs` (T-B2-14, T-B2-20: reuse the file reading), `src/content/faults/legacy-map.ts` (T-B10-25; passed as `causeOf`; Step 0 checks that Node can load it, since Node 24 type stripping does not resolve `@/` aliases or extensionless imports, as T-B13-13 explains; if it cannot, stop and report, the fallback is a vitest-run generator in the style of T-B13-13), `content/projects/index.ts` (T-B12-09, hand-written; read its `TemplateEntry`, `TEMPLATES`, `loadTemplate`), `src/project/convert/{bench,craft,index}.ts` (T-B2-20 with T-B13-01 and T-B13-05 applied).
- New files: `scripts/convert-labs.mjs`, `src/content/labs/check-set.ts`, and the four empty set indexes `content/projects/{robotics,drones}/{a,b}/index.ts` (generated files, like the four empty group indexes of T-B12-09). Edit: `package.json` (`labs:check`, and `check` gains `&& npm run labs:check` after `content:check`), `content/projects/index.ts` (add `LabTemplateEntry`, `LAB_TEMPLATES` and the lab case of `loadTemplate`, below).
```ts
// src/content/labs/check-set.ts (test helper, used by the four set tests)
export function checkSet(files: Record<string, unknown>, expect: { benches?: number; tasks?: number; crafts?: number }): void;
//   per file: validates (project.schema.json via generated validator), stateHash is stable, kind matches the folder, third-party row present, license is LicenseRef-iynk-pending
```
- Algorithm: for each set in order, for each item, load content, resolve six-language prose (as `getContentProse` does for `en` and the other five), call B2's `convertBench`, `convertCraft` and `convertPracticeTask` (T-B2-20; the last one makes the `challenge` project for each task, with its hidden solution in `ext['x-iynk-solution']`, which stays in the committed template file and is dropped only when the template is forked, T-B12-09), passing project ids through `ctx.projectId` per section 4.1 (`prj_robotics-<bench>`, `prj_robotics-<bench>-<task>`, `prj_drone-<craft>`) and `causeOf` and `fixtureSources`; write canonical JSON with a trailing newline. Each set's `index.ts` exports `TEMPLATES: readonly LabTemplateEntry[]`, one entry per file, with `load: () => import("./<file>.project.json")`, the way the B12 group indexes export `TEMPLATES`. `LabTemplateEntry` is declared in `content/projects/index.ts` and does not widen B12's `TemplateEntry` (a widened `kind` would break the exhaustive switches and the 71 + 12 count assertions of T-B12-18): `{id, title: Record<string,string>, lab: 'robotics'|'drone', kind: 'bench'|'craft'|'task', bench: string | null, board: string | null, order, stepCount, catalogue: {lab, id, child}, load(): Promise<Project>}`. `LAB_TEMPLATES` concatenates the four set indexes; `TEMPLATES` of B12 is unchanged; `loadTemplate(id)` also finds lab ids.
- Validation: the script fails if a set lists an id not in `ROBOTICS_IDS` or `DRONE_IDS`, or if a set's files do not cover the whole id list when all four are present.
- Error conditions: a bench with an unresolved text key fails the run and names the key (the old page hides such a bench).
- Edge cases: Node 24 strips types; content modules may use erasable syntax only (comment in `gen-content-index.mjs:10-11`). The converter files in `src/project/convert/` import siblings with explicit `.ts` extensions and take content as arguments (type-only imports), as T-B2-20's script already needs; `bench-steps.ts`, `bench-sim.ts`, `craft-guide.ts` and `craft-domain.ts` follow the same rule. Windows paths are not supported.
- Performance: under 60 s for all four sets (ESTIMATED).

**Verification.**
- Unit: `scripts/convert-labs.test.mjs` (a two-item run into a temp dir; `--check` detects a flipped byte; second run identical); `content/projects/index.test.ts` addition (`LAB_TEMPLATES` is empty before group 4 and `TEMPLATES.length` of B12 is unchanged).
- Acceptance. Given empty set folders, When `--write --set robotics-a` runs, Then 6 bench files and 16 task files and an `index.ts` appear; `--check --set robotics-a` exits 0.
- Observability: the script prints one line per file with its size and `stateHash` prefix, and the loss report counts.
- Release blockers: output that differs between two runs.

**Delivery.**
- Done when the script, helper, the lab index and the `check` change are committed. The set folders hold only their empty `index.ts` until group 4.
- Verify: `TL`; `V scripts`; `node scripts/convert-labs.mjs --check` (passes on empty sets).
- Rollback: revert (remove `labs:check` from `check`).
- Later tasks need: T-B13-02, 03, 06, 07 run `--write --set <name>`.

---

### T-B13-04 Robotics bench in Studio: `BenchPanel`

**Identity.** T-B13-04; LABS studio; B13; must; depends on T-B13-18, 19, 21, 25, 30, 31; not started.

**Intent.**
- Problem: R-145: a bench opens as a project with its parts, 106 faults and Repair intact, and its effects (today in a React component, audit A2) move behind the orchestrator. R-146: the Pi 5 bench stays labelled "concept model".
- Target user: Amar.
- User story: as a builder I open L298N from the gallery and everything the old page did works, and Break it is one undo step.
- Expected behaviour: `BenchPanel` takes the project session. `useBench` creates the `LabSession` from `reduceBench` and `initialBenchState`, connects effects (figure sends, progress writes, task runs), routes `fault/trigger` and `fault/clear` to `bench-ops` and commits the ops, and watches the document so any change to a fault's `enabled` (from undo, redo or a buddy) sends the fault's `figure` command (or `{set: {fault: null}}` for none) to the figure. For `isConceptBench(project)` it shows the chip with the text below.
- Success metric: every user action of the old bench page has an equivalent; `E e2e/robotics.spec.ts` passes on the Studio mount (the spec is edited in T-B13-24; the walk is T-B13-33).

**Implementation.**
- Existing files: `src/components/robotics/BenchView.tsx` (T-B13-21), `src/components/robotics/*` panels, `src/lib/robotics/{session,steps,current,quiz,runner,text,catalog}.ts` (`runner.ts:28` `interpRunner`, the task-run seam, unchanged), `src/components/figure/FigureFrame.tsx`, B12's `src/lib/learn/{record,store}.ts` (T-B12-04) and `src/studio/run/{lesson-job,lesson-checks}.ts` (T-B12-07), T-B13-25 (`labItemForKey`, `completeLab`), `src/i18n/messages/en/robotics.json` (add the key).
- New files: `src/components/studio/lab/BenchPanel.tsx`, `src/components/studio/lab/useBench.ts`. Edit: `src/i18n/messages/{en,es,fr,de,zh,hi}/robotics.json` (one set: key `bench.concept`).
```ts
export function useBench(args: { session: ProjectSession; project: Project; content: RoboticsContent; texts: BenchTexts; starters: Record<string,string>; solutions: Record<string,string>; learn: LearnStore }): {
  state: BenchState; dispatch: (a: BenchAction) => void; figure: { ref: (h: FigureHandle | null) => void; onEvent: (e: FigureEvent) => void }; active: FailureMode[];
};
export function BenchPanel(props: { projectId: string; lang: Locale }): JSX.Element;
```
- Algorithm: the document is the source for `active` (never copy fault state into the session, one source of truth). When the figure reports a state that disagrees with the document (a fault the figure shows that the document does not have), the document wins and the link re-sends. A practice task in the Tasks tab runs through the existing `interpRunner` (`src/lib/robotics/runner.ts`) with a `RunRequest` built from the task, as the old page does; its verdict fills `TaskSession.result`. The same task opened from the gallery is a `challenge` project in the ordinary editor and runs through `lessonJobFor` and `runLessonTests` (T-B12-07, kind `'robotics-task'`); T-B13-28 proves the two paths agree. A `done` effect carries the old progress key; `labItemForKey` maps it to a record item, which is written with `withStep` or `withItem` through `learn.update`; when `benchComplete` turns true, `completeLab` is called once.
- The English text of the key `bench.concept` is exactly: `concept model: Python API mock, not a Raspberry Pi OS and not a running ROS 2 graph`. The five other languages are written by the agent and are marked for review (F-172, section 9).
- State transitions: those of `reduceBench` unchanged. Document transitions: ops of T-B13-19.
- Validation: a figure message with a wrong origin or protocol version is ignored by `FigureFrame` (existing); the controller adds nothing.
- Error conditions: ops rejected by `apply` (for example a read-only share, T-B7-28) leave the fault unchanged, and the panel shows the reject reason in the existing live region.
- Permissions: in a room the baton gates `source.*` ops only (T-B7-14 on the server, T-B7-27 in the code dock); `fault.set` is allowed for an editor. A viewer sees the faults and cannot trigger them.
- Performance: the panel loads on demand; first interaction under the existing budget (T-B1-24).
- Migration: none.

**Verification.**
- Unit tests: `useBench.test.tsx` (trigger then undo returns the same document hash and clears the figure fault; a buddy's op enables a fault and the figure gets its command; a done effect writes the learner record once; completion fires once; a type-level assertion that `BenchExt` of T-B13-01 is assignable to `BenchExtView` of T-B13-19, which is why this task depends on both); `BenchPanel.test.tsx` (renders the 6 tabs for L298N; Pi 5 shows the chip with the exact English text; the other 12 do not).
- Integration: `V src/components/studio/lab src/components/robotics`.
- Playwright: covered by T-B13-33.
- Fixtures: the converted L298N and Pi 5 projects built in memory with T-B13-01's converter (hence the dependency on T-B13-01).
- Acceptance. Given L298N open in Studio, When I press Trigger on a fault and then Undo, Then the fault is no longer active and the figure shows no fault. Given the Pi 5 bench, Then the concept chip is visible.
- Observability: none beyond the live region.
- Release blockers: an effect that still lives in a component outside the controller; a document copy of fault state in the session.

**Delivery.**
- Verify: `TL`; `V src/components/studio/lab src/components/robotics src/i18n`.
- Rollback: revert.
- Later tasks need: T-B13-23 mounts `BenchPanel`; T-B13-27 edits it.

---

### T-B13-08 Drone workshop and fly in Studio: `CraftPanel`, `FlyPanel`

**Identity.** T-B13-08; LABS studio; B13; must; depends on T-B13-18, 20, 22, 25, 36, 37; not started.

**Intent.**
- Problem: R-147: each craft opens with design, build and wiring panels, bench safety tests with arming rules and the flight-controller CLI console; the flight range stays (R-174 starts here for the 13 legacy crafts).
- User story: as a pilot I design in the workshop, build on the bench, then press Fly in the same project and my build flies.
- Expected behaviour: `CraftPanel` runs `CraftView` on a `LabSession` made with the adapter `(state, action) => { const r = reduce(content, state, action); return [r.state, r.send.map((command) => ({ kind: "send", command }))]; }` in `useCraft.ts`, because the drone `reduce` returns `{state, send}` and `createLabSession` expects `[S, E[]]`; `design/pick` becomes `pickOps` (document); the figure link re-sends `figureInitial()` on a pick change; bench tests and arming rules are unchanged (`src/lib/dronelab/bench.ts`). `FlyPanel` runs `FlyView` on a `LabSession` made with the adapter `(s, a) => [reduceFly(content, s, a), []]` (`reduceFly` returns a bare `FlyState` and raises no effect), seeded with the workshop's `benchSummary` from the same in-memory session (no `sessionStorage`). The Buddies board (T-B7-17, `BuddyBoard.tsx`) is passed as the `board` slot. `DailyChallenge` and `BreakIt` stay.
- Success metric: the 78 tests, 131 snippets and 22 courses are all reachable; the flight hash of T-B13-13 is unchanged.

**Implementation.**
- Existing files: `CraftView.tsx`, `FlyView.tsx` (T-B13-22), `src/lib/dronelab/{workshop,fly,bench,cli,figure}.ts`, `src/lib/flight/*`, `src/lib/drone/{calc,design}.ts`, `src/components/flight/*`, `src/components/flight/BuddyBoard.tsx` (T-B7-17), `src/i18n/messages/*/dronelab.json`.
- New files: `src/components/studio/lab/CraftPanel.tsx`, `FlyPanel.tsx`, `useCraft.ts`. Edit: `src/i18n/messages/*/dronelab.json` (one set; keys for the Studio switch between Workshop and Fly, if the existing ones do not cover it).
```ts
export function useCraft(args: { session: ProjectSession; project: Project; content: DroneContent; learn: LearnStore }): {
  workshop: { state: DroneLabState; dispatch: (a: DroneLabAction) => void };
  fly: { state: FlyState; dispatch: (a: FlyAction) => void };
  figure: { ref: (h: FigureHandle | null) => void; onEvent: (e: FigureEvent) => void };
};
export function CraftPanel(props: { projectId: string; lang: Locale; view: "workshop" | "fly" }): JSX.Element;
```
- Algorithm: the pick is read from the document (`currentPick`) on every render and compared with the session's `pick`; the document wins. The session keeps `figure`, `sel`, `tab`, `log`, `attempted`, `cli`, `quiz` (runtime). Progress writes go to the learner record of the project (T-B13-25: `labItemForKey`, `withStep`, `withItem`, `completeLab`). The fly view reads `readiness` from `readBench(workshop.figure)` as today (`src/lib/dronelab/figure.ts`).
- Validation: a CLI line is reduced exactly as before (`runCli`, real firmware error text).
- Error conditions: a failed `param.set` (read-only share) leaves the pick; the panel announces the reason.
- Permissions: as T-B13-04.
- Performance: `FlightRange` loads on demand (it is the heaviest part); the fly view must not mount the figure iframe a second time (one iframe per project).
- Migration: none.

**Verification.**
- Unit tests: `useCraft.test.tsx` (the two adapters give `[state, effects]` for a `design/pick` and `[state, []]` for a fly action; a pick is one undoable op and re-sends the design; building on the bench then pressing Fly passes the build into `FlyState.bench`; a breaker flag changes the arming rule); `CraftPanel.test.tsx` (tabs design, build, wiring, tests, cli, quiz present).
- Integration: `V src/components/studio/lab src/components/dronelab src/lib/dronelab src/lib/flight src/lib/drone` (the 342 golden rows, 78 tests, flight tests unchanged).
- Acceptance. Given quad5, When I pick another battery and press Fly, Then the cockpit shows the new battery's numbers; undo in the workshop restores the old pick.
- Release blockers: a second figure iframe; any golden or flight test changed.

**Delivery.**
- Verify: `TL`; `V src/components/studio/lab src/components/dronelab src/lib/dronelab src/lib/flight src/lib/drone`.
- Rollback: revert.
- Later tasks need: T-B13-23 mounts them; T-B13-27 edits `CraftPanel.tsx`.

---

### T-B13-02 Projects: benches 1 to 6 and their 16 tasks

**Identity.** T-B13-02; LABS data; B13; must; depends on T-B13-15; not started.

**Intent.**
- Problem: set A of the bench projects must exist as files (section 4.1).
- Expected behaviour: `node scripts/convert-labs.mjs --write --set robotics-a` writes 6 bench files, 16 task files and `index.ts`. The set test passes.
- Success metric: 22 files; steps total 129 (25+19+22+17+22+24); faults total 53 (13+8+11+6+7+8); no loss row other than the named ones.

**Implementation.**
- Existing files: `src/content/robotics/{uno-r3-build,led-resistor,transistor-switch,esp32-s3-build,tb6612fng,l298n}.ts`, `src/i18n/content/<lang>/robotics/<id>.json`.
- New files: `content/projects/robotics/a/*.project.json` (one set), `content/projects/robotics/a/index.ts`. Test: `src/content/labs/robotics-a.test.ts` calls `checkSet` with `{benches: 6, tasks: 16}` and compares each bench's step ids, fault ids and mode ids with `baseline.json`.
- Edge cases: `uno-r3-build` has a board `uno-r3`; `led-resistor` has no board; `esp32-s3-build` has 6 faults and 4 tasks. Every bench has `major` steps, so the test does not single one out. Task ids and project ids follow section 4.1; each task file carries `ext['x-iynk-solution']`.
- Third-party: every file carries the `unchecked` row; copying text as is.

**Verification.**
- Unit/integration: `V src/content/labs/robotics-a.test.ts`; `LB`.
- Acceptance. Given the set folder, When the test runs, Then 22 files validate and `--check --set robotics-a` is clean.
- Release blockers: a task whose starter now passes or whose solution now fails in T-B13-28.

**Delivery.**
- Verify: `TL`; `V src/content/labs/robotics-a.test.ts`; `LB`.
- Rollback: revert (delete the folder).
- Later tasks need: T-B13-26 (registration), T-B13-28 (parity).

---

### T-B13-03 Projects: benches 7 to 13 and their 15 tasks

**Identity.** T-B13-03; LABS data; B13; must; depends on T-B13-15; not started.

Same as T-B13-02 for set B: benches `a4988, pca9685, mpu6050, hc-sr04, qtr-8rc, lm2596, pi5-ros2` (7), tasks 15, 22 files. Steps total 143 (22+23+18+19+22+22+17); faults total 53 (7+8+6+6+8+7+11); quizzes 34. Test `src/content/labs/robotics-b.test.ts` with `{benches: 7, tasks: 15}`; `pi5-ros2` asserts `ext["x-iynk-bench"].concept === true` and no other bench has it.

**Delivery.** Verify: `TL`; `V src/content/labs/robotics-b.test.ts`; `LB`. Rollback: delete the folder. Later tasks need: as T-B13-02. (Counts: set A + set B = 272 steps, 106 faults, 31 tasks, matching section 4.7.)

---

### T-B13-06 Projects: craft 1 to 7

**Identity.** T-B13-06; LABS data; B13; must; depends on T-B13-15; not started.

**Intent and implementation.** `--write --set drones-a` writes 7 files: `quad5, whoop, cinewhoop, longrange, racer, gpscam, delivery`. Build steps total 93 (12+11+14+13+13+14+16); quizzes 29 (4+4+5+4+4+4+4); courses 12. Test `src/content/labs/drones-a.test.ts` with `{crafts: 7}`; each file's `legacy.contentId` is in the set; each has three parameters; each has the three fixture rows in `provenance.thirdParty`. New files: `content/projects/drones/a/*.project.json`, `index.ts`.

**Verification.** `V src/content/labs/drones-a.test.ts`; `LB`. Acceptance: Given the folder, Then 7 files validate and `legacy-calc@1` is the calc id in all 7.

**Delivery.** Verify: `TL`; the test; `LB`. Rollback: delete the folder. Later tasks need: T-B13-26, 28.

---

### T-B13-07 Projects: craft 8 to 13

**Identity.** T-B13-07; LABS data; B13; must; depends on T-B13-15; not started.

Same as T-B13-06 for `agrihex, wing, vtol, swarm, tricopter, octo` (6 files). Build steps total 80 (15+14+15+9+13+14); quizzes 20 (4+4+3+3+3+3); courses 10. Test `drones-b.test.ts` with `{crafts: 6}`. Together with set A: 173 build steps, 49 quizzes, 22 courses.

**Delivery.** As T-B13-06.

---

### T-B13-23 `LabHost` and the Studio mount

**Identity.** T-B13-23; LABS studio; B13; must; depends on T-B13-04, 08; not started.

**Intent.**
- Problem: Studio's entry shows the canvas and code dock. A project of kind `bench` or `craft` shows the lab panel instead of the canvas, with the figure.
- User story: as Amar I open a bench from the gallery and the lab panel appears in Studio; I open the same bench by its old URL and get the same thing.
- Expected behaviour: `LabHost` takes a template id, calls `openTemplate` of T-B12-09 (it reopens the learner's fork when one exists, else forks and creates a library project; this is B12's answer, section 10 Q1), creates the session, loads the content and six-language prose on the client from the generated project (text is already inlined, so no server call), and renders `BenchPanel` or `CraftPanel` by `meta.kind`. A fork of a lab template is made with the `'lesson'` form of `forkTemplate` (origin `fork`); Step 0 confirms `forkTemplate` does not branch on `meta.kind`. The router accepts `#/<prj_id>/fly` for the fly view. `LabHost` also reads `?room=` from the URL (`useSearchParams` from `next/navigation` inside the page's `Suspense` child; `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`, read in this review). When the parameter is present it renders a one-line note above the panel with the new key `lab.roomLinkNote`: a v1 room link now opens the lab alone, because rooms need a server and live in Studio (T-B7). The old pages had no such text and `grep -rni "needs a server" src/i18n/messages/en` finds nothing (VERIFIED), so the key is new.
- Which templates `LabHost` serves: the 26 bench and craft ids only. A task template (`prj_robotics-<bench>-<task>`, 31 of them, kind `challenge`) is not rendered by `LabHost`: it opens in the ordinary Studio editor through B12's template and fork path (`#/t/<id>`, T-B12-18) with its checks and the Guide dock (T-B12-17).
- Success metric: the not-found, loading and ready states each render; 26 of 26 bench and craft templates open in `LabHost`; a task id is routed to the ordinary editor.

**Implementation.**
- Existing files: `src/components/studio/StudioEntry.tsx` (edit to choose the lab host when `meta.kind` is `bench` or `craft`; read it fresh, its owners before this task are T-B4-01, T-B4-25a (the last B4 owner, G6b), T-B7-22, T-B7-26, T-B7-28, T-B8-20 and T-B12-24, and Step 0 runs against the file as the latest of them left it), `src/studio/router.ts` (T-B4-01, T-B7-22, T-B7-28, T-B12-18; edit: parse a trailing `/fly`), `content/projects/index.ts` (T-B12-09, T-B13-15: `LAB_TEMPLATES`, `loadTemplate`), `src/studio/templates.ts` (`openTemplate`), `src/i18n/messages/{en,es,fr,de,zh,hi}/studio.json` (one set: key `lab.roomLinkNote`; the five other languages are written by the agent and marked for review, F-172).
- New file: `src/components/studio/lab/LabHost.tsx`.
```ts
export function LabHost(props: { templateId: string; lang: Locale; view?: "workshop" | "fly" }): JSX.Element;
```
- Algorithm: panels load with `next/dynamic` (`ssr: false`, a skeleton of fixed height as `loading`) so Studio's first load does not grow (BUD budgets, T-B5-12). The hash router, not Next, changes between workshop and fly (no navigation, one iframe).
- Validation: a template id that is not one of the 26 bench and craft ids shows not-found; the old route (T-B13-24) passes only valid ids. A task id is not passed to `LabHost`: `StudioEntry` keeps the editor for `meta.kind` `challenge`.
- Edge cases: the same template opened twice in two tabs uses the same library project (revision compare, R-035). `?room=` with an invalid value still shows the note.
- Permissions: default.

**Verification.**
- Unit: `LabHost.test.tsx` (loading, not found, ready for one bench and one craft with a fake library; `?room=abc` shows the note and the panel; a task id shows not-found in `LabHost`); `StudioEntry` test addition (kind `bench` and `craft` choose the lab host, kind `challenge` and `lesson` keep the editor); router test for `/fly`; the six-language key parity test of `src/i18n/messages.test.ts`.
- Playwright: T-B13-33.
- Acceptance. Given the template `prj_robotics-l298n`, When it is opened, Then a fork opens, the bench panel mounts and the canvas does not. Given `prj_drone-quad5` with `#/<fork id>/fly`, Then the fly view shows. Given `/en/robotics/l298n?room=k7m2qx`, Then the bench opens and the note shows.
- Release blockers: Studio's first-load JS growing past the T-B1-24 budget.

**Delivery.**
- Verify: `TL`; `V src/components/studio src/studio src/i18n`; `node scripts/perf-budget.mjs` (Studio route).
- Rollback: revert.
- Later tasks need: T-B13-24 renders `LabHost`; T-B13-33 and T-B13-39 assert the note.

---

### T-B13-26 Show the lab sets in the template gallery

**Identity.** T-B13-26; LABS data; B13; must; depends on T-B13-02, 03, 06, 07, 23; not started.

**Intent.** The gallery (T-B12-18, `TemplateGallery.tsx`) shows the board groups. Add three groups: "Robotics benches" (13), "Drone craft" (13), "Practice tasks" (31), in the catalogue's month order for benches. The lab entries come from `LAB_TEMPLATES` (T-B13-15), a separate list, so B12's `TEMPLATES` and its 71 + 12 count assertions are untouched. The 26 bench and craft cards open in `LabHost`; the 31 task cards open in the ordinary Studio editor through `openTemplate` and `#/t/<id>`, with the task's checks (finding in T-B13-23). Strings come from the existing index namespaces (`robotics.index.months.*`, `dronelab` index keys) and the Studio namespace.

**Implementation.**
- Existing files: `src/studio/templates.ts` (T-B12-09: add `listLabTemplates(q?)`, a read of `LAB_TEMPLATES`; `openTemplate` already forks through `loadTemplate`, which T-B13-15 extended), `src/components/studio/TemplateGallery.tsx` (T-B12-18: add the three lab sections; Step 0 reads its props and how it groups). Hand edit of `content/projects/index.ts` is not needed here: T-B13-15 owns it and the set indexes are written by T-B13-02, 03, 06, 07.
- Signature: `LabTemplateEntry` of T-B13-15; `listLabTemplates(q?: { lab?: 'robotics'|'drone'; kind?: 'bench'|'craft'|'task' }): readonly LabTemplateEntry[]`.
- Edge cases: a template whose project fails validation is hidden and listed in the console once in test mode only (never in production output).

**Verification.**
- Unit: `V src/studio src/components/studio` (a test that the gallery lists 13 + 13 + 31 lab templates, that B12's board count is still 71 + 12, and that each `load()` resolves and validates; the 31 task entries route to the editor, the 26 others to `LabHost`).
- Acceptance. Given the gallery, Then three lab groups with the right counts show and the board groups are unchanged.

**Delivery.** Verify: `TL`; `V src/studio src/components/studio src/content/labs`; `LB`. Rollback: revert. Later tasks need: T-B13-24.

---

### T-B13-28 Parity gate (unit): converted equals old

**Identity.** T-B13-28; LABS tests; B13; must; depends on T-B13-13, 02, 03, 06, 07; not started.

**Intent.**
- Problem: R-141 and R-152: the converted labs give the same verdicts and numbers as the old ones; only then may the old pages go.
- Expected behaviour: `parity.test.ts` reads every generated project and compares it with `baseline.json`: bench step ids and done hashes, fault ids and rule hashes, mode ids, status keys, quiz shape; for the 31 task projects the verdicts of starter and solution through `newRow` and `equalRow` of T-B12-23 (`src/content/boards/reference-new.ts`, row kind `'robotics-task'`, which runs `lessonJobFor` and `runLessonTests` of T-B12-07; the solution comes from `ext['x-iynk-solution']` of the committed template); for the 13 craft the `contentId`, the default pick, the option sets, and, through content, the golden hash, the arming lists and the flight hashes. It also asserts every `Text` in each project has all six languages non-empty or is flagged `untranslated` the same way the old page flagged it (`UntranslatedNotice`).
- Success metric: 13, 31, 13 rows equal; the totals of section 4.7 hold; 0 differences.

**Implementation.**
- Existing files read: `src/content/labs/baseline.json`, `content/projects/**`, `src/content/boards/reference-new.ts` (T-B12-23), `src/studio/run/lesson-checks.ts` (T-B12-07).
- New file: `src/content/labs/parity.test.ts` (test only).
- Algorithm: row-by-row deep equal, printing the first 10 differences as `lab/id field expected got`. The task rows use `newRow` with the committed task project and its solution, one `it` per task with a 60 s timeout, like `lessons.test.ts`.
- Edge cases: a task project that the converter dropped is a difference.
- Performance: the 31 task runs take under 3 minutes (ESTIMATED).

**Verification.**
- Acceptance. Given all four sets and the baseline, When the test runs, Then it prints `parity: 13 benches, 31 tasks, 13 craft, 0 differences`.
- Observability: that line is copied into the phase summary.
- Release blockers: any difference. A difference stops the deletion tasks (rule 8).

**Delivery.** Verify: `TL`; `V src/content/labs`. Rollback: delete the test (the gate then fails closed). Later tasks need: T-B13-33, 38.

---

### T-B13-27 English term beside the translated term (F-173, R-150)

**Identity.** T-B13-27; I18N; B13; could; depends on T-B13-04, 08; not started.

**Intent.**
- Problem: datasheets and code stay English; a Hindi reader sees only the translated word (HYPOTHESIS, product-learning opportunity 5).
- User story: as a reader of the Hindi page I want to see "resistor / प्रतिरोधक" the first time a technical word appears in a panel.
- Expected behaviour: a small `Term` component shows the translated word with the English term beside it when the setting "Show English terms" is on (default on for non-English languages). A glossary of about 40 terms (resistor, MOSFET, PWM, ESC, thrust, hover throttle, I2C, ...) lives in `src/i18n/terms.ts`.
- Success metric: the glossary has the six languages for every term (parity test).

**Implementation.**
- Existing files: `src/i18n/messages/*/common.json` (a setting label), `BenchPanel.tsx`, `CraftPanel.tsx` (wrap headings with `Term`).
- New files: `src/i18n/terms.ts`, `src/components/ui/Term.tsx`. Edit: `BenchPanel.tsx`, `CraftPanel.tsx`, `src/i18n/messages/*/common.json` (one set).
```ts
export type TermId = "resistor" | "pwm" | "esc" | /* ... about 40 */ string;
export function termsFor(lang: Locale): Record<TermId, { local: string; en: string }>;
export function Term(props: { id: TermId }): JSX.Element;     // "local / en" when lang != en and the setting is on
```
- Edge cases: lang `en` renders the plain word; a term missing in a language renders English only.
- Permissions: the setting is local (settings store).

**Verification.**
- Unit: `terms.test.ts` (six languages for every term; no duplicates), `Term.test.tsx`.
- Acceptance. Given lang `hi` and the setting on, Then `Term id="resistor"` renders both words.
- Note: wording review is F-172 (section 9).

**Delivery.** Verify: `TL`; `V src/i18n src/components/ui src/components/studio/lab`. Rollback: revert. Later tasks need: none.

---

### T-B13-24 Route pages open the lab in Studio, URLs kept

**Identity.** T-B13-24; LABS routes; B13; must; depends on T-B13-23, 26; not started.

**Intent.**
- Problem: R-151: bookmarks like `/en/robotics/l298n` and `/en/drones/quad5/fly` keep working. The old pages render the old workspaces. The board pages still wrap in `LabRoom`, which this phase removes.
- Expected behaviour: the three lab route pages keep `generateStaticParams`, `generateMetadata`, the `Suspense` pattern and the unknown-id 404, and render `LabHost` with the template id (`prj_robotics-<bench>`, `prj_drone-<craft>`) instead of `BenchWorkspace`, `DroneWorkspace`, `FlyWorkspace`. The two board pages (`boards/[board]/page.tsx`, `[lesson]/page.tsx`) only drop their `LabRoom` wrapper. The index pages `/robotics` and `/drones` are unchanged and link to the same URLs. No redirect is used: the page is the Studio mount for that project (R-151: "as a Studio project or as the preserved page"). Share links created before the move are room links with `?room=`; `LabHost` (T-B13-23) opens the lab alone and shows its `lab.roomLinkNote` note when the parameter is present. This task builds no such state itself; it only passes the search params through the existing `Suspense` child.
- Success metric: 13 + 13 + 13 URLs answer 200 with a `LabHost`; `/en/robotics/no-such-bench` still 404; the lab specs below pass with exit 0.

**Implementation.**
- Existing files: `src/app/[lang]/robotics/[bench]/page.tsx:1-101` (`LabRoom` at 94-101; `loadBench` at 22,54), `src/app/[lang]/drones/[drone]/page.tsx:1-57`, `src/app/[lang]/drones/[drone]/fly/page.tsx:1-68`, `src/app/[lang]/boards/[board]/page.tsx:5,51-59`, `src/app/[lang]/boards/[board]/[lesson]/page.tsx:5,52-61`.
- Edit these five files (five source files; the e2e edits below are test files). Metadata stays (it uses the content loaders, server side).
- Algorithm: each lab page still calls its loader so a bench with incomplete prose is a 404 as today; it then renders `<LabHost templateId={...} lang={lang} />` inside `Suspense`. `LabRoom` is no longer imported by any page. `LabDock` is not mounted on the Studio mount (the Partner and Build it for real tabs return with B14 and the Studio panels; section 10, Q10). On the two board pages `LabDock` stays; with `LabRoom` gone its Together tab brings its own provider (`TogetherPanel.tsx:121`), and T-B13-09 removes the tab.
- E2E edits in this task, so that no commit is red (they move here from the original T-B13-33): (a) `e2e/robotics.spec.ts`, `dronelab.spec.ts`, `fly.spec.ts`: Studio landmark selectors (`main#main-en`) where Studio's landmark differs; the quiz test (`robotics.spec.ts:105-129`) still seeds `iynk:v1` (T-B13-25's labs import reads it on first open) and reads the score back from the learner record in IndexedDB (through `e2e/support/idb.ts` of T-B7-32 or a small helper in the spec), not from `localStorage` (finding F9). It moves here from T-B13-33 because the old assertion would fail on the Studio mount. (b) `e2e/dock-shared.ts`: drop the `bench`, `drone` and `fly` rows of `LAB_PAGES` (those pages no longer carry the old dock); `e2e/dock.spec.ts`: drop the `data-lab-room` assertion (line 10). (c) `e2e/room.spec.ts`: its two tests need the old Together tab on a bench page; mark both `test.fixme` with the reason "v1 rooms removed in B13, replaced by T-B13-39". T-B13-39 rewrites them.
- Edge cases: `cacheComponents: true`, so nothing dynamic is read outside the `Suspense` child (the existing pattern).
- Validation: `isRoboticsId`, `isDroneId` guards stay.

**Verification.**
- Unit: none new (the pages are thin).
- Playwright: this task owns the edits above, so its commands pass.
- Acceptance. Given `/en/drones/quad5/fly`, When it loads, Then the fly view shows with the factory build. Given `/en/robotics/nope`, Then 404. Given `/en/boards/nano`, Then the page and its dock still render.
- Release blockers: a page that imports `LabRoom` or a store; a red spec.

**Delivery.** Verify: `TL`; `E e2e/robotics.spec.ts e2e/dronelab.spec.ts e2e/fly.spec.ts e2e/fly-fun.spec.ts e2e/dock.spec.ts e2e/dock.phone.spec.ts e2e/room.spec.ts e2e/boardlab.spec.ts`. Rollback: revert. Later tasks need: T-B13-09, 33, 38, 39.

---

### T-B13-09 The dock leaves the room layer: `LabRoom`, Together tab

**Identity.** T-B13-09; REALTIME; B13; must; depends on T-B13-24; not started.

**Intent.**
- Problem: RT 18 removal list: the two `dispatch` monkey patches (`LabRoom.tsx:50,59`, `store-sync.ts:143,153`) let any peer's message call into a lab store. The takeover hole closes when the lab side (this task) and the layer itself (T-B13-34) are both gone. After T-B13-24 no page wraps in `LabRoom`, but `LabDock` still has the Together tab (`LabDock.tsx:8,17-20,27,35,62-64,84,108,117,124-128,163-171`) and `LabRoom.tsx` still exists.
- Expected behaviour: `LabDock` loses its Together tab, `useTogether`, `ROOM_PARAM`, `useRegisterLabStore`, and its room-in-address logic. `DOCK_TABS` in `src/lib/ai/tools.ts:10,83` loses `"together"` (B0 already removed `"passport"`; Step 0 reads the current list). `LabRoom.tsx` is deleted and `dock/index.ts` stops exporting it. Rooms for a lab project are Studio rooms (T-B7-22, open and join from Studio): the lab panels need no code for them.
- Success metric: grep finds no `LabRoom`, `useRegisterLabStore` or `room/baton` in `src/components` and `src/app`.

**Implementation.**
- Existing files: as above; test `src/components/dock/LabDock.test.tsx` (211 lines; remove the Together cases, keep partner and real); `e2e/dock-shared.ts`, `e2e/dock.spec.ts`, `e2e/dock.phone.spec.ts`, which still expect the Together tab (`dock.spec.ts:23-33` the `?room=` test, `dock.phone.spec.ts:20-24`, `dock-shared.ts:49-60` clicks the tab and reads `together.panel.start`).
- Edit (source): `LabDock.tsx`, `src/lib/ai/tools.ts`, `src/components/dock/index.ts`. Delete: `src/components/dock/LabRoom.tsx`. Edit (tests): `LabDock.test.tsx`, `tools.test.ts`, `e2e/dock-shared.ts` (the `expectTabs` list loses the Together tab and the `together` json import; the Hardware assertion stays), `e2e/dock.spec.ts` (drop the "a room link opens Together" test, and the Together cases of the nav test only if they read the tab), `e2e/dock.phone.spec.ts`. The board pages were edited in T-B13-24.
- Edge cases: `firstWorkingTab` (`LabDock.tsx:46-50`) returns `"together"` when AI is off and the lab is not a drone; change to `"real"` for every lab. A `?room=` query on a board page is ignored.
- Validation: the AI tool schema description (`tools.ts:83`) loses "together (the room)"; `tools.test.ts` updated.

**Verification.**
- Unit: `LabDock.test.tsx`, `src/lib/ai/tools.test.ts`, `src/components/dock`.
- Playwright: `E e2e/dock.spec.ts e2e/dock.phone.spec.ts` (the dock without a Together tab).
- Acceptance. Given a board lesson page, When the dock opens, Then the tabs are Partner, Build it for real and, where the hardware feature is on (`LabDock.tsx:30,38,86`), Hardware. With the keyless e2e build (hardware off) the Hardware tab count is 0, as `dock-shared.ts:54` already asserts.
- Release blockers: a dock test that still expects the Together tab.

**Delivery.** Verify: `TL`; `V src/components/dock src/lib/ai`; `E e2e/dock.spec.ts e2e/dock.phone.spec.ts e2e/boardlab.spec.ts`. Rollback: revert. Later tasks need: T-B13-34 (nothing in the lab UI imports the layer any more).

---

### T-B13-33 Playwright: the lab walk on Studio

**Identity.** T-B13-33; LABS e2e; B13; must; depends on T-B13-24, 25, 26, 28; not started.

**Intent.**
- Problem: the existing specs were moved onto the Studio mount by T-B13-24 (selectors, the quiz assertion, the room tests parked) and T-B13-22 (the ghost test). A new spec walks what Amar will walk.
- Expected behaviour: add `e2e/labs-studio.spec.ts`. It does not edit the older specs.
- Success metric: all pass keyless; the old assertions are kept wherever the selector still exists.

**Implementation.**
- Existing files read: `e2e/robotics.spec.ts:32-181`, `e2e/dronelab.spec.ts:30-225`, `e2e/fly.spec.ts:31-108` (as T-B13-24 left them), `e2e/support/idb.ts`.
- New spec `e2e/labs-studio.spec.ts` (the walk):
  1. Open `/en/studio`, open the gallery, open "L298N" from Robotics benches. The bench panel shows.
  2. Do the first build step, trigger a fault, see it marked, press Undo, see it cleared.
  3. Open the Pi 5 bench: the concept text is visible.
  4. Open "Quad 5" from Drone craft, pick another battery, press Fly, arm, fly 3 s of virtual time, land.
  5. Reload: the pick, the done steps and the fault state are restored.
  6. Open a practice task card from the gallery: the ordinary editor opens with the task's checks.
  7. Open `/en/robotics/l298n?room=k7m2qx`: the bench opens and the room-link note shows.
  8. 0 page errors and 0 requests off localhost in every step (R-003 harness).
- Axe: robotics bench page and drone fly page still pass (`robotics.spec.ts:41-50`, `fly.spec.ts:72-90`).

**Verification.**
- Playwright: `E e2e/robotics.spec.ts e2e/dronelab.spec.ts e2e/fly.spec.ts e2e/fly-fun.spec.ts e2e/labs-studio.spec.ts e2e/redirects.spec.ts`.
- Acceptance. Given a keyless local build, When the specs run, Then all pass with no retry.
- Observability: the traces on first retry are off (retries 0 locally).
- Release blockers: a retry needed; any axe serious or critical.

**Delivery.** Verify: `TL`; the command above. Rollback: revert. Later tasks need: T-B13-38, 39, 35.

---

### T-B13-38 Remove the old workspaces (separate commit, R-152)

**Identity.** T-B13-38; LABS cleanup; B13; must; depends on T-B13-24, 28, 33; not started.

**Intent.** R-152: the old page "may be removed in a separate commit" once parity, accessibility and budgets hold. Run only if T-B13-28 and T-B13-33 are green (rule 8).

**Implementation.**
- Delete: `src/components/robotics/BenchWorkspace.tsx`, `BenchWorkspace.test.tsx`; `src/components/dronelab/DroneWorkspace.tsx`, `FlyWorkspace.tsx`. (Edit none.)
- Step 0 grep proves no import remains (`BenchWorkspace`, `DroneWorkspace`, `FlyWorkspace`); the three route pages already stopped importing them in T-B13-24.
- Edge cases: `BenchProgress.tsx` and `CraftProgress.tsx` stay (index pages use them).
- `useBenchState` in `messages.ts` and `BenchStore` become unused; T-B13-11 removes them.

**Verification.** `TL`; `V src/components`; `E e2e/robotics.spec.ts e2e/dronelab.spec.ts e2e/fly.spec.ts`. Acceptance: Given a grep, Then none of the four names is imported. Release blockers: a red gate.

**Delivery.** Rollback: revert. Later tasks need: T-B13-11.

---

### T-B13-34 Delete the v1 room client

**Identity.** T-B13-34; REALTIME; B13; must; depends on T-B13-09, 32, 40; not started.

**Intent.**
- Problem: the client of the old relay (protocol v1, client-chosen ids, whole-text baton) is dead code once the relay goes, and it carries the takeover paths (R3, R4, R6 of the hostile-client list).
- Expected behaviour: delete `src/lib/realtime/` (18 files with tests, plus `__fixtures__/`: `broadcast-transport.ts`, `config.ts`, `identity.ts`, `index.ts`, `probe.ts`, `protocol.ts`, `provider.tsx`, `room.ts` and `room.test.ts`, `shared-actions.ts`, `store-sync.ts`, `translate.ts`, `transport.ts`, `types.ts`, `ws-transport.ts`, `config.test.ts`, `relay.integration.test.ts`, `transports.test.ts`, `__fixtures__/`) and from `src/components/realtime/` the files `ChatPanel.tsx`, `IdentityForm.tsx`, `PresenceCursors.tsx`, `RoomBar.tsx`, `TogetherPanel.tsx`, `VoiceButton.tsx`, `PeerAvatar.tsx`, `pointing.ts`; delete `src/components/flight/room-ghosts.ts`. Keep `messages.ts` (B6 `useTogetherT`) and keep `InviteDialog.tsx` and the `QrCode` export when finding F6 says so (it does: B7 T-B7-28 and T-B7-31 use them); otherwise move `QrCode` to `src/components/ui/QrCode.tsx`, point `PairDialog` (T-B6-10) at it, and delete the dialog. `src/lib/ai/voice-wav.test.tsx` loses its second case, "a room voice note reaches /api/ai/transcribe as audio/wav" (it renders the deleted `VoiceButton`), and the imports of `VoiceButton` and `TogetherT` (lines 3-4); the first case, which tests `startRecording` and `transcribe`, stays. B6 keeps no `VoiceButton` (VERIFIED: no B6 or B7 task mentions it), so there is nothing to point the case at.
- Success metric: grep for `@/lib/realtime`, `lib/realtime`, `components/realtime` finds only the kept files (`messages.ts`, `InviteDialog.tsx`, `index.ts`) in `src`, `e2e`, `scripts` (the workflow scripts under `scripts/workflows/` are history and are listed, not edited).

**Implementation.**
- Step 0. Run `grep -rln "lib/realtime\|components/realtime" src e2e scripts` and list every hit. At this point the hits must all be owned: the layer itself (this task), `Lobby.tsx` and `Buddies.tsx` (T-B13-40, T-B0-16), `LabDock.tsx` and `LabRoom.tsx` (T-B13-09), `PartnerPanel.tsx`, `react.ts`, `react.test.tsx`, `DailyChallenge.tsx`, `together.ts` (T-B13-32), `FlyWorkspace.tsx`, `DroneWorkspace.tsx` (T-B13-22 and T-B13-38), the three store comments (below), `voice-wav.test.tsx` (this task). A hit that no task owns is a plan defect: stop and give the file name to the orchestrator.
- Edit: `src/components/realtime/index.ts` (exports only what stays), `src/lib/features.ts` (drop the `realtime` flag if it only served the relay; Step 0 reads its users), `src/lib/boardlab/store.ts` (the comment at line 101 only: it names `src/lib/realtime/store-sync.ts`; the robotics and dronelab comments were reworded in T-B13-16 and T-B13-17), `src/lib/ai/voice-wav.test.tsx`, and, only if F6 says so, `src/components/buddies/PairDialog.tsx`. Playwright blanking of `NEXT_PUBLIC_REALTIME_URL` (`T-B0-03`) may stay (harmless).
- Edge cases: `src/lib/server/mcp/tools/together.ts` is already off the layer (T-B13-32). The Together page (`src/app/[lang]/together`) is off it after T-B13-40; if Step 0 still finds an import there, stop and report.
- Permissions, performance: default.

**Verification.**
- Unit: `V src` (whole src, one run; the deleted tests are gone, none added).
- Acceptance. Given the tree, When `npm run typecheck` runs, Then it passes with the folder gone. Given `grep -rn "lib/realtime" src e2e`, Then zero hits.
- Release blockers: a B6 or B7 file that imported the layer (then stop and report).

**Delivery.** Verify: `TL`; `npm test`; `E e2e/buddies.spec.ts` if present. Rollback: revert. Later tasks need: T-B13-10.

---

### T-B13-39 Playwright: `room` spec on the new rooms

**Identity.** T-B13-39; LABS e2e; B13; must; depends on T-B13-24, 09, 33; not started.

**Intent.**
- Problem: `e2e/room.spec.ts` (137 lines) proves the v1 room on the BroadcastChannel fallback: two tabs, the keyboard baton, and a bench's steps reaching the joiner. None of it exists after T-B13-09; T-B13-24 parked both tests with `test.fixme`.
- Expected behaviour: `room.spec.ts` becomes the keyless half of the room story for labs: (1) with no server, a bench project in Studio shows the rooms entry as "needs a server" and no room control that does nothing; (2) a `?room=` link on a lab URL opens the lab alone and shows the `lab.roomLinkNote` note that `LabHost` renders (T-B13-23). The server half is `e2e/rooms.spec.ts` (T-B7-35; `e2e/support/server.ts` is T-B7-32): this task adds one case to the lab spec file instead of editing `rooms.spec.ts`: a bench in a real room with two browser contexts, where Ana triggers a fault and Ben sees it and the figure command, and Ben cannot trigger it as a viewer. The Together tab copy left `dock-shared.ts` in T-B13-09.
- Success metric: `room.spec.ts` and `rooms.spec.ts` pass.

**Implementation.**
- Existing files: `e2e/room.spec.ts:1-137` (its two tests carry `test.fixme` from T-B13-24), `e2e/support/server.ts` (T-B7-32, start/stop a real server on a random port).
- Edit: `room.spec.ts`. New case in `room.spec.ts` uses `server.ts` for the two-context test and is skipped with a stated reason if the server package cannot start on the machine.
- Edge cases: step progress is per person (finding F7), so the second old test is not ported; the new case asserts that Ben's step list is unchanged by Ana's steps.

**Verification.**
- Playwright: `E e2e/room.spec.ts e2e/rooms.spec.ts` (no `test.fixme` is left in `room.spec.ts`).
- Acceptance. Given two browsers in a room on L298N, When Ana triggers `short-5v`, Then Ben's Break it tab marks it active within 5 s. When Ben (viewer) presses Trigger on another fault, Then it is refused with the reason.
- Release blockers: a skipped server case with no reason.

**Delivery.** Verify: `TL`; the command above. Rollback: revert. Later tasks need: T-B13-35.

---

### T-B13-40 Together lobby leaves the v1 room client

**Identity.** T-B13-40; REALTIME cleanup; B13; must; depends on none inside B13 (B0 T-B0-15 and T-B0-16 and B6 T-B6-10 are earlier phases and are read at Step 0); not started.

**Intent.**
- Problem: `src/app/[lang]/together/Lobby.tsx:12` imports `createRoom`, `parseRoomInput`, `probeRoom`, `roomLink` and `ProbeResult` from `@/lib/realtime`, for its "start a room" and "join a room" sections (`StartRoom` at line 20, `JoinRoom` from line 67). T-B0-15 and T-B0-16 remove only `Planner` and `Buddies`, and T-B6-10 only adds `BuddiesPage`. So T-B13-34 could not delete the layer, and the phase would stall.
- Target user: Amar and friends on the Together page.
- Expected behaviour: the lobby drops the start and join room sections. Rooms are Studio rooms (T-B7-22: open, join and leave from Studio) and the page keeps the Buddies section (`BuddiesPage`, T-B6-10) and the intro text. The imports of `@/lib/realtime` and of `roomPath` go with the sections. If `items` and `getLobbyItems` become unused (they served only `StartRoom`), `page.tsx` and `strings.ts` drop them. The `lobby.create.*` and `lobby.join.*` keys in the six `together.json` copies go too if grep shows no other user (Step 0).
- Success metric: `grep -rn "lib/realtime" "src/app/[lang]/together"` finds nothing; the page renders.

**Implementation.**
- Existing files: `src/app/[lang]/together/Lobby.tsx` (192 lines before B0/B6 edits; read it fresh), `page.tsx:11-12,34,56` (`getLobbyItems`, `<Lobby items={items} />`), `strings.ts`, `src/i18n/messages/*/together.json`. `Lobby.tsx` also imports `useTogetherT` from `@/components/realtime/messages`, which stays (T-B13-34 keeps `messages.ts`).
- Edit: `Lobby.tsx`, `page.tsx`, `strings.ts`, `together.json` (one set, only if unused). New test: `src/app/[lang]/together/Lobby.test.tsx` (the lobby has no unit test today, VERIFIED by grep; the test renders it with the providers its existing neighbours use and asserts the Buddies section is present and no room form is).
- Edge cases: `e2e/shell.spec.ts:232-235` reads `together.lobby.aiOff`, `ledePlain` and `lede`; those keys and the text stay. `e2e/redirects.spec.ts:39-40` (`/together` redirect) is untouched.
- Validation, permissions, performance: default.

**Verification.**
- Unit: `Lobby.test.tsx`; `V src/app src/i18n`.
- Playwright: `E e2e/shell.spec.ts e2e/redirects.spec.ts`.
- Acceptance. Given `/en/together`, When it loads, Then the lobby shows the intro and the Buddies section, no start or join form, and no console error.
- Release blockers: a remaining import of `@/lib/realtime` in the together folder.

**Delivery.** Verify: `TL`; `V src/app src/i18n`; `E e2e/shell.spec.ts e2e/redirects.spec.ts`. Rollback: revert. Later tasks need: T-B13-34.

---

### T-B13-10 Delete `server/legacy/`

**Identity.** T-B13-10; SERVER cleanup; B13; must; depends on T-B13-34; not started.

**Intent.**
- Problem: B6 kept the old relay unmounted in `server/legacy/` with its 39 tests (`tasks/B6-collab-server-buddies.md` T-B6-01). Nothing depends on it once the v1 client and its integration test are gone.
- Expected behaviour: delete `server/legacy/`. `npm run server:test` stops running the legacy half. README and self-hosting text lose any path to it. Compose and Caddy files lose any legacy relay reference. The production relay at rt.iynk.tech is not touched (Amar's affair).
- Success metric: `SRV` passes with the new server's tests only; grep for `server/legacy` finds nothing outside `docs/MASTER_PLAN` and `docs/handoff`.

**Implementation.**
- Existing files: `package.json` (`server:test` script from T-B6-01), `README.md` (paths at the former lines 92, 122, 145, fixed by T-B6-20; Step 0 re-greps), `docs/SELF_HOSTING.md`, `deploy/compose.yaml`, `deploy/Caddyfile` (T-B6-12; the roadmap says "remove the realtime config from `deploy/`"; Step 0 greps for `legacy`, `realtime`, `rt.`).
- Edit up to 4 of those; delete `server/legacy/` (its `node_modules` is untracked; verify with `git ls-files server/legacy | wc -l` before and after).
- Edge cases: `tsconfig.json` `exclude` for `server` stays (the new server is there). `.dockerignore` (T-B6-20) may name the folder.
- Validation: `docker compose -f deploy/compose.yaml config` with `IYNK_DOMAIN` set still exits 0 (Docker is installed on this machine per B6 F11).

**Verification.**
- Integration: `SRV`; the compose config command.
- Acceptance. Given the tree, When `npm run server:test` runs, Then it runs only the new server's tests and exits 0, and `grep -rn "server/legacy" . --exclude-dir=node_modules --exclude-dir=docs` finds nothing.
- Release blockers: a test count that falls by more than the 39 legacy tests.

**Delivery.** Verify: `TL`; `SRV`; the compose config command. Rollback: revert. Later tasks need: T-B13-35.

---

### T-B13-11 Delete the robotics and dronelab stores

**Identity.** T-B13-11; LABS cleanup; B13; must; depends on T-B13-38, 29, 30, 31, 36, 37, 34 (`shared-actions.ts` imports both stores until T-B13-34 deletes it); not started.

**Intent.**
- Problem: X13 and the card say the lab stores go once their projects run. After the previous tasks, nothing imports the two store files.
- Expected behaviour: Step 0 greps `lib/robotics/store`, `lib/dronelab/store`, `lib/dronelab/session`, `createFlyStore`, `useBenchState`; each must have zero hits outside the files being deleted. Then delete `src/lib/robotics/store.ts` and `store.test.ts`; `src/lib/dronelab/store.ts`, `store.test.ts`, `session.ts`. Trim the dead parts of the surviving modules: `session.ts` (robotics) loses `hydrate()` and the `sync/hydrate` action member with its case (both moved there by T-B13-16); `workshop.ts` loses `hydrate()` and the `sync/hydrate` member with its case (T-B13-17); `fly.ts` loses `createFlyStore` and the `sync/hydrate` member of `FlyAction` (its reducer has no case for it, `default` returns the state); `messages.ts` loses `useBenchState`.
- The boardlab store is not deleted (finding F4).
- Success metric: the grep results above are zero; reducer tests (`session.test.ts`, `workshop.test.ts`, `fly.test.ts`) pass.

**Implementation.**
- Existing files: as above. Edit: `src/lib/robotics/session.ts`, `src/lib/dronelab/workshop.ts`, `fly.ts`, plus `src/components/robotics/messages.ts` (4 edits, within the cap). `LabStore` type in `src/components/dock/types.ts` stays (board store uses it).
- Edge cases: `src/lib/dronelab/session.ts` is the sessionStorage hand-off; Studio keeps the bench build in memory (section 4.4), so no key `iynk:dronelab:<id>` is written any more. Existing values in browsers are harmless.
- Validation: removing `sync/hydrate` from the unions must make no `switch` non-exhaustive.

**Verification.**
- Unit: `V src/lib/robotics src/lib/dronelab src/lib/flight src/components`.
- Acceptance. Given the greps, Then zero hits; Given `npm test`, Then it passes with only the known figure-test timeouts (rerun them alone with `V` to confirm).
- Release blockers: a deleted file with an importer.

**Delivery.** Verify: `TL`; `npm test`. Rollback: revert. Later tasks need: T-B13-35.

---

### T-B13-35 `docs/LABS.md`, results, exit gate and Amar's walk

**Identity.** T-B13-35; DOCS; B13; must; depends on all; not started.

**Intent.** Record what moved, what stayed, what was removed, the parity numbers, and run the exit gate.

**Implementation.**
- New file: `docs/LABS.md` with: how a bench and a craft are stored (sections 4.2, 4.3); that `src/content/{robotics,drones}` is still the source and `content/projects/` is generated (`npm run labs:check`); the action routing (4.4); what rooms share for labs (faults and design picks) and what is per person; what was deleted (list with commit ids); what stays (boardlab store and why); third-party rows open in `docs/PROVENANCE.md`; the exact English concept text; the parity line from T-B13-28; the idle CPU result from T-B13-12; the numbers of `GATE`.
- Edit: `docs/ARCHITECTURE.md` (the schema log gets one line per new `ext` key).
- Amar's walk (also `e2e/labs-studio.spec.ts`): run `npm run build && npm start` keyless on a free port; open `/en/studio`; open a bench; build two steps; trigger and undo a fault; open a craft; pick a battery; press Fly; arm; fly a lap; land. Write what he saw in the PR text, not in the repo.

**Verification.**
- Acceptance. Given the branch, When `npm run check` runs, Then it exits 0 (including `labs:check`). Then `E e2e/robotics.spec.ts e2e/dronelab.spec.ts e2e/fly.spec.ts e2e/fly-fun.spec.ts e2e/room.spec.ts e2e/rooms.spec.ts e2e/labs-studio.spec.ts` all pass.
- Release blockers: any red command; a deletion task that ran on a red gate.

**Delivery.** Verify: `GATE`. Rollback: revert the docs commit. Later tasks need: B14 reads `docs/LABS.md` for what the partner may read; B16 and B18 read it for what stays legacy.

---

## 7. Exit-gate checklist for the orchestrator

| # | Check | Command or place | Expected |
|---|---|---|---|
| 1 | Whole gate | `npm run check` | exit 0 |
| 2 | Lab specs | `E e2e/robotics.spec.ts e2e/dronelab.spec.ts e2e/fly.spec.ts e2e/fly-fun.spec.ts e2e/room.spec.ts e2e/rooms.spec.ts e2e/labs-studio.spec.ts` | all pass, no retry |
| 3 | Parity | `V src/content/labs` | `0 differences`; totals 272, 106, 31, 66, 78, 173, 113, 131, 22, 49, 342 |
| 4 | Drift | `npm run labs:check` | clean |
| 5 | Old stores gone | `grep -rn "lib/robotics/store\|lib/dronelab/store\|LabRoom\|lib/realtime" src e2e` | no hits (only `messages.ts`, `InviteDialog.tsx` and `index.ts` remain in `src/components/realtime`) |
| 6 | Legacy relay gone | `ls server/legacy` | no such directory; `SRV` green |
| 7 | Third-party rows | `npm run provenance:check` | lists the new fixture rows as open (exit non-zero is expected) |
| 8 | Amar's walk | T-B13-35 | done by Amar |

## 8. Risks and mitigations

| # | Risk | Label | Mitigation |
|---|---|---|---|
| R1 | Drone constants and the 342 golden rows are third-party derived | DOCUMENTED (DK-3) | Moved as is; sources named (T-B13-14); rows `unchecked`; rewrite is Amar's (section 9) |
| R2 | A hidden importer breaks when a store goes | HYPOTHESIS | Grep proof is Step 0 of T-B13-11, T-B13-34 and T-B13-38; mechanical tasks first; deletion tasks gated on parity and e2e |
| R3 | B2, B12 file names differ from this plan | UNKNOWN | Step 0 rule 1; adapters only inside the named files |
| R4 | Studio's first load grows | HYPOTHESIS | `next/dynamic` for both panels; `perf-budget.mjs` in T-B13-23 |
| R5 | Generated projects drift from content | DOCUMENTED | `labs:check` in `npm run check` |
| R6 | A second figure iframe on the fly switch | HYPOTHESIS | One iframe per project; T-B13-08 blocker and test |
| R7 | The flaky jsdom figure tests fail the gate (F10) | VERIFIED once | New checks avoid them; deletions rerun them alone |

## 9. For Amar (not agent tasks)

| # | Item | Why only Amar | When |
|---|---|---|---|
| 1 | Choose the licence (D-017) | A personal and legal choice | Before telling anyone the repo is open |
| 2 | Review the third-party lab content and the calculator fixtures and mark each row `cleared`, `rewritten` or `not-needed` (the words of `provenance.thirdParty[].review` in `project.schema.json`; the word list of `docs/PROVENANCE.md` is read from T-B1-17 at Step 0 of T-B13-14, which wrote `cleared`, `rewrite-needed`, `own`, so the two lists differ, section 10 Q7); rewrite what needs it. The rows T-B13-14 and the converters add are all `unchecked` | His judgement or counsel (D-017, R-148) | Before publishing |
| 3 | Fly one craft and run one bench in Studio (the walk in T-B13-35) | It is the exit gate | At the B13 stop |
| 4 | Native-speaker review of the new strings, starting with the concept text and safety text (F-172) | Needs a person who reads the language | Before publishing |
| 5 | Decide when the old board pages and the boardlab store go (finding F4). Until then the hardware twin, the board AI adapter and the sound hooks still use the store | He decides when the old pages are retired (roadmap rollout) | After B12 |
| 6 | Accept or change: during a room, build steps, figure state, task code and quiz answers are per person; only faults and design picks are shared (finding F7) | Product choice | At the B13 stop |
| 7 | Accept or change: live ghosts of friends in the flight range are removed with the old rooms and come back as buddy best-lap replays in the drone phase (finding F8, R-193) | Product choice | At the B13 stop |
| 8 | Decide whether `src/content/{robotics,drones}` stays the source of the lab projects (this plan) or the generated JSON becomes the source and the content files are deleted in a later phase | A maintenance choice | Before B16 |
| 9 | Decide on the live relay at rt.iynk.tech now that the code that talked to it is gone | Production is off limits to the build | At every rollout |
| 10 | Check simulated bench faults against real parts with a multimeter | Needs hardware (R-130 style; not part of B13) | After B10 |

## 10. Open questions for the orchestrator

1. Answered. B12 forks on open: `openTemplate` (T-B12-09) reopens the learner's fork if one exists and otherwise forks, adds a "Start" checkpoint and creates a library project (`forkTemplate`, `findFork`; a template file is never edited). T-B13-23 follows it. The template id is the template file's project id (`prj_robotics-l298n`); the opened copy has a new id.
2. Answered. T-B2-20 writes only `.corpus/` (ignored by git after T-B2-21), never `content/projects`. T-B13-02, 03, 06, 07 therefore write the project files for the first time with `convert-labs.mjs --write`; they are not "regenerate and verify".
3. Answered. T-B12-04 keys a `LearnerRecord` by project id with `steps` keyed by step index as a string (at most 64), `quiz[quizId]` and a `completion`; T-B12-08 maps board `done` keys and leaves robotics and drone keys. T-B13-25 extends the facade and importer to those keys and adds one optional `items` map to the record (Q8).
4. Whether `InviteDialog.tsx` is still imported by B6 or B7 code (finding F6). Read from the task files: yes (T-B7-28 through `index.ts:4`, T-B7-31 edits it, T-B6-10 reuses `QrCode`), so T-B13-34 keeps the file; Step 0 of T-B13-34 re-greps.
5. Answered. T-B0-13 deletes `StoryCard.tsx`, `useBuildLog.ts`, `session-log.ts` and `story-png.ts` (`tasks/B0-foundation-green-safe.md` lines 172, 199). T-B13-32 no longer lists them.
6. The task count grew from 12 to 41. The 5-file rule forced it (findings F4, F5, and the review's T-B13-40). The roadmap total of 341 tasks grows by 29.
7. `docs/PROVENANCE.md` (T-B1-17) uses `status` words `cleared`, `rewrite-needed`, `own` (`tasks/B1-foundation-keys-oss-honest.md` line 826). `provenance.thirdParty[].review` in the project schema is `unchecked`, `cleared`, `rewritten`, `not-needed`. They differ in meaning, not only spelling (`rewrite-needed` is a to-do, `rewritten` is done). Proposal: `PROVENANCE.md` adopts the schema words so one list exists. Until the orchestrator decides, T-B13-14 keeps the schema words in the sidecar and the converters copy them with no translation.
8. T-B13-25 adds one optional field to B12's `LearnerRecord`: `items?: Record<string, {doneAt, by}>` (at most 128), because EDU 11.2 has no place for a craft's bench tests and courses and a bench's task flags. The change is additive. If the orchestrator prefers no change to EDU 11.2, the fallback is to store them in `lastRun.tests` under synthetic test ids; T-B13-25 would then need no `record.ts` edit.
9. `content/projects/index.ts` (T-B12-09) declares `TemplateEntry` with `kind: 'lesson' | 'tour'` and a `catalogue.lab` of `'board'`. T-B13-15 adds a separate `LabTemplateEntry` and `LAB_TEMPLATES` instead of widening it, so B12's count assertions (71 lessons, 12 tours) hold. If B12 wants one list, it widens the type and filters its counts on `catalogue.lab`.
10. `LabHost` mounts the lab panels without `LabDock`, so the lab pages have no Partner or Build it for real tab between T-B13-24 and B14/B20. The old dock remains on the board pages. Confirm this gap is accepted; the alternative is to mount `LabDock` (minus Together) inside `LabHost`, which is one more task.
11. `scripts/convert-labs.mjs` loads `src/content/faults/legacy-map.ts` and the converter files with Node type stripping. That works only if those files use explicit `.ts` relative imports and type-only imports of content. If T-B10-25's file does not, T-B13-15 stops and the generator moves under vitest as in T-B13-13.

---

## Review fixes (2026-10-27)

Each fix was checked against the files named. Status is Applied unless stated.

| # | Issue | Status and where | Evidence checked |
|---|---|---|---|
| 1 | B12 ids and files wrong | Applied. Header Depends-on, F9, 4.4, T-B13-04, 23, 25, 26, 28, section 10 Q1 and Q3 rewritten against `tasks/B12-labs-board.md`: template store T-B12-09 (`index.ts` hand-written, concatenates generated group indexes), Guide dock T-B12-17, runner T-B12-07 (`lessonJobFor`, `runLessonTests`, kind `'robotics-task'` from T-B12-23), learner record T-B12-04, import and facade T-B12-08. T-B13-25 no longer edits `src/local/progress.ts`, defines no `ProgressPort` and no second `CompletionRecord`; it extends `facade.ts`, `legacy-import.ts` and `record.ts` and writes through `withCompletion`. Extra finding applied: B12's import skips robotics keys and sets one marker, so T-B13-25 uses its own marker `iynk:v1:imported-labs`; it also maps `quiz` entries, which B12 leaves alone. | B12 lines 397-422, 498-575, 909-934; `src/lib/progress/keys.ts`, `storage.ts` |
| 2 | T-B13-34 cannot finish | Applied. New T-B13-40 (group 7) edits `Lobby.tsx` and drops start and join room; T-B13-34 depends on it; 5.2 table updated. `voice-wav.test.tsx` goes to T-B13-34, but only its second case is removed: the first case (`startRecording`, `transcribe`) uses no `VoiceButton`, so the file is not deleted. `react.test.tsx` goes to T-B13-32. Step 0 of T-B13-34 greps `src e2e scripts`. Extra: three comments name `lib/realtime/store-sync.ts` (boardlab store line 101, robotics and dronelab stores); T-B13-16 and 17 reword theirs, T-B13-34 edits the boardlab one, so the final grep is clean. | `Lobby.tsx:12`; grep of `lib/realtime` over `src e2e scripts`; `voice-wav.test.tsx` cases |
| 3 | Reducer split circular | Applied. `hydrate` moves with the reducer into `session.ts` (T-B13-16) and `workshop.ts` (T-B13-17); `store.ts` keeps only the store types and functions; the `sync/hydrate` member stays until T-B13-11, which deletes `hydrate` and the case. A test asserts the two modules import nothing from `./store`. | `robotics/store.ts:120,157,296`; `dronelab/store.ts:114,135,232` |
| 4 | `lab-baseline.mjs` cannot run | Applied. Rows are computed in `src/content/labs/baseline-rows.ts` under vitest; `reference.test.ts` writes `baseline.json` with `UPDATE_LAB_BASELINE=1`, compares otherwise; acceptance commands replaced; flight test count corrected to 57. | `vitest.config.mts`, `lessons.test.ts`, grep count 37+7+7+6 |
| 5 | `legacy-map` path | Applied in F12, T-B13-01 and T-B13-15: `src/content/faults/legacy-map.ts`; `causeOf` stays injected. | `B10 T-B10-25` line 1121 |
| 6 | F1 stale | Applied. F1 rewritten against T-B2-20 (lines 1053-1100). T-B13-01 and T-B13-05 Step 0 list the differences and replace the domain-data parts with the `ext` and `legacy-craft` forms. B2's `convertBench` and `convertCraft` stay the entry points, so `convertBench(content, texts, deps)` is not a new public function. T-B13-15 names `convertPracticeTask` and the id scheme and keeps `ext['x-iynk-solution']`. Q2 answered. | B2 lines 154, 1053-1100 |
| 7 | Dependencies | Applied. `BenchExtView` assertion moved to T-B13-04's `useBench.test.tsx`; T-B13-19 and 20 tests use hand-written minimal projects (copies of `schemas/examples/*.project.json`); index table gains 01 for T-B13-04 and 05 for T-B13-08. | examples folder listing |
| 8 | Dock specs | Applied with one change. `dock-shared.ts`, `dock.spec.ts`, `dock.phone.spec.ts` go to T-B13-09 and the Together tab and room-link test are dropped; acceptance now lists Hardware. The two board pages move to T-B13-24 (5 source files there). Because the Studio mount has no old dock, T-B13-24 also trims the `bench`, `drone` and `fly` rows of `LAB_PAGES` (`dock-shared.ts:11-17`) and the `data-lab-room` line; this is why `dock-shared.ts` has two owners in different groups. | `e2e/dock*.ts`, `LabDock.tsx:30,38,86` |
| 9 | Red verify commands | Applied with one change. T-B13-24 owns the spec edits (a) and (c) and also the quiz assertion of F9, because that assertion reads `localStorage` and fails on the Studio mount; T-B13-33 keeps only `labs-studio.spec.ts`. T-B13-22 rewrites the ghost test in `fly-fun.spec.ts`. `room.spec.ts` would also go red at T-B13-24 (it uses the old dock on a bench page), so T-B13-24 parks its two tests with `test.fixme` and a reason and T-B13-39 rewrites them. | `e2e/room.spec.ts`, `fly-fun.spec.ts:47-75` |
| 10 | `?room=` state | Applied. `LabHost` (T-B13-23) reads `?room=` and renders a note; new key `lab.roomLinkNote` in six `studio.json` (no existing key: `grep -i "needs a server"` over `src/i18n/messages/en` finds nothing). T-B13-24 stays page edits. | grep; `use-search-params.md` exists in the Next 16.4.3 docs |
| 11 | Task templates | Applied. `LabHost` serves the 26 bench and craft ids; a task template opens in the ordinary editor through `openTemplate` and `#/t/<id>`. T-B13-23 test added; T-B13-26 shows 13 + 13 + 31 with the right routes. | T-B12-18 route, T-B2-20 `challenge` kind |
| 12 | `useBuildLog.ts`, `StoryCard.tsx` | Applied. Removed from T-B13-32, the index, groups and the 5.2 table; T-B13-32 locates `PartnerPanel` code by symbol. Q5 answered. | B0 lines 172, 199 |
| 13 | Review words | Applied. `FixtureSource.review` uses the schema enum; each entry has `source.title`; `craftThirdParty` is a straight mapping; section 9 item 2 uses the schema words. Mismatch with T-B1-17 (`cleared`, `rewrite-needed`, `own`) recorded as Q7. | `project.schema.json` `Provenance.thirdParty`; B1 line 826 |
| 14 | Field mismatches | Applied. Sources written as `{id, path, language, role, board, content}`; `BenchExt.modes` keeps `language` and `libraries`; `RoboticsContent.figure` goes to `guide.legacyFigure` and `ext["x-iynk-bench"].figureParts`; the `afterStep` null rule is stated (13 of 13 benches, VERIFIED); the false "only bench with a major step" sentence is gone from T-B13-02. | `schema.ts:68-83,463-488`; grep of `afterStep: null` and `quiz('...', null` |
| 15 | Session adapters | Applied. T-B13-08 states both adapters; `sendToFigure` takes `FigureCommand | HostCommand` and ignores unknown commands as today. | `protocol.ts:96`, `DroneWorkspace.tsx:36`, `BenchWorkspace.tsx:122-129` |
| 16 | Task ids | Applied: baton T-B7-14 and T-B7-27, read-only share T-B7-28, buddies board T-B7-17, rooms spec T-B7-35, server helper T-B7-32, room open and join T-B7-22, invite dialog T-B7-31. T-B13-23 lists T-B4-25a (and the later owners T-B7-22, 26, 28, T-B8-20, T-B12-24) for `StudioEntry.tsx`. | B7 lines 1369, 2018, 2072, 2224, 2442; B4 lines 80, 123 |

Additions beyond the sixteen issues: `LabTemplateEntry` and `LAB_TEMPLATES` instead of widening B12's `TemplateEntry` (Q9); the optional `items` map on `LearnerRecord` (Q8); the dock gap on lab pages (Q10); the Node-loading risk for `convert-labs.mjs` (Q11). The task count is 41, and the file-ownership and parallel-group tables were updated for every change above.
