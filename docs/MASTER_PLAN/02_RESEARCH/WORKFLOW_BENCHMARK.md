# Workflow benchmark: Wokwi, Falstad, MakeCode micro:bit, iynk

Run date: 2026-10-26 (some captures after midnight local, so file dates may show 10-27). Method: Playwright (chromium, headless) from the iynk repo, plus documentation for products that need an account or an install.
All screenshots and scripts are in `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/research/bench/` (called `BENCH/` below).

Labels: TESTED = I did it hands-on in the run. EXTERNAL = a cited source says it. ESTIMATED = my calculation. HYPOTHESIS, UNKNOWN as stated.

## 1. Limits of this test (read first)

- Scripted, not human. Selectors, fixed waits and coordinate clicks decide what I saw. A human would find some things I missed and would get stuck on things I did not.
- Wall-clock times are my script's, on one Mac, one network, one run each. They include fixed sleeps. They are not benchmarks. "Human est." columns are ESTIMATED guesses for a first-time user, not measurements.
- Headless Chromium has no WebUSB, so the real "flash to a board" step in MakeCode could not be tested.
- Select-all (Cmd/Ctrl+A) did not work in Wokwi's Monaco editor or iynk's CodeMirror editor when sent as a plain key press in headless mode, so my first attempts appended code to the starter code instead of replacing it. I then set editor text through the page's Monaco API in Wokwi (`monaco.editor.getModels()[i].setValue`) and `ControlOrMeta+KeyA` in iynk. This is a shortcut a human does not take. It means "write code" is TESTED for the result, not for typing.
- Wokwi and Falstad circuits were not drawn by dragging wires. Wokwi circuits were written into `diagram.json` (a supported, documented file in the project). Falstad circuits were pasted through File > Import From Text. In Falstad I did confirm that a toolbar drag places a part (BENCH/falstad_gui_resistor.png). Wiring by mouse is therefore untested for both and a human would spend most of their time there.
- Each case ran once. The Wokwi build queue is variable (see 4.1).
- iynk: I opened the "Build it for real" tab once. Opening it automatically asks the server for live prices, and the page replied "Too many price checks in a row" (BENCH/iynk_buildreal.png). I did not click any build, buy, room or AI control. Treat that as one unintended call to the price service, not a click on a paid feature.
- Not done, by rule: no accounts, no posts, no rooms, no AI partner, no publishing a share link, no payment screens.

## 2. Matrix

Cell format: verdict. Verdict words: yes, partial, no, not tested. "Not tested (account required)" means I did not sign up.

| # | Task | Wokwi (web, no login) | Falstad CircuitJS | MakeCode micro:bit | iynk (public site) | Tinkercad / Arduino Cloud / Proteus / Multisim |
|---|---|---|---|---|---|---|
| 1 | Simple LED circuit | yes (TESTED, wired by JSON, not by mouse) | yes (TESTED, by text import; mouse placement of a resistor TESTED) | no wiring in this tool; LED is on the board (TESTED) | partial: fixed lesson circuit, can swap resistor/colour, cannot draw a new circuit (TESTED) | not tested (account required) |
| 2 | Write and run controller code | yes (TESTED, Arduino C++ compiled in a cloud queue, serial output seen) | no (analog circuit simulator, no MCU code in the tested flow) | yes (TESTED, JavaScript and blocks, simulator) | yes (TESTED, editable Arduino C++ subset, serial with timestamps; compile error shown for my bad code) | not tested (account required) |
| 3 | Add a sensor, inspect response | partial (TESTED: potentiometer and DHT22 placed and wired; analog read printed 0, see 4.1) | partial (parts exist: Photoresistor, Thermistor in Draw menu, TESTED menu only; response not run) | yes (TESTED: simulator shows 21 C and a thermometer slider) | yes (TESTED: light lesson, lux slider changed the serial reading and LED output) | not tested (account required) |
| 4 | Wiring failure | no feedback seen for LED without resistor, reversed LED, or 5V-to-GND short (TESTED, see 4.1) | partial: no warning text for any of the three (TESTED); reversed LED stays dark, short draws a yellow current trail | not applicable (no wiring) | yes: named faults with a burnt LED, a "what you see / why / fix" panel and Repair (TESTED) | not tested (account required); EXTERNAL sources describe Tinkercad LED failure, see 5 |
| 5 | Create a custom component | partial: custom chips API (beta, C/Rust/WASM) EXTERNAL; not run | partial: File > Create Subcircuit exists (TESTED menu only), not run | no (extensions are code packages, not circuits) EXTERNAL not read in depth: UNKNOWN | no (TESTED: no such control found) | Proteus: not tested (install required) |
| 6 | Save, export, share | partial (TESTED: Save dialog and "Download project ZIP" and "Save a copy" in the menu; Save needs name and privacy choice; Share not completed) | yes (TESTED menu: Save As, Export As Link / Text / Image / SVG) | yes (TESTED: .hex download; Share needs publishing, not clicked) | partial: progress in browser local storage, no export of a project (EXTERNAL from site About page; TESTED absence in UI) | not tested (account required) |
| 7 | Add a collaborator | UNKNOWN (no first-party doc found for live co-editing; link sharing only) | no (no accounts) | no (copy of a shared project only, EXTERNAL) | not tested (rooms need creating a room) | Tinkercad: invite link collaboration EXTERNAL (search summary only) |
| 8 | Debug an advanced project | partial: web debugger beta for AVR with breakpoints and variables, 8-channel logic analyser with VCD, EXTERNAL; neither run | no breakpoints; scopes exist (TESTED screenshot) | partial (TESTED: debug mode with variables, call stack, step buttons; no logic analyser) | no (TESTED: no breakpoints, no analyser, no variable pane found) | Proteus: breakpoints, watch, logic analyser EXTERNAL, not run |
| 9 | Simulation to physical | partial (TESTED: Download project ZIP; EXTERNAL: hex/ELF download, VS Code/CI; no BOM found) | no | yes for flashing: .hex file TESTED, WebUSB EXTERNAL (not run) | partial (TESTED: parts list with price lookup UI, rate limited in my run; credential tab text read) | Tinkercad EAGLE .brd export EXTERNAL; Proteus netlist to PCB EXTERNAL |

