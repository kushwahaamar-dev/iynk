# iynk technical debt and architecture-debt register

Audited commit: `bb546d6a051f0b268576587c6f9f934dde9e766c` (main), audit date 2026-10-26.
Author: synthesis agent. Primary evidence: the 14 subsystem inventories in `inventory/` and `SECURITY_BASELINE.md`. I spot-checked a few load-bearing claims in the code (list in section "What I checked myself" at the end). Nothing in the repo was changed except this file.

## How to read this file

Labels: VERIFIED (an inventory or I inspected or reproduced it), DOCUMENTED (a project doc says so, not tested), EXTERNAL, ESTIMATED (a calculation with stated assumptions), HYPOTHESIS (needs validation), UNKNOWN. I did not weaken any inventory label. Where an inventory marked a statement VERIFIED, I carry it as VERIFIED and name the inventory. Where I re-read the code myself I say so.

Effort scale (ESTIMATED, one engineer who already knows this codebase, no review wait):

| Code | Meaning |
|---|---|
| S | up to 2 working days |
| M | 3 to 10 working days |
| L | 2 to 6 weeks |
| XL | more than 6 weeks, or needs a design decision first |

Capabilities a debt item can block (column "Blocks"):

| Tag | Capability |
|---|---|
| PB | original-project builder |
| CC | custom components (user-defined parts and devices) |
| COL | collaboration on user projects |
| AI | AI editing of projects |
| FID | simulation fidelity (predicting real hardware) |
| ACC | accounts and persistence |
| EDU | educator tools (classes, assignments, trustworthy grading) |
| OPS | none of the above directly; operability, cost, security or legal for any public launch |

Gaps in my inputs (UNKNOWN, stated up front):

- The task named run reports `runs/COMMANDS.md`, `BUILD_OUTPUT.md`, `E2E.md`, `BROWSER_WALK.md` and baselines `PERFORMANCE_BASELINE.md`, `TEST_COVERAGE.md`. At the time of writing, `docs/MASTER_PLAN/01_AUDIT/` held only `CLAIMS.json`, `SECURITY_BASELINE.md` and `inventory/` (VERIFIED with `ls`). The run summary was `{}`. So no browser walk, no production bundle sizes, no e2e results and no coverage numbers were available to me. Everything below rests on the inventories, `SECURITY_BASELINE.md` and my own spot checks.
- Translation quality, real-browser frame cost, cross-browser replay equality and the production deployment's header handling were not measured by any inventory.

---

# Part A. The 13 architecture-debt questions

Summary table first. Details follow.

| # | Question | Verdict | One line |
|---|---|---|---|
| 1 | Do the labs share reusable data models? | Partly | Check, WorldModel, CodeTemplate, FailureMode, BuildStep are shared and generic. Ids, parts and faults are closed and figure-bound. Drones use parallel types. |
| 2 | Is simulation logic coupled to UI components? | Partly | Interpreter, flight sim, drone calc and replay are pure TypeScript. The circuit solver is coupled to figure globals. Robotics effects live in a React component. |
| 3 | Are figure assets coupled to specific lesson IDs? | Yes | Circuit key equals lesson id. Part ids and fault strings are shared free strings. |
| 4 | Can the coding environments support original projects? | Partly | A single-file sketch inside the language subset on a built-in board with the 11 device kinds runs today. Anything else does not. |
| 5 | Is circuit connectivity modelled independently from diagrams? | No | There is a real union-find netlist, but it is built from breadboard hole names in the figure file. The interpreter has no wiring input. |
| 6 | Do simulations expose stable APIs? | Partly | Pure functions over plain data exist. None is versioned or schema-validated, and some are not importable without the UI. |
| 7 | Do rooms support arbitrary project editing? | No | The relay is payload-agnostic, but rooms are bound to 3 labs and a catalogue item, with whole-text baton editing, no auth, no persistence. |
| 8 | Is content declarative or hardcoded? | Partly | Declarative at runtime (0 functions in 38 modules). Authored as TypeScript, bound to figure JS by strings, prose built into the bundle. |
| 9 | Do all supported languages have complete translations? | Yes, structurally | 0 missing keys in 6 languages. Quality is unreviewed. |
| 10 | Can AI responses safely trigger changes to a circuit? | No | The AI cannot change wires at all. Code and part changes sit behind an Accept click, but a stale accept overwrites newer edits, and tool output is unfenced. |
| 11 | Can project persistence support user-created content? | No | No project, user or document store exists. Learner code is not even saved. |
| 12 | Is deterministic replay truly reproducible? | Partly | Flight replay is bit-identical in one engine and tested. Nothing was tested across browsers. Other labs have no replay log. |
| 13 | Do unit tests validate real hardware behaviour or internal expectations? | Internal expectations | No test compares against hardware, a vendor simulator or SPICE. |

## A1. Do the labs share reusable data models?

Verdict: partly.

Evidence:
- Shared and generic: `Check` (10 kinds, `src/content/schema.ts:370-381`), `RunTrace`, `WorldModel`/`DeviceModel`, `CodeTemplate`/`ParamChip`, `FailureMode` (`schema.ts:243`), `BuildStep`/`StateCond` (`schema.ts:256`, `:44`). Board Lab already runs the same 12 interpreter profiles across 71 lessons. VERIFIED (content-schema).
- Not shared: three top-level shapes, `BoardContent` (`schema.ts:435`), `RoboticsContent` (`:521`), `DroneContent` (`:792`). Drones have `DroneTest` and `DroneBuildStep` where the other labs have `FailureMode` and `BuildStep` (`schema.ts:630`, `:574`). Drones contribute 0 failures. VERIFIED (content-schema).
- Ids are three separate closed `as const` unions in `src/content/ids.ts` (lines 21, 38, 55, 72, 98 in my check), plus a fourth `BoardId` union in `src/lib/interp/profiles.ts:6-18` that repeats the same 12 names. I read both files. VERIFIED.
- `StateCond` was loosened to `Partial<Record<string, ...>>` so `satisfies` would compile (`schema.ts:41-44`, I read the comment). So `done` conditions are not type-checked against the figure's state keys. VERIFIED.
- Store level: Board Lab is a pure reducer plus a `LessonRunner` class. Robotics is a reducer that returns effects. Both sit behind one `LabStore` interface. VERIFIED (boardlab-robotics-ui).

What it would take: move the generic types to a `core` module without lab unions (M). Add a JSON project model with open ids (L, see Part D change 1). Unify drone tests and steps with `FailureMode` and `BuildStep` (M).

## A2. Is simulation logic coupled to UI components?

Verdict: partly. The core engines are not coupled. Three seams are.

Not coupled (VERIFIED):
- Interpreter: zero third-party packages, no DOM or network, host callbacks only (interp, "Security risks" 1). `createRun`, `runHeadless`, `CheckJob` take plain data.
- Flight sim: `src/lib/flight` has no DOM dependency and no packages. `createSim(craft, course, calc, opts)` takes plain objects. 96 tests pass. VERIFIED (flight).
- Drone calculator: `src/lib/drone/calc.ts` is a pure closed-form function with no UI or content dependency. VERIFIED (drone-calc-lab).

Coupled:
- Circuit solver. `solveCircuit` reads `B.md`, `B.st` and calls `B.say` and `B.sfx` (`figures/engine/bench-solve.js:250`, `:301` per figure-engine; I confirmed `B.md` use at `bench-solve.js:60` and `:250`). It is a browser script sharing globals with the part drawings. VERIFIED.
- Robotics effect handlers live inside `BenchWorkspace.tsx:~128-165`. If the figure handle is null, a "send" is dropped (`BenchWorkspace.tsx:~132`). VERIFIED (boardlab-robotics-ui).
- `lib` code imports types from `components`: `src/lib/robotics/store.ts:6`, `src/lib/dronelab/fly.ts:2`, `src/lib/hw/sim.ts:6`, `src/lib/dronelab/store.ts:2-3`, `src/lib/server/ai/types.ts:4` (I grepped these myself). They are type-only, so low runtime risk, but the layering is inverted. VERIFIED.
- Live programs run on the main thread in a `requestAnimationFrame` loop (`run.ts:~237`). Only checks use a Worker. VERIFIED (boardlab-robotics-ui, interp).
- Check results depend on the live figure's last reported state (`startChecks(..., figure: s.figure)`, `run.ts:~345`), while the header says checks are a pure function of source, board, script and time. VERIFIED (boardlab-robotics-ui defect 4).

What it would take: extract the solver to a pure module with a typed netlist (L, 3 to 5 weeks per figure-engine). Move effect handlers into `lib/robotics` (S). Move shared types (`LabStore`, `HostCommand`, `LabKind`) to a neutral module (S).

## A3. Are figure assets coupled to specific lesson IDs?

Verdict: yes.

Evidence (VERIFIED, figure-items and content-schema):
- Circuit key equals lesson id. `src/content/boards/uno-r3.ts` has `circuit: 'blink'` through `'parking'` (lines 172-1857) and `figures/boards/uno-r3.js:155` defines the circuits under those keys. The host can only select a key compiled into the page (`bench.js:1204`, `bench.js:479`, `bench-bb.js:136`).
- Circuit part ids (`RES1`, `LED1`, `US1`) are used by content, for example `figure: { part: 'RES1', key: 'ohms' }` (`uno-r3.ts:155`).
- Fault strings (`'cold:H1.20'`, `'missing:X1'`, `'reverse-polarity:vsys'`) are agreed between `FailureMode.figure` and the figure's fault handlers.
- The only guard is tests that load the figure with `node:vm` and compare (`pico.test.ts:19-77`). The drone checker scrapes figure source with regexes (`src/content/drones/_checks.ts:24-45`, matches `{ id: 'X', short: '...'`). The uno-r3 test finds circuits with a regex tied to indentation (`uno-r3.test.ts:17`), so a reformat weakens it silently.
- One fixed page per object: 80 built pages (VERIFIED: `git ls-files public/figures | wc -l` = 80, figure-engine).

What it would take: a typed figure manifest emitted by each figure (part ids, fault ids, state keys) replacing regex scraping (M). A data-driven part and net graph carried over the bridge instead of compiled-in circuits (L to XL, Part D change 2).

## A4. Can the coding environments support original projects?

Verdict: partly. Narrowly yes, broadly no.

