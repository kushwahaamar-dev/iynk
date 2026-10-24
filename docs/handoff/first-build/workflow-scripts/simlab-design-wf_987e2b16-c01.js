export const meta = {
  name: 'simlab-design',
  description: 'Ground the SimLab rebuild (Next 16 primer, coverage checklist, interpreter + flight spikes), write the architecture/plan/decisions, cross-check them with four critics, revise',
  phases: [
    { title: 'Ground', detail: 'Next 16 primer, master coverage checklist (2 halves), interpreter spike, flight-render spike' },
    { title: 'Architect', detail: 'ARCHITECTURE.md, PLAN.md, DECISIONS.md' },
    { title: 'Critique', detail: 'coverage, feasibility, plan, accuracy' },
    { title: 'Revise', detail: 'apply every critique, record resolutions' },
  ],
}

const R = args.root
const S = args.scratch

const CONTEXT = `PROJECT: SimLab at ${R} (Next.js 16.4.3 App Router, React 19.3, Tailwind v4, TypeScript). It is its own local git repo (branch main). Do NOT touch the parent git repo at /Users/amar/Codes. Read ${R}/AGENTS.md first: this Next.js has breaking changes versus what you know, so read the relevant guide in ${R}/node_modules/next/dist/docs before relying on any Next API.

THE BRIEF (the spec): ${R}/docs/SPEC.md. It holds the user's brief verbatim, their own instruction ("A lot of things are wrong here. See everything, cross-reference, cross-check everything, go on a long run. Make sure it is what I want.") and interpretation notes. Read it in full.

RESEARCH (long files: read with offset/limit in chunks; read what your task needs, and read fully where your task says so):
- ${R}/docs/research/learn-arduino.md : Learn Arduino (16 lessons, per-lesson simulations and constants, UI, i18n, shortcuts)
- ${R}/docs/research/robotics-bench-a.md : Robotics Bench engine (defineBoard, build flow, faults, sound, quiz) + Fig 01-06
- ${R}/docs/research/robotics-bench-b.md : Robotics Bench Fig 07-13 + practice tasks
- ${R}/docs/research/drone-lab-a.md : Drone Lab engine, flying range + FPV/OSD, Fig 01-04, Appendix A golden calc table
- ${R}/docs/research/drone-lab-b.md and drone-lab-b-calc-matrix.md : Fig 05-13, golden calc matrix
- ${R}/docs/research/colorfigures-guide.md : core.js API, embedded mode + postMessage bridge (tested), engine pattern for SimLab (sections 3.3-3.5), verification recipe, top-25 pitfalls; Appendices A-E hold tested cfshoot.py, cfbuild.py, embed.js and host code
- ${R}/docs/research/current-simlab-audit.md : audit of the current SimLab code. It may not exist yet; if it is missing, inspect ${R}/src and ${R}/figures yourself for what you need.
ORIGINAL SOURCES (downloaded copies, verified identical to the live sites; the live drone site now blocks headless browsers): ${S}/orig/robotics/*.js, ${S}/orig/drone/*.js, ${S}/orig/arduino/*.js
COLORFIGURES SKILL: ~/.claude/skills/colorfigures (SKILL.md, README.md, assets/core.js, scripts/build.py, assets/examples/*.html)
SCRATCH: ${S}. Put throwaway files only in your own subfolder of it (named in your task). Never write into the repo except the files your task names.
TOOLS: Python Playwright works (from playwright.async_api import async_playwright; p.chromium.launch()). Google Chrome is not installed and Brave headless hangs, so do not use them. Run Python with -I. WebSearch and WebFetch are available through ToolSearch for fact checks.`

