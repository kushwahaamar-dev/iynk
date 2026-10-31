# Competitor landscape for iynk

Written 2026-10-27 by the synthesis agent. This file is built only from the fact-checked dossiers listed in section 9 and from iynk's own audit. The synthesis opened no new web source. The 2026-10-27 review (end of file) re-opened three pages: wokwi.com/pricing, wokwi.com/classroom and github.com/davidmonterocrespo24/velxio, all accessed 2026-10-27. Every claim keeps the label and the source tag it had in its dossier, prefixed by the dossier name, for example [embedded-sim S4].

## 0. How to read this file

Labels: TESTED (done hands-on in a run), EXTERNAL (a cited source says it), ESTIMATED (arithmetic or reasoning with stated assumptions), HYPOTHESIS (judgement, not proven), UNKNOWN (not established). A claim with no label in a table is EXTERNAL from the dossier named next to it.

Four limits that matter for everything below:

1. Only one piece of hands-on competitor product evidence exists (the GitHub topic counts in [ecosystems S3] are also TESTED, but are not product tests): [WORKFLOW_BENCHMARK](WORKFLOW_BENCHMARK.md) (called [benchmark] below). It covers Wokwi, Falstad CircuitJS, MakeCode for micro:bit and iynk. It was scripted, headless, one run each, on one Mac. Tinkercad, Velxio, Cirkit Designer, Arduino Cloud, Proteus and Multisim were not run. The robotics, drone, education, ecosystem and AI dossiers are desk research: nothing in them is TESTED.
2. Many vendor pages (Autodesk, VEX, FAA, Digilent) returned 403 or a title only. Figures that came from search summaries are marked in the dossiers and are marked here as "second-hand" where it matters.
3. iynk's own capabilities come from [FEATURE_VERIFICATION](../01_AUDIT/FEATURE_VERIFICATION.md) (called [FV]) and the run reports [E2E](../01_AUDIT/runs/E2E.md), [COMMANDS](../01_AUDIT/runs/COMMANDS.md), [BUILD_OUTPUT](../01_AUDIT/runs/BUILD_OUTPUT.md). FV's first version said no browser run was done; its 2026-10-27 refresh adds a Chromium browser walk (desktop and Pixel 7, keyless build) and cites E2E, so FV C-rows may carry walk evidence. Chromium only. The keyless E2E run (116 passed, 1 failed, 2 skipped, 2026-10-27) is the first browser-level evidence, and it does not use any API key, so AI, search, database, Solana and relay features were off. Where a claim needs one of those, it is not verified end to end.
4. Threat levels and grades are my judgement (HYPOTHESIS). The dossiers give evidence, not verdicts. No customer has been interviewed by anyone in this plan.

Prices are "as of 2026-10-26" and in the currency the page showed.

Source tags: [embedded-sim S4] is source S4 in that dossier's source list. [dossier summary] is that dossier's Summary section. [dossier 4.1] or [dossier 12] is a numbered section or product in that dossier. [FV C005] is claim C005 in the FEATURE_VERIFICATION register. [benchmark 4.4] is section 4.4 of WORKFLOW_BENCHMARK.

---

## 1. Executive view

### The picture in six lines

1. Browser simulation of real microcontroller firmware is crowded. Wokwi leads (18 MCU variants, custom-chip API, debugger, VS Code and CI, free tier of public projects, Classroom at EUR 30 per student per semester). Velxio, a 2026 open-source entrant, adds QEMU ESP32 and Pi, ngspice, an AI agent, MCP, a BOM export and a USD 34 per student per year classroom plan [embedded-sim S1][embedded-sim S6][embedded-sim S21].
2. Schools are held by free incumbents with distribution: Tinkercad (Autodesk says 100 million users, UNCONFIRMED, second-hand) and MakeCode with micro:bit (the Foundation says 73.5 million children) [embedded-sim S48][education S8][segments S9].
3. iynk is, today, a viewer of 38 catalogue items, not a project editor. It cannot draw a circuit, save work, export, add a custom part or debug with breakpoints. Every live competitor in the circuit category lets a user create a project [circuit-eda summary][benchmark 2][FV section 6].
4. iynk was ahead on one thing in the only head-to-head test: explaining a wiring mistake. It named the fault, showed a burnt LED, gave the arithmetic and offered Repair. Wokwi and Falstad showed no message in the captured runs, and MakeCode has no wires (TESTED, scripted, one run each, Tinkercad not tested) [benchmark 2, 6].
5. Ground that looks empty in the pages the dossiers read (absence of evidence, not proof): robotics and electronics together in one free browser tab; drone parts, calculator and flight in one tab with no login; beginner-grade custom components; a free parts list with shop prices [robotics summary][drone summary][benchmark 6].
6. Almost every iynk differentiator can be copied in months by a rival that wants to. The slow-to-copy assets are the authored content corpus and, if it is ever built, evidence that learners learn (section 8).

### Who iynk actually competes with, by audience

| Audience (BRIEF 6) | Closest rivals | Why they are the rival | iynk today |
|---|---|---|---|
| High-school students | Tinkercad Circuits, MakeCode micro:bit, VEXcode VR (robot coding) | Free, teacher classes, large installed base [embedded-sim S28][education S6][education S29] | Behind: no classes, no saved work, no LMS. Possible edge: more boards, explained faults. Language count is not an edge (Tinkercad lists 16, low confidence) [embedded-sim S32] |
| University engineering and CS-embedded students | Wokwi (Classroom EUR 30 per student per semester), Velxio, Multisim and Proteus desktop | Real firmware, CI, instructor adoption [embedded-sim S21][circuit-eda S15] | Behind on fidelity: interpreters are subsets, not emulators [FV C005]. Multisim Live ended 2026-09-15 (second-hand), so some instructors are looking [circuit-eda S1][circuit-eda S4] |
| Self-taught makers | Wokwi, Tinkercad, Velxio, Cirkit Designer, Arduino Cloud | Own projects, libraries, share links [segments seg. 4] | Behind: no original projects. Possible edge: parts list and prices if pricing works |
| Robotics clubs | VEXcode VR for school clubs; Webots and Gazebo desktop for advanced; The Construct (EUR 439 per year) | Fixed virtual robot (VEX) or desktop install (Webots, Gazebo) [robotics summary] | No browser rival joins robot body and electronics. iynk benches are fixed catalogue items |
| Drone hobbyists | eCalc (calculator), Liftoff and Velocidrone (flying), DroneBlocks (schools) | Each owns one slice [drone summary] | Only product found linking calculator, build steps and a flight sim in one tab. Flight model is arcade point mass [FV C015] |
| Hackathon builders | Wokwi for pre-build; GitHub and Hackster for sharing | Hackathon builders ship demos [segments seg. 7] | No shareable project link exists |
| Educators and schools | Tinkercad classes, micro:bit classroom (no accounts), Arduino School (USD 20 per member per year), Wokwi Classroom, DroneBlocks (USD 695 per year) | Teacher tools and curricula [education summary][drone S16] | No educator features at all [FV section 6] |
| Advanced engineers | Wokwi Pro, Proteus, PlatformIO, Renode | Accuracy, CI [embedded-sim summary] | Not a fit, and not a goal |
| Learners in low-resource regions | MakeCode, Falstad, Tinkercad, Raspberry Pi Code Editor | Free, no hardware [education summary] | Free, six UI languages, but lab pages load 1.6 to 2.2 MB of JS uncompressed (about 500 to 700 KB gzip, ESTIMATED), and low-bandwidth use is untested [BUILD_OUTPUT] |

### Where the field is crowded

| Area | Who is there |
|---|---|
| Browser MCU simulation with real firmware | Wokwi, Velxio, esp32sim, Tinkercad (Uno-class) |
| Free coding tools for K-12 | MakeCode, micro:bit Python Editor, Raspberry Pi Code Editor, VEXcode VR, Tinkercad |
| Analog circuit intuition in a tab | Falstad, CircuitLab, EveryCircuit, CircuitSim, Tinkercad |
| AI assistance in a hardware editor | Flux, Velxio Agent, Cirkit Designer, Arduino Cloud AI, Wokwi via MCP |
| Project sharing and tutorials | GitHub, Hackster, Hackaday.io, Instructables, Adafruit, SparkFun, Arduino Project Hub |

### Where it looks empty (HYPOTHESIS, based on absence in the pages read)

| Gap | Evidence | What would disprove it |
|---|---|---|
| Free, no-account tool that explains why a wiring mistake breaks things | TESTED against Wokwi, Falstad, MakeCode only. Tinkercad is said to show a destroyed LED (second-hand) [embedded-sim S34][benchmark 5] | Run the same three faults in Tinkercad, Velxio, Cirkit by hand |
| Browser robot builder that includes the electronics (motor driver, regulator, firmware, fault) | No row in the robotics tables has a circuit editor, MCU sim or failure model [robotics summary] | A search for Isaac, Webots or VEX add-ons that do this |
| Calculator, parts, BOM and flight in one free tab for drones | eCalc is login-gated for the full version; DroneBlocks is paywalled and tied to its hardware [drone summary] | Find a free product doing all four |
| Beginner-grade custom parts | Wokwi's chip API is for programmers (C or WebAssembly, beta); Falstad subcircuits unrun [benchmark 6] | Velxio and Cirkit AI part builder claims, if they work for beginners (not run) |
| Free parts list with shop prices | Only Velxio Pro lists a BOM export [embedded-sim S6]. iynk's live prices were out of quota on 2026-10-26 [FV C027] | iynk's own price feature must work first |

### Four findings that should shape the plan

