# B19 Drone creation, rigid-body flight and traces: atomic task packages

Written 2026-10-27 for the build plan step. Plan only: no file under `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed to write it, and nothing was committed.
Phase goal: fly your own build on a 6-DoF multirotor model with sensors, an estimator, a cascaded PID and a mixer; add wind and failures; record traces, compare two flights and find the first difference; run the PX4 SIH comparison (RS-14) and label the model by its result; take the parameters out as a dump.
Scope: F-218, F-071, F-072, F-156; R-180, R-193, R-194; DRONE slices D3 to D7. Also delivered because the slices need them: F-217 (traces and comparison, R-175), F-074a (rigid model, DRONE Objection 1), R-176 (environment and failures), R-177 (RS-14 label rule). Not in it: the SITL bridge (D8, DA-25), an EKF, flexible frames, blade flapping, ground effect (all listed "not modelled yet").
Exit: `npm run check`; DA-06 to DA-10, DA-12, DA-13, DA-18, DA-19, DA-21 to DA-23, DA-26 and SA-12 recorded; Amar flies his build twice and compares. Then Amar's OK.
Depends on phase B18 (parts, propulsion, builder, `calcFromBuild`). Through the roadmap chain it also needs B3 (clock, RNG, hashing, SimWorker), B9 (`dmath`), B8 (fidelity registry) and B13 (the 13 craft as projects, flight range kept).
Labels: VERIFIED (read in code or a file, or run, in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.

## 1. What this phase starts from

No task file exists for B12 to B14 or B16 to B18 (`ls docs/MASTER_PLAN/05_ENGINEERING/tasks/` shows B0 to B11 and B15). Every file from B18 below is taken from `IMPLEMENTATION_ROADMAP.md` lines 1056 to 1068 (DOCUMENTED), not from code. Each task starts with a precondition check (section 4) so an agent stops and reports when a file is not where this plan says.

| Fact | Evidence | Label |
|---|---|---|
| `src/sim`, `src/project`, `src/export`, `src/parts` do not exist today; earlier phases create them | `ls src/sim src/project src/export` fails | VERIFIED |
| Flight step is fixed at 10 ms | `src/lib/flight/sim.ts:20` `STEP = 0.01` | VERIFIED |
| The craft model is a point mass. `multirotorStep` (`sim.ts:501`) sets roll and pitch by a first-order lag toward the stick target (`sim.ts:527-532`), thrust is `f * tmax * kV * fade` (`sim.ts:606`), velocity and position are semi-implicit Euler (`sim.ts:630-631`) | read | VERIFIED |
| Autopilot output is a `Command {pitch, roll, yawRate, climb}` computed from truth state: `const auto = live ? autopilot(s) : {...}` at `sim.ts:509`; `autopilot` is at `sim.ts:345` and is not exported | read | VERIFIED |
| Faults are fixed rotation rates: 400 deg/s at `sim.ts:518`, 900 and 500 at `sim.ts:573-574`, 900 at `sim.ts:583`, 260 at `sim.ts:598` | read | VERIFIED |
| The session is a store over `SimState`; `FlightRange` reads `session.sim` fields directly (`FlightRange.tsx:340, 363, 399, 508`) and builds the session at `FlightRange.tsx:158` | read | VERIFIED |
| The action log is `{step, action}` at 100 Hz (`session.ts:48`, `sim.ts:1008-1028` `replay`) | read | VERIFIED |
| Ghosts are keyed by craft and course only: `iynk:ghost:v1:${craft}:${course}` (`ghost.ts:111`); B18 T-B18-11 is to key them by model | read; DOCUMENTED | VERIFIED / DOCUMENTED |
| Medals: `parOf` (`registry.ts:277`, gold 0.85 and bronze 1.4 times silver) and `medalFor` (`registry.ts:286`) | read | VERIFIED |
| Game attitude convention: yaw from +x CCW, pitch nose down positive, roll left bank positive, in degrees; `bodyAxes` returns `fwd`, `left`, `up` in world axes | `src/lib/flight/math.ts:22-33` | VERIFIED |
| The CLI emulator returns `effects: CliPatch[]` from canned `emu.effects` rows (`cli.ts:36`, `effectsFor` at `cli.ts:249-251`, applied at `save` `cli.ts:492-496` and `defaults` `cli.ts:502-507`). The only consumer is `src/lib/dronelab/store.ts:193` (deleted by T-B13-11) | read | VERIFIED |
| quad5's emulator table has `roll_rc_rate`, `roll_srate`, `roll_expo`, `angle_limit`, `angle_p_gain`, `failsafe_delay`, `failsafe_procedure` and **no** `p_roll`, `i_roll`, `d_roll`, `gyro_lpf_hz` | `src/content/drones/quad5.ts:421-455` | VERIFIED |
| `parseValue` limits: min, max, `values` lookup (`cli.ts:221-241`) | read | VERIFIED |
| `FcParams` has groups `rates`, `pid`, `filters`, `mixer`, `angle`, `failsafe`, `modes`; `DroneEnvironment` has `sensorFailures` up to 32 and `wind.discrete` up to 32; both are typed by the drone domain schema | `schemas/drone.domain.schema.json` `$defs.FcParams`, `$defs.DroneEnvironment` | VERIFIED |
| The drone example already carries `flight.model "multirotor-rigid@1"`, `step_hz 1000`, `pid_hz 1000`, four motor slots and `fcParams` (P 45, I 80, D 30, FF 120 on roll) | `schemas/examples/drone-quad.project.json` | VERIFIED |
| Project asset roles are `image, model, binary, datasheet, replay, other`; there is no `trace` role | `project.schema.json` `$defs.Asset.role` | VERIFIED |
| Fault kinds `param`, `mount`, `sensor`, `swap-phase` exist in the schema | `project.schema.json` `$defs.Fault.kind` | VERIFIED |
| Op `domain.patch {domain, patch}` (RFC 7396) is the only op drone editors use | `PROJECT_DATA_MODEL.md` 7.2 line 765 | DOCUMENTED |
| `dmath` (`sin, cos, atan2, exp, log, pow`) arrives in B9 at `src/sim/core/dmath.ts`; flight adopts it in B19 | B9 T-B9-20 | DOCUMENTED |
| Class N means within `1e-9` relative plus `1e-12`; rooms compare physics and flight as class D until SA-12 passes | ADR-0303; RC-53 | DOCUMENTED |
| `RS-14` has no folder and no report; no `px4`, `px4_sitl` or `cmake` is on this machine | `ls 08_RESEARCH_SPIKES`; `which px4 cmake` | VERIFIED |
| Prototype `quad.mjs` (0.65 kg, arm 79.5 mm, 12 N per motor, lag 30 ms): hover command 0.3645; roll rate step 10 to 90 percent rise 85 ms, overshoot 26 percent with untuned gains; RK4 at 1 kHz within 1.5e-12 rad/s of a 10 kHz reference; 1.92 microseconds a step | `DRONE_ARCHITECTURE.md` section 0; `/Users/amar/iynk-master-plan-scratch/design/robotics-drone/quad.mjs` | VERIFIED as a prototype (author-run) |
| In that prototype, yaw reaction torque is `tz += -Q[i]` with `s = +1` for CCW. DRONE 7.1 writes `+ sum s_i Q_i e_z`. Physics and the prototype agree; the DRONE sign is wrong | `quad.mjs` line 14 against `DRONE_ARCHITECTURE.md` 7.1 | VERIFIED (read) |
| Next.js is 16.4.3. This phase needs only client components through `next/dynamic` with `ssr: false` (`01-app/02-guides/lazy-loading.md` lines 39 and 66) and a Worker created as `new Worker(new URL('./x.worker.ts', import.meta.url), { type: 'module' })` (precedent `src/lib/interp/check-client.ts:38`; the guide names `new Worker()` at line 177). No route handler, no `proxy.ts`, no Server Action | `AGENTS.md`; guide read | VERIFIED |
| Six UI languages (`en, de, es, fr, hi, zh`); namespaces are listed twice in `src/i18n/namespaces.ts` (array at line 4, `Messages` type below it) | `ls src/i18n/messages/en`; file read | VERIFIED |
| Vitest includes `src/**/*.test.{ts,tsx}`, `scripts/**/*.test.*` (jsdom); Playwright `testDir: "e2e"`, random port 40000 to 49999 | `vitest.config.mts:12`; `playwright.config.ts:5` | VERIFIED |

## 2. Decisions this plan makes, and the questions it leaves

Where two design documents disagree, `RECONCILIATION.md` decides, then the schemas. Defaults below let agents proceed; Amar can overrule at the phase stop.

| # | Question | Sources | Default in this plan | Label |
|---|---|---|---|---|
| Q1 | How does the rigid model fly inside the existing range (laps, gates, checkpoints, events, ghosts, crash replay, touch sticks, gamepad) without rewriting the 1,028-line `sim.ts`? `FlightRange` reads `session.sim` (`SimState`) in four places | `FlightRange.tsx:340-508`; ADR-0309 | Keep `SimState` as the course and event layer. The rigid model is a **dynamics driver** that replaces only the body of `multirotorStep` (`sim.ts:501-632`) when `s.rigid` is set. `FlightModel` (SIMULATION 11.2) is still defined in `src/sim/flight/model.ts` and used headless by bench flights, traces and RS-14. One physics, two hosts | HYPOTHESIS (a test in T-B19-18 proves 96 flight tests and 342 golden rows stay green) |
| Q2 | Rate of stick input. DRONE 11.1 maps the rigid log at `step * (1e9 / step_hz)` ns. The range reads sticks once per animation frame and logs on 10 ms game steps | DRONE 11.1; `session.ts:48` | In the range the rigid driver runs `step_hz / 100` sub-steps per 10 ms game step with sticks held. Actions are logged on game steps, so `at = step * 10_000_000` ns, a multiple of every allowed rigid step. Headless runs (bench set, RS-14) use `InputEntry` at the rigid step | DOCUMENTED deviation, stated in `docs/DRONES.md` |
| Q3 | Yaw reaction torque sign | DRONE 7.1 against `quad.mjs` line 14 | Physics wins: a CCW rotor pushes the body clockwise. T-B19-06 fixes it by a test (`reaction torque of CCW rotors is negative about +z`). Record the DRONE 7.1 error in the commit body so the doc is fixed | VERIFIED |
| Q4 | Trace storage. DRONE 5.2 and 11.2 say traces go to `assets` with role `trace`. The schema role enum has no `trace`, and traces are outside the state hash | `project.schema.json`; DRONE 11.2 | Bytes go to the IndexedDB `assets` store by sha256 (B3), **not** into `doc.assets`, so the document and its hash are untouched. The list of the last 8 traces per project is a per-viewer convenience in `localStorage` key `iynk:traces:v1:<projectId>` (try/catch). If B3's store API cannot take these bytes, the shelf keeps them in memory for the session and says so | ASSUMED; Amar may prefer a schema minor adding role `trace` |
| Q5 | PID gain units. DRONE 5.4 says iynk units, not Betaflight's scale factors (council Q13, GPL) | DRONE 5.4; ADR-0713 | `GAIN_SCALE` constants in `params.ts` start from an analytic loop-bandwidth derivation in T-B19-09 and are tuned in T-B19-15, where the closed loop first exists, until the quad5 template meets the step targets below. They are never copied from firmware source. Targets: roll rate step of 100 deg/s, rise 10 to 90 percent under 80 ms, overshoot under 20 percent, settling to 2 percent under 400 ms on the prototype craft (HYPOTHESIS, a design target and not a measured fact) | HYPOTHESIS |
| Q6 | Where is `FlightModel`, `EnvironmentState`, `InputEntry`? SIMULATION 11.2 and 12.1 give the types; earlier task files give `InputEntry`, `SimTime`, `Rng`, `StateHasher` | SIMULATION 6.7, 11.2, 12.1; B3 `src/sim/core` | Import from the B3 modules. `FlightModel` is created in `src/sim/flight/model.ts` here, because B18 T-B18-02 did not create it. If `EnvironmentState` has no home yet, T-B19-07 adds `src/sim/env.ts` exactly as SIMULATION 12.1 | DOCUMENTED |
| Q7 | Math functions. `Math.sin, cos, atan2, exp` differ in the last bit across engines (A12). `Math.hypot` and `Math.pow` are also not specified to the bit | ADR-0303 | All flight code calls a facade `src/sim/flight/fmath.ts`. Until T-B19-28 it forwards to `Math` (class N). T-B19-28 switches the facade to `dmath` in one file. A test bans `Math.sin|cos|tan|asin|acos|atan|atan2|exp|log|log2|log10|pow|hypot|cbrt|sinh|cosh|tanh` and `**` with a non-integer exponent in the B19 files of `src/sim/flight` (the list in T-B19-01) outside `fmath.ts`. B18's files in that folder are out of scope | DOCUMENTED |
| Q8 | `Rng.gauss()` from B3 may use `Math.log` and `Math.cos` | `src/sim/core/rng.ts` (B3-10) | Flight draws Gaussians with `fmath.gauss(rng)` (Box-Muller over `rng.float()`, two draws per sample) so it follows `dmath`. Flight never calls `Rng.gauss` | HYPOTHESIS |
| Q9 | Sensor defaults have no source (DK-7) | DRONE 9.1 | Defaults are written as data with `source: 'iynk assumption'` and shown on the screen. Gyro 0.005 deg/s/sqrt(Hz), accelerometer 400 micro-g/sqrt(Hz) (EXTERNAL, recalled from MPU-6050 datasheet class, not re-fetched), baro 0.1 m, GPS 0.5 m horizontal and 1.0 m vertical at 10 Hz with 100 ms latency. A datasheet citation replaces a default when the library has one | HYPOTHESIS |
| Q10 | The rigid model on the 13 legacy crafts. DRONE ADR-0710: one thrust source per craft | DRONE Objection 3 | `rigidParamsFromCalc` lets a `legacy-calc` craft fly rigid with `kT` from the calculator (DA-06 second clause). Default model for the 13 stays `flight-game@1` | DOCUMENTED |
| Q11 | RS-14 needs PX4 SIH, which is not installed, and a C++ toolchain | `which px4 cmake` | T-B19-05 builds PX4 SIH under a time box of 1 working day. If it cannot, its report says `NOT RUN` with the exact failing command, T-B19-21 reports `NOT RUN`, and the label stays "Rigid-body teaching model, not checked against flight-controller firmware". Amar may run it himself (section 9, item 3) | ASSUMED |
| Q12 | Roadmap B19 lists 14 tasks. The 5-file rule and the F-071, F-072, F-156, R-193, R-194 scope need more | roadmap lines 1099 to 1112 | 31 tasks here (section 3 maps each to its roadmap row). Effort stays 13 / 16 / 22 weeks (DRONE section 16: D3 to D7 is 13 to 18 weeks) | ESTIMATED |
| Q13 | The roadmap scope line omits F-217 though R-175 and DRONE D4 need it | roadmap line 1075 | F-217 is built here. The orchestrator adds it to the scope line when Amar accepts this file | DOCUMENTED |
| Q14 | Where trace and compare results are kept in the project. DRONE 8.2 writes bench results to `tests` | DRONE 8.2 | Bench-flight results are not stored in the document in B19. They are recomputed on demand and shown with the document hash they ran against. Storing them in `tests` is a later change | ASSUMED |

## 3. Task index

Group = parallel group (section 5). Priority P0 blocks the exit gate; P1 is in the gate but another task can proceed without it; P2 can be cut at the stop. Size is ESTIMATED focused agent time: S under 2 h, M 2 to 5 h, L over 5 h.

| ID | Task | Group | Pri | Size | Depends on (this phase) | Roadmap row |
|---|---|---|---|---|---|---|
| T-B19-01 | Math facade, vectors and quaternions, rigid types, mass properties | 1 | P0 | L | none | 01 (part) |
| T-B19-02 | Input log: `InputEntry` mapping and legacy log conversion | 1 | P0 | M | none | new (DA-07) |
| T-B19-03 | Trace format, metrics, first-difference marker | 1 | P0 | L | none | 06, 07 (diff half) |
| T-B19-04 | i18n scaffold: four namespaces | 1 | P0 | S | none | new |
| T-B19-05 | Spike RS-14a: PX4 SIH reference step responses | 1 | P1 | L | none | 10 (part) |
| T-B19-06 | Rotor ODE with motor and ESC electrics | 2 | P0 | L | 01 | 01 (part) |
| T-B19-07 | Drag, wind, gusts, environment mapping | 2 | P0 | M | 01 | 02, 09 (env half) |
| T-B19-08 | Sensors with noise, bias and failure modes | 2 | P0 | M | 01 | 03 (part) |
| T-B19-09 | Flight controller parameters and mixer | 2 | P0 | L | 01 | 04 (part) |
| T-B19-10 | Rigid-body integrator (RK4 and Euler) | 3 | P0 | L | 01, 06, 07 | 01 (part) |
| T-B19-11 | Complementary estimator | 3 | P0 | M | 01, 08 | 03 (part) |
| T-B19-12 | Cascaded PID controller and altitude loop | 3 | P0 | L | 01, 09 | 04 (part) |
| T-B19-13 | Rigid parameters from a project or a calculator result | 3 | P0 | L | 01, 06 | new |
| T-B19-14 | CLI parameter bindings | 3 | P0 | M | 09 | 05 |
| T-B19-15 | `multirotor-rigid@1` model: step order, battery, replay record | 4 | P0 | L | 02, 03, 06 to 13 | new (DA-06, 07, 22) |
| T-B19-16 | Export: parameter dump and wiring sheet | 4 | P1 | M | 09, 14 | 12 |
| T-B19-17 | Failures, ESC desync, brown-out and failsafe | 5 | P0 | L | 15 | 09 |
| T-B19-18 | Rigid driver inside the flight session | 6 | P0 | L | 15, 17 | new (Q1) |
| T-B19-19 | Bench-flight set, envelope and the analysis worker | 5 | P0 | L | 03, 15 | 08 |
| T-B19-20 | Fidelity entries, notices on flight outputs, banned-word gate | 5 | P1 | M | 15, 04 | new |
| T-B19-21 | Spike RS-14b: compare with PX4 SIH, verdict, label | 6 | P1 | L | 03, 05, 15, 20 | 10 |
| T-B19-22 | Parameter bindings panel and model picker | 7 | P0 | M | 04, 09, 14, 16, 18, 20 | 13 (part) |
| T-B19-23 | Trace view with table alternative and trace shelf | 6 | P0 | L | 03, 04, 15, 20 | 13 (part) |
| T-B19-24 | Compare view | 6 | P0 | M | 03, 04, 19, 20 | 07 (UI half) |
| T-B19-25 | Envelope view and bench-flight panel | 6 | P1 | M | 04, 19, 20 | 13 (part) |
| T-B19-26 | Optimiser check on the rigid model | 6 | P2 | M | 19 | new (F-156) |
| T-B19-27 | Flight range wiring: model, ghosts by model, medals, touch and gamepad | 8 | P0 | L | 18, 22 | new (F-071, F-072, R-193, R-194) |
| T-B19-28 | `dmath` in flight and the SA-12 hash check | 7 | P0 | L | 15, 17, 18, 19 | 11 |
| T-B19-31 | Mount the views in the Studio drone workspace | 9 | P0 | L | 18, 19, 22 to 27 | new |
| T-B19-29 | End to end: fly your build twice and compare | 10 | P0 | L | 01 to 28, 31 | 14 |
| T-B19-30 | `docs/DRONES.md` extension and phase record | 11 | P1 | M | 21, 28, 29 | new |

## 4. Rules every task obeys

These rules apply to every package, so the packages do not repeat them. A row that differs says so.

| Rule | Detail |
|---|---|
| Branch and commit | Work on local branch `build/v1`. One commit per task, authored as Amar Kushwaha, message `B19 T-B19-<nn>: <what>`, no `Co-Authored-By` and no "Generated with" line. Never push, never deploy. A push to `main` deploys production on Vercel (roadmap 2.1) |
| Off limits | No production service, no `.env.local` value, ports 3000 and 43117. Verification is keyless on a local build (`KL` below). No task needs a key |
| Precondition check | Before editing, `ls` or `grep` every file from an earlier phase that the task names. If a file or export is missing or has another signature, keep the earlier phase's name, adapt the new code, and write the difference in the commit body. If a whole module is missing, stop and report; do not widen the task |
| Next.js | Read the matching guide in `node_modules/next/dist/docs/01-app/` before naming a Next API (`AGENTS.md`). UI tasks use client components loaded with `next/dynamic` and `ssr: false` (`02-guides/lazy-loading.md`). No route handler, no `proxy.ts`, no Server Action in this phase |
| Portable code | `src/sim/flight/**`, `src/export/**` import no DOM, React or Node built-in (ADR-0014; checked by `npx tsc -p tsconfig.portable.json` and `src/architecture.test.ts`, both from B2). Imports inside `src/sim/flight` are relative, so the browser tests of T-B19-28 can serve them. A type that lives in `src/lib/flight` is re-declared structurally, never imported. Workers, React and `localStorage` live in `src/sim-host`, `src/components`, `src/local` |
| Determinism | No `Date.now`, `performance.now`, `Math.random` (the B3-10 lint ban covers `src/sim`). No `Math.<fn>` from the banned list in Q7 in the B19 files outside `fmath.ts` (the file list is in T-B19-01; B18 files are out of scope). Every random draw uses `rng(seed, stream)` with a named stream: `wind`, `sensor:gyro`, `sensor:accel`, `sensor:baro`, `sensor:gps`, `fault:<id>` (SIMULATION 12.1). A new consumer never shifts another stream |
| 5-file rule | At most 5 source files per task, counting a set of one kind (one i18n namespace in six languages) as one. Test files, fixtures and the task's own docs lines count as 0. Counts are stated per package |
| API contracts | None. This phase adds no HTTP route and no server code (roadmap B19: "APIs: None") |
| Permissions | Everything runs on the person's own device on their own project. Imported projects, traces and parameter dumps are untrusted input and pass the same validators. Nothing is sent anywhere |
| Observability | No telemetry leaves the browser (D-015, B0). Failures go to the local `errors` store as `{where: 'flight.<area>', message}` with no project text. Diagnostics from the model use `SimEvent` kinds `flight-warn` (time-constant under 5 steps, saturation, estimator reset) with a code string |
| Safety text | Output screens and exports carry SN-8; the fly tab carries SN-4; no shipped string uses "safe to fly", "certified", "validated", "guaranteed", "approved" (DA-14, D-007). Copy changes update six languages in the same commit |
| Verify commands | `TL` = `npm run typecheck && npm run lint`. `V <p>` = `npx vitest run <p>`. `P` = `npx tsc -p tsconfig.portable.json`. `E <spec>` = `KL NEXT_DIST_DIR=.next-build npx playwright test <spec>`. `KL` = `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL=` (roadmap 2.3; use the shorter list that remains after T-B0-12). Each package also writes the literal commands |
| Done means | Typecheck and lint print zero errors; the named tests pass; `git status` shows only the task's files; the commit exists. Not "looks right" |
| Docs | Tasks do not edit `docs/DRONES.md`. Each task puts the numbers T-B19-30 needs in its commit body (a "Docs:" line). T-B19-30 writes the sections |
| Rollback | `git revert <commit>` for the task. Revert dependants first. Local tag `phase-B19` after Amar's OK is the phase rollback point. A deleting commit is separate from a replacing one (none here) |

## 5. Parallel groups and file ownership

Groups run in order. Tasks in one group touch disjoint files (checked in the ownership table) and can be built by separate agents at once. A group starts after every task of the earlier groups is committed and its verify commands pass.

| Group | Tasks (run at once) | Starts when | What the group leaves behind |
|---|---|---|---|
| 1 | T-B19-01, 02, 03, 04, 05 | B18 exit gate passed | Math facade, types, mass properties; input log; trace format, metrics, diff; four empty i18n namespaces; PX4 reference responses (or a `NOT RUN` note) |
| 2 | T-B19-06, 07, 08, 09 | Group 1 | Rotor ODE; drag, wind, environment; sensors; parameters and mixer |
| 3 | T-B19-10, 11, 12, 13, 14 | Group 2 | Integrator; estimator; controller; parameters from a project; CLI bindings |
| 4 | T-B19-15, 16 | Group 3 | The model flies headless (DA-06, 07, 22); parameter dump and wiring sheet |
| 5 | T-B19-17, 19, 20 | Group 4 | Failures, ESC desync and failsafe; bench set, envelope and worker; registry entries and notices |
| 6 | T-B19-18, 21, 23, 24, 25, 26 | Group 5 | Model inside the range session; RS-14 verdict and label; trace view; compare view; envelope view; optimiser check |
| 7 | T-B19-22, 28 | Group 6 | Parameter panel and model picker; `dmath` and the SA-12 flight hash (after every flight file is final) |
| 8 | T-B19-27 | Group 7 | Range wiring (ghosts by model, medals, sticks) |
| 9 | T-B19-31 | Group 8 | Tabs, spec derivation, trace capture and the model switch in the Studio drone workspace |
| 10 | T-B19-29 | Group 9 | `e2e/drone-fly.spec.ts` and the phone spec |
| 11 | T-B19-30 | Group 10 | `docs/DRONES.md` and the phase record (needs the T-B19-29 pass result and walk-through) |

Dependency edges (task: needs): 06: 01. 07: 01. 08: 01. 09: 01. 10: 01, 06, 07. 11: 01, 08. 12: 01, 09. 13: 01, 06. 14: 09. 15: 02, 03, 06 to 13. 16: 09, 14. 17: 15. 18: 15, 17. 19: 03, 15. 20: 15, 04. 21: 03, 05, 15, 20. 22: 04, 09, 14, 16, 18, 20. 23: 03, 04, 15, 20. 24: 03, 04, 19, 20. 25: 04, 19, 20. 26: 19. 27: 18, 22. 28: 15, 17, 18, 19. 31: 18, 19, 22, 23, 24, 25, 26, 27. 29: 01-28, 31. 30: 21, 28, 29.

### File ownership

One row per file or file set. "Later edit" lists a task in a later group that edits the same file again; the two never run at once. All paths are under `src/` unless shown otherwise.

| File | Task (group) | Later edit |
|---|---|---|
| `sim/flight/fmath.ts`, `vec.ts`, `rigid-types.ts`, `massprops.ts` | T-B19-01 (1) | `fmath.ts`: T-B19-28 (7) |
| `sim/flight/inputlog.ts` | T-B19-02 (1) | none |
| `sim/flight/trace.ts`, `metrics.ts`, `diff.ts`, `components/studio/drone/TracePlot.tsx` | T-B19-03 (1) | none |
| `i18n/namespaces.ts`, `i18n/messages/<lang>/droneparams.json`, `dronetrace.json`, `dronecompare.json`, `droneenv.json` | T-B19-04 (1) | `droneparams.json`: T-B19-22 (7). `dronetrace.json`: T-B19-23 (6). `dronecompare.json`: T-B19-24 (6). `droneenv.json`: T-B19-25 (6) |
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-14-flight-oracle/` (README, `src/`, `results/` raw) | T-B19-05 (1) | `REPORT.md` and `results/compare/`: T-B19-21 (6) |
| `sim/flight/rotor.ts` | T-B19-06 (2) | none |
| `sim/flight/drag.ts`, `wind.ts`, `environment.ts` (and `sim/env.ts` only if missing) | T-B19-07 (2) | none |
| `sim/flight/sensors.ts` | T-B19-08 (2) | none |
| `sim/flight/params.ts`, `mixer.ts` | T-B19-09 (2) | `params.ts`: T-B19-15 (4) (gain tuning, allowed step rates) |
| `sim/flight/rigid.ts` | T-B19-10 (3) | none |
| `sim/flight/estimator.ts` | T-B19-11 (3) | none |
| `sim/flight/controller.ts`, `altitude.ts` | T-B19-12 (3) | none |
| `sim/flight/rigid-params.ts` | T-B19-13 (3) | none |
| `lib/dronelab/cli.ts`, `sim/flight/cli-bridge.ts` | T-B19-14 (3) | none |
| `sim/flight/model.ts`, `model-rigid.ts` | T-B19-15 (4) | `model-rigid.ts`: T-B19-17 (5) |
| `export/drone-params.ts`, `export/wiring-sheet.ts` | T-B19-16 (4) | none |
| `sim/flight/failures.ts`, `desync.ts`, `failsafe.ts` | T-B19-17 (5) | none |
| `sim/flight/rigid-driver.ts`, `lib/flight/sim.ts`, `lib/flight/session.ts`, `architecture.test.ts` (the `labs` to `sim` cell; `eslint.config.mjs` only if its zones also forbid it) | T-B19-18 (6) | none |
| `sim/flight/bench-set.ts`, `envelope.ts`, `sim-host/flight-analysis.worker.ts`, `sim-host/flight-analysis-host.ts` | T-B19-19 (5) | none |
| `sim/registry/data/multirotor-rigid.json`, `sim/registry/data/flight-game.json` (edit if B18 made it), `components/studio/drone/FlightNotices.tsx` | T-B19-20 (5) | `multirotor-rigid.json`: T-B19-21 (6), T-B19-28 (7) |
| `components/studio/drone/ParamBindings.tsx`, `FlightModelPicker.tsx` | T-B19-22 (7) | none |
| `components/studio/drone/TraceView.tsx`, `TraceTable.tsx`, `local/trace-shelf.ts` | T-B19-23 (6) | none |
| `components/studio/drone/FlightCompareView.tsx` | T-B19-24 (6) | none |
| `components/studio/drone/EnvelopeView.tsx`, `BenchSetPanel.tsx` | T-B19-25 (6) | none |
| `sim/flight/optimise-rigid.ts`, `sim/flight/optimise.ts` (B18 file, one edit), `components/studio/drone/RigidVerdictChip.tsx` | T-B19-26 (6) | none |
| `components/flight/FlightRange.tsx`, `lib/flight/ghost.ts`, `components/flight/room-ghosts.ts`, `i18n/messages/<lang>/flight.json` | T-B19-27 (8) | none |
| `e2e/flight-hash.spec.ts`, `sim/flight/hash.fixture.json` (and `sim/flight/fmath.ts`, `sim/registry/data/multirotor-rigid.json`, above) | T-B19-28 (7) | none |
| `components/studio/drone/DroneTabs.tsx`, `useDroneFlight.ts`, `components/studio/lab/CraftPanel.tsx` (B13 file, one edit), `components/dronelab/FlyView.tsx` (B13 file, one edit; `FlyPanel.tsx` instead if the DailyChallengeCard grep says so) | T-B19-31 (9) | none |
| `e2e/drone-fly.spec.ts`, `e2e/drone-fly.phone.spec.ts` | T-B19-29 (10) | none |
| `docs/DRONES.md`, `sim/flight/strings.test.ts` (scan extended) | T-B19-30 (11) | none |

## 6. Task packages

Every table has the same rows. "API, permissions, migration" is one row because all three are "none" unless it says otherwise.

---

### T-B19-01 Math facade, vectors and quaternions, rigid types, mass properties

| Field | Content |
|---|---|
| Identity | T-B19-01 / flight maths and types, `src/sim/flight` / B19 / P0, size L / depends on nothing in this phase (B3 `src/sim/core/rng.ts` for the `Rng` type) / not started |
| Problem | Every later file needs vectors, quaternions, mass and inertia. Cross-engine determinism (A12) is a one-file switch only if all transcendental maths goes through one module |
| Target user | The agents writing T-B19-06 to T-B19-15, and through them the person who flies in Chromium and Safari |
| User story | As someone flying my build, I get the same flight in two browsers, because the maths sits behind one door that can be swapped for `dmath` |
| Expected behaviour | `fmath.ts` forwards to `Math` and offers `gauss`. `vec.ts` gives vector, matrix and quaternion helpers and the conversion to and from the game's yaw, pitch, roll. `massprops.ts` turns mounted pieces into mass, centre of mass and inertia tensor. `rigid-types.ts` holds the shared types |
| Success metric | `gameFromQ(qFromGame(a))` equals the input and `qToMat` columns equal `bodyAxes` (`src/lib/flight/math.ts:22-33`) to 1e-12 over 10,000 seeded attitudes; DA-17 two-box assembly equal to the analytic answer to 1e-9 relative; the ban test finds no banned call outside `fmath.ts` |
| Existing files | `src/lib/flight/math.ts:22-33` (`bodyAxes`, the oracle; imported by the test only), `src/lib/flight/types.ts:9-19` (`CalcOutputs`, re-declared structurally in T-B19-13, not imported). B3: `src/sim/core/rng.ts` (`Rng`), `clock.ts` (`SimTime`). B18: `src/sim/flight/checks.ts` (centre of mass for DB-C-08). Precondition: `grep -rn "massProperties\|centreOfMass\|inertia" src/sim/flight` ; if B18 already exports a tensor function, `massprops.ts` re-exports it and the task adds only the missing cases |
| New files | `src/sim/flight/fmath.ts`, `vec.ts`, `rigid-types.ts`, `massprops.ts` (4 source files). Tests: `fmath.test.ts`, `vec.test.ts`, `massprops.test.ts`, `ban.test.ts` |
| Modules and signatures | `fmath.ts`: `export const FLIGHT_HASH_CLASS: 'N' \| 'B' = 'N'; export const MATH_BACKEND: 'math' \| 'dmath' = 'math'; export const sqrt: (x: number) => number; export function sin(x: number): number; cos; atan2(y: number, x: number): number; exp; log; asin; acos; export function gauss(r: { float(): number }): number;` (Box-Muller from two `float()` draws using `log`, `sqrt`, `cos`; `asin`, `acos` are `atan2` forms so `dmath` covers them). `vec.ts`: `export type Vec3 = readonly [number, number, number]; export type Quat = readonly [number, number, number, number] /* w,x,y,z, body to world */; export type Mat3 = readonly number[] /* 9, row-major */; add, sub, scale, dot, cross, norm (sqrt of sum of squares, never hypot), qmul, qnorm, qconj, qrot(q, v), qToMat(q), matMul, matVec, matTranspose, mat3Inverse(sym), qIntegrate(q, wBody, dt) /* exact exp map using fmath */, qFromGame(yawDeg, pitchDeg, rollDeg): Quat, gameFromQ(q): { yaw: number; pitch: number; roll: number }`. `rigid-types.ts`: see Data model. `massprops.ts`: `export type MassPiece = { id: string; mass_kg: number; pos_m: Vec3; shape: { kind: 'point' } \| { kind: 'box'; size_m: Vec3 } \| { kind: 'cyl'; r_m: number; h_m: number; axis: 'x' \| 'y' \| 'z' }; rot?: Quat }; export type MassResult = { ok: true; mass_kg: number; cg_m: Vec3; inertia: Mat3; principal: Vec3 } \| { ok: false; code: 'DB-E-INERTIA' \| 'DB-E-FIELD'; field?: string }; export function massProperties(pieces: readonly MassPiece[]): MassResult` |
| Data model | `rigid-types.ts` exports `FLIGHT_MODEL_ID = 'multirotor-rigid@1'`, `FLIGHT_MODEL_VERSION = '1.0.0'`, and: `RotorParams { id: string; drive: 'electrical' \| 'normalised' /* normalised: the prototype and legacy-calc form, thrust = kT * omega^2 with omega in 0..1 */; pos_m: Vec3 /* from CG */; axis: Vec3 /* unit, thrust direction */; dir: 1 \| -1 /* +1 CCW seen from above: the commanded motor direction */; propSpin: 1 \| -1 /* handedness */; kT: number; kQ: number /* N/(rad/s)^2 and N m/(rad/s)^2 */; jr_kgm2: number; ke: number /* V s/rad */; kt: number /* N m/A, equals ke */; r_ohm: number; i0_a: number; i_cont_a: number; brake: boolean; eta_esc: number; reverse_thrust_factor: number; diameter_m: number; pitch_m: number; ct_vs_j?: ReadonlyArray<{ j: number; ct: number }>; tau_assumed_s?: number /* set only when jr_kgm2 is unknown */ }`, `RigidParams { mass_kg; inertia: Mat3; cg_offset_m: Vec3; rotors: RotorParams[]; cdA_m2: Vec3 /* per body axis */; k_lin_drag: number; rho: number; battery: BatteryParamsRef; imu: ImuParams; step_hz: 500 \| 1000 \| 2000; pid_hz: 500 \| 1000 \| 2000 }`, `RigidState { t_ns: number; p: Vec3; v: Vec3; q: Quat; w: Vec3; omega: number[] }`, and the packed layout `export const IDX = { p: 0, v: 3, q: 6, w: 10, omega: 13 }` for the `Float64Array` the integrator uses. `BatteryParamsRef` is the B18 battery type from `src/sim/flight/battery.ts` (alias, not a copy) |
| Input and output schemas | As signatures. `MassPiece` fields come from the project: `components[].mass_g` and `mechanical.mounts` (PDM 5.8), converted to kg and metres by T-B19-13 |
| API, permissions, migration | None. None. None |
| Algorithm | Inertia (DRONE 7.3): per piece `J_i` from its shape (box: `m/12 (b²+c²)`; solid cylinder about its axis `m r²/2`, about a transverse axis `m (3r²+h²)/12`; point: zero), rotated into the body frame by `rot` as `R J Rᵀ`; then `J = Σ (J_i + m_i (\|d_i\|² I₃ − d_i d_iᵀ))`, `d_i = r_i − c`. Principal moments by the Jacobi method with a fixed 24 sweeps and a fixed pivot order (deterministic). `DB-E-INERTIA` when any principal moment is not above 1e-12 or the triangle inequality `Ixx+Iyy >= Izz` (and permutations) fails by more than 1e-9 relative. `gameFromQ`: `fwd` and `up` from `qToMat`; `pitch = atan2(−fwd.z, sqrt(fwd.x²+fwd.y²))`, `yaw = atan2(fwd.y, fwd.x)`, `roll = atan2(up'.y, left'.y)` with `up'` and `left'` the `up` and `left` columns rotated by `−yaw` (they equal `[cr·sp, sr, cr·cp]` and `[−sr·sp, cr, −sr·cp]` by `math.ts:24-31`). Convention fixed by test, not by prose |
| State, validation, errors | Pure functions, no state. Validation: pieces ≥ 1, all numbers finite, masses > 0, box sizes > 0. Errors are returned as `MassResult` with `code` and the first bad `field`, never thrown, no `NaN` or `Infinity` out (DA-01 style) |
| Edge cases | A single point mass (inertia zero, `DB-E-INERTIA`: reported, because a body needs non-zero moments). Collinear pieces (one principal moment ~0: `DB-E-INERTIA`). Gimbal lock at pitch ±90 degrees in `gameFromQ` (returns roll 0 and the yaw from `left`, tested). Quaternion not unit length on entry (`qnorm` first) |
| Performance | `qrot`, `qmul` allocation-light; `Float64Array` scratch in the integrator (T-B19-10). `massProperties` runs once per run, not per step |
| Unit tests | `vec.test.ts`: round trips; `qToMat` against `bodyAxes` over 10,000 seeded attitudes (including pitch near ±89 degrees); `qIntegrate` of a constant rate over 1,000 steps keeps the norm within 1e-12; `fmath.gauss` mean and variance over 100,000 draws within 1 percent. `massprops.test.ts` (DA-17): two boxes of known size, mass and offset against closed form, 1e-9 relative; parallel-axis check; each error code has a fixture. `ban.test.ts`: scans only the B19 fmath-routed files that exist: `vec, massprops, rotor, drag, wind, environment, sensors, params, mixer, rigid, estimator, controller, altitude, rigid-params, model, model-rigid, failures, desync, failsafe, rigid-driver, bench-set, envelope, optimise-rigid` (`.ts`, in `src/sim/flight`; the list is a constant in the test, files not yet written are skipped). B18 files there (`battery, propulsion, endurance, checks, optimise`) are not scanned: B18 uses `Math.sin` and `Math.cos` (class N) in a check, and this task must not edit them. Fails on any banned call from Q7, naming file and line |
| Integration tests | None in this task |
| Playwright | None |
| Fixtures | None stored; seeds are in the test |
| Acceptance | Given a quaternion built from yaw 30, pitch 10, roll −20, When `qToMat` is read, Then its forward, left and up columns equal `bodyAxes(30, 10, −20)`. Given two boxes, When `massProperties` runs, Then the tensor equals the analytic one to 1e-9. Given a file that calls `Math.sin`, When the ban test runs, Then it fails and names the file |
| Observability, release blockers | None. Blocker: a banned call outside `fmath.ts`; `hypot` anywhere |
| Definition of done | Four files and four tests committed; the ban test passes on the B19 file list as it exists (B18 files are outside its scope) |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/fmath.test.ts src/sim/flight/vec.test.ts src/sim/flight/massprops.test.ts src/sim/flight/ban.test.ts`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: tolerance figures. Rollback: revert the commit |
| Later tasks need | `Vec3, Quat, Mat3, IDX, RotorParams, RigidParams, RigidState` (all); `fmath` (all); `massProperties` (13); `FLIGHT_HASH_CLASS` (15, 28) |

