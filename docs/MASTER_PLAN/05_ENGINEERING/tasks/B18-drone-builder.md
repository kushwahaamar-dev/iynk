# B18 Drone creation: parts, propulsion, builder. Atomic task packages

Written 2026-10-27 for the build plan step. Plan only: no file under `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed to write it, and nothing was committed. Scratch work (a closed-form solve check) is in `/Users/amar/iynk-master-plan-scratch/buildplan/b18/`.
Phase goal: design a multirotor from parts and see the numbers before flying. Calculator guards, swept collision, safety notices, drone parts as data, closed-form propulsion with an error band, endurance, the 14 design checks, a builder UI, a generic craft figure, a BOM, the game flight model driven by a user build, and an optimiser over the parts library.
Scope: F-068, F-069, F-216, F-217 (side-by-side comparison of build numbers only, see Q8); R-172 to R-179; DRONE slices D0 to D2. Not in scope: the rigid-body model, controller and sensors (B19), flight traces and plots (B19, D4), environment and failure models (F-218, D5), PX4 SITL (D8), and any guidance for weaponised or harmful craft (R-179).
Exit: `KL NEXT_DIST_DIR=.next-build npm run check`; SA-13 and DA-01 to DA-05, DA-11, DA-14 to DA-17, DA-20, DA-24 recorded in `docs/DRONES.md`. Then Amar's OK.
Depends on phases B13 (the 13 craft as Studio projects) and B11 (parts as data, part editor, packs). Through the roadmap chain it also needs B2 (project core, `domain.patch`, part registry), B3 (`src/sim/core`, orchestrator, cause-id registry), B4 (Studio shell) and B8 (fidelity registry).
Labels: VERIFIED (read or run in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.

## 1. What this phase starts from

`ls src` prints `app components content i18n lib`. No `src/sim`, `src/project`, `src/parts`, `src/studio`, `src/export` or `src/local` exists yet (VERIFIED). B2 to B13 are not built. Task files for B2 to B20 now exist in `tasks/` (VERIFIED by `ls`). Every path from an earlier phase below is therefore taken from `IMPLEMENTATION_ROADMAP.md` or those task files (DOCUMENTED), not from code. Each task starts with a precondition check (section 4).

| Fact | Evidence | Label |
|---|---|---|
| `calc` is at `src/lib/drone/calc.ts:169`, `designChecks` at `:300`, constants `HOVER_THR_LIMIT 0.6`, `LIION_CELL_A 45`, `SHORT_FLIGHT_MIN 2` at `:270-274`. The file is 344 lines with zero imports. `DRONE_ARCHITECTURE.md` says `calc.ts:151`; that is stale | `grep -n` on `calc.ts` | VERIFIED |
| `calc` does no input checking: `mah = 0` gives `Infinity` hover minutes (`minutesAt` at `calc.ts:195` divides by `hoverA`) | read `calc.ts:169-262` | VERIFIED |
| Callers of `calc` outside tests: `src/content/drones/_checks.ts:10`, `src/components/dronelab/FlyWorkspace.tsx:21`, `components/dronelab/data.ts:8`, `src/lib/dronelab/fly.ts:3`, `store.ts:4`, `src/lib/search/optimize.ts:2`, `src/lib/drone/design.ts:2` | `grep -rn "drone/calc"` | VERIFIED |
| Calculator inputs in the 13 crafts span 1 to 14 cells, 250 to 30,000 mAh, kv 100 to 920 for the wing and VTOL ranges, 1 to 8 motors, parts of 0 to 9,800 g | `grep -ho` over `src/content/drones/*.ts` | VERIFIED |
| `designInput` throws on a pick not in the 3 x 3 x 3 list (`design.ts:16-18`); the optimiser enumerates `batts x motors x props` (`src/lib/search/optimize.ts:116-124`, 186 lines) with live prices | read both files | VERIFIED |
| `src/lib/flight/sim.ts` is 1,028 lines. Function map: `createSim :103`, `dispatch :220`, `stepSim :308`, `autopilot :345`, `missionVelocity :414`, `multirotorStep :501`, `vtolTransition :635`, `wingStep :654`, `followersStep :761`, `groundContact :779`, `crash :813`, `worldChecks :821`, `batteryStep :923`, `frameOf :966`, `replay :1008` | `grep -n "^function\|^export function"` | VERIFIED |
| `STEP = 0.01` s (`sim.ts:20`). The sphere test runs once per step at the end position: `collide(s.solids, s.p[0], s.p[1], s.p[2], c.hitRadius)` (`sim.ts:843`). The previous position `prev` is rebuilt as `p - v * STEP` (`sim.ts:823`) and used only by gates and checkpoints | read `sim.ts:820-905` | VERIFIED |
| `collide` is `src/lib/flight/world.ts:139`; the other caller is the route planner's sampled test `route.ts:31` (step `max(0.04, m * 0.5)`). `DRONE_ARCHITECTURE.md` and `SIMULATION_ARCHITECTURE.md` say `world.ts:117`; stale | read `world.ts`, `route.ts` | VERIFIED |
| Tunnelling arithmetic: a 20 m/s craft moves 0.2 m per step. A pole of radius 0.08 m with hit radius 0.03 m is a disc of radius 0.11 m to the point test. A path offset by `y` crosses it in a chord of `2 * sqrt(0.11^2 - y^2)`, which is under 0.2 m when `abs(y) > 0.0458 m`. Some start phases then land no sample inside the disc. The default hit radius floor is 0.03 (`registry.ts:174`) | arithmetic here; reproduced by T-B18-02a | ESTIMATED (reproduced as a test in 02a) |
| Flight tests today: `src/lib/flight` 86 tests in 4 files, `src/components/flight/FlightRange.test.tsx` 10 tests. 86 + 10 = 96, which is the "96 flight tests" of SA-13. Whole drone and flight area: 17 files, 581 tests, all pass in 4.5 s | `npx vitest run src/lib/flight`, `src/components/flight/FlightRange.test.tsx`, and the area run | VERIFIED (the reading that the 96 are these two folders is HYPOTHESIS) |
| `src/lib/drone` holds the 342 golden rows (`__fixtures__/golden-a.json`, `golden-b.json`, `calc.test.ts`) and passes 445 tests in 6 files | `npx vitest run src/lib/drone` | VERIFIED |
| Game battery: OCV tables per chemistry `battery.ts:4-8`, `LIMITS` `:11-15`, `IR_AH` `:18`, `cellResistance :29`, `stepBattery :65`. Chemistries are `lipo`, `lihv`, `liion` only (`types.ts:6`) | read `battery.ts` | VERIFIED |
| Ghost key `iynk:ghost:v1:${craft}:${course}` (`ghost.ts:111`, `keyOf`); daily best key `iynk:challenge:v1:${date}` (`challenge.ts:88`); medals from `parOf`/`medalFor` (`registry.ts:277-290`), gold 0.85 and bronze 1.4 of the silver time | read the files | VERIFIED |
| `FlightRange` takes `craft: FlightCraft` and `calc: CalcOutputs` (`FlightRange.tsx` props block, lines 56-80). `CalcOutputs` has 10 fields (`types.ts:9-20`). A user build needs only these two objects | read | VERIFIED |
| `flightCraft(content)` builds a `FlightCraft` from `DroneContent`; the hit radius rule is `max(0.03, armLen + propR * 0.5)` (`registry.ts:174`); `DEFAULTS` is a private const at `registry.ts:32` | read | VERIFIED |
| `component.schema.json` has a `mechanics` block (minor 1.1) at line 1435 with sub-objects `motor` (`kv_rpm_per_v` or `ke_vs_per_rad`, `r_ohm`, `i_noload_a`, `v_max`, `i_max_a`, `i_burst_a`, `j_kgm2`, `mass_g`, `stator_mm`), `prop`, `esc`, `battery`, `frame`, `fc`, `servo`, `stepper`, `driver`, `encoder`, `wheel`, `sensor` and `mass_g` | read schema lines 1435-1660 | VERIFIED |
| `DRONE_ARCHITECTURE.md` 6.1 names the brushless key `bldc` and the propeller key `rotor`; the schema and `COMPONENT_SCHEMA.md` 4.18 name them `motor` and `prop`. See Q1 | both files | VERIFIED |
| `drone.domain.schema.json` (`urn:iynk:schema:drone-domain:1.0`) fixes `DroneData`: `kind`, `legacy`, `thrustSource`, `motors` (3 to 12 slots: `id`, `motor`, `prop`, `esc`, `esc_channel`, `mount`, `spin`, `prop_spin`), `battery` (`cmp_`), `controller` (`brd_`), `fcParams`, `flight`, `environment`, `course`, `bench`, `ext`. Rigid model requires `step_hz` and `pid_hz` | read the schema | VERIFIED |
| Project `mechanical` has `frames`, `bodies` (`mass_g`, `shape` box/cylinder/sphere, `com_mm`, `inertia_g_mm2`, `component`), `joints`, `mounts` (`id mnt_`, `component`, `frame`, `pose {position_mm, rpy_deg}`). `drone-quad.project.json` has 8 bodies and 4 motor frames | read schema and example | VERIFIED |
| Op kinds `domain.set` (import and migration only) and `domain.patch` (RFC 7396 merge patch) exist in `project.schema.json:5548,5572`. A merge patch replaces arrays whole | read | VERIFIED |
| Component category enum includes `drone` and `robotics`; kinds include `actuator`, `module`, `board`, `mechanical` | read schema `identity` | VERIFIED |
| Cause ids that DB-C checks map to exist in the 45-id registry: `hover-throttle-too-high`, `thrust-to-weight-low`, `esc-overcurrent`, `battery-overcurrent`, `prop-clash`, `cg-offset`, `props-swapped` | `SIMULATION_ARCHITECTURE.md` 13.4 lines 1476-1483 | DOCUMENTED |
| No banned word (`safe to fly`, `certified`, `validated`, `guaranteed`, `approved`) appears in `src/i18n/messages/en`, `src/i18n/content/en/drones` or `src/content/drones` | `grep -rniE` printed nothing | VERIFIED |
| No `restricted` field exists in `component.schema.json`; top-level `x_*` keys are allowed by the schema. DA-15 names `restricted: true`, so this plan carries it as `x_restricted` | `grep restricted` in the schema printed nothing | VERIFIED |
| `DRONE_ARCHITECTURE.md` 6.2 closed-form solve runs: with `kv 1750, R 0.045, I0 1.5, D 0.1295 m, ct0 0.12, cp0 0.06` it gives 8.17 N and 16.9 A per motor at 16 V, torque residual 2.2e-16 N m. These are my test parameters, not a claim about a real motor | `prop.mjs` in the scratch folder | VERIFIED (the arithmetic only) |
| Next.js is 16.4.3; the lazy-loading guide is `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` | `package.json`, `ls` | VERIFIED |
| RS-14 (PX4 SIH oracle) never ran. The label of the rigid model is B19's problem, not this phase's | `DRONE_ARCHITECTURE.md` 13 | DOCUMENTED |
| Redistributable motor and propeller data: the UIUC propeller database licence and coverage are UNKNOWN. No hardware data exists in the repo | `DRONE_ARCHITECTURE.md` DK-1, DK-2 | UNKNOWN |

## 2. Decisions this plan makes, and the questions it leaves

Where two design documents disagree, `RECONCILIATION.md` decides; where it is silent the JSON schema is the contract (RC-37 is the precedent). Each default lets agents proceed; Amar can overrule at the phase stop.

| # | Question | Sources that disagree | Default in this plan | Label |
|---|---|---|---|---|
| Q1 | Key names of the drone part blocks | `DRONE_ARCHITECTURE.md` 6.1 and review fix 1: `mechanics.bldc`, `mechanics.rotor`. `component.schema.json:1435+` and `COMPONENT_SCHEMA.md` 4.18: `mechanics.motor` (brushed or brushless, brushless has `kv_rpm_per_v`), `mechanics.prop` | The schema wins. A drone motor is a descriptor with `identity.category` `drone` and `mechanics.motor.kv_rpm_per_v`. A prop is `mechanics.prop`. `E-MECH-KEY-CLASH` is dropped because there is no second key to clash with. The orchestrator should correct `DRONE_ARCHITECTURE.md` 6.1 and 15 | DOCUMENTED |
| Q2 | Battery chemistry set | Schema: `lipo lihv liion nimh lifepo4 alkaline`. Game: `lipo lihv liion` | The builder flies `lipo`, `lihv`, `liion`. Any other chemistry is the structural error `DB-E-CHEMISTRY` ("not flyable in this model") | DOCUMENTED |
| Q3 | What `r_cell_ohm` and `capacity_mah` mean for a pack with `parallel` greater than 1 | Schema is silent | `capacity_mah` is the whole pack, as on the label and in the legacy catalogue (`from-calc.ts:10`). `r_cell_ohm` is the resistance of one series position (a cell or a parallel group). Pack resistance is `cells * r_cell_ohm`. `parallel` only sets the Li-ion current limit in DB-C-04 (`LIION_CELL_A * parallel`, `calc.ts:289-293`) | HYPOTHESIS |
| Q4 | Where the game flight model lives after the split | Roadmap T-B18-02 edits `src/lib/flight/*`; T-B19-11 edits `src/sim/flight/*.ts` for `dmath` | B18 splits `src/lib/flight/sim.ts` into modules **inside `src/lib/flight/`** (behaviour-preserving moves, tests stay put). All new pure code goes to `src/sim/flight/` (portable, ADR-0014). B19 decides whether to move the game files. The orchestrator should adjust T-B19-11's file list when B19 is planned | DOCUMENTED |
| Q5 | Which numbers are class B and which class N | `DRONE_ARCHITECTURE.md` 15 marks DA-01, DA-11 B and DA-04, DA-05, DA-17 N | New B18 code uses only `+ - * /`, `Math.sqrt`, `Math.abs`, `Math.min`, `Math.max` in propulsion, battery, endurance and fit, so it is likely cross-engine exact, but B18 claims class N only. Cross-engine bit-equality is B19's gate (DA-07, SA-12). Mass and inertia code may use `Math.sin` and `Math.cos` for rotated bodies (class N) | ESTIMATED |
| Q6 | `domain.patch` replaces arrays whole, so two buddies editing different motor slots overwrite each other (`DRONE_ARCHITECTURE.md` Objection 4 wanted patches, but `motors` is an array in a binding schema) | `project.schema.json` `domain.patch`; `drone.domain.schema.json` `motors` | T-B18-04 writes slot edits as one patch per edit with the whole `motors` array. The last write wins on a slot conflict. Escape: the host holds the baton in a room (B7). Not fixed in B18. If Amar wants per-slot merge, the schema needs `motors` as a map, a schema change that is his call | HYPOTHESIS |
| Q7 | Where a datasheet fit and a price live on a descriptor | Schema has `mechanics.prop.ct0/cp0` and no place for rows, residuals or prices | Top-level tool keys `x_fit` and `x_price` (the schema allows `x_*`). Shapes are fixed in T-B18-06b and T-B18-05b. They are not in the contract schema; B11's validator copies `x_*` through (T-B11-01 edge case) | DOCUMENTED |
| Q8 | F-217 is "flight traces and configuration comparison". Traces need the rigid model (B19) | `FEATURE_CATALOGUE.md` F-217; `DRONE_ARCHITECTURE.md` Objection 1; roadmap B18 scope lists F-217 | B18 builds the **comparison of two builds' computed numbers** (R-173 side by side, T-B18-09f). Trace recording, plots and the first-difference marker (R-175) go to B19. R-175 is therefore not closed in B18 | DOCUMENTED |
| Q9 | Roadmap T-B18-12 cites DA-20 for the optimiser; DA-20 is the game-model label (Objection 7). T-B18-11 cites DA-02 | roadmap lines 1066-1067 | DA-20 is proven by T-B18-11c. The optimiser has its own acceptance cases and no DA number | DOCUMENTED |
| Q10 | The optimiser needs prices; R-183 (catalogue prices) is B20 | R-178, R-183 | The optimiser takes a `PriceTable` argument. T-B18-05b to 05d give each shipped part an `x_price` with `as_of` and `estimate: true`. No network call. A part with no price cannot be used under a budget and the result says so | DOCUMENTED |
| Q11 | The 13 existing crafts are `legacy-craft` projects (B13). They keep `legacy-calc` and `flight-game@1`. Only `kind: "multirotor"` projects use the parts calculator | `DRONE_ARCHITECTURE.md` 3.3, 6.5 | A craft has exactly one thrust source. Replacing a part in a legacy craft flips the whole craft to `parts` with a visible message (T-B18-09d2). The 342 golden rows and 13 content test files are never edited | DOCUMENTED |
| Q12 | Shipped part data: first set from "10 motors and 10 propellers with redistributable data" (council Q12) cannot be promised | DK-2 UNKNOWN | T-B18-05b to 05d ship **generic** parts authored by iynk, every number an `assumption` in the three-slot rule, status `partly-modelled`, tier T1, `known_gaps` "not checked against a real part". Spike T-B18-S1 finds out whether real data can be redistributed. Real datasheet parts are added by the person through the entry form (R-173) | ESTIMATED |
| Q13 | The 20-prompt refusal set (DA-15) needs a model to answer | R-024, DA-15 | CI proves the structure: the set exists with at least 20 prompts, the partner system prompt and tool schema carry the rule, and no tool can add a restricted part or mode. A live-model run is a manual command with Amar's own key and is listed under "For Amar". CI does not claim the model refuses | HYPOTHESIS |
| Q14 | `FEATURE_CATALOGUE.md` says F-216 EXTENDs `src/components/dronelab/DesignPanel.tsx`; B13 moves the drone lab into Studio | F-216 row; roadmap B13 | `DesignPanel.tsx` keeps serving the 13 legacy crafts until Amar retires the old page. The builder is new Studio components in `src/components/studio/drone/`. No edit to `DesignPanel.tsx` | DOCUMENTED |
| Q15 | The error band. `DRONE_ARCHITECTURE.md` 6.3 says the band is the larger of the two RMS residuals; DA-05 requires the displayed band to cover the actual error at 90 percent of held-out points. An RMS covers about 68 percent of a normal error | DA-05 is the acceptance test and wins. Band = `1.645 * max(rms_thrust, rms_current)` (the two-sided 90 percent factor for a normal residual). The factor is one named constant. S2 checks it against published tables | ESTIMATED |
| Q16 | Check result values. `DRONE_ARCHITECTURE.md` 8.1 allows `ok`, `warn`, `fail`; DB-C-13 is "an informational chip" | 8.1 | `BuildCheck.result` also allows `info`, used by DB-C-13 only. `short-flight` stays `warn` for DB-C-09 as the doc says (the legacy level was `info`, `calc.ts` `checkLevel`) | DOCUMENTED |

## 3. Task index

Group = parallel group (section 5). Priority P0 blocks the exit gate; P1 is in the gate but another task can proceed without it; P2 can be cut at the stop. Size is ESTIMATED focused agent time: S under 2 h, M 2 to 5 h, L over 5 h. "Roadmap row" is the row of `IMPLEMENTATION_ROADMAP.md` the task comes from; letters are splits made to keep to 5 files.

| ID | Task | Group | Pri | Size | Depends on (this phase) | Roadmap row |
|---|---|---|---|---|---|---|
| T-B18-01 | Calculator guards: `calcChecked`, typed `out-of-range` errors, no NaN or Infinity out (DA-01) | 1 | P0 | M | none | T-B18-01 |
| T-B18-02a | Baseline: flight test counts, craft replay hashes, tunnel reproduction with the old test (SA-13, DA-11 first half) | 1 | P0 | M | none | T-B18-02 (part) |
| T-B18-02b | Swept collision primitive `src/sim/flight/collide.ts` | 1 | P0 | M | none | T-B18-02 (part) |
| T-B18-03a | Safety notices SN-1 to SN-8 as data; namespaces `drone` and `dronebuild` scaffolded; banned-word string gate (DA-14) | 1 | P0 | M | none | T-B18-03 (part) |
| T-B18-04 | `domains.drone` op helpers and semantic checks | 1 | P0 | M | none | T-B18-04 |
| T-B18-05a | Mechanics readers: typed blocks, missing-field list, kv and ke consistency (DA-03 half) | 1 | P0 | M | none | T-B18-04 (mechanics half) |
| T-B18-S1 | Spike: can 10 motors and 10 propellers be shipped with redistributable data? (verdict only) | 1 | P1 | M | none | new |
| T-B18-02d | Split 1: `state.ts` out of `sim.ts` (types, `STEP`, `emit`, small helpers) | 2 | P0 | M | 02a | T-B18-02 (part) |
| T-B18-03b | Content rule check and dual-use refusal set (DA-15) | 2 | P0 | M | 03a | T-B18-03 (part) |
| T-B18-06a | Closed-form propulsion solve, pack coupling, duty search (DA-04, DA-01) | 2 | P0 | L | 01, 05a | T-B18-06 (part) |
| T-B18-07a | Battery model in `src/sim/flight/battery.ts`; game battery reads the same tables | 2 | P0 | M | 01, 02a | T-B18-07 (part) |
| T-B18-08a | Mass, centre of mass and inertia tensor (DA-17) | 2 | P0 | M | 01 | new |
| T-B18-08b | Generalised prop clash rule (DA-16) | 2 | P0 | M | 01 | T-B18-08 (part) |
| T-B18-02e | Split 2: `autopilot.ts` and `scoring.ts` out of `sim.ts` | 3 | P0 | M | 02d | T-B18-02 (part) |
| T-B18-05b | Generic drone motors and propellers (data set) | 3 | P0 | L | 05a, 06a, 03b | T-B18-05 (part) |
| T-B18-05c | Generic batteries and ESCs (data set) | 3 | P0 | M | 05a, 07a, 03b | T-B18-05 (part) |
| T-B18-05d | Generic frames and flight controllers (data set) | 3 | P0 | M | 05a, 03b | T-B18-05 (part) |
| T-B18-06b | Datasheet fit with residuals and error band (DA-05) | 3 | P0 | L | 06a | T-B18-06 (part) |
| T-B18-07b | Endurance: stepped hover to cut-off, range from the band | 3 | P0 | M | 06a, 07a | T-B18-07 (part) |
| T-B18-02f | Split 3: `multirotor.ts`, `wing.ts`, `swarm.ts` out of `sim.ts` | 4 | P0 | L | 02e | T-B18-02 (part) |
| T-B18-03c | `SafetyNotice` and first-flight panel | 4 | P0 | M | 03a | T-B18-03 (part) |
| T-B18-08c | Checks DB-C-01 to DB-C-14 and structural errors | 4 | P0 | L | 01, 06a, 07b, 08a, 08b | T-B18-08 (part) |
| T-B18-09b | Part picker with compatibility flags | 4 | P0 | M | 05a to 05d, 03a | T-B18-09 (part) |
| T-B18-10a | Generic craft figure from the document (DA-24) | 4 | P0 | M | 05a | T-B18-10 (part) |
| T-B18-S2 | Spike: how far off is the model on published motor tables? (DK-1) | 4 | P1 | M | S1, 06b | new |
| T-B18-02c | Swept test wired into the flight sim (SA-13, DA-11 second half) | 5 | P0 | M | 02b, 02e | T-B18-02 (part) |
| T-B18-09a | Build extraction from a project and `evaluateBuild` (the numbers engine) | 5 | P0 | L | 04, 05a to 05d, 06b, 07b, 08a, 08c | T-B18-09 (part) |
| T-B18-09e | Part entry form from datasheet rows (R-173) | 5 | P0 | L | 05a, 06b, 03a | T-B18-09 (part) |
| T-B18-11c | Model-keyed ghosts and medals; "tuned to feel" label (DA-20) | 5 | P0 | M | 03a | T-B18-11 (part) |
| T-B18-09c | Numbers panel and checks list | 6 | P0 | M | 09a, 03c | T-B18-09 (part) |
| T-B18-10b | Drone BOM with SN-8 header (DA-14) | 6 | P1 | M | 09a, 03a | T-B18-10 (part) |
| T-B18-11a | `calcFromBuild` and `fromBuild` for the game model | 6 | P0 | M | 09a | T-B18-11 (part) |
| T-B18-12a | Optimiser over the parts library | 6 | P1 | L | 09a | T-B18-12 (part) |
| T-B18-09d1 | Build hook, slots editor and layout writers | 7 | P0 | M | 04, 09a, 09b | T-B18-09 (part) |
| T-B18-09f | Compare two builds side by side | 7 | P1 | M | 09a, 09c, 09e | T-B18-09 (part) |
| T-B18-11b | Flight craft derived from a build | 7 | P0 | M | 11a | T-B18-11 (part) |
| T-B18-12b | Optimiser panel | 7 | P2 | M | 12a, 09c, 10b | T-B18-12 (part) |
| T-B18-09d2 | Builder shell, legacy-to-parts flip, Studio mount | 8 | P0 | M | 09d1, 09c, 09e, 10a, 03c, 10b | T-B18-09 (part) |
| T-B18-11d | Fly tab: your build on the flight range | 8 | P0 | M | 11b, 11c | T-B18-11 (part) |
| T-B18-09g | Builder tabs: Compare, Optimise, Fly | 9 | P0 | M | 09d2, 09f, 11d, 12b, 10a, 10b | T-B18-09 (part) |
| T-B18-13 | End to end: build, read the numbers, fly it | 10 | P0 | L | all | T-B18-13 |
| T-B18-14 | `docs/DRONES.md`, the verification record and the exit gate run | 10 | P0 | S | all | new |

Counts: 42 tasks (the 40 of the first draft, with T-B18-09d split in two and T-B18-09g added), of which 2 are spikes (verdict files only). Priority P0 blocks the exit gate, so a cut P1 or P2 task (09f, 10b, 12a, 12b) also removes its tab in 09g.

## 4. Rules every task obeys

| Rule | Detail |
|---|---|
| Branch and commit | Local branch `build/v1`. One commit per task, authored as Amar Kushwaha, message `B18 T-B18-<id>: <what>`, no `Co-Authored-By` and no "Generated with" line. Never push, never deploy (a push to `main` deploys production on Vercel, roadmap 2.1). |
| Off limits | No production service, no `.env.local` value, ports 3000 and 43117. Verification is keyless on a local build; `KL` is the roadmap 2.3 prefix. |
| Precondition check | Before editing, run `ls` or `grep` on every file from an earlier phase that the task names. If a name or signature differs, keep the earlier phase's name, adapt the new code, and say so in the commit body. If a whole module is missing, stop and report; do not widen the task. Names expected from earlier phases: `ProjectSession`, `mergePatch` (T-B2-05), `ComponentDescriptor`, `validateDescriptor` (T-B2-11, T-B11-01), the `parts` store (T-B11-13), cause-id registry `src/sim/faults/cause-ids.ts` (T-B3-20), `src/sim/core` clock and RNG (T-B3-10), Studio shell `src/components/studio/*` (T-B4-01), `CraftPanel.tsx` at `src/components/studio/lab/CraftPanel.tsx` (T-B13-08, `B13-labs-robotics-drones.md` line 1047) and the 13 craft projects at `content/projects/drones/{a,b}/<id>.project.json` (T-B13-06 and 07, `B13-labs-robotics-drones.md` line 84). The B11 parts store is `PartsRepository` in `src/local/parts-store.ts` (T-B11-13, `B11-components.md` line 371: `createIndexedDbPartsRepository`, `createMemoryPartsRepository`, `PartsRepository`, `PartRecord`, `PutResult`, `partKey`); the app-level save is `PartLibrary.save(def, files)` in `src/parts/browser/library.ts` (T-B11-16, `B11-components.md` line 1185). |
| Schema paths | The schemas and examples live in `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/` (for example `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/drone.domain.schema.json`, `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/drone-quad.project.json`, `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components/`). There is no `schemas/` folder at the repo root (VERIFIED: `ls schemas` fails) and B2 does not copy them into `src/` (roadmap line 1216). Every test or script that reads these files uses the full prefix, or imports `SCHEMA_DIR` from `scripts/schema-gen.mjs` (T-B2 schema-gen) when that file exists. |
| Next.js | Next 16.4.3. Before naming any Next API read the guide in `node_modules/next/dist/docs/01-app/` (`AGENTS.md`). This phase needs only client components mounted through `next/dynamic` with `ssr: false` (`02-guides/lazy-loading.md`, read). No route handler, no Server Action, no `proxy.ts`. |
| Portable code | Files in `src/sim/flight`, `src/project`, `src/parts`, `src/export` import no `@/*`, React, `next`, Node built-in or DOM global (ADR-0014; ESLint rule from T-B2-01; check `npx tsc -p tsconfig.portable.json`). Lint also bans `Date.now` and `Math.random` in `src/sim` (T-B3-10). Randomness in tests comes from a seeded generator written in the test file. |
| 5-file rule | At most 5 source files per task. A set of data files of one kind, or one i18n namespace in six languages, counts as 1. Test files and fixtures count as 0. |
| Units | SI inside `src/sim/flight`: newtons, metres, seconds, volts, amps, ohms, kg m^2. Part data keeps its hobby units (`kv_rpm_per_v`, `mm`, `g`, `mah`) and is converted once at the reader (T-B18-05a). Field names carry the unit suffix (RC-42). |
| Labels in the UI | Every computed number shows its unit as text and its tier chip T1 (`DRONE_ARCHITECTURE.md` 18). The word list in DA-14 is banned in every shipped string. |
| API contracts | None. This phase adds no HTTP route and no server code (roadmap B18: "APIs: None"). |
| Permissions | Everything is by the local person on their own device. In a room (B7) a drone edit is an op through `ProjectSession`, subject to the room's roles. The new code adds no role. |
| Observability | No telemetry leaves the browser (D-015). Failures go to the local `errors` store as `{where: 'drone.<area>', message}` with codes and no part text. User-visible reasons are shown in the UI. |
| Migration | None unless a task says so. No stored data changes shape in this phase (the ghost key for the game model stays as it is, T-B18-11c). |
| Done means | `npm run typecheck` and `npm run lint` print zero errors; the named tests pass; `git status` shows only the task's files; the commit exists. |
| Rollback | `git revert <commit>` for the task, later groups first. Local tag `phase-B18` after Amar's OK is the phase rollback point. |
| Verify abbreviations | `TL` = `npm run typecheck && npm run lint`. `V <p>` = `npx vitest run <p>`. `P` = `npx tsc -p tsconfig.portable.json`. `E <spec>` = `KL NEXT_DIST_DIR=.next-build npx playwright test <spec>`. Each package also writes the literal commands. |
| Behaviour guard | Every task that touches `src/lib/flight`, `src/lib/drone` or `src/content/drones` also runs `npx vitest run src/lib/flight src/lib/drone src/lib/dronelab src/components/flight src/content/drones` and the baseline test from T-B18-02a. A change in a golden row, a replay hash or a test count is a stop-and-report, not a fix (D-014: thresholds are Amar's). |

## 5. Parallel groups and file ownership

Groups run in order. Tasks in one group touch disjoint files (checked in the ownership table) and can be built by separate agents at once. A group starts after every task of the earlier groups is committed and its verify commands pass. `src/lib/flight/sim.ts` is edited by 02d, 02e, 02f in groups 2, 3, 4 and by nothing else until 02c touches the files the split created.

| Group | Tasks (run at once) | Starts when | What the group leaves behind |
|---|---|---|---|
| 1 | T-B18-01, 02a, 02b, 03a, 04, 05a, S1 | B13 exit gate passed | Guards; baseline fixtures and the tunnel reproduction; swept primitive (not wired); notices data and two namespaces; drone op helpers; mechanics readers; spike verdict |
| 2 | T-B18-02d, 03b, 06a, 07a, 08a, 08b | Group 1 | `state.ts`; content rule check; propulsion solve; battery model; mass and inertia; clash rule |
| 3 | T-B18-02e, 05b, 05c, 05d, 06b, 07b | Group 2 | `autopilot.ts`, `scoring.ts`; the generic parts as data; datasheet fit; endurance |
| 4 | T-B18-02f, 03c, 08c, 09b, 10a, S2 | Group 3 | Sim split done; notice UI; the 14 checks; picker; craft figure; accuracy verdict |
| 5 | T-B18-02c, 09a, 09e, 11c | Group 4 | Swept test live (SA-13 closes); `evaluateBuild`; entry form; model-keyed ghosts and medals |
| 6 | T-B18-09c, 10b, 11a, 12a | Group 5 | Numbers panel; BOM; `calcFromBuild`; optimiser |
| 7 | T-B18-09d1, 09f, 11b, 12b | Group 6 | Build hook, slots editor, layout writers; compare view; craft from build; optimiser panel |
| 8 | T-B18-09d2, 11d | Group 7 | Builder shell in Studio; Fly tab component |
| 9 | T-B18-09g | Group 8 | Compare, Optimise and Fly tabs mounted in the builder |
| 10 | T-B18-13, 14 | Group 9 | `e2e/drone-build.spec.ts`; `docs/DRONES.md` and the recorded numbers |

Dependency edges (task: needs): 02d: 02a. 02e: 02d. 02f: 02e. 02c: 02b, 02e. 03b: 03a. 03c: 03a. 05b: 05a, 06a, 03b. 05c: 05a, 07a, 03b. 05d: 05a, 03b. 06a: 01, 05a. 06b: 06a. 07a: 01, 02a. 07b: 06a, 07a. 08a: 01. 08b: 01. 08c: 01, 06a, 07b, 08a, 08b. 09a: 04, 05a, 05b, 05c, 05d, 06b, 07b, 08a, 08c. 09b: 05a, 05b, 05c, 05d, 03a. 09c: 09a, 03c. 09d1: 04, 09a, 09b. 09d2: 09d1, 09c, 09e, 10a, 03c, 10b. 09g: 09d2, 09f, 11d, 12b, 10a, 10b. 09e: 05a, 06b, 03a. 09f: 09a, 09c, 09e. 10a: 05a. 10b: 09a, 03a. 11a: 09a. 11b: 11a. 11c: 03a. 11d: 11b, 11c. 12a: 09a, 05a. 12b: 12a, 09c, 10b. S2: S1, 06b. 13 and 14: all.

### File ownership

One row per file or file set. "Later edit" names a task in a later group that edits the same file; the two never run at once.

| File | Task (group) | Later edit |
|---|---|---|
| `src/sim/flight/guards.ts` | T-B18-01 (1) | none |
| `src/lib/drone/calc.ts` | T-B18-01 (1) | none |
| `src/lib/flight/baseline.test.ts`, `src/lib/flight/__fixtures__/baseline.json` | T-B18-02a (1) | `baseline.json` is read-only after 02a; `baseline.test.ts` gains the swept assertions in 02c (5) |
| `src/sim/flight/collide.ts` | T-B18-02b (1) | none |
| `src/lib/flight/state.ts`, `src/lib/flight/sim.ts` | T-B18-02d (2) | `sim.ts`: 02e (3), 02f (4) |
| `src/lib/flight/autopilot.ts`, `scoring.ts` | T-B18-02e (3) | `scoring.ts`: 02c (5) |
| `src/lib/flight/multirotor.ts`, `wing.ts`, `swarm.ts` | T-B18-02f (4) | none |
| `src/lib/flight/world.ts` | T-B18-02c (5) | none |
| `src/sim/flight/notices.ts`, `src/i18n/namespaces.ts`, `src/i18n/messages/*/drone.json`, `dronebuild.json`, `src/i18n/messages.test.ts` (parity cases) | T-B18-03a (1) | `namespaces.ts`: 09e (5) adds `droneparts`, 10b (6) adds `droneopt`. `drone.json`: 03c (4), 09c (6). `dronebuild.json`: 09b (4), 09d1 (7), 09d2 (8), 09g (9) |
| `src/sim/flight/content-rule.ts`, `src/ai/eval/dual-use.json` | T-B18-03b (2) | none |
| `src/components/studio/drone/SafetyNotice.tsx`, `FirstFlightPanel.tsx`, `src/studio/drone/ack.ts` | T-B18-03c (4) | none |
| `src/project/domains/drone-ops.ts`, `src/project/domains/drone-semantic.ts`, `src/project/validate.ts` (one registration line) | T-B18-04 (1) | none |
| `src/parts/mechanics.ts` | T-B18-05a (1) | none |
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/S-B18-1-drone-part-data/REPORT.md` | T-B18-S1 (1) | none |
| `src/sim/flight/propulsion.ts` | T-B18-06a (2) | none |
| `src/sim/flight/battery.ts`, `src/lib/flight/battery.ts` | T-B18-07a (2) | none |
| `src/sim/flight/mass.ts` | T-B18-08a (2) | none |
| `src/sim/flight/clash.ts` | T-B18-08b (2) | none |
| `src/parts/data/drone/motors.*.component.json` (set) and `props.*.component.json` (set) | T-B18-05b (3) | none |
| `src/parts/data/drone/batteries.*.component.json` (set), `escs.*.component.json` (set) | T-B18-05c (3) | none |
| `src/parts/data/drone/frames.*.component.json` (set), `fcs.*.component.json` (set) | T-B18-05d (3) | none |
| `src/sim/flight/fit.ts` | T-B18-06b (3) | none |
| `src/sim/flight/endurance.ts` | T-B18-07b (3) | none |
| `src/sim/flight/checks.ts` | T-B18-08c (4) | none |
| `src/components/studio/drone/PartPicker.tsx`, `src/studio/drone/picker.ts` | T-B18-09b (4) | none |
| `src/studio/art/craft.ts` | T-B18-10a (4) | none |
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/S-B18-2-propulsion-accuracy/REPORT.md` | T-B18-S2 (4) | none |
| `src/sim/flight/build.ts`, `src/sim/flight/evaluate.ts` | T-B18-09a (5) | none |
| `src/components/studio/drone/PartEntryForm.tsx`, `src/studio/drone/entry.ts`, `src/i18n/messages/*/droneparts.json` (new), `src/i18n/namespaces.ts` | T-B18-09e (5) | `droneparts.json`: 09f (7) |
| `src/lib/flight/model-id.ts`, `src/lib/flight/ghost.ts`, `src/components/flight/FlightRange.tsx`, `src/components/flight/ModelLabel.tsx`, `src/i18n/messages/*/flight.json` | T-B18-11c (5) | `flight.json`: 11d (8) adds a `fly.*` key group |
| `src/components/studio/drone/NumbersPanel.tsx`, `ChecksList.tsx` | T-B18-09c (6) | none |
| `src/export/bom-drone.ts`, `src/i18n/messages/*/droneopt.json` (new), `src/i18n/namespaces.ts` | T-B18-10b (6) | `droneopt.json`: 12b (7) |
| `src/sim/flight/from-build.ts`, `src/lib/flight/from-calc.ts` | T-B18-11a (6) | none |
| `src/sim/flight/optimise.ts` | T-B18-12a (6) | none |
| `src/components/studio/drone/SlotsEditor.tsx`, `src/studio/drone/use-build.ts`, `src/studio/drone/layout.ts` | T-B18-09d1 (7) | `use-build.ts`: 09g (9) adds `usePinnedBuild` |
| `src/components/studio/drone/DroneBuilder.tsx`, `LegacyBanner.tsx`, `src/studio/router.ts` | T-B18-09d2 (8) | `DroneBuilder.tsx`: 09g (9) adds the tabs |
| `src/components/studio/drone/CompareView.tsx`, `src/studio/drone/compare.ts` | T-B18-09f (7) | none |
| `src/lib/flight/craft-from-build.ts`, `src/lib/flight/registry.ts` (export `DEFAULTS` only) | T-B18-11b (7) | none |
| `src/components/studio/drone/OptimiserPanel.tsx` | T-B18-12b (7) | none |
| `src/components/studio/drone/FlyBuild.tsx` | T-B18-11d (8) | none |
| `src/components/studio/drone/DroneBuilderTabs.test.tsx` (test only) | T-B18-09g (9) | none |
| `e2e/drone-build.spec.ts`, `e2e/support/drone.ts` | T-B18-13 (10) | none |
| `docs/DRONES.md`, `CONTRIBUTING.md` (one pointer line) | T-B18-14 (10) | none |

Source-file count per task (tests and fixtures excluded; each i18n namespace in six languages and each descriptor data set counts as 1): 01: 2. 02a: 0. 02b: 1. 02c: 2. 02d: 2. 02e: 3. 02f: 4. 03a: 4 (notices, `namespaces.ts`, `drone`, `dronebuild`). 03b: 2. 03c: 4. 04: 3. 05a: 1. 05b: 2 sets. 05c: 2 sets. 05d: 2 sets. 06a: 1. 06b: 1. 07a: 2. 07b: 1. 08a: 1. 08b: 1. 08c: 1. 09a: 2. 09b: 3. 09c: 3. 09d1: 4 (`use-build`, `SlotsEditor`, `layout`, `dronebuild`). 09d2: 4 (`DroneBuilder`, `LegacyBanner`, `router`, `dronebuild`). 09e: 4. 09f: 3. 09g: 3 (`DroneBuilder`, `use-build`, `dronebuild`). 10a: 1. 10b: 3. 11a: 2. 11b: 2. 11c: 5. 11d: 2. 12a: 1. 12b: 2. 13: 0. 14: 2. S1, S2: 0.

## 6. Task packages

Every package has the BRIEF section 27 fields in five blocks: identity, intent, implementation, verification, delivery. A field marked "Section 4" is covered by section 4 and not repeated. API contracts are "None" in every package. Permissions, migration, observability and rollback are as section 4 unless a row says otherwise.

---

### T-B18-01 Calculator guards

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-01 / Drone calculator, `src/lib/drone` and `src/sim/flight` / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | none in this phase |
| Intent | problem | `calc` trusts its input. `mah = 0` makes `hoverMin` `Infinity`; `motor.kv = NaN` makes every output `NaN` (`calc.ts:169-262`, no checks; audit B3-03). The parts solver of 06a needs the same guard type |
| | target user, story | Someone typing numbers into the builder, or a stored build with a bad field. "When I enter a bad number, I see which field is wrong and the allowed range, not a blank tile" |
| | expected behaviour | `calcChecked(input)` returns a `CalcResult` or `{error: 'out-of-range', field, value, min, max}`. No output field is ever `NaN` or `Infinity`. `calc` itself is unchanged and stays the function for content that the content tests already check |
| | success metric | DA-01 for `calc`: 10,000 seeded inputs, zero non-finite outputs. 342 golden rows: `calcChecked` equals `calc` field for field |
| Implementation | existing files | `src/lib/drone/calc.ts:103` (`CalcInput`), `:169` (`calc`), `:289` (`batteryLimitA`); `calc.test.ts` (golden rows); `src/lib/drone/__fixtures__/golden-a.json`, `golden-b.json` |
| | new files | `src/sim/flight/guards.ts`, `src/sim/flight/guards.test.ts` |
| | edited files | `src/lib/drone/calc.ts` (adds exports and one import from `@/sim/flight/guards`; no change to `calc`) |
| | modules and signatures | `guards.ts`: `export interface OutOfRange { error: 'out-of-range'; field: string; value: number; min: number; max: number }`; `export interface Range { min: number; max: number; integer?: boolean; minExclusive?: boolean }`; `export const isOutOfRange: (x: unknown) => x is OutOfRange`; `export function checkField(field: string, value: unknown, r: Range): OutOfRange \| null`; `export function checkAll(fields: ReadonlyArray<readonly [string, unknown, Range]>): OutOfRange \| null`; `export function firstNonFinite(path: string, o: object): OutOfRange \| null`. `calc.ts`: `export const CALC_RANGES: Readonly<Record<string, Range>>`; `export function validateCalcInput(i: CalcInput): OutOfRange \| null`; `export function calcChecked(i: CalcInput): CalcResult \| OutOfRange` |
| | data model, I/O | Input `CalcInput` (`calc.ts:103`). Output `CalcResult` or `OutOfRange`. `field` is a dotted path such as `battery.mah` or `result.hoverMin` |
| | algorithm | 1) `validateCalcInput` checks each numeric field against `CALC_RANGES`, in a fixed order, returns the first failure. 2) Run `calc`. 3) `firstNonFinite('result', r)` walks the result (and `cost`, `cruise`); a non-finite value returns `OutOfRange` with `field: 'result.<path>'` and the bounds `-Number.MAX_VALUE`, `Number.MAX_VALUE`. Ranges (from the spans in section 1 with room): `model.motors` integer 1 to 12; `battery.cells` integer 1 to 24; `battery.mah` over 0 up to 1e6; masses `g` 0 to 1e5; `motor.kv` over 0 up to 60,000; `prop.pf`, `prop.eff` over 0 up to 20; `usable` over 0 up to 1; thrust and flight rule constants over 0; prices 0 to 1e6 |
| | validation, errors, edges | A string or `undefined` where a number is required fails with `value: NaN`. `auw = 0` (all masses zero) fails at step 3 on `result.hoverA` or `hoverMin`. Optional fields (`sz`, `parallel`, `cRating`) are checked only when present. `-0` passes. The error is returned, never thrown |
| | performance | Under 5 microseconds extra per call (a field loop). Not measured in CI |
| Verification | unit tests | `guards.test.ts`: each helper, boundaries inclusive and exclusive, integer rule, `NaN`, `Infinity`, `-Infinity`, a string. `src/lib/drone/calc-guards.test.ts`: (a) all 342 golden rows give `calcChecked(i)` deep-equal `calc(i)`; (b) DA-01: a seeded `mulberry32` generator, 10,000 inputs built from the 13 real inputs by replacing 1 to 3 fields with values from `{0, -1, NaN, Infinity, -Infinity, 1e308, 1e-308, random in range}`; every result is a `CalcResult` with all numbers finite, or an `OutOfRange` whose `field` is a key present in the input; (c) `mah: 0` returns `field: 'battery.mah'` |
| | integration tests | `npx vitest run src/lib/drone` still 445 plus the new cases; content tests for the 13 crafts unchanged |
| | Playwright | none |
| | fixtures | none new; reads the existing golden JSON |
| | acceptance | Given a quad5 input with `battery.mah = 0`, When `calcChecked` runs, Then it returns `{error:'out-of-range', field:'battery.mah', value:0, min:0, max:1000000}`. Given the 342 golden inputs, When both functions run, Then all results are equal |
| | release blockers | A golden row changes; any non-finite output in the 10,000-case run |
| Delivery | definition of done | Section 4 plus DA-01 recorded (case count and seed in the commit body) |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/lib/drone src/sim/flight/guards.test.ts`; `npx tsc -p tsconfig.portable.json`; `npx vitest run src/lib/flight src/lib/dronelab src/content/drones` |
| | docs | none (T-B18-14 writes `docs/DRONES.md`) |
| | later tasks need | `OutOfRange`, `Range`, `checkField`, `checkAll`, `firstNonFinite` (06a, 06b, 07a, 07b, 08a, 08b, 08c, 12a) |

---

### T-B18-02a Baseline: counts, replay hashes, tunnel reproduction

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-02a / Flight range, `src/lib/flight` / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | none in this phase |
| Intent | problem | The split and the swept test must not change what the 13 crafts do. Today nothing pins the whole-craft behaviour except 86 + 10 tests. SA-13 also needs the tunnel shown with the old code first |
| | target user, story | The agent building 02c to 02f. "Before I move any code, I have a fixture that fails if a lap or a manual flight changes by one bit" |
| | expected behaviour | A fixture of hashes taken from the unchanged code, a test that recomputes and compares them, and a test that shows the old point test misses a thin pole at 20 m/s |
| | success metric | Fixture covers the 22 courses of the 13 crafts (autopilot lap, hash of the pose track) and 13 scripted manual flights (hash of the final frame after 1,500 steps). The tunnel test finds at least 1 miss in a grid of 25 offsets x 20 phases with the old `collide`; if it finds none the agent stops and reports (the SA-13 sentence is then not reproduced) |
| Implementation | existing files | `src/lib/flight/ghost.ts:68` (`paceGhost(craft, course, calc, maxS)`, runs the autopilot lap and returns a `GhostTrack`); `sim.ts:103` `createSim`, `:220` `dispatch`, `:327` `advance`, `:966` `frameOf`; `registry.ts:259` `flightOf(content)`; `src/lib/flight/world.ts:139` `collide`; `index.ts:2` exports; `src/lib/flight/flight.test.ts:237-271` (how existing tests call `collide`) |
| | new files | `src/lib/flight/baseline.test.ts`; `src/lib/flight/__fixtures__/baseline.json` |
| | edited files | none |
| | modules and signatures | Test-local: `hashPoses(t: GhostTrack): string` and `hashFrame(f: FlightFrame): string` using FNV-1a over the JSON of rounded numbers; `scriptFor(cls: CraftClass): FlightAction[]` (arm, hold climb, roll left 1 s, pitch forward 1 s, yaw, release; written from `FlightAction` in `types.ts`) |
| | data model | `baseline.json`: `{ made: string (git short hash), counts: { libFlight: number, flightRange: number }, laps: Array<{craft, course, time, poses, hash}>, manual: Array<{craft, hash}>, tunnel: { cases: number, missedOld: number } }` |
| | algorithm | Mode `WRITE_BASELINE=1 npx vitest run src/lib/flight/baseline.test.ts` writes the fixture from the current code; the default mode compares. For each content id in `DRONES` (`src/content/ids.ts`), `flightOf(content)`, then for each course `paceGhost(craft, course, calc)` with `calc = fromCalc(calc(designInput(design, design.default)), battery)`. Manual flight: `createSim` on the first course, apply the script with `advance` in 1,500 `stepSim` calls. Tunnel: a vertical pole solid built by `buildSolids` from a `pole` prim (`r 0.08`, `h 3`), hit radius 0.03, craft moving along +x at 20 m/s in 0.2 m steps; offsets `y` from -0.12 to 0.12 in 25 steps, phase from 0 to 0.19 in 20 steps; a case misses when no sampled point is hit by `collide` although the segment passes inside the 0.11 m disc |
| | validation, errors, edges | A craft with no courses is recorded with `laps: []`. A lap `paceGhost` cannot finish returns null; record `time: null`. The fixture is checked in; only a person re-writes it |
| | performance | The whole test under 20 s (22 laps of up to 300 s at 100 Hz, ESTIMATED from the 4.5 s run of the whole area) |
| Verification | unit tests | `baseline.test.ts` as above: laps equal, manual equal, `missedOld > 0` ("known defect SA-13") |
| | integration tests | the full area run before and after: `npx vitest run src/lib/flight src/components/flight src/lib/drone src/lib/dronelab` |
| | Playwright | none |
| | fixtures | `baseline.json` (generated, about 30 KB ESTIMATED) |
| | acceptance | Given unchanged code, When the baseline test runs, Then it passes; Given `collide` replaced by a stub that always returns null, Then the laps still pass but the manual or lap hashes of crashing runs change (the agent checks once that the fixture is sensitive: flips `STEP` to 0.02 locally, sees a failure, reverts) |
| | release blockers | A run that is not deterministic in one engine (two runs, two hashes): stop and report, because the split guard needs determinism |
| Delivery | definition of done | Section 4 plus the commit body lists the measured counts: `src/lib/flight` tests, `FlightRange.test.tsx` tests, `src/lib/drone` tests |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/lib/flight/baseline.test.ts`; `npx vitest run src/lib/flight src/components/flight` |
| | docs | none |
| | later tasks need | The fixture and the test (02c to 02f, 07a, 11a to 11c use it as the guard) |

---

### T-B18-02b Swept collision primitive

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-02b / Flight collision, `src/sim/flight` (portable) / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | none in this phase |
| Intent | problem | `collide` tests one point per 0.01 s step (`sim.ts:843`). At 20 m/s the craft moves 0.2 m, more than a thin obstacle (DRONE 7.5, SIM 17 item 4) |
| | target user, story | A pilot flying fast past a pole. "If I hit it, it counts" |
| | expected behaviour | `sweptHit` returns the first solid a moving sphere touches along a segment, with the fraction `t` and the contact point. `pointHit` is the existing per-solid test, moved here so there is one geometric rule |
| | success metric | Property: for 10,000 seeded segments, `sweptHit` hits whenever the old point test hits at the start or the end point (a superset). Analytic cases exact to 1e-9 |
| Implementation | existing files | `src/lib/flight/world.ts:6-39` (`BoxSolid`, `CylSolid`), `:139-153` (`collide`: z slab, rotate into local frame with `c`, `s`; box half sizes plus `m`; cone radius `r0 + (r1 - r0) * k`; `diamond` uses the L1 norm) |
| | new files | `src/sim/flight/collide.ts`, `src/sim/flight/collide.test.ts` |
| | edited files | none (wiring is 02c) |
| | modules and signatures | `export interface SweptSolid { k: 'box' \| 'cyl'; x: number; y: number; z0: number; z1: number; c: number; s: number; hw?: number; hd?: number; r0?: number; r1?: number; diamond?: boolean; pass?: boolean }` (structurally satisfied by `Solid`); `export type Vec3 = readonly [number, number, number]`; `export function pointHit(o: SweptSolid, x: number, y: number, z: number, m: number): boolean`; `export interface SweptHit<S extends SweptSolid> { solid: S; t: number; point: [number, number, number] }`; `export function sweptHit<S extends SweptSolid>(solids: readonly S[], a: Vec3, b: Vec3, m: number): SweptHit<S> \| null` |
| | data model | none stored |
| | algorithm | `pointHit` is the body of `collide` for one solid, unchanged arithmetic. `sweptHit`: for each non-`pass` solid, reject by bounding box of the segment inflated by `m` plus the solid's reach; box and straight cylinder (`r0 === r1`, not `diamond`) are exact: slab intersection in the local frame for the box (half sizes `hw + m`, `hd + m`, z range `z0 - m` to `z1 + m`), segment against circle of radius `r + m` for the cylinder, clipped to the z range. Cone and `diamond` are sampled: `n = min(64, ceil(len / (0.25 * (min(r0, r1) + m))))` points tested with `pointHit` (documented as not exact). Return the smallest `t` over all solids; ties go to the earlier solid in the array. A start point already inside returns `t = 0` |
| | validation, errors, edges | Zero-length segment equals `pointHit`. `m = 0` allowed. Non-finite input returns null (never throws). A segment in the z plane exactly on `z0 - m` counts as a hit (closed interval, same as the point test's strict `<` on the far side; the test pins both) |
| | performance | 200 solids x 1,000 segments under 20 ms in the test (ESTIMATED; the number is printed) |
| Verification | unit tests | `collide.test.ts`: head-on box (t exact); grazing a box edge (hit) and 1e-6 outside (miss); start inside (t = 0); zero-length equals `pointHit` on 1,000 random points; vertical pole chord cases (the 20 m/s pole from 02a: every offset and phase hits when the segment crosses the 0.11 m disc, none when it does not); cone sampled hit; `pass` solid ignored; earliest of two solids; the 10,000-segment superset property; `pointHit` equals the old `collide` result on 10,000 random points against solids built from the 22 real courses (imports `buildSolids` and `collide` from `@/lib/flight`) |
| | integration tests | none until 02c |
| | Playwright | none |
| | fixtures | none |
| | acceptance | Given a pole of radius 0.08 m and a craft of hit radius 0.03 m moving 0.2 m per step at offset 0.09 m, When `sweptHit` runs on each step's segment, Then it hits on every phase |
| | release blockers | The superset property failing (the swept test would let through something the old test caught) |
| Delivery | definition of done | Section 4; `P` passes |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/collide.test.ts`; `npx tsc -p tsconfig.portable.json` |
| | docs | none |
| | later tasks need | `pointHit`, `sweptHit`, `SweptSolid` (02c) |

---

### T-B18-02d Split 1: `state.ts` out of `sim.ts`

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-02d / Flight range / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-02a (the guard) |
| Intent | problem | `sim.ts` is 1,028 lines and 100 fields of state (DRONE 3.2). The craft-class functions cannot move out while the state type and the shared helpers live in the same file, because they would import each other |
| | target user, story | The next maintainer. "I can read the multirotor step without scrolling past the autopilot" |
| | expected behaviour | Pure move. Types, constants and small shared helpers go to `src/lib/flight/state.ts`; `sim.ts` imports them and keeps its public exports unchanged |
| | success metric | `baseline.test.ts` hashes equal; 86 + 10 tests pass; `sim.ts` exports exactly what `index.ts:2` imports today |
| Implementation | existing files | `src/lib/flight/sim.ts`: `STEP :20`, `MAX_FRAME :22`, `Phase :24`, `SimState :26-93`, `isClimbMode :95`, `emit :190`, `ceilingOf :194`, `countsGates :199`, `countsCheckpoints :205`, `demoResume :211`, `windAt :290`, `crash :813`, `groundContact :779`; `src/lib/flight/index.ts:2` |
| | new files | `src/lib/flight/state.ts`; `src/lib/flight/layers.test.ts` (import graph test) |
| | edited files | `src/lib/flight/sim.ts` |
| | modules and signatures | `state.ts` exports `STEP`, `MAX_FRAME`, `Phase`, `SimState`, `EventBody` (the local type used by `emit`), `isClimbMode`, `emit`, `ceilingOf`, `countsGates`, `countsCheckpoints`, `demoResume`, `windAt`, `crash`, `groundContact`, with the signatures they have now. `sim.ts` re-exports `STEP`, `MAX_FRAME`, `SimState`, `isClimbMode`, `ceilingOf` so `index.ts` is unchanged |
| | data model | unchanged |
| | algorithm | Cut and paste by function; no rename, no reorder of arithmetic, no change of a comment that explains a number. `state.ts` imports `./math`, `./battery`, `./types` and nothing from `sim.ts` |
| | validation, errors, edges | A function that reads a module-private constant moves with it. If a moved function needs `autopilot` or `worldChecks`, stop and report: the cut line is wrong |
| | performance | no change |
| Verification | unit tests | `layers.test.ts`: reads the `import` lines of every file in `src/lib/flight/*.ts` with `node:fs` and asserts the graph is acyclic and that `state.ts` imports only `./math`, `./battery`, `./types`. The guard: `baseline.test.ts`, the 86 and 10 tests |
| | integration tests | `npx vitest run src/lib/flight src/components/flight src/lib/dronelab` |
| | Playwright | `E e2e/fly.spec.ts` once, to prove the page still builds and flies |
| | fixtures | none |
| | acceptance | Given the baseline fixture, When the guard runs after the move, Then every hash is equal and the test counts are the ones recorded in 02a |
| | release blockers | Any hash change |
| Delivery | definition of done | Section 4; `wc -l src/lib/flight/sim.ts state.ts` in the commit body |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/lib/flight src/components/flight src/lib/dronelab`; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/fly.spec.ts` |
| | docs | none |
| | rollback | `git revert` (no other task depends on the move except 02e) |
| | later tasks need | `state.ts` exports (02e, 02f, 02c) |

---

### T-B18-02e Split 2: `autopilot.ts` and `scoring.ts`

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-02e / Flight range / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-02d |
| Intent | problem | The autopilot (about 150 lines) and the gate, checkpoint and lap scoring (about 100 lines) are separate concerns inside `sim.ts` |
| | target user, story | The maintainer of 02c, which edits the collision call inside the scoring code. "The collision call lives in a file named for what it does" |
| | expected behaviour | Pure move into `autopilot.ts` and `scoring.ts`; `sim.ts` imports them |
| | success metric | Guard from 02a unchanged |
| Implementation | existing files | `sim.ts`: `autopilot :345`, `headTo :380`, `rtlVelocity :385`, `currentMission :407`, `missionVelocity :414`, `lineVelocity :468`, `isLanding :490`, `release :493`, `worldChecks :821` (contains `collide` at `:843`, gates `:849-`, checkpoints `:880`), `startRun :916`, `demoFlag :921` |
| | new files | `src/lib/flight/autopilot.ts`, `src/lib/flight/scoring.ts` |
| | edited files | `src/lib/flight/sim.ts`, `src/lib/flight/layers.test.ts` (adds the two files to the graph test) |
| | modules and signatures | `autopilot.ts`: `export function autopilot(s: SimState): Command`, `release(s: SimState): void` and the helpers it needs; `Command` is exported with the type it has today. `scoring.ts`: `export function worldChecks(s: SimState): void`, `startRun`, `demoFlag` |
| | data model, algorithm | As 02d: move only. `autopilot.ts` and `scoring.ts` import `state.ts`, `math`, `route`, `world`, `types`, `battery` and nothing from `sim.ts` or each other |
| | validation, errors, edges | `multirotorStep` and `wingStep` still sit in `sim.ts` and import `autopilot` from the new file |
| Verification | unit tests | `layers.test.ts` updated; the guard |
| | integration, Playwright | as 02d |
| | acceptance | Hashes equal; `scoring.ts` contains the only call to `collide` in the sim (grep in the test) |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/lib/flight src/components/flight src/lib/dronelab`; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/fly.spec.ts` |
| | later tasks need | `scoring.ts` (02c), `autopilot.ts` (02f) |

---

### T-B18-02f Split 3: `multirotor.ts`, `wing.ts`, `swarm.ts`

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-02f / Flight range / B18 |
| | priority, size, status | P0, L, not started |
| | dependencies | T-B18-02e |
| Intent | problem | The class-specific physics (multirotor 134 lines, wing and VTOL transition about 110, swarm followers 18) should sit in files named for the craft class (SA-13, DRONE 3.3). B19 adds a second multirotor model next to `multirotor.ts` |
| | target user, story | The B19 builder. "I add `multirotor-rigid` beside `multirotor.ts` without touching the wing" |
| | expected behaviour | Pure move; `sim.ts` is left with create, reset, dispatch, arm, step loop, battery step, frame and replay (about 450 lines) |
| | success metric | Guard unchanged. `sim.ts` under 500 lines (ESTIMATED; measured value recorded) |
| Implementation | existing files | `sim.ts`: `multirotorStep :501-634`, `vtolTransition :635-653`, `wingStep :654-747`, `wingTarget :748-760`, `followersStep :761-778`, called from `stepSim :308-325` |
| | new files | `src/lib/flight/multirotor.ts`, `wing.ts`, `swarm.ts` |
| | edited files | `src/lib/flight/sim.ts`, `layers.test.ts` |
| | modules and signatures | `multirotor.ts`: `export function multirotorStep(s: SimState, dt: number): void`. `wing.ts`: `export function wingStep(s, dt)`, `vtolTransition(s, a: Vec3, dt)`, `wingTarget`. `swarm.ts`: `export function followersStep(s, dt)`. `multirotor.ts` imports `vtolTransition` from `wing.ts` (it is called inside the multirotor step when `c.vtol`); `wing.ts` imports `autopilot` and `state`; neither imports `sim.ts` |
| | algorithm, validation | Move only. `groundContact` and `crash` are already in `state.ts` (02d), which is what lets `multirotor.ts` and `wing.ts` avoid a cycle |
| | edge cases | `wingStep` uses `groundContact(s, true)`; keep the call |
| Verification | unit tests | `layers.test.ts`: acyclic; `sim.ts` is the only importer of `multirotor`, `wing`, `swarm`; guard |
| | integration, Playwright | `npx vitest run src/lib/flight src/components/flight src/lib/dronelab src/content/drones`; `E e2e/fly.spec.ts e2e/fly-fun.spec.ts e2e/dronelab.spec.ts` |
| | acceptance | SA-13 first clause: the 96 tests pass after the split, hashes equal |
| | release blockers | Any hash change; a cycle |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/lib/flight src/components/flight src/lib/dronelab src/content/drones`; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/fly.spec.ts e2e/fly-fun.spec.ts e2e/dronelab.spec.ts` |
| | later tasks need | file layout (B19) |

---

### T-B18-02c Swept test wired into the flight sim

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-02c / Flight range / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-02b, T-B18-02e |
| Intent | problem | The sphere test at the end of each step lets a fast craft pass through a thin solid |
| | target user, story | A pilot. "A pole at 20 m/s is solid" |
| | expected behaviour | `worldChecks` calls `sweptHit` from the previous position to the new one. On a hit the craft is put at the contact point, then crashes as before. `world.ts` `collide` delegates to `pointHit` so the geometry has one source. The route planner keeps using `collide` |
| | success metric | SA-13 second clause and DA-11: the 20 m/s pole case tunnels with the point test (02a) and never with the swept test, on the same grid. Every non-crashing lap and manual hash in the fixture is unchanged |
| Implementation | existing files | `src/lib/flight/scoring.ts` (the `collide` call moved there by 02e; was `sim.ts:843`); `world.ts:139-153`; `route.ts:31` (stays); `sim.ts:823` shows `prev = p - v * STEP` is rebuilt for gates; `baseline.test.ts` |
| | new files | none |
| | edited files | `src/lib/flight/scoring.ts`, `src/lib/flight/world.ts` |
| | modules and signatures | `world.ts`: `collide` body becomes a loop over `pointHit` imported from `@/sim/flight/collide`; signature unchanged. `scoring.ts`: in `worldChecks` replace `collide(s.solids, s.p[0], s.p[1], s.p[2], c.hitRadius)` by `sweptHit(s.solids, prev, s.p, c.hitRadius)`; on a hit: `s.p = hit.point`, then the existing `crash(s, hit.solid.kind)` and bounce `s.v = [s.v[0] * -0.2, s.v[1] * -0.2, Math.min(0, s.v[2])]` |
| | algorithm | `prev` is the value already computed for gates in the same function. The contact point replaces the end point only on a hit |
| | validation, errors, edges | Landing on the pad: pad decals are `pass` solids and are skipped. A craft resting on the ground next to a wall: `prev` z is 0 and `z0 - m` below it; no new hit unless the segment crosses the inflated solid, and the point test would already have caught that. If the 22-course autopilot laps change hash, the planner's clearance was relying on the tunnel: stop and report with the course ids |
| | performance | One segment test per step per craft instead of one point test; the per-step bounding reject keeps it within 2x of the old cost (`flight.md` 0.5 microsecond per step; measured value recorded) |
| Verification | unit tests | `baseline.test.ts` edited: the tunnel case now asserts `missedOld > 0` for the point test and `missedSwept === 0` for the sim path (a mini sim with a pole, hit radius 0.03, 20 m/s, ten start phases, crash event expected every time); `src/lib/flight/world.test.ts` (new): `collide` equals `pointHit` loop on 1,000 random points |
| | integration tests | the full flight area; the 86 and 10 tests; the fixture laps and manual flights equal |
| | Playwright | `E e2e/fly.spec.ts e2e/fly-fun.spec.ts` |
| | fixtures | `baseline.json` unchanged |
| | acceptance | Given the 20 m/s pole run, When flown with the new sim, Then a `crash` event with `why: 'pole'` is emitted in all ten phases; Given the 22 autopilot laps, Then none crashes and all hashes equal |
| | observability | none |
| | release blockers | A changed lap hash |
| Delivery | definition of done | Section 4; SA-13 recorded (both clauses, counts, hash equality) |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/lib/flight src/components/flight src/lib/dronelab src/sim/flight/collide.test.ts`; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/fly.spec.ts e2e/fly-fun.spec.ts` |
| | docs | `docs/DRONES.md` (14) records the numbers |
| | rollback | `git revert`; the swept primitive stays unused |
| | later tasks need | DA-11 and SA-13 proof for the exit record |

---

### T-B18-03a Safety notices SN-1 to SN-8 as data, two namespaces, banned-word gate

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-03a / Drone safety, `src/sim/flight` and `src/i18n` / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | none in this phase |
| Intent | problem | There is no drone safety text in one place. `DRONE_ARCHITECTURE.md` 12.2 wants eight notices as data with placement rules, and a CI grep for words that over-claim (DA-14) |
| | target user, story | A builder about to export or fly. "Before I take this to a real field, the app reminds me about the battery, the props and the rules where I fly" |
| | expected behaviour | `NOTICES` lists SN-1 to SN-8 with topic, text key, trigger and placements. `noticesFor(placement, ctx)` returns the ones that apply. English text and five translations sit in a new `drone` namespace. A test fails if a shipped drone string contains a banned word |
| | success metric | DA-14 string half: zero hits for the five banned words in the English drone namespaces, `dronelab.json`, `flight.json` and `src/i18n/content/en/drones/*.json` (zero today, VERIFIED); a seeded violation is caught |
| Implementation | existing files | `src/i18n/namespaces.ts:4` (`NAMESPACES`, `Messages`); `src/i18n/messages/en/dronelab.json`, `flight.json`; `src/i18n/messages.test.ts` (parity test from earlier phases; read first); `DRONE_ARCHITECTURE.md` 12.2 (text) |
| | new files | `src/sim/flight/notices.ts`; `src/i18n/messages/{de,en,es,fr,hi,zh}/drone.json`; `src/i18n/messages/{de,en,es,fr,hi,zh}/dronebuild.json` (keys empty until 09b) |
| | edited files | `src/i18n/namespaces.ts` (add `"drone"`, `"dronebuild"` and their `Messages` entries); `src/i18n/messages.test.ts` (parity cases only; a test file) |
| | modules and signatures | `export type NoticeId = 'SN-1' \| 'SN-2' \| 'SN-3' \| 'SN-4' \| 'SN-5' \| 'SN-6' \| 'SN-7' \| 'SN-8'`; `export type Placement = 'builder' \| 'bench' \| 'fly' \| 'first-flight' \| 'export' \| 'trace' \| 'comparison' \| 'autopilot'`; `export type Trigger = { kind: 'always' } \| { kind: 'has-battery' } \| { kind: 'autonomous' } \| { kind: 'auw-over'; grams: number }`; `export interface SafetyNotice { id: NoticeId; topic: string; text_key: string; trigger: Trigger; placement: readonly Placement[]; source_label: 'EXTERNAL' \| 'HYPOTHESIS' \| 'iynk statement' }`; `export const NOTICES: readonly SafetyNotice[]`; `export interface NoticeContext { hasBattery: boolean; auwG: number; autonomous: boolean }`; `export function noticesFor(p: Placement, ctx: NoticeContext): SafetyNotice[]`; `export const FIRST_FLIGHT: readonly NoticeId[]` (SN-1, 2, 3, 5, 6); `export const BANNED_WORDS: readonly RegExp[]`; `export function bannedHits(text: string): string[]` |
| | data model | `drone.json` keys `notice.SN-1` to `notice.SN-8`, plus `notice.title`, `notice.sourceLabel.*`. Placements as the table in DRONE 12.2: SN-8 in every placement; SN-1 builder (when a battery is present), export, first-flight; SN-2 bench, first-flight; SN-3 bench, export; SN-4 fly, trace; SN-5 first-flight, export; SN-6 first-flight, export, and the AUW chip; SN-7 autopilot, export |
| | algorithm | `noticesFor` filters by placement then trigger. SN-8 is always first in the list |
| | validation, errors, edges | Text is plain strings; no HTML. The wording is lab guidance: no sentence says a design is safe, certified, validated, guaranteed or approved. The banned list is `/\bsafe to fly\b/i`, `/\bcertif/i`, `/\bvalidat/i`, `/\bguarantee/i`, `/\bapprov/i`. "Validated" in a code comment is not a shipped string and is not scanned |
| | permissions, migration | Section 4. Adds two namespaces; `Messages` type gains two members |
| Verification | unit tests | `notices.test.ts`: eight notices, ids unique, every `text_key` exists in `en/drone.json`; SN-8 in all 8 placements; `noticesFor('first-flight', ...)` returns SN-1, 2, 3, 5, 6 and SN-8; `auw-over 250` triggers at 251 g and not at 250 g. `src/i18n/drone-strings.test.ts` (DA-14 strings): scans `src/i18n/messages/*/(drone\|dronebuild\|droneparts\|droneopt\|dronelab\|flight).json` and `src/i18n/content/*/drones/*.json` with `bannedHits` (English patterns on every language file, since an untranslated string is English; per-language lists for de, es, fr written in the test, labelled HYPOTHESIS for completeness; hi and zh by the English list only, UNKNOWN beyond that); a fixture string `"This design is safe to fly"` is caught. `messages.test.ts` cases: the two namespaces have equal key sets in six languages |
| | integration tests | `npx vitest run src/i18n src/sim/flight` |
| | Playwright | none |
| | fixtures | none |
| | acceptance | Given the current repo, When the gate runs, Then zero hits. Given a string added with "guaranteed", Then the test names the file and key |
| | release blockers | A translation that adds a claim the English text does not make (reviewed by Amar, see "For Amar") |
| Delivery | definition of done | Section 4. The translations are marked in `docs/DRONES.md` as agent drafts until Amar reviews them (F-172: safety text reviewed first) |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/i18n src/sim/flight/notices.test.ts`; `npx tsc -p tsconfig.portable.json` |
| | docs | none (14) |
| | later tasks need | `NOTICES`, `noticesFor`, `FIRST_FLIGHT`, `bannedHits` (03b, 03c, 10b, 13); namespaces `drone` and `dronebuild` (03c, 09b, 09c, 09d1, 09d2, 09g); `src/i18n/namespaces.ts` is edited again by 09e and 10b in later groups |

---

### T-B18-03b Content rule check and the dual-use refusal set

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-03b / Drone safety / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-03a |
| Intent | problem | R-024 says the project builds no guidance for weaponised, harmful or illegal craft and the AI partner refuses it. Today that is a sentence. DRONE 12.3 wants enforcement points that CI can fail |
| | target user, story | Amar and any contributor. "If someone adds a part or a mode that breaks the rule, the build goes red and names it" |
| | expected behaviour | `content-rule.ts` checks descriptors, flight modes, courses and AI tool definitions against the rule. A data file holds at least 20 refusal prompts. A test walks everything shipped |
| | success metric | DA-15: zero violations over all shipped descriptors, the 13 crafts' modes and courses, and the tool registry; each rule has a seeded failing fixture; `dual-use.json` has at least 20 prompts, each with an `expect: 'refuse'` and a `topic` |
| Implementation | existing files | `src/lib/flight/types.ts:103-116` (`ModeTask` values: `free race range rtl mission figure8 swarm motorfail transition qrtl rth yawdemo demo`, none banned, VERIFIED); `src/lib/flight/registry.ts:259` `flightOf`; `sim.ts:493-499` (`release` only changes mass and records `parcel`; no aimed scoring, VERIFIED by grep); `src/content/drones/swarm.ts` (`swarmCount` default 4); B11 `src/parts/data/**`; B14 `src/ai/tools/registry.ts` (T-B14-09) and `src/ai/eval/` (T-B15-11); `DRONE_ARCHITECTURE.md` 12.3 |
| | new files | `src/sim/flight/content-rule.ts`; `src/ai/eval/dual-use.json`; tests `content-rule.test.ts`, `src/ai/eval/dual-use.test.ts` |
| | edited files | none |
| | modules and signatures | `export const BANNED_TAGS: readonly string[]` (`weapon`, `munition`, `warhead`, `explosive`, `payload-release-aimed`, `target-tracker`); `export const BANNED_MODES: readonly string[]` (`follow-me`, `pursuit`, `track-target`, `target-lock`, `loiter-on-target`); `export const LIMITS: { fieldM: 2000; missionRangeM: 2000; swarmMax: 8; terrainFollowMinM: 5 }`; `export interface RuleViolation { rule: 'part-flag' \| 'part-tag' \| 'mode-banned' \| 'field-too-large' \| 'range-too-long' \| 'swarm-too-large' \| 'tool-restricted'; where: string; detail: string }`; `export function checkDescriptor(d: { identity: { tags?: readonly string[]; category: string }; x_restricted?: unknown }): RuleViolation[]`; `export function checkMode(id: string, task: string): RuleViolation[]`; `export function checkCourse(c: { fieldM: readonly [number, number]; missionRangeM?: number; swarmCount?: number }): RuleViolation[]`; `export function checkTools(tools: ReadonlyArray<{ name: string; description?: string; parameters?: unknown }>): RuleViolation[]` |
| | data model | `dual-use.json`: `{ version: 1, prompts: Array<{ id: string, text: string, topic: 'weapon' \| 'targeting' \| 'payload-release' \| 'swarm-attack' \| 'jamming' \| 'evade-detection' \| 'long-range-strike', expect: 'refuse' }> }`, at least 20 entries, written by the agent as short plain requests (no operational detail needed) |
| | algorithm | `checkDescriptor` flags `x_restricted === true`, any tag in `BANNED_TAGS`, or `category` equal to one. `checkTools` scans tool names, descriptions and enum values in `parameters` for the banned lists and for any operation named `add_restricted`. The test builds the lists from real sources: descriptors from `src/parts/data/**/*.component.json`, modes from `flightOf` over the 13 contents, course sizes from `buildSolids` extents or the course's field data, tools from the B14/B15 registries |
| | validation, errors, edges | A missing registry file (B14/B15 not built) makes that sub-test fail with the missing path, never skip (R-001). Word match is on whole tags and ids, not substrings of prose. A course with `swarmCount` over 8 or a field over 2,000 m is a violation |
| | permissions | Section 4. No role |
| Verification | unit tests | `content-rule.test.ts`: one seeded violation per rule is caught with the right `rule` and `where`; real data has zero violations. `dual-use.test.ts`: file shape, 20 or more prompts, ids unique, topics all among the seven; the partner system prompt (B14 `src/ai/` prompt builder) contains the rule sentence (test reads the built prompt string) |
| | integration tests | `npx vitest run src/sim/flight src/ai/eval` |
| | Playwright | none |
| | fixtures | `dual-use.json` |
| | acceptance | Given a descriptor with `x_restricted: true`, When checked, Then `part-flag` names its id. Given a tool registry with a tool named `follow_target`, Then `tool-restricted` |
| | observability | none |
| | release blockers | A violation in shipped data. CI proves structure only (Q13) |
| Delivery | definition of done | Section 4; the commit body states that the live-model run is not part of CI |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/content-rule.test.ts src/ai/eval/dual-use.test.ts`; `npx tsc -p tsconfig.portable.json` |
| | docs | none (14) |
| | later tasks need | `checkDescriptor` is called by 05b to 05d tests; `checkCourse` by 13 |

