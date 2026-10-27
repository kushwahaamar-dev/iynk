# Browser MCU simulators and embedded IDEs: competitors

Researched 2026-10-26. Labels: TESTED (done hands-on), EXTERNAL (a cited source states it), ESTIMATED, HYPOTHESIS, UNKNOWN. Nothing here was TESTED hands-on: this pass was read-only research through page fetches and searches, with no accounts created. Several fetches returned page text through a summarising tool, so figures such as GitHub stars are as shown on 2026-10-26 and may have moved. Prices are "as of 2026-10-26".

## Summary (what this category means for iynk)

- Wokwi is the clear leader and the main reference point. It simulates 18 MCU variants, has a custom-chip API, a VS Code extension, cloud CI, GDB, a logic analyzer and a classroom licence [S15][S16][S17][S18][S21]. Its emulators avr8js and rp2040js are MIT and reusable [S2][S3].
- Wokwi's free tier still gives unlimited simulations and public projects [S1]. Its paywalls are private projects, custom library uploads, fast builds and the VS Code tooling [S1]. iynk cannot win on "free simulator" alone.
- Wokwi has no robotics or drone lab, no six-language UI claim, no AI lab partner and no parts-price or BOM flow that I could find in its docs or pricing page [S1][S24]. Those are UNKNOWN to absent, not proven absent.
- Tinkercad Circuits is the education incumbent. It supports Arduino Uno, micro:bit and ATtiny, has CodeBlocks and text code, and is said to name Google Classroom and Canvas for LMS (unconfirmed on re-check) [S28][S30]. Its limits (no custom libraries, small part set) come from Wikipedia and forum users, not Autodesk [S28][S31]. Autodesk's own pages did not load here. The earlier "100 million users" figure was wrong: the sources found say 100 million designs (2018) and, on a Google Workspace listing from November 2024, "over 86 million people" (vendor-style, unaudited) [S32][S48].
- Velxio (AGPL, launched 2026) is the closest new competitor. It adds QEMU ESP32 and Pi Linux, ngspice analog, 150+ parts, custom chips, an AI agent and MCP, a Docker self-host and a paid classroom plan [S4][S5][S6]. It reports 15,000+ registered developers (vendor claim) [S4]. Its own site claims 35 boards and "2.6k+" stars, while the repo shows 3.5k stars [S5][S6]. It was built with AI help and reuses Wokwi's emulators and part elements [S7].
- Browser-only analog fidelity is thin everywhere. Tinkercad claims analog parts [S28]; Velxio uses ngspice [S5]; Wokwi has no SPICE-level model that I found. iynk's home-made circuit solver and fault injection are a possible gap, but only if they hold up under test (HYPOTHESIS).
- Arduino Cloud is now owned by Qualcomm (The Register says it was bought in October 2025; the exact completion date is UNKNOWN) and its November 2025 terms drew criticism, including an irrevocable perpetual licence on uploads (Adafruit's description) and a ban on reverse engineering [S9][S44]. That creates trust room for an open, no-lock-in lab (HYPOTHESIS).
- PlatformIO is a toolchain, not a simulator. It is the dominant build and debug layer (7.4 million VS Code installs) [S38], and Wokwi plugs into it [S17]. iynk should export to PlatformIO and Arduino CLI projects, not compete with it.
- Nobody here lets a user create an original robot or drone project with simulation. Everyone covers boards and circuits only. That is iynk's likely opening, matched to its three labs (HYPOTHESIS).

## Products

### 1. Wokwi (wokwi.com)

- **What it is.** Browser simulator for Arduino (Uno, Mega, Nano), ESP32 family, STM32, Raspberry Pi Pico and ATtiny85, with a diagram editor, code editor and MicroPython support [S15][S20]. Also a VS Code extension, a CLI and cloud CI [S17][S18].
- **Owner.** Wokwi B.V. (footer copyright 2019-2026; not re-verified in the fact-check) [S20]. Founder name not stated on the pages I fetched; a podcast and a forum result link Uri Shaked to its creation [S45] (EXTERNAL, indirect). No acquisition announcement found.
- **Audience.** Hobbyists, ESP32 and Arduino developers, firmware teams (CI), universities (Classroom page logos: NUS, HTL Moedling, Harvard; the earlier UCF logo is not on the page as fetched) [S21].
- **Pricing (as of 2026-10-26, EUR, annual billing, wokwi.com/pricing) [S1].**

| Plan | Price | Notes |
|---|---|---|
| Community | EUR 0 | Unlimited simulations, unlimited public projects, virtual WiFi. Pricing page labels it "for open source projects"; library upload limited to Library Manager libraries |
| Hobby | EUR 5.6/month | 100 fast build minutes, unlisted projects, custom library uploads, private IoT gateway |
| Hobby+ | EUR 8.1/month | 500 fast build minutes, Wokwi for VS Code, custom WiFi access points |
| Wokwi Pro | EUR 20/seat/month | 1,000 fast build minutes, 2,000 CI minutes, offline VS Code plug-in, team billing |
| Classroom | EUR 30 per student per semester (4 months), minimum 5 students; an annual option is also offered | Includes Pro features, VS Code, offline on request. Not priced on the pricing page, which says to request a quotation; the price is on the Classroom page [S21][S1] |

  CI minute allowances per docs (confirmed): Free 50, Hobby 200, Hobby+ 500, Pro 2000, on a rolling 30 days; per-run cap 5/5/10/50 minutes [S18]. The pricing page itself lists CI minutes only for Pro (2,000) [S1]. The pricing page and the CI page use slightly different plan names ("Free" vs "Community") [S1][S18].
- **Licence.** Simulator service is proprietary (UNKNOWN: no source states it). avr8js: MIT, 852 stars, https://github.com/wokwi/avr8js [S2]. rp2040js: MIT, 533 stars, https://github.com/wokwi/rp2040js [S3]. wokwi-elements (SVG parts): MIT, 266 stars, https://github.com/wokwi/wokwi-elements [S39].
- **What a user can do.** 18 MCU variants, 67 listed parts in 8 part categories plus microcontrollers (10 ESP32-family chips; C5, P4, S31 in beta; 3 AVR, 3 STM32, 2 Pico families) [S15]. ESP32 peripherals: GPIO, UART, SPI, I2C master, LEDC, ADC, WiFi simulated; Bluetooth not implemented on any chip; I2S and CAN partial [S22].
- **Original projects.** Yes, any user can create projects. Free projects are public [S1]. Firmware can be built online or loaded from a local ELF in VS Code [S17].
- **Custom components.** Chips API (beta): chips written in C or any WebAssembly language, experimental Verilog, logic in `chip_init()`, printf debugging [S16]. Plan limits for custom chips not stated (UNKNOWN). Custom Arduino/ESP32 library upload is paid-only [S1].
- **Debugging.** GDB via VS Code for ESP32 and AVR; virtual logic analyzer for UART, I2C, SPI [S23][S24].
- **Collaboration.** Public project links; no real-time co-editing found in docs (UNKNOWN).
- **Education.** Classroom licence at EUR 30/student/semester; page lists no LMS integration or teacher tools beyond Pro features [S21].
- **Export.** Local VS Code toolchains: PlatformIO, ESP-IDF, Pico SDK, Zephyr, NuttX, Rust, Arduino CLI, MicroPython [S17].
- **Community signals.** VS Code extension 351,162 installs, about 4.5 stars from 20 ratings, seen 2026-10-26; the listing says it is a commercial product needing a licence after a free trial [S37]. Version v4.1.0 was not re-verified. wokwi-features issue tracker: 171 open issues, mostly enhancement requests, notably new chip support (STM32C071) [S19]. No vendor user count found; an Exploding Topics page quotes 301K search volume, which is search interest, not users [S46].
- **Limitations users report.** Timing: a 2022 MicroPython forum user found uasyncio ran slower than hardware, and a commenter put the Arduino sim at about 80% real speed [S33]. A 2022 Arduino forum thread says GRBL hung in Wokwi versus a real Uno [S34]. A DroneBot Workshop user said a LED across supply and ground does not burn out in Wokwi whereas Tinkercad shows failure [S34]. Free tier: no library upload, public-only projects, shared IoT gateway [S1]. These threads are 2022-era (EXTERNAL, may be stale).
- **What iynk could learn or reuse.** (a) The `diagram.json` + `wokwi.toml` convention and the CI "scenario" idea (press buttons, check serial output) [S18]. (b) avr8js and rp2040js (MIT) are reusable inside iynk if it wants real AVR/RP2040 binaries instead of its own interpreters; check bundle size and tie-in to iynk's Arduino C++ subset (HYPOTHESIS). (c) Per-student-per-semester Classroom pricing is a benchmark. (d) Failure modeling is a visible gap users note (LED burn-out) [S34].

### 2. Autodesk Tinkercad Circuits (tinkercad.com/circuits)

- **What it is.** Browser circuit simulator inside Tinkercad. Supports Arduino Uno, micro:bit and ATtiny; code via CodeBlocks, text, or both; prebuilt "Starters" [S28][S29]. The Help Center describes a 2D workspace with a components panel, wiring, and code for Arduino and micro:bit [S29].
- **Owner.** Autodesk (announced acquisition May 2013) [S28].
- **Audience.** Schools, grades 4-12 mostly, per a district page cited by a search result [S32]. Autodesk's own blog page returned HTTP 403 here. The earlier "100 million Tinkercad users" figure is not supported: a 2018 post says 10 million users and 100 million designs, and a Google Workspace Marketplace listing (updated November 2024) says "over 86 million people". No current official user count was found (UNKNOWN) [S32][S48].
- **Pricing.** Wikipedia and third-party guides call it free [S28][S31]. I could not load an Autodesk page confirming current terms (UNKNOWN as of 2026-10-26).
- **Licence.** Proprietary.
- **What a user can do.** Wikipedia: simulates analog components, multi-board, built-in libs for Adafruit NeoPixel, Arduino Servo and an I2C display; custom libraries cannot be added [S28]. micro:bit supports Python, breakpoints and variable hover [S29].
- **Original projects.** Yes, accounts create circuits. A tutorial says to create a personal account first [S31]. Students can join a class by code with no email, per a 2026 blog (third-party) [S31].
- **Custom components.** None found; custom libraries cannot be selected or uploaded [S28].
- **Debugging.** micro:bit breakpoints [S29]; Serial Monitor for Arduino [S31]. No GDB.
- **Collaboration and education.** Teacher accounts and class management (third-party) [S31]. UNCONFIRMED: the earlier claim that the official teachers page names Google Classroom and Canvas did not hold up; on re-fetch the page returned only its title [S30]. Costs: UNKNOWN.
- **Export.** Circuits can go to Fusion 360 / PCB design, per a 2022 trade article [S32]. Export of firmware to a real toolchain: UNKNOWN.
- **Community.** 16 languages stated in a search summary of Autodesk material (EXTERNAL, low confidence) [S32].
- **Limitations users report.** Limited component library (Arduino forum teacher), no oscilloscope-style analog analysis per a blog, no ESP32 [S31][S43].
- **What iynk could learn.** Starters (prebuilt circuits with code view), class-code join with no email, and Google Classroom / Canvas hooks. Tinkercad shows a destroyed LED on wrong wiring, which iynk's fault injection can exceed [S34].

### 3. Arduino Cloud and Cloud Editor (cloud.arduino.cc)

- **What it is.** Web IDE (Cloud Editor) plus IoT platform (Things, dashboards, OTA, device provisioning) [S40]. No simulator; it compiles and uploads to real boards. It has an AI Assistant (Claude-powered per CNX Software, 2025-04-28; the same article puts it in the Maker plan at $6.99/month at that time, now superseded) [S45].
- **Owner.** Arduino, a Qualcomm subsidiary since October 2025 [S9].
- **Audience.** Makers, schools, small IoT teams.
- **Pricing (USD, cloud.arduino.cc/plans, as of 2026-10-26) [S8].**

| Plan | Price | Key limits |
|---|---|---|
| Free | $0 | 2 Things, 1 day retention, 25 compilations/day, 30 AI interactions/month, 1 user |
| Maker | $72/year | 25 Things, 3 months retention, unlimited compiles, 1,500 AI interactions/month ("personal use only" not re-verified: UNKNOWN) |
| Team | $1,000/year | 50 users, 100 Things, 1 year retention, unlimited AI interactions |
| Enterprise | custom | unlimited Things and users, 2 years retention |
| School | $20/member/year | 5 Things per member, 6 months retention, shared space, course library, Google Classroom integration, 1,500 AI interactions/month |

  The page states "$" only; currency code not given. Prototyping offer $240 per 6 months. The 30-day trial is started with a credit card at signup, but "Alternative Payment Methods" (bank transfer, cheque) are offered at checkout [S8].
- **Licence.** Cloud services proprietary. Arduino says the new terms' restrictions apply to SaaS only, not the open-source IDE or hardware [S44].
- **What a user can do.** Edit, compile, upload sketches; build IoT dashboards; share sketches; classroom shared spaces [S40].
- **Original projects.** Yes, but for real hardware only.
- **Debugging.** Serial monitor; no simulation. (UNKNOWN beyond this.)
- **Education.** School plan with Google Classroom integration and a course library [S8][S40].
- **Community signals.** Late-2025 backlash: perpetual, irrevocable licence over uploads, reverse-engineering ban, expanded data collection, Adafruit calling it a break from the open-hardware ethos [S9][S44]. Compile outages logged: 2025-04-04 (38 min), 2025-10-20 (AWS), 2026-06-08 (about 2 hours) [S42]. The free 25-compiles/day quota is stated by the plan page and an undated German article [S8][S41].
- **What iynk could learn.** A per-member school price ($20/year) is the education benchmark. The trust problem after the Qualcomm terms is an opening: publish a plain licence on user content (HYPOTHESIS).

### 4. PlatformIO (platformio.org)

- **What it is.** Open-source embedded build, library and debug toolchain with a VS Code extension, a CLI (PlatformIO Core), Unified Debugger, unit testing and PIO Remote [S10][S11][S13].
- **Owner.** PlatformIO Labs (sponsor named on the site) [S47].
- **Pricing.** platformio.org/pricing returned only navigation, no plans [S46]. A PlatformIO community post dated 2019-06-18 says PIO Plus features (Unified Debugger, Unit Testing, PIO Remote) were made free and the debugger moved into Core under Apache 2.0 [S12]. The Premium Support page listed no prices [S47]. As of 2026-10-26, no paid price could be verified; treat the "everything core is free" status as EXTERNAL and dated.
- **Licence.** PlatformIO Core: Apache-2.0, https://github.com/platformio/platformio-core, 9.6k stars [S10].
- **What a user can do.** Build for 300+ boards, one-click hardware debug via `platformio.ini`, variable and register views, memory viewer, test debugging [S13]. Remote agent lets you upload and monitor devices from anywhere, with a free account, outbound-only connection [S11]. Its debug tool list includes simulators such as QEMU, Renode, simavr and Verilator [S13].
- **Original projects.** Yes (any firmware project). No circuit editor, no browser use for the core (cloud IDE is an external host with the browser as client) [S11].
- **Collaboration.** Shared remote devices with team members [S11].
- **Community.** VS Code extension: 7,430,893 installs, 4,136 reviews, v3.3.4 [S38]. Pain: Cursor and other VS Code forks do not get it from Open VSX, and it depends on Microsoft's C/C++ extension (2025-2026 forum threads) [S14].
- **What iynk could learn or reuse.** Export an iynk project as a `platformio.ini` + `src/` folder so a user can leave the browser with real firmware. Wokwi already integrates this way [S17].

### 5. Velxio (velxio.dev)

- **What it is.** Open-source browser simulator for Arduino, ESP32, RP2040, STM32 and Raspberry Pi boards. Source on GitHub, hosted at velxio.dev, one Docker image to self-host [S4][S5].
- **Owner.** David Montero Crespo (author of the Espressif-site article) [S4].
- **Audience.** Hobbyists, ESP32 developers, classrooms; self-hosters.
- **Pricing (USD, velxio.dev, as of 2026-10-26) [S6].**

| Plan | Monthly | Annual | Notes |
|---|---|---|---|
| Free | $0 | n/a | 30+ boards, custom chips, Library Manager, private and public projects, basic AI chat (50 messages/day), 20 daily AI credits, 3 x 15-minute trials each for STM32, Pi Linux, UNIHIKER; ESP32 runs time-capped; no Agent or Tutor mode |
| No AI | $3.00 | $36 | No AI features; STM32 and Pi Linux unlimited, premium components, unlisted projects, 200 CI minutes/month |
| Maker | $5.75 | $69 | Agent and Tutor modes, 500 daily AI credits, 200 CI minutes/month |
| Pro | $15.75 | $189 | MCP connection for an AI agent (Claude Code or Codex not named on the fetched page), 2,000 daily AI credits, My Chips library, BOM (CSV) and schematic PNG exports, GitHub Sync, 2,000 CI minutes/month |
| Classroom | from $34 per student per year | | 5-student minimum, every student gets Pro [S6] |

- **Licence.** AGPLv3 core with a paid commercial licence (confirmed AGPLv3 plus paid commercial licence; the page gives no SPDX suffix, so "-only" or "-or-later" is UNKNOWN), 3.5k stars, 363 forks, 2,122 commits. Repo https://github.com/davidmonterocrespo24/velxio [S5].
- **What a user can do.** Real CPU emulation: avr8js and rp2040js in browser, QEMU for ESP32, STM32 and Pi Linux (server-side). arduino-cli and ESP-IDF build real binaries on the server. ngspice-wasm analog layer. Oscilloscope, serial monitor, 150+ parts, 400+ examples, MicroPython and ESP-IDF on ESP32 [S4][S5]. Board count is inconsistent: README "40 boards", repo sidebar "19 real boards", site "35 boards across 6 CPU architectures", article "over 30" [S4][S5][S6][S7].
- **Original projects / custom components.** Yes; custom chips in C compiled to WebAssembly [S5].
- **AI.** Agent mode designs circuits, writes code, compiles and checks its own work; read-only Tutor mode; MCP server [S4][S6]. AI agent is paid [S4].
- **Collaboration.** UNKNOWN beyond GitHub Sync [S6].
- **Export.** BOM and schematic PNG on Pro; ELF/BIN upload was requested on HN [S6][S7].
- **Community.** Vendor states 15,000+ registered developers and 1,000+ simulations a day, mid-2026 [S4]. Show HN thread "Velxio 2.0" (196 points, 25 comments, 213 days old at snapshot) praised the visual editor and zero-setup, ran on an old Android phone, but flagged: compile-before-Play confusion, 8 MB splash image, no ELF upload, no ESP32-C6 at the time, doubts about timing, AI-built GUI [S7].
- **Limitations.** Cold ESP32 builds take minutes [S4]; ESP32 and Pi run on backend QEMU, not client-side [S7]; AVR is wall-clock synced but RP2040 and ESP32-C3 use fixed cycles per frame, so time can stretch [S7].
- **What iynk could learn.** The MCP + AI agent pitch, the Pro-tier BOM export and a clear classroom price are all now in market. The AGPL means iynk cannot embed Velxio code in a closed product without a commercial licence (licensing note, not legal advice).

### 6. Cirkit Designer (cirkitdesigner.com)

- **What it is.** Browser and desktop circuit and wiring design app with an Arduino simulator (Uno and Mega only, confirmed), AI assistance ("Cirkit AI", confirmed), and a claimed community library of 30,000+ components (not on the page re-fetched; UNCONFIRMED, came from a search summary) [S26][S27].
- **Owner.** UNKNOWN.
- **Pricing.** "Free to start", with a paid membership for advanced features [S26][S27]. The pricing and membership URLs returned 404; no price verified (UNKNOWN).
- **Licence.** Proprietary (UNKNOWN beyond that).
- **What a user can do.** Draw circuits, write sketches, simulate, export wiring diagrams and share projects [S26]. Not all library components are simulated [S27].
- **Account.** Not clearly stated (UNKNOWN) [S26].
- **What iynk could learn.** Large part library plus wiring-diagram export. Only two boards simulated, so it is a weaker simulator than Wokwi.

### 7. esp32sim (open source, mikroverk/esp32sim)

- **What it is.** Rust ESP32 emulator that boots the real mask ROM, bootloader and unmodified app; has a WebAssembly browser build; unofficial and not affiliated with Espressif [S25].
- **Licence.** MIT, 684 stars, 46 forks, 1,712 commits. https://github.com/mikroverk/esp32sim [S25].
- **Maturity.** ESP32-S3 mature, classic ESP32 early, C3, C6, P4 draft; C3 and P4 console-only [S25].
- **Features.** Virtual WiFi with DHCP, DNS, NTP; board models for displays, touch, LEDs, audio, camera; JTAG lock-step comparison against real S3 [S25].
- **What iynk could learn.** A permissively licensed (MIT) ESP32 core that already compiles to WebAssembly is a candidate for a future "real ESP32 binary" mode (HYPOTHESIS; maturity is the risk).

### 8. Other tools checked

- **SimulIDE CE.** Real-time circuit simulator, desktop, PIC/AVR/Arduino, GPL-3.0, 324 stars, https://github.com/SimulIDE/SimulIDE. Project says it favours speed and simplicity over accuracy [S35]. Not a browser tool.
- **Renode (Antmicro).** MIT, 3.1k stars, https://github.com/renode/renode. Multi-node simulation of unmodified firmware, VS Code extension; a web VS Code route needs a back end [S36]. Professional audience.
- **Proteus, Fritzing.** Mentioned in third-party roundups but not checked here (UNKNOWN).
- **8gwifi.org Arduino & ESP32 simulator.** Third-party site claiming QEMU ESP32, Pico and Pi 3B, reuses wokwi-elements and diagram.json format [S43]. Claims unverified; skipped from the table.

Dropped or unconfirmed: no dead product found among the named five. "Velxio's Wokwi lineage" is described by its author, not confirmed independently [S7].

## Comparison table

Cells show a short value, a label and a source. "UNK" means UNKNOWN. T = TESTED, E = EXTERNAL, H = HYPOTHESIS. No cell is TESTED. All pricing rows are as of 2026-10-26.

### A. Access, project model, hardware

| Product | Free usage | No-account entry | Browser-based | User-created projects | Circuit editor | Custom hardware models |
|---|---|---|---|---|---|---|
| Wokwi | Yes, public projects, unlimited sims (E) [S1] | UNK | Yes (E) [S20] | Yes (E) [S1] | Yes diagram editor (E) [S24] | Chips API in C/Wasm, beta (E) [S16] |
| Tinkercad Circuits | Free per third parties (E) [S28][S31] | No, account needed per tutorial (E) [S31] | Yes (E) [S28] | Yes (E) [S29] | Yes (E) [S29] | No, no custom libs (E) [S28] |
| Arduino Cloud / Editor | Free tier, 25 compiles/day (E) [S8] | UNK | Yes (E) [S40] | Yes, real boards only (E) [S40] | No | N/A |
| PlatformIO | Core free (E, dated) [S10][S12] | Not needed for debug/test, yes for Remote (E, dated) [S11][S12] | CLI/VS Code, not browser (E) [S11] | Yes (E) [S13] | No | N/A |
| Velxio | Free tier (E) [S6] | UNK | Yes (E) [S4] | Yes (E) [S5] | Yes (E) [S5] | Custom chips in C to Wasm (E) [S5] |
| Cirkit Designer | Free to start (E) [S26] | UNK | Yes, plus desktop (E) [S26][S27] | Yes (E) [S26] | Yes (E) [S26] | Community library 30,000+ (unconfirmed) [S27] |
| esp32sim | Yes, MIT (E) [S25] | Yes, static GitHub Pages build (E) [S25] | Yes, Wasm (E) [S25] | Firmware only (E) [S25] | No | Board models in Rust (E) [S25] |

### B. Fidelity and tools

| Product | Firmware compatibility | MCU fidelity | Analog fidelity | Failure modeling | Debugging |
|---|---|---|---|---|---|
| Wokwi | Real toolchains, ELF via VS Code (E) [S17] | Cycle-level AVR and RP2040; ESP32 peripherals mostly done (E) [S15][S22] | No SPICE found (UNK) | Weak, LED not burning (E, 2022) [S34] | GDB, logic analyzer (E) [S23][S24] |
| Tinkercad Circuits | Own blocks/text, no custom libs (E) [S28] | Arduino Uno, micro:bit, ATtiny (E) [S28] | "Fully simulated analog" (E) [S28] | LED failure shown (E) [S34] | micro:bit breakpoints (E) [S29] |
| Arduino Cloud / Editor | Real toolchain build for real boards (E) [S40] | N/A, no simulation | N/A | N/A | Serial only (UNK) |
| PlatformIO | Real toolchain (E) [S13] | Via QEMU, Renode, simavr tools (E) [S13] | N/A | N/A | Unified Debugger, 300+ boards (E) [S13] |
| Velxio | arduino-cli, ESP-IDF real binaries (E) [S4] | QEMU ESP32/STM32/Pi, avr8js, rp2040js (E) [S5] | ngspice-wasm layer (E) [S5] | UNK | Oscilloscope, serial monitor (E) [S5] |
| Cirkit Designer | Uno and Mega (E) [S26] | UNK | UNK | UNK | UNK |
| esp32sim | Unmodified ESP32 apps, real ROM (E) [S25] | S3 mature, others draft (E) [S25] | No | No | JTAG lock-step comparison (E) [S25] |

### C. Labs, AI, language, collaboration, education

| Product | Robotics sim | Drone sim | AI guidance | Multilingual UI | Real-time collab | Curriculum / LMS |
|---|---|---|---|---|---|---|
| Wokwi | No evidence (UNK) | No evidence (UNK) | None found (UNK) | UNK | UNK | Classroom licence, no LMS shown (E) [S21] |
| Tinkercad Circuits | No | No | None found (UNK) | 16 languages, low confidence (E) [S32] | UNK | Google Classroom, Canvas (UNCONFIRMED; teachers page re-fetch showed no text) [S30] |
| Arduino Cloud / Editor | No | No | AI Assistant, Claude-powered (E) [S45] | UNK | Shared class spaces (E) [S40] | School plan, Google Classroom (E) [S8] |
| PlatformIO | No | No | No | No | Shared remote devices (E) [S11] | No |
| Velxio | No | No | Agent, Tutor, MCP (E) [S4][S6] | UNK | UNK | Classroom plan (E) [S6] |
| Cirkit Designer | No | No | Cirkit AI (E) [S26] | UNK | UNK | UNK |
| esp32sim | No | No | No | No | No | No |

### D. Commerce, export, ecosystem

| Product | Physical BOM | Parts purchasing | Export to real toolchains | Plugin extensibility | Pricing | Performance |
|---|---|---|---|---|---|---|
| Wokwi | UNK | UNK | PlatformIO, ESP-IDF, Arduino CLI, Zephyr (E) [S17] | Chips API, VS Code (E) [S16] | EUR 0 to 20/seat/mo; Classroom EUR 30/student/semester (E) [S1][S21] | Paid fast builds; shared free queue (E) [S1] |
| Tinkercad Circuits | UNK | UNK | Fusion 360 PCB path (E, 2022) [S32] | None found | Free (E) [S31] | UNK |
| Arduino Cloud / Editor | No | No | Arduino ecosystem (E) [S40] | Cloud CLI (E) [S41] | Free to $72/yr, School $20/member/yr (E) [S8] | Compile outages logged (E) [S42] |
| PlatformIO | No | No | It is the toolchain (E) [S13] | Extensions, Open VSX gap (E) [S14] | Core free; support price UNK (E) [S12][S47] | UNK |
| Velxio | BOM on Pro (E) [S6] | UNK | BOM, schematic PNG, GitHub Sync (E) [S6] | Custom chips, MCP (E) [S5][S6] | Free to $189/yr; Classroom from $34/student/yr (E) [S6] | Cold ESP32 builds take minutes (E) [S4] |
| Cirkit Designer | UNK | UNK | Wiring diagram export, firmware upload to some hardware (E) [S26] | UNK | Price UNK (E) [S26] | UNK |
| esp32sim | No | No | Takes real binaries (E) [S25] | Rust board models (E) [S25] | MIT, free (E) [S25] | S3 about 30x real time on hello_world (E, vendor) [S25] |

### E. Audience, ecosystem, moat

| Product | Target audience | Ecosystem strength | Moat |
|---|---|---|---|
| Wokwi | Hobbyists, firmware teams, universities (E) [S21] | Strong: 351K VS Code installs, MIT emulators reused by others (E) [S37][S2][S7] | Emulator depth, VS Code and CI tooling, project library (HYPOTHESIS) |
| Tinkercad Circuits | K-12 and intro electronics (E) [S32] | Large: 86M+ users per a Nov 2024 marketplace listing, unaudited (E) [S48] | Autodesk distribution, school accounts (HYPOTHESIS) |
| Arduino Cloud / Editor | Makers, schools, IoT (E) [S8] | Large brand, now with trust risk (E) [S9] | Board brand and bundled IDE (HYPOTHESIS) |
| PlatformIO | Professional embedded developers (E) [S13] | 7.4M installs, 9.6k stars (E) [S38][S10] | Board and toolchain database (HYPOTHESIS) |
| Velxio | ESP32 hobbyists, classrooms, AI-assisted builders (E) [S4][S6] | Early: 3.5k stars, 15K registered (vendor) (E) [S5][S4] | Multi-architecture QEMU plus AI (HYPOTHESIS) |
| Cirkit Designer | Hobbyists wanting wiring diagrams (E) [S26] | UNK | Component library (HYPOTHESIS) |
| esp32sim | Researchers, ESP32 tinkerers (E) [S25] | Small: 684 stars (E) [S25] | Real ROM boot fidelity (HYPOTHESIS) |

## Where iynk could be genuinely different here (HYPOTHESIS unless evidenced)

1. **Original projects across three labs.** None of the products above simulate a robot or drone built by the user, nor link a circuit to a motor, sensor and flight model. iynk already has the labs; the gap is letting users compose their own (HYPOTHESIS). The finding that no competitor docs mention robotics or drone simulation is based on absence in the pages fetched.
2. **Failure and fault modeling as a teaching feature.** Users note Wokwi does not destroy an overloaded LED while Tinkercad does [S34]. iynk's fault injection plus its own circuit solver could be framed as "learn what breaks" (HYPOTHESIS; needs a fidelity test against Velxio's ngspice).
3. **Own-interpreter speed and zero-setup.** iynk runs Arduino C++, MicroPython, Python and Verilog subsets in TypeScript, so no server build step. Velxio's ESP32 cold builds take minutes and Wokwi paid plans sell faster builds [S4][S1]. Trade-off: iynk cannot run arbitrary real binaries without adding avr8js, rp2040js or an ESP32 core (MIT) [S2][S3][S25] (HYPOTHESIS).
4. **Six UI languages and a no-account entry.** No competitor I read states multilingual UI except Tinkercad (16 languages, unverified) [S32]. No-account entry is UNKNOWN for Wokwi and Velxio, so it needs a quick hands-on check before iynk claims it.
5. **Parts prices and BOM from live data.** Only Velxio lists a BOM export (Pro tier) [S6]. iynk's SerpApi prices could make "build it for real" the free path (HYPOTHESIS).
6. **Open, no-lock-in positioning after Arduino's terms backlash.** Arduino Cloud's terms and Qualcomm ownership created distrust [S9][S44]. A plain licence and a full export to PlatformIO or Arduino CLI could be a trust feature (HYPOTHESIS).
7. **Risks.** Wokwi has the lead in MCU depth and tooling; Velxio is moving fast with AI and MCP; Tinkercad owns schools. Wokwi's Classroom price (EUR 30/student/semester), Velxio's ($34/student/year) and Arduino's ($20/member/year) set the paid-education range [S21][S6][S8].

