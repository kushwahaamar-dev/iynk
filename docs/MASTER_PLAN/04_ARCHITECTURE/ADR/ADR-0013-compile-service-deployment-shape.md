# ADR-0013: Compile service deployment shape

Status: pending RS-04, RS-05, RS-17 (2026-10-27). Shape chosen (C always, A1 as the opt-in server option, B not built); RS-04, RS-05 and RS-17 have no report, so every part is reversible behind the `CompileService` port. Author: system architecture seat.
This is the only record of the compile decision. ADR-0306 (SIMULATION_ARCHITECTURE) and ADR-0427 (backend slot) point here and decide nothing.
Upstream: ADR-0306 (SIMULATION_ARCHITECTURE: options and decision rule); TECHNICAL_RESEARCH section 6 (RS-04, RS-05, RS-17); F-049; R-103; SECURITY_BASELINE 2.3.
Downstream: `SYSTEM_ARCHITECTURE.md` 6.5, 9.2, 12.1.

## Problem

Real firmware mode (avr8js) needs a compiled hex. Where does compile run, and how is arbitrary source compiled safely on a friend's server? RS-03 gives local timings (arduino-cli 1.5.1, AVR core, M4 Pro: 1.17 to 1.40 s with an empty build cache, 0.33 to 0.56 s warm; a first-ever compile of 6.56 s includes building the core; `08_RESEARCH_SPIKES/RS-03-avr8js-differential/REPORT.md`, checker confirmed within 15 percent) and the licence, GPL-3.0 (VERIFIED from the archive's LICENSE.txt; the checker did not re-verify the licence statements). RS-04 (browser compile speed), RS-05 (sandbox cost and isolation) and RS-17 (what the licence allows on a server) have no report.

## Constraints

1. Off by default (`IYNK_COMPILE_ENABLE=0`, RC-28).
2. Never on the web host or a serverless function (SIMULATION_ARCHITECTURE 17.1).
3. A compiler reads files named by the source (`#include`); the sandbox must have nothing to read and nowhere to send.
4. A hex import path must work without a compile service (PROJECT_DATA_MODEL 12.2).

## Considered options

| Option | Summary | Status |
|---|---|---|
| A1. `arduino-cli` in a separate, locked-down container the server calls | Server-side | CHOSEN as the opt-in compile option for a self-hosted server. GPL-3.0 tool run as a separate process, not linked (RS-03 REPORT.md; RS-17 PENDING). Local time 0.33 to 1.40 s; sandbox VM time UNKNOWN (RS-05) |
| A2. A child process of the server | Simple | Rejected on security: shares the data directory and the network |
| B. avr-gcc compiled to WebAssembly in the browser | Local-first, no server | NOT BUILT. No spike ran (RS-04). Speed, bundle size and GPL distribution terms UNKNOWN. Revisit only if a later task measures it |
| C. Hex import only; no compile | Smallest | CHOSEN as the default and the floor. Works with no server (PROJECT_DATA_MODEL 12.2) |

## Decision rule (taken from the RS exit conditions)

Original rule: choose B if RS-04 passes (p95 under 3 s warm and 8 s cold on a 4G phone, no licence blocker); otherwise A1 if RS-05 and RS-17 pass; otherwise C. Under D-013 to D-017 there are no customers and no managed sandbox, so the 4G phone test and the dollar-cost test no longer apply. Applied now: B has no evidence, so it is not chosen. A1 is the only server path, off by default (`IYNK_COMPILE_ENABLE=0`, RC-28) and run by the person who hosts the server on their own machine. C is the default for everyone else. What would change this: an RS-04-style measurement of avr-gcc WASM under a size and time budget moves B up for a local-first compile; an RS-05-style run of the A1 container on the host's machine that misses 30 s median moves A1 down to C. The `CompileService` port (`SYSTEM_ARCHITECTURE.md` 6.5) is the same for A1, B and C.

## A1 deployment requirements (if chosen)

