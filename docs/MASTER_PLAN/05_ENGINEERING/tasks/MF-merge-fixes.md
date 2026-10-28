# MF task packages: fixes the build/ui merge exposed

Written 2026-10-28 by the orchestrator after the build/ui merge (`wf_3130a9a4-e22`, head 057cdf7). The merged tree is green on content,
schema, typecheck, lint, ui:check, build and every e2e spec but two, and the unit suite fails one wall-clock test per run at random. Two
causes, both structural:

1. Wall-clock budget tests (for example "writes 500 parts in under 15 ms") run inside the parallel unit suite, which saturates all 14
   cores (load average 27 to 40 measured during the merge). A budget measured on a saturated machine says nothing about the code, and
   "fastest of five" does not help when all five runs sit in the same saturated window. The same holds for `e2e/save-perf.spec.ts` (FA-08
   p95 50 ms) while other specs run.
2. SA-10 in WebKit: the stall kill in `e2e/core.spec.ts` takes 3,018 to 3,129 ms against the 2,500 ms bound in every run, also with one
   worker (B3 results, `results/B3.md`); Chromium takes about 2,020 ms. That one is a real defect, not load.

Rules: never raise a budget or a bound, never skip a test; a timing test that fails on a quiet machine is a real failure.

## Exit

| Field | Value |
|---|---|
| Exit | `npm run content:check`, `schema:check`, `typecheck`, `lint`, `ui:check`, `npx vitest run` (whole suite, three runs in a row, all green), `npm run test:perf` (green), keyless build, keyless full Playwright suite (green, WebKit `core.spec.ts` included, `save-perf.spec.ts` in its serial project), and `bash scripts/ci-local.sh` (green, with the new `perf` step). |

## Parallel groups

| Group | Tasks |
|---|---|
| G1 | MF-01, MF-02 (disjoint files, listed per card) |
| G2 | MF-03 (gate) |

## Task cards

### T-MF-01. Timing budgets run on a quiet CPU

Do:
- Convention: a test whose assertion is a wall-clock budget under 1 s lives in a `*.perf.test.ts` file next to the code it measures.
  `vitest.config.ts` excludes `**/*.perf.test.*`; a new `vitest.perf.config.ts` includes only them and runs them one file at a time
  (`fileParallelism: false`, one worker). `npm run test:perf` runs it; `npm run check` runs it after the unit tests; `scripts/ci-local.sh`
  gets a `perf` step after `unit` (update `scripts/ci-local.test.mjs` to the new step list).
- Move only the timing `it` blocks, with their setup, out of these files into a sibling `*.perf.test.ts` (correctness assertions stay
  where they are): `src/core/canonical.test.ts:159`, `src/core/sha256.test.ts:62`, `src/core/strict-json.test.ts:85`,
  `src/export/iynk.test.ts:70`, `src/project/netlist.test.ts:160`, `src/sim/core/hash.test.ts:85`, `src/sim/netlist.test.ts:87`,
  `src/sim/replay/trace.test.ts:41`, `src/project/apply-cost.test.ts:46`, and any other budget under 1 s you find with
  `git grep -nE "performance\.now"` in test files (check `src/export/iynkz.test.ts`, `src/parts/descriptor.test.ts`,
  `src/project/hash.test.ts`, `src/local/*.test.ts`, `src/project/convert/circuit.test.ts`, the interpreter tests). Hang guards of 10 s and
  more (`convert/bench`, `lesson`, `practice`, `check-job`) are not budgets: leave them. Keep each budget's number. The "fastest of five"
  helpers added by the merge (commits 4378b3c, a37b4d2) may stay inside the perf files.
- Playwright: put `e2e/save-perf.spec.ts` in a `perf` project that depends on every other project (so it runs alone, last) and runs
  serially; exclude it from the other projects. Do not touch `e2e/core.spec.ts` (T-MF-02 owns it).
- `docs/` contributor note (the testing section of the file that lists `npm run check`): one paragraph on where timing budgets live and why.
Files: `vitest.config.ts`, `vitest.perf.config.ts`, `package.json`, `scripts/ci-local.sh`, `scripts/ci-local.test.mjs`, `playwright.config.ts`,
the moved test files, the doc.
Proof: typecheck, lint, `npx vitest run` three times in a row green, `npm run test:perf` green, `bash scripts/ci-local.sh` green except
WebKit core.spec if T-MF-02 has not landed (say so).

### T-MF-02. WebKit stops a stalled run in under 2.5 s (SA-10)

Do: reproduce with `KL NEXT_DIST_DIR=.next-T-MF-02 npx playwright test e2e/core.spec.ts --project=webkit` on its own. Trace the stall kill
chain in the sim host (the watchdog and stall probe from T-B3-26, commit d526ab2: heartbeat interval, misses before a stall is declared,
the grace before `terminate`, the reload) and the measurement in `src/components/studio/diagnostics-run.ts` (T-B3-23). Measure each step
in WebKit and in Chromium. Find where WebKit spends the extra second (for example timer clamping in a busy worker, a heartbeat that only
arrives after a macrotask the stalled worker never yields, `terminate` latency, or a reload that waits on a resource) and fix the cause so
WebKit is under 2.5 s with margin and Chromium is not slower. Do not change the 2,500 ms bound or the test's method. Update the SA-10 line in
`docs/MASTER_PLAN/05_ENGINEERING/results/B3.md` with the new numbers.
Files: the watchdog and host files in `src/sim/**` that the chain runs through, `src/components/studio/diagnostics-run.ts` and its test,
`e2e/core.spec.ts` only if the measurement itself is wrong (explain), `results/B3.md`.
Proof: typecheck, lint, the vitest files of what changed, `core.spec.ts` in webkit five runs in a row and in chromium three runs, all green.

### T-MF-03. Exit gate

Run the Exit row in full on build/v1. Fix a failure with the smallest correct change, committed as "MF gate: <what>".