What runs today (VERIFIED, interp): `createRun`, `runHeadless` and `CheckJob` accept any source string, any of 12 boards, any pin numbers, any `WorldModel` and any `Check[]`. A single-board sketch within the supported subset using the 11 device kinds works with no code change. 189 interpreter tests pass.

What blocks it (VERIFIED, interp and boardlab-robotics-ui):
- Language subset. Rejected: classes, templates, pointers, `#ifdef`, DHT, SoftwareSerial, EEPROM, Python `json`, `machine.SPI/UART`, Verilog functions and memories, vectors wider than 32 bits. SPI is a stub that returns 0 (`libs.ts:787`) with no warning, so wrong code looks right.
- Devices are a closed TypeScript catalogue (11 kinds) typed in the content schema (`schema.ts:304-315`). No register or device description format.
- No netlist input. Pin-to-device mapping lives in each lesson's `WorldInput.pins`.
- Boards are a closed `PROFILES` table (`profiles.ts:244` per boardlab inventory). Adding a board is a profile entry.
- Timing is a fixed cost per statement, not cycles. Idle-loop skipping assumes every side effect bumps a version counter (`exec.ts:93-99`).
- No memory guards. Three trivial programs abort Node with out-of-memory (`x = [0] * (10**9)`, `int a[2000000000];`, a `bytearray` append loop). Safe-ish in a Worker, unacceptable on a server. VERIFIED by repro in the interp inventory.
- Editor is single-file CodeMirror, and robotics tasks use a plain textarea. Learner code is not persisted.
- Check results are computed in the browser only. The verifying server named in comments (`check-job.ts:1-2`, `headless.ts:1-3`, `checks.ts:1-4`) does not exist.

What it would take: device registry and library registry as data (L), memory and output caps plus a worker for the live run (M), a netlist-to-pins adapter (M), multi-file editor (M), an emulator investigation for projects outside the subset (avr8js, simavr, Renode; EXTERNAL, not evaluated, XL).

## A5. Is circuit connectivity modelled independently from diagrams?

Verdict: no. There is a real netlist, but it is a by-product of the drawing data.

Evidence (VERIFIED, figure-engine):
- `netlist()` and `uni()` in `bench-solve.js:44-60` are a union-find that merges breadboard strips, rails, board pins and part legs. A wire is a modelled net, not a picture. That is a good seed.
- The input is the same object that draws the scene: `c.parts` with `holes` and `c.wires` from the figure file, resolved through `B.hole(geo, ref)` and breadboard geometry (`bench-bb.js` `B.bbGeom`). A part's electrical legs are its drawing's hole indices. A typo in a hole name yields a null end and the wire is silently skipped (`bench-solve.js:41-42`, `:55`).
- The host cannot send parts or wires. `set` can only change whitelisted params, power, pins, faults and select an existing circuit key.
- The interpreter has no concept of connections at all (interp, blocker 3).
- Pinout and net data is duplicated between figures and `src/content`, linked only by regex tests (figure-items).
- Solver scope: DC only, 12 element types, no capacitor, inductor, MOSFET, PNP, op-amp, regulator, Zener or transient (`bench-solve.js:76-107`). Regulators and brown-out are rules in the power-tree code (`bench.js:~225-312`). VERIFIED.

What it would take: a schematic-level graph (parts, pins, nets) as the source of truth; breadboard layout becomes a view (L). A pure solver taking `{nodes, elements, sources}` and returning structured results with a convergence flag (L). New element models in data (L). Option to adopt ngspice-WASM behind the same interface (EXTERNAL, not evaluated).

## A6. Do simulations expose stable APIs?

Verdict: partly. Clean seams exist. None is versioned.

Stable-shaped (VERIFIED):
- Interpreter: `createRun`, `runHeadless`, `CheckJob` (plain JSON), `evaluateChecks`.
- Flight: `createSim`, `dispatch`, `stepSim`, `advance`, `replay`, `FlightAction`, `FlightEvent`, `FlightFrame` (`sim.ts:103,220,308,327,1008`; `types.ts:243-288`).
- Calculator: `calc(CalcInput)`.
- Figure bridge: `{source:'iynk', v:1, ...}` with an origin-checked, whitelisted handler (`protocol.ts:17-68`, `embed.js`). This is the best-defined API in the repo.
- MCP: 7 tools (docs-claims-history).

Not stable:
- Content types have no `schemaVersion`; the additive-only rule lives in prose (`schema.ts:5`, `docs/ARCHITECTURE.md:41-80`).
- Realtime has no protocol version or capability negotiation, and the wire protocol is defined twice (`server/realtime/src/protocol.js` and `src/lib/realtime/protocol.ts`).
- Only `iynk:v1` in localStorage has a version, and its migration table is empty, so it has never run a real upgrade (`src/lib/progress/storage.ts:58`). A document with `v` above 1 is re-saved as v1, so a downgrade rewrites newer data (server-data).
- `calc` has no input validation; `mah=0` gives Infinity or NaN (`calc.ts:151-230`). It only works because catalogue data is static.
- The solver and part physics have no importable API at all (globals).
- The AI bench context is guessed from key names (`src/lib/ai/bench/generic.ts`), with per-lab adapters that return `parts: []` and `nets: []`.

What it would take: version stamps and runtime validators on project, wire and storage formats (M). A shared protocol schema for realtime (M). Input validation on `calc` (S). Pure solver module (L).

## A7. Do rooms support arbitrary project editing?

Verdict: no.

Evidence (VERIFIED, realtime):
- Reusable core: the relay never interprets actions. An action is any JSON with a string `type`; a snapshot is any JSON. It stamps a gapless `seq`. 39 relay tests and 18 client tests pass. Load test with 8 peers in one room shows 0 gaps, p99 41 ms, on a 14-core Mac over loopback (not the 1 vCPU VM).
- Blocked: `LABS = new Set(["board","robotics","drone"])` (`server/realtime/src/protocol.js:7`, my read) and `itemId` is a kebab slug of at most 64 chars. A room binds to exactly one lab and item and a second item gets `wrong_item` (`relay.js:235-241`). `labSync` is a closed record of three labs (`src/lib/realtime/shared-actions.ts:129`). Shared-action whitelists are hand-written per lab.
- Editing model: baton. One peer at a time, whole-text `code/replace` after a 200 ms debounce. No OT or CRDT. Conflicts resolve as later-seq-wins.
- No auth. The 6-character room code (31^6 = 887,503,681, about 29.8 bits, ESTIMATED) is the only credential. Peer ids are self-asserted. Reproduced: a joiner reusing the host's id inherits host and can kick a peer (`relay.js:248-257`, I re-read the replace branch; repro script in `audit/realtime/hijack.mjs`). Kick is evaded by reloading (new random id).
- `room/baton` is not authorized by the receiver (`room.ts:588-596`).
- State is memory only. Every relay deploy drops all rooms. Empty rooms live 30 minutes.
- Ceilings: 64 KB per action, 512 KB per snapshot. An oversized frame wedges the sender's outbox (`room.ts:396-411`, `ws-transport.ts:141-147`). A snapshot over 512 KB makes the room impossible to join after 5 s per provider (`room.ts:533-543`).
- No divergence detection; `drain()` silently skips sequence holes (`room.ts:573-577`).

What it would take: opaque document namespace in place of the lab enum (M), signed room tickets or peer tokens (M), durable log or snapshot store (L), protocol version (S to M), larger or by-reference snapshots (M), state hash and resync (M). A CRDT for simultaneous authoring is a separate, larger decision (XL; keep the baton model for an MVP).

## A8. Is content declarative or hardcoded?

Verdict: partly. Declarative at runtime, hardcoded in how it is authored and bound.

Evidence (VERIFIED, content-schema):
- Runtime: a recursive walk finds 0 functions in all 38 default exports. Modules serialise to 1,293 KB total. Check kinds are data.
- Authoring: TypeScript with build-time helpers (`functionsOf`, `gp()`, `lessonText()`, `quiz()` in `boards/pico.ts:7-47,203-217`; `fault()`, `mode()` in `robotics/hc-sr04.ts:145-170`). Node type stripping restricts syntax to erasable TypeScript (`scripts/gen-content-index.mjs:9-10`). A non-engineer cannot add an item.
- Behaviour that matters lives in strings and in figure JS: `FailureMode.effect` is descriptive; the figure does the work. `BuildStep.done` is detected by reading state from a UI iframe, not computed from content.
- Registry: `index.generated.ts` is a checked-in generated static import map of 38 items (`index.generated.ts:9-74`). A new item needs a rebuild.
- Prose: `src/i18n/content/<lang>/<lab>/<id>.json` loaded by a template-path dynamic import (`src/i18n/server.ts:59`), so user text has nowhere to live.
- Counts check out against the README: 71 lessons, 31 tasks, 144 failures, 106 faults. "272 assembly steps" is robotics only; all labs total 579 (VERIFIED).
- Hard-coded demo Wi-Fi credentials and a third-party URL in `boards/pico.ts:~173-186`. Low.

What it would take: JSON-serialisable, versioned, runtime-validated project model (L). `gen-content-index.mjs --emit` already prints `{meta,data,en}` per item (`gen-content-index.mjs:156-163`) and is a base. Faults as rules over the part graph (L).

## A9. Do all supported languages have complete translations?

Verdict: yes in structure, UNKNOWN in quality.

Evidence (VERIFIED, shell-i18n and content-schema, both by node scripts):
- UI: 2,064 leaf keys per language across 11 namespaces, 0 missing and 0 extra in all six languages.
- Item prose: 38 files and 12,311 leaves per language, 0 missing in es, fr, de, zh, hi.
- Figure strings: 4,087 source strings, 4,087 keys in each of the five non-English files. Identical to the key in es: 554 of 4,087 (13.6%), other four not computed.
- Copy-through upper bounds: 14 to 23 long strings per language identical to English in item prose (some legitimately code or part names). Translation tests allow up to 10% copy-through and do not measure quality.
- Quality: no inventory read the translations. HYPOTHESIS: machine-generated and not reviewed by native speakers (`/api/ai/translate` exists).
- Gaps: `content:check` validates English only (`gen-content-index.mjs:122-133`); `dir="ltr"` is hard-coded (`layout.tsx:57`); no RTL audit; figure iframes unaudited for RTL.
- The catalogue covers 6 languages. User-authored text would have no translation path except on-demand AI translation (route exists, in-memory cache only).

