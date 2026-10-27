# ADR-0407: Bundle and idle-CPU budgets as numbers that fail CI

Status: proposed, 2026-10-27, revised after review the same day. Author: frontend and backend architecture seat.
Upstream: R-019, BUD-04 to BUD-09, PERFORMANCE_BASELINE B1 to B5 and P1. Downstream: F-204, F-014. Spec: FRONTEND_ARCHITECTURE section 11.

## Problem

First load of a lesson is 701 KB gzip; the wallet stack (139 KB) and CodeMirror (187 KB) load where they are not needed; idle CPU is 48 to 65 percent of a core. No budget gate exists.

## Constraints

1. Next 16.4 prints no First Load column; the numbers come from `.next/diagnostics/route-bundle-stats.json`.
2. Frame timing is noisy under load; only headless-stable metrics gate every push.
3. Budgets are PROPOSALs until Amar confirms them at the B0 gate.
4. Weak devices matter (D-011).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Lighthouse CI | Third-party tool | Rejected: does not read Next's chunk lists; noisy |
| B. Own script plus Playwright with CDP throttle | Reads route stats and records idle CPU, Run start, late fetches | **Chosen** |

## Decision

1. `budgets.json` holds per-route gzip budgets; `budgets.last.json` holds the last recorded values; CI fails on a miss or a rise above 10 percent.
2. Project home 400 KB gzip; Studio shell 450 KB; sim worker 150 KB; project worker 110 KB; per-language dictionary 120 KB; code editor loads lazily.
3. BUD-01 to BUD-03 run as a scheduled job.

## Technical justification

The audit measured the same numbers the gate reads, from the same file, so the gate and the baseline agree. A rise-over-last-value rule catches a slow creep that a fixed ceiling would allow. Splitting stable (bundle, idle CPU, Run start) from noisy (frame time) metrics keeps the main gate trustworthy.

## Performance data

MEASURED (PERFORMANCE_BASELINE section 1): lesson first load 2.2 MB raw, 701 KB gzip; landing page 2.29 MB raw in 23 scripts although its first-load list says 530 KB; wallet chunk 467,464 B raw, 139,467 B gzip; CodeMirror 566,690 B raw, 186,578 B gzip; polyfills 112,594 B raw, 39,490 B gzip. Idle main-thread use 48 to 65 percent of a core, 100 percent at 4x throttle (P1). ESTIMATED: project home about 401 KB after removing the wallet and lazy-loading CodeMirror, about 362 KB without polyfills (FRONTEND Objection 4).

## Cost implications

One script (`scripts/perf-budget.mjs`) and a Playwright job. CI minutes for a throttled browser run on each push. No paid service.

## Licensing

Playwright 1.64.0 is Apache-2.0 (VERIFIED in `node_modules`). No new dependency.

## Security implications

Indirect: a size gate makes a new third-party script visible as a budget failure, and keeps the wallet stack from returning. It handles no data.

## Reversibility

High. The gate is a script and a JSON file; turning it advisory changes no product behaviour.

## Migration plan

FE-0 records the baseline on the first run, before the wallet is deleted, so the drop is visible, then sets the budgets from the confirmed numbers. `budgets.last.json` is committed after each deliberate change.

## Known limitations

- Every number is a PROPOSAL until the B0 gate.
- The project-home budget has about 10 percent headroom at best (Objection 4).
- Throttling approximates a slow CPU only; it does not model GPU or memory.
- CI machines add noise; if the CPU numbers prove unmeasurable there, they become advisory and the bundle numbers stay.
