# RS-13: Rapier or Jolt for robotics bodies in the browser

## Question
Rapier or Jolt for a line follower and a four-wheel robot in the browser? Both run in WASM. Is the state bit-identical after 10,000 fixed steps across runtimes, is a step under 1 ms at 20 bodies, and what do they cost in bytes?

## Why it matters
Unblocks decision D6 (physics and robotics engine). The master plan leans to Rapier (Apache-2.0). This spike checks that the lean holds on determinism, speed and size, and whether Jolt is a better choice.

## Exit condition (copied from TECHNICAL_RESEARCH.md section 6, row 17)
Pass: identical snapshot hash after 10,000 steps on two browsers, step under 1 ms at 20 bodies, size within budget. No budget exists yet, so one is proposed below and labelled HYPOTHESIS.

## Environment
| Item | Value |
|---|---|
| Machine | Apple M4 Pro, 14 cores, arm64, macOS 27.0.1 (Darwin 27.0.0) |
| Node | v24.8.0 (npm 11.6.0) |
| Chromium | 156.0.8078.4 (Playwright 1.64.1 build), headless |
| WebKit | 27.2 (Playwright 1.64.1 build), headless |
| Rapier | `@dimforge/rapier3d-deterministic-compat` 0.21.0, Apache-2.0. This is the deterministic build with the WASM embedded as base64. It was the only deterministic 3D "compat" build on npm. |
| Jolt | `jolt-physics` 1.1.1 (JoltPhysics.js), MIT. Tested flavour: `wasm` (separate .wasm file, single thread). |
| Playwright | 1.64.1, Apache-2.0 |
| Load | uptime load average 2.1 to 4.0 across all timings (below the limit of 10). Another spike lane ran at the same time. |

Sources: npm registry (npmjs.com/package/@dimforge/rapier3d-deterministic-compat, npmjs.com/package/jolt-physics). Installed in `/Users/amar/iynk-master-plan-scratch/spikes/RS-13`, never in the repo.

Jolt note: the package README lists an `asm` (asm.js) flavour, but the 1.1.1 tarball has no asm.js file in `dist/`. Not tested.

## Method
One scene, written once as data (`src/common.mjs`), built by two small adapters (`src/rapier-run.mjs`, `src/jolt-run.mjs`).

- Ground: static box 100 x 1 x 100 m, friction 0.8.
- Robot A, four wheels: chassis box 0.24 x 0.08 x 0.36 m plus four cylinder wheels (radius 0.05 m), each on a revolute joint with a velocity motor (torque cap 2 Nm). 5 bodies.
- Robot B, line-follower size: chassis box 0.08 x 0.03 x 0.10 m, two wheels (radius 0.02 m) on motorised revolute joints (torque cap 0.05 Nm), and a frictionless caster ball fixed under the rear of the chassis. 3 bodies.
- 12 obstacles (boxes, cylinders, balls) placed in the paths of the robots. 
- Total: 20 dynamic bodies, 6 revolute motor joints, plus the static ground. Sleeping is off, so this is the worst case for step time.
- Both robots follow a scripted command table (10 segments of 1,000 steps: forward, arc, reverse, spin, stop). The motor target is set every step before stepping. Both robots collide with obstacles.
- 10,000 steps of fixed dt = 1/240 s, one sub-step, gravity -9.81.
- State hash: every 1,000 steps, positions (x y z) and rotation quaternions (x y z w) of all 20 bodies, as float32 bit patterns, folded into two 32-bit hashes (16 hex chars). Any NaN or Inf bit pattern is counted (it was 0 everywhere).
- Each step is timed with `performance.now()` around the step call only. Browser timers are coarse (Chromium 100 us, WebKit 1 ms), so the per-step p95 in browsers is the timer quantum and means nothing. I report mean over 10,000 steps, and p95 of 100-step batch means ("p95 batch") for all runtimes. Only Node has a true per-step p95.
- Each runtime ran each engine 3 times (2 times for the throttled runs) in the same process or page, each with a fresh world. Run 1 includes JIT warm-up.
- Chromium CPU throttling 4x and 6x via CDP `Emulation.setCPUThrottlingRate`.

## Results