## Sources

All accessed 2026-10-26. "Describes" gives the version or date of the content where known.

- S1. https://wokwi.com/pricing. Wokwi Pricing. Wokwi B.V. Describes plans in force 2026-10-26 (page shows only (c) 2019-2026).
- S2. https://github.com/wokwi/avr8js. avr8js repository. Wokwi. MIT, 852 stars, no releases listed.
- S3. https://github.com/wokwi/rp2040js. rp2040js repository. Wokwi. MIT, 533 stars.
- S4. https://developer.espressif.com/blog/2026/07/velxio-browser-based-esp32-simulation/. Velxio: browser-based ESP32 simulation. Espressif developer portal, community post by Velxio's author. Dated 2026-07-31 (re-fetched in fact-check). Not verified by Espressif.
- S5. https://github.com/davidmonterocrespo24/velxio. Velxio repository. David Montero Crespo. AGPLv3 with commercial licence, 3.5k stars.
- S6. https://velxio.dev. Velxio pricing and plans. Velxio. Content as of 2026-10-26.
- S7. https://hn.nuxt.dev/item/47548013. Hacker News discussion of Velxio 2.0 (mirror). About 7 months before 2026-10-26; absolute date not shown.
- S8. https://cloud.arduino.cc/plans/. Arduino Cloud plans. Arduino. Copyright 2026.
- S9. https://www.theregister.com/2025/11/21/adafruit_makers_unhappy_with_arduino. Makers slam Qualcomm for tightening the clamps on Arduino. The Register. 2025-11-21.
- S10. https://github.com/platformio/platformio-core. PlatformIO Core. PlatformIO Labs. Apache-2.0, 9.6k stars.
- S11. https://docs.platformio.org/en/latest/plus/pio-remote.html. PIO Remote documentation. PlatformIO. Latest docs.
- S12. https://community.platformio.org/t/platformio-plus-goes-open-source-improving-embedded-development-community-worldwide/8240. PlatformIO Plus goes open source. PlatformIO community forum. Date not captured (older post); read via search summary only.
- S13. https://docs.platformio.org/en/latest/plus/debugging.html. PIO Unified Debugger. PlatformIO. Latest docs; first 100,000 of 227,560 characters read.
- S14. https://community.platformio.org/t/platformio-in-cursor-publication-to-openvsx/48602. PlatformIO in Cursor, publication to Open VSX. PlatformIO community. 2025-2026; read via search summary only.
- S15. https://docs.wokwi.com/getting-started/supported-hardware. Wokwi supported hardware. Wokwi docs. Latest.
- S16. https://docs.wokwi.com/chips-api/getting-started. Wokwi Chips API. Wokwi docs. Beta.
- S17. https://docs.wokwi.com/vscode/getting-started. Wokwi for VS Code. Wokwi docs. Extension v4.1.0.
- S18. https://docs.wokwi.com/wokwi-ci/getting-started. Wokwi CI. Wokwi docs. Latest.
- S19. https://github.com/wokwi/wokwi-features/issues. Wokwi feature and bug tracker. Wokwi. 171 open issues, first page only read.
- S20. https://wokwi.com/. Wokwi home page. Wokwi B.V. 2026.
- S21. https://wokwi.com/classroom. Wokwi Classroom. Wokwi B.V. 2026.
- S22. https://docs.wokwi.com/guides/esp32. Wokwi ESP32 guide. Wokwi docs. Latest.
- S23. https://docs.wokwi.com/vscode/debugging. Wokwi VS Code debugging. Wokwi docs. Latest.
- S24. https://docs.wokwi.com/. Wokwi docs home. Wokwi. Latest.
- S25. https://github.com/mikroverk/esp32sim. esp32sim. mikroverk. MIT, 684 stars. Found via a Show HN summary, launch date unverified.
- S26. https://www.cirkitdesigner.com/arduino-simulator. Cirkit Designer Arduino simulator. Cirkit Designer. 2026, marketing page.
- S27. https://www.cirkitdesigner.com. Cirkit Designer home. Read via search summary only; pricing URL returned 404.
- S28. https://en.wikipedia.org/wiki/Tinkercad. Tinkercad. Wikipedia. Secondary source, current revision at access.
- S29. https://www.tinkercad.com/help-center/circuits-workspace and https://www.tinkercad.com/blog/python-coding-with-microbit-in-tinkercad-circuits. Tinkercad Help Center and blog. Autodesk. Article bodies did not load, so content comes from search-result summaries.
- S30. https://www.tinkercad.com/teachers/electronics. Electronics Curriculum. Autodesk Tinkercad. Names Google Classroom and Canvas; no detail.
- S31. https://zbotic.in/tinkercad-arduino-simulation-teach-electronics-online-free/. Tinkercad Arduino simulation guide. Zbotic. Third-party blog, 2026.
- S32. https://www.autodesk.com/products/fusion-360/blog/autodesk-the-first-to-pioneer-cloud-cad-with-over-55-million-users-today/. Autodesk blog. HTTP 403 on fetch; figures from a search snippet with inconsistent dates. Also https://thejournal.com/Articles/2022/02/04/Tinkercad-Circuits-Now-Works-Seamlessly-With-Fusion-360.aspx (2022-02-04, via snippet).
- S33. https://forum.micropython.org/viewtopic.php?p=67671. Wokwi simulator slower than real ESP32. MicroPython forum. 2022.
- S34. https://forum.arduino.cc/t/virtual-online-arduino-and-esp32-simulator-wokwi-arduino-simulator-features/698481/3 and https://forum.arduino.cc/t/why-does-the-wokwi-simulator-hang-grbl/985524 and https://forum.dronebotworkshop.com/arduino/arduino-on-line-simulator/. Arduino and DroneBot Workshop forums. 2021-2022. Read via search summary only.
- S35. https://github.com/SimulIDE/SimulIDE. SimulIDE. GPL-3.0, 324 stars.
- S36. https://github.com/renode/renode. Renode. Antmicro. MIT, 3.1k stars.
- S37. https://marketplace.visualstudio.com/items?itemName=wokwi.wokwi-vscode. Wokwi for VS Code. Visual Studio Marketplace. 351,162 installs, v4.1.0.
- S38. https://marketplace.visualstudio.com/items?itemName=platformio.platformio-ide. PlatformIO IDE. Visual Studio Marketplace. 7,430,893 installs, v3.3.4.
- S39. https://github.com/wokwi/wokwi-elements. wokwi-elements. MIT, 266 stars.
- S40. https://docs.arduino.cc/arduino-cloud/. Arduino Cloud documentation. Arduino. Latest.
- S41. https://www.mikrocontroller.net/news/arduino-cloud-ab-sofort-per-kommandozeile-ansprechbar. Arduino Cloud CLI news. mikrocontroller.net. Undated; read via search summary only.
- S42. https://isdown.app/status/arduino/incidents/602972-cloud-editor-compilation-are-experiencing-issues and https://pingoru.io/providers/arduino/outage-history. Arduino outage trackers. Incidents 2025-04-04, 2025-10-20, 2026-06-08 (via summary).
- S43. https://8gwifi.org/electronics/arduino-simulator.jsp. Arduino and ESP32 simulator online. 8gwifi.org. Third-party, claims not verified.
- S44. https://www.opensourceforu.com/2025/11/arduino-criticised-for-user-monitoring-and-patent-shielding/. Arduino criticised. Open Source For You. 2025-11. Read via search summary only.
- S45. https://www.cnx-software.com/2025/04/28/arduino-cloud-editor-gets-claude-powered-ai-assistant-trained-on-arduino-docs-and-libraries/ and https://www.cnx-software.com/2023/04/10/wokwi-arduino-raspberry-pi-pico-esp32-board-simulator/. CNX Software. 2025-04-28 and 2023-04-10 (older Wokwi Club price, superseded). Search summary only. Also an Embedded.fm transcript (https://embedded.fm/transcripts/396) and podcasts link Uri Shaked to Wokwi.
- S46. https://platformio.org/pricing (no plans shown) and https://explodingtopics.com/topic/wokwi (search volume, not users).
- S47. https://platformio.org/support. PlatformIO support page. Names PlatformIO Labs; no plans or prices.
- S48. https://www.cadforum.cz/forum_en-archive/forum-posts/tinkercad-surpasses-10-million-users-and-100-milli-12699.html and https://workspace.google.com/marketplace/app/autodesk_tinkercad/614288788007. CADforum archive (2018: 10 million users, 100 million designs) and Google Workspace Marketplace listing (updated November 2024: "over 86 million people"). Both via search-result summary only (fact-check, 2026-10-26).

