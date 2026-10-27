# ADR-0715: PX4 SIH as an offline oracle first; a local bridge to SITL only on a stated need; nothing hosted

Status: proposed, 2026-10-27. Author: drone architecture seat.
Upstream: BRIEF 12.1 (PX4/ArduPilot SITL interoperability; "identify whether deeper integrations are worthwhile"); D-015; TECHNICAL_RESEARCH D7, RS-14 (no report), RS-14b; platform-options flight rows; F-074b; R-177. Spec: DRONE_ARCHITECTURE section 13.

## Problem

Would running real flight-controller code add enough value to justify its cost, and where could it run?

## Considered options

| Option | Cost (ESTIMATED) | Value | Verdict |
|---|---|---|---|
| S0 offline oracle (PX4 SIH on Amar's machine, 3 crafts, step response) | about 1 week; no runtime dependency | measures how far the TypeScript model is; sets the label | Chosen first (this is RS-14) |
| S1 local bridge (helper on the user's machine, lockstep over loopback WebSocket, about 10 HIL messages) | 4 to 6 weeks; ongoing version upkeep | tune real firmware against the simulated craft; export parameters tested on real controller code | Optional, on a stated need |
| S2 hosted SITL | per-session cost UNKNOWN and abuse handling | | Excluded by D-015 |

## Decision

S0 now (as RS-14), S1 later if Amar wants real-firmware tuning or ground-station labs, S2 never. The model label after RS-14 follows the rule in the spec: within 15 percent on rise time and overshoot for 3 craft allows "checked against a flight-controller simulation on 3 craft, within X percent" with the measured X; otherwise "Rigid-body teaching model, not checked against flight-controller firmware". The word "validated" is never used (D-007).

## Technical justification

PX4 SIH is BSD-3-Clause, headless, no external dependencies (platform-options S56). ArduPilot SITL and Betaflight SITL are GPL-3.0 (S55, S77); running them as separate processes on the user's machine avoids linking, a reading that is HYPOTHESIS and needs a lawyer if firmware is ever distributed with iynk. The external-simulator message interface for PX4 and ArduPilot's JSON interface are recalled, not fetched; verify before S1.

## Cost

As in the table. The prototype shows the controller alone can move step-response metrics by more than the 15 percent threshold (untuned 26 percent overshoot), so RS-14 must compare tuned loops on both sides.

## Licensing

PX4 BSD-3-Clause; ArduPilot and Betaflight GPL-3.0; MAVLink libraries to be checked when chosen (UNKNOWN).

## Security implications

S1 helper is local; allowlisted ports; no remote exposure; messages validated and rate limited.

## Reversibility

High. `FlightModel` can gain a third implementation behind the same interface without touching the UI.

## Migration plan

D6 runs S0; D8 (S1) only on request.

## Known limitations

PENDING RS-14: no report exists. S1 runs are not replayable. No browser build of any firmware was found.