## 3. Time and effort

Wall-clock is my script. Human est. is ESTIMATED for a first-time user.

| Product | Task | Script wall-clock | Human est. | Steps/clicks (scripted) | Where a user gets stuck |
|---|---|---|---|---|---|
| Wokwi | 1 + 2 together | page ready about 8-16 s; start to serial output about 8 s in one run, 25+ s in another | 5-10 min (placing and wiring by hand) | open URL, edit sketch, edit diagram, press start (4) | Wiring pins by mouse; parts placed under the serial pane (my first run hid the LED); "Waiting in queue" for a cloud build |
| Wokwi | 4 (three variants) | about 8 s to start each, 45 s sleep | 3 min | same as above x3 | Nothing is shown, so the user may not learn there is a mistake |
| Falstad | 1 | import and render about 10-15 s per circuit | 3-5 min (ESTIMATED) | File, Import From Text, paste, OK (4) | Symbol vocabulary; menus are canvas-drawn so keyboard and screen reader access is poor (HYPOTHESIS) |
| MakeCode | 2 + 3 + 8 | editor ready 17 s, code set 5 s, debug toggle 1 s | 3-5 min | New Project, Create, JavaScript, paste, debug icon (5) | First-run tour popup; Download opens a WebUSB wizard instead of a file; file download is under the "..." menu |
| iynk | 2 | page 8 s, edit and run 5 s | 1-2 min | open lesson, edit, Run (3) | Editor is a lesson snippet, not a project; my first paste appended instead of replacing |
| iynk | 4 | about 15 s per fault including page load | 1 min | open lesson, Run, Break it tab, Trigger (4) | None seen |

### What each product asks for

| Product | Access needed for what I did | Paid or gated, as seen |
|---|---|---|
| Wokwi | none | Build queue shown to anonymous users; text: "Log in for one free skip a day. Paid plans skip the queue on every build." [S1] (TESTED by screenshot; a fact-check WebFetch of the page returned static text only, with no queue text, so the queue wording is not reproducible from the page source; the pricing page does say paid plans include fast build minutes, Hobby 100, Hobby+ 500, Pro 1,000 per month [S4]). Wokwi FAQ: projects saved while signed out are tied to the browser that saved them; signing in first makes them available from any device [S21]. So a signed-out save works but is per-browser (EXTERNAL, fact-check). |
| Falstad | none | none seen |
| MakeCode | none | Sign In is optional; persistent share links need sign-in [S9] (confirmed in fact-check) |
| iynk | none | Lesson and bench credentials: "arrive when the server can re-run those checks" (site text). The About page also says that if the deployment has a database, the labs send anonymous usage counts tied to a random browser ID, switchable off in Settings [S14]; so "no tracking" must not be claimed. |