What it would take: locale-parity check in CI (S). Native review for the highest-traffic lessons (M, budget item). On-demand translation with a persistent cache for user content (M, needs the shared store in change 3).

## A10. Can AI responses safely trigger changes to a circuit?

Verdict: no. The question has two halves.

Can the AI change a circuit at all? No. `propose_change` accepts `wire`, `part` and `code` kinds in its schema, but boards accept only `code`, robotics only `code`, drones only `part` (`src/lib/ai/bench/board.ts:60-63`, `robotics.ts:60-63`, `drone.ts`). The schema advertises all three in every lab, so the model learns by error. VERIFIED (ai-search-mcp D7).

Is what it can do safe?
- The model cannot see wiring. Board and robotics adapters return `parts: []` and `nets: []` (`bench/board.ts:47-48`, `bench/robotics.ts:44-45`), yet the prompt tells it to use part ids and call `highlight_part`. VERIFIED (D6).
- Accepting a proposal can overwrite newer learner edits. The card stores the finished `after` text; `decide(accept)` dispatches the stored `code/replace` blindly (`bench/board.ts:62-69`, `conversation.ts:220`, `store.ts:211-214`). No revision check. VERIFIED by reading (D5, high).
- Tool output is unfenced. Search results and page text (up to 3,000 chars per page) reach the model as tool messages with no `<<< >>>` fence (`src/lib/server/ai/tools.ts:38-45`). A hostile page can steer it. The strongest abuse: `ask_peer` posts a 4 to 300 character message to the room chat immediately, with no confirmation (`run-tools.ts:76-86`). VERIFIED.
- Peer names and `done` keys from other room members go into a system message, so one member can inject text into every other member's partner. Medium. VERIFIED.
- The Accept/Reject diff is a real safeguard and the live Meta smoke run passed 6 of 6. No evals, no prompt-injection tests, no safety tests for LiPo or mains advice exist.
- No identity on AI routes; only per-IP in-memory limits. Cost can be drained by `curl` (SECURITY_BASELINE C1).

What it would take: a project snapshot interface the AI reads, with apply-actions carrying a base revision, so stale proposals are rejected (M). Fence tool output and confirm `ask_peer` (S). Evals set of 30 to 50 bench states run on every prompt change (M). Wire and part edits need the part graph from change 1 and 2 first.

## A11. Can project persistence support user-created content?

Verdict: no.

Evidence (VERIFIED, server-data and boardlab-robotics-ui):
- Server tables: `events` hypertable (30-day retention), two continuous aggregates, `profiles` (24 h expiry), plus `simlab_migrations`. No user, project, file or save table.
- Client: one document `iynk:v1` of the form `{done:{key:true}, quiz, best, settings}` keyed by catalogue ids; plus about 8 ad hoc keys with their own shapes. Settings live inside the progress blob.
- Learner code is not persisted. Edit, press F5, and it is gone. Only chip values are saved (`values.ts:6`). Robotics task code and step session are not saved either. High for any product.
- Identity: a random per-device session UUID. Clearing storage loses it. The only ownership pattern is the buddy token hash.
- Rate limiter is an in-memory `Map` per serverless instance, capped at 10,000 keys (`src/lib/server/ratelimit.ts:15`, I read it).
- Telemetry is not idempotent (no event id). The leaderboard is forgeable. `laps_best_daily` has no retention or index. `db-migrate.mjs` is not wired into build or deploy. `timescale.test.ts` is skipped without Docker, so the DDL has not run in any test the inventory could execute.
- Good base: zod on every route, one error contract (503 without a DB, 502 when it fails), coalesced inserts, token-hash ownership in `profiles`.

What it would take: `projects` table with token-hash ownership (M), then real identity (anonymous signed session first, accounts later; M to L), shared rate limiter and usage ledger (M), migrations wired into deploy (S), client persistence of code (S, do this first), blob store if projects exceed JSONB comfort (M).

## A12. Is deterministic replay truly reproducible?

Verdict: partly. Reproducible where it exists, in the engine tested. Not shown across engines, not used for trust.

Evidence:
- Flight (VERIFIED, flight): fixed 100 Hz step, no `Math.random`, `Date.now` or `performance.now` in physics. Wind is a function of the step counter. The inventory ran the same 60,000-step scenario twice in Node and got a bit-identical final position. A unit test replays a log and compares `frameOf` with `toEqual` (`flight.test.ts:296-311`). `replay()` is a real re-simulation from `origin` plus a `{step, action}` log (`sim.ts:1008`). Ghosts and crash replay are cut from it. 96 of 96 tests pass.
- Caveat (VERIFIED by reading, flight): it relies on `Math.sin/cos/atan2/pow/exp` arithmetic. Different JS engines or versions may differ in the last bit, and crash-type runs may diverge. UNKNOWN: cross-browser equality was never tested.
- The action log is in memory only. It is never persisted or sent to a server. Lap times are client-claimed integers in `[LAP_MS.min, LAP_MS.max]` (`src/lib/server/db/schema.ts:32`), so the existing replay is not used to verify anything.
- Interpreter (DOCUMENTED and tested within one engine): one virtual microsecond clock, fixed cost per statement. 189 tests pass. Idle-loop skipping jumps time when an iteration is invisible (`exec.ts:93-99`), a deliberate deviation.
- Verify layer (VERIFIED, tooling-tests-e2e and solana): `verifyRun` replays client-supplied events. The `init` event carries client-asserted `smokeOk`, `motorOk`, `accOk`, `placed`, `plugged` (`drone-safety.ts:25-31,68`). A forged internally consistent log passes. The solana inventory forged a perfect-score pass with 7 hand-written events. Only 1 of 5 declared run kinds is verifiable.
- Circuit solver: state `solverMem` is rebuilt each frame; no convergence flag; non-converging circuits return the last iterate silently (`bench-solve.js:213`, `:264`). Deterministic in practice, but not reported when wrong.
- Board Lab and robotics: no action log is kept for replay. Rooms replay actions through each client's own reducer with no divergence check.

What it would take: cross-engine replay test on Chrome, Firefox and Safari (S). Decide tolerance or fixed-point (M). Persist the log and re-run `replay()` server-side (it is pure TypeScript, no DOM; M). Make the server own the initial state instead of client flags (M).

## A13. Do unit tests validate real hardware behaviour or internal expectations?

Verdict: internal expectations.

Evidence (VERIFIED by sampling in each inventory):
- Counts: full vitest 173 files, 2,802 cases; 2,794 pass, 3 fail by timeout under load, 5 skipped, 225 s (tooling-tests-e2e). 119 Playwright tests in 12 specs were listed and not run.
- Lessons: 102 of 102 references pass their own checks and 102 of 102 starters fail. This shows author and interpreter agree. It does not show the interpreter matches a real Arduino, MicroPython or Verilog tool on learner code.
- Interpreter: the HC-SR04 test asserts 1458 us for 25 cm (`arduino.test.ts:174`), which is the implementation's own constant (`devices.ts:279`). Datasheet-derived tests exist for MPU-6050 `WHO_AM_I` and scale, PCA9685 prescale, language semantics. No differential test against avr-gcc, simavr, avr8js, CPython or Icarus (`grep` finds none in code or tests).
- Solver: 12.2 mA through 220 ohm is `3 / 245.5`, built from `PIN_R = 25`, a file-wide constant (`bench-solve.js:10`, I read it). No SPICE, datasheet or bench comparison. No KCL residual or property tests. No test of non-convergence. One known inconsistency: the 1N4007 part supplies a full Shockley set (`diode-1n4007.js:31`) that the solver ignores in favour of `vf .7, rd .2` (`bench-solve.js:100`).
- Content: 737 pinout rows, power limits and brown-out volts are not compared with any datasheet extract by a test. 35 fact files exist in `docs/facts`, linked by nothing automatic. A handful of datasheet constants are asserted by hand (RP2350 150 MHz, `pico.test.ts:78-83`).
- Drone calc: 342 golden rows are the third-party site's own outputs (`docs/research/drone-lab-b-calc-matrix.md:3`). They prove a faithful port, not physical accuracy. The "445 calculator tests" in HANDOFF.md is 384 calculator tests plus 61 CLI, store and fly tests.
- Flight: "tops out near 50 km/h" asserts only `10 < v < 16` m/s (`flight.test.ts:114-131`). Hover current equals the calculator's by construction (`battery.ts:46-50`). No comparison with real flight logs.
- Figures: built pages are scraped by regex, and nothing renders pixels (`testkit.mjs` stubs canvas). Nothing checks board geometry against its Eagle file.
- Robust spots: determinism replay test, "every course of every craft is flyable by the demo autopilot" regression net, relay tests including limits.
- Flaky: jsdom tests wait on real-frame animation with 40 to 120 s timeouts. Failures seen: basys3 (120 s), octo (`still busy after 50000 ms`, `_checks.ts:362`), wing (40 s), under load average 20 to 25.
- Coverage tooling: none. Percent coverage is UNKNOWN. No CI at all.

What it would take: a small independent reference set per domain: SPICE or hand calculation for the solver (M), avr8js or simavr differential runs for 20 representative Arduino sketches (L), thrust-stand or manufacturer tables for the drone model (L, needs data), datasheet extract linked to pinout and power tables (M). CI that runs `tsc`, `eslint`, `content:check`, vitest and a figure rebuild diff (M).

---

# Part B. Debt register

One row per distinct item. Where several inventories reported the same thing I merged the rows and list all sources. Severity is the inventory's where it gave one, otherwise mine, and is judged against the master-plan goal (a real product with user projects), not against the hackathon. Evidence column cites the inventory name in brackets. "Eff." uses the scale at the top.

Sections: B1 content and model, B2 simulation and figures, B3 flight and drone model, B4 lab UI and stores, B5 realtime, B6 AI, search and MCP, B7 server, data and identity, B8 Solana, B9 shell, i18n and web, B10 tooling, tests and delivery, B11 docs, legal and process.

## B1. Content and model

