# COMMANDS: command re-run results

Agent: validate:commands. Planning only. No source, test, config, package.json or lockfile was changed.

| Field | Value |
|---|---|
| Run date | 2026-10-27, 00:22 to 01:00 CDT |
| Repo | `/Users/amar/Codes/ak/simlab` |
| Audited source commit | `bb546d6a051f0b268576587c6f9f934dde9e766c` |
| Current HEAD | `16a3d09e943d5eddd1cc2aba7b025be83f731913` (docs-only: "Master plan, paused ...") |
| Source matches audited commit | VERIFIED. `git diff --stat bb546d6 -- . ':(exclude)docs/MASTER_PLAN'` printed nothing (exit 0). `git status --short` printed nothing at the start. |
| Node | v24.8.0 (`.nvmrc` says `24`, `package.json` engines `24.x`). VERIFIED |
| npm | 11.6.0. VERIFIED |
| CPU | `sysctl -n hw.ncpu` = 14 |
| Machine quiet? | **No.** Never quiet during this task. See load table. Every duration below is **measured under contention**, not a quiet-machine number. |
| Scratch logs | `/Users/amar/iynk-master-plan-scratch/audit/validate/` (one `.log` and one `.meta` per command; `.meta` holds start/end time, exit code and `uptime` before and after) |

## Load average (1-minute) around each command

Rule was: if load > 20, wait up to 8 minutes, then go on. The first `uptime` was `68.84 44.99 39.10`. The wait loop (`waitload.sh`, 30 s checks, `waitload1.log`) ran from 00:24:25 to 00:32:26 (17 checks). The lowest 1-minute value seen was 38.21, the highest 116.86. It never reached 20, so I proceeded after 8 minutes.

| Command | Load before | Load after |
|---|---|---|
| typecheck | 96.62 | 94.33 |
| lint | 93.83 | 82.82 |
| `npm test` (full) | 76.57 | 48.66 |
| octo alone | 46.61 | 42.27 |
| wing alone | 42.92 | 42.90 |
| basys3 alone | 43.07 | 85.87 |
| basys3 display sweep only | 80.28 | 88.04 |
| frame probe, octo gear | 82.73 | 98.67 |
| frame probe, wing elevons | 96.55 | 96.42 |
| keyless build | 86.39 | 74.12 |
| `server/realtime` tests | 67.58 | 65.77 |

Another session was running on the same machine. I did not touch its processes.

## Results

Exit codes and durations come from `<name>.meta` and `/usr/bin/time -p` in the scratch folder. Durations are wall seconds (`real`).

