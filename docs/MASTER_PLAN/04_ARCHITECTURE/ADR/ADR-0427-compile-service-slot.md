# ADR-0427: The compile service is an interface and an opt-in route, off by default

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
| A. arduino-cli on the user's own server | RS-03: 0.33 to 0.56 s warm, 1.17 to 1.40 s cold on a laptop (`08_RESEARCH_SPIKES/RS-03-avr8js-differential/REPORT.md`) | Optional, opt-in (`IYNK_COMPILE_ENABLE=1`), after the core phases. Reversible. RS-04, RS-05 and RS-17 never ran, so no more is claimed |
| B. avr-gcc WASM in the browser | 16 to 17 MB tools; unlicensed wrapper | Not chosen. Revisit only if A is refused (RS-05 never ran) |
| C. Import a `.hex` | Always available | **First release** |

## Decision

This record decides only the backend slot. The compile decision, its options, its decision rule and its limits (1 GiB, 30 s, 1 MiB output) are in ADR-0013, the only record; this file does not restate them, so they cannot drift.

1. `CompileService` as in the simulation file; `POST /v1/compile/jobs` (`createCompileJob`; poll with `GET /v1/compile/jobs/{jobId}`) answers `501 feature_disabled` (RC-28) while `IYNK_COMPILE_ENABLE` is `0` (the default) and also when it is `1` but no toolchain is found at `IYNK_COMPILE_BIN`. The capability probe reports `compile: false` in both cases. `compile_not_set_up` is not an error code.
2. If ADR-0013 chooses a server path, the module follows its deployment requirements. The image does not bundle arduino-cli.

## Consequences

- Nothing in the app depends on the choice.
- BA-18 only applies if the module is built.

## Technical justification

Compiling is the one server job that runs foreign input (a sketch can contain an infinite include loop or a huge output), so it must be a separate, capped process and not part of the main server (SYSTEM_ARCHITECTURE 6, TECHNICAL_RESEARCH D9: Docker rootless alone is not a boundary). The interface is fixed now so the browser code is written once. Because import-hex already works, shipping nothing is a valid first release and the choice can wait for evidence.

## Performance data

RS-03 (laptop): compile alone 0.33 to 0.56 s warm and 1.17 to 1.40 s cold (VERIFIED in the RS-03 report). Phone and network time are UNKNOWN. RS-04 (sandboxed click-to-running on 4G), RS-05 (WASM option) and RS-17 (licence) have no `Verdict` yet; RS-03 was INCONCLUSIVE overall (its independent check agreed on the compile times) and covers only local timing. Under D-015 (self-hosted, no scale) the RS-04 '4G phone' rule and the RS-05 managed-sandbox cost do not apply as written. The choice stays reversible behind `CompileService`. What would change it: a local timing run (the agent-doable part of RS-04) that shows cold compile over 5 s on Amar's server, or a licence answer that rules out calling arduino-cli as a separate program. The decision rule above is the one from TECHNICAL_RESEARCH section 6.

## Cost implications

Nothing to build in B0 to Studio (D-014 order). The module is an optional later task, not a gate for any phase, and Studio does not wait for it. If option A: a sandboxed container with a toolchain of several hundred MB (ESTIMATED from the 16 to 17 MB WASM tools versus a native toolchain; not measured), a vendored library set, and a cache; effort UNKNOWN until a local timing run states the sandbox needed. Running cost is the same machine.

## Licensing

arduino-cli is GPL-3.0 or sold under a paid licence, and avr-gcc is GPL (EXTERNAL, from the RS-03 and RS-17 notes; not re-checked). The repository and its image do not bundle either. The operator installs the tool and points `IYNK_COMPILE_BIN` at it, so iynk calls it as a separate program and does not distribute it. This is a HYPOTHESIS, not legal advice; RS-17 has no answer. If a licence answer says that is not enough, option C stays. The licence choice is work for Amar.

## Security implications

The compile process has no network and no secrets, runs as a child of the server, never in the server's own process, and is capped on time, memory, output, source size and file count. Sources are not trusted. BA-18 tests an include loop, a 2 GB output and a fork bomb. The route is off by default: `IYNK_COMPILE_ENABLE` is `0` and there is no DISABLE variable (RC-28).

## Reversibility

High. The app depends only on `CompileService`; the first release already works without it. Reverse if: a local compile timing run or a licence answer fails as described in Performance data.

## Migration plan

BE-5, or earlier if the firmware path (F-048) needs it: build the module, then run the local compile timing run (RS-04, agent-doable). Until `IYNK_COMPILE_ENABLE=1` and a toolchain exist, the route answers `501 feature_disabled` and the capability probe reports `compile: false`.

## Known limitations

No in-app compile in the first release. The licence stance is untested. Cold compile on a small server and the cost of the sandbox are UNKNOWN until a local timing run.

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RC-28 | Error code is `501 feature_disabled`, not `compile_not_set_up`. Switch is `IYNK_COMPILE_ENABLE` (default `0`), not `IYNK_DISABLE_COMPILE`. Same code when on without a toolchain. Title, decision item 1, security section and migration plan updated. Source: `RECONCILIATION.md` row RC-28 |
| RS-03 | Option A cites 0.33 to 0.56 s warm and 1.17 to 1.40 s cold; verdict INCONCLUSIVE overall, so option A is optional and reversible. GPL-3.0 stance kept as a HYPOTHESIS. Source: `08_RESEARCH_SPIKES/RS-03-avr8js-differential/REPORT.md` |
| RS-04, RS-05, RS-17 | Never ran. PENDING text removed. Replaced by a reversible default (import-hex first, option A opt-in) and the conditions that would change it. RS-04 becomes a local timing task; the licence choice is "For Amar" |
| D-014 | Wording that the build waits on spikes replaced: the module gates no phase |
| Not applicable | RS-01, RS-06, RS-08, RS-09, RS-12, RS-13, DP-01 do not bear on this record |

Other files still carrying the old names (not edited here): BACKEND_ARCHITECTURE.md lines 144, 482, 568, 595; SIMULATION_ARCHITECTURE.md line 2260 (history); ADR-0013 line 14 uses `IYNK_COMPILE=0`.
