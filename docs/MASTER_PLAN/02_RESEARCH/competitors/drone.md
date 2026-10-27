# Drone development, simulation and design tools competitors

Researcher: drone category. Date of research: 2026-10-26. All sources accessed 2026-10-26.
Method note: pages were read with a fetch tool that summarises the page. No product was used hands-on, so nothing here is labelled TESTED. Labels: EXTERNAL (a cited source states it), ESTIMATED, HYPOTHESIS, UNKNOWN. Where a page did not load or did not state a fact, the cell says UNKNOWN or the text says so.

## Summary

- The category splits into four groups that rarely overlap: (1) autopilot developer sims (PX4, ArduPilot SITL, Gazebo, RealFlight bridge) that run real flight firmware but need Linux or Windows tooling [S3][S4]; (2) FPV pilot-training games (Liftoff, Velocidrone, Uncrashed, DRL, TRYP) that sell stick feel, not design [S7][S10][S11][S12][S13]; (3) design calculators (eCalc, DriveCalculator, Tyto database) that give numbers, not a flying model [S6][S37][S38]; (4) school drone programmes (DroneBlocks, Drone Legends, CoDrone EDU) that sell curriculum and hardware [S16][S17][S18].
- Nobody found does the full loop for a beginner: pick parts from a catalogue, see a bill of materials and price, check electrical and thrust sanity, then fly the result in a simulator, all in one browser tab with no install. This is the main gap. Evidence is absence in the products reviewed (HYPOTHESIS that it is a real gap; the review is not exhaustive).
- Closest competitor to the iynk Drone Lab on education is DroneBlocks: a browser simulator that runs PX4 firmware, block and Python coding, missions that move to a real drone, 14-day trial, school licence $695/year [S15][S16]. It is paywalled and tied to its own DEXI hardware [S15].
- Closest competitor to the iynk calculator is eCalc xcopterCalc: accuracy stated as +/-15%, restricted free demo, full version behind a login and a fee [S6][S14]. The fee is unclear: the page says "only $0.99" [S6]; a forum thread in Dec 2024 says about $19 per year for the bundle, previously about $10 [S23]. Users say they see no obvious free alternative [S23].
- FPV simulators are bought one-off for roughly $10 to $20 (Steam) or GBP 16.99 (Velocidrone direct) [S7][S8][S10][S11][S12][S13]. Their buyers want physics feel and rates matching Betaflight, not part-level design [S40]. Fidelity matters to them as muscle memory, and forum users say no sim matches real flight 1:1 [S40].
- For developers and researchers fidelity means sensor models, the real flight stack in the loop and repeatable physics. PX4 and ArduPilot SITL give that for free under permissive or copyleft licences (PX4 BSD-3-Clause, ArduPilot GPL-3.0) [S1][S2], at the cost of setup friction [S41][S42].
- Browser drone sims exist but are early and small: Nexus FPV (HTML5, beta, free) [S26], Project SkySim (MIT, 9 GitHub stars, published 2026-09-28) [S27][S28]. No browser sim with strong adoption was found (UNKNOWN beyond the search done).
- Regulation shapes the education audience: in the US, recreational flyers need the free TRUST test and must register drones over 250 g [S24]; in the EU open category, drones under 250 g in A1 need no training and have no minimum pilot age, and "privately built" means built by the owner for personal use, not a kit sold on the market [S25]. The US figures are UNCONFIRMED in this fact-check (FAA pages returned 403) [S24]. Both favour small, light builds for learners, which suits a browser lab that models sub-250 g craft.
- Reusable code: PX4 (BSD-3-Clause) and Gazebo (Apache-2.0) are permissive; ArduPilot and Betaflight are GPL-3.0, so embedding them would make iynk's combined work GPL. Learning from their algorithms or running them as separate processes is a different question that needs legal advice (UNKNOWN).
- Threat to iynk is low to medium. No competitor combines circuit, board, robotics and drone in one free no-install lab, but DroneBlocks, eCalc and the FPV sims each own a narrow slice with established users.

## Products

### 1. PX4 SITL (with Gazebo, SIH; jMAVSim)
- What it is: the PX4 autopilot run as a desktop build against a simulator. Docs list Gazebo, SIH and Gazebo Classic; Gazebo Classic is community-supported only and no longer maintained by the core team. jMAVSim did not appear in the docs sidebar; its page still exists but I could not read its status (UNKNOWN) [S3].
- Owner: PX4 project, Dronecode Foundation (the foundation link is not in the pages I read; UNKNOWN from sources here). Licence: BSD-3-Clause, repo https://github.com/PX4/PX4-Autopilot [S1].
- Audience: autopilot developers, researchers, companies. Pricing: free as of 2026-10-26 [S1].
- What a user can do: simulate quads, VTOL, planes, rovers in Gazebo; SIH has no external dependencies and works natively on macOS Apple Silicon; HITL runs firmware on real hardware [S3].
- Original projects: users write their own airframes and world files (Gazebo model format); custom components via Gazebo plugins. This is from the general nature of Gazebo; the pages read did not spell it out (UNKNOWN as sourced).
- Debugging: logs and ground-control tools; not verified from the pages read.
- Collaboration, curriculum, export: no built-in collaboration or LMS found. The code is the real firmware, so it runs on hardware (export to real toolchain is native).
- Community signals: 12.9k GitHub stars, 16.2k forks, 51,692 commits (page read 2026-10-26) [S1]. Latest stable v1.17.0, 2026-05-13 [S33].
- Complaints: macOS builds failed for some users in 2023 and a user fell back to Docker [S41]; the docs say Gazebo needs XQuartz on macOS and a raised open-file limit [S42, via search summary]. Older reports; the official macOS guide is now maintained.
- iynk could learn: SIH (simulation in hardware, no external dependencies) is the model for a lightweight in-process sim. Reuse: BSD-3-Clause code could be studied or ported with attribution; porting C++ to a browser is a large job (ESTIMATED, no numbers).