| # | Command | Exit | Seconds | Passed / failed / skipped | One-line summary | Label |
|---|---|---|---|---|---|---|
| 1 | `node -v; npm -v; git rev-parse HEAD; git status --short; git diff --stat bb546d6 ...` | 0 | <1 | n/a | Node 24.8.0, npm 11.6.0, tree clean, source identical to audited commit | VERIFIED |
| 2 | `npm ls --depth=0` | 0 | 1.77 | n/a | 40 declared deps (22 + 18 dev) plus 6 extraneous (see note) | VERIFIED |
| 3 | `npm run content:check` | 0 | 1.05 | n/a | "content index: 12 boards, 13 robotics, 13 drones (unchanged)" | VERIFIED |
| 4 | `npm run typecheck` (`next typegen && tsc --noEmit`) | 0 | 6.20 | n/a | no type errors | VERIFIED |
| 5 | `npm run lint` (`eslint . --quiet`) | 0 | 42.68 | n/a | no errors. `--quiet` hides warnings; the full count is 114 warnings, 0 errors (see Gap fixes, gap 1) | VERIFIED |
| 6 | `npm test` (`vitest run`, whole repo) | **1** | 357.39 | 2784 / **13** / 5 of 2802 tests; files 163 passed, **9 failed**, 1 skipped of 173 | all 13 failures are timing: 8 vitest timeouts, 4 `still busy after 50000 ms` errors from `settle`, 1 test poll that ran out of time (list below) | VERIFIED |
| 7a | `npx vitest run src/content/drones/octo.test.ts` | **1** | 248.57 | 30 / **1** / 0 of 31 | landing-gear test: "octo: still busy after 50000 ms" | VERIFIED |
| 7b | `npx vitest run src/content/drones/wing.test.ts` | **0** | 69.42 | 27 / 0 / 0 of 27 | passes alone; elevon test took 38.4 s of its 40 s limit | VERIFIED |
| 7c | `npx vitest run src/content/boards/basys3.test.ts` | **1** | 214.14 | 23 / **1** / 0 of 24 | display chip sweep: "Test timed out in 120000ms" after 172 s | VERIFIED |
| 7d | extra: basys3 display sweep only (`-t "lesson display passes at every value"`) | 1 | 163.24 | 0 / 1 / 23 filtered out | same timeout, body took 159 s; used to get CPU time | VERIFIED |
| 8 | keyless `NEXT_DIST_DIR=.next-audit npm run build` | 0 | 72.77 | n/a | Next.js 16.4.3 (Turbopack), 827 static pages. Details in `BUILD_OUTPUT.md` | VERIFIED |
| 9 | `cd server/realtime && npm test` | 0 | 7.12 | 39 / 0 / 0 of 39 | node:test relay suite, 7 suites, `node_modules` was present, no `npm ci` | VERIFIED |
| 10 | `cargo --version; anchor --version` in `solana/` | 0 / 0 | <1 | n/a | cargo 1.91.1, anchor-cli 0.31.1 present. Suite later run in a scratch copy: 34 of 34 pass (see Gap fixes, gap 3) | VERIFIED |

Notes on rows:

- Row 2. (Superseded by Gap fixes, gap 2: a clean `npm ci` in a scratch clone succeeds and has no extraneous packages, so these 6 come from the old `node_modules`, not from the lockfile.) `npm ci` was **not run** at the repo root because `node_modules` exists and the task said not to. The 6 extraneous entries are `@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`, `@img/sharp-wasm32`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util` (log lines 13 to 28). They are wasm fallbacks that npm installed but `package.json` does not list. `npm ls` still exits 0. Severity low. Count: `rg -c "──" 02_npm_ls.log` = 46; `node -e` on `package.json` gives 22 dependencies + 18 devDependencies = 40.
- Row 6. Totals are vitest's own summary (`Test Files 9 failed | 163 passed | 1 skipped (173)`, `Tests 13 failed | 2784 passed | 5 skipped (2802)`). Vitest reported 355.74 s; `time -p` says 357.39 s; `user` CPU was 1189.90 s.
- Rows 7a, 7b, 7c ran one after another, each alone.
- Row 7d is not in the task list. I added it to measure CPU time of the basys3 sweep without the other 23 tests.
- A harness slip: my first build attempt (`./run.sh 09_build ./build.sh`) exited 127 in 0 s because the wrapper changes directory and the relative path was wrong. No build ran. The second attempt is the one reported.

## Three files run alone

This section is the one to quote. Each file was run alone with `--reporter=verbose`, after the full suite, on a machine with load 43 to 88 (not quiet). In the full run all three files failed. Alone, one of them passes.

| File | Full suite | Alone | Alone, test that failed | Cause |
|---|---|---|---|---|
| `octo.test.ts` | 3 of 4 figure tests failed (settle) | 1 of 31 failed | landing gear (`octo.test.ts:192`) | wall-clock budget smaller than the CPU work of one animated test |
| `wing.test.ts` | 1 failed (40 s timeout) | **27 of 27 pass** | none | passes with 1.6 s to spare; fails only when the machine is slower |
| `basys3.test.ts` | 1 failed (120 s timeout) | 1 of 24 failed | display chip sweep (`basys3.test.ts:241`) | 95 interpreter runs in one synchronous test; CPU time x contention > 120 s |

None of the three is an assertion mismatch or a hang. All three are the same problem: tests with a wall-clock budget, run on a shared machine. I did not measure a quiet-machine run, so the "would a quiet machine pass" parts are ESTIMATED.

### Shared mechanism for the two drone files (VERIFIED by reading source and running a probe)

1. `openFigure()` (`src/content/drones/_checks.ts:344`) builds the real figure page with `cfbuild.py` and loads it in jsdom (`figures/engine/testkit.mjs:43`, `pretendToBeVisual: true`). `HTMLCanvasElement.getContext` is stubbed to `null` (`testkit.mjs:47`), so nothing is drawn, but the engine still runs its frame loop.
2. Every `press`, `run`, `add` and `remove` calls `settle()` (`_checks.ts:358` to `362`). `settle()` polls `busy()` every 25 ms (`_checks.ts:361`) until no test, build queue or part animation is running. Default budget is 50000 ms. On expiry it throws `${id}: still busy after ${ms} ms` (`_checks.ts:362`).
3. The figure animates in simulated seconds. Each frame advances simulated time by at most 0.05 s: `dt = Math.max(0, Math.min(.05, (now - lastT) / 1000))` (`figures/vendor/colorfigures/core.js:497`). So a test that lasts N simulated seconds needs at least N / 0.05 frames, however slow each frame is. A slow frame does not skip ahead; it just takes longer in wall time.
4. A part moving in or out takes about 0.45 simulated seconds (`pl.t + 2.2 * dt`, `figures/engine/drone.js:371`). Bench tests take their own time: octo gear 7 s (`figures/drones/octo.js:64`, `GEAR_T = 7`), wing elevons 4.5 s (`figures/drones/wing.js:71`, `ELEV_T = 4.5`).
5. I measured the cost of one frame with a scratch probe (`frame_probe.mjs`, plain `node`, loads the same built figure, no repo writes). Numbers are under load 82 to 98, so they are inflated:

| Probe | Simulated s | Real frames | CPU s | Wall s | CPU per frame | Wall per frame |
|---|---|---|---|---|---|---|
| octo, press `gear` after `plugIn` | 7.1 | 142 | 33.25 | 62.03 | about 234 ms | about 437 ms |
| wing, press `elevons` after `plugIn` | 4.54 | 91 | 7.98 | 12.93 | about 88 ms | about 142 ms |

   (The probe's raw `frames` column is 284 and 182 because it counts every `requestAnimationFrame` callback, and the engine also has a 60 ms timer fallback (`core.js:500`). Real frames = simulated seconds / 0.05. Raw JSON is in `08_probe_octo_gear.log` and `08_probe_wing_elevons.log`.)

6. Both probes settled by themselves. So the animation does reach t=1 and the test does end. It is slow, not stuck. VERIFIED.
7. Why a frame costs 88 to 234 ms of CPU with no canvas: not investigated. HYPOTHESIS: the engine still projects and sorts the whole 3D scene in JavaScript on every frame and only the final draw call is a no-op. A CPU profile would confirm it.

### octo.test.ts alone (7a): 30 pass, 1 fail

- Failing `it()`: "works the landing gear only with a pack in, and forgets the pass when the craft is rebuilt", `src/content/drones/octo.test.ts:192`. Failure is at line 197, the second `await fig.press('gear')`, after `run('plugIn')`.
- Error, quoted: `Error: octo: still busy after 50000 ms` at `settle src/content/drones/_checks.ts:362:23`, called from `Object.press _checks.ts:369:5`.
- Test time before failing: 53.6 s. The other three figure tests passed alone: GPS 44.5 s, prearm 105.4 s, smoke 40.9 s.
- Mechanism: the vitest timeout is not involved. The `describe` timeout is 300000 ms (`octo.test.ts:183`), far above `settle`'s own 50000 ms. The gear press needs 7.1 simulated seconds, which is 142 frames at about 234 ms CPU each, about 33 s of CPU. With the CPU shared, that took 62 s wall in the probe, so `settle` gave up at 50 s. The same press in the full suite (load 77, 14 workers) failed the same way in three octo tests (lines 197, 212, 232).
- Prearm passed at 105 s because it is many short settles; each one stayed under 50 s. The 300 s `describe` timeout covers that.
- Quiet machine: ESTIMATED to pass. Probe CPU for the gear press is 33 s, under the 50 s `settle` budget, about 30 percent margin. This assumes CPU time is the same on a quiet machine. Probe CPU was measured under load, so the real quiet figure is probably lower. Not measured.
- Whole file CPU: 161.62 s user for 247 s wall (ratio 1.5).

### wing.test.ts alone (7b): 27 of 27 pass

- The test named by the previous audit, "passes the elevon check on the right build, and not with a servo reversed or the FC backwards" (`wing.test.ts:118`), **passes alone**: 38418 ms. Its limit is `{ timeout: 40000 }` on the `describe` (`wing.test.ts:110`). Margin: 1.6 s.
- In the full suite it failed with `Error: Test timed out in 40000ms.` at 40313 ms.
- Mechanism: a vitest timeout, not a `settle` timeout. The lead is right that 40000 is shorter than the 50000 `settle` default, but no single `settle` ran long here. The whole test is the problem. It has 3 animated elevon runs of 4.5 simulated seconds (the first `press` happens with no battery and returns early at `figures/drones/wing.js:126` with a message, inferred from the code, not traced), plus plug and unplug movements and three part swaps. About 20 simulated seconds in total (ESTIMATED by counting the calls), of which the 3 elevon runs are 13.5 s. Probe: one elevon run costs 8 s CPU under load.
- Quiet machine: ESTIMATED to pass with room. The file used 46.07 s CPU for 68.3 s wall (ratio 1.45), so the elevon test is about 38.4 / 1.45 = about 26 s of CPU, against a 40 s limit. HYPOTHESIS until an idle run is timed. A 40 s limit gives about 14 s of margin, which is thin if the machine is slower or the figure gets heavier.
- The previous audit saw it fail alone on a load of about 50. This run saw it pass alone on a load of about 43. That fits a test that sits within a few seconds of its limit.

### basys3.test.ts alone (7c, 7d): 23 pass, 1 fail

- Failing `it()`: "lesson display passes at every value each chip offers: the checks follow the code", `src/content/boards/basys3.test.ts:241`. The 120 s limit is the third argument, `}, 120_000)` at line 250. The test is generated by the loop at lines 240 to 251, one `it()` per lesson that has parameters.
- Error, quoted: `Error: Test timed out in 120000ms.` The test took 172179 ms in the whole-file run and 159010 ms in the display-only run.
- Work counted from source with `count_sweep.mjs` (loads `src/content/boards/basys3.ts` with Node type stripping and applies the test's own value rule, lines 242 to 243):

| Lesson with params | Param | min / max / step | Values = `round((max-min)/step)+1` | `runChecks` calls |
|---|---|---|---|---|
| blink | `hz` | 1 / 5 / 1 | 5 | 5 |
| counter | `settle` | 2 / 20 / 1 | 19 | 19 |
| display | `refresh` | 60 / 1000 / 10 | 95 | 95 |
| total | | | | **119** (3 lessons x 1 param each) |

  Source lines: `basys3.ts:405`, `:420`, `:461`. The sweep for `blink` took 2.7 s and `counter` 25.7 s wall in the same run; `display` is 95 values.
- Mechanism: the test body is synchronous. It calls `runChecks` 95 times in a row (`runHeadless` interpreting Verilog for `runMs: 3000`, `basys3.ts:468`). The environment is `node` (`basys3.test.ts:1`), no jsdom. Vitest cannot interrupt a synchronous body, so it waits for the body to return and then checks the clock: `if (deadline.exceeded()) { rejectTimeoutError(); return; }` (`node_modules/vitest/dist/chunks/run.BTlFXlnv.js:3285` to `3288`). So the test is marked failed with "timed out" even though the body finished. If any of the 95 `expect` calls had failed, the error would be an `AssertionError` naming `display refresh=<n>`, not a timeout. So all 95 runs passed their checks and only the time was too long. VERIFIED (source read plus the error type).
- CPU measured: display-only run used 69.65 s `user` CPU for 163.24 s wall. Startup takes about 2 to 3 s, so about 0.7 s of CPU per `runChecks`, 67 s for 95 runs (ESTIMATED from user time). Contention made it about 2.3 times slower in wall time.
- Quiet machine: ESTIMATED to pass, at about 67 to 70 s against a 120 s limit. HYPOTHESIS until timed idle. Not measured.
- The same sweep also exists in `src/content/boards/de10-lite.test.ts:255` with `120_000`, but it only has 5 values (script output), and it passed in the full run.

## Other failures in the full run (6 files, 8 tests)

These were not re-run alone. Whether they pass alone is UNKNOWN. The previous audit reported they did (203 of 206 on its re-run), which I did not reproduce.

| # | Test | File:line | Error | Limit | Same family? |
|---|---|---|---|---|---|
| 1 | racer: passes the receiver test once the receiver and the flight controller are on | `racer.test.ts:95` | Test timed out in 30000ms | `describe` 30000 (`racer.test.ts:87`) | figure animation vs vitest timeout |
| 2 | racer: fails the smoke stopper on a reversed capacitor | `racer.test.ts:123` | Test timed out in 30000ms | same | same |
| 3 | longrange: needs a GPS lock, the props off and a battery before the failsafe test | `longrange.test.ts:112` | Test timed out in 40000ms | `describe` 40000 (`longrange.test.ts:93`) | same |
| 4 | cinewhoop: fails the smoke stopper on a capacitor fitted stripe to plus | `cinewhoop.test.ts:134` | Test timed out in 30000ms | `describe` 30000 (`cinewhoop.test.ts:81`) | same |
| 5 | whoop: fails the smoke stopper on a reversed BT2.0 lead | `whoop.test.ts:107` | Test timed out in 30000ms | `describe` 30000 (`whoop.test.ts:74`) | same |
| 6 | vtol: swings the rotors only with the servos and the flight controller on | `vtol.test.ts:208` | `vtol: still busy after 50000 ms` (`_checks.ts:362`, via `run` at `:373`) | `describe` 300000 (`vtol.test.ts:189`) | same as octo |
| 7 | vtol: fails the tilt test with the servos fitted reversed | `vtol.test.ts:245` | `AssertionError: expected false to be true` | local `until()` waits at most 60000 ms (`vtol.test.ts:196`) | an own polling loop ran out of wall time; the tilt never reached "passed" in 60 s |
| 8 | lessons: `esp32-s3-build / web-led` | `src/lib/interp/lessons.test.ts:76` | Test timed out in 60000ms (took 66.5 s) | explicit `}, 60_000);` at `lessons.test.ts:84` (global `testTimeout` is also 60_000, `vitest.config.mts:15`) | synchronous interpreter run, same as basys3 |

Plus octo x3 and wing and basys3 (above) makes 13. Count check: racer 2, longrange 1, wing 1, cinewhoop 1, whoop 1, lessons 1, octo 3, basys3 1, vtol 2 = 13. 9 files. Matches the vitest summary.

Severity: **high** for the project's own gate. `npm test` exits 1 on a loaded machine, so `npm run check` (`package.json` script `check`) cannot be a reliable pre-merge gate while these tests keep wall-clock budgets. No functional assertion failed in any of the 13.

## Skipped tests (5)

Found with `npx vitest run src/i18n src/lib/solana/passport.test.ts src/lib/drone/content.test.ts src/lib/server/db/timescale.test.ts src/lib/realtime/relay.integration.test.ts --reporter=verbose` (`12_skipped_probe.log`, 10 files passed, 1 skipped, 477 passed, 5 skipped). That subset reproduced the full-run skip count exactly.

| Skipped | Reason | Label |
|---|---|---|
| `src/lib/server/db/timescale.test.ts`, 4 tests | `describe.skipIf(!enabled)`. `enabled` needs `IYNK_TEST_DATABASE_URL` or a Docker daemon. `docker info` exits 1 here (Docker 29.0.1 is installed, the daemon is not running). The test printed "skipped (no IYNK_TEST_DATABASE_URL and no Docker daemon)". | VERIFIED |
| `src/i18n/server.test.ts`, 1 test "prose missing in a language falls back to the English file" | `test.runIf(untranslated)` at `server.test.ts:29`: nothing is untranslated, so it does not run | VERIFIED |

The TimescaleDB migrations and queries have therefore not been run against a real database in this audit. The relay integration test (`relay.integration.test.ts`) was not skipped; it ran against a relay it started on a random local port.

## No contact with production

Static check before the suite: tests that name iynk.tech, devnet or RPC (`solana-routes.test.ts`, `status/route.test.ts`, `devnet-adapter.test.ts`, `devnet-wallet.test.tsx`, `PassportPanel.test.tsx`, `mcp/tools.test.ts`, `env.test.ts`) mock `next/server`, `fetch` or the Solana context (`vi.mock` / `vi.stubGlobal`). `relay.integration.test.ts` spawns the local relay on `ws://127.0.0.1:<random 40000 to 49999>`. `server/realtime` tests use local ports too. I found no test that needed to be stopped. I did not start a server on 3000 or 43117 and did not run `next start` or `next dev`.

