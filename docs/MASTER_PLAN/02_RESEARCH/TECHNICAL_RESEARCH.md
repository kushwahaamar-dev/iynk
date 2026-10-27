# Technical research summary: decisions for the architecture phase

Prepared 2026-10-26 for the iynk master plan council (synthesis of three fact-checked dossiers). This is research, not legal advice and not a design. Every recommendation here is a HYPOTHESIS until its spike passes.

## 0. How to read this file

This file summarises three dossiers and does not repeat their detail. Go to them for tables, test setups and fact-check logs.

| Dossier | Path | Checked / corrected | Covers |
|---|---|---|---|
| Simulation options | [tech/simulation-options.md](tech/simulation-options.md) (cited as "sim §n") | 28 / 4 | MCU emulators, compile paths, circuit solvers, HDL, mixed-signal, licences |
| Platform options | [tech/platform-options.md](tech/platform-options.md) (cited as "plat §n") | 20 / 3 | Editor canvas, collaboration, physics, flight, sandboxes, hosting, AI cost |
| Compliance and safety | [tech/compliance-safety.md](tech/compliance-safety.md) (cited as "comp §n") | 19 / 5 | Child and student privacy, EU AI Act, accessibility, procurement, physical safety, export, crypto |

Labels used throughout: TESTED (done hands-on by a dossier author on one Apple M4 Pro laptop, Node 24.8 or headless Chromium 156; no phone, no Chromebook), EXTERNAL (a cited source states it), ESTIMATED (calculation or judgement, assumptions shown), HYPOTHESIS, UNKNOWN. Prices are "as of 2026-10-26", in USD unless stated. Source refs like [S12] point to the "## Sources" list at the end; each entry names the dossier and the dossier's own source id, so you can trace it.

Copies of the benchmark and cost scripts the TESTED figures came from are kept at `/Users/amar/iynk-master-plan-scratch/research/tech-review/` (bench.mjs and bench.html for the editor test, cost.py for the AI cost model, bench_avr.mjs, bench_rp.mjs and bench_spice.mjs for the simulator tests); the originals sit in a session scratch folder that may be cleared. Two limits to keep in mind. First, every TESTED number is from a fast laptop, so phone and school Chromebook performance is UNKNOWN for all of them. Second, effort numbers marked ESTIMATED come either from a dossier author's judgement or from mine; none is a quote or a measurement, and the compliance cost ranges assume a lawyer rate of USD 300 to 500 per hour that no source supports (comp §1.1).

The repo rule from the HackTX 2026 entry (all project code written inside the hacking window) means no third-party code should be pasted into the current tree without a recorded licence decision [S26]. Using a library as a dependency is a different matter; copying its source is not.

## 1. Decision summary

| # | Decision | Provisional recommendation (HYPOTHESIS) | Biggest risk | First spike |
|---|---|---|---|---|
| D1 | MCU execution model per board family | Real emulators where a browser-ready MIT engine exists (avr8js, rp2040js, micro:bit simulator); Pyodide or MicroPython WASM behind a board shim for Pi and ESP32; keep the TypeScript interpreters as offline fallback and for boards with no engine | Phone speed unknown; single-maintainer engines | RS-03, RS-06 |
| D2 | Circuit solver strategy | Keep a small in-house MNA engine for real time pages; ngspice WASM (own pinned build) for "run accurate analysis" and as the checker | Fixed-step accuracy; ngspice build and co-simulation unproven | RS-07, RS-08 |
| D3 | HDL path | Yosys (YoWASP) plus DigitalJS for an "inspect the circuit" mode; keep the TS Verilog simulator for testbench lessons; no bitstream promise | 80 MB class downloads; subset limits unknown | RS-12 |
| D4 | Editor rendering | SVG in React with a thin custom editor core (xyflow only if its handles fit) | Phone and Chromebook frame rate unknown | RS-01 |
| D5 | Collaboration model | Server-ordered op log on the existing relay, Postgres for log and snapshots; Yjs only if offline multi-user merge becomes a requirement | Reconnect and invalid-edit handling | RS-09 |
| D6 | Physics and robotics engine | Rapier (Apache-2.0) for the visual robotics scenes; simulate the ROS 2 graph in TypeScript for the free tier | WASM size and cross-browser determinism | RS-13 |
| D7 | Flight model | Own 6-DoF multirotor model in a Web Worker; PX4 SIH in a Fly Machine only as a later opt-in mode | Fidelity versus real firmware unknown | RS-14 |
| D8 | Extension sandbox | v1 custom parts as data files with no code; if code is allowed, opaque-origin iframe plus Worker plus capability API | Extension code is a large attack surface | RS-15 |
| D9 | Server compile isolation | Managed microVM sandbox (E2B or Vercel Sandbox) with a hash cache, after the arduino-cli licence decision | arduino-cli licence; abuse control; real compile time unmeasured | RS-04, RS-05 |
| D10 | Hosting | Keep Vercel (Pro, not Hobby) for the app; add Fly Machines or a Cloudflare Durable Object for rooms; Neon for Postgres; R2 for objects | Vercel WebSocket 800 s cap; Hobby is non-commercial | RS-10 |
| D11 | AI provider strategy and cost | Provider-neutral layer; tiered routing (small model for most turns, stronger for hard ones) with prompt caching; clear provider terms for minors first | Gemini terms bar apps likely to be used by under-18s; Meta terms unread | RS-02, RS-11 |
| D12 | Compliance gates | Decide the audience in writing; build the 14 release blockers as gates before any school or under-13 marketing | Audience decision drives everything | RS-02 |

## 2. Findings that change plans

These are the facts in the dossiers most likely to change the architecture phase. Each is EXTERNAL unless stated.

| # | Finding | Why it matters | Source |
|---|---|---|---|
| F1 | Hosted PartyKit stopped accepting deploys on 16 Oct 2026 and shut down on 23 Oct 2026. Replicache was archived on 2026-06-10. | Hosted PartyKit is gone. Replicache's repo is archived, but plat §0 notes that its maker's current product, Zero, is live; Zero was not evaluated here (UNKNOWN). Re-checked 2026-10-27: the PartyKit page still states the 16 and 23 Oct dates. | [S33] [S34] |
| F2 | Google's Gemini API terms say you must be 18 or older and prohibit use in an API client "directed towards or likely to be accessed by anyone under 18". The EEA requires paid services only. Meta's Muse Spark terms were not retrieved. | iynk's Gemini fallback inside a product that children will use appears to conflict with the terms (conclusion is HYPOTHESIS until a lawyer or Google confirms). Terms text re-fetched 2026-10-27 and matches. | [S86] (comp §2) |
| F3 | Vercel Functions now serve WebSockets (GA 2026-10-20) but connections close at the function max duration: 300 s Hobby, 800 s Pro, 1800 s beta. Vercel's pricing FAQ describes Hobby as personal, non-commercial use. | A startup needs Pro, and room clients must reconnect. Re-checked 2026-10-27 against Vercel's limits and pricing pages: 300 s Hobby, 800 s Pro (GA), 1800 s Pro (beta), Pro $20 with a $20 credit. Vercel's own KB pages still call WebSockets "public beta" while the changelog says GA, so treat the status as inconsistent on Vercel's side. | [S28] [S29] [S30] [S31] |
| F4 | The Gemini price list changed: Gemini 4 Argon ($2.00 in / $10.00 out) doubles on 2026-12-01; 3.8 Flash and 3.6 Flash double on 2027-01-01. "Gemini 3.5 Flash" is not on Google's pricing or models pages. | Cost models that use today's Gemini price age fast. | [S67] |
| F5 | The COPPA amended rule has a compliance date of 22 Apr 2026, already past. Default-on telemetry with a persistent id and no consent step is a likely problem if users are under 13. | Not a future risk: it applies now to the live site if the site is child-directed (HYPOTHESIS on that point). The telemetry facts come from iynk's own security baseline (S96), which the compliance fact-checker did not re-test; the COPPA date was confirmed. | [S74] [S96] |
| F6 | The only open, browser-ready engines found for a real MCU are avr8js (MIT, 852 stars) and rp2040js (MIT, 533 stars), both with one dominant maintainer. | Bus factor of one on the core of the "real firmware" path. MIT permits a fork. | [S1] [S2] |
| F7 | Two reusable projects are copyleft in ways that block a closed build: Falstad CircuitJS1 (GPL-2.0-or-later) and Velxio (AGPLv3 with a paid commercial licence). | Learn from them; do not copy or link. | [S16] [S99] |
| F8 | WebGPU is at 87.82% global support but Firefox desktop has it disabled by default through version 161. | A WebGPU-only editor loses Firefox users. | [S43] |
| F9 | On a fast desktop, SVG and a naive Canvas 2D both held 60 Hz at 50 to 500 parts (up to 21,000 elements; Canvas p95 already 21.0 ms at 500 parts with 40 primitives each). SVG pulled clearly ahead from 1,500 parts and 63,000 elements (16.7 vs 38.9 ms median), and at 3,000 parts it was 39.7 vs 94.4 ms. (Review 2026-10-27: the first draft said "3,000 parts and above", which understated the gap.) Limits: the test moves one part per frame, uses plain rects and circles, and 16.7 ms is the vsync cap, so it shows that 60 Hz was held, not how much headroom remained. | The simple option is probably enough; phones are untested. | [S44] (TESTED) |
| F10 | Espressif's QEMU fork lacks Wi-Fi, I2C, general-purpose SPI and the GPIO matrix; Espressif gives no support for it. | ESP32 has no good open emulator path. | [S7] |
| F11 | The workflow benchmark found that Wokwi and Falstad showed no message for an LED with no resistor or a 5 V to GND short, while iynk names 16 faults and explains them. Wokwi and Falstad store circuits as plain text. iynk has no project file. Caveats from the benchmark: circuits were entered as text, not by dragging wires, and in Falstad the current readout on hover was not checked, so "no message" means no warning text, not no information. | Fault explanation is an asset to keep through any solver change; a plain-text project format is a precondition for export, share, MCP and AI proposals. | [S100] (TESTED, scripted, one run) |

## 3. What iynk has today (baseline)