## 4. Per-product notes

### 4.1 Wokwi (https://wokwi.com, accessed 2026-10-26)

Version: no version shown in the app. The earlier claim of a docs footer build timestamp of 2026-10-26 could not be reproduced by the fact-check fetch (UNCONFIRMED) [S2].

- Task 1/2 TESTED. New Arduino Uno project opens at wokwi.com/projects/new/arduino-uno. Add-part menu lists LED, Resistor, Pushbutton, displays and so on (BENCH/wokwi_addpart.png). I added an LED and a resistor from the menu (BENCH/wokwi_parts_added.png), then replaced diagram.json with wired parts. Result: serial monitor printed "on / off" alternately and the board L LED lit (BENCH/wokwi_ok_run.png). Sketch size shown: 12 lines.
- Build queue (TESTED). First run showed "#24 in the build queue ... Log in for one free skip a day. Paid plans skip the queue" (BENCH/wokwi_ok_run.png, an earlier capture). Later runs started within seconds. So wait time is variable and I measured only a few samples.
- Task 3 TESTED in part. Potentiometer and DHT22 placed. Serial printed `0` repeatedly with the knob at its default (BENCH/wokwi_sensor_run.png). I did not move the knob. I did not verify whether my wiring (GND to the first GND pin) was valid, so I cannot say if 0 is the default knob position or a wiring problem. UNKNOWN.
- Task 4 TESTED. Three variants (BENCH/wokwi_noresistor_run.png, wokwi_reversed_run.png, wokwi_short_run.png): LED with no resistor, LED reversed, 5V wired to GND. The page text contained no warning or error in any run and the simulation kept running with the serial output normal. In one frame the short run showed the TX LED lit (yellow); I do not know why. The single LED frame I captured cannot show whether the LED glow changed. Conclusion limited to: no message, no stop, no visible fault marker in my captures.
- Task 5 EXTERNAL. Custom Chips API: beta; C usual, any language that compiles to WebAssembly, Verilog experimental; chip is added by the blue "+" then "Custom Chip", and creates a JSON pinout file and a source file; no plan requirement stated on the page [S3]. Not run.
- Task 6. TESTED: Save split-button menu shows "Save a copy" (disabled for the unsaved project) and "Download project ZIP" (BENCH/wokwi_savemenu.png). Clicking Save opens a "Save Your Project" dialog with a name and Public/Unlisted choice (BENCH/wokwi_save_click.png). Unlisted projects are a paid feature on the pricing page: Community is public only [S4].
- Task 7. I found no first-party documentation of live co-editing; a fact-check search limited to wokwi.com and its docs also found none (docs say sharing is by project link; team billing exists on Pro) [S4, S21]. A third-party blog claim exists and is not credible evidence. UNKNOWN. Wokwi Pro lists "team billing and invoices" [S4], which is not collaboration. Related and missing from the first draft: Wokwi CLI has an experimental MCP server so AI agents (Claude Code, Cursor, Copilot) can run simulations and read serial output; it needs a CLI token and no plan is named on the page [S22]. This narrows any "MCP is unique" claim for iynk.
- Task 8. EXTERNAL (confirmed in fact-check). Interactive debugger in the web editor: breakpoints by clicking the left margin, continue, step over/into/out, variables pane, call stack; AVR only (Uno, Nano, Mega, ATtiny85); beta; for ESP32 and Pico the page points to Wokwi for VS Code [S5]. Logic analyser: 8 digital channels, 1 GHz sample rate per the page, stop the simulation to download wokwi-logic.vcd, open in PulseView or GTKWave [S6]. GDB route for other boards is the VS Code extension [S7] (the GDB page itself was not re-opened in the fact-check: UNCONFIRMED; the debugger page [S5] does say VS Code covers ESP32 and Pico). Not run by me.
- Task 9. TESTED: "Download project ZIP". EXTERNAL (confirmed): VS Code and CI use `firmware` and optional `elf` paths in wokwi.toml; Wokwi VS Code does not compile, you build first [S8]. Note this describes the VS Code/CI route, not the web editor, which compiles in a cloud queue. I found no BOM or wiring-sheet export. UNKNOWN whether one exists in a paid plan.
- Pricing, as of 2026-10-26 (euros, per month with annual billing) [S4]: Community EUR 0/mo; Hobby EUR 5.6/mo (unlisted projects, 100 fast build minutes a month); Hobby+ EUR 8.1/mo (500 fast build minutes, Wokwi for VS Code); Wokwi Pro EUR 20/seat/mo (1,000 fast build minutes, 2,000 CI minutes). Community: unlimited public projects, no unlisted. Confirmed in fact-check. Monthly-billing prices were not captured.
- Licences (reuse): wokwi-elements MIT, avr8js MIT, wokwi-docs MIT [S10] (confirmed via GitHub API in fact-check; pushed 2026-10-25, 2026-08-31, 2026-10-26). Note wokwi-docs is documentation, not simulator code. The simulator site itself is not listed as open source in what I checked: UNKNOWN.

