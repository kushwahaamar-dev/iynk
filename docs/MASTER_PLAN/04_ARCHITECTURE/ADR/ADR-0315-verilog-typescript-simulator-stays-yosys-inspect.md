# ADR-0315: Verilog: the TypeScript cycle simulator stays; Yosys is an optional Inspect mode

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: RS-12 PASS with memory and DigitalJS caveats; audit `interp.md` (Verilog 1,214 lines). Spec: SIMULATION_ARCHITECTURE.md sections 4.2, 8.6, 8.8.
Downstream: SA-21; F-132; R-110.

## Problem

FPGA boards need a Verilog path. The in-house 2-state cycle simulator handles a 32-bit synchronous subset. Yosys (WASM) can elaborate more of the language and DigitalJS can draw it, but it is large.

## Constraints

1. Checks must stay deterministic and fast (Verilog median 867 ms).
2. Yosys memory use on mainstream devices is not measured in WebKit and Firefox.
3. Must not auto-load a large engine.

## Considered options

| Option | Verdict |
|---|---|
| A. Replace the simulator with Yosys plus DigitalJS | Rejected: DigitalJS needs init patching (blink only after patching) and the size is large |
| B. Keep the simulator for checks; Yosys elaboration plus DigitalJS as an optional "Inspect" view | Chosen |

## Decision

The TypeScript simulator remains the source of truth for checks. Inspect mode loads YoWASP Yosys and DigitalJS on explicit request, desktop first. Gate (SA-21): refuse with a reason when `deviceMemory` is 4 or less; above 4, or when the property is undefined, show the size and memory warning and require a click; never load without the click. Fix the budget cadence to every 4,096 cycles (defect D2). SystemVerilog is elaboration only. Inspect mode is a view, not a simulation tier.

## Technical justification

RS-12: 10 of 10 reference designs elaborate; a counter equals DigitalJS over 12,000 cycles. The 2-state engine runs about 3 million cycles per second, so a 100 MHz design runs about 30 times slower than real time; scaled clocks (`SIM_CLOCK_HZ = 100000`) stay.

## Performance data

RS-12 numbers are in its report; WebKit memory was not recorded and Firefox was not run (UNKNOWN).

## Cost implications

A lazy-loaded bundle of several megabytes that only Inspect users pay for.

## Licensing

Yosys is ISC; YoWASP packaging and DigitalJS licences are read and recorded in the registry entry before shipping (UNKNOWN until then).

## Security implications

Parser caps and the worker boundary apply; Yosys runs in its own worker on a source snapshot.

## Reversibility

Reverse if memory fails on mainstream machines: move Yosys to the user's server.

## Migration plan

SIM-6 (Inspect gate with SA-21).

## Known limitations

4-state, delays, `function`, `generate`, memories and timing are not simulated by the TypeScript engine.
