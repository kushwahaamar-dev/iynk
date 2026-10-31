# Council memo: robotics and aerospace lens

Seat: robotics engineer (kinematics, control, sensors, ROS 2, dynamics) and flight-simulation engineer.
Date: 2026-10-27. Scope: the Robotics Lab and the Drone Lab with its flight range. Nothing in the repo was changed except this file.

Label key: VERIFIED (the audit inspected or reproduced it; I re-checked the items marked "re-checked"), DOCUMENTED, EXTERNAL (research file and [S#]), ESTIMATED (assumptions shown), HYPOTHESIS (with a test), UNKNOWN.

## 1. Bottom line

1. The "Robotics Lab" is not a robotics lab. It is 13 electronics benches: motor drivers (TB6612FNG, L298N, A4988), a servo driver (PCA9685), sensors (HC-SR04, MPU-6050, QTR-8RC), a buck converter (LM2596), an LED resistor, a transistor switch, two MCU board builds, and a Raspberry Pi 5 bench whose "ROS 2" content is a power tree, a boot sequence and terminal text. There is no kinematics, no dynamics, no URDF, no robot body, no joints, no wheels on a floor. I re-checked: a case-insensitive grep for kinematic, urdf, rapier and mujoco over `src`, `figures` and `package.json` returns no file. (VERIFIED: `src/content/robotics/*.ts` file list, `src/content/robotics/pi5-ros2.ts`, grep above; DOCUMENTED: `01_AUDIT/inventory/boardlab-robotics-ui.md`, `content-schema.md`.) The honest name today is "Electronics for robots". The robotics-simulation gap the competitor dossier describes (nobody joins robot simulation to electronics) is open because iynk has not built the robot half either. [EXTERNAL: `02_RESEARCH/competitors/robotics.md`]
2. The Drone Lab is a good teaching shell on a borrowed, uncalibrated physics core. The calculator reproduces a third-party site's formulas (342 golden rows captured from that site, not from hardware). The flight range is an arcade point mass with scripted faults. Both are fine for "learn what the parts do". Neither can answer "will my design fly" for a part the catalogue does not hold. (VERIFIED: `01_AUDIT/inventory/drone-calc-lab.md`, `flight.md`.)
3. Verdict on the two options: freeze the Robotics and Drone labs as content (no new engines, no new crafts, no fidelity work) until the core electronics builder (project file, parts, wiring, run) exists. Then take one thin vertical slice into each, in this order: first a 2D wheeled robot (cheap, honest, fits the electronics builder, needs no physics engine), then a data-driven drone design check. Do not start Rapier, MuJoCo, PX4 or ArduPilot work before that. The strongest differentiated bet is "electronics-first robot and drone assembly that checks power, current and wiring", not "simulate flight better than PX4".
4. Two things cannot wait for the builder, because they are safety and legal, not features: a LiPo and propeller safety panel plus a "before you fly for real" panel, and a written content rule on autonomy features (swarm, payload release, long range). See section 6.
5. The most dangerous temptation in this seat is to chase simulator fidelity because it is technically interesting. A faithful rigid-body flight model with Betaflight-style PID would take weeks and serve one segment (FPV tuners) that already buys $20 simulators. The audience the founders describe (people without money, place or equipment) gets more from a correct power budget, a wiring check and a good "why did it fail" explanation than from a better attitude controller.

## 2. Evidence reviewed (files)

Read in full or the relevant sections:
- `01_AUDIT/inventory/flight.md` (all), `drone-calc-lab.md` (all), `boardlab-robotics-ui.md` (purpose, state, reusability, recommendation), parts of `content-schema.md`, `figure-items.md`.
- `01_AUDIT/FEATURE_VERIFICATION.md` (summary and drone lines), `01_AUDIT/SECURITY_BASELINE.md` (S1 row), `01_AUDIT/REVIEW_GAPS.md` (rows 9, 11 and the drone-run gap), `01_AUDIT/TECHNICAL_DEBT.md` (A12 heading).
- `02_RESEARCH/competitors/robotics.md` (all products), `competitors/drone.md` (summary, DroneBlocks, rows I sampled), `tech/platform-options.md` (physics and flight sections, decision table, spikes 6 to 8), `tech/compliance-safety.md` (sections 5.1 to 5.4 and 6), `TECHNICAL_RESEARCH.md` (D6, D7, RS-13, RS-14, G13), `USER_SEGMENTS.md` (segments 5 and 6 lines), `COMPETITOR_MATRIX.md` (DroneBlocks and eCalc rows), `WORKFLOW_BENCHMARK.md` (export and BOM rows).
- `docs/handoff/CONTEXT.md` (founder's words on why robotics matters to them, line 243).
- Repo checks I ran myself: list of `src/content/robotics` and `src/content/drones`; grep for kinematics and physics-engine names; grep of `src/i18n/content/en/drones` for safety wording; `ls src/app` for a terms or policy route.

Not read: `figures/drones/*.js` (5,070 lines), `sim.ts` beyond the audit's quotes, `docs/research/drone-lab-b.md`, `cli.ts` beyond the audit. I did not run any browser or the flight benchmark. I did no web search; every external claim below is cited from the research files and inherits their labels.

## 3. What the two labs really model

### 3.1 Robotics Lab (13 benches)

| Bench group | Items | What it models | Source |
|---|---|---|---|
| Power and switching | led-resistor, transistor-switch, lm2596 | Current draw, polarity, fault explanations (`CurrentModel`) | VERIFIED: `content-schema.md` line 24; `boardlab-robotics-ui.md` model.test note |
| Motor and servo drivers | tb6612fng, l298n, a4988, pca9685 | Wiring order, driver faults, current; no motor, no load, no mechanics | VERIFIED by file list; behaviour DOCUMENTED |
| Sensors | hc-sr04, mpu6050, qtr-8rc | Pins and readouts; no world to sense | DOCUMENTED |
| Compute | uno-r3-build, esp32-s3-build, pi5-ros2 | Assembly steps, power tree, throttle bits, ROS 2 terminal transcript | VERIFIED: `pi5-ros2.ts:406-412`, `:582-590` |

The shared engine is the "Board Bench" iframe figure plus the interpreter; the robotics practice tasks run small code against it. The audit's own current-draw tests check against a hand-authored fixture (13.6 mA for a 220 ohm LED), not measured hardware. (DOCUMENTED: `boardlab-robotics-ui.md`.) The bench teaches the part of robotics that blocks beginners in practice (power, wiring, logic levels). That is valuable and it is what the founder's story describes: expensive equipment and sensors. It is not what a roboticist means by robotics.

### 3.2 Drone calculator

| Question | Answer | Label |
|---|---|---|
| Where do thrust and current come from? | One hand-tuned scalar `k` per craft times a dimensionless prop factor times krpm squared; hover current from a constant g/W per craft; flight time times a per-craft `flyFactor` (0.42 to 0.92) | VERIFIED: `drone-calc-lab.md` calc table |
| Is it validated against hardware? | No. Golden rows come from the original third-party site's output. No thrust-stand data in the repo | VERIFIED |
| Can a user enter a motor, prop or pack? | No. Catalogue picks only, 3 batteries x 3 motors x 3 props per craft, 13 separate regressions | VERIFIED |
| Battery sag, C-rate | Not modelled in the calculator (nominal 3.7 V per cell; only Li-ion 45 A per cell and a cRating check) | VERIFIED |
| Edge cases | `calc` returns Infinity or NaN on zero or negative inputs; no guard | VERIFIED read |
| Provenance | Constants and lesson structure follow three third-party sites; no LICENSE; hackathon rule says code written during the event | VERIFIED (FEATURE_VERIFICATION finding 8); legal outcome UNKNOWN |

Reference point: eCalc, the closest paid calculator, states +/-15 percent accuracy. [EXTERNAL: `competitors/drone.md` S6, S14] iynk has no stated or measured accuracy at all.

### 3.3 Flight range

| Aspect | What it is | Gap versus an engineering simulator |
|---|---|---|
| Rigid body | None. Point mass, attitude is yaw/pitch/roll set by first-order lag toward stick target | No inertia, no body rates, no quaternion (VERIFIED `sim.ts:496-533`) |
| Control | No PID. Angle mode lag, acro rate with Betaflight-style expo, P controllers for position | Cannot express PID tuning, which Betaflight and ArduPilot lessons teach (VERIFIED) |
| Motors | One lump thrust curve `u^2 * tmax * V^2`; no per-motor RPM, no advance ratio, no ground effect | Motor-out, reversed motor and swapped prop cannot emerge from physics (VERIFIED) |
| Faults | Boolean flags that inject a fixed 900 deg/s roll after 0.25 s | "The craft flips" is scripted, not the controller driving the wrong way (VERIFIED `sim.ts:557-575`) |
| Sensors, wind | No noise, no estimator; deterministic two-sine wind | No IMU/baro/GPS model, no Dryden gusts (VERIFIED) |
| Battery | Real-looking: OCV curve, IR sag, cutoff | Best-modelled piece; but fitted to the calculator's two points |
| Determinism | Fixed 100 Hz step, bit-identical in Node twice; replay is a real re-simulation | Cross-browser equality untested (VERIFIED in Node; UNKNOWN across engines, REVIEW_GAPS row 11) |
| Performance | About 2 microseconds per step in Node; render about 1.5 ms per frame (DOCUMENTED, not measured) | Physics is not the bottleneck (VERIFIED) |
| Tests | 96 pass; check bounds and self-consistency, not flight logs or datasheets | No step-response or real-log comparison (VERIFIED) |

The audit's own sentence is right: the sim's value is its tight coupling to the teaching catalogue, not its fidelity. I agree and I would keep it that way for now.

## 4. Weaknesses

| # | Weakness | Evidence | Label |
|---|---|---|---|
| W1 | The product's "Robotics" claim exceeds the content. No robot body, kinematics or dynamics exists anywhere in `src` or `figures` | grep returns nothing; 13 bench ids are electronics modules | VERIFIED |
| W2 | The robotics and drone labs cannot take an original project. Closed id unions (`ROBOTICS_IDS`, `DRONE_IDS`), per-item hand-written figure JS (about 24 MB of committed figure pages for 80 items), static routes | `ids.ts:24-56`, `figure-items.md`, `boardlab-robotics-ui.md` reusability section | VERIFIED |
| W3 | Calculator physics is a port of another site's numbers. 342 golden rows prove copy fidelity, not physical truth. Provenance may be unlicensed | `calc.test.ts` golden rows; `drone-calc-lab.md` test coverage and security sections | VERIFIED; licence UNKNOWN |
| W4 | No input guard in `calc`. The first user-defined part makes NaN reachable. The optimiser and MCP tool inherit it | `calc.ts:151-230` | VERIFIED |
| W5 | Flight range cannot express tuning or physical faults, so it cannot teach the control loop that Betaflight/ArduPilot courses are about. The CLI emulator lets a learner change `set` values whose effect is a canned patch (angleLimit, boardYaw, tailReverse) | `flight.md` faults and controller rows; `drone-calc-lab.md` CLI paragraph | VERIFIED |
| W6 | Wing top speed uses static thrust at speed (overstated; test pins 146 km/h for an 8x6 prop wing). Hover current uses constant g/W | `calc.ts:~207`, `:~189` | VERIFIED formula; realism ESTIMATED |
| W7 | Prop-clash check exists for one craft (octo). A user can fit an oversize prop on every other craft without a warning | `models.ts:136` | VERIFIED |
| W8 | Safety content is thin and uneven. "Props off" appears 72 times across drone prose (good). LiPo landing, storage and charging detail appears in the quad5 battery part description only; there is no safety panel, no puffed-pack or fire-handling text, no "before you fly" panel, no Remote ID or registration note. I found no terms or acceptable-use route in `src/app` | grep of `src/i18n/content/en/drones`; `ls src/app` | VERIFIED for the paths searched; other prose files not searched |
| W9 | Autonomy-flavoured crafts already ship: swarm (Crazyflie, cflib), delivery (payload drop, cellular MAVLink link, "flying beyond line of sight"), agrihex (spray), longrange, vtol. No content rule or export note exists | `src/content/drones` list; `delivery.json:78`; `compliance-safety.md` section 6 | VERIFIED crafts; policy absence VERIFIED for paths searched |
| W10 | "Proof of Build" credential for drones is forgeable. The server replays a client-supplied `init` event that includes `smokeOk`, `motorOk`, `accOk`. A safety credential that can be forged teaches nothing about safety and could mislead an employer or school | `SECURITY_BASELINE.md` S1; `src/lib/verify/drone-safety.ts:21-33` | VERIFIED by reading; exploit not run |
| W11 | Race lap times are client-claimed even though a deterministic replay exists and could verify them | `flight.md` defect 2 | VERIFIED |
| W12 | `sim.ts` is a 1,028-line module with physics classes as branches inside one step function. Adding a second airframe class means editing a god function | `flight.md` debt table | VERIFIED |
| W13 | Rendering is SVG `innerHTML` rebuilt per frame in an unsandboxed same-origin iframe. Fine for a stylised chase view; it will not carry user-built robots with arbitrary geometry | `flight.md` security and debt | VERIFIED; sandbox absence VERIFIED by grep in the audit |
| W14 | The 342-row calculator test and the 445-test headline overstate calculator coverage. Calculator-only tests are 384, 342 of them golden rows | `drone-calc-lab.md` defect 1 | VERIFIED |

## 5. Opportunities

1. **Power-and-wiring correctness for robots and drones is iynk's real edge.** The competitor dossiers find nobody joining robot or drone simulation to electronics, faults and a bill of materials. [EXTERNAL: `competitors/robotics.md` summary; `competitors/drone.md` summary; both HYPOTHESIS about absence, not exhaustive.] The audit confirms iynk already names 16 board/bench faults with explanations where Wokwi and Falstad showed none. [VERIFIED/TESTED: `TECHNICAL_RESEARCH.md` F11, `WORKFLOW_BENCHMARK.md`.] A robot or drone project that fails because the motor driver browns out the logic rail is the failure beginners actually meet.
2. **A calculator with stated error bars and user-entered parts is a gap even at modest fidelity.** eCalc is behind a login and fee (about $19 per year per a 2024 forum post, unconfirmed), with +/-15 percent accuracy. Users in the dossier see no obvious free alternative. [EXTERNAL: `competitors/drone.md` S6, S23.] A free tool that takes motor/prop/pack data from open sources and shows a confidence band could earn trust. HYPOTHESIS; test in section 9 (Q3).
3. **Small, light, sub-250 g builds fit the regulatory sweet spot and the audience.** EU open category and US rules favour light craft for learners. [EXTERNAL: `competitors/drone.md` summary, `compliance-safety.md` 5.4.] The whoop, cinewhoop and Crazyflie-class crafts are the safest place to put effort.
4. **Deterministic replay is a differentiator hiding in the code.** Replay is a true re-simulation and the module has no DOM dependency. That gives server-verifiable lap times, shareable "fly my design" links, and crash replays. It only needs a cross-browser determinism check (REVIEW_GAPS row 11).
5. **A 2D wheeled-robot sim is nearly free and teaches the right things.** Differential drive, motor lag, wheel slip as a single friction constant, ultrasonic/IR line sensors as rays against a 2D map. It maps directly onto the existing benches (L298N, TB6612, HC-SR04, QTR-8RC): the learner wires the real driver, the sim shows the robot. No physics engine needed (section 7).
6. **Export is cheaper than simulation.** Competitors with the best escape hatches (Wokwi project ZIP, MakeCode .hex) win trust. For robots and drones, the equivalent is a BOM with part numbers plus a wiring sheet plus, later, a URDF or an ArduPilot/Betaflight parameter file. A URDF export is cheap and lets students graduate to Gazebo or MuJoCo. [EXTERNAL: `competitors/robotics.md` community URDF tools; HYPOTHESIS on demand.]
7. **Education plan pattern exists.** Foxglove Academic $0 and CoppeliaSim's Edu/Pro split show a free-for-learners, paid-for-companies shape. [EXTERNAL: `competitors/robotics.md` S20, S14.] That is a business model question for others on the council; I only note it fits a robotics/drone product.

## 6. Answers to the red-team questions in my remit

The brief does not list numbered questions for me, so I answer the ones that sit in this seat.

**Q1. Do the Robotics and Drone labs have a credible, differentiated path, or should one or both be frozen as content?**
- Robotics: freeze as content now. Unfreeze one slice (2D wheeled robot, section 7) after the project file and parts model exist. Original robot assemblies are credible only as "chassis + motors + driver + MCU + sensors + battery with a power budget and a 2D world". Arms, legged robots and ROS 2 graphs are not credible near-term.
- Drone: freeze the 13 crafts as content. Unfreeze a "design check" slice (user-entered parts, honest error band) before any flight-model work. Flight fidelity is the last thing to build, not the first.
- Reason: both labs are catalogue-bound at the routing, content, figure and calculator layers (W2, W3). Putting engines under them before the builder exists spends the budget on the part that cannot carry a user project.

**Q2. What do the labs actually model, and is that honest?**
Robotics: electronics, not robots (W1). Drones: copy of another site's regression plus an arcade flight (W3, W5). Honest if labelled "teaching model, tuned to feel". Dishonest if sold as "design and predict". Add that label to the UI now (cost: hours).

**Q3. Is "design-to-flight" for drones feasible with what exists?**
Not for original designs. Needs: (a) a part database with measured thrust and current at several throttle points and a source and licence per row; (b) battery IR; (c) a single rigid-body model with inertia; (d) a rate-PID loop. The audit estimates 3 to 6 weeks for (a) and (b) plus 3 to 6 weeks for (c) and (d) as rewrites. [VERIFIED: `drone-calc-lab.md` refactor 1; `flight.md` refactor 3; effort figures are the auditors' estimates.] The unsolved part is data: open motor/prop thrust data of useful breadth with a clean licence is UNKNOWN to me. The UIUC propeller database and manufacturer datasheets are the obvious sources; I did not verify their licences or coverage. Cheapest test: pull 10 popular motor+prop combinations from manufacturer datasheets and check (HYPOTHESIS) that a data-driven static-thrust model lands within 15 percent of the datasheet at 3 throttle points.

**Q4. Which engine, and at what cost?**

| Need | Engine I would pick | Cost | Why not the others | Label |
|---|---|---|---|---|
| 2D wheeled robot, line follower, ultrasonic | Own ~300-line TypeScript integrator (unicycle kinematics, first-order motor, ray sensors) | ESTIMATED 1 to 2 weeks; zero hosting; no WASM | Rapier is overkill for 2D kinematics and adds an async WASM load | ESTIMATED: assumes 2D map from a plain data file, one robot, no stacking |
| 3D rigid bodies, collisions, pushing, ramps | Rapier (Apache-2.0, `@dimforge/rapier3d-compat` 0.21.0, deterministic if setup and order are identical) | `TECHNICAL_RESEARCH.md` estimates 2 to 4 person-weeks for a line follower and 4-wheel scene with snapshot hashing; spike RS-13 about 1 week | Jolt is a second option; Ammo.js has no reason to be picked | EXTERNAL [platform-options S44, S48, S49]; effort ESTIMATED by the researcher |
| Arms, contacts, grasping | Analytic FK/IK for 2 to 3 joints first; MuJoCo WASM later | MuJoCo WASM is Apache-2.0, 3.17.0, "still a WIP" in its README, hand-freed objects, Linux/Chrome is the main target; bundle size not measured | Defer until bindings mature and a real need exists | EXTERNAL [platform-options S50] |
| Multirotor rigid body | Own TypeScript 6-DoF model in a Web Worker | Audit: 3 to 6 weeks for the replacement; physics papers show 200 kHz native (EXTERNAL, Flightmare), so 1 kHz in a worker is ESTIMATED to be cheap | Real firmware adds server cost for no teaching gain yet | ESTIMATED from inference, untested |
| Real firmware in the loop | PX4 SIH (BSD-3-Clause), server-side, opt-in, later | Per-session cost UNKNOWN; spike RS-14b: pass if under 50 percent of one shared vCPU for 30 minutes | ArduPilot SITL and Betaflight SITL are GPL-3.0; embedding or linking makes the combined work GPL (legal advice needed); no WASM build for any of them was found | EXTERNAL [platform-options S55, S56, S77; drone.md summary] |

Cross-browser determinism caveat applies to every JS engine path: Rapier's own docs warn that `Math.sin` and `Math.cos` may differ across platforms. Any claim of verifiable replay needs the cross-engine test first.

**Q5. Is PX4/ArduPilot SITL worth it for a free browser product?**
No, not now. Reasons: no browser build exists (UNKNOWN beyond search), a server runner costs money per session and invites abuse on a free anonymous product, and the teaching value for a beginner is lower than power, wiring and tuning intuition. It is justified later only for a paid "real firmware" mode for colleges or advanced hobbyists. Trigger: at least N paying or pilot-committed institutions asking for MAVLink or ground-station labs (set N after the user research in `USER_RESEARCH_PLAN.md`; I would not set it below 3 named institutions).

**Q6. Is the TypeScript flight model good enough versus PX4 SIH?**
UNKNOWN. Spike RS-14 compares step response for 3 craft; pass is rise time and overshoot within 15 percent. Because the current model has no rate loop, I predict (HYPOTHESIS) it fails that test as built; the test is still worth running only after the rigid-body rewrite, not before.

**Q7. What are the minimum honest robotics creation features?**
1. A robot project file: chassis size and mass, wheels (diameter, spacing), two motors with a voltage/stall/no-load row from a datasheet, driver, MCU, battery, sensors with position and field of view. Plain-text, versioned, in the same file as the electronics builder.
2. Checks that do not need physics: voltage and stall current against the driver rating, logic level compatibility, battery capacity versus runtime estimate, brown-out of the logic rail under motor load.
3. A 2D world (walls, a line, a goal) and the 2D integrator: wheel speed to pose, motor lag, one friction constant, sensor rays.
4. Run the learner's code (existing interpreter) against that robot and show pose, sensor values, and which check failed. Replay from a log (same pattern as flight).
5. Export: BOM with part numbers and wiring sheet. URDF export later if a user asks.
6. Honest labels: "2D teaching model; wheel slip, backlash and battery sag are simplified."

**Q8. What are the minimum honest drone creation features?**
1. User-entered motor/prop/pack with required fields and bounds (finite, positive, sane range); typed errors, never NaN.
2. A data-driven static-thrust and current model with the source for each row, and a stated error band on every output.
3. Checks that already exist (ESC over-current, battery C-rate, hover throttle, short flight) plus generalised prop clash from frame geometry.
4. Existing arcade flight range for "fly it", labelled as a feel model, not a prediction. Do not offer "predicted flight time in the real world" without the band.
5. A BOM with real part numbers and a before-you-fly panel (section 6 safety).
6. Do not let a user-entered design run as a custom autopilot mission or payload drop without the autonomy rule below.

## 6a. Safety and dual-use: what is needed now

The numbers and rules come from `compliance-safety.md`; many pages were unreachable and are marked UNKNOWN there. Treat this as a minimum, to be reviewed by a person with domain or legal responsibility.

| Area | Needed now | Why | Source and label |
|---|---|---|---|
| LiPo | A short safety panel on every drone page that mentions a pack: balance charger only, never charge unattended, fireproof bag or container, storage near 3.8 V per cell, do not fly below about 3.5 V per cell, puffed pack means retire it, no damaged or uncertified packs. Mark as lab guidance, not certification | Wikipedia and a hobbyist source are the only sourced material; fire-service guidance was UNKNOWN. The quad5 battery part already carries the voltage figures | EXTERNAL (community) [compliance S36, S37]; HYPOTHESIS pending an NFPA or fire-service second source; VERIFIED that the panel does not exist |
| Propellers | "Props off" for bench work (already 72 mentions), eye protection, prop guards for the smallest crafts, never hand-catch. Add to a single panel, not scattered | Child injury data: 26 NEISS records 2010 to 2019, 58 percent head and face | EXTERNAL [compliance S38]; the practice itself HYPOTHESIS (unsourced) |
| Flying legally | "Before you fly for real" panel: TRUST (US), registration over 250 g, Remote ID, 400 ft or 120 m, visual line of sight, link to the official page per country. Say that the sim does not make anyone legal to fly | EASA and US statute pages are sourced; FAA pages returned 403 | EXTERNAL [compliance S42, S43, S44]; US details UNCONFIRMED |
| Age and supervision | State that under-age learners need the local rule and an adult for charging and flying | EASA minimum 16, States may lower to 12; toys none | EXTERNAL [compliance S44] |
| Mains | Never teach mains wiring or probing in any lab | No primary source for limits; stay in extra-low voltage | HYPOTHESIS [compliance 5.3] |
| Autonomy and dual-use | Content rule now: no payload release aimed at targets, no target tracking or pursuit, no weaponisation, hobby-scale range only, no encrypted-link design. Review the shipping crafts `swarm`, `delivery`, `agrihex`, `longrange`, `vtol` against it before a public launch push. Add an export note to the terms. One lawyer consult of 2 to 4 hours before any new autonomy feature | Public beginner content is "published" under 15 CFR 734.7 and outside the EAR; ITAR VIII(a)(5) flags UAVs specially designed for defense articles and range of 300 km or more; peer platform policies were not retrieved | EXTERNAL [compliance S45, S46]; reading is HYPOTHESIS, needs a lawyer |
| Terms | Publish terms of use and an acceptable-use policy; none found in `src/app` | The learner-facing claims are only as safe as the page that disclaims them | VERIFIED absence in the routes listed |
| Credentials | Do not display "Proof of Build" or "safety passed" as a real safety credential until the server issues the seed. Rename to "practice completion" | Forgeable log (W10) | VERIFIED |
| Calculator disclaimer | Every calculator output carries "estimate, not engineering sign-off" and, once measured, the error band | No disclaimer logic in `calc` today | VERIFIED |

Cost: ESTIMATED 2 to 4 days of copy and review for the panels (the compliance dossier's own figure for the legal panel is 2 to 4 days, safety copy 2 to 3 days), 1 day for the content rule and terms, 2 to 4 hours of legal time. Assumes English only; translation is extra and the product has i18n (VERIFIED `shell-i18n`).

## 7. What to build first (from this lens, with the reason)

Order matters. Items 1 to 3 do not depend on the electronics builder.

1. **Safety panel, "before you fly" panel, autonomy content rule, terms, "teaching model" labels, rename "Proof of Build".** Reason: they are cheap, they carry real harm and legal exposure, and they cost nothing in architecture. (Cost: about a week all in, ESTIMATED.)
2. **`calc` input guards and typed errors; remove NaN/Infinity paths.** Reason: becomes live the moment any user part exists; a 1 to 2 day fix (W4).
3. **Resolve calculator provenance.** Ask whoever owns the original site for permission or rewrite constants from datasheets. Reason: if the constants are not usable, everything built on `models.ts` is built on sand. Cheapest answer: one email and one lawyer question. UNKNOWN today.
4. **After the electronics builder has a project file: the robot project slice.** 2D wheeled robot, power and wiring checks, run learner code, replay, BOM export. Reason: it reuses the builder, the interpreter, the existing benches and the faults engine, and gives "original project" a robotics meaning. Cost: ESTIMATED 3 to 5 weeks for one engineer, assuming the project file and a generic parts renderer exist (they do not today; W2).
5. **Then the drone design check.** User-entered parts, data-driven thrust and current, battery IR, error band, BOM, safety panel. Keep the arcade flight range as the "fly it" step. Cost: audit 3 to 6 weeks for the part data and model replacement; assumes at least 10 parts with licensable data (UNKNOWN).
6. **Server-verified lap times from replay, after a cross-browser determinism check.** Reason: low cost, fixes W11, and doubles as the proof-of-concept for a verifiable credential. Gate on REVIEW_GAPS row 11 (run the 60,000-step scenario in Chromium, WebKit and Firefox).

## 8. What not to build yet (and the trigger that changes that)

| Do not build yet | Why | Trigger to reconsider |
|---|---|---|
| Rapier or MuJoCo integration | A 2D wheeled robot does not need it; arms are not near-term; MuJoCo WASM is marked WIP | Run spike RS-13 only when the project file exists and at least one user task needs 3D contact (pushing, ramps, stacking). MuJoCo: when its bindings leave WIP and 5 or more of the first 20 pilot users ask for arms |
| PX4 SIH or ArduPilot SITL runner | Server cost per session, abuse on a free anonymous site, GPL-3.0 for ArduPilot and Betaflight, no browser build | At least 3 named institutions committing to pilot a MAVLink/ground-station lab, plus the RS-14b result under 50 percent of a vCPU |
| Rigid-body rewrite of the flight model with PID | 3 to 6 weeks, serves FPV tuners who already buy $20 sims for stick feel | The drone design check ships and user research shows learners asking "why does my tune oscillate" more than "will it fly". Test: count that request type in feedback over a defined number of sessions |
| ROS 2 "compatible" claims or a real ROS 2 bridge | rclpy and DDS do not run in the browser; a server bridge has unknown cost; `pi5-ros2` today is power and terminal text | A robotics club or college pilot that needs real nodes. Until then simulate the graph in TypeScript and label it "ROS-like" (as `TECHNICAL_RESEARCH.md` D6 suggests) |
| More drone crafts or more robotics benches | 13 plus 13 is already more than the builder can reuse | The generic parts model exists and can express a new craft as data rather than a new 400-line figure file |
| Legged robots, arms, SLAM, Nav2 | No evidence of learner demand; competitors with desktop installs cover them | A paying segment emerges (robotics clubs, segment 5 scored 25 versus FPV 23 in `USER_SEGMENTS.md`, both HYPOTHESIS) |
| Swarm, payload-release or long-range autonomy as new features | Dual-use risk; the existing crafts need the content rule first | Content rule written, terms published, lawyer consult done |
| WebGL 3D renderer for flight | SVG is adequate for the stylised range; user-built crafts are not blocked by it | A user-built craft with geometry the SVG craft look cannot express |
| Ranked leaderboards with prizes | Times are client-claimed | Replay verification and cross-browser determinism both pass |

## 9. Risks

| Risk | Where | Consequence | Mitigation |
|---|---|---|---|
| Real-world harm from design advice (a fire, an injury, an illegal flight) | Drone lab | Reputational and legal; the product tells a minor how to build with LiPo and props | Section 6a; "teaching model" labels; no unreviewed autonomy |
| Presenting a copied model as engineering | Calculator | Users trust a number from a regression tuned to another site | Error band from measured data; disclaimer |
| Third-party provenance | Constants and lesson structure | Takedown, or inability to open-source | Rewrite from datasheets; ask the owner; lawyer |
| Scope creep into simulation fidelity | Council and founders | Months on PID and SITL for a segment that already has $20 sims | Build order in section 7; triggers in section 8 |
| Cross-engine non-determinism | Replay, verified laps, Rapier | Replays that diverge in Safari or Firefox; false cheating accusations | Run the 3-browser test first; fixed tolerance policy |
| Free browser robotics tools die | Category | Foxglove closed its open-source Studio; robotbenchmark.net now serves spam [EXTERNAL: robotics.md S22, S24, S29] | Plain-text, exportable project files so users keep their work |
| Overstating "robotics" | Marketing | Roboticists find no robot; credibility loss | Rename or reposition the lab now |
| Forged completion | Proof of Build | A school or employer sees a credential that anyone could forge | Rename now; server-issued seed later |
| Maintenance load of 26 figure/drone modules | Repo | Each craft is a custom figure plus content plus tests (drone prose, figures 5,070 lines) | Freeze; data-driven parts later |

## 10. Open questions and the cheapest way to answer each

| # | Question | Cheapest answer | Pass or decision criterion |
|---|---|---|---|
| Q1 | Do the calculator constants have a lawful source? | Email the owner of the original site; one lawyer question (2 hours) | Written permission, or a decision to rewrite from datasheets |
| Q2 | How wrong is the calculator versus hardware? | Pick 10 motor/prop/pack combos with manufacturer thrust tables; compare thrust and current at 3 throttle points to the calculator and to a simple data-driven model | Within 15 percent on thrust (eCalc's stated figure) for the data-driven model; report the calculator's real error whatever it is |
| Q3 | Will users value an error-banded free calculator over eCalc? | 5 interviews with FPV builders and 5 with teachers; show both outputs side by side (HYPOTHESIS, no interviews exist) | At least 6 of 10 say they would use it for a real purchase decision |
| Q4 | Does replay reproduce across Chrome, Safari, Firefox? | Run the existing 60,000-step scenario in Playwright for three engines and compare hashes | Identical hash; otherwise adopt a tolerance and say so |
| Q5 | Is Rapier worth its weight for 3D robot scenes? | Spike RS-13 (about 1 week) | Same snapshot hash on two browsers after 10,000 steps; step under 1 ms at 20 bodies; WASM within the agreed size budget |
| Q6 | Is a 2D robot enough for the first slice? | Build the 2D integrator against the L298N and HC-SR04 benches as a one-week prototype; give it to 5 learners | 4 of 5 complete a line-follower or wall-stop task without help |
| Q7 | What does one PX4 SIH session cost? | Spike RS-14b: run headless 30 minutes on shared-cpu-1x | Under 50 percent of one vCPU; otherwise recompute price per session |
| Q8 | Does the 15 percent step-response target hold against PX4 SIH after a rigid-body rewrite? | Spike RS-14 on 3 crafts, only after the rewrite | Rise time and overshoot within 15 percent |
| Q9 | Do the existing drone and robotics pages already carry safety text elsewhere? | `grep` the remaining prose and message files; read the five autonomy crafts' prose in full | List of every safety sentence by file; gaps become the panel's brief |
| Q10 | What is the legal reading of the autonomy crafts (swarm, delivery, agrihex, longrange)? | One lawyer consult of 2 to 4 hours with the craft descriptions in hand | Written note: keep, edit, or remove each |
| Q11 | Who actually wants robot or drone design, and at what price? | `USER_RESEARCH_PLAN.md` interviews. Add three questions: what did you buy last, what failed last, what would you pay for | UNKNOWN today; no demand figure may be invented |
| Q12 | Do open motor/prop data sources have usable licence and coverage? | Read the licence terms of the UIUC propeller database and 3 manufacturer data pages; list rows with source and licence | At least 10 motors and 10 props with redistributable data |
| Q13 | Is the CLI emulator (Betaflight/INAV settings) derived in a way that carries GPL-3.0 obligations? | Ask the lawyer; compare with the Betaflight source licence terms. Names and ranges are facts, but the question is open | Written opinion; if risky, rewrite from documentation |