### 2. ArduPilot SITL (built-in physics, RealFlight bridge, Mission Planner)
- What it is: ArduPilot compiled as a native executable on a PC. Built-in physics for multirotors, planes, rovers, subs, gimbals; supports external simulators (JSBSim, JSON-based such as Gazebo or Webots), FlightGear for display; runs natively on Linux and Windows [S4].
- Owner: ArduPilot community / Dronecode-style project. Licence: GPL-3.0 (version 3 or later), https://github.com/ArduPilot/ardupilot [S2]. Pricing: free.
- RealFlight bridge: Windows only, needs RealFlight 8 or 9 (RealFlight-X does not work), a joystick must be present, target over 200 Hz frame rate [S31]. RealFlight Evolution is sold via Steam; the vendor page did not show a price (UNKNOWN) [S30].
- Mission Planner: Windows ground station by Michael Oborne; click-to-place waypoints, log analysis, parameter setup, built-in SITL for many frame types. Licence not stated on the page (UNKNOWN) [S32].
- Community signals: 16.2k stars, 21.7k forks [S2]. Latest Copter stable 4.7.2, official 2026-10-11 [S34].
- Debugging: logs analysed in Mission Planner [S32]. Custom hardware: parameter files and SITL_Models repo for custom frames [S31].
- Limitations: Windows-only for RealFlight link and a physical joystick requirement [S31]; no browser option on the SITL page [S4].
- iynk could learn: ArduPilot's DriveCalculator and parameter files give a reference for default tune values. GPL-3.0 means embedded reuse infects the combined work.

