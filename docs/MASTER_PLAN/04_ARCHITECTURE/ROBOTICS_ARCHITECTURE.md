# Robotics architecture

Status: specification for the ROBOT build phase, written 2026-10-27 for BRIEF section 11 (and the parts of 19.3 and 20.3 it touches).
Author role: robotics architecture seat. ADR range used: ADR-0700 to ADR-0707 (the drone seat uses ADR-0710 to ADR-0716, see `DRONE_ARCHITECTURE.md`).

## 0. How to read this file

This file says how iynk builds, simulates and checks a robot: what a robot is in the project document, how its body, motors, power and sensors are modelled, how code controls it, how it navigates, how it talks to ROS 2 and URDF, which templates ship, and how each claim is tested. It is a specification. It names files, fields, units, limits and acceptance criteria. It does not plan around customers, markets, pricing or classrooms (D-013).

Labels: VERIFIED (read in code, or run by me in a script kept in the repository, with the file named; prototypes carry the extra label of section 0), DOCUMENTED (a repo or spike document states it), EXTERNAL (an outside source states it, or I recall it and have not re-fetched it; those are marked "recalled"), ESTIMATED (calculation or judgement, assumptions shown), HYPOTHESIS (a test is named), UNKNOWN (not found or not tested). "PENDING RS-xx" means a choice waits for a spike with no verdict.

Upstream:

| Source | Path | Used for |
|---|---|---|
| Assignment | `docs/MASTER_PLAN/BRIEF.md` section 11 (11.1 technical requirements, 11.2 templates), 3.5 (preserve working code) | scope |
| Decisions | `00_EXECUTIVE/DECISION_REGISTER.md`: D-007, D-010, D-011, D-013 to D-017 | binding constraints |
| Contracts | `PROJECT_DATA_MODEL.md` (sections 3, 4, 5.8, 5.11, 5.14, 7, 12.2), `schemas/project.schema.json`, `COMPONENT_SCHEMA.md` (4.6, 4.7, 4.10, 10), `SIMULATION_ARCHITECTURE.md` (5.4 to 5.6, 6, 10, 12, 13, 17) | names, fields, clock, phases |
| Audit | `01_AUDIT/inventory/boardlab-robotics-ui.md`, `figure-engine.md`, `interp.md`; `TECHNICAL_DEBT.md` A2, A12 | what exists |
| Research | `02_RESEARCH/TECHNICAL_RESEARCH.md` D6 and spike table; `tech/platform-options.md` (physics, ROS rows); council `robotics-aero.md` (background) | options |
| Spike | `08_RESEARCH_SPIKES/RS-13-physics-determinism/REPORT.md` (PASS on determinism and speed, size undecided); `08_RESEARCH_SPIKES/DP-01-robot-prototypes/` (my prototypes, section 0) | engine choice, equations |
| Product | `03_PRODUCT/FEATURE_CATALOGUE.md` F-057 to F-062, F-209, F-213 to F-215; `PRODUCT_REQUIREMENTS.md` R-145, R-146, R-164 to R-171, BUD-13, BUD-14, DET-2; `FEATURE_PRIORITIZATION.md` classes | ids |

Downstream:

| Kind | Ids |
|---|---|
| ADRs | ADR-0700 to ADR-0707 (section 1) |
| Features | F-057, F-058, F-059, F-060, F-061, F-062, F-209, F-213, F-214, F-215, F-186 |
| Requirements | R-145, R-146, R-164 to R-171, BUD-13, BUD-14, DET-2 |
| Journeys | J-03 (start an original project, here: a robot), J-04 (add and wire components), J-05 (write and run code), J-06 (meet a simulated fault), J-09 (two buddies editing), J-11 (import, here: URDF), J-12 (export a physical build) |
| Acceptance ids | RA-01 to RA-28 (section 19) |

