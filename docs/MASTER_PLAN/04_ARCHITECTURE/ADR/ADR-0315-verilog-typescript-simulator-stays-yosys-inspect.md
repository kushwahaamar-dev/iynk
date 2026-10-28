# ADR-0315: Verilog: the TypeScript cycle simulator stays; Yosys is an optional Inspect mode

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: RS-12 PASS (desktop only, memory margin 10 to 15 percent; `08_RESEARCH_SPIKES/RS-12-yosys-wasm/REPORT.md`); audit `interp.md` (Verilog 1,214 lines). Spec: SIMULATION_ARCHITECTURE.md sections 4.2, 8.6, 8.8.
Downstream: SA-21; F-132; R-110.

## Problem

FPGA boards need a Verilog path. The in-house 2-state cycle simulator handles a 32-bit synchronous subset. Yosys (WASM) can elaborate more of the language and DigitalJS can draw it, but it is large.

## Constraints

1. Checks must stay deterministic and fast (Verilog median 867 ms).
2. Yosys memory use is measured only in Chromium on desktop (about 700 MB renderer); WebKit memory and Firefox are UNKNOWN (RS-12).
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

Source: `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-12-yosys-wasm/REPORT.md` (independent check: Yes, all 11 fixtures reproduced, cell counts identical). Browser timings were not re-run by the checker.

| Measure | Result | Label |
|---|---|---|
| Shipped Verilog lessons that elaborate | 10 of 10, zero warnings | VERIFIED |
| First load, Brotli, Chromium | 2.3 s at 50 Mbps, 5.3 s at 20 Mbps, 10.3 s at 10 Mbps, 20.7 s at 5 Mbps with 6x CPU throttle (fails 15 s) | VERIFIED |
| Break-even for 15 s | About 8 Mbps | ESTIMATED (interpolated) |
| Download size | About 10.7 MB Brotli q11 (12.5 MB at q9), 79.7 MB raw | VERIFIED |
| Memory, Chromium | Renderer 662 to 725 MB; whole browser 853 to 917 MB (10 to 15 percent headroom under 1 GB) | VERIFIED |
| DigitalJS vs the TypeScript interpreter | 65 to 250 times slower; needed hand-patched initial values and a parameter override | VERIFIED |
| WebKit memory | Not measurable (WebContent processes are not children of the launcher) | UNKNOWN |
| Firefox, phones, Chromebooks, student code, SystemVerilog, testbenches | Not run | UNKNOWN |

Reading: PASS on the stated exit condition, desktop only, narrow memory margin, and only above about 8 Mbps. DigitalJS supports the inspect-the-circuit view, not live simulation. This is why Inspect stays opt-in behind the SA-21 gate and the TypeScript simulator stays the live path. What would change it: a real-device or Firefox/WebKit run showing memory over budget (then Inspect stays desktop only, or Yosys moves to the optional self-hosted server, see Reversibility). The device run is work for Amar, not an agent task. Studio does not wait for it (D-014).

## Cost implications

A lazy-loaded bundle of several megabytes that only Inspect users pay for.

## Licensing

Yosys is ISC; YoWASP packaging and DigitalJS licences are read and recorded in the registry entry before shipping (UNKNOWN until then).

## Security implications

Parser caps and the worker boundary apply; Yosys runs in its own worker on a source snapshot.

## Reversibility

Reverse if memory fails on mainstream machines: move Yosys to the optional self-hosted server (D-015), run in its own worker process, and return the netlist JSON. Both paths sit behind the same Inspect interface.

## Migration plan

SIM-6 (Inspect gate with SA-21).

## Known limitations

4-state, delays, `function`, `generate`, memories and timing are not simulated by the TypeScript engine.

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RS-12 | Performance data (line 34) replaced with the measured table from the RS-12 report and its independent check: 10 of 10 lessons, load times by bandwidth, memory 662 to 725 MB renderer, DigitalJS 65 to 250 times slower, WebKit and Firefox UNKNOWN. Decision unchanged: TypeScript simulator stays live, Yosys plus DigitalJS is a lazy, opt-in, desktop-first Inspect mode, not in the lesson bundle. |
| RS-12 | Constraint 2 restated to say what was measured (Chromium desktop only). Upstream line cites the report path. |
| D-015 | Reversibility now names the optional self-hosted server instead of "the user's server". |
| D-014 | The device run does not gate Studio; it is listed as work for Amar. |
| Skipped | Licensing UNKNOWN (YoWASP and DigitalJS licences): no spike read them, left as is. Decision text already carries the SA-21 `deviceMemory` gate, so it was not touched. |
