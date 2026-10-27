# Simulation engines iynk could adopt, embed or learn from

Researcher: simulation-options. Written 2026-10-26. All prices, versions and star counts are "as of 2026-10-26".

## 0. How to read this file

Labels used on every claim: TESTED (I ran it on my machine), EXTERNAL (a cited source states it), ESTIMATED (my calculation, assumptions shown), HYPOTHESIS (my judgement, not proven), UNKNOWN (could not establish).

Test machine for every TESTED number: Apple M4 Pro, macOS, Node v24.8.0, arm64, one run per row unless two runs are shown. Browser speed on a phone or a school Chromebook will be lower. I did not run a browser. Scratch scripts and outputs are in `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/research/sim/` [S43].

Web search was cut off partway (session limit), so some claims rest on official repos, registries and docs fetched directly, not on search. Where a page would not load or did not say, I wrote UNKNOWN.

Licence notes are engineering flags, not legal advice. Anything GPL, AGPL or LGPL needs a lawyer before we ship it.

Extra rule from the repo: HackTX 2026 requires every line of project code to be written inside the hacking window [S44]. That rule ends with the event, but it means we must not paste third-party code into the current tree without a licence check and a recorded decision.

## 1. What iynk has today (the baseline we compare against)

| Piece | What it is | Evidence |
|---|---|---|
| Arduino C++ subset interpreter | TypeScript: parser 921 lines, interpreter 1,353 lines, libraries 1,440 lines | TESTED (`wc -l` in `src/lib/interp/arduino`) [S44] |
| Python / MicroPython subset interpreter | TypeScript: parser 971, runtime 1,361, modules 1,008, micro:bit 520 lines | TESTED [S44] |
| Verilog-subset simulator | TypeScript: `verilog/sim.ts` 1,214 lines | TESTED [S44] |
| Circuit solver | `figures/engine/bench-solve.js`, 431 lines. DC only. Nodes are breadboard strips and rails. Resistors are conductances, sources are Norton equivalents (rail behind 0.5 ohm, pin behind 25 ohm). Every nonlinear part is piecewise linear (diode off or fixed drop, transistor off, active or saturated). Repeats nodal analysis up to 40 rounds. Gaussian elimination with partial pivoting (dense). PWM is solved per time slice and averaged. | TESTED (read `bench-solve.js` lines 1-14) [S44] |
| Circuit model in the product | A named `circuit` string chosen inside a prebuilt figure page. No user netlist. | EXTERNAL (iynk audit `boardlab-robotics-ui.md`) [S44] |

Consequences (HYPOTHESIS, derived from the above): iynk has no capacitor or inductor dynamics, no transient analysis, no real firmware execution (programs run as interpreted source, not compiled machine code), and no way to take a user-drawn netlist. The three things users cannot do today (build an original project) map to three engine gaps: a netlist-driven circuit engine, a way to run user code against that circuit, and a compile path for real boards.

## 2. MCU emulation

### 2.1 Comparison table

| Option | Licence (SPDX) | Maturity as of 2026-10-26 | Browser / WASM | Targets that matter to iynk | Source |
|---|---|---|---|---|---|
| avr8js (Wokwi) | MIT | v0.21.1, 2026-08-31; 852 stars; top contributor Uri Shaked has 322 commits, the next human contributors 3 or fewer; last push 2026-08-31 | Pure TypeScript, runs in browser and Node, no WASM | ATmega328P (Uno, Nano) focus; README says ATmega2560 and ATtiny are possible | EXTERNAL [S1][S2] |
| rp2040js (Wokwi) | MIT | v1.4.1, 2026-10-18; 533 stars; top contributor (same author) 361 commits, next human contributor 19 | Pure TypeScript | RP2040 only (one Cortex-M0+ core in the code). Peripherals in source: ADC, DMA, I2C, PIO, PWM, SPI, UART, USB, timer, RTC, watchdog. Runs MicroPython and CircuitPython UF2. GDB server. No RP2350 | EXTERNAL + TESTED (read file list and `rp2040.ts`) [S3] |
| simavr | GPL-3.0 | tag v1.8 (commit 2026-06-02); 1,795 stars; main author 695 commits | C, Linux oriented. A WASM build exists nowhere I found. UNKNOWN whether it is practical | Many ATmega and ATtiny parts incl. 328, 2560, 85 | EXTERNAL [S7] |
| QEMU upstream | GPL-2.0 | tag v11.1.2; 13,935 stars | Experimental WASM: `ktock/qemu-wasm` (x86_64, aarch64, riscv64 guests; repo says experimental; TCI interpreter upstreamed for 32-bit guests in QEMU 10.1, TCG-to-WASM JIT still under discussion) | See 2.4 to 2.6 | EXTERNAL [S8][S10] |
| Espressif QEMU fork | GPL-2.0 (QEMU) | release `esp-develop-9.2.2-20260417`; 362 stars; Espressif says it gives no support and rebases and force-pushes `esp-develop` | No WASM build found. UNKNOWN | ESP32, ESP32-S3, ESP32-C3 | EXTERNAL [S9] |
| Renode (Antmicro) | MIT (bundled libs have own licences, e.g. tlib LGPL "unless stated otherwise") | v1.17.0, 2026-09-07; 3,068 stars (GitHub API shows licence as NOASSERTION; the repo `LICENSE` file text says MIT, confirmed); 3 main committers 781, 608, 570; company backed | .NET plus native cores. No browser build found. UNKNOWN | nRF52840 DK, STM32 F4/F7/H7/WBA/G0/F103, Arduino Nano 33 BLE, Arduino Uno R4 Minima in repo. I found no RP2040 or ESP32 platform file in the repo tree | EXTERNAL + TESTED (repo tree grep) [S12][S14] |
| Unicorn | GPL-2.0 | 2.1.4, 2025-09-09; 9,494 stars | WASM forks exist (`petabyt/unicorn-wasm`, `elliott-wen/unicorn.wasm`, both GPL-2.0, 1 to 3 stars, last push 2025) | CPU only, no peripherals, no board models | EXTERNAL [S15] |
| micro:bit V2 simulator (Micro:bit Educational Foundation, used by the Python Editor) | MIT | v0.1.14 (release dated 2024-11-25, so the latest release is nearly two years old); 21 stars; last push 2026-10-20 | Yes. It is the MicroPython codal_port compiled with Emscripten, embedded as an iframe | micro:bit V2 MicroPython | EXTERNAL + TESTED [S17] |
| MicroPython WebAssembly port | MIT | v1.29.0, 2026-08-24; 22,157 stars | Yes, official port | Generic MicroPython. The port config has a JS bridge and no `machine` module (a grep for `MICROPY_PY_MACHINE` in `mpconfigport.h` found nothing) | EXTERNAL + TESTED [S18] |
| Pyodide (CPython) | MPL-2.0 | 314.0.7, 2026-09-14; 14,907 stars | Yes | "Python on a Pi" semantics | EXTERNAL [S19] |
| PyScript | Apache-2.0 | 2026.7.3, 2026-07-29; 18,689 stars | Yes (runs on Pyodide or MicroPython WASM) | Wrapper | EXTERNAL [S20] |

### 2.2 avr8js, in detail

- What it is: only the AVR CPU core plus on-chip peripherals. The README says "This library only implements the AVR CPU core. You have to supply it pre-compiled machine code" and that external hardware needs your own functional simulation and glue [S1].
- Peripherals present in `src/peripherals` (TESTED, file listing): ADC, clock, EEPROM, GPIO ports, SPI, timers (incl. ATtiny timer), TWI (I2C), USART, USI, watchdog [S1].
- Who uses it: Wokwi's Arduino simulator ("the heart but not the whole body") [S1].
- Speed (TESTED, 16 MHz AVR cycles simulated per wall second, M4 Pro, Node 24.8, loop of 5 ALU instructions, 160,000,000 cycles per run):

