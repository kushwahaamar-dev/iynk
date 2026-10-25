# Current iynk build: audit against the spec and the originals

Audit date 2026-10-24. Build under test: `/Users/amar/Codes/ak/simlab` at commit `245763f` ("Baseline: iynk state before the rebuild audit"), Next.js 16.4.3, React 19.3.0, served by `next start -p 3311`.

## Contents

0. Scope, method and what "spec" means here
1. Build, type-check and lint (verbatim)
2. The findings that matter most
3. Defect table (every defect, file:line, severity, wrong vs correct)
4. Spec-coverage matrix
5. Route crawl results
6. Interaction evidence (what was clicked, what happened)
7. Figure fidelity: does each board and drone look like the real thing
8. Untranslated strings inventory
9. Gap list against the three originals
10. Repro scripts and screenshots

---

## 0. Scope, method and what "spec" means here

- **The pasted spec was not available to this agent.** The coverage matrix (section 4) therefore uses three sources: (a) the project's own statement of scope in `README.md` (its "What the labs do" list and the two Colorfigures briefs), (b) the brief in the task ("one app, three modules, strictly better than the three originals combined", Colorfigures figures), and (c) the originals' features, as documented by the sibling teardown docs in this folder (`learn-arduino.md`, `robotics-bench-a.md`, `robotics-bench-b.md`, `drone-lab-a.md`, `drone-lab-b.md`, `drone-lab-b-calc-matrix.md`, `colorfigures-guide.md`) plus my own spot checks of the bundles. If the pasted spec adds requirements, add rows to section 4.
- Every claim below was either observed in the running build (Playwright, Chromium, desktop 1280×900 and phone 390×844) or read in the source. "Evidence" columns say which.
- Severity: **C** critical (core feature dead or app hangs/throws), **H** high (core feature wrong, or teaches wrong electronics), **M** medium, **L** low.
- Line numbers are for `245763f`. `src/...` files are the Next app. `figures/src/*.html` are the Colorfigures sources; `public/figures/*.html` are their builds (I rebuilt both with `build.py`; the output is byte-identical to `public/figures`, so the line references into `figures/src` apply to what ships).

---

## 1. Build, type-check and lint (verbatim)

`npm run build` (exit 0, about 6 s):

```
> iynk@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 72ms
- Cache Components enabled
- Partial Prefetching enabled

  Creating an optimized production build ...
✓ Compiled successfully in 654ms
  Running TypeScript ...
  Finished TypeScript in 1437ms ...
  Collecting page data using 11 workers ...
  Generating static pages using 11 workers (0/44) ...
  Generating static pages using 11 workers (11/44)
  Generating static pages using 11 workers (22/44)
  Generating static pages using 11 workers (33/44)
✓ Generating static pages using 11 workers (44/44) in 1362ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /boards
├   /boards/[slug]
│ ├ ◐ /boards/[slug]
│ ├ ○ /boards/uno-r3
│ ├ ○ /boards/uno-r4
│ └ ◐ [+10 more paths]
├ ○ /drones
├   /drones/[slug]
│ ├ ◐ /drones/[slug]
│ ├ ○ /drones/freestyle-5
│ ├ ○ /drones/tiny-whoop
│ └ ◐ [+8 more paths]
├ ○ /robotics
└   /robotics/[slug]
  ├ ◐ /robotics/[slug]
  ├ ○ /robotics/uno-build
  ├ ○ /robotics/reaction
  └ ◐ [+10 more paths]

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
```

- `npx tsc --noEmit`: no output, exit 0.
- `npx eslint . --quiet`: no output, exit 0. Full `npx eslint .`: 25 files, 0 errors, 0 warnings.
- Not covered by any checker: the two figure sources (`figures/src/board.html`, `figures/src/drone.html`) are plain inline JS in HTML, never linted or type-checked. Both throw at runtime (F-01, F-02). A rebuild needs a lint/type pass and a headless "data-errors" check for figure code.
- Runtime: no console errors and no page errors on any route at load (section 5). Errors appear only on interaction (schematic, breadboard, motor lesson) and are recorded on the figure's `<html data-errors>`.

---

## 2. The findings that matter most

