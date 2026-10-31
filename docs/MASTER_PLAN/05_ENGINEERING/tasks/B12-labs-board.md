# B12 task packages: Labs moved in, the Board lab

Written 2026-10-27 for the build-plan step. Plan only: no file in `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed to write it, and nothing was committed.
Repo state read: `main`, HEAD `4d11dc5`, with the uncommitted reconcile edits under `docs/` in the working tree. No code file is modified (VERIFIED, `git status` shows only `docs/` paths).
Labels: VERIFIED (read in code, a file, or a command run in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.

Binding inputs read: `00_EXECUTIVE/DECISION_REGISTER.md` (D-013 to D-017), `03_PRODUCT/PRODUCT_REQUIREMENTS.md` R-139 to R-148 and R-151, R-152 (PRD below), `03_PRODUCT/FEATURE_CATALOGUE.md` (F-023, F-031 to F-037, F-052, F-057, F-063 to F-067, F-077, F-151, F-181, F-197), `03_PRODUCT/EDUCATION.md` sections 4, 5, 10, 11 (EDU below), `03_PRODUCT/STUDIO_EDITOR.md` sections 4.3, 6.11, 8.6, 13 (STU below), `04_ARCHITECTURE/PROJECT_DATA_MODEL.md` sections 5.12, 5.13, 11 (PDM below), `04_ARCHITECTURE/FRONTEND_ARCHITECTURE.md` section 6.6 and FA-14 (FE below), `04_ARCHITECTURE/SIMULATION_ARCHITECTURE.md` sections 12 and 20 (SIM below), `04_ARCHITECTURE/RECONCILIATION.md`, `05_ENGINEERING/IMPLEMENTATION_ROADMAP.md` (section 2 conventions, phase card B12), the task files B2, B4, B5, B9, B10 (the only earlier task files that exist), the worked example `04_ARCHITECTURE/schemas/examples/lesson-uno-r3-button.project.json`, and the code named in each task.

## 1. What this phase is

| Item | Content |
|---|---|
| Goal | The 12 boards and their 71 lessons run as Studio projects and templates with identical checks (roadmap card). |
| Scope | F-031 to F-037, F-052, F-057, F-063 to F-067, F-181 (board part, see 1.1); R-139 to R-148 (board part); R-143 for the board keys; F-023 (meaningful pass, EDU section 5) because R-140 names it; R-151 and R-152 as limits. |
| Not in it | Robotics benches and drone crafts as Studio projects (B13). New lesson content, goal tests and translations (R-149 is Amar's). Deleting any old page, store or component (R-152: only on parity, in a separate commit, and not in B12). The 342 drone fixtures (F-181, R-148, B13). Clearing or rewriting third-party text (D-017, "For Amar"). |
| Depends on phases | B5 (all 12 boards in Studio), B9 (buses, `deviceSource`, compile, debugger), B10 (faults on any circuit, hint ladder, Break it), B11 (components). The roadmap card also names B8; B8 stays a dependency through B9 and B10 (honest states, tier chips). |
| Exit gate | `npm run check`; FA-14: 102 of 102 reference runs equal (section 4.3 defines "equal"); Amar plays three lessons (section 9). Then Amar's OK. |
| Size | 28 tasks (T-B12-01 to T-B12-27, with T-B12-09 split into 09a and 09b), plus the converter fix sub-tasks T-B12-06a, 06b ... that the orchestrator writes from the T-B12-01 report (each at most 5 files). The roadmap card lists 14. Section 2 explains the difference. |
| Branch and commits | Local branch `build/v1`. One commit per task, authored as Amar Kushwaha (`bash scripts/handoff-status.sh` prints the identity), message `B12 T-B12-<nn>: <what>`, no `Co-Authored-By` line, no "Generated with" line. Never push. Never deploy. Ports 3000 and 43117, `.env.local` values and production services are off limits. |

### 1.1 What F-052, F-057, F-063 to F-067 and F-181 mean in a board phase

The roadmap card lists them with "(board part)". Reading each feature shows that their own UI belongs to benches and crafts. B12 builds only the shared machinery they will reuse. The table says what is built and what waits.

| Feature | Subject | B12 builds | Waits for B13 |
|---|---|---|---|
| F-052 live status and current draw | `src/components/robotics/StatusPanel.tsx` | A generic `StatusPanel` for any run (T-B12-10) that shows supply current and brown-out for a board lesson | Bench current models (`src/lib/robotics/current.ts`) |
| F-057 13 benches, 31 practice tasks | `src/content/robotics/*.ts` | The 31 practice tasks go through the new check path in memory for FA-14 (T-B12-23). No bench project is committed | Bench projects, faults (106), Repair |
| F-063 to F-067 drones | `src/content/drones/*.ts`, `src/lib/drone/calc.ts` | Nothing | Everything |
| F-181 golden fixtures | `src/lib/drone/__fixtures__` | Nothing (KEEP in the catalogue) | R-148 |

## 2. Findings that change the roadmap card

Each finding is handled by a task and repeated in section 9 where Amar must answer.

| # | Finding | Evidence | What this plan does |
|---|---|---|---|
| F1 | The converter the card asks T-B12-01 to write is already planned in B2. B2 splits it into T-B2-14 (interfaces and nets), T-B2-19 (`src/project/convert/lesson.ts`, `guide.ts`, `text.ts`: tours, lessons, tasks) and T-B2-20 (benches, crafts, report, `scripts/convert-catalogue.mjs`). Writing `lesson.ts` and `guide.ts` again would collide. | `tasks/B2-core-document-netlist.md` section 2.2 (ownership table), line 153 | B12 writes no converter. T-B12-01 measures what the B2 converter gets wrong on all 102 items. T-B12-06 closes those gaps in the B2 files and adds the guided plan to the output. The four conversion tasks run the converter and commit its output. |
| F2 | "102 of 102" is 71 board lessons plus 31 robotics practice tasks. The card's scope is board only. | Run in this step: `IYNK_LESSON_TABLE=... npx vitest run src/lib/interp/lessons.test.ts` gave `Reference passes: 102/102. Starter fails: 102/102` in 23.4 s. Rows per item: uno-r3 16, pico 6, basys3 5, de10-lite 5, esp32-devkitc 5, microbit-v2 5, nucleo-f401re 5, pi4-pi5 5, uno-r4 7, nano 4, nodemcu 4, esp32-s3-devkitc-1 4 = 71; 13 benches carry 31 tasks (VERIFIED) | The FA-14 gate (T-B12-23) covers the 71 lessons from the committed templates and the 31 tasks by running the B2 converter in memory. No bench template is committed (that is B13). Amar may instead accept "71 of 71 now, 31 of 31 in B13" (section 9, Q1). |
| F3 | Meaningful pass (F-023), the guided plan `ext["x-iynk-guided"]`, its JSON Schema `edu-guided.schema.json`, the guided modules (`src/project/guided/` in this plan) and the A15 edit fixtures are not built by any task in B1 to B11. R-140 and R-143 need them. | grep of the roadmap and the five task files for `lib/learn`, `x-iynk-guided`, `edu-solutions`, `NEEDS-AUTHOR` finds only B10's read of `ext["x-iynk-guided"].diagnose` (B10 finding F10) | New tasks T-B12-02, 04, 05, 22. B10's reader stays the owner of `diagnose`; B12 owns the rest of the plan and keeps the `diagnose` member untouched. |
| F4 | No earlier task builds the read-only figure lens (STU 8.6), the Studio inputs dock (button, knob, switch, R-142) or a live status panel. | grep of the roadmap and task files for `lens`, `WorldPanel`, `InputsPanel`, `StatusPanel` finds none in B1 to B11 | New tasks T-B12-11 (lens) and T-B12-10 (inputs dock and status). |
| F5 | The card says T-B12-03 edits `src/components/boardlab/shortcuts.ts`. STU 6.11 says Board Lab keeps its map and Studio has its own: `[` and `]` step the guide, and the number keys are views. | `STUDIO_EDITOR.md` lines 671 and 712 | T-B12-18 adds `[` and `]` to the Studio keymap (`src/studio/commands/keymap.ts`, T-B4-19). `shortcuts.ts` is not touched. |
| F6 | The card says T-B12-04 and T-B12-10 edit `ChecksPanel`, `FailurePanel`, `AssemblyPanel`, `WireInPanel`. These read `BoardLabStore` (`ChecksPanel.tsx:18-24` uses `useLab(store, (s) => s.checks)`). Making them work with two stores puts the old pages at risk and breaks the card's own rollback ("old pages untouched"). | `src/components/boardlab/ChecksPanel.tsx:25-30`, `FailurePanel.tsx` imports `BoardLabStore` | Studio gets its own views over the project (T-B12-17, 19, 20). The old components are not edited. About 250 lines of markup are written twice until the old pages go. Two-perspective view in section 9, Q3. |
| F7 | Progress would have two writers: the old pages write `iynk:v1` and Studio would write the `progress` store. | `src/components/boardlab/LessonWorkspace.tsx:149-150` (`markDone`), `AssemblyPanel.tsx:53`, `src/lib/progress/progress.ts:8` | One store. T-B12-04 owns the `LearnerRecord` store. T-B12-08 turns `src/lib/progress` board keys into a facade over it, so the old pages, the dashboard and Studio all read and write the same records (R-143: "the home dashboard reads from the one store"). Robotics and drone keys stay in `iynk:v1` until B13. |
| F8 | The old results can drift before B12 starts. B3, B8 and B9 change the interpreters on purpose: bus timing is charged (SIM 12 rule 1), stubs fail loudly (T-B8-01), the ADC formula changes (SIM line 392, RS-03). "Same results as before" needs an oracle that does not move. | `SIMULATION_ARCHITECTURE.md` lines 392, 995 | T-B12-03 records the oracle from `main` HEAD `4d11dc5` in a scratch worktree and from `build/v1`, and lists every difference for Amar. A changed threshold is Amar's decision (roadmap 2.5). |
| F9 | Lessons run with `deviceSource: 'library'` (the self-attaching I2C devices of today). A lesson has no netlist wiring for its MPU6050 or SSD1306. | `SIMULATION_ARCHITECTURE.md` line 999; `tasks/B9-fidelity-chip-engines.md` line 679 and 686 (`deviceSource` defaults to `'library'`) | The run adapter (T-B12-07) keeps `deviceSource: 'library'` for any project whose `simulation.world.inputs` hold a device model. |
| F10 | Board quiz results are never stored today. `recordQuiz` is called only from `src/components/robotics/BenchWorkspace.tsx:136` and `src/components/dronelab/QuizPanel.tsx:39`. | `grep -rn recordQuiz src` (VERIFIED) | The import carries board `done` flags only. Quiz records start empty (T-B12-08). |
| F11 | The 461 checks have no `state` kind (PDM 11.1, VERIFIED there). So no lesson check depends on figure state. The 134 board assembly steps do (`BuildStep.done` is a `StateCond` on figure state). | `PROJECT_DATA_MODEL.md` line 1121; `src/content/schema.ts:256-270` | Checks run without the figure. Assembly steps become `legacy-state` gates that need the lens (T-B12-11, T-B12-20). |
| F12 | `docs/PROVENANCE.md` and `docs/LESSONS.md` do not exist yet (B1 T-B1-17 creates the first). | `ls docs/PROVENANCE.md docs/LESSONS.md` (VERIFIED, both missing) | T-B12-27 needs T-B1-17 committed, appends only the rows T-B1-17 did not seed, and writes LESSONS. |
| F13 | STU 13.2 step 6 wants Export and "Share beyond buddies" to warn while `unchecked` third-party rows remain. No B1 to B11 task builds the warning. | `STUDIO_EDITOR.md` line 1102 | T-B12-17 shows the count in the Guide dock header. The warning on Export and Share is a small task T-B12-25 (could). If Amar drops it, nothing else changes. |
| F14 | EDU 5.2 defines `substanceHash` as the canonical document with `history`, `exports` and `meta.updatedAt` removed. A fork gets a new `id`, `revision 0`, a new `provenance.origin` and its own `access`, `actors`, `license`, so the hash of an untouched fork would differ from the template's and `edit` would be true at zero ops. | `STUDIO_EDITOR.md` section 4.3 (fork fields); `EDUCATION.md` lines 235-242 | T-B12-02 fixes the exclusion list (section 4.6) and A15 case (a) proves an untouched fork reads `edit = false` for all 71 lessons. Marked PROPOSAL until Amar accepts it (section 9, Q5). |

## 3. Conventions

### 3.1 Proof shorthands (copied from the roadmap, section 2.3, so this file stands alone)

| Name | Expands to |
|---|---|
| `TL` | `npm run typecheck && npm run lint` |
| `V <path>` | `npx vitest run <path>` |
| `KL` | `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL=` (after T-B0-12 names that no longer exist are dropped) |
| `E <spec>` | `KL NEXT_DIST_DIR=.next-build npx playwright test <spec>` (random port; skips 43117 after T-B0-03) |
| `SCHEMA` | `npm run schema:check` (T-B2-04) |
| `PORTABLE` | `npx tsc -p tsconfig.portable.json` (T-B2-01); covers `src/core`, `src/protocol`, `src/project`, `src/parts`, `src/sim`, `src/export`, so it covers `src/project/guided` and `src/project/convert` but not `src/lib` |
| `ARCH` | `npx vitest run src/architecture.test.ts` (T-B2-01, T-B2-10) |
| `I18N` | `npx vitest run src/i18n` |
| `GATE` | `npm run check` (content check, typecheck, lint, test, e2e) |
| `LOAD` | Start 14 busy-loop processes (`node -e "while(1){}" &`, keep their 14 PIDs), run `npx vitest run` three times in full, then `kill` exactly those PIDs. Record every failure and its test name. Same load the audit used (SIM line 1907) |

Every task ends with `TL` plus the commands it names. A task is not done until those exit 0. `GATE` runs once, in T-B12-27.

### 3.2 Rules every task follows

1. Step 0, name check. The files of B2 to B11 do not exist at the time of writing (VERIFIED: `src/project`, `src/parts`, `src/sim`, `src/sim-host`, `src/studio`, `src/local`, `src/protocol` and `src/components/studio` are absent). Their names below come from the roadmap rows and the task files B2, B4, B5, B9, B10; section 3.3 lists them. Before writing code the agent runs `ls` and `grep` for each predecessor symbol the task uses. If a name differs, the agent adapts inside the one adapter file the task names and never edits a predecessor file the task does not list. If a predecessor is missing, the agent stops and reports.
2. Portable code. Everything under `src/project/guided/` is portable: it imports `src/core` and its own folder only, with relative imports that end in `.ts` (no `@/`, B2 rule 2), so `PORTABLE` and `ARCH` both cover it. It has no DOM, React, Next, `Worker`, `Date.now`, `performance.now` or `Math.random`. The pure files in `src/studio/guide/` and `src/studio/run/` follow the same no-DOM rule. A function that needs the time takes it as an argument (`now: () => string`). A test in a portable folder starts with `// @vitest-environment node` (B2 rule 3) and reads fixture files with `node:fs`.
3. Layering (SYSTEM 5.3 matrix, enforced by `src/architecture.test.ts`, T-B2-01). `project` imports `core` only. `studio` imports `core`, `project`, `parts` and `sim-host` (frames, read only), and never `local`, `lib`, `content`, `components` or `sim`. `local` imports `core`, `protocol`, `project`, `parts`. `src/lib/**` is `labs` and `src/components`, `src/app` are `ui`; B2 leaves both unconstrained and only ratchets them. So: the plan, validator, substance hash, record, engine, gates and edit rule live in `src/project/guided/`; the progress repo and `LearnStore` live in `src/local/`; every file that touches `src/lib/interp`, `src/content`, `src/local` or `src/sim-host` is UI wiring under `src/components/studio/` (the B5 pattern: `checkJob.ts`); pure `studio` files get what they need injected (`GuideDeps`, lookup functions). `src/project/convert` stays pure; file reading is in `scripts/`. Section 3.4 lists the home of every module. A task whose `ARCH` command fails because of an import in a file it wrote moves the file; it never edits `architecture.test.ts`.
4. Old pages are not edited, except T-B12-26 (links only). The shared progress module `src/lib/progress` gets a facade in T-B12-08; the old pages keep calling it unchanged. A task that finds it must edit an old file stops and reports.
5. Text. Every user-visible string comes from the `studio` namespace, in `en es fr de zh hi` (`src/i18n/config.ts:4`). Lesson text is inlined in the project by the converter (PDM 5.13) and is rendered as text, never as HTML. No string says "validated" or "certified". The completion line says "completed in simulation at {tier}" (EDU 11.2). No em dashes.
6. Randomness and time. Anything seeded takes the seed as an argument. A test steps the virtual clock and never waits on wall time (R-002).
7. Next.js. This repo runs Next.js 16.4.3 (VERIFIED, `package.json`). B12 adds no route, no route handler and no Next config key. The only Next API named is `<Link>` from `next/link`, in T-B12-26. The agent reads `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md` first (`AGENTS.md`). That guide (line 294 onward) says prefetching runs when a link enters the viewport and only in production; T-B12-26 sets `prefetch={false}` because the target is the heavy Studio page behind a hash.
8. Commit with `git commit -m "..." -- <the task's own paths>` so a busy tree does not leak other files in.

### 3.3 Outputs of earlier phases that B12 uses

All rows are DOCUMENTED by the task row named. None exists in the tree today.

| Symbol or file | Built by | Used by B12 for |
|---|---|---|
| `src/project/generated/types.ts` (`Project`, `Op`, `Check`, `TestCase`, `Fault`), `npm run schema:check`, `04_ARCHITECTURE/schemas/*.schema.json` | T-B2-04 | document types; schema parity of the plan |
| `src/project/convert/{types,interfaces,circuit}.ts`, `scripts/convert-io.mjs`, `scripts/figure-extract.mjs` | T-B2-14 | the converter core |
| `src/project/convert/{lesson,guide,text}.ts` | T-B2-19 | lessons and tours as projects |
| `src/project/convert/{bench,craft,index}.ts`, `scripts/convert-catalogue.mjs`, `corpus.manifest.json` | T-B2-20, T-B2-21 | the whole-catalogue run; the corpus manifest |
| `src/project/{session,netlist,hash,normalize}.ts`, `src/project/testing/harness.ts` | T-B2-09, T-B2-10, T-B2-13, T-B2-16 | `stateHash`, headless runs, ops |
| `src/parts/data/<board>.component.json` for the 12 boards, `src/studio/templates.ts` (`STARTERS`, `loadStarter`) | T-B4-16, T-B5-01 to T-B5-04, T-B5-15 | board descriptors; the starter fork shape (STU-24) |
| `src/local/db.ts` (`openDb`), `stores.ts` (`STORES.progress`), `library.ts` | T-B3-02, T-B3-06 | learner records (the `progress` store is reached through `openDb()`, because the `Repository` interface of T-B3-02 has no progress methods and `memory-repository.ts` (T-B3-22) has no progress store; B12 edits neither), library |
| `src/protocol/rpc.ts` (`createRpcPort`, `createInlinePort`), `src/sim-host/host.ts` (`SimHost`), `sim.worker.ts` | T-B3-01, T-B3-13 | the run adapter |
| `src/studio/checks.ts` (`newCheck`, `BoardPins`, pure), `src/components/studio/checkJob.ts` (`checkJobFor`, `boardPinsFor`; the one B5 file that imports `@/lib/interp`), `src/lib/interp/checks.ts` (`evaluateProjectCheck`) | T-B5-09 | building a check job from a project |
| `src/studio/stores/{doc,session,ui,run}.ts` (`RunStore` and its `RunView` type are in `stores/run.ts`), `src/components/studio/wiring/simLink.ts` (`SimLink`, the run bridge, decision D4-3; there is no `src/studio/run/session.ts`), `src/studio/router.ts` (`StudioRoute`, `parseHash`, `routeHash`, `readRoute`, `navigate`), `src/studio/commands/keymap.ts`, `src/components/studio/{StudioEntry,Home,Palette,SerialPane,RunBar,CodeDock}.tsx` | T-B4-01, T-B4-02, T-B4-12, T-B4-13, T-B4-16, T-B4-19 | mounting, run state, keys |
| `src/components/studio/ViewTabs.tsx`, `VIEW_DEFS` | T-B5-21 | adding the lens as a view |
| `src/sim/registry/tiers.ts`, `src/components/studio/TierChips.tsx` | T-B8-03, T-B8-04 | the tier on a completion |
| `src/sim/analog/{states,rails}.ts` | T-B8-06 | brown-out and current for the status panel |
| `deviceSource`, bus models | T-B9-23 (T-B9-01, T-B9-02) | lesson runs stay on `'library'` |
| `src/sim/faults/{ops,models,cause-ids}.ts`, `src/components/studio/{BreakIt,HintLadder,DiagnosePanel}.tsx`, `src/studio/tools/break.ts` | T-B10-01, T-B10-02, T-B10-08, T-B10-09, T-B10-25 | Break it in lessons; hints |
| `src/parts/*` for custom parts, `src/parts/art-sanitize.ts` | T-B11-04, T-B11-06 | art for lesson parts |
| `src/i18n/messages/<lang>/studio.json` and the `studio` entry in `src/i18n/namespaces.ts` | T-B4-01 | UI strings |

Existing files B12 reads or edits today (VERIFIED by reading them in this step):

| File and line | What is there |
|---|---|
| `src/content/schema.ts:243-254` | `FailureMode`; `:256-270` `BuildStep` (`kind: 'build' \| 'break' \| 'test'`, `done: StateCond`); `:294` `ParamChip`; `:347` `WorldModel`; `:370` `Check` (10 kinds); `:388` `Lesson`; `:435` `BoardContent`; `:463-475` `QuizQuestion`, `Quiz`; `:504` `PracticeTask` |
| `src/lib/interp/check-job.ts:30` | `runChecks(job, opts)`; `:38` `boardNets`; `:47` `lessonVariant`; `:52` `lessonJob(board, lesson, source, variant)`; `:68` `taskJob(task, source)`; `:11` `CHECK_BUDGET_MS = 20_000` |
| `src/lib/interp/checks.ts:67` `stateMatches`; `:72` `codeOnly`; `:122` `evaluateCheck`; `:169` `evaluateChecks` | the one check evaluator |
| `src/lib/interp/headless.ts:103` | `runHeadless(o): RunTrace` |
| `src/lib/interp/check-client.ts:26` | `startChecks(job, onProgress, budgetMs)` |
| `src/lib/interp/lessons.test.ts:1-120` | the reference test: reference code is `resolveText(renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params)).code, text)`; the starter is `EMPTY[lesson.language]`; each lesson is its own `it` with a 60 s timeout; `IYNK_LESSON_TABLE` writes a table |
| `src/components/boardlab/LessonWorkspace.tsx:70` | `doneKey = progressKey.boardLesson(board.id, lesson.id)`; `:149-150` the completion rule: `onPassed` calls `markDone(doneKey)` only when `store.getState().fault === null` |
| `src/components/boardlab/AssemblyPanel.tsx:35-53` | assembly steps advance when `stateMatches(figState, step.done)`; all done calls `markDone(progressKey.boardAssembly(board))` |
| `src/components/boardlab/WireInPanel.tsx:36` | `lessonWireables(wireables, pins)` keeps wireables whose signal pins the lesson uses |
| `src/components/boardlab/shortcuts.ts:20-34` | the Board Lab key map (stays) |
| `src/lib/boardlab/store.ts:71-103` | `BoardLabAction`; `:364` `figureState`; `:395` `figurePatch` |
| `src/lib/progress/keys.ts:3-12, 20-26`; `storage.ts:5` `STORAGE_KEY = "iynk:v1"`; `progress.ts:8` `markDone`, `:17` `count` | the progress API the dashboard, pickers and sound moments call |
| `src/components/shell/dashboard/data.ts:53-58` | dashboard entries use `progressKey.boardLesson` and `boardAssembly` |
| `src/app/[lang]/boards/[board]/[lesson]/page.tsx:1-70` | the old lesson page (Server Component, `LessonWorkspace`) |
| `e2e/boardlab.spec.ts:51-230` | 12 tests on the old pages; they stay green |
| `vitest.config.mts` | `include` is `src/**/*.test.{ts,tsx}`, `figures/**`, `scripts/**`; `testTimeout: 60_000`; so tests live in `src`, not in `content/` or `tests/` |
| `tsconfig.json` | `include` has `**/*.ts` and `paths` `@/*` to `./src/*`; a root `content/` folder is type-checked but has no alias |

### 3.4 Where B12 code lives (SYSTEM 5.2 and 5.3)

| Code | Path | Module | May import |
|---|---|---|---|
| Plan and wireables types, guards, validator, template entry type | `src/project/guided/plan.ts`, `validate-plan.ts` | project (portable) | `core`, `src/project/generated` |
| Substance hash and `stripComments` | `src/project/guided/substance.ts` | project (portable) | `core` |
| Learner record, run summary types (`LessonRun`) | `src/project/guided/record.ts` | project (portable) | `core` |
| Engine, gates, edit rule | `src/project/guided/engine.ts`, `gates.ts`, `edit.ts` | project (portable) | the folder above and `core`; `stateMatches`, `codeOnly`, `sha256`, `canonical` arrive through `GuideDeps` |
| Plan emission in the converter | `src/project/convert/plan.ts` | project (portable) | `core`, `src/project/guided` |
| Progress repo and `LearnStore` | `src/local/progress.ts`, `learn-store.ts` | local | `core`, `protocol`, `project`, `parts` |
| Legacy import and facade | `src/lib/learn/legacy-import.ts`, `facade.ts` | labs | anything except UI |
| Fork, template list and open, inputs, status, pure guide models | `src/studio/fork.ts`, `templates.ts`, `run/inputs.ts`, `run/status.ts`, `guide/*.ts` | studio | `core`, `project`, `parts`, `sim-host` (frames); the template index, the library and the loader are passed in as arguments |
| Lesson job, lesson runner, hook, every `.tsx` | `src/components/studio/lessonJob.ts`, `lessonChecks.ts`, `guide/useGuide.ts`, `guide/*.tsx` and the other components | ui | everything |
| Template data and index | `content/projects/` (repo root, outside `src/`) | data | the index imports a type from `@/project/guided/plan`; only UI files import the index |

Step 0 of T-B12-09a reads `moduleOf` in `src/architecture.test.ts` and records how a root `content/` path is classified. If it is classified as `content` (the `src/content` row), the index imports `project` types only, which the matrix allows.

## 4. Shared contracts

A task cites a contract by number. A contract changes only by editing this section and its owning task in one commit.

### 4.1 Template ids, files and the index (owner T-B12-09a; entry type owner T-B12-02)

| Item | Rule |
|---|---|
| Project id | `prj_<board>-<lesson>` for a lesson and `prj_<board>-tour` for a board tour (PDM 11.6 and the example `prj_uno-r3-button`). Step 0 of T-B12-01 confirms the tour id T-B2-19 chose |
| File | `content/projects/boards/<group>/<id>.project.json`, `<group>` one of `arduino`, `esp`, `other`, `fpga` (83 files in all: 71 lessons and 12 tours) |
| Group to boards (stored as data, see the next row) | `arduino`: `uno-r3` (16 lessons), `nano` (4), `uno-r4` (7), 3 tours = 30 files. `esp`: `esp32-devkitc` (5), `esp32-s3-devkitc-1` (4), `nodemcu` (4), 3 tours = 16. `other`: `pico` (6), `microbit-v2` (5), `nucleo-f401re` (5), `pi4-pi5` (5), 4 tours = 25. `fpga`: `basys3` (5), `de10-lite` (5), 2 tours = 12. Sum 30 + 16 + 25 + 12 = 83 |
| Group list | `content/projects/boards/<group>/boards.json`, one file per group, content `{ "boards": ["uno-r3", "nano", "uno-r4"] }` (the board ids of the row above, in catalogue order). The file is owned and written by the conversion task of the group (T-B12-13 to T-B12-16). `scripts/build-templates.mjs` reads it and holds no board list of its own, so the four conversion tasks never edit the shared script. A missing file or an empty list means an empty group: the script writes an empty index and `--check` passes |
| Index | `content/projects/index.ts` (owner T-B12-09a, hand-written, 15 lines) concatenates four generated group indexes `content/projects/boards/<group>/index.ts`. Each group index is written by `scripts/build-templates.mjs --group <group>` and committed by its conversion task (T-B12-13 to T-B12-16), so four agents never edit one file. A group index carries the header "Generated, do not edit" like `src/content/index.generated.ts`. T-B12-09a creates the four group indexes empty |
| Hand edits | None. A template changes by changing the catalogue or the converter and running `npm run templates` |

```ts
// src/project/guided/plan.ts (T-B12-02) defines the entry type, so that `studio` can use it
// without importing the root content folder
import type { Project } from '../generated/types.ts';
export type TemplateKind = 'lesson' | 'tour';
export interface TemplateEntry {
  id: string;                         // prj_uno-r3-button
  title: Record<string, string>;      // LocalizedText of the project's meta.title, so the gallery loads no file
  board: string;                      // uno-r3, a BOARD_IDS member
  kind: TemplateKind;
  order: number;                      // guide.order, 0 for a tour
  level: 'intro' | 'io' | 'input' | 'analog' | 'protocol' | 'wireless' | 'project' | null; // null for a tour
  stepCount: number;                  // guide.steps length for a lesson, guide.assembly length for a tour
  language: 'arduino-cpp' | 'micropython' | 'python' | 'verilog';
  catalogue: { lab: 'board'; id: string; child: string | null };
  load(): Promise<Project>;           // dynamic import of the JSON file
}

// content/projects/index.ts (T-B12-09a; hand-written; the group indexes it imports are generated)
import type { TemplateEntry } from '@/project/guided/plan';
export const TEMPLATES: readonly TemplateEntry[];
export function loadTemplate(id: string): Promise<Project>;   // rejects with TemplateNotFound
```

### 4.2 Learner record (owner T-B12-04; EDU 11.2 plus one field)

`LearnerRecord`, `CompletionRecord` and `Tier` are copied from `EDUCATION.md` section 11.2 into `src/project/guided/record.ts` with the same field names (`v`, `projectId`, `templateId`, `startedAt`, `steps`, `lastRun`, `quiz`, `hintsMax`, `picks`, `completion`, `legacy`) plus one optional field `editedAt?: string` (PROPOSAL, review fix 10): the first time the edit gate flips true it is stamped and never cleared, as steps are latched, because history compaction (1,000 ops, PDM 5.15) can drop the local actor's edit ops and a finished lesson would otherwise read `edit = false` again. One record per local project that has a plan, stored under the key `learn:<projectId>` in the IndexedDB `progress` store (T-B3-02 `STORES.progress`). B3 also writes the storage-health answer into that store, so a learner row is told apart by the `learn:` prefix and by `v: 1`. A board lesson done in the old page and imported has `completion { legacy: true, gates: { checks: true, edit: null, quiz: null, goal: null } }`. Records are bounded: `steps` at most 64, `quiz` at most 8 quizzes.

### 4.3 What "equal" means for FA-14 (owner T-B12-23)

For one lesson or task `L` with reference source `R` (the rendered default code with English comments) and starter source `S` (the empty program of `lessons.test.ts:26-31`):

| Quantity | Old path | New path | Equal when |
|---|---|---|---|
| Source text | `resolveText(renderTemplate(...))` | the project's entry source text | byte equal |
| Reference verdicts | `runChecks(lessonJob(board, L, R)).results.map(r => r.ok)` | `runLessonTests(project)` flattened in `tests[].checks[]` order | arrays equal, same length |
| Reference error | `trace.error` | trace error | both `null` |
| Starter verdicts | same with `S` | same with `S` in place of the entry source | arrays equal and not all `true` |
| Oracle | the committed `reference.snapshot.json` made by T-B12-03 from `main` | | the old-path vectors equal the snapshot, or the difference is listed and approved |

`detail` strings, `ms` and trace timestamps are not compared. 461 checks over 102 items give 461 reference verdicts and 461 starter verdicts to compare (VERIFIED count in PDM 11.1; T-B12-23 asserts 461 at run time and does not trust the number).

### 4.4 Gate kinds this phase implements (owner T-B12-05)

`manual`, `check`, `edit`, `param`, `net`, `part`, `quiz`, `fault`, `legacy-state` (EDU 4.2 `StepGate`). Completion gates: `checks`, `edit`, `quiz`, `goal`, `steps`, `diagnosis` (EDU 4.4); `diagnosis` is evaluated by B10's store, B12 only reads its result. Defaults when `complete` is absent: lesson `['checks','edit','quiz']`, tour (demo) `['steps']`.

### 4.5 Strings (owner T-B12-12)

All keys live in the `studio` namespace under the prefix `lesson.`. Copy comes from `src/i18n/messages/<lang>/boardlab.json` where the same words already exist in six languages (checks, failures, assembly, wire, lesson tabs). Only new sentences are new work. This is the full list; English text is the value.

| Prefix | Used by | Keys and English text |
|---|---|---|
| `lesson.guide.*` | T-B12-17 | `title` "Guide"; `stepOf` "Step {n} of {total}"; `step.state.notStarted` "Not started"; `step.state.current` "Current step"; `step.state.done` "Done"; `step.state.blocked` "Waiting for an earlier step"; `markDone` "Mark step done"; `reset` "Reset lesson"; `resetConfirm` "Restore the starting version? Your changes in this lesson are replaced. Your progress is kept."; `hints` "Hints"; `hintReveal` "Show hint {n}"; `quiz.title` "Quick check"; `quiz.answer` "Answer"; `quiz.correct` "Correct"; `quiz.wrong` "Not quite"; `quiz.why` "Why"; `quiz.next` "Next question"; `provenance.unchecked` "{n} text items not reviewed yet"; `provenance.exportNote` "{n} text items in this project have not been reviewed. You can still export it."; `provenance.shareNote` "{n} text items in this project have not been reviewed. Check them before you share this beyond your buddies."; `tier` "Simulated at {tier}" |
| `lesson.completion.*` | T-B12-17 | `open.edit` "Change something in the project to finish."; `open.quiz` "Answer one question to finish."; `open.checks` "Run the checks and make them pass."; `open.fault` "A fault is on. Repair it to finish."; `open.steps` "Finish the steps."; `open.goal` "Reach the goal test."; `done` "Completed in simulation at {tier}."; `legacy` "Done before the edit rule." |
| `lesson.checks.*` | T-B12-19 | `title` "Checks"; `run` "Run checks"; `again` "Run again"; `pending` "Not run yet"; `running` "Running"; `allPass` "All checks pass"; `summary` "{passed} of {total} checks pass"; `faultOn` "Checks pass, but a fault is on"; `limit` "The run hit its time limit"; `textCheck` "Text check"; `hiddenNote` "{n} hidden checks also run"; `tier` "Result at {tier}"; `empty` "This lesson has no checks." |
| `lesson.nav.*` | T-B12-18 | `board` "Board"; `prev` "Previous lesson"; `next` "Next lesson"; `count` "{done} of {total} done"; `list` "Lessons on this board"; `level.intro` "Intro"; `level.io` "Inputs and outputs"; `level.input` "Input"; `level.analog` "Analog"; `level.protocol` "Protocols"; `level.wireless` "Wireless"; `level.project` "Project" |
| `lesson.gallery.*` | T-B12-18 | `title` "Lessons and boards"; `byLevel` "By level"; `byBoard` "By board"; `start` "Open"; `startRun` "Open and run"; `runLength` "Checks run for {s} s of simulated time"; `rung.lesson` "Lesson"; `rung.tour` "Board tour"; `progress.done` "Done"; `progress.legacy` "Done (old record)"; `progress.none` "Not started"; `empty` "No templates match." |
| `lesson.assembly.*` | T-B12-20 | `title` "Build steps"; `showMe` "Show me"; `refused` "Do the earlier steps first."; `manual` "Mark as done"; `needsLens` "This step is checked in the figure view." |
| `lesson.wire.*` | T-B12-20 | `title` "Wire it"; `lede` "What this board can drive, and how to wire it."; `supply` "{volts} V supply"; `caution` "Be careful"; `none` "Nothing to wire for this lesson." |
| `lesson.inputs.*` | T-B12-10 | `title` "Inputs"; `press` "Press"; `release` "Release"; `hold` "Hold"; `slider` "{label}: {value}"; `empty` "This lesson has no inputs." |
| `lesson.status.*` | T-B12-10 | `title` "Board status"; `current` "Supply current {ma} mA"; `brownout` "Brown-out: the board resets"; `ok` "Power is fine"; `unknown` "Not available at this tier" |
| `lesson.lens.*` | T-B12-11 | `open` "Show the figure"; `close` "Hide the figure"; `readOnly` "Read-only view of the original figure"; `unavailable` "No figure for this lesson" |
| `lesson.faults.*` | T-B12-21 | `title` "Break it"; `own` "Faults for this circuit"; `more` "More faults on this board"; `trigger` "Break"; `repair` "Repair"; `active` "Fault on"; `notModelled` "Not modelled in Studio yet: {title}" |

The two strings of the old pages ("Open in Studio", "Lesson view") go into `boardlab.json` in T-B12-26, because the old pages load the `boardlab` namespace. The `studio` namespace parity test (`src/i18n/messages.test.ts`, T-B4-21) already requires every language to have the English keys and placeholders. A new sentence with no earlier translation is written in the other five languages by the agent and listed in `docs/LESSONS.md` as "needs a native read" (R-150 is Amar\'s).

### 4.6 The substance hash (owner T-B12-02; PROPOSAL, finding F14)

`substanceHash(project)` is the SHA-256 of the canonical JSON (T-B2-03 `canonical`) of the project after these steps, in this order. Every member named below exists in `04_ARCHITECTURE/schemas/project.schema.json` (VERIFIED: top-level members, `$defs.Meta`, `$defs.Source`, `$defs.View`).

1. Remove the top-level members `id`, `revision`, `history`, `exports`, `provenance`, `access`, `actors`, `license`, `ext`, `assets` (`ext` is removed so the plan itself, the hidden solution and the lesson state cannot change the hash).
2. Remove `meta.createdAt`, `meta.updatedAt`, `meta.title`, `meta.description`, `meta.tags`, `meta.thumbnail`.
3. In `sources[]` replace each `content` (the source text; `Source` has `content`, not `text`) by `tokenStream(content, deps)`: the string `deps.codeOnly(content)` (comments removed) with every run of whitespace outside string literals collapsed to one space and the ends trimmed. `substance.ts` exports `stripComments`, a portable copy of `codeOnly` (`src/lib/interp/checks.ts:72` imports `@/content/schema`, so plain Node and the portable folders cannot load it). The converter script, the mount and the tests all pass `stripComments`; a parity test (`src/lib/learn/substance-parity.test.ts`) asserts `stripComments(x) === codeOnly(x)` for crafted strings and for the 71 lesson sources, so there is one behaviour.
4. `views[]` is kept whole. A `View` holds `placements`, `junctions`, `wires`, `labels` and `groups`, which are substance. Viewport and selection are session state, not document members (VERIFIED: `$defs.View` has no `viewport` or `selection`), so nothing is removed.
5. Sort sets as PDM 6.2 says (the canonical form already does).

Two projects have the same substance when their parts, wiring, parameters, code tokens, tests and guide are equal. Reset restores it. A comment-only or whitespace-only edit of `sources[].content` does not change it (EDU 5.1); `substance.test.ts` asserts this.

### 4.7 Wireables (owner T-B12-02 for the type and schema, T-B12-06 for the data; decided in review)

Decision (a): the wire-it lists live in the project as `ext["x-iynk-wireables"]`, type `WireablesExt`, with its own JSON Schema `edu-wireables.schema.json`, one valid and two invalid fixtures, and the guard `validateWireables`, all in T-B12-02. Reason: PDM line 1167 says a `Wireable` maps to the board descriptor `compatibility` and is "Not in the project", but `compatibility.rules[]` are rules with kinds, severities and params (COMPONENT_SCHEMA 4.12, lines 316 to 325), not a list of sensors with wire colours and connection pairs. The descriptor cannot hold the data without a schema change in B5. A lesson must also list only the wireables that fit its pins (`WireInPanel.tsx:36`), which is lesson data. This departs from PDM 1167 and is listed in section 9 (Q9). If Amar rejects it, T-B12-20 reads a B5 descriptor extension instead and `withWireables` is deleted. The shape is `{ v: 1, items: WireableItem[] }` with `WireableItem = { part: string; supplyVolts: number; caution?: Text; note: Text; connections: { from: string; to: string; color: WireColor }[] }`. The type name is `WireablesExt` everywhere.

## 5. Task index

Columns: Prio is must, should or could. Dep lists tasks inside B12; earlier-phase needs are in each package. Files counts source files only (tests not counted; a set of one kind counts 1; `package.json` with its lockfile counts 1).

| ID | Title | Prio | Group | Dep | Files | PRD |
|---|---|---|---|---|---|---|
| T-B12-01 | Spike: what the B2 converter and the new check path get wrong on all 102 items | must | G1 | none | 0 | R-139, R-141 |
| T-B12-02 | Guided plan: JSON Schemas, types, validator, substance hash | must | G1 | none | 4 | R-140, R-143 |
| T-B12-03 | Frozen oracle: old-path verdict vectors from `main` and `build/v1` | must | G1 | none | 2 | R-141 |
| T-B12-04 | Learner record, local store and event hooks | must | G1 | none | 3 | R-143 |
| T-B12-12 | `studio` strings for lessons in six languages | must | G1 | none | 1 | R-140 |
| T-B12-06a, 06b ... | Converter fixes, one sub-task per group of at most 5 files, written by the orchestrator from the T-B12-01 Fix list before G1b starts | must | G1b | 01, 02 | at most 5 each | R-139, R-140 |
| T-B12-05 | Guided engine: gates, completion, the edit rule | must | G2 | 02, 04 | 3 | R-140 |
| T-B12-06 | Converter: emit the plan and the wireables | must | G2 | 01, 02, 06a.. | 4 | R-139, R-140 |
| T-B12-07 | Run a project's tests as a lesson: job builder and runner | must | G2 | 01, 04 | 2 | R-141 |
| T-B12-09a | Template build script and index | must | G3 | 06 | 4 | R-139 |
| T-B12-09b | Fork and open a template | must | G3 | 02 | 2 | R-139 |
| T-B12-10 | Inputs dock and live status | must | G3 | 07, 12 | 5 | R-142 |
| T-B12-11 | Figure lens: read-only figure fed by the run | must | G3 | 06, 12 | 2 | R-144 |
| T-B12-08 | Progress import from `iynk:v1` and one store behind `src/lib/progress` | must | G4 | 04, 09a | 4 | R-143 |
| T-B12-13 | Convert Arduino boards: `uno-r3`, `nano`, `uno-r4` | must | G4 | 06, 09a | 2 | R-139, R-140 |
| T-B12-14 | Convert ESP32 family and `nodemcu` | must | G4 | 06, 09a | 2 | R-139, R-140 |
| T-B12-15 | Convert `pico`, `microbit-v2`, `nucleo-f401re`, `pi4-pi5` | must | G4 | 06, 09a | 2 | R-139, R-140 |
| T-B12-16 | Convert `basys3` and `de10-lite` (Verilog) | must | G4 | 06, 09a | 2 | R-139, R-140 |
| T-B12-17 | Guide dock: steps, quiz, completion line, reset | must | G5 | 02, 05, 07, 09b, 12 | 5 | R-140, R-143 |
| T-B12-18 | Template gallery, lesson navigation, `[` and `]`, deep links | must | G5 | 08, 09b, 12, 13 to 16 | 5 | R-139, R-151 |
| T-B12-19 | Checks view and lesson hints | must | G5 | 07, 12 | 3 | R-141 |
| T-B12-20 | Assembly guide and wire-in guide over the netlist | should | G5 | 05, 06, 11, 12 | 4 | R-142, R-144 |
| T-B12-21 | Fault lessons use the B10 faults | should | G5 | 05, 12 | 5 | R-140 |
| T-B12-22 | Edit fixtures (A15): every lesson fails `edit` at zero ops and passes after one change | must | G6 | 03, 05, 06, 07, 09b, 13 to 16 | 1 | R-140 |
| T-B12-23 | FA-14 reference-run gate: 102 of 102 equal | must | G6 | 03, 07, 09a, 13 to 16 | 2 | R-141 |
| T-B12-25 | Notice while unchecked third-party text remains (F-197 support) | could | G6 | 06, 12 | 4 | R-015 |
| T-B12-26 | Old board pages link into Studio and are marked "lesson view" | should | G6 | 09b | 4 | R-151, R-152 |
| T-B12-24 | Mount the guide in Studio; end-to-end lesson walk and axe | must | G7 | 08, 09b, 10, 11, 17 to 21, 26 | 2 | R-140 to R-142 |
| T-B12-27 | `docs/LESSONS.md`, provenance rows, exit gate record | must | G8 | all; T-B1-17 committed | 2 | none |

Review fixes changed the Dep column (details in the last section): 07 needs 04 for `Tier`; 10, 11, 25 need 12 for `lesson.*` strings; 17 needs 02 (`readPlan`) and 09b (the Start checkpoint); 18 needs 08 (progress facade), 09b and 13 to 16 (the gallery test counts 18/14/14/10/7/5/3 from committed templates); 20 needs 05 (`StepState`); 22 needs 03 (`referenceSource`), 06, 09b (`forkTemplate`); 23 needs 09a (the index and `loadTemplate`); 08 needs 09a (`stepCount`); 24 moved to G7 and needs 26 because its verify runs `e2e/boardlab.spec.ts`, which 26 edits.

### 5.1 Why 28 tasks plus fix sub-tasks, not 14

| Roadmap row | What this file does | Why |
|---|---|---|
| T-B12-01 converter | Replaced by a spike (01), gap-closing sub-tasks (06a, 06b ...) and a plan-emitting task (06) | Finding F1; review fix 7 |
| T-B12-02 template store and gallery | Split into 09a (script, index), 09b (fork, open), 18 (gallery, nav, keys, links) and 12 (strings) | Three subsystems; 09 had 6 files, over the limit of 5 |
| T-B12-03 lesson rail | 17 (Guide dock) and 18 (`[`, `]`) | Finding F5 |
| T-B12-04 checks panel, failure panel | 07 (runner), 19 (checks view), 21 (faults) | Finding F6 |
| T-B12-05 progress migration | 04 (record and store), 08 (import and facade), 05 (engine uses the record) | Finding F7 |
| T-B12-06 to 09 conversions | 13 to 16 with the same four groups; the first run of the converter on them is now T-B12-01 | The conversions are data; the code fixes are in 06 |
| T-B12-10 assembly and wire-in | 20, plus 11 (lens) because assembly `done` conditions are figure state | Finding F11 |
| T-B12-11 fault lessons | 21 | |
| T-B12-12 six-language parity | 12 (strings) and a text-parity test inside each of 13 to 16 | Text is inlined in the projects, so parity is a data test, not a namespace |
| T-B12-13 FA-14 gate | 23, with 03 (oracle) and 22 (A15) beside it | Finding F2, F3, F8 |
| T-B12-14 links, "lesson view" | 26 | |
| none | 02, 04, 05, 10, 11, 12, 22, 24, 25, 27 and the sub-tasks 06a.. | Findings F3, F4, F13; mount, end-to-end and docs |

### 5.2 Parallel groups

Groups run in order. A group starts when every task of the groups before it is committed on `build/v1` and its verify commands pass. Tasks in one group touch disjoint files (section 5.3) and none depends on a sibling in its own group.

| Group | Tasks (one agent each) | Why they are disjoint |
|---|---|---|
| G1 | T-B12-01, T-B12-02, T-B12-03, T-B12-04, T-B12-12 | 01 writes only a report; 02 the two schemas, `plan.ts`, `validate-plan.ts`, `substance.ts` in `src/project/guided`; 03 `reference-old.ts` and the snapshot; 04 `record.ts`, `src/local/progress.ts`, `src/local/learn-store.ts`; 12 the six `studio.json` files |
| G1b | T-B12-06a, 06b ... (the orchestrator writes them from the T-B12-01 Fix list) | Each sub-task names its own files out of `src/project/convert/{lesson,guide,circuit,index}.ts` and the corpus manifest, with no file shared inside the group. If two items need one file, they are one sub-task. The orchestrator checks this before the group starts |
| G2 | T-B12-05, T-B12-06, T-B12-07 | 05 `engine.ts`, `gates.ts`, `edit.ts` in `src/project/guided`; 06 `src/project/convert/plan.ts`, `index.ts`, `scripts/convert-catalogue.mjs`, the corpus manifest; 07 `src/components/studio/lessonJob.ts`, `lessonChecks.ts` |
| G3 | T-B12-09a, T-B12-09b, T-B12-10, T-B12-11 | 09a `scripts/build-templates.mjs`, `content/projects/index.ts`, four empty group indexes, `package.json`; 09b `src/studio/fork.ts`, `templates.ts`; 10 `InputsDock`, `StatusPanel`, `run/inputs.ts`, `run/status.ts` (and `wiring/simLink.ts` only if it lacks a world-input method); 11 `FigureLens.tsx`, `lens-state.ts` |
| G4 | T-B12-13, T-B12-14, T-B12-15, T-B12-16, T-B12-08 | Four group folders under `content/projects/boards/` (each with its own `boards.json` and `index.ts`) and four test files; 08 `legacy-import.ts`, `facade.ts`, `src/lib/progress/*` |
| G5 | T-B12-17, T-B12-18, T-B12-19, T-B12-20, T-B12-21 | 17 dock files and `guide/useGuide.ts`; 18 `TemplateGallery`, `LessonNav`, `Home.tsx`, `keymap.ts`, `router.ts`; 19 `ChecksView`, `LessonHints`, `checks-model.ts`; 20 `AssemblyGuide`, `WireGuide`, `assembly.ts`, `wire.ts`; 21 `lesson-faults.ts`, `FaultList.tsx`, a script and a generated table |
| G6 | T-B12-22, T-B12-23, T-B12-25, T-B12-26 | 22 fixtures, `edit-mutations.ts` and two tests; 23 `reference-new.ts`, `legacy-actions.ts` and tests; 25 export and share files named by Step 0; 26 old page files, `boardlab.json` and `e2e/boardlab.spec.ts` |
| G7 | T-B12-24 | `StudioEntry.tsx`, `GuideMount.tsx`, the e2e spec. Alone in its group because its verify runs `e2e/boardlab.spec.ts`, which T-B12-26 edits, and it needs 26 committed |
| G8 | T-B12-27 | Docs and the gate |

`package.json` is edited by T-B12-09a only. `src/i18n/messages/*/studio.json` by T-B12-12 only. `src/components/studio/StudioEntry.tsx` by T-B12-24 only. `src/project/convert/index.ts` is edited by the G1b sub-tasks that need it (one at most) and then by T-B12-06 in G2.

### 5.3 File ownership (file to task)

A file has one owner. "Later edit" names a task in a later group that edits it again.

| File | Owner | Later edit |
|---|---|---|
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/AX-B12-01/REPORT.md` | T-B12-01 | none |
| `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/edu-guided.schema.json`, `edu-wireables.schema.json` | T-B12-02 | none |
| `src/project/guided/plan.ts`, `validate-plan.ts`, `substance.ts` (and tests) | T-B12-02 | T-B12-06 (reads only) |
| `src/content/boards/reference-old.ts`, `reference.snapshot.json`, `reference-oracle.test.ts` | T-B12-03 | none |
| `src/project/guided/record.ts`, `src/local/progress.ts`, `src/local/learn-store.ts` | T-B12-04 | T-B12-08 (reads) |
| `src/i18n/messages/{en,es,fr,de,zh,hi}/studio.json` | T-B12-12 | none |
| `src/project/guided/engine.ts`, `gates.ts`, `edit.ts` | T-B12-05 | none |
| `src/project/convert/lesson.ts`, `guide.ts`, `circuit.ts`, `index.ts` and the corpus manifest, as the Fix list says | T-B12-06a, 06b ... (G1b) | T-B12-06 edits `index.ts` and the manifest again |
| `src/project/convert/plan.ts` (new), `src/project/convert/index.ts` (edit), `scripts/convert-catalogue.mjs` (edit), `src/project/convert/corpus.manifest.json` (regenerated) | T-B12-06 | none |
| `src/components/studio/lessonJob.ts`, `lessonChecks.ts` | T-B12-07 | none |
| `src/lib/learn/legacy-import.ts`, `facade.ts`; `src/lib/progress/storage.ts`, `progress.ts` | T-B12-08 | none |
| `scripts/build-templates.mjs`, `content/projects/index.ts`, four empty `content/projects/boards/<group>/index.ts`, `package.json`, `package-lock.json` | T-B12-09a | T-B12-13 to 16 rewrite the group indexes and add `boards.json` |
| `src/studio/fork.ts`, `src/studio/templates.ts` (B4 file, edit) | T-B12-09b | none |
| `src/components/studio/InputsDock.tsx`, `StatusPanel.tsx`, `src/studio/run/inputs.ts`, `status.ts`; `src/components/studio/wiring/simLink.ts` (B4 file, edited only if it has no world-input method) | T-B12-10 | none |
| `src/components/studio/FigureLens.tsx`, `src/studio/guide/lens-state.ts` | T-B12-11 | none |
| `content/projects/boards/arduino/*` (project files, `boards.json`, `index.ts`) | T-B12-13 | none |
| `content/projects/boards/esp/*` (same) | T-B12-14 | none |
| `content/projects/boards/other/*` (same) | T-B12-15 | none |
| `content/projects/boards/fpga/*` (same) | T-B12-16 | none |
| `src/content/boards/convert-{arduino,esp,other,fpga}.test.ts` | T-B12-13, 14, 15, 16 (one each) | none |
| `src/components/studio/guide/GuideDock.tsx`, `StepList.tsx`, `QuizView.tsx`, `CompletionLine.tsx`, `useGuide.ts` | T-B12-17 | none |
| `src/components/studio/TemplateGallery.tsx`, `src/components/studio/guide/LessonNav.tsx`, `src/components/studio/Home.tsx` (B4 file, edit), `src/studio/commands/keymap.ts` (B4 file, edit), `src/studio/router.ts` (B4 file, edit) | T-B12-18 | none |
| `src/components/studio/guide/ChecksView.tsx`, `LessonHints.tsx`, `src/studio/guide/checks-model.ts` | T-B12-19 | none |
| `src/components/studio/guide/AssemblyGuide.tsx`, `WireGuide.tsx`, `src/studio/guide/assembly.ts`, `wire.ts` | T-B12-20 | none |
| `scripts/build-lesson-faults.mjs`, `content/projects/boards/faults.ts`, `content/projects/boards/faults.unmapped.json`, `src/studio/guide/lesson-faults.ts`, `src/components/studio/guide/FaultList.tsx` | T-B12-21 | none |
| `src/lib/learn/edit-mutations.ts`, `tests/fixtures/edu-solutions/*` (including `NEEDS-AUTHOR.txt`), `src/lib/learn/edit-fixtures.test.ts`, `src/lib/learn/edit-gate.test.ts` | T-B12-22 | none |
| `src/content/boards/reference-new.ts`, `legacy-actions.ts`, `reference.test.ts`, `legacy-actions.test.ts` | T-B12-23 | none |
| `src/components/studio/StudioEntry.tsx` (B4 file, edit), `src/components/studio/guide/GuideMount.tsx`, `e2e/studio-lessons.spec.ts` | T-B12-24 | none |
| `src/studio/provenance-notice.ts`, `src/components/studio/UncheckedNotice.tsx`, and up to two export or share files named by Step 0 | T-B12-25 | none |
| `src/components/boardlab/OpenInStudio.tsx`, `src/app/[lang]/boards/[board]/[lesson]/page.tsx`, `src/app/[lang]/boards/[board]/page.tsx`, `src/i18n/messages/*/boardlab.json`, `e2e/boardlab.spec.ts` (test, edit) | T-B12-26 | none |
| `docs/LESSONS.md`, `docs/PROVENANCE.md` | T-B12-27 | none |

