# Audit: Board Lab and interpreters

Written 2026-10-24 15:20–15:55 CDT by the boards auditor; read-only. Every lesson was run through the app's own check
path (`runHeadless` + `evaluateChecks`), not the content tests' private runners. Every built board figure was probed
in Playwright through the real bridge (views, every lesson circuit, every failure's figure command, every assembly
step). Interpreter suites: arduino 19, python 14, verilog 8, all pass.

## Bottom line

7 of 12 boards exist (uno-r3, uno-r4, nano, esp32-devkitc, esp32-s3-devkitc-1, nodemcu, pico); microbit-v2,
nucleo-f401re, pi4-pi5, basys3 and de10-lite have only interpreter profiles and fact sheets. **The Uno R3 and R4 pages
404** (no en JSON; `loadBoardPage`, `src/app/[lang]/boards/_lib/load.ts:31-37`, returns null), so the flagship board
and the Learn Arduino baseline can't be seen. Every board 404s outside English. **The app completes only 29 of 50
lessons**; content tests pass because each has its own private runner and evaluator (false greens). Assembly refuses
step 1 on 6 of 7 boards.

## Per board

Lessons (app) = lessons passing every check through the real app path. Failures = defined / visibly change state.

| Board | Figure | en JSON | Lessons (app) | Failures | Assembly | Circuits in figure | Notes |
|---|---|---|---|---|---|---|---|
| uno-r3 | 149 L, blink only | **missing → 404** | 13/16 (distance, stepper, parking fail) | 14 / ~9 | broken: strip refused while powered; `place` choice `zu4` not found | 15 rejected "unknown circuit"; blink uses part id R1, clashing with board R1 | no content test; quizzes 16/16 |
| uno-r4 | 327 L, stale vs bench.js | **missing → 404** | 3/7 | 11 / ~6 (MD, ESP_DOWNLOAD straps stay "running") | broken | pot, button not drawn | blink period vs 500 ms default; i2c no MPU; wifi SSID unknown + Minima variant; matrix needs WiFi variant |
| nano | 193 L | yes | 2/4 (fade PWM@255 reads `out`; i2c no MPU) | 15 / ~11 | **works** (9 steps) | mpu6050 not drawn | passes content test |
| esp32-devkitc | 179 L | yes | 4/5 (web-switch: no HTTP; 5.9 s run) | 13 / ~9 | broken | 5 OK | 2 tests exceed 5 s timeout |
| esp32-s3-devkitc-1 | 232 L | yes, `lessons.dimmer.*` missing (40 keys; breaks `next build`) | 2/4 (dimmer PWM; web-server no HTTP, 15.6 s) | 14 / ~6 | broken; `place` j1/j3 not found | 4 OK | 1 failing content test |
| nodemcu | 189 L | yes | 1/4 (blink 900-1100 vs 500 ms; dimmer PWM; webserver no HTTP) | 13 / ~9 | broken; j1/j2 not found; S2 press doesn't enter download mode | LDR, pot not drawn | 2 TS errors `nodemcu.test.ts:229` |
| pico | 213 L | yes | 2/6 (blink ×2 period; fade 65535 reads `out`; i2c EIO; wifi needs Pico W) | 12 / ~8 | broken | button, pot, MPU not drawn | 4 variants OK |
| microbit-v2, nucleo-f401re, pi4-pi5, basys3, de10-lite | – | – | – | – | – | – | never started |

All 7 figures switch board/breadboard/schematic/power views with no errors; `xr` see-through accepted (visuals not
checked); exploded view only when unplugged. Serial monitor and CodeMirror editor mounted on every lesson; Run →
compile → upload → `set {pins}` works and is unit-tested. Quizzes: uno-r3 16/16, nano 4/4, esp32 2/5, s3 1/4,
nodemcu 2/4, uno-r4 0/7, pico 0/6. Prompt records only for uno-r3 and esp32-devkitc.

## Interpreters (`src/lib/interp`, ~10.6k lines)

Works: Arduino C++ core (pins, ADC/PWM per board resolution, tone, pulseIn, interrupts, timing, String, printf),
libraries (Servo, AccelStepper, NeoPixel, SSD1306, PCA9685, LCD, MPU6050, QTR, WiFi, WebServer, LED matrix, SPI,
Wire), 16-bit int on AVR, friendly errors, per-frame budget, brown-out reset; MicroPython (machine, network,
urequests, microbit, music, gpiozero, rclpy subset; RPi.GPIO refused on Pi 5); Verilog (cycle sim, `#(.DIV(n))`,
7-segment, DE10 active-low keys, combinational-loop detection). Both failures in `docs/verify/repo-health.md` are fixed.

Gaps:
- **BLOCKER: lesson sensors and Wi-Fi never reach the interpreter.** The interpreter supports I²C `devices`,
  `world.networks`, `request()`, `attachUltrasonic()` (`run.ts:14-83, 379, 473`), but `src/lib/boardlab/engine.ts`
  `compile()` passes none, and `inputs.ts:63-68` returns nothing for hc-sr04, mpu6050, network, qtr-rc. Blocks 10
  lessons.
- **BLOCKER: full-duty PWM fails checks.** `analogWrite(255)` / `duty_u16(65535)` report mode `out` (electrically
  right); `checks.ts:83` insists on `pwm`. Fails nano fade, s3 dimmer, nodemcu dimmer, pico fade.