### 4.2 Falstad CircuitJS (https://www.falstad.com/circuit/circuitjs.html)

Version: not shown in the UI. Repo licence and last push re-checked in fact-check (GPL-2.0, 2024-01-22).

- Task 1 TESTED. Used File > Import From Text with a 5 V source, 220 ohm resistor, LED and wire (BENCH/falstad_led_ok.png). The LED glows red, current dots animate, the page exports XML-style text for the circuit (`<cir ...><v/><r/><LED .../>`). Toolbar drag placed a resistor in "Mode: Add Resistor" (BENCH/falstad_gui_resistor.png). Menus are File, Edit, Draw, Scopes, Options, Tools, Circuits (BENCH/falstad_menu_*.png).
- Task 3. Draw > Passive Components lists Photoresistor and Thermistor (BENCH/falstad_draw_sub1.png). Not run.
- Task 4 TESTED. No resistor: LED glows fully, no warning (BENCH/falstad_led_noR.png). Reversed: LED outline stays dark (BENCH/falstad_led_rev.png). 5 V source straight across wire: the loop shows only yellow current dots and no message (BENCH/falstad_short.png). I did not hover over parts to read the current, which Falstad can show; a user might learn more that way. I did not test the "limit" or "failure" options in the Options menu.
- Task 5. File menu has "Create Subcircuit..." (BENCH/falstad_menu_File.png). Draw menu has a Subcircuits submenu. Not run.
- Task 6 TESTED (menu). File: Save As, Export As Link, Export As Text, Export As Image, Copy Circuit Image, Export As SVG, Import From Dropbox.
- Task 7: none seen. Task 8: Scopes menu and live scope traces are shown on the default circuit (BENCH/falstad_home.png); no breakpoints (not an MCU tool). Task 9: none.
- Licence: GPL-2.0, repo https://github.com/sharpie7/circuitjs1 [S11]. Last push shown as 2024-01-22. GPL means any reuse of code in a closed product is a problem for iynk (EXTERNAL licence text; legal view UNKNOWN).

### 4.3 MakeCode for micro:bit (https://makecode.microbit.org; v9.0.12 was seen in my browser run; a fact-check fetch of the home page showed no version, so UNCONFIRMED)

- Task 2 TESTED. New Project, Create, JavaScript tab, set code through the Monaco API, simulator runs. Editor ready in about 17 s of script time (BENCH/mc_editor.png).
- Task 3 TESTED. `input.temperature()` shown on the simulated board as "21 C" with a thermometer slider (BENCH/mc_dlmenu.png).
- Task 4: no wires exist, so a wiring fault cannot happen. The tool avoids the problem by not modelling it.
- Task 8 TESTED. Debug icon opens "Debug Mode" with Variables (n: 0), Call Stack, and run / step buttons (BENCH/mc_debug.png). No logic analyser seen. Breakpoint setting by clicking was not tested.
- Task 9 TESTED/EXTERNAL. Pressing Download opens a "Connect your micro:bit" WebUSB wizard in headless Chromium (BENCH/mc_after_download.png). The "..." menu has "Download as File": it produced `microbit-Untitled.hex`, 1,302,540 bytes (BENCH/mc_project.hex). Docs: WebUSB one click on newer browsers, or copy the .hex to the MICROBIT drive [S12] (confirmed).
- Task 6/7. EXTERNAL [S9] (confirmed in fact-check): anonymous share link needs no account; persistent links need sign-in; shared projects can be copied and edited; "There is no way to share a read-only project"; edits do not change the original. No real-time collaboration described. I did not open the Share dialog.
- Licence: pxt is MIT [S13]. pxt-microbit shows NOASSERTION in the GitHub API, but its LICENSE.txt in the repo contains the MIT text ("PXT - Programming Experience Toolkit, The MIT License, Copyright Microsoft Corporation"), checked in fact-check [S13]. The repo also has THIRD-PARTY-NOTICES.txt, and Microsoft/micro:bit logos, names and art are separate from code licence (HYPOTHESIS, not checked), so check before reuse.

