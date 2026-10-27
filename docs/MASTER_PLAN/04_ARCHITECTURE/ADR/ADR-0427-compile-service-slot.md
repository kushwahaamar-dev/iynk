# ADR-0427: The compile service is an interface and a disabled route until the spikes report

Status: proposed, 2026-10-27. Author: frontend and backend architecture seat.
Refines ADR-0013 (the single compile record). Upstream: SIMULATION_ARCHITECTURE 8.5 and ADR-0306, RS-03, RS-04, RS-05, RS-17, D-015. Downstream: F-048, F-049, F-091. Spec: BACKEND_ARCHITECTURE section 12. Related: ADR-0013 (the system seat's record of the deployment shape).

## Problem

Real firmware needs a hex. The compile path is unmeasured in a sandbox and the arduino-cli licence question is unanswered.

## Constraints

1. No arbitrary computation in the main server process.
2. The first release works with `import-hex`.
3. Do not distribute GPL components without an answer.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. arduino-cli on the user's own server | RS-03: 0.33 to 1.40 s on a laptop | PENDING RS-04, RS-05, RS-17 |
| B. avr-gcc WASM in the browser | 16 to 17 MB tools; unlicensed wrapper | PENDING |
| C. Import a `.hex` | Always available | **First release** |

## Decision

This record decides only the backend slot. The compile decision, its options, its decision rule and its limits (1 GiB, 30 s, 1 MiB output) are in ADR-0013, the only record; this file does not restate them, so they cannot drift.

1. `CompileService` as in the simulation file; `POST /v1/compile/jobs` (`createCompileJob`; poll with `GET /v1/compile/jobs/{jobId}`) answers 501 `compile_not_set_up` until ADR-0013 is decided and the module is built.
2. If ADR-0013 chooses a server path, the module follows its deployment requirements. The image does not bundle arduino-cli.

## Consequences

- Nothing in the app depends on the choice.
- BA-18 only applies if the module is built.

## Technical justification

Compiling is the one server job that runs foreign input (a sketch can contain an infinite include loop or a huge output), so it must be a separate, capped process and not part of the main server (SYSTEM_ARCHITECTURE 6, TECHNICAL_RESEARCH D9: Docker rootless alone is not a boundary). The interface is fixed now so the browser code is written once. Because import-hex already works, shipping nothing is a valid first release and the choice can wait for evidence.

## Performance data

RS-03 (laptop): compile alone 0.33 to 0.56 s warm and 1.17 to 1.40 s cold (VERIFIED in the RS-03 report). Phone and network time are UNKNOWN. RS-04 (sandboxed click-to-running on 4G), RS-05 (WASM option) and RS-17 (licence) have no `Verdict` yet; the choice is marked PENDING RS-04, RS-05, RS-17 and the decision rule above is the one from TECHNICAL_RESEARCH section 6.

## Cost implications

Nothing to build until the spikes report. If option A: a sandboxed container with a toolchain of several hundred MB (ESTIMATED from the 16 to 17 MB WASM tools versus a native toolchain; not measured), a vendored library set, and a cache; effort UNKNOWN until RS-04 states the sandbox needed. Running cost is the same machine.

## Licensing

arduino-cli is GPL-3.0 or sold under a paid licence, and avr-gcc is GPL (EXTERNAL, from the RS-03 and RS-17 notes; not re-checked). The repository and its image do not bundle either. The operator installs the tool and points `IYNK_COMPILE_BIN` at it, so iynk calls it as a separate program and does not distribute it. This is a HYPOTHESIS, not legal advice; RS-17 has no answer. If RS-17 says that is not enough, option C stays.

## Security implications

The compile process has no network and no secrets, runs as a child of the server, never in the server's own process, and is capped on time, memory, output, source size and file count. Sources are not trusted. BA-18 tests an include loop, a 2 GB output and a fork bomb. The route is off (`IYNK_DISABLE_COMPILE=1`) by default.

## Reversibility

High. The app depends only on `CompileService`; the first release already works without it. Reverse if: n/a (pending).

## Migration plan

BE-5, or earlier if the firmware path (F-048) needs it: build the module per the RS-04, RS-05 and RS-17 results. Until then the route answers 501 and the capability probe reports `compile: false`.

## Known limitations

No in-app compile in the first release. The licence stance is untested. Cold compile on a small server and the cost of the sandbox are UNKNOWN until RS-04.