## What I did not run, and why

| Not run | Why |
|---|---|
| `npm ci` at the repo root | Forbidden by the task; `node_modules` exists. `npm ls` exits 0. **Closed later** in a scratch clone, see Gap fixes, gap 2. |
| `anchor test` | **Closed later** in a scratch copy: 34 of 34 pass, see Gap fixes, gap 3. Original reason: toolchain is present (below), but `solana/Anchor.toml:16-17` sets `[provider] cluster = "devnet"`, and its own comment says a bare `anchor test` would deploy to devnet. The npm script wraps `--provider.cluster localnet`. The task said to prefer reporting over starting a validator, the machine load was 60 to 100, and a run writes `solana/target/` and `.anchor/`. |
| `npm run e2e` (Playwright) | Not in the command list. |
| `npm run check` | It chains e2e and the commands above; the commands were run one by one. |
| `/api/status` curl | No server was started. The status check belongs to the later serve step. |
| ESLint warning count | `npm run lint` uses `--quiet`, so warnings are hidden. **Closed later**: 114 warnings, 0 errors, see Gap fixes, gap 1. |
| An idle-machine run of any suite | The machine never dropped below load 38. |

### Solana toolchain (step 10)

`cd solana && (cargo --version; anchor --version)`: `cargo 1.91.1 (ea2d97820 2025-10-10)` exit 0; `anchor-cli 0.31.1` exit 0. Also present: `solana-cli 4.2.2`, `solana-test-validator 4.2.2`, `rustc 1.91.1`, `cargo-build-sbf 4.1.0` (platform-tools v1.54, rustc 1.89.0). `Anchor.toml:2` pins `anchor_version = "0.31.1"`, `solana_version = "4.2.2"`. All match. VERIFIED (versions). The suite result is in Gap fixes, gap 3.