From sim §1 [S26], TESTED by reading the repo.

| Piece | Today |
|---|---|
| Arduino C++ subset | TypeScript interpreter, 3,880 lines in `src/lib/interp/arduino/` excluding tests (3,714 without `types.ts`); the dossier said about 3,700 (line count re-run 2026-10-27) |
| Python and MicroPython subset | TypeScript runtime, about 3,900 lines including micro:bit |
| Verilog subset | One TypeScript simulator, 1,214 lines |
| Circuit solver | `bench-solve.js`, 431 lines, DC only, nodes are breadboard strips and rails, nonlinear parts are piecewise linear, dense Gaussian elimination, PWM averaged per time slice |
| Circuit model in the product | A named circuit string inside a prebuilt figure page; no user netlist |

The three things users cannot do (build an original project) map to three engine gaps (HYPOTHESIS, sim §1): a netlist-driven circuit engine, a way to run user code against that circuit, and a compile path for real boards. Every decision below is judged against closing those gaps.

## 4. Decisions

### D1. MCU execution model per board family

Detail: sim §2, §5, §7.

**Options by family**

| Board family | Options found | Evidence summary | Licence | Label |
|---|---|---|---|---|
| Arduino Uno, Nano (ATmega328P) | A: avr8js running a compiled hex. B: keep the TS Arduino interpreter. C: simavr server-side | avr8js v0.21.1 (2026-08-31), CPU plus ADC, timers, USART, TWI, SPI, ports, EEPROM, watchdog; no external parts (iynk writes the glue). TESTED 52 MHz-equivalent (peripherals and a timer interrupt on, 3.3x real time) to 104 MHz-equivalent (CPU only, 6.5x), on a synthetic loop of 5 ALU instructions, one laptop, against a 16 MHz AVR; no real sketch was run, and the dossier fact-checker did not reproduce it. Wokwi's simulator is built on it | avr8js MIT; simavr GPL-3.0 (do not embed) | EXTERNAL + TESTED [S1] [S25] |
| Arduino Uno R4 (Renesas) | Keep TS interpreter; Renode server-side (repo lists an Uno R4 Minima platform) | No browser engine found. Renode is .NET plus native cores, no browser build found | Renode MIT with bundled libs under own licences (tlib LGPL unless stated) | EXTERNAL [S8] |
| ESP32, ESP8266 | A: TS or MicroPython-WASM shim with honest labels. B: Espressif QEMU server-side | Espressif QEMU lacks Wi-Fi, I2C, GP SPI, GPIO matrix; no support offered. Wokwi simulates the ESP32 family but its engine is closed and its Bluetooth is not implemented. `esp8266js` (MIT) last pushed 2023-06-18 | QEMU GPL-2.0 (server process only) | EXTERNAL [S5] [S6] [S7] |
| Raspberry Pi Pico (RP2040) | A: rp2040js with stock MicroPython UF2. B: TS MicroPython subset | rp2040js v1.4.1 (2026-10-18). TESTED 131 MIPS on a bare 50-million-instruction SRAM loop with no peripherals (about real time for 125 MHz; expect less with PIO or DMA). README still says only UART0 documented and flash writes unimplemented (older than the code; behaviour needs a spike). No RP2350 (Pico 2) | MIT | EXTERNAL + TESTED [S2] |
| STM32 Nucleo | A: keep TS "HAL level" interpretation. B: Renode server-side. C: QEMU-WASM | QEMU STM32 lacks DMA, I2C, GPIO, DAC, CAN, RTC; Pebble port is a custom board with an unclear licence; Wokwi supports only C031, L031, F103C8 | Renode MIT; QEMU GPL-2.0 | EXTERNAL [S8] [S9] [S10] |
| micro:bit | A: Micro:bit Foundation V2 simulator (MicroPython codal_port in Emscripten, iframe, postMessage). B: TS runtime | Release v0.1.14 is dated 2024-11-25 (stale), README says the embedding API is "not yet stable". Measured `firmware.wasm` 1.25 MB (544 KB gzip). It runs the real MicroPython runtime, not nRF52833 CPU emulation | MIT | EXTERNAL + TESTED [S11] |
| Raspberry Pi (Python) | A: Pyodide with a fake `RPi.GPIO` / `gpiozero` module bound to the board model. B: MicroPython WASM. C: QEMU guest | Pyodide 314.0.7 `pyodide.asm.wasm` 9.6 MB (3.5 MB gzip) plus 2.5 MB stdlib. MicroPython WASM 450 KB (197 KB gzip) but no `machine` module in the port config. QEMU-WASM aarch64 is experimental | Pyodide MPL-2.0; MicroPython MIT | EXTERNAL + TESTED [S12] [S13] |
| FPGA boards | See D3 | | | |

**Compile path for C and C++ (needed for original Arduino projects)**