---

### T-B18-03c SafetyNotice and the first-flight panel

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-03c / Studio drone UI / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-03a |
| Intent | problem | The notices are data; nobody sees them. R-179: any drone page shows the "before you fly" panel |
| | target user, story | A builder. "I open the first-flight panel from the export step and read five short reminders; I acknowledge once" |
| | expected behaviour | `SafetyNotice` renders one notice (text, source label). `FirstFlightPanel` renders SN-1, 2, 3, 5, 6 and SN-8 and a button "I have read this". The acknowledgement is stored locally and never blocks simulation |
| | success metric | Axe finds no violation on the panel; SN-8 text present on the panel; acknowledgement survives a reload |
| Implementation | existing files | `src/components/ui/Callout.tsx`, `Chip.tsx` (used in `DesignPanel.tsx:4-5`); B4 settings store (T-B4-01 `src/studio/stores/ui.ts`) for the flag; `src/lib/settings/*` for the existing theme pattern (localStorage with try/catch) |
| | new files | `src/components/studio/drone/SafetyNotice.tsx`, `FirstFlightPanel.tsx`, `src/studio/drone/ack.ts`; tests beside them |
| | edited files | `src/i18n/messages/*/drone.json` (panel strings: title, button, "acknowledged on <date>") |
| | modules and signatures | `export function SafetyNotice(props: { id: NoticeId; t: DroneT }): JSX.Element`; `export function FirstFlightPanel(props: { t: DroneT; onAck(): void; acked: boolean }): JSX.Element`; `ack.ts`: `export function readAck(): string \| null`; `export function writeAck(iso: string): void` (key `iynk:drone:firstflight:v1`, try/catch, absent storage means "not acknowledged") |
| | data model | `localStorage["iynk:drone:firstflight:v1"] = ISO date`. Per-viewer convenience only, never read by the sim |
| | algorithm, states | `unseen -> shown -> acked`. Reopening is always possible. The panel does not gate flying or exporting; it opens automatically once before the first BOM export in a browser (09d/10b call `readAck`) |
| | validation, errors, edges | Storage throws: render as unacknowledged. Text from `t('notice.SN-1')`; a missing key renders the key id and logs `drone.notice` to the `errors` store |
| | performance | none |
| Verification | unit tests | `SafetyNotice.test.tsx`: renders text and source label for each of 8 ids in en; `FirstFlightPanel.test.tsx`: five notices plus SN-8, ack calls `onAck`, focus lands on the heading; `ack.test.ts`: read and write, storage throwing |
| | integration tests | six-language render of the panel with no missing key |
| | Playwright | covered by 13 |
| | fixtures | none |
| | acceptance | Given a fresh browser, When the first-flight panel opens, Then SN-1, 2, 3, 5, 6 and 8 are visible and the acknowledge button is focusable; after reload the panel shows "acknowledged" |
| | release blockers | Axe violation; a banned word |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/drone src/studio/drone src/i18n` |
| | docs | none |
| | later tasks need | `SafetyNotice` on every builder output (09c, 09d2, 09f, 11d, 12b); `FirstFlightPanel` (09d2, 10b) |

---

### T-B18-04 `domains.drone` op helpers and semantic checks

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-04 / Project core, `src/project` (portable) / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | none in this phase (needs B2 `apply`, `mergePatch`, validators; B13 `domains.drone` for legacy crafts) |
| Intent | problem | The schema fixes `domains.drone.data` (`drone.domain.schema.json`) and the op `domain.patch`. Nothing builds the right op for "add a motor slot" and nothing checks that a slot's refs point at the right kind of part |
| | target user, story | The builder UI and the AI proposer. "Adding a motor is one call that returns a valid op; a slot that points at a battery is rejected with a code" |
| | expected behaviour | Op builders return `domain.patch` ops (merge patches). `checkDroneDomain` returns issues for structural errors the JSON Schema cannot see |
| | success metric | The `drone-quad.project.json` example passes with zero issues; each issue code has a failing fixture; applying a built op through `apply` and then validating gives zero issues |
| Implementation | existing files | `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/drone.domain.schema.json` (`motors` 3 to 12 items; `required` per `kind`); `project.schema.json:5548` (`domain.set`, import and migration only), `:5572` (`domain.patch`); `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/drone-quad.project.json`; B2 `src/project/apply/types.ts` (`mergePatch`, T-B2-05), `apply/misc.ts` (`domain.patch` handler, T-B2-07), `src/project/validate.ts` and `semantic.ts` (T-B2-08, V3 pass) |
| | new files | `src/project/domains/drone-ops.ts`; `src/project/domains/drone-semantic.ts`; tests `drone-ops.test.ts`, `drone-semantic.test.ts`. The roadmap row T-B18-04 puts the builders in `src/project/apply/`; this file departs from it because the B2 architecture test (FA-01, `B2-core-document-netlist.md` line 1072, added by T-B2-10) fails any import of `src/project/apply/` from outside `session.ts`, `src/project/testing/`, `server/` and test files, and 09d1, 09d2 and 12b (in `src/components`, `src/studio`) import these builders. The builders only construct `Op` values and import no `apply` code |
| | edited files | `src/project/validate.ts` (one line registering `checkDroneDomain` in the V3 pass; if T-B2-08 put the V3 list in `semantic.ts`, edit that one file instead and say so) |
| | modules and signatures | `drone-ops.ts`: `export function slotPatch(cur: DroneData, slot: MotorSlot): Op` (replace by `id` or append; the patch carries the whole `motors` array, Q6); `removeSlotPatch(cur, id: string): Op`; `setBatteryPatch(componentId: string): Op`; `setControllerPatch(boardId: string): Op`; `setFlightPatch(f: DroneData['flight']): Op`; `setCoursePatch(c: DroneData['course']): Op`; `flipToPartsPatch(cur: DroneData): Op` (legacy-craft to multirotor: sets `kind`, `thrustSource: 'parts'`, removes `legacy`); `blankMultirotor(): DroneData`; `layoutMounts(layout: 'x' \| 'plus' \| 'h' \| 'hex' \| 'octo', wheelbase_mm: number, z_mm: number): ReadonlyArray<{ id: string; position_mm: readonly [number, number, number]; rpy_deg: readonly [number, number, number]; spin: 'cw' \| 'ccw' }>` (the X quad uses the constant 0.7071067811865476; others use `Math.cos`/`Math.sin`, class N); `mountOps(m: ReturnType<typeof layoutMounts>, frame: string, component: (slotId: string) => string): Op[]` (`mech.set` of `mounts`). Types `DroneData`, `MotorSlot` come from the B2 generated types (`#project/generated/types`). `drone-semantic.ts`: `export interface DroneIssue { code: DroneIssueCode; path: string; message: string }`; `export type Resolve = (ref: { ref: string; version: string }) => ComponentDescriptor \| undefined`; `export interface ProjectView { mechanical: { frames; bodies; mounts }; components: ReadonlyArray<{ id: string; definition: { ref: string; version: string } }>; domains: { drone?: { data: DroneData } } }` (a structural subset of the B2 `Project`, defined here because no B2 task exports a `ProjectView`: VERIFIED by grep of `tasks/B2-*.md`; `frames`, `bodies`, `mounts` take the types of the same names from `#project/generated/types`); `export function checkDroneDomain(p: ProjectView, resolve: Resolve): DroneIssue[]` |
| | data model | `DroneIssueCode`: `DRN-SLOT-DUP-ID`, `DRN-SLOT-MOTOR-ROLE` (the component's descriptor has no `mechanics.motor.kv_rpm_per_v`), `DRN-SLOT-PROP-ROLE` (no `mechanics.prop`), `DRN-SLOT-ESC-ROLE`, `DRN-ESC-CHANNEL` (channel at or above `esc.channels`, or two slots share an `esc`+`esc_channel`), `DRN-MOUNT-MISSING` (the `mnt_` id is not in `mechanical.mounts`), `DRN-MOUNT-AXIS` (thrust axis more than 90 degrees from body +z), `DRN-BATTERY-ROLE`, `DRN-CONTROLLER-ROLE` (the `brd_` board descriptor has no `mechanics.fc`), `DRN-RATE-DIVIDE` (`pid_hz` does not divide `step_hz` or exceeds it), `DRN-THRUST-SOURCE` (`parts` with `kind: legacy-craft`, or reverse) |
| | algorithm | Thrust axis: the mount `pose.rpy_deg` (URDF convention, parent frame) rotates the unit z vector; the dot product with body +z must be at least 0 (within 90 degrees). Uses `Math.sin`/`Math.cos` (class N). A motor whose descriptor is not a drone motor is a role error naming the `ref` |
| | state transitions | none; each builder returns an op for `ProjectSession.commit`. Builders never read the session |
| | validation, errors, edges | A `legacy-craft` project skips slot checks. `prop_spin != spin` is allowed (a fault the person can make; DB-C-11 reports it). Resolve returns undefined: `DRN-*-ROLE` with message "part not in the library" |
| | permissions | Editing needs the same role as any `domain.patch` (B2 access rules); no new role |
| | performance | Under 1 ms for 12 slots |
| Verification | unit tests | `drone-ops.test.ts` (tests may import `apply`): each builder applied with `apply` to the example gives a document that validates; `slotPatch` replaces slot `m1` and keeps the others; `flipToPartsPatch` on a B13 legacy project gives `kind multirotor` and the schema accepts it only with `motors`, `battery`, `controller`, `fcParams` present (the test fills them first); `drone-semantic.test.ts`: the example has 0 issues; one fixture per code; `layoutMounts` for `x`, `plus`, `h`, `hex`, `octo` gives N distinct mounts at the wheelbase radius and alternating spin, and `mountOps` applied through `apply` validates |
| | integration tests | `npx vitest run src/project` |
| | Playwright | none |
| | fixtures | copies of `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/drone-quad.project.json` (read with the full prefix, section 4) mutated in the test |
| | acceptance | Given the quad example, When slot `m2` is changed to a battery component, Then `DRN-SLOT-MOTOR-ROLE` at `/domains/drone/data/motors/1/motor` |
| | release blockers | The example failing |
| Delivery | definition of done | Section 4; `P` passes |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/project`; `npx tsc -p tsconfig.portable.json` |
| | docs | none (the builders are listed in `docs/DRONES.md`, T-B18-14; B2's `apply/README.md` is not edited because the builders are not in `apply/`) |
| | later tasks need | `slotPatch`, `flipToPartsPatch`, `layoutMounts`, `mountOps` and the other builders from `drone-ops.ts` (09d1, 09d2, 12b); `ProjectView`, `Resolve`, `DroneIssue` and `checkDroneDomain` from `drone-semantic.ts` (09a) |

---

### T-B18-05a Mechanics readers

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-05a / Parts, `src/parts` (portable) / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | none in this phase (needs B2 `ComponentDescriptor`, B11 validator) |
| Intent | problem | The `mechanics` block exists in the schema (VERIFIED, section 1). Nothing reads it into the units the solver needs, nothing says which field is missing for a given output (DA-03), and ke and kv can disagree |
| | target user, story | The builder and the solver. "A motor with no no-load current tells me exactly that, and the thrust tile still shows" |
| | expected behaviour | One reader per block returns SI values plus the list of defaulted fields, or the list of missing fields with paths |
| | success metric | DA-03 first half: for each block, removing each needed field in turn gives `ok: false` naming that exact path; the other blocks still read |
| Implementation | existing files | `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/component.schema.json:1435-1660` (`mechanics`); `COMPONENT_SCHEMA.md` 4.18; B2 `src/parts/descriptor.ts` (type `ComponentDescriptor`), B11 `src/parts/validate.ts` |
| | new files | `src/parts/mechanics.ts`, `src/parts/mechanics.test.ts` |
| | edited files | none |
| | modules and signatures | `export interface Need { path: string; why: string }`; `export type Read<T> = { ok: true; value: T; assumed: string[] } \| { ok: false; missing: Need[] }`; `export interface MotorSI { kv_rpm_per_v: number; ke_vs_per_rad: number; r_ohm: number; i0_a: number; v_max?: number; i_max_a?: number; i_burst_a?: number; j_kgm2?: number; mass_g: number }`; `export interface PropSI { d_m: number; pitch_m: number; blades: number; ct0: number; cp0: number; mass_g: number; rpm_max?: number; hasAdvanceTables: boolean }`; `export interface EscSI { i_cont_a: number; i_burst_a?: number; channels: number; efficiency: number; v_max?: number; mass_g: number }`; `export interface PackSI` is defined in T-B18-07a; this file exports `export interface PackMech { cells: number; parallel: number; capacity_mah: number; r_cell_ohm: number; chemistry: string; ocv_table?: readonly number[]; c_continuous?: number; c_burst?: number; mass_g: number }`; `export interface FrameSI { mass_g: number; wheelbase_mm?: number; arm_count?: number; prop_max_in?: number }`; `export interface FcSI { gyro: string; loop_hz_max: number; mass_g: number }`; `export type Role = 'motor' \| 'prop' \| 'esc' \| 'battery' \| 'frame' \| 'fc'`; `export function roleOf(d: ComponentDescriptor): Role \| null`; `readMotor`, `readProp`, `readEsc`, `readBattery`, `readFrame`, `readFc: (d: ComponentDescriptor) => Read<...>`; `export function keKvRatio(m: MotorSI): number` |
| | data model | Reads `mechanics.motor`, `.prop`, `.esc`, `.battery`, `.frame`, `.fc`. Role: `motor` when `mechanics.motor.kv_rpm_per_v` or `ke_vs_per_rad` exists and `identity.category === 'drone'`; `prop`, `esc`, `battery`, `frame`, `fc` by block (a descriptor with two roles returns the first in that order and a `DRN` warning at the library pass). Mass: `block.mass_g`, else `mechanics.mass_g`, else `dimensions.mass.typ` converted by unit |
| | algorithm | Needed (missing blocks the solve): motor `r_ohm`, one of `kv_rpm_per_v` and `ke_vs_per_rad`, `i_noload_a`, mass; prop `diameter_mm`, `ct0`, `cp0`, mass; esc `i_cont_a`; battery `cells`, `capacity_mah`, `r_cell_ohm`; frame mass; fc `loop_hz_max`. Defaulted with an `assumed` entry: esc `efficiency` 0.95, `channels` 1, battery `chemistry` `lipo`, `parallel` 1, prop `blades` 2. `ke = 60 / (2 * PI * kv)`; if only `ke` is given, `kv = 60 / (2 * PI * ke)`. `keKvRatio` returns `ke * kv * 2 * PI / 60` (1 when consistent); a ratio outside 0.95 to 1.05 when both are given is reported by the library pass (T-B18-05b to d tests), not by the reader |
| | validation, errors, edges | Zero or negative numbers are `missing` with `why: 'must be positive'`. `ct_vs_j` and `cp_vs_j` are read as `hasAdvanceTables` and not used in this phase (forward flight is B19). Chemistry `nimh`, `lifepo4`, `alkaline` is returned as-is; the check `DB-E-CHEMISTRY` (08c) rejects it |
| | permissions, migration | Section 4 |
| | performance | Under 0.1 ms per read |
| Verification | unit tests | `mechanics.test.ts`: reads the nine examples under `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components/` (the `dc-gear-motor` example has `ke_vs_per_rad` and category `actuator`, so `roleOf` returns null for it: pinned); a drone motor fixture reads ok; deleting each needed field gives `missing` with that path; defaults listed in `assumed`; `ke`/`kv` conversion round trip 1e-12 |
| | integration tests | `npx vitest run src/parts` |
| | Playwright | none |
| | fixtures | five small descriptors inline in the test |
| | acceptance | Given a motor with no `i_noload_a`, When read, Then `{ok:false, missing:[{path:'mechanics.motor.i_noload_a', ...}]}` |
| | release blockers | none |
| Delivery | definition of done | Section 4; `P` passes |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/parts/mechanics.test.ts`; `npx tsc -p tsconfig.portable.json` |
| | docs | none |
| | later tasks need | all readers and `Need` (06a, 07a, 05b to 05d tests, 08c, 09a, 09b, 09e, 10a) |

---

### T-B18-S1 Spike: redistributable motor and propeller data

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-S1 / Drone parts data / B18 |
| | priority, size, status | P1, M, not started. Verdict file only; no source change |
| | dependencies | none |
| Intent | problem | DK-2: whether a library of real motors and propellers can ship is UNKNOWN (the UIUC propeller database licence and coverage are unchecked; manufacturer tables carry their own terms). Q12 ships generic parts until this is answered |
| | falsifiable question | Can at least 10 brushless motors and 10 propellers be added to the repo with their measured performance numbers under a licence that allows redistribution (public domain, CC0, CC-BY, or written permission that the report quotes)? |
| | exit condition | `REPORT.md` with a table of every candidate source (URL, licence text or "none found", fields available, count of motors, count of props, rows per part). Verdict PASS when 10 and 10 are reachable with a quotable licence; PARTIAL with the counts; FAIL when fewer than 3 of either; UNKNOWN when the network is unreachable. No third-party data is copied into the repo by this task |
| Implementation | existing files | `DRONE_ARCHITECTURE.md` 6.1 (sources paragraph), DK-2, DK-3; `docs/MASTER_PLAN/03_PRODUCT/` provenance rules (R-138) |
| | new files | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/S-B18-1-drone-part-data/REPORT.md` |
| | method | Fetch the licence page of each candidate source; record verbatim the sentence that grants or denies reuse; record whether tables are numeric rows (throttle or rpm, volts, thrust, amps). Label every row EXTERNAL with the fetch date. Do not paraphrase a licence |
| Verification | acceptance | Given the report, When read by a person, Then each licence claim has a quoted sentence and a URL |
| Delivery | verify commands | none (document only); `git status` shows the report only |
| | later tasks need | If PASS or PARTIAL the orchestrator adds a data task (`T-B18-05e real parts`) after Amar's OK, and S2 gets its data. If FAIL, S2 is skipped and the phase ships generic parts plus the entry form |

---

### T-B18-06a Closed-form propulsion solve

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-06a / Drone propulsion, `src/sim/flight` (portable) / B18 |
| | priority, size, status | P0, L, not started |
| | dependencies | T-B18-01 (guards), T-B18-05a (SI blocks) |
| Intent | problem | The calculator uses one hand-tuned scalar per craft and a constant g/W (`calc.ts:169-262`). A user part has neither. ADR-0711 replaces it for user builds with a physical solve |
| | target user, story | A builder choosing a motor and a propeller. "I see thrust and current at each throttle for the parts I picked" |
| | expected behaviour | Given a motor, a propeller, an effective voltage and the air density, one square root gives rotor speed, thrust, torque and current. The pack voltage sags with current by a fixed three-pass iteration. A bisection finds the duty for a target thrust |
| | success metric | DA-04: 10,000 random parts inside the schema ranges give a torque residual under 1e-9 N m and thrust non-decreasing in duty. DA-01 for the solver: no `NaN` or `Infinity` out |
| Implementation | existing files | `DRONE_ARCHITECTURE.md` 6.2 (formulas); scratch check `/Users/amar/iynk-master-plan-scratch/buildplan/b18/prop.mjs` (the same formulas, residual 2.2e-16); `src/lib/flight/battery.ts:65-92` (how the game steps a pack) |
| | new files | `src/sim/flight/propulsion.ts`, `src/sim/flight/propulsion.test.ts` |
| | edited files | none |
| | modules and signatures | `export interface Air { rho_kgm3: number }`; `export const SEA_LEVEL_AIR: Air` (1.225); `export interface RotorSI { ke: number; r: number; i0: number; kT: number; kQ: number; d_m: number; rpmMax: number \| null }`; `export function rotorOf(m: MotorSI, p: PropSI, air: Air): RotorSI \| OutOfRange`; `export interface MotorPoint { omega: number; rpm: number; thrust_n: number; torque_nm: number; current_a: number; shaft_w: number; electrical_w: number }`; `export function solveRotor(r: RotorSI, vEff: number): MotorPoint`; `export interface PackModel { open_v(soc: number): number; r_ohm: number; idle_a: number }`; `export interface Drive { rotor: RotorSI; escEff: number }`; `export interface StaticPoint { v_pack: number; i_pack: number; motors: MotorPoint[]; residual_nm: number }`; `export function solveStatic(d: readonly Drive[], duty: number \| readonly number[], soc: number, pack: PackModel): StaticPoint \| OutOfRange`; `export function dutyForThrust(d: readonly Drive[], soc: number, pack: PackModel, targetN: number, iters?: number): number \| 'unreachable'`; `export function maxThrust(d, soc, pack): StaticPoint` |
| | data model | none stored. Types `MotorSI`, `PropSI` from `src/parts/mechanics.ts`; `OutOfRange` from `guards.ts` |
| | algorithm | `kT = ct0 * rho * D^4 / (4 * PI^2)`, `kQ = cp0 * rho * D^5 / (8 * PI^3)` (D^4 and D^5 by repeated multiplication). With `vEff = duty * v_pack * escEff`: `b = ke * ke / R`, `c = ke * (vEff / R - I0)`. If `c <= 0` then `omega = 0`, thrust 0, current `vEff / R`. Else `omega = (-b + sqrt(b*b + 4*kQ*c)) / (2*kQ)`, `I = (vEff - ke*omega) / R`, `T = kT*omega^2`, `Q = kQ*omega^2`. `solveStatic`: `v_pack = open_v(soc)`, then 3 fixed passes: motors from `v_pack`; `i_pack = sum(duty_i * I_i) + idle_a`; `v_pack = open_v(soc) - r_ohm * i_pack`; `residual_nm` is the largest `abs(Q - ke*(I - I0))` of the last pass. `dutyForThrust`: bisection on a common duty in [0, 1], 40 fixed iterations; thrust is monotone in duty; `'unreachable'` when `maxThrust < target`. Only `+ - * /`, `sqrt`, `abs`, `min`, `max` (Q5) |
| | validation, errors, edges | Inputs checked by `checkAll` (kv, R, I0, D, ct0, cp0, rho, duty in 0 to 1, soc in 0 to 1). `duty` array length must equal `d.length`. Identical drives are solved once per distinct reference (an `Map` keyed by object identity) to keep endurance cheap. Rotor over `rpmMax` is reported by checks (08c), not clipped here |
| | permissions, migration | Section 4 |
| | performance | One rotor solve under 0.3 microseconds (about 30 flops, ESTIMATED); a full `dutyForThrust` on 4 motors under 0.1 ms. The printed numbers are recorded |
| Verification | unit tests | `propulsion.test.ts`: the scratch case (kv 1750, R 0.045, I0 1.5, D 0.1295, ct0 0.12, cp0 0.06, 16 V) gives 8.167 N and 16.92 A within 1e-3 relative; `c <= 0` stalls; DA-04 with a seeded generator over kv 50 to 5000, R 0.005 to 2, I0 0 to 5, D 0.03 to 0.5, ct0 0.02 to 0.3, cp0 0.01 to 0.2, V 1 to 60: residual under 1e-9 and 21-point duty sweep non-decreasing; sag: more current gives lower `v_pack`; passes fixed at 3; `dutyForThrust` round trip within 1e-9 N; DA-01 for the solver (NaN, Infinity, negative, zero fields give `OutOfRange` naming the field) |
| | integration tests | none until 07b |
| | Playwright | none |
| | fixtures | none |
| | acceptance | Given the 16 V case, When `solveRotor` runs, Then rpm is 26,667 within 0.1 percent (scratch value) |
| | release blockers | A residual over 1e-9; non-monotone thrust |
| Delivery | definition of done | Section 4; `P` passes; measured cost in the commit body |
| | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/propulsion.test.ts`; `npx tsc -p tsconfig.portable.json` |
| | docs | none (14) |
| | later tasks need | `rotorOf`, `solveRotor`, `solveStatic`, `dutyForThrust`, `maxThrust`, `PackModel`, `Drive` (06b, 07b, 08c, 09a, 12a) |

---

### T-B18-07a Battery model

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-07a / Drone battery, `src/sim/flight` and `src/lib/flight` / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-01, T-B18-02a |
| Intent | problem | The best-modelled piece (DRONE 3.2) has one resistance rule, `IR_AH` per chemistry (`battery.ts:18`), and sits in the game folder. A user pack has its own `r_cell_ohm` and `ocv_table`. Two copies of the OCV tables would drift |
| | target user, story | A builder with a pack that sags. "A tired, high-resistance pack shows a lower loaded voltage and a shorter flight" |
| | expected behaviour | `src/sim/flight/battery.ts` owns the tables, limits and the pack functions. The game battery imports the tables and the interpolation from it; its behaviour is unchanged for the 13 crafts |
| | success metric | `baseline.json` hashes unchanged (the game still draws the same sag); new functions equal the old ones on 1,000 random states |
| Implementation | existing files | `src/lib/flight/battery.ts:4-8` (OCV, empty to full, 11 points), `:11-15` (`LIMITS`), `:18` (`IR_AH`), `:20` (`NOMINAL_CELL`), `:22-27` (`ocv`), `:29-32` (`cellResistance`), `:65-92` (`stepBattery`); `src/lib/flight/types.ts:6` (`Chemistry`) |
| | new files | `src/sim/flight/battery.ts`, `src/sim/flight/battery.test.ts` |
| | edited files | `src/lib/flight/battery.ts` (import the tables, `LIMITS`, `NOMINAL_CELL`, `ocvAt` and `defaultCellResistance` from `@/sim/flight/battery`; keep every export name and signature) |
| | modules and signatures | `export type FlyChem = 'lipo' \| 'lihv' \| 'liion'`; `export const OCV_PER_CELL: Readonly<Record<FlyChem, readonly number[]>>`; `export const CELL_LIMITS: Readonly<Record<FlyChem, { low: number; cut: number }>>`; `export const NOMINAL_CELL = 3.7`; `export interface PackSI { chem: FlyChem; cells: number; parallel: number; capacity_mah: number; r_cell_ohm: number \| null; ocv_table?: readonly number[]; c_continuous?: number; c_burst?: number; mass_g: number }`; `export function ocvAt(table: readonly number[], soc: number): number` (same index arithmetic as `ocv`); `export function ocvCell(p: PackSI, soc: number): number` (a user `ocv_table` is given full to empty, so it is reversed before `ocvAt`); `export function defaultCellResistance(chem: FlyChem, mah: number): number`; `export function packResistance(p: PackSI): number` (`cells * (r_cell_ohm ?? defaultCellResistance(...))`, Q3); `export function packOpen(p: PackSI, soc: number): number`; `export function loadedCell(p: PackSI, soc: number, amps: number): number`; `export function status(p: PackSI, soc: number, amps: number): 'ok' \| 'low' \| 'cut'` |
| | data model | Tables are copied once from `battery.ts:4-8` by moving them. `Chemistry` in the game types stays a separate union with the same three members (a compile-time test asserts `FlyChem` and `Chemistry` are mutually assignable) |
| | algorithm | As above. `status`: per-cell loaded voltage below `low` is `low`, below `cut` is `cut` |
| | validation, errors, edges | `cells` integer 1 to 24, `capacity_mah` over 0, `r_cell_ohm` over 0 or null, `ocv_table` 2 to 64 points; `OutOfRange` otherwise. `soc` is clamped like `ocv` does |
| | performance | no change |
| Verification | unit tests | `battery.test.ts`: tables equal the old arrays element for element; `ocvAt` equals the old `ocv` on 1,000 random `(chem, soc)`; `packResistance` for the default equals `cells * cellResistance(chem, mah)`; a user `ocv_table` reversed; `loadedCell` falls with current; `status` thresholds; type test for `FlyChem`. The existing game battery behaviour is covered by `baseline.test.ts` and `flight.test.ts` |
| | integration tests | `npx vitest run src/lib/flight src/sim/flight` |
| | Playwright | none |
| | fixtures | none |
| | acceptance | Given an unchanged game, When the baseline runs, Then all hashes equal |
| | release blockers | A hash change |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/battery.test.ts src/lib/flight src/components/flight`; `npx tsc -p tsconfig.portable.json` |
| | later tasks need | `PackSI`, `status`, `CELL_LIMITS`, `packOpen`, `packResistance` (05c tests, 07b, 08c, 09a, 11a). `toPackModel` is in `endurance.ts` (07b), because `PackModel` is owned by `propulsion.ts` (06a) in the same group as this task |

---

### T-B18-08a Mass, centre of mass and inertia

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-08a / Drone mass properties, `src/sim/flight` / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-01 |
| Intent | problem | DB-C-08 (centre of mass) and the later rigid model need mass, centre of mass and an inertia tensor from the parts' bodies and mounts. The roadmap has no task for it; DA-17 is in the exit list |
| | target user, story | A builder with a heavy battery far forward. "The app tells me the build is nose-heavy by how much" |
| | expected behaviour | Given bodies with a world pose, shape and mass, return total mass, centre of mass and the inertia tensor about it, with the parallel axis rule |
| | success metric | DA-17: a two-box assembly equals the analytic answer to 1e-9 relative |
| Implementation | existing files | `project.schema.json` `Body` (`mass_g`, `shape`, `com_mm`, `inertia_g_mm2`), `Shape`, `Pose` (`position_mm`, `rpy_deg`); `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/drone-quad.project.json` (8 bodies, box and cylinder shapes) |
| | new files | `src/sim/flight/mass.ts`, `src/sim/flight/mass.test.ts` |
| | edited files | none |
| | modules and signatures | `export type V3 = readonly [number, number, number]`; `export type Mat3 = readonly [V3, V3, V3]`; `export type ShapeIn = { kind: 'box'; size_mm: V3 } \| { kind: 'cylinder'; radius_mm: number; height_mm: number } \| { kind: 'sphere'; radius_mm: number } \| { kind: 'mesh' }`; `export interface PlacedBody { id: string; mass_g: number; shape: ShapeIn; com_mm?: V3; inertia_g_mm2?: V3; position_mm: V3; rpy_deg: V3 }`; `export interface MassProps { mass_g: number; com_mm: V3; inertia_g_mm2: Mat3 }`; `export function shapeInertia(s: ShapeIn, mass_g: number): V3 \| OutOfRange`; `export function rotationFromRpy(rpy_deg: V3): Mat3`; `export function assemble(bodies: readonly PlacedBody[]): MassProps \| OutOfRange`; `export function isPositiveDefinite(m: Mat3): boolean`; `export function cgOffsetFraction(p: MassProps, axes_mm: ReadonlyArray<readonly [number, number]>): { offset_mm: number; meanArm_mm: number; fraction: number }` |
| | algorithm | Principal moments about the body's own centre: box `m/12 * (b^2 + c^2)` and the two others; cylinder about z `m*r^2/2`, about x and y `m/12 * (3 r^2 + h^2)`; sphere `2/5 m r^2`. If `inertia_g_mm2` is given it is used. Rotate with `R diag(I) R^T`, move to the assembly centre with `I + m (dot(d, d) E - d d^T)`. Mesh with no `inertia_g_mm2` returns `OutOfRange` with `field: 'bodies.<id>.shape'`. `cgOffsetFraction`: distance in the x-y plane between the centre of mass and the centroid of the motor axes, over the mean distance of the axes from that centroid |
| | validation, errors, edges | Mass must be over 0 for at least one body. `isPositiveDefinite` uses the leading principal minors; failing gives the structural error `DB-E-INERTIA` in 08c. Zero motors: fraction `NaN` is never returned; `OutOfRange` instead |
| | performance | Under 0.1 ms for 20 bodies |
| Verification | unit tests | `mass.test.ts`: DA-17 two boxes (for example 100 x 40 x 10 mm, 50 g at (-30, 0, 0) and 60 x 60 x 20 mm, 120 g at (40, 10, 5)) against closed forms written out in the test, 1e-9 relative on mass, centre and all 9 tensor entries; a rotated box (rpy 0, 30, 0) against hand-computed `R I R^T`; sphere and cylinder formulas; the example `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/drone-quad.project.json` bodies give a centre within 2 mm of the frame origin x-y (the example is symmetric except the battery and camera: the test prints the value and pins it); mesh error; fraction on a symmetric X is 0 |
| | integration tests | none until 09a |
| | Playwright | none |
| | fixtures | none |
| | acceptance | Given the two-box assembly, When assembled, Then tensor entries equal the analytic ones to 1e-9 relative |
| | release blockers | DA-17 failing |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/mass.test.ts`; `npx tsc -p tsconfig.portable.json` |
| | later tasks need | `assemble`, `PlacedBody`, `MassProps`, `cgOffsetFraction`, `isPositiveDefinite` (08c, 09a, 10a) |

---

### T-B18-08b Generalised prop clash rule

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-08b / Drone checks, `src/sim/flight` / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-01 |
| Intent | problem | The only clash check is for the octo: `motorChordMm` (`calc.ts:251-254`) needs `armRadiusMm`, which one craft sets (`src/content/drones/octo.ts:94`, 680 mm); `designChecks` (`calc.ts:300-`) tests `2 * pr.r > chord` |
| | target user, story | Someone fitting 6-inch props to a 5-inch frame. "The app says which two props touch and by how much" |
| | expected behaviour | Given rotor discs (axis position, radius, height) report every pair that overlaps, with the gap and the gap needed |
| | success metric | DA-16: over the 342 default builds, no false alarm on the 13 default picks; for the octo rows the clearance-0 flags equal the old check exactly; a prop 10 percent larger than the spacing allows is flagged on all 13 frames |
| Implementation | existing files | `src/lib/drone/calc.ts:251-254` (`motorChordMm`), `:300-` (`designChecks` clash branch); `src/content/drones/octo.ts` (`armRadiusMm`); `src/content/drones/*.ts` `frame.motors` ([x, y] mm); `src/lib/flight/registry.ts:137` (`craftLook`, `propR`), `:120` (`propRadius`, private) |
| | new files | `src/sim/flight/clash.ts`, `src/sim/flight/clash.test.ts` |
| | edited files | none |
| | modules and signatures | `export const CLEARANCE_MM = 5`; `export const Z_CLEAR_MM = 10`; `export interface RotorDisc { id: string; x_mm: number; y_mm: number; z_mm: number; r_mm: number }`; `export interface ClashPair { a: string; b: string; centre_mm: number; needed_mm: number; short_mm: number; kind: 'adjacent' \| 'coaxial' }`; `export function propClash(discs: readonly RotorDisc[], clearance_mm?: number): { pairs: ClashPair[]; worst: ClashPair \| null }` |
| | algorithm | For each pair: horizontal centre distance `d = sqrt(dx*dx + dy*dy)`; needed `r_a + r_b + clearance`. Clash when `d < needed` and `abs(dz) < Z_CLEAR_MM` (props at different heights by 10 mm or more do not touch; ESTIMATED, an iynk assumption shown in the check). Coaxial when `d < 1 mm`: clash unless `abs(dz) >= Z_CLEAR_MM`. `worst` has the largest `short_mm` |
| | validation, errors, edges | Fewer than 2 discs: no pairs. Radius at or below 0: `OutOfRange`. 12 discs: 66 pairs |
| | performance | Under 0.05 ms for 12 discs |
| Verification | unit tests | `clash.test.ts`: two discs touching, apart by 4 mm (clash with clearance 5, not with 0), coaxial at 12 mm height (no clash); DA-16 against the content: for each of the 13 contents build discs from `frame.motors` and the default prop radius (`craftLook(content, cls).propR * 1000`): zero pairs at clearance 5 on every default pick (the agent records which crafts have no `frame.motors` and are skipped); for all 342 golden builds whose prop radius is known (`design.props[k].r` or the label rule) the octo rows flagged with clearance 0 are exactly the rows `designChecks` flags `prop-clash` (set equality, printed counts); the rows flagged only with clearance 5 are listed in the test as an expected set; each frame with a prop radius scaled by 1.1 times (half the smallest adjacent spacing) is flagged |
| | integration tests | `npx vitest run src/sim/flight src/lib/drone` |
| | Playwright | none |
| | fixtures | none |
| | acceptance | DA-16 as written in `DRONE_ARCHITECTURE.md` 15, with the clearance reading above (Q-note in the commit body) |
| | release blockers | A false alarm on a default pick; the octo sets differ |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/clash.test.ts src/lib/drone`; `npx tsc -p tsconfig.portable.json` |
| | later tasks need | `propClash` (08c, 09a, 10a for the highlight) |

---

### Procedure P: how one generic drone part is made

Used by T-B18-05b, 05c and 05d.

1. Run the `part-draft` tool (`scripts/part-draft.mjs`, T-B11-02a; read its `--help` for the flags) to write a valid skeleton for category `drone` into `src/parts/data/drone/`. If the tool is missing, copy `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components/dc-gear-motor.component.json` and edit it, and say so in the commit body.
2. `id` is `core.<slug>`; `identity.generic: true`; `identity.manufacturer: "generic"`; `identity.category: "drone"`.
3. Put numbers in `mechanics.<block>`. Every number gets `source` pointing at one `sources[]` entry of `kind: "own-estimate"`, `reliability: "unverified"`, text "Typical value for this class of part, chosen by iynk; not read from a datasheet" (three-slot rule: these are `simulation` numbers, the `manufacturer` slot stays empty).
4. `simulation`: `tier: "T1"`, `status: "partly-modelled"` for motor, prop, battery, ESC (the solver runs them); `what_it_models` names the equations; `not_modelled` lists heating, ESC timing, stall, ground effect; `known_gaps` has one entry "not checked against a real part". `simulation.tests` has at least one entry (the schema requires `minItems: 1` when `status` is `modelled` or `partly-modelled`: `component.schema.json` `simulation` `allOf`, line 1158 and following). An item has the shape at `component.schema.json` lines 1130 to 1148: required `id` (a key), `kind` and `file` (a relative path); optional `source`, `tolerance` (`{abs?, rel?}`), `note` (300 characters at most) and `state` (`present` or `to-write`; the PARTS gate fails any part with a `to-write` test). `kind` is one of `datasheet-point`, `ngspice-comparison`, `bench-measurement`, `golden-trace`, `property`, `conformance`. Each generic part has at least one entry of kind `property` that names the unit test checking its equation, with `state: "present"`. Example for a motor: `{ "id": "torque-balance", "kind": "property", "file": "src/parts/data/drone/drone-parts.test.ts", "tolerance": { "abs": 1e-9 }, "note": "torque balance residual of the closed-form solve", "state": "present" }`. Propellers name the thrust-monotone-in-duty test in the same file; batteries name the full-charge open-circuit voltage test in `power-parts.test.ts`; ESCs name the full-throttle current-under-`i_cont_a` test in `power-parts.test.ts`. The named test must exist when the part is committed (the part and its test file are in the same task).
5. Pins: motor `A B C` (phase, passive), ESC `VBAT GND S1`, battery `+ -`, prop and frame one `MOUNT` pin of type passive, FC `VBAT GND M1 M2 M3 M4`. Names follow the part's real connectors where there are any.
6. `visual.fallback` is the generic art; `x_price: { amount: number, currency: "USD", as_of: "2026-10-27", estimate: true }` (Q7, Q10).
7. `provenance`: `license: "LicenseRef-iynk-pending"` (D-017 open), `origin: "core"`, `created`, `review: "unreviewed"`.
8. Run `node scripts/validate-part.mjs --trust core <files>` (T-B11-01) and fix every issue.
9. Honest ranges: pick numbers so that the reference build lands in these windows (ESTIMATED plausibility, not a claim about any maker's part): 5-inch 4S build full-throttle thrust-to-weight 4 to 9, hover throttle 0.25 to 0.5, per-motor current under 40 A, hover flight time 4 to 9 minutes. The windows are checked in T-B18-09a (`evaluate.test.ts`), because they need the frame, battery, ESC and FC masses from 05c and 05d and `hoverEndurance` from 07b, none of which exist when 05b is built. The 05b to 05d tests check only that the parts validate, read ok, draw a current under their limits and pass `checkDescriptor`. If 09a misses a window, the fix is a numbers edit to the 05b, 05c or 05d data files, committed as a separate fix commit.

---

### T-B18-05b Generic motors and propellers

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-05b / Parts data, `src/parts/data/drone` / B18 |
| | priority, size, status | P0, L, not started |
| | dependencies | T-B18-05a, T-B18-06a, T-B18-03b (`checkDescriptor`) |
| Intent | problem | The builder has nothing to pick. Real data may not be shippable (Q12, S1) |
| | target user, story | A builder. "I can pick a whoop motor or a 5-inch motor and a matching prop and get numbers" |
| | expected behaviour | Six motors and six propellers as descriptors, generic, honest about being assumptions |
| | success metric | All 12 pass `validate-part.mjs`; each motor and prop reads ok through 05a; each pair in `PAIRS` draws a full-throttle current under its motor's `i_max_a`; `checkDescriptor` finds nothing. The reference-window claims (T/W, hover throttle, flight time) need frame, battery, ESC and FC masses and `hoverEndurance`, so they are asserted in T-B18-09a, not here |
| Implementation | existing files | `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components/dc-gear-motor.component.json` (shape of a part with `mechanics`); `component.schema.json:1435+`; B11 `scripts/part-draft.mjs`, `scripts/validate-part.mjs` |
| | new files | Motors (set, counts as 1): `motor-0802-19000kv`, `motor-1104-7500kv`, `motor-1404-4600kv`, `motor-2004-3000kv`, `motor-2306-1750kv`, `motor-2807-1300kv` as `src/parts/data/drone/motor-*.component.json`. Props (set, counts as 1): `prop-31mm-2b` (1.2 in), `prop-2.5in-3b`, `prop-3in-3b`, `prop-5.1in-3b` (`diameter_mm` 129.5), `prop-6in-3b`, `prop-7in-2b` as `prop-*.component.json`. Tests `src/parts/data/drone/drone-parts.test.ts` |
| | edited files | none |
| | modules and signatures | none (data). The test uses `readMotor`, `readProp`, `rotorOf`, `solveStatic`, `checkDescriptor`, `validateDescriptor` |
| | data model | `iynk.component/1`, `mechanics.motor` (`kv_rpm_per_v`, `r_ohm`, `i_noload_a`, `v_max`, `i_max_a`, `i_burst_a`, `j_kgm2`, `mass_g`, `stator_mm`), `mechanics.prop` (`diameter_mm`, `pitch_mm`, `blades`, `mass_g`, `ct0`, `cp0`, `rpm_max`). Motors: category `drone`, kind `actuator`, tags `motor`, `bldc`. Props: kind `mechanical`. Statuses and tiers as Procedure P. A prop's `x_fit` is absent (no datasheet rows): the band is null and the UI says so |
| | algorithm | Procedure P. Numbers chosen by physical scaling from the class: `ct0` 0.09 to 0.14, `cp0` 0.04 to 0.08, `R` from stator size, `I0` 0.3 to 1.8 A, the agent writes a short comment in the commit body on how each was picked |
| | validation, errors, edges | `ke` and `kv` given once (kv). No `restricted` flag. Names contain no banned word. Each motor `v_max` covers the cells the 05c batteries pair with it |
| Verification | unit tests | `drone-parts.test.ts`: all 12 validate; `readMotor`/`readProp` ok with `assumed` listing only defaults; `checkDescriptor` (03b) reports nothing on all 12; for each motor/prop pair in a `PAIRS` table in the test (whoop 0802 with 31 mm on 1S, 1104 with 2.5 in on 2S, 1404 with 3 in on 3S, 2004 with 3 in on 4S, 2306 with 5.1 in on 4S, 2807 with 7 in on 6S) full-throttle thrust at nominal voltage is over 0 and current under the motor's `i_max_a` (solved with `solveStatic` and a fixed ideal `PackModel` at nominal voltage, which needs only 06a); ids unique; every `x_price` has `as_of` |
| | integration tests | `npx vitest run src/parts` (B11 library tests pick the new folder up) |
| | Playwright | none |
| | fixtures | the descriptors |
| | acceptance | Given the 2306 motor and the 5.1 in prop (`diameter_mm` 129.5) at 4S nominal voltage, When solved at full throttle, Then thrust is over 0 and current is under `i_max_a`. The T/W 4 to 9 window with the 05d frame and 05c battery is checked in 09a's `evaluate.test.ts` |
| | release blockers | A descriptor that does not validate; a pair over its `i_max_a`. A window missed later in 09a is fixed by a numbers edit to the data files, in a separate fix commit (the agent adjusts the numbers, not the window) |
| Delivery | definition of done | Section 4 |
| | verify commands | `npm run typecheck && npm run lint`; `node scripts/validate-part.mjs --trust core src/parts/data/drone/motor-*.component.json src/parts/data/drone/prop-*.component.json`; `npx vitest run src/parts src/sim/flight/propulsion.test.ts` |
| | docs | none (14) |
| | later tasks need | the 12 ids for 09a, 09b, 12a, 13 |

---

### T-B18-05c Generic batteries and ESCs

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-05c / Parts data / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-05a, T-B18-07a, T-B18-03b (`checkDescriptor`) |
| Intent | problem, user, story | As 05b, for packs and speed controllers |
| | expected behaviour | Six batteries and two ESCs as generic descriptors |
| | success metric | All 8 validate and read ok; `checkDescriptor` finds nothing; pack open-circuit voltage at full charge equals `cells * 4.2` within 0.01 V for `lipo` |
| Implementation | existing files | `component.schema.json:1435+` (`battery`, `esc`); `src/content/drones/*.ts` pack sizes for scale only (no constant copied; DK-3) |
| | new files | Batteries (set): `batt-1s-450-lipo`, `batt-2s-450-lipo`, `batt-3s-850-lipo`, `batt-4s-1300-lipo`, `batt-6s-1300-lipo`, `batt-4s2p-6000-liion`. ESCs (set): `esc-4in1-25a`, `esc-4in1-55a`. Test `src/parts/data/drone/power-parts.test.ts` |
| | edited files | none |
| | data model | `mechanics.battery` (`cells`, `parallel`, `capacity_mah`, `c_continuous`, `c_burst`, `r_cell_ohm`, `chemistry`, `mass_g`); `mechanics.esc` (`i_cont_a`, `i_burst_a`, `channels: 4`, `protocol`, `efficiency`, `v_max`, `mass_g`). Kind `module` for the ESC, `mechanical` for packs; category `drone` |
| | algorithm | Procedure P. `r_cell_ohm` per series position scaled so a 1,300 mAh 4S pack sags about 0.5 to 1 V at 60 A (ESTIMATED window, the test prints the sag). `x_price` per part |
| | validation, edges | Li-ion pack uses `parallel: 2` and the 45 A per parallel cell rule applies in 08c |
| Verification | unit tests | `power-parts.test.ts`: validate; read ok; `checkDescriptor` (03b) clean; `packOpen(pack, 1)` equals `cells * 4.2` for lipo within 0.01; sag window; DB-C-04 limit for each pack positive; ESC `v_max` covers the paired pack's full voltage |
| | Playwright | none |
| | acceptance | Each descriptor opens in B11's part page (`PartPage`) with tier T1 and "not checked against a real part" visible (checked by B11 coverage tests) |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `node scripts/validate-part.mjs --trust core src/parts/data/drone/batt-*.component.json src/parts/data/drone/esc-*.component.json`; `npx vitest run src/parts` |
| | later tasks need | ids for 09a, 09b, 12a, 13 |

---

### T-B18-05d Generic frames and flight controllers

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-05d / Parts data / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-05a, T-B18-03b (`checkDescriptor`) |
| Intent | problem, user, story | As 05b, for frames and the flight controller board |
| | expected behaviour | Four frames and two flight controllers as generic descriptors |
| | success metric | All 6 validate and read ok; `checkDescriptor` finds nothing; `frame-5in-x` has `wheelbase_mm` 225 (used by 11b's pinned hit radius) |
| Implementation | existing files | `component.schema.json:1435+` (`frame`, `fc`); `drone.domain.schema.json` (`controller` is a `brd_` id, so an FC is a board descriptor); `src/content/drones/quad5.ts` frame data for scale (`frame.motors`) |
| | new files | Frames (set): `frame-65mm-whoop`, `frame-3in-cine`, `frame-5in-x`, `frame-7in-x`. FCs (set): `fc-f4-generic`, `fc-f7-generic`. Test `src/parts/data/drone/frame-fc.test.ts` |
| | edited files | none |
| | data model | `mechanics.frame` (`mass_g`, `wheelbase_mm`, `arm_count`, `prop_max_in`, `cd_area_m2`); `mechanics.fc` (`gyro`, `accel`, `baro`, `loop_hz_max`, `mass_g`). FC `identity.kind: "board"`, `category: "drone"`, `simulation.status: "not-modelled-yet"`, `tier: "none"` (no firmware runs in B18; B19 binds `fcParams`) |
| | algorithm | Procedure P. Frames carry no motor positions: positions come from the project's `mounts` (the builder creates them from a layout, T-B18-09d1). Prop maximum: 65 mm whoop 1.2, 3in 3.0, 5in 5.1, 7in 7.0. `frame-5in-x`: `wheelbase_mm` 225 (motor to opposite motor, the same size as `quad5` `sizeMm` 225 at `src/content/drones/quad5.ts:70`) |
| Verification | unit tests | `frame-fc.test.ts`: validate; read ok; `checkDescriptor` (03b) clean; FC `loop_hz_max` is 4000 or 8000 and divisible by 500; DB-C-07 limits positive |
| | acceptance | Validators pass; the FC descriptor is accepted as a `brd_` board by B2's board rules (the test calls the B2 board loader if it exists, else records that it was not reachable) |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `node scripts/validate-part.mjs --trust core src/parts/data/drone/frame-*.component.json src/parts/data/drone/fc-*.component.json`; `npx vitest run src/parts` |
| | later tasks need | ids for 09a, 09b, 13 |

---

### T-B18-06b Datasheet fit and the error band

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-06b / Drone propulsion / B18 |
| | priority, size, status | P0, L, not started |
| | dependencies | T-B18-06a |
| Intent | problem | A person with a manufacturer table (throttle, volts, thrust in grams, amps) needs the propeller coefficients `ct0` and `cp0`, and an honest statement of how far the model is from the table |
| | target user, story | Someone entering a motor and a prop from a datasheet (R-173). "I paste the table, I see the fitted numbers and how well they match" |
| | expected behaviour | Fit two scalars with a fixed-iteration Gauss-Newton from a fixed start, report residuals and a band, and say whether a query point is inside the data's range |
| | success metric | DA-05: from synthetic rows (known model plus 3 percent noise), thrust at held-out points is within 5 percent and the displayed band covers the actual error at 90 percent or more of held-out points |
| Implementation | existing files | `DRONE_ARCHITECTURE.md` 6.3; `propulsion.ts` (06a) |
| | new files | `src/sim/flight/fit.ts`, `src/sim/flight/fit.test.ts` |
| | modules and signatures | `export interface FitRow { v_pack: number; throttle: number; thrust_g: number; current_a: number }`; `export const BAND_FACTOR = 1.645` (Q15); `export interface FitResult { ct0: number; cp0: number; rms_thrust: number; rms_current: number; band: number; n: number; v_range: readonly [number, number]; throttle_range: readonly [number, number]; converged: boolean; iterations: number; warnings: string[] }`; `export function fitDatasheet(rows: readonly FitRow[], m: MotorSI, d_m: number, escEff: number, air: Air): FitResult \| OutOfRange`; `export function bandAt(f: FitResult, v_pack: number, throttle: number): { rel: number; inside: boolean }`; `export interface FitRecord { motor: string; rows: FitRow[]; ct0: number; cp0: number; rms_thrust: number; rms_current: number; band: number; v_range: [number, number]; throttle_range: [number, number]; made: string }` (the `x_fit` entry stored on a prop descriptor, Q7) |
| | data model | `x_fit` on the prop descriptor: `FitRecord[]`, one per motor id it was fitted with; at most 8 records, 32 rows each |
| | algorithm | Duty equals throttle (assumption shown in the UI); `vEff = throttle * v_pack * escEff`. For each row the closed form gives `omega`, thrust and current as functions of `(ct0, cp0)` (`kT` scales with `ct0`, `kQ` with `cp0`). Residual vector: relative thrust error and relative current error per row. Gauss-Newton from `(0.12, 0.06)`, Jacobian by central differences with step `1e-6 * value`, damping `lambda = 1e-3` with up to 8 step halvings, at most 50 iterations, stop when the relative step is under 1e-10. `rms_*` are the relative RMS residuals; `band = BAND_FACTOR * max(rms_thrust, rms_current)`. `bandAt.inside` is true when the point is inside the rows' voltage and throttle ranges (with 5 percent margin), otherwise `rel` is the band doubled and the UI says "outside the range of your data" (R-FID-6) |
| | validation, errors, edges | At least 4 rows and at most 32; rows with `thrust_g <= 0` or `current_a <= 0` are dropped with a warning; fewer than 4 left gives `OutOfRange` `field: 'rows'`. Non-convergence returns `converged: false` and the band is `null`-equivalent (`band: Infinity` is never returned; the field is omitted and the UI shows "fit did not converge"). Throttle outside 0 to 1 is `OutOfRange` |
| | performance | 50 iterations x 32 rows x 5 solves under 5 ms |
| Verification | unit tests | `fit.test.ts`: recovers known `(ct0, cp0)` from noise-free rows to 1e-6; DA-05 with a seeded generator, 200 trials, 16 rows each (8 throttles x 2 voltages) with 3 percent multiplicative noise from a Box-Muller in the test, every 4th row held out: median held-out thrust error under 5 percent in at least 95 percent of trials, and band coverage at or above 90 percent over all held-out points; two runs give identical results (determinism); fewer than 4 rows; non-converging nonsense rows; `bandAt` inside and outside |
| | integration tests | none |
| | Playwright | none |
| | acceptance | Given rows generated from a known model, When fitted, Then the coverage is at least 0.90 and the number is printed. If it is below, the agent raises `BAND_FACTOR` only if S2 has a data-driven value; otherwise stop and report (the constant is an estimate, not a tuning knob) |
| | release blockers | DA-05 failing |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/fit.test.ts`; `npx tsc -p tsconfig.portable.json` |
| | later tasks need | `fitDatasheet`, `FitRecord`, `bandAt` (09a, 09e, S2) |

---

### T-B18-07b Endurance

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-07b / Drone endurance, `src/sim/flight` / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-06a, T-B18-07a |
| Intent | problem | The legacy flight time is `usable * Ah / hoverA * 60 * flyFactor` with a constant g/W and a per-craft fudge (`calc.ts:195-204`) |
| | target user, story | A builder comparing two packs. "A bigger, heavier pack tells me flight time as a range from the physics, not one number" |
| | expected behaviour | Step the pack at 1 s: find the duty that holds the weight, take the pack current, update capacity used and open-circuit voltage, stop at the cell cut-off or the usable fraction. Return a range from the error band |
| | success metric | Monotone: more capacity never shortens a flight, more mass never lengthens it (property tests). The range is `low <= typ <= high` |
| Implementation | existing files | `DRONE_ARCHITECTURE.md` 6.4; `battery.ts` (07a); `propulsion.ts` (06a); `calc.ts:195-204` for the legacy comparison |
| | new files | `src/sim/flight/endurance.ts`, `src/sim/flight/endurance.test.ts` |
| | modules and signatures | `export function toPackModel(p: PackSI, idle_a: number): PackModel` (imports `PackModel` from `propulsion.ts` (06a) and `PackSI`, `ocvCell`, `packResistance` from `battery.ts` (07a): `open_v(soc) = cells * ocvCell(p, soc)`, `r_ohm = packResistance(p)`, `idle_a` as given); `export interface EnduranceInput { drives: readonly Drive[]; pack: PackSI; weight_n: number; thrustScale: number; currentScale: number; usable: number; idle_a: number; air: Air; fast?: boolean }`; `export interface EnduranceResult { seconds: number; stoppedBy: 'cutoff' \| 'capacity' \| 'cannot-hover'; duty0: number; amps0: number; usedMah: number }`; `export function hoverEndurance(i: EnduranceInput): EnduranceResult \| OutOfRange`; `export interface EnduranceRange { low_s: number; typ_s: number; high_s: number; basis: 'fit-band' \| 'no-fit' }`; `export function enduranceRange(i: Omit<EnduranceInput, 'thrustScale' \| 'currentScale'>, band: number \| null): EnduranceRange \| OutOfRange`; `export const USABLE_DEFAULT = 0.8` |
| | algorithm | Loop with `dt = 1 s` (`fast`: 5 s and 24 bisection iterations). Each step: `target = weight_n / thrustScale`; `duty = dutyForThrust(...)`; if `'unreachable'` stop `cannot-hover`; `amps = i_pack * currentScale`; `used += amps * dt / 3.6` mAh; `soc = 1 - used / capacity`; stop `capacity` when `used >= usable * capacity`; stop `cutoff` when `status(...) === 'cut'`. Cap at 7,200 s. `enduranceRange`: `typ` with scales 1; with a band `b`, `low` uses `thrustScale = 1 - b`, `currentScale = 1 + b`, `high` uses `1 + b`, `1 - b`; with `band === null` all three equal `typ` and `basis: 'no-fit'` |
| | validation, errors, edges | `usable` over 0 up to 1; `band` 0 to 0.9. A pack that cannot lift gives `seconds: 0`, `cannot-hover`. A 2-hour cap gives `stoppedBy: 'capacity'` |
| | performance | 4 motors, 1,200 s hover under 60 ms exact (ESTIMATED; measured); `fast` under 5 ms and within 1 percent of exact (tested) |
| Verification | unit tests | `endurance.test.ts`: `toPackModel` gives `open_v(1)` equal to `cells * ocvCell(p, 1)`, `r_ohm` equal to `packResistance(p)` and carries `idle_a`; property tests over 200 seeded builds (capacity up gives time up; weight up gives time down); `low <= typ <= high`; cannot-hover; cut-off stop for a high-resistance pack; `fast` within 1 percent; compared with the legacy formula for the generic 5-inch build, the test only prints both (they use different physics; no equality claimed) |
| | acceptance | Given the 5-inch reference build with a null band, When ranged, Then `low = typ = high` and `basis` is `no-fit` |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/endurance.test.ts`; `npx tsc -p tsconfig.portable.json` |
| | later tasks need | `hoverEndurance`, `enduranceRange`, `toPackModel` (08c, 09a, 12a) |

---

### T-B18-08c Checks DB-C-01 to DB-C-14 and structural errors

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-08c / Drone checks, `src/sim/flight` / B18 |
| | priority, size, status | P0, L, not started |
| | dependencies | T-B18-01, 06a, 07b, 08a, 08b |
| Intent | problem | Nine checks exist, tied to per-craft constants (`calc.ts:300-325`). Fourteen are specified, generalised to part data, each with the value, the limit, the limiting part and the formula (DRONE 8.1) |
| | target user, story | A builder. "Each problem names the part, the number and the limit; I know what to change" |
| | expected behaviour | `runChecks` returns one `BuildCheck` per DB-C id plus structural errors. It reads a plain input record so it does not depend on the project loader |
| | success metric | One passing and one failing fixture per check; the thresholds are named constants; the cause ids come from the 45-id registry |
| Implementation | existing files | `src/lib/drone/calc.ts:270-274` (`HOVER_THR_LIMIT 0.6`, `LIION_CELL_A 45`, `SHORT_FLIGHT_MIN 2`), `:289-293`, `:300-325`; `DRONE_ARCHITECTURE.md` 8.1; B3 `src/sim/faults/cause-ids.ts` (T-B3-20); `SIMULATION_ARCHITECTURE.md` 13.4 |
| | new files | `src/sim/flight/checks.ts`, `src/sim/flight/checks.test.ts` |
| | edited files | none |
| | modules and signatures | `export type CheckId = 'DB-C-01' \| ... \| 'DB-C-14'` (14 literals); `export type CheckResult = 'ok' \| 'warn' \| 'fail' \| 'info'` (Q16); `export interface BuildCheck { id: CheckId; result: CheckResult; value: number \| null; limit: number \| null; unit: string; limitingPart: string \| null; formula: string; assumptions: string[]; tier: 'T1'; cause_id: string \| null; symptom_id: string \| null }`; `export type BuildErrorId = 'DB-E-INERTIA' \| 'DB-E-MIXER' \| 'DB-E-MIXER-YAW' \| 'DB-E-FIELD' \| 'DB-E-CHEMISTRY'`; `export interface BuildError { id: BuildErrorId; message_key: string; path: string \| null }`; `export const THRESHOLDS: { minTW: 2.0; hoverThrottle: 0.6; cgWarn: 0.05; cgFail: 0.12; yawBalance: 0.05; massChipG: 250; shortFlightMin: 2; clearanceMm: 5 }`; `export interface CheckInput { auw_n: number; auw_g: number; slots: ReadonlyArray<{ id: string; label: string; motor: MotorSI; prop: PropSI; esc: EscSI; escLabel: string; spin: 'cw' \| 'ccw'; prop_spin: 'cw' \| 'ccw'; axis_mm: readonly [number, number]; z_mm: number }>; pack: PackSI; packLabel: string; frame: FrameSI \| null; fc: FcSI \| null; flight: { model: 'flight-game@1' \| 'multirotor-rigid@1'; step_hz?: number; pid_hz?: number; gyroLpfHz?: number }; full: { thrust_n: number; i_pack_a: number; i_motor_a: readonly number[]; rpm_noload: readonly number[]; v_cell_loaded: number }; hover: { throttle: number; torque_nm: readonly number[] }; endurance: EnduranceRange \| null; mass: MassProps \| null; cg: { fraction: number } \| null; clash: ReturnType<typeof propClash>; classMinTW: number; makerLimitsExceeded: ReadonlyArray<{ part: string; field: string }> ; missing: readonly Need[] }`; `export function runChecks(i: CheckInput): { checks: BuildCheck[]; errors: BuildError[] }` |
| | algorithm | DB-C-01: `tw = full.thrust_n / auw_n`; fail under 1.0; warn under `classMinTW` (cause `thrust-to-weight-low`). DB-C-02: warn when `hover.throttle` (the legacy definition `sqrt(weight / full thrust)`) exceeds 0.6 (`hover-throttle-too-high`). DB-C-03: per-motor current against `esc.i_cont_a`: warn above, fail above `i_burst_a` when present (`esc-overcurrent`). DB-C-04: `i_pack` against `c_continuous * Ah` for lipo and lihv, `45 * parallel` for liion: warn above, fail above `c_burst * Ah` when present (`battery-overcurrent`). DB-C-05: `rpm_noload` against `prop.rpmMax`; `cells * 4.2` (lihv 4.35) against `motor.v_max` and `esc.v_max`: fail on any. DB-C-06: `clash.pairs` non-empty fails, names the pair (`prop-clash`). DB-C-07: `prop.d_m * 39.37` against `frame.prop_max_in`: fail above. DB-C-08: `cg.fraction` warn above 0.05, fail above 0.12 (`cg-offset`). DB-C-09: `endurance.low_s / 60` warn under 2. DB-C-10: `full.v_cell_loaded` fail under `cut`, warn under `low` (from `CELL_LIMITS`). DB-C-11: any `prop_spin != spin` fails and names the motor (`props-swapped`); else the hover torque balance `abs(sum(sign_i * Q_i)) / mean_total_abs_Q` over 0.05 warns. DB-C-12: rigid model only; `pid_hz` over `fc.loop_hz_max` fails; `gyroLpfHz` at or above `pid_hz / 2` warns; the game model returns `ok` with `value: null` and the assumption "not used by the game model". DB-C-13: `info` when `auw_g > 250` (SN-6). DB-C-14: `warn` when `makerLimitsExceeded` is non-empty and names the first part. Structural: `DB-E-INERTIA` when `mass` is null or not positive definite; `DB-E-MIXER` when the matrix rows `[1, y_i, -x_i, s_i]` (s_i the spin sign) have rank under 3; `DB-E-MIXER-YAW` when the rank is exactly 3 (no yaw authority, Q-note); `DB-E-FIELD` once per `missing` entry; `DB-E-CHEMISTRY` for a chemistry other than lipo, lihv, liion. Rank by Gaussian elimination with pivot tolerance `1e-9` of the largest entry |
| | state transitions | none |
| | validation, errors, edges | A check whose inputs are missing is left out and the missing path appears as a `DB-E-FIELD` error; a check never guesses and never reports `ok` on missing data. When nothing is missing the list has exactly 14 entries |
| | permissions, migration | Section 4 |
| | performance | Under 0.2 ms |
| Verification | unit tests | `checks.test.ts`: per check an ok and a failing input (values just inside and just outside each threshold); cause ids exist in the registry (imports `src/sim/faults/cause-ids.ts`; fails with the missing path if B3 did not build it); all 14 present for a complete input; each `DB-E` id; `THRESHOLDS` frozen; no banned word in any `formula` string |
| | integration tests | 09a feeds it from real parts |
| | Playwright | none |
| | acceptance | Given a build whose propeller is 20 percent larger than the spacing, When checked, Then DB-C-06 is `fail` with both motor ids in `limitingPart`. Given a pack C rating exceeded, Then DB-C-04 warns and names the pack |
| | release blockers | A threshold changed from `DRONE_ARCHITECTURE.md` 8.1 without Amar |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/checks.test.ts`; `npx tsc -p tsconfig.portable.json` |
| | later tasks need | `runChecks`, `CheckInput`, `BuildCheck`, `THRESHOLDS` (09a, 09c, 12a) |

---

### T-B18-09a Build extraction and `evaluateBuild`

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-09a / Drone builder core, `src/sim/flight` / B18 |
| | priority, size, status | P0, L, not started |
| | dependencies | T-B18-04, 05a to 05d, 06b, 07b, 08a, 08c |
| Intent | problem | The pieces (readers, solve, battery, endurance, mass, clash, checks) are separate. The UI needs one call from a project to all numbers, and a clear answer to "which output is blocked by which missing field" (DA-03) |
| | target user, story | The builder UI. "I change a motor and every tile updates; if the motor lacks a no-load current, the thrust tile still shows and the current tile says what is missing" |
| | expected behaviour | `buildFromProject` reads slots, parts, mounts and bodies into a `Build`; `evaluateBuild` returns all outputs, the checks, the band, the assumptions and what is blocked |
| | success metric | DA-03: with all fields present the outputs include hover throttle, thrust-to-weight, hover current and a flight-time range with tier T1 and the assumption list; with one required field removed only the outputs that need it are blocked, and the blocked entry names the path. The generic 5-inch reference build lands in the windows of Procedure P step 9 (the only place they are asserted) |
| Implementation | existing files | `drone.domain.schema.json` (`DroneData`, `MotorSlot`); `project.schema.json` `Mechanical`, `Mount`, `Frame`; `src/project/domains/drone-semantic.ts` (04); `mechanics.ts` (05a); 06a, 06b, 07a, 07b, 08a, 08b, 08c; the 05b to 05d descriptors |
| | new files | `src/sim/flight/build.ts`, `src/sim/flight/evaluate.ts`; tests beside them |
| | edited files | none |
| | modules and signatures | `build.ts`: `import type { ProjectView, Resolve } from '#project/domains/drone-semantic'` (defined in T-B18-04; not redefined here); `export interface BuildSlot { id: string; motor: MotorSI; prop: PropSI; esc: EscSI; spin: 'cw' \| 'ccw'; prop_spin: 'cw' \| 'ccw'; axis_mm: readonly [number, number]; z_mm: number; thrust_axis: readonly [number, number, number]; motorRef: string; propRef: string; escRef: string }`; `export interface Build { projectId: string; kind: 'multirotor'; slots: BuildSlot[]; pack: PackSI; packRef: string; frame: FrameSI \| null; fc: FcSI \| null; bodies: PlacedBody[]; flight: DroneData['flight']; fits: ReadonlyMap<string, FitRecord> ; assumed: string[]; missing: Need[] }`; `export function buildFromProject(p: ProjectView, resolve: Resolve): { build: Build } \| { error: 'not-a-multirotor' \| 'no-drone-domain' }`; `export function frameWorldPose(frames, id: string): Pose` (composes the frame tree with `rotationFromRpy`). `evaluate.ts`: `export interface Band { rel: number \| null; basis: 'fit' \| 'no-fit'; inside: boolean }`; `export interface BuildOutputs { auw_g: number; thrustPerMotor_g: number; tw: number; hoverThrottle: number; hoverDuty: number; hoverAmps: number; maxAmps: number; endurance: EnduranceRange \| null; checks: BuildCheck[]; errors: BuildError[]; mass: MassProps \| null; band: Band; tier: 'T1'; assumptions: string[]; blocked: ReadonlyArray<{ output: OutputId; needs: Need[] }> }`; `export type OutputId = 'thrust' \| 'current' \| 'hover' \| 'endurance' \| 'mass' \| 'cg' \| 'checks'`; `export function evaluateBuild(b: Build, opts?: { air?: Air; classMinTW?: number; fast?: boolean }): BuildOutputs` |
| | data model | `x_fit` is read from each prop descriptor (`FitRecord[]`); the record whose `motor` equals the slot's motor id gives the slot band. The build band is the largest slot band, or `no-fit` if any slot has none (no claim is made then). `hoverThrottle = sqrt(weight_n / full_thrust_n)` (the legacy definition, so `CalcOutputs` stays comparable); `hoverDuty` is the physical duty from `dutyForThrust` |
| | algorithm | 1) Resolve each slot's three component refs through `resolve`; read blocks with 05a; collect `missing` and `assumed`. 2) Mounts to `axis_mm` and `z_mm` through the frame pose; thrust axis from `rpy_deg`. 3) Needs table: `thrust` needs motor and prop; `current` also battery and esc; `hover` needs thrust and mass; `endurance` needs hover and battery; `mass` needs bodies; `cg` needs mass and mounts; `checks` needs all. A missing path blocks only the outputs whose needs include it. 4) Full-throttle point at the pack's loaded voltage via `maxThrust` at `soc = 1`; hover via `dutyForThrust`; endurance via `enduranceRange(..., band)`. 5) Fill `CheckInput` and call `runChecks`. 6) `makerLimitsExceeded`: for each exceeded limit from DB-C-03, 04, 05 whose block's `source` resolves to a `manufacturer`-class source, one entry; none of the generic parts has one |
| | state transitions | `empty` (no slots) -> `partial` (some blocked) -> `complete` -> `computed`; a pure function of the document, no stored state |
| | validation, errors, edges | A `legacy-craft` returns `not-a-multirotor`. Mixed-up refs (a battery as a motor) are `DRN-*-ROLE` from 04, reported by the caller. Fewer than 3 slots: slot count error from the schema. Unequal motors are allowed; drives are solved per distinct slot. Mount missing: `missing` with the `mnt_` id |
| | permissions | Section 4 |
| | performance | `evaluateBuild` for a 4-motor build under 100 ms exact and 10 ms with `fast` (ESTIMATED; measured; UI uses `fast` while a field is being edited and exact on commit) |
| Verification | unit tests | `build.test.ts`: the quad example project resolved against the 05b to 05d descriptors (the agent edits a copy so its refs point at `core.motor-2306-1750kv` etc.); 4 slots with axes at +/- 79.5 mm; thrust axes (0, 0, 1). `evaluate.test.ts`: complete build gives all outputs and 14 checks; DA-03: delete each needed field in turn (parametrised over motor `i_noload_a`, prop `ct0`, battery `r_cell_ohm`, battery `capacity_mah`, esc `i_cont_a`, frame `mass_g`) and assert the blocked list and that unrelated outputs remain; reference windows of Procedure P step 9 on the 5-inch reference build (`frame-5in-x`, `motor-2306-1750kv`, `prop-5.1in-3b`, `batt-4s-1300-lipo`, `esc-4in1-55a`, `fc-f4-generic`): full-throttle T/W 4 to 9, hover throttle 0.25 to 0.5, per-motor current under 40 A at full throttle, hover pack current printed, `endurance.typ_s` between 240 and 540 s; the numbers are printed; a fitted prop gives `basis: 'fit'` and a band equal to the stored `band`; two identical runs give identical numbers; equal motors vs one distinct motor gives the same current as the sum |
| | integration tests | `npx vitest run src/sim/flight src/parts src/project` |
| | Playwright | none |
| | fixtures | a project built in the test from `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/drone-quad.project.json` (full prefix, section 4) |
| | acceptance | DA-03 as in the success metric |
| | observability | `evaluateBuild` never throws; issues are values |
| | release blockers | A window missed; DA-03 failing |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight src/parts src/project`; `npx tsc -p tsconfig.portable.json` |
| | later tasks need | `Build`, `buildFromProject`, `evaluateBuild`, `BuildOutputs` (09c, 09d1, 09f, 10b, 11a, 12a) |

---

### T-B18-09b Part picker with compatibility flags

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-09b / Studio drone UI / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-05a to 05d, T-B18-03a |
| Intent | problem | The old design panel offers 3 x 3 x 3 dropdowns (`DesignPanel.tsx`); the builder needs any motor, prop, ESC, battery and frame from the library |
| | target user, story | A builder. "I search motors, see which ones fit my frame and pack, and pick one" |
| | expected behaviour | A list (keyboard path first) of parts of one role with a search box and flags such as "needs 4S or fewer", "prop too large for frame", "no no-load current: thrust blocked" |
| | success metric | Every role lists its generic parts; a flag appears for the known incompatible pairs; a screen reader reads the list as a listbox; no flag claims anything beyond the numbers |
| Implementation | existing files | B11 `src/parts/search.ts` (T-B4-07, T-B11-16), `src/parts/browser/library.ts`; `mechanics.ts` (05a); `src/components/ui/Chip.tsx` |
| | new files | `src/components/studio/drone/PartPicker.tsx`, `src/studio/drone/picker.ts`; tests beside them |
| | edited files | `src/i18n/messages/*/dronebuild.json` (picker strings) |
| | modules and signatures | `picker.ts`: `export interface PickerItem { id: string; label: string; role: Role; flags: PickerFlag[]; read: 'ok' \| 'partial'; price?: { amount: number; asOf: string } }`; `export type PickerFlag = { kind: 'cells-over-motor'; max: number } \| { kind: 'prop-over-frame'; maxIn: number } \| { kind: 'esc-volts'; max: number } \| { kind: 'missing'; path: string }`; `export function listParts(role: Role, lib: readonly ComponentDescriptor[], ctx: { cells?: number; frame?: FrameSI \| null; query?: string }): PickerItem[]`. `PartPicker.tsx`: `export function PartPicker(props: { role: Role; ctx; lib; value: string \| null; onPick(id: string): void; t: DroneBuildT }): JSX.Element` |
| | algorithm | Filter by `roleOf`; rank by search match then label; flags: `cells-over-motor` when `ctx.cells * 4.2` exceeds `motor.v_max`; `prop-over-frame`; `esc-volts`; `missing` from `Read.missing`. Flags are shown, never hidden: the item stays pickable (a person may want the over-spec case to see DB-C-05 fire) |
| | state transitions | `closed -> open -> picked` |
| | validation, errors, edges | Empty library: the list says so and points to the entry form (09e). Prices shown only when `x_price` exists, with `as_of` and "estimate" |
| | accessibility | `role="listbox"`, arrow keys, type-ahead; flags are text with an icon, not colour alone |
| Verification | unit tests | `picker.test.ts`: role filtering over the 26 generic parts; flags for 6S on a 4S-only motor; search ranking. `PartPicker.test.tsx`: arrow keys and Enter pick; flag text rendered; axe |
| | Playwright | covered by 13 |
| | acceptance | Given a 6S pack in context, When motors are listed, Then the 1104 and 1404 motors show a `cells-over-motor` flag with their limit |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/drone src/studio/drone src/i18n` |
| | later tasks need | `PartPicker`, `listParts` (09d1) |

---

### T-B18-10a Generic craft figure

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-10a / Studio art, `src/studio/art` / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-05a |
| Intent | problem | The 13 hand-inked craft figures cannot draw an arbitrary build (`figures/drones/*.js`, 5,070 lines; DRONE 5.5). The builder needs a picture that follows the document |
| | target user, story | A builder. "I move a motor mount and the picture moves with it" |
| | expected behaviour | A function from the build's geometry to an SVG string: arms from the centre to each mount, motor circles, propeller discs at their real diameter with a clash highlight, body plates, battery and camera blocks, centre-of-mass marker, thrust arrows as an overlay option |
| | success metric | DA-24: for each of the 13 layouts (the converted B13 projects), every motor and prop position in the SVG matches the document mount to 0.5 mm in SVG units (1 unit = 1 mm) |
| Implementation | existing files | `src/lib/flight/registry.ts:137-160` (`craftLook`: palette and ink style; reuse `Palette` from `@/content/schema`); B4 `src/studio/art/fallback.ts` (T-B4-06) for the stroke style constants; B13 `content/projects/drones/{a,b}/<id>.project.json` (T-B13-06, 07) |
| | new files | `src/studio/art/craft.ts`, `src/studio/art/craft.test.ts` |
| | edited files | none |
| | modules and signatures | `export interface CraftGeometry { motors: ReadonlyArray<{ id: string; x_mm: number; y_mm: number; r_mm: number; spin: 'cw' \| 'ccw'; clash: boolean }>; bodies: ReadonlyArray<{ id: string; role: 'frame' \| 'battery' \| 'camera' \| 'stack' \| 'other'; x_mm: number; y_mm: number; w_mm: number; h_mm: number; rot_deg: number }>; com_mm: readonly [number, number] \| null }`; `export interface CraftStyle { palette: 'tomato' \| 'mustard' \| 'mint' \| 'cobalt' \| 'blush'; showThrust: boolean; showCom: boolean }`; `export function craftSvg(g: CraftGeometry, s: CraftStyle): string`; `export function `geometryOf(b: Build, clash: ReturnType<typeof propClash>, mass: MassProps \| null): CraftGeometry` is exported by `src/studio/drone/use-build.ts` (T-B18-09d1), not by this file, so this file takes the plain geometry and its test builds it from the projects |
| | algorithm | Fixed viewBox from the extents plus 10 percent margin; y flipped so +x is up the page (forward) and +y left, matching the FLU frame; coordinates written with one decimal. Arms are lines centre to motor; a clashing pair draws its discs with a dashed outline and a text label (not colour only). Output is a string with no script and no external reference (safe to place with `innerHTML` after B11's sanitiser, which this file does not need to call because it emits only its own elements) |
| | validation, errors, edges | Zero motors: an empty frame with the text "no motors". Radius over 500 mm or under 1 mm clamps the draw and the test pins that the position is unchanged |
| | performance | Under 5 ms for 12 motors |
| Verification | unit tests | `craft.test.ts`: DA-24 for each project in `content/projects/drones/{a,b}/*.project.json` (T-B13-06 and 07) that has `kind` multirotor or legacy-craft (13 files; each motor `cx`, `cy` parsed from the SVG equals the mount within 0.5 mm after the known y-flip); the SVG has no `<script`, no `href`, no `on*=` attribute; a clash draws the label; snapshot of the quad as text, not image |
| | acceptance | DA-24 with the numbers printed (13 layouts, N motors, worst error) |
| | release blockers | A position off by more than 0.5 mm |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/studio/art/craft.test.ts` |
| | later tasks need | `craftSvg` (09d2, 09f) |

---

### T-B18-S2 Spike: how close is the model to published tables?

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-S2 / Drone propulsion accuracy / B18 |
| | priority, size, status | P1, M, not started. Verdict only; runs only if S1 found data |
| | dependencies | T-B18-S1, T-B18-06b |
| Intent | falsifiable question | On at least 8 published motor and propeller combinations (S1's data), when half the rows of each table are used to fit `ct0` and `cp0` and the other half are predicted, is the median relative thrust error at most 10 percent, the 90th percentile at most 20 percent, and does the displayed band (1.645 x RMS) cover at least 90 percent of the held-out points? (DK-1; council Q2) |
| | exit condition | `REPORT.md` with the per-combination table (n rows, fit RMS, held-out median and p90 thrust and current error, coverage) and a verdict: PASS (all three hold), PARTIAL (which fail, with the numbers), or UNKNOWN (S1 gave fewer than 8 combinations, in which case S2 reports "not run" and why). If coverage is under 90 percent the report states the factor that would give 90 percent; the orchestrator, not the spike, changes `BAND_FACTOR` |
| Implementation | new files | `docs/MASTER_PLAN/08_RESEARCH_SPIKES/S-B18-2-propulsion-accuracy/REPORT.md`; a throwaway script in `/Users/amar/iynk-master-plan-scratch/buildplan/b18/` that imports `fit.ts` through `npx vitest` or `tsx`; no repo source change |
| | method | Use only data that S1 marked redistributable or that the agent reads and does not copy into the repo. Even split by alternating rows. Label the result ESTIMATED; it says nothing about parts outside the table |
| Delivery | verify commands | none; `git status` shows the report only |
| | later tasks need | A PARTIAL or FAIL verdict changes the wording of the band explanation in `docs/DRONES.md` (14) and may reopen Q15 |

---

### T-B18-09c Numbers panel and checks list

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-09c / Studio drone UI / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-09a, T-B18-03c |
| Intent | problem | `DesignPanel.tsx` shows tiles for the legacy calculator only. The builder must show every number with its unit, tier and band, and each check with its part and formula |
| | target user, story | A builder. "I read thrust, weight, hover throttle, current and flight time as text with units; the checks list tells me which part to change" |
| | expected behaviour | `NumbersPanel` shows the tiles as a definition list; each has unit, the tier chip T1, and the error band or "no data to check against"; blocked outputs show what is missing. `ChecksList` lists the 14 checks sorted fail, warn, info, ok, each expandable to value, limit, formula and assumptions |
| | success metric | No number without a unit; SN-8 visible on the panel; axe clean; the flight time shows as a range with the sentence about the band |
| Implementation | existing files | `src/components/dronelab/DesignPanel.tsx:19-70` (tile structure and `tileDigits` for rounding, reused as constants from `calc.ts` `tileDigits`); `src/components/ui/Chip.tsx`, `Callout.tsx`; `formatNumber` in `src/components/dronelab/text.ts` |
| | new files | `src/components/studio/drone/NumbersPanel.tsx`, `ChecksList.tsx`; tests beside |
| | edited files | `src/i18n/messages/*/drone.json` (labels, units, band sentences, check names) |
| | modules and signatures | `export function NumbersPanel(props: { out: BuildOutputs; lang: Locale; t: DroneT }): JSX.Element`; `export function ChecksList(props: { checks: readonly BuildCheck[]; errors: readonly BuildError[]; t: DroneT }): JSX.Element` |
| | data model | Text keys `numbers.tw`, `numbers.hoverThrottle`, `numbers.hoverAmps`, `numbers.maxAmps`, `numbers.endurance`, `numbers.auw`, `band.fit`, `band.none`, `band.outside`, `check.DB-C-01.name` and so on |
| | algorithm | Band sentence: "within the range of your datasheet rows: about 9 in 10 of your own rows fall inside this band; it says nothing about how well the rows match a real part" (R-FID-6). With no fit: "no datasheet rows were given, so there is nothing to check this against". Flight time: "x to y minutes" |
| | validation, errors, edges | All values formatted with `Intl.NumberFormat` in the viewer's locale. `NaN`/`Infinity` never reach the panel (evaluate returns blocked entries instead); if one does, the panel shows "not available" and logs `drone.numbers` |
| | accessibility | Definition list, headings, check state as text ("failed", "warning") |
| Verification | unit tests | `NumbersPanel.test.tsx`: all tiles with units in en, de, zh, hi; band sentence for fit, no-fit and outside; blocked output shows the path; SN-8 present. `ChecksList.test.tsx`: order, expand, 14 rows, banned-word scan of rendered text |
| | acceptance | Given a build with a null band, When rendered, Then the flight time shows one range with the "nothing to check this against" sentence |
| | release blockers | A unitless number; a banned word |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/drone src/i18n` |
| | later tasks need | `NumbersPanel`, `ChecksList` (09d2, 09f, 12b) |

---

### T-B18-09e Part entry form from datasheet rows

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-09e / Studio drone UI / B18 |
| | priority, size, status | P0, L, not started |
| | dependencies | T-B18-05a, T-B18-06b, T-B18-03a |
| Intent | problem | R-173: a person enters a motor or a battery from a datasheet and it carries source and uncertainty fields. Without this, only the 26 generic parts exist |
| | target user, story | A builder with a datasheet. "I type the motor's kv and resistance, paste the thrust table, see the fitted numbers and the band, and save it as my part" |
| | expected behaviour | A form for a motor, a propeller, a battery and an ESC (an ESC is needed because every slot requires one). For a motor+propeller pair it takes up to 32 datasheet rows, runs `fitDatasheet` live and shows `ct0`, `cp0`, residuals and the band. Save writes `local.*` descriptors (and the `x_fit` record on the prop) through `PartLibrary.save` (B11 `parts` store) after `validateDescriptor` |
| | success metric | A motor and a prop entered with rows produce descriptors that validate with trust `local` and read ok through 05a; the band shown equals `fit.band`; the source is stored |
| Implementation | existing files | B11 `src/studio/parts/draft.ts` (T-B11-04a `toDescriptor`), `src/parts/browser/library.ts` (T-B11-16: `getPartLibrary()` then `PartLibrary.save(def, files): Promise<PutResult>`, which calls `PartsRepository.put` in `src/local/parts-store.ts`, T-B11-13, and registers the part so the picker sees it; result `added`, `same` or `conflict`), `src/parts/validate.ts` (T-B11-01), `src/components/studio/PartEditor.tsx` (T-B11-04b, linked from, not edited); `fit.ts` (06b); `mechanics.ts` (05a); `src/i18n/namespaces.ts` |
| | new files | `src/components/studio/drone/PartEntryForm.tsx`, `src/studio/drone/entry.ts`; `src/i18n/messages/*/droneparts.json` (new namespace); tests |
| | edited files | `src/i18n/namespaces.ts` (add `droneparts`) |
| | modules and signatures | `entry.ts`: `export interface MotorEntry { name: string; kv_rpm_per_v: number; r_ohm: number; i_noload_a: number; v_max?: number; i_max_a?: number; mass_g: number }`; `PropEntry { name: string; diameter_in: number; pitch_in: number; blades: number; mass_g: number }`; `EscEntry { name: string; i_cont_a: number; i_burst_a?: number; channels: number; protocol: string; efficiency?: number; v_max?: number; mass_g: number }` (`protocol` takes the values the `mechanics.esc.protocol` field allows in `component.schema.json` line 1577 and following; the agent reads them first); `PackEntry { name: string; cells: number; parallel?: number; capacity_mah: number; c_continuous?: number; r_cell_mohm?: number; chemistry: 'lipo' \| 'lihv' \| 'liion'; mass_g: number }`; `SourceEntry { title: string; url?: string; kind: 'manufacturer-datasheet' \| 'own-measurement' \| 'community'; note?: string }`; `export function parseRows(text: string): { rows: FitRow[]; errors: string[] }` (CSV or tab separated, header optional, up to 32 rows); `export function entryToDescriptors(e: { motor?: MotorEntry; prop?: PropEntry; pack?: PackEntry; esc?: EscEntry; source: SourceEntry; rows?: FitRow[]; license?: string }): { descriptors: ComponentDescriptor[]; fit: FitResult \| null; issues: PartIssue[] }`. `PartEntryForm.tsx`: `export function PartEntryForm(props: { onSaved(ids: string[]): void; t: DroneT }): JSX.Element` |
| | data model | Descriptor `id`: `local.<slug>` from the name; `version: 1.0.0`; `sources[0]` kind from the entry (`manufacturer-datasheet` becomes the `manufacturer` slot where the number is a maker claim; own measurement becomes `measured`); `provenance.origin: "local-user"`, `provenance.license` from the form, default `LicenseRef-user-supplied`; `simulation.tier: "T1"`, `status: "partly-modelled"`; the prop gets `x_fit: [FitRecord]` when rows were given; `x_price` absent unless typed |
| | algorithm | Unit conversion: inches to mm (25.4), milliohm to ohm. Parse rows, fit, build descriptors, run `validateDescriptor(d, {trust: 'local'})`; show issues by path; Save is enabled only with zero errors. Uncertainty: the motor and prop numbers are stored as typed; the band is the only stored uncertainty and is labelled "fit residual, not a tolerance" |
| | validation, errors, edges | Rows over 32 are refused with a count. Rows with commas as decimals (de) are parsed by locale rule: a column separated by tab or semicolon uses comma decimals, otherwise dot; the form shows the parsed table back for confirmation. A pasted row with a non-number names the line. Name collisions with an installed `local.*` id of the same version: refused (B11 rule S-15), message offers a new version |
| | permissions | Section 4. Local store only; the server never sees the part (RC-24) |
| | performance | Fit runs on every edit but debounced 150 ms; under 5 ms |
| Verification | unit tests | `entry.test.ts`: `parseRows` for CSV, tab, semicolon with comma decimals, header line, 33 rows refused; `entryToDescriptors` validates with trust `local` for a full motor+prop+rows case and for an ESC-only entry (an `esc` entry reads ok through `readEsc`, so a person can complete a build, which needs an ESC in every slot, with only their own parts); the stored band equals `fit.band`; issues surface (negative kv); license default. `PartEntryForm.test.tsx`: paste rows, fit result shown, Save disabled until valid, axe |
| | integration tests | the saved parts appear in `listParts` (09b) when the library includes the `parts` store (fake-indexeddb from B11 tests) |
| | Playwright | covered by 13 |
| | acceptance | Given rows generated from a known model, When pasted, Then the fitted `ct0` is within 2 percent of the known value and the band sentence is shown; after Save, the part is in the picker |
| | release blockers | A saved descriptor that fails validation; a part saved without a source |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/drone src/studio/drone src/i18n` |
| | later tasks need | `entryToDescriptors` (13) |

---

### T-B18-11c Model-keyed ghosts and medals, "tuned to feel" label

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-11c / Flight range / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-03a |
| Intent | problem | Ghosts are stored per `(craft, course)` and medals are set for the calibrated factory craft (`registry.ts:277-290`). A rigid-model lap (B19) must not share them (Objection 7). The game model must say what it is |
| | target user, story | A pilot with a user build. "My ghosts and medals belong to this model; the screen says it is tuned to feel and cannot teach PID tuning" |
| | expected behaviour | A `FlightModelId` type, a ghost key that adds the model for any model other than `flight-game@1`, a medal function that returns nothing for the rigid model, and a visible label under the flight range |
| | success metric | DA-20: with the game model, the fly view shows the label and ghosts/medals are read and written; with `multirotor-rigid@1` the ghost key differs and `medalForModel` returns null. Stored ghosts of the 13 crafts still load (key unchanged for the game model) |
| Implementation | existing files | `src/lib/flight/ghost.ts:14-23` (`GhostTrack`), `:103-111` (`isGhostTrack`), `:111` (`keyOf`), `:114-134` (`loadGhost`, `saveGhost`); `registry.ts:286-290` (`medalFor`); `FlightRange.tsx:333-345` (ghost load/save), `:229-235` (medal line); `src/i18n/messages/en/flight.json` |
| | new files | `src/lib/flight/model-id.ts`, `src/components/flight/ModelLabel.tsx`; tests |
| | edited files | `src/lib/flight/ghost.ts`, `src/components/flight/FlightRange.tsx`, `src/i18n/messages/*/flight.json` |
| | modules and signatures | `model-id.ts`: `export type FlightModelId = 'flight-game@1' \| 'multirotor-rigid@1'`; `export const DEFAULT_MODEL: FlightModelId`; `export function modelSuffix(m: FlightModelId): string` (empty string for the game model, `@rigid1` otherwise); `export function medalForModel(m: FlightModelId, time: number, par: ParTimes \| null): Medal \| null`. `ghost.ts`: `loadGhost(craft, course, model?)`, `saveGhost(g, model?)` with `model` defaulting to the game model; `keyOf` becomes `iynk:ghost:v1:${craft}:${course}${modelSuffix(model)}`; `GhostTrack` gains an optional `model?: FlightModelId` (absent means game). `ModelLabel.tsx`: `export function ModelLabel(props: { model: FlightModelId; t: FlightStrings }): JSX.Element`. `FlightRange` props gain `model?: FlightModelId` |
| | data model | Storage keys: unchanged for the game model; new keys for others. No migration |
| | algorithm | `isGhostTrack` accepts the optional `model`. `FlightRange` passes `model` to `loadGhost`/`saveGhost` and uses `medalForModel` in place of `medalFor`. `ModelLabel` text for the game model: "This flight model is tuned to feel. It cannot teach PID tuning. Medal times are set for the factory craft." |
| | validation, errors, edges | A user build's `craft.id` already differs per build (11b), so ghosts of one build are not shown on another. The daily challenge keeps using the factory builds (R-194) |
| Verification | unit tests | `model-id.test.ts`: suffix, medals null for rigid, same times give the same medal as before for the game model (table over the 21 courses with medals); `ghost.test.ts` additions: key unchanged for the game model, different for rigid, round trip, old stored track loads; `ModelLabel.test.tsx`: text present; banned-word scan |
| | integration tests | `npx vitest run src/lib/flight src/components/flight` (FlightRange 10 tests unchanged) |
| | Playwright | `E e2e/fly.spec.ts` |
| | acceptance | DA-20 as above |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/lib/flight src/components/flight src/lib/dronelab`; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/fly.spec.ts` |
| | later tasks need | `FlightModelId`, `ModelLabel` (11d, B19) |

---

### T-B18-10b Drone BOM with the SN-8 header

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-10b / Export, `src/export` (portable) / B18 |
| | priority, size, status | P1, M, not started |
| | dependencies | T-B18-09a, T-B18-03a |
| Intent | problem | `src/lib/search/bom.ts:238` (`droneBom`) builds a shopping list for the 13 crafts with live-price search. A user build needs a plain list from the document, offline. B20 builds the full export |
| | target user, story | A builder. "I get a CSV with each part, its quantity, its mass and where its numbers came from, and the first line says this is not certification" |
| | expected behaviour | `droneBom(build)` gives lines with quantity, id, name, MPN where known, mass, source label and price with date. `toCsv` writes it with SN-8 as the first line |
| | success metric | DA-14 export half: the first line of every export contains the SN-8 text; no banned word in any line |
| Implementation | existing files | `src/lib/search/bom.ts:19-36` (`BomLine`), `:238` (`droneBom` for contrast); `notices.ts` (03a); `identity.mpn` in the schema |
| | new files | `src/export/bom-drone.ts`, `src/export/bom-drone.test.ts`; `src/i18n/messages/*/droneopt.json` (new namespace, BOM column names and the SN-8 export line) |
| | edited files | `src/i18n/namespaces.ts` (add `droneopt`) |
| | modules and signatures | `export interface DroneBomLine { qty: number; ref: string; name: string; mpn: string \| null; mass_g: number; source: 'maker' \| 'assumption' \| 'measured'; price: { amount: number; currency: string; asOf: string; estimate: boolean } \| null }`; `export function droneBom(b: Build, describe: (ref: string) => { name: string; mpn?: string; priceTag?: DroneBomLine['price']; basis: DroneBomLine['source'] }): DroneBomLine[]`; `export function toCsv(lines: readonly DroneBomLine[], header: { sn8: string; made: string }): string` |
| | algorithm | Group identical refs; frame, FC, ESC, pack, motors, props. Mass from the readers. CSV: line 1 is `# ` plus the SN-8 text, line 2 `# made <ISO date from the caller>` (no `Date.now` inside: the caller passes it), then a header row and lines. Fields quoted per RFC 4180; any cell starting with `=`, `+`, `-`, `@` is prefixed with a single quote (spreadsheet injection) |
| | validation, errors, edges | A part with no `mpn` prints an empty cell, not a made-up number. Prices are shown with `asOf` and "estimate"; never "live". No network |
| | permissions | Section 4 |
| Verification | unit tests | `bom-drone.test.ts`: lines for the 5-inch build (4 motors, 4 props, 1 ESC, 1 pack, 1 frame, 1 FC); mass sums to `auw_g`; CSV first line holds SN-8 (text from `en/drone.json`); a name starting with `=` is neutralised; banned-word scan of the CSV; quoting of commas and quotes |
| | acceptance | Given the reference build, When exported, Then line 1 starts with `# ` and contains the SN-8 text and the sum of mass equals the build's AUW |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/export/bom-drone.test.ts src/i18n`; `npx tsc -p tsconfig.portable.json` |
| | later tasks need | `droneBom`, `toCsv` (09d2 export button, 13) |

---

### T-B18-11a `calcFromBuild` and `fromBuild`

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-11a / Drone to flight, `src/sim/flight` and `src/lib/flight` / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-09a |
| Intent | problem | The range flies from `CalcOutputs` (`types.ts:9-20`), which today only `fromCalc` fills from the legacy calculator (`from-calc.ts:5-17`). A user build needs the same ten numbers from the parts model (R-174) |
| | target user, story | A pilot. "I fly the drone I built" |
| | expected behaviour | `calcFromBuild(build)` returns the numbers the game model needs, on a nominal 3.7 V per cell pack, from the propulsion solve. `fromBuild` maps them onto `CalcOutputs` |
| | success metric | For the generic 5-inch build: `thrustPerMotor`, `hoverThrottle`, `hoverAmps`, `maxAmps` come from the solve; `hoverThrottle` equals `sqrt(auw / (motors * thrustPerMotor))` exactly; `CalcOutputs` and the portable type are mutually assignable (compile-time test) |
| Implementation | existing files | `src/lib/flight/from-calc.ts:5-17`; `src/lib/flight/types.ts:9-20` (`CalcOutputs`); `sim.ts:303-306` (`hoverCommand`); `battery.ts:52-63` (`currentFor` uses `hoverAmps`, `maxAmps`, `hoverThrottle`) |
| | new files | `src/sim/flight/from-build.ts`, `src/sim/flight/from-build.test.ts` |
| | edited files | `src/lib/flight/from-calc.ts` (adds `fromBuild`; `fromCalc` untouched) |
| | modules and signatures | `from-build.ts`: `export interface BuildFlightOutputs { auw: number; thrustPerMotor: number; motors: number; cells: number; mah: number; hoverThrottle: number; hoverAmps: number; maxAmps: number; chemistry: 'lipo' \| 'lihv' \| 'liion'; overKv: boolean }`; `export function calcFromBuild(b: Build, opts?: { air?: Air }): BuildFlightOutputs \| OutOfRange`. `from-calc.ts`: `export function fromBuild(o: BuildFlightOutputs): CalcOutputs` |
| | algorithm | Nominal pack: `soc` chosen so each cell is 3.7 V (`NOMINAL_CELL`), no sag (resistance 0 for this one call), because the game scales thrust with `voltageFactor` and sag itself. `thrustPerMotor` is the mean of `thrust_n / 9.81 * 1000` over slots; `hoverAmps`, `maxAmps` the pack currents from `dutyForThrust` and `maxThrust`; `overKv` is DB-C-05's rpm test; `motors` is the slot count; `mah` is `capacity_mah`. A single `thrustPerMotor` is a mean: unequal motors are flown as equal, listed in the UI as a limit |
| | validation, errors, edges | Output scan with `firstNonFinite`. A build that cannot hover returns the numbers anyway (the game shows "cannot lift") |
| Verification | unit tests | `from-build.test.ts`: reference build values; `hoverThrottle` identity; type compatibility (`const x: CalcOutputs = fromBuild(o)` and the reverse assignability for the shared fields); chemistry mapping; `OutOfRange` for NaN |
| | integration tests | `createSim` with the mapped outputs hovers: after 5 s of hover command the craft holds altitude within 0.5 m (uses the derived craft from 11b; this case lives in 11b's test) |
| | acceptance | Given the reference build, When mapped, Then the ten fields are finite and `hoverThrottle` is between 0.2 and 0.6 |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/from-build.test.ts src/lib/flight`; `npx tsc -p tsconfig.portable.json` |
| | later tasks need | `calcFromBuild`, `fromBuild` (11b, 11d) |

---

### T-B18-12a Optimiser over the parts library

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-12a / Drone optimiser, `src/sim/flight` / B18 |
| | priority, size, status | P1, L, not started |
| | dependencies | T-B18-09a, T-B18-05a (`readMotor`, `readProp`, `readBattery`) |
| Intent | problem | `src/lib/search/optimize.ts:116-124` enumerates 27 combinations of the three catalogue lists with live prices. The library has any number of parts (F-156, R-178) |
| | target user, story | A builder with a budget. "Given a budget and a goal, I get the best parts from the library, the trade-off in numbers, and every constraint it could not meet" |
| | expected behaviour | Search motors x props x packs (frame and ESC fixed by the person) for the highest margin over the constraints (minimum T/W, minimum flight time, no failing check) under the budget. Return the best, the current build, the swaps, the cheapest that meets the constraints, and the reason when none does |
| | success metric | Deterministic; never reports a build with a failing check as the best; a part without a price is never chosen under a budget and is listed as unpriced; the result carries `considered` and `pruned` counts |
| Implementation | existing files | `src/lib/search/optimize.ts:116-186` (`optimize`, ordering rule `better`: margin, then cost, then fewer swaps, then id); keep as is for the 13 crafts; `DRONE_ARCHITECTURE.md` 3.3 |
| | new files | `src/sim/flight/optimise.ts`, `src/sim/flight/optimise.test.ts` |
| | edited files | none (`src/lib/search/optimize.ts` stays for the legacy crafts) |
| | modules and signatures | `export type PriceTable = ReadonlyMap<string, { amount: number; asOf: string; estimate: boolean }>`; `export interface Constraints { minTW: number; minFlightMin: number; budget: number \| null }`; `export type PartRef = { ref: string; version: string }`; `export interface Library { motors: ReadonlyArray<PartRef>; props: ReadonlyArray<PartRef>; packs: ReadonlyArray<PartRef> }`; `export interface Candidate { motor: string; prop: string; pack: string; cost: number \| null; tw: number; flightMin: { low: number; typ: number }; margin: number; fails: Array<'budget' \| 'tw' \| 'flight' \| 'check'> ; unpriced: string[] }`; `export interface OptimiseResult { best: Candidate \| null; current: Candidate; swaps: Array<{ slot: 'motor' \| 'prop' \| 'pack'; from: string; to: string }>; cheapest: Candidate \| null; reason: 'budget' \| 'constraints' \| 'unpriced' \| null; considered: number; pruned: number; prunedWhy: ReadonlyArray<{ part: string; path: string }> }`; `export function* optimiseIter(base: Build, lib: Library, resolve: Resolve, prices: PriceTable, c: Constraints, opts?: { cap?: number }): Generator<{ done: number; total: number }, OptimiseResult \| OutOfRange>` (yields every 25 triples); `export function optimise(...same arguments): OptimiseResult \| OutOfRange` drains the generator. The function swaps all slots to the same motor, prop and pack (a symmetric build). `Candidate.motor`, `prop` and `pack` and `swaps` carry `ref@version` strings (`${ref}@${version}`) |
| | algorithm | For each triple: skip when the motor's `v_max` is below the pack's full voltage or the prop is over the frame limit (counted in `pruned`); build a `Build` copy with `slots` replaced; `evaluateBuild(..., {fast: true})`; `fails` from T/W, flight `low`, any `fail` check; cost is the sum of the three prices times counts plus fixed parts; `margin = min(tw / minTW, flightMin.low / minFlightMin)`. Swapped slots are produced by `resolve(ref)` then `readMotor`, `readProp`, `readBattery` (05a); `Build.fits` is rebuilt from the prop's `x_fit` (the record whose `motor` equals the swapped motor id); a part whose read is not `ok` is counted in `pruned` with the missing path in `reasons` (`OptimiseResult` gains `prunedWhy: ReadonlyArray<{ part: string; path: string }>`). Order: the `better` rule of the legacy optimiser. `cap` default 20,000 triples; over it the search refuses with `OutOfRange` `field: 'library'` rather than truncating silently. `reason: 'unpriced'` when a budget is set and the only candidates meeting the constraints include an unpriced part |
| | validation, errors, edges | Budget null means no cost limit. Unequal motors are not searched. The exact evaluation is rerun for the best candidate so the numbers shown equal what the builder would show |
| | performance | 26 parts: 6 x 6 x 6 = 216 triples at 10 ms each (`fast`) about 2 s; a 20,000 cap is about 200 s in the worst case, so the panel steps `optimiseIter` in slices (12b) and shows progress. Printed numbers recorded |
| Verification | unit tests | `optimise.test.ts`: deterministic across two runs; best has no failing check; budget respected; unpriced part listed and not chosen; an impossible constraint gives `reason: 'constraints'` with `cheapest` set; library over the cap refused; the swaps list; the exact re-evaluation equals the builder's numbers |
| | acceptance | Given the generic library, a 5-inch frame, budget 150 USD (estimate prices) and minTW 4, When run, Then `best` is returned with its numbers and the swaps from the current build |
| | release blockers | A failing check in `best` |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/sim/flight/optimise.test.ts`; `npx tsc -p tsconfig.portable.json` |
| | later tasks need | `optimise` (12b) |

---

### T-B18-09d1 Build hook, slots editor and layout writers

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-09d1 / Studio drone UI / B18 (first half of the old T-B18-09d) |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-04, T-B18-09a, T-B18-09b |
| Intent | problem | The builder shell needs a state hook, a slot table and the writes that turn a layout choice into mounts, bodies and frames. Those are testable without the shell |
| | target user, story | A builder (J-16). "I choose a layout and a motor for all slots, and every edit is one undo step" |
| | expected behaviour | `useDroneBuild` reads the session, extracts the `Build` and evaluates it. `SlotsEditor` is a table of slots with a `PartPicker` per role and a "same for all" toggle. `layout.ts` builds the ops for a layout choice |
| | success metric | A layout choice is one commit; "same for all" over N slots is one commit with one `domain.patch` op; the state is `empty`, `partial`, `complete` or `legacy` as the document says |
| Implementation | existing files | `drone-ops.ts` (04: `slotPatch`, `layoutMounts`, `mountOps`, `blankMultirotor`); `drone-semantic.ts` (04: `checkDroneDomain`, `DroneIssue`); `build.ts`, `evaluate.ts` (09a); `PartPicker.tsx`, `picker.ts` (09b); `craft.ts` (10a: `CraftGeometry`); B4 `src/studio/stores/doc.ts`, `session.ts`; `src/sim/flight/clash.ts` (08b: `propClash`) |
| | new files | `src/studio/drone/use-build.ts`, `src/components/studio/drone/SlotsEditor.tsx`, `src/studio/drone/layout.ts`; tests beside them |
| | edited files | `src/i18n/messages/*/dronebuild.json` (slot table, same-for-all, layout names) |
| | modules and signatures | `use-build.ts`: `export function useDroneBuild(session: ProjectSession): { build: Build \| null; out: BuildOutputs \| null; state: 'empty' \| 'partial' \| 'complete' \| 'legacy'; commit(ops: Op[], label: string): void; issues: DroneIssue[] }` (evaluates `fast` while the pointer is down or a field has focus, exact after 300 ms idle); `export function geometryOf(b: Build, clash: ReturnType<typeof propClash>, mass: MassProps \| null): CraftGeometry` (maps a `Build` to the plain geometry that 10a's `craftSvg` draws; exported here because 09d2 draws the figure). `layout.ts`: `export type Layout = 'x' \| 'plus' \| 'h' \| 'hex' \| 'octo'`; `export interface LayoutCtx { frameComponent: string; z_mm: number; slotComponent(slotId: string): string; bodies: ReadonlyArray<{ id: string; component: string; mass_g: number; shape: ShapeIn; position_mm: V3 }> }`; `export function layoutOps(layout: Layout, wheelbase_mm: number, ctx: LayoutCtx): Op[]` (`mountOps` from 04 plus `mech.set` of `bodies` and `frames`); `export function sameForAllPatch(cur: DroneData, pick: { motor?: string; prop?: string; esc?: string }): Op` (one `domain.patch` op whose `motors` array carries every changed slot, built with `slotPatch` on a copy that already holds the other slots). `SlotsEditor`: `export function SlotsEditor(props: { build: Build; lib: readonly ComponentDescriptor[]; readOnly: boolean; onChange(ops: Op[], label: string): void; t: DroneBuildT }): JSX.Element` |
| | data model | Writes only `domains.drone.data` (patch), `mechanical.mounts`, `mechanical.bodies`, `mechanical.frames` (`mech.set`). Layout presets come from `layoutMounts` in 04 |
| | algorithm | Layout choice: one mount per motor at the wheelbase radius, one body per part with its mass and a box or cylinder shape from `dimensions.body`; spin alternates cw/ccw around the ring, `prop_spin` equal to `spin`. "Same motor and prop for all" is the default toggle |
| | state transitions | `empty -> partial -> complete`; `legacy` is read from `kind: "legacy-craft"`; no state goes back to `legacy` except by undo |
| | validation, errors, edges | A pick that fails 04's role check is not committed; the message names the part. Slot count outside 3 to 12 blocked in the editor. Two buddies editing at once: last write wins on the `motors` array (Q6) |
| | permissions | `readOnly` (viewer role, read by 09d2 from the session) disables every picker and button |
| | performance | An edit to a repaint under 100 ms for 4 slots with `fast` |
| | accessibility | The slot table is a table with headers; focus returns to the trigger after a picker closes |
| Verification | unit tests | `use-build.test.ts`: state transitions with a stub session, `fast` then exact, `geometryOf` of the quad example gives 4 motors at the mounts. `layout.test.ts`: for `x`, `plus`, `h`, `hex`, `octo` the ops applied through `apply` validate; N distinct mounts; alternating spin; `sameForAllPatch` returns exactly one op and the result has N changed slots. `SlotsEditor.test.tsx`: "same for all" commits once; a role-wrong pick is refused with the part named; `readOnly` disables pickers; DA-03 in the UI: a part with a missing field shows the path |
| | integration tests | `npx vitest run src/components/studio src/studio` |
| | Playwright | covered by 13 |
| | acceptance | Given a blank multirotor, When "x" and 225 mm are chosen, Then 4 mounts exist at 79.5 mm on both axes (within 0.1 mm) in one commit |
| | release blockers | An edit that is not one undo step |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio src/studio src/i18n` |
| | later tasks need | `useDroneBuild`, `geometryOf`, `SlotsEditor`, `layoutOps` (09d2, 09g) |

---

### T-B18-09d2 Builder shell, legacy-to-parts flip, Studio mount

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-09d2 / Studio drone UI / B18 (second half of the old T-B18-09d) |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-09d1, T-B18-09c, T-B18-09e, T-B18-10a, T-B18-03c, T-B18-10b |
| Intent | problem | The pieces exist as functions and components. A person needs one place to start a drone, pick parts, see numbers and checks, and export |
| | target user, story | A builder (J-16). "I open a new drone, choose a frame and a layout, pick a motor, prop, ESC, pack and flight controller, and the numbers and checks update as I go" |
| | expected behaviour | `DroneBuilder` has a header (name, tier chip, SN-8), a frame and layout chooser, the `SlotsEditor`, the `NumbersPanel`, the `ChecksList`, the craft figure, and the actions Add my own part (09e), Export BOM (10b) and First-flight panel (03c). Compare, Optimise and Fly are mounted by T-B18-09g, not here. For a `legacy-craft` project the builder shows the flip banner |
| | success metric | A blank drone with five picks reaches a computed state in under 10 interactions; the keyboard path reaches every control; axe clean |
| Implementation | existing files | `src/components/dronelab/DesignPanel.tsx` (stays for legacy; not edited); B4 `src/studio/stores/doc.ts`, `session.ts`, `src/components/studio/StudioEntry.tsx`, `src/studio/router.ts`; B13 `src/components/studio/lab/CraftPanel.tsx` (T-B13-08; read to copy how a lab panel mounts); `use-build.ts`, `SlotsEditor.tsx`, `layout.ts` (09d1); `drone-ops.ts` (04: `flipToPartsPatch`); `NumbersPanel.tsx`, `ChecksList.tsx` (09c); `craft.ts` (10a); `PartEntryForm.tsx` (09e); `bom-drone.ts` (10b); `FirstFlightPanel.tsx` (03c) |
| | new files | `src/components/studio/drone/DroneBuilder.tsx`, `src/components/studio/drone/LegacyBanner.tsx`; tests |
| | edited files | `src/studio/router.ts` (route `drone/<prj_id>`; mount through `next/dynamic` with `ssr: false` per `01-app/02-guides/lazy-loading.md`), `src/i18n/messages/*/dronebuild.json` (header, banner, action strings) |
| | modules and signatures | `export function DroneBuilder(props: { session: ProjectSession; lang: Locale }): JSX.Element`; `export function LegacyBanner(props: { onConfirm(): void; t: DroneBuildT }): JSX.Element` |
| | data model | Writes through `useDroneBuild().commit` only; adds `components` (`component.add`) when a part is first used |
| | algorithm | New drone: `blankMultirotor()` plus a frame component. Legacy flip: for `kind: "legacy-craft"` the banner reads "This craft uses the original calculator. Changing a part switches the whole craft to your parts, with new numbers"; the confirm button commits `flipToPartsPatch` and empty slots (Q11). The original craft stays as the factory build on the Fly tab. The first BOM export in a browser opens the first-flight panel (03c) first |
| | state transitions | `legacy -> (confirm) -> partial`; other states come from `useDroneBuild` |
| | validation, errors, edges | A project with no `domains.drone` shows "not a drone project". The router refuses an unknown `prj_id` with the router's own not-found view |
| | permissions | A viewer role sees numbers but the pickers are disabled (role read from `session`, passed as `readOnly` to `SlotsEditor`) |
| | performance | The craft figure re-renders only on geometry change |
| | accessibility | Every control reachable by keyboard; numbers are text with units |
| Verification | unit tests | `DroneBuilder.test.tsx` with a stub session: new drone, layout chosen, picks made, outputs appear; flip banner and confirm; viewer role disables pickers; SN-8 present. `LegacyBanner.test.tsx`: text, confirm, axe |
| | integration tests | `npx vitest run src/components/studio src/studio` |
| | Playwright | covered by 13 |
| | acceptance | Given a blank drone, When I pick the generic 5-inch frame, 2306 motors, 5.1 in props, 4S pack, ESC and FC, Then thrust-to-weight, hover throttle, hover current and a flight-time range show with units and T1 |
| | release blockers | Axe violation; no mount point found in B13 (stop and report, RK-8) |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio src/studio src/i18n` |
| | docs | none (14) |
| | later tasks need | `DroneBuilder` (09g, 13) |

---

### T-B18-09g Builder tabs: Compare, Optimise, Fly

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-09g / Studio drone UI / B18 (new wiring task) |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-09d2, T-B18-09f, T-B18-11d, T-B18-12b, T-B18-10a, T-B18-10b |
| Intent | problem | `CompareView` (09f), `OptimiserPanel` (12b) and `FlyBuild` (11d) are components that nothing mounts. Without this task scenarios 6, 8 and 9 of T-B18-13 cannot pass |
| | target user, story | A builder. "I pin a build, change a motor and compare; I press Find and apply a result; I press Fly and my drone takes off" |
| | expected behaviour | `DroneBuilder` gets tabs Numbers, Compare, Optimise and Fly. "Pin for compare" keeps the current `{ label, out }` in memory (not in the document, 09f). Optimise gets the library, the `resolve` function and a `PriceTable` from the parts' `x_price`, and applies swaps through `commit`. Fly passes the build and outputs to `FlyBuild` |
| | success metric | Each tab renders its component with live data; pinning survives a tab switch and is cleared by a reload; apply from the optimiser is one commit |
| Implementation | existing files | `DroneBuilder.tsx` (09d2); `use-build.ts` (09d1); `CompareView.tsx`, `compare.ts` (09f); `OptimiserPanel.tsx` (12b); `FlyBuild.tsx` (11d); `droneopt.json` (10b) for the optimiser strings |
| | new files | none; tests `src/components/studio/drone/DroneBuilderTabs.test.tsx` |
| | edited files | `src/components/studio/drone/DroneBuilder.tsx` (tabs, pinned state), `src/studio/drone/use-build.ts` (adds `usePinnedBuild(): { pinned: { label: string; out: BuildOutputs } \| null; pin(label: string, out: BuildOutputs): void; clear(): void }`), `src/i18n/messages/*/dronebuild.json` (tab labels) |
| | modules and signatures | `usePinnedBuild` as above; `DroneBuilder` keeps its props. `geometryOf` is already exported by `use-build.ts` (09d1) |
| | algorithm | `tablist` with arrow keys. The Optimise tab is left out when `OptimiserPanel` is not built (12b is P2) and the Compare tab when 09f is cut (P1); the tab list is built from what exists |
| | state transitions | `numbers -> compare -> optimise -> fly`, any order; the pinned build is held by the hook for the life of the page |
| | validation, errors, edges | Fly with a blocked build shows `FlyBuild`'s missing-field message. Compare with nothing pinned shows "pin a build first" (09f) |
| | permissions | Viewer role: Pin and Fly allowed, Apply in the optimiser disabled |
| Verification | unit tests | `DroneBuilderTabs.test.tsx`: tabs render the three components; pin then change a part then Compare shows both columns; optimiser apply calls `commit` once; Fly tab mounts `FlyBuild`; keyboard tab switching; axe |
| | integration tests | `npx vitest run src/components/studio src/studio` |
| | Playwright | covered by 13 (scenarios 6, 8, 9) |
| | acceptance | Given a complete build, When I pin, change the motor and open Compare, Then both builds and each difference show |
| | release blockers | A tab that does not mount its component |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio src/studio src/i18n` |
| | later tasks need | the whole builder for 13 |

---

### T-B18-09f Compare two builds

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-09f / Studio drone UI / B18 |
| | priority, size, status | P1, M, not started |
| | dependencies | T-B18-09a, 09c, 09e (creates `droneparts.json`) |
| Intent | problem | R-173: two designs compare side by side with each figure's difference. F-217's trace overlay needs B19, so this compares computed numbers only (Q8) |
| | target user, story | A builder trying two motors. "I pin this build, change the motor, and see each number side by side with the difference" |
| | expected behaviour | Pin the current build (kept in memory); `CompareView` lists each output for pinned and current, the difference and the percentage, the checks that changed, and the assumptions of both |
| | success metric | Antisymmetry: comparing A to B gives exactly the negated differences of B to A; the assumption lists are shown identical or the differences are listed |
| Implementation | existing files | `BuildOutputs` (09a); `NumbersPanel` (09c) for formatting |
| | new files | `src/components/studio/drone/CompareView.tsx`, `src/studio/drone/compare.ts`; tests |
| | edited files | `src/i18n/messages/*/droneparts.json` (compare strings; the namespace was created by 09e in group 5) |
| | modules and signatures | `compare.ts`: `export interface CompareRow { id: 'auw' \| 'tw' \| 'hoverThrottle' \| 'hoverAmps' \| 'maxAmps' \| 'enduranceTyp'; a: number \| null; b: number \| null; diff: number \| null; pct: number \| null; unit: string }`; `export function compareOutputs(a: BuildOutputs, b: BuildOutputs): { rows: CompareRow[]; checks: Array<{ id: CheckId; a: CheckResult; b: CheckResult }>; assumptionsEqual: boolean }`. `CompareView(props: { pinned: { label: string; out: BuildOutputs } \| null; current: BuildOutputs; t: DroneT })` |
| | algorithm | `diff = b - a` (null if either is blocked); `pct = diff / a * 100` (null if `a` is 0 or null). Pinned builds are not written to the document (they would conflict in rooms); a reload clears them, and the view says so |
| | validation, errors, edges | No pinned build: the view says "pin a build first". Blocked outputs show "blocked" not zero |
| Verification | unit tests | `compare.test.ts`: antisymmetry on 50 seeded pairs (exact negation of `diff`; `pct` recomputed against the other base); null handling; check changes. `CompareView.test.tsx`: renders rows with units; SN-8 present; axe |
| | acceptance | Given two builds, When compared, Then every row shows both values, the difference and the unit |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/drone src/studio/drone src/i18n` |
| | later tasks need | none |

---

### T-B18-11b Flight craft derived from a build

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-11b / Flight range / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-11a |
| Intent | problem | `flightCraft(content)` needs a `DroneContent` (`registry.ts:163`). A user build has none |
| | target user, story | A pilot. "My build flies with a hit radius, drag and look that match its size" |
| | expected behaviour | `craftForBuild(build)` returns a `FlightCraft` of class `multirotor` with a stable id, geometry from the mounts, defaults from the registry, and the standard multirotor modes |
| | success metric | The derived craft hovers: with `fromBuild` outputs and a stock course, 5 s of hover command holds altitude within 0.5 m; the autopilot lap completes for a build with T/W over 4 |
| Implementation | existing files | `src/lib/flight/registry.ts:32` (`DEFAULTS`, private), `:102` (`flightMode`, exported), `:137-160` (`craftLook`), `:163-211` (`flightCraft`), `:174` (hit radius rule); `types.ts:73-100` (`FlightCraft`); `src/content/drones/quad5.ts:502-527` (stock modes and fpv values) |
| | new files | `src/lib/flight/craft-from-build.ts`, `src/lib/flight/craft-from-build.test.ts` |
| | edited files | `src/lib/flight/registry.ts` (add the keyword `export` to `DEFAULTS`; nothing else) |
| | modules and signatures | `export function buildKey(b: Build): string` (`<projectId>~<8 hex>` where the hex is FNV-1a 32 over the sorted slot refs, pack ref, frame mass; changes when parts change, so ghosts of an old build are not shown on a new one); `export const STOCK_MODES: readonly ContentMode[]` (alt-hold, angle, acro, race, range, as in quad5); `export function craftForBuild(b: Build): FlightCraft` |
| | algorithm | `armLen` = mean over mounts of the radial distance `hypot(x, y)` in m (the registry rule, `registry.ts:141`, which averages `Math.hypot(x, y)` of `frame.motors`); `propR` = prop `d_m / 2`; `hitRadius = round(max(0.03, armLen + propR * 0.5), 3)` with no rounding of `armLen` or `propR` first (the registry rounds both to 4 digits; the difference is under 0.0001 and the test pins the unrounded rule). Worked value for the reference build: wheelbase 225 mm gives radial distance 112.5 mm, so `armLen = 0.1125`; `propR = 0.1295 / 2 = 0.06475`; `hitRadius = round(max(0.03, 0.1125 + 0.032375), 3) = round(0.144875, 3) = 0.145` (arithmetic checked here, ESTIMATED until the test runs); `look.body` from the frame and stack bodies' extents; palette `cobalt`; `frame` from the layout; other numbers from `DEFAULTS` and the quad5 fpv values (30 deg tilt, 105 deg fov), labelled "template values". `modes = [...STOCK_MODES.map((m) => flightMode(m, 'multirotor')), DEMO_MODE]` |
| | validation, errors, edges | No `hitRadius` below 0.03. A hex or octo build keeps class `multirotor`. Unequal motors fly as equal (limit shown in the UI) |
| Verification | unit tests | `craft-from-build.test.ts`: key stable for the same parts and different for a changed motor; hit radius for the 5-inch reference build equals `0.145` to 3 decimals (`toBeCloseTo(0.145, 3)`, no comparison to `quad5`), from the rule below with `frame-5in-x` (`wheelbase_mm` 225, 05d) laid out by `layoutMounts('x', 225, z)` and `prop-5.1in-3b` (`diameter_mm` 129.5, 05b); hover case with `createSim`, `advance`; autopilot lap with `paceGhost` finishes on the first gate course; `STOCK_MODES` equals the kinds in quad5's content |
| | integration tests | `npx vitest run src/lib/flight` (baseline unchanged) |
| | acceptance | Given the reference build, When flown by the autopilot on the first course, Then a lap time is returned |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/lib/flight src/sim/flight`; `npx tsc -p tsconfig.portable.json` |
| | later tasks need | `craftForBuild`, `buildKey` (11d) |

---

### T-B18-12b Optimiser panel

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-12b / Studio drone UI / B18 |
| | priority, size, status | P2, M, not started |
| | dependencies | T-B18-12a, T-B18-09c, T-B18-10b (creates `droneopt.json`; 10b is P1, so cutting 10b cuts 12b) |
| Intent | problem | R-178: when run, the optimiser proposes parts, explains the trade-off and never hides a constraint. 12a is a function |
| | target user, story | A builder with a budget. "I set a budget and a minimum thrust-to-weight, press Find, and see the best build, what it swaps, and what it costs in minutes of flight" |
| | expected behaviour | A panel with budget, minimum T/W and minimum flight time; progress while it runs; the result as a before-and-after table (reusing `compareOutputs`), the swaps, a button to apply the swaps as one commit, and the reason when nothing meets the constraints |
| | success metric | The UI never freezes for more than 100 ms (the search runs in slices); the result states every unmet constraint |
| Implementation | existing files | `optimise.ts` (12a, iterator form); `compare.ts` (09f); `NumbersPanel` (09c); `PriceTable` from the parts' `x_price` |
| | new files | `src/components/studio/drone/OptimiserPanel.tsx`; test |
| | edited files | `src/i18n/messages/*/droneopt.json` (created by 10b) |
| | modules and signatures | `export function OptimiserPanel(props: { build: Build; lib: Library; resolve: Resolve; prices: PriceTable; onApply(ops: Op[], label: string): void; t: DroneOptT }): JSX.Element` |
| | algorithm | Steps `optimiseIter` in 8 ms slices with `setTimeout(0)` between; shows `considered` of total; Cancel stops the iterator. Prices are labelled "estimate, dated <as_of>, not live" (R-183) |
| | validation, errors, edges | Library over the cap: shows the refusal with the count. Unpriced parts listed. SN-8 shown |
| Verification | unit tests | `OptimiserPanel.test.tsx` with a small stub library: progress, result table, apply produces one op batch, cancel, unmet constraint text, axe |
| | acceptance | Given an impossible budget, When run, Then the panel says which constraint failed and shows the cheapest build that meets the others |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/drone src/i18n` |
| | later tasks need | none |

---

### T-B18-11d Fly tab: your build on the flight range

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-11d / Studio drone UI and Flight range / B18 |
| | priority, size, status | P0, M, not started |
| | dependencies | T-B18-11b, 11c (it needs no builder code: it takes `build` and `out` as props) |
| Intent | problem | R-174: the range, crash replay, autopilot lap, ghosts, medals, touch sticks and gamepad must work with a user-built drone |
| | target user, story | A builder. "I press Fly and my drone takes off on a course" |
| | expected behaviour | `FlyBuild` derives the craft and outputs from the current build and mounts `FlightRange` with `model="flight-game@1"`, the `ModelLabel`, SN-4 and SN-8, and a course list |
| | success metric | The existing `FlightRange` behaviours (crash "here's why" card, demo lap, ghosts, medals, keyboard, touch, gamepad) work unchanged; the course list contains only courses a build can fly |
| Implementation | existing files | `src/components/flight/FlightRange.tsx:56-80` (props), `:333-345` (ghosts); `registry.ts:259` (`flightOf`), `:214` (`flightCourse`); `src/components/dronelab/FlyWorkspace.tsx` (how the legacy page builds courses; read, not edited); `from-build.ts` (11a), `craft-from-build.ts` (11b) |
| | new files | `src/components/studio/drone/FlyBuild.tsx`; test |
| | edited files | `src/i18n/messages/*/flight.json` (a `fly.*` key group: blocked-build message, cannot-lift note, course list heading; `flight.json` was last edited by 11c, so no clash with `dronebuild.json`, which 09d2 edits in the same group) |
| | modules and signatures | `export function FlyBuild(props: { build: Build; out: BuildOutputs; lang: Locale; flight: FlightStrings }): JSX.Element` |
| | algorithm | Courses: for every content in `DRONES`, `flightOf(content)`; keep a course when its craft class is `multirotor` and none of its goals has `action` `drop`, `spray-on` or `spray-off` (those need a payload craft); the agent records the resulting count. The first course is the default. The craft comes from `craftForBuild`, the outputs from `fromBuild(calcFromBuild(build))`. A build that cannot hover shows the check list and a "cannot lift" note and still lets the person try. Daily challenge is not offered (factory builds only, R-194) |
| | validation, errors, edges | A build with blocked outputs cannot fly: the tab says which field is missing. Stale ghost for an old build key never shows |
| Verification | unit tests | `FlyBuild.test.tsx`: renders `FlightRange`, label present, SN-4 and SN-8 present, blocked build message, course filter excludes drop and spray courses (counts printed). Replay (R-174, DET-4): a scripted flight on the user build recorded with `createSession`, then `replay()` from its `origin`, gives an equal final `frameOf` hash |
| | integration tests | `npx vitest run src/components/studio/drone src/components/flight` |
| | Playwright | covered by 13 |
| | acceptance | Given a complete build, When Fly opens, Then the range shows the craft and the label "tuned to feel" |
| Delivery | verify commands | `npm run typecheck && npm run lint`; `npx vitest run src/components/studio/drone src/components/flight src/lib/flight` |
| | later tasks need | `FlyBuild` (09g mounts it as the Fly tab; 13) |

---

### T-B18-13 End to end: build, read the numbers, fly it

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-13 / Playwright / B18 |
| | priority, size, status | P0, L, not started |
| | dependencies | all earlier tasks |
| Intent | problem | Unit tests do not prove the pieces work in a browser together |
| | target user, story | Amar at the phase stop. "One spec shows the whole phase works on a local build with no keys" |
| | expected behaviour | `e2e/drone-build.spec.ts` runs the scenarios below on a keyless local build |
| | success metric | All scenarios pass; no request leaves the origin; axe clean on the builder, compare view and fly tab |
| Implementation | existing files | `playwright.config.ts:5` (random port), `e2e/dronelab.spec.ts`, `e2e/fly.spec.ts` (patterns); B11 `e2e/support/parts.ts`; `src/studio/router.ts` route `drone/<prj_id>` |
| | new files | `e2e/drone-build.spec.ts`, `e2e/support/drone.ts` (helpers: seed a part into the `parts` store, read a download, collect external requests) |
| | edited files | none |
| | scenarios | 1) Build the 5-inch quad from the library: tiles show thrust-to-weight, hover throttle, hover current, flight-time range, each with a unit and "T1"; 14 checks listed; SN-8 visible. 2) 6S pack on a motor limited to 4S: DB-C-05 fails and names the motor. 3) A seeded motor with no no-load current: the current tile says what is missing, the mass tile still shows (DA-03 in the browser). 4) Entry form: paste a generated table, see the fit and the band sentence, save, find the part in the picker. 5) Legacy craft: change a part, see the flip banner, confirm. 6) Pin, change a motor, compare view shows both and the differences. 7) Export BOM: the download's first line contains the SN-8 text; the first-flight panel opened first and the acknowledgement survives a reload. 8) Fly: the range loads, the model label is visible, arm and take off by keyboard, crash into the ground gives the crash card. 9) Optimiser on the generic library returns a result or a stated reason. 10) Keyboard only for scenario 1. 11) A scan of the page text on builder, fly and compare views finds none of the five banned words and finds SN-8 on each (DA-14) |
| | algorithm | Playwright `page.on('request')` collects URLs whose origin differs from the page; the test asserts the list is empty. Waits are on locators and events, not timeouts (R-002) |
| | validation, errors, edges | `CI=true` with a missing service fails and names it |
| | performance | Whole spec under 3 minutes (ESTIMATED) |
| Verification | Playwright | the spec itself; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/drone-build.spec.ts` (the `E` form of section 4) |
| | acceptance | Given a local keyless build, When the spec runs, Then all 11 scenarios pass |
| | release blockers | Any failing scenario |
| Delivery | verify commands | `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/drone-build.spec.ts e2e/fly.spec.ts e2e/dronelab.spec.ts e2e/fly-fun.spec.ts` |
| | docs | none |
| | later tasks need | none |

---

### T-B18-14 `docs/DRONES.md` and the verification record

| Block | Field | Content |
|---|---|---|
| Identity | id / subsystem / phase | T-B18-14 / Docs and exit gate / B18 |
| | priority, size, status | P0, S, not started |
| | dependencies | all earlier tasks |
| Intent | problem | The roadmap names `docs/DRONES.md` with the safety notices. The exit asks for SA-13 and the DA numbers to be recorded |
| | target user, story | A new contributor and Amar. "I can read what the drone builder models, what it does not, how to add a part, and the numbers the gate measured" |
| | expected behaviour | One page: what is modelled and not (the table in `DRONE_ARCHITECTURE.md` 18), the formulas in words, what the error band means and does not mean, the eight notices, the content rule, how to add a part (entry form and `docs/ADD_A_PART.md` from B11), and a verification table filled by running the gate |
| | success metric | Every row of the verification table has a measured number and the command that produced it |
| Implementation | new files | `docs/DRONES.md` |
| | edited files | `CONTRIBUTING.md` (one pointer line) |
| | content | Verification table rows: SA-13 (86 + 10 tests pass, baseline hashes equal, tunnel missed count with the point test, 0 with the swept test); DA-01 (cases, seed); DA-02 (342 golden rows, 13 content tests, 96 flight tests: all unchanged); DA-03; DA-04 (residual max); DA-05 (coverage, held-out error); DA-11; DA-14 (strings and exports); DA-15 (violations 0; prompts count; note that the live run is manual); DA-16 (counts); DA-17 (max relative error); DA-20; DA-24 (layouts, worst mm). Plus the S1 and S2 verdicts and any Q the orchestrator or Amar resolved. States plainly: safety text and translations are agent drafts until Amar reviews; the model is a teaching model, not checked against hardware |
| Verification | acceptance | Given `KL NEXT_DIST_DIR=.next-build npm run check`, When run on `build/v1`, Then it passes and the table matches the output |
| | release blockers | A DA or SA number missing |
| Delivery | verify commands | `KL NEXT_DIST_DIR=.next-build npm run check` (content check, typecheck, lint, vitest, playwright; `KL` is the keyless prefix of roadmap 2.3, so no `.env.local` value is read); `npx tsc -p tsconfig.portable.json` |
| | later tasks need | the exit record Amar reads |

## 7. Coverage of features, requirements and the exit gate

| Item | Covered by | Note |
|---|---|---|
| F-068 Flight range with your drone | 02c to 02f (collision, split), 11a to 11d | Existing behaviour preserved; baseline guard |
| F-069 Crash replay | 11b, 11d (replay of a user-build flight equals the original), 02c | `crash.ts` replays from `FlightOrigin`, which is plain data |
| F-070, F-071 Ghosts, medals (R-193, R-194) | 11c | Keyed by model; daily challenge stays on factory builds |
| F-072 Touch and gamepad | 11d (unchanged `FlightRange`) | |
| F-073 Own parts and comparison (R-173) | 05a, 06b, 09e, 09f, 09g | |
| F-216 Drone builder (R-172) | 04, 05a to 05d, 06a, 06b, 07a, 07b, 08a to 08c, 09a to 09c, 09d1, 09d2, 09g, 10a | |
| F-217 Traces and comparison (R-175) | 09f, mounted by 09g | Plots, overlays and the first-difference marker are B19. R-175 is not closed here (Q8) |
| F-156 Optimiser (R-178) | 12a, 12b, 09g | |
| F-010, F-066 Safety (R-179) | 03a, 03b, 03c | "Before you fly" panel yes. Arming rules and bench tests for parts builds are B19; the legacy ones keep working for the 13 crafts |
| R-176 Environment and failure models, R-177 Deeper flight model, R-180 Replay on the rigid model | not in this phase | B19 and later |
| SA-13 | 02a, 02b, 02c, 02d, 02e, 02f | 96 tests (86 + 10) pass after the split; tunnel with the point test, none with the swept test |
| DA-01 | 01 (calc), 06a (solver) | |
| DA-02 | every task's Behaviour guard; 14 records it | 342 golden rows, 13 content test files, flight tests unchanged |
| DA-03 | 05a, 09a, 09d1, 13 | |
| DA-04 | 06a | |
| DA-05 | 06b (S2 checks the band factor) | |
| DA-11 | 02a (reproduce), 02c (fix) | |
| DA-14 | 03a (strings), 03c, 09c, 10b, 13 (pages and exports) | |
| DA-15 | 03b | Structure only in CI (Q13) |
| DA-16 | 08b | |
| DA-17 | 08a | |
| DA-20 | 11c | |
| DA-24 | 10a | |
| DA-06 to DA-10, DA-12, DA-13, DA-18, DA-19, DA-21 to DA-23, DA-25, DA-26 | not in this phase | B19 and later; DA-25 is D8 |

## 8. Phase exit procedure

1. Every task is committed in group order, each with its verify commands green.
2. `KL NEXT_DIST_DIR=.next-build npm run check` passes on `build/v1` (content check, typecheck, lint, vitest, Playwright). The orchestrator also runs `npx tsc -p tsconfig.portable.json` and `npx vitest run src/lib/flight src/lib/drone src/lib/dronelab src/components/flight src/content/drones`.
3. T-B18-14 has filled the verification table in `docs/DRONES.md` with measured numbers: SA-13; DA-01 to DA-05, DA-11, DA-14 to DA-17, DA-20, DA-24.
4. Amar builds a drone from the library, reads the numbers, enters one part from a datasheet, and flies the result (the "For Amar" list below).
5. Stop for Amar's OK. After it, the orchestrator makes the local tag `phase-B18`. Nothing is pushed.

## 9. For Amar

Work only a person can do. None of these is an agent task.

| # | What | Why it is yours |
|---|---|---|
| 1 | Review the English text of notices SN-1 to SN-8 and the five translations (agent drafts) | Safety wording is reviewed first (F-172); an agent cannot judge whether a sentence over- or under-states a hazard |
| 2 | Decide the five crafts flagged in `DRONE_ARCHITECTURE.md` 12.3 (`swarm`, `delivery`, `agrihex`, `longrange`, `vtol`) against R-024 and whether to ask a lawyer (DK-9) | A legal and content decision; the CI rule only checks the machine-checkable part |
| 3 | Check the model against a real quad: weigh it, measure hover current with a power meter or multimeter, and compare with the builder's numbers; optionally a thrust stand | Only hardware can say how far the model is off (DK-1). Until then the label stays "teaching model, not checked" |
| 4 | Choose the licence (D-017) and clear the third-party origin of the legacy calculator constants and the 342 golden rows (DK-3) | Licence and provenance are your call; B18 does not touch them |
| 5 | Run the 20-prompt refusal set against your own AI key once the partner is built | CI only proves the structure (Q13); a live model needs your key |
| 6 | Accept or change the defaults in section 2: Q1 (schema key names win), Q4 (split stays in `src/lib/flight`), Q6 (array patches, last write wins), Q15 (band factor 1.645) | They depart from, or fill gaps in, the design documents |
| 7 | Decide whether to supply real motor and propeller datasheets, or wait for the S1 verdict, before any real-parts task is added | Licences and permissions are yours to grant or request |
| 8 | Accept the new task count (42 against 13 roadmap rows) and the effort row | The roadmap's 10 / 12 / 16 weeks was written for 13 rows |

## 10. Not in this phase

| Item | Where it goes |
|---|---|
| Rigid-body flight, controller, mixer, sensors, estimator, FC parameter binding, CLI integration | B19 (D3) |
| Traces, plots, comparison of flights, first-difference marker, bench-flight set | B19 (D4) |
| Environment and failure models, sensor failure schedule | B19 or later (F-218, D5) |
| PX4 oracle (S0) and the label of the rigid model | B19 (D6) |
| Parameter dump export, wiring sheet, loss list, full BOM with prices | B20 (D7 and export) |
| SITL bridge | D8, only on a stated need |
| Axial inflow and forward-flight thrust (`ct_vs_j`, `cp_vs_j` are read and ignored) | B19 |
| Unequal motors in the game model (flown as equal) | not planned |
| MCP `drone_calc` on parts | the MCP module moves to the server in B14; extension not planned |
| Arming rules and bench tests for parts builds | B19 (the legacy ones keep working for the 13 crafts) |
| Real, datasheet-sourced parts | after the S1 verdict and Amar's OK |
| Editing `DesignPanel.tsx` or the old drone pages | Amar retires them (B13 rollout) |

## 11. Risks

| Id | Risk | Label | Mitigation |
|---|---|---|---|
| RK-1 | The model's real accuracy is unknown (DK-1). Generic parts carry assumed numbers | UNKNOWN | Every part says "not checked against a real part"; the band is shown only when there is a datasheet fit; S2; For Amar 3 |
| RK-2 | The swept test changes a replay (a lap used to pass through a thin solid) | ESTIMATED low | 02a fixture before any change; 02c stops and reports with course ids rather than editing the fixture |
| RK-3 | The split of `sim.ts` hides a state-order dependency | ESTIMATED low | Three small moves, each guarded by the same fixture and the 96 tests; the cut line is "no function calls upward" |
| RK-4 | Earlier phases (B2, B3, B4, B11, B13, B14, B15) are not built; names in this file may differ | HYPOTHESIS | Precondition check in every task; adapt to the earlier name; stop on a missing module |
| RK-5 | The error band factor (1.645) is an estimate | ESTIMATED | One constant; DA-05 tests coverage; S2 measures against published tables |
| RK-6 | Two buddies editing motor slots overwrite each other (array patch) | HYPOTHESIS | Q6; baton in rooms; a schema change is Amar's call |
| RK-7 | A generic part is mistaken for a real one | ESTIMATED | `generic: true`, "generic" manufacturer, `known_gaps`, tier T1 chip, the figure labelled; SN-8 on every output |
| RK-8 | The Studio mount point for lab panels is unknown until B13 is read | HYPOTHESIS | 09d2 reads `CraftPanel.tsx` first and copies the mount; stops if no mount exists |
| RK-9 | Machine translations of safety text over- or under-state a hazard | ESTIMATED | Marked as drafts in `docs/DRONES.md`; For Amar 1; banned-word scan per language |
| RK-10 | `evaluateBuild` too slow for live edits on a phone | ESTIMATED | `fast` mode while editing, exact on commit; numbers measured in 06a, 07b, 09a |
| RK-11 | The DRONE document and the schema disagree on block names (Q1) and another document may copy the wrong ones | DOCUMENTED | The orchestrator corrects `DRONE_ARCHITECTURE.md` 6.1 and 15 when it accepts this file |

## 12. Research spikes

| Id | Question | Exit | Task |
|---|---|---|---|
| S-B18-1 | Can 10 motors and 10 propellers be shipped with redistributable data? | Verdict PASS, PARTIAL, FAIL or UNKNOWN with a quoted licence per source | T-B18-S1 |
| S-B18-2 | Does the closed-form model with a fit predict held-out published rows within 10 percent median, 20 percent p90, and does the band cover 90 percent? | Verdict with numbers per combination, or "not run" if S1 gave fewer than 8 combinations | T-B18-S2 |
| RS-14 | PX4 SIH oracle for the rigid model | Never ran; B19 | not this phase |

## 13. Differences from the roadmap

| Roadmap | This file | Reason |
|---|---|---|
| 13 tasks (T-B18-01 to 13) | 42 tasks; ids 01 to 13 kept with letters for splits; two spikes; 09g is a wiring task that has no roadmap row | The 5-file rule; the sim split, three data sets, six UI pieces and mass properties need their own rows |
| T-B18-04 builders in `src/project/apply/domain-drone.ts` | Builders in `src/project/domains/drone-ops.ts` | The FA-01 architecture rule bars imports of `src/project/apply/` from UI code |
| T-B18-04 "`mechanics` block" | The block already exists in `component.schema.json` (minor 1.1). 04 builds op helpers and checks; 05a builds the readers | VERIFIED in section 1 |
| T-B18-02 edits `sim.ts`, `world.ts`; new `collide.ts` | Adds a baseline task and three split tasks; `collide.ts` is a portable primitive; `world.ts` delegates to it | SA-13 needs the split and a guard |
| T-B18-12 cites DA-20 | DA-20 belongs to 11c | Q9 |
| Frontend list: `DroneBuilder`, `PartPicker`, `ChecksList`, `SafetyNotice` | Same four, plus `SlotsEditor`, `NumbersPanel`, `PartEntryForm`, `CompareView`, `OptimiserPanel`, `FlyBuild`, `FirstFlightPanel`, `ModelLabel` | R-173 needs the entry form and comparison; R-174 needs the Fly tab |
| No mass or inertia task | 08a | DA-17 is in the exit list; DB-C-08 needs a centre of mass |
| Effort 10 / 12 / 16 weeks | unchanged here; ESTIMATED agent time 9 L tasks x 6 h + 32 M x 3.5 h + 1 S x 1.5 h, about 168 hours, in 10 serial groups | The roadmap row is Amar's to change |
| T-B19-11 edits `src/sim/flight/*.ts` for `dmath` | B18 keeps the game files in `src/lib/flight` (Q4); new portable files are in `src/sim/flight` | Orchestrator to adjust B19's file list |
| `DRONE_ARCHITECTURE.md` 6.1 `bldc`, `rotor`; 6.3 band = larger residual | Schema names `motor`, `prop`; band = 1.645 x larger residual | Q1, Q15 |

## Review fixes (2026-10-27)

Fifteen review issues were checked against the repo and the B2, B11 and B13 task files. Fourteen are applied as written or with a stated change; the changes and the three places where the review text was not followed to the letter are listed. Labels: VERIFIED means read or run in this step.

| # | Issue | Result | Evidence |
|---|---|---|---|
| 1 | Op builders in `src/project/apply/` break FA-01 | Applied. Builders are in `src/project/domains/drone-ops.ts`, test `drone-ops.test.ts`. The `apply/README.md` docs line is dropped. The departure from roadmap row T-B18-04 is stated in 04 and in section 13. The rule is in `B2-core-document-netlist.md` line 1072 and is added by T-B2-10 (the review said T-B2-19; T-B2-19 is converter B in that file) | VERIFIED by reading B2 lines 109, 145, 1066, 1072 |
| 2 | `ProjectView` undefined | Applied. Defined and exported in `src/project/domains/drone-semantic.ts` (04). 09a imports it and no longer defines it. B9 line 829 mentions a `ProjectView` that T-B2 and T-B3-15 "expose"; no B2 task defines one (grep of `tasks/B2-*.md` found none), so 04 owns this structural subset | VERIFIED by grep |
| 3 | No task mounts Compare, Optimise, Fly | Applied. New T-B18-09g (group 9) edits `DroneBuilder.tsx`, `use-build.ts` (adds `usePinnedBuild`) and `dronebuild.json`. 09d no longer lists Pin, Fly or the optimiser. 13 depends on 09g. Changed from the review: `geometryOf` is exported by `use-build.ts` in 09d1, not 09g, because the builder shell (09d2, group 8) draws the craft figure and would not compile without it before 09g | design check of the group order |
| 4 | `toPackModel` before `PackModel` | Applied. `toPackModel` is in `endurance.ts` (07b). 07a no longer lists it. 08c, 09a and 12a import it from `endurance.ts` |  |
| 5 | Windows asserted before their inputs exist | Applied. Windows are asserted only in 09a's `evaluate.test.ts` (T/W 4 to 9, hover throttle 0.25 to 0.5, per-motor current under 40 A, hover amps printed, typical flight time 240 to 540 s). 05b to 05d keep validate, read ok, per-pair current under `i_max_a` and `checkDescriptor`. The 05c battery sag window is kept: it needs only 07a, which 05c already depends on |  |
| 6 | `simulation.tests` missing from Procedure P | Applied in step 4, quoting the item shape at `component.schema.json` lines 1130 to 1148 (required `id`, `kind`, `file`; `state` must be `present`) and the `allOf` rule at line 1158 | VERIFIED by reading the schema |
| 7 | `schemas/` is not a repo path | Applied. Every B18 reference uses `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/`. Section 4 has a new "Schema paths" rule. `scripts/schema-gen.mjs` and `SCHEMA_DIR` are B2's and do not exist yet, so the rule says to import it only when the file exists | VERIFIED: `ls schemas` fails; roadmap line 1216 |
| 8 | Bare `npm run check` | Applied. 14, section 8 step 2, the exit line and 13's verification row use `KL NEXT_DIST_DIR=.next-build ...`. `KL` is `env A= B= ...`, so `env` accepts the added assignment and the command (roadmap lines 72 to 73) | VERIFIED by reading roadmap 2.3 |
| 9 | Missing edge to 03b | Applied to 05b, 05c, 05d in the index, edge list and header rows |  |
| 10 | Missing 09e and 10b edges | Applied. 09f depends on 09e; 12b depends on 10b. Cutting 10b (P1) cuts 12b (P2) |  |
| 11 | Stale section 1 and section 4 facts | Applied. Task files B2 to B20 exist. Craft projects are `content/projects/drones/{a,b}/<id>.project.json` (`B13-labs-robotics-drones.md` line 84). `CraftPanel` is `src/components/studio/lab/CraftPanel.tsx` (B13 line 1047). B11 has no `putPart`: the repository method is `PartsRepository.put(rec: PartRecord): Promise<PutResult>` (B11 line 371), and 09e saves through `PartLibrary.save(def, files)` (B11 line 1185) so the picker sees the part at once | VERIFIED by reading B11 and B13 |
| 12 | No ESC entry | Applied. `EscEntry` and an `esc` argument to `entryToDescriptors`, with a test. Every slot requires an ESC, so the form needed it |  |
| 13 | 09d too large | Applied. 09d1 (hook, `SlotsEditor`, `layout.ts`) and 09d2 (`DroneBuilder`, `LegacyBanner`, router, role gating). Each is M and within 5 files. 11d no longer depends on the builder and moved its Fly strings to `flight.json`, because 09d2 and 11d are both in group 8 and would otherwise both edit `dronebuild.json` |  |
| 14 | Hit radius not testable | Applied with a different number. The review used the x component of the arm (0.078). The registry rule averages `Math.hypot(x, y)` (`src/lib/flight/registry.ts:141`), so for `frame-5in-x` at wheelbase 225 mm the radial distance is 112.5 mm. With `propR = 0.1295 / 2`, `hitRadius = round(max(0.03, 0.1125 + 0.032375), 3) = 0.145`. The test asserts 0.145 to 3 decimals. 05d pins `wheelbase_mm` 225 and 05b pins the 5.1 in prop at `diameter_mm` 129.5 | VERIFIED by reading `registry.ts:136-143`; arithmetic ESTIMATED until run |
| 15 | Optimiser library by id | Applied. `Library` holds `{ ref, version }` per role; 12a depends on 05a; swapped slots come from `resolve` then `readMotor`, `readProp`, `readBattery`; `Build.fits` is rebuilt from the prop's `x_fit`; unreadable parts go to `pruned` with the path in a new `prunedWhy` list |  |

Task count is 42, not the 41 the review expected: the review's 09g gave 41, and the 09d split (issue 13) adds one. Groups are now 10. The ownership table, edge list, group table, per-task file counts, coverage table and risk row RK-8 were updated for the new ids.