### 4.4 iynk (https://iynk.tech, public site, read-only)

- Task 1 partial. Lesson 2 "Blink an LED" has a breadboard view with a fixed LED and 220 ohm resistor. The Parameters tab has resistor (220 ohm, 1 kohm, 10 kohm) and LED colour buttons (BENCH/iynk_blink.png and page text). I did not draw a circuit, because I found no control for it. Matches the stated gap: users open catalogue items and lessons.
- Task 2 TESTED. Replaced the sketch, pressed Run, got "Compiling / Uploading to Arduino Uno R3 / Done uploading" and serial lines with virtual-clock timestamps (`0.000on`, `0.250off` ...). My first attempt appended text and the tool showed "setup() is defined twice / C++ overloading is not simulated: give the functions different names" at line 13 (BENCH/iynk_buildreal.png). A useful error.
- Task 3 TESTED. Lesson 6 "Sense light" has an Inputs tab "Light on the sensor, 50 lux" slider. Set to minimum, serial read `0 lux 400` style output and D9 went HIGH, consistent with the lesson code ("too dark: light the LED") (BENCH/iynk_light_dark.png).
- Task 4 TESTED. Break it tab lists 16 triggers on the Uno blink lesson, grouped as LED with no resistor (Overcurrent), LED in backwards, then "More faults on this board": reverse polarity, brown-out, wrong voltage, cold solder joint, missing part, part in backwards, short circuit (5V to GND, 3V3 to GND). Triggering "LED with no resistor" showed "LED1: burnt out" and a panel: what you see, why (about (5-2) V / 26 ohm = 115 mA, past the 20 mA LED limit and the 40 mA pin limit), fix, and a Repair button (BENCH/iynk_fault0.png). Wrong-polarity adapter: "Nothing at all: the ON LED stays dark" with the diode explanation (BENCH/iynk_fault2.png). This is the clearest result in the benchmark. The "why" arithmetic is the page's own, not checked by me.
- Task 5 TESTED absence. No "create part" or "new project" control found in the lesson, Lab tools (Partner, Together, Build it for real, Passport) or settings.
- Task 6. Site text: "Progress and settings are saved in this browser's local storage", no accounts [S14] (confirmed). No export of the user's work found.
- Task 7. Together tab exists ("Start a room", "Room code or invite link"). Not tested, because creating a room is not read-only.
- Task 8. No breakpoint, logic analyser or variable view found. Keyword scan of the lesson page for "breakpoint", "logic analy", "variable" returned false. Serial monitor and Checks (4/4) exist.
- Task 9 partial. "Build it for real" tab: a parts list (Arduino Uno R3, USB cable, breadboard, jumper wires, LEDs, resistors), a "Check prices again" button and a "Cheapest total" line. In my run it showed the rate-limit warning, "No listing found" for each part, and `$0.00` with "6 parts have no price yet". So the price feature did not work during my one visit. Whether it works normally: UNKNOWN. The tab also describes a "Proof of Build" devnet credential, "Pass the checks here and the server re-runs your run before it writes a credential to Solana devnet. You pay nothing."

## 5. Tools not tested (account or install required)

| Product | Status | What documentation says |
|---|---|---|
| Tinkercad Circuits | not tested (account required) | EXTERNAL via search summaries, not first-party page text (the help-center pages loaded as titles only, again in fact-check). Fact-check search snippets from tinkercad.com support: "Invite people" produces a link, and collaborators have every privilege of the designer including editing or deleting [S15]. Tinkercad also has a blog post titled "Live Collaboration and Sharing!" and a help page "Sharing designs and collaborating" whose text did not load, so whether Circuits supports real-time co-editing is UNKNOWN [S23]. Other claims: breakpoints and variable values in the Arduino debugger [S15]; designs private by default, invite-link collaboration where collaborators get full edit rights [S15]; LED with too much current overheats and "exploded" in a Tinkercad workshop deck [S16]; export as PNG or EAGLE/Fusion 360 board file via "Send to", no BOM export found [S17]. All UNVERIFIED by me. |
| Arduino Cloud | not tested (account required) | As of 2026-10-26, $ (no currency code on page; confirmed in fact-check): Free (2 Things, 25 compilations a day, 1 user), Maker $72/year (25 Things, unlimited compilations), Team $1000/year (100 Things, 50 users), School $20 per member per year, Enterprise by quote, and a Prototyping offer $240 per 6 months [S18]. It is an IoT dashboard and compile service, not a circuit simulator, per the plan table (HYPOTHESIS for the category). |
| Proteus | not tested (install required) | Labcenter page (confirmed in fact-check): source-level breakpoints and stepping, watch window, logic analyser, netlist for PCB layout; Arduino co-simulation is only linked, not explained [S19]; protocol analysers not re-checked. Price: not published on the page I could read, "price list" and "quotation" only. UNKNOWN. |
| Multisim | not tested (install required) | NI page shows no price ("Loading Pricing", contact sales). A Wikipedia table lists old figures (Education $628), undated; do not use. CORRECTED in fact-check: an official end-of-life letter hosted by Digilent says Multisim Live would reach end of life on 2026-09-15 and that saved designs are not guaranteed afterwards; NI points users to the NI Circuit Design Suite (desktop) [S24] (EXTERNAL via search summary; the page itself returned HTTP 403 to fetch). Whether the shutdown happened on schedule is UNKNOWN. Multisim price: UNKNOWN [S20]. |