### Determinism (final hash after 10,000 steps)
| Runtime | Rapier final hash | Jolt final hash | Runs | All 10 checkpoint hashes equal to Node? |
|---|---|---|---|---|
| Node 24.8.0 | c6a8e92d6174bd66 | 4b0f9eda5752860e | 3 each | reference; all 3 runs identical |
| Chromium 156 | c6a8e92d6174bd66 | 4b0f9eda5752860e | 3 each | yes, both engines; all 3 runs identical |
| WebKit 27.2 | c6a8e92d6174bd66 | 4b0f9eda5752860e | 3 each | yes, both engines; all 3 runs identical |
| Chromium, 4x CPU throttle | c6a8e92d6174bd66 | 4b0f9eda5752860e | 2 each | yes |
| Chromium, 6x CPU throttle | c6a8e92d6174bd66 | 4b0f9eda5752860e | 2 each | yes |

Rapier and Jolt hashes differ from each other at every checkpoint, as expected (different solvers, different friction combining). The hash is therefore sensitive to the physics, but I did not run a separate one-ulp perturbation control. Both robots end in different places in the two engines (A at (1.72, 0.05, -2.48) in Rapier, (1.10, 0.05, -2.55) in Jolt), which is a behaviour difference, not a bug in either; the scene is chaotic after collisions.

### Step time at 20 bodies (microseconds; load 2 to 4)
Mean over 10,000 steps, then p95 of 100-step batch means. Runs listed in order (run 1 includes warm-up).

| Runtime | Engine | Mean us (run 1 / 2 / 3) | p95 batch us (run 1 / 2 / 3) | Per-step p95 us | Worst single step ms (run 1 / 2 / 3) |
|---|---|---|---|---|---|
| Node | Rapier | 85.9 / 77.8 / 79.3 | 107 / 95 / 103 | 111 / 97 / 103 | 26.7 / 1.6 / 2.5 |
| Node | Jolt | 91.5 / 93.2 / 90.2 | 102 / 108 / 98 | 106 / 108 / 103 | 2.8 / 1.4 / 0.3 |
| Chromium | Rapier | 80.2 / 71.6 / 72.0 | 104 / 89 / 89 | timer quantum | 24.7 / 0.5 / 0.3 |
| Chromium | Jolt | 87.9 / 86.1 / 85.3 | 97 / 97 / 94 | timer quantum | 2.4 / 0.2 / 0.2 |
| WebKit | Rapier | 89.4 / 86.5 / 86.8 | 110 / 110 / 110 | timer quantum | 5 / 1 / 1 |
| WebKit | Jolt | 86.0 / 83.7 / 84.0 | 100 / 90 / 90 | timer quantum | 2 / 1 / 1 |
| Chromium 4x throttle | Rapier | 312 / 290 | 394 / 361 | n/a | 104 / 3.2 |
| Chromium 4x throttle | Jolt | 361 / 357 | 397 / 391 | n/a | 9.4 / 3.1 |
| Chromium 6x throttle | Rapier | 467 / 436 | 590 / 549 | n/a | 157 / 5.1 |
| Chromium 6x throttle | Jolt | 545 / 537 | 608 / 586 | n/a | 13.6 / 5.2 |

Reading: both engines take about 0.07 to 0.09 ms per step at 20 bodies on this machine in all three runtimes, which is roughly 10x under the 1 ms bound. With 6x CPU throttle the mean is 0.44 to 0.54 ms and the batch p95 is 0.55 to 0.61 ms, still under 1 ms. The two engines are within about 15 percent of each other. Rapier has one large first-step stall in run 1 (24 to 27 ms in Node and Chromium, 5 ms in WebKit; 157 ms under 6x throttle), which Jolt does not (2 to 14 ms). Treat it as a warm-up cost: do a dummy step during load. Single steps in the later runs reached 5 ms under 6x throttle, so one outlier in a frame is possible on slow devices (not measured on real devices).