const SEEDS = `SEED DECISIONS from the orchestrator. Adopt them unless you find strong evidence against one; any change goes into DECISIONS.md with the evidence.
S1 One Next.js 16 App Router app in this repo, deployed to Vercel. Keep cacheComponents + partialPrefetching in next.config.ts unless the primer shows they block something.
S2 Figures use the Colorfigures skill core, vendored into figures/vendor/colorfigures with documented patches. One HTML page per figure, built into public/figures by a builder (colorfigures-guide Appendix B) and embedded in the host by iframe with the tested hello/ready postMessage bridge (guide 2.3, Appendices C and D). Lessons, quizzes, the code editor, the serial monitor, logs and translations live in the React host, not inside figures.
S3 Two shared figure engines, reimplemented from the originals' patterns (not copied): a Board Bench engine (every board and robotics module, breadboard, build flow, faults, see-through, exploded view) and a Drone engine (frames, pieces, build, tests, wiring). Part ids, pins, nets and modes have one source of truth: data files the host imports and the builder inlines.
S4 Schematic, breadboard and wiring views must look like Colorfigures (hand-ink filter, wobble, paper grain, the five palettes). They are generated from the same nets data, clickable, and synced with the 3D figure (selection, live pin values, current flow). The breadboard is a real iso scene. Schematic and wiring sheets are flat hand-inked sheets; decide where they render, but the look must match.
S5 Editable code that really runs:
  - an Arduino C++ subset interpreter with correct per-target int widths (16-bit int on AVR, 32-bit on ARM and ESP)
  - a MicroPython/Python subset for Pico, micro:bit and Pi (with gpiozero and ROS 2 rclpy shims)
  - a Verilog subset simulator for Basys 3 and DE10-Lite, with parameter overrides for simulation speed as testbenches do
  All three run on a deterministic virtual clock, with non-blocking delay, interrupts and millis(). World models (sensors, actuators, Learn Arduino's physics models) drive the inputs, and a run updates the 3D figure.
S6 Every defect in the originals listed in the research docs is fixed, not copied. Firmware snippets (Betaflight, ArduPilot, INAV, cflib, ROS 2) are corrected to current, real syntax. The drone design calculator stays identical to the originals' golden tables, which become unit tests, and the flight physics must agree with it.
S7 Every designed failure must be reachable from the UI:
  - add "leave out / remove a part", including single SMD parts
  - make on-board controls work (RESET, BOOT, BOOTSEL, slide switches, buttons A/B)
  - add the brief's failures (reverse polarity, brown-out, wrong voltage, cold solder) on every board
S8 Languages: the 13 that Learn Arduino ships (en, es, pt, fr, de, it, tr, id, zh-Hans, ja, ko, hi, he with RTL). The brief's six (en, es, fr, de, zh, hi) are the must-haves and come first. Use localised routes (/[lang]/...) with a redirect from / based on the saved or browser language, if Next 16 supports this cleanly with cacheComponents (the primer decides).
S9 Progress lives in localStorage, versioned: lesson completion, quiz answers, build and test results, best laps per course, and settings (theme, language, sound, labels, reduce motion). The home dashboard shows progress across the three labs.
S10 Sound is synthesised: a lofi loop, named effects and motor hum. It runs at host level so music survives navigation, and figures emit sfx events. The Effects and Lofi toggles are persisted. No analytics or tracking beacons.
S11 The flight simulator is a separate range component or page in the Colorfigures ink look:
  - an iso chase view, plus FPV with an OSD
  - per-craft courses and missions from the originals, fixed: visible gates, reachable checkpoints, a correct horizon
  - keyboard controls (WASD/arrows, Space to arm, V for FPV, R to reset) and on-screen sticks
  - the Gamepad API, so a USB RC transmitter works
S12 Board Lab Uno R3 = Learn Arduino's 16 lessons (same circuits, parameters and world models; editable code) plus the Robotics Bench build sequence. Every other board gets at least 4 progressive lessons (Blink/I/O, button + sensor, PWM/analog, one protocol or Wi-Fi), with breadboard + schematic, a serial monitor, failure modes and an assembly/power-up sequence. Variant boards (Uno R4 Minima/WiFi, Pico/Pico W/Pico 2/Pico 2 W, Pi 4/Pi 5) are one figure with a variant switch where the layouts allow, otherwise separate figures.
S13 Board picks where the brief offers a choice: STM32 Nucleo-F401RE; Terasic DE10-Lite (MAX 10); ESP32-S3-DevKitC-1 v1.1 (RGB LED on GPIO38; note that v1.0 uses GPIO48); micro:bit V2. Verify these facts.
S14 Robotics Lab = the 13 Robotics Bench figures (the Uno R3 is the shared Board Lab figure), plus:
  - practice tasks as real, checkable exercises: reaction timer with interrupt + debounce + millis; closed-loop line follower with tunable Kp/Kd; simple arm via PCA9685; more from the originals' practice paragraphs
  - a quiz after each major step
  - live status, serial and current draw
S15 Drone Lab = the original 13 crafts with all their modes, tests, ranges and missions, fixed, and with corrected CLI/params.
S16 Testing: Vitest for interpreters, calculators, physics and data integrity; Playwright for e2e and figure screenshots (cfshoot: 7 angles closed + see-through, press runs, phone); axe for accessibility; tsc and eslint clean.
S17 Keep the work parallelisable: each implementation work package owns a disjoint set of files.
S18 Get one complete vertical slice working and verified before scaling out. The slice: Uno R3 Blink running editable code in the interpreter, driving the figure through the bridge, with serial, schematic + breadboard, build sequence, progress and two languages; plus the 5-inch drone with calc, build, tests, wiring and a flyable range.`