## 6. Task packages

Packages are in roughly group order, not number order (T-B12-12 sits after T-B12-04 because it is in G1; T-B12-08 stays beside its progress siblings although it runs in G4; T-B12-24 runs in G7 although it sits before 25 and 26). The group column of section 5 decides the order of work. Each package has the BRIEF section 27 fields in four blocks: identity, intent, implementation, verification, delivery. Rows that would only say "none" are merged into "Permissions, performance, migration". Common to all packages: Observability is the diagnostic text a test prints unless a row says otherwise; Rollback is `git revert` of the task commit unless a row says otherwise; Playwright is "none" unless a row names a spec.

---

### T-B12-01. Spike: what the B2 converter and the new check path get wrong on all 102 items

| Field | Content |
|---|---|
| Identity | T-B12-01; subsystem LABS, converter and run path; phase B12; priority must; depends on B2 (T-B2-14, 19, 20, 21), B3 (T-B3-13), B5 (T-B5-09), B9 (T-B9-23); status not started; group G1; kind spike (no source file changes) |
| Intent | Problem: PDM 11.4 converted one lesson by hand (`button`) and says the parity test was "Not run" and that 56 other lesson circuits were "not converted (UNKNOWN effort per item)". Nobody knows how many of the 102 items convert cleanly or give equal verdicts on the new path. Target user: the builders of T-B12-06, 07, 11, 20, 22. Story: as the builder I want a table per item so I fix the right things once. Expected behaviour: a report with six answers and a per-item table. Success metric: all six questions answered with numbers; every item has a row. |
| Questions | **Q1.** Of the 102 items (71 lessons, 31 tasks), how many does the B2 converter turn into a project with zero error diagnostics and a pass of validation passes V1 to V5? List the others with the diagnostic code. **Q2.** Of the 57 lessons with a figure circuit, how many have every part resolved to a descriptor (R-032) and a netlist equal, as a set of sets of pins, to the figure's own union-find? List unresolved parts by name. **Q3.** Run each converted project through `checkJobFor` (`src/components/studio/checkJob.ts`, T-B5-09) as it is and through `lessonJob`: for how many of 102 is the vector of check `ok` values equal for the reference source and for the empty program, with no code change? For each unequal item say which field of the job differs (`world.inputs`, `variant`, `nets`, `ports`, `params`, `logicV`, `deviceSource`). **Q4.** Can `FigureFrame` (`src/components/figure/FigureFrame.tsx:89`) be driven by a `set` patch computed only from a run's pin levels and the project parameters, without `BoardLabStore`? Try three boards (`uno-r3`, `esp32-devkitc`, `basys3`). Of the 134 board assembly steps, how many `done` conditions (`StateCond` on figure state) read keys such as `build` or `controls.*` that a run cannot supply? **Q5.** For 10 lessons chosen across the four groups, does a small valid source edit exist that still passes every check (the A15 fixture, EDU 5.2)? Name the mutation used. **Q6.** (Informational: the storage decision is made in section 4.7, `ext["x-iynk-wireables"]`.) How many of the 12 boards and 71 lessons have a non-empty `Wireable[]` after the `lessonWireables` filter (`WireInPanel.tsx:36`)? Does any `Wireable` field fail to fit the `WireableItem` shape of section 4.7? List it. |
| Method | Step 0 name check (rule 1). Write a throwaway Node script in the session scratchpad (never in the repo) that imports the converter through `scripts/convert-catalogue.mjs` and the run path through vitest. Run `npx vitest run src/lib/interp/lessons.test.ts` for the old baseline (23.4 s unloaded on 2026-10-27, VERIFIED). For Q4 use a jsdom test in the scratchpad or the Playwright browser on `/en/boards/uno-r3/blink`; do not start anything on ports 3000 or 43117. Paste the script into the report. |
| Existing files | `scripts/convert-catalogue.mjs` and `src/project/convert/*` (T-B2-14, 19, 20); `src/lib/interp/lessons.test.ts:1-120`; `src/lib/interp/check-job.ts:52-66`; `src/components/studio/checkJob.ts` (`checkJobFor`, `boardPinsFor`, T-B5-09); `src/components/figure/FigureFrame.tsx:89`; `src/lib/boardlab/store.ts:364` (`figureState`); `figures/boards/*.js` |
| New files | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/AX-B12-01/REPORT.md` and nothing else |
| Output schema | Report sections: Question, Method, Result table (one row per item: `item`, `kind`, `converts`, `diagnostics`, `netsEqual`, `okVectorEqual`, `differsIn`, `lensKeysMissing`, `fixtureMutation`, `wireables`), Verdict per question, Fix list ordered by items fixed, then grouped by converter file (`lesson.ts`, `guide.ts`, `circuit.ts`, `index.ts`, the manifest) with the number of items per file, so the orchestrator can cut it into sub-tasks of at most 5 files each (T-B12-06a, 06b ...) without reading the whole report |
| Exit condition (falsifiable) | Q3: if at least 60 of 71 lessons are equal with no change, T-B12-07 stays one task and the Fix-list sub-tasks (T-B12-06a ...) fix the rest. If fewer than 60, the report names the fields that explain at least 80 percent of the failures and T-B12-07 is split by field (the orchestrator adds T-B12-07b). Q4: if more than 20 of the 134 assembly `done` conditions cannot be supplied by a run, T-B12-20 turns those steps into `manual` gates and lists them in `docs/LESSONS.md`; the figure lens stays read-only. Q2: if more than 10 of 57 circuits have an unresolved part, a Fix-list sub-task adds descriptors only for parts used by 3 or more lessons and lists the rest as "circuit not converted; lesson opens on the bare board with the figure lens". |
| Edge cases | A timeout at 60 s on one item is a finding, not a failure of the spike. A lesson that needs a variant (`Pico W`, `Uno R4 WiFi`) is run on its first listed variant, as `lessonVariant` does (`check-job.ts:47`). |
| Permissions, performance, migration | Local only. No network. No file in `src/` changes. |
| Verification | Unit, integration, Playwright: none. Acceptance: **Given** the report, **When** T-B12-06 and T-B12-07 are planned, **Then** their scope is taken from the Fix list. The report states a verdict for each of Q1 to Q6. |
| Definition of done | Report committed; the script pasted in; no other file changed (`git status` shows one path). |
| Verify commands | `git status --short` shows only the report; `test -s docs/MASTER_PLAN/08_RESEARCH_SPIKES/AX-B12-01/REPORT.md` |
| Docs, rollback | The report is the doc. Revert deletes it. |
| Later tasks need | The Fix list (T-B12-06), the differing job fields (T-B12-07), the unsupplied-key list (T-B12-11, T-B12-20), the mutation per lesson family (T-B12-22). |

---

### T-B12-02. Guided plan: JSON Schema, types, validator, substance hash

| Field | Content |
|---|---|
| Identity | T-B12-02; subsystem LABS, guided mode; phase B12; priority must; depends on B2 (T-B2-04 for `Project` types, T-B2-03 for `canonical` and `sha256`); status not started; group G1 |
| Intent | Problem: EDU 4 stores which condition completes which step in `ext["x-iynk-guided"]` and says its schema is "new file edu-guided.schema.json, v1". No B1 to B11 task builds it (finding F3). The wire-it lists need a home too (section 4.7). Target user: the converter (T-B12-06) and the engine (T-B12-05). Story: as a builder I want a plan that fails loudly when it names a test, check or step that does not exist. Behaviour: a reader, a validator and two schemas. Metric: 3 valid and at least 8 invalid plan fixtures give the expected issues, and a fork of a project has the same `substanceHash` as the project. |
| Existing files | `EDUCATION.md` sections 4.2 and 4.3 (binding types); `04_ARCHITECTURE/schemas/project.schema.json` (`Ext` rules: keys namespaced `x-`, at most 16 per object, readers keep keys they do not know; `$defs.Source`, `Meta`, `View`, `Checkpoint`); `04_ARCHITECTURE/schemas/tools/validate.mjs`; `PROJECT_DATA_MODEL.md` line 1167 (the wireables row, see section 4.7); B10 T-B10-19 reads only `ext["x-iynk-guided"].diagnose` and owns that member. |
| New files | `04_ARCHITECTURE/schemas/edu-guided.schema.json` and `edu-wireables.schema.json` (one set), `src/project/guided/plan.ts`, `validate-plan.ts`, `substance.ts`; tests `plan.test.ts`, `validate-plan.test.ts`, `substance.test.ts` in the same folder (each starts with `// @vitest-environment node`) and `src/lib/learn/substance-parity.test.ts` (not portable: it imports `src/lib/interp`); fixtures `src/project/guided/__fixtures__/plans/{valid-lesson,valid-tour,valid-challenge,bad-*}.json` and `__fixtures__/wireables/{valid,bad-color,bad-volts}.json`. Four source files: the schema set counts 1. |
| Signatures | All imports are relative with a `.ts` extension (portable rule). `export const PLAN_KEY = 'x-iynk-guided'; export const PLAN_VERSION = 1;` The enums are values first and types derived from them, so a test can compare them with the schema: `export const GUIDED_MODES = ['guided', 'diagnose', 'challenge'] as const; export type GuidedMode = typeof GUIDED_MODES[number];` `export const RUNGS = ['lesson', 'demo', 'diagnose', 'partial', 'open', 'capstone'] as const; export type Rung = typeof RUNGS[number];` `export const COMPLETE_GATES = ['checks', 'edit', 'quiz', 'goal', 'steps', 'diagnosis'] as const; export type CompleteGate = typeof COMPLETE_GATES[number];` `export const GATE_KINDS = ['manual', 'check', 'edit', 'param', 'net', 'part', 'quiz', 'fault', 'legacy-state'] as const; export type GateKind = typeof GATE_KINDS[number];` `export type PinAddr = { c: string; p: string };` `export type StepGate = { step: number } & ({ kind: 'manual' } \| { kind: 'check'; test: string; check: string } \| { kind: 'edit'; source: string } \| { kind: 'param'; parameter: string } \| { kind: 'net'; connected: [PinAddr, PinAddr] } \| { kind: 'net'; apart: [PinAddr, PinAddr] } \| { kind: 'part'; definition: string; min: number } \| { kind: 'quiz'; quiz: string } \| { kind: 'fault'; state: 'injected' \| 'cleared' } \| { kind: 'legacy-state'; cond: Record<string, string \| number \| boolean \| null> });` `export interface GuidedPlan { v: 1; mode: GuidedMode; rung: Rung; skill: string[]; gates: StepGate[]; complete: CompleteGate[]; tests: string[]; goalTest?: string; starterTokensSha256?: string; starterSubstanceHash?: string; ladder?: unknown; diagnose?: unknown; partial?: { given: string[] }; next?: string[] }` (`ladder` and `diagnose` pass through unchanged; B10 owns them). `export function readPlan(project: Project): GuidedPlan \| null` (null when the key is absent; throws `PlanShapeError` on a wrong `v`). `export interface PlanIssue { rule: 'schema' \| 'G1' \| 'G2' \| 'G3'; severity: 'error' \| 'warning'; path: string; message: string }` `export function validatePlan(plan: unknown, project: Project): PlanIssue[]` Wireables (section 4.7): `export const WIRES_KEY = 'x-iynk-wireables'; export interface WireableItem { part: string; supplyVolts: number; caution?: Text; note: Text; connections: { from: string; to: string; color: WireColor }[] } export interface WireablesExt { v: 1; items: WireableItem[] } export function readWireables(project: Project): WireablesExt \| null; export function validateWireables(ext: unknown): PlanIssue[];` (`Text` and `WireColor` come from `../generated/types.ts`). Template index types (section 4.1): `export type TemplateKind = 'lesson' \| 'tour'; export interface TemplateEntry {...}`. `substance.ts` (section 4.6): `export interface SubstanceDeps { sha256(s: string): string; canonical(v: unknown): string; codeOnly(s: string): string }` `export function stripComments(text: string): string;` (the portable `codeOnly`) `export function tokenStream(text: string, deps: Pick<SubstanceDeps, 'codeOnly'>): string;` `export function substanceHash(project: Project, deps: SubstanceDeps): string;` The dependencies are injected so the module stays portable: callers pass `stripComments` as `codeOnly`, and `sha256` and `canonical` from `src/core` (T-B2-03). |
| Data model | Field names are EDU 4.2 exactly. Limits: `gates` 0 to 64, `skill` at most 8 items of 1 to 40 characters, `next` at most 4. `starterTokensSha256` and `starterSubstanceHash` are 64 hex characters; they are written by the converter (T-B12-06) next to the plan, as EDU 5.1 and 5.2 say. |
| Algorithm | `validatePlan` (a) checks the shape against hand-written guards that mirror the schema; (b) G1: `gates[i].step` is an integer inside `guide.steps` (or inside `guide.assembly` for a tour), at most one gate per index; (c) G2: a `check` gate names an existing test id and check id, a `quiz` gate an existing `guide.quizzes[].id`, a `net` gate existing components and pins; (d) G3: `legacy-state` only while `guide.legacyFigure` is set; (e) `tests[]` and `goalTest` name existing test ids. Shape issues and G1 have `severity: 'error'`; G2 and G3 have `severity: 'warning'`, and the Guide dock shows a warned step as "this step is manual" (EDU 4.2: a broken plan degrades to manual steps). The dock and the converter filter on `severity === 'error'`. |
| Validation, errors, edge cases | `readPlan` on a project without `ext` returns null (a plain project has no guide behaviour). A plan with `v: 2` returns an issue `schema` with severity `error` and the dock treats the project as unguided. `gates: []` is valid (all steps manual). `readWireables` behaves the same: absent gives null, `v: 2` gives a `schema` error and the wire list is hidden. `validateWireables` rejects a colour outside `WireColor` and a negative `supplyVolts`. |
| Permissions, performance, migration | Pure; no DOM; validates 64 gates in under 1 ms (ESTIMATED). No migration: the plan is new. |
| Unit tests | `plan.test.ts`: the enums of both schema files equal `GUIDED_MODES`, `RUNGS`, `COMPLETE_GATES`, `GATE_KINDS` and the `WireColor` enum of `project.schema.json`, so the two cannot drift; the fixtures validate against the schemas with the Ajv instance of `schemas/tools/validate.mjs`; `readPlan` on absent, valid, `v: 2`; `readWireables` the same. `substance.test.ts`: a copy with a new `id`, `revision`, `provenance`, `meta.title` and `meta.updatedAt` has the same hash; a comment-only edit of `sources[].content` (a `//` line, a block comment, a blank line) keeps it; changing `delay(500)` to `delay(200)`, moving a part, adding a wire, changing a parameter default or a test changes it; the hash of the `lesson-uno-r3-button.project.json` example equals a value pinned in the test. `src/lib/learn/substance-parity.test.ts`: `stripComments(x) === codeOnly(x)` on crafted strings (`#include`, `#define`, `# comment`, `http://`) and on the reference source of every one of the 71 lessons. `validate-plan.test.ts`: valid lesson, valid tour (9 `legacy-state` gates plus 1 `fault`), valid challenge; invalid: two gates on one step (G1), step index 99 (G1), `check` gate with an unknown test (G2, severity `warning`), `quiz` gate with an unknown quiz (G2), `legacy-state` without `legacyFigure` (G3), 65 gates, 9 skills, `goalTest` naming no test; each issue has the expected `severity`; wireables: one valid, one with an unknown colour, one with negative volts. |
| Integration tests | Validate the plan of the example `lesson-uno-r3-button.project.json` once T-B12-06 emits it (a test in T-B12-06 does this, not here). |
| Fixtures | The 3 valid and 8 invalid plan files and the 3 wireables files above. |
| Acceptance | **Given** a plan whose `check` gate names `c9` and no check `c9` exists, **When** `validatePlan` runs, **Then** it returns one issue with `rule: 'G2'` and `path: 'gates/3'`. **Given** an absent key, **Then** `readPlan` returns null. |
| Observability, release blockers | Issue messages name the path. A plan that passes `validatePlan` with an error must never reach the dock. |
| Definition of done | Tests green. |
| Verify commands | `TL`; `V src/project/guided src/lib/learn/substance-parity.test.ts` (runs `plan.test.ts`, `validate-plan.test.ts` and `substance.test.ts`); `SCHEMA` (Step 0: if `schema:check` does not cover the two `edu-*.schema.json` files, `plan.test.ts` validates the fixtures against them and says so in its header); `PORTABLE`; `ARCH` |
| Docs, rollback | JSDoc; `docs/LESSONS.md` (T-B12-27) describes the plan. Revert. |
| Later tasks need | `readPlan`, `validatePlan`, `readWireables`, `WireablesExt`, `TemplateEntry`, the types and constants, `substanceHash`, `tokenStream`, `stripComments` (T-B12-05, 06, 09b, 17, 20, 22). |