| Option | Evidence | Licence | ESTIMATED effort and cost | Label |
|---|---|---|---|---|
| A. Server-side arduino-cli with a hash cache | v1.5.1 (2026-06-05). Wokwi also builds server-side | GPL-3.0, or a paid commercial licence from Arduino, which Arduino says is required for commercial use "without disclosing the source code of your own applications". Whether running it on our own server needs the licence: UNKNOWN | 2 to 3 weeks (sim §2.3). Cost about $0.0005 to $0.001 per compile under a 10 s assumption (D9) | EXTERNAL [S3] |
| B. avr-gcc in WASM in the browser | `horang-corp/avr-gcc-wasm`: 0.62 to 1.09 s for 24 to 38 KB firmware in Chrome (author's own table); tools 16 to 17 MB, prebuilt objects about 38 MB; 3 stars | No licence file; README points at THIRD_PARTY_NOTICES.md; GCC is GPL-3.0 with runtime exception; shipping it to users means offering source | 3 to 6 weeks to productionise (sim §2.3), ESTIMATED | EXTERNAL [S4] |
| C. No compile (interpreter only) | Today's path | Own code | 0; cannot run real libraries | TESTED [S26] |

ESP32, STM32 and Pico C/C++ firmware has no known browser compile path (UNKNOWN). MicroPython needs no compile step on those boards.

**Licence constraints.** Bundle: avr8js, rp2040js, micro:bit simulator, MicroPython (MIT, keep notices); Pyodide (MPL-2.0, unmodified, file-level copyleft). Server-side only: arduino-cli (GPL-3.0 or commercial), QEMU and Espressif QEMU (GPL-2.0), Renode (MIT plus bundled libs). Do not embed: simavr, Unicorn (GPL). A web app that delivers JS to the user is distribution (HYPOTHESIS, get advice) [sim §6].

**ESTIMATED effort.** avr8js binding to the pin model: 2 to 4 person-weeks plus 2 to 3 for I2C and SPI device models; rp2040js: 3 to 5 weeks; micro:bit simulator embed: 3 days spike then not estimated; Pyodide Pi shim: not estimated in the dossier (UNKNOWN, set after RS-06). Assumption: `world.ts` can be driven by a pin-change callback, which was not checked.

**Recommendation (HYPOTHESIS).** Ranked in sim §7: avr8js for Uno and Nano; rp2040js for Pico; micro:bit Foundation simulator (self-hosted, build pinned); Pyodide or MicroPython WASM behind a board shim for Pi and ESP32; TS interpreters stay as the fast offline path and fallback. Defer Renode, Espressif QEMU and QEMU-WASM STM32. Label the modelled hardware honestly (for example "Wi-Fi is mocked").

**Spike.** RS-03 (avr8js from a worker against three existing lessons) and RS-06 (rp2040js with MicroPython, LittleFS, ADC, I2C stub). Exit conditions are in section 6.

### D2. Circuit solver strategy

Detail: sim §3, §5.

| Option | Evidence | Licence | Fit |
|---|---|---|---|
| A. Grow the in-house MNA engine (trapezoidal companion models, fixed step, dense LU below about 150 unknowns, Newton for diodes and BJTs), designed from textbook algorithms | Falstad's engine has exactly that shape: dense LU below 150 unknowns (`SPARSE_THRESHOLD = 150`), sparse above, trapezoidal by default, capped step reduced when convergence fails (source read) [S16] | Own code. Do not copy Falstad: GPL-2.0-or-later | Real-time pane |
| B. ngspice WASM via `eecircuit-engine` 1.9.0 | TESTED: 20.3 MB JS (5.7 MB gzip, WASM inlined), 349 ms start, RC step 34 ms, rectifier 23 ms, buck stage 28,208 points in 159 ms. Build disables XSPICE and OpenMP (EXTERNAL, build script). "Batch only, no halt and resume" is HYPOTHESIS inferred from the build flags by the dossier author, not tested | Wrapper MIT; ngspice has no single licence (each piece keeps its own, COPYING text is old); exclude CIDER (no-charge clause) and KLU (LGPL-2.1+) | "Run accurate analysis", waveforms, checker for A |
| C. Own stepping libngspice WASM build | ngspice manual says the shared library supports halting and resuming. No browser build with that found | As B | Co-simulation with the MCU |
| D. Xyce, Qucs-S, SPICE OPUS | GPL-3.0 / GPL-2.0 / licence unread | | Skip |

**Mixed-signal coupling (how others do it, sim §5).** Wokwi: digital, virtual time, analog parts are functional models, ADC reference fixed at 5 V, "very limited analog simulation". SimulIDE (AGPL-3.0): one picosecond event queue; analog re-solved when something changes. Proteus: mixed-mode SPICE (vendor claim). Renode: quantum-based lockstep. Provisional scheduling pattern (HYPOTHESIS, sim §5): one integer nanosecond clock with no wall-clock reads in the engine; the MCU runs in cycle batches up to the next event or analog step; pin writes become source changes at the event time; fixed analog step (about 1 to 10 us) so replays are bit-identical; seeded noise; record inputs with sim timestamps so rooms replay identically.

**ESTIMATED effort and cost.** Netlist generator, worker and waveform plotting around eecircuit-engine: 2 to 3 weeks. Stepping libngspice WASM: 3 to 5 further weeks. In-house transient (C and L) upgrade: not estimated in the dossier (UNKNOWN); RS-08 tests whether it is needed. Runtime cost is zero server cost (browser). Download cost: 5.7 MB gzip, lazy.

**Recommendation (HYPOTHESIS).** A plus B. A for instant feedback and the fault explanations that iynk already does well (F11); B on demand and as the oracle that tests A. C only if RS-07 passes and co-simulation demand is real.

**Spikes.** RS-08 (in-house DC solver against ngspice on 20 canonical circuits, then trapezoidal RLC and buck waveforms within 1 percent at a 1 us step in under 16 ms per frame), RS-07 (stepping libngspice, 1 ms slices, within 2 percent of the analytic answer, identical across Chrome, Firefox, Safari).

### D3. HDL path (Basys 3, DE10-Lite style teaching)

Detail: sim §4.

| Option | Evidence | Licence | Fit |
|---|---|---|---|
| A. Yosys (YoWASP) plus DigitalJS | `@yowasp/yosys` 0.71.188-dev.1267 (2026-10-22), 79.8 MB unpacked, about half native speed; DigitalJS 0.14.2 (2026-02-10), pure-JS teaching simulator that reads Yosys netlists. Chain runs fully in a browser. The `YoWASP/yosys` GitHub repo is archived; Codeberg has recent commits | ISC; BSD-2-Clause | Visual inspection of user HDL |
| B. Keep the TS Verilog subset simulator | 1,214 lines, timing and `initial`/delay style testbenches | Own | Testbench lessons |
| C. Verilator, Icarus server-side | Verilator v5.052; Icarus v13_0 | Verilator LGPL-3.0-only OR Artistic-2.0; Icarus GPL-2.0 | Only if a lesson needs full semantics |
| D. nextpnr in the browser | YoWASP packages iCE40, ECP5, MachXO2, Nexus, Gowin, GateMate. Basys 3 is Artix-7 and DE10-Lite is MAX 10; nextpnr lists Xilinx 7-series as experimental and does not list MAX 10 | ISC | Not for iynk's boards |

**ESTIMATED effort and cost.** Browser integration of A as a lazy "inspect" mode: 2 to 3 weeks (my estimate, low confidence; assumes the existing lesson loader and a worker; the dossier gives only a 3 day spike). No server cost. Download: 80 MB class, cached after first load.

**Recommendation (HYPOTHESIS).** A plus B. Do not promise bitstream generation for Basys 3 or DE10-Lite; treat "program the board" as a visual step.

**Spike.** RS-12: at least 90 percent of existing Verilog lessons elaborate, first load under 15 s on broadband, memory under 1 GB.

### D4. Editor rendering

Detail: plat §1.

| Option | Evidence | Licence | Notes |
|---|---|---|---|
| SVG in React, custom core | TESTED: 16.6 to 16.7 ms median (60 Hz cap) from 600 up to 63,000 elements; 39.7 ms at 126,000. Part art as SVG web components is a proven pattern (`@wokwi/elements`) | MIT (wokwi-elements) | Free accessibility and per-element events. Test covered one fast desktop, no text, no filters, no pan and zoom, one part moved per frame; 16.7 ms is the vsync cap, so it shows 60 Hz was held, not the headroom. Konva comparison is a naive full redraw, so it understates what a tuned Canvas can do |
| Canvas 2D (Konva `react-konva`) | TESTED naive full redraw: 38.9 ms at 63,000 elements. Konva warns above 5 layers; iOS Safari canvas memory limit reported at 256 or 384 MB | MIT | You build hit testing, text and accessibility |
| xyflow `@xyflow/react` 12.12.0 | DOM nodes plus SVG edges; no node-count thresholds in docs | MIT | Good for graphs; pin-accurate parts need custom nodes and handles |
| PixiJS 8 (WebGL/WebGPU) | Best raw scale | MIT | Overkill for 500 parts; WebGPU-only loses Firefox (F8) |
| tldraw 5.5.2 | Source-available, production key required, price not public | Not OSI | Avoid unless a budget is agreed |
| GoJS, JointJS+ | Commercial, prices not public | Paid per developer | Avoid |

Licence flag: JointJS core is MPL-2.0; maxGraph is Apache-2.0 (0.25.1, pre-1.0).

**ESTIMATED effort and cost.** Prototype under 400 lines in 3 days (target set by plat spike 2). Product-grade editor core (pin-accurate wiring, undo, serialisation to a plain-text project file, keyboard and non-drag alternatives): ESTIMATED 4 to 8 person-weeks, low confidence; assumptions: one engineer, existing part art reused, no solver work. Cost: no hosting cost.

**Accessibility link (D12).** WCAG 2.5.7 requires a non-drag alternative to drag interactions and 2.5.8 sets a minimum target size [S87]. SVG with real DOM nodes gives a head start on keyboard and screen reader support (HYPOTHESIS; not tested).

**Recommendation (HYPOTHESIS).** SVG in React with a thin custom core; keep Konva as the fallback if the phone spike fails; use Pixi only for wires if part counts reach thousands.

**Spike.** RS-01 (phone and Chromebook, 500 parts and 1,000 wires, real artwork, pan and zoom; pass is p95 under 20 ms, fail trigger is p95 over 33 ms) plus the xyflow-versus-custom decision by day 3 of that spike.

### D5. Collaboration model

Detail: plat §2.

| Option | Evidence | Licence | ESTIMATED cost |
|---|---|---|---|
| A. Server-ordered op log on iynk's existing WebSocket relay; Postgres log plus periodic snapshots | A hardware project is a typed graph with few same-field conflicts; one total order gives validation (reject a wire to a missing pin), per-user undo and permissions (HYPOTHESIS, plat §2.2) | Own | Neon Launch $0.106 per CU-hour, $0.35 per GB-month, no monthly minimum [S39] |
| B. Yjs (13.6.33) with Hocuspocus or Y-Sweet | Needed if multi-user offline merge becomes a requirement. A CRDT cannot reject an invalid merge; dangling wires need a repair pass either way | MIT | Self-host cost only |
| C. Automerge 3.5.0, Loro 1.17.1 | Automerge 3: memory over 10x lower. Loro fastest in a public benchmark that used old versions (Loro 0.10.1) and a 2018-class CPU | MIT | |
| D. Cloudflare Durable Object per room | Single-writer ordering per room matches A. $5 per month Workers Paid minimum; Cloudflare's own example of 100 objects with 100 hibernatable sockets each is about $20.65 per month | Proprietary service | |
| E. Liveblocks | Free: 3 seats, 10 connections per room. Pro $30 per month | Mostly Apache-2.0; server and CLI are AGPL-3.0-or-later | Not recommended for a free mission product |
| F. Hosted PartyKit, Replicache | Shut down, archived (F1) | | Do not use |

**ESTIMATED effort.** Op log with undo, reconnect and validation: 3 to 5 person-weeks (my estimate; assumptions: relay exists, project file schema exists from D4, five editors per room). Offline merge with Yjs adds an unestimated amount (UNKNOWN).

**Recommendation (HYPOTHESIS).** A. Add B only on a stated offline multi-user requirement. If the relay leaves Vercel, D is the next candidate.

**Spike.** RS-09 (five editors, undo, reconnect, invalid-wire rejection, 10,000 randomised ops with dropped connections, no divergence, reconnect under 2 s). RS-10 covers the Vercel WebSocket limits.

### D6. Physics and robotics engine

Detail: plat §3.

| Option | Evidence | Licence |
|---|---|---|
| Rapier (`@dimforge/rapier3d-compat` 0.21.0, 2026-09-25) | Async WASM load, base64 inside the compat package; docs call it cross-platform deterministic given identical setup and order, but warn that `Math.sin`/`Math.cos` may differ. The JS repo is archived and now lives inside `dimforge/rapier` | Apache-2.0 |
| Jolt via JoltPhysics.js (`jolt-physics` 1.1.1, 2026-10-23) | Bigger feature set (vehicles, constraints, ragdolls); determinism needs `-DCROSS_PLATFORM_DETERMINISTIC=ON` | MIT |
| MuJoCo WASM (`@mujoco/mujoco` 3.17.0) | README says "still a WIP"; multithread build needs COOP/COEP and SharedArrayBuffer | Apache-2.0 |
| cannon-es, Ammo.js | Stale or old Bullet port | MIT; zlib |
| ROS 2 in the browser | `rosbridge_suite` (BSD) with `roslib` 2.1.0 (BSD-2-Clause on npm); Foxglove SDK (MIT) with `foxglove_bridge`; `urdf-loader` 0.13.1 (Apache-2.0) loads URDF into three.js | |

Kinematics (IK) libraries were not researched (UNKNOWN).

**ESTIMATED effort and cost.** Rapier line-follower and four-wheel robot scenes with snapshot hashing: 2 to 4 person-weeks (my estimate; assumes the existing robotics lab scenes are re-hosted, not rewritten). Zero hosting cost in the browser. A server-side ROS 2 bridge for power users is a later option; cost UNKNOWN.

**Recommendation (HYPOTHESIS).** Rapier first, Jolt second, MuJoCo for arms once its bindings leave WIP. Simulate the ROS 2 graph in TypeScript for the free tier.

**Spike.** RS-13: identical snapshot hash on two browsers after 10,000 steps; step under 1 ms at 20 bodies; WASM within an agreed size budget.

### D7. Flight model

Detail: plat §4.

| Option | Evidence | Licence |
|---|---|---|
| Own 6-DoF multirotor in a Web Worker | Papers report native physics speeds far above what a browser needs (Flightmare: up to 200,000 Hz physics on a laptop). Browser 1 kHz is ESTIMATED by inference, not tested | Own |
| PX4 SIH | Physics inside PX4, headless, no external dependencies, no WASM mention | BSD-3-Clause |
| ArduPilot SITL | Native executable; web option not on the page | GPL-3.0 |
| JSBSim | No WASM build known; multirotor examples are third party | LGPL-2.1 |
| Betaflight SITL | Build details not loaded | GPL-3.0 |

Cost of server SITL per 30-minute session (ESTIMATED, assumes 1 shared vCPU and 1 GB, CPU load UNKNOWN): Fly shared-cpu-1x about $0.0047; E2B 2 vCPU 4 GiB about $0.083; Vercel Sandbox Pro about $0.17. At 10,000 sessions that is $47 to $1,700. Browser-side physics costs $0 per session.

**ESTIMATED effort.** Depends on how much of the existing Drone Lab flight sim can be reused, which neither dossier measured (UNKNOWN). Server SITL needs a queue, a WebSocket per session, a security story and cold-start handling (plat §4); no effort figure given.

**Recommendation (HYPOTHESIS).** TypeScript model for the free product; PX4 SIH in a Fly Machine only as a later "real firmware" mode.

**Spikes.** RS-14 (TypeScript model versus PX4 SIH step response for 3 craft, within 15 percent on rise time and overshoot) and RS-14b (SITL CPU on shared-cpu-1x for 30 minutes, under 50 percent of a vCPU).

### D8. Extension sandbox

Detail: plat §5.1.

| Option | Isolation | Limits | Licence |
|---|---|---|---|
| iframe `sandbox` without `allow-same-origin` plus `postMessage` | Opaque origin; MDN calls `allow-scripts` plus `allow-same-origin` on same-origin content "strongly discouraged" | No CPU or memory caps by itself | Browser feature |
| Web Worker | No DOM; can be killed with `terminate()` | Not a security boundary against engine bugs; limits not researched (UNKNOWN) | Browser feature |
| SES / Hardened JS 2.3.0 | Object capabilities | Cannot stop infinite loops or unbounded memory; audits cited date from 2021 | Apache-2.0 |
| QuickJS in WASM (`quickjs-emscripten` 0.32.0) | Separate engine in WASM memory | No speed number gathered | MIT |
| Extism | Host-controlled limits and timers | npm `extism` is 2.0.0-rc13 from 2025-05-14 | BSD-3-Clause |
| WASM component model (WASI 0.2.0 stable 2024-01-25), `jco` 1.39.0 | Capability based | WASI 0.3 status not loaded | Apache-2.0 (with LLVM exception for jco) |

**Product link.** The workflow benchmark found that no free, no-login tool makes a custom component easy for a beginner, and suggests a part defined by a small data file (pins, a few electrical rules, a picture) rather than a code API (HYPOTHESIS) [S100]. A data-only part needs no sandbox for code.

**ESTIMATED effort.** Data-file parts: not estimated in the dossiers. Opaque-origin iframe plus Worker plus capability API: 3 to 5 weeks (my estimate, low confidence). Hosting cost $0 (browser).

**Recommendation (HYPOTHESIS).** Ship v1 with data-only custom parts and no extension code. If code is needed later: opaque-origin iframe on a separate origin plus Worker plus a capability API over `postMessage`; QuickJS-in-WASM where CPU and memory caps are required; Extism or the component model only when stable. SES alone is not enough.

**Spike.** RS-15 (red-team: infinite loop, 2 GB allocation, `postMessage` flood, `fetch` to the parent origin; host stays responsive, no cookie or storage access, worker killed in under 2 s).

### D9. Server compile isolation

Detail: plat §5.2; sim §2.3.

| Option | Evidence | Licence |
|---|---|---|
| Managed microVM: E2B ($0.000014 per vCPU-s, $0.0000045 per GiB-s) or Vercel Sandbox (Pro $0.128 per CPU-hour, $0.0212 per GB-hour; Hobby 5 h CPU, 10 concurrent, 45 min session) | Vercel Sandbox being Firecracker-based is inferred from a related page title, not from a statement (HYPOTHESIS) | Proprietary services |
| Self-run Firecracker | Boot to guest init at most 125 ms, VMM overhead at most 5 MiB (bare metal, stated setup) | Apache-2.0 |
| gVisor | Syscall-heavy and file-heavy work pays most overhead; no numbers in text | Apache-2.0 |
| nsjail | Namespaces, cgroups, rlimits, seccomp-bpf; "not an official Google product" | Apache-2.0 |
| Docker rootless | Does not say whether it is a sandbox for untrusted code | Apache-2.0 (Moby; not verified) |
| Cloudflare Containers | $0.000020 per vCPU-s, $0.0000025 per GiB-s | Proprietary |

**ESTIMATED cost per compile**, assuming 10 s on 2 vCPU and 4 GB (no real compile was measured; arduino-cli was not installed): E2B $0.00046; Cloudflare Containers $0.00061; Vercel Sandbox $0.00095; Fly shared-cpu-1x $0.000026 (slower, one shared vCPU). At the high end, 100,000 compiles cost about $95. With a hash cache of sketch plus libraries, fewer builds run (HYPOTHESIS). Abuse control and isolation, not money, are the constraint.

**ESTIMATED effort.** 2 to 3 weeks for the service with sandbox, queue and cache (sim §2.3). Legal answer on arduino-cli: 1 week elapsed.

**Recommendation (HYPOTHESIS).** Managed microVM sandbox for the few real compiles (E2B or Vercel Sandbox), no network, timeouts and memory caps, results cached by hash; self-run Firecracker or gVisor later; nsjail only as an inner layer; never Docker rootless as the only boundary. Keep the in-browser interpreter as the offline fallback.

**Spikes.** RS-04 (click-to-running p95 under 3 s warm and 8 s cold on 4G; arduino-cli versus avr-gcc WASM; record licence blockers) and RS-05 (20 compiles in a managed sandbox for an Arduino sketch and an ESP32 sketch; median under 30 s, cost under $0.005 each, isolation confirmed). Plus RS-17 for the legal question.

### D10. Hosting

Detail: plat §6.

| Item | Facts (as of 2026-10-26) | Source |
|---|---|---|
| Vercel Pro | $20 per month including a $20 usage credit; Active CPU from $0.128 per hour; memory from $0.0106 per GB-hour; 1 TB fast data transfer included; function max 300 s default, 800 s max, 1800 s beta | [S30] [S31] |
| Vercel Hobby | $0; described as personal, non-commercial; cannot buy extra usage | [S30] |
| Vercel WebSockets | GA 2026-10-20, billed as normal function usage; `upgradeWebSocket()` from `@vercel/functions` 3.10.0+; connection ends at the function max duration; no shared in-memory state | [S28] [S29] |
| Fly.io | shared-cpu-1x 256 MB $2.19 per month, 1 GB $6.70 per month; no free tier for new orgs | [S38] |
| Cloudflare | Workers Paid $5 per month; R2 $0.015 per GB-month with free egress via Workers/S3 API; Durable Objects as in D5 | [S35] [S36] [S37] |
| Neon | Launch $0.106 per CU-hour, $0.35 per GB-month; Free: 100 CU-hours and 1 GB | [S39] |
| Supabase | Pro from $25 per month (8 GB DB, Realtime 5M messages, 500 concurrent) | [S40] |

**ESTIMATED baseline monthly platform cost before AI and before overage**, assuming Vercel Pro, one 1 GB Fly Machine for rooms, and Neon at 0.25 CU running all month plus 1 GB: $20 + $6.70 + (0.106 x 0.25 x 730 = $19.35, plus $0.35) = about $46 per month; about $27 per month if Neon sits near zero. R2 stays inside the free tier at 10 GB. This excludes SerpApi, domain and the AI cost in D11.

**Recommendation (HYPOTHESIS).** Keep Vercel on Pro for the app. Add Fly Machines or a Cloudflare Durable Object for rooms (reconnect logic is required either way because of the 800 s cap). Neon for Postgres; Supabase Pro if auth, storage and realtime are wanted together. R2 for objects. Avoid Hobby limits for production.

**Spike.** RS-10 (Vercel Function WebSocket survives 800 s and a deploy; cost per room-hour under $0.01 for 5 clients over 30 minutes).

### D11. AI provider strategy and cost

Detail: plat §7; comp §2 (provider terms).

**Prices per million tokens (input / cached read / output)**

| Model | Price | Source |
|---|---|---|
| Claude Haiku 5.5 (up to 100k prompt) | $0.10 / $0.01 / $0.50 | [S65] |
| Claude Sonnet 5.5 | $2 / $0.10 / $10 | [S65] |
| Claude Opus 5.5 | $4 / $0.20 / $20 | [S65] |
| Gemini 3.8 Flash | $0.75 / $0.075 / $3.75 (doubles 2027-01-01) | [S67] |
| Gemini 3.5 Flash-Lite | $0.30 / $0.03 / $2.50 | [S67] |
| OpenAI gpt-5.4-mini | $0.75 / $0.075 / $4.50 | [S68] |
| Meta Muse Spark 1.1 (public preview, US developers) | $1.25 / not stated / $4.25, from a news report via AI Weekly; Meta's own page had no price | [S69] |
| Fireworks gpt-oss-120B | $0.15 / $0.015 / $0.60 | [S70] |

**ESTIMATED cost of one tutoring session** (plat §7.2 assumptions: 12 turns, 6,000 token cacheable prefix, 1,000 new input and 600 output tokens per turn, every cache prefix hits; price only, quality untested) [S71]:

| Model | Per 1,000 sessions (cached) | Per 100,000 sessions per month |
|---|---|---|
| Haiku 5.5 | $7.60 | about $760 |
| Gemini 3.8 Flash (price now / from 2027-01-01) | $49 / $99 | about $4,900 / $9,900 |
| Sonnet 5.5 | $134 | about $13,400 |
| Muse Spark 1.1 (no cache price) | $268 | about $26,800 |

**ESTIMATED routing mix** (my calculation from the table above): 80 percent of sessions on Haiku 5.5 and 20 percent on Sonnet 5.5 gives 0.8 x $7.60 + 0.2 x $134 = $32.88 per 1,000 sessions, about $3,290 per 100,000. This assumes Haiku quality is acceptable for 80 percent of sessions, which nobody has tested.

**Evidence from the competitor dossiers.** Flux's Copilot is grounded in the live design and shipped a public MCP server; Arduino's Cloud Editor assistant reads code and board, not a circuit; Wokwi mentions no built-in AI (its CLI has an experimental MCP server that third-party agents can use, ai-hardware.md [S38] [S40]); Velxio sells an agent and a tutor mode on paid tiers; a 2025 r/arduino thread (community, one thread) says chatbots need every pin checked against the datasheet [S99] [S101]. This supports a partner grounded in the project and the simulation state, which a plain-text project file (D4) makes cheap to supply.

**Provider terms for children (comp §2).** Gemini API: 18 or older; EEA paid only; unpaid services let Google use prompts to improve products (F2). Meta Muse Spark terms: not retrieved (UNKNOWN). Terms of other providers for under-18 products: not researched (UNKNOWN). EU AI Act Art. 50(1) requires telling people when they are talking to an AI, applying from 2 Aug 2026 [S84]; the Commission's timeline [S85] marks dates as amended by the Digital Omnibus and its adoption status is UNKNOWN, so confirm this date too.

**ESTIMATED effort.** Provider abstraction with routing and caching: not estimated in the dossiers (UNKNOWN, set after RS-11). A written terms review is a legal task (RS-17).

**Recommendation (HYPOTHESIS).** A provider-neutral layer; tiered routing (small model for routine turns, a stronger one for hard debugging) with prompt caching on; open-weight models on Fireworks or Together as a candidate for a free tier; Muse Spark only once Meta publishes a cache price and non-US access. Do not run a flagship on every turn. Remove or replace Gemini for minors until cleared.

**Spikes.** RS-11 (50 scripted lab-debug conversations through Haiku 5.5, Sonnet 5.5, Gemini 3.8 Flash and gpt-oss-120B, rubric scored; pick the cheapest with at least 90 percent of the top score; log cache hits for 100 sessions, pass at least 80 percent prefix tokens read from cache) and RS-02 (provider terms).

### D12. Compliance gates

Detail: comp §1 to §9. Not legal advice; lawyer review required before marketing to schools or under-13s.

**Gate list (from comp §9), with the feature each constrains and ESTIMATED effort**

| Gate | What must be true | ESTIMATED effort (comp) | Source |
|---|---|---|---|
| G1 Audience decision | Written choice: 13+ general audience (Route A) or child-directed with parental consent (Route B) | Route A 1 to 2 eng weeks plus lawyer USD 1,500 to 5,000; Route B 6 to 10 eng weeks plus lawyer USD 6,000 to 20,000 | [S74] [S75] |
| G2 Telemetry | Off by default; no room code stamped on events | in G1 | [S96] |
| G3 Policies | Public privacy policy, terms, subprocessor list (Meta, Google, SerpApi, Vercel, Tiger Data, Solana RPC) | 2 weeks with the DPA | [S96] |
| G4 COPPA paperwork | Written retention policy and written security program | in G1 | [S74] |
| G5 Age screen and consent | Neutral age screen before data collection; parental consent and parent review/delete if under-13 allowed; India treats under 18 as children (DPDP, rules phase in about May 2027; secondary sources only, [S79]), Brazil LGPD parental consent | in G1 | [S74] [S77] [S79] [S80] |
| G6 Chat, voice, Build Buddies | Off for under-13 or moderated with report and block; microphone consent before audio leaves the device | not estimated | [S96] |
| G7 AI provider terms | Cleared for minors (F2) | legal | [S86] |
| G8 AI Act | AI labels on replies; no emotion inference (Art. 5(1)(f)); no grading, placement or proctoring without a high-risk plan (Annex III point 3) | 2 to 3 days engineering, 1 to 2 days memo, 5 lawyer hours | [S81] [S83] [S84] |
| G9 Route auth and cost controls | AI, search and Solana routes authenticated and rate limited | not estimated | [S96] |
| G10 DPA | NDPA v2.2 with school-official terms | 1 week plus 5 to 10 lawyer hours | [S76] [S98] |
| G11 Accessibility | WCAG 2.2 AA pass on main flows, non-drag alternative, VPAT 2.5 INT ACR. ADA Title II compliance dates 26 Apr 2027 (50,000+ people) and 26 Apr 2028, at WCAG 2.1 AA. Title II binds public entities such as districts, not iynk directly; it reaches iynk through procurement requests for an ACR (comp §3). The IFR itself was not read | 3 to 6 eng weeks; audit USD 5,000 to 25,000 (no source) | [S87] [S88] [S89] |
| G12 Credentials | On-chain minting off for minors; no wallet for under-18s; no personal data on chain | 1 week | [S96] |
| G13 Physical safety copy | LiPo, propellers, flying legally; no mains-powered builds; second-source citation for LiPo guidance (only Wikipedia and an NFPA outline loaded) | 2 to 3 days plus 2 to 4 days for a "before you fly" panel | [S92] [S93] [S95] [S97] |
| G14 Lawyer review | Whole set, including SOPIPA text and other state laws (not read) | 10 to 40 hours | |

Not blockers but likely asked for in procurement: SOC 2, Clever (annual fee in an order form, amount unknown), ClassLink, LTI 1.3 (certification fees unknown) [S90] [S91]. Export control: public beginner flight content is "published" and outside the EAR (15 CFR 734.7); risk rises with autonomy features such as payload release, target tracking, long range or swarming [S94].

**ESTIMATED engineering total** for the Route A path: about 10 to 17 engineer-weeks (G1 1 to 2, GDPR defaults 2 to 4, G11 3 to 6, G3 plus G10 2, G8 0.4 to 0.6, G12 1, G13 0.4 to 0.6 plus drone panel 0.4 to 0.8). Treat as an upper bound because the defaults overlap. Route B adds 6 to 10 weeks on top of the account system.

**Architecture consequences (HYPOTHESIS, derived).** The architecture must make these cheap: an account system optional at first; per-feature flags by age band (chat, voice, public profiles, on-chain); a data map with a deletion path; telemetry off by default and free of room codes; an audit of subprocessors; AI replies labelled in the data model, not only the UI. Wallet addresses on a public chain cannot be deleted, which conflicts with deletion duties for children's data (comp §7, HYPOTHESIS).

**Spike.** RS-02 (audience decision and provider terms, a legal and product task), RS-16 (accessibility of the editor).

## 5. Cross-cutting dependencies

| Dependency | Decisions it links | Note |
|---|---|---|
| Plain-text project file with a version field | D4, D5, D8, D11 | Wokwi uses `diagram.json`, Falstad exports text; a text format makes export, share, MCP tools, an AI-proposed circuit and an op log fall out of one schema (HYPOTHESIS, [S100]). The same file is the unit for op-log validation and for AI context |
| Deterministic nanosecond clock | D1, D2, D5, D6 | Rooms replay identically only if the engine reads no wall clock and noise is seeded (sim §5, HYPOTHESIS) |
| Board model and pin-change callback | D1, D2 | Whether `world.ts` can take a pin-change callback was not checked (UNKNOWN) |
| Age band flags | D5, D11, D12 | Chat, voice, AI and on-chain features depend on the audience decision |
| Netlist export | D2, D4 | A user-drawn schematic must produce a SPICE netlist for the ngspice path |
| Phone and Chromebook baseline | D1 to D7 | Every TESTED figure is from one M4 Pro; RS-01 and RS-03 establish the real baseline |

## 6. Research spikes in priority order

These become `docs/MASTER_PLAN/08_RESEARCH_SPIKES` entries. Priority reflects how many decisions a spike unblocks, how cheap it is, and how costly a wrong answer would be. Effort values are ESTIMATED by the source dossiers unless stated. "Source" gives where the question and exit condition come from (sim S-n, plat n, comp §n).

| Prio | ID | Question | Method | Exit condition | Effort | Unblocks | Source |
|---|---|---|---|---|---|---|---|
| 1 | RS-01 | Does an SVG editor hold 60 fps on a phone and a school-grade Chromebook at 500 parts and 1,000 wires with real artwork, pan and zoom? Is xyflow or a custom core smaller? | Port `bench.mjs` to real part art; run on a 3-year-old mid-range Android phone and a Chromebook; also build an Uno + LED + resistor board with 20 wires both ways | Pass: p95 frame time under 20 ms on both. Fail trigger: p95 over 33 ms on either, then Canvas/Pixi for wires only. Prototype under 400 lines in 3 days either way; choose the smaller | 3 to 5 days | D4, all UI | plat 1, 2; sim S-11 |
| 2 | RS-02 | Which audience route (13+ general or child-directed) will iynk take, and do the AI provider terms (Gemini, Meta Muse Spark, and any replacement) allow a product likely to be used by under-18s? | Founders decide in writing; read Meta's API terms; read terms of each candidate provider; ask counsel or the provider in writing (nobody was contacted) | Written audience decision and a provider list cleared for that audience. Fail: no provider allows it, then AI is limited to 18+ or a self-hosted open-weight model | 1 to 2 weeks elapsed, lawyer 5 to 10 hours (ESTIMATED) | D11, D12, D5 | comp §1.1, §2; plat 13 |
| 3 | RS-03 | Can avr8js, run in a worker, execute a hex of the existing Uno Blink, Fade and analogRead lessons and match the TS interpreter within one PWM period and one serial line? Is the pin model driveable by callback? | Compile three lessons off-line; run in a worker; compare serial output and PWM duty; run on phone and Chromebook | Pass: equal serial output, PWM duty within 2 percent, at 3x real time or better on both devices. Fail: below 1x on either | 3 days | D1, D2 | sim S-1, S-11 |
| 4 | RS-04 | Can a hex be produced fast enough? | Compare server arduino-cli (cold and warm) with horang avr-gcc WASM on a clean device | Pass: p95 click-to-running under 3 s warm and under 8 s cold on a 4G phone, with no licence blocker. Fail: either path over 15 s cold or a licence blocker | 3 days | D1, D9 | sim S-2 |
| 5 | RS-17 | Does running arduino-cli on our servers in a commercial product need the Arduino commercial licence? Does shipping Pyodide unmodified and ngspice need more than notices? Is the Falstad and Velxio "learn only" reading right? | Written answer from counsel or Arduino support (no one contacted so far) | Written answer on file | 1 week elapsed | D1, D2, D9 | sim S-10 |
| 6 | RS-08 | Is the in-house MNA engine accurate and fast enough? | (a) DC solver against ngspice on 20 canonical circuits. (b) Trapezoidal companion models reproduce RC, RLC and buck waveforms at a fixed 1 us step | (a) Pass: within 2 percent on 18 of 20, failures explained; fail: more than 5 disagree. (b) Pass: within 1 percent of ngspice and under 16 ms per frame on a phone; fail: either missed, then use ngspice for transient | 2 days + 1 week | D2 | sim S-4, S-5 |
| 7 | RS-09 | Does a server-ordered op log on the relay handle 5 editors with undo, reconnect and invalid-edit rejection? | Property test with randomised ops and dropped connections | Pass: no divergence after 10,000 randomised ops, reconnect under 2 s | about 1 week (ESTIMATED by me) | D5 | plat 3 |
| 8 | RS-10 | Does a Vercel Function WebSocket survive 800 s and a deploy, and what does a room cost? | 5 clients for 30 minutes; read Active CPU and memory-hours | Pass: clean reconnect and cost under $0.01 per room-hour. Fail: use Fly or a Durable Object | 2 to 3 days (ESTIMATED by me) | D5, D10 | plat 5 |
| 9 | RS-05 | What is the real compile time and cost, and is isolation sound, for an Arduino and an ESP32 sketch in a managed sandbox? | arduino-cli in a sandbox image; 20 compiles each | Pass: median under 30 s, cost under $0.005 each, isolation confirmed | 3 to 5 days (ESTIMATED by me) | D9 | plat 10 |
| 10 | RS-11 | Which model is good enough for lab tutoring at the lowest price, and does caching hit as modelled? | 50 scripted lab-debug conversations through Haiku 5.5, Sonnet 5.5, Gemini 3.8 Flash, gpt-oss-120B; rubric scoring; log cache tokens over 100 sessions | Pass: cheapest model with at least 90 percent of the top score; at least 80 percent of prefix tokens read from cache | 1 to 2 weeks (ESTIMATED by me) | D11 | plat 11, 12 |
| 11 | RS-07 | Does our own stepping libngspice WASM (XSPICE, OpenMP, KLU off) allow halt-modify-resume at 1 ms slices driven by the MCU event loop? | Build from a pinned tag; PWM-driven RC filter read by `analogRead` | Pass: within 2 percent of the analytic answer and bit-identical across Chrome, Firefox, Safari. Fail: 1 s of sim takes over 5 s wall | 1 to 2 weeks | D2 | sim S-3 |
| 12 | RS-06 | Does rp2040js boot the stock MicroPython UF2 with LittleFS, blink an LED, read ADC and talk to an I2C stub in the browser at 1x or better? | Run in the browser on Chromebook | Pass: all four work, CPU under 60 percent of a core. Fail: filesystem writes or I2C missing and need over 2 weeks | 1 week | D1 | sim S-6 |
| 13 | RS-18 | Does the micro:bit Foundation simulator, self-hosted in an iframe, cover the existing micro:bit lessons? | Pin a build; run the lessons | Pass: at least 90 percent of existing micro:bit lesson checks pass. Fail: embedding API breaks across 2 versions | 3 days | D1 | sim S-7 |
| 14 | RS-16 | Can the editor meet WCAG 2.2 AA for the drag, canvas and target-size cases? | Keyboard-only and screen-reader pass on the RS-01 prototype; non-drag wiring alternative | Pass: wire two pins and place a part without a pointer, targets meet 2.5.8. Exit measure is this file's proposal derived from the WCAG criteria; no dossier set a threshold | 1 week (ESTIMATED by me) | D4, D12 | comp §3 |
| 15 | RS-12 | Does YoWASP Yosys plus DigitalJS parse and visualise the existing Verilog lessons? | Run all lessons in the browser | Pass: at least 90 percent elaborate, first load under 15 s on broadband, memory under 1 GB. Fail: over 25 percent need unsupported constructs | 3 days | D3 | sim S-8 |
| 16 | RS-15 | Can an opaque-origin iframe plus Worker contain a hostile extension? | Red team: infinite loop, 2 GB allocation, message flood, `fetch` to parent origin | Pass: host stays responsive, no cookie or storage access, worker killed in under 2 s. Only run if code extensions are in scope | 3 to 5 days (ESTIMATED by me) | D8 | plat 9 |
| 17 | RS-13 | Rapier or Jolt for a line follower and a four-wheel robot? | Both in WASM on two browsers | Pass: identical snapshot hash after 10,000 steps on two browsers, step under 1 ms at 20 bodies, size within budget | about 1 week (ESTIMATED by me) | D6 | plat 6 |
| 18 | RS-14 | Is a TypeScript quadrotor model good enough against PX4 SIH for the 13 craft, and what does SITL cost? | Compare step response on 3 craft; run PX4 SIH headless on shared-cpu-1x for 30 minutes | Pass: rise time and overshoot within 15 percent; SITL under 50 percent of one shared vCPU | about 1 week (ESTIMATED by me) | D7 | plat 7, 8 |
| 19 | RS-19 | Is Espressif QEMU useful server-side for blink-class ESP32 lessons without the GPIO matrix? | Run a stock ESP-IDF blink | Pass: a GPIO level change is observable from outside QEMU. Fail: drop | 2 days | D1 | sim S-9 |
| 20 | RS-20 | Is Yjs worth adding for offline multi-user merge? | Merge two 1-hour offline sessions plus a repair pass | Pass: no dangling wires. Run only if the product requires multi-user offline | about 1 week (ESTIMATED by me) | D5 | plat 4 |

Notes on the order. RS-01 and RS-03 first because every other performance budget rests on a device baseline that does not exist yet (all dossier timings are one laptop). RS-02 is next although it is not engineering: it gates the AI plan (D11) and the whole compliance set, and a wrong audience choice makes later work wasteful. RS-04 and RS-17 close the compile path, which is the main route to "original projects" for Arduino code. RS-08 comes before RS-07 because if the in-house solver is good enough the costly libngspice build may be unnecessary. RS-19 and RS-20 are conditional or low value. A shared-device test (sim S-11) is folded into RS-01 and RS-03.

Spikes not listed because they are not research tasks: building the age-band flags, the NDPA-based DPA, the VPAT, the safety copy and the "before you fly" panel. They are build items under D12.

## 7. Roll-up of ESTIMATED figures

| Item | Figure | Basis |
|---|---|---|
| Platform baseline | about $27 to $46 per month before AI | Section D10, my arithmetic |
| AI at 100,000 sessions per month | $760 (Haiku only) to $13,400 (Sonnet only); about $3,290 for an 80/20 Haiku/Sonnet mix | plat §7.2 plus my mix |
| Compile at 100,000 builds | about $46 to $95 before caching | plat §5.2 (10 s assumption) |
| Server SITL, 10,000 sessions of 30 min | $47 to $1,700 | plat §4 (CPU load UNKNOWN) |
| Spike effort, all 20 | roughly 16 to 21 weeks if summed (5-day weeks); about 14 to 18 if RS-02 and RS-17, which are elapsed time waiting on counsel and founders, are left out | sum of the ranges in section 6, recomputed in review 2026-10-27 (the first draft said 15 to 18); entries marked "by me" are my guesses |
| Compliance engineering, Route A | about 10 to 17 person-weeks, lawyer fees additional | Section D12 |

The spike total is a rough sum and is not a plan. No figure in this section is a quote.

## 8. Gaps

- Phone and Chromebook performance for every engine: UNKNOWN. No browser was run for the simulators; the editor test used headless Chromium on a laptop.
- Whether `world.ts` accepts a pin-change callback: not checked.
- Meta Muse Spark API terms and Meta's own pricing page: not retrieved. Terms of other AI providers for under-18 products: not researched.
- arduino-cli licensing for server-side commercial use: UNKNOWN; nobody was contacted.
- Real compile durations for Arduino and ESP-IDF builds: not measured.
- Kinematics libraries, Web Worker resource limits, how Tinkercad, Flux and EasyEDA render: not found.
- Renode may hold RP2040 or ESP32 platforms the dossier did not find. No WASM build was found for simavr, Espressif QEMU, Icarus, Xyce or Arcilator; that is not proof they do not exist.
- Compliance: SOPIPA text, state laws beyond California, FAA pages, DPDP Rules official text, mains-voltage limits, crypto rules for minors, COPPA penalty figure, safe-harbor fees, Clever, ClassLink, LTI and SOC 2 prices: UNKNOWN or unretrieved. LiPo guidance cites only Wikipedia and an NFPA outline.
- ngspice licence of the exact build tag and release date of version 47: UNKNOWN.
- Gemini "3.5 Flash" is not on Google's pages, so it is excluded from comparisons.
- The EU AI Act high-risk dates depend on the Digital Omnibus; its adoption status is UNKNOWN.
- Several effort figures here are my own and are marked "by me"; none was validated against iynk's code.

## Sources

All accessed 2026-10-26 by the dossier authors. "Origin" gives the dossier and its own source id (sim = simulation-options, plat = platform-options, comp = compliance-safety, others named). "Describes" gives the version or date the dossier says the source covers. I re-read the dossiers, not the live pages; the dossiers' fact-check logs record which claims were re-fetched.

| ID | URL | Title | Publisher | Describes | Origin |
|---|---|---|---|---|---|
| S1 | https://github.com/wokwi/avr8js | avr8js README and peripherals | Wokwi | v0.21.1 (2026-08-31), MIT | sim S1 |
| S2 | https://github.com/wokwi/rp2040js | rp2040js | Wokwi | v1.4.1 (2026-10-18), MIT | sim S3 |
| S3 | https://github.com/arduino/arduino-cli | arduino-cli README, License | Arduino | v1.5.1 (2026-06-05), GPL-3.0 or commercial | sim S21 |
| S4 | https://github.com/horang-corp/avr-gcc-wasm | avr-gcc-wasm | horang-corp | pushed 2026-05-29, no licence file | sim S22 |
| S5 | https://github.com/wokwi/wokwi-docs | Wokwi docs source (analog, time, ESP32, CI, libraries) | Wokwi | main branch 2026-10-26 | sim S5 |
| S6 | https://docs.wokwi.com/getting-started/supported-hardware | Supported Hardware | Wokwi | current | sim S6 |
| S7 | https://github.com/espressif/esp-toolchain-docs/blob/main/qemu/README.md | Espressif QEMU README | Espressif | `esp-develop-9.2.2-20260417` | sim S9 |
| S8 | https://github.com/renode/renode | Renode README, LICENSE, platforms | Antmicro | v1.17.0 (2026-09-07), MIT | sim S12 |
| S9 | https://www.qemu.org/docs/master/system/arm/stm32.html (also nrf, raspi pages) | QEMU Arm system documentation | QEMU | master docs 2026-10-26 | sim S16 |
| S10 | https://github.com/ericmigi/pebble-qemu-wasm | Pebble emulator in the browser | ericmigi | pushed 2026-08-25, QEMU 10.1 TCI, no licence field | sim S11 |
| S11 | https://github.com/microbit-foundation/micropython-microbit-v2-simulator | micro:bit V2 simulator; Python Editor v3 | Micro:bit Educational Foundation | v0.1.14 (2024-11-25), MIT | sim S17 |
| S12 | https://github.com/micropython/micropython | MicroPython webassembly port | MicroPython | v1.29.0 (2026-08-24), MIT | sim S18 |
| S13 | https://github.com/pyodide/pyodide | Pyodide | Pyodide | 314.0.7 (2026-09-14), MPL-2.0 | sim S19 |
| S14 | https://ngspice.sourceforge.io/ | ngspice site, manual, COPYING | ngspice | manual "Version 47+" | sim S25 |
| S15 | https://github.com/eelab-dev/EEcircuit-engine | EEcircuit-engine | eelab-dev | 1.9.0 (2026-10-25), MIT | sim S26 |
| S16 | https://github.com/pfalstad/circuitjs1 | Falstad CircuitJS1 | Paul Falstad | pushed 2026-10-25, GPL-2.0-or-later | sim S28 |
| S17 | https://github.com/Arcachofo/SimulIDE-dev | SimulIDE source | Arcachofo | AGPL-3.0 | sim S41 |
| S18 | https://yowasp.org/ | YoWASP | whitequark | `@yowasp/yosys` 0.71.188-dev.1267 (2026-10-22), ISC | sim S23 |
| S19 | https://github.com/YosysHQ/nextpnr | nextpnr | YosysHQ | 0.11.1 (2026-08-11), ISC | sim S36 |
| S20 | https://github.com/tilk/digitaljs | DigitalJS | tilk | 0.14.2 (2026-02-10), BSD-2-Clause | sim S37 |
| S21 | https://github.com/verilator/verilator | Verilator | Verilator | v5.052, LGPL-3.0-only OR Artistic-2.0 | sim S33 |
| S22 | https://github.com/steveicarus/iverilog | Icarus Verilog | steveicarus | v13_0 (2026-03-02), GPL-2.0 | sim S34 |
| S23 | https://www.labcenter.com/simulation/ | Proteus VSM | Labcenter Electronics | current, vendor claim | sim S42 |
| S24 | https://renode.readthedocs.io/en/latest/advanced/time_framework.html | Time framework | Renode | current | sim S13 |
| S25 | local: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/research/sim/run/` (scripts copied to `/Users/amar/iynk-master-plan-scratch/research/tech-review/`) | avr8js, rp2040js, ngspice benchmark scripts | sim dossier author | run 2026-10-26, M4 Pro, Node 24.8 | sim S43 |
| S26 | local: `/Users/amar/Codes/ak/simlab/figures/engine/bench-solve.js`, `src/lib/interp/**`, `HANDOFF.md` | iynk repository files | iynk | read 2026-10-26 | sim S44 |
| S27 | https://registry.npmjs.org/@yowasp/clang | `@yowasp/clang` | npm | 22.0.0-git20542-10 (2026-03-12) | sim S46 |
| S28 | https://vercel.com/docs/functions/websockets | WebSockets | Vercel | last updated 2026-08-10 | plat S17 |
| S29 | https://vercel.com/changelog/websocket-support-is-now-generally-available | WebSocket support is now generally available | Vercel | 2026-10-20 | plat S18 |
| S30 | https://vercel.com/pricing | Pricing | Vercel | current | plat S14 |
| S31 | https://vercel.com/docs/functions/limitations | Vercel Functions Limits | Vercel | last updated 2026-08-24 | plat S16 |
| S32 | https://vercel.com/docs/vercel-sandbox/pricing | Vercel Sandbox pricing and quotas | Vercel | last updated 2026-09-10 | plat S19 |
| S33 | https://docs.partykit.io/ | PartyKit docs | PartyKit | deploys stop 16 Oct, shutdown 23 Oct 2026 | plat S72 |
| S34 | https://github.com/rocicorp/replicache | Replicache | Rocicorp | archived 2026-06-10 | plat S73 |
| S35 | https://developers.cloudflare.com/durable-objects/platform/pricing/ | Durable Objects pricing | Cloudflare | current | plat S20 |
| S36 | https://developers.cloudflare.com/r2/pricing/ | R2 pricing | Cloudflare | current | plat S21 |
| S37 | https://developers.cloudflare.com/workers/platform/pricing/ | Workers pricing | Cloudflare | current | plat S22 |
| S38 | https://docs.fly.io/about/pricing | Fly.io resource pricing | Fly.io | current | plat S24 |
| S39 | https://neon.com/pricing | Pricing | Neon | current | plat S27 |
| S40 | https://supabase.com/pricing | Pricing | Supabase | current | plat S26 |
| S41 | https://liveblocks.io/pricing | Pricing | Liveblocks | current | plat S31 |
| S42 | https://tldraw.dev/community/license | tldraw SDK license | tldraw | current | plat S32 |
| S43 | https://caniuse.com/webgpu | WebGPU | Can I use | 87.82% global, 2026-10-26 | plat S70 |
| S44 | local: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/research/tech/bench.mjs` (copy with bench.html in `/Users/amar/iynk-master-plan-scratch/research/tech-review/`) | SVG versus Canvas 2D micro-benchmark | plat dossier author | run 2026-10-26, Chromium 156 headless, M4 Pro | plat S78 |
| S45 | https://reactflow.dev/learn/advanced-use/performance | Performance | xyflow | current | plat S39 |
| S46 | https://konvajs.org/docs/performance/All_Performance_Tips.html | All Performance Tips | Konva | current | plat S41 |
| S47 | https://github.com/wokwi/wokwi-elements | wokwi-elements | Wokwi | MIT, pushed 2026-10-25 | plat S43 |
| S48 | https://github.com/dmonad/crdt-benchmarks | crdt-benchmarks | Kevin Jahns | old library versions | plat S46 |
| S49 | https://automerge.org/blog/automerge-3/ | Automerge 3.0 | Automerge | July 2025 | plat S47 |
| S50 | https://rapier.rs/docs/user_guides/javascript/determinism | Determinism (and Getting started) | Dimforge | current | plat S48, S49 |
| S51 | https://github.com/google-deepmind/mujoco/tree/main/wasm | MuJoCo WASM bindings | Google DeepMind | README notes 2025-11-13 | plat S50 |
| S52 | https://github.com/jrouwe/JoltPhysics.js | JoltPhysics.js (and JoltPhysics) | Jorrit Rouwe | current | plat S51, S52 |
| S53 | https://docs.px4.io/main/en/simulation/ | Simulation | PX4 | main branch | plat S56 |
| S54 | https://ardupilot.org/dev/docs/sitl-simulator-software-in-the-loop.html | SITL Simulator | ArduPilot | current dev docs | plat S55 |
| S55 | https://github.com/JSBSim-Team/jsbsim | JSBSim | JSBSim Team | v1.3.3 referenced | plat S54 |
| S56 | https://arxiv.org/abs/2009.00563 | Flightmare: A Flexible Quadrotor Simulator | Song et al., arXiv | v2, 2021-05-09 | plat S57 |
| S57 | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe | iframe element, sandbox attribute | MDN | current | plat S63 |
| S58 | https://github.com/endojs/endo/tree/master/packages/ses | SES README | Endo / Agoric | `ses` 2.3.0 | plat S62 |
| S59 | https://github.com/extism/extism | Extism README | Extism | npm 2.0.0-rc13 (2025-05-14) | plat S60 |
| S60 | https://component-model.bytecodealliance.org/ | The WebAssembly Component Model | Bytecode Alliance | WASI 0.2.0 (2024-01-25) | plat S61 |
| S61 | https://github.com/firecracker-microvm/firecracker/blob/main/SPECIFICATION.md | Firecracker specification | AWS | main branch | plat S65 |
| S62 | https://gvisor.dev/docs/architecture_guide/performance/ | Performance Guide | gVisor | current | plat S64 |
| S63 | https://github.com/google/nsjail | nsjail README | Google (not official) | current | plat S66 |
| S64 | https://e2b.dev/pricing | Pricing | E2B | current | plat S30 |
| S65 | https://platform.claude.com/docs/en/about-claude/pricing | Pricing | Anthropic | Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5 | plat S1 |
| S66 | https://platform.claude.com/docs/en/build-with-claude/prompt-caching | Prompt caching | Anthropic | first 100,000 of 162,264 characters read | plat S3 |
| S67 | https://ai.google.dev/gemini-api/docs/pricing | Gemini API pricing | Google | price changes 2026-12-01 and 2027-01-01 | plat S4 |
| S68 | https://developers.openai.com/api/docs/pricing | API pricing | OpenAI | current | plat S6 |
| S69 | https://aiweekly.co/alerts/meta-prices-muse-spark-11-api-at-125425-per-m-tokens | Meta prices Muse Spark 1.1 API (citing CNBC); Meta blog https://ai.meta.com/blog/introducing-muse-spark-meta-model-api/ had no price | AI Weekly; Meta | 2026-07-09/10 | plat S8, S9 |
| S70 | https://docs.fireworks.ai/serverless/pricing | Serverless pricing | Fireworks AI | current | plat S11 |
| S71 | local: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/research/tech/cost.py` (copy in `/Users/amar/iynk-master-plan-scratch/research/tech-review/`) | Tutoring session cost model | plat dossier author | run 2026-10-26 | plat S79 |
| S72 | https://github.com/RobotWebTools/rosbridge_suite | rosbridge_suite (also roslib, foxglove-sdk, urdf-loaders per plat S53, S68) | Robot Web Tools | ROS 2 Humble, Jazzy, Rolling | plat S69 |
| S73 | https://github.com/gkjohnson/urdf-loaders | urdf-loaders README | gkjohnson | 0.13.1 (2026-07-08) | plat S53 |
| S74 | https://www.govinfo.gov/content/pkg/FR-2025-04-22/html/2025-05904.htm | Children's Online Privacy Protection Rule, Federal Register vol. 90 no. 76 | FTC | final rule 22 Apr 2025; effective 23 Jun 2025; compliance 22 Apr 2026 | comp S1 |
| S75 | https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions | Complying with COPPA: FAQ | FTC | sections D and H read; N (schools) not read | comp S6 |
| S76 | https://privacy.a4l.org/national-dpa/ | National Data Privacy Agreement | A4L Student Data Privacy Consortium | NDPA v2.2 | comp S11, S12 |
| S77 | https://gdpr-info.eu/art-8-gdpr/ | GDPR Article 8 | gdpr-info.eu (unofficial) | Regulation (EU) 2016/679 | comp S13 |
| S78 | https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/ | Age appropriate design: a code of practice | ICO | current | comp S15 |
| S79 | https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/ | DPDP Rules 2025: key highlights | SCC Online | Rules notified 14 Nov 2025; secondary source | comp S17 |
| S80 | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm | Lei 13.709/2018 (LGPD), Art. 14 | Presidency of Brazil | first 100,000 of 125,310 characters read | comp S18 |
| S81 | https://artificialintelligenceact.eu/annex/3/ | Annex III: High-Risk AI Systems | Future of Life Institute (unofficial) | Regulation (EU) 2024/1689 | comp S19 |
| S82 | https://artificialintelligenceact.eu/article/6/ | Article 6 | Future of Life Institute (unofficial) | current | comp S20 |
| S83 | https://artificialintelligenceact.eu/article/5/ | Article 5 | Future of Life Institute (unofficial) | current | comp S21 |
| S84 | https://artificialintelligenceact.eu/article/50/ | Article 50 | Future of Life Institute (unofficial) | applies from 2 Aug 2026 | comp S24 |
| S85 | https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act | Timeline for the implementation of the EU AI Act | European Commission | dates marked as amended by the Digital Omnibus | comp S22 |
| S86 | https://ai.google.dev/gemini-api/terms | Gemini API Additional Terms of Service | Google | as shown 2026-10-26 | comp S26 |
| S87 | https://www.w3.org/TR/WCAG22/ | WCAG 2.2 | W3C | Recommendation 12 Dec 2024 | comp S27 |
| S88 | https://www.ada.gov/resources/web-rule-first-steps/ | First Steps Toward Complying with the ADA Title II Web Rule | US Department of Justice | extended dates 26 Apr 2027 and 26 Apr 2028 | comp S29 |
| S89 | https://www.itic.org/policy/accessibility/vpat | VPAT | ITI | VPAT 2.5 | comp S31 |
| S90 | https://www.clever.com/developers | Clever developer and partner page | Clever | as shown 2026-10-26 | comp S34 |
| S91 | https://www.1edtech.org/standards/lti | Learning Tools Interoperability | 1EdTech | LTI 1.3 / Advantage | comp S33 |
| S92 | https://www.law.cornell.edu/uscode/text/49/44809 | 49 U.S.C. 44809 | Cornell LII | current | comp S42 |
| S93 | https://www.easa.europa.eu/en/domains/drones-air-mobility/operating-drone/open-category-low-risk-civil-drones | Open category, low-risk civil drones | EASA | current | comp S44 |
| S94 | https://www.law.cornell.edu/cfr/text/15/734.7 | 15 CFR 734.7 Published | Cornell LII | current | comp S45 |
| S95 | https://pmc.ncbi.nlm.nih.gov/articles/PMC8171217/ | Recreational Drone-Related Injuries in Children (NEISS) | Cureus, Khan and Brown | 2021, 26 records 2010 to 2019 | comp S38 |
| S96 | local: `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/01_AUDIT/SECURITY_BASELINE.md` | iynk security baseline | iynk audit | commit bb546d6, 2026-10-26; not re-tested by the fact-checker | comp S40 |
| S97 | https://en.wikipedia.org/wiki/Lithium_polymer_battery ; https://www.nfpa.org/education-and-research/home-fire-safety/lithium-ion-batteries | Lithium polymer battery (community source); Lithium-Ion Battery Safety (outline only loaded) | Wikipedia; NFPA | current | comp S37, S36 |
| S98 | https://studentprivacy.ed.gov/ferpa | FERPA | US Department of Education | summary of 34 CFR Part 99 | comp S8 |
| S99 | https://github.com/davidmonterocrespo24/velxio and https://velxio.dev (pricing) | Velxio | David Montero Crespo | AGPLv3 plus paid commercial licence; pricing as of 2026-10-26 | competitors/embedded-sim.md (S4 to S7) |
| S100 | `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/02_RESEARCH/WORKFLOW_BENCHMARK.md` | Workflow benchmark: Wokwi, Falstad, MakeCode micro:bit, iynk | bench:hands-on dossier | scripted single runs 2026-10-26 | bench:hands-on |
| S101 | `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/02_RESEARCH/competitors/ai-hardware.md` | AI-native hardware design and engineering-assistant competitors | comp:ai-hardware dossier | 2026-10-26 (Flux, Arduino AI Assistant, Wokwi, r/arduino thread) | comp:ai-hardware |

## Review log (2026-10-27)

Adversarial review by a second agent. Method: read the whole file; traced 24 decision-relevant statements to the dossiers and their fact-check logs; recomputed every derived number; re-opened 10 source pages (list below); ran line counts on the repo.

**Re-fetched 2026-10-27 and confirmed:** Anthropic pricing page (Haiku 5.5 0.10/0.01/0.50 up to 100k tokens, Sonnet 5.5 2/0.10/10, Opus 5.5 4/0.20/20) https://platform.claude.com/docs/en/about-claude/pricing ; Gemini API terms (18+, no client likely accessed by under-18s, EEA paid only) https://ai.google.dev/gemini-api/terms ; E2B rates https://e2b.dev/pricing ; Vercel limits (300/800/1800 s, 2 GB and 4 GB) https://vercel.com/docs/functions/limitations ; Vercel pricing (Pro $20 with $20 credit, Hobby non-commercial) https://vercel.com/pricing ; PartyKit shutdown dates https://docs.partykit.io/ ; arduino-cli licence text https://github.com/arduino/arduino-cli ; Espressif QEMU unsupported peripherals https://github.com/espressif/esp-toolchain-docs/blob/main/qemu/README.md . Not re-fetched: Fireworks, Cloudflare, Neon, Supabase, Liveblocks, Meta, GitHub star counts (the dossiers' own fact-check logs say Fireworks, R2, Containers, E2B and the physics and sandbox library claims were not re-checked by them).

**Recomputed and correct:** platform baseline ($46 and $27 per month), compile costs ($0.00046 E2B, $0.00095 Vercel, $0.000026 Fly), SITL per-session costs ($0.0047, $0.083, $0.17), the AI cost table (re-ran cost.py: all rows match), the 80/20 routing mix ($32.88 per 1,000), avr8js MHz-equivalents (52/16 = 3.3x, 104/16 = 6.5x), the compliance engineering sum (10.2 to 17 weeks, stated as 10 to 17).

**Wrong or overclaimed, now corrected:**
1. F9 said SVG beat Canvas "at 3,000 parts and above". The dossier table shows the gap from 1,500 parts (63,000 elements: 16.7 vs 38.9 ms) and a Canvas p95 miss already at 500 parts with 40 primitives. Corrected, and the test limits (one part moved per frame, vsync cap hides headroom) added to F9 and D4.
2. Section 7 spike total "15 to 18 person-weeks" did not match the table. Sum of section 6 is about 16 to 21 weeks, or 14 to 18 without the two elapsed-time legal and founder items. Corrected.
3. D2 option B stated "batch only, no halt and resume" as a fact. The dossier derives it from build flags (HYPOTHESIS). Downgraded.
4. D1 avr8js and rp2040js TESTED speeds omitted that they came from synthetic loops, one run, not reproduced by the fact-checker. Qualified.
5. D9 "Vercel Sandbox is Firecracker-based" rests on a related page title. Downgraded to HYPOTHESIS.
6. F1 implied Replicache's closure left nothing; its maker's Zero product is live and unevaluated. Noted.
7. Baseline line count for the Arduino interpreter was 3,700; the repo has 3,880 (3,714 without types.ts). Corrected.
8. D11 evidence said Wokwi has no AI; the dossier also records an experimental Wokwi CLI MCP server. Added.
9. G11 listed ADA Title II dates without saying it binds public entities, not iynk. Added.
10. EU AI Act Art. 50 date was given without the Digital Omnibus caveat that section 8 applies to the high-risk dates. Caveat added; adoption status still UNKNOWN.
11. F5 and G3 rest on iynk's security baseline, which the compliance fact-checker did not re-test. Stated. India DPDP timing labelled secondary-source only.
12. F11 "no message" caveat added (text-entered circuits, Falstad hover readout not checked).
13. Scratch scripts behind TESTED figures lived only in a session scratch folder; copies saved and linked in section 0 and the sources.

**Left as written (checked, not refuted):** F2, F3 (now with re-check note), F4 (Gemini price changes, per platform dossier fact-check item 6, not re-fetched by me), F6, F7, F8 (WebGPU figures from caniuse via the dossier, not re-fetched), F10, route cost ranges in G1 (they rest on an unsourced USD 300 to 500 lawyer rate, which section 0 already says), the Meta Muse Spark price (secondary report, already labelled).

**Not checked:** phone and Chromebook performance (UNKNOWN throughout), every TESTED benchmark figure beyond recomputing ratios (I could not rerun the simulator benchmarks' node_modules here), legal conclusions.

**Counts:** 24 statements traced; 13 changes (items above); 0 findings deleted.