const GROUND_SCHEMA = {
  type: 'object',
  properties: {
    doc_path: { type: 'string' },
    summary: { type: 'string', description: 'what the doc establishes, 5-15 lines' },
    key_decisions: { type: 'array', items: { type: 'string' } },
    open_risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['doc_path', 'summary', 'key_decisions', 'open_risks'],
}

phase('Ground')

const PRIMER = `${CONTEXT}

YOUR TASK: write ${R}/docs/research/nextjs16-primer.md, a verified primer of the Next.js 16.4.3 patterns this app needs. Every snippet in it must be one you compiled and ran.

1. List ${R}/node_modules/next/dist/docs and read every guide this app touches: App Router file conventions, layouts and pages, dynamic segments and generateStaticParams/dynamicParams, async params and searchParams, cacheComponents (what needs Suspense, 'use cache', what errors at build), partialPrefetching, preserving UI state and Activity, proxy.ts (the renamed middleware), the internationalization guide, metadata (generateMetadata, alternates/hreflang, OG images), next/font, public/ static files, headers() in next.config, Turbopack config, ESLint, building and deploying (Vercel), the testing guides (Vitest, Playwright), and the upgrading guide's breaking-change list.
2. Build a scratch app in ${S}/next-primer. Copy the repo's package.json, next.config.ts, tsconfig.json, eslint.config.mjs, postcss config if any, and src/app/globals.css. Symlink node_modules to ${R}/node_modules; if Turbopack refuses the symlink, copy what it needs or set the root as the docs say. Prove each pattern with next build and next start (pick ports above 3400):
   (a) a [lang] segment with generateStaticParams for 13 locales, plus nested dynamic segments such as /[lang]/boards/[board]/[lesson] and /[lang]/drones/[craft]/fly, all statically generated;
   (b) a redirect from / to the saved or browser language. Find the approach that works with cacheComponents: proxy.ts, a tiny client redirect page, or another documented way. Report which works and its cost;
   (c) a per-language root layout with <html lang dir> (he = rtl) and no hydration warnings;
   (d) client components that read localStorage (progress, theme) without hydration mismatch under cacheComponents. Pin down the exact pattern, such as useSyncExternalStore with a server snapshot, and where Suspense is required;
   (e) Activity route preservation. With Playwright, measure what happens to an iframe on a page you navigate away from and back to: does it stay mounted, keep its document, keep running timers or rAF, re-run effects? What should the host do (pause messages, re-handshake)?
   (f) loading a per-language dictionary on the server and passing only that language to client components;
   (g) generateMetadata with alternates.languages (hreflang) per page;
   (h) static HTML in public/figures served next to the app; headers() for /figures/* (cache-control, no X-Frame-Options DENY); how dev and build treat those files;
   (i) Vitest working with this TS/ESM setup (install in the scratch app only; report exact versions), and the Playwright test runner config;
   (j) build time and output for about 2000 static pages: 13 languages x ~150 dummy pages. Measure it and say whether the real app should prerender every language or only some.
   (k) any other gotcha you hit: async params typing (PageProps/LayoutProps global helpers), cookies/headers under cacheComponents, next/font with many scripts (CJK, Devanagari, Hebrew fonts), anything else.
3. Write the primer: for each topic, the verified snippet, what failed and why, and a short "rules for SimLab implementers" list at the top.

Do not modify the repo except writing the primer file.`

const CHECK_COMMON = `The master checklist is a requirements traceability list that every later phase will verify against, so it must be complete, atomic and testable. Every item has:
- id: the prefix given below, then a 3-digit number
- statement: one testable sentence, saying what SimLab must do or must not do
- source: file plus section heading or line numbers; list every source when items merge
- priority: must or should. Brief items and original features are must; nice-to-haves are should.
- verify: one of unit / e2e / screenshot / review
Use one markdown table per area, with a count summary at the top.
- Keep the originals' exact teaching messages, constants and timings as requirements only where SimLab should keep them.
- For every defect the research lists in an original, write a must-not item ("must not copy: ...") together with the corrected behaviour.
- For every accuracy correction, write the correct fact as a requirement.
- Do not invent features. If you notice something the brief needs but no source covers, list it in a final "gaps" section.`

const CHECK_A = `${CONTEXT}

YOUR TASK: write ${R}/docs/research/coverage-checklist-a.md, the first half of the master coverage checklist. It covers:
(1) every requirement in ${R}/docs/SPEC.md: global requirements, Board Lab, Robotics Lab, Drone Lab and execution order, split into atomic items with id prefix SPEC-;
(2) everything in learn-arduino.md (prefix LA-): every lesson's circuit, parameters, interactions, simulation constants and serial behaviour; the UI (sidebar, progress card, callouts, info card tabs, code card, serial monitor, lessons strip, inspector, schematic panel, flow overlay, viewbar, minimap, settings, shortcuts, loader, phone layout); i18n; persistence; accuracy corrections. Read the whole doc.
(3) everything in robotics-bench-a.md (prefix RBA-) and robotics-bench-b.md (prefix RBB-): the engine (build flow and every refusal message, faults, power evaluation, upload, exploded view, strip, status precedence, stats, serial, quiz, mastery, nav, sound/lofi/motor hum, labels, palettes, URL test hooks, mobile), every figure's parts, modes, stats, faults, quiz and practice task, every defect and accuracy note. Read both docs fully.
(4) if ${R}/docs/research/current-simlab-audit.md exists, its defects (prefix AUD-), as must-not items.
${CHECK_COMMON}
Expect several hundred items. Keep your own notes in ${S}/checklist-a if you need any.`

const CHECK_B = `${CONTEXT}

YOUR TASK: write ${R}/docs/research/coverage-checklist-b.md, the second half of the master coverage checklist. It covers:
(1) everything in drone-lab-a.md (prefix DLA-):
  - the engine: design calculator, build graph and polar mistakes, Build it for me, Take it apart, smoke stopper, motor direction, accelerometer calibration, plug/XT60 fault, arming rules, wiring diagram, lesson panels, stats, flight modes
  - multirotor physics and the battery model
  - take-off faults and desync
  - keyboard and touch sticks
  - range world, collisions, checkpoints, gates and laps
  - iso chase view, FPV renderer and OSD
  - sound, URL hooks, phone layout
  - every craft's options, parts, CLI, range and quiz
  - all 31 defects and every accuracy note
  Read it fully, including the Appendix A golden table, which becomes "calc must reproduce Appendix A exactly" plus the exact table location.
(2) everything in drone-lab-b.md (prefix DLB-): Fig 05-13, with every craft's calc, parts, tests, extra buttons, modes, autopilot state machines, ranges, missions, flight stats, visual details, firmware params (the corrected versions), defects and accuracy notes. Read it fully. Reference drone-lab-b-calc-matrix.md as golden data.
(3) colorfigures-guide.md (prefix CF-): the figure requirements that follow from the brief's "every figure must be" list combined with the guide: rotation, see-through, exploded, pressable parts, labels, phone behaviour, verification recipe, embedded-mode bridge contract, dark mode, localisation of figure strings, the top-25 pitfalls as must-not items, and the defects in Appendix E.
${CHECK_COMMON}
Expect several hundred items. Keep your own notes in ${S}/checklist-b if you need any.`

const INTERP = `${CONTEXT}

${SEEDS}

YOUR TASK: settle how SimLab runs learners' code, prove it with prototypes, and write ${R}/docs/research/interpreters.md. Work in ${S}/interp.

1. Requirements. Collect them from the brief and the research: every lesson sketch in learn-arduino.md, every mode or sketch in robotics-bench-a/b.md, and what each Board Lab board needs (Uno R3/R4, Nano, ESP32, ESP32-S3, NodeMCU, Pico family, Nucleo-F401RE, micro:bit V2, Pi 4/5, Basys 3, DE10-Lite).
   (a) Arduino C++ subset:
       - types including float/double/long/unsigned/byte/bool/char/String/uint8_t-style; arrays, const, #define, functions, globals, static, volatile
       - integer width and overflow per target
       - the Arduino API: millis, micros, delay, delayMicroseconds, pinMode, digitalRead/Write, analogRead/Write, tone, pulseIn, attachInterrupt, map, constrain, random, bit ops
       - Serial
       - the libraries the lessons need: Servo, Wire, SPI if needed, AccelStepper, Adafruit_PWMServoDriver, an SSD1306/U8g2-style OLED, NeoPixel or rgbLedWrite, ESP32 ledc, WiFi/WebServer for ESP32 and ESP8266, Arduino_LED_Matrix for R4 WiFi, QTRSensors, an MPU6050 library or raw Wire
   (b) A MicroPython/CPython subset:
       - machine (Pin, PWM, ADC, I2C, Timer), time, network for Pico W
       - the microbit module
       - gpiozero; rclpy with Node, publishers, timers and geometry_msgs Twist
       - f-strings, classes with super(), and the exceptions lessons need
   (c) A Verilog subset:
       - module ports, wire/reg, assign, always @(posedge clk) with nonblocking assignment, always @*
       - case, if, vectors, slicing, concatenation, replication, parameter/localparam and parameter overrides, counters
       - 7-segment and LED chaser designs for Basys 3 (100 MHz clk, 16 sw, 16 led, 5 btn, 4-digit 7-seg) and DE10-Lite (50 MHz, 10 sw, 10 led, 2 keys, 6 HEX displays)
2. Survey the existing options and judge each on correctness, bundle size, licence, maintenance, suspension support for delay/sleep, error-message quality and extensibility with custom hardware modules. Install candidates in ${S}/interp only and try them:
   - JSCPP and any other JS C/C++ interpreter
   - Skulpt, Brython, the MicroPython WebAssembly port (npm @micropython/micropython-webassembly-pyscript or similar), Pyodide
   - for Verilog: any JS or wasm simulator such as YoWASP/iverilog/verilator-wasm, and an own subset simulator
   - avr8js, noting that compiling would need avr-gcc on a server, which a static Vercel app cannot assume
3. Prototype the approach you recommend, enough to prove the hard parts. In particular: non-blocking delay on a virtual clock that the UI drives per frame, interrupts preempting loop(), 16-bit int overflow on AVR, friendly compile errors with line and column, an instruction budget so infinite loops cannot freeze the tab, and running one simulated second of Blink in well under a millisecond of wall time. Show it working on:
   - Learn Arduino's Blink, button (with debounce), knob (analogRead to analogWrite), TMP36 (float math) and servo sweep (Servo.h)
   - a reaction timer with attachInterrupt + millis
   - a MicroPython Pico blink and button, a micro:bit display + button program, and a gpiozero LED + Button program
   - an rclpy teleop publisher on a timer
   - a Verilog LED chaser with a parameter override and a switch-to-LED + 7-seg decoder
   Measure speed and the minified size of each interpreter.
4. Write interpreters.md:
   - the recommendation and the evidence (survey table, measurements)
   - the module layout under src/lib (e.g. src/lib/run/...), with TypeScript interfaces for: the runtime and its virtual clock and scheduler; the board World (pins with modes and levels, ADC, PWM duty/frequency, timers, interrupts, serial in/out, I2C/SPI device models, Wi-Fi/HTTP simulation, displays); peripherals and world models; how a run drives the figure (what is sent, at what rate); error objects
   - the supported subsets as precise lists, and the behaviour for unsupported features (a clear, friendly error naming the feature)
   - per-board target profiles: int width, ADC bits, PWM pins, logic voltage, LED pins (including active-low and RGB LEDs), pin aliases such as A0, LED_BUILTIN, D4 on NodeMCU and GP25
   - the test plan (Vitest; which golden programs)
   Keep the prototypes in ${S}/interp for the implementers to start from, and list their paths in the doc.`

const FLIGHT = `${CONTEXT}

${SEEDS}

YOUR TASK: settle how the flight simulator renders and runs, prove it with a prototype, and write ${R}/docs/research/flight-render.md. Work in ${S}/flight.

1. Read the flight sections of drone-lab-a.md fully (multirotor physics, battery model, input, range API, checkpoints/gates, iso chase view, FPV + OSD, phone layout, defects). Also read drone-lab-b.md's flight content: each craft's modes, autopilots, wing and VTOL physics, ranges and missions. Read the original range code at ${S}/orig/drone/04-.js and the lab engine's flight parts in ${S}/orig/drone/03-fig01-5-inch-freestyle-fpv-quad.js, but write your own code.
2. Prototype in ${S}/flight a standalone page, built with the skill's build.py or by inlining core.js, that renders a flight range in the Colorfigures ink look:
   - an iso chase view of a moving craft over a world of about 150-300 primitives (boxes, houses, trees, poles, gates, a pad)
   - an FPV perspective view with near-plane clipping, ground, hills, solids, gate rings and an OSD (volts, amps/mAh, timer, altitude, speed, mode, horizon with the correct pitch sign, arrow to the next target)
   Compare at least two rendering approaches. For example: SVG rebuilt every frame with the core's primitives (as the original), versus Canvas 2D drawing the same flat-band shading and ink outlines, versus a hybrid (iso in SVG, FPV in canvas). Measure the frame time with Playwright at 1x and with CPU throttling 4x/6x (CDP Emulation.setCPUThrottlingRate) at desktop and phone viewports, with and without the hand filter. Check the WebKit filter-region issue from the guide.
3. Prototype the input layer: keyboard (WASD/arrows, Space arm/disarm, V FPV, R reset), two on-screen touch sticks (throttle that does not spring back in manual modes) and the Gamepad API mapped to RC channels (with a calibration/mapping UI note). Also prototype a fixed-step physics loop (10 ms substeps, dt clamp) that keeps time right when the tab throttles.
4. Write flight-render.md:
   - the recommendation, with measurements and screenshots (save the shots in ${S}/shots/flight-spike)
   - the module layout, and whether the range is a separate static page in an iframe or a React client component
   - the API between host and range: the craft config from the calculator; mode, course and mission data; events back such as checkpoint, lap, crash, landed, battery, best lap
   - the physics module boundaries, shared by multirotor, wing, VTOL, tricopter and octo motor-out, so the physics can be unit-tested
   - how per-craft courses and missions are described as data
   - how to fix the original's flight defects: invisible gates, the unreachable TOWER TOP, hover never cutting out, weak wind, inverted OSD pitch, design change wiping the flight, the craft vanishing inside buildings
   - performance budgets, and phone and accessibility notes (keyboard-only play, reduced motion)
   Keep the prototype in ${S}/flight for implementers and list its paths.`

const ground = await parallel([
  () => agent(PRIMER, { label: 'ground:nextjs16-primer', phase: 'Ground', schema: GROUND_SCHEMA }),
  () => agent(CHECK_A, { label: 'ground:checklist-a', phase: 'Ground', schema: GROUND_SCHEMA }),
  () => agent(CHECK_B, { label: 'ground:checklist-b', phase: 'Ground', schema: GROUND_SCHEMA }),
  () => agent(INTERP, { label: 'ground:interpreters', phase: 'Ground', schema: GROUND_SCHEMA }),
  () => agent(FLIGHT, { label: 'ground:flight-render', phase: 'Ground', schema: GROUND_SCHEMA }),
])
const groundOk = ground.filter(Boolean)
log(`Ground: ${groundOk.length}/5 docs returned`)
const groundList = groundOk.map(g => `- ${g.doc_path}\n  ${g.summary.split('\n').join('\n  ')}\n  risks: ${g.open_risks.join(' | ')}`).join('\n')

phase('Architect')

const ARCH = `${CONTEXT}

${SEEDS}

GROUNDWORK DOCS written for you (read them fully):
${groundList}
(Also check ${R}/docs/research/ for nextjs16-primer.md, coverage-checklist-a.md, coverage-checklist-b.md, interpreters.md and flight-render.md even if they are missing from the list above.)

YOUR TASK: you are the architect of the SimLab rebuild. Write three documents in ${R}/docs: ARCHITECTURE.md, PLAN.md and DECISIONS.md. Implementation agents will work from them in parallel without talking to each other, so the contracts must be exact, and nothing from the brief or the research may be lost. Read SPEC.md, the colorfigures guide (fully), the groundwork docs (fully), both coverage checklists, and enough of the other research docs to design every feature. Look at the current code under ${R}/src and ${R}/figures to decide what to keep and what to delete.

ARCHITECTURE.md must cover:
1. The system overview (ASCII diagram) and the boundaries between modules.
2. The repo layout: every directory and its key files, plus the delete list for the current code (file by file, with what replaces it) and the keep list.
3. Routes: the full list with params, which are prerendered, layouts, and the locale strategy (from the primer).
4. The design system: tokens (the palette tomato/mustard/mint/cobalt/blush + monochrome, paper/ink, dark mode), typography (including CJK/Devanagari/Hebrew fallbacks), and the component inventory with props. Then navigation, the home dashboard and the shell.
5. The data model, as TypeScript types: boards, variants, lessons (code, params, world model, checks), quizzes, robotics modules, practice tasks, drones, design catalogues, build steps, tests, wiring, courses/missions, the progress schema (versioned, with migrations) and settings. Where content lives, and how translations are organised: dictionaries, lesson prose per language, code-comment translation as Learn Arduino does, and figure strings through CF_T.
6. The figure platform:
   - the vendored core and its patch list
   - the builder, and an enumerated list of every figure page
   - the engine APIs (Board Bench and Drone), with all fields
   - breadboard, schematic and wiring sheets: where they render, how they keep the Colorfigures look, and how they sync
   - see-through and exploded views, part removal, the faults registry and every fault per board
   - the embed bridge protocol: every message type and payload, and the handshake
   - how the host drives a figure from interpreter output (rates)
   - the per-figure "Colorfigures prompt" record that the README must list
7. Code execution: the interpreter modules and their APIs, from interpreters.md; world models; the serial monitor (status Stopped/Running/Uploading, input, baud); error display; the editor (syntax highlighting, editable, Run/Stop, reset to lesson code, param chips as in Learn Arduino).
8. The flight simulator, from flight-render.md.
9. Audio; progress; i18n, including RTL and how figures receive strings; theme (the dark-host paper-plate rule); accessibility (a keyboard map for every lab, ARIA patterns, focus management with iframes, a button for every pressable part); mobile layout; reduced motion.
10. Testing and verification gates, with exact commands; performance budgets (figure page kB, host JS kB, fps); deployment on Vercel; README contents (every Colorfigures prompt, deploy steps).

PLAN.md: phases following the brief's execution order, with a foundation and vertical-slice phase first (seed S18). Then Board Lab, Robotics Lab, Drone Lab, i18n + polish, verification and deploy. Each phase is a list of work packages, and each work package gives:
- id and title
- the files and directories it owns. These are disjoint across the work packages that run in parallel, and the plan says who may edit shared files such as the dictionaries and registries, and how merges are avoided (per-item files rather than one big file)
- inputs: the exact docs and sections to read
- outputs
- acceptance criteria that cite checklist ids
- test and verification commands
- rough size
- dependencies
Size each work package so one agent can finish it in one session (about 4000 lines of new code at most). After each phase, add a verification gate work package: figure screenshot review, adversarial accuracy review, e2e. Content work (per board, module and craft) must start each figure with a verified fact sheet (datasheet dimensions, part positions, pinout, voltages), with sources.

DECISIONS.md: every open question in the research docs (each one has an open_questions section), every seed decision, and every choice you make. For each: the decision, the rationale and the rejected alternatives.

Rules:
- Do not over-engineer, but meet every requirement.
- Prefer the tested code in the guide's appendices.
- Name concrete files, functions and types.
- Write only these three files.`

const ARCH_SCHEMA = {
  type: 'object',
  properties: {
    docs: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    phases: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, work_packages: { type: 'array', items: { type: 'string' } } }, required: ['name', 'work_packages'] } },
    unresolved: { type: 'array', items: { type: 'string' } },
  },
  required: ['docs', 'summary', 'phases', 'unresolved'],
}
const arch = await agent(ARCH, { label: 'architect', phase: 'Architect', schema: ARCH_SCHEMA })
log(`Architect: ${arch ? arch.phases.length + ' phases' : 'FAILED'}`)

