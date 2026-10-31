# Build phase B16: Robotics creation, physics and the line follower (task packages)

Written 2026-10-27 for the build plan. Plan only: nothing in `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed to write this file, and nothing was committed.
Phase card: `05_ENGINEERING/IMPLEMENTATION_ROADMAP.md` section "B16" (lines 941 to 984). This file replaces its 15-row task table with full packages. It keeps ids T-B16-01 to T-B16-15 with the subject the card gave them and adds T-B16-00 and T-B16-16 to T-B16-40. Section 1 says why.
Earlier task files read: `B2`, `B3`, `B9`, `B10` and `B15` in the first pass; `B8`, `B11` and `B13` (ids, titles and the bodies of the tasks cited in section 2) in the review pass of 2026-10-27. The task files for B8, B11, B12, B13 and B14 exist (`ls tasks/`, VERIFIED; B12 and B14 own no name used here). Names taken from a file read are labelled DOCUMENTED (file read) in section 2; names taken only from a roadmap row or a design document are DOCUMENTED (roadmap). T-B16-00 turns the whole list into a failing test if a name is missing.
Labels: VERIFIED (read in code or a file in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN, PROPOSAL (a default chosen here with no measurement behind it).

## 0. Phase summary

| Item | Value |
|---|---|
| Goal | Amar builds a two-wheel robot from parts in a top-down builder, writes Arduino code for it, and runs it in a physics world. The same code with the same seed gives the same path hash every time and in Chromium and WebKit. The checker names the part that limits the design. A broken wheel, sensor or battery shows up as a cause id with evidence. A line follower follows its track. |
| Scope | F-213 (robot builder), F-214 (control and timing: the PID instrument and loop timing; odometry and navigation ladder N1 and N2 are B17), F-060 (first robot slice, line follower). R-164 to R-169 (R-165 as far as sleeping: sleeping stays off, section 1 item 3). ROBOTICS slices R0 to R4. Templates 1 to 3 of the ladder (drive base, speed control with encoders, line follower). |
| Not in B16 | Arm and kinematics (R6), tf and odometry libraries and templates 4, 5, 7 (R5), ROS-like graph (R7), URDF (R8), ROS 2 bridge (R9, only on a stated need), stepper model (no template 1 to 3 uses it; `stepper-lost-steps` stays "not modelled yet"), AA battery chemistries (section 1 item 9), server physics, 3D view (F-086), balancing robot, four-wheel and mecanum templates. |
| Depends on | B13 (robotics bench projects and the parts they use, old stores deleted), B8 (live analog solver, probe tap, replay checkpoints, registry), B11 (descriptors with the `mechanics` block, part editor). Through them: B2 (document, ops, `domain.patch`), B3 (SimWorker, orchestrator, `ReplayRecord`, cause-id registry), B4 and B5 (Studio), B9 (engine loader, `dmath`), B10 (rules, causes, diagnosis). |
| Tasks | 41 (15 from the roadmap, 26 added). The roadmap says best 10, expected 13, adverse 19 weeks (ESTIMATED); ROBOTICS 20 gives R0 to R4 as 10 to 15. The added tasks split work the card already counted. |
| Exit gate | `npm run check` green; SA-16 numbers (lateral drift and wheel speed) recorded; RA-02 hashes recorded for Chromium and WebKit (Firefox if installed; x86-64 stays UNKNOWN); Amar builds and runs a line follower himself (section 6, item F1). Then Amar's OK. |
| Build branch | `build/v1`, cut from `main`. One commit per task, authored as Amar Kushwaha, no `Co-Authored-By`, no "Generated with" line. Message form `B16 T-B16-NN: <what>`. Never push, never deploy. Ports 3000 and 43117, `.env.local` and production services are off limits. |

### 0.1 What I checked in the code (VERIFIED, 2026-10-27, HEAD `4d11dc5`)

| Fact | Evidence |
|---|---|
| `src/sim`, `src/project`, `src/parts`, `src/core`, `src/studio`, `src/sim-host` do not exist yet. B2 to B13 are not built, so every path in them is PLANNED | `ls src` shows `app components content i18n lib` |
| Nothing in the repo simulates rigid bodies, and Rapier is not installed | `ls node_modules/@dimforge` fails; ROBOTICS 3 (grep by the robotics seat) |
| The motor in the solver is a conductance: `motorI` returns `md.steady(...)` or `abs(v)/max(ohms, 0.1)`. No speed, no inertia, no back-EMF | `figures/engine/bench-solve.js:243-247` |
| The servo element is `k: 'SV'` and the stepper is four coil currents | `figures/engine/bench-solve.js:90-91`, `:111` |
| A PWM pin keeps `duty` and `pwmHz`, which is a periodic waveform. `analogWrite` sets 490 Hz, 980 Hz on AVR pins 5 and 6, 1000 Hz on ESP, 500 Hz otherwise | `src/lib/interp/world.ts:15-17`; `src/lib/interp/arduino/libs.ts:288` |
| The IMU, ultrasonic ranger and QTR models exist as interpreter devices and library classes | `src/lib/interp/devices.ts:21` (`Mpu6050`), `:261` (`HcSr04`); `src/lib/interp/arduino/libs.ts:1233,1422` (`QTRSensors`) |
| The line-follower bench has working sketches, a power tree and 2S LiPo plus TB6612 plus two TT motors; its sketch `FOLLOW` is the base for template 3 | `src/content/robotics/qtr-8rc.ts:80` (`FOLLOW`), `:274`; facts in `docs/facts/qtr8rc.md` |
| Battery curves exist for `lipo`, `lihv`, `liion` only: `OCV` table `:4`, `LIMITS` `:11`, `IR_AH` `:18`, `NOMINAL_CELL` `:20`, `ocv()` `:22`, `cellResistance()` `:29`. `src/lib/flight/` has tests | `src/lib/flight/battery.ts`; `ls src/lib/flight` |
| Current-draw sums for the benches | `src/lib/robotics/current.ts:1-71` |
| Playwright has two projects, `chromium` and `phone`; no WebKit and no Firefox yet (B3 T-B3-21 adds WebKit). Installed browsers: chromium and webkit builds; **no Firefox build** | `playwright.config.ts:23-25`; `ls ~/Library/Caches/ms-playwright` |
| Vitest includes `src/**/*.test.{ts,tsx}`, `figures/**`, `scripts/**`; default environment `jsdom`, 60 s timeout | `vitest.config.mts:9-17` |
| ESLint is flat config `defineConfig([...nextVitals, ...nextTs, globalIgnores([...])])`; `docs/MASTER_PLAN/**` is ignored | `eslint.config.mjs:5-27` |
| `package.json` scripts: `lint` `:16`, `typecheck` `:19`, `test` `:21`, `check` `:23`. DevDependencies include `@playwright/test` 1.64.0, `vitest` 5.0.3, `jsdom` 30.1.2 | `package.json:16-23,49-68` |
| `package.json` `prebuild` is `npm run content` (`:13`) and `pretest` is `npm run content` (`:20`); no script builds an engine today. `tsconfig.json` has `allowJs: true`, no `checkJs`, and its `include` lists only `**/*.ts`, `**/*.tsx`, `**/*.mts` (so `.mjs` files are type-checked only when imported, and then not checked as JS); `eslint .` lints `.mjs` files | `package.json:13,20`; `tsconfig.json` |
| Next.js is 16.4.3 (`eslint-config-next` 16.4.3). B16 names no Next API: the physics runs in the SimWorker and Studio components are client components that B4 already set up. Any task that does need a Next API reads `node_modules/next/dist/docs/01-app/` first (`AGENTS.md`) | `package.json`, `AGENTS.md` |
| The schemas already carry what the robot needs: `domains.robotics.data` typed by `robotics.domain.schema.json` ($defs `Surface`, `Collider`, `BodyPhysics`, `JointPhysics`, `WheelSpec`, `Track`, `StaticBox`, `Arena`, `SensorBinding`, `RosConfig`); op `domain.patch {domain, patch}` (RFC 7396); `Body.inertia_g_mm2` and `Body.com_mm`; `Joint.limits.effort` (alias `effort_n` deprecated); `Joint.kind` includes `wheel` and `continuous`; `Fault.kind` includes `param`, `mount`, `sensor`, `swap-phase`; `component.schema.json` `$defs/mechanics` has `motor`, `servo`, `stepper`, `driver`, `encoder`, `wheel`, `battery`, `sensor`, `mass_g`. So ROBOTICS Objections 1 and 2 are closed by the schema and need no schema change | `04_ARCHITECTURE/schemas/*.json`, read by script |
| An example robot project exists and validates: 4 bodies (chassis 340 g, two wheels 25 g, caster 8 g), a 400 mm radius oval track 19 mm wide, faults `battery-sag-reset`, `motor-direction-reversed`, `sensor-too-high`, parts `cmp_bat cmp_drv cmp_imu cmp_motor_l cmp_motor_r cmp_qtr`, `simulation.physics {engine: rapier, step_hz: 240}` | `04_ARCHITECTURE/schemas/examples/robot-line-follower.project.json` (51,742 bytes) |
| The DP-01 prototypes and RS-13 scene scripts exist in the repository, with raw results | `08_RESEARCH_SPIKES/DP-01-robot-prototypes/{src,results}`, `08_RESEARCH_SPIKES/RS-13-physics-determinism/src/{common,rapier-run,node-run}.mjs` |

### 0.2 Shorthand used in every task

| Name | Expands to |
|---|---|
| `TL` | `npm run typecheck && npm run lint` |
| `V <path>` | `npx vitest run <path>` |
| `KL` | `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL=` (from `01_AUDIT/runs/COMMANDS.md`; drop names that B0 and B1 removed) |
| `PB` | `node scripts/build-physics.mjs` (T-B16-01). Builds the git-ignored engine files in `public/engines/rapier@0.21.0/`. `npm run physics:build` runs the same script; `pretest` and `prebuild` call it, so `npm run check` has the files, and every bare `E` run needs `PB` first |
| `E <spec>` | `KL NEXT_DIST_DIR=.next-build npx playwright test <spec>` (random port; skips 43117 after T-B0-03) |
| `PORTABLE` | `npx tsc -p tsconfig.portable.json` (T-B2-01). Covers `src/sim/mech`, `src/sim/probe/loop-timing.ts`, `src/sim/faults/robot*.ts` |
| `ARCH` | `npx vitest run src/architecture.test.ts` (T-B2-01 import matrix) |
| `SCHEMA` | `npm run schema:check` (T-B2-04) |
| `GATE` | `npm run check`, run once by T-B16-37 |

### 0.3 Rules that apply to every task

| Rule | Detail |
|---|---|
| Portable physics code | Everything in `src/sim/mech/` imports only `core`, `project` types, `parts` types and `sim/core`. No DOM, React, Next, `Worker`, `Date.now`, `performance.now`, `Math.random`. The lint ban of T-B3-10 applies and T-B16-02 adds the force ban (`addForce`, `addTorque`). `PORTABLE` and `ARCH` must pass |
| Shared report types | The shapes the Studio shows and `src/sim/mech` produces (`PhysicsFrame`, `RobotProblem`, `RobotCheck`, `CouplingReport`, `RunMetrics`, `LoopStats`, `StepMetrics`, `PidTrace`, `MechReport`) are declared once in `src/core/robot-report.ts` (T-B16-00). `src/components` and `src/studio` import them from there and never import `src/sim` (SYSTEM 5.3; B3 cell M-5 stays closed) |
| Math that decides a hash | `Math.sin`, `Math.cos`, `Math.atan2`, `Math.exp`, `Math.log`, `Math.pow` on a path that reaches the physics scene, a joint angle, a motor current or a hash use `dmath` (T-B9-20) through `ports.ts`. `dmath` is a hard dependency: B9 is ordered before B16 and T-B9-20 is a P0 task (B9 line 138). There is no `Math` fallback; if the file is absent T-B16-00 fails to compile and stops. RK-1 stays open until RA-02 passes |
| Units | Document in mm, degree, gram (PDM 4.1). SI (m, rad, kg, N, N m, V, A, ohm, H, s) at the engine boundary. Domain-data field suffixes name the unit (RC-42). The `lengthScale` is applied in `rapier.ts` and nowhere else |
| Tests | Next to the code, `*.test.ts`, starting with `// @vitest-environment node` for portable code. No test calls a network, waits on wall-clock polling, or reads `.env.local`. Browser tests are `E` specs |
| Size | At most 5 source files per task, not counting its own test files and fixtures. A set of data files of one kind counts 1; the six language copies of one i18n namespace count 1 (roadmap 2.2) |
| Step 0 | Every task whose "Existing files" names a B2 to B13 path starts by reading that path. If a name differs from this plan, the agent adapts only the one adapter file the task names (`ports.ts`), says so in the commit body, and never renames a predecessor symbol |
| Words | Plain words, no em dashes. UI copy goes through the `robot` namespace in six languages (T-B16-30). Copy never says "validated", "certified", "accurate", "realistic" or "guaranteed" (RA-23; T-B16-30 owns the grep test) |
| Honesty (D-007) | Every model carries a tier and a source label. A number with no datasheet is "iynk assumption" in the descriptor and in the UI. A sensor, driver or battery behaviour the code lacks says "not modelled yet" |
| Commit | `git commit -m "B16 T-B16-NN: <title>" -- <the task's own paths>`; author Amar Kushwaha; no trailer lines |
| Rollback | `git revert <task commit>`, later tasks first. Phase tag `phase-B16` is made by the orchestrator after Amar's OK |

## 1. Changes against the roadmap card and the design documents (and why)

| # | Change | Reason |
|---|---|---|
| 1 | Add T-B16-00, a seam check | Many B16 tasks lean on names from B2, B3, B8, B9, B10, B11 and B13, some of them known only from roadmap rows. One failing test with the list of missing names is cheaper than ten agents guessing |
| 2 | `PhysicsWorld` gets `castRays(rays: Ray[]): RayHit[]` (T-B16-02) | SIMULATION 10.2 lists only `body`, `joint`, `contacts`. ROBOTICS 8 builds the ranger on a ray fan against the scene. Without a ray query the ranger cannot be built. PROPOSAL; T-B16-36 writes the addition into `SIMULATION_ARCHITECTURE.md` 10.2 |
| 3 | Sleeping is off in v1 and has no switch | PRD R-165 says "sleeping is allowed once it keeps the hash test green". ROBOTICS Objection 6 and the schema (`sleeping: const false`) say off. The schema and ROBOTICS win (RC rule R4). A sleeping run has its own hash by design (`order.mjs`) |
| 4 | RA-01 is a test-only task (T-B16-16), not part of the adapter task | The card put it in T-B16-02. The shipped artifact is built in T-B16-01 and the adapter in T-B16-02; the hash proof needs both and the browsers need T-B16-14 |
| 5 | The shipped hash test (RA-01) runs RS-13's own scene code, copied unchanged, not iynk's scene builder | iynk's builder creates statics first and sorts by id (ROBOTICS 4.4 rule 1). RS-13's adapter created things in its own order, so the iynk builder would give a different hash for the same scene. RA-01 asks "does the shipped engine reproduce `c6a8e92d6174bd66`", which needs RS-13's order. The iynk builder gets its own golden hash (T-B16-03), labelled new |
| 6 | The coupling between motor current and the shared battery has a spike first (T-B16-21) | ROBOTICS 7.4 proved the closed form for a motor on a fixed voltage (`motor2.mjs`). SIMULATION 5.6 feeds current back to the solver with one step of lag. Nothing measured says that feedback keeps a sagging 2S LiPo and the logic rail right. T-B16-07 reads the verdict |
| 7 | Card rows that mixed subjects are split. T-B16-03 keeps the scene builder; the validator moves to T-B16-17. T-B16-05 keeps the top-down view; the builder panel is T-B16-18. T-B16-06 keeps motor and gearbox; driver and servo are T-B16-19. T-B16-08 keeps line and ranger sensors; encoder edges are T-B16-23. T-B16-09 keeps the loop-timing probe and PID math; the panel is T-B16-29. T-B16-11 keeps the checker; cause ids and symptoms are T-B16-24. T-B16-12 is the line follower only; templates 1 and 2 are T-B16-27 and T-B16-28. The detectors are two tasks (T-B16-13, T-B16-25) | The ROBOTICS rule tables (RB-E, RB-W, RB-C), the detector list and three UI parts are each longer than one agent can finish and verify in one sitting, and several rows would exceed 5 source files |
| 8 | The card's "Templates 1 to 3 (line follower first)" is three tasks, in the order line follower (T-B16-12), drive base (T-B16-27), speed control (T-B16-28) | The exit gate is the line follower. ROBOTICS 15 says each template is finished before the next. Template 3 needs only template 1's base geometry, so it can come first. Template 2 adds encoders and needs the encoder task |
| 9 | Battery chemistries are `lipo`, `lihv`, `liion` only (T-B16-20) | `src/lib/flight/battery.ts:4` has curves for those three. ROBOTICS 7.6 lists alkaline and NiMH, which have no curve in the repo. Inventing one would be an unsourced number. The line follower uses 2S LiPo. AA packs are an open question (section 7, Q3) |
| 10 | Battery curves move to `src/core/battery.ts` and `src/lib/flight/battery.ts` re-exports them (T-B16-20) | ROBOTICS 7.6 says "the robot reuses the code, not a copy". The `sim` layer cannot import `src/lib` (SYSTEM 5.3). One source of truth in `core`; the drone phase B18 reuses it |
| 11 | Add `src/sim/mech/engine.ts`, the mechanical `Engine` that runs the look-ahead scheme (T-B16-22) | The card names no task for the engine that steps Rapier at P5, keeps the `prev` and `next` buffers, enqueues encoder edges and halts on NaN. ROBOTICS 9.2 specifies it in detail |
| 12 | Add replay-record fields (T-B16-32), SimHost wiring and lazy load (T-B16-33), perf (T-B16-34), snapshot spike (T-B16-35), strings (T-B16-30), registry and part data (T-B16-26), RobotChecks panel (T-B16-31), docs (T-B16-36) and the gate (T-B16-37) | The card lists behaviours (RA-22, RA-26, RA-07, RA-08, RA-23) with no task that owns them |
| 13 | The robot symptom ids are named here (T-B16-24) | B10's `symptoms.ts` says "pending ones for ROB and DRN are named by B16 to B19" |
| 14 | `stepper` is cut; `servo` stays as a separate small task (T-B16-19) so Amar can drop it | No template 1 to 3 uses either. The card names servo. Servo is needed by template 4 (B17) |
| 15 | The "Operational cost" and "Database changes" rows stay none. No server route is added | Physics is local (D-015) |
| 16 | Add T-B16-38 (live-run tests), T-B16-39 (Studio wiring) and T-B16-40 (run data path) | Review fixes 10 and 11. Without them the acceptance lines of T-B16-12, 13, 25, 27 and 28 could not be proved in their own tasks, and nothing mounted the panels, made a robot project, showed the run hash, filled `RunFacts.robot` or fed the panels. Wiring is two tasks because one would touch 10 files |
| 17 | Shared report types move to `src/core/robot-report.ts` (T-B16-00) | Review fix 14. The panels need types the physics code produces, and UI and studio may not import `src/sim`. One declaration in `core`, imported by both sides |
| 18 | The pin file is `src/sim-host/engines/physics/rapier.manifest.json` and the engine build is `physics:build`, called from `pretest` and `prebuild` | Review fixes 4 and 5. The engine files are git-ignored build output; nothing built them before the e2e specs. The `physics/` subfolder keeps the file out of B9's `engines/*.manifest.json` glob, so `build-engines.mjs` is not edited |
| 19 | Replay record: engine pins are entries in `versions.engines`, the physics block is `SimSettings.physics` | Review fix 12. B3's record and the schema's 40-character limit leave no room for the long version string |

## 2. Seams: names this phase takes from other phases

Each entry carries a label. DOCUMENTED (file read) means the name was checked in the owner's task file during the review pass of 2026-10-27 (last section, "Review fixes"). DOCUMENTED (roadmap) means it comes only from a roadmap row or a design document. T-B16-00 imports each through `src/sim/mech/ports.ts` and fails with the missing list. "Owner" is the task that creates it. Where a name differs once the owner is built, Step 0 applies. The task files of B8, B11, B12, B13 and B14 all exist (`ls tasks/`, VERIFIED); B12 and B14 own no name used here.

| Seam | Name used here | Owner | Label and source |
|---|---|---|---|
| Document | `Project`, `Op` in `src/project/`; `stateHash(state)` | T-B2-04, T-B2-09 | DOCUMENTED (file read): B2 lines 451, 614; B3 line 37 |
| Result | `Result<T, E>`, `ok`, `fail` in `src/core/result.ts` | T-B2-02 | DOCUMENTED (file read): B2 lines 146, 183 to 190 |
| Domain ops | `domain.patch` handled by `mergePatch` in `src/project/apply/types.ts`; `validateDomains` in the generated validators | T-B2-05, T-B2-04, T-B2-07 | DOCUMENTED (file read): B2 lines 451, 614 |
| Core | `rng(seed, stream)` in `src/core/prng.ts` (T-B2-03). B3 creates no `src/sim/core/rng.ts` and no `src/sim/core/units.ts` (B3 PD-15, line 126; T-B3-10 line 408). `src/sim/core/clock.ts`: `SimTime`, `ClockRate`, `clockRate`, `cyclesToNs`. `src/sim/core/hash.ts`: `fnv1a64`, `StateHasher` | T-B2-03, T-B3-10 | DOCUMENTED (file read): B3 lines 36, 126, 408 to 411 |
| `dmath` | `src/sim/core/dmath.ts`: `sin`, `cos`, `atan2`, `exp`, `log`, `pow`. A hard dependency: B9 is ordered before B16 and `dmath` is a P0 task there | T-B9-20 | DOCUMENTED (file read): B9 lines 138, 484 to 496 |
| Engine | `Engine { id, rank, nextDue, advance, onEvent, hash, snapshot? }`, `EngineContext`, `SimEvent`, `Phase` in `src/sim/engine.ts`; `createOrchestrator` in `src/sim/orchestrator.ts`; `SimSettings` (B3 line 634) in `src/sim/engine.ts` | T-B3-11 | DOCUMENTED (file read): B3 lines 571 to 584, 619, 631 to 634 |
| Pins | `PinPort.read(pin) -> { mode, level, duty?, hz? }`; `pwm.ts` `edgesBetween` | T-B3-11 | DOCUMENTED (file read): B3 lines 579, 591 |
| Analog | `Element`, `solve(input, options)`, `stampElement` in `src/sim/analog/{types,solve,elements}.ts`; live path `src/sim/analog/live.ts` | T-B3-16, T-B3-17, T-B8-05 | DOCUMENTED (file read): B3 lines 622 to 625; B8 line 174 |
| Probe | `ProbeTap`, `ProbeSpec`, `Reading` in `src/sim/probe/tap.ts`, `provenance.ts`, `ring.ts` | T-B8-10 | DOCUMENTED (file read): B8 lines 184, 185 |
| Replay | `ReplayRecord` (B3 line 1215: `versions: { engines; models; dmath }`) in `src/sim/replay/record.ts`; snapshot in `src/sim/replay/snapshot.ts`, `restore.ts`, `keyframes.ts` | T-B3-19, T-B8-15, T-B8-16 | DOCUMENTED (file read): B8 lines 108, 215, 216 |
| Engine loader | `loadEngine`, `EngineManifestEntry` in `src/sim-host/engines/loader.ts`; files under `public/engines/<id>@<version>/` listed in `public/engines/manifest.json`; `scripts/build-engines.mjs`; `prebuild` and `pretest` call the engine build; `npm run engines:build` | T-B9-07 (loader code from T-B3-09) | DOCUMENTED (file read): B9 lines 71, 87, 181, 301, 313, 328 |
| SimHost | `SimHost`, `SimWorker`, `HostToSim`, `SimToHost` in `src/sim-host/{host,sim.worker,protocol}.ts`; the worker builds the fault monitor and posts findings at run end | T-B3-13, T-B8-14, T-B10-04 | DOCUMENTED (file read): B10 line 1523 |
| Import matrix | `src/sim-host` may import `src/sim` values (B3 cell M-2). `src/components/**` and `src/studio/**` may not (B3 cell M-5 stays closed; SYSTEM 5.3 has no `sim` column for UI or studio) | T-B3-10 | DOCUMENTED (file read): B3 lines 141, 144, 434 |
| Registry | `src/sim/registry/{types,entries,tiers,project}.ts` and `data/*.json` | T-B8-03 | DOCUMENTED (file read): B8 lines 169, 170 |
| Faults | `Rule`, `Finding`, `RuleInput`, `RunFacts`, `NetView` in `src/sim/faults/types.ts` (there is no barrel; importers name the file); `allRules()`, `detectorStatus` in `rules.ts` and `causes.ts`; `CAUSES`, `causeMeta`, `SYMPTOM_IDS`; `runFactsFrom` in `run-facts.ts`; `createFaultMonitor`. Rule ids are `solve:<name>@1` | T-B10-01, T-B10-03, T-B10-04, T-B10-11, T-B10-16 | DOCUMENTED (file read): B10 lines 170 to 235 (RunFacts at 220), 262 to 268, 1615 to 1625 |
| Cause ids | `CORE_CAUSE_IDS` (45) in `src/sim/faults/cause-ids.ts`; RC-43 names already applied | T-B3-20 | DOCUMENTED (file read): B3 lines 498 to 506 |
| Parts | `Descriptor` from `src/parts/descriptor.ts` (B11 writes it `ComponentDescriptor`; `ports.ts` re-exports it under that name); registry in `src/parts/registry.ts`; data stored flat as `src/parts/data/<slug>.component.json` | T-B2-11a, T-B11-02a | DOCUMENTED (file read): B2 lines 156, 718; B11 lines 110, 671 |
| Part ids used here | `core.tt-motor` (T-B11-02c1), `core.lipo-2s` (T-B11-02c2), `core.tb6612fng-module`, `core.l298n-module` (T-B11-03a), `core.qtr-8rc`, `core.hc-sr04` (T-B11-03b1). B11 task ids are T-B11-02a, 02b1, 02b2, 02c1, 02c2, 03a, 03b1, 03b2 and 05a (there is no plain 02b, 02c, 03b or 05) | B11 | DOCUMENTED (file read): B11 lines 81 to 84, 157 to 160 |
| Studio | `ProjectSession` (apply, undo), stores `doc.ts`, `session.ts`, `commands.ts`, renderer, `EditorEngine`; `Workspace.tsx` and `debugHook.ts` (T-B4-25a); `Home.tsx` and `src/studio/templates.ts` (T-B4-16); `RunBar.tsx` and `stores/run.ts` (T-B4-13); `Problems.tsx` and `src/studio/problems.ts` (T-B4-17); `src/studio/run/session.ts` | T-B4-02 to T-B4-27 | DOCUMENTED (file read): B4 lines 146, 156, 619 to 632, 797 to 817; B8 line 111 |
| Instruments | `Plotter.tsx` (T-B8-13); `TierChips.tsx`, `ModelsPanel.tsx` (T-B8-04) | T-B8-04, T-B8-13 | DOCUMENTED (file read): B8 lines 191, 192, 209 |
| Strings | namespace registry `src/i18n/namespaces.ts`; parity test `src/i18n/messages.test.ts:21-40` | exists today | VERIFIED: `src/i18n/namespaces.ts:4` |
| Robot benches | the 13 bench projects under `content/projects/robotics/{a,b}/` | T-B13-02, T-B13-03 | DOCUMENTED (file read): B13 lines 84, 278, 279 |

## 3. Parallel groups

Tasks in one group touch disjoint files and can be built by separate agents at once. Groups run in order. A task starts only when everything it depends on is committed. Section 4 is the file-ownership proof. Every task lists its dependencies on its Identity line; the group is the one after the latest group among them.

| Group | Tasks | Why they are disjoint | Gate before the next group |
|---|---|---|---|
| G0 | T-B16-00, T-B16-01, T-B16-20, T-B16-21, T-B16-24, T-B16-30 | Seam check and shared report types; build script, pins and package scripts; battery core; spike report folder; cause and symptom registry; i18n namespace | `TL`; each task's own `V`; spike verdict written |
| G1 | T-B16-02, T-B16-04, T-B16-06, T-B16-09, T-B16-26 | Backend files and eslint config; project apply; motor files; loop-timing and PID files; part and registry data | `TL`; `PORTABLE`; `ARCH` |
| G2 | T-B16-03, T-B16-05, T-B16-16, T-B16-19, T-B16-29 | Scene builder; top-down view; artifact gate tests; driver and servo (needs the `Drive` type of T-B16-06); PID panel | `TL`; `PORTABLE` |
| G3 | T-B16-07, T-B16-08, T-B16-10, T-B16-11, T-B16-23, T-B16-35 | Coupling and solver element (needs 19); sensors (needs 03); drift test and fixture; checker; encoder; snapshot spike (needs the hook of 16) | `TL`; `PORTABLE`; SA-16 numbers recorded |
| G4 | T-B16-17, T-B16-22, T-B16-31, T-B16-32 | Validator (needs 07); mechanical engine; RobotChecks panel; replay record and `SimSettings` | `TL`; `PORTABLE`; `ARCH` |
| G5 | T-B16-12, T-B16-13, T-B16-18, T-B16-33 | Line-follower template; motion detectors; builder UI; SimHost wiring | `TL`; `V src/sim src/sim-host` |
| G6 | T-B16-25, T-B16-27, T-B16-34, T-B16-40 | Sensor and power detectors; template 1; perf spec; run data path (adapter, store, session, hook) | `TL`; `PORTABLE`; `ARCH` |
| G7 | T-B16-28 | Template 2 (copies template 1) | `TL`; `V src/sim/mech/templates.test.ts` |
| G8 | T-B16-38, T-B16-39 | Live-run tests (one test file); Studio mount, New project > Robot, run hash text, Problems pane | `TL`; `V src/sim-host src/studio src/components/studio`; `ARCH` |
| G9 | T-B16-14, T-B16-15 | Cross-browser hash job; robot end-to-end spec | RA-02 numbers recorded; `E e2e/robot.spec.ts` green |
| G10 | T-B16-36 | Docs (holds the T-B16-14 hash table and the T-B16-34 numbers) | doc greps clean |
| G11 | T-B16-37 | The phase gate | `npm run check` green |

Two tasks that must not share a group even though they look independent: T-B16-13 and T-B16-25 both edit `src/sim/faults/rules.ts` (G5 and G6); T-B16-12, T-B16-27 and T-B16-28 each copy the base geometry and the shared `templates.test.ts`, so each starts from the earlier committed file (G5, G6, G7); T-B16-33 and T-B16-40 both edit `session.ts` and `sim.worker.ts` (G5 and G6).

## 4. File ownership

One owner per file. "E" means the owner edits an existing file; "N" means new. A file with two rows is edited in two groups, never in the same one. Counts use the roadmap rule (test files and fixtures are free; a set of data files of one kind counts 1; `package.json` with its lockfile counts 1).

| File | Task | Group |
|---|---|---|
| `src/sim/mech/ports.ts` (N), `src/core/robot-report.ts` (N, types only), `src/sim/mech/seams.test.ts` (N) | T-B16-00 | G0 |
| `scripts/build-physics.mjs` (N), `src/sim-host/engines/physics/rapier.manifest.json` (N), `package.json` with `package-lock.json` (E, one edit), `vendor/rapier3d-deterministic-compat-0.21.0.tgz` (N) | T-B16-01 | G0 |
| `src/core/battery.ts` (N), `src/lib/flight/battery.ts` (E), `src/sim/mech/pack.ts` (N) | T-B16-20 | G0 |
| `08_RESEARCH_SPIKES/RS-B16-motor-in-circuit/{REPORT.md,src/*}` (N) | T-B16-21 | G0 |
| `src/sim/faults/causes.ts` (E), `src/sim/faults/symptoms.ts` (E), `src/sim/faults/hints.ts` (E, only if its lookup lacks a namespace argument) | T-B16-24 | G0 |
| `src/i18n/messages/{en,es,fr,de,zh,hi}/robot.json` (N, one set), `src/i18n/namespaces.ts` (E) | T-B16-30 | G0 |
| `src/sim/mech/backend.ts` (N), `src/sim/mech/rapier.ts` (N), `src/sim/mech/hash.ts` (N), `eslint.config.mjs` (E, two blocks: force ban and the `rs13` fixture ignore) | T-B16-02 | G1 |
| `src/project/apply/domain-robotics.ts` (N), `src/project/validate.ts` (E) | T-B16-04 | G1 |
| `src/sim/mech/motor.ts` (N), `src/sim/mech/gearbox.ts` (N) | T-B16-06 | G1 |
| `src/sim/probe/loop-timing.ts` (N), `src/sim/mech/pid.ts` (N) | T-B16-09 | G1 |
| `src/parts/data/{tt-motor,lipo-2s,tb6612fng-module,l298n-module,qtr-8rc,hc-sr04}.component.json` (E, `mechanics` only, one set), `src/parts/data/{wheel-65,caster-ball,chassis-2wd,tt-motor-encoder}.component.json` (N, one set), the generated descriptor barrel (regenerated), `src/sim/registry/data/robot.json` (N) | T-B16-26 | G1 |
| `src/sim/mech/scene.ts` (N), `src/sim/mech/inertia.ts` (N) | T-B16-03 | G2 |
| `src/studio/views/topdown.ts` (N), `src/components/studio/robot/TopDownView.tsx` (N) | T-B16-05 | G2 |
| `src/sim/mech/artifact.test.ts` (N, tests and fixtures only) | T-B16-16 | G2 |
| `src/sim/mech/driver.ts` (N), `src/sim/mech/servo.ts` (N) | T-B16-19 | G2 |
| `src/components/studio/robot/PidPanel.tsx` (N), `LoopTimingView.tsx` (N), `src/studio/robot/pid-sources.ts` (N) | T-B16-29 | G2 |
| `src/sim/mech/coupling.ts` (N), `src/sim/analog/elements.ts` (E) | T-B16-07 | G3 |
| `src/sim/mech/sensors.ts` (N) | T-B16-08 | G3 |
| `src/sim/mech/drift.test.ts` (N), `src/sim/mech/fixtures/four-wheel.project.json` (N) | T-B16-10 | G3 |
| `src/sim/mech/checker.ts` (N) | T-B16-11 | G3 |
| `src/sim/mech/encoder.ts` (N) | T-B16-23 | G3 |
| `08_RESEARCH_SPIKES/RS-B16-snapshot/{REPORT.md,src/*}` (N), `src/sim/mech/rapier.ts` (E, only on PASS), `src/sim/mech/snapshot.test.ts` (N, only on PASS) | T-B16-35 | G3 |
| `src/sim/mech/validate.ts` (N), `src/sim/mech/limits.ts` (N) | T-B16-17 | G4 |
| `src/sim/mech/engine.ts` (N), `src/sim/mech/buffers.ts` (N), `src/sim/mech/facts.ts` (N) | T-B16-22 | G4 |
| `src/components/studio/robot/RobotChecks.tsx` (N) | T-B16-31 | G4 |
| `src/sim/replay/record.ts` (E), `src/sim/engine.ts` (E, `SimSettings` only) | T-B16-32 | G4 |
| `content/projects/robots/line-follower.project.json` (N), `src/sim/mech/templates.test.ts` (N, static cases) | T-B16-12 | G5 |
| `src/sim/faults/robot.ts` (N), `src/sim/faults/rules.ts` (E), `src/sim/faults/types.ts` (E, `RunFacts.robot` only) | T-B16-13 | G5 |
| `src/studio/tools/robot.ts` (N), `src/components/studio/robot/RobotBuilder.tsx` (N) | T-B16-18 | G5 |
| `src/sim-host/mech.ts` (N), `src/sim-host/host.ts` (E), `src/sim-host/sim.worker.ts` (E), `src/sim-host/protocol.ts` (E), `src/studio/run/session.ts` (E) | T-B16-33 | G5 |
| `src/sim/faults/robot-power.ts` (N), `src/sim/faults/rules.ts` (E) | T-B16-25 | G6 |
| `content/projects/robots/drive-base.project.json` (N), `src/sim/mech/templates.test.ts` (E, its cases) | T-B16-27 | G6 |
| `e2e/physics-perf.spec.ts` (N), `src/sim/mech/fixtures/perf-scene.ts` (N) | T-B16-34 | G6 |
| `src/sim/faults/robot-facts.ts` (N), `src/sim-host/sim.worker.ts` (E), `src/studio/robot/store.ts` (N), `src/studio/run/session.ts` (E), `src/components/studio/wiring/debugHook.ts` (E) | T-B16-40 | G6 |
| `content/projects/robots/speed-control.project.json` (N), `src/sim/mech/templates.test.ts` (E, its cases) | T-B16-28 | G7 |
| `src/sim-host/mech.run.test.ts` (N, test only) | T-B16-38 | G8 |
| `src/components/studio/Workspace.tsx` (E), `src/components/studio/Home.tsx` (E), `src/studio/templates.ts` (E), `src/components/studio/RunBar.tsx` (E), `src/studio/problems.ts` (E) | T-B16-39 | G8 |
| `e2e/physics-hash.spec.ts` (N), `e2e/physics-compare.spec.ts` (N), `playwright.config.ts` (E) | T-B16-14 | G9 |
| `e2e/robot.spec.ts` (N) | T-B16-15 | G9 |
| `docs/ROBOTICS.md` (N), `docs/MASTER_PLAN/04_ARCHITECTURE/SIMULATION_ARCHITECTURE.md` (E, section 10.2 only), `README.md` (E, one line) | T-B16-36 | G10 |
| none (gate task; records numbers in the commit body) | T-B16-37 | G11 |

Test files and fixtures are owned by the task that writes them and are not listed above unless they are the whole deliverable.

## 5. Task packages

Each package gives the BRIEF section 27 fields in this order: Identity; Intent; Implementation; Verification; Delivery. "Permissions, performance, migration" are stated where they apply; when a line says none, there is none.

---

### T-B16-00. Seam check, the one ports file and the shared report types

**Identity.** T-B16-00; subsystem: physics seams (`src/sim/mech`, `src/core`); phase B16, group G0; priority must; depends on B2, B3, B8, B9, B10, B11 and B13 committed; status: not started.

**Intent.**
- Problem: ten tasks in this phase use names from B2, B3, B8, B9, B10, B11 and B13. If one name differs, ten agents fail in ten places. Also, the Studio panels (T-B16-05, 18, 29, 31) show values the physics code produces, and `src/components` and `src/studio` may not import `src/sim` (SYSTEM 5.3; B3 cell M-5 stays closed). The shapes need one home both sides may import.
- Target user: the other B16 agents, then Amar reading the gate.
- User story: As a B16 agent, I want one file that imports every outside name, so a renamed symbol breaks one place with a clear list, and one types file that the physics code and the panels share.
- Expected behaviour: `ports.ts` re-exports each outside name used by `src/sim/mech`, `src/sim/probe/loop-timing.ts` and `src/sim/faults/robot*.ts`. `seams.test.ts` imports the modules, checks each value name with `typeof`, and fails with the full list of missing names and the section 2 owner of each. `src/core/robot-report.ts` holds the report shapes (types only, no logic): `PhysicsFrame`, `RobotProblem`, `CheckId`, `RobotCheck`, `CouplingReport`, `RunMetrics`, `LoopStats`, `StepMetrics`, `PidTrace`, `MechReport`. The producing tasks import them from there; the Studio imports them from there; nothing is declared twice.
- Success metric: the test passes on the committed B2 to B13 tree. Run against a stub tree missing two names it fails and prints exactly those two. `ARCH` passes with `src/core/robot-report.ts` imported by both `src/sim/mech` and `src/components/studio/robot`.

**Implementation.**
- Existing files (Step 0, read only): `src/core/result.ts`, `src/core/prng.ts`, `src/project/*`, `src/sim/core/{clock,hash,dmath}.ts`, `src/sim/engine.ts`, `src/sim/orchestrator.ts`, `src/sim/analog/{types,solve,elements}.ts`, `src/sim/probe/tap.ts`, `src/sim/replay/record.ts`, `src/sim/faults/{types,rules,causes,symptoms,run-facts}.ts`, `src/parts/{descriptor,registry}.ts`, `src/sim-host/engines/loader.ts`, `src/studio/stores/doc.ts`. All PLANNED; `ls` each before use.
- New files: `src/sim/mech/ports.ts`, `src/core/robot-report.ts`. Test: `src/sim/mech/seams.test.ts`.
- Modules and signatures:
```ts
// ports.ts: type and value re-exports only, no logic
export type { Project, Op } from '@/project';                         // Step 0 reads the real barrel of B2
export type { Result } from '@/core/result';                          // T-B2-02
export { rng } from '@/core/prng';                                    // T-B2-03; B3 PD-15: there is no src/sim/core/rng.ts or units.ts
export type { SimTime, ClockRate } from '@/sim/core/clock';          // T-B3-10
export { clockRate, cyclesToNs } from '@/sim/core/clock';
export { fnv1a64, StateHasher } from '@/sim/core/hash';
export * as dmath from '@/sim/core/dmath';                            // hard dependency: T-B9-20 (P0). No fallback
export type { Engine, EngineContext, SimEvent } from '@/sim/engine';
export type { ProbeTap, ProbeSpec, Reading } from '@/sim/probe/tap';
export type { Rule, Finding, RunFacts } from '@/sim/faults/types';    // no barrel (B10 line 235); RunFacts is declared in types.ts (B10 line 220)
export type { Descriptor as ComponentDescriptor } from '@/parts/descriptor';   // B11 line 110 names it ComponentDescriptor
// seams.test.ts
export const REQUIRED: { module: string; names: string[]; owner: string }[];
```
```ts
// src/core/robot-report.ts (T-B16-00). Types only. Time is a plain number of ns so core needs no sim import.
export interface PhysicsFrame { atNs: number; bodies: Record<string, { p: [number, number, number]; yawRad: number }>; sensors?: Record<string, number | string> }
export interface RobotProblem { code: string; severity: 'error' | 'warning'; path: string; messageKey: string; args: Record<string, string | number> }
export type CheckId = 'RB-C-01' | 'RB-C-02' | 'RB-C-03' | 'RB-C-04' | 'RB-C-05' | 'RB-C-06' | 'RB-C-07' | 'RB-C-08' | 'RB-C-09' | 'RB-C-10';
export interface RobotCheck { id: CheckId; result: 'ok' | 'warn' | 'fail'; value: number | null; unit: string; limit: number | null; limitingPart: string | null; formula: string; assumptions: string[]; causeId?: string }
export interface CouplingReport { motorId: string; c: number; hc: number; ok: boolean; mode: 'cycle' | 'algebraic' }
export interface RunMetrics { maxCrossTrackMm: number; onLineFraction: number; laps: number; progressMm: number; text: string[] }
export interface LoopStats { n: number; meanNs: number; p95Ns: number; maxNs: number; jitterNs: number; histogram: { loNs: number; hiNs: number; count: number }[] }
export interface StepMetrics { riseNs: number | null; overshootPct: number; settleNs: number | null; steadyError: number }
export interface PidTrace { tNs: number[]; setpoint: number[]; response: number[]; output: number[]; integral: number[] }
export interface MechReport { runHash: string; sceneHash: string; checkpoints: string[]; run: RunMetrics | null; loop: LoopStats | null }
```
- Data model: none stored.
- Algorithm: `REQUIRED` lists every module, each value name and its owner task from section 2. The test dynamically imports each module, collects names where `typeof ns[name] === 'undefined'` (type-only names are checked by `tsc` through `ports.ts`, not at run time), and throws one error with the table. The ten report types in `robot-report.ts` are copied from the signature blocks of their producing tasks; if a producing task changes a field it edits this file in its own commit and counts it under its 5-file limit.
- Validation and errors: a missing required name fails the test. The only optional name is `ProbeTap.stream`, which only logs. `dmath` is required: if `src/sim/core/dmath.ts` is absent `tsc` and `PORTABLE` fail on the static `export * as dmath` and the agent stops and reports (T-B9-20 not built).
- Edge cases: a module that does not exist fails with "module not found" and its owner. A name moved to another module is reported as missing; the agent fixes `ports.ts` only. B11 task ids differ from the roadmap's (section 2): the owner column uses the B11 file's ids.
- Permissions, performance, migration: none.

**Verification.**
- Unit test `seams.test.ts`: covers all modules in section 2; a stub-module case (using `vi.doMock`) where two names are missing and the message lists exactly those two.
- Integration: `ARCH` passes with `ports.ts` as the only importer of `@/sim/faults` and `@/parts` inside `src/sim/mech`.
- Playwright: none.
- Fixtures: none.
- Acceptance. Given the committed B13 tree, When the seam test runs, Then it passes. Given a tree where `fnv1a64` is renamed, When it runs, Then it fails naming `fnv1a64` and T-B3-10.
- Observability: the failure text is the report.
- Release blockers: a required name missing; a report type declared in two places.

**Delivery.**
- Done when the test passes and `PORTABLE` passes.
- Verify: `TL`; `V src/sim/mech/seams.test.ts`; `PORTABLE`; `ARCH`.
- Documentation: none.
- Rollback: revert; every later task depends on it, so revert them first.
- Later tasks need: `ports.ts` as the single import point for outside names; `src/core/robot-report.ts` as the single home of the ten report types.

---

### T-B16-01. Physics artifact build script, pins and hashes; engine decision closed

**Identity.** T-B16-01; subsystem: engines (`scripts`, `src/sim-host/engines`); B16, G0; priority must; depends on B9 (T-B9-07 loader convention); not started.

**Intent.**
- Problem: ADR-0700 and RA-01 rest on one question: what exact bytes does the app ship? RS-13 hashed the single-file compat package. The size budget (BUD-14, 1.0 MB) only fits the split form. The Rapier JS repository is archived upstream (RK-2, EXTERNAL).
- Target user: Amar and every later physics task.
- User story: As Amar, I want the engine files derived from a pinned npm package by a script that fails loudly on any change, so the physics I ship is the physics that was tested.
- Expected behaviour: `node scripts/build-physics.mjs` derives `rapier.split.mjs` and `rapier_wasm3d_bg.wasm` from `@dimforge/rapier3d-deterministic-compat` 0.21.0 into `public/engines/rapier@0.21.0/`, copies the Apache-2.0 `LICENSE`, writes sizes into `rapier.manifest.json`, and prints the three sha256 values. It exits non-zero on any check failure. `--check` compares existing output with the manifest pins and writes nothing. It then adds or replaces the `rapier` entry in `public/engines/manifest.json` so `loadEngine('rapier')` finds it. `npm run physics:build` runs the same script, and `pretest` and `prebuild` call it after B9's engine build, so `npm run check` and every build have the engine files.
- Success metric: the printed WASM sha256 is `4e9890fd2df60072f9db06a33e4030221249c1b3687b722b2388c21f09e97551` and the JS sha256 equals the manifest pin; total brotli q11 size is at most 1,000,000 B (ROBOTICS 16.1 measured 888,151 B for the derived pair).

**Implementation.**
- Existing files: `package.json:49-68` (E: add devDependency `"@dimforge/rapier3d-deterministic-compat": "0.21.0"`, exact, no caret; add the script `"physics:build": "node scripts/build-physics.mjs"`; append `&& npm run physics:build` to `prebuild` (`:13`) and `pretest` (`:20`) after B9's `engines:build` call, T-B9-07; Step 0 reads both lines as B9 left them); `package-lock.json` (E, by `npm install --save-exact --save-dev`; counts with `package.json` as one file, the B9 convention at B9 line 307). `scripts/build-engines.mjs` (T-B9-07) is read only and is not edited: it globs `src/sim-host/engines/*.manifest.json` (B9 line 313), so the pin file lives in the `physics/` subfolder where that glob does not see it (Step 0 confirms the glob). Reference implementation, read first: `08_RESEARCH_SPIKES/DP-01-robot-prototypes/src/split-build.mjs` and its output `results/split-build.json`.
- New files: `scripts/build-physics.mjs`; `src/sim-host/engines/physics/rapier.manifest.json`; `vendor/rapier3d-deterministic-compat-0.21.0.tgz` (the mirrored tarball, ROBOTICS 16.1 fallback, about 1.3 MB: confirm size with `ls -l` before committing). Tests: `scripts/build-physics.test.mjs` (Vitest includes `scripts/**`, `vitest.config.mts:12`). Four source files in all (`package.json` with its lockfile counts 1).
- Modules and signatures:
```js
// build-physics.mjs
export const PIN = { npm: '@dimforge/rapier3d-deterministic-compat', version: '0.21.0',
  integrity: 'sha512-n7JuU62Obljlgq+OeH2DHhTmRSjRzwuJPl54tS9pFIzVQyvXsO5CH+a5KkIRBtnFWDbg1Zicv9BulG0jfBAopA==',
  gitHead: 'b716d375efc0201003f0cd9ef7168eee0b62c177',
  wasmSha256: '4e9890fd2df60072f9db06a33e4030221249c1b3687b722b2388c21f09e97551' };
export function deriveSplit(rapierMjs /* string */, wasm /* Buffer */): { js: string; wasm: Buffer };  // pure, throws BuildError
export async function buildPhysics(opts?: { outDir?: string; check?: boolean }): Promise<{ files: Array<{ path: string; bytes: number; brotli: number; sha256: string }>; totalBrotli: number }>;
export class BuildError extends Error { code: 'integrity' | 'no-call' | 'two-calls' | 'wasm-mismatch' | 'pin-mismatch' | 'size' }
```
- Data model, `rapier.manifest.json` (same shape as B9's `avr8js.manifest.json`, B9 file line 304, plus pins):
```json
{ "id": "rapier", "version": "0.21.0", "form": "split-derived",
  "files": [], "requires": {},
  "license": { "spdx": "Apache-2.0", "reviewed": false },
  "budget": { "wireBytes": 1000000, "rawBytes": 0 },
  "pins": { "npm": "...", "integrity": "...", "wasmSha256": "...", "jsSha256": "..." } }