| Setup | Run 1 | Run 2 |
|---|---|---|
| CPU only | 101.7 MHz equivalent (6.4x real time) | 103.6 MHz (6.5x) |
| Timers 0/1/2, USART0, ports B/C/D, ADC attached, timer0 overflow interrupt on | 52.3 MHz (3.3x) | 68.0 MHz (4.3x) |

  Caveat: a tight ALU loop is the easy case. Real sketches mix loads, stores, calls and interrupts. A phone may be 3 to 10 times slower than this laptop (HYPOTHESIS, not measured).
- Wokwi author's own number: the first demo "runs about half speed" on the author's computer (undated blog, 2020 era, date not shown on the page I fetched) [S4]. Treat as history, not current.
- Bundle (TESTED): unminified ESM JS 165 KB, 28.8 KB gzip. npm unpacked size 400,510 bytes [S2].
- Risk: bus factor of one. The top contributor has 322 commits and the next human contributors have 3 or fewer (GitHub contributors API) [S1]. The licence is MIT, so a fork is possible if he stops.
- Fit for iynk: HIGH for Uno, Nano and the "Arduino C++" path. It would run real compiled sketches and give exact timing, interrupts, `millis()`, PWM duty, UART bytes, TWI and SPI. It gives iynk what the TS interpreter cannot: real libraries, real bugs (integer overflow, timing, stack and RAM limits), and any sketch a user pastes.
- Integration cost (ESTIMATED): 2 to 4 person-weeks to run a compiled hex in a worker and bind GPIO, ADC, USART, TWI and tone/PWM to iynk's existing pin/world model; 2 to 3 more for I2C/SPI device models (sensors, LCD, OLED). Assumes a hex is available (see 2.3). Assumption: iynk's `world.ts` pin model can be driven by a pin-change callback. UNKNOWN, needs a spike.

### 2.3 How Wokwi compiles sketches, and compile options for iynk

What Wokwi does (EXTERNAL):
- The avr8js author's blog says a cloud service compiles the source with the Arduino CLI, as "a simple Node.js web service running inside a Dockerfile image on the Google Cloud Run platform" (undated page; this described the original demo, not necessarily today's Wokwi) [S4].
- Current Wokwi docs say library zips are uploaded to "the Wokwi build server" [S5]. Wokwi CI "runs in the cloud" and "is powered by a simulation server" that receives firmware binaries [S5]. So the build is server-side. The exact pipeline today (arduino-cli version, caching) is UNKNOWN.
- The sketch is built to a hex or ELF, and the browser loads that into the emulator. No source needed in the emulator.

Options for iynk:

| Option | What it is | Licence | Evidence and numbers | Integration cost (ESTIMATED) | Risks |
|---|---|---|---|---|---|
| A. Server-side arduino-cli | Our own build service: sketch in, hex out | arduino-cli is GPL-3.0; Arduino sells a commercial licence, required "if you want to modify or otherwise use the software for commercial activities involving the Arduino software without disclosing the source code" [S21]. Running it on our server and not distributing it to users is a different case from shipping it, but get advice | Latest v1.5.1 (2026-06-05), 5,075 stars [S21] | 2 to 3 weeks incl. sandbox, queue, caching of core and libraries | Untrusted code compiled on our hardware (needs containers, timeouts, memory caps, no network). Cost scales with users. Availability becomes a product dependency |
| B. avr-gcc compiled to WASM, in the browser | `horang-corp/avr-gcc-wasm`: `cc1plus.wasm`, `avr-as.wasm`, `avr-ld.wasm`, `avr-objcopy.wasm` in a module Worker, producing Intel HEX | No licence file in the repo (GitHub reports none); the README points to `THIRD_PARTY_NOTICES.md` and says to read it before public or commercial distribution, so not reusable as is until that is reviewed. GCC itself is GPL-3.0 with a runtime exception. UNKNOWN for the generated Arduino core objects (LGPL-2.1 in upstream Arduino AVR core, not verified) | The repo's own table, measured in Chrome by its author: 0.62 to 1.09 s wall time for 23,914 to 37,878 byte firmware. Tools 16 to 17 MB, prebuilt Arduino objects about 38 MB. `cc1plus.wasm` 14 MB. 3 stars, last push 2026-05-29, proof of concept [S22] | Proof of concept exists, so 3 to 6 weeks to make a product-grade version: build our own WASM toolchain, handle libraries, errors, caching in IndexedDB | GPL toolchain shipped to users, so we must offer source. 55 MB first download (cache after). Memory on phones. Single-author PoC |
| C. Do not compile: keep the interpreter | Today's path | Own code | Works offline, tiny, deterministic | 0 | Cannot run real libraries or unusual code |
| D. clang/LLD in WASM (YoWASP) | `@yowasp/clang` npm 22.0.0-git20542-10 (2026-03-12), ISC wrapper, 105 MB unpacked, `llvm.core.wasm` 75.5 MB | LLVM Apache-2.0 with LLVM exceptions | The README says it targets WebAssembly only ("targeting WebAssembly as well"), so it cannot emit AVR or ARM firmware as shipped [S46] | n/a for MCUs | Useful only for compiling Yosys CXXRTL output (see 4) |

HYPOTHESIS: for a school-scale product, option A with aggressive caching (hash of sketch plus libs) and an in-browser interpreter as offline fallback is the lowest-risk path. Option B is a later optimisation if server cost or latency hurts.

ESP32, STM32 and Pico firmware (C/C++ with ESP-IDF or Pico SDK) has no known browser compile path (UNKNOWN; I found none). MicroPython needs no compile step on these boards, which is a reason to prefer MicroPython for original projects on non-AVR boards.

### 2.4 rp2040js, in detail

- Peripherals in source: ADC, bus control, clocks, DMA, I2C, IO, pads, PIO, PLL, PWM, reset, RTC, SPI, SSI, timer, UART, USB, watchdog, XOSC (TESTED, file list) [S3]. The README I fetched still says only UART0 is documented and that the MicroPython filesystem is read-only because SSI flash writes are not implemented [S3]; the README is older than the code, so check behaviour in a spike.
- Speed (TESTED, M4 Pro, Node 24.8): 50,000,000 Thumb instructions in an SRAM loop (`adds r0,#1; b .-2`) took 0.38 s, 131 MIPS. The real RP2040 at 125 MHz runs about one instruction per cycle, so this core ran roughly at real time on this laptop with no peripherals attached. Many fewer MIPS expected with PIO and DMA active, and on phones. UNKNOWN for browsers.
- Bundle (TESTED): unminified ESM JS 354 KB, 62.6 KB gzip.
- Fit: HIGH for Pico lessons that run MicroPython UF2 (the stock UF2 plus a LittleFS image). It is the only open, browser-ready engine for a real ARM Cortex-M board in this survey. Not enough for Pico 2 (RP2350) or Pico W Wi-Fi (UNKNOWN).
- Integration (ESTIMATED): 3 to 5 weeks (UF2 loading, ROM boot, filesystem image so user files persist, UART to the serial panel, GPIO/ADC/I2C binding). The same engineer can reuse the avr8js binding layer.
- Risk: single maintainer (361 commits), plus an unfinished SSI flash write path (README) [S3].

### 2.5 ESP32 (Espressif QEMU, Wokwi, others)

- Espressif QEMU supports ESP32, ESP32-S3, ESP32-C3. Per Espressif's own table the fork does not emulate Wi-Fi, Bluetooth, USB, RMT, general-purpose SPI, I2C, I2S, ULP, or the GPIO matrix / IOMUX. It emulates UART, interrupt matrix, flash, eFuse, RNG, crypto, timer groups, TWAI, GDMA, and an Ethernet device for networking. LEDC only on ESP32 [S9].
- Espressif says it provides no support for the fork and that `esp-develop` is rebased and force-pushed [S9].
- Fit for iynk: LOW. Without GPIO matrix and I2C the main teaching cases (blink, read a sensor) cannot be shown as they would on real hardware. QEMU is GPL-2.0 [S8], and a server-side runner would also cost money per session. No WASM build was found [S9][S10].
- Wokwi simulates ESP32, S2, S3, C3, C5 (beta), C6, C61, H2, P4 (beta), S31 (beta) [S5][S6]. The same page lists Raspberry Pi Pico, Pico W, Pico 2 and Pico 2 W (no beta flag), which matters because the Pico 2 is a gap in rp2040js [S6]. Bluetooth is not implemented, I2S partial, I2C master only, and by default the simulated CPU is capped at about 8 MHz "to achieve a higher simulation speed" while peripheral timing is not affected [S5]. Wokwi does not state its engine or whether it is open; the only open Wokwi engines are avr8js, rp2040js and esp8266js (MIT, last push 2023-06-18) [S3][S5]. Not reusable.
- Practical path (HYPOTHESIS): keep ESP32 as MicroPython-style behaviour on top of the same TS or MicroPython-WASM layer, with honest labels about which hardware features (Wi-Fi, BLE, touch, hall) are modelled. The MicroPython WASM port has a JS bridge, so Wi-Fi style APIs could be mocked [S18].

