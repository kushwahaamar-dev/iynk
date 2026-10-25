# Decisions

One line each: the decision, then why. Newest sections last. Corrections to the originals' golden calculator rows
are listed here too (calc agent: docs/requests/calc.md and src/lib/drone/__fixtures__).

## Architect (13:45 CDT Oct 24)

- A1 Content modules are TypeScript data (`satisfies XContent`) with only `import type`: one typed source, and Node 24's type stripping lets scripts and the figure build read them without a bundler.
- A2 Text fields hold TextKeys into per-item JSON, recognised by section prefix (`lessons.`, `parts.` …): literals (pin names, part numbers, code) stay literal and `--check` can find every missing key mechanically.
- A3 Code comments translate through `{{t:key}}` tokens and chips through `{{p:id}}`: identifiers stay real Arduino/Python/Verilog while every word a learner reads is translated.
- A4 Geometry, build groups, polarity, removability, lesson circuits, built-in demo modes, drone build rules and the drone wiring sheet live in the figure file (FIGURES-BENCH/FIGURES-DRONE); the content module holds what the host shows or checks; shared ids must match and the verify agent tests it. Avoids two copies of the same data while engines and items are built in parallel.
- A5 Lessons reference a figure circuit by key (= lesson id), because the Board Bench engine solves and draws circuits; the interpreter gets pins through `WorldInput.pins` + `DeviceModel`, so it needs no breadboard data.
- A6 Lesson and task completion = every `Check` passes on a headless deterministic run with the world script (D14c); the Learn Arduino rule "done when the upload finishes" is too weak for "lessons that work".
- A7 Practice tasks carry a reference `solution`, so a unit test proves each task is solvable with its own checks.
- A8 Bench and drone steps name the exact bridge command that performs them (`BridgeCommand`) and the figure state that marks them done (`StateCond`, dot paths): the host never guesses figure internals, and LabDock/replays can drive the same messages.
- A9 `Mcu.target` fixes the interpreter's int width and API shims (16-bit `int` on avr, 32-bit elsewhere), so per-target behaviour is data, not code branches.
- A10 Palette lives only in ids.ts metadata (index cards and figures read it there): one source.
- A11 Robotics bench ids name the subject (`tb6612fng`, `hc-sr04`, `pi5-ros2`; the two board builds `uno-r3-build`, `esp32-s3-build`), distinct from board ids so routes and progress keys never collide in reading.
- A12 Module ids (breakout boards incl. ULN2003, SSD1306, traffic-light, soil sensor) and part ids (components and mat peripherals) are listed from the 16 Learn Arduino lessons and the 13 benches; agents add more only additively.
- A13 Drone design types reuse src/lib/drone/calc's own types (`CalcModel`, `CalcBattery`…), and the catalogue keys equal the figure's design keys: the calculator consumes content directly (`designInput`) with no mapping layer.
- A14 Drone palettes follow the originals (quad5 tomato, whoop/cinewhoop/longrange mint, racer mustard, gpscam cobalt, delivery mustard, agrihex mint, wing blush, vtol cobalt, swarm mint, tricopter mint, octo cobalt).
- A15 Board card progress counts lessons only (Uno R3 reads `0/16` like the original) with assembly as its own tick, matching the brief's "identical in spirit".
- A16 The generator writes index.generated.ts only when its text changes (no dev-server reload loops) and never fails the build for an item in progress; `--check` is the strict mode for item agents and CI.
- A17 Content JSON is nested (dot paths), matching the shared `t()` in src/i18n/translate.ts.

## Calculator corrections (quad5, from docs/requests/content-quad5.md §6)

- The calculator keeps the original's formula, so three cells of the original's printed table (drone-lab-a Appendix A) differ from what the app shows, because the table was rounded twice: 6s1100 / 2207-1950 / 5x5x3 hover time 10.6 min (table 10.7), and 6s1100 and 6s1800 / 2306-2450 / 5x4.3x3 max current 283 A (table 282). `src/content/drones/quad5.test.ts` checks both values.
- quad5's data stays identical to the original where it is generous: the fixed part TOP (22 g) partly double-counts the frame kit, and the 5.4 g/W hover efficiency gives 12.3 min of hover against 6-8 min in real flying (docs/facts/quad5.md). Changing them would break the golden rows the calculator is checked against.
- The original's ESC firmware label "BLHeli_32" is AM32 (or Bluejay): BLHeli_32 ended on 30 June 2024.