```
  `files`, `rawBytes` and the measured brotli sizes are filled by the script and committed; `budget.wireBytes` is the limit, the measured number goes in `files[].brotli`.
- Algorithm (ROBOTICS 16.1 recipe, unchanged): (1) read the tarball from `node_modules` or `vendor/`; check its integrity against `PIN.integrity` (`BuildError('integrity')`). (2) Find exactly one `<decoder>.toByteArray("AGFzbQ...")` call in `dist/rapier.mjs` (zero: `no-call`; two: `two-calls`). (3) Decode the base64; require byte equality with `dist/rapier_wasm3d_bg.wasm` and with `PIN.wasmSha256` (`wasm-mismatch`). (4) Replace the call with `(globalThis.__IYNK_RAPIER_WASM__ ?? new URL("rapier_wasm3d_bg.wasm", import.meta.url))`. (5) Write the two files, `LICENSE`, then compute raw and brotli q11 (`zlib.brotliCompressSync` with `BROTLI_PARAM_QUALITY: 11`) and sha256. (6) Compare the JS sha256 with the manifest pin (`pin-mismatch`); with `--check` do only this. (7) Read `public/engines/manifest.json` (written by B9's build; create it with the one entry if absent), add or replace the `rapier` entry (`id`, `version`, `files[]` with path, bytes, brotli, sha256) and write it back.
- Validation and error conditions: the five `BuildError` codes. Total brotli above `budget.wireBytes` is `size`.
- Edge cases: the replacement string in step 4 is part of the file, so a different whitespace gives a different hash. The expected JS sha256 in ROBOTICS 16.1 is `103fa5899fe4eebe7dc738d34b661fda034c26f130c46f3c4fb92303277abe86` (DOCUMENTED, author-run). On the first run the agent compares its output byte for byte with the output of `DP-01-robot-prototypes/src/split-build.mjs`. If both agree and differ from the DOCUMENTED hash, the agent writes the new hash into the pin and says so in the commit body; if they disagree the agent fixes its script. Windows line endings are not handled (macOS and Linux only).
- Permissions: the script reads `node_modules` and `vendor/`, writes `public/engines/rapier@0.21.0/`. No network at run time (the tarball is local). The one `npm install` that adds the devDependency needs the npm registry; it is the only network step.
- Performance: the script runs in under 10 s (ESTIMATED).
- Migration: none.

**Verification.**
- Unit tests `build-physics.test.mjs`: `deriveSplit` on a synthetic one-call input produces the replacement; zero calls and two calls throw the right codes; a flipped wasm byte throws `wasm-mismatch`; a wrong integrity throws `integrity`; brotli q11 sizes equal the manifest within 0 bytes after a build; `--check` on a tampered output file fails with `pin-mismatch`.
- Integration: a real run writes `public/engines/rapier@0.21.0/{rapier.split.mjs,rapier_wasm3d_bg.wasm,LICENSE}`; the test hashes them and compares with the manifest.
- Playwright: none here (T-B16-16 and T-B16-14 load the files).
- Fixtures: none beyond the tarball.
- Acceptance. Given the pinned package, When `node scripts/build-physics.mjs` runs, Then it prints the WASM sha256 `4e9890fd...7551`, the JS sha256 equal to the manifest, and a total of at most 1,000,000 B brotli. Given a patched copy of `rapier.mjs` with a second `toByteArray` call, When it runs, Then it exits non-zero with `two-calls`.
- Observability: the script prints one table of path, raw bytes, brotli bytes, sha256.
- Release blockers: a sha256 not equal to its pin; total over the budget without the fallback of ROBOTICS 16.1 being taken by Amar (section 6, item F6); a `pretest` or `prebuild` that does not call the script.

**Delivery.**
- Done when the build runs from a clean checkout after `npm ci`, the test passes, `npm run physics:build` recreates the folder after it is deleted, and `public/engines/rapier@0.21.0/` is ignored by git the same way B9 ignores built engines (`.gitignore` is B9's file; if B9 did not ignore the folder, the agent commits no built output and says so).
- Verify: `TL`; `V scripts/build-physics.test.mjs`; `PB --check`; `rm -rf public/engines/rapier@0.21.0 && npm run physics:build && test -e public/engines/rapier@0.21.0/rapier.split.mjs`.
- Documentation: the pins and the fallback rule go into `docs/ROBOTICS.md` (T-B16-36).
- Rollback: revert; remove the devDependency and the vendor file.
- Later tasks need: `public/engines/rapier@0.21.0/*`, the manifest pins (T-B16-02 tests, T-B16-16, T-B16-32 replay record, T-B16-33 loader).

---

### T-B16-02. `PhysicsBackend` interface, Rapier adapter and the two hashes

**Identity.** T-B16-02; subsystem: physics (`src/sim/mech`); B16, G1; must; depends on T-B16-00, T-B16-01; not started.

**Intent.**
- Problem: the physics engine must sit behind one interface so Jolt can replace it, torque must be applied the one way that was measured correct, and a state hash must exist that covers velocities and joint state (RS-13 covered only positions and rotations).
- Target user: every later mech task and the replay record.
- User story: As a sim developer, I want `create(scene)` to give me a world I can step, read and hash, so the rest of the code never imports Rapier.
- Expected behaviour: `RapierBackend.load()` fetches nothing itself; it takes the engine module as an argument, runs one dummy step and returns. `create(scene, stepRate)` builds bodies, colliders and joints in the order the scene lists them, sets sleeping off, sets the combine rules and solver iterations, and returns a `PhysicsWorld`. `applyJointTorqueImpulse` applies `tau * dt` to the child and `-tau * dt` to the parent (child only when the parent is fixed). `hash()` is the RS-13 method; `hash2()` is FNV-1a 64 over float64 bits.
- Success metric: RA-06: 0.01 N m for 240 steps on the reference wheel (0.157 kg, radius 0.05 m) gives 50.93 rad/s within 1 percent (prototype 0.002 percent) at `lengthScale` 1 and 10; RA-04: the combine rules and iteration count read back equal the replay-record values.

**Implementation.**
- Existing files: none in the repo. Read first: `08_RESEARCH_SPIKES/RS-13-physics-determinism/src/{common,rapier-run}.mjs` (the working Rapier calls, including velocity motors with a torque cap), `DP-01-robot-prototypes/src/{dbg,sa16,order}.mjs`, `SIMULATION_ARCHITECTURE.md` 10.2 (interface text, binding).
- Existing files, edited: `eslint.config.mjs:5-27` (E: add a config block for `src/sim/mech/**` with `no-restricted-properties` on the member names `addForce`, `addTorque`, `addForceAtPoint`; the `Date.now`, `performance.now`, `Math.random` ban for `src/sim` is T-B3-10's and is not repeated). This is RA-05 and the SA-11 list. The same file gets one `globalIgnores` entry, `src/sim/mech/fixtures/rs13/**`: the unmodified RS-13 scripts T-B16-16 copies use `Date` and `performance`, and `eslint .` lints `.mjs` files. `tsc` needs no edit: `tsconfig.json` has `allowJs` without `checkJs` and its `include` has no `.mjs` glob (VERIFIED).
- New files: `src/sim/mech/backend.ts`, `src/sim/mech/rapier.ts`, `src/sim/mech/hash.ts`. Tests: `backend.test.ts`, `rapier.test.ts`, `hash.test.ts`, `lint.test.ts` (uses the `ESLint` class to lint a planted file at a `src/sim/mech/` path and expects the violation).
- Modules and signatures: the interface of SIMULATION 10.2 is copied unchanged into `backend.ts` (`PhysicsBackend`, `PhysicsWorld`, `SceneSpec`, `BodySpec`, `ColliderSpec`, `JointSpec`, `StaticSpec`, `ContactEvent`, `CombineRule`, ids), with one addition (section 1 item 2):
```ts
export interface Ray { origin: Vec3; dir: Vec3; maxM: number }            // metres, dir unit length
export interface RayHit { toiM: number; collider: ColliderId; normal: Vec3 } // none: the entry is null
// PhysicsWorld gains:
castRays(rays: readonly Ray[]): Array<RayHit | null>;                      // solid, ignores sensor colliders
// rapier.ts
export type RapierModule = typeof import('@dimforge/rapier3d-deterministic-compat');
export function createRapierBackend(mod: RapierModule): PhysicsBackend;    // name 'rapier', version from mod.version()
// hash.ts
export function hashRs13(bodies: ReadonlyArray<{ p: Vec3; q: Quat }>): string;   // float32 bits, two 32-bit folds, 16 hex
export function hash2(bodies: ReadonlyArray<BodyState>, joints: ReadonlyArray<JointState>): string; // FNV-1a 64, float64 bits
```
- Data model: `SceneSpec` as in SIMULATION 10.2; `physics` options come from `simulation.physics {engine, step_hz, options}` and `domains.robotics.data.physics {length_scale, gravity_mps2, sleeping: false, ccd, params.solver_iterations}`.
- API contract: none over HTTP. The module is passed in so Node tests import the npm package and the browser path imports `rapier.split.mjs` from `loadEngine('rapier')` (T-B16-33), as B9 does for avr8js (B9 file line 109).
- Algorithm: `create` builds in the order given by the scene (statics, then each body followed by its colliders, then joints; the builder owns the sort, T-B16-03). World options: `timestep = 1 / step_hz`; `integrationParameters.numSolverIterations = solverIterations`; every body `setCanSleep(false)`; friction and restitution combine rules set on every collider explicitly (default `average`; the caster uses friction 0 with `min`). `lengthScale` k: lengths times k, gravity times k, torque times k squared, speeds times k, all inside this file. `applyJointTorqueImpulse(j, tau)`: axis in the world from the child body's rotation and the joint's local axis, then `applyTorqueImpulse(axis * tau * dt)` on the child and the negative on the parent when the parent is dynamic. `setJointMotor` maps to the engine's velocity or position motor with `maxTorque` as the cap. Joint angle: read from the engine if 0.21.0 exposes it (Step 0: `grep -n "angle" node_modules/@dimforge/rapier3d-deterministic-compat/dist/*.d.ts`), otherwise computed from the relative quaternion as `2 * atan2(dot(q.xyz, axis), q.w)` with `dmath.atan2` and unwrapped against the previous angle. `hash2`: bodies sorted by id in code-unit order, then per body the float64 bit patterns of `p`, `q`, `v`, `w`; then joints sorted by id, angle and speed; folded with FNV-1a 64 using `BigInt`; output 16 lowercase hex digits. `hash()` reproduces the RS-13 fold exactly (copy `common.mjs`'s fold; the test compares it with a known RS-13 vector). `castRays`: engine `castRay` with `solid = true`, excluding sensor colliders; returns `null` on a miss. `snapshot`/`restore`: call the engine's `takeSnapshot` / restore if present and guarded by T-B16-35's verdict; until then `snapshot()` throws `not-verified` and the host uses keyframe replay.
- State transitions: world state `created -> stepping -> freed`; `step` after `free` throws.
- Validation and error conditions: a NaN or infinity in any body state after `step` throws `NumericFault {body}` (ROBOTICS 18: runaway physics); a body speed above 100 m/s or a position beyond 10 km throws `PhysicsDiverged`. A scene with an unknown joint parent throws `BadScene`.
- Edge cases: Step 0 reads whether 0.21.0 can read back combine rules and iteration count. If not, the adapter stores what it wrote and `readBack()` returns it with `engineConfirmed: false`; RA-04's test then asserts only the stored values and the report says so. The first `step` stalls 24 to 27 ms; `load()` runs one dummy step on a throwaway world.
- Permissions: none. Performance: `step` mean at most 0.09 ms for the 20-body RS-13 scene on the M4 Pro (RS-13: 0.07 to 0.09 ms, DOCUMENTED); `hash2` is called once per 1,000 ms of simulated time only.
- Migration: none.

**Verification.**
- Unit tests: `hash.test.ts`: `hashRs13` equals the RS-13 vector for a fixed state; `hash2` is order independent over input permutations, changes when one velocity changes by one ulp, and is stable across 100 runs. `rapier.test.ts` (Node, real engine through the npm package): RA-06 at scale 1 and 10; a velocity-motor wheel reaches target speed; `addTorque` is not called anywhere in the file (also enforced by T-B16-10's lint rule); NaN injection throws `NumericFault`; `castRays` hits a box at a known distance within 1e-6 m and returns `null` on a miss; sleeping is off on every body; combine rules read back (RA-04, with the `engineConfirmed` rule above). `backend.test.ts`: the interface compiles against a fake backend that a conformance suite (`runBackendConformance(backend)`) also accepts, so Jolt can reuse the suite. `lint.test.ts`: a planted `body.addTorque(...)` in a file under `src/sim/mech/` fails lint; the real folder lints clean.
- Integration: the RS-13 scene is run in T-B16-16, not here.
- Playwright: none.
- Fixtures: the RA-06 reference wheel as an inline `SceneSpec`.
- Acceptance. Given the reference wheel and 240 steps at 1/240 s, When 0.01 N m is applied each step through `applyJointTorqueImpulse`, Then the wheel speed is within 1 percent of 50.93 rad/s. Given two identical worlds, When both step 1,000 times, Then `hash2` is equal at every 100th step.
- Observability: `NumericFault` and `PhysicsDiverged` carry the body id and step number.
- Release blockers: any call of `addTorque` or `addForce`; a `hash2` that depends on map iteration order.

**Delivery.**
- Done when the tests pass and `PORTABLE` passes (the adapter imports the engine only as a type).
- Verify: `TL`; `V src/sim/mech`; `PORTABLE`; `ARCH`; planted violation fails `npx eslint src/sim/mech --quiet`.
- Documentation: `docs/ROBOTICS.md` (T-B16-36) gets the interface and the torque rule.
- Rollback: revert; nothing else imports Rapier.
- Later tasks need: `createRapierBackend`, `PhysicsWorld`, `hash2`, `castRays`, `NumericFault` (T-B16-03, 08, 10, 16, 22, 23, 33, 35).

---

### T-B16-03. Scene builder: document to `SceneSpec`

**Identity.** T-B16-03; subsystem: physics (`src/sim/mech`); B16, G2; must; depends on T-B16-02, T-B16-04; not started.

**Intent.**
- Problem: the physics world must be built from the project document in one fixed order, with mass and inertia taken from the document, or two runs of the same project give different hashes (`order.mjs`: three creation orders gave three hashes and a 10 mm position difference).
- Target user: the run path and the drift gate.
- User story: As Amar, I want my robot to behave the same however its parts were added, so a hash means something.
- Expected behaviour: `buildScene(doc, deps)` returns `Result<SceneSpec, SceneError[]>` following ROBOTICS 4.4: statics first (sorted by id), then dynamic bodies sorted by id each followed by its colliders, then joints sorted by id (code-unit order, PDM 6.2).
- Success metric: RA-21: the same robot with bodies listed in 20 random orders gives a byte-identical `SceneSpec` and the same scene hash.

**Implementation.**
- Existing files: read `ROBOTICS_ARCHITECTURE.md` 4.3 to 4.5 and `schemas/robotics.domain.schema.json`; the example `schemas/examples/robot-line-follower.project.json` is the first fixture.
- New files: `src/sim/mech/scene.ts`, `src/sim/mech/inertia.ts`. Tests: `scene.test.ts`, `inertia.test.ts`.
- Modules and signatures:
```ts
export interface SceneDeps { describe(componentId: string): ComponentDescriptor | undefined; dmath: typeof Math }
export type SceneErrorCode = 'RB-E-TREE' | 'RB-E-MASS' | 'RB-E-INERTIA' | 'RB-E-THIN' | 'RB-E-AXIS' | 'RB-E-LIMITS' | 'RB-E-WHEEL' | 'RB-E-SURFACE';
export interface SceneError { code: SceneErrorCode; path: string; message: string }
export function buildScene(doc: Project, deps: SceneDeps): Result<{ scene: SceneSpec; warnings: SceneWarning[] }, SceneError[]>;
export function sceneHash(scene: SceneSpec): string;           // FNV-1a 64 over a canonical JSON of the scene
export function worldPose(doc: Project, frame: string, deps: SceneDeps): Pose;   // FK over frames, mm and deg
// inertia.ts
export function inertiaOf(shape: Shape, massKg: number): [number, number, number];  // box m(b2+c2)/12; cylinder about axis m r2/2, across m(3r2+h2)/12; sphere 2mr2/5
export function triangleOk(i: [number, number, number]): boolean;                   // Ixx+Iyy>=Izz, cyclic
```
- Data model: reads `mechanical.{frames,bodies,joints,mounts}` and `domains.robotics.data.{physics,surfaces,bodies,joints,wheels,arena}`. Writes nothing.
- Algorithm (ROBOTICS 4.4): mass is `mass_g / 1000`, or the part's `mechanics.mass_g` when the body has a `component` and no `mass_g`; colliders get density 0 and mass properties are set on the body; inertia from `Body.inertia_g_mm2` if present, else from the shape; a mesh body without a collider choice gets the bounding-box inertia and warning `RB-W-INERTIA-BOX`; `from-shape` maps box, cylinder (axis along body z) and sphere; `convex` up to 256 points; static trimesh up to 20,000 triangles, dynamic trimesh refused. Joints: `fixed`, `revolute`, `prismatic` map directly; `continuous` is revolute without limits; `wheel` is continuous with a cylinder collider carrying `WheelSpec.surface_mu`. Limits convert degrees to rad and mm to m. Damping and Coulomb friction go to `JointSpec.dampingNmsPerRad` and `frictionNm`. Motor rotor inertia reflected to the output (`j_m * gear^2`) is added to the wheel's inertia about its axis here, so the engine sees one inertia (ROBOTICS 7.1). Contact rules are pinned: friction and restitution combine `average`, caster ball friction 0 with `min`. Arena floor and walls become `StaticSpec`; a `Track` is not a collider (a painted line is read by sensors, T-B16-08). Start pose from `arena.start`.
- State transitions: none (pure).
- Validation and error conditions: `RB-E-MASS` mass 0 on a dynamic body; `RB-E-INERTIA` triangle inequality; `RB-E-THIN` any collider dimension below 5 mm; `RB-E-AXIS` zero axis (normalised and the normalised value returned); `RB-E-LIMITS` `min >= max`, or 360 degrees or more on a revolute joint; `RB-E-WHEEL` wheel with no `WheelSpec` or axis more than 1 degree off horizontal; `RB-E-SURFACE` unresolved surface; `RB-E-TREE` not a tree or not exactly one root. Warnings are produced by T-B16-17, not here, except `RB-W-INERTIA-BOX`.
- Edge cases: two bodies with ids that differ only in case sort by code unit, not locale; `rpy` in degrees converts through `deps.dmath`; a body listed in `domains.robotics.data.bodies` but missing in `mechanical` is T-B16-04's error, not this one's; empty arena gives a 10 m floor.
- Permissions: none. Performance: building the RS-13-size scene (20 bodies) under 2 ms; 64 bodies under 8 ms (ESTIMATED).
- Migration: none.

**Verification.**
- Unit tests: `scene.test.ts`: the example project builds and its scene lists 1 static floor, 4 wall statics, 4 bodies, 3 joints in sorted order; RA-21 over 20 seeded shuffles; each `RB-E` code from a constructed document; mass from a part descriptor; the motor inertia reflection; a golden `sceneHash` for the example (this is a **new** golden, labelled; it is not the RS-13 hash). `inertia.test.ts`: box, cylinder, sphere against hand arithmetic (cylinder 0.157 kg r 0.05 m gives 1.9625e-4 kg m2); triangle inequality both ways.
- Integration: builds `schemas/examples/robot-line-follower.project.json` (the example fixture above) and steps it through the T-B16-02 backend for 100 steps without a fault. The four-wheel fixture is made by T-B16-10, which depends on this task, so it is used only in T-B16-10, T-B16-22, T-B16-33 and T-B16-34.
- Playwright: none.
- Fixtures: `schemas/examples/robot-line-follower.project.json` read from disk in a `// @vitest-environment node` test.
- Acceptance. Given the same robot in two body orders, When `buildScene` runs, Then both scenes are deep-equal. Given a wheel body of mass 0, Then the result is an error list containing `RB-E-MASS` with the body path.
- Observability: errors carry the JSON path; warnings are returned, never logged.
- Release blockers: a scene that depends on input array order.

**Delivery.**
- Done when the tests pass and `PORTABLE` passes.
- Verify: `TL`; `V src/sim/mech`; `PORTABLE`.
- Documentation: `docs/ROBOTICS.md` (T-B16-36).
- Rollback: revert.
- Later tasks need: `buildScene`, `sceneHash`, `worldPose` (T-B16-10, 17, 22, 32, 33).

---

### T-B16-04. `domains.robotics` cross-reference rules on apply

**Identity.** T-B16-04; subsystem: project core (`src/project`); B16, G1; must; depends on no B16 task (B2 only); not started.

**Intent.**
- Problem: the schema checks a robot's domain data field by field. It cannot check that a body id in `domains.robotics.data.bodies` exists in `mechanical`, that a surface is defined, or that a sensor's mount exists. Two buddies editing different wheels must both keep their edit.
- Target user: the builder and, later, rooms and the AI partner (all edit through ops).
- User story: As a buddy editing a robot, I want my change to wheel friction to survive a buddy's change to a different wheel, and a typo in an id to be refused with the path.
- Expected behaviour: a `domain.patch` or `domain.set` op for `robotics` is applied by the B2 handler and then passes through `validateRoboticsRefs`. A broken reference rejects the op with `invalid` and the JSON path. `domain.patch` is the only op the editor sends.
- Success metric: RA-20 (document level): two patches that change `bodies.bdy_wheel_l.friction` and `bodies.bdy_wheel_r.friction` applied in either order give an identical final document hash.

**Implementation.**
- Existing files: `src/project/apply/index.ts` and `misc.ts` (T-B2-05, T-B2-07: read how `domain.patch` calls `mergePatch` and `validateDomains`), `src/project/validate.ts` (T-B2-08; E: register the robotics reference rules in the V3 list; lines UNKNOWN until built).
- New files: `src/project/apply/domain-robotics.ts`. Tests: `domain-robotics.test.ts`.
- Modules and signatures:
```ts
export interface RefError { path: string; code: 'unknown-body' | 'unknown-joint' | 'unknown-surface' | 'unknown-mount' | 'not-a-wheel'; message: string }   // document-only checks
export function validateRoboticsRefs(doc: Project): RefError[];     // pure, over the whole document
export function afterDomainOp(state: Project, op: Extract<Op, { k: 'domain.patch' | 'domain.set' }>): { ok: true } | { ok: false; errors: RefError[] };
```
- Data model: `domains.robotics.data` per `robotics.domain.schema.json`. Rules (ROBOTICS 4.3): keys of `bodies` exist in `mechanical.bodies[].id`; keys of `joints` and `wheels` exist in `mechanical.joints[].id`, and `wheels` keys are joints of kind `wheel`; every `Surface` id used by `arena.floor.surface`, `statics[].surface` exists in `surfaces`; every `SensorBinding.mount` is a `mnt_` id in `mechanical.mounts`; its `component` is a `cmp_` id present in `components`. The two checks that need the descriptor registry (the component's descriptor exists, and it has `mechanics.sensor` for the `query`) are not here: `src/project` imports only `core` (SYSTEM 5.3, matrix row `project`). They are `validateRobot` rules in T-B16-17, which has `describe`. No NaN or infinity anywhere.
- Algorithm: `afterDomainOp` runs `validateRoboticsRefs` on the state after the generic handler; the handler registration is one line in the `validate.ts` V3 list, not an edit of the generic handler. Merge-patch order independence follows from RFC 7396 on disjoint keys; the test proves it.
- Validation and error conditions: the seven `RefError` codes. A patch that sets a key to `null` removes it; removing a surface still referenced is `unknown-surface`.
- Edge cases: a project with no `mechanical` bodies and an empty robotics domain is valid; a robotics domain on a project with no `robotics` key is created by `domain.patch` on `{}` (B2 rule; Step 0 confirms).
- Permissions: the editor role check of B2 applies; no new role.
- Performance: validation of the largest legal robot (512 bodies) under 3 ms (ESTIMATED).
- Migration: none.

**Verification.**
- Unit tests `domain-robotics.test.ts`: each `RefError` code from a minimal document; RA-20 both orders; removing a surface in use is refused; a valid example project (`robot-line-follower.project.json`) has zero errors; undo of a patch restores the exact document (hash equal).
- Integration: through `ProjectSession.apply` with a real `domain.patch` op and `undo`.
- Playwright: none.
- Fixtures: the example project.
- Acceptance. Given two buddies' patches on different wheels, When they are applied in either order, Then both survive. Given a patch naming `bdy_wheel_x` that does not exist, Then the op is rejected with path `domains.robotics.data.bodies.bdy_wheel_x`.
- Observability: rejects use the B2 `Reject` shape with `refs`.
- Release blockers: an op that is accepted and leaves a dangling id.

**Delivery.**
- Done when the tests pass and `SCHEMA` and `PORTABLE` pass.
- Verify: `TL`; `V src/project`; `SCHEMA`; `PORTABLE`; `ARCH` (the file imports nothing outside `core` and `project`).
- Documentation: `docs/ROBOTICS.md`.
- Rollback: revert; `domain.patch` falls back to the schema-only check.
- Later tasks need: `validateRoboticsRefs` (T-B16-17, T-B16-18).

---

### T-B16-05. Top-down view

**Identity.** T-B16-05; subsystem: Studio robot view (`src/studio/views`, `src/components/studio/robot`); B16, G2; must; depends on T-B16-00, T-B16-04, T-B16-30; not started.

**Intent.**
- Problem: a robot needs a plan view where bodies, wheels, sensors and the track can be seen and, while running, the real pose (ground truth) shown beside the sensor value.
- Target user: Amar building and running a robot.
- User story: As Amar, I want to see my robot from above on its track, moving as the physics moves it.
- Expected behaviour: `topdown.ts` turns the document (and optionally a physics frame) into a draw list: arena floor and walls, track polylines with width, bodies as their footprints, wheels, sensor footprints and beams, the start pose, and a trail of the last 600 positions. `TopDownView.tsx` renders it in SVG with pan and zoom, shows ground truth, and offers a text readout of the pose (accessibility). A frame message from the run updates body poses; at most 30 frames per simulated second are drawn (SIMULATION 17.2).
- Success metric: the example project draws 4 bodies, 4 walls, 1 closed track of 32 points; a frame of 64 bodies produces a draw list in under 1 ms (ESTIMATED); the pose readout text matches the frame to 0.1 mm.

**Implementation.**
- Existing files: read the Studio renderer types from T-B4-03 (`src/studio/engine/types.ts`, `draw-list.ts`) and reuse their `DrawItem` shape; read `src/studio/views/breadboard.ts` (T-B4-10) for how a view is registered. Names UNKNOWN until built (Step 0).
- New files: `src/studio/views/topdown.ts`, `src/components/studio/robot/TopDownView.tsx`. Tests: `topdown.test.ts`, `TopDownView.test.tsx`.
- Modules and signatures:
```ts
import type { PhysicsFrame } from '@/core/robot-report';   // T-B16-00; declared once, not redefined here
export function buildTopDown(doc: Project, frame?: PhysicsFrame, opts?: { trail?: Array<[number, number]> }): DrawList;   // mm in, screen-neutral units out
export function poseText(doc: Project, frame: PhysicsFrame, bodyId: string, unit: 'mm' | 'cm' | 'in'): string;
export function TopDownView(props: { doc: Project; frame?: PhysicsFrame; selection?: string; onSelect(id: string): void; unit: 'mm' | 'cm' | 'in' }): JSX.Element;
```
- Data model: reads `mechanical`, `domains.robotics.data.arena` and `sensors`; `PhysicsFrame` is the transferable frame the SimWorker posts (7 floats per body, T-B16-33).
- Algorithm: footprints from `Shape` (box rectangle, cylinder as a circle or, for a wheel, a rectangle of `width_mm` by diameter, sphere circle); track polyline drawn with `width_mm` and `reflectance` as grey level; sensor footprint from the descriptor `mechanics.sensor` or the binding `params`. Hit testing by id for selection. No physics import: the view only reads frames.
- State transitions: none (stateless; the trail is passed in).
- Validation and edge cases: a body with no `mechanical` entry is skipped with a text note; zero-length track is skipped; a frame for an unknown body id is ignored and counted in a returned `dropped` field.
- Permissions: none. Performance: SVG list virtualised above 500 items (reuse T-B4-03 culling).
- Migration: none.

**Verification.**
- Unit tests: `topdown.test.ts`: draw-list counts for the example; frame overrides pose; unit conversion in `poseText`; unknown id dropped. `TopDownView.test.tsx` (jsdom): renders, selection callback fires on click and on Enter from the list, the text readout has an accessible name.
- Integration: none.
- Playwright: covered by T-B16-15.
- Fixtures: the example project.
- Acceptance. Given the example project and a frame moving the chassis 100 mm, When `buildTopDown` runs, Then the chassis item moves 100 mm and the track does not.
- Observability: none.
- Release blockers: the view importing `src/sim` (breaks `ARCH`).

**Delivery.**
- Done when tests pass and `ARCH` passes.
- Verify: `TL`; `V src/studio src/components/studio`; `ARCH`.
- Documentation: `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: `buildTopDown`, `TopDownView` (T-B16-39 mounts it; `PhysicsFrame` is declared in `src/core/robot-report.ts`, T-B16-00).

---

### T-B16-06. Brushed DC motor and gearbox: closed form per PWM cycle

**Identity.** T-B16-06; subsystem: actuators (`src/sim/mech`); B16, G1; must; depends on T-B16-00; not started.

**Intent.**
- Problem: a motor on PWM is not a motor on the average voltage. In the DP-01 prototype the duty-averaged model was 13 to 39 percent low in speed at 25 to 75 percent duty when the off state is coast (`results/motor.txt`), and a closed form per PWM cycle was within 0.14 to 0.52 percent (`results/motor2.txt`).
- Target user: the line follower's two wheels.
- User story: As Amar, I want a motor at 50 percent duty to turn at the speed a real gearmotor would, so tuning my code on the sim tells me something.
- Expected behaviour: `motor.ts` holds the electrical state (armature current) and, for one mechanical step with the shaft speed frozen at the value read from the engine, returns the cycle-average armature current, the shaft torque and the supply current. `gearbox.ts` converts shaft to output torque and speed with the efficiency applied in the direction of power flow, and reflects rotor inertia.
- Success metric: RA-10: at duty 0.25, 0.5 and 0.75 and 490 Hz, in coast and slow-decay modes, the closed-form speed is within 1 percent of a 5 microsecond reference in all six cases; the duty-averaged form is shown by a test to be wrong in coast mode.

**Implementation.**
- Existing files: `figures/engine/bench-solve.js:243-247` (`motorI`, the legacy conductance; stays as the T1 compatibility mode, not edited here); read `DP-01-robot-prototypes/src/motor.mjs` and `motor2.mjs` (equations, example motor R 2.5 ohm, L 1.2 mH, ke = kt = 0.012, J and b to be read from the file) and `ROBOTICS_ARCHITECTURE.md` 6.1, 7.1, 7.3, 7.4.
- New files: `src/sim/mech/motor.ts`, `src/sim/mech/gearbox.ts`. Tests: `motor.test.ts`, `gearbox.test.ts`.
- Modules and signatures:
```ts
export interface MotorParams { rOhm: number; lHenry: number; keVsPerRad: number; jKgM2: number; bNmsPerRad: number; iNoLoadA: number; derivedFrom?: string[] }
export type Decay = 'slow' | 'fast' | 'coast';
export interface Drive { vTerminal: number /* signed volts at the bridge output, after vdrop */; duty: number; hz: number; decay: Decay; phaseNs?: number }
export interface MotorState { iA: number }                         // armature current at the start of the step
export interface StepOut { iAvgA: number; supplyAvgA: number; iEndA: number; torqueShaftNm: number }
export function paramsFromDescriptor(m: MechanicsMotor): Result<MotorParams, { code: 'missing-r' | 'missing-ke'; message: string }>;
export function stepMotor(p: MotorParams, s: MotorState, wShaftRadS: number, d: Drive, hS: number): StepOut;   // closed form per PWM cycle, then partial cycle
export function stepMotorDc(p: MotorParams, wShaftRadS: number, vTerminal: number): StepOut;           // algebraic armature i = (V - ke w) / R
export function electromechanicalC(p: MotorParams): number;       // c = (kt ke / R + b) / J, per second
// gearbox.ts
export interface GearParams { ratio: number; efficiency: number; backdrivable: boolean; jOutKgM2: number }
export function outputTorque(g: GearParams, torqueShaftNm: number, wOutRadS: number): number;     // forward: ratio*eta*tau; back-driven: tau/(ratio*eta)
export function reflectedInertia(jRotorKgM2: number, g: GearParams): number;                       // J_m * ratio^2
```
- Data model: `MechanicsMotor` and `gear` from `component.schema.json` `$defs/mechanics.motor`. When only the four datasheet numbers exist (V, no-load speed, no-load current, stall current or stall torque), `paramsFromDescriptor` derives `ke = (V - R*i0) / w0` and `R = V / i_stall` and records `derivedFrom`. When `l_henry` is absent or 0 the motor is "inductance not given" and `stepMotor` uses `stepMotorDc`.
- Algorithm (ROBOTICS 7.4): inside one PWM cycle the shaft speed is constant. On segment: `i(t) = Ia + (i0 - Ia) e^(-t/tau_e)`, `Ia = (V - ke w) / R`, `tau_e = L / R`. Off segment: slow decay `Ib = -ke w / R` (current may reverse); coast: same decay until `i = 0` at `t0 = tau_e ln((i1 - Ib)/(-Ib))`, then zero for the rest of the period; fast decay: terminal `-V`. Average current per segment is the integral of the exponential divided by the period. A step covers `floor(h*hz)` whole cycles plus a partial one, started at `phaseNs` so the waveform has no seam between steps. Torque `tau_m = kt (i_avg - i0 sign(w))`. `exp` goes through `dmath` (ports).
- State transitions: `MotorState.iA` carries from the end of one step to the start of the next; reset to 0 on `reset`.
- Validation and error conditions: `r_ohm <= 0` is `missing-r`; no `ke` and no `kv` is `missing-ke`. `hz` 0 with `duty` in (0,1) is treated as DC at the duty-averaged voltage and flagged `approximation` in the returned `StepOut` notes.
- Edge cases: duty 0 and 1 are DC; `w` sign flips in the middle of a step use the value read at the step start (one step of lag, SIMULATION 5.6); a back-driven motor with `backdrivable: false` returns holding torque equal to the load up to a stated cap (HYPOTHESIS that the flag is enough, ROBOTICS 7.1).
- Permissions: none. Performance: about 100 ns per PWM cycle (98 and 109 ns in two DP-01 runs), so under 2 microseconds per motor per mechanical step at 490 Hz (ESTIMATED).
- Migration: none.

**Verification.**
- Unit tests: `motor.test.ts`: RA-10 six cases against a 5 microsecond reference integrator written in the test (free-wheel with J and b from `motor.mjs`); the duty-averaged form is more than 10 percent off in coast at duty 0.25 (the assertion that Objection 3 is real); DC limit equals `stepMotorDc`; `paramsFromDescriptor` from the four-number form; `electromechanicalC` for the example motor is 9.6 per second within 1 percent; current never negative in coast mode. `gearbox.test.ts`: forward and back-driven torque, reflected inertia, efficiency 1 gives lossless.
- Integration: none yet (T-B16-07 couples it).
- Playwright: none.
- Fixtures: the example motor numbers as a constant.
- Acceptance. Given the reference motor at 490 Hz coast, duty 0.5, free-wheel for 0.5 s, When the closed form runs with step 1/240 s, Then speed at 0.5 s is within 1 percent of the reference. Given the same drive on the duty-averaged form, Then the test shows more than 10 percent error.
- Observability: `StepOut` carries `notes` (`approximation`, `inductance-not-given`) read by the registry label (T-B16-26).
- Release blockers: a duty-averaged path used for a chopped drive.

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `V src/sim/mech/motor.test.ts src/sim/mech/gearbox.test.ts`; `PORTABLE`.
- Documentation: `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: `stepMotor`, `stepMotorDc`, `electromechanicalC`, `outputTorque`, `reflectedInertia` (T-B16-07, 11, 17, 22).

