# RS-03: avr8js differential against the iynk Arduino interpreter

Date: 2026-10-27. Verdict: **PASS on this machine for correctness and speed. The device half of the exit condition cannot be tested here (INCONCLUSIVE for phone and Chromebook).**

## Question

Can avr8js, run in a worker, execute a compiled hex of the existing Uno Blink, a PWM fade and an analogRead/serial lesson, and match the TypeScript interpreter within one PWM period and one serial line? Can iynk's pin and world model be driven by avr8js pin-change callbacks? (This also partly answers RS-04 locally: real compile time with arduino-cli.)

## Why it matters

It unblocks decision D1 (real emulators where a browser-ready MIT engine exists, with the TS interpreters kept as offline fallback) and feeds D9 (server compile) and D2 (the MCU event loop a circuit solver would co-simulate with).

## Exit condition (copied from TECHNICAL_RESEARCH.md section 6)

"Pass: equal serial output, PWM duty within 2 percent, at 3x real time or better on both devices. Fail: below 1x on either." Devices = phone and Chromebook. I have neither.

## Environment

| Item | Value |
|---|---|
| Machine | Apple M4 Pro, arm64, 14 cores |
| OS / Node | macOS (Darwin 27.0.0), Node v24.8.0 |
| Load | 1-minute load average 3 to 8 during timing. The WebKit run saw 7.8 to 12.8 because another spike lane ran at the same time. Speed numbers did not move with load (14 cores) |
| arduino-cli | 1.5.1 (commit 01f3d4f2b), macOS ARM64 release from https://github.com/arduino/arduino-cli/releases/download/v1.5.1/arduino-cli_1.5.1_macOS_ARM64.tar.gz. Licence **GPL-3.0** (LICENSE.txt in the archive). Noted for RS-17; not decided here |
| Core | arduino:avr 1.8.8, avr-gcc 7.3.0-atmel3.6.1-arduino7, avrdude 8.0.0-arduino1, installed with ARDUINO_DIRECTORIES_DATA, _DOWNLOADS and _USER all inside scratch (326 MB). The Arduino core is LGPL, the toolchain GPL |
| avr8js | 0.21.1, MIT (npm) |
| Playwright | 1.64.1 (Apache-2.0). Chromium 156.0.8078.4 headless. WebKit 27.2 headless, using the Playwright WebKit build 2370 that the RS-01 lane had already downloaded, read-only |
| Other tools | vitest 5.0.5 (MIT) to import the interpreter, esbuild (MIT) to bundle avr8js for the worker, ws (MIT) for a CDP probe |
| Repo code | Imported read-only: `src/lib/interp` (`runChecks` / `lessonJob`, the path `lessons.test.ts` uses) and `src/content/boards/uno-r3.ts`. Nothing in the repo was changed |

## Method

1. Installed arduino-cli and the AVR core in scratch.
2. Chose three Uno R3 lessons from `src/content/boards/uno-r3.ts`. **There is no lesson named "Fade".** The closest PWM ramp is `motor` (lesson 10): `analogWrite(6, s)` from 0 to 255 in steps of 5 every 40 ms. I used it as the fade. The three:
   - `blink`: D13 on 500 ms, off 500 ms.
   - `motor` (PWM ramp): D6, Timer0 fast PWM, about 976 Hz.
   - `knob` (analogRead and serial): reads A0, `analogWrite(9, value / 4)`, `Serial.println(value)` every 50 ms at 9600 baud. D9 is Timer1 phase-correct PWM, about 490 Hz.
   Reference code is the lesson template with default chips and the English comments, rendered by the app's own `renderTemplate` and `resolveText`. The sketches are in `src/sketches/`.