1. The gap that matters most is not a rival feature. It is the project model. A plain, versioned project file is a precondition for save, share, export, AI proposals and MCP. Wokwi (diagram.json), Falstad (text export) and MakeCode (.hex, project files) all have one; iynk has none [benchmark 6][FV section 6].
2. The most defensible thing iynk has shown is the fault corpus: 144 board failures and 106 bench faults, re-counted, with named causes; the Repair step was seen only on the faults the benchmark and walk triggered, not on all 250 [FV section 2][benchmark 4.4]. Its engine is a small DC solver with a fixed 25 ohm pin constant, so the "113 mA" figure is illustrative [FV C010].
3. Velxio is the rival to watch, because it is moving fast, is open source (AGPL), sells to classrooms, and already has the AI agent, MCP and BOM that iynk lists as differentiators [embedded-sim S6][circuit-eda S42].
4. Free browser tools do die or change terms: Multisim Live ended (date confirmed only via a competitor's page, see 6.3), Arduino's terms drew a backlash after the Qualcomm deal, Foxglove closed its open Studio, robotbenchmark.net now serves gambling spam (treat as dead). A visible export and licence promise is itself a position [circuit-eda S1][embedded-sim S9][robotics S22][robotics S29].

---

## 2. Category maps

Threat column is my judgement. High: overlaps a core iynk audience now, is free or cheap, and could add iynk's differentiators in months. Medium: overlaps one audience or one lab. Low: different audience or job. Watch: small now, could jump. iynk is the first row of each table so the reader can compare.

### 2.1 Browser-first circuit and MCU simulators

| Product | Audience | Price (as of 2026-10-26) | Best at | Threat | Source |
|---|---|---|---|---|---|
| iynk | Learners; no account | Free (no billing code exists) | Explained wiring faults (TESTED), three labs, six UI languages (keys present, quality unreviewed) | n/a | [FV C001][FV C023][benchmark 4.4] |
| Wokwi | Hobbyists, ESP32 and Arduino developers, universities, firmware teams | EUR 0 (public projects) / 5.6 / 8.1 / 20 per seat per month, annual billing. Classroom EUR 30 per student per semester, min 5 | Real firmware on 18 MCU variants, custom-chip API (beta), AVR debugger (beta), logic analyser, VS Code, CI | High | [embedded-sim S1][embedded-sim S15][embedded-sim S21] |
| Tinkercad Circuits | K-12 and intro electronics | Free per third parties; Autodesk page did not load | Install base, class accounts, Starters, blocks plus text code | High in schools | [embedded-sim S28][embedded-sim S31][circuit-eda S44] |
| Velxio | ESP32 hobbyists, classrooms, AI-assisted builders | Free; 3 / 5.75 / 15.75 USD per month; Classroom from USD 34 per student per year, min 5 | QEMU ESP32, STM32, Pi (server side), ngspice, AI agent and tutor, MCP, BOM CSV on Pro, Docker self-host | High on Board Lab | [embedded-sim S4][embedded-sim S5][embedded-sim S6] |
| Cirkit Designer | Makers and learners | "Free to start"; plan prices UNKNOWN (membership URL 404) | AI wiring and code help, AI part builder (2 to 5 min), 12 UI languages; only Uno and Mega simulated | Medium, Watch | [ai-hardware S28][ai-hardware S29][embedded-sim S26] |
| Falstad CircuitJS | Students, teachers | Free, no account, GPL-2.0 | Fast analog intuition, text import and export | Low to medium | [circuit-eda S7][benchmark 4.2] |
| CircuitSim | Students (Multisim Live refugees) | Free capped (5 circuits); 2.50 USD per month; 7.50 USD per month | SPICE, classes, Custom Component Studio. No MCU | Medium for analog, low for MCU | [circuit-eda S3] |
| CircuitLab | Students, pros | Trial and "Micro" (10 components); current prices UNKNOWN | SPICE-like, AI Assistant (beta) | Low | [circuit-eda S35][circuit-eda S36] |
| EveryCircuit | Students, mobile | Free (5 parts); 5 USD per month or 15 USD once | Animated analog, mobile | Low | [circuit-eda S39] |
| EEcircuit | Engineers | Free, MIT | ngspice in WebAssembly | Low (a building block) | [circuit-eda S29] |
| esp32sim | ESP32 tinkerers | Free, MIT | Boots real ESP32 ROM in WebAssembly; S3 mature, others draft | Watch | [embedded-sim S25] |
| Multisim Live | Students | Ended 2026-09-15 (second-hand; actual shutdown UNKNOWN) | Was free browser SPICE | n/a | [circuit-eda S1][benchmark 5] |

### 2.2 Desktop, professional and toolchain products

| Product | Audience | Price | Best at | Threat | Source |
|---|---|---|---|---|---|
| iynk | Learners | Free | No equivalent: no export to PlatformIO, Arduino CLI, KiCad or a netlist | n/a | [FV section 6] |
| Arduino Cloud and Cloud Editor | Makers, schools, IoT teams | Free; Maker USD 72 per year; Team USD 1,000 per year; School USD 20 per member per year | Real compile and upload, Google Classroom, AI Assistant (Claude-based). No simulator | Medium (school channel, brand; trust problem since Qualcomm terms) | [embedded-sim S8][embedded-sim S9] |
| PlatformIO | Embedded developers | Core free (Apache-2.0) | Build and debug toolchain, 7.4 million VS Code installs | Low; an export target | [embedded-sim S10][embedded-sim S38] |
| Proteus VSM | Professionals, universities | List prices not visible; reseller figures unconfirmed | Real HEX or ELF on a simulated MCU beside analog parts | Low | [circuit-eda S16][circuit-eda S17] |
| Multisim desktop | Schools, engineers | Not published; aggregator figures conflict | SPICE | Low | [circuit-eda S18][circuit-eda S19] |
| KiCad with ngspice | Engineers, makers | Free | PCB design, SPICE | Low | [circuit-eda S23][circuit-eda S27] |
| EasyEDA | Makers, small firms | Free; 19.9 per month (currency not named) | Schematic to JLCPCB and LCSC order path | Low | [circuit-eda S20] |
| Fritzing | Makers | Source free; binaries ask 8 to 25 EUR (2019 figures) | Breadboard view | Low | [circuit-eda S31][circuit-eda S32] |
| SimulIDE | Hobbyists | Free; licence AGPLv3 on site, GPL-3.0 on repo | Desktop real-time sim | Low | [circuit-eda S10][circuit-eda S11] |
| Renode | Professionals | MIT, free | Multi-node firmware simulation | Low | [embedded-sim S36] |

### 2.3 Hardware education

| Product | Audience | Price | Best at | Threat | Source |
|---|---|---|---|---|---|
| iynk | Learners, no teacher features | Free | Catalogue of boards, benches, drones with lessons and checks | n/a | [FV C003][FV section 6] |
| MakeCode for micro:bit | Ages 8 to 16 | Free (not stated on cited page, no charge known) | Blocks and text, simulator, .hex and WebUSB flashing, GitHub extensions, 73.5 million children (Foundation figure) | High in schools | [education S3][education S8] |
| micro:bit classroom, Python Editor, CreateAI | Classrooms | Free | No-account sessions, teacher sees code live, on-device ML | Medium | [education S6][education S9] |
| Raspberry Pi Code Editor | Ages 9+ | Free | Classes, embeddable web component, Sense HAT emulator, 36,477 users saved projects in 2025 | Medium (distribution) | [education S21][education S23] |
| Arduino Education | Schools to industry | School plan USD 20 per member per year | Kits, curriculum, Google Classroom | Medium | [education S15][education S17] |
| VEXcode VR | K-12 and VEX teams | Free Blocks; USD 199 / 499 per educator per year (second-hand) | Virtual robot playgrounds tied to competitions | Medium for robotics clubs | [education S29][education S49] |
| LabsLand | Universities, schools | From EUR 7.99 / 19.99 per student per semester | Real remote lab equipment, 6 LMS integrations | Low to medium | [education S40][education S41] |
| CoderZ | Schools | USD 2,000 to 2,400 per school per course (conflicting, second-hand) | Gamified robotics missions | Low | [education S30] |
| LEGO CS&AI, Edison, Sphero Edu, mBlock | Primary and middle school | Kit USD 339.95+ / robot USD 59 / app free / quote | Hardware-bundled curricula | Low | [education S33][education S34][education S35][education S37] |
| Brilliant | Adults, teens | USD 30 per month individual (basis unclear) | Interactive lessons; no electronics course found | Low | [education S26][education S28] |
| WPILib simulation | FRC teams | Free, BSD-3-Clause | Same robot code in sim and on the robot | Low | [education S38][education S39] |
| Robot Virtual Worlds, MIT iLab | Legacy | n/a | n/a | n/a | [education S31][education S44] |

### 2.4 Robotics simulators and ROS learning

| Product | Audience | Price | Best at | Threat | Source |
|---|---|---|---|---|---|
| iynk Robotics Lab | Learners | Free | 13 benches, 272 assembly steps, 106 faults, step state machine tested | n/a | [FV section 2][FV section 4] |
| Webots | Students, researchers | Free, Apache-2.0 | Friendliest desktop start; `w3d` browser streaming (needs a server, viewers cannot interact) | Low | [robotics S1][robotics S3] |
| Gazebo | ROS developers | Free, Apache-2.0 | ROS default; Jetty LTS to May 2031; Ubuntu 24.04 amd64 only officially | Low | [robotics S5][robotics S33] |
| The Construct | ROS learners | Free tier; EUR 39.97 per month; EUR 439 per year; EUR 2,399 per user per year | Cloud ROS courses and real robot labs | Medium | [robotics S8][robotics S9] |
| NVIDIA Isaac Sim and Lab | Researchers | Free; needs RTX 4080 16 GB minimum | Photoreal GPU sim | Low | [robotics S11][robotics S12] |
| CoppeliaSim | Education and industry | Edu / Pro / Lite, prices UNKNOWN | Five physics engines; browser viewer only | Low | [robotics S14] |
| MuJoCo (WASM bindings) | Researchers | Free, Apache-2.0 | Engine; official WebAssembly bindings still work in progress | Watch (a component) | [robotics S16][robotics S19] |
| VEXcode VR | K-12 | see 2.3 | Zero friction, fixed robot | Medium | [robotics S26] |
| URDF web viewers | ROS developers | Free | Static view and validation | Low | [robotics S27] |
| Foxglove, Rerun | Robotics teams | Free tiers; academic free (Foxglove) | Log visualisation, not simulation | Low | [robotics S20][robotics S25] |

### 2.5 Drone development, simulation and design

| Product | Audience | Price | Best at | Threat | Source |
|---|---|---|---|---|---|
| iynk Drone Lab | Learners | Free | 13 drones, calculator (342 reference rows reproduce a third-party tool), 78 drone bench tests (the README calls them safety tests; the check logic is client-side and a hand-written log passed the credential check, FV C014, C030), 22-course arcade flight sim | n/a | [FV C013][FV C015] |
| DroneBlocks | K-12 schools | USD 695 per year school licence; 14-day trial | Browser sim running PX4 firmware, code moves to a real drone, curriculum | Medium (Drone Lab) | [drone S15][drone S16] |
| eCalc xcopterCalc | Builders | Demo free; full version login, price unclear ("$0.99" vs about USD 19 per year) | Calculator, accuracy stated +/-15% | Medium (calculator) | [drone S6][drone S23] |
| Liftoff, Velocidrone, Uncrashed, DRL, TRYP | FPV pilots | One-off USD 9.99 to 19.99 (Velocidrone GBP 16.99) | Stick feel, tracks, multiplayer | Low (different job) | [drone S7][drone S10][drone S12] |
| PX4 SITL, ArduPilot SITL | Developers | Free (BSD-3 / GPL-3.0) | Real flight firmware in simulation | Low | [drone S1][drone S2] |
| Betaflight Configurator | FPV builders | Free, GPL-3.0 | Tuning on real quads | Low | [drone S5] |
| Browser sims: Nexus FPV, SkySim | Hobby | Free; SkySim MIT, 9 stars | Early browser physics | Watch | [drone S26][drone S28] |
| CoDrone EDU, Drone Legends, Tello EDU | Schools | USD 249 kit; quote; Tello doubtful | Hardware plus curriculum; Tello slot vacated | Low | [drone S17][drone S18][drone S20] |

### 2.6 Creation and sharing ecosystems

| Product | Audience | Price | Best at | Threat | Source |
|---|---|---|---|---|---|
| iynk | Learners | Free | No publish or share of user work; a story card PNG is the only download | n/a | [FV section 6] |
| GitHub | All developers | Free; Team USD 4 per user per month (first 12 months) | Fork graph, 47,191 arduino-topic repos (TESTED count) | Low; a destination | [ecosystems S2][ecosystems S3] |
| Hackster.io | Embedded developers | Free to join (UNKNOWN price page) | Sponsor contests; 2.6 million+ members (vendor) | Low | [ecosystems S8][ecosystems S9] |
| Hackaday.io | Hackers | Free (UNKNOWN price page) | "Over a million members" (vendor); small DigiKey-backed contests | Low | [ecosystems S12][ecosystems S15] |
| Instructables | DIY makers | Free; Pro price UNKNOWN | Step-by-step project format, contests | Low | [ecosystems S11] |
| Thingiverse, Printables | 3D printing | Free | 3D model remixing with licences | Low | [ecosystems S17][ecosystems S20] |
| Onshape | CAD users, students | Free (public docs, non-commercial); educator plan free | Live co-editing, classes and assignments | Low; a model for education | [ecosystems S4][ecosystems S5] |
| Fusion | Hobbyists, pros | UNKNOWN (page 403) | CAD/ECAD | Low | [ecosystems S6] |
| Arduino Project Hub, Adafruit Learning System, SparkFun | Beginners | Free | Vendor-run tutorials as marketing (6,519 / 3,403 / 956) | Low; content to link | [ecosystems S24][ecosystems S27][ecosystems S28] |
| Wokwi (as sharing site) | Makers | see 2.1 | Share-by-link, public by default, MIT part art | High | [ecosystems S21][ecosystems S23] |

### 2.7 AI-native hardware design and assistants

| Product | Audience | Price | Best at | Threat | Source |
|---|---|---|---|---|---|
| iynk AI partner | Learners | Free; off without server keys | Tool-calling partner (live smoke run 6 of 6 against Meta); sees a text summary, not wiring, on boards and benches | n/a | [FV C020][FV section 4] |
| Flux | Engineers, makers | Official prices unreadable; trial only for AI; third-party figures conflict | Copilot reads live schematic, PCB, parts; MCP server; USD 37M raised (Feb 2026); 1.1 million builders (vendor) | Watch (pro, no education plan found) | [ai-hardware S1][ai-hardware S3][ai-hardware S6] |
| Velxio Agent and Tutor | Makers, classrooms | Maker USD 5.75 per month; MCP on Pro | Designs, compiles, checks its own work | High | [embedded-sim S6][circuit-eda S42] |
| Cirkit Designer AI | Learners | Plans UNKNOWN | Wires parts, writes code, builds custom parts | Medium, Watch | [ai-hardware S28][ai-hardware S29] |
| Arduino Cloud AI Assistant | Makers, schools | 30 uses per month free; 1,500 on Maker and School | Reads board, libraries, code; not a circuit | Medium | [ai-hardware S35][ai-hardware S36] |
| Wokwi CLI MCP | Developers | Experimental, needs token | Lets Claude Code, Cursor, Copilot run a simulation | Watch | [benchmark S22][ai-hardware S40] |
| JITX, Quilter, Diode, Circuit Mind, CELUS, Zoo | Professional teams | Mostly quote only | PCB and CAD automation | Low | [ai-hardware S14][ai-hardware S11][ai-hardware S20] |
| atopile, tscircuit | Developers | Free, MIT | Circuits as text that an LLM can read and diff | Low; ideas to reuse | [ai-hardware S18][ai-hardware S42] |
| Simantic, Hilstart (YC 2026) | Developers | Funding UNKNOWN | Firmware simulation for agents | Watch | [ai-hardware S43][ai-hardware S44] |

Not covered by any dossier (do not assume anything about them): Brilliant electronics content, bootcamps, Reddit threads, PartSim, Qucs-S, LTspice, Labster.

### 2.8 Conflicts between dossiers that a reader should know

| Topic | What each says | Resolution |
|---|---|---|
| Wokwi no-account entry | embedded-sim: UNKNOWN. benchmark: no login needed to open, edit and run (TESTED) | Use the benchmark. Signed-out saves are tied to the browser [benchmark S21] |
| Velxio board count | 19 (repo sidebar), 30+ (article), 35 (site), 40 (README) | UNKNOWN; do not quote [embedded-sim S4][embedded-sim S5][embedded-sim S6] |
| Velxio MCP plan | embedded-sim lists MCP under Pro; circuit-eda corrected to Pro for MCP and Maker for Agent and Tutor | Same fact: Agent and Tutor on Maker, MCP on Pro [circuit-eda fact-check 6] |
| Tinkercad boards | Uno only (one blog) vs Uno, micro:bit, ATtiny (Wikipedia and a forum) | Uno, micro:bit, ATtiny more likely; Autodesk page never loaded [embedded-sim S28][circuit-eda S4] |
| Tinkercad user count | 100 million "users" vs 100 million designs (2018) and 86 million+ people (Nov 2024 listing) | UNCONFIRMED; Autodesk pages returned 403 [embedded-sim S32][embedded-sim S48] |
| Wokwi co-editing | UNKNOWN in every dossier | Still UNKNOWN; one third-party blog claim is not credible evidence [benchmark 4.1] |
| Arduino-Qualcomm | "Is acquiring" (ai-hardware) vs "has acquired" (ecosystems, market) | arduino.cc now says it is a Qualcomm company; closing date UNKNOWN [market 5.1] |

---

## 3. The nine standard workflow tasks (BRIEF 5.2)

Source for everything in TESTED columns: [benchmark] (WORKFLOW_BENCHMARK.md), run 2026-10-26, Playwright headless Chromium. TESTED here means "my script did it and I saw the result", not "a person did it". Documented means a cited page or a search summary says it, and nobody ran it.

How to trust the benchmark: scripted, not human; one run each; fixed waits; Wokwi circuits were written into `diagram.json` and Falstad circuits pasted as text, so wiring by mouse is untested for both; headless Chromium has no WebUSB, so flashing a micro:bit was not tested; select-all failed in two editors so code was set through the editor API [benchmark 1]. Times are the script's, with sleeps, and are not benchmarks. Human estimates are ESTIMATED guesses.

Products not run: Tinkercad, Arduino Cloud, Proteus, Multisim (account or install needed) and also Velxio, Cirkit Designer, CircuitSim, CircuitLab and every product in the robotics, drone and AI dossiers. For them only Documented cells exist.

### 3.1 Summary matrix

Verdict words as in the benchmark: yes, partial, no, not tested. The verdict is TESTED unless the cell says Documented.

| # | Task | Wokwi | Falstad | MakeCode micro:bit | iynk | Tinkercad / Arduino Cloud / Proteus / Multisim |
|---|---|---|---|---|---|---|
| 1 | Simple LED circuit | yes (wired by JSON) | yes (text import; mouse placement of a part tested) | no wiring in this tool | partial: fixed lesson circuit, swap resistor or colour, cannot draw | not tested |
| 2 | Write and run controller code | yes (cloud compile queue) | no (no MCU code in tested flow) | yes (blocks and JavaScript) | yes (Arduino C++ subset, in browser) | not tested |
| 3 | Add a sensor, inspect response | partial (parts wired, read printed 0, cause UNKNOWN) | partial (parts in menu, not run) | yes (21 C and slider) | yes (lux slider changed serial and LED) | not tested |
| 4 | Intentional wiring failure | no message seen | partial: no text; reversed LED dark; short shows yellow current dots | not applicable | yes: named fault, burnt LED, why panel, Repair | not tested; Documented: Tinkercad shows LED failure. Velxio (tested 2026-10-27): warns before run on all three faults |
| 5 | Custom component | partial: chips API (beta), Documented, not run | partial: Create Subcircuit in menu, not run | no (extensions are code packages; depth UNKNOWN) | no (control not found) | Proteus not tested |
| 6 | Save, export, share | partial: Save dialog, Download ZIP, name and privacy choice; share not completed | yes (menu: Save As, Export As Link, Text, Image, SVG) | yes: .hex download; sharing needs publish, not clicked | partial: progress in local storage, no export of user work | not tested |
| 7 | Add a collaborator | UNKNOWN | no (no accounts) | no (copy of a shared project only, Documented) | partial: same browser TESTED, cross-device UNKNOWN [BROWSER_WALK step 9, keyless local build] | Documented: Tinkercad invite link; live co-editing UNKNOWN |
| 8 | Debug an advanced project | partial: AVR debugger and logic analyser are Documented, not run | no breakpoints; scopes exist | partial: debug mode with variables and stepping | no (no breakpoints, analyser or variable pane found) | Documented: Proteus breakpoints and analyser; Tinkercad breakpoints (search summary) |
| 9 | Simulation to physical | partial: Download ZIP tested; hex or ELF via VS Code Documented; no BOM found | no | yes for flashing: .hex tested; WebUSB Documented | partial: parts list and price UI; `$0.00` in the 2026-10-26 run on production iynk.tech (search quota out); catalogue prices ($346.00 for quad5) in the keyless local walk | Documented: Tinkercad EAGLE export; Proteus PCB netlist |

Velxio (free tier, no account, tested 2026-10-27, [benchmark 4.5]): task 1 partial (parts added by click; circuit imported from a Wokwi-format zip; mouse wiring not tested); task 2 yes (server compile 3 to 5 s, serial output); task 4 yes as a warning before run for no resistor, reversed LED and 5 V to GND (no burn visual or fix seen); task 6 partial (free .zip export; saving and share links need an account, not tested); tasks 3, 5, 7, 8, 9 not run. Tinkercad needs an Autodesk account: not tested, a known limit.

### 3.2 Product by product, TESTED kept apart from Documented

#### Task 1. Simple LED circuit

| Product | TESTED | Documented only |
|---|---|---|
| Wokwi | New Arduino Uno project opens without login. Add-part menu lists LED and resistor. A wired circuit written into diagram.json ran, serial printed on and off, board LED lit [benchmark 4.1] | Mouse wiring is the slow step for a human (ESTIMATED 5 to 10 min) |
| Falstad | Import From Text of a 5 V, 220 ohm, LED circuit lit the LED with moving current dots [benchmark 4.2] | ESTIMATED 3 to 5 min for a human |
| MakeCode | LED is on the board; nothing to wire [benchmark 4.3] | none |
| iynk | Blink lesson shows a breadboard with a fixed LED and 220 ohm resistor. Parameters tab swaps resistor (220, 1k, 10k) and LED colour. No control to draw a circuit [benchmark 4.4] | FV: no original projects are possible because every route and module is bound to the 12, 13, 13 catalogue ids [FV section 6] |
| Others | not tested | Tinkercad has a free-form breadboard editor [education S46]. Velxio and Cirkit have circuit editors [embedded-sim S5][embedded-sim S26] |

#### Task 2. Write and run controller code

| Product | TESTED | Documented only |
|---|---|---|
| Wokwi | Arduino C++ compiled in a cloud queue; serial showed output. Start to serial output about 8 s in one run, 25+ s in another. A "#24 in the build queue" message was seen once [benchmark 3, 4.1] | Paid plans skip the queue; 100 to 1,000 fast build minutes [embedded-sim S1] |
| Falstad | Not applicable in the tested flow | AVR8js build exists [circuit-eda S7] |
| MakeCode | JavaScript and blocks ran in the simulator; editor ready in about 17 s of script time | Real hardware runs C++ runtime; the simulator is a JavaScript stand-in, and users report board-fine code erroring in the simulator [education S13] |
| iynk | Replaced sketch ran in about 5 s ("Compiling, Uploading, Done"); serial lines had virtual-clock timestamps. A duplicate `setup()` produced a clear error [benchmark 4.4] | FV: interpreters are subsets of Arduino C++, Python, Verilog, not emulators; run on the main thread; programs written for real toolchains often will not compile [FV C005][FV C006] |

#### Task 3. Add a sensor and inspect its response

| Product | TESTED | Documented only |
|---|---|---|
| Wokwi | Potentiometer and DHT22 placed and wired; analog read printed 0. The knob was not moved and wiring validity was not checked, so cause is UNKNOWN | none |
| Falstad | Photoresistor and Thermistor appear in the Draw menu; response not run | none |
| MakeCode | `input.temperature()` showed 21 C with a thermometer slider | none |
| iynk | "Sense light" lesson: lux slider at minimum changed the serial reading and D9 went HIGH, matching the lesson code | none |

#### Task 4. Intentional wiring failure (iynk's clearest result)

| Product | TESTED | Documented only |
|---|---|---|
| Wokwi | Three variants (LED without resistor, LED reversed, 5 V to GND). In every captured run no warning in the page text, simulation kept running. One frame showed the TX LED lit, cause unknown. Evidence is one still frame per case plus page text | A 2022 forum user said an LED across supply and ground does not burn in Wokwi while Tinkercad shows failure [embedded-sim S34] |
| Falstad | No resistor: LED glows, no warning. Reversed: LED outline dark. Short: yellow current dots, no message. Hovering for current readouts and the "limit" options were not tested | none |
| MakeCode | No wires exist, so no wiring fault can happen | none |
| iynk | Break it tab listed 16 triggers on the Uno blink lesson. "LED with no resistor" showed "LED1: burnt out" and a panel with what you see, why (about (5-2) V over 26 ohm = 115 mA against a 20 mA LED limit and 40 mA pin limit), fix and a Repair button. Wrong-polarity adapter: "Nothing at all: the ON LED stays dark" with a diode explanation. The arithmetic is the page's own and was not checked [benchmark 4.4] | FV reproduced the burn separately: 113 mA from a fixed 25 ohm pin constant, so illustrative. Only breadboard faults go through the solver; other faults are rules; each of the 144 board failures was not exercised [FV C009][FV C010][FV section 4] |
| Others | not tested | Tinkercad: LED too much current overheats in a workshop deck (second-hand, unverified) [benchmark S16]. Proteus does not enforce missing power, ground or crystals, so working sims can fail on hardware (undated forum threads) [circuit-eda S17] |

#### Task 5. Create a custom component

| Product | TESTED | Documented only |
|---|---|---|
| Wokwi | none | Custom Chips API: beta; C or any WebAssembly language; experimental Verilog; blue "+" then "Custom Chip" [benchmark S3][embedded-sim S16]. Custom Arduino library upload is paid [embedded-sim S1] |
| Falstad | File menu has Create Subcircuit; menu only | none |
| MakeCode | none | Extensions are GitHub-hosted packages that add blocks; a safety allow-list exists [education S4][education S5]. Whether they add simulator behaviour: UNKNOWN |
| iynk | No such control found in lesson, lab tools or settings | FV: not possible; the interpreter has 11 fixed device kinds and drone parts are 3 x 3 x 3 dropdowns [FV section 6] |
| Others | not tested | Velxio: custom chips in C to WebAssembly, My Chips library on Pro. CircuitSim: Custom Component Studio. Cirkit: AI part builder takes 2 to 5 min per request [embedded-sim S5][circuit-eda S3][ai-hardware S29] |

Reading: nobody in the free, no-login set made custom parts easy for a beginner, as far as the benchmark could tell. "Easy for nobody" is a HYPOTHESIS because neither Wokwi's nor Falstad's feature was run [benchmark 6].

#### Task 6. Save, export, share

| Product | TESTED | Documented only |
|---|---|---|
| Wokwi | Save needs a name and Public or Unlisted; "Download project ZIP" and "Save a copy" in the menu. Signed-out save works but is tied to the browser | Unlisted projects need a paid plan; Community is public only [benchmark S4][benchmark S21] |
| Falstad | Menu: Save As, Export As Link, Text, Image, SVG | none |
| MakeCode | `microbit-Untitled.hex`, 1,302,540 bytes, via "Download as File". Sign-in is optional | Anonymous share link needs no account; persistent links need sign-in; no read-only share [benchmark S9] |
| iynk | No export of user work found. Progress and settings live in browser local storage | FV: edited code is lost on reload; the only download is a story PNG [FV section 5][FV section 6] |

#### Task 7. Add a collaborator

| Product | TESTED | Documented only |
|---|---|---|
| Wokwi | none | No first-party document of live co-editing found (UNKNOWN). Pro lists team billing, which is not collaboration [benchmark 4.1] |
| Falstad | No accounts | none |
| MakeCode | none | Copy of a shared project only. micro:bit classroom lets a teacher view and edit student code live with no accounts [education S6] |
| iynk | Together tab exists; creating a room is not read-only, so it was not clicked in the 2026-10-26 benchmark. Regraded partial: [BROWSER_WALK](../01_AUDIT/runs/BROWSER_WALK.md) step 9 tested a room in one browser (code, run, serial, fault, chat and keyboard baton synced; an edit by a page without the keyboard stays local with no warning); cross-device UNKNOWN. In the keyless E2E run the room specs passed including two tabs sharing a build, but with no relay a room is a BroadcastChannel inside one browser profile | Relay: 39 of 39 tests, 8-peer loopback test with no gaps. No cross-device test. Peer-id takeover reproduced [FV C018][E2E] |
| Others | not tested | Tinkercad invite link gives collaborators full edit rights; real-time co-editing for Circuits UNKNOWN [benchmark S15][benchmark S23]. Onshape live co-edit is a core feature (not tested) [ecosystems S4] |

#### Task 8. Debug an advanced hardware project

| Product | TESTED | Documented only |
|---|---|---|
| Wokwi | none | Web debugger (beta, AVR only): breakpoints, step, variables, call stack. 8-channel logic analyser with VCD export. GDB via VS Code for ESP32 and Pico [benchmark S5][benchmark S6] |
| Falstad | Scopes shown on the default circuit; no breakpoints | none |
| MakeCode | Debug Mode opened with Variables, Call Stack, run and step buttons; no logic analyser. Setting breakpoints by clicking was not tested | none |
| iynk | No breakpoint, analyser or variable view found by UI check and keyword scan. Serial monitor and "Checks (4/4)" exist | none |
| Others | not tested | Proteus: whole-circuit breakpoints, watch, logic analyser [circuit-eda S16]. Velxio: oscilloscope, serial monitor [embedded-sim S5] |

#### Task 9. Move from simulation to physical

| Product | TESTED | Documented only |
|---|---|---|
| Wokwi | "Download project ZIP" works. No BOM or wiring sheet found | VS Code and CI use `firmware` and `elf` paths; hex or ELF to a real board via PlatformIO, ESP-IDF, Arduino CLI [benchmark S8][embedded-sim S17] |
| Falstad | none | none |
| MakeCode | Only product that completes the loop on a real board: a .hex to copy to the MICROBIT drive | WebUSB one-click flashing (not run, headless) [benchmark S12] |
| iynk | "Build it for real" tab lists Arduino Uno R3, USB cable, breadboard, jumper wires, LEDs, resistors, with a "Check prices again" button. In the 2026-10-26 run on the production site it showed a rate-limit warning (a quota failure, per BROWSER_WALK step 16), "No listing found" for every part and `$0.00`. The keyless local walk showed catalogue prices instead. A "Proof of Build" devnet credential is described | FV: live pricing was out of quota (0 of 250 searches) on 2026-10-26; one cold BOM view costs 32 to 54 searches. The credential check is forgeable. A Web Serial and Firmata twin mirrors pins of Uno, Nano and Uno R4 to a real board; source read, no hardware test [FV C027][FV section 5][FV section 6] |
| Others | not tested | Velxio Pro: BOM CSV, schematic PNG, GitHub sync [embedded-sim S6]. Tinkercad: EAGLE or Fusion board export (2022 trade article, no BOM found) [embedded-sim S32]. EasyEDA: LCSC parts and JLCPCB order path [circuit-eda S20] |

### 3.3 Time and effort (script wall-clock; human column ESTIMATED)

| Product | Task | Script time | Human estimate | Stuck points seen |
|---|---|---|---|---|
| Wokwi | 1 + 2 | page ready 8 to 16 s; start to serial about 8 s, once 25+ s | 5 to 10 min | wiring by mouse; parts hidden under the serial pane; build queue |
| Falstad | 1 | 10 to 15 s per import | 3 to 5 min | symbol vocabulary; canvas-drawn menus, so keyboard and screen reader access is poor (HYPOTHESIS) |
| MakeCode | 2 + 3 + 8 | editor ready 17 s | 3 to 5 min | first-run tour; Download opens a WebUSB wizard; file download hidden in "..." |
| iynk | 2 | page 8 s, edit and run 5 s | 1 to 2 min | editor is a lesson snippet, not a project |
| iynk | 4 | about 15 s per fault with page load | 1 min | none seen |

### 3.4 What the benchmark means (restated from [benchmark 6], with FV and dossier checks)

- Task 4 is the one place iynk led. The claim that survives is narrow: "the only free browser tool in this test that explains why a wiring mistake breaks things", limited to Wokwi, Falstad and MakeCode, one scripted run, Wokwi evidence one frame per case. Repeat by hand on Wokwi and check Tinkercad with an account before using it publicly [benchmark 6].
- Tasks 1, 5, 6 and 8 are losses for iynk or gaps, and they are the tasks every other product lets a stranger try.
- Task 9: MakeCode is the only tested product that closes the loop on a real board. iynk's parts list is the idea nobody else showed in the free set, but it failed in the one run.
- Time to first result was shortest in MakeCode and iynk because neither uses a cloud build (TESTED, one case; the benefit on slow networks is a HYPOTHESIS) [benchmark 6].
- Wokwi, Falstad and MakeCode all have an open text format or a plain file download. iynk has none [benchmark 6].
- Wokwi's experimental MCP server in its CLI narrows any "MCP is unique" claim for iynk [benchmark S22].

---

## 4. Deep comparisons: the four rivals that matter most

Why these four. Wokwi (highest overlap on circuits, code and sharing, and the only competitor with hands-on evidence plus classroom pricing), Tinkercad Circuits (the K-12 incumbent), MakeCode (the education incumbent and the best finished loop to real hardware) and Velxio. The evidence picks Velxio as the fourth because three dossiers independently call it the closest or highest-threat new entrant: it overlaps boards, MicroPython, ESP32, AI, MCP, BOM and classroom pricing, and is moving fast [embedded-sim summary][circuit-eda 12][ai-hardware 8]. Cirkit Designer, DroneBlocks and Flux are the near misses; see 4.5.

Caveat that applies to every block: Tinkercad and Velxio were not run. Everything about them is EXTERNAL, much of it second-hand. Velxio's own numbers are vendor claims and inconsistent with each other.

What iynk "does" below is limited to what FV and the run reports verified. Status codes: V = verified by FV or a run, VP = verified in part, T = TESTED in the benchmark, U = not verified.

### 4.1 Wokwi

Snapshot: Wokwi B.V.; browser simulator plus VS Code extension (351,162 installs, about 4.5 stars from 20 ratings), CLI and CI; MIT parts (avr8js 852 stars, rp2040js 533, wokwi-elements 266); simulator service itself not stated as open source (UNKNOWN) [embedded-sim S1][embedded-sim S37][embedded-sim S2]. Pricing EUR 0 / 5.6 / 8.1 / 20, Classroom EUR 30 per student per semester [embedded-sim S1][embedded-sim S21].

What Wokwi does better than iynk today

| Capability | Evidence | Label |
|---|---|---|
| Users make original projects, share by link, fork | Opens a blank Uno project without login; Save and Download ZIP [benchmark 4.1] | TESTED |
| Real compiled firmware on 18 MCU variants, cycle-level AVR and RP2040 | Supported hardware page [embedded-sim S15][embedded-sim S22] | EXTERNAL |
| Custom chips API (C or WebAssembly) | beta [embedded-sim S16] | EXTERNAL |
| Debugging: AVR web debugger, logic analyser, GDB via VS Code | not run by the benchmark [benchmark S5][benchmark S6] | EXTERNAL |
| Export and CI: PlatformIO, ESP-IDF, Arduino CLI, Zephyr; CI scenarios | [embedded-sim S17][embedded-sim S18] | EXTERNAL |
| Paid classroom licence and per-seat model proven | EUR 30 per student per semester; no LMS shown [embedded-sim S21] | EXTERNAL |
| Ecosystem pull: VS Code extension, reused MIT emulators (Velxio, 8gwifi) | [embedded-sim S7][embedded-sim S43] | EXTERNAL |
| Experimental MCP server so agents can run simulations | [benchmark S22] | EXTERNAL |

What iynk does that Wokwi does not (as far as evidence shows)

| iynk capability | iynk status | Wokwi evidence | Verdict |
|---|---|---|---|
| Names, explains and repairs wiring faults | T (16 triggers, burnt LED, why panel, Repair). Engine caveats in FV C009, C010 | No warning in three captured runs (one frame each); forum users report no LED burn (2022) | iynk ahead in the test, narrow evidence |
| No compile queue; run in 5 s | T (one case) | Queue "#24" seen once; paid plans skip it | iynk ahead on friction for one case; cost is the subset interpreter |
| Robotics and drone labs | V (13 benches, 13 drones; E2E keyless: benches load, drone calc updates, flight demo clears first gate for 13 crafts) | No evidence of either (UNKNOWN, absence in pages read) | iynk ahead on scope; fidelity is arcade and rules |
| Six UI languages | VP (all keys present; quality unreviewed) | Wokwi UI languages UNKNOWN | UNKNOWN edge |
| Parts list with shop prices | U (failed in run; quota out) | No BOM found (UNKNOWN on paid plans) | not a working edge yet |
| Rooms up to 8 with translated chat | VP (relay tests pass; keyless rooms are same-browser; live translation not run) | Co-editing UNKNOWN | UNKNOWN edge, unproven |
| AI partner with tool calling | VP (live smoke 6 of 6; sees a text summary, not wiring) | No built-in AI; MCP experimental | iynk has AI built in, shallow state |
| Lessons with automated checks (461 checks) | VP (client-side only) | Docs and tutorials; teacher tools not shown for Classroom | unproven edge |

How fast could Wokwi copy iynk's differentiators (HYPOTHESIS; reasoning stated)

| Differentiator | Time | Why |
|---|---|---|
| Fault messages for overcurrent, reverse polarity, short | Months | It already has a diagram model and an event system; needs electrical rules or a SPICE layer. A rival with a real solver (Velxio uses ngspice) would find it easier. The authored explanations are the slower part |
| Six languages | Months | UI translation is routine; Wokwi's docs and community are English-led (UNKNOWN) |
| AI partner | Weeks to months | MCP exists; a built-in assistant is a product choice. Arduino, Velxio, Cirkit already ship one |
| Robotics and drone labs | Year or more, or never | Different market and engine; no sign in any dossier |
| Rooms and live co-editing | Months | Common web technique; Wokwi has not shipped it (UNKNOWN) |

Net: Wokwi is the benchmark iynk must beat on every circuit-and-code task before differentiators matter. Its blind spot is feedback on mistakes and anything beyond microcontrollers.

### 4.2 Tinkercad Circuits (Autodesk)

Snapshot: Autodesk. Arduino Uno, micro:bit and ATtiny simulation with CodeBlocks and text; Starters; classes; 100 million Tinkercad users claimed (UNCONFIRMED; the 2018 source says 100 million designs; a Nov 2024 marketplace listing says 86 million+ people) [embedded-sim S28][embedded-sim S48][segments S9]. Needs an account per two secondary sources; the Autodesk page returned a title only (UNKNOWN) [circuit-eda S44][education S45]. Free per third parties.

What Tinkercad does better than iynk today

| Capability | Evidence | Label |
|---|---|---|
| Free-form circuit editor and original projects | Third-party guides; account creates circuits [education S46][embedded-sim S31] | EXTERNAL |
| Teacher accounts, class management, join by class code with no email | 2026 third-party blog [embedded-sim S31] | EXTERNAL, second-hand |
| Install base and school habit | Autodesk is said to report about 1 million teachers using Tinkercad classrooms (UNCONFIRMED, second-hand) [segments S9] | EXTERNAL |
| Breakpoints and variable hover for micro:bit Python; Serial Monitor | [embedded-sim S29] | EXTERNAL, search summary |
| Shows a destroyed LED on wrong wiring | DroneBot forum user, workshop deck [embedded-sim S34][benchmark S16] | EXTERNAL, second-hand |
| Export to Fusion 360 or EAGLE board file | 2022 trade article [embedded-sim S32] | EXTERNAL |
| Languages: 16 stated | low confidence search summary [embedded-sim S32] | EXTERNAL |

Known limits per third parties: no custom libraries, small part set, no ESP32, idealised analog (CircuitSim's comparison, a competitor) [embedded-sim S28][education S46][circuit-eda S4].

What iynk does that Tinkercad does not (as far as evidence shows)

| iynk capability | iynk status | Tinkercad evidence | Verdict |
|---|---|---|---|
| Wider board list in one place: ESP32, STM32, Pico, micro:bit, Pi, FPGA | V for catalogue (12 boards); subsets, not emulators | Uno, micro:bit, ATtiny; ESP32 reported unsupported (second-hand) | Edge on breadth, weak on fidelity |
| Explained faults with Repair | T | LED failure shown; depth of explanation UNKNOWN | Edge is depth and breadth, unverified against Tinkercad |
| No account | V (no sign-in code; telemetry on by default) | Account needed per secondary sources | Edge, but loses class management |
| Robotics and drone labs | V | None found | Edge |
| Hand-inked 3D figures with see-through | VP (80 figure pages, 38 for items; no browser walk of rotation) | Not applicable | Different style, unproven value |
| Six languages | VP | 16 (low confidence) | No edge |

Copy speed (HYPOTHESIS): UNKNOWN. Autodesk has the resources, but no dossier measured how quickly Circuits ships features, and Autodesk's priorities for Circuits are not visible. The barrier is attention, not engineering. If Tinkercad adds AI, ESP32 or bigger part sets, iynk's breadth edge shrinks; if it adds fault explanations, the task 4 edge shrinks. Both are watch items (section 7).

### 4.3 MakeCode for micro:bit (Microsoft, with the micro:bit Educational Foundation)

Snapshot: PXT framework (MIT, 2.3k stars), editors for micro:bit and Arcade; micro:bit says 73.5 million children in 85+ countries; classroom with no accounts; CreateAI on-device ML (Google.org pilot, 2026-02-19) [education S2][education S8][education S9]. Free; the cited page states no price (UNKNOWN) [education S6].

What MakeCode does better than iynk today

| Capability | Evidence | Label |
|---|---|---|
| Finishes the loop on real hardware | `microbit-Untitled.hex` downloaded (1.3 MB); WebUSB wizard opened | TESTED |
| Simulator with debug mode: variables, call stack, stepping | Debug Mode opened | TESTED |
| Sensor simulation with sliders (temperature 21 C) | | TESTED |
| Blocks plus text, switchable | | TESTED |
| Extension model: GitHub-hosted packages with an approved list | [education S4][education S5] | EXTERNAL |
| Teacher view of student code live, no accounts, session report | [education S6] | EXTERNAL |
| Distribution: official micro:bit editor, Microsoft Teams assignments, mobile apps | [education S3][education S6] | EXTERNAL |
| MIT code (pxt) and MIT editors, reusable | [education S2][benchmark S13] | EXTERNAL |

Limits: simulator is a JavaScript stand-in for the C++ runtime, so board-fine code can error in it; some schools block the site; light mode disables the simulator on small devices [education S13].

What iynk does that MakeCode does not

| iynk capability | iynk status | MakeCode evidence | Verdict |
|---|---|---|---|
| Wiring, power and components as part of the lesson | V (breadboard circuits, 144 failures) | No wires exist; the tool avoids wiring faults by not modelling wiring | Different product; MakeCode is not a rival on faults |
| Boards beyond micro:bit | V for catalogue | One device family per editor | Edge on scope |
| Robotics and drone labs | V | Not covered by this editor | Edge |
| Real circuit-level cause and effect | VP (DC solver, rules) | None | Edge, limited |

Copy speed (HYPOTHESIS): Slow to never for wiring faults. MakeCode's design removes wires on purpose, and it is run by a platform vendor and a non-profit. The real exposure is the opposite: MakeCode is the best proof of what completes the loop (hex file, flashing, classroom). iynk could treat MakeCode as a distribution partner or a code base (pxt is MIT; pxt-microbit has MIT LICENSE text, though branding and art are separate and unchecked) rather than a rival [benchmark S13].

### 4.4 Velxio

Snapshot: open-source (AGPLv3 with paid commercial licence, 3.5k stars, 363 forks, 2,122 commits) browser simulator launched in 2026 by David Montero Crespo. avr8js and rp2040js in the browser; QEMU on a backend for ESP32, STM32, Pi Linux; ngspice WebAssembly; custom chips; AI Agent and Tutor on Maker, MCP on Pro; Docker self-host. Vendor says 15,000+ registered developers and 1,000+ simulations a day [embedded-sim S4][embedded-sim S5][embedded-sim S6]. Dossiers disagree on board count (19, 30+, 35, 40), so no board count should be quoted [embedded-sim S4][embedded-sim S5][embedded-sim S6][embedded-sim S7].

What Velxio does better than iynk today

| Capability | Evidence | Label |
|---|---|---|
| Original projects, custom chips, Library Manager | [embedded-sim S5][embedded-sim S6] | EXTERNAL (vendor) |
| Real CPU emulation and real toolchains (arduino-cli, ESP-IDF) | [embedded-sim S4][embedded-sim S5] | EXTERNAL (vendor) |
| Analog layer: ngspice WebAssembly, oscilloscope | [embedded-sim S5][circuit-eda S42] | EXTERNAL (vendor) |
| AI Agent designs, compiles, checks its own work; Tutor mode; MCP | Agent on Maker, MCP on Pro [circuit-eda fact-check 6] | EXTERNAL (vendor) |
| BOM CSV and schematic PNG export, GitHub Sync (Pro) | [embedded-sim S6] | EXTERNAL |
| Classroom plan: from USD 34 per student per year, 5-student minimum | [embedded-sim S6] | EXTERNAL |
| Zero-setup experience praised by Show HN readers (ran on an old Android phone) | [embedded-sim S7] | EXTERNAL, anecdotal |
| Open source with self-host | | EXTERNAL |

Velxio's own weaknesses, from Show HN and the dossiers: cold ESP32 builds take minutes; ESP32 and Pi run on backend QEMU, not in the browser; timing is wall-clock synced for AVR but fixed cycles per frame for RP2040 and ESP32-C3; no ELF upload at the time; 8 MB splash image; some doubt about an AI-built GUI; some features are time-capped on Free [embedded-sim S4][embedded-sim S7].

What iynk does that Velxio does not (as far as evidence shows)

| iynk capability | iynk status | Velxio evidence | Verdict |
|---|---|---|---|
| Robotics Lab and Drone Lab | V | None found | Edge on scope |
| Explained fault injection with Repair | T for 16 uno-blink triggers | Failure modelling UNKNOWN; ngspice could produce overcurrent numbers | Edge unverified; Velxio is closest to being able to match it |
| Core boards run with no backend | VP (interpreters in the browser; keyless build works) | ESP32, STM32, Pi need QEMU servers | Edge on cost and offline-ness, but at the price of fidelity |
| Six UI languages | VP | UNKNOWN | UNKNOWN edge |
| Hand-inked figures, 272 robotics assembly steps (579 build steps across all labs), 71 lessons with checks | V for counts | 400+ examples (vendor) | Different content; unproven value |
| Rooms | VP | Collaboration UNKNOWN beyond GitHub Sync | UNKNOWN edge |

Copy speed (HYPOTHESIS, fastest of the four): Velxio reuses Wokwi emulators, was built with AI help and ships often [embedded-sim S7]. With ngspice already inside, overcurrent and polarity messages are weeks to months of work. UI translation: months. Robotics and drone labs: a different build and not on its roadmap as far as the sources show. The AGPL means iynk cannot embed its code in a closed product without a commercial licence [embedded-sim S5].

### 4.5 Why not another rival

| Candidate | Why not in the four | Where it matters |
|---|---|---|
| Cirkit Designer | Evidence is thin: pricing, owner, user count UNKNOWN; "30,000+ components" claim does not hold on re-check; only Uno and Mega simulated [ai-hardware S28][ai-hardware S29][embedded-sim S26] | AI wiring and part builder and 12 UI languages (more than iynk's six) make it the closest hit for the learner AI idea. Hands-on test recommended |
| DroneBlocks | Drone Lab only | USD 695 per year school licence with browser PX4 sim; the rival for the Drone Lab in schools [drone S15][drone S16] |
| Flux | Professional PCB audience | Best-funded AI hardware tool; MCP server; education plan not found [ai-hardware S3][ai-hardware S6] |
| Arduino Cloud | No simulator | School channel, AI Assistant, USD 20 per member [embedded-sim S8] |
| VEXcode VR | Robot coding only | Robotics clubs; fixed robot; USD 199 / 499 per educator [education S29] |

### 4.6 Copy-speed summary (all HYPOTHESIS)

| iynk differentiator | Wokwi | Tinkercad | MakeCode | Velxio |
|---|---|---|---|---|
| Explained wiring faults | Months | UNKNOWN (partly done: LED failure shown) | Slow or never | Weeks to months |
| Robotics and drone labs | Year+ or never | UNKNOWN, no sign | Never | Year+ or never |
| Six UI languages | Months | Done (16, low confidence) | Done (translation docs exist, list UNKNOWN) | Months |
| AI partner | Weeks to months (MCP exists) | UNKNOWN | UNKNOWN | Done (Agent, Tutor, MCP) |
| Rooms and translated chat | Months | UNKNOWN | Classroom live view exists | UNKNOWN |
| Parts list and BOM | Months | UNKNOWN | Not applicable | Done on Pro (BOM CSV) |
| Authored corpus (144 + 106 faults, 71 lessons, 272 robotics steps) | Slow: content work, not engineering | Slow | Slow | Slow, unless AI-generated (a risk) |

---

## 5. Open source we could build on (licence-checked)

"Licence-checked" means the dossier read the SPDX id from the GitHub API or the LICENSE file text on 2026-10-26. It is not legal advice; anything GPL, AGPL or LGPL needs counsel before shipping [sim-options 0]. Stars and dates are as of 2026-10-26.

Two facts about iynk itself that affect this table. First, iynk has no LICENSE file, and its drone constants, lesson structure and timings follow three third-party sites with no permission on file [FV section 6]. Second, the HackTX rule that every line of project code be written inside the hacking window ends with the event, but the sim dossier asks that any third-party code be added only with a licence check and a recorded decision [sim-options 0].

### 5.1 Safe to bundle (permissive), with the catch

| Project | Licence | Use for iynk | Catch | Source |
|---|---|---|---|---|
| avr8js | MIT | Real ATmega328P (Uno, Nano) with compiled sketches in the browser | One dominant maintainer (322 commits; next human 3 or fewer). Fork is allowed. Bundle size and fit with iynk's C++ subset not tested | [embedded-sim S2][sim-options 2.1][tech-research F6] |
| rp2040js | MIT | Pico with stock MicroPython UF2; GDB server | One dominant maintainer; RP2040 only, no RP2350 | [embedded-sim S3][sim-options 2.1] |
| wokwi-elements | MIT | Part artwork as web components | No simulation code | [embedded-sim S39][platform 1.3] |
| wokwi-cli | MIT | CI-style scenario ideas | 69 stars | [ecosystems S23] |
| micro:bit V2 simulator and Python Editor v3 | MIT | micro:bit V2 MicroPython in a browser iframe | Keep MicroPython and CODAL notices; latest release 2024-11-25 | [sim-options 2.1][education S10] |
| micro:bit ml-trainer (CreateAI) | MIT | Pattern: train on sensor data, use on device | 16 stars | [education S11] |
| MicroPython WebAssembly port | MIT | Python runtime in a board shim | Port config has no `machine` module | [sim-options 2.1] |
| Pyodide | MPL-2.0 | CPython for Pi-style teaching | File-level copyleft: changes to Pyodide's own files must be shared | [sim-options 6] |
| PyScript | Apache-2.0 | Wrapper | none | [sim-options 2.1] |
| Microsoft PXT (MakeCode) | MIT | UI patterns, extension mechanism, .hex flashing | pxt-microbit shows NOASSERTION on GitHub but its LICENSE.txt is MIT; Microsoft and micro:bit logos, names and art are separate and unchecked | [education S2][benchmark S13] |
| esp32sim | MIT | Possible future real-ESP32 mode in WebAssembly | S3 mature, classic ESP32 early, others draft; 684 stars | [embedded-sim S25] |
| eecircuit-engine, EEcircuit | MIT (wrapper) over ngspice | Accurate analog as a "run accurate analysis" engine and a checker for iynk's own solver | One author; V2 lacks Monte Carlo and corners | [circuit-eda S29][sim-options 3.1] |
| ngspice | Modified BSD for the core, mixed elsewhere | Build our own pinned WebAssembly copy | COPYING says the branch as a whole has no single licence. Leave out CIDER (older research licence) and KLU (LGPL-2.1+) in a closed build | [sim-options 3.1][sim-options 6] |
| DigitalJS, Yosys / YoWASP | BSD-2-Clause, ISC | Visual Verilog elaboration in the browser | About 80 MB class downloads (D3 risk) | [sim-options 6][tech-research D3] |
| MuJoCo WebAssembly | Apache-2.0 | Rigid-body engine for robotics and drone scenes | README says work in progress; thread build needs COOP and COEP headers | [robotics S16][robotics S19] |
| Rapier (WASM) | Apache-2.0 | Robot physics, deterministic given identical setup | Async WASM load; `Math.sin` may differ across platforms | [platform 3] |
| Jolt Physics (JoltPhysics.js) | MIT | Alternative with vehicles and constraints | Determinism needs a build flag | [platform 3] |
| urdf-loader | Apache-2.0 | Import and export URDF for ROS users | README does not mention xacro or IK | [platform 3] |
| roslib, rosbridge_suite | BSD-2-Clause, BSD | Opt-in ROS 2 bridge | needs a server | [platform 3] |
| Foxglove SDK and MCAP, Rerun | MIT; Apache-2.0 | Log format and viewer for sim runs | Rerun web viewer features not verified | [robotics S23][robotics S25] |
| xyflow, Konva, PixiJS | MIT | Editor canvas options | Wire-level UX still custom. tldraw is not OSI (custom licence, key needed); GoJS is commercial | [platform 1.3] |
| Yjs, Automerge, Loro | MIT | Collaboration, if offline merge is needed | Server-ordered log on the existing relay may be enough | [platform 2.1][tech-research D5] |
| atopile, tscircuit | MIT | Ideas for a text circuit format an LLM can read and diff | atopile may be quiet since Feb 2026 (HYPOTHESIS) | [ai-hardware S18][ai-hardware S42] |
| Zoo modeling-app (KCL) | MIT | Possible interop for frames and enclosures | Mechanical CAD only | [ai-hardware S33] |
| Extism, QuickJS (quickjs-emscripten) | BSD-3-Clause; MIT | Extension sandbox if custom parts ever run code | Extism npm is a release candidate | [platform 5.1] |
| Webots, Gazebo | Apache-2.0 | Reference designs, graduation targets (export URDF or SDF) | Desktop, not embeddable in a browser | [robotics S1][robotics S7] |
| PX4 | BSD-3-Clause | Study SIH; opt-in server mode later | Porting C++ to a browser is a large job | [drone S1] |
| WPILib | BSD-3-Clause | Same-code-in-sim pattern | Desktop | [education S39] |
| Isaac Lab | BSD-3-Clause per README | Graduation target | GitHub API says NOASSERTION; Isaac Sim is Apache-2.0 with additional licences for components | [robotics S10][robotics S13] |

### 5.2 Learn from, do not embed (copyleft or unclear)

| Project | Licence | Why not embed | Source |
|---|---|---|---|
| Falstad CircuitJS1 | GPL-2.0-or-later | A web app that ships its JS to users is distribution. Learn the approach; write a clean-room solver | [circuit-eda S5][sim-options 3.1] |
| Velxio | AGPLv3 plus paid commercial licence (SPDX suffix UNKNOWN) | Network use triggers AGPL; closed use needs a commercial licence | [embedded-sim S5][tech-research F7] |
| SimulIDE | AGPLv3 (site) or GPL-3.0 (repo) | Sources disagree | [circuit-eda S10][circuit-eda S11] |
| simavr, Unicorn, Xyce, Qucs-S, Icarus | GPL-2.0 or GPL-3.0 | Copyleft | [sim-options 6] |
| QEMU and Espressif QEMU | GPL-2.0 | Only as a separate server process; counsel needed. Espressif fork lacks Wi-Fi, I2C, general SPI and GPIO matrix and has no support | [sim-options 6][tech-research F10] |
| arduino-cli | GPL-3.0 or paid commercial licence | Server-side use needs written clearance before a commercial launch | [sim-options 6] |
| ArduPilot, Betaflight, Betaflight Configurator, Blackbox Explorer | GPL-3.0 | Embedding would make the combined work GPL | [drone S2][drone S5][drone S21] |
| Crazyflie firmware | GPL-3.0 per LICENSE.txt; README says LGPL-3.0 | Conflict stays | [drone S46] |
| FlightGear | GPL-2.0 per GitHub mirror | Heavy desktop sim | [drone S45] |
| Fritzing | GPL-3.0 (docs and parts CC BY-SA 3.0) | Copyleft | [circuit-eda S33] |
| KiCad | GPL-3.0 on GitHub mirror, Boost file on GitLab; primary licence UNKNOWN | Not an engine | [circuit-eda S24][circuit-eda S25] |
| Renode | MIT with bundled libraries under their own licences (tlib LGPL) | Server side only; no RP2040 or ESP32 platform in repo tree | [sim-options 2.1] |
| JSBSim | LGPL-2.1 | Own Emscripten build needed; LGPL duties | [platform 4] |
| Verilator | LGPL-3.0-only or Artistic-2.0 | Server side, choose Artistic | [sim-options 6] |
| Liveblocks server | AGPL-3.0-or-later (client Apache-2.0) | Hosted option exists | [platform 2.1] |

### 5.3 Not open source, or unknown

Wokwi's simulator service (UNKNOWN), Tinkercad, Arduino Cloud, LabsLand, The Construct, Proteus, Multisim, eCalc, VEXcode VR and all AI-hardware startups except those named above [market 12][embedded-sim S1].

---

## 6. Signals of unmet need

How to read this: each row is one public post, thread or news item. They show that a view exists, not how common it is. No Reddit thread was read (blocked for automated fetch). Nothing here is a statement that anyone wants iynk. No interview was done [segments how to read]. The links were opened by the dossier authors on 2026-10-26 unless a column says otherwise.

### 6.1 Wrong wiring and mismatch between simulation and the bench

| Signal | Date | Link | What it shows | Strength |
|---|---|---|---|---|
| A DroneBot Workshop user said an LED across supply and ground does not burn out in Wokwi, whereas Tinkercad shows failure | about 2021 to 2022 | https://forum.dronebotworkshop.com/arduino/arduino-on-line-simulator/ [embedded-sim S34] | Failure modelling is something users notice | Anecdote, search summary only |
| Forum users see different currents and switching points in simulation than on a breadboard; causes listed are parasitics, tolerances, meter loading, wiring errors | various | https://forum.allaboutcircuits.com/threads/unable-to-understand-big-difference-between-simulation-and-real-life-circuit-simple-light-detector.191139/ [segments S33] | Beginners hit the sim-versus-bench gap | Anecdote, search summary |
| Proteus does not enforce missing power, ground or crystal circuits, so working simulations can fail on real hardware | undated, old | https://forum.arduino.cc/t/simulator/375591 [circuit-eda S17] | Lack of fault enforcement is a known complaint in the pro tool too | Anecdote |
| A Thai university paper piloted Wokwi because hands-on activities "often face interruption due to hardware issues" | 2025 | https://kirim.kmutt.ac.th/converis/portal/detail/Publication/1533771335?lang=en_GB [segments S37] | Hardware faults and access cost class time | Abstract only |
| A 2022 Arduino forum thread says GRBL hung in Wokwi versus a real Uno; a MicroPython forum user found uasyncio slower than hardware | 2022 | https://forum.arduino.cc/t/why-does-the-wokwi-simulator-hang-grbl/985524 ; https://forum.micropython.org/viewtopic.php?p=67671 [embedded-sim S33][embedded-sim S34] | Timing and fidelity doubts about the market leader (may be stale) | Anecdote, 2022 |
| MakeCode forum: code that works on the board errors in the simulator | undated | https://forum.makecode.com/t/what-causes-the-simulator-to-generate-this-error-the-code-works-in-the-board-hardware-fine/15610 [education S13] | A stand-in simulator misleads | Anecdote |

### 6.2 Paywalls, limits and the missing project model

| Signal | Date | Link | What it shows | Strength |
|---|---|---|---|---|
| "Tinkercad has no possibility to upload a file or select an other library then a few included libraries" | 2021-10-28 | https://forum.arduino.cc/t/looking-for-an-arduino-simulator/919632 [segments S12] | Library limits in the school tool | Anecdote |
| "For analog stuff it is is hopeless" (about Wokwi) | 2025-03-02 | https://forum.arduino.cc/t/simulator-which-one-is-better/1359552 [segments S13] | Analog is a weak spot of the leader | Anecdote |
| "Wokwi is SaaS emulator with a monthly cost" and "They want you to pay and that's limiting" | 2026-10-18 | https://news.ycombinator.com/item?id=50139022 [segments S16] | Pay pressure on Wokwi. Comment sits under a Show HN for a rival ESP32 simulator, so it may be from its author or a fan | Anecdote, interested party possible |
| "It worked for simple circuits, but for mine, the astable multivibrator, it didn't for some reason" (Tinkercad) | 2025-07-29 | https://news.ycombinator.com/item?id=44729536 [segments S15] | Tinkercad limits on non-trivial analog | Anecdote |
| "Being able to do integration tests without the physical device itself is an absolute game changer." | 2026-07-05 | https://news.ycombinator.com/item?id=48793010 [segments S16] | Demand for simulation in tests (an engineer need, not a complaint) | Anecdote |
| Forum users see no free alternative to eCalc; free version has limited part choice | 2024-12-08 | https://intofpv.com/archive/index.php/thread-27441.html [drone S23] | Open slot for a free drone calculator | Anecdote, not re-opened in fact-check |
| Fritzing "Confusion over Software Pricing" | 2025-02-28 | https://forum.fritzing.org/t/confusion-over-software-pricing/27363 [circuit-eda S32] | Paid binaries confuse beginners | Anecdote |
| CircuitLab free tier started timing out; users felt bait-and-switch | 2013 to 2015 | https://www.circuitlab.com/forums/support/topic/e49b6z8c/free-circuit-lab-timeout-messages [circuit-eda S37] | Closing a free tier costs trust | Old |
| Show HN Velxio 2.0 (196 points, 25 comments): praised zero setup; flagged compile-before-Play confusion, 8 MB splash, no ELF upload, timing doubts | about 7 months before 2026-10-26 | https://hn.nuxt.dev/item/47548013 [embedded-sim S7] | What users want from a new browser simulator | Anecdote |

### 6.3 Vendor, trust and platform risk

| Signal | Date | Link | What it shows | Strength |
|---|---|---|---|---|
| Multisim Live reaches end of life 2026-09-15; a self-described former NI employee launched CircuitSim as a replacement | announced 2026-04-22 | https://www.eevblog.com/forum/projects/multisim-live-going-eol-in-september-building-free-alternative/ [circuit-eda S2]; Digilent notice https://support.digilent.com/hc/en-us/articles/41178584173979-Multisim-Live-EOL-Letter (403, search snippet) [circuit-eda S1] | A free browser SPICE tool vanished; users need an export | Date rests on one competitor page and a snippet; shutdown itself UNKNOWN |
| Makers criticised Qualcomm-era Arduino terms: broad licence over uploads, reverse-engineering ban | 2025-11-21 | https://www.theregister.com/2025/11/21/adafruit_makers_unhappy_with_arduino [embedded-sim S9]; Arduino reply https://blog.arduino.cc/2025/11/21/the-arduino-terms-of-service-and-privacy-policy-update-setting-the-record-straight/ [ecosystems S25] | Trust room for a plain content-ownership promise | Press; Arduino says terms apply to SaaS only |
| LEGO retires SPIKE Prime and Essential (sales end 2026-06-30; app to 2031-06-30) | 2026 | https://education.lego.com/en-us/spike-update-2026/ [education S32] | Hardware platform risk for schools | Vendor notice |
| Tello EDU reported discontinued | 2023 to 2025 | https://community.droneblocks.io/t/dji-tello-discontinuation-new-crazyflie-micro-drones/1265 [drone S20] | A low-cost education drone slot vacated | Mixed reports |
| Foxglove closed open-source Studio; robotbenchmark.net now serves spam; PartyKit hosted shut down 2026-10-23 | 2024 to 2026 | https://discourse.openrobotics.org/t/foxglove-2-0-integrated-ui-new-pricing-and-open-source-changes/36583 [robotics S22]; https://robotbenchmark.net/ [robotics S29]; [tech-research F1] | Free browser tools are fragile | Fact |
| Thingiverse sold again (MyMiniFactory, Feb 2026) | 2026-02-13 | https://3dprintingindustry.com/news/thingiverse-joins-myminifactory-in-major-3d-printing-community-consolidation-248924/ [ecosystems S18] | Community owner change upsets creators | Trade press |

### 6.4 Learning curve, AI trust and the education gap

| Signal | Date | Link | What it shows | Strength |
|---|---|---|---|---|
| ROS Discourse: Gazebo material outdated, Isaac Sim hardest to start, Webots docs "felt kinda dated" | 2025-03-09 | https://discourse.openrobotics.org/t/why-is-gazebo-very-famous-in-the-ros-community-what-about-webots/42459 [robotics S28] | Robot simulators are hard for learners | Community opinion |
| r/arduino "ChatGPT cannot be trusted": check every pin against the datasheet | 2025-04-24 | https://www.reddit.com/r/arduino/comments/1k6tln6/chatgpt_cannot_be_trusted/ [ai-hardware S41] | General chatbots do not see wiring | UNCONFIRMED: mirror dead, Reddit blocked |
| Flux Copilot looped for an hour and charged credits; work stopped after intensive use | undated | https://feedback.flux.ai/bugreports/p/copilot-looped-for-an-hour-and-charged-me-credits-but-didnt-output-any-of-the-co [ai-hardware S8] | AI metering anxiety is a real complaint | Anecdote |
| Wokwi's classroom page targets universities, not K-12; no K-12 teacher pain quote found | 2026-10-26 | https://wokwi.com/classroom [segments S11] | K-12 is under-served by the leader's paid plan, or simply not wanted (UNKNOWN) | Absence |
| Arduino free plan "disk limit reached" errors; free-compile limit | various | https://forum.arduino.cc/t/rename-sketch-con-arduino-cloud-editor/1397019 [education S20] | Limits bite on free accounts | Anecdote |

### 6.5 What is missing

No signal was found for hackathon builders, FPV pilots wanting a builder, robotics clubs, K-12 teachers or Hindi-speaking learners. Those are UNKNOWN, not proven absent [segments gaps].

---

## 7. Threats and watch list

### 7.1 Competitive threats

| # | Threat | Evidence now | What would raise it | Rating |
|---|---|---|---|---|
| 1 | Velxio copies iynk's differentiators and sells to classrooms | Open source, 2,122 commits, AI-assisted build, ngspice inside, Agent, Tutor, MCP, BOM, USD 34 per student per year; vendor says 15,000+ registered developers [embedded-sim S4][embedded-sim S6] | Fault explanations, UI translation, a robotics or drone module, education wins | High |
| 2 | Wokwi adds feedback on mistakes, built-in AI or co-editing, or a K-12 plan | Experimental MCP; Classroom at university level; co-editing UNKNOWN [benchmark S22][embedded-sim S21] | A Wokwi blog or docs change; the pricing page; a K-12 landing page | High |
| 3 | Tinkercad adds ESP32, AI, bigger parts, or fault explanation | Autodesk resources; nothing measured about Circuits' release pace (UNKNOWN) | Autodesk Circuits release notes | Medium to high |
| 4 | Arduino (Qualcomm) pushes School plan, AI Assistant and UNO Q | School USD 20 per member per year, Google Classroom, Claude-based assistant; trust damage since Nov 2025 [embedded-sim S8][ai-hardware S35] | New terms, a simulator inside Cloud Editor | Medium |
| 5 | Flux moves down-market into education | USD 37M (Feb 2026), 1.1 million builders (vendor), MCP server; no education plan found [ai-hardware S3][ai-hardware S6] | An education plan; a simulation feature | Watch |
| 6 | Cirkit Designer becomes the learner AI tool | AI wiring, AI part builder, 12 UI languages; plans, owner, users UNKNOWN [ai-hardware S28] | Hands-on test; funding news | Watch |
| 7 | Chatbots plus MCP replace a built-in "AI partner" | Wokwi CLI MCP and Flux MCP let Claude, Cursor, Codex read live state [ai-hardware S6][benchmark S22] | Wokwi MCP leaving "experimental" | Medium |
| 8 | CircuitSim wins the ex-Multisim-Live classroom | Free capped tier, SPICE, classes; no MCU [circuit-eda S3] | MCU parts added | Low for iynk |
| 9 | DroneBlocks or a funded newcomer wins school drone sim | Browser PX4 sim, USD 695 per year; SkySim says the same gap in the open (9 stars) [drone S15][drone S28] | A free tier; a calculator inside | Medium |
| 10 | Distribution incumbents extend: Raspberry Pi Code Editor (embeddable, Sense HAT emulator), micro:bit classroom, VEX | RPF reports 36,477 Code Editor users and 1,996 schools in 2025 [education S21] | Hardware simulation added | Low to medium |
| 11 | A well-funded entrant copies the three-lab idea | None found; SkySim, Nexus FPV are hobby scale [drone S28] | Venture rounds for "browser hardware lab" | Watch |

### 7.2 Exposures that are iynk's own and visible to rivals or buyers

These are not competitors, but a rival's sales call or a school's review would find them. Each is from the audit or compliance dossier.

| Exposure | Evidence | Source |
|---|---|---|
| Home-made interpreters are subsets, not emulators; programs for real toolchains often will not compile | FV C005, tests mostly self-consistency, no hardware reference | [FV C005][FV C039] |
| No export, no saved work, no accounts, no educator tools | Section 6 of FV | [FV section 6] |
| "Priced live" was contradicted (0 of 250 searches left; HTTP 429) | A feature that failed in the one benchmark run | [FV C027][benchmark 4.4] |
| Credentials are forgeable (client-supplied event log) | Anyone can mint to any wallet | [FV section 7] |
| No LICENSE and unresolved provenance for drone constants and lesson structure | Three third-party sites followed | [FV section 6] |
| Child-safety and privacy: default-on telemetry, no age gate, unmoderated rooms and buddy list, Gemini terms bar apps likely used by under-18s | 14 release blockers before marketing to schools | [compliance 9][tech-research F2][tech-research F5] |
| Keyless E2E: one Board Lab test failed (keyboard shortcut `]` after Escape). Cause is a HYPOTHESIS in E2E (focus left in the editor), not re-run | 116 passed, 1 failed, 2 skipped | [E2E] |
| Unit test timeouts under load | 13 timing failures in the full run, in 3 files; run alone on a loaded machine (load 43 to 88), 2 of the 3 files still failed one test each and 1 passed (27 of 27) | [COMMANDS] |
| Heavy first load on lab pages | 1.6 to 2.2 MB uncompressed (about 500 to 700 KB gzip, ESTIMATED) | [BUILD_OUTPUT] |

### 7.3 Watch list (check monthly; nothing here was monitored by the dossiers)

| Watch | Where | Why |
|---|---|---|
| Wokwi pricing, docs, MCP page, Classroom page | wokwi.com/pricing, docs.wokwi.com/wokwi-ci/mcp-support, wokwi.com/classroom | Fastest-moving leader; co-editing, AI, K-12 |
| Velxio stars, commits, pricing, language list, board list | github.com/davidmonterocrespo24/velxio, velxio.dev | Closest rival |
| Tinkercad Circuits release notes and blog | tinkercad.com/blog | Autodesk page never loaded; need a human with an account |
| Arduino Cloud plans and terms; Qualcomm integration | cloud.arduino.cc/plans | School price anchor and trust |
| Flux pricing, education plan, MCP | flux.ai/pricing | Best-funded AI hardware tool |
| Cirkit Designer plans, languages, users | cirkitdesigner.com | UNKNOWN today |
| CircuitSim and Multisim Live shutdown | circuitsim.com; NI | Classroom switching |
| esp32sim, SkySim, Nexus FPV | GitHub | Early open entrants |
| Licences of avr8js and rp2040js; maintainers | github.com/wokwi | Bus factor of one on the core "real firmware" path [tech-research F6] |
| COPPA and EU AI Act moves | FTC, EU | Rules apply to iynk's audience now [compliance 9] |

---

## 8. Differentiation hypotheses from BRIEF 5.4, graded

Grades:
- Genuinely hard to replicate: needs engineering, content or data a rival cannot add in months, and no rival does it today.
- Merely convenient: useful to a user, but a rival can copy it in months, or it is a packaging of things others have.
- Already done by someone: a rival ships it today, per the dossiers.

The grade is my judgement (HYPOTHESIS). "iynk today" uses FV and the run reports, not the README.

| # | Hypothesis | Grade | Evidence for the grade | iynk today |
|---|---|---|---|---|
| 1 | One continuous workflow from circuit design to robotics or flight simulation | Genuinely hard to replicate as a combination, but only if it becomes real | No dossier found a product joining circuits, robot bodies and flight. Robotics: no row has a circuit editor, MCU sim or failure model. Drone: calculator, BOM and sim are in separate tools. Each slice alone is done: Wokwi for boards, VEXcode VR for robots, DroneBlocks and eCalc for drones [robotics summary][drone summary][embedded-sim summary] | Three separate catalogues. Whether a board lab circuit feeds a bench or a drone is not shown in the audit. A continuity claim today is a plan, not an asset |
| 2 | Intelligent, explainable fault simulation | Merely convenient (engine); the authored corpus is slower to copy | TESTED ahead of Wokwi, Falstad (MakeCode has no wires) in one run [benchmark 6]. Tinkercad is said to show LED failure; Proteus does not enforce power or ground. Velxio has ngspice, which makes the engine part easy | 144 board failures and 106 bench faults re-counted. Breadboard faults use a DC solver with a fixed 25 ohm pin model; others are rules. Not every fault was exercised [FV C009][FV C010] |
| 3 | Learning through realistic failures | Merely convenient until outcome evidence exists | No education product advertised failure modelling in pages read (UNKNOWN); LabsLand has only real hardware faults. No learner test exists for iynk or anyone [education summary] | Break-it tab and lessons exist; no test of learning |
| 4 | AI guidance grounded in real project state | Already done by someone | Flux reads live schematic, PCB, netlist and exposes MCP. Velxio Agent compiles and checks. Cirkit AI wires parts. Arduino reads code. Wokwi CLI has MCP [ai-hardware summary] | Partner uses tools; on boards and benches sees a text summary, not wiring; AI is off without server keys; MCP never tried with a real client [FV C020][FV C034] |
| 5 | Seamless multilingual collaboration | Merely convenient | UI translation is done elsewhere (Cirkit 12, Tinkercad 16 low confidence, Onshape pages). Translated room chat is not found elsewhere, but is an LLM call that masks code and numbers | Six languages: keys present, quality unreviewed. Rooms verified at relay level; live translation not run; keyless rooms are same-browser [FV C023][FV C024][E2E] |
| 6 | Student-authored learning and engineering projects | Already done by someone | All 14 live circuit products let users create projects; Wokwi, Falstad, MakeCode, Tinkercad, Velxio, CircuitSim, Cirkit | Not possible today. This is a gap, not a differentiator [circuit-eda summary][FV section 6] |
| 7 | Community-built component ecosystem | Already done by someone (in programmer form); the beginner form is open | Wokwi chips API (beta), MakeCode GitHub extensions, CircuitSim Component Studio and community parts, Velxio custom chips and My Chips. Cirkit's AI builder points at the beginner form. No scale of community shown for any | Nothing; the interpreter has 11 fixed device kinds [FV section 6] |
| 8 | Low-friction route to a physical prototype | Merely convenient | MakeCode completes the loop with .hex. Velxio Pro, EasyEDA, Flux export a BOM or fab files. A price lookup and CSV are easy; trust that firmware works on the real board is the hard part | Parts list exists; prices failed in the run; no code export; interpreters are subsets [FV C027][benchmark 4.4] |
| 9 | Affordable access in underserved educational markets | Already done by someone (free access); iynk's twist is not unique | MakeCode, Falstad, Tinkercad, Raspberry Pi Code Editor and VEXcode VR Free are free. Wokwi Community is free for public projects. Distribution, not price, is the moat in this category (micro:bit 73.5 million children; Code Clubs in 111 countries) [education summary] | Free, six languages, no account. Low-bandwidth and offline use untested; lab pages are heavy. Who pays is open: the market sizing finds about USD 7.4M serviceable and about USD 0.3M a year realistic in three years [market 0] |

What this grading says, in short:

- Only hypothesis 1 grades "hard", and only as a future combination. Its parts are available separately elsewhere.
- Hypotheses 4, 6, 7 and 9 are already done by someone. Items 6 and 7 are table stakes that iynk lacks.
- Hypotheses 2, 3, 5 and 8 are convenient: they help users but copy in months. Of these, 2 has the strongest current evidence and the corpus behind it is the slowest part to copy.
- Nothing here chooses a positioning or a beachhead. That belongs to the strategy phase, using this grading, [USER_SEGMENTS](USER_SEGMENTS.md) and [MARKET_ANALYSIS](MARKET_ANALYSIS.md).

---

## 9. Dossiers and sources

Every dossier read for this file. Source tags in this document, such as [embedded-sim S4], refer to the numbered source lists at the end of each dossier. Other tags: [dossier summary] is that dossier's Summary section; [dossier N] or [dossier 4.1] is a numbered product or section; [FV C005] is a claim id in the FEATURE_VERIFICATION register.

| Short name | File | Read |
|---|---|---|
| embedded-sim | [competitors/embedded-sim.md](competitors/embedded-sim.md) | in full |
| circuit-eda | [competitors/circuit-eda.md](competitors/circuit-eda.md) | in full |
| education | [competitors/education.md](competitors/education.md) | in full |
| robotics | [competitors/robotics.md](competitors/robotics.md) | in full |
| drone | [competitors/drone.md](competitors/drone.md) | in full |
| ecosystems | [competitors/ecosystems.md](competitors/ecosystems.md) | in full |
| ai-hardware | [competitors/ai-hardware.md](competitors/ai-hardware.md) | in full |
| benchmark | [WORKFLOW_BENCHMARK.md](WORKFLOW_BENCHMARK.md) | in full |
| segments | [USER_SEGMENTS.md](USER_SEGMENTS.md) | in full |
| market | [MARKET_ANALYSIS.md](MARKET_ANALYSIS.md) | sections 0, 3, 4, 5, 6.2, 12 (not the sensitivity, grants or source list) |
| sim-options | [tech/simulation-options.md](tech/simulation-options.md) | sections 0, 1, 2.1, 3.1, 5 (end), 6, 7 |
| platform | [tech/platform-options.md](tech/platform-options.md) | sections 1.3, 2.1, 3, 4 (part), 5.1 |
| compliance | [tech/compliance-safety.md](tech/compliance-safety.md) | sections 0 and 9 only |
| tech-research | [TECHNICAL_RESEARCH.md](TECHNICAL_RESEARCH.md) | sections 1 and 2 only |
| FV | [../01_AUDIT/FEATURE_VERIFICATION.md](../01_AUDIT/FEATURE_VERIFICATION.md) | sections 0 to 8, claims register read selectively (C001 to C066) |
| E2E, COMMANDS, BUILD_OUTPUT | [../01_AUDIT/runs/E2E.md](../01_AUDIT/runs/E2E.md), [COMMANDS.md](../01_AUDIT/runs/COMMANDS.md), [BUILD_OUTPUT.md](../01_AUDIT/runs/BUILD_OUTPUT.md) | E2E in full; COMMANDS results table; BUILD_OUTPUT bundle table |
| BRIEF | [../BRIEF.md](../BRIEF.md) | sections 0, 3, 5, 6 |

---

## 10. What I could not check

| Item | Why |
|---|---|
| Tinkercad, Velxio, Cirkit Designer, Arduino Cloud, Proteus, Multisim behaviour | Not run by anyone; account or install needed, or out of the benchmark's scope. All Documented cells are second-hand |
| Whether any rival shows explained wiring faults | Only three competitors were tested for task 4, one scripted run each |
| Robotics, drone, AI, education and ecosystem products | Desk research only; nothing TESTED |
| Prices of Proteus, Multisim, Fusion, Instructables Pro, Hackster, Hackaday, CoppeliaSim, Cirkit | Not published or pages did not load |
| Tinkercad and VEX user numbers, FAA figures | Vendor pages returned 403; figures are second-hand |
| Whether iynk's rooms, live translation, AI and MCP work with real keys and clients | FV and E2E ran keyless or mocked |
| Hand-checked translation quality | Nobody on the audit reads all six languages |
| Parts of MARKET_ANALYSIS, compliance-safety, TECHNICAL_RESEARCH, simulation-options, platform-options and the FV claims register not listed as read in section 9 | I skimmed headings and relied on sections that bear on competitors; I did not read them in full |
| Anything new on the web | I did not use the web tools. Any dossier fact that has changed since 2026-10-26 would not be reflected |

---

## Review log (2026-10-27)

Adversarial review. I tried to refute 24 statements against the dossiers' text and fact-check logs, the audit files and, for three, the live pages.

Checked and held (no change): Wokwi plans EUR 0 / 5.6 / 8.1 / 20 and Classroom EUR 30 per student per semester, minimum 5, no LMS or teacher tools listed (re-opened wokwi.com/pricing and wokwi.com/classroom, 2026-10-27; the pricing page itself shows no Classroom price and says to request a quote); Velxio 3.5k stars, 363 forks, 2,122 commits, AGPLv3 plus paid commercial licence (re-opened GitHub, 2026-10-27); Velxio USD 34 per student per year, Arduino plan prices, The Construct, VEXcode VR, DroneBlocks, Flux USD 37M, micro:bit 73.5 million children, Raspberry Pi 36,477 users and 1,996 schools, GitHub 47,191 arduino-topic repos, VS Code extension 351,162 installs, avr8js 322 commits, PartyKit shutdown, market USD 7.4M and 0.3M, FV counts (38 items, 71 lessons, 144 failures, 106 faults, 342 golden rows, 22 courses, 461 checks), E2E 116 / 1 / 2, bundle sizes, benchmark task 4 and the MakeCode .hex size. The files linked in section 9 all exist.

Wrong or overclaimed, now fixed:

| # | Statement | Problem | Change |
|---|---|---|---|
| 1 | Section 7.2: "13 timing failures; 3 still failing alone" | COMMANDS.md says 2 of the 3 files fail one test each alone and wing.test.ts passes 27 of 27 | Corrected |
| 2 | Section 0: FV "says no browser run was done" | FV's 2026-10-27 refresh adds a Chromium walk | Reworded |
| 3 | Section 7.2: E2E failure "probably a focus issue" | E2E.md labels this HYPOTHESIS, not re-run | Label added |
| 4 | "78 safety tests" (2.5) | FV counts 78 drone bench tests; C014 is only partly verified and C030 shows the check logic can be forged | Reworded |
| 5 | "272 assembly steps" in the Velxio table and copy-speed table | Robotics only; 579 across all labs (FV section 2) | Qualified |
| 6 | "robotbenchmark.net is gone" | Dossier says it serves gambling spam | Reworded |
| 7 | Fault corpus "with a Repair step" | Repair was seen only on faults the benchmark and walk triggered | Qualified |
| 8 | Section 0: "I did not open any new web source" | Now untrue after this review | Updated with the three pages and access date |
| 9 | Limit 1: "only one piece of hands-on evidence" | The GitHub counts in ecosystems are also TESTED | Qualified |
| 10 | Multisim Live "ended 2026-09-15" | circuit-eda's fact-check says the date is confirmed only via a competitor's page (CircuitSim); Digilent was a snippet, EEVblog says only "September" | Caveat added in section 1; section 6.3 already carried it |

Not changed, counter-notes: Wokwi "no warning in three captured runs" rests on page text and one still frame per case, so a warning shown only visually could be missed. The document already says this. The "113 mA" (FV) and "115 mA" (benchmark) figures differ because the benchmark read the page's own arithmetic at 26 ohm. Both are illustrative.

Not verified: Tinkercad, Velxio behaviour beyond the repo page, and Cirkit were not run. Third-party claims about them stay second-hand. I did not re-open Autodesk, Digilent, Reddit or Hacker News pages.

Counts: 24 claims checked, 10 corrected or downgraded.
