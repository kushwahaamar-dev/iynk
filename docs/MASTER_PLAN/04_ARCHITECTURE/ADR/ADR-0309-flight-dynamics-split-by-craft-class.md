# ADR-0309: Flight dynamics: split by craft class, keep the game model, add a 6-DoF model

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: Audit B3-09, B3-10, B3-11; DRONE ADR-0710 to ADR-0712; RS-14 not reported. Spec: SIMULATION_ARCHITECTURE.md section 11.
Downstream: DRONE_ARCHITECTURE; SA-13, SA-12; F-216 to F-218, F-074.

## Problem

`src/lib/flight/sim.ts` is a god module with scripted fault outcomes and a swept-collision gap (a 20 m/s sphere tunnels through a 0.08 m pole; HYPOTHESIS, B3-18). A real design-to-flight workflow needs a physically grounded model, but it must keep the existing 96 tests and the game feel.

## Constraints

1. 96 existing flight tests pass after any split.
2. A craft has one thrust source (DRONE ADR-0710).
3. The model must be labelled for what it is.
4. No validation data yet for 6-DoF (RS-14).

## Considered options

| Option | Verdict |
|---|---|
| A. Rewrite as 6-DoF only | Rejected: loses working game behaviour |
| B. Keep `sim.ts` as `flight-game@1` (T1) and add `multirotor-rigid@1` as a second backend | Chosen |
| C. SITL (PX4 or Ardupilot) on the user's server | Option if RS-14 shows the TypeScript model misses |

## Decision

Split `sim.ts` by craft class. The present model becomes the labelled "flight game" (`flight-game@1`, T1). Add `multirotor-rigid@1`: 6-DoF rigid body, rotor ODE from DRONE 7.1, rate loop, IMU, barometer, GPS models. Replace point collision with a swept test (SA-13). Faults are operations (ADR-0314), not scripted outcomes.

## Technical justification

The split follows the audit's recommendation and keeps tested code until a replacement is measurably better (BRIEF 3.5). The thrust constant `kT` comes from one place (DRONE ADR-0710).

## Performance data

The flight step is about 0.5 microseconds (ESTIMATED from the A12 loop); the rigid model's cost is unmeasured.

## Cost implications

Largest single modelling item after the solver; the 6-DoF validation waits for RS-14.

## Licensing

No third-party engine is adopted here. A SITL fallback would bring the licence of whichever autopilot is chosen (PX4 and Ardupilot differ), UNKNOWN until chosen.

## Security implications

Flight output is a model, never a safety statement; wording is reviewed (DRONE ADR-0716).

## Reversibility

Reverse if RS-14 shows the TypeScript model misses by 15 percent: the label stays T1 and SITL on the user's server is considered.

## Migration plan

SIM-10: module split, swept collision, rigid model, RS-14.

## Known limitations

6-DoF accuracy is PENDING RS-14. EKF, ground effect beyond the stated form and turbulence spectra are not modelled.