3. Compiled with `arduino-cli compile --fqbn arduino:avr:uno --build-cache-path ... --output-dir`. Cold = empty build cache. Warm = same sketch with a populated cache. Warm edited = a one-line comment change, so the sketch is rebuilt but the core is cached.
4. Ran each `.ino.hex` in avr8js in Node: ATmega328P at 16 MHz, Timer0/1/2, ports B/C/D, USART0, ADC. A listener on each port records every effective pin change (including the timers' PWM override) with a timestamp in simulated microseconds (`cpu.cycles / 16`). The USART byte callback builds timestamped serial lines. For `knob` the ADC channel 0 follows the lesson's world script: 620, then 1023 at 1000 ms, 0 at 2000 ms, 300 at 3000 ms. Counts are converted to volts as `(count + 0.5) / 1024 * 5` so avr8js returns exactly that count.
5. Ran the same sources in the interpreter through `runChecks(lessonJob(...))` (which calls `runHeadless`) and saved the `RunTrace`. Run lengths are the lessons' `runMs`: 8500, 4500, 4000.
6. Compared: blink edge times and levels; motor duty in the middle of each of 53 ramp stages (avr8js duty = high time over a window of 8 PWM periods); knob serial lines and D9 duty at the lesson's check times 600, 1500, 2500, 3500 ms.
7. Speed: simulated seconds per wall second, 30 simulated seconds per Node run, 3 repeats; and 10 simulated seconds in Playwright Chromium (Worker and main thread, CPU throttling 1x, 4x, 6x) and WebKit (1x). Worker runs advance in 100 simulated ms slices, like an app loop.

## Results

### Compile times (arduino-cli, this machine)

Load average 7.4 at the start, about 3 later (another lane was running). Raw: `results/logs-compile.txt`.

| Case | Blink | Motor | Knob |
|---|---|---|---|
| Cold, first compile after install (empty cache) | 6.56 s | | |
| Cold, new empty build cache | | 1.17 s | 1.16 s |
| Warm, unchanged (3 runs) | 0.35, 0.34, 0.33 s | 0.45, 0.34, 0.36 s | 0.49, 0.38, 0.37 s |
| Warm, one-line edit | 0.45 s | 0.47 s | 0.47 s |
| Hex size (bytes) | 2615 | 3188 | 6653 |

The 6.56 s figure includes the first core build and cold OS file cache. Later cold compiles took about 1.2 s. These are laptop numbers on fast cores; a small sandbox VM (RS-05) will be slower.

### Blink: toggle timing (D13)

17 edges in both traces, all levels equal.

| Edge | avr8js (ms) | iynk interpreter (ms) | Difference (ms) |
|---|---|---|---|
| 0 (rise) | 0.014 | 0.002 | 0.012 |
| 1 (fall) | 500.023 | 500.004 | 0.019 |
| 2 (rise) | 1000.031 | 1000.007 | 0.024 |
| 16 (last) | 8000.180 | 8000.042 | 0.138 |

Full period: avr8js 1000.017 to 1000.024 ms, interpreter 1000.005 ms. The real chip spends cycles on the instructions around `delay`, so the gap grows to 0.138 ms over 8 s. That is far below one PWM period (1.024 ms on Timer0 pins, 2.04 ms on Timer1 pins).

### Motor (PWM ramp on D6): duty

53 samples, one in the middle of each ramp step and of the hold and off stages.

| Statistic | Value |
|---|---|
| Max absolute duty difference | 0.004 (0.4 points) at t = 1701 ms: interpreter 0.824, avr8js 0.820 |
| Mean absolute difference | 0.002 |
| Measured PWM period on D6 | 1.024 ms |

The gap is structural: the interpreter uses `value / 255`, the chip uses `OCR / 256`. At 0 and 255 the Arduino `analogWrite` forces low and high, and both agree. All samples: `results/results.json`.

I also modelled what an adapter would show at the app's 30 snapshots per simulated second (duty over the last 8 PWM periods of avr8js edges versus the interpreter's value at that instant): 132 samples on D6 and 117 on D9, all within 2 percent, worst 1.1 points (at 1967 ms, a sample straddling a ramp step). `results/results-adapter.json`.

### Knob (analogRead, D9 PWM, serial)

| Measure | avr8js | Interpreter |
|---|---|---|
| Lines | 80 | 80 |
| Text sequence identical | **yes**, no mismatch in 80 lines | |
| Distinct values in order | 620, 1023, 0, 300 | 620, 1023, 0, 300 |
| First line time | 4.6 ms | 0 ms |
| Last line time | 3975.3 ms | 3950 ms |