---

### T-B12-03. Frozen oracle: old-path verdict vectors from `main` and `build/v1`

| Field | Content |
|---|---|
| Identity | T-B12-03; subsystem LABS, parity; phase B12; priority must; depends on nothing in B12; status not started; group G1 |
| Intent | Problem: finding F8. FA-14 asks for results "equal to the old results", but B3, B8 and B9 change the interpreters (bus timing, loud failures, ADC formula) before B12 starts. Without a fixed oracle, "equal" compares the new path with an old path that already moved. Target user: Amar and T-B12-23. Story: as the gate I want the verdict vectors of `main` HEAD `4d11dc5` on disk, and a list of every difference on `build/v1`. Behaviour: a shared helper, a snapshot file and a comparison. Metric: 102 rows, 461 reference verdicts and 461 starter verdicts recorded; the diff between `main` and `build/v1` is empty or listed. |
| Existing files | `src/lib/interp/lessons.test.ts:1-120` (its `prose`, `EMPTY`, reference-source recipe), `src/lib/interp/check-job.ts:52, 68` (`lessonJob`, `taskJob`), `src/content/index.generated.ts` (`boardLoaders`, `roboticsLoaders`), `src/lib/boardlab/template.ts` (`renderTemplate`, `defaultParams`, `resolveText`) |
| New files | `src/content/boards/reference-old.ts`, `src/content/boards/reference.snapshot.json`; test `src/content/boards/reference-oracle.test.ts`; edit (test file) `src/lib/interp/lessons.test.ts` to import `prose`, `EMPTY` and the reference-source helper from `reference-old.ts` so there is one copy |
| Signatures | `export const EMPTY: Record<Language, string>; export function prose(lab: 'boards' \| 'robotics', id: string): (key: string) => string; export function referenceSource(board: BoardContent, lesson: Lesson, text: (k: string) => string): string;` `export interface OracleRow { item: string; id: string; kind: 'board-lesson' \| 'robotics-task'; language: Language; checkCount: number; reference: boolean[]; referenceError: string \| null; starter: boolean[] }` `export function oracleRows(): Promise<OracleRow[]>` (runs `runChecks` for the reference and the empty program of all 71 lessons and 31 tasks) `export function diffRows(a: OracleRow[], b: OracleRow[]): string[]` (one line per difference: item, id, which vector, index) |
| Data model | `reference.snapshot.json`: `{ "source": "main@4d11dc5", "taken": "<ISO date>", "rows": OracleRow[], "driftFromBuild": string[] }`. `driftFromBuild` is the output of `diffRows(main, build)` when the snapshot was made. |
| Algorithm | The test has two modes. With `IYNK_ORACLE_OUT=<path>` it writes `oracleRows()` as JSON (no assertions). Without it, it compares `oracleRows()` with the snapshot rows and fails on any difference not listed in `driftFromBuild` that Amar approved (the list is empty unless Amar approved a change). Procedure to make the snapshot, written in the test header: (1) `git worktree add /Users/amar/iynk-master-plan-scratch/oracle-main 4d11dc5` (outside the repo); (2) copy `reference-old.ts`, `reference-oracle.test.ts` and `vitest.config.mts` into it, symlink `node_modules`; (3) `IYNK_ORACLE_OUT=<scratch>/main.json npx vitest run src/content/boards/reference-oracle.test.ts` in the worktree; (4) the same on `build/v1` into `build.json`; (5) store `main.json` rows as `rows` and `diffRows(main, build)` as `driftFromBuild`; (6) `git worktree remove` the scratch tree. Nothing is pushed. |
| Validation, errors, edge cases | A row whose reference has a `false` is a finding: on `main` there are none (VERIFIED 102 of 102 pass). A `build/v1` row that differs stops the task: the agent lists the rows and stops, because a changed verdict or threshold is Amar's decision (roadmap 2.5). |
| Permissions, performance, migration | Runs about 28 s unloaded for 204 interpreter runs (VERIFIED for the 102 reference runs: 23.4 s total with starters on 2026-10-27); each lesson is its own `it` with a 60 s timeout. No migration. |
| Unit tests | `reference-oracle.test.ts`: 71 plus 31 rows; `checkCount` sums to 461 (assert at run time); every `reference` all `true` and `referenceError` null; every `starter` has at least one `false`; `diffRows` on two crafted arrays. `lessons.test.ts` still passes (102 tests). |
| Integration tests | The snapshot compare itself. |
| Fixtures | `reference.snapshot.json` (about 60 KB, ESTIMATED). |
| Acceptance | **Given** `build/v1` at the start of B12, **When** the oracle test runs, **Then** it passes with `driftFromBuild` equal to `[]`, or the task stops with the list. |
| Observability, release blockers | The diff lines. A non-empty drift not approved by Amar blocks the whole phase (T-B12-23 would otherwise bless a moved baseline). |
| Definition of done | Snapshot committed with `driftFromBuild` written; `lessons.test.ts` unchanged in behaviour. |
| Verify commands | `TL`; `V src/content/boards/reference-oracle.test.ts src/lib/interp/lessons.test.ts` |
| Docs, rollback | Header comment in the test. Revert; the old `lessons.test.ts` returns. |
| Later tasks need | `oracleRows`, `diffRows`, `EMPTY`, `prose`, `referenceSource` (T-B12-23, T-B12-22). |

---

### T-B12-04. Learner record, local store and event hooks