### Size
| File | Raw bytes | gzip -9 | brotli -q 11 |
|---|---|---|---|
| Rapier deterministic: `rapier_wasm3d_bg.wasm` | 3,105,893 | 1,173,133 | 855,167 |
| Rapier deterministic: `rapier_wasm3d.js` (wasm-bindgen glue) | 342,560 | 34,682 | 27,183 |
| Rapier deterministic: `rapier.mjs` (all JS + WASM as base64, "compat") | 4,372,012 | 1,659,390 | 1,201,977 |
| Rapier non-deterministic `rapier3d-compat` 0.21.0 `.wasm` (for reference) | 3,082,103 | 1,168,729 | 852,125 |
| Jolt `jolt-physics.wasm.wasm` | 2,024,218 | 744,972 | 511,202 |
| Jolt `jolt-physics.wasm.js` (loader and glue) | 970,094 | 135,952 | 95,040 |
| Jolt `jolt-physics.wasm-compat.js` (WASM as base64) | 3,231,626 | 909,463 | 627,197 |
| Jolt `jolt-physics.multithread.wasm.wasm` | 2,466,172 | 711,192 | 469,870 |

Totals for a split load (WASM file plus JS): Jolt about 3.0 MB raw, 0.88 MB gzip, 0.61 MB brotli. Rapier about 3.45 MB raw (WASM plus glue, without the TypeScript wrapper, which I did not measure alone), 1.21 MB gzip, 0.88 MB brotli; the single-file compat build is 4.37 MB raw, 1.66 MB gzip, 1.20 MB brotli. Jolt is about 30 percent smaller on the wire. The Rapier wrapper alone is roughly 0.23 MB raw, derived as rapier.mjs minus base64 of the wasm (4,372,012 - 4,141,192); this is an estimate.

### API ergonomics
- Rapier: about 66 lines for the whole adapter. Plain objects, a joint is one call (`JointData.revoluteWithAxes`, then `configureMotorVelocity(target, damping)` each step, `setMotorMaxForce`). Garbage-collected wrappers; only `world.free()` needed. `body.translation()` returns a new object each call.
- Jolt: about 101 lines. Needs layer filters and a broad-phase interface before the first body, explicit `new Jolt.Vec3(...)` and `Jolt.destroy(...)` for every temporary (my spike leaks a few small ones), `Jolt.castObject` for constraints, and shape settings built as separate objects. Material properties are set per shape (density) and per body (friction). Closer to the C++ API, more boilerplate, easier to leak memory.
- Both: hinge motors work with a few lines. In Rapier the motor needs `MotorModel.ForceBased` and an explicit torque cap to behave like a torque-limited motor; in Jolt the cap is `mMinTorqueLimit` and `mMaxTorqueLimit`.

```js
// Rapier: a motor wheel
const j = world.createImpulseJoint(RAPIER.JointData.revoluteWithAxes(a1, a2, {x:1,y:0,z:0}, {x:0,y:1,z:0}), chassis, wheel, true);
j.configureMotorModel(RAPIER.MotorModel.ForceBased); j.setMotorMaxForce(2.0);
j.configureMotorVelocity(10, 10);              // each step

// Jolt: a motor wheel
const hs = new Jolt.HingeConstraintSettings(); /* space, 2 points, 2 axes, 2 normals, torque limits */
const c = Jolt.castObject(hs.Create(chassis, wheel), Jolt.HingeConstraint);
physics.AddConstraint(c); c.SetMotorState(Jolt.EMotorState_Velocity);
c.SetTargetAngularVelocity(10);                // each step
```

## Verdict: PASS
- Identical snapshot hash after 10,000 steps: yes. Node, Chromium and WebKit give the same hash for both engines at all 10 checkpoints, and repeat runs in one runtime are identical. Chromium under 4x and 6x CPU throttle also match.
- Step under 1 ms at 20 bodies: yes. Mean 0.07 to 0.09 ms unthrottled; mean 0.44 to 0.54 ms and batch p95 at most 0.61 ms at 6x throttle. The worst single steps were 1 to 5 ms in warmed runs under throttle, so p99.9 is not under 1 ms on a slow device. The criterion is read as mean and p95, which pass.
- Size within budget: no budget existed. Proposed budget below is HYPOTHESIS; both engines fit it with the split build.

