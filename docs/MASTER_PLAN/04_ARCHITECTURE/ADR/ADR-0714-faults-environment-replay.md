# ADR-0714: Drone faults come from the dynamics; wind, noise and failures are seeded and recorded; traces are columnar data

Status: proposed, 2026-10-27. Author: drone architecture seat.
Upstream: BRIEF 12.1 (wind, sensor failures, deterministic replay, flight envelopes); D-010; ADR-0303, ADR-0312, ADR-0314; SIM_ARCH 6.5, 12.1, 13; F-209, F-217, F-218; R-175, R-176, R-180. Spec: DRONE_ARCHITECTURE sections 9 to 11.

## Problem

Faults today are booleans that add fixed rotation rates; there is no noise; the wind is two sines; replay records only actions; there are no traces.

## Considered options

| Option | Verdict |
|---|---|
| A. Faults as operations on the model or environment; effects emerge from the dynamics; seeded streams; replay record plus columnar traces | Chosen |
| B. Keep scripted outcomes | Kept only inside `flight-game@1` |
| C. Record full state every step | Rejected: size (see cost) |

## Decision

Fault kinds: motor out, direction reversed, propeller swapped or damaged, FC orientation, sensor dropout, stuck, bias, noise multiply, GPS loss, link loss, battery degrade, ESC desync, FC brown-out. Wind: mean plus Ornstein-Uhlenbeck gusts (exact discretisation, stream `wind`) plus optional discrete 1-cosine gusts; density from temperature and pressure. A grep test forbids fixed rotation-rate constants in the rigid model. Replay record gets the model id and version; checkpoints each 1,000 ms; class N before `dmath`, class B after. `FlightTrace` stores up to 48 channels at 100 Hz plus 2 s full-rate windows around events, capped at 20 MB, in `assets`.

## Technical justification

A reversed FC becomes a frame error in the estimator, which gives positive feedback through the controller (derived, not injected). Storage arithmetic: 40 channels x 100 Hz x 60 s x 4 bytes = 0.96 MB per minute.

## Cost

Slices D4 and D5, 5 to 7 weeks combined, ESTIMATED.

## Licensing

None.

## Security implications

Replay logs and traces are validated like projects; caps on length and channel count; a trace is data, never code.

## Reversibility

High. Fault kinds are additive; the trace format is versioned.

## Migration plan

D4 traces and comparison; D5 environment and failures.

## Known limitations

Sensor noise defaults are unsourced (DK-7). Dryden or von Karman turbulence, shear and ground effect are not modelled. Motor-out survival on hex or octo depends on the mixer, which has no fault-tolerant mode in v1.