---

### T-B16-07. Electrical coupling, the `h*c` check and the solver `MOTOR` element

**Identity.** T-B16-07; subsystem: coupling (`src/sim/mech`, `src/sim/analog`); B16, G3; must; depends on T-B16-06, T-B16-19, T-B16-20, T-B16-21 (verdict); not started.

**Intent.**
- Problem: a motor draws current from a battery that also feeds the logic rail. The mechanical step lags the electrical one by at most one step (4.17 ms). The coupling must be stable, and a motor that would be unstable must be refused at load with the numbers.
- Target user: Amar when a motor starts and the Uno resets (cause `battery-sag-reset`).
- User story: As Amar, I want the pack to sag when the motors start, and the Uno to reset if the sag is deep enough, because that is what the real robot does.
- Expected behaviour: `coupling.ts` computes per motor `c` and `h*c` and returns `RB-E-COUPLING` when `h*c >= 1` (stable bound is 2, margin 2). It wires driver, motor, gearbox and pack into one `MotorChannel` that, at each mechanical step, reads joint speed from the last step and the terminal voltage from the last solve, and gives the engine a torque and the solver a supply current. The solver's `ElementM` gets a back-EMF or current-sink form according to the T-B16-21 verdict.
- Success metric: RA-12: a document with a tiny-inertia motor whose `h*c >= 1` loads with `RB-E-COUPLING` and prints `c`, `h` and `h*c`. With the reference motor on a 2S LiPo and a logic regulator, pack voltage under motor start sags in a way the T-B16-21 report predicted within its stated tolerance.

