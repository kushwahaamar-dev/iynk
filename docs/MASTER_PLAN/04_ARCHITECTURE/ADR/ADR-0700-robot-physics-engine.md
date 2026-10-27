# ADR-0700: Robot physics runs on Rapier, one engine for planar and 3D robots

Status: proposed, 2026-10-27, for the ROBOT gate (D-014). Author: robotics architecture seat.
Upstream: BRIEF 11.1; D-007, D-011, D-013, D-015; RS-13 (PASS on determinism and speed, size undecided); ADR-0308; R-165, R-170, BUD-13, BUD-14, DET-2. Downstream: F-061, F-213, F-214, F-186. Spec: `04_ARCHITECTURE/ROBOTICS_ARCHITECTURE.md` sections 4.4, 6.2, 16, 17.

## Problem

ADR-0308 chose Rapier behind a `PhysicsBackend` interface and left open whether a separate 2D integrator should serve the first robot. Two facts since then: the RS-13 independent check says the determinism result was measured on the single-file compat build while the size budget only fits the split build; and scratch runs show that scene creation order and the sleeping flag change the hash.

## Constraints

1. Same project, seed and engine build give the same hash (class B). 2. Step under 1 ms at 20 bodies (BUD-13), also at 6x throttle. 3. Engine at most 1.0 MB over the wire, loaded only on projects that need it (BUD-14, HYPOTHESIS budget). 4. Runs in the SimWorker. 5. Nothing hosted (D-015). 6. Apache-2.0 or MIT.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Rapier deterministic build for all robots | One engine, one hash method. 0.07 to 0.09 ms per step at 20 bodies (RS-13) | Chosen |
| B. Own TypeScript 2D integrator for planar robots, Rapier for 3D | Small, no WASM, class B by construction | Rejected: two behaviours to keep consistent; RS-13 and `sa16.mjs` show the engine handles a four-wheel robot at 0.5 mm lateral drift in 4 m with defaults |
| C. Jolt | 0.61 MB brotli split build, no first-step stall, heavier API with manual memory | Named fallback behind the same interface |
| D. MuJoCo WASM | Contact-rich arms | Rejected for now: README says "still a WIP" (platform-options S50) |

## Decision

Rapier (`@dimforge/rapier3d-deterministic-compat` 0.21.0 as measured) in the SimWorker, behind `PhysicsBackend`. Rules that are part of the decision: the scene is built in canonical id order; sleeping is off; friction and restitution combine rules and the solver iteration count are set explicitly and recorded; motor torque is applied as `applyTorqueImpulse(tau * dt)` and `addTorque` is banned; `length_scale` (1 or 10) lives in the adapter and the replay record; the exact WASM sha256 is recorded in every replay; one dummy step runs at load.

## Technical justification

- RS-13: identical hashes in Node, Chromium and WebKit, also at 4x and 6x throttle; mean step 0.072 to 0.089 ms (0.436 to 0.467 ms at 6x).
- `order.mjs` (VERIFIED prototype): the same scene created in four wheel orders gives three different hashes and a 10 mm position difference after contact; sleeping on gives another hash. So the rules above are required, not tidy.
- `dbg.mjs`: `addTorque` each step gave 3.70 times the analytic speed; `applyTorqueImpulse` gave 0.002 percent error.
- `sa16.mjs`: four-wheel robot, 10 s: lateral drift 0.5 mm (0.013 percent) at scale 1.

## Cost

Wire size: split build about 0.88 MB brotli; single-file compat 1.20 MB (RS-13). Engineering: 2 to 4 person-weeks for line-follower and four-wheel scenes with hashing (TECHNICAL_RESEARCH, ESTIMATED).

## Licensing

Rapier Apache-2.0, Jolt MIT (RS-13). The JS bindings repository is archived upstream (platform-options row 3, EXTERNAL); the npm package at 0.21.0 was still published on 2026-09-25.

## Security implications

WASM runs in a Worker with no I/O. Scenes are bounded by the validator (64 bodies, 32 joints in v1, HYPOTHESIS) and a NaN or divergence halts the engine with a report.

## Reversibility

High. `PhysicsBackend` hides the engine; the backend name and version are in every replay; Jolt can replace it at the price of re-tuned scenes.

## Migration plan

R0 closes the open items (RA-01 on the shipped artifact, RA-03, RA-04, RA-05, RA-06, RA-21, RA-07 first version), then R1.

## Known limitations

Determinism measured on arm64 only; Firefox, x86-64 and phones untested. Snapshot and restore untested (RA-08). CCD cost unknown. The first-step stall (24 to 27 ms, 157 ms at 6x) is handled by a dummy step. Package maintenance risk (RK-2).
