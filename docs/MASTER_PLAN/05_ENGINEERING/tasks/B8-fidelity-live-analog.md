# B8 task packages: Fidelity, live analog, instruments, replay

Status: plan only, written 2026-10-27 for the build-plan step. No file in `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed to write it. Nothing is committed.
Phase: B8 of `IMPLEMENTATION_ROADMAP.md` (section "B8. Fidelity: live analog, instruments, replay"). The roadmap table lists 20 tasks, T-B8-01 to T-B8-20. This file keeps those 20 ids and their order, expands each to the BRIEF section 27 fields, and adds ten tasks (T-B8-21 to T-B8-30) that the roadmap rows left implicit. The review of 2026-10-27 also split T-B8-05 into 05a and 05b and T-B8-17 into 17a and 17b, so the file now holds 32 task ids. Section 3 says why each was added; the last section lists every review fix.
Labels: VERIFIED (read in code or a file in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN, PROPOSAL.

## 1. Scope of the phase

| Item | Value | Source |
|---|---|---|
| Goal | Computed analog on the live path, fail-loud bus stubs, fidelity registry and tier chips, probes and instruments, snapshot and replay, shared run in rooms | task brief; roadmap B8 |
| Features | F-042, F-043, F-047, F-051, F-053, F-054, F-185, F-207; F-011 made registry-driven | `FEATURE_CATALOGUE.md` lines 123, 172, 173, 181, 192, 193, 196, 415 |
| Requirements | R-099, R-100, R-101, R-107, R-108, R-112, R-114; R-FID-1 to R-FID-5 | `PRODUCT_REQUIREMENTS.md` lines 873 to 886 |
| Not in this phase | Chip engines (avr8js), compile, debugger, Newton devices, transient analysis, bus timing and bus models, BME280 (all B9); the diagnosis detectors and hints (B10); physics and flight engines under `src/sim` (B16, B19) | roadmap B8 non-goals; B9 rows |
| Depends on | B3 (orchestrator, solver, replay), B4 (Studio UI), B7 (rooms) | task brief |
| Exit | `npm run check`; SA-04, SA-06 to SA-09, SA-17 to SA-20, SA-25 and RA-14 and RA-15 recorded; shared run walked with a buddy; then Amar's OK | task brief |
| Build rules | Local branch `build/v1`. One commit per task, message `B8 T-B8-nn: <what>`, authored as Amar Kushwaha, no `Co-Authored-By`, no "Generated with" line. Never push, never deploy. Ports 3000 and 43117 and `.env.local` are off limits. Verification is keyless (`KL` in section 2) | roadmap 2.1 |

Two honest partials. SA-09 has two halves: "SPI.transfer with no device raises `bus-device-not-modelled`" is B8; "bus timing is on and 102 of 102 references still pass" needs the bus models of T-B9-01. SA-25 has a clause "the BRIEF 30 sketch builds", which needs the `Adafruit_BME280` library of T-B9-04. B8 records the clauses it can pass and states the open clause in the evidence file (T-B8-24). This follows the roadmap's own split (T-B9-01 carries "SA-09: 102 reference runs still pass").

## 2. Conventions every task in this file obeys

| Rule | Detail |
|---|---|
| Five-file rule | Each task changes at most 5 source files. Test files, deleted files, and one set of data files of one kind (six language copies of a namespace, a registry data set, board descriptors) count 0 or 1 as in roadmap 2.2. The "Source files" row of each task lists the count |
| Proof commands | `TL` = `npm run typecheck && npm run lint`. `V <path>` = `npx vitest run <path>`. `E <spec>` = `KL NEXT_DIST_DIR=.next-build npx playwright test <spec>`. `SRV` = `cd server && node --test` (after B5; `server/` is the B6 layout). `KL` = `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_REALTIME_URL= DATABASE_URL=` plus any blank name that still exists after T-B0-12. Source: roadmap 2.3, `01_AUDIT/runs/COMMANDS.md` |
| Vitest reach | `vitest.config.mts` includes `src/**/*.test.{ts,tsx}`, `figures/**/*.test.*`, `scripts/**/*.test.*` only (VERIFIED, `vitest.config.mts:11`). Server tests are `node --test`. A test under `docs/` or `e2e/` is not found by Vitest |
| No wall-clock waits | A test never sleeps or polls. Simulation tests step the virtual clock. A host test injects a `HostClock` (`{ nowMs(): number }`). Timing numbers are measured by scripts (T-B8-08), never asserted inside `npm test`, because 13 tests already time out under load (`runs/COMMANDS.md` rows 6 and 7) |
| Portable code | `src/sim`, `src/protocol`, `src/project`, `src/parts`, `src/export` import no DOM and no Node module and pass `npx tsc -p tsconfig.portable.json` (T-B2-01, ADR-0014). Lint bans `Date.now`, `performance.now`, `Math.random`, `eval` inside `src/sim` (T-B3-10, SA-11) |
| Tolerance classes | Every test names its class: B bit-exact, N numeric (`abs(a-b) <= 1e-9*max(abs(a),abs(b)) + 1e-12`), D display (`SIMULATION_ARCHITECTURE.md` 6.9) |
| Test titles | Every test that proves an acceptance id carries it in brackets in its title, for example `[SA-08]` or `[RA-14]`, so T-B8-24 can find it |
| Copy | Every user-visible string is an i18n key in six languages (`en de es fr hi zh`). Words banned unless a registry entry supports them: "validated", "accurate", "exact", "realistic physics", "hardware-accurate", "safe to build" (`SIMULATION_ARCHITECTURE.md` 4.1 rule 5, 16.3 rule 2). No em dash in any string |
| Next.js | 16.4.3. B8 adds no route, no route handler and no `next.config.ts` change. The one Next guide an agent reads is `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (T-B8-20, for loading instrument panels on demand). `AGENTS.md` applies to anything else |
| A task that cannot finish | Stops and reports. It does not widen. It never edits a file owned by another task of the same group (section 6) |
| Preflight | Step 0 of every task: `test -e` each path named in its "Preflight" row. A missing path or a signature that differs from the one written here means the earlier phase landed differently. Stop and report the difference. Do not invent the missing piece |

## 3. Tasks added to the roadmap's twenty

| Added | Why the roadmap rows are not enough |
|---|---|
| T-B8-21 spike SP-B8-01 | R-100 and the ADC formula change (`round(v/vref*max)` at `world.ts:336` becomes `floor(v*2^bits/vref)`) can move lesson check values. The spikes did not measure that. A falsifiable question comes before T-B8-05b |
| T-B8-22 registry data, full coverage | SA-17 needs every part, engine and failure model of the 38 converted projects to have an entry. One data set of that size is its own task. T-B8-03 ships the mechanism and four entries |
| T-B8-23 `docs/FIDELITY.md` and its check | Roadmap "Documentation" names the page; no row writes it. One source of truth: the page is generated from the registry and a check fails if it drifts |
| T-B8-24 exit evidence | "SA numbers recorded" needs a script that runs the acceptance tests and writes the numbers in one file |
| T-B8-25 probe, instrument and hash messages over `SimHost` | Instruments live in the UI thread; the tap lives in the worker; rooms need the two class hashes `hb` and `hd`. The roadmap has no row for the messages between them |
| T-B8-26 room run UI | Roadmap rows 17 to 19 build the channel and test it. Nobody builds the runner badge, "Watching X's run", private run and rejoin buttons. Without them the shared run cannot be walked with a buddy |
| T-B8-27 B8 copy in six languages | Seven tasks need strings. One task owns the three namespace files so no two tasks edit the same JSON in one group |
| T-B8-28 seeded tolerance and bands | F-043 names "seeded tolerance bands (ranges, not single numbers)" and the `Reading.band` field; no roadmap row builds them |
| T-B8-29 mount the run client | T-B8-18 builds `createRunClient` and T-B8-26 builds `RunIndicator`, but no row creates the client from the B7 room transport, routes the run controls to it or mounts the indicator. Without it T-B8-19 cannot pass (review issue 1) |
| T-B8-30 per-board pin model | Split out of T-B8-01: carrying a diagnostic code to the user's line needed `interp.ts` and `python/runtime.ts`, which took T-B8-01 over five files (review issue 14) |

Splits made by the review of 2026-10-27: T-B8-05 became 05a (the solver, `live.ts` only) and 05b (orchestrator, pins, world, bind, ADC) because one task could not hold both (issue 2); T-B8-17 became 17a (shared types, frames, validators) and 17b (channel, hub, server wiring) because the server file that calls the channel was missing and the task needed a sixth file (issues 1 and 4).

## 4. Facts this plan stands on

VERIFIED = read in this step. DOCUMENTED = a plan file says it and the build has not made it yet.

| # | Fact | Evidence | Label |
|---|---|---|---|
| 1 | `src/sim` does not exist yet. B3 creates it | `ls src/sim` fails; roadmap T-B3-10 to T-B3-19 | VERIFIED |
| 2 | No `docs/MASTER_PLAN/05_ENGINEERING/tasks/` file of an earlier phase exists. Names of B2, B3, B4, B7 files below come from the roadmap tables | `ls docs/MASTER_PLAN/05_ENGINEERING` shows only `IMPLEMENTATION_ROADMAP.md` | VERIFIED |
| 3 | `SPI.transfer` returns `0` whatever is wired | `src/lib/interp/arduino/libs.ts:787` (`transfer: { ret: 'uint8_t', fn: () => 0 }`); object table `libs.ts:1435` | VERIFIED |
| 4 | `Serial1` is the same class as `Serial`, so a write to `Serial1` lands in the serial monitor | `libs.ts:1409` (`HardwareSerial: SerialClass`), `libs.ts:1433` | VERIFIED |
| 5 | A bad Arduino pin number raises; a bad MicroPython pin number does not: `pinNo` returns any int, and `World.pin(n)` creates a state for any `n` | `libs.ts:188-194` (`pinArg`); `python/modules.ts:19-29`; `world.ts:220-226`. Only `pin === 64` on a board without Wi-Fi is refused (`modules.ts:280`) | VERIFIED |
| 6 | The ADC count is `Math.round((v / adcVref) * max)` and a floating pin reads shared-stream noise | `world.ts:336`, `world.ts:333` (`this.rng.float()`) | VERIFIED |
| 7 | The edge trace stops silently at 20,000 entries | `world.ts:375` | VERIFIED |
| 8 | Include handling records names only; there is no file resolution | `arduino/parser.ts:87-90`; `parseSketch` at `parser.ts:918-921`; `compileSketch` builds `new Set(unit.includes.map(...))` at `arduino/interp.ts:149-151` | VERIFIED |
| 9 | A method missing from a library class gives one generic message | `arduino/interp.ts:1146-1150` (`${cls} has no method ${name}()`) | VERIFIED |
| 10 | `InterpError` has `kind`, `line`, `col`, `hint` and no `code` and no `file` | `src/lib/interp/errors.ts:10-32` | VERIFIED |
| 11 | Board profiles carry `pinMaxMa` (Uno 40, R4 8, Pico 12, micro:bit 5) and `adcVref`; no pin output resistance and no input thresholds | `src/lib/interp/profiles.ts:89, 105-108` | VERIFIED |
| 12 | The old solver has one pin resistance for every board: `PIN_R = 25`, `RAIL_R = .5`, `GMIN = 1e-9`, `ROUNDS = 40` | `figures/engine/bench-solve.js:10`; pin Norton source at `bench-solve.js:161` | VERIFIED |
| 13 | The LED burn message is computed (`Math.round(ip * 1000)`) but names a fixed "20 mA" | `bench-solve.js:317` | VERIFIED |
| 14 | The five burn rules are LED (317), diode (328), NPN (341), TMP36-type sensor (372), potentiometer track (379) | `bench-solve.js:317, 328, 341, 372, 379` | VERIFIED |
| 15 | Brown-out minimum per board: Uno `min: 2.7` on rail `5V`; ESP32 DevKitC `min: 2.43` on `3V3`; USB `ilim: .5` | `figures/boards/uno-r3.js:134, 120`; `figures/boards/esp32-devkitc.js:149` | VERIFIED |
| 16 | RS-08: linear solve 20 of 20 against matched models, realistic devices 10 of 20 within 2 percent. The six over 10 percent are C16 (229.6), C20 (41.1), C15 (20.8), C08 (12.5), C14 (12.4), C13 (12.3). LED with no resistor: 117.65 mA solver, 114.46 mA realistic. Largest circuit 0.45 ms per solve at 6x throttle | `08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/REPORT.md:5, 103, 158`; `data/results.json` keys `matched_warm`, `realistic_warm` | VERIFIED |
| 17 | The prose "113 mA" survives in `README.md:35`. T-B1-15 rewrites the README, so B8 only guards against it returning | `grep -n 113 README.md` | VERIFIED |
| 18 | Playwright has projects `chromium` and `phone` only. T-B3-21 adds WebKit. WebKit builds are installed locally (`webkit-2248`, `webkit-2370`) | `playwright.config.ts:23-26`; `ls ~/Library/Caches/ms-playwright` | VERIFIED |
| 19 | `simulation.instruments[]` items have `id` (`ins_...`), `kind` in `voltmeter ammeter oscilloscope logic-analyzer serial-monitor serial-plotter multimeter`, `target` with `net`, `pin` or `component`, and `settings` (at most 16 keys). Ops `instrument.set` and `instrument.remove` exist | `schemas/project.schema.json` `$defs.Instrument`; `STUDIO_EDITOR.md:1024` | VERIFIED |
| 20 | `Simulation.solver` is `{ engine, options }` with `options` an open object of at most 32 keys. `toleranceMode` has no schema field of its own | `schemas/project.schema.json` `$defs.Simulation` | VERIFIED |
| 21 | Component `simulation` block: `tier` in `T0 T1 T2 T3 none`, `status` in `modelled partly-modelled not-modelled-yet`, `what_it_models`, `not_modelled`, `validity[]` | `schemas/component.schema.json:1088-1170` | VERIFIED |
| 22 | Run-channel frames and the runner-clocked lockstep are specified: `run.ev`, `run.tick`, `run.check {hb, hd}`, `run.frame` (at most 16 KiB, 10 per second), `run.req`; states `idle running paused halted done`; `start` carries `{atSeq, seed, speed, versions}`; the run log holds at most 50,000 entries | `REALTIME_ARCHITECTURE.md:346-350, 371-382, 637-709` | DOCUMENTED |
| 23 | The 12 ms slice, 4,096-statement yield, `behindReal`, `achievedSpeed`, the 1,000 ms checkpoint cadence and the keyframe rules (10 s interpreters, 5 s physics, at most 64) | `SIMULATION_ARCHITECTURE.md` 6.7, 6.8, 14.5 | DOCUMENTED |
| 24 | Event order is `(at, phase, rank, seq)`; phases P0 to P6; ranks digital 10, analog 20, mcu 30, ros 35, bus 40, mech 50, flight 60, env 70, faults 80, probe 90 | `SIMULATION_ARCHITECTURE.md` 5.5 | DOCUMENTED |
| 25 | `SIMULATION_ARCHITECTURE.md` 5.5 says the mcu tie-break is "registration order, then engine id", while SA-08 says permuting same-rank registration changes no hash. These cannot both hold | `SIMULATION_ARCHITECTURE.md` 5.5 and 19 (SA-08) | VERIFIED conflict, see T-B8-09 and section 10 |
| 26 | Registry id format conflict: 16.3 rule 6 gives `@<major>` for every entry id, while entry 1 is `engine:mna-dc-pwl@1.0.0`. RC-54 separates model ids (`@<major>`) from engine ids (full semver) | `SIMULATION_ARCHITECTURE.md` 16.3 and 16.5; `RECONCILIATION.md` RC-54 | VERIFIED conflict, RC-54 decides |
| 27 | RC-47: no hard-coded 113 mA in prose; cite RS-08; the banner shows the computed value. RC-55: `FidelityEntry.operatingRange`, `FailureModel.evidenceRange`. RC-60: tier names T0 to T3 and the "Checked on a real board" mark; chip shows the lowest tier | `RECONCILIATION.md` rows RC-47, RC-55, RC-60 | DOCUMENTED |
| 28 | A library-method error thrown with no position gets no line: only builtins are wrapped (`wrapErr`, `arduino/interp.ts:1241-1248`, which rebuilds the error at `:1245` and would drop a `code`); object-method calls (`:1136-1139`, `:1160-1167`) are not wrapped. Python's `toInterpError` rebuilds the error from class name and message only (`python/runtime.ts:263-272`). `machine.SPI` and `machine.UART` do not exist (`python/modules.ts:388-391`). `SerialClass` is defined at `libs.ts:682`; `HardwareSerial` is mapped at `:1409`; `Serial` and `Serial1` are at `:1432-1433` and no other file names `HardwareSerial` | `grep` and reads in this step | VERIFIED |
| 29 | `scripts/copy-check.mjs` does not exist. The T-B1-20 roadmap row gives its list as `validated`, `live prices`, `Proof of Build`, `Solana`, `credential`, `sponsor`; only `validated` overlaps our six banned words | `ls scripts/copy-check.mjs` fails; `IMPLEMENTATION_ROADMAP.md:291` | VERIFIED |
| 30 | RS-08 `data/results.json` is an array of 20 objects (`id`, `title`, `rails`, `sagmA`, `states`, `matched_warm`, `matched_cold`, `realistic_warm`, `realistic_cold`, `afterBurn`); `matched_warm.rows[]` hold `{kind 'V' or 'I', name, solver, spice, rel, ok, small}`. Q1 is `'on'` in C15 and C16 and `'hot'` in C20; no circuit reports `'sat'`. C10 current is 0.11765 A | read with `python3` in this step | VERIFIED |
| 31 | B7 leaves the run channel to B8: `welcome` carries `runner: null` and `run: null`, `"run"` is not in `CLIENT_CAPS`, and `run.*` frames and the commands `runner.set` and `run.detach` are refused (decision D21). The socket loop is `server/src/ws/dispatch.ts`; `RoomCore` is `server/src/rooms/core.ts`; its only post-commit hook, `afterCommit`, is a test seam; `RoomClient.send(frame)` and `on(h)` carry ephemeral frames, and `ws/server.ts` only upgrades the socket | `B7-collab-rooms-shares-board.md:114, 252, 596-609, 1258-1271, 1660-1692` | DOCUMENTED |
| 32 | Binding architecture names: `AnalogSolver { load(net, o: SolveOptions): LoadReport; apply(changes: Change[]); advanceTo(t): AnalogStepResult; snapshot(); restore() }` (7.2); `Change`, `AnalogStepResult { at, converged, solves, skippedClean, events: SimEvent[], diagnostics, worstKclAmps }`, `LoadReport { ok, components, nodes, elements, unmodelled: { part, reason }[], diagnostics, modelIds }` (A.3); `EngineSnapshot` and `OrchestratorSnapshot { format, docHash, at, seqNext, queue, rng, logCursor, engines, stateHash }` (A.2) | `SIMULATION_ARCHITECTURE.md:649-654, 2140-2150, 2185-2208` | VERIFIED |
| 33 | `sim.set` takes `key` in `seed`, `duration_ms`, `solver`, `physics`, `environment` and a `value`. The AI never proposes `sim.set` with key `solver` or `physics` (rule R3) | `PROJECT_DATA_MODEL.md:796`; `AI_ARCHITECTURE.md:517` | DOCUMENTED |
| 34 | B4 puts the run bridge at `src/components/studio/wiring/simLink.ts` with a `RunStore` in `src/studio/stores/run.ts`, not at `src/studio/run/session.ts` (decision D4-3). Tasks in this file that say `session.ts` use whichever of the two exists | `B4-studio-uno.md:28, 137` | DOCUMENTED |
| 35 | The component descriptor has no field that names registry model ids (`simulation` holds `tier`, `status`, `what_it_models`, `not_modelled`, `validity`, `known_gaps`, `solver_requires`, `tests`, `mocked`), so the table in T-B8-05a is the one place B8 maps a descriptor to model ids | `component.schema.json:1089-1170` | VERIFIED |

## 5. Names this phase expects from B3, B4 and B7

All DOCUMENTED (roadmap rows). Each task's Preflight row repeats the ones it uses.

| Path | Made by | What B8 needs from it |
|---|---|---|
| `src/sim/core/clock.ts`, `units.ts`, `rng.ts`, `hash.ts` | T-B3-10 | integer-ns `SimTime`, seeded streams by name (`noise:<pin>`, `tol:<partId>`), FNV-1a 64 state hash |
| `src/sim/engine.ts`, `src/sim/orchestrator.ts`, `src/sim/digital/pins.ts`, `pwm.ts` | T-B3-11 | `Engine`, `Orchestrator` with `load`, `runUntil`, `step`, `inject`, `snapshot`, `restore`, `now`, `state` (SIMULATION_ARCHITECTURE 5.6) |
| `src/sim/mcu/arduino.ts`, `python.ts`, `verilog.ts` | T-B3-12 | `McuEngine` wrappers over `src/lib/interp` |
| `src/sim-host/host.ts`, `sim.worker.ts`, `protocol.ts`, `watchdog.ts` | T-B3-13, T-B3-14 | `SimHost` start/stop/step/kill/restart; `HostToSim`, `SimToHost` |
| `src/sim/mcu/bind.ts`, `src/sim/digital/nets.ts` | T-B3-15 | pins and World reach project nets |
| `src/sim/analog/types.ts`, `graph.ts`, `linsolve.ts`, `solve.ts`, `elements.ts`, `legacy-adapter.ts` | T-B3-16 to T-B3-18 | `Element`, `solve(input, options): SolveResult`, `AnalogSolver` (SIMULATION_ARCHITECTURE 7.2), SA-02 equivalence fixtures |
| `src/sim/replay/record.ts`, `trace.ts` | T-B3-19 | `ReplayRecord`, `InputEntry`, checkpoint every 1,000 ms |
| `src/project/diagnosis.ts`, `src/sim/faults/cause-ids.ts` | T-B3-20 | `Diagnosis`, `Evidence`, the closed cause-id list |
| `src/project/convert/*`, `src/parts/*`, `src/parts/data/*.component.json` | T-B2-11 to T-B2-14 | the 38 converted projects; descriptors with `simulation.tier` |
| `src/studio/*`, `src/components/studio/*` (`RunBar.tsx`, `SerialPane.tsx`, `ModelsPanel.tsx`, `StudioEntry.tsx`, `Problems.tsx`), `src/studio/run/session.ts`, `src/studio/fidelity/static-tier.ts` | T-B4-01 to T-B4-17 | UI shell, session bridge to `SimHost`, static tier label |
| `src/i18n/namespaces.ts`, `src/i18n/messages/*/studio.json`, `src/i18n/messages.test.ts` | T-B4-01, T-B4-21 | six-language parity test |
| `src/protocol/frames.ts`, `close-codes.ts`, `validate.ts`; `server/src/rooms/*`, `server/src/ws/server.ts` (upgrade only; the loop is `dispatch.ts`, see below); `src/collab/*`; `e2e/support/server.ts`; `src/components/studio/room/Members.tsx` | T-B7-01 to T-B7-20 | protocol v2, `RoomCore`, permission matrix with `runControl`, two-browser harness |
| `server/src/rooms/core.ts`, `types.ts` (`RoomCore`, `Outbound`, `MemberRef`), `server/src/ws/dispatch.ts` (`SocketSession`), `server/src/ws/bucket.ts` (`TokenBucket`), `src/collab/client.ts` (`RoomClient.send/on`), `src/collab/join.ts` (`RoomHandle`) | the B7 tasks in `B7-collab-rooms-shares-board.md` (the task numbers there differ from the roadmap's; find each by file name) | T-B8-17b hooks the run channel into `core.ts` and `dispatch.ts`; T-B8-29 uses `RoomClient` and `RoomHandle` |
| `src/components/studio/wiring/simLink.ts`, `src/studio/stores/run.ts` | T-B4-13 (decision D4-3) | the run bridge that T-B8-14 and T-B8-29 edit when `src/studio/run/session.ts` does not exist |

## 6. Tasks at a glance

| Id | Task | Subsystem | Group | Depends on (B8 tasks) | Source files | Priority |
|---|---|---|---|---|---|---|
| T-B8-01 | Fail loudly: SPI and UART stubs, `Serial1`, `Pin(99)`, positioned diagnostic codes | interp | G2 | 30 | 5 | P0 |
| T-B8-02 | Include resolution and library diagnostics | interp | G3 | 01 | 4 | P0 |
| T-B8-03 | Fidelity registry core: types, tier rules, loader, project summary | registry | G1 | none | 5 | P0 |
| T-B8-04 | Tier chips per layer, lowest-tier summary, registry-driven "What it models" | studio UI | G3 | 03, 05a, 22, 27 | 3 | P0 |
| T-B8-05a | Live analog solver: `LiveAnalog` implements `AnalogSolver` | sim | G2 | 03, 30 | 1 | P0 |
| T-B8-05b | Analog on the live path: orchestrator, pins, world, bind, ADC | sim | G3 | 05a, 21, 30 | 4 | P0 |
| T-B8-06 | Honest states: over-current, burn-out, brown-out, floating input, no-convergence | sim | G4 | 03, 05a, 05b, 22, 27 | 5 | P0 |
| T-B8-07 | LED and resistor cases computed, not fixed; the 113 mA figure cannot return | sim | G5 | 05a, 06 | 1 | P0 |
| T-B8-08 | Tick budget and the 150-node measurement | sim | G5 | 05a, 05b, 06 | 4 | P1 |
| T-B8-09 | `dc-event` phase order and engine tie-break | sim | G4 | 05b | 2 | P0 |
| T-B8-10 | Probe tap, ring buffers, provenance | sim | G5 | 03, 05a, 06, 09, 22 | 3 | P0 |
| T-B8-11 | Multimeter | sim and UI | G7 | 10, 25, 27, 28 | 2 | P1 |
| T-B8-12 | Oscilloscope and logic analyser with a table view | UI | G7 | 10, 25, 27 | 4 | P1 |
| T-B8-13 | Serial plotter | UI | G2 | 27 | 2 | P1 |
| T-B8-14 | Pause, step, speed, `behindReal` | host and UI | G4 | 05b, 27 | 5 | P1 |
| T-B8-15 | Snapshot and restore for the interpreters and the analog state | replay | G5 | 05b, 06, 09 | 4 | P1 |
| T-B8-16 | Replay checkpoints equal in Chromium and WebKit | replay | G6 | 15 | 3 | P0 |
| T-B8-17a | Run channel, shared types: frames, validators, op classes | protocol | G1 | none | 3 | P0 |
| T-B8-17b | Run channel, server side: channel, hub and wiring | rooms | G2 | 17a | 4 | P0 |
| T-B8-18 | Run channel, client: runner, mirrors, fallback, detach | collab | G7 | 14, 15, 17a, 17b, 25 | 5 | P0 |
| T-B8-19 | Lockstep determinism: runner plus two mirrors | e2e | G10 | 17b, 18, 26, 29 | 0 | P0 |
| T-B8-20 | Instrument dock in Studio, keyboard operation, summary chip mount | studio UI | G8 | 04, 11, 12, 13, 25, 27, 28 | 3 | P1 |
| T-B8-21 | Spike SP-B8-01: does the ADC formula move any reference run | spike | G1 | none | 0 | P0 |
| T-B8-22 | Registry data: full coverage of the 38 converted projects | registry | G2 | 03, 27 | 1 | P0 |
| T-B8-23 | `docs/FIDELITY.md` generated from the registry, with a drift check | docs | G8 | 04, 07, 22 | 3 | P1 |
| T-B8-24 | Exit evidence: SA and RA numbers in one file | gate | G11 | all | 2 | P0 |
| T-B8-25 | Probe, instrument and hash messages over `SimHost` | host | G6 | 10, 14 | 5 | P0 |
| T-B8-26 | Room run UI: runner badge, watching label, private run, rejoin | studio UI | G8 | 18, 27 | 4 | P0 |
| T-B8-27 | B8 copy in six languages: `fidelity`, `instruments`, `run` | i18n | G1 | none | 4 | P0 |
| T-B8-28 | Seeded tolerance and bands | sim | G6 | 06, 10 | 3 | P1 |
| T-B8-29 | Mount the run client: wiring, run controls and the indicator | collab and studio UI | G9 | 14, 17b, 18, 20, 26 | 4 | P0 |
| T-B8-30 | Per-board pin electrical model | interp | G1 | none | 1 | P0 |

Priority: P0 = a must in the PRD or needed for the exit gate; P1 = a should in the PRD (`R-101`, `R-107`, `R-108`, `R-112` are "should") or measurement and documentation.

## 7. Parallel groups

Tasks in one group touch disjoint files and can be built by separate agents at once. Groups run in order. A task starts only when every task it depends on is in an earlier group and committed.

| Group | Tasks | Why they are disjoint | Gate before the next group |
|---|---|---|---|
| G1 | T-B8-03, T-B8-17a, T-B8-21, T-B8-27, T-B8-30 | `src/sim/registry`; `src/protocol`; a spike folder; i18n files; `profiles.ts` | `TL`; `V src/sim/registry src/protocol src/i18n src/lib/interp`. SP-B8-01 verdict read by the orchestrator before G3 starts T-B8-05b |
| G2 | T-B8-01, T-B8-05a, T-B8-13, T-B8-17b, T-B8-22 | interp errors, libs, `interp.ts`, python files; `sim/analog/live.ts`; plotter files; server rooms and ws files; registry data | `TL`; `V src/lib/interp src/sim src/sim/registry`; `SRV` |
| G3 | T-B8-02, T-B8-04, T-B8-05b | include resolution (`include.ts`, `libs.ts`, `interp.ts`, `mcu/arduino.ts`); tier chip components; orchestrator, pins, `world.ts`, `bind.ts` | `TL`; `V src/lib/interp src/sim src/sim-host src/components/studio src/studio` |
| G4 | T-B8-06, T-B8-09, T-B8-14 | states, rails, `live.ts`, `world.ts`, descriptors; `orchestrator.ts` and `engine.ts`; host, session, protocol, RunBar, SpeedControl | `TL`; `V src/sim src/sim-host src/studio src/components/studio src/lib/interp src/content/boards` |
| G5 | T-B8-07, T-B8-08, T-B8-10, T-B8-15 | `elements.ts`; bench files and `budgets.json`; `src/sim/probe`; `src/sim/replay` and `orchestrator.ts` | `TL`; `V src/sim`; `node scripts/sim-bench.mjs` prints numbers |
| G6 | T-B8-16, T-B8-25, T-B8-28 | `record.ts` and fixtures; host messages; `tolerance.ts` with `live.ts` and `tap.ts` | `TL`; `V src/sim src/sim-host`; `E e2e/replay.spec.ts` |
| G7 | T-B8-11, T-B8-12, T-B8-18 | meter files; scope, LA, capture, `world.ts`; `src/collab/run*.ts` with `host.ts` and `protocol.ts` | `TL`; `V src/sim src/components/studio src/collab` |
| G8 | T-B8-20, T-B8-23, T-B8-26 | `InstrumentDock.tsx`, `StudioEntry.tsx`, `placement.ts`; docs and a script; run UI files and `Members.tsx` | `TL`; `V src/components/studio src/studio scripts/fidelity-doc.test.mjs`; `E e2e/studio-a11y.spec.ts e2e/instruments.spec.ts` |
| G9 | T-B8-29 | `src/collab/run-wiring.ts`, `session.ts`, `RunBar.tsx`, `StudioEntry.tsx` (after T-B8-20 released it) | `TL`; `V src/collab src/studio src/components/studio` |
| G10 | T-B8-19 | `e2e/run-lockstep.spec.ts` | `E e2e/run-lockstep.spec.ts --retries=0` |
| G11 | T-B8-24 | reads everything | `npm run check`; evidence file complete |

If a group cannot be run in parallel (one agent), run its tasks in the listed order.

## 8. File ownership

A file has one owner per group. A file that appears under two tasks is edited by them in different groups only, in group order. "new" = created by that task. Test files are listed in each task, not here.

| File | Tasks (group order) |
|---|---|
| `src/lib/interp/profiles.ts` | T-B8-30 (G1) |
| `src/lib/interp/errors.ts` | T-B8-01 (G2) |
| `src/lib/interp/arduino/libs.ts` | T-B8-01 (G2), T-B8-02 (G3) |
| `src/lib/interp/arduino/interp.ts` | T-B8-01 (G2), T-B8-02 (G3) |
| `src/lib/interp/python/runtime.ts`, `src/lib/interp/python/modules.ts` | T-B8-01 (G2) |
| `src/lib/interp/arduino/include.ts` | T-B8-02 (G3, new) |
| `src/sim/mcu/arduino.ts` | T-B8-02 (G3) |
| `src/sim/registry/types.ts`, `entries.ts`, `tiers.ts`, `project.ts` | T-B8-03 (G1, new) |
| `src/sim/registry/data/*.json` | T-B8-03 (G1, four entries), T-B8-22 (G2, the rest) |
| `src/components/studio/TierChips.tsx` | T-B8-04 (G3, new) |
| `src/components/studio/ModelsPanel.tsx` | T-B8-04 (G3) |
| `src/studio/fidelity/static-tier.ts` | T-B8-04 (G3) |
| `src/sim/analog/live.ts` | T-B8-05a (G2, new), T-B8-06 (G4), T-B8-28 (G6) |
| `src/sim/analog/fixtures/rs08-linear.json` | T-B8-05a (G2, new) |
| `src/sim/orchestrator.ts` | T-B8-05b (G3), T-B8-09 (G4), T-B8-15 (G5) |
| `src/sim/digital/pins.ts` | T-B8-05b (G3) |
| `src/sim/mcu/bind.ts` | T-B8-05b (G3) |
| `src/lib/interp/world.ts` | T-B8-05b (G3), T-B8-06 (G4), T-B8-12 (G7) |
| `src/sim/analog/states.ts`, `rails.ts`, `fixtures/rs08-states.json` | T-B8-06 (G4, new) |
| board descriptors `src/parts/data/uno-r3.component.json`, `esp32-devkitc.component.json` | T-B8-06 (G4) |
| `src/sim/analog/elements.ts` | T-B8-07 (G5) |
| `src/sim/analog/bench-fixtures.ts`, `bench-entry.ts`, `scripts/sim-bench.mjs`, `budgets.json` | T-B8-08 (G5, new except `budgets.json`) |
| `src/sim/engine.ts` | T-B8-09 (G4) |
| `src/sim/probe/tap.ts` | T-B8-10 (G5, new), T-B8-28 (G6) |
| `src/sim/probe/provenance.ts`, `ring.ts`, `fixtures/rs08-provenance.json` | T-B8-10 (G5, new) |
| `src/sim/probe/meter.ts`, `src/components/studio/instruments/Multimeter.tsx` | T-B8-11 (G7, new) |
| `src/components/studio/instruments/Scope.tsx`, `LogicAnalyser.tsx`, `src/sim/probe/capture.ts` | T-B8-12 (G7, new) |
| `src/components/studio/instruments/Plotter.tsx`, `src/studio/run/plot.ts` | T-B8-13 (G2, new) |
| `src/components/studio/SpeedControl.tsx` | T-B8-14 (G4, new) |
| `src/components/studio/RunBar.tsx`, `src/studio/run/session.ts` (or `components/studio/wiring/simLink.ts`, fact 34) | T-B8-14 (G4), T-B8-29 (G9) |
| `src/sim-host/host.ts` | T-B8-14 (G4), T-B8-25 (G6), T-B8-18 (G7) |
| `src/sim-host/protocol.ts` | T-B8-14 (G4), T-B8-25 (G6), T-B8-18 (G7) |
| `src/sim-host/sim.worker.ts` | T-B8-25 (G6) |
| `src/sim/replay/snapshot.ts`, `restore.ts`, `keyframes.ts` | T-B8-15 (G5, new) |
| `src/sim/replay/record.ts` | T-B8-16 (G6) |
| `src/sim/replay/fixtures/*.json` | T-B8-16 (G6, new) |
| `src/protocol/run-ops.ts` | T-B8-17a (G1, new) |
| `src/protocol/frames.ts`, `src/protocol/validate.ts` | T-B8-17a (G1) |
| `server/src/rooms/run-channel.ts`, `server/src/rooms/run-hub.ts` | T-B8-17b (G2, new) |
| `server/src/rooms/core.ts`, `server/src/ws/dispatch.ts` | T-B8-17b (G2) |
| `src/collab/run.ts`, `run-mirror.ts`, `run-runner.ts` | T-B8-18 (G7, new) |
| `src/collab/run-wiring.ts` | T-B8-29 (G9, new) |
| `src/components/studio/InstrumentDock.tsx`, `src/studio/instruments/placement.ts` | T-B8-20 (G8, new) |
| `src/components/studio/StudioEntry.tsx` | T-B8-20 (G8), T-B8-29 (G9) |
| `src/components/studio/room/RunIndicator.tsx`, `RunnerPicker.tsx`, `src/studio/room/run-state.ts` | T-B8-26 (G8, new) |
| `src/components/studio/room/Members.tsx` | T-B8-26 (G8) |
| `src/sim/analog/tolerance.ts` | T-B8-28 (G6, new) |
| `src/studio/run/probes.ts` | T-B8-25 (G6, new) |
| `src/sim/replay/trace.ts` | T-B8-25 (G6) |
| `src/sim/replay/replay-check.ts` | T-B8-16 (G6, new) |
| `docs/FIDELITY.md`, `scripts/fidelity-doc.mjs`, `package.json` | T-B8-23 (G8) |
| `scripts/b8-evidence.mjs`, `docs/MASTER_PLAN/05_ENGINEERING/evidence/B8-numbers.md` | T-B8-24 (G11, new) |
| `src/i18n/messages/*/fidelity.json`, `instruments.json`, `run.json`, `src/i18n/namespaces.ts` | T-B8-27 (G1) |
| `e2e/replay.spec.ts` | T-B8-16 |
| `e2e/run-lockstep.spec.ts`, `e2e/support/run.ts` | T-B8-19 |
| `e2e/instruments.spec.ts`; `e2e/studio-a11y.spec.ts` (edit) | T-B8-20 |
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/SP-B8-01-adc-formula/*` | T-B8-21 |

## 9. Task packages

Format of every package: Identity, Intent, Implementation, Verification, Delivery. A row that does not apply says "none" and why.

---

### T-B8-01 Fail loudly: SPI and UART stubs, `Serial1`, `Pin(99)`, positioned diagnostic codes

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-01 |
| Subsystem | Interpreters (`src/lib/interp`) |
| Phase / group / priority | B8 / G2 / P0 |
| Dependencies | B8: T-B8-30 (`isKnownPin`). Earlier phases: T-B3-12, T-B3-15, T-B4-17 (`errors.ts` may already carry a code; see Preflight) |
| Status | not started |
| Source files (5) | `src/lib/interp/errors.ts`, `src/lib/interp/arduino/libs.ts`, `src/lib/interp/arduino/interp.ts`, `src/lib/interp/python/runtime.ts`, `src/lib/interp/python/modules.ts` |
| Test files | new `src/lib/interp/bus-stubs.test.ts`; edits to `arduino/arduino.test.ts`, `python/python.test.ts` only if a test asserts the old silent behaviour |

Review of 2026-10-27 (issue 14): the per-board pin model that used to be the fourth source file (`profiles.ts`) is now T-B8-30 (G1), because carrying a diagnostic code to the user's line needs `interp.ts` and `python/runtime.ts` as well, and `Serial1` needs its own class.

**Intent**

- Problem. `SPI.transfer` returns 0 for any wiring (`libs.ts:787`). `Serial1` is the main serial class, so its output appears in the monitor: `SerialClass` is defined at `libs.ts:682`, `LIBS` maps `HardwareSerial: SerialClass` at `libs.ts:1409`, and `GLOBAL_OBJECTS` gives both `Serial` and `Serial1` `cls: 'HardwareSerial'` at `libs.ts:1432-1433` (VERIFIED; no other file names `HardwareSerial`). `Pin(99)` in MicroPython succeeds because `pinNo` accepts any int and `World.pin(n)` creates state for any `n` (`python/modules.ts:19-29`, `world.ts:220-226`), while Arduino already refuses a pin the board lacks (`libs.ts:188-194`). `machine.SPI` and `machine.UART` do not exist (the `machine` table is `modules.ts:388-391`; a grep for `SPI` and `UART` in `modules.ts` finds nothing). In each case the tool says something works that it does not model (R-109, R-099).
- A fact the old task missed (VERIFIED). A library method that throws `InterpError(..., null)` is not given a line. Only builtins are wrapped, in `wrapErr` at `interp.ts:1241-1248`, and that wrapper rebuilds the error with `new InterpError(err.kind, err.message, p, err.hint)` at `:1245`, which would drop a `code`. The object-method call sites (`interp.ts:1136-1139` for `String` methods, `:1160-1167` for other objects) call `m.fn`, `mg` and `mf` with no wrapper. On the Python side `toInterpError` (`python/runtime.ts:263-272`) builds a new `InterpError` from the class name and message only. Without changes in both files the new code never reaches the Problems pane and the "line of the call" test cannot pass.
- Target user. A maker or learner who wires an SPI sensor or a second UART, or mistypes a pin.
- Story. As a maker, when my sketch talks to a device the simulator does not model, I want a named "not modelled yet" error at the line, so that I do not read a silent 0 as a working sensor.
- Expected behaviour. (1) `SPI.transfer(x)` raises `bus-device-not-modelled`, kind `unsupported`, message "SPI.transfer() is not modelled yet. Your code is not wrong." and never returns 0. `SPI.begin`, `end`, `beginTransaction`, `endTransaction`, `setClockDivider` stay no-ops because they configure the master and talk to no device. (2) On boards with `Serial1`, `Serial1.begin` and `end` are no-ops, `available()` is 0, `read()` is -1, and any `print`, `println`, `write`, `printf` raises the same code. `Serial` is unchanged. (3) `machine.SPI(...)`, `machine.SoftSPI(...)` and `machine.UART(...)` in MicroPython raise it at construction. (4) `Pin(n)` with an `n` the profile does not have raises `ValueError: invalid pin n`.
- Success metric. SA-09 first half: the SPI case gives the named error at the call line and prints no `0`; 102 of 102 lesson reference runs still pass; `Pin(1000)` is refused on all 12 profiles; `Serial.println` on an ESP32 still reaches the monitor and `Serial1.println` does not.

**Implementation**

- Existing code to change. `libs.ts:780-790` (`SpiClass`), `libs.ts:682-715` (`SerialClass`, copied for `Serial1`), `libs.ts:1409` and `libs.ts:1432-1433` (`LIBS`, `GLOBAL_OBJECTS`), `libs.ts:188-194` (`pinArg`, to call `isKnownPin` instead of its inline `known` test); `interp.ts:1241-1248` (`wrapErr`) and the call sites at `:1136-1139` and `:1160-1167`; `python/runtime.ts:162-166` (`pyErr`) and `:263-272` (`toInterpError`); `python/modules.ts:19-29` (`pinNo`), the `machine` table at `:388-391`; `errors.ts:10-32, 36-47`.
- New files. Test file only.
- Modules and signatures.

```ts
// errors.ts
export type DiagnosticCode =
  | 'bus-device-not-modelled' | 'invalid-pin'
  | 'include-not-found' | 'include-cycle' | 'include-depth-limit' | 'include-file-limit'
  | 'library-not-modelled-yet' | 'library-method-not-modelled';
export interface ErrorExtra { code?: DiagnosticCode; file?: string }
// constructor gains a fifth parameter: (kind, message, pos?, hint?, extra?: ErrorExtra); fields code?, file?
at(pos: SourcePos): InterpError          // copy with the position set; kind, message, hint, code and file kept
export interface Diagnostic { kind: ErrorKind; message: string; line: number; col: number; hint?: string; code?: DiagnosticCode; file?: string }
export function notModelled(what: string, code: DiagnosticCode, pos: SourcePos | null, hint?: string): InterpError   // kind 'unsupported'; message `${what} is not modelled yet. Your code is not wrong.`

// libs.ts: a second serial class and one changed table entry
const HardwareSerial1Class: LibClass = { ...SerialClass, methods: { ...SerialClass.methods, /* overrides below */ } }
//   begin, end: no-ops (begin stores the baud on self as Serial does)
//   print, println, write, printf: () => { throw notModelled(`Serial1.<name>()`, 'bus-device-not-modelled', null) }
//   available, availableForWrite: pure, 0; read, peek: -1
//   readString, readStringUntil: gen that returns '' without touching the monitor input; parseInt, parseFloat: gen that returns 0
LIBS.HardwareSerial1 = HardwareSerial1Class
GLOBAL_OBJECTS.Serial1 = { cls: 'HardwareSerial1', headers: null, boards: (p) => !isAvr(p) }   // Serial keeps cls 'HardwareSerial'