HYPOTHESIS budget: physics engine loaded lazily only on pages that need rigid-body robotics, at most 1.0 MB over the wire (brotli) and at most 4 MB raw WASM. Jolt split build (0.61 MB brotli) fits. Rapier split build (about 0.88 MB brotli) fits narrowly; the single-file compat build (1.20 MB brotli) does not.

## Caveats
- The device question stays open. I have no phone or Chromebook. 4x and 6x Chromium throttling approximates a slower CPU for compute, not memory bandwidth or thermal throttling. It does not test mobile Safari, Firefox, or Android browsers.
- Determinism was tested on one CPU architecture (arm64). Both builds are WASM, which defines IEEE 754 float semantics except for NaN bit patterns (none occurred), so x86-64 should match, but I did not run x86-64 or Firefox. Firefox was not installed and is untested.
- Jolt's own README says `-DCROSS_PLATFORM_DETERMINISTIC=ON` is a build flag. I did not check whether the npm build sets it; the result here only shows that the shipped WASM was reproducible across three runtimes on one machine.
- The scene is small and chaotic but has no stacking, no large piles, no fast projectiles. Hash match on 10,000 steps does not prove it for every scene. Sleeping was disabled; sleeping bodies would be cheaper.
- Rapier and Jolt do not give the same trajectories. Behaviour differences (friction combine rule, solver) mean a scene tuned in one will not behave the same in the other.
- I used metre units with centimetre-scale parts (a 5 cm wheel). Jolt needed convex radius set by hand for small shapes. Rapier was left at its defaults; neither engine was tuned for small scale, and robot stability (e.g. Jolt chassis sat 1 mm low) was not studied.
- Timing is one laptop at load 2 to 4. Timer resolution limits browser per-step percentiles (see Method).
- Only the single-threaded builds were tested. Jolt's multithread flavour needs cross-origin isolation and was only sized, not run.
- Hash covers positions and rotations, not velocities or joint angles.

## What this means for the architecture
Both engines meet the determinism and speed bars, so the choice rests on other things. HYPOTHESIS: keep Rapier (Apache-2.0, plain JS API, the deterministic build is a first-class npm package, smaller code to maintain) as the default for robotics bodies, load it lazily in a Web Worker with a warm-up step, and treat the 0.9 to 1.2 MB brotli cost as the price. Jolt is a viable fallback with a smaller payload (about 0.6 MB brotli) and no first-step stall, at the cost of a heavier API and manual memory management. Replays and shared-room lock-step on the same engine build look feasible, since hashes match across three runtimes; this must be re-checked on Firefox, x86-64 and real phones before it is relied on. Do not mix engine versions between clients: pin the exact package version in the replay file.

## How to reproduce
```sh
mkdir -p /Users/amar/iynk-master-plan-scratch/spikes/RS-13 && cd /Users/amar/iynk-master-plan-scratch/spikes/RS-13
cp -r <repo>/docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-13-physics-determinism/src .
npm init -y && npm i @dimforge/rapier3d-deterministic-compat@0.21.0 jolt-physics@1.1.1 playwright@1.64.1
npx playwright install chromium webkit          # if browsers are not cached
node src/node-run.mjs > node.json && python3 src/summ.py node.json
node src/pw-run.mjs chromium 1 3 > chromium.json && python3 src/summ.py chromium.json
node src/pw-run.mjs webkit 1 3 > webkit.json && python3 src/summ.py webkit.json
node src/pw-run.mjs chromium 6 2 > chromium-x6.json && python3 src/summ.py chromium-x6.json
```
`pw-run.mjs` serves the folder on 127.0.0.1:43811 and kills the browser and server on exit. Raw output of this run is in `src/results/`. Compare the `finalHash` / `hashes` fields across files.

## Independent check (2026-10-27)

What I ran: the reproduce command for Node, Chromium (1x) and WebKit (1x), 3 runs each, in `/Users/amar/iynk-master-plan-scratch/spikes/RS-13/` with its installed dependencies. I did not re-run the 4x and 6x throttle runs or the size table. Same Node v24.8.0, Chromium 156.0.8078.4, WebKit 27.2. The scratch `src/` equals the repo `src/` except for an extra `sanity.mjs` in scratch (not in the repo copy). Load average was 3.7 to 5.1 (below 10). Output was written to the session scratchpad, not over the original JSON files.