| ID | Item | Path | Evidence | Sev | Eff. | Blocks |
|---|---|---|---|---|---|---|
| B1-01 | Content bound to figure JS by free strings (part ids, fault strings, mode ids, power keys); tests are the only guard | `schema.ts:47-50,243-253`; `boards/pico.test.ts:19-77` | Rename of a figure part silently breaks content until a vm test runs [content-schema] | high | L | PB, CC |
| B1-02 | Drone checker regex-scrapes figure source; other tests also scrape figure JS by regex (indent-sensitive) | `drones/_checks.ts:24-45`; `boards/uno-r3.test.ts:17` | Reformatting `uno-r3.js` empties `figureCircuits` and weakens the check silently [content-schema, figure-items, tooling-tests-e2e] | high | M | PB, CC |
| B1-03 | Closed id unions duplicated: `ids.ts` plus `BoardId` in `interp/profiles.ts`, plus directory and figure names | `ids.ts:21-98`; `interp/profiles.ts:6-18` | I read both; adding an item needs edits in at least five places [content-schema, interp, boardlab-robotics-ui] | high | M | PB |
| B1-04 | Content authored as TS modules under Node type-stripping limits; not JSON or DB-storable | `scripts/gen-content-index.mjs:9-10` | 23,378 lines in 38 modules; only erasable TS allowed [content-schema] | high | L | PB, ACC |
| B1-05 | `index.generated.ts` is a checked-in static import map; user items need a rebuild; `AVAILABLE`/ID arrays force code change | `index.generated.ts:9-74` | `Partial<Record<Id, () => import(...)>>` [content-schema, shell-i18n] | high | M | PB |
| B1-06 | No `schemaVersion` on any content type; additive-only policy lives in prose | `schema.ts:5`; `docs/ARCHITECTURE.md:41-80` | No version field in `BoardContent`, `RoboticsContent`, `DroneContent` [content-schema] | medium | S | PB, ACC |
| B1-07 | `StateCond` loosened to `Partial<Record>`, so done-conditions are untyped against figure state keys | `schema.ts:41-44` | I read the comment [content-schema] | medium | M | PB |
| B1-08 | `TextKey` is `string`; two diverging key-detection lists | `schema.ts:25`; `gen-content-index.mjs:93-100`; `drones/_checks.ts:56-57` | A typo or new section is skipped silently [content-schema] | medium | M | PB |
| B1-09 | Parallel models: `FailureMode` vs `DroneTest`; `BuildStep` vs `DroneBuildStep` | `schema.ts:256,574,630` | Same idea, different shapes [content-schema] | medium | M | PB |
| B1-10 | Copy-pasted helpers `lessonText`, `chk`, `quiz` in 6+ board files | `boards/{basys3,de10-lite,microbit-v2,nucleo-f401re,pi4-pi5,pico}.ts` | `grep -c` per file [content-schema] | medium | S | none |
| B1-11 | 37 per-item test files are the only validation (132 s, 611 CPU-s); no single schema validator | `src/content/**/*.test.ts` | 813 tests pass [content-schema] | medium | M | PB |
| B1-12 | `content:check` validates English only; no locale parity or id-collision check | `gen-content-index.mjs:122-133` | 0 keys missing today, so a missing guard, not a live bug [content-schema] | low | S | PB |
| B1-13 | Drone per-craft constants copied from a third-party site, duplicated between `models.ts` fixture and 13 content files | `src/lib/drone/__fixtures__/`, `drones/*.ts` | Kept in sync only by `content.test.ts` [drone-calc-lab] | medium | M | FID |
| B1-14 | Golden fixtures built by a regex extractor from the original site's JS (not in repo) and markdown tables | `src/lib/drone/__fixtures__/golden-*.json` | 342 rows are that site's outputs [drone-calc-lab] | medium | M | FID |
| B1-15 | BOM is hand-written free-text queries per item, no SKUs or part numbers; prop-clash check exists for 1 craft (octo) | `src/lib/search/bom.ts:51,287,342`; `models.ts:136` | Match rate never measured [drone-calc-lab, ai-search-mcp] | medium | L | PB, CC |
| B1-16 | Hard-coded demo Wi-Fi credentials and a third-party URL in lesson text | `boards/pico.ts:~173-186` | `"HackTX"` found only there [content-schema] | low | S | none |

## B2. Simulation, interpreters and figures

| ID | Item | Path | Evidence | Sev | Eff. | Blocks |
|---|---|---|---|---|---|---|
| B2-01 | Solver, part drawing and part physics co-located; solver reads globals `B.md`, `B.st` and calls `B.say`/`B.sfx` | `figures/engine/bench-solve.js:60,250,301`; `figures/parts/*.js` | I confirmed the globals [figure-engine, figure-items] | high | L (3-5 wk) | PB, CC, FID |
| B2-02 | Circuits only by compiled-in key; no data path for parts or wires over the bridge | `figures/engine/bench.js:479,1204`; `bench-bb.js:136` | `set {circuit}` accepts a key already in `MD.circuits` [figure-engine, figure-items] | high | L | PB, CC |
| B2-03 | No data-only part definition: 29 hand-drawn `draw()` functions; physics `elec` in the same JS | `figures/parts/*.js`; `bench.js:21` | 26 of 29 parts have `elec:` [figure-items] | high | L | CC |
| B2-04 | Solver scope: DC only, 12 element types, no C/L/MOSFET/PNP/op-amp/regulator/Zener, no transient | `bench-solve.js:76-107` | Searched; regulators are rules in `bench.js:~225-290` [figure-engine] | high | L to XL | FID, CC |
| B2-05 | Solver constants global and uncited (`PIN_R=25`, `RBE`, `RSAT`, `RAIL_R`); same PIN_R for 3.3 V and FPGA pins; diode params ignored | `bench-solve.js:10,100,142` | ESTIMATED effect: a few percent to tens of percent on LED current [figure-engine] | medium | M | FID |
| B2-06 | No convergence reporting; silent last iterate after 40 rounds / 6 passes; floating nodes solve to 0 V without warning | `bench-solve.js:213,264,19-20` | No flag exists; no test covers it [figure-engine] | medium | M | FID |
| B2-07 | Dense O(n^3) solve rebuilt each frame; cost scales badly | `bench-solve.js:127-130` | Measured 0.02-0.28 ms today; ESTIMATED about 10^9 flops per frame at n=100 [figure-engine] | low (today), high for larger nets | M | PB, FID |
| B2-08 | Figure iframe has no `sandbox`, same-origin, CSP covers framing only | `src/components/figure/FigureFrame.tsx:351-357`; `next.config.ts:22-31` | I read the iframe element: `title`, `loading`, no `sandbox` [figure-engine, SECURITY_BASELINE] | high for user figures; low today | M | CC, PB |
| B2-09 | Engines are order-dependent concatenated scripts (`bench.list`), no modules or types | `figures/engine/bench.list`; `cfbuild.py:34-50` | 10-line manifest [figure-engine] | medium | L (2-3 wk) | CC |
| B2-10 | 80 built HTML pages (24.7 MB) committed; each embeds core and engine (~330 KB repeated); no shared cacheable bundle; no CI build or diff | `public/figures/**` | `git ls-files public/figures \| wc -l` = 80 [figure-engine, figure-items, tooling-tests-e2e] | medium | L (1-2 wk for bundle) | OPS, CC |
| B2-11 | Vendored Colorfigures core patched by string replace (P0-P6, B1-B2) applied by `vendor.py` from `~/.claude/skills/colorfigures`; breaks if upstream TAIL changes; MIT notice may not ship in built pages | `figures/vendor/colorfigures/vendor.py:15`; `cfbuild.py`; `PATCHES.md` | Re-vendoring impossible on a clean machine [figure-engine, figure-items] | medium | M | OPS |
| B2-12 | Drone slices use literal mm coordinates and per-drone functions | `figures/drones/*.js` | [figure-items] | low | M | CC |
| B2-13 | Dense one-line code style and hackathon agent-role comments (`P2-engine-b`, `engine:bench`) | `bench-solve.js:63-110,300-345` | [figure-engine] | low | ongoing | none |
| B2-14 | Stale comment about ULN2003 breadboard part | `figures/boards/uno-r3.js:158-159` | Contradicted by wires near `:302-306`; UNKNOWN which is true on screen [figure-items] | low | S | none |
| B2-15 | Possible jsdom heap growth when stepping the page 200 frames across circuits | scratch `t.mjs` | Node heap reached 4 GB; not reproduced in a browser [figure-engine] | medium (HYPOTHESIS) | S to investigate | FID |
| B2-16 | Interpreter source files over 1,200 lines | `arduino/libs.ts` 1440, `python/runtime.ts` 1361, `arduino/interp.ts` 1353, `verilog/sim.ts` 1214 | [interp] | low | M each | none |
| B2-17 | Libraries and Python modules hand-ported with no registry or plugin format; device model union lives in the content schema | `interp/arduino/libs.ts`; `schema.ts:304-315` | 11 closed device kinds [interp] | high | L | PB, CC |
| B2-18 | Language gaps: no classes, templates, pointers, `#ifdef`, DHT, SoftwareSerial, EEPROM, Python `json`, `machine.SPI/UART`, Verilog functions and wide vectors | probes in interp inventory | Fail at compile with a friendly message [interp] | high | XL (or emulator path) | PB |
| B2-19 | No memory, size or output caps; three trivial programs abort Node (OOM); serial output unbounded in headless | `interp/headless.ts`; `python/runtime.ts:152` | Repro commands in the inventory [interp] | high (server), medium (browser) | M | PB, EDU, OPS |
| B2-20 | Live run on main thread in a rAF loop; only checks use a Worker | `src/lib/boardlab/run.ts:~237`; `check-client.ts` | [interp, boardlab-robotics-ui] | medium | M | PB |
| B2-21 | Check results computed in the browser only; the verifying server in comments does not exist | `check-job.ts:1-2`; `headless.ts:1-3`; `checks.ts:1-4` | No server code imports interp [interp] | high for certification | M | EDU, OPS |
| B2-22 | Fixed per-statement cost, no cycle model; idle skipping relies on every side effect bumping `world.version` or `rt.fx` | `interp/exec.ts:93-99` | [interp] | medium | L | FID |
| B2-23 | SPI is a silent stub returning 0 | `interp/arduino/libs.ts:787` | Probe prints 0, no warning [interp] | medium | S to warn, M to implement | FID, PB |
| B2-24 | Smaller interpreter defects: unvalidated Python pins, 20k edge-trace cap, duplicate `max` builtin, `decodeURIComponent` without try/catch | `world.ts:375`; `python/modules.ts:105-106`; `world.ts` request | [interp] | low | S | none |
| B2-25 | Verilog settle is O(signals x comb blocks) per iteration; 100 MHz designs simulate at about 3M cycles/s (1 s virtual = about 30 s wall); budget check cadence overshoots | `verilog/sim.ts`; `headless.ts:228` | Measured 10M cycles in 3.6 s [interp] | medium | M | FID |
| B2-26 | Board facts duplicated between `profiles.ts` and `docs/facts` with no validation | `interp/profiles.ts`; `docs/facts/*.md` | 35 fact files, nothing links them [interp, content-schema] | medium | M | FID |
| B2-27 | No differential or hardware-derived golden tests for interpreters or solver | see A13 | `grep` finds no simavr/avr8js in code [interp, figure-engine] | high for fidelity claims | L | FID |