## Fact-check log (2026-10-26)

Method: 15 high-impact claims re-opened with WebFetch or search on 2026-10-26, plus spot checks of the surrounding numbers. "Corrected" means the file was edited.

| # | Claim | Verdict | Source |
|---|---|---|---|
| 1 | Wokwi plan prices (EUR 0 / 5.6 / 8.1 / 20 per seat, annual billing) and fast-build minutes (100/500/1000) | confirmed; Community note and Classroom placement corrected | [S1] |
| 2 | Wokwi Classroom EUR 30/student/semester, min 5 | confirmed on Classroom page (not on pricing page, which has no price); annual option added; UCF logo claim corrected (logos are NUS, HTL Moedling, Harvard); "no LMS" confirmed | [S21][S1] |
| 3 | Wokwi CI minutes 50/200/500/2000 and per-run caps 5/5/10/50 | confirmed | [S18] |
| 4 | Wokwi 18 MCU variants, 67 parts, 10 ESP32-family chips, C5/P4/S31 beta | confirmed; category count reworded (8 part categories plus microcontrollers) | [S15] |
| 5 | Arduino Cloud plan prices and limits | confirmed (Free, Maker $72, Team $1,000, School $20/member, prototyping $240/6 months); Team and Enterprise details added; "personal use only" for Maker unconfirmed; trial credit-card claim corrected (alternative payment offered) | [S8] |
| 6 | Velxio plan prices | confirmed ($0, $3/$36, $5.75/$69, $15.75/$189, Classroom from $34/student/year, min 5); feature lists corrected (Free has private projects, No AI has no AI, Pro credit counts); "Claude Code or Codex" not named on the page, downgraded | [S6] |
| 7 | Velxio licence, stars, forks, commits | confirmed AGPLv3 + commercial, 3.5k/363/2,122; SPDX suffix UNKNOWN; board counts conflict across README, sidebar, site (35) and article (30+); site says 2.6k+ stars versus 3.5k on the repo | [S5][S6] |
| 8 | Velxio 15,000+ registered developers, 1,000+ simulations/day, paid AI agent | confirmed as vendor claim by the author (Espressif community post, 2026-07-31) | [S4] |
| 9 | Qualcomm bought Arduino October 2025; reverse-engineering ban; perpetual licence | confirmed as reported by The Register (no completion date given); SaaS-only scope is Arduino's statement, reported by Open Source For You, not The Register; wording of the licence ("irrevocable, perpetual") is Adafruit's description | [S9][S44] |
| 10 | avr8js MIT, 852 stars; rp2040js MIT, 533 stars | confirmed | [S2][S3] |
| 11 | PlatformIO Core Apache-2.0, 9.6k stars | confirmed | [S10] |
| 12 | PlatformIO VS Code extension 7,430,893 installs, v3.3.4 | confirmed (4,136 ratings) | [S38] |
| 13 | Wokwi VS Code extension 351,162 installs, 20 ratings | confirmed; rating about 4.5; commercial licence after trial added; v4.1.0 not re-verified | [S37] |
| 14 | esp32sim MIT, 684 stars, 46 forks, 1,712 commits, maturity, 30x claim | confirmed; maturity table matches (S3 mature, ESP32 early, C3/C6/P4 draft) | [S25] |
| 15 | Tinkercad "100 million users" | corrected: sources say 100 million designs (2018) and 86M+ people (Nov 2024 listing); neither is an Autodesk page | [S32][S48] |
| 16 | Tinkercad teachers page names Google Classroom and Canvas | unconfirmed: page returned only its title; downgraded | [S30] |
| 17 | Arduino AI Assistant is Claude-powered | confirmed by CNX Software 2025-04-28; its plan placement (Maker, $6.99/month then) is superseded by the current plans page | [S45][S8] |
| 18 | PIO Plus features made free, debugger Apache-2.0 | confirmed; post dated 2019-06-18 | [S12] |
| 19 | Cirkit Designer: Uno and Mega only, "free to start", Cirkit AI | confirmed; 30,000+ component library not on the page, downgraded to unconfirmed | [S26][S27] |
| 20 | Velxio Show HN criticisms | confirmed (196 points, 25 comments, 213 days old); the comment about being prompt-generated is a commenter's view, answered by the author | [S7] |

Not re-checked (kept as labelled in the body): SimulIDE and Renode stars and licences [S35][S36], Wokwi 2022 forum threads [S33][S34], Arduino outage dates [S42], Wokwi owner and founder, Wokwi chips API, GDB claims [S16][S23], Tinkercad Wikipedia statements [S28]. Counts: 20 claims checked, 4 materially wrong (Tinkercad users, Tinkercad LMS, UCF logo, Classroom price location), several smaller corrections and downgrades.