### 2.6 STM32, micro:bit, Raspberry Pi

| Target | Options found | Facts | Fit |
|---|---|---|---|
| STM32 Nucleo | Renode (MIT), QEMU (GPL-2.0), Wokwi (closed; STM32C031, L031, F103C8 only [S6]), QEMU-WASM Pebble port | QEMU's STM32 page lists STM32F100, F205, F405 and L475 SoCs with ADC, EXTI, USART, SPI, SYSCFG, timers. It lists DMA, USB OTG, CAN, DAC, I2C, GPIO, RTC and others as not supported [S16]. Renode has Nucleo F767ZI, H753ZI, WBA52CG and STM32F4 Discovery platforms [S12]. `ericmigi/pebble-qemu-wasm` ports about 8,500 lines of STM32F4 device models (RCC, GPIO, DMA, SPI, I2C, UART, timers, RTC, EXTI, flash, ADC) to QEMU 10.1 and runs in the browser on the TCI interpreter; 71 stars, no licence field [S11] | LOW to MEDIUM. Browser proof exists (Pebble) but is a custom board, and licence of that repo is unclear. Best path for iynk is server-side Renode or keep TS "HAL-level" interpretation |
| micro:bit | Micro:bit Foundation V2 simulator (MIT), QEMU `microbit` (nRF51822 only), Renode nRF52840 | The Foundation simulator is MicroPython codal_port compiled with Emscripten, shown in an iframe with a `postMessage` API; README says the embedding API and URLs "are not yet stable" and asks embedders to get in touch. It does not provide a serial terminal or sensor UI itself. Files I measured: `firmware.wasm` 1,245,615 bytes (543,965 gzip), `firmware.js` 107,189, `simulator.js` 141,274 [S17]. QEMU's `microbit` is nRF51822, Cortex-M0, without I2C, SPI, ADC, radio, RTC, watchdog [S16]. The Python Editor v3 loads the simulator from `python-simulator.usermbit.org` in an iframe and sends messages `flash`, `config`, `serial_input`, `set_value`, `stop`, `reset` [S17] | HIGH for micro:bit Python lessons. It is not CPU emulation of the nRF52833; it is the real MicroPython runtime on a simulated board layer, which is what a learner needs. Self-host the build to avoid depending on a third party host |
| Raspberry Pi (Python) | Pyodide (MPL-2.0), MicroPython WASM, PyScript, QEMU raspi boards | Pyodide 314.0.7: `pyodide.asm.wasm` 9,598,218 bytes (3,528,806 gzip), `python_stdlib.zip` 2,545,637 bytes (TESTED from jsDelivr CDN) [S19]. MicroPython WASM `micropython.wasm` 449,553 bytes (197,291 gzip) plus `micropython.mjs` 110,120 [S18]. QEMU documents GPIO, I2C, SPI, USB host as implemented for Raspberry Pi boards and PWM as missing [S16], but QEMU-WASM aarch64 is experimental and a whole Linux guest is heavy [S10] | For "Python on a Pi" (GPIO Zero style scripts), HYPOTHESIS: run real CPython in Pyodide with a fake `RPi.GPIO` / `gpiozero` module bound to the board model. 12 MB first load, cached. Much more faithful to Python than iynk's own subset interpreter. Not a Pi emulator |

### 2.7 Unicorn and "emulate any CPU in WASM"

Unicorn is a CPU emulator only (no devices, no interrupt controller). GPL-2.0 [S15]. The WASM forks are tiny and stale. Verdict: not useful for iynk (HYPOTHESIS).

## 3. Circuit simulation

### 3.1 Comparison table

| Option | Licence | Maturity | Browser / WASM | Fit |
|---|---|---|---|---|
| ngspice | Mixed. The repo `COPYING` says the original Berkeley code is under the modified BSD licence and that "Ngspice branch as a whole will not be covered by a specific license": each piece keeps its original contributor's licence. That file's header still reads "Ngspice 26 ... 2014", so it is old text; check the COPYING of the exact tag we build (UNCONFIRMED for v47). Per the project notes: tclspice and numparam are LGPL-2.0; XSPICE is public domain; CIDER has an older BSD-style "research software agreement" whose text says the recipient agrees not to charge for the UC code itself (it may charge for additions and support) [S25] | Manual says "Version 47+"; SourceForge `ng-spice-rework/47/ngspice-47_64.7z` file dated 2026-08-11 (release date itself not stated) [S25]. GitHub mirror `ngspice/ngspice` last push 2024-06-09, so SourceForge git is the live repo | Yes via Emscripten: EEcircuit engine (below), `wokwi/ngspice-wasm` (MIT build wrapper, 10 stars, last push 2022-11-01, Docker + Linux build, "based on EEsim") [S27] | HIGH as a reference "truth" engine |
| eecircuit-engine (EEcircuit) | MIT wrapper (package license MIT); embeds ngspice (BSD) | v1.9.0 published 2026-10-25; 16 stars; one author (104 commits); EEcircuit app 187 stars, last push 2026-10-06 [S26] | npm package, runs in browser and Node | HIGH to evaluate; but see build limits below |
| Falstad CircuitJS1 | GPL-2.0-or-later ("version 2 ... or (at your option) any later version") [S28] | `pfalstad/circuitjs1` 2,438 stars, last push 2026-10-25; the older `sharpie7/circuitjs1` 2,983 stars last push 2024-01-22. The current tree has a TypeScript/Vite port (`ts/CirSim.ts`, `ts/SimulationManager.ts`, sparse LU in `ts/matrix/`) | Native browser TS | Learn from, do not link (GPL) |
| Xyce | GPL-3.0 | Release-7.10.0, 2025-07-21; 185 stars; Sandia, built on Trilinos [S29] | No WASM found. UNKNOWN | Not suitable (GPL, heavy) |
| Qucs-S | GPL-2.0 | 26.1.1, 2026-04-26; 1,426 stars [S30] | Desktop Qt app. It drives ngspice, Xyce or Qucsator as backends | Not an engine. Skip |
| SPICE OPUS | Not established (licence page not readable in my fetch); site says free download for Windows and Linux, Berkeley SPICE plus XSPICE, copyright footer 2008 [S31] | UNKNOWN | No | Skip |
| KLU matrix solver (inside ngspice optional) | LGPL-2.1+ (SPDX line in `KLU/Doc/License.txt`) [S32] | SuiteSparse repo 1,560 stars | Not in the EEcircuit build | Do not enable for a proprietary build without review |

### 3.2 ngspice in the browser: what the evidence says

- Build used by EEcircuit-engine (EXTERNAL, build scripts): `emconfigure ../configure --disable-debug --disable-openmp --disable-xspice --disable-osdi --without-x`, linked with ASYNCIFY and `-s ALLOW_MEMORY_GROWTH=1`, compiled from the latest `ngspice-X.Y` tag. The program is run as a `main()` with a virtual filesystem, with a patch that yields to the browser (`eesim_sleep_hack`) [S26]. Consequences (HYPOTHESIS, from those flags): no XSPICE event-driven digital models, no OpenMP threads, no shared-library stepping API in this build. If we want to halt, change a parameter and resume (what a co-simulation needs), we must build our own libngspice WASM, which the ngspice shared-library page says supports halting and resuming [S25].
- Size (TESTED): `eecircuit-engine.mjs` is 20,346,804 bytes, 5,680,154 bytes gzip (the WASM is inlined). npm unpacked is 43 MB because of model cards. Library of PDK models sits in separate files (`dist/models/*`, largest 1.3 MB .d.ts) [S26].
- Speed (TESTED, Node 24.8, M4 Pro, `eecircuit-engine@1.9.0`, one run each, default Sparse 1.3 solver):