## B3. Flight and drone model

| ID | Item | Path | Evidence | Sev | Eff. | Blocks |
|---|---|---|---|---|---|---|
| B3-01 | Thrust and energy model not derived from motor or prop data; per-craft scalar `k`, dimensionless `pf`/`eff`; 13 `CalcModel`s are effectively 13 regressions | `src/lib/drone/calc.ts` | [drone-calc-lab] | high | L | PB, CC, FID |
| B3-02 | Catalogue closed: `designInput` throws on unknown keys; UI offers dropdowns only; no custom parts | `src/lib/drone/design.ts:17-19`; `DesignPanel.tsx:70-99` | [drone-calc-lab] | high | M (after B3-01) | PB, CC |
| B3-03 | `calc` has no input validation or units handling; `mah=0` gives Infinity or NaN | `calc.ts:151-230` | [drone-calc-lab] | high once custom parts exist | S | CC |
| B3-04 | Constants and catalogue inherited from a third-party site; licence and provenance undecided | `docs/research/drone-lab-b-calc-matrix.md:3` | Catalogue entries are generic classes, not SKUs [drone-calc-lab] | high (legal) | founder decision | OPS |
| B3-05 | Wing top speed overstated (static thrust at speed); hover current constant g/W; no sag or load-dependent efficiency | `calc.ts:~189,~207` | Test pins 146 km/h for an 8x6 wing [drone-calc-lab] | medium | M | FID |
| B3-06 | "445 calculator tests" metric is mislabelled (384 calculator, 342 golden; rest CLI/store/fly) | `HANDOFF.md:104` | JSON reporter per file [drone-calc-lab] | low | S | none |
| B3-07 | Scoped vitest suite takes 128 s (figure-based craft tests); content test imports `CliConsole` | `drones/_checks.ts` | [drone-calc-lab] | low | M | none |
| B3-08 | `hydrate` and `readBenchSummary` accept room-supplied `cli`/`flight` objects with top-level shape checks only | `src/lib/dronelab/store.ts:~120-125`; `session.ts:23-26` | [drone-calc-lab] | medium | S | COL |
| B3-09 | `sim.ts` is a 1028-line god module (all craft classes, autopilots, scoring in one 100-field mutable `SimState`) | `src/lib/flight/sim.ts` | I confirmed 1028 lines [flight] | high | L (1-2 wk) | PB, FID |
| B3-10 | Attitude is angle-lag, not rate PID; no inertia, motors, sensors; tuning lessons cannot be simulated | `sim.ts:496-533` | [flight] | high if product wants tuning | XL (3-6 wk) | FID, PB |
| B3-11 | Faults are scripted flips with magic constants (900, 500, 400, 300 deg/s; 0.25 s, 1.5 s) | `sim.ts:513-590` | [flight] | high (tied to B3-10) | with B3-10 | FID, CC |
| B3-12 | Registry coupled to `DroneContent` and static `DRONES` palette; no user `CraftSpec` or course schema | `registry.ts:164,208,260` | [flight] | blocker for flight builder | L | PB |
| B3-13 | Lap times client-claimed; no server-side log verification though replay exists | `src/lib/server/db/schema.ts:32`; `FlyWorkspace.tsx:123` | [flight, server-data] | high for competition | M | EDU, OPS |
| B3-14 | Sim and replay on main thread; ghosts/crash replay re-simulate from step 0 synchronously | `FlightRange.tsx` loop | ESTIMATED 60-130 ms hitch [flight] | low to medium | M | PB |
| B3-15 | SVG `innerHTML` rebuilt per frame plus per-frame postMessage; no WebGL; draw cost claimed only in a source comment | `figures/flight/src/iso.js:272-315`; `fpv.js:218` | [flight] | medium | L if 3D wanted | FID |
| B3-16 | `FlightRange.tsx` 846 lines; `DroneWorkspace.tsx` 425; `FlyWorkspace.tsx` 409 | those files | [flight, drone-calc-lab] | medium | M | none |
| B3-17 | Committed build artefact `public/figures/flight/range.html` can drift from `figures/flight/src`; `FLIGHT_KEYS` duplicated in `main.js` and `input.ts` | `figures/flight/build.mjs` | [flight] | low | S | OPS |
| B3-18 | Collision is a sphere against boxes checked once per step; tunnelling possible at 20 m/s | `world.ts:117` | HYPOTHESIS, not reproduced [flight] | medium | S to test | FID |
| B3-19 | No geofence for multirotors; replay cross-engine equality untested | `sim.ts:896-910` | Benchmark flew to 1334 m [flight] | low | S | FID |

## B4. Lab UI and stores

| ID | Item | Path | Evidence | Sev | Eff. | Blocks |
|---|---|---|---|---|---|---|
| B4-01 | Learner code, robotics task code and step session not persisted | `boardlab/store.ts` (code in state only); `values.ts:6` | Edit and F5 loses it [boardlab-robotics-ui] | high | S to M | ACC, PB, EDU |
| B4-02 | Two store architectures behind `LabStore` (pure reducer + runner vs reducer-with-effects) | `boardlab/store.ts:207`; `robotics/store.ts:~135` | [boardlab-robotics-ui] | medium | M | PB, COL |
| B4-03 | Robotics effect handlers inside `BenchWorkspace.tsx`; sends dropped when figure is null | `BenchWorkspace.tsx:~128-165,~132` | Defect 2 [boardlab-robotics-ui] | medium | S | none |
| B4-04 | `LabRoom` and `attachStore` both monkey-patch `store.dispatch` | `src/components/dock/LabRoom.tsx:50,59`; `src/lib/realtime/store-sync.ts:143,153` | I grepped these assignments [boardlab-robotics-ui, realtime] | medium | M | COL |
| B4-05 | UI state (tab, yaw, xr) outside the store, invisible to rooms and replays | `LessonWorkspace.tsx`; `BenchWorkspace.tsx` | [boardlab-robotics-ui] | low | S | COL |
| B4-06 | Duplicated serial/hydrate/media-query/notice code across labs; oversized workspaces (565/438/427 LOC) | `src/components/{boardlab,robotics,dronelab}` | [boardlab-robotics-ui] | medium | M | none |
| B4-07 | Types imported from components into lib (`LabStore`, `HostCommand`, `LabKind`); `lib/boardlab/store.ts` imports from `components/dock` | see A2 | I grepped 6 instances | low | S | none |
| B4-08 | Hard-coded catalogue tables (`BENCH_MONTH`, `BOARD_PRODUCT`, `VARIANT_PRODUCT`), `isBoardId` gating, progress key grammar | `robotics/catalog.ts:13-45`; `progress/keys.ts:3-12,15` | [boardlab-robotics-ui, shell-i18n] | high | M | PB |
| B4-09 | Practice tasks run with `variant: null` | `robotics/runner.ts:~31` | Pi 4 vs Pi 5 uses default profile [boardlab-robotics-ui] | low | S | none |
| B4-10 | Checks depend on live figure state, so a server re-run needs figure state too | `boardlab/run.ts:~345`; `check-job.ts:15-33` | [boardlab-robotics-ui] | medium | M | EDU |
| B4-11 | Single-file editor, plain textarea in robotics | `CodeEditor.tsx` | [boardlab-robotics-ui] | medium | M | PB |
| B4-12 | `ARCHITECTURE.md` ownership table names nonexistent `src/lib/board/**` | `docs/ARCHITECTURE.md:122` | [boardlab-robotics-ui] | low | S | none |
| B4-13 | Thin UI tests: no test renders `LessonWorkspace`; no tests for CodeEditor, FailurePanel, SerialMonitor, AssemblyPanel, WorldPanel | `grep` in inventory | [boardlab-robotics-ui] | medium | M | none |

## B5. Realtime

| ID | Item | Path | Evidence | Sev | Eff. | Blocks |
|---|---|---|---|---|---|---|
| B5-01 | Peer-id takeover: reusing the host's id gives host and kick rights; kick evaded by reload | `relay.js:231,248-257`; `room.js:122-127` | Reproduced with `audit/realtime/hijack.mjs` [realtime] | high | M | COL, EDU |
| B5-02 | No auth; 6-char room code is the only credential; probe is an enumeration oracle; hidden "lobby" listeners hold a seat | `protocol.js:9`; `probe.ts:41` | ~29.8 bits (ESTIMATED) [realtime] | high | M | COL, EDU |
| B5-03 | Lab names hard-coded in relay (`LABS`) and client (`LabKind`, `labSync`); room binds one lab+item | `protocol.js:7,157-170`; `relay.js:235-241`; `shared-actions.ts:129` | I read `protocol.js:7` [realtime] | high | M | COL, PB |
| B5-04 | Memory-only state; every deploy drops all rooms | `relay.js` | [realtime] | high | L | COL, ACC |
| B5-05 | No protocol version or capability negotiation; protocol defined twice (JS relay, TS client) | `protocol.js`; `protocol.ts` | [realtime] | medium | M | COL |
| B5-06 | Shared-action whitelists hand-maintained per lab | `shared-actions.ts` | [realtime] | medium | M | COL, PB |
| B5-07 | Baton model: whole-text replacement, no CRDT/OT; `room/baton` not receiver-authorized | `store-sync.ts:94-138`; `room.ts:588-596` | [realtime] | medium (MVP), high for authoring | XL for CRDT | COL |
| B5-08 | Dead presence-based baton in the relay duplicates the client's action-based baton | `relay.js:390-413`; `protocol.js:206` | [realtime] | low | S | none |
| B5-09 | No divergence detection or resync; `drain()` skips sequence holes | `room.ts:570-586` | [realtime] | medium | M | COL |
| B5-10 | Outbox head-of-line blocking at 64 KB; silent snapshot failure at 512 KB; ceilings small for real projects | `room.ts:396-411,533-543`; `ws-transport.ts:141-147` | [realtime] | medium | M | COL, PB |
| B5-11 | Client fights takeover (`replaced` not in `END_CODES`) | `room.ts:61-68`; `ws-transport.ts:115-120` | [realtime] | low | S | COL |
| B5-12 | `relay.js` is a 630-line single closure; JS+JSDoc relay vs TS client, two test runners; load test not in `npm test` | `relay.js` | I confirmed 630 lines [realtime] | low | M | none |
| B5-13 | Image built on the 1 vCPU prod VM via rsync and `compose up --build`; VM compose project still `simlab-realtime`; root SSH `accept-new`; `/metrics` public through Caddy | `scripts/realtime-deploy.sh:21,56`; `deploy/realtime/Caddyfile:4-6`; `compose.yaml:3` | [realtime, tooling-tests-e2e] | medium | S to M | OPS |
| B5-14 | `NEXT_PUBLIC_REALTIME_URL` inlined at build time | `config.ts:16-19` | [realtime] | low | S | OPS |
| B5-15 | Room-creation DoS (any join creates a room; cap 500; IPv6 /64 keys) | `relay.js:220-229` | HYPOTHESIS on IPv6 [realtime] | medium | S | COL, OPS |
| B5-16 | No component or e2e tests for the React layer; load test is loopback on a 14-core Mac only | `server/realtime/test/load.js` | [realtime] | medium | M | COL |

