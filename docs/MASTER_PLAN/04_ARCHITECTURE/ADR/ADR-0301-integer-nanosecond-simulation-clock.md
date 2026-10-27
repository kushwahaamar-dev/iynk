# ADR-0301: One simulation clock: integer nanoseconds

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: `clock.ts` (microsecond float); audit A12; DET-5. Spec: SIMULATION_ARCHITECTURE.md section 5.4.
Downstream: ADR-0300, 0303, 0312; SA-06, SA-08.

## Problem

`VirtualClock.now` is a microsecond float (`clock.ts`). An AVR cycle is 62.5 ns and is not representable in whole microseconds. Flight runs at a fixed 100 Hz step and the solver has its own step, with no shared time.

## Constraints

1. Exact representation of every real clock in the first release (16 MHz, 125 MHz, 240 MHz, 100 Hz, 240 Hz, 1 MHz).
2. No accumulated rounding over long runs.
3. Cheap enough for 100 million AVR cycles per wall second (RS-03).
4. The 102 lesson reference runs must not change.

## Considered options

| Option | Verdict |
|---|---|
| A. Keep float microseconds | Rejected: 62.5 ns not exact, float drift in long runs |
| B. Float seconds | Rejected: worse for equality tests |
| C. Integer nanoseconds (`SimTime`) plus per-engine integer cycle counters and exact rational `ClockRate` | Chosen |
| D. Integer picoseconds with BigInt | Rejected: BigInt cost on every event for no gain at these clocks |

## Decision

`SimTime` is an integer count of nanoseconds since run start, `0..2^53` (about 104 days). `ClockRate { num, den }` gives nanoseconds per tick as a reduced fraction. `cyclesToNs` is `floor(cycles*num/den)`, `nsToCycles` is the ceiling so a deadline is never missed. The existing `opUs` becomes `opNs` with an exact conversion (Uno and Nano 1000, R4 400, ESP32 and S3 100, NodeMCU 250, Nucleo 250, Pico 4000, micro:bit 6000, Pi 50, FPGA 0; VERIFIED from `profiles.ts`).

## Technical justification

All six real rates in the table of 5.4 are exact as fractions. The sub-nanosecond remainder is recomputed from the engine's own cycle counter on every event, so nothing accumulates. Timers keep their `(at, seq)` order, so the migration is lossless.

## Performance data

Arithmetic stays in `number` while `cycles * num < 2^53` and falls to `BigInt` otherwise. No measurement of the BigInt path exists; SIM-0 measures it on the 16 MHz case.

## Cost implications

One conversion at the edge of each engine. Snapshots to the host stay in milliseconds as floats (`Snapshot.t`, `world.ts:40-62`).

## Licensing

None.

## Security implications

No wall-clock reads inside engines removes a timing side channel and a source of nondeterminism. A lint rule (SA-11) enforces it for the `sim/*` folders.

## Reversibility

Reverse if a run needs more than 104 days of simulated time, which is not credible for this tool. The type alias hides the representation, so a wider type is a local change.

## Migration plan

SIM-0: convert `opUs` to `opNs`; wrap `VirtualClock`; check that all 102 references produce the same `RunTrace` (SA-01).

## Known limitations

Mechanical and analog steps that are not integer nanoseconds (for example 240 Hz) are stored as rationals and rounded down at event time; the rounding is deterministic but is a model choice, recorded in the replay record.
