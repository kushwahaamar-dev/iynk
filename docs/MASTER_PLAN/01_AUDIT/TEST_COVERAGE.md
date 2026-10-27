# TEST_COVERAGE: what the tests cover and what they prove

Audited commit `bb546d6a051f0b268576587c6f9f934dde9e766c` (source unchanged since; only `docs/MASTER_PLAN/` is new).
Run on 2026-10-27, 11:47 to 11:50 CDT, on the founder's Mac (14 cores). The author reported a 1-minute load of about 3 to 7
(quiet), but no uptime file was kept for this run, so that is UNVERIFIED (see Review log). A re-run with the repo's own
config and uptime files is in §4.1. `time.log` does show the run
itself used 821 % CPU (about 8 of 14 cores). Label: validate:coverage. Evidence labels as in BRIEF §2.2.

Backing files: run reports [runs/COMMANDS.md](runs/COMMANDS.md), [runs/E2E.md](runs/E2E.md),
[runs/BUILD_OUTPUT.md](runs/BUILD_OUTPUT.md); inventory [inventory/tooling-tests-e2e.md](inventory/tooling-tests-e2e.md);
related [SECURITY_BASELINE.md](SECURITY_BASELINE.md), [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md). The raw coverage
data, scripts and logs live outside the repo in `/Users/amar/iynk-master-plan-scratch/audit/validate-coverage/` (scripts
`agg.py`, `reach.py`, `titles.py`, `classify.py`; data `titles.tsv`, `labels.tsv`, `reach_files.tsv`) and
`/Users/amar/iynk-master-plan-scratch/audit/coverage-2026-10-27/coverage-summary.json`. They are not committed; copy them
into `docs/MASTER_PLAN/08_RESEARCH_SPIKES/` if the numbers must be reproducible from a clone.

Pass/fail baselines are not re-derived here. See [runs/COMMANDS.md](runs/COMMANDS.md) (full `npm test` under load,
13 timeouts) and [runs/E2E.md](runs/E2E.md) (Playwright, 116 passed, 1 failed, 2 skipped of 119).

## 0. Summary

| # | Finding | Severity |
|---|---|---|
| 1 | Line coverage of `src/` code that the unit tests load is **81.5 % lines, 67.1 % branches, 74.7 % functions**. Add the files no test loads (16 % of source LOC outside `src/content`) and lines fall to about **67 %** (ESTIMATED). | medium |
| 2 | **The browser figures are not measured at all.** About 22 100 LOC in `figures/**` (the 3D engine, 12 boards, 13 drones, 13 robotics benches, parts, modules, flight range) show 0 files in the v8 report, because jsdom runs them as inlined scripts. The tests that touch them read their source as text or drive them through a stubbed canvas (`getContext = () => null`). No test checks that a pixel is drawn. | high |
| 3 | **No test checks simulated behaviour against real hardware.** Zero tests load measured data, a vendor datasheet file or a third-party simulator's output. About 15 tests transcribe a datasheet fact by hand (ESTIMATED, title-rule classification). The 342 strongest-looking tests (golden tables for the drone calculator) compare against numbers read off the original site's own `calc()`, per `calc.test.ts:20-26`; whether that site was written by the same authors is not established here. | high |
| 4 | About **1 in 8 tests (218 of 1677) checks that two project files agree** (content vs figure source vs `ids.ts` vs i18n JSON). They catch drift. They cannot catch a wrong value that is wrong in both files. | medium |
| 5 | `npm test` at the repo's own config (`vitest.config.mts`, `testTimeout: 60_000`, no overrides) **passes**: 2797 passed, 5 skipped, 0 failed, 117.4 s wall, exit 0, run 12:34 CDT with the keyless env (VERIFIED, see §4.1). It is green but not light: the run itself pushed the 1-minute load from 5.6 to 62, and the `basys3` sweep ran 66.5 s against a 120 s own limit. Under outside load (38 to 117) it failed 13 tests, all timing (COMMANDS.md). The test budgets are wall-clock, not simulated time. | high (gate reliability) |
| 6 | `npm test` and `npm run check` run **neither** `server/realtime` tests (39), **nor** the Solana program tests (34), **nor** the real-database test (4, skipped without Docker). There is **no CI**: `.github/` does not exist. | high |
| 7 | The main workspaces (`BoardWorkspace`, `LessonWorkspace`, `DroneWorkspace`, `FlyWorkspace`, `SerialMonitor`, `CodeEditor`, 22 pages under `src/app/[lang]`) have no unit test and are loaded by no unit test. Only e2e touches them. | medium |
| 8 | The real-WebSocket client path is not run by the keyless e2e run used in this audit (rooms fall back to BroadcastChannel). `playwright.config.ts` itself does not blank `NEXT_PUBLIC_REALTIME_URL`: a plain `npm run e2e` reads `.env.local`, where it is set (VERIFIED: variable present, value not read), so a default run points rooms at the production relay (RESUME.md rule 9). Reconnection is tested only with fake sockets. | medium |

## 1. Line coverage

### 1.1 How it was run

```
cd /Users/amar/Codes/ak/simlab
git status --short package.json package-lock.json        # empty before and after
node -p "require('./node_modules/@vitest/coverage-v8/package.json').version"   # 5.0.3, equals vitest 5.0.3
npx vitest run --coverage --coverage.provider=v8 --coverage.reporter=text-summary \
  --coverage.reporter=json-summary \
  --coverage.reportsDirectory=/Users/amar/iynk-master-plan-scratch/audit/coverage-2026-10-27 --testTimeout=180000
```

- VERIFIED: `@vitest/coverage-v8` 5.0.3 was already in `node_modules` (left by the dead first attempt, which used
  `--no-save`). So I did not run `npm install`. It is **not** in `package.json`; `git status` shows
  `package.json` and `package-lock.json` unchanged. Anyone reproducing must run the install line in section 6.
- Result: exit 0. `Test Files 172 passed | 1 skipped (173)`, `Tests 2797 passed | 5 skipped (2802)`, duration 144.72 s
  (`time`: 2:25.18 total, 821 % CPU). Raw log: `/Users/amar/iynk-master-plan-scratch/audit/validate-coverage/run.log`.
  Report: `/Users/amar/iynk-master-plan-scratch/audit/coverage-2026-10-27/coverage-summary.json`.
- The one skipped file is `src/lib/server/db/timescale.test.ts` (4 `it`; skipped by `describe.skipIf(!enabled)` at
  line 28 because `docker info` fails here). VERIFIED the skip condition; the file-to-skip link is inferred from the
  counts (1 file, 5 tests) and the Docker daemon being down.