| Case | Wall time | Output points |
|---|---|---|
| Engine start (WASM instantiate) | 349 ms | n/a |
| RC step response, `.tran 10u 20m` | 34 ms | 2,087 |
| Half-wave rectifier with diode model, `.tran 20u 100m` | 23 ms | 5,008 |
| Switch + diode + LC buck stage, `.tran 0.1u 2m`, 10 us switching period | 159 ms | 28,208 |

  These are small circuits. Larger nonlinear circuits will take longer, and phones are slower (HYPOTHESIS). The repo also ships its own benchmark script (`test/benchmark-opamp.ts`) with no recorded result [S26].
- Numerical defaults (EXTERNAL, ngspice manual v47+): integration `METHOD` is trapezoidal by default, `Gear` optional with order 2 to 6, and MAXORD=1 with trapezoidal gives backward Euler. Newton-Raphson is the nonlinear solver: converge when branch currents are within 0.1 percent or 1 pA and node voltages within 0.1 percent or 1 uV. Transient iteration limits: ITL4 = 10 per time point, ITL5 = 5000 total. Matrix solvers are Sparse 1.3 (default, robust, good for behavioural models) and KLU (faster for large MOS circuits, not compatible with noise or CIDER) [S25].
- Licence flow for a closed product: BSD-3 allows embedding if we keep the notice and do not use the authors' names to promote. The build must exclude CIDER (old BSD text with a no-charge clause) and KLU (LGPL) unless reviewed. EEcircuit's build disables XSPICE, which is public domain anyway [S25][S26].
- Risk: ngspice's GitHub mirror is stale (2024) [S25]; the build pipeline of eecircuit-engine is one person's Docker job that clones a third-party mirror (`danchitnis/ngspice-sf-mirror`) [S26]. We would want our own pinned build.
- What it gives iynk over its own solver: real C and L dynamics, AC and transient, proper diode/BJT/MOSFET models, op-amp and switching converters (buck converter lesson), waveform output for scope views, a netlist format users can export and import, and a result that can be checked against textbooks.
- What it costs: 5.7 MB gzip lazy download, 349 ms start, batch (whole-run) execution unless we build the shared library, and a netlist step in the UI. Real-time knob turning needs a fast path: either re-run small `.tran` windows or keep iynk's DC solver for instant feedback and call ngspice for "Run analysis" (HYPOTHESIS).
- Integration (ESTIMATED): 2 to 3 weeks to add a netlist generator from a user schematic, a worker wrapper, and waveform plotting with the existing figure layer; 3 to 5 additional weeks for a stepping libngspice WASM build for co-simulation (needs verification, see spike S3).

### 3.3 Falstad CircuitJS1: what we can learn without copying

Read from `ts/SimulationManager.ts` (TESTED, source read) [S28]:
- Matrix: modified nodal analysis arrays, stamping functions (`stampResistor`, `stampMatrixNV`, `stampRightSideVS`).
- Linear circuits are LU-factored once at analyse time; nonlinear circuits restore the saved matrix and iterate each time point (`circuitNonLinear`, subiterations).
- Dense LU below 150 unknowns, sparse LU at or above it (`SPARSE_THRESHOLD = 150`).
- Timestep has a maximum and a reduced value used "because of trouble converging" (`adjustTimeStep`, `minTimeStep`).
- Capacitor element: `isTrapezoidal()` is true unless a backward-Euler flag is set; each step stamps a companion resistance plus a current source (`compResistance`, `curSourceValue`).

Why this matters: it is a classic engine with a fixed maximum step that is simple, fast, easy to animate and good enough for teaching. It is the right shape for iynk's real-time pane. Licence is GPL-2.0-or-later, so any code taken would force the combined work under the GPL when distributed. A clean-room reimplementation from the algorithm (public textbooks) avoids that; copying or translating the TS is not clean (HYPOTHESIS, get advice).

### 3.4 Numerical methods: what each buys and costs in a browser

Source for settings: ngspice manual and Falstad source above [S25][S28]. The explanations of what the methods do are textbook knowledge, not from a fetched source, so treat the cost columns as HYPOTHESIS unless marked.

| Method | What it is | Buys | Costs in a browser |
|---|---|---|---|
| Modified nodal analysis (MNA) | One linear system G x = b over node voltages and source currents. Every element "stamps" into G and b | Handles any netlist topology, voltage sources, controlled sources; Falstad and ngspice both use it [S25][S28] | Matrix size n squared dense. At 150 unknowns dense is still fine (Falstad switch point). Sparse LU needed beyond that |
| Companion models for C and L | Replace C or L by a resistor plus current source that depends on the last time step and the integration rule | Turns a differential equation into the same linear solve each step | Needs a fixed or controlled step. Step too large gives wrong ringing or numerical damping |
| Backward Euler | First order, always stable, damps oscillation | Robust for switching circuits | Numerical damping makes LC oscillations decay when they should not |
| Trapezoidal (ngspice default; Falstad default) | Second order | Good accuracy at larger steps, no artificial damping | Can ring (numerical oscillation) after a switch event. ngspice has `XMU` damping (default 0.5) for this [S25] |
| Gear order 2 to 6 | Multi-step, variable order | Stiff circuits | More history state; ngspice allows it but default is trap [S25] |
| Newton-Raphson | Linearise nonlinear devices each iteration, re-solve | Handles diodes, BJTs, MOSFETs accurately | Cost = iterations x matrix solve. ngspice caps at ITL4=10 per point; failure triggers smaller time step [S25]. Needs limiting (voltage clamps) to converge |
| Piecewise-linear nonlinear devices (what iynk does today) | Fixed on/off models, small iteration loop | Always converges fast, easy to explain to learners [S44] | Not accurate near threshold; no capacitive effects |
| Adaptive time step (ngspice) vs fixed (Falstad) | Local truncation error control vs constant dt | Adaptive: accuracy and speed over long runs. Fixed: predictable cost per frame, simple pausing and scrubbing | Adaptive makes frame-locked animation awkward (needs interpolation). Fixed can miss fast events |

## 4. HDL (for Basys 3 and DE10-Lite style teaching)

