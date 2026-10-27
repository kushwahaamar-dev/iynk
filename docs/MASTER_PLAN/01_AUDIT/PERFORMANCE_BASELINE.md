# PERFORMANCE BASELINE

Agent: validate:perf. Run 2026-10-27 (CDT), 11:19 to 11:45. Audited commit `bb546d6`. Planning only: nothing under `src/`, `figures/`, `e2e/` or `package.json` was changed; `git status` shows no change from this run.

Build under test: keyless production build in `.next-audit` (BUILD_ID `VsDtXhW_JAiyhjCcImodm`), see [runs/BUILD_OUTPUT.md](runs/BUILD_OUTPUT.md). Served with `next start --port 47322`, all 11 key names empty. `curl -s localhost:47322/api/status` printed `{"features":{"ai":false,"image":false,"voice":false,"search":false,"solana":false,"db":false,"realtime":false,"gemini":false}}` before I began (VERIFIED). The server and every browser I started are stopped (`lsof -i :47322` empty afterwards).

## 0. How to read the numbers

| Item | Value |
|---|---|
| Machine | Apple Silicon Mac, 14 cores, macOS (Darwin 27.0.0), Node v24.8.0, Playwright Chromium (headless) from the repo |
| Load | The machine was not idle. Load average (1 min) was 2.95 to 6.7 during the runs (`uptime` before each step; 3 to 5 typical; sections 6 and 7 record peaks of 6.7 and 6.1). Other apps (Cursor, Brave) were open. Each table says which load it ran at. Treat every time as "on a busy laptop", not as a quiet-machine floor. |
| Network | Loopback to a local `next start`. TTFB is 4 ms, so there is no network cost in any timing. Transfer sizes are real; download times on a real network are my arithmetic (ESTIMATED). |
| Cache | Cold: a new browser context per run (empty HTTP cache). |
| Runs | 3 per page and setting, median shown. Raw: `/Users/amar/iynk-master-plan-scratch/audit/perf/pages.out.jsonl`. Transfer and decoded sizes labelled "KB" in that file and in this document are KiB (bytes / 1024); sizes quoted in bytes (B) are exact. |
| Headless caveat | Headless Chromium has no real GPU and no display vsync. Its `requestAnimationFrame` ran at a clean 60.0 to 60.3 fps on every page, so rAF rate says nothing about GPU cost; CPU use of the main thread is the useful signal. |
| Measured vs estimated | MEASURED = I ran it and the output is in the scratch folder. ESTIMATED = arithmetic from measured values or from reading code. Marked per row. |

Scratch folder for everything: `/Users/amar/iynk-master-plan-scratch/audit/perf/` (scripts `pages.mjs`, `cpu.mjs`, `mem.mjs`, `res.mjs`, `flythr.mjs`, `bench/`).

## 1. Bundle

Sources: `.next-audit/diagnostics/route-bundle-stats.json` (per-route first-load chunk lists), `ls -S`, `gzip -c | wc -c`, and Playwright resource timing. Gzip here is `gzip -c` (default level 6); Next's server sent about the same (resource `encodedBodySize`, e.g. chunk `35ya76-4stw__.js` 566,690 B decoded, 186,561 B encoded).

### Totals (VERIFIED)

| Fact | Value | Command |
|---|---|---|
| JS files in `.next-audit/static` | 116 files, 5,637,633 B | `find .next-audit/static -name '*.js' -print0 \| xargs -0 cat \| wc -c` |
| Same, gzipped file by file | 1,759,063 B | `... xargs -0 -n1 sh -c 'gzip -c "$0" \| wc -c' \| awk '{s+=$1} END{print s}'` |
| `.next-audit/static` on disk | 6.6 MB | `du -sh .next-audit/static` |
| Whole `.next-audit` | 632 MB at build time (BUILD_OUTPUT.md); 696 MB when re-checked on 2026-10-27 12:19 with `du -sh .next-audit` (the directory grew after the build, cause not investigated) | BUILD_OUTPUT.md, re-run |

### First Load JS per route (VERIFIED from the stats file; gzip is mine)

The build log prints no First Load column in Next 16.4, so these come from `route-bundle-stats.json` (same figures as BUILD_OUTPUT.md).

| Route group | First-load JS (raw) | Gzip | Chunks |
|---|---|---|---|
| `/[lang]/boards/[board]/[lesson]` | 2,221,388 B | 701,192 B | 16 |
| `/[lang]/drones/[drone]/fly` | 1,720,232 B | 538,513 B | 16 |
| `/[lang]/drones/[drone]` | 1,694,772 B | 527,435 B | 16 |
| `/[lang]/robotics/[bench]` | 1,686,406 B | 524,384 B | 16 |
| `/[lang]/boards/[board]` | 1,671,175 B | 518,616 B | 16 |
| `/[lang]/passport` | 1,040,258 B | 316,434 B | 12 |
| `/[lang]/verify` | 1,023,819 B | 311,311 B | 12 |
| `/[lang]/together` | 585,839 B | 181,379 B | 11 |
| `/[lang]` (landing) | 530,074 B | 162,807 B | 10 |
| `/[lang]/boards`, `/drones`, `/robotics` indexes | about 512,000 B | about 156,700 B | 9 |
| `/[lang]/about` | 510,082 B | 155,885 B | 9 |
| `/[lang]/[...rest]` | 499,351 B | 151,776 B | 8 |
| `/_not-found` | 457,636 B | 135,709 B | 6 |