**Implementation.**
- Existing files: `src/sim/analog/elements.ts` (T-B3-17, T-B8-05; E: extend `ElementM`; the union is at B3 file line 455; exact lines UNKNOWN until built), `src/sim/analog/solve.ts` (read), `figures/engine/bench-solve.js:243-247` (the legacy form that stays as the default). Read `08_RESEARCH_SPIKES/RS-B16-motor-in-circuit/REPORT.md` first (T-B16-21).
- New files: `src/sim/mech/coupling.ts`. Tests: `coupling.test.ts`, `src/sim/analog/motor-element.test.ts`.
- Modules and signatures:
```ts
export const H_S = 1 / 240;                                   // mechanical step; taken from simulation.physics.step_hz at run time
// CouplingReport { motorId; c; hc; ok; mode } is declared in src/core/robot-report.ts (T-B16-00)
export function couplingCheck(m: MotorParams, hS: number): { ok: true; report: CouplingReport } | { ok: false; code: 'RB-E-COUPLING'; report: CouplingReport };
export function chooseMode(m: MotorParams, hS: number, waveform: 'dc' | 'pwm'): 'cycle' | 'algebraic';   // algebraic if L unknown, no edges, or L/R < 2h on DC drive
export interface MotorChannel {
  readonly id: string; readonly joint: string;
  begin(wJointRadS: number, vSupply: number, pins: PinSample, hS: number): { torqueJointNm: number; supplyA: number; notes: string[] };
  state(): { iArmA: number; mode: 'cycle' | 'algebraic' };
}
export function createMotorChannel(a: { motor: MotorParams; gear: GearParams; driver: DriverParams; id: string; joint: string }): MotorChannel;
// elements.ts: ElementM gains optional fields, absent = legacy behaviour
interface ElementM { /* existing */ emfV?: number; sinkA?: number; form?: 'legacy' | 'emf' | 'sink' }
```
- Data model: the solver sees the motor as: `form: 'legacy'` (conductance `1/ohms`, today's behaviour, used by every bench so the 106 faults and their numbers do not move, RA-24), `'emf'` (series `R` plus a voltage source `emfV = ke * w_m` set each step) or `'sink'` (ideal current sink of `sinkA` from the last step). T-B16-21 decides which of the two new forms is used for chopped drive; the other is left unimplemented and the file says so.
- Algorithm: `createMotorChannel.begin`: `w_m = gear.ratio * wJoint`; `drive = driverDrive(pins, vSupply)` (T-B16-19); `out = mode === 'cycle' ? stepMotor(...) : stepMotorDc(...)`; `torqueJoint = outputTorque(gear, out.torqueShaftNm, wJoint)`; return `supplyA = out.supplyAvgA`. The channel never calls the engine; the engine task (T-B16-22) applies the torque with `applyJointTorqueImpulse`.
- State transitions: `MotorChannel` modes switch between `cycle` and `algebraic` per step by `chooseMode`; no other state besides `MotorState`.
- Validation and error conditions: `RB-E-COUPLING` at load; a motor without `mechanics.motor` is `RB-E-DRIVE` (raised by T-B16-17).
- Edge cases: `L = 0` gives `algebraic` and `hc` still computed from `b` and `ke` alone; supply voltage below the driver `vdrop_v` gives zero drive; a solver that does not converge keeps the last `supplyA` and the channel reports `notes: ['stale-supply']`.
- Permissions: none. Performance: channel `begin` under 5 microseconds per motor (ESTIMATED).
- Migration: `ElementM` fields are optional; the converter output and the legacy solver equivalence test (T-B3-18) must stay green.

**Verification.**
- Unit tests: `coupling.test.ts`: `hc` for the reference motor is 0.04 (arithmetic from ROBOTICS 7.2: `c = 9.6`, `h = 1/240`); a constructed motor with `hc = 1.2` gives `RB-E-COUPLING` with the three numbers; `chooseMode` table; channel torque for duty 0.5 equals `outputTorque(stepMotor(...))`. `motor-element.test.ts`: `legacy` form gives the same currents as before on three bench circuits (RA-24 slice); `emf` or `sink` form on a 2S LiPo plus 0.2 ohm plus reference motor reproduces the T-B16-21 reference sag within the tolerance in its report.
- Integration: `V src/sim/analog/equivalence.test.ts` (T-B3-18) still green; `node figures/engine/bench-solve.test.mjs` still green.
- Playwright: none.
- Fixtures: the T-B16-21 scenario copied as a constant.
- Acceptance. Given a motor with `h*c = 1.2`, When the project loads, Then the problem list shows `RB-E-COUPLING` with `c`, `h` and `h*c`. Given the reference robot with a weak pack, When both motors start at full duty, Then the logic rail drops below the Uno minimum within one mechanical step of the motors starting.
- Observability: `CouplingReport` is shown in the RobotChecks panel (T-B16-31).
- Release blockers: the legacy bench numbers changing.

**Delivery.**
- Done when tests pass, `PORTABLE` passes, and the equivalence tests are green.
- Verify: `TL`; `V src/sim/mech/coupling.test.ts src/sim/analog`; `node figures/engine/bench-solve.test.mjs`; `PORTABLE`.
- Documentation: `docs/ROBOTICS.md`.
- Rollback: revert; `ElementM` returns to legacy only.
- Later tasks need: `createMotorChannel`, `couplingCheck` (T-B16-11, 17, 22).

---

### T-B16-08. Sensors from bodies: line array and ultrasonic ranger

**Identity.** T-B16-08; subsystem: sensors (`src/sim/mech`); B16, G3; must; depends on T-B16-02, T-B16-03 (`worldPose`), T-B16-04; not started.

**Intent.**
- Problem: today a sensor reads a number the figure sets (a "world knob"). A robot sensor must read the physics world: where it is, how high it is, what is under it or in front of it.
- Target user: the line follower (reflectance array) and, in B17, the obstacle avoider (ranger).
- User story: As Amar, I want the line sensor to read black over the tape and white over the floor, and to fade when I mount it too high.
- Expected behaviour: `sensors.ts` implements two queries from ROBOTICS 8. `surface-sample`: for each channel sample 9 points (centre plus 8 on a ring at 0.7 of the footprint radius), reflectance from the track polyline buffer else the floor surface, mean through the descriptor transfer function, multiplied by `max(0, 1 - ((h - h_opt)/h_range)^2)` where `h` is the sensor height above the floor from the physics pose. `ray-fan`: `n` rays (default 5) over `beam_deg`, shortest hit within `range_max_mm`, hits beyond `echo_max_angle_deg` return nothing, echo pulse `distance * 58.3 us/cm` with a 38 ms timeout, echo arrival at `2d/c` with `c = 343 m/s`. Both add seeded Gaussian noise from stream `sensor:<component id>` and hold the output between samples (`period_s`, `latency_s`). IMU, bump switch, IR distance and time of flight are "not modelled yet" in B16 (B17 and later).
- Success metric: RA-13 input: mounting the line sensor 30 mm too high drops contrast below the detector threshold and the evidence names the sensor and the height; a ranger facing a wall at 300 mm reads 17.49 ms of echo within noise.

**Implementation.**
- Existing files: `src/lib/interp/devices.ts:261` (`HcSr04`: the existing echo timing the new model must match, 58.3 us per cm, 38 ms timeout), `src/lib/interp/arduino/libs.ts:1233,1422` (`QTRSensors`, the library the sketch reads through), `docs/facts/qtr8rc.md` and `docs/facts/hcsr04.md` (sources for the descriptor numbers). Read `ROBOTICS_ARCHITECTURE.md` 8.
- New files: `src/sim/mech/sensors.ts`. Tests: `sensors.test.ts`.
- Modules and signatures:
```ts
export interface SensorWorld { pose(body: string): { p: Vec3; q: Quat }; castRays(r: readonly Ray[]): Array<RayHit | null>; arena: RoboticsArena; surfaces: Surface[] }
export interface LineReading { channels: number[] /* 0..1 reflectance after height effect */; heightMm: number; atNs: number }
export interface RangeReading { distanceMm: number | null; echoUs: number | null; atNs: number }
export function sampleLine(b: SensorBinding, d: MechanicsSensor, w: SensorWorld, mountPose: Pose, g: Rng, atNs: number): LineReading;
export function sampleRange(b: SensorBinding, d: MechanicsSensor, w: SensorWorld, mountPose: Pose, g: Rng, atNs: number): RangeReading;
export function reflectanceAt(arena: RoboticsArena, surfaces: Surface[], xMm: number, yMm: number): number;   // track buffer first, else floor
export function createSensor(b: SensorBinding, d: MechanicsSensor, rng: (stream: string) => Rng): { id: string; read(w: SensorWorld, atNs: number): LineReading | RangeReading; nextSampleNs(): number };
```
- Data model: `SensorBinding {id, component, mount, query, params}`; descriptor `mechanics.sensor {query, beam_deg, rays, range_min_mm, range_max_mm, noise_sigma_mm, noise_sigma_ratio, period_s, latency_s, echo_max_angle_deg, footprint_mm, channels, source}`. The height-effect numbers (`h_opt_mm`, `h_range_mm`) have no descriptor field in schema 1.1; they live in `SensorBinding.params` (open numbers, each shown "changed" or "assumed"). Pololu's QTR-8RC guide gives a recommended and a maximum distance (EXTERNAL, recalled; `docs/facts/qtr8rc.md` is the VERIFIED source the agent reads). Until read, the defaults are iynk assumptions.
- Algorithm: point-in-track test is distance from the point to the polyline segments (closed tracks include the last-to-first segment) at most `width_mm / 2`. Sensor world position is the mount pose composed with the body pose (`worldPose`, T-B16-03). Output hold: a new sample is taken when `atNs >= lastSample + period_ns`; the held value is returned with `age` in the reading. Noise is `rng.gauss() * sigma` and the stream is created once per sensor, so reordering sensors does not change draws.
- Validation and error conditions: a binding whose descriptor lacks `mechanics.sensor` returns `{ modelled: false }` from `createSensor` and the registry shows "not modelled yet" (R-FID-3); an unset `period_s` is an error in tier T2 and a visible "assumed" in T1.
- Edge cases: the sensor under the floor or inverted reads 0 reflectance and a note; a ray that starts inside a collider returns `toi 0`; angles use `dmath`.
- Permissions: none. Performance: a 5-ray fan plus 8-channel 9-point line sample under 30 microseconds per read (ESTIMATED); reads happen at the sensor period, not every step.
- Migration: none.

**Verification.**
- Unit tests `sensors.test.ts`: reflectance over a straight track at offsets 0, 5, 9.5 and 12 mm from the centre of a 19 mm line; the 9-point mean changes smoothly as the sensor slides; height 30 mm too high lowers the contrast below 20 percent of its value at `h_opt` (the threshold is a PROPOSAL); seeded noise is identical across two runs and changes with the seed; a ranger at 300 mm reads `echoUs` of 17,490 within `noise_sigma`; an incidence angle beyond `echo_max_angle_deg` returns nothing; output holds between samples; a binding with no `mechanics.sensor` is not modelled.
- Integration: `sensors.test.ts` also steps a one-body scene (T-B16-02 backend) with a ranger and a wall.
- Playwright: none.
- Fixtures: inline arena with one straight 19 mm track.
- Acceptance. Given a sensor 3 mm above the floor over the centre of the line, When read, Then the centre channels read low reflectance and the outer channels read high. Given the same sensor lifted 30 mm, Then contrast falls below the detector threshold.
- Observability: each reading carries provenance `computed`/`approximation` and tier T1 for the registry.
- Release blockers: an unset noise stream shared between sensors.

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `V src/sim/mech/sensors.test.ts`; `PORTABLE`.
- Documentation: `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: `createSensor`, `reflectanceAt` (T-B16-11 run metrics, T-B16-22, T-B16-25).

---

### T-B16-09. Loop-timing probe and PID reference law

**Identity.** T-B16-09; subsystem: instruments (`src/sim/probe`, `src/sim/mech`); B16, G1; must; depends on T-B16-00; not started.

**Intent.**
- Problem: a control loop that takes longer than its period is invisible today. The platform must show timing, not hide it (ADR-0704), and must ship a PID reference law students can read.
- Target user: Amar tuning the line follower and the speed loop.
- User story: As Amar, I want to see my loop period and jitter on the virtual clock and a PID plot with rise time, overshoot and settling time.
- Expected behaviour: `loop-timing.ts` collects loop timestamps from a `LoopSource`: the MCU engine's loop-start event if Step 0 finds one, else the rising edges of the heartbeat pin named in `ext["x-iynk-robot"].loopPin` (the templates toggle that pin at the top of `loop()`), and returns period histogram, mean, p95, max and jitter. `pid.ts` has the reference discrete PID of ROBOTICS 9.3 (derivative on measurement, first-order derivative filter, clamped integral, conditional-integration anti-windup) and the step-response metrics.
- Success metric: 200 timestamps pushed at 10.2 ms spacing give a mean period of 10.2 ms within 1 percent (a synthetic series; the interpreter-driven run with `delay(10)` and 200 statements of work, statement cost 1,000 ns on an Uno, SIMULATION 5.4, is checked in T-B16-38); PID metrics on a synthetic first-order plant match hand-computed rise time (10 to 90 percent) and 2 percent settling time within 1 sample.

**Implementation.**
- Existing files: `src/sim/probe/tap.ts` (T-B8-10: `ProbeTap`, kind `event`); `src/sim/mcu/arduino.ts` (T-B3-12: Step 0 reads the file as built and names the event kind that marks the start of a `loop()` call; no B3 or B8 task file names one, VERIFIED by grep of both, so this plan does not guess the kind name). Read `DRONE_ARCHITECTURE.md` section 9 for the trace metric thresholds (this task copies the same rule; defaults if absent: rise 10 to 90 percent, settling band 2 percent, PROPOSAL).
- New files: `src/sim/probe/loop-timing.ts`, `src/sim/mech/pid.ts`. Tests: `loop-timing.test.ts`, `pid.test.ts`.
- Modules and signatures:
```ts
export type LoopSource = { kind: 'event'; eventKind: string } | { kind: 'pin'; part: string; pin: string };   // eventKind is read in Step 0 from src/sim/mcu/arduino.ts
// LoopStats and StepMetrics are declared in src/core/robot-report.ts (T-B16-00); this file imports them.
export interface LoopTimingProbe { push(atNs: SimTime): void; stats(): LoopStats; targetPeriodNs?: number; overrunFraction(): number }
export function createLoopTiming(opts?: { buckets?: number; capacity?: number; targetPeriodNs?: number }): LoopTimingProbe;
// pid.ts
export interface PidConfig { kp: number; ki: number; kd: number; tS: number; tfS: number; iMax: number; uMin: number; uMax: number }
export interface Pid { step(setpoint: number, measurement: number): number; reset(): void; state(): { i: number; dFilt: number; lastY: number } }
export function createPid(c: PidConfig): Pid;
// StepMetrics { riseNs; overshootPct; settleNs; steadyError }: see src/core/robot-report.ts
export function stepMetrics(t: number[], y: number[], setpoint: number): StepMetrics;
```
- Algorithm (ROBOTICS 9.3): `e = r - y; P = kp e; I += ki T e` clamped to `[-iMax, iMax]` and skipped when the output is saturated and `e` has the same sign; `d = (y_prev - y)/T; dFilt += a (d - dFilt)` with `a = T/(T+Tf); D = kd dFilt; u = clamp(P+I+D, uMin, uMax)`. Loop timing keeps a ring buffer of `capacity` (default 65,536) timestamps and 32 log-spaced buckets; `overrunFraction` is the share of periods above `2 * targetPeriodNs` (feeds the `loop-too-slow` detector, T-B16-25).
- Validation and error conditions: `tS <= 0` or `tfS < 0` throws; a non-monotonic timestamp is dropped and counted.
- Edge cases: fewer than 2 timestamps gives `n 0` and `null` metrics; setpoint 0 gives overshoot 0; a response that never settles returns `settleNs: null`.
- Permissions: none. Performance: `push` is O(1); a 65,536 ring and `stats` under 1 ms (ESTIMATED).
- Migration: none.

**Verification.**
- Unit tests: `loop-timing.test.ts`: constant period, one slow loop, jitter, ring overflow, histogram counts add to `n`, `overrunFraction` with a target. `pid.test.ts`: P-only on a first-order plant, anti-windup (integral stops growing while saturated), derivative on measurement gives no kick at a setpoint step, filter coefficient, `stepMetrics` on an analytic second-order response.
- Integration: none here. The interpreter-driven check (a sketch with `delay(10)` and 200 statements reports 10.2 ms) is case 5 of T-B16-38; T-B16-29 shows the numbers.
- Playwright: none.
- Fixtures: synthetic plants in the test.
- Acceptance. Given 200 timestamps pushed at 10.2 ms spacing, When `stats()` runs, Then `meanNs` is 10,200,000 within 1 percent. Given a saturated output for 2 s, Then the integral term does not exceed `iMax`.
- Observability: `LoopStats` is the instrument data.
- Release blockers: wall-clock time anywhere in the file.

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `V src/sim/probe/loop-timing.test.ts src/sim/mech/pid.test.ts`; `PORTABLE`.
- Documentation: `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: `createLoopTiming`, `createPid`, `stepMetrics` (T-B16-25, 28, 29, 38).

---

### T-B16-10. Drift gate: SA-16 and RA-03, RA-06 numbers

**Identity.** T-B16-10; subsystem: physics tests (`src/sim/mech`); B16, G3; must; depends on T-B16-02, T-B16-03, T-B16-06; not started.

**Intent.**
- Problem: the roadmap exit needs SA-16 numbers: lateral drift under 1 percent over 10 simulated seconds, and wheel speed within 1 percent of analytic. DP-01 measured lateral drift 0.5 mm in 4 m (0.013 percent) and wheel speed error 0.002 percent, as a prototype in scratch. Nothing in the repo tests it.
- Target user: Amar reading the exit gate; later tasks that must not regress physics.
- User story: As Amar, I want the drift and speed numbers recorded from the real build, not from a scratch script.
- Expected behaviour: a four-wheel **test fixture** project (not a template; ROBOTICS 15) drives straight with equal wheel commands for 10 simulated seconds. The test records lateral drift as a percent of distance travelled at `lengthScale` 1 and 10, wheel speed error, yaw, and which scale was needed.
- Success metric: RA-03 lateral drift under 1 percent at scale 1; RA-06 wheel speed within 1 percent of 50.93 rad/s; the four numbers are printed and copied into the commit body.

**Implementation.**
- Existing files: read `DP-01-robot-prototypes/src/sa16.mjs` (scene: 0.5 kg chassis, four 0.05 kg wheels radius 0.05 m, motor joints 0.5 N m cap, 8 rad/s for 10 s, ideal travel 4.000 m; prototype: 3.986 m, drift 0.5 mm at scale 1) and `results/sa16.txt`.
- New files: `src/sim/mech/fixtures/four-wheel.project.json`; test `src/sim/mech/drift.test.ts`. No source file.
- Modules and signatures: `drift.test.ts` exports nothing; helper inside the test: `runStraight(project, scale: 1 | 10): { travelM: number; lateralM: number; yawDeg: number; wheelRadS: number }`.
- Data model: the fixture is a valid project (`schemaVersion` as in the examples; one chassis, four wheel bodies, four `wheel` joints, `domains.robotics.data` with a 10 m floor), checked by `SCHEMA` and `validateRoboticsRefs`.
- Algorithm: `buildScene` (T-B16-03) then the T-B16-02 backend, velocity motors at 8 rad/s with 0.5 N m cap, 2,400 steps. Lateral drift is the perpendicular distance from the straight line through the start along the initial heading; percent of the path length.
- Validation and edge cases: the test fails (not skips) if the engine package is missing.
- Permissions, performance: the test takes under 5 s (2,400 steps at about 0.1 ms, ESTIMATED).
- Migration: none.

**Verification.**
- Unit tests: `drift.test.ts`: scale 1 drift under 1 percent and the fixture's prototype value (0.013 percent) reported next to the measured one, not asserted equal; scale 10 same; RA-06 reference wheel speed within 1 percent; the lint rule T-B16-02 describes holds on this folder.
- Integration: the same fixture is reused by T-B16-22, T-B16-33 and T-B16-34.
- Playwright: none.
- Fixtures: `four-wheel.project.json`.
- Acceptance. Given the four-wheel fixture and equal wheel commands, When it runs for 10 simulated seconds at `lengthScale` 1, Then lateral drift is under 1 percent of distance travelled. Given the same at scale 10, Then the result is also under 1 percent, and the test prints which scale the project should use (1).
- Observability: the test prints `SA-16 drift=<pct> speedErr=<pct> scale=<n>`.
- Release blockers: drift at or over 1 percent (stop and report; do not loosen the bound).

**Delivery.**
- Done when tests pass; numbers recorded in the commit body.
- Verify: `TL`; `V src/sim/mech/drift.test.ts`; `SCHEMA`.
- Documentation: numbers into `docs/ROBOTICS.md` (T-B16-36).
- Rollback: revert.
- Later tasks need: the fixture and the recorded numbers (T-B16-22, T-B16-33; the recorded numbers go to T-B16-36 and T-B16-37).

---

### T-B16-11. Robot checker (RB-C-01 to RB-C-10) and run metrics

**Identity.** T-B16-11; subsystem: checker (`src/sim/mech`); B16, G3; must; depends on T-B16-00, T-B16-06, T-B16-19, T-B16-20, T-B16-26; not started.

**Intent.**
- Problem: a robot can be designed so it cannot move on a slope, stalls the driver, runs for six minutes, or tips over. These need no simulation run, and the answer must name the limiting part.
- Target user: Amar designing a robot; the AI partner reading results later.
- User story: As Amar, I want to be told "the driver is the limit, 1.2 A against 2.4 A stall" before I run.
- Expected behaviour: `checker.ts` computes RB-C-01 to RB-C-10 from the document and descriptors, each returning `{id, result: 'ok'|'warn'|'fail', value, limit, limitingPart, formula, assumptions}`. A `runMetrics` function turns a recorded run (frames and a track) into text results: maximum distance from the line, share of time on the line, progress along a closed track in laps (accessibility rule: results as text).
- Success metric: RA-11: each shipped template passes all ten and a deliberately broken variant (undersized driver, sensor too high, heavy payload) fails with the right `limitingPart`; the ROBOTICS 6.3 worked example reproduces: stall torque at the wheel 0.605 N m, per-wheel need 0.0199 N m, margin 30.

**Implementation.**
- Existing files: read `ROBOTICS_ARCHITECTURE.md` 6.3 (all formulas, binding), `src/lib/robotics/current.ts:1-71` (the bench current sums; the checker calls the solver for RB-C-05, it does not copy these sums), `src/content/robotics/tb6612fng.ts`/`l298n.ts` (driver current limits already stated there).
- New files: `src/sim/mech/checker.ts`. Tests: `checker.test.ts`.
- Modules and signatures:
```ts
// CheckId and RobotCheck { id; result; value; unit; limit; limitingPart; formula; assumptions; causeId? } are declared in src/core/robot-report.ts (T-B16-00)
export interface CheckInput { doc: Project; describe(id: string): ComponentDescriptor | undefined; slopeDeg: number; marginX: number /* default 1.5 */; supplyV?: number; duty?: { cruise: number; stall: number; idle: number } }
export function runChecks(i: CheckInput): RobotCheck[];                    // RB-C-05 returns 'warn' with 'needs a run' unless a solved result is supplied
export function topSpeed(i: CheckInput): { vMps: number; limitingPart: string };   // closed form on the linear motor torque-speed line
// RunMetrics { maxCrossTrackMm; onLineFraction; laps; progressMm; text } is declared in src/core/robot-report.ts (T-B16-00)
export function runMetrics(frames: ReadonlyArray<{ atNs: number; x: number; y: number }>, track: RoboticsTrack, widthMm: number): RunMetrics;
```
- Data model: reads `mechanical`, `domains.robotics.data.{wheels,surfaces}`, descriptors `mechanics.{motor,driver,battery,encoder,wheel,sensor}`. A failing check maps to a cause id (D-010): RB-C-01 `motor-stall`, RB-C-04 `driver-undersized`, RB-C-05 `battery-sag-reset`, RB-C-07 `tip-over`, RB-C-10 `sensor-too-high` or `ranger-beam-blocked`.
- Algorithm: formulas of ROBOTICS 6.3 exactly. `topSpeed` solves the intersection of the motor torque-speed line with the load line in closed form. RB-C-06 uses the pack model of T-B16-20 and returns a range (min and max duty profile), never one number. `runMetrics` projects each frame onto the closed polyline (nearest segment, arclength) and sums signed progress.
- Validation and error conditions: a missing descriptor block gives `warn` with `assumptions: ['no mechanics.motor']`, never a number from nowhere; margin default 1.5 is labelled "iynk's margin" and editable.
- Edge cases: no driven wheels gives RB-C-01 `fail` with `limitingPart: null`; zero-length track gives empty metrics; a lap is counted when accumulated progress passes the track length.
- Permissions: none. Performance: `runChecks` under 1 ms.
- Migration: none.

**Verification.**
- Unit tests `checker.test.ts`: the ROBOTICS 6.3 worked example (0.605, 0.0199, margin 30) within rounding; each RB-C id passes on a good robot and fails on a constructed one with the expected `limitingPart` and `causeId`; RB-C-04 sums simultaneous stall against the smaller of driver, pack and rail; RB-C-09 warns when `delta_v` exceeds 10 percent of target; `runMetrics` on a synthetic circular path gives one lap, on a path offset 30 mm gives `maxCrossTrackMm` 30.
- Integration: runs on the example project and on the three templates once they exist (T-B16-12, 27, 28 call `runChecks` in their own tests).
- Playwright: none.
- Fixtures: the example project and constructed variants.
- Acceptance. Given the line follower design, When `runChecks` runs, Then ten results are returned with none `fail`. Given the driver replaced by one with half the current limit, Then RB-C-04 fails and `limitingPart` is the driver component.
- Observability: each check carries `formula` and `assumptions` text for the panel.
- Release blockers: a check that returns `ok` when a required input is missing.

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `V src/sim/mech/checker.test.ts`; `PORTABLE`.
- Documentation: the check table into `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: `runChecks`, `runMetrics`, `RobotCheck` (T-B16-12, 25, 27, 28, 31, 38).

---

### T-B16-12. Template 3: the line follower (first template)

**Identity.** T-B16-12; subsystem: robot templates (`content/projects/robots`); B16, G5; must; depends on T-B16-04, T-B16-11, T-B16-17, T-B16-24, T-B16-26; not started.

**Intent.**
- Problem: the exit gate is a line follower Amar builds and runs. It must exist as a finished project: parts, wiring, code, arena, faults, checks, a "what it models" list and a diagnosis path.
- Target user: Amar and friends starting a robot.
- User story: As Amar, I want to open "Line follower", press Run, and watch it go round the track, then break it and find out why.
- Expected behaviour: a project file derived from `schemas/examples/robot-line-follower.project.json` (VERIFIED valid): Uno, TB6612 driver, two TT gearmotors with 65 mm wheels, caster, 2S LiPo, 8-channel QTR-8RC array, a 1800 by 1200 mm arena with a 19 mm oval track. Code is the existing `FOLLOW` sketch of the QTR bench (`src/content/robotics/qtr-8rc.ts:80`) adapted to the Uno pins. IMU (`cmp_imu`) is removed because the IMU is not modelled in B16. Five faults with cause ids from the registry. A `guide` with assembly, run, and a diagnosis path. `ext["x-iynk-robot"] = { "loopPeriodUs": 10000, "loopPin": "<a free Uno pin chosen in Step 0>" }` for the loop-timing detector and view; the sketch toggles `loopPin` at the top of `loop()` (the `LoopSource` of T-B16-09).
- Success metric: PRD R-166 / 10.6: the robot follows the line for one lap (progress at least the track length, `runMetrics`), maximum cross-track error under 15 mm (PROPOSAL, about 0.8 track widths), in 40 simulated seconds; ten runs with one seed give one `hash2` per checkpoint (RA-02 is run by T-B16-14; the lap and cross-track numbers are proved by T-B16-38).

**Implementation.**
- Existing files: `04_ARCHITECTURE/schemas/examples/robot-line-follower.project.json` (copied, not edited), `src/content/robotics/qtr-8rc.ts:80,274` (sketch and its pin names), `docs/facts/qtr8rc.md`, `docs/facts/tb6612.md`, T-B13-02/03 bench projects under `content/projects/robotics/` (reuse the Uno plus TB6612 wiring if present, Step 0).
- New files: `content/projects/robots/line-follower.project.json`. Test: `src/sim/mech/templates.test.ts` (shared by T-B16-27 and T-B16-28; this task creates it with the line-follower case).
- Modules and signatures: none (data). Test helper in `templates.test.ts`: `loadTemplate(name): Project`.
- Data model: `schemaVersion` as the example; `simulation.physics {engine: "rapier", step_hz: 240}`, `seed: 1`, `duration_ms: 40000`; faults:

| Fault id | `cause_id` | `kind` | What it does |
|---|---|---|---|
| `flt_brownout` | `battery-sag-reset` | `brownout` | weak pack, the Uno resets at motor start |
| `flt_motor_swap` | `motor-direction-reversed` | `wrong-connection` | swaps left motor leads |
| `flt_sensor_high` | `sensor-too-high` | `config` / `param` with `height_mm` 30 | lifts the array (RA-13 uses 30 mm; the example used 15 mm) |
| `flt_wheel_slip` | `wheel-slip` | `param` | left wheel `surface_mu` times 0.25 |
| `flt_sensor_sat` | `sensor-saturated` | `sensor` | channels stuck at full scale |

  Symptom ids come from T-B16-24. `tests[0]`: `runMs 40000`, checks `runs` and a `serial` check on the sketch's `lap` print. Source text is English; the other five languages fall back (open question Q4).
- Algorithm: build by copying the example and applying the edits above; no generator.
- Validation: the file passes `SCHEMA`, `validateRoboticsRefs`, `validateRobot` with zero errors, and `runChecks` with no `fail`.
- Edge cases: the sketch must run in the interpreter without a `library-not-modelled` diagnostic; if the Uno pin map differs from the Nano's, the sketch's pin numbers change, not the library calls.
- Permissions: none. Performance: the file is about 50 KB (example 51,742 bytes).
- Migration: none.

**Verification.**
- Unit tests `templates.test.ts` (line-follower case, static): validates; five faults with registry cause ids; `runChecks` all ok; the sketch compiles in the interpreter (`createRun` with the project's source and no error). Every live-run case (a lap, cross-track under 15 mm, equal hashes across two runs, the fault findings) is in T-B16-38. No case is left as `it.todo` and no later task turns one on.
- Integration: RA-02 for this template is T-B16-14.
- Playwright: T-B16-15.
- Fixtures: none beyond the file.
- Acceptance. Given the template and seed 1, When it runs 40 simulated seconds, Then it completes a lap with maximum cross-track error under 15 mm. Given `flt_sensor_high` enabled, Then the run fails to follow and the diagnosis names `sensor-too-high` (both proved by T-B16-38).
- Observability: `runMetrics` text lines.
- Release blockers: a sketch that needs a library the interpreter lacks; a number in the project with no source or "iynk assumption" note.

**Delivery.**
- Done when the unit tests pass and `SCHEMA` is clean.
- Verify: `TL`; `V src/sim/mech/templates.test.ts`; `SCHEMA`.
- Documentation: template description in `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: the file (T-B16-14, 15, 27, 28, 38, 39).

---

### T-B16-13. Robot fault detectors I: motion

**Identity.** T-B16-13; subsystem: faults (`src/sim/faults`); B16, G5; must; depends on T-B16-22, T-B16-24; not started.

**Intent.**
- Problem: B10 left 12 robot cause ids as "no detector yet". The motion ones can now fire from physics facts.
- Target user: Amar, in Break it and Diagnose.
- User story: As Amar, when my wheel spins on the spot I want the app to say `wheel-slip` and show the two speeds.
- Expected behaviour: five rules registered with `allRules()`: `solve:motor-stall@1`, `solve:motor-direction-reversed@1`, `solve:encoder-channel-swapped@1`, `solve:wheel-slip@1`, `solve:tip-over@1`. They read `RunFacts.robot` (added here).
- Success metric: each rule fires on a hand-made `RobotFacts` for its fault and stays silent on the healthy template run; evidence records carry provenance and tier T1.

**Implementation.**
- Existing files: `src/sim/faults/rules.ts` (T-B10-03/T-B10-11; E: add `ROBOT_RULES` to `allRules()`), `src/sim/faults/types.ts` (T-B10-01; E: `robot?: RobotFacts` on `RunFacts`, which is declared there, B10 line 220; `run-facts.ts` only implements `runFactsFrom`), `src/sim/mech/facts.ts` (T-B16-22; read). Rule ids follow B10's form `solve:<name>@1` (B10 lines 262 to 268).
- New files: `src/sim/faults/robot.ts`. Tests: `robot.test.ts`.
- Modules and signatures:
```ts
export const ROBOT_MOTION_RULES: readonly Rule[];            // the five rules
export function robotFindingsFrom(facts: RobotFacts): Finding[];   // convenience for tests
```
  Detector rules (SIMULATION 13.4): `motor-stall`: joint speed under 0.05 rad/s with armature current at least 90 percent of `V/R` for over 0.5 s. `motor-direction-reversed`: commanded direction sign differs from joint velocity sign for 0.5 s with torque applied. `encoder-channel-swapped`: counts decrease while the joint angle increases. `wheel-slip`: wheel surface speed differs from ground speed by more than 20 percent for 0.3 s. `tip-over`: body tilt beyond 45 degrees, or RB-C-07 triggered. All thresholds are defaults, shown, and editable per project in a later task (PROPOSAL).
- Data model: `RobotFacts` from T-B16-22 (10 Hz samples per motor and joint, decimated beyond 20,000 samples).
- Algorithm: each rule scans the sample list once and returns at most one finding per joint with the first window that satisfies the condition; `Finding.evidence` holds up to 4 `Evidence` entries (`kind: 'state'` or `'timeline'`, `at`, `value`, `unit`, `provenance: 'computed'`, `tier: 'T1'`, `modelIds` from the registry).
- Validation and edge cases: a motor commanded zero never triggers stall or direction; startup transient shorter than the window does not trigger; missing robot facts make the rule `skipped.add(ruleId, 'no robot run')`.
- Permissions, migration: none. Performance: one pass, under 1 ms for 20,000 samples.

**Verification.**
- Unit tests `robot.test.ts`: per rule: fires on constructed facts, silent on healthy facts, boundary at the window length, silent when command is zero; evidence fields present. `V src/sim/faults/coverage.test.ts` (T-B10-11) still green after `detectorStatus` for the five flips from `not-modelled-yet` to `solved` (the test's expected counts change: the agent edits only the expected table in that test and says so).
- Integration: the live-run cases (the line follower with `flt_motor_swap` and `flt_wheel_slip` gives the two findings; no robot finding on the healthy run) are in T-B16-38. None is left as `it.todo`.
- Playwright: none.
- Fixtures: constructed `RobotFacts`.
- Acceptance. Given facts where the left wheel turns backward under a forward command for 0.6 s, When the rules run, Then `motor-direction-reversed` is found with two evidence entries. Given the healthy run, Then no robot finding.
- Observability: `skipped` map entries.
- Release blockers: a false alarm on the healthy template run.

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `V src/sim/faults`; `PORTABLE`.
- Documentation: detector table into `docs/FAULTS.md` (generated by T-B10-11's printed table) and `docs/ROBOTICS.md`.
- Rollback: revert; `detectorStatus` returns `not-modelled-yet`.
- Later tasks need: `ROBOT_MOTION_RULES` (T-B16-25, T-B16-38, T-B16-40).

---

### T-B16-14. Cross-browser hash job (RA-01 browsers and RA-02)

**Identity.** T-B16-14; subsystem: e2e; B16, G9; must; depends on T-B16-01, T-B16-10, T-B16-12, T-B16-16, T-B16-27, T-B16-28, T-B16-33, T-B16-38, T-B16-39, T-B16-40; not started.

**Intent.**
- Problem: determinism was measured on one CPU architecture (arm64) in Node, Chromium and WebKit. Firefox and x86-64 are untested (RK-1). R-166 and R-170 require the same hashes in two browsers.
- Target user: Amar reading the exit gate; rooms that compare physics hashes (class D until this passes, RC-53).
- User story: As Amar, I want the hashes of the three templates recorded for each browser I can run, with the gaps stated.
- Expected behaviour: two specs. `e2e/physics-hash.spec.ts` runs once per browser project and (A) runs the RS-13 scene on the shipped artifact in the page and compares the final hash with `c6a8e92d6174bd66`, also under CDP CPU throttling 4x and 6x on Chromium (RA-01); (B) opens each of templates 1 to 3 through Home > Robot (T-B16-39), runs it to the end, and reads the checkpoint hashes through `window.__iynkMechHashes.latest()` (T-B16-40), ten times with one seed in Chromium and once in each other browser (RA-02); (C) records `sceneHash` per browser, which catches trig differences in the builder. It writes `test-results/physics-hash-<browser>.json`. `e2e/physics-compare.spec.ts` reads those files and compares them. Firefox runs only when B9's `firefox` project can launch (T-B9-20 owns the install and skip rule); a missing browser leaves its file absent and the comparer records the gap as UNKNOWN.
- Success metric: hashes equal across Chromium and WebKit (and Firefox when installed) for all three templates and the RS-13 scene; or the first difference is reported with checkpoint time and browser pair.

**Implementation.**
- Existing files: `playwright.config.ts` (E). Step 0 reads the `projects` array as T-B3-21 (`webkit`, `r048`), T-B4-05 and T-B9-20 (`firefox`) left it (today `playwright.config.ts:23-25` holds `chromium` and `phone`, VERIFIED). The exact diff, applied on top of that text (each regex gains one alternative; nothing else changes):
```ts
{ name: 'chromium', /* ... */ testIgnore: [/.*\.phone\.spec\.ts/, /r048-compare\.spec\.ts/, /physics-compare\.spec\.ts/] },  // chromium has no testMatch, so it runs physics-hash.spec.ts by default
{ name: 'webkit',   /* ... */ testMatch: /(core|physics-hash)\.spec\.ts/ },        // T-B3-21 wrote /core\.spec\.ts/; keep any alternative B9 added and append physics-hash
{ name: 'firefox',  /* ... */ testMatch: /(dmath|bme280-hash|physics-hash)\.spec\.ts/ },   // B9's project (B9 line 494); this task adds no firefox project
{ name: 'physics-compare', testMatch: /physics-compare\.spec\.ts/, dependencies: ['chromium', 'webkit'] },   // same pattern as r048 (B3 lines 1482 and 1483)
```
  `phone` keeps `testMatch: /.*\.phone\.spec\.ts/` and never sees these specs. Why a separate project and not a `@compare` describe inside `chromium` with `dependencies: ['webkit']`: that would make every Chromium run wait for WebKit and run WebKit's `core.spec.ts`; B3 solved the same need with the `r048` project, and this follows it. `webServer.env` already carries `NEXT_PUBLIC_STUDIO_TEST: '1'` (T-B4-05), which `window.__iynkMechHashes` needs.
- New files: `e2e/physics-hash.spec.ts`, `e2e/physics-compare.spec.ts`. No source file.
- Modules: `physics-hash.spec.ts` loads `/engines/rapier@0.21.0/rapier.split.mjs` with `page.evaluate(() => import(url))` from an app page, sets `globalThis.__IYNK_RAPIER_WASM__` from a fetched `ArrayBuffer` after checking its SHA-256 with `crypto.subtle` against the manifest pin, and runs RS-13's scene given as JSON (from `src/sim/mech/fixtures/rs13/`, T-B16-16). The templates run through the Studio (T-B16-39) and the hook of T-B16-40.
- Data model, result file per browser: `{ browser, version, rapier: {wasmSha256, jsSha256}, rs13Final, throttles: {...}, templates: { name: { runs: n, hashes: string[], sceneHash } } }`.
- Algorithm: each browser project writes its own file. `physics-compare.spec.ts` runs after `chromium` and `webkit` (project dependency), reads every `test-results/physics-hash-*.json` that exists, and compares each template's checkpoint list and `sceneHash` with Chromium's.
- Validation and error conditions: a hash mismatch fails with both values, the checkpoint index and the browser pair. The engine files must exist: run `PB` first or the spec fails with "physics engine not found".
- Edge cases: CDP throttling only on Chromium; WebKit run is headless macOS WebKit (VERIFIED installed); an x86-64 run cannot be done by an agent here, it is "For Amar" (section 6, item F4).
- Permissions: none beyond the app's own origin; ports via the config's random port. Performance: ten runs of a 30 s template in a page take under 3 minutes (ESTIMATED).
- Migration: none.

**Verification.**
- Unit tests: none (the specs are the test).
- Integration: the specs themselves.
- Playwright: `E e2e/physics-hash.spec.ts --project=chromium --project=webkit`, then `E e2e/physics-compare.spec.ts --project=physics-compare --no-deps`; Firefox optional with `--project=firefox` once B9 installed it.
- Fixtures: RS-13 scene JSON.
- Acceptance. Given the shipped artifact, When the RS-13 scene runs in Chromium and WebKit, Then the final hash is `c6a8e92d6174bd66` in both, also at 6x throttle. Given template 3 with seed 1, When it runs ten times in Chromium and once in WebKit, Then all checkpoint hashes are equal.
- Observability: `test-results/physics-hash-<browser>.json`, copied into `docs/ROBOTICS.md` as a dated table (T-B16-36).
- Release blockers: a mismatch is a stop. Do not loosen the comparison to class N; report to Amar (RC-53 keeps rooms on class D).

**Delivery.**
- Done when the specs pass in Chromium and WebKit and the JSON files are written.
- Verify: `TL`; `PB`; `E e2e/physics-hash.spec.ts --project=chromium --project=webkit`; `E e2e/physics-compare.spec.ts --project=physics-compare --no-deps`.
- Documentation: the hash table in `docs/ROBOTICS.md`.
- Rollback: revert; remove the `physics-compare` project and the added alternatives.
- Later tasks need: the recorded numbers (T-B16-36, T-B16-37).

---

### T-B16-15. Robot end-to-end: build, run, same result twice

**Identity.** T-B16-15; subsystem: e2e; B16, G9; must; depends on T-B16-05, T-B16-12, T-B16-13, T-B16-18, T-B16-25, T-B16-29, T-B16-31, T-B16-33, T-B16-39, T-B16-40; not started.

**Intent.**
- Problem: unit tests do not prove that a person can build a robot in the UI and see it run.
- Target user: Amar (the exit gate walks this by hand too).
- User story: As Amar, I want a test that does what I will do: build a drive base, open the line follower, run it twice, break it.
- Expected behaviour: three scenarios in Chromium (keyboard-first; the phone project is not required). Everything they touch exists before this task: the entry and the panels (T-B16-39), the run hash text and the findings path (T-B16-39, T-B16-40), the detectors (T-B16-13, T-B16-25).
- Success metric: all three pass on a production build with the keyless env.

**Implementation.**
- Existing files: `e2e/studio-m1.spec.ts` (T-B4-22: reuse its helpers), `playwright.config.ts` (read).
- New files: `e2e/robot.spec.ts`. No source file.
- Scenarios:
  1. Build by keyboard: Home > New project > Robot (T-B16-39), Add drive base (builder recipe), add a line sensor, the problem list shows no `RB-E`, the checks panel lists ten checks, save, reload, the robot is still there with the same parts.
  2. Same result twice: Home > Robot > Line follower, Run for 10 simulated seconds twice (Reset between), the status element named "Run hash" (T-B16-39 `RunBar`) shows equal text both times; the text results show a cross-track maximum and progress; the top-down trail has points; the Loop timing tab (T-B16-29) shows a mean period. The PID panel's numbers are proved by its component tests (T-B16-29) and the live data by T-B16-38.
  3. Break it: enable the `sensor-too-high` fault, Run, the Diagnose panel shows cause `sensor-too-high` with evidence naming the sensor and its height (rule of T-B16-25, facts path of T-B16-40), hint ladder has three levels (RA-13).
- Algorithm: waits on UI state (`data-state="done"`) never on timers. Uses `getByRole` names from the `robot` namespace (T-B16-30). The build carries `NEXT_PUBLIC_STUDIO_TEST=1` (T-B4-05).
- Validation and edge cases: if the engine file is not served the test fails with "physics engine not found", not a timeout; run `PB` first (`npm run check` does it through `pretest`; a bare `E` run does not). The test uses the production build (`playwright.config.ts` default).
- Permissions: none. Performance: each scenario under 90 s on the dev laptop (ESTIMATED).
- Migration: none.

**Verification.**
- Unit tests: none.
- Integration: this is it.
- Playwright: `E e2e/robot.spec.ts`; axe check on the builder and the checks panel (reuse `@axe-core/playwright`, `package.json:50`).
- Fixtures: none.
- Acceptance. Given the line follower and seed 1, When run twice, Then the two hash strings shown are equal. Given the fault enabled, Then the diagnosis shows `sensor-too-high`. Given a Blink project opened first in the same session, Then no request for `/engines/rapier@0.21.0/` was made (RA-26).
- Observability: Playwright trace on failure (config `on-first-retry`).
- Release blockers: axe violations at serious or critical level.

**Delivery.**
- Done when the spec passes.
- Verify: `TL`; `PB`; `E e2e/robot.spec.ts`.
- Documentation: none.
- Rollback: revert.
- Later tasks need: nothing; it is a gate input.

---

### T-B16-16. Shipped-artifact gate: RA-01 in Node, RA-27 size and pins

**Identity.** T-B16-16; subsystem: physics tests (`src/sim/mech`); B16, G2; must; depends on T-B16-01, T-B16-02; not started.

**Intent.**
- Problem: the engine decision (ADR-0700) rests on the exact bytes shipped reproducing the RS-13 hash, and on the size staying under 1.0 MB.
- Target user: Amar; every release.
- User story: As Amar, I want a test that fails if the engine files, their hashes or their size change.
- Expected behaviour: `artifact.test.ts` builds the artifact into a temp folder with `buildPhysics()`, loads `rapier.split.mjs` in Node with the WASM bytes passed through the `__IYNK_RAPIER_WASM__` hook, runs RS-13's scene unchanged for 10,000 steps, and compares all ten checkpoint hashes and the final hash with RS-13's compat run. It also checks the sha256 of both files against the manifest pins and the total brotli size against 1,000,000 B, and records the brotli quality used.
- Success metric: final hash `c6a8e92d6174bd66` (DOCUMENTED in RS-13 and VERIFIED as prototype by DP-01 `results/split-hash-node.txt`); total at most 1,000,000 B (DOCUMENTED 888,151 B).

**Implementation.**
- Existing files: `scripts/build-physics.mjs` (T-B16-01), manifest, `08_RESEARCH_SPIKES/RS-13-physics-determinism/src/{common,rapier-run}.mjs` (copied unchanged into `src/sim/mech/fixtures/rs13/` with a README line giving their origin and sha256; these are fixtures, not source; `eslint.config.mjs` ignores the folder through the `globalIgnores` entry T-B16-02 adds, and `tsc` does not check `.mjs`: `tsconfig.json` has `allowJs` and no `checkJs`).
- New files: test `src/sim/mech/artifact.test.ts`; fixtures `src/sim/mech/fixtures/rs13/{common.mjs,rapier-run.mjs,expected.json}`. No source file.
- Algorithm: the ten RS-13 checkpoint hashes are read from `08_RESEARCH_SPIKES/RS-13-physics-determinism/src/results/node.json`, key `runs[0].hashes` (the run with `engine: "rapier"`; ten values, the last `c6a8e92d6174bd66`; VERIFIED by reading). `REPORT.md` lists only final hashes per runtime, so it is not the source. They are stored in `expected.json` with that origin line. The test runs the scene through the split artifact, not the npm package.
- Validation: the test fails if the hook is unset (the artifact would try to `fetch`).
- Edge cases: Node 24.x only (`package.json` engines `24.x`); the test reports the machine architecture in its output (RA-01's x86-64 part stays UNKNOWN and is item F4).
- Permissions: reads `vendor/` and `node_modules`. Performance: 10,000 steps at 0.09 ms is about 1 s plus the build.
- Migration: none.

**Verification.**
- Unit tests: `artifact.test.ts`: RA-01 Node; RA-27 sizes and pins; a test that tampering with one byte of the WASM in memory changes the hash (proof the check can fail).
- Integration: none. Playwright: the browser half is T-B16-14.
- Fixtures: as above.
- Acceptance. Given the built artifact, When the RS-13 scene runs 10,000 steps, Then the final hash is `c6a8e92d6174bd66` and all ten checkpoints equal RS-13's. Given a flipped WASM byte, Then the loader's pin check fails.
- Observability: prints architecture, Node version, sizes, hashes.
- Release blockers: any difference in a checkpoint.

**Delivery.**
- Done when the test passes.
- Verify: `TL`; `V src/sim/mech/artifact.test.ts`.
- Documentation: numbers into `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: the fixtures (T-B16-14, T-B16-34, T-B16-35).

---

### T-B16-17. Robot validator: RB-E and RB-W rules and scene limits

**Identity.** T-B16-17; subsystem: validation (`src/sim/mech`); B16, G4; must; depends on T-B16-00, T-B16-03, T-B16-04, T-B16-07, T-B16-30 (message keys); not started.

**Intent.**
- Problem: PDM 9.2 V3 needs the robot rules; the person must see "this wheel has no wheel spec" in the Problems pane with the path, and warnings about shapes that make the engine unstable.
- Target user: Amar in the builder.
- User story: As Amar, I want a thin 2 mm plate flagged before the simulator behaves oddly.
- Expected behaviour: `validateRobot(doc, deps)` returns problems: the eight `RB-E` codes from `buildScene`, `RB-E-DRIVE`, `RB-E-COUPLING`, `RB-E-SENSOR` (moved here from T-B16-04: a sensor binding names a component the registry does not know, or one without `mechanics.sensor` for its `query`; `args.reason` is `unknown-component` or `not-a-sensor`; PROPOSAL, not a ROBOTICS 4.5 code), and the warnings `RB-W-TUNNEL`, `RB-W-INERTIA-BOX`, `RB-W-ASPECT`, `RB-W-MASSRATIO`, `RB-W-CG`; and scene limit errors `RB-E-LIMIT` (64 dynamic bodies, 128 colliders, 32 joints, 64 sensors, 256 static boxes; HYPOTHESIS limits, RA-07 measures where stability ends).
- Success metric: every code from ROBOTICS 4.5 has a constructed document that raises it and a healthy document that does not; RA-25: a 5 mm wall and a robot at 2 m/s raises `RB-W-TUNNEL`.

**Implementation.**
- Existing files: `src/sim/mech/scene.ts`, `coupling.ts` (read), `src/project/apply/domain-robotics.ts` (read), `ROBOTICS_ARCHITECTURE.md` 4.5 (rule table, binding).
- New files: `src/sim/mech/validate.ts`, `src/sim/mech/limits.ts`. Tests: `validate.test.ts`.
- Modules and signatures:
```ts
// RobotProblem { code; severity; path; messageKey; args } is declared in src/core/robot-report.ts (T-B16-00)
export interface ValidateDeps extends SceneDeps { vMaxMps?: number }
export function validateRobot(doc: Project, deps: ValidateDeps): RobotProblem[];       // sorted by (severity, code, path)
// limits.ts
export const ROBOT_LIMITS = { dynamicBodies: 64, colliders: 128, joints: 32, sensors: 64, statics: 256 } as const;   // HYPOTHESIS, RA-07
export function tunnelBound(vMaxMps: number, stepHz: number): number;      // distance per step; warns if > 0.5 * min(t, t_w)
```
- Rules: `RB-W-ASPECT` longest over shortest dimension above 50; `RB-W-MASSRATIO` mass ratio across a joint above 100 (HYPOTHESIS threshold); `RB-W-CG` centre of mass above the support polygon centroid by more than the polygon half-width; `RB-W-TUNNEL` per ROBOTICS 4.4 rule 7 (`v_max / f > 0.5 * min(t, t_w)`; example: 10 mm wall at 240 Hz tolerates 1.2 m/s). Message keys are in the `robot` namespace (T-B16-30); `args` carry numbers.
- Validation and edge cases: `vMaxMps` absent means tunnel check is skipped and reported as `skipped`; a robot with no motors has no `v_max`.
- Permissions, migration: none. Performance: under 3 ms for 64 bodies.

**Verification.**
- Unit tests `validate.test.ts`: one constructed document per code; healthy example clean; limit boundaries (64 passes, 65 errors); RA-25 numbers; sorted order stable; message keys all exist in `en/robot.json` (reads the file); both `RB-E-SENSOR` reasons from a binding to an unknown component and to a part without `mechanics.sensor`.
- Integration: the three templates validate clean (their own tests call this).
- Playwright: none. Fixtures: constructed documents.
- Acceptance. Given a 2 mm collider, When validated, Then `RB-E-THIN` with the body path. Given 65 dynamic bodies, Then `RB-E-LIMIT` names 65 and 64.
- Observability: problems feed the Problems pane via T-B16-33.
- Release blockers: a code in ROBOTICS 4.5 without a test.

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `V src/sim/mech/validate.test.ts`; `PORTABLE`.
- Documentation: rule table in `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: `validateRobot` (T-B16-12, 18, 27, 28, 33).

---

### T-B16-18. Robot builder: recipes and panel

**Identity.** T-B16-18; subsystem: Studio robot builder (`src/studio/tools`, `src/components/studio/robot`); B16, G5; must; depends on T-B16-00, T-B16-04, T-B16-05, T-B16-17, T-B16-26, T-B16-30; not started.

**Intent.**
- Problem: PRD R-164: place chassis, motors, wheels and sensors in 2D mechanical placement and have joints and masses derive from part properties. The path must work by keyboard (list-based), as in the Studio.
- Target user: Amar building a robot.
- User story: As Amar, I want to add a chassis and two wheels by choosing parts from a list, set the wheel spacing in the unit I like, and see the robot appear in the top-down view.
- Expected behaviour: a Robot panel with a part list (chassis, wheel pair, caster, gearmotor, driver, battery, line array, ranger). Each choice runs a recipe that returns an `Op[]`, applied as one undoable batch through `ProjectSession`. Properties (mass, dimensions, wheel diameter, track width, sensor height and offset) are edited in a form with a unit picker (mm, cm, in; kg, g, oz); changes are `mech.set` and `domain.patch` ops. The panel shows the current `RB` problems and a lab-guidance panel for motors and batteries (ROBOTICS 18; wording is lab guidance, not certification).
- Success metric: a keyboard-only user adds a drive base and a line sensor in under 40 key presses (FA-12 style); joints and masses come from descriptors; zero `RB-E` problems on the result.

**Implementation.**
- Existing files: `src/studio/commands.ts`, `src/studio/stores/doc.ts`, `session.ts` (T-B4-02), `src/studio/tools/keyboard.ts` (T-B4-19: reuse the list-based pattern), `src/components/studio/Inspector.tsx` (T-B4-08, read), `schemas/examples/robot-line-follower.project.json` (the geometry conventions: wheel frames at y = +-70 mm, `rpy_deg [-90,0,0]`, axis `[0,0,1]`, caster at x = -95 mm).
- New files: `src/studio/tools/robot.ts`, `src/components/studio/robot/RobotBuilder.tsx`. Tests: `robot.test.ts`, `RobotBuilder.test.tsx`.
- Modules and signatures:
```ts
export type RobotPart = 'chassis' | 'wheel-pair' | 'caster' | 'gearmotor' | 'driver' | 'battery' | 'line-array' | 'ranger';
export interface RecipeCtx { doc: Project; newId(prefix: 'frm' | 'bdy' | 'jnt' | 'mnt' | 'cmp'): string; describe(id: string): ComponentDescriptor | undefined }
export function recipe(part: RobotPart, choice: { descriptor: string; params?: Record<string, number> }, ctx: RecipeCtx): Result<Op[], { code: 'no-chassis' | 'no-descriptor' | 'occupied'; message: string }>;
export function setProp(ctx: RecipeCtx, target: { kind: 'body' | 'joint' | 'wheel' | 'sensor'; id: string }, prop: string, valueSi: number): Op[];
export function RobotBuilder(props: { session: ProjectSession; describe: RecipeCtx['describe']; problems: RobotProblem[]; unit: UnitPrefs }): JSX.Element;
// RobotProblem is imported from '@/core/robot-report' (T-B16-00); the builder imports nothing from src/sim.
```
- Algorithm: `wheel-pair` emits frames, two bodies (mass from descriptor `mechanics.wheel.mass_g`), two `wheel` joints with `drive.component` pointing at the motor and `domain.patch` with `wheels` and `bodies` entries (friction from `mechanics.wheel.mu`, `crr`); `line-array` emits a mount with a pose; every recipe is applied by `session.apply(ops, author)` as one batch. Ids come from `newId` so tests are deterministic. The descriptor ids the recipes use are B11's `core.tt-motor`, `core.tb6612fng-module`, `core.lipo-2s`, `core.qtr-8rc`, `core.hc-sr04` and T-B16-26's new `core.wheel-65`, `core.caster-ball`, `core.chassis-2wd`, `core.tt-motor-encoder`.
- Validation and error conditions: `no-chassis` when a wheel pair is added first; `occupied` when a mount position is taken; unit parsing rejects NaN.
- Edge cases: undo restores the document exactly; two buddies adding parts at once get distinct ids (the id source is the session's).
- Permissions: editor role. Performance: recipe under 2 ms.
- Migration: none.

**Verification.**
- Unit tests: `robot.test.ts`: each recipe yields ops that apply and validate (zero `RB-E`); wheel pair mass equals descriptor; `setProp` converts oz to kg; undo is exact. `RobotBuilder.test.tsx` (jsdom): list navigation by keyboard adds a drive base; the unit picker changes displayed values but not stored SI; problems list shows a constructed `RB-E-THIN`.
- Integration: applies recipes through a real `ProjectSession` (T-B2-10).
- Playwright: T-B16-15 scenario 1; axe there.
- Fixtures: example project.
- Acceptance. Given an empty robot project, When I choose chassis, wheel pair and line array by keyboard, Then the document validates with no errors and the top-down view shows them.
- Observability: none.
- Release blockers: a recipe that writes outside `mech.set` and `domain.patch`/`component.add`.

**Delivery.**
- Done when tests pass and `ARCH` passes.
- Verify: `TL`; `V src/studio src/components/studio`; `ARCH`.
- Documentation: `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: `recipe` (T-B16-15, T-B16-39).

---

### T-B16-19. Motor driver and servo models

**Identity.** T-B16-19; subsystem: actuators (`src/sim/mech`); B16, G2; must (driver), could (servo); depends on T-B16-00, T-B16-06 (`Drive` and `Decay` come from `motor.ts`); not started.

**Intent.**
- Problem: PWM and direction pins on a bridge module become a terminal voltage, a decay mode and a current limit. The existing code has a guess (the L298N bridge is a 3 ohm, 0.6 A guess, COMPONENT_SCHEMA 5). A servo turns a pulse into an angle with a rate and a torque limit.
- Target user: the line follower (TB6612) and, in B17, the obstacle avoider (servo scan).
- User story: As Amar, I want the driver to refuse more current than it can give and to brake or coast the way its module does.
- Expected behaviour: `driver.ts` maps pin states to a `Drive` for the motor: truth tables for the TB6612FNG (IN1, IN2, PWM, STBY) and L298N (EN, IN1, IN2), `vdrop_v`, decay mode from the descriptor, `i_max_a` as a limit; reaching it is the trigger of the registry cause `driver-undersized` (SIMULATION 13.4 row at line 1468; `failure:driver-overcurrent` is not a registry id). `servo.ts` is the hobby servo of ROBOTICS 7.5: target angle from pulse width, deadband, rate limit, saturated proportional torque law, current from torque.
- Success metric: truth-table tests for each driver reproduce the datasheet tables stated in `docs/facts/tb6612.md` and `docs/facts/l298n.md`; a servo step from 0 to 60 degrees takes `speed_s_per_60deg` within 2 percent on a free horn.

**Implementation.**
- Existing files: `src/content/robotics/tb6612fng.ts:1-457` and `l298n.ts:1-325` (the benches already encode truth tables and current limits; read and do not duplicate their text), `docs/facts/tb6612.md`, `docs/facts/l298n.md`, `figures/engine/bench-solve.js:111,318-328` (servo rule today).
- New files: `src/sim/mech/driver.ts`, `src/sim/mech/servo.ts`. Tests: `driver.test.ts`, `servo.test.ts`.
- Modules and signatures:
```ts
import type { Decay, Drive } from './motor';   // T-B16-06
export interface DriverParams { kind: 'h-bridge'; decay: Decay; vdropV: number; iMaxA: number; pwmMaxHz: number; truth: 'tb6612' | 'l298n' }
export interface PinSample { in1: 0 | 1; in2: 0 | 1; pwm: { duty: number; hz: number } | { level: 0 | 1 }; stby?: 0 | 1 }
export function driverDrive(p: DriverParams, pins: PinSample, vSupplyV: number): { drive: Drive; state: 'run' | 'brake' | 'coast' | 'standby'; direction: -1 | 0 | 1 };
export function overCurrent(p: DriverParams, iA: number): boolean;
// servo.ts
export interface ServoParams { stallTorqueNm: number; speedSPer60deg: number; pulseMinUs: number; pulseMaxUs: number; angleRangeDeg: number; deadbandUs: number; iStallA: number; iIdleA: number }
export interface ServoState { angleDeg: number; lastPulseUs: number }
export function stepServo(p: ServoParams, s: ServoState, pulseUs: number, loadNm: number, hS: number): { state: ServoState; torqueNm: number; currentA: number };
```
- Data model: `mechanics.driver` and `mechanics.servo`. `truth` is selected by a descriptor `id` map inside `driver.ts` (the schema's `driver.kind` has no truth-table field: the table is chosen by the part's registry id, `core.tb6612fng-module` or `core.l298n-module` (the B11 ids, T-B11-03a), and an unknown id gives `RB-E-DRIVE`).
- Algorithm: servo `phi* = clamp((pulse - pmin)/(pmax - pmin)) * range`; pulses inside `deadband_us` of the held command are ignored; rate limit `omega_max = 60 deg / speed`; torque `clamp(kp (phi* - phi), -stall, stall)` with default `kp = stall / 10 deg` (iynk assumption, shown); current `i_idle + (i_stall - i_idle) * |tau| / stall`.
- Validation and edge cases: both inputs high on TB6612 is short brake; STBY low is standby with zero current; `pwm` above `pwmMaxHz` is flagged `approximation`. A pulse outside `[pmin - 100, pmax + 100]` holds the last command.
- Permissions, migration: none. Performance: trivial.

**Verification.**
- Unit tests: `driver.test.ts`: full truth tables for both modules; `vdrop`; standby; `overCurrent` threshold. `servo.test.ts`: step response time, deadband, torque saturation, current formula, hold on out-of-range pulse.
- Integration: coupling (T-B16-07) uses `driverDrive`.
- Playwright: none. Fixtures: none.
- Acceptance. Given IN1 high, IN2 low, PWM 50 percent at 490 Hz on a TB6612, When `driverDrive` runs, Then direction +1, state `run`, duty 0.5. Given IN1 and IN2 both high, Then state `brake`.
- Observability: `state` is shown in the pin view.
- Release blockers: a truth table that disagrees with the fact sheet.

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `V src/sim/mech/driver.test.ts src/sim/mech/servo.test.ts`; `PORTABLE`.
- Documentation: `docs/ROBOTICS.md`.
- Rollback: revert (servo can be reverted alone).
- Later tasks need: `driverDrive`, `overCurrent` (T-B16-07, 11, 22, 25).

---

### T-B16-20. Battery curves to `core`, and the pack model

**Identity.** T-B16-20; subsystem: power (`src/core`, `src/lib/flight`, `src/sim/mech`); B16, G0; must; depends on nothing in B16; status: not started.

**Intent.**
- Problem: ROBOTICS 7.6 says the robot reuses the drone battery code, not a copy. The `sim` layer cannot import `src/lib` (SYSTEM 5.3). The pack needs voltage sag from internal resistance, and runtime from capacity.
- Target user: the line follower's 2S LiPo; later the drone phase.
- User story: As Amar, I want a weak or empty pack to sag the way it does in life, so brown-outs happen at start and not in the middle of a straight.
- Expected behaviour: the OCV tables, limits and `cellResistance` move to `src/core/battery.ts` (pure); `src/lib/flight/battery.ts` imports and re-exports them, so every flight import and test is unchanged. `src/sim/mech/pack.ts` holds a pack: cells in series and parallel, state of charge, `terminalVoltage(i)`, `step(iA, hS)`, and an `ocv_table` override from the descriptor. Chemistries `lipo`, `lihv`, `liion`; any other chemistry requires `ocv_table` in the descriptor or the pack refuses with `no-ocv`.
- Success metric: all `src/lib/flight` tests pass unchanged; a 2S 1000 mAh LiPo at full charge reads 8.4 V open circuit (4.2 V per cell from the table) and sags by `i * R` under load.

**Implementation.**
- Existing files: `src/lib/flight/battery.ts:4` (`OCV`), `:11` (`LIMITS`), `:18` (`IR_AH`), `:20` (`NOMINAL_CELL`), `:22` (`ocv`), `:29` (`cellResistance`) (E: replace the bodies by imports and re-exports; keep `BatteryState`, `freshBattery`, `currentFor`, `IDLE_AMPS` which depend on flight types). Tests that must stay green: `src/lib/flight/*.test.ts` (3 files, VERIFIED).
- New files: `src/core/battery.ts`, `src/sim/mech/pack.ts`. Tests: `src/core/battery.test.ts`, `src/sim/mech/pack.test.ts`.
- Modules and signatures:
```ts
// core/battery.ts
export type CellChemistry = 'lipo' | 'lihv' | 'liion';
export const OCV: Record<CellChemistry, number[]>; export const LIMITS: Record<CellChemistry, { low: number; cut: number }>;
export const NOMINAL_CELL: number;
export function ocvAt(table: readonly number[], soc: number): number;       // evenly spaced, full to empty or empty to full as documented
export function ocv(chem: CellChemistry, soc: number): number;
export function cellResistance(chem: CellChemistry, mah: number): number;
// pack.ts
export interface PackParams { cells: number; parallel: number; capacityMah: number; rCellOhm: number; chemistry?: CellChemistry; ocvTable?: number[] }
export interface Pack { terminalV(iA: number): number; step(iA: number, hS: number): void; soc(): number; openCircuitV(): number }
export function createPack(p: PackParams, soc0?: number): Result<Pack, { code: 'no-ocv' | 'bad-cells'; message: string }>;
```
- Data model: `mechanics.battery {cells, parallel, capacity_mah, c_continuous, c_burst, r_cell_ohm, chemistry, ocv_table, mass_g, source}`. The existing table is ascending in state of charge (index 0 is empty, `battery.ts:4`); the descriptor's `ocv_table` is "from full to empty" (schema). `ocvAt` documents the order and `createPack` reverses a descriptor table.
- Algorithm: `V_term = N_series * ocv(soc) - i * N_series * R_cell / N_parallel`; `soc -= i * h / (3600 * capacity_Ah * N_parallel)` with `soc` clamped at 0. No thermal model (listed "not modelled yet").
- Validation and error conditions: `cells < 1` is `bad-cells`; non-monotonic `ocv_table` is rejected.
- Edge cases: negative current (regeneration into the pack) charges up to soc 1; table of length 2 is linear.
- Permissions, performance: none; trivial. Migration: none (re-export keeps the API).

**Verification.**
- Unit tests: `core/battery.test.ts`: interpolation at 0, 0.05, 1; values equal the old module's for all three chemistries (import both and compare 101 points); `pack.test.ts`: sag arithmetic, soc after 1 h at 1 C, descriptor table order, `no-ocv`.
- Integration: `V src/lib/flight` unchanged and green.
- Playwright: none. Fixtures: none.
- Acceptance. Given a 2S 1000 mAh LiPo with 0.0066 ohm-Ah per cell, When 5 A is drawn, Then terminal voltage equals open-circuit minus `5 * 2 * R_cell`. Given the flight tests, Then they pass untouched.
- Observability: none.
- Release blockers: any change in a flight test result.

**Delivery.**
- Done when tests pass and `PORTABLE` passes for `core` and `pack.ts`.
- Verify: `TL`; `V src/core src/sim/mech/pack.test.ts src/lib/flight`; `PORTABLE`; `ARCH`.
- Documentation: `docs/ROBOTICS.md` lists chemistries and the AA gap.
- Rollback: revert; flight returns to its own copy.
- Later tasks need: `createPack` (T-B16-07, 11, 22).

---

### T-B16-21. Spike: motor current feedback into a sagging pack

**Identity.** T-B16-21; subsystem: research (`08_RESEARCH_SPIKES`); B16, G0; must (T-B16-07 waits on it); not started.

**Intent.**
- Question (falsifiable): For the reference motor (R 2.5 ohm, L 1.2 mH, ke = kt = 0.012, from `DP-01 motor.mjs`) on a 2S LiPo model (open circuit 8.4 V, 0.2 ohm series including wiring) that also feeds a logic regulator load of 50 mA, at duty 0.25, 0.5, 0.75 and 1.0 at 490 Hz in coast and slow-decay modes, does feeding the motor's cycle-average current to the solver once per 1/240 s step as an ideal current sink of the previous step's value (lag one step) keep (a) shaft speed within 1 percent of a simultaneous reference at 5 microsecond steps, (b) the minimum pack voltage within 2 percent of the reference minimum, and (c) the time of first crossing below 4.5 V on the regulated rail within one mechanical step of the reference?
- Why a spike: DP-01 proved the closed form on a fixed supply only. SIMULATION 5.6 allows one step of lag. Nothing measured says the lag keeps a sagging pack right, and `battery-sag-reset` is a headline fault of the line follower.
- Exit condition: PASS if (a), (b) and (c) hold in all eight cases. Then T-B16-07 implements form `sink`. FAIL if any case fails: then the report says which, and T-B16-07 implements form `emf` (motor as series R plus back-EMF source in the solver, the PWM slices weighted by duty as `pwmSlices` in the solver input) and keeps the closed form only for torque. In both outcomes the report gives the numbers.
- Method: scripts outside `src/`: `RS-B16-motor-in-circuit/src/ref.mjs` (5 microsecond coupled integrator of motor, pack and regulator load), `lag.mjs` (the one-step-lag form), `thev.mjs` (the Thevenin form). Run on Node 24.x. Report the machine, runs, raw output in `results/`.
- Labels: the report labels its result VERIFIED as a prototype, author-run; an independent check is optional and noted.

**Implementation.**
- Existing files: `08_RESEARCH_SPIKES/DP-01-robot-prototypes/src/motor2.mjs` (closed form), `README.md` (how it was run).
- New files: `08_RESEARCH_SPIKES/RS-B16-motor-in-circuit/{REPORT.md,README.md,src/ref.mjs,src/lag.mjs,src/thev.mjs,results/*.txt}`. No `src/` file.
- Algorithm, edge cases, permissions: as in the question. No network. The scripts do not import repo code (they are throwaway).
- Performance: a run takes under 1 minute.
- Migration: none.

**Verification.**
- Tests: none; the report is the product.
- Acceptance. Given the eight cases, When the three scripts run, Then the report has a table of (case, speed error, minimum voltage error, rail crossing time error) for each form and a PASS or FAIL line per form.
- Release blockers: a verdict without numbers.

**Delivery.**
- Done when `REPORT.md` states the verdict and the numbers, and names the form T-B16-07 builds.
- Verify: `node 08_RESEARCH_SPIKES/RS-B16-motor-in-circuit/src/lag.mjs` prints the table; `TL` unaffected.
- Documentation: the report is the doc; `docs/ROBOTICS.md` links it.
- Rollback: revert.
- Later tasks need: the verdict (T-B16-07).

---

### T-B16-22. The mechanical engine: look-ahead step, buffers, facts

**Identity.** T-B16-22; subsystem: physics engine in the orchestrator (`src/sim/mech`); B16, G4; must; depends on T-B16-03, T-B16-07, T-B16-08, T-B16-10 (four-wheel fixture), T-B16-19, T-B16-23; not started.

**Intent.**
- Problem: the physics world must step on the orchestrator's integer-nanosecond clock without the clock ever going backwards, with encoder edges delivered at their own virtual times, and with a hash that does not depend on the engine's look-ahead state (ROBOTICS 9.2).
- Target user: the run path; Amar's code sees encoder interrupts and line readings at the right times.
- User story: As Amar, I want my interrupt to see each wheel pulse when it happened, and my line sensor to read where the robot was.
- Expected behaviour: `createMechEngine(...)` returns an `Engine` of rank 50. `advance(to)` runs whole mechanical steps (1/240 s = `clockRate(25_000_000, 6)`) while the next step time is below `to`. At each step start `t`: (1) read torque inputs as they stand at `t` (motor channels, T-B16-07) and apply them with `applyJointTorqueImpulse`; (2) advance the world; (3) compute encoder edges whose angle was crossed and `emit` each as a P4 `SimEvent` at its interpolated time in `(t, t+h]`; (4) keep `prev` (state of `t`) and `next` (state of `t+h`) buffers. Sensors and instruments read `prev` until `t+h`. `hash(h)` feeds `hash2` of `prev` and the step index. A 10 Hz facts sampler fills `RobotFacts`.
- Success metric: RA-09 (with T-B16-23): over 10 s at constant speed the edge count equals `floor(counts * angle / 2pi)` exactly, edge times never decrease, and `event-in-past` never appears; ten runs give equal checkpoint hashes.

**Implementation.**
- Existing files: `src/sim/engine.ts`, `src/sim/orchestrator.ts` (T-B3-11; read the `Engine` interface at B3 file line 577 and the queue assertion `at >= now`), `src/sim/mech/*` (this phase), `src/lib/interp/arduino/libs.ts:1231,1275-1290` (the QTR library reads analog volts on its sensor pins, 0 V white and logic volts black), `src/lib/interp/devices.ts:261` (`HcSr04.distanceCm` is the ranger knob).
- New files: `src/sim/mech/engine.ts`, `src/sim/mech/buffers.ts`, `src/sim/mech/facts.ts`. Tests: `engine.test.ts`, `buffers.test.ts`, `facts.test.ts`.
- Modules and signatures:
```ts
export interface MechIo {
  pins(part: string): PinSample;                       // driver input pins as the digital layer resolved them at this time
  supplyV(part: string): number;                       // motor supply volts from the last solve (0 if unknown)
  setAnalog(part: string, pin: string, volts: number, at: SimTime): void;   // line sensor channels (P4)
  setParam(part: string, key: 'distanceCm', value: number, at: SimTime): void;   // ranger knob
  driveEdge(part: string, pin: string, level: 0 | 1, at: SimTime): void;    // encoder channels
}
export interface MechEngineArgs { backend: PhysicsBackend; scene: SceneSpec; channels: MotorChannel[]; encoders: EncoderBank[]; sensors: ReturnType<typeof createSensor>[]; io: MechIo; stepHz: number; id?: string }
export function createMechEngine(a: MechEngineArgs): Engine & { frame(): MechFrame; facts(): RobotFacts; stepIndex(): number };
export type MechFrame = PhysicsFrame;   // PhysicsFrame is declared in src/core/robot-report.ts (T-B16-00)
// buffers.ts
export interface Snapshot { atNs: SimTime; bodies: Map<string, BodyState>; joints: Map<string, JointState> }
export function createBuffers(): { prev: Snapshot; next: Snapshot; swap(): void; readAt(atNs: SimTime): Snapshot };   // readAt: prev if atNs < next.atNs
// facts.ts
export interface RobotSample { atNs: SimTime; joint: string; speedRadS: number; angleRad: number; cmdSign: -1 | 0 | 1; armatureA: number; torqueNm: number; surfaceSpeedMps: number; groundSpeedMps: number; encoderCount?: number; tiltDeg: number; driverState: string }
export interface ResetFact { atNs: SimTime; packV: number; regV: number; railV: number; motorStartNs: number | null }   // built by T-B16-40 from RunFacts.resets
export interface RobotFacts { samples: RobotSample[]; loopPeriods?: LoopStats; sensorHeights: Record<string, number>; supply: { atNs: SimTime; v: number }[]; resets: ResetFact[]; decimated: boolean }
export function createFactsSampler(maxSamples?: number): { push(s: RobotSample): void; facts(): RobotFacts };
```
- Data model: replay record `physics` block from T-B16-32; no document fields written.
- Algorithm: step time of step `k` is `cyclesToNs(k, clockRate(25_000_000, 6))` (floor, B3 file line 362). `nextDue()` returns that time. Encoder edge `k` of a channel set: angle `theta_k = k * 2 pi / counts`; time `tau = t + h (theta_k - theta_a)/(theta_b - theta_a)`, rounded to integer ns and clamped into `(t, t+h]`; an edge exactly at `t+h` belongs to this step; edges of one step are emitted in occurrence order (descending angle in reverse), ties keep order through `seq`. Line sensor values go out as `setAnalog` volts `vLogic * (1 - reflectance)` at the sensor `period_ns`; ranger distance as `setParam`. The facts sampler decimates by dropping every second sample once `maxSamples` (default 20,000) is reached and sets `decimated`. `resets` starts empty: the engine never sees an MCU reset, so T-B16-40 fills it by joining `RunFacts.resets` (B10, `SimTime[]`) with `supply` by timestamp.
- State transitions: `created -> running -> halted(code) -> freed`. `halted` is entered on `NumericFault` (any NaN or infinity in a body state: names the body and writes the last `prev` snapshot into the report, ROBOTICS 18) or `PhysicsDiverged` (speed above 100 m/s or position beyond 10 km). A halt is thrown as the orchestrator's `HaltError` (Step 0 reads B3's halt type; adapter in `ports.ts`).
- Validation and error conditions: a scene whose `step_hz` differs from the record's is a load error; a channel naming a joint missing in the scene is `BadScene`.
- Edge cases: `to` less than the next step time returns without stepping; `advance` after `halted` is a no-op; a wheel that crosses no edge enqueues nothing; reverse rotation flips quadrature order.
- Permissions: none. Performance: the engine adds under 20 percent to the backend step time at 20 bodies (ESTIMATED); frames are copied only when `frame()` is called (at most 30 per simulated second).
- Migration: none.

**Verification.**
- Unit tests: `engine.test.ts` with a fake backend and fake orchestrator context: step times match the rational clock for 10,000 steps (no drift beyond 1 ns); no emitted event has `at <= now`; torque set between steps acts on the next step (lag 0 to `h`); halts on injected NaN with the body id; hash is the same before and after a `frame()` call. `buffers.test.ts`: `readAt` returns `prev` for `atNs` in `[t, t+h)` and `next` at `t+h`; RA-09 sub-case "a joint-angle sensor read at 16 evenly spread times inside one step returns the state of `t`". `facts.test.ts`: decimation keeps the first and last samples.
- Integration: with the real backend, the four-wheel fixture (T-B16-10) for 2 simulated seconds; ten runs equal hashes.
- Playwright: T-B16-15.
- Fixtures: four-wheel fixture.
- Acceptance. Given a wheel at constant speed for 10 s, When the engine runs, Then the encoder edge count equals the closed-form count and no event is in the past. Given two runs of the same scene and inputs, Then every 1,000 ms checkpoint hash is equal.
- Observability: `stepIndex()` and the halt code appear in the run status.
- Release blockers: any `event-in-past`.

**Delivery.**
- Done when tests pass; `PORTABLE`, `ARCH` pass.
- Verify: `TL`; `V src/sim/mech`; `PORTABLE`; `ARCH`.
- Documentation: the timing table of ROBOTICS 9.2 into `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: `createMechEngine`, `RobotFacts`, `MechFrame` (T-B16-13, 25, 32, 33, 34, 40).

---

### T-B16-23. Quadrature encoder edges

**Identity.** T-B16-23; subsystem: sensors (`src/sim/mech`); B16, G3; must; depends on T-B16-02, T-B16-06; not started.

**Intent.**
- Problem: speed control needs encoder counts, and the interrupt code must see them at the right virtual times. Edges are timed by interpolation inside a physics step.
- Target user: template 2 (speed control); `encoder-channel-swapped` detector.
- User story: As Amar, I want my wheel-speed estimate to come from counted pulses whose timing is right.
- Expected behaviour: `encoder.ts` turns a joint angle at two times into edges with exact counts, interpolated times and quadrature levels. It also gives the exact count at any time `at`.
- Success metric: RA-09 count and ordering rules in isolation; interpolation error under 5 percent of the edge spacing against a reference run of the same motion at step `h/16`.

**Implementation.**
- Existing files: none (pure). Read `ROBOTICS_ARCHITECTURE.md` 9.2 (look-ahead paragraph, binding) and `mechanics.encoder {counts_per_rev, channels, index}` in `component.schema.json`.
- New files: `src/sim/mech/encoder.ts`. Tests: `encoder.test.ts`.
- Modules and signatures:
```ts
export interface EncoderSpec { countsPerRev: number; channels: 'a' | 'ab'; index: boolean; onMotorShaft: boolean; gearRatio: number }
export interface Edge { atNs: SimTime; channel: 'a' | 'b' | 'index'; level: 0 | 1; dir: 1 | -1; count: number }
export interface EncoderState { lastIndex: number; a: 0 | 1; b: 0 | 1; count: number }
export function createEncoder(spec: EncoderSpec): { state(): EncoderState; edgesInStep(thetaA: number, thetaB: number, tNs: SimTime, hNs: number): Edge[]; countAt(atNs: SimTime): number; swapChannels(on: boolean): void };
```
- Data model: `counts_per_rev` is the number of edges per revolution of the whole channel set (ROBOTICS 9.2: `theta_k = k * 2 pi / counts`). In `ab` mode the edges rotate through A rise, B rise, A fall, B fall forward and the reverse order backward. When the encoder sits on the motor shaft the angle used is `angle_out * gearRatio`.
- Algorithm: integer edge indices `ka = floor(thetaA * N / 2pi)` and `kb = floor(thetaB * N / 2pi)`; edges are `ka+1 .. kb` forward or `ka .. kb+1` descending in reverse (careful with exact multiples: an edge exactly at `t+h` is in this step; at `t` it was in the last). No trig: only multiplication, division and `Math.floor` (exact). Time `tau_k = tNs + hNs * (theta_k - thetaA)/(thetaB - thetaA)` rounded to integer ns and clamped into `(tNs, tNs+hNs]`. `countAt` counts edges with time at or before `atNs` from a ring of the last 4,096 edges and the cumulative counter. `swapChannels` is the `encoder-channel-swapped` fault hook (A and B exchanged).
- Validation and error conditions: `countsPerRev` not a positive integer throws; `thetaA === thetaB` returns `[]`.
- Edge cases: a step that spans two index crossings; angle going backwards then forwards inside one step is not possible (one interpolation per step; documented limit: speed reversal inside one step is seen at the next step); very large angles (float64 integer range) keep exactness up to 2^53 edges.
- Permissions, migration: none. Performance: O(edges) per step; 1,600 edges per second for 1,000 counts at 10 rad/s (ROBOTICS 9.2) is within the queue budget (RS-03: 780 to 980 pin events per second per PWM pin, DOCUMENTED).

**Verification.**
- Unit tests: `encoder.test.ts`: constant speed for 10 s, count equals `floor(N * angle / 2pi)`; times non-decreasing and inside each step; reverse order; edge exactly on a step boundary counted once; index once per revolution; accelerating motion compared with a `h/16` reference within 5 percent of the edge spacing; `swapChannels` exchanges A and B; `countAt` exact at any time.
- Integration: T-B16-22.
- Playwright: none. Fixtures: none.
- Acceptance. Given 10 rad/s for 10 s with 1,000 counts per revolution, When edges are generated per 1/240 s step, Then the total is 15,915 or 15,916 as the closed form says, and no two edges share a step boundary twice.
- Observability: none.
- Release blockers: a floating rounding case that loses or duplicates an edge.

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `V src/sim/mech/encoder.test.ts`; `PORTABLE`.
- Documentation: `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: `createEncoder` (T-B16-22, 28).

---

### T-B16-24. Robot cause rows, symptom ids and hint texts keys

**Identity.** T-B16-24; subsystem: faults registry (`src/sim/faults`); B16, G0; must; depends on B10; not started.

**Intent.**
- Problem: B10 lists the 12 robot cause ids as `modelled: false` with pending symptom ids. B16 names the symptoms, marks the ids it models, and adds the hint-ladder text keys.
- Target user: the detectors, templates, Diagnose panel.
- User story: As Amar, I want a robot problem to read "robot turns the wrong way" and carry a three-step hint, not a raw cause id.
- Expected behaviour: `symptoms.ts` gains the robot symptom ids; `causes.ts` marks 11 ids `modelled: true` (`motor-stall`, `motor-direction-reversed`, `encoder-channel-swapped`, `wheel-slip`, `driver-undersized`, `battery-sag-reset`, `sensor-too-high`, `sensor-saturated`, `ranger-beam-blocked`, `tip-over`, `loop-too-slow`), leaves `servo-jitter-supply` and `stepper-lost-steps` `modelled: false`, sets `symptomIds` and `confusableWith` for them, and adds `textNs: 'robot'` for the hint lookup.
- Success metric: the B10 registry tests pass with the new counts; every symptom id used by the three templates and the example project resolves.

**Implementation.**
- Existing files: `src/sim/faults/causes.ts` (T-B10-16: `CauseMeta`, `CAUSES`), `src/sim/faults/symptoms.ts` (`SYMPTOM_IDS`), `src/sim/faults/hints.ts` (T-B10-08: E only if its lookup does not already accept a namespace; Step 0).
- New files: none. Tests: `causes.test.ts` (E: expected counts), `robot-symptoms.test.ts` (new).
- Modules and signatures: `CauseMeta` gains `textNs?: 'faults' | 'robot'` (default `'faults'`); `export const ROBOT_SYMPTOMS: readonly string[]`.
- Data model: new symptom ids (kebab, `^[a-z][a-z0-9-]*$`): `robot-wont-move`, `robot-turns-wrong-way`, `robot-resets-at-start`, `line-not-detected`, `wheel-spins-no-motion`, `encoder-count-wrong`, `speed-oscillates`, `robot-tips-over`, `ranger-always-near`. The first, second, third and fourth already appear in `schemas/examples/robot-line-follower.project.json` (VERIFIED). Mapping (PROPOSAL, Amar may rename):

| Cause | Symptoms | Confusable with |
|---|---|---|
| `motor-stall` | `robot-wont-move` | `driver-undersized`, `wheel-slip` |
| `motor-direction-reversed` | `robot-turns-wrong-way` | `encoder-channel-swapped` |
| `encoder-channel-swapped` | `encoder-count-wrong` | `motor-direction-reversed` |
| `wheel-slip` | `wheel-spins-no-motion` | `motor-stall` |
| `driver-undersized` | `robot-wont-move`, `mcu-resets` | `motor-stall`, `battery-sag-reset` |
| `battery-sag-reset` | `robot-resets-at-start`, `mcu-resets` | `driver-undersized`, `brownout` |
| `sensor-too-high` | `line-not-detected` | `sensor-saturated` |
| `sensor-saturated` | `line-not-detected` | `sensor-too-high` |
| `ranger-beam-blocked` | `ranger-always-near` | none |
| `tip-over` | `robot-tips-over` | none |
| `loop-too-slow` | `speed-oscillates` | none |

- Algorithm: edits are data. The "confusable" relation is made symmetric by B10's function, not by hand.
- Validation: the registry build rejects an id not in `CAUSE_IDS`; symptom ids match the pattern.
- Edge cases: `mcu-resets` already exists in the 14 electrical symptoms (B10 file line 457 list), so it is reused.
- Permissions, performance, migration: none.

**Verification.**
- Unit tests: `causes.test.ts` expected `modelled` count goes from the B10 value to B10 value plus 11; `robot-symptoms.test.ts`: every symptom id in the three templates (read from `content/projects/robots/*.json` once they exist; until then the example project) is in `SYMPTOM_IDS`; every `confusableWith` resolves.
- Integration: `V src/sim/faults`.
- Playwright: none. Fixtures: example project.
- Acceptance. Given the registry, When `causeMeta('wheel-slip')` is read, Then `modelled` is true and symptoms contain `wheel-spins-no-motion`. Given `stepper-lost-steps`, Then `modelled` is false.
- Observability: none.
- Release blockers: a registry id renamed (RC-43 names stay).

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `V src/sim/faults`; `PORTABLE`.
- Documentation: `docs/FAULTS.md` table regenerated by B10's printer.
- Rollback: revert.
- Later tasks need: the symptom ids (T-B16-12, 13, 25, 27, 28, 30).

---

### T-B16-25. Robot fault detectors II: sensors, power, timing

**Identity.** T-B16-25; subsystem: faults (`src/sim/faults`); B16, G6; must; depends on T-B16-08, T-B16-09, T-B16-11, T-B16-13, T-B16-22, T-B16-24; not started.

**Intent.**
- Problem: the remaining robot causes fire from sensor height, saturation, supply sag, driver current and loop timing.
- Target user: Amar in Diagnose.
- User story: As Amar, when my line sensor sits too high I want the app to say so and show the height against the allowed range.
- Expected behaviour: six rules registered in `allRules()`: `solve:sensor-too-high@1` (line sensor height above `h_opt + h_range`, or contrast under the threshold), `solve:sensor-saturated@1` (ADC or reflectance pinned at an end for the whole run), `solve:ranger-beam-blocked@1` (ranger minimum range hit inside the robot's own body), `solve:driver-undersized@1` (RB-C-04 fails or `driver.i_max_a` reached), `solve:battery-sag-reset@1` (MCU reset within 50 ms of a motor start while pack or logic rail is below minimum; the evidence names which was low and the 20 ms window), `solve:loop-too-slow@1` (loop period p95 over 2 times the target in `ext["x-iynk-robot"].loopPeriodUs`).
- Success metric: RA-13: a line-follower run with the sensor 30 mm too high yields `sensor-too-high` with evidence naming the sensor and its height, and the hint ladder has three levels; no robot finding on the healthy run.

**Implementation.**
- Existing files: `src/sim/faults/rules.ts` (E: add `ROBOT_SENSOR_POWER_RULES` to `allRules()`), `src/sim/faults/robot.ts` (T-B16-13; read for the shared helpers; not edited), `src/sim/mech/facts.ts` (read).
- New files: `src/sim/faults/robot-power.ts`. Tests: `robot-power.test.ts`.
- Modules and signatures:
```ts
export const ROBOT_SENSOR_POWER_RULES: readonly Rule[];
// ResetFact and RobotFacts.resets are declared in src/sim/mech/facts.ts (T-B16-22); this file only reads them
```
  `RobotFacts.resets: ResetFact[]` exists from T-B16-22. If it is empty the rule is skipped with a reason; no file other than `robot-power.ts` and `rules.ts` is edited here.
- Algorithm: each rule scans facts once; thresholds are defaults shown with their labels. `battery-sag-reset` reads `RobotFacts.resets`, which T-B16-40 builds by joining `RunFacts.resets` (B10, `SimTime[]`) with `RobotFacts.supply` by timestamp.
- Validation and edge cases: no motor start recorded gives no finding; a reset not near a motor start is left to `brownout`.
- Permissions, migration: none. Performance: one pass.

**Verification.**
- Unit tests `robot-power.test.ts`: per rule fires and stays silent; boundary of the 50 ms window; loop period p95 versus 2 times target; evidence fields; healthy template facts give nothing. `coverage.test.ts` (T-B10-11) expected table updated by the agent for the six ids.
- Integration: the live-run cases (the line follower with `flt_sensor_high`, `flt_brownout`, `flt_sensor_sat`) are in T-B16-38; T-B16-15 scenario 3 shows the first in the UI.
- Playwright: T-B16-15.
- Fixtures: constructed facts.
- Acceptance. Given the weak-pack fault, When both motors start at full duty, Then `battery-sag-reset` is found with evidence of pack voltage and the reset time.
- Observability: skipped map.
- Release blockers: false alarm on the healthy run.

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `V src/sim/faults`; `PORTABLE`.
- Documentation: `docs/ROBOTICS.md`, `docs/FAULTS.md`.
- Rollback: revert.
- Later tasks need: the rules (T-B16-38, T-B16-40).

---

### T-B16-26. Robot part descriptors and fidelity registry entries

**Identity.** T-B16-26; subsystem: parts and registry data (`src/parts/data`, `src/sim/registry/data`); B16, G1; must; depends on T-B16-00; B8 (T-B8-03); B11 (T-B11-02a barrel generator, T-B11-02c1 `tt-motor`, T-B11-02c2 `lipo-2s`, T-B11-03a `tb6612fng-module` and `l298n-module`, T-B11-03b1 `qtr-8rc` and `hc-sr04`, T-B11-07 version rule); not started.

**Intent.**
- Problem: motor, wheel, battery, driver, encoder and line-array numbers must live in part descriptors (one source, many robots), each with a stated source or the words "iynk assumption", and each robot model needs a registry entry that says what it models and what not (D-007, RA-23). B11 already creates descriptors for the motor, battery, drivers, line array and ranger. A second set under other ids would split one part into two sources.
- Target user: the builder, the checker, the "What it models" panel.
- User story: As Amar, I want to see which numbers are from a datasheet and which are guesses.
- Expected behaviour: (1) `mechanics` blocks are added to six descriptors B11 creates, using B11's real ids: `core.tt-motor` (`mechanics.motor` and `gear`), `core.lipo-2s` (`mechanics.battery`; B11 line 780 leaves cells 2 and 7.4 V nominal there, this task completes and sources the block), `core.tb6612fng-module` and `core.l298n-module` (`mechanics.driver`), `core.qtr-8rc` (`mechanics.sensor`, query `surface-sample`, 8 channels), `core.hc-sr04` (`mechanics.sensor`, query `ray-fan`; the ranger recipe of T-B16-18, T-B16-08 and the cause `ranger-beam-blocked` need it). (2) Only parts B11 lacks are created: `core.wheel-65` (`mechanics.wheel`), `core.caster-ball`, `core.chassis-2wd` (`mass_g`), `core.tt-motor-encoder` (the `tt-motor` numbers plus `mechanics.encoder`). The ids `core.dc-gear-motor`, `core.battery-lipo-2s`, a second `core.qtr-8rc` and `core.tb6612-module` are not created: they do not exist in B11. (3) A registry data file with entries for engine `engine:rapier@0.21.0` (tier T1, approximation of rigid-body contact), models `model:dc-motor-cycle@1`, `model:driver-hbridge@1`, `model:gearbox@1`, `model:pack-ocv-r@1`, `model:line-surface-sample@1`, `model:ranger-rayfan@1`, `model:encoder-quadrature@1`, instruments `pid`, `loop-timing`. Each lists `modelled` and `notModelled` sentences.
- Success metric: every numeric field in every new or edited `mechanics` block has a `source` entry (a `sources[]` reference to a datasheet or fact sheet) or `{src: "assumption"}` (B11's `unsourced` check, B11 line 1060, finds none); the registry test (T-B8-03) accepts the entries: asserted tier never above computed tier.

**Implementation.**
- Existing files (E): `src/parts/data/{tt-motor,lipo-2s,tb6612fng-module,l298n-module,qtr-8rc,hc-sr04}.component.json` (B11 stores `core.<slug>` flat in `src/parts/data/`, B11 line 671; there is no `modules/` subfolder). `mechanics` additions only; no pin, layer or fault changes. Read: `src/sim/registry/entries.ts`, `tiers.ts` (T-B8-03; the entry shape), `schemas/examples/components/dc-gear-motor.component.json` (the placeholder; its `torque_stall_nm: 0.8` disagrees with `kt*V/R*ratio*eta = 0.0036*6/6*48*0.7 = 0.121`: VERIFIED arithmetic; the numbers go into `core.tt-motor` corrected and each one labelled), `docs/facts/qtr8rc.md`, `docs/facts/tb6612.md`, `docs/facts/l298n.md`, `docs/facts/hcsr04.md`, `src/content/robotics/*.ts` (bench motor and driver numbers already sourced there).
- New files: `src/parts/data/{wheel-65,caster-ball,chassis-2wd,tt-motor-encoder}.component.json` (one set, counts 1); `src/sim/registry/data/robot.json` (counts 1); the descriptor barrel is regenerated by B11's generator (T-B11-02a; Step 0 names the command) and the generated file is committed. Counts: edited set 1, new set 1, registry 1, barrel 1 = 4 source files, so one task. Tests: `src/parts/robot-parts.test.ts`.
- Modules: none (data). `robot-parts.test.ts`: for each descriptor validates against `component.schema.json` (`SCHEMA` helper), checks the cross-consistency rule `torque_stall_nm` within 20 percent of the derived value else a failure, and that `mechanics.battery.chemistry` is `lipo`.
- Data model: per ROBOTICS 6.1 and the three-slot rating rule (COMPONENT_SCHEMA 4.6): `stated` (maker), `assumed` (iynk), `measured`. Where a datasheet is not in `docs/facts`, the number goes in the `assumed` slot. Sensor height numbers (`h_opt_mm`, `h_range_mm`) are `SensorBinding.params` defaults documented in the descriptor `description` until a schema minor adds fields (T-B16-08).
- Algorithm: n/a. Process: read each fact sheet, copy only numbers it states, cite it.
- Validation: schema; no number without a source field; chemistry allowed list; wheel `diameter_mm` positive.
- Edge cases: the TB6612 module's decay mode when PWM is on the input pins versus the enable pin is not stated in `docs/facts/tb6612.md` (UNKNOWN until read): the descriptor says `slow` with source "iynk assumption" and the UI says so (RK-4).
- Permissions: none. Performance: none. Migration: B11 descriptors are versioned `1.0.0` (ADR-0205); the six edited descriptors bump to `1.0.1` with an interface snapshot unchanged (T-B11-07 rule; Step 0 reads it) and the four new ones start at `1.0.0`.

**Verification.**
- Unit tests: `robot-parts.test.ts` as above; a registry load test through T-B8-03's loader; a grep test that no `notModelled` text contains the banned words; a test that none of the four refused ids (`core.dc-gear-motor`, `core.battery-lipo-2s`, `core.tb6612-module`, a second `core.qtr-8rc`) exists.
- Integration: `SCHEMA` and `V src/parts src/sim/registry`.
- Playwright: none. Fixtures: none.
- Acceptance. Given the new descriptors, When the schema check runs, Then zero errors. Given the registry, When a model entry claims tier T2, Then the test fails (all entries here are T1 or T0). Given `core.hc-sr04`, When `describe` reads it, Then `mechanics.sensor.query` is `ray-fan`.
- Observability: none.
- Release blockers: a number with no source and no "iynk assumption"; a second descriptor for a part B11 already makes.

**Delivery.**
- Done when tests pass and `SCHEMA` is clean.
- Verify: `TL`; `V src/parts src/sim/registry`; `SCHEMA`.
- Documentation: the source table into `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: the descriptors (T-B16-11, 12, 17, 18, 19, 27, 28) and registry ids (T-B16-31, 33).
- Note for Amar: the numbers marked "iynk assumption" need a datasheet or a bench measurement (section 6, item F5).

---

### T-B16-27. Template 1: the open-loop drive base

**Identity.** T-B16-27; subsystem: robot templates; B16, G6; should; depends on T-B16-12; not started.

**Intent.**
- Problem: ROBOTICS 15 template 1 teaches driver wiring, PWM, direction, stall current and brown-out. It is also the base for template 2.
- Target user: a beginner robot builder.
- User story: As Amar, I want a drive base that moves under my code so I can learn the driver before adding sensors.
- Expected behaviour: a project: Uno, TB6612 (or L298N), two gearmotors, 2S LiPo, chassis, two wheels, caster; a plain 1800 by 1200 mm floor with walls; code `drive forward 2 s, turn 90 degrees, stop`; five faults: `battery-sag-reset`, `motor-direction-reversed`, `motor-stall` (blocked wheel via `param`), `driver-undersized` (driver with half the current limit via `param`), `wheel-slip`; checks pass; a guide on PWM, direction and stall current.
- Success metric: runs 10 times with one seed to equal hashes (RA-02, run in T-B16-14); `runChecks` passes with no `fail`.

**Implementation.**
- Existing files: `content/projects/robots/line-follower.project.json` (T-B16-12; copy the chassis, wheel, caster, battery and driver wiring), `src/sim/mech/templates.test.ts` (E: add the case; the test file is shared, so this task owns only its case).
- New files: `content/projects/robots/drive-base.project.json`.
- Data model, algorithm, validation, edge cases: as T-B16-12 without the sensor array, the track, the sensor faults and the `FOLLOW` sketch. The sketch uses `analogWrite` and `digitalWrite` on the driver pins only.
- Permissions, performance, migration: none.

**Verification.**
- Unit tests: the `templates.test.ts` case (static): validates; five faults resolve to registry ids; checks ok. The live cases (a 20 s run goes about 2 s straight then turns; equal hashes across two runs; the fault findings) are in T-B16-38.
- Integration: RA-02 in T-B16-14. Playwright: none.
- Fixtures: none.
- Acceptance. Given the template with `flt_motor_swap`, When run, Then the robot turns the wrong way and `motor-direction-reversed` is found (proved by T-B16-38).
- Observability, release blockers: as T-B16-12.

**Delivery.**
- Done when the unit case passes and `SCHEMA` is clean.
- Verify: `TL`; `V src/sim/mech/templates.test.ts`; `SCHEMA`.
- Documentation: `docs/ROBOTICS.md` template table.
- Rollback: revert.
- Later tasks need: the file (T-B16-14, 28, 38, 39).

---

### T-B16-28. Template 2: speed control with encoders

**Identity.** T-B16-28; subsystem: robot templates; B16, G7; should; depends on T-B16-27, T-B16-23, T-B16-29, T-B16-33; not started.

**Intent.**
- Problem: ROBOTICS 15 template 2 teaches counts, speed estimates, PID and loop timing.
- Target user: an intermediate builder.
- User story: As Amar, I want to tune a speed loop and see its step response and loop timing.
- Expected behaviour: template 1 plus two encoder discs (the `encoder` variant of the gearmotor, 11 counts per revolution of the motor shaft in the example descriptor, an iynk assumption); sketch with `attachInterrupt` counters and the reference PID of `pid-sources.ts`; target speed step at 2 s; `ext["x-iynk-robot"].loopPeriodUs` and `loopPin` set (the sketch toggles the pin at the top of `loop()`; the sketch also prints the `pid <t_ms> <setpoint> <response> <output> <integral>` lines that `parsePidLines` of T-B16-29 reads); five faults: `encoder-channel-swapped`, `loop-too-slow` (a sketch variant with a `delay(40)` selected by a `param` fault on a source flag, or a second source file enabled by the fault; Step 0 picks the form that `Fault.kind` allows), `motor-direction-reversed`, `battery-sag-reset`, `wheel-slip`.
- Success metric: the PID instrument reports rise time, overshoot and settling time for the shipped gains; speed settles within 5 percent of target in 2 s (PROPOSAL); RB-C-09 resolution check passes.

**Implementation.**
- Existing files: `content/projects/robots/drive-base.project.json` (copy), `src/studio/robot/pid-sources.ts` (T-B16-29: the sketch text is imported at authoring time and pasted into the project's `sources[]`; the project file holds its own copy), `src/lib/interp/arduino/libs.ts:370` (`attachInterrupt` exists).
- New files: `content/projects/robots/speed-control.project.json`; `templates.test.ts` (E: add the case).
- Data model, algorithm: as T-B16-27 plus encoders; sources hold the reference PID in Arduino C++ only (the Uno has no MicroPython).
- Validation and edge cases: encoder interrupts at 1,600 edges per second must not trip the interpreter's statement limit (400,000 per slice, RC-58); T-B16-38 runs 20 simulated seconds and asserts no `limit:` diagnostic.
- Permissions, performance, migration: none.

**Verification.**
- Unit tests: `templates.test.ts` case (static): validates; the sketch compiles; `loopPeriodUs` and `loopPin` are set. The live cases (speed estimate from counts equals joint speed within 5 percent at steady state; `stepMetrics` within the stated bounds; the `encoder-channel-swapped` and `loop-too-slow` findings; no `limit:` diagnostic) are in T-B16-38.
- Integration: RA-02 in T-B16-14. Playwright: none.
- Fixtures: none.
- Acceptance. Given the template and seed 1, When a speed step from 0 to 0.2 m/s is commanded, Then the measured speed settles within 5 percent in 2 s and the PID panel shows the three metrics (the numbers are proved by T-B16-38; the panel by T-B16-29).
- Observability: loop-timing statistics.
- Release blockers: an interpreter limit diagnostic.

**Delivery.**
- Done when the unit case passes and `SCHEMA` is clean.
- Verify: `TL`; `V src/sim/mech/templates.test.ts`; `SCHEMA`.
- Documentation: `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: the file (T-B16-14, T-B16-38, T-B16-39).

---

### T-B16-29. PID panel, loop-timing view and the reference sources

**Identity.** T-B16-29; subsystem: instruments (Studio); B16, G2; must; depends on T-B16-00, T-B16-09, T-B16-30; not started.

**Intent.**
- Problem: ADR-0704 says control timing is shown, not hidden; ROBOTICS 9.3 says the platform ships readable PID source and a read-only tuning instrument.
- Target user: Amar tuning a loop.
- User story: As Amar, I want to see setpoint, response, output and the integral term over time, and my loop period histogram, without the app changing my gains.
- Expected behaviour: `PidPanel` plots four traces parsed from the reference PID's serial lines and shows rise time, overshoot, settling time and steady error from `stepMetrics`, plus a text table (accessibility). `LoopTimingView` shows the histogram, mean, p95, max and jitter and a warning when `overrunFraction` exceeds 5 percent. `pid-sources.ts` exports the reference PID as Arduino C++ and MicroPython source strings for an "Insert PID code" command. The panel never writes gains.
- Success metric: for a synthetic trace the displayed numbers equal `stepMetrics` output; the panel has no code path that applies an op.

**Implementation.**
- Existing files: `src/components/studio/instruments/Plotter.tsx` (T-B8-13: reuse the plot component), `src/sim/probe/loop-timing.ts` and `pid.ts` (T-B16-09; the panel receives plain data through props, so no `sim` import).
- New files: `src/components/studio/robot/PidPanel.tsx`, `src/components/studio/robot/LoopTimingView.tsx`, `src/studio/robot/pid-sources.ts`. Tests: `PidPanel.test.tsx`, `LoopTimingView.test.tsx`, `pid-sources.test.ts`.
- Modules and signatures:
```ts
// PidTrace and StepMetrics are imported from '@/core/robot-report' (T-B16-00). This task imports nothing from src/sim, so ARCH holds.
export function PidPanel(props: { trace: PidTrace; metrics: StepMetrics; unit: string }): JSX.Element;
export function LoopTimingView(props: { stats: LoopStats; targetPeriodNs?: number }): JSX.Element;
export const PID_ARDUINO: string; export const PID_MICROPYTHON: string;
export function parsePidLines(serial: ReadonlyArray<{ tNs: number; text: string }>): PidTrace;   // reads lines `pid <t_ms> <setpoint> <response> <output> <integral>` printed by the reference sources
```
- Algorithm: the sources implement ROBOTICS 9.3 in source form; a test compiles `PID_ARDUINO` with the interpreter and runs it against a simple plant in the interpreter's world to check it behaves like `createPid` within 1 percent. The reference sources print one `pid ...` line per control step (at most 50 per second); `parsePidLines` turns the serial entries of the run store (T-B4-13 `SerialEntry`) into a `PidTrace`, so the panel needs no probe tap.
- Validation and edge cases: empty trace renders "no run yet"; units follow the user's unit prefs.
- Permissions: none. Performance: plot decimation to 1,000 points.
- Migration: none.

**Verification.**
- Unit tests: components render metrics and table; keyboard focus order; histogram counts; `pid-sources.test.ts` as above.
- Integration: none. Playwright: viewed in T-B16-15 (scenario 2 opens the panel).
- Fixtures: synthetic trace.
- Acceptance. Given a trace with 12 percent overshoot, When the panel renders, Then it shows 12 percent (rounded) and the same value in the text table.
- Observability: none.
- Release blockers: any op dispatch in the panel.

**Delivery.**
- Done when tests pass; `ARCH` passes (no `sim` import).
- Verify: `TL`; `V src/components/studio/robot src/studio/robot`; `ARCH`.
- Documentation: `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: `PID_ARDUINO` (T-B16-28).

---

### T-B16-30. Strings: the `robot` namespace in six languages

**Identity.** T-B16-30; subsystem: i18n; B16, G0; must; depends on nothing in B16; status: not started.

**Intent.**
- Problem: every robot panel, problem message, check title and cause hint needs six-language text, and the banned-word rule (RA-23) must be enforced.
- Target user: all UI tasks.
- User story: As a friend using the app in Spanish, I want the robot panels in Spanish.
- Expected behaviour: `src/i18n/messages/<lang>/robot.json` for `en es fr de zh hi` with groups `builder`, `parts`, `checks.RB-C-01..10` (title, what it asks, formula note), `problems.RB-E-*` and `RB-W-*` (with `{placeholders}`), `run` (result lines), `pid`, `loop`, `home` (the New project > Robot entry and the three template titles), `models` ("What it models" labels), `safety` (lab guidance), and `cause.<id>.{symptom,hint1,hint2,hint3}` for the 11 modelled robot causes. `namespaces.ts` registers `robot`.
- Success metric: the parity test (`src/i18n/messages.test.ts:21-40`) passes with same keys and placeholders in all six; a grep test finds none of the banned words in any file.

**Implementation.**
- Existing files: `src/i18n/namespaces.ts:4` (E: add `robot`), `src/i18n/messages.test.ts:21-40` (read; the parity test picks up the namespace by the registry), `src/i18n/messages/en/*.json` (style reference).
- New files: `src/i18n/messages/{en,es,fr,de,zh,hi}/robot.json` (one set, counts 1). Test: `src/i18n/robot-words.test.ts`.
- Data model: keys are stable ids used by other tasks (listed in T-B16-05, 17, 18, 29, 31). Hint ladder follows D-010: level 1 where to look, level 2 what to measure, level 3 the cause. Copy never says "validated", "certified", "accurate", "realistic" or "guaranteed"; the safety group is lab guidance (LiPo handling, pinch points, stalled motors get hot, do not leave a powered robot unattended).
- Algorithm: English first; the other five are translations (agent-made; section 6 item F7 asks Amar or a friend to read them).
- Validation: `robot-words.test.ts` reads all six files and fails on a banned word (case-insensitive, whole word, in each language's closest equivalent for the English list: the English list is enforced exactly; for other languages the test checks only the English words that remain untranslated).
- Edge cases: placeholders `{height_mm}` identical in all six; plural forms avoided.
- Permissions, performance, migration: none.

**Verification.**
- Unit tests: parity; banned words; every `RB` code of ROBOTICS 4.5, `RB-E-SENSOR` and every `RB-C` id has a key; every one of the 11 causes has symptom and three hints.
- Integration: `V src/i18n`. Playwright: none. Fixtures: none.
- Acceptance. Given the six files, When the parity test runs, Then it passes. Given the English word "validated" added to one file, Then the words test fails.
- Observability: none.
- Release blockers: a missing placeholder in one language.

**Delivery.**
- Done when `V src/i18n` is green.
- Verify: `TL`; `V src/i18n`.
- Documentation: none.
- Rollback: revert (UI tasks revert first).
- Later tasks need: the key set (T-B16-05, 17, 18, 24, 29, 31, 39).

---

### T-B16-31. RobotChecks panel, models list and lab guidance

**Identity.** T-B16-31; subsystem: Studio robot panels; B16, G4; must; depends on T-B16-00, T-B16-11, T-B16-30; not started.

**Intent.**
- Problem: the checker output, the coupling report, the run results and the "What it models" list need one place in the Studio, readable by keyboard and screen reader, and the short lab-guidance text for motors and batteries (ROBOTICS 18).
- Target user: Amar before and after a run.
- User story: As Amar, I want a list that says "driver: fail, 1.2 A against 2.4 A" and links to the part.
- Expected behaviour: `RobotChecks` shows the ten `RobotCheck` results (title, value with unit, limit, limiting part as a link, formula and assumptions behind a disclosure), the `CouplingReport` rows, run results as text lines (`RunMetrics.text`), the registry-driven "What it models" and "Not modelled yet" lists with the tier chip, and the lab-guidance block. Failing rows come first.
- Success metric: axe finds no serious violations; each result line is plain text; a failing check shows its limiting part's name.

**Implementation.**
- Existing files: `src/components/studio/TierChips.tsx` and `ModelsPanel.tsx` (T-B8-04: reuse, read), `src/components/studio/Problems.tsx` (T-B4-17).
- New files: `src/components/studio/robot/RobotChecks.tsx`. Tests: `RobotChecks.test.tsx`.
- Modules and signatures:
```ts
export function RobotChecks(props: { checks: RobotCheck[]; coupling: CouplingReport[]; run?: RunMetrics; models: Array<{ id: string; tier: 'T0' | 'T1' | 'T2' | 'T3'; modelled: string[]; notModelled: string[] }>; onSelectPart(id: string): void }): JSX.Element;
```
  `RobotCheck`, `CouplingReport` and `RunMetrics` are imported from `@/core/robot-report` (T-B16-00). The panel gets values through props and imports nothing from `src/sim`, at run time or as a type: UI has no `sim` column in the SYSTEM 5.3 matrix and B3 cell M-5 stays closed.
- Algorithm: sort failing, warning, ok; keyboard: each row is a list item, Enter selects the part.
- Validation and edge cases: empty `checks` shows "not run yet"; a null limiting part shows "no single part".
- Permissions: none. Performance: trivial.
- Migration: none.

**Verification.**
- Unit tests: `RobotChecks.test.tsx`: order; text of a failing row contains the part name; disclosure shows formula; banned-word grep over the rendered English page; axe via `jest-axe`-style helper if B4 added one, otherwise T-B16-15 runs axe.
- Integration: none. Playwright: T-B16-15 (axe).
- Fixtures: constructed checks.
- Acceptance. Given a failing RB-C-04, When rendered, Then the first row names the driver and its two numbers.
- Observability: none.
- Release blockers: the word "validated" or "certified" in rendered output.

**Delivery.**
- Done when tests pass.
- Verify: `TL`; `V src/components/studio/robot`; `ARCH`.
- Documentation: none.
- Rollback: revert.
- Later tasks need: the component (T-B16-39 mounts it).

---

### T-B16-32. Replay record: engine pin, physics settings, refusal

**Identity.** T-B16-32; subsystem: replay (`src/sim/replay`, `src/sim/engine.ts`); B16, G4; must; depends on T-B16-01, T-B16-02, T-B16-03 (and B3 T-B3-19, T-B3-11); not started.

**Intent.**
- Problem: a robot run is only repeatable if the record names the exact engine files and the physics settings, and a record from a different engine build must refuse to replay with both pins shown (RA-22).
- Target user: Amar replaying a run; rooms (RT).
- User story: As Amar, I want a saved run to say which engine made it and to refuse politely on a different one.
- Expected behaviour: the engine pins are entries in B3's existing `ReplayRecord.versions.engines` map (RC-54: engine ids are `engine:<name>@<semver>`). The physics settings are a new optional `SimSettings.physics` block, which `ReplayRecord.settings` already carries. `checkVersions(record, running)` returns `{ ok: true }` or `{ ok: false, reason: 'engine-mismatch', recorded, running }`. A record without `physics` (any non-robot run) is unchanged.
- Success metric: RA-22: a record from build A replayed on build B (different WASM hash) is refused with both pins in the result; RA-04: the recorded combine rules and iteration count equal the adapter's read-back or stored values.

**Implementation.**
- Evidence for the shape (VERIFIED by reading): B3's `ReplayRecord` is `{ format: 1; docHash; seed; settings: SimSettings; versions: { engines: Record<string, string>; models: Record<string, string>; dmath: string }; inputs; checkpoints; endsAt; pinTraceHash; serialHash }` (B3 file line 1215) and `SimSettings` is `{ seed; toleranceMode; analog; speed }` (B3 line 634). `project.schema.json` `$defs/ReplayLog.engines` has `maxProperties: 16` and every value `maxLength: 40` (read by script), and B3's `toReplayLog` returns an error for a longer value (B3 lines 1218, 1231, 1240). `ReplayLog` has no `physics` field. So a `versions.rapier` string with both 64-hex hashes (about 170 characters) cannot be written; the full pins stay in `rapier.manifest.json`.
- Existing files: `src/sim/replay/record.ts` (T-B3-19, edited by T-B8-16; E: the two functions and `PhysicsRecord`), `src/sim/engine.ts` (T-B3-11; E: `SimSettings` gains `physics?: PhysicsRecord`; type only), `src/sim/mech/scene.ts` (`sceneHash`), `src/sim/mech/rapier.ts` (`readBack`), `src/sim-host/engines/physics/rapier.manifest.json` (pins).
- New files: none. Tests: `src/sim/replay/record.rapier.test.ts`.
- Modules and signatures:
```ts
// record.ts additions
export interface PhysicsRecord { step_hz: number; length_scale: 1 | 10; sleeping: false; ccd: 'off' | 'auto'; combine: { friction: CombineRule; restitution: CombineRule }; solver_iterations: number; scene_hash: string; engine_confirmed: boolean }
// SimSettings (src/sim/engine.ts) gains: physics?: PhysicsRecord
export function rapierEngineEntries(pins: { version: string; wasmSha256: string; jsSha256: string }): Record<string, string>;
//   { 'engine:rapier@0.21.0': 'sha256:<first 24 hex of the wasm sha256>', 'engine:rapier-glue@0.21.0': 'sha256:<first 24 hex of the js sha256>' }   each value is 31 characters
export function checkVersions(rec: Pick<ReplayRecord, 'versions'>, running: Record<string, string>): { ok: true } | { ok: false; reason: 'engine-mismatch'; key: string; recorded: string | undefined; running: string | undefined };
```
- Data model: field names follow RC-54 (`combine`, not `combine_rules`). Two keys are added to `versions.engines` (16 allowed). The 24 hex digits (96 bits) are a pin check, not a security hash: the full-length check against the manifest happens at load (T-B16-33). Where the physics block is kept: in `SimSettings` (an in-memory type edit, no schema change). A persisted `iynk.replay` file carries only `engines`, `events` and `checkpoints` (B3 line 1219: `settings` is one of the four fields a log cannot carry), so `physics` is rebuilt from the document (`docHash` pins it) at replay and is not stored in the file. Adding `physics` to `ReplayLog` is a schema minor and is open question Q10 for Amar. Rooms compare class D for physics hashes until RA-02 passes (RC-53); this task stores no hash class.
- Algorithm: pure string and object functions. `checkVersions` compares every `engine:rapier*` key present in either side.
- Validation and error conditions: a `versions.engines` value that does not match `^sha256:[0-9a-f]{24}$` for a `rapier` key is `bad-version`.
- Edge cases: a record with `settings.physics` but no `engine:rapier@...` key is refused as incomplete. A record with 16 engine keys already is refused by the B3 mapper, not here.
- Permissions, migration: older records have neither and load as before.

**Verification.**
- Unit tests: round trip through B3's `toReplayLog` (the two values are accepted because they are 31 characters; a 170-character string is refused, proving the old design failed); RA-22 mismatch result with both strings; unchanged behaviour for records without the fields (existing `record` tests stay green).
- Integration: `V src/sim/replay`.
- Playwright: none. Fixtures: constructed records.
- Acceptance. Given a recorded WASM pin differing from the running one, When `checkVersions` runs, Then it returns both strings and the key.
- Observability: the refusal text names both pins.
- Release blockers: any change to existing non-robot records; a version string over 40 characters.

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `V src/sim/replay`; `PORTABLE`.
- Documentation: `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: `checkVersions`, `rapierEngineEntries`, `PhysicsRecord` (T-B16-33, 14).

---

### T-B16-33. SimHost wiring: lazy load, "loading physics", frames, halts, validation message

**Identity.** T-B16-33; subsystem: sim host (`src/sim-host`, `src/studio/run`); B16, G5; must; depends on T-B16-01, T-B16-17, T-B16-22, T-B16-32; not started.

**Intent.**
- Problem: the engine must load only on a project that needs physics (RA-26, BUD-14), only after the person sees its size, with a hash check before it starts (RK-2), and the UI must get frames at no more than 30 per simulated second.
- Target user: Amar pressing Run on a robot; Amar opening a non-robot project (no engine bytes).
- User story: As Amar, I want "loading physics (0.89 MB)" before the engine downloads, and no download at all for an LED project.
- Expected behaviour: `needsPhysics(doc)` is true when `domains.robotics` exists and `mechanical.bodies` is non-empty (PROPOSAL; a body-only project without the robotics domain does not load the engine). On Run, `src/sim-host/mech.ts` calls `loadEngine('rapier')` (reports `wireBytes` first), fetches the two files with `integrity`, checks the WASM SHA-256 against the manifest pin, sets `__IYNK_RAPIER_WASM__`, imports the module, creates the backend, runs one dummy step, builds the scene, creates channels, sensors and encoders, and registers the engine. State `loading-physics` is posted to the Run bar. `mech_frame` messages carry `MechFrame` at most 30 per simulated second as transferables. `robot_validate` request/response returns `RobotProblem[]` for the Problems pane. A `halted` engine posts the code and the last frame.
- Success metric: opening a Blink project makes no request to `/engines/rapier@0.21.0/`; Run on the line follower shows "loading physics" first; a wrong WASM hash refuses to start with the pin and the found hash.

**Implementation.**
- Existing files: `src/sim-host/host.ts`, `sim.worker.ts`, `protocol.ts` (T-B3-13, T-B8-14; E: message types and a branch in the run setup; lines UNKNOWN until built), `src/sim-host/engines/loader.ts` (read: `loadEngine`, `EngineManifestEntry`), `src/studio/run/session.ts` (T-B4-13; E: map `MechFrame` to the view's `PhysicsFrame`, show the loading state), `src/sim/mech/*`, `src/sim/replay/record.ts`. `src/sim-host` importing `src/sim` values is allowed by B3's matrix edit M-2 (B3 line 141; the `architecture.test.ts` case at B3 line 434), so `prepareMech` stays in `src/sim-host/mech.ts`. `src/studio/run/session.ts` receives frames as the structural `PhysicsFrame` of `@/core/robot-report` and imports nothing from `src/sim`.
- New files: `src/sim-host/mech.ts`. Tests: `mech.test.ts` (loader stubbed), `needs-physics.test.ts`.
- Modules and signatures:
```ts
export function needsPhysics(doc: Project): boolean;
export interface MechRuntime { engine: Engine & ReturnType<typeof createMechEngine>; problems: RobotProblem[]; wireBytes: number; nets: { pack: string; regulator: string; rail: string }; report(): MechReport }   // RobotProblem, MechReport from '@/core/robot-report'
export function prepareMech(doc: Project, deps: { loadEngine: typeof loadEngine; describe: ...; io: MechIo; onState(s: 'loading-physics' | 'ready' | 'failed', info?: { wireBytes?: number; reason?: string }): void }): Promise<Result<MechRuntime, { code: 'pin-mismatch' | 'load-failed' | 'invalid-robot'; message: string; expected?: string; found?: string }>>;
// protocol additions
type MechFrameMsg = { t: 'mech_frame'; frame: PhysicsFrame }; type RobotValidateReq = { t: 'robot_validate' }; type RobotValidateRes = { t: 'robot_problems'; problems: RobotProblem[]; checks: RobotCheck[]; coupling: CouplingReport[] }; type MechReportMsg = { t: 'mech_report'; report: MechReport };
```
- Algorithm: `prepareMech` order: `validateRobot` (errors stop the run with the list), `loadEngine`, pin check, init, dummy step, `buildScene`, `createMotorChannel` per driven joint (driver pin sources from the netlist: the net on each driver input pin resolved through the digital layer; supply net voltage from the analog hook), `createSensor`, `createEncoder`, `createMechEngine`. Frame throttle: emit a frame when `stepIndex % 8 === 0` (240/8 = 30 per second), always on halt. After a successful `validateRobot` the worker posts `robot_problems` once with `runChecks` and the coupling reports. At run end and on halt it posts `mech_report`: `runHash` is the last checkpoint hash, `checkpoints` are the orchestrator's checkpoint hashes (every 1,000 ms), `run` is `runMetrics` over chassis samples taken every 8th step, `loop` is `LoopStats` from `createLoopTiming` fed by the `LoopSource` named in `ext["x-iynk-robot"]`.
- State transitions: `idle -> loading-physics -> ready -> running -> halted | done`; `failed` on pin mismatch or load error.
- Validation and error conditions: `pin-mismatch` carries expected and found hashes; offline with the engine file not cached gives `load-failed` with "physics engine not available offline" (the service worker caches engine files after first use, T-B3-09, B9).
- Edge cases: project edited during a run (the run uses the document revision it started from, SIMULATION rule); two runs in one session reuse the loaded module; tab visibility hidden throttles frames, not steps.
- Permissions: same-origin fetches only. Performance: first step 24 to 27 ms stall happens inside the dummy step (157 ms at 6x throttle).
- Migration: none.

**Verification.**
- Unit tests: `needs-physics.test.ts`: LED project false (RA-26), line follower true, mechanical without domain false. `mech.test.ts`: order of state messages; `pin-mismatch` on a tampered stub; frame count for 10 simulated seconds is 300 (+1); `robot_validate` returns the validator's list; a NaN halts and posts the last frame; `mech_report` carries 11 checkpoint hashes for a 10 s run.
- Integration: runs the four-wheel fixture through a stubbed loader that returns the npm module, 2 simulated seconds.
- Playwright: T-B16-15 (also asserts no request to `/engines/rapier` while a non-robot project is open).
- Fixtures: four-wheel fixture.
- Acceptance. Given an LED project, When opened and run, Then no request for the engine path is made. Given the line follower, When Run is pressed, Then the Run bar shows loading physics with the size before any engine request.
- Observability: `mech_status` messages; the halt code in the run status.
- Release blockers: engine bytes requested for a non-robot project; engine started with a wrong hash.

**Delivery.**
- Done when tests pass; `ARCH` passes.
- Verify: `TL`; `V src/sim-host src/studio`; `ARCH`.
- Documentation: `docs/ROBOTICS.md` (load rule).
- Rollback: revert; Run on a robot gives "physics not available" and nothing else changes.
- Later tasks need: `prepareMech`, `needsPhysics` (T-B16-34, T-B16-38, T-B16-39, T-B16-40).

---

### T-B16-34. Perf: RA-07 first version

**Identity.** T-B16-34; subsystem: performance tests; B16, G6; should; depends on T-B16-01, T-B16-16, T-B16-17, T-B16-22, T-B16-33; not started.

**Intent.**
- Problem: the 64-body scene limit is a HYPOTHESIS chosen from a 20-body scene. BUD-13 asks for a mean step under 1 ms at 6x throttle; BUD-11 for 150 MB tab memory.
- Target user: Amar; the validator limits (T-B16-17).
- User story: As Amar, I want the real limit written down.
- Expected behaviour: a generated scene of 64 dynamic bodies and 32 joints runs in a Worker page at 6x CPU throttle (CDP). The spec records mean step, p95 of 100-step batches, the worst single steps, first-step stall, and the JS heap (and WASM memory size if reachable) after a long run; it also varies the mass ratio across a joint to find where the solver becomes unstable. The numbers are written to `test-results/physics-perf.json` and printed. The assertion is mean step under 1 ms and heap under 150 MB; a miss does not loosen the bound; it lowers `ROBOT_LIMITS` in a follow-up commit and says so.
- Success metric: mean under 1 ms and p95 batch under 1 ms at 6x on the dev laptop (RS-13 measured 0.44 to 0.54 ms at 20 bodies; 64 bodies is UNKNOWN); the stability point of `RB-W-MASSRATIO` is recorded.

**Implementation.**
- Existing files: `src/sim/mech/validate.ts`, `limits.ts` (read), `playwright.config.ts` (read), RS-13 timing method (`REPORT.md` Method: mean over 10,000 steps and p95 of 100-step batch means; per-step p95 in browsers is the timer quantum and means nothing).
- New files: `e2e/physics-perf.spec.ts`; `src/sim/mech/fixtures/perf-scene.ts` (scene generator: seeded, deterministic). No other source file.
- Modules and signatures: `export function perfScene(bodies: number, joints: number, massRatio?: number): SceneSpec`.
- Algorithm: warm up 500 steps, measure 10,000 steps in a Worker with `performance.now()` around batches of 100; heap via CDP `Runtime.getHeapUsage` and `Performance.getMetrics`; wasm memory via the module if it exposes it, else recorded UNKNOWN. Mass-ratio sweep: 1, 10, 100, 1000 across one revolute joint, record whether the joint drifts more than 1 degree in 5 s at rest.
- Validation: the spec prints the machine (UNKNOWN device class; RS-01 follow-up has no phone yet).
- Edge cases: the first step stall is excluded from the mean and reported.
- Permissions: none. Performance: the spec takes under 5 minutes.
- Migration: none.

**Verification.**
- Unit tests: `perfScene` determinism (two calls equal).
- Playwright: `E e2e/physics-perf.spec.ts`.
- Fixtures: the generator.
- Acceptance. Given 64 bodies and 32 joints at 6x throttle, When 10,000 steps run, Then mean step is under 1 ms and the JSON is written.
- Observability: the JSON.
- Release blockers: none; a miss is a finding for Amar, not a hidden pass.

**Delivery.**
- Done when the spec passes or the miss is recorded with the lowered limit.
- Verify: `TL`; `PB`; `E e2e/physics-perf.spec.ts`.
- Documentation: results table in `docs/ROBOTICS.md`.
- Rollback: revert.
- Later tasks need: the recorded limit (T-B16-36, T-B16-37).

---

### T-B16-35. Spike: does engine snapshot then restore equal continuing?

**Identity.** T-B16-35; subsystem: research and `src/sim/mech/rapier.ts`; B16, G3; could; depends on T-B16-02, T-B16-16 (the artifact hook); nothing waits on it.

**Intent.**
- Question (falsifiable): On the shipped Rapier artifact, if `takeSnapshot()` is called at step 5,000 of the RS-13 scene and the bytes are restored into a fresh world of the same scene, are the `hash2` values of the next 1,000 steps equal to those of the world that kept running? What are the snapshot size in bytes and the cost of take and restore in milliseconds?
- Why: ROBOTICS 6.2 and RA-08: until this is shown, "restore" means replay from the nearest keyframe, and the UI says so. Rewind (every 5 simulated seconds, cap 64) depends on it.
- Exit condition: PASS if all 1,000 hashes are equal and take plus restore costs under 5 ms for 20 bodies. Then T-B16-35 enables `snapshot()` and `restore()` in `rapier.ts` (they throw `not-verified` today) and adds a test. FAIL: the report says why (API missing, state not covered, hash differs at step N) and `rapier.ts` is left unchanged; restore stays keyframe replay; `docs/ROBOTICS.md` says so.
- Method: a script in `08_RESEARCH_SPIKES/RS-B16-snapshot/src/` using the npm package first, then the shipped split artifact through the hook of T-B16-16.

**Implementation.**
- Existing files: `src/sim/mech/rapier.ts` (T-B16-02; E only on PASS: enable `snapshot` and `restore`).
- New files: `08_RESEARCH_SPIKES/RS-B16-snapshot/{REPORT.md,README.md,src/snap.mjs,results/*.txt}`; on PASS a test `src/sim/mech/snapshot.test.ts`.
- Algorithm, edge cases: restore into a world built by the same `create`; the snapshot must carry joints and motor targets (check by running a motor scene).
- Permissions, performance, migration: none.

**Verification.**
- Acceptance. Given the RS-13 scene, When snapshot at 5,000 and restore are done, Then either all 1,000 following hashes equal continuing (PASS) or the first differing step is reported (FAIL).
- Release blockers: a PASS claim without the 1,000 hashes.

**Delivery.**
- Done when `REPORT.md` has the verdict and numbers.
- Verify: `TL`; `V src/sim/mech/snapshot.test.ts` on PASS.
- Documentation: `docs/ROBOTICS.md` (rewind rule).
- Rollback: revert.
- Later tasks need: the verdict (B17 and B8 replay features may use it).

---

### T-B16-38. Live-run tests: the templates and their faults, headless

**Identity.** T-B16-38; subsystem: simulation tests (`src/sim-host`); B16, G8; must; depends on T-B16-09, T-B16-12, T-B16-13, T-B16-22, T-B16-24, T-B16-25, T-B16-27, T-B16-28, T-B16-33, T-B16-40; not started. Test-only: no source file.

**Intent.**
- Problem: the acceptance lines of T-B16-12, 13, 25, 27 and 28 (a lap, cross-track under 15 mm, findings from faults, a speed step, loop timing) need the whole path at once: interpreter, analog, mechanical engine, adapter and rules. Before this task each of them either could not run or sat as an `it.todo` that a later task would flip in someone else's file. This task holds every live-run case in one file with one owner.
- Target user: Amar reading the gate; every agent that changes the physics later.
- User story: As Amar, I want one test file that runs each template headless and checks that it does what its description says, healthy and broken.
- Expected behaviour: `src/sim-host/mech.run.test.ts` runs the three templates through `prepareMech` (T-B16-33, loader stubbed to return the npm Rapier module), the orchestrator and the interpreter, with the fault list as an argument. The file sits in `src/sim-host` and not in `src/sim/mech` because it imports `prepareMech`, and `sim` may not import `sim-host` (B3 cell M-2 runs the other way; `ARCH`).
- Success metric: every case below passes; the test prints `lap`, cross-track maximum, step-response metrics and the ten-run hash equality.

**Implementation.**
- Existing files (read): `src/sim-host/mech.ts` (T-B16-33), `src/sim/faults/robot-facts.ts` and `src/sim-host/sim.worker.ts` (T-B16-40: the run-end path that builds `RunFacts.robot` and calls the rules), `content/projects/robots/*.project.json`, B3's headless run helper (`src/project/testing/harness.ts`, T-B2-16, or the helper of T-B3-13; Step 0 names the one in the tree), `src/sim/mcu/arduino.ts` (T-B3-12: the real name of the loop-start event, if any, for the `LoopSource` of T-B16-09).
- New files: `src/sim-host/mech.run.test.ts`. Nothing else.
- Helper inside the test: `runTemplate(name: 'line-follower' | 'drive-base' | 'speed-control', o: { ms: number; faults?: string[]; seed?: number }): Promise<{ frames: PhysicsFrame[]; findings: Finding[]; report: MechReport; diagnostics: string[] }>`.
- Cases (every one runs the real engine; each `it` sets its own timeout of 120 s):
  1. Line follower, seed 1, 40 s: progress at least one track length and `maxCrossTrackMm` under 15 (T-B16-12), no robot finding on the healthy run.
  2. Line follower with `flt_sensor_high`: no lap; finding `sensor-too-high` whose evidence names the sensor and `height_mm` 30 (T-B16-25, RA-13). With `flt_motor_swap`: `motor-direction-reversed`. With `flt_wheel_slip`: `wheel-slip`. With `flt_brownout`: `battery-sag-reset` with pack voltage and reset time. With `flt_sensor_sat`: `sensor-saturated`.
  3. Drive base, 20 s: about 2 s straight, then a turn of 90 degrees within 5 degrees (T-B16-27); each of its five faults gives its finding, `flt_motor_swap` gives `motor-direction-reversed`.
  4. Speed control, 20 s, step 0 to 0.2 m/s at 2 s: settles within 5 percent in 2 s; `stepMetrics` over the parsed PID lines is inside the stated bounds; `encoder-channel-swapped` gives its finding; `loop-too-slow` fires on the slow variant only; no `limit:` diagnostic (T-B16-28).
  5. Loop timing through the interpreter: a sketch with `delay(10)` and 200 statements of work reports a mean period of 10.2 ms within 1 percent (statement cost 1,000 ns on an Uno, SIMULATION 5.4; T-B16-09 acceptance, moved here from its unit test).
  6. Hash stability: ten runs of each template with one seed give equal checkpoint hash lists in `report.checkpoints`.
- Validation and edge cases: the test fails (not skips) if the engine package is missing. Case timings are ESTIMATED at 5 to 20 s each on the dev laptop (40 s of simulated time is 9,600 mechanical steps plus the interpreter); the whole file under 5 minutes.
- Permissions, migration: none.

**Verification.**
- Unit tests: this file is the test.
- Integration: it is the integration test of T-B16-12, 13, 25, 27 and 28 and the live half of T-B16-09.
- Playwright: none (T-B16-15 and T-B16-14 cover the browser).
- Fixtures: the three template files.
- Acceptance. Given the line follower and seed 1, When it runs 40 simulated seconds, Then it completes a lap with maximum cross-track error under 15 mm. Given `flt_sensor_high`, Then the finding is `sensor-too-high`. Given ten runs, Then the checkpoint lists are equal.
- Observability: the printed numbers go to the commit body.
- Release blockers: a false alarm on any healthy run; a lap under the bound by loosening it (stop and report).

**Delivery.**
- Done when the file passes.
- Verify: `TL`; `V src/sim-host/mech.run.test.ts`; `ARCH`.
- Documentation: numbers into `docs/ROBOTICS.md` (T-B16-36).
- Rollback: revert.
- Later tasks need: nothing; T-B16-14 and T-B16-37 depend on it as a gate input.

---

### T-B16-39. Studio wiring: mount the robot panels, New project > Robot, run hash text, Problems pane

**Identity.** T-B16-39; subsystem: Studio shell (`src/components/studio`, `src/studio`); B16, G8; must; depends on T-B16-05, T-B16-12, T-B16-18, T-B16-27, T-B16-28, T-B16-29, T-B16-30, T-B16-31, T-B16-33, T-B16-40; not started.

**Intent.**
- Problem: T-B16-05, 18, 29 and 31 build components that nothing mounts, no list entry makes a robot project, the run bar shows no run hash, and robot problems never reach the Problems pane. T-B16-15 cannot start without them.
- Target user: Amar.
- User story: As Amar, I press New project, choose Robot, and see the builder, the top-down view and the checks; I press Run on the line follower and see the run hash.
- Expected behaviour: (a) when the open document has `domains.robotics`, `Workspace` adds a "Robot" tab to the left rail (`RobotBuilder`), `TopDownView` as a canvas view option, "Checks" to the right rail (`RobotChecks`), and "PID" and "Loop timing" tabs to the bottom dock (`PidPanel`, `LoopTimingView`); all read one `RobotStore` (T-B16-40). A document without the domain mounts none of them, and the panels are loaded on demand (`next/dynamic`; Step 0 reads `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` first, AGENTS.md). (b) `Home` gets a "Robot" group: a blank robot project (`newRobotProject`) and the three templates (Line follower, Drive base, Speed control) opened by `loadRobotTemplate`. (c) `RunBar` shows `Run hash: <16 hex>` in a `role="status"` element once the run ends. (g) `problems.ts` merges the `RobotProblem[]` of the store into the Problems pane, with the message keys in the `robot` namespace.
- Success metric: a keyboard user reaches a robot project from Home in under 12 key presses; the panels appear only for robot documents; the run hash text equals `report.runHash`.

**Implementation.**
- Existing files (all E, each read as built): `src/components/studio/Workspace.tsx` (T-B4-25a), `src/components/studio/Home.tsx` and `src/studio/templates.ts` (T-B4-16; T-B12-09 and T-B5 also edit `templates.ts`, so read it as it stands), `src/components/studio/RunBar.tsx` (T-B4-13; B9 edits), `src/studio/problems.ts` (T-B4-17), `src/studio/tools/robot.ts` (T-B16-18: `recipe`), `src/studio/robot/store.ts` (T-B16-40), `content/projects/robots/*.project.json` (T-B16-12, 27, 28).
- New files: none. Tests beside each edited file.
- Modules and signatures:
```ts
// templates.ts additions (portable, no src/local)
export function newRobotProject(blank: Project, deps: { registry: PartRegistry; ids: IdSource }): Project;   // blankProject + domains.robotics with a 10 m floor + the 'chassis' recipe of T-B16-18
export const ROBOT_TEMPLATES: readonly { id: 'line-follower' | 'drive-base' | 'speed-control'; titleKey: string }[];
export function loadRobotTemplate(id: ROBOT_TEMPLATES[number]['id'], deps: { ids: IdSource; now: string; actor: string }): Promise<Project>;   // dynamic import of the one file, then forkProject (T-B4-16 pattern)
// problems.ts addition
export function withRobotProblems(base: Problem[], robot: RobotProblem[]): Problem[];   // RobotProblem from '@/core/robot-report'
```
- Algorithm: `Workspace` reads `doc.state.domains?.robotics` once per document revision; the "models" list passed to `RobotChecks` comes from the same B8 summary path `ModelsPanel` uses (T-B8-04; no new path). Home strings are the `robot.home.*` keys of T-B16-30. Templates are forked, never edited in place (STU-24).
- Validation and errors: a missing template file is a test failure (imported by name in `templates.test.ts`), not a runtime surprise. A document with `domains.robotics` but no bodies mounts the panels with the "not run yet" empty states.
- Edge cases: Strict Mode double mount (the existing `Workspace` effect pattern); tab switch keeps focus; the store is created per workspace and disposed with it.
- Permissions, performance, migration: none / panels cost nothing for non-robot projects (lazy) / none.

**Verification.**
- Unit tests: `Workspace.test.tsx` additions (robot document mounts the five panels by role and name; an LED project mounts none and requests no robot chunk); `templates.test.ts` (`newRobotProject` validates and has one chassis; the three templates load, validate and fork with a new id, revision 0, origin `template`); `Home.test.tsx` (Robot group by keyboard); `RunBar.test.tsx` (hash text appears after `done`, absent before); `problems.test.ts` (robot errors listed first, keys resolve).
- Integration: none here (T-B16-15).
- Playwright: T-B16-15.
- Fixtures: the template files.
- Acceptance. (a) Given a robot document, When the Workspace mounts, Then the Robot, Checks, PID and Loop timing panels exist and an LED project has none. (b) Given Home, When I choose New project > Robot, Then the document has `domains.robotics` and one chassis, and Line follower opens as a fork. (c) Given a finished run, Then the status element named "Run hash" holds the 16-digit hash. (g) Given a 2 mm collider, Then the Problems pane lists `RB-E-THIN` with the body path.
- Observability: none.
- Release blockers: a robot panel imported by a non-robot path; `src/sim` imported by any of these files (`ARCH`).

**Delivery.**
- Done when tests pass and `ARCH` passes.
- Verify: `TL`; `V src/studio src/components/studio`; `ARCH`.
- Documentation: `docs/ROBOTICS.md` (where the panels are).
- Rollback: revert; Home returns to the Uno entries and no panel mounts.
- Later tasks need: the mounted UI (T-B16-15, T-B16-14).

---

### T-B16-40. Run data path: robot facts for the rules, the robot store, run hashes and the test hook

**Identity.** T-B16-40; subsystem: run path (`src/sim/faults`, `src/sim-host`, `src/studio`); B16, G6; must; depends on T-B16-13, T-B16-22, T-B16-29, T-B16-33; not started.

**Intent.**
- Problem: the mechanical engine produces facts and reports, but nothing hands `RobotFacts` to the rules (so T-B16-13 and T-B16-25 would never see data), nothing turns MCU resets into `ResetFact`s, nothing feeds `LoopStats` and the PID lines to the panels, and the cross-browser job (T-B16-14) has no way to read checkpoint hashes.
- Target user: the Diagnose panel, the robot panels, T-B16-14.
- User story: As Amar, when a robot run ends I want the app to run the robot rules on what happened and show the loop timing, the PID trace and the run hash.
- Expected behaviour: (e) at run end the worker calls `withRobotFacts(runFactsFrom(src), mech.engine.facts(), mech.nets)` and passes the result to the fault monitor, so `RunFacts.robot` and `RobotFacts.resets` are filled. (f) `session.ts` routes `mech_frame`, `robot_problems` and `mech_report` messages (T-B16-33) and the run store's serial entries into one `RobotStore`; the panels of T-B16-39 read it. (d) with `NEXT_PUBLIC_STUDIO_TEST=1` the debug hook sets `window.__iynkMechHashes = { latest(): { runHash: string; sceneHash: string; checkpoints: string[] } | null }`.
- Success metric: the healthy line follower run gives no robot finding and the `sensor-too-high` run gives one; the store holds `LoopStats` with `n > 0` and, for the speed-control sketch, a `PidTrace` of the printed lines; the hook returns the same list as `report.checkpoints`.

**Implementation.**
- Existing files: `src/sim-host/sim.worker.ts` (T-B16-33, T-B10-04: where `runFactsFrom` and `createFaultMonitor` are called, B10 line 1523; E: one call), `src/studio/run/session.ts` (T-B16-33; E: message routing), `src/components/studio/wiring/debugHook.ts` (T-B4-25a; E: the new property, same flag), `src/sim/faults/types.ts` (T-B16-13 added `RunFacts.robot`), `src/sim/mech/facts.ts` (T-B16-22: `RobotFacts`, `ResetFact`), `src/studio/robot/pid-sources.ts` (T-B16-29: `parsePidLines`).
- New files: `src/sim/faults/robot-facts.ts`, `src/studio/robot/store.ts`. Tests: `robot-facts.test.ts`, `store.test.ts`, additions to the `session` and `debugHook` tests.
- Modules and signatures:
```ts
// src/sim/faults/robot-facts.ts
export interface RobotNets { pack: string; regulator: string; rail: string }          // net ids resolved by prepareMech (T-B16-33 MechRuntime.nets)
export function buildResetFacts(resets: readonly SimTime[], robot: RobotFacts, node: RunFacts['node'], nets: RobotNets): ResetFact[];
export function withRobotFacts(base: RunFacts, robot: RobotFacts, nets: RobotNets): RunFacts;   // { ...base, robot: { ...robot, resets: buildResetFacts(base.resets, robot, base.node, nets) } }
// src/studio/robot/store.ts
export interface RobotView { problems: RobotProblem[]; checks: RobotCheck[]; coupling: CouplingReport[]; frame: PhysicsFrame | null; trail: Array<[number, number]>; run: RunMetrics | null; loop: LoopStats | null; pid: PidTrace | null; runHash: string | null; sceneHash: string | null; checkpoints: string[] }
export type RobotMsg = { t: 'mech_frame'; frame: PhysicsFrame } | { t: 'robot_problems'; problems: RobotProblem[]; checks: RobotCheck[]; coupling: CouplingReport[] } | { t: 'mech_report'; report: MechReport } | { t: 'serial'; entries: ReadonlyArray<{ tNs: number; text: string }> };
export interface RobotStore { get(): RobotView; subscribe(fn: () => void): () => void; apply(msg: RobotMsg): void; reset(): void }
export function createRobotStore(): RobotStore;       // all shapes from '@/core/robot-report'; no src/sim import
```
- Algorithm: `buildResetFacts`: for each reset time `t`, `packV` is the last `robot.supply` sample at or before `t`, `regV` and `railV` are `node(nets.regulator, t)` and `node(nets.rail, t)` (NaN when the net is unknown), `motorStartNs` is the first sample in the 50 ms before `t` whose `armatureA` rose above 0.1 A from below 0.05 A, else null (thresholds PROPOSAL, shown by the rule). `RunFacts.resets` stays `SimTime[]` (B10 line 228); the join is by timestamp. The store appends frames to a trail of the last 600 points, keeps the latest report, and parses PID lines with `parsePidLines` on each `serial` message.
- Validation and edge cases: no `robot` run (no mech engine) leaves `RunFacts.robot` undefined and the rules `skipped.add(ruleId, 'no robot run')`; a reset with no motor start has `motorStartNs: null`; a second run resets the store.
- Permissions, performance, migration: none / store update under 1 ms per message / none.

**Verification.**
- Unit tests: `robot-facts.test.ts`: reset joined to the right supply sample, `motorStartNs` found and null cases, `RunFacts` fields other than `robot` unchanged. `store.test.ts`: trail cap 600, report replaces the previous one, PID parse, reset. Hook test: absent without the flag, present with it, `latest()` equals the report.
- Integration: T-B16-38 runs the whole path.
- Playwright: T-B16-15 and T-B16-14 read the hook and the panels.
- Fixtures: constructed facts.
- Acceptance. (e) Given a run with `flt_brownout`, When it ends, Then `RunFacts.robot.resets` has one entry with `packV` and `motorStartNs`. (f) Given the speed-control run, Then `RobotView.pid` has the printed samples and `loop` has `n > 0`. (d) Given a build with the test flag, Then `window.__iynkMechHashes.latest().checkpoints` has one hash per simulated second.
- Observability: the hook (flagged build only).
- Release blockers: the hook present in a normal build; `src/sim` imported by `store.ts` (`ARCH`).

**Delivery.**
- Done when tests pass; `PORTABLE` and `ARCH` pass.
- Verify: `TL`; `V src/sim/faults src/studio src/sim-host`; `PORTABLE`; `ARCH`.
- Documentation: `docs/ROBOTICS.md`.
- Rollback: revert; rules skip with "no robot run" and the panels show empty states.
- Later tasks need: the store (T-B16-39), `withRobotFacts` and the hook (T-B16-38, 15, 14).

---

### T-B16-36. Documentation: `docs/ROBOTICS.md` and the design-document edits

**Identity.** T-B16-36; subsystem: docs; B16, G10; must; depends on all tasks except T-B16-37; not started.

**Intent.**
- Problem: the roadmap lists `docs/ROBOTICS.md` as the phase documentation, and two design facts changed (the ray query; the numbers).
- Target user: Amar and friends reading the repo; a later agent resuming.
- User story: As a friend, I want one page that says how to build a robot, what is modelled, what is not, and how to rerun the determinism numbers.
- Expected behaviour: `docs/ROBOTICS.md` covers: what a robot project is; the builder; parts and sources (with the "iynk assumption" list); the physics engine, its pins and fallback (T-B16-01); the interface and torque rule; scene build order; motor, driver, gearbox, battery, sensors, encoder (equations in short); timing table; checks table (RB-C and RB-E/W); cause ids and detectors; templates 1 to 3; replay record; how to rerun every number; the recorded numbers (SA-16 drift and speed, RA-01 hashes, RA-02 table, RA-07 performance, RA-27 size); what is not modelled yet; lab guidance. `SIMULATION_ARCHITECTURE.md` 10.2 gets `castRays`, `Ray`, `RayHit`. The doc holds the T-B16-14 hash table and the T-B16-34 numbers, so it is written after both (group G10). If it lists the banned words it does so on one line that starts with `Banned words:`; the greps of T-B16-37 skip that one line.
- Success metric: every number in the doc has a label and the command that reproduced it; no banned word.

**Implementation.**
- Existing files: `docs/MASTER_PLAN/04_ARCHITECTURE/SIMULATION_ARCHITECTURE.md` (E: section 10.2 interface block only; the file is a plan document, edit exactly the `PhysicsWorld` block and add two interfaces).
- New files: `docs/ROBOTICS.md`.
- Algorithm: n/a. Edge cases: if a measurement task did not run (Firefox, x86-64), the doc says UNKNOWN in that cell.
- Permissions, performance, migration: none.

**Verification.**
- Unit tests: none; the gate task greps the doc for banned words and for em dashes.
- Acceptance. Given the doc, When read from the top, Then a new reader can build, run and rerun the determinism check using only commands in it.
- Release blockers: an unlabelled number.

**Delivery.**
- Done when the doc is complete and linked from `README.md`'s docs list (one line; `README.md` is B1's file, edited by this task only for that line; counts as a 3rd file).
- Verify: `TL`; `grep -v '^Banned words:' docs/ROBOTICS.md | grep -niE 'validated|certified|guaranteed|realistic|accurate'` prints nothing; `grep -cP '\x{2014}' docs/ROBOTICS.md` prints 0.
- Documentation: it is the documentation.
- Rollback: revert.
- Later tasks need: nothing.

---

### T-B16-37. Phase gate

**Identity.** T-B16-37; subsystem: release; B16, G11; must; depends on all other tasks; not started.

**Intent.**
- Problem: the phase ends with a green check, the recorded numbers, and Amar's hands-on run.
- Target user: Amar.
- Expected behaviour: run `npm run check` once; collect the numbers (SA-16, RA-01, RA-02, RA-07, RA-27) from the files the earlier tasks wrote; confirm the commit log (one commit per task, author, no trailer lines); confirm no push; write the summary into the commit body of an empty-diff commit `B16 T-B16-37: gate` (or `--allow-empty`); hand the list in section 6 to the orchestrator.
- Success metric: `npm run check` exits 0; the summary table below is filled with measured values or UNKNOWN.

**Implementation.**
- Existing files: none edited. New files: none.
- Algorithm: commands: `PB`; `npm run check`; `grep -v '^Banned words:' docs/ROBOTICS.md | grep -niE 'validated|certified|guaranteed|realistic|accurate'` (prints nothing); `grep -cP '\x{2014}' docs/ROBOTICS.md` (prints 0); `git log build/v1 --format='%an|%s|%b' --grep='^B16 '` and a check that every line has author `Amar Kushwaha` and no `Co-Authored-By` or `Generated with`; `git status --porcelain` clean; `git remote -v` unchanged and no `git push` in the shell history of the run.
- Summary to fill:

| Item | Source | Value |
|---|---|---|
| SA-16 lateral drift, scale 1 | T-B16-10 | to be measured |
| SA-16 wheel speed error | T-B16-10 | to be measured |
| RA-01 Node final hash | T-B16-16 | expected `c6a8e92d6174bd66` |
| RA-01 Chromium, WebKit, throttled | T-B16-14 | to be measured |
| RA-02 templates 1 to 3 across browsers | T-B16-14 | to be measured |
| RA-02 Firefox, x86-64 | T-B16-14 | UNKNOWN unless run |
| RA-07 mean step at 64 bodies, 6x | T-B16-34 | to be measured |
| RA-27 total brotli size | T-B16-16 | expected at most 1,000,000 B (888,151 B documented) |

**Verification.**
- Acceptance. Given the branch, When `npm run check` runs, Then it exits 0. Given the log, Then it shows 41 B16 commits or the number of tasks Amar accepted, all by Amar Kushwaha.
- Release blockers: any red check; any push; a number reported without being measured.

**Delivery.**
- Done when the summary is in the commit body and the orchestrator has section 6.
- Verify: `PB`; `GATE`; the two doc greps above.
- Documentation: none.
- Rollback: the local tag `phase-B15` (made after the previous phase) is the previous rollback point; `phase-B16` is made by the orchestrator after Amar's OK.
- Later tasks need: B17 starts from this tag.

## 6. For Amar (work only a person can do; not build tasks)

| # | Item | When | Why an agent cannot |
|---|---|---|---|
| F1 | Build a robot and run the line follower yourself: open the template, change a number, add a part from the builder, run, break it, find the cause. Tell the orchestrator what confused you. This is the exit gate | After T-B16-37 | The gate is about what a person feels using it; the e2e spec only proves the clicks work |
| F2 | Decide whether to merge `build/v1` or any part of it. Nothing is pushed by agents. A push to `main` deploys production on Vercel (DOCUMENTED, `HANDOFF.md`) | After the phase | Rollout is your call |
| F3 | Choose the licence for the Rapier files. The engine is Apache-2.0 and the manifest carries `reviewed: false` (D-017: licence later) | Before any public release | A legal choice |
| F4 | Run T-B16-14 on an x86-64 machine and on Firefox (`--project=firefox`, B9's project from T-B9-20). RA-01 and RA-02 stay UNKNOWN there until then. Until it passes, rooms compare physics hashes as class D (RC-53) | When you have the machine | Agents have only this arm64 laptop and no Firefox build |
| F5 | Check simulated numbers against a real board: drive the real motors with a multimeter in line and compare stall current, no-load current and speed with the descriptor numbers marked "iynk assumption"; measure the real line-sensor contrast at 3 mm and 30 mm; check the real TB6612 or L298N off state. Send the numbers (bench measurement slot, COMPONENT_SCHEMA 4.6) | Any time | Needs hardware |
| F6 | Decide the size fallback if the split artifact is lost: take the compat file and raise BUD-14 to 1.25 MB (ROBOTICS 16.1). Only needed if T-B16-01 or T-B16-16 fails | If it fails | Changes a budget in the PRD |
| F7 | Read the six-language robot strings, or ask a friend for the language you do not read. The translations are agent-made | Before sharing with friends | Needs a human reader |
| F8 | Review third-party text and numbers in the part descriptors for rewrite (the `docs/facts` sheets quote datasheets and shop pages) | Before a public release | Copyright judgement |
| F9 | Choose whether a hobby weapon-free rule is enough for the robot templates (ROBOTICS 18 says weapon robots are not a template, part kind or AI goal) | Before B17 | A policy choice |

## 7. Open questions and unknowns

| # | Question | Default taken | Who decides |
|---|---|---|---|
| Q1 | Does Rapier 0.21.0 expose joint angle, and can the combine rules and solver iterations be read back? | Compute angle from the relative quaternion with `dmath.atan2`; store what was written and mark `engine_confirmed: false` (T-B16-02 Step 0) | T-B16-02 agent, reported in the commit |
| Q2 | Does `dmath` pass SA-12 on all four browsers (T-B9-20)? | If not, scene building, joint angles and the sensor rays are class N and RA-02 may fail on a last bit | T-B16-14 shows it |
| Q3 | AA packs (alkaline, NiMH) for small robots | Not in B16; the schema allows the enum but the pack refuses without an `ocv_table` | Amar |
| Q4 | Template text in the other five languages | English text in the project files, UI strings in six | Amar |
| Q5 | Symptom id names in T-B16-24 | Proposed list | Amar |
| Q6 | Where `loopPeriodUs` lives: `ext["x-iynk-robot"]` today | Keep until a schema minor adds a field | Amar |
| Q7 | The motor-in-circuit coupling form | Decided by T-B16-21 | The spike |
| Q8 | Which of two cost drivers is real on a phone: step time or readback | UNKNOWN until a baseline device exists (RS-01 follow-up) | Later |
| Q9 | `needsPhysics` rule (robotics domain plus a body) | Proposed | Amar |
| Q10 | Should `ReplayLog` in `project.schema.json` get a `physics` field (a schema minor)? Today the physics settings live in `SimSettings` and are rebuilt from the document at replay (T-B16-32) | Not added | Amar, with the schema owner |
| Q11 | The loop-start signal for `LoopStats`: the MCU engine's own event if T-B3-12 emits one, else a heartbeat pin that the templates toggle (`loopPin`, T-B16-09) | Heartbeat pin | Read in T-B16-09 Step 0; Amar if the pin is unwanted in templates |

Unknowns from ROBOTICS 21 carried unchanged: RK-1 (cross-device determinism, F4), RK-2 (archived JS repo, pinned and vendored), RK-3 (small robot stability, T-B16-34), RK-4 (driver decay mode per module), RK-5 (sensor numbers, F5), RK-6 (rolling resistance, F5), RK-7 (`takeSnapshot`, T-B16-35), RK-8 (CCD and readback cost, T-B16-34).

## 8. Acceptance map

| Acceptance id | Where it is proved |
|---|---|
| RA-01 | T-B16-16 (Node), T-B16-14 (Chromium, WebKit, throttle) |
| RA-02 | T-B16-14 (templates 1 to 3; Firefox and x86-64 UNKNOWN unless F4) |
| RA-03, RA-06 | T-B16-10, T-B16-02 |
| RA-04 | T-B16-02, T-B16-32 |
| RA-05 | T-B16-02 (`lint.test.ts` plants a violation) |
| RA-07 | T-B16-34 (first version), T-B16-17 (limits) |
| RA-08 | T-B16-35 |
| RA-09 | T-B16-23, T-B16-22 |
| RA-10 | T-B16-06 |
| RA-11 | T-B16-11, T-B16-12, T-B16-27, T-B16-28, T-B16-38 |
| RA-12 | T-B16-07 |
| RA-13 | T-B16-08, T-B16-25, T-B16-38, T-B16-15 |
| RA-20 | T-B16-04 |
| RA-21 | T-B16-03 |
| RA-22 | T-B16-32 |
| RA-23 | T-B16-30, T-B16-26, T-B16-31 |
| RA-24 | T-B16-07 (legacy solver numbers), the existing bench tests via `npm run check` |
| RA-25 | T-B16-17 |
| RA-26 | T-B16-33, T-B16-15 |
| RA-27 | T-B16-16 |
| Out of B16 | RA-14 to RA-19, RA-28 (arm, graph, URDF, bridge) |
| R-164 | T-B16-18, T-B16-05, T-B16-17 |
| R-165 | T-B16-02, T-B16-33 (sleeping off, section 1 item 3) |
| R-166 | T-B16-12, T-B16-38, T-B16-14 |
| R-167 | T-B16-07, T-B16-08, T-B16-22 |
| R-168 | T-B16-08, T-B16-23 (distance, line, encoder; IMU later) |
| R-169 | T-B16-12, T-B16-27, T-B16-28 (line follower, drive base, speed control; the PRD's obstacle avoider and the roadmap's four-wheel base are B17 and not a template) |

## Review fixes (2026-10-27)

Twenty-one review issues were checked against the files named in each row. All were applied; four were applied in a changed form, and the reason is in the "Evidence and deviation" column. Labels: VERIFIED means read in a file in this pass.

| # | Issue | Applied | What changed | Evidence and deviation |
|---|---|---|---|---|
| 1 | `ports.ts` imports names B3 does not create; no barrel in B10 | Yes, with one deviation | `ports.ts` now re-exports `rng` from `@/core/prng`; drops `rng` and `units` from the `src/sim/core` list; keeps `clockRate`, `cyclesToNs`, `SimTime`, `ClockRate` (clock) and `fnv1a64`, `StateHasher` (hash); imports `Rule`, `Finding`, `RunFacts` from `@/sim/faults/types`. `Result` comes from `@/core/result` and the descriptor type from `@/parts/descriptor` (found wrong in the same block). Section 2 rows and `REQUIRED` match | VERIFIED: B3 PD-15 (line 126) and T-B3-10 (line 408) say `rng.ts` and `units.ts` are not created; B10 line 235 says there is no barrel. Deviation: the issue said `RunFacts` is in `run-facts`. B10 declares `RunFacts` in `types.ts` (B10 line 220; `run-facts.ts` only holds `runFactsFrom`), so the import and the T-B16-13 edit (`types.ts`, not `run-facts.ts`) follow B10 |
| 2 | Section 0 claims B8, B11, B12, B13, B14 task files do not exist; seam ids unchecked | Yes | False claim deleted. Section 2 is rewritten with a label per row (DOCUMENTED (file read) with line numbers, or DOCUMENTED (roadmap)). B11 ids corrected: the real ids are T-B11-02a, 02b1, 02b2, 02c1, 02c2, 03a, 03b1, 03b2, 05a. T-B8-03, 05, 10, 13, 14 and T-B13-02, 03 confirmed to exist | VERIFIED by `ls tasks/` and `grep -n '^### T-'` on B8, B11, B13, B14. The issue's list "T-B11-02a..c, 03a/03b" is not exact: there is no plain 02b, 02c or 03b |
| 3 | `export * as dmath` is static; fallback contradicts it | Yes | Fallback and `DMATH_IS_REAL` removed. T-B9-20 is a hard dependency; rule row in 0.3 and T-B16-00 say a missing file stops the task | VERIFIED: T-B9-20 is P0 (B9 line 138) and B9 is ordered before B16 |
| 4 | T-B16-01 touches six source files | Yes | The `build-engines.mjs` edit is dropped; `physics:build` is its own command (`PB`). Source files: build script, pin file, `package.json` with lockfile (one file by B9's convention, B9 line 307), vendor tarball = 4 | B9 line 313: `build-engines.mjs` globs `src/sim-host/engines/*.manifest.json`; the pin file is moved to `src/sim-host/engines/physics/rapier.manifest.json` so that glob does not see it (all references updated) |
| 5 | Engine files are git-ignored build output; nothing builds them before the specs | Yes | `physics:build` script added; `&& npm run physics:build` appended to `prebuild` and `pretest` after B9's chain; `PB` added to Verify of T-B16-14, 15, 34, 37 and to T-B16-01; the script also merges the `rapier` entry into `public/engines/manifest.json` | VERIFIED: `package.json:13,20` (`prebuild`, `pretest` call only `npm run content`); `check` at `:23` runs content:check, typecheck, lint, test, e2e. B9 T-B9-07 owns the `prebuild`/`pretest` chain (B9 line 125) |
| 6 | T-B16-03 integration test uses a fixture from T-B16-10, which depends on T-B16-03 | Yes | Line replaced with the `robot-line-follower` example stepped 100 steps; the four-wheel fixture is used only in T-B16-10, 22, 33, 34 | T-B16-10 creates `four-wheel.project.json` and depends on 03 |
| 7 | T-B16-08 uses `worldPose` from T-B16-03, same group | Yes | Depends on T-B16-03; moved to G3. T-B16-22 already depends on 08 (G4) | `worldPose` is declared in T-B16-03; `sensors.ts` is owned by T-B16-08 alone |
| 8 | T-B16-19 imports `Drive`, `Decay` from T-B16-06 in parallel; wrong failure id | Yes | T-B16-19 depends on T-B16-06 and moves to G2; T-B16-07 moves to G3 (it depends on 19); `failure:driver-overcurrent` replaced by `driver-undersized`; truth tables keyed on `core.tb6612fng-module` and `core.l298n-module` | SIMULATION_ARCHITECTURE line 1468 lists `driver-undersized`. Not in the issue: T-B16-11 and T-B16-22 also depend on 19 and stay later than G2 |
| 9 | T-B16-15 scenario 3 needs the `sensor-too-high` detector (T-B16-25) | Yes | T-B16-15 depends on 25 (and 29, 39, 40) and moves to G9. The PID-panel claim is removed from scenario 2 (the line follower prints no PID lines); scenario 2 opens the Loop timing tab instead, and the PID numbers are proved by T-B16-29 and T-B16-38. T-B16-12's diagnosis acceptance now points at T-B16-38 | T-B16-25 is G6; the line follower sketch is `FOLLOW` (`src/content/robotics/qtr-8rc.ts:80`), not a PID sketch |
| 10 | Live-run cases left as `it.todo` and turned on by a later task | Yes | New T-B16-38 (G8, test only, `src/sim-host/mech.run.test.ts`) holds lap and cross-track, the fault findings, the speed step, loop timing through the interpreter and hash stability. The todo and turn-on rule is removed from T-B16-12, 13, 15, 27, 28; T-B16-38 is in the gate and in T-B16-14's dependencies | Deviation: the issue named `src/sim/mech/templates.run.test.ts`. That file would import `prepareMech` from `src/sim-host`, and `sim` may not import `sim-host` (B3 cell M-2 runs the other way, B3 line 141), so the file lives in `src/sim-host` |
| 11 | Nothing wires the UI and results into the app | Yes, as two tasks | T-B16-39 (mount in `Workspace`, New project > Robot in `Home` and `templates.ts`, run hash text in `RunBar`, Problems pane) and T-B16-40 (run-facts adapter, robot store, session routing, `window.__iynkMechHashes`). Each of (a) to (g) has an acceptance line: (a), (b), (c), (g) in T-B16-39; (d), (e), (f) in T-B16-40. Both are in the dependencies of T-B16-14 and T-B16-15 | One task would touch ten files (limit 5). Deviation: the issue put T-B16-39 in G6. It needs the three templates (T-B16-27 in G6, T-B16-28 in G7) because `templates.ts` imports their files, so it is G8 and the data path T-B16-40 is G6 |
| 12 | `versions.rapier` string is about 170 characters; `ReplayLog` has no `physics` field | Yes, with a choice | Pins are `versions.engines['engine:rapier@0.21.0'] = 'sha256:<24 hex of wasm>'` and `engine:rapier-glue@0.21.0` for the JS (31 characters each); full pins stay in the manifest. The `physics` block goes into `SimSettings` (in `src/sim/engine.ts`, an in-memory type edit) and is rebuilt from the document at replay; a schema minor to persist it is open question Q10. `rapierVersionString` becomes `rapierEngineEntries`; `checkVersions` reads `versions.engines`. The "B3 file line 86" citation is dropped | VERIFIED: `project.schema.json` `$defs/ReplayLog.engines` has `maxProperties 16`, value `maxLength 40`, and no `physics` field (read by script); B3 lines 1215, 1218, 1231, 1240, 634. RC-54: engine ids are `engine:<name>@<semver>` |
| 13 | `src/project` imports only `core`; descriptor checks do not belong in it | Yes | `unknown-component` and `not-a-sensor` leave `RefError` (now five codes) and become the `RB-E-SENSOR` rule of `validateRobot` in T-B16-17 (PROPOSAL code, added to the T-B16-30 keys). T-B16-04 no longer depends on T-B16-00 and its Verify adds `ARCH` | SYSTEM 5.3 matrix row `project`: `core` only |
| 14 | UI code imports `src/sim` types | Yes, with a choice | The ten shared shapes are declared once in `src/core/robot-report.ts` (T-B16-00), imported by `src/sim/mech` and by the panels. The "type imports allowed" hedge in T-B16-31 is deleted; T-B16-29, 05, 18 say they import nothing from `src/sim` | SYSTEM 5.3 has no `sim` column for UI or studio; B3 cell M-5 stays closed (B3 line 144). Chosen over `src/studio/robot/types.ts` because `sim` may not import `studio`, so a structural copy would have been a second source of truth |
| 15 | T-B16-26 duplicates B11 descriptors and uses wrong ids | Yes, with a path correction | `mechanics` blocks are added to B11's `core.tt-motor`, `core.lipo-2s`, `core.tb6612fng-module`, `core.l298n-module`, `core.qtr-8rc`, `core.hc-sr04`; only `core.wheel-65`, `core.caster-ball`, `core.chassis-2wd`, `core.tt-motor-encoder` are new. Real ids are used in T-B16-18, 19, 11. Count: edited set, new set, registry file, barrel = 4, so no split | B11 line 671: descriptors are stored flat as `src/parts/data/<slug>.component.json`. The issue's path `modules/qtr-8rc.component.json` is not used (B11 lines 157 to 160 list flat paths). The `hc-sr04` ranger descriptor comes from T-B11-03b1 |
| 16 | Rule id prefix `solved:`; `resets` type conflict; conditional `facts.ts` edit | Yes | All 11 ids use `solve:<name>@1`. `ResetFact` and `RobotFacts.resets: ResetFact[]` are defined in T-B16-22 up front; T-B16-25 has no conditional edit. T-B16-40 joins `RobotFacts.resets` with `RunFacts.resets: SimTime[]` by timestamp | B10 lines 215 to 228, 262 to 268 |
| 17 | T-B16-22 and T-B16-33 reuse the four-wheel fixture without depending on T-B16-10; `prepareMech` in `sim-host` | Yes | T-B16-22 depends on 10 (and 19). T-B16-33 reaches 10 through 22; its Existing files now cite B3 cell M-2 and the `architecture.test.ts` case that allow `sim-host` to import `sim` values | VERIFIED: B3 line 141 (M-2), line 434 (test case). The matrix in SYSTEM 5.3 still says "protocol types only"; B3 widened it |
| 18 | T-B16-36 sits with T-B16-14 and T-B16-34; banned-word grep cannot pass | Yes | Docs move to G10, the gate to G11. The doc keeps the banned-word list on one line starting `Banned words:` and both T-B16-36 and T-B16-37 run `grep -v '^Banned words:' docs/ROBOTICS.md \| grep -niE ...` plus an em-dash count | T-B16-14 is G9 after its new dependencies, so the issue's G8 and G9 shifted |
| 19 | T-B16-14 Playwright project filters not specified | Yes, with a change | Exact config diff given: `chromium` `testIgnore` gains `physics-compare`; `webkit` `testMatch` gains `physics-hash`; B9's existing `firefox` project gains `physics-hash` (no second firefox project; `E2E_FIREFOX` is dropped); the comparer is its own spec in a `physics-compare` project with `dependencies: ['chromium', 'webkit']` | Deviation: the issue asked for a `@compare` describe in `chromium` depending on `webkit`. B3 solved the same need with the `r048` project (B3 lines 1482 and 1483), and a Chromium dependency on WebKit would run WebKit's `core.spec.ts` on every Chromium run. B9 line 494 already adds the `firefox` project |
| 20 | RS-13 scripts will be linted and type-checked; checkpoints source is wrong | Partly right | `src/sim/mech/fixtures/rs13/**` is added to `globalIgnores` in T-B16-02's `eslint.config.mjs` edit. The ten checkpoints come from `RS-13.../src/results/node.json` key `runs[0].hashes` | VERIFIED: `eslint .` lints `.mjs`; but `tsconfig.json` has `allowJs: true`, no `checkJs`, and an `include` with no `.mjs` glob, so tsc reports nothing on the scripts and needs no exclude. `node.json` has the ten hashes of the rapier run ending in `c6a8e92d6174bd66` |
| 21 | T-B16-09 acceptance needs the interpreter; loop event unconfirmed | Yes | Acceptance is now 200 synthetic timestamps at 10.2 ms spacing. The interpreter-driven `delay(10)` check is case 5 of T-B16-38. `LoopSource` is the MCU loop event if Step 0 finds one, else a heartbeat pin named in `ext["x-iynk-robot"].loopPin`, which templates 3 and 2 toggle | VERIFIED by grep: no B3 or B8 task file names a loop-start event, so this plan does not invent a kind name. Open question Q11 |

Found in the same pass (not in the issue list):

| Finding | Fix |
|---|---|
| T-B16-35 reads the artifact hook of T-B16-16, both G2 | T-B16-35 depends on 16 and moves to G3 |
| T-B16-17 reads `en/robot.json` in its tests without depending on T-B16-30 | Dependency added |
| T-B16-14 lists the fixture owner wrongly ("T-B16-10 ... T-B16-14") | T-B16-10 "Later tasks need" corrected to T-B16-22, 33 |
| T-B16-33 posted only frames and problems; no message carried checks, coupling, run hash, loop stats | `robot_problems` carries checks and coupling; new `mech_report` carries `runHash`, `checkpoints`, `run`, `loop` |

Group and ownership tables (sections 3 and 4) are rewritten to match: 12 groups (G0 to G11), 41 tasks, one owner per file per group. For Amar: items F1 to F9 are unchanged except F4, which now names B9's Firefox project; the new open questions are Q10 and Q11.