| Option | Licence | Maturity | Browser / WASM | What it gives | Fit |
|---|---|---|---|---|---|
| Verilator | LGPL-3.0-only OR Artistic-2.0 (SPDX line in README) [S33] | v5.052 tag, commit 2026-09-05; 4,034 stars; main author 6,798 commits | Not a browser tool. It generates C++ that must then be compiled. Forks `wavedrom/verilator-wasm` (MIT, 0 stars) and `Edge-Tools/verilator-wasm` exist; maturity UNKNOWN [S33] | Fast cycle-based simulation of synthesizable RTL (2-state) | Server-side only, or not at all |
| Icarus Verilog | GPL-2.0 (COPYING) [S34] | v13_0, 2026-03-02; 3,695 stars | No WASM build found. UNKNOWN | Event-driven, full Verilog testbench semantics with delays and `$display` | Server-side only; GPL |
| Yosys via YoWASP | ISC [S23][S35] | Yosys v0.70 (2026-10-13), 4,847 stars; YoWASP `@yowasp/yosys` 0.71.188-dev.1267 published 2026-10-22; unpacked 79.8 MB; Python wheel 16.6 MB. The `YoWASP/yosys` GitHub repo is archived (last push 2026-03-10, checked via API); other YoWASP GitHub repos were not checked. yowasp.org links its package repos and issue tracker to Codeberg but does not itself say the project moved. `codeberg.org/YoWASP/yosys` latest commit is 2026-10-27T00:01Z (UTC; late 2026-10-26 in US time zones) [S23] | Yes, ES modules from jsDelivr: `import { runYosys } from '@yowasp/yosys'`. yowasp.org says Yosys WASM is "about half the speed of a native build" [S23] | Real Verilog/SystemVerilog frontends (with plugins), synthesis, netlist JSON, `write_cxxrtl` backend | HIGH as the Verilog parser and elaborator behind a "real" HDL path |
| nextpnr via YoWASP | ISC [S36] | 0.11.1 (2026-08-11) upstream; YoWASP packages iCE40, ECP5, MachXO2, Nexus, Gowin, GateMate; npm unpacked `nextpnr-ice40` 235 MB, `nextpnr-ecp5` 175 MB [S23][S36] | Yes | Place and route and bitstream for Lattice, Gowin, etc. | Does not cover iynk's boards. Basys 3 is Artix-7 and DE10-Lite is MAX 10. nextpnr lists Xilinx 7-series as experimental and Cyclone V via Mistral as experimental, and does not list MAX 10 [S36]. `openXC7/nextpnr-xilinx` (ISC, 71 stars, last push 2026-09-25) exists but is not in YoWASP's list [S23][S36]. So P&R in the browser for these two boards is not available (HYPOTHESIS: ship simulation and synthesis only, treat "program the board" as a visual step) |
| Yosys CXXRTL backend | ISC | Directory `backends/cxxrtl` with a `runtime` folder in Yosys [S35] | Output is C++; to run it in a browser you need a C++ to WASM compiler. `@yowasp/clang` only targets WASM and is 105 MB [S46], so the compile step must be server-side or a separate Emscripten toolchain in CI | Fast compiled simulation of synthesized designs | Possible via server, not browser |
| DigitalJS (+ `yosys2digitaljs`) | BSD-2-Clause [S37] | digitaljs 0.14.2, 2026-02-10; 785 stars; `yosys2digitaljs` 62 stars; online demo `digitaljs_online` 155 stars. npm unpacked 14.6 MB | Yes; pure JS simulator that reads Yosys netlists, designed as a teaching tool (a CSERC '19 paper describes it) [S37] | Visual, interactive circuit diagram and simulation from Verilog | HIGH for teaching. The Yosys WASM + DigitalJS chain runs entirely in a browser. Subset limits (no full delays, limited testbench) are UNKNOWN until tested |
| CIRCT / Arcilator | Apache-2.0 with LLVM exceptions [S38] | `llvm/circt` 2,268 stars; `firtool-1.162.0` 2026-10-15 | Arcilator compiles Arc IR "to a binary object via LLVM"; no WASM build found. UNKNOWN [S38] | Fast RTL simulation research tool | Skip for now |
| EDA Playground | Hosted service | Verilator v5.044 and Icarus Verilog 12.0 plus commercial tools; login required to run (page: "to run your code, you'll need to sign or log in"; Google login covers non-commercial tools; commercial simulators need a registered, pre-approved account). The earlier claim that registration is free was not confirmed on the page. Where it runs is not stated. Tools list also shows Yosys 0.37, GHDL 5.1.1 [S39] | Not embeddable | Learn from UX | Not an engine |
| Makerchip | Hosted service | Supports TL-Verilog; "free and instant access"; simulator name and login need not stated on the page [S40] | Browser UI, backend unspecified | Learn from UX | Not an engine |

What iynk gets over its own Verilog subset simulator (1,214 lines) [S44]: full Verilog/SystemVerilog parsing and elaboration (Yosys), real gate-level netlists, generated schematics (DigitalJS), and a path from user HDL to a visual simulation. Cost: WASM of 80 MB class for Yosys (lazy, cached), and netlist-based simulation hides timing and `initial`/delay behaviour. HYPOTHESIS: keep the TS simulator for timing-style testbenches and add Yosys + DigitalJS as an "inspect the circuit" mode.

## 5. Mixed-signal co-simulation: how others couple MCU and analog

| System | Evidence | Pattern |
|---|---|---|
| Wokwi | Docs say "Wokwi is a digital simulator with basic analog support, so there is currently very limited analog simulation"; ADC reference is fixed at 5 V for all virtual ADCs; chips use a virtual-time API (`get_sim_nanos`, timers in microseconds or nanoseconds) [S5] | Digital, event-driven with virtual time. Analog parts are functional models (potentiometer, NTC, LDR) that supply a voltage to `pin_adc_read`. No coupled solver. EXTERNAL |
| SimulIDE | Source of `simulator.cpp`, `circmatrix.h` (AGPL-3.0) [S41]: step size 1e6 ps, a time-ordered event list, after each timestamp it calls `solveCircuit()`; solve loop runs matrix solve only if nodes changed, then loops Newton-Raphson on nonlinear elements up to `m_maxNlstp = 100000`, then notifies elements of voltage changes. MCU cores are inside the app (`src/microsim/cores/avr`). Matrix is stored per group with an LU factor and only re-factored when admittance changes (`m_admitChanged`) | Single event queue in picoseconds drives MCU, digital and analog together. Analog is re-solved when something changes. EXTERNAL (source read) |
| Proteus VSM | Labcenter's page: firmware is "co-simulated within a mixed-mode SPICE circuit simulation, including MCU peripherals"; I/O ports and peripherals are "fully modelled down to waveform level" [S42] | Mixed-mode SPICE with MCU models as digital sources. Internals closed. EXTERNAL |
| ngspice / XSPICE | Manual: the algorithm splits the circuit into analog and event-driven parts; each block is iterated to solution with the interfaces iterated "for consistency across the entire system". `dac_bridge` / `adc_bridge` convert between domains; `MAXEVTITER` limits event iterations [S25] | Analog time step plus event queue with bridge devices. EEcircuit build disables XSPICE [S26] |
| Renode | Docs: virtual time flows from time sources to sinks in a "quantum"; after each grant, all sinks finish before the next grant; communication between nodes happens in the synchronisation phase [S13] | Quantum-based lockstep. The page does not claim determinism by name |
| Pebble QEMU-WASM | Uses `-icount shift=auto` and a virtual clock for display timing [S11] | Instruction-count virtual time. Shows browser QEMU can be time-driven rather than wall-clock driven |

Event-driven versus time-stepped (HYPOTHESIS, from the patterns above): MCU and digital logic fit event-driven simulation because nothing changes between edges. Analog dynamics fit time-stepped integration because nodes drift continuously. The working compromise in SimulIDE is one master event queue where analog is re-solved at each event time and at a fixed step size; the compromise in ngspice is analog time steps with an event queue for digital parts [S25][S41].

A deterministic scheduling pattern for iynk (HYPOTHESIS, to be proved by spike S3):
1. One integer simulation clock in nanoseconds. No wall-clock reads in the engine; wall time only decides how many sim nanoseconds to advance per animation frame.
2. The MCU runs in cycle batches up to the next scheduled event or the next analog step, whichever is earlier. avr8js and rp2040js both expose cycle counters and a clock with scheduled callbacks, so this fits [S1][S3].
3. Pin writes become analog source changes stamped at the event time. ADC reads return the latest solved node voltage.
4. The analog step is fixed (for example 1 us to 10 us) so a replay with the same inputs gives the same bits. Randomness (sensor noise) is seeded by project id.
5. Record inputs (button presses, sensor changes) with sim timestamps, so rooms over the WebSocket relay can replay identically.

## 6. Licence and distribution matrix

| Component | Licence | What we would do | Flag |
|---|---|---|---|
| avr8js, rp2040js, wokwi-elements | MIT | Bundle in the web app | Keep notices |
| Micro:bit V2 simulator, Python Editor v3 | MIT | Self-host built files | MicroPython and CODAL licences must be kept; Python Editor README says the bundled MicroPython binaries are MIT [S17] |
| MicroPython WASM | MIT | Bundle | Fine |
| Pyodide | MPL-2.0 | Bundle unmodified | File-level copyleft: changes to Pyodide's own files must be shared; our app code stays closed |
| PyScript | Apache-2.0 | Optional | Fine |
| ngspice (BSD parts) / eecircuit-engine | BSD-3 / MIT | Bundle | Do not include CIDER or KLU in the closed build without review [S25][S32] |
| Yosys, nextpnr, YoWASP | ISC | Bundle (lazy) | Fine |
| DigitalJS | BSD-2-Clause | Bundle | Fine |
| Falstad CircuitJS1 | GPL-2.0-or-later | Learn from only | Linking or copying makes the distributed web app a derivative that must be GPL (HYPOTHESIS, get advice). A web app delivering JS to the user is distribution |
| simavr, Unicorn, Xyce, Qucs-S, Icarus | GPL-2.0 or GPL-3.0 | Do not embed | Same as above |
| QEMU and Espressif QEMU | GPL-2.0 | Only as a separate server process we run; do not ship to users | Network use is not distribution under GPL-2.0 (HYPOTHESIS: confirm with counsel). AGPL would differ |
| arduino-cli | GPL-3.0 or paid commercial licence from Arduino [S21] | Server-side only, and buy or get written clearance before commercial launch | Arduino states the commercial licence is mandatory for commercial use "without disclosing the source code of your own applications" [S21] |
| Verilator | LGPL-3.0-only OR Artistic-2.0 | Server-side use is simplest. Generated code ownership questions are UNKNOWN | Choose Artistic-2.0 where possible |
| SimulIDE (Arcachofo fork) | AGPL-3.0 (original repo GPL-3.0, last push 2021) [S41] | Learn from architecture only | AGPL over a network would force source release of a hosted modified version |
| Renode | MIT with bundled libraries under their own licences (tlib is LGPL "unless stated otherwise") [S12][S14] | Server-side only | Check each bundled library |

## 7. Ranked shortlists (all HYPOTHESIS)

### MCU emulation
1. avr8js for Uno and Nano with real compiled sketches (MIT, small, proven by Wokwi).
2. rp2040js for Pico with the stock MicroPython UF2 (MIT, only browser ARM option).
3. Micro:bit V2 simulator for micro:bit Python (MIT, already used by the official editor).
4. MicroPython WASM or Pyodide as the Python runtime inside a board shim, for Pi and ESP32 teaching.
5. Keep iynk's TypeScript interpreters as the fast offline path for lessons and as fallback.
6. Defer: Renode (server-side STM32 if demand appears), Espressif QEMU (missing GPIO matrix and I2C), QEMU-WASM STM32 (research only).

### Compile path
1. Server-side arduino-cli (after a licence decision) with caching.
2. Browser avr-gcc WASM later, only if server cost matters, and only after fixing the licence of the shared parts.

### Circuit simulation
1. Keep and grow a small in-house MNA engine (trapezoidal, fixed step, dense LU below ~150 unknowns, Newton for diodes and BJTs) for real-time pages. Design after Falstad's approach, clean-room.
2. ngspice WASM, built by us from a pinned tag without CIDER and KLU, as the "run accurate analysis" engine and the checker for the in-house engine.
3. Skip Xyce, Qucs-S, SPICE OPUS, Falstad code reuse.

### HDL
1. Yosys (YoWASP) plus DigitalJS for visual elaboration in the browser.
2. Keep the TS Verilog-subset simulator for testbench-style lessons.
3. Server-side Verilator or Icarus only if a lesson needs full semantics. Do not promise bitstream generation for Basys 3 or DE10-Lite.

### Mixed signal
1. A single deterministic nanosecond event queue (SimulIDE pattern) joining avr8js or rp2040js to the in-house analog engine.
2. Optional later: stepping libngspice WASM build for exact analog.

## 8. Research spikes (each with a falsifiable question and an exit condition)

| ID | Question | Exit condition (pass / fail) | Effort (ESTIMATED) |
|---|---|---|---|
| S-1 | Can avr8js, driven from a worker, run a hex of the existing Uno Blink, Fade (PWM) and analogRead lessons and match the TS interpreter's pin traces within one PWM period and one serial line? | Pass if the same 3 lessons produce equal serial output and PWM duty within 2 percent, at 3x real time or better on a mid-range phone and a school Chromebook. Fail if below 1x on either | 3 days |
| S-2 | Can we produce the hex fast enough? Compare server arduino-cli (cold and warm cache) with horang's avr-gcc WASM on a clean device. | Pass if p95 click-to-running under 3 s warm and under 8 s cold on a 4G phone. Also record licence blockers. Fail if either path exceeds 15 s cold or has a licence blocker | 3 days |
| S-3 | Does a stepping libngspice WASM (our own build, XSPICE and OpenMP off, KLU off) allow halt-modify-resume at 1 ms sim time slices driven by the MCU event loop? | Pass if a PWM-driven RC filter read by `analogRead` stays within 2 percent of the analytic answer and replays bit-identically across Chrome, Firefox and Safari. Fail if per-slice overhead makes 1 s of sim time take more than 5 s wall | 1 to 2 weeks |
| S-4 | Accuracy of in-house DC solver vs ngspice on 20 canonical circuits (LED+R, divider, BJT switch, diode clipper). | Pass if node voltages agree within 2 percent for 18 of 20 and the 2 failures are explained piecewise-linear errors. Fail if more than 5 disagree | 2 days |
| S-5 | Can an in-house MNA with trapezoidal companion models reproduce RC, RLC and buck converter waveforms to within 1 percent of ngspice at a fixed 1 us step in under 16 ms per animation frame? | Pass on both thresholds on a mid-range phone. Fail if either misses; then default to ngspice for transient | 1 week |
| S-6 | Does rp2040js boot the stock MicroPython UF2 with LittleFS, blink an LED, read ADC, talk to an I2C stub, in the browser at 1x or better? | Pass if all four work and CPU use stays under 60 percent of one core on a Chromebook. Fail if filesystem writes or I2C are missing and need more than 2 weeks to add | 1 week |
| S-7 | Does the micro:bit Foundation simulator, self-hosted and loaded in an iframe, cover the existing micro:bit lessons (buttons, LED matrix, accelerometer, radio, pins) without changes to lesson text? | Pass if at least 90 percent of existing micro:bit lesson checks pass. Fail if the unstable embedding API breaks across 2 versions (pin the build) | 3 days |
| S-8 | Can the YoWASP Yosys plus DigitalJS chain parse and visualise iynk's current Verilog lessons in the browser? | Pass if at least 90 percent of existing Verilog lessons elaborate, first load under 15 s on broadband with the 80 MB cached after, memory under 1 GB. Fail if more than 25 percent need unsupported constructs | 3 days |
| S-9 | Is the Espressif QEMU fork useful server-side for ESP32 blink-class lessons without the GPIO matrix? | Pass if a stock ESP-IDF blink shows a GPIO level change observable from outside QEMU. Fail (and drop) if not | 2 days |
| S-10 | Legal: does using arduino-cli on our own servers for a paid product need the Arduino commercial licence? Does shipping Pyodide (MPL-2.0) unmodified and ngspice (BSD) need anything beyond notices? | Written answer from counsel or from Arduino support. Not an engineering spike; I did not contact anyone | 1 week elapsed |
| S-11 | Phone performance: do the avr8js, rp2040js, ngspice WASM numbers in this file hold on a 3-year-old mid-range Android phone and a school Chromebook? | Record MHz-equivalent for S-1 and S-6 and ngspice times for the 3 netlists in section 3.2. Pass if within 5x of the M4 Pro figures. Fail otherwise (then lower scope) | 2 days |

## 9. Gaps

- ngspice licence of the exact build tag, and the ngspice-47 release date: UNKNOWN (download page gives neither).
- I did not run a browser. All TESTED timings are Node on one laptop.
- Wokwi's current ESP32, STM32 and Pico 2 engines: licence and architecture not stated on the pages read (UNKNOWN).
- Whether iynk's `world.ts` pin model can take a pin-change callback: not checked.
- ngspice-47 release date: only a file date on SourceForge (2026-08-11).
- No WASM builds found for simavr, Espressif QEMU, Icarus Verilog, Xyce, Arcilator. UNKNOWN, not proven absent.
- Renode: I found no RP2040 or ESP32 platform in the repo tree listing, but the listing was a recursive API read with a text filter and Renode may hold them elsewhere.
- SPICE OPUS licence not obtained.
- Web search ran out of budget; later claims rely on direct fetches.
- Falstad default timestep and Wokwi build pipeline today: not confirmed.
- Wokwi docs and blog pages summaries came from a page-summarising fetch tool; quotes were short and checked against the docs repo where possible.

## Sources

All accessed 2026-10-26. "Describes" gives the version or date the source covers.

- S1. https://github.com/wokwi/avr8js - "avr8js" README, `src/peripherals`, contributors; Wokwi (Uri Shaked); describes v0.21.1 (2026-08-31), MIT.
- S2. https://registry.npmjs.org/avr8js and https://registry.npmjs.org/rp2040js - npm registry entries; describes avr8js 0.21.1 (unpacked 400,510 B), rp2040js 1.4.1 (unpacked 853,842 B).
- S3. https://github.com/wokwi/rp2040js (and `src/rp2040.ts`, `src/peripherals`, esp8266js at https://github.com/wokwi/esp8266js) - Wokwi; describes v1.4.1 (2026-10-18), MIT.
- S4. https://blog.wokwi.com/avr8js-simulate-arduino-in-javascript/ - "AVR8js: Simulating Arduino in JavaScript", Wokwi blog; page fetched without a visible date.
- S5. https://github.com/wokwi/wokwi-docs (files `docs/chips-api/analog.md`, `time.md`, `docs/guides/esp32.md`, `docs/wokwi-ci/*`, `docs/guides/libraries.md`) - Wokwi docs source; current main branch on 2026-10-26.
- S6. https://docs.wokwi.com/getting-started/supported-hardware - "Supported Hardware", Wokwi; current page.
- S7. https://github.com/buserror/simavr - simavr README and tags; GPL-3.0, tag v1.8 (2026-06-02).
- S8. https://github.com/qemu/qemu (README, COPYING) - QEMU project; GPL-2.0, tag v11.1.2.
- S9. https://github.com/espressif/qemu and https://github.com/espressif/esp-toolchain-docs/blob/main/qemu/README.md - Espressif; release `esp-develop-9.2.2-20260417`, feature table.
- S10. https://github.com/ktock/qemu-wasm - "QEMU Wasm", K. Tokunaga; pushed 2026-02-06; experimental.
- S11. https://github.com/ericmigi/pebble-qemu-wasm - Pebble emulator in the browser; pushed 2026-08-25; uses QEMU 10.1 TCI.
- S12. https://github.com/renode/renode (README, LICENSE, platform tree) and https://renode.readthedocs.io/en/latest/introduction/supported-boards.html - Antmicro; v1.17.0 (2026-09-07).
- S13. https://renode.readthedocs.io/en/latest/advanced/time_framework.html - Renode "Time framework"; current docs.
- S14. https://github.com/antmicro/tlib (LICENSE) - Antmicro; "LGPL licensed unless stated otherwise".
- S15. https://github.com/unicorn-engine/unicorn, https://github.com/petabyt/unicorn-wasm, https://github.com/elliott-wen/unicorn.wasm - Unicorn 2.1.4 (2025-09-09), GPL-2.0.
- S16. https://www.qemu.org/docs/master/system/arm/nrf.html, `.../stm32.html`, `.../raspi.html`, `.../target-arm.html` - QEMU documentation, master (development) docs on 2026-10-26.
- S17. https://github.com/microbit-foundation/micropython-microbit-v2-simulator (README, v0.1.14), https://github.com/microbit-foundation/python-editor-v3 (v3.1.15, `src/simulator/Simulator.tsx`, `src/device/simulator.ts`), and files measured at https://python-simulator.usermbit.org/v/0.1/ - Micro:bit Educational Foundation; MIT.
- S18. https://github.com/micropython/micropython (v1.29.0, `ports/webassembly`), npm `@micropython/micropython-webassembly-pyscript` 1.29.0-6 (2026-08-24) - MicroPython; MIT.
- S19. https://github.com/pyodide/pyodide and https://cdn.jsdelivr.net/pyodide/v314.0.7/full/ - Pyodide 314.0.7 (2026-09-14), MPL-2.0; file sizes measured.
- S20. https://github.com/pyscript/pyscript - PyScript 2026.7.3 (2026-07-29), Apache-2.0.
- S21. https://github.com/arduino/arduino-cli - Arduino; v1.5.1 (2026-06-05); README "License" section (GPL-3.0 and commercial licence).
- S22. https://github.com/horang-corp/avr-gcc-wasm - README with measured table; pushed 2026-05-29; no licence file.
- S23. https://yowasp.org/ , https://codeberg.org/YoWASP/yosys , https://github.com/YoWASP/yosys (archived), https://registry.npmjs.org/@yowasp/yosys - YoWASP (whitequark); npm 0.71.188-dev.1267 (2026-10-22).
- S25. https://ngspice.sourceforge.io/ (download, shared-library pages), https://ngspice.sourceforge.io/docs/ngspice-manual.pdf (Version 47+ development manual; sections 1.1.2, 1.4, 11.1, 12, 29), https://github.com/ngspice/ngspice (COPYING, mirror last push 2024-06-09), https://sourceforge.net/projects/ngspice/best_release.json - ngspice project.
- S26. https://github.com/eelab-dev/EEcircuit-engine (README, `build-ngspice.sh`, `Docker/run.sh`, `test/benchmark-opamp.ts`), https://github.com/eelab-dev/EEcircuit, npm `eecircuit-engine` 1.9.0 (2026-10-25) - MIT.
- S27. https://github.com/wokwi/ngspice-wasm - Wokwi; MIT; last push 2022-11-01.
- S28. https://github.com/pfalstad/circuitjs1 (README license section, `COPYING.txt`, `ts/SimulationManager.ts`, `ts/CapacitorElm.ts`) - Paul Falstad; last push 2026-10-25; GPL-2.0-or-later.
- S29. https://github.com/Xyce/Xyce - Sandia; Release-7.10.0 (2025-07-21); GPL-3.0.
- S30. https://github.com/ra3xdh/qucs_s - Qucs-S 26.1.1 (2026-04-26); GPL-2.0.
- S31. https://www.spiceopus.si/ - SPICE OPUS; licence terms not readable in my fetch; copyright footer 2008.
- S32. https://github.com/DrTimothyAldenDavis/SuiteSparse (`KLU/Doc/License.txt`) - KLU, LGPL-2.1+.
- S33. https://github.com/verilator/verilator (README SPDX line; tag v5.052), https://github.com/wavedrom/verilator-wasm, https://github.com/Edge-Tools/verilator-wasm.
- S34. https://github.com/steveicarus/iverilog - Icarus Verilog v13_0 (2026-03-02), COPYING GPL-2.0.
- S35. https://github.com/YosysHQ/yosys - v0.70 (2026-10-13), ISC; `backends/cxxrtl`.
- S36. https://github.com/YosysHQ/nextpnr - nextpnr-0.11.1 (2026-08-11), ISC, supported architectures list; https://github.com/openXC7/nextpnr-xilinx.
- S37. https://github.com/tilk/digitaljs (README; 0.14.2, 2026-02-10, BSD-2-Clause), https://github.com/tilk/yosys2digitaljs, https://github.com/tilk/digitaljs_online.
- S38. https://github.com/llvm/circt (LICENSE; `docs/Dialects/Arc.md`) - firtool-1.162.0 (2026-10-15).
- S39. https://www.edaplayground.com/ - EDA Playground, current page.
- S40. https://www.makerchip.com/ - Makerchip, current page.
- S41. https://github.com/Arcachofo/SimulIDE-dev (`src/simulator/simulator.cpp`, `circmatrix.h`; AGPL-3.0), https://simulide.com/p/ , https://github.com/SimulIDE/SimulIDE (GPL-3.0, last push 2021-11-04).
- S42. https://www.labcenter.com/simulation/ - Labcenter Electronics, Proteus VSM page, current.
- S43. My own benchmark scripts and outputs under `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/research/sim/run/` (`bench_avr.mjs`, `bench_rp.mjs`, `bench_spice.mjs`), run 2026-10-26; and byte counts of downloaded artifacts in the same tree.
- S44. iynk repository, local files read 2026-10-26: `/Users/amar/Codes/ak/simlab/figures/engine/bench-solve.js`, `src/lib/interp/**`, `HANDOFF.md`, `docs/MASTER_PLAN/01_AUDIT/inventory/boardlab-robotics-ui.md`.
- S46. https://registry.npmjs.org/@yowasp/clang and the package README (`@yowasp/clang` 22.0.0-git20542-10, 2026-03-12, ISC wrapper over LLVM Apache-2.0 with exceptions); `llvm.core.wasm` 75,532,134 bytes measured.

## Fact-check log (2026-10-26)

Checker: second researcher. Method: re-fetched the cited page, or called the GitHub, npm, Codeberg or SourceForge API directly. All accessed 2026-10-26. Verdicts: confirmed, corrected, unconfirmed. Not re-run: the TESTED benchmark numbers and byte counts (S43), which I cannot reproduce from a source page.

| # | Claim | Verdict | Source checked |
|---|---|---|---|
| 1 | avr8js v0.21.1 (2026-08-31), MIT, 852 stars; 322 commits by top author, next humans 3 (19 more are a bot) | confirmed | GitHub API repos/wokwi/avr8js, contributors; npm registry avr8js 0.21.1 MIT |
| 2 | rp2040js v1.4.1 (2026-10-18), MIT, 533 stars, 361 and 19 commits | confirmed | GitHub API repos/wokwi/rp2040js; npm rp2040js 1.4.1 MIT |
| 3 | arduino-cli v1.5.1 (2026-06-05), 5,075 stars, GPL-3.0, commercial licence mandatory for use "without disclosing the source code of your own applications" | confirmed | https://github.com/arduino/arduino-cli README; GitHub API releases |
| 4 | Wokwi supported chips: ESP32 family with C5, P4, S31 beta; STM32 only C031, L031, F103C8 | confirmed (added: Pico, Pico W, Pico 2, Pico 2 W are supported) | https://docs.wokwi.com/getting-started/supported-hardware |
| 5 | Wokwi ESP32: CPU capped about 8 MHz by default; Bluetooth not implemented; I2S partial; I2C master only | confirmed | wokwi-docs `docs/guides/esp32.md` |
| 6 | Wokwi "digital simulator with basic analog support"; ADC reference fixed 5 V | confirmed | wokwi-docs `docs/chips-api/analog.md` |
| 7 | Espressif QEMU: ESP32, S3, C3; no Wi-Fi, I2C, GP SPI, GPIO matrix; LEDC only ESP32; no support, force-pushed | confirmed | https://github.com/espressif/esp-toolchain-docs/blob/main/qemu/README.md |
| 8 | Espressif QEMU release `esp-develop-9.2.2-20260417`, 362 stars | confirmed | GitHub API repos/espressif/qemu |
| 9 | Renode licence MIT, v1.17.0 (2026-09-07), 3,068 stars | confirmed (GitHub API SPDX shows NOASSERTION; LICENSE text is MIT) | GitHub `renode/renode/LICENSE` |
| 10 | tlib is "LGPL licensed unless stated otherwise" | confirmed | GitHub `antmicro/tlib/LICENSE` |
| 11 | ngspice is "Modified (3-clause) BSD for nearly all code" | corrected: COPYING says no single licence for the whole; each piece keeps its own. The text is old (header "Ngspice 26"). ngspice-47 as latest stable confirmed; its release date is not on the download page (file date 2026-08-11 only) | GitHub `ngspice/ngspice/COPYING`; https://ngspice.sourceforge.io/download.html; sourceforge best_release.json |
| 12 | eecircuit-engine 1.9.0 MIT, 16 stars, one author 104 commits | confirmed | npm registry; GitHub API |
| 13 | Falstad circuitjs1 GPL-2.0-or-later; TS port with `ts/CirSim.ts`, sparse LU in `ts/matrix/`; 2,438 stars; push 2026-10-25 | confirmed | GitHub README License section; contents API |
| 14 | Verilator `LGPL-3.0-only OR Artistic-2.0`, 4,034 stars | confirmed | README.rst SPDX line |
| 15 | QEMU STM32: F100, F205, F405, L475; DMA, USB OTG, CAN, DAC, I2C, GPIO, RTC not supported | confirmed | https://www.qemu.org/docs/master/system/arm/stm32.html |
| 16 | QEMU raspi: GPIO, I2C, SPI implemented; PWM missing | confirmed | https://www.qemu.org/docs/master/system/arm/raspi.html |
| 17 | horang-corp avr-gcc-wasm: 0.62 to 1.09 s for 23,914 to 37,878 bytes; 3 stars; no licence | confirmed (added THIRD_PARTY_NOTICES.md pointer) | https://github.com/horang-corp/avr-gcc-wasm |
| 18 | YoWASP: Yosys WASM "about half the speed of a native build" | confirmed | https://yowasp.org/ |
| 19 | "All YoWASP GitHub repos are archived ... continues on Codeberg" | corrected to what was verified (yosys repo archived; others unchecked; site does not say it moved) | GitHub API repos/YoWASP/yosys; Codeberg API; https://yowasp.org/ |
| 20 | YoWASP yosys npm 0.71.188-dev.1267 (2026-10-22); Yosys v0.70 (2026-10-13) ISC | confirmed | npm registry; GitHub API |
| 21 | nextpnr-0.11.1; Xilinx 7-series and Cyclone V experimental; MAX 10 not listed | confirmed | nextpnr README; GitHub API |
| 22 | micro:bit simulator v0.1.14 MIT, 21 stars | corrected: the v0.1.14 release is dated 2024-11-25 (stale), added | GitHub API |
| 23 | Pyodide 314.0.7 (2026-09-14) MPL-2.0, 14,907 stars; MicroPython v1.29.0 (2026-08-24) 22,157 stars | confirmed (MicroPython SPDX shows NOASSERTION in API; MIT not re-read from LICENSE) | GitHub API |
| 24 | EDA Playground: Verilator 5.044, Icarus 12.0, login required, "registration free" | partly corrected: versions and login confirmed, "registration free" not confirmed | https://www.edaplayground.com/ |
| 25 | Proteus VSM: firmware co-simulated in mixed-mode SPICE, peripherals modelled to waveform level | confirmed (vendor marketing, so EXTERNAL claim by vendor only) | https://www.labcenter.com/simulation/ |
| 26 | SimulIDE-dev AGPL-3.0; original GPL-3.0 last push 2021-11-04 | confirmed | GitHub API |
| 27 | DigitalJS 0.14.2 (2026-02-10) BSD-2-Clause, 785 stars; CSERC '19 paper | confirmed | GitHub API; README |
| 28 | esp8266js MIT, last push 2023-06-18; pebble-qemu-wasm 71 stars, no licence field; icarus v13_0; QEMU v11.1.2 | confirmed | GitHub API |

Counts: 28 claims checked, 4 corrected (11, 19, 22, 24 partly), 0 refuted outright, 0 unreachable. Not checked: SPICE OPUS licence, Xyce, Qucs-S, Unicorn, simavr, CIRCT star counts and dates; Pyodide and MicroPython file sizes; all TESTED benchmarks.

Additional sources used by the fact-check (not in the list above):
- S47. https://github.com/espressif/esp-toolchain-docs/blob/main/qemu/README.md and https://docs.wokwi.com/getting-started/supported-hardware, accessed 2026-10-26.
- S48. https://api.github.com/repos/... (GitHub REST API, metadata for each repo named in the log), accessed 2026-10-26.
- S49. https://registry.npmjs.org/<package>/latest and https://codeberg.org/api/v1/repos/YoWASP/yosys, accessed 2026-10-26.