| Field | Content |
|---|---|
| Identity | T-B12-04; subsystem LABS, progress; phase B12; priority must; depends on B3 (T-B3-02: `openDb()` and `STORES.progress`); status not started; group G1 |
| Intent | Problem: progress today is a `done` flag in one `localStorage` document (`src/lib/progress/storage.ts:5`); EDU 11 needs per-project records with steps, quiz answers, last run and a completion stamped with a tier. Target user: Amar and friends who return to a lesson. Story: as a learner I want my place kept when I close the tab. Behaviour: pure record functions, an IndexedDB-backed repo and an in-memory store with a synchronous snapshot for React. Metric: a record survives reload in the memory repository test and in the browser walk (T-B12-24). |
| Existing files | `src/local/db.ts` (`openDb`) and `stores.ts` (`STORES.progress`, T-B3-02). The `Repository` interface of T-B3-02 has `list`, `load`, `save`, `remove`, `journal`, `backups`, `revisions` and no get or put on `progress`, and `memory-repository.ts` (T-B3-22) has no progress store, so this task does not use `Repository` and edits neither file. B3 also writes the storage-health persist answer into the same `progress` store (T-B3-04), so rows that are not learner records exist there. EDU 11.1 and 11.2 (binding record); `src/lib/progress/hooks.ts:12-36` (the `useSyncExternalStore` shape the new store copies). |
| New files | `src/project/guided/record.ts` (portable), `src/local/progress.ts`, `src/local/learn-store.ts`; tests `src/project/guided/record.test.ts`, `src/local/progress.test.ts`, `src/local/learn-store.test.ts` |
| Signatures | `record.ts` (relative `.ts` imports only): `Tier`, `LearnerRecord`, `CompletionRecord` exactly as in EDU 11.2 plus `editedAt?: string` (section 4.2). The run summary types the engine and the Studio wiring share (so `studio` code never imports a UI file): `export interface CheckVerdict { testId: string; checkId: string; kind: string; visibility: 'visible' \| 'hidden'; ok: boolean; detail?: string }` `export interface TestRun { testId: string; verdicts: CheckVerdict[]; error: { line: number; message: string } \| null; ms: number; limit: boolean }` `export interface LessonRun { tests: TestRun[]; passedAll: boolean; tier: Tier; at: string }`. `export const MAX_STEPS = 64; export const MAX_QUIZZES = 8;` `export function emptyRecord(projectId: string, now: string, templateId?: string): LearnerRecord;` `export function withStep(r: LearnerRecord, index: number, by: 'gate' \| 'manual', now: string): LearnerRecord;` `export function withAnswer(r: LearnerRecord, quizId: string, questionId: string, choice: number, correct: boolean, total: number): LearnerRecord;` `export function withLastRun(r: LearnerRecord, run: NonNullable<LearnerRecord['lastRun']>): LearnerRecord;` `export function withHintLevel(r: LearnerRecord, level: 0 \| 1 \| 2 \| 3): LearnerRecord;` `export function withEdited(r: LearnerRecord, now: string): LearnerRecord;` (no-op when already set) `export function withCompletion(r: LearnerRecord, c: Omit<CompletionRecord, 'at'>, now: string): LearnerRecord;` All return a new object and never mutate. `local/progress.ts` (reached through `openDb()`, not `Repository`): `export const LEARN_PREFIX = 'learn:'; export interface LearnKv { get(key: string): Promise<unknown>; put(key: string, value: unknown): Promise<void>; delete(key: string): Promise<void>; entries(): Promise<Array<[string, unknown]>> } export function memoryLearnKv(): LearnKv;` (the in-memory fake used by tests and when IndexedDB is missing) `export function idbLearnKv(): Promise<LearnKv>;` (opens `openDb()` and wraps `STORES.progress`; Step 0 reads the store's key convention and wraps values if the key path is inline) `export interface ProgressRepo { get(projectId: string): Promise<LearnerRecord \| undefined>; put(r: LearnerRecord): Promise<void>; all(): Promise<LearnerRecord[]>; remove(projectId: string): Promise<void> } export function createProgressRepo(kv: LearnKv): ProgressRepo;` Keys are `learn:<projectId>`; `all()` returns only entries whose key starts with `learn:` and whose value has `v === 1` and a string `projectId`; other writers' rows are never returned and never deleted. `learn-store.ts`: `export interface LearnStore { readonly ready: Promise<void>; snapshot(): ReadonlyMap<string, LearnerRecord>; get(projectId: string): LearnerRecord \| undefined; subscribe(listener: () => void): () => void; update(projectId: string, fn: (r: LearnerRecord \| undefined) => LearnerRecord, now: string): void; persistError(): Error \| null } export function createLearnStore(repo: ProgressRepo, deps?: { setTimeout?: typeof setTimeout; target?: Pick<EventTarget, 'addEventListener'> }): LearnStore;` |
| Data model | Record key `projectId` (string, 1 to 80 characters); stored key `learn:<projectId>`. `steps` keyed by step index as a string. `quiz[quizId] = { answers: Record<questionId, number>; correct: number; total: number }`. `legacy?: boolean` marks an import (EDU 11.4). `editedAt?: string` is the latched edit gate (section 4.2). Records are plain JSON, no functions. |
| Algorithm | `createLearnStore` hydrates once (`repo.all()` into a `Map`), exposes a stable `snapshot()` object that changes identity only on update (so `useSyncExternalStore` does not loop). `update` applies in memory first, notifies, then writes through to the repo after 200 ms of quiet (debounce), flushing on `pagehide`. A failed write sets `persistError()` and retries once after 2 s; the in-memory value stays. Before `ready` resolves, `snapshot()` is the empty map (the server render and first client render agree, as `getServerSaved` does today). |
| State transitions | `empty` to `started` (first `update`) to `completed` (`completion` set). `completion` is never removed by an update except by `reset(projectId)` through `remove` (not exposed to the UI in B12). |
| Validation, errors, edge cases | `withStep` with index 64 or more throws `RangeError`. `withAnswer` beyond 8 quizzes throws. Two tabs: IndexedDB raises no `storage` event, so the store re-hydrates when the tab becomes visible again (a documented limit; B3's one-writer-tab rule covers editing, not progress). IndexedDB missing: the store works in memory and `persistError()` returns an error; the dock shows the B3 banner (T-B4-16). |
| Permissions, performance, migration | Local only; no network. Snapshot read is O(1); 140 records hydrate in under 20 ms (ESTIMATED). Migration: none here; the import is T-B12-08. |
| Unit tests | `record.test.ts`: each `with*` returns a new object and leaves the input equal to its copy; bounds throw; `withCompletion` sets `at`; `withEdited` sets once and is idempotent. `progress.test.ts`: round trip through `memoryLearnKv`; `all()` skips a foreign row such as the storage-health answer and a row with `v: 2`, and `remove` of a learner row leaves the foreign row in place. `learn-store.test.ts` (memory kv): hydrate then get; update notifies once; debounce writes once for 10 updates inside 200 ms (fake timers); a failed `put` sets `persistError` and the memory value stays; snapshot identity is stable between updates; `pagehide` flushes. |
| Integration tests | With `fake-indexeddb` if B3 added it (PD-11), `idbLearnKv()` round-trips one record through the real `progress` store next to a foreign row; otherwise the memory kv only and the test says so. |
| Fixtures | None. |
| Acceptance | **Given** a record written for `prj_uno-r3-blink`, **When** the store is recreated on the same repository, **Then** `get` returns an equal record after `ready`. |
| Observability, release blockers | `persistError()`. Release blocker: a record containing source text or free text (EDU 11.3: events carry no code). |
| Definition of done | Tests green; `ARCH` and `PORTABLE` pass (`record.ts` imports `core` only; `src/local` imports no React and no `src/sim`). |
| Verify commands | `TL`; `V src/project/guided/record.test.ts src/local/progress.test.ts src/local/learn-store.test.ts`; `ARCH`; `PORTABLE` |
| Docs, rollback | JSDoc. Revert. |
| Later tasks need | `LearnStore`, `emptyRecord`, the `with*` helpers, `LessonRun` (T-B12-05, 07, 08, 17, 19, 24). |

---

### T-B12-12. `studio` strings for lessons in six languages

| Field | Content |
|---|---|
| Identity | T-B12-12; subsystem i18n; phase B12; priority must; depends on B4 (T-B4-01 creates the `studio` namespace); status not started; group G1 |
| Intent | Problem: Studio chrome has its own namespace and the Guide, gallery, inputs and lens components need strings in `en es fr de zh hi`. Target user: every learner. Story: as a Spanish reader I see the same lesson UI words I see on the old page. Behaviour: add the keys of section 4.5 to the six `studio.json` files, copying existing translations from `boardlab.json` where the words match. Metric: the namespace parity test passes; no key is English-only except those listed in `docs/LESSONS.md`. |
| Existing files | `src/i18n/messages/<lang>/boardlab.json` (checks, failures, assembly, wire, lesson tabs: six-language copy to reuse); `src/i18n/messages/<lang>/studio.json` (T-B4-01); `src/i18n/namespaces.ts:4` (`NAMESPACES`); `src/i18n/messages.test.ts:1-30` (parity: same keys and placeholders in every language) |
| New files | Edit the six `studio.json` files (one set); new test `src/i18n/studio-lesson.test.ts` |
| Data model | Keys exactly as listed in section 4.5, prefix `lesson.`. The agent writes the full key list in the commit message. Placeholders: `{n}`, `{total}`, `{tier}`, `{done}`, `{passed}`, `{volts}`, `{ma}`, `{label}`, `{value}`, `{title}`. |
| Algorithm | For each key, find the nearest existing string in `boardlab.json` (same words), copy its six translations and fix the placeholder names. For a new sentence write all six, mark it in a `NEEDS_NATIVE_READ` list inside the test file so T-B12-27 copies it to the docs. |
| Validation, errors, edge cases | No value contains an em dash, the words "validated" or "certified", or HTML. Plural forms use a separate key per form, as the repo does now. Chinese and Hindi strings may be longer or shorter; no layout assumption. |
| Permissions, performance, migration | Static JSON; adds about 6 KB per language (ESTIMATED). |
| Unit tests | `studio-lesson.test.ts` (`// @vitest-environment node`): every `lesson.*` key exists in all six files with the English placeholders; banned words and em dash scan over the English values; and, for every `t("lesson.…")` literal found by regex in `src/components/studio/**/*.tsx`, the key exists in English (the scan matches nothing until the components land and then guards them). |
| Integration tests | The existing parity test in `messages.test.ts`. |
| Fixtures | None. |
| Acceptance | **Given** the key `lesson.completion.open.edit`, **When** a user picks Hindi, **Then** the Guide dock shows the Hindi sentence (checked by T-B12-24). |
| Observability, release blockers | A missing key throws at render time in the repo's `t()`; the scan test prevents it. |
| Definition of done | `I18N` passes. |
| Verify commands | `TL`; `I18N` |
| Docs, rollback | `NEEDS_NATIVE_READ` list goes to `docs/LESSONS.md` in T-B12-27. Revert. |
| Later tasks need | The key names (T-B12-10, 11, 17 to 21). |

---

### T-B12-05. Guided engine: gates, completion, the edit rule

| Field | Content |
|---|---|
| Identity | T-B12-05; subsystem LABS, guided mode; phase B12; priority must; depends on T-B12-02, T-B12-04; status not started; group G2 |
| Intent | Problem: today a lesson is "done" after one click of Run (`LessonWorkspace.tsx:149-150`, VERIFIED; EDU 2.2). R-140 asks for a meaningful pass: a real edit, an answered question, passing checks and no fault on. Target user: a learner who should do something before the app says "done". Story: as a learner I see which gates are still open in plain words. Behaviour: a pure function of the project, the plan, the last run and the learner record returns step states and completion. Metric: for the 71 lessons, zero ops give `edit = false` and the A15 ops give `edit = true` and `checks = true` (T-B12-22). |
| Existing files | `EDUCATION.md` 4.3, 4.4, 5.1, 5.2 (binding); the T-B12-02 and T-B12-04 modules in `src/project/guided`. `stateMatches` (`src/lib/interp/checks.ts:67`) and `codeOnly` (`:72`) are not imported: `project` imports `core` only. The mount (T-B12-24) passes `stateMatches` and, as `codeOnly`, `stripComments` from `substance.ts` through `GuideDeps`. |
| New files | `src/project/guided/engine.ts`, `gates.ts`, `edit.ts`; tests beside each (`// @vitest-environment node`) |
| Signatures | Relative `.ts` imports only. `engine.ts`: `export interface GuideDeps extends SubstanceDeps { stateMatches(state: Record<string, unknown>, cond: Record<string, unknown>): boolean; connected(a: PinAddr, b: PinAddr): boolean; partCount(definition: string): number; paramValue(parameter: string): { value: unknown; default: unknown } \| undefined; legacyState(): Record<string, unknown> \| null; diagnosisCorrect?(): boolean \| null }` `export type GuideRun = { tests: Record<string, Record<string, boolean>>; at: string; tier: Tier } \| null;` (named `GuideRun` because B4's `RunView` in `src/studio/stores/run.ts` is a different type) `export function toGuideRun(run: LessonRun \| null): GuideRun;` `export interface HistoryView { startRevision: number; localActor: string; ops: { revision: number; actor: string; kind: string }[] }` `export interface GuideInput { project: Project; plan: GuidedPlan; record: LearnerRecord \| undefined; run: GuideRun; activeFaults: readonly string[]; history: HistoryView }` `export type StepState = { index: number; state: 'notStarted' \| 'current' \| 'done' \| 'blocked'; by: 'gate' \| 'manual' \| null }` `export function evaluateSteps(i: GuideInput, d: GuideDeps): { steps: StepState[]; flips: number[] }` (`flips` are indexes that became done in this call and must be written to the record by the caller) `export type OpenReason = 'edit' \| 'quiz' \| 'checks' \| 'fault' \| 'steps' \| 'goal' \| 'diagnosis'` `export interface CompletionResult { complete: boolean; gates: Record<CompleteGate, boolean \| null>; open: OpenReason[]; warnings: string[]; editFlip: boolean }` `export function evaluateCompletion(i: GuideInput, d: GuideDeps): CompletionResult` (`editFlip` is true when the edit gate is true now and `record.editedAt` is not yet set; the caller writes `withEdited`). `edit.ts`: `export const EDIT_OP_PREFIXES = ['source.', 'component.', 'net.', 'wire.', 'param.'] as const;` `export function isEdited(i: GuideInput, d: GuideDeps): boolean` `gates.ts`: `export function evaluateGate(g: StepGate, i: GuideInput, d: GuideDeps): boolean \| 'blocked'` |
| Data model | Reads `plan.gates`, `plan.complete`, `plan.tests`, `plan.goalTest`, `plan.starterSubstanceHash`; reads `record.steps`, `record.quiz`, `record.completion`. Writes nothing (the caller does). |
| Algorithm | **Steps.** A step already in `record.steps` is `done` (latched, EDU 11.2 `by`). Otherwise its gate decides: `manual` never flips; `check` flips when `run.tests[test][check] === true`; `edit` when `isEdited`; `param` when value differs from default; `net` connected or apart through `d.connected`; `part` when `d.partCount(definition) >= min`; `quiz` when `record.quiz[quiz]` has an answer; `fault injected` when `activeFaults` is non-empty (latched by the caller), `fault cleared` when a fault step earlier is done and `activeFaults` is empty; `legacy-state` when `d.legacyState()` is non-null and `d.stateMatches(state, cond)`. If `legacyState()` is null, or a `check` gate names a test whose last run reported `needs-analog`, the gate is `blocked`. The current step is the first not done; steps after it are `notStarted`. **Completion.** `checks`: every check of every test in `plan.tests` passed in `run` (visible and hidden) and `activeFaults` is empty (today's rule). `edit`: `isEdited`. `quiz`: at least one answer recorded in any quiz (correct or not). `goal`: the goal test passes, `null` when `plan.goalTest` is absent. `steps`: every step done. `diagnosis`: `d.diagnosisCorrect?.() ?? null`. `complete` when every gate in `plan.complete` is `true`; `null` gates are skipped. **Edit rule (EDU 5.2, with the hash of section 4.6):** `isEdited = record?.editedAt !== undefined \|\| (substanceHash(project, d) !== plan.starterSubstanceHash && history.ops.some(o => o.revision > history.startRevision && o.actor === history.localActor && EDIT_OP_PREFIXES.some(p => o.kind.startsWith(p))))`. Both clauses of the second branch are needed: the op clause rejects a remote actor, a restore or an import; the hash clause rejects an edit that was undone and comment-only edits. The first branch is the latch (review fix 10): once the caller has stamped `editedAt`, op compaction (1,000 ops, PDM 5.15) cannot reopen the gate. An edit made and undone between two evaluations (200 ms apart) is never seen, which is the intended result; an edit that was seen and then undone stays counted. |
| State transitions | Step: `notStarted` to `current` to `done` (never back). Completion: open to complete; a later fault turning on does not un-complete a record (the record is a log). |
| Validation, errors, edge cases | No `starterSubstanceHash` in the plan: the `edit` gate is `null` and `evaluateCompletion` adds the string "plan has no starterSubstanceHash" to `warnings`. `EDIT_OP_PREFIXES` is a PROPOSAL (EDU names `source.edit`, `component.*`, `net.*` and `param.set`; `wire.*` is added because wiring changes nets); Amar confirms (section 9, Q5). A history with 1,000 retained ops (PDM 5.15) is scanned once. |
| Permissions, performance, migration | Pure; all inputs injected; evaluates 64 gates plus a 20 KB project hash in under 5 ms (ESTIMATED; the hash is the cost, so the dock debounces it 200 ms, EDU 4.3). No migration. |
| Unit tests | `gates.test.ts`: one case per gate kind true and false, plus `blocked`. `edit.test.ts`: zero ops false; a `source.edit` that only adds a comment false (hash equal); `delay(500)` to `delay(200)` true; an edit then its undo, evaluated only after the undo, false; an edit evaluated, latched in the record, then undone stays true; a record with `editedAt` and an empty history (compacted) is true; a remote actor's `source.edit` false; a `param.set` that changes the default true. `engine.test.ts`: lesson default `['checks','edit','quiz']` (open reasons in order edit, quiz, checks), a fault on keeps `checks` open with reason `fault`, tour `['steps']` with latched `fault` and `legacy-state` gates, `flips` lists only new indexes, `editFlip` true once, `warnings` filled for a plan without `starterSubstanceHash`, `toGuideRun` maps a `LessonRun`. |
| Integration tests | Real example: `lesson-uno-r3-button.project.json` with a plan from T-B12-06 once it lands (a test in T-B12-22). |
| Fixtures | Small hand-built projects in the test files. |
| Acceptance | **Given** the untouched Blink lesson with passing checks, **When** completion is evaluated, **Then** `complete` is false and `open` is `['edit','quiz']`. **Given** the learner changes `delay(500)` to `delay(250)`, runs, and answers one question, **Then** `complete` is true. |
| Observability, release blockers | `open` reasons feed the completion line and the learning events (`code.changed` fires when `editFlip` is true). A completion without a real edit is a release blocker (the verified defect). |
| Definition of done | Tests green; `PORTABLE` and `ARCH` green (the folder imports `core` only). |
| Verify commands | `TL`; `V src/project/guided`; `PORTABLE`; `ARCH` |
| Docs, rollback | `docs/LESSONS.md` (T-B12-27) lists the gate kinds. Revert. |
| Later tasks need | `evaluateSteps`, `evaluateCompletion`, `GuideDeps`, `GuideRun`, `toGuideRun`, `StepState` (T-B12-17, 20, 21, 22, 24). |

---

### T-B12-06. Converter: close the gaps, emit the plan

| Field | Content |
|---|---|
| Identity | T-B12-06; subsystem converter; phase B12; priority must; depends on T-B12-01 (the Fix list), T-B12-02 and the Fix-list sub-tasks T-B12-06a.. (G1b); B2 converter modules; status not started; group G2 |
| Intent | Problem: finding F1. The converter is built in B2, but untested on 102 items, and it emits no guided plan and no wire lists. The gaps the spike finds are fixed by the G1b sub-tasks; this task adds the plan. Target user: T-B12-09a and the four conversion tasks. Story: as the build I want `npm run templates` to produce valid lesson and tour projects with a plan and starter hashes. Behaviour: emit the plan and the wireables for every board item. Metric: all 71 lessons and 12 tours convert with zero error diagnostics; each carries a valid plan (`validatePlan` returns no `error`). |
| Existing files | `src/project/convert/lesson.ts`, `guide.ts`, `text.ts` (T-B2-19); `circuit.ts`, `interfaces.ts`, `types.ts` (T-B2-14); `index.ts` (`convertAll`, T-B2-20c); `scripts/convert-catalogue.mjs` and `scripts/convert-io.mjs`; `src/project/convert/corpus.manifest.json` (committed by T-B2-21; `npm run corpus -- --check` compares against it); `src/project/guided/*` (T-B12-02); the T-B12-01 report; `EDUCATION.md` 10.1, 10.2; `PROJECT_DATA_MODEL.md` 11.3; the example `lesson-uno-r3-button.project.json` |
| New and edited files | Fix list gate: this task starts only when the Fix-list sub-tasks T-B12-06a, 06b ... (G1b) are committed. The orchestrator writes them from the "Fix list grouped by converter file" in the T-B12-01 report before G1b starts, each with at most 5 source files, its own verify line (`TL`, `V src/project/convert`, `SCHEMA`, `PORTABLE`, `npm run corpus -- --check`) and, when it changes converter output, the regenerated manifest as one of its files. If the Fix list is empty there are no sub-tasks. This task itself: new `src/project/convert/plan.ts`; edit `src/project/convert/index.ts` (call `lessonPlan`, `tourPlan`, `withPlan`, `withWireables` for board items), `scripts/convert-catalogue.mjs` (pass `PlanDeps`), and regenerate `src/project/convert/corpus.manifest.json`. Four files. Tests beside the files. |
| Signatures | `plan.ts` imports `../guided/*.ts` and `core` only. `export type PlanDeps = SubstanceDeps` (the script passes `sha256` and `canonical` from `src/core` and `stripComments` from `src/project/guided/substance.ts` as `codeOnly`; all three load under plain Node) `export function lessonPlan(project: Project, lesson: { level: string; board: string }, deps: PlanDeps): GuidedPlan` `export function tourPlan(project: Project, deps: PlanDeps): GuidedPlan` `export function withPlan(project: Project, plan: GuidedPlan): Project` (sets `ext["x-iynk-guided"]`, keeps other `ext` keys) `export function withWireables(project: Project, ext: WireablesExt): Project` (sets `ext["x-iynk-wireables"]`) |
| Data model | **Lesson plan (EDU 10.2):** `{ v: 1, mode: 'guided', rung: 'lesson', skill: [level, board], gates: [], complete: ['checks','edit','quiz'], tests: <all test ids>, starterTokensSha256, starterSubstanceHash }`. Gates stay empty because prose steps cannot be mapped to checks automatically (EDU 10.1: ESTIMATED 5 to 15 minutes per lesson by hand, not built). **Tour plan:** `{ v: 1, mode: 'guided', rung: 'demo', skill: ['tour', board], gates, complete: ['steps'], tests: [] }` where for each `guide.assembly[i]`: `kind 'break'` gives `{ step: i, kind: 'fault', state: 'injected' }`; any other step with a non-empty `done` gives `{ step: i, kind: 'legacy-state', cond: done }`; any other step gives no gate (manual). 134 board assembly steps are covered in all (VERIFIED count, PDM 11.1). `starterTokensSha256 = sha256(tokenStream(entry source))`; `starterSubstanceHash = substanceHash(project)` computed on the project as converted (before any fork). The hidden `ext["x-iynk-solution"]` of a task is untouched. **Wireables (decided, section 4.7):** `ext["x-iynk-wireables"] = WireablesExt` with `{ v: 1, items }`, all of the board's `Wireable[]` on a tour and, on a lesson, only those `lessonWireables` keeps for the lesson's pins (the rule at `src/components/boardlab/WireInPanel.tsx:36`: signal pins must all be among the lesson's pins; power pins matched by `POWER_PIN`, `:33`). Text keys are resolved to `Text` like every other string. A project whose wireables fail `validateWireables` fails the conversion. |
| Algorithm | (1) The G1b sub-tasks have applied the Fix list. (2) After a project is built, `index.ts` calls `lessonPlan` or `tourPlan` and `withPlan`, and `withWireables` when the board has any. (3) `scripts/convert-catalogue.mjs` passes `PlanDeps`: `sha256` and `canonical` from `src/core`, `stripComments` from `src/project/guided/substance.ts`; the script already loads `src/project/convert/index.ts` by Node type stripping, and the catalogue only through `scripts/convert-io.mjs`. (4) Re-running gives byte-identical output (deterministic: no clock, no random; timestamps come from the catalogue commit date, B2 rule). (5) The manifest is regenerated: `npm run corpus` writes `.corpus/manifest.json`; copy it to `src/project/convert/corpus.manifest.json`; then `npm run corpus -- --check` exits 0. Adding `ext` plans changes the manifest, so skipping step 5 fails B2's check. |
| Validation, errors, edge cases | A project that fails `validatePlan` with an error fails the conversion with the item id. A tour with no assembly steps (UNKNOWN whether one exists) gets `gates: []` and `complete: ['steps']`, which is complete at once; the test lists such tours. A lesson on the bare board (14 of 71) has no nets and a plan like any other. |
| Permissions, performance, migration | Pure mapping; `scripts/` does the file reading. Whole-catalogue run stays under the B2 time (ESTIMATED 10 s). No data migration. |
| Unit tests | `plan.test.ts`: lesson plan fields for the Uno `button` example; tour plan for a fixture with one break step and two legacy-state steps; `withPlan` keeps `x-iynk-solution`; `withWireables` writes a value that `validateWireables` accepts; hashes stable across two runs. |
| Integration tests | `src/project/convert/plans.test.ts` (node env): run the converter in memory for all 71 lessons and 12 tours; assert 0 error diagnostics and `validatePlan` clean (no issue with `severity: 'error'`); assert 83 projects. The count 83 is asserted, not trusted. The plan of the example `lesson-uno-r3-button.project.json` equals the plan the converter emits for the `button` lesson. |
| Fixtures | The existing example file; two small catalogue-shaped fixtures. |
| Acceptance | **Given** the board `uno-r3`, **When** the converter runs, **Then** 16 lesson projects and 1 tour validate, each with a plan, and the `button` lesson's nets are the five of PDM 11.4. |
| Observability, release blockers | The conversion report (B2 T-B2-20) gains a column `plan`. A converted project that fails V1 to V5 blocks T-B12-13 to 16 and goes back to a new Fix-list sub-task. |
| Definition of done | Tests green; `SCHEMA` green; the manifest regenerated and `npm run corpus -- --check` exit 0. |
| Verify commands | `TL`; `V src/project/convert src/project/guided`; `SCHEMA`; `PORTABLE`; `ARCH`; `npm run corpus` then copy `.corpus/manifest.json` to `src/project/convert/corpus.manifest.json`, then `npm run corpus -- --check` (exit 0). The command `node scripts/convert-catalogue.mjs --check` is the same script that `npm run corpus -- --check` runs; B2 names no other check command |
| Docs, rollback | JSDoc. Revert (the B2 output returns). |
| Later tasks need | `withPlan`, `withWireables`, plans and wire lists in every converted project (T-B12-09a, 13 to 16, 20, 22). |

---

### T-B12-07. Run a project's tests as a lesson: job builder and runner

| Field | Content |
|---|---|
| Identity | T-B12-07; subsystem LABS, run path; phase B12; priority must; depends on T-B12-01, T-B12-04 (`Tier`, `LessonRun`); B3 (T-B3-13, T-B3-15), B5 (T-B5-09), B9 (T-B9-23); status not started; group G2 |
| Intent | Problem: R-141 says the existing check engine runs a project's checks with the same verdicts. T-B5-09 gives `checkJobFor(state, testId, boardId)` for author checks; lessons need more: the lesson world's input devices, scripted events, variant, `deviceSource: 'library'`, Verilog `ports` and `params`, the empty-program starter run and all tests in one call. Target user: the guide dock and the FA-14 gate. Story: as the gate I want one function that runs a lesson project the way the old page ran the lesson. Behaviour: build the job, run it, return verdicts per check id. Metric: for the Uno `button` example the job equals the old `lessonJob` field by field. |
| Existing files | `src/components/studio/checkJob.ts` (`checkJobFor`, `boardPinsFor`, T-B5-09; the file is UI wiring because `studio` may not import `lib/interp`, and so are the two files below); `src/studio/checks.ts` (`BoardPins`); `src/lib/interp/check-job.ts:30, 38, 47, 52` (`runChecks`, `boardNets`, `lessonVariant`, `lessonJob`); `check-client.ts:26` (`startChecks`); `headless.ts:12-40` (`INTERP_LANGUAGE`, `HeadlessOptions`: `board`, `variant`, `language`, `source`, `world`, `runMs`, `logicV`, `nets`, `ports`, `params`); `src/project/legacy-names.ts` (T-B2-13, pin id to legacy net name); `src/studio/fidelity/static-tier.ts` (T-B4-15); `src/project/guided/record.ts` (`LessonRun` and friends) |
| New files | `src/components/studio/lessonJob.ts`, `src/components/studio/lessonChecks.ts` (next to `checkJob.ts`); tests beside each |
| Signatures | `lessonJob.ts`: `export type JobError = 'no-source' \| 'no-board' \| 'unsupported-language' \| 'unknown-test';` `export interface LessonJobOpts { testId?: string; source?: string }` (`source` replaces the entry source: used for the empty-program run) `export function lessonJobFor(project: Project, opts?: LessonJobOpts): CheckJob \| { error: JobError };` `lessonChecks.ts`: `CheckVerdict`, `TestRun` and `LessonRun` are defined in `src/project/guided/record.ts` (T-B12-04) and re-exported here, so `studio` code can use them without importing a UI file. `export interface RunDeps { run(job: CheckJob, onProgress?: (fraction: number) => void): { result: Promise<CheckOutcome>; cancel(): void }; now(): string; tierOf(project: Project): Tier }` `export function runLessonTests(project: Project, deps: RunDeps, opts?: { source?: string; onProgress?: (fraction: number) => void }): { result: Promise<LessonRun>; cancel(): void }` `export const inlineRun: RunDeps['run']` (wraps `runChecks` for node tests) |
| Data model | Input is the project: `tests[].{id, runMs, script?, checks[]}`, `simulation.world.{inputs, script}`, `boards[0].variant`, `sources[]` entry with `role: firmware`, `firmware.ports`, `firmware.top`, `parameters[]` for Verilog `params`. Output verdicts keep the check `id` and `visibility`, in `tests[]` then `checks[]` order. |
| Algorithm | (1) Call `checkJobFor` and `boardPinsFor` from `./checkJob` (T-B5-09, reused, not copied); if `checkJobFor` returns an error, return it. (2) Complete the job: `world.inputs` from `simulation.world.inputs` with `pins` mapped from pin addresses to net names through `legacy-names`; `world.script` from the test's `script` or the world's; `logicV` from the board descriptor; `nets` equal to `boardNets` for the board (a test proves equality for all 12 boards); `ports`, `top` and `params` for Verilog; `variant` from `boards[0].variant`; `deviceSource: 'library'` whenever any input has a device model (finding F9; the field name is T-B9-23's, Step 0). (3) Run each test in order with `deps.run`; one `TestRun` per test; a hidden check is evaluated like a visible one and carries `visibility`. (4) `tier = deps.tierOf(project)`. (5) `passedAll` is true when every verdict is `ok` and no `TestRun.error`. |
| State transitions | `idle` to `running` (progress 0..1, cancellable) to `done` or `limit`. Cancelling resolves with the verdicts so far and `limit: false`. |
| Validation, errors, edge cases | `CHECK_BUDGET_MS` (20,000, `check-job.ts:11`) applies per test; on limit the `TestRun` has `limit: true` and no verdicts. A check of kind `node-voltage` or `supply-current` gets `ok: false` with `detail: 'needs-analog'` (T-B5-09 behaviour), not a throw. A project with no firmware source returns `no-source`. A Verilog project with a pin-based check returns the checks that can run and `unsupported-language` detail for the rest (T-B5-09 rule). |
| Permissions, performance, migration | Runs in the check worker (`startChecks`) in the app and in-thread in tests (`inlineRun`, the same function the worker calls). Reference run times from the baseline: 27.8 s for 102 runs unloaded, slowest ESP32 web lessons 2.3 to 2.7 s (SIM line 1907). No migration. |
| Unit tests | `lessonJob.test.ts`: the Uno `button` example job equals `lessonJob(board, lesson, reference)` for `board`, `variant`, `language`, `source`, `runMs`, `logicV`, `nets`, `ports` and `world.inputs[].{id, quantity, device, pins, min, max, step, default}` and `world.script`; `nets` equal to `boardNets` for each of the 12 boards; each error code with a crafted project. `lessonChecks.test.ts`: verdict order and ids; hidden check evaluated; `needs-analog`; cancel; limit. |
| Integration tests | Three real lessons through `inlineRun`: `uno-r3` `button` (4 checks), `esp32-devkitc` a web lesson (network device), `basys3` a Verilog lesson (ports): reference all `ok`, empty program not all `ok`. |
| Fixtures | The three converted lessons from the T-B2-20 corpus (not the committed templates, which do not exist yet). |
| Acceptance | **Given** the converted `button` lesson, **When** `runLessonTests` runs with its source, **Then** 4 verdicts, all `ok`, `passedAll` true; with `source: 'void setup() {}\nvoid loop() {}\n'` at least one `false`. |
| Observability, release blockers | `TestRun.ms` per test (feeds the budget view of T-B12-27). A job field that differs from the old job and is not in the spike's explained list is a release blocker for T-B12-23. |
| Definition of done | Tests green; layering test green (these two files are UI wiring, the only B12 files that import `@/lib/interp` for lessons; they import no `src/sim`). |
| Verify commands | `TL`; `V src/components/studio/lessonJob.test.ts src/components/studio/lessonChecks.test.ts`; `ARCH` |
| Docs, rollback | JSDoc. Revert. |
| Later tasks need | `lessonJobFor`, `runLessonTests`, `inlineRun` (T-B12-10, 17, 19, 22, 23, 24); `LessonRun` from `src/project/guided/record.ts`. |

---

### T-B12-08. Progress import from `iynk:v1` and one store behind `src/lib/progress`

| Field | Content |
|---|---|
| Identity | T-B12-08; subsystem LABS, progress; phase B12; priority must; depends on T-B12-04 and T-B12-09a (the template index gives `stepCount`); status not started; group G4 |
| Intent | Problem: finding F7. Two writers would split progress, and R3 of the card is "progress is lost in migration". Target user: Amar and friends with lessons already marked done. Story: as a returning learner my done lessons are still done in the old page, in Studio and on the home dashboard. Behaviour: a one-time idempotent import of board `done` keys into learner records, and a facade so `src/lib/progress` reads and writes board keys through the one store. Metric: counts of imported keys by prefix equal the old counts (EDU A8). |
| Existing files | `src/lib/progress/storage.ts:5` (`STORAGE_KEY`), `:60` (`migrate`), `:113-181` (read, cache by raw string, write, `subscribeSaved`); `progress.ts:8` (`markDone`), `:17` (`count`), `:66` (`resetProgress`); `keys.ts:3-26`; `hooks.ts:12-36`; `src/components/shell/dashboard/data.ts:53-58`; `src/components/boardlab/LessonWorkspace.tsx:149-150`, `AssemblyPanel.tsx:53`; `EDUCATION.md` 11.4 |
| New and edited files | New `src/lib/learn/legacy-import.ts`, `src/lib/learn/facade.ts`; edit `src/lib/progress/storage.ts`, `src/lib/progress/progress.ts`; tests beside them. No other old file is edited: the dashboard, pickers and sound moments keep calling `progressKey` and `useDone`. |
| Signatures | `facade.ts`: `export function projectIdForKey(key: string): { projectId: string; kind: 'lesson' \| 'assembly' } \| null` (`board:uno-r3:lesson:blink` to `prj_uno-r3-blink`; `board:uno-r3:assembly` to `prj_uno-r3-tour`; robotics and drone keys return null) `export function keyForProject(projectId: string): string \| null` `export function learnStore(): LearnStore` (lazy singleton: `createLearnStore(createProgressRepo(await idbLearnKv()))` from `src/local/progress.ts` and `learn-store.ts`, with `memoryLearnKv()` when IndexedDB is missing) `export function boardDone(snapshot: ReadonlyMap<string, LearnerRecord>): Record<string, true>` `legacy-import.ts`: `export const IMPORT_MARKER = 'iynk:v1:imported';` `export interface ImportReport { imported: number; skipped: string[]; byPrefix: Record<string, number> }` `export function importLegacyProgress(deps: { storage: Pick<Storage, 'getItem' \| 'setItem'>; store: LearnStore; flush(): Promise<void>; recordCount(): Promise<number>; now(): string; stepCount(projectId: string): Promise<number \| null> }): Promise<ImportReport>` |
| Data model | `iynk:v1` is `{ v, done: Record<string, true>, quiz, best, settings }` (VERIFIED `storage.ts:23-29`). Mapping (EDU 11.4): `board:<b>:lesson:<l>` becomes a record for `prj_<b>-<l>` with `completion { at, legacy: true, gates: { checks: true, edit: null, quiz: null, goal: null }, tier: 'T0', sourceSha256: '', hintsMax: 0, engineVersions: {} }` and `legacy: true`; `board:<b>:assembly` becomes the record for `prj_<b>-tour` with every step `{ doneAt, by: 'manual' }` using `stepCount`. Robotics and drone keys, `quiz`, `best` and `settings` are not touched (finding F10: no board quiz was ever stored). The marker value is `{ at, count }`. |
| Algorithm | (1) If the marker exists, return an empty report. (2) Read and `migrate` the document (`storage.ts:60`). (3) For each board `done` key, map it; a key whose project id has no template (`stepCount` returns null) is skipped and listed. (4) `store.update` for each; `await flush()`. (5) Read back: `recordCount()` must be at least `imported`; only then write the marker. (6) Never delete or edit `iynk:v1` (left for one release, EDU 11.4). **Facade:** the old `iynk:v1` `done` keys stay the answer until the marker exists and `learnStore().ready` has resolved. `getSaved()` then returns the stored document with `done` replaced for board keys by `boardDone(learnStore().snapshot())`, cached on the pair (raw string, snapshot identity); before `ready` the snapshot is empty, so using it would show every board lesson as not done on the second load. `subscribeSaved` also subscribes to the learn store and fires once when `ready` resolves, so mounted components re-read. `markDone(boardKey)` always writes the old key as today (nothing is lost) and, when the store is not ready, queues the learn-store write behind `ready` instead of dropping it; once ready it writes a legacy completion record if none exists. `resetProgress(prefix)` removes records for a board prefix. All other keys follow the old path. **`stepCount` is lazy:** the facade passes `async (id) => (await import("../../../content/projects")).TEMPLATES.find((t) => t.id === id)?.stepCount ?? null`, a dynamic import, so the 83-entry index stays out of the main bundle of every page that imports `src/lib/progress`. |
| State transitions | `not imported` to `imported` (marker) once; the facade is on from the first successful import. If the import throws, the marker is absent, the old path still serves board keys, and the import retries on the next load. |
| Validation, errors, edge cases | A hand-edited document with a non-boolean `done` value is ignored as `normalize` already does (`storage.ts:74`). Storage blocked (private window): the import is skipped, the facade is off, the old path is used, nothing is lost. A key for a lesson of a board with no template is listed in the report. Running the import twice never creates a second record. A user who completes a lesson in Studio gets a full record (`legacy` absent); the old page then reads it as done. |
| Permissions, performance, migration | Local only. The import runs once, under 50 ms for 100 keys (ESTIMATED). The old key stays (backup). |
| Unit tests | `facade.test.ts`: key and id round trips for all 71 lessons and 12 tours (ids from the catalogue); robotics keys null. `legacy-import.test.ts`: 3 lesson keys and one assembly key import; counts by prefix equal; marker written only after read-back; a failing `flush` leaves no marker; second run imports 0; unknown lesson skipped and listed; `iynk:v1` unchanged byte for byte. `storage.test.ts` addition (old test file edited): with the facade on, `getSaved().done` has the board keys and `useDone` re-renders on a store update; `progress.test.ts` addition: `markDone(boardKey)` creates one legacy record. Marker present and store not ready: `getSaved().done` equals the old `iynk:v1` keys, and a `markDone` before `ready` is written to both the old key and, after `ready`, the store. A bundle test (`import()` is dynamic) asserts `facade.ts` has no static import of `content/projects`. |
| Integration tests | `src/components/shell/dashboard/DashboardProgress.test.tsx` (existing) still passes with a seeded learn store. |
| Fixtures | A saved document with 5 board keys, 2 robotics keys, 1 quiz, settings. |
| Acceptance | **Given** `iynk:v1` with `board:uno-r3:lesson:blink` done, **When** the app loads twice, **Then** the old page, the Studio gallery and the dashboard all show Blink done, and `iynk:v1` still holds the key. |
| Observability, release blockers | The `ImportReport` is logged to the console in development only. Loss of a done flag is a release blocker (R3). |
| Definition of done | Tests green; the 12 old Playwright tests of `e2e/boardlab.spec.ts` still pass (T-B12-24 runs them). |
| Verify commands | `TL`; `V src/lib/learn src/lib/progress src/components/shell/dashboard` |
| Docs, rollback | `docs/LESSONS.md` has a "progress" section (T-B12-27). Revert restores the old path; records stay in IndexedDB unused. |
| Later tasks need | `learnStore()`, the facade, the marker (T-B12-17, 18, 24, 26). |

---

### T-B12-09a. Template build script and index

| Field | Content |
|---|---|
| Identity | T-B12-09a; subsystem LABS, templates; phase B12; priority must; depends on T-B12-06; status not started; group G3 |
| Intent | Problem: R-139 wants every board lesson as a template. The 83 converted files must be committed data, reproducible, and checked in `npm run check`. Target user: the four conversion tasks, then every gallery user. Story: as a builder I run one script per group and a check mode tells me when a file was edited by hand. Behaviour: a generator with a check mode that reads each group's board list from data, an index, and a package script. Metric: `npm run templates:check` exits 0 on a clean tree, including while every group is still empty, and exits 1 after a hand edit to any template file or group index. |
| Existing files | `scripts/convert-catalogue.mjs` and `scripts/convert-io.mjs` (B2: the pattern for loading under plain Node. `src/project/**` files with relative `.ts` imports load by Node type stripping; the catalogue loads only through `convert-io.mjs` `loadItem` and `loadTexts`, which call `gen-content-index.mjs --emit`. Node cannot import `src/content/boards/*.ts` (extensionless imports, no `@/` alias), the reason B5 generates its starters in a Vitest update-mode test, `tasks/B5-studio-all-boards.md` line 155); `src/project/convert/index.ts` (`convertAll`, with the plan from T-B12-06); `src/project/guided/substance.ts` (`stripComments`); `src/core` (`canonical`, `sha256`); `package.json` scripts (the `check` line, VERIFIED) |
| New and edited files | New `scripts/build-templates.mjs`, `content/projects/index.ts` and four empty `content/projects/boards/{arduino,esp,other,fpga}/index.ts` (one set); edit `package.json` (with the lockfile if it changes). Four source files. Test: `scripts/build-templates.test.mjs`. |
| Signatures | `scripts/build-templates.mjs --group <arduino\|esp\|other\|fpga> [--check]` and `--all [--check]`. For a group it reads `content/projects/boards/<group>/boards.json` (`{ "boards": [...] }`, section 4.1; written by the conversion task of the group; a missing file or an empty list is an empty group), converts those boards in memory through `convertAll`, writes `content/projects/boards/<group>/<id>.project.json` as canonical JSON plus a trailing newline, and the group `index.ts` (shape of section 4.1). The script holds no board list of its own. A board id in `boards.json` that the catalogue does not have exits 1. `package.json`: `"templates": "node scripts/build-templates.mjs --all"`, `"templates:check": "node scripts/build-templates.mjs --all --check"`, and `check` becomes `npm run content:check && npm run templates:check && npm run typecheck && ...`. `content/projects/index.ts` is hand-written: `TEMPLATES` (the four group arrays concatenated) and `loadTemplate(id)` (rejects with `TemplateNotFound`); the entry type comes from `@/project/guided/plan` (T-B12-02). |
| Data model | Section 4.1. `title` is the project's `meta.title` as a `LocalizedText`; `order` is `guide.order`; `stepCount` is the length of `guide.steps` or `guide.assembly`. |
| Algorithm | The script converts the group's boards in memory, sorts by `guide.order`, writes files, and in `--check` mode compares bytes with the files on disk and with the group index. It never writes outside `content/projects/boards/<group>/` and never edits `boards.json`. |
| State transitions | None. |
| Validation, errors, edge cases | `loadTemplate` of an unknown id rejects with `TemplateNotFound`. `--group` with an empty or missing board list writes an empty index. A converted project that fails V1 to V5 exits 1 with the item id. Step 0 records how `moduleOf` in `src/architecture.test.ts` classifies root `content/` (section 3.4). |
| Permissions, performance, migration | The script runs offline. `--all --check` under 30 s (ESTIMATED; it runs the converter on 71 lessons and 12 tours). No data migration. |
| Unit tests | `build-templates.test.mjs`: the generated text for a one-board fixture is stable twice; `--check` fails after one byte is changed in a project file or the index; the index lists the files in `guide.order`; a missing `boards.json` and an empty list both give an empty index and exit 0; an unknown board id exits 1. |
| Integration tests | With empty groups `TEMPLATES` is `[]`, `npm run typecheck` passes and `npm run templates:check` exits 0. After T-B12-13 to 16 the count is 83 (asserted there). |
| Fixtures | A one-lesson catalogue fixture under `scripts/__fixtures__/`. |
| Acceptance | **Given** a clean tree, **When** `npm run templates:check` runs, **Then** exit 0. **Given** one byte changed in a generated file, **Then** exit 1. |
| Observability, release blockers | The script prints counts per group. A template file edited by hand is caught by `templates:check`. |
| Definition of done | Tests green; `npm run templates:check` exits 0 on empty groups. |
| Verify commands | `TL`; `V scripts/build-templates.test.mjs`; `npm run templates:check`; `ARCH` |
| Docs, rollback | Header of the script; `docs/LESSONS.md` (T-B12-27). Revert; the `check` script returns to its old line. |
| Later tasks need | The script's `--group` mode and the `boards.json` contract (T-B12-13 to 16), `TEMPLATES` and `loadTemplate` (T-B12-08, 18, 23, 24). |

---

### T-B12-09b. Fork and open a template

| Field | Content |
|---|---|
| Identity | T-B12-09b; subsystem LABS, templates; phase B12; priority must; depends on T-B12-02 (plan types, `substanceHash`); B3 (T-B3-06 library), B4 (T-B4-16 `templates.ts`); status not started; group G3 |
| Intent | Problem: STU 4.3 wants opening a template to fork it, never edit it. Target user: a learner who picks a lesson. Story: as a learner I press Open and get my own copy with a "Start" checkpoint; the template stays as it was. Behaviour: a pure fork function and an open function with everything else injected. Metric: the fork passes V1 to V5 and has the same `substanceHash` as its template. |
| Existing files | `src/studio/templates.ts` (T-B4-16: `STARTERS`, `loadStarter(id, deps)`); `src/local/library.ts` (T-B3-06; reached only through an injected `library`, because `studio` may not import `local`); `src/project/hash.ts` (`stateHash`) and `src/core`; `project.schema.json` `$defs.Checkpoint` and `$defs.History` |
| New and edited files | New `src/studio/fork.ts`; edit `src/studio/templates.ts`. Two files. Tests: `src/studio/fork.test.ts`, `src/studio/templates.test.ts` additions. |
| Signatures | `fork.ts` (imports types only): `export interface ForkDeps { newId(): string; now(): string; actor: string; genesis(id: string): string; stateHash(p: Project): string }` (`actor` is a `usr_` id matching `^usr_[a-z0-9][a-z0-9_-]{0,63}$`, the pattern of `Checkpoint.author`) `export function forkTemplate(template: Project, kind: 'lesson' \| 'tour' \| 'template', deps: ForkDeps): Project;` `export const START_LABEL = 'Start';` `export function withStartCheckpoint(forked: Project, deps: ForkDeps): Project;` `export function templateIdFor(board: string, lesson: string \| 'tour'): string;` (builds `prj_<board>-<lesson>`; it lives here because this file imports types only, so a Server Component such as `OpenInStudio.tsx` can import it without pulling the template index or the library types). `templates.ts` additions (it does not import `content/projects`; the entries and the loader are passed in by UI code): `export interface TemplateQuery { board?: string; level?: string; kind?: TemplateKind }` `export function listTemplates(entries: readonly TemplateEntry[], q?: TemplateQuery): readonly TemplateEntry[];` `export function openTemplate(id: string, deps: ForkDeps & { load(id: string): Promise<Project>; library: { create(p: Project): Promise<string> }; findFork(templateId: string): Promise<string \| undefined> }, opts?: { fresh?: boolean }): Promise<{ projectId: string; created: boolean }>;` (`findFork` reads the learner records of T-B12-04, which hold `templateId`; unless `fresh`, an existing fork is reopened so a learner returns to their own work; the caller navigates to `#/<id>?run=1` or `#/<id>`). `loadStarter` is changed to call `forkTemplate(..., 'template', ...)` so one function holds the fork rules. |
| Data model | Fork rules (STU 4.3 and STU-23, STU-24): new `id`; `revision` 0; `meta.createdAt` and `updatedAt` set to `deps.now()`; `history` reset to `baseRevision 0`, `baseChain = genesis(newId)`, `ops []`, and `checkpoints` holding one named checkpoint `{revision: 0, kind: 'named', label: 'Start', at, author: deps.actor, stateHash, store: 'local-db'}` (the schema allows `store` to be `container` or `local-db` only, review fix 11); `provenance.origin = { kind: 'fork', project: <template id>, revision: <template revision>, stateHash: <template stateHash> }` for lessons and tours and `{ kind: 'template', template: <id> }` for a B4 starter; `ext["x-iynk-solution"]` removed; `ext["x-iynk-guided"]` and `ext["x-iynk-wireables"]` kept; `provenance.thirdParty` kept with `review: unchecked` rows as they are; `exports: []`; `access` and `actors` set to the local actor as owner; `license` kept. |
| Algorithm | `openTemplate` does `deps.load`, `forkTemplate`, `withStartCheckpoint`, `deps.library.create`, and returns the id. |
| State transitions | None beyond the fork result. |
| Validation, errors, edge cases | A forked project must pass V1 to V5; the test asserts it, which also checks the checkpoint `store` and `author` values. Opening a template that already has a fork reopens that fork unless `fresh` is set; the gallery shows the progress of the template id, not of the forks (EDU 11.2 `templateId`). A `load` that rejects with `TemplateNotFound` is passed on. |
| Permissions, performance, migration | Fork is O(size) and under 50 ms for a 100 KB project (ESTIMATED). No data migration. |
| Unit tests | `fork.test.ts`: every rule in the Data model; the template object is deep-equal before and after; the forked hash differs only through the fields the fork changes; `substanceHash` of the fork equals the template's (section 4.6); the "Start" checkpoint `stateHash` equals the fork's hash and its `store` is `local-db`; the fork validates (V1 to V5) with the author taken from a `usr_` id; a lesson with `x-iynk-solution` loses it; `templateIdFor` for a lesson and for `tour`. `templates.test.ts`: `listTemplates` filters; `openTemplate` creates one library row, reopens it on the second call and creates a second one only with `fresh`; `loadStarter` still passes the B4 tests (STU-24). |
| Integration tests | None beyond the unit tests; the first real templates arrive in G4 and are forked in T-B12-22. |
| Fixtures | The example `lesson-uno-r3-button.project.json` as the template. |
| Acceptance | **Given** the `button` lesson template, **When** `openTemplate` runs, **Then** a new project exists with `origin.kind = 'fork'`, a "Start" checkpoint at revision 0, the plan intact, and the template object unchanged. |
| Observability, release blockers | A fork that keeps `x-iynk-solution` is a release blocker. |
| Definition of done | Tests green. |
| Verify commands | `TL`; `V src/studio/fork.test.ts src/studio/templates.test.ts`; `ARCH` |
| Docs, rollback | JSDoc; `docs/LESSONS.md` (T-B12-27). Revert. |
| Later tasks need | `forkTemplate`, `withStartCheckpoint`, `openTemplate`, `listTemplates`, `templateIdFor` (T-B12-17, 18, 22, 24, 26). |

---

### T-B12-10. Inputs dock and live status

| Field | Content |
|---|---|
| Identity | T-B12-10; subsystem Studio run panels; phase B12; priority must; depends on T-B12-07, T-B12-12; B4 (T-B4-13 `RunStore` in `src/studio/stores/run.ts` and `SimLink` in `src/components/studio/wiring/simLink.ts`), B8 (T-B8-06 rails and states), B9 (T-B9-05 board power model); status not started; group G3 |
| Intent | Problem: finding F4. R-142 wants pin states, serial, inputs (button, knob, switch) and live status with current draw in Studio panels, each input with a keyboard path. No earlier task builds the inputs panel. Pin states and serial come from T-B4-13 and T-B4-14. Target user: a learner pressing the lesson's button. Story: as a learner I hold the button or move the knob and see the sketch react. Behaviour: a dock listing the project's world inputs and a status panel. Metric: a button held for 500 ms in the `button` lesson makes D13 go HIGH in the run (e2e, T-B12-24). |
| Existing files | `src/lib/boardlab/inputs.ts:27-33` (`controlFor(input)`: `hold`, `switch`, `slider`, `requests`, `none`; pure; its rules are copied, not imported, because `studio` may not import `src/lib` and that file imports `@/lib/interp`); `src/components/boardlab/WorldPanel.tsx:18-61` (pointer-down/up and key-down/up hold, `aria-pressed`, a range input; behaviour to match); `src/studio/stores/run.ts` (`RunStore`, B4's `RunView.frame`) and `src/components/studio/wiring/simLink.ts` (`SimLink.press`, input path to `SimHost`, T-B4-13; Step 0 checks whether it has a method for a world-input value); `src/components/robotics/StatusPanel.tsx` (the F-052 panel, read for wording only); `src/sim/analog/rails.ts`, `states.ts` (B8, read through the run store's frames, not imported) |
| New files | `src/components/studio/InputsDock.tsx`, `src/components/studio/StatusPanel.tsx`, `src/studio/run/inputs.ts`, `src/studio/run/status.ts`; tests beside each. Edit `src/components/studio/wiring/simLink.ts` (a B4 file) only when Step 0 finds no world-input method on `SimLink`: add `setInput(id: string, value: number): void` and its test. Five files at most. |
| Signatures | `inputs.ts`: `export type InputControl = { kind: 'hold' } \| { kind: 'switch' } \| { kind: 'slider' } \| { kind: 'requests'; requests: { value: number; label: string }[] } \| { kind: 'none' };` `export function controlFor(input: ProjectWorldInput): InputControl;` (the 7-line rule of `src/lib/boardlab/inputs.ts:27-33`, typed on the project's `WorldInput`) `export interface InputSpec { id: string; component: string; quantity: string; control: InputControl; min: number; max: number; step: number; value: number; unit?: string; label: string }` `export function inputsFor(project: Project, locale: string, current: Record<string, number>): InputSpec[];` `export function clampStep(spec: Pick<InputSpec, 'min' \| 'max' \| 'step'>, v: number): number;` `InputsDock.tsx`: `export function InputsDock(props: { specs: InputSpec[]; onSet(id: string, value: number): void; messages: Messages['studio'] })` `status.ts`: `export interface RailsView { supplyMa: number \| null; vin: number \| null; brownout: boolean } \| null` `export type StatusView = { kind: 'ok' \| 'brownout' \| 'unknown'; supplyMa: number \| null }` `export function statusFrom(rails: RailsView): StatusView;` `StatusPanel.tsx`: `export function StatusPanel(props: { view: StatusView; messages: Messages['studio'] })` |
| Data model | Reads `simulation.world.inputs[]` (`id`, `quantity`, `device`, `component`, `pins`, `min`, `max`, `step`, `default`, `unit`, `gesture`, `label`). A live value is run data: `onSet` sends it to the run session as an `input` message that the replay log records (FE 6.6: `input/set` is "a live value is replay data, not an edit"); it never writes the document. |
| Algorithm | `inputsFor` maps each project input to an `InputSpec` and calls its own `controlFor`. `hold`: a button that sets `max` on pointer-down or Space/Enter key-down and `min` on release or blur (matches `WorldPanel.tsx:32-39`); `switch`: a toggle with `aria-checked`; `slider`: an `<input type="range">` with `min`, `max`, `step`; `requests`: one button per request, value is its index; `none`: nothing. `statusFrom(null)` is `unknown`. `brownout` is true when the run's rails report it. The panel text for `unknown` is "Not available at this tier" (honest: no analog result, no number). |
| State transitions | Dock: no run (controls disabled with the note "start the run") to running (enabled). Status: `unknown` to `ok` or `brownout` as rails arrive. |
| Validation, errors, edge cases | A value outside `[min, max]` is clamped to the step grid. A network input with only URL requests renders nothing (`controlFor` rule). Releasing outside the window (pointer cancel) releases the button. A project without inputs shows "This lesson has no inputs" and no controls. |
| Permissions, performance, migration | Local. Sliders send at most one message per animation frame (coalesced). No migration. |
| Unit tests | `inputs.test.ts`: the `button`, `pot` and `network` examples map to `hold`, `slider`, `requests`; clamp; labels in six languages. `InputsDock.test.tsx` also asserts (a UI test may import the old module) that the studio `controlFor` equals `controlFor` from `@/lib/boardlab/inputs` for every world input of the 71 catalogue lessons, so the copy cannot drift. `status.test.ts`: null to unknown; brownout; current rounded to 0.1 mA. `InputsDock.test.tsx` (jsdom): pointer-down sends `max`, up sends `min`; Space down/up does the same; the range changes by keyboard arrows; disabled before a run. `StatusPanel.test.tsx`: three states, text from the studio namespace. |
| Integration tests | With a fake run session, a held button for the `button` lesson sets the input and the next check run (T-B12-07) sees the response. |
| Fixtures | Inputs of the converted `button`, `potentiometer` and an ESP32 web lesson. |
| Acceptance | **Given** the `button` lesson running, **When** I hold the button control with the keyboard, **Then** the run receives value 1 and releasing sends 0. **Given** a run without analog results, **Then** the status panel says it is not available at this tier. |
| Observability, release blockers | Inputs are logged in the replay record by B3; nothing else. A control with no keyboard path is a release blocker (R-142). |
| Definition of done | Tests green; axe clean on the two components in the e2e of T-B12-24. |
| Verify commands | `TL`; `V src/studio/run src/components/studio`; `I18N`; `ARCH` |
| Docs, rollback | `docs/LESSONS.md`. Revert. |
| Later tasks need | `InputsDock`, `StatusPanel` (T-B12-24); B13 reuses both for benches. |

---

### T-B12-11. Figure lens: read-only figure fed by the run

| Field | Content |
|---|---|
| Identity | T-B12-11; subsystem Studio, figure lens; phase B12; priority must; depends on T-B12-06, T-B12-12; B1 (figure policy, `public/figures` produced-only test), B4 (T-B4-06 art); status not started; group G3 |
| Intent | Problem: finding F4. R-144 keeps the hand-inked figure as the visual library and STU 8.6 gives converted lessons a read-only lens until a Studio view replaces them; no earlier task builds it. The lens also supplies the figure state that the 134 `legacy-state` assembly gates read. Target user: a learner who liked the isometric picture. Story: as a learner I open "Show the figure" and see the same board and breadboard circuit reacting to my run. Behaviour: an embedded `FigureFrame` fed only by run output and project parameters. Metric: for the `blink` lesson the figure's LED follows D13 within one frame of the pin change (jsdom with a fake handle). |
| Existing files | `src/components/figure/FigureFrame.tsx:32-135` (props `src`, `title`, `initial`, `onEvent`, `hideChrome`, `fill`; `ref` gives a `FigureHandle` with `send`); `protocol.ts:7-13` (`HOST_SOURCE = "iynk"`, `PROTOCOL_VERSION = 1`); `src/lib/boardlab/store.ts:359` (`figureSrc(page, variant)`), `:364` (`figureState`), `:395` (`figurePatch`); `src/lib/boardlab/run.ts:270-288` (`sendPins`: the figure gets `set { pins: { net: level } }` and computes the rest); `figures/boards/*.js`; PDM 5.13 `guide.legacyFigure {page, circuit, variant, sheets}`; B1 figure policy D-B1-3 (inline scripts allowed in `/figures/*` only because every file there is first-party output) |
| New files | `src/components/studio/FigureLens.tsx`, `src/studio/guide/lens-state.ts`; tests beside each |
| Signatures | `lens-state.ts` (pure): `export interface LensInput { legacyFigure: { page: string; circuit?: string; variant?: string; sheets?: string[] }; view: 'board' \| 'breadboard' \| 'schematic'; pins: Record<string, number>; params: Record<string, Record<string, unknown>>; inputs: Record<string, number>; power: string \| null; fault: Record<string, unknown> \| null }` `export function lensSrc(l: LensInput['legacyFigure']): string;` (reuses `figureSrc`'s rule: `?variant=`) `export function lensState(i: LensInput): Record<string, unknown>;` (the `set` state: `view`, `circuit`, `power`, `params`, `pins`, `fault`) `export function lensPatch(prev: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown>;` (same rule as `figurePatch`: a `fault` key always travels with `power`) `FigureLens.tsx`: `export type LensMode = 'view' \| 'tour'; export function FigureLens(props: { mode: LensMode; onHandle?(h: FigureHandle \| null): void; legacyFigure: LensInput['legacyFigure']; state: Omit<LensInput, 'legacyFigure'>; onFigureState?(s: Record<string, unknown>): void; title: string; open: boolean; onToggle(): void; messages: Messages['studio'] })` |
| Data model | Reads `guide.legacyFigure`. The lens holds no state of its own; it renders what the run store and parameters say. It never writes the project document. In `view` mode (every lesson) it sends only `set` with the keys listed. In `tour` mode (a board tour) it also hands its `FigureHandle` to the caller through `onHandle`, because a tour step is an action on the figure itself (`BuildStep.action`: `press`, `act` or `set`, `src/content/schema.ts:256-270`); the figure's own state machine then assembles the board, and that state is never saved in the project. `onFigureState` hands the figure's own `state` events (`FigureEvent` type `state`) up so T-B12-20 can evaluate `legacy-state` gates through `stateMatches`. |
| Algorithm | When open, render `FigureFrame` with `src = lensSrc(...)`, `initial = lensState(...)`, `controls = false`, `hideChrome` listing the buttons the host draws (Run is Studio's). On each store change compute `lensPatch(last, next)` and `ref.current?.send('set', { state: patch })` only if non-empty. When closed the iframe is unmounted (no hidden cost). Pins come from the run's sampled outputs keyed by net name, as `sendPins` builds them. |
| State transitions | closed, loading, ready, failed (the figure never said `ready`: FigureFrame shows its own failure state; the lens shows `lesson.lens.unavailable`). |
| Validation, errors, edge cases | A project without `legacyFigure` shows no toggle. Origin and version checks are FigureFrame's (it only accepts `{source: 'iynk-figure', v: 1}` messages from its own iframe). The page path must start with `/figures/` and end `.html`; anything else is refused (`lensSrc` throws `RangeError`). No `sandbox` change here: B1 owns the figure policy and the `public/figures` produced-only test; the lens adds no new figure files. |
| Permissions, performance, migration | First-party figures only (R-144, CSP of R-006). The iframe costs about 24 MB of committed figure files in the repo but loads one page at a time. The idle redraw cost is T-B1-25's finding; the lens is closed by default so a lesson run never pays it. No migration. |
| Unit tests | `lens-state.test.ts`: `lensSrc` with and without a variant; the state for `blink` has `circuit: 'blink'`, `view: 'breadboard'`, `pins: { D13: 1 }`; `lensPatch` sends only changed keys and keeps `power` with `fault`; a path outside `/figures/` throws. `FigureLens.test.tsx` (jsdom, fake `FigureFrame`): toggle mounts and unmounts; `view` mode never exposes the handle, `tour` mode does; a pin change sends one `set`; no toggle without `legacyFigure`; keyboard toggle (Enter, Space) works. |
| Integration tests | The existing `FigureFrame.test.tsx` and `protocol.test.ts` stay green (nothing in `src/components/figure` changes). |
| Fixtures | The `legacyFigure` of the converted `button` lesson (`/figures/boards/uno-r3.html`, circuit `button`). |
| Acceptance | **Given** the `button` lesson running with the lens open, **When** D13 goes HIGH, **Then** the figure receives `set { pins: { D13: 1 } }` once. **Given** a project with no `legacyFigure`, **Then** the dock has no figure control. **Given** `view` mode, **Then** `onHandle` is never called. |
| Observability, release blockers | None. In `view` mode any message other than `set`, or in either mode any write to the project document, is a release blocker. |
| Definition of done | Tests green. |
| Verify commands | `TL`; `V src/studio/guide src/components/studio src/components/figure`; `ARCH` |
| Docs, rollback | `docs/LESSONS.md`. Revert. |
| Later tasks need | `FigureLens`, `onFigureState` (T-B12-20, T-B12-24). |

---

### Shared by T-B12-13 to T-B12-16: how a board group is converted

The four conversion tasks are the same job on four disjoint sets of boards. This block holds the common steps once; each package below names its boards, files, counts and risks.

| Step | What the agent does |
|---|---|
| 0 | Write `content/projects/boards/<group>/boards.json` from the group table in section 4.1 (the script holds no board list, so no conversion task edits the shared script). |
| 1 | Step 0 name check (rule 1). `npm run templates -- --group <group>` is not valid syntax; the command is `node scripts/build-templates.mjs --group <group>` (T-B12-09a). |
| 2 | Read the conversion report the script prints. An item with an error diagnostic, an unresolved part or a failed plan stops the task: the agent writes the item and the diagnostic in the commit message of a failed attempt, does not commit, and reports. The gap belongs to T-B12-06 (or a T-B12-06b the orchestrator adds). A conversion task never edits `src/project/convert/*`. |
| 3 | Check the generated count against the group's expected count (asserted in the test, not trusted). |
| 4 | Write `src/content/boards/convert-<group>.test.ts` (`// @vitest-environment node`) with the cases in the package. It does not run the interpreter (that is T-B12-23); it checks the data. |
| 5 | Run `node scripts/build-templates.mjs --group <group> --check`, `TL` and the test. Do not use the global `npm run templates:check` here: it covers all four groups and fails while a sibling group in this parallel group is unfinished (it runs from G5 on). Commit the data folder (`content/projects/boards/<group>/`, including `boards.json` and the group `index.ts`) and the test, with `git commit -m "B12 T-B12-<nn>: ..." -- <those paths>`. |

Test cases every conversion test contains (each is a named `it`, per lesson or tour):

| Case | Rule |
|---|---|
| validates | V1 to V5 pass with no error (B2 `validate`); `schemaVersion` is the current one |
| round trip | parse, canonicalise, hash: `stateHash` equals the hash of the file as stored; `canonical(parse(file))` equals the file text |
| netlist (REF-3) | for a lesson with a figure circuit, the set of sets of pins of `nets` equals the figure circuit's netlist after mapping (PDM 11.7, 11.4 rules); for a bare-board lesson `nets` is empty and the entry source exists |
| source | the entry source text equals `referenceSource(board, lesson, prose)` of T-B12-03 byte for byte |
| checks | the number of checks in `tests[]` equals `lesson.checks.length`; ids are unique; every `label` has `en`; kinds are among the ten catalogue kinds |
| text parity (R-140, six languages) | for every `LocalizedText` in `guide` (`title`, `lede`, `steps[]`, `hints[]`, `pins[].to`, `callouts[].text`, `specs[]`, `features[]`, `quizzes[].questions[]`) and in `tests[].checks[].label`, the set of locales equals the set of languages for which `src/i18n/content/<lang>/boards/<board>.json` has that key; `en` is always present. A key missing in a language in the source is missing in the project, and the test lists it |
| plan | `validatePlan` returns no `error`; `starterSubstanceHash` equals `substanceHash(project)`; `starterTokensSha256` equals the hash of the token stream of the entry source |
| provenance | `provenance.origin.kind = 'migration'` with `catalogue {lab: 'board', id, child}`; at least one `thirdParty` row with `review: 'unchecked'` (D-017) |
| template index | `TEMPLATES` of the group has one entry per file, with `stepCount` equal to the guide length |

Size: a converted lesson is about 50 KB (VERIFIED, the example `lesson-uno-r3-button.project.json` is 51,662 bytes), so 83 files are about 4 MB (ESTIMATED). The six-language text already sits in `src/i18n/content` (9.1 MB for all labs, VERIFIED), so the repo grows by that much again. Templates load one at a time by dynamic import.

---

### T-B12-13. Convert Arduino boards: `uno-r3`, `nano`, `uno-r4`

| Field | Content |
|---|---|
| Identity | T-B12-13; subsystem LABS, board templates; phase B12; priority must; depends on T-B12-06, T-B12-09a, B5 (T-B5-01 descriptors for `nano`, `uno-r4`); status not started; group G4 |
| Intent | Problem: the first 27 lessons (16 + 4 + 7, VERIFIED counts) and 3 tours must exist as committed templates with the same checks. Target user: a learner on an Uno, Nano or Uno R4. Story: as a learner I open "Blink" in Studio and it is the same lesson with the same checks. Behaviour: generated data plus a data test. Metric: 30 files; every case above green. |
| Existing files | `src/content/boards/uno-r3.ts` (2,326 lines; 16 lessons), `nano.ts` (4), `uno-r4.ts` (7; variants `Minima` and `WiFi`, some lessons need the WiFi variant); `src/i18n/content/<lang>/boards/{uno-r3,nano,uno-r4}.json`; `figures/boards/uno-r3.js` (51 parts, the circuits keyed by lesson id: `uno-r3.test.ts` asserts it, VERIFIED); `src/content/boards/uno-r3.test.ts:1-129` (stays) |
| New files | `content/projects/boards/arduino/boards.json`, `content/projects/boards/arduino/*.project.json` (30 files, one set) and `content/projects/boards/arduino/index.ts` (generated); test `src/content/boards/convert-arduino.test.ts` |
| Signatures | None new. The group index exports `TEMPLATES: readonly TemplateEntry[]` with 30 entries (27 lessons, 3 tours). |
| Data model | Ids: `prj_uno-r3-<lesson>` (16), `prj_nano-<lesson>` (4), `prj_uno-r4-<lesson>` (7), `prj_uno-r3-tour`, `prj_nano-tour`, `prj_uno-r4-tour`. `boards[0].variant` is the lesson's first variant (`lessonVariant`, `check-job.ts:47`); the Uno R4 WiFi variant id is `'wifi'` (VERIFIED, `uno-r4.ts:29`). `guide.kind` `lesson` or `tour`. |
| Algorithm | Shared steps 1 to 5. Extra case: the 14 bare-board lessons of the catalogue (VERIFIED count: 14 of 71) that fall in this group have empty `nets` and still a `legacyFigure` with no circuit. |
| State transitions | None. |
| Validation, errors, edge cases | `uno-r4` lessons that need the WiFi variant must carry `guide.variants` and `boards[0].variant = 'wifi'` (variant ids as in the catalogue). A lesson whose circuit uses a part with no descriptor is listed, kept on the bare board with the lens, and counted in the test's `unresolved` list (R-032: listed, not dropped). The test fails if that list is longer than the spike (T-B12-01 Q2) allowed. |
| Permissions, performance, migration | Static data. The test runs in under 20 s (ESTIMATED; no interpreter). |
| Unit tests | `convert-arduino.test.ts`: the shared cases for 27 lessons and 3 tours; counts 16, 4, 7, 3 asserted; the `button` lesson's nets are the five of PDM 11.4. |
| Integration tests | T-B12-23 runs the 27 reference runs on these files. |
| Fixtures | The committed files themselves. |
| Acceptance | **Given** `node scripts/build-templates.mjs --group arduino --check`, **Then** exit 0. **Given** `TEMPLATES`, **Then** 30 entries. |
| Observability, release blockers | The script's per-item report. An item missing from the group is a release blocker. |
| Definition of done | Data committed, tests green. The global `npm run templates:check` is run from G5 on, not here. |
| Verify commands | `TL`; `V src/content/boards/convert-arduino.test.ts src/content/boards/uno-r3.test.ts`; `node scripts/build-templates.mjs --group arduino --check` |
| Docs, rollback | `docs/LESSONS.md` counts. Revert deletes the folder; the group index returns to empty. |
| Later tasks need | The 30 templates (T-B12-18, 22, 23, 24). |

---

### T-B12-14. Convert ESP32 family and `nodemcu`

| Field | Content |
|---|---|
| Identity | T-B12-14; as T-B12-13; depends on T-B12-06, T-B12-09a, B5 (T-B5-02 descriptors); group G4 |
| Intent | Problem: 13 lessons (5 + 4 + 4) and 3 tours, among them the Wi-Fi lessons whose world holds a `network` device (6 `network` inputs in the catalogue, VERIFIED in PDM 11.1). Target user and story as T-B12-13 for ESP32 owners. Metric: 16 files; cases green. |
| Existing files | `src/content/boards/esp32-devkitc.ts` (5 lessons), `esp32-s3-devkitc-1.ts` (4), `nodemcu.ts` (4); their prose JSON in six languages; `src/content/boards/esp32-devkitc.test.ts`, `esp32-s3-devkitc-1.test.ts`, `nodemcu.test.ts` (stay). The slowest reference runs are the ESP32 web lessons: 2.3 to 2.7 s unloaded and 17.3 s loaded (SIM line 1907, DOCUMENTED). |
| New files | `content/projects/boards/esp/boards.json`, `content/projects/boards/esp/*.project.json` (16 files, one set), `content/projects/boards/esp/index.ts` (generated); test `src/content/boards/convert-esp.test.ts` |
| Signatures, data model | As T-B12-13. Ids `prj_esp32-devkitc-<lesson>`, `prj_esp32-s3-devkitc-1-<lesson>`, `prj_nodemcu-<lesson>`, and three `-tour`. `simulation.world.inputs` keep the `network` device model with `ssid`, `ip`, `requests` (and `password`) unchanged. |
| Algorithm | Shared steps 1 to 5. Extra case: for every `network` input the project keeps `requests` and the `ssid`; the lesson's Wi-Fi password, if the catalogue holds one, is a lesson constant of the simulated network and is not a secret (the test asserts it matches the catalogue string, and the doc says so). |
| State transitions | None. |
| Validation, errors, edge cases | A lesson on the ESP32 whose I2C device is attached by the library (not the netlist) must still convert; `deviceSource: 'library'` is a run option, not a file field (finding F9). `nodemcu` is an ESP8266: its content target is `esp8266` (VERIFIED, `src/content/boards/nodemcu.ts:554`), so its descriptor comes from T-B5-02. |
| Permissions, performance, migration | Static. Test under 20 s. |
| Unit tests | `convert-esp.test.ts`: shared cases for 13 lessons and 3 tours; counts 5, 4, 4, 3. |
| Integration tests | T-B12-23 runs the 13 reference runs. |
| Fixtures | The committed files. |
| Acceptance | **Given** `--group esp --check`, **Then** exit 0 and 16 entries. |
| Observability, release blockers | As T-B12-13. |
| Definition of done, verify, docs, rollback | As T-B12-13 with `convert-esp.test.ts`, `esp32-devkitc.test.ts` and `nodemcu.test.ts`. |
| Later tasks need | The 16 templates. |

---

### T-B12-15. Convert `pico`, `microbit-v2`, `nucleo-f401re`, `pi4-pi5`

| Field | Content |
|---|---|
| Identity | T-B12-15; as T-B12-13; depends on T-B12-06, T-B12-09a, B5 (T-B5-03, T-B5-04 descriptors); group G4 |
| Intent | Problem: 21 lessons (6 + 5 + 5 + 5) and 4 tours on four different runtimes: Pico (mostly MicroPython), micro:bit (MicroPython), Nucleo (Arduino C++) and Pi 4 and 5 (Python), VERIFIED by counting `language:` entries in the four content files. Metric: 25 files; cases green. |
| Existing files | `src/content/boards/pico.ts` (6; the Pico W is a variant), `microbit-v2.ts` (5), `nucleo-f401re.ts` (5; its test file is 364 lines), `pi4-pi5.ts` (5; variant `pi5`); six-language prose; their `*.test.ts` files (stay) |
| New files | `content/projects/boards/other/boards.json`, `content/projects/boards/other/*.project.json` (25 files, one set), `content/projects/boards/other/index.ts` (generated); test `src/content/boards/convert-other.test.ts` |
| Signatures, data model | As T-B12-13. Ids `prj_pico-<lesson>`, `prj_microbit-v2-<lesson>`, `prj_nucleo-f401re-<lesson>`, `prj_pi4-pi5-<lesson>`, four `-tour`. A lesson that needs the Pico W carries `guide.variants` and `boards[0].variant = 'pico-w'` (VERIFIED id, `pico.ts:403`); a Pi 5 lesson uses `'pi5'` (`pi4-pi5.ts:371`). |
| Algorithm | Shared steps 1 to 5. Extra case: the language of the entry source (`sources[].language`) equals the catalogue lesson's language; libraries listed in `firmware.libraries` equal `lesson.code.libraries` (19 distinct libraries across the catalogue, VERIFIED PDM 11.1). |
| State transitions | None. |
| Validation, errors, edge cases | A lesson that uses an `onboard` device model (1 in the whole catalogue, VERIFIED PDM 11.1) keeps the model and has no netlist counterpart for the sensor (a recorded gap, listed). The `pi4-pi5` boards are `linux` targets: a Pi lesson has no firmware flash step, so its entry source has `role: firmware` as the converter decides (T-B2-19); the test only asserts one entry source exists. |
| Permissions, performance, migration | Static. |
| Unit tests | `convert-other.test.ts`: shared cases for 21 lessons and 4 tours; counts 6, 5, 5, 5, 4. |
| Integration tests | T-B12-23 runs the 21 reference runs. |
| Fixtures | The committed files. |
| Acceptance | **Given** `--group other --check`, **Then** exit 0 and 25 entries. |
| Observability, release blockers | As T-B12-13. |
| Definition of done, verify, docs, rollback | As T-B12-13 with `convert-other.test.ts` and the four board test files. |
| Later tasks need | The 25 templates. |

---

### T-B12-16. Convert `basys3` and `de10-lite` (Verilog)

| Field | Content |
|---|---|
| Identity | T-B12-16; as T-B12-13; depends on T-B12-06, T-B12-09a, B5 (T-B5-04), T-B0-02 (the split of the basys3 display sweep); group G4 |
| Intent | Problem: 10 Verilog lessons (5 + 5) and 2 tours. Verilog lessons carry a `top` module and `ports` mapping to board nets (`CodeTemplate.top`, `ports`, `src/content/schema.ts:281`). Metric: 12 files; cases green; no test longer than the shared 60 s timeout. |
| Existing files | `src/content/boards/basys3.ts` (5 lessons) and `de10-lite.ts` (5); `basys3.test.ts:241-251` is the 95-run display sweep that T-B0-02 splits (VERIFIED in the roadmap row, line 218); six-language prose |
| New files | `content/projects/boards/fpga/boards.json`, `content/projects/boards/fpga/*.project.json` (12 files, one set), `content/projects/boards/fpga/index.ts` (generated); test `src/content/boards/convert-fpga.test.ts` |
| Signatures, data model | As T-B12-13. Ids `prj_basys3-<lesson>`, `prj_de10-lite-<lesson>`, two `-tour`. `firmware.top` and `firmware.ports` hold the Verilog `top` and `ports`; Verilog parameter chips become `parameters[]` and `HeadlessOptions.params` (T-B12-07). |
| Algorithm | Shared steps 1 to 5. Extra case: `firmware.ports` equals `lesson.code.ports` for each lesson; `top` equals `lesson.code.top`. |
| State transitions | None. |
| Validation, errors, edge cases | In Studio these boards show Inspect mode only for the netlist (T-B5-04); the lesson still runs in the Verilog interpreter through the check path. A Verilog lesson with a pin-based check: the checks the catalogue holds are pin-level on FPGA ports and run through the interpreter (VERIFIED by `basys3.test.ts`); T-B12-07 handles the `unsupported-language` rule only for author-written checks. |
| Permissions, performance, migration | Static. Verilog median reference run is 867 ms (SIM line 1907). |
| Unit tests | `convert-fpga.test.ts`: shared cases for 10 lessons and 2 tours; counts 5, 5, 2. |
| Integration tests | T-B12-23 runs the 10 Verilog reference runs. |
| Fixtures | The committed files. |
| Acceptance | **Given** `--group fpga --check`, **Then** exit 0 and 12 entries. |
| Observability, release blockers | As T-B12-13. |
| Definition of done, verify, docs, rollback | As T-B12-13 with `convert-fpga.test.ts`, `basys3.test.ts` and `de10-lite.test.ts`. |
| Later tasks need | The 12 templates. |

---

### T-B12-17. Guide dock: steps, quiz, completion line, reset

| Field | Content |
|---|---|
| Identity | T-B12-17; subsystem Studio, guide; phase B12; priority must; depends on T-B12-02 (`readPlan`), T-B12-05, T-B12-07, T-B12-09b (the Start checkpoint), T-B12-12; B4 (T-B4-02 stores, T-B4-12 code dock), B5 (T-B5-08 history); status not started; group G5 |
| Intent | Problem: R-140 wants steps, hints, quiz and checks to work "as in the old page", with a pass that means something (F-023). STU 5.2 puts them in a Guide dock, shown only when the project has a `guide`. Target user: a learner on a lesson. Story: as a learner I see the lede, my steps, a quick quiz and one plain line saying what is left to finish. Behaviour: a dock shell, a step list, a quiz and a completion line over `useGuide`. Metric: in the `button` lesson the line reads "Change something in the project to finish." until an edit, then "Answer one question to finish.", then the checks line, then "Completed in simulation at {tier}." |
| Existing files | `src/components/boardlab/LessonInfo.tsx:36-95` (`Quiz`, `LessonInfo`: the old behaviour, read only); `src/components/boardlab/LessonPicker.tsx:16, 50-91`; `src/studio/stores/doc.ts`, `session.ts` (T-B4-02); `src/studio/history/revisions.ts` (T-B5-08, restore a checkpoint); `src/local/events.ts` (T-B10-20 `logEvent`); T-B12-04, 05, 07 modules |
| New files | `src/components/studio/guide/GuideDock.tsx`, `StepList.tsx`, `QuizView.tsx`, `CompletionLine.tsx`, `useGuide.ts` (a hook that reaches `src/local`, so it is UI, not `src/studio`); tests beside each |
| Signatures | `useGuide.ts`: `export function textAt(t: Text, locale: string): string;` (plain string, or `LocalizedText` with `en` as fallback) `export interface UseGuideArgs { doc: DocStoreLike; store: LearnStore; run: GuideRun; activeFaults: readonly string[]; deps: GuideDeps; locale: string; now(): string; logEvent?(e: { kind: string; payload: Record<string, unknown> }): void; restoreStart(): Promise<void> }` `export interface GuideView { plan: GuidedPlan \| null; issues: PlanIssue[]; steps: StepState[]; viewIndex: number; completion: ReturnType<typeof evaluateCompletion>; record: LearnerRecord \| undefined; unchecked: number; tier: Tier \| null }` `export function useGuide(a: UseGuideArgs): GuideView & { setViewIndex(i: number): void; stepPrev(): void; stepNext(): void; markStep(i: number): void; answer(quizId: string, questionId: string, choice: number): void; reset(): Promise<void> };` Components: `GuideDock(props: { view: ReturnType<typeof useGuide>; guide: Guide; locale: string; slots: { checks?: ReactNode; hints?: ReactNode; assembly?: ReactNode; wire?: ReactNode; inputs?: ReactNode; status?: ReactNode; faults?: ReactNode; lens?: ReactNode }; messages: Messages['studio'] })`, `StepList(props: { steps: StepState[]; texts: string[]; viewIndex: number; onView(i: number): void; onMark(i: number): void; messages })`, `QuizView(props: { quizzes: Quiz[]; record?: LearnerRecord; locale: string; onAnswer(...): void; messages })`, `CompletionLine(props: { completion: ...; tier: Tier \| null; legacy: boolean; messages })` |
| Data model | Reads `guide.{title, lede, steps, hints, quizzes, serialSample, references}` and the plan. Writes only the learner record (never the document) and, on Reset, restores the "Start" checkpoint. Quiz answers: `record.quiz[quizId].answers[questionId] = choice`; `correct` and `total` recomputed from the quiz. Completion record: `withCompletion(r, { gates, tier, sourceSha256: sha256(entry source), hintsMax, engineVersions, legacy: false })`. Types `StepState`, `GuideRun`, `GuideDeps`, `PlanIssue` come from `@/project/guided/*`; `LearnStore` from `@/local/learn-store`. |
| Algorithm | `useGuide` reads the plan (`readPlan`), runs `validatePlan` once per document revision, and evaluates steps and completion at most every 200 ms after a change (EDU 4.3 debounce), because the substance hash costs most. Each step that flips is written with `withStep(…, 'gate', now)` and logged `step.done`; when `evaluateCompletion` reports `editFlip` it writes `withEdited` and logs `code.changed` (the latch of section 4.2); the first complete logs `complete` and writes the completion once. `reset` calls `restoreStart()` (the B5 restore of the "Start" checkpoint) and clears nothing in the record. A plan with an `error` issue is treated as no plan: the dock shows the lede and the steps as plain text, no gates (EDU 4.2 degrade). The dock header shows the title, the tier chip text `lesson.guide.tier`, and `lesson.guide.provenance.unchecked` when `provenance.thirdParty` has `review: 'unchecked'` rows (F-197). |
| State transitions | Per step: not started, current, done, blocked (text and an icon, never colour alone; announced in an `aria-live="polite"` region). Per lesson: open, complete (the line changes; nothing else moves). |
| Validation, errors, edge cases | A project with a `guide` but no plan gets all-manual steps and completion `['checks','edit','quiz']` is not assumed: completion is `null` and the line shows nothing (a hand-made lesson, R-149, is not judged by rules it does not carry). A legacy record shows `lesson.completion.legacy`. A quiz with one wrong answer still counts as answered (EDU 4.4). `[` and `]` move `viewIndex` only; they do not mark anything. A restore that fails shows the B3 error banner text and keeps the work. |
| Permissions, performance, migration | Local. In a room only the host edits (B7); a guest sees the dock read-only, and `markStep` and `answer` write the guest's own record. The dock re-renders on a record change, not on every op (selector stability, FA-04). |
| Unit tests | `useGuide.test.tsx` (jsdom, memory repository): the four-stage completion line on a scripted sequence; flips are written once; a plan error degrades to plain text; debounce (fake timers) evaluates once for 20 ops in 100 ms; `reset` calls `restoreStart` and leaves the record. `StepList.test.tsx`: states as text, `aria-live`, keyboard `[` `]` handled by the parent. `QuizView.test.tsx`: answer, correctness, the `why` text, six-language labels. `CompletionLine.test.tsx`: each reason and the done line with the tier. `GuideDock.test.tsx`: slots render; unchecked count shown. |
| Integration tests | With a real converted lesson from T-B12-13 and the memory repository: edit, answer, run (inline), complete. |
| Fixtures | The converted `button` lesson. |
| Acceptance | **Given** the Blink lesson in Studio, **When** I run it, **Then** checks pass and the line asks for a change; **When** I change `delay(500)` to `delay(250)` and answer one quiz question, **Then** the line reads "Completed in simulation at {tier}." and the record has `completion.legacy = false`. |
| Observability, release blockers | Learning events `step.done`, `code.changed`, `quiz.answer`, `hint.open`, `complete` go through `logEvent` only when the local-log switch is on (R-009, finding F8 of B10). No source text in any event. A "done" that skips the edit rule is a release blocker. |
| Definition of done | Tests green; axe on the dock is part of T-B12-24. |
| Verify commands | `TL`; `V src/components/studio/guide`; `I18N`; `ARCH` |
| Docs, rollback | `docs/LESSONS.md`. Revert. |
| Later tasks need | `useGuide`, `GuideDock` and its slots (T-B12-24). |

---

### T-B12-18. Template gallery, lesson navigation, `[` and `]`, deep links

| Field | Content |
|---|---|
| Identity | T-B12-18; subsystem Studio home and navigation; phase B12; priority must; depends on T-B12-08 (progress facade), T-B12-09b, T-B12-12, T-B12-13 to 16 (the gallery test counts come from committed templates); B4 (T-B4-01 router, T-B4-16 Home, T-B4-19 keymap); status not started; group G5 |
| Intent | Problem: R-139 wants the gallery to show "the same groups as the old catalogue index"; R-151 wants old URLs and links to keep working; STU 6.11 gives Studio its own keys. Target user: a learner choosing a lesson. Story: as a learner I find "Push a button" under Input, on the Uno, with my progress shown, and open it with one key press. Behaviour: a gallery grouped by level and by board, a per-board lesson list with previous and next, `[` and `]` for guide steps, and a route `#/t/<template id>` (a new hash grammar and a new test table, below). Metric: the gallery shows 71 lesson cards plus 12 tours grouped as in EDU 10.4 (analog 18, io 14, input 14, project 10, protocol 7, wireless 5, intro 3: sum 71, VERIFIED in EDU 10.4). |
| Existing files | `src/components/catalogue/Catalogue.tsx` (the old index, read for the grouping); `src/components/boardlab/LessonPicker.tsx:16, 50` (progress count per board); `src/components/studio/Home.tsx` (T-B4-16); `src/studio/router.ts` (T-B4-01: `StudioRoute`, `parseHash`, `routeHash`); `src/studio/commands/keymap.ts` (T-B4-19, one list drives handler and dialog; STU 6.11 row `Guide`, `[` and `]`, scope Guide and Canvas); `src/components/boardlab/shortcuts.ts:20-34` (read only: the old map stays); `src/lib/learn/facade.ts` (T-B12-08) |
| New and edited files | New `src/components/studio/TemplateGallery.tsx`, `src/components/studio/guide/LessonNav.tsx`; edit `src/components/studio/Home.tsx`, `src/studio/commands/keymap.ts`, `src/studio/router.ts`; tests beside each |
| Signatures | `TemplateGallery(props: { templates: readonly TemplateEntry[]; locale: string; progress: (templateId: string) => 'done' \| 'legacy' \| 'none'; tier: (templateId: string) => string; onOpen(id: string, opts: { run: boolean }): void; messages })` `LessonNav(props: { current: string; templates: readonly TemplateEntry[]; locale: string; progress: ...; onOpen(id: string): void; messages })` `router.ts`: B4 (T-B4-01) defines `StudioRoute = { kind: 'home' } \| { kind: 'project'; id: string; autorun: boolean }` with `parseHash`, `routeHash`, `readRoute`, `subscribeRoute` and `navigate`, and the grammar `#/<prj_id>?run=1`. There is no `parseRoute`, `formatRoute` or `not-found` kind. This task adds two kinds: `{ kind: 'lessons' }` (hash `#/lessons`) and `{ kind: 'template'; id: string; run: boolean }` (hash `#/t/<id>` and `#/t/<id>?run=1`) and extends `parseHash` and `routeHash`. Neither `lessons` nor `t` fits the `prj_` id pattern, so the grammars cannot collide. `keymap.ts`: commands `guide.stepPrev` (`[`) and `guide.stepNext` (`]`), scope Guide and Canvas, off in text fields, off in the code editor (a small `isTypingTarget(el, key)` is written inside `keymap.ts` with the same four rules as `typingTarget` at `src/components/boardlab/shortcuts.ts:48`, which is UI and which `studio` may not import; if the B4 keymap already has such a check, it is reused instead). |
| Data model | Reads `TEMPLATES` (T-B12-09a), passed in as a prop by the mount. Each entry carries its `title` as a `LocalizedText` (section 4.1), so the gallery never loads the 83 files. Progress per template from `learnStore()` through `findFork` and the record's `completion`. |
| Algorithm | Gallery groups: by level (order intro, io, input, analog, protocol, wireless, project) and by board (order of `BOARD_IDS`, `src/content/ids.ts`); filter by board, level and rung; a card is a button with the title, rung, level, board, the tier text and the progress text, never colour alone. `Open` calls `onOpen(id, {run: false})`, `Open and run` with `run: true`. `LessonNav` lists the lessons of the current template's board in `order`, marks the current one with `aria-current="step"`, and offers Previous and Next buttons (these open the neighbouring template; `[` and `]` are guide steps, not lessons, STU 6.11). `Home` gets a "Lessons and boards" entry that routes to `#/lessons`. A hash `#/t/<id>` opens the template (T-B12-24 handles the route in `StudioEntry`). |
| State transitions | Gallery: loading (index only), ready. Route: `lessons` to `template` to `<prj id>` after the fork. |
| Validation, errors, edge cases | A hash that does not fit the grammar, or a template id that fails the id pattern, parses to `home` (the B4 rule). A well-formed but unknown template id parses to `template`; `openTemplate` then rejects with `TemplateNotFound` and `StudioEntry` (T-B12-24) shows the B4 error banner with the id. `[` and `]` do nothing when the project has no guide or when focus is in a text field. An empty filter result shows `lesson.gallery.empty`. Old bookmarks: `/en/boards/uno-r3/blink` still opens the old page (R-151); mapping an old URL to `#/t/prj_uno-r3-blink` is T-B12-26's link, not a redirect. |
| Permissions, performance, migration | Local. The gallery renders 83 cards under 50 ms (ESTIMATED) with no file loads. No migration. |
| Unit tests | `TemplateGallery.test.tsx`: group counts 18, 14, 14, 10, 7, 5, 3 from the committed templates; filter; progress text for done, legacy, none; keyboard activation. `LessonNav.test.tsx`: 16 entries on the Uno, `aria-current`, previous disabled on the first. `router.test.ts` additions (a new table of rows beside the 30 B4 rows): `parseHash` and `routeHash` round trip for `#/lessons`, `#/t/prj_uno-r3-blink`, `#/t/prj_uno-r3-blink?run=1`; `#/t/`, `#/t/Bad%20Id` and `#/lessons/x` parse to `home`; the 30 B4 rows are unchanged. `keymap.test.ts` additions: `[` and `]` dispatch only in scope; not while typing. |
| Integration tests | `Home.test.tsx` addition: the entry exists and routes. |
| Fixtures | The group indexes from T-B12-13 to 16. |
| Acceptance | **Given** the gallery, **When** I choose "By level" and "Input", **Then** 14 lessons appear across boards and each opens with Enter. **Given** focus on the canvas and a project with a guide, **When** I press `]`, **Then** the viewed step advances. |
| Observability, release blockers | None. A gallery count that differs from 71 plus 12 is a release blocker (asserted from the data). |
| Definition of done | Tests green; the B4 tests of `Home`, `router`, `keymap` stay green. |
| Verify commands | `TL`; `V src/components/studio src/studio`; `I18N`; `ARCH` |
| Docs, rollback | Keymap table in `docs/STUDIO.md` (T-B5-23) gains two rows in T-B12-27. Revert. |
| Later tasks need | The two routes and commands (T-B12-24). |

---

### T-B12-19. Checks view and lesson hints

| Field | Content |
|---|---|
| Identity | T-B12-19; subsystem Studio, checks; phase B12; priority must; depends on T-B12-07, T-B12-12; B5 (T-B5-09 `ChecksEditor`), B10 (T-B10-08 `HintLadder`); status not started; group G5 |
| Intent | Problem: finding F6. The old `ChecksPanel` shows completion checks ticked from a deterministic run and says when a fault blocks a pass (`ChecksPanel.tsx:25-60`, VERIFIED). Studio needs the same for a project's `tests`, with visible and hidden checks (F-221), the tier next to the verdict (EDU 4.3) and the `code` kind labelled "Text check". Target user: a learner pressing Run checks. Story: as a learner I see which checks pass and why a pass is blocked. Behaviour: a presentational view and a hint list. Metric: the view shows the same count line ("n of N checks pass") as the old panel for the same verdicts. |
| Existing files | `src/components/boardlab/ChecksPanel.tsx:12-87` (copy to match: `useChecksBadge`, the status line, run and again button, `progress` bar, the fault message); `ChecksPanel.test.tsx:1-36` (cases to mirror); `src/components/studio/ChecksEditor.tsx` (T-B5-09, author view; the lesson view does not edit); `src/components/studio/HintLadder.tsx` (T-B10-08; Step 0 reads its props); `EDUCATION.md` 7.1, 7.2; `LessonRun` is read from `src/project/guided/record.ts` (T-B12-04), not from `lessonChecks.ts`, because `checks-model.ts` is a `studio` file and `studio` may not import UI |
| New files | `src/components/studio/guide/ChecksView.tsx`, `LessonHints.tsx`, `src/studio/guide/checks-model.ts`; tests beside each |
| Signatures | `checks-model.ts` (pure): `export interface CheckRow { testId: string; checkId: string; label: string; kind: string; textCheck: boolean; hidden: boolean; state: 'notRun' \| 'pass' \| 'fail' }` `export function checkRows(project: Project, run: LessonRun \| null, locale: string): CheckRow[];` (hidden rows keep their state but `label` is replaced by a count line, not by the check text) `export function summary(rows: CheckRow[]): { passed: number; total: number; hidden: number; hiddenPassed: number }` `export function hintLevels(hints: Text[], locale: string): { level: number; text: string }[];` (EDU 7.2: `hints[0..2]` become levels 1 to 3, a fourth and later hint stay in level 3 as a scroll) `ChecksView(props: { rows: CheckRow[]; status: 'idle' \| 'running' \| 'done' \| 'limit'; progress: number; tier: Tier \| null; faultOn: boolean; onRun(): void; onCancel(): void; messages })` `LessonHints(props: { levels: { level: number; text: string }[]; opened: number; onOpen(level: number): void; messages })` |
| Data model | Rows come from `tests[].checks[]` (`id`, `kind`, `visibility`, `label`). Hidden checks are a courtesy, not a secret (EDU 8), and the note says so. `opened` is `record.hintsMax`; opening writes `withHintLevel` and logs `hint.open {level, via: 'ladder'}`. |
| Algorithm | The status line copies the old panel: pass and no fault gives `allPass`; pass with a fault on gives `faultOn`; `limit` gives the limit text; otherwise `summary`. `code` checks show the badge `lesson.checks.textCheck` (EDU 4.3: a text match, not proof of use). Hints reveal in order; a level opens only after the previous one; opened levels stay visible. If B10's `HintLadder` accepts levels as `{text}[]` the list delegates to it; otherwise `LessonHints` renders its own ordered reveal (Step 0 decides; both are tested the same). |
| State transitions | Checks: idle, running, done or limit. Hints: level 0 to 3 (and the scroll). |
| Validation, errors, edge cases | A project with no tests shows `lesson.checks.empty`. A verdict with `detail: 'needs-analog'` shows "not available at this tier" instead of fail. Two hints (33 of 71 lessons, EDU 7.2) give two levels. Button disabled while running; Cancel appears while running. |
| Permissions, performance, migration | Local. 200 rows render under 16 ms (ESTIMATED, T-B5-09's figure). |
| Unit tests | `checks-model.test.ts`: rows and summary for the `button` lesson (4 checks); a hidden check keeps its state and loses its label; `hintLevels` for 2, 3 and 5 hints. `ChecksView.test.tsx`: mirrors `ChecksPanel.test.tsx` cases (badge text, pass line, fault line, limit, progress bar role, run button label changes to "Run again"). `LessonHints.test.tsx`: order, one level at a time, event callback. |
| Integration tests | With `runLessonTests` on the converted lesson (inline): the view shows 4 of 4 and then a fault blocks it (T-B12-21 supplies the fault in the e2e). |
| Fixtures | `LessonRun` objects built in the tests. |
| Acceptance | **Given** a run where all checks pass and a fault is on, **Then** the view shows "Checks pass, but a fault is on" and the guide stays open (T-B12-05). |
| Observability, release blockers | `hint.open` events. A hidden check's text must not appear in the DOM (test asserts it). |
| Definition of done | Tests green. |
| Verify commands | `TL`; `V src/studio/guide src/components/studio/guide`; `I18N` |
| Docs, rollback | `docs/LESSONS.md`. Revert. |
| Later tasks need | `ChecksView`, `LessonHints`, `checkRows` (T-B12-24). |

---

### T-B12-20. Assembly guide and wire-in guide over the netlist

| Field | Content |
|---|---|
| Identity | T-B12-20; subsystem Studio, guide; phase B12; priority should; depends on T-B12-05 (`StepState`), T-B12-06, T-B12-11, T-B12-12; status not started; group G5 |
| Intent | Problem: R-142 keeps the assembly and wiring help of the Board Lab (F-035). The old `AssemblyPanel` advances when figure state matches `BuildStep.done` (`AssemblyPanel.tsx:35-53`) and shows the original's refusal when a step is tried out of order; `WireInPanel` lists what a board can drive and how to wire it (`WireInPanel.tsx:36-132`). Both read the figure and catalogue directly. Target user: someone building the board tour or wiring a sensor. Story: as a learner I follow the build steps, press "Show me", and see the wire list for my lesson. Behaviour: a step list over the tour's `guide.assembly[]` with gates from the plan, and a wire list from `ext["x-iynk-wireables"]` (`WireablesExt`, section 4.7). Metric: the Uno tour completes in the lens when every step's `done` condition holds, and the Wire guide for the `button` lesson lists the same wireables `lessonWireables` returns for it. |
| Existing files | `src/components/boardlab/AssemblyPanel.tsx:23-136` (`sendCommand`, `AssemblyPanel`), `WireInPanel.tsx:14-132` (`WIRE_HEX`, `WireDot`, `lessonWireables`, `POWER_PIN`), `src/lib/interp/checks.ts:67` (`stateMatches`), `src/content/schema.ts:256-270` (`BuildStep`), the T-B12-11 lens (`mode: 'tour'`, `onHandle`, `onFigureState`) |
| New files | `src/components/studio/guide/AssemblyGuide.tsx`, `WireGuide.tsx`, `src/studio/guide/assembly.ts`, `src/studio/guide/wire.ts`; tests beside each. `WIRE_HEX` is imported from `src/components/boardlab/WireInPanel.tsx:14` as STU 1188 says (reuse the colours); no old file is edited. |
| Signatures | `assembly.ts` (pure): `export interface AssemblyStep { index: number; title: string; body: string; kind: 'build' \| 'break' \| 'test'; command: BridgeCommand \| null; refusal: string \| null; state: StepState['state'] }` `export function assemblySteps(guide: Guide, states: StepState[], locale: string): AssemblyStep[];` `export function commandFor(step: AssemblyStep): { send: BridgeCommand } \| null;` `wire.ts` (pure): `export interface WireRow { part: string; supplyVolts: number; note: string; caution: string \| null; connections: { from: string; to: string; color: WireColor }[]; forLesson: boolean }` `export function wireRows(ext: WireablesExt \| undefined, guidePins: string[], locale: string): WireRow[];` `AssemblyGuide(props: { steps: AssemblyStep[]; figureReady: boolean; onShow(step: AssemblyStep): void; onMark(index: number): void; onBreak?(failureId: string): void; messages })` `WireGuide(props: { rows: WireRow[]; messages })` |
| Data model | Reads `guide.assembly[]` (catalogue `BuildStep` objects as data: `id`, `kind`, `action`, `done`, `fault?`, `major`, `title`, `body`, `refusal?`), the plan's `legacy-state` and `fault` gates, `ext["x-iynk-wireables"]` (type `WireablesExt` and schema from T-B12-02, data from T-B12-06; section 4.7) and `guide.pins`. The figure state that `legacy-state` gates read comes from `FigureLens.onFigureState`; it is kept in memory by the mount and handed to `GuideDeps.legacyState()`. |
| Algorithm | The step list shows state text per step. "Show me" opens the lens in `tour` mode and, for a `build` step with an `action`, sends it through the lens handle (`press` becomes `figure.send('press', {id, choice})`, `act` and `set` likewise, as `AssemblyPanel.tsx:23-28` does). A step tried out of order shows its `refusal` Text, or `lesson.assembly.refused`. A `break` step offers "Break" and calls `onBreak(step.fault)`; its completion is the `fault injected` gate. A step whose `done` is empty has a "Mark as done" button (`manual` gate). When the lens is closed or has no figure, gates of kind `legacy-state` are `blocked` and the row says `lesson.assembly.needsLens`. `wireRows` keeps rows the plan emitted; `forLesson` is true when the converter filtered them for the lesson. Connection rows show a colour dot (`WIRE_HEX`) and the text colour name, never the dot alone. |
| State transitions | Per step as the engine: not started, current, done, blocked. |
| Validation, errors, edge cases | Per the spike (Q4): if more than 20 of the 134 `done` conditions cannot be supplied by a run, those steps become `manual` in the plan by T-B12-06 and are listed in `docs/LESSONS.md`; this task renders whatever gates the plan holds. A wireable whose part has no name string shows its id. A lesson with no wireables shows `lesson.wire.none`. |
| Permissions, performance, migration | Local. The tour's 134 steps over 12 boards render one board at a time (largest board ESTIMATED under 40 steps). No migration. |
| Unit tests | `assembly.test.ts`: step list and commands for a fixture with one build, one break and one manual step; refusal text; `commandFor` for `press`, `act`, `set`, null. `wire.test.ts`: `wireRows` equals the old `lessonWireables` result for three Uno lessons that have wireables (the agent finds them by running `lessonWireables` over the 16 lessons; fixtures are built from `src/content/boards/uno-r3.ts` at test time); power pins ignored; translated notes. `AssemblyGuide.test.tsx`: Show me calls `onShow`; blocked text without lens; Mark as done. `WireGuide.test.tsx`: rows, colour name text, `aria` structure of `<details>`. |
| Integration tests | With `FigureLens` fake handle: pressing Show me on the first Uno step sends the declared `press`, the fake figure reports state, the next step becomes current. |
| Fixtures | The Uno tour project (T-B12-13) and `Wireable` samples from the catalogue. |
| Acceptance | **Given** the Uno tour, **When** I open Show me on step 1 and the figure reaches the `done` state, **Then** step 1 is done and step 2 is current. **Given** the `button` lesson, **Then** the Wire guide lists the same sensor rows as the old page. |
| Observability, release blockers | None. A step that can never complete (a `done` key the lens never reports) is found by the spike and by T-B12-24's tour spec, and blocks the phase. |
| Definition of done | Tests green. |
| Verify commands | `TL`; `V src/studio/guide src/components/studio/guide`; `I18N` |
| Docs, rollback | `docs/LESSONS.md`. Revert. |
| Later tasks need | `AssemblyGuide`, `WireGuide` (T-B12-24). |

---

### T-B12-21. Fault lessons use the B10 faults

| Field | Content |
|---|---|
| Identity | T-B12-21; subsystem Studio, faults in lessons; phase B12; priority should; depends on T-B12-05, T-B12-12; B10 (T-B10-02 failure models, T-B10-09 Break it, T-B10-25 catalogue faults mapped to cause ids), B5 descriptors; status not started; group G5 |
| Intent | Problem: the old lesson page lists every failure of the board, the faults of the lesson's own circuit first (`FailurePanel.tsx:62-101`), triggers them in the figure and shows symptom, why and fix. Completion needs "no fault active" (`LessonWorkspace.tsx:149-150`). In Studio faults are operations (`fault.set`, FE 6.6: Break it is undoable). Target user: a learner on a "break it" lesson. Story: as a learner I break the LED on purpose, see the symptom, repair it, and the lesson finishes only when no fault is on. Behaviour: the lesson's own faults first, the board's others after, each mapped to a B10 fault; unmapped ones named, not hidden. Metric: for every lesson, every `own` failure resolves to a B10 fault or is on the committed unmapped list. |
| Existing files | `src/components/boardlab/FailurePanel.tsx:62-101` (`mine` = `failures.filter(f => faultCircuit(f) === circuit)`, then the rest); `src/lib/boardlab/store.ts:364-380` (the fault's `figure.state` is merged into the figure state); `src/content/schema.ts:213-253` (`FailureKind`, `FailureTrigger`, `FailureMode`); B10: `src/sim/faults/models.ts`, `src/components/studio/BreakIt.tsx`, `src/studio/tools/break.ts` (names DOCUMENTED, Step 0) |
| New files | `scripts/build-lesson-faults.mjs`, `content/projects/boards/faults.ts` (generated), `content/projects/boards/faults.unmapped.json` (hand-kept list), `src/studio/guide/lesson-faults.ts`, `src/components/studio/guide/FaultList.tsx`; tests beside each |
| Signatures | `faults.ts` (generated): `export const LESSON_FAULTS: Readonly<Record<string, { own: readonly string[] }>>` (template id to catalogue failure ids whose `figure.state.circuit` equals the lesson's `circuit`) `export const BOARD_FAULTS: Readonly<Record<string, readonly string[]>>` (board id to all its failure ids, catalogue order) `lesson-faults.ts`: `export interface FaultOffer { failureId: string; faultId: string; causeId: string; symptomId: string; title: string }` `export interface FaultOffers { own: FaultOffer[]; more: FaultOffer[]; unmapped: { failureId: string; title: string }[] }` `export function faultOffers(templateId: string, board: string, lookup: (board: string, failureId: string) => { faultId: string; causeId: string; symptomId: string; title: Text } \| null, locale: string): FaultOffers;` `export function activeFaultIds(project: Project): string[];` (ids of `simulation.faults[]` with `enabled`) `FaultList(props: { offers: FaultOffers; active: readonly string[]; onSet(faultId: string, on: boolean): void; messages })` |
| Data model | `onSet` calls B10's tool, which applies `fault.set` with `enabled` (FE 6.6; ADR-0314); nothing here builds an op by hand. The texts shown after Break (symptom, why, fix) are the catalogue's `FailureMode` texts held in the board descriptor's `failure_modes` (PDM 11.3), resolved to `Text`. Cause and symptom ids come from B10's mapping (T-B10-25). |
| Algorithm | The generator reads the 12 boards through `scripts/convert-io.mjs` (`loadItem`, which runs `gen-content-index.mjs --emit`; plain Node cannot import `src/content/boards/*.ts`) and writes the two tables sorted by catalogue order. `faultOffers` returns `own` first, then `more`; a failure with no B10 mapping goes to `unmapped` and is shown as `lesson.faults.notModelled` text without a Break button. `activeFaultIds` feeds `GuideInput.activeFaults` so the `checks` completion gate stays open while a fault is on. A `break` step in a tour calls the same tool by failure id. |
| State transitions | A fault: off, on (Break), off (Repair); each is one undo step. |
| Validation, errors, edge cases | Counts differ from the plan's "144 board failures": a grep of `trigger: {` finds 127 in `src/content/boards/*.ts` because helpers build some (B10 finding F9). The generator counts from the loaded content, not from text. A failure whose figure fault has no B10 `FaultOp` equivalent (for example a figure-only cosmetic fault) stays `unmapped`. Power-only faults (`brownout`, `reverse-polarity`, `wrong-voltage`) need B10 supply faults; if B10 mapped them they are offered, otherwise unmapped. |
| Permissions, performance, migration | In a room a fault is a document operation and obeys the room's authority (B7); a guest cannot break the host's lesson. No migration. |
| Unit tests | `build-lesson-faults.test.mjs`: tables stable twice; every lesson id of the 71 present; `own` is a subset of `BOARD_FAULTS[board]`. `lesson-faults.test.ts`: order own then more; unmapped listed; `activeFaultIds`. `FaultList.test.tsx`: Break and Repair call `onSet`; unmapped row has no button. A pinned test `unmapped.test.ts` compares the computed unmapped list for all 71 lessons with `content/projects/boards/faults.unmapped.json` (a list of `failureId`s, committed): a new unmapped failure fails the test until Amar-approved text is added to `docs/LESSONS.md`. |
| Integration tests | With B10's real tool on the converted `led` lesson (fixture): Break "LED reversed", run checks, the checks view says a fault is on; Repair, pass. |
| Fixtures | `faults.unmapped.json`; the converted `blink` lesson. |
| Acceptance | **Given** the Blink lesson with its checks passing, **When** I break the LED, **Then** completion stays open with the reason "A fault is on. Repair it to finish." and **When** I repair it, **Then** completion can finish. |
| Observability, release blockers | B10's `diagnosis.record` logging is not triggered by a lesson's Break it (it is a lesson, not a diagnosis); the `fault.set` op is in the history. A fault that cannot be repaired is a release blocker. |
| Definition of done | Tests green. |
| Verify commands | `TL`; `V src/studio/guide src/components/studio/guide scripts`; `node scripts/build-lesson-faults.mjs --check`; `V src/sim/faults` |
| Docs, rollback | `docs/LESSONS.md` lists the unmapped failures with counts. Revert. |
| Later tasks need | `FaultList`, `activeFaultIds`, `faultOffers` (T-B12-24). |

---

### T-B12-22. Edit fixtures (A15): every lesson fails `edit` at zero ops and passes after one change

| Field | Content |
|---|---|
| Identity | T-B12-22; subsystem LABS, meaningful pass; phase B12; priority must; depends on T-B12-03 (`referenceSource`), T-B12-05, T-B12-06, T-B12-07, T-B12-09b (`forkTemplate`), T-B12-13 to 16; status not started; group G6 |
| Intent | Problem: EDU 5.2 acceptance test A15: for each of the 71 lessons, replaying zero ops gives `edit = false`; replaying a stored small change gives `edit = true` and every check still passes. Without it the new rule could make a lesson impossible to finish. Target user: the build, and Amar when he plays three lessons. Story: as the gate I prove that each lesson can be finished by one small, real edit. Behaviour: a script finds one valid edit per lesson, stores it as ops, and a test replays it. Metric: 71 fixtures, or a `NEEDS-AUTHOR.txt` line per lesson with none, each line either fixed or accepted by Amar. |
| Existing files | `EDUCATION.md` 5.2 (A15 text); the T-B12-05 engine and the T-B12-02 `substanceHash` and `stripComments`; `src/project/session.ts` and `src/project/apply/source.ts` (`source.edit` op: minimal range `pos`, `del`, `ins`); `src/components/studio/lessonChecks.ts` (`runLessonTests`, `inlineRun`); T-B12-09b `forkTemplate`; `content/projects/index.ts` (`loadTemplate`); `src/content/boards/reference-old.ts` (`referenceSource`, T-B12-03); the spike's Q5 mutation list. The generator is a Vitest test in update mode, as B5 did for its starters (`tasks/B5-studio-all-boards.md` line 155), because plain Node cannot load the interpreter, the sessions or `runLessonTests`. |
| New files | `src/lib/learn/edit-mutations.ts`; tests `src/lib/learn/edit-fixtures.test.ts` and `src/lib/learn/edit-gate.test.ts`; data `tests/fixtures/edu-solutions/<templateId>.ops.json` (one set, 71 files) and `tests/fixtures/edu-solutions/NEEDS-AUTHOR.txt`. No script. |
| Signatures | Fixture: `{ "template": "prj_uno-r3-button", "mutation": "delay-literal" \| "declare-variable" \| "param-default" \| "verilog-wire", "ops": Op[] }` where `ops` are `source.edit` (and `param.set` for the parameter mutation). `edit-mutations.ts`: `export type MutationKind = 'delay-literal' \| 'declare-variable' \| 'param-default' \| 'verilog-wire'; export function mutationsFor(project: Project): Array<{ kind: MutationKind; ops: Op[] }>;` (candidates in the order below). Modes of `edit-fixtures.test.ts`: with `UPDATE_EDIT_FIXTURES=1 npx vitest run src/lib/learn/edit-fixtures.test.ts` it searches, writes the missing `.ops.json` files and appends the `NEEDS-AUTHOR.txt` lines; without it, it replays. |
| Data model | Mutations are tried in this order until one passes: (1) increase the first integer literal inside `delay(`, `sleep(`, `time.sleep(` or `#delay` by 10 percent (at least +1); (2) add a global declaration with a new name (`int tweak = 0;` or the language's form) after the last `#include` or at the top; (3) change the first parameter chip to its second option or default plus one step; (4) Verilog: add `wire unused_w;` inside the top module. A mutation counts when every check of every test still passes and `isEdited` is true. |
| Algorithm | Update mode: for each template: fork it, build the history by applying the candidate ops through the session as the local actor, run `runLessonTests` inline on the edited project, evaluate `isEdited` and `evaluateCompletion` without the quiz (the quiz gate is separate). Write the fixture for the first candidate that passes, or append `<templateId>: no mutation passed (<reasons>)` to `NEEDS-AUTHOR.txt`. Replay mode (the default, and what the verify line runs) replays every stored fixture. |
| State transitions | None. |
| Validation, errors, edge cases | A lesson whose checks pin exact timing (a `pin-toggles` period range narrower than 10 percent) fails mutation 1 and falls to mutation 2. A mutation that adds a declaration must not trip a `code` check with `mustNot`. `edit-fixtures.test.ts` fails only for a lesson that has neither a fixture nor a `NEEDS-AUTHOR.txt` line. The check that every line ends with ` accepted: Amar` is a separate test, `edit-gate.test.ts`, run only in T-B12-27 and by Amar: only Amar writes that marker, so a task that depended on it could not finish in one sitting. |
| Permissions, performance, migration | Local; 71 reference runs plus 71 mutated runs, about 60 s unloaded (ESTIMATED from 27.8 s for 102 runs); each lesson its own `it` at the 60 s timeout. No migration. |
| Unit tests | `edit-fixtures.test.ts` (`// @vitest-environment node`), per lesson: (a) zero ops: `isEdited` false and `evaluateCompletion().gates.edit` false; (b) stored ops applied: `isEdited` true, every check `ok` (skipped for a lesson with a `NEEDS-AUTHOR.txt` line); (c) an untouched fork of the template reads `edit` false (the F14 proof, section 4.6); (d) a comment-only `source.edit` keeps `edit` false. Totals: the 71 template ids are covered, each by a fixture or a `NEEDS-AUTHOR.txt` line. `edit-gate.test.ts`: every `NEEDS-AUTHOR.txt` line ends with ` accepted: Amar`. |
| Integration tests | The same file. |
| Fixtures | The 71 `.ops.json` files, each under 2 KB (ESTIMATED). |
| Acceptance | **Given** `prj_uno-r3-blink`, **When** the stored mutation is applied, **Then** `isEdited` is true and all 4 Blink checks pass; **Given** zero ops, **Then** `isEdited` is false. |
| Observability, release blockers | The update run prints one line per lesson with the mutation used. An unaccepted `NEEDS-AUTHOR.txt` line blocks the exit gate (`edit-gate.test.ts`, T-B12-27). |
| Definition of done | Fixtures committed; `edit-fixtures.test.ts` green in replay mode. Lines in `NEEDS-AUTHOR.txt` are listed in the commit message and left for Amar; they do not fail this task. |
| Verify commands | `TL`; `UPDATE_EDIT_FIXTURES=1 npx vitest run src/lib/learn/edit-fixtures.test.ts` (writes the data once), then `V src/lib/learn/edit-fixtures.test.ts` (replay, exit 0). `edit-gate.test.ts` is not run here. |
| Docs, rollback | `docs/LESSONS.md` states how many lessons needed which mutation. Revert. |
| Later tasks need | The fixtures and `NEEDS-AUTHOR.txt` (T-B12-27). |

---

### T-B12-23. FA-14 reference-run gate: 102 of 102 equal

| Field | Content |
|---|---|
| Identity | T-B12-23; subsystem LABS, parity gate; phase B12; priority must; depends on T-B12-03, T-B12-07, T-B12-09a (`content/projects/index.ts`, `loadTemplate`), T-B12-13 to 16; status not started; group G6 |
| Intent | Problem: the exit gate says "FA-14: 102 of 102 reference runs equal". FA-14 reads: "Each legacy action in section 6.6 has a destination, and the converted lesson's checks give the same results as before" (FRONTEND 745). Target user: Amar. Story: as the gate I print one table that says 102 of 102 equal and 29 of 29 actions placed. Behaviour: run all 71 lessons from the committed templates and the 31 tasks through the converter in memory, on the new path; compare with the oracle (section 4.3). Metric: 102 of 102 equal; 461 reference verdicts and 461 starter verdicts equal. |
| Existing files | `src/lib/interp/lessons.test.ts` (the model for per-item `it` blocks); T-B12-03 `oracleRows`, `reference.snapshot.json`; T-B12-07 `runLessonTests`, `inlineRun` (`src/components/studio/lessonChecks.ts`); `src/lib/boardlab/store.ts:71-103` (`BoardLabAction`, 29 members, VERIFIED by listing); `FRONTEND_ARCHITECTURE.md` 6.6 (destination table); the B2 converter for tasks; `content/projects/index.ts` |
| New files | `src/content/boards/reference-new.ts`, `src/content/boards/legacy-actions.ts`; tests `reference.test.ts`, `legacy-actions.test.ts` |
| Signatures | `reference-new.ts`: `export function newRow(project: Project, item: { item: string; id: string; kind: 'board-lesson' \| 'robotics-task'; language: Language }, solution?: string): Promise<OracleRow>;` (reference run with the entry source, or `solution` for a task; starter run with `EMPTY[language]` for a lesson and the entry source for a task, mirroring `lessons.test.ts:56-83`) `export function equalRow(oldRow: OracleRow, newRow: OracleRow): string[];` (empty when equal; lines per difference) `legacy-actions.ts`: `export const LEGACY_ACTIONS: Record<string, { to: 'DocStore' \| 'RunStore' \| 'SessionStore' \| 'SimWorker' \| 'progress' \| 'deleted'; op?: string; note?: string }>` with the 29 `BoardLabAction` types and their FE 6.6 destinations |
| Data model | Row shape is `OracleRow` (T-B12-03). Equality is section 4.3. `LEGACY_ACTIONS` follows FE 6.6 line by line: `code/replace` and `code/reset` to DocStore (`source.edit`); `param/set` DocStore (`param.set`); `variant/set` DocStore (`component.swap` or `board.set`); `power/set` DocStore (`component.set`); `fault/trigger`, `fault/clear` DocStore (`fault.set`); `run/start`, `run/stop`, `run/phase`, `run/error`, `run/tick` RunStore with SimWorker control; `serial/append`, `serial/send`, `serial/clear`, `serial/baud`, `serial/sketch-baud` RunStore and SimWorker input; `input/set`, `input/request` SimWorker input; `checks/start`, `checks/progress`, `checks/result` RunStore; `view/set`, `exploded/set`, `part/select` SessionStore; `figure/state` deleted (the lens evaluates it); `assembly/done`, `assembly/reset` progress; `sync/hydrate` deleted. |
| Algorithm | `reference.test.ts` builds one `describe` per board (12) and one for the tasks, one `it` per item (60 s timeout), as `lessons.test.ts` does. Each `it` loads the template (or converts the task in memory), runs `newRow`, finds the oracle row in `reference.snapshot.json`, asserts `equalRow(...)` is `[]`, source equality, `referenceError` null and starter not all `true`. An aggregate `it` at the end asserts 102 rows, 461 reference verdicts and 461 starter verdicts, and prints a table when `IYNK_FA14_TABLE=<path>` is set. The old path is not re-run here (T-B12-03's test keeps it equal to the snapshot), which keeps this file near 55 s unloaded (ESTIMATED: half of four 28 s sweeps). `legacy-actions.test.ts` parses the `type: '…'` literals of `BoardLabAction` from `store.ts:71-103` and asserts the table has exactly those keys with a destination each. |
| State transitions | None. |
| Validation, errors, edge cases | A difference is printed as `item/id: reference[3] old true new false`. The 31 tasks keep their hidden solution in `ext["x-iynk-solution"]` and are not committed in B12; the in-memory converter output is used only inside the test. If the task converter (B2) fails on an item, the item fails with the diagnostic. The expected total is a constant in the test (102) and a failing count is a gate failure, not a skip. Under `CI=true` a missing template file fails (R-001). |
| Permissions, performance, migration | Local. The `basys3` display sweep lives in its own test and is split by T-B0-02; this file runs each Verilog lesson once. Under load (14 busy loops) the sweep took 60.6 s for 102 runs in the audit (SIM line 1907), so each `it` keeps its own 60 s timeout and the file is split per board to stay inside it. |
| Unit tests | The two test files above. |
| Integration tests | `IYNK_FA14_TABLE` run in T-B12-27 for the record. |
| Fixtures | `reference.snapshot.json`. |
| Acceptance | **Given** the 71 committed templates and the 31 converted tasks, **When** `reference.test.ts` runs, **Then** 102 of 102 rows are equal, 461 and 461 verdicts match, and `legacy-actions.test.ts` shows 29 of 29 placed. |
| Observability, release blockers | The table (item, id, language, reference ok count, starter ok count, ms). Any unequal row, or a snapshot drift not approved in T-B12-03, blocks the phase. A changed check threshold to make a row pass is not allowed; it is Amar's call (roadmap 2.5). |
| Definition of done | Both tests green. |
| Verify commands | `TL`; `V src/content/boards/reference.test.ts src/content/boards/legacy-actions.test.ts src/content/boards/reference-oracle.test.ts`; `LOAD` once (three runs under 14 busy loops) and record the failures |
| Docs, rollback | `docs/LESSONS.md` gets the table. Revert. |
| Later tasks need | The same harness checks B13's benches and crafts. |

---

### T-B12-24. Mount the guide in Studio; end-to-end lesson walk and axe

| Field | Content |
|---|---|
| Identity | T-B12-24; subsystem Studio shell, labs; phase B12; priority must; depends on T-B12-08, T-B12-09b, T-B12-10, T-B12-11, T-B12-17 to 21 and T-B12-26 (and through them 05 to 07, 12 to 16); status not started; group G7. It sits alone in G7 because its verify runs `e2e/boardlab.spec.ts`, which T-B12-26 edits, so 26 must be committed first |
| Intent | Problem: the pieces exist but nothing shows them together. M1 and STU 5 give the Studio a left rail with a Guide when the project has `guide`. Target user: Amar playing three lessons. Story: as Amar I open a lesson from the gallery, run it, break it, finish it, and the old page agrees. Behaviour: a mount that wires the pieces to the stores and routes, and one spec that walks it in a browser. Metric: the spec passes in Chromium with zero hydration errors and zero serious or critical axe violations. |
| Existing files | `src/components/studio/StudioEntry.tsx` (T-B4-01, edited by T-B4-11, T-B8-20 and others; read it fresh at task start); `src/studio/stores/doc.ts`, `session.ts`, `run.ts` (`RunStore`) and `src/components/studio/wiring/simLink.ts` (`SimLink`); `src/components/studio/{CodeDock,SerialPane,RunBar,InstrumentDock}.tsx`; `content/projects/index.ts` (`TEMPLATES`, `loadTemplate`, imported here and passed down); `e2e/boardlab.spec.ts:1-30, 174` (the hydration-error listener and the axe call to copy); `e2e/studio-m1.spec.ts` (T-B4-22) |
| New and edited files | New `src/components/studio/guide/GuideMount.tsx`; edit `src/components/studio/StudioEntry.tsx`; new `e2e/studio-lessons.spec.ts` |
| Signatures | `GuideMount(props: { projectId: string; locale: string; messages: Messages['studio'] })`: reads the open project from `DocStore`, builds `GuideDeps` (`stateMatches` from `src/lib/interp/checks.ts:67`; `codeOnly` is `stripComments` from `src/project/guided/substance.ts`, the same function the converter used for the stored hashes; `sha256` and `canonical` from `src/core`; `connected` from the netlist, `partCount`, `paramValue`, `legacyState` from the lens state), calls `useGuide`, and fills `GuideDock` slots with `ChecksView`, `LessonHints`, `InputsDock`, `StatusPanel`, `FigureLens`, `AssemblyGuide`, `WireGuide`, `FaultList`, `LessonNav`. `StudioEntry` handles the route kinds `lessons` and `template` that T-B12-18 added to `StudioRoute` (`parseHash`, `routeHash`, `navigate`): `lessons` renders `TemplateGallery` with `TEMPLATES` from `content/projects`; `template` calls `openTemplate` (passing `loadTemplate`, the library and `findFork`) and navigates to `{ kind: 'project', id, autorun }`. `Run checks` maps its `LessonRun` to the engine with `toGuideRun`. The Guide rail is shown only when `project.guide` exists. |
| Data model | No new data. The mount owns no state; it forwards stores. |
| Algorithm | On `template` route: `openTemplate(id)` (reopens the learner's fork, T-B12-09b), navigate. On a project with a guide: mount `GuideMount` in the left rail; the lens opens on request; `Run checks` calls `runLessonTests` with `startChecks` (worker) and passes the result to the engine as `RunView` and to `ChecksView`. A completion is written once. Pressing Run (RunBar) is separate from Run checks: Run is the live run for watching; Run checks is the deterministic check job (the same split as the old page). |
| State transitions | Route: gallery, template, project. Rail: guide visible or hidden. |
| Validation, errors, edge cases | A template that fails to load shows the B4 error banner with the id. A project opened by hash without a record gets one on first interaction. A room guest sees the dock read-only (T-B12-17). IndexedDB missing: lessons still run, progress is in memory with the B3 banner. |
| Permissions, performance, migration | Local. The rail adds no work to a project without a guide. The first import of `iynk:v1` runs when `learnStore()` is first called (T-B12-08). |
| Unit tests | `GuideMount.test.tsx` (jsdom, fake stores): the rail appears with a guide and not without; Run checks writes a `lastRun`. |
| Integration tests | None beyond the spec. |
| Playwright | `e2e/studio-lessons.spec.ts` (Chromium; the WebKit project of T-B3-21 runs the first two scenarios if it exists): **S1 gallery**: `/en/studio#/lessons` shows 71 lesson cards and 12 tours; filter "Input" shows 14. **S2 Blink walk**: open "Blink" with run, press Run checks, 4 of 4 pass, the line asks for a change; edit `delay(500)` to `delay(250)` in the code dock, answer one quiz question, the line reads "Completed in simulation at"; reload, still complete; `/en/boards/uno-r3` shows 1 of 16 done (the facade). **S3 input**: open `button`, hold the input with the keyboard, the pin readout shows D13 HIGH. **S4 import**: seed `localStorage['iynk:v1']` with `board:uno-r3:lesson:blink`, first load, the gallery shows "Done (old record)" and `iynk:v1` still holds the key. **S5 fault**: break the LED in Blink; checks pass, the line says a fault is on; repair; finish. **S6 keys**: `[` and `]` move the viewed step; Tab reaches every dock control; axe on the lesson page has no serious or critical violation. **S7 language**: `/hi/studio#/lessons` shows the Hindi gallery title. **S8 tour**: open the Uno tour, Show me on step 1, the figure view opens read-only for lessons and interactive for the tour. The old `e2e/boardlab.spec.ts` is run in the same command and stays green. |
| Fixtures | A seeded `localStorage` document. S2 edits `delay(500)` by hand in the code dock; it does not use the T-B12-22 fixtures (22 and 24 are not ordered by a dependency). |
| Acceptance | **Given** a clean browser, **When** the spec runs, **Then** S1 to S8 pass; **Given** the old lab, **Then** its 12 tests pass. |
| Observability, release blockers | The hydration-error listener of `boardlab.spec.ts:17` is reused; any such error fails the spec. No request outside the app origin during S1 to S8 (copy the listener of M1 step 1). |
| Definition of done | Spec green on a local keyless build. |
| Verify commands | `TL`; `V src/components/studio/guide`; `E e2e/studio-lessons.spec.ts e2e/boardlab.spec.ts` |
| Docs, rollback | `docs/LESSONS.md`. Revert removes the rail and the routes; templates stay as data. |
| Later tasks need | The rail is the same for benches and crafts in B13. |

---

### T-B12-25. Notice while unchecked third-party text remains

| Field | Content |
|---|---|
| Identity | T-B12-25; subsystem Studio, provenance; phase B12; priority could; depends on T-B12-06, T-B12-12 (the `lesson.guide.provenance.*` strings); B3 (T-B3-05 export), B7 (shares), B5 (project menu, T-B5-19); status not started; group G6 |
| Intent | Problem: finding F13. STU 13.2 step 6 and D-017 want Export and "Share beyond buddies" to warn while `provenance.thirdParty` rows are `unchecked`. Every converted lesson starts that way. Target user: Amar before he publishes anything. Story: as Amar I am told once, plainly, that this lesson's text is not reviewed yet. Behaviour: a count and a notice shown before export and before sharing outside buddies. Metric: exporting a forked lesson shows the notice with the count; a blank project does not. |
| Existing files | `PROJECT_DATA_MODEL.md` 5.17 (`thirdParty` rows: `id`, `kind`, `what`, `source`, `license?`, `review`); `provenance.set` (7.2, moves a row from `unchecked` to `cleared` or `rewritten`); the export entry points: `src/export/iynk.ts` (T-B3-05, pure writer), the export command in `src/studio/commands.ts` or the project menu of T-B5-19, and the share dialog of B7 (Step 0 names them; this task edits at most two of them) |
| New files | `src/studio/provenance-notice.ts`, `src/components/studio/UncheckedNotice.tsx`; edits to at most two files named by Step 0; tests beside each |
| Signatures | `export function uncheckedCount(project: Project): number;` `export function noticeFor(project: Project, action: 'export' \| 'share-beyond-buddies'): { show: boolean; count: number };` `UncheckedNotice(props: { count: number; action: 'export' \| 'share-beyond-buddies'; onContinue(): void; onCancel(): void; messages })` |
| Data model | Reads `provenance.thirdParty[].review`. Writes nothing. Strings are `lesson.guide.provenance.unchecked`, `exportNote` and `shareNote` (all three are in T-B12-12's list, section 4.5). |
| Algorithm | `uncheckedCount` counts rows with `review === 'unchecked'`. `noticeFor` returns `show: true` when the count is above zero and the project is not a blank or an own project (origin kind `blank`). The notice has Continue and Cancel; Continue proceeds, so nothing is blocked (D-017 is Amar's decision, not a lock). |
| State transitions | None. |
| Validation, errors, edge cases | No rows: no notice. A shared project is the same project; the notice is about the sender. A fork keeps the rows (T-B12-09b). |
| Permissions, performance, migration | Local. |
| Unit tests | `provenance-notice.test.ts`: counts for a fork of a lesson (at least 1), a blank project (0), a project with all rows `cleared` (0). `UncheckedNotice.test.tsx`: both actions, Continue and Cancel callbacks, keyboard. |
| Integration tests | The edited export entry shows the notice for a forked lesson (jsdom). |
| Fixtures | A converted lesson. |
| Acceptance | **Given** a forked lesson, **When** I press Export, **Then** a notice says how many text items are not reviewed, and Continue exports. |
| Observability, release blockers | None. |
| Definition of done | Tests green. |
| Verify commands | `TL`; `V src/studio src/components/studio src/export`; `I18N` |
| Docs, rollback | `docs/PROVENANCE.md` (T-B12-27) says what the notice means. Revert. |
| Later tasks need | The same count for benches and crafts in B13. |

---

### T-B12-26. Old board pages link into Studio and are marked "lesson view"

| Field | Content |
|---|---|
| Identity | T-B12-26; subsystem Board Lab pages; phase B12; priority should; depends on T-B12-09b (`templateIdFor`); status not started; group G6 |
| Intent | Problem: R-151 keeps old URLs working and R-152 keeps the old pages until the Studio version is better. Users need a way from the old page to the Studio version. Target user: anyone with a bookmark. Story: as a learner on `/en/boards/uno-r3/blink` I see "Open in Studio" and the page says it is the lesson view. Behaviour: one link per lesson page and one per board page, same language, no redirect. Metric: the link target is `/en/studio#/t/prj_uno-r3-blink`. |
| Existing files | `src/app/[lang]/boards/[board]/[lesson]/page.tsx:1-70` (Server Component; `Lesson` renders `LessonWorkspace` inside `LabRoom`); `src/app/[lang]/boards/[board]/page.tsx` (board page); `src/i18n/messages/<lang>/boardlab.json` (loaded by `getT(lang, "boardlab")`, page.tsx line 30); `e2e/boardlab.spec.ts:51-230`; `e2e/redirects.spec.ts:9-10` (a room URL stays valid); `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md` (read: `href` string, `prefetch` prop, lines 60-67 and 294) |
| New and edited files | New `src/components/boardlab/OpenInStudio.tsx`; edit the two page files; edit the six `boardlab.json` files (one set, keys `openInStudio` "Open in Studio", `lessonView` "Lesson view: the full editor is in Studio"); edit `e2e/boardlab.spec.ts` (test file) |
| Signatures | `OpenInStudio(props: { lang: Locale; board: string; lesson?: string; label: string; note: string })` (a Server Component: a paragraph with the note and a `<Link>` from `next/link` whose `href` is the language prefix, then `/studio#/t/`, then `templateIdFor(board, lesson ?? 'tour')`, with `prefetch={false}`). `templateIdFor` comes from `src/studio/fork.ts` (T-B12-09b), which imports types only, so this Server Component pulls neither the template index nor the library types. `OpenInStudio.tsx` imports it from there and not from `templates.ts`. |
| Data model | None. |
| Algorithm | The lesson page renders `OpenInStudio` above the workspace; the board page renders it once with `lesson` undefined (the tour). `prefetch={false}` because the target is the heavy Studio page behind a hash (Next's guide: prefetching runs when a link is in the viewport and only in production). Room links (`?room=`) are not touched (`redirects.spec.ts:9`). |
| State transitions | None. |
| Validation, errors, edge cases | The lesson id comes from the route params already validated by `loadBoardPage`; an unknown lesson still 404s before the link renders. Languages without the new strings fall back to English through `getT` as the page does for other keys; the parity test requires all six. |
| Permissions, performance, migration | The link is static markup; no new request. Adds under 1 KB per page. |
| Unit tests | `OpenInStudio.test.tsx`: href for a lesson and for the tour, label and note text. The six-language parity test (`I18N`). |
| Integration tests | None. |
| Playwright | `e2e/boardlab.spec.ts` gains: the lesson page has a link "Open in Studio" with the exact href above; following it reaches the gallery or the forked lesson (covered with T-B12-24's spec, so this test only checks the href); the page still passes the existing axe test. |
| Fixtures | None. |
| Acceptance | **Given** `/en/boards/uno-r3/blink`, **Then** the page shows the lesson view note and a link to `/en/studio#/t/prj_uno-r3-blink`, and everything else is unchanged. |
| Observability, release blockers | None. Deleting or redirecting an old page is a release blocker for this phase (R-152). |
| Definition of done | Tests and the old specs green. |
| Verify commands | `TL`; `V src/components/boardlab src/i18n`; `E e2e/boardlab.spec.ts e2e/redirects.spec.ts` |
| Docs, rollback | `docs/LESSONS.md` explains the two pages. Revert removes the link and the two keys. |
| Later tasks need | B13 adds the same link to the robotics and drone pages. |

---

### T-B12-27. `docs/LESSONS.md`, provenance rows, exit gate record

| Field | Content |
|---|---|
| Identity | T-B12-27; subsystem docs and gate; phase B12; priority must; depends on all other B12 tasks and on T-B1-17 being committed (it creates `docs/PROVENANCE.md` with its seed rows and `scripts/provenance-check.mjs`); status not started; group G8 |
| Intent | Problem: the card names `docs/LESSONS.md` and the exit gate needs numbers on record for Amar. Target user: Amar and a contributor. Story: as Amar I read one page that says what moved, what did not, what is unmapped, and the FA-14 numbers. Behaviour: write the page, append provenance rows, run the whole gate once, paste the numbers. Metric: `npm run check` exits 0 and the page holds the table. |
| Existing files | `docs/PROVENANCE.md` and `scripts/provenance-check.mjs` (T-B1-17; neither exists today, VERIFIED); `docs/ARCHITECTURE.md`; `docs/STUDIO.md` (T-B5-23); the outputs of T-B12-03, 22, 23 |
| New and edited files | New `docs/LESSONS.md`; edit `docs/PROVENANCE.md` (if absent the agent stops and reports: B1 owns its creation) |
| Content of `docs/LESSONS.md` | (1) How a lesson works in Studio: fork, Start checkpoint, plan, gates, edit rule, Reset. (2) The commands: `npm run templates`, `templates:check`, `UPDATE_EDIT_FIXTURES=1 npx vitest run src/lib/learn/edit-fixtures.test.ts`, `node scripts/build-lesson-faults.mjs`. (3) Counts: 12 boards, 71 lessons, 12 tours, 83 files, 461 checks, 134 assembly steps, per-group counts. (4) The FA-14 table (from `IYNK_FA14_TABLE`) and the T-B12-03 drift list. (5) Lessons with manual assembly gates (spike Q4) and circuits kept on the bare board (spike Q2). (6) The unmapped faults list and counts. (7) Losses: comment translations in starter code are English only (`code-comments-en-only`, PDM 11.5); board quiz results were never stored, so none were imported; hidden checks are a courtesy. (8) The strings that need a native read (`NEEDS_NATIVE_READ`). (9) Progress: the import, the facade, the marker, the left-over `iynk:v1`. (10) What B13 will move. |
| Provenance rows | T-B1-17 already seeds a row "lessons (71) and their structure"; this task does not duplicate it. It appends rows in the B1 format `\| id \| set \| source \| what was copied \| how \| status \| decided by \|` between the `<!--provenance:start-->` and `<!--provenance:end-->` markers for: the 12 board tours, the six-language lesson text, and the check thresholds. Each cites `src/content/boards/<id>.ts` and `src/i18n/content/*/boards/<id>.json`, says "may follow a third-party lesson site (D-017, F-197)", has `status` `rewrite-needed` (an open row, so the thresholds are not marked `own` without a person deciding) and `decided by` `unset`. The values `unchecked` and `cleared` are not used by an agent. |
| Exit gate run | In this order on `build/v1` with the keyless prefix: `npm run templates:check`; `npm run check`; `IYNK_FA14_TABLE=<path> npx vitest run src/content/boards/reference.test.ts`; `E e2e/studio-lessons.spec.ts e2e/boardlab.spec.ts e2e/redirects.spec.ts`; `npx vitest run src/lib/learn/edit-gate.test.ts` (lists any `NEEDS-AUTHOR.txt` line not yet accepted); `npm run provenance:check` (exit 0, lists the open rows) and `npm run provenance:check -- --strict` (exit 1 expected while rows are open); `LOAD` for the three test files that run lessons (record failures; the audit found 13 wall-clock timeouts under load before B0). The agent pastes: numbers of FA-14, A15, the unmapped faults, the e2e result, the size of `content/projects` (bytes), the time of `reference.test.ts`. |
| Unit and Playwright tests | None new. |
| Acceptance | **Given** the page, **Then** every number in it appears in a command output pasted in the commit message. |
| Observability, release blockers | A red `npm run check`, FA-14 below 102 of 102, or an unaccepted `NEEDS-AUTHOR.txt` line blocks the OK. |
| Definition of done | Page committed; gate output recorded. |
| Verify commands | `npm run check` (the full gate, run once here only); the exit gate run above; `npm run provenance:check` (exit 0) |
| Docs, rollback | Revert removes the page. |
| Later tasks need | B13 copies the page structure for benches and crafts. |

---

## 7. Exit gate and release blockers

| Gate | Command or check | Pass when | Owner task |
|---|---|---|---|
| Whole repository | `npm run check` (content check, templates check, typecheck, lint, test, e2e) | exit 0 | T-B12-27 |
| FA-14 reference runs | `IYNK_FA14_TABLE=<path> npx vitest run src/content/boards/reference.test.ts` | 102 of 102 rows equal; 461 reference and 461 starter verdicts equal; every starter fails at least one check | T-B12-23 |
| FA-14 actions | `npx vitest run src/content/boards/legacy-actions.test.ts` | 29 of 29 `BoardLabAction` types have a destination | T-B12-23 |
| Oracle | `npx vitest run src/content/boards/reference-oracle.test.ts` | equals the snapshot from `main` `4d11dc5`; `driftFromBuild` is empty or approved by Amar | T-B12-03 |
| Meaningful pass (A15) | `npx vitest run src/lib/learn/edit-fixtures.test.ts` and `npx vitest run src/lib/learn/edit-gate.test.ts` | 71 of 71 lessons covered by a fixture or a `NEEDS-AUTHOR.txt` line (T-B12-22); every `NEEDS-AUTHOR.txt` line carries ` accepted: Amar` (`edit-gate.test.ts`, run in T-B12-27 and by Amar) | T-B12-22, 27 |
| Templates | `npm run templates:check` | exit 0; 83 files; 71 lessons and 12 tours | T-B12-09a, 13 to 16 |
| Parity of progress | `npx vitest run src/lib/learn src/lib/progress` | imported counts by prefix equal the old counts; `iynk:v1` unchanged | T-B12-08 |
| Browser walk | `E e2e/studio-lessons.spec.ts e2e/boardlab.spec.ts e2e/redirects.spec.ts` | S1 to S8 pass; the 12 old Board Lab tests pass (plus the one link test of T-B12-26); zero hydration errors; zero serious or critical axe violations | T-B12-24, 26 |
| Six languages | `npx vitest run src/i18n` | parity for `studio` and `boardlab`; template text parity inside the four conversion tests | T-B12-12, 13 to 16 |
| Old pages untouched | `git diff --stat phase-B11..HEAD -- src/components/boardlab src/app/\[lang\]/boards src/lib/boardlab src/lib/progress` | only `OpenInStudio.tsx`, the two page files, `boardlab.json` and the `src/lib/progress` facade edits | T-B12-26 |
| Amar plays three lessons | section 9, item 1 | he says yes | For Amar |

Release blockers in one list: a done flag lost in the import; a completion without a real edit; a changed check threshold not approved; any old page deleted or redirected; any request outside the app origin during the walk; a hidden check's text in the DOM; the lens sending a command other than `set` in `view` mode; a fork that keeps `x-iynk-solution`.

## 8. Risks

| # | Risk | Likelihood and effect | Mitigation | Task |
|---|---|---|---|---|
| R1 | A lesson relies on a figure behaviour the new model lacks (card R1). Faults with no B10 mapping; assembly `done` keys a run cannot supply; circuits with a part that has no descriptor | ESTIMATED medium; a lesson or a step degrades | Listed, never dropped: unmapped faults pinned in `faults.unmapped.json`; manual gates listed; bare-board fallback with the lens; the old page stays | 01, 06, 20, 21, 27 |
| R2 | Third-party content converted before Amar clears it (card R2, D-017) | certain at B12 end | Text copied as is; every project carries `unchecked` rows; notice before export and share; the review is "For Amar" | 06, 25, 27 |
| R3 | Progress lost in migration (card R3) | low; high effect | Marker written only after read-back; `iynk:v1` never edited; facade falls back to the old path if the store is unavailable | 08 |
| R4 | The baseline moved before B12 (B3, B8, B9 change timing, stubs and the ADC formula) | ESTIMATED medium | Oracle from `main` in a scratch worktree; drift listed; a threshold change is Amar's | 03, 23 |
| R5 | The spike finds many gaps and the converter work outgrows one task | ESTIMATED medium | The Fix list is a gate: the orchestrator cuts the T-B12-01 report into sub-tasks T-B12-06a, 06b ... of at most 5 files each before G1b; T-B12-06 only emits the plan; the conversion tasks stop on a gap and send it back as a new sub-task | 01, 06 |
| R6 | Repository grows by about 4 MB of JSON and `npm test` by about 1 to 2 minutes | ESTIMATED | Size measured and recorded; one `it` per lesson; the old path is not re-run in the gate | 13 to 16, 23, 27 |
| R7 | Two copies of the checks and failure views until the old pages go | certain | Documented trade (Q3); old files untouched so rollback is clean; deletion is B13+ and Amar's | 19, 21 |
| R8 | The meaningful-pass rule frustrates (a lesson that cannot be finished by a small edit) | low after A15 | A15 fixtures prove one small edit exists for each lesson | 22 |
| R9 | The hash exclusion list (section 4.6) is wrong and `edit` reads true on an untouched fork | ESTIMATED low | A15 case (c) tests an untouched fork for all 71 | 02, 22 |
| R10 | Studio keys collide: `[` and `]` are lesson keys on the old page and guide-step keys in Studio | low | The old map stays on the old pages; the Studio map is its own (STU 6.11); the keymap dialog shows both | 18 |

## 9. For Amar, and questions only Amar can answer

Work only a person can do. None of it is an agent task.

| # | What | Why a person | When |
|---|---|---|---|
| 1 | Play three lessons in Studio and say yes or no. Suggested set: `uno-r3` "Push a button" (input, circuit, world input), an `esp32-devkitc` Wi-Fi lesson (network device), a `basys3` Verilog lesson (ports). Also open the Uno tour and break the LED in Blink | The exit gate (card) | Phase end |
| 2 | Review `docs/PROVENANCE.md` rows for the board content and mark each `cleared`, `rewrite-needed` or `own`; rewrite what needs it | Counsel or his own judgement (D-017, F-197); the roadmap section 6 item 2 already lists it | Before publishing |
| 3 | Read `tests/fixtures/edu-solutions/NEEDS-AUTHOR.txt` and add ` accepted: Amar` or write the fixture | EDU A15 says "reviewed by hand" | Before the OK |
| 4 | Ask a native reader to check the strings in the `NEEDS_NATIVE_READ` list (R-150) | Language skill | Any time |
| 5 | Decide when each old board page goes (R-152): after the parity tests, the accessibility checks and the budgets, and after he has compared the two side by side (STU 13.3 (d)) | A person must compare | After B12, in a separate commit |
| 6 | Write goal tests ("blink twice as fast") if he wants them (EDU 5.3, ESTIMATED 12 to 35 hours) | New lesson content is Amar's (R-149) | Optional |

Open questions (each has a default the agents use if Amar does not answer):

| # | Question | Default |
|---|---|---|
| Q1 | The gate says "102 of 102" but the card scope is the 71 board lessons. Accept 71 committed templates plus the 31 robotics tasks run through the converter in memory (this plan), or change the gate to "71 of 71 now and 31 of 31 in B13"? | This plan (finding F2) |
| Q2 | Which three lessons does he play? | The set in item 1 above |
| Q3 | Two views of the same checks and failures until the old pages go (finding F6). A perfectionist would reject the duplicated markup (about 250 lines). A pragmatist would accept it because the old pages stay untouched, rollback is one `git revert` per task, and the old code is deleted later anyway. Which does he want? | The pragmatist: new Studio views, old files untouched |
| Q4 | Accept an agent-generated edit fixture per lesson (small mutation of a delay, a declaration, a parameter) as the A15 proof, with hand review only for `NEEDS-AUTHOR.txt` lines? | Yes |
| Q5 | Accept the substance-hash exclusion list (section 4.6) and the edit op kinds `source.`, `component.`, `net.`, `wire.`, `param.` (EDU names `source.edit`, `component.*`, `net.*`, `param.set`; `wire.*` is added)? | Yes |
| Q6 | Build T-B12-25 (notice before export and share while text is unreviewed), or leave it for the publishing step? | Build it (priority could, cut first) |
| Q7 | If the oracle shows drift between `main` and `build/v1` (T-B12-03), is the drift accepted (new timing and ADC formula) or must the interpreters be changed back? | Stop and ask; an agent never changes a threshold |
| Q9 | Store the wire-it lists in the project as `ext["x-iynk-wireables"]` (section 4.7), which departs from PDM line 1167 ("Not in the project")? The alternative is a B5 descriptor extension that carries the lists. | Yes, in the project |
| Q8 | Should completing a lesson on an old page keep counting as a legacy completion (shown "Done before the edit rule"), or should the old page also require the edit rule? | Legacy completion; old pages are not edited |

## 10. Traceability

| ID | Subject | Tasks | Note |
|---|---|---|---|
| F-023 | Meaningful pass | 02, 05, 17, 22 | The rule is a generic algorithm; goal tests are not built (Amar's, item 6) |
| F-031 | Board catalogue and browse | 09a, 09b, 13 to 16, 18, 26 | Old catalogue pages stay |
| F-032 | 71 lessons with checks | 06, 13 to 16, 17, 19, 22, 23 | |
| F-033 | Check engine and quizzes | 07, 19, 23; quizzes 17 | The engine is unchanged |
| F-034 | Code editor, Run, Stop, Reset, Copy, shortcuts | B4 (T-B4-12, 13, 19); Reset lesson 17; `[` `]` 18 | |
| F-035 | Workspace readouts and inputs | pin readout and board view B5 (T-B5-06); inputs 10; assembly and wire 20; figure 11 | |
| F-036 | Progress storage and home dashboard | 04, 08 | Dashboard code unchanged |
| F-037 | Figures | 11 | Figures stay as the visual library (R-144) |
| F-052 | Live status and current draw | 10 | Generic panel; bench model B13 |
| F-057, F-063 to F-067, F-181 | Benches, drones, calculator, fixtures | none in B12 except the shared gate machinery (23) | Section 1.1 |
| F-077 | Catalogue converter | B2; gaps 01, 06 | |
| F-151 | Local completion record | 04, 08, 17 | No badge, no credential |
| F-197 | Clear or rewrite third-party content | 25 supports; item 2 is Amar's | |
| R-139 | Board catalogue as templates | 06, 09a, 09b, 13 to 16, 18 | |
| R-140 | Lessons as guided projects | 02, 05, 12, 17, 22 and the data in 13 to 16 | |
| R-141 | Check engine parity | 03, 07, 19, 23 | |
| R-142 | Workspace panels | 10, 20, 24; serial and pins from B4 | |
| R-143 | Progress import | 04, 08 | |
| R-144 | Figures stay | 11, 20 | |
| R-145 to R-148 | Robotics and drone | none in B12 | B13 |
| R-151, R-152 | URLs; retire only on parity | 18, 26 | Nothing is deleted |
| FA-14 | Actions placed; verdicts equal | 23 | |

## 11. Return list

The task list is the table in section 5. Groups: G1 T-B12-01, 02, 03, 04, 12. G1b T-B12-06a, 06b ... (written by the orchestrator from the T-B12-01 Fix list). G2 T-B12-05, 06, 07. G3 T-B12-09a, 09b, 10, 11. G4 T-B12-08, 13, 14, 15, 16. G5 T-B12-17, 18, 19, 20, 21. G6 T-B12-22, 23, 25, 26. G7 T-B12-24. G8 T-B12-27.

## Review fixes (2026-10-27)

Twenty review issues were checked against the named files. All twenty are applied; where the fix departs from the reviewer's wording, the row says so. Evidence labels: VERIFIED means read in a file in this pass.

| # | Issue | Evidence checked | What changed |
|---|---|---|---|
| 1 | Layering contradicts the matrix | `SYSTEM_ARCHITECTURE.md` 5.3 (VERIFIED): `project` imports `core` only; `studio` imports `core`, `project`, `parts`, `sim-host`; `local` imports `core`, `protocol`, `project`, `parts`. `tasks/B2-core-document-netlist.md` line 244 (VERIFIED): `src/lib` is `labs` and unconstrained, portable folders use relative `.ts` imports and no `@/` | Pure modules moved to `src/project/guided/` (plan, validate-plan, substance, record, engine, gates, edit), so `PORTABLE` and `ARCH` cover them. `LearnStore` and its repo are in `src/local/`. `useGuide.ts` is in `src/components/studio/guide/`. `stateMatches` is injected through `GuideDeps`; `codeOnly` is injected too, with `stripComments` (a portable copy, parity-tested against `src/lib/interp/checks.ts:72`) as the value everyone passes, because `checks.ts` imports `@/content/schema` and plain Node cannot load it. `controlFor` is copied into `src/studio/run/inputs.ts` with a drift test in the UI test. `keymap.ts` gets its own small typing check. Rule 3 reworded, section 3.4 added |
| 2 | Wrong B4 and B5 paths | `B4-studio-uno.md` D4-3, lines 28 and 548 (VERIFIED): `src/studio/stores/run.ts` and `src/components/studio/wiring/simLink.ts`; `B5-studio-all-boards.md` line 685 (VERIFIED): `checkJobFor` and `boardPinsFor` are in `src/components/studio/checkJob.ts` | `session.ts` replaced in 3.3 and T-B12-10, 24; `lessonJob.ts` and `lessonChecks.ts` live in `src/components/studio/`; B5's `checkJobFor` and `boardPinsFor` are reused; engine type renamed `GuideRun`. The run summary types (`LessonRun`, `TestRun`, `CheckVerdict`) are in `src/project/guided/record.ts` so `studio` files can use them without importing UI |
| 3 | T-B12-09 has 6 files | Count in the old row | Split into T-B12-09a (script, index, four group indexes as one, `package.json`: 4 files) and T-B12-09b (`fork.ts`, `templates.ts`: 2 files), both G3 with no shared file. 13 to 16 and 08 depend on 09a; 17, 18, 22, 24, 26 on 09b |
| 4 | Group population contradictory | Old T-B12-09 and 13 to 16 rows | The group-to-board list is data: `content/projects/boards/<group>/boards.json`, written by tasks 13 to 16. The script reads it; absent or empty means an empty index and exit 0. 13 to 16 verify with `node scripts/build-templates.mjs --group <g> --check`; the global `npm run templates:check` runs from G5 on |
| 5 | Substance hash names wrong fields | `project.schema.json` `$defs.Source` (VERIFIED): the text is `content`; `$defs.View` has `id, kind, name, surface, placements, junctions, wires, labels, groups`, no viewport or selection; `$defs.Meta` has `thumbnail` | 4.6 uses `sources[].content`, keeps `views[]` whole, also drops `meta.thumbnail`; `substance.test.ts` has the comment-only case |
| 6 | `createProgressRepo` has nothing to call | `B3` line 369 (VERIFIED): `Repository` has no progress methods; `memory-repository.ts` has no progress store; `storage-health.ts` (T-B3-04) writes to `progress` | Option 2: `src/local/progress.ts` opens the store with `openDb()` and `STORES.progress`, with its own `memoryLearnKv` fake. Keys are `learn:<projectId>`; `all()` filters on the prefix and on `v === 1` and never touches foreign rows. `Repository` is not edited |
| 7 | T-B12-06 scope unbounded | `B2` lines 1161 to 1173: `npm run corpus` writes `.corpus/manifest.json`, `--check` compares `src/project/convert/corpus.manifest.json`; no other check command | The Fix list is a gate: the orchestrator writes sub-tasks T-B12-06a.. (G1b, at most 5 files each) from the T-B12-01 report. T-B12-06 now lists `plan.ts`, `index.ts`, `convert-catalogue.mjs` and the regenerated manifest (4 files) and verifies with `npm run corpus` plus the manifest copy plus `npm run corpus -- --check`. Plan types come from `src/project/guided` |
| 8 | Scripts load TS under plain Node | `B5` line 155 (VERIFIED): starters are generated in a Vitest update-mode test to avoid running TypeScript content under Node | T-B12-09a and T-B12-21 read the catalogue through `scripts/convert-io.mjs` and load `src/project/**` by type stripping, as `convert-catalogue.mjs` does. T-B12-22 is a Vitest update-mode test (`UPDATE_EDIT_FIXTURES=1`); `make-edit-fixtures.mjs` is gone. (The reviewer cited B5 line 148; the statement is at line 155) |
| 9 | T-B12-02 defects | Old signatures | `PlanIssue.severity` added; `GUIDED_MODES`, `RUNGS`, `COMPLETE_GATES`, `GATE_KINDS` are const arrays with derived types; verify runs all three test files and `SCHEMA` (with a fallback if `schema:check` does not cover the new schema files) |
| 10 | T-B12-05 signature errors | Old row | `type GuideRun = {...} \| null`; `CompletionResult` carries `warnings` and `editFlip`; `stateMatches` is in `GuideDeps`; the edit gate is latched in the record as `editedAt` (`withEdited`), so compaction (PDM 5.15, 1,000 ops) cannot reopen it. `editedAt` is an additive field on EDU 11.2's record, recorded in 4.2 as a PROPOSAL |
| 11 | Start checkpoint `store: 'local'` | `$defs.Checkpoint` (VERIFIED): `store` is `container` or `local-db`; `author` matches `^usr_[a-z0-9][a-z0-9_-]{0,63}$` | T-B12-09b uses `local-db` and a `usr_` actor; the test asserts V1 to V5 pass |
| 12 | Route API names | `B4` line 228 (VERIFIED): `StudioRoute`, `parseHash`, `routeHash`, `readRoute`, `navigate`; invalid hash is `home` | T-B12-18 uses those names, adds `{kind:'lessons'}` and `{kind:'template'; id; run}`, a new test table, and says a well-formed unknown template id fails in `openTemplate` with `TemplateNotFound`. Dep column gains 08 and 13 to 16 |
| 13 | Dep column | Each task's text | Added: 07 to 04; 10 to 12; 11 to 12; 25 to 12; 17 to 09b and 02; 20 to 05; 22 to 03, 06, 09b; 23 to 09a. Also 08 to 09a (issue 17) and 24 to 26 (issue 14) |
| 14 | T-B12-24 uses a sibling's fixture | Old rows | The T-B12-22 fixture is removed from 24 (S2 edits `delay(500)` by hand). 24 moved to G7 and depends on 26, because its verify runs `e2e/boardlab.spec.ts`, which 26 edits. 27 is now G8 |
| 15 | `LOAD` undefined | Section 3.1 (VERIFIED, missing) | `LOAD` defined in 3.1 |
| 16 | T-B12-22 blocked on Amar's marker | Old unit-test row | `edit-fixtures.test.ts` fails only for a lesson with neither a fixture nor a `NEEDS-AUTHOR.txt` line. The `accepted: Amar` check is `edit-gate.test.ts`, run in T-B12-27 and by Amar |
| 17 | T-B12-08 facade timing | Old algorithm row | Depends on 09a, moved to G4. Old `iynk:v1` keys answer until the marker exists and `ready` resolves; `markDone` before `ready` writes the old key and queues the store write; `stepCount` is async through a dynamic import of `content/projects`; test added |
| 18 | `templateIdFor` pulls the index | Old row | Moved to `src/studio/fork.ts` (types only); `OpenInStudio.tsx` imports it from there |
| 19 | Provenance vocabulary | `B1` lines 819 to 828 (VERIFIED): columns `id, set, source, what was copied, how, status, decided by`; status `cleared`, `rewrite-needed`, `own`; default `provenance:check` exits 0, `--strict` exits 1; B1 seeds a lessons row | T-B12-27 appends only the tours, six-language text and check-threshold rows, `rewrite-needed`, `unset`; depends on T-B1-17; verify runs `provenance:check` (exit 0) and `--strict` (exit 1 expected). The reviewer wrote exit 1 for the plain command; B1 changed the default to 0 (its Q12), so the plan follows B1 |
| 20 | Wireables open | `PROJECT_DATA_MODEL.md` line 1167 (VERIFIED): "Not in the project"; `COMPONENT_SCHEMA.md` line 325: `compatibility.rules[]` are rules with kinds and params, not wiring lists | Decision (a): `ext["x-iynk-wireables"]` as `WireablesExt`, with a schema, one valid and two invalid fixtures in T-B12-02; spike Q6 is informational; `withWireables` takes `WireablesExt`; `AssemblyStep[]` return type fixed; section 4.7 and open question Q9 record the departure from PDM 1167 |

### Updated task list

| Group | Tasks |
|---|---|
| G1 | T-B12-01, 02, 03, 04, 12 |
| G1b | T-B12-06a, 06b ... (orchestrator, from the T-B12-01 Fix list) |
| G2 | T-B12-05, 06, 07 |
| G3 | T-B12-09a, 09b, 10, 11 |
| G4 | T-B12-08, 13, 14, 15, 16 |
| G5 | T-B12-17, 18, 19, 20, 21 |
| G6 | T-B12-22, 23, 25, 26 |
| G7 | T-B12-24 |
| G8 | T-B12-27 |
