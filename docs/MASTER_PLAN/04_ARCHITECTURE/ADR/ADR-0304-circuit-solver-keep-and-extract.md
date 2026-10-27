# ADR-0304: Circuit solver: keep the MNA core, extract it as a pure module, ngspice as oracle

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: RS-08 (a) 20 of 20 matched, 10 of 20 against realistic models, (b) not run; RS-07 no report; audit `figure-engine.md`. Spec: SIMULATION_ARCHITECTURE.md section 7.
Downstream: ADR-0314; SA-02 to SA-05, SA-07; F-042, F-045, F-046; R-046, R-099, R-100, R-105.

## Problem

The 431-line DC solver in `figures/engine/bench-solve.js` solves resistive circuits correctly (RS-08: 67 resistive networks, worst relative difference 8.7e-13) but has global state, a silent exit on non-convergence, fixed piecewise-linear device constants and no capacitor, inductor, PNP, MOSFET, Zener, op-amp or regulator. Transient accuracy is unmeasured.

## Constraints

1. 126 figure-engine tests and the 79 catalogue circuits keep passing (BRIEF 3.5).
2. Under 1 ms per tick for catalogue-sized circuits (BUD-07).
3. No GPL code copied (Falstad is GPL-2.0-or-later and is never copied).
4. ngspice WASM stepping determinism is unmeasured (RS-07).

## Considered options

| Option | Verdict |
|---|---|
| A. Replace with ngspice WASM as the live engine | Not chosen: size, stepping control and cross-browser determinism unmeasured (RS-07) |
| B. Keep and extract the MNA core as a pure module with a convergence flag, then add Newton devices and transient | Chosen |
| C. Port a third-party open-source engine | Rejected on licence |
| D. ngspice as an oracle and an on-demand "analyse" button | Chosen, alongside B |

## Decision

Extract the solver to a pure module (`sim/analog`) with `mode: 'pwl'` reproducing today's numbers, a convergence report and component partitioning with factorisation reuse (7.2). Dense LU to 150 unknowns, own sparse LU above. Freeze the old solver for catalogue figures until the extraction matches within `1e-9` relative on the 79 plus 20 circuits (SA-02). Add Newton devices (T2) and a transient engine; the transient backend is PENDING RS-08(b) and RS-07. ngspice is the CI oracle (REF-1).

## Technical justification

RS-08 shows the core is right where it applies; the defects are state and coverage, which extraction fixes without discarding tested code. Partitioning keeps cost near the 0.04 ms measured on the largest catalogue circuit (14 nodes); dense elimination alone is 1.2 ms at n = 240 (RS-08), so the 150 threshold leaves room.

## Performance data

RS-08: solve 0.04 ms on the largest of 79 circuits, 0.088 ms in Node. SA-07 measures the 150-node synthetic case.

## Cost implications

Sparse LU effort is not estimated by any source (UNKNOWN); it is deferred until a real project exceeds 150 unknowns.

## Licensing

ngspice is BSD-style (exact build tag read when pinned, UNKNOWN until then). Falstad is a reading reference only.

## Security implications

A netlist cap of 2,000 parts, 20,000 connections and 5,000 analog nodes (8.8) bounds work from imported projects.

## Reversibility

Reverse if RS-08(b) fails: transient goes to an ngspice backend behind the same `AnalogEngine` interface.

## Migration plan

SIM-1 extraction; SIM-3 analog on the live path; SIM-7 Newton devices and the transient decision.

## Known limitations

Transient accuracy is UNKNOWN. Realistic-model agreement is 10 of 20 in RS-08 (diode, TIP120 and saturated 2N2222 differ by 12 to 230 percent), which is why those entries stay T1.