- **BLOCKER: blink period checks** (900-1100 / 950-1050 ms) vs 500 ms code defaults: uno-r4.ts:443, nodemcu.ts:191,
  pico.ts:214 and 366.
- MAJOR: AccelStepper never sets OUTPUT (uno-r3 stepper fails); check run is synchronous on the main thread, 3-16 s
  for Wi-Fi lessons (tab freezes).
- MINOR: no MicroPython profile for esp32-devkitc (`profiles.ts:129`); FSR divider, heat loop, obstacle scatter;
  Nano ADC reference 5 V vs ~4.65 V.

## UI

Board index lists boards with data and prose in that language (5 in en, 0 elsewhere). `BoardWorkspace.tsx` (370 L)
and `LessonWorkspace.tsx` (342 L) are complete and mount `LabDock` (lines 367, 322). Learn Arduino baseline pieces
(tagline, parts callouts X2/ZU4/IOL/X1/POWER/AD, Try-it Blink, Serial Stopped/Running, Progress 0/16, schematic on C)
exist but sit behind the Uno 404. **Lesson variants ignored** (`LessonWorkspace.tsx:68` always `board.variants[0]`).
`boardlab.json` fr/de/zh/hi drift (2 missing, 13 extra); no `src/i18n/figures/`. Reversed/missing-part failures
unplug the figure, so the symptom shows only after re-plugging. Wireables panel only opens Inspect; no free wiring.

## Gaps

BLOCKER
1. 5 boards missing (FPGA pair also needs port-to-net mapping, `CompileOptions.ports`).
2. No en JSON for uno-r3, uno-r4 (`node scripts/gen-content-index.mjs --check` reports both).
3. Uno R3 circuits not merged: paste the 15 from `docs/requests/content-uno-r3.md` §1, rename R1→RES1, add
   `// @cf use` lines, rebuild. Leg names differ from the part files: motor/fan and piezo `+`/`-` (not POS/NEG),
   servo `V+`, rgb-led `COM`, tmp36 `+VS`, pot `W`. Props (lamp, hairdryer, watering can, weights, obstacle) not drawn.
4. Module figures missing: hc-sr04, mpu6050 (5 lessons), a4988, pca9685, qtr-8rc, lm2596; mat parts nema17,
   tt-motor, lipo-2s, aa-holder-4, multimeter.
5. Board figures don't bundle their circuits' parts and the engine skips them silently (`bench-bb.js:164`,
   `if (!def) continue`).
6. Sensor/Wi-Fi plumbing (above).
7. Check rules vs content (PWM, blink periods).
8. Assembly step 1 refused while powered on 6 boards; bad `place` choice ids.
9. All boards 404 in the 5 other locales: translate or fall back to English.

MAJOR: variants ignored; AccelStepper; synchronous checks; failures with no visible effect (uno-r3 led-no-resistor
sends RES1 but figure has R1, undervoltage 4.9 V; nodemcu led-no-resistor; s3 brownout, missing r17/r24/u3,
strap-gpio0, 5 V on GPIO; uno-r4 straps; esp32 strap-gpio12, boot-held; pico brownout-servo; engine strap and
download-mode status still open); no free wiring; no uno-r3/r4 content tests; no figure translations; prompts for 5
boards.
MINOR: nodemcu.test.ts TS errors; boardlab.json drift; esp32 MicroPython; Nano ADC ref; uno-r4 HTML stale; Uno Y1
drawn `xtal-smd` but is HC-49/S through-hole (`uno-r3.js:45`).

## Open requests

content-uno-r3.md: §1 merge, §2 Y1 kind and per-group build state, §3 HC-SR04 attach, FSR/heat/obstacle open;
SSD1306 done. item-nano.md: modules not drawn in board circuits (confirmed), ADC ref open, nano test not on the
shared runner. item-esp32-devkitc.md: straps and download mode open, MicroPython open, network open; its interp #3
check rules (blink timed between rising edges) **conflict with `checks.ts`** (between toggles). engine-bench.md #1
figure strings not done.

## Estimate (~40 agent-hours, ~6-7 h wall with ~7 agents)

uno-r3 en JSON 2; uno-r4 en JSON 1; Uno circuit merge + bundling + leg names + rebuild + probe 2; hc-sr04 + mpu6050
figures 1.5; bundle pico/nodemcu/uno-r4 parts 0.5; sensor/Wi-Fi + variants + worker checks 2; PWM rule + blink
periods + shared runner in tests + uno tests 1.5; AccelStepper 0.25; assembly 1; no-effect failures 1.5; s3/nodemcu
finish 0.75; microbit/nucleo/pi4-pi5 12; basys3/de10-lite 8; prompts 0.5; translations 4-6 (or English fallback 0.25).

## Risks

False greens from private runners (make `runHeadless` + `evaluateChecks` the only test path before new boards).
Silent part skipping (add a `CF_NOTE` at `bench-bb.js:164` so cfshoot catches it). 404-on-missing-prose. Five boards
from scratch compete for one engine owner. 15 s main-thread checks look like a hang in judging. Not checked:
see-through/exploded visuals, phone layout, axe, overlays, solver analog voltages.

Evidence (machine-local): `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/344b2088-ce11-4f45-825a-91e9576b4ac7/scratchpad/audit/boards/`
(`apppath.txt`, `variant.txt`, `probe.json`, `vitest.txt`, scripts).
