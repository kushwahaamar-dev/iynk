# Circuit simulators and EDA tools competitors

Researcher: circuit-eda. Access date for every source: 2026-10-26. All prices "as of 2026-10-26".

Method note. I used WebSearch and WebFetch only. Several vendor pages returned 403/404/500 or little content (digilent.com, fritzing.org, wokwi.com home, pcbx.com, tinkercad.com gave a title only, labcenter price lists show placeholders). The easyeda.com pricing page did load in the fact-check pass. Where a fact comes from a search-result snippet and not from a page I opened, the source line says "(search snippet)". Labels: TESTED, EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN. I did not run any of these tools hands-on, so nothing here is TESTED.

## Summary (what this category means for iynk)

- Nobody in this category combines all of: free, no account, browser, real MCU firmware, analog circuit solving, robots and drones. Each tool covers one or two. This is the gap iynk fills. [S3] [S7] [S16] [S40] [S42]
- Multisim Live, the best-known free browser SPICE tool tied to a big vendor, reached end of life on 2026-09-15 per the Digilent notice. Its students and teachers are looking for a new home right now. [S1] [S2]
- A community replacement, CircuitSim (Elsewhere Labs, LLC, two people), appeared in April 2026 with a SPICE engine, classes, and a free tier capped at 5 circuits and 5 components per circuit. It has no MCU parts. [S2] [S3] [S4]
- The closest new rival to iynk's Board Lab is Velxio (AGPL-3.0 plus a paid commercial licence, 3.5k GitHub stars). It runs AVR, RP2040, ESP32, STM32 and Raspberry Pi boards in the browser and adds ngspice WASM. Its AI Agent and Tutor modes are on the Maker plan and above, and AI-agent-over-MCP (Claude Code or Codex) is on the Pro plan only; a Free plan has basic AI chat (50 messages/day) [S42]. Its claims are vendor claims and unverified by me. [S42] [S43]
- Wokwi is the established browser firmware simulator. Its free Community plan is for open-source projects and public projects only; paid plans start at 5.6 EUR/month. It is not a SPICE tool. [S40] [S4]
- Desktop incumbents are strong where iynk is weak: Proteus VSM for MCU plus analog co-simulation with real HEX/ELF files, KiCad for free PCB design plus ngspice, EasyEDA for schematic-to-JLCPCB/LCSC ordering. None is a no-install teaching lab. [S16] [S23] [S20]
- Falstad CircuitJS is the free open-source baseline (GPL-2.0, 3.0k stars on the Sharp repo, 2.4k on Falstad's). It has no accounts, uses idealised models, and has an AVR8js build. Its code is reusable only under GPL terms. [S5] [S6] [S7] [S8]
- Pricing pattern: free tiers cap size (5 components, 10 components, 5 circuits) rather than time. Paid tiers cost USD 2.50 to 19.9 or EUR 5.6 to 20 per month (Wokwi is priced in EUR). Desktop professional suites cost thousands of USD. [S3] [S36] [S39] [S19]
- Original-project creation is normal everywhere in this category. Classroom or education licences are sold by Wokwi, Proteus, CircuitLab, EveryCircuit and CircuitSim (group licences) [S40] [S15] [S36] [S39] [S3]; Tinkercad has teacher accounts [S44]. iynk's lack of a "create my own project" flow is the biggest feature gap against all 14 live products here. [S3] [S7] [S40] [S36]
- Nobody in these sources offers a drone or robotics simulator inside the circuit tool. Not stated by any vendor page I read: UNKNOWN, not "proven absent".

## Products

### 1. SimulIDE
- What it is. Real-time circuit simulator with analog and digital parts, a code editor and debugger with breakpoints and register/variable watch, oscilloscope, logic analyzer, serial monitor. Supports PIC, AVR, Arduino "and other MCUs and MPUs". EXTERNAL [S10]
- Owner and licence. Community project. simulide.com states AGPLv3 [S10]; the GitHub repo SimulIDE/SimulIDE shows GPL-3.0 [S11]. The two sources disagree and I did not resolve which applies to which release (re-checked 2026-10-26; the CE-fork label is not on the fetched repo page, so treat it as unconfirmed). Repo: https://github.com/SimulIDE/SimulIDE. The original eeTools/SimulIDE-dev repo had 100 stars as of 2025-01-13 per a third-party tracker [S12].
- Audience. Hobbyists and students [S11].
- Pricing. Free [S10]. No paid plan seen. UNKNOWN whether donations are requested.
- Current status. Latest stable seen is 1.1.0 (the simulide.com home page names no version; this comes from search snippets only, unconfirmed) (Debian lists 1.1.0.1912, metadata dated 2026-02-04, Sid entry 2026-06-17). The site posted that the next version focuses on custom components and a sharing section. EXTERNAL [S12]
- What a user can do. Desktop app: build a circuit, load firmware, step through code with the circuit live. Custom components are the stated focus of the next version. Export to real toolchains: loads compiled firmware (UNKNOWN which formats). Collaboration, AI, curriculum: UNKNOWN.
- Community size. CE fork 324 stars, 58 forks (page fetched 2026-10-26). EXTERNAL [S11]
- Limitations. I found no user complaint threads in this pass. UNKNOWN.
- Learn or reuse. Licence is copyleft (AGPL/GPL), so embedding it in a closed product is not possible. The idea of a "share custom components" site is the part worth learning from. HYPOTHESIS.

### 2. Falstad CircuitJS and its fork lineage
- What it is. Browser circuit simulator: animated voltage colours and moving current dots, right-click edit, many sample circuits. Java original, JavaScript port by Iain Sharp via GWT. A separate AVR8js build and a Polish index exist. EXTERNAL [S7] [S5]
- Owner and licence. Paul Falstad (original), Iain Sharp (JS port), many contributors. GPL-2.0-or-later. EXTERNAL [S8] [S5]
- Lineage. pfalstad/circuitjs1 (active upstream, 2.4k stars, 440 forks, GPL-2.0) [S5]; sharpie7/circuitjs1 (Sharp's version, 3.0k stars, 863 forks, GPL-2.0) [S6]; SEVA77/circuitjs1, an offline desktop build on a modified NW.js (512 stars, 76 forks, GPL-2.0) [S9]; lushprojects.com hosts Sharp's build, and a forum thread says Sharp stopped regular updates and points to Falstad's page for the latest. EXTERNAL (search snippet) [S45b]
- Audience. Students and teachers wanting quick intuition. EXTERNAL [S45]
- Pricing. Free, no account. EXTERNAL [S4] [S7]
- What a user can do. Build, edit, and run circuits; share by URL (UNKNOWN exactly how); standalone offline versions; credits list AVR8js support, WebSocket support, DC motor, thermistor, LDR, scope spectrum. Import/export is credited but formats not named. EXTERNAL [S7] [S8]
- Custom components. Subcircuits are not mentioned on the about page. UNKNOWN. Plugin API: not mentioned.
- Community signals. Contributors list 16+ named people plus many translators, which suggests multilingual UI. EXTERNAL [S8]
- Limitations (users). Idealised models, no manufacturer model import, no cloud saving, no classroom tools (CircuitSim's comparison, a competitor, so treat as biased) [S4]. EEVblog reply: no core saturation in transformers; element14 commenter: it does not use SPICE [S45].
- Learn or reuse. Most reusable engine in the category if iynk accepts GPL-2.0-or-later. Its AVR8js integration shows the same idea iynk implements with its own interpreters. HYPOTHESIS.

### 3. Labcenter Proteus VSM
- What it is. Schematic capture, mixed-mode SPICE, PCB layout, and Virtual System Modelling: you attach a HEX, COF, ELF/DWARF2 or UBROF file to an MCU part and the whole system runs, with breakpoints and single-step that halt the whole simulated circuit. Instruments include DSO, logic analyser, I2C and SPI analysers. EXTERNAL [S16]
- Owner. Labcenter Electronics (UK). Proprietary.
- Audience. Professionals, universities, hobbyists on cracked copies (not evidenced; do not claim). Education sold at a flat 20% discount to commercial, with student licences and cloud licensing. EXTERNAL [S15]
- Pricing. Official list prices are not visible on the fetched pages (placeholders "$$$price"; the commercial list showed only a 0.00 GBP placeholder) [S13] [S14]. Plans named Enterprise, Platinum, Custom. Retailer listings (search snippet, currency not stated, not dated): VSM for Atmel AVR 537.00 and 767.14 in a Canadian listing; VSM for Arduino AVR 322.00, each with a 6-month update contract [S17]. Treat as indicative only.
- What a user can do. Real firmware on the simulated MCU alongside analog parts. No evidence of browser use. Custom component models exist in the product (UNKNOWN details). Export: PCB and manufacturing outputs (UNKNOWN specifics). Collaboration: cloud licensing only. UNKNOWN beyond.
- Limitations (users, old, undated forum threads). Missing power/ground and crystal circuits are not enforced, so working simulations can fail on real hardware; STM32 HEX files failed until options were changed; DLL authorisation errors. One Parallax poster says AVR simulation is quite good and support is excellent. EXTERNAL [S17] An EDAboard post says its SPICE engine is weaker than Multisim's and its MCU list is limited. EXTERNAL [S45]
- Learn or reuse. Proteus defines what users expect from "MCU plus circuit" fidelity: step-through where the whole circuit halts. iynk's fault injection is a different angle. Nothing reusable (proprietary).

### 4. NI Multisim (desktop, NI Circuit Design Suite)
- What it is. SPICE simulation plus schematic editor and PCB tools; editions Education and Designers. NI describes a student download "NI Circuit Design Suite 14.1 Education" without stating price. EXTERNAL [S18]
- Owner. NI, which is part of Emerson (the NI shop page did not state this; UNKNOWN from my sources).
- Pricing. NI shop shows no price ("Loading Pricing... contact us"). Aggregators: TrustRadius lists Base 1,869, Full 3,267, Professional 4,838 USD per user; SoftwareSuggest lists an academic tier at 628 USD per year (updated 2026-04-28) and professional at 1,869 per year; the sources disagree on tier names. Indicative only. EXTERNAL [S19]
- Capabilities. MCU co-simulation: not covered on the page I read. UNKNOWN.
- Learn or reuse. Multisim's classroom position is being vacated online (see 5). Proprietary, nothing reusable.

### 5. Multisim Live
- Status: ended. Confirmed on a page I opened only via CircuitSim's comparison [S4]: end of life 2026-09-15, no guarantee of saved designs, monthly subscriptions ended 2026-08-01, courtesy access to NI Circuit Design Suite ends 2026-10-01. The EEVblog thread says only "September" [S2]. The Digilent notice (title "Multisim Live EOL Letter") said the same per a search snippet; its page returned 403 on re-check [S1]. S4 is a competitor, so the date rests on one biased source plus a snippet: NI points users to desktop Multisim; designs can be downloaded and imported but comments may not transfer. EXTERNAL (search snippet; the notice page itself returned 403) [S1]. CircuitSim's 2026 comparison also says it "ends September 15, 2026" [S4]. I could not load the site to confirm it is down today. UNKNOWN.
- Why it matters. A browser SPICE teaching tool lost its host. Evidence that a vendor-hosted free web tool can disappear and strand user data. Useful message for iynk: let users export their projects.

### 6. EasyEDA (Standard and Pro)
- What it is. Browser and desktop schematic and PCB editor tied to JLCPCB (fab) and LCSC (parts). The LCSC link gives access to "more than 200,000 real-time, in-stock components" per a search summary (not verified on the page) [S22b].
- Owner. EasyEDA / JLC (the plans page does not name a parent; UNKNOWN from fetched page).
- Pricing (the page shows only a "$" sign and names no currency code; read as USD, UNKNOWN officially; annual billing only). Individuals Free Forever 0; "Premium Commercial Use: Individuals" 19.9/month billed annually; Enterprise 39.9/month per member, "Coming Soon"; Enterprise Free "Coming Soon"; Education "coming soon". All plans allow commercial use of designs. Paid adds private libraries, permissions, logs, more storage. EXTERNAL [S20]
- Simulation. Std Edition "supports simple circuit simulation" for up to 300 devices or 1000 pads [S20]. Pro Edition docs say two engines, SimulIDE (entry, real-time) and NGSpice (transient, AC), and say MCUs, FPGAs, DSPs and code tools are not supported. EXTERNAL [S21]. Old Std FAQ says the engine is LTspice-like and parts often lack models; sources conflict, so check current docs [S22].
- Learn or reuse. The strongest model for "design to physical BOM to purchase to fab". EasyEDA shows what a hardware startup path looks like: sim, BOM, order. iynk already has SerpApi parts prices; the missing step is a project BOM. HYPOTHESIS.

### 7. KiCad + ngspice (and EEcircuit)
- KiCad. Free open-source EDA: schematic, PCB, 3D viewer, integrated SPICE simulator (ngspice). Latest stable 10.0.7 on 2026-10-07; 10.0.8 RC1 on 2026-10-22. EXTERNAL [S23]. Licence: the GitHub mirror shows GPL-3.0 plus 9 other licences found (3.1k stars, 767 forks) [S24]; the GitLab page showed a Boost-1.0 licence file and 60,134 commits, created 2019-11-24 [S25]. Primary code licence therefore UNKNOWN from my fetches; the repo to check is https://gitlab.com/kicad/code/kicad (mirror https://github.com/KiCad/kicad-source-mirror). Donations via Linux Foundation [S23]. Simulator chapter: Simulation Model Editor, SPICE directives, "exclude from simulation" attribute [S26].
- ngspice. Open-source circuit simulator: JFET, BJT, MOS, R/L/C, diodes, transmission lines; event-driven digital and mixed-signal; reads PSPICE and LTspice model parameters; reads HSPICE libraries from foundry PDKs. EXTERNAL [S27]. Licence: Modified BSD per Wikipedia (BSD-3-Clause), with exceptions (contrib GPL/public domain, parts LGPL, manual CC-BY-SA 4.0). Wikipedia lists stable 47 dated 2026-08-11 (search snippet). EXTERNAL [S28]
- EEcircuit. Browser SPICE simulator built on ngspice compiled to WebAssembly. MIT licence, 187 stars, 20 forks, 809 commits on branch gen2-next. Schematics and results stay in the browser (not uploaded), saved to browser storage, plots via webgl-plot, CSV download. V1 files need conversion; V2 lacks layout, PDK corners, Monte Carlo, transmission lines. Repo https://github.com/eelab-dev/EEcircuit. EXTERNAL [S29]. The eecircuit.com home page fetch returned only a title [S30].
- Learn or reuse. ngspice WASM is the realistic path to higher-fidelity analog in the browser (BSD, permissive). Velxio already uses it [S43]. iynk has its own solver; a "cross-check against ngspice" mode would be a credibility feature. HYPOTHESIS. EEcircuit (MIT) is reusable code.

### 8. Fritzing
- What it is. Desktop EDA for makers with breadboard, schematic, PCB views; a simulator runs in breadboard and schematic views (Wikipedia). EXTERNAL [S31]
- Owner. Developed by Interaction Design Lab Potsdam origin; Friends of Fritzing e.V. closed in 2018; Aisler helped restart development in 2019; Fritzing Fab links to Aisler. Source GPL-3.0 (Wikipedia: GPL 3.0 or later; the repo page says GNU GPL v3 and "5 other licenses found"), docs and parts CC BY-SA 3.0. Repo https://github.com/fritzing/fritzing-app, 4.8k stars, 961 forks. EXTERNAL [S31] [S33]
- Pricing. Source is free; official binaries require a payment; suggested 8 EUR or 25 EUR (Wikipedia gives these as 2019 figures; a forum user, not staff, repeated the model in February 2025); same software either way; download link reportedly lasts about a year (unconfirmed). EXTERNAL [S31] [S32]. mikrocontroller.net headline reports 1.0 "only for paying downloaders" (page returned 403; headline only) [S34].
- Version. Wikipedia infobox: 1.0.7 stable, 2026-04-15, while its own release table says Q4 2025; a search summary of fritzing.org says 1.0.8 on 2026-08-12. Sources conflict. [S31] [S34]
- Learn or reuse. Breadboard view is the right mental model for beginners and matches iynk's bench assembly. A paywalled binary caused user confusion (forum thread title "Confusion over Software Pricing"). iynk's free-by-default stance is a contrast. Code is GPL-3.0.

### 9. CircuitLab
- What it is. Browser schematic editor with SPICE-like analog and digital mixed-mode simulation, small-signal frequency domain, sweeps, plots, PDF/PNG/SVG/EPS export, shareable circuit URLs, and a "CircuitLab Assistant (Beta)" that builds circuits from plain-English requests. EXTERNAL [S35]
- Owner. CircuitLab (proprietary). TechCrunch reported 70K monthly users in March 2013, the only user figure found; it is old. EXTERNAL (search snippet) [S38]
- Pricing. The membership page returned 404 and the home page lists no prices. The FAQ confirms the Micro plan and says an account is needed to save circuits and export PNG/PDF; only the trial editor works without one [S36]. FAQ: subscriptions renewing or one-time, hobbyist discount, Pro and Enterprise for commercial use, Micro plan limited to 10 components per schematic, Student Edition free via a school site licence. A search snippet quotes a 2,400/year institution licence (undated, currency not stated). Current USD prices: UNKNOWN. EXTERNAL [S36] [S38]
- No-account use. You can try the editor by opening an example circuit without an account. EXTERNAL [S36]
- Export. Import and export to other tools: "Not at this time". EXTERNAL [S36]
- Complaints. 2013 forum thread: free tier started timing out, users felt it was bait-and-switch, price too high for hobbyists (staff cited about 5 to 8 USD per month non-commercial). Old but shows the trust cost of closing a free tier. EXTERNAL [S37]
- Learn or reuse. AI assistant in an editor is already shipping here. Proprietary.

### 10. EveryCircuit
- What it is. Web, Android and iOS app with animated voltages and currents, real-time interaction, AC analysis with Bode plots, XY scope mode, mixed analog and digital. About 3 million circuits created (vendor). EXTERNAL [S39]
- Pricing (USD). Free: no ads, your own circuits up to 5 components, full features on public circuits. 5/month subscription (annual saves 33%). 15 one-time purchase for all platforms. Class licence 4 per semester, depending on dates and student count. EXTERNAL [S39]
- Learn or reuse. A one-time 15 USD price and a per-semester class price are useful price anchors. Proprietary.

### 11. CircuitSim (new, 2026)
- What it is. Free browser SPICE simulator announced 2026-04-22 on EEVblog by a self-described former NI employee (a new account with 4 posts) as a Multisim Live replacement. Full SPICE (DC op, DC sweep, AC sweep, transient; noise and distortion in netlist), 5,000+ official components, community parts, Custom Component Studio, CSV export, classes and teams. EXTERNAL [S2] [S3]
- Owner. Elsewhere Labs, LLC, two people per [S4] (not re-verified; the home page names no owner). The EEVblog poster calls themselves a "Former NIer" who worked on NI cloud software; the "friend" co-founder is not confirmed on the thread pages I read. EXTERNAL [S2]
- Pricing (USD). Basic 0 (5 circuits, 5 custom components, 5 components per circuit, public sharing only); Standard 2.50/month billed 30/year (10 circuits, 10 custom components, 15 components per circuit, private circuits); Premium 7.50/month billed 90/year (unlimited); group licences from 2 seats, card or NET-30 invoice. The page lists no monthly prices. The vendor comparison page [S4] says "paid from $2.99 per month", which conflicts with the pricing page; the pricing page is the better source. EXTERNAL [S3] [S4]
- Account. "Get started free" sign-up; whether the editor needs an account is not stated. UNKNOWN. Vendor admits: no MCU parts, no PCB layout, needs internet, Multisim Live import experimental. EXTERNAL (vendor) [S4]
- Threat. Takes the Multisim Live classroom crowd. Medium for iynk's analog circuits, low for MCU/robotics/drone.

### 12. Velxio (new)
- What it is. Open-source browser simulator for Arduino, ESP32, Raspberry Pi and other boards, with ngspice WASM "about 60 times per second", 150+ components, oscilloscope, custom chips compiled to WebAssembly, WiFi/MQTT simulation on ESP32, 400+ examples, Monaco editor, arduino-cli compile, Docker self-host. Emulators: avr8js, rp2040js in browser; QEMU on a backend for ESP32, STM32 and Pi Linux. EXTERNAL (vendor/README) [S42] [S43]
- Licence. The GitHub README says dual: AGPL-3.0 for personal, educational, open-source use; paid commercial licence for proprietary or SaaS use (CLA required: not re-checked, UNKNOWN). The velxio.dev pricing page states only "AGPLv3, open source" [S42]. Repo https://github.com/davidmonterocrespo24/velxio, 3.5k stars, 363 forks, 2,122 commits (page fetched 2026-10-26). EXTERNAL [S43]
- Pricing (USD, monthly or annual; the page says "Save 25%/18%/17%" but annual equals 12 x monthly, so the savings text does not match the numbers). Free 0 (basic AI chat 50 messages/day, no Agent or Tutor); No AI 3.00 (36/year); Maker 5.75 (69/year, Agent, Tutor and Create-with-AI modes); Pro 15.75 (189/year, GitHub sync, BOM CSV and schematic PNG export, AI agent over MCP). Free tier limits STM32, Raspberry Pi Linux and UNIHIKER boards to three 15-minute trial sessions per family. EXTERNAL [S42]
- Claims I could not verify. "Real silicon. Real physics", "instruction by instruction" emulation, partner hardware checks. The sources disagree on board count: pricing page 35 boards across 6 CPU architectures, Free plan 30+ boards and 48+ components; GitHub sidebar 19, README 40 boards and 5 CPU families. The "150+ components" figure above was not found on re-check: UNKNOWN. The self-hosted Docker image runs only Arduino, Pico and ESP32 families [S42] [S43]. EXTERNAL (vendor, inconsistent) [S42] [S43]
- Threat to iynk: high on Board Lab. It overlaps boards, MicroPython, ESP32, an MCP link and AI. Differences iynk can defend: no backend needed for core boards (Velxio uses QEMU server side for some), robotics and drone labs, fault injection, six UI languages, rooms. HYPOTHESIS.

### 13. Tinkercad Circuits (neighbour)
- What it is. Autodesk's free browser tool with Arduino Uno simulation, Serial Monitor, 100+ parts, teacher accounts and class management (third-party guides, early 2026). Needs an Autodesk account. Official page fetch gave only a title. EXTERNAL (secondary) [S44] [S4]
- Limits per reviews. Only Uno per [S44]; but CircuitSim's 2026 comparison says Tinkercad includes simulated Arduino and micro:bit boards, a conflict [S4]. No AC analysis or DC sweep, idealised passives [S4]; no analog waveform analysis and slower than real time per [S44]. Licence proprietary.
- Learn. The default K-12 incumbent. Class management is the feature to match.

### 14. Wokwi (neighbour)
- What it is. Browser firmware simulator for Arduino, ESP32, Pico, STM32; not a SPICE tool. EXTERNAL [S4] [S40]
- Pricing (EUR, annual billing). Community 0 (open-source projects, unlimited public projects, virtual WiFi); Hobby 5.6/month; Hobby+ 8.1/month; Pro 20 per seat per month; classroom licence by quote. Free plan is public projects only. VS Code plugin free for open-source, a 30-day personal licence, commercial needs a licence. EXTERNAL [S40] [S41]
- Learn. Public-by-default free tier and paid privacy is the accepted model in this space.

### 15. Dropped or unverified
- PartSim, Circuit Sandbox, Qucs-S, LTspice: not researched in depth. LTspice (free, desktop, no browser) appears only in a competitor's table [S4]. PCBX online simulator page returned 403; only a search-result title seen. UNKNOWN [S47].
- Cirkit Designer: not found. UNKNOWN.

## Comparison table

Labels in cells: T tested, E external, S estimated, H hypothesis, U unknown. No row is T because nothing was run.

### A. Access and editor

| Product | Free usage | No-account entry | Browser-based | User-created projects | Circuit editor | Custom hardware models | Pricing (2026-10-26) |
|---|---|---|---|---|---|---|---|
| SimulIDE | Yes E [S10] | n/a desktop E | No E [S10] | Yes E [S10] | Yes E [S10] | Next version focus E [S12] | Free E [S10] |
| Falstad CircuitJS | Yes E [S7] | Yes E [S4] | Yes E [S7] | Yes E [S7] | Yes E [S7] | Subcircuits U [S8] | Free E [S7] |
| Proteus VSM | No E [S13] | n/a desktop | No E [S16] | Yes E [S16] | Yes E [S16] | Yes U [S16] | Quote; reseller 322-767 U-currency E [S17] |
| Multisim desktop | No E [S19] | n/a | No E [S18] | Yes E [S18] | Yes E [S18] | U | 628-4,838 USD aggregator E [S19] |
| Multisim Live | Ended E [S1] | U | Yes E [S1] | Yes E [S1] | Yes E [S1] | U | EOL 2026-09-15 E [S1] |
| EasyEDA | Yes E [S20] | U | Yes E [S20] | Yes E [S20] | Yes E [S20] | Library parts E [S20] | 0 / 19.9 USD per month E [S20] |
| KiCad + ngspice | Yes E [S23] | n/a desktop | No E [S23] | Yes E [S23] | Yes E [S23] | Sim model editor E [S26] | Free E [S23] |
| EEcircuit | Yes E [S29] | Yes (local storage) E [S29] | Yes E [S29] | Yes E [S29] | Yes E [S29] | SPICE netlist E [S29] | Free (MIT) E [S29] |
| Fritzing | Source only E [S31] | n/a desktop | No E [S31] | Yes E [S31] | Yes E [S31] | Parts editor U | 8-25 EUR suggested E [S31] |
| CircuitLab | Trial / Micro E [S36] | Example open: yes E [S36] | Yes E [S35] | Yes E [S35] | Yes E [S35] | U | Current USD U [S36] |
| EveryCircuit | Yes, 5 parts E [S39] | U | Yes E [S39] | Yes E [S39] | Yes E [S39] | U | 5/month or 15 once USD E [S39] |
| CircuitSim | Yes, capped E [S3] | U [S3] | Yes E [S3] | Yes E [S3] | Yes E [S3] | Yes, studio E [S3] | 0 / 2.50 / 7.50 USD per month E [S3] |
| Velxio | Yes, capped E [S42] | U [S42] | Yes E [S42] | Yes E [S42] | Yes E [S42] | WASM chips E [S43] | 0 / 3 / 5.75 / 15.75 USD E [S42] |
| Tinkercad Circuits | Yes E [S44] | No (Autodesk account) E [S44] | Yes E [S44] | Yes E [S44] | Yes E [S44] | U | Free E [S44] |
| Wokwi | Yes, public only E [S40] | U | Yes E [S40] | Yes E [S40] | Yes E [S40] | Libraries on paid E [S40] | 0 / 5.6 / 8.1 / 20 EUR E [S40] |

### B. Fidelity, firmware and debugging

| Product | Firmware compatibility | MCU sim fidelity | Analog fidelity | Failure modeling | Debugging tools | Robotics sim | Drone sim |
|---|---|---|---|---|---|---|---|
| SimulIDE | Loads firmware, formats U E [S10] | Real MCU, level U [S10] | Basic U | U | Breakpoints, watch, scope, logic analyzer E [S10] | U | U |
| Falstad CircuitJS | AVR8js build E [S7] | AVR8js only U | Idealised E [S4] | U | Scope, spectrum E [S8] | U | U |
| Proteus VSM | HEX, COF, ELF, UBROF E [S16] | Broad families, claim only E [S16] | Mixed-mode SPICE E [S16] | Not enforced for power/crystal E [S17] | Whole-circuit breakpoints, DSO, analysers E [S16] | U | U |
| Multisim desktop | U | U [S18] | SPICE E [S18] | U | U | U | U |
| Multisim Live | None stated U | U | SPICE E [S4] | U | U | U | U |
| EasyEDA | None; MCU unsupported E [S21] | No E [S21] | ngspice, simple E [S21] | U | U | U | U |
| KiCad + ngspice | None E [S26] | No E [S26] | ngspice, deep E [S27] | Monte Carlo via ngspice U | Plots, tuning E [S26] | U | U |
| EEcircuit | None | No | ngspice E [S29] | Corners/MC not in V2 E [S29] | Plots, CSV E [S29] | U | U |
| Fritzing | Arduino CLI upload E [S31] | U | Simple U | U | U | U | U |
| CircuitLab | None stated U | No | Proprietary SPICE-like E [S35] | U | Plots, markers E [S35] | U | U |
| EveryCircuit | None stated U | No | Simplified E [S4] | U | I-V, Bode, XY scope E [S39] | U | U |
| CircuitSim | None; no MCU E [S4] | No E [S4] | Full SPICE E [S3] | Noise in netlist E [S3] | Cursors, CSV E [S3] | U | U |
| Velxio | arduino-cli, ESP-IDF, MicroPython E [S43] | avr8js, rp2040js, QEMU E [S43] | ngspice WASM E [S43] | U | Oscilloscope E [S43] | U | U |
| Tinkercad Circuits | Uno sketches E [S44] | Uno per [S44]; Uno and micro:bit per [S4] (conflict) | Idealised E [S4] | U | Serial monitor E [S44] | U | U |
| Wokwi | Real toolchains, VS Code E [S40] | AVR, ESP32, Pico, STM32 E [S4] | None E [S4] | U | U | U | U |

### C. Teaching, community and business

| Product | AI guidance | Multilingual UI | Real-time collaboration | Curriculum / LMS | Community features | BOM | Purchasing | Export to toolchains | Plugin extensibility | Performance | Audience | Ecosystem | Moat |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SimulIDE | U | U | U | U | Planned sharing site E [S12] | U | U | Firmware U | Custom components E [S12] | U | Hobby, students E [S11] | 324 stars E [S11] | Open, free; weak H |
| Falstad CircuitJS | None seen U | Many translators E [S8] | U | None E [S4] | Forum/issues E [S7] | U | U | File import/export E [S8] | Fork-friendly GPL E [S5] | Fast, per users E [S45] | Students E [S45] | 2.4k + 3.0k stars E [S5] [S6] | Brand and ubiquity H |
| Proteus VSM | U | U | Cloud licence only E [S15] | Edu licences E [S15] | U | PCB module E [S13] | U | PCB, HEX E [S16] | U | U | Pros and schools E [S15] | Vendor claims broadest MCU list E [S16] | MCU model library H |
| Multisim desktop | U | U | U | Education edition E [S18] | U | PCB tools E [S18] | U | PCB E [S18] | U | U | Schools, engineers E [S18] | NI hardware H | Teaching base H |
| Multisim Live | U | U | U | U | U | U | U | Download to desktop E [S1] | U | U | Students E [S1] | Ended E [S1] | None left |
| EasyEDA | None seen U | U | Teams E [S20] | Education plan coming soon E [S20] | Team libraries E [S20] | Yes (LCSC) E [S22b] | LCSC, JLCPCB E [S22b] | Gerber (U) | U | U | Makers, small firms E [S20] | JLC supply chain H | Fab and parts link H |
| KiCad + ngspice | U | U | U | U | Donors, forums U | Yes U | U | PCB outputs U | Plugins U | U | Engineers, makers E [S23] | 3.1k mirror stars E [S24] | Open standard H |
| EEcircuit | None seen U | U | No (local only) E [S29] | U | U | U | U | CSV E [S29] | U | WASM U | Engineers H | 187 stars E [S29] | None H |
| Fritzing | U | U | U | Education use U | Forum E [S32] | Yes U | Via Aisler Fab E [S31] | Gerber U | Parts E [S31] | U | Makers E [S31] | 4.8k stars E [S33] | Breadboard view H |
| CircuitLab | Assistant (beta) E [S35] | U | Share URL E [S35] | Student Edition via site licence E [S36] | Public circuits, Q&A E [S35] | U | U | None to other tools E [S36] | U | Local in browser E [S36] | Students, pros E [S36] | 70K monthly in 2013 E [S38] | Solver, editor UX H |
| EveryCircuit | U | U | Share/discover E [S39] | Class licence E [S39] | Public circuits E [S39] | U | U | U | U | Real-time E [S39] | Students E [S39] | 3M circuits E [S39] | Mobile + one-time price H |
| CircuitSim | U | U | Classes, teams E [S3] | Group dashboards E [S3] | Community parts E [S3] | U | U | CSV, netlist E [S3] | Custom Component Studio E [S3] | U | Students, pros E [S3] | New (2026-04) E [S2] | Multisim Live refugees H |
| Velxio | AI agent, tutor, MCP E [S42] | U | U | U | 400+ examples E [S43] | Pro: BOM export E [S42] | U | GitHub sync, schematic export E [S42] | Custom WASM chips E [S43] | ngspice about 60 Hz E [S42] | Makers, edu E [S42] | 3.5k stars E [S43] | Open-source + emulator breadth H |
| Tinkercad Circuits | U | U | Classes E [S44] | Teacher accounts E [S44] | U | U | U | U | U | Slower than real time E [S44] | K-12 E [S44] | Autodesk H | Install base, brand H |
| Wokwi | U | U | U | Classroom licence E [S40] | Public projects E [S40] | U | U | VS Code, CI E [S40] | Custom libraries E [S40] | Fast build queue on paid E [S40] | Makers, firms E [S40] | Large (no figure) U | Board coverage H |

## Where iynk could be genuinely different here (HYPOTHESIS unless evidenced)

1. One lab for boards, robots and drones. No tool in these sources covers MCU firmware, a circuit solver, robot assembly and drone flight in one place. Evidence of absence is only "not stated on fetched pages". HYPOTHESIS.
2. No account, no payment, no install, six languages. Only Falstad and (maybe) EEcircuit match no-account; only Falstad shows many translators. Combined with real firmware interpreters, nobody else is listed. EXTERNAL for each fact, HYPOTHESIS for the combination.
3. Fault injection and failure teaching. Proteus users complain a simulation works while hardware fails because power, ground and crystals are not enforced [S17]; teaching real failure modes is a gap. HYPOTHESIS.
4. Capture the Multisim Live gap with project export. Offer import of netlists, and make export simple so no one is stranded the way Multisim Live users are. HYPOTHESIS.
5. Create original projects (the current gap). All 14 live competitors have it. Minimum: save, name, share by link, fork a catalogue item. Public by default and paid private is the accepted model (Wokwi, CircuitSim, Velxio). HYPOTHESIS.
6. Bill of materials plus purchase. EasyEDA (LCSC) and Velxio Pro (BOM export) show the demand; iynk's SerpApi prices already exist. HYPOTHESIS.
7. Cross-check mode with ngspice WASM (BSD-3-Clause) for classroom credibility on analog results. HYPOTHESIS.
8. Compete on openness for classrooms: Velxio is AGPL with a commercial licence; Wokwi free tier is for open-source only. A clear free-for-schools promise is a position. HYPOTHESIS.

## Fact-check log (2026-10-26)

Checked by re-opening sources with WebFetch on 2026-10-26. The search tool hit its session budget, so no new search was possible and no replacement links were found; claims that rested only on snippets stay marked as snippets. Verdicts: confirmed, corrected, unconfirmed.

| # | Claim | Verdict | Source |
|---|---|---|---|
| 1 | Multisim Live EOL 2026-09-15, subscriptions until 2026-08-01 | corrected: confirmed only via CircuitSim comparison (biased); Digilent page 403; EEVblog says "September" | [S4] [S2] [S1] |
| 2 | CircuitSim plans and prices (0 / 2.50 / 7.50) | confirmed; Standard limits added; "$2.99" on comparison page confirmed as a conflict | [S3] [S4] |
| 3 | CircuitSim "no account stated" | confirmed UNKNOWN (page offers sign-up, silent on editor) | [S3] |
| 4 | CircuitSim founder and team of two | unconfirmed: former-NI claim confirmed on EEVblog, "friend"/two people not confirmed | [S2] |
| 5 | Velxio prices 0 / 3 / 5.75 / 15.75 | confirmed; Free tier has basic AI chat, savings text inconsistent | [S42] |
| 6 | Velxio AI agent and MCP on Pro | corrected: Agent and Tutor on Maker, MCP on Pro | [S42] |
| 7 | Velxio licence AGPL + commercial | corrected: README says dual, pricing page says AGPLv3 only | [S43] [S42] |
| 8 | Velxio 3.5k stars, 363 forks, 2,122 commits | confirmed | [S43] |
| 9 | Velxio "150+ components" | unconfirmed: site says 48+ | [S42] |
| 10 | Wokwi 0 / 5.6 / 8.1 / 20 EUR, public-only free | confirmed | [S40] |
| 11 | EasyEDA plan prices and coming-soon items | corrected: currency not named, plan name fixed | [S20] |
| 12 | EasyEDA Pro sim engines, no MCU | confirmed | [S21] |
| 13 | EveryCircuit 5 / 15 / 4, 3M circuits | confirmed | [S39] |
| 14 | KiCad 10.0.7 (2026-10-07), 10.0.8 RC1 (2026-10-22) | confirmed | [S23] |
| 15 | KiCad mirror 3.1k stars, GPL-3.0 + 9 licences | confirmed | [S24] |
| 16 | CircuitJS Falstad 2.4k/440 GPL-2.0; Sharp 3.0k/863 GPL-2.0 | confirmed (README says v2 or later) | [S5] [S6] |
| 17 | SimulIDE licence (AGPLv3 site, GPL-3.0 repo), 324 stars | confirmed as a conflict; "CE fork" and version 1.1.0 unconfirmed | [S10] [S11] |
| 18 | EEcircuit MIT, 187 stars, 809 commits | confirmed | [S29] |
| 19 | Fritzing GPL-3.0, 4.8k stars, 8/25 EUR | corrected: 8/25 EUR are 2019 figures per Wikipedia; version conflict in Wikipedia itself | [S31] [S33] |
| 20 | ngspice 47 (2026-08-11), BSD-3-Clause | confirmed on the page (no longer snippet-only) | [S28] |
| 21 | CircuitLab no-account trial, Micro 10 components, no export | confirmed; account needed to save | [S36] |
| 22 | Labcenter edu 20% discount | confirmed; list prices still not visible | [S15] |
| 23 | Tinkercad Uno only, needs Autodesk account | corrected: account confirmed by S4; S4 also lists micro:bit | [S4] [S44] |
| 24 | "Only Tinkercad-class and Wokwi-class tools sell classroom licences" | corrected: false, several others do | [S15] [S36] [S39] [S3] |
| 25 | "all 15 products" lack-of-project gap | corrected: 14 live products | file |
| 26 | Paid tiers "USD 2.50 to 20" | corrected: mixed USD and EUR | [S20] [S40] |
| 27 | EasyEDA "200,000 in-stock LCSC parts" | unconfirmed: third-party snippet, not re-opened | [S22b] |
| 28 | CircuitLab 70K users (2013), 2,400/year licence | unconfirmed: snippet only, not re-opened | [S38] |
| 29 | Proteus reseller prices 322-767 | unconfirmed: snippet only | [S17] |
| 30 | Multisim aggregator prices | unconfirmed: snippet only | [S19] |

## Sources

Access date for all: 2026-10-26. "Describes" gives the version or date the page states.

- [S1] https://support.digilent.com/hc/en-us/articles/41178584173979-Multisim-Live-EOL-Letter. "Multisim Live EOL Letter", Digilent. Search snippet only (page returned 403). Describes EOL 2026-09-15; monthly subscriptions until 2026-08-01.
- [S2] https://www.eevblog.com/forum/projects/multisim-live-going-eol-in-september-building-free-alternative/. "Multisim Live going EOL in September - building free alternative", EEVblog forum. Thread of 22 posts, announced 2026-04-22; names circuitsim.com.
- [S3] https://circuitsim.com/. CircuitSim home and pricing, Elsewhere Labs. Describes plans as of 2026-10-26.
- [S4] https://circuitsim.com/p/best-free-circuit-simulators-2026. "9 Best Free Circuit Simulators in 2026", CircuitSim (vendor, self-ranked first, biased). 2026.
- [S5] https://github.com/pfalstad/circuitjs1. GitHub, Paul Falstad. 2.4k stars, 440 forks, GPL-2.0.
- [S6] https://github.com/sharpie7/circuitjs1. GitHub, Iain Sharp. 3.0k stars, 863 forks, GPL-2.0.
- [S7] https://www.falstad.com/circuit/. "Circuit Simulator Applet", Paul Falstad. Current page.
- [S8] https://www.falstad.com/circuit/about.html. "About", Paul Falstad. Version number blank; GPL-2.0-or-later; contributor list.
- [S9] https://github.com/SEVA77/circuitjs1. GitHub, SEVA77. 512 stars, 76 forks, GPL-2.0.
- [S10] https://simulide.com/. SimulIDE home. States AGPLv3.
- [S11] https://github.com/SimulIDE/SimulIDE. GitHub. 324 stars, 58 forks, GPL-3.0.
- [S12] Search snippets: https://appstream.debian.org/forky/main/metainfo/simulide.html (Debian metadata, 1.1.0.1912, updated 2026-02-04), https://simulide.com/p/?p=3262 (1.1.0 stable news, undated), https://opencollective.ecosyste.ms/collectives/simulide (100 stars on eeTools/SimulIDE-dev, synced 2025-01-13).
- [S13] https://www.labcenter.com/pricing/. "Pricing", Labcenter Electronics. Plans Enterprise, Platinum, Custom; prices shown as placeholders.
- [S14] https://www.labcenter.com/pricing/comm/. Commercial pricing. Only a 0.00 GBP placeholder rendered.
- [S15] https://www.labcenter.com/pricing/edu/. Education pricing. 20% discount, local/server/cloud licences.
- [S16] https://www.labcenter.com/whyvsm/. "Why VSM", Labcenter. Current page.
- [S17] Search snippets: https://www.robotshop.com/products/proteus-vsm-software-atmel-avr-microprocessor, https://robotshop.com/products/proteus-vsm-software-arduino-avr (reseller prices, undated); https://forum.arduino.cc/t/simulator/375591, https://www.stm32duino.com/viewtopic.php?p=9562, https://forums.parallax.com/discussion/comment/1047202 (forum complaints, undated, old).
- [S18] https://www.ni.com/en/shop/electronic-test-instrumentation/application-software-for-electronic-test-and-instrumentation-category/what-is-multisim.html. "What is Multisim", NI. Mentions Circuit Design Suite 14.1 Education and, stale, Multisim Live.
- [S19] Search snippets: TrustRadius (https://web-v2.prod.trustradius.com/products/national-instruments-multisim/pricing), G2, SoftwareSuggest (https://www.softwaresuggest.com/multisim, updated 2026-04-28). Aggregators, conflicting.
- [S20] https://easyeda.com/pricing. "Plans and Pricing", EasyEDA. USD, annual billing.
- [S21] https://prodocs.easyeda.com/en/simulation/introduction/. "Simulation Introduction", EasyEDA Pro docs.
- [S22] https://docs.easyeda.com/en/FAQ/Simulation/ and https://easyeda.com/forum/... (search snippet). "EasyEDA Std Simulation FAQ"; older, engine claims conflict with [S21].
- [S22b] https://sourceforge.net/software/circuit-simulation/free-version/ and https://www.nextpcb.com/blog/eda-software-buyers-guide-2026 (search snippet) for the "200,000 in-stock LCSC parts" claim. Third-party, unverified.
- [S23] https://www.kicad.org/. KiCad home. 10.0.7 on 2026-10-07; 10.0.8 RC1 2026-10-22.
- [S24] https://github.com/KiCad/kicad-source-mirror. GitHub mirror. 3.1k stars, 767 forks, "GPL-3.0 and 9 other licenses".
- [S25] https://gitlab.com/kicad/code/kicad. GitLab project page. 60,134 commits; shows Boost-1.0 licence file.
- [S26] https://docs.kicad.org/10.0/en/eeschema/eeschema.html. KiCad 10.0 Schematic Editor manual; only the first 100,000 characters read.
- [S27] https://ngspice.sourceforge.io/. ngspice home.
- [S28] https://en.wikipedia.org/wiki/Ngspice (search snippet). BSD-3-Clause; stable 47 dated 2026-08-11 per snippet.
- [S29] https://github.com/eelab-dev/EEcircuit. GitHub. MIT, 187 stars, 20 forks.
- [S30] https://eecircuit.com/. Fetch returned title only.
- [S31] https://en.wikipedia.org/wiki/Fritzing. Wikipedia. Infobox 1.0.7, 2026-04-15.
- [S32] https://forum.fritzing.org/t/confusion-over-software-pricing/27363. Fritzing forum, 2025-02-28, version 1.0.4 era.
- [S33] https://github.com/fritzing/fritzing-app. GitHub. 4.8k stars, 961 forks, GPL-3.0.
- [S34] Search snippets: https://fritzing.org/ (1.0.8, 2026-08-12, page returned 403) and https://www.mikrocontroller.net/news/fritzing-1-0-nur-fuer-zahlende-downloader (403).
- [S35] https://www.circuitlab.com/. CircuitLab home.
- [S36] https://www.circuitlab.com/docs/faq/. CircuitLab FAQ.
- [S37] https://www.circuitlab.com/forums/support/topic/e49b6z8c/free-circuit-lab-timeout-messages. CircuitLab forum, 2013 to 2015.
- [S38] Search snippets: https://techcrunch.com/2013/03/18/yc-backed-circuitlab-has-70k-monthly-users-for-its-browser-based-electronics-design-and-simulation-tool/amp/ (2013), https://www.electronicsforu.com/technology-trends/circuitlab-circuit-design-in-your-browser (undated).
- [S39] https://everycircuit.com/. EveryCircuit home. USD prices.
- [S40] https://wokwi.com/pricing. Wokwi plans, EUR.
- [S41] https://wokwi.com/license. Wokwi for VS Code licence terms.
- [S42] https://velxio.dev/. Velxio home and pricing (vendor).
- [S43] https://github.com/davidmonterocrespo24/velxio. GitHub. 3.5k stars, 363 forks.
- [S44] Search snippets: https://zbotic.in/tinkercad-arduino-simulation-teach-electronics-online-free/, https://elektronicavoorjou.nl/en/blog/tinkercad-circuits, https://www.etechnophiles.com/best-arduino-simulators/ (third-party guides, early 2026). tinkercad.com fetch returned only a title.
- [S45] Search snippets: https://forum.allaboutcircuits.com/threads/best-circuit-simulator-software.21661/, https://www.eevblog.com/forum/beginners/simulation-of-a-blinking-circuit-(falstad)/msg3412546/, https://community.element14.com/members-area/f/forum/51876/which-is-the-best-eda-software-to-learn/201452, https://edaboard.com/blog/comments/425. Forum opinions, undated.
- [S45b] https://lushprojects.com/circuitjs/ and https://forum.tuxdigital.com/t/lush-project-online-electric-circuit-simulator/5753 (search snippets). Sharp's build and forum comment on updates.
- [S47] https://www.pcbx.com/online-simulate. PCBX online simulator. Fetch returned 403; search-result title only.
