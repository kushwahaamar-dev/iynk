# ADR-0304: Circuit solver: keep the MNA core, extract it as a pure module, ngspice as oracle

Status: proposed, 2026-10-27 (spike fold-in applied). The extraction and Newton devices are decided; the live transient backend stays open until the Fidelity-phase check runs. Author: simulation architecture seat.
Upstream: RS-08 (a) 20 of 20 within 2 percent against matched models, 10 of 20 against realistic models (FAIL), (b) transient not run (INCONCLUSIVE); RS-07 never ran, no report (`docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice/REPORT.md`, Verdict); audit `figure-engine.md`. Spec: SIMULATION_ARCHITECTURE.md section 7.
Downstream: ADR-0314; SA-02 to SA-05, SA-07; F-042, F-045, F-046; R-046, R-099, R-100, R-105.

## Problem

The 431-line DC solver in `figures/engine/bench-solve.js` solves resistive circuits correctly (RS-08: 67 resistive networks, worst relative difference 8.7e-13) but has global state, a silent exit on non-convergence, fixed piecewise-linear device constants and no capacitor, inductor, PNP, MOSFET, Zener, op-amp or regulator. Transient accuracy is unmeasured.

## Constraints

1. 126 figure-engine tests and the catalogue circuits (the converter output in `tests/fixtures/fault-corpus/clean/`, a planned directory that does not exist yet; the count is ESTIMATED, not 79) keep passing (BRIEF 3.5).
2. Under 1 ms per tick for catalogue-sized circuits (BUD-07).
3. No GPL code copied (Falstad is GPL-2.0-or-later and is never copied).
4. ngspice WASM stepping determinism is unmeasured (RS-07 never ran).
5. Build order is D-014: the solver extraction belongs to the project-core phase and Newton devices and transient to the simulation-fidelity phase. Nothing in the Studio editor phase waits on the transient decision.

## Considered options

| Option | Verdict |
|---|---|
| A. Replace with ngspice WASM as the live engine | Not chosen: size, stepping control and cross-browser determinism unmeasured (RS-07) |
| B. Keep and extract the MNA core as a pure module with a convergence flag, then add Newton devices and transient | Chosen |
| C. Port a third-party open-source engine | Rejected on licence |
| D. ngspice as an oracle and an on-demand "analyse" button | Chosen, alongside B |

## Decision

Extract the solver to a pure module (`sim/analog`) with `mode: 'pwl'` reproducing today's numbers, a convergence report and component partitioning with factorisation reuse (7.2). Dense LU to 150 unknowns, own sparse LU above. Freeze the old solver for catalogue figures until the extraction matches within `1e-9` relative on the `clean/` converter circuits plus RS-08's 20 canonical circuits, a separate set (SA-02). Add Newton devices (T2) and a transient engine; the transient engine is added to the in-house solver behind an `AnalogBackend` interface (`SIMULATION_ARCHITECTURE.md` section 7.4, `kind: 'mna-inhouse'`), which is the reversible option because RS-08(b) was not run and RS-07 never ran. ngspice WASM is the CI oracle (REF-1) and an on-demand "Analyse" button (`ngspice-batch`); it is not the live engine. No claim of SPICE-level device accuracy is made: RS-08 found 10 of 20 realistic-model cases within 2 percent and 6 off by more than 10 percent (C16 229.6, C20 41.1, C15 20.8, C08 12.5, C14 12.4, C13 12.3), so LED, diode and transistor entries stay T1 until Newton devices pass the oracle gate (SA-05). A Fidelity-phase task runs RS-08(b)-style (trapezoidal RC, RLC, buck at a 1 us step against ngspice) and RS-07-style checks; its result may change the live backend. See "What would change this".

## Technical justification

RS-08 shows the core is right where it applies; the defects are state and coverage, which extraction fixes without discarding tested code. Partitioning keeps cost near the 0.04 ms measured on the largest catalogue circuit (14 nodes); dense elimination alone is 1.2 ms at n = 240 (RS-08), so the 150 threshold leaves room.

