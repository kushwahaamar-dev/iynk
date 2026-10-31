# ADR-0300: One layered model, one orchestrator that owns the clock, in a dedicated Worker

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: BRIEF 10 and 19.3; D-011, D-013, D-014, D-015; audit `TECHNICAL_DEBT.md` A2, A5, D4; `inventory/interp.md`, `figure-engine.md`. Spec: SIMULATION_ARCHITECTURE.md sections 3, 5.6, 17.2.
Downstream: ADR-0301, 0304, 0305, 0307, 0311, 0312; ADR-0005 (placement) and ADR-0404 (worker RPC); F-203, F-044, F-047; R-041 to R-045.

## Problem

The logic is mostly decoupled but not layered. The live run and the circuit solver sit on the main thread or in globals (`boardlab/engine.ts:164`; `figures/engine/bench-solve.js` uses `B.*` globals), the interpreters, the solver and the flight code each keep their own time, and the UI calls engines directly. A project that mixes an MCU, a circuit, buses and a physical world has no single place that decides what happens first.

## Constraints

1. Runs in the browser with no server (D-015).
2. Must not freeze the page on a low-end device (D-011, BUD-12).
3. Every engine must be testable without a browser.
4. The existing check path (`runHeadless`, `evaluateChecks`, `CheckJob`) keeps working on the same `RunTrace`.
5. Peers in a room simulate locally from the same ordered inputs (ADR-0506).

## Considered options

| Option | Verdict |
|---|---|
| A. Keep engines separate, each with its own timer, glue in the UI | Rejected: cross-domain order (pin write then node voltage) would depend on frame timing |
| B. One thread, one orchestrator on the main thread | Rejected: a 400,000-statement slice or a solve blocks input |
| C. One orchestrator in one `SimWorker` per open run, engines as pure modules with typed interfaces, heavy optional engines in their own workers | Chosen |
| D. One worker per engine, lockstep over messages | Rejected: message latency inside the coupling loop of section 5.6 |

## Decision

1. Twelve layers L1 to L12 (section 3), each a pure module with a typed interface and its own folder under `sim/`.
2. One `Orchestrator` owns `SimTime`, the event queue ordered by `(at, phase, rank, seq)` and the coupling loop (5.5, 5.6). It runs in the `SimWorker`. Engines never read a wall clock and never call each other; they exchange values through the orchestrator.
3. The UI talks to the worker only through the typed `HostToSim` and `SimToHost` messages (17.2).
4. Ngspice analysis and Yosys inspect run in separate optional workers on a snapshot and never join the lockstep.
5. Dependency rules between layers (3.3) are a lint check.

## Technical justification

The orchestrator is the only place where order across domains can be fixed, which is what determinism (ADR-0303) and replay (ADR-0312) need. Keeping the real-time engines in one thread removes message latency from the coupling loop. `Run` in `src/lib/interp/run.ts:56` already has the surface (`start/stop/reset/step/input/analog/serialWrite/setSupply/snapshot/on`), so the interpreters are wrapped, not rewritten.

## Performance data

Unmeasured for the new protocol. The reversal threshold is 1 ms of protocol cost per frame at 30 frames per second, measured in SIM-0. The reference runs sum 27.8 s unloaded and 60.6 s loaded for 102 lessons (`PERFORMANCE_BASELINE.md`), which is the load the worker must beat on the main thread's behalf.

## Cost implications

One more build entry (the worker bundle) and a message layer to maintain. No running cost; no server is involved.

## Licensing

No third-party code is introduced by this decision.

## Security implications

User code only ever runs inside the worker. A memory bomb kills the worker, not the tab (8.8). The page has no `eval` path for user text (lint rule SA-11).

## Reversibility

Reverse if the message protocol costs more than 1 ms per frame at 30 Hz (measure in SIM-0). The interfaces are the same whether the orchestrator sits in a worker or on the main thread, so the fallback is a deployment change.

## Migration plan

SIM-0 (section 18.2): `sim/core`, the engine interface, the orchestrator for the digital slice, the interpreters wrapped as `McuEngine`, the worker host and protocol. Exit tests SA-01, SA-06, SA-11.

## Known limitations

Heavy engines out of lockstep give analysis results for a snapshot, not a live co-simulation. The protocol versions (`v: 1`) will need a compatibility rule once projects outlive a build.
