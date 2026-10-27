# Flight simulator: dynamics, registry, courses, range figure, fly page, replay

**Paths:** `src/lib/flight/**` (19 files), `src/components/flight/**` (7 files), `figures/flight/**`, `public/figures/flight/range.html`, `src/app/[lang]/drones/[drone]/fly/page.tsx`, `src/i18n/messages/*/flight.json`
**Entry points:** `/[lang]/drones/[drone]/fly` (page.tsx `Fly`) renders `FlyWorkspace` (src/components/dronelab/FlyWorkspace.tsx) which mounts `FlightRange` (src/components/flight/FlightRange.tsx). The physics entry is `createSession` (session.ts:93) over `createSim`/`stepSim` (sim.ts:103, 308). Registry entry: `flightOf(content)` (registry.ts:260).
**LOC:** `cat src/lib/flight/*.ts | wc -l` = 3869 (of which tests: 967); `cat src/components/flight/* | wc -l` = 1530; `figures/flight/{src/*.js,range.css,range.template.html,build.mjs}` = 1324; page.tsx = 102. Total about 6825, plus the generated `public/figures/flight/range.html` (1274 lines, 70 KB, a build output). `src/i18n/messages/en/flight.json` has 270 leaf keys (counted with node).
**Owner today:** "flight" agent (docs/ARCHITECTURE.md:119 lists exactly these globs). Content for the crafts is owned by the "drone content" agent.

All statements below are VERIFIED (source read at commit bb546d6, unless tagged otherwise). I ran `npx vitest run src/lib/flight src/components/flight`: 5 files, 96 tests, all pass (7.3 s). I also ran a headless benchmark (script in the scratchpad `audit/flight/bench.mjs`, transpiling sim.ts with the TypeScript API as figures/flight/build.mjs does).

## Purpose

A browser flight "range" for the drone catalogue. A learner builds a drone on the bench (Drone Lab), then flies that exact design (weight, thrust, battery, faults) over a small course: gate races, checkpoint runs, delivery/spray missions, autopilot modes, daily challenge, ghosts, and a slow-motion "why did I crash" replay. It is a teaching game with a physical flavour, not an engineering simulator. The code itself says the numbers are tuned to feel right ("the original's 0.045 for a 5-inch", types.ts:93).

## Dependencies (imports in, imports out; third-party packages)

- Imports out of the lib: `src/lib/flight` is self-contained except two type/data hops: registry.ts:1-3 imports `@/content/schema` (types) and `@/content/ids` (`DRONES[content.id].palette`, registry.ts:164, a runtime lookup keyed by catalogue id); from-calc.ts:1 imports `../drone/calc` (types only). No third-party packages in `src/lib/flight` at all (grep of imports: only relative and `@/`).
- Components import `@/components/figure` (FigureFrame, iframe bridge), `@/components/ui`, `@/i18n/*`.
- Figure code (`figures/flight/src/*.js`) is plain browser JS, no packages. `figures/flight/build.mjs` needs `typescript` (dev dep) to transpile world/registry/quad5 for the embedded standalone demo.
- Imports in (who uses it): 27 files outside the subsystem: `src/components/dronelab/FlyWorkspace.tsx`, `src/lib/dronelab/fly.ts`, `src/lib/sound/sounds.ts`, `src/content/schema.ts`, 12 `src/content/drones/*.ts` content modules (they carry the flight params) and their tests (`grep -rln "lib/flight" src`). Telemetry kinds `flight.lap` / `flight.start` consumed by `src/lib/telemetry/kinds.ts` and `src/lib/server/db/schema.ts:30`.

## Public interfaces (exported functions/types/components/messages, with path:line)