## Repository left clean

- Before the build: `git status --short` empty.
- After `next build`, `git diff --stat tsconfig.json` showed `1 file changed, 3 insertions(+), 1 deletion(-)`. Next added two include lines, `.next-audit/types/**/*.ts` and `.next-audit/dev/types/**/*.ts`.
- I ran `git checkout -- tsconfig.json` to undo it. **tsconfig.json was reverted.**
- After that: `git status --short` printed nothing, and `git diff --stat -- package.json package-lock.json tsconfig.json` printed nothing. `package.json`, `package-lock.json` and `tsconfig.json` are unchanged.
- `scripts/gen-content-index.mjs` ran as a pre-step of `build`, `test` and `typecheck`. It reported "(unchanged)" each time, so `src/content/index.generated.ts` was not rewritten.
- `.next-audit/` (632 MB, gitignored by `.next-*/`) was kept as asked. `next-env.d.ts` and `.next/` are also gitignored.
- The only repo files written are this file and `BUILD_OUTPUT.md`. Everything else is in the scratch folder.

## Bug autopsy and cheap guardrails (HYPOTHESIS, not applied)

The tests assume the machine is about as fast as the author's. The engine lets simulated time pass at no more than 0.05 s per frame, so a slow machine cannot catch up; it just takes longer. The budgets are fixed wall seconds.