The real loop takes about 50.27 ms (50 ms delay plus about 0.27 ms for `analogRead`, `analogWrite` and `Serial.println`), so avr8js lines drift up to 25.3 ms late by 4 s. The interpreter charges no time per statement. The texts match because the world script steps (1000, 2000, 3000 ms) fall between two loop iterations in both. A pot change landing within about 0.3 ms of an `analogRead` could move one line by one iteration. That did not happen here.

D9 duty at the lesson's check times (window 16 ms, 8 Timer1 periods):

| t (ms) | Interpreter | avr8js | Difference |
|---|---|---|---|
| 600 | 0.608 | 0.608 | 0 |
| 1500 | 1 | 1 | 0 |
| 2500 | 0 | 0 | 0 |
| 3500 | 0.294 | 0.294 | 0 |

### Simulated speed, Node (30 simulated seconds, 3 runs each)

Raw: `results/logs-bench-node.txt`. Load 1-minute 3.4 to 4.1.

| Sketch | With pin and serial listeners (sim s per wall s) | Without listeners |
|---|---|---|
| blink | 6.54, 6.59, 6.40 | 6.38, 6.41, 6.37 |
| motor | 6.31, 6.30, 6.32 (23,456 pin events in 30 s) | 6.33, 6.32, 6.30 |
| knob | 6.15, 6.13, 6.17 (29,411 pin events) | 6.19, 6.19, 6.21 |

That is about 100 million AVR cycles per wall second on one M4 Pro core. Listeners cost under 3 percent.

### Simulated speed, browser (10 simulated seconds, one run per cell)

Raw: `results/logs-bench-chromium.txt`, `results/logs-bench-webkit.txt`.

| Browser | CPU throttle | Where | blink | motor | knob |
|---|---|---|---|---|---|
| Chromium 156 | 1x | Worker | 7.47 | 7.51 | 7.30 |
| Chromium 156 | 1x | Main thread | 7.11 | 6.83 | 6.43 |
| Chromium 156 | 4x | Main thread | 1.78 | 1.65 | 1.63 |
| Chromium 156 | 6x | Main thread | 1.19 | 1.10 | 1.08 |
| Chromium 156 | 4x and 6x | Worker (**not actually throttled**) | 7.44, 7.49 | 7.25, 7.31 | 7.21, 7.31 |
| WebKit 27.2 | 1x (no throttle API) | Worker | 7.28 | 7.25 | 7.00 |
| WebKit 27.2 | 1x | Main thread | 7.05 | 6.84 | 6.50 |

`Emulation.setCPUThrottlingRate` does not reach dedicated workers. The Worker rows at 4x and 6x ran at full speed. Sending the command to the worker target over raw CDP returned `"Operation is only supported for pages, not workers"` (probe: `src/worker-throttle-probe.mjs`). So there is no throttled Worker measurement. The throttled main thread is the proxy: same code and JIT, and its numbers scale with the rate (7.1 / 4 = 1.78, 7.1 / 6 = 1.19). A worker on a core 4x or 6x slower should land near 1.7x and 1.1x. That is HYPOTHESIS: a throttled M4 Pro is not a phone or a Chromebook (caches, memory bandwidth, thermals and the iOS JIT policy differ).

## Verdict

- Equal serial output: **PASS** (80 of 80 lines identical).
- PWM duty within 2 percent: **PASS** (max 0.4 points over 53 ramp samples, 0 on the 4 knob checks, worst 1.1 at 30 Hz sampling).
- Toggle period within one PWM period: **PASS** (max 0.14 ms versus a 1.02 ms PWM period).
- 3x real time or better: **PASS on this machine** (6.1 to 7.5x in Node, Chromium and WebKit). Under CPU throttle it is **not met**: about 1.7x at 4x and 1.1x at 6x (main-thread proxy). That is above the 1x fail line and below the 3x pass line.
- On phone and Chromebook: **INCONCLUSIVE**. No devices. Overall: **PASS for correctness and desktop speed; INCONCLUSIVE against the full exit condition.** I do not claim the device pass.

