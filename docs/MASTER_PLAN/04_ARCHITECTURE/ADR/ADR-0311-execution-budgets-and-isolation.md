# ADR-0311: Execution budgets, isolation and cancellation

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: Audit `interp.md` D1, D2; BUD-12. Spec: SIMULATION_ARCHITECTURE.md sections 6.8, 8.8.
Downstream: ADR-0300, 0404; SA-10, SA-22; F-132; R-018.

## Problem

Three of four allocation probes killed the Node process (`[0] * 10**9`, an `append(bytearray(1e7))` loop, `int a[2000000000]`; D1), a 3,000 ms Verilog budget ended at 4,651 ms at 100 MHz (D2), and the live run is on the main thread.

## Constraints

1. A bad program must not take down the tab or the server.
2. Results must not depend on where a stop falls.
3. The host may read a wall clock; engines may not.

## Considered options

| Option | Verdict |
|---|---|
| A. Trust user code | Rejected |
| B. Caps inside each engine, cooperative cancel at yield points, `Worker.terminate()` after a grace | Chosen |
| C. Process isolation per run on a server | Not for the interpreters; used only for compile (ADR-0013) |

## Decision

Caps (8.8): 64 MiB logical heap, array 1,000,000 elements, string 1 MiB, dict 100,000 keys, 400,000 statements per slice, 5,000,000 synchronous ISR operations, 1 MiB serial output, netlist 2,000 parts, 20,000 connections, 5,000 analog nodes, plus the import limits. Engines yield at deterministic work counts (4,096 statements, 65,536 cycles, 64 Newton iterations) and ask `budget.shouldYield()`. `cancel()` sets a flag read at yield points; the host calls `Worker.terminate()` after 2 s and rebuilds the worker from the project document. `no-time-progress` halts zero-cost loops after 10,000,000 work units.

## Technical justification

Stopping between instructions keeps results independent of wall time. `check-client.ts:17,61` already uses a `budgetMs + 2000` grace.

## Performance data

A runaway `while(1){}` consumes virtual time and ends in 6 ms wall (`interp.md`). Slice wall budget 8 ms on the main thread, 12 ms in a worker (6.8).

## Cost implications

Allocation helpers in the three interpreters; a budget module on the host side.

## Licensing

None.

## Security implications

This is the primary defence for user code. No `eval`, `Function` or dynamic `import` of user text (SA-11). Regex checks use literal or glob match or a step budget.

## Reversibility

Not applicable; the caps are constants that can be tuned.

## Migration plan

SIM-2 (memory and output caps, SA-10); SIM-6 (import caps, SA-22).

## Known limitations

Caps are logical, not an operating-system memory limit; a bug in an engine's accounting is a bug in the guard.