- Drive the figure's frame clock by hand in tests (call the step function in a loop) so a test costs CPU, not waiting time. This removes `settle()` polling and the 50 s ceiling. It would also cut the wall time (the figure files take 70 to 250 s each).
- Split the display sweep into `it.each` over values, or sample a handful of values (min, max, default, three middle points). 95 interpreter runs in one synchronous test is the longest test in the repo.
- Put the three heavy files in their own vitest project with a low worker count, so they do not compete with each other and with the other 170 files.
- Make the per-describe timeouts consistent. 30000 and 40000 on `describe` blocks sit below the 50000 default of `settle`, and 300000 on octo and vtol hides slow runs. `vitest.config.mts:11-14` already says these tests "slow down while every other suite, or a build, shares the CPU", so the authors knew.

Two views, as asked. A perfectionist would say a test suite that turns red under load is not a gate and the fix is deterministic frame stepping. A pragmatist would say passing alone on a normal laptop is enough for a hackathon codebase, and a single `testTimeout` bump to 180000 plus running those files serially is a one-line change. Both are consistent with the numbers above. The choice is the founder's and the engineers'.

## Gap fixes (2026-10-27)

Three gaps from the completeness critic. Scratch work is under `/Users/amar/iynk-master-plan-scratch/audit/` (`validate/`, `npmci/`, `solana-run/`). The real repo was not touched: `git status --short` outside `docs/MASTER_PLAN` printed nothing afterwards. Machine load was high but not recorded for these runs, so times are indicative.