1. **The figure can be permanently disconnected from the app (C).** The figure posts `ready` once, 60 ms after its script runs (`figures/src/board.html:806`, drone 40 ms at `drone.html:267`). `FigureFrame` only listens after React hydrates (`src/components/FigureFrame.tsx:50-63`). Normal CPU: listener at about 80 ms, ready at about 99 ms, a 20 ms margin. With 6× CPU throttling (a mid-range phone) the listener attaches at about 465 ms after ready at about 383 ms: 0 of 4 loads connected. When this happens nothing the app does reaches the figure (Run, LED, faults, sheets, exploded, sensors, drone build steps). It also happened once at normal speed (the first `/boards/uno-r3` visit of a fresh context: 16 lessons ran and the figure's pins stayed `{}`).
2. **Schematic and Breadboard sheets throw and draw nothing (C)** on every board (`board.html:564` passes an ink string as a material; `board.html:572/576` uses the reserved core name `on` before its `const`). The "Control a motor" lesson triggers the same material bug on every render (`board.html:523`), freezing the figure.
3. **Parts are hidden under the PCB in the default view (H)** on micro:bit, Pi 5/Pi 4, Basys 3, DE10-Lite and Nucleo (part boxes start at the board's bottom, not its top). The default micro:bit is an empty yellow rectangle; Basys 3 and DE10-Lite show only a USB connector.
4. **The sketch runner gets basic Arduino wrong (H/C).** Buttons read "pressed" at rest (INPUT_PULLUP not modelled); servo angle is always 0; `Serial.print` breaks lines; `float`, `long`, `String`, arrays, `#define`, typed parameters and non-void functions do not compile; `while (1);` freezes the tab; interrupts fire on release; a stale runner flips the UI to "Stopped" while the new sketch keeps running and Stop is disabled.
5. **Lessons are wrong for their platform (H).** Blink and button fail on four boards (undefined `LD2`, `matrix`, `ACT`, `LEDR0`); the Raspberry Pi 5 (a Linux SBC) gets five Arduino C sketches; DE10-Lite (an FPGA) gets C lessons; ESP32 and NodeMCU put the button and the LED on the same GPIO 2; the PWM lesson uses pin 9, which is SPI flash on ESP32-WROOM. FPGA lessons can never be marked done.
6. **Wrong electronics are taught (H).** "Reverse the barrel" says the polyfuse opened and kills USB (on the Uno a series diode blocks the barrel; the polyfuse is on USB and USB keeps working). Other errors: the Uno R3 crystal vs resonator, NodeMCU's ADC range, the ESP32-S3 WS2812 on GPIO48, the Pico W LED.
7. **The drone calculator is not physical (H).** A fixed 46 g is added to every airframe (Crazyflie T:W 0.7 "may not climb", though its own quiz says 27 g). Hover throttle is `350/TW` instead of about `sqrt(W/T)`. Battery cells and motor KV are never used, hover current ignores weight and voltage, and the flying wing is computed as a multirotor.
8. **The flight sim flies backwards and ignores the bench (H).** Arrow-Up pitch moves the craft backwards. You can arm with nothing built and props off. There is no crash, battery, wind, OSD, lap timer or arming check, and it captures Space and the arrow keys for the whole page (Space cannot press any button on drone pages).
9. **Placeholders where the original had real content (H).** 4 of 8 robotics module sketches print canned strings, MPU-6050 does not compile, Wi-Fi/I²C/GPIO lessons print canned strings, the line follower is static (error always 0), and the drone wiring sheet has no labels and draws the video link to the ESC.
10. **i18n, a11y, mobile (H/M).** About 170 visible strings stay English in every language and the figure UI is always English. Pointer-only buttons, colour-only quiz feedback and several contrast failures. On phones, long code lines widen the layout viewport to 485 px.

---

## 3. Defect table

Columns: ID, severity, where, what is wrong (with evidence), what correct looks like.

### 3.1 App shell, routing, figure bridge

| ID | Sev | Where | What is wrong (evidence) | What correct looks like |
|---|---|---|---|---|
| P-01 | C | `src/components/FigureFrame.tsx:50-63`; `figures/src/board.html:806`; `figures/src/drone.html:267` | One-shot `ready` (60 ms / 40 ms timer) races React hydration; if the listener attaches late, `ready.current` stays false and **no patch is ever sent**. Measured: normal CPU listener ≈80 ms vs ready ≈99 ms; 6× CPU: listener ≈465 ms vs ready ≈383 ms, 0/4 connected (`audit/race4.py`). Seen once at normal speed on a first visit (`audit/boards_interact.py`, uno-r3: pins `{}`, explode 0, sheet stuck on board, fault never shown). | Two-way handshake: parent sends `hello` on iframe `load` and when its listener attaches; figure answers every `hello` with `ready` (or repeats `ready` until acked); parent queues patches until ready. |
| P-02 | M | `FigureFrame.tsx:75-77` | `onLoad` sets `ready.current = false`. Today load (≈65 ms) precedes ready (≈95 ms), so it works by timing alone; any reordering disconnects the figure. | Track readiness per load (generation counter); never clear after a ready for the current load. |
| P-03 | M | `FigureFrame.tsx:35-40` and `65-67`; patch built inline every render in `BoardLab.tsx:60-73,140-149`, `DroneLab.tsx:60-70`, `RoboticsLab.tsx:225,294,321,362`, `HomeDash.tsx:23-27` | Two effects post the same patch, so every render posts twice, and every render is a new patch object. Measured **244 patches/s** into the drone figure while armed (`audit/drone_probe.py`); each patch triggers a full SVG rebuild (`art.innerHTML = ...`, 60–240 KB). | One effect, memoised patch, send only changed keys, coalesce to one message per animation frame. |
| P-04 | L | `FigureFrame.tsx:38,47`; `board.html:781-805`; `drone.html:251-266` | `postMessage(..., "*")` and the figure accepts any sender (no `ev.source`/`ev.origin` check). | Target `location.origin`; figure checks `ev.source === parent`. |
| P-05 | M | `src/app/boards/[slug]/page.tsx:5-19`, `src/app/drones/[slug]/page.tsx:5-19`, `src/app/robotics/[slug]/page.tsx:5-20` | No `dynamicParams = false`. The first request for an unknown slug returns **HTTP 200** (PPR shell, title "iynk"); later ones 404. Observed: `/drones/zzz` 200 then 404; Playwright got 200 for `/boards/nope` and `/robotics/nope`. | `export const dynamicParams = false` (all slugs are known at build time). |
| P-06 | L | `src/app/robotics/[slug]/page.tsx:11-14`; index pages | Titles are raw slugs ("uno-build — iynk robotics", "tb6612 — iynk robotics"); `/boards`, `/robotics`, `/drones` are all "iynk"; one description for every page; no og/canonical/hreflang. | Human titles and descriptions per page; per-language alternates. |
| P-07 | L | `src/lib/i18n.tsx:262-277`, `src/components/Shell.tsx:12-15,31`, `src/lib/progress.tsx:30-33` | `localStorage` used without try/catch inside `useSyncExternalStore` snapshots and setters; a throwing storage (blocked site data, some embedded or private contexts) crashes the app. The boot script in `layout.tsx:28` is guarded, the React code is not. | Guard every access; fall back to memory. |
| P-08 | L | Next client router (cacheComponents) | Visited routes stay mounted but hidden: after `/` then `/boards` then `/boards/nano`, the home page's Uno iframe was still in the DOM (`visible=false`) and running (`audit/race3.py`). Figures and spin loops accumulate. | Pause or unmount figures when their route is hidden (visibility/Activity cleanup). |

### 3.2 Figure engine use and the two figures

| ID | Sev | Where | What is wrong (evidence) | What correct looks like |
|---|---|---|---|---|
| F-01 | C | `figures/src/board.html:568-576` (`slbBread`) | Breadboard throws `ReferenceError: Cannot access 'on' before initialization`: line 572 calls the core helper `on(...)`, line 576 declares `const on` in the same scope (temporal dead zone). `?sheet=breadboard` renders an empty `#art`; switching from the app leaves the previous drawing and logs the error. `on` is a reserved core name (Colorfigures SKILL "Reserved names"). | Rename the local (`ledOn`); lint figures for reserved names. |
| F-02 | C | `board.html:564` (`slbSchematic`), `board.html:523` (`slbSensor('motor')`) | `rod(..., INK, tone, .4)` passes the colour string `'#231e16'` where a material `{l,m,d}` is required; `tone()` then calls `mix(undefined, …)` and `.substr` throws (`TypeError: Cannot read properties of undefined (reading 'substr')`). Schematic is blank on every board; the Uno lesson "Control a motor" (sensor `motor`) makes **every** following render throw (6 errors in 0.9 s), so the figure freezes. | Pass `DARK` or `matOf(INK)`. |
| F-03 | H | `board.html:415-436` (`slbMbit`), `438-456` (`slbPi`), `464-499` (`slbFpga`), `394-413` (`slbNucleo`) | Part boxes are pushed from the board's bottom `z` instead of the PCB top `z+h`, so `byDepth` draws the PCB over them from the default view. Default view: **micro:bit is an empty yellow board** (no 5×5 matrix, A/B buttons, edge connector or nRF52833), **Basys 3 and DE10-Lite show only a USB block**, Pi 5/Pi 4 show no SoC, and Nucleo's left morpho header never shows. They appear only from behind (`fig/microbit_back.png`, `fig/basys3_back.png`). | Every on-board part's box starts at `z+h`; check the 7 angles from the skill's verify recipe. |
| F-04 | H | `board.html:589` (Nano uses `slbUno`), `181-264` | Nano is drawn as a small Uno: DIP-28 ATmega328P and four Uno-style female header blocks (`fig/nano.png`). Real Nano: TQFP-32 328P, 2×15 male pins along the long edges, mini-USB at one end, reset in the middle. | A Nano layout of its own. |
| F-05 | H | `board.html:321-335` (`slbR4`), `232` | R4 WiFi/Minima draw **no RA4M1** (`dip:false` and nothing else draws an MCU). R4 Minima shows a "16U2" chip (`def.bridge \|\| '16U2'` with bridge `''`), which the R4 does not have. R4 drawn 78×102 vs Uno 64×88 though its summary says "Same outline as the Uno". | RA4M1 (LQFP-64), ESP32-S3-MINI-1 module on WiFi, no 16U2, Uno footprint. |
| F-06 | H | `board.html:366-392` (`slbDevkit`) | ESP32 DevKit, ESP32-S3 DevKit and NodeMCU are the same yellow board with a metal slab and two 15-pin female headers (`fig/esp32.png`, `fig/esp32-s3.png`, `fig/nodemcu.png`). The S3 can reads "ESP32" (`'ESP32-S3'.split('-')[0]`), NodeMCU's reads "ESP". Missing: antenna overhang, CP2102/CH340 chip, AMS1117, the S3's second USB, the RGB LED. Pins are female instead of male; the S3 has 22 per side, not 15. | Per-board layouts. |
| F-07 | M | `board.html:337-364` (`slbPico`) | BOOTSEL drawn at the far end; on a real Pico it is next to the USB end. Pico 2 silk still "PICO". The Pico W LED is still driven from pin 25 (it hangs off the CYW43). | Correct placement, per-variant silk and LED. |
| F-08 | M | `board.html:438-456` | Pi is a mustard-yellow PCB; "GPIO 40" is drawn as a single row of 20 pins (real 2×20); one USB-A block; no micro-HDMI, RP1, PCIe FFC, fan header. | Green PCB, 2×20 header, 2×2 USB-A plus Ethernet, 2 micro-HDMI, RP1, PCIe, power button (Pi 5). |
| F-09 | M | `board.html:493-496`, `464-499` | DE10-Lite gets 5 push buttons (real: KEY0, KEY1); Basys 3's 5 buttons sit in a row (real: plus pattern); DE10 LEDs drawn green (LEDR are red); no VGA, Pmod or Arduino header. | Per-board I/O. |
| F-10 | M | `board.html:458-463,483-490` | Seven-segment digits are about 4.6×3.4 units, a few pixels at 100 % and unreadable (`fx_basys3_digits_1234.png`). Digit 0 (ones) is placed leftmost. | Real-scale digits; ones digit rightmost. |
| F-11 | H | `board.html:601-606` (`slbMech`), `637-647` (`slbCallouts`) | See-through is one generic die, 4 bond wires and a crystal can at a fixed fraction of every board (`ox+w*.36, oy+d*.28`, 18×42), whatever the board. Callouts POLYFUSE, 3V3 REG, CRYSTAL and the bridge name point at parts that are not drawn (ESP32, micro:bit, Pi, FPGA) (`mont_xr.png`). The Colorfigures bar is 30–60 real parts, and labels may only name drawn parts. | Per-board internals under the real chip; labels only for drawn parts. |
| F-12 | M | `board.html:608-636` (`slbTags`) | Surface tags are generic: "ANALOG PINS" on FPGA boards, "RESET" where none is drawn, "DIGITAL PINS" on micro:bit. | Per-board tag lists. |
| F-13 | H | `board.html:528-554` (`slbModule`) | Robotics modules are coloured slabs with one chip or shape next to the Uno: no pins, no jumpers, no motor/stepper/servo/sensor load (`mont_mods.png`). HC-SR04 and MPU-6050 are drawn twice (module plus `slbSensor`). The original figures 05–12 are full builds. | Per-module figure with headers, wiring to the MCU, and the driven load. |
| F-14 | M | `board.html:501-526` (`slbSensor`); `src/lib/boards.ts:384,448,470` | Wrong or missing lesson peripherals: TMP36 shown as an LDR, soil probe as an LDR, FSR as a push button; RGB and tone/piano lessons show nothing (no RGB LED, no piezo). The DC motor never spins on the board page (BoardLab sends no `motor`). Observed: sensor for "Sense heat" = `ldr`, "Smart plant" = `ldr`, "Feel the force" = `button`, "Mix colours" = none. | One correct peripheral per lesson. |
| F-15 | M | `board.html:711-742`, `649-655`, `713-733`; `BoardLab.tsx:60-73` | Figure buttons fight the app (two sources of truth). Figure **Blink** ran 1.2 s, then the app's next patch (`owner:'app', running:false`) killed it before the first toggle. Figure **Plug USB** is reverted at once by the app's `usb:true`. Figure **Reset** does not reset the app's sketch (serial kept printing). Figure **View** vs the app's sheet buttons. | When embedded, the figure shows no controls of its own, or routes them to the app; one owner of state. |
| F-16 | M | Core drag rule (`public/figures/board.html:436`) plus every part wrapped in `act('part')` (`board.html:62-64`) | Drag to rotate only works on empty paper; dragging the object does nothing (yaw 45→45 on uno, esp32 and micro:bit; 45→90 only from an empty corner). On a phone the object covers most of the frame. | Click vs drag threshold: parts stay clickable, dragging anywhere turns. |
| F-17 | L | `drone.html:188` | Drone shadow is a fixed 100×100 square under every craft (big blue mat in every shot), not the craft's hull. | Hull-based shadow, short and connected. |
| F-18 | H | `drone.html:54-64` | All props are 3-bladed and spin the same direction (`st.motorDir\|\|1` for all four). Real quads have two CW and two CCW (props-in or props-out); racer/7-inch/wing props are 2-bladed. Prop diameter is about 0.27 of the motor-to-motor diagonal (a 5-inch quad is about 0.58). | Per-motor direction, blade count per prop, true scale. |
| F-19 | H | `drone.html:132-148` | Flying wing is a flat 110×18 rectangle with a box pod: no sweep, elevons or winglets (`mont_drones2.png`). | Swept planform, moving elevons, winglets, pusher. |
| F-20 | H | `drone.html:18-29,73-129` | Agricultural sprayer is a quad (the original is a hexacopter); no booms, nozzles or landing gear. GPS/delivery/agri have no legs, delivery no gripper. The Crazyflie gets an XT60, capacitor, camera, VTX and receiver, none of which it has. | Per-airframe part sets and layouts (hexa, octo, tri, VTOL). |
| F-21 | H | `drone.html:150-171` (`slbWiring`) | The wiring sheet's blocks carry **no text** (names only in `data-name`); the only text in the SVG is the craft tags "MOTOR, FLIGHT CTRL, BATTERY". Links exist only battery→XT60→ESC→FC. ESC→motors, RX→FC, camera→FC/OSD and FC→VTX are missing. The pink video link (`drone.html:169`) ends at (70,34), the ESC block's bottom edge, not the VTX at (64–82, 48–62). | Labelled nodes, correct power/signal/video edges, legend. |
| F-22 | L | `board.html:460,474,561` | More local `const on` declarations shadowing the reserved core helper (work only by luck). | Rename. |
| F-23 | L | `drone.html:19-28` | `stack` defined for every craft, never read. | Use or delete. |
| F-24 | L | `figures/src/*.html:6` | `<script src="core.js">` but no `core.js` next to the sources (the build inlines it from the skill), so opening a source page directly fails. | Copy core.js or document it. |

### 3.3 Sketch runner and translator (`src/lib/runner.ts`)

| ID | Sev | Where | What is wrong (evidence) | What correct looks like |
|---|---|---|---|---|
| R-01 | H | `runner.ts:92-96,100-105`; `BoardLab.tsx:120-122` | `pinMode` ignores the mode and zeroes the pin; `readDigital` returns `sw[pin]` (0 on MCU boards). An idle INPUT_PULLUP pin reads LOW, i.e. pressed. Observed: "Push a button" prints `pressed` until the first press and release; "Mini piano" plays 523 Hz at rest; "Build a project" counts 1…12 with nobody pressing. | Model modes: INPUT_PULLUP idles HIGH, a pressed button pulls LOW, INPUT floats or follows the sensor. |
| R-02 | H | `runner.ts:37,143-145` | `servo.write(20)` becomes `__servo(20)`, but `__servo(_pin, angle)` reads the angle from argument 2, so it is always 0. Observed: "Sweep a servo" samples 0,0,0,…; "Spin the wheel" 0 (expected ≈85). | `__servo(angle)`, or keep the object name as the first argument. |
| R-03 | H | `runner.ts:37` | `(\w+)\.write\(` rewrites **every** `.write(` (Serial.write, Wire.write, lcd.write) into a servo call; `Serial.write(65)` printed nothing. | Rewrite only declared `Servo` objects. |
| R-04 | H | `runner.ts:43-44,131-136` | `Serial.print` emits its own line: "Talk over serial" shows `A0=` and `512` on separate lines. `Serial.println(255, HEX)` stops with "HEX is not defined". | Buffer until newline; support DEC/HEX/BIN/OCT and float digits. |
| R-05 | H | `runner.ts:20-30,49` | Types: only int/bool/byte/unsigned long/volatile/const int/const byte. Observed "Could not compile" for `float` ("Unexpected identifier 'mv'", the Uno heat lesson; "'angle'", MPU-6050), `long`, `String`, `unsigned int` ("Unexpected identifier 'let'"), arrays `int pins[] = {9,10,11}` ("Unexpected token '['"), non-void functions `int readIt()` ("Unexpected token '('"), typed parameters `void blinkN(int n)` ("Unexpected identifier 'n'"). Also missing: char, double, uint8_t/int16_t/uint32_t, casts. | Real tokenizer: strip C types (qualifiers, arrays, pointers) in declarations, parameters and return types. |
| R-06 | H | `runner.ts:34` | Every `#` line is removed, so `#define LED 13` gives "Sketch stopped: LED is not defined". | Object-like `#define NAME value` → `const`; ignore includes. |
| R-07 | C | `runner.ts:209-224` | No execution budget: `while (1);` (the usual Arduino halt) or any busy loop **freezes the tab** (main thread blocked >4 s; the Playwright click never returned). | Run sketches in a Worker or instrument loops to yield and abort with a message. |
| R-08 | H | `runner.ts:45-46` | Only `delay(` gets `await`; calls to the user's own (async) functions are not awaited, so delays inside helpers do not block. A helper with `delay(1000)` printed 1,2,3,4 in 1.3 s. | Await all user-function calls. |
| R-09 | M | `runner.ts:157-171,178-184` | Edges inverted: pressing drives the pin LOW (a FALLING edge) but `fire` treats FALLING as `!down` (release). The reaction timer reported 1404 ms for a press held 500 ms (it measured release). | FALLING on press, RISING on release for pull-up buttons. |
| R-10 | M | `runner.ts:173-177,219-223`; `BoardLab.tsx:50-56,75-92` | Stale-runner race: stop does not wait for the old loop; when its pending delay resolves, its `finally` calls `onStatus(false)` for the new run. Observed: Meet (delay 1000) → Blink → Run gives pill "Stopped", Run enabled, **Stop disabled** while pin 13 keeps toggling (0,0,1,1,0,0). | Per-run token; ignore status from stale runs; Stop works whenever a runner is alive. |
| R-11 | M | `runner.ts:76-153` | Missing core API: `delayMicroseconds`, `micros`, `pulseIn`, `map` ("map is not defined"), `constrain`, `abs/min/max`, `random/randomSeed`, `Serial.available/read`, `Wire`, `shiftOut`, `bitRead`, `analogReadResolution`, `ledcWrite`, `rgbLedWrite`/`neopixelWrite`, `tone(pin,f,duration)`. `delay` is silently capped at 4000 ms (`126-129`). | Implement the subset the lessons and originals use. |
| R-12 | M | `runner.ts:53-56` | `pinKey` maps numbers 14–19 to A0–A5 on every board (ESP32 GPIO14–19, Pico GP14–19 alias analog pins). | Per-board pin maps. |
| R-13 | M | `runner.ts:106-122`; `boards.ts:674` | 8-bit PWM and 10-bit ADC assumed everywhere (ESP32 ADC is 12-bit; the slider is 0–1023 on every board). `noPwm` lists only "13" on Uno/Nano although 0, 1, 2, 4, 7, 8, 12 and 13 have no PWM on the 328P. | Per-board resolution and PWM pin sets. |
| R-14 | M | `runner.ts:229-243` | `stepFpga` is regex dispatch, not Verilog. Any `assign led = sw…` (`sw & 16'h0000` tested) shows `led = sw`. The word "chaser" gives a one-hot rotation whatever the code (the shipped code fills with ones). `led <= btn` is ignored (pressing BTN0 changed nothing). | A tiny Verilog subset (assign, always @posedge, concat, shifts, counters), or a locked, clearly illustrative editor. |
| R-15 | M | `runner.ts:229-247`; `board.html:665-673` | DE10-Lite digits never update: `digitsFrom` returns 4 digits and the figure's `slbEnsure` resets arrays whose length is not 6. With SW0, SW2 and SW9 on, digits stayed 0,0,0,0,0,0. | Use the board's digit count. |
| R-16 | L | `runner.ts` (no int semantics) | `int a = 7 / 2` prints 3.5. | Integer division for int-typed variables. |
| R-17 | L | `runner.ts:67-74` | Dead code in `write` (`prev`, duplicate assignment, no-op return). | Delete. |
| R-18 | L | `runner.ts:191-205` | Errors are JS messages ("Unexpected identifier 'mv'") with no C line numbers. | Map errors to C lines with friendly text. |
| R-19 | L | `runner.ts:137-139` | Every `Serial.begin` prints "Serial began at …" (the IDE does not); baud is not modelled (ESP32 lessons use 115200, there is no monitor baud). | Baud selector; garbage on mismatch, as in the IDE. |
| R-20 | L | `src/components/CodeBench.tsx:5-17` | Highlighter treats `#` anywhere (even inside strings) as a comment; `long/char/String/unsigned/const` are not highlighted. | Tokenizer-based highlighting. |

### 3.4 Board lab UI (`src/components/BoardLab.tsx`, `CodeBench.tsx`)

| ID | Sev | Where | What is wrong (evidence) | What correct looks like |
|---|---|---|---|---|
| B-01 | H | `BoardLab.tsx:81-91` vs `124` | The FPGA branch returns before `progress.mark`, so Basys 3 and DE10-Lite lessons can **never** be done (0/5 after running all). | Mark in both branches. |
| B-02 | M | `BoardLab.tsx:124` | Marked done on pressing Run, even when compile fails ("Sense heat" compile error → Done). | Mark after setup ran and loop completed once, or an explicit "Mark lesson done" (the key exists, `i18n.tsx:39`). |
| B-03 | H | `BoardLab.tsx:267-329` | The same five failure buttons on every board. "Reverse the barrel" runs on boards without a barrel (Nano, ESP32, Pico, micro:bit, Pi, FPGA) and prints "The polyfuse opened before the regulator cooked."; "Motor inrush" runs on an FPGA. | Per-board failure sets (the original has per-part `fault:'pop'\|'hot'\|'dark'`, polarity choices, `needs`/`run`). |
| B-04 | M | `BoardLab.tsx:77-79,273-278` | "Reverse the barrel" also unplugs USB and blocks Run with "Polyfuse is open. Reverse the barrel wiring first." (see E-01). | USB keeps working; the barrel input is simply blocked. |
| B-05 | M | `BoardLab.tsx:100-108` | "Control a motor" always browns out on the first `analogWrite` and nothing can fix it (the body says to add a TB6612; there is no such step). Nothing spins in the figure; and see F-02. | A "driver + separate supply + common ground" step that makes it work. |
| B-06 | M | `BoardLab.tsx:116` | `onTone() {}`: no audio at all. "Make a sound" and "Mini piano" only print "tone 440 Hz". The original had a buzzer with a Sound setting ("Let the buzzer play out loud"). | Web Audio square wave with volume and mute. |
| B-07 | M | `BoardLab.tsx:202-212,71,117-119` | One slider labelled "Analog A0" feeds A0–A3 with one value; heat (A2), plant (A1), force (A3) read it. No physical controls such as lamp distance, hairdryer, soil, weight on the pad, which every original lesson had. | Per-lesson parameter controls bound to the right pin. |
| B-08 | M | `BoardLab.tsx:213-223` | "Button on pin 2" is pointer-only (no keyboard) and always pin 2. | Keyboard and click; pin from the lesson. |
| B-09 | M | `BoardLab.tsx:224-226` | Selected part shows the raw id ("Selected part: mcu", "reg"). | Show ref, name and role. |
| B-10 | M | `BoardLab.tsx` (absent); `i18n.tsx:24,33,39,48` | No "Next lesson", "Mark lesson done", "Reset view" or "Continue", though their keys exist. | Add them or delete the keys. |
| B-11 | L | `BoardLab.tsx:184-201` | App buttons duplicate the figure's with different words ("Unplug USB" vs "Plug USB"); Exploded jumps 0→1 with no animation. | One control set. |
| B-12 | L | `BoardLab.tsx:185-189`; `boards.ts:708-711,817-821,885-888` | Variants change only the figure: the title stays "Arduino Uno R4 WiFi" on Minima; Pico W/Pico 2 keep GP25 and "133 MHz"; Pi 4 keeps the Pi 5 facts. | Variant-aware title, facts and lessons. |
| B-13 | L | `BoardLab.tsx:48`; `CodeBench.tsx:62-68` | Serial monitor: 81 lines, no clear, autoscroll, timestamps, baud or input line. | Serial monitor parity with the IDE. |
| B-14 | L | `BoardLab.tsx:390-394` | micro:bit "LED" is the centre pixel only. | Map a display API. |
| B-15 | L | `CodeBench.tsx:42-48` | Run is disabled while running, so editing needs Stop then Run. | Run restarts. |

### 3.5 Lesson content and board facts (`src/lib/boards.ts`, plus the messages that teach)

| ID | Sev | Where | What is wrong (evidence) | What correct looks like |
|---|---|---|---|---|
| E-01 | H | `BoardLab.tsx:277`, `78`; `figures/src/board.html:651` | Electronics: on the Uno R3 the barrel feeds VIN through a series reverse-protection diode (D1, M7), so a reversed plug just doesn't power the board. The 500 mA polyfuse F1 is on the **USB** 5 V line and never sees barrel current, and USB power keeps working. iynk says the polyfuse opened and kills USB too. | "D1 blocks the reversed barrel; the board stays dark on the jack; USB still powers it." |
| E-02 | M | `boards.ts:621` | Uno R3 "Y1 16.000 MHz — MCU clock, with C1 and C2". On Rev3 the HC-49 16 MHz crystal clocks the ATmega16U2; the ATmega328P runs from a 16 MHz ceramic resonator. Verify against the Rev3 schematic before writing copy. | Two clock parts with the right jobs. |
| E-03 | L | `boards.ts:619,623` | "L LED: Pin 13, through a resistor": on Rev3 the L LED is buffered by half of the LMV358; the other half switches the USB/VIN power MOSFET. | Say so. |
| E-04 | H | `boards.ts:108` (+`50-61`) | ESP32 and NodeMCU (`led: "2"`): the button lesson sets `pinMode(2, OUTPUT)` and `pinMode(2, INPUT_PULLUP)`, the same pin. Observed oscillation at rest ("open","pressed","open",…). GPIO2 is also a boot strapping pin. | A separate button pin per board (BOOT/GPIO0 or GPIO4). |
| E-05 | H | `boards.ts:39-48,70`, boards at `829,850,871,972` | Undefined LED identifiers: `pinMode(LD2…)` (Nucleo), `matrix` (micro:bit), `ACT` (Pi 5), `LEDR0` (DE10). Won't compile on hardware; the runner stops ("Sketch stopped: matrix is not defined" on blink and button). | Nucleo `LED_BUILTIN` (PA5); micro:bit display API; Pi: gpiozero/libgpiod; FPGA: Verilog. |
| E-06 | H | `boards.ts:865-889` (`mcuBoard` → `lessonsFor`) | Raspberry Pi 5 runs Linux; all five lessons are Arduino C (`setup/loop`, `Serial.begin`), so none apply. | Python (gpiozero) or C (libgpiod) with a shell model; a ROS 2 node lesson. |
| E-07 | H | `boards.ts:985` | DE10-Lite gets meet/blink/button/pwm as C sketches plus a 16-bit Verilog module (the board has SW[9:0], LEDR[9:0]). | FPGA-only lessons with 10-bit ports, HEX0–5, KEY[1:0]. |
| E-08 | M | `boards.ts:910` | Basys 3 "Meet the board" is the C sketch `Serial.println("Basys 3")`, run as an FPGA pattern. | Verilog or no sketch. |
| E-09 | H | `boards.ts:122-130` | PWM lesson uses pin 9 on every board. ESP32-WROOM GPIO6–11 are the SPI flash (driving 9 crashes); ESP8266 GPIO9 is flash on most modules; ESP32's 12-bit ADC makes `knob/4` overflow 8-bit duty. | Per-board PWM pin (ESP32 LEDC on GPIO25 or similar), scale with `map()`. |
| E-10 | M | `boards.ts:761,773` | ESP32-S3 GPIO48 drives a WS2812 RGB LED (DevKitC-1 v1.0; GPIO38 on v1.1); `digitalWrite(48, HIGH)` does not light it. | `rgbLedWrite(RGB_BUILTIN, r, g, b)`/`neopixelWrite`. |
| E-11 | M | `boards.ts:787,794` | NodeMCU "The ADC pin only wants 0–1 V": that is the bare ESP8266 TOUT; NodeMCU boards have a 220 k/100 k divider so A0 takes about 0–3.2 V. | State both. |
| E-12 | M | `boards.ts:802-803,815` | Pico W's LED is on CYW43 WL_GPIO0 (arduino-pico LED_BUILTIN = 64), not GP25; Pico 2 (RP2350) runs at 150 MHz; "I²C and SPI are on any pin through the PIO": hardware I²C/SPI use fixed pin sets, only PIO can use any pin. | Per-variant facts and code. |
| E-13 | H | `boards.ts:168-175,188-195,227-234,82` | Placeholder sketches. Wi-Fi prints "wifi: station idle, rssi n/a" (no WiFi.h); I²C prints "i2c scan: 0x68 MPU-6050 ack" (no Wire scan); GPIO prints "gpio: keep motors off the header"; Meet prints the board name. | Real code (WiFi scan, Wire scanner) against simulated devices. |
| E-14 | H | `boards.ts:397-404,418-424` | Servo sketches lack `#include <Servo.h>`, `Servo servo;` and `servo.attach(9)`, so they won't compile on hardware; `knob/6` instead of `map(knob, 0, 1023, 0, 180)`. | Complete sketches. |
| E-15 | M | `boards.ts:318-335` | "Mini piano" text: "Five buttons, five notes"; the sketch has one button (pin 2) and one note (523 Hz). | Five pins and notes (the original offers tunes, octave and note-name options). |
| E-16 | M | `boards.ts:338-361` | Motor sketch drives `analogWrite(5, …)` with no TB6612 AIN1/AIN2/PWMA/STBY, though the text says to use a TB6612. | Driver sketch. |
| E-17 | M | `boards.ts:362-385,428-449,451-500` | Heat on A2, plant and force reuse the generic slider and the wrong sensor art. The soil "probe is a resistor" (the original used a capacitive v1.2 sensor and an SSD1306 OLED at 0x3C). "Build a project" is a button counter (the original: HC-SR04 parking sensor with a traffic light). | Restore the original designs (see `learn-arduino.md` §3). |
| E-18 | M | `boards.ts:240-503` vs original | Dropped original lessons: "Read a sensor" (HC-SR04, obstacle Car/Box/Ball/Wall, distance 5–50 cm, "Drive back and forth while running") and "Spin the wheel" as a 28BYJ-48 stepper on a ULN2003 (2048 steps, 8 × 256-step prize wheel). The iynk title "Spin the wheel" is reused for a pot→servo; "Talk over serial" was added instead. | Restore both. |
| E-19 | M | `boards.ts:640,964,992` | Only the Uno has quizzes (4); the other 11 boards have none. | Per-board quizzes. |
| E-20 | L | `boards.ts:937-939` | Chaser `led <= {led[14:0], 1'b1}` fills with ones (all on after 16 clocks) at 100 MHz (invisible). | `{led[14:0], led[15]}` with init `16'h0001` and a ~24-bit clock divider. |
| E-21 | L | `boards.ts:914-924` | The Buttons text says "two flip-flops"; the sketch has one. | A 2-FF synchronizer. |
| E-22 | L | `boards.ts:944-954` | "Show a number" code is `assign led = sw` (doesn't drive `seg`/`an`). | Multiplexed driver; Basys 3 segments and anodes are active low. |
| E-23 | L | `boards.ts:962` | Basys 3 "JTAG, not a UART MCU": its FT2232 gives JTAG **and** a USB-UART. | Fix the role. |
| E-24 | L | `boards.ts:674` | `noPwm: ["13"]` is incomplete (see R-13). | Full list. |

### 3.6 Robotics lab (`src/components/RoboticsLab.tsx`, `src/lib/robotics.ts`)

| ID | Sev | Where | What is wrong (evidence) | What correct looks like |
|---|---|---|---|---|
| O-01 | H | `RoboticsLab.tsx:134-139` | Upload works on a bare PCB. Strip → Plug USB → Upload blink gives "Sketch uploaded. Pin 13 is toggling." with smd=0, chip=0. `power = !b.usb && !b.cooked` ignores the supply parts and the chip. | Power needs the supply parts; upload needs a working chip ("No working chip: the upload times out", the original's text); upload animation with RX/TX flicker. |
| O-02 | M | `RoboticsLab.tsx:123-133` | Cooking happens at **Insert** when the socket isn't soldered; then "Solder the joints" says "The socket can take the chip now." while a cooked chip sits in it. The real mistake is soldering with the chip seated. | Insert into an unsoldered socket = loose chip; soldering with the chip in = cooked ("Solder everything first. Never heat a chip sitting in its socket"). |
| O-03 | M | `RoboticsLab.tsx:137` | Upload blink toggles the LED once per click; 6 samples over 3 s were all 0. | Actually blink. |
| O-04 | M | `RoboticsLab.tsx:120-140` | Missing original guard rails: "Unplug the power first: never work on a live board", "Close the exploded view first", "Low parts first…", "No SMD parts on this board…", polarity choices with faults, "Fix the fault first". Only the Uno has a build; the original has builds for all 13 figures. | Port the engine (`robotics-bench-a.md` §2). |
| O-05 | L | `RoboticsLab.tsx:123-131` | `push()` inside the `setBuild` updater (a side effect in a state updater; double log lines in dev StrictMode). | Compute the next state, then log. |
| O-06 | H | `RoboticsLab.tsx:153-191` | The reaction sketch never re-arms after a success: the LED stays on (pin 13 = 1 at 2.5 s) and the next press always says "too soon". The wait is a fixed 1200/900 ms though the text says "random-feeling". It measures release (R-09). | Re-arm after the report; `random(1000, 3000)`; FALLING on press. |
| O-07 | M | `RoboticsLab.tsx:231` | The reaction editor looks editable but `onChange={() => {}}` drops all typing. | `readOnly` with a note, or editable. |
| O-08 | H | `RoboticsLab.tsx:228-230` | "Stop the clock" is pointer-only (Space/Enter did nothing) with no pointerleave/cancel. | Keyboard and click. |
| O-09 | H | `RoboticsLab.tsx:236-297` | Line follower is static: straight line, the bar starts centred, "Error 0. Steering 0." forever, Kp 0–1 changes nothing visible. No track, motors or D term. The figure gets a made-up pattern `[1,1,e<0,0,0,0,e>0,1]` (`:294`) that contradicts the canvas. Original QTR modes: "Line under sensor 2", "Line centred", "Line under sensor 7", "Follow (P controller)", plus a P→PD practice. | Curved track, differential drive, PD, real sensor values sent to the figure. |
| O-10 | M | `RoboticsLab.tsx:299-324` | Arm: forward kinematics only, no target or IK. The elbow never reaches the figure (patch `servo: shoulder` only, `:321`), and the figure shows one servo horn by the Uno, no arm. Elbow −40° is not a servo angle. Dark-mode link invisible (DK-02). | 2-link IK to a draggable target; two PCA9685 channels in the figure. |
| O-11 | H | `robotics.ts:186-193,274-288,322-329,363-370,93-99` | Placeholder sketches. PCA9685 prints "pca9685 0x40 ch0 pulse 1500 us". HC-SR04 prints "echo pulse / 58 = cm" (uses `delay(1)` for the 10 µs trigger and never reads ECHO). QTR prints "qtr position -3..3". LM2596 prints "set the pot to 5.00 V before the MCU". L298N prints "L298 drop ~2V". | Real code (Wire/Adafruit_PWMServoDriver, `pulseIn`, QTR read, ADC readback) on simulated devices. |
| O-12 | H | `robotics.ts:227-240` | The MPU-6050 sketch fails ("Could not compile: Unexpected identifier 'angle'") and uses constants instead of readings. | Fix the translator; simulate gyro bias and accelerometer noise. |
| O-13 | M | `RoboticsLab.tsx:338-351` | Module pages: `readAnalog` 400 and `readDigital` 0 constants; no controls. The original's runnable modes per figure: TB6612 Forward 50%/Forward 100%/Reverse/Brake/Coast; L298N Forward/Reverse/Spin on the spot/Brake; A4988 Full step/1/16 microstep/Set current limit/Unplug motor (live!); PCA9685 Sweep/Center 90/Arm wave; MPU Raw gyro (drift)/Accelerometer only (noisy)/Complementary filter; HC-SR04 Object at 10/25/50 cm/Soft target (fails); QTR as above; LM2596 Set 5.0 V/Set 3.3 V/Set 12 V (impossible)/Motor stall. | Port the modes (`robotics-bench-a.md`, `-b.md`). |
| O-14 | M | `RoboticsLab.tsx:352,367` | "Draw {40 + motor·180} mA on the logic rail. Motor current stays on VM." The logic number rises with motor duty, contradicting the sentence; it shows on LM2596/MPU/QTR pages too. | A constant logic rail, a separate VM current from a motor model. |
| O-15 | M | `RoboticsLab.tsx:15-20,29,44-49` | Missing original figures: LED + resistor trainer, transistor switch, ESP32-S3 DevKitC-1, Raspberry Pi 5 as ROS 2 brain (cards link to the board lab instead). The lede says "three practice tasks", but four are listed. | Add the figures; fix the count. |
| O-16 | M | `robotics.ts` (one `quiz` each); `RoboticsLab.tsx:93,145-147,369` | 8 module quizzes, plus the Uno build reusing the 4 Uno board quizzes. The original has 39 (2–4 per figure), including numeric ones (A4988 Vref for 0.068 Ω and 1.0 A; ECHO 1166 µs; 3S LiPo nominal/empty; linear vs buck heat). No practice projects. | Port quizzes and practice projects. |
| O-17 | L | `robotics.ts:162` | A4988 "Vref times a factor printed on the silkscreen is the current". | I_max = Vref / (8 × R_cs); R_cs 0.068 Ω → 1.0 A needs Vref ≈ 0.54 V. |
| O-18 | L | `robotics.ts:110` | "A 6 V motor on an L298N barely turns on a 7.4 V pack": with about 1.8–3.2 V drop at 1 A it sees roughly 4.2–5.6 V; it turns, slower. | Reword. |
| O-19 | L | `robotics.ts:38-51` | TB6612 sketch never drives AIN2 (relies on the internal pull-down). | `digitalWrite(AIN2, LOW)`. |
| O-20 | L | `RoboticsLab.tsx` | Robotics progress is never recorded (only quiz ticks); the header counter ignores robotics. | Track per page. |

### 3.7 Drone lab and calculator (`src/components/DroneLab.tsx`, `src/lib/drones.ts`)

| ID | Sev | Where | What is wrong (evidence) | What correct looks like |
|---|---|---|---|---|
| DR-01 | H | `drones.ts:365,371` | `fixedG = 46` g added to every airframe. Tiny whoop: AUW 89 g, T:W 1.3, hover 92 %, "Thrust is close to weight. It may not climb." Crazyflie: 66 g, **T:W 0.7**, while its quiz says "a 27 g craft". | A per-craft fixed-parts list (original: `fixed: [[id, name, grams, price, 'Electrical'\|'Mechanical']]`). |
| DR-02 | H | `drones.ts:374` | Hover % = clamp(8, 92, round(350/TW)): 4.2:1 gives 83 %, 4.4:1 gives 79 %. With thrust ∝ throttle², hover ≈ sqrt(W/T) (4.2:1 ≈ 49 %). The original: `hoverThr = sqrt(auw/(n·thrust))`. | The square-root model. |
| DR-03 | H | `drones.ts:367-397` | `cells` and `kv` are never read. 4S 1500 on a 1750KV 6S motor shows the same 12.5:1 and a longer hover (16.8 min). The original: V = cells × 3.7, krpm = KV × V/1000, thrust = 1.06 × pf × krpm² g per motor. | The physical model (`drone-lab-a.md` §3). |
| DR-04 | H | `drones.ts:376-377,399-402` | Hover current is a per-motor constant, independent of AUW and V, so a heavier pack flies linearly longer (6S 1800: 20.1 min vs 12.3). The 5-inch shows 12.3 min hover, the racer 12 min. The original: hoverW = auw/(5.4 g/W × eff), hoverA = hoverW/V, hoverMin = mAh/1000 × 0.8 / hoverA × 60, flyMin = hoverMin × 0.42, maxA = n × thrust/(2 × eff)/V. | Those formulas. |
| DR-05 | H | `drones.ts:306-334`; `DroneLab.tsx:108-116` | The wing goes through multirotor math: "Hover throttle 92 %", "may not climb" at T:W 1.7 (fine for a wing). | A wing model (wing loading, stall speed, cruise current), as the original's physics override. |
| DR-06 | M | `drones.ts:381-386` | No compatibility checks. The original warns on over-spin (KV × cells > 1750 × 6 × 1.15 → "Desync! … the ESC lost a motor") and on T:W below a class minimum (5); ESC rating is never checked. "Parts match." prints regardless. | Add the checks. |
| DR-07 | M | `drones.ts:276-288,247-259` | Agricultural is a quad (original hexacopter, 12S 22000 mAh). Its 12S 16000 mAh pack weighs 2200 g, about what a 6S 16 Ah pack weighs (a 12S 16 Ah LiPo is roughly 4–5 kg). No tank liquid; the delivery quad carries no parcel mass. | Fix the data; add a payload picker. |
| DR-08 | M | `drones.ts:114-116,228-234,260-263,289-292,318-322,348-350`; `DroneLab.tsx:166` | CLI problems. `set mini_quad = ON` is not a Betaflight setting. `param set FRAME_CLASS 2` is a Copter parameter (2 = hexa) that ArduPlane doesn't use. `write` is not a MAVProxy command (`param set` writes; Mission Planner has "Write Params"). Newer ArduPilot names GPS_TYPE GPS1_TYPE. The Crazyflie (cflib) sits under a "Betaflight CLI" heading because `style: "betaflight"`, and the wing was INAV in the original. | Valid per-firmware snippets; INAV and cflib styles. |
| DR-09 | M | `DroneLab.tsx:124-135` | The wiring list is identical for every craft: "4-in-1 ESC … each motor" on the wing (1 ESC + servos) and the Crazyflie (brushed, no ESC); "Camera" and "VTX 5.8 GHz" on the Crazyflie; no GPS/compass/gripper/pump/servos. English only. | Per-craft wiring from data. |
| DR-10 | H | `DroneLab.tsx:147-150` | Motor direction passes with 3 parts (no ESC, FC or battery): "Bells spun with props off…". No per-motor CW/CCW visual, no wrong-motor fault. The original: `mpos` with CW/CCW, `wrongMotor`, "Wire the motors and mount the flight controller first", "Plug in a battery (USB alone can't spin motors)". | Gate on needed parts; per-motor direction; swap two wires to fix. |
| DR-11 | M | `DroneLab.tsx:151-154` | Calibrate accelerometer passes with no FC; no "not level" failure; no effect on arming. | Gate it, and let it block arming. |
| DR-12 | M | `DroneLab.tsx:139-146` | Smoke stopper has no polar parts. The original's fault is the capacitor in backwards ("The smoke stopper lamp lit up… The cap is in backwards"); here XT60 "reversed" is just a toggle. | Polar parts with right/wrong options. |
| DR-13 | H | `DroneLab.tsx:160-163`; `FlightSim.tsx` | Flight ignores the bench: arm and fly with built=0, props off, failed smoke test, no calibration. The original blocks arming ("Arming blocked: ACC not calibrated", "Arming blocked: throttle not at zero", "Finish building it first", "Props go on LAST…") and flips on take-off for a reversed FC, props on the wrong motors, or an unchecked motor direction. | Gate arming and carry faults into flight. |
| DR-14 | M | `DroneLab.tsx:13,87-104` | Build steps show raw ids ("frame", "esc", "xt60", "top", "cam"), untranslated, settable in any order. "Props on/off" is labelled with its state, not its action, and works before step 12. | Human labels per craft, order constraints, action labels. |
| DR-15 | M | `DroneLab.tsx:122` | "…bench price … about $346": a constant `baseCost` that ignores picks; no Electrical/Mechanical split (the original has one). | Computed cost. |
| DR-16 | L | `DroneLab.tsx:81` | Toggling Wiring changes the iframe `src`, a full reload (loses rotation and reruns the P-01 race). | Patch only. |
| DR-17 | M | `drones.ts:53-363` vs original | 10 of the 13 original crafts: VTOL tiltrotor, tricopter and heavy-lift octocopter are missing. 3 quizzes per craft (1 own + 2 shared generic) vs 4 own. No per-craft flight modes (the original has GPS rescue, Loiter, RTL, auto missions, spray mission, swarm formation, figure-8, motor-failure test, VTOL transition) and no extra tests (Check elevons, Tilt servo test, Servo test). | Port (`drone-lab-b.md`). |

### 3.8 Flight simulator (`src/components/FlightSim.tsx`)

| ID | Sev | Where | What is wrong (evidence) | What correct looks like |
|---|---|---|---|---|
| FS-01 | H | `FlightSim.tsx:82,98-99` | Arrow-Up (pitch forward) moves the craft **backwards**: centroid y 219 → 256 while the nose points −y. `pitchIn = ArrowUp ? -1`, then `y += -cos(yaw)·pitch`. | Flip the sign: forward pitch moves along the nose. |
| FS-02 | H | `FlightSim.tsx:18-26` | A window-level keydown with `preventDefault` for Space, arrows and WASD on the whole drone page. Space cannot press any focused button ("Take it apart" + Space did nothing; Enter worked) and silently toggles arming; arrow keys cannot scroll (scrollY unchanged). | Capture keys only while the sim (a focusable canvas) has focus. |
| FS-03 | M | `FlightSim.tsx:56-79` | Toggles (Space/V/Q/R) are polled once per frame from a Set; a keydown and keyup within one frame are lost (instant taps failed to arm). | Act on the keydown event. |
| FS-04 | H | `FlightSim.tsx:84-87` | Hover throttle is fixed (0.28 quad, 0.35 wing) whatever the calculator says (92 % for the whoop); the wing can hover and stop in mid-air (its own quiz says "It must keep airspeed or it is a brick"). | Thrust and mass from `computeDrone`; a stall model for the wing. |
| FS-05 | M | `FlightSim.tsx:29-111` | No crash, ground contact, ceiling, field bounds, battery drain or sag, wind, lap timer or best lap, and only angle/acro modes (the original: altitude hold/angle/acro/race plus per-craft modes). | Port the flight model (`drone-lab-a.md` §7). |
| FS-06 | M | `FlightSim.tsx:130-142,160-166` | FPV is a tilted horizon and a box: no gates, obstacles or OSD. The only text, in both views, is "ARMED angle alt 11.6 laps 0" (no units). The original OSD has ALT x m, CP/GATE n/N, CRASHED, DISARMED, LOW BATTERY, HOME, a timer. | Port. |
| FS-07 | M | `FlightSim.tsx:188-221` | On-screen sticks have no V (FPV), Q (mode) or R (reset), so touch users can't use them. They are digital buttons, not sticks, and there's no pointerleave (a finger sliding off leaves the key held). | Add the buttons; virtual sticks; release on leave. |
| FS-08 | L | `FlightSim.tsx:43-49` | 5 fixed rectangles as gates; one field for every craft; "laps" counts but nothing is timed. | Per-craft ranges (`drone-lab-a.md`). |
| FS-09 | L | `FlightSim.tsx:112-119` | `onAttitude` every frame re-renders the whole DroneView at 60–120 Hz (feeds P-03). | Send only what the figure needs, at a lower rate. |

### 3.9 Internationalisation

| ID | Sev | Where | What is wrong (evidence) | What correct looks like |
|---|---|---|---|---|
| I-01 | H | all components (inventory in section 8) | About 170 visible strings are hardcoded English in all five other languages: failure buttons and their messages, "Button on pin 2", "Analog A0", "Unplug USB", part roles, facts, robotics cards and every Uno-build button, reaction/line/arm copy, almost the whole drone page, home cards and headings, index ledes, "Skip to content", "Fig.". | Every string in the dictionaries. |
| I-02 | H | `figures/src/*.html` | The figure UI is always English: Plug USB, Reset, Blink, Exploded, View, STATUS/READY/PIN 13/LOW/POWERED/DRAW, See-through, Labels, Hand-drawn wobble, Colour, Front view, Turntable, callouts, flash messages. No language reaches the figure. | Pass `lang` (URL or patch) and translate. |
| I-03 | M | `src/lib/robotics.ts:30,178,219`; `src/lib/boards.ts:180,201,219`; `robotics.ts:355` | Translations drop content. The MPU-6050 complementary-filter formula `angle = 0.98·(angle + gyro·dt) + 0.02·accelAngle` is missing in es/fr/de/hi. TB6612 "a 6 V motor still sees almost 6 V" is missing in es/fr/de/hi. PCA9685 "do not pull servo current through the Uno's 5 V pin" is missing in es/fr/hi. The last sentence is dropped in es/fr/de for the I²C, Verilog, GPIO and LM2596 bodies. | Complete translations. |
| I-04 | M | `src/lib/text.ts:1`, `i18n.tsx:262-277` | 6 languages, with no locale URLs (not shareable or indexable), no browser-language detection and no RTL. The original: 13 languages (en, es, pt, fr, de, it, tr, id, zh-Hans, ja, ko, hi, he RTL), `/es/`-style prefixes, `navigator.languages` detection, `{placeholder}` templates. | Match or beat it. |
| I-05 | L | `Shell.tsx:62-72` | The language select shows codes ("en", "es") rather than names; options have no `lang`. | Native names. |
| I-06 | L | `i18n.tsx:137,139` | German "home" and "run" are both "Start". | "Ausführen" for run. |
| I-07 | L | `boards.ts:19,31` | `facts: string[]` and `PartInfo.role: string` are English-only types, so they cannot be translated. | L6 types. |

### 3.10 Accessibility

| ID | Sev | Where | What is wrong (evidence) | What correct looks like |
|---|---|---|---|---|
| A-01 | H | `BoardLab.tsx:213-223`, `RoboticsLab.tsx:228-230`, `FlightSim.tsx:192-207` | Pointer-only controls: Button on pin 2, Stop the clock, every stick button. Verified Space/Enter on "Stop the clock" changed nothing. | Keyboard handlers (Space/Enter down and up). |
| A-02 | H | `FlightSim.tsx:18-26` | Global key capture (FS-02) breaks keyboard use of every drone page. | Focus-scoped keys. |
| A-03 | M | `BoardLab.tsx:385`, `RoboticsLab.tsx:87`, `DroneLab.tsx:225` | Quiz right/wrong is shown only by the colour of the same "why" text, with no "Correct"/"Not quite" text and no live region. Contrast: `.bad` 3.81:1 and `.good` 4.15:1 on the light card; 4.38:1 and 4.02:1 on dark (all below 4.5:1). | Words, an icon, a live region, darker tokens. |
| A-04 | M | `src/app/globals.css:53-55` | Buttons and selects are transparent with a 16 % ink border: boundary contrast 1.37:1 (light), 1.53:1 (dark), failing WCAG 1.4.11 (3:1). | A stronger border or a fill. |
| A-05 | M | `globals.css:94,117-118` | The "Done" marker (12 px mint) on the selected lesson is 3.4:1 (light) and 2.29:1 (dark); the Running pill (white on mint) is 4.31:1. | ≥ 4.5:1. |
| A-06 | M | figures (`act()` elements) | Figure parts are not focusable (0 of 14 `[data-act]` have a tabindex); selection is pointer-only. The Parts list mitigates this on board pages only. | `tabindex`, role button, Enter/Space. |
| A-07 | M | `CodeBench.tsx:62-68` | The serial `<pre>` is `role="log" aria-live="polite"` and rewritten on every line (sketches print every 20–200 ms), which floods screen readers. | Throttle announcements; announce on demand. |
| A-08 | L | `Shell.tsx:56-58` | "0/71" relies on an `aria-label` on a span (ignored by many readers) and has no visible label. | A visible label. |
| A-09 | L | `Shell.tsx:73-75` | The theme toggle changes its label and its `aria-pressed` together ("Dark"/false → "Light"/true). | A constant label plus `aria-pressed`. |
| A-10 | L | `globals.css`; figures | No `prefers-reduced-motion` handling (the original had a "Reduce motion" setting). | Honour it. |
| A-11 | L | `FlightSim.tsx:179`, `RoboticsLab.tsx:291` | Canvases have only an `aria-label`; no live text for alt, armed state or error. | A text readout. |

### 3.11 Mobile

| ID | Sev | Where | What is wrong (evidence) | What correct looks like |
|---|---|---|---|---|
| MB-01 | M | `globals.css:104-112` | The editor uses `white-space: pre` with no overflow. At 390 px, the "Sense light" line makes the `<pre>` 449 px inside a 320 px editor and the **layout viewport grows to 485 px** (page zoomed out, sideways scroll) (`audit/editor_probe.py`). | `overflow:auto` on the editor with synced scroll. |
| MB-02 | M | `CodeBench.tsx:50-61` | The highlighted `<pre>` and the transparent `<textarea>` scroll separately: textarea scrollLeft 120, pre 0, so caret and selection drift off the visible text (desktop and phone). | Sync scroll, or a real editor component. |
| MB-03 | M | `FigureFrame` and the figure chrome | At 390 px the board is about 190 px wide inside a 589 px iframe whose own buttons, stats, colour and view rows take most of the space; the app adds a second control row under it (`mont_phone.png`). | Hide the figure chrome when embedded; give the object the frame. |
| MB-04 | M | FS-07 | Touch users cannot switch FPV or mode, or reset. | See FS-07. |
| MB-05 | L | F-16 | On a phone the board covers most of the touch area and dragging it doesn't rotate. | See F-16. |

### 3.12 Dark mode

| ID | Sev | Where | What is wrong (evidence) | What correct looks like |
|---|---|---|---|---|
| DK-01 | M | `globals.css:83`; figures | The figure stays a bright `#f4efe4` panel in dark mode (it never learns the theme; `.figure-frame` background is hardcoded) (`dark_boards_uno-r3.png`). | Pass the theme; a dark paper variant. |
| DK-02 | M | `RoboticsLab.tsx:314` | The arm's shoulder link (`#231e16`) on the dark card (`#1d1a16`) is **1.05:1**, invisible (`dark_robotics_arm.png`). | `var(--ink)`. |
| DK-03 | L | `RoboticsLab.tsx:255-258`, `FlightSim.tsx:132-166` | Canvas colours are hardcoded light: light boxes on a dark page. | Theme-aware palette. |
| DK-04 | L | `globals.css:21-30` | The accent tokens (good, bad, mint, tomato, mustard, cobalt) have no dark values (`.good` 4.02:1). | Dark variants. |

### 3.13 Performance, progress, hygiene

| ID | Sev | Where | What is wrong (evidence) | What correct looks like |
|---|---|---|---|---|
| PF-01 | M | P-03, FS-09 | 244 patches/s, each a full SVG rebuild. Frame rate fell from 117 to 90 fps while armed under 4× CPU throttle (desktop). | Diff patches; throttle to rAF. |
| PF-02 | L | `BoardLab.tsx:96-110` | Every `digitalWrite` → setState → render → 2 posts → full figure rebuild (the A4988 STEP toggles every 2 ms). | Batch pin updates per frame. |
| PG-01 | M | `Shell.tsx:27,57`; `DroneLab.tsx:173`; `progress.tsx:56-62` | The header shows `save.done.length / lessonTotal()` (71 board lessons) but drone quizzes add `drone:<slug>` to `done`: two drone quizzes, no lessons → "2/71". It can exceed the total; robotics never counts. | Separate per-module counters. |
| PG-02 | L | `progress.tsx` | No reset progress (the original has "Reset progress"), no cross-tab sync (`storage` event), unguarded writes. | Add. |
| HY-01 | L | `i18n.tsx:9-249` | 10 of the 39 UI keys are unused: home, reset, theme, next, powered, draw, mark, open, sensors, continue. | Use or delete. |
| HY-02 | L | `drones.ts:4-15` | `Opt.kv` and `Opt.cells` are filled but `computeDrone` never reads them (the cause of DR-03). | Use them. |
| HY-03 | L | `FigureFrame.tsx:5-17` | `power/usb/led/fault/name` arrive from the figure and are never used. | Use or drop. |
| HY-04 | L | `globals.css` with Tailwind preflight | Section `h2`s render at body size and fact lists lose their bullets, so "Break it on purpose", "Parts" and "Check yourself" look like body text. | Heading scale and list styles. |
| HY-05 | L | `README.md` | README claims "schematic and breadboard views", "failure buttons that change the figure" and a wiring sheet of "labeled blocks"; all are broken or partial. | Update with the fix. |

---

## 4. Spec-coverage matrix

Status: **done**, **partial**, **missing**, **broken**. "README" = the in-repo scope list; "brief" = the README's Colorfigures briefs; "orig" = a feature of an original site that "strictly better" implies.

### 4.1 Whole app

| # | Requirement (source) | Status | Evidence |
|---|---|---|---|
| 1 | One Next.js App Router app with Board, Robotics and Drone modules (task) | done | Routes in section 5. |
| 2 | Build, type-check and lint clean (CLAUDE.md, task) | done | Section 1. Figures are not linted (F-01, F-02 slipped through). |
| 3 | No runtime errors | broken | F-01, F-02 throw; R-07 freezes the tab. |
| 4 | Six languages: en, es, fr, de, zh, hi (README) | partial | I-01 to I-03 (about 170 strings, figure UI English). |
| 5 | Language coverage at least the original's 13, with RTL and locale URLs (orig) | missing | I-04. |
| 6 | Light and dark theme (README, task) | partial | DK-01 to DK-04; the toggle persists (`iynk-theme`). |
| 7 | Progress stored under `iynk.v1` (README) | partial | PG-01, PG-02, B-01, B-02. |
| 8 | Works at phone width | partial | No page overflow at load; MB-01 to MB-05. |
| 9 | Figures built with Colorfigures: full turn, see-through, labels, zoom, phone layout (task, skill) | partial | Turn/zoom/labels switch work; see-through generic (F-11); F-03 sorting; F-16 drag. |
| 10 | Each figure looks like the real object (task) | partial | Section 7: 4 of 12 boards and 3 of 10 drones pass. |
| 11 | App and figure stay in sync | broken | P-01 (slow devices), F-15. |
| 12 | Proper 404s and titles | partial | P-05, P-06. |
| 13 | Accessible by keyboard and screen reader | partial | A-01 to A-11. |
| 14 | Reduced motion and sound settings (orig) | missing | A-10, B-06. |
| 15 | Strictly better than the three originals combined (task) | missing | Section 9. |

### 4.2 Board lab

| # | Requirement (source) | Status | Evidence |
|---|---|---|---|
| 16 | Boards: Uno R3, Uno R4 WiFi and Minima, Nano, ESP32 DevKit, ESP32-S3, NodeMCU, Pico/Pico W/Pico 2, Nucleo-F401RE, micro:bit, Pi 5 and Pi 4, Basys 3, DE10-Lite (brief) | partial | All present (variants included); F-03 to F-10. |
| 17 | Sixteen Uno lessons (README) | partial | 16 present; 3 differ from the original (E-17, E-18). |
| 18 | Four or more lessons on every other board (README) | partial | 5 each, but wrong platform on Pi 5 and DE10 and broken on 4 boards (E-05 to E-08). |
| 19 | Sketch runner: setup/loop, delay, millis, serial, analogWrite, interrupts (README) | partial | Works for simple sketches; R-01 to R-16. |
| 20 | Serial monitor (README) | partial | R-04, R-19, B-13. |
| 21 | Board, schematic and breadboard sheets (README, brief) | broken | F-01, F-02: both extra sheets throw and draw nothing. |
| 22 | Exploded view (brief) | done | App and figure toggle `explode` (0↔1; the figure animates its own button). |
| 23 | Plug USB, reset and blink in the figure (brief) | partial | Present, but overridden by the app (F-15). |
| 24 | Power path: USB 5 V or 7–12 V barrel → polyfuse → regulator → crystal releases reset (brief) | partial | No barrel supply option; wrong teaching (E-01, E-02). |
| 25 | See-through: die, bond wires, crystal can, USB-serial bridge, polyfuse (brief) | partial | Generic and misplaced (F-11). |
| 26 | Failures: reversed barrel, brown-out, cold joint (brief, README) | partial | Present on every board regardless; wrong physics (B-03, B-04, E-01); the figure reacts only when connected (P-01). |
| 27 | 5 V into a 3.3 V pin (app) | partial | Message plus figure smoke; also offered on the Pi and FPGAs. |
| 28 | FPGA boards step a small Verilog pattern onto switches, LEDs and digits, no bitstream (README) | partial | Switch→LED works on Basys 3; R-14, R-15, F-03, F-10, B-01. |
| 29 | Parts list linked to the figure | done | Both directions sync; B-09 shows a raw id. |
| 30 | Quizzes | partial | Uno only (E-19). |
| 31 | Per-lesson parameter controls that rewrite the code (orig: On for/Off for/Resistance, RGB presets, tunes, octave, stepper speed, pull-down, weights…) | missing | B-07. |
| 32 | Buzzer audio (orig) | missing | B-06. |
| 33 | Lesson navigation and mark done (orig and own keys) | missing | B-10. |
| 34 | Pinout and spec tables per lesson (orig) | missing | Only per-board `facts`. |
| 35 | Animated current flow, floor grid, callout toggle (orig settings) | missing | Not implemented. |

### 4.3 Robotics lab

| # | Requirement (source) | Status | Evidence |
|---|---|---|---|
| 36 | Socket-before-chip Uno build (README) | partial | O-01 to O-05. |
| 37 | Driver and sensor pages: TB6612, L298N, A4988, PCA9685, MPU-6050, HC-SR04, QTR-8RC, LM2596 (README, brief) | partial | Pages exist; O-11 to O-14; F-13. |
| 38 | Reaction timer (README) | partial | O-06 to O-08, R-09. |
| 39 | Line follower (README) | partial | Static (O-09). |
| 40 | Two-joint arm (README) | partial | O-10, DK-02. |
| 41 | Module figures beside the Uno (brief) | partial | Slabs only (F-13). |
| 42 | All 13 original figures with builds (orig) | missing | 4 figures absent, builds only for the Uno (O-04, O-15). |
| 43 | Runnable modes per figure (orig) | missing | O-13. |
| 44 | 39 quiz questions and practice projects (orig) | partial | 12 questions, no practice (O-16). |
| 45 | Curriculum grouping: Start here, Month 1 · electronics, Month 2 · microcontrollers / motors + drivers / sensors, Power + the ROS 2 brain (orig) | missing | `RoboticsHome` is a flat card grid. |

### 4.4 Drone lab

| # | Requirement (source) | Status | Evidence |
|---|---|---|---|
| 46 | Shapes: 5-inch freestyle, tiny whoop, 3-inch cinewhoop, 7-inch long range, racer, GPS camera quad, delivery box, spray tank, flying wing, nano quad (brief) | partial | All ten present; F-18 to F-20. |
| 47 | The original's 13 crafts, including VTOL, tricopter, octocopter (orig) | missing | DR-17. |
| 48 | Arms, four motors, props that spin when armed, stack, XT60 and capacitor, camera, VTX antenna, receiver, battery (brief) | partial | Present; props off by default, all spin one way (F-18). |
| 49 | Build flags show or hide each part; part order (brief, README) | partial | Flags work; no order rules (DR-14). |
| 50 | Exploded view lifts the stack (brief) | done | Figure layers rise with `explode`. |
| 51 | See-through shows the gyro and MCU on the flight controller (brief) | done | Generic die with GYRO/MCU/ESC MOS/VBAT callouts. |
| 52 | Wiring sheet as labelled power, signal and video blocks (brief) | broken | No labels, missing edges, video link to the ESC (F-21). |
| 53 | Live weight and thrust math (README) | partial | Updates live, values wrong (DR-01 to DR-07). |
| 54 | Smoke stopper and motor-direction checks (README) | partial | No gating, no polarity (DR-10, DR-12). |
| 55 | Accelerometer calibration (README) | partial | DR-11. |
| 56 | Betaflight or ArduPilot snippets (README) | partial | DR-08. |
| 57 | Keyboard flight sim with WASD, arrows, Space, V, Q, R (README) | partial | All keys do something; FS-01, FS-02, FS-03. |
| 58 | On-screen sticks (README) | partial | No V/Q/R; digital buttons (FS-07). |
| 59 | Physics from the chosen design (orig) | missing | FS-04. |
| 60 | Arming checks and flips from build faults (orig) | missing | DR-13. |
| 61 | FPV with OSD, crash, battery, wind, laps and best lap, per-craft ranges and modes (orig) | missing | FS-05, FS-06, FS-08, DR-17. |
| 62 | Quizzes, 4 per craft (orig) | partial | 3, of which 2 are generic. |

---

## 5. Route crawl results

Desktop 1280×900, production server, every route (`audit/crawl.py`, results in `shots/crawl.json`). No console errors, page errors or failed requests on any route at load. Each figure iframe's `data-errors` was empty at load. The crawl's "NaN" hits were all inside the base64 noise texture of an `feImage` (false positives); geometry had no NaN, `undefined` or `Infinity` (`audit/nan.py`, `audit/figshots.py`).

| Route | Status | Title | Figure | Page height |
|---|---|---|---|---|
| `/` | 200 | iynk | board uno-r3 | 2250 |
| `/boards` | 200 | iynk | none | 1183 |
| `/boards/uno-r3` | 200 | Arduino Uno R3 — iynk | uno-r3 | 3070 |
| `/boards/uno-r4` | 200 | Arduino Uno R4 WiFi — iynk | uno-r4&variant=wifi | 2127 |
| `/boards/nano`, `esp32`, `esp32-s3`, `nodemcu`, `pico`, `nucleo-f401`, `microbit`, `pi5`, `basys3`, `de10-lite` | 200 | "<board name> — iynk" | matching id (+variant) | ≈2100 |
| `/robotics` | 200 | iynk | none | 900 |
| `/robotics/uno-build`, `reaction`, `line`, `arm`, `tb6612`, `l298n`, `a4988`, `pca9685`, `mpu6050`, `hcsr04`, `qtr8rc`, `lm2596` | 200 | "<slug> — iynk robotics" | uno-r3 (+module) | 1390–2118 |
| `/drones` | 200 | iynk | none | 900 |
| `/drones/<10 slugs>` | 200 | "<drone name> — iynk" | drone id | ≈2700 |
| `/boards/nope`, `/robotics/nope` | 200 on first hit, 404 later | 404: This page could not be found. | none | 1075 |

Phone 390×844: `/`, `/boards`, `/boards/uno-r3`, `/boards/basys3`, `/robotics`, `/robotics/uno-build`, `/robotics/line`, `/robotics/arm`, `/robotics/tb6612`, `/drones`, `/drones/freestyle-5`, `/drones/wing`: no horizontal overflow at load (scrollWidth 390). The overflow appears after choosing a lesson with long code lines (MB-01).

---

## 6. Interaction evidence

All results come from the running build, using scripts in `scratchpad/audit/` (section 10).

### 6.1 Board lab: every lesson run (uno-r3, esp32, microbit, basys3)

| Board | Lesson | Serial / figure result |
|---|---|---|
| uno-r3 | 1 Meet the board | "Serial began at 9600", then "Arduino Uno R3" every second |
| uno-r3 | 2 Blink an LED | no serial; pin 13 toggles (figure LED when connected) |
| uno-r3 | 3 Push a button | "pressed" at rest (R-01); after a press and release: "open" |
| uno-r3 | 4 PWM and analog | pin 9 = 0.50 at slider 512, 1.0 at 1023; pot drawn |
| uno-r3 | 5 Talk over serial | "A0=" and "512" on separate lines (R-04) |
| uno-r3 | 6 Mix colours | no visual (no RGB LED; F-14) |
| uno-r3 | 7 Sense light | 512 repeated; slider labelled "Analog A0" |
| uno-r3 | 8 Make a sound | "tone 440 Hz"/"tone 660 Hz" lines, no audio (B-06) |
| uno-r3 | 9 Mini piano | "tone 523 Hz" at rest (R-01) |
| uno-r3 | 10 Control a motor | "driver required", then "Motor inrush sagged the 5 V rail. Brown-out reset."; the figure throws (F-02) |
| uno-r3 | 11 Sense heat | "Could not compile: Unexpected identifier 'mv'" (R-05) and still marked Done (B-02) |
| uno-r3 | 12 Sweep a servo | servo stays at 0 (R-02) |
| uno-r3 | 13 Spin the wheel | servo 0 |
| uno-r3 | 14 Smart plant | "damp" (512 < 700) |
| uno-r3 | 15 Feel the force | 512 |
| uno-r3 | 16 Build a project | counts 1, 2, 3… with nothing pressed (R-01) |
| esp32 | 3 Push a button | "open","pressed","open"… oscillating at rest (E-04) |
| esp32 | 5 Wi-Fi, without the myth | "Serial began at 115200", "wifi: station idle, rssi n/a" (E-13) |
| microbit | 2, 3 | "Sketch stopped: matrix is not defined" (E-05) |
| microbit | 5 I²C in one bus | "i2c scan: 0x68 MPU-6050 ack" (E-13) |
| basys3 | 1–5 | "FPGA pattern is stepping. This is not a bitstream."; switches 0, 1 and 3 → LEDs 1101…, digits [1,1,0,0]; BTN0 does nothing; chaser = one-hot rotation; never marked Done (B-01) |
| de10-lite | 1–4 | C sketches run as FPGA patterns (E-07); SW0, SW2, SW9 → LEDs follow, digits stay 000000 (R-15) |

### 6.2 Board lab: failures, sheets, figure controls

- Uno, in sequence: "Reverse the barrel" → "Barrel is reversed. The polyfuse opened before the regulator cooked."; then Run → "Polyfuse is open. Reverse the barrel wiring first." "Motor inrush" → "Motor inrush sagged the rail. Brown-out reset." "Feed 5 V into a pin" on the Uno → "This board is 5 V logic. A 5 V signal is in family here."; on 3.3 V boards → "5 V landed on a 3.3 V pin. The clamp diode is conducting." (fault `voltage`, smoke). "Cold solder on the LED" → "Pin 13 joint is dull. The LED will not follow the pin."; then Run → "USB is unplugged." (USB was still off from the reverse fault, because faults are not independent). "Clear fault" → "Fault cleared. Rail is back."
- On connected figures: the reverse fault turns the polyfuse red and power OFF (stats "STATUS OFF / POWERED OFF / DRAW 0 mA"); brownout sets power off; voltage shows smoke.
- Sheets: Schematic and Breadboard set `st.sheet`, but the render throws (F-01, F-02).
- Exploded: `st.explode` goes 1 then 0.
- See-through (`#xrb`): `st.xr` = 1 and internals appear. Labels (`#lblb`) toggle tags.
- Drag: rotates only from empty paper (F-16).
- Figure's own Blink is killed by the app within about 1.2 s; its Plug USB is reverted at once; its Reset doesn't stop the app's sketch (F-15).
- Variant R4 Minima: the figure reloads with `variant=minima`; title, facts and lessons are unchanged (B-12).

### 6.3 Robotics

- Uno build, bad order A (Strip → Plug USB → Upload): "Sketch uploaded. Pin 13 is toggling." on a bare PCB (O-01).
- Bad order B (… Place socket → Insert ATmega328P): "Too soon. The iron would heat the die. Solder the socket first." and the chip turns red (cooked). Then Solder → "Joints are bright. The socket can take the chip now." (O-02). USB → "USB in. 5 V rail is up."; Upload → "No power, or the die is cooked."
- Correct order: Strip → SMD ("SMD parts placed: regulator, 16U2, crystal, LEDs, polyfuse.") → Place ("Socket and headers are sitting in the holes, not soldered.", parts hover) → Solder → Insert ("Chip seated in a cool socket.") → USB → Upload toggles the LED once per click (O-03). Exploded works.
- Reaction: early tap → "too soon"; after the LED, a 500 ms hold → 1404 (R-09); the next tap → "too soon" (O-06); keyboard does nothing (O-08); typing in the editor is ignored (O-07).
- Line follower: "Error 0. Steering 0." at 1.5 s, 3 s and with Kp = 0; figure pattern 11000001 (O-09).
- Arm: shoulder 120 reaches the figure as `servo` 120; the elbow is never sent (O-10).
- Modules (after Run): tb6612 pins {5: 0.63, 7: 1, 8: 1}, "Draw 153 mA on the logic rail"; l298n "L298 drop ~2V"; a4988 STEP toggling; pca9685, hcsr04, qtr8rc and lm2596 canned strings (O-11); mpu6050 "Could not compile: Unexpected identifier 'angle'" (O-12). Every quiz: wrong → red text, right → green text, the same "why" text (A-03).

### 6.4 Drones (freestyle-5 and wing, plus defaults for all ten)

Calculator defaults:

| Drone | AUW | T:W | Hover | Max A | Hover time | 2nd time | Note |
|---|---|---|---|---|---|---|---|
| freestyle-5 | 514 g | 12.5 | 28 % | 144 | 12.3 min | Freestyle 5.2 | Plenty of punch. |
| tiny-whoop | 89 g | 1.3 | 92 % | 16 | 6 | 2.6 | Thrust is close to weight. It may not climb. |
| cinewhoop-3 | 254 g | 4.4 | 79 % | 72 | 3.5 | 1.6 | Parts match… |
| longrange-7 | 850 g | 6.6 | 53 % | 120 | 16.2 | 6 | Parts match… |
| racer | 470 g | 15.3 | 23 % | 160 | 12 | 3.7 | Plenty of punch. |
| ardupilot | 1106 g | 4.3 | 81 % | 88 | 13.7 | Aggressive 6 | Parts match… |
| delivery | 2086 g | 4.2 | 83 % | 140 | 16 | 6.9 | Parts match… |
| agricultural | 4286 g | 4.2 | 83 % | 160 | 24 | 10.7 | Parts match… |
| wing | 528 g | 1.7 | 92 % | 22 | 26.4 | 10.6 | Thrust is close to weight. It may not climb. |
| crazyflie | 66 g | 0.7 | 92 % | 5 | 12 | 5 | Thrust is close to weight. It may not climb. |

Option sweeps (freestyle-5): 6S 1800 → 594 g, 10.8:1, hover 20.1 min; **4S 1500 → the same 12.5:1 as 6S**, hover 16.8 min (DR-03, DR-04); 2306 2450KV → 13.6:1; efficient prop +8 % hover time; aggressive prop −10 % freestyle time. Wing: 3S vs 4S leaves time unchanged at 26.4 min.

Bench: initial build 11/12, props off. "Take it apart" → all flags 0 (the figure follows). With 3 parts: Motor direction → pass, Calibrate → "stored" (DR-10, DR-11); Smoke → "No battery on the lead yet." Reversed XT60 → "Smoke stopper opened. The XT60 is backwards." Props on → "Smoke stopper failed: props are on.", "Props are on. Take them off before a direction test." Wiring → iframe reloads with `&sheet=wiring`; SVG text is only "MOTOR, FLIGHT CTRL, BATTERY" (F-21).

Flight: Space (held ≥ 1 frame) arms; W climbs (figure throttle 21.5, props still off); Arrow-Up moves the craft backwards (FS-01); Arrow-Right moves right; V shows a tilted horizon; Q switches to acro (the angle holds after release). Arrow keys can't scroll (FS-02). While armed, 244 patches/s reach the figure (PF-01). Answering the drone quizzes raised the header counter from 0/71 to 1/71 and then 2/71 (PG-01).

---

## 7. Figure fidelity: does each board and drone look like the real thing

Default view unless noted (`shots/current-audit/fig/*.png`, montages `mont_backs.png`, `mont_xr.png`, `mont_mods.png`, `mont_drones1.png`, `mont_drones2.png`).

| Figure | Recognisable? | What is wrong |
|---|---|---|
| Uno R3 | Yes | Blue PCB, DIP-28, female headers, USB-B, barrel, crystal, reset. Missing ICSP headers; clock parts mislabelled (E-02). |
| Uno R4 WiFi | Partly | 12×8 matrix and ESP32-S3 chip; no RA4M1; larger than the Uno (F-05). |
| Uno R4 Minima | No | Looks like a Uno without its chip, plus a "16U2" (F-05). |
| Nano | No | A shrunken Uno with a DIP and female blocks (F-04). |
| ESP32 DevKit | No | Generic yellow board with a metal slab (F-06). |
| ESP32-S3 DevKit | No | Identical to the ESP32, can reads "ESP32" (F-06). |
| NodeMCU | No | Identical to the ESP32, can reads "ESP" (F-06). |
| Pico / Pico W / Pico 2 | Mostly | Green castellated PCB and RP2040 chip; BOOTSEL misplaced; Pico 2 silk; W LED (F-07). |
| Nucleo-F401RE | No | Yellow (real Nucleos are white with an ST-LINK section); one morpho row; no buttons or Arduino headers (F-03). |
| micro:bit | No | **Empty yellow board** from the front; matrix and chip only from behind; the real one is black with 5 ring pads (F-03). |
| Pi 5 / Pi 4 | No | Yellow, 1×20 header, SoC hidden from the front (F-03, F-08). |
| Basys 3 | No | **Empty slab** from the front; from behind: 16 switches, 16 LEDs, 5 buttons in a row, tiny digits (F-03, F-09, F-10). |
| DE10-Lite | No | **Empty slab** from the front; 5 buttons drawn instead of 2 (F-03, F-09). |
| Robotics modules | No | Coloured slabs without pins, wiring or loads (F-13). |
| 5-inch freestyle, racer, 7-inch, GPS quad | Partly | X frame, motors, stack, camera; all nearly identical; props tiny, 3-blade, one spin direction; big square shadow (F-17, F-18). |
| Tiny whoop, cinewhoop | Mostly | Ducts drawn; same parts set as a 5-inch. |
| Delivery | Partly | Cargo box; no legs or gripper. |
| Agricultural | No | A quad with a tank; should be a hexacopter with booms and legs (F-20). |
| Flying wing | No | A flat rectangle (F-19). |
| Crazyflie (nano quad) | Partly | Small quad, but with XT60, camera, VTX and receiver it doesn't have (F-20). |

---

## 8. Untranslated strings inventory

Identical in es, fr, de, zh and hi (`audit/i18n_probe.py`; full JSON in `shots/i18n.json`). Product names (board names, chip numbers) are left out of the counts where they are legitimately untranslated.

- **Every page:** "Skip to content", "Fig.", aria-label "Modules", language codes in the select.
- **/** (home): "Boards", "Start here", and the three card texts ("boards, from the ATmega328P to a MAX 10. Pin 13, serial, and the failures that actually reset the rail.", "drivers and sensors, a socket-first Uno build, a reaction timer, a line, an arm.", "airframes. Weight, thrust, hover, and a stick you can fly before the props go on.").
- **/boards:** "Twelve boards. Each one is a figure you can turn, open, and program."
- **/boards/<slug>:** "Unplug USB", "Analog A0", "Button on pin 2", "Reverse the barrel", "Motor inrush", "Feed 5 V into a pin", "Cold solder on the LED", "Clear fault", every serial message the app writes ("Barrel is reversed…", "Polyfuse is open…", "USB is unplugged.", "Fault cleared. Rail is back.", "FPGA pattern is stepping. This is not a bitstream.", "Motor inrush sagged the 5 V rail. Brown-out reset.", "The pin went HIGH. The joint is cold…", "Pin … has no PWM hardware…", "Could not compile: …", "Sketch stopped: …", "Serial began at …", "tone … Hz"), all facts (5 on the Uno, 4–5 per board), and every part name and role (18 on the Uno, e.g. "Main MCU, 16 MHz, 5 V", "Opens on a USB short", "Op-amp, not the USB bridge").
- **/robotics:** "Robotics", the lede "Drivers, sensors, a power stage, and three practice tasks…", the practice names and texts ("Build the Uno", "Bare board, socket, solder, USB, upload.", "Reaction timer", "Interrupt, debounce, millis. No delay in the wait.", "Line follower", "Eight QTR sensors and a steering number.", "Two-joint arm", "Two servo angles, one PCA9685 idea."), "Open the full board lesson.", "LM2596 buck".
- **/robotics/uno-build:** "Build the Uno", "Socket first. The iron never touches the ATmega328P.", all 8 buttons, all log lines, "Check yourself".
- **/robotics/reaction:** title, lede, "Stop the clock". **/robotics/line:** title, lede, "Error … Steering …". **/robotics/arm:** title, lede, "Shoulder", "Elbow", aria "Two joint arm". **Module pages:** "Draw … mA on the logic rail. Motor current stays on VM."
- **/drones:** "Drones", "Ten airframes. Same calculator…", and every drone name ("5-inch freestyle", "Tiny whoop", …).
- **/drones/<slug>:** "Build n/12", step ids (frame, motors, esc, wires, fc, xt60, cam, rx, vtx, top, battery, props), "Add next part", "Build it for me", "Take it apart", "Wiring", "Props on/off", the six stat labels, "Battery"/"Motors"/"Props" pickers and option labels, the cost sentence, the whole Wiring list, "Safety", "XT60 normal/reversed", "Smoke stopper test", "Motor direction", "Calibrate accelerometer", the status line ("Smoke stopper: idle. Motors: … Accel: not run"), every log line, "Fly", the help line "W S throttle, A D yaw, arrows pitch and roll, Space arm, V FPV, Q angle or acro, R reset. Fly the red gate, then the next.", all 9 stick labels, "Betaflight CLI"/"ArduPilot", aria "Calculations", "Flight simulator", "On-screen sticks", and the canvas text "ARMED/SAFE angle/acro alt laps".
- **Inside every figure:** see I-02.
- **Translated but incomplete:** see I-03.

---

## 9. Gap list against the three originals

Full detail is in the sibling teardown docs; this is the list of what the current build lacks.

**Learn Arduino** (`learn-arduino.md`):
- Per-lesson parameter controls that regenerate the code: Blink "On for", "Off for", "Resistance 220 Ω/1 kΩ/10 kΩ"; Button "Logic Hold/Toggle"; Knob position; RGB "Presets" + Red/Green/Blue; Light "Lamp distance", "Lamp switched on", "Dark below"; Sensor "Read every"; Sound "Tune: Scale/Twinkle/Ode to Joy", "Note length", "Speaker volume"; Piano "Play by itself / No, I play", "Octave C4–C5/C5–C6", "Note names Do Re Mi / C D E"; Motor "Top speed", "Ramp step"; Heat "Hairdryer distance", "Fan on above", "Fan speed", "On / off" vs "Ramp"; Servo "From", "To", "Step delay"; Stepper "Top speed", "Acceleration", "Whole turns first", "Direction"; Plant "Water me!"/"Too wet!" thresholds, dry-air and water readings, "Shade/Window/Full sun"; Force "Pull-down 1/10/100 kΩ", "On the pad None…500 g", "Bell rings above", "Hold the best for"; Project "Green beyond", "Red within".
- HC-SR04 and stepper lessons, the parking-sensor project, OLED, fan, buzzer audio, per-lesson specs and pinout tables, callouts, a 3D stage.
- Settings: Callout labels, Current flow, Floor grid, Turntable, Sound, Reduce motion, Reset progress; Components panel; part popovers ("Zoom to it", "Hold it down in the scene"); a schematic overlay; collapsible code; Uploading → Running → Stopped states.
- 13 languages with locale URLs and RTL.

**Robotics Bench** (`robotics-bench-a.md`, `robotics-bench-b.md`):
- 13 figures, each with a build engine (parts by height group 0–3, polarity options, `needs`/`run`, faults pop/hot/dark, reflow, solder, upload with byte count and RX/TX flicker, guard rails), runnable modes, serial output per mode, 2–4 quizzes each, a practice project, and month-by-month curriculum groups.

**Drone Lab** (`drone-lab-a.md`, `drone-lab-b.md`, `drone-lab-b-calc-matrix.md`):
- 13 crafts; a physical calculator (formulas in DR-03/DR-04) with over-spin and T:W warnings and an Electrical/Mechanical cost split.
- A bench with real mistakes (polarity, wrong motor, FC orientation) and gated tests; wind; per-craft physics (wing, VTOL, tricopter, whoop, Crazyflie); flying ranges with obstacles, checkpoints and collisions; FPV with OSD; lap and best-lap times; crash, out of field, battery empty, desync.
- Per-craft modes and CLI/log styles (Betaflight, ArduPilot, INAV, cflib); 4 quizzes per craft.

---

## 10. Repro scripts and screenshots

All scripts are in `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/audit/` and expect the production server on port 3311. Run with `python3 -I <script>`.

| Script | What it shows |
|---|---|
| `crawl.py` | Every route, desktop and phone, errors, iframe data-errors, screenshots |
| `nan.py` | NaN hits are base64 texture only |
| `boards_interact.py` | Every lesson run on 4 boards, failures, sheets, exploded, see-through, labels, drag |
| `race.py` to `race4.py` | The P-01 handshake race (`race4.py` with 6× CPU throttle) |
| `runner_probe.py` | Stale-runner race, servo 0, PWM, motor lesson figure errors, figure buttons vs app, drag on paper, variants |
| `runner_cases2.py` | Translator gaps and the `while (1);` freeze |
| `fpga_probe.py`, `de10_probe.py` | FPGA switches, buttons, chaser, edits ignored, DE10 digits |
| `figshots.py` | Direct figure screenshots for every board, variant, back view, see-through, sheet, module, drone |
| `robo_probe.py`, `robo_probe2.py`, `reaction_probe.py` | Uno build orders, line follower, arm, module sketches and quizzes, reaction timer |
| `drone_probe.py`, `fly_probe2.py` | Calculator values and sweeps, bench tests, wiring, keyboard capture, flight direction, patch rate |
| `i18n_probe.py`, `dark_probe.py`, `editor_probe.py`, `part_probe.py` | Untranslated strings, contrast and dark screenshots, phone editor overflow, part selection and keyboard |

Screenshots are in `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/shots/current-audit/` (desktop `d_*.png`, phone `m_*.png`, figure details `fx_*.png`, direct figures `fig/*.png`, montages `mont_*.png`, dark `dark_*.png`, languages `i18n_*.png`).