## 6. What this means for iynk

Evidence-limited, so each point says what it rests on.

**Task 1, create a simple LED circuit.** Wokwi and Falstad both let a stranger build one in under ten minutes (ESTIMATED) with no account. iynk does not, because it is a lesson viewer. This is the gap the founders named, and it is confirmed (TESTED). The comparison points to a design choice: Wokwi stores circuits as `diagram.json` (parts, connections, positions) and Falstad as exportable text. Both are plain text a program or an AI can write. HYPOTHESIS: if iynk adopts a plain, versioned circuit file, then export, share, an AI lab partner that proposes a circuit, and MCP tools all fall out of the same format. This is a design inference, not something the sources state.

**Task 4, wiring failures.** This is where iynk is ahead on everything I tested. Wokwi and Falstad showed no message for a no-resistor LED or a 5V-to-GND short in my runs. MakeCode has no wiring. iynk names 16 faults, shows the burnt part, explains the numbers and offers Repair (TESTED). The positioning claim that survives scrutiny: "the only free browser tool in this test that explains why a wiring mistake breaks things". Caveats: I tested three competitors, not Tinkercad (UNKNOWN beyond the workshop deck), and my Wokwi evidence is one still frame per case plus page text. Before putting this on a slide, repeat it by hand on Wokwi, and check Tinkercad with an account.

**Task 5, custom components.** iynk has nothing. Wokwi has a beta chip API for programmers; Falstad has subcircuits (menu only seen). Nobody in the free, no-login set made this easy for a beginner, as far as I tested. This looks like open ground, but I did not run either feature, so "easy for nobody" is a HYPOTHESIS. A realistic first step for iynk is a part defined by a small data file (pins, a few electrical rules, a picture) rather than a code API.

**Task 9, simulation to physical.** MakeCode is the only product here that completes the loop on a real board (a .hex that you copy to the board, or WebUSB). Wokwi gives a project ZIP and, with VS Code or CI, firmware and ELF paths. iynk has a bill-of-parts with live prices, which none of the three had, but my one test showed it failing under a rate limit and giving $0.00. EXTERNAL data also shows that wiring and BOM handoff are thin in the free tools (Tinkercad exports an EAGLE file, no BOM found; Wokwi no BOM found). Positioning candidate: "from simulation to a shopping list and a wiring sheet". The price feature must work reliably first, and its dependence on a paid search API (SerpApi, per the brief) is a cost question for the finance council member, not settled here.

**Task 8, debugging.** iynk has none of breakpoints, variable view or logic analyser. MakeCode (free, no login) has debug mode with variables and stepping, and Wokwi has a beta AVR debugger and a logic analyser. If iynk's mission is "anywhere, anyone", this is not where to compete first; the virtual-clock serial timestamps are a cheap, existing aid.

**Task 7, collaboration.** Neither Wokwi (UNKNOWN) nor MakeCode (copy only) shows real-time co-editing in what I could verify. iynk's rooms over a WebSocket relay are therefore a possible difference, but I did not test them, so this is a HYPOTHESIS until someone tests rooms in a staging environment.

**Other observations.**
- Time-to-first-result was shortest in MakeCode and iynk (no cloud build) and longest in Wokwi when the build queue was busy (queue number 24 seen once). iynk's in-browser compile is a real speed advantage for beginners on slow networks (TESTED one case; HYPOTHESIS on slow networks).
- Falstad, Wokwi and MakeCode all have an open, textual project format or a plain file download. iynk has none.
- Licence warning for anything we might reuse: Falstad is GPL-2.0; Wokwi's elements and simulator core avr8js are MIT; pxt is MIT; pxt-microbit has an MIT LICENSE.txt although GitHub reports NOASSERTION [S10, S11, S13].