## Performance data

RS-08: solve 0.04 ms on the largest of the catalogue circuits RS-08 ran (RS-08's own set, not the `clean/` corpus), 0.088 ms in Node, 0.45 ms for the largest circuit at 6x CPU throttle in Chromium (the browser timings were not re-run by the checker; no phone was tested, so phone speed is UNKNOWN). SA-07 measures the 150-node synthetic case.

## Cost implications

Sparse LU effort is not estimated by any source (UNKNOWN); it is deferred until a real project exceeds 150 unknowns.

## Licensing

ngspice is BSD-style (exact build tag read when pinned, UNKNOWN until then). Falstad is a reading reference only.

## Security implications

A netlist cap of 2,000 parts, 20,000 connections and 5,000 analog nodes (8.8) bounds work from imported projects.

## Reversibility

The solver sits behind `AnalogBackend`, so the live transient backend can be swapped without touching callers.

## What would change this

| Result | Effect |
|---|---|
| RS-08(b)-style check: in-house trapezoidal RC, RLC and buck within 1 percent of ngspice at 1 us and under 16 ms per frame | Keep `mna-inhouse` for live transient and co-simulation |
| Same check fails | Live transient goes to an ngspice backend behind `AnalogBackend`; the in-house engine stays for DC |
| RS-07-style check (ngspice WASM stepping, bit-identical across browsers) passes | `ngspice-stepping` becomes an option for co-simulation; otherwise it is dropped |
| A real project exceeds 150 analog unknowns (SA-07) | Write the sparse LU |

## Migration plan

SIM-1 extraction; SIM-3 analog on the live path; SIM-7 Newton devices and the transient decision.

## Known limitations

Transient accuracy is UNKNOWN. Realistic-model agreement is 10 of 20 in RS-08 (diode, TIP120 and saturated 2N2222 differ by 12 to 230 percent), which is why those entries stay T1.

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RS-08 (a) | Upstream line now states the three-part result: matched 20 of 20 (worst 0.26 percent), realistic 10 of 20 (FAIL), transient (b) INCONCLUSIVE. The six failing cases are listed in the Decision and the "do not claim SPICE-level accuracy" rule is stated. |
| RS-08 (b), RS-07 | The PENDING text in the Decision is replaced by the reversible choice: transient is added to the in-house engine behind `AnalogBackend`, ngspice is oracle plus "Analyse" button. A "What would change this" table names the pass and fail effects. Both checks are a Fidelity-phase task. |
| RS-08 timing | Performance data adds the 0.45 ms at 6x figure and marks phone speed UNKNOWN. |
| D-014 | New constraint 5 states the build order, so nothing in the Studio phase waits on the transient decision. No interview, pilot or Fault Lab wait existed in this file. |
| Name | The interface is `AnalogBackend`, as in SIMULATION_ARCHITECTURE section 7.4 and SYSTEM_ARCHITECTURE line 1322. The earlier `AnalogEngine` in Reversibility is replaced. |
| Left as is | The `pwl` mode, the 1e-9 freeze rule on the `clean/` circuits plus RS-08's 20 (SA-02) and the 150-unknown dense/sparse threshold already matched the intended decision. Status stays proposed. Other spikes (RS-01, 03, 06, 09, 12, 13, DP-01) do not bear on the solver. No RC row in RECONCILIATION.md concerns this ADR, so no RC id is cited. |

## Reconcile, second pass (2026-10-27)

| Id | Change |
|---|---|
| RC-48 | Line 13, line 30, line 38 and the first-pass "Left as is" row no longer say "79". The converter circuits are cited as `tests/fixtures/fault-corpus/clean/` (the directory does not exist yet in the repo, VERIFIED by ls; the count is ESTIMATED). RS-08's 20 canonical circuits are named as a separate set. |
| RC-48, not done here | The same fix in `SIMULATION_ARCHITECTURE.md` line 56 was skipped because this step may edit only this file. It still needs the change. |
