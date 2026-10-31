# ADR-0711: Propulsion is a closed-form motor and propeller solve with a datasheet fit and an error band

Status: proposed, 2026-10-27. Author: drone architecture seat.
Upstream: BRIEF 12, 12.1 (motor response, thrust curves, propeller models, battery sag, power); D-007; R-173, R-FID-6; ADR-0710. Downstream: F-064, F-073, F-216. Spec: DRONE_ARCHITECTURE section 6.

## Problem

Thrust and current come from a constant per craft. A user part has no such constant, and a single number with no error band is false precision.

## Considered options

| Option | Verdict |
|---|---|
| A. Equivalent DC motor plus propeller coefficients, closed form, fit two scalars to supplied rows | Chosen |
| B. Interpolate manufacturer tables only | Offered as `kind: table` for parts that supply dense data; not the default: it extrapolates badly in voltage |
| C. Blade-element momentum theory | Rejected: needs blade geometry nobody has for hobby props |
| D. Keep per-craft regressions | Rejected for user parts (ADR-0710) |

## Decision

`T = kT w²`, `Q = kQ w²`, motor torque `kt (I - I0)`, balance gives a quadratic in `w` with a closed-form positive root; pack sag by a three-pass fixed point in the static solver and by the previous step in the dynamic one. Inflow loss by `ct(J)` table or a linear fall to zero near `0.9 P/D`. The fit estimates `ct0` and `cp0` by fixed-iteration Gauss-Newton and reports RMS relative residuals as the band, with "within the range of your data" labelling. Hover endurance is time-stepped through the battery model and reported as a range.

## Technical justification

Prototype: torque residual 6e-16 N·m; illustrative 5-inch case gives 11.39 N and 31.7 A at full throttle (`prop.mjs`). The closed form needs no iteration so it is deterministic and fast. Propeller theory puts zero thrust near the ideal-screw advance ratio `P/D` (EXTERNAL); the 0.9 factor is an assumption.

## Cost

Part of slice D1. Per evaluation: one square root per motor; the endurance integration is about 600 to 1,800 steps of a few operations (ESTIMATED).

## Licensing

None. Data licences per ADR-0710.

## Security implications

The fit runs on at most 32 rows with fixed iteration counts; no unbounded loops from user data.

## Reversibility

High. The model is a pure function behind `PropulsionModel`; a table model can replace it per part.

## Migration plan

Introduced with D1; compared against the legacy calculator on the 13 crafts' default builds, with differences reported, not hidden.

## Known limitations

No heating, no ESC timing effects, no stall, no rotor-rotor interaction, no ground effect. The band describes fit to the supplied rows, not agreement with a real part.
