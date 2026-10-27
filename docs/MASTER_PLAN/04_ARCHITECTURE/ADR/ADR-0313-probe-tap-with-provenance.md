# ADR-0313: Instrumentation through a probe tap, with provenance on every reading

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: BRIEF 10.6; D-007. Spec: SIMULATION_ARCHITECTURE.md section 14.
Downstream: ADR-0302, 0314; SA-18, SA-19; F-051, F-053, F-054; R-101, R-108.

## Problem

Single numbers with false precision: a multimeter reading in a teaching model looks as trustworthy as one from a solved circuit.

## Constraints

1. All instruments (multimeter, scope, logic analyser, serial plotter) read the same way.
2. Probing must not change results.
3. Trace memory is bounded.

## Considered options

| Option | Verdict |
|---|---|
| A. Each instrument reads engine state directly | Rejected: breaks layering |
| B. One probe tap; every reading carries provenance, tier and model ids | Chosen |

## Decision

Instruments attach through a `ProbeSpec` to a read-only tap. Each reading has `provenance: 'computed' | 'approximation' | 'mocked'`, its tier and the ids of the models that produced it. Traces are ring buffers (14.4), replacing the silent 20,000-edge truncation (`world.ts:375`). In T1 the logic analyser says its edge times follow the statement cost model.

## Technical justification

Provenance on the reading lets the UI say what a number is without a separate disclaimer, and lets diagnosis evidence (ADR-0314) carry the same fields.

## Performance data

Unmeasured; trace chunks are transferable `ArrayBuffer`s at up to 30 messages per second.

## Cost implications

A tap in each engine and a ring-buffer module.

## Licensing

None.

## Security implications

Probes are read-only; probe specs from a shared project are validated and capped in number.

## Reversibility

Low risk.

## Migration plan

SIM-4.

## Known limitations

Probe loading changes nothing in the model; a real probe's loading effect is not simulated at the first release.
