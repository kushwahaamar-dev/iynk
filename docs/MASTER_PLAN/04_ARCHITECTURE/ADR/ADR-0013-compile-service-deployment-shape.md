# ADR-0013: Compile service deployment shape

Status: proposed and PENDING RS-04, RS-05, RS-17, 2026-10-27. Author: system architecture seat.
This is the only record of the compile decision. ADR-0306 (SIMULATION_ARCHITECTURE) and ADR-0427 (backend slot) point here and decide nothing.
Upstream: ADR-0306 (SIMULATION_ARCHITECTURE: options and decision rule); TECHNICAL_RESEARCH section 6 (RS-04, RS-05, RS-17); F-049; R-103; SECURITY_BASELINE 2.3.
Downstream: `SYSTEM_ARCHITECTURE.md` 6.5, 9.2, 12.1.

## Problem

Real firmware mode (avr8js) needs a compiled hex. Where does compile run, and how is arbitrary source compiled safely on a friend's server? No spike has a verdict: RS-04 (speed), RS-05 (cost and isolation), RS-17 (licence of arduino-cli on a server) have no report.

## Constraints

1. Off by default (`IYNK_COMPILE=0`).
2. Never on the web host or a serverless function (SIMULATION_ARCHITECTURE 17.1).
3. A compiler reads files named by the source (`#include`); the sandbox must have nothing to read and nowhere to send.
4. A hex import path must work without a compile service (PROJECT_DATA_MODEL 12.2).

## Considered options

| Option | Summary | Status |
|---|---|---|
| A1. `arduino-cli` in a separate, locked-down container the server calls | Server-side | GPL-3.0 tool run as a separate process, not linked (RS-03 report; RS-17 PENDING) |
| A2. A child process of the server | Simple | Rejected on security: shares the data directory and the network |
| B. avr-gcc compiled to WebAssembly in the browser | Local-first, no server | Possible (the research names a candidate); speed, size and licence PENDING RS-04 |
| C. Hex import only; no compile | Smallest | The always-available floor |

## Decision rule (taken from the RS exit conditions)

Choose B if its p95 click-to-running is under 3 s warm and 8 s cold on a 4G phone with no licence blocker (RS-04 pass). Otherwise choose A1 if RS-05 confirms median compile under 30 s, cost acceptable and isolation sound, and RS-17 answers that running the tool on the user's own server is allowed. If neither, ship C and say so. The `CompileService` port (`SYSTEM_ARCHITECTURE.md` 6.5) is the same for A1, B and C.

## A1 deployment requirements (if chosen)

A fourth compose service with no network (`network_mode: none` or an internal network without the server's data), read-only root, no volumes, `tmpfs` workdir, `cap_drop: ALL`, `no-new-privileges`, `pids_limit`, memory and CPU limits, and a wall-clock timeout per job (limits, the one set for every document until RS-05 reports: 1 GiB memory, 1 CPU, 30 s wall time per job, 1 MiB output, 256 KiB and 32 files of source; the earlier 512 MB and 60 s proposal and the duplicate in ADR-0427 are withdrawn). Input: a tar of sources and a library list from an allow-list. Output: image bytes and diagnostics, with a size cap. One concurrent job per device. No secrets and no project database are mounted. Include paths are restricted to the library directory.

## Performance data

Laptop only: 0.33 to 1.4 s (SIMULATION_ARCHITECTURE 17.1, dossier). Phones and cold starts UNKNOWN.

## Cost implications

A1: one more container on the friends' machine; B: none server-side. Dollar costs per compile: UNKNOWN (RS-05).

## Licensing

arduino-cli is GPL-3.0; calling it as a separate tool is the intended use, but whether it needs an Arduino commercial licence on a server is RS-17 and UNKNOWN. The question was framed for a paid product; whether the answer differs for a personal install is UNKNOWN, and it matters before publishing a ready-made image. avr-gcc is GPL; shipping it as WASM in B has distribution consequences (UNKNOWN).

## Security implications

The reason for the strict A1 shape is that a compiler is a file reader driven by untrusted text. Without the container boundary, a source file could read the server's data directory.

## Reversibility

High by the port. Choosing C first loses nothing.

## Migration plan

SIM-6: hex import and avr8js first; the compile choice follows the RS verdicts.

## Known limitations

PENDING three spikes. Library allow-list maintenance. No compile for ESP32 in the browser (the research found no browser path).
