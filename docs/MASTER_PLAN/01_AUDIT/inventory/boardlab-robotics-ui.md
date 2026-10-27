# Board Lab and Robotics Lab UI (stores, pages, components, dock, code panel, checks UI)

**Paths:** src/lib/boardlab/**, src/lib/robotics/**, src/components/boardlab/**, src/components/robotics/**, src/components/dock/**, src/app/[lang]/boards/**, src/app/[lang]/robotics/**
**Entry points:** `LessonWorkspace` (src/components/boardlab/LessonWorkspace.tsx:60), `BoardWorkspace` (BoardWorkspace.tsx:~50, board overview), `BenchWorkspace` (src/components/robotics/BenchWorkspace.tsx:~170), `LabDock` (src/components/dock/LabDock.tsx:~100), `LabRoom` (dock/LabRoom.tsx:~70); server loaders `src/app/[lang]/boards/_lib/load.ts`, `src/lib/robotics/load.ts`
**LOC:** `find <scope dirs> \( -name '*.ts' -o -name '*.tsx' \) | xargs cat | wc -l` = 9761 (of which tests and fixtures ~1829; `src/lib/progress` is another 496, not counted). Per area: lib/boardlab 1921, lib/robotics 1429, components/boardlab 3176, components/robotics 1984, components/dock 656, app boards 356, app robotics 239.
**Owner today:** docs/ARCHITECTURE.md:122-123 lists `ui:boardlab` (boards/**, components/boardlab/**, `src/lib/board/**`) and `ui:robotics`. The path `src/lib/board/**` in that table does not exist; the code is in `src/lib/boardlab/` (VERIFIED, `ls`). `src/components/dock/**` and `src/lib/progress/**` belong to `shell-app` (ARCHITECTURE.md:115). DOCUMENTED.

## Purpose

Two learning labs. Board Lab: pick a board, open a lesson, edit Arduino C++/MicroPython/Verilog in CodeMirror, press Run, and see pin levels, serial output and completion checks drive an embedded isometric figure (an iframe page). Robotics Lab: pick a bench (a motor driver, sensor, etc.), follow ordered build steps that the figure confirms, trigger faults ("break it"), answer quizzes, and run small practice tasks in a textarea. The dock adds AI partner, rooms, Solana passport and hardware tabs to both. (VERIFIED by reading the files above.)

## Dependencies (imports in, imports out; third-party packages)

Imports out (VERIFIED, grep of `from "@/..."`):
- `@/lib/interp` (compile/createRun/startChecks/WorldBinding etc.): lib/boardlab/engine.ts:6-20, run.ts:9, lib/robotics/runner.ts:8.
- `@/components/figure` (`FigureFrame`, `FigureHandle`, `FigureEvent`): both workspaces.
- `@/content/*` (schema types, `ids.ts`, `index.generated`): load.ts files, catalog.ts, runner.ts:5.
- `@/lib/progress` (markDone, recordQuiz, useDone, useSaved, progressKey).
- `@/lib/sound`, `@/lib/settings`, `@/components/ui`, `@/components/shell/workspace`, `@/i18n/*`.
- Dock imports `@/components/ai`, `@/components/realtime`, `@/components/search`, `@/components/solana`, `@/components/hw`, `@/lib/realtime`, `@/lib/ai` (LabDock.tsx:6-18).
- Third party in scope: `@codemirror/{commands,lang-cpp,lang-python,language,legacy-modes,state,view}` and `@lezer/highlight` (CodeEditor.tsx:3-10), `next`, `react`, `react-dom`.

Imports in (who uses this): `src/lib/realtime/shared-actions.ts` imports the action types (type-only, shared-actions.ts:11-13) and lists which actions are shared per lab (lines 59, 68); `src/lib/ai/bench.ts:25 applyChange(lab, state, change)` and `src/lib/ai/run-tools.ts:64` read and change lab state; `LabDock` is used by the drone lab too (LabKind includes "drone", dock/types.ts:13). VERIFIED.

## Public interfaces (exported functions/types/components/messages, with path:line)

| Interface | Path:line | Notes |
|---|---|---|
| `LabStore<S,A>` {getState, subscribe, dispatch} | src/components/dock/types.ts:6 | The D14b contract. Defined in the dock, imported by both stores (the lib layer imports a type from a component folder). |
| `BoardLabState`, `BoardLabAction` (31 action types), `reducer`, `initialState`, `createBoardLabStore` | src/lib/boardlab/store.ts:36, 78, 207, 85, 331 | Pure reducer; `onAction(listener)` hook at :323. |
| `figureState`, `figurePatch`, `figureSrc` | store.ts:~383, ~405, ~371 | Store state to figure `set` message. |
| `LessonRunner` (attach, frame, check, checkSource, figureReady), `Scheduler`, `browserScheduler` | src/lib/boardlab/run.ts:~25-100 | All side effects of a run. |
| `compile`, `Session`, `canRun`, `RunError`, `PinSample` | src/lib/boardlab/engine.ts | Adapter over interp `createRun`. |
| `BenchState`, `BenchAction` (22 types), `BenchEffect` (4 kinds), `reduceBench`, `createBenchStore`, `BenchStore.connect` | src/lib/robotics/store.ts:41, 52, 87, 135(approx), end | Reducer returns `[state, effects]`. |
| `interpRunner`, `TaskRunner`, `allPass` | src/lib/robotics/runner.ts | Task check path via `startChecks`. |
| `advanceSteps`, `canStart`, `activeFaults`, `faultPresent` | src/lib/robotics/steps.ts | Step and fault logic, pure. |
| `LabDockProps`, `LabKind = "board"|"robotics"|"drone"` | dock/types.ts:12-22 | Dock takes (lab, itemId, store, figure). |
| `LabRoom`, `useRegisterLabStore` | dock/LabRoom.tsx | Wraps `store.dispatch` of the page store (see Technical debt). |
| Figure messages sent by these labs | `figure.send("set", {state})`, `"press"`, `"act"`, `"flash"`, `"xr"`, `"view"` | BoardWorkspace/LessonWorkspace/BenchWorkspace.tsx (useEffects) |
| localStorage keys | `iynk:v1` (progress/settings), `iynk:boardlab:values` (chip values) | see next section |

## State ownership and persistence (stores, localStorage keys, server state, DB tables)

**How UI state is owned (VERIFIED).** Each lab page makes one store with `useState(() => create...Store(...))` (LessonWorkspace.tsx:~92, BenchWorkspace.tsx:~163). All store changes go through `dispatch(action)`; components read through `useSyncExternalStore` (`useLab` in src/components/boardlab/useLab.ts, `useBenchState` in robotics/messages.ts). There is no global store: a store lives for one page mount (`LessonWorkspace` is keyed by `board/lesson`, boards/[board]/[lesson]/page.tsx:~58) and is gone on navigation.

**Two different store designs behind the same `LabStore` interface (VERIFIED):**
- Board Lab: pure `reducer(s, a) -> s` (store.ts:207); side effects are a separate `LessonRunner` class that subscribes with `store.onAction` (run.ts:~100) and dispatches back. Figure sync is a React `useEffect` in the page that diffs `figureState()` and sends a `set` patch (LessonWorkspace.tsx:~170).
- Robotics: reducer returns `[state, effects]` (store.ts:~135) and the store calls `handlers.run(effect)`. The handlers are installed by a React hook `useEffects` inside `BenchWorkspace.tsx:~128-165`, so figure commands, `markDone`, `recordQuiz` and the practice-task run live in a component file. If `figure` is null when an effect fires, a "send" is silently dropped (`if (!figure) return`, BenchWorkspace.tsx:~132). The same hook is the only place a task run starts.

**State that is NOT in the store (VERIFIED):** `xr`, `yaw`, `help`, `pulse`, `tab`, `expanded` in LessonWorkspace.tsx (useState); `tab`, `serialOpen`, `help`, `noticeGone` in BenchWorkspace.tsx. So rooms and replays cannot see which tab or camera angle a user has. Board view and exploded are in the store, camera yaw is not.

**Persistence (VERIFIED by `grep -rn localStorage` in scope, non-test):**

| Key | Written by | Holds |
|---|---|---|
| `iynk:v1` | src/lib/progress/storage.ts:3 (`updateSaved`) | one JSON doc `{v, done:{key:true}, quiz:{key:{score,total}}, best, settings}`. Version 1, empty MIGRATIONS table (storage.ts:~58). Falls back to in-memory if writes fail (`memoryOnly`). |
| `iynk:boardlab:values` | src/components/boardlab/values.ts:6 | chip (parameter) values per `board/lesson`, debounced 400 ms (LessonWorkspace.tsx:~118). |
| serial-monitor height key | SerialMonitor.tsx:29-46 | UI pixel height. |

Progress keys (src/lib/progress/keys.ts): `board:<b>:lesson:<l>`, `board:<b>:assembly`, `robotics:<bench>:step|task|quiz:<id>`. Marked done by `markDone` when all lesson checks pass and no fault is active (LessonWorkspace.tsx:~140), when a robotics step completes (`done` effect), and when a task's checks all pass.

**Learner code is NOT persisted.** The editor text lives only in `BoardLabState.code`. Reload, navigation or closing the tab loses edits; only the chip values survive (values.ts). The same holds for robotics task code (`BenchState.tasks[id].code`, store.ts:~52) and for the step session (`emptySession` at store init; progress is shown from `saved.done` but the in-session `steps` start empty, and a step is only re-confirmed when the figure reports it again). No server state, no DB tables are used by these two labs. Progress is browser-local only; `src/lib/progress/storage.ts:~120` throws if called on the server. VERIFIED.

## Current functionality (what VERIFIED works, how you know)

- `npx vitest run src/lib/boardlab src/lib/robotics src/components/boardlab src/components/robotics src/components/dock src/lib/progress` on this commit: 17 files, 120 tests, all passed (21.5 s). VERIFIED (I ran it, nothing written to the repo).
- Lesson run pipeline, traced in code (VERIFIED):
  1. Run button / Mod-Enter / Space -> `toggleRun` -> `dispatch({type:"run/start"})` (LessonWorkspace.tsx:~205). Reducer sets status `compiling`, bumps `run.id`, clears serial, pins and checks (store.ts:~228).
  2. `LessonRunner.onAction` sees `run/start` -> `begin(id)` (run.ts:~190): `gate()` refuses if the figure reports unplugged/brownout/fault (`refused.*` messages), else `compile()` (engine.ts:~251) builds an interp `Run` from `getProfile(board, variant)` and the lesson world. Compile errors become `run/error` plus serial lines.
  3. Fake 600 ms compile + 600 ms upload timers (30 ms with Reduce motion), then `session` is stored and a `requestAnimationFrame` loop starts (`frame()`, run.ts:~230).
  4. **The live program runs on the main thread**: each frame advances a virtual clock by up to 64 ms and calls `session.advanceTo(vt)` (run.ts:~237). The "busy loop yields after its budget" comment on `Session.advanceTo` (engine.ts:~69) is the only protection. It is not a Worker.
  5. Pin levels go to the figure as `figure.send("set", {state:{pins}})` at most 30 Hz and only if changed (run.ts:`sendPins`); the store gets `run/tick` every 66 ms; serial lines are batched into `serial/append`.
  6. Checks: after upload `check(id)` calls `startChecks(...)` (run.ts:~335, src/lib/interp/check-client.ts) which **does** use a Web Worker (`new Worker(new URL('./check.worker.ts'...))`, with a 2 s kill grace and a main-thread fallback when no Worker). Result dispatches `checks/result`; if all pass and no fault is active, `markDone`.
  7. Figure to store: iframe `state` events -> `figure/state` dispatch. The runner reads `status`, controls and `inputs` from it to hold in reset, stop on lost power, or drive input pins.
- "Break it" (faults), Board Lab (VERIFIED): `FailurePanel` dispatches `fault/trigger {id}`; `figureState()` merges the failure's `figure.state` (a `set` patch) into the next figure `set`; non-`set` faults (press/act) are sent once by `sendCommand` (FailurePanel.tsx:~65). `figurePatch` always re-sends `power` with `fault` (store.ts:~405) because the figure engine unplugs, changes, replugs. Display: the active row shows symptom, why, fix from the content; the figure's own reported `fault.msg` appears as a live Callout (FailurePanel.tsx:~80). Cold-joint faults on a pin also go to the interpreter (`applyColdJoints`, run.ts:~140). A fault does not count toward lesson completion (LessonWorkspace.tsx:~140).
- Faults, Robotics (VERIFIED): `fault/trigger` only emits a `send` effect of `fault.figure`; the store records no fault. "Active" is derived from the figure's reported state each render (`activeFaults(bench.faults, figureState)`, BenchWorkspace.tsx:~199, steps.ts:`faultPresent`). A "break" step completes when the fault was seen then cleared and `done` holds (steps.ts:`advanceSteps`).
- Quizzes (robotics) with score saved via `recordQuiz`; board lessons have a `Quiz` in LessonInfo.tsx.
- Dock: tabs partner/together/real/passport/hardware, gated by feature flags (LabDock.tsx:~29-40), responsive drawer or bottom sheet at 767 px (`PHONE_QUERY`, LabDock.tsx:~22); there is a 26 rem page push at >= 80 rem using a `body:has()` CSS rule (LabDock.tsx:~84).
- Rooms (shared store): `LabRoom` wraps the page store and routes it through one stable object; `attach()` replaces `next.dispatch` on the page's store with a wrapper (LabRoom.tsx:~44, "next.dispatch = (action) => store.dispatch(action)"). Both stores implement `sync/hydrate` to take a host snapshot (store.ts:~137 board, store.ts:~108 robotics). Not tested live by me.
- Component count (VERIFIED by `ls`): Board Lab 21 non-test .tsx in components/boardlab + 3 tests; Robotics 11 non-test .tsx + 3 tests; Dock 2 (+1 test). 33 files carry "use client" (grep -c, summed). 15 e2e/vitest files total here; Playwright specs e2e/boardlab.spec.ts (19 `test(` matches) and e2e/robotics.spec.ts (19) exist but I did not run them (they need a server; the rules forbid ports 3000/43117).

## Known defects (with repro or evidence)

| # | Defect | Evidence | Severity |
|---|---|---|---|
| 1 | Learner edits are lost on reload or navigation. Only chip values are saved. A learner who rewrites a sketch and refreshes starts again from the template. | `grep localStorage` shows only values.ts and SerialMonitor; `code` appears only in store state. Repro: edit code, F5. | high (for a product), low (for a hackathon) |
| 2 | Robotics `send` effects are dropped while the figure handle is null. A `step/do` or `fault/trigger` clicked before the iframe mounts shows a "sent" notice but nothing happens. | BenchWorkspace.tsx:~132 `if (!figure) return;` and the reducer already emitted `notify(... "sent")` (store.ts:~190). | medium |
| 3 | "Run happens in a worker" is not true for the live run; only checks are in a worker. A program with a heavy loop can block the UI thread for its per-frame budget. | run.ts:~237 `session.advanceTo` in rAF; check-client.ts is the only Worker. | medium |
| 4 | Check results depend on the live figure: `startChecks(..., figure: s.figure)` passes the iframe's last reported state into the job (run.ts:~345), while the header comment calls checks "a pure function of (source, board, variant, script, runMs)" (run.ts:4). Two learners can get different verdicts for `state` checks, and a server re-verification would need the figure state too. | run.ts header vs `startChecks` args; check-job.ts:15-33 `figure?: Record<string, unknown>` | medium |
| 5 | Practice tasks always run with `variant: null` and only a `BoardId`, so any bench whose board needs a variant (Pi 4 vs Pi 5, `boardVariant` in ROBOTICS meta) runs on the default profile. | src/lib/robotics/runner.ts:~31 `variant: null`; catalog.ts:23 `VARIANT_PRODUCT` | low |
| 6 | Docs table names `src/lib/board/**`, which does not exist. | ARCHITECTURE.md:122 vs `ls src/lib` | low |
| 7 | Robotics bench state is not restored: step "done" shows from `saved.done`, but the in-session step machine restarts, so the "current step" pointer (n key, Next) points at step 1 after reload while the progress bar shows steps done. | store.ts `emptySession` at init; BenchWorkspace `stepDone` merges saved only for display. Not reproduced in a browser. | medium, HYPOTHESIS |

## Technical debt (table: item, path, evidence, severity, effort guess)

| Item | Path | Evidence | Sev | Effort |
|---|---|---|---|---|
| Two store architectures for the same interface (effects-in-reducer vs side-effect class) | lib/boardlab/store.ts + run.ts; lib/robotics/store.ts | sections above | medium | 1-2 wk to unify on one |
| Simulation/side-effect glue lives in a React component (robotics `useEffects`) | components/robotics/BenchWorkspace.tsx:~128 | handler installs `markDone`, `recordQuiz`, figure sends | high | 2-3 d to extract to lib |
| Figure sync lives in a React effect (board) and in the same effect hook (robotics) | LessonWorkspace.tsx:~170 | store -> figure diff in `useEffect` | medium | 2 d |
| `LabRoom` replaces `store.dispatch` on the page's object (monkey-patch) | dock/LabRoom.tsx:~44 | `next.dispatch = ...` and restore on detach | medium | 3-5 d; make stores accept middleware |
| Duplication between labs: `SerialLine`, `SERIAL_KEEP=200`, `isRecord`, `hydrate`, `figure/state`, `fault/*` reducers, PHONE media query defined three times (CodeEditor.tsx:22, BenchWorkspace.tsx:63-64, LabDock.tsx:~22 with different breakpoints 639/639.99/767), notice and shortcuts handlers, `Panel`/`Tabs` assembly | see grep above | all VERIFIED | medium | 1 wk |
| Huge workspace components: BenchWorkspace 565 LOC, BoardWorkspace 438, LessonWorkspace 427; each mixes store wiring, keyboard handling, layout, copy | listed files | `wc -l` | medium | 3-5 d to split |
| State in `useState` not in store (tab, yaw, xr, help) | both workspaces | grep | low | 1 d |
| `useLab` is typed to `BoardLabStore` only; robotics has its own `useBenchState` | boardlab/useLab.ts, robotics/messages.ts | files | low | 1 d |
| `lib/boardlab/store.ts` imports `LabStore` from `components/dock/types` (lib depends on component layer) | store.ts:6 | line 6 | low | 0.5 d |
| Mixed code style: `.ts` in lib/boardlab uses single quotes, robotics/components use double quotes | store.ts vs robotics/store.ts | head of files | low | prettier |
| Hardcoded product names and bench months (`BENCH_MONTH`, `BOARD_PRODUCT`) | lib/robotics/catalog.ts:13-45 | literal tables keyed by catalogue id | medium | blocks user projects (see below) |
| Fake compile/upload delays (600 + 600 ms) are part of the run state machine | run.ts:`COMPILE_MS/UPLOAD_MS` | constants | low | 0.5 d |
| `Session.advanceTo` runs on the UI thread | run.ts:~237 | see defect 3 | medium | 1-2 wk (move run to a worker, stream pins and serial) |

## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)

Files (VERIFIED by `find`): lib/boardlab: store.test.ts, engine.test.ts, run.test.ts, template.test.ts; lib/robotics: store.test.ts, steps.test.ts, model.test.ts, runner.test.ts; components: ChecksPanel.test.tsx, FigureReadout.test.tsx, boardlab (3), robotics BenchWorkspace.test.tsx, StatusPanel.test.tsx, chrome.test.ts, dock LabDock.test.tsx; lib/progress: progress.test.ts, hooks.test.tsx. E2E (not run): e2e/boardlab.spec.ts, robotics.spec.ts, dock*.spec.ts, room.spec.ts.

What they check (sampled, VERIFIED by reading):
- `run.test.ts` drives `LessonRunner` with a `FakeScheduler` and BLINK/STEADY sketches: asserts state transitions, serial lines, and figure messages. This is the best test in scope and is deterministic. It checks the implementation's behaviour, not hardware.
- `engine.test.ts` iterates every lesson world input of every board (lines ~60-100) and checks the sketch reads the input and HTTP requests equal the control labels. That is an integrity check on content against the interpreter, not a hardware reference.
- `robotics/model.test.ts`: current-draw sums come from the fixture bench (`__fixtures__/bench.ts`, 186 lines, hand-authored) e.g. 13.6 mA for a 220 ohm LED; self-consistency with the fixture, not measured hardware values. `steps.test.ts`, `store.test.ts` test the state machine with fixture data.
- UI tests are thin: ChecksPanel and FigureReadout 36 and 59 lines, BenchWorkspace.test 162 lines. No test renders `LessonWorkspace` (grep: no `LessonWorkspace` in any *.test.*; Playwright covers it). No test for CodeEditor, CodePanel, FailurePanel, SerialMonitor, AssemblyPanel, WorldPanel.
- Hardware-derived reference values: none in this scope. Interp accuracy lives in other subsystems.

## Performance characteristics (measured if you can, else ESTIMATED/UNKNOWN)

- Test run: 120 tests in 21.5 s wall, dominated by transform time (38%). MEASURED.
- Frame loop: per frame dt capped at 64 ms (run.ts `FRAME_CAP_MS`), figure messages at most 30 Hz, store ticks every 66 ms (~15 Hz). A heavy interp step blocks the main thread; actual frame cost UNKNOWN (not profiled; no browser run allowed).
- Check budget: `CHECK_BUDGET_MS` in interp/check-job.ts, plus 2 s kill grace; a 15 s run is mentioned in a code comment (check.worker.ts:1). DOCUMENTED in code comments.
- Each `run/tick` replaces `pins` (a new object) so every `useLab(s => s.pins)` subscriber re-renders at about 15 Hz while running. ESTIMATED from reducer (store.ts:~256); impact UNKNOWN.
- `figureState()` is recomputed and JSON-stringified per key on every store change (`figurePatch` uses `JSON.stringify`, store.ts:~405). Cheap for the small state; ESTIMATED.
- Serial buffer capped at 200 lines in both labs.

## Security risks

- Learner code never reaches `eval` or `new Function` in this scope (grep `eval(|new Function|innerHTML|dangerouslySetInnerHTML` = no hits outside tests). The code runs in the project's own interpreter (src/lib/interp), audited by another agent. VERIFIED for scope.
- Figure iframe messaging checks `event.source` and `event.origin === window.location.origin` for inbound and posts to `window.location.origin` (components/figure/FigureFrame.tsx:231, 137). Good.
- Rooms: the dock rebroadcasts actions to other participants and `sync/hydrate` takes a host snapshot. Both hydrators validate types (`isRecord`, `typeof`) before use (store.ts:~137-170), but I did not audit the relay or the host-trust model. UNKNOWN.
- Progress is a plain localStorage JSON doc: anyone can set any `done` key. Fine for learning; not acceptable as proof of completion unless the server re-verifies. If Passport/Solana mint from this, completion is client-asserted. HYPOTHESIS to check in the Solana audit.
- `LabDock` accepts a `DOCK_TAB_EVENT` CustomEvent from `window` to switch tab (LabDock.tsx:~55); same-origin script only, low risk.
- Check job posts the whole lesson world and source to the Worker (same origin). No secrets.

## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)

**Only on catalogue items today. The engine is closer to reusable than the UI.**

Where a catalogue id is assumed (VERIFIED, file:line):
- Page routes are `boards/[board]/[lesson]` and `robotics/[bench]`, and `generateStaticParams` is built from `AVAILABLE.board` (boards/[board]/[lesson]/page.tsx:~15, `_lib/load.ts:~52 lessonParams`). `loadBoardPage` rejects any id not in `isBoardId` and `AVAILABLE.board` (load.ts:~36).
- Content is a build-time module per id (`loadBoard(id)`, `loadRobotics(id)` from `@/content/index.generated`) plus prose at `src/i18n/content/<lang>/<lab>/<id>.json`; a bench with missing prose keys is hidden (robotics/load.ts:~28).
- `compile()` calls `getProfile(opts.board as InterpBoardId, variant)` against the static `PROFILES: Record<BoardId, BoardProfile>` (interp/profiles.ts:244, engine.ts:253); an unknown board returns `unsupported`. `netMap(board)` in load.ts:~87 maps pins by label regex `^(?:D|GP|GPIO|P|IO)(\d+)$`.
- The figure is a prebuilt static page `board.figurePage` / `bench.figure.page` under `/figures/...` (LessonWorkspace.tsx:~290, BenchWorkspace.tsx:`src={bench.figure.page}`). The page protocol is `set {state}`, `press`, `act`, `flash`; state keys (`pins`, `power`, `fault`, `circuit`, `params`, `tones`, `view`) are the figure's per-item vocabulary. There is no generic "render these parts" figure.
- Faults are catalogue data (`FailureMode.figure` is a figure patch) and robotics fault detection reads figure-reported ids (`engineFaultId`, steps.ts:~15).
- Progress keys encode catalogue ids (keys.ts:3-12) and `BENCH_MONTH`, `BOARD_PRODUCT` are literal tables (catalog.ts:13-45).
- Check/world model: `Lesson.world` (inputs, script) is authored per lesson; checks are `Check[]` from content. A user project would need to author these or have none.

What already generalises (VERIFIED):
- The store shape is data-driven: `BoardLabState` holds `board: string`, `template`, `params`, `code`, `inputs` and does not import any catalogue. `initialState()` takes plain options (store.ts:~85). `LessonRunner` only needs `RunnerEnv` (board facts, world, checks, a `figure()` getter); it has no catalogue import (run.ts:1-12). `startChecks(job)` takes a serializable job. A project with one code file, one board profile and one figure could use these unchanged.
- Editor is a single document: `CodeEditor` takes `code` and `language` and has no tab or file concept (CodeEditor.tsx props). Changing language rebuilds the view. One file only, no multi-file project, no includes/libraries, no format-on-save.
- Single-source dispatch makes room sharing, AI partner and replays possible for any store that implements `LabStore`.

What blocks it: (a) no arbitrary parts, wiring or netlist model; the circuit is a named `circuit` string selected inside a prebuilt figure (`figureState`, store.ts:~383), wiring is a catalogue `wireables` list; (b) interpreter board profiles are a closed table; (c) no per-user persistence of code or projects, no server storage; (d) progress model is a fixed key grammar; (e) figure is a per-item hand-authored JS page (24k lines of figure JS across items per task brief).

## Required refactoring to get there

1. Add a `Project` object (id, board profile ref, files[], circuit/netlist, world, checks) and make `BoardLabState` take it instead of `board` + `lesson` ids. Phase 1: introduce `files: {name, text}[]` and `activeFile` to the store, keep `code` as a derived view.
2. Make `compile()` accept a `BoardProfile` object, not just an id, and make `netMap` come from the profile. Needs interp changes (other agent's area).
3. Move robotics side effects out of `BenchWorkspace.tsx` into `lib/robotics/effects.ts`, and unify the two store patterns (one `createLabStore(reducer, effects)` that supports `onAction`), then remove the monkey-patch in `LabRoom`.
4. Persist code and the project: a `ProjectStorage` interface (localStorage now, server later) behind one hook, replacing `iynk:boardlab:values`.
5. Replace hard-coded catalogue lookups (`BENCH_MONTH`, `BOARD_PRODUCT`, `isBoardId`) with a content registry that can also resolve user projects.
6. Move the live run to a Worker (session in the worker, pins and serial streamed back) so user code with heavy loops cannot freeze the page.
7. Split the three workspace components and extract shared pieces (serial buffer, hydrate helpers, media queries, notices) into `src/lib/lab-common`.
8. Decide the figure story for user projects: a generic parts renderer, or keep per-item figures and limit the builder to catalogue parts.

## Recommendation: extend

The store, runner and check-worker seams are clean enough to keep, but the two labs need one store pattern, persistence of code, a Project model and a worker for the live run before they can serve user projects.

## Open questions

- Does `figure/state` reach checks identically on every learner (defect 4)? Confirm with `check-job.ts` which check kinds read `figure`.
- Are robotics steps restored on reload (defect 7)? Needs a browser test.
- How do rooms behave when two screens run the same sketch (each makes its own pins; only inputs sync)? Not tested.
- Is the client-asserted `done` key the input to Solana Passport minting (ties to the Solana audit)?
- Who owns `LabDock` after the hackathon (shell-app per ARCHITECTURE.md:115, but it imports five feature areas)?
- How many boards and benches are actually available vs listed in ids.ts (`AVAILABLE.board` vs `BOARD_IDS`)? Not counted here; owned by the content audit.
- Line numbers marked with `~` were read from chunked output and are approximate to a few lines.