---

### T-B19-02 Input log: `InputEntry` mapping and legacy log conversion

| Field | Content |
|---|---|
| Identity | T-B19-02 / replay input log, `src/sim/flight` / B19 / P0, size M / depends on nothing in this phase (B3 `InputEntry`, `SimTime`) / not started |
| Problem | The game stores flights as `{step, action}` at 100 Hz (`session.ts:48`, `sim.ts:1008`). The replay contract stores `InputEntry[]` (SIMULATION 6.7). Ghosts, medals and crash replays already saved in the old form must still load (DRONE 11.1, DA-07) |
| Target user | Anyone replaying a flight; the ghost and crash-replay code |
| User story | As someone with saved laps, I open them after the update and they replay to the same result |
| Expected behaviour | One function turns a legacy log into `InputEntry[]`, one turns it back, both identical on a round trip. The old form is never written again |
| Success metric | Round trip `{step, action}` to entries and back is deep-equal on 200 generated logs and on the logs of the scripted runs in the existing `src/lib/flight` tests; replaying either gives equal checkpoint hashes (DA-07 first part) |
| Existing files | `src/lib/flight/types.ts:249-257` (`FlightAction`), `src/lib/flight/sim.ts:1008-1028` (`replay`), `src/lib/flight/session.ts:101-122` (the log, with same-step stick coalescing) |
| New files | `src/sim/flight/inputlog.ts` (1 source file). Tests: `inputlog.test.ts` |
| Modules and signatures | `export interface LegacyAction { type: string; [k: string]: unknown }; export interface LegacyEntry { step: number; action: LegacyAction }; export const GAME_STEP_NS = 10_000_000; export function toInputEntries(log: readonly LegacyEntry[], stepNs?: number): InputEntry[]; export function fromInputEntries(entries: readonly InputEntry[], stepNs?: number): LegacyEntry[]; export function normaliseEntries(entries: readonly InputEntry[]): InputEntry[]; export function entriesBetween(entries: readonly InputEntry[], fromNs: number, toNs: number): InputEntry[]` (half-open); `export function isLegacyLog(x: unknown): x is LegacyEntry[]` (true only when every entry has a finite integer `step >= 0`, an `action` object with a known action type, and the log has at most 200,000 entries). `InputEntry` and `SimTime` come from B3 `src/sim/core` |
| Data model | `InputEntry {at: SimTime; seq: number; kind: 'pin'\|'analog'\|'serial'\|'param'\|'fault'\|'control'; target: string; value: unknown}` (SIMULATION 6.7). Mapping (DRONE 11.1): `at = step * stepNs`; `seq` = order inside one step from 0; `kind: 'control'` for `sticks, arm, disarm, toggleArm, reset, mode, wind, design`; `target: 'stick'` for `sticks`, `'switch'` for the rest; `value` is the action payload without `type`, plus `value.action = <type>` for switch entries. Fault entries (`kind: 'fault'`, `target: 'sensor:<name>'` or `'motor:<id>'`) are written by T-B19-07 and T-B19-17 and pass through `normaliseEntries` unchanged |
| Input and output schemas | As signatures. Sort order is `(at, seq)`; ties get the next free `seq`; at most 200,000 entries; `at` an integer in `[0, 2^53)` |
| API, permissions, migration | None. None. Legacy logs convert on load; nothing is written back in the old form |
| Algorithm | `toInputEntries`: iterate in order, `seq` resets when `step` changes. `fromInputEntries`: group by `at / stepNs` (`at` must divide exactly by `stepNs`, else throw `RangeError('input-entry: at')`; nothing is floored or dropped; the round-trip test proves the legal inputs divide), rebuild `{type, ...value}` and drop `action`. `normaliseEntries`: stable sort, renumber collisions |
| State, validation, errors | Pure. Validation: finite integer `at`, non-negative `seq`, known `kind`. A bad entry throws `RangeError('input-entry: <field>')` (programming error; untrusted logs pass `isLegacyLog` first, which returns a boolean) |
| Edge cases | Empty log. 200,000 entries exactly and one more. Two `sticks` in one step (the session already coalesces; the function keeps both in order). `design` actions carry a whole `calc` object: copied by reference in the pure function, cloned by the caller if stored |
| Performance | Linear. 200,000 entries in under 100 ms (ESTIMATED) |
| Unit tests | `inputlog.test.ts`: the mapping table above, one case per action type; round trip on 200 seeded logs; ordering and collision renumbering; the cap; `fromInputEntries` throws `RangeError('input-entry: at')` for an `at` that `stepNs` does not divide; `isLegacyLog` rejects `{step: 1.5}`, negative steps, unknown action types, and a 200,001-entry log |
| Integration tests | In the same file: build a session from `quad5` with `createSession`, dispatch a scripted sequence (arm, sticks at steps 10, 25, 40), take `log()`, convert and back, replay both with `replay(...)` from `sim.ts:1008`, compare `frameOf` JSON hashes at every 100th step: equal |
| Playwright | None |
| Fixtures | `src/sim/flight/testdata/legacy-log.quad5.json` (a 600-step scripted log produced by the test once and committed with its hash in the test) |
| Acceptance | Given a saved lap log, When converted to entries and back, Then the list is identical. Given either form, When replayed, Then checkpoint hashes are equal (DA-07 clause 2) |
| Observability, release blockers | None. Blocker: any code path that writes the legacy form back |
| Definition of done | File, tests and fixture committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/inputlog.test.ts src/lib/flight`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: the mapping table and Q2. Rollback: revert |
| Later tasks need | `isLegacyLog` (18, 27, ghost loading; every untrusted log passes it before conversion), `toInputEntries`, `fromInputEntries`, `normaliseEntries` (15, 18, 19, 27) |

---

### T-B19-03 Trace format, metrics, first-difference marker

| Field | Content |
|---|---|
| Identity | T-B19-03 / traces and analysis, `src/sim/flight` / B19 / P0, size L / depends on nothing in this phase / not started |
| Problem | F-217 and R-175 need a recorded flight, the same metric code for plots and comparison, and a first-difference marker. None exist (flight has `FlightFrame` only, `types.ts:288-327`) |
| Target user | The person comparing two builds; T-B19-19, 21, 23, 24 |
| User story | As someone who changed a gain, I see exactly when the two flights first differ and by how much the rise time moved |
| Expected behaviour | A recorder samples named channels at 100 Hz plus 2 s full-rate windows around events; traces encode to compact bytes with hostile-input limits; metrics use fixed definitions; a marker names the first sample where two traces differ by more than a threshold |
| Success metric | DA-09: `stepMetrics` agrees with an independent implementation to 1 sample on 50 generated responses. DA-12 (synthetic part): a change of one sample at 3.2 s is marked within one sample and names the channel. DA-13 part: `metricDeltas(a,b)` is exactly the negation of `metricDeltas(b,a)` |
| Existing files | `src/lib/flight/types.ts:288-327` (`FlightFrame`, for channel naming only). SIMULATION 6.7 (`Checkpoint`). DRONE 11.2 to 11.4 (spec) |
| New files | `src/sim/flight/trace.ts`, `metrics.ts`, `diff.ts`, `src/components/studio/drone/TracePlot.tsx` (4 source files; the plot is shared by the trace view and the compare view so they stay in one group). Tests: `trace.test.ts`, `metrics.test.ts`, `metrics.independent.test.ts`, `diff.test.ts`, `TracePlot.test.tsx` |
| Modules and signatures | `trace.ts`: `export interface TraceChannelDef { id: string; unit: string }; export interface FlightTrace { version: 1; modelId: string; docHash: string; seed: number; rate_hz: number; t0_ns: number; n: number; channels: Array<TraceChannelDef & { data: Float32Array }>; windows: TraceWindow[]; marks: Array<{ at_ns: number; label: string }> }; export interface TraceWindow { at_ns: number; rate_hz: number; n: number; channels: Array<TraceChannelDef & { data: Float32Array }> }; export const TRACE_LIMITS = { maxBytes: 20 * 1024 * 1024, maxKept: 8, maxChannels: 48, maxWindows: 8, windowS: 2 }; export function defaultChannels(motors: number): TraceChannelDef[]; export class TraceRecorder { constructor(o: { modelId: string; docHash: string; seed: number; stepHz: number; channels: TraceChannelDef[]; rateHz?: number }); push(t_ns: number, sample: ArrayLike<number>): void; mark(label: string): void; finish(): FlightTrace }; export function encodeTrace(t: FlightTrace): Uint8Array; export function decodeTrace(b: Uint8Array): { ok: true; trace: FlightTrace } \| { ok: false; error: 'too-big' \| 'bad-magic' \| 'bad-header' \| 'bad-length' \| 'too-many-channels' }`. `metrics.ts`: `export interface StepMetrics { rise_s: number \| null; overshoot: number \| null; settle_s: number \| null; steady_err: number \| null }; export function stepMetrics(t_s: ArrayLike<number>, y: ArrayLike<number>, o: { t_step_s: number; y_target?: number; band?: number }): StepMetrics; export function hoverMetrics(t_s, pos: { x: ArrayLike<number>; y: ArrayLike<number>; z: ArrayLike<number> }, o: { from_s: number; to_s: number; z_target?: number }): { drift_rms_m: number; alt_err_m: number }; export function batteryMetrics(v: ArrayLike<number>, i: ArrayLike<number>, dt_s: number): { v_min: number; i_peak: number; energy_wh: number }; export function saturationMetrics(cmd: ArrayLike<number>[], o: { lo: number; hi: number }): { saturation_frac: number; spread_mean: number }; export const METRIC_DEFS: Record<string, { unit: string; text_key: string; formula: string }>`. `diff.ts`: `export interface DiffThresholds { attitude_deg: number; position_cm: number; command_pct: number } /* defaults 1, 5, 3 */; export interface FirstDifference { t_ns: number; channel: string; a: number; b: number; threshold: number }; export function firstDifference(a: FlightTrace, b: FlightTrace, th?: Partial<DiffThresholds>): FirstDifference \| null; export function metricDeltas(a: Record<string, number>, b: Record<string, number>): Record<string, number>`. `TracePlot.tsx` (client component, no strings of its own, labels come in as props): `export interface PlotSeries { trace: FlightTrace; label: string; color: string; dash?: string }; export interface TracePlotProps { series: PlotSeries[]; channels: string[]; cursor_ns?: number; onCursor?(ns: number): void; marker?: FirstDifference \| null; width?: number; height?: number; ariaLabel: string; formatChannel(id: string): string }; export function TracePlot(p: TracePlotProps): JSX.Element` (SVG polylines, at most 1,000 points per channel by min-max decimation, a focusable cursor moved by arrow keys one sample and by Page Up and Page Down one second, colours from CSS custom properties passed as `color`) |
| Data model | Channel ids, in this order (DRONE 11.2, up to 48): `x_m, y_m, z_m, vx_mps, vy_mps, vz_mps, roll_deg, pitch_deg, yaw_deg, wx_dps, wy_dps, wz_dps, sp_roll_dps, sp_pitch_dps, sp_yaw_dps, thr_cmd` (16), then per motor `cmd_<i>`, `rpm_<i>` and, when the craft has at most 8 motors, `amp_<i>` (3 per motor up to 8 motors = 24; 2 per motor above that), then `v_pack, i_pack, soc, est_att_err_deg, est_pos_err_m, wind_x_mps, wind_y_mps, wind_z_mps`. 16 + 24 + 8 = 48 at 8 motors; 16 + 24 + 8 = 48 at 12 motors with two per motor. Per-motor current is dropped above 8 motors (a stated deviation from DRONE 11.2). Encoded form: magic `IYTR`, `u8` version 1, `u32` header length, JSON header (ids, units, `n`, rates, marks, window table), then `Float32` little-endian blocks. Not stored in the project document (Q4) |
| Input and output schemas | As signatures. Limits: 20 MiB per trace (`too-big` is returned by `decodeTrace` and by `encodeTrace` throwing `RangeError`), 8 windows, 48 channels, header at most 64 KiB, `n` at most 6,000,000 samples per channel |
| API, permissions, migration | None. None. None |
| Algorithm | Recorder: decimate to `rateHz` (default 100) by taking every `stepHz / rateHz`-th sample; keep a 1 s ring of full-rate samples; `mark(label)` freezes the ring as the pre-window and records 1 s more at full rate as the post-window; windows past the cap are dropped and counted in a mark `windows-dropped`. Storage arithmetic: 40 channels x 100 Hz x 60 s x 4 bytes = 0.96 MB a minute (ARITHMETIC). `stepMetrics` definitions (cited on screen): `y0` = mean of samples in `[t_step − 0.05 s, t_step)`; `y_f` = `y_target` else mean of the last 10 percent of samples; `step = y_f − y0`; rise = time between the first crossing of `y0 + 0.1 step` and of `y0 + 0.9 step`, linear interpolation inside a sample; overshoot = `(y_max − y_f) / \|step\|` for a positive step (mirrored for negative), 0 when none; settle = last time `\|y − y_f\| > band \|step\|` (band default 0.02) minus `t_step`; steady error = `\|mean(last 10 percent) − y_f\|`. Any metric that cannot be computed is `null`, never `NaN`. `firstDifference`: align by `t0_ns` and `rate_hz` (must be equal else `null` and a `rate-mismatch` mark), walk samples, per sample take the largest normalised difference over attitude channels (degrees against `attitude_deg`), position channels (cm against `position_cm`) and `cmd_*` channels (percent against `command_pct`), return the first with ratio above 1. `metricDeltas`: `a[k] − b[k]` for keys present in both; keys in one side only are omitted and listed by the caller |
| State, validation, errors | The recorder has `recording` then `finished`; `push` after `finish` throws. `decodeTrace` never throws on hostile bytes. Metrics on arrays shorter than 3 samples return all-`null` |
| Edge cases | A flight shorter than 1 s (no ring pre-window). A mark in the first sample. Two marks within 1 s (windows would overlap: merged into one). Traces with different channel lists (diff compares the intersection). Float32 rounding of attitude (tolerance in the diff test is above 1e-4 degree) |
| Performance | `push` under 1 microsecond amortised for 48 channels (ESTIMATED; a typed-array write per channel). Encode 1 minute in under 20 ms |
| Unit tests | `TracePlot.test.tsx` (RTL): polyline count equals series times channels, decimation cap of 1,000 points, cursor keys, marker line, `aria-label`. `trace.test.ts`: channel count at 4, 8, 12 motors; encode/decode round trip; each `error` code with a crafted byte string (wrong magic, header length past the end, 49 channels, 21 MiB claim); window freezing with one and with overlapping marks. `metrics.test.ts`: analytic first-order and second-order responses with known rise, overshoot, settle; `null` cases. `metrics.independent.test.ts` (DA-09): a second implementation written in the test by brute-force scanning with no shared code, 50 seeded responses, agreement to 1 sample. `diff.test.ts`: synthetic traces, a single-sample change at 3.2 s marked within one sample with the right channel; `a,b` against `b,a` gives exactly negated `metricDeltas` (DA-13 clause, compared with `Object.is` after negation); rate mismatch gives `null` |
| Integration tests | None here (needs the model). The headless version of DA-12 is in T-B19-24 |
| Playwright | None |
| Fixtures | None stored |
| Acceptance | Given a rate step response with known constants, When `stepMetrics` runs, Then rise, overshoot and settling equal the closed form within one sample. Given two traces identical except one stick change at 3.2 s, When compared, Then the marker is at 3.2 s within one sample and names the channel |
| Observability, release blockers | None. Blocker: `NaN` or `Infinity` in any returned metric |
| Definition of done | Four files and five test files committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/trace.test.ts src/sim/flight/metrics.test.ts src/sim/flight/metrics.independent.test.ts src/sim/flight/diff.test.ts src/components/studio/drone/TracePlot.test.tsx`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: the metric definitions as written above. Rollback: revert |
| Later tasks need | `TracePlot` (23, 24), `TraceRecorder`, `FlightTrace`, `defaultChannels`, `stepMetrics`, `hoverMetrics`, `batteryMetrics`, `saturationMetrics`, `firstDifference`, `metricDeltas` (15, 19, 21, 23, 24, 25) |

---

### T-B19-04 i18n scaffold: four namespaces

| Field | Content |
|---|---|
| Identity | T-B19-04 / UI strings, `src/i18n` / B19 / P0, size S / depends on nothing / not started |
| Problem | Four UI tasks in group 6 each need strings in six languages. Two tasks editing one namespace file at once would collide |
| Target user | The agents of T-B19-22 to T-B19-25; speakers of the six languages |
| User story | As someone who reads Hindi, I see the trace and compare screens in Hindi |
| Expected behaviour | Four namespaces `droneparams`, `dronetrace`, `dronecompare`, `droneenv` exist in all six languages with one starter key each; each UI task adds its own keys later |
| Success metric | The existing namespace parity test passes with the four new namespaces; typecheck passes with the new `Messages` entries |
| Existing files | `src/i18n/namespaces.ts:4` (array) and the `Messages` type below it; `src/i18n/messages/<lang>/*.json` for `en, de, es, fr, hi, zh` |
| New files | `src/i18n/messages/<lang>/droneparams.json`, `dronetrace.json`, `dronecompare.json`, `droneenv.json` (each name is one file x six languages = 4 source units). Edit: `src/i18n/namespaces.ts` (1). Total 5 |
| Modules and signatures | `NAMESPACES` gains the four names; `Messages` gains `droneparams: typeof import("./messages/en/droneparams.json")` and the other three |
| Data model | Each file: `{ "title": "<short heading>" }` in the language. English defines the key set |
| Input and output schemas | JSON, UTF-8, no comments |
| API, permissions, migration | None. None. None |
| Algorithm | Add names; create 24 files; run the parity test |
| State, validation, errors | The parity test fails when a language lacks a key the English file has |
| Edge cases | Right-to-left is not in the six languages. Hindi and Chinese files must be valid UTF-8 without BOM |
| Performance | None |
| Unit tests | The existing parity test under `src/i18n` (find it: `ls src/i18n/*.test.*`) covers the new files; no new test |
| Integration tests | `npm run typecheck` proves the `Messages` type |
| Playwright | None |
| Fixtures | None |
| Acceptance | Given the four namespaces, When the parity test runs, Then all 24 files have the English keys |
| Observability, release blockers | None. Blocker: a missing language file |
| Definition of done | 24 JSON files and the edit committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/i18n` |
| Docs and rollback | None. Revert the commit |
| Later tasks need | The four namespaces (22, 23, 24, 25) |

---

### T-B19-05 Spike RS-14a: PX4 SIH reference step responses

| Field | Content |
|---|---|
| Identity | T-B19-05 / research spike, `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-14-flight-oracle` / B19 / P1, size L / depends on nothing / not started |
| Problem | RS-14 never ran (no folder, no report). The rigid model's label depends on how close it is to a real controller and plant. Half of the work, the PX4 side, needs no iynk code and can start now |
| Target user | T-B19-21 and Amar, who reads the verdict |
| User story | As someone who will trust the model's step response, I want a recorded reference from firmware that real aircraft use |
| Expected behaviour | PX4 SIH is built from source on this machine, run headless with three vehicle parameter sets, given a body-rate step, and its response is logged. The raw logs and the exact commands are saved. If any step fails inside the time box, the report says `NOT RUN` with the failing command and error |
| Success metric | **Falsifiable question:** can PX4 SIH be built and run headless here within one working day, and give a body-roll-rate step response whose 10 to 90 percent rise time and overshoot repeat within 2 percent over 5 runs for each of 3 vehicle parameter sets? **Exit condition:** PASS when all three sets repeat within 2 percent and the raw ULog or CSV files are saved. NOT RUN when a build or run step fails after the time box. INCONCLUSIVE when it runs but repeatability is worse than 2 percent (then the cause is reported and T-B19-21 reports `INCONCLUSIVE`) |
| Existing files | None in the repo. Context: `DRONE_ARCHITECTURE.md` 13.1 to 13.3; `TECHNICAL_RESEARCH.md` row 18 (RS-14); `08_RESEARCH_SPIKES/DP-01-robot-prototypes/src/quad.mjs` (the prototype, not a build input) |
| New files | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-14-flight-oracle/README.md`, `src/` scripts (`build.sh`, `run-step.py` or `.mjs`, `check-spread.mjs`, `params/*.params`), `results/environment.txt`, `results/raw/*` (raw logs). Not source files of the app: 0 counted. `REPORT.md` is written by T-B19-21 |
| Modules and signatures | Scripts only. The step injector sends a body-rate setpoint (100 deg/s roll for 1 s) and records angular velocity at the controller rate. UNKNOWN: the cleanest injection path; try in order (1) offboard MAVLink `SET_ATTITUDE_TARGET` with body-rate bits via `pymavlink`, (2) the PX4 shell `commander` and `uorb` publish of `vehicle_rates_setpoint`. The agent records which worked |
| Data model | Three vehicle parameter sets in `src/params/` as plain `SIH_*` and `MC_*` parameter lists: A quad X 0.65 kg 5-inch class (matches the prototype: arm 79.5 mm, 12 N per motor, Ixx = Iyy 2.5e-3, Izz 4.5e-3); B quad X 0.25 kg 3-inch class; C a hex (or a 1.5 kg quad if SIH has no hex: UNKNOWN, EXTERNAL recalled that SIH supports quad, hex, plane, VTOL and rover, verify). Each file also records PX4's own `MC_ROLLRATE_P/I/D/K` so T-B19-21 can match the loop gain |
| Input and output schemas | Raw output: one CSV per run with columns `t_s, wx_dps, wy_dps, wz_dps, sp_roll_dps`; `results/environment.txt` with OS, compiler, PX4 git hash, parameter file sha256 |
| API, permissions, migration | None. No network use beyond `git clone` and package download of PX4 (EXTERNAL, build-time only; BSD-3-Clause per DRONE 13.1). Nothing installed into the repo; build directories live in `/Users/amar/iynk-master-plan-scratch/buildplan/RS-14/`. None |
| Algorithm | Time box 1 working day, stop at the box. Steps: record toolchain versions; clone PX4 at a pinned tag; check the toolchain with `which cmake ninja`. Installing cmake or ninja (brew) is a machine-level change and a network download and needs Amar's OK (section 9 row 12); if cmake is missing and no OK is on record, record `NOT RUN` with the `which` output and do not install. With the OK, install only what the PX4 macOS guide asks for; build the SIH target; start headless; for each parameter set run 5 step tests; save raw; compute rise and overshoot with the T-B19-03 definitions (reuse by copying the formulae into a small script; the spike folder does not import app code) and the spread |
| State, validation, errors | Outcomes `PASS`, `NOT RUN`, `INCONCLUSIVE` as above. A failed command is quoted with its exit code |
| Edge cases | PX4 runs on its own clock faster than real time (lockstep) so timestamps come from the log, not the wall clock. The macOS build may need a Python venv: use the spike scratch folder, not the repo |
| Performance | None required |
| Unit tests | None (spike). A self-check script prints the spread and exits 1 above 2 percent |
| Integration tests | None |
| Playwright | None |
| Fixtures | `results/raw/` is the fixture T-B19-21 reads |
| Acceptance | Given the README steps on a clean scratch folder, When followed, Then the three sets produce 15 CSV files, or the README ends with a `NOT RUN` section naming the failing command |
| Observability, release blockers | None. Blocker: a conclusion that is not backed by a raw file |
| Definition of done | README, scripts, results folder committed; the outcome stated in the first line of the README. The run does not change `src/` |
| Verify commands | from the repo root: `ls docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-14-flight-oracle/results/raw \| wc -l` prints 15 (PASS) or the README's first line says NOT RUN; `node docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-14-flight-oracle/src/check-spread.mjs` exits 0 (on NOT RUN it is skipped) |
| Docs and rollback | Docs line: the outcome. Revert the commit |
| Later tasks need | `results/raw/*` and the three parameter sets (21) |

---

### T-B19-06 Rotor ODE with motor and ESC electrics