// python/runtime.ts
export function pyErr(cls: string, msg: string, code?: DiagnosticCode): PyRaise   // stores code in exc.dict
//   toInterpError passes { code } as the fifth constructor argument
```

  `interp.ts` gets one private helper `positioned<R>(p: SourcePos, run: () => R): R` that catches an `InterpError` with `line === 0` and rethrows `err.at(p)`. `wrapErr` at `:1241` becomes a call of it, and the object-method call sites use it too (the `ev` closures of `m.fn` and `mf`, and the generator runner of `mg`). The method-missing path (`interp.ts:1146-1150`) reads `LIBS[obj.t.cls]`, where `cls` comes from `GLOBAL_OBJECTS` at `interp.ts:180-184`, so the new class needs no change in that path. `modules.ts`: `pinNo` calls `isKnownPin(rt.world.profile, n)` after it resolves an alias or an int and throws `pyErr('ValueError', 'invalid pin N', 'invalid-pin')`; the `machine` table gains `SPI`, `SoftSPI` and `UART` classes whose `__init__` throws `pyErr('NotImplementedError', 'machine.SPI() is not modelled yet. Your code is not wrong.', 'bus-device-not-modelled')`.
- Data model. none (the board electrical numbers are T-B8-30).
- Input and output schemas. `Diagnostic` JSON gains optional `code` and `file`. Nothing else crosses a boundary.
- API contracts. none (no route, no protocol frame).
- Algorithm. `isKnownPin` (T-B8-30) answers by lookup. `pinNo` resolves the alias or integer as today, then refuses an unknown result.
- State transitions. An `InterpError` ends the run in state `halted` through the existing path; nothing new.
- Validation rules. Pin numbers are integers; a float, NaN or negative number is unknown.
- Error conditions. `bus-device-not-modelled` (kind `unsupported` in Arduino; Python type `NotImplementedError`); `invalid-pin` for Python (kind `runtime`, Python type `ValueError`, message `invalid pin 99`).
- Edge cases. `Pin("LED")` and `Pin("WL_GPIO0")` on Pico W resolve through `aliases` first. `Pin(64)` on a board without Wi-Fi stays refused. Pi 4 and 5 BCM numbers must remain valid: run `python.test.ts` before and after. `SPI.begin()` on a board with no SPI pins stays a no-op. `Serial1.begin(9600)` followed by no write stays silent. A `Serial1.read()` must not consume bytes typed into the monitor for `Serial`.
- Permissions. none.
- Performance constraints. One `try` per non-pure library call and one `Set.has` per pin check; the 102 reference runs keep their current time.
- Migration. None. The only behaviour change is a refusal where a silent wrong answer was. The two lesson-content hits for SPI and Serial1 are board pin tables (`src/i18n/content/en/boards/uno-r4.json`, `basys3.json`), not sketches (VERIFIED by grep).
- Preflight. `test -e src/sim/mcu/arduino.ts src/sim/mcu/bind.ts`; `grep -n "isKnownPin" src/lib/interp/profiles.ts` (T-B8-30 must have landed); `grep -n "code" src/lib/interp/errors.ts` (if T-B4-17 already added a `code` field with a different name, use its name and keep the union above).

**Verification**

- Unit tests (`src/lib/interp/bus-stubs.test.ts`). (1) Uno: `SPI.begin(); byte v = SPI.transfer(0x55); Serial.println(v);` raises with `code === 'bus-device-not-modelled'`, `kind === 'unsupported'`, `line` equal to the line of the `transfer` call, and the serial text contains no `0`. (2) `SPI.begin(); SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE0)); SPI.endTransaction(); SPI.setClockDivider(4);` runs clean. (3) ESP32: `Serial1.begin(9600); Serial1.println("x");` raises with the code and the call line; `Serial1.available()` is 0 and `Serial1.read()` is -1 even after the test types a byte into the monitor, and `Serial.read()` still returns that byte; `Serial.println("ok")` on the same ESP32 sketch reaches the serial text. (4) Pico: `Pin(99)` raises `ValueError` text `invalid pin 99` with `code === 'invalid-pin'` and the Python line; `Pin(25, Pin.OUT)` works; Pico W `Pin("LED")` works; `machine.SPI(0)` and `machine.UART(0)` raise with `code === 'bus-device-not-modelled'` and the line. (5) `Pin(1000)` is refused on every Python-capable profile in `PROFILES`. (6) A builtin error that already carries a code (made by a test double) keeps `code` through `wrapErr`.
- Integration. `V src/lib/interp` (all existing suites). `V src/content/boards` once for the reference runs (the basys3 display sweep is slow; do not change its timeout).
- Playwright. none; the Problems pane shows the diagnostic through T-B4-17 and is covered by T-B8-20's spec.
- Fixtures. Inline sketches. No file.
- Acceptance (Given/When/Then). Given an Uno sketch that calls `SPI.transfer`, When I run, Then the run stops at that line with "SPI.transfer() is not modelled yet. Your code is not wrong." and the serial output has no `0` line. Given a Pico MicroPython file with `Pin(99)`, When I run, Then it stops with `ValueError: invalid pin 99`. Given an ESP32 sketch that prints on `Serial1`, When I run, Then it stops with the Serial1 message and nothing appears in the monitor.
- Observability. The diagnostic `code` reaches the Problems pane and the serial error line (`InterpError.format()`).
- Release blockers. Any of the 102 references fails; a message that blames the user's code; a diagnostic with `line 0`; a code lost on the way to `Diagnostic`.

**Delivery**

- Definition of done. The five files changed; new test green; no existing interpreter or content test regressed; `TL` clean.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/lib/interp && npx vitest run src/content/boards`.
- Documentation. One line in `docs/FIDELITY.md` is generated later (T-B8-23); nothing now.
- Rollback. `git revert` the commit.
- Later tasks need. T-B8-02 uses `DiagnosticCode`, `file`, `at`, `notModelled` and `positioned`. T-B9-01 replaces the unconditional raise by a lookup of a bus device in the project.

---

### T-B8-02 Include resolution and library diagnostics

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-02 |
| Subsystem | Interpreters, Arduino subset |
| Phase / group / priority | B8 / G3 / P0 |
| Dependencies | T-B8-01 (`DiagnosticCode`, `file`, `at`, `notModelled`, the `positioned` helper in `interp.ts`, and `libs.ts`); T-B3-12 (`src/sim/mcu/arduino.ts`); T-B4-12 (`sources[]` bound to the code dock) |
| Status | not started |
| Source files (4) | new `src/lib/interp/arduino/include.ts`; edit `src/lib/interp/arduino/libs.ts`, `src/lib/interp/arduino/interp.ts`, `src/sim/mcu/arduino.ts` |
| Test files | new `src/lib/interp/arduino/include.test.ts` |

**Intent**

- Problem. Includes are recorded by name and never looked up (`parser.ts:87-90`; `interp.ts:149-151`). A multi-file project cannot use its own headers, an unknown library gives "unknown type 'DHT'" as if the code were wrong, and a missing method gives a generic message (`interp.ts:1146-1150`).
- Target user. Someone who splits a sketch into `monitor.ino` and `display.h`, or pastes a sketch that uses a library iynk does not model.
- Story. As a maker, when I include a header of my own I want it found, and when I include a library iynk lacks I want to be told it is "not modelled yet" and not that my code is broken.
- Expected behaviour. SA-25, clause by clause:
  1. `#include "display.h"` is found among the project `sources[]`, relative to the including file, then the project root.
  2. A quoted name with no source gives `include-not-found` at the include's `file:line`.
  3. `#include <DHT.h>` (an angle include with no library model) gives `library-not-modelled-yet`; text "DHT.h is not modelled yet. Your code is not wrong."; cause id `library-not-modelled` (the cause id is attached in B10; the diagnostic carries the code).
  4. `#include "../x.h"` that leaves the project root is not found.
  5. A header that includes itself, directly or in a ring, gives `include-cycle` naming the files.
  6. `#pragma once` and the `#ifndef X` / `#define X` / `#endif` guard each include a file once.
  7. Depth 17 gives `include-depth-limit`; the 65th distinct file gives `include-file-limit`.
  8. A call to a method listed as real but unmodelled (`bme.setSampling(...)`) gives `library-method-not-modelled`.
  9. The BRIEF 30 sketch builds. See the partial below.
- Success metric. SA-25 clauses 1 to 8 pass in B8 on constructed fixtures; clause 9 is completed by T-B9-04 (the real `Adafruit_BME280` model). T-B8-02 proves the resolution half of clause 9 with a test-only header registry that lists `Adafruit_BME280.h` and `Wire.h` as known.

**Implementation**

- Existing code. `parser.ts:87-90` (include directive; kept as is); `parser.ts:918-921` (`parseSketch`); `interp.ts:149-152` (`compileSketch`), `:252` ("needs #include"), `:1146-1150` (method missing); `libs.ts:11-46` (`LibClass`, `LibMethod`), `:1408-1436` (`LIBS`, `GLOBAL_OBJECTS`); `src/sim/mcu/arduino.ts` (T-B3-12 wrapper).
- New file `include.ts`. Flattening approach: quoted includes are replaced by the included text and angle includes are kept as lines, so `parser.ts` and the `includes` Set at `interp.ts:149-151` keep working unchanged.

```ts
export interface SourceFile { path: string; content: string }           // path as in project Source.path: relative POSIX, NFC
export interface LineOrigin { file: string; line: number }               // 1-based
export interface ResolvedInclude { name: string; quoted: boolean; from: string; line: number; resolvedPath: string | null; library: string | null }
export interface ResolveResult { text: string; lineMap: LineOrigin[]; includes: ResolvedInclude[]; diagnostics: Diagnostic[] }
export const INCLUDE_LIMITS = { maxDepth: 16, maxFiles: 64 } as const;
export function resolveIncludes(entry: string, files: readonly SourceFile[], knownHeaders: ReadonlySet<string>): ResolveResult
export function mapDiagnostic(d: Diagnostic, lineMap: readonly LineOrigin[]): Diagnostic   // sets file and line back to the user's file
```

  `libs.ts` exports `knownHeaders(): Set<string>` (union of every `LibClass.headers` plus the built-in headers `Arduino.h`, `Wire.h`, `SPI.h`, `Servo.h`, ...). `LibClass` gains `unmodelledMethods?: readonly string[]` (real method names the model lacks). `interp.ts` at `:1146` throws `library-method-not-modelled` through `notModelled` (passing `e.fn.p`, which this compile-time site has) when `lib.unmodelledMethods?.includes(name)`, and keeps the generic message for a plain typo.
