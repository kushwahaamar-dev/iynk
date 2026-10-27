# Council memo: simulation fidelity

Seat: embedded-systems engineer, electrical engineer, simulation researcher.
Date: 2026-10-27. Remit: red-team questions 6 and 18.
Labels: VERIFIED, DOCUMENTED, EXTERNAL (research file and [S#]), ESTIMATED (assumptions shown), HYPOTHESIS (test given), UNKNOWN.
Paths below are relative to `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/` unless they start with `src/` or `figures/`.

## 1. Bottom line

1. iynk's simulators are teaching models, not emulators. They are good enough to teach cause and effect inside the 38 catalogue items. They are not good enough to promise that a design that works in iynk will work on a bench. No number in the repo has ever been compared with a real board, a real instrument, or an independent simulator (VERIFIED: `01_AUDIT/inventory/interp.md` "Test coverage", `01_AUDIT/inventory/figure-engine.md` "Test coverage", `01_AUDIT/FEATURE_VERIFICATION.md` lines 271 and 363).
2. Open-source engines already beat iynk on fidelity on every axis except one. avr8js and rp2040js run real compiled firmware cycle by cycle. ngspice does transient, AC and real device models. Falstad does transient in a browser. iynk's only fidelity-adjacent edge is that it explains why a part failed, in words, for 16 named faults (EXTERNAL: `02_RESEARCH/TECHNICAL_RESEARCH.md` F11, one scripted run). That is a teaching edge, not a physics edge.
3. Do not try to win on fidelity by extending the TypeScript interpreters. The Arduino C++ subset will never reach C++ (VERIFIED: no classes, templates, pointers, `#ifdef`; my probe below). Keep the interpreters as a fast, offline, zero-download "Tier 1" for lessons and checks. Add real engines as an opt-in "Tier 3" for original projects, using MIT or BSD code only.
4. Say so in public. Today's copy ("failures that really trigger", "behaves like real hardware") over-claims. Section 6 gives replacement copy.
5. Buy credibility cheaply and in order: software oracles first (ngspice, avr8js, CPython, Verilator; about 3 weeks, near zero cost), then a bench programme (24 reference circuits, about 100 timing measurements, one destructive batch; ESTIMATED USD 2,500 to 5,000 of kit and 6 to 8 person-weeks). Only then print the word "validated".
6. One tension the research files do not resolve: the mission is "regardless of money, place, language or equipment". A real-firmware path needs a compile step (server cost, or a 55 MB browser toolchain) and runs slower than real time on weak devices. That cuts against low-bandwidth, low-end-device users. The tier model below keeps Tier 1 as the default for that reason.

## 2. Evidence reviewed

Read in full or in the relevant parts:
- `01_AUDIT/inventory/interp.md` (interpreters, time model, stubs, probes)
- `01_AUDIT/inventory/figure-engine.md` (circuit solver, faults, burn rules)
- `01_AUDIT/inventory/flight.md` (flight dynamics, scripted faults)
- `01_AUDIT/FEATURE_VERIFICATION.md` (claims C003 to C119, "Fidelity to hardware" gap rows, suggested honest copy at lines 319 to 349)
- `01_AUDIT/inventory/docs-claims-history.md` (founder's stated motive, no stated position on user projects)
- `02_RESEARCH/tech/simulation-options.md` (engine survey, licences, spikes S-1 to S-11)
- `02_RESEARCH/TECHNICAL_RESEARCH.md` (D1 to D3, F6, F7, F10, F11)
- `02_RESEARCH/competitors/embedded-sim.md` (Wokwi, Tinkercad, Velxio, others)
- `02_RESEARCH/USER_SEGMENTS.md` (segments 1 to 13, summary only)
- `docs/handoff/CONTEXT.md` (founder's words)

Code read directly: `figures/engine/bench-solve.js` lines 1 to 16 and `PIN_R` use; `src/lib/interp/profiles.ts` `opUs` and `pinMaxMa` fields.

New evidence I produced (scratch: `/Users/amar/iynk-master-plan-scratch/strategy/fidelity/probe.ts`, `timing.ts`; repo untouched):
- Compile probe, TESTED, n = 17 hand-written Arduino sketches on `uno-r3` via `check()`. 10 compile: Blink, Fade, AnalogReadSerial, Debounce, Servo sweep, array smoothing, Ping with `pulseIn`, `SPI.transfer`, Wire scan, String methods. 7 fail with clear messages: `#include "pitches.h"`, `EEPROM`, `SoftwareSerial`, `DHT`, `TCCR1A` register code, a `class`, `#ifdef` with a pointer. The corpus is my own and not representative. It shows the failure pattern, not a rate. The `SPI.transfer` sketch compiles and silently returns 0 (VERIFIED, matches defect D4).
- Timing probe, TESTED. Loop of `n++; digitalWrite(13,HIGH); digitalWrite(13,LOW);` plus a `millis()` test, run for 1 simulated second. Uno: 200,000 iterations (5 us per iteration). ESP32: 2,000,000. Pico MicroPython loop with `ticks_diff`: 62,499.
- Web check for real Uno `digitalWrite`: one benchmark reports about 3.4 us ([roboticsbackend.com](https://roboticsbackend.com/?p=1769)); a Timer-1 cycle count gives 59 to 61 cycles, about 3.7 to 3.8 us ([Arduino forum, "timing"](https://forum.arduino.cc/t/timing/471455)); some posters say about 6 us. Forum posts, not datasheet figures.
- ESTIMATED consequence: the same Uno loop on hardware has two `digitalWrite` calls (about 7.5 us), a `millis()` call and loop overhead, so roughly 9 to 11 us per iteration, about 90,000 to 110,000 per second. The simulator is about 2 times too fast on this loop. Cause: every statement costs a flat 1 us (`opUs`, `src/lib/interp/profiles.ts:108`), whatever it is. Test: S-1 below.

Not read in full (say so): the 1.8 MB of other audit and research files (security, performance, compliance, platform options, source register). I did not run a browser or any real hardware. I have no hardware here.

## 3. Fidelity grades by domain

Scale used (my definition, also the tier model in section 5):
- T0 Illustrative: scripted outcomes, no physics.
- T1 Educational approximation: simple rules or piecewise models, stated limits, qualitative cause and effect right, numbers indicative.
- T2 Behavioural: datasheet-parameterised models with cited fields, tolerance bands, convergence reporting, cross-checked against an independent engine.
- T3 Firmware-target: the user's real compiled binary on an emulator that models the CPU and peripherals; analog by a SPICE-class engine.
- V Validated badge: orthogonal. Measured against physical reference circuits, error stated.

| Domain | What it really computes | Grade today | Label | Main gap to the next grade |
|---|---|---|---|---|
| Arduino C++ on Uno, Nano (46 lessons, 28 tasks) | Source text run by a closure-tree interpreter. Flat 1 us per statement. No registers, timers, SRAM, ISR latency. `idle()` jumps time when a loop does nothing visible. | T1 for logic, T0 to T1 for timing | VERIFIED (`interp.md` time model, `exec.ts:93-99`; my timing probe) | Cycle-accurate execution needs a compiled binary (avr8js). No amount of cost-table tuning gives registers or libraries. |
| Arduino C++ on Uno R4, ESP32, NodeMCU, Nucleo | Same interpreter. The board profile changes int width, ADC bits, `opUs`, pin list. It does not model a Cortex-M or Xtensa core, FreeRTOS, dual core, Wi-Fi stack, strapping pins. | T1 for logic, T0 for anything board-specific | VERIFIED (`profiles.ts`, `interp.md` open question 5) | No browser-ready open emulator exists for these (EXTERNAL: `simulation-options.md` 2.5, 2.6; Espressif QEMU lacks GPIO matrix and I2C, `S9`). Keep T1 and label it. |
| MicroPython on Pico, micro:bit | Tree-walking Python subset. No `machine.SPI`, `UART`, PIO, `json`, `neopixel`. `deepsleep` just sleeps. `Pin(99)` accepted. | T1 | VERIFIED (`interp.md`) | rp2040js runs the stock UF2 (EXTERNAL `S3`, 131 MIPS on a bare loop, README older than code). Micro:bit Foundation simulator runs real MicroPython (MIT, API "not yet stable", `S17`). |
| Python on Raspberry Pi (gpiozero, rclpy) | Same Python subset, mock gpiozero/rclpy. `RPi.GPIO` refused on Pi 5 by design, which is correct behaviour. No DDS. | T1 | VERIFIED; two-node rclpy exchange UNKNOWN | Pyodide with a GPIO shim gives real CPython semantics (EXTERNAL `S19`, 9.6 MB wasm). Not a Pi emulator. |
| Circuit solver (DC) | Modified nodal analysis, dense Gauss, piecewise-linear LED, diode and NPN. Fixed `PIN_R = 25` ohm for every board. Silent exit after 40 rounds. | T1, and good at that for LED, divider, pot, transistor switch | VERIFIED (`bench-solve.js:10-16`, `figure-engine.md`) | No C, L, MOSFET, PNP, op-amp, regulator, transient. No netlist input. No SPICE comparison. Convergence not reported. |
| Power tree, regulators, brown-out | Rules in `bench.js`: dropout constants, `ilim` per source, a 0.6 s sag that multiplies the rail by 0.42. Not a Thevenin droop from the network. | T0 to T1 | VERIFIED (`figure-engine.md`) | Needs source impedance and regulator behavioural models inside the solver. |
| Fault models (burn, short, reverse) | Threshold rules on solved values, latched. LED burns above 2.5 times `imax` peak. Thresholds are datasheet-informed, hand fitted, not datasheet-exact. 1N4007 Shockley parameters are ignored by the solver. | T1 qualitatively, T0 quantitatively | VERIFIED; thresholds never tested against hardware | Failure is a distribution, not a line. Needs a destructive batch (section 8, V3). |
| Drone and flight faults | Boolean flags. A reversed flight controller injects a fixed 900 deg/s roll after 0.25 s. | T0 | VERIFIED (`flight.md` Faults) | Needs per-motor torque and an inertia tensor so the fault falls out of the dynamics. |
| Flight dynamics | Point mass with kinematic Euler attitude, angle-lag controller, no sensors, no PID, no inertia. Tuned to the calculator. | T0 to T1 (arcade) | VERIFIED (`flight.md`) | Cannot teach PID tuning. Real SITL runs real firmware. Defer. |
| I2C | Register-level MPU-6050, PCA9685, SSD1306 subset, 1602 backlight, ACK-only generic device. Zero bus time. No pull-ups, capacitance, clock stretch. | T1 functional | VERIFIED (`devices.ts`, `interp.md`) | Device models are TypeScript classes in a closed schema union. No user-defined device. |
| SPI | Stub. `transfer()` returns 0, no warning. | T0 and unsafe | VERIFIED (D4, my probe) | Fail loudly now (cheap). Real SPI needs device models. |
| UART, 1-Wire, CAN, BLE, I2S | UART is a print sink with instant delivery. Others absent. | none | VERIFIED | Do not claim. |
| Wi-Fi, HTTP | Fixed 1.2 s DHCP, fake web table, host-injected requests. | T0 | VERIFIED | Label as mocked. |
| Verilog / FPGA (Basys 3, DE10-Lite) | 2-state cycle simulator. One clock edge per cycle. No X/Z, no vectors above 32 bits, no functions, generate, memories, delays, `inout`. About 3M cycles/s, so a 100 MHz design runs about 30 times slower than real time (D3). No synthesis, timing or resource report. | T1 for small synchronous lessons | VERIFIED (`interp.md`) | Real Verilog fails to parse. Yosys plus DigitalJS gives real elaboration and a netlist view (BSD/ISC, EXTERNAL `S23`, `S37`). Not a path to a bitstream for these boards (`S36`). |
| Sensor transfer functions (TMP36, divider, pot) | Datasheet nominal formulas. | T1, probably correct at nominal | DOCUMENTED; the one hand check (TMP36 0.5 V + 10 mV/C) matches | No tolerance. |
| Determinism and replay | Seeded RNG, virtual clock, no wall-clock reads in the interpreters. | Strong. Better than most competitors. | VERIFIED (`interp.md` Determinism) | Keep as an architectural invariant for every engine added. |

Two properties that matter more than any single grade:

1. The tests are circular. The 12.2 mA LED figure is `3 / 245.5` from the solver's own constants. The HC-SR04 test asserts a number derived from the constant it tests. `lessons.test.ts` proves 102 of 102 reference solutions pass checks written beside the simulator (VERIFIED: `figure-engine.md`, `interp.md`). Regression protection, not validation.
2. Output precision exceeds accuracy. The solver prints one number. Using nominal parts it says 12.2 mA for a red LED through 220 ohm on a 5 V pin. ESTIMATED range on a real bench, assumptions: resistor 5 percent, LED Vf 1.8 to 2.2 V, pin supply 4.8 to 5.0 V, pin resistance 20 to 40 ohm: about 9.6 to 13.9 mA, roughly plus or minus 18 percent. A learner who measures 10.4 mA and thinks the circuit is broken has been misled by false precision.

## 4. Weaknesses (each with evidence and label)

| # | Weakness | Evidence | Label | Why it matters to a learner or builder |
|---|---|---|---|---|
| W1 | No physical or independent-oracle validation anywhere | `FEATURE_VERIFICATION.md` 271, 308, 363; `figure-engine.md` test table | VERIFIED | Every accuracy statement is currently an assertion. |
| W2 | Flat statement cost, Uno loop about 2 times too fast | `opUs: 1`; my probe 200,000 iterations/s vs ESTIMATED 90,000 to 110,000 on hardware | VERIFIED probe, ESTIMATED hardware figure | Bit-banged protocols, debounce timing and "how fast can I toggle" lessons teach the wrong number. |
| W3 | Idle-skip jumps virtual time | `exec.ts:93-99`, `interp.md` time model | VERIFIED by reading, harm UNKNOWN | Delay loops written as empty `for` loops behave differently. |
| W4 | Language and library subset hides real failures and creates false ones | My probe: 7 of 17 fail (class, `#ifdef`, EEPROM, SoftwareSerial, DHT, registers, local header) | TESTED, small n | Valid C++ shown as an error teaches the learner that correct code is wrong. Real hardware bugs (overflow, RAM, ISR) cannot appear. |
| W5 | SPI silent stub; Wire and Serial cost zero time | D4; `libs.ts:741-790` | VERIFIED | A sketch "works" with wrong data. |
| W6 | `PIN_R = 25` ohm for all boards | `bench-solve.js:10,161` | VERIFIED | A Pico or ESP32 pin sags differently. `pinMaxMa` is per board (Uno 40, R4 8, Pico 12, micro:bit 5) but the solver does not read it. HYPOTHESIS that this changes LED currents by tens of percent on 3.3 V boards; test V1/V3. |
| W7 | Linear pin model beyond datasheet limits | The headline "113 mA through a 20 mA LED" (claim C010) uses `5 V / (1 + 25 + 0.5 ohm)`. A real pin saturates and exceeds absolute maximum (Uno 40 mA) | VERIFIED arithmetic, real behaviour UNKNOWN | The lesson is right (do not do this). The number is an extrapolation shown as a measurement. |
| W8 | Burn thresholds are rules, not distributions | `bench-solve.js:301-345` | VERIFIED | Real LEDs often survive 50 mA briefly. The sim says they burn. Wokwi users complain of the opposite (LED does not burn, [S34] 2022-era, EXTERNAL). Both are wrong in different directions. |
| W9 | Solver exits silently after 40 rounds or 6 passes; no residual check | `bench-solve.js:213,264` | VERIFIED | Wrong answers with no warning. No instrumentation to know if any lesson hits it. |
| W10 | Solver cannot take a netlist; no C, L, MOSFET, regulator | `figure-engine.md` | VERIFIED | Blocks every original project with decoupling, RC timing, an H-bridge or a buck. |
| W11 | Dense O(n^3) per round, rebuilt every frame | ESTIMATED 10^9 flops per frame at 100 strips | ESTIMATED | Fine at 9 parts. Breaks at breadboard scale. |
| W12 | Verilog cannot run board-speed designs; real Verilog features rejected | D3, `sim.ts` unsupported list | VERIFIED | FPGA students write `function`, `generate`, arrays on day one. |
| W13 | Memory bombs abort the process; checks forgeable | D1, D8 | VERIFIED | Fidelity of a check result means nothing if it can be forged (relevant before any credential). |
| W14 | Live run on the main thread; up to 27 ms per frame | `engine.ts:164` | ESTIMATED | Phones and Chromebooks may jank. Not measured. |
| W15 | Flight sim cannot express tuning or per-motor faults | `flight.md` | VERIFIED | Fine as a game. Do not sell it as flight training. |
| W16 | Public copy over-claims | Claims C003, C044 ("failures that really trigger"), C010; audit's own copy fixes at `FEATURE_VERIFICATION.md` 319 to 349 | VERIFIED | Fidelity trust is the asset a hardware education product cannot recover once lost. |
| W17 | The founders' own sentence sets an unmet bar | `docs-claims-history.md`: a lab that "behaves like real hardware so the only thing you ever have to buy is the final prototype" | DOCUMENTED | That promise requires T3 plus validation for the parts the learner intends to build. Today it is T1. |

Specific safety note. A simulator that says "safe" when the real circuit is not is worse than one that says nothing. Cases where iynk cannot know: LiPo charging and short-circuit behaviour, inductive loads without a flyback path (one test exists for flyback), mains, regulator thermal limits, ESP32 strapping pins, 5 V into 3.3 V pins beyond the existing warning. Rule proposed in section 5: the simulator never issues a positive safety statement ("this is safe to build"); it only reports what it modelled.

## 5. Opportunities

1. Fidelity tier model with a visible badge (below). No competitor shows what its simulator does not model. Wokwi states limits in docs only (EXTERNAL `embed-sim` rows); Tinkercad does not. Honesty can be a differentiator for teachers and for trust (HYPOTHESIS; test with 10 educator interviews, see `USER_RESEARCH_PLAN.md`).
2. Keep the fault explanation layer and move it onto better physics. The "what you see, why, fix" card is the asset (F11). It can sit on top of ngspice results with the same thresholds, now with tolerance bands.
3. Adopt MIT engines and save 6 to 12 person-months of interpreter work (ESTIMATED: the interpreter folder is 11,822 source lines; avr8js binding 2 to 4 weeks, rp2040js 3 to 5 weeks per `simulation-options.md`).
4. Use the existing 102 lesson reference runs as a differential-test corpus. They are free test cases for avr8js, ngspice and Verilator comparisons.
5. Determinism: every adopted engine can be driven from one integer-nanosecond clock and a seeded noise source (pattern in `simulation-options.md` section 5). Rooms and replay then stay bit-identical. This is rare and sellable to teachers (grading re-runs).
6. Tolerance bands as a teaching feature. "Your reading may differ by 10 to 14 mA because resistors are 5 percent" is a lesson that no free tool teaches at the point of need (HYPOTHESIS).

## 6. Answers to the red-team questions in my remit

### Q6. Are our simulations accurate enough for the intended users?

It depends on the user and the claim. Split by segment (`USER_SEGMENTS.md`; segment demand itself is UNKNOWN, none of it is measured):

| Segment | Needs | Enough today? | Why |
|---|---|---|---|
| 1 High school, 12 Learners in low-resource regions, 13 Homeschool | Concept-level cause and effect, no parts to buy | Yes, inside the catalogue, if copy says "teaching model" | The 38 items were authored with the simulator, behaviour is deterministic and explained. Unvalidated, but the lessons teach well-known behaviour (LED needs a resistor). Risk is false precision (section 3). |
| 8 Teachers, 9 Maker labs | Same, plus grading they can trust | Partly | Checks are client-computed and forgeable (D8). Needs server re-run. |
| 3 CS students entering embedded | Code that transfers to a real board | No for transfer | 7 of 17 realistic sketches fail to compile. Registers, timers, SPI, EEPROM do not exist. Timing is off by about 2 times on Uno. |
| 2 University EE | Transients, op-amps, regulators, correct numbers | No | DC only, no C or L. A university lab will see this in the first week. |
| 4 Makers, 7 Hackathon builders, 10 Advanced | Original projects with real libraries and firmware to flash | No | No netlist, no devices beyond 11 kinds, no compile, no export. |
| 5 Robotics clubs, 6 Drone hobbyists | Tuning, real firmware | No | Point-mass flight, no PID, scripted faults. |

Decision criterion that turns this into a measurable gate: iynk may say "your code will behave the same on the board" for a given board and library only when (a) it runs at T3 for that board and (b) the bench programme passes for that board (section 8). Until then the strongest honest sentence is "teaches how parts behave".

Honest copy today (for the About page, README and Devpost). Based on the audit's own suggestion at `FEATURE_VERIFICATION.md` 349, tightened:

| Do not say | Say instead |
|---|---|
| "failures that really trigger", "behaves like real hardware" | "Simulated failures. Each shows what the model calculated, why, and the fix." |
| "real code running" | "Your code runs in iynk's built-in interpreter, a teaching subset of Arduino C++, MicroPython, Python and Verilog. It is not running on a real chip." |
| "113 mA through a part rated for 20" | "About 100 mA in our model, far past the 20 mA rating." (round it, say model) |
| "38 real items" | "38 catalogue items modelled on real boards, kits and drones." |
| (nothing) | A "What it models" panel per lab: modelled / mocked / not modelled. Example: "Modelled: DC current and voltage for LEDs, resistors, transistors. Mocked: Wi-Fi. Not modelled: timing below 1 ms, capacitors, SPI." |
| (nothing) | "iynk teaches how parts behave. It does not replace a bench, a compiler or a datasheet. Check ratings before you build." |

Words to ban until validated: "accurate", "realistic physics", "exact", "safe to build", "hardware-accurate".

### Q18. Could open-source competitors offer better fidelity?

Yes, and for most axes they already do. Table:

| Axis | iynk today | Better open option | Licence and status | Verdict |
|---|---|---|---|---|
| AVR execution | Interpreted subset, 1 us/statement | avr8js, real hex, cycle-level, ADC, timers, USART, TWI, SPI | MIT, v0.21.1, one dominant maintainer (EXTERNAL `S1`) | They win. Wokwi is built on it. |
| RP2040 | Python subset | rp2040js with stock MicroPython UF2, PIO, DMA | MIT, v1.4.1; README older than code, flash write unclear (`S3`) | They win for Pico. No RP2350. |
| ESP32, STM32, Uno R4 | Interpreter with profile | None open and browser-ready | Espressif QEMU lacks I2C, GPIO matrix, no support (`S9`); Renode has no browser build (`S12`) | Nobody wins. Wokwi is closed here. Do not promise. |
| micro:bit | Python subset | Foundation V2 simulator, real MicroPython | MIT, API unstable (`S17`) | They win. |
| Analog transient | None | ngspice (eecircuit-engine, MIT wrapper, 5.7 MB gzip, RC step 34 ms TESTED) | BSD parts; exclude CIDER and KLU; pin our own build (`S25`, `S26`) | They win. Velxio and others already ship it. |
| Real-time teaching animation | DC only | Falstad CircuitJS1 | GPL-2.0-or-later (`S28`) | Learn the algorithm, clean-room rewrite. Never copy. |
| Mixed MCU plus analog | Pin conventions only | SimulIDE single event queue | AGPL (`S41`) | Learn the architecture only. |
| HDL | 2-state subset | Yosys plus DigitalJS in the browser; Verilator or Icarus on a server | ISC, BSD-2; Verilator LGPL or Artistic-2.0; Icarus GPL-2.0 (`S23`, `S33`, `S34`, `S37`) | They win on language coverage. Not on timing and bitstream for Basys 3 or DE10-Lite. |
| Fault explanation in words | 16 faults, explained, 1 scripted run | Wokwi and Falstad showed no warning for LED without resistor (F11, one run, caveats there) | n/a | iynk wins. Narrow, easy to copy. |
| Determinism and replay | Strong | Not documented by competitors (UNKNOWN) | n/a | iynk may win. |
| Closed-source Wokwi/Tinkercad | n/a | Closed; fidelity UNKNOWN beyond docs | n/a | Treat as the benchmark, not a source. |

Where they do not win: Velxio (AGPL) is the closest competitor and uses QEMU plus ngspice, but a Hacker News thread doubted its timing and flagged compile-before-play confusion (EXTERNAL `embedded-sim.md` Velxio community row). Browser-only analog fidelity is thin everywhere. A well-validated mid-fidelity tool would stand out, but only if the validation exists and is published (HYPOTHESIS).

Conclusion for Q18. If the council's strategy depends on being "more accurate than Wokwi", it fails: Wokwi plus avr8js is ahead on MCU and ngspice-based tools are ahead on analog. If it depends on "more honest and more teachable, with explained failures, on boards nobody emulates well", it can hold.

## 7. Recommended fidelity tier model and where to adopt engines

### Tiers and rules

| Tier | Name | Entry bar | Typical engine | UI badge text |
|---|---|---|---|---|
| T0 | Illustrative | None. Scripted. | Rule tables | "Illustration. Not a calculation." |
| T1 | Educational approximation | Stated limits list, deterministic, fails loudly outside its subset | Current interpreters and DC solver | "Teaching model" |
| T2 | Behavioural | Datasheet-cited parameters, tolerance bands, convergence report, cross-check against an independent engine within stated error | In-house MNA with C and L, checked by ngspice | "Calculated. Within X percent of ngspice" |
| T3 | Firmware-target | Real compiled binary on a CPU and peripheral emulator; SPICE-class analog | avr8js, rp2040js, ngspice | "Runs your compiled firmware" |
| V | Validated | Bench programme passed for that board or circuit family, report published | any | "Measured on hardware: error table" |

Rules (design constraints, HYPOTHESIS that they fit the product; revisit after the first 20 educator calls):
1. A project's displayed tier is the lowest tier among its parts: board execution, circuit, protocols.
2. Failing loudly beats guessing: SPI stub, unsupported constructs and unmodelled parts return a visible "not modelled" state, never a default value.
3. Show ranges where tolerance matters. Single numbers only for exact quantities (a counter value).
4. No positive safety claims. Report modelled limits only.
5. Credentials, leaderboards and teacher grades use only server re-run results at T1 or above (D8). Fidelity tier appears on the credential.
6. Export to PlatformIO or Arduino CLI is offered with a banner at T1 ("this code may not compile as exported") and plainly at T3.
7. Every added engine must accept the project clock (integer ns) and a seed. No wall-clock reads.

### Adopt, learn from, or avoid (licence-checked from `simulation-options.md` section 6; engineering flags, not legal advice)

| Component | Use | Licence | Condition |
|---|---|---|---|
| avr8js | Adopt for Uno, Nano (Tier 3) | MIT | Keep notice. Fork plan because of bus factor of one. |
| rp2040js | Adopt for Pico MicroPython and C (Tier 3) | MIT | Spike S-6 first (flash write, I2C, ADC). |
| wokwi-elements (SVG parts) | Optional | MIT | Check each part's art for brand or look-alike issues. |
| Micro:bit Foundation V2 simulator | Adopt, self-host, pin the build | MIT | API unstable; two-version break test. |
| MicroPython WASM, Pyodide | Python semantics for Pi/ESP32 shim | MIT, MPL-2.0 | Pyodide unmodified (file-level copyleft). |
| ngspice via a pinned own build | Analog oracle and "run accurate analysis" | BSD parts; mixed | Exclude CIDER and KLU; read the COPYING of the exact tag (UNCONFIRMED for v47). |
| eecircuit-engine | Prototype only | MIT wrapper | One author, Docker build of a third-party mirror. Build our own. |
| Yosys (YoWASP), DigitalJS | "Inspect the circuit" for Verilog | ISC, BSD-2 | 80 MB lazy download; check low-bandwidth impact. |
| Verilator | Server-side check/verify, never shipped | LGPL-3.0 or Artistic-2.0 | Choose Artistic-2.0. |
| Rapier | Robotics scenes (outside my remit) | Apache-2.0 | n/a |
| Falstad CircuitJS1 | Learn the algorithm only | GPL-2.0-or-later | Clean-room, textbook MNA. |
| simavr, Unicorn, Xyce, Qucs-S, Icarus | Do not embed | GPL | Icarus acceptable as server-side test oracle only; ask counsel (network use). |
| Velxio, SimulIDE | Do not embed | AGPL | Competitor and architecture reference. |
| arduino-cli | Server-side compile after a licence decision | GPL-3.0 or paid | Open legal question S-10; also the mission conflict on bandwidth and cost. |

Also from the repo rule: third-party code enters the tree only with a recorded licence decision (`simulation-options.md` 0, HackTX rule applies to the hackathon, not after, but the record habit should stay).

### What stays in TypeScript

Keep, and harden: virtual clock, world model, check runner, idle-skip (made safe), Verilog subset for testbench lessons, the DC solver as the instant-feedback layer. They give what avr8js cannot cheaply give. Estimate of the cost of full emulation for a lesson check: 10 simulated seconds of a Uno is 160 million cycles; at the measured 52 to 104 M cycles per second on an M4 Pro (EXTERNAL `S1`, TESTED there, synthetic loop) that is 1.5 to 3 s on a fast laptop, ESTIMATED 10 to 30 s on a device 5 to 10 times slower. The interpreter does the same check in 7 ms (VERIFIED: `uno-r3/blink`). So emulation cannot replace the interpreter for checks or for low-end devices without idle detection or a lower simulated clock. Spike S-1 must measure this (criterion added in section 10).

## 8. Physical validation programme

Principle: oracles first, then instruments. Software oracles cost almost nothing and remove most of the circularity. Instruments are needed only for what no software knows: real pin drivers, real part spread, real failure points.

### V0. Software oracles (weeks 1 to 3, no capex)

| Test | Oracle | Pass criterion (decision rule) |
|---|---|---|
| 20 canonical DC circuits | ngspice, same netlist (spike S-4) | At least 18 of 20 node voltages within 2 percent or 20 mV; the other 2 explained. If more than 5 fail, the solver is T0 for those families and the copy changes. |
| 17+ sketch corpus, grown to the Arduino IDE built-in examples (all) | Compile success in interp vs avr-gcc | Report rate. If below 70 percent of examples that need no external hardware, original-project support must come via a compiler (T3), not interpreter growth. |
| Timing of 10 Uno ops (digitalWrite, analogRead, millis step, delay(1), pulse, Serial at 9600) | avr8js running the same sketches, hex from avr-gcc | Per-op error under 20 percent for T1 timing claims; otherwise remove the timing claims and show "approximate". |
| Python semantics | CPython and MicroPython unix port on a 50-snippet list | Zero silent differences (wrong output without an error). Differences must fail loudly. |
| Verilog subset | Icarus or Verilator on the 10 lessons plus 20 extra snippets | Same cycle-sampled outputs on all in-subset programs. |

### V1. Bench analog (weeks 3 to 5, one EE, about 10 working days)

24 reference circuits, 3 physical builds each (to see part spread), 5 LEDs per colour:
1. LED plus resistor: red, green, blue, white, each at 3 resistor values (12 builds counted as 4 circuits)
2. Resistor divider, pot sweep (2)
3. NPN and Darlington (TIP120) switch driving a resistive load, then a motor with and without flyback (4)
4. TMP36 and thermistor divider into `analogRead` (2)
5. RC charge, RC low-pass of a PWM signal read by `analogRead`, RC debounce (3)
6. Diode clipper, half-wave rectifier (2)
7. Regulator dropout and a 5 V rail sag under motor start (2)
8. Open-drain / pull-up I2C bus rise time at 100 and 400 kHz with 2 and 4 pull-up values (2)
9. Buck stage with a switch, diode, L and C (1, only when the C and L engine exists)
10. 5 V pin into a 3.3 V board input (current into the clamp) (1)
11. Output pin sag curve: voltage against load current from 0 to the datasheet limit, on each board (per board in V2)

Measure: DMM (DC volts and amps), oscilloscope (rise time, ripple, PWM average, RC time constants), bench supply with current limit. Record every part's actual value with the DMM before building. Compare against: nominal sim, sim with tolerance Monte Carlo, ngspice.
Pass criterion for a "Validated" analog badge: measured value falls inside the sim's stated band for at least 90 percent of the 72 builds, and the band is no wider than plus or minus 20 percent. If the band must be wider than that to contain the data, the model is T1 and says so.

### V2. MCU timing (weeks 5 to 7, 1 to 2 weeks)

12 boards (Uno R3, R4, Nano, ESP32 DevKitC, ESP32-S3, NodeMCU, Nucleo, Pico, Pico W / 2 variants, micro:bit, Pi 4 or 5, Basys 3, DE10-Lite where relevant). Logic analyser plus the scope. About 8 tests per board, about 100 measurements:
1. GPIO toggle period in a tight loop
2. `delay(1)` / `sleep_ms(1)` / `delayMicroseconds(100)` error
3. `millis()` drift over 60 s
4. PWM frequency and duty
5. Servo pulse width, `tone` frequency
6. UART frame time at 9600 and 115200
7. I2C transaction time with a known device
8. ADC conversion time and reading of a known voltage
Pass criterion per board for "timing claims allowed": all 8 inside 5 percent on a T3 path, inside 20 percent on a T1 path. Else the board's lessons carry an "approximate timing" note.

### V3. Faults and limits (weeks 7 to 8)

Destructive batch with a current-limited bench supply and a thermal camera or thermocouple: 20 LEDs (5 per colour), 10 NPN/Darlington, 10 diodes, 5 pots, 5 TMP36. Ramp current, log the failure point and time. Output: a distribution per part type. Replace "burns above 2.5 times imax" with the observed band (for example "damage risk from X mA, usual failure Y mA"). Do not destroy MCU pins. Use cheap clone Nanos for the pin sag curve up to datasheet absolute maximum only.

### V4. Flight and thrust (deferred)

Needs a thrust stand and real Blackbox logs. Trigger: a decision to sell tuning or flight training. Not in the first programme.

### Cost and effort (all ESTIMATED; I did not price-check; get three quotes before buying)

| Item | Assumption | ESTIMATED cost (USD) |
|---|---|---|
| Bench DMM (good 4.5 digit class) and a cheap second meter | one of each | 200 to 500 |
| 2-channel scope, 100 MHz class | new entry-level | 350 to 700 |
| Logic analyser, 8 to 16 channels | clone to mid-range | 15 to 200 |
| Bench supply, current-limited | one | 80 to 250 |
| Boards for the 12 boards if not already owned | mid prices; FPGA boards dominate | 400 to 1,500 |
| Parts, breadboards, sacrificial batch | 100 LEDs, 20 NPN, 20 diodes, assorted R and C, motor, regulator | 100 to 250 |
| Thermal camera or thermocouples | optional | 0 to 300 |
| Total capex | | roughly 1,100 to 3,500; plan 2,500 to 5,000 with spares and travel |
| Labour | V0 2 to 3 weeks (software), V1 2, V2 2, V3 1, report 1 | 6 to 8 person-weeks of an EE; V0 can be a software engineer |
| Repeat cost | each new board family or solver change | about 1 week per family |

The existing Basys 3 and Uno kit might already be owned by the founders. UNKNOWN. A university makerspace could lend the scope and meter (cheapest route to test).

Publish results as `docs/validation/<date>/` with raw data, photos, the script and pass or fail, so any teacher can check them. Do not publish a "validated" badge for a board that has not passed.

## 9. What to build first (from my lens)

Order is by value per week. Each item has a reason.

1. Honest copy and a "What it models" panel (2 to 3 days). Reason: cheapest trust protection; stops claims drifting ahead of evidence. Verify with the Claims table in `FEATURE_VERIFICATION.md`.
2. Fail-loud fixes on the existing interpreter (about 1 week): SPI returns an error or a visible "no device" instead of 0, `Pin(99)` rejected, edge-trace truncation warns, memory and output caps (D1), `MemoryError` raised. Reason: today the sim can silently show wrong data, the worst failure for a learning tool.
3. Solver convergence reporting and per-board `PIN_R` from `pinMaxMa` and board data (2 to 3 days). Reason: removes two silent-error sources; also gives data on whether any lesson hits the round cap.
4. V0 software oracles (2 to 3 weeks): ngspice vs DC solver on 20 circuits (S-4), Arduino corpus compile rate, avr8js timing comparison, CPython/MicroPython snippets. Reason: breaks the circular test problem at almost no cost, and its result decides most later spending.
5. Tolerance bands in the DC solver (about 1 week): nominal plus a deterministic seeded spread; show ranges. Reason: false precision is the largest honest-fidelity gap we can close without new engines.
6. Spike S-1 and S-6 (avr8js and rp2040js on the existing lessons, about 1 week), including the check-run time metric. Reason: decides the Tier 3 path; tests the phone/Chromebook speed unknown.
7. Pure, data-driven solver with a netlist input, C and L companion models, MOSFET/PNP/regulator behavioural elements, checked against ngspice (the "replace" the audit recommends; 3 to 5 weeks per `figure-engine.md` plus S-5). Reason: unblocks original projects; the only way to get T2.
8. V1 and V2 bench programme once 4 and 7 exist (about 4 weeks). Reason: validation is only informative after the model stops changing.
9. Server-side check re-run in an isolated process (D8). Reason: any credential or grade based on a forgeable result is worthless; do it before claiming educator-grade trust.

## 10. What not to build yet (with the trigger that would change it)

| Do not build | Why | Trigger to reconsider |
|---|---|---|
| More interpreter language features (classes, templates, pointers, `#ifdef`) | Never reaches real C++; every feature adds a new silent-difference surface. | The V0 corpus shows more than 70 percent of target-segment sketches already compile, and the remaining failures are two or three constructs. |
| Hand-written libraries one by one (DHT, SoftwareSerial, EEPROM...) in `libs.ts` | Scaling debt (`interp.md`). Real libraries come free with a real compiler. | Tier 3 spike fails on cost or bandwidth AND educator interviews name the same three libraries. |
| ESP32, STM32, Uno R4 emulation | No open browser-ready engine. Espressif QEMU lacks GPIO matrix and I2C. Renode has no browser build. | A maintained MIT/BSD browser engine appears, or paid server-side runs are priced and a school pays for them. |
| Bitstream generation or timing closure for Basys 3 / DE10-Lite | nextpnr does not cover Artix-7 or MAX 10 in YoWASP; vendor tools are closed. | Open P&R for Artix-7 in the browser matures (`openXC7` is experimental) and demand is proven. |
| A custom PID-level flight model | Large effort; the audience for tuning is the drone hobbyist segment with unproven demand. | A paying drone-club or school partner needs tuning lessons. |
| Mixed-signal co-simulation with stepping libngspice | 3 to 5 weeks unproven (spike S-3), gain only for ADC/PWM-in-the-loop accuracy. | S-1 passes and a lesson needs analog accuracy better than the in-house engine gives after S-5. |
| A "Validated" badge on anything | No measurements exist. | V1 or V2 passes for that item. |
| Server-side compile (arduino-cli) | Licence question open (S-10), cost per user, and it breaks offline/low-bandwidth use. | Legal clearance in writing, and a measured compile p95 under 3 s warm. |
| Copying or linking Falstad, SimulIDE, Velxio, simavr, Icarus | GPL/AGPL. | Counsel clears a specific separated use, or a commercial licence is bought. |
| LiPo or mains safety simulations | The sim cannot know. A wrong "safe" is a harm. | A certified or expert-reviewed model and a safety review exist. |

## 11. Risks

| # | Risk | Likelihood and impact (qualitative) | Mitigation |
|---|---|---|---|
| R1 | Over-claiming fidelity damages trust once a teacher or EE measures a discrepancy | Likely; high (hardware education lives on trust) | Section 6 copy; tier badges; tolerance bands. |
| R2 | Negative transfer: a learner trusts a "safe" result and damages parts or is hurt | Possible; high | No positive safety claims; ranges; datasheet links on every limit. |
| R3 | Tier 3 needs compile and costs bandwidth, server money or both, against the mission | Likely; high | Keep Tier 1 default and offline; Tier 3 opt-in; measure S-2. |
| R4 | avr8js / rp2040js depend on one maintainer | Possible; medium | MIT: fork; pin versions; budget 1 person-week per quarter to follow upstream. |
| R5 | Emulation too slow on phones and school Chromebooks | Likely on weak devices; medium | S-11 test on a real Chromebook and a three-year-old phone; fast-forward idle loops; lower simulated clock for checks. |
| R6 | ngspice licence mixture or build drift | Possible; medium | Pin tag; remove CIDER and KLU; counsel review. |
| R7 | Validation programme finds the model is worse than assumed | Possible; this is the point | Pre-commit that results change the copy, not just get filed. |
| R8 | Validation done once, then models change | Likely | Re-run V1/V2 in CI-like checklists after any model change; automate the oracle parts (V0). |
| R9 | Forged check results undermine any credential | Certain today (D8); high if credentials launch | Server re-run before issuing anything. |
| R10 | Two simulators disagree (iynk vs ngspice) in front of a learner | Likely during transition | Tier badge shows which engine produced the number. |
| R11 | Engine count grows: five engines to keep deterministic, bundled and tested | Likely; medium | One clock, one seed, one trace format (`RunTrace` already exists); adopt engines behind one adapter. |
| R12 | My own claims: the 2 times timing gap and 9.6 to 13.9 mA range are estimates | Certain; low | Replace with measurements in V0 and V1. |

## 12. Open questions and the cheapest way to answer each

| # | Question | Cheapest answer |
|---|---|---|
| 1 | What is the real per-op timing error on Uno and Pico? | Run 10 sketches in avr8js and rp2040js in Node; no hardware (about 2 days). Hardware later. |
| 2 | What fraction of real beginner sketches compile in the interpreter? | Run `check()` over the Arduino IDE built-in examples (1 day, script already works from `probe.ts`). |
| 3 | Does the DC solver agree with ngspice? | S-4, 2 days, 20 netlists. |
| 4 | Do any shipped lessons hit the 40-round / 6-pass solver cap? | Add a counter, run the 102 lesson runs (half a day). |
| 5 | Does avr8js run a full lesson check fast enough on a Chromebook and phone? | S-1 plus S-11 with a stopwatch on borrowed devices (3 days). |
| 6 | Will the target users accept a compile step or a 55 MB toolchain? | Ask 10 educators and 10 learners in low-bandwidth settings; show the cost. No interviews exist yet (UNKNOWN). Part of `USER_RESEARCH_PLAN.md`. |
| 7 | Can arduino-cli run on our servers commercially without Arduino's licence? | Email Arduino support / counsel (S-10, 1 week elapsed). |
| 8 | Does `world.ts` accept a pin-change callback from an emulator? | One-day spike: wire avr8js GPIO to `World` for Blink. |
| 9 | Is the educator market willing to pay for fidelity transparency? | Show the tier badge mock-up in 10 teacher calls; ask if it changes purchase intent. Cheap and decisive. |
| 10 | Are the Pico, ESP32 and Basys 3 pin resistances and `ilim` set per board? | Read the board files (half a day); V2 measures them. |
| 11 | Do rclpy nodes in one script exchange messages? | 30-minute test; low priority. |
| 12 | Are the real LED burn-out thresholds what the model says? | V3 destructive batch (about USD 100 of parts, 1 week). |

## 13. Self-check

- I did not run any real hardware, browser or phone. All timing figures other than the two scratch probes come from the research files and are labelled by their source.
- The sketch corpus (n = 17) and the tolerance range (9.6 to 13.9 mA) are mine. The corpus is small and hand-written. The range uses the stated assumptions and no measured data.
- Prices in section 8 are my estimates and were not looked up.
- I did not change anything in the repo except this file.