## 7. Sources

All accessed 2026-10-26. "Describes" gives the date or version the page itself states, or "no date shown".

| ID | URL | Title | Publisher | Describes |
|---|---|---|---|---|
| S1 | https://wokwi.com/projects/new/arduino-uno | New Arduino Uno Project - Wokwi Simulator (the live app; queue text seen in BENCH/wokwi_ok_run.png) | Wokwi | live app on 2026-10-26 |
| S2 | https://docs.wokwi.com/guides/logic-analyzer | Logic Analyzer Guide | Wokwi docs | footer timestamp claim UNCONFIRMED in fact-check; same URL as S6 |
| S3 | https://docs.wokwi.com/chips-api/getting-started | Custom Chips API | Wokwi docs | beta, no version |
| S4 | https://wokwi.com/pricing | Wokwi pricing | Wokwi | as of 2026-10-26, EUR, annual billing |
| S5 | https://docs.wokwi.com/guides/debugger | Interactive debugger | Wokwi docs | beta, no version |
| S6 | https://docs.wokwi.com/guides/logic-analyzer | Logic Analyzer Guide | Wokwi docs | confirmed: 8 digital channels D0-D7, 1 GHz, wokwi-logic.vcd on stop, PulseView or GTKWave |
| S7 | https://docs.wokwi.com/gdb-debugging | GDB Debugging (Advanced) | Wokwi docs | no date shown (seen through search summary) |
| S8 | https://docs.wokwi.com/vscode/project-config | Configuring Your Project (wokwi.toml) | Wokwi docs | no date shown (seen through search summary) |
| S9 | https://makecode.microbit.org/share | Sharing projects | Microsoft MakeCode | editor v9.0.12 era, no date on page |
| S10 | https://github.com/wokwi/wokwi-elements ; https://github.com/wokwi/avr8js ; https://github.com/wokwi/wokwi-docs | Wokwi repositories | GitHub | licence MIT (SPDX) via GitHub API, pushed 2026-10-25, 2026-08-31, 2026-10-26 |
| S11 | https://github.com/sharpie7/circuitjs1 | circuitjs1 | GitHub (Paul Falstad / Iain Sharp) | GPL-2.0 (SPDX), last push 2024-01-22 |
| S12 | https://makecode.microbit.org/device/usb | Transfer to a micro:bit over USB | Microsoft MakeCode | no date shown |
| S13 | https://github.com/microsoft/pxt ; https://github.com/microsoft/pxt-microbit | pxt, pxt-microbit | GitHub | pxt MIT; pxt-microbit NOASSERTION; pushed 2026-10-26 and 2026-10-25 |
| S14 | https://iynk.tech/en/about | About iynk | iynk | live site 2026-10-26 |
| S15 | https://www.tinkercad.com/blog/how-to-collaborate-in-tinkercad ; https://www.tinkercad.com/help-center/circuits | TinkerTips: How to Collaborate; Circuits in Help Center | Autodesk Tinkercad | pages loaded as titles only; claims taken from search summaries, UNVERIFIED |
| S16 | https://www.teachengineering.org/content/cub_/activities/cub-2827-tinkercad/cub-2827-tinkercad-circuits-workshop-presentation.pdf | Tinkercad Circuits workshop presentation | TeachEngineering | no date shown, search summary only |
| S17 | https://www.digikey.com/en/maker/tutorials/2022/getting-started-with-tinkercad-circuits | Getting Started with Tinkercad Circuits | Digi-Key | 2022 |
| S18 | https://cloud.arduino.cc/plans/ | Arduino Cloud plans | Arduino | as of 2026-10-26, USD sign only |
| S19 | https://www.labcenter.com/simulation/ | Proteus VSM simulation | Labcenter Electronics | no date shown |
| S20 | https://www.ni.com/fi-fi/shop/product/multisim.html | NI Multisim | NI | no price shown; Wikipedia and a blog seen via search, not relied on |
| S21 | https://docs.wokwi.com/faq | Frequently Asked Questions | Wokwi docs | fetched 2026-10-26, no date shown |
| S22 | https://docs.wokwi.com/wokwi-ci/mcp-support | Model Context Protocol (MCP) support | Wokwi docs | experimental MCP server in Wokwi CLI, no date shown |
| S23 | https://www.tinkercad.com/blog/tinkertip-new-beta-feature-live-collaboration-and-sharing ; https://www.tinkercad.com/help-center/sharing-designs-and-collaborating | Live Collaboration and Sharing!; Sharing designs and collaborating | Autodesk Tinkercad | titles only, text did not load |
| S24 | https://support.digilent.com/hc/en-us/articles/41178584173979-Multisim-Live-EOL-Letter | Multisim Live EOL Letter | Digilent (for NI) | EOL 2026-09-15; seen via search summary, fetch returned HTTP 403 |