### 3. FlightGear
- Free open-source flight simulator. Current line 2024.1; newest listed 2024.1.7 dated 2026-08-14. The home page does not state the licence or platforms (UNKNOWN on page; the GitHub mirror lists GPL-2.0, https://github.com/flightgear/flightgear [S45]; the project page itself says free, open-source, for Windows, macOS and Linux per the same mirror README) [S22][S45].
- ArduPilot SITL can use it as a display [S4]. PX4 lists it as a community simulator [S3].
- Audience: aviation enthusiasts, researchers. Pricing: free [S22]. Not a drone design tool.
- iynk could learn: little; it is a heavy desktop sim.

### 4. FPV simulators (pilot-training games)
| Product | Owner | Price (as of 2026-10-26) | Reviews on Steam | Physics claim (marketing) | Source |
|---|---|---|---|---|---|
| Liftoff: FPV Drone Racing | LuGus Studios (per [S8] for sister title) | USD 19.99 | 95% of 7,181 positive | "realistic and fully simulated physics" | [S7] |
| Liftoff: Micro Drones | LuGus Studios | USD 15.99 (USD 11.19 on sale until Oct 29) | 93% of 1,496 | indoor/urban micro; drone and track editor | [S8] |
| Velocidrone | Velocidrone (company name not on pages) | GBP 16.99 base; add-ons GBP 4 to 8 | not on Steam per forum posts 2019-2020 | "best physics of any FPV simulator" (vendor claim) | [S9][S10] |
| Uncrashed: FPV Drone Simulator | Luminite | USD 14.99 | 94% of 2,431 | "Physics 3.0", propwash, PID tuning | [S11] |
| The Drone Racing League Simulator | DRL | USD 9.99 | 84% of 2,229 (recent 33% of 15) | "one-to-one physics with data from real life drones" | [S12] |
| TRYP FPV | Undead Battery | USD 16.99 (Early Access) | 85% of 1,289 | PID loop, "digital twin" aero | [S13] |

Prices from Steam pages show a "$" without naming the currency; USD is assumed (ESTIMATED).
- What users can do: fly racing and freestyle tracks, build or pick a quad (Liftoff and DRL have drone customisation; TRYP lets you choose frames, props, LiPos, cameras and adjust rates) [S7][S12][S13]. DRL says 100 million combinations [S12]. Velocidrone has track editor, multiplayer, MultiGP use claim, premium packs [S9][S10]. Uncrashed has Steam Workshop and level editor [S11].
- Platforms: Velocidrone Windows, macOS, Linux [S10]. Others via Steam (platform list not read; UNKNOWN). Liftoff and others recommend an RC transmitter [S7][S8].
- Betaflight tune support: no page mentions importing a Betaflight tune. Forum users say Liftoff has a Betaflight-like rates screen and Velocidrone offers Betaflight rates [S40]. Importing a real quad's PID tune: UNKNOWN for all.
- Languages: Liftoff English, French, Ukrainian [S7]; Micro Drones English, French [S8]; Uncrashed 5 languages [S11]; TRYP 7 languages [S13]; DRL English, Simplified Chinese [S12].
- User complaints: sim expo and rates differ from Betaflight defaults, so sticks feel different [S40]; Liftoff physics called "floaty", Velocidrone seen as more realistic [S40]; low-end laptops struggle [S40]; recent DRL reviews are Mostly Negative (15 reviews in 30 days) [S12]. Forum threads are dated 2017 to 2023.
- Fidelity vs audience: pilots want control feel and latency; they do not want part-level thrust modelling. Forum voice: the sim's main value is stick muscle memory, not a 1:1 copy [S40].
- iynk could learn: rates screen familiar from Betaflight; track editor and sharing drive retention (Workshop, MultiGP). Reuse: none (proprietary).

### 5. Betaflight Configurator and Blackbox Explorer
- Betaflight Configurator: configuration app for the Betaflight FC firmware. It is a PWA at app.betaflight.com, with Windows, macOS, Linux and Android apps. Licence GPL-3.0, https://github.com/betaflight/betaflight-configurator, 3.3k stars [S5]. Firmware latest 2026.6.2, 2026-09-16 [S35].
- Blackbox log viewer: graphs flight logs, loads video behind the log, exports WebM; PWA; GPL-3.0; 510 stars; now feature-frozen and moved into the Betaflight App; the repo will be archived 2026-12-01 [S21].
- Audience: FPV builders. Price: free. What a user can do: tune PIDs, filters, rates, motor mapping, analyse logs on a real quad. Needs a real flight controller (no virtual quad, UNKNOWN whether any emulation exists).
- Why it matters: it shows that a browser PWA can be a real hardware tool. The PWA page does not say how it talks to hardware (UNKNOWN) [S5].
- iynk could learn: export a build to Betaflight-style settings (target, rates) so a design leaves the browser. GPL-3.0 limits copying code.

### 6. eCalc xcopterCalc
- What it is: web multicopter calculator. Calculates hover time, thrust-to-weight, motor current and temperature, max speed, range, engine-failure behaviour. Stated accuracy +/-15% [S6]. Owner: eCalc (Switzerland, site ecalc.ch; owner name not on the pages read).
- Pricing as of 2026-10-26: page offers a "Restricted Demo Version" and "sign-up for full version for only $0.99" with no currency or period shown [S6]. A Dec 2024 forum thread says about $5 per month or $10 per year earlier and about $19 per year for the bundle now [S23]. These conflict; the period of the $0.99 is UNKNOWN. Membership required for some tools [S14].
- Original projects: users enter parts or pick from a database; custom motor values can be entered (Kv, resistance, no-load current) [S6]. Limits: one login session at a time [S14].
- Community signals: active releases (v7.41 on 2026-02-05, v7.40 on 2026-01-20) [S14]. User count: UNKNOWN.
- Complaints: users see no obvious free alternative; free version has limited part choice; random part database yields unrepresentative configurations [S23].
- iynk could learn: the output list (hover time, T/W, motor temperature) is the expected set. A free, open, auditable calculator with a stated model and test data is a clear opening. Reuse: none (proprietary).

### 7. Other design calculators and data
- ArduPilot-linked DriveCalculator (drivecalc.de): free, Windows/Mac/Linux, motor and prop databases, outputs current, efficiency, prop speed; owner not stated [S37].
- Tyto Robotics database: community thrust-stand data, 121 motors, 191 propellers, 55 ESCs, 1,518 propulsion systems tested, 174,811 samples; licence and download terms UNKNOWN [S38].
- Miniquad test bench (miniquadtestbench.com): forum users describe it as many tested motors with graphs [S43]. I did not load the site; pricing, licence and data terms UNKNOWN.
- flyeval: an IEEE paper says its multicopter design optimisation is published at flyeval.com/recalc.html [S44]. I did not load it; whether it is still live is UNKNOWN. Treat as unverified.
- iynk could learn: test-stand data (Tyto) is the right ground truth for a physics-backed thrust model; check licence before use.

### 8. DroneBlocks
- What it is: K-12 and higher-ed drone curriculum company that also sells drones (DEXI-3, DEXI-5, DEXI-10, plus Crazyflie and light-show drones). Curriculum levels from block coding to Python to ROS 2 and C++; claims alignment with CSTA and NGSS; 800+ cloud lessons; more than 100,000 students; schools in 48 of 50 US states (vendor claims) [S15].
- Browser simulator that runs the same PX4 firmware as the real drones; missions written in blocks or Python can move to a DEXI drone [S15]. This is the most relevant competitor for the Drone Lab.
- Pricing: annual curriculum licence USD 695 per year, billed yearly, cancel anytime, installments offered; simulator included with the school licence; 14-day free trial, no card [S16]. Hardware sold separately.
- LMS: page does not mention Google Classroom or other LMS (UNKNOWN) [S16]. Custom components: UNKNOWN; designs are limited to their drone models as far as the pages show.
- Complaint signal: none verified. A search result suggested the simulator was once exclusive to Enterprise Membership (older pages) [S16 and search].
- iynk could learn: "code that moves from sim to real drone" is the selling line; teachers buy the whole bundle. Reuse: proprietary.

### 9. Drone Legends
- K-12 drone education pathway (K-3, 4-8, 9-12 incl. Drone Pilot Certification), educator portal, FlyCode section; STEM.org accredited; no prices listed, quote on request; Maple Shade, NJ [S17].
- Simulator or design tool: not mentioned (UNKNOWN). Audience: schools. Moat: curriculum plus certification alignment.

### 10. CoDrone EDU (Robolink)
- Programmable education drone with Smart Controller. Individual kit USD 249; 12-drone pack USD 3,599; 18-drone pack USD 5,399 (as of 2026-10-26, page shows "$" without a currency code) [S18].
- Blockly (Chromebook, macOS, Windows) and Python (macOS, Windows only). Free lessons at learn.robolink.com; no simulator mentioned on the page; competition with REC Foundation [S18]. 54.8 g, 7-8 min flight [S18].
- Fidelity: none to model; it is real hardware. Audience: grades 6-10, ages 12+.

### 11. Tello EDU (Ryze/DJI)
- Programmable drone with Scratch, Python and Swift, SDK 2.0 [S19]. Price on the page: UNKNOWN.
- Status: secondary reports say the Tello line was discontinued in the US (Jan 2024) and Tello EDU is no longer commercially available; DJI's stated position and later reports conflict; DroneBlocks does not recommend Tello for new programmes [S20]. Treat availability as doubtful (EXTERNAL, mixed).
- Meaning for iynk: a vacated low-cost education slot; the replacement named is CoDrone EDU and Crazyflie [S20][S15].

### 12. Browser drone simulators
| Project | What | Licence | Signals | Source |
|---|---|---|---|---|
| Nexus FPV (webXOS) | HTML5 FPV sim, rate mode, motor lag, drag, ground effect, Q-learning autopilot, dataset export | not stated | free, beta | [S26] |
| Project SkySim | WebAssembly physics core, blade-element rotors, ground effect, ISA atmosphere; README describes bridges to ArduPilot (JSON SITL, UDP 9002), PX4 (MAVLink HIL, TCP 4560) and Betaflight (MSP, TCP 5760), but these are not in its "tested end-to-end" list, need real hardware or a compiled C++ extension, and are not part of the browser build, which covers interactive flight and classical/light control only (fact-check correction: "in the loop" in the browser is not supported by the README); some parts are placeholders per the author | MIT | 9 stars, 7 forks, 64 commits; blog dated 2026-09-28; demo URL in README is a placeholder (OWNER/REPO) | [S27][S28] |
| DroneVR | web VR flight sim with WebGL, appears commercial training (award entries) | UNKNOWN | UNKNOWN | search result only |
- Takeaway: browser drone sims are hobby-scale. SkySim states the same gap iynk targets (zero install plus real firmware), so a rival could appear; at 9 stars it is not one yet [S28].

### 13. Other simulators worth noting
- AirSim (Microsoft): MIT, 18.6k stars; the page shows no archived or deprecated notice, 3,565 commits, and a "What's New" link to "Project AirSim" whose relationship to the original is not described on the page (UNKNOWN) [S36]. Gazebo Sim: Apache-2.0, 1.6k stars, https://github.com/gazebosim/gz-sim [S29]. Crazyflie firmware (Bitcraze): README says LGPL-3.0 but the sidebar and the LICENSE.txt file text are GPL-3.0 (fact-check: LICENSE.txt is the GNU GPL v3; the conflict remains, treat as GPL-3.0 until the maintainers clarify) [S39][S46], 1.6k stars; no simulator mentioned on the page [S39].

## Regulation and standards (high level, education relevance)
- UNCONFIRMED in fact-check (faa.gov returned 403 on 2026-10-26 for both pages; search budget was exhausted): US recreational: TRUST is free and online, no age limit, once-only, proof must be carried; drones over 0.55 lb (250 g) must be registered; Remote ID applies to registered drones [S24]. Part 107 (drones under 55 lb for work): knowledge test, minimum age 16, registration USD 5 per drone for 3 years [S24].
- EU/EASA open category: A1, A2, A3 subcategories. For A1 drones under 250 g the page says "No training required" and "No minimum age"; registration is generally not required unless the drone has a camera or sensor and is not a toy [S25]. "Privately built" is defined as built by yourself for personal use; drones from a ready-to-assemble kit sold on the market do not count as privately built [S25]. Fact-check correction: the earlier text said minimum pilot age is generally 16 (states may lower to 12); that was not what the A1 under-250 g section says, and the age rule for heavier classes was not re-verified here (UNKNOWN). The last 1,795 characters of the page were not read. Implication for iynk: a lab that teaches kit-style builds should not assume they count as "privately built".
- Simulation fidelity standards: I did not find an FAA or EASA standard that sets sim fidelity for hobby or school use. Pilot-certification sims (flight training devices) are a different regime and were not researched (UNKNOWN). Part 107 and TRUST are knowledge tests, not sim-based.
- Implication (HYPOTHESIS): a sub-250 g builder with regulatory notes per region is both educational and low-risk; a safety-check feature in the Drone Lab can cite TRUST and A1 limits.

## Comparison table
Cell = value + label + source. All labels EXTERNAL unless shown; UNKNOWN means not found. Split in three tables because of width.

### Table A: access and usage
| Product | Free usage | No-account entry | Browser-based | User-created projects | Circuit editor | Custom hardware models | Pricing | Target audience |
|---|---|---|---|---|---|---|---|---|
| PX4 SITL | yes EXTERNAL [S1] | yes (local install) HYPOTHESIS | no EXTERNAL [S3] | yes (airframes, worlds) HYPOTHESIS | no | yes via Gazebo models HYPOTHESIS | free [S1] | developers, researchers |
| ArduPilot SITL | yes [S2] | yes (local) HYPOTHESIS | no [S4] | yes (frames, params) [S31] | no | yes (SITL_Models) [S31] | free [S2] | developers, hobbyists |
| FlightGear | yes [S22] | yes HYPOTHESIS | no | UNKNOWN | no | UNKNOWN | free [S22] | enthusiasts |
| Liftoff | no, USD 19.99 [S7] | no (Steam) | no | tracks and drones [S7] | no | drone customisation [S7] | USD 19.99 [S7] | FPV pilots |
| Liftoff Micro | no, USD 15.99 [S8] | no (Steam) | no | drone and track editor [S8] | no | partial [S8] | USD 15.99 [S8] | FPV pilots |
| Velocidrone | no, GBP 16.99 [S10] | no (account created on purchase, reseller page) | no | track editor [S9] | no | UNKNOWN | GBP 16.99 + add-ons [S10] | FPV racers |
| Uncrashed | no, USD 14.99 [S11] | no (Steam) | no | level editor, Workshop [S11] | no | UNKNOWN | USD 14.99 [S11] | FPV pilots |
| DRL Sim | no, USD 9.99 [S12] | no (Steam) | no | level editor [S12] | no | drone builder [S12] | USD 9.99 [S12] | racers |
| TRYP FPV | no, USD 16.99 [S13] | no (Steam) | no | drone build [S13] | no | parts picks [S13] | USD 16.99 [S13] | FPV pilots |
| Betaflight Configurator | yes [S5] | yes (PWA) [S5] | yes PWA [S5] | config only | no | no | free [S5] | FPV builders |
| eCalc xcopterCalc | demo only [S6] | demo yes, full needs login [S6] | yes [S6] | yes (custom motor values) [S6] | no | partial [S6] | full "$0.99" vs ~USD 19/yr conflict [S6][S23] | builders, modellers |
| DriveCalculator | yes [S37] | yes (desktop) | no [S37] | combos only | no | no | free [S37] | ArduPilot users |
| Tyto database | free to browse UNKNOWN [S38] | UNKNOWN | yes [S38] | upload data [S38] | no | no | UNKNOWN | testers |
| DroneBlocks | 14-day trial [S16] | no (account) [S16] | yes [S15] | missions [S15] | no | no, own drones [S15] | USD 695/yr school [S16] | K-12 schools |
| Drone Legends | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | no | no | quote [S17] | K-12 |
| CoDrone EDU | lessons free [S18] | n/a (hardware) | Blockly web? UNKNOWN | code [S18] | no | no | USD 249 kit [S18] | grades 6-10 |
| Tello EDU | UNKNOWN | n/a | no | code [S19] | no | no | UNKNOWN; discontinued reports [S20] | schools |
| Nexus FPV | yes [S26] | yes [S26] | yes [S26] | no | no | no | free [S26] | gamers, ML |
| SkySim | yes [S28] | yes (demo link broken) [S28] | yes [S28] | code | no | UNKNOWN | free, MIT [S28] | researchers |

### Table B: fidelity and engineering
| Product | Firmware compatibility | MCU sim fidelity | Analog circuit fidelity | Failure modeling | Debugging tools | Robotics sim | Drone sim | Performance |
|---|---|---|---|---|---|---|---|---|
| PX4 SITL | real PX4 firmware [S3] | n/a (runs native build) | no | UNKNOWN | logs HYPOTHESIS | yes (rovers) [S3] | yes [S3] | needs GPU for Gazebo HYPOTHESIS |
| ArduPilot SITL | real ArduPilot [S4] | native build [S4] | no | UNKNOWN | Mission Planner logs [S32] | yes (rover, sub) [S4] | yes [S4] | RealFlight link needs 200 Hz [S31] |
| FlightGear | via SITL [S4] | no | no | UNKNOWN | no | no | display only [S4] | heavy HYPOTHESIS |
| Liftoff family | none | no | no | crashes only | no | no | game [S7] | CPU limited on Linux per user [S40] |
| Velocidrone | none | no | no | no | no | no | game [S9] | runs on weak PCs poorly [S40] |
| Uncrashed | none | no | no | UNKNOWN | no | no | game, PID tuning claim [S11] | UNKNOWN |
| DRL Sim | none | no | no | no | no | no | game [S12] | UNKNOWN |
| TRYP FPV | none | no | no | no | no | no | game [S13] | UNKNOWN |
| Betaflight Cfg/Blackbox | real Betaflight [S5] | no | no | no | blackbox graphs [S21] | no | log viewer [S21] | n/a |
| eCalc | none | no | no | engine failure case [S6] | no | no | calculator +/-15% [S6] | web, fast UNKNOWN |
| DriveCalculator | none | no | no | no | no | no | motor/prop calc [S37] | UNKNOWN |
| Tyto DB | none | no | no | no | no | no | data only [S38] | n/a |
| DroneBlocks | PX4 in browser sim [S15] | n/a | no | UNKNOWN | UNKNOWN | ROS 2 courses [S15] | yes [S15] | UNKNOWN |
| Drone Legends / CoDrone / Tello | none | no | no | no | no | no | real hardware | n/a |
| Nexus FPV | none | no | no | no | no | no | rate mode, motor lag [S26] | browser, UNKNOWN fps |
| SkySim | bridges described, not in the browser build, not listed as tested [S28] | no | no | UNKNOWN | UNKNOWN | no | blade-element [S27] | WASM [S28] |

### Table C: ecosystem and business
| Product | AI guidance | Multilingual UI | Real-time collab | Curriculum / LMS | Community features | BOM generation | Purchasing | Export to real toolchains | Plugin extensibility | Ecosystem strength | Moat |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PX4 | no | docs in several languages [S42] | no | no | forum, large [S1] | no | no | native firmware | yes (modules, plugins) HYPOTHESIS | very strong: 12.9k stars [S1] | real stack, industry adoption |
| ArduPilot | no | UNKNOWN | no | no | forum, large [S2] | no | no | native | yes (Lua scripts HYPOTHESIS) | very strong: 16.2k stars [S2] | breadth of vehicles |
| FlightGear | no | UNKNOWN | no | no | yes UNKNOWN | no | no | no | yes UNKNOWN | long-lived [S22] | scenery and aircraft |
| Liftoff family | no | 2-3 langs [S7][S8] | multiplayer, not collab [S7] | no | track sharing [S7] | no | no | no | no | strong sales (7k+ reviews) [S7] | brand, content |
| Velocidrone | no | UNKNOWN | multiplayer [S9] | no | MultiGP [S9] | no | no | no | no | strong in racing [S9] | physics reputation [S40] |
| Uncrashed | no | 5 langs [S11] | multiplayer [S11] | no | Workshop [S11] | no | no | no | Workshop [S11] | 2.4k reviews [S11] | content |
| DRL Sim | no | 2 langs [S12] | multiplayer [S12] | no | league tie-in | no | no | no | no | 2.2k reviews [S12] | DRL brand |
| TRYP FPV | no | 7 langs [S13] | no [S13] | no | UNKNOWN | no | no | no | no | 1.3k reviews [S13] | digital twin claim |
| Betaflight | no | UNKNOWN | no | no | large forum HYPOTHESIS | no | no | native | targets/firmware | strong: 3.3k stars app [S5] | de facto FPV firmware |
| eCalc | no | multi-language URLs (lang=de, es, fr, cz) [search] | no | no | share function [S14] | no | no | no | no | long-lived [S14] | validated model + database |
| DriveCalculator | no | UNKNOWN | no | no | no | no | no | no | no | niche | free + ArduPilot link |
| Tyto DB | no | UNKNOWN | no | no | uploads [S38] | no | no | no | no | niche | data |
| DroneBlocks | UNKNOWN | UNKNOWN | UNKNOWN | CSTA/NGSS, 800+ lessons; LMS UNKNOWN [S15] | competition [S15] | no | sells drones | code to real drone [S15] | no | 100k students (vendor) [S15] | curriculum + hardware |
| Drone Legends | no | UNKNOWN | no | K-12 pathway [S17] | educator portal [S17] | no | shop [S17] | no | no | UNKNOWN | certification alignment |
| CoDrone EDU | no | UNKNOWN | no | lessons, PD [S18] | competition [S18] | no | sells kit [S18] | no | no | UNKNOWN | hardware + lessons |
| Tello EDU | no | UNKNOWN | no | DroneBlocks etc. [S15] | large past base | no | discontinued [S20] | no | SDK [S19] | fading [S20] | none now |
| Nexus FPV | Q-learning pilot [S26] | no | no | no | no | no | no | dataset export [S26] | no | tiny | none |
| SkySim | UNKNOWN | no | no | no | no | no | no | firmware loop [S28] | open source | tiny: 9 stars [S28] | none yet |

## Where iynk could be genuinely different here
All HYPOTHESIS unless stated.
1. One browser tab from parts to flight: pick motor, prop, battery, frame; see weight, thrust-to-weight, hover time (the eCalc outputs [S6]); then fly the same build in the flight sim. No product reviewed links calculator and sim (evidence: absence in this review).
2. Free and no account, against eCalc's login-gated full version [S6] and DroneBlocks' school paywall [S16]. Forum users explicitly say they see no free alternative to eCalc [S23].
3. Sim-to-sim honesty: label each result as calculated, simulated or measured, and show a fidelity range (eCalc quotes +/-15% [S6]). FPV sim marketing claims go unverified [S7][S12][S13].
4. Bridge the three labs: a drone with a flight controller board from Board Lab, a buck converter and motor driver from Robotics Lab, and a fault injection run (brown-out, motor failure; eCalc has only engine-failure behaviour [S6]). No reviewed product combines these.
5. Export: BOM with live prices (SerpApi already in iynk), and a Betaflight-style settings export or a PX4/ArduPilot parameter file so a design leaves the browser. Parameter-file ecosystems exist [S31][S5].
6. Education: sub-250 g builds with a TRUST and EASA A1 checklist [S24][S25]; six UI languages beats the 2 to 7 languages of FPV sims [S7][S8][S11][S12][S13]. Fill the Tello gap [S20] with a no-hardware option.
7. Fidelity needs by audience: pilots need control feel; teachers and students need cause and effect (a heavier battery cuts hover time); developers need real firmware. iynk can credibly serve the middle group first and should not claim developer-grade fidelity (PX4 and ArduPilot already own that and are free [S1][S2]).
8. Risk: SkySim shows another builder aiming at the browser plus real firmware niche [S27]; DroneBlocks already ships a browser PX4 sim to schools [S15].

## Sources
Accessed 2026-10-26 for all. "Describes" gives the version or date of the content where the page showed one.
- [S1] https://github.com/PX4/PX4-Autopilot - PX4-Autopilot repository - GitHub (PX4). Describes: state at access (12.9k stars, BSD-3-Clause).
- [S2] https://github.com/ArduPilot/ardupilot - ArduPilot repository - GitHub (ArduPilot). State at access (16.2k stars, GPL-3.0).
- [S3] https://docs.px4.io/main/en/simulation/ - Simulation - PX4 Guide (main) - PX4 / Dronecode. Docs "main" at access.
- [S4] https://ardupilot.org/dev/docs/sitl-simulator-software-in-the-loop.html - SITL Simulator - ArduPilot Dev Docs - ArduPilot. At access.
- [S5] https://github.com/betaflight/betaflight-configurator - Betaflight Configurator - GitHub (Betaflight). At access (3.3k stars, GPL-3.0).
- [S6] https://www.ecalc.ch/xcoptercalc.php?ecalc&lang=en - xcopterCalc multicopter calculator - eCalc. At access.
- [S7] https://store.steampowered.com/app/410340/Liftoff_FPV_Drone_Racing/ - Liftoff: FPV Drone Racing - Steam (LuGus Studios). Released 2018-09-13.
- [S8] https://store.steampowered.com/app/1432320/Liftoff_Micro_Drones/ - Liftoff: Micro Drones - Steam. Full release 2025-08-04; promo ends Oct 29.
- [S9] https://www.velocidrone.com - Velocidrone home - Velocidrone. At access.
- [S10] https://www.velocidrone.com/shop - Velocidrone shop - Velocidrone. At access (GBP).
- [S11] https://store.steampowered.com/app/1682970/ - Uncrashed: FPV Drone Simulator - Steam (Luminite). Released 2021-09-01.
- [S12] https://store.steampowered.com/app/641780/ - The Drone Racing League Simulator - Steam. Released 2017-06-16.
- [S13] https://store.steampowered.com/app/1881200/ - TRYP FPV: Drone Racer Simulator - Steam (Undead Battery). Released 2022-06-30, Early Access.
- [S14] https://www.ecalc.ch/release.htm - eCalc release notes - eCalc. Latest entry 2026-02-05, v7.41.
- [S15] https://www.droneblocks.io/ - DroneBlocks home - DroneBlocks. At access.
- [S16] https://learn.droneblocks.io/ - DroneBlocks Curriculum & Software - DroneBlocks. At access. Related: https://community.droneblocks.io/t/droneblocks-enterprise-membership/481 (older, undated; not relied on for price).
- [S17] https://www.dronelegends.com/ - Drone Legends home - Drone Legends. At access.
- [S18] https://www.robolink.com/products/codrone-edu - CoDrone EDU - Robolink. At access.
- [S19] https://www.ryzerobotics.com/tello-edu - Tello EDU - Ryze Robotics. At access.
- [S20] https://community.droneblocks.io/t/dji-tello-discontinuation-new-crazyflie-micro-drones/1265 ; https://www.digitalcameraworld.com/news/dji-tello-drone-is-set-to-disappear-as-drone-giant-ditches-education ; https://en.wikipedia.org/wiki/Ryze_Tello - Tello discontinuation reports (read as search-result summaries only; dated 2023 to 2025).
- [S21] https://github.com/betaflight/blackbox-log-viewer - Betaflight Blackbox Explorer - GitHub. At access (510 stars, GPL-3.0, repo to be archived 2026-12-01).
- [S22] https://www.flightgear.org/ - FlightGear - FlightGear project. 2024.1.7 dated 2026-08-14.
- [S23] https://intofpv.com/archive/index.php/thread-27441.html - IntoFPV forum thread on eCalc cost (community evidence). Dated 2024-12-08/09.
- [S24] https://www.faa.gov/uas/recreational_flyers ; https://www.faa.gov/uas/getting_started/register_drone - FAA recreational flyers, TRUST, registration (read through search summary because direct fetch returned 403). Current at access.
- [S25] https://www.easa.europa.eu/en/domains/drones-air-mobility/operating-drone/open-category-low-risk-civil-drones - Open category, low-risk civil drones - EASA. At access (last 1,795 characters not read).
- [S26] https://webxos.itch.io/nexus-fpv - Nexus FPV - webXOS (itch.io). Date not stated; mentions July 2026 jam. The GitHub link given on the page returned 404 when fetched at https://github.com/webxos/nexus-fpv (a different guessed URL); the page's own link was not fetched.
- [S27] https://hackernoon.com/project-skysim-part-1-the-case-for-a-drone-simulator-that-runs-in-your-browser - Project SkySim part 1 - HackerNoon. 2026-09-28.
- [S28] https://github.com/vishwagw/Sky-Sim-drone-simulator-3.0 - Sky-Sim-drone-simulator-3.0 - GitHub. At access (MIT, 9 stars).
- [S29] https://github.com/gazebosim/gz-sim - Gazebo Sim - GitHub. At access (Apache-2.0, 1.6k stars).
- [S30] https://www.horizonhobby.com/realflight/ - RealFlight - Horizon Hobby. Public beta 10.10.134 listed; no price shown.
- [S31] https://ardupilot.org/dev/docs/sitl-with-realflight.html - SITL with RealFlight - ArduPilot Dev Docs. At access.
- [S32] https://ardupilot.org/planner/ - Mission Planner - ArduPilot. At access.
- [S33] https://github.com/PX4/PX4-Autopilot/releases - PX4 releases. v1.17.0, 2026-05-13.
- [S34] https://github.com/ArduPilot/ardupilot/releases - ArduPilot releases. Copter 4.7.2, 2026-10-11.
- [S35] https://github.com/betaflight/betaflight/releases - Betaflight releases. 2026.6.2, 2026-09-16.
- [S36] https://github.com/microsoft/AirSim - AirSim - GitHub (Microsoft). At access (MIT, 18.6k stars; archive status not shown).
- [S37] https://ardupilot.org/plane/docs/drivecalculator-guide.html - DriveCalculator guide - ArduPilot docs (tool at http://www.drivecalc.de, not loaded).
- [S38] https://database.tytorobotics.com/ - Tyto Robotics motor and propeller database - Tyto Robotics. At access.
- [S39] https://github.com/bitcraze/crazyflie-firmware - Crazyflie firmware - GitHub (Bitcraze). At access.
- [S40] https://www.getfpv.com/learn/?p=5338 (403 on direct fetch), https://intofpv.com/archive/index.php/thread-18006.html , https://www.drohnen-forum.de/index.php/Thread/23791-Der-FPV-Racingsimulator-Thread/?pageNo=2 , https://www.drohnen-forum.de/index.php/Thread/67883-Liftoff-Simulator-Erste-Fl%C3%BCge/ - FPV sim forum threads, community evidence, dated 2017 to 2023, read as search-result summaries.
- [S41] https://forum.modalai.com/post/10504 - HITL / PX4 macOS build failure thread (community evidence, 2023), read as search-result summary.
- [S42] https://docs.px4.io/main/uk/dev_setup/dev_env_mac - macOS development environment - PX4 Guide, read as search-result summary.
- [S43] https://intofpv.com/archive/index.php/thread-14254.html - IntoFPV thread mentioning miniquadtestbench.com (community evidence, date not seen), read as search-result summary; the site itself not loaded.
- [S44] https://ieeexplore.ieee.org/document/9443642 - multicopter design optimisation paper that cites flyeval.com/recalc.html, read as search-result summary only.
- [S45] https://github.com/flightgear/flightgear - FlightGear GitHub mirror of the GitLab repo - FlightGear project. Accessed 2026-10-26. Describes: state at access (GPL-2.0 in sidebar, 817 stars).
- [S46] https://raw.githubusercontent.com/bitcraze/crazyflie-firmware/master/LICENSE.txt - LICENSE.txt - Bitcraze. Accessed 2026-10-26. Text is GNU GPL v3, 29 June 2007.

## Fact-check log (2026-10-26)
Fact-checker re-opened each source with WebFetch on 2026-10-26. 20 claims checked: 13 confirmed, 5 corrected, 2 unconfirmed. Other claims in the file not listed here were not re-checked.

| # | Claim | Verdict | Source |
|---|---|---|---|
| 1 | DroneBlocks school licence USD 695/yr, 14-day trial, no card, simulator included, no LMS mentioned | confirmed | https://learn.droneblocks.io/ |
| 2 | eCalc "only $0.99", restricted demo, +/-15% accuracy, currency and period not shown | confirmed | https://www.ecalc.ch/xcoptercalc.php?ecalc&lang=en |
| 3 | Liftoff USD 19.99, 95% of 7,181, LuGus Studios, EN/FR/UA, released 2018-09-13 | confirmed (Belgium studio added) | https://store.steampowered.com/app/410340/Liftoff_FPV_Drone_Racing/ |
| 4 | Velocidrone GBP 16.99, add-ons GBP 4 to 8 (Freestyle 5, Combat 8, others 4), Windows/macOS/Linux | confirmed | https://www.velocidrone.com/shop |
| 5 | Blackbox Explorer GPL-3.0, 510 stars, feature-frozen, archive 2026-12-01 | confirmed | https://github.com/betaflight/blackbox-log-viewer |
| 6 | PX4 BSD-3-Clause, 12.9k stars, 16.2k forks, 51,692 commits | confirmed | https://github.com/PX4/PX4-Autopilot |
| 7 | PX4 latest stable v1.17.0, 2026-05-13 | confirmed | https://github.com/PX4/PX4-Autopilot/releases |
| 8 | ArduPilot GPL-3.0-or-later, 16.2k stars, 21.7k forks | confirmed | https://github.com/ArduPilot/ardupilot |
| 9 | CoDrone EDU USD 249 kit, 12-pack 3,599, 18-pack 5,399, Blockly/Python platforms | confirmed (with-PD prices 3,999 and 5,699 also exist; currency not named) | https://www.robolink.com/products/codrone-edu |
| 10 | DRL sim USD 9.99, 84% of 2,229, recent 33% of 15, EN + zh-Hans | confirmed (release date 2017-06-16 matches) | https://store.steampowered.com/app/641780/ |
| 11 | Gazebo Sim Apache-2.0, 1.6k stars | confirmed | https://github.com/gazebosim/gz-sim |
| 12 | Tyto DB counts (121 / 191 / 55 / 1,518 / 174,811); licence not stated | confirmed | https://database.tytorobotics.com/ |
| 13 | AirSim MIT, 18.6k stars | confirmed; archive status still UNKNOWN, text updated | https://github.com/microsoft/AirSim |
| 14 | Crazyflie firmware licence | corrected: LICENSE.txt is GPL-3.0, README says LGPL-3.0, conflict stays | https://raw.githubusercontent.com/bitcraze/crazyflie-firmware/master/LICENSE.txt |
| 15 | FlightGear licence "widely known as GPL" | corrected: GPL-2.0 per GitHub mirror, source added; 2024.1.7 dated 2026-08-14 confirmed | https://github.com/flightgear/flightgear |
| 16 | SkySim "claims ArduPilot, PX4, Betaflight in the loop" | corrected: README describes bridges but not tested end-to-end and not in the browser build; MIT, 9 stars, 64 commits confirmed; demo URL is a placeholder | https://github.com/vishwagw/Sky-Sim-drone-simulator-3.0 |
| 17 | EASA: "privately built or pre-2024 drones under 250 g go in A1 with no training" | corrected: A1 under 250 g needs no training and has no minimum age; privately built excludes market kits; registration generally not required unless camera or sensor and not a toy | https://www.easa.europa.eu/en/domains/drones-air-mobility/operating-drone/open-category-low-risk-civil-drones |
| 18 | EASA "minimum pilot age generally 16 (states may lower to 12)" | corrected: not supported for A1 under 250 g (page says no minimum age); heavier-class age UNKNOWN | same as 17 |
| 19 | FAA TRUST free, registration over 250 g, Part 107 USD 5 for 3 years | unconfirmed: faa.gov returned HTTP 403 for both pages; search budget exhausted. Marked UNCONFIRMED in text | https://www.faa.gov/uas/recreational_flyers |
| 20 | eCalc forum claim of about USD 19/yr (S23) and Dec 2024 date | unconfirmed: forum thread not re-opened; conflict with the "$0.99" on the vendor page remains | https://intofpv.com/archive/index.php/thread-27441.html |

Not re-checked: Steam counts for Uncrashed, Micro Drones and TRYP; the Tello discontinuation reports [S20]; ArduPilot Copter 4.7.2 and Betaflight 2026.6.2 release dates; Nexus FPV; Mission Planner licence; forum complaints [S40][S41][S42][S43].