### Largest chunks (VERIFIED)

Command: `ls -S .next-audit/static/chunks | head -20`, then `wc -c` and `gzip -c | wc -c` on each. What each contains was identified by searching the chunk text (Turbopack minified chunks carry no module paths, so "what" is from distinctive strings, label EXTERNAL-style inference but reproducible with the grep shown).

| Chunk | Raw B | Gzip B | What it is | Evidence (grep in chunk) | In first load of |
|---|---|---|---|---|---|
| `35ya76-4stw__.js` | 566,690 | 186,578 | Code editor and lesson workspace: CodeMirror | `cm-editor` 2, `@codemirror` 1, `cm-content` 7, `EditorView` 2 | lesson page only |
| `3udl7h009mgfk.js` | 467,464 | 139,467 | Solana wallet stack | `wallet-adapter` 98, `PublicKey` 27, `Base58` 60, `borsh` 4, `Keypair` 3 | 7 routes (lesson, board, drone, fly, bench, passport, verify) |
| `2wx6lphu82mf2.js` | 402,361 | 103,903 | UI string dictionary, one locale (Hindi) | starts `JSON.parse('{"-- bench notes --":"-- बेंच नोट्स --"` | none (lazy) |
| `26rmydnsg8v_g.js`, `38y538ywht43s.js`, `2v0o-wj3yfwjl.js`, `2chbuzvvaffv-.js` | 307k, 305k, 295k, 284k | 96k, 95k, 95k, 99k | Same dictionary in fr, es, de, zh | same start pattern | none (lazy) |
| `3n07f77quq7wq.js` | 304,842 | 94,340 | Shared app code with the zod schemas | `ZodError` 5, `BIGINT_FORMAT_RANGES` | 5 routes |
| `2ymp_kdegn1q3.js` | 249,046 | 82,797 | Interpreter and lesson runtime (Python/rclpy device models) | `rclpy` 8, `micropython` 1 | 5 routes |
| `20box33a0_n53.js` | 229,627 | 71,939 | React DOM and the Next client runtime | `hydrateRoot`, `createRoot`, `Symbol.for("react` 21 | all 15 routes |
| `3l_qmp-61z4yc.js` | 168,793 | 46,522 | React core and helpers | `Symbol.for("react` 5, `createRoot` 6 | all 15 routes |
| `0cz1d0mv5g_q7.js` | 112,594 | 39,490 | Polyfills (core-js) | `core-js` 3; listed as a script tag in the landing HTML | landing HTML lists it |
| `1i6xo3ca-5jia.css` | 102,424 | 19,743 | The one stylesheet | file name | all |
| `13mdnn2g_uvw1.js` | 88,861 | 31,613 | Flight page code | `requestAnimationFrame` 5, `quad` 1 | fly only |
| `0-mwqh9oks02b.js` | 85,876 | 16,208 | Lesson content data for a board (the arduino lessons) | starts `id:"board",n:1,level:"intro",language:"arduino-cpp"` | lazy |

### Which heavy dependencies load where

| Dependency | In `package.json` | In a browser chunk? | Landing page | Lesson page (`/en/boards/uno-r3/blink`) |
|---|---|---|---|---|
| CodeMirror | `@codemirror/*` x7 | yes, `35ya76` (567 KB raw, 187 KB gzip) | not in the first-load list (530 KB), but **fetched at about 255 ms after load** (see below) | in first load |
| Solana wallet adapter + web3.js | `@solana/*` x4 | yes, `3udl7` (467 KB raw, 139 KB gzip) | not in first-load list, **fetched at about 255 ms** | in first load |
| `@coral-xyz/anchor` | 0.31.1 | **no**: `grep -ao "AnchorProvider"` on every big chunk gives 0. The "anchor" word counts in the old scratch table are CSS and text, not the library. `grep -rln coral-xyz src` finds no import at all, so the dependency is unused by `src/` (VERIFIED); it is a declared but unused package. | no | no |
| Zod | yes | yes, in `3n07f` | yes (fetched) | yes |
| Interpreter / lesson runtime | in-house | `2ymp` (249 KB raw) | **fetched at about 255 ms** | in first load |
| three.js | not a dependency | no. Chunks say `three` 3 times, as the English word. | no | no |

Finding table:

| # | What | Where | Evidence | Why it matters | Severity |
|---|---|---|---|---|---|
| B1 | The landing page's "first load" is 530 KB, but the browser downloads **2.29 MB raw (727 KB transferred) of JS in 23 scripts** within 3 s, because four large chunks arrive about 255 ms after load: CodeMirror (567 KB), wallet stack (467 KB), zod/app code (305 KB), interpreter (249 KB). They load as `script`, not `link` prefetch (`initiatorType` = `script`, `/Users/amar/iynk-master-plan-scratch/audit/perf/init.mjs`). They are not named in the landing HTML (`grep -c 35ya76 landing.html` = 0). Cause is not read from source: HYPOTHESIS that `partialPrefetching: true` (`next.config.ts:6`) makes Next fetch client chunks of linked lab routes. No `prefetch` prop exists in `src/` (`grep -rn prefetch src` = no hits). MEASURED, cause HYPOTHESIS. The late fetch and the `script` initiator type were reproduced in the review (re-run of `init.mjs`: 22 `script` entries, 742,659 B encoded, same three big chunks fetched as `script`; the count is 22 or 23 depending on how the polyfill tag is counted). | `/en` | resource timing: `35ya76` start 255 ms, `3udl7` 255 ms, `3n07f` 255 ms, `2ymp` 255 ms | A first-time visitor on a slow phone pays for the editor and a wallet library they have not asked for. The "First Load JS" number understates the real cost. | high |
| B2 | The 467 KB wallet stack is in the first load of the lesson, board, drone, fly and bench pages, none of which needs a wallet to start. Verified import chain for lessons: `LabDock.tsx:11` imports `PassportPanel`, and `LessonWorkspace.tsx:5` and `BoardWorkspace.tsx:5` import `LabDock`. No `next/dynamic` or `React.lazy` exists in `src/` (`grep -rn "next/dynamic\|React.lazy\|lazy(" src` = no hits in `.tsx`). For the drone, fly and bench pages the chain is the same (VERIFIED in the review): `DroneWorkspace.tsx:5`, `FlyWorkspace.tsx:6` and `BenchWorkspace.tsx:6` import `LabDock` from `@/components/dock/LabDock` and render it (`DroneWorkspace.tsx:403`, `FlyWorkspace.tsx:245`, `BenchWorkspace.tsx:354`). `PassportPanel.tsx:4` imports `useWallet` from `@solana/wallet-adapter-react`. | lesson, bench, drone, fly | `grep -ao "wallet-adapter" 3udl7h009mgfk.js \| wc -l` = 98 | 139 KB gzip of mostly unused code on every lab page, in a product where Solana is optional (`feature:"solana"` flag false here). | high |
| B3 | The first-load budget of a lesson page is 2.2 MB raw / 701 KB gzip, 4 times the landing. | lesson | stats file | Cost on the pages that matter most for learners. | medium |
| B4 | Locale dictionaries are 284 to 402 KB raw each and lazy, so they are not in the first-load numbers; one switch to a non-English locale downloads about 95 to 104 KB gzip. | 5 chunks | `ls -S` | Fine for now, grows with every language and every string. | low |
| B5 | A polyfill chunk (112 KB raw, 39 KB gzip) is a script tag on the landing page. | `0cz1d0mv5g_q7.js` | landing HTML | Modern browsers do not need core-js; check `browserslist`. Not investigated further. | low |

Download time on a real link, ESTIMATED from the transferred sizes (no latency or handshake): landing JS 727 KB + figure 153 KB + CSS 20 KB = 900 KB, about 0.7 s at 10 Mbit/s and about 7 s at 1 Mbit/s. Lesson: 750 + 153 + 20 = 923 KB, about the same.

## 2. Figures

### Size (VERIFIED)

Commands: `find public/figures -name '*.html' | wc -l` = 80; sizes with `stat -f '%z %N'`, median with Python `statistics.median`.

| Metric | Value |
|---|---|
| Figure files | 80 (`public/figures/{boards 12, robotics 13, modules 12, drones 13, parts, flight 1}`) |
| Total raw size | 24,669,406 B (24 MB, `du -sh public/figures`) |
| Total gzip (each file) | 8,127,710 B (`gzip -c \| wc -c` summed) |
| Largest | `public/figures/boards/uno-r3.html`, 495,777 B (157,187 B transferred) |
| Next largest | `robotics/qtr-8rc` 374,365; `robotics/a4988` 373,126; `robotics/transistor-switch` 367,837; `robotics/l298n` 363,795 |
| Median | 316,478 B |
| Smallest | `flight/range.html`, 70,275 B (21,339 B transferred) |
| Per folder (raw) | parts 9.07 MB, robotics 4.61 MB, boards 4.24 MB, modules 3.84 MB, drones 2.83 MB, flight 0.07 MB |
| Vendor core | `figures/vendor/colorfigures/core.js` = 65,755 B |

Every figure is one self-contained HTML file: `cfbuild.py` inlines the engine and parts into it (uno-r3.html holds `embed.js` 15.6 KB, `bench.js` 100 KB, `bench-kinds.js` 33 KB, `bench-solve.js` 30 KB, `bench-props.js` 18 KB, 20 part scripts and the board script 24 KB, measured with a Python split on the `<script>/* figures/... */` comments). So the 100 KB engine and the vendor core are downloaded again with each different figure; browsers cannot cache them across figures (reasoning from the file layout; not tested with two figures in one session). Finding F1, severity low today (80 files, fast), medium if the catalogue grows.

### Time to ready (MEASURED)