## Build night (16:15 CDT Oct 24 to 02:00 Oct 25)

Scope decisions of phases 1 to 3, from HANDOFF.md, docs/handoff/CONTEXT.md §3 and §5, docs/hacktx/BUILD-PLAN.md and docs/requests/*-gaps.md.

- B1 Six locales (en, es, fr, de, zh, hi), not the 13 an agent first promised: they are the brief's six (docs/SPEC.md), and six could ship complete with no placeholder text. Set by the architect at 13:45 (BASE_ARCHITECTURE D1) and recorded here because the user was not told at the time (CONTEXT §3).
- B2 The repository's history starts fresh at 15:31 Oct 24, and the pre-event baseline `245763f` was left out rather than re-dated: re-dating it would have presented pre-event code as built during the event (CONTEXT §3).
- B3 D1, tracks: phases 1-3 build for Best Overall, SerpApi, Most Entertaining and Meta; Solana and Best Hardware Hack only in a phase 4, after gate 3, with their UI behind feature flags until then. Amar, 16:15: "as the last end of it … only when we have time left".
- B4 D2, translation tiers: all UI and figure text and the judge path's prose (Uno R3, quad5, the ESP32-S3 bench) first, English prose under a "not yet translated" notice everywhere else, the rest overnight: full prose in five more languages is about 850k words, too much for the six hours (Jagrati, 16:13: "confirm the default"). The overnight waves then translated all 38 items by 01:52.
- B5 D4, keys: API keys stay placeholders and Vultr, Vercel and Tiger are not approved, so every sponsor feature must say "not set up on this deployment" and leave the lab working; gate 1 ran locally with no deploy (Jagrati 16:13, Amar 18:31: "Not yet, gate 1 locally").
- B6 Autonomous mode: after a user's go, each phase's gate (BUILD-PLAN §6) replaces the per-phase approval CLAUDE.md asks for, and the driver reports at each gate in HANDOFF.md (Jagrati 16:23 "autonomous mode"; Amar 22:20 full autonomy for every remaining build phase).
- B7 One check path: Board Lab, Robotics and every content test check through `runHeadless` and `evaluateChecks` only, and the content tests' private runners were deleted: those runners had produced false greens (BUILD-PLAN §3.2 item 1).
- B8 Blink periods follow the lesson's own code, so the content changed, not the check rule: the code and the text a learner reads must agree (BUILD-PLAN §3.2 item 1).
- B9 Checks run in a Web Worker with a progress state and a 20 s budget: a 15 s Wi-Fi lesson run must not freeze the tab (BUILD-PLAN §3.2 item 3).
- B10 English prose fallback per file, never per key: a language without an item's file shows the English file under a notice, but a missing key still throws and an item with no English prose still 404s, so half-translated text can't slip through quietly (18:48, ARCHITECTURE v1.4).
- B11 The model hook: each bench describes its electrical behaviour in a small `model(state, dt)` (transistor saturation, H-bridge levels, buck output, stepper current) instead of waiting for a general solver for every part type: that is what made nine new benches possible in the time (BUILD-PLAN §3.2 item 6, `a45ec96`).
- B12 A nodal circuit solver was added beside the hook for breadboard circuits (transistors, diodes, motors, servos, sensors, pots, buttons): lesson circuits needed the part types the hook doesn't cover (`e61a5b8`, P2-engine).
- B13 Mat parts sit in fixed places with pre-routed wires per bench step, no free wiring: BUILD-PLAN §3.2 item 6 chose it with the model hook to fit the benches into the time. So a wiring mistake on the mat (Trig and Echo swapped, Vcc on 3V3) is played by the model in the readings and status, not drawn as a moved wire (P2-rob-sensors gaps).
- B14 Phase 2 ran as two waves of 9 and 10 agents with one owner per shared file per wave, not 17 at once: the first build died at 14:19 on a usage limit with 56 agents in flight (19:26).
- B15 Phase 3's first prose wave ran beside wave B, because it wrote only new files; its second wave (wave B's items and the UI strings) started at 01:23, before gate 2, because every agent writing English prose had finished (22:30, 01:23).
- B16 The racer's ESC is 55 A, not 45 A: the default build opened on an over-current warning, real race 4-in-1 ESCs are 45-55 A a channel, and the calculator's 217 A peak is already about 20 % above real bursts. The calculator's ESC example moved to the hotter 2306 2700 KV motor (`7f1f0db`, docs/requests/P2-drones-fpv-to-driver-racer-esc.md).
- B17 The VTOL's 4S2P Li-ion pack is not flagged Li-ion in the calculator: with the flag, the check against full throttle on all four lift motors (116 A against 90 A) fires on a moment a VTOL only passes through. A hover-current check for VTOLs is the right fix and is left open (P2-drones-vtol gaps 5).
- B18 Telemetry wording: the old "No tracking" promise became "anonymous, opt-out". With a database the labs send anonymous counts (a lesson passed, a step built, a fault tried, a lap time) with a random browser id, the "Share anonymous usage counts" box on every lab page turns them off and the client honours it, and the privacy copy says so in all six languages: "No tracking" would no longer be true (BUILD-PLAN §3.2 item 9, `1dc25ff`, ARCHITECTURE v1.6).
- B19 Sound is off by default, so nothing plays until the learner turns it on (BUILD-PLAN §3.1), and it is one saved setting toggled from each workspace's header: there is no settings page, and the header had another owner (P2-social gaps).
- B20 Laps flown with Break it switched on don't go on the leaderboards, and the daily challenge's pool is built with the site and picked by rendezvous hashing: a broken craft's lap isn't comparable, and a new craft only changes the days it wins (P2-fun).
- B21 Rooms run on the one-browser BroadcastChannel fallback and leaderboards show "not set up" until the relay and a database are approved, and their tests cover exactly that: the relay (Vultr) and Tiger Data were never approved (D4; P2-social, P2-fun gaps).
- B22 Kept in English in every language: code, pin names, part numbers, CLI commands, the serial output a check matches, firmware and OSD messages, flight mode names, third-party menu names, and silkscreen printed on a board: the checks match exact text, and the real firmware and the real board print it that way (phase 3 T1, docs/verify/sweep.md 11).
- B23 One name per control in each language across the UI, the figure and the prose (es "Averíala", de "die Werkbank"): a learner following the prose must find the same words on the button (phase 3 T2, `3c40104`, `a5ac72b`).
- B24 The figure-string delta waits for the engine owner: the collector was rebuilt on acorn and finds about 1391 more strings, but P2-engine-b was still changing figure text, so the key list is regenerated and translated once, as its own small wave, after that agent finishes (HANDOFF, `a516233`).
- B25 The Verilog simulator has no `function`, `task`, `generate`, `inout`, UART or ADC, and no lesson uses them: the FPGA "analog" lessons are PWM, and a design with `parameter CLK_HZ` runs on a 100 kHz simulated clock to stay inside the cycle budget (P2-fpga gaps 3).
- B26 The micro:bit's protocol lesson reads the accelerometer on the internal I²C bus instead of a radio lesson, and the touch-tune lesson checks the count and the code, not the tone: the radio has no peer in the world model and the trace has no sound (P2-microbit and P2-pi gaps).
- B27 The VTOL's AUTO survey is flown as a VTOL all the way, while its snippet and prose describe the real mission with `DO_VTOL_TRANSITION`: the sim cannot fly a mission leg on the wing yet (P2-drones-vtol gaps 3).
- B28 The racer's LED-strip snippet keeps its `led` lines as comments: the Betaflight emulator has no `led` command, and a snippet must run in the emulator as written (P2-drones-fpv gaps 2).
- B29 Where a datasheet gives no number (idle currents, brown-out levels, unmeasured part positions), the model uses a stated estimate and the item's gaps file names it, and where a fact couldn't be confirmed it is left out rather than guessed (nine micro:bit built-in tunes): every number a learner sees should be one we can source or have marked (P2-fpga, P2-microbit, P2-nucleo, P2-pi gaps).
- B30 Phase 4 is skipped: no Solana deploy, no hardware rehearsal, devnet SOL (D3) never asked for. The Passport and Hardware tabs stay behind their flags and, as BUILD-PLAN phase 4 says, the write-up claims neither track. Amar, 22:20: "leave aside th hardawre and solana thingy" (CONTEXT §5).
