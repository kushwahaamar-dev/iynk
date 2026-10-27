# ADR-0306: Compile path for real firmware: see ADR-0013 (pointer only)

Status: pointer, not a decision record, 2026-10-27. Author: simulation architecture seat.
Upstream: SIMULATION_ARCHITECTURE.md section 8.5; ADR-0013 (the only record); ADR-0427 (pointer).
Downstream: ADR-0013.

## Problem

Real firmware mode needs a compiled hex. This question had three records (ADR-0306, ADR-0013, ADR-0427) with different limits. One record is enough.

## Constraints

See ADR-0013 Constraints.

## Considered options

See ADR-0013 Considered options (server arduino-cli in a locked container, browser avr-gcc WASM, hex import).

## Decision

The decision and its rule live in `ADR-0013-compile-service-deployment-shape.md` and nowhere else. This number is kept so citations in nine other documents resolve. The single limit set is 1 GiB memory, 30 s wall time per job and 1 MiB output until RS-05 reports. Hex import is the floor and ships first.

## Technical justification

See ADR-0013.

## Performance data

See ADR-0013 (laptop 0.33 to 1.4 s from RS-03; phones and cold starts UNKNOWN).

## Cost implications

See ADR-0013.

## Licensing

See ADR-0013 (arduino-cli GPL-3.0, RS-17 PENDING).

## Security implications

See ADR-0013.

## Reversibility

See ADR-0013.

## Migration plan

See ADR-0013; SIM-6.

## Known limitations

PENDING RS-04, RS-05, RS-17 (see ADR-0013).
