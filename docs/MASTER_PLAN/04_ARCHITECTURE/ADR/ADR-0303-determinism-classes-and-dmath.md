# ADR-0303: Determinism classes B, N and D, and a deterministic math module

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: Audit `TECHNICAL_DEBT.md` A12; RS-13; DET-1 to DET-5. Spec: SIMULATION_ARCHITECTURE.md sections 2 (objection 1), 6.9.
Downstream: ADR-0312; SA-06, SA-12; F-186.

## Problem

DET-2 asks for identical hashes in Chromium and WebKit. A12 measured that the 100 sampled `frameOf` hashes were equal in Node, Chromium and WebKit, but the raw simulation state differed from step 12 (Chromium) or step 1 (WebKit) because `Math.sin`, `cos`, `atan2` and `exp` differ in the last bit across engines (one macOS arm64 machine; Firefox not run).

## Constraints

1. A test must be able to decide pass or fail, so each test names one class.
2. Replay across peers needs identical results where it matters (ADR-0312).
3. Flight code has 27 call sites of the affected functions outside tests.

## Considered options

| Option | Verdict |
|---|---|
| A. Require bit-identical everything | Rejected: false today, and analog results need a tolerance anyway |
| B. Classes: B bit-exact, N numerically reproducible within `1e-9` relative plus `1e-12`, D display only | Chosen |
| C. Software math module `dmath` on replay-critical paths | Chosen, gated by SA-12 |
| D. Fixed-point arithmetic for flight | Rejected: rewrite for no measured need |

## Decision

Adopt classes B, N, D (6.9). Add `sim/core/dmath.ts` with `sin`, `cos`, `atan2`, `exp`, `log`, `pow` built only from `+ - * /`, `Math.sqrt`, `Math.floor`, `Math.abs`. Replay-critical paths call `dmath`; display code may call `Math`. Adoption gate SA-12: bit-identical on 1,000,000 random inputs per function in Node, Chromium, WebKit and Firefox and a slowdown below 6 times `Math` (ESTIMATED allowance).

## Technical justification

`+ - * /` and `sqrt` are exactly rounded in IEEE 754 in both JavaScript and WebAssembly, so a port of fdlibm-style algorithms built on them gives the same bits everywhere. `pow` and `sqrt` were equal across engines in the A12 100,000-input test, which is why they are not the problem.

## Performance data

The flight step costs 0.5 microseconds, so even 10 times slower math is invisible (ESTIMATED). No `dmath` benchmark exists yet; SA-12 produces it.

## Cost implications

One module of ported algorithms plus a cross-browser test job in CI.

## Licensing

fdlibm is permissively licensed; the port keeps its notice. The exact licence text is read when the port is written (UNKNOWN until then).

## Security implications

None direct.

## Reversibility

Reverse if SA-12 fails: the classes still hold and flight stays class N, compared by tolerance.

## Migration plan

SIM-7 with SA-12. Until it passes, rooms compare class D hashes for physics and flight (17.4).

## Known limitations

A12 is one machine and one CPU architecture; x86-64 and Firefox are open. Analog is class N by construction (solver order of summation), not class B.