Determinism (tolerance: exact match, no tolerance):
| Runtime | Rapier final hash | Jolt final hash | Checkpoint hashes |
|---|---|---|---|
| Node | c6a8e92d6174bd66 | 4b0f9eda5752860e | all 3 runs identical |
| Chromium | c6a8e92d6174bd66 | 4b0f9eda5752860e | all 3 runs identical |
| WebKit | c6a8e92d6174bd66 | 4b0f9eda5752860e | all 3 runs identical |

I compared all 10 checkpoint hashes across all 9 runs per engine: one distinct sequence per engine. NaN or Inf words: 0. This reproduces the report exactly.

Step time (tolerance used: within 15 percent of the report's mean):
| Runtime | Engine | Mean us, runs 1/2/3 | p95 batch us | Report mean us |
|---|---|---|---|---|
| Node | Rapier | 91.4 / 83.1 / 82.6 | 114 / 100 / 103 | 85.9 / 77.8 / 79.3 |
| Node | Jolt | 98.3 / 98.7 / 98.8 | 112 / 108 / 110 | 91.5 / 93.2 / 90.2 |
| Chromium | Rapier | 85.7 / 79.4 / 78.6 | 109 / 99 / 97 | 80.2 / 71.6 / 72.0 |
| Chromium | Jolt | 98.5 / 96.9 / 96.8 | 110 / 107 / 106 | 87.9 / 86.1 / 85.3 |
| WebKit | Rapier | 96.6 / 92.8 / 92.5 | 120 / 110 / 110 | 89.4 / 86.5 / 86.8 |
| WebKit | Jolt | 95.9 / 93.2 / 93.6 | 110 / 100 / 100 | 86.0 / 83.7 / 84.0 |

My means are 5 to 13 percent higher than the report's, consistent with my slightly higher load (4 to 5 versus 2 to 4). All are inside the 15 percent tolerance, and all are about 10x under 1 ms. The first-step stall also reproduced (Rapier run 1 max: 33 ms Node, 28 ms Chromium, 5 ms WebKit; Jolt 2 to 3 ms). Init time: Chromium 12 ms Rapier / 29 ms Jolt, WebKit 14 / 40 ms (not in the original report).

Judgement:
- Numbers match. The headline (identical hash, step well under 1 ms) is reproduced. Throttled runs and sizes were not re-checked.
- The PASS follows from the exit condition as written ("two browsers", step under 1 ms at 20 bodies), with two generous readings that the report mostly discloses. (1) "Step under 1 ms" is read as mean and batch p95. Worst single steps reach 1 to 5 ms warmed under throttle and 25 to 33 ms for Rapier's first step, so a strict per-step reading would fail on slow devices. (2) "Size within budget" is judged against a budget the spike wrote itself, so that part is close to self-grading. Rapier fits it only narrowly in the split form and not at all in the single-file compat form, which is the form actually tested for determinism. I would call the size leg "not decidable until a real budget exists" rather than PASS.
- Method: it measures the stated question, not a proxy, for the "same build, same machine, different JS engines" case (V8 in Node and Chromium, JavaScriptCore in WebKit). That is a real test of cross-engine WASM float behaviour. It is not a test of different CPUs. Both browsers ran on the same Apple-silicon CPU, so "two browsers match" is weaker evidence for cross-device lock-step than the report's wording suggests. The report does say x86-64, Firefox and phones are untested; keep that as the main open item. The hash folds positions and quaternions as float32, so it would miss differences below float32 precision, and it has no perturbation control (the report says this).
- Fairness: both engines use the same scene data, dt, motor script and obstacle set from `common.mjs`. Friction combine rules, solvers and Jolt's hand-set convex radius differ by engine, so trajectories differ (stated). Timing covers the step call only, not state readback (`translation()` allocation in Rapier, `GetPosition` in Jolt), so a render loop that reads all bodies each frame will cost more than the table shows. Playwright headless WebKit on macOS is not iOS Safari.
- Correction to caveats: add that the PASS covers the engine builds on one CPU architecture only, that step time excludes state readback, and that the size leg rests on a self-proposed budget. Verdict otherwise stands: PASS on determinism and speed, with size undecided.