- Contrast with COMMANDS.md: the same suite at load 38 to 117 failed 13 tests. In this run, with a 180 s timeout, it
  passed all. The failures are consistent with CPU contention, not logic: COMMANDS.md shows `wing.test.ts` passing alone. VERIFIED that this run passed; load as the cause is VERIFIED only for the files COMMANDS.md re-ran alone (octo still failed 1 of 31 alone at load 43 to 88). The 180 s override does not change `settle`'s fixed 50 s poll, so the passing `settle` tests are real evidence for load as the cause.

### 1.2 Two things the headline number hides

1. **vitest 5 reports only files that a test loaded.** There is no `coverage.include`/`all` in `vitest.config.mts`
   (VERIFIED, file read). Files no test imports are absent from the report, which flatters it. Section 1.4 adds them back.
2. **The v8 total includes 125 JSON files** (translation files imported by tests). They add 1552 trivially covered
   lines. Vitest's own text summary says 82.83 % lines; **without JSON it is 81.5 %**. I use the JSON-free numbers.

### 1.3 Results (v8, JSON excluded; script `scripts/agg.py` in the scratch folder)

Overall, all loaded code: **lines 81.5 % (16022/19664), branches 67.1 % (12059/17981), functions 74.7 % (4072/5454)**.
Vitest's printed summary (JSON included): lines 82.83 %, statements 78.51 %, branches 67.06 %, functions 74.66 %.

Roll-up by area:

| Area | Files in report | Lines | Branches | Functions |
|---|---|---|---|---|
| `src/lib/*` | 195 | 81.6 % (12280/15054) | 67.6 % (9301/13766) | 73.9 % (2837/3840) |
| `src/components/*` | 110 | 73.2 % (2247/3069) | 60.2 % (2065/3429) | 66.7 % (719/1078) |
| `src/app/api/*` | 23 | 95.4 % (355/372) | 80.9 % (224/277) | 94.0 % (79/84) |
| `src/content/*` | 41 | 99.6 % (990/994) | 93.9 % (353/376) | 99.5 % (388/390) |
| `src/i18n/*.ts` | 6 | 92.6 % (88/95) | 94.0 % (63/67) | 88.9 % (32/36) |
| `figures/engine` | 1 (`testkit.mjs`, the test helper itself) | 93.8 % | 85.7 % | 61.1 % |
| `scripts/` | 1 (`db-migrate.mjs`) | 66.7 % (32/48) | 76.3 % | 75.0 % |

`src/content/*` at 99.6 % is not a quality signal. Those files are declarative data objects; importing them executes them.

Per directory, `src/lib` and `src/components`:

| Directory | Files | Lines | Branches | Functions |
|---|---|---|---|---|
| `src/lib/interp` | 26 | 72.9 % (5006/6864) | 56.3 % | 59.9 % |
| `src/lib/realtime` | 14 | 69.9 % (713/1020) | 55.0 % | 63.0 % |
| `src/lib/solana` | 9 | 77.6 % (194/250) | 61.5 % | 78.0 % |
| `src/lib/ai` | 17 | 85.9 % (861/1002) | 74.6 % | 82.2 % |
| `src/lib/boardlab` | 5 | 88.4 % | 70.1 % | 82.5 % |
| `src/lib/dronelab` | 6 | 87.6 % | 78.0 % | 87.1 % |
| `src/lib/server` | 48 | 92.2 % (1379/1496) | 80.6 % | 90.2 % |
| `src/lib/flight` | 15 | 93.3 % (1114/1194) | 84.0 % | 95.8 % |
| `src/lib/hw` | 9 | 98.3 % (741/754) | 83.9 % | 97.0 % |
| `src/lib/drone` (calculator) | 3 (`calc.ts` 83 lines, `design.ts` 7, `__fixtures__/models.ts` 2; 3 JSON fixtures excluded) | 100 % (92/92) | 94.3 % | 100 % |
| `src/lib/robotics`, `search`, `sound`, `telemetry`, `verify`, `progress`, `settings` | 41 | 88.7 % to 96.8 % | 78.8 % to 91.3 % | 84 % to 100 % |
| `src/components/realtime` | 11 | 37.1 % (119/321) | 23.0 % | 24.3 % |
| `src/components/boardlab` | 6 | 45.5 % (50/110) | 50.4 % | 40.4 % |
| `src/components/dronelab` | 3 | 51.5 % (52/101) | 24.7 % | 65.8 % |
| `src/components/ai` | 10 | 64.4 % (201/312) | 55.1 % | 60.2 % |
| `src/components/solana` | 6 | 69.1 % | 52.4 % | 55.7 % |
| `src/components/flight` | 3 | 72.7 % (296/407) | 52.6 % | 71.9 % |
| `src/components/robotics` | 13 | 83.8 % | 66.7 % | 80.6 % |
| `src/components/search` | 6 | 82.8 % | 60.4 % | 69.5 % |
| `src/components/ui` | 27 | 80.1 % | 73.8 % | 76.5 % |
| `src/components/figure`, `data`, `dock`, `hw`, `shell`, `settings` | 29 | 82.8 % to 100 % | 64.7 % to 100 % | 77.6 % to 100 % |

Full table: run `python3 -I /Users/amar/iynk-master-plan-scratch/audit/validate-coverage/scripts/agg.py`.