phase('Critique')

const CRIT_COMMON = `${CONTEXT}

${SEEDS}

THE DESIGN under review: ${R}/docs/ARCHITECTURE.md, ${R}/docs/PLAN.md, ${R}/docs/DECISIONS.md. Read all three fully.

Write your critique to the file named below as a numbered list of findings. Each finding gives:
- severity: blocker / major / minor
- where: doc and section
- the problem
- the evidence: cite sources by file and line or section
- the exact fix you propose
Be adversarial: the job is to find what is wrong or missing, not to praise. Do not edit the design docs.`

const CRIT_SCHEMA = {
  type: 'object',
  properties: {
    doc_path: { type: 'string' },
    blockers: { type: 'integer' },
    majors: { type: 'integer' },
    minors: { type: 'integer' },
    top_findings: { type: 'array', items: { type: 'string' } },
  },
  required: ['doc_path', 'blockers', 'majors', 'minors', 'top_findings'],
}

const CRITICS = [
  { key: 'coverage', file: 'design-critique-coverage.md', task: `LENS: coverage. Walk ${R}/docs/research/coverage-checklist-a.md and coverage-checklist-b.md item by item. For every item, find where the design covers it: an ARCHITECTURE section and a PLAN work package whose acceptance criteria name the id. List every uncovered or only partly covered item, every contradiction with the brief, and every must-not that the design would violate. Also check each line of SPEC.md directly. Finish with a coverage table: area, items, covered, partial, missing.` },
  { key: 'feasibility', file: 'design-critique-feasibility.md', task: `LENS: technical feasibility and correctness. Check the Next.js 16 usage against nextjs16-primer.md and node_modules/next/dist/docs: routing, locale, cacheComponents/Activity, metadata, headers, build size and time. Check the figure platform against the colorfigures guide's tested contracts and its 25 pitfalls. Check the interpreter scope and APIs against interpreters.md. Check the flight design against flight-render.md measurements. Check performance budgets, bundle sizes, mobile and filter limits, iframe focus/keyboard/a11y, Vercel limits, and whether the tests and gates would really catch failures. Where a claim is doubtful, test it in ${S}/critique-feasibility.` },
  { key: 'plan', file: 'design-critique-plan.md', task: `LENS: plan quality. For every work package, check:
- truly disjoint file ownership among parallel packages, including shared registries, dictionaries, the progress schema and package.json
- dependency order
- precise inputs, outputs and acceptance criteria that cite checklist ids
- runnable verification commands
- a size that fits one agent session
- vertical slice first (seed S18), and phases in the brief's execution order
- a verification gate after every phase
- fact sheets with sources before every figure
- a README with every Colorfigures prompt
Simulate a parallel agent picking up two packages at random: could it start from the docs alone, without asking anything? List every ambiguity it would hit.` },
  { key: 'accuracy', file: 'design-critique-accuracy.md', task: `LENS: electronics and firmware accuracy. Check every hardware and firmware fact the design states or implies, using web sources (WebSearch/WebFetch via ToolSearch) and datasheets:
- board choices and their real specs: MCU, clock, flash/RAM, logic voltage, input voltage ranges, regulator limits, pin counts, PWM/ADC pins, LED pins and their polarity, USB-serial chips, dimensions. Covers Uno R3, Uno R4 Minima/WiFi, Nano, ESP32 DevKitC, ESP32-S3-DevKitC-1 v1.1, NodeMCU v2/v3, Pico/Pico W/Pico 2/Pico 2 W, Nucleo-F401RE, micro:bit V2, Pi 4/Pi 5, Basys 3, DE10-Lite
- lesson circuits: resistor values, logic-level issues (5 V sensors on 3.3 V boards), current limits
- module facts: TB6612FNG, L298N, A4988, PCA9685, MPU-6050, HC-SR04, QTR-8RC, LM2596
- firmware syntax: current Betaflight CLI, ArduPilot Copter/Plane/QuadPlane parameter names, INAV, cflib, ROS 2 (which distro is current LTS in October 2026)
- drone physics claims
List every wrong, unverified or ambiguous fact with the correct value and its source.` },
]