## Can avr8js pin-change callbacks drive iynk's pin and world model?

From `src/lib/interp/world.ts` and `run.ts`:

- `World` keeps per-pin state `{ mode, out, duty, pwmHz, toneHz, servoUs, ext, volts, dac }`. `analogWrite` stores a **duty (0 to 1) and a frequency**, not edges. `snapshot()` turns that into `PinView { mode, level, duty?, hz?, servoUs?, volts? }` plus derived on-board LEDs, and `Run` emits it as the `pins` event, at most 30 per simulated second and only when something changed. Inputs go the other way through `Run.input(pin, level)` and `Run.analog(pin, volts)`, which set `ext` and `volts`.
- avr8js reports raw level changes per port (`AVRIOPort.addListener((value, oldValue) => ...)`), including the timer PWM override: about 780 to 980 events per simulated second per PWM pin here.
- So callbacks cannot go into `World` as they are. A small adapter is needed that (a) reads DDR to set `mode`, (b) turns edges into duty and frequency per pin (edge timing, as I did offline, works for every pin; reading `TCCRn` and `OCRn` is exact but needs a per-timer table), (c) maps `Run.analog` volts onto `adc.channelValues`, (d) drives input pins with `port.setPin`, (e) emits a snapshot at 30 Hz. Figures and checks consume `Snapshot` and `RunTrace`, so they would not change. Serial maps directly (USART bytes to the `serial` event).
- I tested the edge-to-duty step offline against the interpreter (above). I did not build the adapter or run it against `World`.
- Not covered: I2C devices (the interpreter models MPU6050, PCA9685, SSD1306 and LCD1602 in `devices.ts`; avr8js has a TWI peripheral but the models would need bridging), Servo and `tone` derived from edges, interrupts, `pulseIn`, other libraries.

## Caveats

- One machine, one run per browser cell, three per Node cell.
- Chromium CPU throttling does not apply to workers; worker numbers under throttle are inferred from the main-thread proxy. WebKit has no throttle API here.
- There is no Fade lesson in `uno-r3.ts`; `motor` stands in. `rgb` also uses `analogWrite` but with constants.
- ADC conversion differs: avr8js computes `floor(volts / 5 * 1024)`, the interpreter `round(volts / 5 * 1023)`. I fed volts that give the lesson's exact counts. For arbitrary volts they may differ by about 1 count (not tested).
- Default lesson parameters only. One board (Uno R3). No Servo, `tone`, `pulseIn`, interrupt or I2C test.
- Compile times are from a fast laptop with a local toolchain, not a sandbox VM. arduino-cli and avr-gcc are GPL; whether server use needs a commercial licence is RS-17.
- WebKit 2370 came from the RS-01 lane's scratch folder, read-only. The older cached WebKit 2248 hung with Playwright 1.64.1 and that run was killed.
- Speed is the simulation loop alone; a real page also draws figures, which lowers it.

## What this means for the architecture

For these three lessons avr8js matches the interpreter: serial text identical, duty within 0.4 points, edge times within 0.14 ms of the interpreter's virtual clock, at 6 to 7.5 times real time on a desktop core. The price is an adapter from pin edges to `World` snapshots, a timer table, and a compile step (about 1.2 s cold and 0.35 s warm here, with a GPL tool). HYPOTHESIS: keep the interpreter as the instant offline path for lessons; offer avr8js as a "real compiled sketch" mode in a Worker with 100 ms slices; make speed adaptive with a "running slower than real time" flag, because 3x is unlikely on a low-end Chromebook. Settle the device question on real hardware or with RS-01's device baseline before promising anything.

## How to reproduce

Everything is in `src/`. `src/run-all.sh` runs it end to end (downloads arduino-cli 1.5.1 into scratch, installs the AVR core and npm packages in scratch, renders and runs the interpreter, compiles, runs avr8js, compares, benchmarks). Single steps, from `/Users/amar/iynk-master-plan-scratch/spikes/RS-03`:

```
. ./env.sh                                           # ARDUINO_DIRECTORIES_* inside scratch
npx vitest run --config vitest.config.mjs            # sketches/*.ino and traces/*.interp.json
src/compile-bench.sh                                 # compile timing, hexes in out/<id>/
node src/run-avr.mjs                                 # traces/*.avr.json
node src/compare.mjs                                 # tables -> results.json
node src/adapter-30hz.mjs                            # 30 Hz duty adapter model
node src/bench-node.mjs                              # Node speed
npx esbuild src/avr-core.mjs --bundle --format=esm --outfile=web/avr-core.bundle.js
SIM_S=10 node src/bench-browser.mjs chromium         # Worker and main thread at 1x, 4x, 6x
WEBKIT_EXE=<Playwright WebKit pw_run.sh> SIM_S=10 node src/bench-browser.mjs webkit
RATE=4 node src/worker-throttle-probe.mjs            # shows workers cannot be CPU-throttled over CDP
```

Raw outputs are in `results/`. All processes started by this spike were stopped; ports 43555 and 43556 are free.

## Independent check (2026-10-27)

Checker: a second agent. Same machine (Apple M4 Pro, 14 cores, Node v24.8.0), same scratch folder `/Users/amar/iynk-master-plan-scratch/spikes/RS-03/`. Load average 1 minute: 4.6 to 6.8 during my runs (the report's were 3 to 8, so comparable). Tolerance I used: deterministic outputs (hex, traces, duty, serial text, edge times) must match exactly; compile and speed numbers must agree within 15 percent, because they depend on load and thermal state.

### What I ran

1. `bash src/run-all.sh` as written. **It failed at the vitest step** on my run: `Error: Cannot find native binding` (rolldown, pulled in by vitest 5.0.5; npm optional-dependency bug). So the documented one-command reproduction is not reliable. Workaround: `npm i --no-save @rolldown/binding-darwin-arm64@1.2.15`, then run the remaining steps by hand (run-all.sh would prune that package again at its `npm i` line). Fix for the spike: add `@rolldown/binding-darwin-arm64` to `package.json`.
2. After the workaround I ran, in order: vitest (3 of 3 pass), `compile-bench.sh`, `run-avr.mjs`, `compare.mjs`, `adapter-30hz.mjs`, `bench-node.mjs`, the esbuild bundle, and `SIM_S=10 node src/bench-browser.mjs chromium`. I did not re-run WebKit or the worker throttle probe (WebKit build belongs to another lane, and the report already marks those as single runs). Old results were saved to `orig/` first and diffed.

### Correctness: exact match

- `results.json` regenerated from fresh interpreter traces, fresh hexes and fresh avr8js traces is **byte-identical in content** to the report's (JSON diff clean). `results-adapter.json` is identical too.
- Hex sizes: 2615, 3188, 6653 bytes, same as the report.
- Blink: 17 edges both sides, max delta 0.138 ms. Motor: 53 samples, max duty difference 0.004, mean 0.002. Knob: 80 of 80 lines identical, D9 duty differences 0 at all four checks. 30 Hz adapter model: all samples within 2 percent, worst 1.1 points on D6, 0 on D9.

### Timing: within tolerance, mostly slightly lower

| Measure | Report | My run | Load (1 min) |
|---|---|---|---|
| Compile, warm, unchanged (blink / motor / knob) | 0.33 to 0.35 / 0.34 to 0.45 / 0.37 to 0.49 s | 0.38 to 0.41 / 0.38 to 0.53 / 0.42 to 0.56 s | 5.7 to 6.4 |
| Compile, new empty build cache (motor / knob) | 1.17 / 1.16 s | 1.38 / 1.40 s | 5.7 to 6.4 |
| Compile, "cold first" blink | 6.56 s | 1.65 s | 5.7 |
| Node sim s per wall s, 30 s runs, with listeners | blink 6.40 to 6.59, motor 6.30 to 6.32, knob 6.13 to 6.17 | blink 6.17 to 6.22, motor 6.02 to 6.15, knob 5.85 to 5.90 | 6.3 to 6.8 |
| Chromium Worker 1x | 7.47 / 7.51 / 7.30 | 7.34 / 7.32 / 7.38 | 5.9 |
| Chromium main thread 1x | 7.11 / 6.83 / 6.43 | 6.94 / 6.54 / 6.44 | 5.9 |
| Chromium main thread 4x | 1.78 / 1.65 / 1.63 | 1.73 / 1.60 / 1.58 | 5.4 to 5.6 |
| Chromium main thread 6x | 1.19 / 1.10 / 1.08 | 1.19 / 1.05 / 1.06 | 4.6 to 5.3 |
| Chromium Worker at 4x and 6x (not throttled) | 7.2 to 7.5 | 7.1 to 7.5 | 4.7 to 5.6 |

All speed cells are within 15 percent (Node is 4 to 5 percent lower, consistent with higher load; Chromium within 1 to 4 percent). The compile times are 10 to 20 percent higher except the first cold blink, which is not comparable: the report's 6.56 s included building the Arduino core for the first time and a cold OS cache; in my run the core was already built, so 1.65 s is just a new-sketch compile. The report already says this. The confirmed steady-state cold compile is about 1.2 to 1.4 s.

### Judgement

- **Numbers match.** Yes, exactly for correctness and within 15 percent for speed and compile time.
- **Does INCONCLUSIVE follow from the exit condition?** Yes. The exit condition needs 3x on both a phone and a Chromebook, and neither was tested. The body of the report says this plainly. The **top line is slightly generous**: it opens with "PASS on this machine" before the INCONCLUSIVE half. A reader skimming could take it as a pass. Suggested reading: **INCONCLUSIVE overall; PASS for correctness on three lessons; desktop speed passes 3x with room; the throttled proxy does not reach 3x.**
- **The proxy points the wrong way for the speed half.** The only throttled numbers are main-thread, and they are 1.6 to 1.7x at 4x and 1.05 to 1.2x at 6x. Both are under the 3x pass line, and 6x is only about 5 to 20 percent above the 1x fail line. The report does say "not met", but "Under CPU throttle it is not met" is the more likely outcome on a weak Chromebook, so the speed half of the exit condition is better described as "likely not met on low-end devices, untested" than as neutral. The Worker throttle limit is real (I reproduced that Worker cells stay at 7.1 to 7.5x under 4x and 6x). A Worker should do no worse than the main thread, so the proxy is a fair lower-bound estimate of the same code, but a throttled M4 core is still not a phone.
- **Is the method sound?** It measures the stated question for the three lessons. Pin edges, serial text and speed are measured directly. Two things to keep in mind. (1) The serial match depends on alignment: the interpreter charges no time per statement, avr8js lines drift up to 25 ms late, and the 80 of 80 text match holds only because the world steps fall between loop iterations. The report says this. (2) The input side is shaped to match: ADC volts are chosen to yield the exact counts and the lesson's world script is applied in 256-cycle slices. That is fair for a differential, but it does not test the ADC rounding difference (floor of 1024 versus round of 1023), which the report lists as untested.
- **Are comparisons fair?** Same source text (rendered by the app's own `renderTemplate` and `resolveText`), same default chips, same run lengths, same world script, same sampling times. The duty comparison takes the interpreter's value at the mid-point of each step against an 8-period window of real edges, which is the right pairing. The "Fade" substitution (`motor`) is disclosed. Nothing found that favours avr8js unfairly.
- **Not verified by me:** WebKit speed (7.0 to 7.3x), the Worker throttle CDP probe, arduino-cli licence statements, and the architecture hypothesis, which stays a hypothesis. Only three default-parameter lessons were compared, so the correctness pass does not extend to I2C, Servo, `tone`, interrupts or other boards.

### Corrections to the report

1. Reproduce section: `run-all.sh` fails at vitest on a clean machine with the rolldown native binding error. Needs `@rolldown/binding-darwin-arm64` listed in `package.json` (not changed here, per the rule to change nothing else).
2. Top verdict line should lead with INCONCLUSIVE overall, as above. The verdict itself (INCONCLUSIVE) stands.
3. No change to any number. Compile "cold first" 6.56 s is a one-off that includes core build; use about 1.2 to 1.4 s for a normal cold compile.

Processes: the Chromium instances started by the bench exited. Ports 3000 and 43117 were not used.