How: the host (`src/components/figure/FigureFrame.tsx:197`) marks the figure ready when it receives a `message` with `source:"iynk-figure"` and `type:"ready"` (`protocol.ts:206-210`). `e2e/boardlab.spec.ts` does not wait on that message (it waits on the iframe's `header h1`, line 81); it never contains the word `ready`. My script installs a `message` listener with `addInitScript` and records `performance.now()` at the first `ready`.

| Page (figure) | Figure size (transferred) | Ready, desktop, median of 3 | Ready, 4x CPU throttle, median of 3 |
|---|---|---|---|
| Landing (uno-r3 breadboard, `?bare=1`) | 153 KB | 158 ms (157/165/158) | 637 ms |
| `/en/boards/uno-r3/blink` (uno-r3) | 153 KB | 150 ms | 574 ms |
| `/en/robotics/uno-r3-build` | 108 KB | 144 ms | 570 ms |
| `/en/drones/quad5` | 65 KB | 80 ms | 310 ms |
| `/en/drones/quad5/fly` (flight range) | 20 KB | 59 ms | 226 ms |

Load average during these runs: 3.2 to 5.2. The time is from navigation start; it equals the page's `load` event within a few ms because the iframe is above the fold and its load delays the parent's load. Each page logs 2 `ready` messages (`nready` = 2 in every run): HYPOTHESIS that the host replays or the figure re-announces after the language or theme step. Not investigated.

## 3. Interpreter (headless runner)

How: `src/lib/interp` exports `createRun` (`index.ts`, used by the UI) and `runHeadless` (`headless.ts`, used by `lessons.test.ts` and the checks). I benchmarked both in Vitest 5.0.3 (node environment, config and test in `/Users/amar/iynk-master-plan-scratch/audit/perf/bench/interp.bench.test.ts`, output `interp_bench.out.txt`), run `cd /Users/amar/Codes/ak/simlab && npx vitest run --config <scratch>/vitest.config.mts`. Node v24.8.0, arm64, load average 2.98 to 3.09. Warm numbers are the median of 7 runs, each 5 s of virtual time in 16 ms frames (what the UI does); 1, 5, 20 and 60 s are single medians of 3. MEASURED.

| Program | Board | Wall for 5 s virtual (warm) | ms per virtual s | Wall for 60 s virtual | Instructions (ops) in 60 s |
|---|---|---|---|---|---|
| Blink, `delay(1000)` | uno-r3 | 0.06 ms | 0.013 | 0.34 ms | 150 |
| Blink, `delay(10)` | uno-r3 | 0.36 ms | 0.073 | 3.25 ms | 14,998 |
| `millis()` polling | uno-r3 | 1.13 ms | 0.226 | 11.30 ms | 120,596 |
| Busy counter (`x = x + 1` forever) | uno-r3 | 311.2 ms | 62.2 | 3,786 ms | 60,000,000 |
| MicroPython blink, `time.sleep(0.5)` | pico | 0.10 ms | 0.020 | 0.54 ms | 363 |
| MicroPython busy counter | pico | 116.5 ms | 23.3 | 1,372 ms | 15,000,000 |
| Python rclpy node, 10 Hz timer, publishes Twist | pi4-pi5 | 0.44 ms | 0.088 | 2.99 ms | 3,669 |

Compile (parse) time is 0.04 to 0.17 ms for these programs. The first (cold) run of a program costs up to 2.7 ms (`millis()` case), 0.5 to 1.2 ms for the others.

`runHeadless` (1 ms virtual steps, as the lesson checks use it), 5 s virtual, median of 5: blink 0.40 ms, blink fast 1.17 ms, millis 1.59 ms, busy counter 318 ms, MicroPython blink 0.25 ms, MicroPython busy 123 ms, rclpy 0.51 ms.

Reading:

| Finding | Evidence | Severity |
|---|---|---|
| Cost scales with the number of instructions executed, not with virtual time. A `delay()` or `sleep()` advances the clock without executing anything (blink: 13 ops for 5 s). Linear in ops: 62 ns per op on Arduino C++ (311 ms / 5,000,000), 93 ns per op on MicroPython (116 ms / 1,250,000). | 1 s, 5 s, 20 s, 60 s rows: 62, 312, 1,266, 3,787 ms (busy counter) | info |
| The virtual clock charges a per-board cost per op: `opUs` in `src/lib/interp/profiles.ts` (`exec.ts:50`, `c.now += this.opUs`). The benchmarks used uno-r3 at 1 microsecond per op (1,000,000 ops per virtual second) and pico at 4 microseconds per op (250,000 ops per virtual second). Other boards differ: the profiles list values from 0.05 to 6 microseconds (VERIFIED, grep `opUs` in `profiles.ts`), so wall time per virtual second for a busy loop is not the same on every board. | ops column: 5,000,000 ops for 5 s, and 1,250,000 | info |
| A busy loop (no `delay`) costs 62 ms of wall per virtual second on this Mac, so a 60 s virtual run is 3.8 s. At the 4x slowdown measured in section 6 this would be about 250 ms per virtual second, which is 4 times slower than real time (ESTIMATED: 62 ms x 4). The run object has a `throttled` flag (`run.status.throttled`, counted in my script); it stayed 0 here. Each `step()` also has an op budget (default 400,000, `run.ts:26`, `run.ts:244-256`) after which the run is marked `throttled` and the step ends; at 62 ns per op that is about 25 ms per step at most on this Mac (ESTIMATED: 400,000 x 62 ns; on uno-r3 a 16 ms step is only 16,000 ops, so the budget does not bind there). `grep -rn throttled src` finds the flag in `src/lib/interp/`, tests and content files and in no component, so the UI does not appear to show or react to it (VERIFIED by grep over `src/`; behaviour not tested). | `bench/interp.bench.test.ts` | medium for beginner programs that spin in `while(true)` without `delay` (common) |
| Typical lesson programs (with `delay` or timers) cost under 1.6 ms for 5 s of virtual time. The interpreter is not a bottleneck for them. | table | info |

Caveat: these are Node numbers on Apple Silicon, with JIT warm. In the browser the first run is cold and runs next to the figure's rendering (section 6), so use the ratios, not the absolute values.

## 4. Circuit solver

How: `figures/engine/bench-solve.js` is not importable on its own; it needs the figure page. I used the repo's own harness `figures/engine/testkit.mjs` (what `bench-solve.test.mjs` uses): build a figure with `cfbuild.py`, load it in jsdom, `B.accept({circuit, power})`, then time `B.bbStep(B.st, 0)`, which is exactly `B.solveCircuit(st, place(), 0)` (`bench-bb.js:107-112`). Script: `bench/one.mjs`, output `solve_runs.jsonl` and `circuits.jsonl`. Plain `node` (Vitest crashed on the same file with SIGABRT; the cause was jsdom pages held in memory when all 37 figures were loaded in one process, so I used one process per figure). Load average 4.3 to 4.6. MEASURED.

Size of the circuits (`circuits.jsonl`): 79 circuits across the 37 board, module and robotics figures; median 2 parts, max 9 parts (the `piano` circuit on `boards/uno-r3` and `robotics/uno-r3-build`: 9 parts, 19 wires). The next largest are 8 parts (`transistor-switch` `speed-knob`, `toggle-button`).

| Circuit | Parts / wires | Measured parts reported | Solve, median of 300 | p95 | Worst of 300 |
|---|---|---|---|---|---|
| `boards/uno-r3` `piano` (largest) | 9 / 19 | 9 | **0.038 ms** | 0.054 ms | 3.98 ms |
| `robotics/uno-r3-build` `piano` | 9 / 19 | 8 | 0.035 ms | 0.050 ms | 2.76 ms |
| `boards/uno-r3` `stepper` | 4 / 9 | 3 | 0.065 ms | 0.109 ms | 2.76 ms |
| `boards/uno-r3` `motor` | 4 / 3 | 3 | 0.021 ms | 0.032 ms | 3.24 ms |
| `boards/uno-r3` `blink` | 1 LED + resistor | 1 | 0.012 ms | 0.022 ms | 0.045 ms |

The solver is cheap: about 0.04 ms per solve on the largest circuit, against a 16.7 ms frame. The worst case of about 4 ms is a rare GC or first-iteration spike. `transistor-switch` `speed-knob` could not be timed this way (see the memory note below).

Related, not the solver itself: one whole engine step `B.advance(1/30)` (solve plus part motion plus `ui.render()`) costs 20 to 29 ms in jsdom regardless of circuit (blink 20.2 ms, piano 19.8 ms). That is jsdom building and discarding SVG strings, not browser cost; the browser cost is the CPU figure in section 6. Do not use the jsdom 20 ms as a performance claim.

jsdom memory note (HYPOTHESIS about cause, MEASURED symptom): in jsdom the heap after a forced GC grew by about 9 MB per `advance(1/30)` step on `uno-r3` `blink` (57 MB to 354 MB over 30 steps) and by about 26 MB per step on `transistor-switch` `speed-knob` (70 MB to 848 MB in 30 steps; the OOM in my first attempt). Calling `bbStep` alone did not grow the heap. In real Chromium the same figures stay flat for 65 s (section 7), so I read this as a jsdom artefact (every frame sets `art.innerHTML = ...`, `core.js:480`) and not a product leak. It does mean the engine unit tests that call `advance()` many times are memory-hungry. Script: `bench/leak.mjs`.

## 5. Flight

### Physics step cost

Code facts (VERIFIED by reading `src/lib/flight/sim.ts`):

| Fact | Where |
|---|---|
| Fixed step `STEP = 0.01` s (100 Hz) | `sim.ts:20` |
| `advance(s, seconds)` accumulates wall time, clamped to `MAX_FRAME`, and calls `stepSim` once per 10 ms | `sim.ts:327-336` |
| One step = `multirotorStep` (or `wingStep`) + `worldChecks` + `batteryStep` + a few scalar updates; no allocation of arrays except `drainEvents` | `sim.ts:308-325` |
| At 60 fps the loop runs 1.67 steps per frame | arithmetic |

Measured in Node (`bench/flight.bench.test.ts`, quad5 on the `bando` course, 6S 1100 / 2306-1750 / 5x4.3x3 as in `flight.test.ts`, altitude-hold mode, 21 runs of 1,500 steps each, none crashed; load 4.3): **0.50 to 0.63 microseconds per step** (hover 0.60, hover with wind 0.63, forward flight 0.50). That is 1.0 microsecond per 60 fps frame, or 0.06 ms per virtual second. MEASURED. My first attempt (acro mode, crashed after a few seconds) gave 0.16 microseconds because crashed steps are cheap; those numbers are discarded.

The physics is about 4 orders of magnitude below the frame budget. The cost of flying is the figure's rendering, not the sim.

### Frame rate on `/en/drones/quad5/fly` (MEASURED, headless)

Method: `requestAnimationFrame` counter in the page for 5 s (`mem.mjs`, `flythr.mjs`). Flying means: click the figure, press Space (arm), hold W for 0.9 s. GPU caveat: headless Chromium, software compositing, no vsync to a display; the rAF rate is capped at 60 by the harness and says little about a real GPU. Main-thread CPU (CDP `Performance.getMetrics`, `TaskDuration`, `ScriptDuration`) is the useful number.

| State | rAF rate | Main thread busy (task) | Script time |
|---|---|---|---|
| Fly page, not armed, desktop | 60.1 fps | 1% | 0% |
| Flying, desktop | 60.1 fps, worst gap 16.8 ms | 10% | 4% |
| Flying, 4x CPU throttle | 60.2 fps, worst gap 16.8 ms | 31% | 12% |
| Flying, 60 s continuous, desktop | 60.2 fps | 10 to 12% | 3 to 4% |

The flight page has plenty of headroom: even at 4x it uses under a third of the main thread. Loads 3.5 to 6. Review re-run of `flythr.mjs` at load 1 to 2: desktop 9% task / 3% script (matches), 4x 14% task / 5% script (does not match the 31% / 12% above). The original raw output was not saved, so the 31% is unreproduced and may reflect the higher load; read "4x flying" as 14 to 31% of the main thread. The conclusion (under a third) holds.

## 6. Pages

Setup: new context per run, viewport 1280x800, `waitUntil: "load"`, then a 4 s wait (7 s throttled) so the LCP observer settles. Metrics: Navigation Timing (`domContentLoadedEventEnd`, `loadEventEnd`), `largest-contentful-paint` via `PerformanceObserver` with `buffered:true`, resource timing for bytes. Throttle: CDP `Emulation.setCPUThrottlingRate` rate 4. Median of 3 runs. All values in ms from navigation start. Machine load (1 min) during runs: 3.0 to 4.4. MEASURED.

### Timings

| Page | CPU | TTFB | DOMContentLoaded | load | LCP | Figure ready |
|---|---|---|---|---|---|---|
| Landing `/en` | 1x | 4 | 49 | 158 | 64 | 158 |
| Landing `/en` | 4x | 4 | 45 | 636 | 188 | 637 |
| `/en/boards/uno-r3/blink` | 1x | 4 | 40 | 150 | 52 | 150 |
| `/en/boards/uno-r3/blink` | 4x | 4 | 41 | 573 | 144 | 574 |
| `/en/robotics/uno-r3-build` | 1x | 4 | 42 | 144 | 56 | 144 |
| `/en/robotics/uno-r3-build` | 4x | 4 | 44 | 569 | 164 | 570 |
| `/en/drones/quad5` | 1x | 4 | 39 | 80 | 52 | 80 |
| `/en/drones/quad5` | 4x | 4 | 43 | 309 | 148 | 310 |
| `/en/drones/quad5/fly` | 1x | 4 | 38 | 59 | 52 | 59 |
| `/en/drones/quad5/fly` | 4x | 4 | 37 | 227 | 140 | 226 |

Notes: LCP is far below `load` because LCP does not include content inside an iframe: the figure is the biggest visible thing but is not counted. These numbers therefore say "the page's own text paints early", and `load`/figure-ready say when the figure is usable. Real networks add download time (section 1 estimate), and these are warm-JIT-free cold loads on a fast machine.

### Weight per page (same runs, median)

| Page | Requests | JS transferred | JS raw | JS files | Figure transferred |
|---|---|---|---|---|---|
| Landing | 48 | 727 KB | 2,289 KB | 23 | 153 KB |
| Blink lesson | 50 | 750 KB | 2,358 KB | 28 | 153 KB |
| Robotics bench | 50 | 577 KB | 1,835 KB | 28 | 108 KB |
| Drone `quad5` | 51 | 606 KB | 1,914 KB | 29 | 65 KB |
| Fly `quad5` | 58 | 606 KB | 1,914 KB | 29 | 20 KB |

The drone and fly pages show identical JS totals; the extra requests on fly are the fly-only chunks plus chunks that arrive late. The drone and fly pages download 1.9 MB raw JS to show a figure of 65 KB and 20 KB (see B2).

### Main-thread CPU while idle (MEASURED, important)

No input, 5 s window after load, 3 runs, median (`cpu.mjs`). Load 3.0 to 6.7.

| Page | CPU | Main thread busy | Script | rAF rate |
|---|---|---|---|---|
| Landing | 1x | 62% | 35% | 60.1 |
| Landing | 4x | **100%** | 60% | **24.6** |
| Blink lesson (not running) | 1x | 65% | 37% | 60.2 |
| Blink lesson | 4x | **100%** | 60% | **24.0** |
| Robotics bench | 1x | 48% | 25% | 60.2 |
| Robotics bench | 4x | **100%** | 54% | **31.2** |
| Drone `quad5` | 1x / 4x | 1% | 0% | 60.3 / 60.3 |
| Fly (not armed) | 1x / 4x | 1% | 0% | 60.1 / 60.2 |

| # | Finding | Evidence | Why it matters | Severity |
|---|---|---|---|---|
| P1 | The landing page, board lessons and robotics benches use 48 to 65% of one core on a fast laptop with nobody touching them, and saturate the main thread at 4x slowdown (about 24 to 31 fps). The drone and fly pages are idle. The cause is in the figure core: while any animation is registered, every frame rebuilds the whole scene with `art.innerHTML = inkScale(cfg.scene(...))` (`figures/vendor/colorfigures/core.js:480`, frame driver at 497-500). What animation keeps running on the Uno figure (an LED blink or a breadboard idle effect) was not traced: HYPOTHESIS. | `cpu.mjs` output above (original raw output not saved; re-run in the review at load 1 to 2: landing 56% / 60.1 fps at 1x, 100% / 27.1 fps at 4x; blink 59% and 100% / 25.4 fps; bench 43% and 100% / 35.6 fps; drone and fly 0 to 1%; file `/Users/amar/iynk-master-plan-scratch/audit/perf-review/cpu.out`); `core.js:480,497-500` read. Correlation only: nothing was switched off to prove the cause, and headless Chromium paints in software, so style, layout and paint of the rebuilt SVG may weigh more than on a real GPU. | The hero figure on the landing page burns CPU for as long as the tab is visible (no `visibilitychange` or `IntersectionObserver` pause found in `core.js`; battery was not measured, so "hurts battery" is HYPOTHESIS), which probably hurts battery and makes the editor sluggish on cheap laptops. At 4x the interpreter's busy loops (section 3) compete with it. | high |
| P2 | At 4x CPU the figure is ready after 0.57 to 0.64 s (uno-r3), 0.31 s (drone) and 0.23 s (flight). Everything is single-threaded on the main thread: figure, React and interpreter share it. | section 6 timings | Acceptable; the interactive cost is P1, not load. | low |

### Flight and benches summary at 4x (so a cheap laptop is covered)

The 4x CPU slowdown approximates a cheap laptop only roughly: it throttles the CPU, not memory, GPU or the network (ESTIMATED approximation).

## 7. Memory

Method: `mem.mjs`. Open the page, wait 2 s, take a baseline, run the lesson, then every 10 s call `HeapProfiler.collectGarbage` and read `Performance.getMetrics` (`JSHeapUsedSize`, `Nodes`, `JSEventListeners`). `JSHeapUsedSize` covers the page and its same-process iframe (the figure). Run time 67 s after the baseline. "Running" is confirmed by the on-page status text (`Running`) for the lesson and bench; for fly, by CPU rising from 2% to 10 to 12% and by 0 page errors. MEASURED, load 4.1 to 6.1. The lesson was run twice (identical shape).

| Scenario | Heap at load | After 17 s | After 37 s | After 67 s | DOM nodes start / end | Event listeners start / end | Page errors |
|---|---|---|---|---|---|---|---|
| `/en/boards/uno-r3/blink`, Run pressed (Arduino blink) | 13.0 MB | 15.6 MB | 17.0 MB | 16.6 MB | 4,700 / 4,727 | 948 / 965 | 0 |
| `/en/robotics/uno-r3-build`, Run pressed | 11.4 MB | 12.6 MB | 13.0 MB | 12.9 MB | 4,520 / 4,508 | 878 / 891 | 0 |
| `/en/drones/quad5/fly`, armed and flown | 8.2 MB | 9.6 MB | 9.8 MB | 10.2 MB | 1,459 / 1,509 (fluctuates between 1,462 and 1,509) | 717 / 717 | 0 |

Result: the heap rises 2 to 4 MB over the first 20 to 40 s (the lesson went 13.0, 15.6, 17.0, 16.6 MB; "code and caches warming up" is an interpretation, HYPOTHESIS) and then stays flat; nodes and listeners are near constant. No sign of a leak over 60 s. VERIFIED for these three scenarios; 60 s is short, so a slow leak (a few KB per minute) would not show. A 30 minute soak was not run. UNKNOWN for longer sessions, for the circuit lessons with servos and sound, and for the room/relay path (needs keys, not part of the keyless build).

## 8. Summary of what is measured and what is estimated

| Number | Status |
|---|---|
| Bundle sizes, chunk contents, first-load lists | VERIFIED (files and greps) |
| Transfer sizes per page | MEASURED (resource timing) |
| Figure sizes, count, median | VERIFIED |
| Figure ready, page timings, LCP | MEASURED, loopback, load 3 to 5, 3 runs |
| 4x throttle | MEASURED under CDP throttle; "approximates a cheap laptop" is ESTIMATED |
| Interpreter ms per virtual second | MEASURED in Node, load about 3 |
| Solver ms per solve | MEASURED in jsdom/Node, load about 4.5 |
| Flight step cost | MEASURED in Node (not just read), load about 4.3 |
| Flight rAF rate | MEASURED, headless, GPU caveat above |
| Memory | MEASURED, 60 s |
| Real-network download times | ESTIMATED (arithmetic) |
| Why the landing page fetches editor/wallet chunks; which animation runs on the Uno figure; the double `ready` message | HYPOTHESIS, not traced |
| Other browsers (Safari, Firefox), real phones, real GPU, production CDN compression (Brotli) | UNKNOWN, not measured |

## Targets to set later

I do not invent targets. These are the quantities worth giving a target once a decision is made on which devices and networks the product serves; current values in brackets.

| Quantity | Current (this audit) |
|---|---|
| JS downloaded on the landing page within 3 s | 727 KB transferred, 2.29 MB raw, 23 files |
| JS first load on a lesson page | 701 KB gzip (stats file); 750 KB transferred |
| Largest single chunk | 567 KB raw / 187 KB gzip (CodeMirror) |
| Wallet library in non-Solana pages | 139 KB gzip on 5 lab page types |
| Figure ready, mid-range device | 144 to 158 ms desktop, 570 to 637 ms at 4x CPU for the larger figures |
| Figure file size | median 316 KB raw, largest 496 KB |
| Idle main-thread use on the landing page and lessons | 62 to 65% desktop, 100% at 4x |
| Frame rate on the landing page at 4x CPU | about 24 fps |
| Interpreter, busy-loop program | 62 ms wall per virtual second (Node, Apple Silicon) |
| Heap after 60 s in a lesson | 16.6 MB (flat after 20 s) |

See also: [runs/BUILD_OUTPUT.md](runs/BUILD_OUTPUT.md) for the keyless build, route table and bundle-stats method.

## Review log (2026-10-27)

Reviewer: adversarial pass, 12:15 to 12:40 CDT, load 1 to 2. I re-ran cheap commands, read the cited source lines, and started the keyless `.next-audit` build once on port 47411 (api/status showed every feature false; stopped afterwards, `lsof -i :47411` empty) to repeat `cpu.mjs`, `init.mjs` and `flythr.mjs`. Scripts and output: `/Users/amar/iynk-master-plan-scratch/audit/perf-review/`. No source file changed.

### Statements checked (20)

| # | Statement | Result |
|---|---|---|
| 1 | 116 JS files, 5,637,633 B; gzip sum 1,759,063 B | Confirmed by the same commands |
| 2 | First-load bytes and chunk counts for 15 routes | Confirmed from `route-bundle-stats.json` |
| 3 | Wallet chunk in 7 routes, CodeMirror in 1, zod chunk in 5, React chunks in 15 | Confirmed (python over the stats file) |
| 4 | Chunk sizes and gzip sizes of 5 named chunks | Confirmed to the byte |
| 5 | 80 figures, 24,669,406 B, per-folder counts and sizes, median 316,478, largest 495,777, smallest 70,275, gzip sum 8,127,710 | Confirmed. Single-file gzip differs by 12 B (157,199 vs 157,187; 21,350 vs 21,339), gzip version noise |
| 6 | `@coral-xyz/anchor` declared but not imported in `src/` | Confirmed (`package.json:33`, no `coral-xyz` in `src`) |
| 7 | No `next/dynamic`, `React.lazy`, `prefetch` in `src/` | Confirmed (grep, zero hits) |
| 8 | B2 import chain for lessons | Confirmed; extended to drone, fly, bench (was HYPOTHESIS, now VERIFIED) |
| 9 | B1 late fetch of four big chunks as `script` | Reproduced; cause stays HYPOTHESIS. `partialPrefetching: true` is at `next.config.ts:6` |
| 10 | `core.js:480` rebuilds `art.innerHTML`, frame driver 497-500 | Confirmed |
| 11 | P1 idle CPU table | Reproduced within about 5 points at 1x and in shape at 4x (see section 6 edit). Raw output of the original run was missing; now noted |
| 12 | Flight 4x flying 31% | Not reproduced (14%). Range given |
| 13 | Interpreter table | Matches `interp_bench.out.txt`. 62 ns/op and 93 ns/op arithmetic correct |
| 14 | "Virtual clock charges 1 us / 4 us per op" | Overgeneral: it is per-board `opUs`. Fixed |
| 15 | "How the UI reacts to `throttled` is UNKNOWN" | Partly answerable: no component reads it. Op budget (400,000 per step) added |
| 16 | Flight sim lines `sim.ts:20`, `327-336`, `308-325`; 0.50 to 0.63 us per step; 4 orders of magnitude | Confirmed against `flight_bench.out.txt` (16.7 ms / 1 us is about 4 orders). The bench omits `followersStep` (no swarm in quad5) |
| 17 | `FigureFrame.tsx:197`, `protocol.ts:206-210`, `e2e/boardlab.spec.ts:81`, `bench-bb.js:107-112`, `core.js:480` | All exist and say what is claimed |
| 18 | Solver circuit counts (79 circuits, median 2, max 9, three at 8) | Confirmed from `circuits.jsonl`. "motor n/a" was wrong (4 parts / 3 wires), fixed |
| 19 | Memory table and "no leak over 60 s" | Matches `mem_*.json`. "Flat after 20 s" was loose (lesson 13.0, 15.6, 17.0, 16.6 MB); reworded and the cause labelled HYPOTHESIS |
| 20 | Load range 2.95 to 6.14 (section 0) | Wrong: sections 6 and 7 record 6.7 and 6.1. Fixed |

### What was wrong or under-labelled, and what I changed

| Item | Change |
|---|---|
| Load range in section 0 | 2.95 to 6.14 corrected to 2.95 to 6.7 |
| `.next-audit` size | Added the 696 MB re-check beside the 632 MB from BUILD_OUTPUT.md |
| KB unit | Stated that "KB" for transfer sizes means KiB |
| B2 for drone, fly, bench | HYPOTHESIS replaced by VERIFIED import chain with line numbers; removed from the hypothesis row in section 8 |
| Interpreter op cost | Made per-board; added op budget and the finding that no component reads `throttled` |
| P1 | Added the reproduction, said the original output was not saved, labelled battery impact and cause as unproven, added the software-paint caveat |
| Flight 4x CPU | Added the non-matching re-run; range 14 to 31% |
| Motor circuit row, memory wording, figure caching wording | Corrected or labelled as reasoning |

### Not changed, still open

- The 4x throttle results for pages (section 6 timing table) and the 3-run medians were not re-run; only the idle CPU and flight tables were. The raw page data in `pages.out.jsonl` matches the table for the rows I read (landing, blink 1x).
- The second `ready` message (about 60 to 170 ms after the first in `pages.out.jsonl`) is still unexplained; HYPOTHESIS as written.
- The `uno-r3.html` script-size breakdown (embed.js 15.6 KB etc.) was not re-measured.
- jsdom heap growth figures (section 4) and the solver timings were not re-run (they need a figure build per process).
- The document does not link its scratch scripts from the repo; the scratch folder is outside git, so a reader without that folder cannot re-run the scripts. The commands for bundle and figure numbers are repeatable from the repo alone.