## B6. AI, search and MCP

| ID | Item | Path | Evidence | Sev | Eff. | Blocks |
|---|---|---|---|---|---|---|
| B6-01 | In-memory rate limits, AI budget, SerpApi counter and caches; per instance; counter never resets | `src/lib/server/ratelimit.ts:15`; `serpapi.ts:138,198-201`; `ai/guard.ts:8,22`; `translate/route.ts` | Total spend = instances x limit [ai-search-mcp, server-data, solana] | high | M | OPS, AI |
| B6-02 | No identity on AI/search/MCP routes; origin check passes a missing `Origin`; `clientIp` trusts `x-real-ip` then `x-forwarded-for` | `http.ts:128-148` | 23 of 23 routes unauthenticated [SECURITY_BASELINE] | high | M to L | OPS, AI, ACC |
| B6-03 | SerpApi key on Free plan with 0 of 250 left (429 verified 2026-10-26); live pricing dead; one cold BOM view costs 32-54 searches; `find_parts` up to 30 per call | `serpapi.ts:123,220`; `tools.ts:44` | Probe run [ai-search-mcp] | high | S (plan) + M (cache) | OPS |
| B6-04 | Change proposals stored as finished full-text replacements; no revision check | `bench/board.ts:62-69`; `conversation.ts:220`; `store.ts:211-214` | [ai-search-mcp] | high | S to M | AI, COL |
| B6-05 | Bench serialisation by key-name guessing; adapters return `parts: []`, `nets: []`; prompt hard-codes three labs | `src/lib/ai/bench/generic.ts`; `board.ts:47-48`; `robotics.ts:44-45` | [ai-search-mcp] | medium | M | AI, PB |
| B6-06 | Search tool output unfenced in prompt; `ask_peer` runs without confirmation | `src/lib/server/ai/tools.ts:38-45`; `run-tools.ts:76-86` | [ai-search-mcp] | high | S | AI, COL |
| B6-07 | `propose_change` schema advertises kinds each lab rejects | `bench/board.ts:60-63`; `robotics.ts:60-63` | [ai-search-mcp] | medium | S | AI |
| B6-08 | BOM, plan, match, optimiser, MCP catalogue tools and `create_room` hard-wired to the 12/13/13 ids | `bom.ts`; `plan.ts`; `catalog.ts`; `src/lib/search/optimize.ts` | [ai-search-mcp, drone-calc-lab] | high for PB | L | PB, AI |
| B6-09 | No server usage or cost ledger; `done.usage` goes to the browser and is dropped; `cachedTokens` discarded | `chat/route.ts:94,123-125` | [ai-search-mcp] | medium | S | OPS |
| B6-10 | Guard budget counts HTTP requests, not model calls (up to 16 calls per question against a "900 per hour" figure) | `guard.ts:8,22`; `chat/route.ts:17`; `conversation.ts:17` | [ai-search-mcp] | medium | S | OPS |
| B6-11 | Hand-written MCP transport for two protocol eras; official SDK only in tests; modern era checked against spec text; MCP routes open with CORS `*`; shared bucket for `plan_build_night`; every tool annotated `readOnlyHint: true` | `mcp/http.ts:6-12`; `registry.ts:74`; `backends.ts` | Muse connector never tested [ai-search-mcp] | medium | M | AI, OPS |
| B6-12 | No evals, no safety or prompt-injection tests; LLM gives LiPo/mains advice | `partner.ts` rule 4 | [ai-search-mcp] | medium | M | AI, EDU |
| B6-13 | Conversations vanish on reload; no chat persistence | `conversation.ts:230` | [ai-search-mcp] | low | M (with ACC) | ACC, AI |
| B6-14 | Peer names and `done` lists injected into a system message by other room members | `partner.ts:49-53` | [ai-search-mcp] | medium | S | AI, COL |
| B6-15 | Model id drift; hackathon-contract naming (`HX-CONTRACT`, `hx:*`); `searchUsage()` unused; docs drift on what the budget counts | `env.ts:36,41`; `AI.md` | [ai-search-mcp] | low | S | OPS |

## B7. Server, data and identity

| ID | Item | Path | Evidence | Sev | Eff. | Blocks |
|---|---|---|---|---|---|---|
| B7-01 | No project, user or document persistence; no identity beyond the buddy token | `db/migrations/*.sql` | `grep -c "CREATE TABLE"` is 1, 0, 1 across the three migrations [server-data] | blocker for ACC | L | ACC, PB, COL |
| B7-02 | Telemetry not idempotent (no event id); duplicates inflate counters | `client.ts:230-233,278`; `insertEvents` | [server-data] | medium | S | OPS |
| B7-03 | Leaderboard forgeable: laps range-checked, never replayed; caller picks session id and name | `schema.ts:30-34`; `kinds.ts` | [server-data] | high for competition | M | EDU |
| B7-04 | `laps_best_daily` no retention and no index; leaderboard scans all days | `0002`; `queries.ts:54-61` | [server-data] | medium (scale) | S | OPS |
| B7-05 | Migrations not wired into build or deploy; TimescaleDB DDL has not run in any test the inventory could execute (`timescale.test.ts` skipped) | `scripts/db-migrate.mjs` | [server-data] | medium | S to M | OPS, ACC |
| B7-06 | Only `iynk:v1` is versioned and its MIGRATIONS table is empty; about 8 ad hoc localStorage keys; downgrade rewrites newer data; settings live in the progress blob | `progress/storage.ts:58,70-72,108` | [server-data, shell-i18n] | medium | M | ACC |
| B7-07 | `src/lib/server` mixes data, AI, MCP, search and Solana in one folder (78 files) | `src/lib/server/` | VERIFIED: `find src/lib/server -type f | wc -l` = 78 (13 top-level entries) | low | M | none |
| B7-08 | `credential.issued` kind has no emitter; hand-rolled Postgres array literal; free-text `wants`/`interests` reach the AI match prompt | `queries.ts:22` | [server-data] | low | S | none |
| B7-09 | Buddy pool and rooms have no moderation, report, block, age or consent flow | `Buddies.tsx`; `SECURITY_BASELINE` | Product risk for children | high (launch) | L | EDU, OPS |
| B7-10 | Telemetry defaults to ON (opt-out) | `progress/storage.ts:38` | [shell-i18n] | medium (legal) | S | OPS |

## B8. Solana and credentials

| ID | Item | Path | Evidence | Sev | Eff. | Blocks |
|---|---|---|---|---|---|---|
| B8-01 | Credentials forgeable: server folds a client-supplied event log; a 7-event forged log passes | `src/lib/verify/drone-safety.ts:25-31,68`; `verify/index.ts:11,66` | Reproduced in solana inventory | high | M to L | EDU |
| B8-02 | No proof of wallet ownership at issuance; bounty farming possible | `attest.ts:10-17` | [solana] | high | M | OPS |
| B8-03 | One hot key is issuer, fee payer and faucet treasury; admin and upgrade authority on one laptop key | `SOLANA.md` Keys | [solana] | high | M | OPS |
| B8-04 | Only 1 of 5 run kinds mintable; program has no close/revoke; rent never reclaimable (about 0.0024 SOL each) | `verify/index.ts:11,66` | [solana] | medium | M | EDU |
| B8-05 | In-memory faucet and rate-limit state; devnet hard-coded in `config.ts`/`env.ts` | `faucet.ts` | [solana] | medium | S to M | OPS |
| B8-06 | Hand-written Borsh codec duplicates IDL; unused `@solana/wallet-adapter-react-ui`; dead `TipButton` and tip helpers | `passport.ts`; `actions.ts` | [solana] | low | S | none |
| B8-07 | Web3 code (80-130 KB gzip ESTIMATED) may load on every lab page; lazy-load `PassportPanel` | `src/components/solana/` | [solana] | medium | S | OPS |
| B8-08 | Wallet secret in plaintext localStorage (devnet) | `devnet-wallet.ts` | [solana] | low (devnet) | S | OPS |
| B8-09 | SBPF v3 rebuild if SIMD-0500 activates; 34 on-chain tests not run by the audit; no external audit | `solana/` | [solana] | low | M | OPS |
| B8-10 | Legal exposure (escrowed bounties, faucet, immutable wallet-linked records) | n/a | HYPOTHESIS, not legal advice [solana] | high before mainnet | counsel | OPS |

## B9. Shell, i18n and web