A fourth compose service with no network (`network_mode: none` or an internal network without the server's data), read-only root, no volumes, `tmpfs` workdir, `cap_drop: ALL`, `no-new-privileges`, `pids_limit`, memory and CPU limits, and a wall-clock timeout per job (limits, the one set for every document, RC-59, until RS-05 reports: 1 GiB memory, 1 CPU, 30 s wall time per job, 1 MiB output, 256 KiB and 32 files of source; the earlier 512 MB and 60 s proposal and the duplicate in ADR-0427 are withdrawn). Input: a tar of sources and a library list from an allow-list. Output: image bytes and diagnostics, with a size cap. One concurrent job per device. No secrets and no project database are mounted. Include paths are restricted to the library directory.

## Performance data

Laptop only, VERIFIED by RS-03 and its checker: 0.33 to 0.56 s warm, 1.17 to 1.40 s with an empty build cache (about 1.2 to 1.4 s is the steady figure). Container, phone and low-power host times UNKNOWN. A compile task under the A1 build should record the time inside the container as the missing RS-05 number.

## Cost implications

A1: one more container on the host's machine; B: none server-side. There is no per-compile dollar cost to a self-hoster beyond their own CPU, so the RS-05 cost test is dropped under D-015.

## Licensing

arduino-cli is GPL-3.0; calling it as a separate tool is the intended use, but what the licence allows on a server is RS-17 and UNKNOWN (RS-03 only recorded the licence text). The question was framed for a paid product. For a personal, self-hosted install the tool is the user's own download, so the build must not bundle arduino-cli or the AVR toolchain into a published image: the compose file fetches them at first run on the host's machine. Publishing a ready-made image stays blocked until Amar decides (see For Amar). avr-gcc is GPL; shipping it as WASM in B has distribution consequences (UNKNOWN).

## Security implications

The reason for the strict A1 shape is that a compiler is a file reader driven by untrusted text. Without the container boundary, a source file could read the server's data directory.

## Reversibility

High by the port. Choosing C first loses nothing.

## Migration plan

Hex import and the opt-in avr8js Firmware mode (ADR-0305, RS-03) come first, in the simulation fidelity phase of D-014; they wait for nothing else. The A1 container is a later, separate task behind the same port. Nothing in Studio, collaboration or the early phases waits for a compile verdict, an interview or a pilot.

## Known limitations

RS-04, RS-05 and RS-17 never ran. RS-03 timings are laptop figures. Library allow-list maintenance. No compile for ESP32 in the browser (the research found no browser path).

## For Amar

| Item | Why only a person can do it |
|---|---|
| Decide whether a ready-made image or a hosted compile may include arduino-cli and avr-gcc (RS-17) | A licence reading, not an agent task. Until then the build downloads the tools on the host's machine and bundles nothing |
| Time a compile on the real self-hosting machine if A1 is used | Needs the real host; agents can only time a local container |

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RS-03 | Header, Problem, Performance data and Licensing now cite its local compile times (1.17 to 1.40 s empty cache, 0.33 to 0.56 s warm) and arduino-cli GPL-3.0, with the checker's limits (licence statements not re-verified; laptop only). |
| RS-04, RS-05, RS-17 | No report. Marked PENDING in the header; the decision rule is rewritten to the reversible choice (C default, A1 opt-in, B not built) and says what evidence would change it. The 4G phone and dollar-cost tests are dropped under D-015. |
| D-013 to D-017 | Migration plan no longer ties compile to "SIM-6" or any wait; it sits in the simulation fidelity phase of D-014 and blocks nothing earlier. Added a For Amar section (licence use of the tools; real-host timing). |
| RC-28 | Switch named `IYNK_COMPILE_ENABLE=0`; off or without a toolchain gives `501 feature_disabled`. The old `IYNK_COMPILE=0` in Constraints is changed to match. |
| RC-59 | Limits line points to the ruling (1 GiB, 1 CPU, 30 s, 1 MiB output, 256 KiB and 32 files of source); unchanged in value. |
| Skipped | Line 10's "no spike has a verdict" was out of date and is replaced. Lines 23 and 25 are updated, not skipped. |

## Reconcile, second pass (2026-10-27)

| Id | Change |
|---|---|
| RC-62 | Status word on line 3 now reads `pending RS-04, RS-05, RS-17`, matching the index in the README. Content of the decision is unchanged. |