| Interface | Path:line | Notes |
|---|---|---|
| `STEP = 0.01`, `MAX_FRAME = 0.1` | sim.ts:20,22 | fixed 100 Hz step; frame catch-up clamp |
| `createSim`, `resetFlight`, `dispatch`, `stepSim`, `advance`, `drainEvents`, `frameOf`, `replay`, `hoverCommand` | sim.ts:103,125,220 (dispatch),308,327,939,966,1008,303 | the whole engine is these plus a `SimState` mutable record |
| `FlightAction` (arm, disarm, toggleArm, reset, mode, wind, sticks, design) | types.ts:243 | the only way in; used for live input, replay and the log |
| `FlightEvent` union (armed, crash, lap, run, gate, battery, desync, stall ...) | types.ts:256 | the only way out besides the frame |
| `FlightFrame` | types.ts:288 | flat object posted to the iframe each frame |
| `createSession` / `FlightSession` (`getState`, `subscribe`, `dispatch`, `tick`, `frame`, `log`, `origin`) | session.ts:97 / :40 | external-store shape for React |
| `flightOf`, `flightCraft`, `flightCourse`, `modesFor`, `startMode`, `parOf`, `medalFor` | registry.ts:260,163 (flightCraft),214 (flightCourse),254,267,277,286 | content module to range craft/course |
| `crashReplay`, `causeOf`, `fixFor`, `BREAKS` | crash.ts:109,56,71,12 | log-based crash replay and the "one fix" advice |
| `ghostFromLog`, `paceGhost`, `ghostAt`, `loadGhost`, `saveGhost` | ghost.ts | ghosts cut from replays |
| `dailyChallenge`, `challengeLink`, `readChallengeQuery` | challenge.ts | UTC-day hash-picked challenge |
| `buildSolids`, `collide`, `throughGate`, `passCheckpoint` | world.ts | collision world |
| `demoRoute` | route.ts | autopilot demo route planner |
| `fromCalc` | from-calc.ts:5 | drone-calc result to `CalcOutputs` |
| React: `FlightRange`, `TouchSticks`, `GamepadPanel`, `BreakIt`, `DailyChallengeCard`, `useRoomGhosts` | src/components/flight/*.tsx | `FlightRangeProps` at FlightRange.tsx:50 |
| iframe protocol (host to figure): `hello`, `set {state}`, `locale`, `theme`, `flash`, `pause/resume`, `view`, `act`, `press`, `query`; figure to host: `ready`, `state`, `part {act:"key"}`, `focus`, `error` | figures/flight/src/main.js:~100-200 | postMessage, `source:"iynk"`/`"iynk-figure"`, `v:1` |
| i18n namespace `flight` (20 top-level groups, 270 leaves) | src/i18n/messages/en/flight.json | `title, figureTitle, mode(s), buttons, stats, osd, msg, dirs, legend, sticks, gamepad, hit, demoHint, medals, ghosts, why, breakIt, challenge` |

## State ownership and persistence (stores, localStorage keys, server state, DB tables)

- Simulation state: one mutable `SimState` object per `FlightSession`, owned by `useMemo` in FlightRange.tsx:~93 keyed on `[craft, course]`. Not in React state. A snapshot (`FlightSnapshot`, 24 fields) is published to React at most 10 times a second or on any event (session.ts:124-128).
- Action log: `actions[]` inside the session (session.ts:104), in memory only, never persisted, never sent to a server. Used for ghosts and crash replay.
- localStorage keys (VERIFIED by grep): `iynk:ghost:v1:<craft>:<course>` (best-lap ghost, ghost.ts:117), `iynk:challenge:v1:<yyyy-mm-dd>` (challenge.ts:89), `iynk:flight-pad:v1` (gamepad mapping, FlightRange.tsx:~81). All wrapped in try/catch.
- Per-learner progress (medals, best times per course) goes through `progressKey.droneCourse` in FlyWorkspace.tsx:118 (the progress store, outside this subsystem).
- Server: `flight.lap` telemetry events (`{course, timeMs, name?}`) are the only thing that leaves the browser. Validated by zod as an integer in `[LAP_MS.min, LAP_MS.max]` (src/lib/server/db/schema.ts:32). No DB table is owned by this subsystem.
- Room (multiplayer): `RangePose` posted via `onPose` each moving frame; peers' poses come back through `room-ghosts.ts`. Poses only; the sim is not shared.

## Current functionality (what VERIFIED works, how you know)

Flight model (answering the audit questions):

| Question | Answer | Evidence |
|---|---|---|
| 6-DoF rigid body? | No. Multirotors are a point mass with Euler-angle attitude that is set or integrated directly. There is no inertia tensor, no angular velocity state, no motor-by-motor torque, no quaternion. Position/velocity are 3-D (6 numbers), attitude is yaw/pitch/roll (3 numbers). Effectively 3-DoF translation plus a kinematic attitude. | sim.ts:496-533 (attitude), 516-546 |
| Integration | Semi-implicit Euler (velocity updated, then position with the new velocity), fixed step 0.01 s. | sim.ts:630-631 `s.v[i] += a[i]*dt; s.p[i] += s.v[i]*dt` |
| Controller | No PID. Angle mode: first-order lag of attitude toward `stick*limit` with gain `levelRate*dt` (`s.pitch += (target - s.pitch) * k`). Acro: stick (with Betaflight-style expo `v(1-e)+v^3 e`) times `acroRate` deg/s added directly to the angle. Yaw: rate-commanded, `yawRate` deg/s. Altitude hold: proportional law `need = m(g + 3(climb*rate - vz))/thrust`, then sqrt for the thrust-vs-command curve. Position/RTL/mission: P controllers on velocity (gain 2.2) producing a tilt target clamped to a max lateral acceleration. No integral or derivative terms, no gyro filter, no rate loop. | sim.ts:281-310 (autopilot), 496-533, 565-578 |
| Motor/prop thrust | Thrust = `u^2 * tmax * V^2 * fade`. `tmax = N * thrustPerMotor * g * (N-lost)/N` where `thrustPerMotor` comes from the existing drone calculator (static thrust at nominal 3.7 V/cell). `u` is the motor command after a first-order spool `u += (cmd-u)*spool*dt`. Voltage factor = `(V/Vnom)^2` (battery.ts:91). No propeller advance ratio, no thrust loss with airspeed, no ground effect, no per-motor RPM state. | sim.ts:606 `s.thrust = f * tmax * kV * fade`; battery.ts:89-92 |
| Drag | Single isotropic law `a = -drag * v_rel * (|v_rel|+1)` (linear plus quadratic blend), `drag` default 0.045 1/m, same on all axes, no frame-dependent area, no body-axis coupling. Wing uses `cd*V^2`. | sim.ts:597-601; registry.ts DEFAULTS |
| Battery | Real-looking: per-chemistry open-circuit curve (11 points), internal resistance `IR_AH/Ah`, I*R sag, current from `hoverAmps*(T/W)^e` with `e` fitted so full thrust draws `maxAmps`, voltage-dependent current, low-voltage warning, 0.5 s cut-off. Tuned to the calculator's hover and max amps. | battery.ts:1-92; test flight.test.ts:76 |
| Wind | Deterministic: mean wind plus two summed sines of the step count (`wave(T,0.7,1.3)` etc.), `T = step*STEP`. No turbulence model, no wind shear, wind applies only as relative-air drag (multirotor) or added to ground velocity (wing). Off by default. | sim.ts:292-301 |
| Sensor noise | None. No IMU, baro, GPS or RC noise, latency, or estimator. grep for noise/gyro/inertia/quaternion in sim.ts returns only a comment. | `grep -n -i "noise\|gyro\|pid\|inertia\|quaternion" sim.ts` |
| Fixed wing | 3-DoF kinematic: airspeed ODE `dV/dt = (T - cd V^2)/m - g sin(gamma)`, lift as a `(V/vmin)^2` sink reduction, coordinated turn `yaw_rate = g tan(roll)/V`, stall = pitch-down plus roll rock below `vstall`. Hand launch is scripted (sets 10.5 m/s and 1.6 m height). | sim.ts:654-760 |
| VTOL | Tilt schedule over `transitionS`, lift from forward speed, then switches to the wing model when tilted and fast. | sim.ts:635-652 |
| Tricopter | Tail servo with travel limit and slew rate; yaw rate proportional to servo angle. | sim.ts:535-546 |
| Swarm | Followers are kinematic: first-order velocity toward formation slots around the leader. They are not simulated craft and do not collide. | sim.ts:761-780 |

Determinism and replay:

- Fixed-step, no `Math.random`, `Date.now`, `performance.now` in physics (grep over `src/lib/flight/*.ts` excluding tests: the only `new Date` is challenge.ts:27/33, UTC day selection). Wind is a function of the step counter. VERIFIED: I ran the same 60,000-step scenario twice in Node and got bit-identical final position (`identical`), and the unit test at flight.test.ts:296-311 replays a log and compares `frameOf` with `toEqual`.
- Wall-clock enters only through `advance()`, which converts the browser frame delta to whole steps and clamps to 0.1 s (sim.ts:327-336). A slow device runs slow-motion, not different physics.
- Replay is a real re-simulation, not a recorded trajectory: `replay()` (sim.ts:1008) recreates the sim from `origin` and re-dispatches the logged `{step, action}` list. Ghosts (`ghostFromLog`, ghost.ts:56) and crash replays (`crashReplay`, crash.ts:109) are cut from it. The log stores the last `sticks` action per step, so it is small. The pace ghost is a headless run of the demo autopilot (`paceGhost`, ghost.ts:75).
- Caveat (VERIFIED): replay determinism relies on the same JS engine arithmetic (`Math.sin/cos/atan2/pow/exp`). V8 across versions or Firefox/Safari may differ in the last ulp; chaotic runs (crashes into trees) could diverge. UNKNOWN: cross-browser replay equality was not tested.

Faults:

- Modelled as boolean flags on `CraftFaults` (types.ts:25-33), not as physics changes to motors. Reversed FC (`fcReversed`), swapped props, unchecked motor direction: after 0.25 s with `u^2 > 0.05` the sim injects roll `+/-900 deg/s` and pitch `500 deg/s` (sim.ts:557-565). Reversed tail servo: servo runs to its stop the way it leans, then after 1.5 s a 900 deg/s roll is injected (sim.ts:567-575). Wing `servosReversed`/`fcReversed`: adds a positive-feedback roll and pitch term (sim.ts:~758); `tailHeavy`: pitch-down oscillation; `propBackwards`: thrust times 0.4. `accUncalibrated`: blocks arming. `overKv`: a heat integrator, desync pulse at heat > 9 (sim.ts:577-590). Motor out: quad (n<=4) goes uncontrolled with fixed spin rates; hex/octo loses `1/n` thrust and drifts in yaw.
- So the fault set is scripted outcomes ("the craft flips") rather than the consequence of simulated physics (a reversed FC does not drive the controller the wrong way, it adds a fixed rotation). That is fine for teaching, wrong for engineering.

Rendering:

- Not WebGL and not a visible canvas (a 2D canvas is used only to measure text width, ink.js:76): two inline SVG views inside an iframe (`public/figures/flight/range.html`, 70 KB built from `figures/flight/src/{ink,geo,iso,fpv,main}.js`). Chase view: isometric SVG whose static scene is rebuilt only when the view azimuth changes; each frame rewrites `innerHTML` of the craft group, shadow group, rings and ghosts (iso.js:272-315). FPV view: SVG rebuilt via `svg.innerHTML = s` each frame (fpv.js:218).
- Frame budget: the host loop is `requestAnimationFrame` (FlightRange.tsx:485 `loop`) running input, `session.tick(dt)` (about 2 steps per 60 Hz frame at 100 Hz physics) and `frame.send("set", {frame})` over `postMessage` to the iframe each frame, while the iframe runs its own `requestAnimationFrame`. Measured physics: 1960-2170 ns per `stepSim` on this machine in Node (quad5 race course, wind on), so about 0.004 ms per 60 Hz frame. `frameOf`+`createSim` 15-22 microseconds. The draw cost is DOCUMENTED in iso.js:1-4 as "~1.5 ms per frame on a desktop, under 9 ms at 6x CPU throttle"; I did not measure it (no browser run), so that is DOCUMENTED, not VERIFIED. The loop idles (stops posting) after 3 still frames (FlightRange.tsx idleFrames).

Features VERIFIED by tests (96 pass): hover throttle equals the calculator's value on a nominal pack; altitude hold settles on the pack-voltage-corrected hover command; battery cut-out; speed envelope; hard-landing crash; arming blocks; reversed-FC flip; wind drift; gates counted only along heading; every course of every craft has a reachable demo autopilot lap (flight.test.ts:473-522 loops over all content); parcel drop and lighter flight; wing RTH altitude/loiter radius; yaw expo; deterministic replay; crash replay finds its crash; ghosts; daily challenge picks.

Can it fly a craft defined outside the registry/content? Partly. The sim itself takes plain `FlightCraft` + `Course` + `CalcOutputs` objects (sim.ts:103 `createSim(craft, course, calc, opts)`), no registry lookup, so hand-built objects fly (the tests do exactly this in places). But the only producer is `flightOf(content: DroneContent)`, which needs a full catalogue `DroneContent` record and `DRONES[content.id].palette` from the static id table (registry.ts:164); the fly page is statically generated from `DRONE_IDS` (page.tsx:23). There is no import path for a user-defined craft.

## Known defects (with repro or evidence)

| # | Defect | Where | Evidence | Severity |
|---|---|---|---|---|
| 1 | No geofence for multirotors: only an `outOfField` event message; craft can fly anywhere until the battery dies. | sim.ts:896-910 | Benchmark: quad5 held at pitch 0.3 flew to x=1334 m, y=390 m (field is ~100 m) and only crashed at t=451 s when the battery emptied (`crash why:"ground"`). | low (UX) |
| 2 | Race/lap times are client-claimed. The leaderboard accepts any integer in `[LAP_MS.min, LAP_MS.max]` with no log, no replay check, even though `replay()` and the log exist and are deterministic. | src/lib/server/db/schema.ts:32; FlyWorkspace.tsx:123 | `lapPayload` has only `course`, `timeMs`, `name`. | high for a competitive product, low for a hackathon |
| 3 | Physics does not conserve anything sensible under big attitude jumps: faults inject 900 deg/s roll; crashed craft keep a fake tumble (`s.roll += 6*dt`, `yaw + tumble*40`). Crash replay therefore shows scripted tumbling, not real post-impact dynamics. | sim.ts:314-320, 558-575 | read | low |
| 4 | Quadcopter motor-out is binary for `n <= 4`: uncontrolled at 400/300 deg/s, regardless of which motor. | sim.ts:516 | read | low |
| 5 | Collision is a sphere against boxes/cones, checked once per step with no swept test (only gates and checkpoints use segment tests). At 20 m/s a step is 0.2 m, larger than `hitRadius` 0.03 m default for tiny crafts (`max(0.03, armLen + propR/2)`), so thin obstacles (poles r=0.08, gate posts 0.07 m) can be tunnelled. HYPOTHESIS (not reproduced). | world.ts:117 `collide`; registry.ts:~190 | read | medium |
| 6 | `landed` and some state transitions use thresholds on `speed<1` and `p[2]<=0.02`; a craft can be `airborne` flagged while sliding. Not reproduced. | sim.ts:~890 | read | low |
| 7 | Built standalone page range.html embeds one craft (quad5) and course snapshot; regenerating requires `node figures/flight/build.mjs` and it is committed output, so source and artefact can drift. | figures/flight/build.mjs | read | low |

## Technical debt (table: item, path, evidence, severity, effort guess)

| Item | Path | Evidence | Severity | Effort |
|---|---|---|---|---|
| `sim.ts` is a 1028-line god module: multirotor, wing, VTOL, tricopter, swarm, autopilots, scoring, battery glue, events and replay in one file with a 100-field mutable `SimState` | src/lib/flight/sim.ts | `wc -l` 1028; `SimState` lines 28-107 | high | 1-2 weeks to split by craft class |
| Physics classes are branches inside one step function (`cls === "wing"`, `c.tailServo`, `c.vtol`), not pluggable models | sim.ts:313-319, 565-600 | read | high | with the split above |
| Attitude/controller model is angle-lag, not rate-loop PID; cannot express tuning (PID gains, filters), which is what Betaflight/ArduPilot lessons teach | sim.ts:496-533 | read | high if the product wants tuning | 3-6 weeks (new rigid-body + controller) |
| Magic constants everywhere (900, 500, 400, 300, 1.5 s, 0.25 s, 2.2, 0.8) with no names or units | sim.ts:513-590 | read | medium | days |
| Course geometry and scoring are tied to content shape (`Course` built from `ContentCourse` goals/gates) | registry.ts:~215-255 | read | medium | days |
| SVG `innerHTML` string rebuilding every frame, no pooling, no WebGL; limits scene complexity and crafts/obstacles | figures/flight/src/iso.js:272-315, fpv.js:218 | read | medium | weeks if 3D is wanted |
| Figure code and host code duplicate geometry/keys (`FLIGHT_KEYS` in both main.js:6 and input.ts:4) | main.js, input.ts | grep | low | hours |
| The sim runs on the UI main thread alongside React and the iframe bridge; no worker | FlightRange.tsx loop | grep `Worker` none | low now, medium for headless verification/batch use | days |
| `FlightRange.tsx` is 846 lines with the loop, ghosts, crash replay, event narration, layout fitting in one component | FlightRange.tsx | `wc -l` | medium | days |
| Hard-coded English strings reach the figure as map keys (`course.checkpoints` labels double as translation keys) | FlightRange.tsx ~660; types.ts:Checkpoint.label | read | low | days |
| Built artefact `public/figures/flight/range.html` committed | public/figures/flight/ | exists | low | hours (build in CI) |

## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)

`grep -c "it(\|test("`: flight.test.ts 37 test cases (plus the per-craft loops at lines 473-522 which expand into one case per content course, so 96 total across the 5 files), challenge.test.ts 7, crash.test.ts 7, ghost.test.ts 6, FlightRange.test.tsx 10. All 96 pass.

What they check:

- Mostly self-consistency and behavioural bounds, not hardware reference data. Examples: "tops out near 50 km/h" asserts only `10 < v < 16` m/s (flight.test.ts:114-131); hover current equals the calculator's hover current (flight.test.ts:76), which is true by construction because `currentFor` is fitted to those two values (battery.ts:46-50); hover throttle equals `calc.hoverThrottle` (agreement with another model in the repo, not with a real drone).
- The calculator's own golden values (`src/lib/drone/__fixtures__/golden-*.json`) are the nearest thing to external reference, and only reach the flight tests through `fromCalc`.
- There is no comparison to real flight logs (Blackbox, ArduPilot DataFlash, PX4 ULog) or datasheet thrust/current curves for the flight dynamics. No test asserts step response, settling time, overshoot, rate-to-stick curves in deg/s against Betaflight's formula (except one: acro yaw straight 200 deg/s and expo on roll/pitch only, flight.test.ts:644-657, derived from the CLI text in content).
- Strong points: determinism replay test, "every course of every craft can be flown to the end by the demo autopilot" (a real regression net over all content), crash replay must contain a crash.
- Not covered: wing/VTOL numerical behaviour beyond smoke tests, collision tunnelling, replay across engines, FlightRange iframe messaging beyond 10 component tests, performance.

## Performance characteristics (measured if you can, else ESTIMATED/UNKNOWN)

- Physics: VERIFIED by my benchmark, `node audit/flight/bench.mjs`: 60,000 steps of quad5 on the race course with wind on cost 1960 and 2171 ns per `stepSim` in two runs (about 0.2 ms of CPU per simulated 100 steps, i.e. about 2 steps x 2 us = 4 us per 60 Hz frame). Node on the audit machine; browser JIT will be similar. Physics is not the bottleneck.
- `frameOf` + `createSim`: 15-22 us.
- Headless pace-ghost computation: runs a whole lap synchronously on the main thread after first paint (FlightRange.tsx `setTimeout(..., 0)`, up to 300 s of simulated flight = 30,000 steps, ESTIMATED about 60 ms). Crash replay and `ghostFromLog` re-simulate the entire session from step 0 on the main thread (a long session of 10 minutes = 60,000 steps, ESTIMATED about 130 ms) in a `setTimeout`. UNKNOWN whether this causes visible hitches on low-end phones.
- Rendering: DOCUMENTED (iso.js:1-4 comment) 1.5 ms per frame desktop, under 9 ms at 6x CPU throttle. Not re-measured here. Per frame the host builds a `FlightFrame` object plus ghost array and `postMessage`s it (structured clone) to the iframe; payload is a few hundred bytes. Idle detection stops posts after 3 still frames.
- Bundle: range.html is 70,275 bytes, inline, no network. UNKNOWN: JS size of FlightRange chunk.

## Security risks

- Client-trusted scores (defect 2). A user can POST any `flight.lap` within the allowed range to the telemetry endpoint and top a board; `LAP_MS` bounds are the only defence. Reproducible by sending the telemetry request directly (not attempted, no production traffic).
- iframe `postMessage`: host posts with `window.location.origin`; the figure checks `e.source === window.parent` and, outside `file:`, `e.origin`, and validates frame keys with `num()` (main.js `accept`, `okFrame`). Ghost colours are regex-checked and labels truncated. Good. But `iso.js`/`fpv.js` build SVG strings and assign `innerHTML`. Strings that reach it from the host are escaped with `esc()` (ink.js:68) where I looked: decal text (iso.js:125), ghost label and colour (iso.js:313,335; fpv.js:206-208), OSD text (fpv.js:108-134). I did not audit every `innerHTML` site (iso.js craftSvg/ring builders take numbers and palette keys). The iframe is same-origin, so any missed injection would run with site origin. I did not find a `sandbox` attribute on the `<iframe>` (grep "sandbox" in src/components/figure returns nothing).
- Local storage ghosts are checked field by field on load (`isGhostTrack`, ghost.ts:107), size bounded only by the browser.
- Challenge link query (`beat`, `by`) is validated and length-clamped (challenge.ts `readChallengeQuery`).
- Nothing in this subsystem calls the network, holds secrets or touches wallets.

## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)

Today: catalogue items only. The core `createSim` accepts plain data (`FlightCraft`, `Course`, `CalcOutputs`), so the engine is reusable, but everything that makes data is catalogue-bound:

1. The craft comes from `DroneContent` (registry.ts:208 `flightCraft`) which needs `DRONES[content.id]` (ids.ts) and a `frame`, `design.props`, `courses`, `flight` block with typed modes.
2. `CalcOutputs` comes from `fromCalc(calc(designInput(content.design, pick)))`, i.e. the drone calculator over a catalogue of motors/props/batteries (src/lib/dronelab/fly.ts). A user-assembled design with arbitrary parts must first be expressed in that calculator; its inputs (auw, thrustPerMotor, hoverAmps, maxAmps, cells, mah) are the true physics interface and are simple.
3. Physics classes are a closed enum (`multirotor|tricopter|wing|vtol|swarm`) with special-case branches (sim.ts:313-319). A user frame with another motor layout (hex, coaxial, H-frame with unequal arms, ducted fans, helicopters) gets only the lump `motors` count; there is no per-motor geometry, no moment of inertia, no COG offset.
4. Faults are a closed list of booleans tied to bench lessons (`fcReversed`, `propsSwapped`...); a builder's own "mistakes" (wrong prop direction on motor 3, swapped motor order, CG offset) cannot be expressed. The effect is a canned flip, independent of which motor is wrong.
5. Courses come from content and are static; there is no course editor, though `Course` is plain data (prims, gates, checkpoints, missions) and `buildSolids` is generic.
6. The fly page is statically generated per catalogue id (page.tsx:23-25) and the page loads content by id (`loadCraft`).

What does work for arbitrary projects with little change: the session/replay/ghost/crash-replay machinery (all keyed on `FlightOrigin` plain data), the SVG renderer (takes `look` data: arms, armLen, propR, body, span, chord; `craftLook` derives it from the frame layout), the input stack, and the course/gate/mission scoring.

## Required refactoring to get there

1. Define a stable, versioned `CraftSpec` (JSON-serialisable: mass, inertia (or derive from geometry), motor positions/spin directions/KV/thrust curve, prop, battery cells/mAh/IR, drag area, controller gains, mode list). Make `flightCraft(content)` only one adapter to it; add a validated user-spec adapter (zod) with limits.
2. Replace the lump `thrustPerMotor` with a per-motor model (thrust and torque from RPM, motor lag, ESC desync) and an inertia tensor so actuator faults (reversed motor, swapped props, dead motor, wrong order) fall out of the dynamics instead of being scripted at sim.ts:557-575.
3. Replace "attitude lags toward target" with a rigid-body integrator (quaternion, body rates) and a rate-PID + angle outer loop with configurable gains and filters, keeping the current model as the "arcade" class for existing lessons (golden behaviours stay under test).
4. Split `sim.ts` into modules (airframe model per class, controller, autopilot/navigation, scoring, event bus) and make the physics class an interface.
5. Move scoring verification to the server: submit `{origin hash, log}` and re-run `replay()` on the server (it is pure TypeScript with no DOM or packages) to validate lap times; needs a cross-engine determinism check (fixed-point or avoiding transcendental drift) or a tolerance policy.
6. Move simulation into a Web Worker (the module has no DOM dependency), so long replays and many ghosts do not block the UI.
7. Add a course data schema with a validator and an editor path; remove the dependence of `flightCourse` on `ContentCourse`.
8. Decide the renderer: keep SVG for the stylised look, or add a WebGL/canvas path for user scenes with more objects; extract the iframe protocol into a typed shared module (`protocol.ts` already exists for figures).

## Recommendation: preserve | extend | replace | deprecate | investigate

**extend** for the product shell (session/log/replay/ghost/scoring/renderer/protocol are sound, deterministic and tested), and **replace** the dynamics core when real-physics fidelity or user-defined craft are product goals: the current model is an arcade point mass tuned to the calculator, not a base that can grow into SITL-grade fidelity.

Comparison with PX4/ArduPilot SITL fidelity (what is missing): rigid-body 6-DoF with inertia and quaternion attitude; per-motor thrust/torque/RPM dynamics with ESC and battery coupling; rate/attitude PID cascades with the real controller code (SITL runs the actual firmware, this runs none); EKF and sensor models (IMU noise/bias, baro, GPS, magnetometer); RC and telemetry latency; MAVLink/Betaflight serial interfaces; proper aerodynamics (propeller inflow, blade flapping, ground effect, wing lift/drag polars, control surface deflection); turbulence/gust spectra (Dryden); failsafe state machines tied to firmware parameters; parameter system; logging in standard formats (ULog/DataFlash/Blackbox); ability to take a user's firmware config. The sim's own value is its tight coupling to the teaching catalogue, not its fidelity.

## Open questions

1. Is the product ambition "teach and gamify" (current model is adequate) or "predict how my design flies" (needs the replacement above)? That decides extend vs replace.
2. Should lap times be verified server-side from the log? If yes, is cross-browser bit-exact determinism required, or is tolerance acceptable? UNKNOWN until cross-engine replay is tested (Chrome vs Safari vs Firefox).
3. Is `room-ghosts` pose streaming trusted (peers' labels/colours)? Escaping exists (see Security) but a fuzz test with markup in a peer name has not been run.
4. What is the real draw cost on mid-range phones? The 1.5 ms number is a comment in source, not a reproducible benchmark.
5. Does collision tunnelling occur for small crafts at race speed (defect 5)? A short test with a pole and a 20 m/s whoop would settle it.
6. Who owns the per-craft `flight.params` tuning values in content modules (12 files)? They are the de facto physics calibration and have no reference data behind them.
