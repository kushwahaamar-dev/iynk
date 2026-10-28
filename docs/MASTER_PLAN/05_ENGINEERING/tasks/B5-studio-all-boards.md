# B5. Studio editor: all boards, views, history, phone. Task packages

Written 2026-10-27 for the build-plan run. Plan only: nothing in `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed to write this file, and nothing was committed.
Phase card: `05_ENGINEERING/IMPLEMENTATION_ROADMAP.md` section "B5" (lines 447 to 489). Depends on phase B4 (the Uno slice).
Labels: VERIFIED (I read it in code or a file in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.

## 0. Read this first

| Point | Detail |
|---|---|
| Goal | The other 11 boards, schematic and board views, revision history, `.ino` in and out, author checks, phone layout, accessibility pass. The last two are cuttable. |
| Scope | F-104, F-081 (schematic and board views), F-093, F-084 (one starter per board); R-051, R-059 to R-061, R-066, R-067, R-070 (rest), R-071, R-072, R-074 (rest). Slices ST-6 and ST-8 of `03_PRODUCT/STUDIO_EDITOR.md` section 16. |
| Not in B5 | Analog behaviour (B8). Lessons as templates (B12). Rooms (B7). Yosys Inspect mode (B9, T-B9-09). Canvas renderer. Mat view. F-085 kit sandbox (superseded). Wire drawing in the schematic. |
| State of the repo today | `src/studio`, `src/parts`, `src/project`, `src/core`, `src/export` and `src/local` do not exist (VERIFIED, `ls src`). Phases B2 to B4 build them. Every path below marked "PLANNED Tn" is a file a task of an earlier phase creates, taken from `IMPLEMENTATION_ROADMAP.md`. The task files of B2 to B4 do not exist yet (VERIFIED, `05_ENGINEERING/tasks/` was empty), so the first step of each task is to read the PLANNED files as they were actually built and to follow their real names. If a real name differs, the real name wins and the task says so in its commit message. |
| Branch and commits | Local branch `build/v1`. One commit per task, authored as Amar Kushwaha, message `B5 T-B5-<nn>: <what>`, no `Co-Authored-By` line, no "Generated with" line. Never push. Never deploy. |
| Off limits | Production services, `.env.local` values, ports 3000 and 43117. Verification runs keyless. |
| Next.js | 16.4.3 (VERIFIED, `package.json`). B5 adds no route, no route handler and no config key. The only Next rule it touches is CSS in a client component, so T-B5-13 reads `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` (VERIFIED, file exists) before it adds `studio.css`. |
| Rules the 5-file count follows | `IMPLEMENTATION_ROADMAP.md` section 2.2: test files count 0; the six language copies of one namespace count 1; a set of data files of one kind counts 1. |

### 0.1 Proof command shorthand (same as roadmap section 2.3)

| Name | Expands to |
|---|---|
| `TL` | `npm run typecheck && npm run lint` |
| `V <path>` | `npx vitest run <path>` |
| `KL` | `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL=` (after T-B0-03 the e2e config blanks these itself; after T-B0-12 dead names are dropped) |
| `E <spec>` | `KL NEXT_DIST_DIR=.next-build npx playwright test <spec>` (random port from `playwright.config.ts:5`; it builds unless `E2E_SKIP_BUILD=1`) |
| `PORT` | `npx tsc -p tsconfig.portable.json` (PLANNED T-B2-01) |
| `SCHEMA` | `npm run schema:check` (PLANNED T-B2-04) |

### 0.2 What I verified in the code in this step

| Fact | Evidence |
|---|---|
| All 12 board profiles already exist as data in one file, with `BoardId`, `BoardProfile`, `PROFILES`, `getProfile`, `resolvePin`, `hasPwm` | `src/lib/interp/profiles.ts:6` (`BoardId`), `:47` (`BoardProfile`), `:102` (`uno`), `:112` (`nano`), `:118` (`unoR4`), `:244` (`PROFILES`), `:255` (`getProfile`) |
| Each board profile carries digital pins, analog pins, PWM pins, interrupt pins, aliases, LEDs, buttons, I2C pins, notes; FPGA boards carry `fpga.ports` | `src/lib/interp/profiles.ts:47-98`, `:206-243` |
| Each of the 11 other boards has a content file with a `pinout: PinRow[]` (header, pin, label, functions, caps, volts, net) and a `blink` lesson with its `circuit` key (Basys 3 and DE10-Lite start with `gates` and `switches`, and have `blink` as lesson 2) | `src/content/boards/<id>.ts`, `src/content/schema.ts:435-460` (`BoardContent`), `src/content/boards/nano.ts:12-27`, `pi4-pi5.ts:224-228`, `microbit-v2.ts:172-175`, `basys3.ts:403`, `de10-lite.ts:405` |
| Figure art for all 12 boards exists | `public/figures/boards/{basys3,de10-lite,esp32-devkitc,esp32-s3-devkitc-1,microbit-v2,nano,nodemcu,nucleo-f401re,pi4-pi5,pico,uno-r3,uno-r4}.html` |
| One worked board descriptor exists as a design example, with `visual.breadboard.figure`, `simulation.what_it_models`, `not_modelled`, pin ids `GPIO<n>`, `P3V3`, `P5V`, `legacy_ids` | `04_ARCHITECTURE/schemas/examples/components/esp32-devkitc.component.json` (38 pins, id `core.esp32-devkitc`, version `1.0.0`) |
| Group, checkpoint and view schemas already exist: `View.kind` is `schematic, breadboard, board, mat`; `Group.members` min 2 and group cannot nest; `Checkpoint {revision, kind, label, at, author, stateHash, store}` max 256; `tests[]` holds `TestCase {id, name, runMs, script?, faults?, checks[]}` max 64 | `04_ARCHITECTURE/schemas/project.schema.json` (`$defs.View`, `$defs.Group`, `$defs.Checkpoint`, `$defs.TestCase`) |
| There is no op that writes a checkpoint. Checkpoints live in `history`, which is outside the state hash | `project.schema.json` op list (64 kinds, none named checkpoint); `PROJECT_DATA_MODEL.md` 5.15 and the `stateHash` paragraph (line 709) |
| Ops used here: `view.add`, `view.place {view, placement}`, `view.unplace`, `group.set {view, group}`, `group.remove {view, id}`, `test.set {test}`, `test.remove {id}`, `source.add {source}`, `board.add`, `component.add`, `net.create`, `wire.add` | `project.schema.json` `$defs.Op` (key field is `k`) |
| The check evaluator is pure and exported; the headless runner and the worker client exist | `src/lib/interp/checks.ts:122` (`evaluateCheck`), `:169` (`evaluateChecks`), `src/lib/interp/headless.ts:103` (`runHeadless`), `src/lib/interp/check-client.ts:26` (`startChecks`), `src/lib/interp/check-job.ts` (`CheckJob`, `runChecks`) |
| `check()` compiles a sketch without running it and returns positioned `Diagnostic[]` with `kind` `syntax, compile, runtime, unsupported, limit` | `src/lib/interp/run.ts:100`, `src/lib/interp/errors.ts:7`, `:41-47`; `#if` gives an `unsupported` diagnostic at `src/lib/interp/arduino/parser.ts:101` |
| `#include` names are collected by the parser | `src/lib/interp/arduino/parser.ts:28`, `:87-90` |
| A phone Playwright project exists (Pixel 7, `*.phone.spec.ts`) and axe is a dependency | `playwright.config.ts:23-26` (project `phone`), `package.json` (`@axe-core/playwright` 4.13.0), `e2e/dock.phone.spec.ts`, `e2e/shell.spec.ts:1` |
| Module matrix: `studio` imports `core`, `project`, `parts`, `sim-host` (frames, read only) and nothing else; `export` imports `core`, `project`, `parts`; UI imports everything | `04_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` 5.3 (line 198) |
| Part strings live in `src/i18n/content/<lang>/parts/` | `04_ARCHITECTURE/COMPONENT_SCHEMA.md` lines 106-107 |
| Studio breakpoints and phone rules are DS-69 to DS-80: tabs Canvas, Code, Run, Project; sheets at 85 dvh; 44 px targets; no sideways scroll at 320 px | `03_PRODUCT/UX_DESIGN_SYSTEM.md` 5.7 (line 283) and section 17 (line 976) |
| Nothing in the repo reads or writes `.ino` files today | `grep -rln "\.ino" src` finds five files that only mention a file name (`src/lib/hw/firmata.ts`, `board.ts`, `testing.ts`, `firmata.test.ts`, `src/components/ui/CodeBlock.tsx`); no module reads or writes `.ino` as a format |

### 0.3 Where this file departs from the roadmap table (and why)

| Roadmap row | What changes | Reason |
|---|---|---|
| T-B5-01 to T-B5-04 edit `profiles.ts`, `templates.ts` and `static-tier.ts` per board | Those three shared edits happen once, in new T-B5-15. Board tasks edit only their own data plus two index files | Four serial tasks editing the same three files cannot run in parallel and `static-tier.ts` should read the descriptor, not a second table (one source of truth) |
| T-B5-11 owns `src/components/studio/boards.test.ts` | The consistency test moves to T-B5-15 and runs in every board task. T-B5-11 keeps the Playwright spec | Each board task needs the descriptor-against-profile test to prove itself |
| T-B5-05 to T-B5-08 list models and panels in one row | Model and screen are split: 05, 06, 08 are headless; 16, 18 are screens; 21 mounts them | Keeps each task at 5 files and lets agents work in parallel |
| `.ino` UI not listed | New T-B5-19 (menu, loss dialog, import entry) | R-051 needs a user path, not only a converter |
| No i18n task | New T-B5-22 adds every B5 string in six languages once | Six-language parity (R-068) and no two tasks editing `studio.json` together |
| No docs task | New T-B5-23 writes `docs/BOARDS.md` and updates `docs/STUDIO.md` | The phase card promises `docs/BOARDS.md` |
| `.ino` coverage is UNKNOWN (PDM Q6) | New spike T-B5-20 | BRIEF section 27: research gets a falsifiable question |
| T-B5-14 is "up to 5 components named by the axe report" | Axe on the new views moves into T-B5-21a and T-B5-21b's acceptance, so the exit gate holds even if T-B5-14 is cut | The exit gate runs `studio-a11y`; serious and critical findings on new views are not cuttable (R-070, RC-67) |
| T-B5-12 edits two files | Adds the Playwright job file and the frame helper, still 5 files | R-074 asks for a scheduled Chromium and WebKit job at 1x, 4x, 6x and DPR 1 and 2. CPU throttle is a CDP call (`Emulation.setCPUThrottlingRate`) and exists only on Chromium, so WebKit is measured at 1x and DPR 1 and 2 only (T-B5-12) |
| Roadmap T-B5-04 says "netlist inspect only" for the Verilog boards | B5 ships no Inspect. Inspect (Yosys netlist view) stays in T-B9-09. Amar confirms at the stop (For Amar item 10) | ADR-0315 makes Inspect an optional mode loaded on click; B5 has no Yosys dependency. If Amar wants Inspect in B5, T-B9-09 moves forward |
| T-B5-21 is one task | Split into T-B5-21a (views) and T-B5-21b (history, checks, menu, hooks) | One task wired eight pieces into two files; a failure anywhere blocked the exit gate. Both edit `StudioEntry.tsx` and `commands.ts`, so they sit in successive groups |
| T-B5-13 is one task | Split into T-B5-13 (layout hook, shell, palette, inspector) and T-B5-13b (PinPicker sheet, light LOD preset) | The first version touched more than 5 source files |

## 1. Parallel groups

Tasks in one group touch disjoint files and can be built by separate agents at once. Groups run in order. A task starts only when everything in its "depends on" list is committed.

| Group | Tasks (can run at once) | Why they are disjoint |
|---|---|---|
| G1 | T-B5-15 binding contract; T-B5-22 strings; T-B5-08 history core; T-B5-10 `.ino` core; T-B5-05 schematic model; T-B5-07 align, groups, paste; T-B5-12 perf budgets; T-B5-20 spike | Different directories: `src/parts` and `profiles.ts`; i18n; `src/studio/history`; `src/export`; `src/studio/views` plus `select.ts`; `src/studio/tools/align,groups,clipboard`; `scripts` and perf spec; a report file |
| G2 | T-B5-01 boards nano, uno-r4; T-B5-06 board view; T-B5-09 author checks; T-B5-17 align commands; T-B5-18 history panel; T-B5-19 project menu and `.ino` dialog | Board data and indexes; `views/board.ts`, `PinMap.tsx`, `keyboard.ts`; `checks.ts`, `ChecksEditor.tsx`, `interp/checks.ts`; `keymap.ts`, `commands.ts`, `Inspector.tsx`; `HistoryPanel.tsx`, `repositoryLink`; `ProjectMenu.tsx`, `LossReport.tsx`, `Home.tsx` |
| G3 | T-B5-02 boards esp32 family and nodemcu; T-B5-16 view registry and switcher | Board data and indexes; `views/registry.ts`, `ViewTabs.tsx`, `draw-list.ts`, `types.ts`, `ui.ts` |
| G4 | T-B5-03 boards pico, micro:bit, nucleo; T-B5-21a views in the shell | Board data and indexes; `StudioEntry.tsx`, `commands.ts`, `e2e/studio-a11y.spec.ts` |
| G5 | T-B5-04 boards pi, basys3, de10-lite; T-B5-21b history, checks, menu in the shell | Board data and indexes; `StudioEntry.tsx`, `commands.ts`, `e2e/studio-a11y.spec.ts` (21b runs after 21a, which is in G4) |
| G6 | T-B5-11 boards spec; T-B5-13 phone layout (cuttable) | Spec file `e2e/studio-boards.spec.ts`; `layout.ts`, `StudioEntry.tsx`, `Palette.tsx`, `Inspector.tsx`, `studio.css` |
| G7 | T-B5-13b phone sheets and light LOD (cuttable); T-B5-14 accessibility pass (cuttable) | `PinPicker.tsx`, `src/studio/engine/constants.ts`, `Sheet.tsx` if needed, `e2e/studio-sheets.phone.spec.ts`; up to 5 other studio components that 13b does not own |
| G8 | T-B5-23 documentation | `docs/BOARDS.md`, `docs/STUDIO.md`, `docs/device-results.md`; runs last so each section is written from what was built |

Cut order if Amar cuts: T-B5-14 first, then T-B5-13b, then T-B5-13. Only T-B5-23 and T-B5-14 depend on them, and only "if kept". The exit gate still holds when all three are cut (see section 4). The review asked for T-B5-23 in G7. It is G8 here because T-B5-14 needs T-B5-13, which needs the final shell (T-B5-21b), so G7 cannot also hold the docs.

