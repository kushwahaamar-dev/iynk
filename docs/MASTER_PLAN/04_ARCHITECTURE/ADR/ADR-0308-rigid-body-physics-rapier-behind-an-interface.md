# ADR-0308: Rigid-body physics: Rapier (deterministic build) behind a PhysicsBackend interface

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: RS-13 (PASS on determinism and speed, size undecided); ROBOTICS ADR-0700. Spec: SIMULATION_ARCHITECTURE.md section 10.
Downstream: ADR-0309; ROBOTICS_ARCHITECTURE; SA-12, SA-16; F-213, F-214, F-061; BUD-13, BUD-14.

## Problem

The robot lab needs rigid bodies, joints and contacts that replay identically. The current robot code is not a physics engine. Candidate engines must be deterministic across the browsers that matter.

## Constraints

1. Same trajectory and hash across Node, Chromium and WebKit (Firefox and x86-64 still to test).
2. Small wire size on a phone.
3. Replace-able, because the two candidates do not produce the same trajectories.
4. Sleeping is off in v1.

## Considered options

| Option | Verdict |
|---|---|
| Rapier 0.21.0 deterministic, split build | Chosen |
| Jolt 1.1.1 | Named fallback |
| Write own | Rejected |

## Decision

Rapier in the simulation worker behind a `PhysicsBackend` interface with `SceneSpec` input (10.2). Engine version and the `lengthScale` are pinned in every replay record. Joint torque is applied as `applyTorqueImpulse(tau * dt)` on the child and the opposite on the parent; `addTorque` and `addForce` are forbidden in `sim/mech` (lint, SA-11).

## Technical justification

RS-13: final hash `c6a8e92d6174bd66` after 10,000 steps in Node 24.8, Chromium 156 and WebKit 27.2, also at 4x and 6x throttle. Mean step 0.072 to 0.089 ms (0.436 to 0.467 ms at 6x). A prototype showed `addTorque` accumulates to 3.70 times the analytic wheel speed while the impulse form is within 0.002 percent (VERIFIED prototype, ROBOTICS 6.2).

## Performance data

Rapier wire size about 0.88 MB brotli split build, 1.20 MB single file; Jolt about 0.61 MB. First step stalls 24 to 27 ms in Node and Chromium (157 ms at 6x). Step time excludes state readback (RS-13 independent check).

## Cost implications

0.27 MB more over the wire than Jolt, inside the proposed 1.0 MB budget only as the split build (BUD-14 is a HYPOTHESIS budget).

## Licensing

Rapier Apache-2.0; Jolt MIT (RS-13).

## Security implications

Scene caps (bodies, colliders, joints) bound work from imported or AI-made robots; the engine runs inside the worker with the step and slice limits.

## Reversibility

Reverse if Firefox or x86-64 hashes differ: switch to the engine that matches, or fix the pin. The interface is the seam.

## Migration plan

SIM-9 (physics backend, motor coupling, sensors from bodies); exit SA-16 and the SA-12 Rapier clause.

## Known limitations

Hash was tested on arm64 only and covered positions and rotations, not velocities or joint angles (`hash2` adds them). Small-scale stability and per-pair contact impulses are not exercised yet (SA-16, RA-03, RA-07). Snapshot-then-restore equality is UNKNOWN until RA-08; keyframe replay every 5 simulated seconds is the fallback.
