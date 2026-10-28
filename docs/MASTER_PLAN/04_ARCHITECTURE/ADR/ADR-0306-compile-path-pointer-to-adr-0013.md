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

The decision and its rule live in `ADR-0013-compile-service-deployment-shape.md` and nowhere else. This number is kept so citations in nine other documents resolve. The single limit set is 1 GiB memory, 30 s wall time per job and 1 MiB output. RS-05 never ran, so these are a design choice and not a measured result (ESTIMATED). Hex import is the floor and ships first. Compile is an opt-in module (`IYNK_COMPILE_ENABLE`, default `0`) built after the core phases in the D-014 order; Studio does not wait for it.

## Technical justification

See ADR-0013.

## Performance data

See ADR-0013 (laptop 0.33 to 0.56 s warm and 1.17 to 1.40 s with a new build cache, from `08_RESEARCH_SPIKES/RS-03-avr8js-differential/REPORT.md`, reproduced by its checker within 15 percent; the first compile after install took 6.56 s there and 1.65 s on the checker's run, so it includes one-off core build; phones and a sandbox VM were not tested, UNKNOWN).

## Cost implications

See ADR-0013.

## Licensing

See ADR-0013 (arduino-cli 1.5.1 is GPL-3.0, avr-gcc is GPL, the Arduino core is LGPL; DOCUMENTED in the RS-03 report. RS-17 never ran. The repository does not bundle either tool: the operator installs it and sets `IYNK_COMPILE_BIN`, so iynk calls it as a separate program. That is a HYPOTHESIS, not legal advice. The licence choice is For Amar).

## Security implications

See ADR-0013.

## Reversibility

See ADR-0013.

## Migration plan

See ADR-0013; SIM-6.

## Known limitations

RS-04, RS-05 and RS-17 never ran. Nothing here waits for them; each piece stays reversible behind `CompileService` (ADR-0427), and hex import (option C) is the shipped floor.

| Spike | State | Reading under D-015 | What would change the choice |
|---|---|---|---|
| RS-04 compile speed | Never ran; RS-03 gave laptop timings only | The 4G phone rule assumes scale a self-hosted app does not have. Replace it with a local timing run on Amar's server (agent task in the compile phase) | Cold compile over 5 s on that server |
| RS-05 cost and isolation | Never ran | Managed-sandbox cost does not apply. Isolation is the ADR-0013 container shape, tested by BA-18 | An include loop, 2 GB output or fork bomb escapes the caps |
| RS-17 licence | Never ran | Separate-process use, no bundling (HYPOTHESIS) | A licence answer that rules out calling arduino-cli as a separate program: then ship C only |

Browser avr-gcc WASM (option B) is not chosen; revisit only if A is refused.

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RS-03 | Performance data now gives the warm and new-cache compile times and the 6.56 s first-compile caveat, and the Licensing section names the three licences found, with the report path. RS-03 was INCONCLUSIVE overall; only its compile timings and licence notes are used here. |
| RS-04, RS-05, RS-17 | Never ran. The PENDING line in Known limitations is replaced by a table of what each means under D-015 and what would change the choice. The limits line says they are a design choice, not measured. |
| RC-28 | Decision section names the opt-in switch `IYNK_COMPILE_ENABLE` (default `0`). |
| RC-59 | Limits unchanged: 1 GiB, 1 CPU, 30 s, 1 MiB output; the shape is ADR-0013. |
| D-014, D-015 | Compile is built after the core phases and Studio does not wait for it. Licence choice is listed as For Amar. |
| Skipped | The item "lines 53 and others" asked for pointer-only text; the status line stays `pointer`. ADR-0013 still says PENDING in its own header and was not edited here (outside this file's scope). |