### Gap 1: ESLint warning count (closed)

Command, from the repo root: `npx eslint . --format json -o .../validate/eslint-all.json` (exit 0, 10.7 s wall). Then `node -e` summed `warningCount` and `errorCount` over the JSON.

| Measure | Value |
|---|---|
| Files linted | 817 |
| Errors | 0 |
| Warnings | 114, in 57 files |

Warnings by rule (count by `ruleId` over all messages):

| Rule | Count |
|---|---|
| `@typescript-eslint/no-unused-vars` | 103 |
| `@typescript-eslint/no-unused-expressions` | 4 |
| no rule id: "Unused eslint-disable directive" (`server/realtime/src/protocol.js:25`, `:28`; `src/components/flight/FlightRange.tsx:559`) | 3 |
| `@next/next/no-img-element` | 2 |
| `react-hooks/exhaustive-deps` | 2 |

So `npm run lint` is green because of `--quiet`, and 114 warnings sit behind it; 90% are unused variables or imports (dead code, low severity). Only 5 distinct rules fire. VERIFIED. A cheap guardrail (HYPOTHESIS): fix the 103 and drop `--quiet`, or set `--max-warnings` to a ratchet.

### Gap 2: clean install (closed)

`git clone /Users/amar/Codes/ak/simlab .../npmci/repo`, then `npm ci`, then `npm run typecheck`. The clone's HEAD is `a79239c` (the audited commit is `bb546d6`); `git diff --stat bb546d6 HEAD -- . ':!docs'` printed nothing, so no source file differs. The clone has no `.env.local` and no old `node_modules`.