| Field | Content |
|---|---|
| Identity | T-B19-06 / rotor dynamics, `src/sim/flight` / B19 / P0, size L / depends on T-B19-01 / not started |
| Problem | A propeller load makes rotor response faster at low speed than at high speed, so a fixed time constant is wrong (DRONE Objection 2). The existing model has one lumped thrust (`sim.ts:606`) and no rotors |
| Target user | The integrator (T-B19-10), the parameter builder (T-B19-13), failures (T-B19-17) |
| User story | As someone who tunes a build, I see motors that spin up and down the way a real motor with a propeller does, and a motor that stops spins down by drag alone |
| Expected behaviour | For one rotor, given duty, pack voltage, axial airspeed and health flags, return the speed derivative, thrust, drag torque, motor current and the body torque terms. Also the closed-form static speed. A rotor with no inertia data uses a first-order lag with an assumed time constant, flagged |
| Success metric | Torque residual of `staticOmega` under 1e-9 N m over 10,000 seeded parts; the ODE settles to `staticOmega` within 1e-6 relative; free spin-down equals the closed form `omega0 / (1 + kQ omega0 t / J)` to 1e-9 |
| Existing files | `src/lib/flight/battery.ts:11-18` (`LIMITS`, not edited), B18 `src/sim/flight/propulsion.ts` (closed-form solve, DRONE 6.2) and `battery.ts` (cross-check only). Precondition: `grep -n "export function" src/sim/flight/propulsion.ts` and read the signatures |
| New files | `src/sim/flight/rotor.ts` (1 source file). Tests: `rotor.test.ts` |
| Modules and signatures | `export interface RotorHealth { motorOut: boolean; ctFactor: number /* propeller damage, 1 = new */; phaseSwapped: boolean; driveScale: number /* 0..1, ESC desync */ }; export const HEALTHY: RotorHealth; export interface RotorOut { domega: number; thrust: number /* N along the axis */; q_drag: number /* N m, load torque */; torque_motor: number; current_a: number /* phase current */; dir_actual: 1 \| -1; handed: boolean }; export function veff(duty: number, vPack: number, p: RotorParams): number; export function staticOmega(p: RotorParams, vEff: number): number; export function rotorRate(p: RotorParams, omega: number, vEff: number, axial_mps: number, rho: number, h: RotorHealth): RotorOut; export function inflowFactor(p: RotorParams, omega: number, axial_mps: number): number; export function spinDown(p: RotorParams, omega0: number, t_s: number): number` |
| Data model | Uses `RotorParams` (T-B19-01). Equations (DRONE 6.2, 7.1): `ke = kt = 60 / (2 pi kv)`; `T = kT omega^2 f(J)`; `Q = kQ omega^2`; `kT = ct0 rho D^4 / (4 pi^2)`; `kQ = cp0 rho D^5 / (8 pi^3)`; `I = (vEff - ke omega) / R`; motor torque `kt (I - I0)`; `J_r domega/dt = tau_motor - Q`. `vEff = duty vPack eta_esc` (efficiency folded in as a factor, DRONE 6.2, an iynk assumption shown on screen) |
| Input and output schemas | As signatures. All SI. `omega >= 0` rad/s. The signed handedness is carried by `dir_actual` and `handed`, not by the sign of `omega` |
| API, permissions, migration | None. None. None |
| Algorithm | `staticOmega`: `b = kt ke / R`, `c = kt (vEff / R - I0)`; if `c <= 0` return 0; else `omega = (-b + sqrt(b^2 + 4 kQ c)) / (2 kQ)` (one root, no iteration). `inflowFactor`: `J = axial / (n D)` with `n = omega / 2 pi`; with `ct_vs_j` interpolate linearly and divide by the value at J = 0; else `max(0, 1 - J / (0.9 pitch / D))` (the 0.9 and the straight line are iynk assumptions, shown); negative axial speed (descent) is clamped at J = 0 (no windmill state, listed "not modelled yet"). `rotorRate`: `dir_actual = p.dir * (h.phaseSwapped ? -1 : 1)`; `handed = dir_actual === p.propSpin`; `f = handed ? 1 : p.reverse_thrust_factor`; thrust `= kT omega^2 inflow f h.ctFactor`; load torque `Q = kQ omega^2` (its direction follows `dir_actual`; its magnitude does not depend on handedness); motor torque: `I = (vEff - ke omega) / R`; if `I < 0` then `I = p.brake ? max(I, -p.i_cont_a) : 0`; `tau = kt (I - sign(omega) * I0)` for `omega > 1e-3`, else `kt max(0, I - I0)`; `h.motorOut` forces `tau = 0`; `h.driveScale` multiplies `tau` when positive. Derivative: `domega = (tau - Q) / J_r` when `jr_kgm2 > 0`; else `domega = (staticOmega(vEff) - omega) / tau_assumed_s` (derivative form of the lag so RK4 treats both the same; the commit body notes DRONE 6.2 says "exact discretisation" and why the derivative form is used). `drive: 'normalised'`: `thrust = kT omega^2`, `staticOmega = vEff`, `domega = (vEff - omega) / tau_assumed_s` (the prototype form) |
| State, validation, errors | Pure and stateless. Non-finite input returns `domega: 0` and sets `current_a` to `NaN`-free zero plus a `flight-warn` code `rotor-nonfinite` through the caller (the function returns a flag `bad: true` in `RotorOut`; add the field). Sign rule fixed by test: the reaction torque on the body about +z is `-dir_actual * Q` (CCW rotor pushes the body clockwise; Q3: DRONE 7.1's plus sign is wrong, `quad.mjs` line 14 uses `tz += -Q[i]`) |
| Edge cases | `c <= 0` (voltage below back-EMF plus losses: rotor does not turn). `omega` slightly negative from RK4 stages: clamp at 0 inside `rotorRate` only for the load and thrust, not for the state (the integrator clamps the state after each full step). `ct_vs_j` with 2 points. `tau_assumed_s` under 5 steps: caller emits `flight-warn rotor-tau-short` (DRONE 7.1 step guard). Brake false with large negative current: freewheel |
| Performance | No allocation per call (returns a reused object via an optional `out` argument). Under 0.3 microsecond per rotor call (ESTIMATED) |
| Unit tests | `rotor.test.ts`: (1) DA-04 at rotor level: 10,000 seeded parts inside the schema ranges, torque residual under 1e-9 N m, thrust non-decreasing in duty; (2) cross-check with B18 `propulsion.ts` on 1,000 parts: omega equal within 1e-9 relative (skip with a named reason if B18 exports no static solve); (3) ODE from rest at constant duty reaches `staticOmega` within 1e-6 relative by 2 s (RK4 1 kHz, test-local); (4) spin-down against the closed form with `motorOut`; (5) reverse handedness gives `reverse_thrust_factor` of thrust and the same torque magnitude; (6) phase swap flips `dir_actual`; (7) brake off keeps current at 0 when back-EMF exceeds drive; (8) inflow: thrust falls to 0 at `J = 0.9 pitch / D`; (9) reaction torque sign; (10) normalised drive reproduces the prototype `T = 12 N * o^2` and lag; (11) prototype hover command `sqrt(m g / (4 Tmax))` equals 0.3645 for 0.65 kg and 12 N |
| Integration tests | None here (T-B19-10 uses it) |
| Playwright | None |
| Fixtures | `src/sim/flight/testdata/parts.rotor.json`: three motor and propeller records (illustrative, copied from the DRONE section 0 prototype table: 1750 Kv, R 0.045 ohm, I0 1.6 A, 0.1295 m propeller, Ct0 0.20, Cp0 0.14, 16 V). Labelled illustrative; not a real part |
| Acceptance | Given the prototype motor at 16 V and duty 0.5, When `staticOmega` and thrust are computed, Then rpm is 13,100 within 1 percent and thrust 3.28 N within 1 percent (the prototype table, VERIFIED as a prototype). Given `motorOut`, When the rotor spins down, Then speed equals the closed form |
| Observability, release blockers | `bad: true` is surfaced as a `flight-warn` by T-B19-15. Blocker: a call to a banned `Math` function; `NaN` out |
| Definition of done | `rotor.ts`, test and fixture committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/rotor.test.ts src/sim/flight/ban.test.ts`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: the equations, the sign rule, the derivative-form decision. Revert the commit |
| Later tasks need | `rotorRate`, `staticOmega`, `veff`, `HEALTHY`, `RotorHealth`, `spinDown` (10, 13, 15, 17) |

---

### T-B19-07 Drag, wind, gusts, environment mapping

| Field | Content |
|---|---|
| Identity | T-B19-07 / environment and aerodynamics, `src/sim/flight` / B19 / P0, size M / depends on T-B19-01 / not started |
| Problem | The game has the same drag on every axis and a two-sine wind of the step counter (`sim.ts:290-299`). F-218 needs seeded wind with gusts, air density, and sensor failures recorded in the replay (R-176). DA-26 needs one converter between the stored environment and the engine type |
| Target user | The integrator (10), failures (17), bench set (19), the person choosing wind and a failure schedule |
| User story | As someone practising before a real flight, I set 6 m/s wind with gusts and a GPS loss at 30 s, and every run with the same seed repeats exactly |
| Expected behaviour | Per-axis body drag plus rotor linear drag; wind as mean plus Ornstein-Uhlenbeck gusts plus optional one-minus-cosine gusts; air density from temperature and pressure; the stored `DroneEnvironment` converts to the engine `EnvironmentState` in one function, and sensor failures become `fault` input entries |
| Success metric | DA-26: every field of the DRONE 9.2 mapping table holds, a field added to the schema without a table row fails the test; OU gust variance over 100,000 steps within 3 percent of `sigma^2`; density at 15 degC and 101325 Pa is 1.225 kg/m^3 to 4 digits |
| Existing files | `src/lib/flight/sim.ts:290-299` (`windAt`, stays for `flight-game@1`, not edited), `schemas/drone.domain.schema.json` `$defs.DroneEnvironment` (the stored form, VERIFIED), SIMULATION 12.1 (`EnvironmentState`, `WindModel`). Precondition: `grep -rn "interface EnvironmentState" src/sim` ; if absent this task adds `src/sim/env.ts` with the SIMULATION 12.1 types (a 4th source file) |
| New files | `src/sim/flight/drag.ts`, `wind.ts`, `environment.ts` (3 source files; `src/sim/env.ts` only if the type is missing). Tests: `drag.test.ts`, `wind.test.ts`, `environment.test.ts` |
| Modules and signatures | `drag.ts`: `export interface DragParams { cdA_m2: Vec3; k_lin: number; rho: number }; export function dragForceBody(vBody: Vec3, p: DragParams): Vec3`. `wind.ts`: `export interface GustEvent { at_ns: number; v_g_mps: Vec3; duration_ns: number }; export class WindField { constructor(w: { mean: Vec3; gust: { kind: 'none' \| 'ou'; sigma: number; tauS: number } }, discrete: readonly GustEvent[], seed: number); step(t_ns: number, dt_s: number): Vec3; current(): Vec3; hashInto(h: StateHasher): void; reset(): void }`. `environment.ts`: `export interface DroneEnvironment { temperature_degC: number; pressure_pa?: number; altitude_msl_m: number; wind: { mean_mps: Vec3; gust: { kind: 'none' \| 'ou'; sigma_mps: number; tau_s: number }; discrete?: Array<{ at_ns: number; v_g_mps: Vec3; duration_ns: number }> }; sensorFailures: Array<{ at_ns: number; sensor: 'gyro' \| 'accel' \| 'baro' \| 'gps' \| 'rx'; mode: 'dropout' \| 'stuck' \| 'bias' \| 'noise-x10'; duration_ns?: number }> }; export function toEnvironmentState(env: DroneEnvironment): EnvironmentState; export function discreteGusts(env: DroneEnvironment): GustEvent[]; export function failureEntries(env: DroneEnvironment): InputEntry[]; export function airDensity(tempC: number, pressurePa: number): number; export function pressureFromAltitude(h_m: number): number; export const ENV_FIELD_MAP: ReadonlyArray<{ doc: string; engine: string \| null; how: 'copy' \| 'derive' \| 'beside' \| 'entries' }>` |
| Data model | `ENV_FIELD_MAP` is the DRONE 9.2 table as data: `temperature_degC` to `temperatureCelsius` (copy); `pressure_pa` to `pressurePa` (copy, derived from altitude when absent); `wind.mean_mps` to `wind.mean`; `wind.gust.kind` to `wind.gust.kind`; `sigma_mps` to `sigma`; `tau_s` to `tauS`; `wind.discrete` to none (passed beside); `altitude_msl_m` to none (consumed); `sensorFailures[]` to none (becomes entries). Engine defaults for `lightLux`, `surfaces`, `obstacles`, `magneticFieldTesla` come from SIMULATION 12.1. The course supplies obstacles |
| Input and output schemas | Stored form is the schema's, snake_case with unit suffixes (RC-42); engine form is camelCase SI. `failureEntries` output: for each failure an `InputEntry {at: at_ns, seq: index, kind: 'fault', target: 'sensor:<sensor>', value: {mode, on: true}}` and, when `duration_ns` is set, a clearing entry at `at_ns + duration_ns` with `on: false`; sorted by `(at, seq)` |
| API, permissions, migration | None. None. None |
| Algorithm | Drag (DRONE 7.1, whose text is cut after "\|v_rel\|^"; this plan fixes it): per body axis `F_i = -0.5 rho cdA_i \|v_i\| v_i`, plus rotor linear drag `-k_lin * [v_x, v_y, 0]`, with `v` the body-frame air-relative velocity. Wind OU, exact discretisation, per axis: `x_{k+1} = x_k e^{-dt/tau} + sigma sqrt(1 - e^{-2 dt/tau}) N(0,1)` using `fmath.exp`, `sqrt` and `gauss` on stream `wind`; three draws a step in x, y, z order whether or not the kind is `ou` (so the stream never shifts); `tau = 0` is refused by validation. Discrete gust: for `t` in `[0, D]` the velocity is `v_g / 2 (1 - cos(2 pi t / D))`, which is DRONE 9.2's formula read with its `T` as half the duration so the gust returns to zero (ASSUMED reading; standard certification "1 - cosine" gust). Several gusts add. Density `rho = p / (287.05 (T + 273.15))`. Standard atmosphere pressure `p = 101325 (1 - 2.25577e-5 h)^5.25588` coded as `exp(5.25588 log(1 - 2.25577e-5 h))` (EXTERNAL: ISA, recalled) |
| State, validation, errors | `WindField` state is the three OU values and the rng; `reset()` re-seeds. Validation: wind speeds within the schema bounds; `tau_s > 0` when `kind` is `ou`; at most 32 discrete gusts and 32 failures; `at_ns` integer. Violations return a typed `EnvIssue[]` from `validateEnvironment(env)` (add to the module) |
| Edge cases | Altitude 9000 m (pressure under 1000 Pa is refused by the schema). Overlapping gusts. `duration_ns` omitted (failure lasts to the end). A failure at `at_ns = 0`. Gust duration under one step |
| Performance | `WindField.step` under 0.2 microsecond (ESTIMATED) |
| Unit tests | `drag.test.ts`: sign, symmetry, zero at rest, quadratic scaling, frame handling. `wind.test.ts`: OU mean 0 and variance within 3 percent over 100,000 steps; same seed same sequence; adding a draw on stream `sensor:gps` does not change the wind sequence; 1-cos gust peak at the half time equals `v_g`; returns to 0. `environment.test.ts` (DA-26): round trip of every row; the test reads the schema file `$defs.DroneEnvironment.properties` and fails if a property is not in `ENV_FIELD_MAP`; `failureEntries` integer ns, order, clearing entries; `airDensity(15, 101325)` = 1.225 to 4 digits; pressure at 1000 m = 89,875 Pa to 0.1 percent (ISA table, EXTERNAL) |
| Integration tests | None here |
| Playwright | None |
| Fixtures | None stored |
| Acceptance | Given any `DroneEnvironment`, When `toEnvironmentState` runs, Then every row of the mapping holds and sensor failures are `fault` entries with integer ns. Given the same seed, When the wind runs twice, Then it is identical |
| Observability, release blockers | None. Blocker: a `DroneEnvironment` field with no map row |
| Definition of done | Three files (or four), three tests committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/drag.test.ts src/sim/flight/wind.test.ts src/sim/flight/environment.test.ts src/sim/flight/ban.test.ts`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: the drag form, the gust reading. Revert the commit |
| Later tasks need | `dragForceBody`, `WindField`, `toEnvironmentState`, `failureEntries`, `airDensity`, `validateEnvironment` (10, 15, 17, 19) |

---

### T-B19-08 Sensors with noise, bias and failure modes

| Field | Content |
|---|---|
| Identity | T-B19-08 / sensors, `src/sim/flight` / B19 / P0, size M / depends on T-B19-01 / not started |
| Problem | The game has no sensors (`flight.md`, DRONE 3.2). F-218 needs IMU, barometer and GPS noise and failures, and the estimator needs something to estimate from. A wrong FC orientation or a gyro bias must produce a real failure |
| Target user | The estimator (11), the model (15), failures (17) |
| User story | As someone practising a GPS loss, I see my position hold drift because the GPS reading stopped, not because a script moved the craft |
| Expected behaviour | Gyro, accelerometer, barometer and GPS read the true state with seeded noise, bias random walk, quantisation, sample rates and latency; failures set a sensor to dropout, stuck, bias or ten times noise; the FC mount yaw rotates the IMU frame |
| Success metric | Gyro noise standard deviation within 3 percent of the configured value over 200,000 samples; bias variance grows as `sigma_rw^2 t` within 10 percent; GPS reading at `t` equals the truth at `t - latency` exactly; adding or removing a consumer does not change another sensor's sequence (hash equal) |
| Existing files | SIMULATION 12.2 (`SensorModel`), DRONE 9.1. Sample rates follow `step_hz`. No existing flight sensor code |
| New files | `src/sim/flight/sensors.ts` (1 source file). Tests: `sensors.test.ts` |
| Modules and signatures | `export interface ImuParams { gyro: { noise_dps_rthz: number; bias_rw_dps_rts: number; bias_init_dps: number; range_dps: number; bits: number; lpf_hz: number }; accel: { noise_ug_rthz: number; bias_mg: number; range_g: number; bits: number }; baro: { noise_m: number; drift_m_rts: number; rate_hz: number }; gps: { pos_h_m: number; pos_v_m: number; vel_mps: number; rate_hz: number; latency_ns: number }; source: string }; export const DEFAULT_IMU: ImuParams; export type SensorName = 'gyro' \| 'accel' \| 'baro' \| 'gps' \| 'rx'; export type SensorMode = 'ok' \| 'dropout' \| 'stuck' \| 'bias' \| 'noise-x10'; export interface SensorTruth { w: Vec3; specificForce: Vec3; p: Vec3; v: Vec3; q: Quat }; export interface SensorReadings { gyro: Vec3; accel: Vec3; baro_m: number \| null; gps: { p: Vec3; v: Vec3 } \| null; gyroOk: boolean; accelOk: boolean }; export class SensorSuite { constructor(p: ImuParams, seed: number, stepHz: number); setMode(s: SensorName, m: SensorMode, magnitude?: number): void; setMountYaw(deg: number): void; sample(t_ns: number, truth: SensorTruth): SensorReadings; trueBias(): Vec3; hashInto(h: StateHasher): void }` |
| Data model | `DEFAULT_IMU` values, each shown on screen with `source: 'iynk assumption'` (Q9): gyro 0.005 deg/s/sqrt(Hz), bias random walk 0.01 deg/s/sqrt(s), initial bias 0.2 deg/s, range 2000 deg/s, 16 bits, sensor low-pass 250 Hz; accelerometer 400 micro-g/sqrt(Hz), bias 5 milli-g, range 16 g, 16 bits; barometer 0.1 m, drift 0.02 m/sqrt(s), 50 Hz; GPS 0.5 m horizontal, 1.0 m vertical, 0.05 m/s, 10 Hz, 100 ms latency. All HYPOTHESIS (DK-7) until a part cites a datasheet |
| Input and output schemas | As signatures. Streams: `sensor:gyro`, `sensor:accel`, `sensor:baro`, `sensor:gps` (three Gaussian draws each sample tick, taken even in failure so the stream never shifts) |
| API, permissions, migration | None. None. None |
| Algorithm | Gyro per step: `sigma = noise * sqrt(rate / 2)` (noise density to per-sample, Nyquist bandwidth); bias `b += rw * sqrt(dt) * N`; reading `= lpf(w + b + n)` with a first-order filter `a = 1 - exp(-2 pi f dt)`; quantise to `LSB = 2 range / 2^bits`; clamp to range; rotate by `Rz(-mountYaw)`. Accelerometer: same with specific force in the body frame and bias; the model supplies `specificForce = (thrust + drag) / mass` in body axes. Barometer every `step_hz / rate_hz` steps: `h + b + n`, `b` random walk. GPS every `step_hz / rate_hz` steps: push `{p + n, v + n}` into a ring and deliver the sample stamped at least `latency_ns` ago (exact ns compare); between updates return `null`. Modes: `dropout` gives `gyroOk: false` or `baro_m: null` or `gps: null`; `stuck` repeats the last good reading; `bias` adds `magnitude` (default 5 deg/s gyro, 0.5 g accel, 10 m baro, 20 m GPS); `noise-x10` multiplies sigma by 10 |
| State, validation, errors | State: biases, filters, rings, the four rng streams, last readings. `setMode` with an unknown sensor throws `RangeError`. Parameters outside sane bounds (negative noise, `latency_ns` over 2 s, `bits` outside 8 to 24) are refused by `validateImu(p)` (add) |
| Edge cases | GPS ring empty at the start (returns `null` until the first sample is old enough). `latency_ns` of 0. `step_hz` not a multiple of 50 (allowed rates 500, 1000, 2000 all are). A mode change mid-step. Mount yaw of 180 degrees flips the sign of x and y gyro and accelerometer readings |
| Performance | Under 1 microsecond per step for all four sensors (ESTIMATED; Gaussian draws dominate) |
| Unit tests | `sensors.test.ts`: statistics (noise sigma, bias growth, quantisation steps, clamping); latency exactness; each mode; mount yaw 180; stream independence (run A with GPS consumed, run B without, gyro sequences equal by hash); determinism over ten runs; `validateImu` |
| Integration tests | None here (T-B19-11 and 15 use it) |
| Playwright | None |
| Fixtures | None stored |
| Acceptance | Given a stationary truth, When the gyro runs 200,000 samples, Then the sample deviation is within 3 percent of `noise * sqrt(rate/2)`. Given `gps` set to `dropout`, When sampled, Then it returns `null` and the gyro sequence is unchanged |
| Observability, release blockers | None. Blocker: an unsourced default presented as a fact in the UI |
| Definition of done | File and test committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/sensors.test.ts src/sim/flight/ban.test.ts`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: the defaults table (T-B19-30 prints it with "iynk assumption"). Revert |
| Later tasks need | `SensorSuite`, `DEFAULT_IMU`, `SensorName`, `SensorMode` (11, 15, 17) |

---

### T-B19-09 Flight controller parameters and mixer

| Field | Content |
|---|---|
| Identity | T-B19-09 / flight controller data and mixer, `src/sim/flight` / B19 / P0, size L / depends on T-B19-01 / not started |
| Problem | The controller needs a typed parameter table with ranges, defaults per craft class and a mixer built from the motor layout (ADR-0713). Today the only parameters are CLI strings and canned effects (`cli.ts:249`) |
| Target user | The controller (12), CLI bridge (14), model (15), parameter dump (16), panel (22) |
| User story | As someone with a hexacopter, I get a mixer that fits my motor layout and refuses a layout that cannot control yaw |
| Expected behaviour | `FcParams` matches the drone domain schema; every number has a range from the CLI limits; `validateFcParams` reports each bad path; defaults come per class with a source note; `buildMixer` computes the matrix from motor positions and spins and reports `DB-E-MIXER` when the layout has fewer than 3 independent control rows; `mix` desaturates and quantises |
| Success metric | The `drone-quad` example's `fcParams` validates; a 3-motor layout without a tail servo gives `DB-E-MIXER`; the mixer reproduces a unit roll command as `+y_i / L` weights on the X quad; saturation handling keeps every command in `[idle, 1]` |
| Existing files | `schemas/drone.domain.schema.json` `$defs.FcParams` (VERIFIED), `src/content/drones/quad5.ts:443-469` (limits table), `src/lib/flight/math.ts:36` (`expo`, the stick law), `cli.ts:221-241` (`parseValue`, ranges). B18 `checks.ts` owns DB-C-12 (loop rates) and is not edited |
| New files | `src/sim/flight/params.ts`, `mixer.ts` (2 source files). Tests: `params.test.ts`, `mixer.test.ts` |
| Modules and signatures | `params.ts`: `export type Axis = 'roll' \| 'pitch' \| 'yaw'; export interface RateSet { rc_rate: number; expo: number; super_rate: number }; export interface FcParams { rates: Record<Axis, RateSet>; pid: Record<'p_roll'\|'i_roll'\|'d_roll'\|'ff_roll'\|'p_pitch'\|'i_pitch'\|'d_pitch'\|'ff_pitch'\|'p_yaw'\|'i_yaw'\|'d_yaw'\|'ff_yaw', number>; filters: { gyro_lpf_hz: number; dterm_lpf_hz: number }; mixer: { airmode: boolean; idle_percent: number; thrust_linearisation: number }; angle: { limit_deg: number; strength: number }; failsafe: { rx_loss_action: 'drop' \| 'land'; delay_ms: number }; modes: Array<{ mode: string; aux: number; range_us: [number, number] }> }; export const FC_LIMITS: Readonly<Record<string, { min: number; max: number; unit: string }>>; export const STEP_HZ_ALLOWED: readonly [500, 1000, 2000]; export const GAIN_SCALE: { p: number; i: number; d: number; ff: number }; export type FcProfile = 'freestyle5' \| 'whoop' \| 'cine' \| 'longrange' \| 'hex' \| 'octo'; export function defaultFcParams(p: FcProfile): { params: FcParams; source: string }; export function validateFcParams(v: unknown): { ok: true; value: FcParams } \| { ok: false; issues: Array<{ path: string; code: 'type' \| 'missing' \| 'range'; min?: number; max?: number }> }; export function rateDps(r: RateSet, stick: number): number; export function axisGains(p: FcParams, axis: Axis): { kp: number; ki: number; kd: number; kff: number }`. `mixer.ts`: `export interface MixerRotor { pos_m: Vec3; dir: 1 \| -1; kT: number; kQ: number }; export interface Mixer { n: number; rows: Float64Array /* n x 4: roll, pitch, yaw, thrust */; arm_m: number; torquePerUnit: Vec3 /* N m per unit command at hover */ }; export function buildMixer(rotors: readonly MixerRotor[]): { ok: true; mixer: Mixer } \| { ok: false; code: 'DB-E-MIXER'; rank: number }; export function mix(m: Mixer, thr: number, torque: Vec3, o: { airmode: boolean; idle: number }, out: Float64Array): { saturated: boolean }; export function thrustLinearise(x: number, a: number): number; export function quantiseDshot(x: number, protocol: 'pwm' \| 'oneshot' \| 'dshot150' \| 'dshot300' \| 'dshot600'): number` |
| Data model | Names follow the CLI where it has them (`p_roll`, `roll_rc_rate`, ...) so one table serves CLI, controller and export (DRONE 5.4). `FC_LIMITS` keys are dotted paths (`pid.p_roll`, `rates.roll.rc_rate`, `angle.limit_deg`, `failsafe.delay_ms`, ...). The CLI limits tighten the schema's structural bounds (HYPOTHESIS bounds in the schema description): e.g. `angle.limit_deg` 10 to 80 (quad5.ts:455), `rates.*.rc_rate` 1 to 255, `rates.*.expo` 0 to 100, `rates.*.super_rate` 0 to 255 (schema says 0 to 100; the CLI table says 0 to 255: the CLI wins for ranges, listed in the commit body as a schema note), `angle.strength` 0 to 200, `failsafe.delay_ms` 0 to 20000 (CLI max 200 in 0.1 s units; schema max 10000: the smaller, 10000, wins) |
| Input and output schemas | Validation issue paths use dots (`pid.p_roll`). Defaults: `freestyle5` equals the `drone-quad` example values (P 45/47/45, I 80/84/80, D 30/34/0, FF 120/125/120; rates 20, 54, 67/67/20; filters 250 and 150; airmode true, idle 5.5, linearisation 20; angle 38 and 50; failsafe drop 1500 ms), source "iynk default for 5-inch freestyle, not Betaflight's". The other profiles are scaled from it and carry the same note (HYPOTHESIS) |
| API, permissions, migration | None. None. None |
| Algorithm | `rateDps(r, x)`: `xe = x (1 - e) + x^3 e` with `e = expo / 100` (the game's law, `math.ts:36`); `dps = xe * (rc_rate * 10 + (super_rate * 10 - rc_rate * 10) * \|xe\|)` (an iynk law shaped like Betaflight's ACTUAL rates: centre slope `rc_rate * 10`, end `super_rate * 10`; not Betaflight's formula). `GAIN_SCALE` starts from loop-bandwidth design on the prototype craft: choose the rate-loop crossover near 40 Hz with `Kp_si = J * 2 pi * 40 / torquePerUnit` and convert with the `p` value of the profile; the numbers and the arithmetic go in the commit body; T-B19-15 tunes them in the closed loop (Q5). `buildMixer`: roll row `y_i / L`, pitch row `-x_i / L`, yaw row `-dir_i` (sign fixed by T-B19-06's test), thrust row 1; `L` = mean arm length; rank of the 3 x n effectiveness matrix `[y_i kT, -x_i kT, -dir_i kQ]` by Gaussian elimination with tolerance 1e-9 relative to the largest entry; rank under 3 gives `DB-E-MIXER`. `mix`: `cmd_i = thrust_cmd_i + sum_axes row * torque`; airmode on: if `max - min > 1 - idle` scale the torque part so the spread fits, then shift all commands into `[idle, 1]`; airmode off: reduce the yaw part first until the spread fits or yaw is zero, then clip (the order of DRONE 7.4). `thrustLinearise(x, a) = (1 - a) x + a sqrt(x)` with `a = thrust_linearisation / 100`. `quantiseDshot`: round to 1/2000 for DShot protocols, none for pwm |
| State, validation, errors | Pure. `validateFcParams` never throws on hostile input; unknown extra keys are issues (`type`). `mix` writes into `out` and returns a flag |
| Edge cases | Hex and octo layouts (rank 3 or more). Two motors at the same position. Zero arm length (refused as rank 0). Yaw-only saturation. `idle_percent` 30 (the maximum). NaN torque (treated as 0 and `saturated: true`) |
| Performance | `mix` for 12 motors under 0.5 microsecond; no allocation |
| Unit tests | `params.test.ts`: the example `fcParams` validates; one case per range edge (min, max, one beyond); missing group; extra key; defaults for each profile validate; `rateDps` at 0, 0.5, 1 against hand arithmetic; `STEP_HZ_ALLOWED`. `mixer.test.ts`: X quad rows; plus quad; H quad; hex and octo ranks; tricopter without servo gives `DB-E-MIXER`; coaxial octo rank; desaturation cases (airmode on and off) with exhaustive small grid; torque authority sums; DShot rounding |
| Integration tests | None here |
| Playwright | None |
| Fixtures | `src/sim/flight/testdata/drone-quad.fcparams.json` (copied unchanged from the example's `fcParams`, with the example's file hash recorded in the test) |
| Acceptance | Given the example `fcParams`, When validated, Then `ok`. Given a layout of three motors, When `buildMixer` runs, Then `DB-E-MIXER` with rank 2. Given airmode on and a command that would clip, When mixed, Then every output lies in `[idle, 1]` and the spread is preserved |
| Observability, release blockers | None. Blocker: a Betaflight scale constant copied from firmware source (council Q13): the commit body states how `GAIN_SCALE` was derived |
| Definition of done | Two files, two tests, one fixture committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/params.test.ts src/sim/flight/mixer.test.ts src/sim/flight/ban.test.ts`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: the rate law, the range sources, the schema range notes. Revert |
| Later tasks need | `FcParams`, `FC_LIMITS`, `validateFcParams`, `axisGains`, `rateDps`, `buildMixer`, `mix`, `Mixer.torquePerUnit`, `STEP_HZ_ALLOWED` (12, 14, 15, 16, 21, 22) |

---

### T-B19-10 Rigid-body integrator (RK4 and Euler)

| Field | Content |
|---|---|
| Identity | T-B19-10 / rigid-body dynamics, `src/sim/flight` / B19 / P0, size L / depends on T-B19-01, 06, 07 / not started |
| Problem | There is no 6-DoF body, no inertia and no body rate state today (`sim.ts:26-94`, point mass with Euler angles). F-074a and everything after it need translation, rotation and rotors integrated together |
| Target user | The model (15) and, through it, every flight |
| User story | As someone who flips a drone, I see it rotate the way a body with my inertia does, and gyroscopic effects exist |
| Expected behaviour | One function gives the time derivative of the packed state; RK4 and semi-implicit Euler steppers advance it by one fixed step; controller and sensor outputs are held constant across the step; the quaternion is renormalised each step |
| Success metric | DA-08: on a flip scenario RK4 at 1 kHz stays within 1e-6 rad/s of a 10 kHz RK4 reference, and both RK4 and Euler errors are recorded; angular momentum of a torque-free asymmetric body is conserved to 1e-9 over 10 s; hover equilibrium holds to 1e-9 over 10 s |
| Existing files | `/Users/amar/iynk-master-plan-scratch/design/robotics-drone/quad.mjs` (prototype of the same equations; not imported). T-B19-01 `IDX`, `RigidState`; T-B19-06 `rotorRate`; T-B19-07 `dragForceBody` |
| New files | `src/sim/flight/rigid.ts` (1 source file). Tests: `rigid.test.ts`, `rigid.flip.test.ts` |
| Modules and signatures | `export interface RigidInputs { vEff: Float64Array; health: readonly RotorHealth[]; wind: Vec3 }; export interface RigidCtx { p: RigidParams; jInv: Mat3; n: number }; export function makeCtx(p: RigidParams): RigidCtx; export function stateSize(n: number): number; export function initState(p: RigidParams, pos: Vec3, q: Quat, omega0: readonly number[]): Float64Array; export function derivative(x: Float64Array, u: RigidInputs, c: RigidCtx, out: Float64Array, aux?: RigidAux): void; export function stepRk4(x: Float64Array, u: RigidInputs, c: RigidCtx, dt: number, s: Scratch): void; export function stepEuler(x: Float64Array, u: RigidInputs, c: RigidCtx, dt: number, s: Scratch): void; export function makeScratch(n: number): Scratch; export interface RigidAux { thrust: number[]; qLoad: number[]; current: number[]; specificForce: Vec3; thrustTotal: number }` |
| Data model | Packed state `[p(3), v(3), q(4), w(3), omega(n)]` using `IDX`. `Float64Array`, one per flight, scratch buffers allocated once |
| Input and output schemas | World frame is ENU-like game axes (x east, y north, z up, `types.ts:1-3`); body frame FLU. `v` world, `w` body, `q` body to world |
| API, permissions, migration | None. None. None |
| Algorithm | Equations (DRONE 7.1, with the Q3 sign): translation `m dv/dt = R(q) sum_i (T_i a_i) + F_drag(R^T(v - wind)) - m g e_z`; rotation `J dw/dt = sum_i (r_i x T_i a_i) + sum_i (-dir_i Q_i a_i) - w x (J w) - sum_i dir_i J_r domega_i/dt a_i - w x (sum_i dir_i J_r omega_i a_i)`; rotor `domega_i/dt` from `rotorRate`; `dq/dt = 0.5 q (x) (0, w)`. `J` is the full symmetric tensor from `massProperties`; rotor thrust axes `a_i` need not be +z. RK4: four stages over the whole vector with `u` held; after the step `normalise q` and `omega_i = max(0, omega_i)`. Euler (semi-implicit): update `v` and `w` and `omega` first, then `p` and `q` from the new `v` and `w`. `aux` carries thrust, load torque, phase current per rotor and the specific force (thrust plus drag over mass, in body axes) for the sensors and battery, evaluated at stage 1 |
| State, validation, errors | No hidden state. A non-finite state after a step sets `aux` flag `diverged` through the return of `stepRk4` (return `true` when finite); the model (15) stops the run with `flight-warn state-nonfinite` |
| Edge cases | Zero thrust (free fall). `dt` of 0.5 ms, 1 ms, 2 ms. A rotor with `domega` stiff (time constant under 5 steps): works, warns in T-B19-15. Quaternion drift after 10^6 steps (renormalised each step; test) |
| Performance | One RK4 step for 4 rotors: prototype 1.92 microseconds including PID and logging (VERIFIED as prototype). Target under 8 microseconds for 12 rotors (ESTIMATED). No allocation per step (test counts nothing; a review rule) |
| Unit tests | `rigid.test.ts`: free fall `v_z = -g t` to 1e-9; hover equilibrium (duty from `staticOmega` so `sum T = m g`) holds position to 1e-9 over 10 s; torque-free asymmetric body (distinct principal moments, rotor-less) conserves `\|J w\|` and kinetic energy to 1e-9 over 10 s; yaw sign: spinning up the CCW rotors gives negative `w_z` acceleration; a pure roll torque from unequal thrust gives the sign of `y_i T_i`; gyroscopic term present (non-zero cross-coupling when `omega` high and `w` non-zero, compared with the term removed); quaternion stays unit after 10^6 steps. `rigid.flip.test.ts` (DA-08): scripted open-loop commands for a 360 degree roll in about 0.5 s; run RK4 at 1 kHz, Euler at 1 kHz, RK4 at 10 kHz; assert RK4 1 kHz within 1e-6 rad/s of the reference over the run; print both errors; assert Euler is recorded (no pass threshold) |
| Integration tests | `rigid.test.ts` also reproduces the prototype's hover: 0.65 kg, four 12 N rotors in `normalised` drive, `Ixx = Iyy = 2.5e-3`, `Izz = 4.5e-3`, lag 30 ms: hover command 0.3645 and zero drift over 5 s |
| Playwright | None |
| Fixtures | `src/sim/flight/testdata/prototype-quad.params.json` (the prototype craft as `RigidParams`) |
| Acceptance | Given the flip scenario, When run at 1 kHz with RK4, Then the error against the 10 kHz reference is under 1e-6 rad/s and the Euler error is printed. Given a torque-free spinning body, When integrated for 10 s, Then angular momentum magnitude is conserved to 1e-9 |
| Observability, release blockers | `diverged` flag. Blocker: allocation inside `stepRk4`; a banned `Math` call |
| Definition of done | File, two tests, fixture committed; both DA-08 errors in the commit body |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/rigid.test.ts src/sim/flight/rigid.flip.test.ts src/sim/flight/ban.test.ts`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: the DA-08 numbers and the RK4 or Euler decision (DRONE 7.1: switch to Euler only if RK4 shows no benefit and cost matters). Revert |
| Later tasks need | `stepRk4`, `stepEuler`, `derivative`, `initState`, `makeCtx`, `RigidAux` (13, 15, 17, 19) |

---

### T-B19-11 Complementary estimator

| Field | Content |
|---|---|
| Identity | T-B19-11 / state estimation, `src/sim/flight` / B19 / P0, size M / depends on T-B19-01, 08 / not started |
| Problem | The controller must act on estimates, not truth, or sensor faults mean nothing (DRONE 9.1). No estimator exists |
| Target user | The controller (12), the model (15), the autopilot swap (18) |
| User story | As someone with a bad gyro bias, I see the craft drift in yaw because the filter believes the gyro |
| Expected behaviour | A Mahony-style filter estimates attitude from gyro and accelerometer; altitude blends barometer and vertical acceleration; GPS corrects horizontal position and velocity with fixed gains; no EKF and no magnetometer. Heading starts from the true yaw and then drifts with the bias |
| Success metric | From a 5 degree attitude error the estimate converges to under 0.2 degrees in 3 s; a 0.5 deg/s constant gyro bias is estimated to within 0.05 deg/s in 60 s; with GPS dropout and an accelerometer bias of 5 milli-g position error grows roughly as `0.5 b t^2` (within 20 percent) |
| Existing files | None in flight. SIMULATION 12.2 for context |
| New files | `src/sim/flight/estimator.ts` (1 source file). Tests: `estimator.test.ts` |
| Modules and signatures | `export interface EstimatorGains { kp: number; ki: number; accelGate_g: number; kz_baro: number; kv_baro: number; kp_gps: number; kv_gps: number }; export const DEFAULT_GAINS: EstimatorGains; export interface EstimatorOutput { q: Quat; w: Vec3 /* bias-corrected gyro, rad/s */; p: Vec3; v: Vec3; euler: { yaw: number; pitch: number; roll: number } /* game degrees */ }; export class Estimator { constructor(g?: EstimatorGains); reset(init: { q: Quat; p: Vec3 }): void; update(dt_s: number, r: SensorReadings): EstimatorOutput; calibrateAccel(levelReading: Vec3): void; biasEstimate(): Vec3; hashInto(h: StateHasher): void }` |
| Data model | `DEFAULT_GAINS` (iynk assumptions, shown): `kp` 2.0 per second, `ki` 0.05 per second squared, accelerometer gate 0.3 g, `kz_baro` 5 per second, `kv_baro` 6 per second squared, `kp_gps` 2 per second, `kv_gps` 3 per second squared. Accelerometer offsets zero until `calibrateAccel` (the bench "acc" rule of DRONE 8.2 calls it; uncalibrated means the nominal bias stays in) |
| Input and output schemas | As signatures; `euler` is the game convention (`gameFromQ`) |
| API, permissions, migration | None. None. None |
| Algorithm | Attitude: `v_est = R(q)^T e_z`; error `e = a_n x v_est` (cross product of the normalised accelerometer and the predicted gravity direction), applied only when `\| \|a\| - g \| < accelGate * g`; `bias += ki e dt`; `w_corr = gyro - bias + kp e`; `q = qIntegrate(q, w_corr, dt)`. Altitude/vertical velocity: predict with the world-frame vertical specific force minus `g`; correct with baro: `z += kz (baro - z) dt`, `vz += kv (baro - z) dt`; no baro update that step means predict only. Horizontal: predict with accelerometer rotated by `q` minus gravity; GPS update when `r.gps` non-null: `p += kp_gps (gps.p - p) dt_gps`, `v += kv_gps (gps.v - v) dt_gps`, with `dt_gps` the time since the last GPS update (no latency compensation: the lag error is real). Heading: gyro integration only; the initial yaw equals the true yaw (assumption: a calibrated heading; no magnetometer in v1 so yaw drifts with the bias). `calibrateAccel` stores the level reading minus `[0,0,g]` and subtracts it afterwards |
| State, validation, errors | State: `q`, bias, `p`, `v`, last GPS time, offsets. A non-unit `q` is renormalised. Non-finite readings are ignored for that step and counted (`ignored` getter) |
| Edge cases | GPS or baro never arriving (dead reckoning, drift is the point). Free fall (accelerometer near zero: gate blocks the correction). Hard acceleration (gate). Gimbal lock in the Euler output only, never in the filter. Gyro dropout (`gyroOk` false): hold the last rate for 50 ms then zero |
| Performance | Under 1.5 microseconds per update (ESTIMATED) |
| Unit tests | `estimator.test.ts`: convergence from 5 degrees; bias estimate; constant-rate tracking within 0.1 degree; accelerometer gate; GPS dropout drift law; baro step response; heading drift from a gyro bias (yaw error grows with the bias times `t`); calibration; determinism over ten runs; mount yaw 180 (the IMU frame rotated): the attitude the estimator reports has roll and pitch opposite in sign to truth, the property T-B19-17 turns into the DA-10 flip |
| Integration tests | With `SensorSuite` on the prototype craft held level: after 10 s the estimate is within 0.3 degrees and 0.1 m (baro noise 0.1 m) |
| Playwright | None |
| Fixtures | None stored |
| Acceptance | Given a level craft with default sensors, When 10 s pass, Then roll and pitch estimate errors are under 0.3 degrees. Given a gyro bias, When 60 s pass, Then yaw error is about `bias * 60` degrees (the drift is physical) |
| Observability, release blockers | `ignored` count surfaced by the model as `flight-warn estimator-ignored` when above 0. Blocker: truth state read inside the estimator |
| Definition of done | File and test committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/estimator.test.ts src/sim/flight/ban.test.ts`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: gains table and the "no EKF, no magnetometer" statements. Revert |
| Later tasks need | `Estimator`, `EstimatorOutput`, `DEFAULT_GAINS` (12, 15, 18) |

---

### T-B19-12 Cascaded PID controller and altitude loop

| Field | Content |
|---|---|
| Identity | T-B19-12 / flight controller, `src/sim/flight` / B19 / P0, size L / depends on T-B19-01, 09 / not started |
| Problem | There is no controller; the game sets attitude by a lag toward the stick (`sim.ts:527-532`). F-074a, parameter bindings and PID tuning need an angle loop, a rate loop, filters and a vertical loop with the structure of DRONE 7.4 |
| Target user | The model (15); the person tuning gains |
| User story | As someone tuning P and D, I see overshoot and ringing change and I can fix them |
| Expected behaviour | Angle mode turns an angle setpoint into a rate setpoint; acro mode uses the rate law; the rate loop is PID with feed-forward, a gyro low-pass, a D-term low-pass on the measurement, conditional-integration anti-windup; a vertical loop turns a climb-rate setpoint into a throttle command; loops run at their own rates inside the step |
| Success metric | On the prototype craft (T-B19-10 fixture) with `freestyle5` gains and `GAIN_SCALE`, a 100 deg/s roll rate step has rise under 80 ms, overshoot under 20 percent, settle under 400 ms (the Q5 targets; final tuning in T-B19-15). Here: the loop structure is exact against a reference double-precision implementation written in the test |
| Existing files | `src/lib/flight/sim.ts:549-559` (the game's climb law, `need` at line 556; stays), `math.ts:36` (`expo`). T-B19-09 `axisGains`, `rateDps`, `thrustLinearise` |
| New files | `src/sim/flight/controller.ts`, `altitude.ts` (2 source files). Tests: `controller.test.ts`, `altitude.test.ts` |
| Modules and signatures | `export interface ControlInput { dt_s: number; step: number; attitude: 'angle' \| 'acro'; sticks: { throttle: number; yaw: number; pitch: number; roll: number }; angleSp: { pitch_deg: number \| null; roll_deg: number \| null }; yawRateSp_dps: number \| null; est: EstimatorOutput; gyro: Vec3 /* sensor reading, rad/s, before the controller's own filter */; armed: boolean; airborne: boolean; limits: { angle_deg: number; rateScale: number; expo: number } }; export interface ControlOutput { torque: Vec3 /* normalised roll, pitch, yaw */; rateSp: Vec3 /* rad/s */; saturated: boolean }; export class Controller { constructor(p: FcParams, loop: { stepHz: number; pidHz: number }); setParams(p: FcParams): void; reset(): void; update(i: ControlInput): ControlOutput; iterm(): Vec3; hashInto(h: StateHasher): void }`. `altitude.ts`: `export interface AltitudeGains { kp: number; ki: number; iMax: number }; export const DEFAULT_ALT: AltitudeGains; export class AltitudeHold { constructor(g: AltitudeGains, hoverTrim: number); reset(): void; update(dt_s: number, climbSp_mps: number, est: { vz: number }, tiltUpZ: number): number /* throttle command 0..1 */ }` |
| Data model | Controller state: I-terms, previous measurement for D, D-term filter state, gyro filter state, last setpoint for FF, held outputs between PID ticks, a saturation flag. Altitude state: integrator |
| Input and output schemas | The sign convention is fixed by tests, not prose: a positive game roll setpoint raises game roll; a positive pitch setpoint is nose down; a positive stick yaw lowers yaw angle (`sim.ts:545`: `yaw += -yawCmd * yawRate * dt`) |
| API, permissions, migration | None. None. None |
| Algorithm | Loop schedule: angle loop every `stepHz / (pidHz / 2)` steps (500 Hz at the default), rate PID every `stepHz / pidHz` steps; between ticks the held outputs are returned. Angle: `rate_sp = clamp(strength_si * (angle_sp - angle_est), +- rateMax)` with `strength_si = angle.strength / 50 * 8 per second` (iynk scale so the default 50 gives an 8 per second angle P; derived, not copied); angle error computed in game Euler degrees from `est.euler` (valid away from pitch +- 90; acro covers larger angles) with the yaw rate setpoint from the stick. Acro: `rate_sp = rateDps(rates, stick) * rateScale`. Rate loop per axis: `e = sp - gyroFiltered`; `P = kp e`; `I += ki e dt`, clamped to +- 0.3 of output range, integration held when the previous output was saturated in the same direction (conditional integration); `D = -kd * lowpass((meas - prevMeas) / dt)` with first-order low-pass at `dterm_lpf_hz` (0 = off); `FF = kff * (sp - prevSp) / dt`; gyro first-order low-pass at `gyro_lpf_hz`. `torque = P + I + D + FF`. I-term reset while not armed or not airborne below idle throttle ("relax on the ground", an iynk assumption, shown). `AltitudeHold`: `cmd = hoverTrim + kp (climbSp - vz) + I` divided by `max(0.4, tiltUpZ)`, I clamped; output clamped to `[0, 1]` |
| State, validation, errors | `setParams` replaces gains without resetting state except the D filter (so a live tune does not jump the I-term). Inputs non-finite: held output returned and `saturated: true` |
| Edge cases | `pidHz` 500 with `stepHz` 2000 (held between ticks). `dterm_lpf_hz` above Nyquist of `pidHz` (DB-C-12 warns; the filter clamps to 0.45 Nyquist). Setpoint step in acro versus angle. Gyro dropout flag (T-B19-17 holds the last value upstream) |
| Performance | Under 2 microseconds per `update` (ESTIMATED), no allocation |
| Unit tests | `controller.test.ts`: against a reference implementation written in the test in plain double arithmetic for 1,000 random inputs (equal to 1e-12); signs per the conventions above; anti-windup (integrator stops growing in saturation); D on measurement (a setpoint step does not kick D); FF response to a ramp; schedule (outputs change only on ticks at 500 Hz when `pidHz` is 500 and `stepHz` 2000); `setParams` mid-flight keeps I; ground relax. `altitude.test.ts`: steady-state error zero for a constant climb setpoint on a first-order vertical plant; tilt compensation; limits |
| Integration tests | A closed loop with the T-B19-10 integrator on the prototype craft and ideal sensors (test-local wiring): rate step metrics from `stepMetrics` (T-B19-03) printed; hard assert only overshoot under 40 percent and settle under 1 s (loose here; T-B19-15 holds the Q5 targets) |
| Playwright | None |
| Fixtures | None stored |
| Acceptance | Given zero error, When updated, Then the torque is zero. Given a positive game roll setpoint in angle mode, When the loop runs on the prototype craft, Then game roll increases. Given saturation, When the error persists, Then the I-term stops growing |
| Observability, release blockers | `saturated` is counted by the model for `saturationMetrics`. Blocker: a Betaflight constant copied from firmware source; any direct write of body attitude or rate |
| Definition of done | Two files, two tests committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/controller.test.ts src/sim/flight/altitude.test.ts src/sim/flight/ban.test.ts`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: the structure, the iynk scale for the angle P, the ground-relax assumption. Revert |
| Later tasks need | `Controller`, `AltitudeHold`, `ControlInput`, `ControlOutput` (15, 18) |

---

### T-B19-13 Rigid parameters from a project or a calculator result

| Field | Content |
|---|---|
| Identity | T-B19-13 / parameter assembly, `src/sim/flight` / B19 / P0, size L / depends on T-B19-01, 06 / not started |
| Problem | The model needs `RigidParams`: mass, inertia, rotor set with positions, spins and part data, drag areas, battery. They live in the project document and in part descriptors. For the 13 legacy crafts the calculator is the only thrust source (ADR-0710) |
| Target user | The model (15), bench set (19), RS-14 (21), the range (18) |
| User story | As someone who built a quad from library parts, I press Fly and the numbers come from my parts. As someone with the factory quad5, I can fly it on the rigid model too, with thrust from the calculator |
| Expected behaviour | Two builders return `RigidParams` or a list of named issues; `hoverDuty` finds the equal duty that holds weight. A craft has exactly one thrust source |
| Success metric | DA-06: on a `parts` craft the rigid hover duty equals the B18 propulsion model's hover throttle within 1 percent; on a `legacy-calc` craft `hoverDuty` equals the calculator's `hoverThrottle` (existing test value) within 0.5 percent; a missing required field is named (`DB-E-FIELD`) |
| Existing files | `src/lib/flight/types.ts:9-19` (`CalcOutputs`) and `types.ts:59-71` (`CraftLook`), `src/lib/flight/from-calc.ts:6-17` (`fromCalc`). B18: `src/sim/flight/from-build.ts` (`calcFromBuild`), `propulsion.ts`, `battery.ts`, `src/parts/data/drone/*.component.json`, `src/project/apply/domain-drone.ts`. B2 `src/project/types.ts`. Precondition: read the exports of each; the type-only imports below use the names found |
| New files | `src/sim/flight/rigid-params.ts` (1 source file). Tests: `rigid-params.test.ts` |
| Modules and signatures | `export type ParamIssue = { code: 'DB-E-FIELD' \| 'DB-E-INERTIA' \| 'E-MOUNT-INVERTED' \| 'E-THRUST-SOURCE'; field?: string; part?: string; message: string }; export type PartLookup = (id: string) => ComponentLike \| undefined; export function rigidParamsFromProject(doc: ProjectLike, lib: PartLookup, o?: { rho?: number; vPack?: number }): { ok: true; params: RigidParams; assumptions: string[] } \| { ok: false; issues: ParamIssue[] }; export function rigidParamsFromCalc(c: CalcLike, look: LookLike, o?: { rho?: number }): { params: RigidParams; assumptions: string[] }; export function hoverDuty(p: RigidParams, vPack: number): number; export function thrustAt(p: RigidParams, duty: number, vPack: number): number`. `ProjectLike`, `ComponentLike`, `CalcLike`, `LookLike` are structural subsets declared in the file (type-only imports from `../../project` and `../../parts` are allowed; value imports are not) |
| Data model | From the project: `domains.drone.data.motors[]` (`motor`, `prop`, `esc`, `mount`, `spin`, `prop_spin`), `battery`, `controller`, `flight.step_hz`, `flight.pid_hz`; part `mechanics.bldc` (`kv_rpm_per_v`, `r_ohm`, `i0_a`, `i_max_a`, `j_rotor_kgm2?`), `mechanics.rotor` (`diameter_mm`, `pitch_mm`, `ct0`, `cp0`, `j_kgm2?`, `ct_vs_j?`, `reverse_thrust_factor?`), `mechanics.esc` (`i_cont_a`, `brake`, `efficiency`), `mechanics.frame` (`cd_area_m2?`), `mechanics.battery`; masses `mass_g` per component and frame body; mounts `mnt_` for positions (mm to m) and thrust axis from the mount orientation (must lie within 90 degrees of body +z, else `E-MOUNT-INVERTED`). Drag-area default when the frame has none: frontal area from the stack box and `cd` 1.0 (assumption, shown). `thrustSource: 'parts'` only for `rigidParamsFromProject`; `'legacy-calc'` only for `rigidParamsFromCalc`; the other combination is `E-THRUST-SOURCE` |
| Input and output schemas | As signatures. Units converted once here: mm to m, g to kg, `kv_rpm_per_v` to `ke = 60 / (2 pi kv)`. Calculator path: `drive: 'normalised'`, `kT = thrustPerMotor / 1000 * 9.81` (N at full command), `tau_assumed_s = 1 / craft.spool`, `kQ / kT = 0.016 m` (the prototype's value; UNKNOWN for real props; flagged), inertia from `look` (motors and propellers 30 percent of AUW split over the arms at `armLen`, the rest a box of `look.body`; an iynk estimate, flagged), mass `auw / 1000` |
| API, permissions, migration | None. None. None |
| Algorithm | Pieces for `massProperties`: every component and frame body at its mount, the battery at its mount; centre of mass is the origin for rotor positions (`pos_m` relative to CG). `hoverDuty`: bisection on duty in `[0.05, 1]`, 40 fixed iterations, solving `sum_i thrust_i(duty) = m g` with `staticOmega` and axial speed 0; returns 1 when even full duty cannot hold weight (the caller reports DB-C-01) |
| State, validation, errors | Pure. Missing `mechanics` key: `DB-E-FIELD` with the part id and dotted field, only the outputs that need it are blocked (DA-03 spirit: this function returns the first issue per part). A part with both `motor` and `bldc` blocks is the loader's `E-MECH-KEY-CLASH` (B11 and B18), not repeated here |
| Edge cases | 3 to 12 motors. Hex with alternating spins. Coaxial octo (two rotors on one arm position). An FC mount rotated 180 degrees about yaw is not a parameter issue (it is a fault, T-B19-17). `legacy-calc` craft with `tailServo` (tricopter) or wing: refused with `E-THRUST-SOURCE`-style `unsupported-class` (the rigid model flies multirotors only; 4 of 13 crafts stay on the game model, DRONE 7.6) |
| Performance | Once per run. Under 5 ms (ESTIMATED) |
| Unit tests | `rigid-params.test.ts`: the `drone-quad` example project resolved against test descriptors (three illustrative parts built in the test from the prototype table; if B18's first descriptor set has matching ids, also against it); each issue code; mounts inversion; legacy path on quad5's calculator inputs (`flightCalc` from `src/lib/dronelab/fly.ts`) gives `hoverDuty` equal to `calc.hoverThrottle` within 0.5 percent; wing and tricopter refused; DA-06 cross-check against B18 `calcFromBuild` hover throttle within 1 percent (skipped with a named reason if B18's export differs, and the difference is written in the commit body) |
| Integration tests | The prototype craft from `rigidParamsFromCalc` hovers 5 s in the T-B19-10 integrator with zero drift |
| Playwright | None |
| Fixtures | `src/sim/flight/testdata/quad5-calc.json` (the CalcOutputs quad5 produces; generated once by the test, committed); `testdata/quad-parts.project.json` (the `drone-quad` example copied unchanged with its hash recorded) |
| Acceptance | Given a `parts` craft, When `rigidParamsFromProject` runs, Then rotors carry positions from mounts and the hover duty equals B18's within 1 percent. Given a part with no `rotor.ct0`, When it runs, Then the issue is `DB-E-FIELD` with that part and field |
| Observability, release blockers | `assumptions[]` is shown by the panel (T-B19-22). Blocker: a craft with two thrust sources |
| Definition of done | File, test, two fixtures committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/rigid-params.test.ts src/lib/flight src/lib/drone`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: inertia estimate for legacy crafts and the drag default. Revert |
| Later tasks need | `rigidParamsFromProject`, `rigidParamsFromCalc`, `hoverDuty`, `thrustAt`, `ParamIssue` (15, 18, 19, 21, 22) |

---

### T-B19-14 CLI parameter bindings

| Field | Content |
|---|---|
| Identity | T-B19-14 / CLI emulator bindings, `src/lib/dronelab` and `src/sim/flight` / B19 / P0, size M / depends on T-B19-09 / not started |
| Problem | `set` commands change canned patches (`angleLimit`, `boardYaw`, `tailReverse`; `cli.ts:249-251`, `effects` rows in `quad5.ts:470+`). With a real controller a `set p_roll = 48` must change the controller parameter (ADR-0713, DRONE Objection 9). quad5's table has no `p_roll`, `d_roll`, or filter settings |
| Target user | Anyone tuning from the console; the parameter dump (16) |
| User story | As someone who types `set d_roll = 36` and `save`, I see the next flight use that D gain |
| Expected behaviour | A table binds CLI names to `FcParams` paths with unit conversion and range. For a rigid craft the emulator gets the bound settings; on `save` and `defaults` changed bound settings produce `domain.patch`-ready patches in place of canned effects; settings without an exact mapping are listed, never dropped. Legacy crafts and every unbound setting behave exactly as before |
| Success metric | The 34 existing CLI tests pass unchanged (VERIFIED count `grep -c "test(" cli.test.ts`; run before and after); new tests cover every binding in both directions; DA-19 first half: a dump re-imported through the emulator gives equal parameters |
| Existing files | `src/lib/dronelab/cli.ts:27-34` (`CliContext`), `:36` (`CliResult`), `:221-241` (`parseValue`), `:249-251` (`effectsFor`), `:492-496` (`save`), `:502-507` (`defaults`); `src/lib/dronelab/store.ts:193` (the only caller; deleted by T-B13-11; if B13 left a replacement caller, find it with `grep -rn "runCli(" src`); `src/content/schema.ts:654-665` (`CliEmulator`); `src/content/drones/quad5.ts:421-455` (settings, limits) |
| New files | `src/sim/flight/cli-bridge.ts` (1). Edited: `src/lib/dronelab/cli.ts` (1). Total 2. Tests: `cli-bridge.test.ts`, edit `cli.test.ts` (new cases only, no changed expectation) |
| Modules and signatures | `cli-bridge.ts`: `export interface Binding { cli: string; path: string; exact: boolean; toParam(v: string \| number): number \| string \| boolean; toCli(v: number \| string \| boolean): string \| number; limit: { min?: number; max?: number; values?: string[] }; note?: string }; export const BINDINGS: readonly Binding[]; export function boundEmulator(emu: CliEmulator, p: FcParams): CliEmulator /* adds missing bound names with limits, sets values from p */; export function boundSetters(): ReadonlyMap<string, (v: string \| number) => CliPatch>; export function fcParamsFromCli(values: Readonly<Record<string, string \| number>>, base: FcParams): { params: FcParams; unmapped: string[] }; export function mergePatchFor(patches: readonly CliPatch[]): Record<string, unknown> /* RFC 7396 patch for domain.patch on domains.drone.data */`. `cli.ts` edit: `CliContext` gains `bound?: ReadonlyMap<string, (v: CliValue) => CliPatch>`; `effectsFor` skips settings present in `ctx.bound` and a new `boundEffects(ctx, values, changed)` yields their patches; `save` and `defaults` call both |
| Data model | Bindings (paths from the schema; names from the Betaflight CLI where it has them; EXTERNAL recalled, verify against the Betaflight docs before relying): `p_roll, i_roll, d_roll, f_roll` to `pid.p_roll, i_roll, d_roll, ff_roll` (and pitch, yaw); `roll_rc_rate` to `rates.roll.rc_rate`, `roll_srate` to `rates.roll.super_rate`, `roll_expo` to `rates.roll.expo` (pitch, yaw likewise; all in `quad5.ts` already); `angle_limit` to `angle.limit_deg`; `angle_p_gain` to `angle.strength`; `failsafe_delay` (0.1 s units) to `failsafe.delay_ms` (times 100); `failsafe_procedure` `DROP` to `rx_loss_action: 'drop'`, `AUTO-LAND` to `'land'`, `GPS-RESCUE` has no mapping (listed unmapped); `gyro_lpf1_static_hz` to `filters.gyro_lpf_hz`; `dterm_lpf1_static_hz` to `filters.dterm_lpf_hz`; `dshot_idle_value` (hundredths of a percent) to `mixer.idle_percent` (divide by 100); `thrust_linear` to `mixer.thrust_linearisation`; `mixer.airmode` has no CLI name in this table (not exact: appears in the dump as a comment and in the loss list). Patch keys: `fc.pid.p_roll` style dotted keys in `CliPatch`, converted by `mergePatchFor` to `{ fcParams: { pid: { p_roll: 48 } } }` |
| Input and output schemas | `CliPatch = Record<string, string \| number \| boolean>` (unchanged). Ranges: the intersection of the `FC_LIMITS` range and the emulator's own limit when it has one |
| API, permissions, migration | None. None. Migration (DRONE 14.2 step 6): the 34 CLI tests keep their expectations because legacy crafts pass no `bound`. If a test expectation must change, it is listed in the commit body with the reason; none is expected |
| Algorithm | `boundEmulator` copies the emulator and, for each binding whose cli name is absent, adds `settings[name]` from `toCli(get(p, path))` and `limits[name]` from the range, keeping the table's own spelling rules. `boundSetters` builds `name -> (v) => ({ ['fc.' + path]: toParam(v) })`. In `runCli`, bound names are applied exactly where `effectsFor` ran: changed against stored, in table order. `fcParamsFromCli` reads `values`, applies each binding, returns the names that have no binding or an inexact one in `unmapped` |
| State, validation, errors | Values pass `parseValue` first (CLI error text unchanged), then the `FC_LIMITS` check; a value outside gives the firmware's own `INVALID VALUE` text via the existing path |
| Edge cases | `defaults` after a tune: patches restore the template values. A setting typed in the other case (`P_ROLL`): handled by `settingName` (existing). `failsafe_delay` 15 gives 1500 ms and back. A craft whose emulator already has `p_roll` (future content): the existing row wins, no duplicate |
| Performance | Negligible |
| Unit tests | `cli-bridge.test.ts`: each binding both ways (table-driven, one row per binding); unmapped list for `GPS-RESCUE`; `boundEmulator` does not mutate its input; `mergePatchFor` produces the exact RFC 7396 object; a full dump round trip equals the source `FcParams`. `cli.test.ts` additions: a `set p_roll = 48` then `save` yields `{ "fc.pid.p_roll": 48 }`, `defaults` restores, a legacy craft yields exactly the old effects |
| Integration tests | The quad5 emulator run through `boundEmulator` with `freestyle5` params: `dump` prints the bound settings with the template values |
| Playwright | None |
| Fixtures | None stored |
| Acceptance | Given a rigid quad, When I type `set d_roll = 36` then `save`, Then the patch is `{ fcParams: { pid: { d_roll: 36 } } }`. Given a legacy craft, When I type `set angle_limit = 25` then `save`, Then the old `angleLimit` effect appears |
| Observability, release blockers | None. Blocker: any change to an existing CLI test expectation without a written reason |
| Definition of done | Two files and tests committed; the 34 old tests green |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/lib/dronelab src/sim/flight/cli-bridge.test.ts`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: the binding table with the exact flag. Revert |
| Later tasks need | `BINDINGS`, `boundEmulator`, `boundSetters`, `fcParamsFromCli`, `mergePatchFor` (16, 22) |

---

### T-B19-15 `multirotor-rigid@1` model: step order, battery, replay record

| Field | Content |
|---|---|
| Identity | T-B19-15 / flight model assembly, `src/sim/flight` / B19 / P0, size L / depends on T-B19-02, 03, 06 to 13 / not started |
| Problem | The parts exist; nothing runs them in the order of DRONE 7.2, with the battery, a headless runner, checkpoints and a replay record. `FlightModel` (SIMULATION 11.2) has no code; B18 did not create it |
| Target user | Every later task: range driver (18), bench set (19), RS-14 (21), views (23, 24) |
| User story | As someone who builds a drone, I press Fly and it flies on a 6-DoF model; as someone replaying, the same seed and inputs give the same flight |
| Expected behaviour | `RigidFlight` steps sensors, estimator, loops, mixer, rotors, battery, wind in the fixed order. `runHeadless` applies `InputEntry` lists and returns a trace and checkpoints every 1,000 ms. Checkpoint comparison follows the hash class. The closed loop meets the step targets after gain tuning |
| Success metric | DA-06; DA-07 in-process (ten runs, equal checkpoint hashes); DA-22 Node figure (mean step under 50 microseconds at 1 kHz and 2 kHz); Q5 step targets met on the prototype craft; closed-loop hover drift under 5 cm RMS over 30 s with default sensors (HYPOTHESIS target) |
| Existing files | T-B19-01 to 13 (all new); B18 `src/sim/flight/battery.ts`, `endurance.ts`; B3 `src/sim/core/hash.ts` (`StateHasher`), `rng.ts` (`rng`), `clock.ts` (`ClockRate`, `clockRate`); `src/lib/flight/battery.ts:11-18` (`LIMITS`: the cut-off numbers B18 reuses) |
| New files | `src/sim/flight/model.ts`, `model-rigid.ts` (2). Edited: `src/sim/flight/params.ts` (gain tuning, `STEP_HZ_ALLOWED`) (1). Total 3. Tests: `model-rigid.test.ts`, `closedloop.test.ts`, `replay.test.ts`, `perf.test.ts` |
| Modules and signatures | `model.ts`: `export interface RigidSpec { params: RigidParams; fc: FcParams; imu: ImuParams; env: DroneEnvironment; seed: number; docHash: string; ground: boolean; start?: { kind: 'ground' } \| { kind: 'hover'; z_m: number } /* headless only: start airborne at hover trim, rotors at hover speed */ }; export interface FlightInputs { sticks: { throttle: number; yaw: number; pitch: number; roll: number }; attitude: 'angle' \| 'acro'; throttleMode: 'manual' \| 'climb'; angleSp: { pitch_deg: number \| null; roll_deg: number \| null }; yawRateSp_dps: number \| null; climbSp_mps: number \| null; armed: boolean; limits: { angle_deg: number; rateScale: number; expo: number } }; export interface ModelFrame { t_ns: number; p: Vec3; v: Vec3; euler: { yaw: number; pitch: number; roll: number }; throttle: number; volt: number; amps: number; usedMah: number; low: boolean; empty: boolean; rpm: number[]; spin: number }; export interface FlightModel<S, I> { readonly id: string; readonly tier: 'T1' \| 'T2'; readonly stepRate: ClockRate; create(spec: RigidSpec, rng: (stream: string) => Rng): S; step(s: S, i: I): void; frame(s: S): ModelFrame }; export interface BatteryPort { vPack(): number; step(i_a: number, dt_s: number): { low: boolean; empty: boolean }; usedMah(): number; soc(): number; hashInto(h: StateHasher): void }`. `model-rigid.ts`: `export class RigidFlight { constructor(spec: RigidSpec); readonly spec: RigidSpec; t_ns: number; x: Float64Array; aux: RigidAux; sensors: SensorSuite; est: Estimator; ctl: Controller; alt: AltitudeHold; wind: WindField; battery: BatteryPort; events: Array<{ at: number; kind: string; payload: unknown }>; hashInto(h: StateHasher): void }; export const rigidModel: FlightModel<RigidFlight, FlightInputs>; export function modeInputs(mode: 'stabilise' \| 'angle' \| 'alt-hold' \| 'acro'): Pick<FlightInputs, 'attitude' \| 'throttleMode'>; export function runHeadless(spec: RigidSpec, entries: readonly InputEntry[], endNs: number, o?: { traceRateHz?: number; checkpointEveryNs?: number; marks?: boolean }): { flight: RigidFlight; trace: FlightTrace; checkpoints: Checkpoint[]; events: RigidFlight['events'] }; export interface Checkpoint { at: number; hash: string; vec: Float64Array }; export function checkpointOf(f: RigidFlight): Checkpoint; export function sameCheckpoint(a: Checkpoint, b: Checkpoint, cls?: 'N' \| 'B'): boolean; export function replayVersions(): { models: Record<string, string>; dmath: string }` |
| Data model | Replay: `ReplayRecord.versions.models['multirotor-rigid@1'] = '1.0.0'` (RC-54: `<name>@<major>` key) and `versions.dmath` (`'math'` before T-B19-28, `'dmath@1'` after). Checkpoint `vec` is `[p, v, q, w, omega..., soc]`; `hash` is the `StateHasher` digest of the full state including sensor biases, estimator, controller, wind state and the four rng positions. Class: `FLIGHT_HASH_CLASS` from `fmath.ts` ('N' now): `sameCheckpoint` compares `vec` to `1e-9` relative plus `1e-12` for 'N', `hash` equality for 'B' |
| Input and output schemas | `InputEntry` kinds used: `control/stick` (value `{throttle,yaw,pitch,roll}`), `control/switch` (`{action:'arm'\|'disarm'\|'mode', mode?}`), `fault/...` (T-B19-17). Entries are applied at the first step whose time is at or after `at`, in `seq` order. The trace channels are T-B19-03's `defaultChannels(n)` |
| API, permissions, migration | None. None. Migration (DRONE 14.2 step 5): this is the new backend; nothing existing is edited except `params.ts` gains |
| Algorithm | One step, time `t` (DRONE 7.2): (1) `truth = {w, specificForce: aux.specificForce, p, v, q}`; `r = sensors.sample(t, truth)`; (2) `e = est.update(dt, r)`; (3) outer loops: `alt.update` at 50 Hz ticks (every `stepHz / 50` steps) when `throttleMode` is `climb`, holding the previous command between ticks; angle/position setpoints come from `FlightInputs`; (4) `c = ctl.update({... est: e, gyro: r.gyro ...})`; (5) throttle: manual `thrustLinearise(sticks.throttle, a)`, climb the altitude command; `mix(...)` with `idle` and airmode; `quantiseDshot` by protocol; armed false gives all zero; (6) `veff_i = veff(cmd_i, battery.vPack(), rotor_i)` using last step's pack voltage (no algebraic loop); `stepRk4`; clamp `omega >= 0`; pack current `= sum cmd_i * current_i + idle_amps` (idle 0.4 A, the game's `IDLE_AMPS`, `battery.ts` in lib) then `battery.step(i, dt)`; (7) `wind.step`; `RigidInputs.wind` for the next step; (8) if `spec.ground`: plane at z = 0 (clamp `p.z`, zero downward `v.z`, horizontal friction 0.8 per step like `groundContact`'s 0.8 factor at `sim.ts:803-804`, attitude held level by damping `w` by 0.8 per step and nudging `q` toward the yaw-only quaternion by 0.2 per step while `p.z <= 0` and total thrust under weight: an iynk landing-gear assumption, flagged) and emit `flight-warn` events: `rotor-tau-short`, `state-nonfinite` (run stops), `battery-low`, `battery-empty` (arming drops, as `sim.ts:934`). Gain tuning: write a one-off script in the test file that sweeps `GAIN_SCALE` on a log grid around T-B19-09's analytic start and picks the smallest set meeting the Q5 targets on the prototype craft (rise < 80 ms, overshoot < 20 percent, settle < 400 ms) and the quad5 `rigidParamsFromCalc` craft; the chosen constants and the metrics go in the commit body; the test then asserts them. If no grid point meets all targets the task reports the best miss and stops (it does not relax a target: D-014) |
| State, validation, errors | `RigidFlight` is mutable and owned by one caller. `create` validates `spec` (`validateFcParams`, `validateEnvironment`, `validateImu`, `STEP_HZ_ALLOWED`, `pid_hz` divides `step_hz`) and throws `RangeError` listing issues; the UI validates earlier. Non-finite state stops the run |
| Edge cases | `step_hz` 500, 1000, 2000 with `pid_hz` 500 or 1000. 12 motors. Empty battery mid-flight. Disarm in the air (motors spin down, craft falls). `entries` at the same `at` with different `seq`. `endNs` not a multiple of the step |
| Performance | DA-22: mean step under 50 microseconds at 1 kHz and at 2 kHz including controller, sensors and estimator (prototype: 1.92 microseconds for the plant and PID alone, VERIFIED as prototype). Measured in `perf.test.ts` (Node main thread; the browser Worker figure is T-B19-28). If 2 kHz misses, `STEP_HZ_ALLOWED` loses 2000 in this task (the DA-22 rule) and the schema enum edit is listed under "For Amar" item 7 |
| Unit tests | `model-rigid.test.ts`: step order (a test double records call order), idle, arm, disarm, battery drains, `ground` plane, 12-motor layout runs, `modeInputs`. `closedloop.test.ts`: Q5 rate-step targets (metrics from T-B19-03); angle-mode 10 degree step settles in 1 s; hover 30 s on both craft; DA-06 (parts craft: hover command equals the B18 propulsion hover within 1 percent; legacy craft: equals `calc.hoverThrottle`). `replay.test.ts` (DA-07 in-process): ten runs of a scripted 20 s flight give identical checkpoint hashes; a changed seed gives a different checkpoint hash at the first 1,000 ms checkpoint and a different gyro noise sample, while the ideal-sensor spec gives equal vectors for both seeds to 1e-12; the class used for hash equality is read from `FLIGHT_HASH_CLASS`, never hardcoded; `sameCheckpoint` both classes; `replayVersions`. `perf.test.ts`: warm 5,000 steps, time 50,000 steps with `process.hrtime.bigint` (test-only), print the mean; hard assertion of 50 microseconds only when `FLIGHT_PERF=1` (run on a quiet machine, `LOAD` rule of the roadmap), otherwise 400 microseconds as a smoke bound |
| Integration tests | `runHeadless` with a scripted stick log (arm, climb, roll step, land) returns a trace whose channels pass `decodeTrace(encodeTrace(t))` and whose `stepMetrics` on `wx_dps` meet the Q5 targets |
| Playwright | None |
| Fixtures | `src/sim/flight/testdata/script-20s.entries.json` (the scripted log), `testdata/script-20s.checkpoints.json` (hashes from the first run on this machine, class N vectors; regenerated only by a deliberate commit that explains why; T-B19-28 regenerates it with `dmath`) |
| Acceptance | Given a `parts` craft on a nominal pack, When it hovers, Then its hover command equals the propulsion model's within 1 percent (DA-06). Given one project, seed and input log run ten times, Then every 1,000 ms checkpoint hash is identical (DA-07 in-process). Given the Q5 targets, When the prototype craft takes a 100 deg/s roll step, Then rise, overshoot and settling meet them |
| Observability, release blockers | `flight-warn` events with codes as above. Blocker: a Q5 target missed and relaxed; a banned `Math` call; `Date.now` or `performance.now` in the model |
| Definition of done | Three files, four tests, two fixtures committed; the tuned `GAIN_SCALE`, DA-06 and DA-22 numbers in the commit body |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight`; `FLIGHT_PERF=1 npx vitest run src/sim/flight/perf.test.ts`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: step order, ground assumption, DA-06, DA-22, tuned gains. Revert (dependants first) |
| Later tasks need | `RigidFlight`, `rigidModel`, `runHeadless`, `checkpointOf`, `sameCheckpoint`, `replayVersions`, `FlightInputs`, `RigidSpec` (17, 18, 19, 21, 23, 24, 28) |

---

### T-B19-16 Export: parameter dump and wiring sheet

| Field | Content |
|---|---|
| Identity | T-B19-16 / export, `src/export` / B19 / P1, size M / depends on T-B19-09, 14 / not started |
| Problem | After tuning, the person needs the parameters out as text a flight controller's console accepts, with an honest list of what could not be exported (ADR-0713, DRONE slice D7, DA-19) and a wiring sheet for the build (F-160 family). Every export carries SN-8 and the first-flight panel comes first (DRONE 12.2) |
| Target user | Someone who will build the craft; T-B19-22 (button) |
| User story | As someone ready to build, I download my tuned parameters and a wiring sheet and I am told what did not carry over |
| Expected behaviour | `dumpFcParams` writes a commented, CLI-style dump with SN-8 as its first line; `importDump` reads it back; unmapped items form a loss list; `wiringSheet` lists connections from the project's wires as CSV and Markdown with SN-3 |
| Success metric | DA-19: export, re-import through the emulator, equal parameters; every parameter without an exact mapping is in the loss list (count asserted); first line of the dump is the SN-8 text; no output contains mission or targeting data (R-024 export rule) |
| Existing files | B18 `src/sim/flight/notices.ts` (SN-1 to SN-8 text; precondition: `grep -n "SN-8" src/sim/flight/notices.ts`), B18 `src/export/bom-drone.ts` (header style to match), `project.schema.json` `$defs.LossItem` (`code, severity, path?, message`), `$defs.Wire` (`net, from, to, color`). T-B19-14 `BINDINGS`, `fcParamsFromCli` |
| New files | `src/export/drone-params.ts`, `src/export/wiring-sheet.ts` (2). Tests: `drone-params.test.ts`, `wiring-sheet.test.ts` |
| Modules and signatures | `drone-params.ts`: `export interface DumpOptions { projectName: string; docHash: string; model: 'multirotor-rigid@1' \| 'flight-game@1'; ackFirstFlight: boolean; notice: (id: 'SN-8' \| 'SN-1' \| 'SN-2' \| 'SN-3' \| 'SN-5' \| 'SN-6') => string }; export type DumpResult = { ok: true; text: string; loss: LossItem[] } \| { ok: false; error: 'first-flight-ack-required' }; export function dumpFcParams(p: FcParams, o: DumpOptions): DumpResult; export function importDump(text: string, base: FcParams): { params: FcParams; loss: LossItem[]; errors: Array<{ line: number; message: string }> }`. `wiring-sheet.ts`: `export interface WireRow { net: string; from: string; to: string; color: string; note: string }; export function wiringSheet(doc: WiringDoc, o: { notice: (id: 'SN-8' \| 'SN-3') => string }): { rows: WireRow[]; csv: string; markdown: string; loss: LossItem[] }` with `WiringDoc` a structural subset of the project (`components`, `boards`, `nets`, `wires`) |
| Data model | Dump layout: comment header (SN-8 first, then project name, the document hash, the model id, the date-free line "iynk parameter dump"), then one `set <name> = <value>` per exact binding in table order, then `# iynk: <path> = <value>   (no CLI mapping)` lines for inexact ones. Loss codes: `fc-param-no-cli-name` (`mixer.airmode`), `fc-failsafe-no-mapping` (`GPS-RESCUE` not produced; n/a on export), `fc-modes-not-exported` (aux switches), `fc-gain-units` (info: iynk units, not firmware units: council Q13). Wiring columns: net name, `refdes.pin` of each end, wire colour, note (the net's role if the board descriptor gives it) |
| Input and output schemas | Text is UTF-8 with `\n`. CSV is RFC 4180 with a cell guard: a cell starting with `=`, `+`, `-` or `@` gets a leading apostrophe (spreadsheet formula injection). Markdown escapes `\|` |
| API, permissions, migration | None. None. None |
| Algorithm | `dumpFcParams`: refuse when `!ackFirstFlight`; write header lines (the first-flight notices appear as a single "read the first-flight panel" line, with the panel itself in the UI); iterate `BINDINGS`; format numbers with no locale (`String(n)`). `importDump`: parse lines; `set` lines go through the binding's `toParam` and the `FC_LIMITS` range (errors with line numbers); unknown names are errors; comments ignored. `wiringSheet`: sort rows by `(net, from, to)` with a fixed comparison (no `localeCompare`), no wall-clock text |
| State, validation, errors | Pure. Input size caps: dump text 256 KiB, 5,000 lines |
| Edge cases | A parameter at its range edge. A project with no wires (empty sheet with a loss item). Two wires on one net. A dump edited by hand with Windows line endings. Names in the other case |
| Performance | Instant |
| Unit tests | `drone-params.test.ts`: SN-8 first line; refuses without acknowledgement; round trip equality on the `freestyle5` and `hex` defaults and 100 seeded random valid `FcParams` (DA-19); loss list contents and count (equals the number of inexact bindings plus modes); line-numbered errors; caps. A DA-19 case through the emulator: feed the dump's `set` lines to `runCli` with `boundEmulator`, `save`, collect patches, apply with `mergePatchFor` and compare. `wiring-sheet.test.ts`: ordering, CSV guard, Markdown escaping, SN-3 present, empty case |
| Integration tests | The two exports of the `drone-quad` example project are produced and checked for SN-8 and size. The banned-word scan of these modules is T-B19-20's `strings.test.ts` (it runs after this task, in group 5) |
| Playwright | None here (T-B19-29 downloads them) |
| Fixtures | `src/export/testdata/drone-quad.dump.txt` (golden dump of the example, committed after review) |
| Acceptance | Given a project with FC parameters, When exported and re-imported through the emulator, Then the parameters are equal and each non-exact one is in the loss list (DA-19). Given no acknowledgement, When export is asked, Then `first-flight-ack-required` |
| Observability, release blockers | None. Blocker: mission or waypoint data in an export; a dump whose first line is not SN-8 |
| Definition of done | Two files, two tests, one fixture committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/export src/sim/flight/cli-bridge.test.ts src/lib/dronelab`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: dump format and loss codes. Revert |
| Later tasks need | `dumpFcParams`, `importDump`, `wiringSheet` (22, 29) |

---

### T-B19-17 Failures, ESC desync, brown-out and failsafe

| Field | Content |
|---|---|
| Identity | T-B19-17 / faults and failsafe, `src/sim/flight` / B19 / P0, size L / depends on T-B19-15 / not started |
| Problem | The game's faults are booleans that inject fixed rotation rates (`sim.ts:518, 573-574, 583, 598`). ADR-0714: every drone fault is an operation on the model or environment and the effect falls out of the dynamics. The rigid model has no faults, no failsafe, no brown-out |
| Target user | The person practising failures; the diagnosis record (D-010) |
| User story | As someone who rotated the flight controller by 180 degrees, I watch the craft flip on take-off because the controller's frame is wrong, and the app tells me why |
| Expected behaviour | Fault operations from the shared vocabulary set rotor health, mount yaw, sensor modes; they are recorded as input entries; ESC desync arises from a heat state; FC brown-out resets controller state; receiver loss starts a failsafe stage; GPS loss falls back to angle mode; a cause is named from the fault state and the trace |
| Success metric | DA-10: FC mount yaw 180 degrees flips on take-off through the loop, and a grep of the rigid sources finds no fixed rotation rate used to produce a fault. DA-23: motor-out on a hex and on a quad, ten runs each, identical outcomes, diagnosis `motor-out` with the motor id and trace evidence. DA-26 extended: sensor failures from the environment arrive as recorded `fault` entries |
| Existing files | `src/lib/flight/sim.ts:587-598` (the game's `overKv` heat idea and desync; read, not edited), `src/lib/flight/types.ts:25-33` (`CraftFaults`, stays for the game model), SIMULATION 13.2 (`FaultOp`), 13.4 (cause ids). B3 `src/project/diagnosis.ts`, `src/sim/faults/cause-ids.ts` (precondition: `grep -n "motor-out\|fc-orientation-wrong\|props-swapped\|motor-direction-reversed\|esc-desync\|battery-sag-reset\|gps-lost\|link-lost\|sensor-drift\|controller-oscillation" src/sim/faults/cause-ids.ts`) |
| New files | `src/sim/flight/failures.ts`, `desync.ts`, `failsafe.ts` (3). Edited: `src/sim/flight/model-rigid.ts` (1). Total 4. Tests: `failures.test.ts`, `desync.test.ts`, `failsafe.test.ts`, `fault-flights.test.ts`, `norates.test.ts` |
| Modules and signatures | `failures.ts`: `export type FaultOpLike = { kind: 'param'; target: string; path: string; factor?: number; value?: number \| string } \| { kind: 'mount'; mount: string; pose: { yaw_deg: number } } \| { kind: 'sensor'; sensor: string; mode: 'dropout' \| 'stuck' \| 'bias' \| 'noise'; magnitude?: number; atNs: number; durationNs?: number } \| { kind: 'swap-phase'; motor: string }; export class FaultState { health: RotorHealth[]; mountYaw_deg: number; applied: Array<{ id: string; op: FaultOpLike; at: number; causeId: string }>; fcResetUntil_ns: number }; export function applyFault(f: RigidFlight, op: FaultOpLike, at_ns: number, id: string): { ok: true } \| { ok: false; reason: string }; export function faultEntries(op: FaultOpLike, at_ns: number, id: string): InputEntry[]; export function faultOpFromProject(f: { kind: string; target: Record<string, unknown>; params?: Record<string, unknown> }): FaultOpLike \| null; export function explainTumble(f: RigidFlight): { cause_id: string; symptom_id: string; evidence: Evidence[] } \| null`. `desync.ts`: `export interface DesyncParams { heatGain_per_s: number; threshold: number; coolRate_per_s: number; pMax_per_s: number; duration_ns: number }; export const DEFAULT_DESYNC: DesyncParams; export class DesyncState { constructor(n: number, p: DesyncParams, rng: Rng); step(dt_s: number, loadFrac: number[], overKv: number[]): number[] /* drive scale per rotor */; hashInto(h: StateHasher): void }`. `failsafe.ts`: `export type FailsafeStage = 'off' \| 'delay' \| 'drop' \| 'land'; export class Failsafe { constructor(p: FcParams['failsafe']); update(dt_ns: number, rxLinked: boolean): { stage: FailsafeStage; override: { throttle: number \| null; level: boolean } \| null }; reset(): void }; export function gpsFallback(mode: string, gpsOk: boolean): { mode: string; warn: 'gps-lost' \| null }`. `model-rigid.ts` edit: `RigidFlight` owns `faults: FaultState`, `desync`, `failsafe`; entries of kind `fault` call `applyFault`; the step applies `health`, `mountYaw` (to `SensorSuite.setMountYaw`), desync drive scales, brown-out and failsafe overrides |
| Data model | `FaultOpLike` is SIMULATION 13.2's `FaultOp` subset used by drones. Mapping from the stored `Fault.kind` (`param`, `mount`, `sensor`, `swap-phase`; schema VERIFIED) as DRONE 10 and RC-45 say: motor out `param {target: slot id, path: 'tau_motor', factor: 0}`; propeller damaged `param {path: 'ct0', factor}`; propeller swapped `param {path: 'prop_spin', value: 'cw'\|'ccw'}`; FC orientation `mount {mount: FC mount id, pose.yaw_deg}`; reversed phase `swap-phase {motor}`; gyro bias, noise or dropout `sensor` (`'noise'` maps to the environment's `'noise-x10'`); receiver loss `sensor {sensor: 'rx', mode: 'dropout'}`; GPS loss `sensor {sensor: 'gps', ...}`. Cause ids come only from the registry: `motor-out`, `props-swapped`, `motor-direction-reversed`, `fc-orientation-wrong`, `esc-desync`, `battery-sag-reset`, `gps-lost`, `link-lost`, `sensor-drift`, `controller-oscillation` |
| Input and output schemas | Fault entries: `InputEntry {at, seq, kind: 'fault', target: 'motor:<id>' \| 'mount:<id>' \| 'sensor:<name>', value: { op, id }}`. Failures from the environment (T-B19-07 `failureEntries`) arrive here with `value: { mode, on }`. Diagnosis evidence: `Evidence {kind: 'state'\|'timeline', ref, at, value, provenance: 'computed', tier: 'T1', modelIds: ['multirotor-rigid@1']}` |
| API, permissions, migration | None. None. None |
| Algorithm | Motor out: `health[i].motorOut = true` (`tau_motor = 0`, spin down by prop drag). Prop damage: `ctFactor *= factor`. Prop spin: `propSpin` mismatch changes `handed`, hence `reverse_thrust_factor` of thrust and the same torque direction (DRONE 10). Swap-phase: `phaseSwapped` toggles `dir_actual`. FC orientation: `mountYaw_deg` rotates the IMU frame in `SensorSuite`, so a roll command produces pitch or reversed roll: positive feedback, flip on take-off; nothing sets an angle. Desync: heat state `h += gain * max(0, overKv_i - 1) * load * dt` and cools at `coolRate`; once `h > threshold` each step has probability `pMax * dt * (h - threshold)` drawn from stream `fault:desync:<i>` (one draw every step); on a hit the rotor's `driveScale` is 0 for `duration_ns`, then recovers. `overKv_i = (kv * Vfull) / rpm_max` from the rotor part. Brown-out: if pack voltage is under 6.0 V (assumption: a 5 V rail with dropout; shown) the controller, estimator and altitude loop are reset and no commands are output for 1.5 s (reboot time, assumption); the event is `battery-sag-reset`. Failsafe: `rx` dropout starts a `delay` of `delay_ms`; then `drop` sets the armed flag false (motors off) or `land` commands level attitude and a descent at 1.5 m/s (assumption) and disarms on the ground. GPS loss: `gpsFallback` replaces a GPS position-hold mode by angle mode with altitude kept, warning `gps-lost`; it does not trigger the receiver failsafe. `explainTumble`: when the run ended in a flip or a crash, pick from the applied faults by the priority (1) `mount` fault within 1.5 s of arming, (2) `prop_spin` or `swap-phase`, (3) `motor-out`, (4) desync hit in the last 0.5 s, (5) battery empty or brown-out, (6) sensor faults; evidence cites the fault entry, the first sample where roll or pitch exceeds 60 degrees and the motor command saturation (HYPOTHESIS: priority approximates the largest contributing cause; the counterfactual check, re-running without the fault, is done in `fault-flights.test.ts` and is not shipped) |
| State, validation, errors | `applyFault` returns `ok: false` with a reason for an unknown motor id or path. Entries with unknown `op` kinds are ignored with a `flight-warn fault-unknown`. Cause id not in the registry: the function throws in the test, never at run time |
| Edge cases | Two faults on one motor. Fault applied while disarmed. Clearing entries (`on: false`) restore health. A fault on a motor index above the rotor count. Motor out on a hex versus a quad (the controller saturates differently; no fault-tolerant mixer in v1). Desync with all rotors under rating (never fires) |
| Performance | Fault checks run only on entries; desync adds one draw per rotor per step (under 0.1 microsecond each) |
| Unit tests | `failures.test.ts`: every row of the mapping; `faultEntries` shape; health after each op; clearing; unknown inputs. `desync.test.ts`: no desync under rating over 10 minutes; fires above rating with the seeded frequency; same seed same events; stream independence. `failsafe.test.ts`: stages and timing for `drop` and `land`; GPS fallback does not disarm. `fault-flights.test.ts`: DA-10 (mount yaw 180 flips within 1.5 s of take-off: `abs(roll) > 90` or `abs(pitch) > 90`; control run without the fault does not); prop swap and phase swap outcomes; DA-23 (hex and quad motor-out, ten runs each, exact repeat of airborne time and tumble flag, diagnosis `motor-out` with the motor id and at least one trace evidence item; the airborne times of both are printed, and nothing asserts that the hex lasts longer: HYPOTHESIS); counterfactual attribution for each cause; brown-out resets the loops. `norates.test.ts` (DA-10 grep): in `rigid.ts, rotor.ts, failures.ts, desync.ts, failsafe.ts, model-rigid.ts, controller.ts`, after stripping comments, no match for `/\b(900\|500\|400\|300\|260)\b/` and no assignment to a body attitude or rate (`/\.(roll\|pitch\|yaw)\s*[+\-*]?=/` and writes to `x[IDX.w`/`x[IDX.q` outside `rigid.ts`'s integrator and `model-rigid.ts`'s ground rule, which the test whitelists by function name) |
| Integration tests | Environment-driven: a `DroneEnvironment` with a GPS dropout at 5 s and an `rx` dropout at 8 s, run headless: the entries appear in the checkpoint-visible event list at integer ns and the recorded input log reproduces the run exactly |
| Playwright | None |
| Fixtures | `src/sim/flight/testdata/hex.params.json` (a hexacopter `RigidParams` built by the test from the prototype craft) |
| Acceptance | Given the FC mount rotated 180 degrees in yaw, When the build takes off, Then it flips through the controller and the diagnosis names `fc-orientation-wrong`. Given a motor-out fault on a hex and on a quad, When flown ten times, Then each outcome repeats exactly and the diagnosis names `motor-out` with the motor id |
| Observability, release blockers | Events `flight-warn` codes: `fault-unknown`, `battery-sag-reset`, `gps-lost`, `link-lost`. Blocker: any scripted rotation rate (the grep test); a cause id outside the registry |
| Definition of done | Four files and five tests committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: fault table, the approximation of `explainTumble`, the assumptions (6.0 V, 1.5 s, 1.5 m/s). Revert |
| Later tasks need | `applyFault`, `faultEntries`, `faultOpFromProject`, `explainTumble`, `Failsafe` (18, 19, 23, 28) |

---

### T-B19-18 Rigid driver inside the flight session

| Field | Content |
|---|---|
| Identity | T-B19-18 / flight session integration, `src/sim/flight` and `src/lib/flight` / B19 / P0, size L / depends on T-B19-15 / not started |
| Problem | The range, laps, gates, checkpoints, events, ghosts, crash replay, touch sticks and gamepad all run on `SimState` (Q1). The rigid model must fly inside that machinery or none of F-071, F-072, R-193, R-194 apply to it. `FlightRange` reads `session.sim` at `FlightRange.tsx:340, 363, 399, 508` |
| Target user | Anyone flying a build in the range |
| User story | As someone flying my build on the range with the keyboard, I get the same course, laps, crash replay and ghosts as the 13 crafts, on the 6-DoF model |
| Expected behaviour | When a session is created with a `RigidSpec`, `multirotorStep` hands the body to the rigid driver, which runs `step_hz / 100` sub-steps per 10 ms game step. The autopilot reads the estimated position and velocity. Everything else in `sim.ts` (modes, events, worldChecks, laps) runs as before. A session without a spec behaves exactly as today |
| Success metric | All existing tests under `src/lib/flight`, `src/lib/dronelab`, `src/lib/drone` and `src/components/flight` pass unchanged, with the same pass count as the baseline recorded before editing, including the 342 golden rows of DA-02; a rigid session replays to identical frames; the autopilot demo passes the first gate or checkpoint of `bando` on a rigid quad5 within 90 simulated seconds (HYPOTHESIS) |
| Existing files | Preconditions, in order: (a) record the baseline: run `npx vitest run src/lib/flight src/lib/dronelab src/lib/drone src/components/flight` before editing and write the pass count in the commit body (the number of tests is not stated in any audit file; 57 test declarations were counted by grep in `src/lib/flight`, ESTIMATED); (b) add the one-line import of `../../sim/flight/rigid-driver` (via the project's alias) to `sim.ts`, run `npx vitest run src/architecture.test.ts`, and if it fails add the `labs` to `sim` cell in `src/architecture.test.ts` with a one-line reason (the B3 PD-2 precedent), then re-run. `src/lib/flight/sim.ts`: `SimState` `:26-94`, `createSim` `:103-123`, `resetFlight` `:125-192`, `dispatch` design case `:264-274`, `multirotorStep` `:501-632` (`auto` at `:509`, attitude lag `:516-535`, forces `:604-631`, `groundContact(s, false)` `:632`), `groundContact` `:779-815`, `batteryStep` `:923-937`, `frameOf` `:966-1004`, `replay` `:1008-1028`. `src/lib/flight/session.ts`: `FlightOrigin` `:33-38`, `createSession` `:93-98` and `snapshotOf` `:55-79`. `crash.ts:109-125` and `ghost.ts:54-66` pass `origin.opts` into `replay`, so a spec carried in `opts` reaches them without edits. `src/lib/flight/crash.ts:56-66` (`causeOf`, reads `s.flipWhy`) |
| New files | `src/sim/flight/rigid-driver.ts` (1). Edited: `src/lib/flight/sim.ts`, `src/lib/flight/session.ts` (2) and the import matrix `src/architecture.test.ts` (`ALLOWED`, from B2/B3-10) with the one cell `labs` to `sim`, plus its reason line (1). Total 4. If the ESLint import zones in `eslint.config.mjs` also forbid it, that file is the 5th and last edit. Decision made here: B3 M-cells list `sim-host` to `sim`, not `labs` to `sim` (VERIFIED in the B3 package, M-1 to M-5), so the cell is expected to be needed; the precondition below proves it. Tests: `src/sim/flight/rigid-driver.test.ts`, `src/lib/flight/rigid-session.test.ts` |
| Modules and signatures | `rigid-driver.ts`: `export interface DriverInput { dt: number; live: boolean; airborne: boolean; sticks: { throttle: number; yaw: number; pitch: number; roll: number }; mode: { attitude: 'angle' \| 'acro'; throttle: 'manual' \| 'climb'; angleLimit: number \| null; rateScale: number; expo: number }; craft: { climbRate: number }; auto: { pitch: number \| null; roll: number \| null; yawRate: number \| null; climb: number \| null }; windOn: boolean; courseWind: { speed: number; from_deg: number; gust: number } }; export interface DriverOutput { p: Vec3; v: Vec3; yaw: number; pitch: number; roll: number; u: number; thrust: number; spin: number; motorsOut: number[]; volt: number; amps: number; usedMah: number; low: boolean; empty: boolean; flipWhy: 'flipFc' \| 'flipProps' \| 'flipMotor' \| null }; export interface RigidDriver { readonly modelId: 'multirotor-rigid@1'; reset(pose: { p: Vec3; yawDeg: number }): void; estimate(): { p: Vec3; v: Vec3 }; step(i: DriverInput): DriverOutput; accept(p: Vec3, v: Vec3): void; syncFaults(f: { fcReversed?: boolean; propsSwapped?: boolean; motorDirUnchecked?: boolean }): void; wind2d(): [number, number]; flight(): RigidFlight }; export function createRigidDriver(spec: RigidSpec): RigidDriver; export function mapCraftFaults(f: {...}): FaultOpLike[]`. `sim.ts` edits: `SimState` gains `rigid: RigidDriver \| null`; `createSim` opts gain `rigid?: RigidSpec`; `autopilotOnEstimate(s)` (new local function); `rigidStep(s, dt, auto, live)` (new local function); `groundContact(s, wing, keepAttitude = false)`. `session.ts`: `createSession(... opts: { mode?; faults?; windOn?; rigid?: RigidSpec })`, `FlightOrigin.opts` the same, `FlightSnapshot.model: 'flight-game@1' \| 'multirotor-rigid@1'` |
| Data model | `RigidSpec` is plain data (JSON-safe) so `FlightOrigin.opts.rigid` can be stored and replayed. The driver is rebuilt from the spec by `createSim`, so `replay`, `ghostFromLog` and `crashReplay` fly the same craft |
| Input and output schemas | Angles in the game convention in and out (degrees; yaw CCW from +x, pitch nose down, roll left bank); the driver converts with `qFromGame` and `gameFromQ`. Round trip tests in T-B19-01 pin the convention |
| API, permissions, migration | None. None. Migration (DRONE 14.2 steps 4 to 5): the game model stays the default; `rigid` unset means no change |
| Algorithm | `rigidStep`: (1) take `auto` (computed on the estimate, below); (2) setpoints from `DriverInput`: angle mode `pitch_sp = auto.pitch ?? expo(stick.pitch, e) * limit`, same for roll, clamped to `+-limit`, `limit = mode.angleLimit ?? fc.angle.limit_deg`; acro: rate setpoints from `rateDps(fc.rates, stick) * rateScale` (the person's tuned rates, not the craft's `acroRate`, a stated difference); yaw rate `auto.yawRate ?? -stick.yaw * rateDps(yaw) ` (stick +1 turns clockwise as `sim.ts:545`); climb mode: `climbSp = (auto.climb ?? stickClimb) * craft.climbRate` with `stickClimb` as `sim.ts:551`; manual: the throttle stick; (3) run `step_hz / 100` rigid steps with these held; (4) copy `p, v, euler` from the truth state into `s`, `u` as the mean motor command, `thrust` as total N, `spin` advanced by the mean rotor speed, `motorsOut` from `motorOut` health, battery fields (`volt, amps, used, low, empty`) and `flipWhy` from `explainTumble` when the roll or pitch has passed 90 degrees; (5) `groundContact(s, false, true)` keeps the crash and landing rules and the z clamp but skips the two attitude-damping lines at `sim.ts:807-810`; (6) `driver.accept(s.p, s.v)` pushes the clamped position and velocity back into the rigid state (`z = 0`, horizontal damping) and levels the body while on the ground (the landing-gear rule of T-B19-15). `autopilotOnEstimate`: save `s.p` and `s.v`, set them to `driver.estimate()`, call `autopilot(s)`, restore both in `finally` (a test proves truth is restored even when `autopilot` throws). `batteryStep`: when `s.rigid`, skip the game's current model and raise the `low` and `empty` events on the driver's flags (`sim.ts:925-937` semantics, including `s.armed = false` on empty). Course wind: when `windOn` is true the driver adds the course's mean wind vector (direction from `from_deg`, speed) and an OU gust of sigma `0.4 * gust` and tau 1.5 s to the environment's wind (an iynk mapping, flagged); the game's two-sine wind is not used. `dispatch` `design`: calls `driver.syncFaults(a.faults)`, which maps `CraftFaults` flags to fault ops recorded at that time: `fcReversed` to FC mount yaw 180, `propsSwapped` to a handedness swap on motors 1 and 2, `motorDirUnchecked` to a phase swap on motor 1; other flags are wing or tricopter flags and are ignored by the rigid driver (the Break it switches for those crafts stay on the game model) |
| State, validation, errors | The driver holds a `RigidFlight`. A non-finite state stops the run: `crashed = true` with a `flight-warn state-nonfinite` and the tumble cause `ground`. `createSession` with a spec that fails `validateFcParams` throws `RangeError` listing issues (callers validate first) |
| Edge cases | `step_hz` 500 and 2000 (sub-step counts 5 and 20). `pid_hz` 500. Arming in the air (blocked by `tryArm`, unchanged). A mode switch mid-flight (inputs held). Reset while spinning down. Motor-out with `n > 4` (no scripted uncontrolled branch: the game's `uncontrolled` flag at `sim.ts:516` is bypassed). Wing and VTOL crafts never get a spec (`rigidParamsFromCalc` refuses) |
| Performance | One game step costs `step_hz / 100` rigid steps: at 1 kHz 10 steps of about 5 microseconds (ESTIMATED), so 50 microseconds per 10 ms, well under the 16 ms frame. The 30-per-second state to the view is unchanged |
| Unit tests | `rigid-driver.test.ts`: `mapCraftFaults`; setpoint mapping per mode (angle, acro, climb, manual) with the sign checks; `estimate()` differs from truth with default sensors and equals truth with ideal sensors; `accept` clamps. `rigid-session.test.ts`: (1) existing behaviour: a session without `rigid` gives frames equal to a stored hash of 600 steps (guard); (2) rigid hover: arm in `alt-hold`, throttle stick up for 2 s, then centred: altitude stable within 0.3 m for 10 s; (3) replay: the session log replayed through `replay(...)` reproduces `frameOf` JSON at every 100th step; (4) `ghostFromLog` on a rigid lap returns a track (laps need a course; use `bando` or the `race` course and the demo mode); (5) `autopilotOnEstimate` restores truth even on a throw; (6) Break it `fcReversed` on a rigid quad crashes with cause `flipFc` through `causeOf`; (7) battery empty raises the events and disarms; (8) wind toggle changes drift |
| Integration tests | The demo autopilot on a rigid quad5 passes the first gate or checkpoint of `bando` within 90 simulated seconds; the run is repeated twice with equal frames. If it does not, the task reports the failing phase and does not edit `autopilot` |
| Playwright | None here (T-B19-27 and T-B19-29) |
| Fixtures | `src/lib/flight/testdata/rigid-quad5.spec.json` (a `RigidSpec` built from `rigidParamsFromCalc` for quad5 with default sensors and `freestyle5` gains) |
| Acceptance | Given a rigid quad on the range, When I arm in angle mode and push the pitch stick, Then it flies forward and the gate logic counts a gate. Given the same log, When replayed, Then frames are equal. Given the existing flight, drone and dronelab tests, When run, Then the pass count equals the recorded baseline (DA-02) |
| Observability, release blockers | `flight-warn` events appear in the same event channel as other `FlightEvent`s via a new `{ type: "warn"; code: string }` member only if the HUD needs it; otherwise they go to the local errors store (no new `FlightEvent` member in this task). Blocker: any change to a game-model code path that alters a stored hash; `sim.ts` import of a Node or DOM module |
| Definition of done | Three source files and the matrix cell (if needed) committed, two tests, one fixture; the pass count equals the baseline in the commit body; `git diff --stat` shows `sim.ts` changes limited to the places listed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/lib/flight src/lib/dronelab src/lib/drone src/components/flight src/sim/flight/rigid-driver.test.ts`; `npx vitest run src/architecture.test.ts`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: Q1 and Q2, the difference that the rigid model uses the FC's own rates and angle limit. Revert (the `rigid` option disappears, nothing else changes) |
| Later tasks need | `createRigidDriver`, `RigidDriver`, `FlightSnapshot.model`, `createSession(... rigid)` (22, 27, 29) |

---

### T-B19-19 Bench-flight set, envelope and the analysis worker

| Field | Content |
|---|---|
| Identity | T-B19-19 / headless analysis, `src/sim/flight` and `src/sim-host` / B19 / P0, size L / depends on T-B19-03, 15 / not started |
| Problem | Comparing two designs needs five scripted tests with the same seed (DRONE 11.4), and the flight envelope (BRIEF 12.1) comes from the same machinery. Jobs take seconds, so they run in a worker with progress and cancel (DRONE 14.1) |
| Target user | Someone choosing between two builds; T-B19-24, 25, 26 |
| User story | As someone with two builds, I press Compare and see per-metric differences within seconds without the page freezing |
| Expected behaviour | `benchSteps` runs hover hold, rate steps, punch-out, endurance and max speed headless and yields progress; `compareBuilds` negates exactly when swapped; `flightEnvelope` returns five numbers with their assumptions; a worker runs a job off the main thread with progress and cancel and caps each test at 600 simulated seconds |
| Success metric | DA-18: the five tests on quad5 finish in under 20 s on this machine (the baseline device is UNKNOWN until the RS-01 follow-up) and ten runs give identical numbers; DA-13: comparing A to B and B to A negates every difference exactly and lists the same assumptions; cancel stops a job within 100 ms of the next chunk |
| Existing files | B18 `src/sim/flight/endurance.ts` and `propulsion.ts` (endurance range, static solve); T-B19-15 `runHeadless`, `RigidSpec`; T-B19-03 metrics and `firstDifference`; B3 `src/protocol/rpc.ts` (`createRpcPort`, `createInlinePort`; precondition `ls src/protocol`), `src/sim-host/host.ts` (pattern); `src/lib/interp/check-client.ts:17, 38` (Worker creation pattern and 2 s grace) |
| New files | `src/sim/flight/bench-set.ts`, `envelope.ts`, `src/sim-host/flight-analysis.worker.ts`, `src/sim-host/flight-analysis-host.ts` (4). Tests: `bench-set.test.ts`, `envelope.test.ts`, `src/sim-host/flight-analysis.test.ts` |
| Modules and signatures | `bench-set.ts`: `export type BenchId = 'hover' \| 'rate-roll' \| 'rate-pitch' \| 'rate-yaw' \| 'punchout' \| 'endurance' \| 'maxspeed'; export const BENCH_VERSION = 1; export interface BenchResult { id: BenchId; metrics: Record<string, number \| null>; trace: FlightTrace \| null; assumptions: string[]; simSeconds: number; capped: boolean }; export interface BenchRun { results: BenchResult[]; model: string; docHash: string; seed: number }; export function* benchSteps(spec: RigidSpec, o: { seed: number; tests?: readonly BenchId[]; maxSimS?: number }): Generator<{ progress: number; label: string }, BenchRun>; export function runBenchSet(spec: RigidSpec, o: { seed: number; tests?: readonly BenchId[] }): BenchRun; export interface CompareRow { id: string; unit: string; a: number \| null; b: number \| null; delta: number \| null }; export interface CompareReport { rows: CompareRow[]; assumptionsEqual: boolean; assumptionDiffs: string[] }; export function compareBuilds(a: BenchRun, b: BenchRun): CompareReport; export function stickForRate(rates: RateSet, dps: number): number`. `envelope.ts`: `export interface Envelope { climb_mps: number; vmax_mps: number; bankMax_deg: number; payload_g: number; vBestEndurance_mps: number; assumptions: string[]; tier: 'T1' }; export function flightEnvelope(spec: RigidSpec, o?: { vPack?: number }): Envelope; export function solveMaxSpeed(spec: RigidSpec, vPack: number): { v_mps: number; trim_deg: number; thrustLimited: boolean }`. `flight-analysis-host.ts`: `export interface AnalysisJob { result: Promise<BenchRun>; cancel(): void }; export function runAnalysis(spec: RigidSpec, o: { seed: number; tests?: readonly BenchId[]; onProgress?: (p: number, label: string) => void; port?: WorkerLike }): AnalysisJob; export function runEnvelope(spec: RigidSpec, o?: { port?: WorkerLike }): Promise<Envelope>`. `flight-analysis.worker.ts`: RPC handler `{ t: 'run' \| 'envelope' \| 'cancel' }` with events `{ t: 'progress' \| 'done' \| 'error' }` |
| Data model | Scripts (DRONE 11.4), all from the `start: { kind: 'hover', z_m: 2 }` state unless stated: hover hold 30 s in `alt-hold` and `angle` (metrics `drift_rms_m`, `alt_err_m`, `i_mean_a`, `v_min`); rate steps 100 deg/s about roll, pitch, yaw in acro at t = 1 s for 1.5 s (`rise_s`, `overshoot`, `settle_s`, `steady_err`); punch-out: full throttle from hover for 2 s (`thrust_peak_n`, `i_peak_a`, `v_min`, `climb_max_mps`); endurance: hover from the ground at full pack up to 600 simulated seconds or cut-off, reporting `time_s`, `capped`, and the B18 closed-form range beside it as `endurance_range_s`; max speed: `solveMaxSpeed`. `assumptions[]` lists seed, `step_hz`, sensor source string, environment (wind zero unless set), propeller inflow form, battery cut-off, `BENCH_VERSION` |
| Input and output schemas | Results hold plain numbers or `null`; traces are optional and capped by `TRACE_LIMITS`. Worker messages are structured-clone safe (specs are JSON-safe) |
| API, permissions, migration | None. No `fetch` in the worker. None |
| Algorithm | `benchSteps` runs each test with `runHeadless`-style stepping in chunks of 5,000 steps, yielding `{progress, label}` between chunks. Same seed gives the same noise for both builds (the seed is the streams' seed, not the build's). `compareBuilds`: for each metric present in both, `delta = a - b` computed once and `b - a` as the exact negation `-(a - b)` so antisymmetry is exact in floating point; `assumptionsEqual` compares the assumption lists. `solveMaxSpeed`: 8 fixed passes of: given a speed estimate, thrust limit `Tmax(v)` from the static solve with inflow and the sagged pack voltage at full duty, trim angle `acos(m g / Tmax)`, speed `sqrt(2 m g tan(trim) / (rho cdA_x))`; report `thrustLimited` when the trim stays under 80 degrees (cap). Envelope: climb from the punch-out test; bank `acos(1 / (T:W))` (BRIEF 12.1) with `T:W` at full throttle on a loaded pack; payload mass at which `hoverDuty` reaches 0.8 by 40 fixed bisection passes; best-endurance speed by scanning 20 speeds from 0 to `vmax` for minimum electrical power (rotors with inflow plus drag). Every entry carries "tier T1" and its assumptions and none is called a limit of a real aircraft. Worker: chunk loop with `await new Promise((r) => setTimeout(r, 0))` between chunks so a `cancel` message is seen; on `cancel` the generator is dropped and the host rejects with `AbortError`; after `cancel()` the host terminates the worker if it has not stopped in 2 s (the B3-14 grace) |
| State, validation, errors | A job has `running`, `done`, `cancelled`, `error`. `maxSimS` caps at 600 per test (DRONE 14.1); a longer request is clamped and `capped: true`. An invalid spec rejects before the first chunk |
| Edge cases | A build that cannot hover (hover duty 1: tests report `null` metrics and an assumption "cannot hover"). A cancel before the first chunk. Two jobs at once (second is queued). Time-accelerated endurance beyond the cap (reports `capped`) |
| Performance | DA-18: under 20 s for the five-test set on this machine (ESTIMATED: hover 30 s + three rate steps of 2.5 s + punch-out 2.5 s at 1 kHz, 5 microseconds a step is under 1 s; endurance up to 600 s is 600,000 steps, about 3 s; so the whole set is expected under 10 s) |
| Unit tests | `bench-set.test.ts`: each test's script on the prototype craft with expected-range assertions (hover drift under 0.1 m RMS, rate step meets the loose Q5 bounds); `stickForRate` inverse of `rateDps`; ten runs equal with `Object.is` on every metric (DA-18); wall time printed and asserted under 20 s only when `FLIGHT_PERF=1`; `compareBuilds` antisymmetry over 200 random metric sets (DA-13) and on two real builds; assumption lists equal. `envelope.test.ts`: bank formula; payload bisection reaches 0.8; `solveMaxSpeed` converges in 8 passes (residual under 1 percent); labels. `flight-analysis.test.ts`: through `createInlinePort`: progress is monotone, result equals the direct `runBenchSet`, cancel rejects with `AbortError`, the 600 s cap |
| Integration tests | The T-B19-03 `firstDifference` on two bench traces of a build with one gain changed marks the first difference near the rate-step start (DA-12 headless): replay with one stick action changed at 3.2 s, marker within one sample of 3.2 s and naming a channel |
| Playwright | A real `Worker` run is part of T-B19-25 and T-B19-29 |
| Fixtures | `src/sim/flight/testdata/bench.quad5.json` (golden metrics from the first run, class N tolerance 1e-9, regenerated only by a commit that says why) |
| Acceptance | Given two builds and the bench set, When compared A to B and B to A, Then each difference is exactly negated and the assumptions are identical (DA-13). Given the five tests on quad5, When run ten times, Then numbers are identical and the set finishes under 20 s (DA-18). Given a recorded flight and a replay with one stick action changed at 3.2 s, When compared, Then the first-difference marker is within one sample of 3.2 s and names the channel (DA-12) |
| Observability, release blockers | Progress events. Blocker: a test using wall-clock time; a worker that imports React or the DOM |
| Definition of done | Four files, three tests, one fixture committed; the DA-18 wall time in the commit body |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight src/sim-host/flight-analysis.test.ts`; `FLIGHT_PERF=1 npx vitest run src/sim/flight/bench-set.test.ts`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: the five scripts, the 600 s cap, the DA-18 time. Revert |
| Later tasks need | `benchSteps`, `runBenchSet`, `compareBuilds`, `flightEnvelope`, `runAnalysis`, `runEnvelope`, `BenchRun` (24, 25, 26, 29) |

---

### T-B19-20 Fidelity entries, notices on flight outputs, banned-word gate

| Field | Content |
|---|---|
| Identity | T-B19-20 / fidelity registry and safety text, `src/sim/registry` and `src/components/studio/drone` / B19 / P1, size M / depends on T-B19-04, 15 / not started |
| Problem | D-007: every model states its tier, what it models and what it does not, and the words "safe", "validated" and the rest are never used about a build or flight. `flight-game@1` and `multirotor-rigid@1` need registry entries; the new screens need SN-4 and SN-8 (DA-14); a test must hold the language line |
| Target user | Anyone reading a flight result; the reviewer of copy |
| User story | As someone looking at a trace, I read that this is a teaching model, which parts are assumptions, and that the simulation is not a certification |
| Expected behaviour | A registry entry for each flight model with tier `T1` and honest lists; a component that shows SN-4 (fly tab header, traces) and SN-8 (every output) from the B18 notice data; a test that scans the new strings, exports and entries for banned words |
| Success metric | The B8 registry loader accepts both entries (asserted tier not above computed tier); `findBanned` finds nothing in the new namespaces, the two export modules, the registry entries; DA-14 string scan finds none of "safe to fly", "certified", "validated", "guaranteed", "approved" |
| Existing files | B8 `src/sim/registry/entries.ts` (`loadRegistry`), `tiers.ts` (`checkEntry`, `BANNED_WORDS`, `findBanned`), `data/*.json`; B18 `src/sim/flight/notices.ts` and `src/components/studio/drone/SafetyNotice.tsx`; `DRONE_ARCHITECTURE.md` 12.2 (notice text), 18 (the table below) |
| New files | `src/sim/registry/data/multirotor-rigid.json` (1), `src/components/studio/drone/FlightNotices.tsx` (1). Edited: `src/sim/registry/data/flight-game.json` if B18 created it, else created (1). Total 3. Tests: `src/sim/flight/strings.test.ts`, `src/sim/registry/flight-entries.test.ts` |
| Modules and signatures | `FlightNotices.tsx`: `export function FlightNotices(props: { surface: 'fly' \| 'trace' \| 'compare' \| 'envelope' \| 'params' \| 'bench'; model: 'flight-game@1' \| 'multirotor-rigid@1' }): JSX.Element` (renders SN-8 always, SN-4 on `fly` and `trace`, SN-7 when an autopilot mode is active, via the B18 `SafetyNotice`). `strings.test.ts` exports a helper `bannedIn(texts: string[]): string[]` used by T-B19-16's test |
| Data model | `multirotor-rigid@1` entry (shape of `FidelityEntry`, SIMULATION 16.2): `kind` as B8 uses for models (precondition: copy the way B8 registered `flight-game@1`, else `'runtime'`), `tier: 'T1'`, `layers: ['L2','L3','L9']` (as B8 numbers them), `implements`: 6-DoF rigid body, rotor ODE, battery with sag, drag per axis, wind with gusts, sensors with noise and bias, complementary estimator, cascaded PID, mixer; `unsupported`: EKF, notch and RPM filters, flexible frame, vibration, blade flapping, ground effect, rotor-rotor interaction, propeller stall, motor heating, magnetometer; `parameterSources`: sensor defaults and the landing rule with type `assumption`; `knownFailureCases`: "no fault-tolerant mixer, a quad with one motor out tumbles"; `labels.chip`: "Teaching model"; `labels.summary`: "Rigid-body teaching model, not checked against flight-controller firmware" until T-B19-21 changes it; `determinismClass: 'N'` (class N before SA-12, changed by T-B19-28 if it passes). `flight-game@1`: tier `T1`, summary "tuned to feel; cannot teach PID tuning" (DA-20 wording) |
| Input and output schemas | JSON entries validated by `loadRegistry` (throws `RegistryError` listing every problem) |
| API, permissions, migration | None. None. None |
| Algorithm | Write the entries from the DRONE 18 table. `FlightNotices` reads text by id from `notices.ts`, no copy in the component. The string test collects: every value of the four new namespaces in English, the entries' `implements/unsupported/summary` text, the export modules' string literals (read with the TypeScript compiler API in the test), and fails with the word and file |
| State, validation, errors | `findBanned` is B8's list (validated, accurate, exact, realistic physics, hardware-accurate, safe to build) plus this task's `DRONE_BANNED = ['safe to fly', 'certified', 'guaranteed', 'approved']` from DA-14 |
| Edge cases | The words appear inside another word ("exactly"): `findBanned` uses word boundaries (B8); this task adds a test with "exactly" that must pass. A language other than English: the scan covers English only (the other five are translations of English text; a reviewer checks them: For Amar item 9) |
| Performance | None |
| Unit tests | `flight-entries.test.ts`: both entries load; `checkEntry` passes; tiers; labels; the summary text contains "not checked". `strings.test.ts`: banned words absent in all scanned sources; positive control (a fixture string with each banned word is caught); "exactly" passes |
| Integration tests | `FlightNotices.test.tsx` (RTL) in `src/components/studio/drone/`: SN-8 on every surface, SN-4 on `fly`, SN-7 only with an autopilot mode |
| Playwright | Covered by T-B19-29 (SN-8 present on each drone page and export) |
| Fixtures | None stored |
| Acceptance | Given every new screen and export, When scanned, Then SN-8 is present and no banned phrase appears (DA-14). Given the registry, When loaded, Then both flight models have entries with tier T1 |
| Observability, release blockers | None. Blocker: a banned word; an entry whose asserted tier is above its computed tier |
| Definition of done | Three source files, two tests committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/registry src/sim/flight/strings.test.ts src/components/studio/drone/FlightNotices.test.tsx` |
| Docs and rollback | Docs line: the entry text. Revert |
| Later tasks need | `FlightNotices`, `bannedIn`, the entry ids (21, 22, 23, 24, 25, 29) |

---

### T-B19-21 Spike RS-14b: compare with PX4 SIH, verdict, label

| Field | Content |
|---|---|
| Identity | T-B19-21 / research spike and label, `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-14-flight-oracle` and `src/sim/registry/data` / B19 / P1, size L / depends on T-B19-05, 15, 03 / not started |
| Problem | Until RS-14 reports, the rigid model is "teaching model, not checked" (DRONE 13.3, R-177). The pass rule is fixed in the plan: rise time and overshoot within 15 percent of PX4 SIH on 3 craft |
| Target user | Amar, who decides how far to trust the model; the label on every flight screen |
| User story | As someone who tunes on this model, I want to know how close its step response is to firmware that real aircraft use |
| Expected behaviour | The same body-rate step is run on `multirotor-rigid@1` for the three parameter sets of T-B19-05; rise time and overshoot are compared; a verdict is written; the registry label follows the verdict by the rule below |
| Success metric | **Falsifiable question:** is `multirotor-rigid@1` within 15 percent of PX4 SIH on 10 to 90 percent rise time and on overshoot of a 100 deg/s roll-rate step, for each of 3 vehicle parameter sets? **Exit condition:** PASS when all six ratios (3 craft x 2 metrics) are within 15 percent; FAIL when any is not, after the investigation list below has been tried and recorded; NOT RUN when T-B19-05 is NOT RUN; INCONCLUSIVE when the loop gains cannot be matched to within 5 percent of DC loop gain (then the plant-only comparison, if PX4 allowed one, is reported instead) |
| Existing files | `RS-14-flight-oracle/results/raw/*`, `params/*` (T-B19-05); T-B19-15 `runHeadless`, `RigidSpec`; T-B19-09 `Mixer.torquePerUnit`; T-B19-03 `stepMetrics` (the definitions are copied into the PX4-side script, so both sides use the same formulae); `src/sim/registry/data/multirotor-rigid.json` (T-B19-20) |
| New files | `RS-14-flight-oracle/REPORT.md`, `results/compare/summary.csv` (docs, 0 counted). Test harness: `src/sim/flight/rs14.compare.test.ts` (test file, 0). Edited source: `src/sim/registry/data/multirotor-rigid.json` (1) |
| Modules and signatures | The harness exports nothing. It reads the raw CSVs, builds three `RigidSpec`s from the `SIH_*` parameter files (mass, `SIH_IXX/IYY/IZZ`, `SIH_L_ROLL/L_PITCH` arms, `SIH_T_MAX`, `SIH_Q_MAX` to `kT`, `kQ`), runs the roll-rate step with `runHeadless`, and writes `summary.csv` with columns `craft, metric, px4_median, iynk, rel_diff` |
| Data model | `summary.csv` plus the verdict line in `REPORT.md`: `RS-14: PASS \| FAIL \| NOT RUN \| INCONCLUSIVE`. Registry change on PASS: `labels.summary` becomes "Checked against PX4 SIH step response on 3 craft: rise time and overshoot within X percent. Not checked against hardware." with `X` the largest ratio rounded up to a whole percent; a `validation` record (status pass, date, `errorMetrics` rows for rise and overshoot per craft); tier stays `T1` (T2 needs bench data, F-163). The word "validated" is never used (D-007) |
| Input and output schemas | CSV as T-B19-05 |
| API, permissions, migration | None. None. None |
| Algorithm | (1) PX4 side: median of 5 runs per craft for rise and overshoot. (2) iynk side: match the plant (mass, inertia, thrust, torque, arm; motor lag unknown in SIH, UNKNOWN, record what SIH does) and match the loop gain: PX4's rate loop is `K * P` normalised torque per rad/s of error; the iynk loop is `kp_si = p * GAIN_SCALE.p` per rad/s through `Mixer.torquePerUnit`; set the iynk `p` so the DC loop gain `kp * torquePerUnit / J` equals PX4's `K * P * torquePerUnitPx4 / J` (the arithmetic goes into REPORT.md); match D and I by the same rule; match gyro filter cut-offs to PX4's `IMU_GYRO_CUTOFF` and `IMU_DGYRO_CUTOFF`. (3) Run the step. (4) Compare. (5) If FAIL, investigate in this order and record each result, each as a single change to the iynk side only: gain mapping check (re-derive), sensor and filter delay (1 step, 2 steps), motor response (assumed time constant 5 ms, 15 ms, 30 ms), mixer scaling. The model code is not edited in this task: a model change that the investigation suggests becomes a finding for Amar (section 9 item 4). The label rule: PASS sets the checked-label above; FAIL, NOT RUN and INCONCLUSIVE leave the label unchanged |
| State, validation, errors | The harness test is skipped with a named reason when `results/raw` is missing (NOT RUN). A failed verdict does not fail CI: this is a measurement. The test fails only when the harness itself throws |
| Edge cases | PX4 and iynk disagree on the step start time (align by the first sample where the setpoint exceeds 5 percent). Overshoot is zero in one system (the ratio is reported as absolute difference in percentage points when the PX4 value is under 2 percent, and the report says so). Lockstep timing in PX4 logs |
| Performance | None |
| Unit tests | None beyond the harness |
| Integration tests | The harness is the test; it prints the table |
| Playwright | None |
| Fixtures | `results/compare/summary.csv` |
| Acceptance | Given the three raw sets, When compared, Then `REPORT.md` states the verdict, shows the six ratios, names the investigation steps tried on FAIL, and the registry label matches the rule. DA-21 is recorded as PASS, FAIL, NOT RUN or INCONCLUSIVE |
| Observability, release blockers | None. Blocker: any claim of "validated"; a label changed on a verdict other than PASS; the 15 percent threshold edited (D-014: a gate threshold is Amar's decision) |
| Definition of done | REPORT, summary, harness and (on PASS) the JSON edit committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/rs14.compare.test.ts src/sim/registry`; `grep -rn "validated" src/sim/registry/data/multirotor-rigid.json` prints nothing |
| Docs and rollback | Docs line: the verdict and the label text. Revert (label returns to "not checked") |
| Later tasks need | The verdict and label text (30) |

---

### T-B19-22 Parameter bindings panel and model picker

| Field | Content |
|---|---|
| Identity | T-B19-22 / drone UI, `src/components/studio/drone` / B19 / P0, size M / depends on T-B19-04, 09, 14, 16, 18, 20 / not started |
| Problem | The person needs to see and change the flight controller parameters and pick which flight model flies, with each model's honest label (DA-20). Two buddies tuning different values must not overwrite each other, so edits are `domain.patch` ops |
| Target user | Someone tuning a build; T-B19-31 and T-B19-29 |
| User story | As someone who wants less overshoot, I change D roll from 30 to 36, fly again, and the console shows the same number |
| Expected behaviour | A form of the parameter groups with ranges, units and CLI names; one patch per committed field; a reset to the profile template; a model picker whose rigid option is disabled with named reasons when parameters are missing; a "What it models" panel; export buttons gated by the first-flight acknowledgement |
| Success metric | Typing 36 in D roll and pressing Enter calls `onPatch({ fcParams: { pid: { d_roll: 36 } } })` once; a value outside the range shows the range and calls nothing; the rigid radio is disabled with the first `ParamIssue` text when `issues` is non-empty; every input has a label and is keyboard reachable |
| Existing files | B18 `src/components/studio/drone/DroneBuilder.tsx` (not edited here), `SafetyNotice.tsx`; B18 first-flight acknowledgement (precondition: `grep -rn "firstFlight\|ackFirstFlight" src`); T-B19-09 `FC_LIMITS`, `defaultFcParams`; T-B19-14 `BINDINGS`; T-B19-16 `dumpFcParams`; T-B19-20 `FlightNotices`; `src/i18n/messages/<lang>/droneparams.json` (T-B19-04) |
| New files | `src/components/studio/drone/ParamBindings.tsx`, `FlightModelPicker.tsx` (2). Edited: the six `droneparams.json` files (1). Total 3. Tests: `ParamBindings.test.tsx`, `FlightModelPicker.test.tsx` |
| Modules and signatures | `export interface ParamBindingsProps { params: FcParams; profile: FcProfile; onPatch(patch: Record<string, unknown>): void; ackFirstFlight: boolean; onNeedAck(): void; onExport(kind: 'dump' \| 'wiring'): void; disabled?: boolean }; export function ParamBindings(p: ParamBindingsProps): JSX.Element; export interface FlightModelPickerProps { value: 'flight-game@1' \| 'multirotor-rigid@1'; onChange(v: 'flight-game@1' \| 'multirotor-rigid@1'): void; rigidIssues: ParamIssue[]; summaries: Record<'flight-game@1' \| 'multirotor-rigid@1', string>; unsupported: string[] }; export function FlightModelPicker(p: FlightModelPickerProps): JSX.Element`. Components are client components, loaded by T-B19-31 through `next/dynamic` with `ssr: false` (`02-guides/lazy-loading.md`) |
| Data model | Test ids for T-B19-29: `param-<dotted path>` on each input (for example `param-pid.d_roll`), `params-reset`, `export-dump`, `export-wiring`, `model-picker`, `model-option-rigid`, `model-option-game`. Strings in `droneparams` (keys per group, field, unit, reset, export, errors with `{min}`, `{max}`) |
| Input and output schemas | Patch objects are RFC 7396 merge patches for `domains.drone.data` (PROJECT_DATA_MODEL 7.2). Nothing is sent anywhere |
| API, permissions, migration | None. Edits require edit access to the project (checked by the caller). None |
| Algorithm | Each field is a controlled text input that commits on blur or Enter: parse, check `FC_LIMITS`, then call `onPatch` with the minimal nested object; on error show the message in an element linked by `aria-describedby` and keep the old value. Groups are `fieldset` with `legend`. The CLI name is shown as small text beside the field. The model picker is a radio group; each option shows the registry summary line (T-B19-20); the game option shows "Tuned to feel. It cannot teach PID tuning." (DA-20); the rigid option lists `unsupported` items in a disclosure. Export buttons call `onNeedAck` when `ackFirstFlight` is false |
| State, validation, errors | Local state holds draft text per field. External `params` changes replace drafts of fields not being edited (buddy edits arrive through the project) |
| Edge cases | Empty input (reverts). `1e3`. Locale decimal comma in `de`, `es`, `fr` (accept both; the stored number uses a dot). Range edge values. Disabled state while a run is active |
| Performance | One render per commit |
| Unit tests | `ParamBindings.test.tsx` (RTL): patch shape for roll, pitch, yaw rates, PID, filters, mixer, angle, failsafe; out-of-range message; comma decimals; buddy update replaces an untouched field; reset emits the template; export gating. `FlightModelPicker.test.tsx`: disabled rigid with the first issue; labels; change callback |
| Integration tests | With the `drone-quad` example `fcParams`, every input shows the example value |
| Playwright | Covered by T-B19-29 |
| Fixtures | None stored |
| Acceptance | Given D roll 30, When I type 36 and press Enter, Then exactly one patch with `d_roll: 36` is sent. Given a missing `rotor.ct0`, When I open the picker, Then the rigid option is disabled and names the part and field |
| Observability, release blockers | None. Blocker: a patch that replaces a whole group; an input with no accessible name |
| Definition of done | Two components, six language files, two tests committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/drone/ParamBindings.test.tsx src/components/studio/drone/FlightModelPicker.test.tsx src/i18n src/sim/flight/strings.test.ts` |
| Docs and rollback | Docs line: panel behaviour. Revert |
| Later tasks need | The two components and their test ids (29, 31) |

---

### T-B19-23 Trace view with a table alternative, and the trace shelf

| Field | Content |
|---|---|
| Identity | T-B19-23 / trace UI and storage, `src/components/studio/drone` and `src/local` / B19 / P0, size L / depends on T-B19-03, 04, 15 / not started |
| Problem | F-217: record a flight and look at attitude, motor outputs and battery sag. Accessibility needs the data as a table too (roadmap B19). Traces must be kept, at most 8 per project, outside the document hash (Q4) |
| Target user | Someone asking why a flight went wrong |
| User story | As someone who crashed, I open the trace, see the motor commands saturate before the flip, and read the same numbers in a table |
| Expected behaviour | A list of the project's traces; a plot of chosen channels with marks (crash, fault); a table view of the same channels at a chosen rate, paged; keep, rename and delete; the shelf enforces the caps |
| Success metric | The plot draws at most 1,000 points per channel for any trace; the table shows the same values as `decodeTrace` for sampled rows; the shelf keeps at most 8 traces and rejects one over 20 MiB; a mark opens its full-rate window |
| Existing files | T-B19-03 `FlightTrace`, `encodeTrace`, `decodeTrace`, `TRACE_LIMITS`, `TracePlot.tsx`; T-B19-20 `FlightNotices`; B3 `src/local/stores.ts` (the `assets` store, sha256 key; precondition: read its put/get API), `src/local/db.ts` |
| New files | `src/components/studio/drone/TraceView.tsx`, `TraceTable.tsx`, `src/local/trace-shelf.ts` (3). Edited: six `dronetrace.json` files (1). Total 4. Tests: `TraceView.test.tsx`, `TraceTable.test.tsx`, `trace-shelf.test.ts` |
| Modules and signatures | `trace-shelf.ts`: `export interface TraceRef { sha256: string; name: string; at: string; modelId: string; bytes: number; marks: number }; export interface TraceShelf { put(projectId: string, t: FlightTrace, name: string): Promise<{ ok: true; ref: TraceRef } \| { ok: false; error: 'too-big' \| 'storage-failed' }>; list(projectId: string): TraceRef[]; get(ref: TraceRef): Promise<FlightTrace \| null>; remove(projectId: string, ref: TraceRef): Promise<void> }; export function createTraceShelf(store: AssetsPort, storage?: Storage): TraceShelf; export interface AssetsPort { put(sha256: string, bytes: Uint8Array): Promise<void>; get(sha256: string): Promise<Uint8Array \| null>; delete(sha256: string): Promise<void> }`. `TraceView.tsx`: `export function TraceView(p: { shelf: TraceShelf; projectId: string; current: FlightTrace \| null; onKeep?(ref: TraceRef): void }): JSX.Element`. `TraceTable.tsx`: `export function TraceTable(p: { trace: FlightTrace; channels: string[]; rate_hz: number; pageSize?: number }): JSX.Element` |
| Data model | Bytes in the IndexedDB `assets` store by sha256 of the encoded trace (Q4); the list of up to 8 `TraceRef`s per project in `localStorage` key `iynk:traces:v1:<projectId>` (try/catch around every access; if storage is blocked the list lives in memory for the session and the view says so). Document and state hash untouched. Test ids: `trace-list`, `trace-item-<n>`, `trace-plot`, `trace-table`, `trace-keep` |
| Input and output schemas | `AssetsPort` is an adapter over B3's store; `createTraceShelf` takes the port so tests use a memory map |
| API, permissions, migration | None. Local only. None |
| Algorithm | Plot: `TracePlot` with the person's channel picks (default attitude and motor commands); decimation to at most 1,000 points by min-max per bucket so spikes survive; marks drawn as labelled ticks; selecting a mark loads its window into the plot at full rate. Table: rows at the chosen rate (default 10 Hz), columns the chosen channels, 100 rows per page, with a `caption` that states unit and rate; values formatted with a fixed number of digits. Shelf `put`: encode, size check, hash, `assets.put`, prepend to the list, drop the oldest beyond 8 (delete its bytes unless another project's list still names the hash: the index is per project, so a delete checks every list it can read; if it cannot read them it keeps the bytes) |
| State, validation, errors | `get` of a missing or corrupt blob returns `null` and the row shows "trace is gone". Decode errors are shown with the `decodeTrace` error name |
| Edge cases | Zero traces (empty state with a one-line hint). A trace with 48 channels (picker scrolls). A 20 MiB trace (decimation cost). Two projects saving the same bytes. Storage quota failure (`storage-failed` message) |
| Performance | Decimation of 6,000 samples x 48 channels under 30 ms (ESTIMATED); table paging does not copy the arrays |
| Unit tests | `trace-shelf.test.ts`: cap of 8 drops the oldest; over-size rejected; hash dedupe; blocked `localStorage` falls back; get of corrupt bytes returns null. `TraceView.test.tsx`: list, select, plot polylines count equals channels, marks. `TraceTable.test.tsx`: values equal the trace, paging, caption |
| Integration tests | Run a 10 s headless flight (`runHeadless`), put the trace, reload the shelf from the same port, `get` equals the original within Float32 rounding |
| Playwright | Covered by T-B19-29 |
| Fixtures | None stored |
| Acceptance | Given a recorded flight, When I open the trace, Then the same numbers are available as a plot and as a table. Given a ninth trace, When saved, Then the oldest is dropped |
| Observability, release blockers | Failures to the local errors store as `{where: 'flight.trace-shelf', message}`. Blocker: trace bytes added to the project document |
| Definition of done | Three components or modules, six language files, three tests committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/drone/TraceView.test.tsx src/components/studio/drone/TraceTable.test.tsx src/local/trace-shelf.test.ts src/i18n` |
| Docs and rollback | Docs line: caps and where bytes live. Revert |
| Later tasks need | `createTraceShelf`, `TraceView`, `TraceTable` (24, 29, 31) |

---

### T-B19-24 Flight compare view

| Field | Content |
|---|---|
| Identity | T-B19-24 / compare UI, `src/components/studio/drone` / B19 / P0, size M / depends on T-B19-03, 04, 19, 20 / not started |
| Problem | R-175: two flights overlay attitude, throttle and battery with the first difference marked; DRONE 11.4: two builds compare per metric on the bench set with identical assumptions |
| Target user | Someone deciding between two builds or two tunings |
| User story | As someone who changed a gain, I see the first moment the two flights differ and which metric moved |
| Expected behaviour | Two inputs (flights as traces, builds as bench runs). A table of metric differences with units, the assumptions of both sides, a swap button that negates the deltas, an overlay plot with the first-difference marker, a sentence announcing the marker for screen readers |
| Success metric | Swapping A and B changes every delta to its exact negative; the marker equals `firstDifference` output; a mismatch of assumptions shows a warning naming the differences |
| Existing files | B18 `src/components/studio/drone/CompareView.tsx` and `CompareView.test.tsx` (T-B18-09f: compares build outputs `auw`, `tw`, `hoverAmps`; not edited, not imported; precondition `ls src/components/studio/drone` and keep both files). T-B19-03 `firstDifference`, `TracePlot.tsx`; T-B19-19 `compareBuilds`, `CompareReport`; `FlightNotices` (T-B19-20); `dronecompare.json` (T-B19-04) |
| New files | `src/components/studio/drone/FlightCompareView.tsx` (1). Edited: six `dronecompare.json` (1). Total 2. Tests: `FlightCompareView.test.tsx` |
| Modules and signatures | `export interface FlightCompareViewProps { a: { label: string; run: BenchRun; trace: FlightTrace \| null }; b: { label: string; run: BenchRun; trace: FlightTrace \| null }; thresholds?: Partial<DiffThresholds>; onThresholds?(t: DiffThresholds): void }; export function FlightCompareView(p: FlightCompareViewProps): JSX.Element`. Client component, loaded with `next/dynamic` and `ssr: false` |
| Data model | Test ids: `compare-table`, `compare-swap`, `compare-first-difference`, `compare-assumptions`, `compare-threshold-attitude`, `-position`, `-command`. Defaults 1 degree, 5 cm, 3 percent (DRONE 11.4), editable |
| Input and output schemas | As props. Differences show `a - b` with the unit; `null` metrics show a dash and a title that says why |
| API, permissions, migration | None. None. None |
| Algorithm | Compute `compareBuilds(a.run, b.run)` once; swap re-runs with swapped arguments (so the exact-negation property is the function's, not the view's). The marker: `firstDifference(a.trace, b.trace, thresholds)`; the plot overlays the chosen channels of both traces with the marker line; the text node reads "First difference at 3.20 s on roll_deg: A 12.1, B 14.7" and has `role="status"` |
| State, validation, errors | Threshold inputs validate positive numbers. Traces with different `rate_hz` show the `rate-mismatch` text instead of a marker |
| Edge cases | Identical flights (no difference: "no difference above the thresholds"). One side with no trace (table only). Different bench versions (warning, no table). Very long traces (plot decimation from `TracePlot`) |
| Performance | No computation beyond the two function calls |
| Unit tests | `FlightCompareView.test.tsx`: table rows; swap negation by `Object.is` on parsed numbers; marker text; assumption warning; threshold edits change the marker; null metrics; rate mismatch |
| Integration tests | With two `runBenchSet` results of the prototype craft with D roll 30 and 20: the marker lands near the first rate step and names `wx_dps` or `roll_deg` (asserted to be one of the attitude or rate channels) |
| Playwright | Covered by T-B19-29 |
| Fixtures | None stored |
| Acceptance | Given two builds, When compared and swapped, Then each difference is negated and the assumptions list is identical. Given two flights that differ from 3.2 s, When compared, Then the marker names the channel and the time within one sample |
| Observability, release blockers | None. Blocker: a difference computed in the view instead of by `compareBuilds` |
| Definition of done | One component, six language files, one test committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/drone/FlightCompareView.test.tsx src/i18n` |
| Docs and rollback | Docs line: thresholds. Revert |
| Later tasks need | `FlightCompareView` (29, 31). It is a different component from B18's `CompareView`; the roadmap row T-B19-07 repeats the old name and is superseded by this file |

---

### T-B19-25 Envelope view and bench-flight panel

| Field | Content |
|---|---|
| Identity | T-B19-25 / analysis UI, `src/components/studio/drone` / B19 / P1, size M / depends on T-B19-04, 19, 20 / not started |
| Problem | The flight envelope (BRIEF 12.1) and the bench set need a screen: run, progress, cancel, results with the metric definitions, and the assumptions beside every number |
| Target user | Someone who wants numbers before flying |
| User story | As someone with a new build, I press Run, watch progress, and read climb rate, top speed, maximum bank, payload and best-endurance speed with what they assume |
| Expected behaviour | `BenchSetPanel` runs the five tests through the worker with a progress bar and a cancel button and shows results; `EnvelopeView` shows the five envelope numbers with the tier chip and "not a limit of a real aircraft" |
| Success metric | Progress is announced (`role="progressbar"` with `aria-valuenow`); cancel returns the panel to idle within one chunk; every number has its unit and assumption text; no number is called a limit of a real aircraft |
| Existing files | T-B19-19 `runAnalysis`, `runEnvelope`, `METRIC_DEFS` (T-B19-03), `Envelope`; T-B19-20 `FlightNotices`; `droneenv.json` (T-B19-04) |
| New files | `src/components/studio/drone/EnvelopeView.tsx`, `BenchSetPanel.tsx` (2). Edited: six `droneenv.json` (1). Total 3. Tests: `EnvelopeView.test.tsx`, `BenchSetPanel.test.tsx` |
| Modules and signatures | `export function EnvelopeView(p: { envelope: Envelope \| null; busy: boolean; onRun(): void }): JSX.Element; export function BenchSetPanel(p: { onRun(tests: BenchId[]): AnalysisJob; onResult(run: BenchRun): void; disabled?: boolean }): JSX.Element`. Client components, `next/dynamic` with `ssr: false` |
| Data model | Test ids: `bench-run`, `bench-cancel`, `bench-progress`, `bench-results`, `envelope-table`, `envelope-run`. Strings in `droneenv` |
| Input and output schemas | As props; the panel owns only the running job |
| API, permissions, migration | None. None. None |
| Algorithm | The panel starts `onRun`, subscribes to progress through the job's callback, shows the label of the current test, renders results as a table (test, metric, value, unit, definition via `METRIC_DEFS`), shows `capped` as "stopped at 600 s". Cancel calls `job.cancel()` and shows "cancelled". The envelope table lists five rows, each with a `title` of assumptions |
| State, validation, errors | States `idle, running, done, cancelled, error`. An error shows the typed message |
| Edge cases | A build that cannot hover (metrics null: message "cannot hover, see check DB-C-01"). Unmount while running (cancels the job). Double click on Run (ignored while running) |
| Performance | Progress updates throttled to 10 per second |
| Unit tests | Both components with a fake job; states; cancel; unmount cancels; texts; null rows |
| Integration tests | The panel with `createInlinePort` on the prototype craft completes and shows five test groups |
| Playwright | Covered by T-B19-29 (a real Worker) |
| Fixtures | None stored |
| Acceptance | Given a build, When I press Run, Then I see progress and then a table of metrics with units. Given a running job, When I press Cancel, Then it stops and says so |
| Observability, release blockers | None. Blocker: an envelope number without its assumption text |
| Definition of done | Two components, six language files, two tests committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/drone/EnvelopeView.test.tsx src/components/studio/drone/BenchSetPanel.test.tsx src/i18n src/sim/flight/strings.test.ts` |
| Docs and rollback | Docs line: panel behaviour. Revert |
| Later tasks need | The two components and test ids (29, 31) |

---

### T-B19-26 Optimiser check on the rigid model

| Field | Content |
|---|---|
| Identity | T-B19-26 / budget optimiser (F-156), `src/sim/flight` / B19 / P2, size M / depends on T-B19-19 / not started |
| Problem | F-156 stays (PRESERVE `src/lib/search/optimize.ts`, which tries 27 combinations by the calculator; B18 T-B18-12 searches the parts library). Neither knows whether the winner can hold a hover with sensors and sag on the rigid model. R-178: explain the trade-off and never hide a constraint |
| Target user | Someone with a budget |
| User story | As someone who picked the cheapest build that passes the checks, I also learn whether it hovers and keeps its voltage on the 6-DoF model |
| Expected behaviour | The top few candidates are re-run on the hover and punch-out tests; each gets a verdict chip: holds hover, minimum voltage, thrust-to-weight on the rigid model. A candidate that cannot hold a hover or sags under the cut-off is flagged, not removed; constraints stay visible |
| Success metric | For 3 candidates the check finishes in under 5 s on this machine (ESTIMATED); a candidate with hover duty 1 is flagged `cannot-hover`; verdicts are deterministic |
| Existing files | `src/lib/search/optimize.ts:1-186` (not edited; `Candidate` type at `:30-43`), B18 `src/sim/flight/optimise.ts` (edited once to carry the verdict), T-B19-19 `runBenchSet` |
| New files | `src/sim/flight/optimise-rigid.ts` (1), `src/components/studio/drone/RigidVerdictChip.tsx` (1). Edited: `src/sim/flight/optimise.ts` (1). Total 3. Tests: `optimise-rigid.test.ts`, `RigidVerdictChip.test.tsx` |
| Modules and signatures | `export interface RigidVerdict { id: string; holdsHover: boolean; hoverDuty: number; vMin: number; twRigid: number; notes: Array<'cannot-hover' \| 'sags-below-cutoff' \| 'estimate-only'> }; export function verifyCandidates(cands: ReadonlyArray<{ id: string; spec: RigidSpec \| null }>, o?: { top?: number; seed?: number }): RigidVerdict[]` (`spec: null` for a candidate the rigid model cannot fly, such as a wing, gives `estimate-only`). `RigidVerdictChip`: `(p: { verdict: RigidVerdict; label: (k: string) => string }) => JSX.Element`. `optimise.ts` edit: its candidate type gains `rigid?: RigidVerdict` and its result function accepts an optional `verify` callback |
| Data model | `RigidVerdict` as above. Thresholds: sag cut-off from `LIMITS` per chemistry (`lib/flight/battery.ts:11-18`, via B18's battery module) |
| Input and output schemas | As signatures |
| API, permissions, migration | None. None. None |
| Algorithm | For each of the top `top` (default 3) candidates by the optimiser's own order: `runBenchSet(spec, { tests: ['hover', 'punchout'] })`; `holdsHover` when the hover test reports `drift_rms_m` below 0.5 m and a finite `i_mean_a`; `vMin` from the punch-out; `twRigid` from peak thrust over weight; notes as above. Order of the list is not changed; the chip is added. The explanation text for R-178 lists the constraint that bound the choice (the optimiser's own `fails`), unchanged |
| State, validation, errors | Pure. A thrown error in one candidate becomes `estimate-only` for that candidate |
| Edge cases | Zero candidates. `top` larger than the list. A candidate for a legacy wing (no spec) |
| Performance | Hover 30 s + punch-out 2.5 s per candidate is about 0.2 s each (ESTIMATED) |
| Unit tests | `optimise-rigid.test.ts`: a feasible build holds hover; an under-powered build (thrust below weight) is `cannot-hover`; determinism; null spec. Chip test: text and `aria-label` |
| Integration tests | With the B18 optimiser on the first parts set: the verdicts attach and the order is unchanged |
| Playwright | None |
| Fixtures | None stored |
| Acceptance | Given an under-powered candidate, When verified, Then it is flagged `cannot-hover` and still listed with its constraints |
| Observability, release blockers | None. Blocker: a candidate removed because of the rigid check |
| Definition of done | Two new files, one edit, two tests committed |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/optimise-rigid.test.ts src/components/studio/drone/RigidVerdictChip.test.tsx src/lib/search`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: what the chip means. Revert |
| Later tasks need | `verifyCandidates`, `RigidVerdictChip` (31) |

---

### T-B19-27 Flight range wiring: model, ghosts by model, medals, touch sticks and gamepad

| Field | Content |
|---|---|
| Identity | T-B19-27 / flight range (F-071, F-072), `src/components/flight` and `src/lib/flight` / B19 / P0, size L / depends on T-B19-18, 22 / not started |
| Problem | R-193: ghosts are offered only when both laps were flown on the same `(course, model id)`. R-194: medals and the daily challenge belong to the game model; on the rigid model only the person's bests show. F-072: touch sticks and gamepad must fly a rigid build. Today ghosts are keyed `iynk:ghost:v1:${craft}:${course}` (`ghost.ts:111`), medals come from the `par` prop (`FlightRange.tsx:233-237`), and the pace ghost is the game-model autopilot lap (`FlightRange.tsx:334`) |
| Target user | Someone flying a build on the range, alone or in a room |
| User story | As someone who switched to the rigid model, I do not see game-model medals or ghosts that would mislead me, and my own bests and ghosts from the rigid model are kept apart |
| Expected behaviour | `FlightRange` takes an optional `rigid` spec and creates the session with it. With a spec: no medal text (the message shows only the time and "best"), no pace ghost, no daily-challenge medals; ghost storage and loading use the model in the key; a ghost saved by another engine version is offered with the text "different engine version, may not match" and is not a race target; friends' poses in a room carry the model so only same-model friends appear as ghosts. Without a spec nothing changes |
| Success metric | Existing `FlightRange.test.tsx` passes unchanged; a rigid range shows no medal text and no pace ghost; two ghost tracks saved for one course on two models do not overwrite each other; a track with an older model version loads and is tagged; touch sticks and the gamepad panel dispatch `sticks` actions that move a rigid craft in a test |
| Existing files | `src/components/flight/FlightRange.tsx`: props `:45-90` (`par` at `:68`), session creation `:158`, `medal` message `:233-237`, ghost load and pace `:330-336`, `keepBest` `:338-347`, `seeCrash` `:362-372`, the stick dispatch in the frame loop near `:498-503`; `src/lib/flight/ghost.ts`: `GhostTrack` `:12-20`, `isGhostTrack` `:103-109`, `keyOf` `:111`, `loadGhost` `:114-122`, `saveGhost` `:124-134`; `src/components/flight/room-ghosts.ts:1-40` (pose carries the course id in `gate`); `TouchSticks.tsx:13-44` (`onChange`), `GamepadPanel.tsx:6` (`padSticks`), `src/lib/flight/input.ts:49-80` (`readSticks`) and `:120` (`padSticks`). Precondition: B18 T-B18-11 changed the ghost key by model; `grep -n "keyOf" src/lib/flight/ghost.ts` and keep its form if so; Precondition 2: `grep -rn useRoomGhosts src`. B13 T-B13-22 (`FlyView`) says there is no `useRoomGhosts` and `room-ghosts.ts` is not imported any more (it is deleted by T-B13-34). If no importer exists, `room-ghosts.ts` and its test are dropped from this task (4 files become 3) and room ghosts return in the buddy-rooms phase. Precondition 3: B18 T-B18-11c already changed `keyOf` (`iynk:ghost:v1:${craft}:${course}${modelSuffix(model)}`), added `GhostTrack.model`, `src/lib/flight/model-id.ts` (`FlightModelId`, `modelSuffix`, `medalForModel`) and a `model` prop on `FlightRange`. If `grep -n "keyOf\|modelSuffix" src/lib/flight/ghost.ts` shows that, this task keeps B18's key and signatures, reuses its prop for the model id, and only adds `ghostStatus`, `GhostTrack.m`/`mv`, and the `rigid` spec prop |
| New files | none. Edited: `src/components/flight/FlightRange.tsx`, `src/lib/flight/ghost.ts`, the six `flight.json` (1 unit); `src/components/flight/room-ghosts.ts` only if the `useRoomGhosts` grep finds an importer. Total 3 (4 with `room-ghosts.ts`). Tests: edit `ghost.test.ts` (new cases only), new `FlightRange.rigid.test.tsx` |
| Modules and signatures | `ghost.ts`: `GhostTrack` gains optional `m?: string` (model id) and `mv?: string` (model version); `export const modelKey = (modelId: string) => (modelId === 'flight-game@1' ? '' : '~' + modelId)`; `keyOf(craft, course, modelId)` (only if B18 left no model-aware `keyOf`; otherwise B18's form stays) returns the old string for the game model and `iynk:ghost:v1:${craft}:${course}~multirotor-rigid@1` for the rigid; `loadGhost(craft, course, modelId = 'flight-game@1')`, `saveGhost(g)` reads `g.m`; `export function ghostStatus(g: GhostTrack, current: { model: string; version: string }): 'same' \| 'other-version' \| 'other-model'`. `FlightRange` props gain `rigid?: RigidSpec`. `room-ghosts.ts` (only if it still has an importer): `useRoomGhosts(course: string, modelId?: string)` sends and compares `course + modelKey(modelId)` in the pose's `gate` field (the relay contract, a string id, is unchanged) |
| Data model | Stored game-model ghosts keep their old key and shape (no migration). Rigid tracks add `m: 'multirotor-rigid@1'`, `mv: FLIGHT_MODEL_VERSION`. `isGhostTrack` stays tolerant of missing `m` and `mv` |
| Input and output schemas | As signatures. `i18n` keys added to `flight.json` (all six languages): `msg.bestOnly` ("{line}, best {time}"), `ghost.otherVersion` ("different engine version, may not match"), `ghost.otherModel`, `medals.rigidNone` ("medals are for the tuned-to-feel model") |
| API, permissions, migration | None. Local storage only (try/catch as today). None |
| Algorithm | In `FlightRange`: `const modelId = rigid ? 'multirotor-rigid@1' : 'flight-game@1'`. Session: `createSession(craft, course, calc, { ..., rigid })`. The medal line: if `rigid`, return the `bestOnly` text, else the existing code. Ghost effect: `setBestGhost(loadGhost(craft.id, course.id, modelId))`; `setPace(rigid ? null : paceGhost(craft, course, calc))`. `keepBest`: `ghostFromLog` already replays with `origin.opts` (the spec is inside), the saved track gets `m` and `mv`. When a loaded track's `ghostStatus` is `other-version`, it is drawn but tagged and not used as the race target colour. Sticks: nothing changes in `readSticks`; the test proves the existing path moves a rigid craft. The daily-challenge component is not mounted by `FlightRange`; the workspace hides it for the rigid model (T-B19-31) |
| State, validation, errors | `loadGhost` of a track with a different `m` than asked returns `null`. A stored rigid track from an older version returns the track and the status `other-version` |
| Edge cases | A course with no medal table (1 of 22, C095 CONTRADICTED "every course has medals"): bests only, no medal claim, unchanged. A craft that has a rigid spec but a course with `par`: ignored for the rigid model. Room with one friend on the game model and one on the rigid model: each sees only same-model ghosts. Private mode storage (as today) |
| Performance | None |
| Unit tests | `ghost.test.ts` additions: keys differ by model; old game key unchanged; `isGhostTrack` accepts old tracks; `ghostStatus`; saving a rigid track does not overwrite the game track. `FlightRange.rigid.test.tsx` (RTL, as `FlightRange.test.tsx`): rigid range shows no medal text after a lap (use the `race` course and the demo mode as the existing tests do), no pace ghost; `TouchSticks` pointer events and a `GamepadPanel` pad dispatch `sticks` and the rigid craft's altitude rises (F-072); `room-ghosts` filtering by model (a fake room; only when the file is kept) |
| Integration tests | The existing `FlightRange.test.tsx`, `ghost.test.ts`, `challenge.test.ts`, `crash.test.ts` pass unchanged |
| Playwright | `e2e/fly.spec.ts` and `e2e/fly.phone.spec.ts` (existing) pass unchanged; the rigid path is in T-B19-29 |
| Fixtures | None stored |
| Acceptance | Given a course and a model id, When I fly, Then my best lap and a buddy's best lap are offered as ghosts only when both were flown on the same `(course, model id)` (R-193). Given a lap on the rigid model, When the ghost list opens, Then game-model ghosts are not offered and the screen says why. Given a user build on the rigid model, Then no medal is shown, only my bests (R-194). Given a replay with another engine version, Then it is offered as "different engine version, may not match" and not as a race target |
| Observability, release blockers | None. Blocker: a medal or "gold" string reachable on the rigid path; a change in the game-model ghost key |
| Definition of done | Three edited files (four if `room-ghosts.ts` is kept) and two tests committed; the existing flight tests green |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/flight src/lib/flight src/i18n`; `E e2e/fly.spec.ts e2e/fly.phone.spec.ts` |
| Docs and rollback | Docs line: keys and status values. Revert |
| Later tasks need | `FlightRange` `rigid` prop, `ghostStatus` (29, 31) |

---

### T-B19-28 `dmath` in flight and the SA-12 flight hash check

| Field | Content |
|---|---|
| Identity | T-B19-28 / determinism, `src/sim/flight` and `e2e` / B19 / P0, size L / depends on T-B19-15, 17, 19 / not started |
| Problem | A12: raw state differs across Node, Chromium and WebKit after 1 to 12 steps because `Math.sin`, `cos`, `atan2`, `exp` differ in the last bit. R-180 wants equal final hashes. The rigid model funnels maths through `fmath.ts` for exactly this switch (Q7). Until SA-12 passes for flight the hash class is N |
| Target user | Anyone replaying a flight in another browser; rooms (class D until this passes, RC-53) |
| User story | As someone who flies in Chrome and replays in Safari, I get the same result |
| Expected behaviour | `fmath.ts` forwards to `dmath`; the same scripted flight is run in Node, Chromium and WebKit (and Firefox when installed) and the checkpoint hashes are compared; if equal, `FLIGHT_HASH_CLASS` becomes `'B'`; if not, the first diverging step and state index are reported and the class stays `'N'` |
| Success metric | Equal final checkpoint hashes and equal hash lists across the browsers at 1x and 4x chunking (R-180); SA-12 flight clause recorded (pass or fail with the divergence); DA-22 browser Worker mean step printed for 1 kHz and 2 kHz |
| Existing files | `src/sim/core/dmath.ts` (B9 T-B9-20: `sin, cos, atan2, exp, log, pow`, `DMATH_VERSION`); `e2e/dmath.spec.ts` (B9; the loader pattern: transpile with the installed `typescript` and add the script to a blank page; not edited); `playwright.config.ts` (B3 added WebKit; B9 handles Firefox as optional); `src/sim/flight/fmath.ts` (T-B19-01) |
| New files | `e2e/flight-hash.spec.ts`, `src/sim/flight/hash.fixture.json` (test data, 0). Regenerated test data (0): `src/sim/flight/testdata/script-20s.checkpoints.json` (T-B19-15 stored Math hashes; they change with `dmath`). Edited: `src/sim/flight/fmath.ts` and, on a class B result, `src/sim/registry/data/multirotor-rigid.json` (`determinismClass`) (2). Total 2 source files. No edit to `dmath.spec.ts`, so B9's test is unchanged |
| Modules and signatures | `fmath.ts` after: `export { sin, cos, atan2, exp, log } from '../core/dmath'` for the functions `dmath` has; `asin` and `acos` stay `atan2` forms; `MATH_BACKEND = 'dmath'`; `FLIGHT_HASH_CLASS` set to `'B'` only by the pass rule below. The spec has no new exports |
| Data model | `hash.fixture.json`: `{ seed, script: "script-20s", engine: "node-arm64", checkpoints: [{ at, hash }], finalHash, generated: <ISO date>, dmathVersion }`; arm64 only (UNKNOWN on x64 until a run there) |
| Input and output schemas | The page receives the module graph through Playwright `page.route`: each request for `/flight/<path>` is answered with `ts.transpileModule(source, { compilerOptions: { module: ESNext, target: ES2022 } })` output as `text/javascript`, so extensionless relative imports resolve as URLs. Precondition: `grep -rn "from \"@/" src/sim/core src/sim/flight` prints nothing outside test files, and every import in these folders is relative; type-only imports are erased. If a module outside these folders is imported by value, the task stops and reports |
| API, permissions, migration | None. No network beyond the local test server. None |
| Algorithm | (1) Switch the backend (the switch affects only the B19 files that route through `fmath.ts`; B18 files keep `Math`, see T-B19-01). Run `npx vitest run src/sim/flight`; the vector comparisons at class N tolerances still pass, but `replay.test.ts` and the closed-loop tests that read `script-20s.checkpoints.json` may fail on hash equality because `dmath` changes the last bits. Regenerate the fixture with the `dmath` backend using the deliberate-regeneration path of T-B19-15, commit it, and re-run `npx vitest run src/sim/flight` after the class decision in step (4) or (5); `replay.test.ts` must read the class from `FLIGHT_HASH_CLASS` and not hardcode `'N'` (T-B19-15 is edited here only if it does). (2) In the spec: Node leg runs `runHeadless` on the `script-20s` entries and the `quad-parts` spec; browser leg loads the graph into a blank page per project (chromium, webkit, plus firefox if the project exists) and runs the same, returning the checkpoint list; chunk invariance: run once with 1/60 s slices (1x) and once with 4/60 s slices (4x) and require equal lists. (3) Compare every hash. (4) If all equal: set `FLIGHT_HASH_CLASS = 'B'`, update the registry entry's `determinismClass` to `'B'` (JSON edit, listed under files), write the fixture. (5) If unequal: print the first step where `vec` differs and the state index; search for a remaining non-deterministic source (candidates: `Math.hypot`, `Math.pow`, `Math.fround`, `Float32Array` conversions in the trace, `Array.prototype.sort` comparator on equal keys); fix in `fmath.ts` only if the cause is there; two attempts, then stop and record the divergence (CLAUDE.md failure rule). (6) DA-22 in browsers: in each page start a dedicated Worker from the served module URL, run 20,000 steps after 5,000 warm-up at `step_hz` 1000 and 2000 and return the mean in microseconds (`performance.now()` inside the page's test code, allowed outside `src/sim`); print; hard assertion at 200 microseconds as a smoke bound, and at 50 microseconds when `FLIGHT_PERF=1` |
| State, validation, errors | Playwright skips the Firefox leg with a named reason when the project does not exist (B9 pattern); it never passes silently on a missing WebKit (under `CI=true` it fails and names the missing browser, R-001) |
| Edge cases | arm64 only fixtures (an x64 machine regenerates and compares within the run, not against the fixture, and says so). `Math.sqrt` is exact in all engines so `sqrt` stays. Timer resolution in WebKit (1 ms): the mean over 20,000 steps is what is asserted |
| Performance | The spec runs in about a minute (ESTIMATED). The `dmath` slowdown is under 6 times `Math` per function (SA-12; B9's number); flight step cost with `dmath` is re-measured and printed |
| Unit tests | The vitest suite of `src/sim/flight` re-run twice: after the backend switch and after the class decision (the ban test, class N tests, replay with the regenerated fixture) |
| Integration tests | `e2e/flight-hash.spec.ts` is the integration test: Node, Chromium, WebKit (Firefox if present), 1x and 4x |
| Playwright | `E e2e/flight-hash.spec.ts` |
| Fixtures | `src/sim/flight/hash.fixture.json`; regenerated `src/sim/flight/testdata/script-20s.checkpoints.json` |
| Acceptance | Given the same design, seed and input log, When replayed in Chromium and WebKit, Then final state hashes are equal at 1x and 4x (R-180). SA-12 flight clause: recorded as PASS, or FAIL with the divergence |
| Observability, release blockers | The spec prints a table: engine, final hash, equal or not, mean step in microseconds. Blocker: setting class B without an equal-hash run recorded; editing B9's `dmath.ts` or `dmath.spec.ts` |
| Definition of done | Edit, spec, both fixtures committed; class set by the rule; `npx vitest run src/sim/flight` green after the class decision; the table in the commit body |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight`; `E e2e/flight-hash.spec.ts`; `FLIGHT_PERF=1 E e2e/flight-hash.spec.ts`; `npx tsc -p tsconfig.portable.json` |
| Docs and rollback | Docs line: the table, the class, the arm64 caveat. Revert (backend returns to `Math`, class N) |
| Later tasks need | The final class and table (29, 30) |

---

### T-B19-29 End to end: fly your build twice and compare

| Field | Content |
|---|---|
| Identity | T-B19-29 / end to end, `e2e` / B19 / P0, size L / depends on T-B19-01 to 28 and 31 / not started |
| Problem | The exit gate says Amar flies his build twice and compares. An agent cannot be Amar, but the same path must work in a real browser on a production build, keyless, on a phone as well |
| Target user | Amar at the phase stop; the next maintainer |
| User story | As someone who built a quad, I fly it on the rigid model, change a gain, fly again, compare the two and take the parameters out |
| Expected behaviour | One spec walks the path: open a drone project, choose the rigid model, fly with the keyboard, keep the trace, change D roll, fly again, compare, run the bench set, read the envelope, export the dump after the first-flight acknowledgement. A second, phone spec flies with touch sticks |
| Success metric | The spec passes on a production build in Chromium; the phone spec passes in the Pixel 7 project; axe reports no violations on each drone tab; SN-8 is visible on every tab; no console error matching `hydrat\|did not match\|Minified React error`; no request leaves the origin |
| Existing files | `e2e/fly.spec.ts:1-60` (helpers: `watchErrors`, `main`, the mode select pattern, `flight.json` imports), `e2e/dronelab.spec.ts`, `@axe-core/playwright` (used at `fly.spec.ts:2`), B18 `e2e/drone-build.spec.ts` (how it creates or opens a build; reuse its helper if exported, else open the shipped `quad5` project from B13), B4 Studio routes (`src/app/[lang]/studio/...`, T-B3-21 and T-B4) |
| New files | `e2e/drone-fly.spec.ts`, `e2e/drone-fly.phone.spec.ts` (2 test files, 0 counted source) |
| Modules and signatures | Uses the test ids: `drone-tab-tune`, `drone-tab-fly`, `drone-tab-traces`, `drone-tab-compare`, `drone-tab-envelope` (T-B19-31); `model-picker`, `model-option-rigid`, `param-pid.d_roll`, `export-dump` (T-B19-22); `trace-list`, `trace-plot`, `trace-table`, `trace-keep` (T-B19-23); `compare-table`, `compare-swap`, `compare-first-difference` (T-B19-24); `bench-run`, `bench-progress`, `bench-results`, `envelope-table` (T-B19-25); `flight-message` (existing range) |
| Data model | None |
| Input and output schemas | Downloads: the dump text is read from the download stream and its first line asserted equal to the SN-8 text from `src/i18n/messages/en` |
| API, permissions, migration | None. None. None |
| Algorithm | (1) Open the drone project; assert `drone-tab-fly`; pick the rigid option; assert the summary text contains "not checked" (or the PASS label of T-B19-21 if it applies: the test reads the registry JSON to decide). (2) Arm, hold `ArrowUp`/`KeyW` per the range's keys until the message says takeoff; hover 3 s in altitude hold; keep the trace. (3) Open `drone-tab-tune`, set `param-pid.d_roll` to a lower value, Enter. (4) Fly again; keep. (5) Open `drone-tab-compare`; pick the two traces; assert `compare-first-difference` text includes a channel id and a time; press `compare-swap` and assert the table deltas are negated (parse numbers); run the bench set with two tests (`hover`, `rate-roll`) and wait for `bench-results` (a real Worker); assert the progress bar existed. (6) `drone-tab-envelope`: run, assert five rows each with a title. (7) Export: click `export-dump`, the acknowledgement panel appears, accept, download, assert the first line. (8) Axe on each tab; SN-8 on each; no external requests (`page.on('request')` host check). The phone spec: Pixel 7, open the fly tab, pick the rigid model, drag the left touch stick up (the pointer sequence `TouchSticks.tsx` expects), assert takeoff in the message |
| State, validation, errors | Timeouts: 120 s per test as `fly.spec.ts`. A step that depends on a landed feature uses `test.skip` with the name only when the module file does not exist (as `fly.spec.ts:17`); under `CI=true` a missing feature fails |
| Edge cases | The page not hydrated at first click (use `toPass` as `fly.spec.ts:44`). WebKit not run here (Chromium and phone only). Timing: the flight is driven by key state, not wall clock waits; waits are on messages and on `waitForFunction` of the HUD fields |
| Performance | The spec runs in under 4 minutes (ESTIMATED) |
| Unit tests | None |
| Integration tests | This is the integration test |
| Playwright | `E e2e/drone-fly.spec.ts e2e/drone-fly.phone.spec.ts` |
| Fixtures | None stored |
| Acceptance | Given a drone project, When I fly twice on the rigid model with a gain changed between, Then the compare tab marks the first difference with a channel and a time, swapping negates the deltas, the bench set runs in a Worker and the exported dump starts with SN-8. Given a phone, When I use the touch sticks, Then the craft takes off |
| Observability, release blockers | None. Blocker: a skip under `CI=true` for a feature that landed; an external request |
| Definition of done | Two specs committed and passing |
| Verify commands | `npm run typecheck && npm run lint`; `E e2e/drone-fly.spec.ts e2e/drone-fly.phone.spec.ts`; `E e2e/fly.spec.ts e2e/dronelab.spec.ts` |
| Docs and rollback | Docs line: the walk-through steps (T-B19-30 copies them as the manual checklist for Amar). Revert |
| Later tasks need | The pass record (30) |

---

### T-B19-30 `docs/DRONES.md` extension and the phase record

| Field | Content |
|---|---|
| Identity | T-B19-30 / documentation, `docs` / B19 / P1, size M / depends on T-B19-21, 28 and 29 (the other tasks leave their Docs lines in their commit bodies) / not started |
| Problem | The roadmap names `docs/DRONES.md` extended. Every earlier task left a "Docs:" line in its commit body; the DA and SA numbers must be recorded for the exit gate. Amar needs a checklist to fly his build twice |
| Target user | Amar at the stop; a friend reading how the model works and what it leaves out |
| User story | As someone who reads the drone page, I find what the rigid model does, what it does not, which numbers are assumptions, and how to take parameters out |
| Expected behaviour | `docs/DRONES.md` gains sections: the two flight models and the labels; the equations and sign rules; sensors and estimator with the defaults table marked "iynk assumption"; controller and mixer; environment and failures; traces, metrics and comparison; bench set and envelope; replay and the hash class; the parameter dump and its loss list; "Not modelled yet"; the acceptance record table; a manual checklist for the two-flight comparison |
| Success metric | The acceptance table lists DA-06 to DA-10, DA-12, DA-13, DA-18, DA-19, DA-21 to DA-23, DA-26 and SA-12 each with result, number and commit hash; the banned-word test passes on the file; every link target exists |
| Existing files | `docs/DRONES.md` (created by B18 T-B18-03 or T-B18-13; precondition `ls docs/DRONES.md`; if absent, create it with the B18 safety-notice section left to B18's record and note the gap), `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-14-flight-oracle/REPORT.md`, commit bodies of tasks 01 to 29 |
| New files | none. Edited: `docs/DRONES.md` (1). Tests: `src/sim/flight/strings.test.ts` is extended to scan this file (edit of an existing test, 0) |
| Modules and signatures | None. Sections as in "Expected behaviour" |
| Data model | The acceptance table columns: `id, what was measured, result, number, task, commit` |
| Input and output schemas | Markdown, plain words, no em dashes, labels VERIFIED, DOCUMENTED, EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN on claims |
| API, permissions, migration | None. None. None |
| Algorithm | Collect each task's "Docs:" lines with `git log build/v1 --grep "B19 T-B19" --format=%B`; write the sections; fill the table from the recorded numbers (DA-06 hover difference, DA-07 runs, DA-08 errors, DA-18 wall time, DA-22 microseconds, DA-21 verdict, SA-12 table); mark anything not run as NOT RUN with the reason. The manual checklist: build or open a quad, pick the rigid model, take off, hover 10 s, keep the trace, lower D roll, fly again, open Compare, read the first difference, run the bench set, export the dump, read the loss list |
| State, validation, errors | A number that no commit body carries is written UNKNOWN, not guessed |
| Edge cases | RS-14 NOT RUN (the label section says so). SA-12 FAIL (class N stays; the section explains the consequence for rooms: class D) |
| Performance | None |
| Unit tests | `strings.test.ts` scan of `docs/DRONES.md`; a link check (`grep -o "](\\./[^)]*)"` targets exist) in the same test |
| Integration tests | None |
| Playwright | None |
| Fixtures | None |
| Acceptance | Given the file, When read by someone new, Then they can tell which flight model is which, what each assumes, and how to repeat the two-flight check |
| Observability, release blockers | None. Blocker: a banned word; a number with no source commit |
| Definition of done | File edited, test passes |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/strings.test.ts` |
| Docs and rollback | This is the docs task. Revert |
| Later tasks need | The phase exit procedure (section 8) |

---

### T-B19-31 Mount the views in the Studio drone workspace

| Field | Content |
|---|---|
| Identity | T-B19-31 / drone workspace, `src/components/studio/drone`, `src/components/studio/lab` and `src/components/dronelab` / B19 / P0, size L / depends on T-B19-18, 19, 22, 23, 24, 25, 26, 27 / not started |
| Problem | The panels exist as separate components. Something has to hold the project's drone data, build the `RigidSpec`, own the analysis job and the trace shelf, and put the tabs, the model picker and the notices on the page |
| Target user | Anyone using the drone workspace |
| User story | As someone with a drone project open, I see Tune, Fly, Traces, Compare and Envelope tabs and the rigid model is one click away |
| Expected behaviour | `DroneTabs` shows the five tabs (lazy-loaded), `useDroneFlight` derives the spec from the project and exposes patch, trace and analysis functions; the fly tab passes `rigid` to the range, hides the daily challenge for the rigid model, shows `FlightNotices`; a trace is captured from the session and offered to the shelf |
| Success metric | Opening a drone project shows five tabs with the test ids; switching the model picker to rigid recreates the session with a spec built from the project; editing a gain in Tune is visible in the next flight; unmounting cancels a running job |
| Existing files | B13 `src/components/studio/lab/CraftPanel.tsx` (T-B13-08; the one workspace host that is edited; B18 `src/components/studio/drone/DroneBuilder.tsx` is not edited) and `src/components/studio/lab/FlyPanel.tsx`, which runs B13 `src/components/dronelab/FlyView.tsx` (T-B13-22; holds `FlightRange`, `DailyChallengeCard` from `src/components/flight/DailyChallenge.tsx:42`, `BreakIt`). Precondition: `ls src/components/dronelab src/components/studio/lab`. `FlyWorkspace.tsx` is deleted by T-B13-38 and must not be recreated or edited; if it still exists, B13 is incomplete: stop and report. `grep -rn "DailyChallengeCard" src` must show the file that mounts it (expected `FlyView.tsx`); the hide logic goes in that file; B4 project hooks (precondition: `grep -rn "export function use" src/studio`); B18 `src/project/apply/domain-drone.ts` (the `domain.patch` helper); `src/components/flight/DailyChallenge.tsx` |
| New files | `src/components/studio/drone/DroneTabs.tsx`, `src/components/studio/drone/useDroneFlight.ts` (2). Edited: `src/components/studio/lab/CraftPanel.tsx` (mounts `DroneTabs`) and `src/components/dronelab/FlyView.tsx` (rigid prop, picker, notices, daily-challenge hide; if the grep shows the card is mounted in `FlyPanel.tsx`, edit `FlyPanel.tsx` instead and leave `FlyView.tsx`) (2). Total 4. `DroneBuilder.tsx` is not edited. `FlyView`'s own tests are edited only to add the rigid cases. Tests: `DroneTabs.test.tsx`, `useDroneFlight.test.tsx` |
| Modules and signatures | `useDroneFlight.ts`: `export function useDroneFlight(projectId: string): { model: 'flight-game@1' \| 'multirotor-rigid@1'; setModel(m: ...): void; spec: RigidSpec \| null; issues: ParamIssue[]; fcParams: FcParams; patch(p: Record<string, unknown>): void; shelf: TraceShelf; capture(session: FlightSession): Promise<TraceRef \| null>; runBench(tests: BenchId[]): AnalysisJob; runEnvelope(): Promise<Envelope>; dispose(): void }`. `DroneTabs.tsx`: `export function DroneTabs(p: { projectId: string }): JSX.Element`. `FlyView` edit (props gain `rigid?: RigidSpec`): accepts `rigid`, passes it to `FlightRange`, shows `FlightModelPicker` and `FlightNotices surface="fly"`, hides `DailyChallenge` when `rigid` is set with the line "the daily challenge uses the tuned-to-feel model" |
| Data model | The chosen model is stored in `domains.drone.data.flight.model` through `domain.patch` (so it persists and buddies see it). The trace for `capture` is built by replaying the session log headless on the same spec (`ghostFromLog` pattern: the session log plus `origin` give the same flight), recorded with `TraceRecorder`; this keeps the range loop free of recording work |
| Input and output schemas | As signatures. `spec` is `null` when `issues` is non-empty or the model is the game model |
| API, permissions, migration | None. Edit actions need edit access to the project (checked by the project hook). None |
| Algorithm | Derive `RigidSpec` from the project with `rigidParamsFromProject` (or `rigidParamsFromCalc` for `legacy-craft` kind), `DEFAULT_IMU`, `fcParams`, `environment` and a seed from `crypto.getRandomValues` once per session (stored in the spec so replay is exact); memoise on the document hash and the parameter patch. `capture`: take `session.log()` and `session.origin`, replay in a worker-free inline loop with `replay(...)`'s `onStep` hook, sample `frameOf` and the driver's `flight()` aux into `TraceRecorder`, then `shelf.put`; a captured flight has the 100 Hz game-step rate and no full-rate event windows (those come only from headless runs such as the bench set). Tabs are lazy with `next/dynamic` and `ssr: false` (`02-guides/lazy-loading.md`) so the first load stays light |
| State, validation, errors | `dispose()` cancels the analysis job and clears the shelf subscriptions. A project with a game-model craft shows Tune and Fly only; traces, compare and envelope appear when the model is rigid |
| Edge cases | Project changes while a bench job runs (the job continues on the old spec; the result is labelled with its document hash and shown as stale). Legacy craft kinds that cannot fly rigid (wing, tricopter): the picker says so and the rigid option stays disabled. Two buddies in a room changing the model (last patch wins, both see it) |
| Performance | Tabs load on demand; the shell adds under 20 KB gzipped (ESTIMATED) |
| Unit tests | `useDroneFlight.test.tsx`: spec derivation from the `drone-quad` example; patch calls the helper with the nested object; `dispose` cancels; issues disable the spec. `DroneTabs.test.tsx`: tabs and test ids; traces tab hidden for the game model; the fly tab passes `rigid` to a stub range |
| Integration tests | `FlyView` with a rigid spec renders `FlightRange` with the prop and no `DailyChallenge` (existing `FlightRange` tests untouched) |
| Playwright | Covered by T-B19-29 |
| Fixtures | None stored |
| Acceptance | Given a drone project, When I switch to the rigid model, Then the range flies it and the traces, compare and envelope tabs appear. Given the game model, When selected, Then the daily challenge returns |
| Observability, release blockers | None. Blocker: the rigid code loaded on first paint of any non-drone page (bundle check: `BUILD` output route sizes compared with the B1 baseline; the drone workspace chunk may grow, other routes may not) |
| Definition of done | Two new files, two edits, two tests committed; `BUILD` succeeds |
| Verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/drone src/components/dronelab src/components/flight`; `BUILD` (`KL NEXT_DIST_DIR=.next-build npm run build`) |
| Docs and rollback | Docs line: tab structure. Revert |
| Later tasks need | The tabs and test ids (29) |

---

## 7. Coverage of features, requirements and the exit gate

| Item | Where it is built or proven |
|---|---|
| F-218 Flight environment and failure models (R-176) | Wind, gusts, density, failure schedule: T-B19-07. Sensors and failure modes: T-B19-08. Faults, desync, brown-out, failsafe: T-B19-17. Seeded and recorded as input entries: T-B19-02, 07, 17 |
| F-217 Flight traces and comparison (R-175; scope line omits it, Q13) | Trace and metrics: T-B19-03. Views: T-B19-23, 24. Bench set: T-B19-19 |
| F-074a Rigid model (R-177 label) | T-B19-01, 06, 10, 11, 12, 13, 15; label by RS-14: T-B19-05, 21. F-074b (SITL) is not built |
| F-071 Medal times and daily challenge (R-194) | Game model only; the rigid path shows bests only, the daily challenge is hidden for it: T-B19-27, 31 |
| F-072 Touch sticks and gamepad | Proven on the rigid model in `FlightRange.rigid.test.tsx` (T-B19-27) and the phone spec (T-B19-29) |
| F-156 Budget optimiser | Existing optimiser kept; rigid verdicts added: T-B19-26 |
| F-070 Ghosts keyed by model (R-193) | T-B19-27 |
| R-180 Cross-browser replay | T-B19-02 (log), T-B19-15 (checkpoints), T-B19-28 (Chromium and WebKit at 1x and 4x) |
| DA-06 | T-B19-13, 15 |
| DA-07 | T-B19-02 (legacy round trip), T-B19-15 (ten runs), T-B19-28 (browsers) |
| DA-08 | T-B19-10 |
| DA-09 | T-B19-03 |
| DA-10 | T-B19-17 (flip through the controller and the grep) |
| DA-12 | T-B19-03 (synthetic), T-B19-19 (headless replay with one stick change at 3.2 s), T-B19-24 (UI) |
| DA-13 | T-B19-03, T-B19-19, T-B19-24 |
| DA-18 | T-B19-19 |
| DA-19 | T-B19-14, 16 |
| DA-21 | T-B19-05, 21 (PASS, FAIL, NOT RUN or INCONCLUSIVE is the record) |
| DA-22 | T-B19-15 (Node), T-B19-28 (browser Worker) |
| DA-23 | T-B19-17 |
| DA-26 | T-B19-07 |
| SA-12 (flight clause) | T-B19-28 (the `dmath` clauses themselves were B9's) |
| Kept green | DA-02 (the recorded flight-test baseline of T-B19-18, 342 golden rows, per-craft content tests): T-B19-18 and every later verify; DA-14 (SN-8 and banned words) extended by T-B19-20, 30; DA-20 label for the game model: T-B19-20, 22 |
| Gate | `npm run check`; the DA and SA ids above recorded in `docs/DRONES.md` (T-B19-30); Amar flies twice and compares (section 9 item 1) |

## 8. Phase exit procedure

| Step | Command or action | Pass |
|---|---|---|
| 1 | `git status` on `build/v1` is clean; `git log --oneline` shows 31 commits `B19 T-B19-<nn>` authored as Amar Kushwaha, none with `Co-Authored-By` or "Generated with" | yes |
| 2 | `npm run check` (content check, typecheck, lint, all vitest suites, all Playwright specs) with the keyless prefix | zero failures |
| 3 | `npx tsc -p tsconfig.portable.json` | zero errors |
| 4 | `FLIGHT_PERF=1 npx vitest run src/sim/flight/perf.test.ts src/sim/flight/bench-set.test.ts` on a quiet machine | DA-22 under 50 microseconds at 1 kHz and 2 kHz, DA-18 under 20 s |
| 5 | `E e2e/flight-hash.spec.ts` | SA-12 flight clause recorded (equal, or the divergence recorded) |
| 6 | Read `docs/DRONES.md` acceptance table and `RS-14-flight-oracle/REPORT.md` | every id in the exit line has a result and a number, or NOT RUN with a reason |
| 7 | Amar follows the manual checklist in `docs/DRONES.md` and flies his build twice | his OK |
| 8 | After the OK the orchestrator makes the local tag `phase-B19` | tag exists. Nothing is pushed |

## 9. For Amar

Work only a person can do. None of it is an agent task.

| # | What | Why | When |
|---|---|---|---|
| 1 | Fly your own build twice on the rigid model, change one gain in between, open Compare, and read the first-difference marker. The checklist is in `docs/DRONES.md` (T-B19-30) | It is the exit gate; it checks that the screens make sense to a person | At the phase stop |
| 2 | Decide what to do with a FAIL or INCONCLUSIVE RS-14 verdict: investigate the model, accept the "not checked" label, or drop the claim | The label wording and the 15 percent threshold are yours (D-014); an agent never relaxes a gate | After T-B19-21 |
| 3 | If T-B19-05 reports NOT RUN: run PX4 SIH yourself with the README steps (needs a C++ toolchain and cmake), or leave RS-14 open | The firmware comparison is the only external check of the model's controller and plant | Optional, any time |
| 4 | Read the investigation findings of T-B19-21 if the verdict is FAIL and say which model change to try next | A model change is a new task, not part of the spike | After T-B19-21 |
| 5 | Check that simulated numbers agree with a real craft: hover throttle, hover current and flight time of a build you own, against the app's range for it | No bench data exists (DK-1); tier stays T1 until you have measured; this is the same kind of check as the 10 faults on a real board for D-007 | When you have a build |
| 6 | Read the sensor and estimator defaults table and the assumptions list (6.0 V brown-out, 1.5 s reboot, landing rule, descent rate 1.5 m/s). Replace any you know better from a datasheet | They are unsourced (DK-7) and shown as "iynk assumption" | At the stop |
| 7 | If DA-22 shows 2 kHz over 50 microseconds, the schema enum for `flight.step_hz` loses 2000: say yes or no (the schema is a contract in `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/drone.domain.schema.json`) | Contract change | Only if DA-22 misses |
| 8 | Decide whether traces need a schema minor adding asset role `trace` (Q4) or stay in the local `assets` store | Changes the project file format | At the stop |
| 9 | Have a reader of de, es, fr, hi, zh check the new safety-adjacent strings in the four namespaces (translations of English text; the banned-word scan covers English only) | Language review | Before publishing |
| 10 | Confirm the scope line: F-217 and F-074a are built here though the roadmap line omits them (Q13) | Scope | At the stop |
| 11 | Dual-use and legal readings (DK-9, council Q13 on Betaflight-unit gains) stay open; nothing in B19 depends on them because gains are in iynk units and no firmware code is used | Counsel | Before publishing |
| 12 | Say yes or no to installing cmake and ninja (brew) and downloading the PX4 source for T-B19-05. Without a yes, the task records NOT RUN | A machine-level install and a network download are not an agent's call | Before group 1 |

## 10. Not in this phase

| Item | Why | Where it goes |
|---|---|---|
| SITL bridge to PX4 or ArduPilot (D8, DA-25) | Only on a stated need; hosted SITL is excluded by D-015 | Later, on request |
| EKF, magnetometer, notch and RPM filters | Listed "not modelled yet" | Later |
| Flexible frames, blade flapping, ground effect, rotor-rotor interaction, propeller stall, motor heating | DK-8 | Later |
| Fixed-wing, VTOL, tricopter, swarm on the rigid model | They stay on `flight-game@1` (DRONE 7.6) | Not planned |
| Fault-tolerant mixer for hex and octo | None in v1; a quad with one motor out tumbles | Later |
| Storing bench results in the project `tests` (DRONE 8.2 final form) and the bench-check source change for arming rules | Q14; B13 keeps the arming rule logic | Later |
| Flashing parameters to a real board, hardware twin, reality gap page | B20 | B20 |
| BOM with prices | B20 (the B18 BOM exists) | B20 |
| Server-verified lap times | F-075 is "later" | Later |
| Trace upload or sharing between buddies | No requirement; traces stay local | Later |
| Betaflight-unit gains | Open legal question (council Q13) | After counsel |

## 11. Risks

| Id | Risk | Label | Mitigation in this plan |
|---|---|---|---|
| R1 | Gains cannot meet the Q5 targets with any `GAIN_SCALE` | HYPOTHESIS | T-B19-15 stops and reports the best miss; it does not relax a target |
| R2 | The game autopilot (tuned for a point mass) misbehaves on the rigid model | HYPOTHESIS | T-B19-18 reports the failing phase and does not edit `autopilot`; the controller's setpoint mapping is the place to fix |
| R3 | Cross-engine hashes still differ with `dmath` (another source of last-bit difference) | HYPOTHESIS | T-B19-28 searches the named candidates, two attempts, then records class N; rooms stay class D |
| R4 | DK-5: the model is far from PX4 | UNKNOWN | RS-14 (T-B19-05, 21); the label stays "not checked" until a PASS |
| R5 | PX4 SIH cannot be built here in a day | ESTIMATED | NOT RUN is an allowed outcome; section 9 item 3 |
| R6 | DK-7: sensor and estimator defaults are unsourced | VERIFIED (none cited) | Shown as assumptions; section 9 item 6 |
| R7 | Edits to `sim.ts` break a game-model path | HYPOTHESIS | T-B19-18 compares the pass count with its recorded baseline, runs the 342 golden rows and the content tests; the edits are limited to listed places; the `rigid` option is absent by default |
| R8 | The architecture matrix forbids `src/lib/flight` importing `src/sim/flight` | HYPOTHESIS (B3 lists no `labs` to `sim` cell) | T-B19-18 tests the one-line import first, adds the `labs` to `sim` cell in `src/architecture.test.ts` as its 4th edited file with a one-line reason (the B3 PD-2 precedent) |
| R9 | B18 files differ from the roadmap names (`propulsion.ts`, `battery.ts`, `notices.ts`, `optimise.ts`, `domain-drone.ts`, `DroneBuilder.tsx`) | DOCUMENTED names only | Every task has a precondition check and adapts to the real names, writing the difference in the commit body |
| R10 | The 5-file rule hides growth in tests | ESTIMATED | Tests count as 0, as the roadmap says; a task whose tests exceed 8 files is split |
| R11 | Rigid code reaches the first load of non-drone pages | HYPOTHESIS | Tabs and workers are lazy; T-B19-31 compares route sizes with the B1 baseline |
| R12 | Float32 trace rounding hides a small difference | VERIFIED as a property of Float32 | The marker thresholds (1 degree, 5 cm, 3 percent) are far above Float32 error; the diff test asserts it |

## 12. Research spikes

| Spike | Falsifiable question | Exit condition | Task |
|---|---|---|---|
| RS-14a | Can PX4 SIH be built and run headless here in one working day and give a repeatable body-rate step response for 3 vehicle parameter sets? | PASS: 15 raw logs and spread under 2 percent. NOT RUN: a build or run step fails after the time box. INCONCLUSIVE: runs but spread over 2 percent | T-B19-05 |
| RS-14b | Is `multirotor-rigid@1` within 15 percent of PX4 SIH on rise time and overshoot of a 100 deg/s roll-rate step for 3 craft? | PASS: six ratios within 15 percent, then the label becomes the checked label with the measured X. FAIL: any ratio over 15 percent after the listed investigation. NOT RUN or INCONCLUSIVE as stated in T-B19-21 | T-B19-21 |
| SA-12 flight | Is the checkpoint hash of the scripted flight equal in Node, Chromium and WebKit (and Firefox when installed) at 1x and 4x with `dmath`? | PASS: equal lists, class B. FAIL: the first diverging step and state index recorded, class N stays | T-B19-28 |

Spikes the earlier research did not answer and that B19 does not run: real propulsion accuracy (DK-1, needs bench data), redistributable motor and propeller data (DK-2, B18), and the cheapest way to inject a rate step in PX4 (UNKNOWN, an open sub-question inside RS-14a).

## Review fixes (2026-10-27)

| # | Issue | Verdict | What changed | Evidence |
|---|---|---|---|---|
| 1 | `CompareView.tsx` path clash with B18 | Applied | B19 component is `FlightCompareView.tsx` (props `FlightCompareViewProps`, test `FlightCompareView.test.tsx`; test ids and `dronecompare.json` unchanged). Ownership table, T-B19-24, its Existing files cell, "Later tasks need" and section 7 follow. T-B19-24 now has an `ls` precondition and keeps B18's file | VERIFIED: `B18-drone-builder.md:197,1210,1215` own `src/components/studio/drone/CompareView.tsx`. The B19 roadmap row T-B19-07 is in the roadmap file, which this step does not edit: it is superseded by this file |
| 2 | `FlyWorkspace.tsx` is deleted by B13 | Applied | T-B19-31 edits `src/components/studio/lab/CraftPanel.tsx` (the one host) and `src/components/dronelab/FlyView.tsx` (`FlyPanel.tsx` if the `DailyChallengeCard` grep says so). `DroneBuilder.tsx` is not edited. `FlyWorkspace.tsx` is never recreated. Ownership row and Existing files cell fixed | VERIFIED: `B13-labs-robotics-drones.md:267,1050,1336`; today `DailyChallengeCard` is mounted at `src/components/dronelab/FlyWorkspace.tsx:194`, B13 T-B13-22 moves it to `FlyView.tsx`. The files `src/components/studio/lab` do not exist yet (B13 not built) |
| 3 | Cycle between T-B19-29 and 30 | Applied | 29 depends on 01-28 and 31; 30 depends on 21, 28, 29. Group 10 is T-B19-29, new group 11 is T-B19-30. Index, groups table, edge list and ownership row updated | Section 3, 5 |
| 4 | Fixture hashes change with `dmath` | Applied | T-B19-28 regenerates `testdata/script-20s.checkpoints.json`, re-runs `npx vitest run src/sim/flight` after the class decision, and requires `replay.test.ts` to read `FLIGHT_HASH_CLASS` (also stated in T-B19-15) | T-B19-15 fixtures cell |
| 5 | Ban test fails on B18 files | Applied | `ban.test.ts` scans a constant list of the B19 fmath-routed files only. Q7, the Determinism rule, T-B19-01 and T-B19-28 say so | Issue text: B18 uses `Math.sin` and `Math.cos` in a check |
| 6 | `isLegacyLog` missing; flooring loses data | Applied | Signature and rule added to T-B19-02 and "Later tasks need". `fromInputEntries` throws `RangeError('input-entry: at')` for a non-dividing `at`; test added | Section T-B19-02 |
| 7 | Untestable replay seed assertion | Applied | Replaced with the two-part assertion from the review | T-B19-15 Unit tests |
| 8 | `labs` to `sim` import and the "96 tests" claim | Applied | Matrix file `src/architecture.test.ts` is the 4th edited file (ESLint zones the 5th only if needed), with an import-first precondition. "96 flight tests" replaced by a baseline pass count recorded in the commit body. R8 becomes HYPOTHESIS | VERIFIED: B3 M-1 to M-5 list no `labs` to `sim` cell (`B3-core-storage-runtime-replay.md:140-144`); `src/architecture.test.ts` does not exist yet (B2). The 57 test declarations come from the review and were not re-counted here (ESTIMATED) |
| 9 | `room-ghosts.ts` is dead after B13; `keyOf` clash | Applied | T-B19-27 greps `useRoomGhosts src`; with no importer the file and its test are dropped (4 files become 3) and room ghosts wait for the buddy-rooms phase. It keeps B18's model-aware `keyOf` and only adds `ghostStatus`, `m`, `mv` and the `rigid` prop | VERIFIED: `B13...md:297,770,774`; `B18...md:1073-1076` (T-B18-11c already changed the key, `GhostTrack.model`, `FlightRange` `model` prop) |
| 10 | T-B19-05 paths, file list, installs | Applied | Repo-root paths in Verify, `check-spread.mjs` added to New files, install needs Amar's OK (section 9 row 12), otherwise `NOT RUN` | Section 9 |