| ID | Item | Path | Evidence | Sev | Eff. | Blocks |
|---|---|---|---|---|---|---|
| B9-01 | Closed `NavId` union and per-lab hard-coding in nav, redirects, 404, dashboard, progress | `src/components/shell/nav.ts:5`; `next.config.ts:49-50` | I read `NavId` [shell-i18n] | high | M | PB |
| B9-02 | Routes prerendered from compile-time lists (about 780 pages) under `ensureStatic = "navigation"`; no dynamic project route | `[lang]/layout.tsx:24`; `boards/_lib/load.ts:52` | ESTIMATED 130 x 6; build not run [shell-i18n] | high | M | PB |
| B9-03 | Prose is repo JSON loaded by path; no runtime content source or on-demand translation for user text | `i18n/server.ts:59,75-84` | [shell-i18n] | high | M | PB, ACC |
| B9-04 | No `sitemap.xml`, `robots.txt` or JSON-LD; `siteUrl()` falls back to `http://localhost:3000` | `i18n/seo.ts:9-14` | `ls src/app public` [shell-i18n] | medium | S | OPS |
| B9-05 | `dir="ltr"` hard-coded; figure iframes unaudited for RTL | `layout.tsx:57` | [shell-i18n] | low today | M | none |
| B9-06 | No forced-colors or prefers-contrast support; axe covers 2 pages; accent fill 2.67:1 on paper (must not carry text) | `globals.css:157,362-367` | [shell-i18n] | low to medium | M | OPS |
| B9-07 | Feature-gated nav appears after `/api/status` fetch (layout shift, crawlers miss it) | `lib/features.ts`; `nav.ts:23-24` | [shell-i18n] | low | S | none |
| B9-08 | Hackathon build knobs in `next.config.ts` (`IYNK_BUILD_SKIP_TYPECHECK`, `NEXT_DIST_DIR`) | `next.config.ts` | [shell-i18n, tooling-tests-e2e] | low | S | OPS |
| B9-09 | Duplicated language-cookie write in `LanguagePicker` and `FooterNav` | `components/shell/` | [shell-i18n] | low | S | none |
| B9-10 | Translation quality unreviewed; tests allow up to 10% copy-through; 190k lines of JSON in repo | `src/i18n/` | [shell-i18n] | medium | M | EDU |
| B9-11 | `/` and lab redirects are 307 and cover 7 sections; Accept-Language matcher ignores q-values | `next.config.ts:49-50`; `config.ts:87-90` | [shell-i18n] | low | S | none |

## B10. Tooling, tests and delivery

| ID | Item | Path | Evidence | Sev | Eff. | Blocks |
|---|---|---|---|---|---|---|
| B10-01 | No CI, no git hooks, no recorded Vercel settings; production deploy is `vercel deploy --prod` from a laptop | repo root | No `vercel.json`; no workflows [tooling-tests-e2e] | high | M | OPS |
| B10-02 | jsdom tests wait on real-frame animation with 40-120 s timeouts; 3 failed under load | `drones/_checks.ts:362`; basys3, octo, wing tests | 225 s full run [tooling-tests-e2e] | medium | M | OPS |
| B10-03 | E2E depends on the developer's `.env.local` (and may touch production); `npm run check` not hermetic; prebuild regenerates a tracked file | `playwright.config.ts:13-15,33` | HYPOTHESIS, strongly supported [tooling-tests-e2e] | high | S to M | OPS |
| B10-04 | Built figures not rebuilt or diffed by any check; `cfbuild.py` outside npm scripts; Python is a hidden test dependency | `figures/tools/cfbuild.py`; `testkit.mjs:16-19` | [tooling-tests-e2e] | medium | S | OPS |
| B10-05 | Three package roots and lockfiles; relay and Anchor tests outside `npm run check` | `server/realtime/`, `solana/` | [tooling-tests-e2e] | medium | M | OPS |
| B10-06 | 15 `npm audit` findings (2 high in the Anchor/toml chain, 13 moderate); no Renovate/Dependabot or audit step | `package.json` | `npm audit --omit=dev --json` [tooling-tests-e2e, SECURITY_BASELINE] | medium | S | OPS |
| B10-07 | No security headers on pages or API routes (only `/figures/*`): no CSP, HSTS, Referrer-Policy, Permissions-Policy | `next.config.ts:23-35` | `grep` finds only that file [tooling-tests-e2e, SECURITY_BASELINE] | medium | S to M | OPS |
| B10-08 | E2E covers Chromium only; no real relay/AI/search/DB/Solana; axe excludes figure iframes; hard-coded counts and `test.skip` on missing content | `e2e/*.spec.ts` | 119 tests listed, not run [tooling-tests-e2e] | medium | M | OPS |
| B10-09 | Undeclared script dependencies (`playwright`, `sharp`, `acorn`) | `scripts/` | [tooling-tests-e2e] | low | S | OPS |
| B10-10 | `scripts/workflows` agent-orchestration files (2,773 lines) live in the product repo | `scripts/workflows/` | [tooling-tests-e2e] | low | S | none |
| B10-11 | Docker images pinned by tag not digest; node 24 required (type stripping needs >= 22.18) | `Dockerfile`; `package.json:5` | [tooling-tests-e2e] | low | S | OPS |
| B10-12 | No coverage tooling; no performance budget, bundle-size or web-vitals check | `package.json` | [tooling-tests-e2e] | medium | S | OPS |

## B11. Docs, legal and process

| ID | Item | Path | Evidence | Sev | Eff. | Blocks |
|---|---|---|---|---|---|---|
| B11-01 | No LICENSE; lessons, timings and test fixtures derived from three third-party sites with no permission on file | repo root | [docs-claims-history] | high (legal) | days of review | OPS |
| B11-02 | Provenance: first commit `d5bdf44` is 900 files and 310k lines stamped 15:30:42, so git cannot prove "all code written after 11:30" | git history | [docs-claims-history] | medium; needs a PROVENANCE note | S | OPS |
| B11-03 | Machine-local project memory (transcripts, scratch, wallet, keypair, env, backup branch); high bus factor | `~/simlab-scratch-backup`, `.env.local` | [docs-claims-history, MEMORY] | high | S to M | OPS |
| B11-04 | Docs contradict production (DECISIONS B21/B30, JUDGE-QA, PITCH, DEPLOY env table) | `docs/` | [docs-claims-history] | medium | M (about 1 day) | OPS |
| B11-05 | 104 request files with no status; hackathon sales docs mixed with maintained docs | `docs/requests/` | [docs-claims-history] | medium to low | M (2 days) / S | none |
| B11-06 | Counts live in prose in 6+ places; no doc test; fact sheets are 17,823 lines with no machine-readable extract, 7 never adversarially checked | `docs/` | [docs-claims-history] | medium | S to L | FID |
| B11-07 | `ARCHITECTURE.md` changelog ends at v1.9 (10-25 00:51); `docs/verify/repo-health.md` is a stale snapshot; HANDOFF.md is a 382-line append-only log with stale state | `docs/ARCHITECTURE.md`; `HANDOFF.md` | [docs-claims-history, tooling-tests-e2e] | low to medium | S | none |
| B11-08 | Rename leftovers (`simlab` in DB migration table and job names, Vultr stack, `cfshoot.py`, `db-migrate.mjs`) | `db/migrations`; `scripts/` | Careful DB job rename needed [docs-claims-history] | low | S | none |
| B11-09 | No CONTRIBUTING, SECURITY or ops runbook beyond DEPLOY.md | repo root | [docs-claims-history] | medium | S to M | OPS |

Register size: 16 + 27 + 19 + 13 + 16 + 15 + 10 + 10 + 11 + 12 + 9 = 158 rows (VERIFIED: `grep -c "^| B[0-9]*-[0-9]* " TECHNICAL_DEBT.md` = 158). Some inventory bullets were merged and some rows combine two to three related inventory bullets (for example B6-11, B9-06, B2-24).

Items in the task list that I deliberately merged: in-memory rate limiters (ai-search-mcp, server-data, solana) into B6-01; live-run-on-main-thread (interp, boardlab-robotics-ui) into B2-20; committed figure builds (figure-engine, figure-items, tooling) into B2-10; vendored-core patching (figure-engine, figure-items) into B2-11; `dispatch` monkey-patching (boardlab-robotics-ui, realtime) into B4-04; build knobs (shell-i18n, tooling) into B9-08; lib-imports-components (boardlab-robotics-ui, drone-calc-lab) into B4-07; stale-docs rows (tooling, docs-claims-history) into B11-07.

---

# Part C. Debt we should NOT pay

These are real imperfections that do not hurt the product as it will be. Paying them would cost time that Part D needs. Revisit only if the trigger in the last column fires.

| Item | Why leave it | Evidence | Revisit when |
|---|---|---|---|
| Arcade flight model (angle-lag, scripted faults) for the existing 13 crafts | It is tuned to the calculator, deterministic, tested (96 tests) and good enough for "teach and gamify". Replace only for user-defined craft or tuning lessons. Keep it as the "arcade" class beside a future dynamics core. | flight "Recommendation"; B3-10, B3-11 | The product promises "predict how my design flies" |
| DC solver depth for the 46 fixed lesson circuits | Fast (0.02-0.28 ms), tested, fine for fixed lessons. Do not add capacitors to the old solver; write the new pure solver instead (change 2). | figure-engine "Performance" | A lesson needs transient behaviour |
| Hand-drawn part and board art (29 parts, 12 boards, 13 drones) | It is the product's look. Keep as a catalogue next to generic parts. | figure-items "Reusability" | Never, as a rewrite; only add a generic fallback |
| Python and Verilog being language subsets | Lessons are written for the subset. Document the subset in the UI and add friendly errors. Do not chase full CPython or full Verilog; use an emulator route for projects outside the subset. | interp "Purpose" | A large share of user projects fail compile |
| Interpreter file length (four files over 1,200 lines) | Tested (189 tests), no defect traced to size. Split only when touching them. | B2-16 | A feature needs edits in two of them |
| Dense one-line engine style and hackathon agent-role comments | Cosmetic. Clean as files are touched. | B2-13 | Onboarding a new engineer |
| Two store designs behind `LabStore` | Both work behind one interface and pass tests. Unify only when the project model arrives and rooms need effects visible. | B4-02 | Change 5 lands |
| Baton collaboration for lessons | Correct for teacher/student and driver/navigator. Do not build a CRDT for the MVP. Fix identity and persistence first. | realtime "Reusability" | Users demand simultaneous editing of one file |
| Tab-only BroadcastChannel fallback | A working offline/demo mode, tested. | realtime "Current functionality" | Never |
| Relay as a single Node process | Load test shows 0 gaps at 8 peers; one process is fine until room counts grow. Fix auth and persistence before scaling out. | realtime load test (loopback, 14-core Mac) | More than a few hundred concurrent rooms (UNKNOWN threshold; needs a VM-realistic load test) |
| Drone calculator for the 13 catalogue crafts | A faithful, tested port. Do not tune constants by hand; replace the model for custom parts, keep it for catalogue crafts. | drone-calc-lab | Legal review forces removal of the inherited constants |
| Solana program internals | Small, on one read correct, and detachable. Fix the trust anchor (B8-01, B8-02) or remove the feature; do not extend the program. | solana "Security" 8 | Founder decides whether credentials are in scope |
| Per-item test files for the catalogue | They pass and protect content. Replace structurally (B1-11) only after a schema validator exists. | content-schema | Validator lands |
| Hackathon sales docs (PITCH, VIDEO, STRATEGY, JUDGE-QA, DEVPOST-*) | Archive, do not rewrite. | docs-claims-history | Never |
| `ARCHITECTURE.md` as the schema log, DECISIONS and fact-sheet standard | Strong and honest. Keep; reconcile contradictions only. | docs-claims-history | n/a |
| Duplicated cookie write, duplicate `max` builtin, stale ULN2003 comment, `FLIGHT_KEYS` duplication | Trivial. Bundle into any nearby edit. | B9-09, B2-24, B2-14, B3-17 | Never separately |
| 7 or more patches on the vendored drawing core | Works and is deterministic. Only fix the home-directory path (B2-11) so a clean machine can rebuild. | figure-engine | Upstream changes |
| RTL support, forced-colors | Not needed for the six shipped languages. Cheap to defer. | B9-05, B9-06 | An RTL language is added |