Evidence from my own runs. The scripts and their raw outputs are in the repository at `docs/MASTER_PLAN/08_RESEARCH_SPIKES/DP-01-robot-prototypes/` (`src/` for the scripts, `results/` for the raw output of the re-run on 2026-10-27, `README.md` for how to rerun). Node 24.8.0, Apple M4 Pro (arm64), one machine, Rapier `@dimforge/rapier3d-deterministic-compat` 0.21.0 (pinned in that folder's `package.json`; the scripts import it by package name). They are prototypes of the equations in this file, not checks against hardware.

Label for every row below: **VERIFIED as a prototype, author-run, not independently checked.** The numbers were first produced in a scratch folder and then reproduced by running the copied scripts once more from the repository copy (same author, same machine); that shows the copy is faithful, not that the result is right. An independent check is appended to the folder's README when one exists, and the label then changes.

| Script (repo path under `DP-01-robot-prototypes/`) | What it ran | Result |
|---|---|---|
| `src/dbg.mjs` -> `results/dbg.txt` | A free cylinder wheel (0.157 kg, radius 0.05 m) given 0.01 N·m for 240 steps at 1/240 s, three ways | `addTorque` called every step gives 188.496 rad/s, which is 3.70 times the analytic 50.93, because Rapier keeps the torque until it is reset. `resetTorques` then `addTorque`, or `applyTorqueImpulse(tau * dt)`, give 50.929 rad/s (error 0.002 percent) |
| `src/sa16.mjs` test A -> `results/sa16.txt` | Same wheel, at length scale 1 and 10 | error -0.0002 percent and +0.0012 percent |
| `src/sa16.mjs` test B -> `results/sa16.txt` | Four-wheel robot (0.5 kg chassis, four 0.05 kg wheels of radius 0.05 m, motor joints with a 0.5 N·m cap, wheel speed 8 rad/s for 10 s). This scene is a **test fixture** (RA-03), not a template (section 15) | Ideal travel 4.000 m; got 3.986 m at scale 1 (lateral drift 0.5 mm, yaw -0.03 degrees) and 3.986 m at scale 10 (lateral 7.9 mm, yaw 0.07 degrees). Chassis settled 0.2 mm below the axle line. The engine defaults were stable at centimetre scale with no tuning |
| `src/order.mjs` -> `results/order.txt` | The same scene and 3 loose boxes; wheels created in four different orders; sleeping on and off | Same order twice: identical hash (`7d69007455180dea`). Order 0123, 3210 and 1302: three different hashes and chassis z of -2.5229, -2.5128 and -2.5225 m after the robot pushed the boxes. Sleeping on: a different hash again. So creation order and the sleeping flag are part of the result |
| `src/motor.mjs`, `src/motor2.mjs` -> `results/motor.txt`, `results/motor2.txt` | A small DC motor (R 2.5 ohm, L 1.2 mH, ke = kt 0.012, tau_m 104 ms) driven by PWM at 490 Hz, compared with a 5 microsecond reference | With a freewheeling-diode (coast) off state, the duty-averaged-voltage model is 13 to 39 percent low in speed at 25 to 75 percent duty. A closed-form solution per PWM cycle is within 0.14 to 0.52 percent, at about 100 ns per cycle (98 ns in the first run, 109 ns in the re-run: machine noise). With a slow-decay (brake) off state the duty-averaged model is within 0.3 percent |
| `src/split-build.mjs`, `src/run-split-hash.mjs` -> `results/split-build.json`, `results/split-hash-node.txt` | Derives the split Rapier artifact from the published npm files (section 16.1), measures its brotli size, and runs the RS-13 scene on it in Node | wasm sha256 `4e9890fd...7551` (identical to the RS-13 wasm); wrapper plus glue 32,984 B brotli; total 888,151 B; RS-13 scene final hash `c6a8e92d6174bd66`, equal to RS-13's compat result. Node only; browsers are RA-01 |

The drone scripts `quad.mjs` and `prop.mjs` are in the same folder (`results/quad.txt`, `results/prop.txt`) and are cited by `DRONE_ARCHITECTURE.md`. Re-run values: `quad.mjs` 1.99 microseconds per step (1.92 in the first run), hover command 0.3645, rise 85 ms, overshoot 26.4 percent; `prop.mjs` rpm, thrust and current as quoted there; torque residual -1.1e-15 N·m (the drone document quotes 6e-16 in one place and 1e-15 in another; all are rounding level).

## 1. Summary of decisions

| ADR | Decision | Evidence | Status |
|---|---|---|---|
| ADR-0700 | Robot physics runs on one engine, Rapier (deterministic build) in the SimWorker, behind the `PhysicsBackend` interface of ADR-0308, for planar and 3D robots alike. No separate 2D engine. Jolt stays the named fallback. A `length_scale` setting and a pinned parameter set are part of the replay record. Scenes are built in canonical id order and with sleeping off. | RS-13 PASS; `order.mjs` (creation order changes the hash); `sa16.mjs` (stable at centimetre scale) | Decided; artifact recipe in 16.1, shipped-artifact hash test RA-01, size test RA-27 |
| ADR-0701 | A robot is a normal Studio project. Its body is `mechanical` (frames, bodies, joints, mounts); everything physical that `mechanical` cannot hold lives in `domains.robotics.data` (schema in section 4). Part physics comes from part descriptors, not from the robot. | PROJECT_DATA_MODEL 5.8, 5.14; COMPONENT_SCHEMA 10 | Decided; needs the contract changes of section 2 |
| ADR-0702 | Motors, gearboxes, servos, steppers and drivers are electrical elements coupled to joints through torque impulses. PWM is handled by a closed form per PWM cycle, not by duty-averaged voltage. | `motor2.mjs`; `dbg.mjs` | Decided |
| ADR-0703 | Robot sensors read the physics world through five query types (ray fan, surface sample, contact, joint, body rates), with seeded noise streams and stated sample periods. Each has a model id and tier. | SIM_ARCH 12.2 | Decided |
| ADR-0704 | Robot code runs on the board runtime in the SimWorker. The plant (motors, wheels, sensors) is stepped at 240 Hz; the step at P5 of `t` looks ahead to `t+h` and encoder edges are enqueued at their interpolated times in `(t, t+h]`, so the clock never goes backwards and interrupt code sees them at the right virtual time (9.2). Control timing is shown, not hidden. | SIM_ARCH 5.5, 6.2 | Decided |
| ADR-0705 | Transforms, odometry and navigation: a `tf` tree derived from the document, odometry from encoders with ground truth beside it, and a ladder N0 to N2 (reactive, waypoint, grid map plus A*). SLAM, AMCL and Nav2 are not planned. | council robotics-aero 7 and 8; BRIEF 11.1 last line | Decided |
| ADR-0706 | ROS 2: a native TypeScript graph on the simulation clock, labelled "ROS-like". URDF import and export are built for a stated subset. A real ROS 2 bridge is an optional helper program on the user's machine (rosbridge protocol), late in the phase. SDF is import-only and later. | TECHNICAL_RESEARCH D6; platform-options rosbridge row | Decided; bridge PENDING a user need |
| ADR-0707 | Templates are a ladder of seven robots, each finished (hash test, faults, checks, "what it models" panel) before the next starts. The 13 electronics benches stay and are reused as parts and stages. | BRIEF 11.2 "depth over shallow templates" | Decided |

## 2. Objections

The decisions are binding and this file follows them. These are places where evidence says a contract, a number or a rule needs a change. Each has a proposed fix; none blocks writing.

1. **`mechanical` cannot carry a robot.** Checked against `schemas/project.schema.json` (`Joint`, `Body`, `Shape`, VERIFIED by reading the schema):
   - Joint `limits` has `min`, `max`, `effort_n`, `velocity` with no units. A revolute joint needs degrees, N·m and deg/s; a prismatic joint needs mm, N and mm/s. The name `effort_n` is wrong for a revolute joint.
   - Joint `kind` has no `ball`, `planar` or `floating` (URDF has `planar` and `floating`), and no way to say a joint has damping or Coulomb friction.
   - A body has `mass_g` and one `shape`, but no inertia override, no centre-of-mass offset, no friction, no restitution and no separate collision shape.
   - Proposal: schema minor 1.1 adds `limits_unit` implied by kind (state it in the schema description: revolute and continuous use `_deg` meaning, `effort` is N·m; prismatic uses mm and N), renames `effort_n` to `effort` with a deprecation alias, and adds `Body.inertia_g_mm2` and `Body.com_mm`. Everything else (friction, restitution, damping, collider choice) stays in `domains.robotics.data` so the core schema does not grow (section 4.3). Until 1.1 exists, section 4 applies the rules by convention and the validator in section 4.5 enforces them.
2. **`domain.set` replaces the whole domain; two buddies cannot edit a robot together.** `PROJECT_DATA_MODEL.md` 7.2 lists `domain.set` as "replaces `domains.<domain>`". A robot's `domains.robotics.data` is a few KB to tens of KB. Two buddies changing different wheel friction values would race; the later op overwrites the earlier one (the rebase rule has no finer unit). Proposal: add `domain.patch {domain, patch}` (RFC 7396 merge patch, as `board.set` already does) in opSchema 1.1, and say `domain.set` is for import and migration only. The robotics editor uses only `domain.patch`.
3. **SIM_ARCH 5.6 and 10.4 coupling rule is incomplete for PWM.** The rule says: torque is `kt * i` held for the mechanical step; use the inductance-free motor when `L/R` is under two steps. My prototype (`motor2.mjs`, table in section 0) shows that when the off-state of the driver lets the current go to zero (coast), the average of a PWM voltage is not the voltage that drives the average current, and the duty-averaged model is 13 to 39 percent low at 25 to 75 percent duty in the example motor. The `L/R < 2 steps` test only prevents numerical instability; it does not say the result is right. Proposal: section 7.4 (per-PWM-cycle closed form, the driver descriptor names its decay mode). SIM_ARCH 10.4 should cite this file.
4. **RS-13's determinism result was measured on the single-file compat build, but the size budget only fits the split build.** The independent check in the RS-13 report says the single-file form "is the form actually tested for determinism" and that the size leg rests on a self-proposed budget (BUD-14, HYPOTHESIS). The compat build is 1.20 MB brotli; the split build is about 0.88 MB. The two contain the same engine, but "same" is not "tested". Proposal: RA-01 runs the hash scene against the exact artifact the app ships. Also the Rapier JS repository is archived and merged into `dimforge/rapier` (`platform-options.md` row 3, EXTERNAL), so ADR-0700 pins the version and records the WASM sha256 (risk RK-2). Update after the review of 2026-10-27: a check of the npm packages (16.1) found that the WASM bytes in the single-file compat package and in the unbundled `@dimforge/rapier3d-deterministic` package are identical (same sha256), that the split form can be derived from the published files by a short script, and that its total is 888,151 B brotli including the TypeScript wrapper. The split form reproduces RS-13's hash in Node. The browsers remain to be run (RA-01). RS-13's remark that the compat build was the only deterministic 3D *compat* build stays true; it does not say a non-compat deterministic package is absent.
5. **DET-2 and R-170 ask for "identical hashes" without saying which scene and which engine settings.** `order.mjs` shows that creation order and the sleeping flag change the hash. The hash is only meaningful for a stated scene build rule. ADR-0700 states the rule (canonical order, sleeping off, parameters in the replay record). R-170 should name RA-02 as its test.
6. **R-165 says "sleeping is allowed once it keeps the hash test green".** It will keep the hash test green (a sleeping run is deterministic too, it just has a different hash), but it changes results relative to a non-sleeping run, so a project would behave differently depending on a setting that is invisible to the person. Decision: sleeping is off in v1 and is a recorded `physics.sleeping` field if ever enabled.
7. **The council memo recommends a separate 2D integrator for the first robot.** That was sound when the project document and the engine budget were unknown. RS-13 and `sa16.mjs` now show one engine handles both a four-wheel and a two-wheel-plus-caster robot with defaults, at 0.07 to 0.09 ms per step for 20 bodies. One engine means one set of behaviours and one hash method. This file departs from the memo on that point (ADR-0700) and keeps its other advice (depth over breadth, power and wiring checks first, no arms before the line follower works).

## 3. What exists, and what happens to it

BRIEF 3.5: preserve working code until a replacement is measurably better. "Robotics Lab" today is 13 electronics benches. Nothing simulates rigid bodies (SIM_ARCH 10.1, council W1, VERIFIED by grep).

| Subsystem | Where | What it is | Disposition and reason |
|---|---|---|---|
| 13 bench contents (L298N, TB6612, A4988, PCA9685, HC-SR04, MPU6050, QTR-8RC, LM2596, transistor switch, LED+resistor, Uno build, ESP32-S3 build, Pi 5 ROS 2) | `src/content/robotics/*.ts` | 272 build steps, 106 faults, 31 tasks, quizzes (F-057, F-058) | **Preserve.** They move into Studio as project templates in the LABS phase (R-145). In the ROBOT phase they also become the staged parts of robot templates (section 15) |
| Bench store and effects | `src/lib/robotics/store.ts`, `steps.ts`, `runner.ts`; effects inside `src/components/robotics/BenchWorkspace.tsx:~128` | reducer plus side effects in a React component (audit A2, defect 2: a `send` is dropped while the figure is null) | **Replace** by project ops and the orchestrator in LABS (not this file's work). Nothing in the ROBOT phase depends on it |
| Motor element in the solver | `figures/engine/bench-solve.js:243-247` (`motorI`: steady-state conductance, `md.steady` or `V/ohms`) | a DC motor is a conductance; no speed, no inertia, no back-EMF | **Extend**: the new `MOTOR` element of SIM_ARCH 7.2 adds `ke`, `kt`, `J`, `b`; the old conductance stays as the T1 compatibility mode so the 106 faults and their numbers do not move |
| Servo and stepper rules | `bench-solve.js:121-123, 318-328` | servo angle from average pulse width; stepper as four coil currents | **Preserve** as the electrical side; **extend** with the servo position loop and stepper pull-out model of section 7 for the physics side |
| `current.ts` | `src/lib/robotics/current.ts` | current-draw sums per bench | **Preserve**; the new power checks (section 7.6) call the same sums through the solver, not a second copy |
| Raspberry Pi 5 ROS 2 bench | `src/content/robotics/pi5-ros2.ts`; Python modules `src/lib/interp/python/modules.ts:867-1000` (`installRos`, `rclpy` module, `onRos` callback at `src/lib/interp/run.ts:51`) | publishes messages only; no subscriptions, no timers, no graph | **Extend** into the native graph of section 11. Keep the label "ROS-like" until a bridge exists (R-146) |
| HC-SR04, MPU6050, QTR-8RC device models | `src/lib/interp` device code; SIM_ARCH 12.2 table | timing and register models with world knobs | **Preserve**; the world knob (a number) is replaced by a physics query (ray, surface sample, body rates) in section 8 |
| Flight and drone code | out of scope here | | see `DRONE_ARCHITECTURE.md` |
| Rapier, ROS, URDF code | none | VERIFIED by grep (council W1) | **New** |

## 4. The robot in the project document

### 4.1 Conventions

| Item | Rule | Source |
|---|---|---|
| World frame | right-handed, +x forward, +y left, +z up (REP-103) | PDM 5.8 |
| Pose | `{position_mm, rpy_deg}`, roll about x, pitch about y, yaw about z, fixed axes of the parent frame (URDF) | PDM 5.8 |
| Lengths, angles, mass | mm, degree, gram in the document; SI (m, rad, kg, N, N·m) at the engine boundary | PDM 4.1 |
| Engine units | metres times `length_scale` (1 by default; 10 is a recorded option) | ADR-0700 |
| Time | integer ns in the log, engine step 1/240 s = `{num: 25_000_000, den: 6}` ns | SIM_ARCH 5.4 |

The robot's own frame is the root body's frame. Convention for a wheeled robot: the root body is the chassis, its origin is the point on the ground plane under the middle of the drive axle (so odometry `x` is the distance the axle midpoint moved), +x is forward.

### 4.2 What goes where

| Data | Home | Why |
|---|---|---|
| Frames, bodies (mass, shape), joints (kind, axis, limits, drive), mounts (where a board or part sits) | `mechanical` (PDM 5.8) | already in the contract; 512 frames, 512 bodies, 512 joints, 2,000 mounts |
| Electrical connection of motors, drivers, sensors, boards | `nets` | one electrical truth (ADR-0101); a joint's `drive.component` names the motor component |
| Engine, step rate, gravity | `simulation.physics {engine, step_hz, options}` | PDM 5.11 |
| Everything physical that has no field above: friction, restitution, damping, inertia override (until schema 1.1), colliders, wheel data, surfaces, arena, sensor query setup, ROS names | `domains.robotics.data` (this section) | PDM 5.14: the robotics spec owns it |
| Part physics (motor constants, gear ratio, servo stall torque, sensor beam, encoder counts per revolution) | the part descriptor, `mechanics` block (COMPONENT_SCHEMA 10, proposed in section 6.1) | one source for the part, many robots |

### 4.3 `domains.robotics.data` (schemaVersion "1.0")

```ts
export interface RoboticsData {
  physics: {
    length_scale: 1 | 10;               // engine units per metre; 1 unless RA-03 says otherwise
    gravity_mps2: [number, number, number];   // default [0, 0, -9.81]
    sleeping: false;                    // fixed in v1 (Objection 6)
    ccd: 'off' | 'auto';                // 'auto' turns CCD on for bodies flagged fast (4.4)
    params: { solver_iterations: number; }    // copied from the engine at project creation, then pinned
  };
  surfaces: Surface[];                  // up to 32
  bodies: Record<BodyId, BodyPhysics>;  // keys are mechanical.bodies[].id
  joints: Record<JointId, JointPhysics>;
  wheels: Record<JointId, WheelSpec>;   // only for joints of kind 'wheel'
  sensors: SensorBinding[];             // up to 64
  arena: Arena;                         // static world
  ros?: RosConfig;                      // section 11
}
export interface Surface { id: string; name: string; mu: number; crr: number; reflectance: number }   // mu 0..3, crr (rolling resistance coefficient) 0..0.2, reflectance 0..1
export interface BodyPhysics {
  collider: 'from-shape' | { kind: 'box'|'cylinder'|'sphere'|'convex'; size_mm?: number[]; points_mm?: number[][] };  // convex: up to 256 points
  friction: number;                     // 0..3
  restitution: number;                  // 0..1, default 0
  damping_lin: number; damping_ang: number;   // 1/s, default 0
  fast: boolean;                        // asks for CCD when ccd = 'auto'
  noCollideWith?: BodyId[];             // for parts that overlap by design (a wheel and its fender)
}
export interface JointPhysics { damping: number; friction_nm: number }   // viscous N·m·s/rad, Coulomb N·m
export interface WheelSpec { radius_mm: number; width_mm: number; surface_mu: number; crr: number }
export interface Arena {
  floor: { surface: string; size_mm: [number, number] };
  tracks: Track[];                      // lines painted on the floor, up to 64
  statics: StaticBox[];                 // walls, ramps (boxes with a tilt), up to 256
  start: { x_mm: number; y_mm: number; yaw_deg: number };
}
export interface Track { id: string; points_mm: [number, number][]; width_mm: number; reflectance: number; closed: boolean }  // 2..512 points
export interface StaticBox { id: string; pose: Pose; size_mm: [number, number, number]; surface: string }
export interface SensorBinding {
  id: string;                           // local id
  component: string;                    // cmp_ id of the sensor part
  mount: string;                        // mnt_ id: where it is on the robot
  query: 'ray-fan' | 'surface-sample' | 'contact' | 'joint' | 'body-rates';
  params?: Record<string, number>;      // overrides of the descriptor values, each with a visible "changed" mark
}
```

Rules (checked by the validator in 4.5): ids in `bodies`, `joints` and `wheels` exist in `mechanical`; `mu`, `crr` and `reflectance` are within range; every `surface` is defined; every `SensorBinding.mount` exists and its component is a sensor with the matching channel; no number is NaN or infinite (a number out of range is an error with the path, never a clamp).

Why not put these in `mechanical`: the core document would grow robot-only fields that a drone or an electronics-only project never uses (PDM 2.2 keeps the core small). Why not a second file: one document, one hash, one op log (ADR-0100).

### 4.4 Building the physics scene from the document

The scene builder is a pure function `buildScene(doc, deps): SceneSpec` (the `SceneSpec` of SIM_ARCH 10.2). Rules:

1. **Order.** Bodies, colliders and joints are created in canonical order: bodies sorted by id, then each body's colliders, then joints sorted by id. `order.mjs` showed that a different creation order gives a different hash and a position difference of 10 mm after contact (VERIFIED). The sort uses code-unit order (PDM 6.2).
2. **Mass.** Body mass is `mass_g / 1000` kg. If a body has a `component` and no `mass_g`, the mass is the part's mass. A body with mass 0, or a non-fixed joint child with no mass, is an error `RB-E-MASS`. Colliders get density 0 and mass properties are set on the body, so a collider is never counted twice. (RS-13 used density; the builder sets mass explicitly because the document stores mass, not density.)
3. **Inertia.** From the `Body.inertia_g_mm2` override if present; otherwise from the shape and mass: box `m(b²+c²)/12` per axis, cylinder about its axis `m r²/2` and across `m(3r²+h²)/12`, sphere `2mr²/5`. For a mesh body: the inertia of its axis-aligned bounding box, with a warning `RB-W-INERTIA-BOX`. Inertia must satisfy the triangle inequality (`Ixx + Iyy >= Izz`, cyclic) or the error is `RB-E-INERTIA`.
4. **Colliders.** `from-shape` maps box, cylinder and sphere directly. A mesh body is visual only unless it is static (then a triangle mesh, up to 20,000 triangles) or has a `convex` collider (up to 256 points). Dynamic trimesh is refused. Minimum collider dimension is 5 mm (error `RB-E-THIN`; below that the engine behaviour is unreliable and the tunnel limit of 4.4 gets silly).
5. **Joints.** `fixed`, `revolute`, `prismatic` map to the engine's joints with limits converted to rad or m. `continuous` is `revolute` without limits. `wheel` is a `revolute` joint with a cylinder collider carrying the wheel's `surface_mu` and a velocity or torque drive (section 7). Damping and Coulomb friction (`JointPhysics`) are applied by the same torque path as motors, as a resisting torque `-b w - c sign(w)` (smoothed to a zero crossing band of 0.01 rad/s so it does not chatter).
6. **Contact rules are pinned, not left to defaults.** Friction combine rule `Average` and restitution combine rule `Average` are set explicitly and recorded in the replay record, with the solver iteration count. The caster ball uses friction 0 with combine rule `Min`, as RS-13's scene did. The effective friction between a wheel (mu_w) and a surface (mu_s) is therefore `(mu_w + mu_s) / 2` and the UI says so wherever it shows a coefficient (EXTERNAL, recalled: that is Rapier's default; RA-04 reads the setting back from the engine to confirm).
7. **Tunnelling.** At step rate `f` a body of smallest dimension `t` can be passed through a static obstacle of thickness `t_w` if it travels more than about half the thinner of the two per step. Rule: the validator warns `RB-W-TUNNEL` when `v_max * (1/f) > 0.5 * min(t, t_w)`, with `v_max` taken from the robot's top speed (section 7.6 computes it). Example: a 10 mm wall at 240 Hz tolerates 0.5 * 0.010 * 240 = 1.2 m/s (arithmetic, not measured). `fast: true` bodies get CCD when `ccd = 'auto'`; its cost is UNKNOWN and is measured in RA-07.
8. **Scale.** If `length_scale = 10`, lengths are multiplied by 10, gravity by 10, density is not used, torque limits by 100 and linear stiffness terms by the same factors, all inside the adapter. The adapter is the only place that knows the scale; the document and every reading stay in mm and SI. `sa16.mjs` shows scale 1 behaves well (lateral drift 0.5 mm in 4 m), so scale 10 is an option for a failure found later, not the default.

### 4.5 Validation (robot rules, added to the V3 list of PDM 9.2)

| Id | Rule | Severity |
|---|---|---|
| RB-E-TREE | `mechanical` joints form a tree over bodies with exactly one root body per robot (a body that is not a joint child) | error |
| RB-E-MASS | every dynamic body has mass above 0 | error |
| RB-E-INERTIA | inertia positive and satisfying the triangle inequality | error |
| RB-E-THIN | every collider dimension is at least 5 mm | error |
| RB-E-AXIS | joint axis is non-zero; it is normalised at load and the normalised value is shown | error |
| RB-E-LIMITS | revolute and prismatic `min < max`; a limit of 360 degrees or more on a revolute joint is `continuous` | error |
| RB-E-DRIVE | `drive.component` exists and has a part descriptor with a `mechanics.motor`, `mechanics.servo` or `mechanics.stepper` block | error |
| RB-E-WHEEL | `wheel` joint has a `WheelSpec`; axis is horizontal in the rest pose within 1 degree | error |
| RB-E-SURFACE | all `surface` references resolve | error |
| RB-W-TUNNEL | see 4.4 rule 7 | warning |
| RB-W-INERTIA-BOX | mesh body inertia from its bounding box | warning |
| RB-W-ASPECT | a body whose longest dimension is more than 50 times the shortest (unstable contact) | warning |
| RB-W-MASSRATIO | mass ratio across a joint above 100 (solver conditioning; the threshold is a HYPOTHESIS, RA-07 measures where stability ends) | warning |
| RB-W-CG | centre of mass above the support polygon centroid by more than the polygon's half-width (likely to tip) | warning |

Limits (defaults, same style as PDM 9.4): 64 dynamic bodies, 128 colliders, 32 joints, 64 sensors, 256 static boxes per project in v1. These are HYPOTHESIS limits chosen from the RS-13 scene (20 bodies, 6 joints); RA-07 measures 64 bodies at 6x throttle and writes the real limit.

## 5. Kinematics

### 5.1 Forward kinematics

The tree is evaluated parent to child. For joint `j` with origin pose `T_o`, axis `a` and joint value `q`:

`T_child = T_parent * T_o * J(q)`, where `J(q)` is a rotation of `q` about `a` (revolute, continuous, wheel) or a translation of `q` along `a` (prismatic). Rotations use quaternions in the engine and the `rpy_deg` form in the document; the conversion is the standard fixed-axis one and is tested by round trip to 1e-9. FK is used by the renderer, the `tf` tree (section 10), URDF export and the arm tools. In the physics world FK is not computed by iynk: the engine integrates the bodies and joints; FK is a check and a display path.

### 5.2 Inverse kinematics (arm templates only)

Scope matches the template ladder: planar 2-link and 3-link arms and a pan-tilt head. Not general 6-DoF manipulators in v1.

| Method | Use | Spec |
|---|---|---|
| Analytic 2-link | the simple arm template | law of cosines: `c2 = (x² + y² - l1² - l2²) / (2 l1 l2)`; reachable when `|c2| <= 1`; two solutions (elbow up, elbow down) returned in a fixed order; unreachable targets return `{reachable: false, nearest}` with the straight-line configuration, never NaN |
| Damped least squares | 3 to 6 joints | `dq = J^T (J J^T + lambda² I)^-1 e` with `lambda = 0.05` (default), at most 50 iterations, tolerance 0.5 mm and 0.5 degree; returns `converged: boolean` and the residual. Joint limits by clamping and re-solving |

Both are pure functions in a `robotics/kinematics` module with golden tests (FK then IK recovers the pose for 1,000 seeded random configurations within tolerance; singular configurations (arm fully stretched) return `converged: false` or the nearest solution, never a NaN). They run in the sim worker when the controller needs them, and in the editor to preview a pose. The arm's torque check (6.3) uses the Jacobian transpose. Legged robots, whole-body control, grasping and contact-rich manipulation are not planned (F-061 "arms and legged robots" is a research row; this file delivers the arm in the planar form only).

## 6. Dynamics

### 6.1 Part data the physics needs (proposal to COMPONENT_SCHEMA section 10)

COMPONENT_SCHEMA 10 says a `mechanics` block comes "in a later minor of schema 1 once RS-13 and RS-14 fix the model forms". RS-13 has passed. The robot-side block, with units named by the field name (base units, per PDM 4.1):

```ts
export interface MechanicsBlock {
  motor?: {                              // brushed DC; brushless is a drone part (DRONE_ARCHITECTURE 6.1)
    r_ohm: number; l_henry: number;      // armature
    ke_vs_per_rad: number;               // back-EMF constant; kt = ke in SI, stored once
    j_kgm2: number; b_nms_per_rad: number;  // rotor inertia, viscous friction
    i_noload_a: number;                  // no-load current (optional; 0 if absent)
    gear?: { ratio: number; efficiency: number; backlash_deg?: number; j_out_kgm2?: number };
    v_nominal: number; i_stall_a?: number; torque_stall_nm?: number;  // rated, used for checks and cross-checks
    rated: { source: string };           // every number has a source in the ratings sense of COMPONENT_SCHEMA 4.6
  };
  servo?: { stall_torque_nm: number; speed_s_per_60deg: number; pulse_min_us: number; pulse_max_us: number; angle_range_deg: number; deadband_us: number; i_stall_a: number; i_idle_a: number };
  stepper?: { steps_per_rev: number; holding_torque_nm: number; r_ohm: number; l_henry: number; i_rated_a: number; pullout: { rpm: number; torque_nm: number }[] };
  driver?: { kind: 'h-bridge'|'half-bridge'|'step-dir'|'pwm-servo'; decay: 'slow'|'fast'|'coast'; vdrop_v: number; i_max_a: number; pwm_max_hz: number };
  encoder?: { counts_per_rev: number; channels: 'a'|'ab'; index: boolean };
  mass_g?: number;
}
```

Every number follows the three-slot rating rule (maker-stated, iynk assumption, bench-measured; COMPONENT_SCHEMA 4.6). Where only a datasheet "stall torque and no-load speed" exists, the loader derives `ke`, `r` and `b` from four numbers (`V`, no-load speed, no-load current, stall current or stall torque) with the standard relations (`ke = (V - R*i0) / w0`, `R = V / i_stall`) and marks them `derived_from`. Most hobby motors list those four numbers; few list `L`. When `L` is missing the loader sets `L = 0` and marks the motor "inductance not given", which selects the algebraic armature of 7.4 for it (the result is then right for continuous-conduction drive and a stated approximation for chopped drive in the coast mode).

### 6.2 Rigid-body dynamics in the engine

Rapier integrates bodies with a fixed step (symplectic Euler with an iterative contact solver, SIM_ARCH 6.3, EXTERNAL for the engine's internals). iynk does not reimplement it. What iynk owns:

| Item | Spec |
|---|---|
| Step | 1/240 s, one sub-step, `world.timestep = 1/240`; allowed 1/60 to 1/1000 (SIM_ARCH 6.2). The step rate is a project setting `simulation.physics.step_hz` and part of the replay record |
| Forces from iynk | joint motor torques as `applyTorqueImpulse(tau * dt)` on the child and `-tau * dt` on the parent (`dbg.mjs`: 0.002 percent error; `addTorque` accumulates across steps and is banned in this code, lint rule RA-05) |
| Reading | `body(id)` returns position, rotation, linear and angular velocity; `joint(id)` returns angle, speed and the torque iynk applied; `contacts()` returns the pair list |
| Hash | the RS-13 method (float32 bit patterns of every body's position and rotation, folded to 16 hex digits) extended in the document's hash to velocity and joint angle, which RS-13 did not cover. The extended form is `hash2`; `hash` stays available to compare with RS-13 |
| Snapshot | `world.takeSnapshot()` exists in the engine (EXTERNAL, not exercised by RS-13 or by my scripts). Until RA-08 shows snapshot then restore equals continuing, restore means "replay from the nearest keyframe" (SIM_ARCH 6.7) |
| Floating point | the engine's WASM has fixed float semantics except NaN bit patterns (RS-13). The iynk code around it uses `dmath` for `sin`, `cos`, `atan2`, `exp` if ADR-0303 adopts it; until then those calls are class N |

### 6.3 Torque and power checks (the "robot checker", F-213)

These checks need no simulation run. They compute from the document and name the limiting part. All formulas are SI.

| Id | Question | Formula |
|---|---|---|
| RB-C-01 | Can the drive train move the robot on the stated slope? | per driven wheel torque needed `tau_w = (m g (sin(theta) + crr cos(theta)) r) / n_driven`. Available at the wheel `tau_a = tau_motor_stall_at_V * gear * eta`. Pass when `tau_a >= tau_w * 1.5` (the 1.5 margin is a default, editable, labelled "iynk's margin") |
| RB-C-02 | Top speed | `v_max = r * w_noload_V / gear` from the motor model at the supply minus driver drop (`vdrop_v`); under load use the intersection of the motor torque-speed line and the load line: `w = (V ke - R tau_load / kt)/(ke ...)` solved exactly for the linear motor (closed form, in code) |
| RB-C-03 | Acceleration | `a = (n_driven * tau_a_at_speed / r - crr m g) / (m + sum(J_w / r²))`, rotational inertia of wheels and gearbox included |
| RB-C-04 | Stall current against driver | `i_stall = V / R` per motor; sum for simultaneous stall (all driven motors) against `driver.i_max_a`, the battery's maximum continuous current and the wire/rail rating; the check names the part with the smallest margin. This is the check that finds "the L298N bridge is a 3 ohm, 0.6 A guess" gap (COMPONENT_SCHEMA 5): the bridge reads the attached motor instead |
| RB-C-05 | Logic rail brown-out | peak motor current times rail source resistance against the logic minimum voltage; it runs in the solver, not as a formula (cause `brownout`) |
| RB-C-06 | Runtime | battery energy `E = Ah * V_nominal * usable` against mean power in a stated duty profile; the profile is explicit (percent time at cruise, at stall, idle) and shown. Output is a range, from the battery model with sag, not one number |
| RB-C-07 | Tip-over | static: `atan(half_track / h_cg)` lateral and `atan(d_cg_to_axle / h_cg)` longitudinal against the slope and the acceleration (`a / g`); inputs are the body masses and positions, so the centre of mass is computed, not typed |
| RB-C-08 | Arm holding torque | for each joint `tau = sum_i (r_i x m_i g)` about the joint axis from the masses beyond it, against `stall_torque_nm` or `holding_torque_nm`; Jacobian-transpose for payload at the tip |
| RB-C-09 | Encoder resolution | `delta_s = 2 pi r / (counts_per_rev * gear)` per count, and the speed resolution at the loop period `delta_v = delta_s / T`. If `delta_v` is above 10 percent of the target speed the check warns that speed control will be noisy (the 10 percent is a default) |
| RB-C-10 | Sensor geometry | a line sensor's height and footprint against track width; a ranger's minimum range against the nearest part of the robot in its beam |

Each check returns `{id, result: 'ok'|'warn'|'fail', value, limit, limitingPart, formula, assumptions}`. The `limitingPart` is a component id. Each failure maps to the shared record `{cause_id, symptom_id, evidence, hint_level}` (D-010) using the cause ids in section 13.

Worked example (illustrative numbers, UNSOURCED, from the `motor.mjs` motor): 0.7 kg robot, wheel radius 0.03 m, two driven wheels, motor `ke = kt = 0.012`, `R = 2.5 ohm`, 6 V, gear 1:30, efficiency 0.7. Stall torque at the motor `kt V / R = 0.012 * 6 / 2.5 = 0.0288 N·m`, at the wheel `0.0288 * 30 * 0.7 = 0.605 N·m`. Slope 10 degrees, crr 0.02: `tau_w = 0.7 * 9.81 * (0.1736 + 0.0197) * 0.03 / 2 = 0.0199 N·m` per wheel. Margin `0.605 / 0.0199 = 30`. This is arithmetic on assumed numbers; the point is the shape of the output, not the motor.

## 7. Actuators and power

### 7.1 Brushed DC motor with gearbox

State per motor: armature current `i`, motor shaft speed `w_m`. Equations (SI):

```
L di/dt = v - R i - ke w_m          armature
tau_m  = kt (i - i0 sign(w_m))      shaft torque (kt = ke)
J_m dw_m/dt = tau_m - b w_m - tau_load_m
tau_out = gear * eta * tau_m        at the output shaft (efficiency applied in the direction of power flow)
w_out  = w_m / gear
```

The load seen by the engine is the joint. The motor is a node in the electrical netlist (the `MOTOR` element of SIM_ARCH 7.2); its rotor inertia `J_m` reflects to the output as `J_m * gear²` and is added to the joint's child body as part of the wheel's inertia about its axis (done by the scene builder, so the engine sees one consistent inertia).

Efficiency in direction: when the load drives the motor (back-driving), `tau_m = tau_out / (gear * eta)` instead; the sign of power flow selects the form (this is why a worm gear can hold position and a spur gear cannot: modelled only by the `backdrivable: boolean` flag in `gear`, default true; HYPOTHESIS that the flag is enough for the templates).

### 7.2 Coupling with the engine (one mechanical step)

At phase P5 (SIM_ARCH 5.5): read joint speed `w_out` from the last step; compute the cycle-averaged current for the step from the electrical state; apply `tau_out` as torque impulses; step the engine. At P3 of the next timestamp the solver uses `ke * w_m` as the back-EMF source. Maximum lag between the two domains is one mechanical step (4.17 ms), as SIM_ARCH 10.4 says. The stability argument: explicit coupling with lag `h` is stable for the mechanical subsystem when `h * c < 2` where `c = (kt ke / R + b) / J` is the inverse of the electromechanical time constant. For the example motor `c = 9.6 s^-1` (tau_m = 104 ms), so `h * c = 0.04` (VERIFIED arithmetic in `motor.mjs`). The loader computes `h * c` for every motor and fails with `RB-E-COUPLING` when it exceeds 1 (a tiny-inertia motor such as a micro gearmotor with no load can reach this), telling the author to lower the step or add inertia.

### 7.3 Gearbox

`gear.ratio` and `efficiency` as above. Backlash is not modelled in v1 (listed in the "not modelled yet" set); `backlash_deg` is accepted, shown as "not modelled yet", and ignored. Planetary and spur trains are one ratio. Compliance and gear friction nonlinearity are the joint's `friction_nm` and `damping` by hand.

### 7.4 PWM and the driver: a closed form per PWM cycle (ADR-0702)

The MCU engine produces pin waveforms; the driver descriptor says how the pins turn into the motor terminal voltage and what the off-state does (`decay`). The mechanical step is 4.17 ms; a PWM period is 2.04 ms at 490 Hz and 1.02 ms at 980 Hz (the interpreter's `analogWrite` reports 490 Hz on most AVR pins and 980 Hz on pins 5 and 6, `src/lib/interp/arduino/libs.ts:288`, VERIFIED by reading; used here as examples). So there are 2 to 4 PWM cycles per step, and the motor's electrical time constant (0.48 ms in the example) is shorter than the period. The duty-averaged voltage is wrong in that regime (Objection 3).

Method. During one PWM cycle the speed changes little (mechanical time constant 104 ms in the example against a 2 ms cycle), so treat `w_m` as constant inside a cycle. The armature obeys a linear first-order equation with two segments:

- On-segment: `i(t) = Ia + (i0 - Ia) e^(-t/tau_e)`, with `Ia = (V - ke w_m) / R`, `tau_e = L / R`.
- Off-segment, slow decay (brake: terminals shorted through the bridge): same form with `Ib = -ke w_m / R`; current may reverse (this is regenerative braking).
- Off-segment, coast (diode-clamped, current cannot reverse): the same decay until `i = 0` at `t0 = tau_e ln((i1 - Ib) / (-Ib))`, then `i = 0` for the rest of the period.
- Fast decay: terminal voltage reversed (`-V`) in the off-segment, same closed form.

The cycle-average current is the integral of these exponentials divided by the period, in closed form. The speed then advances over the cycle by `dw = P (kt i_avg - b w) / J`. One cycle costs about 100 ns in the prototype (`motor2.mjs`, Node, one machine; 98 ns and 109 ns in two runs; 490 Hz gives about 50 microseconds of CPU per simulated second per motor). Results in the prototype: within 0.14 to 0.52 percent of a 5 microsecond reference in both slow-decay and coast modes (VERIFIED prototype, illustrative motor), where the duty-averaged model is 13 to 39 percent low in coast mode.

Rules:
1. The motor element receives the pin waveform in whichever form its engine produces. The interpreter does not produce edges: it keeps a duty and a frequency per pin (`pwmHz`, `duty` in `src/lib/interp/world.ts:17, 298-316`, VERIFIED by reading), which is exactly a periodic waveform, so the closed form runs directly on `(duty, hz)`. avr8js produces real pin edges (RS-03), which the element groups into whole PWM cycles when they repeat and integrates piecewise otherwise.
2. When the waveform is DC (no edges in a step) the element uses the algebraic armature: `i = (V - ke w) / R`. That is also the limit used when `L` is unknown.
3. The driver's `vdrop_v` (bridge saturation) is subtracted from the supply in the on-segment. The driver's `i_max_a` is a limit: above it the failure model `failure:driver-overcurrent` fires (thermal shutdown is `not-modelled-yet` until F-219).
4. Which decay mode a real module has depends on how it is driven (enable-pin PWM versus input-pin PWM on an L298N, for example). The descriptor gives the default for the usual wiring and the editor shows "off-state: coast (assumed, source: ...)". Whether the modules on the 13 benches behave this way is UNKNOWN until each is sourced (COMPONENT_SCHEMA 5 already marks the L298N model a guess).

### 7.5 Servo, stepper

**Hobby servo.** Input: pulse width. State: horn angle `phi`. The target angle is `phi* = clamp((pulse - pulse_min) / (pulse_max - pulse_min)) * angle_range`; a pulse inside `deadband_us` of the current command is ignored. Motion: rate limited by `speed_s_per_60deg` (`omega_max = 60 deg / speed`), torque limited by `stall_torque_nm`; the internal position loop is a saturated proportional law `tau = clamp(kp (phi* - phi), -stall, stall)` with `kp` chosen so a full-scale error saturates (the descriptor may give it; the default is `stall / 10 deg`, an iynk assumption). Current: `i_idle + (i_stall - i_idle) * |tau| / stall`. The servo joint is a `revolute` joint with a position-target motor in the engine (velocity-limited), and the servo element in the netlist draws the current above. That separates the supply-sag fault (servo jitter when the rail dips) from the mechanical result. The existing rule table (`bench-solve.js:121-123`, angle from average pulse width) stays as the electrical estimate of the pulse.

**Stepper.** Steps per revolution, microstepping set by the driver pins (step-dir drivers like the A4988 on the benches), holding torque and a pull-out curve (torque against speed, a table of 2 to 8 points, linear interpolation). State: rotor angle and a `lost steps` counter. If the demanded step rate needs a torque above the pull-out value at that speed, or the load torque exceeds holding torque, the rotor misses steps in a fixed rule: it stays at the last position it could reach and the counter increments (a design choice: a deterministic rule rather than a resonance model; resonance and mid-band instability are "not modelled yet"). Current per coil from the driver's current limit.

### 7.6 Battery and the power path

The battery is an electrical element: open-circuit voltage table by state of charge, internal resistance, capacity (the same structure as `src/lib/flight/battery.ts:1-60`: 11-point OCV tables per chemistry and `IR = k / Ah` per cell, DOCUMENTED there; the robot reuses the code, not a copy). Chemistries for robots: alkaline AA packs, NiMH, Li-ion 18650, LiPo. Voltage sag under motor load, brown-out of the logic rail through the real shared netlist (cause `brownout`, existing), regulators and buck converters from the LM2596 bench. Runtime is integrated by the simulation, not by the formula of RB-C-06, when the person runs a long test; the formula is for the editor.

## 8. Sensors (ADR-0703)

Sensor models are the `SensorModel` format of SIM_ARCH 12.2 plus a physics query. All sensors are tier T1 at first release: nominal functions, stated noise, no tolerance modelling, and every number in the descriptor carries a source or the words "iynk assumption". None of the numbers below is sourced yet; values in the tables are defaults for the editor and are UNKNOWN until each descriptor cites a datasheet.

| Sensor | Query | Output to the board | Model |
|---|---|---|---|
| Line / reflectance array (QTR-8RC style, analogue or RC-decay) | `surface-sample` | analogue voltage or RC decay time per channel | For each channel, sample the floor at the channel's footprint: 9 points (centre plus 8 on a ring at 0.7 of the footprint radius) at the sensor's world position; each point's reflectance is the track's if inside a `Track` polyline buffer, else the floor surface's. Mean reflectance maps through the descriptor's transfer function (the existing `qtrDarkness` rule, SIM_ARCH 12.2 table). Height effect: reflectance response multiplied by `max(0, 1 - ((h - h_opt) / h_range)²)`, with `h` the sensor height above the floor from the physics pose (a descriptor field; default values are an assumption). The 9-point rule is an approximation of the area integral, deterministic and cheap; an exact polygon-clipping version is a later upgrade |
| Ultrasonic ranger (HC-SR04 style) | `ray-fan` | echo pulse width in microseconds, timeout from the descriptor | Cast `n` rays (default 5) spread over the beam cone; take the shortest hit within `max_range` that the surface returns (a hit at an incidence angle beyond `echo_max_angle_deg` returns nothing, an iynk assumption rule that explains missed echoes on slanted walls). Pulse width = `distance * 58.3 us/cm` as the existing device does (`devices.ts:261-285` per the audit). Timeout 38 ms as in the existing model. Sampling: the sensor measures only when the code raises the trigger pin, and the echo arrives after `2 d / c` of virtual time with `c = 343 m/s` (at 20 degC; temperature dependence from the environment object); the code sees the echo edges at those virtual times |
| IR distance (analogue, Sharp style) | `ray-fan` (1 ray) | analogue volts | non-linear transfer from the descriptor (a table), update period from the descriptor |
| Time of flight (VL53 style) | `ray-fan` | I2C registers | distance with quantisation; protocol model from F-208; a descriptor with no model says `not-modelled-yet` (R-FID-3) |
| Bump / limit switch | `contact` | digital level | `contacts()` pairs involving the switch's collider and anything else, with debounce time optional (seeded bounce, off by default) |
| Wheel encoder | `joint` | A/B edges, index | counts from the joint angle at the sensor (after the gearbox if the encoder is on the motor shaft: `angle_motor = angle_out * gear`); counts per revolution from the descriptor. See 9.2 for edge timing |
| IMU (MPU-6050 style) | `body-rates` | I2C registers (existing model) | gyro = body angular velocity in the sensor frame plus bias plus noise; accelerometer = specific force `R^T (a - g)` in the sensor frame, from the body's linear acceleration estimated by the difference of consecutive velocities. Quantised to the register scale the device already uses (`round(accel_g * 16384)` at 2 g, `arduino.test.ts:293-308` per the audit). Axes are the mount's rotation, so a wrongly mounted IMU (rotated 90 degrees) really reads wrong, which is a fault the checker can name |
| Compass | `body-rates` plus environment field | I2C registers | later, needs `magneticFieldTesla` in the environment (SIM_ARCH 12.1) |
| Camera, lidar, depth | none | | not planned for v1. A 2D lidar is a `ray-fan` with 360 rays and is possible in N2 as a later sensor; its cost is `rays * map size` per scan and is not measured |

**Noise and timing.** Each sensor has a seeded stream `sensor:<component id>` (SIM_ARCH 6.5). Noise is Gaussian with a standard deviation in the sensor's units, optionally plus a random-walk bias. The sensor has a `period_ns` (its measurement cycle) and a `latency_ns`; between samples the output holds. These are descriptor fields; an unset one is an error, not a silent default, in the T2 tier, and a visible "assumed" in T1.

**Ground truth.** The simulation can always read the exact pose from the engine. Instruments show ground truth and the sensor value side by side, with the provenance tag of SIM_ARCH 14 (`computed`, `approximation`, `mocked`) so the person can see what the robot "knows" versus what is true.

## 9. Control timing and robot code (ADR-0704)

### 9.1 Where the code runs

The user's program runs on the board runtime in the SimWorker (the Arduino C++ interpreter for the Uno bench, avr8js opt-in, MicroPython for the Pico, and so on; SIM_ARCH 8). The robot adds nothing to the language support; it adds the plant. The program reads sensors through the pins and buses it already uses and drives motors through PWM pins, direction pins, step pins and the servo library. The orchestrator is the loop of SIM_ARCH 5.6; the plant is the mechanical engine ranked 50, running at phase P5.

### 9.2 Timing, end to end

```mermaid
sequenceDiagram
  participant C as User code (MCU engine)
  participant E as Electrical (solver, motor element)
  participant P as Physics step (240 Hz)
  participant S as Sensors
  C->>E: analogWrite at s (pin edge, P2)
  E->>E: driver + motor: closed form per PWM cycle (P3)
  E->>P: torque for the step that starts at t (P5 of t)
  P->>P: step advances the world from t to t+h
  P->>S: encoder edges with times in (t, t+h] enqueued as P4 events
  S->>C: each edge at its own time; other sensors read the state of t until t+h
```

**Look-ahead scheme (the rule that keeps the clock monotone).** Let `h` be the physics step (1/240 s = 4,166,666.67 ns, rounded as in SIM_ARCH 5.4) and `t = k h` the time of the step. At P5 of `t` the mechanical engine:

1. takes the torque inputs as they stand at `t` (the P3 currents of timestamp `t`; any PWM or direction change at a time `s` with `t < s < t+h` is seen only at P5 of `t+h`);
2. advances the world from `t` to `t+h` (the engine now holds the state of `t+h`);
3. computes the encoder edges whose angle was crossed in this step and enqueues each as a P4 event at its interpolated time in `(t, t+h]`, which is later than the time being processed, so the queue never receives an event in the past (SIM_ARCH 5.5: total order `(at, phase, rank, seq)`; `runUntil` never goes backwards; the queue asserts `at >= now` on enqueue and the run halts with `event-in-past` if it ever fails);
4. keeps two read buffers, `prev` (state of `t`) and `next` (state of `t+h`), with `next` valid for reads whose `at >= t+h`. A sensor read at P4 with `t <= at < t+h` therefore sees the state **as of the start of the step**, and the instruments at P6 of `t` see the state of `t`. The hash checkpoints (`hash2`, section 17) hash `prev` at the checkpoint time, never the engine's look-ahead state.

An edge exactly at `t+h` belongs to this step; an edge exactly at `t` belongs to the previous one, so each edge is delivered once. Edge `k` of a channel set has angle `theta_k = k * 2 pi / counts` (the existing meaning of `counts_per_rev`); with `theta_a` and `theta_b` the joint angles at `t` and `t+h` (both known when the edges are computed, so this is interpolation between known end points, never extrapolation), its time is `tau_k = t + h (theta_k - theta_a) / (theta_b - theta_a)`, rounded to integer nanoseconds and clamped into `(t, t+h]`. Edges of one step are enqueued in the order they occur (descending angle for reverse rotation); two edges that round to the same nanosecond keep that order through `seq`. A wheel that does not cross an edge in the step enqueues nothing. The linear form is exact for constant speed and its error is second order when the speed changes little inside one step (the example motor changes speed by at most `h/tau_m = 4 percent` per step from rest at full voltage; arithmetic on the example, tested in RA-09).

Latency budget for a speed loop on an Uno bench (each term is a model parameter, not a measurement; the numbers shown are examples of where the time goes):

| Term | Source | Example |
|---|---|---|
| Sensor sample period | descriptor `period_ns` | 1 ms for a quadrature encoder interrupt path; 60 ms for an ultrasonic ranger cycle |
| Code execution | board `opNs` per statement (Uno 1000 ns, SIM_ARCH 5.4) times statements in the loop | 200 statements = 0.2 ms |
| PWM update | applies at the next timer overflow | up to one PWM period (2.04 ms at 490 Hz) |
| Motor electrical lag | `L/R` | 0.48 ms in the example motor |
| Actuation lag from the look-ahead step | a torque-relevant change at time `s` in `(t, t+h)` first acts in the step that starts at `t+h` | `t+h-s`, from 0 to `h` (0 to 4.17 ms; mean `h/2` for changes spread evenly in time) |
| State age of non-edge sensors | a read at `at` in `[t, t+h)` sees the state of `t` | `at-t`, from 0 to `h` (0 to 4.17 ms): joint-angle reads, line, ranger, IMU, bump |
| Encoder edge timing | edges are timed by interpolation inside the step | 0 lag by construction, error under 5 percent of the edge spacing (RA-09); an edge still reflects the torque of the step start, so it carries the actuation lag above |
| Worst-case sense-then-act round trip through the physics step | state age plus actuation lag | less than `2 h` = 8.33 ms (arithmetic) |
| Motor mechanical lag | `J R / (kt ke)` | 104 ms in the example motor |

A counter read by code (the number of edges so far) is exact at any `at`: it counts every edge enqueued with a time at or before `at`, so counter-based speed estimates carry no state-age term. Only reads that sample a continuous quantity (a potentiometer-like joint angle, an IMU) carry the 0 to `h` age.

The loop-timing instrument (a view of the probe tap, F-054) shows the user's loop period histogram and jitter against the virtual clock, so a control loop that takes longer than its period is visible. `delay()` and `millis()` already run on the virtual clock (DOCUMENTED, `interp.md`). A wheel with 1,000 counts per revolution at 10 rad/s produces about 1,600 edges per second, within the event queue's budget (the queue handles 780 to 980 pin events per second per PWM pin, RS-03).

### 9.3 PID: reference implementation and instrument

The platform does not hide the controller. It ships source templates in the supported languages (Arduino C++, MicroPython) and a PID tuning instrument. Reference law (discrete, fixed sample time `T`):

```
e[k]   = r[k] - y[k]
P      = kp e[k]
I     += ki T e[k]                      clamped to [-imax, +imax]; skipped when the output is saturated and e has the same sign (anti-windup by conditional integration)
D      = kd (dfilt[k]) with dfilt[k] = dfilt[k-1] + a (d[k] - dfilt[k-1]), d[k] = (y[k-1] - y[k]) / T    derivative on measurement, first-order filter, a = T / (T + Tf)
u      = clamp(P + I + D, umin, umax)
```

Derivative on measurement avoids the kick at a setpoint change. The instrument plots setpoint, response, control output and the integral term, and reports rise time, overshoot and settling time computed from the plotted run with the same rule as the drone traces (DRONE_ARCHITECTURE 9). The instrument is a read-only view; it never tunes for the person.

### 9.4 Determinism of the control path

Everything between the user code and the plant is on the orchestrator's integer-nanosecond clock. No wall clock enters (DET-5, lint rule SA-11). A run is the project document, the seed, the input log and the engine versions. The same inputs and versions give the same hash (class B) for the physics scene as built under 4.4. Anything that uses `Math.sin/cos/atan2/exp/pow` in iynk code (the encoder edge interpolation does not; the sensor ray directions and the IMU frame rotation do) is class N until `dmath` lands (ADR-0303). The robot hash in the replay record therefore compares engine state (class B) and also stores sensor readings with class N tolerance for those that use trigonometry.

## 10. Transforms, odometry and navigation (ADR-0705)

### 10.1 Transform tree

`tf` is derived from `mechanical.frames` plus the live joint values. API (in the worker and, as a read-only snapshot, to the editor):

```ts
interface TfTree {
  lookup(target: FrameId, source: FrameId, at?: SimTime): Pose | TfError;   // at defaults to now; interpolation between the last two stored poses
  frames(): FrameId[];
  chain(a: FrameId, b: FrameId): FrameId[];
}
type TfError = { error: 'unknown-frame' | 'no-path' | 'extrapolation'; frame?: FrameId };
```

Conventions follow REP-103 (EXTERNAL): the `world`, `odom` and `base` frames are named like ROS (`map`, `odom`, `base_link`) in the ROS view and map one-to-one to `world`, a robot-start frame and the root body's frame in the document. Storage: the last 2 s of poses per moving frame at the step rate (480 poses), bounded. `at` older than the buffer returns `extrapolation`. No frame is created implicitly.

### 10.2 Odometry

Differential drive with wheel radius `r` and track `b`: per update, left and right wheel arc lengths `dsL = r dthetaL`, `dsR = r dthetaR` from encoder counts; `ds = (dsR + dsL) / 2`, `dphi = (dsR - dsL) / b`. Pose update with the exact arc form: if `|dphi| < 1e-9` then `x += ds cos(phi)`, `y += ds sin(phi)`; else `R = ds / dphi`, `x += R (sin(phi + dphi) - sin(phi))`, `y -= R (cos(phi + dphi) - cos(phi))`, `phi += dphi`. This is the library function `diffDriveOdometry()` (a pure function with golden tests); user code can call it in the ROS-like node or copy it. Error sources are what the person sees: encoder quantisation (RB-C-09), wheel radius mismatch and track error (the person can enter a "true" and an "assumed" value in the document to see the drift; the physics uses the true one, the code uses the assumed one), wheel slip (from the contact model), and heading drift. Worked arithmetic (illustrative): a 1 percent radius error on one wheel over a 10 m straight run gives `dsR - dsL = 0.1 m`; with `b = 0.15 m` the heading error is `0.1 / 0.15 = 0.667 rad` (38 degrees). So the odometry panel plots dead-reckoned pose and ground truth together and shows the error growing.

Mecanum and omnidirectional drives, Ackermann and tracked vehicles are not in v1. The odometry module's interface takes a drive type so they can be added.

### 10.3 Navigation ladder

| Level | Capability | Library provided | In v1 |
|---|---|---|---|
| N0 reactive | line following, wall following, obstacle avoidance from ranger readings | templates only (user code) | yes (templates 3, 4) |
| N1 waypoint | drive to a goal from odometry; pure pursuit and a P controller on distance and heading error | `waypointFollower()` source template and function | yes (template 5) |
| N2 map and plan | occupancy grid from ranger readings and known pose (log-odds update, 1 cell = 20 mm default); A* on the grid with an inflation radius; replan when blocked | `OccupancyGrid`, `astar()` as pure functions with golden tests | yes (template 7) |
| N3 SLAM, localisation (AMCL), Nav2, behaviour trees | | none | not planned. Reason: they need a general 2D lidar, a particle filter with sensor models and parameter sets (hundreds) for a result a real ROS 2 install already gives for free. When wanted, the ROS 2 bridge (11.3) lets Nav2 run on the user's machine against the simulated robot |

Everything in N1 and N2 is user-facing code or templates; the platform does not plan for the robot. A "robot that already navigates" would defeat the exercise.

## 11. ROS 2: native graph versus interop (ADR-0706)

### 11.1 Options

| Option | What it is | Verdict |
|---|---|---|
| A. Native TypeScript graph on the simulation clock | nodes, topics, publishers, subscriptions, timers, a small service set, message types as TS interfaces; `rclpy`-shaped Python API in the interpreter; a `ros2` terminal emulation | **Chosen** for the first release (TECHNICAL_RESEARCH D6). Deterministic, offline, free |
| B. Local helper bridging to a real ROS 2 install (rosbridge protocol, BSD per `platform-options.md`, over WebSocket to the user's own machine) | real nodes (Nav2, SLAM, RViz-like tools) drive the simulated robot and read its sensors | **Late in the phase**, only when Amar wants it. Cost and value below |
| C. Run `rclpy` or DDS in the browser | | **Rejected**: no DDS in a browser; `rclpy` is CPython with C extensions (TECHNICAL_RESEARCH D6, EXTERNAL) |
| D. micro-ROS on the simulated MCU | | **Rejected**: needs the real firmware and a transport; far outside the interpreters |

### 11.2 The native graph

- **Scheduling.** A single-threaded executor on the orchestrator clock. Events are `(at, phase, rank, seq)` like everything else; ROS callbacks run at phase P2 in the node's registration order. No wall time, no threads. A `timer(period)` fires at `n * period` exactly in virtual nanoseconds.
- **Messages.** A typed registry of the subset needed by the templates: `std_msgs` (String, Bool, Int32, Float32, Float64, Header), `geometry_msgs` (Twist, TwistStamped, Pose, PoseStamped, Transform, TransformStamped, Point, Quaternion, Vector3), `nav_msgs` (Odometry, Path, OccupancyGrid), `sensor_msgs` (Range, LaserScan, Imu, JointState, BatteryState), `tf2_msgs/TFMessage`, `builtin_interfaces/Time`. Each message has a field table with types and units (REP-103 units: metres, radians, seconds). Unknown message types are errors with the type name (R-FID-3), not silently accepted.
- **QoS.** Reliable or best-effort and keep-last depth only. History, durability, deadlines and liveliness are `not-modelled-yet`; the setting is accepted and a diagnostic says so.
- **Services and parameters.** Services as request and response over the same executor; node parameters (declare, get, set) with types. Actions are not in v1.
- **Python API.** The existing `rclpy` mock (`modules.ts:867-1000`) publishes only. It is extended with `create_subscription`, `create_timer`, `spin_once`, `spin`, `get_clock().now()`, `create_service`, parameters. `rclpy.init()` before node creation is already enforced (`modules.ts:922`).
- **Terminal.** `ros2 topic list | echo | pub | hz`, `ros2 node list | info`, `ros2 param get | set` in the bench's terminal as an emulation of the output format. Unknown subcommands say "not modelled yet".
- **Standard nodes.** `robot_state_publisher` (publishes `tf` from the document), a diff-drive controller (consumes `cmd_vel`, produces `odom` and `joint_states`) as a node the person can replace with their own.
- **Label.** The view is titled "ROS-like graph: a model, not ROS 2" everywhere until the bridge exists and a node from a real ROS 2 install has joined it (R-146).

### 11.3 The real bridge (optional)

A small helper program the person runs on their own machine (Node or Python) that speaks the rosbridge v2 JSON protocol to a real ROS 2 install and a WebSocket to the page. Any local WebSocket server that a web page can reach is attackable by other web pages (a hostile site can open `ws://127.0.0.1:<port>`, and DNS rebinding can make a hostile name resolve to 127.0.0.1), so the helper does not trust the network position. Connection rules:

| Rule | Spec |
|---|---|
| Bind | The helper listens on `127.0.0.1` (and `::1`) only. Any other bind needs the explicit flag `--bind <address>`, and the helper then refuses to start without a TLS certificate and key (`--tls-cert`, `--tls-key`) |
| Host header | The `Host` header of the upgrade request must be exactly `localhost`, `127.0.0.1` or `[::1]`, each with the helper's port. Anything else is refused with HTTP 403 before the upgrade (this is the DNS rebinding control: a rebound hostile name arrives with its own name in `Host`). With `--bind` and TLS, the configured public name is added to the list |
| Origin header | The `Origin` must equal an entry of the helper's `allowed_origins` config, which holds the origin of the iynk page the person uses (a self-hosted address, D-015, so the helper cannot know it: the config has no default and no wildcard; `--dev` allows only `http://localhost:3000`). A missing `Origin` is refused unless the helper was started with `--allow-no-origin` (for scripts; the token rule still applies). Refusal is HTTP 403 before the upgrade |
| Session token | On start the helper prints a random token (128 bits from the OS random source, shown once, valid until the helper stops or 12 hours pass). The person pastes it into the bridge dialog. The page sends it as a WebSocket subprotocol value (`iynk.v1` plus `token.<value>`), never in the URL. Compared in constant time; a wrong or missing token closes the socket with code 4401 before any topic data is sent. Five wrong tokens in a minute lock the helper for a minute |
| Transport | Plain `ws://` is allowed only to loopback addresses. A non-loopback address needs `wss://`, and the person must type it and confirm in a dialog that shows the address, the certificate subject and the sentence "this robot's sensor data will be sent to this address". The page never opens a socket to an address it was not given by the person in this session |
| Where the address lives | In the person's local settings (IndexedDB), never in the project document, an op, a share link, a template or an AI-suggested edit. A buddy who opens the same project in a room does not inherit the address or the token, so a shared project cannot make another person's browser connect anywhere |
| Topics | Every topic the helper exposes is on an allowlist the person sets in the helper's own config; the page additionally sends only the topics the person ticked in the dialog. Messages are validated against the message registry (11.2) before use |
| Limits | 64 KB per message and 200 messages per second per topic; excess messages are dropped and counted, and the counter is shown |

Direction: the simulated robot publishes sensor topics and `tf`, subscribes `cmd_vel`; the real graph does the thinking. Cost (ESTIMATED, assumptions: rosbridge protocol framing already exists as an open client `roslib`, MIT/BSD per the research file; one engineer; no QoS fidelity): 2 to 3 person-weeks for the helper, the page side and tests, plus about 2 days for the connection rules above (ESTIMATED). Value: access to Nav2, SLAM Toolbox and RViz-style visual tools. Risk: it is the only part of the robotics design that depends on code iynk does not control; the exact version support (Humble, Jazzy, Rolling per `rosbridge_suite`) moves. Decision rule: build it when Amar names a real ROS 2 workflow he wants to run against the simulated robot; until then the native graph and the labels are the complete deliverable. Lock-step with a real ROS graph is not deterministic and its runs are tagged "not replayable". The same connection rules apply to any other local helper iynk adds later (the Studio export helper, an on-device flasher); this table is the pattern.

## 12. URDF and SDF (ADR-0706)

### 12.1 URDF import

Import is a converter with a loss report (PDM 12.2, ADR-0109). Mapping:

| URDF | iynk | Notes |
|---|---|---|
| `<robot name>` | `meta.title` | |
| `<link>` | one `mechanical.bodies[]` entry plus a frame | |
| `<inertial>` mass, `inertia` (kg, kg·m²), `origin` | `mass_g = mass * 1000`, `inertia_g_mm2 = I * 1e9`, `com_mm` | `1 kg m² = 1e9 g mm²`, a unit conversion tested to 1e-12 relative |
| `<visual>`, `<collision>` geometry box, cylinder, sphere | `Shape`; collision shape goes to `BodyPhysics.collider` | URDF cylinder axis is z; the importer rotates into the engine's convention |
| `<mesh filename>` | `mesh` asset if the file is supplied (STL or OBJ, up to 20,000 triangles); `package://` and `file://` are never fetched; the user picks the file | `.dae` is not supported (loss `urdf-mesh-dae`) |
| `<joint type>` `fixed`, `revolute`, `continuous`, `prismatic` | same kinds | `<limit lower upper effort velocity>`, `<axis>`, `<origin>`, `<dynamics damping friction>` map to joint fields and `JointPhysics` |
| `planar`, `floating` | not supported | loss `urdf-joint-unsupported`, joint becomes `fixed` and is listed |
| `<transmission>`, `<gazebo>`, `ros2_control` tags | ignored | loss `urdf-tag-ignored` with a count per tag |
| xacro | not supported; the file must be expanded first | error with a hint (`xacro` on the command line) |
| `<material>` colours | used for display only | |
| `<mimic>` | not supported | loss |

Hardening: XML is parsed with a parser that has DTD and entity expansion disabled (no billion-laughs); input limit 2 MiB; 512 links; element depth 64; any path with `..` or an absolute path is refused as a label (PDM 13). Parsing happens in a worker.

A URDF has no electronics. The import produces a robot with bodies and joints and no motors; every `revolute` or `continuous` joint with an `effort` and no drive becomes a free joint with a warning `RB-W-UNDRIVEN`. The person attaches motors from the parts library.

### 12.2 URDF export

Direct, because the pose convention is the URDF one (PDM 5.8). Bodies to links with inertial blocks (mass `g / 1000`, inertia `g mm² / 1e9`), joints with limits in radians and metres. Loss codes: `urdf-electronics-dropped` (everything electrical), `urdf-wheel-surface-dropped` (surface and friction, because URDF has `<surface>` only in Gazebo extensions, EXTERNAL recalled), `urdf-driver-dropped`. Acceptance: export then import gives equal bodies, joints and masses for templates 1, 3 and 6 (RA-18).

### 12.3 SDF

Import only, later, for a subset (links, joints, simple geometry, inertial). Gazebo world features (plugins, lights, sensors, physics settings) are listed as loss. Not in the first robotics release. Reason: SDF's value is Gazebo worlds, which iynk does not run.

## 13. Faults and diagnosis for robots

Faults are operations on the model and failures are derived (ADR-0314). Robot-specific fault ops reuse the `FaultOp` kinds of SIM_ARCH 13.2 (`open`, `swap`, `value`, `stuck`, `degrade`) and add physical ones as `value` or `stuck` on mechanical parameters: a wheel's friction, a motor's `ke` (weak magnet), a gearbox's efficiency (seized gear), a sensor's mount pose (`mount` pose change as a `mech.set` op), encoder channel swap (`swap` on A/B pins), battery capacity. "Break it" and "Repair" are the same ops as on a board (F-017, F-030).

Proposed core cause ids (the list in SIM_ARCH 13.4 is a registry; these are additions the simulation seat must accept; each has a detector, a layer and a symptom text key):

| cause_id | Detector | Layer |
|---|---|---|
| `motor-stall` (exists) | joint speed near 0 with current near `V/R` for over 0.5 s | L4, L7 |
| `motor-direction-reversed` | commanded direction sign differs from joint velocity sign for 0.5 s with torque applied | L7 |
| `encoder-channel-swapped` | counts decrease while the joint angle increases | L7 |
| `wheel-slip` | wheel surface speed differs from ground speed by more than 20 percent (default) for 0.3 s | L7 |
| `driver-undersized` | RB-C-04 fails or driver current limit reached | L4 |
| `logic-brownout-from-motors` | `brownout` while motor current rises (correlation window 20 ms) | L4, L5 |
| `battery-sag-reset` | MCU reset within 50 ms of a motor start with pack voltage below the regulator input minimum | L4, L5 |
| `sensor-too-high` | line sensor height above the optimum range | L7, L9 |
| `sensor-saturated` | ADC at full scale or empty for the whole run | L9 |
| `ranger-beam-blocked` | ranger minimum-range hit inside the robot's own body | L7 |
| `tip-over` | body tilt beyond 45 degrees or RB-C-07 triggered | L7 |
| `loop-too-slow` | control loop period over 2 times its set period (from the loop-timing probe) | L5 |
| `servo-jitter-supply` | servo rail dips with servo current while commanded position is constant | L4, L7 |
| `stepper-lost-steps` | lost-steps counter above 0 | L7 |

Evidence uses the `Evidence` record of SIM_ARCH 13.4 with `provenance` and `tier`. The diagnosis record is the one D-010 fixes, unchanged: `{cause_id, symptom_id, evidence, hint_level}`.

## 14. Fidelity and honest labels (D-007)

Tiers follow SIM_ARCH 4. Robotics at the first release:

| Layer | Tier | "What it models" | "Not modelled yet" |
|---|---|---|---|
| Rigid bodies, joints, contact | T1 | Rigid bodies and joints at 240 Hz, Coulomb friction with a stated combine rule, joint limits | tyre compliance and deformation, rolling resistance beyond a coefficient, backlash, cable drag, joint flex, thermal expansion, soft ground |
| DC motor with gearbox | T1 | armature resistance, inductance, back-EMF, rotor inertia, viscous friction, gear ratio and efficiency, PWM cycle average | motor heating, brush wear, magnet demagnetisation, gear friction nonlinearity, cogging |
| Servo | T1 | rate limit, torque limit, saturated position loop | internal controller dynamics, gear backlash, centre-point wander |
| Stepper | T1 | holding torque, pull-out table, lost steps | resonance, microstepping errors, chopper behaviour |
| Sensors | T1 | geometry (rays, footprint), stated noise, period and latency | surface texture, ambient light interference, cross-talk between rangers, multipath |
| Battery | T1 (existing) | open-circuit curve and internal resistance | temperature, ageing |
| ROS-like graph | T0 | message passing on the simulation clock | real DDS, QoS beyond reliability and depth, real time scheduling |

Each row becomes a fidelity registry entry (ADR-0310) with `implements`, `mocked`, `unsupported`, `parameterSources`, `validation` (none yet: "Not checked against a reference") and `operatingRange`. No UI text says "validated" or "accurate". A project's chip shows the lowest tier of the layers it uses (ADR-0302). RB-C-xx results carry the tier of the models they used (R-FID-6).

## 15. Template ladder (ADR-0707)

BRIEF 11.2: depth and correct behaviour over many shallow templates. Seven templates, built in order. A template is finished when: it has a project file with parts, wiring, code in Arduino C++ and (where the board supports it) MicroPython, a physics arena, a hash test (RA-02 style), at least five faults drawn from the cause ids of section 13, a checklist of checks (RB-C-xx) that pass on the shipped design, a "what it models and what it does not" panel, and a lesson path with the diagnosis flow.

| # | Template | Parts (from the existing benches where possible) | What it teaches | New capability needed |
|---|---|---|---|---|
| 1 | Drive base, open loop | Uno, TB6612 or L298N, two gearmotors, battery pack, chassis, two wheels, caster | motor driver wiring, PWM, direction, stall current, brown-out | motor and wheel physics (ADR-0702) |
| 2 | Speed control with encoders | template 1 plus two encoders | counts, speed estimate, PID, loop timing | encoder edges (9.2), PID instrument (9.3) |
| 3 | Line follower | template 2 (or 1) plus QTR-8RC array | sensor geometry, P and PD steering, track curvature, speed limit | surface sample sensor (section 8), arena tracks |
| 4 | Obstacle avoider | template 1 plus HC-SR04 (servo scan optional) | echo timing, blind zones, reactive behaviour | ray fan sensor, servo (7.5) |
| 5 | Differential-drive rover with odometry | template 2 plus IMU (MPU-6050) | odometry drift, waypoint following, heading by gyro | tf and odometry (section 10), IMU |
| 6 | Planar arm | Uno or ESP32, PCA9685, 2 to 3 servos, links, a gripper-less tip | FK, IK, holding torque, supply sag with servo load | kinematics (section 5), RB-C-08 |
| 7 | Sensor-guided vehicle / maze | template 5 plus two or three rangers; Pi 5 ROS-like variant | wall following, grid map, A*, topics and nodes | N2 library, ROS-like graph (11.2) |

Each template ships with a reference solution and the hash of the reference run. Templates are projects, so the person can fork and change them (J-03). The Pi 5 ROS 2 bench (F-059) is the starting point for the ROS-like variant of template 7 and is not rebuilt.

All seven templates are two driven wheels plus a caster (templates 1 to 5 and 7) or a fixed base with servo joints (template 6). Four-wheel and mecanum bases, a simple tracked vehicle, a balancing robot and a legged robot are not templates in this ladder. The four-wheel robot of `sa16.mjs` stays in the repository only as a **test fixture** (a project file under the robotics test fixtures, used by RA-03 and as the RS-13 scene A); it is not offered in the template gallery and no acceptance criterion treats it as a template. A balancing robot (inverted pendulum on two wheels) is the natural next one because it needs the IMU, the PID instrument and the physics together; it is listed as the first extension, not scheduled.

## 16. Execution, performance, size

| Item | Spec | Evidence |
|---|---|---|
| Where | SimWorker; the engine loads lazily, after its size is shown (R-110); only on projects that contain a `mechanical` section with a dynamic body | SIM_ARCH 17.1 rule 3 |
| Step cost | 0.07 to 0.09 ms mean at 20 bodies and 6 motor joints on the M4 Pro; 0.44 to 0.54 ms at 6x CPU throttle; p95 of 100-step batches at most 0.61 ms at 6x | RS-13 MEASURED. State readback and rendering are extra and unmeasured |
| First step | Rapier stalls 24 to 27 ms on the first step in Node and Chromium, 157 ms at 6x throttle; do one dummy step during load, behind the "loading physics" state | RS-13 MEASURED |
| Worst single steps | 1 to 5 ms in warmed runs under throttle: p99.9 is not under 1 ms on a slow device. The step budget is read as mean and batch p95 (BUD-13) | RS-13 |
| Wire size | split artifact of 16.1: 888,151 B brotli q11 (WASM 855,167 B plus TypeScript wrapper and glue 32,984 B), MEASURED including the wrapper; single-file compat 1,201,977 B. Budget 1.0 MB = 1,000,000 B (BUD-14, HYPOTHESIS); fallback 1.25 MB if the split form is lost | RS-13; `DP-01-robot-prototypes/results/split-build.json`; RA-27 |
| Scene limit | 64 dynamic bodies in v1, HYPOTHESIS; RA-07 measures it at 6x throttle | |
| Frames to the UI | at most 30 per simulated second (SIM_ARCH 17.2). Payload per frame: 7 floats per body for 64 bodies = 1.8 KB, transferable. Rendering is a top-down 2D view first (SVG or canvas from the same state); a 3D view is F-086 (LATER) and shares no engine state beyond this frame | |
| Memory | Rapier WASM memory use is UNKNOWN; RA-07 records heap after 10 minutes against BUD-11 (150 MB tab) | |
| Phone or Chromebook | UNKNOWN for every number (RS-13 had no device). RA-07 runs on the baseline device once one is chosen (RS-01 follow-up) | |

### 16.1 Build the artifact (ADR-0700)

ADR-0700, the size budget (BUD-14) and the hash test (RA-01) all rest on one question: what exact files does the app ship? RS-13 hashed the single-file compat package and sized the split form from its parts, without the TypeScript wrapper. This subsection fixes the artifact and measures it. (The ADR file `ADR/ADR-0700-robot-physics-engine.md` should point here; it is outside this file's edits.)

**What was found on 2026-10-27** (VERIFIED by `npm view`, `npm pack`, `sha256sum` and reading the files, in a scratch folder; the commands are in `DP-01-robot-prototypes/README.md`):

| Fact | Value |
|---|---|
| Single-file package | `@dimforge/rapier3d-deterministic-compat` 0.21.0, npm modified 2026-09-25, `gitHead` `b716d375efc0201003f0cd9ef7168eee0b62c177`, integrity `sha512-n7JuU62Obljlgq+OeH2DHhTmRSjRzwuJPl54tS9pFIzVQyvXsO5CH+a5KkIRBtnFWDbg1Zicv9BulG0jfBAopA==`. Its `dist/` holds `rapier.mjs` (wrapper, glue and the WASM as base64 in one minified file), plus loose `rapier_wasm3d_bg.wasm` and `rapier_wasm3d.js` |
| Unbundled package | `@dimforge/rapier3d-deterministic` 0.21.0 (non-compat), integrity `sha512-ITZuCbM1hg4B1RXisactr9vQ+GU8UeuHQYXiv20itjt8aihV/lXhdkHqFJoloZJFyuY23gurCedICdWOMGguDw==`. 45 unminified ES module files and `rapier_wasm3d_bg.wasm`, imported as an ES module (`import * as wasm from "./rapier_wasm3d_bg.wasm"`), so it needs a bundler with WASM module support. It is a split form by construction. It was not hashed by RS-13 |
| WASM bytes | `rapier_wasm3d_bg.wasm`, 3,105,893 B, sha256 `4e9890fd2df60072f9db06a33e4030221249c1b3687b722b2388c21f09e97551` in **both** packages, and the base64 inside the compat `rapier.mjs` decodes to exactly the same bytes. So the engine binary RS-13 hashed is the binary any split form would ship |
| Source | Both packages name `https://github.com/dimforge/rapier` as repository. The paths embedded in the WASM show a CI build from that repository's `crates/rapier3d` with `parry3d-0.31.1`, and `rustc` commit `48a229ceaefd4985c50990b14116b6d856af0985` (strings in the WASM; the Rust version number is not stated and is UNKNOWN). The release tag name is UNKNOWN; the npm `gitHead` above is the commit |
| Cargo features, `wasm-pack` and `wasm-bindgen` versions | UNKNOWN: the artifacts do not record them. The package README states that the `-deterministic` builds guarantee cross-platform deterministic execution (DOCUMENTED). The upstream cargo feature behind that is called `enhanced-determinism` (EXTERNAL, recalled, not re-fetched) |
| JS repository | Archived upstream (Objection 4, EXTERNAL); the packages are now built from the main `dimforge/rapier` repository |

**Decision: iynk does not rebuild Rapier from source in v1.** It ships bytes derived from the published package and pins their sha256. Reason: the toolchain and feature list cannot be recovered from the artifact, a source rebuild would give different bytes, and all the determinism evidence (RS-13 and RA-01) would have to be redone for them. A source rebuild from `gitHead` is an optional audit exercise; its output would be a different artifact with its own hash and its own RA-01 and RA-27 runs. It is never a gate.

**Recipe (form S2, the default).** Script: `DP-01-robot-prototypes/src/split-build.mjs`, which will move into the repository's build tooling at slice R0 unchanged.

1. `npm pack @dimforge/rapier3d-deterministic-compat@0.21.0`; extract into its own empty directory; check the tarball integrity against the value above.
2. Read `dist/rapier.mjs`. Find the single call `<decoder>.toByteArray("AGFzbQ...")` that passes the embedded WASM to the initialiser. The script fails if it finds zero or two such calls.
3. Decode the base64 and require byte equality with `dist/rapier_wasm3d_bg.wasm`. The script fails otherwise.
4. Replace the whole call with `(globalThis.__IYNK_RAPIER_WASM__ ?? new URL("rapier_wasm3d_bg.wasm", import.meta.url))`. In a Worker the second branch makes the browser fetch the WASM as a separate cacheable file; in Node tests the first branch lets the test pass the bytes.
5. Write `rapier.split.mjs` and copy `rapier_wasm3d_bg.wasm` next to it. Before `init()` the Worker hashes the fetched WASM bytes (Web Crypto SHA-256) and refuses to start the engine on a mismatch with the pinned hash.

**Output files and expected sha256** (MEASURED; the replacement string above is part of the file, so changing it changes the hash):

| File | Raw bytes | Brotli q11 bytes | sha256 |
|---|---|---|---|
| `rapier_wasm3d_bg.wasm` | 3,105,893 | 855,167 | `4e9890fd2df60072f9db06a33e4030221249c1b3687b722b2388c21f09e97551` |
| `rapier.split.mjs` (TypeScript wrapper plus wasm-bindgen glue, minified) | 230,888 | 32,984 | `103fa5899fe4eebe7dc738d34b661fda034c26f130c46f3c4fb92303277abe86` |
| **Total shipped** | 3,336,781 | **888,151** | |

Against the budget: 888,151 B is 88.8 percent of 1,000,000 B (the BUD-14 limit, taking 1 MB as 10^6 bytes), leaving 111,849 B. The wrapper that RS-13 did not measure costs 32,984 B brotli (RS-13's raw estimate of about 0.23 MB matches: 230,888 B). Brotli was run with Node `zlib` at quality 11 on the files as written; a host that compresses at a lower quality ships more bytes, so RA-27 measures with the same method the deploy uses and also records the quality.

**Determinism of this form.** Run in Node 24.8.0 on arm64 with the WASM bytes passed through the test hook, the RS-13 scene (10,000 steps, `common.mjs` and `rapier-run.mjs` copied unchanged from RS-13) gives all ten checkpoint hashes equal to RS-13's compat run and final hash `c6a8e92d6174bd66` (`results/split-hash-node.txt`, VERIFIED as a prototype, author-run). That is Node only. Chromium, WebKit, Firefox, throttled runs and x86-64 are the work of RA-01.

**Alternative form S1** (the unbundled package through the app's bundler): ESTIMATED upper bound 736,536 B raw and 73,159 B brotli for its JavaScript before minification (all 45 files concatenated), so about 928,000 B with the same WASM, below the budget, but not built or hashed. Adopt S1 instead of S2 only if the build tool supports WASM ES modules in a Worker and S1 passes RA-01 and RA-27. Both forms ship the same WASM, so the replay record names the form (section 17).

**Fallback.** If the split form cannot be reproduced (the script's checks fail on a new package patch, RA-01 fails on the split form in any target where the compat form passes, or RA-27 fails), ship the compat package as it is (1,201,977 B brotli, the form RS-13 hashed) and raise BUD-14 to 1.25 MB explicitly: change the budget row in `PRODUCT_REQUIREMENTS.md`, change the CI size gate (ADR-0407), and list the change in the next decision log. The engine stays Rapier; this is a size fallback, not an engine change. If the pinned package itself is withdrawn from npm, the mirrored copy (the tarball is stored in the repository's vendor directory at slice R0, Apache-2.0 allows it) is the source.

## 17. Replay, snapshots, rooms

**Replay record additions** (to `ReplayRecord` of SIM_ARCH 6.7): `versions.rapier` = package name, exact version, artifact form (`split-derived` per 16.1, or `compat`), the SHA-256 of the WASM file and the SHA-256 of the JavaScript file; `physics` = `{ step_hz, length_scale, sleeping, ccd, combine_rules, solver_iterations, scene_hash }` where `scene_hash` is the hash of `buildScene(doc)` output (so a builder change that alters the scene is visible). A record whose `versions.rapier` differs from the running build refuses to replay with the reason and offers a re-run (PDM and SIM_ARCH rule: do not mix engine versions).

**Checkpoints.** `hash2` every 1,000 ms of simulated time (SIM_ARCH 6.7), taken from the `prev` buffer of 9.2 (the state at the checkpoint time, not the engine's look-ahead state).

**Rooms.** Peers simulate locally from the same ordered ops and the same inputs (SIM_ARCH 17.4). For a robot that means the same code runs on every peer's SimWorker. The class B hash must match across peers; Firefox and x86-64 are untested (RS-13), so rooms compare class D until RA-02 passes on them. Editing a robot together uses `domain.patch` and `mech.set` ops (Objection 2).

**Pause, step, rewind.** The engine is stepped in whole mechanical steps; "step" in the UI is one physics step (4.17 ms). Rewind restores from a keyframe (every 5 simulated seconds, cap 64) and re-runs; the engine's own snapshot replaces this only after RA-08.

## 18. Security and safety

| Threat | Control |
|---|---|
| Hostile URDF, STL or OBJ | worker parse; XML entity expansion disabled; limits in 12.1; vertex and triangle caps; NaN and Infinity in geometry are errors; no network fetch from a file |
| Hostile robot document | all numbers range-checked (4.3); scene limits (4.5); a scene that would exceed the step budget (bodies, joints) is refused at load with the count, not accepted and run slowly |
| Runaway physics (NaN, explosion) | any NaN or infinity in a body state halts the physics with `numeric-fault`, names the body, writes a snapshot into the report (SIM_ARCH 6.4). A body speed above 100 m/s or a position beyond 10 km halts with `physics-diverged` |
| ROS bridge | section 11.3: loopback bind, Host and Origin checks, per-session token, TLS for anything non-loopback, address never stored in the project, allowlist, message validation, size and rate limits, never shares keys (RA-28) |
| AI | the AI partner changes a robot only through ops (F-110). The content rule (R-024) applies to the AI and to templates. Robots that carry weapons are not a template, a part kind or a goal the AI helps with; the rule is stated in `DRONE_ARCHITECTURE.md` 11 and applies here by reference |
| Physical safety text | The simulation does not model injury. Templates that use motors, batteries or chargers carry the short lab-guidance panel (LiPo and NiMH handling, pinch points, stalled motors get hot, do not leave a powered robot unattended). Wording is lab guidance, not certification. The drone doc's panel set (DRONE_ARCHITECTURE 11) is reused for the battery parts |

## 19. Acceptance criteria

Each criterion is testable and carries a class (B bit-exact, N tolerance). "Baseline device" means the device chosen after RS-01 follow-up (UNKNOWN today).

| Id | Given, when, then | Class | Links |
|---|---|---|---|
| RA-01 | Given the exact artifact the app ships (`rapier.split.mjs` plus `rapier_wasm3d_bg.wasm` with the sha256 values of 16.1, not the compat file RS-13 hashed), When the RS-13 scene runs 10,000 steps in Node, Chromium and WebKit (Firefox added when installed), Then the final hash equals RS-13's `c6a8e92d6174bd66`, also at 4x and 6x throttle. Node already matches (16.1); the browsers are open | B | Objection 4, DET-2, 16.1 |
| RA-02 | Given each of templates 1 to 3 of section 15, When it runs ten times with one seed and once in each of two browsers, Then `hash2` at every 1,000 ms checkpoint is identical | B | R-166, R-170 |
| RA-03 | Given the four-wheel test fixture (the `sa16.mjs` scene as a project file; a fixture only, not one of the seven templates), When both wheels get equal speed commands for 10 simulated seconds, Then lateral drift is under 1 percent of distance travelled at `length_scale` 1 (prototype: 0.013 percent) and the choice of scale is recorded | N | SA-16, ADR-0700 |
| RA-04 | Given the engine, When the combine rules and solver iteration count are read back after world creation, Then they equal the values written in the replay record | B | ADR-0700 |
| RA-05 | Given the source tree, When linted, Then no call to `addTorque`, `addForce`, `Date.now`, `performance.now`, `Math.random` appears in `sim/robotics/*` (lint rule) | n/a | SA-11, `dbg.mjs` |
| RA-06 | Given a torque of 0.01 N·m applied for 240 steps to the reference wheel (m 0.157 kg, r 0.05 m, I = m r²/2), When the speed is read, Then it is within 1 percent of 50.93 rad/s (prototype 0.002 percent) | N | SA-16 |
| RA-07 | Given a synthetic 64-body, 32-joint scene, When it runs at 6x CPU throttle in a Worker on the baseline device, Then the mean step is under 1 ms (BUD-13), heap after 10 minutes under 150 MB (BUD-11), and the true scene limit and the mass-ratio stability point are written down | N | BUD-13, RB-W-MASSRATIO |
| RA-08 | Given a running scene, When snapshot then restore, Then the next 1,000 steps give the same hashes as continuing; otherwise restore is by keyframe replay and the UI says so | B | SIM_ARCH 6.7 |
| RA-09 | Given the look-ahead scheme of 9.2, When a motor runs at constant speed for 10 s, Then the edge count equals `floor(counts_per_rev * angle / 2 pi)` exactly, edge times are non-decreasing, and every edge was enqueued with a time later than the time being processed (the queue's `at >= now` assertion never fires and `event-in-past` never appears). When the speed changes (motor from rest at full voltage), Then each edge time is within 5 percent of the edge spacing of the same edge in a reference run of the same scene at step `h/16`, and every edge time lies in `(t, t+h]` of its step. When a joint-angle sensor is read at 16 evenly spread times inside one step, Then it returns the state of `t` each time (age `at-t`, from 0 to `h`); and when a PWM change is made at `s` inside a step, Then the first torque effect is in the step starting at `t+h` (lag `t+h-s`). The measured ages and lags are written into the latency table of 9.2 | N | ADR-0704, 9.2 |
| RA-10 | Given the reference motor driven at duty 0.25, 0.5 and 0.75 at 490 Hz in coast and slow-decay modes, When compared with a 5 microsecond reference, Then the closed-form speed is within 1 percent in all six cases (prototype 0.14 to 0.52 percent), and the duty-averaged form is shown by a test to be wrong in coast mode | N | Objection 3 |
| RA-11 | Given RB-C-01 to RB-C-10, When run on the seven templates, Then each shipped design passes and a deliberately broken variant (undersized driver, too-high sensor, heavy payload) fails with the right `limitingPart` | n/a | F-213 |
| RA-12 | Given a document with a motor whose `h * c >= 1`, When loaded, Then `RB-E-COUPLING` appears with the numbers | n/a | 7.2 |
| RA-13 | Given the line follower template, When the line sensor is mounted 30 mm too high, Then the run fails with `sensor-too-high` evidence naming the sensor and the height, and the hint ladder has three levels | n/a | D-010, J-06 |
| RA-14 | Given 1,000 seeded random arm configurations, When FK then IK, Then the pose is recovered within 0.5 mm and 0.5 degree, or `converged: false` is returned; no NaN in any case | N | 5.2 |
| RA-15 | Given a differential-drive odometry run with a 1 percent radius error on one wheel over 10 m, When plotted, Then the heading error is within 5 percent of 0.667 rad (arithmetic above; the physics adds slip) | N | 10.2 |
| RA-16 | Given the ROS-like graph, When a node publishes `cmd_vel` at 10 Hz for 10 virtual seconds, Then a subscriber receives exactly 100 messages at times that are multiples of 100,000,000 ns, in ten runs | B | 11.2 |
| RA-17 | Given a URDF with a `planar` joint, a `.dae` mesh, a `<gazebo>` block and xacro macros, When imported, Then the first two are loss items, the third is counted and ignored, the fourth is refused with a hint, and the rest imports | n/a | 12.1 |
| RA-18 | Given each of templates 1 (drive base, open loop), 3 (line follower) and 6 (planar arm), When exported to URDF and imported again, Then bodies, joints, masses (within 1e-9 relative) and limits are equal; the loss list equals the documented one | n/a | R-171 |
| RA-19 | Given a URDF with a billion-laughs entity or a 50 MB mesh, When imported, Then it is refused within 2 s with the reason and the app stays responsive | n/a | BUD-12, 12.1 |
| RA-20 | Given a robot project, When two buddies edit different wheels' friction at the same time, Then both edits survive in the final document (`domain.patch`) | B | Objection 2, J-09 |
| RA-21 | Given the creation-order rule, When the builder is fed the same robot with bodies listed in 20 random orders, Then the scene is created in the same order and the hash is the same | B | 4.4 rule 1 |
| RA-22 | Given a replay record from engine build A, When replayed on build B with a different WASM hash, Then replay is refused with both hashes shown | n/a | 17 |
| RA-23 | Given any robot panel, When opened, Then it shows the tier and the "What it models" and "Not modelled yet" lists of section 14, and a grep of shipped strings for "validated", "accurate", "realistic" finds none | n/a | D-007 |
| RA-24 | Given the 13 benches after the LABS phase, When opened in the ROBOT phase, Then all 106 faults and 272 steps still pass their existing tests; nothing in section 7 changes a T1 compatibility number | n/a | BRIEF 3.5 |
| RA-25 | Given a body with a 5 mm wall and a robot at 2 m/s, When validated, Then `RB-W-TUNNEL` appears; and a run through the wall at that speed is shown to tunnel without CCD and not with it | N | 4.4 rule 7 |
| RA-26 | Given the physics engine, When a page without a dynamic body loads, Then no Rapier bytes are requested | n/a | BUD-14 |
| RA-27 | Given the shipped Rapier files (WASM, wrapper and glue as served, 16.1), When the sizes are measured with brotli at quality 11 (and with the host's own encoding, both recorded), Then the total is at most 1,000,000 B (BUD-14); today 888,151 B. If the fallback of 16.1 is in force, the limit is 1,250,000 B and the budget row says so. The test also checks the sha256 of both files against the pins | n/a | BUD-14, 16.1 |
| RA-28 | Given the ROS 2 bridge helper started with a token and one allowed origin, When connections are tried with (a) a wrong `Origin`, (b) no `Origin`, (c) `Host: attacker.example:<port>` while the connection reaches 127.0.0.1 (the DNS-rebinding shape), (d) `Host: localhost.attacker.example`, (e) right `Origin` and `Host` but a wrong token and then a missing token, Then (a) to (d) are refused with HTTP 403 before the upgrade, (e) is closed with code 4401, none receives topic data, and each is counted in the helper log without the token; and (f) right `Origin`, `Host` and token connects. Also: the helper's listening address is loopback only without `--bind`; the helper refuses `--bind` without TLS; the page refuses `ws://` to a non-loopback address and does not open a socket before the person confirms; the address and token appear in no project document, op or share link | n/a | 11.3, 18 |

## 20. Build slices

Effort is ESTIMATED for one engineer who knows the repo, includes tests and a docs page, and assumes the project core, the SimWorker host (F-203) and the orchestrator (F-047) exist. It is not measured velocity. Each slice stops for Amar's OK (D-014).

| Slice | Content | Gate | Effort |
|---|---|---|---|
| R0 | Engine decision closed: artifact build script and pins (16.1), RA-01, RA-27, RA-03, RA-04, RA-05, RA-06, RA-21, RA-07 first version | engine and artifact pinned, size measured | 1 to 2 weeks |
| R1 | Scene builder, validator (4.4, 4.5), `domains.robotics` schema and ops (`domain.patch`), top-down view | RA-02 on template 1 | 2 to 3 weeks |
| R2 | Motor, driver, gearbox, servo (7), electrical coupling, battery reuse | RA-10, RA-12, RA-24 | 2 to 3 weeks |
| R3 | Sensors (8), encoder edges, loop-timing instrument, PID instrument | RA-09, RA-13 | 2 to 3 weeks |
| R4 | Checker (6.3), cause ids and detectors (13), templates 1 to 3 | RA-11, RA-02 on templates 1 to 3 | 3 to 4 weeks |
| R5 | tf, odometry, N1 and N2 libraries, templates 4, 5, 7 | RA-15 | 3 to 4 weeks |
| R6 | Kinematics and the arm (5, template 6) | RA-14 | 2 to 3 weeks |
| R7 | ROS-like graph and terminal (11.2) | RA-16 | 2 to 3 weeks |
| R8 | URDF import and export (12) | RA-17 to RA-19 | 2 to 3 weeks |
| R9 | ROS 2 bridge helper (11.3), only on a stated need | RA-28 and its own tests | 2 to 3 weeks |

Total R0 to R8: about 19 to 28 engineer-weeks, ESTIMATED; the ranges are wide because the project core and SimWorker are prerequisites owned by other documents. TECHNICAL_RESEARCH's 2 to 4 person-weeks for "a line follower and four-wheel scene with snapshot hashing" covers about R0 plus R1 plus part of R4, which fits.

## 21. Risks and unknowns

| Id | Risk or unknown | What settles it |
|---|---|---|
| RK-1 | Cross-device determinism of the engine (x86-64, Firefox, phones) | RA-01, RA-02 on those targets |
| RK-2 | Rapier JS packaging is archived upstream (EXTERNAL); the package could stop being updated or be withdrawn; the split form is derived by a string replacement in a minified file that a new patch could break | Pin the version and hashes (16.1); vendor the tarball; the script fails loudly on any change; compat fallback with BUD-14 at 1.25 MB; keep the `PhysicsBackend` interface; Jolt is the named fallback and needs a re-tuned scene (trajectories differ, RS-13) |
| RK-11 | Cargo features, wasm-bindgen version and Rust version of the shipped WASM are not recorded in the artifact (16.1) | Not needed while the bytes are pinned; needed only for a source rebuild, which would be a new artifact |
| RK-3 | Stability of very small or very light robots, high mass ratios, thin parts | RA-07 and the validator warnings |
| RK-4 | Per-module truth of driver decay modes (L298N, TB6612, A4988) | Source each descriptor; until then the label says "assumed" |
| RK-5 | Sensor numbers (beam angles, noise, heights) are unsourced | Cite datasheets into the descriptors; bench data later (F-163) |
| RK-6 | Rolling resistance and tyre friction are coefficients with no measurement | Bench measurement (F-163, F-184) is on Amar's schedule |
| RK-7 | `takeSnapshot` is untested | RA-08 |
| RK-8 | Cost of CCD, state readback and rendering | RA-07 |
| RK-9 | Whether `length_scale` 10 is ever needed | RA-03; `sa16.mjs` says scale 1 is fine for the tested scenes |
| RK-10 | The real ROS 2 bridge depends on versions of external software | the decision rule in 11.3 |

## 22. Traceability

| This file | Brief | Decision | Features and requirements | ADR |
|---|---|---|---|---|
| 3 Disposition | 3.5 | D-014 | F-057 to F-059; R-145, R-146 | ADR-0707 |
| 4 Robot in the document | 8.3, 11.1 | D-010 | F-213; R-164 | ADR-0701 |
| 5 Kinematics | 11.1 | D-013 | F-213, F-215 | ADR-0701 |
| 6 to 7 Dynamics, actuators, power | 11.1 | D-007 | F-061, F-213, F-214; R-165, R-167 | ADR-0700, ADR-0702 |
| 8 Sensors | 11.1 | D-007 | F-209; R-168 | ADR-0703 |
| 9 Control timing | 11.1 | D-010 | F-214; R-167 | ADR-0704 |
| 10 Transforms, odometry, navigation | 11.1 | D-013 | F-214 | ADR-0705 |
| 11 ROS 2 | 11.1 | D-015 | F-059, F-062; R-146, R-171 | ADR-0706 |
| 12 URDF | 11.1 | D-017 (licences of sample files) | F-062; R-171 | ADR-0706 |
| 13 Faults | 10.4 | D-010 | F-029, F-030, F-058; R-118 to R-127 | ADR-0702 |
| 15 Templates | 11.2 | D-014 | F-060, F-215; R-166, R-169 | ADR-0707 |
| 16 to 17 Performance, replay | 10.3, 19.3 | D-011 | F-186; BUD-13, BUD-14, DET-2; R-170 | ADR-0700 |

## Review fixes (2026-10-27)

| # | Issue | What I did | Where |
|---|---|---|---|
| 1 | [high] Split Rapier build undocumented; wrapper size unmeasured | Applied, with one correction of the premise. Checked npm: the unbundled `@dimforge/rapier3d-deterministic` 0.21.0 exists and has WASM bytes identical to the compat package (same sha256), so a split form is published; RS-13's "only deterministic compat build" was about compat. Added 16.1 "Build the artifact": packages and integrity values, source commit (`gitHead`), what is UNKNOWN (cargo features, wasm-bindgen and Rust versions: the artifacts do not record them), the decision not to rebuild from source, a five-step derivation recipe (script `split-build.mjs`), the output files with expected sha256, measured brotli sizes including the wrapper (total 888,151 B against 1,000,000 B), a Node run of the RS-13 scene on the derived files (hash `c6a8e92d6174bd66`, equal), alternative form S1 (estimate only) and the fallback (compat file, BUD-14 raised to 1.25 MB). Added RA-27 (size and pins) and updated RA-01, section 16 wire row, section 17 replay record, slice R0, RK-2, new RK-11, Objection 4. The ADR file itself was not edited (outside this file); it needs a pointer to 16.1 | 16.1, 19, 16, 17, 20, 21, 2 |
| 2 | [medium] Acceptance criteria name templates that do not exist | Applied. RA-02 now reads "each of templates 1 to 3", matching the R4 gate. RA-18 names templates 1, 3 and 6. 12.2 reworded to match. The four-wheel `sa16` scene is called a test fixture in RA-03, in section 15 and in the evidence table, and is not offered as a template | 19, 15, 12.2, 0 |
| 3 | [high] Encoder edges scheduled in the past | Applied. 9.2 now states the look-ahead scheme: the step at P5 of `t` takes the torque of `t`, advances to `t+h`, and enqueues edges in `(t, t+h]` as P4 events at later times; reads in `[t, t+h)` see the state of `t` through a two-buffer rule; `hash2` hashes the `prev` buffer. The latency table now has actuation lag (0 to h), state age of non-edge sensors (0 to h), edge timing and a worst case under 2h = 8.33 ms. A queue assertion halts with `event-in-past`. RA-09 rewritten to test monotone times, edges later than now, edge time against an h/16 reference, state age and actuation lag | 9.2, 17, 19 |
| 4 | [medium] ROS 2 helper exposed to hostile pages and DNS rebinding | Applied. 11.3 is now a rule table: loopback bind, Host allowlist, Origin must equal a configured origin, per-session 128-bit token in a subprotocol value, `ws://` only to loopback and `wss://` plus confirmation otherwise, address kept out of the project document, topic allowlist and limits. One addition beyond the request: the address and token never enter the document, ops or share links, so a buddy's project cannot make another browser connect anywhere. RA-28 added; section 18 row and slice R9 gate updated | 11.3, 18, 19, 20 |
| 5 | [medium] Prototype evidence only outside the repository | Applied. Scripts (`dbg`, `sa16`, `order`, `motor`, `motor2`, `prop`, `quad`, plus `split-build` and `run-split-hash`) are in `08_RESEARCH_SPIKES/DP-01-robot-prototypes/src`, raw outputs from a re-run today in `results`, with a `package.json` pinning Rapier 0.21.0 and a README. The absolute scratch paths in the Rapier scripts were replaced by the package name. The evidence table cites repo paths and carries the label "VERIFIED as a prototype, author-run, not independently checked". The re-run reproduced every quoted number except two small differences, corrected in the text: cost per PWM cycle 98 and 109 ns (now "about 100 ns"), and `quad.mjs` 1.92 and 1.99 microseconds per step. `DRONE_ARCHITECTURE.md` still quotes 1.92 and the scratch path; its owner should cite the repo folder | 0, 7.4 |

Not done, and why: the ADR-0700 file and `PRODUCT_REQUIREMENTS.md` (BUD-14 row) were not edited because they are outside this file; the BUD-14 change applies only if the fallback is taken. No browser run of the split form was made; that is RA-01.