Lowest-covered files with at least 40 lines (from the same report): `components/realtime/ChatPanel.tsx` 2.4 %,
`RoomBar.tsx` 2.5 %, `PresenceCursors.tsx` 3.8 %, `components/ui/Popover.tsx` 7.3 %, `lib/realtime/translate.ts` 10.2 %,
`components/dronelab/CliConsole.tsx` 22.0 %, `lib/ai/story-png.ts` 23.6 %, `components/ai/useVoice.ts` 34.7 %,
`lib/realtime/provider.tsx` 45.3 %. In the interpreter (the product's core): `arduino/libs.ts` 58.8 % of 776 lines,
`python/modules.ts` 58.8 % of 745, `python/runtime.ts` 62.7 % of 891, `arduino/parser.ts` 67.3 % of 575.

### 1.4 Code no unit test loads

`figures/engine`, `figures/*` and `server/realtime` cannot be read from the v8 report (see §0 item 2 and the node:test
note below), so this list uses my static-import reachability script (`scripts/reach.py`; counts files, LOC by `wc -l`
equivalent). Files in the repo, not test files, not fixtures: 591; reachable by static import from some test: 386 (ESTIMATED: static import graph; dynamic imports and path-string loads are not followed).

| Not in the v8 report | Files | LOC | Note |
|---|---|---|---|
| `figures/boards`, `drones`, `engine` (13 of 14), `flight`, `modules`, `parts`, `robotics` | 98 | 22 125 | Run in jsdom via `figures/tools/cfbuild.py` pages. Real coverage UNKNOWN, not 0. |
| `server/realtime` | 9 | 1 598 | Tested by `node --test` (39 tests), outside vitest. Coverage UNKNOWN. |
| `src/app/[lang]/**` (pages, `Lobby`, `Planner`, `Buddies`) | 22 | 2 273 | No unit test. e2e only. |
| `src/components/boardlab` (18 files) | 18 | 2 586 | `BoardWorkspace` 438, `LessonWorkspace` 427, `SerialMonitor` 225, `CodeEditor` 182. e2e only. |
| `src/components/dronelab` (9 files) | 9 | 1 569 | `DroneWorkspace` 425, `FlyWorkspace` 409. e2e only. |
| `src/components/shell` (14), `solana` (7), `flight` (3), `catalogue`, `editorial`, `dock` (1 each) | 27 | 2 111 | |
| `src/lib/solana/idl/iynk_passport.ts` | 1 | 800 | Generated IDL, ignore. |
| `scripts/*.mjs` (crawl-routes, figure-langs, figure-strings, figure-thumbs, gen-content-index, smoke-ai, smoke-search) | 7 | 1 124 | `content:check` runs gen-content-index; the rest have no test. |

ESTIMATED adjusted figure: counting the 8 642 LOC of unreachable `src/` files (excluding `src/content`, `src/i18n`, IDL; 15.7 % of 54 921 LOC, recomputed in review from `reach_files.tsv`) as uncovered and scaling by the measured v8-lines-per-LOC ratio (0.40, recomputed), lines for `src/` outside `src/content` and
`src/i18n` fall from 80.5 % to about **67 to 68 %** (recomputed 67.8 %). Assumptions: unloaded files have the same line density as loaded ones;
none are covered by e2e. e2e does cover some of them, so the true unit-plus-e2e figure is higher. UNKNOWN until e2e
runs with coverage (not attempted).

Python and Rust are outside the vitest run: `figures/tools/cfbuild.py` (build step, but also executed by every engine
test), the Anchor program `solana/programs/**` (tested by `solana/tests/iynk_passport.test.ts`, which needs a local
validator and was not run; see COMMANDS.md "What I did not run").

## 2. What the tests prove: oracle taxonomy

### 2.1 Method

I extracted every `it(`/`test(` title with `scripts/titles.py` (1677 declarations in 192 files; list in
`titles.tsv`), then classified each by title and by reading the file bodies I list as examples, with
`scripts/classify.py` rules. The class counts are **ESTIMATED, plus or minus about 10 %** (title rules, sampled
against bodies; `labels.tsv` holds every assignment). Declarations undercount generated tests: vitest ran **2802**
tests because loops and `it.each` expand (the golden tables alone add 342 rows). Counts below are declarations. Of the 1677, 145 are not vitest tests (`server/realtime` 39, `solana` 34, `e2e` 72), so vitest declarations are about 1532 against 2802 executed: about 1270 executed tests are generated rows, of which only the 342 golden rows are classified (as C). Percentages below are over declarations, not over executed tests. `titles.py` found declarations in 191 of the 192 files; `src/lib/drone/content.test.ts` (an `it(id` in a loop at `:104`, an `it.each` at `:113`) is missed.

Classes. The task's five, plus two I had to add because a large share of tests fit none:

| Code | Oracle |
|---|---|
| A | (a) External reference data: measured hardware, a vendor datasheet file, a third-party simulator. Split: **A-hw** a datasheet or spec fact typed by hand into the test (no source file in the repo); **A-ext** committed third-party data files. |
| B | (b) Hand-derived expected values from first principles (Ohm's law, a time or distance computed by hand). |
| C | (c) The implementation's own formulas, or an earlier implementation of them, re-run: tautological, or a golden master. |
| D | (d) Behavioural contract: an action produces a state. The author wrote the expectation. |
| E | (e) Smoke: renders or does not throw. |
| F | (added) Consistency: file A agrees with file B (content vs figure source vs `ids.ts` vs i18n JSON). Closest to (c). |
| G | (added) UI conformance: axe accessibility, layout fits, tap-target size. |

### 2.2 Counts per group

| Group | Files | Declared tests | A-hw | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|---|---|
| `src/content/boards/*.test.ts` | 12 | 149 | 5 | 0 | 0 | 60 | 0 | 84 | 0 |
| `src/content/robotics/*.test.ts` | 12 | 152 | 0 | 11 | 0 | 49 | 0 | 92 | 0 |
| `src/content/drones/*.test.ts` | 13 | 181 | 10 | 3 | 3 | 136 | 0 | 29 | 0 |
| `src/lib/interp` | 9 | 89 | 0 | 10 | 0 | 79 | 0 | 0 | 0 |
| `figures/engine/*.test.mjs` | 4 | 103 | 0 | 7 | 0 | 83 | 0 | 13 | 0 |
| `src/lib/drone` (calculator) | 3 | 16 (+342 generated rows, +3 `it.each`) | 0 | 0 | 16 (+342) | 0 | 0 | 0 | 0 |
| `src/lib/dronelab` | 3 | 61 | 0 | 0 | 0 | 61 | 0 | 0 | 0 |
| `src/lib/flight` | 4 | 58 | 0 | 0 | 7 | 51 | 0 | 0 | 0 |
| `src/lib/realtime` | 4 | 18 | 0 | 0 | 0 | 18 | 0 | 0 | 0 |
| `server/realtime/test` | 6 | 39 | 0 | 0 | 0 | 39 | 0 | 0 | 0 |
| `src/app/api/**/route.test.ts` | 14 | 88 | 0 | 0 | 0 | 88 | 0 | 0 | 0 |
| `e2e/*.spec.ts` | 12 | 72 (119 run) | 0 | 0 | 0 | 55 | 0 | 0 | 17 |
| `solana/tests` | 1 | 34 | 0 | 0 | 0 | 34 | 0 | 0 | 0 |
| `src/components/**` | 30 | 126 | 0 | 0 | 0 | 124 | 2 | 0 | 0 |
| `src/lib/server/**` | 20 | 183 | 0 | 0 | 0 | 183 | 0 | 0 | 0 |
| `src/lib/ai`, `src/lib/hw`, `src/i18n` | 18 | 129 | 0 | 0 | 0 | 128 | 1 | 0 | 0 |
| other `src/lib/*`, `src/app` | 27 | 179 | 0 | 0 | 0 | 175 | 4 | 0 | 0 |
| **All** | **192** | **1677** | **15** | **31** | **26 (+342)** | **1363** | **7** | **218** | **17** |

A-ext: about 10 tests in `src/lib/server/search/normalize.test.ts` map 9 committed SerpApi documentation samples
(`src/lib/server/search/__fixtures__/*.docs.json`) and are counted inside D above. They are the only tests with
committed third-party data, and they are about web search, not hardware.

Percent of declarations: D 81 %, F 13 %, B 1.8 %, C 1.6 % (plus 342 generated rows), A-hw 0.9 %, G 1.0 %, E 0.4 %.

### 2.3 Examples and what each group really tests

**Content tests (boards, robotics, drones).** Two kinds.

- F: `src/content/boards/nano.test.ts:32-61` reads `figures/boards/nano.js` with `readFileSync`, pulls part ids, header
  nets and circuit names out with regexes, and asserts the content module names the same ones. `src/content/robotics/hc-sr04.test.ts:35-56`
  does the same. Catches a renamed part. Cannot catch a wrong pinout in both.
- D: `nano.test.ts:70-85` runs each lesson's reference code through the interpreter and asserts the lesson's own
  `checks` pass. The checks are written by the same author as the code, so this proves the lesson is self-consistent.
  `src/content/robotics/hc-sr04.test.ts:130` also asserts every task's starter code does not already pass.
- B: `src/content/robotics/hc-sr04.test.ts:106` a wall 30 cm off prints `30.xx cm`; `src/content/robotics/led-resistor.test.ts:49` meter numbers from Ohm's law.
- A-hw: `esp32-devkitc.test.ts:36` input-only, strapping and ADC2 pins "the way the datasheet does";
  `pico.test.ts:84` GP0-GP22 5 V tolerant on RP2350 only; `nucleo-f401re.test.ts:122` analog inputs not 5 V
  tolerant; `esp32-s3-devkitc-1.test.ts:100` RGB LED on GPIO38 (v1.1) vs GPIO48 (v1.0); `nodemcu.test.ts:133` 5 GHz
  never connects. Drones: `quad5.test.ts:229` only settings Betaflight 2026.6.2 has, `delivery.test.ts:45` Mission
  Planner motor-test order, `cinewhoop.test.ts:27` the 1404 needs `motor_poles 12`. The facts are literals in the test;
  no datasheet or firmware file is committed to check them against. I did not verify them against vendor documents.
  UNKNOWN whether each is correct.
- C: `quad5.test.ts:52` "reproduces all 27 builds of drone-lab-a Appendix A".

**Drone calculator.** `src/lib/drone/calc.test.ts:1-120` compares `calc()` for every battery x motor x prop of 13
crafts against 108 + 234 = 342 golden rows. Per the header comment (`calc.test.ts:20-26`) and
`__fixtures__/extract.py:1-12`, the rows were "read off the original site's own calc()" and typed into research notes
(`docs/research/drone-lab-a.md` Appendix A, `drone-lab-b-calc-matrix.md`). So the oracle is an earlier implementation
(the original site's `calc()`; that it is the same project's own code is not established). Its physics (thrust, hover current, flight time) is not tied to any measured motor or battery.
Good as a port-parity guard. It says nothing about real thrust, and the tests would stay green if the formula was wrong.
Hand-derived checks exist (`calc.test.ts:131-226`, verdict thresholds such as "hover needs more than 60 % throttle").

**Interpreter.** `src/lib/interp/arduino/arduino.test.ts:174` `pulseIn` returns 1458 us at 25 cm. That is
2 x 25 cm / 0.0343 cm/us = 1457.7 us, a hand derivation (B). `arduino.test.ts:163` 16-bit `int` overflow on AVR vs
32-bit on ESP32 encodes real language rules (B). `src/lib/interp/python/microbit.test.ts:96` LOUD/QUIET thresholds 196 and 118 from "CODAL 85
dB and 65 dB" (B or A-hw; the reference is cited in the title only). The other 79 are D: the program produces this
serial text or pin trace. No test runs the same sketch on real hardware and compares.

**Figure engine.** `figures/engine/bench-solve.test.mjs:21` "Blink: 220 Ω from D13 gives the textbook 12.2 mA". The
number is not a textbook value for 5 V and 220 Ω (that would be near 14 mA with a 1.8 V LED). It is the solver's own
constants: `figures/engine/bench-solve.js:10` `PIN_R = 25`, `:102` LED `vf: 2`, `rd: .5`, giving
(5 - 2) / (25 + 220 + 0.5) = 12.2 mA. VERIFIED by reading and arithmetic. So this is class C/B: a hand calculation on the
model's own constants. Whether a real ATmega328P pin behaves like 25 Ω is not tested. The other tests of the solver
(`:51-190`: TIP120 saturates, flyback diode clamps, TMP36 0.5 V + 10 mV/°C, servo pulse width) are D or B on documented
formulas.

**Flight.** `src/lib/flight/flight.test.ts:46-60` checks that the flight sim's hover throttle equals the calculator's
(C, two code paths of this repo agreeing). Most others are D. `:114` "tops out near 50 km/h in angle mode" is an
author-chosen number. Two generated families (`:480`, `:508`) fly every craft and course to the end and assert no crash.

**Realtime.** `server/realtime/test/*.test.js` start the real relay on localhost and assert protocol behaviour (room
size 8, 64 KB frame limit, 60 frames per second flood cut-off, host hand-over). These are good D tests with a real
server and real sockets. `src/lib/realtime/relay.integration.test.ts` spawns the real relay as a child process on a
random port and runs three clients through it.

**API routes.** `src/app/api/ai/chat/route.test.ts:100-200` drives the full tool loop with scripted SSE from a fake
upstream (`src/lib/server/ai/__test__/upstream.ts`): a `search_datasheet` call, the citation event, a loop cap. D, no
real model. The datasheet "content" in those tests is invented strings (`"Forward voltage 2.0 V at 20 mA"`).

**e2e.** 55 D (Blink runs and the LED follows D13, `boardlab.spec.ts:91`; two tabs share a build,
`room.spec.ts:58`; backwards flight controller flips, `fly-fun.spec.ts:86`) and 17 G (axe on 5 spec files: 13
lines mentioning `axe` (`grep -c axe e2e/*.spec.ts`, summed), `sideways` scroll, 44 px targets). Baseline in E2E.md.

**Solana.** `solana/tests/iynk_passport.test.ts` has 34 D tests against a local validator (refusal paths, PDA
checks, bounty escrow, ten bounties in one transaction). It refuses to run unless `ANCHOR_PROVIDER_URL` is localhost
(`:17-19`). Not run in this audit.

### 2.4 Direct answer: do the tests validate real hardware behaviour?

No. VERIFIED by reading the example test bodies listed in §2.3 (not all 1677), by grepping all 192 test files for `datasheet|SPICE|measured|oscilloscope`
(7 files match; only `esp32-devkitc.test.ts` is about hardware, the rest are search or AI tests), and by listing every `__fixtures__` directory (`src/lib/{drone,dronelab,realtime,robotics,server/mcp,server/search,sound}`): they hold calculator tables, test doubles and SerpApi doc samples, no measurement or vendor file. A grep cannot prove absence; the fixture listing is the stronger evidence. What they validate:

1. The simulator is internally consistent (F, C: 244 declarations, 15 %, ESTIMATED).
2. Lessons pass the checks their author wrote for them (D, 1363 declarations).
3. Some behaviour matches facts the author knows from datasheets (A-hw 15 + B 31 declarations, 3 %).
4. The drone calculator still produces the numbers an earlier implementation did (342 rows).

Nothing compares a sim trace to a logic-analyser capture, a bench measurement, a Betaflight or ArduPilot SITL run, a
SPICE result or an official Arduino/CircuitPython run. For a product that claims "see what real hardware would do",
the oracle is the authors' memory and the original implementation. This is the largest correctness risk in the suite
(HYPOTHESIS for the product risk; the absence of external data is VERIFIED).

## 3. Gaps: what has no test, or only a fake one

| Area | What exists | Gap | Severity |
|---|---|---|---|
| Rendered figures (`figures/**`, 22.1k LOC) | Jsdom engine tests with canvas stubbed to null (`figures/engine/testkit.mjs:45-47`); source-as-text checks | No pixel, no screenshot, no visual regression. Draw bugs show only in e2e axe/layout checks. Coverage unmeasured. | high |
| Browser workspaces | e2e only | `BoardWorkspace`, `LessonWorkspace`, `DroneWorkspace`, `FlyWorkspace`, `SerialMonitor`, `CodeEditor`, `AssemblyPanel`, `WireInPanel`: 0 unit tests, 0 loaded (§1.4) | medium |
| Pages | e2e only | 22 files in `src/app/[lang]/**` (Planner, Lobby, Buddies, About, labs indexes) have no unit test. Their routes are crawled by e2e only if a spec visits them. | medium |
| Stores | `src/lib/dronelab/store.test.ts`, `src/lib/boardlab` tests | `src/lib/robotics/store.ts`, `src/lib/realtime/store-sync.ts`: no dedicated test, covered indirectly (`lib/robotics` 96.8 %, `store-sync` loaded). `boardlab/store.ts`: loaded through 4 tests. Not a gap in loading, a gap in direct assertions. | low |
| AI tool loop | `route.test.ts:100-200`, `tools.test.ts`, `provider.test.ts` (scripted SSE) | Never run against a real model. Prompt quality, tool-argument errors from a real model, cost and latency are untested. `scripts/smoke-ai.mjs` is manual and needs keys. `story-png.ts` 23.6 %, `useVoice.ts` 34.7 %. | medium |
| Relay client reconnection | `transports.test.ts:141` (fake socket: join, ping, backoff, resume as same peer); `room.test.ts:230` | `provider.tsx` 45 %, `translate.ts` 10 %, `components/realtime` 37 %. Real browser WebSocket reconnect is never run: the keyless audit run set `NEXT_PUBLIC_REALTIME_URL` empty in the shell (RESUME.md rule 9; `playwright.config.ts` does not), so `room.spec.ts` used the BroadcastChannel transport (`broadcast-transport.ts:5`). VERIFIED for the code comment and E2E.md line 63 (room spec passed keyless); what a default `npm run e2e` does with the production relay URL is UNKNOWN (not run). | medium |
| Relay server | 39 `node --test` tests, `server/realtime/test/load.js` (a script, not a test) | Not in `npm test` or `npm run check`. No coverage number. No multi-instance or restart test beyond graceful drain (`expiry.test.js:54`). | high |
| DB migrations | `migrate.test.ts` (fake SQL tag) and `queries.test.ts` | The SQL in `db/migrations/0001..0003` runs only in `timescale.test.ts`, which needs Docker and **skipped here**. In the default run no real SQL is executed. | high |
| Solana program | 34 tests on a local validator | Not in `npm test`; not run here. `src/lib/solana` 77.6 % lines, `components/solana` 69 %; `VerifyApp`, `PassportApp`, `BountyForm`, `TipButton`, `useChain` not loaded. | medium |
| Security paths | `src/app/api/**` tests (rate-limit and origin wording in 9 of 14 files) | Nine of the 14 route test files mention rate or origin handling (grep `rate|429|origin`), so these paths have some tests. Not checked here: whether every public route has one. No fuzz or dependency scan; no test that production headers/CSP exist. See SECURITY_BASELINE.md. | medium |
| Build and routes | `content:check`, e2e redirects spec | No test that `next build`'s 827 pages all render. `scripts/crawl-routes.mjs` exists but is untested and not in `check`. | medium |
| Performance | none | No benchmark, no budget test. Performance baseline: [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md). | medium |
| Translations | i18n tests (25) and e2e `shell.spec.ts` | Locale parity only. No review of correctness. `scripts/figure-langs.mjs`, `figure-strings.mjs` untested. | low |
| Phone/touch | `fly.phone.spec.ts`, `dock.phone.spec.ts` | 2 of 12 specs (1 phone project). Boards, robotics and drones labs untested on phone. | medium |
| CI | none | `.github/` absent (VERIFIED `ls .github`: No such file). `forbidOnly` and `retries: 2` in `playwright.config.ts:19-20` only matter when `CI` is set. | high |

## 4. Flakiness

| Source | Evidence | Effect |
|---|---|---|
| Wall-clock budgets on animated figures | 13 timeouts in COMMANDS.md under load 38 to 117; `src/content/drones/_checks.ts:358-364` `settle()` polls `Date.now()` for 50 000 ms; six drone files poll the same way (`agrihex`, `delivery`, `tricopter`, `vtol`, `swarm`, `gpscam`); `describe` timeouts are 30 000 (racer, whoop, cinewhoop), 40 000 (wing, longrange), 300 000 (seven files: agrihex, delivery, octo, swarm, tricopter, vtol, gpscam; `grep -n timeout src/content/drones/*.test.ts`) | Figures animate in real jsdom frames (`pretendToBeVisual: true`, `testkit.mjs:43`), so simulated time costs real time. Fail when CPU is shared. |
| Inconsistent budgets | `vitest.config.mts:15` `testTimeout: 60_000`; `describe` blocks of 30 s sit below `settle`'s 50 s | A test can time out before its own helper gives up. |
| Synchronous long bodies | `basys3.test.ts:241`, `de10-lite.test.ts:255`, `src/lib/interp/lessons.test.ts:76-84` (120 s and 60 s limits on a body that cannot be interrupted) | Vitest marks them timed out after the fact. |
| Earlier run (11:47) | Same suite, `--testTimeout=180000`: 2797 passed, 0 failed, 144.7 s | VERIFIED as a result; its "load 3 to 7" is UNVERIFIED (no uptime file). Superseded by §4.1, which needs no override. |
| Random ports | `relay.integration.test.ts:73` and `timescale.test.ts:35` pick `40000 + random(10000)`; `playwright.config.ts:5` same range | Collision with another process is possible (probability low, not zero). No retry on bind failure. |
| Real sockets and child processes | `relay.integration.test.ts` spawns `server.js`; `server/realtime/test` open WebSockets; timing tests: `limits.test.js:47` flood, `expiry.test.js:33` peer timeout | Sensitive to load. `--test-concurrency=1` in `server/realtime/package.json:14` reduces overlap. |
| External services | `timescale.test.ts` needs Docker; `solana` needs a local validator; `relay.integration` skips if `server.js` is missing | Silent skip (a `console.info`) turns a red gate into a green one. 5 tests skipped here for this reason. |
| Date and randomness | `e2e/fly-fun.spec.ts:132` compares today's date with the page (midnight rollover); `chat/route.test.ts:200` uses `Math.random()` in a tool id (harmless); `solana` tests compare `Date.now()` within 120 s | Low. |
| Python in the unit tests | `figures/engine/testkit.mjs:18` runs `python3 -I figures/tools/cfbuild.py` via `execFileSync` | Unit tests need Python 3 on the machine; a missing interpreter fails 4 engine files and 6 content files that load figures. |
| e2e, one failure | `]` shortcut on Blink, `e2e/boardlab.spec.ts:171` (E2E.md: HYPOTHESIS focus stays in the editor or a lost key) | A shortcut test with a race. Retries are 0 outside CI. |
| Skips by condition | `e2e/boardlab.spec.ts:207` two skips because no board is untranslated | Fine, but it is a test that cannot fail today. |

No figure test uses fake timers; 11 files use `vi.useFakeTimers` (`grep -rln useFakeTimers src figures server`), in hw, realtime, server and component tests. Replacing wall-clock
polling with frame stepping (`SL.bench.advance(secs)` already exists, used at `bench-solve.test.mjs:18`) is the
fix for most of the 13.

## 5. What a production test strategy must add (for 05_ENGINEERING/TEST_STRATEGY)

1. **Add a real hardware oracle.** Pick a small set of reference captures per lab and commit them as fixtures with
   provenance: bench-measured LED/transistor/regulator curves, vendor datasheet tables (key as CSV with page
   references), logic-analyser traces of a real Uno running Blink and an HC-SR04 read, Betaflight SITL and ArduPilot
   SITL output for a hover and an arm sequence. Each test names its source. Target: every lab has at least 10 tests of
   class A.
2. **Replace A-hw literals with fixtures.** Move the 15 transcribed datasheet facts (§2.3) into data files with a
   source URL and revision, so reviewers can check them.
3. **Make the gate deterministic.** Replace `Date.now()` polling in `_checks.ts` and the six drone tests with
   simulated-time stepping (`advance`); set one `testTimeout`; split the slow figure suites into a `slow` project that
   runs serially. Goal: `npm test` green at any load.
4. **Make all gates one command.** Add `server/realtime` tests, the Solana tests (local validator in CI), and a
   Timescale container (a CI service) to `npm run check`. Remove the silent skip: fail when a required service is
   missing in CI (`process.env.CI`).
5. **Stand up CI.** Create `.github/workflows`: typecheck, lint, `content:check`, unit with coverage, build with
   keyless env, Playwright (chromium and phone) with `retries: 2`, an artifact upload of traces, and a nightly job for
   the heavy suites. Enforce a coverage floor per directory (start: `src/lib/interp` 80 %, `src/lib/server` 90 %,
   `src/app/api` 90 %, `src/components` 70 %), and set `coverage.include` so unloaded files count as 0.
6. **Measure the figures.** Run the figure pages in a real browser (Playwright) with `page.coverage` (V8) or switch
   the figure sources to modules vitest can transform; report `figures/**` coverage. Add pixel snapshots
   (Playwright `toHaveScreenshot`) for each lab's default view, with a documented tolerance, in a pinned container.
7. **Close structural gaps.** Unit or component tests for the workspaces and pages (§1.4), at least a render
   smoke per page; direct tests for `robotics/store.ts` and `store-sync.ts`; tests for `translate.ts` and
   `provider.tsx`.
8. **Run the real transports.** An e2e project that sets `NEXT_PUBLIC_REALTIME_URL` to a local relay (never
   `rt.iynk.tech`) and drops the socket mid-session; add a relay restart test and a multi-peer soak (`load.js` as a
   scheduled job).
9. **AI evals.** Keep the scripted-SSE route tests, and add a small recorded-response replay plus a nightly eval on a
   real model with budget caps (prompts, tool-calls, refusal, citation correctness). Never in the PR gate.
10. **Contract tests for the data layer.** Run the migrations against a real Postgres in CI on every change; add a
    migration up/down and idempotency test, and a schema-drift check against `queries.ts`.
11. **Property and fuzz tests** for the interpreters (Arduino C++, MicroPython, Verilog): the parser at 67 % branch
    coverage is the product's crash surface. Use fast-check or a corpus of real sketches from public Arduino examples
    and compare with a real compiler where possible (avr-gcc syntax check).
12. **Accessibility and phone.** Extend axe to every route (via the route crawler) and add the phone project to all
    labs. Add the keyboard-shortcut test blur fix for `]` (E2E.md).
13. **Security tests.** Header/CSP assertion, rate-limit and origin tests for each public route, dependency audit in
    CI, secret scanning (the repo is public).
14. **Make the number visible.** Publish unit and e2e results and coverage per directory on each PR; keep
    `runs/COMMANDS.md`-style baselines in the repo.

### 4.1 Re-run with the repo's own config (2026-10-27, 12:34 to 12:36 CDT)

Closes the review gap "npm test has never been shown to pass at the repo config". Files are in
`/Users/amar/iynk-master-plan-scratch/audit/test-coverage-fix/` (`uptime_before.txt`, `uptime_after.txt`, `run.json`,
`time.log`, `<name>.json`, `uptime_*_<name>.txt`). Nothing in the repo changed; no coverage plugin, no `--testTimeout`.

Command (keyless env from RESUME rule 9 exported first):
`time npx vitest run --reporter=json --outputFile=run.json`

| Item | Value | Label |
|---|---|---|
| Exit code | 0, `success: true` | VERIFIED (`run.json`) |
| Tests | 2802 total: 2797 passed, 0 failed, 5 pending (skipped); 851 suites, all passed | VERIFIED (`numPassedTests` etc. in `run.json`) |
| Time | 1:57.42 wall, 744.7 s user, 28.1 s system, 658 % CPU | VERIFIED (`time.log`) |
| Load before | `uptime` 12:34: 1 min **5.63**, 5 min 2.62, 15 min 2.33. Ten seconds earlier it read 1.87 / 1.78 / 2.05. The 5.63 came from a Spotlight `mds_stores` process (161 % CPU) and my own `ps`/`grep` commands, so it is just over the "under 5" target. | VERIFIED (`uptime_before.txt`) |
| Load after | 12:36: 1 min **62.41**, 5 min 26.23, 15 min 11.74. This is the run's own load (658 % CPU, many jsdom workers), not outside load. | VERIFIED (`uptime_after.txt`) |
| Slowest tests (duration in `run.json`) | `basys3` display sweep 66.5 s; `agrihex` RTK masts 53.9 s; `vtol` servo swing 48.7 s; `delivery` failsafe 47.0 s; `octo` gear 44.6 s. 24 tests took over 10 s. | VERIFIED |
| Skips | 5, same count as the 11:47 run (relay integration and Timescale conditions, §4 table) | VERIFIED count; cause carried over from the earlier run |

Reading. The suite passes at the repo's own 60 s budget on a machine that started near-idle (load 1.9 to 5.6, a
5-minute average of 2.6). It is not shown to pass under outside load, and it will fail if another heavy job shares the CPU, because the
slowest test (`basys3` display sweep, 66.5 s) is over the 60 s default and passes only because its own limit is 120 s
(`basys3.test.ts:238-250`, `}, 120_000)`). The drone figure tests that took 45 to 54 s sit under a 300 s `describe` timeout
(`agrihex.test.ts:177`; 300 000 ms in seven drone files, §4), so they have margin; the `basys3` sweep has 53 s (VERIFIED).
The first of the two "quiet" claims in the old header is withdrawn: the 11:47 run's load is not known, and
BROWSER_WALK's 3.6 is a separate reading in the same minutes while this suite used 8 cores.

One run only. Flakiness is not measured; a second and third run would be needed for a pass rate (UNKNOWN).

### 4.2 octo, basys3 and wing alone, on the quiet machine

Each run: `npx vitest run src/content/<dir>/<name>.test.ts --reporter=json --outputFile=<name>.json`, keyless env, `uptime` saved before
and after, started only when the 1-minute load was under 5. These replace the ESTIMATED "would pass when quiet" rows in COMMANDS.md §7
(COMMANDS.md was not edited here; its owner should link this section).

| File | Result | Wall time | Load before / after (1 min) | Slowest test | COMMANDS.md under load | Label |
|---|---|---|---|---|---|---|
| `src/content/drones/octo.test.ts` | exit 0, 31 passed, 0 failed, 0 skipped | 60.2 s | 2.83 / 4.55 | 23.8 s | 1 of 31 failed, 248.6 s | VERIFIED |
| `src/content/drones/wing.test.ts` | exit 0, 27 passed, 0 failed | 27.6 s | 3.11 / 4.25 | 15.5 s | 27 of 27 passed, 69.4 s | VERIFIED |
| `src/content/boards/basys3.test.ts` | exit 0, 24 passed, 0 failed | 36.3 s | 3.19 / 3.61 | 27.8 s | 1 of 24 failed (120 s timeout), 214.1 s | VERIFIED |

Slowest-test times alone are less than half of the full-suite times for the same tests (octo gear 44.6 s in the full run), which
supports the COMMANDS.md reading that these three tests fail only through CPU contention (the wall-clock budget is not
the simulation). The octo and basys3 failures under load are therefore load-dependent, not logic faults (VERIFIED by these three
passes; the cause being contention is the consistent explanation, not separately proven).

## 6. Reproduce

```
cd /Users/amar/Codes/ak/simlab
npm install --no-save @vitest/coverage-v8@$(node -p "require('./node_modules/vitest/package.json').version")
git checkout -- package.json package-lock.json   # only if either changed
npx vitest run --coverage --coverage.provider=v8 --coverage.reporter=text-summary --coverage.reporter=json-summary \
  --coverage.reportsDirectory=<dir> --testTimeout=180000
python3 -I /Users/amar/iynk-master-plan-scratch/audit/validate-coverage/scripts/agg.py     # per-directory table
python3 -I /Users/amar/iynk-master-plan-scratch/audit/validate-coverage/scripts/reach.py   # unloaded-file list
python3 -I /Users/amar/iynk-master-plan-scratch/audit/validate-coverage/scripts/titles.py && python3 -I .../classify.py
```

Counts: 192 test files = `find src figures server solana e2e -type f \( -name '*.test.*' -o -name '*.spec.*' \)`
(excluding node_modules). Test declarations 1677 = `titles.py`. Dynamic vitest total 2802 = vitest summary.

## 7. Not done

- e2e was not run with coverage; Solana and `anchor test` not run; Docker was down so the Timescale test did not run.
- Only one full `npm test` run at the repo config was made (§4.1); no pass rate over repeated runs.
- `server/realtime` tests were not re-run here (39/39 recorded in COMMANDS.md).
- The A-hw facts were not checked against vendor documents.
- Class counts are title-rule estimates (plus or minus about 10 %), sampled against test bodies, not a line-by-line audit of all 1677.
- `it.each(...)(` declarations that span lines are missed by `titles.py`; the generated rows are counted only via the vitest total.

## Review log (2026-10-27)

Adversarial review. Method: re-ran cheap commands, opened the cited lines, recomputed the tables from the scratch data
(`coverage-summary.json`, `labels.tsv`, `reach_files.tsv`, `not_reachable.tsv`). Nothing in the repo was changed.

Checked (31 statements): test-file count 192 (`find`, matches); `.github` absent (matches); no `coverage.include` in
`vitest.config.mts` (matches); `testTimeout: 60_000` at line 15 (matches); overall 81.5 / 67.1 / 74.7 % and Vitest's
82.83 / 78.51 % (recomputed from the JSON, match); 125 JSON files and 1552 lines (match); area roll-up for lib, components,
api, content, i18n, realtime components, interp, realtime lib, hw (recomputed, match); lowest-covered file percentages (match);
`PIN_R = 25` (`bench-solve.js:10`) and LED `vf: 2, rd: .5` (`:102`), and the 12.2 mA arithmetic (match; 1.8 V LED at
220 ohm is 14.5 mA, match); `getContext = () => null` (`testkit.mjs:46`) and `pretendToBeVisual` (`:43`); Playwright
`forbidOnly`/`retries` (`:19-20`) and random port (`:5`); Timescale `skipIf` (`:28`); `server/realtime` script
`--test-concurrency=1` (`package.json:14`) and 39 tests; 34 Solana tests; 9 of 14 API route test files mention
`rate|429|origin`; 11 files use `useFakeTimers`, none under `figures`; 98 unloaded figure files, 22 125 LOC (match);
golden rows 108 + 234 = 342 (match); 827 static pages (BUILD_OUTPUT.md); 2797 passed / 5 skipped / 144.72 s (run.log, match);
class counts against `labels.tsv`; the 16 % unloaded share (recomputed 15.7 %); the 67 % adjusted figure (recomputed 67.8 %).

Wrong, now corrected in place:

| Statement | Problem | Fix |
|---|---|---|
| "1-minute load about 3 to 7, so the machine was quiet" (header, §1.1 "VERIFIED by this run") | No uptime file exists for the 11:47 run. The only uptime file (`coverage-logs/uptime_before_run.txt`) is the dead 01:04 attempt at load 87. The run used 821 % CPU itself. | Downgraded to UNVERIFIED; the "CPU contention, not logic" claim reworded to what COMMANDS.md supports. |
| "The e2e config sets `NEXT_PUBLIC_REALTIME_URL` empty" (§0 #8, §3) | `playwright.config.ts` does not. The audit shell did. A default run reads `.env.local`, which sets it. | Reworded; production-relay risk of a default run stated. |
| `src/lib/drone` row: 6 files, 105/105 lines | The 105 included 13 lines of JSON fixtures that the table says are excluded. | 3 files, 92/92. |
| `src/components/boardlab` 19 files / 2 634 LOC; shell group 29 files / 2 252 LOC; 8 909 unloaded LOC | `not_reachable.tsv` gives 18 / 2 586, 27 / 2 111, 8 642. | Corrected; the adjusted line figure still holds at 67 to 68 %. |
| Table §2.2: flight B 1, D 50; ai/hw/i18n D 129, E 0 | `labels.tsv`: flight B 0, D 51; ai/hw/i18n D 128, E 1. Column totals (31 B, 1363 D, 7 E) were already right. | Rows fixed. |
| "1677 declarations in 192 files" | `titles.py` found 191 files; `drone/content.test.ts` is missed. Also 145 of the 1677 are not vitest tests, so the "2802 vs 1677" comparison hid about 1270 generated tests that are unclassified. | Counter-note added in §2.1. |
| 18 `axe` mentions | `grep -c axe e2e/*.spec.ts` sums to 13 lines in 5 files. | 13. |
| 300 000 ms timeouts in "six files" | Seven (octo is the seventh). | Fixed. |
| Calculator oracle "an earlier implementation by the same project" | The test header says "the original site's own calc()". Common authorship is not shown anywhere. | Reworded; HYPOTHESIS. |
| "VERIFIED by reading all 12 groups" (§2.4) | Only the examples in §2.3 were read; there are 16 groups and 1677 tests. | Reworded; fixture-directory listing added as the real evidence. |
| About 25 line references off by one or pointing at the wrong file (`calc.test.ts:12-21` is `:20-26`; `testkit.mjs:22` is `:18`; Solana guard `:17-19`; `hc-sr04`/`led-resistor` are under `src/content/robotics`, not `boards`; `lessons.test.ts` is under `src/lib/interp`; e2e and board test lines shifted by one) | Opened each line. | Corrected. |

Not changed, but flagged: the A-hw (15), B, C and F counts are title-rule estimates (already labelled); `normalize.test.ts`
"about 10 tests map 9 SerpApi samples" was not re-checked (the file has 20 `it(` lines and 12 mentions of `docs`);
`npm run check` does include `npm run e2e` (`package.json:23`), so §0 #6 is right that it omits relay, Solana and database
tests, but readers should not infer that `check` is unit-only; the scripts that produced the tables are outside the repo
(see the top of this file). Statements checked and found true were left alone.

Counts: 31 statements checked, 12 wrong or overclaimed (the table above).

## Gap fixes (2026-10-27)

| Gap | What was done | Status |
|---|---|---|
| 1 [high] `npm test` at the repo config never shown to pass; "load 3 to 7" had no uptime file; 821 % CPU contradicts BROWSER_WALK's 3.6 | Ran `time npx vitest run --reporter=json` with no overrides and the RESUME rule 9 keyless env, with `uptime` saved before (12:34, 1 min 5.63, 5 min 2.62) and after (12:36, 62.41, the run's own load). Result: exit 0, 2797 passed, 5 skipped, 0 failed, 117.4 s (§4.1). Then ran octo, wing and basys3 alone at 1-minute load 2.8 to 3.2: 31/31, 27/27, 24/24 pass (§4.2), replacing the ESTIMATED "would pass" claims. Header, §0 #5, the §4 "This run" row and §7 updated. | Closed, with limits: start load 5.63 was just over the "under 5" target (the 5-minute average was 2.6); one run only, so no flake rate; the 11:47 run's own load stays UNKNOWN; the `basys3` sweep used 66.5 s of its 120 s limit. FEATURE_VERIFICATION:67, REPOSITORY_INVENTORY and COMMANDS.md §7 still carry the old wording and belong to other fixers. |