Board tasks run one per group because they share the two index files `src/parts/browser/load.ts` (PLANNED T-B2-11) and `src/studio/starters/index.ts` (created by T-B5-15). The roadmap order of boards is kept (R-072's own order is a PROPOSAL and Amar may reorder; reordering changes only which group a board falls in).

## 2. File ownership

A file has one owner per group. "New" files are created by the owner; later tasks that edit it are listed in the last column and always sit in a later group.

| File | Owner | Later editors |
|---|---|---|
| `src/lib/interp/profiles.ts` | T-B5-15 | none |
| `src/parts/boards.ts` (new); `src/components/studio/boards.test.ts` (new test) | T-B5-15 | none |
| `src/parts/testing/board-gen.ts` (new) | T-B5-15 | none |
| `src/studio/fidelity/static-tier.ts` | T-B5-15 | none |
| `src/studio/starters/index.ts` (new) | T-B5-15 | T-B5-01, 02, 03, 04 |
| `src/parts/browser/load.ts` | T-B5-01 | T-B5-02, 03, 04 |
| `src/parts/data/<board>.component.json` (11 files, one set per task) | T-B5-01 (nano, uno-r4), T-B5-02, T-B5-03, T-B5-04 | none |
| `src/studio/starters/<board>.project.json` (11 files, one set per task) | same task as the board | none |
| `src/i18n/content/<lang>/parts/<board>.json` (six languages, one set per task) | same task as the board | none |
| `src/i18n/messages/<lang>/studio.json` (six languages) | T-B5-22 | T-B5-13, T-B5-13b, T-B5-14 (only if a key is missing; they run in G6 and G7 when no other task edits it) |
| `src/studio/history/revisions.ts`, `compare.ts`, `restore.ts` (new) | T-B5-08 | none |
| `src/project/session.ts` | T-B5-08 (`recordCheckpoint` if T-B2-10 did not give one; `recordExport`) | none |
| `src/components/studio/HistoryPanel.tsx` (new) | T-B5-18 | T-B5-14 |
| repository link module (PLANNED, `repositoryLink.ts`, see SYSTEM 5.2 note) | T-B5-18 | none |
| `src/export/ino.ts`, `src/export/loss.ts` (new) | T-B5-10 | none |
| `src/components/studio/ProjectMenu.tsx`, `LossReport.tsx`, `inoAnalyser.ts` (new) | T-B5-19 | T-B5-14 (`ProjectMenu.tsx`, `LossReport.tsx`) |
| `src/components/studio/Home.tsx` | T-B5-19 | none |
| `src/studio/views/symbols.ts`, `schematic.ts` (new) | T-B5-05 | none |
| `src/studio/tools/schematic-place.ts` (new) | T-B5-05 | none |
| `src/studio/tools/select.ts` | T-B5-05 | none |
| `src/studio/views/board.ts` (new) | T-B5-06 | none |
| `src/components/studio/PinMap.tsx` (new) | T-B5-06 | T-B5-14 |
| `src/studio/tools/keyboard.ts` | T-B5-06 | none |
| `src/studio/tools/align.ts`, `groups.ts` (new), `clipboard.ts` | T-B5-07 | none |
| `src/studio/commands/keymap.ts`, `src/studio/commands.ts`, `src/components/studio/Inspector.tsx`, `03_PRODUCT/STUDIO_EDITOR.md` section 6.11 rows | T-B5-17 | T-B5-21a (`keymap.ts`, `commands.ts`), T-B5-21b (`commands.ts`), T-B5-13 (`Inspector.tsx`) |
| `src/studio/checks.ts` (new), `src/components/studio/checkJob.ts` (new), `src/components/studio/ChecksEditor.tsx` (new), `src/lib/interp/checks.ts` | T-B5-09 | T-B5-14 (`ChecksEditor.tsx`) |
| `src/studio/views/registry.ts` (new), `src/components/studio/ViewTabs.tsx` (new), `src/studio/engine/draw-list.ts`, `src/studio/engine/types.ts`, `src/studio/stores/ui.ts` | T-B5-16 | T-B5-14 (`ViewTabs.tsx`) |
| `src/components/studio/StudioEntry.tsx` | T-B5-21a | T-B5-21b, T-B5-13 |
| `e2e/studio-a11y.spec.ts` | T-B5-21a (axe on the three views) | T-B5-21b (axe on panels and dialogs), T-B5-14 |
| `src/studio/layout.ts` (new), `src/components/studio/Palette.tsx`, `studio.css` (new) | T-B5-13 | T-B5-14 (`studio.css` only if a contrast fix needs it) |
| `e2e/studio.phone.spec.ts` (new) | T-B5-13 | none |
| `src/components/studio/PinPicker.tsx` (B4), `src/studio/engine/constants.ts` (B4), `src/studio/engine/lod.ts` (B4), `StudioEntry.tsx` (one call site), `src/components/ui/Sheet.tsx` (only if it lacks a behaviour DS-70 needs) | T-B5-13b | none |
| `e2e/studio-sheets.phone.spec.ts` (new) | T-B5-13b | none |
| `scripts/perf-budget.mjs`, `budgets.json`, `e2e/studio-perf.spec.ts`, `e2e/support/frames.ts`, `.github/workflows/perf-editor.yml` (new; the `.github/` directory is created by T-B0-06) | T-B5-12 | none |
| `e2e/studio-boards.spec.ts` (new) | T-B5-11 | none |
| `docs/BOARDS.md` (new), `docs/STUDIO.md`, `docs/device-results.md` | T-B5-23 (G8, the only task that edits them; T-B5-13, 13b and 14 hand it their facts in their commit messages) | none |
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-B5-ino-coverage/` (new) | T-B5-20 | none |

## 3. Contracts every task shares

These are decisions this file makes so that agents do not have to ask. Each one is reversible and marked PROPOSAL where it is a choice and not a fact.

### 3.1 Board identity: one board, one descriptor, one profile

| Item | Rule |
|---|---|
| Registry id | `core.<board-id>` with version `1.0.0`, as the worked example: `core.esp32-devkitc`. Board ids are the 12 `BoardId` values. The Uno R3 descriptor is built in B2 (T-B2-12); B5 does not change it except for the binding field below |
| Binding | `BoardProfile` gets one new required field `partId: string` (`'core.nano'`). The descriptor carries `identity.legacy_ids: ['<BoardId>']`. The pair is checked by `src/components/studio/boards.test.ts` in both directions (that test imports `@/lib/interp/profiles` and `@/parts/*`; UI-layer files may import everything, so it lives there, not in portable `src/parts`). No second table maps one to the other |
| Pin ids | The silkscreen label made into a `LocalId`. Uno R3, Nano: `D0` to `D13`, `A0` to `A7`, `P5V`, `P3V3`, `GND`. ESP32 family: `GPIO<n>`. NodeMCU: `D0` to `D8`, `A0`. Pico: `GP<n>`. micro:bit: `P<n>`. Nucleo: `D<n>`, `A<n>`. Pi: `GPIO<n>`. A duplicate label (GND appears many times) becomes `<connector>_<position>`, for example `J3_1`, as in the worked example. FPGA boards: one pin per port bit, id `<port>_<bit>` (`sw_0`, `led_15`) |
| Pin number resolution (used by the test, not by the app) | A descriptor pin resolves to a profile pin number by `resolvePin(profile, designator ?? id)` (`profiles.ts:282`) or by the regex `/^(?:D\|GP\|GPIO\|P\|IO)?(\d+)$/`, the same one `src/lib/interp/checks.ts` uses for check pins |
| Art | `visual.breadboard.figure = {kind: "board", id, path: "public/figures/boards/<id>.html", engine: "colorfigures-bench"}` and a `visual.fallback` block (CI fails a descriptor without it, `component.schema.json` `visual.fallback`) |
| "What it models" | In the descriptor: `simulation.tier`, `status`, `what_it_models[]`, `not_modelled[]`, `known_gaps[]` (R-065, R-072). `static-tier.ts` reads the descriptor. It holds no per-board table |
| Text | Each text has `i18n_key` `parts.<board-id>.<field>` and an English `en`. The six-language strings sit in `src/i18n/content/<lang>/parts/<board-id>.json` |
| Language | `software.environments[].language` is `arduino-cpp`, `micropython`, `python` or `verilog` and equals the profile's `languages` after the mapping `arduino` to `arduino-cpp`, `python` to `micropython` or `python` (Pico, micro:bit use MicroPython; Pi uses Python) |

### 3.2 Starters

| Item | Rule |
|---|---|
| What a starter is | A schema-valid project document, `meta.kind: "template"`, one board, the parts and wires of the board's `blink` lesson circuit, one source (`main.ino`, `main.py` or `main.v`), `provenance.origin` kind `template`, `license` `LicenseRef-iynk-pending`. Basys 3 and DE10-Lite use their lesson 2 `blink`, with the same ports mapping the lesson uses |
| Where the source of truth is | The lesson content (`src/content/boards/<id>.ts`, the lesson with id `blink`). The starter file is a derived copy |
| How it is made | The B2 converter (PLANNED T-B2-14, `src/project/convert/boards.ts`) turns the lesson into a project. The task writes the output with `meta.kind` set to `template`. The generating step is a Vitest test in update mode: `UPDATE_STARTERS=1 npx vitest run src/studio/starters.test.ts` writes missing files. A plain run only checks them. This avoids running TypeScript content under Node, which fails because the content files import without extensions (VERIFIED: `node -e "import('./src/content/boards/nano.ts')"` stops on the extensionless import path) |
| Drift guard | `src/studio/starters.test.ts` compares each starter's source with the lesson's default-rendered source (`renderTemplate` with default params, English text) and the starter's netlist with the converter's netlist for that lesson. A lesson change that is not copied fails the test |
| If the converter cannot express a board's `blink` | The task writes the starter by hand from the lesson and says so in the commit. The drift guard then compares source text only |
| Run proof | `src/studio/starters.test.ts` runs every registered starter headless through `runHeadless` with the lesson's checks, and the checks pass (the lesson's own `blink` checks: `runs`, `pin-toggles`, `code`) |

### 3.3 Views

| Item | Rule |
|---|---|
| Kinds in B5 | `breadboard` (B4), `schematic`, `board`. `mat` stays out; its tab is absent |
| Surfaces | `breadboard` and `schematic` draw on the canvas through the renderer. `board` is a DOM view (`PinMap`), keyboard operable by construction |
| One netlist | No view stores connectivity. Every view reads `netlist(state)` (PLANNED T-B2-13). A test builds nets from the schematic scene and from the breadboard overlay and compares the sets (R-060) |
| Stored vs computed | Schematic and board views store placements only (`view.place`), plus `groups[]` and `labels[]`. Schematic wires are computed from nets on every build and are never written in B5. Auto positions are computed, not stored, until the first manual edit in that view, which writes all current auto positions in the same batch ("freeze on first edit", STUDIO 6.4) |
| Creating a view | A blank project already has `vw_bb` and `vw_sch` (STUDIO 4.2). A project without a schematic view (a converted or imported one) gets `view.add {view: {id, kind: "schematic", name, placements: [], wires: []}}` the first time the tab opens. The `board` view is created the same way on first open |

### 3.4 History

| Item | Rule |
|---|---|
| Checkpoint cadence | 500 ops or 10 minutes of activity, whichever comes first (`PROJECT_DATA_MODEL.md` 5.15; RC-12). Named checkpoints on request, on save to file (`onSaveToFile`) and when a run starts (`onRunStart`), both hooks in T-B5-18 and called by T-B5-21b (R-066). At most 256 in the header |
| Snapshot bytes | Not in the document. Local store `revisions`, key `projectId:revision` (SYSTEM 8.1 row 6, PLANNED T-B3-02). `Checkpoint.store` is `"local-db"` |
| Port | `src/studio/history/revisions.ts` defines `RevisionPort {put, get, list, remove}`. `studio` cannot import `local`, so the UI wiring module adapts the repository to the port (SYSTEM 5.2: wiring lives in UI) |
| Writer | There is no checkpoint op. T-B5-08 gives `ProjectSession` `recordCheckpoint(c: Omit<Checkpoint, 'stateHash'>): Checkpoint`, if T-B2-10 did not, and `recordExport` (below). It changes `history.checkpoints` only, never `revision`, never the state hash, and emits a session event. UNKNOWN whether T-B2-10 already has it; the task reads `src/project/session.ts` first. The export record has the same gap: `exports[]` (max 32) has no op and sits outside the state hash, so T-B5-08 also gives `ProjectSession` `recordExport(r: ExportRecord): void` |
| Restore | Restore is a batch of ops with `author.kind "user"` that moves the document to the snapshot's content. It never rewinds history. Large diffs are split into batches of at most 64 KiB (STUDIO 4.2) |
| Rooms | Local only in B5. A room needs the host's OK (B7) |

### 3.5 Checks on your own project

| Item | Rule |
|---|---|
| Where they live | `tests[]` of the document, as `TestCase`. The PRD says "`checks` section" (R-067) but the schema field is `tests` (`PROJECT_DATA_MODEL.md` 5.12); the schema wins (precedence rule R4) |
| Kinds offered | `runs, serial, pin-level, pin-toggles, pwm, tone, servo, responds, code`. Not offered: `state` (legacy figure state), `node-voltage` and `supply-current` (analog, B8) |
| Evaluation | The existing evaluator, widened to accept project checks. The two analog kinds return `{ok: false, detail: 'needs-analog'}` and are never offered |
| Hidden | `visibility: "hidden"` is a display convention only. The editor never calls it secret (STUDIO 4.3 item 4) |
| Default test case | `tst_my-checks`-style local id `my-checks`, name "My checks", `runMs` 5000, created on the first check |

### 3.6 Strings

`studio` namespace keys added by B5 are listed once, in T-B5-22. Prefixes: `views.*`, `board.*` (pin map), `history.*`, `checks.*`, `ino.*`, `align.*`, `projectMenu.*`, `rail.*`, `dialog.*`, `phone.*`, `a11y.*`. A task that needs a key not in the list adds it in a follow-up commit to T-B5-22's files only when no other task edits those files in its group; otherwise it stops and reports.

## 4. Phase exit gate

| Gate | Command or action | Owner |
|---|---|---|
| Whole check | `npm run check` | agent |
| Boards spec | `E e2e/studio-boards.spec.ts` | agent |
| Accessibility spec | `E e2e/studio-a11y.spec.ts` (B4's keyboard gate plus axe on every B5 view, added by T-B5-21a and T-B5-21b; T-B5-14 widens it) | agent |
| Phone spec (only if T-B5-13 kept) | `E e2e/studio.phone.spec.ts`, and `E e2e/studio-sheets.phone.spec.ts` if T-B5-13b is kept | agent |
| Performance | `node scripts/perf-budget.mjs --check` passes and prints BUD-04, BUD-08, BUD-09; `E e2e/studio-perf.spec.ts` passes. The scheduled workflow file is not run (no push in B5) | agent |
| Descriptor consistency | `V src/parts src/components/studio` (12 boards bound both ways) | agent |
| Open a project on each of the 12 boards | Section 6 item 1 | For Amar |
| Then Amar's OK. The orchestrator tags `phase-B5` | | orchestrator |

## 5. Task packages

Every package has four blocks: Identity, Intent, Implementation, Verification, Delivery. "Status" is "not started" for all. Priority: P1 = needed for the exit gate, P2 = needed for the phase promise, P3 = LATER class, cuttable.

---

### T-B5-15. Board binding contract, descriptor builder, consistency test

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-15, PARTS and STUDIO, B5 |
| | Priority, status | P1, not started |
| | Dependencies | B4 committed; T-B2-11 (registry, descriptor validation), T-B2-12 (Uno descriptor), T-B4-15 (`static-tier.ts`), T-B4-16 (`templates.ts`) |
| Intent | Problem | Eleven boards must each be added the same way and checked against the profile the interpreters use. Today the profile (`profiles.ts`) and a future descriptor would be two copies of board facts. Without a test they drift (roadmap risk R1) |
| | Target user | An agent adding a board; Amar adding a twelfth board later |
| | User story | As a builder I add a descriptor and a starter and a test tells me at once if a pin, alias or LED disagrees with the interpreter |
| | Expected behaviour | `BoardProfile.partId` exists for all 12 profiles. `boardPartId(id)` and `boardIdForPart(partId)` resolve both ways. `buildBoardDescriptor(content, profile)` returns a schema-valid descriptor draft. `boards.test.ts` checks every board that has a descriptor and lists the boards that do not yet (T-B5-01 to 04 remove them from the list) |
| | Success metric | `V src/parts src/components/studio` green; the "not yet bound" list shrinks to zero by T-B5-04 |
| Implementation | Existing files | `src/lib/interp/profiles.ts:47` (`BoardProfile`), `:244` (`PROFILES`); `src/content/schema.ts:435` (`BoardContent`, `pinout`); `src/content/boards/<id>.ts`. PLANNED: `src/parts/descriptor.ts`, `registry.ts` (T-B2-11), `src/studio/fidelity/static-tier.ts` (T-B4-15), `src/studio/templates.ts` (T-B4-16) |
| | New files | `src/parts/boards.ts`; `src/parts/testing/board-gen.ts`; `src/studio/starters/index.ts`; tests `src/components/studio/boards.test.ts` (UI layer: it imports both `@/lib/interp/profiles` and `@/parts/boards`, which portable `src/parts` and `studio` may not do, SYSTEM 5.3), `src/parts/board-gen.test.ts` (imports `src/parts` and JSON fixtures only) |
| | Edited files (5 in all) | `src/lib/interp/profiles.ts`, `src/studio/fidelity/static-tier.ts`, plus the three new source files |
| | Signatures | `// src/parts/boards.ts` `export const BOARD_PART_IDS: Readonly<Record<BoardIdString, string>>;` `export function boardPartId(board: string): string \| undefined;` `export function boardIdForPart(partId: string): string \| undefined;` where `BoardIdString` is a string union copied as plain strings (parts cannot import `lib/interp`). The record has 12 entries and is checked against `PROFILES` by the test. `// src/parts/testing/board-gen.ts` `export interface PinFacts { id: string; designator: string; type: PinType; klass: PinClass; connector: string; note?: string }` `export function pinsFromPinout(rows: readonly PinRowLike[]): PinFacts[];` `export function buildBoardDescriptor(input: { id: string; maker: string; model: string; mcu: string; languages: string[]; pinout: readonly PinRowLike[]; clockHz: number; logicV: number; notes: readonly string[] }): ComponentDescriptorDraft;` (types from `src/parts/descriptor.ts`). `// src/studio/starters/index.ts` `export interface StarterEntry { board: string; load: () => Promise<unknown> }` `export const STARTERS: readonly StarterEntry[];` `export function starterFor(board: string): StarterEntry \| undefined;` |
| | Data model | Descriptor fields from `component.schema.json`: `schema`, `id`, `version`, `identity {manufacturer, model, kind: "board", category: "dev-board" or "fpga", refdes_prefix: "U", generic: false, legacy_ids}`, `sources[]`, `pins[]` (`id, designator, type, class, connector, logic_family, note`), `connectors[]`, `groups[]` (`internal-short` for ground pins, as the worked example), `simulation {tier, status, what_it_models, not_modelled, known_gaps}`, `software.environments`, `visual {breadboard.figure, schematic {symbol: "ic-box", pin_sides}, fallback}`, `provenance`. `PinRow.caps` maps: `gnd` to `ground`; `power` to `power_io`; `digital` and `analog-in` to `digital_io`; `analog-in` with `input-only` to `analog_in`; `reset` to `digital_in`; empty caps to `analog_in` (AREF). `volts` 3.3 gives `lvcmos-3v3`, 5 gives `cmos-5v` |
| | Input and output | Input: `BoardContent.pinout` rows and the profile. Output: a draft object the board task completes (art, sources, text) and writes. The builder invents nothing it cannot read: sources come from `BoardContent.sources[]` |
| | Algorithms | Pin id: sanitise `PinRow.net` or `label` to `LocalId` (`^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$`); on a clash use `<connector>_<position>`. Ground pins of one board join one `internal-short` group. Power pins: a power pin whose cleaned id starts with a digit gets the prefix `P` (`3V3` becomes `P3V3`, `5V` becomes `P5V`), as in the worked example and 3.1; `LocalId` allows a leading digit, so without this rule the id would be `3V3` and nothing would fail. Stable output: pins sorted by connector then position, so two runs give identical bytes |
| | State transitions | None |
| | Validation rules | Builder output passes `validateDescriptor` (PLANNED T-B2-11). `partId` unique across profiles. A profile `partId` with no descriptor is allowed only while the board is in the "not yet bound" list. Placement of the consistency test is decided: `src/components/studio/boards.test.ts` (no UNKNOWN) |
| | Error conditions | Duplicate pin id after the clash rule throws `BoardGenError('duplicate-pin', id)`. A `PinRow` with no `net` and no `label` throws `BoardGenError('unnamed-pin', header+pin)` |
| | Edge cases | Boards with variants (Pico W, Uno R4 WiFi, ESP32-S3 v1.0): one descriptor, the variant is a board `variant` string and a `parameters` entry, not a second descriptor. FPGA boards have no `pinout` rows of the same kind: the builder takes `profile.fpga.ports` instead and makes one pin per bit |
| | Permissions | None. Pure, portable code (`PORT` must pass) |
| | Performance | Builder under 50 ms per board (ESTIMATED) |
| | Migration | `static-tier.ts` read path: if T-B4-15 built a per-board table, replace it with reads of `simulation.*` from the registry; the Uno's text moves into its descriptor (that descriptor file is B2's; the task edits it only if the Uno has no `simulation` block, and counts it as the sixth file only then; if so, split into a second commit task T-B5-15b) |
| Verification | Unit tests | `src/components/studio/boards.test.ts`: (1) every profile has `partId`, unique; (2) for every board with a descriptor: `identity.legacy_ids` contains the board id; descriptor language equals profile `languages`; every profile `digitalPins` number is reached by a descriptor pin; every descriptor `digital_*` pin resolves into `digitalPins` or `analogPins`, except pins typed power, ground, `nc` or named `EN`/`RST`; every profile alias resolves to a descriptor pin; `leds[].pin` and `buttons[].pin` exist as pins; `i2c.sda` and `scl` exist; `analogOnlyPins` and `inputOnlyPins` descriptors carry an "input only" note; FPGA ports match `fpga.ports` by name and width. (3) the "not yet bound" list equals the boards with no descriptor. `src/parts/board-gen.test.ts`: builder output validates for nano, esp32-devkitc and basys3 fixtures; ground group rule; clash rule; stable bytes |
| | Integration tests | `static-tier.ts` returns the descriptor's `what_it_models` for the Uno (read-through test in `src/studio/fidelity`) |
| | Playwright | None |
| | Fixtures | The worked example `04_ARCHITECTURE/schemas/examples/components/esp32-devkitc.component.json` is read by the test as a golden shape; the builder run on the ESP32-DevKitC content is compared to it by pin count (38), by group count, and by the sorted list of pin ids (`GPIO<n>`, `P3V3`, `P5V`, `GND`, `<connector>_<position>` clashes), so an id-rule mismatch fails. Where the two differ, the builder rule changes, not the worked example |
| | Acceptance (Given/When/Then) | Given the 12 profiles, When `boards.test.ts` runs, Then all pass and the unbound list has 11 names. Given a profile whose alias points to a missing descriptor pin, When the test runs, Then it fails and names the board and the alias |
| | Observability | Test failure text names board, field, value. No runtime logging |
| | Release blockers | A profile field left out of the consistency test; `static-tier.ts` still holding a per-board table |
| Delivery | Definition of done | The four proof commands pass; `partId` on all 12 profiles; no per-board table in `static-tier.ts` |
| | Verify commands | `TL`; `V src/parts src/components/studio src/studio/fidelity src/lib/interp`; `PORT`; `SCHEMA` |
| | Docs | One paragraph in `docs/STUDIO.md` (T-B5-23 writes it) |
| | Rollback | Revert the commit. `partId` is additive |
| | Later tasks need | `boardPartId`, `buildBoardDescriptor`, `STARTERS`, the "not yet bound" list, and the rule that descriptors hold the "what it models" text |

---

### T-B5-22. Studio strings for every B5 screen (six languages)

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-22, I18N, B5 |
| | Priority, status | P1, not started |
| | Dependencies | T-B4-01 (`studio` namespace), T-B4-21 (parity test) |
| Intent | Problem | Nine tasks add screens. If each edits `studio.json` in six languages, they collide and the parity test (K-I18N, R-068) breaks half-way |
| | Target user | Amar and friends who use `de`, `es`, `fr`, `hi`, `zh` |
| | User story | As a user I see every new button and message in my language |
| | Expected behaviour | All keys in the table below exist in `en` and in the five other languages with the same placeholders. Part strings of boards are not here (they live in `parts/`) |
| | Success metric | `V src/i18n` green, 0 missing keys |
| Implementation | Existing files | `src/i18n/messages/en/*.json` pattern (VERIFIED: `ai, boardlab, common, dronelab, flight, hw, robotics, search, shell`); `src/i18n/messages.test.ts` (parity and placeholder test, VERIFIED lines 1-30); `src/i18n/namespaces.ts:4` (`NAMESPACES`). PLANNED: `src/i18n/messages/<lang>/studio.json` (T-B4-01) |
| | New files | None |
| | Edited files | `src/i18n/messages/{en,de,es,fr,hi,zh}/studio.json` (one set) |
| | Signatures | Keys are nested under the prefixes of 3.6. Placeholders use `{name}` |
| | Key list (English) | `views.tab.breadboard` "Breadboard"; `views.tab.schematic` "Schematic"; `views.tab.board` "Board"; `views.tablist` "Views"; `views.auto` "auto"; `views.arrange` "Arrange"; `views.schematicReadOnlyWire` "Wire in the breadboard view. The schematic shows the same connections."; `board.pin` "Pin"; `board.role` "Role"; `board.net` "Net"; `board.connectedTo` "Connected to"; `board.state` "State now"; `board.noneConnected` "Nothing connected"; `board.wireThis` "Wire this pin to..."; `board.ports` "Ports"; `board.notRunning` "Not running"; `history.title` "History"; `history.nameThis` "Name this version"; `history.named` "Named"; `history.auto` "Automatic"; `history.compare` "Compare"; `history.restore` "Restore this version"; `history.restoreHelp` "Restoring adds changes on top of your work. You can undo it."; `history.empty` "No versions yet."; `history.limit` "The list keeps the newest {max} versions."; `history.mismatch` "This version failed its check and was not opened."; `history.diff.added` "Added: {items}"; `history.diff.removed` "Removed: {items}"; `history.diff.changed` "Changed: {items}"; `history.diff.nets` "Connections that differ: {count}"; `history.diff.files` "Files that differ: {count}"; `checks.title` "Checks"; `checks.add` "Add a check"; `checks.run` "Run checks"; `checks.pass` "Passed"; `checks.fail` "Failed"; `checks.notRun` "Not run"; `checks.kind.runs` "Runs without error"; `checks.kind.serial` "Serial output contains"; `checks.kind.pin-level` "Pin level at a time"; `checks.kind.pin-toggles` "Pin toggles"; `checks.kind.pwm` "PWM duty at a time"; `checks.kind.tone` "Tone frequency at a time"; `checks.kind.servo` "Servo angle at a time"; `checks.kind.responds` "Pin responds to an input"; `checks.kind.code` "Code contains"; `checks.hiddenNote` "Hidden only hides the value on screen. Anyone with the file can read it."; `checks.badPin` "This board has no pin called {pin}."; `checks.needsRun` "Run to see results."; `ino.import` "Import a sketch"; `ino.export` "Export as .ino"; `ino.wiringCsv` "Wiring table (CSV)"; `ino.lossTitle` "What changes"; `ino.lossNone` "Nothing is lost."; `ino.lossBoard` "Board chosen: {board}. Change it if this is wrong."; `ino.unsupported` "Line {line}: {message}"; `ino.banner` "Exported from a simulation. It may not compile as exported."; `ino.tooBig` "This file is larger than {max} characters."; `ino.notText` "This file is not text."; `ino.confirm` "Create project"; `align.left` "Align left"; `align.right`, `align.top`, `align.bottom`, `align.centerH`, `align.centerV`; `align.distributeH` "Distribute horizontally"; `align.distributeV`; `align.needThree` "Pick three or more parts to distribute."; `align.group` "Group"; `align.ungroup` "Ungroup"; `align.groupNeedTwo` "Pick two or more things to group."; `align.groupNesting` "A group cannot hold another group."; `projectMenu.label` "Project"; `projectMenu.history` "History..."; `projectMenu.saveFile` "Save to file"; `phone.tab.canvas` "Canvas"; `phone.tab.code` "Code"; `phone.tab.run` "Run"; `phone.tab.project` "Project"; `phone.tabs` "Studio sections"; `phone.sheetClose` "Close"; `a11y.viewAnnounce` "{view} view"; `a11y.groupMade` "Grouped {count} items."; `a11y.restored` "Restored version {label}."; `a11y.pinLevel` "{pin} is {level} ({mode})" (the text equivalent of the live HIGH/LOW dot); `board.high` "HIGH"; `board.low` "LOW"; `board.liveDot` "{pin}: {level}"; `views.sceneError` "This view could not be drawn. The other views still work."; `views.cmd.breadboard` "Breadboard view"; `views.cmd.schematic` "Schematic view"; `views.cmd.board` "Board view"; `rail.history` "History"; `rail.checks` "Checks"; `projectMenu.historyTab` "History"; `checks.noSource` "This project has no firmware for the board."; `checks.unsupportedLanguage` "For this board's language only the Runs, Serial and Code checks work."; `checks.limit` "The run stopped at the 20 second limit."; `history.storeFailed` "The version could not be saved: {reason}"; `history.nameLabel` "Version name (1 to 80 characters)"; `history.labelRequired` "Enter a name."; `history.labelTooLong` "Use at most {max} characters."; `history.runLabel` "Run"; `history.fileLabel` "Saved file"; `dialog.cancel` "Cancel" (the `common` namespace has no cancel key, VERIFIED by grep of `src/i18n/messages/en/common.json`, so it is added here); `ino.firstOnly` "Only the first problem is shown. Fix it and import again."; `ino.noEntry` "No .ino file was found."; `ino.empty` "This file is empty."; `ino.badPath` "The file name {name} is not allowed."; `ino.tooMany` "At most {max} files."; `ino.cancel` "Cancel"; `ino.exportBlocked` "This project has no Arduino sketch to export." |
| | Data model | JSON leaves are strings. No HTML in strings |
| | Algorithms | Translate with the same method the repo used for earlier namespaces; keep technical words (pin, net, GPIO, PWM) in Latin script where the repo's earlier namespaces do |
| | Validation rules | Placeholder sets equal across languages (`messages.test.ts`) |
| | Error conditions | A missing key in any language fails the parity test |
| | Edge cases | Hindi and Chinese plural-free phrasing; no key concatenates two strings |
| | Permissions, performance | None. The `studio` namespace loads only on the Studio page (ADR-0408), so first-load JS of other pages is unchanged |
| | Migration | None |
| Verification | Unit tests | Existing `src/i18n/messages.test.ts` (parity, placeholders, no empty values) |
| | Integration, Playwright | None here; `e2e/studio-boards.spec.ts` and the phone spec read strings from `en/studio.json` instead of hard-coding English |
| | Fixtures | None |
| | Acceptance | Given the new keys, When the parity test runs, Then 0 missing keys in 6 languages |
| | Observability | Test names the key and language |
| | Release blockers | A banned word ("validated") in copy; an em dash |
| Delivery | Definition of done | Parity green; `grep -n "validated" src/i18n/messages/*/studio.json` returns nothing; every key used by a B5 screen is in the list |
| | Verify commands | `TL`; `V src/i18n`; `grep -rhno "t('[a-z]*\.[a-zA-Z.]*" src/components/studio src/studio` (every key it prints must exist in `en/studio.json`; later tasks run it too, to catch a key used but missing) |
| | Docs | None |
| | Rollback | Revert; screens fall back to missing-key errors only if a screen task is kept without this one, so revert them together |
| | Later tasks need | The exact key names above |

---

### T-B5-08. Revision history core: checkpoints, compare, restore

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-08, STUDIO history (F-093, R-066), B5 |
| | Priority, status | P2, not started |
| | Dependencies | B4 (T-B4-11 undo and autosave wiring); T-B2-09 (`stateHash`), T-B2-10 (`ProjectSession`), T-B2-16 (generators for property tests), T-B3-02 (`revisions` store exists) |
| Intent | Problem | A person who breaks their circuit cannot go back to what worked an hour ago. Undo covers one session only (STUDIO 11.1 clears stacks on close) |
| | Target user | Amar and friends editing over several days |
| | User story | As a builder I name a version, change things, compare the two, and restore the first without losing the second |
| | Expected behaviour | Checkpoints are made on cadence, on request, on save to file, and on Run start. Compare returns a structural diff by id. Restore returns op batches that bring the current document to the snapshot's content and that undo can reverse |
| | Success metric | Property test: for 100 random edit sequences, `stateHash(apply(current, restoreOps(current, snap))) === snap.stateHash`. Compare of 500 parts and 1,000 nets under 50 ms (ESTIMATED target; measured in the test and recorded) |
| Implementation | Existing files | PLANNED: `src/project/session.ts` (T-B2-10), `src/project/hash.ts` (T-B2-09), `src/project/apply/index.ts` (T-B2-05), `src/project/testing/generators.ts` (T-B2-16). Schema: `project.schema.json` `$defs.Checkpoint`, `$defs.History` |
| | New files | `src/studio/history/revisions.ts`, `src/studio/history/compare.ts`, `src/studio/history/restore.ts`; tests beside each |
| | Edited files (4 in all) | The three new files; `src/project/session.ts` (`recordExport` always; `recordCheckpoint` too if T-B2-10 did not give one) |
| | Signatures | `// revisions.ts` `export interface RevisionPort { put(projectId: string, revision: number, snapshot: ProjectState): Promise<void>; get(projectId: string, revision: number): Promise<ProjectState \| undefined>; list(projectId: string): Promise<number[]>; remove(projectId: string, revision: number): Promise<void>; }` `export interface CheckpointPolicy { everyOps: 500; everyMs: 600_000; max: 256 }` `export function shouldCheckpoint(sinceOps: number, sinceMs: number, policy?: CheckpointPolicy): boolean;` `export async function makeCheckpoint(session: ProjectSession, port: RevisionPort, req: { kind: 'auto' \| 'named'; label?: string; author: string; at: string }): Promise<Result<Checkpoint, 'limit' \| 'store' \| 'bad_author'>>;` `export function pruneCheckpoints(cps: readonly Checkpoint[], max?: number): Checkpoint[];` (drops oldest `auto` first, never `named`; if all are named and over max, returns `limit`). `// compare.ts` `export interface RevisionDiff { parts: { added: DiffItem[]; removed: DiffItem[]; changed: DiffItem[] }; nets: { differing: NetDiff[] }; wires: { added: number; removed: number }; files: FileDiff[]; params: ParamDiff[] }` `export interface DiffItem { id: string; refdes?: string; label: string }` `export interface NetDiff { netId: string; name?: string; added: PinRefString[]; removed: PinRefString[] }` `export interface FileDiff { path: string; added: number; removed: number; hunks: Hunk[] }` `export function compareStates(a: ProjectState, b: ProjectState): RevisionDiff;` `// restore.ts` `export function restoreOps(current: ProjectState, target: ProjectState, opts?: { maxBytes?: number }): Op[][];` `export function verifySnapshot(snap: ProjectState, cp: Checkpoint): boolean;` `// src/project/session.ts additions` `recordCheckpoint(c: Omit<Checkpoint, 'stateHash'>): Checkpoint;` (only if absent) `recordExport(r: ExportRecord): void;` (appends to `exports`, at most 32, drops the oldest; changes neither `revision` nor the state hash; emits a session event) |
| | Data model | `Checkpoint {revision, kind, label (max 80), at (Timestamp), author (usr_ id), stateHash (Sha256), store: "local-db"}`. Snapshot is the whole `ProjectState` minus `history` and `exports` |
| | Input and output | In: two `ProjectState` values. Out: `RevisionDiff` or `Op[][]`. Time and author come from the caller, so the module reads no clock (portable rule) |
| | Algorithms | Compare keys everything by id: `components[]`, `boards[]`, `nets[]` (compare `connections` as sets of `c.p` strings), `views[].placements` (reported only as "moved: n"), `sources[]` by path with a line diff (Myers, own 60-line implementation, no new dependency), `parameters`, `tests`. Restore order: removals first in the order `wire.remove`, `net.disconnect`, `net.delete`, `component.remove`, `board.remove`; then adds (`board.add`, `component.add`, `net.create`, `wire.add`); then sets (`board.set`, `component.set`, `view.set`, `view.place`, `source.edit` as a whole-text replace with `baseSeq`); then `test.set`, `test.remove`, `group.set`, `group.remove`. Every emitted `k` must be a member of the Op enum in `project.schema.json` (VERIFIED: it has `net.delete`, `net.disconnect`, `net.connect`, `net.merge`, `net.split`, `net.rename`, and no `net.remove`). Every batch is checked by dry-run `apply` and split when its JSON exceeds `maxBytes` (default 65,536, the op cap) |
| | State transitions | `makeCheckpoint`: idle then writing snapshot then recording header entry. If `put` fails, no header entry is written (never a checkpoint without bytes). If recording fails after `put`, the snapshot is removed |
| | Validation rules | `makeCheckpoint` returns the error `bad_author` unless `req.author` is the id of an entry in `state.actors` (`Checkpoint.author` must be a listed actor, `PROJECT_DATA_MODEL.md` line 246, V3-ACTOR); the UI wiring passes the local actor id. `verifySnapshot` recomputes the hash and refuses a mismatch (STUDIO 4.2 Compare). A checkpoint whose `revision` is ahead of the document is invalid (V3-HIST-CP) |
| | Error conditions | `limit` (256 named), `store` (port rejects), `bad_author` (author not in `actors[]`), `hash_mismatch` (restore refuses), `referenced_by` from a rejected op surfaces as a restore error with the op index (a check names a part that restore removes: restore emits the `test.set` rewrite batch first, the same way delete does, STUDIO 6.4) |
| | Edge cases | Restoring to the current state returns `[]`. A snapshot with a part definition the registry lacks restores with its pinned interface (generic art). Two checkpoints with the same hash are both kept. Restore of a version older than the retained op tail still works because snapshots are whole states |
| | Permissions | Local single user. In a room, restore is blocked until B7 (the panel disables it) |
| | Performance | `compareStates` at 500 parts and 1,000 nets under 50 ms; `makeCheckpoint` runs after the commit, off the interaction path (BUD-08 stays met) |
| | Migration | None. A document with no checkpoints is valid (PDM 5.15) |
| Verification | Unit tests | `revisions.test.ts`: cadence function; prune keeps named; limit error; failed `put` leaves header unchanged. `compare.test.ts`: added, removed, moved part; a net with one pin added; a file with a changed line; parameters; identical states give an empty diff. Known-diff fixtures: three pairs built from `uno-blink-d12.project.json` (VERIFIED to exist in `04_ARCHITECTURE/schemas/examples/`) by applying listed ops. `restore.test.ts`: the 100-sequence property test; batch split under a small `maxBytes`; a check that names a removed part; every emitted `k` over all property-test batches is in the Op enum read from `project.schema.json`. `revisions.test.ts` also: `makeCheckpoint` with an author not in `actors` returns `bad_author` and writes nothing; with a listed actor it succeeds. `src/project/session.test.ts` additions: `recordExport` appends, the 33rd call drops the oldest, `stateHash` and `revision` are unchanged after each call |
| | Integration tests | With `MemoryRepository` (PLANNED T-B3-02): make three checkpoints, restore the first, undo, hash equals the pre-restore hash |
| | Playwright | None here (T-B5-18 and T-B5-11 cover the screen) |
| | Fixtures | `uno-blink-d12.project.json`, `lesson-uno-r3-button.project.json` |
| | Acceptance | Given a project with checkpoint A (blink on D12) and a later state with an added resistor, When I compare, Then the diff lists exactly the resistor, its refdes, the net whose pin list changed, and no file change. Given the same pair, When I restore A, Then the document hash equals A's `stateHash` and one Undo returns to the later state |
| | Observability | `makeCheckpoint` returns the reason on failure; the panel shows it. A hash mismatch also goes to the local error log (PLANNED `events` store) |
| | Release blockers | Any restore path that edits `history` instead of adding ops; a checkpoint written without snapshot bytes |
| Delivery | Definition of done | Property test passes at 100 sequences; session events emitted; `recordExport` leaves the hash unchanged; `PORT` passes |
| | Verify commands | `TL`; `V src/studio/history src/project`; `PORT` |
| | Docs | `docs/STUDIO.md` History section (T-B5-23) |
| | Rollback | Revert; checkpoints already written stay valid and unused |
| | Later tasks need | `RevisionPort`, `makeCheckpoint`, `compareStates`, `restoreOps`, `verifySnapshot` (T-B5-18). B7 reuses `compareStates` for proposal diff cards |

---

### T-B5-10. `.ino` import and export with a loss report

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-10, EXPORT (F-090, F-091 first slice, R-051, ADR-0109), B5 |
| | Priority, status | P2, not started |
| | Dependencies | T-B2-04 (types), T-B2-08 (validation), T-B3-05 (`src/export/iynk.ts` pattern) |
| Intent | Problem | A sketch written elsewhere cannot come in, and code written here cannot go to the Arduino IDE. Nothing reads or writes `.ino` today (VERIFIED, 0.2) |
| | Target user | Amar moving code between his bench and the app |
| | User story | As a builder I drop a `.ino` onto the app and get a project with my code, and I am told which lines the simulator cannot run. I export my sketch plus a wiring table |
| | Expected behaviour | Import: one or more text files become sources of a new project on a board, no parts, with a loss list shown before saving. Export: the board's firmware sources as a sketch folder, with a header comment listing libraries and the tier banner, plus a CSV `part,pin,net` |
| | Success metric | Round trip: export then import gives byte-identical source text, ignoring the generated header, over the 7 Arduino-language starters (uno-r3, nano, uno-r4, esp32-devkitc, esp32-s3-devkitc-1, nodemcu, nucleo-f401re) plus a hand-written Pico Arduino fixture in `src/export/__fixtures__/ino/` (Pico's starter is MicroPython, so no Arduino Pico starter exists to round-trip; VERIFIED: `profiles.ts:165` lists `['python', 'arduino']`) |
| Implementation | Existing files | `src/lib/interp/run.ts:100` (`check`), `src/lib/interp/errors.ts:41-47` (`Diagnostic`), `src/lib/interp/arduino/parser.ts:87-90` (`#include` collection). Schema: `Source` (`path` pattern, `content` max 262,144, at most 20 sources), `LossItem {code, severity, path?, message}`, `ExportRecord`. PLANNED: `src/core/limits.ts` (T-B2-02) |
| | New files | `src/export/ino.ts`, `src/export/loss.ts`; tests `ino.test.ts`, `loss.test.ts`, fixtures under `src/export/__fixtures__/ino/` |
| | Edited files | None (2 source files; the integration test and the Pico fixture are test files) |
| | Signatures | `// loss.ts` `export type LossSeverity = 'info' \| 'warning' \| 'error'; export interface LossItem { code: string; severity: LossSeverity; path?: string; message: string }` (matches `$defs.LossItem`) `export const LOSS = { boardGuess: 'ino.board-guess', unsupported: 'ino.unsupported-construct', unsupportedInclude: 'ino.unsupported-include', merged: 'ino.multi-file-merged', tooBig: 'ino.size-limit', notText: 'ino.not-text', noWiring: 'ino.no-wiring', libraries: 'ino.library-unpinned', params: 'ino.params-rendered', otherLanguage: 'ino.non-arduino-source', banner: 'ino.tier-banner' } as const;` `export function lossCodes(items: readonly LossItem[]): string[];` (for `ExportRecord.loss`, max 64, each max 64 chars). `// ino.ts` `export interface InoFile { name: string; bytes: Uint8Array }` `export interface InoDiagnostic { line: number; col: number; kind: 'syntax' \| 'compile' \| 'unsupported'; message: string; hint?: string }` `export type InoAnalyser = (source: string, board: string) => InoDiagnostic[];` `export interface InoImport { board: string; title: string; sources: { path: string; text: string; role: 'firmware' }[]; entry: string; loss: LossItem[] }` `export function importIno(files: readonly InoFile[], analyse: InoAnalyser, choose?: { board?: string }): Result<InoImport, InoImportError>;` `export function guessBoard(texts: readonly string[]): { board: string; reasons: string[] };` `export interface InoExport { folder: string; files: { path: string; text: string }[]; wiringCsv: string; loss: LossItem[] }` `export const INO_IMPORT_ERROR_CODES = ['too-many-files', 'too-big', 'not-text', 'no-entry', 'bad-path', 'empty'] as const; export const INO_EXPORT_ERROR_CODES = ['no-arduino-board', 'no-entry-source'] as const;` (so T-B5-19 can test that every code has a string key) `export function exportIno(state: ProjectState, boardId: string, opts: { exportedAt: string; appVersion: string }): Result<InoExport, InoExportError>;` `export function wiringCsv(state: ProjectState): string;` `export function stripInoHeader(text: string): string;` |
| | Data model | Import output is plain data, not a document. The caller (T-B5-19) creates the project through the same function as "New project" and applies `source.add` ops, so the blank-project rules (STUDIO 4.2) stay in one place. Source `path` of the entry is `main.ino`. `role: "firmware"`. Export sets `exports[]` entry `{format: "arduino-sketch", at, appVersion, sha256, revision, loss}`. This module returns the data; the caller (T-B5-19) writes the record with `session.recordExport(r)` (T-B5-08), because `exports[]` has no op and sits outside the state hash |
| | Input and output | `InoFile.bytes` are decoded as UTF-8 with a fatal decoder; a leading BOM is removed; NUL bytes mean not text. Entry file is the one named `*.ino`; with several `.ino` files, the one whose basename equals the folder name or `setup()`-bearing file is the entry and the rest become extra sources with a `multi-file-merged` info item. `.h` and `.cpp` files become sources with the same role. Output CSV header is exactly `part,pin,net`, one row per pin of a component or board that sits in a net, sorted by refdes then pin id, RFC 4180 quoting |
| | Algorithms | `guessBoard`: default `uno-r3`. Rules run in this order and the first match wins, because `ESP8266WiFi.h` contains the substring `WiFi.h`: (1) `/#include\s*<ESP8266WiFi\.h>/` gives `nodemcu`; (2) `/#include\s*<WiFiS3\.h>/` gives `uno-r4`; (3) an include of `pico/...` or `hardware/gpio.h` gives `pico`; (4) `#include <WiFi.h>` (exact), `WebServer.h`, `esp_` or `ESP32` gives `esp32-devkitc`. Every guess other than the default adds a `board-guess` info item with the reasons. Analyse: run the injected analyser on the entry source with the chosen board; the analyser reports the first blocking construct only: the parser throws at the first `#if`/`#ifdef` (`arduino/parser.ts:101`, `throw unsupported(...)`) and `check()` (`run.ts:100`) returns `RunImpl.diagnostics`, which holds one entry after a compile failure (`run.ts:185`; only runtime warnings at `run.ts:170` can add more). So the loss list has at most one analyser warning per file and the dialog says so (`ino.firstOnly`); it never claims a full list. That diagnostic becomes a `warning` loss item with `path` `main.ino:<line>:<col>`; `syntax` and `compile` diagnostics become `warning` items too (the sketch is kept). An `#include` that the interpreter has no shim for becomes an `unsupported-include` warning naming the header. Export: render `{{p:id}}` placeholders from `state.parameters` defaults with a 20-line local function (unknown id left as is and reported as `params-rendered` warning); prepend the header block (marker line `// iynk export` first, then banner, board, libraries from `firmware.libraries`, hash of sources); entry file path `<folder>/<folder>.ino` where `folder` is the project title made safe (`[A-Za-z0-9_]`, at most 40 chars, not starting with a digit); other firmware sources keep their relative path under the folder. Non-Arduino sources (Python, Verilog) are skipped with `non-arduino-source` info. `stripInoHeader` removes the header between the marker and a blank line, only if the marker is the first line |
| | State transitions | Pure functions; the dialog in T-B5-19 holds `idle, analysing, review, creating` |
| | Validation rules | Total import size at most 20 files and 262,144 characters per file (the schema limits); path rules `V3-PATH` (relative, NFC, no `..`, unique ignoring case); folder names from a browser `FileList` use only the basename. Nothing is executed: the analyser is `check()`, which compiles and does not run |
| | Error conditions | `InoImportError` codes: `too-many-files`, `too-big` (names file and limit), `not-text` (names file), `no-entry`, `bad-path`, `empty`. `InoExportError`: `no-arduino-board`, `no-entry-source` |
| | Edge cases | CRLF kept as is (the interpreter handles both). A file with only comments imports with no warning. A `.ino` over the limit is refused, never truncated. A zero-byte file is `empty`. Unicode in comments survives. `#if` is reported with the parser's existing text (`arduino/parser.ts:101`) |
| | Permissions | None. Runs in the page; large inputs are decoded in the caller's worker if T-B3 provides one (the 262,144 cap makes this cheap) |
| | Performance | Import of a 256 KB file under 200 ms including analysis (ESTIMATED; the analyser is the cost) |
| | Migration | None |
| Verification | Unit tests | `ino.test.ts`: decoder (BOM, NUL, invalid UTF-8); entry selection; limits; `guessBoard` table tests: `#include <ESP8266WiFi.h>` gives `nodemcu` (the substring case, which a `WiFi.h` rule would have mis-sent to the ESP32), `#include <WiFiS3.h>` gives `uno-r4`, `#include <pico/stdlib.h>` gives `pico`, `#include <WiFi.h>` gives `esp32-devkitc`, no include gives `uno-r3`; analyser injection (the importer maps whatever the injected analyser returns: a fake analyser returning two diagnostics yields two warnings with positions; this tests the mapping, not the real analyser); export header present and stripped by `stripInoHeader`; CSV golden for `uno-blink-d12.project.json`; `{{p:}}` render; round trip over the 7 Arduino-language starters plus the Pico Arduino fixture (reads starters when T-B5-01 to 04 exist; until then over the lessons' rendered sources) |
| | Integration tests | `src/components/studio/ino.integration.test.ts` (UI layer, which may import everything, so `src/export` never imports `@/lib/interp`) with the real analyser `check()` from `@/lib/interp`: on `with-if.ino` it asserts exactly one warning, at the `#ifdef` line, and the `ino.firstOnly` note applies; on `blink.ino` none |
| | Playwright | Covered by T-B5-19 and T-B5-11 |
| | Fixtures | `src/export/__fixtures__/ino/`: `blink.ino`, `serial.ino`, `with-if.ino` (uses `#ifdef`), `with-lib.ino` (`#include <Adafruit_NeoPixel.h>`), `two-files/` (`main.ino`, `util.h`), `pico-blink.ino` (hand-written Arduino-language Pico sketch), `crlf-bom.ino`, `binary.bin`, `huge.ino` (generated in the test, 262,145 characters). All written fresh by the task; none copied from third parties |
| | Acceptance | Given `with-if.ino`, When I import, Then the result has a warning at the `#ifdef` line and the source is unchanged. Given a project with parts, When I export, Then the CSV lists each connected pin once and the sketch opens with the banner. Given the exported files, When imported, Then the source text equals the original |
| | Observability | Loss list is the output. Codes go to `exports[].loss` via the caller |
| | Release blockers | Any path that runs code on import; a truncated file; a header that the importer cannot strip |
| Delivery | Definition of done | Fixtures pass; `PORT` passes (no DOM, no Node import); loss codes documented in `docs/BOARDS.md` appendix or `docs/STUDIO.md` |
| | Verify commands | `TL`; `V src/export src/components/studio/ino.integration.test.ts`; `PORT` |
| | Docs | `docs/STUDIO.md` import and export section (T-B5-23) |
| | Rollback | Revert; the two files are new |
| | Later tasks need | `importIno`, `exportIno`, `wiringCsv`, `LOSS` codes (T-B5-19, which also calls `recordExport`). B20 extends `exportIno` into the full bundle (T-B20-10) and keeps the header marker |

---

### T-B5-05. Schematic view model: symbols, auto layout, placement tool

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-05, STUDIO views (F-081, R-060, ST-6), B5 |
| | Priority, status | P2, not started |
| | Dependencies | T-B2-11 (descriptors), T-B2-13 (`netlist`), T-B4-03 (renderer types), T-B4-08 (`select.ts`, move), T-B4-10 (breadboard view and netlist overlay) |
| Intent | Problem | The breadboard shows where wires go in a box of holes. A textbook shows the same circuit as symbols. Amar needs both to check his own wiring |
| | Target user | Amar, friends |
| | User story | As a builder I switch to Schematic and see my parts as symbols with the same connections, and I can move parts without changing any connection |
| | Expected behaviour | The scene is built from the document: one symbol per placed or auto-placed component and board, connections from the netlist, labels where wires are long or nets are power or ground. Moving a part in this view writes `view.place` in this view only |
| | Success metric | Net-set equality test passes on the 38 converted catalogue circuits (corpus from T-B2-14); build of 500 parts and 1,000 nets under 15 ms (ESTIMATED target, recorded) |
| Implementation | Existing files | PLANNED: `src/studio/views/breadboard.ts`, `src/studio/overlays/netlist.ts` (T-B4-10), `src/studio/tools/select.ts` (T-B4-08), `src/studio/engine/types.ts` (T-B4-03), `src/project/netlist.ts` (T-B2-13). Schema: `View`, `Placement`, `Label`, `Group`; descriptor `visual.schematic {symbol, pin_sides}` |
| | New files | `src/studio/views/symbols.ts`, `src/studio/views/schematic.ts`, `src/studio/tools/schematic-place.ts`; tests beside |
| | Edited files | `src/studio/tools/select.ts` (route drag end in a `schematic` view to the new tool) |
| | Signatures | `// symbols.ts` `export type SymbolId = 'generated' \| 'resistor' \| 'led' \| 'diode' \| 'capacitor' \| 'inductor' \| 'switch' \| 'transistor-npn' \| 'motor' \| 'ic-box' \| 'module-box';` `export interface SymbolPin { pin: string; x_mm: number; y_mm: number; side: 'left' \| 'right' \| 'top' \| 'bottom'; label: string }` `export interface SymbolShape { w_mm: number; h_mm: number; paths: string[]; pins: SymbolPin[]; label: { x_mm: number; y_mm: number } }` `export function symbolFor(d: ComponentDescriptor): SymbolShape;` `// schematic.ts` `export interface SchematicNode { c: string; refdes: string; x_mm: number; y_mm: number; rotation_deg: number; mirrored: boolean; auto: boolean; shape: SymbolShape }` `export interface SchematicLink { net: string; points_mm: [number, number][] }` `export interface SchematicLabel { net: string; text: string; x_mm: number; y_mm: number }` `export interface SchematicScene { nodes: SchematicNode[]; links: SchematicLink[]; labels: SchematicLabel[] }` `export function autoLayout(state: ProjectState, viewId: string, reg: PartRegistry): Placement[];` `export function buildSchematicScene(state: ProjectState, viewId: string, reg: PartRegistry): SchematicScene;` `export function schematicNetSets(scene: SchematicScene): Set<string>[];` (each set holds `c.p` strings) `export function ensureSchematicView(state: ProjectState): Op[];` `// schematic-place.ts` `export interface Move { c: string; x_mm: number; y_mm: number; rotation_deg?: number; mirrored?: boolean }` `export function schematicMoveOps(state: ProjectState, viewId: string, moves: readonly Move[], reg: PartRegistry): Op[];` `export function arrangeOps(state: ProjectState, viewId: string, reg: PartRegistry): Op[];` |
| | Data model | Stored: `views[kind=schematic].placements[]` (`c, x_mm, y_mm, rotation_deg?, mirrored?, layer?, hidden?`). Computed: everything in `SchematicScene`. Units mm, quantised to 0.001 mm on write (PDM 4.2). Grid 2.54 mm |
| | Input and output | In: `ProjectState`, view id, registry. Out: scene or ops |
| | Algorithms | Symbols: the eight fixed kinds use small fixed geometry tables (two-lead parts 10.16 mm by 2.54 mm; transistor 7.62 mm square). `ic-box`, `module-box`, `generated`: rectangle, pins on the sides named by `pin_sides` or by default (power in top, ground bottom, inputs left, outputs and the rest right), 2.54 mm pitch, height from the longer side, label inside. Auto layout (STUDIO 6.4, ADR-0804): breadth-first layers from the boards over shared nets, ignoring nets of class ground or power; layer x = sum of widest symbol per layer plus 20 mm gaps; within a layer sort by refdes (natural order), stack with 20 mm gaps; parts unreachable from a board go in a last layer. Links: for each net with 2 to 4 pins, route consecutive pins (sorted by x then y) with one orthogonal elbow through the mid x; nets with more than 4 pins, or class power or ground, get a short stub and a label per pin. Labels carry `Net.name`, else `N<n>` by net order. Freeze on first edit: `schematicMoveOps` first emits `view.place` for every node whose placement is not stored, then the moves, in one batch. `arrangeOps` re-runs `autoLayout` and emits one `view.place` per node |
| | State transitions | A part is `auto` until the first manual edit in the view; then every node is stored |
| | Validation rules | Rotation in steps of 90 degrees. A `Move` for a component not in the document is dropped and reported by the caller. No op touches `nets` or `wires` (rule N7); a test asserts the netlist hash is unchanged after any ops from this module |
| | Error conditions | Unknown `viewId` returns `[]` and the scene builder throws `SchematicError('no-such-view')`. A descriptor without `visual.schematic` falls back to `module-box` for boards and modules and `ic-box` for others (no throw) |
| | Edge cases | Empty project: empty scene. A net with one pin: stub and label with the text `"<name> (open)"` key `board.noneConnected` is not used here; the label is the net name only. Two parts at the same stored position: left as is (no overlap fix). A hidden placement (`hidden: true`) is omitted and its nets stay drawn as labels |
| | Permissions | None |
| | Performance | Scene build under 15 ms at 500 parts and 1,000 nets (ESTIMATED); layout is O(parts + nets) |
| | Migration | None. Projects without a schematic view get one through `ensureSchematicView` when the tab first opens |
| Verification | Unit tests | `symbols.test.ts` (each of the 11 symbol ids has pins on the right sides; box size grows with pin count). `schematic.test.ts` (layers; ties by refdes; deterministic on a repeat; stubs and labels for power; **net-set equality**: for each of the 38 converted circuits `schematicNetSets(buildSchematicScene(...))` equals the sets of `netlist(state)` with 2 or more pins, and equals the breadboard overlay's sets from T-B4-10; 500-part scene time). `schematic-place.test.ts` (freeze on first edit writes all placements in one batch; netlist hash unchanged; arrange is one batch; second view untouched) |
| | Integration tests | Apply the ops to a session and check undo restores the earlier placements |
| | Playwright | Through T-B5-21a and T-B5-11 |
| | Fixtures | The converter corpus (T-B2-14 output) and `lesson-uno-r3-button.project.json` |
| | Acceptance | Given the Uno blink project, When I build the schematic scene, Then it holds the Uno, LED and resistor, a link or label for each net, and the D13 net lists the same pins as the breadboard overlay. Given I move the LED, When the batch applies, Then the breadboard view's placements and the netlist hash are unchanged |
| | Observability | None at run time |
| | Release blockers | Any op from this module that touches nets or wires; a layout that differs between two runs |
| Delivery | Definition of done | Equality test passes on all converted circuits; `PORT` is not required (`studio` is not portable) but no DOM import in `src/studio/views` |
| | Verify commands | `TL`; `V src/studio` |
| | Docs | `docs/STUDIO.md` views section (T-B5-23) |
| | Rollback | Revert; stored placements are plain `view.place` ops and stay valid |
| | Later tasks need | `buildSchematicScene`, `autoLayout`, `ensureSchematicView`, `schematicMoveOps`, `arrangeOps` (T-B5-16 and T-B5-21a). B10 draws fault markers on the same scene |

---

### T-B5-07. Align, distribute, groups, copy and paste across projects

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-07, STUDIO tools (STUDIO 6.4, 6.10; ST-6), B5 |
| | Priority, status | P2, not started |
| | Dependencies | T-B4-08 (`clipboard.ts`, select), T-B2-06 (`group.set`, `group.remove` apply), T-B2-11 (registry) |
| Intent | Problem | Tidy layouts take many drags; a group of parts cannot move together; a circuit built in one project cannot be reused in another |
| | Target user | Amar, friends |
| | User story | As a builder I align six parts in one step, group a sensor and its resistor, and paste a working part of one project into another |
| | Expected behaviour | Align left, right, top, bottom, centre; distribute horizontally or vertically (3 or more parts); one batch of `view.place`. Group makes a `Group` in the active view; moving a member moves all; groups do not nest; a member is in one group. Paste across projects pins unknown definitions with `dep.set` and arrives with generic art when the registry lacks the part |
| | Success metric | Each action is one undo step; a clip pasted into an empty project gives the same netlist (by pin names) as the source selection's internal nets |
| Implementation | Existing files | PLANNED `src/studio/tools/clipboard.ts` (T-B4-08), `select.ts`. Schema `Group` (`id grp_..., name?, members[]` 2 to 2000, members are `brd/cmp/wir/jct/lbl` ids of the same view; groups do not nest; a member in one group), op list in 0.2. Clip media type `application/x-iynk-clip+json` (STUDIO 6.10) |
| | New files | `src/studio/tools/align.ts`, `src/studio/tools/groups.ts`; tests |
| | Edited files | `src/studio/tools/clipboard.ts` |
| | Signatures | `// align.ts` `export type AlignKind = 'left' \| 'right' \| 'top' \| 'bottom' \| 'centerH' \| 'centerV'; export type DistributeAxis = 'horizontal' \| 'vertical';` `export interface Box { c: string; x_mm: number; y_mm: number; w_mm: number; h_mm: number }` `export function alignOps(view: string, boxes: readonly Box[], kind: AlignKind): Op[];` `export function distributeOps(view: string, boxes: readonly Box[], axis: DistributeAxis): Op[] \| { error: 'need-three' };` `// groups.ts` `export function groupOps(state: ProjectState, viewId: string, members: readonly string[], name?: string, newId?: () => string): Op[] \| { error: 'need-two' \| 'nesting' \| 'already-grouped'; ids?: string[] };` `export function ungroupOps(viewId: string, groupId: string): Op[];` `export function expandSelection(state: ProjectState, viewId: string, selected: readonly string[]): string[];` (adds all members of any touched group) `export function moveGroupOps(state: ProjectState, viewId: string, groupId: string, dx_mm: number, dy_mm: number): Op[];` `// clipboard.ts (additions)` `export interface Clip { v: 1; components: ClipPart[]; placements: Placement[]; nets: ClipNet[]; wires: Wire[]; deps: { ref: string; version: string }[]; from?: string }` `export function copyClip(state: ProjectState, viewId: string, selected: readonly string[]): Clip;` `export function pasteOps(state: ProjectState, viewId: string, clip: Clip, at: { x_mm: number; y_mm: number }, reg: PartRegistry, newId: (prefix: string) => string): Op[];` (the existing in-project paste is generalised; if B4 shipped `copy`/`paste` names, keep them and add the new fields) |
| | Data model | `Group` as above. Clip holds no ids that survive paste (fresh ids for everything, refdes renumbered, offset by 2 grid steps). A group is stored on the view; it is not shared with other views |
| | Input and output | Boxes come from the draw list (`w_mm`, `h_mm` from the symbol or the art box) |
| | Algorithms | Align: target is min x (left), max x+w (right), min y (top), max y+h (bottom), mean of centres (centre), one `view.place` per moved item and none for items already on target. Distribute: sort by centre, keep the first and last, equal gaps between edges for the middle ones. Group: reject when a member is a group id, when fewer than two members, or when a member is already in a group; id from `newId('grp')`. Paste: `dep.set` for each `{ref, version}` not pinned; `component.add` per part with fresh `cmp_` id and next free refdes; `view.place`; `net.create` for each internal net (2 or more selected pins); `wire.add` for internal wires; wires to unselected parts are not copied; pins in nets with outside pins are not connected (R-055) |
| | State transitions | None |
| | Validation rules | All ops pass `apply` dry run; paste of 2,000+ placements refused with the size limit message. Breadboard-leg parts pasted into a project without a breadboard land in the tray (unplaced), not on nothing |
| | Error conditions | `need-three`, `need-two`, `nesting`, `already-grouped` as return values, shown by T-B5-17 with the `align.*` keys. A clip with an unreadable shape: `pasteOps` returns `[]` and the caller shows nothing (a clip that is not iynk JSON is ignored, STUDIO 6.10) |
| | Edge cases | Align of one item: no ops. Group member deleted later: `apply` removes the member and drops the group when fewer than 2 remain (PDM rule; the test asserts whatever the B2 apply does and records it). Paste while the code editor has focus pastes text: handled by the caller |
| | Permissions | None. In a room, group ops follow the same edit rights as `view.place` |
| | Performance | Under 5 ms for 200 selected items |
| | Migration | None. `group.set` exists in schema 1.1 (VERIFIED in the schema description) |
| Verification | Unit tests | `align.test.ts` (each kind on 3 boxes; distribute equal gaps; `need-three`; no-op items). `groups.test.ts` (make, nest refused, one-group rule, expand, move one batch, ungroup). `clipboard.test.ts` (cross-project paste: copy from project A, paste into B; B gets `dep.set`, fresh ids, same pin-name connections; unknown definition arrives with pinned interface; a clip with 1 pin of a net with outsiders is left unconnected) |
| | Integration tests | Apply paste ops to a session built from `lesson-uno-r3-button.project.json`; validators V1 to V3 pass; undo once removes everything |
| | Playwright | Through T-B5-17 / T-B5-21a / T-B5-11 |
| | Fixtures | `lesson-uno-r3-button.project.json`, `uno-blink-d12.project.json` |
| | Acceptance | Given three parts at different heights, When I align top, Then all three have the same top edge in one undo step. Given an LED and a resistor grouped, When I move the group by (10, 5) mm, Then both placements move by exactly that and the netlist hash is unchanged |
| | Observability | None |
| | Release blockers | A group that changes a net (rule G1); ids reused by paste |
| Delivery | Definition of done | Tests pass; no DOM in `align.ts` or `groups.ts` |
| | Verify commands | `TL`; `V src/studio` |
| | Docs | `docs/STUDIO.md` shortcuts table (T-B5-23) |
| | Rollback | Revert; `clipboard.ts` returns to B4 behaviour |
| | Later tasks need | `alignOps`, `distributeOps`, `groupOps`, `ungroupOps`, `expandSelection`, `moveGroupOps`, `copyClip`, `pasteOps` (T-B5-17) |

---

### T-B5-12. Editor performance budgets in the scheduled job

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-12, PERF (R-019, R-074, BUD-01 to BUD-04, BUD-08, BUD-09), B5 |
| | Priority, status | P2, not started |
| | Dependencies | T-B0-06 (creates `.github/` and `scripts/ci-local.sh`; VERIFIED `.github/` does not exist today), T-B1-24 (`scripts/perf-budget.mjs`, `budgets.json`), T-B4-05 (500-part scene, `e2e/studio-perf.spec.ts`, `e2e/support/frames.ts`), T-B3-21 (WebKit project), T-B3-04 (autosave) |
| Intent | Problem | B4 recorded BUD-01 to BUD-04 once. Nothing watches them, and autosave (BUD-08) and open (BUD-09) at 500 parts have no measurement at all (UNKNOWN today) |
| | Target user | Amar's future self; every later phase that adds to the editor |
| | User story | As the owner I see a number and a failure when the editor gets slower |
| | Expected behaviour | `node scripts/perf-budget.mjs` measures the headless budgets and fails on a rise over 10 percent from `budgets.json` (PROPOSAL from T-B1-24; Amar confirms). A scheduled Playwright job writes p50 and p95 per interaction. Chromium: CPU throttle 1x, 4x and 6x through CDP (`Emulation.setCPUThrottlingRate`, which exists only on Chromium) at DPR 1 and 2. WebKit: 1x and DPR 1 and 2 only, because Playwright cannot throttle WebKit CPU (EXTERNAL; no WebKit rows at 4x or 6x are produced or claimed). The job fails when a budget is missed by the default renderer |
| | Success metric | Table of measured values committed to `budgets.json` with the date and machine class |
| Implementation | Existing files | PLANNED `scripts/perf-budget.mjs`, `budgets.json` (T-B1-24); `e2e/studio-perf.spec.ts`, `e2e/support/frames.ts`, `src/studio/engine/scene-fixture.ts` (T-B4-05). VERIFIED: `playwright.config.ts:23-26` has projects `chromium` and `phone` only today. Budgets: PRD section 3.1 lines 95 to 103 |
| | New files | `.github/workflows/perf-editor.yml` (a scheduled workflow; the `.github/workflows/` directory comes from T-B0-06, and T-B1-24 already added a perf step to `ci.yml`, so this file adds only the editor job) |
| | Edited files (4 in all) | `scripts/perf-budget.mjs`, `budgets.json`, `e2e/support/frames.ts`; the new workflow file. `e2e/studio-perf.spec.ts` is a test file |
| | Signatures | `budgets.json` entries `{ id: 'BUD-08', metric: 'autosave-commit-p95-ms', limit: 50, measured: number \| null, measuredAt: string \| null, knownMiss?: string }`. `frames.ts`: `export async function measureInteraction(page: Page, run: () => Promise<void>, frames: number): Promise<{ p50: number; p95: number; max: number }>` (extend the B4 helper with `cpuThrottle: 1 \| 4 \| 6` and `dpr: 1 \| 2` arguments if absent; `cpuThrottle` above 1 throws `ThrottleUnsupported` on a non-Chromium page so a WebKit 4x row cannot be produced by mistake) |
| | Data model | Results file `perf-results/editor.json`: `{ commit, date, browser, cpuThrottle, dpr, interactions: { pan, drag, hover, zoom, fit: { p50, p95, max } }, budgets: [{ id, limit, p95, pass }] }` |
| | Input and output | Spec seeds IndexedDB with the 500-part, 1,000-wire fixture, then (BUD-09) reloads and times from navigation start to the first editable frame, and (BUD-08) applies 50 single-op commits and reads the `saved` event timing from the `ProjectWorker` |
| | Algorithms | Same percentile method as RS-01's harness. BUD-04 (idle CPU) measured with the long-task and CPU profile helper already in `scripts/perf-budget.mjs`. WebKit pan-fit with LOD is a known miss (22 ms, MEASURED in RS-01): recorded as `knownMiss` with the R-053 decision rule text, and does not fail the job until Amar decides |
| | State transitions | None |
| | Validation rules | A budget with `measured: null` fails the script in `--check` mode so nothing is silently unmeasured |
| | Error conditions | Missing fixture, WebKit not installed (the job says "install webkit" and fails, it does not skip: R-001 rule) |
| | Edge cases | Noisy machine: the spec runs each interaction 3 times and takes the lowest p95; load average printed in the results |
| | Permissions | None |
| | Performance | The scheduled job may take 20 minutes. The PR-time part (BUD-04, 08, 09 headless) stays under 3 minutes (ESTIMATED) |
| | Migration | `budgets.json` gets new entries; existing ones untouched |
| Verification | Unit tests | `scripts/perf-budget.test.mjs`: the comparison function (10 percent rule; null fails; knownMiss passes with a note). `scripts/perf-editor-workflow.test.mjs`: the workflow YAML parses (same method as `scripts/ci-local.test.mjs` from T-B0-06), contains no `secrets.`, runs `node scripts/perf-budget.mjs --check` and `e2e/studio-perf.spec.ts`, and lists no WebKit step with a throttle |
| | Integration tests | `node scripts/perf-budget.mjs --record` then a second run passes |
| | Playwright | `E e2e/studio-perf.spec.ts` (Chromium, 1x) |
| | Fixtures | The B4 scene fixture |
| | Acceptance | Given a recorded baseline, When the editor gets 15 percent slower on BUD-09, Then the script exits non-zero and names BUD-09. Given the first run, Then BUD-08 and BUD-09 have numbers or the task reports which one it could not measure and why |
| | Observability | `perf-results/editor.json` artifact |
| | Release blockers | A budget silently skipped. The workflow YAML is not proven until Amar pushes: it cannot run locally and B5 forbids a push, so the task proves its content with the two local commands above and the YAML parse test, and says "not proven until Amar pushes" in its commit message |
| Delivery | Definition of done | Numbers for BUD-04, 08, 09 in `budgets.json`; BUD-01 to 03 recorded for Chromium at 1x, 4x, 6x and for WebKit at 1x |
| | Verify commands | `TL`; `node scripts/perf-budget.mjs --check`; `E e2e/studio-perf.spec.ts`; `V scripts`. The scheduled job is verified locally by running those two commands (`ci-local.sh` has no perf step: its interface is `--list`, `--only`, `--skip` over the nine B0 steps) |
| | Docs | `docs/device-results.md` header note on which numbers are desktop only (T-B5-23) |
| | Rollback | Revert; the job is additive |
| | Later tasks need | The job, as the place B8 to B19 add their budgets |

---

### T-B5-20. Spike: how much of real-world `.ino` code does the interpreter accept?

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-20, research spike (PDM Q6, F-091), B5 |
| | Priority, status | P3, not started. Nothing waits for it |
| | Dependencies | None to start; T-B5-10 is better with its result but does not need it |
| Intent | Problem | UNKNOWN: how many ordinary sketches the Arduino C++ subset interpreter can run. The importer's honesty depends on the answer (PDM Q6, line 1330) |
| | Falsifiable question | H0: at least 70 percent of a corpus of ordinary Arduino sketches pass `check()` with zero `unsupported`, `syntax` and `compile` diagnostics. Falsified if fewer than 70 percent pass |
| | Exit condition | A report `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-B5-ino-coverage/REPORT.md` that states: corpus size and origin, pass rate with the counts, the ten most common unsupported constructs with counts, a verdict PASS or FAIL against 70 percent, and what the importer dialog should say. An independent check is a second agent re-running the script on the same corpus |
| Implementation | Existing files | `src/lib/interp/run.ts:100` (`check`), `src/lib/interp/arduino/parser.ts`, `src/lib/interp/arduino/libs.ts` (shim list) |
| | New files | Under the spike folder only: `REPORT.md`, `run.test.ts` (a Vitest file used as the runner, kept outside `src/` and run with `npx vitest run --root . <path>` because Vitest includes only `src/**`; if it will not pick it up, the task copies it to `src/lib/interp/__spike__/` temporarily and deletes it before the commit), `corpus/` |
| | Corpus | (a) Control: every rendered `arduino-cpp` lesson source in `src/content/boards` (expected 100 percent, proves the runner). (b) At least 30 sketches the agent writes fresh in the common styles of the Arduino built-in examples (blink, fade, button, debounce, analogRead, serial echo, servo sweep, ultrasonic, LCD hello, I2C scan, millis timing, state machine, array and struct use, `String` methods, `switch`, interrupts). Written from scratch, not copied. (c) Optional: public-domain example sketches that Amar places in `corpus/` (For Amar, section 6 item 6; the task does not download anything). Labels: (b) is HYPOTHESIS for how representative it is |
| | Method | For each sketch run `check({board: 'uno-r3', source})`; record diagnostics by `kind` and message; group messages by construct; a sketch passes when it has no diagnostic of kind `unsupported`, `syntax` or `compile` |
| | Error conditions | A sketch that makes `check()` throw is a fail with the exception text |
| | Edge cases | Report (a) and (b) separately; the verdict uses (b) plus (c) |
| | Permissions, performance, migration | None |
| Verification | Unit tests | The runner asserts (a) is 100 percent |
| | Acceptance | Given the corpus, When the runner runs, Then the report table matches the runner output exactly |
| | Release blockers | A copied third-party sketch in the corpus |
| Delivery | Definition of done | Report committed with verdict. Verify: `V` the runner |
| | Docs | One sentence in `docs/STUDIO.md` import section, written by T-B5-23, quoting the verdict |
| | Rollback | Delete the folder |
| | Later tasks need | The verdict text for the importer dialog (T-B5-19 may adjust `ino.lossBoard`-style copy only through T-B5-22 files) |

---

### T-B5-01. Boards `nano` and `uno-r4`

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-01, STUDIO boards (R-072, F-104, F-084), B5 |
| | Priority, status | P1, not started |
| | Dependencies | T-B5-15 |
| Intent | Problem | Only the Uno exists in Studio |
| | Target user | Amar with a Nano or an Uno R4 on the bench |
| | User story | As a builder I choose Nano or Uno R4 in New project and get a starter that runs |
| | Expected behaviour | Both boards appear in the board picker (picker reads the registry; no picker edit), with art from the existing figure, a starter (their `blink` lesson circuit) and a "What it models" panel that says plainly what the interpreter does not cover |
| | Success metric | `boards.test.ts` binds both; both starters run headless and pass the lesson's `blink` checks |
| Implementation | Existing files | `src/content/boards/nano.ts` (36 `header:` rows, ESTIMATED from grep; pinout at `:12-47`, notes `pins.j1.*`), `src/content/boards/uno-r4.ts` (71 rows, blink lesson at `:416`), `src/lib/interp/profiles.ts:112` (`nano`), `:118` (`unoR4`, variants `minima`, `wifi`), `public/figures/boards/nano.html`, `uno-r4.html`. PLANNED `src/parts/browser/load.ts`, `src/studio/starters/index.ts` |
| | New files | `src/parts/data/nano.component.json`, `src/parts/data/uno-r4.component.json` (one data set); `src/studio/starters/nano.project.json`, `uno-r4.project.json` (one data set); `src/i18n/content/<lang>/parts/nano.json`, `uno-r4.json` (one i18n set); test `src/studio/starters.test.ts` (created here, extended by 02 to 04) |
| | Edited files (4 in all) | The three data sets above count 3; `src/parts/browser/load.ts`; `src/studio/starters/index.ts` is the fifth. Total 5 |
| | Board facts to carry | Nano: ATmega328P, 5 V logic, 16 MHz, A6 and A7 analog-in only (profile `analogOnlyPins: [20, 21]`), `digitalPins` 0 to 19, PWM 3, 5, 6, 9, 10, 11, interrupt 2 and 3, LED on D13, Language `arduino-cpp`. Uno R4: Renesas RA4M1, 5 V, 48 MHz, 32-bit int, ADC to 14 bits, DAC on A0, pins source 8 mA only, variants `minima` and `wifi`, WiFi variant has a 12x8 matrix and an ESP32-S3 radio (profile notes `profiles.ts:118-130`). Not modelled (to state in `not_modelled[]`): Nano: USB-serial bridge chip, bootloader, power regulator limits, EEPROM wear. Uno R4: Renesas peripherals other than digital I/O, I2C and serial, the LED matrix library, the radio, DAC output as an analog value (B8), 8 mA limit enforcement |
| | Signatures | None new. The descriptor files follow 3.1 |
| | Data model | As 3.1 and 3.2. Starter: Nano and Uno R4 `blink` use LED_BUILTIN on D13 per the lesson; parts as the converter produces |
| | Input and output | Descriptor JSON validates against `component.schema.json`; starter validates against `project.schema.json` |
| | Algorithms | Generate the pin list with `buildBoardDescriptor` in update mode (`UPDATE_BOARD_PARTS=1 npx vitest run src/parts/board-gen.test.ts` writes missing descriptor files), then complete by hand: sources, art, text, `simulation`, `software` |
| | Validation rules | `boards.test.ts` rules (T-B5-15); `SCHEMA`; six-language parity of the `parts/` strings |
| | Error conditions | A pin the profile has and the descriptor lacks fails the test with board and pin |
| | Edge cases | Uno R4 `variants`: both appear as a board `variant` choice; `hasWifi` differs. Nano `A6`, `A7`: type `analog_in`, note "analog input only" |
| | Permissions, performance | None. Descriptors are loaded lazily by the registry (no first-load cost) |
| | Migration | None |
| Verification | Unit tests | `boards.test.ts` (binding, both boards); `starters.test.ts` (schema valid; drift guard against lesson source and netlist; headless run passes the lesson checks) |
| | Integration tests | Registry lookup `core.nano` and `core.uno-r4` returns descriptors; search finds "nano" (T-B4-07 `src/parts/search.ts`) |
| | Playwright | Covered by T-B5-11 |
| | Fixtures | The two starters; the worked ESP32 example as shape reference |
| | Acceptance | Given New project, When I pick Arduino Nano, Then a project opens with a Nano, an LED path as the lesson wires it, and a Blink sketch; When I Run, Then the LED follows D13. Given the models panel, Then it names what the interpreter does not cover |
| | Observability | None |
| | Release blockers | Any "validated" wording; a pin mismatch |
| Delivery | Definition of done | Both boards in the registry; unbound list shows 9 |
| | Verify commands | `TL`; `V src/parts src/studio src/components/studio src/lib/interp src/i18n`; `PORT`; `SCHEMA` |
| | Docs | `docs/BOARDS.md` rows (T-B5-23 collects them from the descriptors) |
| | Rollback | Revert; boards are data |
| | Later tasks need | `load.ts` and `starters/index.ts` entries pattern for 02 to 04 |

---

### T-B5-02. Boards `esp32-devkitc`, `esp32-s3-devkitc-1`, `nodemcu`

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-02, STUDIO boards, B5 |
| | Priority, status | P1, not started |
| | Dependencies | T-B5-01 (index files and `starters.test.ts` exist) |
| Intent | Problem, user, story | As T-B5-01, for Wi-Fi boards that Amar and friends use most |
| | Expected behaviour | Three boards selectable with starters. ESP32-DevKitC has no user LED: its starter wires an external LED and resistor to GPIO23, as the profile note says (`profiles.ts:138`). ESP32-S3 uses the RGB LED on GPIO38 (v1.1) or GPIO48 (v1.0). NodeMCU LEDs are active low |
| | Success metric | As T-B5-01 |
| Implementation | Existing files | `src/content/boards/esp32-devkitc.ts` (blink at `:275`), `esp32-s3-devkitc-1.ts` (blink at `:294`), `nodemcu.ts`; profiles `profiles.ts:128` (esp32; the LED note is at `:138`), `:141` (esp32s3), `:152` (nodemcu); worked example `esp32-devkitc.component.json` (38 pins). Figures in `public/figures/boards/` |
| | New files | Data set of 3 descriptors; data set of 3 starters; i18n set for 3 boards |
| | Edited files | `src/parts/browser/load.ts`; `src/studio/starters/index.ts` (5 in all with the three sets) |
| | Board facts to carry | ESP32: 3.3 V, 240 MHz, GPIO34 to 39 input only, ADC2 unusable with Wi-Fi, no `LED_BUILTIN`. ESP32-S3: variants `v1.1` and `v1.0` (RGB LED GPIO38 or GPIO48), `rgbLedWrite`. NodeMCU: D-numbers differ from GPIO numbers (D4 is GPIO2), A0 reads 0 to 3.3 V through a divider, GPIO16 no interrupt. Not modelled: Xtensa cores and FreeRTOS tasks, Wi-Fi and Bluetooth radio behaviour (the interpreter has a request stub for web-server lessons, `Run.request`), flash, strapping-pin traps, the 3.3 V regulator limits |
| | Algorithms | As T-B5-01. For NodeMCU the descriptor pin ids are `D0` to `D8`, `A0`, `RX`, `TX`, `SD2`, `SD3`; the designator is the printed label (`D4`) and the GPIO number is resolved through `profile.aliases` (`profiles.ts:159`) in the test |
| | Edge cases | The active-low LED is a profile fact (`leds[].activeLow`); the descriptor note says so in plain words and the starter code uses `LOW` to light it, as the lesson does |
| | Others | Data model, validation, errors, permissions, performance and migration as T-B5-01 |
| Verification | Unit tests | As T-B5-01 for three boards; plus a test that the ESP32 starter contains an LED part on `GPIO23` and that ESP32-S3's descriptor lists both variants |
| | Integration, Playwright, fixtures | As T-B5-01; the ESP32 worked example is the golden for the DevKitC pin count |
| | Acceptance | Given New project, When I pick NodeMCU and Run, Then the on-board LED part lights when the sketch writes LOW. Given ESP32-DevKitC, Then the project contains an external LED wired to GPIO23 through a resistor |
| | Release blockers | Claiming Wi-Fi works; any "validated" |
| Delivery | Definition of done | Unbound list shows 6 |
| | Verify commands | `TL`; `V src/parts src/studio src/components/studio src/lib/interp src/i18n`; `PORT`; `SCHEMA` |
| | Docs, rollback, later | As T-B5-01 |

---

### T-B5-03. Boards `pico`, `microbit-v2`, `nucleo-f401re`

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-03, STUDIO boards, B5 |
| | Priority, status, dependencies | P1, not started, T-B5-02 |
| Intent | Expected behaviour | Pico (MicroPython default, Arduino also allowed, variants `pico`, `pico-w`, `pico2`, `pico2-w`), micro:bit V2 (MicroPython, 5x5 matrix, buttons A and B), Nucleo-F401RE (Arduino C++, LD2 on D13, B1 USER on PC13 reads LOW pressed) |
| Implementation | Existing files | `src/content/boards/pico.ts` (blink `:228`), `microbit-v2.ts` (blink `:172`, circuit `blink` at `:175`), `nucleo-f401re.ts` (blink `:363`); profiles `profiles.ts:164` (pico), `:174` (nucleo), `:185` (microbit) |
| | New and edited files | As T-B5-02 |
| | Board facts to carry | Pico: `pwmPins: 'all'`, 12-bit ADC read as `read_u16()`, W boards move the LED to the radio (`profiles.ts` getProfile pico branch), Pico 2 is RP2350. micro:bit: pins P0 to P16, P19, P20; pins P3, P4, P6, P7, P9, P10 are shared with the display; I2C SDA is P20 and SCL is P19. Nucleo: most pins 5 V tolerant, analog inputs are not. Not modelled: PIO state machines and the second core (Pico), the radio and the microphone and speaker (micro:bit), the ST-LINK debugger and the clock tree (Nucleo) |
| | Edge cases | Pico descriptor languages are two (`micropython`, `arduino-cpp`); the starter is MicroPython (first language) and the descriptor test checks the order matches `profile.languages` (`['python', 'arduino']`). micro:bit has no discrete user LEDs in the profile: the starter drives P1 through an external LED as the lesson does |
| | Other fields | As T-B5-02 |
| Verification | Unit tests | As T-B5-01; plus: Pico variants listed; micro:bit button pins 5 and 11 present; Nucleo `USER_BTN` alias resolves |
| | Acceptance | Given Pico selected, When I Run the starter, Then the Python runtime executes it (language `python` in the run) and the LED part toggles |
| Delivery | Definition of done | Unbound list shows 3. Verify as T-B5-02 |

---

### T-B5-04. Boards `pi4-pi5`, `basys3`, `de10-lite`

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-04, STUDIO boards, B5 |
| | Priority, status, dependencies | P1, not started, T-B5-03 |
| Intent | Expected behaviour | Raspberry Pi 4/5 as a Python API model (labelled as that, never as a Raspberry Pi OS: BRIEF 10.2, R-072). Basys 3 and DE10-Lite as FPGA boards: ports (switches, LEDs, seven-segment, clock) instead of pins in the board view; starter runs on the existing TypeScript Verilog cycle simulator. **No Yosys and no netlist inspect in B5**: the roadmap phrase "netlist inspect only" is read as "no synthesis, no timing, Inspect arrives in T-B9-09" (ADR-0315: Yosys is an optional Inspect mode, loaded on click, desktop first). This is a departure from the roadmap, listed in section 0.3 and confirmed by Amar at the stop (section 6 item 10). Testable claim: B5 adds no Yosys import and no Inspect command (`grep -rn "yosys" src/studio src/components/studio` returns nothing) |
| Implementation | Existing files | `src/content/boards/pi4-pi5.ts` (blink `:224`, `gpiozero`, check pin `GPIO17`), `basys3.ts` (lessons `gates` `:385`, `blink` `:403`), `de10-lite.ts` (`switches` `:387`, `blink` `:405`); profiles `profiles.ts:196` (pi), `:206` (basys3, `fpga.ports` 14 entries), `:226` (de10, `fpga.ports`); `src/lib/interp/verilog/` |
| | New and edited files | As T-B5-02 |
| | Board facts to carry | Pi: no analog inputs, BCM numbering, hardware PWM on GPIO12, 13, 18, 19, `RPi.GPIO` does not work on Pi 5 (use `gpiozero`). Basys 3: 100 MHz clock on port `clk`, buttons active high, seven-segment active low common anode (`an[3:0]`, `seg[6:0]`), Pmod JA/JB/JC outputs only. DE10-Lite: 50 MHz `MAX10_CLK1_50`, `KEY[1:0]` read 0 pressed, `HEX0` to `HEX5` active low, `ARDUINO_IO[15:0]` output only. Not modelled: Linux, the desktop, the camera and network stacks (Pi); synthesis, timing closure, constraint files, the ADC, block RAM sizing (FPGA boards); real clocks are scaled (`SIM_CLOCK_HZ = 100000`, ADR-0315) |
| | Algorithms | FPGA descriptors: one pin per port bit (3.1), `connectors` per Pmod, `type` `digital_in` for switches and buttons, `digital_out` for LEDs and segments, `software.environments[0].language: "verilog"`, `firmware.ports` in the starter maps ports to pin ids (schema `Firmware.ports`) |
| | Edge cases | A 16-bit port is 16 pins; the 14-entry `fpga.ports` list would give 74 pins for Basys 3 (ESTIMATED from `profiles.ts` port widths: 1 + 16 + 5 + 16 + 7 + 1 + 4 + 24; kept only as a comment in the test). The test computes the count and asserts `pins.length === sum(fpga.ports[].width)` for both FPGA boards. Pi variants `pi4`, `pi5` change clock only |
| | Other fields | As T-B5-02 |
| Verification | Unit tests | As T-B5-01; plus the FPGA rule: each `fpga.ports` entry maps to `width` pins named `<port>_<bit>` with `activeLow` stated in the pin note |
| | Integration tests | `runHeadless` on both Verilog starters runs without error for the lesson's `runMs` and the checks pass |
| | Acceptance | Given each FPGA descriptor, When the test runs, Then `pins.length` equals the sum of the profile's `fpga.ports[].width`. Given Basys 3, When I open the board view, Then it lists ports, not header pins, and Run toggles `led[0]`. Given the models panel for Pi, Then it says "Python API model, not Raspberry Pi OS" |
| | Release blockers | Any text implying synthesis or hardware timing |
| Delivery | Definition of done | Unbound list is empty; `boards.test.ts` binds 12 of 12 |
| | Verify commands | `TL`; `V src/parts src/studio src/components/studio src/lib/interp src/i18n`; `PORT`; `SCHEMA` |

---

### T-B5-06. Board view and pin map

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-06, STUDIO views (F-081, R-061), B5 |
| | Priority, status | P2, not started |
| | Dependencies | T-B5-15 (descriptors with pin types), T-B5-22 (keys), T-B4-19 (`keyboard.ts`, pin picker), T-B4-14 (live overlays) |
| Intent | Problem | A board has 30 to 70 pins. A person needs to see which one does what and what is connected to it, in a list, while the program runs |
| | Target user | Amar, friends, screen-reader users (the DOM list is the accessible form) |
| | User story | As a builder I open the board view and see D13, its role, the net it is on, what else is on that net, and whether it is high now |
| | Expected behaviour | A table grouped by connector, one row per pin: designator, name, role, net, connected-to list, live level and mode while running. FPGA boards show ports with widths and switch, LED and segment state. Selecting a row selects its net (the same selection store as other views). "Wire this pin to..." opens the existing pin picker with the pin as the first end |
| | Success metric | 70-pin board renders under 16 ms; every row reachable by keyboard; axe clean (T-B5-21a) |
| Implementation | Existing files | PLANNED: `src/studio/stores/session.ts` (selection), `src/studio/tools/keyboard.ts` (T-B4-19, pin picker), `src/studio/overlays/state.ts` (T-B4-14, pin levels), `src/project/netlist.ts` |
| | New files | `src/studio/views/board.ts`, `src/components/studio/PinMap.tsx`; tests |
| | Edited files | `src/studio/tools/keyboard.ts` (export `startWireFromPin(pin: PinRef)` if the picker has no entry for a given first end) |
| | Signatures | `// board.ts` `export interface PinRow { pin: string; designator: string; name: string; type: PinType; klass: PinClass; connector: string; role: 'power' \| 'ground' \| 'digital' \| 'analog' \| 'bus' \| 'other'; netId?: string; netName?: string; connectedTo: string[]; note?: string }` `export interface PortRow { port: string; dir: 'in' \| 'out'; width: number; activeLow: boolean; bits: PinRow[] }` `export interface PinMapModel { board: string; refdes: string; kind: 'pins' \| 'ports'; groups: { connector: string; rows: PinRow[] }[]; ports: PortRow[] }` `export function buildPinMap(state: ProjectState, boardId: string, reg: PartRegistry): PinMapModel;` `export interface PinLive { level: 0 \| 1; mode: string }` `export function livePins(frame: SimFrameLike, boardId: string): Record<string, PinLive>;` `export function ensureBoardView(state: ProjectState): Op[];` (returns `[{k: 'view.add', view: {id, kind: 'board', name, placements: [], wires: []}}]` when the document has no `board` view, else `[]`; the id is the next free `vw_*` local id) `// PinMap.tsx` `export function PinMap(props: { model: PinMapModel; live: Record<string, PinLive>; selectedNet?: string; onSelectNet(netId: string \| undefined): void; onWireFrom(pin: PinRef): void }): JSX.Element;` |
| | Data model | Reads only. `connectedTo` lists `refdes.pin` strings of other pins on the net (as AI diff cards do). Roles come from the descriptor pin `type` and `class`, plus bus membership from the descriptor `protocols` when present |
| | Input and output | Model in, rows out. No writes except through `onWireFrom` which opens the picker |
| | Algorithms | Group by `connector`; sort rows by the descriptor pin order; FPGA: group bits under their port. Live state: map frame pin values to pin ids through the board's pin resolution (the sim host's frame already keyed by board pin; the mapping function is `livePins`) |
| | State transitions | Run state shown as text ("Not running" when stopped) and as a column that is empty when stopped |
| | Validation rules | A pin with no net shows `board.noneConnected`, not an empty cell. Level shown as text `HIGH`/`LOW` plus a filled or hollow dot (colour is never the only cue) |
| | Error conditions | Board id not in the document: empty model and a message row |
| | Edge cases | Two boards in one project: the view has a select; first board by default. Pins shared in `internal-short` groups show the same net. Variant pins (Pico W LED on a radio pin 64) appear only when the variant is selected |
| | Permissions | Read only |
| | Performance | Memoised per document revision; live column updates only changed rows (selector stability, FA-04) |
| | Migration | None. A project without a `board` view gets one from `ensureBoardView`, defined in `src/studio/views/board.ts` (same pattern as `ensureSchematicView`, T-B5-05); T-B5-16's `VIEW_DEFS` calls it |
| Verification | Unit tests | `board.test.ts`: `ensureBoardView` returns one `view.add` of kind `board` when absent and `[]` when present, and its op validates against the schema; Uno blink gives D13 with net and connected LED pin; Basys 3 gives ports with widths; unconnected pin text; two-board project. `PinMap.test.tsx`: roles are text, row is a button or has an accessible name, selecting calls `onSelectNet`, live dot has a text equivalent |
| | Integration tests | Selecting a pin row sets the same selection the breadboard overlay reads |
| | Playwright | T-B5-21a or T-B5-21b / T-B5-11 |
| | Acceptance | Given the Uno blink project running, When I open Board, Then D13 shows `HIGH` and `LOW` alternately with its dot, and lists `R1.1` as connected |
| | Observability | None |
| | Release blockers | Any information shown by colour only |
| Delivery | Definition of done | Tests pass; PinMap has no canvas dependency |
| | Verify commands | `TL`; `V src/studio src/components/studio` |
| | Docs | `docs/STUDIO.md` (T-B5-23) |
| | Rollback | Revert; view not yet registered |
| | Later tasks need | `buildPinMap`, `PinMap`, `ensureBoardView` (T-B5-16, T-B5-21a) |

---

### T-B5-09. Author checks on your own project

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-09, STUDIO (F-221 via R-067), B5 |
| | Priority, status | P2, not started |
| | Dependencies | T-B2-07 (`test.set`, `test.remove` ops), T-B2-14 (project shape), T-B5-22 (keys) |
| Intent | Problem | Lessons have checks. A person's own project has none, so "it works" is a feeling |
| | Target user | Amar, friends making challenges for each other |
| | User story | As a builder I add "pin 13 is HIGH at 1000 ms" and "serial contains ready", press Run checks, and see pass or fail on each |
| | Expected behaviour | A Checks panel lists the test case's checks with a pass, fail or not-run state, lets me add, edit and delete checks of nine kinds, and runs them on the project's firmware in a worker. Results stay in memory; the checks themselves are saved in `tests[]` |
| | Success metric | A check added in the panel is evaluated by the same evaluator lessons use; five fixture checks give the expected verdicts on the blink starter |
| Implementation | Existing files | `src/lib/interp/checks.ts:122` (`evaluateCheck`; the `switch` on `check.kind` covers ten kinds), `:169` (`evaluateChecks`), `:15` (`CheckContext`), `src/lib/interp/check-job.ts` (`CheckJob`, `runChecks`, `boardNets`), `src/lib/interp/check-client.ts:26` (`startChecks` returns `{result, cancel}`), `src/lib/interp/headless.ts:21` (`HeadlessOptions`), `src/content/schema.ts` (`Check` union, line 370), project `TestCase` and `Check` (`project.schema.json`) |
| | New files | `src/studio/checks.ts` (pure, imports `core`, `project`, `parts` only), `src/components/studio/checkJob.ts` (UI wiring: the only file that imports `@/lib/interp` and `@/content`, because `studio` may not import `lib/interp`, SYSTEM 5.3), `src/components/studio/ChecksEditor.tsx`; tests |
| | Edited files | `src/lib/interp/checks.ts` (add `evaluateProjectCheck`). Four source files in all |
| | Signatures | `// checks.ts (studio, pure)` `export const AUTHOR_CHECK_KINDS = ['runs','serial','pin-level','pin-toggles','pwm','tone','servo','responds','code'] as const;` `export type AuthorCheckKind = typeof AUTHOR_CHECK_KINDS[number];` `export const DEFAULT_TEST_ID = 'my-checks';` `export interface BoardPins { id: string; boardRef?: string; resolve(pin: string): number \| undefined; names: string[]; defaultPin: string }` (`id` is the interpreter board id; `boardRef` is the document board id `brd_*`, set when the project has more than one board; `names` are the silkscreen names the picker offers; `defaultPin` is the first `leds[].pin` of the profile written as its name, else the first digital pin. Built by `boardPinsFor(state, boardId)` in `src/components/studio/checkJob.ts` from `getProfile` and `resolvePin` (`profiles.ts:255`, `:282`). `studio` may use the type but never builds it, so it imports nothing from `lib/interp`; the UI wiring passes the value in.) `export function newCheck(kind: AuthorCheckKind, id: string, board: BoardPins): ProjectCheck;` (defaults: `runs.minMs` 1000; `serial.match` "" with `minCount` 1 and `regex` false; `pin-level.pin` = `board.defaultPin`, `level` 1, `atMs` 1000; `pin-toggles.pin` = `board.defaultPin`, `periodMs` [100, 5000], `minCycles` 2; `pwm.duty` [0, 1] and `atMs` 1000; `tone.hz` [20, 20000] and `atMs` 1000; `servo.deg` [0, 180] and `atMs` 1000; `responds` = `{ after: { t: 500, input: 'button', value: 1 }, pin: board.defaultPin, withinMs: 100, mode: 'out', v: [0, 1] }`, copying the lesson fixture at `src/content/boards/uno-r3.ts:312` (the `input` id is a placeholder the editor replaces with a pick from the document's `inputs[]`; the schema `PinMode` enum is `out, in, pullup, pwm, analog, tone, servo, pulse`, so `mode` is `'out'`, not `'digital'`); `code.must` [], `mustNot` []; every kind also gets `visibility` `visible` and a generated English `label`. The schema requires `after`, `pin`, `withinMs`, `mode` and `v` for `responds`, and `pin` plus `atMs` for the timed kinds, so a default that omits one fails V2) `export interface CheckIssue { field: string; key: string; args?: Record<string, string \| number> }` `export function validateCheck(c: ProjectCheck, board: BoardPins): CheckIssue[];` (`BoardPins` as defined above) (pin must resolve; ranges ordered; regex compiles and is at most 200 chars; `atMs` within `runMs`) `export function summarise(c: ProjectCheck): { kind: AuthorCheckKind; fields: Record<string, string \| number> };` `export function setCheckOps(state: ProjectState, check: ProjectCheck, testId?: string): Op[];` (creates the default test case with `test.set` when absent; replaces the check by id otherwise; at most 200 checks, 64 tests) `export function removeCheckOps(state: ProjectState, checkId: string, testId?: string): Op[];` (`TestCase.checks` has `minItems 1`: when the check is the only one in its test the result is `test.remove {id}`, never a `test.set` with an empty list; otherwise `test.set` with the check taken out) `// src/components/studio/checkJob.ts` `export function boardPinsFor(state: ProjectState, boardId: string): BoardPins;` `export function checkJobFor(state: ProjectState, testId: string, boardId: string): CheckJob \| { error: 'no-source' \| 'no-board' \| 'unsupported-language' };` (entry source text, board and variant, language mapped with `INTERP_LANGUAGE`, world from `test.script` mapped one to one, `runMs`, `nets` from `boardNets`). Real import paths (VERIFIED): `import { INTERP_LANGUAGE, boardNets, getProfile, resolvePin, type CheckJob } from '@/lib/interp'` (`INTERP_LANGUAGE` is defined at `src/lib/interp/headless.ts:14` and re-exported at `index.ts:20`; `boardNets` at `check-job.ts:38`, re-exported at `index.ts:24`; `src/lib/boardlab/engine.ts` only imports `INTERP_LANGUAGE` from there); `boardNets` takes `Pick<BoardContent, 'id' \| 'pinout'>`, read from `src/content/boards/<id>.ts` through `@/content` `// interp/checks.ts addition` `export type EvaluableCheck = Omit<Check, 'label'> & { label?: unknown } \| { kind: 'node-voltage' \| 'supply-current' };` `export function evaluateProjectCheck(check: EvaluableCheck, trace: RunTrace, ctx: CheckContext): CheckResult;` (analog kinds return `{ ok: false, detail: 'needs-analog' }`; others call `evaluateCheck`) `// ChecksEditor.tsx` (`BoardPins` imported from `src/studio/checks.ts`) `export function ChecksEditor(props: { checks: ProjectCheck[]; results: Map<string, CheckResult>; running: boolean; board: BoardPins; onChange(op: Op[]): void; onRun(): void }): JSX.Element;` |
| | Data model | `ProjectCheck` = schema `Check` with `id` (`LocalId`), `label` (`Text`; plain string allowed), `visibility` (`visible`/`hidden`), plus kind fields. The label is generated in English from the fields at creation (for example "pin 13 is HIGH at 1000 ms") and edited freely; the panel shows a localised summary built from `summarise` and the `checks.kind.*` keys, falling back to the stored label for custom text |
| | Input and output | Run: `startChecks(job)` in the panel's host; the result `{trace, results}` maps check ids to verdicts in a local component state, never written to the document |
| | Algorithms | None beyond mapping. Evaluation order is the list order |
| | State transitions | Panel: `idle` then `running` (cancellable, `startChecks().cancel()`) then `done`. Editing a check marks its verdict `not run` |
| | Validation rules | Above. Hidden checks show a one-line note (`checks.hiddenNote`) the first time one is set |
| | Error conditions | `no-source` (project has no firmware for the board; text `checks.noSource`), `unsupported-language` (Verilog board with a pin-based check: allowed only `runs`, `code`, `serial`; text `checks.unsupportedLanguage`). Run budget: `CHECK_BUDGET_MS` 20,000 ms (`check-job.ts`); on limit the panel shows `checks.limit` |
| | Edge cases | A check naming a pin the board lacks is flagged inline and still saved. Deleting a part a check names: handled by the delete tool (STUDIO 6.4 preview card); this task only supplies `removeCheckOps` for it. A project with several boards: `pin` uses the `board` field (schema `pin-level.board`); `newCheck` sets it when there is more than one board |
| | Permissions | Local. In a room only the host edits tests (B7) |
| | Performance | Run is off the main thread (worker). Panel renders 200 checks without virtualisation under 16 ms (ESTIMATED) |
| | Migration | None |
| Verification | Unit tests | `checks.test.ts`: `newCheck` defaults for all 9 kinds validate against `$defs.Check` in `project.schema.json` (not only a type check; `responds` included); `validateCheck` cases (bad pin, reversed range, bad regex, `atMs` over `runMs`); `setCheckOps` creates `my-checks` once and replaces by id; limits; `removeCheckOps` on a test with two checks emits `test.set` with one, and on a test with one check emits `test.remove` (the result applies with no V2 error). `checkJob.test.ts` (in `src/components/studio`): `checkJobFor` on the Uno blink starter, the three error values, and `boardPinsFor` resolves `D13` to 13. `interp/checks.test.ts` addition: `evaluateProjectCheck` agrees with `evaluateCheck` on every existing kind (reuse the fixtures of the existing `src/lib/interp/checks.test.ts`, VERIFIED to exist) and returns `needs-analog` for the two new kinds. `ChecksEditor.test.tsx`: add, edit, delete, run shows pass and fail, hidden note |
| | Integration tests | On the blink starter: `pin-toggles` D13 `[900, 1100]`, `serial` "ready" (fails, no such text), `runs` 3000 ms, `code` must include `digitalWrite`: verdicts pass, fail, pass, pass |
| | Playwright | T-B5-21a or T-B5-21b / T-B5-11 |
| | Fixtures | The blink starter from T-B5-01 or the Uno template |
| | Acceptance | Given the blink project, When I add "pin 13 toggles" and Run checks, Then the row shows Passed with detail `n/n`. Given I change the sketch to never write pin 13, Then the row shows Failed |
| | Observability | Result detail strings from the evaluator |
| | Release blockers | Anything described as secret for hidden checks; any check kind that is not evaluated and not marked so |
| Delivery | Definition of done | Evaluator parity test green; the two analog kinds not offered |
| | Verify commands | `TL`; `V src/studio src/lib/interp src/components/studio` |
| | Docs | `docs/STUDIO.md` (T-B5-23) |
| | Rollback | Revert; `tests[]` already written stays valid |
| | Later tasks need | `setCheckOps`, `checkJobFor`, `boardPinsFor`, `ChecksEditor`. B10 adds fault-aware tests; B8 adds the analog kinds to `AUTHOR_CHECK_KINDS` |

---

### T-B5-17. Align, distribute and group commands in the editor

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-17, STUDIO commands, B5 |
| | Priority, status | P2, not started |
| | Dependencies | T-B5-07, T-B5-22; T-B4-02 (`commands.ts`), T-B4-19 (`keymap.ts`), T-B4-08 (`Inspector.tsx`). Canonical keymap: `03_PRODUCT/STUDIO_EDITOR.md` 6.11 (VERIFIED, line 663) |
| Intent | Problem | The tools of T-B5-07 are pure. Nobody can reach them |
| | Target user | Amar, friends; keyboard users (DS-28: every op the pointer can do has a list or field path) |
| | User story | As a builder I select parts and press Align, or Ctrl+G, or use the buttons in the Inspector |
| | Expected behaviour | Commands `align.left` ... `align.distributeV`, `group.make`, `group.remove` are registered with shortcuts. The Inspector shows an Align row and a Group button when two or more items are selected. Each runs one batch. Failures show the `align.*` message in the status line and the live region |
| | Success metric | Each command works from keyboard and button; announcements fire once |
| Implementation | Existing files | PLANNED: `src/studio/commands.ts` (registry, T-B4-02), `src/studio/commands/keymap.ts` (T-B4-19), `src/components/studio/Inspector.tsx` (T-B4-08) |
| | New files | None |
| | Edited files | The three above, plus the 6.11 table in `03_PRODUCT/STUDIO_EDITOR.md` (a doc, 4 files in all). The doc rows go in this commit so the keymap test against 6.11 passes at commit time; T-B5-23 only cites them |
| | Signatures | Commands follow the registry's own type. Ids and keys. STUDIO 6.11 is the single keymap (VERIFIED) and uses Ctrl/Cmd, so every chord is Ctrl/Cmd-agnostic (Meta on Mac, Ctrl elsewhere; letters matched on `event.code`). 6.11 already has `Ctrl/Cmd+G` and `Ctrl/Cmd+Shift+G` (Group, ungroup), kept for `group.make` and `group.remove`. The first version used `Ctrl+Shift+L/R/T/B/E/M` for align; `Ctrl+Shift+T` reopens a tab and `Ctrl+Shift+R` hard-reloads in browsers, `Ctrl+Shift+B` toggles the bookmarks bar, and 6.11 reserves `Ctrl/Cmd+E` for Export, so those are dropped. New align chords, all Canvas scope: `align.left` `Alt+Shift+ArrowLeft`; `align.right` `Alt+Shift+ArrowRight`; `align.top` `Alt+Shift+ArrowUp`; `align.bottom` `Alt+Shift+ArrowDown`; `align.centerH` `Alt+Shift+C`; `align.centerV` `Alt+Shift+V`; distribute has no key, menu and Inspector only. None of these is bound in 6.11 today (VERIFIED by reading the table); `Shift+Arrows` (move ten steps) and held `Alt` (free placement) differ because the chord needs all of Alt, Shift and an arrow. This commit adds the six align rows to the 6.11 table with scope Canvas and the action text "Align left", "Align right", "Align top", "Align bottom", "Centre horizontally", "Centre vertically" |
| | Data model | None |
| | Algorithms | Command handler: take the selection from the session store, expand with `expandSelection`, get boxes from the engine, call the tool, commit the batch, announce through the live region (`a11y.groupMade`) |
| | Validation rules | Align needs two items; distribute three (`align.needThree`); group two (`align.groupNeedTwo`) |
| | Edge cases | Focus in the code editor: shortcuts do nothing (text scope). Selection contains a locked part: it is skipped, the rest move |
| | Others | Permissions, performance, migration: none |
| Verification | Unit tests | `commands.test.ts` additions: each command with a fake selection emits the expected ops; keymap has no duplicate chords (existing test pattern). `keymap.doc.test.ts`: parses the 6.11 table of `STUDIO_EDITOR.md` and asserts that every chord B5 registers appears there with the same action and scope, and that `Alt+Shift+ArrowLeft` does not also trigger the ten-step move of `Shift+Arrows` |
| | Integration tests | Inspector test: buttons appear at 2 selected, absent at 1 |
| | Playwright | T-B5-11 covers align and group once |
| | Acceptance | Given three selected parts, When I press the Align top button, Then they align and Ctrl+Z undoes it in one step |
| | Release blockers | A chord already bound in B4 or in 6.11; a chord the browser reserves |
| Delivery | Definition of done | No duplicate chords; messages localised |
| | Verify commands | `TL`; `V src/studio src/components/studio` |
| | Rollback | Revert |
| | Later tasks need | T-B5-13 restyles the Inspector row for touch; T-B5-21a edits `keymap.ts` and `commands.ts` after this task |

---

### T-B5-18. History panel and revision storage wiring

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-18, STUDIO (F-093, R-066), B5 |
| | Priority, status | P2, not started |
| | Dependencies | T-B5-08, T-B5-22; T-B3-02 (`revisions` store), T-B4-11 (autosave wiring). R-066 and 3.4 say named checkpoints are made on save to file and when a run starts; no other task wired either, so this task owns the two hooks and T-B5-21b calls them |
| Intent | Problem | The history core has no screen and no storage |
| | Target user | Amar, friends |
| | User story | As a builder I open History, name this version, pick two versions, read what differs, and restore one |
| | Expected behaviour | A panel with a list of versions (name, kind, time), a Name button, a Compare mode (pick two, shows the diff as text lists), and Restore with a confirmation that says restoring adds changes on top and can be undone. Auto checkpoints run on cadence; named ones on request, on save to file and on Run start |
| | Success metric | Restore of the first of three versions gives that version's hash; undo returns |
| Implementation | Existing files | PLANNED: repository link module (SYSTEM 5.2 "`repositoryLink.ts` (committed batch to `Repository.save`)", T-B4-11 / T-B3-04), `src/local/repository.ts` (`revisions` store), `src/studio/history/*` (T-B5-08) |
| | New files | `src/components/studio/HistoryPanel.tsx`; tests |
| | Edited files | The repository link module (adapter `RevisionPort` over the `revisions` store; triggers `shouldCheckpoint` after each save; exposes `nameVersion(label)`; adds `onRunStart(label: string)` and `onSaveToFile(label: string)`, each calling `makeCheckpoint({kind: 'named', label, author: <local actor id>, at})`; the callers pass `t('history.runLabel')` ("Run") and `t('history.fileLabel')` ("Saved file")) |
| | Signatures | `// HistoryPanel.tsx` `export function HistoryPanel(props: { checkpoints: readonly Checkpoint[]; onName(label: string): Promise<void>; onCompare(a: number, b: number): Promise<RevisionDiff \| 'mismatch'>; onRestore(revision: number): Promise<void>; busy: boolean; inRoom: boolean }): JSX.Element;` `// link` `export function createRevisionPort(repo: Repository): RevisionPort;` `export function onRunStart(label: string): Promise<Result<Checkpoint \| undefined, 'limit' \| 'store' \| 'bad_author'>>;` `export function onSaveToFile(label: string): Promise<Result<Checkpoint \| undefined, 'limit' \| 'store' \| 'bad_author'>>;` (`undefined` means skipped because nothing changed) |
| | Data model | As 3.4 |
| | Algorithms | Compare: load both snapshots, `verifySnapshot` each, `compareStates`, render lists with the `history.diff.*` keys. The diff renders item names as text, never as markup. Restore: `restoreOps` then commit each batch through the session as `author.kind "user"`; announce `a11y.restored` |
| | State transitions | List, compare-pick-first, compare-pick-second, diff shown; restore: confirm, working, done |
| | Validation rules | Label 1 to 80 characters (`history.labelRequired`, `history.labelTooLong`); the 257th named version is refused with `history.limit`. `onRunStart` and `onSaveToFile` skip making a version when the newest checkpoint has the same `stateHash` (a Run with no change would otherwise fill the 256 named slots), and a `limit` or `store` result never blocks the Run or the save: the hook returns the error and the caller shows `history.storeFailed` as a warning chip |
| | Error conditions | Store failure: visible message with the store reason and no header change. `mismatch`: show `history.mismatch`. In a room: Restore disabled with a reason |
| | Edge cases | No versions: `history.empty`. Quota exceeded when writing a snapshot: autosave stays first priority; the checkpoint is skipped with a warning chip |
| | Permissions | Local owner. Read-only project: Name and Restore disabled |
| | Performance | Checkpoint write is after the save, in the `ProjectWorker` side when it exists, never during a drag |
| | Migration | None |
| Verification | Unit tests | `HistoryPanel.test.tsx`: lists, naming, picking two, diff text, restore confirm text, disabled in room. Adapter test over `MemoryRepository`. Hook tests over `MemoryRepository` (acceptance): `onRunStart` after an edit adds a named checkpoint labelled "Run"; a second `onRunStart` with no edit adds none; `onSaveToFile` adds one labelled "Saved file"; with a failing port the hook returns the `store` error and writes no header entry; an author not in `actors` returns `bad_author` |
| | Integration tests | Make 3 checkpoints on a session with the memory repository, compare 1 and 3, restore 1, hashes equal |
| | Playwright | T-B5-11 |
| | Fixtures | Uno blink project and a variant with an extra resistor |
| | Acceptance | As T-B5-08 acceptance, through the screen |
| | Observability | Hash mismatch goes to the local log |
| | Release blockers | A checkpoint row with no bytes in the store |
| Delivery | Definition of done | Panel keyboard operable; texts localised |
| | Verify commands | `TL`; `V src/components/studio src/studio/history src/local` |
| | Rollback | Revert; checkpoints stay valid |
| | Later tasks need | `HistoryPanel`, `createRevisionPort`, `onRunStart`, `onSaveToFile` (T-B5-21b) |

---

### T-B5-19. Project menu, `.ino` dialog and import entry

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-19, STUDIO lifecycle (R-051), B5 |
| | Priority, status | P2, not started |
| | Dependencies | T-B5-10, T-B5-08 (`session.recordExport`), T-B5-22; T-B4-16 (`Home.tsx`) |
| Intent | Problem | The converter has no user path |
| | Target user | Amar, friends |
| | User story | As a builder I choose Import a sketch, see what changes, and create the project; I choose Export as .ino and receive the files |
| | Expected behaviour | `Home` offers "Import a sketch" (file picker and drop). `ProjectMenu` holds Save to file, Export as .ino, Wiring table (CSV), History. `LossReport` shows the loss list (grouped by severity, warnings first, line numbers as text) and, for import, the chosen board with a select to change it, then a Create button. Exports show their loss list before the download |
| | Success metric | Drop a `.ino` with an unsupported `#ifdef`: the dialog names the line; Create makes a project on the chosen board with the sketch as `main.ino` and no parts |
| Implementation | Existing files | PLANNED `src/components/studio/Home.tsx` (T-B4-16), `src/local/files.ts` (T-B3-05 download and upload fallback), `src/export/ino.ts` (T-B5-10). `check` at `src/lib/interp/run.ts:100` is the analyser (UI may import `@/lib/interp`) |
| | New files | `src/components/studio/ProjectMenu.tsx`, `src/components/studio/LossReport.tsx`, `src/components/studio/inoAnalyser.ts` (holds `analyserFor` and `inoErrorKey`; UI layer, so it may import `@/lib/interp`); tests |
| | Edited files | `src/components/studio/Home.tsx` (4 source files in all) |
| | Signatures | `export function LossReport(props: { loss: readonly LossItem[]; board?: { value: string; options: { id: string; label: string }[]; onChange(id: string): void }; onConfirm(): void; onCancel(): void; confirmLabel: string }): JSX.Element;` `export function ProjectMenu(props: { canExportIno: boolean; onSaveFile(): void; onExportIno(): void; onExportCsv(): void; onOpenHistory(): void }): JSX.Element;` `// inoAnalyser.ts` `export function analyserFor(): InoAnalyser;` (wraps `check({board, source})` and maps `Diagnostic` to `InoDiagnostic`) `export function inoErrorKey(code: typeof INO_IMPORT_ERROR_CODES[number] \| typeof INO_EXPORT_ERROR_CODES[number]): string;` (maps `too-many-files` to `ino.tooMany`, `too-big` to `ino.tooBig`, `not-text` to `ino.notText`, `no-entry` to `ino.noEntry`, `bad-path` to `ino.badPath`, `empty` to `ino.empty`, `no-arduino-board` and `no-entry-source` to `ino.exportBlocked`) |
| | Data model | None stored except the project created and the `exports[]` record on export (`{format: "arduino-sketch", at, appVersion, sha256, revision, loss}` where `sha256` is of the exported bytes and `loss` is `lossCodes(...)`). After a successful export the caller writes it with `session.recordExport(r)` (T-B5-08; the record has no op and sits outside the state hash) |
| | Algorithms | Import flow: read files with a size guard before decoding; `importIno`; show `LossReport`; on confirm create a blank project on the chosen board with the same function as New project, then `source.edit` or `source.add` ops to put the text in `main.ino`. Export flow: `exportIno`, show loss, then save files (single file as `.ino`, several as a folder through the File System Access API when present, else a `.zip` is not offered in B5: files download one by one with a note; the `.iynkz` zip writer is not reused here to avoid a second zip format) |
| | State transitions | `idle, reading, review, creating, done`; Cancel at review leaves nothing created |
| | Validation rules | Max 20 files, 262,144 characters each, shown from the error codes |
| | Error conditions | Each `InoImportError` and `InoExportError` code has a localised message through `inoErrorKey`, naming the file and limit where the key has a placeholder (`ino.tooBig`, `ino.notText`, `ino.tooMany`, `ino.badPath`). The review dialog shows `ino.firstOnly` whenever the loss list holds an analyser warning, because the analyser reports the first blocking construct only (T-B5-10). Cancel uses `ino.cancel` |
| | Edge cases | Importing while another project is open: asks nothing, creates a new project and opens it. Dropping a non-`.ino` file: `ino.notText` or the generic open-file path handles `.iynk` |
| | Permissions | None |
| | Performance | Analysis in a worker if the file is over 64 KB (the check is synchronous; wrap in `startChecks`-style worker only if measured over 100 ms; otherwise inline) |
| | Migration | None |
| Verification | Unit tests | `LossReport.test.tsx` (order, board select, line text, `ino.firstOnly` note shown with an analyser warning, Cancel label); `ProjectMenu.test.tsx`; `inoAnalyser.test.ts` (diagnostic mapping, and every code in `INO_IMPORT_ERROR_CODES` and `INO_EXPORT_ERROR_CODES` maps to a key that exists in `en/studio.json`); export flow test that `recordExport` is called once and the state hash is unchanged |
| | Integration tests | Import fixture from T-B5-10 through the component to project creation with a memory repository |
| | Playwright | T-B5-11 imports a fixture and exports the Uno starter |
| | Acceptance | Given `with-if.ino`, When I import, Then the dialog lists the `#ifdef` line; When I confirm, Then the project exists with that text |
| | Release blockers | Import that runs the code; silent truncation |
| Delivery | Definition of done | Both flows work with keyboard only |
| | Verify commands | `TL`; `V src/components/studio src/export` |
| | Rollback | Revert |
| | Later tasks need | `ProjectMenu`, `LossReport` (T-B5-21b). B20 reuses `LossReport` for every exporter |

---

### T-B5-16. View registry and view switcher

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-16, STUDIO views, B5 |
| | Priority, status | P1, not started |
| | Dependencies | T-B5-05, T-B5-06, T-B5-22; T-B4-03 (renderer, `draw-list.ts`), T-B4-01 (`ui.ts`) |
| Intent | Problem | B4 has one view hard-wired. The schematic and board views exist as models and cannot be shown |
| | Target user | Amar, friends |
| | User story | As a builder I click Breadboard, Schematic or Board and the same circuit appears in that form |
| | Expected behaviour | A tablist of views; the active view is a ui-store value, per viewer, remembered per project (localStorage with try/catch; the page renders correctly without it). The canvas draws the schematic scene through the same renderer, LOD and culling as the breadboard. The board view renders `PinMap` in place of the canvas |
| | Success metric | Switching views is under 100 ms at 100 parts; selection survives a switch (net and part ids are the same) |
| Implementation | Existing files | PLANNED: `src/studio/engine/draw-list.ts`, `types.ts` (T-B4-03), `src/studio/stores/ui.ts` (T-B4-01), `src/studio/views/breadboard.ts` (T-B4-10) |
| | New files | `src/studio/views/registry.ts`, `src/components/studio/ViewTabs.tsx`; tests |
| | Edited files | `src/studio/engine/draw-list.ts`, `src/studio/engine/types.ts` (only if the draw items lack a polyline or text primitive: read first; if they have them, leave the file alone), `src/studio/stores/ui.ts` (4 or 5 files) |
| | Signatures | `// registry.ts` `export type ViewKind = 'breadboard' \| 'schematic' \| 'board';` `export interface ViewDef { kind: ViewKind; labelKey: string; surface: 'canvas' \| 'dom'; ensure(state: ProjectState): Op[]; scene?(state: ProjectState, viewId: string, reg: PartRegistry): DrawList }` `export const VIEW_DEFS: readonly ViewDef[];` (three entries: `breadboard` with `ensure: () => []` because every project is created with `vw_bb`, STUDIO 4.2; `schematic` with `ensureSchematicView` from T-B5-05; `board` with `ensureBoardView` from T-B5-06, `views/board.ts`) `export function viewIdFor(state: ProjectState, kind: ViewKind): string \| undefined;` `// ViewTabs.tsx` `export function ViewTabs(props: { active: ViewKind; onChange(kind: ViewKind): void }): JSX.Element;` (a `role="tablist"` with `role="tab"` buttons, arrow keys, `aria-selected`, label `views.tablist`) `// ui.ts` `activeView: ViewKind; setActiveView(kind: ViewKind): void` |
| | Data model | `ui.activeView` only. No document change except `ensure(state)` ops when a view is first opened (3.3) |
| | Algorithms | `draw-list.ts` gains a branch per `ViewDef.scene`; schematic draw items: symbol `paths` as path items in ink strokes, pins as small circles at the pin hit radius rule (UX 8.x, 24 px hit), links as polylines, labels as text, `auto` marker as a small text mark. Level of detail uses the same thresholds file as B4 (35 and 120 px; one constants file) |
| | State transitions | Switching: flush pending drag intents, set the view, run `ensure` if needed, rebuild scene |
| | Validation rules | The tab for `mat` does not exist. If the document has two views of one kind, the first by order is used and a select appears only if a user added more (not offered in B5, so one) |
| | Error conditions | Scene build throws: the canvas shows an error row, the other views still work |
| | Edge cases | `localStorage` blocked: default view is breadboard. Touch pins in the schematic: wiring is disabled here; tapping a pin shows `views.schematicReadOnlyWire` |
| | Permissions | None |
| | Performance | Scene memoised by `(revision, viewId)`; LOD and culling unchanged. BUD-01 to BUD-03 are re-measured by T-B5-12 with the schematic active |
| | Migration | None |
| Verification | Unit tests | `registry.test.ts` (3 defs; `ensure` returns `view.add` when absent, `[]` when present, for the schematic and board defs through the real `ensureSchematicView` and `ensureBoardView`); `ViewTabs.test.tsx` (roles, arrow keys, `aria-selected`); `draw-list.test.ts` addition (schematic scene yields items with `ref.c` for hit testing; culling drops off-screen nodes) |
| | Integration tests | Switch breadboard to schematic to board on the Uno blink project and compare net sets across the two canvas views (the R-060 equality, once through the engine) |
| | Playwright | T-B5-21a |
| | Acceptance | Given the Uno blink project, When I click Schematic, Then I see the Uno, the resistor and the LED as symbols with labelled nets; When I click Board, Then I see the pin table |
| | Release blockers | A view that changes the netlist; a tab without a keyboard path |
| Delivery | Definition of done | Three views switch; no console errors |
| | Verify commands | `TL`; `V src/studio src/components/studio` |
| | Rollback | Revert; B4 behaviour returns |
| | Later tasks need | `VIEW_DEFS`, `ViewTabs` (T-B5-21a). B16 adds a mechanical lens to the same registry |

---

### T-B5-21a. Shell integration, part 1: view tabs, three views, pin map, view commands

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-21a, STUDIO shell, B5 |
| | Priority, status | P1, not started |
| | Dependencies | T-B5-16, T-B5-06, T-B5-17, T-B5-22 |
| Intent | Problem | The view registry, the schematic scene and the pin map are finished pieces. The editor cannot reach them |
| | Target user | Amar |
| | User story | As a builder I press 1, 2 or 3, or click a tab, and see the same circuit as breadboard, schematic or board table |
| | Expected behaviour | `StudioEntry` mounts `ViewTabs` above the canvas. The schematic draws through the renderer. The board view mounts `PinMap` in place of the canvas, wired to the selection store and the sim frames (`livePins`). Commands `view.breadboard`, `view.schematic`, `view.board` switch the view |
| | Success metric | Each of the three views opens; axe: zero serious and critical on each |
| Implementation | Existing files | PLANNED `src/components/studio/StudioEntry.tsx` (T-B4-01, T-B4-11), `src/studio/commands.ts`, `src/studio/commands/keymap.ts` (T-B4-19, edited by T-B5-17), `e2e/studio-a11y.spec.ts` (T-B4-20) |
| | New files | None |
| | Edited files | `src/components/studio/StudioEntry.tsx`, `src/studio/commands.ts`, `src/studio/commands/keymap.ts` (3 files; the a11y spec is a test) |
| | Signatures | `commands.ts`: `view.breadboard`, `view.schematic`, `view.board`. Keys `1`, `2`, `3`, Canvas scope, exactly as STUDIO 6.11 View row (VERIFIED, line 705: "1, 2, 3 | Breadboard, schematic, board view | Canvas"). They act only while the canvas or main window has focus and never in a text field or the code editor (`typingTarget`, WCAG 2.1.4). Command palette (`Ctrl/Cmd+K`) entries `views.cmd.breadboard`, `views.cmd.schematic`, `views.cmd.board` ("Breadboard view", "Schematic view", "Board view"), each showing its key. The first version proposed `Alt+1/2/3`; that is dropped, since 6.11 decides and `Alt+digit` also switches browser tabs on Linux and Windows |
| | Algorithms | Layout regions per `UX_DESIGN_SYSTEM.md` 5.7, desktop layout only (phone placement is T-B5-13). The active view comes from `ui.activeView` (T-B5-16). `PinMap` selection calls the same selection store as the canvas. Announce `a11y.viewAnnounce` on switch |
| | State transitions | Switching: T-B5-16's rules. Panel open or closed lives in the ui store (T-B4-01) |
| | Validation rules | Focus is never hidden under a toolbar (2.4.11) at 1440, 768 and 320 px widths: tab through the new controls |
| | Error conditions | A view that throws shows the `views.sceneError` row; the other views still work |
| | Edge cases | Read-only recovery open: views switch, nothing else changes |
| | Permissions, performance | None; the board view and `PinMap` mount lazily (dynamic import inside the client entry) so first-load JS does not grow (BUD-05) |
| | Migration | None |
| Verification | Unit tests | `StudioEntry` test: tabs and regions render, `view.*` commands registered. Keymap test: `1`, `2`, `3` switch the view with the canvas focused and do nothing when focus is in a text field or the code editor; `keymap.doc.test.ts` (T-B5-17) still passes |
| | Integration tests | None in jsdom; see Playwright |
| | Playwright | Extend `e2e/studio-a11y.spec.ts`: `AxeBuilder` on the breadboard, schematic and board views, expect no violations of impact serious or critical; keyboard: reach every view tab and the pin map rows with Tab and arrows; press `1`, `2`, `3`; tab through at 1440, 768 and 320 |
| | Fixtures | Uno blink starter |
| | Acceptance | Given the Uno blink project, When I run axe on each view, Then 0 serious or critical. Given only a keyboard, When I press `3` and select D13's row, Then the selected net is announced in the live region |
| | Observability | Console errors fail the spec (existing `watchErrors` pattern in `e2e/dock-shared.ts`, VERIFIED) |
| | Release blockers | Any serious or critical axe finding; first-load JS growth over 10 percent (BUD-05) |
| Delivery | Definition of done | Spec green for the three views |
| | Verify commands | `TL`; `V src/components/studio src/studio`; `E e2e/studio-a11y.spec.ts` |
| | Rollback | Revert; views unmounted |
| | Later tasks need | `StudioEntry` regions for T-B5-21b |

---

### T-B5-21b. Shell integration, part 2: history, checks, project menu, loss dialog, run and save hooks

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-21b, STUDIO shell, B5 |
| | Priority, status | P1, not started |
| | Dependencies | T-B5-21a (same two files, so it runs in the next group), T-B5-09, T-B5-18, T-B5-19, T-B5-10 |
| Intent | Problem | History, checks, the project menu and the `.ino` dialog are finished and unreachable. R-066 needs named versions when a run starts and when a file is saved, and nothing calls those hooks yet |
| | Target user | Amar |
| | User story | As a builder I open History and Checks from the editor, import and export a sketch, and Run and Save quietly leave a named version behind |
| | Expected behaviour | `HistoryPanel` in the Project area, `ChecksEditor` in the Run area, `ProjectMenu` in the toolbar, `LossReport` as a dialog. Rail tabs: Inspector, Problems, Models, History, Checks (labels `rail.history`, `rail.checks`). The Run command handler calls `onRunStart(t('history.runLabel'))` before it starts the run. `ProjectMenu` `onSaveFile` calls `onSaveToFile(t('history.fileLabel'))` before it writes the file. Both ignore a `limit` or `store` result apart from a warning chip: Run and Save are never blocked by history. The ChecksEditor run path uses `checkJobFor` and `boardPinsFor` from `checkJob.ts` (T-B5-09). Commands: `history.open`, `history.name`, `checks.open`, `checks.run`, `project.exportIno`, `project.importIno` |
| | Success metric | Every panel and dialog opens; Run then History shows a "Run" version; Save to file shows a "Saved file" version; axe: zero serious and critical on each surface |
| Implementation | Existing files | `src/components/studio/StudioEntry.tsx`, `src/studio/commands.ts` (both edited by T-B5-21a), `e2e/studio-a11y.spec.ts` |
| | New files | None |
| | Edited files | `src/components/studio/StudioEntry.tsx`, `src/studio/commands.ts` (2 files; the a11y spec is a test) |
| | Signatures | Command ids as above. Palette entries use existing keys: `history.title`, `history.nameThis`, `checks.title`, `checks.run`, `ino.import`, `ino.export` |
| | Algorithms | Run handler order: `onRunStart` (skips if the newest checkpoint has the same hash), then start. Save handler order: `onSaveToFile`, then the file write. Wiring modules join `DocStore`, repository and sim frames as SYSTEM 5.2 says. The loss dialog calls `session.recordExport` after a successful export (via T-B5-19's flow) |
| | State transitions | Panel open or closed lives in the ui store (T-B4-01) |
| | Validation rules | Focus is never hidden under a toolbar (2.4.11) at 1440, 768 and 320 px: tab through the new controls |
| | Error conditions | A panel that throws shows an error boundary row; the editor keeps working |
| | Edge cases | Project opened read-only (recovery open): History restore, Checks edit, and Import are disabled |
| | Permissions, performance | None; panels mount lazily (dynamic import inside the client entry) so first-load JS does not grow (BUD-05) |
| | Migration | None |
| Verification | Unit tests | `StudioEntry` test: the new regions render; commands registered; Run command calls `onRunStart` once before the run starts (fake hook, call order asserted); `onSaveFile` calls `onSaveToFile` once |
| | Integration tests | With `MemoryRepository`: Run, edit, Run again gives two "Run" versions; Run twice with no edit gives one |
| | Playwright | Extend `e2e/studio-a11y.spec.ts`: `AxeBuilder` on History, Checks, the project menu and the loss dialog (serious and critical: none); keyboard: reach the checks list, the history list and the menu with Tab and arrows; tab through at 1440, 768 and 320 |
| | Fixtures | Uno blink starter |
| | Acceptance | Given the Uno blink project, When I press Run and open History, Then a version labelled "Run" is listed. Given only a keyboard, When I open the project menu and choose Export as .ino, Then the loss dialog opens and Escape closes it with focus back on the menu |
| | Observability | Console errors fail the spec |
| | Release blockers | Any serious or critical axe finding; Run blocked by a history failure; first-load JS growth over 10 percent (BUD-05) |
| Delivery | Definition of done | Spec green for every B5 surface |
| | Verify commands | `TL`; `V src/components/studio src/studio`; `E e2e/studio-a11y.spec.ts` |
| | Rollback | Revert; panels unmounted |
| | Later tasks need | Panel placement API for T-B5-13 |

---

### T-B5-11. Boards spec: add each board, run its starter

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-11, QA, B5 |
| | Priority, status | P1, not started |
| | Dependencies | T-B5-01 to T-B5-04, T-B5-21a, T-B5-21b, T-B5-17, T-B5-18, T-B5-19, T-B5-09 |
| Intent | Problem | The exit gate says "e2e studio-boards passes" |
| | Expected behaviour | One spec: for each of the 12 boards create a project, confirm the board art and the models panel, Run the starter, and see the language-specific proof (LED part lit or serial text or a Python run or a Verilog port change). It also exercises one pass through each B5 feature on the Uno: schematic view equality, board view row, align and group, name and restore a version, Run and see a "Run" version in History, add and run a check, import a fixture and export |
| | Success metric | Spec green; run time under 8 minutes on a laptop (ESTIMATED) |
| Implementation | Existing files | `playwright.config.ts` (projects, `E2E_PORT`), `e2e/dock-shared.ts` (helpers pattern), PLANNED `e2e/studio-m1.spec.ts` (T-B4-22) |
| | New files | `e2e/studio-boards.spec.ts` (test file; no source file changes) |
| | Algorithms | `test.describe.parallel` is avoided on the production build; boards run as a table-driven loop, each in its own page. Selectors by role and the `en/studio.json` strings imported as in `e2e/dock.phone.spec.ts:2` (VERIFIED pattern) |
| | Verification table | LED boards: LED part has the lit state after 2 s virtual time. Python boards: run status text shows the Python runtime and the LED toggles. FPGA: the `led[0]` row in the board view toggles. Models panel text contains the board's first `not_modelled` string (read from the descriptor JSON) |
| | Error conditions | Console errors, page errors and failed requests other than allowed fonts fail the test |
| | Edge cases | Variants: the spec also opens Pico W and ESP32-S3 v1.0 and checks the LED pin changes |
| Verification | Unit tests | `src/components/studio/boards.test.ts` already owns consistency (T-B5-15); this task adds nothing there |
| | Playwright | `E e2e/studio-boards.spec.ts` |
| | Acceptance | Given a fresh build, When the spec runs, Then 12 board cases and the feature walk pass |
| | Release blockers | Flaky waits: the spec waits on virtual time and DOM state, never on `waitForTimeout` (R-002) |
| Delivery | Definition of done | Green three runs in a row (`--repeat-each=3`) |
| | Verify commands | `TL`; `E e2e/studio-boards.spec.ts` |
| | Rollback | Delete the spec |
| | Later tasks need | The table-driven board loop; B12 extends it to 71 lessons |

---

### T-B5-23. Documentation: `docs/BOARDS.md`, `docs/STUDIO.md`, `docs/device-results.md`

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-23, DOCS, B5 |
| | Priority, status, dependencies | P2, not started, G8 (alone, last). Depends on T-B5-04, 05, 06, 07, 08, 09, 10, 12, 16, 17, 18, 19, 20 (if done), 21a, 21b, 13 (if kept), 13b (if kept), 14 (if kept). The doc describes views, groups and align, history, checks, `.ino`, phone and accessibility, so it is written after they exist. T-B5-13, 13b and 14 do not edit `docs/STUDIO.md`; they leave their facts (breakpoints used, what is emulation only, failing axe rule ids, what is UNKNOWN) in their commit messages and this task collects them |
| Intent | Problem | The phase card promises `docs/BOARDS.md` with, per board, what the interpreter does not cover (R-072) |
| | Expected behaviour | `docs/BOARDS.md`: a table of 12 boards (id, MCU, language, variants, starter) and per board the plain-words list from the descriptor's `not_modelled` and `known_gaps`. `docs/STUDIO.md` (created in B4) gains sections: views and the one netlist, groups and align, History, author checks, `.ino` import and export with loss codes, phone layout, the board binding contract. `docs/device-results.md` (empty table from B4) gets a header note that every number so far is desktop only |
| Implementation | Existing files | `docs/ARCHITECTURE.md`, `docs/SPEC.md` exist (VERIFIED, `ls docs`). PLANNED `docs/STUDIO.md`, `docs/device-results.md` (T-B4 documentation row) |
| | New files | `docs/BOARDS.md`; test `src/parts/boards-doc.test.ts` |
| | Edited files | `docs/STUDIO.md`, `docs/device-results.md` (3 in all) |
| | Algorithms | The test reads each descriptor's `not_modelled[].en` and asserts the exact text appears in `docs/BOARDS.md`, so the doc cannot drift |
| | Style | Short sentences, tables, no em dashes, no "validated" |
| Verification | Unit tests | `boards-doc.test.ts` |
| | Acceptance | Given a changed `not_modelled` line, When the test runs, Then it fails until the doc matches |
| Delivery | Definition of done | Test green; `node scripts/copy-check.mjs` exits 0 (required: it exists by T-B1-20, which is before B5) |
| | Verify commands | `TL`; `V src/parts`; `node scripts/copy-check.mjs` |
| | Rollback | Revert |

---

### T-B5-13. Phone layout: layout hook, shell tabs, palette and inspector sheets (LATER class, cut after T-B5-14 and T-B5-13b)

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-13, STUDIO (F-178, R-071, DS-69 to DS-80), B5 |
| | Priority, status | P3, not started |
| | Dependencies | T-B5-21b (final shell), T-B5-22 |
| Intent | Problem | The editor is built for a desktop. Phones are many people's only device (D-011) |
| | Target user | A friend with only a phone |
| | User story | As a friend I open a project on my phone, look at the circuit, run it, change a value, and edit code |
| | Expected behaviour | Under 40 rem (DS-69): four tabs at the bottom (Canvas, Code, Run, Project) with 44 px items; one pane at a time. Palette and Inspector are bottom sheets at most 85 dvh that return focus to the opener (DS-70); the PinPicker sheet and the light LOD preset are T-B5-13b. No horizontal page scroll at 320 px (DS-71). `dvh` and `svh`, never `vh`; safe-area insets (DS-72, DS-73). 44 px targets on a coarse pointer (DS-74). Tooltip content reachable by tap (DS-76). Landscape phone uses the tablet layout (DS-77). Heavy editing is not a goal |
| | Success metric | Pixel 7 spec: no horizontal scroll at 360 and 320 px; a part moved, a value changed and code edited with touch events; targets at least 44 px |
| Implementation | Existing files | `playwright.config.ts:25` (project `phone`, `testMatch *.phone.spec.ts`), `e2e/dock.phone.spec.ts` (pattern), `src/app/globals.css` breakpoints (40, 48, 64, 105 rem per UX 5.7); the `Sheet` component named in DS-70 is `src/components/ui/Sheet.tsx` (VERIFIED: `side="bottom"` gives `max-h-[85dvh]`, `height` is `auto` or `full`, `useModal` traps focus and returns it to the opener on close). T-B5-13 uses it unchanged |
| | New files | `src/studio/layout.ts` (exports `useLayoutMode`), `src/components/studio/studio.css`; tests `src/studio/layout.test.ts` and `e2e/studio.phone.spec.ts` |
| | Edited files | The five source files in all: `src/studio/layout.ts` (new), `src/components/studio/studio.css` (new), `src/components/studio/StudioEntry.tsx`, `src/components/studio/Palette.tsx`, `src/components/studio/Inspector.tsx`. Read `11-css.md` in `node_modules/next/dist/docs/01-app/01-getting-started/` first: a plain CSS file imported by a client component follows its global-versus-module rules, and the task states which it used |
| | Signatures | `// src/studio/layout.ts` `export type LayoutMode = 'phone' \| 'tablet' \| 'desktop' \| 'wide'; export function layoutModeFor(widthRem: number): LayoutMode; export function useLayoutMode(): LayoutMode;` `StudioEntry` chooses layout from `useLayoutMode()` using `matchMedia` on the rem breakpoints (SSR renders desktop; the client entry is client-only anyway, ADR-0401). Container queries inside panels where they fit |
| | Data model | None. Active phone tab is ui state, remembered per project in `localStorage` with try/catch |
| | Algorithms | Phone: toolbar fixed top, tab bar fixed bottom, both counted in `--sticky-top` and `--sticky-bottom`, applied as `scroll-padding-block` (DS-24). Gestures: one finger pans, two fingers pinch, double tap fits, long press opens the context menu which is also a kebab button (DS-75); `touch-action: none` on the canvas only; `overscroll-behavior: contain` on canvas and code editor (DS-79). The light LOD preset for a coarse pointer is T-B5-13b |
| | State transitions | Tab switch keeps the other panes mounted but hidden from the accessibility tree (`inert`) |
| | Validation rules | Every control 44 px on coarse; never under 24 px (2.5.8) |
| | Error conditions | None new |
| | Edge cases | On-screen keyboard resizes the visual viewport: focused field scrolls into view above it (UNKNOWN on iOS; the audit did not reproduce it, DS-72); rotation keeps the open project and tab |
| | Permissions | None |
| | Performance | No layout thrash on resize; BUD-03 recorded on Pixel 7 emulation, device numbers UNKNOWN until a real phone run (For Amar item 4) |
| | Migration | None |
| Verification | Unit tests | `src/studio/layout.test.ts`: `layoutModeFor` at each breakpoint and `useLayoutMode` with a `matchMedia` stub |
| | Integration tests | None |
| | Playwright | `e2e/studio.phone.spec.ts` (project `phone`, Pixel 7): open the Uno starter; `document.documentElement.scrollWidth <= innerWidth` at 360 and 320 (set viewport); the four tabs exist and each reveals its pane; open the palette sheet, search, place a part by tap (the PinPicker sheet is covered by T-B5-13b's spec); move it by touch drag; open the inspector sheet and change a value; edit code in the Code tab; Run and see serial in the Run tab; measure the bounding box of every visible button, tab and menu item: at least 44 px in the smaller dimension; axe on the phone layout |
| | Fixtures | Uno blink starter |
| | Acceptance | Given a 360 by 640 viewport, When I open a project, Then there is no horizontal page scroll, the canvas, code and serial panes are reachable as tabs, and the palette is a sheet (R-071) |
| | Release blockers | Horizontal page scroll; a target under 44 px on coarse |
| Delivery | Definition of done | Phone spec green; desktop `studio-a11y` still green |
| | Verify commands | `TL`; `E e2e/studio.phone.spec.ts`; `E e2e/studio-a11y.spec.ts` |
| | Docs | None here. The commit message states the breakpoints used and "tested on emulated Pixel 7 only"; T-B5-23 writes the `docs/STUDIO.md` phone section from it |
| | Rollback | Revert; desktop layout is the fallback |
| | Later tasks need | `useLayoutMode`, the sheet and tab pattern for B7 room UI and B10 diagnosis panel. Follow-up T-B5-13b |

---

### T-B5-13b. Phone layout, part 2: pin picker sheet and light LOD preset (LATER class)

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-13b, STUDIO (R-071, DS-70, DS-80), B5 |
| | Priority, status, dependencies | P3, not started, T-B5-13 (needs `useLayoutMode`) |
| Intent | Problem, story | T-B5-13 left two phone items: the PinPicker is not a sheet yet, and a low-memory phone draws with the desktop LOD thresholds. As a friend with a phone I pick a pin in a sheet and zoomed-out circuits stay smooth |
| | Expected behaviour | In `phone` mode PinPicker opens in `Sheet` (`side="bottom"`, 85 dvh, focus returns to the opener). On a coarse pointer with `deviceMemory` 4 or lower the LOD thresholds use the light preset named in DS-80 (HYPOTHESIS; BUD-03 is the check) |
| Implementation | Existing files | `src/components/studio/PinPicker.tsx` (T-B4-19), `src/studio/engine/constants.ts` (T-B4-03: `LOD_SMALL_PX = 35`, `LOD_LARGE_PX = 120`), `src/studio/engine/lod.ts` (`chooseLod`), `src/studio/layout.ts` (T-B5-13), `src/components/ui/Sheet.tsx` (VERIFIED) |
| | Edited files (5 at most) | `src/components/studio/PinPicker.tsx`, `src/studio/engine/constants.ts` (adds `LOD_LIGHT` thresholds and `lodPreset(env: { coarse: boolean; deviceMemory?: number }): 'normal' \| 'light'`), `src/studio/engine/lod.ts` (takes the preset), `src/components/studio/StudioEntry.tsx` (one call site), and `src/components/ui/Sheet.tsx` only if the sheet lacks a behaviour the picker needs (then say so in the commit). New test files `src/studio/engine/lod.test.ts` additions and `e2e/studio-sheets.phone.spec.ts` |
| | Algorithms | `lodPreset` is pure; the caller reads `matchMedia('(pointer: coarse)')` and `navigator.deviceMemory` (absent on Safari and Firefox, so the preset stays normal there) |
| Verification | Unit tests | `lodPreset` table: coarse and 4 GB gives light; coarse and 8 GB gives normal; fine pointer gives normal; `deviceMemory` undefined gives normal. `PinPicker` test: in `phone` mode it renders inside the sheet and Escape returns focus to the opener |
| | Playwright | `E e2e/studio-sheets.phone.spec.ts` (project `phone`): open PinPicker from a pin, choose a target, sheet closes, focus returns; axe on the open sheet: no serious or critical findings |
| | Acceptance | Given a 360 by 640 viewport, When I press W on a focused pin, Then the pin picker is a bottom sheet at most 85 dvh |
| | Release blockers | A sheet that traps focus without return |
| Delivery | Definition of done, verify | Specs green. `TL`; `V src/studio src/components/studio`; `E e2e/studio-sheets.phone.spec.ts`; `E e2e/studio-a11y.spec.ts` |
| | Docs, rollback | Docs: facts in the commit message for T-B5-23. Rollback: revert; the picker falls back to its desktop popover |

---

### T-B5-14. WCAG 2.2 AA pass for all views (LATER class, cut first)

| Block | Field | Content |
|---|---|---|
| Identity | ID, subsystem, phase | T-B5-14, STUDIO accessibility (F-177 rest, R-070, ACC-1 to ACC-3), B5 |
| | Priority, status | P3, not started |
| | Dependencies | T-B5-13 if kept; T-B5-21a and T-B5-21b. Does not depend on T-B5-13b (it runs in the same group); if 13b is kept its own spec runs axe on its sheet |
| Intent | Problem | T-B5-21a and T-B5-21b guarantee zero serious and critical axe findings. R-070 asks for more: contrast numbers, focus never hidden, a second cue for every colour state, reduced motion, forced colours |
| | Expected behaviour | The extended `e2e/studio-a11y.spec.ts` passes on every view, panel, sheet and dialog at 1440, 768 and 320 px, in light and dark themes. Cap per run: the task lists the failing axe rule ids (with selector and file) in its commit message and fixes at most 5 files. Every remaining finding goes in a named follow-up task `T-B5-14b`, listed in the same commit message by rule id, selector and file; the task never keeps working past 5 files |
| Implementation | Existing files | `e2e/studio-a11y.spec.ts` (T-B4-20, T-B5-21a, T-B5-21b), `src/app/globals.css` tokens (UX 5.8 `forced-colors` sketch, line 298), the studio components from T-B5-06, 16, 18, 19, 09 |
| | New files | None |
| | Edited files | Up to 5 under `src/components/studio/`, named by the failing assertions. List them in the commit message. Not `PinPicker.tsx`, `StudioEntry.tsx`, `lod.ts`, `constants.ts` or `Sheet.tsx` (T-B5-13b owns them in the same group G7). It does not edit `docs/STUDIO.md` (T-B5-23 owns it) |
| | Checks added to the spec | (1) Contrast: computed style of every text node at least 4.5:1 and of graphical outlines (pin dots, selected-net outline, diff markers) at least 3:1, in both themes, using axe `color-contrast` plus a small script for non-text contrast. (2) Colour is never the only cue: for pass and fail rows, HIGH and LOW dots, selected net, auto-placed marker, assert a text or shape difference exists. (3) Focus not obscured (2.4.11): tab through all controls at 320, 768, 1440 and assert each focused element's box is not covered by the sticky toolbar or tab bar. (4) Forced colours: Playwright `colorScheme` and `forcedColors: 'active'` context; selected states still visible (outline or glyph). (5) Reduced motion: `reducedMotion: 'reduce'` stops the flow dots and smooth zoom. (6) Keyboard walk for the new surfaces: switch views, select a pin row, name and compare a version, add and run a check, import a fixture, in total using only Tab, arrows, Enter, Esc. (7) Names: every tab, row action and dialog has an accessible name from the localised keys; `role="application"` canvas label names the active view (`a11y.viewAnnounce`) |
| | Error conditions | A screen-reader pass is not done by an agent; it is For Amar (section 6 item 3, Q-13) and is listed in the report as UNKNOWN |
| | Other fields | Data model, permissions, performance, migration: none |
| Verification | Playwright | `E e2e/studio-a11y.spec.ts` |
| | Acceptance | Given each B5 surface in both themes, When the spec runs, Then zero axe serious and critical, all seven added checks pass |
| | Release blockers | Any skipped check; a "fix" that disables a rule |
| Delivery | Definition of done | Spec green; findings list in the commit message |
| | Verify commands | `TL`; `E e2e/studio-a11y.spec.ts`; `E e2e/studio.phone.spec.ts` if T-B5-13 kept |
| | Docs | None here. The commit message lists what is automated and what is UNKNOWN; T-B5-23 writes the `docs/STUDIO.md` accessibility section from it |
| | Rollback | Revert |

## 6. For Amar (not build tasks)

| # | What | Why a person | When |
|---|---|---|---|
| 1 | Open one project on each of the 12 boards and run the starter | The exit gate (roadmap B5) says so; it checks that the boards feel right | At the phase stop |
| 2 | Compare three boards you own with the descriptor pin tables in `docs/BOARDS.md` (pin names, which pins are input only, where the LED is) | Descriptors come from lesson content and datasheet notes in the repo; only someone holding the board can see a silkscreen mismatch | At or after the stop |
| 3 | Run a screen reader (VoiceOver or NVDA) over place, wire, switch to Board, and History, and write down what fails | ACC-4 and Q-13: no screen reader has ever been tried (UNKNOWN); an agent cannot do it | Before claiming screen-reader support |
| 4 | Run the RS-01 harness and the phone walk on a real phone and a Chromebook and fill `docs/device-results.md` | Device numbers are UNKNOWN; emulation is not a phone (roadmap section 6 row 5) | Before claiming phone support |
| 5 | Decide the order of the 11 boards if you do not want the roadmap order | R-072 order is a PROPOSAL | Before G2 |
| 6 | Optionally drop public-domain Arduino example sketches into `08_RESEARCH_SPIKES/RS-B5-ino-coverage/corpus/` | The spike writes its own sketches and downloads nothing; a licence check on foreign code is a person's call | Before T-B5-20, optional |
| 7 | Confirm the 10 percent perf-regression rule and the WebKit pan-fit known miss (22 ms) | A threshold change is Amar's decision (roadmap 2.5) | At T-B5-12 |
| 8 | Check the translated strings in `de, es, fr, hi, zh` for the new screens | Parity tests see keys, not quality (ADR-0408 known limitation) | After the stop |
| 9 | Keep or cut T-B5-13, T-B5-13b and T-B5-14 | They are LATER class | Before G6 |
| 10 | Confirm that B5 ships no Inspect (Yosys netlist view) for Basys 3 and DE10-Lite, and that the roadmap row T-B5-04 reading "netlist inspect only" means "no synthesis in B5, Inspect in T-B9-09". If you wanted Inspect in B5, T-B9-09 moves forward | A scope decision departs from the roadmap row (section 0.3) | At the phase stop |

## 7. Risks and open questions for this phase

| # | Item | Label | Handling |
|---|---|---|---|
| 1 | B2 to B4 task files and code do not exist yet, so every PLANNED path is the roadmap's name, not a fact | UNKNOWN | First step of each task reads the real file; a different real name wins |
| 2 | Whether `ProjectSession` already has a checkpoint writer | UNKNOWN | T-B5-08 reads `src/project/session.ts` first; adds `recordCheckpoint` if absent, and always adds `recordExport` (no op exists for `exports[]`), as the only edits outside `studio` |
| 3 | Where B4 put `repositoryLink.ts` | UNKNOWN | The task finds it with `grep`; paths in this file are descriptions. The `Sheet` component is `src/components/ui/Sheet.tsx` (VERIFIED) |
| 4 | Whether the B2 converter can express all 11 `blink` circuits (Basys 3 and DE10-Lite use port maps) | UNKNOWN | Hand-written starter fallback is allowed (3.2) |
| 5 | The PRD says "a `checks` section"; the schema says `tests[]` | DOCUMENTED, resolved | Schema wins (3.5) |
| 6 | The roadmap says Verilog boards show "netlist inspect only"; Yosys Inspect is scheduled for B9 | DOCUMENTED | Read as "no synthesis in B5" (T-B5-04). Listed in section 0.3 and For Amar item 10. If Amar meant the Inspect view must exist in B5, T-B9-09 moves forward |
| 7 | Phone numbers are emulation only | UNKNOWN | Recorded as such; real devices are For Amar |
| 8 | The 70 percent `.ino` threshold in the spike is my number | HYPOTHESIS | The report shows raw counts so Amar can judge |
| 9 | PRD R-051 says an imported `.ino` creates a project "on the Uno"; PDM 12.2 says "board guess from includes and pin use" | DOCUMENTED, resolved by proposal | Default Uno; a guess only for clear Wi-Fi or Pico includes; always shown and changeable (T-B5-10, T-B5-19) |
| 10 | Total effort | ESTIMATED | Roadmap says 4 / 6 / 10 weeks for 14 tasks. This file has 25 tasks and one spike. The extra tasks are small (strings, docs, wiring, two shell halves, two phone halves), so I keep the range but flag it: if G2 and G3 slip, adverse is 11 weeks. Eight groups run in order, one more than the first draft |
| 11 | `Alt+Shift` is also the Windows keyboard-layout switch | HYPOTHESIS | The switch fires only when Alt and Shift are pressed and released with no other key; the align chords add an arrow or letter. A Windows machine check is For Amar if a chord misbehaves |

## 8. Task list in one table

| ID | Title | Group | Depends on | Files (source, not counting tests) |
|---|---|---|---|---|
| T-B5-15 | Board binding contract and descriptor builder | G1 | B4 | 5 |
| T-B5-22 | Studio strings, six languages | G1 | B4 | 1 set |
| T-B5-08 | History core, `recordCheckpoint`, `recordExport` | G1 | B4 | 4 |
| T-B5-10 | `.ino` core and loss report | G1 | B4 | 2 |
| T-B5-05 | Schematic model | G1 | B4 | 4 |
| T-B5-07 | Align, groups, paste | G1 | B4 | 3 |
| T-B5-12 | Performance budgets | G1 | B4, B1, B0 (T-B0-06) | 4 |
| T-B5-20 | Spike: `.ino` coverage | G1 | none | report only |
| T-B5-01 | Boards nano, uno-r4 | G2 | 15 | 5 |
| T-B5-06 | Board view and pin map | G2 | 15, 22 | 3 |
| T-B5-09 | Author checks | G2 | 22 | 4 |
| T-B5-17 | Align and group commands, keymap rows | G2 | 07, 22 | 3 (+ the 6.11 doc rows) |
| T-B5-18 | History panel, run and save hooks | G2 | 08, 22 | 2 |
| T-B5-19 | Project menu and `.ino` dialog | G2 | 10, 08, 22 | 4 |
| T-B5-02 | Boards esp32-devkitc, esp32-s3, nodemcu | G3 | 01 | 5 |
| T-B5-16 | View registry and switcher | G3 | 05, 06, 22 | 4 to 5 |
| T-B5-03 | Boards pico, micro:bit, nucleo | G4 | 02 | 5 |
| T-B5-21a | Shell: view tabs, three views, pin map, view commands | G4 | 16, 06, 17, 22 | 3 |
| T-B5-04 | Boards pi, basys3, de10-lite | G5 | 03 | 5 |
| T-B5-21b | Shell: history, checks, menu, loss dialog, run and save hooks | G5 | 21a, 09, 18, 19, 10 | 2 |
| T-B5-11 | Boards spec | G6 | 01 to 04, 21a, 21b, 17, 18, 19, 09 | 0 (test) |
| T-B5-13 | Phone layout (cuttable) | G6 | 21b, 22 | 5 |
| T-B5-13b | Phone sheets and light LOD (cuttable) | G7 | 13 | up to 5 |
| T-B5-14 | Accessibility pass (cuttable) | G7 | 13 (if kept), 21a, 21b | up to 5 |
| T-B5-23 | Documentation | G8 | 04 to 10, 12, 13 to 14 (if kept), 16 to 20, 21a, 21b | 3 |

## Review fixes (2026-10-27)

Twenty-three review issues. All are applied. Three are applied with a correction to the reviewer's text, because the repo or the schema says otherwise. Each row names the evidence.

| # | Issue | Result | Evidence |
|---|---|---|---|
| 1 | T-B5-08 `net.remove` | Applied. Order is `wire.remove, net.disconnect, net.delete, component.remove, board.remove`; sets group has `board.set`, `view.set`; a unit test checks every emitted `k` against the Op enum | VERIFIED: the Op enum in `project.schema.json` has `net.delete`, `net.disconnect`, `board.remove`, `board.set`, `view.set` and no `net.remove` |
| 2 | T-B5-09 `responds` defaults, empty test | Applied with one correction: `mode` is `'out'`, not `'digital'` (the schema `PinMode` enum is `out, in, pullup, pwm, analog, tone, servo, pulse`). Also added the `atMs` and `regex` defaults that other kinds require. Removing the last check emits `test.remove` | VERIFIED: `$defs.Check` required lists; `$defs.TestCase.checks` `minItems 1`; fixture `src/content/boards/uno-r3.ts:312` |
| 3 | `BoardPins` undefined | Applied. Defined in `src/studio/checks.ts` with an added `defaultPin` field (needed for the pin defaults of issue 2). Built in the new `src/components/studio/checkJob.ts`. Correction: `INTERP_LANGUAGE` is not in `boardlab/engine.ts`; it is defined at `src/lib/interp/headless.ts:14` and re-exported at `index.ts:20`; `boardNets` is at `check-job.ts:38`, `index.ts:24`. `engine.ts:7` only imports it | VERIFIED by grep |
| 4 | `guessBoard` order | Applied: ESP8266, then WiFiS3, then pico, then ESP32; four table tests incl. the substring case | |
| 5 | Round-trip metric | Applied: 7 Arduino-language starters plus a hand-written Pico fixture | VERIFIED: `profiles.ts:165` Pico is `['python', 'arduino']` |
| 6 | First-only diagnostics | Applied: stated in Algorithms and dialog copy; key `ino.firstOnly`; a real `check()` test on `with-if.ino` asserts exactly one warning | VERIFIED: `parser.ts:101` throws; `run.ts:185` sets one diagnostic |
| 7 | Integration test path | Decided: `src/components/studio/ino.integration.test.ts`. UNKNOWN text and old risk row 3 removed (rows renumbered) | |
| 8 | `exports[]` writer | Applied: `recordExport` in T-B5-08 (so `session.ts` is now always edited, file count 4), called by T-B5-19 and T-B5-21b; hash-unchanged test; T-B5-19 now depends on T-B5-08 | VERIFIED: `exports` has `maxItems 32`, no op |
| 9 | `Checkpoint.author` | Applied: `bad_author` error and test | Schema `Checkpoint.author` pattern `usr_...` |
| 10 | Run and save checkpoints | Applied: `onRunStart`, `onSaveToFile` in T-B5-18 with MemoryRepository tests; called from T-B5-21b. Added a skip when the hash is unchanged so Run does not fill the 256 named slots, and Run is never blocked by a history failure | |
| 11 | Shortcuts | Applied: `Alt+Shift+Arrow` and `Alt+Shift+C`/`V`, Ctrl/Cmd-agnostic, Canvas scope; Ctrl/Cmd+G and Shift+G kept. Deviation: the 6.11 rows are added by T-B5-17 (in the same commit as the keymap) and not by T-B5-23, because T-B5-23 runs in G8 and the keymap test against 6.11 would fail between G2 and G8. T-B5-17 now has 4 files (3 source plus the doc) | VERIFIED: 6.11 lines 663 to 740 |
| 12 | View keys | Applied: `1`, `2`, `3` in Canvas scope, palette entries, keymap test for text fields | VERIFIED: 6.11 View row |
| 13 | Split T-B5-21 | Applied as 21a (G4) and 21b (G5). 21a also edits `keymap.ts` to bind `1`, `2`, `3` (3 files). T-B5-11, 13, 14 now depend on 21b | |
| 14 | `ensureBoardView` | Applied in T-B5-06 and referenced by T-B5-16 `VIEW_DEFS` | |
| 15 | Perf job | Applied: Chromium throttle via CDP; WebKit 1x only; local verify by the two commands; workflow marked "not proven until Amar pushes"; T-B0-06 dependency. Correction: `scripts/ci-local.sh` has no `perf-editor` step (its interface is `--list`, `--only`, `--skip` over nine B0 steps), so the local proof is `node scripts/perf-budget.mjs --check` and `E e2e/studio-perf.spec.ts` | VERIFIED: B0 task T-B0-06 script interface; `.github/` absent |
| 16 | T-B5-13 files | Applied: `src/studio/layout.ts` new, five files listed, `Sheet.tsx` named (VERIFIED, `src/components/ui/Sheet.tsx`, already 85 dvh with focus return); PinPicker and LOD preset moved to new T-B5-13b | |
| 17 | T-B5-14 | Applied: docs edit removed; cap of 5 files with rule ids in the commit and a named T-B5-14b | |
| 18 | T-B5-23 | Applied: all dependencies, own last group. It is G8, not G7, because T-B5-14 needs T-B5-13 and T-B5-13b was added | |
| 19 | Power pin ids | Applied: `P` prefix rule; the golden test compares ids | |
| 20 | `boards.test.ts` location | Decided: `src/components/studio/boards.test.ts` (UI layer may import `lib/interp` and `parts`). Not `src/studio`, because the matrix forbids `studio` importing `lib/interp` and the test would break it if `architecture.test.ts` scans tests. Gate command is `V src/parts src/components/studio` | |
| 21 | `analyserFor` home, error keys | Applied: `src/components/studio/inoAnalyser.ts` (T-B5-19 has 4 source files); `inoErrorKey` and a test over code arrays exported by `ino.ts` | |
| 22 | Missing strings | Applied; all listed keys added. `common.cancel` does not exist (VERIFIED by grep of `en/common.json`), so `dialog.cancel` is added. The key-usage grep is in T-B5-22 Verify | |
| 23 | Inspect departure | Applied: row in 0.3, For Amar item 10, risk row, test asserts `pins.length === sum(fpga.ports[].width)`; 74 stays as a comment | |