const crits = await parallel(CRITICS.map(c => () =>
  agent(`${CRIT_COMMON}\n\n${c.task}\n\nWrite your critique to ${R}/docs/review/${c.file} (create the folder if needed). Use ${S}/critique-${c.key} for scratch work.`,
    { label: `critic:${c.key}`, phase: 'Critique', schema: CRIT_SCHEMA })))
const critOk = crits.filter(Boolean)
log(`Critique: ${critOk.map(c => `${c.doc_path.split('/').pop()} B${c.blockers}/M${c.majors}/m${c.minors}`).join(', ')}`)

phase('Revise')

const REVISE = `${CONTEXT}

${SEEDS}

YOUR TASK: you are the architect, revising the SimLab design after review. The design: ${R}/docs/ARCHITECTURE.md, PLAN.md and DECISIONS.md. The critiques are in ${R}/docs/review/: design-critique-coverage.md, design-critique-feasibility.md, design-critique-plan.md and design-critique-accuracy.md. Read all of them fully, and re-read the design docs before editing.

For every finding, either fix the design or reject the finding with a concrete reason (evidence, not opinion). Blockers and majors must be resolved. Edit the three design docs in place, so they end up complete and self-consistent, as if written in one go: no "changed after review" notes inside them. Then write ${R}/docs/review/design-resolution.md, a table of every finding id with its resolution (fixed: where; or rejected: why). Finally, re-check that PLAN.md's work packages still have disjoint ownership and cite checklist ids, and that every SPEC.md line maps to a work package.`

const REV_SCHEMA = {
  type: 'object',
  properties: {
    fixed: { type: 'integer' },
    rejected: { type: 'integer' },
    summary: { type: 'string' },
    phases: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, work_packages: { type: 'array', items: { type: 'string' } } }, required: ['name', 'work_packages'] } },
    remaining_risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['fixed', 'rejected', 'summary', 'phases', 'remaining_risks'],
}
const rev = await agent(REVISE, { label: 'architect:revise', phase: 'Revise', schema: REV_SCHEMA })

return { ground: groundOk, arch, crits: critOk, rev }
