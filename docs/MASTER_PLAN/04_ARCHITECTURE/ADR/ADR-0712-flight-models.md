# ADR-0712: Two flight models behind one interface, the preserved game model and a new 6-DoF rigid-body model

Status: proposed, 2026-10-27. Author: drone architecture seat.
Upstream: BRIEF 12.1 (six degrees of freedom, drag, motor response, thrust curves, battery sag, collisions, deterministic replay); D-007, D-014; ADR-0309, ADR-0303; flight.md; A12; B3-09 to B3-12, B3-18; R-174, R-180. Downstream: F-068 to F-072, F-074a, F-217. Spec: DRONE_ARCHITECTURE section 7.

## Problem

The present model is a point mass with kinematic attitude, no inertia, no PID and no sensors. It is good for feel and bad for tuning, faults that emerge from physics, and traces of motor outputs.

## Considered options

| Option | Verdict |
|---|---|
| A. Keep the game model as `flight-game@1`; add `multirotor-rigid@1`; user builds can fly either | Chosen |
| B. Replace the game model | Rejected: BRIEF 3.5; its coupling to the catalogue and 96 tests are its value |
| C. Build the rigid model on the Rapier engine | Rejected for v1: it adds 0.88 MB to drone pages and a contact solver the dynamics do not need; the aerodynamic forces are ours either way. Handing a crashed body to Rapier for tumble is a later option |
| D. Only a firmware simulation | Rejected: no browser build exists (research dossier) |

## Decision

`FlightModel` interface of ADR-0309. `multirotor-rigid@1`: state `p, v, q, w_b, omega_i`; rotor ODE `J_r dω/dt = tau_motor - Q`; full 3 x 3 inertia tensor with products; gyroscopic terms; per-axis drag; RK4 at a fixed 1 kHz (2 or 4 kHz allowed); quaternion renormalised; sensors, complementary estimator, cascaded PID and mixer inside the same tick; swept collision. The game model is split by craft class (SA-13) and otherwise unchanged. Ghosts, bests and medals are keyed by `(course, model id)`.

## Technical justification

Prototype (`quad.mjs`): hover command equals the analytic value; 100 deg/s step: rise 85 ms, overshoot 26 percent with untuned gains; RK4 1 kHz vs 10 kHz reference 1.5e-12 rad/s; Euler 2.4e-6; two runs bit-identical; 1.92 microseconds per step including PID and logging. This shows the model is cheap and that RK4 and Euler both suffice on that scenario; DA-08 decides on a harder one.

## Cost

Slice D3: 6 to 8 weeks, ESTIMATED. Runtime ESTIMATED under 10 microseconds per step with sensors and estimator; DA-22 measures at 6x throttle.

## Licensing

None; code written new from equations and public documentation.

## Security implications

Pure computation in a Worker; NaN halts with `numeric-fault`; parameters range-checked.

## Reversibility

High. `FlightModel` is an interface; a SITL-backed model can be a third implementation.

## Migration plan

D0 split and swept collision; D2 user builds on the game model; D3 rigid model; D4 traces.

## Known limitations

Validation against a real controller is PENDING RS-14. Cross-engine determinism needs `dmath` (class N until SA-12). Fixed-wing, VTOL, tricopter and swarm stay in the game model. No ground effect, rotor interaction, flexible frame or vibration.