---

# Part D. The five structural changes with the best leverage

Ranked by how many register rows and blocked capabilities each one removes. They are ordered so that each makes the next cheaper. Before change 1, two small gates (not structural, but they decide whether the rest is safe): (a) CI that runs `tsc`, `eslint`, `content:check`, vitest and a figure-rebuild diff (B10-01 to B10-04), and (b) the licence and provenance decision (B11-01, B11-02, B3-04). Both are cheap, and without them every later change ships blind or carries legal risk.

## D1. A JSON project document with open ids, a schema version and a runtime content source

Define one `Project` document: schemaVersion, board, files (so more than one), parts, nets, pin map, world script, checks, faults as rules, and prose with inline per-locale text. Validate it at runtime (zod is already used on every route). Make ids open strings backed by a registry, and unify the two `BoardId` unions. Reuse `Check`, `WorldModel`, `CodeTemplate`, `FailureMode` and `BuildStep` unchanged; the content inventory shows they are structurally generic and the Board Lab already runs them on 12 profiles. `gen-content-index.mjs --emit` (`gen-content-index.mjs:156-163`) already emits `{meta,data,en}` JSON per item, so the 38 catalogue items can be converted and become the first valid projects, which gives a regression corpus for free. Add a dynamic `/[lang]/projects/[id]` route outside the static guarantee and a DB-backed loader behind `getContentProse`. This removes B1-01 to B1-09, B9-01 to B9-03 and B4-08, and unblocks PB, ACC and EDU. Effort L. Evidence: A1, A8, content-schema "Required refactoring" 1 to 8, shell-i18n "Reusability".

## D2. A pure, data-driven part and net graph, solver, and sandboxed generic renderer

Make the schematic-level graph the source of truth and breadboard layout a view. Extract the solver to a pure module `solve({nodes, elements, sources}) -> {volts, currents, states, converged}` with no `B.*` globals, per-board and per-part constants read from data, and structured results. Reuse the union-find and `linsolve` as a seed and the 126 existing tests as a starting corpus; add a SPICE or hand-calculated golden set (A13). Define parts as data (type plus params) with a drawing fallback, and keep the 29 hand-drawn parts as a catalogue. Send circuits over the existing `set` bridge, which is already versioned and origin-checked. Serve figures from a separate origin with `sandbox="allow-scripts"` and a strict CSP, and ship one shared engine bundle instead of 80 inlined copies. This removes B2-01 to B2-11 and the figure half of B1-01 and B1-02, and unblocks PB, CC and FID. Effort XL (the solver extraction alone is 3 to 5 weeks per the figure-engine inventory). Evidence: A3, A5, figure-engine "Required refactoring" 1 to 10, figure-items "Reusability".

## D3. Identity and durable server state: projects table, shared limiter, usage ledger, server-side verification

Add anonymous signed sessions first, accounts later, using the token-hash ownership pattern already in `profiles` (`0003`). Add a `projects` table with zod bodies, the features.db gate and the existing 502/503 contract, so it fits the current pattern without a rewrite (server-data "Reusability"). Replace the in-memory limiter, AI budget, SerpApi counter and translation cache with one shared store; add a server-side usage ledger for tokens and searches; add an idempotency key to telemetry; wire migrations into deploy. Put the verification runner behind this: re-run `replay()` for flight laps (pure TypeScript, no DOM, flight "Required refactoring" 5) and re-run `runHeadless` in an isolated process with memory and output caps (needs B2-19). Persist learner code on the client first (B4-01); it is a day or two and the cheapest visible win. This removes B4-01, B6-01 to B6-03, B6-09, B6-10, B7-01 to B7-06, B3-13, B2-21, B8-01, B8-02, B8-05 and the cost and abuse half of SECURITY_BASELINE, and unblocks ACC, AI, EDU and OPS. Effort L to XL. Evidence: A11, A12, B6-01, B7-01, server-data "Reusability", ai-search-mcp "Required refactoring" 4 and 5, SECURITY_BASELINE summary.

## D4. An execution runtime with limits: workers, device and library registries, and an emulator path

Move the live run into a Worker (the interpreter has no DOM dependency, and the check path already has a Worker front door, `check-client.ts`). Add heap, step and output caps so the three OOM repros stop crashing the host. Turn the 11 `DeviceModel` kinds and the hand-ported libraries into registries with a data format for register-level devices, so a user chip is data rather than a TypeScript class. Make unsupported constructs and the SPI stub fail loudly, not silently. Run a time-boxed investigation of avr8js, simavr or Renode (EXTERNAL, not evaluated by any inventory) for projects outside the subset, and use it as a differential test oracle even if it is never shipped. Add hardware-derived goldens (A13). This removes B2-17 to B2-27 and half of B2-18, and unblocks PB, CC, FID and EDU. Effort L for workers, caps and registries; XL for an emulator path. Evidence: A4, A13, interp "Reusability" and "Known defects" D1, D4, D8.

## D5. One revision-safe action protocol shared by rooms, AI proposals, persistence and replay

Today four systems each invent their own way to change a lab: dispatched actions with a keyboard baton (realtime), stored full-text `code/replace` proposals (AI), whole-state localStorage writes (progress), and a `{step, action}` log (flight). Make the lab action a versioned, serialisable operation with a base revision. Then: the relay can reject or rebase stale actions and detect divergence with a state hash (B5-09); an AI proposal stores find/replace plus the revision it was made against and refuses to apply when stale (B6-04, the D5 overwrite defect); persistence stores snapshot plus log (B4-01); replay is the same log (B3-13). Give the relay an opaque document namespace in place of `LABS`, signed room tickets from D3 for identity, and a protocol version field. This also lets the two `dispatch` monkey-patches (B4-04) become one middleware. It removes B5-01 to B5-11, B6-04, B6-05, B6-07, B4-02 to B4-05, and unblocks COL and AI, and makes D1 usable for editing. Effort L. Evidence: A7, A10, realtime "Reusability", ai-search-mcp "Required refactoring" 1 and 2, `LabRoom.tsx:50,59`, `store-sync.ts:143,153`.

Order suggestion (ESTIMATED, one to two engineers): gates, then D3's client-side persistence and shared limiter, then D1, then D5 and D4 in parallel, then D2. D2 is last because it is the longest and because D1 defines the graph it consumes.

---

# What I checked myself in the code

All at commit `bb546d6` (`git rev-parse --short HEAD`). Commands were read-only.

| Claim | Command or file | Result |
|---|---|---|
| Line counts | `wc -l` on `sim.ts`, `schema.ts`, `ids.ts`, `bench-solve.js`, `relay.js`, `profiles.ts` | 1028, 827, 169, 431, 630, 296 (the first five match the inventories) |
| Id unions closed and duplicated | `grep -n "as const" src/content/ids.ts`; `sed -n 1,20p src/lib/interp/profiles.ts` | 5 `as const` arrays at lines 21, 38, 55, 72, 98; `BoardId` union of the same 12 names at `profiles.ts:6-18` |
| `StateCond` loosened | `sed -n 34,50p src/content/schema.ts` | `Partial<Record<string, ...>>` with the `satisfies` comment, `schema.ts:41-44` |
| Figure iframe unsandboxed | `sed -n 349,358p src/components/figure/FigureFrame.tsx` | `<iframe key ref src title loading onLoad aria-busy>`; no `sandbox` attribute in the shown element |
| Takeover branch in relay | `sed -n 246,258p server/realtime/src/relay.js` | an existing peer id is replaced and its record, place and sync state inherited by the new socket |
| Lab enum in relay and client | `grep -n "LABS\|labSync"` | `protocol.js:7` (`LABS` = board, robotics, drone), `protocol.js:160`, `shared-actions.ts:129` |
| `NavId` closed union | `sed -n 1,8p src/components/shell/nav.ts` | line 5, eight literals |
| Solver constants and globals | `grep -n "PIN_R\|ROUNDS\|B.md\|B.st" figures/engine/bench-solve.js` | `PIN_R = 25` at line 10 (inventory says :11, a one-line drift); `B.md` at lines 60 and 250 |
| In-memory limiter | `sed -n 10,16p src/lib/server/ratelimit.ts` | `const hits = new Map<string, number[]>()` with `MAX_KEYS = 10_000` |
| `dispatch` monkey-patching | `grep -rnE "\.dispatch\s*=[^=]"` | `LabRoom.tsx:50,59` and `store-sync.ts:143,153` |
| lib imports from components | `grep -rn 'from "@/components' src/lib` | 6 type-only imports listed in A2 and B4-07 |
| Audit inputs present | `ls docs/MASTER_PLAN/01_AUDIT/` | `CLAIMS.json`, `SECURITY_BASELINE.md`, `inventory/` only; no `runs/` directory |

Not checked by me, carried from inventories with their labels: all test counts and timings, the Solana forged-log repro, the realtime hijack repro (I re-read the code branch only), SerpApi quota, the OOM repros, benchmark numbers, i18n parity counts, `npm audit` results, and everything about production deployment.

The 78-file count for `src/lib/server` was confirmed with `find src/lib/server -type f | wc -l` (13 top-level entries, 78 files in all).