- Algorithm. Depth-first walk from the entry file. Keep a stack (cycle check by path), a `Set` of visited paths (for `#pragma once` and guards) and a counter of distinct files. Path rule: resolve against the including file's directory, then the root; normalise `.` and `..`; if the result climbs above the root, not found. Match is exact; if only a case-insensitive match exists, the `include-not-found` hint says "did you mean Display.h". Guard rule: a file whose first directive is `#ifndef NAME` followed by `#define NAME` and closed by a final `#endif` is skipped on the second visit; the three guard lines are dropped from the text. Any other `#if`, `#ifdef`, `#ifndef` is left in place and the parser refuses it as today with its existing hint. The flattened text keeps one output line per source line so `lineMap[i]` is exact.
- State transitions. none.
- Validation rules. Entry path must be in `files`; at most 64 files (also the project limit of 32 sources per compile request, RC-59, is a B9 concern).
- Error conditions. The include codes of T-B8-01's `DiagnosticCode` plus `library-method-not-modelled`; each is `kind: 'unsupported'` except `include-not-found` and `include-cycle` (`kind: 'compile'`).
- Edge cases. Same header included from two files (once). Include inside a block comment (the lexer already skips; the flattener must not read comments as directives: reuse the lexer's comment skipper or test it). CRLF files. Include of the entry file's own `.ino`. Empty file. Two files that differ only by case.
- Permissions. none. Performance. Linear in total bytes; 64 files of 256 KiB bound it to 16 MiB; abort on `include-file-limit` first.
- Migration. A single-file sketch gives text identical to its source (test).
- Preflight. `test -e src/sim/mcu/arduino.ts`; read how it calls `compileSketch` and where it gets `sources[]` (T-B4-12 `src/studio/code/sources.ts`).

**Verification**

- Unit tests (`include.test.ts`). One test per clause 1 to 8 above with the exact fixtures of SA-25 (`monitor.ino` including `display.h`, `<Adafruit_BME280.h>`, `<Wire.h>`). Line-map test: an error on line 3 of `display.h` reports `display.h:3`. Single-file identity test. Guard tests: `#pragma once` and `#ifndef` file included from two places appear once. `unmodelledMethods` test: `bme.setSampling(...)` on a test class.
- Integration. `V src/lib/interp src/sim/mcu`. The 102 references are single-file, so they must not change.
- Playwright. none (T-B8-20's spec reads the Problems pane).
- Fixtures. `src/lib/interp/arduino/include.test.ts` builds file arrays inline.
- Acceptance. Given `monitor.ino` with `#include "display.h"` and no such source, When I run, Then the Problems pane lists `include-not-found` at `monitor.ino:2`. Given `#include <DHT.h>`, When I run, Then the text says "not modelled yet" and the code is `library-not-modelled-yet`.
- Observability. Diagnostics carry `code` and `file`.
- Release blockers. A single-file sketch changes behaviour; a diagnostic points at the flattened line instead of the user's file.

**Delivery**

- Definition of done. Four files and the test; `TL`; SA-25 clauses 1 to 8 pass.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/lib/interp src/sim/mcu`.
- Documentation. none now (generated page).
- Rollback. `git revert`. `include.ts` is only called from `mcu/arduino.ts`.
- Later tasks need. T-B9-04 adds `Adafruit_BME280.h` to `knownHeaders()` and removes the test-only registry; T-B10 attaches cause id `library-not-modelled` to the code.

---

### T-B8-03 Fidelity registry core: types, tier rules, loader, project summary

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-03 |
| Subsystem | Fidelity registry (`src/sim/registry`) |
| Phase / group / priority | B8 / G1 / P0 |
| Dependencies | T-B3-10 (`hash.ts`), T-B2-11 and T-B2-12 (descriptors with `simulation` block) |
| Status | not started |
| Source files (5) | new `src/sim/registry/types.ts`, `entries.ts`, `tiers.ts`, `project.ts`; new data set `src/sim/registry/data/*.json` (four entries) |
| Test files | new `src/sim/registry/registry.test.ts`, `tiers.test.ts`, `project.test.ts` |

**Intent**

- Problem. No registry exists; the static label of B4 (`src/studio/fidelity/static-tier.ts`) is hand-written. Without a registry, tier, "What it models" and reading provenance cannot share one truth (ADR-0310, R-114).
- Target user. The maker reading a tier chip; the maintainer adding a model.
- Story. As a maker I want every claim the tool makes about a model to come from one place that refuses claims the evidence does not support.
- Expected behaviour. Entries are JSON, typed as `FidelityEntry` (SIMULATION_ARCHITECTURE 16.2). `loadRegistry(raw?, o?: { knownKeys?: ReadonlySet<string> })` validates them and returns a read-only index; when `knownKeys` is given it also checks that every `labels.chip` and `labels.summary` is in the set. The caller that has `en/fidelity.json` passes it (T-B8-22); this task does not read that file because T-B8-27 writes it in the same group. `allowedTier(entry)` computes the highest tier the evidence supports (16.3 rule 1). A load fails when `entry.tier` exceeds it. `projectFidelity(doc, registry)` returns one chip per layer and a summary equal to the lowest tier. Four seed entries from 16.5: `engine:mna-dc-pwl@1.0.0`, `model:led.pwl@1`, `runtime:arduino-subset@1`, `flight-game@1`. B8 label convention, used by the seeds and by T-B8-22: `labels.chip` is `fidelity.tier.<the entry's tier>` and `labels.summary` is `fidelity.summary`, both keys in T-B8-27's table, so the seeds name keys that exist.
- Success metric. SA-17 mechanism: an entry that asserts T2 with no `oracle` or `analytic` record fails to load; the banned-word check fails on "validated".

**Implementation**

- Existing code. none (new module). Reads the descriptor `simulation` block (`component.schema.json:1088-1170`) and `ReplayRecord.versions.models` keys.
- Types (copied from `SIMULATION_ARCHITECTURE.md` 16.2; field names binding):

```ts
export type Tier = 'T0' | 'T1' | 'T2' | 'T3';
export type Layer = 'L1'|'L2'|'L3'|'L4'|'L5'|'L6'|'L7'|'L8'|'L9'|'L10'|'L11'|'L12';
export interface Phenomenon { id: string; text: string }
export interface ParameterSource { param: string; value: number | string; unit?: string; type: 'datasheet'|'fit'|'measurement'|'assumption'|'numerical'; ref?: string; page?: string; note?: string }
export interface ValidationRecord { id: string; kind: 'oracle'|'bench'|'differential'|'analytic'|'self-consistency'; oracle?: { name: string; version: string }; dataset: string; flavour?: string; result: { n: number; passed: number; metric: string; worst: number; unit: string }; date: string; engineVersion: string; status: 'pass'|'fail'|'partial'|'none'; report?: string }
export interface RangeSpec { quantity: string; min: number; max: number; unit: string; evidence: string }   // RC-55: operatingRange
export interface FidelityEntry { id: string; version: string; kind: 'engine'|'part-model'|'failure-model'|'runtime'|'device'|'bus'|'sensor'|'environment'|'rule'; title: string; tier: Tier; layers: Layer[]; implements: Phenomenon[]; mocked: Phenomenon[]; unsupported: Phenomenon[]; parameterSources: ParameterSource[]; validation: ValidationRecord[]; errorMetrics: { name: string; value: number; unit: string; condition: string }[]; operatingRange: RangeSpec[]; knownFailureCases: string[]; performance: { benchId: string; metric: string; value: number; unit: string; machine: string; load?: string; date: string; label: 'MEASURED'|'ESTIMATED' }[]; labels: { chip: string; summary: string }; status: 'active'|'planned'|'deprecated'; supersedes?: string }
export interface Registry { get(id: string): FidelityEntry | undefined; all(): readonly FidelityEntry[]; byKind(k: FidelityEntry['kind']): readonly FidelityEntry[] }
// entries.ts
export function loadRegistry(raw?: readonly unknown[], o?: { knownKeys?: ReadonlySet<string> }): Registry   // throws RegistryError listing every problem; label keys are checked only when knownKeys is given
export const ID_MODEL = /^([a-z0-9-]+:)?[a-z0-9.-]+@[0-9]+$/;             // model, part-model, failure-model, device, bus, sensor, rule, runtime
export const ID_ENGINE = /^engine:[a-z0-9-]+@[0-9]+\.[0-9]+\.[0-9]+$/;    // RC-54: engine ids carry full semver
// tiers.ts
export function allowedTier(e: FidelityEntry): Tier
export function checkEntry(e: FidelityEntry): string[]                     // problems; empty = ok
export const BANNED_WORDS: readonly string[]                               // validated, accurate, exact, realistic physics, hardware-accurate, safe to build
export function findBanned(text: string): string[]
export const CHECKED_ON_REAL_BOARD = (e: FidelityEntry): boolean           // has a bench record with status pass and an errorMetrics row
export function inRange(e: FidelityEntry, quantity: string, value: number): boolean | null   // false: outside a matching operatingRange entry; null: the entry has no range for that quantity. T-B8-06 and T-B8-10 both call it (one rule, one place)
// project.ts
export interface LayerTier { layer: 'execution'|'circuit'|'protocols'|'mechanics'; tier: Tier | 'none'; entryIds: string[]; unmodelled: string[] }
export interface ProjectFidelity { layers: LayerTier[]; summary: Tier | 'none' }
export function projectFidelity(doc: ProjectDocument, reg: Registry, modelsOf: (descriptorId: string) => readonly string[]): ProjectFidelity   // modelsOf: T-B8-05a's modelIdsOf (fact 35: the descriptor names no model ids)
```

- Data model. As above. Tier rule `allowedTier` (16.3 rule 1): T0 always; T1 needs non-empty `unsupported`, at least one validation record or a referenced test, and a deterministic model (no wall clock; the entry declares `performance` or a `self-consistency` record); T2 needs every primary parameter sourced `datasheet`, `fit` or `measurement`, plus a `pass` record of kind `oracle` or `analytic` with date and engine version; T3 needs `kind: 'runtime'` for an emulator and a passing `differential` record. The "Checked on a real board" mark is a separate function, never a tier. "validated" is never generated from any field.
- Layer mapping for the four chips: `execution` = layers L5; `circuit` = L4; `protocols` = L6; `mechanics` = L7 and L8. A layer with no entry in the project is absent from `layers`. Summary = lowest tier present; `none` if any used part has `status: 'not-modelled-yet'` and nothing else is modelled; a not-modelled part appears in `unmodelled`, not in the tier minimum (R-099, SA-20).
- Input and output schemas. Entries validate against a hand-written check in `checkEntry` (no new JSON Schema file; the TypeScript type is the contract). IDs follow `ID_MODEL` or `ID_ENGINE` by `kind`.
- API contracts. none.
- Algorithm. `projectFidelity`: collect runtime engines from `simulation.runtimes[]`, the solver from `simulation.solver.engine`, each part's descriptor `simulation.tier` and its model ids from `modelsOf(descriptor)`, map to entries, group by layer, take the minimum by order T0 < T1 < T2 < T3.
- State transitions. none. Validation rules. Every `labels.chip` and `labels.summary` is a non-empty string, and a member of `knownKeys` when that is passed. Ids unique. `supersedes` must name an existing id.
- Error conditions. `RegistryError` with a list: bad id shape, tier above allowed, banned word, missing label key (only when `knownKeys` is passed), unknown `supersedes`.
- Edge cases. A project with no runtime (circuit only) has no `execution` chip. A descriptor naming a model id with no entry is a load problem in T-B8-22's coverage test, and a runtime `unmodelled` item here. Two parts of different tiers: the chip shows the lower.
- Permissions. none. Performance. Registry of under 200 entries loads in under 5 ms (ESTIMATED); loaded once per worker and once per UI.
- Migration. none.
- Preflight. `test -e src/sim/core/hash.ts src/parts/registry.ts src/studio/fidelity/static-tier.ts`; read the Uno descriptor's `simulation` block to confirm field names.

**Verification**

- Unit tests. `tiers.test.ts`: T2 asserted with only a `self-consistency` record fails; T1 with empty `unsupported` fails; T3 on a `part-model` fails; a `bench` record adds the board mark but no tier; `findBanned("Validated against ngspice")` is non-empty and `findBanned("Within 2 percent of ngspice on 20 circuits")` is empty. `registry.test.ts`: the four seed entries load; id shape errors; `supersedes` check; with `knownKeys` given, an entry whose label key is missing fails and names it, and without `knownKeys` no key is checked (the check against the real English file is `coverage.test.ts` in T-B8-22). `inRange`: inside, outside and no-range cases. `project.test.ts` (it passes a stub `modelsOf`): the Uno blink project gives `execution T1, circuit T1, summary T1`; the env-monitor example (`schemas/examples/env-monitor-esp32.project.json`) gives layers for execution, circuit and protocols and a summary equal to the minimum; a part with `status: 'not-modelled-yet'` is listed in `unmodelled` and does not lower the summary. There is no test against `scripts/copy-check.mjs`: the file does not exist yet (fact 29, created by T-B1-20) and its list is different (`validated`, `live prices`, `Proof of Build`, `Solana`, `credential`, `sponsor`; only `validated` overlaps), so such a test would fail. The drift guard for our six words is `banned.test.ts` in T-B8-22, which asserts that `BANNED_WORDS` equals the literal array in `src/i18n/b8-copy.test.ts`. Sharing one list with `copy-check.mjs` would mean editing T-B1-20's file; B8 does not.
- Integration. `npx tsc -p tsconfig.portable.json` (module is portable).
- Playwright. none.
- Fixtures. The example projects under `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/` (`uno-blink-d12`, `env-monitor-esp32`). The module under test is portable and reads no file; the test files may read them with `fs`, or use the loader of `src/project/examples.test.ts` (T-B2-15).
- Acceptance. Given a registry entry that claims T2 without an oracle record, When the registry loads, Then loading fails and names the entry. Given a project of mixed tiers, When chips are computed, Then the summary equals the lowest.
- Observability. `RegistryError.problems[]` printed by the test and by T-B8-22.
- Release blockers. Any path that outputs the word "validated"; a tier chip above the allowed tier.

**Delivery**

- Definition of done. Four modules, four seed entries, tests, portable build clean.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim/registry && npx tsc -p tsconfig.portable.json`.
- Documentation. T-B8-23 generates the page.
- Rollback. `git revert`; nothing else imports the module until G3.
- Later tasks need. T-B8-04 (chips), T-B8-05a (model ids on elements), T-B8-10 (provenance reads `operatingRange` and `knownFailureCases`), T-B8-22 (data), T-B8-23 (page).

---

### T-B8-04 Tier chips per layer, lowest-tier summary, registry-driven "What it models"

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-04 |
| Subsystem | Studio UI |
| Phase / group / priority | B8 / G3 / P0 |
| Dependencies | T-B8-03, T-B8-05a (`modelIdsOf`), T-B8-22 (so the lists are complete), T-B8-27 (strings); T-B4-15 (`ModelsPanel.tsx`, `static-tier.ts`) |
| Status | not started |
| Source files (3) | new `src/components/studio/TierChips.tsx`; edit `src/components/studio/ModelsPanel.tsx`, `src/studio/fidelity/static-tier.ts` |
| Test files | new `src/components/studio/TierChips.test.tsx`, edit `ModelsPanel.test.tsx` |

**Intent**

- Problem. B4 shows one hand-written tier label (T-B4-15). SIM 4.1 rule 1 needs one chip per layer and a summary equal to the lowest, so a T3 CPU beside a T1 circuit does not print a flattering word.
- Target user. A maker deciding how far to trust a result.
- Story. As a maker I want to see which layer is a teaching model and which runs real firmware, and the weakest one named first.
- Expected behaviour. `TierChips` shows one chip per layer from `projectFidelity`, and a `TierSummaryChip` for the lowest. Each chip is a button that opens the "What it models" panel at that layer. The panel lists three groups per layer, Modelled, Mocked, Not modelled yet, each line linking to its registry entry; validation renders "Within {pct} percent of ngspice on {n} circuits ({date})" or "Not checked against a reference." Stale records (older than the model version) show "stale" (key `fidelity.panel.staleTag`). A part with `status: 'not-modelled-yet'` appears under Not modelled yet and shows no number anywhere. `static-tier.ts` becomes a thin adapter over `projectFidelity` (no second copy of tier text).
- Success metric. SA-17 UI half and SA-20 chips: summary equals the lowest on three fixture projects; the banned-word test passes over the rendered English text.

**Implementation**

- Existing code. `src/components/studio/ModelsPanel.tsx` and `src/studio/fidelity/static-tier.ts` (T-B4-15; read them first for props). The i18n hook of T-B4-01.
- Modules.

```tsx
export function TierChips(props: { fidelity: ProjectFidelity; onOpenLayer(layer: LayerTier['layer']): void }): JSX.Element
export function TierSummaryChip(props: { fidelity: ProjectFidelity }): JSX.Element     // mounted by T-B8-20 in StudioEntry
export function validationLine(v: ValidationRecord | undefined, t: TFunction): string  // pure; tested
```
  `static-tier.ts`: `export function staticTier(doc, reg): ProjectFidelity` returns `projectFidelity(doc, reg, modelIdsOf)` with `modelIdsOf` from `src/sim/analog/live.ts` (T-B8-05a); old exports kept as re-exports for one phase only if another file imports them (grep first; delete the unused ones).
- Data model. Reads `ProjectFidelity`, `FidelityEntry.implements/mocked/unsupported/validation/labels`.
- Input and output. Props in, DOM out. Chip text: T0 "Illustration. Not a calculation."; T1 "Teaching model"; T2 "Calculated model"; T3 "Runs your compiled firmware" (SIM 4.4), all via keys of T-B8-27.
- API contracts. none. Algorithm. `validationLine` picks the newest `pass` record of kind `oracle` or `analytic` for T2 text; `bench` record yields "Measured on hardware: {n} circuits, error table"; none yields "Not checked against a reference."
- State transitions. Panel open/close in the ui store (T-B4-01). Validation. Unknown layer ignored. Errors. A registry id missing for a used model renders "{model} is not modelled yet" (key `fidelity.notice.model`) and logs the id (T-B8-22 makes this unreachable for shipped projects).
- Edge cases. Zero layers (empty project): no chips, summary hidden. Right-to-left: none. Narrow width: chips wrap. Colour is never the only encoding: each chip carries its tier text.
- Accessibility. Chips are `button`s with an accessible name "Circuit: Teaching model. Open details" (key `fidelity.chip.aria`, arguments `layer` and `tier`). Focus returns to the chip when the panel closes.
- Permissions: none. Performance: recompute only when `doc` revision or the runtime list changes (select stable slices, FA-04). Migration: none.
- Preflight. `test -e src/components/studio/ModelsPanel.tsx src/studio/fidelity/static-tier.ts src/sim/registry/entries.ts`.

**Verification**

- Unit tests. `TierChips.test.tsx`: renders one chip per layer; the summary equals the lowest on (a) Uno blink (T1, T1, T1), (b) Uno firmware mode with circuit T1 (execution T3, circuit T1, summary T1; uses a test entry with `kind: 'runtime'` tier T3), (c) a project with one not-modelled part (listed, no number). `validationLine` four cases. Banned-word test over `en/fidelity.json`. Keyboard: Tab reaches each chip, Enter opens the panel.
- Integration. `V src/components/studio src/studio`.
- Playwright. Covered in T-B8-20's `e2e/instruments.spec.ts` (chips visible after load, axe clean).
- Fixtures. Test registry built with `loadRegistry([...])` inline.
- Acceptance. Given an Uno project in firmware mode with an LED and resistor, When I open Studio, Then I see "Execution: Runs your compiled firmware", "Circuit: Teaching model", and a summary "Teaching model". Given an unmodelled part, When I open "What it models", Then it lists the part under Not modelled yet.
- Observability. none beyond DOM. Release blockers. A chip above the registry tier; any "validated" string; colour-only state.

**Delivery**

- Definition of done. Chips and panel read the registry only; no tier text left in `static-tier.ts`.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/components/studio src/studio`.
- Documentation. none. Rollback. `git revert`. Later tasks need. T-B8-20 mounts `TierSummaryChip`; T-B8-23 uses the same labels.

---

### T-B8-05a Live analog solver: `LiveAnalog` implements `AnalogSolver`

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-05a |
| Subsystem | Simulation, analog |
| Phase / group / priority | B8 / G2 / P0 |
| Dependencies | T-B8-30 (`pinElectrical`), T-B8-03 (model ids); T-B3-16 to T-B3-18 |
| Status | not started |
| Source files (1) | new `src/sim/analog/live.ts` |
| Test files | new `src/sim/analog/live.test.ts`, `src/sim/analog/live-linear.test.ts`; fixture (data) `src/sim/analog/fixtures/rs08-linear.json` |

Split out of the old T-B8-05 by the review of 2026-10-27 (issues 2 and 3). The orchestrator, pin, world and bind wiring and the ADC change are T-B8-05b.

**Intent**

- Problem. The pure solver exists (T-B3-16 to T-B3-18) but nothing turns a `SimNetlist` into elements, keeps factors between ticks, or re-solves only the part of the circuit that changed. SIMULATION_ARCHITECTURE 7.2 defines the stateful wrapper `AnalogSolver`; no file implements it for the live path.
- Target user. T-B8-05b (the orchestrator), T-B8-06 (states), T-B8-10 (probes), T-B8-11 and T-B8-28 (what-if solves).
- Story. As a maker, when I wire a divider to A0, I want the circuit solved from the netlist I drew, and a part with no model listed as "not modelled yet" while the rest still solves.
- Expected behaviour. `createLiveAnalog` returns an object that implements `AnalogSolver` exactly as SIMULATION_ARCHITECTURE 7.2 and A.3 write it. `load` builds elements for every part the table below covers, lists the rest in `LoadReport.unmodelled`, and leaves them out of the matrix. `apply` takes `Change` records; `advanceTo` re-solves the dirty components and returns an `AnalogStepResult`. Digital inputs fed by an analog net cross the board's `vilFrac` and `vihFrac` with hysteresis and are reported as `SimEvent`s in `AnalogStepResult.events`.
- Success metric. SA-03 linear cases: C01 to C05, C18, C19 of RS-08 within 1e-6 relative of the ngspice values in `results.json` (`matched_warm.rows[].spice`) and the 60 random networks within 1e-6; the SA-02 equivalence of T-B3-18 still passes.

**Implementation**

- Existing code. `figures/engine/bench-solve.js:60-113` (the element builder this replaces on the live path; line numbers in the table below), `:161` (pin Norton source, the behaviour `PIN` must reproduce); the T-B3 files of section 5.
- Contract names. Binding, from `SIMULATION_ARCHITECTURE.md`: `AnalogSolver` (line 649), `Change` (A.3), `AnalogStepResult { at, converged, solves, skippedClean, events, diagnostics, worstKclAmps }` (A.3), `LoadReport { ok, components, nodes, elements, unmodelled: { part, reason }[], diagnostics, modelIds }` (A.3), `SolveOptions` (7.2), `EngineSnapshot` (A.2). This task invents none of them. `SolveOptions` and `LoadReport` carry no board data, so the board's pin numbers reach the PIN elements through one construction-time dependency, `PinDirectory`, and `load` keeps its two-argument form.
- Modules and signatures.

```ts
// src/sim/analog/live.ts
export type PinDirectory = (part: SimPart) => PinElectrical | null            // null: the part is not a board; built from pinElectrical(profile) (T-B8-30)
export interface LiveAnalog extends AnalogSolver {
  // from AnalogSolver, unchanged:
  load(net: SimNetlist, o: SolveOptions): LoadReport
  apply(changes: Change[]): void          // { kind: 'pin', element, level } and { kind: 'pwm', element, duty, hz } mark the PIN element's component dirty
  advanceTo(t: SimTime): AnalogStepResult
  snapshot(): EngineSnapshot; restore(s: EngineSnapshot): void
  // additions. They are not in SIMULATION_ARCHITECTURE A.3; the doc fixer adds them (review-fix notes at the end of this file):
  netVolts(net: NetId): number | null                       // null when not modelled or not converged
  pinVolts(element: ElementId): number | null
  componentResult(net: NetId): SolveResult | null           // the last SolveResult of the component that holds the net
  whatIf(o: { extra?: Element[]; sources?: 'live' | 'off'; params?: Record<ElementId, Partial<Element>> }): SolveResult   // pure re-solve on the same topology; changes no state (T-B8-11, T-B8-28)
}
export function createLiveAnalog(d: { solve: typeof solve; pins: PinDirectory }): LiveAnalog
export function pinElementId(boardPartId: string, pinName: string): ElementId        // `pin:${boardPartId}:${pinName}`; T-B8-05b maps pin writes to it
export function buildElements(net: SimNetlist, pins: PinDirectory, o: SolveOptions):
  { elements: Element[]; nodeOf: ReadonlyMap<NetId, number>; unmodelled: LoadReport['unmodelled']; modelIds: string[] }
export const MODEL_TABLE: Readonly<Record<string, readonly string[]>>               // descriptor id to registry model ids, the rows below
export function modelIdsOf(descriptorId: string): readonly string[]                 // T-B8-04 passes it to projectFidelity
```

- Which catalogue part becomes which element. One row per file in `figures/parts/` (29 files, VERIFIED by `ls`). The B2 descriptor id is `part:<file name without .js>@1`. `SW`, `R`, `V`, `PIN` and `PWM` have no `modelId` field in 7.2; their registry id reaches only `LoadReport.modelIds`.

| Catalogue part (`figures/parts/`) | Old element (`bench-solve.js`) | New `Element` | Registry model id |
|---|---|---|---|
| `resistor.js` | `res` :89 | `R` | `model:resistor.linear@1` |
| `wire.js`, `breadboard.js` | `wire` :88 | none; the netlist already merged the nets | none |
| `led.js`, `rgb-led.js` (one `D` per colour channel), `traffic-light.js` (three) | `led` :100 | `D`, `params { kind: 'pwl', vfVolts, rdOhms: 0.5 }`; `imax` stays a part param read by T-B8-06 | `model:led.pwl@1` |
| `diode-1n4007.js` | `diode` :104 | `D` pwl, 0.7 V and 0.2 ohm | `model:diode.pwl@1` |
| `npn-2n2222.js`, `tip120.js` | `npn` :105 | `Q` pwl with `hfe`, `vbe`, `vcesat` from the part | `model:npn.pwl@1` |
| board signal pins (all 12 profiles) | pin Norton :161 | `PIN`; `PWM` with `mode 'averaged'` for a PWM pin | `model:source.thevenin@1` |
| board rails (`5V`, `3V3`, `VIN`, USB), `lipo-2s.js`, `aa-holder-4.js` | rail sources | `V` with `rSeriesOhms` (rail 0.5 ohm, `RAIL_R`, `bench-solve.js:10`) | `model:source.thevenin@1` |
| `push-button.js` | `button` :99 | `SW` | `model:button.switch@1` |
| `potentiometer.js` | `pot` :95 | `BEHAV`; the stamp is two resistances `R*x` and `R*(1-x)`, each floored at 0.5 ohm; `pmax` param for the burn rule | `model:pot.linear@1` |
| `ldr.js`, `fsr402.js`, `soil-moisture.js` | resistive sensors | `R` whose ohms come from the part param the sensor input sets | `model:resistor.linear@1` |
| `dc-motor.js`, `tt-motor.js`, `fan.js`, `nema17.js` | `motor` :110 | `BEHAV` steady load (running and stall resistance) | `model:motor.steady@1` |
| `servo-sg90.js` | `servo` :111 | `BEHAV` | `model:servo.rule@1` |
| `stepper-28byj48.js` with `uln2003.js` | `stepper` :90 | `BEHAV` per coil (50 ohm default); each ULN2003 channel is a `Q` | `model:stepper-coil.resistive@1`, `model:npn.pwl@1` |
| `piezo-buzzer.js` | `buzzer` :113 | `BEHAV` | `model:buzzer.rule@1` |
| `tmp36.js` | `sensor` TS :112 | `BEHAV` | `model:tmp36.rule@1` |
| `hc-sr04.js`, `mpu6050.js`, `ssd1306.js`, `multimeter.js` | none | no element: a digital device or an instrument; its supply pins are high impedance in the analog solve and it is not listed as unmodelled | none |

  A part whose descriptor has `simulation.status: 'not-modelled-yet'`, or whose descriptor is absent from the table, goes to `LoadReport.unmodelled` with a reason and no element. T-B8-22's registry data must hold every model id in the right-hand column (they are listed there as literals), and T-B8-06 tests that each one resolves.
- Events. `advanceTo` returns `SimEvent`s with `src 'engine:analog-live'`, `phase 3`, `rank 20`. Kind `net-threshold`, payload `{ net, level: 0 | 1, volts }`, for every digital input whose analog net crossed `vihFrac` (rising) or `vilFrac` (falling) of its board supply; between the two fractions the level holds (hysteresis). T-B8-06 adds kind `honest-state`. The orchestrator assigns `seq` when it enqueues them (SIMULATION_ARCHITECTURE 5.5); this module writes `seq: 0`.
- Data model. Elements per 7.2: `PIN { a, level, vHighVolts, rOutOhms, maxAmps }` with `rOutOhms` and `maxAmps` from `PinDirectory`; `V { rSeriesOhms }`; `R`; `BEHAV`; `D` and `Q` in `pwl` mode. `GMIN` is 1e-9 in `pwl` mode (`SolveOptions.gminSiemens`).
- Snapshot. `EngineSnapshot { engine: 'engine:analog-live', engineVersion, schema: 1, data }` with `data` holding node voltages, PIN levels, PWM slice state and dirty flags. T-B8-06 adds its latch state under `data.tracker`.
- Input and output schemas. `SimNetlist` (5.2) in; `LoadReport`, `AnalogStepResult` out. No wire format.
- API contracts. none. Algorithm. Union-find nets to node indices; partition into connected components; per component keep matrix, factors and a dirty flag; re-solve only dirty components (`solves` and `skippedClean` report the split); `pwl` rounds as in the old solver (up to 40, `ROUNDS`). Convergence failure keeps the last state, sets `converged: false` and returns diagnostic `no-convergence` naming the worst net (surfaced by T-B8-06).
- State transitions. Analog engine states follow the orchestrator's (`idle running paused halted done`).
- Validation rules. An `apply` for an element id not in the netlist is a diagnostic `unknown-pin`, not a throw. Duty in 0 to 1, hz greater than 0.
- Error conditions. `no-convergence`, `floating-node`, `not-modelled-yet` (from `SolveResult.diagnostics`), `unknown-pin`.
- Edge cases. A pin in `Z` state is open. Two boards on one net. A board pin driven both by code and by an external source. A duty change inside one timestamp (last `apply` wins in call order). `whatIf` with `sources: 'off'` shorts rails and opens pins and leaves the live state alone.
- Permissions: none. Performance. Dense LU up to 150 unknowns, reuse of factors per topology (SIM 7.2 point 2); the largest catalogue circuit under 1 ms per tick at 4x throttle is measured in T-B8-08. Migration. None; old labs do not use this path.
- Preflight. `test -e src/sim/analog/solve.ts src/sim/analog/elements.ts src/sim/analog/legacy-adapter.ts src/lib/interp/profiles.ts`; `grep -n "pinElectrical" src/lib/interp/profiles.ts`; `ls figures/parts | wc -l` prints 29 (if not, add the new file to the table).

**Verification**

- Unit tests. `live.test.ts`: `LoadReport` has the fields `ok`, `components`, `nodes`, `elements`, `unmodelled`, `diagnostics`, `modelIds` and no other; `buildElements` for a divider and for a project with one unmodelled part (the part listed, no element, the rest solves); one case per row of the table above (a netlist with that part gives the stated element kind and model id; `ls figures/parts` is read with `fs` and every file has a row); `apply` of a `pin` change toggles the PIN element and marks only its component dirty (`skippedClean` counts the other); a `net-threshold` event appears when a net crosses `vihFrac` and not again until it falls below `vilFrac`; convergence failure returns the diagnostic and keeps the last state; `whatIf` leaves `snapshot()` unchanged; `snapshot` then `restore` then `advanceTo` equals continuing. `live-linear.test.ts` (class N): C01 to C05, C18, C19 and 60 random networks against ngspice values stored in `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/data/results.json` and `random-stress.json`, copied into `src/sim/analog/fixtures/rs08-linear.json` by the task (a fixture is data, 0 files). The fixture keeps the real shape of `results.json`: an array of 20 objects with `id`, `rails` and `matched_warm.rows[] { kind 'V' or 'I', name, solver, spice }`.
- Integration. `V src/sim/analog`. T-B3-18's equivalence test must still pass: `V src/sim/analog/equivalence.test.ts`; `node figures/engine/bench-solve.test.mjs`; `npx tsc -p tsconfig.portable.json`.
- Playwright. none. Fixtures. `src/sim/analog/fixtures/rs08-linear.json` (VERIFIED source values).
- Acceptance. Given a project with an unmodelled part, When it loads, Then `LoadReport.unmodelled` names the part, it has no element and no number, and the rest of the circuit solves. Given C01 to C05, C18 and C19, When solved, Then every node voltage and branch current is within 1e-6 relative of ngspice.
- Observability. `LoadReport.unmodelled` and `diagnostics` go to the Problems pane; `solves` and `skippedClean` feed `SimStats` (used by T-B8-08).
- Release blockers. SA-02 equivalence fails; a part with no row that is neither modelled nor listed; the old figures stop working.

**Delivery**

- Definition of done. One file; SA-03 linear numbers pass; tests green; portable build clean.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim/analog && npx tsc -p tsconfig.portable.json && node figures/engine/bench-solve.test.mjs`.
- Documentation. none. Rollback. `git revert`; nothing imports the module until T-B8-05b.
- Later tasks need. T-B8-05b (wiring), T-B8-06 (states and rails in `live.ts`), T-B8-07, T-B8-10 (tap reads `netVolts`, `pinVolts`, `componentResult`), T-B8-15 (snapshot), T-B8-28 (tolerance hook), T-B8-04 (`modelIdsOf`).

---

### T-B8-05b Analog on the live path: orchestrator, pins, world, bind, ADC

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-05b |
| Subsystem | Simulation, orchestrator and interpreter binding |
| Phase / group / priority | B8 / G3 / P0 |
| Dependencies | T-B8-05a, T-B8-21 (ADC decision), T-B8-30; T-B3-11, T-B3-15 |
| Status | not started |
| Source files (4) | edit `src/sim/orchestrator.ts`, `src/sim/digital/pins.ts`, `src/lib/interp/world.ts`, `src/sim/mcu/bind.ts` |
| Test files | new `src/sim/orchestrator.analog.test.ts` |

**Intent**

- Problem. `LiveAnalog` (T-B8-05a) exists but the run does not use it: pin levels reach part states through the netlist only (T-B3-11), and `analogRead` reads a number the host set (`world.ts:324-337`). A wrong resistor changes nothing the code sees.
- Target user. A maker who builds a divider, a wrong resistor, a pot on an analog pin.
- Story. As a maker, when I wire a divider to A0 and read it in code, I want `analogRead` to return the count for the voltage the circuit really has.
- Expected behaviour. R-100 and SIM-2 to SIM-4. Each pin write or PWM change becomes a `Change` for the PIN or PWM element; the dirty component re-solves in the same timestamp (P3); node voltages return to part states and to `analogRead`; `net-threshold` events from the solver become digital net changes. The ADC count follows the decision of T-B8-21.
- Success metric. A divider read through `analogRead` gives `floor(V*2^bits/Vref)` (clamped) for 10 and 12 bit boards, or the old formula if SP-B8-01 says so; the REF-3 corpus still passes; the SA-02 equivalence of T-B3-18 still passes.

**Implementation**

- Existing code. `world.ts:324-337` (`analogRead`: `volts`, `ext`, `dac`, noise at `:333`, formula at `:336`); `world.ts:220-226` (`pin`); the T-B3 files in section 5.
- Modules and signatures.

```ts
// pins.ts
export interface PinChange { board: PartId; pin: string; level: 0 | 1 | 'Z'; pwm?: { duty: number; hz: number } }   // emitted when a pin mode, level or PWM setting changes
// world.ts
export type AnalogSource = (pin: number) => number | null   // volts at the pin, or null = nothing connected
setAnalogSource(fn: AnalogSource | null): void
// analogRead(n, bits): v = source(n) when set; count = Math.min(max, Math.max(0, Math.floor(v * (max + 1) / adcVref)))  (if SP-B8-01 says adopt)
```

  `orchestrator.ts`: registers the live analog as an engine of rank 20; after the P2 pin events it turns each `PinChange` into `{ kind: 'pin', element: pinElementId(board, pin), level }` or `{ kind: 'pwm', element, duty, hz }` and calls `live.apply`; at P3 it calls `live.advanceTo(at)`, enqueues the returned `SimEvent`s (assigning `seq`), and applies each `net-threshold` event as a digital net change before P4. `pins.ts`: exposes the `PinChange`. `bind.ts`: installs `world.setAnalogSource(pin => live.pinVolts(pinElementId(board, pinName(pin))))` and forwards `world.onPinWrite` to the orchestrator. `world.ts`: `setAnalogSource` and the formula.
- Data model, input and output schemas, API contracts: none.
- Algorithm. As above. A pin write and the solve it causes share one `at`. The detailed phase order and tie-break are T-B8-09.
- State transitions. `restore` of the orchestrator restores the analog engine through `Engine.restore` (generic); nothing new here.
- Validation rules. A pin that is in no board's netlist part is ignored by the analog path (the digital path still handles it).
- Error conditions. The analog diagnostics surface through `LoadResult.analog` (SIMULATION_ARCHITECTURE A.2).
- Edge cases. Unconnected `analogRead` pin returns the floating-noise path (T-B8-06 owns the noise stream). A pin written twice inside one timestamp (last write wins in `seq` order). `setAnalogSource(null)` returns the old behaviour.
- Permissions: none. Performance. One `apply` and one `advanceTo` per timestamp that has a pin change; none otherwise. Migration. None.
- Preflight. `test -e src/sim/analog/live.ts src/sim/orchestrator.ts src/sim/mcu/bind.ts src/sim/digital/pins.ts`; read the SP-B8-01 report and apply its verdict; `grep -n "snapshot" src/sim/orchestrator.ts`.

**Verification**

- Unit tests. `orchestrator.analog.test.ts`: a 10k/10k divider from the 5V rail with the RS-08 rail values (`results.json` C01 `rails`: 5V at 4.95 V) read with `analogRead(A0)` returns 506 on the Uno (`floor(2.4749 * 1024 / 5)`); on a 3.3 V 12-bit board the count equals `floor(netVolts * 4096 / 3.3)` of the solved node, computed in the test from `netVolts`, not typed; a pot sweep is monotone; a resistor changed by the operation `param.set` gives a different count at the next tick; a `digitalWrite` on a pin that drives an LED changes that LED's current at the same `at`; `setAnalogSource(null)` gives the old reading.
- Integration. `V src/sim src/lib/interp src/sim-host`. T-B3-18's equivalence test must still pass: `V src/sim/analog/equivalence.test.ts`; `node figures/engine/bench-solve.test.mjs`.
- Playwright. none here (T-B8-20 and T-B8-19 exercise it end to end).
- Fixtures. Inline netlists and the RS-08 rail values.
- Acceptance. Given the Uno divider project with A0 on the midpoint, When I run `analogRead(A0)` in a loop, Then serial shows 506 (rail 4.95 V as in RS-08 C01) and, after I change R2 from 10k to 1k, shows 92 (`floor(0.44998 * 1024 / 5)`).
- Observability. The solve count per second is a stat in `SimStats` (used by T-B8-08).
- Release blockers. SA-02 equivalence fails; any lesson reference run changes pass/fail (SP-B8-01 must have said this cannot happen, or Amar has accepted a list).

**Delivery**

- Definition of done. Four files; divider read-back works on 10 and 12 bit boards; tests green; portable build clean for `src/sim`.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim src/lib/interp src/sim-host && npx tsc -p tsconfig.portable.json && node figures/engine/bench-solve.test.mjs`.
- Documentation. none. Rollback. `git revert`; `world.setAnalogSource(null)` returns the old behaviour, so a partial revert of `bind.ts` alone is safe.
- Later tasks need. T-B8-06 (`world.ts` floating noise), T-B8-09 (phase order in `orchestrator.ts`), T-B8-14 (host controls over the live orchestrator), T-B8-15 (snapshot).

---

### T-B8-06 Honest states: over-current, burn-out, brown-out, floating input, no-convergence

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-06 |
| Subsystem | Simulation, analog states and rails |
| Phase / group / priority | B8 / G4 / P0 |
| Dependencies | T-B8-03 (`inRange`), T-B8-05a (`live.ts`), T-B8-05b (`world.ts`, orchestrator), T-B8-22 (the six `failure:*` entries and the `operatingRange` data), T-B8-27 (message keys); T-B3-17 (diagnostics), T-B3-20 (`Evidence`) |
| Status | not started |
| Source files (5) | new `src/sim/analog/states.ts`, `src/sim/analog/rails.ts`; edit `src/sim/analog/live.ts`, `src/lib/interp/world.ts`; board descriptor data set `src/parts/data/uno-r3.component.json` and `esp32-devkitc.component.json` (counts 1) |
| Test files | new `src/sim/analog/states.test.ts`, `rails.test.ts`, `src/lib/interp/floating.test.ts` |

**Intent**

- Problem. The old solver latches damage in five rules (`bench-solve.js:317, 328, 341, 372, 379`) with wall-frame timers and one fixed message ("far above its 20 mA", `:317`). Brown-out is two constants (a 0.6 s sag times 0.42, `bench-bb.js:113-116`; a rail below `mcu.min`, `bench.js:~312`). Non-convergence exits silently after 40 rounds (`bench-solve.js:10`). Floating-pin noise comes from one shared stream, so one extra read changes every later value (`world.ts:333`, SIM 5.7). The live path (T-B8-05a, T-B8-05b) needs the same facts as computed, evidenced states.
- Target user. A maker whose circuit is wrong in an ordinary way: no resistor, a stalled motor on the USB rail, an unconnected input.
- Story. As a maker, when my circuit damages a part, resets the chip or reads noise, I want the tool to say what happened, with the numbers it computed, and nothing it did not compute.
- Expected behaviour. The state tracker returns `HonestState` records, one per event, each with `Evidence` (SIM 13.4 shape) and an i18n message. Kinds: `burn-out` (the five latch rules, thresholds as in the old file, timers in `SimTime`), `over-current` (pin current above `pinElectrical(board).maxAmps`; code `pin-overcurrent`), `brown-out` (rail under the board minimum with hysteresis and dwell; raises a reset event to the MCU engine at P4), `floating-input` (an input net with no driver and no pull; code `floating-input`; reads go through the per-pin stream `noise:<pin>`), `no-convergence` (worst net and last state, R-099), `not-modelled` (part and reason). A board with no known minimum shows "brown-out threshold not known for this board" and does not guess. `HonestState`, `HonestKind` and `StateTracker` are additions to the architecture, which has only `AnalogStepResult.events: SimEvent[]`: `live.ts` publishes each record as a `SimEvent` of kind `honest-state` (the record is the payload; it is structured-clone safe) and the rail events as kinds `brownout` and `reset` (the `SimEventPublic` kinds). No field is added to `AnalogStepResult`. Evidence provenance comes from `inRange` (T-B8-03): a quantity outside the entry's `operatingRange` is `approximation` with `noteKey 'fidelity.reading.outsideRange'`, otherwise `computed`.
- Success metric. SA-04 on the live path (three constructed non-convergent circuits give `no-convergence` with the worst net; zero silent exits over the RS-08 20 and the converted corpus); C10 gives `burn-out` with the solver's 117.65 mA and evidence provenance `approximation` (0.1176 A is outside the LED's checked range of 0.001 to 0.030 A); C20 gives `brown-out` (verdict equal to the old rule and to ngspice, SIM 7.6); the floating-input stream of pin A is unchanged by reads of pin B.

**Implementation**

- Existing code. `bench-solve.js:296-345, 362-380` (rule bodies, thresholds `imax * 2.5`, `isurge`, `tjmax 150`, `icmax * 1.5`, `vabs 7`, `revT 3`, `pmax`, `hotT 2`); `bench.js:266-270, 312` (sag rule); `figures/boards/uno-r3.js:134` (`mcu.min 2.7`, rail `5V`), `:120` (USB `ilim .5`); `figures/boards/esp32-devkitc.js:149` (`min 2.43`, rail `3V3`); `world.ts:333`.
- Modules and signatures.

```ts
// states.ts
export type HonestKind = 'burn-out' | 'over-current' | 'brown-out' | 'floating-input' | 'no-convergence' | 'not-modelled';
export interface HonestState {
  kind: HonestKind; at: SimTime; partId?: string; net?: NetId; pin?: PinKey;
  deviceState?: DeviceState;                 // from SolveResult.state: 'burnt' | 'open' | 'on' | ...
  causeHint?: string;                        // a closed cause id (cause-ids.ts); B10 builds the Diagnosis from it
  evidence: Evidence[];                      // kind 'branch-current' | 'net-voltage' | 'state' | 'pin-level'; provenance, tier, modelIds filled
  messageKey: string; messageArgs: Record<string, string | number>;
}
export interface StateTracker {
  step(results: readonly SolveResult[], at: SimTime): HonestState[];   // one SolveResult per component solved this tick (AnalogStepResult carries no per-element data)
  burnt(): ReadonlySet<string>;              // latched part ids
  repair(partId: string): void;              // the Repair button clears one latch
  snapshot(): unknown; restore(s: unknown): void;
}
export function createStateTracker(reg: Registry, power: Record<string, BoardPower>): StateTracker
export function roundSig(x: number, digits: number): number     // 117.65 mA with 2 gives 120

// rails.ts
export interface BoardPower { boardId: string; mcuRail: string; vccMinVolts: number | null; hysteresisVolts: number; minDwellNs: number; resetNs: number; source: string }
export function readBoardPower(descriptor: ComponentDescriptor): BoardPower      // vccMinVolts null when the descriptor has no rating
export function droopSource(el: Extract<Element, { kind: 'V' }>, solveWith: (rSeries: number) => number): number  // series resistance that holds the current at limit.amps, mode 'droop'
export function createBrownout(p: { thresholdVolts: number; hysteresisVolts: number; minDwellNs: number; resetNs: number }): { step(volts: number, at: SimTime): 'ok' | 'low' | 'reset' | 'recovering' }
```

- Data model. Failure rules are code keyed by the registry ids (exported as the literal array `FAILURE_IDS`) `failure:led-overcurrent@1`, `failure:diode-overcurrent@1`, `failure:npn-overheat@1`, `failure:tmp36-overvoltage@1`, `failure:pot-track-overpower@1`, `failure:pin-overcurrent@1` (entries made by T-B8-22). A trigger written as a string expression needs an evaluator, and `eval` is banned in `src/sim` (SA-11), so the thresholds are code constants with the same values as the old file and each is also stated in the entry's `implements` text. The expression evaluator belongs to B10. Descriptor change: rating key `vcc_min` (volts) added to the Uno (2.7, source `figures/boards/uno-r3.js:134`) and the ESP32 DevKitC (2.43, source `figures/boards/esp32-devkitc.js:149`); every other board has none (UNKNOWN). Preflight greps the Uno descriptor for the rating key convention and uses it.
- Algorithm. Per solve result: for each element, apply its rule; a rule that fires latches the part id (monotone until `repair`) and emits one `HonestState`. Windowed rules keep a nanosecond accumulator (reverse TMP36 over 3 s, pot over `pmax` for 2 s). Brown-out: the MCU rail node voltage crosses `thresholdVolts` downward and stays for `minDwellNs` (default 10 ms, PROPOSAL; the old file uses frame time) then `reset` is emitted for `resetNs`; release needs `threshold + hysteresis`. Droop (SIM 7.6): when a `V` element with `limit.mode 'droop'` carries more than `limit.amps`, bisect its series resistance (at most 30 iterations, deterministic) until the current equals the limit; USB gets `{ amps: 0.5, mode: 'droop' }` from the descriptor's `ilim`. `rule:usb-sag@1` (0.6 s, times 0.42) stays only for the old figure engine. Floating noise: `World.floatNoise(n)` keeps one xorshift state per pin seeded from `hash(seed, 'noise:' + n)`; `analogRead` uses it at `world.ts:333`.
- State transitions. Part: `ok -> burnt` (latch) `-> ok` on `repair`. Rail: `ok -> low -> reset -> recovering -> ok`. Pin: `ok -> over-current` while above the limit, clears when below. `live.ts` calls `tracker.step(results, at)` with the `SolveResult`s of the components it solved and returns the records as `honest-state` events in `AnalogStepResult.events`.
- Input and output schemas. `HonestState` (above) goes to the orchestrator event log and to the UI over `SimToHost`. Evidence follows `Evidence` in `src/project/diagnosis.ts`.
- API contracts. none. Validation. `roundSig` handles 0 and negative; `digits` at least 1.
- Error conditions. `no-convergence` carries `worstNet` and `lastIterations`; `not-modelled` carries the reason from `buildElements`.
- Edge cases. A part burnt while a PWM slice averages: latch on peak in any slice, as the old file. A latched LED stays open for later solves. Brown-out at t = 0 of a run (start-up ramp): the dwell prevents a reset at power-on; the run starts with the rail up. A board with `vccMinVolts null`: no detector, one `not-modelled` note per run. Two floating inputs read in either order give the same two sequences.
- Permissions. none. Performance. Rule evaluation is linear in elements; under 5 percent of a tick on the largest corpus circuit (T-B8-08 measures). Migration. The old figure engine is untouched.
- Message text (keys from T-B8-27). Burn-out: "{name} burned out: {n} mA is far above its {imax} mA." with `n = roundSig(computedMilliamps, 2)` and `imax` from the part (RC-47: never a fixed number).
- Preflight. `test -e src/sim/analog/live.ts src/parts/data/uno-r3.component.json src/parts/data/esp32-devkitc.component.json src/sim/faults/cause-ids.ts`; `grep -n "led-no-series-resistor\|pin-overcurrent\|brownout\|floating-input" src/sim/faults/cause-ids.ts`.

**Verification**

- Unit tests. `states.test.ts` (class N for values, B for state order): C10 straight LED from D13 gives one `burn-out` for the LED with evidence `branch-current` 0.11765 A (relative 1e-6 against `results.json` C10 solver value 117.65 mA) and a message containing "120 mA" and "20 mA"; the evidence `provenance` is `'approximation'` with `noteKey 'fidelity.reading.outsideRange'` and `tier 'T1'`; C06 (220 ohm) gives none; a 143 mA load on a pin of the Uno gives `over-current` and the same load on the Uno R4 (8 mA) gives it at a smaller load; each of the other four burn rules has one case (diode over `isurge`, NPN `tj`, TMP36 reversed 3 s on `SimTime`, pot above `pmax` 2 s); a latched part stays latched across solves and `repair` clears it; the three constructed non-convergent circuits of T-B3-17's tests give `no-convergence` naming the worst net; a part with no model gives `not-modelled` with no number in `messageArgs`. `rails.test.ts`: C20 (stalled motor through a TIP120 on the USB 5V rail) gives `brown-out` and the old-rule verdict (`status 'brownout'`) is the same; droop holds the current at 0.5 A within 1e-6; hysteresis and dwell cases (a 5 ms dip does not reset, a 20 ms dip does); ESP32 minimum 2.43 V and Uno 2.7 V; a board with no minimum gives no reset. `floating.test.ts`: pin A read 100 times in two runs, once with reads of pin B interleaved, gives identical sequences; ten runs with one seed give identical sequences (SA-06 part).
- Registry links (review issues 7 and 8). `states.test.ts` also asserts: `FAILURE_IDS` equals the six literals listed in T-B8-22 and every one resolves in the registry loaded from `src/sim/registry/data`; every model id in `MODEL_TABLE` of `live.ts` (T-B8-05a) resolves there and the set equals the literal list in T-B8-22's coverage test.
- Integration. `V src/sim/analog src/lib/interp`; then `V src/content/boards` once (floating-pin lessons must keep passing, which is the check that the new stream did not move a reference).
- Playwright. none here (T-B8-20 reads the Problems pane and the overlay).
- Fixtures. `src/sim/analog/fixtures/rs08-states.json` copied from `RS-08/.../data/results.json` for C06, C10, C20 (values only).
- Acceptance. Given the Uno with an LED straight on D13, When I run, Then the LED is marked burnt, the Problems pane says "LED1 burned out: 120 mA is far above its 20 mA." and the evidence shows 117.65 mA labelled approximation, Teaching model, outside the range this model was checked over. Given a stalled motor on USB power, When it stalls, Then the board resets and the evidence names the rail voltage that fell below 2.7 V. Given an unconnected input, When I read it twice, Then the values vary and the diagnostic says the input is floating.
- Observability. Each `HonestState` is written to the orchestrator event log (kind `state`) and shown in Problems.
- Release blockers. A fixed current figure in any message; a brown-out verdict that differs from C20's old verdict; non-convergence that exits silently.

**Delivery**

- Definition of done. Five items changed; SA-04 live numbers recorded; C20 verdict regression green.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim/analog src/lib/interp src/content/boards`.
- Documentation. none now. Rollback. `git revert`; descriptors keep a harmless extra rating.
- Later tasks need. T-B8-15 snapshots `tracker.snapshot()`; T-B8-10 reads `deviceState` for approximation provenance; B10 turns `HonestState` into `Diagnosis` with hints.

---

### T-B8-07 LED and resistor cases computed, not fixed; the 113 mA figure cannot return

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-07 |
| Subsystem | Simulation, element stamps and prose guard |
| Phase / group / priority | B8 / G5 / P0 |
| Dependencies | T-B8-05a, T-B8-06 (the prose guard builds the C10 message through `createStateTracker`); T-B3-17 (`elements.ts`), T-B1-15 (README rewrite) |
| Status | not started |
| Source files (1) | `src/sim/analog/elements.ts` (edit only if a literal remains; see Preflight) |
| Test files | new `src/sim/analog/led-resistor.test.ts`, `src/sim/analog/prose-guard.test.ts` |

**Intent**

- Problem. The catalogue prose and README quote "113 mA" as a fixed number (`README.md:35`, UJ lines named in RC-47) that came from the old fixed pin model. RS-08 gives 117.65 mA from the solver and 114.46 mA from a realistic SPICE card (`REPORT.md:103`). A number typed in prose goes stale the day a model changes.
- Target user. Anyone reading a burn-out message or the docs.
- Story. As a reader I want every current I see to be a value the solver computed, and I want prose that quotes a number to agree with the solver.
- Expected behaviour. LED and resistor stamps read `vf`, `rs` (the 0.5 ohm junction resistance), `imax` and the pin source (`rOutOhms`) from the part descriptor and the board's `pinElectrical`, not from literals in `elements.ts`. A test table pins the RS-08 values. A guard fails the build if "113 mA" appears in `README.md`, `docs/FIDELITY.md`, `src/i18n/messages/*/*.json` or `src/i18n/content/en/**`.
- Success metric. C06 12.220, C07 23.904, C08 0.299, C10 117.65 mA (class N, relative 1e-6 against the matched-model column of `results.json`); the shown C10 figure lies within 5 percent of the realistic value 114.46 mA; zero hits of the guard.

**Implementation**

- Existing code. `src/sim/analog/elements.ts` (T-B3-17; stamps for `R`, `D` with `led`, `PIN`); `figures/engine/bench-solve.js:10, 100` for the constants the stamps must reproduce (`.5` ohm, `vf` per colour 2.0/2.1/2.2/3.0/3.1 from the part files).
- Modules. No new exports required. If `elements.ts` still holds a numeric literal for pin resistance (25), junction resistance (0.5), or `GMIN`, replace it with a read of the element's own fields (`rOutOhms`, `rJunctionOhms`) set by `buildElements` (T-B8-05a). Preflight: `grep -nE "\b(25|0\.5|\.5|2\.5)\b" src/sim/analog/elements.ts`. If it prints nothing relevant, this task adds tests only and changes no source file.
- Data model, I/O schemas, API, state transitions, permissions: none (tests and a guard).
- Algorithm (the guard). `prose-guard.test.ts` reads the listed files with `fs` (allowed in a test), strips code fences, and fails on `/\b113\s*(mA|milliamp)/i`. A second test builds the C10 message through `createStateTracker` and checks `abs(shown - 114.46) / 114.46 <= 0.05` for the number it prints after `roundSig(.,2)` is rounded back to a value (120 against 114.46 is 4.8 percent, inside).
- Validation. none. Errors. The guard names the file and line. Edge cases. A file that does not exist (no `docs/FIDELITY.md` yet) is skipped by name in an explicit list, not by try/catch; `docs/FIDELITY.md` joins the list when T-B8-23 lands.
- Performance. none. Migration. none.
- Preflight. `grep -n "113" README.md` must print nothing; if it prints line 35, T-B1-15 did not finish: stop and report (README is not this task's file).

**Verification**

- Unit tests. `led-resistor.test.ts`: the four RS-08 rows; an LED on a board with `pinOutOhms 25` versus a copy of the profile with `pinOutOhms 50` gives a different current (proves the pin model is read, not a literal); changing `vf` in the part params moves the current; resistor 10k/10k divider exact to 1e-9 against the closed form. `prose-guard.test.ts` as above.
- Integration. `V src/sim/analog`; `node figures/engine/bench-solve.test.mjs` unchanged.
- Playwright. none. Fixtures. `src/sim/analog/fixtures/rs08-states.json` (T-B8-06).
- Acceptance. Given the repo, When the guard runs, Then no prose carries "113 mA". Given C10, When solved, Then the current is 117.65 mA to 1e-6 relative.
- Observability. none. Release blockers. A literal pin resistance left in `elements.ts`; the guard disabled.

**Delivery**

- Definition of done. Tests green; guard in `npm test`.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim/analog`.
- Documentation. T-B8-23 quotes the computed values by reading the fixture, never typing them.
- Rollback. `git revert`. Later tasks need. T-B8-23 adds `docs/FIDELITY.md` to the guard list.

---

### T-B8-08 Tick budget and the 150-node measurement

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-08 |
| Subsystem | Simulation performance |
| Phase / group / priority | B8 / G5 / P1 |
| Dependencies | T-B8-05a, T-B8-05b, T-B8-06 |
| Status | not started |
| Source files (4) | new `src/sim/analog/bench-fixtures.ts`, `src/sim/analog/bench-entry.ts`, `scripts/sim-bench.mjs`; edit `budgets.json` (written by T-B1-24) |
| Test files | new `src/sim/analog/bench.test.ts` (structure only, no timing) |

**Intent**

- Problem. R-100 says solve cost stays under 1 ms per tick on the largest corpus circuit; RS-08 measured the old solver at 0.45 ms at 6x throttle (`REPORT.md`, largest circuit, Chromium). The new live path adds element building, states and rails. SA-07 also asks for a measured 150-node mixed circuit and the node count at which the dense path stops being fast enough.
- Target user. A maker on a Chromebook; the maintainer who sets the budget.
- Story. As a maintainer I want measured per-tick numbers on the new path so that a regression is visible and the sparse-LU decision rests on data.
- Expected behaviour. `scripts/sim-bench.mjs` bundles `bench-entry.ts` with Vite's library build (programmatic, iife, output in an OS temp folder), launches Playwright Chromium with CPU throttle 1x, 4x and 6x and WebKit at 1x, and runs: (a) the largest converted project by element count (found at run time from the converter corpus), (b) the synthetic 150-node mixed circuit from `bench-fixtures.ts`, (c) a size sweep of n = 25, 50, 75, 100, 125, 150, 200, 300, 400 nodes. It prints median and p95 microseconds per tick, writes `docs/MASTER_PLAN/08_RESEARCH_SPIKES/SP-B8-02-tick-budget/results.json`, and writes the BUD-07 entry into `budgets.json` as PROPOSAL.
- Success metric (falsifiable). (a) largest catalogue circuit median under 1 ms per tick at 4x. (b) 150-node circuit median recorded. (c) the smallest n whose median exceeds 1 ms at 4x is written as `sparseThreshold`; if no n up to 400 exceeds it, the value is "above 400".

**Implementation**

- Existing code. Pattern: `RS-08/src/timebrowser.mjs` (Playwright, `Emulation.setCPUThrottlingRate`, `execSync('uptime')` for the load line). `vitest.config.mts` shows the Vite 8 `resolve.tsconfigPaths: true` setting the bundle needs. `budgets.json` and `scripts/perf-budget.mjs` come from T-B1-24.
- New modules.

```ts
// bench-fixtures.ts (portable, deterministic)
export function syntheticMixed(nodes: number, seed: number): SimNetlist   // resistor ladder, LED+resistor branches (one in six), NPN switches (one in twelve), pin sources (one in twenty); no randomness beyond the seeded stream
export function largestConverted(corpus: readonly SimNetlist[]): SimNetlist
// bench-entry.ts (browser iife; exposes window.SimBench)
export interface BenchResult { name: string; nodes: number; elements: number; ticks: number; medianUs: number; p95Us: number; converged: boolean }
export function run(spec: { name: string; net: SimNetlist; ticks: number; warmup: number }): BenchResult
```

- Algorithm. Each tick toggles one pin source (so one component is dirty), calls `advanceTo`, reads the clock with `performance.now()` (allowed: the entry file is outside `src/sim` core rules? It sits in `src/sim/analog`, where the lint ban applies; the timing call is passed in as a function by `scripts/sim-bench.mjs` through `window.SimBench.run({ now })`, so no banned call is written in `src/sim`). 400 timed ticks after 50 warmup, as RS-08.
- Validation. `ticks` at least 100. Errors. A non-converged circuit is reported, not timed. Edge cases. WebKit has no CPU throttle: recorded at 1x only. Machine load: the script prints the `uptime` load and refuses to record if the 1-minute load exceeds 10 (RS-08 rule).
- Permissions. none. Performance. The script is a gate step, not part of `npm test`, because wall-clock assertions flake under load (`runs/COMMANDS.md`). Migration. none.
- Preflight. `test -e budgets.json scripts/perf-budget.mjs src/sim/analog/live.ts`; `ls node_modules/.bin/vite`.

**Verification**

- Unit test (`bench.test.ts`, no timing). `syntheticMixed(150, 1)` has 150 nodes, solves, `converged === true`, residual `maxKclAmps / sumAbs <= 1e-6` (D-residual); two calls with one seed give equal netlists; `largestConverted` picks the stepper project (RS-08 names the stepper as the largest, `timebrowser.mjs`).
- Integration. `node scripts/sim-bench.mjs` on a machine with load under 10 prints the four numbers and writes the JSON.
- Playwright. The script drives it itself; no spec file.
- Fixtures. Generated.
- Acceptance. Given a quiet machine, When I run the script, Then it prints for Chromium 1x, 4x, 6x and WebKit 1x the median and p95 for the largest circuit and for n = 150, and the line `sparseThreshold: <n>`.
- Observability. The JSON is the record. Release blockers. Largest circuit median over 1 ms at 4x: do not widen the budget; report to Amar (a change of a gate threshold is his decision).

**Delivery**

- Definition of done. Script, fixtures, JSON and a short `REPORT.md` in the spike folder with every figure labelled MEASURED and the machine named; `budgets.json` entry marked PROPOSAL.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim/analog/bench.test.ts && node scripts/sim-bench.mjs`.
- Documentation. The REPORT. Rollback. `git revert`. Later tasks need. T-B8-24 reads `results.json`; B9's decision on a sparse LU reads `sparseThreshold`.

---

### T-B8-09 `dc-event` phase order and engine tie-break

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-09 |
| Subsystem | Simulation, orchestrator |
| Phase / group / priority | B8 / G4 / P0 |
| Dependencies | T-B8-05b (it edits `orchestrator.ts` first); T-B3-11, T-B3-19 |
| Status | not started |
| Source files (2) | `src/sim/orchestrator.ts`, `src/sim/engine.ts` |
| Test files | new `src/sim/orchestrator.phase.test.ts`, `src/sim/determinism.test.ts` |

**Intent**

- Problem. With analog on the live path a pin write and the node voltage it causes must be seen at one timestamp, and the result must not depend on the order engines were registered. `SIMULATION_ARCHITECTURE.md` 5.5 says the mcu tie-break is "registration order, then engine id", while SA-08 says permuting same-rank registration changes no hash (fact 25).
- Target user. Anyone whose code reads a sensor right after writing a pin; the replay and room paths, which need identical order on every machine.
- Story. As a maker I want `digitalWrite(13, HIGH); analogRead(A0)` to see the circuit's response in the same instant, on any machine.
- Expected behaviour. Order key `(at, phase, rank, seq)` with ranks digital 10, analog 20, mcu 30, ros 35, bus 40, mech 50, flight 60, env 70, faults 80, probe 90. Engines are kept sorted by `(rank, engineId)` and are always called in that order, so `seq` is the same for any registration order. Decision recorded here: the tie-break is the engine id, not registration order (PROPOSAL; it follows SA-08, the test, over the prose of 5.5, and it is the only reading under which the test can pass; section 10 lists it for Amar). `runUntil` gains `{ exclusive: true }`: advance to just before `target`, processing no event at `target`, so a stamped input can be injected at P0 of `target` (used by T-B8-18).
- Success metric. SA-08: in `dc-event` mode a pin write (P2), the resulting solve (P3) and the node-voltage sample (P4) carry one `at`; all 120 permutations of five registered engines give one trace hash. SA-06 on the live path: ten runs with one seed give identical serial text and pin-trace hash for a circuit that reads the ADC.

**Implementation**

- Existing code. `src/sim/orchestrator.ts`, `src/sim/engine.ts` (T-B3-11); `SIMULATION_ARCHITECTURE.md` 5.5 and 5.6 (loop, `Phase`, `SimEvent`, `Orchestrator`).
- Modules and signatures.

```ts
// engine.ts
export const RANK = { digital: 10, analog: 20, mcu: 30, ros: 35, bus: 40, mech: 50, flight: 60, env: 70, faults: 80, probe: 90 } as const;
export type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export function compareEvents(a: SimEvent, b: SimEvent): number          // (at, phase, rank, seq); throws on equal keys with different payload ids (a bug)
// orchestrator.ts
register(e: Engine): void                                                // insert sorted by (RANK[e.layer], e.id); duplicate id throws
runUntil(target: SimTime, budget: SliceBudget, o?: { exclusive?: boolean }): SliceResult
```

- Algorithm. P0 inputs from the log; P2 mcu runs to its next visible action and emits `pin-write` at `at`; P3: digital nets resolve (rank 10), analog sources update and the dirty components solve (rank 20) in the same timestamp, results become `net-volts` state; P4: ADC and threshold reads see the P3 result (zero lag); P6 probes. `exclusive` stops with `now` set to `target - 1` ns and queued events at `target` untouched.
- State transitions. `running -> paused` unchanged. Validation: `register` after `load` throws. Errors: `event-queue-overflow` at 1,000,000 pending (SIM 5.5) already specified in B3; test that it still fires. Edge cases: two events with equal key from one engine keep `seq` order; an engine with no `layer` throws at register.
- Permissions: none. Performance: sorted-array insert on a list of at most ten engines. Migration: any B3 code that relied on registration order is found by the permutation test.
- Preflight. `grep -n "register\|seq" src/sim/orchestrator.ts`; read how T-B3-11 assigns `seq`.

**Verification**

- Unit tests. `orchestrator.phase.test.ts`: LED circuit with a pin write at 1,000,000 ns: log has `pin-write` (P2, rank 30), `analog-solve` (P3, rank 20), `net-volts` and `adc-sample` (P4) all with `at === 1_000_000`, in phase order; an input injected after `runUntil(t, ..., { exclusive: true })` is applied at P0 of `t`, before the pin events of `t`. `determinism.test.ts`: all 120 registration permutations of {digital, analog, mcu-A, mcu-B, probe} give equal event-trace hashes (class B); ten runs, one seed, analog circuit with `analogRead`, equal serial text and pin-trace hash (SA-06).
- Integration. `V src/sim src/sim-host`. Playwright: none (T-B8-16 and T-B8-19 cover cross-browser).
- Fixtures. Inline netlist (LED, resistor, pot on A0).
- Acceptance. Given two MCU engines registered in either order, When both run the same sketches, Then the trace hashes are equal. Given a pin write, When the solver runs, Then the node voltage carries the write's timestamp.
- Observability. The event log carries `(at, phase, rank, seq)`. Release blockers. Any permutation changes a hash.

**Delivery**

- Definition of done. Both files changed, tests green, SA-06 and SA-08 numbers captured.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim src/sim-host`.
- Documentation. Section 10 item for the tie-break. Rollback. `git revert`.
- Later tasks need. T-B8-10 (probe rank 90 at P6), T-B8-15, T-B8-18 (`exclusive`).

---

### T-B8-10 Probe tap, ring buffers, provenance

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-10 |
| Subsystem | Simulation, instrumentation |
| Phase / group / priority | B8 / G5 / P0 |
| Dependencies | T-B8-03 (registry, `inRange`), T-B8-09 (P6 and rank 90), T-B8-22 (`operatingRange` and `knownFailureCases` data); T-B8-05a, T-B8-06 for readings |
| Status | not started |
| Source files (3) | new `src/sim/probe/tap.ts`, `src/sim/probe/provenance.ts`, `src/sim/probe/ring.ts` |
| Test files | new `tap.test.ts`, `provenance.test.ts`, `ring.test.ts` in `src/sim/probe/` |

**Intent**

- Problem. A number from a teaching model looks as trustworthy as one from a solved circuit (ADR-0313). Instruments must not reach into engines, must not change results, and must keep memory bounded; the interpreter silently drops edges after 20,000 (`world.ts:375`).
- Target user. Every instrument and the diagnosis evidence.
- Story. As a maker I want each reading to say what produced it and how far to trust it.
- Expected behaviour. A `ProbeTap` is an engine of rank 90 at P6 (read-only). `add(ProbeSpec)`, `read`, `stream(from)`, `remove` as in SIMULATION_ARCHITECTURE 14.1. Each `Reading` carries `provenance`, `tier`, `modelIds`, optional `band` (filled by T-B8-28), `conditions`, `noteKey`. Provenance is computed from the registry (rules below). Rings keep `capacity` samples (default 65,536, maximum 1,048,576), optional min/max envelope per decimated bucket, and a visible `droppedSamples` counter.
- Success metric. R-099/R-114 in practice: of 14 RS-08 circuits (fixture `rs08-provenance.json`), C08, C10, C13, C14, C15, C16 and C20 yield `approximation` readings (the six that are more than 10 percent off a realistic model, plus C10, whose 117.65 mA is outside the LED's checked range) and C01 to C05, C18, C19 yield `computed`; a probe added or removed changes no state hash (probing does not change results).

**Implementation**

- Existing code. none for the tap. `world.ts:375` is the truncation it replaces (T-B8-12 edits that line). Types from SIMULATION_ARCHITECTURE 14.1 are binding.
- Modules and signatures.

```ts
// tap.ts
export type Provenance = 'computed' | 'approximation' | 'mocked' | 'not-modelled';
export interface Reading { value: number | string | boolean | null; unit?: string; at: SimTime; provenance: Provenance; tier: Tier; modelIds: string[]; band?: [number, number]; conditions?: string; noteKey?: string }
export interface ProbeSpec { id: string; kind: 'voltage'|'current'|'power'|'pin'|'bus'|'serial'|'variable'|'event'|'body'|'state'; target: string; sampleNs?: number; capacity: number; envelope: boolean }
export interface ProbeTap { add(p: ProbeSpec): ProbeHandle; read(h: ProbeHandle): Reading; stream(h: ProbeHandle, from: SimTime): TraceChunk; remove(h: ProbeHandle): void }
export function createProbeTap(deps: { analog: Pick<LiveAnalog, 'netVolts' | 'pinVolts' | 'componentResult'>; registry: Registry; modelOf(partId: string): string[] }): ProbeTap & Engine
export interface TraceChunk { id: string; from: SimTime; to: SimTime; t: Float64Array; v: Float64Array; min?: Float64Array; max?: Float64Array; dropped: number; staircase: boolean }
// ring.ts
export interface Ring { push(at: SimTime, v: number): void; slice(from: SimTime, to: SimTime, maxPoints: number): TraceChunk; readonly dropped: number; readonly length: number; clear(): void }
export function createRing(capacity: number, envelope: boolean): Ring
// provenance.ts
export function provenanceFor(modelIds: readonly string[], ctx: { states: Readonly<Record<string, DeviceState>>; quantities: Readonly<Record<string, number>> }, reg: Registry): { provenance: Provenance; tier: Tier; noteKey?: string }
export function digitsFor(tier: Tier): number | null          // T0 null (no number), T1 2, T2 4, T3 null (exact quantity); PROPOSAL
export function formatReading(r: Reading, t: (key: string, args?: Record<string, string | number>) => string): { text: string; aria: string }
```

- Provenance rules (the data in the registry decides, no code table): for each contributing model id, (1) `inRange(entry, quantity, value)` of T-B8-03 (the one rule, also used by T-B8-06) compares `operatingRange` entries whose `quantity` is `current_A` or `voltage_V` with the same quantity of the element in `ctx.quantities`; outside the range the reading is `approximation` with `noteKey 'fidelity.reading.outsideRange'`; (2) `knownFailureCases` strings beginning `state:<DeviceState>:` match `ctx.states`; a match makes it `approximation` with `noteKey 'fidelity.reading.knownGap'` (the prefix convention is a PROPOSAL because the registry type fixes `knownFailureCases` as `string[]`; section 10); (3) a model whose entry is `status: 'planned'` or absent gives `not-modelled`, `value: null`. Otherwise `computed`. The tier of a reading is the lowest tier of its models. RS-08 `results.json` reports Q1 as `'on'` in C15 and C16 and `'hot'` in C20, and no circuit as `'sat'` (fact 30), so the NPN entry lists `state:on:`, `state:hot:` and `state:sat:` (T-B8-22); with `state:sat:` alone the three circuits would read `computed`.
- Data model. Ring is a circular `Float64Array` pair (times, values) plus optional envelope arrays. Decimation keeps min and max of each bucket so a glitch survives zooming out. `dropped` increases when the oldest sample is overwritten.
- Input and output schemas. `ProbeSpec` and `Reading` as above cross the worker boundary in T-B8-25.
- API contracts. none here. Algorithm. `onEvent` at P6: for each probe with `sampleNs` due or on change, read the source and push to its ring. `stream` returns transferable buffers.
- State transitions. Probes are removed on `restart`; the tap's rings are not part of the state hash (observers never change state) and are rebuilt by replay after a restore.
- Validation rules. `capacity` 1 to 1,048,576; probes at most 64; `target` must exist, else `add` returns an error handle with `not-modelled`. Error conditions: `unknown-target`, `too-many-probes`.
- Edge cases. A probe on a net inside a component that did not converge reads `not-modelled` with "no result". Reading at `dc-event` has no waveform between events: `staircase: true`. `formatReading` on `value: null` prints only "not modelled yet" and never a number. CSV or text with `=` first is escaped later (T-B8-12).
- Permissions. none. Performance. A push is O(1); `slice` is O(maxPoints). Eight probes at 1 kHz cost under 2 percent of a tick (HYPOTHESIS; T-B8-08 re-measures with probes on).
- Migration. none.
- Preflight. `test -e src/sim/orchestrator.ts src/sim/engine.ts src/sim/analog/live.ts src/sim/registry/entries.ts`.

**Verification**

- Unit tests. `ring.test.ts`: overwrite and `dropped`, envelope min/max survive a 1,000 to 10 decimation, capacity bounds. `provenance.test.ts` (fixture `rs08-provenance.json`): the seven circuits C08, C10, C13, C14, C15, C16, C20 give `approximation`, C01 to C05, C18, C19 give `computed`, an unknown model id gives `not-modelled`; `digitsFor`; `formatReading` of 0.11765 A at T1 is "0.12 A" with tier and provenance text, a `null` reading never prints a digit. `tap.test.ts`: probing changes no state hash (run with 0 and with 8 probes, hashes equal); `staircase` flag in `dc-event`; probe on an unmodelled part reads `not-modelled`.
- Integration. `V src/sim`; `npx tsc -p tsconfig.portable.json`.
- Playwright. none. Fixtures. `src/sim/probe/fixtures/rs08-provenance.json`, new data built from RS-08 `data/results.json` (fact 30). For each of the 14 circuits (C01 to C05, C18, C19, C08, C10, C13, C14, C15, C16, C20) it holds the registry model ids of the circuit's elements, `current_A` (rows of kind `I`) and `voltage_V` (kind `V`) per element name from the `matched_warm` `solver` values, the `DeviceState` per element from `states`, the `realistic_warm` relative error, and the expected provenance. `provenance.test.ts` re-reads `results.json` with `fs` and fails if any stored number differs (drift guard). The file is data and counts 0 source files.
- Acceptance (SA-20 part). Given a project with an unmodelled part, When I probe its pin, Then the reading says "not modelled yet", carries no number, and the rest still reads.
- Observability. `dropped` counter per probe is part of every chunk. Release blockers. A reading without provenance; a state hash that depends on probes.

**Delivery**

- Definition of done. Three modules, tests, portable build.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim/probe && npx tsc -p tsconfig.portable.json`.
- Documentation. none. Rollback. `git revert`. Later tasks need. T-B8-25 (messages), T-B8-11 and T-B8-12 (readings, chunks), T-B8-28 (`band`).

---

### T-B8-11 Multimeter

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-11 |
| Subsystem | Instruments |
| Phase / group / priority | B8 / G7 / P1 (R-101 is "should") |
| Dependencies | T-B8-10, T-B8-25, T-B8-27, T-B8-28 |
| Status | not started |
| Source files (2) | new `src/sim/probe/meter.ts`, `src/components/studio/instruments/Multimeter.tsx` |
| Test files | new `src/sim/probe/meter.test.ts`, `src/components/studio/instruments/Multimeter.test.tsx` |

**Intent**

- Problem. A maker cannot measure anything. The catalogue shows a lesson-specific readout only.
- Target user. A maker following "measure it" hints (hint ladder step 2).
- Story. As a maker I want to put two probes on a circuit and read volts, amps or ohms with the model's tier shown.
- Expected behaviour (R-101). Modes: DC volts between two pins or nets; DC amps through a chosen component; resistance with power off; continuity (path below 50 ohm). Each reading shows value, unit, tier label and, when `toleranceMode` is not `nominal`, the band. Reading an unmodelled node shows "not modelled yet". Probe placement is keyboard operable through two pin lists (red, black), no pointer needed. Diode test, frequency and duty are not built: the mode list shows them disabled with "not modelled yet" and a link to the roadmap entry (B9).
- Success metric. Divider C01 reads the midpoint 2.4749 V to 4 significant figures with tier T2 text; C10 current reads "0.12 A" at T1 approximation; resistance of 10k plus 10k in series reads 20 k ohm; unmodelled node reads no number.

**Implementation**

- Existing code. none. Uses `LiveAnalog.whatIf` (T-B8-05a), `ProbeTap` (T-B8-10), `formatReading` (T-B8-10), probe client hook `useReading` (T-B8-25), strings (T-B8-27).
- Modules and signatures.

```ts
// meter.ts (portable)
export type MeterMode = 'dc-volts' | 'dc-amps' | 'resistance' | 'continuity';
export interface MeterSettings { mode: MeterMode; loading: boolean; burdenOhms: number }   // schema: Instrument.settings, at most 16 keys
export function resistanceBetween(live: Pick<LiveAnalog, 'whatIf'>, a: NetId, b: NetId): { ohms: number | null; reading: Reading }
export function continuity(live: Pick<LiveAnalog, 'whatIf'>, a: NetId, b: NetId, thresholdOhms?: number): Reading   // default 50
export function meterReading(spec: Instrument, tap: ProbeTap, live: ..., settings: MeterSettings): Reading
// Multimeter.tsx
export function Multimeter(props: { instrument: Instrument; points: ProbePoint[]; onChange(next: Partial<Instrument>): void }): JSX.Element
```

- Algorithm (resistance, SIM 14.2: approximation). `whatIf({ sources: 'off', extra: [V 10 mV between a and b] })`, resistance = `0.010 / i`; sources off means rails shorted to 0 V and pin sources open; the 10 mV test level keeps piecewise junctions off, so a diode or LED reads open. The reading carries `conditions` = key `instruments.meter.cond.powerOff` ("Power off, junctions read as open at the test level") and `provenance 'approximation'`; an ideal series ammeter carries `instruments.meter.cond.ideal`, a loaded voltmeter `instruments.meter.cond.loaded`. Continuity: resistance below the threshold. Loading: `loading: true` adds `R 10 Mohm` between the probe nodes in a `whatIf` and the volts reading is computed with it; the 10 Mohm value is typical (EXTERNAL) and shown in `conditions`. Amps: `branch[elementId].amps` of the chosen component from the last result with `burdenOhms` 0 (reading `approximation`: ideal series meter); with `burdenOhms > 0` the element is placed in series in a `whatIf` and the reading is `computed`.
- Data model. `Instrument { id: 'ins_...', kind: 'multimeter', target: { net? | pin? | component? }, settings }`; the second probe point is `settings.blackPin` (string pin ref). Only schema keys are used; `settings` stays under 16 keys.
- Input and output schemas. `Reading` out. API: none.
- State transitions. Meter mode change is an `instrument.set` op through T-B8-20; the component keeps no hidden state.
- Validation. `burdenOhms` 0 to 1e6; same net on both probes reads 0 V. Error conditions: a net inside a non-converged component gives `not-modelled` "no result". Edge cases. Power-off resistance across a node with an open pin source; the same pin chosen twice; a probe on a ground net.
- Permissions. Viewers see the reading; only editors change probes (the `instrument.set` op is permission-checked in `apply`).
- Performance. Resistance and loading cost one `whatIf` solve, on demand, never per tick. Accessibility. The value is text with unit, never canvas only; the reading is in a `role="status"` live region updated at most twice a second; the pin lists are native `select`s.
- Security. All text goes through React; no `dangerouslySetInnerHTML`.
- Migration. none. Preflight. `test -e src/sim/probe/tap.ts src/studio/run/probes.ts src/i18n/messages/en/instruments.json`.

**Verification**

- Unit tests. `meter.test.ts`: C01 volts, C18 (battery with internal resistance) volts, resistance of series and parallel pairs against closed form to 1e-6, a diode reads open, continuity on a wire (0.5 ohm rail) true and across 1 k ohm false, loading on a 10 Mohm divider tap changes the reading by the expected 0.5 percent, amps in series on C06 (12.220 mA). `Multimeter.test.tsx`: keyboard selects probe points, reading text contains unit and tier, "not modelled yet" case shows no digit, axe has no serious violation.
- Integration. `V src/sim/probe src/components/studio`. Playwright in T-B8-20.
- Fixtures. `rs08-linear.json`, `rs08-states.json`.
- Acceptance. Given the divider, When I choose red = midpoint and black = ground, Then I read 2.475 V (4 s.f. of 2.4749) with "Calculated model" and the ideal-meter condition. Given an unmodelled part pin, Then "not modelled yet".
- Observability. none. Release blockers. A reading without tier; colour-only mode indication.

**Delivery**

- Definition of done. Two files, tests, axe clean.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim/probe src/components/studio`.
- Documentation. none. Rollback. `git revert`. Later tasks need. T-B8-20 hosts it; B10 hints cite its readings.

---

### T-B8-12 Oscilloscope and logic analyser with a table view

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-12 |
| Subsystem | Instruments |
| Phase / group / priority | B8 / G7 / P1 (R-108 is "should") |
| Dependencies | T-B8-10, T-B8-25, T-B8-27 |
| Status | not started |
| Source files (4) | new `src/sim/probe/capture.ts`, `src/components/studio/instruments/Scope.tsx`, `src/components/studio/instruments/LogicAnalyser.tsx`; edit `src/lib/interp/world.ts` |
| Test files | new `src/sim/probe/capture.test.ts`, `Scope.test.tsx`, `LogicAnalyser.test.tsx`; edit `src/lib/interp/headless.test.ts` if it asserts the 20,000 cap |

**Intent**

- Problem. PWM and timing are invisible. The only trace is an edge list capped silently at 20,000 (`world.ts:375`).
- Target user. A maker checking a PWM duty or the timing of two pins.
- Story. As a maker I want to see pins and nets over virtual time, pause, zoom, and export what I see.
- Expected behaviour (R-108). Scope: analog channels (zero-order hold at the analog step; in `dc-event` mode a labelled staircase) and digital channels; time base, trigger (rising or falling edge, level), cursors with a delta; PWM in `averaged` mode drawn as a level with duty and frequency in the label. Logic analyser: pin edge rows, trigger, cursors; decoders for I2C, SPI, UART show "not modelled yet until the bus models land (B9)"; T1 edge times carry the note "edge times follow the statement cost model". Both have a table view (time, channel values) as the accessible twin, pause with the simulation, and CSV export. The cap is shown ("65,536 samples kept, 0 dropped") and can be set from 1,024 to 1,048,576. `World` counts dropped edges and takes a configurable cap so the legacy trace is no longer silent.
- Success metric. A 490 Hz PWM at 50 percent duty on D9 shows 2.04 ms period and 50 percent duty within 1 percent; export CSV round-trips; `droppedSamples` equals the number of overwritten samples in a 100,000-edge test.

**Implementation**

- Existing code. `world.ts:375` (`if (this.trace.length < 20000)`), `WorldOptions`, `Snapshot` type at `world.ts:36-62`. Tap and ring from T-B8-10.
- Modules and signatures.

```ts
// capture.ts (portable)
export interface CaptureSpec { channels: { id: string; kind: 'analog' | 'digital' }[]; timeBaseNs: number; trigger?: { channel: string; edge: 'rising' | 'falling'; level?: number }; holdoffNs?: number }
export interface CaptureFrame { startNs: number; endNs: number; channels: { id: string; kind: 'analog'|'digital'; t: Float64Array; v: Float64Array; min?: Float64Array; max?: Float64Array; zoh: boolean }[]; dropped: Record<string, number>; notes: Array<'staircase' | 'cost-model'>; pwm?: Record<string, { duty: number; hz: number }> }
export function buildFrame(chunks: Record<string, TraceChunk>, spec: CaptureSpec, nowNs: SimTime): CaptureFrame
export function toCsv(f: CaptureFrame, meta: { docHash: string; seed: number; versions: Record<string, string>; provenance: Record<string, Provenance> }): string
export function tableRows(f: CaptureFrame): { tNs: number; values: (number | string)[] }[]
// world.ts
export interface WorldOptions { /* existing */ traceCap?: number }      // default 20_000
readonly droppedEdges: number
```

- Algorithm. Trigger search scans the newest `timeBaseNs * 4` of the ring for the first matching edge after holdoff; with no trigger the frame ends at `nowNs`. CSV header lines start with `#` (project hash, seed, versions, per-column provenance), then `t_ns,<id>...`; a cell or channel name starting with `=`, `+`, `-` or `@` is prefixed with a single quote (spreadsheet injection guard). PWM label: duty and frequency from consecutive rising and falling edges of the last full cycle.
- State transitions. Pause freezes the frame (host paused state, T-B8-14). Validation: cap range; channel ids must be probes of the instrument. Errors: none visible beyond `dropped`.
- Edge cases. No edge yet (flat line); two channels with different sample counts; zoom to one sample; dropped samples before the window; an instrument on 20 channels (limit 8 channels per instrument, PROPOSAL).
- Permissions. none beyond editing the instrument. Performance. Drawing decimates to at most 2 px per column: `maxPoints` = 2 * width; the SVG or canvas stays under 4 ms per frame (HYPOTHESIS, T-B8-20 measures).
- Accessibility. The table view is a real `table`; the canvas or SVG has `aria-hidden` and a text summary (key `instruments.scope.summary`, "{n} edges, last at {t} ms"); trigger and cursor are keyboard operable (arrow keys move the cursor by one sample, shift by ten).
- Migration. `World` traces that stopped at 20,000 now still stop there by default but increment `droppedEdges` and expose it in `Snapshot` as `droppedEdges` when above 0. Preflight: `grep -rn "\.trace\b" src --include=*.ts` to list readers.

**Verification**

- Unit tests. `capture.test.ts`: trigger on a rising edge aligns frames; CSV header and injection guard; table rows equal frame samples; PWM duty and hz from edges within 1 percent for 490 Hz at 50 percent (Uno `analogWrite(9,128)`); `staircase` note in `dc-event`. `Scope.test.tsx` and `LogicAnalyser.test.tsx`: table view shows the same samples as the frame; cursor delta text; cap control changes capacity; decoders disabled text; axe. World test: 25,000 edges give `trace.length === 20000` and `droppedEdges === 5000`; with `traceCap` 30,000 none dropped.
- Integration. `V src/sim/probe src/components/studio src/lib/interp`. Playwright in T-B8-20.
- Fixtures. Inline. Acceptance. Given a PWM sketch, When I open the scope on D9, Then I see the duty and frequency in text and in the table. Given more edges than the cap, Then the panel says how many were dropped.
- Observability. `dropped` shown in the panel. Release blockers. A silent cap anywhere; colour-only channel identity (each channel has a label and a dash pattern).

**Delivery**

- Definition of done. Four files, tests, axe clean.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim/probe src/components/studio src/lib/interp`.
- Documentation. none. Rollback. `git revert`. Later tasks need. T-B8-20.

---

### T-B8-13 Serial plotter

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-13 |
| Subsystem | Instruments |
| Phase / group / priority | B8 / G2 / P1 (R-112 is "should") |
| Dependencies | T-B8-27; T-B4-13 (`SerialPane.tsx`, `session.ts` serial stream) |
| Status | not started |
| Source files (2) | new `src/components/studio/instruments/Plotter.tsx`, `src/studio/run/plot.ts` |
| Test files | new `src/studio/run/plot.test.ts`, `Plotter.test.tsx` |

**Intent**

- Problem. Makers print numbers and cannot see them as a curve. The serial pane is text only.
- Target user. A maker logging a sensor value.
- Story. As a maker, when my sketch prints numbers on a line, I want each column drawn as its own trace with a legend.
- Expected behaviour (R-112, F-207). Lines such as `512`, `512 3.3`, `a:512,b:3.3` become one to eight columns. Each column is a trace with a legend entry (name, or `col1`), a distinct dash pattern and a direct label at the line end; colour is never the only encoding. A table view lists the last 200 rows. Pause, clear, window length 100 to 5,000 samples. Time axis is virtual time from the stamps of the serial pane.
- Success metric. 100 lines `x y` give two traces of 100 points; a line with text only draws nothing and raises no error; a 10,000-line burst keeps memory bounded.

**Implementation**

- Existing code. `src/components/studio/SerialPane.tsx` and `src/studio/run/session.ts` (T-B4-13) expose serial lines with virtual-time stamps (F-207); read their prop and event names first.
- Modules and signatures.

```ts
// plot.ts (portable)
export interface PlotRow { tNs: number; values: (number | null)[] }
export function parsePlotLine(line: string): { names: (string | null)[]; values: number[] } | null   // splits on whitespace, comma, tab; "name:value"; returns null when no field is a finite number
export function createPlotStore(opts?: { maxRows?: number }): {
  push(tNs: number, line: string): void; rows(): readonly PlotRow[]; columns(): string[]; clear(): void; subscribe(fn: () => void): () => void; dropped(): number
}
// Plotter.tsx
export function Plotter(props: { store: ReturnType<typeof createPlotStore>; paused: boolean; windowRows: number }): JSX.Element
```

- Algorithm. A line is plotted when at least one field parses as a finite number; non-numeric fields in a numeric line become `null` (gap). Column count grows to 8 and further columns are ignored with a note (key `instruments.plotter.columnsIgnored`). Store is a ring of `maxRows` (default 5,000).
- Validation. Field length at most 32 characters for a name; `NaN`, `Infinity` are not numbers. Error conditions: none thrown. Edge cases: CRLF; leading BOM; numbers like `1e3`, `-0.5`, `0x10` (hex is not a number here); `a:1,b` (second field has no number: gap).
- Permissions: none. Performance: one render per animation frame at most; SVG polylines decimated to 2 per pixel column. Migration: none.
- Accessibility. Legend is a list with the trace name and the latest value (keys `instruments.plotter.legend`, `.latest`, `.col` for the default name `col1`); the table view is the accessible twin; the plot has a text summary.
- Preflight. `test -e src/components/studio/SerialPane.tsx src/studio/run/session.ts`.

**Verification**

- Unit tests. `plot.test.ts`: the formats above, hostile input (10 KB line, binary bytes, 100 columns), ring bound. `Plotter.test.tsx`: two traces get two legend entries with different dash patterns; table equals store rows; paused freezes; axe.
- Integration. `V src/studio/run src/components/studio`. Playwright in T-B8-20.
- Fixtures. Inline. Acceptance. Given `Serial.println(analogRead(A0))` in a loop, When I open the plotter, Then I see one labelled trace and the same numbers in the table.
- Observability. `dropped()` counter shown. Release blockers. Colour-only legend.

**Delivery**

- Definition of done. Two files, tests.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/studio/run src/components/studio`.
- Documentation. none. Rollback. `git revert`. Later tasks need. T-B8-20 hosts it as kind `serial-plotter`.

---

### T-B8-14 Pause, step, speed, `behindReal`

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-14 |
| Subsystem | Host and run controls |
| Phase / group / priority | B8 / G4 / P1 (R-107 is "should") |
| Dependencies | T-B8-05b (the speed and step tests run the live orchestrator, so "nothing else changes" holds with analog loaded), T-B8-27; T-B3-13, T-B4-13 |
| Status | not started |
| Source files (5) | new `src/components/studio/SpeedControl.tsx`; edit `src/sim-host/host.ts`, `src/sim-host/protocol.ts`, `src/studio/run/session.ts`, `src/components/studio/RunBar.tsx` |
| Test files | new `src/sim-host/speed.test.ts`, `src/components/studio/SpeedControl.test.tsx` |

**Intent**

- Problem. The run bar starts and stops. A maker cannot pause, step one statement, or slow down a blink to watch it; and when a device is too slow nothing says so.
- Target user. A learner watching a loop; a maker on a weak laptop.
- Story. As a maker I want to pause, step, change speed from 0.01x to 100x (or as fast as possible), and be told when my device cannot keep up.
- Expected behaviour. Controls: Pause and Resume, Step (unit select: `ns`, `event`, `statement`, `line`; `cycle` disabled with "needs firmware mode"), speed slider and presets (0.1x, 1x, 10x, 100x, max; labels from keys `instruments.speed.preset` and `instruments.speed.max`, step units from `instruments.run.unit.*`). The host turns `speed` into a requested `target` per frame from its own clock; engines are never told the speed (determinism invariant 6). The host reports `{ behindReal, achievedSpeed }`; when true the bar shows "Running at {x} times real time on this device." Nothing else about the results changes (SA-19).
- Success metric. SA-19: the same project at speed 100 on a slow fake clock and at speed 1 on a fast one give equal state hashes at equal simulated times, and `behindReal` is true only in the first.

**Implementation**

- Existing code. `src/sim-host/host.ts`, `protocol.ts` (T-B3-13, messages `start stop step kill restart`); `src/studio/run/session.ts`, `RunBar.tsx` (T-B4-13); SIMULATION_ARCHITECTURE 6.7, 6.8 (slice 12 ms in a worker, 30 `postMessage` per second, `speed` 0.01 to 100 or 0), 14.5.
- Modules and signatures.

```ts
// host.ts
export interface HostClock { nowMs(): number }                          // injected; tests pass a fake
export interface HostOptions { clock: HostClock; sliceMs?: number }      // default sliceMs 12
setSpeed(x: number): void                                               // 0.01..100, or 0 = as fast as the budget allows
pause(): void; resume(): void; step(unit: StepUnit, n: number): void
readonly status: { state: RunState; speed: number; achievedSpeed: number; behindReal: boolean }
// protocol.ts: HostToSim | { t: 'speed'; x: number } | { t: 'pause' } | { t: 'resume' } ; SimToHost | { t: 'speed.report'; achieved: number; behind: boolean }
```

- Algorithm. Each host frame: `target = simNow + speed * (clock.nowMs() - lastFrameMs) * 1e6` ns (speed 0: no cap, bounded by the slice budget). `achievedSpeed` = simulated ns advanced over wall ns in a 1-second sliding window. `behindReal` = `speed > 0 && achieved < 0.95 * speed` for the window (0.95 is a PROPOSAL) while state is `running`; it clears when the window recovers. Step is only accepted in `paused`.
- State transitions. `idle -> running -> paused -> running`; `paused -> paused` on step; `running -> halted | done`. An invalid request is ignored and answered with the current state.
- Validation. `speed` outside 0.01 to 100 and not 0 is clamped. Error conditions: step on a running sim returns `not_paused`. Edge cases: speed change while paused applies at resume; a unit `line` on a sketch with no source map falls back to `statement` with a note; Verilog `statement` is clock cycles of the design.
- Permissions. This task builds the local path only and exposes the control surface; in a room T-B8-29 re-routes Pause, Resume, Step, Speed, Start and Stop to `RunClient.request` (T-B8-18) and leaves the host calls for the no-room case. Performance: the frame loop adds one clock read. Accessibility: slider with arrow-key steps on a log scale (one key press moves one preset step), buttons with visible text, `aria-live="polite"` for the behind-real text.
- Migration. none. Preflight. `test -e src/sim-host/host.ts src/sim-host/protocol.ts src/studio/run/session.ts src/components/studio/RunBar.tsx`.

**Verification**

- Unit tests (fake `HostClock`, no wall time). `speed.test.ts`: speed 1 advances 1 s of sim per 1,000 fake ms; speed 100 with an engine that can only do 20x sets `behindReal` after one window and reports `achievedSpeed` about 20; same project at 100 (slow) and at 1 (fast) hash equal at 1,000 ms checkpoints (SA-19, class B); pause then three `step('statement', 1)` advance exactly three statements; `step` while running is refused; speed 0 never sets `behindReal`. `SpeedControl.test.tsx`: keyboard changes preset, text appears when behind, axe.
- Integration. `V src/sim-host src/studio src/components/studio`. Playwright in T-B8-20.
- Fixtures. A counting fake engine. Acceptance. Given a project at 100x on a slow device, When the device achieves 20x, Then the bar says "Running at 20 times real time on this device." and the results at each simulated millisecond are unchanged.
- Observability. `status` is exposed to the UI and, in rooms, to the runner report (T-B8-18). Release blockers. Any speed-dependent result.

**Delivery**

- Definition of done. Five files, SA-19 recorded.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim-host src/studio src/components/studio`.
- Documentation. none. Rollback. `git revert`. Later tasks need. T-B8-18 uses `setSpeed`, `pause`, `resume`, `step`, `status`; T-B8-29 edits `session.ts` and `RunBar.tsx` again.

---

### T-B8-15 Snapshot and restore for the interpreters and the analog state

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-15 |
| Subsystem | Replay |
| Phase / group / priority | B8 / G5 / P1 (R-107) |
| Dependencies | T-B8-05b, T-B8-06, T-B8-09; T-B3-19 (`ReplayRecord`) |
| Status | not started |
| Source files (4) | new `src/sim/replay/snapshot.ts`, `restore.ts`, `keyframes.ts`; edit `src/sim/orchestrator.ts` only if `snapshot()` or `restore()` are stubs |
| Test files | new `snapshot.test.ts`, `restore.test.ts`, `keyframes.test.ts` in `src/sim/replay/` |

**Intent**

- Problem. A maker cannot go back to a moment in a run or share one. Interpreter frames are closures and cannot be serialised (SIM 6.7), so the plan is replay-based snapshots for them and full snapshots for the analog state.
- Target user. A maker stepping back; the room path that catches a late joiner up; the replay test.
- Story. As a maker I want to take a snapshot, keep going, and come back to exactly that moment.
- Expected behaviour (R-107). `takeSnapshot` fills the `OrchestratorSnapshot` of SIMULATION_ARCHITECTURE A.2 (`format, docHash, at, seqNext, queue, rng, logCursor, engines, stateHash`); this task defines no second shape and reuses the architecture's `EngineSnapshot { engine, engineVersion, schema, data }`. Interpreter frames cannot be serialised, so an interpreter's `data` is only `{ sourceHash, virtualNs, inputCursor }`: a cut point (virtual time and an index into the recorded inputs), not machine state. The analog engine stores node voltages, PIN and PWM state and latch state (T-B8-06) in full. Restore rebuilds every engine from the project; each interpreter replays from t = 0 with the recorded inputs up to `inputCursor`, and the analog engine is restored directly. A cut point cannot shorten an interpreter replay, so the automatic keyframes (every 10 simulated seconds, at most 64, the oldest dropped) hold the analog state for scrubbing and, per interpreter, the statement count at that cut, which `estimateWork` uses to refuse a restore before it starts. A restore whose replay would exceed the work budget is refused with a message (the 100 MHz Verilog case).
- Success metric (SA-18 half). Snapshot then restore equals continuing: state hashes equal at every 1,000 ms checkpoint after the restore, for the Arduino, Python and Verilog interpreters and the analog circuit.

**Implementation**

- Existing code. `Orchestrator.snapshot()` and `restore()` are in the interface (SIM 5.6); T-B3-11 may have stubs: `grep -n "snapshot\|restore" src/sim/orchestrator.ts` first. `ReplayRecord`, `InputEntry` from `src/sim/replay/record.ts` (T-B3-19). `LiveAnalog.snapshot/restore` (T-B8-05a, T-B8-06).
- Modules and signatures.

```ts
// snapshot.ts
import type { EngineSnapshot, OrchestratorSnapshot } from '../engine'   // defined once, SIMULATION_ARCHITECTURE A.2; grep where T-B3-11 put them and import from there
export interface InterpSnapshotData { sourceHash: string; virtualNs: number; inputCursor: number }   // the `data` of an interpreter's EngineSnapshot
export function takeSnapshot(o: Orchestrator, rec: Pick<ReplayRecord, 'docHash' | 'inputs'>): OrchestratorSnapshot
// restore.ts
export interface RestoreBudget { statements: number }                  // default 50_000_000 (ESTIMATED)
export type RestoreResult = { ok: true; at: SimTime; replayedFrom: SimTime } | { ok: false; reason: 'engine-version' | 'doc-hash' | 'too-long' | 'unsupported-engine' | 'hash-mismatch' }
export function restoreSnapshot(o: Orchestrator, s: OrchestratorSnapshot, rec: ReplayRecord, make: EngineFactory, budget?: RestoreBudget): RestoreResult
// keyframes.ts
export const KEYFRAME_NS = 10_000_000_000; export const KEYFRAME_MAX = 64;
export interface KeyframeEntry { snapshot: OrchestratorSnapshot; statements: Record<string, number> }   // statements: per interpreter engine id, the statement count at the cut
export function createKeyframes(): { add(s: OrchestratorSnapshot, statements: Record<string, number>): void; nearest(at: SimTime): KeyframeEntry | null; size(): number }
export function estimateWork(k: KeyframeEntry | null, at: SimTime): number   // statements to replay from 0 to `at`, extrapolated at the rate measured up to the nearest keyframe
```

- Algorithm. Restore requires the same engine major version and `docHash`. It builds a scratch orchestrator. `estimateWork` over the nearest keyframe is compared with the budget first (`too-long` before any replay). Each interpreter then replays from t = 0 with the inputs of `rec.inputs` up to `s.logCursor`; the work counter is the interpreters' statement count, not wall time, so `too-long` is deterministic, and the replay aborts if the actual count passes the budget. The analog engine restores directly from its snapshot. Finally the `stateHash` of the scratch orchestrator is compared with `s.stateHash`; a mismatch is a failed restore (`hash-mismatch`) and the live orchestrator is left unchanged; on a match the scratch state replaces it. Keyframes: `add` when `at - lastKeyframeAt >= KEYFRAME_NS`; the 65th drops the oldest. Dropping a keyframe never makes a restore impossible, only possibly dearer to estimate.
- State transitions. `paused` or `idle` only. Validation: format 1. Errors: the four reasons above plus `hash-mismatch`. Edge cases: snapshot at t = 0; at a time with several events (queue contents stored); restore across a fault operation in the log (faults are inputs, replayed); avr8js and Rapier engines are not in B8 and return `unsupported-engine`.
- Permissions: none. Performance: a restore of a 10 s Uno blink re-runs in about 3 to 13 ms per 10 virtual seconds (`interp.md` as cited in SIM 6.7); a snapshot is under 100 KB for the lesson circuits (ESTIMATED).
- Migration: none. Preflight: `test -e src/sim/replay/record.ts src/sim/analog/live.ts`.

**Verification**

- Unit tests. For each of Arduino blink-with-serial, MicroPython blink, Verilog counter, analog divider with a burnt LED: run A straight to 5 s; run B to 2 s, snapshot, continue to 5 s; run C to 2 s, snapshot, restore into a fresh orchestrator, continue to 5 s. Checkpoint hashes of A, B, C equal at 1,000 ms intervals (class B for digital and serial, class N tolerance for analog values). Keyframe tests: 70 snapshots keep 64, nearest lookup. Refusal tests: wrong `docHash`, wrong engine major, `too-long` with a Verilog design at 100 MHz and 10 s. Latch state survives restore. An interpreter snapshot's `data` has exactly the keys `sourceHash`, `virtualNs`, `inputCursor`. With 70 snapshots (64 kept), a restore to a time before the oldest kept keyframe still succeeds, by replay from 0. `estimateWork` refuses the Verilog 100 MHz, 10 s case before any replay runs.
- Integration. `V src/sim`. Playwright: T-B8-16 covers cross-browser.
- Fixtures. Inline projects. Acceptance. Given a paused run at 2 s, When I restore a snapshot taken at 2 s from a run that has since reached 5 s, Then the state hash equals the hash recorded at 2 s and continuing reaches the same 5 s hash.
- Observability. `RestoreResult` and `replayedFrom` shown in the event log. Release blockers. Any hash mismatch after restore; a restore that blocks the UI (work budget breached).

**Delivery**

- Definition of done. Snapshot, restore, keyframes, orchestrator hooks if needed; tests green.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim && npx tsc -p tsconfig.portable.json`.
- Documentation. none. Rollback. `git revert`.
- Later tasks need. T-B8-16 (checkpoints), T-B8-18 (late join and rejoin use restore or replay).

---

### T-B8-16 Replay checkpoints equal in Chromium and WebKit

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-16 |
| Subsystem | Replay, cross-engine check |
| Phase / group / priority | B8 / G6 / P0 |
| Dependencies | T-B8-15; T-B3-19, T-B3-21 (WebKit project in `playwright.config.ts`, the hash-check harness of `e2e/core.spec.ts`) |
| Status | not started |
| Source files (3) | edit `src/sim/replay/record.ts`; new data set `src/sim/replay/fixtures/*.json` (five recorded runs, counts 1) and `src/sim/replay/replay-check.ts` |
| Test files | new `src/sim/replay/fixtures.test.ts`, `e2e/replay.spec.ts` |

**Intent**

- Problem. Determinism has been shown in Node (SA-06) and for physics on one machine (RS-13). A recorded run must replay to the same checkpoint hashes in the browsers a maker uses, or replay, snapshot and rooms cannot be trusted.
- Target user. The maintainer; every replay and room feature.
- Story. As a maintainer I want five stored runs that replay to equal checkpoint hashes in Chromium and WebKit, so that a hash mismatch always means a real change.
- Expected behaviour. Five `ReplayRecord` fixtures: Arduino interpreter (blink with serial), MicroPython interpreter, Verilog interpreter (counter), one analog circuit (divider read by `analogRead`, LED that burns), one flight run (the existing `src/lib/flight` replay; its check is the class D `frameOf` frames, VERIFIED to exist at `sim.ts:1008` and `flight.test.ts:296-311` per SIM 6.7). Physics is excluded until RA-08. Each record stores `checkpoints` every 1,000 ms. `replayAndCheck(rec)` re-runs and returns the first mismatch.
- Success metric (SA-18). Five of five runs replay with equal checkpoint hashes in Node, Chromium and WebKit; class B for digital, serial and MCU, class N for analog values, class D for flight frames.

**Implementation**

- Existing code. `src/sim/replay/record.ts` (T-B3-19); `e2e/core.spec.ts` and `playwright.config.ts` (T-B3-21) for the way a page runs the sim; flight replay in `src/lib/flight/sim.ts` and `session.ts`.
- Modules and signatures.

```ts
// replay-check.ts (portable)
export interface ReplayMismatch { at: SimTime; expected: string; actual: string; engine?: string }
export type ReplayCheck = { ok: true; checkpoints: number } | { ok: false; first: ReplayMismatch }
export function replayAndCheck(rec: ReplayRecord, make: EngineFactory): ReplayCheck
// record.ts adds
export function refuseIfVersionsDiffer(rec: ReplayRecord, running: ReplayRecord['versions']): { ok: true } | { ok: false; shown: string[] }   // the whole-string compare of SIM 6.7
```

- Fixture rule. Fixtures are written by `fixtures.test.ts` when `UPDATE_REPLAY_FIXTURES=1` is set and are read-only otherwise, so a changed hash is a visible diff in review, never a silent rewrite. No wall-clock input; the seed is fixed.
- Playwright. `e2e/replay.spec.ts` loads each fixture into the page through the same entry `e2e/core.spec.ts` uses (preflight: read it; if it uses a test hook, reuse that hook; if there is none, stop and report), runs `replayAndCheck` in the page, and compares the checkpoint list with the stored one, in the `chromium` and `webkit` projects.
- Algorithm. Replays `inputs` in `(at, seq)` order into a fresh orchestrator and compares each 1,000 ms hash. Version strings are compared whole; a differing string refuses and shows both (SIM 6.7).
- State transitions, permissions, API: none. Validation: record `format 1`. Error conditions: `ReplayMismatch`. Edge cases: a record from a newer engine; an empty `inputs` list; flight record uses its own `origin` and `{step, action}` log, wrapped by `replayAndCheck` through an adapter in the fixture test.
- Performance. Each record under 5 s of simulated time so the browser pass stays under a few seconds.
- Migration. none. Preflight. `test -e src/sim/replay/record.ts e2e/core.spec.ts`; `grep -n webkit playwright.config.ts`.

**Verification**

- Unit tests (`fixtures.test.ts`). Each fixture replays equal in Node; mutate one input and the first mismatch is reported at the right second; versions refusal text lists both strings.
- Integration. `V src/sim/replay`.
- Playwright. `E e2e/replay.spec.ts --project=chromium --project=webkit`: five tests per browser, each asserting the stored checkpoint hashes equal the page's.
- Fixtures. `src/sim/replay/fixtures/{arduino,python,verilog,analog,flight}.json`.
- Acceptance. Given the five recorded runs, When replayed in Chromium and in WebKit, Then every checkpoint hash equals the stored one.
- Observability. The spec prints the first mismatch with browser name. Release blockers. A WebKit-only mismatch: stop, do not loosen a class, report the first differing quantity (if it is analog and within class N, the record is `N` and the test says so; if it is class B it is a bug).

**Delivery**

- Definition of done. Fixtures committed, both browsers green, SA-18 numbers (five of five) recorded.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim/replay && KL NEXT_DIST_DIR=.next-build npx playwright test e2e/replay.spec.ts`.
- Documentation. none. Rollback. `git revert`.
- Later tasks need. T-B8-19 compares hashes between members with the same method; B9 adds the avr8js record.

---

### T-B8-17a Run channel, shared types: frames, validators, op classes

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-17a |
| Subsystem | Protocol (`src/protocol`), REALTIME slice S7 |
| Phase / group / priority | B8 / G1 / P0 |
| Dependencies | none in B8; the B7 task that creates `src/protocol/frames.ts` and `validate.ts` (roadmap T-B7-01; find it by file name, the B7 task file numbers its tasks differently) |
| Status | not started |
| Source files (3) | new `src/protocol/run-ops.ts`; edit `src/protocol/frames.ts`, `src/protocol/validate.ts` |
| Test files | new `src/protocol/run-ops.test.ts`, `src/protocol/run-validate.test.ts` |

Split out of the old T-B8-17 by the review of 2026-10-27 (issues 1 and 4). The server half is T-B8-17b.

**Intent**

- Problem. The run channel needs frame types, validators and one classifier of ops that both the server and the browser import. B7 deliberately left them out: it keeps `"run"` out of `CLIENT_CAPS`, sends `runner: null` and `run: null` in `welcome`, and refuses `run.*` frames (B7 decision D21, `B7-collab-rooms-shares-board.md:114`; `CLIENT_CAPS` at `:252`).
- Target user. T-B8-17b (server), T-B8-18 (client).
- Story. As a buddy I want a frame that is not a valid run frame to be refused without touching the room.
- Expected behaviour. The run frames of REALTIME 13 (`RunEv`, `RunTick`, `RunCheck`, `RunFrame`, `RunReq`, `RunEvUp`, `RunTickUp`, `RunCheckUp`, `RunReqUp`, `REALTIME_ARCHITECTURE.md:346-350, 371-382`) are defined once. `"run"` joins `CLIENT_CAPS`. `classifyOp` sorts every op kind into `live-safe`, `run-input` or `sim-affecting`. `RunState` lives here (not in `server/`) so the client can import it.
- Success metric. Every hostile frame shape of the list below is refused by `validate.ts`; `classifyOp` has a row for every op kind in `PROJECT_DATA_MODEL.md` (a test lists them).

**Implementation**

- Existing code. T-B7 `src/protocol/frames.ts`, `validate.ts` (read both; `grep -n "run\." src/protocol/frames.ts` first, because T-B7 may already define some run frame types; add only what is missing).
- Modules and signatures.

```ts
// src/protocol/run-ops.ts (portable, shared by server and client)
export type OpClass = 'live-safe' | 'sim-affecting' | 'run-input';
export function classifyOp(op: { kind: string; value?: unknown }): OpClass
//   live-safe: view.*, wire.route, label.*, meta.*, guide.*, asset.* (non-sim roles), mech without bodies, instrument.set, instrument.remove (PROPOSAL, section 10)
//   run-input: fault.set, input.set, script.set  (the runner re-issues them as stamped events referencing the commit seq)
//   sim-affecting: everything else (including sim.set, which halts a run in a room)
export const RUN_LIMITS = { reqPerSec: 20, logMax: 50_000, frameMaxBytes: 16 * 1024, framesPerSec: 10, evValueMaxBytes: 4096, targetMaxChars: 128 } as const;
export interface RunState { runId: string; state: 'idle'|'running'|'paused'|'halted'|'done'; runner: Actor | null; atSeq: number; seed: number; speed: number; horizonNs: number; versions: Record<string, string>; rseq: number; haltReason?: 'edited' | 'server-restarted' | 'log_full' | 'error' }
export type RunReqName = 'start' | 'pause' | 'resume' | 'stop' | 'reset' | 'step' | 'speed' | 'input';
```

- Validators in `validate.ts`: `kind` in the six values; `target` at most 128 characters; `value` JSON at most 4 KiB; `tNs` a safe integer at least 0; `hb` and `hd` 16 hexadecimal digits; `run.frame` at most 16 KiB. The `req` enum differs by direction. A member's `run.req` (`RunReqUp`) allows `start pause resume stop reset step speed input` only. The server-to-runner `run.req` (`RunReq`, field `from` stamped by the server) allows those eight and a ninth, `frames`, with `args { on: boolean }`; it is the message the server uses to tell the runner to start or stop producing `run.frame` (D-B8-5). A client frame with `req: 'frames'` is `bad_run_frame`. The `cmd` validators gain `run.detach { mode: 'frames' | 'own' | 'sync' }` (`sync` is sent by Rejoin and takes the member out of the frame set; it is not in REALTIME 13.6, PROPOSAL, D-B8-5) and `runner.set { to }`.
- Error codes added to the `Error` frame: `run_state`, `bad_run_frame`, `run_log_full`. Close codes unchanged.
- Data model. `RunState` above; `RunEv` and the log live in the server's memory only (T-B8-17b).
- Input and output schemas, API contracts, state transitions, permissions: the shapes above. No REST route. Protocol v2 only; no database change.
- Algorithm. `classifyOp` is a lookup by op kind prefix with a table test; an unknown kind is `sim-affecting` (fail safe: halt rather than diverge).
- Validation rules. As the validator list. Error conditions. `bad_run_frame` for each refusal. Edge cases. `value` of exactly 4 KiB passes and 4 KiB plus 1 fails; `tNs` equal to 2^53 fails; `hb` in upper-case hex fails.
- Performance. Constant per frame. Migration. none.
- Preflight. `test -e src/protocol/frames.ts src/protocol/validate.ts`; `grep -n "CLIENT_CAPS" src/protocol/frames.ts`.

**Verification**

- Unit tests. `run-ops.test.ts`: `classifyOp` table for every op kind, including `instrument.*` (live-safe), `mech` with and without bodies, `sim.set` (sim-affecting), unknown kind. `run-validate.test.ts`: each limit above at the boundary; `req: 'frames'` accepted down and refused up; `run.detach` modes; `CLIENT_CAPS` contains `run`.
- Integration. `V src/protocol`; `npx tsc -p tsconfig.portable.json`.
- Playwright. none. Fixtures. Inline frames.
- Acceptance. Given a `run.req` with `req: 'frames'` from a member, When it is validated, Then it is refused with `bad_run_frame`.
- Observability. none. Release blockers. A client-sendable `frames` request; a `classifyOp` that returns `live-safe` for an op that changes simulation inputs.

**Delivery**

- Definition of done. Three files and two tests, portable build clean.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/protocol && npx tsc -p tsconfig.portable.json`.
- Documentation. none. Rollback. `git revert`; B7 behaviour (editing only) returns.
- Later tasks need. T-B8-17b, T-B8-18 (`RunState`, `classifyOp`), T-B8-20 (`classifyOp` for the tolerance control).

---

### T-B8-17b Run channel, server side: channel, hub and wiring

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-17b |
| Subsystem | Rooms, run channel (REALTIME slice S7) |
| Phase / group / priority | B8 / G2 / P0 |
| Dependencies | T-B8-17a; the B7 tasks that create `server/src/rooms/core.ts` (`RoomCore`, `Outbound`, `MemberRef`), `server/src/rooms/permissions.ts`, `server/src/ws/bucket.ts` and `server/src/ws/dispatch.ts` (`SocketSession`) |
| Status | not started |
| Source files (4) | new `server/src/rooms/run-channel.ts`, `server/src/rooms/run-hub.ts`; edit `server/src/rooms/core.ts`, `server/src/ws/dispatch.ts` |
| Test files | new `server/test/run-channel.test.js`, `server/test/run-hub.test.js`, `server/test/hostile/run-hostile.test.js` |

The old task listed `server/src/ws/server.ts`. In the B7 layout that file only upgrades the socket; the per-socket message loop, the join sequence and the leave path are `server/src/ws/dispatch.ts` (step 7, 8 and 11 of the dispatch algorithm in the B7 task file), and a commit is produced in `RoomCore.flush()`. Those two are the files that must change.

**Intent**

- Problem. A room can edit together but cannot run together. Two browsers receiving the same button press at different virtual times diverge at the first press (RT O-4). The server never simulates (D-015), so it must order inputs and let one member, the runner, own time.
- Target user. Two or more buddies in a room watching and driving one circuit.
- Story. As a buddy I want to press the button on a shared circuit and have everyone see the same thing at the same simulated instant.
- Expected behaviour. REALTIME 13: the runner publishes `run.ev` (kinds `pin analog serial param fault control`), `run.tick`, `run.check {hb, hd}` and optionally `run.frame`. The server assigns `rseq`, forwards in arrival order, forwards `run.req` from permitted members to the runner only (with `from` stamped by the server), tracks `RunState` for late joiners, halts the run on a sim-affecting committed op with reason `edited` at the commit `seq`, pauses at the last published tick when the runner's session ends, caps the log at 50,000 entries (`log_full`), sends `run.frame` only to members who asked with `run.detach {mode: "frames"}`, and tells the runner when to produce frames (below).
- Success metric (RA-14/15 server half). Frame order and state machine tests pass; every hostile case is refused without state change; 20 requests per second per member accepted and the 21st refused; the frame-fallback request reaches the runner on the first frame member and again when the last one leaves.

**Implementation**

- Existing code. Frame types and validators: T-B8-17a. `RoomCore` and `Outbound` (`type Outbound = { to: Target; frame: ServerFrame } | ...`, `Target = { kind: 'member'; m } | { kind: 'room'; except? }`, B7 `server/src/rooms/types.ts`); `SocketSession` in `dispatch.ts`; `TokenBucket` in `server/src/ws/bucket.ts`; `runControl` setting (`REALTIME_ARCHITECTURE.md:183, 276`). In this file `Member` means B7's `MemberRef` and `Actor` is the protocol type.
- Modules and signatures.

```ts
// server/src/rooms/run-channel.ts
export interface RunOutcome { send: Array<{ to: 'all' | 'runner' | 'others' | 'frames-members' | Member; frame: RunDown }>; errors: Array<{ to: Member; error: ErrorFrame }>; events: RoomEventInput[] }
export interface RunChannel {
  onFrame(from: Member, f: RunUp): RunOutcome            // run.req, run.ev, run.tick, run.check, run.frame
  onCommit(seq: number, ops: ReadonlyArray<{ kind: string; value?: unknown }>): RunOutcome
  onCmd(from: Member, name: 'runner.set' | 'run.detach', args: unknown): RunOutcome
  onLeave(m: Member): RunOutcome
  welcome(m: Member): { run: RunState | null; log: readonly RunEv[] }
}
export function createRunChannel(room: { settings(): { runControl: 'editors' | 'host' }; members(): readonly Member[]; host(): Member | null }, d: { clock(): number; bucket(): TokenBucket }): RunChannel
// server/src/rooms/run-hub.ts
export function createRunHub(d: { clock(): number; bucket(): TokenBucket }): { forRoom(core: RoomCore): RunChannel; toOutbound(core: RoomCore, o: RunOutcome): Outbound[] }
// core.ts adds
onCommitted(fn: (writes: readonly CommitWrite[]) => Outbound[]): () => void    // returns the unsubscribe function
```

- Where the pieces connect (the answer to "who calls what").
  1. `run-hub.ts` keeps one `RunChannel` per `RoomCore` in a `WeakMap`, created on first use, and registers `core.onCommitted(writes => hub.toOutbound(core, channel.onCommit(core.seq, opsOf(writes))))` once per core.
  2. `core.ts`: `flush()` calls the listeners after the group COMMIT and after it has built the commit frames, and appends what they return after those frames. Every member therefore receives the commit before the `run.ev` control `halt` for it, and the order does not depend on arrival timing. A listener that throws is caught and logged; it never undoes the commit.
  3. `dispatch.ts`, join (step 7): `welcome` carries `run` and `runner` from `hub.forRoom(core).welcome(m)` instead of `null` (B7 D21), followed by the log as `run.ev` frames. Message loop (step 8): `run.req`, `run.ev`, `run.tick`, `run.check`, `run.frame` go to `channel.onFrame`; `cmd` with name `runner.set` or `run.detach` goes to `channel.onCmd` before it falls through to `core.command`; the B7 refusal of `run.*` is removed in the same edit. Leave (step 11): `channel.onLeave(m)`. Each `RunOutcome` is turned into `Outbound[]` by `hub.toOutbound` and routed exactly like `core` outputs.
  4. Rate limit: `run.req` 20 per second per member, from `d.bucket()` inside `run-channel.ts`; mirror slider streams are coalesced to 10 per second per input by the client (T-B8-18).
- Data model. `RunState` (T-B8-17a); the log is an array of `RunEv` in memory only. A restart ends the run: nothing is persisted, so no frame can announce it. A client that reconnects with `welcome.run` null while it held a run treats that as a halt with `server-restarted` (T-B8-18).
- State transitions (REALTIME 13.3, copied): `start {atSeq, seed, speed, versions}` idle, done, halted to running; `pause`, `resume` running and paused; `step {unit, n}` paused to paused; `speed {x}` running or paused, 0.01 to 100 or 0; `stop`, `reset` any to idle; `halt` (system) running to halted. An invalid request answers `run_state` to the requester and has no effect, so two people pressing Start together produce one start.
- Ordering rules. (1) Only the runner may send `run.ev`, `run.tick`, `run.check`, `run.frame`; others get `not_runner`. (2) A `run.ev` must carry `tNs` strictly greater than the highest `tNs` the server has forwarded in any tick or event; otherwise `bad_run_frame` to the runner and no forward (invariant 2 of REALTIME 13.2). (3) The server forwards each frame in arrival order on each member's single stream, so a mirror receives a `run.ev` before any tick at or beyond its `tNs`. (4) `run.tick.tNs` is non-decreasing; it becomes `horizonNs`.
- Frame fallback (fixes the contradiction between D-B8-5 and the old validator). The channel keeps `framers: Set<m>`. `onCmd('run.detach', {mode: 'frames'})` adds the member; modes `own` and `sync` remove it; `onLeave` removes it. When the set goes from 0 to 1 the outcome contains `send: [{ to: 'runner', frame: { t: 'run.req', from: <the system actor constant the commit path uses for author.kind "system"; grep first>, id: 'srv-<n>', req: 'frames', args: { on: true } } }]`; when it goes from 1 to 0 the same with `on: false`. When `runner.set` completes and `framers` is not empty, the new runner receives `on: true` and the old runner, if still connected, `on: false`. A `run.frame` from the runner is forwarded to `frames-members` only; with an empty set it is dropped and counted, not an error (a race with the last leave).
- Algorithm (the rest). `onCommit`: if the run is `running` or `paused` and any op is `sim-affecting`, set `halted` with `edited`, emit `run.ev` control `halt` stamped with `tNs = horizonNs` and the commit `seq` so every member halts at the same instant; for `run-input` ops, send the runner a `run.req` of `input` with `commitSeq` so it stamps a `fault` or `param` event. `onLeave` of the runner: state `paused` at `horizonNs`, emit control `pause` and a room event `runner.lost`. `runner.set {to}`: host only; refused while running unless `to` reported `atTick` at least `horizonNs` in its `runner.accept`. Late joiner: `welcome` returns `RunState` and the log (at most 50,000 entries).
- Permissions. `run.req` allowed for `owner` and `editor` when `runControl` is `editors`; only host and runner when `host`; never for commenter or viewer. `runner.set` and `run.detach` follow RT section 6 (host only; any member may detach themselves).
- Error conditions. As above. Edge cases. Two `start` at once; `start` while running; a viewer sends `run.ev`; a runner sends a tick going backward; the log reaches 50,001 (halt `log_full`); a `run.detach frames` member leaves while it was the only one (the runner gets `on: false`); a commit batch with live-safe and sim-affecting ops (halt); a commit during `idle` (no effect); a commit by the runner itself (same halt).
- Performance. All state is in memory; per frame work is constant. Memory: 50,000 entries at about 60 bytes is 3 MB per room (ESTIMATED, RT 13.7).
- Migration. Protocol v2 only; no database change. Preflight. `test -e src/protocol/run-ops.ts server/src/rooms/core.ts server/src/ws/dispatch.ts server/src/ws/bucket.ts server/src/rooms/permissions.ts`; `grep -n "runner.set" server/src -r` (if B7 already handles it, call it, do not duplicate); `grep -n "afterCommit" server/src/rooms/core.ts` (the new `onCommitted` is a second hook; `afterCommit` stays the test seam of B7).

**Verification**

- Unit tests (`node --test`). `run-channel.test.js`: state machine, every row of the table, plus each invalid transition returning `run_state`. Ordering: runner sends `ev(tNs=500)`, `tick(400)` is accepted and `ev(tNs=300)` after tick 400 is refused; forwarded order equals arrival order. Permissions for each role and both `runControl` values. Runner leave pauses at the last tick. Edit halts at the commit `seq`. Log cap at 50,000. Late joiner receives the log. Frame fallback: first `run.detach frames` produces one `run.req frames on:true` to the runner, a second member produces none, the last leave produces `on:false`, `own` and `sync` remove the member, a runner change re-sends to the new runner. `run-hub.test.js`: with a real `RoomCore` on `:memory:`, an editor commit of `component.add` returns the commit frames first and the `halt` event after them, for the author and for the others; `welcome` carries the run state; a throwing listener leaves the commit intact.
- Hostile suite (`run-hostile.test.js`). Viewer sends `run.ev`; commenter sends `run.req`; non-runner sends `run.tick` and `run.check`; a member sends `run.req` with `req: 'frames'` (refused `bad_run_frame`); forged `from` in a client `run.req` is overwritten; 4 KiB plus 1 `value`; 17 KiB `run.frame`; 21 requests in a second; replayed old `rseq`; `run.frame` to a member who did not ask. Each: refused, state unchanged, sockets alive unless the flood rule closes them (B7's rule).
- Integration. `SRV`; `V src/protocol`; `npx tsc -p tsconfig.portable.json`. The B7 room tests (`server/test/room-core.test.js`, `ws-dispatch.test.js`) must still pass.
- Playwright. none here (T-B8-19).
- Fixtures. Inline frames. Acceptance (RA-15 server half). Given a runner and two mirrors, When the runner disconnects, Then the server pauses everyone at the last published tick; When an editor commits `component.add`, Then everyone halts with reason `edited` at that `seq`. Given one member sends `run.detach frames`, Then the runner receives one `run.req` frames request with `on: true`.
- Observability. Room events `run.start` and other run controls, `runner.*`, `run.halt` with reason (REALTIME section 14 list).
- Release blockers. A run frame accepted from a non-runner; a halt that depends on arrival timing; a `frames` request accepted from a member.

**Delivery**

- Definition of done. Four files, three test files, portable build clean, `SRV` green, the B7 server tests unchanged.
- Verify commands. `npm run typecheck && npm run lint && (cd server && node --test) && npx vitest run src/protocol && npx tsc -p tsconfig.portable.json`.
- Documentation. none now. Rollback. `git revert`; with the run channel absent the room works as in B7 (editing only).
- Later tasks need. T-B8-18 (client), T-B8-29 (mounts the client), T-B8-19 (e2e), T-B8-26 (UI reads `RunState` from `welcome`).

---

### T-B8-18 Run channel, client: runner, mirrors, fallback, detach

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-18 |
| Subsystem | Collaboration client, run mirroring |
| Phase / group / priority | B8 / G7 / P0 |
| Dependencies | T-B8-14 (host controls), T-B8-15 (restore and replay), T-B8-17a (types), T-B8-17b (server), T-B8-25 (host messages, hashes); T-B7 client `src/collab/*` |
| Status | not started |
| Source files (5) | new `src/collab/run.ts`, `src/collab/run-mirror.ts`, `src/collab/run-runner.ts`; edit `src/sim-host/host.ts`, `src/sim-host/protocol.ts` |
| Test files | new `src/collab/run-mirror.test.ts`, `run-runner.test.ts`, `run.test.ts` |

**Intent**

- Problem. Each member's browser must compute the same run from the same ordered document, seed and runner-stamped inputs, without streaming frames, and degrade honestly when it cannot.
- Target user. Buddies in a room.
- Story. As a buddy I want my copy of the run to match the runner's, and if it cannot I want to see the runner's run labelled as theirs.
- Expected behaviour (REALTIME 13). Runner: runs the sim, publishes a `run.tick` every 100 ms of simulated time, a `run.check {hb, hd}` every 1,000 ms, and stamps a member's input request at `max(its own now, last published tick) + 1,000,000 ns` and sends the `run.ev` before any tick at or beyond the stamp. Mirror: keeps a queue sorted by `(tNs, rseq)`; simulates only up to the latest tick received (its horizon); applies each event by `runUntil(tNs, { exclusive: true })` then `inject` (T-B8-09), so an input is the first thing at its instant on every machine; compares `hb` and `hd` at each check; a differing `hb` marks it `diverged` at once, and a differing `hd` does so when two consecutive checks differ (PROPOSAL, risk R8; REALTIME 13.6 compares once); a diverged mirror logs it to the room event log only and asks for `run.detach {mode: "frames"}`; on engine versions that differ from `start.versions` goes straight to frames. A sim-affecting committed op halts the run at that `seq` (same classifier as the server). Detach "own" runs a private copy from the current revision; Rejoin first sends `run.detach {mode: "sync"}` so the server stops sending it frames (T-B8-17a), then restarts mirroring by replay from the run log (late-join path). Late joiner: shows "catching up", replays the log with the frame fallback visible until caught up.
- Success metric (RA-14/15 client half). A model-checking test of mirror and runner over random schedules never produces an input applied at different instants on the two sides; `hb` equal at every check in the fake-transport test; each RA-15 case has a unit test.

**Implementation**

- Existing code. T-B7 client (`src/collab/*`, `RoomAuthority`; read its transport type), `src/sim-host/host.ts` and `protocol.ts` (after T-B8-14 and T-B8-25), `src/protocol/run-ops.ts` (T-B8-17a).
- Modules and signatures.

```ts
// run-mirror.ts (portable)
export type MirrorStatus = 'in-sync' | 'catching-up' | 'diverged' | 'detached-own' | 'frames' | 'engine-mismatch' | 'halted';
export interface MirrorHost { now(): SimTime; runUntil(t: SimTime, o?: { exclusive?: boolean }): void; inject(e: InputEntry): void; hashes(): { hb: string; hd: string } }
export interface Mirror { onEv(f: RunEv): void; onTick(tNs: number): void; onCheck(c: RunCheck): { equalB: boolean; equalD: boolean | null }; pump(): void; status(): MirrorStatus; horizon(): SimTime }
export function createMirror(h: MirrorHost): Mirror
// run-runner.ts (portable)
export const TICK_NS = 100_000_000, CHECK_NS = 1_000_000_000, STAMP_LEAD_NS = 1_000_000;
export interface Runner { stamp(req: RunReq, nowNs: SimTime): RunEv; afterSlice(nowNs: SimTime): Array<RunTick | RunCheck>; lastPublished(): SimTime }
export function createRunner(h: MirrorHost, rseq: () => number): Runner
// run.ts
export interface RunClientState { status: MirrorStatus; role: 'runner' | 'mirror' | 'detached'; run: RunState; achievedSpeed: number; behindReal: boolean; lastCheckAt: SimTime | null; lastHb: string | null; lastHd: string | null }
export interface RunClient { onWelcome(w: { run: RunState; log: RunEv[] }): void; onFrame(f: RunDown): void; request(req: RunReqUp['req'], args?: unknown): void; detach(mode: 'own' | 'frames'): void; rejoin(): void; subscribe(fn: (s: RunClientState) => void): () => void; readonly state: RunClientState }
export function createRunClient(d: { send(f: RunUp): void; host: SimHost; self: Actor; versions: Record<string, string>; classifyOp: typeof classifyOp }): RunClient
```

  `host.ts` gains `horizon(t: SimTime | null)` (the pump clamps `runUntil` targets to it) and `applyStamped(e: InputEntry)`; `protocol.ts` gains the matching messages. This task builds the client and does not touch `RunBar.tsx`, `session.ts` or `StudioEntry.tsx`: creating the client from the room transport, routing the run controls to `RunClient.request` and mounting the indicator is T-B8-29.
- Algorithm (invariants, REALTIME 13.2). I1: a mirror never simulates past the latest tick received. I2: the runner publishes a tick only for time it has already simulated. I3: the runner stamps every input strictly after any published time and sends the event before any tick at or beyond it. I4: events apply in `(tNs, rseq)` order. The pump loop: `target = min(speedTarget, horizon, nextQueuedEvent.tNs, nextCheck.tNs)`; run to `target`; if an event is due, `exclusive` run, inject, continue; at a check time compare hashes. The runner uses the same code path for its own inputs, so both sides apply identically.
- State transitions. Run states are the server's (`RunState`); a client adds only `diverged`, `frames`, `detached-own`, `catching-up`. `halt edited` arrives as the server's stamped `run.ev` control `halt` (T-B8-17b appends it right after the commit frames), so the client does not re-derive it. `classifyOp` is injected so the UI can predict that an op would halt the run (T-B8-20 disables the tolerance control for that reason). A reconnect whose `welcome.run` is null while the client held a run is shown as `halted` with reason `server-restarted`.
- Frame fallback. Needs the runner to produce frames only while some member wants them. REALTIME 13.6 says the server sends frames to members who asked but does not say how the runner learns to produce them; this plan makes the server send the runner a `run.req {req: 'frames', args: {on: true | false}}` when the count of frame members goes between 0 and 1 (PROPOSAL, section 10). T-B8-17a lets the runner's validator accept `frames` and T-B8-17b sends it; here the runner handles it: on `true` it starts publishing `run.frame` at most 10 per second, on `false` it stops. A frame is the UI `Snapshot` (pins, LEDs, readouts) at most 16 KiB and 10 per second.
- Validation. Ignore any `run.ev` with `rseq` not above the last seen. Errors: `engine-mismatch` shows both version strings. Edge cases. Mirror joins mid-run; runner moves while running (new runner must have reached the last tick); speed change (one room speed, `speed` is a request to the runner); `behindReal` on the runner shows the hint to the host (T-B8-26); the same member is runner and presses a button (stamped like others); a mirror that diverges at check k and rejoins later.
- Permissions. Requests are sent only when the member's role allows (the server enforces; the UI hides). Performance. The pump adds one comparison per slice. Migration. none.
- Preflight. `test -e src/collab src/sim-host/host.ts src/protocol/run-ops.ts`; read the B7 client transport type and match it.

**Verification**

- Unit tests. `run-mirror.test.ts`: a fake orchestrator (counter with an input-sensitive state) and 10,000 random schedules (seeded) of events, ticks and speeds: the mirror state at every check equals the runner's; the mirror never passes its horizon; ordering by `(tNs, rseq)`. `run-runner.test.ts`: stamp rule (I3) including a stamp request arriving exactly at a tick; tick and check cadence. `run.test.ts` with a fake transport, one test per RA-15 case: runner disconnect (all pause at the same `tNs`, new runner continues with `resume`), late join (catching up then in sync), sim-affecting edit halts at the same `seq`, detach own then rejoin, engine mismatch goes to frames with the label state, divergence goes to frames and is logged to the room event log only.
- Integration. `V src/collab src/sim-host`. Playwright in T-B8-19.
- Fixtures. Inline. Acceptance. Given a runner and two mirrors, When a mirror presses a button 50 times at random instants, Then all three report equal `hb` at every check.
- Observability. `RunClientState.lastHb/lastHd` and `status` feed the UI (T-B8-26). Release blockers. An input applied at different `tNs`; a mirror that simulates past its horizon.

**Delivery**

- Definition of done. Five files, three test files, portable build clean for `run-mirror.ts` and `run-runner.ts`.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/collab src/sim-host && npx tsc -p tsconfig.portable.json`.
- Documentation. none. Rollback. `git revert`; rooms edit as in B7.
- Later tasks need. T-B8-29 (creates and mounts it), T-B8-19, T-B8-26. B9 adds avr8js versions to `versions`; B16 and B19 add physics and flight (class D until RA-02 and SA-12 pass).

---

### T-B8-19 Lockstep determinism: runner plus two mirrors

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-19 |
| Subsystem | End-to-end test |
| Phase / group / priority | B8 / G10 / P0 |
| Dependencies | T-B8-17b, T-B8-18, T-B8-26, T-B8-29 (creates the client from the room transport and mounts `run-sync`); T-B7-20 (`e2e/support/server.ts`, two-browser room walk) |
| Status | not started |
| Source files (0) | tests only: `e2e/run-lockstep.spec.ts`, `e2e/support/run.ts` |

**Intent**

- Problem. The lockstep claim is only true if three real browsers agree.
- Target user. The maintainer; Amar at the gate.
- Story. As a maintainer I want one test that fails if the runner and two mirrors ever disagree.
- Expected behaviour (RA-14, RA-15). One runner in Chromium, one mirror in Chromium, one mirror in WebKit, in one room on a real local server (`e2e/support/server.ts`, a port other than 3000 and 43117). A scripted blink plus button sketch with an LED, resistor and a pot on A0 runs at room speed 10x. A non-runner presses the button 50 times at wall-clock gaps drawn from a seeded generator. At every check (`data-testid="run-sync"`, attributes `data-at`, `data-hb`, `data-hd`) the three `hb` are equal and, with the analog circuit, the three `hd` are equal. Then the RA-15 cases that need browsers: runner closes its tab and all pause at one `data-at`; a second member becomes runner and resumes; a late joiner catches up; an editor adds a part and all halt with the same reason and `seq`; a member detaches, presses buttons alone, and rejoins; a context whose engine manifest is altered (Playwright `route` on the engine manifest of T-B3-09) shows the frame fallback with the "watching" label.
- Success metric. At least 20 checks compared per run, zero mismatches; all five RA-15 browser cases pass in Chromium and WebKit.

**Implementation**

- Existing code. `e2e/support/server.ts` and `e2e/rooms.spec.ts` (T-B7-20, read for the helper names); `playwright.config.ts` with the WebKit project (T-B3-21); the part of Studio that presses a button part (T-B4-14); the `run-sync` attributes of T-B8-26, mounted by T-B8-29.
- Helpers (`e2e/support/run.ts`): `joinRoom(ctx, invite)`, `startRun(page, { speed })`, `collectChecks(pages, seconds)` returning `{ at, hb, hd }[]` per page, `pressButton(page, partId)` using pointer down and up on the part, `seededGaps(seed, n, minMs, maxMs)`.
- Algorithm. Runs on `await expect.poll(...)` over the `data-at` text, never a fixed sleep (waiting on a condition, not on wall time).
- Validation, errors, permissions: none new. Edge cases: WebKit start-up time; a check missed because the page was in the background (use `page.bringToFront` per context).
- Performance. The spec budget is 120 s; room speed 10x keeps 20 simulated seconds near 2 s plus catch-up.
- Preflight. `test -e e2e/support/server.ts e2e/rooms.spec.ts src/collab/run-wiring.ts src/components/studio/room/RunIndicator.tsx`; `grep -n webkit playwright.config.ts`.

**Verification**

- Playwright scenarios. S1 lockstep with 50 presses; S2 runner disconnect; S3 new runner resumes; S4 late join; S5 edit halts all; S6 detach and rejoin; S7 engine mismatch fallback.
- Acceptance (Given/When/Then). Given a runner and two mirrors on an analog circuit, When a non-runner presses the button 50 times, Then `hb` is equal on all three at every check and `hd` is equal at every check. Given the runner closes its tab, Then the two others show the same paused `data-at`.
- Observability. The spec writes the compared series to `test-results/run-lockstep.json` for the evidence file. Release blockers. Any mismatch; a retry that hides one.

**Delivery**

- Definition of done. Spec green in both browsers with `--retries=0`.
- Verify commands. `npm run typecheck && npm run lint && KL NEXT_DIST_DIR=.next-build npx playwright test e2e/run-lockstep.spec.ts --retries=0`.
- Documentation. none. Rollback. delete the spec. Later tasks need. T-B8-24 reads the JSON.

---

### T-B8-20 Instrument dock in Studio, keyboard operation, summary chip mount

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-20 |
| Subsystem | Studio UI |
| Phase / group / priority | B8 / G8 / P1 |
| Dependencies | T-B8-04, T-B8-11, T-B8-12, T-B8-13, T-B8-25, T-B8-27, T-B8-28; T-B4-01, T-B4-11, T-B4-19, T-B4-20 |
| Status | not started |
| Source files (3) | new `src/components/studio/InstrumentDock.tsx`, `src/studio/instruments/placement.ts`; edit `src/components/studio/StudioEntry.tsx` |
| Test files | new `src/studio/instruments/placement.test.ts`, `src/components/studio/InstrumentDock.test.tsx`, `e2e/instruments.spec.ts`; edit `e2e/studio-a11y.spec.ts` |

**Intent**

- Problem. The instruments exist as parts; a maker needs one place to add, see and remove them, from the keyboard, without the page getting slower for those who do not use them.
- Target user. A maker; a keyboard-only user (FA-12 goal).
- Story. As a maker I want to add a multimeter, scope, logic analyser or plotter from a list, and have it saved with the project.
- Expected behaviour. A dock lists the project's `simulation.instruments[]`. "Add instrument" opens a keyboard menu; choosing a kind and a probe point (from a list of pins and nets by name, so no pointer is needed, R-101) issues `instrument.set` with `{ id: 'ins_<id>', kind, target, settings }`; Remove issues `instrument.remove`. Kinds map: `multimeter`, `voltmeter`, `ammeter` to the multimeter (the last two as fixed modes); `oscilloscope`; `logic-analyzer`; `serial-plotter`; `serial-monitor` to the existing serial pane. A tolerance control (nominal or seeded spread) issues `setToleranceOp(doc, mode)`, which builds `sim.set { key: 'solver', value: { ...current.solver, options: { ...current.solver.options, toleranceMode: mode } } }`. `PROJECT_DATA_MODEL.md:796` allows the `sim.set` keys `seed`, `duration_ms`, `solver`, `physics`, `environment`; `toleranceMode` is not a key, so the whole `solver` value is replaced and every other option is kept. In a room `sim.set` is sim-affecting (`classifyOp`, T-B8-17a), so it would halt a shared run: the control is disabled, with the text of key `instruments.tolerance.runActive`, while `RunClientState.run.state` is `running` or `paused`. The AI never proposes this op (`AI_ARCHITECTURE.md:517`, rule R3 forbids `sim.set` with key `solver`); the control is a person's action. Panels load on demand (`next/dynamic` or `React.lazy` in the same manner as T-B1-22; read `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` first) so a project with no instrument pays nothing. `StudioEntry` mounts `TierSummaryChip` and `TierChips` (T-B8-04) beside the run bar. T-B8-29 (G9) edits the same file after this task, to add the room run indicator.
- Success metric. A keyboard-only user adds a multimeter on the Uno blink project in under 15 key presses (HYPOTHESIS; measured and recorded); axe has no serious or critical violation; with a multimeter, a scope and a logic analyser open, the main-thread frame time at 4x CPU throttle is no more than 20 percent above the same page with the dock closed (PROPOSAL threshold, recorded as BUD-07 input).

**Implementation**

- Existing code. `src/components/studio/StudioEntry.tsx` (T-B4-01, T-B4-11); the command registry `src/studio/commands.ts` (T-B4-02) and `keymap.ts` (T-B4-19) for the menu; schema `$defs.Instrument` (fact 19).
- Modules and signatures.

```ts
// placement.ts (portable)
export interface ProbePoint { id: string; label: string; target: { net?: string; pin?: PinRef; component?: string } }
export function listProbePoints(doc: ProjectDocument): ProbePoint[]            // "U1 D13", "R1 pin 1 (net_led)", sorted by label, NFC
export function makeInstrumentOp(kind: Instrument['kind'], target: ProbePoint['target'], settings?: Record<string, unknown>): Op   // 'instrument.set' with a fresh ins_ id
export function removeInstrumentOp(id: string): Op                              // 'instrument.remove'
export function setToleranceOp(doc: ProjectDocument, mode: ToleranceMode): Op   // 'sim.set', key 'solver', value = the whole solver object with options.toleranceMode replaced (ToleranceMode from src/sim/analog/tolerance.ts, T-B8-28)
```

- Data model. `Instrument` exactly as the schema; `settings` at most 16 keys; at most 64 instruments.
- State transitions. Dock open or closed lives in the ui store (T-B4-01). Validation. A target must exist; the op is rejected by `apply` otherwise and the dock shows the reason. Errors. A failed op shows in Problems.
- Edge cases. A project with 64 instruments; a probe point removed after an instrument was added (the instrument shows "target missing" (key `instruments.dock.targetMissing`) and stays); read-only project or viewer role (controls disabled with the reason); phone width (panel as a sheet is B5 and LATER; here it scrolls).
- Permissions. Editors add and remove; viewers read. Performance. Panels subscribe to the probe client only while open; the dock unsubscribes on close. Accessibility. Every control is a native element with a name; the menu is a `role="menu"` with arrow keys; focus returns to the trigger; axe zero serious and critical.
- Migration. none. Preflight. `test -e src/components/studio/StudioEntry.tsx src/studio/commands.ts src/components/studio/instruments/Multimeter.tsx src/components/studio/TierChips.tsx`; `grep -n "instrument\.\|sim\.set" src/project/apply/*.ts` (confirm the op names and the payload shape for `sim.set`).

**Verification**

- Unit tests. `placement.test.ts`: points listed for the Uno blink and the env-monitor example, stable order, ids unique; ops validate against the project validator (V2 semantic pass); `setToleranceOp` keeps `solver.engine` and every other `options` key, changes only `toleranceMode`, and validates; the same op for a doc with no `solver.options` creates the object. `InstrumentDock.test.tsx`: add by keyboard, remove, disabled for viewer (reason text from key `instruments.dock.viewerOnly`), the tolerance control disabled while a room run is `running` or `paused`, lazy panel not imported until opened (assert via dynamic-import spy).
- Integration. `V src/studio src/components/studio`.
- Playwright (`e2e/instruments.spec.ts`, keyless). S1 open the Uno blink project, run, add a multimeter on D13 and ground by keyboard, read a number with tier text; S2 add a scope on D13, see the table view rows; S3 plotter on a project printing numbers; S4 chips: execution, circuit and summary visible and the summary equals the lowest; S5 pause, step one statement, change speed, force a slow clock through the test hook of the host to see the "Running at" text (SA-19 UI); S6 an unmodelled part shows "not modelled yet" and no number (SA-20); S7 axe on the page with the dock open. `e2e/studio-a11y.spec.ts` gets the keyboard path for adding an instrument.
- Fixtures. Uno blink project from the starter templates (T-B4-16).
- Acceptance. Given the Uno blink project running, When I add a multimeter between D13 and ground by keyboard, Then the reading text shows volts, the unit, the tier and provenance. Given a part with no model, Then the panel says "not modelled yet" and shows no number.
- Observability. Instrument ops appear in revision history like any op. Release blockers. A panel that loads before it is opened; an axe serious violation; a number for an unmodelled part.

**Delivery**

- Definition of done. Three files, tests, both specs green, frame-time number recorded.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/studio src/components/studio && KL NEXT_DIST_DIR=.next-build npx playwright test e2e/instruments.spec.ts e2e/studio-a11y.spec.ts`.
- Documentation. none now. Rollback. `git revert`; instruments saved in projects remain valid data.
- Later tasks need. B10 hint ladder step 2 opens the multimeter on a named node; B12 lessons place instruments from templates.

---

### T-B8-21 Spike SP-B8-01: does the ADC formula move any reference run

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-21 |
| Subsystem | Research spike |
| Phase / group / priority | B8 / G1 / P0 (T-B8-05b waits for it) |
| Dependencies | none |
| Status | not started |
| Source files (0) | files outside `src/`: `docs/MASTER_PLAN/08_RESEARCH_SPIKES/SP-B8-01-adc-formula/REPORT.md`, `vitest.spike.config.mts`, `adc-formula.spike.test.ts` |

**Intent**

- Problem. SIM 5.6 and SA-14 want the ADC count `min(1023, floor(V * 1024 / Vref))` (the datasheet form avr8js uses). The interpreter has `Math.round((v / adcVref) * max)` (`world.ts:336`), which differs by up to one count. Changing it may shift values that lesson checks and starters rely on. No spike measured this.
- Falsifiable question. Replacing the formula in `World.analogRead` by `min(max, floor(v * (max + 1) / adcVref))`, does any of the following change: (a) the pass or fail of any of the 102 lesson reference runs, (b) the failure of any starter that is meant to fail a check, (c) the serial text of any run in `src/lib/interp` tests and `src/content/boards` tests?
- Exit condition. ADOPT if (a) and (b) are zero. ADOPT WITH LIST if (a) and (b) are zero and (c) lists value shifts of at most one count (the list is part of the report). DO NOT ADOPT if any reference run changes from pass to fail or any starter stops failing: T-B8-05b then keeps the old formula in the interpreter and the divider read-back test uses the old formula, and the change moves to B9 with avr8js (SA-14), at no cost to B8's exit gate.

**Implementation (method)**

- Existing code under test: `src/lib/interp/world.ts:324-337`; the lesson runners used by `src/lib/interp/lessons.test.ts` and `src/content/boards/*.test.ts`.
- Method. A Vitest config in the spike folder includes only `adc-formula.spike.test.ts`. The test patches `World.prototype.analogRead` to the new formula, runs every lesson reference and every starter through the same helpers the existing tests use, runs them again with the original, and diffs pass/fail and serial text. The patch lives only in the test; no file in `src/` changes.
- Command. `npx vitest run --config docs/MASTER_PLAN/08_RESEARCH_SPIKES/SP-B8-01-adc-formula/vitest.spike.config.mts`.
- Output. `REPORT.md` with the counts (a), (b), (c), the verdict word, the list, and the exact command; every figure labelled MEASURED.
- Preflight. `test -e src/lib/interp/lessons.test.ts`; read it for the helper names.

**Verification and delivery**

- Acceptance. The report states one verdict and the three counts. The orchestrator reads it before group G3 starts T-B8-05b.
- Observability. none. Release blockers. none (a report). Definition of done. Report committed; no `src/` file changed.
- Verify commands. The command above, plus `git status --short src/` printing nothing.
- Rollback. delete the folder. Later tasks need. T-B8-05b applies the verdict.

---

### T-B8-22 Registry data: full coverage of the 38 converted projects

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-22 |
| Subsystem | Fidelity registry data |
| Phase / group / priority | B8 / G2 / P0 |
| Dependencies | T-B8-03, T-B8-27 (the English key set the coverage test checks against); T-B2-12, T-B2-14 |
| Status | not started |
| Source files (1) | data set `src/sim/registry/data/*.json` (one entry per file, kinds listed below) |
| Test files | new `src/sim/registry/coverage.test.ts`, `src/sim/registry/banned.test.ts` |

**Intent**

- Problem. SA-17 and R-114 say every part, engine and failure model in the converted projects has an entry, no asserted tier above the allowed one, and no banned word.
- Story. As a maker I want every claim behind a chip to exist, and a part with no entry to be impossible to ship.
- Expected behaviour. Entries are authored from `SIMULATION_ARCHITECTURE.md` 16.5 (first four exist from T-B8-03; the rest are the table rows at lines 186 to 200 and the interpreter entries) and verified against the code each cites. Kinds and ids: engines and runtimes `runtime:micropython-subset@1`, `runtime:verilog-2state@1`, `runtime:pi-api-mock@1`, `runtime:microbit-runtime@1`; part models `model:diode.pwl@1`, `model:npn.pwl@1`, `model:motor.steady@1`, `model:servo.rule@1`, `model:resistor.linear@1`, `model:pot.linear@1`, `model:source.thevenin@1` (battery, rail, pin), `model:button.switch@1`, `model:stepper-coil.resistive@1`, `model:buzzer.rule@1`, `model:tmp36.rule@1` (the ids of the T-B8-05a table; this task writes them as literals), plus one per remaining model the coverage test names; devices `device:mpu6050@1`, `device:pca9685@1`, `device:ssd1306@1`, `device:lcd1602@1` (T1 functional, zero bus time); buses `bus:spi.unmodelled@1` and `bus:uart.unmodelled@1` (`status: 'planned'`, tier T0, everything in `unsupported`); rules `rule:usb-sag@1` (kept for the old figure engine), `rule:usb-droop@1` (supersedes it for the live path), `rule:regulator-dropout@1` (`bench.js:257`), `rule:brownout-threshold@1`; failure models `failure:led-overcurrent@1`, `failure:diode-overcurrent@1`, `failure:npn-overheat@1`, `failure:tmp36-overvoltage@1`, `failure:pot-track-overpower@1`, `failure:pin-overcurrent@1`.
- Machine-readable honesty data (read by T-B8-10): `operatingRange` with `quantity` `current_A`: LED 0.001 to 0.030 A, evidence "RS-08 C06 to C12: 12.5 percent off a realistic card at 0.3 mA"; 1N4007 0.010 to 1.0 A, evidence "RS-08 C13 and C14: 12.3 and 12.4 percent at 1 to 4 mA"; `knownFailureCases` strings that start `state:on:`, `state:hot:` and `state:sat:` for `model:npn.pwl@1`, evidence "RS-08 C15, C16, C20: saturated Vce differs from a generic card by up to 230 percent". RS-08 `results.json` reports Q1 as `on` in C15 and C16 and `hot` in C20 and never as `sat` (fact 30), so `state:on:` and `state:hot:` are the entries that fire; `state:sat:` is listed for solvers that report it. Label convention (T-B8-03): `labels.chip` is `fidelity.tier.<tier>` and `labels.summary` is `fidelity.summary` on every entry.
- Tier assertions. Resistor, potentiometer and source models T2, with an `oracle` record: `ngspice 45.2`, RS-08 matched 20 of 20 and random networks 60 of 60, worst 7.177e-12 and 8.7e-13 (VERIFIED, `REPORT.md`, `results.json`), report path `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/REPORT.md`, `status: 'pass'`. LED, diode, NPN, motor, servo T1, with the realistic-card record `status: 'partial'` and numbers (10 of 20 within 2 percent). Nothing is T3 in B8. No entry carries `validation.kind: 'bench'`: the board mark waits for Amar's measurements (section 12). Parameter sources cite the code line (`type: 'assumption'` where the file cites no datasheet, e.g. 25 ohm pin resistance at `bench-solve.js:10`).
- Success metric. Coverage test: every descriptor id, runtime engine, solver engine and failure model reachable from the 38 converted projects resolves to an entry; every entry passes `checkEntry`; the banned-word scan over the data finds none; 100 percent of `labels.chip` and `labels.summary` keys exist in the English `fidelity` namespace.

**Implementation**

- Existing code. `src/sim/registry/*` (T-B8-03). The converter output via the function exported from `src/project/convert/index.ts` (T-B2-14; preflight: read the export name).
- Modules. none new. Data model: `FidelityEntry` (T-B8-03). One file per entry, named by the id with each `:` and `@` replaced by `-` (for example `model-led.pwl-1.json`).
- Algorithm (the coverage test). Convert all items and collect `parts[].descriptor`, `simulation.runtimes[].engine` and `simulation.solver.engine`. Map each descriptor to model ids with a literal table in the test that copies the right-hand column of T-B8-05a's table (T-B8-05a is in the same group, so the test cannot import `MODEL_TABLE`; T-B8-06 tests that the two agree). Add the six failure ids as literals: `failure:led-overcurrent@1`, `failure:diode-overcurrent@1`, `failure:npn-overheat@1`, `failure:tmp36-overvoltage@1`, `failure:pot-track-overpower@1`, `failure:pin-overcurrent@1`. `states.ts` is created by T-B8-06 in a later group, so it is not scanned here; T-B8-06 tests that every id it uses is in this list and in the registry. Assert `registry.get(id)` for each id and print the missing list. The test reads `src/i18n/messages/en/fidelity.json` with `fs`, flattens it to dotted keys, and passes that set as `knownKeys` to `loadRegistry` (T-B8-03), so the English-key check lives here.
- Validation. Dates are ISO; `engineVersion` strings name a repository path or a commit short hash; no number without a source line.
- Error conditions. A missing entry fails the test with the list. Edge cases. A descriptor that names a model with `status: 'not-modelled-yet'` needs no model entry but needs `bus:`/`unmodelled` text.
- Permissions, performance: none (data). Migration: none.
- Preflight. `test -e src/sim/registry/entries.ts src/project/convert/index.ts src/i18n/messages/en/fidelity.json src/i18n/b8-copy.test.ts`; `ls src/sim/registry/data`.

**Verification**

- Unit tests. `coverage.test.ts` and `banned.test.ts` as above; `banned.test.ts` also reads `src/i18n/b8-copy.test.ts` as text with `fs`, takes the one line that starts `const BANNED_WORDS_B8 =` (T-B8-27 writes it on one line), and asserts the array equals `BANNED_WORDS` of T-B8-03 (the drift guard between the two lists; there is no test against `scripts/copy-check.mjs`, fact 29); plus a test that `rule:usb-droop@1` supersedes `rule:usb-sag@1` and that exactly one is active per consumer.
- Integration. `V src/sim/registry`. Playwright: none.
- Acceptance (SA-17). Given the 38 converted projects, When coverage runs, Then no id is missing, no tier exceeds its allowed tier, and no banned word appears.
- Observability. The test prints counts of entries by kind. Release blockers. A T2 claim without a passing oracle record; a number with no source.

**Delivery**

- Definition of done. Data set committed; both tests green.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim/registry`.
- Documentation. T-B8-23 renders it. Rollback. `git revert`. Later tasks need. T-B8-04, T-B8-10, T-B8-23; B9 and B11 add entries with the same tests.

---

### T-B8-23 `docs/FIDELITY.md` generated from the registry, with a drift check

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-23 |
| Subsystem | Documentation |
| Phase / group / priority | B8 / G8 / P1 |
| Dependencies | T-B8-04, T-B8-07, T-B8-22 |
| Status | not started |
| Source files (3) | new `docs/FIDELITY.md`, `scripts/fidelity-doc.mjs`; edit `package.json` |
| Test files | new `scripts/fidelity-doc.test.mjs` |

**Intent**

- Problem. The roadmap promises a page on tiers, what each layer models and what is not modelled yet. A hand-written page drifts from the registry.
- Story. As a maker or contributor I want one page that always matches what the app says.
- Expected behaviour. The page has hand-written parts (how to read a chip; the reading rules of SIM 14.3; a link to `src/sim/registry/tiers.ts` for the banned list, whose words the page never prints; how to add an entry) and generated parts between `<!-- generated:tiers -->` and `<!-- /generated -->` markers (per-layer lists, the tier table, "not modelled yet" list, validation lines with dates, the computed RS-08 LED figures read from the fixture, never typed). `node scripts/fidelity-doc.mjs` rewrites the generated parts; `--check` fails with a diff if the file is stale. The script reads only the JSON data and `en/fidelity.json`, so it needs no TypeScript.
- Success metric. `--check` passes on a clean tree and fails after any registry data edit; the page contains no banned word and no "113 mA" (so it links to the list in `src/sim/registry/tiers.ts` and does not print it, which would fail its own scan; review of 2026-10-27, issue 10); `docs/FIDELITY.md` joins the prose guard list of T-B8-07.

**Implementation**

- Existing code. `package.json` scripts (`check` currently `content:check && typecheck && lint && test && e2e`, VERIFIED); `scripts/gen-content-index.mjs --check` is the pattern.
- Change to `package.json`: add `"fidelity:check": "node scripts/fidelity-doc.mjs --check"` and put it after `content:check` in `check`. This adds a check; it changes no threshold.
- Algorithm. Read `src/sim/registry/data/*.json`, sort by id, group by layer and kind, render Markdown tables; escape pipes; deterministic order and trailing newline.
- Validation, errors: `--check` exit code 1 with a unified diff. Edge cases: an entry with empty `validation` renders "Not checked against a reference."; a stale record is marked.
- Permissions, performance, migration: none.
- Preflight. `grep -n '"check"' package.json`; `test -e src/sim/registry/data`.

**Verification**

- Unit tests (`fidelity-doc.test.mjs`, under the Vitest include `scripts/**`). Generate into a temp copy and compare; mutate one entry in memory and expect `--check` to fail; banned-word and "113 mA" scans of the output, and a check that the page contains the link to `src/sim/registry/tiers.ts`.
- Integration. `node scripts/fidelity-doc.mjs --check`; `npm run fidelity:check`.
- Acceptance. Given the registry, When I run the check, Then the page matches. Given an edited entry, Then the check fails and names the section.
- Observability: the diff. Release blockers: a hand-typed number in a generated section.

**Delivery**

- Definition of done. Page, script, package edit, test.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run scripts/fidelity-doc.test.mjs && npm run fidelity:check`.
- Documentation. This is it. Rollback. `git revert`. Later tasks need. B9 onward regenerate the page with `node scripts/fidelity-doc.mjs`.

---

### T-B8-24 Exit evidence: SA and RA numbers in one file

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-24 |
| Subsystem | Phase gate |
| Phase / group / priority | B8 / G11 / P0 |
| Dependencies | all earlier B8 tasks |
| Status | not started |
| Source files (2) | new `scripts/b8-evidence.mjs`; written output `docs/MASTER_PLAN/05_ENGINEERING/evidence/B8-numbers.md` |

**Intent**

- Problem. The exit gate says the numbers are recorded; nothing collects them.
- Story. As Amar I want one file that shows each acceptance id, the command, the number and pass or fail, with the partial ones named.
- Expected behaviour. The script runs, in order, the vitest files and playwright specs mapped in section 13, reads `results.json` of T-B8-08 and `test-results/run-lockstep.json` of T-B8-19, and writes one Markdown table: id, what, command, number, result, label (MEASURED). It writes SA-09 as "first half passes; bus timing waits for T-B9-01" and SA-25 as "clauses 1 to 8 pass; the BRIEF 30 build waits for T-B9-04". With `--full` it also runs `npm run check` and records the exit code and totals. It never edits a threshold and exits 1 if any B8-owned row fails.
- Success metric. Every id of section 13 has a row; no row is blank.

**Implementation**

- Existing code. none. Uses `npx vitest run --reporter=json`, `npx playwright test --reporter=json`.
- Algorithm. Run each command once, parse JSON, map test titles to ids by a tag in the title (`[SA-08]`, `[RA-14]`); the tag convention is added to the B8 tests as they are written (each task's test titles carry its ids). Missing tag = row marked "not run" and exit 1.
- Validation, errors, edge cases: a test that was skipped is "not run"; machine load printed with the bench numbers.
- Permissions: none. Performance: the run is minutes; the script is a gate step, not part of `npm test`.
- Preflight. All B8 tests exist (`ls` of the paths in section 8).

**Verification and delivery**

- Acceptance. Given a green tree, When I run `node scripts/b8-evidence.mjs --full`, Then `B8-numbers.md` has no blank row and the exit code is 0.
- Observability: the file itself. Release blockers: a row marked pass without a command.
- Definition of done. File generated and committed in the same commit as the script.
- Verify commands. `node scripts/b8-evidence.mjs --full`.
- Documentation. The evidence file. Rollback. `git revert`. Later tasks need. The orchestrator pastes the table into its phase report for Amar.

---

### T-B8-25 Probe, instrument and hash messages over `SimHost`

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-25 |
| Subsystem | Host protocol |
| Phase / group / priority | B8 / G6 / P0 |
| Dependencies | T-B8-10, T-B8-14; T-B3-13 |
| Status | not started |
| Source files (5) | edit `src/sim-host/protocol.ts`, `src/sim-host/sim.worker.ts`, `src/sim-host/host.ts`, `src/sim/replay/trace.ts`; new `src/studio/run/probes.ts` |
| Test files | new `src/sim-host/probe-messages.test.ts`, `src/studio/run/probes.test.ts`, `src/sim/replay/class-hashes.test.ts` |

**Intent**

- Problem. The tap lives in the worker; instruments live in the UI thread; rooms need two class hashes. The messages between them are not planned.
- Story. As an instrument I want to add a probe and receive readings and trace chunks without touching engines.
- Expected behaviour. New messages: `probe.add {spec}`, `probe.remove {id}`, `probe.read {id}`, `probe.sub {id, from}` from the host; `probe.added {id, ok | error}`, `probe.reading {id, reading}`, `probe.chunk {chunk}` (transferable `ArrayBuffer`s), batched at 30 messages per second, from the worker; `hashes.request {tNs}` and `hashes {tNs, hb, hd}`. `src/studio/run/probes.ts` is the UI client: `createProbeClient(host)` with `add`, `remove`, `useReading(id)`, `useChunks(id)` as `useSyncExternalStore` stores. `trace.ts` gains `classHashes(o: Orchestrator): { hb: string; hd: string }`: `hb` is FNV-1a 64 over the canonical walk of digital nets, MCU engine state (pins, serial text, counters, virtual time) and the event queue; `hd` is FNV-1a 64 over display values (analog net volts rounded to 1 mV, branch current rounded to 1 microampere, part state words, LED states).
- Success metric. Add, read, stream and remove round-trip in a fake-worker test; 64 probes at most; `hb` is unchanged by probes and by analog value changes below display rounding.

**Implementation**

- Existing code. `src/sim-host/*` (T-B3-13); `src/sim/replay/trace.ts` (T-B3-19, pin-trace hash).
- Modules and signatures.

```ts
// protocol.ts
type HostToSim = /* existing */ | { t: 'probe.add'; spec: ProbeSpec } | { t: 'probe.remove'; id: string } | { t: 'probe.read'; id: string } | { t: 'probe.sub'; id: string; from: SimTime } | { t: 'hashes.request'; tNs: SimTime };
type SimToHost = /* existing */ | { t: 'probe.added'; id: string; error?: string } | { t: 'probe.reading'; id: string; reading: Reading } | { t: 'probe.chunk'; chunk: TraceChunk } | { t: 'hashes'; tNs: SimTime; hb: string; hd: string };
// host.ts
probes: { add(spec: ProbeSpec): Promise<void>; remove(id: string): void; read(id: string): Promise<Reading>; subscribe(id: string, from: SimTime, fn: (c: TraceChunk) => void): () => void }
hashes(tNs: SimTime): Promise<{ hb: string; hd: string }>
// probes.ts
export function createProbeClient(host: Pick<SimHost, 'probes'>): { add(spec: ProbeSpec): Promise<void>; remove(id: string): void; useReading(id: string): Reading | null; useChunks(id: string): TraceChunk | null }
// trace.ts
export function classHashes(o: Orchestrator): { hb: string; hd: string }
```

- Algorithm. The worker coalesces chunks per probe and posts at most 30 batches per second using the host budget module's clock (the one wall-clock exception, SA-11); chunk payload at most 512 KiB; backpressure drops the oldest un-sent chunk and increments `dropped`.
- State transitions. Probes are cleared on `restart` and re-added by the UI client from `simulation.instruments[]`. Validation. 64 probes; spec validated by the tap. Errors: `unknown-target`, `too-many-probes` returned in `probe.added`. Edge cases: probe added while paused (read works, no chunk until resume); worker killed (client re-adds on restart).
- Permissions: none (local). Performance: reading polling is not used; readings are pushed on change. Migration: none.
- Preflight. `test -e src/sim-host/protocol.ts src/sim-host/sim.worker.ts src/sim/replay/trace.ts src/sim/probe/tap.ts`.

**Verification**

- Unit tests. A fake worker pair exercising each message; 65th probe refused; chunk batching count over a fake clock; `class-hashes.test.ts`: adding eight probes leaves `hb` and `hd` unchanged; changing an analog value by 1e-9 V leaves `hd` unchanged and by 5 mV changes it; changing a serial byte changes `hb`.
- Integration. `V src/sim-host src/studio/run src/sim/replay`.
- Acceptance. Given a running sim, When the UI adds a voltage probe on a net, Then readings arrive with tier and provenance and the sim hash is unchanged.
- Observability. `dropped` in chunks. Release blockers. A probe that changes a hash.

**Delivery**

- Definition of done. Five files, three tests.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim-host src/studio/run src/sim/replay`.
- Documentation. none. Rollback. `git revert`. Later tasks need. T-B8-11, T-B8-12, T-B8-18 (`hashes`), T-B8-20.

---

### T-B8-26 Room run UI: runner badge, watching label, private run, rejoin

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-26 |
| Subsystem | Studio UI, rooms |
| Phase / group / priority | B8 / G8 / P0 |
| Dependencies | T-B8-18, T-B8-27; T-B7-12 (`Members.tsx`, host controls) |
| Status | not started |
| Source files (4) | new `src/components/studio/room/RunIndicator.tsx`, `RunnerPicker.tsx`, `src/studio/room/run-state.ts`; edit `src/components/studio/room/Members.tsx` |
| Test files | new `RunIndicator.test.tsx`, `run-state.test.ts` |

**Intent**

- Problem. The channel works but nobody can see who runs the circuit, whether they are in sync, or leave the shared run to try something.
- Story. As a buddy I want to see who is running, whether my copy matches, and be able to run my own copy and come back.
- Expected behaviour. `RunIndicator` shows run state, "Runner: {name}", "In sync at {t} s" (with `data-testid="run-sync"`, `data-at`, `data-hb`, `data-hd`), "Catching up", "Watching {name}'s run" (frame fallback, with the reason: diverged, engines differ), "Private run"; buttons "Run my own copy" and "Rejoin the room's run"; when the runner reports `behindReal` for 5 s the host sees "Ask the host to move the runner to a faster device" in the member's view (REALTIME 13.5) and the host sees `RunnerPicker`, a native select of members that issues `runner.set`. `Members.tsx` adds a runner badge. Halt reasons read plainly: "The run stopped because the circuit was edited."
- Success metric. Every `MirrorStatus` has text; the indicator is operable by keyboard; axe clean.

**Implementation**

- Existing code. `Members.tsx` (T-B7-12); `RunClient` (T-B8-18). This task builds `RunIndicator`, `RunnerPicker` and the store and tests them with a fake client; it does not mount them in `StudioEntry.tsx`. T-B8-29 does that, after T-B8-20 has released the file.
- Modules.

```ts
// run-state.ts
export function createRunStateStore(client: Pick<RunClient, 'subscribe' | 'state'>): { get(): RunClientState; subscribe(fn: () => void): () => void }
export function describeStatus(s: RunClientState, t: TFunction): { text: string; tone: 'ok' | 'info' | 'warn' }
```

- Data model, API: none. Algorithm. `describeStatus` is a pure switch over `MirrorStatus` and halt reason. State transitions: buttons call `client.detach('own')` and `client.rejoin()`. Validation. Buttons disabled while `catching-up`. Edge cases. No run: indicator hidden. Runner is me: badge says "You". Host leaves (B7 handles the role).
- Permissions. `RunnerPicker` visible to the host only. Text. All strings from `run` namespace (T-B8-27). Accessibility: status text in a `role="status"` region; tone is shown by an icon plus text, never colour alone.
- Performance: the store updates at most twice a second. Migration: none. Preflight. `test -e src/components/studio/room/Members.tsx src/collab/run.ts`.

**Verification**

- Unit tests. One test per status and halt reason; picker only for host; axe; keyboard.
- Integration. `V src/components/studio src/studio`. Playwright: T-B8-19 reads the attributes.
- Acceptance. Given a diverged mirror, Then the indicator says "Watching {name}'s run" with the reason. Given a member presses "Run my own copy", Then the tag "Private run" shows and Rejoin returns to "In sync".
- Observability: the attributes. Release blockers. Status conveyed by colour only.

**Delivery**

- Definition of done. Four files, tests.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/components/studio src/studio`.
- Documentation. none. Rollback. `git revert`. Later tasks need. T-B8-19.

---

### T-B8-27 B8 copy in six languages: `fidelity`, `instruments`, `run`

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-27 |
| Subsystem | i18n |
| Phase / group / priority | B8 / G1 / P0 |
| Dependencies | none in B8; T-B4-01, T-B4-21 |
| Status | not started |
| Source files (4) | `src/i18n/messages/{en,de,es,fr,hi,zh}/fidelity.json`, `instruments.json`, `run.json` (three namespaces, counts 3), `src/i18n/namespaces.ts` |
| Test files | new `src/i18n/b8-copy.test.ts` |

**Intent**

- Problem. Seven tasks need strings. Six-language parity is a rule (K-I18N).
- Story. As a maker in any of the six languages I read the same honest labels.
- Expected behaviour. Three namespaces with the keys below, English first, then de, es, fr, hi, zh with the same keys. English source (no em dash, no banned word):

| Key | English |
|---|---|
| `fidelity.tier.T0` / `T1` / `T2` / `T3` / `none` | "Illustration. Not a calculation." / "Teaching model" / "Calculated model" / "Runs your compiled firmware" / "Not modelled yet" |
| `fidelity.tier.T3.note` | "Peripherals not listed in the panel are not modelled." |
| `fidelity.layer.execution` / `circuit` / `protocols` / `mechanics` | "Execution" / "Circuit" / "Protocols" / "Mechanics" |
| `fidelity.summary` | "Overall: {tier}" |
| `fidelity.panel.title` / `modelled` / `mocked` / `unmodelled` / `stale` | "What it models" / "Modelled" / "Mocked" / "Not modelled yet" / "The reference is older than this model" |
| `fidelity.validation.none` / `oracle` / `bench` | "Not checked against a reference." / "Within {pct} percent of {oracle} on {n} circuits ({date})" / "Measured on hardware: {n} circuits, error table" |
| `fidelity.reading.computed` / `approx` / `notModelled` / `outsideRange` / `knownGap` | "{value} {unit}, {tier}, computed from {model}" / "approximate, {why}" / "not modelled yet" / "outside the range this model was checked over" / "this model has a known gap here: {why}" |
| `fidelity.notice.part` | "{part} is not modelled yet. The rest of the circuit still runs." |
| `fidelity.states.led` / `diode` / `npn` / `tmp36` / `pot` | "{name} burned out: {n} mA is far above its {imax} mA." / "{name} burned out: {n} mA is more than it can carry." / "{name} overheated and failed." / "{name} overheated and failed." / "{name} burned out: {w} W is too much for its track." |
| `fidelity.states.pin` | "Pin {pin} supplies {n} mA, above the {max} mA this board allows." |
| `fidelity.states.brownout` / `brownoutUnknown` | "The supply fell to {v} V, below the {min} V this chip needs, so it resets." / "The brown-out level of this board is not known, so no reset is simulated." |
| `fidelity.states.floating` / `noconv` | "{pin} is not connected to anything, so its reading is noise." / "The circuit did not settle. Last state: {net} at {v} V." |
| `instruments.dock.title` / `add` / `remove` / `empty` | "Instruments" / "Add instrument" / "Remove" / "No instruments yet" |
| `instruments.kind.multimeter` / `oscilloscope` / `logicAnalyser` / `serialPlotter` | "Multimeter" / "Oscilloscope" / "Logic analyser" / "Serial plotter" |
| `instruments.meter.red` / `black` / `loading` | "Red probe" / "Black probe" / "Meter loading (10 megohm)" |
| `instruments.meter.mode.dcVolts` / `dcAmps` / `resistance` / `continuity` | "DC volts" / "DC amps" / "Resistance, power off" / "Continuity" |
| `instruments.meter.notBuilt` | "{mode} is not modelled yet" |
| `instruments.scope.timeBase` / `trigger` / `cursor` / `table` / `export` | "Time base" / "Trigger" / "Cursor" / "Table view" / "Export CSV" |
| `instruments.cap` / `staircase` / `decoders` / `costModel` | "{kept} samples kept, {dropped} dropped" / "No waveform between events: shown as steps" / "Bus decoding is not modelled yet" / "Edge times follow the statement cost model" |
| `instruments.plotter.empty` / `window` / `clear` | "Print numbers on a line to plot them" / "Window" / "Clear" |
| `instruments.tolerance.label` / `nominal` / `seeded` | "Part tolerance" / "Nominal" / "Seeded spread" |
| `instruments.speed.label` / `max` / `behind` | "Speed" / "As fast as possible" / "Running at {x} times real time on this device." |
| `instruments.run.pause` / `resume` / `step` / `stepUnit` / `cycleNeedsFirmware` | "Pause" / "Resume" / "Step" / "Step by" / "needs firmware mode" |
| `run.runner` / `you` / `inSync` / `catchingUp` / `watching` / `private` | "Runner: {name}" / "You" / "In sync at {t} s" / "Catching up" / "Watching {name}'s run" / "Private run" |
| `run.detach` / `rejoin` / `moveRunner` / `pickRunner` | "Run my own copy" / "Rejoin the room's run" / "Ask {host} to move the runner to a faster device" / "Runner" |
| `run.halt.edited` / `logFull` / `server` / `runnerLost` | "The run stopped because the circuit was edited." / "The run stopped because its log is full." / "The run stopped because the server restarted." / "The runner left, so the run is paused." |
| `run.reason.diverged` / `engines` | "your copy and the runner's copy stopped matching" / "your engines differ from the runner's" |
| `fidelity.chip.aria` | "{layer}: {tier}. Open details" |
| `fidelity.panel.staleTag` | "stale" |
| `fidelity.notice.model` | "{model} is not modelled yet" |
| `fidelity.reading.noResult` | "no result" |
| `instruments.dock.targetMissing` / `viewerOnly` / `pickKind` / `pickPoint` | "target missing" / "Viewers cannot change instruments." / "Instrument type" / "Probe point" |
| `instruments.kind.voltmeter` / `ammeter` / `serialMonitor` | "Voltmeter" / "Ammeter" / "Serial monitor" |
| `instruments.meter.cond.ideal` / `powerOff` / `loaded` | "Ideal meter, no loading" / "Power off, junctions read as open at the test level" / "Meter loading 10 megohm" |
| `instruments.band.corners` / `monteCarlo` / `noTolerance` | "Range from part tolerance corners" / "Range from {n} random draws" / "{part} has no tolerance data and is used at its nominal value" |
| `instruments.scope.summary` / `rising` / `falling` / `level` / `pwm` / `delta` | "{n} edges, last at {t} ms" / "Rising edge" / "Falling edge" / "Level" / "{duty} percent duty, {hz} Hz" / "Delta: {dt} ms" |
| `instruments.channel` / `capSet` / `column.time` | "Channel {n}" / "Sample limit" / "Time" |
| `instruments.plotter.columnsIgnored` / `legend` / `latest` / `col` / `dropped` | "Only the first 8 columns are drawn. Further columns are ignored." / "Legend" / "Latest: {value}" / "col{n}" / "{n} rows dropped" |
| `instruments.tolerance.runActive` | "Stop the shared run to change part tolerance." |
| `instruments.speed.preset` | "{x}x" |
| `instruments.run.unit.ns` / `event` / `statement` / `line` / `cycle` | "ns" / "Event" / "Statement" / "Line" / "Cycle" |
| `instruments.run.notPaused` | "Pause the run first to step." |
| `run.badge` / `indicator` / `controlDenied` | "Runner" / "Shared run" / "You cannot control the shared run." |
| `run.state.idle` / `running` / `paused` / `halted` / `done` | "Not running" / "Running" / "Paused" / "Stopped" / "Finished" |
| `run.halt.error` | "The run stopped because of an error." |

Review of 2026-10-27 (issue 13). The rows from `fidelity.chip.aria` down were missing and are strings that other tasks render. `fidelity.tier.T2.tip` is removed: it was the same sentence as `fidelity.validation.oracle`, so the T2 tooltip uses `fidelity.validation.oracle` (one source of truth). "Remove" already exists as `instruments.dock.remove`. The `Running at ...` text is `instruments.speed.behind`; its preset labels are `instruments.speed.preset` and `instruments.speed.max`. The runner badge is `run.badge`. The accessible names of the pin lists are `instruments.meter.red`, `instruments.meter.black` and `instruments.dock.pickPoint`.

- Success metric. All keys present in six languages; no key unused (the lint of T-B4-21 covers parity; this task adds the test for the three new namespaces); banned-word scan of the English files finds none.

**Implementation**

- Existing code. `src/i18n/namespaces.ts`, `src/i18n/messages.test.ts` (parity), existing `studio.json` (T-B4-01).
- Algorithm. Add the three namespaces to `namespaces.ts`; write the six files each; translate with the same placeholders (`{n}`, `{pct}` kept verbatim). Validation: ICU-free `{name}` placeholders must match across languages (test). Errors: parity failure names the key. Edge cases: Hindi and Chinese plural-free phrasing; "megohm" kept as the unit word in each language.
- Permissions, performance, migration: none.
- Preflight. `test -e src/i18n/namespaces.ts src/i18n/messages/en/studio.json`.

**Verification and delivery**

- Unit tests (`b8-copy.test.ts`). Key parity across six; placeholder parity; banned words absent in English (the test holds the six words as a literal array on one line that starts `const BANNED_WORDS_B8 =`, because T-B8-03 runs in the same group; T-B8-22's `banned.test.ts` reads that line with `fs` and asserts the array equals `BANNED_WORDS`); every `t('...')` key literal and every `messageKey: '...'` found in the existing B8 files exists in the English files. The files scanned are `src/components/studio/{TierChips,SpeedControl,InstrumentDock,ModelsPanel,RunBar,StudioEntry}.tsx`, `src/components/studio/instruments/*.tsx`, `src/components/studio/room/{RunIndicator,RunnerPicker}.tsx`, `src/studio/room/run-state.ts`, `src/studio/run/plot.ts`, `src/sim/probe/*.ts` and `src/sim/analog/states.ts`; a file that does not exist yet is skipped, so the test covers more as tasks land. Keys built from a template literal are listed by prefix in a `DYNAMIC_PREFIXES` array in the test and each prefix must match at least one English key; no em dash in any file.
- Integration. `V src/i18n`. Acceptance. Given any of the six languages, When Studio opens, Then no key renders as its id.
- Observability: none. Release blockers: a missing key; a placeholder mismatch.
- Definition of done. Files and test.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/i18n`.
- Documentation. none. Rollback. `git revert`. Later tasks need. Every UI task of B8. Review of the five non-English texts by a reader is in section 12.

---

### T-B8-28 Seeded tolerance and bands

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-28 |
| Subsystem | Simulation, tolerance |
| Phase / group / priority | B8 / G6 / P1 |
| Dependencies | T-B8-06, T-B8-10 |
| Status | not started |
| Source files (3) | new `src/sim/analog/tolerance.ts`; edit `src/sim/analog/live.ts`, `src/sim/probe/tap.ts` |
| Test files | new `src/sim/analog/tolerance.test.ts` |

**Intent**

- Problem. A resistor labelled 10 k reads exactly 10 k in the model, and one number hides a real spread (F-043, R-FID-6). SIM 14.3 rule 2 shows a T1 LED current to two figures because the spread is about 9.6 to 13.9 mA for 12.2 mA nominal (ESTIMATED there).
- Story. As a maker I want to see the range a reading can take when parts are 5 percent parts.
- Expected behaviour (SIM 5.1 item 2). `toleranceMode` is `nominal` (default), `seeded` or `corners`, stored at `simulation.solver.options.toleranceMode` (fact 20). `seeded`: each part draws its value once at load from stream `tol:<partId>` (uniform within the band, or `normal3` truncated at the band). `corners`: solve the 2^k extreme combinations for at most k = 6 tolerance parts that sit in the reading's connected component and report the band; with more parts, 32 seeded Monte Carlo draws. A band attaches to `Reading.band` when the mode is not `nominal`. Bands are computed on demand when an instrument asks, never per tick, and cached by (document hash, seed, probe, last change time).
- Success metric. For C01 with 5 percent resistors, `corners` gives the exact extremes of the closed-form divider (2.3 to 2.6 V within 1e-9); `seeded` with one seed is identical across Node, Chromium and WebKit runs (class B on the drawn values); `nominal` readings are unchanged from T-B8-05a/05b.

**Implementation**

- Existing code. `LiveAnalog.whatIf` (T-B8-05a); streams from `src/sim/core/rng.ts` (T-B3-10); descriptor tolerance data: the part params carry `tol` (SIM 5.1: `{ nominal, tol?: { kind: 'pct' | 'abs'; value }, dist? }`); preflight: `grep -n "tol" src/parts/data/resistor.component.json` to read the field names the descriptors use.
- Modules and signatures.

```ts
export type ToleranceMode = 'nominal' | 'seeded' | 'corners';
export interface Tol { nominal: number; tol?: { kind: 'pct' | 'abs'; value: number }; dist?: 'uniform' | 'normal3' }
export function drawValue(t: Tol, next: () => number): number
export function seededParams(parts: Record<string, Tol>, seed: number, stream: (name: string) => () => number): Record<ElementId, Partial<Element>>
export function band(live: Pick<LiveAnalog, 'whatIf'>, pick: (r: SolveResult) => number, parts: Record<string, Tol>, seed: number): { band: [number, number]; method: 'corners' | 'monte-carlo'; draws: number }
```

- Algorithm. `drawValue` uses the part's stream; `normal3` samples a normal with sigma = band/3 by the Box-Muller form on the seeded stream, rejects outside the band (bounded loop of 8 then clamps). `band` collects tolerance parts in the reading's component; if k is at most 6 it solves 2^k corner combinations through `whatIf({ params })`; else 32 draws on streams `tol:mc:<i>:<partId>`. Result min and max of `pick`. At most 64 solves, on demand.
- State transitions, API: none. Validation. `tol.value` at least 0, `pct` at most 50. Errors: a non-converged corner is skipped and counted in `draws`; if all fail the band is `null`. Edge cases: a part with no tolerance data (nominal only, listed in `conditions` with key `instruments.band.noTolerance`); LED forward voltage spread is not modelled (registry says so); pot wiper position is a setting, not a tolerance.
- Permissions: none. Performance: up to 64 `whatIf` solves, each under the per-tick cost; on demand only. Migration: none.
- Preflight. `test -e src/sim/analog/live.ts src/sim/probe/tap.ts src/sim/core/rng.ts`.

**Verification**

- Unit tests (`tolerance.test.ts`). Corner extremes of C01 and the closed form; the 2^6 boundary and the Monte Carlo fallback at k = 7; stream independence (adding a part does not change other parts' draws); same seed same draws in two runs; `nominal` equals T-B8-05a results; non-converged corner handling.
- Integration. `V src/sim`. Playwright: T-B8-20 toggles the mode.
- Fixtures. `rs08-linear.json`. Acceptance. Given the divider with 5 percent resistors and mode `corners`, When the multimeter reads the midpoint, Then it shows a range and the nominal value inside it.
- Observability: `method` and `draws` appear in `conditions` (keys `instruments.band.corners` and `instruments.band.monteCarlo`). Release blockers. A band computed every tick.

**Delivery**

- Definition of done. Three files, tests.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/sim && npx tsc -p tsconfig.portable.json`.
- Documentation. none. Rollback. `git revert`. Later tasks need. T-B8-11 and T-B8-20; B9's Newton devices reuse `band`.

---

### T-B8-29 Mount the run client: wiring, run controls and the indicator

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-29 |
| Subsystem | Collaboration client, Studio wiring |
| Phase / group / priority | B8 / G9 / P0 |
| Dependencies | T-B8-14 (controls), T-B8-18 (`RunClient`), T-B8-20 (owns `StudioEntry.tsx` in G8), T-B8-26 (`RunIndicator`, `RunnerPicker`), T-B8-17b (server); T-B7 `RoomHandle` (`src/collab/join.ts`) |
| Status | not started |
| Source files (4) | new `src/collab/run-wiring.ts`; edit `src/studio/run/session.ts`, `src/components/studio/RunBar.tsx`, `src/components/studio/StudioEntry.tsx` |
| Test files | new `src/collab/run-wiring.test.ts`, `src/components/studio/RunBar.room.test.tsx` |

Added by the review of 2026-10-27 (issue 1). Before this task, T-B8-18 built `createRunClient` and T-B8-26 built `RunIndicator`, but no task created the client from the room transport, handed it to the run controls, or mounted the indicator, so the `data-testid="run-sync"` element that T-B8-19 reads would never exist.

**Intent**

- Problem. The room client (B7 `RoomClient`) and the sim host exist, and so do `RunClient`, `RunIndicator` and `RunnerPicker`. Nothing joins them. `RunBar` still calls the host directly, so in a room "Pause" would pause one browser and leave the others running.
- Target user. Buddies in a room.
- Story. As a buddy, when I press Pause in a shared room I want the run to pause for everyone, and I want to see who runs it and whether my copy matches.
- Expected behaviour. When a room is joined, a `RunClient` exists, built from the room's transport and the local `SimHost`. Pause, Resume, Step, Speed, Start and Stop go to `client.request(...)` while the member is mirroring or running, and to the host directly when there is no room or the member chose a private run. `RunIndicator` (with `data-testid="run-sync"`) and, for the host, `RunnerPicker` sit beside the run bar. Without a room none of this renders and the run bar behaves as before.
- Success metric. With a fake room and a fake host, every run control reaches `client.request` while joined and `host` while not; the indicator is present exactly while a room is joined; leaving the room removes the subscriptions.

**Implementation**

- Existing code. `RoomClient` (`src/collab/client.ts`): `send(frame: ClientFrame)` for ephemeral frames and `on(h)` whose events include `{ t: 'room', frame: ServerFrame }` (`welcome`, `run.*`) and `{ t: 'remote', envs }`; `RoomHandle { room, authority, client, leave() }` (`src/collab/join.ts`). The run bridge: the roadmap names `src/studio/run/session.ts`; B4 decision D4-3 (`B4-studio-uno.md:28`) puts it at `src/components/studio/wiring/simLink.ts` with a `RunStore` at `src/studio/stores/run.ts`. Preflight decides which exists; edit that file in place of `session.ts` and keep every other part of this task.
- Modules and signatures.

```ts
// src/collab/run-wiring.ts
export interface RunWiring { client: RunClient; store: ReturnType<typeof createRunStateStore>; dispose(): void }
export function attachRunClient(d: {
  room: Pick<RoomClient, 'send' | 'on'>;
  host: SimHost;
  self: Actor;
  versions: Record<string, string>;      // engine manifest versions, the same object the runner sends in `start`
}): RunWiring
```

  `attachRunClient` does four things. (1) `createRunClient({ send: f => room.send(f), host, self, versions, classifyOp })`. (2) `room.on(e => ...)`: for `e.t === 'room'`, a `welcome` frame calls `client.onWelcome({ run: f.run, log: [] })` (the server then streams the log as ordinary `run.ev` frames, so the log argument is empty), and every frame whose `t` starts with `run.` calls `client.onFrame(f)`; all other events are ignored. (3) `createRunStateStore(client)` from T-B8-26. (4) `dispose()` unsubscribes and sends nothing: a runner that leaves is the server's `runner.lost` case (T-B8-17b), not a client-side message.
- Run controls. `session.ts` gains `setRunTarget(w: RunWiring | null)`. Pause, Resume, Step, Speed, Start and Stop call `w.client.request(req, args)` when `w` is set and `w.client.state.status` is not `detached-own`; otherwise they call the host as T-B8-14 wrote them. `RunBar.tsx` reads `RunClientState`: a viewer or commenter, or a member without `runControl`, sees the controls disabled with the text of key `run.controlDenied`; `behindReal` of the runner shows the T-B8-14 text.
- Mount. `StudioEntry.tsx` (owned by T-B8-20 in G8, edited here in G9): when a `RoomHandle` exists it calls `attachRunClient` in an effect keyed by the handle, calls `setRunTarget`, renders `<RunIndicator />` beside the run bar and, when the member is host, `<RunnerPicker />`; on `handle.leave()` it calls `dispose` and `setRunTarget(null)`. `TierChips` and the instrument dock mounted by T-B8-20 stay where they are.
- Data model, input and output schemas, API contracts: none. State transitions: those of `RunClient`. Validation: none new.
- Edge cases. Joining a room that has no run (`welcome.run` null): indicator hidden, controls send `start`. Reconnect: `RoomClient` re-emits `welcome`; `onWelcome` is idempotent. A second `attachRunClient` for the same handle (hot reload): `dispose` first. The runner presses Pause: it goes through `request` like everyone's and the server applies it in order.
- Permissions. The server enforces; the UI only disables. Performance. One subscription; the store updates at most twice a second (T-B8-26). Migration. none.
- Preflight. `test -e src/collab/run.ts src/collab/join.ts src/components/studio/room/RunIndicator.tsx src/studio/room/run-state.ts src/components/studio/StudioEntry.tsx`; `ls src/studio/run/session.ts src/components/studio/wiring/simLink.ts` (use the one that exists); `grep -n "RoomHandle" src/collab/join.ts`.

**Verification**

- Unit tests. `run-wiring.test.ts` (fake `RoomClient` with a recording `send` and a manual `on`, fake `SimHost`): a `welcome` event reaches `onWelcome`; `run.ev`, `run.tick`, `run.check` events reach `onFrame`; a chat frame does not; `dispose` removes the listener (the fake counts zero); a request made through the client reaches `send` as a `run.req`. `RunBar.room.test.tsx`: with a wiring set, Pause calls `client.request('pause')` and not `host.pause`; with `detached-own` it calls the host; a viewer sees disabled controls with the reason text; without a wiring the bar behaves as in T-B8-14 (its existing test still passes); the indicator element with `data-testid="run-sync"` is present when joined and absent when not; axe has no serious violation.
- Integration. `V src/collab src/studio src/components/studio`. Playwright: T-B8-19 reads the attributes through this wiring.
- Fixtures. Inline. Acceptance. Given two browsers in a room, When one presses Pause, Then both show the paused state at the same `data-at`. Given I leave the room, Then the indicator disappears and Pause pauses only my copy.
- Observability. The attributes of `run-sync` (`data-at`, `data-hb`, `data-hd`). Release blockers. A run control that reaches the host while a room run is active; a subscription left after leaving.

**Delivery**

- Definition of done. Four files, two tests, `TL` clean.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/collab src/studio src/components/studio`.
- Documentation. none. Rollback. `git revert`; rooms edit as in B7 and the run bar controls the local host.
- Later tasks need. T-B8-19 (needs `run-sync` mounted).

---

### T-B8-30 Per-board pin electrical model

**Identity**

| Field | Value |
|---|---|
| Id | T-B8-30 |
| Subsystem | Interpreters, board profiles (`src/lib/interp/profiles.ts`) |
| Phase / group / priority | B8 / G1 / P0 |
| Dependencies | B8: none. Earlier phases: none |
| Status | not started |
| Source files (1) | `src/lib/interp/profiles.ts` |
| Test files | new `src/lib/interp/pin-model.test.ts` |

Split out of T-B8-01 by the review of 2026-10-27 (the old task was one file over the limit once diagnostic codes needed `interp.ts` and `python/runtime.ts`).

**Intent**

- Problem. The old solver uses one pin resistance, 25 ohm, for every board (`figures/engine/bench-solve.js:10`) and the profiles carry only `pinMaxMa` (`profiles.ts:89`, Uno 40, R4 8, Pico 12, micro:bit 5). There are no input thresholds, and the test for "is this a pin the board has" exists only inline in `libs.ts:188-194`.
- Target user. T-B8-05a (PIN elements), T-B8-01 (refusing `Pin(99)`), T-B8-06 (over-current limit).
- Story. As a maker I want the simulated pin of my board to push and fail the way that board's pin does, and I want an answer that says where the number came from.
- Expected behaviour. Each profile answers `pinElectrical(profile)` with output resistance, current limit, input threshold fractions and the source of the numbers. `isKnownPin(profile, n)` answers whether the board has pin `n`.
- Success metric. `pinElectrical` returns finite positive values on all 12 profiles; `maxAmps * 1000 === pinMaxMa`; `isKnownPin(p, 1000)` is false on all 12; every pin in `digitalPins`, `analogPins`, `leds` and `buttons` of each profile is known.

**Implementation**

- Existing code to change. `profiles.ts:89, 99-110` and the other eleven profile literals up to `:262`; `libs.ts:190` holds the predicate this task moves (the edit of `libs.ts` is T-B8-01's).
- New files. Test file only.
- Modules and signatures.

```ts
// profiles.ts
export type PinSource = 'avr-typical' | 'datasheet' | 'assumption-copied-from-avr';
export interface PinElectrical { rOutOhms: number; maxAmps: number; vilFrac: number; vihFrac: number; source: PinSource }
export function pinElectrical(p: BoardProfile): PinElectrical   // maxAmps = p.pinMaxMa / 1000: one source for the current limit
export function isKnownPin(p: BoardProfile, n: number): boolean // digitalPins + analogPins + leds + buttons, as libs.ts:190, plus the Pico channels 64 and 104 used at modules.ts:280, 340-354
```

- Data model. `BoardProfile` gains `pinOutOhms`, `pinOutSource: PinSource`, `vilFrac`, `vihFrac`. Values: the two AVR boards (`uno-r3`, `nano`) get `25`, `'avr-typical'`, `0.3`, `0.6`. The other ten get the same numbers with `'assumption-copied-from-avr'`. The 25 ohm comes from `bench-solve.js:10`, which cites no datasheet; the thresholds are the ATmega328P input levels (0.3 and 0.6 of the supply) and are EXTERNAL until T-B8-22 reads the datasheet into the registry entry. True values for the ten others are UNKNOWN and the source tag says so. Use two shared constants spread into the profile literals so the numbers appear once.
- Input and output schemas, API contracts, state transitions, permissions: none.
- Algorithm. `isKnownPin` builds a `Set<number>` per profile once (module-level `WeakMap`) and answers by lookup.
- Validation rules. Pin numbers are integers; a float, NaN or negative number is unknown.
- Edge cases. Pico W alias pins resolve before `isKnownPin` is asked (that is `pinNo`, T-B8-01). Pi 4 and 5 BCM numbers must stay known.
- Performance constraints. One `Set.has` per call. Migration. None.
- Preflight. `grep -n "pinMaxMa" src/lib/interp/profiles.ts` prints the 12 literals.

**Verification**

- Unit tests (`pin-model.test.ts`). For every profile in `PROFILES`: `isKnownPin(p, 1000) === false`, `pinElectrical(p)` finite and positive, `maxAmps * 1000 === p.pinMaxMa`, `vilFrac < vihFrac`; every listed pin is known. `uno-r3` and `nano` report `source 'avr-typical'`; the ten others `'assumption-copied-from-avr'`. Uno R4 reports a smaller `maxAmps` than Uno R3.
- Integration. `V src/lib/interp` (existing suites unchanged).
- Playwright. none. Fixtures. none.
- Acceptance. Given any of the 12 boards, When code asks `pinElectrical`, Then the answer names its source.
- Observability. none. Release blockers. `pinMaxMa` and `maxAmps` stored twice.

**Delivery**

- Definition of done. One file changed, test green, `TL` clean.
- Verify commands. `npm run typecheck && npm run lint && npx vitest run src/lib/interp`.
- Documentation. none. Rollback. `git revert`; `pinElectrical` is read only by T-B8-05a and T-B8-06, so revert those first if they landed.
- Later tasks need. T-B8-01 (`isKnownPin`), T-B8-05a (`PinDirectory` is built from `pinElectrical`), T-B8-06 (`maxAmps`).

---

## 10. Decisions this plan makes, and what Amar may overrule

None of these is accepted until Amar says so. Each has a default the agents follow, so no task waits.

| # | Question | Default used | Why | Where it bites |
|---|---|---|---|---|
| D-B8-1 | Engine tie-break inside one rank. `SIMULATION_ARCHITECTURE.md` 5.5 says "registration order, then engine id"; SA-08 says permuting registration changes no hash | Order by engine id only; registration order is ignored | It is the only reading under which SA-08 can pass; RT and ROB need the same order on every machine | T-B8-09. The fix to 5.5 is for a document fixer, not an agent here |
| D-B8-2 | Registry id shapes. 16.3 rule 6 says `@<major>` for every id; entry 1 is `engine:mna-dc-pwl@1.0.0` | RC-54: model ids end in `@<major>`, engine ids end in a full semver; two regexes | RC-54 is the arbiter | T-B8-03 |
| D-B8-3 | How a registry entry marks "approximate in this state". The type fixes `knownFailureCases` as `string[]` | Prefix convention `state:<DeviceState>:` plus `operatingRange` with `current_A` or `voltage_V` | No schema change; the registry stays one source | T-B8-10, T-B8-22. A typed field would be cleaner; adding it changes SIM 16.2 |
| D-B8-4 | Are `instrument.set` and `instrument.remove` sim-affecting in a room? `STUDIO_EDITOR.md:1024` lists them under "changes the run itself"; RT 13.4 does not list them as live-safe | Live-safe | ADR-0313 says probing must not change results; adding a scope should not halt everyone's run | T-B8-17a `classifyOp` |
| D-B8-5 | How the runner learns that a member needs frames. RT 13.6 sends frames only to members who asked; it does not say how the runner knows to make them | Server sends the runner `run.req {req: 'frames', args: {on}}` when the count of frame members changes between 0 and 1; `run.detach` modes are `frames`, `own` and `sync` (`sync` is new: Rejoin sends it so the member leaves the frame set) | Smallest addition that makes the fallback work | T-B8-17a, T-B8-17b, T-B8-18 |
| D-B8-6 | Where `toleranceMode` is stored. It is in `SimSettings` (SIM 5.2) but not in the project schema (fact 20) | `simulation.solver.options.toleranceMode`, set by `sim.set { key: 'solver', value: <the whole solver object> }` (`setToleranceOp`, T-B8-20) | Fits the open `options` object; no schema change; `sim.set` has no key `toleranceMode` (`PROJECT_DATA_MODEL.md:796`) | T-B8-28, T-B8-20 |
| D-B8-7 | Failure triggers. SIM 13.3 stores a trigger as a "safe expression"; `eval` and `new Function` are banned in `src/sim` | Thresholds are code constants keyed by failure-model id; the entry states the rule in text; an evaluator is B10 | No evaluator exists; do not write one in a fidelity phase | T-B8-06, T-B8-22 |
| D-B8-8 | Partial exits. SA-09 (bus timing) and SA-25 (the BRIEF 30 build) need B9 models | B8 records the halves it can pass and names the open halves | The roadmap's own B9 rows own them | T-B8-24 |
| D-B8-9 | Number of figures shown. SIM 14.3 gives 2 significant figures for a T1 LED current; no source gives T2 or T3 digits | T0 none, T1 two, T2 four, T3 exact for counters; PROPOSAL | One rule in `digitsFor` | T-B8-10 |
| D-B8-10 | Brown-out dwell and `behindReal` threshold (10 ms dwell, 0.95 of the requested speed over a 1 s window) | As stated | No source; both live in named constants | T-B8-06, T-B8-14 |
| D-B8-11 | R-FID-4 (reality gap panel) is listed in the roadmap scope for B8 but the PRD places it in the export phase (R-189, B20) | Not built in B8 | `PRODUCT_REQUIREMENTS.md:205` | none |
| D-B8-12 | How the live analog gets board pin numbers. `AnalogSolver.load(net, o: SolveOptions)` and `LoadReport` are binding and have no board data | A construction-time `PinDirectory` passed to `createLiveAnalog`; `load` keeps its two arguments and `SolveOptions` is untouched | `SolveOptions` is shared with the T2 Newton path; a per-board field there would be a change to a binding type | T-B8-05a. The doc fixer may prefer a `SolveOptions.pins` field |
| D-B8-13 | Who halts a room run on an edit | Only the server: it appends a stamped `run.ev` control `halt` right after the commit frames (`RoomCore.flush()` listener); the client does not re-derive it | One path, ordered after the commit by construction | T-B8-17b, T-B8-18 |
| D-B8-14 | Names added by B8 that SIMULATION_ARCHITECTURE does not list | `LiveAnalog.netVolts`, `pinVolts`, `componentResult`, `whatIf`, `PinDirectory`, `pinElementId`, `MODEL_TABLE`, `modelIdsOf` (T-B8-05a); `HonestState`, `HonestKind`, `StateTracker` and the event kind `honest-state` (T-B8-06); `classHashes` (T-B8-25); `KeyframeEntry`, `estimateWork` (T-B8-15); `inRange` (T-B8-03); `RunState` in `src/protocol` (T-B8-17a) | They are needed by tasks in this file; none replaces a binding name | Added to SIMULATION_ARCHITECTURE A.3 and 14 by the doc fixer |

## 11. Risks

| # | Risk | Likelihood and basis | Effect | What the plan does |
|---|---|---|---|---|
| R1 | Realistic device models fail more circuits than RS-08's 10 of 20 | Known: 10 of 20 fail at 2 percent (VERIFIED) | Readings are less close to real than a maker expects | B8 ships the linear plus piecewise path only; the six circuits over 10 percent get `approximation` provenance by registry data (T-B8-10, T-B8-22); Newton devices are B9 |
| R2 | Shared run diverges in WebKit | Physics hashes matched in V8 and JavaScriptCore on one machine (RS-13). Analog in B8 uses only `+ - * /` and square root in the `pwl` path (HYPOTHESIS: the T-B3-17 code uses no `exp` or `log`; the agent checks) | Mirrors drop to frames | `hd` (rounded) is the analog check; `hb` covers digital, MCU, serial; frame fallback is built (T-B8-18); T-B8-19 records the raw analog difference between Chromium and WebKit as information |
| R3 | Instruments cost frame time on a throttled device | Unmeasured | Slow Studio | Lazy loading, on-demand `whatIf`, ring buffers, frame-time check in T-B8-20, BUD-07 numbers from T-B8-08 |
| R4 | Tier labels read as promises | Council memo W8 | Trust loss | Banned-word tests on strings, registry and the page; chips show the lowest tier |
| R5 | The ADC formula change shifts lesson values | UNKNOWN | A lesson that passed now fails | Spike T-B8-21 decides before T-B8-05b |
| R6 | The per-pin noise stream changes floating-pin lesson output | UNKNOWN | A reference run changes | T-B8-06 runs `src/content/boards` and stops on any pass/fail change |
| R7 | T-B8-17b, T-B8-18 and T-B8-29 depend on exact B7 names and the transport type | B7 not built | Rework | Preflight rows; stop and report; no guessing |
| R8 | Class D hash straddles a rounding boundary | Low | A false `diverged` | Round at display precision (1 mV, 1 microamp), count a mismatch only when two consecutive checks differ, record rate in T-B8-19 (PROPOSAL; the REALTIME text compares once) |
| R9 | Largest circuit over 1 ms per tick at 4x | RS-08 measured 0.45 ms at 6x for the old solver | R-100 not met | T-B8-08 measures; fail means report to Amar, not widen the budget |
| R10 | Effort: roadmap says best 6, expected 9, adverse 14 weeks for B8 | ESTIMATED | 32 task ids now (28, plus 05b, 17b, 29, 30) in 11 groups | The added tasks are small except T-B8-26 and T-B8-28; if time runs short the LATER-able cuts are T-B8-28, T-B8-23, then the logic analyser half of T-B8-12 |

## 12. For Amar (work only a person can do; not an agent task)

| # | Item | Why an agent cannot | When |
|---|---|---|---|
| A-1 | Walk the shared run with a buddy: two real people on two machines, one presses the button, both see the same LED and serial lines; try the runner leaving and the detach and rejoin buttons | Needs a second person and a second device. T-B8-19 automates the same flow with three browser contexts on one machine, which is not the same thing | Before the OK |
| A-2 | Measure lag and the remote button delay over a real network (RT-2): runner on a laptop, mirrors on a phone and a Chromebook | Real devices and a real network. RB-9 numbers stay HYPOTHESIS until then | Before the OK, or record as open |
| A-3 | Check two simulated results on a real board with a multimeter: an LED with no resistor (current and whether it fails) and a stalled motor on USB power (does the board reset) | The "Checked on a real board" mark needs bench data with conditions; no agent can build or measure | After B8; until then no entry carries a `bench` record |
| A-4 | Read the five non-English copies of `fidelity`, `instruments`, `run` for tone and for words that read as promises | Needs fluent readers | Before the OK |
| A-5 | Confirm or change the budget numbers recorded by T-B8-08 and T-B8-20 (BUD-07 entry, 20 percent dock overhead, 0.95 behind-real threshold, 10 ms brown-out dwell) | A change of a gate threshold is Amar's decision (D-014) | At the stop |
| A-6 | Decide D-B8-1 to D-B8-11 above, at least D-B8-1, D-B8-3, D-B8-4 | They change another design document | At the stop |
| A-7 | Run the Firefox and x86-64 hash passes (DET-2): `npx playwright install firefox` and a second machine | No Firefox build is installed locally (`ls ~/Library/Caches/ms-playwright` shows chromium and webkit only) and there is one CPU architecture here | Before B16 and B19 rely on lockstep physics; not needed for B8 |
| A-8 | Screen-reader pass of the instrument dock and the table views (Q-13) | Needs a person with a screen reader | After B8 |
| A-9 | Read `datasheet` values into the Uno and ESP32 entries (ATmega328P input levels, 25 ohm pin figure, ESP32 brown-out level) so the `assumption` tags can be replaced | Datasheets are EXTERNAL and the plan does not fetch them | Any time; T-B8-22 labels them until then |
| A-10 | Say whether to merge `build/v1` into `main` | A push to `main` deploys production (HANDOFF.md) | Never by an agent |

## 13. Acceptance numbers and where each is proved

Each test title carries its id in brackets, for example `[SA-08]`, so `scripts/b8-evidence.mjs` (T-B8-24) can find it.

| Id | Statement (short) | Class | Task | Command | Note |
|---|---|---|---|---|---|
| SA-04 | Three constructed non-convergent circuits give `no-convergence` with the worst net; no silent exit over the corpus | n/a | T-B8-06 (live path; solver half is T-B3-17) | `npx vitest run src/sim/analog/states.test.ts` | |
| SA-06 | Ten runs, one seed: equal serial text and pin-trace hash, now with analog on the live path | B | T-B8-09 | `npx vitest run src/sim/determinism.test.ts` | |
| SA-07 | Largest catalogue circuit under 1 ms per tick at 4x; 150-node mixed circuit measured; sparse threshold written | n/a | T-B8-08 | `node scripts/sim-bench.mjs` | MEASURED on this machine only |
| SA-08 | Pin write and node voltage share a timestamp; permuting same-rank registration changes no hash | B | T-B8-09 | `npx vitest run src/sim/orchestrator.phase.test.ts src/sim/determinism.test.ts` | D-B8-1 |
| SA-09 | `SPI.transfer` with no device raises `bus-device-not-modelled`, prints no 0; 102 of 102 references pass | B | T-B8-01, T-B8-30 | `npx vitest run src/lib/interp src/content/boards` | Half: "bus timing is on" is T-B9-01 |
| SA-17 | Every part, engine and failure model in the 38 converted projects has an entry; asserted tier never above allowed; banned words absent | n/a | T-B8-03, T-B8-22, T-B8-04 | `npx vitest run src/sim/registry src/components/studio` | |
| SA-18 | Five recorded runs replay with equal checkpoint hashes in Chromium and WebKit; snapshot then restore equals continuing | B / N | T-B8-15, T-B8-16 | `npx vitest run src/sim/replay` and `npx playwright test e2e/replay.spec.ts` | Physics excluded until RA-08 |
| SA-19 | A requested speed above what the device achieves sets `behindReal` and the text; nothing else changes | B | T-B8-14 | `npx vitest run src/sim-host/speed.test.ts` | |
| SA-20 | Unmodelled part: "not modelled yet", no number, rest solves; chips per layer and the summary equal to the lowest | n/a | T-B8-05a, T-B8-10, T-B8-04, T-B8-20 | `npx vitest run src/sim src/components/studio` and `npx playwright test e2e/instruments.spec.ts` | |
| SA-25 | Include resolution clauses | B | T-B8-02 | `npx vitest run src/lib/interp/arduino/include.test.ts` | Clauses 1 to 8; clause 9 (BRIEF 30 build) is T-B9-04 |
| SA-03 (linear half) | C01 to C05, C18, C19 and 60 random networks within 1e-6 of ngspice | N | T-B8-05a | `npx vitest run src/sim/analog/live-linear.test.ts` | Roadmap names "SA-03 linear cases" for T-B8-05, now 05a |
| RA-14 | Runner and two mirrors, 50 presses, `hb` equal every 1,000 ms; `hd` equal with analog | B / D | T-B8-17a, T-B8-17b, T-B8-18, T-B8-29, T-B8-19 | `(cd server && node --test)`, `npx vitest run src/collab`, `npx playwright test e2e/run-lockstep.spec.ts` | Chromium and WebKit |
| RA-15 | Runner disconnect, new runner, late join, edit halt, detach and rejoin, engine mismatch | B | same | same | |

Requirement coverage: R-099 (T-B8-01, 30, 05a, 05b, 06, 10); R-100 (T-B8-05a, 05b, 07, 08); R-101 (T-B8-11, 20); R-107 (T-B8-14, 15, 16); R-108 (T-B8-12); R-112 (T-B8-13); R-114 (T-B8-03, 22, 04, 23); R-FID-1 (T-B8-04); R-FID-2 (descriptors already carry `simulation`; T-B8-03 reads it); R-FID-3 (T-B8-01, 02, 06, 12); R-FID-5 (T-B8-04, 27 and the interpreter banner string kept from B4); R-FID-4 not in B8 (D-B8-11). Feature coverage: F-042 (T-B8-05a, 05b, 06, 07), F-043 (T-B8-01, 02, 06, 28), F-047 (T-B8-05a, 05b, 09), F-051 (T-B8-14, 15, 16), F-053 (T-B8-11), F-054 (T-B8-12), F-185 (T-B8-03, 22, 23), F-207 (T-B8-13), F-011 (T-B8-04).

## 14. Running the phase (for the orchestrator)

1. Cut or confirm `build/v1`. Run the Preflight row of each task in the group before its agents start.
2. Run the groups in order (section 7). After each group run its gate commands, fix nothing silently, and commit one commit per task (`B8 T-B8-nn: <what>`, author Amar Kushwaha, no trailers).
3. After G1 read `SP-B8-01/REPORT.md`; pass its verdict to the T-B8-05b agent (G3).
4. After G11 run `npm run check` and `node scripts/b8-evidence.mjs --full`. Put the table of `B8-numbers.md` in the phase report. State the two partial rows (SA-09 half, SA-25 clause 9) in the first lines.
5. Stop. Amar walks A-1, answers A-5 and A-6, and says OK. Then, and only then, the orchestrator makes the local tag `phase-B8`. Nothing is pushed.

## 15. What later phases take from B8

| Later task | Needs from B8 |
|---|---|
| T-B9-01 to T-B9-04 (buses, BME280) | `DiagnosticCode` and `notModelled` (T-B8-01) to replace the unconditional SPI raise by a device lookup; `knownHeaders()` (T-B8-02); registry entries for buses marked `planned` (T-B8-22) |
| T-B9 avr8js, compile, debugger | `OrchestratorSnapshot` and keyframes (T-B8-15), `versions.avr8js` refusal rule (T-B8-16), run channel `versions` (T-B8-17b); the ADC formula decision (T-B8-21) |
| T-B9 Newton devices and transient | `LiveAnalog.whatIf`, `band` (T-B8-28), `operatingRange` data (T-B8-22), the bench script and `sparseThreshold` (T-B8-08) |
| B10 faults | `HonestState` and `Evidence` (T-B8-06), the reading provenance (T-B8-10), `classifyOp` run-input rule for `fault.set` (T-B8-17a), `library-not-modelled` and `bus-device-not-modelled` codes (T-B8-01, 02), instruments for hint step 2 (T-B8-11, 20) |
| B11 components | the coverage test of T-B8-22 and `docs/FIDELITY.md` generator (T-B8-23): every new part adds its entry |
| B12, B13 labs moved in | tier chips, registry-driven panel, instrument dock, snapshot and replay |
| B14, B15 AI partner | readings carry provenance; the partner may quote only `Reading` values with their tier |
| B16, B19 physics and flight | run channel `hd` rule (class D until RA-02 and SA-12 pass), `OrchestratorSnapshot` with keyframes (physics restore is keyframe replay) |
| B20 export | `docs/FIDELITY.md` and the registry for the reality gap panel (R-189) |

## Review fixes (2026-10-27)

This section lists what the review of 2026-10-27 changed. Every fix was checked against the files it names. Paths and contract names are the ones read in this step. Labels: VERIFIED, DOCUMENTED, UNKNOWN as in section 4.

### The 14 issues

| # | Issue | Applied | Where and how |
|---|---|---|---|
| 1 | Nothing wires the run client into the app; server side never says which file calls the channel | Yes, with one change of file names | New T-B8-29 (G9, 4 source files) owns `src/collab/run-wiring.ts`, `session.ts`, `RunBar.tsx`, `StudioEntry.tsx`. T-B8-20 keeps `StudioEntry.tsx` in G8 and T-B8-29 edits it in G9. T-B8-19 now depends on T-B8-29 and moved to G10; T-B8-24 is G11. The review text named `ws/server.ts`, but in the B7 layout that file only upgrades the socket (fact 31). The files that must change are `server/src/ws/dispatch.ts` (message loop, join, leave) and `server/src/rooms/core.ts` (a post-commit listener). T-B8-17 was split: T-B8-17a (types, frames, validators, `classifyOp`; 3 files) and T-B8-17b (`run-channel.ts`, new `run-hub.ts`, `core.ts`, `dispatch.ts`; 4 files). B4 decision D4-3 may put the run bridge in `components/studio/wiring/simLink.ts` instead of `session.ts`; T-B8-29 says to edit whichever exists (fact 34) |
| 2 | T-B8-05 oversized | Yes | T-B8-05a: `live.ts` only, with a table of all 29 catalogue part files to element kind and model id. T-B8-05b: `orchestrator.ts`, `pins.ts`, `world.ts`, `bind.ts`, the ADC change, test `orchestrator.analog.test.ts`. 05a is G2, 05b is G3. T-B8-06 and T-B8-09 depend on 05b and moved to G4 (they edit `world.ts` and `orchestrator.ts`, which 05b owns in G3); T-B8-14 depends on 05b and is G4. T-B8-07 depends on 05a and, new, on T-B8-06 (see extra finding E-1) and is G5. Because of these moves T-B8-08, 10, 15 are G5; T-B8-16, 25, 28 are G6; T-B8-11, 12, 18 are G7; T-B8-20, 23, 26 are G8 |
| 3 | Names diverge from the architecture | Yes, with one variation | `LiveAnalog extends AnalogSolver` with `load(net, o: SolveOptions): LoadReport`, `apply(changes: Change[])`, `advanceTo(t): AnalogStepResult`, `snapshot`, `restore`. `setPin` and `setPwm` are `apply([{ kind: 'pin', element, level }, { kind: 'pwm', element, duty, hz }])`. `LoadReport` keeps `ok, components, nodes, elements, unmodelled, diagnostics, modelIds`. `AnalogStepResult` keeps its seven fields; digital threshold crossings are `SimEvent`s of kind `net-threshold` and honest states are `SimEvent`s of kind `honest-state` in `events`. Variation: the review offered `SolveOptions` or the netlist PIN elements for board pin data. `SolveOptions` is shared with the T2 path and the netlist builders are B2 and B3 files, so the data comes in at construction through `PinDirectory` (D-B8-12). `load` keeps its two arguments. T-B8-06 `StateTracker.step` takes `SolveResult[]` because `AnalogStepResult` has no per-element data |
| 4 | Frame fallback contradiction | Yes, with one refinement | T-B8-17a adds `frames` to the server-to-runner `RunReq.req` enum only. A member's `run.req` stays at eight values and `frames` from a member is `bad_run_frame`; otherwise any member could switch the runner's frame production. T-B8-17b adds the `run.detach` branch with a `framers` set and sends `run.req frames {on}` to the runner on 0 to 1 and 1 to 0, on a runner change, and on leave, with a unit test in `run-channel.test.js` and a hostile test. New mode `sync` (sent by Rejoin) removes a member from the set (D-B8-5) |
| 5 | T-B8-03 needs the T-B8-27 file | Yes | `loadRegistry(raw?, o?: { knownKeys? })`: keys are checked only when given. `registry.test.ts` no longer reads `en/fidelity.json`. T-B8-22 (G2) depends on T-B8-27 and its `coverage.test.ts` reads the English file and passes the key set. Seed entries use `fidelity.tier.<tier>` and `fidelity.summary`, both in T-B8-27 |
| 6 | copy-check grep test | Yes | Deleted from T-B8-03. `banned.test.ts` (T-B8-22) asserts `BANNED_WORDS` equals the one-line literal `const BANNED_WORDS_B8 =` in `src/i18n/b8-copy.test.ts`, read as text. `scripts/copy-check.mjs` does not exist and its list overlaps only on `validated` (fact 29). No edit of T-B1-20 territory |
| 7 | T-B8-22 scans `states.ts` from an earlier group | Yes | The coverage test uses the six failure ids as literals. T-B8-06 depends on T-B8-22 and tests that `FAILURE_IDS` equals the literals and resolves in the registry |
| 8 | C10 LED reading contradiction | Yes | T-B8-06 acceptance and evidence now say approximation, Teaching model, outside the range this model was checked over; `states.test.ts` asserts provenance `approximation` for C10. T-B8-06 and T-B8-10 share `inRange` from T-B8-03 so the rule is written once |
| 9 | T-B8-10 fixtures missing | Yes, and wider | New fixture `src/sim/probe/fixtures/rs08-provenance.json` for 14 circuits (C01 to C05, C18, C19 computed; C08, C10, C13, C14, C15, C16, C20 approximation), with a drift test against `results.json`. The review's list of six omitted C10, which T-B8-11 already expects to be `approximation`. T-B8-10 depends on T-B8-22. See E-2 for a problem the fixture exposed |
| 10 | T-B8-23 prints the banned words | Yes, first option | The page links to `src/sim/registry/tiers.ts` and never prints the words; a test checks the link |
| 11 | T-B8-15 restore ambiguity | Yes | Interpreter `data` is a cut point only; restore replays interpreters from t = 0 and restores analog directly; keyframes keep analog state and per-interpreter statement counts for `estimateWork`. The architecture's `EngineSnapshot` and `OrchestratorSnapshot` are imported, not redefined (the architecture field is `stateHash`, not `hash`). New names are `InterpSnapshotData`, `KeyframeEntry`, `estimateWork` |
| 12 | T-B8-20 wrong op shape | Yes | `setToleranceOp(doc, mode)` builds `sim.set { key: 'solver', value: { ...solver, options: { ...options, toleranceMode } } }`. The control is disabled during a room run (`classifyOp` says `sim.set` is sim-affecting). The AI never proposes it (`AI_ARCHITECTURE.md:517`) |
| 13 | T-B8-27 key table incomplete | Yes | About 45 keys added, `fidelity.tier.T2.tip` deleted, and `b8-copy.test.ts` scans existing B8 files for `t('...')` and `messageKey` literals. "Remove" already existed as `instruments.dock.remove` |
| 14 | `Serial1` not decomposed | Yes, and the task is now two | New LIBS entry `HardwareSerial1` (print, println, write, printf raise `bus-device-not-modelled`; begin and end no-ops; available 0; read -1; reads do not touch the monitor input) and `GLOBAL_OBJECTS.Serial1.cls = 'HardwareSerial1'`; a test that `Serial.println` on an ESP32 still reaches the monitor. The review said the class is at `libs.ts:1409`; it is mapped there and defined at `libs.ts:682`. The per-board pin model moved to new T-B8-30 (G1) to keep T-B8-01 at five files (see E-3) |

### Extra findings made while fixing

| # | Finding | What was done |
|---|---|---|
| E-1 | T-B8-07's prose guard builds the C10 message through `createStateTracker`, which T-B8-06 creates, but T-B8-07 did not depend on T-B8-06 (same defect as issue 7) | T-B8-07 now depends on T-B8-06 and is G5 |
| E-2 | RS-08 reports Q1 as `on` in C15 and C16 and `hot` in C20, never `sat` (fact 30). The registry rule `state:sat:` for the NPN would fire in none of the three circuits, so they would read `computed` | NPN entry lists `state:on:`, `state:hot:`, `state:sat:` (T-B8-22, T-B8-10) |
| E-3 | A library-method error with no position gets no line, and both re-wrap sites would drop a `code`; `machine.SPI` and `machine.UART` do not exist (fact 28). The old T-B8-01 test "line of the call" could not pass in four files | T-B8-01 now edits `errors.ts`, `libs.ts`, `interp.ts`, `python/runtime.ts`, `python/modules.ts` (5); the pin model is T-B8-30 |
| E-4 | The component descriptor has no model-id field (fact 35), so T-B8-03's `projectFidelity` had no source for model ids | `projectFidelity` takes a `modelsOf` function; T-B8-05a exports `MODEL_TABLE` and `modelIdsOf`; T-B8-04 passes it |
| E-5 | `RunState` was defined in a server file but imported by the client | Moved to `src/protocol/run-ops.ts` (T-B8-17a) |
| E-6 | After a server restart no frame can announce `server-restarted`, because run state is in memory | The client derives it from a reconnect with `welcome.run` null while it held a run (T-B8-18) |

### For the document fixer (names B8 adds that no architecture file lists)

Add to `SIMULATION_ARCHITECTURE.md` A.3 or 14: `LiveAnalog` extras (`netVolts`, `pinVolts`, `componentResult`, `whatIf`), `PinDirectory`, `HonestState` / `HonestKind` / `StateTracker` and the `SimEvent` kinds `net-threshold` and `honest-state`, `classHashes`, `KeyframeEntry`, `estimateWork`. Add to the registry section: `inRange`. Add to `REALTIME_ARCHITECTURE.md` 13.6: the server-to-runner `run.req frames` and the `run.detach` mode `sync`. The tie-break in 5.5 (D-B8-1) is unchanged by this review.

### Task list after the review

32 task ids: T-B8-01, 02, 03, 04, 05a, 05b, 06 to 16, 17a, 17b, 18 to 30. Groups: G1 03, 17a, 21, 27, 30. G2 01, 05a, 13, 17b, 22. G3 02, 04, 05b. G4 06, 09, 14. G5 07, 08, 10, 15. G6 16, 25, 28. G7 11, 12, 18. G8 20, 23, 26. G9 29. G10 19. G11 24.