| Step | Exit | Time | Result |
|---|---|---|---|
| `npm ci` | 0 | 5.6 s wall (npm cache was warm, so a cold network install will be slower; ESTIMATED) | `added 1052 packages, and audited 1053 packages in 6s`; 15 vulnerabilities (13 moderate, 2 high); deprecations: `uuid@8.3.2`, `eslint@9.39.5` |
| `npm ls` in the clone | 0 | n/a | `npm ls \| grep -ciE "extraneous\|invalid\|missing"` = 0 |
| `npm run typecheck` | 0 | 20.9 s wall | `next typegen && tsc --noEmit`, no errors |

Findings:
- A clean install works and typechecks. The failure the critic feared is ruled out. VERIFIED.
- The 6 extraneous wasm packages in row 2 do not appear after `npm ci`. They are leftovers in the old `node_modules`, not a lockfile defect. VERIFIED.
- `npm ci` printed EBADENGINE warnings (20 lines, 4 packages: `@asamuzakjp/css-color@7.1.8`, `@asamuzakjp/dom-selector@9.2.4`, `jsdom@30.1.2`, `w3c-xmlserializer@6.0.0`). They need node `^22.22.2 || ^24.15.0 || >=26.0.0`; this machine has v24.8.0, and `package.json:5-7` says `"node": "24.x"`. Install still succeeds, but a node 24.8 CI image may hit the same warnings, and jsdom (test environment) runs on an engine below its stated minimum. Severity low. VERIFIED (command: `grep -A1 "package:" npmci/ci.log | grep package | sort -u`).
- Not covered: Windows or Linux installs, and a cold npm cache. UNKNOWN.

### Gap 3: the 34 Anchor tests (closed, claim C041 confirmed)

`solana/` was copied to `.../solana-run/solana` (the copy skipped one socket file, `.anchor/test-ledger/admin.rpc`). Port check before the run: `lsof -nP -i :8899 -i :8900` empty. The copy's `Anchor.toml:[test.validator]` sets `rpc_port = 43711`, `faucet_port = 43714`, `gossip_port = 43716`, so the run did not use 8899, 3000 or 43117. It uses `npm test`, which is `anchor test --provider.cluster localnet` (`solana/package.json:9`). `cluster = "devnet"` in `[provider]` is overridden by that flag, and the run started a local `solana-test-validator`; nothing was deployed or sent to devnet. A rebuild of the program happened in the copy (full `Compiling` log, because the copied `target/` did not match the new path).

| Measure | Value |
|---|---|
| Exit code | 0 |
| Wall time | 1:47.83 (about 108 s; includes the Rust rebuild) |
| node:test duration | 22.5 s |
| Tests / suites | 34 / 5 |
| Pass / fail / cancelled / skipped / todo | 34 / 0 / 0 / 0 / 0 |
| Compute units | 21,024 (credential, no bounties); 53,451 (ten bounties in one transaction) |

Confirmed: `grep -c "ℹ pass 34" .../solana-run/test.log` = 1. Claim C041 ("tested on a local validator", README.md:95; docs/hacktx/DEVPOST-WRITEUP.md:195) changes from VERIFIED-PARTIAL to VERIFIED for the suite passing on this machine. Limits: one run, no repeat for flakiness; the suite ran against a fresh local validator, not the deployed devnet program, so it says nothing about the live deployment's state. The earlier reason for skipping (the devnet default) was a misreading of the npm script. After the run no validator process remained (`ps aux | grep -c "[s]olana-test-validator"` = 0, port 43711 free).