Local evidence (TESTED): screenshots and scripts under `BENCH/`, including `wokwi_*.png`, `falstad_*.png`, `mc_*.png`, `iynk_*.png`, `mc_project.hex`, and scripts `wokwi7.mjs`, `falstad3.mjs`, `mc5.mjs`, `iynk5.mjs`, `iynk7.mjs`, `iynk9.mjs`.

## Fact-check log (2026-10-26)

Checker re-opened sources on 2026-10-26/27 with WebFetch, WebSearch, the GitHub API and curl. Verdicts: confirmed, corrected, unconfirmed. Tested-in-browser claims (BENCH screenshots) were not rerun; only claims resting on external sources were checked.

| # | Claim | Verdict | Source and note |
|---|---|---|---|
| 1 | Wokwi plan prices EUR 0 / 5.6 / 8.1 / 20 per seat, annual billing | confirmed, detail added (build minutes) | [S4] |
| 2 | Community is public projects only | confirmed | [S4] |
| 3 | Wokwi queue text "Log in for one free skip a day" | unconfirmed (fetch shows no queue text; screenshot TESTED stands) | [S1] |
| 4 | Wokwi save without account: UNKNOWN | corrected: signed-out saves are tied to the browser | [S21] |
| 5 | Wokwi debugger beta, AVR only, breakpoints/variables/call stack | confirmed | [S5] |
| 6 | Logic analyser 8 channels, 1 GHz, wokwi-logic.vcd | confirmed | [S6] |
| 7 | Wokwi footer build timestamp 2026-10-26 | unconfirmed | [S2] |
| 8 | Wokwi custom chips API beta, C/WASM/Verilog experimental, no plan stated | confirmed | [S3] |
| 9 | Wokwi VS Code firmware/elf, no local compile | confirmed (scope note added) | [S8] |
| 10 | Wokwi GDB route via VS Code | unconfirmed for S7 page; S5 supports the gist | [S7], [S5] |
| 11 | Wokwi co-editing UNKNOWN | confirmed UNKNOWN; added missing finding: experimental MCP server in Wokwi CLI | [S21], [S22] |
| 12 | Licences: wokwi-elements, avr8js, wokwi-docs MIT; circuitjs1 GPL-2.0, pushed 2024-01-22; pxt MIT | confirmed via GitHub API | [S10], [S11], [S13] |
| 13 | pxt-microbit licence unclear (NOASSERTION) | corrected: LICENSE.txt is MIT text; GitHub API still says NOASSERTION; assets/branding unchecked | [S13] |
| 14 | MakeCode share: no account for anonymous link, persistent needs sign-in, no read-only, copies | confirmed | [S9] |
| 15 | MakeCode WebUSB or copy .hex | confirmed | [S12] |
| 16 | MakeCode v9.0.12 | unconfirmed (not shown to fetch) | [S9] |
| 17 | Arduino Cloud Free/Maker/Team/School prices and limits | confirmed, more plans added | [S18] |
| 18 | Proteus breakpoints, watch, logic analyser, PCB netlist; no price | confirmed; Arduino co-simulation only linked, softened | [S19] |
| 19 | Multisim Live shutdown "blog claim, unconfirmed" | corrected: official Digilent EOL letter, date 2026-09-15 (via search summary; fetch 403); actual shutdown UNKNOWN | [S24] |
| 20 | Tinkercad invite-link collaboration, full edit rights | partly confirmed via search snippets of tinkercad.com; live co-editing for Circuits UNKNOWN (pages did not load) | [S15], [S23] |
| 21 | iynk stores progress in local storage, no accounts | confirmed; added anonymous usage counts tied to a random browser ID | [S14] |

Counts: 21 claims checked, 9 not plain-confirmed (corrected 5: #4, #13, #19, #11 addition, #21 addition; unconfirmed 5: #3, #7, #10, #16, plus #20 partly). Unreachable: Digilent EOL page (HTTP 403), Tinkercad blog/help pages (title only), Wokwi GDB page (not opened).
