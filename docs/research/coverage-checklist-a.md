# iynk coverage checklist, part A: the brief, Learn Arduino, Robotics Bench and the current build

This is the first half of iynk's master coverage checklist: one row for every requirement, behaviour, value,
message, defect fix and accuracy correction that the brief, the Learn Arduino and Robotics Bench research and the
audit of the current build found. Every later phase checks its work against these rows. An item counts as covered
only when its verify method has passed.

Part B (`coverage-checklist-b.md`) covers the Drone Lab research and the Colorfigures research (prefixes DLA, DLB
and CF). This part covers:

- **SPEC**: every requirement in `docs/SPEC.md`, split into atomic rows: the global requirements, the visual engine,
  the three baselines, the Board Lab, the Robotics Lab, the Drone Lab at the brief's level, the execution order, the
  user's instruction and the interpretation notes. The Drone Lab's detail is in part B.
- **LA**: everything in `learn-arduino.md`: the page shell and loader, the sidebar, progress card and clock, the
  stage overlays (callouts, tags, wire chips, readouts, tooltip, minimap, viewbar, hint), the info card and its
  tabs, the code card and serial monitor, the lessons strip, settings, shortcuts and the phone layout; all 16
  lessons (circuit, wiring, specifications, parameters, interactions, simulation constants, serial output, callouts,
  schematic); the simulator, the schematic panel and current flow; the visual design, camera and motion; the
  languages (the original's 13, cut to the six of decision D1); persistence and progress; the accuracy facts and the 12 errors to fix; and the failure modes the
  original lacks but the brief requires.
- **RBA**: everything in `robotics-bench-a.md`: the page shell, navigation and phone layout; the bench engine (board
  definition, part kinds, the build flow and every refusal message, the state machine, faults, power evaluation,
  upload, exploded view, strip, status precedence, stats, terminal, selection, labels, wobble and palettes, the
  lesson panel, quiz and mastery, URL hooks); sound (effects, lofi, motor hum); Figs 01-06 (parts, mat, modes,
  code, serial, stats, faults, quiz, practice task, lesson text, accuracy notes); the 20 defects and the rebuild
  notes.
- **RBB**: everything in `robotics-bench-b.md`: what Figs 07-13 add to the shared engine; each figure's identity,
  real-world model, parts, mat, signal or electrical model, modes, code, serial output, stats, pills, failure
  modes, build, lesson text, quiz, practice task and accuracy notes; the practice tasks across the site; and the 11
  quirks and bugs.
- **AUD**: every defect in `current-iynk-audit.md` (all 173 defect ids, P-01 to HY-05), and the build, crawl,
  interaction, coverage-matrix, figure-fidelity and gap-list findings that no defect id already covers.

The brief's global items (languages, accessibility, the home dashboard, deploy and the README of Colorfigures
prompts) live in this part. Part B repeats them only where they bind a figure or the Drone Lab.

## How to read a row

- **id**: prefix plus a three-digit number, numbered in table order within each prefix.
- **statement**: one testable sentence saying what iynk must or must not do. Text in quotes (labels, toasts,
  refusal messages, serial lines, code lines and comments, quiz questions and answers) and the numbers given
  (constants, timings, colours, sizes, byte counts) are kept exactly, unless `docs/DECISIONS.md` records a
  correction. Braces mark a live value: `{mode}`, `{cm}`, `{pos}`.
  - "must not copy: …" marks a defect in an original site (Learn Arduino or the Robotics Bench). The rest of the
    sentence gives the corrected behaviour.
  - "must not: …" marks a defect in the current iynk build at commit `245763f`. Every AUD row has this form. The
    rest of the sentence gives what correct looks like.
  - Where an original teaches a wrong fact, the row states the correct fact as a requirement, following the
    research's accuracy notes.
- **source**: the file, then the section (`§`, a figure or lesson, or an audit defect id with its severity, such as
  `§3.1 P-01 (C)`), then the lines. When rows were merged, every source is listed, separated by semicolons. A
  section or line list without a file name continues the file named before it.
- **priority**:
  - **must**: the brief, a feature of an original site, a defect fix or an accuracy correction.
  - **should**: a nice-to-have, or a choice the research recommends without a brief need behind it: a failure the
    original only describes in text, a regression check against an original value the rows correct, or a detail
    of an original's look that the shared design system may replace.
- **verify**:
  - **unit**: a test on data or logic (models, formulas, golden values, the sketch runner, storage).
  - **e2e**: a browser test drives the page and checks the result.
  - **screenshot**: a shot is taken and inspected or compared.
  - **review**: a person reads the code, text or figure against the row and the real part's documentation.

## Rules that apply to every table

- **Fixed decisions.** `docs/hacktx/BASE_ARCHITECTURE.md` holds the build's binding decisions D1 to D14. Where an
  original conflicts with one (its 13 languages, its English-at-the-root URLs, its lesson hash, its storage keys),
  the row states the decision and cites it as `BASE_ARCHITECTURE.md D<n>`; the conflicts are listed in the gaps
  section.

- **Golden values.** Where a row gives an original's live values (serial lines, stats, meter readings, quiz
  arithmetic), iynk must reproduce them at their display precision for the same inputs. A value may differ only
  where a row corrects the model behind it (for example the Fig. 11 line width or the Fig. 12 stall model) and
  `docs/DECISIONS.md` records the new values.
- **Fixed, not copied.** The originals' defects and the current build's defects are fixed, never reproduced for
  fidelity. Where a row keeps an original value that later research shows to be wrong, the correction wins and goes
  into `docs/DECISIONS.md`.
- **Own code.** Facts, formulas, constants, timings and teaching messages are reused. The originals' source files,
  watermarks and credits are not. The Colorfigures MIT licence and credit are kept.
- **One source of truth.** A value shown in two places (a stat and a code panel, a log line and a figure) comes from
  one calculation, so the two can never disagree.
- **Every language.** An English string in a row is the English source text. It must reach every supported
  language, except what stays English by rule (pin names, units, brand names, code identifiers and string
  literals).
- **Gaps.** Needs the brief states but no source settles are listed at the end, with the conflicts between sources
  and the choices the rows leave open. They need a decision in `docs/DECISIONS.md` before the phase that builds
  them.

### Source files

Line numbers (`L…`) and sections (`§…`) refer to these files as they stood when the list was built.

| name in the source column | file | lines | sha256 (first 12) |
|---|---|---:|---|
| SPEC.md | `docs/SPEC.md` | 155 | `4f02b1390b27` |
| learn-arduino.md | `docs/research/learn-arduino.md` | 1317 | `51af819c9e56` |
| robotics-bench-a.md | `docs/research/robotics-bench-a.md` | 1424 | `6e4dcde46d4a` |
| robotics-bench-b.md | `docs/research/robotics-bench-b.md` | 1436 | `d26070cfc0cc` |
| current-iynk-audit.md | `docs/research/current-iynk-audit.md` | 618 | `6da9f8760aef` |
| BASE_ARCHITECTURE.md | `docs/hacktx/BASE_ARCHITECTURE.md` (decisions D1 to D14) | 19 | `7b6ba3f7b172` |

## Counts

1532 items in 81 tables. Ids are unique and numbered in table order within each prefix.

| prefix | covers | items | must | should | must not copy | must not | unit | e2e | screenshot | review |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| SPEC | SPEC.md: the brief, its execution order, the user's instruction and the interpretation notes | 179 | 178 | 1 | 0 | 0 | 0 | 135 | 7 | 37 |
| LA | learn-arduino.md: shell, 16 lessons, simulator, design, languages, persistence, accuracy notes | 498 | 452 | 46 | 21 | 0 | 52 | 379 | 29 | 38 |
| RBA | robotics-bench-a.md: bench engine, sound, Figs 01-06, 20 defects, rebuild notes | 376 | 347 | 29 | 32 | 0 | 22 | 310 | 27 | 17 |
| RBB | robotics-bench-b.md: Figs 07-13, practice tasks, 11 quirks | 280 | 254 | 26 | 24 | 0 | 22 | 210 | 14 | 34 |
| AUD | current-iynk-audit.md: every defect and finding in the current build | 199 | 199 | 0 | 0 | 199 | 28 | 105 | 30 | 36 |
| all | | 1532 | 1430 | 102 | 77 | 199 | 124 | 1139 | 107 | 162 |

### Tables

| table | ids | items | must | should |
|---|---|---:|---:|---:|
| [SPEC · Platform and global requirements](#spec--platform-and-global-requirements) | SPEC-001 to SPEC-028 | 28 | 28 | 0 |
| [SPEC · Visual engine](#spec--visual-engine) | SPEC-029 to SPEC-047 | 19 | 19 | 0 |
| [SPEC · Learn Arduino baseline](#spec--learn-arduino-baseline) | SPEC-048 to SPEC-061 | 14 | 14 | 0 |
| [SPEC · Robotics Engineer baseline](#spec--robotics-engineer-baseline) | SPEC-062 to SPEC-090 | 29 | 29 | 0 |
| [SPEC · Drone Engineer baseline](#spec--drone-engineer-baseline) | SPEC-091 to SPEC-098 | 8 | 8 | 0 |
| [SPEC · Board Lab](#spec--board-lab) | SPEC-099 to SPEC-134 | 36 | 35 | 1 |
| [SPEC · Robotics Lab](#spec--robotics-lab) | SPEC-135 to SPEC-141 | 7 | 7 | 0 |
| [SPEC · Drone Lab](#spec--drone-lab) | SPEC-142 to SPEC-170 | 29 | 29 | 0 |
| [SPEC · Execution and interpretation](#spec--execution-and-interpretation) | SPEC-171 to SPEC-179 | 9 | 9 | 0 |
| [LA · Page shell, meta and loader](#la--page-shell-meta-and-loader) | LA-001 to LA-015 | 15 | 12 | 3 |
| [LA · Desktop layout, sidebar and settings](#la--desktop-layout-sidebar-and-settings) | LA-016 to LA-048 | 33 | 28 | 5 |
| [LA · Stage overlays](#la--stage-overlays) | LA-049 to LA-070 | 22 | 17 | 5 |
| [LA · Info card](#la--info-card) | LA-071 to LA-079 | 9 | 7 | 2 |
| [LA · Code card and serial monitor](#la--code-card-and-serial-monitor) | LA-080 to LA-100 | 21 | 20 | 1 |
| [LA · Lessons strip](#la--lessons-strip) | LA-101 to LA-110 | 10 | 9 | 1 |
| [LA · Phone and compact layout](#la--phone-and-compact-layout) | LA-111 to LA-120 | 10 | 9 | 1 |
| [LA · Lesson 1, Meet the board](#la--lesson-1-meet-the-board) | LA-121 to LA-151 | 31 | 30 | 1 |
| [LA · Lesson structure and shared lesson rules](#la--lesson-structure-and-shared-lesson-rules) | LA-152 to LA-160 | 9 | 7 | 2 |
| [LA · Lesson 2, Blink an LED](#la--lesson-2-blink-an-led) | LA-161 to LA-178 | 18 | 17 | 1 |
| [LA · Lesson 3, Push a button](#la--lesson-3-push-a-button) | LA-179 to LA-192 | 14 | 14 | 0 |
| [LA · Lesson 4, Turn a knob](#la--lesson-4-turn-a-knob) | LA-193 to LA-204 | 12 | 12 | 0 |
| [LA · Lesson 5, Mix colours](#la--lesson-5-mix-colours) | LA-205 to LA-214 | 10 | 10 | 0 |
| [LA · Lesson 6, Sense light](#la--lesson-6-sense-light) | LA-215 to LA-226 | 12 | 12 | 0 |
| [LA · Lesson 7, Read a sensor (HC-SR04)](#la--lesson-7-read-a-sensor-hc-sr04) | LA-227 to LA-242 | 16 | 16 | 0 |
| [LA · Lesson 8, Make a sound](#la--lesson-8-make-a-sound) | LA-243 to LA-254 | 12 | 12 | 0 |
| [LA · Lesson 9, Mini piano](#la--lesson-9-mini-piano) | LA-255 to LA-269 | 15 | 15 | 0 |
| [LA · Lesson 10, Control a motor](#la--lesson-10-control-a-motor) | LA-270 to LA-280 | 11 | 11 | 0 |
| [LA · Lesson 11, Sense heat](#la--lesson-11-sense-heat) | LA-281 to LA-295 | 15 | 15 | 0 |
| [LA · Lesson 12, Sweep a servo](#la--lesson-12-sweep-a-servo) | LA-296 to LA-305 | 10 | 10 | 0 |
| [LA · Lesson 13, Spin the wheel](#la--lesson-13-spin-the-wheel) | LA-306 to LA-321 | 16 | 16 | 0 |
| [LA · Lesson 14, Smart plant](#la--lesson-14-smart-plant) | LA-322 to LA-338 | 17 | 17 | 0 |
| [LA · Lesson 15, Feel the force](#la--lesson-15-feel-the-force) | LA-339 to LA-354 | 16 | 16 | 0 |
| [LA · Lesson 16, Build a project](#la--lesson-16-build-a-project) | LA-355 to LA-364 | 10 | 10 | 0 |
| [LA · Simulator: code, parameters and run cycle](#la--simulator-code-parameters-and-run-cycle) | LA-365 to LA-390 | 26 | 25 | 1 |
| [LA · Simulator: pins, current flow and schematic](#la--simulator-pins-current-flow-and-schematic) | LA-391 to LA-407 | 17 | 14 | 3 |
| [LA · Simulator: timing, API and audio](#la--simulator-timing-api-and-audio) | LA-408 to LA-422 | 15 | 12 | 3 |
| [LA · Inspector and figure interaction](#la--inspector-and-figure-interaction) | LA-423 to LA-435 | 13 | 12 | 1 |
| [LA · Visual design and motion](#la--visual-design-and-motion) | LA-436 to LA-447 | 12 | 5 | 7 |
| [LA · View and keyboard controls](#la--view-and-keyboard-controls) | LA-448 to LA-464 | 17 | 15 | 2 |
| [LA · Languages](#la--languages) | LA-465 to LA-474 | 10 | 9 | 1 |
| [LA · Progress and persistence](#la--progress-and-persistence) | LA-475 to LA-487 | 13 | 9 | 4 |
| [LA · Accuracy facts and the original's missing failure modes](#la--accuracy-facts-and-the-originals-missing-failure-modes) | LA-488 to LA-498 | 11 | 9 | 2 |
| [RBA · What the original lacks and iynk must add](#rba--what-the-original-lacks-and-iynk-must-add) | RBA-001 to RBA-009 | 9 | 6 | 3 |
| [RBA · Page shell, layout and navigation](#rba--page-shell-layout-and-navigation) | RBA-010 to RBA-037 | 28 | 23 | 5 |
| [RBA · Engine: board model, part library and scene](#rba--engine-board-model-part-library-and-scene) | RBA-038 to RBA-070 | 33 | 30 | 3 |
| [RBA · Engine: build flow and its messages](#rba--engine-build-flow-and-its-messages) | RBA-071 to RBA-117 | 47 | 46 | 1 |
| [RBA · Engine: status, stats, faults and timing](#rba--engine-status-stats-faults-and-timing) | RBA-118 to RBA-137 | 20 | 19 | 1 |
| [RBA · Engine: terminal, selection, labels, palettes and lesson panel](#rba--engine-terminal-selection-labels-palettes-and-lesson-panel) | RBA-138 to RBA-154 | 17 | 13 | 4 |
| [RBA · Engine: quizzes and mastery](#rba--engine-quizzes-and-mastery) | RBA-155 to RBA-162 | 8 | 7 | 1 |
| [RBA · Sound: lofi, effects and motor hum](#rba--sound-lofi-effects-and-motor-hum) | RBA-163 to RBA-195 | 33 | 27 | 6 |
| [RBA · URL hooks, test handles and tracking](#rba--url-hooks-test-handles-and-tracking) | RBA-196 to RBA-206 | 11 | 9 | 2 |
| [RBA · Fig. 01 Arduino Uno R3](#rba--fig-01-arduino-uno-r3) | RBA-207 to RBA-242 | 36 | 36 | 0 |
| [RBA · Fig. 02 LED + resistor trainer](#rba--fig-02-led--resistor-trainer) | RBA-243 to RBA-271 | 29 | 28 | 1 |
| [RBA · Fig. 03 Transistor switch](#rba--fig-03-transistor-switch) | RBA-272 to RBA-298 | 27 | 27 | 0 |
| [RBA · Fig. 04 ESP32-S3 DevKitC-1](#rba--fig-04-esp32-s3-devkitc-1) | RBA-299 to RBA-323 | 25 | 25 | 0 |
| [RBA · Fig. 05 TB6612FNG dual motor driver](#rba--fig-05-tb6612fng-dual-motor-driver) | RBA-324 to RBA-348 | 25 | 24 | 1 |
| [RBA · Fig. 06 L298N dual H-bridge module](#rba--fig-06-l298n-dual-h-bridge-module) | RBA-349 to RBA-376 | 28 | 27 | 1 |
| [RBB · Shared behaviour on Figs 07-13](#rbb--shared-behaviour-on-figs-07-13) | RBB-001 to RBB-008 | 8 | 8 | 0 |
| [RBB · Fig. 07 A4988 stepper driver](#rbb--fig-07-a4988-stepper-driver) | RBB-009 to RBB-049 | 41 | 36 | 5 |
| [RBB · Fig. 08 PCA9685 servo board](#rbb--fig-08-pca9685-servo-board) | RBB-050 to RBB-088 | 39 | 35 | 4 |
| [RBB · Fig. 09 MPU-6050 IMU on a GY-521](#rbb--fig-09-mpu-6050-imu-on-a-gy-521) | RBB-089 to RBB-120 | 32 | 29 | 3 |
| [RBB · Fig. 10 HC-SR04 ultrasonic rangefinder](#rbb--fig-10-hc-sr04-ultrasonic-rangefinder) | RBB-121 to RBB-151 | 31 | 25 | 6 |
| [RBB · Fig. 11 QTR-8RC reflectance array](#rbb--fig-11-qtr-8rc-reflectance-array) | RBB-152 to RBB-187 | 36 | 34 | 2 |
| [RBB · Fig. 12 LM2596 buck module](#rbb--fig-12-lm2596-buck-module) | RBB-188 to RBB-234 | 47 | 46 | 1 |
| [RBB · Fig. 13 Raspberry Pi 5, the ROS 2 brain](#rbb--fig-13-raspberry-pi-5-the-ros-2-brain) | RBB-235 to RBB-277 | 43 | 38 | 5 |
| [RBB · Practice tasks and the original's quirks across Figs 01-13](#rbb--practice-tasks-and-the-originals-quirks-across-figs-01-13) | RBB-278 to RBB-280 | 3 | 3 | 0 |
| [AUD · Build, checks, app shell and the figure bridge](#aud--build-checks-app-shell-and-the-figure-bridge) | AUD-001 to AUD-010 | 10 | 10 | 0 |
| [AUD · Figures: the board and drone drawings](#aud--figures-the-board-and-drone-drawings) | AUD-011 to AUD-038 | 28 | 28 | 0 |
| [AUD · Sketch runner and translator](#aud--sketch-runner-and-translator) | AUD-039 to AUD-060 | 22 | 22 | 0 |
| [AUD · Board Lab UI](#aud--board-lab-ui) | AUD-061 to AUD-075 | 15 | 15 | 0 |
| [AUD · Lesson content and board facts](#aud--lesson-content-and-board-facts) | AUD-076 to AUD-098 | 23 | 23 | 0 |
| [AUD · Robotics Lab](#aud--robotics-lab) | AUD-099 to AUD-118 | 20 | 20 | 0 |
| [AUD · Drone Lab and calculator](#aud--drone-lab-and-calculator) | AUD-119 to AUD-135 | 17 | 17 | 0 |
| [AUD · Flight simulator](#aud--flight-simulator) | AUD-136 to AUD-144 | 9 | 9 | 0 |
| [AUD · Languages](#aud--languages) | AUD-145 to AUD-151 | 7 | 7 | 0 |
| [AUD · Accessibility](#aud--accessibility) | AUD-152 to AUD-161 | 10 | 10 | 0 |
| [AUD · Mobile and dark mode](#aud--mobile-and-dark-mode) | AUD-162 to AUD-168 | 7 | 7 | 0 |
| [AUD · Performance, progress and hygiene](#aud--performance-progress-and-hygiene) | AUD-169 to AUD-176 | 8 | 8 | 0 |
| [AUD · Coverage, crawl and interaction findings](#aud--coverage-crawl-and-interaction-findings) | AUD-177 to AUD-184 | 8 | 8 | 0 |
| [AUD · Figure fidelity](#aud--figure-fidelity) | AUD-185 to AUD-191 | 7 | 7 | 0 |
| [AUD · Gap list against the three originals](#aud--gap-list-against-the-three-originals) | AUD-192 to AUD-199 | 8 | 8 | 0 |

## SPEC · Platform and global requirements

The non-negotiables in the brief that apply to the whole app.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| SPEC-001 | iynk must be one Next.js App Router application that holds all three modules (Board Lab, Robotics Lab, Drone Lab); no module may be a separate site or app. | SPEC.md L7, L66, L121 | must | review |
| SPEC-002 | iynk must have a home dashboard from which each of the three modules can be opened. | SPEC.md L66, L134 | must | e2e |
| SPEC-003 | A shared navigation must reach the home dashboard and each of the three modules from every page of the app. | SPEC.md L66, L134 | must | e2e |
| SPEC-004 | The dashboard and all three modules must use one shared design system (the same tokens, type, controls and panels), not three styles. | SPEC.md L66, L134 | must | review |
| SPEC-005 | The three modules must be interconnected: wherever a board or part appears in more than one module, each appearance must link to the others (for example the Robotics Lab's Uno R3, ESP32-S3 and Raspberry Pi 5 to their Board Lab pages). | SPEC.md L66, L100, L125 | must | e2e |
| SPEC-006 | Learning progress in every module must be saved in localStorage and must still be there after a full page reload. | SPEC.md L66, L126 | must | e2e |
| SPEC-007 | The user must be able to switch the whole app between English, Spanish, French, German, Chinese and Hindi at minimum. | SPEC.md L66, L127 | must | e2e |
| SPEC-008 | In each of the six required languages every user-facing string of the dashboard and all three modules must be translated; no English string may leak into a non-English page except names that stay English by rule (pin names, units, brands, code). | SPEC.md L123, L127 | must | e2e |
| SPEC-009 | The user must be able to switch between a dark mode and a light mode, and the chosen mode must apply to the dashboard and every page of all three modules. | SPEC.md L66 | must | e2e |
| SPEC-010 | Every page, figure, schematic and panel must stay legible and correctly coloured in both dark and light mode. | SPEC.md L66, L123 | must | screenshot |
| SPEC-011 | The app must deploy to Vercel in one click (a default `next build` with no manual steps or extra services). | SPEC.md L121, L139 | must | review |
| SPEC-012 | Every visual must be generated with the Colorfigures skill; a hand-drawn SVG is allowed only where the skill demonstrably fails, and each such exception must be recorded in docs/DECISIONS.md. | SPEC.md L16, L122 | must | review |
| SPEC-013 | No page may show placeholder text ("coming soon", "TODO", "soon", lorem ipsum, empty cards or stub lessons). | SPEC.md L123, L141 | must | e2e |
| SPEC-014 | Every interactive control on every page must work: no dead buttons, no control that does nothing, no interaction that throws. | SPEC.md L123 | must | e2e |
| SPEC-015 | Every feature of the three originals documented in docs/research must be present in iynk, matched or exceeded, unless docs/DECISIONS.md records a justified exception. | SPEC.md L123, L141, L153 | must | review |
| SPEC-016 | Every board, part and lesson must state the correct logic level (5 V or 3.3 V), and iynk must never present a 3.3 V part as 5 V tolerant (or the reverse) unless it really is. | SPEC.md L124 | must | review |
| SPEC-017 | Every current limit iynk states (pin, port, regulator, driver, battery) must match the part's datasheet. | SPEC.md L124 | must | review |
| SPEC-018 | Every pinout iynk shows must match the real board's documentation pin for pin. | SPEC.md L124 | must | review |
| SPEC-019 | Every protocol iynk teaches (UART, I2C, SPI, PWM, Wi-Fi, BLE and the rest) must be described with correct facts (addresses, voltages, timings, pin roles). | SPEC.md L124 | must | review |
| SPEC-020 | Each board or part must have one figure in a shared component library, and every module must reuse that same figure (the Arduino, ESP32 and Pico figures are the same everywhere). | SPEC.md L100, L125 | must | review |
| SPEC-021 | On a touch screen every figure must rotate by dragging with a finger. | SPEC.md L128 | must | e2e |
| SPEC-022 | On a phone the app must use a simplified control layout that fits the screen without horizontal scrolling. | SPEC.md L128 | must | e2e |
| SPEC-023 | Every control in the app must be reachable and operable from the keyboard alone, with a visible focus ring. | SPEC.md L129 | must | e2e |
| SPEC-024 | Interactive elements must carry correct ARIA roles, names and states (pressed, current, expanded, live regions for changing status). | SPEC.md L129 | must | review |
| SPEC-025 | The README must list every Colorfigures prompt used to make the figures. | SPEC.md L130 | must | review |
| SPEC-026 | The README must give exact, working steps to deploy iynk to Vercel. | SPEC.md L130 | must | review |
| SPEC-027 | iynk must be visibly and functionally better than the three originals combined: more complete, more accurate, more interactive and more educational. | SPEC.md L7, L13, L141 | must | review |
| SPEC-028 | iynk must reproduce every interaction, visual style, lesson structure, calculation, failure mode and UI pattern of the three originals, as recorded in docs/research. | SPEC.md L13 | must | review |

## SPEC · Visual engine

What every Colorfigures figure must be.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| SPEC-029 | The Colorfigures skill must be installed from the URL in the brief and checked with a test figure before any figure work starts. | SPEC.md L18-19, L133 | must | review |
| SPEC-030 | Every board and every component in iynk must be a Colorfigures figure. | SPEC.md L16 | must | review |
| SPEC-031 | Every schematic, breadboard view and wiring diagram must use the Colorfigures hand-inked look (ink filter, wobble, paper grain, the five palettes) and must be generated from the same data as the 3D figure it describes. | SPEC.md L16, L154 | must | review |
| SPEC-032 | Every figure (board, component and drone) must offer an exploded view. | SPEC.md L16, L24 | must | e2e |
| SPEC-033 | Every drone must be a Colorfigures figure. | SPEC.md L16 | must | review |
| SPEC-034 | Every figure must be drawn hand-inked and isometric. | SPEC.md L21 | must | screenshot |
| SPEC-035 | Every figure must show a subtle wobble by default. | SPEC.md L21 | must | screenshot |
| SPEC-036 | Every figure must sit on a visible paper texture. | SPEC.md L21 | must | screenshot |
| SPEC-037 | Every figure must rotate a full 360 degrees by dragging. | SPEC.md L22 | must | e2e |
| SPEC-038 | Every figure must have a see-through mode. | SPEC.md L23 | must | e2e |
| SPEC-039 | In see-through mode the internal mechanisms of every figure must be labelled. | SPEC.md L23 | must | screenshot |
| SPEC-040 | In see-through mode internal mechanisms must animate and light up while they are working (current flowing, a chip running, a motor turning) and stay dark when they are not. | SPEC.md L23 | must | e2e |
| SPEC-041 | Every part of a figure that looks pressable (buttons, switches, jumpers, knobs, connectors) must do something when pressed. | SPEC.md L25 | must | e2e |
| SPEC-042 | Every figure's geometry (outline, proportions, part positions) must match the real object. | SPEC.md L26 | must | review |
| SPEC-043 | Every label on a figure must name the real part it points to correctly. | SPEC.md L26 | must | review |
| SPEC-044 | Every figure must be self-contained HTML, SVG and JavaScript, with no external images, fonts or scripts loaded at run time. | SPEC.md L27 | must | review |
| SPEC-045 | Figures must offer the tomato, mustard, mint, cobalt and blush palettes. | SPEC.md L28 | must | e2e |
| SPEC-046 | Figures must offer a technical monochrome rendering besides the five colour palettes. | SPEC.md L28 | must | e2e |
| SPEC-047 | Every figure must be iterated until its see-through internals, labels, animations and interactions are correct; a figure with a known visual defect is not done. | SPEC.md L141 | must | review |

## SPEC · Learn Arduino baseline

The brief's own list of what Learn Arduino has and iynk must match.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| SPEC-048 | The Uno lessons must open under a large title with the tagline "Explore · Understand · Build". | SPEC.md L33 | must | screenshot |
| SPEC-049 | The Uno lessons must centre on the Arduino Uno R3 and its ATmega328P. | SPEC.md L34, L72 | must | review |
| SPEC-050 | The Uno lessons must be component-level lessons with a progress count in the form done/total, which starts at 0/16. | SPEC.md L35, L94 | must | e2e |
| SPEC-051 | The Uno figure must label the "USB Port". | SPEC.md L36 | must | e2e |
| SPEC-052 | The Uno figure must label the "Microcontroller". | SPEC.md L36 | must | e2e |
| SPEC-053 | The Uno figure must label "Digital Pins 0–13" and mark the PWM pins with ~. | SPEC.md L36 | must | e2e |
| SPEC-054 | The Uno figure must label the "Power Jack" and say 7–12 V is recommended. | SPEC.md L36 | must | e2e |
| SPEC-055 | The Uno figure must label the "Power Pins" as 5V, 3.3V, GND and VIN. | SPEC.md L36 | must | e2e |
| SPEC-056 | The Uno figure must label "Analog Pins A0–A5". | SPEC.md L36 | must | e2e |
| SPEC-057 | The code panel must highlight syntax live as the code is shown or edited. | SPEC.md L37 | must | e2e |
| SPEC-058 | The first Uno lesson must show a "Try it yourself" code panel holding the Blink example from the brief: pinMode(LED_BUILTIN, OUTPUT) in setup, and digitalWrite(LED_BUILTIN, HIGH) followed by delay(1000) in loop. | SPEC.md L37-39 | must | e2e |
| SPEC-059 | The serial monitor must show its status, at least Stopped and Running. | SPEC.md L40 | must | e2e |
| SPEC-060 | "Scheggled" must exist as a schematic toggle opened with the C key, showing a live schematic generated from the lesson's circuit, and it must do more than the original's. | SPEC.md L41, L151 | must | e2e |
| SPEC-061 | The Uno lesson page must keep a clean, structured layout: title and progress, figure, info, code and serial monitor, and lessons in fixed, distinct regions. | SPEC.md L42 | must | screenshot |

## SPEC · Robotics Engineer baseline

The brief's list of what the robotics original has.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| SPEC-062 | The Robotics Lab must include the Arduino Uno R3. | SPEC.md L45, L101 | must | e2e |
| SPEC-063 | The Robotics Lab must include the ESP32-S3 DevKit. | SPEC.md L45, L101 | must | e2e |
| SPEC-064 | The Robotics Lab must include the Raspberry Pi 5, presented as the ROS 2 brain of a robot. | SPEC.md L45, L101 | must | e2e |
| SPEC-065 | The Robotics Lab must include the TB6612FNG motor driver and mark it as the recommended driver. | SPEC.md L46, L101 | must | e2e |
| SPEC-066 | The Robotics Lab must include the L298N motor driver together with its warnings. | SPEC.md L46, L101 | must | e2e |
| SPEC-067 | The Robotics Lab must include the A4988 stepper driver and teach microstepping. | SPEC.md L46, L101 | must | e2e |
| SPEC-068 | The Robotics Lab must include the PCA9685 16-channel I2C PWM board. | SPEC.md L46, L101 | must | e2e |
| SPEC-069 | The Robotics Lab must include the MPU-6050 IMU and teach its filters and its drift. | SPEC.md L47, L101 | must | e2e |
| SPEC-070 | The Robotics Lab must include the HC-SR04 and teach time-of-flight ranging. | SPEC.md L47, L101 | must | e2e |
| SPEC-071 | The Robotics Lab must include the QTR-8RC line sensor. | SPEC.md L47, L101 | must | e2e |
| SPEC-072 | The Robotics Lab must include the LM2596 buck converter. | SPEC.md L48, L101 | must | e2e |
| SPEC-073 | The build flow must be able to strip a board to its bare PCB. | SPEC.md L49, L87 | must | e2e |
| SPEC-074 | The build flow must pick and place the SMD parts. | SPEC.md L49 | must | e2e |
| SPEC-075 | The build flow must let the user place the through-hole parts interactively. | SPEC.md L49 | must | e2e |
| SPEC-076 | The build flow must show solder joints forming. | SPEC.md L49 | must | e2e |
| SPEC-077 | The build flow must let the user plug and unplug USB. | SPEC.md L49 | must | e2e |
| SPEC-078 | The build flow must let the user upload a sketch. | SPEC.md L49 | must | e2e |
| SPEC-079 | The build flow must end in an exploded view. | SPEC.md L49 | must | e2e |
| SPEC-080 | The Uno build must require the DIP socket to be soldered before the ATmega328P is inserted, and must say that this keeps soldering heat away from the chip. | SPEC.md L50 | must | e2e |
| SPEC-081 | A live status panel must show RUNNING while a sketch runs. | SPEC.md L51, L104 | must | e2e |
| SPEC-082 | The live status panel must show Pin 13 as LOW or HIGH, following the pin in real time. | SPEC.md L51, L104 | must | e2e |
| SPEC-083 | The live status panel must show Powered: ON while the board has power. | SPEC.md L51, L104 | must | e2e |
| SPEC-084 | The Robotics Lab must have a serial monitor that shows the running sketch's output. | SPEC.md L52, L104 | must | e2e |
| SPEC-085 | The Robotics Lab must have a reaction-timer practice task that uses an interrupt, debouncing and millis() instead of delay(). | SPEC.md L53, L103 | must | e2e |
| SPEC-086 | A quiz must ask why analogWrite on pin 13 does not dim the LED (pin 13 has no PWM on the Uno). | SPEC.md L54 | must | e2e |
| SPEC-087 | A quiz must ask why the DIP socket is soldered before the ATmega328P goes in. | SPEC.md L54 | must | e2e |
| SPEC-088 | A quiz must ask what makes the board reset when a motor starts. | SPEC.md L54 | must | e2e |
| SPEC-089 | A quiz must ask which chip converts USB to serial on the Uno. | SPEC.md L54 | must | e2e |
| SPEC-090 | The Robotics Lab must have lofi ambient music and sound effects as feedback. | SPEC.md L55 | must | e2e |

## SPEC · Drone Engineer baseline

The brief's list of what the drone original has. Drone details are in checklist part B.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| SPEC-091 | The Drone Lab must have at least one full 5-inch freestyle quad at the depth of the original Fig. 01. | SPEC.md L58, L109 | must | e2e |
| SPEC-092 | Each drone must be built part by part. | SPEC.md L59 | must | e2e |
| SPEC-093 | The Drone Lab must teach the flight controls. | SPEC.md L60 | must | e2e |
| SPEC-094 | The Drone Lab must show Betaflight configuration snippets. | SPEC.md L60 | must | e2e |
| SPEC-095 | The Drone Lab must calculate weight, thrust and the related figures live, updating as parts change. | SPEC.md L61 | must | e2e |
| SPEC-096 | Drone parts must be interactive (select, inspect, fit). | SPEC.md L62 | must | e2e |
| SPEC-097 | Drone wiring must be interactive. | SPEC.md L62 | must | e2e |
| SPEC-098 | The user must be able to arm, fly and test a drone. | SPEC.md L63 | must | e2e |

## SPEC · Board Lab

Module 1. Boards, per-board features and FPGA.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| SPEC-099 | The Board Lab must have at least 12 boards, with the ids uno-r3, nano, uno-r4, esp32-devkitc, esp32-s3-devkitc-1, nodemcu, pico, nucleo-f401re, microbit-v2, pi4-pi5, basys3 and de10-lite. | SPEC.md L68; BASE_ARCHITECTURE.md D3 | must | e2e |
| SPEC-100 | The Board Lab must include the Arduino Uno R3 (ATmega328P) with all the original Learn Arduino component lessons and a build sequence. | SPEC.md L72 | must | e2e |
| SPEC-101 | The Board Lab must include the Arduino Uno R4, as the Minima, the WiFi or both. | SPEC.md L73 | must | e2e |
| SPEC-102 | The Board Lab must include the Arduino Nano. | SPEC.md L74 | must | e2e |
| SPEC-103 | The Board Lab must include the ESP32 DevKit and show its dual cores, Wi-Fi and BLE. | SPEC.md L75 | must | e2e |
| SPEC-104 | The Board Lab must include the ESP32-S3 DevKit. | SPEC.md L76 | must | e2e |
| SPEC-105 | The Board Lab must include the NodeMCU (ESP8266). | SPEC.md L77 | must | e2e |
| SPEC-106 | The Board Lab must include the Raspberry Pi Pico family (Pico, Pico 2 or Pico W). | SPEC.md L78 | must | e2e |
| SPEC-107 | The Board Lab must include an STM32 Nucleo or Discovery board: the STM32 Nucleo-F401RE (nucleo-f401re). | SPEC.md L79; BASE_ARCHITECTURE.md D3 | must | e2e |
| SPEC-108 | The Board Lab must include the BBC micro:bit, as the micro:bit V2 (microbit-v2). | SPEC.md L80; BASE_ARCHITECTURE.md D3 | must | e2e |
| SPEC-109 | The Board Lab must include the Raspberry Pi 4 or 5. | SPEC.md L81 | must | e2e |
| SPEC-110 | The Board Lab must include the Digilent Basys 3 (Xilinx Artix-7) with working switches, LEDs, buttons and 7-segment display. | SPEC.md L82 | must | e2e |
| SPEC-111 | The Board Lab must include the Terasic DE10-Lite or DE10-Nano: the DE10-Lite (MAX 10, de10-lite). | SPEC.md L83; BASE_ARCHITECTURE.md D3 | must | e2e |
| SPEC-112 | Every board must be a full Colorfigures figure that works in the interaction style of the Learn Arduino lessons and the build flow of the Robotics Bench. | SPEC.md L69 | must | e2e |
| SPEC-113 | Every board must show an accurate pinout. | SPEC.md L86 | must | review |
| SPEC-114 | Every board's parts must be labelled, in see-through and in the exploded view. | SPEC.md L86 | must | e2e |
| SPEC-115 | Every board must have a step-by-step assembly and power-up sequence in the Robotics Bench style. | SPEC.md L87 | must | e2e |
| SPEC-116 | Every board must have a code editor with live syntax highlighting. | SPEC.md L88 | must | e2e |
| SPEC-117 | The code in every board's editor must be editable by the user. | SPEC.md L88 | must | e2e |
| SPEC-118 | Pressing Run must run the code in the editor (as edited) and update the 3D figure's simulation from it. | SPEC.md L88 | must | e2e |
| SPEC-119 | Every board must have a schematic view. | SPEC.md L89 | must | e2e |
| SPEC-120 | Every board must have a breadboard view. | SPEC.md L89 | must | e2e |
| SPEC-121 | Every board must have a serial monitor. | SPEC.md L90 | must | e2e |
| SPEC-122 | Every board must let the user wire in common sensors and actuators. | SPEC.md L91 | must | e2e |
| SPEC-123 | Every board must have a reverse-polarity failure that really triggers in the simulation, with a visible consequence. | SPEC.md L92 | must | e2e |
| SPEC-124 | Every board must have a brown-out failure that really triggers in the simulation. | SPEC.md L92 | must | e2e |
| SPEC-125 | Every board must have a wrong-voltage failure that really triggers in the simulation. | SPEC.md L92 | must | e2e |
| SPEC-126 | Every board must have a cold-solder failure that really triggers in the simulation. | SPEC.md L92 | must | e2e |
| SPEC-127 | Every board must have at least 4 lessons that build on each other. | SPEC.md L93 | must | e2e |
| SPEC-128 | Every board's lessons must include a Blink or digital I/O lesson. | SPEC.md L93 | must | e2e |
| SPEC-129 | Every board's lessons must include a button-plus-sensor lesson. | SPEC.md L93 | must | e2e |
| SPEC-130 | Every board's lessons must include a PWM or analog lesson. | SPEC.md L93 | must | e2e |
| SPEC-131 | Every board's lessons must include one protocol (I2C, SPI, UART) or Wi-Fi lesson. | SPEC.md L93 | must | e2e |
| SPEC-132 | Every board must show its lesson progress in the done/total form of the original "0/16". | SPEC.md L94 | must | e2e |
| SPEC-133 | The FPGA boards must run a Verilog-style LED chaser or a switch-to-LED mapping that visibly updates the figure. | SPEC.md L96 | must | e2e |
| SPEC-134 | The FPGA lessons should say that iynk does not do full synthesis and runs the Verilog as a behavioural model. | SPEC.md L96 | should | review |

## SPEC · Robotics Lab

Module 2.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| SPEC-135 | The Robotics Lab must reuse the Board Lab's board figures, not draw its own copies. | SPEC.md L100, L125 | must | review |
| SPEC-136 | The Robotics Lab must have a full interactive build workflow for its boards and parts. | SPEC.md L102 | must | e2e |
| SPEC-137 | The Robotics Lab must have deliberate break workflows in which the user causes a fault and sees its consequence. | SPEC.md L102 | must | e2e |
| SPEC-138 | The Robotics Lab must have a line-follower practice task. | SPEC.md L103 | must | e2e |
| SPEC-139 | The Robotics Lab must have a simple-arm practice task. | SPEC.md L103 | must | e2e |
| SPEC-140 | The Robotics Lab must show live current draw. | SPEC.md L104 | must | e2e |
| SPEC-141 | A quiz must appear after each major step of a build. | SPEC.md L105 | must | e2e |

## SPEC · Drone Lab

Module 3. Drone specifics are in checklist part B.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| SPEC-142 | The Drone Lab must have at least 8 to 10 drones. | SPEC.md L108 | must | e2e |
| SPEC-143 | The Drone Lab must include a 5-inch freestyle quad on Betaflight. | SPEC.md L109 | must | e2e |
| SPEC-144 | The Drone Lab must include a Tiny Whoop. | SPEC.md L110 | must | e2e |
| SPEC-145 | The Drone Lab must include a 3-inch cinewhoop. | SPEC.md L110 | must | e2e |
| SPEC-146 | The Drone Lab must include a 7-inch long-range quad. | SPEC.md L110 | must | e2e |
| SPEC-147 | The Drone Lab must include a racing quad. | SPEC.md L110 | must | e2e |
| SPEC-148 | The Drone Lab must include a GPS camera drone on ArduPilot. | SPEC.md L110 | must | e2e |
| SPEC-149 | The Drone Lab must include a delivery drone. | SPEC.md L110 | must | e2e |
| SPEC-150 | The Drone Lab must include an agricultural drone. | SPEC.md L110 | must | e2e |
| SPEC-151 | The Drone Lab must include a flying wing or VTOL. | SPEC.md L110 | must | e2e |
| SPEC-152 | The Drone Lab must include a nano drone in the Crazyflie style. | SPEC.md L110 | must | e2e |
| SPEC-153 | Every drone must be built part by part in the order frame, motors, ESC, wiring, FC, VTX, camera, receiver, battery, props. | SPEC.md L113 | must | e2e |
| SPEC-154 | Every drone must show its all-up weight (AUW), updating live as parts change. | SPEC.md L114 | must | e2e |
| SPEC-155 | Every drone must show its thrust-to-weight ratio, updating live. | SPEC.md L114 | must | e2e |
| SPEC-156 | Every drone must show its hover throttle as a percentage, updating live. | SPEC.md L114 | must | e2e |
| SPEC-157 | Every drone must show its maximum current, updating live. | SPEC.md L114 | must | e2e |
| SPEC-158 | Every drone must show its flight time at hover, updating live. | SPEC.md L114 | must | e2e |
| SPEC-159 | Every drone must show its flight time when flown aggressively, updating live. | SPEC.md L114 | must | e2e |
| SPEC-160 | Every drone must have a clickable Colorfigures wiring diagram. | SPEC.md L115 | must | e2e |
| SPEC-161 | Every drone must have a smoke-stopper test. | SPEC.md L116 | must | e2e |
| SPEC-162 | Every drone must have a motor-direction test that requires the props to be off. | SPEC.md L116 | must | e2e |
| SPEC-163 | Every drone must have an accelerometer calibration step. | SPEC.md L116 | must | e2e |
| SPEC-164 | The flight simulator must fly from the keyboard with WASD and the arrow keys. | SPEC.md L117 | must | e2e |
| SPEC-165 | The flight simulator must offer on-screen sticks, so it can be flown on a touch screen. | SPEC.md L117, L128 | must | e2e |
| SPEC-166 | Space must arm and disarm the drone in the flight simulator. | SPEC.md L117 | must | e2e |
| SPEC-167 | V must toggle the first-person (FPV) view in the flight simulator. | SPEC.md L117 | must | e2e |
| SPEC-168 | The flight simulator must offer angle mode and acro mode, with visibly different handling. | SPEC.md L117 | must | e2e |
| SPEC-169 | The flight simulator must have a simple gate course. | SPEC.md L117 | must | e2e |
| SPEC-170 | Every Betaflight and ArduPilot CLI snippet must be accurate for the firmware version it names. | SPEC.md L118 | must | review |

## SPEC · Execution and interpretation

The execution order, the user's instruction and the interpretation notes.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| SPEC-171 | The work must follow the brief's order (skill, design system and dashboard, Board Lab, Robotics Lab, Drone Lab, unify and polish, deploy), with a verification gate at the end of every phase and no stop for approval in between. | SPEC.md L132-138, L152 | must | review |
| SPEC-172 | The finished work must be deployed to Vercel, and the live URL and the full source must be handed back. | SPEC.md L139 | must | review |
| SPEC-173 | No feature present in the three originals may be skipped, and no placeholder may be shipped. | SPEC.md L141 | must | review |
| SPEC-174 | Every requirement must be cross-checked against the originals and the brief before it is called done. | SPEC.md L147 | must | review |
| SPEC-175 | A bug or inaccuracy found in an original must be fixed in iynk, never copied. | SPEC.md L153 | must | review |
| SPEC-176 | Any deliberate departure from an original's feature must be recorded with its reason in docs/DECISIONS.md. | SPEC.md L153 | must | review |
| SPEC-177 | iynk must not contain any of the originals' source files or code copied from them; their facts, formulas, constants, timings and teaching messages may be reused in iynk's own code. | SPEC.md L155 | must | review |
| SPEC-178 | iynk must not show the originals' author watermarks or credits. | SPEC.md L155 | must | review |
| SPEC-179 | iynk must keep the Colorfigures MIT licence and its credit. | SPEC.md L155 | must | review |

## LA · Page shell, meta and loader

Learn Arduino's HTML shell and start-up. iynk draws figures with Colorfigures, not three.js, so the WebGL items are restated for iynk's own figure engine.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-001 | iynk should not expose a global debug object (the original ships `window.__app` with stage, run, stop, state and setParam) in production; any test hook must be documented and harmless. | learn-arduino.md §0.1 L43 | should | review |
| LA-002 | Each Board Lab lesson page must set a document title naming the lesson and the module (the original uses "{Lesson title} · Learn Arduino"). | learn-arduino.md §1.1 L75; §7 L1246-1260 | must | e2e |
| LA-003 | Every iynk page must carry a meta description that says what the page teaches (the original: wire LEDs, buttons, sensors, motors and servos, run the code and watch it work, 16 free beginner lessons). | learn-arduino.md §1.1 L75 | must | review |
| LA-004 | iynk must ship a web app manifest (name, short name, standalone display, theme and background colour, 192, 512, maskable and SVG icons) and a matching theme-color meta. | learn-arduino.md §1.1 L76 | must | review |
| LA-005 | iynk must ship Open Graph and Twitter card images (1200×630) with descriptive alt text, one per language. | learn-arduino.md §1.1 L77 | must | review |
| LA-006 | Every page must declare hreflang alternates for all its languages plus x-default, and a canonical URL per language. | learn-arduino.md §1.1 L78 | must | review |
| LA-007 | The Board Lab must publish JSON-LD typed WebApplication and LearningResource, with teaches set to its lesson titles, isAccessibleForFree and educationalLevel Beginner. | learn-arduino.md §1.1 L79 | must | review |
| LA-008 | With JavaScript turned off a lesson page must still show a one-line description of the course and every lesson as "N. Title" followed by the first sentence of its lede (the original: "An interactive 3D course in your browser. Turn on JavaScript to start."). | learn-arduino.md §1.1 L80 | must | e2e |
| LA-009 | The display fonts should be self-hosted and preloaded so the first paint uses them. | learn-arduino.md §1.1 L81 | should | review |
| LA-010 | If iynk shows a loading screen, the content behind it must be inert (not focusable, not clickable) until loading finishes. | learn-arduino.md §1.1 L82; §5.7 L1225-1230 | must | e2e |
| LA-011 | If iynk shows a loading screen it should show a progress bar and a label naming the real step being done (the original: "Loading", "Loading fonts", "Loading the 3D view", "Building the board", "Drawing the lessons · {n} / {total}", "Ready"), then fade out over about 0.5 s. | learn-arduino.md §1.2 L86-88 | should | e2e |
| LA-012 | A loading screen must never hang: a failsafe (20 s in the original) must dismiss it even if a step never finishes. | learn-arduino.md §1.2 L90 | must | e2e |
| LA-013 | If start-up fails, the page must say so in plain words ("Something went wrong while starting. Try reloading the page.") instead of hanging or going blank. | learn-arduino.md §1.2 L91 | must | e2e |
| LA-014 | If the figure engine cannot run in the browser, the stage must show a short note saying why and how to fix it, and the lessons and their code must still work (the original's WebGL note: "3D view unavailable"). | learn-arduino.md §1.2 L92 | must | e2e |
| LA-015 | With prefers-reduced-motion the loader must fade in about 10 ms and drop its moving shine. | learn-arduino.md §1.2 L93; §5.6 | must | e2e |

## LA · Desktop layout, sidebar and settings

The regions of the lesson page, the sidebar and its flyouts, and the Settings flyout.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-016 | On desktop the lesson page should scale as one composition (the original scales a 1672×941 artboard by min(vw/1672, vh/941), widening it below 0.8), so every region is visible at 1280×800 without page scrolling. | learn-arduino.md §1.3 L95-106 | should | screenshot |
| LA-017 | The lesson page must switch to a stacked, scrolling layout on phones and portrait screens (the original switches when the scale drops below 0.62 or vw/vh is below 0.95). | learn-arduino.md §1.3 L101-104; §1.13 L232-252 | must | e2e |
| LA-018 | The lesson page background should carry decorative PCB traces (thin polylines with end circles and clusters of faint squares) anchored to the corners, drawn in iynk's own style. | learn-arduino.md §1.3 L108 | should | screenshot |
| LA-019 | The desktop lesson page should keep the original's regions: sidebar on the left, brand top-left, status top-right, the figure stage centre-left, the info card above the code card on the right, the lessons strip along the bottom, the viewbar under the stage and the minimap at the stage's bottom-left. | learn-arduino.md §1.4 L110-123 | should | screenshot |
| LA-020 | Every sidebar link must carry an aria-label and a title; its text label shows when the sidebar is expanded. | learn-arduino.md §1.5 L127 | must | e2e |
| LA-021 | The sidebar Home item must select lesson 1 and reset the view. | learn-arduino.md §1.5 L129 | must | e2e |
| LA-022 | The Lessons flyout must show the header "Lessons" and the count "{done}/{total} done". | learn-arduino.md §1.5 L130 | must | e2e |
| LA-023 | Each Lessons flyout row must show the lesson number, or a check mark once the lesson is done, with the lesson title in bold over its heading in small text (e.g. "MINI PIANO / Build a mini piano"). | learn-arduino.md §1.5 L130 | must | e2e |
| LA-024 | The Lessons flyout must mark the current lesson, and clicking a row must close the flyout and open that lesson. | learn-arduino.md §1.5 L130 | must | e2e |
| LA-025 | The Components flyout must show the header "Components" and "{n} in view", then up to 12 parts: the lesson's own parts (not wires) first, then the board parts in the order DIP chip, USB, jack, reset, digital header, power header, analog header, USB chip, crystal. | learn-arduino.md §1.5 L131 | must | e2e |
| LA-026 | Each Components flyout row must show a focus icon, the part name and its description, and clicking it must zoom to and select that part. | learn-arduino.md §1.5 L131 | must | e2e |
| LA-027 | The sidebar must have a Simulator item ("Run simulation") that starts and stops the sketch and is highlighted while the sketch runs. | learn-arduino.md §1.5 L132 | must | e2e |
| LA-028 | The sidebar must have a Settings item that opens the Settings flyout. | learn-arduino.md §1.5 L133 | must | e2e |
| LA-029 | The sidebar must have a Language item with a badge showing the current language code (e.g. "EN"). | learn-arduino.md §1.5 L134 | must | e2e |
| LA-030 | The Language flyout must list every language with its code (or a check mark for the current one), its native name in bold and its name in the current UI language in small text (from Intl.DisplayNames, e.g. "ESPAÑOL / Spanish"); picking one switches to that language. | learn-arduino.md §1.5 L134 | must | e2e |
| LA-031 | A sidebar toggle ("Expand sidebar" / "Collapse sidebar") must widen the sidebar to show its labels, and any open flyout must move with it. | learn-arduino.md §1.5 L136 | must | e2e |
| LA-032 | must not copy: the sidebar credit "Designed by / x.com/DilumSanjaya" with the X logo; iynk shows its own mark or nothing there. | learn-arduino.md §1.5 L137; §9.2 #12 L1305 | must | review |
| LA-033 | Clicking outside an open flyout, or pressing Escape, must close it. | learn-arduino.md §1.5 L138 | must | e2e |
| LA-034 | The Settings flyout must have the header "Settings" and a Language select described as "Lessons, labels and code comments". | learn-arduino.md §1.5.1 L142-146 | must | e2e |
| LA-035 | Settings must have a "Callout labels" switch ("Cards and pointers around the 3D view"), on by default, that shows or hides the callout cards and tags. | learn-arduino.md §1.5.1 L147 | must | e2e |
| LA-036 | Settings must have a "Current flow" switch ("Moving dots and HIGH / LOW on the wires while a sketch runs"), on by default. | learn-arduino.md §1.5.1 L148 | must | e2e |
| LA-037 | Settings must have a "Floor grid" switch ("The faint grid under the board"), on by default. | learn-arduino.md §1.5.1 L149 | must | e2e |
| LA-038 | Settings must have a "Turntable" switch ("Turn a quarter every few seconds when idle"), off by default, that turns the view a quarter turn every 4.5 s while idle. | learn-arduino.md §1.5.1 L150; §5.4 L1201-1209 | must | e2e |
| LA-039 | Settings must have a "Sound" switch ("Let the buzzer play out loud"), on by default, that mutes or unmutes every simulated buzzer and tone. | learn-arduino.md §1.5.1 L151; §4.10 | must | e2e |
| LA-040 | Settings must have a "Reduce motion" switch ("Near-instant transitions") whose default follows prefers-reduced-motion. | learn-arduino.md §1.5.1 L152; §5.6 | must | e2e |
| LA-041 | Settings must end with a "Reset progress" button that clears the completed lessons and resets the counter. | learn-arduino.md §1.5.1 L154; §7 | must | e2e |
| LA-042 | The Settings switches must be real checkboxes (or role=switch) with labels, operable from the keyboard. | learn-arduino.md §1.5.1 L155; §5.7 | must | e2e |
| LA-043 | The schematic on/off state must be saved with the other settings even though it is toggled from the viewbar, not from a Settings row. | learn-arduino.md §1.5.1 L156-157; §7 | must | e2e |
| LA-044 | The brand block should be a logo, a vertical rule with a dot at each end, a large uppercase title (Barlow Semi Condensed 600, letter-spacing .13em, navy #18213d) and the uppercase tagline in a faint colour (#ada293, letter-spacing .17em, "·" separators with .45em margins). | learn-arduino.md §1.6 L161-164 | should | screenshot |
| LA-045 | The status area must show a progress card labelled with the track name ("Basics") holding a progress bar and the count "{done}/{total}" ("0/16" at the start). | learn-arduino.md §1.7 L168 | must | e2e |
| LA-046 | The progress bar must be role=progressbar with aria-valuemax equal to the number of lessons and aria-valuenow equal to the lessons done. | learn-arduino.md §1.7 L168; §5.7 | must | e2e |
| LA-047 | The progress fill should grow to done/total of the track width with a 0.8 s ease. | learn-arduino.md §1.7 L168 | should | e2e |
| LA-048 | The status area must show a live clock: the date localised with Intl.DateTimeFormat (short month, two-digit day, year; dots removed, uppercased, e.g. "OCT 24, 2026", "2026年10月24日") over HH:MM:SS updated every second. | learn-arduino.md §1.7 L169 | must | e2e |

## LA · Stage overlays

Callout cards, tags, wire chips, readouts, tooltip, minimap, viewbar and hint.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-049 | The figure stage must carry an aria-label that says how to operate it as iynk works, where dragging rotates (the original's reads "Interactive 3D view. Drag or use WASD to pan, Q and E to rotate, scroll to zoom."). | learn-arduino.md §1.8 L173; §5.7; SPEC.md L22 | must | review |
| LA-050 | Each lesson must place callout cards around the figure, each with a line icon, an uppercase title and a short body, at positions set per lesson. | learn-arduino.md §1.8 L174 | must | e2e |
| LA-051 | Each callout card must be joined to its part by a dashed leader (#1d2236, 1.6 px, dash 5 4) that leaves a chosen card edge and ends on the part's projected point, following the figure as it moves. | learn-arduino.md §1.8 L175 | must | screenshot |
| LA-052 | Each callout should have a ring dot on the card edge and, at the anchor, a dot with a halo that pulses (2.8 s, scale .6 to 2.1, fading). | learn-arduino.md §1.8 L176-177 | should | screenshot |
| LA-053 | Callout cards should fade in 60 ms apart, starting 1000 ms after a lesson switch (at once with reduced motion), and the previous lesson's cards should leave within 420 ms. | learn-arduino.md §1.8 L178 | should | e2e |
| LA-054 | Clicking a callout card, its anchor or its tag must select the part it names or, for a pin or area anchor, zoom the view to it (×1.9 over 1 s). | learn-arduino.md §1.8 L179 | must | e2e |
| LA-055 | Hovering a callout card, its anchor or its tag must highlight its leader. | learn-arduino.md §1.8 L180 | must | e2e |
| LA-056 | When the view is away from home, a part is selected, the stage is too narrow, the schematic is open or the layout is compact, the callout cards must give way to small uppercase tags at each anchor, placed so they do not collide (the original tries 10 candidate offsets). | learn-arduino.md §1.8 L181 | must | e2e |
| LA-057 | While a sketch runs with Current flow on, every jumper wire must carry a chip showing its live signal ("HIGH", "LOW", "5 V", "GND", "PWM 61%", "3.03 V", "PULSE", "ECHO 2.6 MS", "392 HZ", "I²C DATA", "FAN +", "MOTOR −"), bordered in the wire's colour. | learn-arduino.md §1.8 L182; §4.7 | must | e2e |
| LA-058 | Wire-chip dots should use red #e5533d for high or motor, red #d64a3a for power, navy for ground, orange #f0a53a for analog and grey for low. | learn-arduino.md §1.8 L182 | should | screenshot |
| LA-059 | A wire chip should sit at the first position along its wire, tried in the order t = .5, .42, .58, .34, .66, .27, .73, .2, .8, that does not collide with another chip. | learn-arduino.md §1.8 L182 | should | e2e |
| LA-060 | Lessons with a live value must show it in a readout pill next to the part (e.g. "620 → 155", "26 cm", "♪ G4", "31.9 °C", "A0 = 412", "step 63 / 2816"). | learn-arduino.md §1.8 L183 | must | e2e |
| LA-061 | Short events must show a float note that rises about 46 px and fades over 1100 ms (e.g. "♪ Sol" in the key's colour, "Ding!" in #d9a32e). | learn-arduino.md §1.8 L184 | must | e2e |
| LA-062 | Hovering any part must show a tooltip with its name in bold uppercase and its description, 16 px right of the pointer, flipping to the left near the right edge. | learn-arduino.md §1.8 L185 | must | e2e |
| LA-063 | When the view has been away from home for 300 ms on desktop, a minimap must appear showing the part footprints, the current view rectangle, the target point and a north arrow. | learn-arduino.md §1.8 L188 | must | e2e |
| LA-064 | Clicking the minimap must glide the view there (about 420 ms) and dragging on it must pan the view live; it must be labelled "Minimap: click or drag to move the view.". | learn-arduino.md §1.8 L188 | must | e2e |
| LA-065 | The minimap should draw a 20-unit grid and colour footprints by kind (board #4a5d99, breadboard #efe7d6, car #e3604b, sensor #3a56a0, motor #cfc9bf, lights #2c3242, other #8e8a84), with a teal view rectangle at 12% fill and a red north arrow. | learn-arduino.md §1.8 L188 | should | screenshot |
| LA-066 | The viewbar must have Turn left ("Turn left (Q)"), Turn right ("Turn right (E)"), Zoom out ("Zoom out (−)") and Zoom in ("Zoom in (+)") buttons, each with a title showing its shortcut and an aria-label. | learn-arduino.md §1.8 L189 | must | e2e |
| LA-067 | The viewbar must have a compass button ("Reset view (R)") whose needle follows the view's rotation and which is marked as away whenever the view is not at home. | learn-arduino.md §1.8 L189 | must | e2e |
| LA-068 | The viewbar must have a Current flow toggle ("Current flow (F)", aria "Show current flow") and a Schematic toggle ("Schematic (C)", aria "Show schematic"), both using aria-pressed and tinted when on. | learn-arduino.md §1.8 L189 | must | e2e |
| LA-069 | A hint pill above the viewbar must name the stage's controls as they work in iynk, where dragging rotates (the original's reads "Drag or WASD to pan · Q / E to rotate · Scroll to zoom"), and it must disappear 9 s after load or at the first pointer press on the stage. | learn-arduino.md §1.8 L190; SPEC.md L22 | must | e2e |
| LA-070 | must not copy: the "x.com/DilumSanjaya" credit painted on the 3D floor; iynk uses its own mark or none. | learn-arduino.md §1.8 L191; §9.2 #12 L1305 | must | review |

## LA · Info card

The four-tab card beside the figure.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-071 | The info card must have four tabs, Overview, Pinout, Example and Specifications, as a role=tablist whose arrow keys move between tabs. | learn-arduino.md §1.9 L195 | must | e2e |
| LA-072 | The active tab should be bold navy with a 4.5 px navy underline; tab labels uppercase. | learn-arduino.md §1.9 L195 | should | screenshot |
| LA-073 | Info card content should fade out and in on change, about 220 ms on a lesson change and 120 ms on a tab change. | learn-arduino.md §1.9 L196 | should | e2e |
| LA-074 | The Overview tab must show the lesson's heading, its lede and its feature list, each feature with an icon tile. | learn-arduino.md §1.9 L197 | must | e2e |
| LA-075 | The Pinout tab must show "Pinout" with the subtitle "How the Uno’s headers are grouped." in lesson 1 and "How this circuit is wired." in every other lesson. | learn-arduino.md §1.9 L198 | must | e2e |
| LA-076 | The Pinout tab must show a table with the columns Pin, Connects to and What it does, the pin cell carrying a dot in that wire's colour and the pin name as code. | learn-arduino.md §1.9 L198 | must | e2e |
| LA-077 | The Example tab must show "How the code works" and an ordered list of 4 to 5 steps that explain the lesson's sketch. | learn-arduino.md §1.9 L199 | must | e2e |
| LA-078 | The Specifications tab must show "Specifications" and a two-column grid of label and value cells. | learn-arduino.md §1.9 L200 | must | e2e |
| LA-079 | An "Expand panel" / "Collapse panel" button must make the info card tall and cover the code card (which becomes inert); Escape must collapse it. | learn-arduino.md §1.9 L201 | must | e2e |

## LA · Code card and serial monitor

"Try it yourself", highlighting, parameter chips, the run button and the serial monitor.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-080 | The code card must be headed "Try it yourself". | learn-arduino.md §1.10 L205 | must | e2e |
| LA-081 | The code card must have an "Expand code" / "Collapse code" button that makes it tall and covers the info card. | learn-arduino.md §1.10 L205 | must | e2e |
| LA-082 | The code card must have a "Copy code" button that copies the sketch with the current parameter values filled in and shows a check mark for 1.6 s. | learn-arduino.md §1.10 L205; §4.3 | must | e2e |
| LA-083 | The code card must have a Run button titled "Run sketch (Space)" that, while running, turns red, shows a stop square and is labelled "Stop sketch". | learn-arduino.md §1.10 L205 | must | e2e |
| LA-084 | The Run button must show a busy state while the sketch is compiling and uploading. | learn-arduino.md §1.10 L205 | must | e2e |
| LA-085 | The code must be set in a monospace face with a line-number gutter. | learn-arduino.md §1.10 L206 | must | e2e |
| LA-086 | The highlighter must colour these keywords as keywords: void int long const for if else while return unsigned bool float char byte sizeof Servo, and HIGH LOW INPUT OUTPUT INPUT_PULLUP LED_BUILTIN A0 true false. | learn-arduino.md §1.10 L207 | must | unit |
| LA-087 | The highlighter must colour any identifier followed by "(" as a function call, except setup and loop. | learn-arduino.md §1.10 L208 | must | unit |
| LA-088 | The highlighter must colour numbers, "strings" and // comments (comments faint italic), and colour an #include line's directive as a keyword and the rest as a string. | learn-arduino.md §1.10 L209-210 | must | unit |
| LA-089 | Highlight colours should be keywords and numbers #2a56a3, functions #c0652d, strings #3f8a4f and comments faint italic. | learn-arduino.md §1.10 L207-209 | should | screenshot |
| LA-090 | Every lesson parameter must appear in the code as a chip (teal text on a light teal background with an underline) titled "Click to change"; clicking it must select its part and open its control. | learn-arduino.md §1.10 L211; §4.3 | must | e2e |
| LA-091 | While a sketch runs, the line being executed must be marked (a 3 px teal bar and a teal tint). | learn-arduino.md §1.10 L212; §4.6 | must | e2e |
| LA-092 | When a parameter changes, the lines it changes must flash orange for 1.4 s and the changed chips must flash teal for 0.9 s. | learn-arduino.md §1.10 L212; §4.2 | must | e2e |
| LA-093 | While a part is selected, the chips that belong to it must be outlined. | learn-arduino.md §1.10 L212; §4.3 | must | e2e |
| LA-094 | The serial monitor must slide up over the bottom of the code area as soon as a sketch starts uploading, with a head showing a status dot, "Serial monitor", the status and a × button ("Stop sketch"). | learn-arduino.md §1.10 L213 | must | e2e |
| LA-095 | The serial monitor status must read "Uploading" (orange pulsing dot), "Running" (teal dot with a halo) or "Stopped" (grey dot). | learn-arduino.md §1.10 L214 | must | e2e |
| LA-096 | Serial lines must be monospace, keep at least the last 40 lines and auto-scroll to the newest. | learn-arduino.md §1.10 L215 | must | e2e |
| LA-097 | The serial monitor must be resizable by dragging its grip or head, between 92 px and the code area height minus 48, and double-clicking the grip must reset it to 92 px. | learn-arduino.md §1.10 L216 | must | e2e |
| LA-098 | The serial monitor grip must be keyboard-operable: ArrowUp and ArrowDown change the height by 16 px, PageUp and PageDown by 64 px. | learn-arduino.md §1.10 L216; §5.7 | must | e2e |
| LA-099 | The serial monitor height must be saved and restored on reload; in the compact layout it stays fixed at 92 px. | learn-arduino.md §1.10 L216; §7 | must | e2e |
| LA-100 | Starting an upload must clear the previous serial lines. | learn-arduino.md §1.10 L217 | must | e2e |

## LA · Lessons strip

The horizontal strip of lesson cards.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-101 | The lessons strip must be headed "Lessons" and hold one card per lesson, each with a thumbnail of that lesson's circuit, the numbered title, a hidden check badge and a chevron. | learn-arduino.md §1.11 L221 | must | e2e |
| LA-102 | Lesson cards should be 91 px tall with a 9 px radius and a 12 px gap, each card and thumbnail sized to its content (e.g. board 316/124, blink 249/72, project 286/96). | learn-arduino.md §1.11 L221-223 | should | screenshot |
| LA-103 | Lesson thumbnails must be rendered from the same figures the lesson uses, not shipped as separate pictures. | learn-arduino.md §1.11 L225; SPEC.md L125 | must | review |
| LA-104 | Lesson card titles must be uppercase and numbered, lesson 1 breaking onto two lines ("1. Meet the / board"). | learn-arduino.md §1.11 L224 | must | e2e |
| LA-105 | The active lesson card must have a 2 px deep-teal border and a bold title and carry aria-current="step". | learn-arduino.md §1.11 L224 | must | e2e |
| LA-106 | A completed lesson's card must show a check badge, and on first completion the card must play a short bounce (0.7 s, lift 5 px, scale 1.02). | learn-arduino.md §1.11 L224 | must | e2e |
| LA-107 | The strip must scroll horizontally with the wheel (vertical wheel mapped to horizontal) and by mouse drag (5 px threshold, a drag does not count as a click). | learn-arduino.md §1.11 L226 | must | e2e |
| LA-108 | Round ‹ and › buttons ("Earlier lessons" / "More lessons") must appear only when there is more content to that side, and step by 70% of the visible width. | learn-arduino.md §1.11 L226 | must | e2e |
| LA-109 | The active lesson card must be scrolled into view with a 40 px margin whenever the lesson changes. | learn-arduino.md §1.11 L226 | must | e2e |
| LA-110 | must not copy: the compact-layout footer credit "Designed by x.com/DilumSanjaya". | learn-arduino.md §1.12 L228-230; §9.2 #12 L1305 | must | review |

## LA · Phone and compact layout

The stacked layout below the compact threshold.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-111 | The compact layout must stack the regions in this order: brand with status, stage, lessons, info card, code card, footer, scrolling as one page with room for the bottom nav and the safe area. | learn-arduino.md §1.13 L234-243 | must | e2e |
| LA-112 | In the compact layout the brand should shrink (logo about 58×32, title 22 px) and the status should become a small progress card (about 200×52) with a 13 px clock. | learn-arduino.md §1.13 L245-246 | should | screenshot |
| LA-113 | In the compact layout the stage must be a bordered rounded card with a height of clamp(300px, 58vh, 660px), showing tags instead of callout cards, no minimap and no hint, with the viewbar centred. | learn-arduino.md §1.13 L247 | must | e2e |
| LA-114 | In the compact layout the inspector must dock to the bottom of the stage (width min(420 px, 100% − 20 px), max height 56%, sliding up) and the view must pan so the selected part stays visible above it. | learn-arduino.md §1.13 L248 | must | e2e |
| LA-115 | In the compact layout lesson cards must be scaled to about 0.8 (74 px tall), the info and code cards must be full width and the info tabs must scroll horizontally. | learn-arduino.md §1.13 L249 | must | e2e |
| LA-116 | In the compact layout the code area must grow with its content up to 440 px at 14.5 px text, and gain bottom padding while the 92 px serial monitor covers it. | learn-arduino.md §1.13 L249 | must | e2e |
| LA-117 | In the compact layout the sidebar must become a fixed bottom nav (62 px plus the safe area) with all six items spread out and the active item marked with a 3 px bar. | learn-arduino.md §1.13 L250 | must | e2e |
| LA-118 | In the compact layout the flyouts must open as bottom sheets (10 px from each side, 72 px plus the safe area from the bottom, max height min(70vh, 560 px)). | learn-arduino.md §1.13 L250 | must | e2e |
| LA-119 | At a width of 600 px or less the compact layout must be a single column. | learn-arduino.md §1.13 L251 | must | e2e |
| LA-120 | In landscape with a height of 600 px or less the layout must be two columns, with the stage sticky on the left at the full viewport height minus 16 px, the panels on the right and the nav back as a left rail. | learn-arduino.md §1.13 L252 | must | e2e |

## LA · Lesson 1, Meet the board

The Uno explorer: callouts, hoverable parts, tabs, the first sketch and the board's geometry.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-121 | Lesson 1 must show the bare Uno with no breadboard, six callout cards, and all 27 board parts hoverable and clickable. | learn-arduino.md §2 L258 | must | e2e |
| LA-122 | Lesson 1 must have a "USB Port" callout reading "Connects to your computer for programming and power.", anchored on the USB-B port. | learn-arduino.md §2.1 L264 | must | e2e |
| LA-123 | Lesson 1 must have a "Microcontroller" callout reading "ATmega328P runs your code.", anchored on the DIP chip. | learn-arduino.md §2.1 L265 | must | e2e |
| LA-124 | Lesson 1 must have a "Digital Pins" callout reading "Pins 0–13 for digital input/output. (~ PWM on some pins)", its leader approaching the digital header from above. | learn-arduino.md §2.1 L266 | must | e2e |
| LA-125 | Lesson 1 must have a "Power Jack" callout reading "External DC power (7–12V recommended).", anchored on the barrel jack. | learn-arduino.md §2.1 L267 | must | e2e |
| LA-126 | Lesson 1 must have a "Power Pins" callout reading "5V, 3.3V, GND and VIN for power.", anchored on the power header. | learn-arduino.md §2.1 L268 | must | e2e |
| LA-127 | Lesson 1 must have an "Analog Pins" callout reading "A0–A5 for reading analog signals.", anchored on the analog header. | learn-arduino.md §2.1 L269 | must | e2e |
| LA-128 | Hovering a board part must lift it (1.6 units over 220 ms in the original) and show its tooltip. | learn-arduino.md §2.2 L273 | must | e2e |
| LA-129 | Clicking a board part must select it, marking it with a teal ring and opening the inspector with its name, its description and "Zoom to it". | learn-arduino.md §2.2 L273 | must | e2e |
| LA-130 | Clicking the bare PCB ("Arduino Uno R3", "Hover the parts to learn what they do.") must clear the selection rather than select the board. | learn-arduino.md §2.2 L273, L304 | must | e2e |
| LA-131 | The Uno's connectors must carry these descriptions: USB-B port "Uploads sketches and powers the board from your computer."; DC power jack "Run the board from a 7–12 V adapter or battery."; Reset button "Restarts your sketch from the top."; ICSP header "Programs the ATmega328P directly, without the bootloader."; ICSP header (USB chip) "Programs the ATmega16U2 USB interface.". | learn-arduino.md §2.2 L277-282 | must | e2e |
| LA-132 | The Uno's chips and clocks must carry these descriptions: ATmega328P "The 8-bit microcontroller that runs your code at 16 MHz."; ATmega16U2 "Turns USB into serial so your computer can talk to the board."; 16 MHz crystal "Keeps time for the USB interface chip."; 16 MHz resonator "Clocks the ATmega328P.". | learn-arduino.md §2.2 L280, L284-285, L291 | must | e2e |
| LA-133 | The Uno's power parts must carry these descriptions: 47 µF capacitor (two) "Smooths the supply voltage."; Resettable fuse "Protects your USB port from short circuits."; 5 V regulator "Steps the jack voltage down to a steady 5 V."; LMV358 op-amp "Switches between USB and jack power automatically."; Protection diode "Blocks reverse voltage from the power jack."; Transistor (three SOT-23) "A tiny switch used by the power circuitry."; Ferrite bead "Filters noise on the USB supply.". | learn-arduino.md §2.2 L283-292 | must | e2e |
| LA-134 | The Uno's LEDs must carry these descriptions: “L” LED "Wired to pin 13 — blinks with LED_BUILTIN."; TX LED "Flickers when the board sends serial data."; RX LED "Flickers when the board receives serial data."; Power LED "Lit whenever the board has power.". | learn-arduino.md §2.2 L293-296 | must | e2e |
| LA-135 | The Uno's small passives must be hoverable with these descriptions: Resistor "A surface-mount resistor." (many 0603); Capacitor "A surface-mount decoupling capacitor." (many 0603); Resistor network "Four resistors in one package.". | learn-arduino.md §2.2 L297-299 | must | e2e |
| LA-136 | The Uno's headers must carry these descriptions: Digital pins 8–13 "Plus GND, AREF and the I²C pins SDA/SCL."; Digital pins 0–7 "Pins 0 and 1 double as serial RX/TX."; Power pins "5 V, 3.3 V, GND and VIN for your circuits."; Analog pins A0–A5 "Read voltages between 0 and 5 V.". | learn-arduino.md §2.2 L300-303 | must | e2e |
| LA-137 | In lesson 1 the Components flyout must read "9 in view" and list ATmega328P, USB-B port, DC power jack, Reset button, Digital pins 8–13, Power pins, Analog pins A0–A5, ATmega16U2 and 16 MHz crystal. | learn-arduino.md §2.2 L306 | must | e2e |
| LA-138 | Lesson 1's Overview must be headed "Arduino Uno", explain that the Uno is a popular, easy ATmega328P board for learning electronics, programming and prototyping, and list "Open-source hardware", "Wide community support" and "Used in education, hobby projects, and real-world applications". | learn-arduino.md §2.3 L310 | must | e2e |
| LA-139 | Lesson 1's Pinout must list D0–D13 (Digital I/O, "Read buttons, drive LEDs. ~3, 5, 6, 9, 10, 11 do PWM."), A0–A5 (Analog in, "10-bit readings, 0–1023 for 0–5 V."), 5V · 3.3V (Power out, "Regulated supply for sensors and modules."), GND (Ground, "Every circuit returns here."), VIN (Power in, "Raw jack voltage, 7–12 V.") and RESET (Reset, "Pull LOW to restart the sketch."). | learn-arduino.md §2.3 L311-320 | must | e2e |
| LA-140 | Lesson 1's Pinout dots should be D0–D13 #2a56a3, A0–A5 #1aa3a1, 5V · 3.3V #d64a3a, GND #2f3547, VIN #c0652d and RESET #8e9094. | learn-arduino.md §2.3 L315-320 | should | screenshot |
| LA-141 | Lesson 1's Example must explain setup() (runs once at power-up or reset), pinMode(LED_BUILTIN, OUTPUT) (pin 13, the on-board L LED, becomes an output), loop() (repeats forever) and digitalWrite(…, HIGH) (puts 5 V on the pin), then tell the user to press Run, watch TX and RX flicker and the L LED come on, and click any part. | learn-arduino.md §2.3 L322 | must | e2e |
| LA-142 | Lesson 1's Specifications must read: Microcontroller ATmega328P, Operating voltage 5 V, Input voltage 7–12 V, Digital I/O pins 14 (6 PWM), Analog inputs 6, Flash memory 32 KB, SRAM / EEPROM 2 KB / 1 KB, Clock speed 16 MHz, Size 68.6 × 53.4 mm. | learn-arduino.md §2.3 L323; §9.1 L1282 | must | e2e |
| LA-143 | Running lesson 1 must play the upload sequence with TX and RX flickering, then log `pinMode(13, OUTPUT)` and `D13 → HIGH` as pin activity and light the L LED, which stays lit. | learn-arduino.md §2.4 L337 | must | e2e |
| LA-144 | Lesson 1's schematic must show D13 → 1 kΩ → LED "L" → ground, with the note "The LED marked L, on the board itself". | learn-arduino.md §2.4 L337 | must | e2e |
| LA-145 | must not copy: leaving the HIGH-only Blink unexplained; lesson 1 must say that the L LED stays lit because nothing writes LOW and that delay(1000) does nothing useful yet, and show how adding digitalWrite(LED_BUILTIN, LOW) and a second delay(1000) makes it blink. | learn-arduino.md §9.2 #6 L1299; SPEC.md L37-39 | must | e2e |
| LA-146 | The Uno figure's PCB must be 68.58 × 53.34 × 1.6 mm with the real outline (corner notches at 66.04/68.58 mm) and mounting holes at (13.97, 2.54), (15.24, 50.8), (66.04, 7.62) and (66.04, 35.56) mm. | learn-arduino.md §2.5 L341 | must | review |
| LA-147 | The Uno figure's headers must sit at the real positions: 10-pin and 8-pin digital headers along y 50.8 mm (SCL at x 18.8 through D0 at 63.5 mm), the 8-pin power header along y 2.54 (IOREF 30.48 through VIN 45.72 mm) and A0–A5 at 50.8 + n·2.54 mm. | learn-arduino.md §2.5 L342-343 | must | review |
| LA-148 | The Uno figure's silkscreen must read SCL SDA AREF GND 13 12 ~11 ~10 ~9 8 7 ~6 ~5 4 ~3 2 TX→1 RX←0 on the digital header and IOREF RESET 3.3V 5V GND GND VIN on the power header, with "DIGITAL (PWM~)", "POWER", "ANALOG IN", "UNO", RESET, ICSP, L/TX/RX/ON and the reference designators. | learn-arduino.md §2.5 L344 | must | review |
| LA-149 | The Uno figure must place its parts where the real board has them: USB-B, barrel jack, reset button, DIP-28 ATmega328P, both ICSP headers, two 47 µF caps, the crystal by the 16U2, the QFN ATmega16U2 at 45°, polyfuse, SOT-223 regulator, SOIC-8 op-amp, SMA diode, three SOT-23s, the resonator by the 328P, the ferrite, amber L/TX/RX LEDs, the green ON LED and the 0603 passives. | learn-arduino.md §2.5 L345 | must | review |
| LA-150 | The Uno figure must default to a royal-blue PCB (the cobalt palette) with black female headers, a black DIP-28, a silver USB-B and a black barrel jack, the silhouette that makes the board recognisable. | learn-arduino.md §2.5 L346 | must | screenshot |
| LA-151 | iynk must state that the 16 MHz resonator clocks the ATmega328P and the 16 MHz crystal clocks the ATmega16U2 USB bridge. | learn-arduino.md §9.1 L1282 | must | review |

## LA · Lesson structure and shared lesson rules

What every Uno lesson has, the completion rule, the breadboard and the inspector hints.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-152 | Every Uno lesson must have a title, a card title, a heading, a lede, three or four features with icons, a pinout table, four or five example steps, five specs, its parameters, its code, its callouts and its simulation. | learn-arduino.md §3 L352 | must | review |
| LA-153 | A lesson must count as done the first time its Run finishes uploading (compile then upload, then the simulation starts) while it is still the current lesson. | learn-arduino.md §3 L353; §4.4 | must | e2e |
| LA-154 | iynk should add lesson completion criteria beyond pressing Run, such as a short check or a goal the circuit must reach. | learn-arduino.md §10 L1312 | should | e2e |
| LA-155 | The default breadboard must be a half-size board with 23 columns (1–23) and rows a–e and f–j, labelled at column 1 and every fifth column, without power rails, at 2.54 mm pitch. | learn-arduino.md §3 L355 | must | review |
| LA-156 | Wiring tables must name the Uno's top-header ground beside D13 "GND" and the two power-header grounds "GND1" and "GND2". | learn-arduino.md §3 L355 | must | review |
| LA-157 | Jumper wires should use the palette red #d64a3a, navy #2f3547, orange #f0a53a, yellow #f0b53a, green #3fae6a, blue #3d6fc4, coral #ee7f62, purple #8a63c9 and brown #7a5034, with red for 5 V and navy for ground. | learn-arduino.md §3 L356 | should | screenshot |
| LA-158 | The inspector must show the interaction hint for each kind of part: slide "or drag it in the scene", knob "or drag around the knob", press "Hold it down in the scene", squeeze "Press it in the scene, then drag down to push harder", tap "or click a weight in the scene". | learn-arduino.md §3 L357 | must | e2e |
| LA-159 | A part with parameters but no direct interaction in the figure must show a "Run to see it" button in its inspector that runs the sketch. | learn-arduino.md §3 L357 | must | e2e |
| LA-160 | Every inspector must have a "Zoom to it" button. | learn-arduino.md §3 L357 | must | e2e |

## LA · Lesson 2, Blink an LED

LED, resistor and pin 13.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-161 | Lesson 2 must be carded "2. Blink an LED" with a red LED thumbnail, headed "Blink an LED", explain that the first circuit is an LED and a resistor on a breadboard switched by pin 13, and list "Digital output with digitalWrite()", "Click the resistor to try other values" and "Click the LED to change its colour and timing". | learn-arduino.md §3.2 L370-372 | must | e2e |
| LA-162 | Lesson 2's Pinout must list D13 (Resistor → LED (+), "The sketch switches this pin HIGH and LOW.") and GND (LED (−), "The short leg returns current to the board."). | learn-arduino.md §3.2 L373 | must | e2e |
| LA-163 | Lesson 2 must wire D13 (orange) to a10, a 220 Ω resistor across b10–b14, the LED anode at c14 and cathode at c15, and GND (navy) to a15. | learn-arduino.md §3.2 L374 | must | e2e |
| LA-164 | Lesson 2's Specifications must read: LED 5 mm, 1.8–3.2 V forward; Max current 20 mA; Resistor 220 Ω (red-red-brown); LED current ≈ (5 − 2) ÷ 220 ≈ 14 mA; Pin 13 limit 40 mA absolute max. | learn-arduino.md §3.2 L375 | must | e2e |
| LA-165 | Lesson 2's Example must explain the named constant LED_PIN = 13, pinMode, the HIGH-wait-LOW-wait loop where the two delays set the rhythm, and that a bigger resistor dims the LED (try 10 kΩ). | learn-arduino.md §3.2 L376 | must | e2e |
| LA-166 | The LED's inspector must offer "Colour" swatches Red #e8392e, Yellow #f2c23a, Green #3fbf6a, Blue #3d7be0 and White #f2efe6 (default red, the label showing the colour's name), recolouring the LED and its schematic symbol. | learn-arduino.md §3.2 L378 | must | e2e |
| LA-167 | The LED's inspector must offer "On for" and "Off for" sliders, 50–2000 ms in steps of 50, each defaulting to 500 ms. | learn-arduino.md §3.2 L378 | must | e2e |
| LA-168 | The resistor's inspector must offer "Resistance" as 220 Ω ("About 14 mA: bright and safe."), 1 kΩ ("About 3 mA: noticeably dimmer.") or 10 kΩ ("About 0.3 mA: barely glowing."). | learn-arduino.md §3.2 L379 | must | e2e |
| LA-169 | Changing the resistance must swap the resistor in the figure for one with the right colour bands (old one out, new one in) and relabel the schematic. | learn-arduino.md §3.2 L379 | must | e2e |
| LA-170 | Lesson 2's code must be the LED_PIN = 13 Blink with digitalWrite HIGH, delay(on), digitalWrite LOW, delay(off), both delay values shown as parameter chips. | learn-arduino.md §3.2 L380-393 | must | e2e |
| LA-171 | Lesson 2's LED must be lit while (elapsed time mod (on + off)) is below the on time. | learn-arduino.md §3.2 L395 | must | unit |
| LA-172 | LED brightness must follow b = min(1, (I / 13.6 mA)^0.55) with I = (5 − Vf) / R and Vf red 2.0, yellow 2.1, green 2.2, blue 3.0, white 3.1 V, so red at 220 Ω gives 13.6 mA and b = 1, 1 kΩ gives b ≈ 0.44 and 10 kΩ gives b ≈ 0.12. | learn-arduino.md §3.2 L395; §9.1 L1284 | must | unit |
| LA-173 | The LED's lens and glow should scale with b (the original: emissive 0.05 + 1.4·b, glow opacity 0.85·b). | learn-arduino.md §3.2 L395 | should | screenshot |
| LA-174 | In every lesson that drives pin 13, the on-board L LED must mirror D13. | learn-arduino.md §3.2 L395 | must | e2e |
| LA-175 | Lesson 2 must log `D13 → HIGH` and `D13 → LOW` on every change as pin activity, not as serial output. | learn-arduino.md §3.2 L396; §9.2 #1 | must | e2e |
| LA-176 | While lesson 2 runs, the D13 wire's chip must read "HIGH" or "LOW" and the ground wire's chip "GND". | learn-arduino.md §3.2 L398 | must | e2e |
| LA-177 | Lesson 2's callouts must read: LED "Lights up whenever pin 13 goes HIGH."; Pin 13 "Your sketch switches it HIGH and LOW."; GND "The short leg (−) returns current here."; Resistor "Stops the LED drawing too much current."; Built-in LED "The “L” LED mirrors pin 13 on the board.". | learn-arduino.md §3.2 L399 | must | e2e |
| LA-178 | Lesson 2's schematic must show D13 → R (its label following the chosen ohms) → LED (its colour following the chosen colour) → ground. | learn-arduino.md §3.2 L400 | must | e2e |

## LA · Lesson 3, Push a button

Digital input with a pull-down, hold and toggle logic.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-179 | Lesson 3 must be carded "3. Push a button" with a red tactile-button thumbnail, headed "Push a button", explain that the button ties pin 2 to 5 V while held and a pull-down keeps it at 0 V when released, and list "Click and hold the button in the scene", "Read a pin with digitalRead()" and "Switch between “hold” and “toggle” logic". | learn-arduino.md §3.3 L406-408 | must | e2e |
| LA-180 | Lesson 3's Pinout must list 5V (Button (left), "One side of the switch."), D2 (Button (right) + 10 kΩ, "Reads HIGH while the button is held."), GND (10 kΩ pull-down, "Pulls D2 LOW when the button is up.") and D13 (220 Ω → LED, "The output you control."). | learn-arduino.md §3.3 L409 | must | e2e |
| LA-181 | Lesson 3 must wire the button across the trench on columns 8 and 10 (rows e/f), 5V (red) to a8, D2 (blue) to a10, a 10 kΩ across b10–b14, GND (navy) to a14, D13 (orange) to a15, a 220 Ω across b15–b19, the LED at c19/c20 and a flat navy bridge e14 → e20. | learn-arduino.md §3.3 L410 | must | e2e |
| LA-182 | Lesson 3's Specifications must read: Button 12 mm tactile switch; Pull-down 10 kΩ to GND; Logic levels LOW < 1.5 V, HIGH > 3 V; Bounce Contacts chatter for ~5 ms; Tip INPUT_PULLUP needs no resistor. | learn-arduino.md §3.3 L411; §9.1 L1285 | must | e2e |
| LA-183 | Lesson 3's Example must explain that INPUT makes pin 2 listen, digitalRead is HIGH while held, the LED copies the button in hold mode, and toggle mode remembers the last reading and flips on each new press. | learn-arduino.md §3.3 L412 | must | e2e |
| LA-184 | The button's inspector must offer "Logic" as Hold ("The LED is on only while you hold the button.", default) or Toggle ("Each press flips the LED on or off."), and switching it must change the code. | learn-arduino.md §3.3 L413 | must | e2e |
| LA-185 | Lesson 3's LED must offer the same Colour swatches as lesson 2. | learn-arduino.md §3.3 L413 | must | e2e |
| LA-186 | The user must be able to press and hold the button cap in the figure, the cap moving down (1.3 units over 90 ms) and pin 2 reading HIGH for as long as it is held. | learn-arduino.md §3.3 L413 | must | e2e |
| LA-187 | Lesson 3's Hold code must read BUTTON = 2 and LED = 13 as INPUT and OUTPUT and write digitalRead(BUTTON) straight to the LED. | learn-arduino.md §3.3 L414-428 | must | e2e |
| LA-188 | Lesson 3's Toggle code must keep last and lit, flip lit on a rising edge (now == HIGH && last == LOW), write it to the LED, wait delay(30) with the comment "// debounce", then store last = now. | learn-arduino.md §3.3 L429-451 | must | e2e |
| LA-189 | In hold mode the LED must follow the button; in toggle mode it must flip once per rising edge of pin 2 and ignore the release. | learn-arduino.md §3.3 L452 | must | unit |
| LA-190 | Lesson 3 must log `D2 → LOW` and `D2 → HIGH (pressed)` on every change, as pin activity. | learn-arduino.md §3.3 L453; §9.2 #1 | must | e2e |
| LA-191 | Lesson 3's callouts must read: Push Button "Click and hold it — pin 2 reads HIGH."; Pull-down "10 kΩ keeps pin 2 LOW when released."; LED "Your sketch decides when it lights."; Pin 2 (input) "digitalRead() sees HIGH or LOW.". | learn-arduino.md §3.3 L454 | must | e2e |
| LA-192 | Lesson 3's schematic must show the D2 node with the button up to 5V and the 10 kΩ down to ground, and D13 → 220 Ω → LED → ground. | learn-arduino.md §3.3 L455 | must | e2e |

## LA · Lesson 4, Turn a knob

Potentiometer, analogRead and PWM.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-193 | Lesson 4 must be carded "4. Turn a knob" with a pot thumbnail, headed "Turn a knob", explain that a potentiometer's middle leg moves from 0 to 5 V and the analog pin turns that into a number, and list "Drag around the knob to turn it", "analogRead() gives 0–1023" and "analogWrite() dims the LED, 0–255". | learn-arduino.md §3.4 L461-463 | must | e2e |
| LA-194 | Lesson 4's Pinout must list 5V (Pot (left), "Top of the voltage divider."), A0 (Pot (middle), "The wiper: 0–5 V as you turn."), GND (Pot (right), "Bottom of the divider.") and ~D9 (220 Ω → LED, "PWM output sets the brightness."). | learn-arduino.md §3.4 L464 | must | e2e |
| LA-195 | Lesson 4 must wire the pot legs at e9, e10 and e11, 5V (red) to a9, A0 (green) to a10, GND1 (navy) to a11, D9 (orange) to a15, a 220 Ω across b15–b19, the LED at c19/c20 and a bridge b11 → e20. | learn-arduino.md §3.4 L465 | must | e2e |
| LA-196 | Lesson 4's Specifications must read: Potentiometer 10 kΩ linear, 270° travel; ADC 10-bit, 0–1023; Resolution ≈ 4.9 mV per step; PWM 8-bit, 0–255 at ~490 Hz; Read time ≈ 100 µs per analogRead(). | learn-arduino.md §3.4 L466; §9.1 L1283 | must | e2e |
| LA-197 | Lesson 4's Example must explain that analogRead maps 0 V to 0 and 5 V to 1023, dividing by 4 fits PWM's 0–255, and analogWrite pulses pin 9 fast enough to look dimmed. | learn-arduino.md §3.4 L467 | must | e2e |
| LA-198 | The pot's inspector must offer "Knob position", 0–1023 in steps of 1, default 620, and lesson 4's LED must offer the Colour swatches. | learn-arduino.md §3.4 L468 | must | e2e |
| LA-199 | Dragging around the knob in the figure must turn it, mapping the drag angle at 1023/270° per unit, with the knob drawn at −(value/1023·270 − 135)°. | learn-arduino.md §3.4 L468 | must | e2e |
| LA-200 | Lesson 4's code must read A0, write analogRead/4 to pin 9 with analogWrite, print the value with Serial.println at Serial.begin(9600), and delay(50). | learn-arduino.md §3.4 L469-485 | must | e2e |
| LA-201 | Lesson 4 must compute pwm = floor(n/4) from n = round(knob), show the A0 chip as (n/1023·5) V to two decimals and the D9 chip as "PWM xx%", and set the LED's brightness to pwm/255 of its 220 Ω brightness. | learn-arduino.md §3.4 L486 | must | unit |
| LA-202 | Lesson 4 must show a readout above the pot "{n} → {pwm}" (e.g. "620 → 155"). | learn-arduino.md §3.4 L486 | must | e2e |
| LA-203 | Lesson 4's serial monitor must print the value the sketch prints; if it shows fewer lines than the sketch's 50 ms rate (the original throttles to one per 300 ms), it must say that the display is throttled. | learn-arduino.md §3.4 L487; §9.2 #2 | must | e2e |
| LA-204 | Lesson 4's callouts must read: Potentiometer "Drag around the knob to turn it."; Pin A0 "Reads the knob as a number, 0–1023."; LED "Brightness follows the knob."; Pin ~9 (PWM) "Dims the LED with fast pulses.". | learn-arduino.md §3.4 L489 | must | e2e |

## LA · Lesson 5, Mix colours

RGB LED with three PWM channels.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-205 | Lesson 5 must be carded "5. Mix colours" with a purple RGB LED thumbnail, headed "Mix colours", explain that an RGB LED is three LEDs under one milky lens blended by PWM, and list "One PWM pin per colour, 0–255 each", "Light mixes: red + green makes yellow" and "Click the LED to mix your own colour". | learn-arduino.md §3.5 L495-497 | must | e2e |
| LA-206 | Lesson 5's Pinout must list ~D9 (220 Ω → Red leg), ~D10 (220 Ω → Green leg), ~D11 (220 Ω → Blue leg), each "Brightness of the {colour} LED.", and GND (Common (longest leg), "All three LEDs return here."). | learn-arduino.md §3.5 L498 | must | e2e |
| LA-207 | Lesson 5 must wire the RGB legs at d15 (R), d16 (common), d17 (G) and d18 (B), 220 Ω resistors across b11–b15, b17–b21 and c18–c22 (raised to cross over), D9 (coral) to a11, D10 (green) to a21, D11 (blue) to a22 and GND (navy) to a16. | learn-arduino.md §3.5 L499 | must | e2e |
| LA-208 | Lesson 5's Specifications must read: LED 5 mm RGB, common cathode; Forward voltage R 2.0 V · G 3.0 V · B 3.0 V; Resistors 3 × 220 Ω; Colours 256³ ≈ 16.7 million; PWM pins used ~9, ~10, ~11. | learn-arduino.md §3.5 L500 | must | e2e |
| LA-209 | The RGB LED's inspector must offer presets Purple (170,0,255), Pink (255,30,110), Orange (255,90,0), Yellow (255,190,0), Teal (0,200,150) and White (255,255,255), and Red, Green and Blue sliders 0–255 (defaults 170, 0, 255) on tinted tracks. | learn-arduino.md §3.5 L501 | must | e2e |
| LA-210 | Picking an RGB preset must set the three sliders, and moving a slider must re-select the matching preset or show "Custom". | learn-arduino.md §3.5 L501; §4.2 | must | unit |
| LA-211 | Lesson 5's code must analogWrite the red, green and blue values (as parameter chips) to pins 9, 10 and 11 in loop, with delay(100). | learn-arduino.md §3.5 L502-520 | must | e2e |
| LA-212 | The RGB LED's glow intensity must be max(r,g,b)/255 and its hue (r,g,b)/max, with a readout "R 170 · G 0 · B 255". | learn-arduino.md §3.5 L521 | must | unit |
| LA-213 | Lesson 5 must log `analogWrite(9, 170)  analogWrite(10, 0)  analogWrite(11, 255)` on every change, as pin activity. | learn-arduino.md §3.5 L522; §9.2 #1 | must | e2e |
| LA-214 | Lesson 5's callouts must read: RGB LED "Three colours in one lens — click it to mix."; Pins ~9 ~10 ~11 "One PWM pin for each colour."; GND "The longest leg is the shared ground."; 3 Resistors "220 Ω on each colour keeps the current safe.". | learn-arduino.md §3.5 L523 | must | e2e |

## LA · Lesson 6, Sense light

LDR divider and a night light.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-215 | Lesson 6 must be carded "6. Sense light" with a red desk-lamp thumbnail, headed "Sense light", explain that an LDR conducts better in light and with a fixed resistor makes a voltage for a night light, and list "Read brightness with analogRead()", "Drag the lamp away, or switch it off" and "Switch the LED on below a threshold". | learn-arduino.md §3.6 L529-531 | must | e2e |
| LA-216 | Lesson 6's Pinout must list 5V (LDR (left leg), "Top of the voltage divider."), A0 (LDR + 10 kΩ, "The middle of the divider: higher when brighter."), GND (10 kΩ, "Bottom of the divider."), ~D9 (220 Ω → LED, "The night light.") and GND (LED (−), "The LED’s return path."). | learn-arduino.md §3.6 L532 | must | e2e |
| LA-217 | Lesson 6 must wire D9 (orange) to a8, a 220 Ω across b8–b12, the LED at c12/c13, GND (navy) to a13, 5V (red) to a20, the LDR at c20/c21, A0 (green) to a21, a 10 kΩ across b17–b21 and GND1 (navy) to a17, with a desk lamp on the table aimed at the LDR. | learn-arduino.md §3.6 L533 | must | e2e |
| LA-218 | Lesson 6's Specifications must read: LDR GL5528 photoresistor; In daylight ≈ 10–20 kΩ; In the dark ≈ 1 MΩ; Divider resistor 10 kΩ to GND; Response time ≈ 20–30 ms. | learn-arduino.md §3.6 L534 | must | e2e |
| LA-219 | The lamp's inspector must offer "Lamp distance" 5–50 cm in steps of 1 (default 18) and a "Lamp switched on" toggle (default on), and the user must be able to drag the lamp along its aiming axis in the figure. | learn-arduino.md §3.6 L535 | must | e2e |
| LA-220 | The LDR's inspector must offer "Dark below", 50–1000 in steps of 10, default 400, shown as the threshold chip in the code. | learn-arduino.md §3.6 L535 | must | e2e |
| LA-221 | Lesson 6's code must print analogRead(A0) with the comment "// more light = higher" and switch the LED HIGH ("// dark: night light on") when the reading is below the threshold, else LOW, then delay(100). | learn-arduino.md §3.6 L536-556 | must | e2e |
| LA-222 | Lesson 6's reading must be round(70 + 930 / (1 + (distance/14)²)) with the lamp on and 70 with it off, plus uniform noise of ±6 re-sampled every 100 ms, clamped to 0–1023 (18 cm ≈ 421, 5 cm ≈ 895, 50 cm ≈ 138, off ≈ 70). | learn-arduino.md §3.6 L558 | must | unit |
| LA-223 | Lesson 6's LED must light when the reading is below the threshold, the lamp's light cone and floor pool must scale with (reading − 70)/930, and a readout must show "light {v}", adding " · dark" when dark. | learn-arduino.md §3.6 L558 | must | e2e |
| LA-224 | Lesson 6's serial monitor must print the reading the sketch prints (saying so if it throttles the display), and on each state change log `{v} < {limit} · dark, night light ON` or `{v} ≥ {limit} · bright, night light off` as pin activity. | learn-arduino.md §3.6 L559; §9.2 #1-2 | must | e2e |
| LA-225 | Lesson 6's callouts must read: Night Light "Comes on when the reading says “dark”."; Light Sensor "Less resistance the more light it gets."; Pin A0 "Reads the divider as 0–1023."; Desk Lamp "Drag it away, or switch it off.". | learn-arduino.md §3.6 L560 | must | e2e |
| LA-226 | must not copy: the night light that is always yellow; lesson 6's LED must offer the same Colour swatches as lessons 2–4. | learn-arduino.md §9.2 #11 L1304 | must | e2e |

## LA · Lesson 7, Read a sensor (HC-SR04)

Ultrasonic ranging with swappable obstacles.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-227 | Lesson 7 must be carded "7. Read a sensor" with an HC-SR04 thumbnail, headed "Read a sensor", explain that the HC-SR04 sends ultrasound and times the echo (click the obstacle to swap it, or drag it closer), and list "Trigger a ping, time the echo with pulseIn()", "Every 58 µs of echo is about 1 cm" and "Swap the obstacle: some echo better than others". | learn-arduino.md §3.7 L566-568 | must | e2e |
| LA-228 | Lesson 7's Pinout must list 5V (VCC, "Powers the sensor."), GND (Gnd, "Common ground."), D9 (Trig, "A 10 µs HIGH pulse starts a ping.") and D10 (Echo, "Stays HIGH for as long as the sound travels."). | learn-arduino.md §3.7 L569 | must | e2e |
| LA-229 | Lesson 7 must stand the sensor on the breadboard edge facing out with pins on columns 10–13 (VCC, Trig, Echo, Gnd), wired from row e: 5V (red) to e10, D9 (yellow) to e11, D10 (green) to e12, GND1 (navy) to e13. | learn-arduino.md §3.7 L570 | must | e2e |
| LA-230 | Lesson 7's Specifications must read: Range 2–400 cm; Resolution ≈ 3 mm; Frequency 40 kHz; Beam angle ≈ 15°; Supply 5 V, 15 mA. | learn-arduino.md §3.7 L571 | must | e2e |
| LA-231 | The obstacle's inspector must offer Car (default), Box, Ball and Wall, described as Toy car "Its flat bumper sends back a clear echo.", Cardboard box "Flat and hard: a strong, steady echo.", Beach ball "Round surfaces scatter the sound, so readings wobble." and Brick wall "A big flat surface: the cleanest echo of all.". | learn-arduino.md §3.7 L572-573 | must | e2e |
| LA-232 | The obstacle's inspector must offer "Distance" 5–50 cm in steps of 1 (default 30) and "Drive back and forth while running" (default on), and the sensor's inspector "Read every" 50–1000 ms in steps of 50 (default 100, the code's chip). | learn-arduino.md §3.7 L572 | must | e2e |
| LA-233 | The user must be able to drag the obstacle in the figure; the first drag must turn the back-and-forth sweep off, and the toy car's wheels must turn as it moves. | learn-arduino.md §3.7 L572-573 | must | e2e |
| LA-234 | Lesson 7's code must pulse TRIG (pin 9) HIGH for delayMicroseconds(10), compute cm = pulseIn(ECHO, HIGH) / 58, print it and delay(interval). | learn-arduino.md §3.7 L574-594 | must | e2e |
| LA-235 | While the sweep is on, the obstacle's distance must follow gap = 26 + 20·sin((t − t0)·0.00055 − 0.4) cm (6–46 cm, period about 11.4 s), written back into the parameter so the inspector and code follow it. | learn-arduino.md §3.7 L596 | must | unit |
| LA-236 | Each reading must be 0 (no echo) with the obstacle's miss chance, else max(2, round(gap ± jitter)), with jitter ±0.4 cm for the car, ±0.2 for the box, ±2.6 for the ball (8% no echo) and 0 for the wall. | learn-arduino.md §3.7 L597, L573 | must | unit |
| LA-237 | After each ping the D9 chip must show "PULSE" for 70 ms and the D10 chip the echo time (or "NO ECHO"). | learn-arduino.md §3.7 L598 | must | e2e |
| LA-238 | must not copy: an unlabelled echo time in milliseconds; the echo pulse must be shown in µs (cm·58), and any slowed-down animation of it must be labelled as slowed. | learn-arduino.md §9.2 #8 L1301; §3.7 L598 | must | e2e |
| LA-239 | Lesson 7 must show outgoing ultrasonic rings every 220 ms that return as echo arcs, a dashed tape measure on the floor, and a readout "{cm} cm" or "no echo" midway between sensor and obstacle. | learn-arduino.md §3.7 L599 | must | e2e |
| LA-240 | must not copy: appending " cm" to a sketch that prints only the number; the serial monitor must print exactly what the sketch prints (change the sketch to print the unit if the unit should show). | learn-arduino.md §3.7 L600; §9.2 #1 | must | e2e |
| LA-241 | iynk must state the HC-SR04 facts: 40 kHz, 2–400 cm, a 10 µs trigger pulse and cm = echo µs / 58 for the round trip. | learn-arduino.md §9.1 L1286 | must | review |
| LA-242 | Lesson 7's callouts must read: HC-SR04 "Pings at 40 kHz and times the echo."; Trig · Echo "Pin 9 fires the ping, pin 10 hears the echo."; 5V · GND "Power for the sensor, straight from the board."; Obstacle "Click to swap it, drag to move it.". | learn-arduino.md §3.7 L601 | must | e2e |

## LA · Lesson 8, Make a sound

Passive piezo, tone() and a melody array.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-243 | Lesson 8 must be carded "8. Make a sound" with a black buzzer thumbnail, headed "Make a sound", explain that a piezo clicks each time its pin flips and hundreds of flips a second make a note, which is what tone() does, and list "Play notes with tone(pin, Hz, ms)", "Store a tune in an array" and "Click the buzzer to pick a tune and tempo". | learn-arduino.md §3.8 L607-609 | must | e2e |
| LA-244 | Lesson 8's Pinout must list D8 (Buzzer (+), "Toggled at the note’s frequency.") and GND (Buzzer (−), "Return path."), wired with the buzzer at e11 (+) and e14 (−), D8 (orange) to a11 and GND (navy) to a14. | learn-arduino.md §3.8 L610-611 | must | e2e |
| LA-245 | Lesson 8's Specifications must read: Buzzer Passive piezo, 12 mm; Range ≈ 100 Hz – 10 kHz; Middle C 262 Hz; A above 440 Hz; Tip An active buzzer only beeps at one pitch. | learn-arduino.md §3.8 L612 | must | e2e |
| LA-246 | The buzzer's inspector must offer "Tune" as Scale ("C major, one octave."), Twinkle ("Twinkle, twinkle, little star.", default) or Ode to Joy ("Beethoven’s Ninth, first phrase."), "Note length" 80–500 ms in steps of 10 (default 220) and "Speaker volume" 0–100% in steps of 5 (default 40). | learn-arduino.md §3.8 L613 | must | e2e |
| LA-247 | The tunes must be scale 262 294 330 349 392 440 494 523; twinkle 262 262 392 392 440 440 392 349 349 330 330 294 294 262; ode 330 330 349 392 392 349 330 294 262 262 294 330 330 294 294 (Hz), laid out in the code 4, 7 and 5 values per line. | learn-arduino.md §3.8 L614 | must | unit |
| LA-248 | Lesson 8's code must hold the melody array, N = sizeof(melody) / sizeof(int), and in loop call tone(BUZZER, melody[i], note) then delay(note + 50) for each note, then delay(1000); both note values are chips. | learn-arduino.md §3.8 L615-634 | must | e2e |
| LA-249 | Each note must sound for the note length, the next must start note + 50 ms later, and a 1000 ms rest must follow the last note. | learn-arduino.md §3.8 L635 | must | unit |
| LA-250 | Lesson 8 must play each note as a square wave at gain 0.06·volume, only while Settings → Sound is on, with a ring pulsing from the buzzer on each note. | learn-arduino.md §3.8 L635; §4.10 | must | e2e |
| LA-251 | The note name must be derived as n = round(12·log2(hz/440)) + 57, named C C# D D# E F F# G G# A A# B by n mod 12 with octave floor(n/12) (262 Hz → C4), shown in a readout "♪ {name}". | learn-arduino.md §3.8 L635 | must | unit |
| LA-252 | While a note sounds, the D8 chip must show "{hz} Hz", and "LOW" between notes. | learn-arduino.md §3.8 L635 | must | e2e |
| LA-253 | Lesson 8 must log `tone(8, 262, 220)  C4` for each note as pin activity, not as serial output. | learn-arduino.md §3.8 L636; §9.2 #1 | must | e2e |
| LA-254 | Lesson 8's callouts must read: Piezo Buzzer "Click it to pick a tune and tempo."; Pin 8 "tone() toggles it at the note’s pitch."; GND "The buzzer’s other leg."; Timer (on the chip) "A hardware timer keeps each note in tune.". | learn-arduino.md §3.8 L637 | must | e2e |

## LA · Lesson 9, Mini piano

Eight INPUT_PULLUP keys and a buzzer on a full-size breadboard.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-255 | Lesson 9 must be carded "9. Mini piano" with a thumbnail of coloured key caps, headed "Build a mini piano", explain that each key shorts its pin to ground so the internal pull-ups replace resistors and tone() plays the held key, and list "Eight keys, one note each, Do to Do", "INPUT_PULLUP: no resistors needed" and "Press the keys, or let it play a tune". | learn-arduino.md §3.9 L643-645 | must | e2e |
| LA-256 | Lesson 9's Pinout must list D2–D9 (Keys, Do to high Do, "Pulled up inside the Uno: LOW while the key is down."), D10 (Buzzer (+), "tone() plays the note here.") and GND (Back − rail, "The other leg of every key, and the buzzer’s (−)."). | learn-arduino.md §3.9 L646 | must | e2e |
| LA-257 | Lesson 9 must use a full-size breadboard (30 columns with + and − rails) turned 90°, with keys across the trench at columns 29, 26, 23, 20, 17, 14, 11 and 8, each D(2+i) wire in its key's colour to row a beside the key, a flat navy wire from the key's other leg to the − rail, the buzzer at d2/d5 with D10 (brown) to a2, and GND to the − rail. | learn-arduino.md §3.9 L647 | must | e2e |
| LA-258 | The keys must be coloured #e8392e, #f08a2e, #f2c23a, #3fae6a, #1aa3a1, #3d6fc4, #8a63c9 and #e36fa5, named "Key 1: Do (C)" through "Key 7: Si (B)" and "Key 8: Do (high C)", and described "Run the sketch, then press and hold it to play its note.". | learn-arduino.md §3.9 L647 | must | e2e |
| LA-259 | Lesson 9's Specifications must read: Keys 8 tactile switches, 6 mm; Notes C4–C5 (or C5–C6); Pull-ups Built in, about 20–50 kΩ; Buzzer Passive piezo on D10; Breadboard Full size, with power rails. | learn-arduino.md §3.9 L648 | must | e2e |
| LA-260 | The buzzer's inspector must offer "Play by itself" as No, I play ("Press and hold the keys in the scene.", default), Scale ("Up the keys and back down."), Twinkle ("Twinkle, twinkle, little star.") or Ode to Joy ("Beethoven, on eight keys."). | learn-arduino.md §3.9 L650 | must | e2e |
| LA-261 | The buzzer's inspector must offer "Octave" C4–C5 (default) or C5–C6 ("Every frequency doubled.", NOTES 523 587 659 698 784 880 988 1047) and "Note names" Do Re Mi (default) or C D E, each changing the code's arrays. | learn-arduino.md §3.9 L651-652, L686 | must | e2e |
| LA-262 | The user must be able to press and hold any key in the figure to play it, and pressing a key must never open the inspector. | learn-arduino.md §3.9 L653 | must | e2e |
| LA-263 | Auto-play must use a 330 ms beat, release each key at 80% of its duration, pause 1400 ms at the end and start 400 ms after the tune is chosen, playing scale 0,1,2,3,4,5,6,7(2),6,5,4,3,2,1,0(2), twinkle 0,0,4,4,5,5,4(2),3,3,2,2,1,1,0(2) and ode 2,2,3,4,4,3,2,1,0,0,1,2,2(1.5),1(.5),1(2) (key index, beats). | learn-arduino.md §3.9 L654 | must | unit |
| LA-264 | Lesson 9's code must set KEYS 2–9 as INPUT_PULLUP ("// HIGH until pressed"), find the pressed key (LOW: key down), and on a change tone() the key's NOTES entry and Serial.println its NAMES entry, or noTone() when released. | learn-arduino.md §3.9 L655-685 | must | e2e |
| LA-265 | A key must count as down when the user holds it or the auto tune holds it, the highest index must win, and pins D2–D9 must read LOW while their key is down. | learn-arduino.md §3.9 L687 | must | unit |
| LA-266 | When a key starts, lesson 9 must show a float note "♪ {name}" in the key's colour, play a continuous square tone (gain 0.06·0.5) until release, pulse rings every 240 ms, show a readout "♪ Sol · 392 Hz" and the D10 chip "{hz} Hz"; auto-played keys must visibly sink. | learn-arduino.md §3.9 L687 | must | e2e |
| LA-267 | Lesson 9's serial monitor must print the note name the sketch prints for each new key (e.g. "Sol"); the hint "Press and hold a key to play it." (shown only with the tune off) must be shown as an iynk note, not as serial output. | learn-arduino.md §3.9 L688 | must | e2e |
| LA-268 | Lesson 9's callouts must read: The − rail "One long ground strip for every key."; Passive buzzer "tone() sets the note it plays."; Keys "Hold one down to play its note."; Pins 2–9 "INPUT_PULLUP: HIGH until pressed.". | learn-arduino.md §3.9 L690 | must | e2e |
| LA-269 | Lesson 9's schematic must show D2 to D9 each through a button to a shared "GND rail", D10 → buzzer → ground, and the note "Pulled up inside the Uno: HIGH until a key is pressed". | learn-arduino.md §3.9 L691 | must | e2e |

## LA · Lesson 10, Control a motor

TIP120 low-side switch and a PWM ramp.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-270 | Lesson 10 must be carded "10. Control a motor" with a DC motor thumbnail, headed "Control a motor", explain that a pin cannot power a motor so a transistor switches it and PWM sets the speed, and list "Speed from 0 to 255 with analogWrite()", "TIP120 switches the motor current" and "Click the motor to change the ramp". | learn-arduino.md §3.10 L697-699 | must | e2e |
| LA-271 | Lesson 10's Pinout must list ~D6 (1 kΩ → Base, "PWM signal from the sketch."), 5V (Motor (+), "Motor supply."), — (Motor (−) → Collector, "The transistor completes the motor circuit.") and GND (Emitter, "Shared ground."). | learn-arduino.md §3.10 L700 | must | e2e |
| LA-272 | Lesson 10 must wire D6 (orange) to a9, a 1 kΩ (brown-black-red-gold) across b9–b13, the TIP120 at c13 (B), c14 (C) and c15 (E), GND (navy) to a15, and the off-board motor's + (red) to the 5V header and − (navy) to a14. | learn-arduino.md §3.10 L701 | must | e2e |
| LA-273 | Lesson 10's Specifications must read: Motor 3–6 V DC, ~200 mA; Transistor TIP120 Darlington, 5 A; Base resistor 1 kΩ (brown-black-red); PWM on pin 6 ≈ 980 Hz; Tip Add a flyback diode across the motor. | learn-arduino.md §3.10 L702; §9.1 L1283 | must | e2e |
| LA-274 | must not copy: a motor circuit with no flyback diode and no word on the TIP120's drop; the circuit and schematic must include a flyback diode across the motor, and the lesson must say the Darlington drops about 1–2 V so the motor sees roughly 3–4 V from 5 V. | learn-arduino.md §9.2 #7 L1300; §3.10 L702 | must | e2e |
| LA-275 | The motor's inspector must offer "Top speed" 50–255 in steps of 5 (default 255) and "Ramp step" 1–25 in steps of 1 (default 5), both chips in the code. | learn-arduino.md §3.10 L703 | must | e2e |
| LA-276 | Lesson 10's code must ramp analogWrite(MOTOR, s) from 0 to the top speed by the ramp step with delay(40), hold for delay(1500), then write 0 and wait delay(1500). | learn-arduino.md §3.10 L704-721 | must | e2e |
| LA-277 | Lesson 10 must model steps = floor(top/step), a ramp of (steps + 1)·40 ms with u = min(steps, floor(t/40))·step, a 1500 ms hold at steps·step and 1500 ms at 0, the prop easing to u/255·26 rad/s with a 380 ms time constant speeding up and 900 ms coasting down. | learn-arduino.md §3.10 L722 | must | unit |
| LA-278 | Lesson 10 must show a readout of the prop speed as a percentage, the D6 chip as PWM %, and the motor wires' chips "5 V" and "MOTOR −". | learn-arduino.md §3.10 L722 | must | e2e |
| LA-279 | Lesson 10 must log `analogWrite(6, {u})` at 0, at each multiple of 50 and at the top speed (0, 50, 100, 150, 200, 250, 255, 0 at the defaults) as pin activity. | learn-arduino.md §3.10 L723; §9.2 #1 | must | e2e |
| LA-280 | Lesson 10's callouts must read: Transistor "A small base current switches the motor."; 1 kΩ Resistor "Keeps the base current safe for the pin."; Pin ~6 (PWM) "analogWrite() sets the speed, 0–255."; DC Motor "Click it to change the ramp.". | learn-arduino.md §3.10 L724 | must | e2e |

## LA · Lesson 11, Sense heat

TMP36 thermostat with a fan.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-281 | Lesson 11 must be carded "11. Sense heat" with a hairdryer thumbnail, headed "Sense heat", explain that the TMP36 outputs 0.5 V at 0 °C plus 10 mV/°C and a fan turns on above a limit like a tiny thermostat, and list "analogRead() to degrees in one line", "Drag the hairdryer closer, or switch it off" and "The fan cools the sensor and holds the limit". | learn-arduino.md §3.11 L730-732 | must | e2e |
| LA-282 | Lesson 11's Pinout must list 5V (TMP36 Vs (left), "Power for the sensor."), A0 (TMP36 Vout (middle), "0.5 V plus 10 mV per °C."), GND (TMP36 GND (right), "Ground.") and ~D6 (1 kΩ → Base, "Switches the fan through the transistor."). | learn-arduino.md §3.11 L733 | must | e2e |
| LA-283 | Lesson 11 must wire D6 (orange) to a9, a 1 kΩ across b9–b13, the TIP120 at c13–c15, GND (navy) to a15, the TMP36 at c19 (+Vs), c20 (Vout) and c21 (GND), 5V to a19, A0 to a20, GND1 to a21, fan + to e19 and fan − to e14, with the hairdryer aimed at the sensor. | learn-arduino.md §3.11 L734 | must | e2e |
| LA-284 | Lesson 11's Specifications must read: Sensor TMP36, −40 to 125 °C; Output 10 mV/°C, 750 mV at 25 °C; Accuracy ±2 °C; Fan 5 V DC, switched by a TIP120; Reading every 200 ms. | learn-arduino.md §3.11 L735; §9.1 L1287 | must | e2e |
| LA-285 | The hairdryer's inspector must offer "Hairdryer distance" 5–40 cm in steps of 1 (default 14) and "Hairdryer switched on" (default on), and the user must be able to drag the hairdryer in the figure. | learn-arduino.md §3.11 L736 | must | e2e |
| LA-286 | The TMP36's inspector must offer "Fan on above" 24–45 °C in steps of 1 (default 30), and the fan's "Fan speed" On / off ("Full speed above the limit, off below it.", default) or Ramp ("Faster the hotter it gets: full speed 8 °C over the limit."). | learn-arduino.md §3.11 L736 | must | e2e |
| LA-287 | Lesson 11's code must convert the reading to volts and then to tempC = (volts − 0.5) · 100.0, print tempC, and in On / off mode write 255 ("// too warm: fan on") above the limit or 0, or in Ramp mode write constrain((tempC − limit) · 32, 0, 255), then delay(200). | learn-arduino.md §3.11 L737-765 | must | e2e |
| LA-288 | must not copy: mixing /1023 and /1024; iynk must use one ADC conversion (raw · 5.0 / 1024.0 or / 1023.0) everywhere and say which one and why. | learn-arduino.md §9.2 #9 L1302 | must | review |
| LA-289 | Lesson 11's thermal model must use heat = 34 / (1 + ((distance − 3)/12)²) °C with the dryer on (0 off), target = 22 + heat − fanSpeed/26·9, T easing to target with a 2200 ms time constant from T0 = 22 + heat·0.5. | learn-arduino.md §3.11 L767-769 | must | unit |
| LA-290 | Every 200 ms lesson 11 must read T ± 0.15 and set pwm = clamp(trunc((T − limit)·32), 0, 255) in Ramp mode or 255/0 around the limit in On / off mode, the fan easing to pwm/255·26 (420 ms on, 1100 ms off). | learn-arduino.md §3.11 L770-771 | must | unit |
| LA-291 | At the defaults (14 cm) lesson 11 must settle near 31.5 °C with the fan at 100% in On / off mode and near 33.4 °C at 43% in Ramp mode. | learn-arduino.md §3.11 L773 | must | unit |
| LA-292 | Lesson 11's A0 chip must show (0.5 + T/100) V to two decimals, a readout "{T} °C" to one decimal, and the hairdryer an airflow stream while on. | learn-arduino.md §3.11 L772 | must | e2e |
| LA-293 | Lesson 11's serial monitor must print the temperature the sketch prints; the fan speed (the original appends "  ·  fan 100%") must be shown separately as pin activity unless the sketch prints it. | learn-arduino.md §3.11 L774; §9.2 #1 | must | e2e |
| LA-294 | must not copy: lesson 11's transistor text copied from the motor lesson; the TIP120 in lesson 11 must be described as switching the fan's current. | learn-arduino.md §9.2 #5 L1298 | must | e2e |
| LA-295 | Lesson 11's callouts must read: TMP36 "Its voltage climbs 10 mV for every degree."; Fan "On above the limit; it cools the sensor."; Hairdryer "Drag it closer to heat the sensor."; Pin A0 "analogRead() sees the sensor’s volts.". | learn-arduino.md §3.11 L775 | must | e2e |

## LA · Lesson 12, Sweep a servo

SG90 on the Servo library.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-296 | Lesson 12 must be carded "12. Sweep a servo" with a blue SG90 thumbnail, headed "Sweep a servo", explain that a servo knows its position and holds any angle from 0 to 180°, and list "Position with arm.write(angle)", "The Servo library makes the pulses for you" and "Click the servo to change the sweep". | learn-arduino.md §3.12 L781-783 | must | e2e |
| LA-297 | Lesson 12 must use no breadboard: the servo cable goes brown to GND2, red to 5V and orange to D9, and the Pinout must list GND (Brown wire, "Ground."), 5V (Red wire, "Power for the motor.") and D9 (Orange wire, "Signal: a 0.5–2.4 ms pulse every 20 ms."). | learn-arduino.md §3.12 L784-785 | must | e2e |
| LA-298 | Lesson 12's Specifications must read: Servo SG90 micro, 9 g; Travel 0–180°; Speed ≈ 0.1 s per 60°; Torque 1.8 kg·cm at 4.8 V; Signal 50 Hz, 0.5–2.4 ms pulses. | learn-arduino.md §3.12 L786; §9.1 L1288 | must | e2e |
| LA-299 | The servo's inspector must offer "From" 0–175° in steps of 5 (default 0), "To" 5–180° in steps of 5 (default 180) and "Step delay" 2–40 ms in steps of 1 (default 12). | learn-arduino.md §3.12 L787 | must | e2e |
| LA-300 | From must stay below To by at least 5°, pushing the other value when one is moved. | learn-arduino.md §3.12 L787; §4.2 | must | unit |
| LA-301 | Lesson 12's code must attach the servo to pin 9 and sweep arm.write(a) up from From to To and back down with delay(step) per degree, the three values shown as chips. | learn-arduino.md §3.12 L788-807 | must | e2e |
| LA-302 | Lesson 12 must step the angle 1° every step delay and bounce between From and To (2.16 s per sweep at the defaults), drawing the horn at (90 − angle)°. | learn-arduino.md §3.12 L808 | must | unit |
| LA-303 | Lesson 12 must show a readout "{angle}°" and the D9 chip the pulse width (0.5 + angle/180·1.9) ms to one decimal. | learn-arduino.md §3.12 L808 | must | e2e |
| LA-304 | Lesson 12 must log `arm.write({angle})` each time the angle enters a new 15° band, as pin activity. | learn-arduino.md §3.12 L809; §9.2 #1 | must | e2e |
| LA-305 | Lesson 12's callouts must read: SG90 Servo "Click it to change how far it sweeps."; Pin 9 (signal) "Pulse width sets the angle."; 5V · GND "The servo’s red and brown wires.". | learn-arduino.md §3.12 L810 | must | e2e |

## LA · Lesson 13, Spin the wheel

28BYJ-48 stepper on a ULN2003 turning a prize wheel.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-306 | Lesson 13 must be carded "13. Spin the wheel" with a prize-wheel thumbnail, headed "Spin the wheel", explain that a stepper turns in exact steps and counting them lands the wheel in the middle of a segment, and list "wheel.move(n) turns exactly n steps", "Four coils switched in turn: watch LEDs A–D" and "Press the button to spin". | learn-arduino.md §3.13 L816-818 | must | e2e |
| LA-307 | Lesson 13's Pinout must list D8–D11 (IN1–IN4, "One pin per coil, through the ULN2003."), 5V · GND (Driver + and −, "The coils need more current than a pin can give.") and D2 (Button, "HIGH while pressed (10 kΩ pull-down)."). | learn-arduino.md §3.13 L819 | must | e2e |
| LA-308 | Lesson 13 must wire the button as in lesson 3 (cols 8/10, 5V to a8, D2 to a10, 10 kΩ across b10–b14, GND to a14), D8→IN1 (orange), D9→IN2 (yellow), D10→IN3 (green), D11→IN4 (purple), GND2 to driver − and b8 to driver + (5 V), with the 28BYJ-48 on a wooden base and its 5-wire cable. | learn-arduino.md §3.13 L820 | must | e2e |
| LA-309 | The prize wheel must have eight segments clockwise, 50 #ee7f62, 100 #1aa3a1, 200 #f2c23a, AGAIN #2f3d5c, 500 #3fae6a, ×2 #8a63c9, 1000 #f0a53a and JACKPOT #d64a3a, under a pointer flapper. | learn-arduino.md §3.13 L820-821 | must | e2e |
| LA-310 | Lesson 13's Specifications must give Motor 28BYJ-48, 5 V; Steps per turn with the true figure (about 2038 full steps, from a gearbox of about 63.68 : 1 that is often sold as 64 : 1 and 2048); Driver ULN2003 Darlington array; Speed ≈ 15 RPM from a standstill, more with a ramp; and the steps per segment. | learn-arduino.md §3.13 L822; §9.2 #4 L1297 | must | e2e |
| LA-311 | must not copy: claiming 2048 steps make an exact turn; the lesson must use the real ≈ 2037.9 steps per turn, or explain that 2048 drifts by about 10 steps a turn, and its callout must not promise that the wheel never drifts. | learn-arduino.md §9.2 #4 L1297 | must | e2e |
| LA-312 | must not copy: a 24 RPM default; the stepper's top-speed default must be a speed a 28BYJ-48 reaches at 5 V (about 15 RPM), with higher values marked as needing acceleration and possibly stalling. | learn-arduino.md §9.2 #4 L1297; §3.13 L823 | must | e2e |
| LA-313 | The stepper's inspector must offer "Top speed" in RPM (range 6–28 in steps of 1), "Acceleration" 200–3000 steps/s² in steps of 100 (default 1200), "Whole turns first" 0–3 (default 1) and "Direction" Clockwise (default) or Anticlockwise, which changes the ahead formula and the sign of the move. | learn-arduino.md §3.13 L823 | must | e2e |
| LA-314 | Lesson 13's code must use AccelStepper FULL4WIRE on pins 8, 10, 9, 11 (IN1, IN3, IN2, IN4) with the comment that explains that order, set max speed from RPM and acceleration, seed random from analogRead(A0), and on a button press move (turns·SEGMENTS + ahead)·(steps per segment), runToPosition(), then print "Landed on " and the prize. | learn-arduino.md §3.13 L824-859; §9.1 L1289 | must | e2e |
| LA-315 | A spin must pick a random prize, set the total steps to (turns·8 + ahead) segments, and follow the trapezoid v = min(maxV, v + a·dt, max(√(2·a·remaining), a·dt)) with maxV = rpm·steps per turn/60. | learn-arduino.md §3.13 L861-862 | must | unit |
| LA-316 | While the stepper turns, the ULN2003's LEDs A–D must show the two-phase full-step sequence 1100, 0110, 0011, 1001, and the D8–D11 chips must read "STEPS". | learn-arduino.md §3.13 L863 | must | e2e |
| LA-317 | The pointer must flick as each segment boundary passes (decaying in about 90 ms), and a readout must show "step {n} / {total}" and then "{prize}!" on landing. | learn-arduino.md §3.13 L864 | must | e2e |
| LA-318 | The user must be able to press the button in the figure to spin while running, and presses during a spin must be ignored. | learn-arduino.md §3.13 L861, L865 | must | e2e |
| LA-319 | Lesson 13's serial monitor must print "Landed on {prize}" as the sketch prints it (×2 printed as "x2"); "Press the button to spin the wheel!" and "Spinning to {prize}: {n} steps" must be shown as iynk notes, not as serial output. | learn-arduino.md §3.13 L866; §9.2 #1 | must | e2e |
| LA-320 | Lesson 13's callouts must read: Stepper motor with the true step count (about 2038 steps a turn, in place of the original's "Exact steps: 2048 make a turn."); ULN2003 driver "LEDs A–D light with the coils."; Push button "Press it to spin the wheel."; Pins 8–11 "One pin for each coil.". | learn-arduino.md §3.13 L867; §9.2 #4 L1297 | must | e2e |
| LA-321 | Lesson 13's schematic must show the D2 button node (button to 5V, 10 kΩ to ground) and D8–D11 into a ULN2003 block on IN1–IN4 with + to 5V and − to GND, driving a "STEPPER" motor symbol. | learn-arduino.md §3.13 L868 | must | e2e |

## LA · Lesson 14, Smart plant

Capacitive soil sensor and an SSD1306 OLED.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-322 | Lesson 14 must be carded "14. Smart plant" with a potted-plant thumbnail, headed "Smart plant monitor", explain that a soil sensor and an OLED show moisture and a mood (let it dry, then hold the watering can over it), and list "map() turns the reading into 0–100 %", "Text and a bar on a 128 × 64 OLED screen" and "Hold the watering can down to water the plant". | learn-arduino.md §3.14 L874-876 | must | e2e |
| LA-323 | Lesson 14's Pinout must list 5V · GND (Sensor VCC and GND, "Power for the soil sensor."), A0 (Sensor AOUT, "Lower the wetter the soil is."), 3V3 · GND (OLED VCC and GND, "The screen runs on 3.3 V.") and SCL · SDA (OLED SCL and SDA, "I²C: a clock and a data line (the same pins as A5 and A4)."). | learn-arduino.md §3.14 L877 | must | e2e |
| LA-324 | Lesson 14 must seat the OLED at g4 GND, g5 VCC, g6 SCL and g7 SDA, wired GND (navy) to j4, 3V3 (coral) to j5, SCL (blue) to j6 and SDA (purple) to j7, with the soil sensor in the pot cabled straight to GND1, 5V and A0. | learn-arduino.md §3.14 L878 | must | e2e |
| LA-325 | Lesson 14's Specifications must read: Sensor Capacitive soil moisture v1.2, 3.3–5.5 V; Output About 2.5 V in dry air, 1.3 V in water; Screen 0.96″ OLED, 128 × 64, SSD1306; Bus I²C, address 0x3C; Reading Every 500 ms. | learn-arduino.md §3.14 L879 | must | e2e |
| LA-326 | must not copy: implying the OLED's I²C bus is 3.3 V; lesson 14 must say the OLED is powered from 3V3 while the Uno's SDA/SCL are 5 V logic with the Wire library's pull-ups to 5 V, and that most SSD1306 modules tolerate this. | learn-arduino.md §9.2 #10 L1303 | must | e2e |
| LA-327 | The OLED's inspector must offer "“Water me!” below" 10–50% in steps of 5 (default 30) and "“Too wet!” above" 60–95% in steps of 5 (default 85). | learn-arduino.md §3.14 L881 | must | e2e |
| LA-328 | The soil sensor's inspector must offer "Reading in dry air" 400–700 in steps of 10 (default 520) and "Reading in water" 150–400 in steps of 10 (default 260), always keeping dry − wet ≥ 20. | learn-arduino.md §3.14 L882 | must | e2e |
| LA-329 | The plant's inspector must offer "Where it stands" as Shade ("The soil dries out slowly."), Window ("Thirsty again in a few seconds.", default) or Full sun ("The soil dries out fast."). | learn-arduino.md §3.14 L883 | must | e2e |
| LA-330 | The user must be able to press and hold the watering can in the figure: it lifts and tilts over 620 ms and pours a water stream at full tilt. | learn-arduino.md §3.14 L884 | must | e2e |
| LA-331 | Lesson 14's code must map(raw, DRY, WET, 0, 100), constrain it, print it, and draw it on the SSD1306 (0x3C): the percentage at text size 3 at (0,0), a bar outline at y 28 filled to moisture·128/100, and "Water me!", "Too wet!" or "Happy :)" at size 2 at (0,46), then delay(500). | learn-arduino.md §3.14 L885-927 | must | e2e |
| LA-332 | Soil wetness w must start at 0.42, rise by 0.12 per second while watering and fall at 0.0045 (shade), 0.009 (window) or 0.018 (full sun) per second while above 0.02. | learn-arduino.md §3.14 L929 | must | unit |
| LA-333 | Every 500 ms the reading must be round(515 − 245·w ± 2) and the moisture the Arduino integer map clamp(trunc((raw − dry)·100/(wet − dry)), 0, 100), so the defaults read 412 → 41% and the window spot reaches "Water me!" after about 14 s. | learn-arduino.md §3.14 L930, L934 | must | unit |
| LA-334 | The plant's leaves must droop by clamp((0.3 − w)/0.22, 0, 1), eased over about 900 ms. | learn-arduino.md §3.14 L931 | must | e2e |
| LA-335 | The OLED must be drawn from a real 128 × 64 framebuffer with a 5 × 7 bitmap font at a 6 px advance, rendering exactly what the sketch draws. | learn-arduino.md §3.14 L932 | must | e2e |
| LA-336 | Lesson 14's chips must show A0 in volts, SDA "I²C DATA" and SCL "I²C CLOCK", with a readout "A0 = {raw}" over the sensor. | learn-arduino.md §3.14 L933 | must | e2e |
| LA-337 | Lesson 14's serial monitor must print the moisture percentage every 500 ms (e.g. "41"). | learn-arduino.md §3.14 L935 | must | e2e |
| LA-338 | Lesson 14's callouts must read: OLED screen "The sketch draws the reading on it."; Soil sensor "Reads lower the wetter the soil is."; Watering can "Hold it down to water the plant."; Pin A0 "analogRead() gives 0–1023.". | learn-arduino.md §3.14 L936; §9.1 L1290 | must | e2e |

## LA · Lesson 15, Feel the force

FSR divider, a servo needle and a bell.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-339 | Lesson 15 must be carded "15. Feel the force" with a strength-meter thumbnail, headed "Test your strength", explain that an FSR falls from MΩ to a few hundred Ω under pressure and a divider measures the push, and list "Press the pad, then drag down to push harder", "map() turns the reading into the needle’s angle", "Reach the mark and the bell rings" and "Or put a weight on it: heavier ones add less and less". | learn-arduino.md §3.15 L942-944 | must | e2e |
| LA-340 | Lesson 15's Pinout must list 5V (Force sensor, "One side of the pad (and the servo’s power)."), A0 (Force sensor + pull-down, "The divider: higher the harder you press."), GND (Pull-down, "Holds A0 at 0 V while nobody presses."), D9 (Servo signal, "Sets the needle’s angle.") and D8 (Buzzer, "Rings the bell."). | learn-arduino.md §3.15 L945 | must | e2e |
| LA-341 | Lesson 15 must lay the FSR pad in front of the breadboard with its tail at columns 13/14, 5V (red) to d13, A0 (green) to d14, the pull-down across c10–c14, GND1 (navy) to d10, the buzzer at e1/e4 with D8 (purple) to a1 and GND to a4, and the meter servo's SIG to D9, + to e13 and − to e10. | learn-arduino.md §3.15 L946 | must | e2e |
| LA-342 | The strength meter must be a framed dial marked 0, 250, 750 and 1000 with a green-yellow-red arc, a red needle and a brass bell on top, and the 50, 100, 200 and 500 g weights must sit on coasters. | learn-arduino.md §3.15 L946 | must | e2e |
| LA-343 | Lesson 15's Specifications must read: Sensor FSR 402, 18 mm round pad; Force range About 0.2–20 N (20 g to 2 kg); Resistance Over 1 MΩ untouched, a few hundred Ω pressed hard; Accuracy Good for “how hard”, not for weighing things; Needle SG90 servo, 0–180°. | learn-arduino.md §3.15 L947 | must | e2e |
| LA-344 | The pull-down's inspector must offer 1 kΩ ("Only a hard press moves the needle far."), 10 kΩ ("A good spread, from a light touch to a firm press.", default) or 100 kΩ ("A light touch already reads high; hard presses all look the same."), swapping the resistor in the figure. | learn-arduino.md §3.15 L949 | must | e2e |
| LA-345 | The weights' inspector must offer "On the pad" None (default), 50 g, 100 g, 200 g or 500 g, and tapping a weight in the figure must put it on the pad and tapping again take it off. | learn-arduino.md §3.15 L950 | must | e2e |
| LA-346 | The meter's inspector must offer "Bell rings above" 500–1000 in steps of 10 (default 880, moving the bell mark to bell/1023·180°) and "Hold the best for" 0–3000 ms in steps of 250 (default 1500). | learn-arduino.md §3.15 L951 | must | e2e |
| LA-347 | The user must be able to press the FSR in the figure and drag down to push harder (squeeze from 0.4 up to 1.0 over 140 px, minimum 0.05) while a finger presses the pad; the FSR and weights open their inspector only while the sketch is stopped. | learn-arduino.md §3.15 L952 | must | e2e |
| LA-348 | Lesson 15's code must track best and bestAt with millis() (a harder press takes over; after the hold time the needle lets go), write map(best, 0, 1023, 0, 180) to the servo, tone(BELL, 1568, 400) once above the bell mark and re-arm below mark − 100, and print the force and the FSR's ohms (PULLDOWN·(1023 − force)/force) while force > 10, with delay(20). | learn-arduino.md §3.15 L953-998 | must | e2e |
| LA-349 | The FSR load must be the weight plus a finger of 20·500^s g, and R_fsr must be 10 MΩ at no load, min(10 MΩ, 30 kΩ·(20/g)³) below 20 g, and log-log interpolated through (20 g, 30 kΩ), (100 g, 6 kΩ), (1000 g, 1 kΩ) and (10 kg, 250 Ω) above it, clamped at 250 Ω. | learn-arduino.md §3.15 L1000-1001 | must | unit |
| LA-350 | The reading must be round(1023·Rpd/(Rpd + R_fsr) ± 2), giving with 10 kΩ about 460 at 50 g, 640 at 100 g, 758 at 200 g, 870 at 500 g and 998 for a hard press. | learn-arduino.md §3.15 L1002; §9.1 L1290 | must | unit |
| LA-351 | When best passes the bell mark, lesson 15 must play 1568 Hz for 400 ms, swing the bell, show a "Ding!" float note and gold rings, and re-arm only below the mark − 100. | learn-arduino.md §3.15 L1003 | must | e2e |
| LA-352 | The needle must aim at trunc(best·180/1023) and slew at most 0.6° per ms; the D9 chip must show the pulse width, the D8 chip "1568 Hz" while ringing, and a readout "A0 = {reading}". | learn-arduino.md §3.15 L1004 | must | e2e |
| LA-353 | Lesson 15's serial monitor must print "{force}  {ohms} ohms" while force > 10 (e.g. "757  3513 ohms"); if it shows fewer lines than the sketch's 20 ms rate (the original throttles to 250 ms), it must say so. | learn-arduino.md §3.15 L1005; §9.2 #2 | must | e2e |
| LA-354 | Lesson 15's callouts must read: Strength meter "The needle swings to your best press."; The bell "Rings when the needle passes the mark."; Force sensor "Press it, then drag down to push harder."; Weights "Click one to put it on the pad, and again to take it off."; Pin A0 "Reads the divider: higher the harder you press.". | learn-arduino.md §3.15 L1006 | must | e2e |

## LA · Lesson 16, Build a project

Parking sensor: HC-SR04 and a traffic-light module.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-355 | Lesson 16 must be carded "16. Build a project", headed "Parking sensor", explain that it combines the distance sensor with a traffic light that tells the driver when to stop (click the lights to move the thresholds), and list "Decisions with comparisons", "Three outputs, one for each colour" and "Reuses the distance code from lesson 7". | learn-arduino.md §3.16 L1012-1014 | must | e2e |
| LA-356 | must not copy: lesson 16's thumbnail of two spur gears; its thumbnail must picture the parking sensor itself (sensor, traffic light and obstacle). | learn-arduino.md §3.16 L1012 | must | screenshot |
| LA-357 | Lesson 16's Pinout must list 5V · GND (Sensor power, "GND is bridged to the light module."), D9 · D10 (Trig · Echo, "Same as lesson 7."), D4 (Red, "On when the obstacle is close."), D3 (Yellow, "On in between.") and D2 (Green, "On when it is far away."). | learn-arduino.md §3.16 L1015 | must | e2e |
| LA-358 | Lesson 16 must seat the HC-SR04 on columns 8–11 (5V to e8, D9 to e9, D10 to e10, GND1 to e11) and the traffic-light module (three LEDs with built-in resistors) at b20 GND, b21 R, b22 Y and b23 G, with a bridge d11 → d20, D4 to e21, D3 to e22 and D2 to e23. | learn-arduino.md §3.16 L1016 | must | e2e |
| LA-359 | Lesson 16's Specifications must read: Parts Uno, HC-SR04, traffic light module; Wires 8 jumpers; Thresholds Adjustable; Update rate ≈ 15 times a second; Next step Add a buzzer from lesson 8. | learn-arduino.md §3.16 L1017 | must | e2e |
| LA-360 | Lesson 16 must offer lesson 7's obstacle controls, and the lights' inspector must offer "Green beyond" 10–50 cm (default 30) and "Red within" 3–45 cm (default 15), keeping red within at least 1 cm below green beyond. | learn-arduino.md §3.16 L1018 | must | e2e |
| LA-361 | Lesson 16's code must ping the HC-SR04 as in lesson 7 and write GRN = cm > far, YLW = cm > near && cm <= far and RED = cm <= near, with delay(60); both thresholds are chips. | learn-arduino.md §3.16 L1019-1042 | must | e2e |
| LA-362 | Lesson 16 must read every 60 ms and light GREEN beyond far, YELLOW above near, otherwise RED, a no-echo 0 counting as RED, with the D2, D3 and D4 chips showing HIGH or LOW. | learn-arduino.md §3.16 L1043 | must | unit |
| LA-363 | Lesson 16's sketch has no Serial, so its `{cm} cm · RED · stop!`, `· YELLOW · slow down` and `· GREEN · all clear` lines must be shown as pin activity, not as serial output. | learn-arduino.md §3.16 L1044; §9.2 #1 | must | e2e |
| LA-364 | Lesson 16's callouts must read: Distance Sensor "Keeps an eye on the obstacle."; Traffic Light "Click it to change the thresholds."; Your Logic (on the chip) "Comparisons choose which light is on."; Obstacle "Drag it closer and watch the lights.". | learn-arduino.md §3.16 L1045 | must | e2e |

## LA · Simulator: code, parameters and run cycle

How code, parameters and the simulation fit together, and how Run and Stop behave.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-365 | must not copy: canned per-lesson simulations that ignore the code; iynk must run the sketch the user sees (after any edit) and still reproduce every behaviour and number of the 16 original lessons. | learn-arduino.md §4.1 L1055; §9.2 #3 L1296; SPEC.md L88 | must | e2e |
| LA-366 | must not copy: the read-only code view; the sketch must be editable, while parameter chips keep selecting their parts and changing their values. | learn-arduino.md §4.3 L1070; §10 L1311; SPEC.md L88 | must | e2e |
| LA-367 | When the code cannot run (a syntax error, an unknown function, a wrong type), Run must report the error with its line number and must not start the simulation. | learn-arduino.md §4.1 L1055; §10 L1311; SPEC.md L88 | must | e2e |
| LA-368 | Option parameters must swap whole code blocks (e.g. lesson 3's Hold and Toggle loops) and value parameters must fill their slots, so the code always matches the inspector. | learn-arduino.md §4.1 L1053 | must | unit |
| LA-369 | Saved parameter values must be re-validated on load (ranges clamped to min and max, toggles boolean, options existing) before the lesson's constraints run. | learn-arduino.md §4.2 L1059 | must | unit |
| LA-370 | Changing a parameter must update the figure (rebuilding a changed part with a drop-in), the code (changed lines and chips flash and scroll into view), the inspector and the schematic together. | learn-arduino.md §4.2 L1060 | must | e2e |
| LA-371 | Parameter changes should be saved with a debounce of about 400 ms. | learn-arduino.md §4.2 L1060; §7 | should | unit |
| LA-372 | Values the simulation writes itself (the obstacle sweep moving the distance) must not be saved as the user's values. | learn-arduino.md §4.2 L1061 | must | unit |
| LA-373 | Clicking a code chip must select its part and pulse the matching inspector row, and selecting a part must outline its chips and scroll the first one into view. | learn-arduino.md §4.3 L1071-1072 | must | e2e |
| LA-374 | Changing a parameter while the sketch runs must take effect live, without a new upload. | learn-arduino.md §4.3 L1073 | must | e2e |
| LA-375 | Copied code must contain real blank lines and no bidi control marks, and copying must fall back to another method when the Clipboard API is unavailable. | learn-arduino.md §4.3 L1074 | must | unit |
| LA-376 | The sketch must move through the states idle, uploading, running and back to idle on Stop. | learn-arduino.md §4.4 L1079 | must | unit |
| LA-377 | Run must be startable from the Run button, the Space key, the sidebar Simulator item and an inspector's "Run to see it". | learn-arduino.md §4.4 L1081 | must | e2e |
| LA-378 | During an upload the TX and RX LEDs must flicker (about 1150 ms in the original: TX while sin(t·0.09) > 0.2, RX while sin(t·0.13 + 1) > 0.4). | learn-arduino.md §4.4 L1082 | must | e2e |
| LA-379 | An upload must log `Compiling sketch…`, then about 600 ms later `Uploading to {board}…` (the original: `Uploading to Arduino Uno…`), then about 600 ms later `Done uploading.`, naming the board actually in use. | learn-arduino.md §4.4 L1083 | must | e2e |
| LA-380 | With Reduce motion on, the upload waits must become near-instant. | learn-arduino.md §4.4 L1083; §5.6 | must | e2e |
| LA-381 | Stop must be triggered by the Run button, the serial monitor's ×, Space, the sidebar Simulator item, or switching to another lesson (Home only when not already on lesson 1); Escape must not stop the sketch. | learn-arduino.md §4.4 L1085 | must | e2e |
| LA-382 | Stopping must reset the figure (LEDs off, readouts cleared, coils off, needles to zero) and clear any tone, flow beads and line marker. | learn-arduino.md §4.4 L1086-1087 | must | e2e |
| LA-383 | After a stop the serial monitor must log `Stopped.` and show the "Stopped" status long enough to read it, keeping the last output visible (must not copy: the original slides the monitor shut at once, so "Stopped" is barely seen). | learn-arduino.md §4.4 L1088; SPEC.md L40 | must | e2e |
| LA-384 | Switching lessons mid-upload must cancel that upload, and stopping during an upload must abort it without marking the lesson done. | learn-arduino.md §4.4 L1090 | must | unit |
| LA-385 | The serial monitor must keep three kinds of line visibly apart: upload messages, what the sketch really prints, and iynk's own pin-activity notes; sketches with no Serial calls must print no serial lines. | learn-arduino.md §4.5 L1095; §9.2 #1 L1294 | must | e2e |
| LA-386 | must not copy: serial throttling that hides the real print rate (a 50 ms sketch shown at one line per 300 ms); the monitor must print at the sketch's real rate or, when it thins lines for readability, say so plainly with the real rate. | learn-arduino.md §4.5 L1096; §9.2 #2 L1295 | must | e2e |
| LA-387 | The serial monitor must be an aria-live="polite" region. | learn-arduino.md §4.5 L1097; §5.7 | must | review |
| LA-388 | The serial monitor must offer a baud-rate selector, and output must be clean only when it matches Serial.begin. | learn-arduino.md §4.5 L1094; §10 L1311 | must | e2e |
| LA-389 | The serial monitor must offer an input line that sends text to the sketch for Serial.read(). | learn-arduino.md §4.5 L1094; §10 L1311 | must | e2e |
| LA-390 | must not copy: the hand-timed line trace; the marked line must be the line the running sketch is actually executing, scrolled into view above the serial monitor. | learn-arduino.md §4.6 L1101; §9.2 #3 L1296 | must | e2e |

## LA · Simulator: pins, current flow and schematic

Pin levels, wire chips, flow beads and the live schematic panel.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-391 | Pin text must follow the pin's mode: power pins "5 V" or "3.3 V"; ground "GND"; a pull-up input HIGH above half and LOW otherwise; PWM "LOW" at 0, "HIGH" at full and "PWM {n}%" between; digital in and out HIGH or LOW; pulse, tone and servo pins their own text. | learn-arduino.md §4.7 L1105-1112 | must | unit |
| LA-392 | Current-flow strength should be 0.45 on power pins, 0 on ground, the level for outputs, 0.12 + 0.2·v for analog, 0.3·v for inputs (0.25 for a pull-up held LOW), and ground returns should carry the largest output flow (0.3 when merely powered). | learn-arduino.md §4.7 L1107-1114 | should | unit |
| LA-393 | A wire must take its signal from the pin at either end, or follow the pin that drives it (the motor wires follow D6, each key's ground wire follows its key pin). | learn-arduino.md §4.7 L1114 | must | unit |
| LA-394 | While a sketch runs with Current flow on (F), light beads must move along every carrying wire in the direction of current, faster the more current flows, fading in and out, and must disappear when the sketch stops. | learn-arduino.md §4.7 L1115 | must | e2e |
| LA-395 | Flow beads should have a #fff6d6 core with a #18213d rim, be spaced about 7 mm and move at 6 + 34·flow mm/s. | learn-arduino.md §4.7 L1115 | should | screenshot |
| LA-396 | The schematic panel (C key or viewbar) must open as a card beside the figure (at the bottom of the stage in the compact layout) headed "Schematic" with the lesson title and a "Close schematic" ×. | learn-arduino.md §4.7 L1116-1118 | must | e2e |
| LA-397 | On desktop the schematic card should be clamp(0.38 × stage width, 300 px, 460 px) wide. | learn-arduino.md §4.7 L1117 | should | screenshot |
| LA-398 | Each lesson's schematic must be generated from the lesson's netlist, with an ARDUINO (or board) block showing only the pins in use and ~ on the PWM pins 3, 5, 6, 9, 10 and 11. | learn-arduino.md §4.7 L1119 | must | unit |
| LA-399 | The schematic must draw resistors as zig-zags with their value, LEDs with arrows filled in the LED's colour, buttons, buzzers, motors (M), LDRs, FSRs, NPN transistors, pots labelled "10 kΩ", ground, VCC tees with labels, junction dots and labelled ground buses. | learn-arduino.md §4.7 L1119 | must | screenshot |
| LA-400 | The schematic must draw modules as labelled blocks: HC-SR04, TMP36, SERVO, ULN2003 with a STEPPER motor, SOIL SENSOR, OLED and LIGHTS. | learn-arduino.md §4.7 L1119 | must | screenshot |
| LA-401 | While running, schematic wires must recolour live (HIGH #e5533d, power #d64a3a, ground navy), animate dashed flow in the direction of current at a speed of 22/(14 + 70·flow) s, and print each pin's value beside it ("HIGH", "PWM 61%", "0.83 V", "0.5 ms"). | learn-arduino.md §4.7 L1120 | must | e2e |
| LA-402 | Hovering a schematic symbol must highlight its part in the figure, and clicking it must select that part. | learn-arduino.md §4.7 L1121 | must | e2e |
| LA-403 | A lesson with no circuit must show "No circuit in this lesson." in the schematic panel instead of an empty card. | learn-arduino.md §4.7 L1122 | must | e2e |
| LA-404 | The schematic must be labelled for assistive technology ("Schematic of the circuit"). | learn-arduino.md §8 L1269 | must | review |
| LA-405 | "Scheggled" must be built as the schematic toggle, not as a scheduler, a sketch gallery or locked lessons (the original has none of those). | learn-arduino.md §8 L1264-1272; SPEC.md L41, L151 | must | review |
| LA-406 | Next to the schematic, every lesson must offer a breadboard view of the same circuit, generated from the same netlist. | learn-arduino.md §8 L1274; SPEC.md L89 | must | e2e |
| LA-407 | The schematic and breadboard views must be drawn in the Colorfigures hand-inked style, not as plain vector diagrams. | learn-arduino.md §5.3 L1195; SPEC.md L154 | must | review |

## LA · Simulator: timing, API and audio

Time handling, the Arduino calls the lessons need, and sound.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-408 | The simulation clock should clamp each frame step (64 ms in the original) so a stalled or hidden tab does not make the circuit jump. | learn-arduino.md §4.8 L1126 | should | unit |
| LA-409 | delay(), millis() and micros() must follow the simulation clock in every lesson, so sketch timing matches what the figure shows. | learn-arduino.md §4.8 L1126-1127 | must | unit |
| LA-410 | Reduce motion must shorten UI transitions only; it must not change simulation timing. | learn-arduino.md §4.8 L1128 | must | e2e |
| LA-411 | The runner must support pinMode, digitalWrite, digitalRead with INPUT and INPUT_PULLUP, and delay, with the L LED mirroring pin 13. | learn-arduino.md §4.9 L1134-1136 | must | unit |
| LA-412 | The runner must support analogRead against each lesson's physical model (divider, LDR curve, TMP36, soil, FSR, with noise) and analogWrite driving LED brightness, motor and fan speed and the PWM chips. | learn-arduino.md §4.9 L1137-1138 | must | unit |
| LA-413 | The runner must support delayMicroseconds, pulseIn (with echo jitter and misses), tone(pin, hz, ms), tone(pin, hz) and noTone. | learn-arduino.md §4.9 L1139-1140 | must | unit |
| LA-414 | The runner must support the Servo library (attach, write), AccelStepper (setMaxSpeed, setAcceleration, move, runToPosition) and Wire with Adafruit_SSD1306 (begin, clearDisplay, setTextSize, setTextColor, setCursor, print, drawRect, fillRect, display). | learn-arduino.md §4.9 L1141, L1145-1146 | must | unit |
| LA-415 | The runner must support millis, map and constrain with Arduino's integer truncation, random and randomSeed. | learn-arduino.md §4.9 L1142-1144 | must | unit |
| LA-416 | The runner must support Serial.begin, Serial.print and Serial.println with Arduino's number and string formatting. | learn-arduino.md §4.9 L1147 | must | unit |
| LA-417 | The runner must support attachInterrupt and interrupts (the original has none; the robotics reaction timer needs them). | learn-arduino.md §4.9 L1149; SPEC.md L53 | must | unit |
| LA-418 | The runner should support EEPROM, Serial.read, character LCDs, IR remotes, keypads and relays, none of which the original has. | learn-arduino.md §4.9 L1149; SPEC.md L91 | should | unit |
| LA-419 | Buzzer sounds must be synthesised with Web Audio square waves, with no sample files. | learn-arduino.md §4.10 L1153 | must | review |
| LA-420 | A one-shot note should ramp its gain from 0 to 0.06·volume in 6 ms and release over the last 30 ms; a continuous tone should be reused for the same frequency and stop with a 20 ms ramp. | learn-arduino.md §4.10 L1153-1154 | should | unit |
| LA-421 | Every tone must stop when the tab is hidden. | learn-arduino.md §4.10 L1155 | must | e2e |
| LA-422 | The audio context must be created on the first Run (a user gesture), so the browser lets it play. | learn-arduino.md §4.10 L1155 | must | e2e |

## LA · Inspector and figure interaction

Selecting, operating and inspecting parts in the figure.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-423 | Hovering a part must show a hand cursor that matches how the part is operated; wires and parts that should not lift must not lift. | learn-arduino.md §4.11 L1160 | must | e2e |
| LA-424 | A plain click on a part must select it with a teal double ring sized to its footprint, open the inspector and turn the callout cards into tags; clicking empty space or the bare board must deselect. | learn-arduino.md §4.11 L1161 | must | e2e |
| LA-425 | Double-clicking a part must zoom to it (zoom factor clamp(70/size, 1.4, 2.6)), and double-clicking empty space must reset the view. | learn-arduino.md §4.11 L1162 | must | e2e |
| LA-426 | Pressing on an operable part (slider, knob, button, squeeze pad, weight) must operate that part instead of moving the view. | learn-arduino.md §4.11 L1163 | must | e2e |
| LA-427 | Dragging a sliding part (lamp, hairdryer, obstacle) must move it along its own axis and set its parameter; the first drag must stop any automatic sweep. | learn-arduino.md §4.11 L1164 | must | e2e |
| LA-428 | Held parts must animate: button caps go down 1.3 units in 90 ms, the watering can tilts in 620 ms and returns in 480 ms, the FSR finger presses in 200 ms and lifts in 240 ms. | learn-arduino.md §4.11 L1166 | must | e2e |
| LA-429 | A tap that moves less than 6 px must pick the tapped weight. | learn-arduino.md §4.11 L1168 | must | e2e |
| LA-430 | On desktop the inspector must sit in a corner of the stage on the side away from the selected part, joined to it by a leader line; on phones it docks to the bottom. | learn-arduino.md §4.11 L1169 | must | e2e |
| LA-431 | The desktop inspector card should be about 292 px wide. | learn-arduino.md §4.11 L1169 | should | screenshot |
| LA-432 | The inspector must show the part's name in uppercase with a close ×, its description, then its controls: ranges with a label and a live value with its unit (% and ° written without a space) on a filled track, switches, segmented choices with a note, and colour swatches showing the colour's name or "Custom" with a note. | learn-arduino.md §4.11 L1170-1172 | must | e2e |
| LA-433 | Arrow keys must move through an inspector's choice and swatch groups and apply the choice at once. | learn-arduino.md §4.11 L1172 | must | e2e |
| LA-434 | Escape must close the inspector, and its controls must follow values the simulation changes (the sweep moving the Distance slider). | learn-arduino.md §4.11 L1174 | must | e2e |
| LA-435 | The inspector must be a role=dialog containing radiogroups and switches with accessible names. | learn-arduino.md §5.7 L1227 | must | review |

## LA · Visual design and motion

Palette, type, part entry animation and reduced motion.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-436 | The Board Lab's light theme should keep the original's warm-paper palette (background #f6eddd, deep #efe3d1, card #f9f2e5, code #f8f0e3, lines #cec0ad, navy #18213d, ink #4f535b, muted #696d74, faint #ada293, teal #1aa3a1, deep teal #3f7f8e). | learn-arduino.md §5.1 L1182 | should | screenshot |
| LA-437 | must not copy: the light-only design; the Board Lab must have a dark theme in which the code, serial monitor, figure, schematic and every card stay legible. | learn-arduino.md §5.1 L1182; §10 L1315; SPEC.md L66 | must | screenshot |
| LA-438 | Cards should be flat warm paper with a 1.5 px line border, 9–12 px radii and a soft drop shadow. | learn-arduino.md §5.1 L1184 | should | screenshot |
| LA-439 | The Run button should be a navy gradient (#34436a to #283656) and the Stop state a red gradient (#d0614c to #b84d3a). | learn-arduino.md §5.1 L1182 | should | screenshot |
| LA-440 | Uppercase labels, titles, tabs and tags should use Barlow Semi Condensed (500/600/700), body text Barlow (400/500/600), and code, serial monitor, clock and readouts JetBrains Mono (400/500), all self-hosted. | learn-arduino.md §5.2 L1188-1190 | should | review |
| LA-441 | In Simplified Chinese and in Hindi (Devanagari) text must fall back to fonts that cover the script, and lesson titles must be resized so they fit their cards without clipping. | learn-arduino.md §5.2 L1191 | must | screenshot |
| LA-442 | When a lesson opens, its parts must drop into place one after another and its wires must draw themselves along their length with the plugs popping in; leaving parts must shrink and sink, and moved parts must hop in an arc. | learn-arduino.md §5.3 L1199 | must | e2e |
| LA-443 | Part entry should drop 46 units (the breadboard 24) with an out-back scale over 720 ms, staggered 130 ms; wires should draw in 620 ms from 650 ms, staggered 140 ms; exits should take 420 ms and hops 800 ms. | learn-arduino.md §5.3 L1199 | should | e2e |
| LA-444 | Lit LEDs must glow, wire ends must show plugs, and printed parts (PCB silk, the HC-SR04's print, the ULN2003 board, the OLED, the prize wheel, the dial) must carry their real markings. | learn-arduino.md §5.3 L1198 | must | screenshot |
| LA-445 | The floor grid should be a faint grid of 9-unit cells (#d9c7ae) fading out radially. | learn-arduino.md §5.3 L1197 | should | screenshot |
| LA-446 | Motion should follow the original's durations: callout stagger 60 ms, halo 2.8 s, tab fades 120/220 ms, code swap 180 ms, serial monitor slide 0.4 s, progress fill 0.8 s, celebrate 0.7 s, float notes 1.1 s, readout fade 0.25 s. | learn-arduino.md §5.6 L1222 | should | e2e |
| LA-447 | Reduce motion must cut UI tweens to near-instant (×0.05 in the original), show callouts without delay and stop the dashed flow animation. | learn-arduino.md §5.6 L1223 | must | e2e |

## LA · View and keyboard controls

Camera behaviour, the global shortcuts and accessibility gaps to close.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-448 | Q and E (and the viewbar's turn buttons) must turn the view by a quarter turn, in addition to free 360° rotation by dragging. | learn-arduino.md §5.4 L1203; SPEC.md L22 | must | e2e |
| LA-449 | Each lesson must have a home view framing its whole circuit in the stage; opening a lesson and the compass's reset must animate to it (about 1300 ms and 1100 ms). | learn-arduino.md §5.4 L1203, L1207 | must | e2e |
| LA-450 | Zoom should be limited (3.2 to 22 px per unit in the original) and panning bounded so the circuit can never be lost off-screen. | learn-arduino.md §5.4 L1203 | should | e2e |
| LA-451 | Panning must stay available while dragging rotates the figure: WASD and the arrow keys pan (760 px/s, Shift doubles it) and a pointer gesture pans, with fling inertia (decay about 340 ms). | learn-arduino.md §5.4 L1204, L1206; SPEC.md L22 | must | e2e |
| LA-452 | The mouse wheel must zoom around the pointer, smoothed (zoom·e^(−deltaY·0.0018), about 75 ms). | learn-arduino.md §5.4 L1204 | must | e2e |
| LA-453 | Middle-dragging should step quarter turns every 110 px. | learn-arduino.md §5.4 L1204 | should | e2e |
| LA-454 | On touch screens one finger must rotate (or pan, by mode), two fingers must pinch-zoom and pan, and a two-finger twist past 40° must turn a quarter. | learn-arduino.md §5.4 L1205; SPEC.md L128 | must | e2e |
| LA-455 | +, = and PageUp must zoom in and −, _ and PageDown zoom out by a factor of 1.3. | learn-arduino.md §5.4 L1206 | must | e2e |
| LA-456 | Global shortcuts must be ignored while typing in a field (including the code editor) or while Ctrl, Cmd or Alt is held. | learn-arduino.md §5.5 L1213 | must | e2e |
| LA-457 | Space must run or stop the sketch, except when a button has focus. | learn-arduino.md §5.5 L1214 | must | e2e |
| LA-458 | R and Home must reset the view, F must toggle Current flow and C must toggle the schematic. | learn-arduino.md §5.5 L1215 | must | e2e |
| LA-459 | The keys 1–9 and 0 must jump to lessons 1–10. | learn-arduino.md §5.5 L1216 | must | e2e |
| LA-460 | The keys [ and ] must open the previous and the next lesson. | learn-arduino.md §5.5 L1217 | must | e2e |
| LA-461 | Escape must work as a chain: deselect the part, else close the flyout, else collapse an expanded panel, else reset the view. | learn-arduino.md §5.5 L1218 | must | e2e |
| LA-462 | Lesson cards must be buttons labelled "Lesson {n}: {title}" that open with Enter or Space. | learn-arduino.md §5.7 L1227 | must | e2e |
| LA-463 | must not copy: parts reachable only through the Components list, chips and callouts; every part of a figure must be focusable from the keyboard with its name announced, and operable parts must be operable from the keyboard. | learn-arduino.md §5.7 L1228; SPEC.md L129 | must | e2e |
| LA-464 | must not copy: state shown by colour alone; HIGH and LOW, power, faults and lesson completion must also be shown by text, icon or shape. | learn-arduino.md §5.7 L1228; SPEC.md L129 | must | review |

## LA · Languages

The original's 13 languages cut to the six of decision D1, the locale URLs, and what is and is not translated.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-465 | iynk must offer exactly six locales, en, es, fr, de, zh (Simplified Chinese, html lang "zh-Hans") and hi, each complete and prerendered; the original's other seven languages (pt, it, tr, id, ja, ko, he) are not offered. | learn-arduino.md §6 L1234; SPEC.md L127, L153; BASE_ARCHITECTURE.md D1 | must | e2e |
| LA-466 | Each locale must have its own URL prefix /{lang}/ (English at /en/, not at the root), prerendered with translated title, meta description, Open Graph and Twitter data, JSON-LD and a lesson list that works without JavaScript. | learn-arduino.md §6 L1235; BASE_ARCHITECTURE.md D1, D2 | must | review |
| LA-467 | A visit to / must redirect to the locale stored in the iynk-lang cookie, else to the best Accept-Language match among the six locales, else to /en, keeping the query string. | learn-arduino.md §6 L1236; BASE_ARCHITECTURE.md D2 | must | e2e |
| LA-468 | Switching language from Settings or the Language flyout must store the choice in the iynk-lang cookie and reopen the same page under the new /{lang}/ prefix, keeping the current lesson, the query and the hash. | learn-arduino.md §6 L1237; BASE_ARCHITECTURE.md D2 | must | e2e |
| LA-469 | In code, only // comments may be translated; identifiers, string literals and code structure must stay as written. | learn-arduino.md §6 L1238 | must | e2e |
| LA-470 | Every UI string, lesson title, lede, feature, pinout row, example step, spec, callout, inspector label and note, part name and description, tooltip, schematic label (e.g. "GND rail", SERVO, LIGHTS), upload message, readout and pin-activity note (e.g. "ECO {ms} ms", "SIN ECO", "ROJO · ¡alto!") must be translated, and dates must use Intl. | learn-arduino.md §6 L1239 | must | e2e |
| LA-471 | C identifiers, string literals in sketches (so the OLED's "Water me!" and the "Landed on" lines stay English), pin names, units and brand names must stay untranslated, and a label that quotes a literal (“Water me!” below) must keep the literal as written. | learn-arduino.md §6 L1240 | must | review |
| LA-472 | Numbers should be formatted for the language consistently (e.g. "68,6 × 53,4 mm" with a decimal comma), not only where a translator happened to write one. | learn-arduino.md §6 L1239 | should | e2e |
| LA-473 | Lesson 2's title and the tagline must read: es "Haz parpadear un LED" / "EXPLORA · ENTIENDE · CONSTRUYE"; fr "Faire clignoter une LED" / "EXPLORER · COMPRENDRE · CONSTRUIRE"; de "Lass eine LED blinken" / "ENTDECKEN · VERSTEHEN · BAUEN"; zh "让 LED 闪烁" / "探索 · 理解 · 动手"; hi "LED ब्लिंक करें" / "खोजें · समझें · बनाएँ". | learn-arduino.md §6 L1242 | must | e2e |
| LA-474 | The serial monitor statuses Uploading / Running / Stopped must read: es Cargando / En marcha / Detenido; fr Téléversement / En cours / Arrêté; de Hochladen / Läuft / Gestoppt; zh 上传中 / 运行中 / 已停止; hi अपलोड हो रहा है / चल रहा है / रुका हुआ. | learn-arduino.md §6 L1242 | must | e2e |

## LA · Progress and persistence

What is saved, when, and how progress counts.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-475 | The chosen language must be saved and used on the next visit. | learn-arduino.md §7 L1250 | must | e2e |
| LA-476 | A lesson must be saved as completed when its first upload completes, as done["board:uno-r3:lesson:{lessonId}"] = true in the versioned localStorage key "iynk:v1". | learn-arduino.md §7 L1251; BASE_ARCHITECTURE.md D7 | must | unit |
| LA-477 | Every lesson's parameter values must be saved per lesson and restored when the lesson is reopened. | learn-arduino.md §7 L1252 | must | e2e |
| LA-478 | The settings (callout labels, floor grid, turntable, sound, reduce motion, current flow, schematic) must be saved whenever one changes, including from the viewbar. | learn-arduino.md §7 L1253 | must | e2e |
| LA-479 | Every lesson must have its own URL, /{lang}/boards/uno-r3/{lessonId} (the route replaces the original's #lessonId hash), and opening that URL must open that lesson. | learn-arduino.md §7 L1255; BASE_ARCHITECTURE.md D2 | must | e2e |
| LA-480 | Progress must be the number of completed lessons over the total, shown as "N/16" with the bar, and must be the same in every language. | learn-arduino.md §7 L1257 | must | e2e |
| LA-481 | Completion must persist until Settings → Reset progress, which clears completion only and keeps the parameter values and settings. | learn-arduino.md §7 L1258 | must | e2e |
| LA-482 | All lessons must be open from the start and may be done in any order. | learn-arduino.md §7 L1259 | must | e2e |
| LA-483 | The document title must be "{Lesson title} · {module}" in the current language after a lesson change or a deep link. | learn-arduino.md §7 L1260 | must | e2e |
| LA-484 | iynk should show a "next lesson" call to action when a lesson is completed. | learn-arduino.md §10 L1316 | should | e2e |
| LA-485 | iynk should record the time spent per lesson. | learn-arduino.md §10 L1316 | should | e2e |
| LA-486 | iynk should group lessons into tracks or levels beyond the single "Basics" track. | learn-arduino.md §10 L1317 | should | e2e |
| LA-487 | iynk should work offline after the first visit (the original has a manifest but no offline caching). | learn-arduino.md §10 L1315 | should | review |

## LA · Accuracy facts and the original's missing failure modes

Facts not tied to one lesson, and failure modes the original lacks but the brief requires.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| LA-488 | iynk must state the Uno R3 facts: ATmega328P at 16 MHz, 5 V logic, 7–12 V recommended input, 14 digital I/O with PWM on 3, 5, 6, 9, 10 and 11, 6 analog inputs, 32 KB flash, 2 KB SRAM, 1 KB EEPROM, 68.6 × 53.4 mm, the L LED on D13 and SDA/SCL shared with A4/A5. | learn-arduino.md §9.1 L1282 | must | review |
| LA-489 | iynk must state that the Uno's ADC is 10-bit (0–1023 for 0–5 V, ≈ 4.9 mV per step) and that PWM is 8-bit at ≈ 490 Hz on pins 3, 9, 10 and 11 and ≈ 980 Hz on pins 5 and 6. | learn-arduino.md §9.1 L1283 | must | review |
| LA-490 | iynk must state the 5 V logic thresholds (LOW below 1.5 V, HIGH above 3 V) and the internal pull-ups of 20–50 kΩ. | learn-arduino.md §9.1 L1285 | must | review |
| LA-491 | iynk must name notes correctly: C4 262 Hz, A4 440 Hz, an octave doubles the frequency, and the bell's 1568 Hz is G6. | learn-arduino.md §9.1 L1290 | must | review |
| LA-492 | iynk must state that a capacitive soil sensor reads lower the wetter the soil is, and that the FSR's resistance follows R_fsr = Rpd·(1023 − reading)/reading. | learn-arduino.md §9.1 L1290 | must | review |
| LA-493 | An LED wired without its series resistor must visibly burn out when driven, and the lesson must explain why (5 V across a 2 V LED with nothing to limit the current). | learn-arduino.md §10 L1313; SPEC.md L92 | must | e2e |
| LA-494 | Driving more than 20 mA through an LED, or more than 40 mA (absolute maximum) from a pin, must raise a visible warning. | learn-arduino.md §10 L1313; §3.2 L375; SPEC.md L124 | must | e2e |
| LA-495 | A short from 5 V to GND must trip the protection (the Uno's resettable fuse on USB) and power the board down, with the reason shown. | learn-arduino.md §10 L1313; SPEC.md L92 | must | e2e |
| LA-496 | Reversed polarity at the barrel jack must be blocked by the protection diode with no damage, and the lesson must say so; reversing a polarised part (LED, electrolytic capacitor) must have its real consequence. | learn-arduino.md §10 L1313; SPEC.md L92 | must | e2e |
| LA-497 | The Uno lessons should add quizzes, challenges with goals the circuit must meet, and hints. | learn-arduino.md §10 L1312 | should | e2e |
| LA-498 | iynk should offer a free-build sandbox where the user wires parts on the breadboard themselves. | learn-arduino.md §10 L1314 | should | e2e |

## RBA · What the original lacks and iynk must add

Gaps in Robotics Bench that the brief or the research says iynk must close.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-001 | Every robotics figure must have a See-through toggle showing its labelled internals (die and bond wires in DIP and QFP chips, the switches inside the TB6612 and L298N bridges, the transistor junction) lighting up as they work. | robotics-bench-a.md §0 L25-28; §11 L1404; SPEC.md L23; robotics-bench-b.md §1.1 L63-66 | must | e2e |
| RBA-002 | Every robotics figure must turn and zoom (the original's view is fixed). | robotics-bench-a.md §0 L25-27; §11 L1405; SPEC.md L22; robotics-bench-b.md §1.1 L63-66 | must | e2e |
| RBA-003 | Every Bench button, picker chip, designator and quiz option must be reachable and operable from the keyboard. | robotics-bench-a.md §0 L25; §11 L1405; SPEC.md L129 | must | e2e |
| RBA-004 | Robotics figures must support touch: drag to turn, pinch to zoom, tap to select. | robotics-bench-a.md §0 L25; SPEC.md L128 | must | e2e |
| RBA-005 | Each quiz answer should explain why it is right or wrong (the explanations in robotics-bench-a.md §9 and robotics-bench-b.md are the starting text), instead of a generic toast. | robotics-bench-a.md §0 L30; §9 L1335; §11 L1405; robotics-bench-b.md §1.2 L110-111 | should | e2e |
| RBA-006 | must not copy: removal limited to stripping every part; the user must be able to remove or leave out a single part, so the missing-flyback, missing-fuse, missing-16U2 and missing-EN-jumper failures can be reached in normal play. | robotics-bench-a.md §0 L31; §10 #7 L1377-1378; §11 L1402; robotics-bench-b.md §1.2 L83-84; §10 #10 L1430-1433 | must | e2e |
| RBA-007 | must not copy: drawn but dead board controls; the Uno's RESET button must restart the sketch, the ESP32's BOOT and RST buttons must work (hold BOOT and tap RST for download mode), and the LED trainer's slide switch must switch the supply. | robotics-bench-a.md §0 L32-33; §11 L1403; SPEC.md L25 | must | e2e |
| RBA-008 | The Uno bench should offer a barrel-jack supply as well as USB. | robotics-bench-a.md §11 L1403 | should | e2e |
| RBA-009 | The bench should save each board's build state, so a reload or a board switch does not always start fully assembled and powered. | robotics-bench-a.md §0 L34; §11 L1405 | should | e2e |

## RBA · Page shell, layout and navigation

Routing, the header, the stage, the controls row, the board list and the phone layout.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-010 | Each robotics board must have its own URL (the original: #key), the document title must be the board's name (e.g. "Arduino Uno R3"), and an unknown key must open Fig. 01. | robotics-bench-a.md §1.1 L44-45, L57; robotics-bench-b.md §1.3 L127-128 | must | e2e |
| RBA-011 | Opening a board must show it fully placed and soldered and, about 350 ms later, slide the USB cable in, power it up and run its default program (unless the URL asks otherwise, see the URL hooks). | robotics-bench-a.md §1.1 L52-56; robotics-bench-b.md §1.2 L74-75 | must | e2e |
| RBA-012 | must not copy: forcing the wobble to 0 when a board opens; robotics figures must open with the Colorfigures default wobble (2.4) so they look hand-inked. | robotics-bench-a.md §1.1 L54; §2.14 L506-507; SPEC.md L21; robotics-bench-b.md §1.1 L56-57 | must | screenshot |
| RBA-013 | Switching boards must stop every animation loop, timer and sound of the previous board. | robotics-bench-a.md §1.1 L49 | must | unit |
| RBA-014 | Switching boards should scroll the page back to the top. | robotics-bench-a.md §1.1 L54 | should | e2e |
| RBA-015 | On desktop the board list should be a sticky 220 px column with its own scroll, beside a centred main column of at most 760 px. | robotics-bench-a.md §1.2 L61 | should | screenshot |
| RBA-016 | The header must read "Fig. NN — {name}" with the board's hint beside it (default "build it, solder it, power it, break it"). | robotics-bench-a.md §1.2 L63; §2.2 L164 | must | e2e |
| RBA-017 | The stage must hold the Bench button column (captioned "Bench") at the top left, the stats column at the top right, the toast under the buttons and the figure in a 4:3 view. | robotics-bench-a.md §1.2 L64-65 | must | e2e |
| RBA-018 | Under the stage a controls row must hold "Hand-drawn wobble", "Colour", "Labels" and "Sound" (Lofi, Effects). | robotics-bench-a.md §1.2 L66-67; robotics-bench-b.md §1.1 L56-59 | must | e2e |
| RBA-019 | must not copy: the code column growing to fit its longest line; long code lines must scroll inside the code panel and leave the two-column lesson grid intact. | robotics-bench-a.md §1.2 L68-69 | must | e2e |
| RBA-020 | The Robotics Lab must keep the "Made with Colorfigures ↗" credit linking to https://april-zhu.com/colorfigures. | robotics-bench-a.md §1.2 L70; SPEC.md L155 | must | review |
| RBA-021 | The bench should use the paper look: paper #f2efe7, ink #231e16, muted #857d6e, rule #ddd6c8, a turbulence grain, monospace type, pill buttons with a 1.5 px ink border and a ▾ caret on pickers. | robotics-bench-a.md §1.2 L71-73 | should | screenshot |
| RBA-022 | A picker button must open its chips in a popover beside the button (below it on phones), only one picker may be open at a time, and any click elsewhere must close it. | robotics-bench-a.md §1.2 L74-75; §1.4 L127-128 | must | e2e |
| RBA-023 | The picker popover should have a 2 px ink border, a 12 px radius, a hard 3 px shadow and a max width of min(300px, 62vw), with wrapping chips. | robotics-bench-a.md §1.2 L74 | should | screenshot |
| RBA-024 | The current chip must be filled and carry aria-pressed="true", unavailable chips must be dimmed, and hovering a chip must tint it with the palette accent. | robotics-bench-a.md §1.2 L76 | must | e2e |
| RBA-025 | Every chip must stay clickable: the current one toasts "{label} — already set" and an unavailable one toasts its reason, or "{label} isn't possible right now" when it has none. | robotics-bench-a.md §1.2 L77-78 | must | e2e |
| RBA-026 | Each stat must show an uppercase label over a large tabular value (smaller for text values), and a value that changes must bump (scale 1.18 back to 1 over 0.35 s). | robotics-bench-a.md §1.2 L79-80 | must | e2e |
| RBA-027 | Toasts must appear just under the Bench buttons in uppercase, fade in over 0.2 s and hide after their duration (1600 ms by default). | robotics-bench-a.md §1.2 L81-82 | must | e2e |
| RBA-028 | The accent colour (active tags, chip hover) should be the light shade of the current palette. | robotics-bench-a.md §1.2 L83 | should | screenshot |
| RBA-029 | The robotics board list must open with a heading and the line "Hand-inked circuit boards you build, power up and break.". | robotics-bench-a.md §1.3 L87 | must | e2e |
| RBA-030 | The board list must group boards under the headers "Start here", "Month 1 · electronics", "Month 2 · microcontrollers", then the motors-and-drivers month, the sensors month and "Power + the ROS 2 brain". | robotics-bench-a.md §1.3 L88-98 | must | e2e |
| RBA-031 | must not copy: labelling the drivers and sensors groups "Month 2" again; they must read "Month 3 · motors + drivers" and "Month 4 · sensors". | robotics-bench-a.md §1.3 L99; §10 #9 L1381; robotics-bench-b.md §1.3 L124-125 | must | e2e |
| RBA-032 | Each board link must show "Fig. NN", the board's name and its sub-line, add " · done" once the board's quiz is mastered, and the current link must be inverted, carry aria-current and be scrolled into view. | robotics-bench-a.md §1.3 L100-101; robotics-bench-b.md §1.3 L126 | must | e2e |
| RBA-033 | The board list must end with "A training bench for the six-month robotics roadmap: electronics, microcontrollers, drivers, sensors, power.". | robotics-bench-a.md §1.3 L102; robotics-bench-b.md §1.3 L126-127 | must | e2e |
| RBA-034 | The Robotics Lab must list the 13 boards in order: 01 Arduino Uno R3 "meet the board"; 02 LED + resistor "Ohm's law"; 03 Transistor switch "logic drives power"; 04 ESP32-S3 DevKit "WiFi + two cores"; 05 TB6612FNG driver "H-bridge, PWM"; 06 L298N driver "why not to use it"; 07 A4988 stepper driver "microstepping"; 08 PCA9685 servo board "16 PWM over I2C"; 09 MPU-6050 IMU "filters + drift"; 10 HC-SR04 ultrasonic "time of flight"; 11 QTR-8RC line sensor "line following"; 12 LM2596 buck module "power + brown-outs"; 13 Raspberry Pi 5 "ROS 2 brain". | robotics-bench-a.md §1.3 L103-119 | must | e2e |
| RBA-035 | At 760 px and below the board list must become a sticky top bar of horizontally scrolling pills showing only board names, and the lesson grid one column. | robotics-bench-a.md §1.4 L123-125 | must | e2e |
| RBA-036 | At 560 px and below the hint and the "Bench" caption must hide, the buttons must wrap in a row, the stats must sit in a row above the figure and pickers must open below their button. | robotics-bench-a.md §1.4 L126-128 | must | e2e |
| RBA-037 | must not copy: the phone bench's tiny (~350 px) figure, a picker that covers the whole figure and a toast that covers the stats; on phones the figure must stay usable and pickers and toasts must not hide it or the stats. | robotics-bench-a.md §1.4 L129-130; §10 #15 L1390 | must | e2e |

## RBA · Engine: board model, part library and scene

How a board is described and drawn.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-038 | Robotics boards must be laid out in the real board's top-view millimetres (u from the left edge, v from the front edge), so every part sits where it does on the real PCB. | robotics-bench-a.md §2.1 L140-141 | must | review |
| RBA-039 | Each bench figure should frame its object to fill about 74% of the width and 88% of the height of a 4:3 view, nudged right of centre, with stroke widths and wobble scaled to the view size. | robotics-bench-a.md §2.1 L149-150 | should | screenshot |
| RBA-040 | Each robotics board must define its figure number, month group, name, sub-line, hint, PCB size, corner radius, palette (cobalt by default), mat margins and standoff height, mounting holes, silkscreen, copper traces and signal paths (upload and power), parts, USB entry and plug type (USB-B, USB-C or micro-USB), the parts it needs to power, run and upload, its labels, modes, default mode, mat peripherals, wires, overlays, signal dots, stats, tags, overview, quiz and practice task. | robotics-bench-a.md §2.2 L156-196 | must | review |
| RBA-041 | A board without its own labels must use the defaults: power button "Plug / unplug USB", power-up toast "Powered: the program starts", mode picker "Upload sketch", code heading "Try it yourself", terminal heading "Serial monitor" with the first terminal line "-- serial monitor --". | robotics-bench-a.md §2.2 L176-180; robotics-bench-b.md §1.1 L50-51, L60-62 | must | e2e |
| RBA-042 | Mounting holes must be drawn as gold standoffs with a tin ring, and silkscreen as bold cream (#fbf8ee) text. | robotics-bench-a.md §2.2 L167-168 | must | screenshot |
| RBA-043 | Every part must belong to one of four groups that set its order, solder rule and exploded lift: SMD (pick and place, then reflow), low through-hole, tall through-hole, and last-in parts (a chip into its socket, a jumper cap). | robotics-bench-a.md §2.2 L205; robotics-bench-b.md §1.2 L76-78 | must | e2e |
| RBA-044 | Messages must name a part by designator and full name, e.g. "U1 (ATmega328P microcontroller)". | robotics-bench-a.md §2.2 L202-203 | must | e2e |
| RBA-045 | Raised parts must sit at their real height (U1 3 mm up in its socket, jumper caps 2.5 mm up on their pins). | robotics-bench-a.md §2.2 L208 | must | e2e |
| RBA-046 | A polar part must offer two orientation chips, the first correct ("stripe front" / "stripe back" by default, or the board's own labels). | robotics-bench-a.md §2.2 L211-212 | must | e2e |
| RBA-047 | A reversed polar part must fault by kind: an electrolytic pops, an LED stays dark, anything else overheats, unless the board gives the part its own fault or message. | robotics-bench-a.md §2.2 L213-214 | must | unit |
| RBA-048 | A chip that plugs into a socket must use the socket's footprint, not draw its own. | robotics-bench-a.md §2.2 L215 | must | e2e |
| RBA-049 | An LED must glow in its own colour; a power LED must be lit whenever the board has power; RX and TX LEDs must flicker during uploads. | robotics-bench-a.md §2.2 L217; §2.10 L473-474 | must | e2e |
| RBA-050 | A mode's title must appear on its chip, in the code heading ("Try it yourself · {title}"), in "Compiling {title} ..." and in the terminal line "-- {title} --". | robotics-bench-a.md §2.2 L224 | must | e2e |
| RBA-051 | Every upload must log "Sketch uses {bytes} bytes of program storage" with that mode's sketch size. | robotics-bench-a.md §2.2 L226 | must | e2e |
| RBA-052 | An instant mode (e.g. "Move jumper", "Send command") must switch at once with no upload and must be selectable while unplugged. | robotics-bench-a.md §2.2 L227 | must | e2e |
| RBA-053 | A running mode's serial line must be produced once per whole second of run time. | robotics-bench-a.md §2.2 L229; §2.11 L480; robotics-bench-b.md §1.2 L103 | must | unit |
| RBA-054 | A mode's fault check must run after power-up, after an upload and after an instant switch. | robotics-bench-a.md §2.2 L230 | must | unit |
| RBA-055 | The part library must draw every kind the boards use: QFP, SOIC, SOT-223, SOT-23, crystal can, SMD LED, 0603/0805 resistor and capacitor, passive scatter, DIP socket, DIP chip, tactile switch, male and female headers, standing electrolytic, USB-B, USB-C and micro-USB, barrel jack, polyfuse, axial resistor and diode, 5 mm LED, TO-92, TO-220 with optional finned heatsink, screw terminal, trimpot, WROOM module, shielded inductor, cylinder, box, IR pair, slide switch, jumper cap, wire link, header soldered from below, WS2812, Multiwatt-15 on its heatsink, and the part-B kinds (stubs, heatsink top, servo header, address pads, TO-263, SMD diode, 3296 trimmer, 7-segment display, SoC, FFC, JST, RJ45, dual USB-A, cooler). | robotics-bench-a.md §2.3 L238-275 | must | review |
| RBA-056 | Orientation must be visible on every polar part: a DIP's notch and pin-1 dot (text flipping when turned), an electrolytic's minus stripe, a diode's band, a TO-92's flat face, a DIP socket's notch. | robotics-bench-a.md §2.3 L248-260 | must | screenshot |
| RBA-057 | A 5 mm LED's lens tint and glow radius must follow its brightness (glow radius 4 + 9·brightness in the original). | robotics-bench-a.md §2.3 L259 | must | screenshot |
| RBA-058 | DIP sockets must have round(length/2.54) pins per side, and screw terminals one entry per 5 mm unless set. | robotics-bench-a.md §2.3 L248, L262 | must | screenshot |
| RBA-059 | Wires should use the palette red #e2483d, black #3a3632, yellow #f2c230, green #43b05c, blue #3e86d9, orange #f08a2b, white #ece6d6, purple #8c4bd1, resistors the standard band colours (black to white plus gold), drawn as smoothed tubes with an ink outline and a highlight, jumpers as arches. | robotics-bench-a.md §2.3 L277-279 | should | screenshot |
| RBA-060 | The mat peripherals must be modelled: an Arduino Nano (18 × 43 mm, 328P, "NANO" silk, 2 × 15 pads, mini-USB, power LED), a 4×AA holder and a 7.4 V LiPo pack, a TT gear motor with a turning hub, an SG90 servo, a NEMA 17 stepper (42 × 42 × 40 mm with a pointer flag), a wooden block, a yellow multimeter (LCD value and unit, dial, probes), a small standing display and a paper strip with a black line. | robotics-bench-a.md §2.4 L285-295 | must | review |
| RBA-061 | The mat should be a slab with a faint 10 mm grid. | robotics-bench-a.md §2.5 L299 | should | screenshot |
| RBA-062 | The PCB and every peripheral must cast a flat shadow on the mat. | robotics-bench-a.md §2.5 L300 | must | screenshot |
| RBA-063 | Every part must have a silkscreen footprint, and where the part is not fitted (or the view is exploded) its pads or holes and designator must show, so the user sees where each part goes. | robotics-bench-a.md §2.5 L304-307 | must | e2e |
| RBA-064 | Parts and peripherals must be drawn in correct depth order at every angle the figure can turn to. | robotics-bench-a.md §2.5 L308 | must | screenshot |
| RBA-065 | Every part on the board must be clickable. | robotics-bench-a.md §2.5 L309 | must | e2e |
| RBA-066 | During reflow the PCB top must glow orange (#ff8a3d), pulsing with the reflow's progress. | robotics-bench-a.md §2.5 L310 | must | e2e |
| RBA-067 | During an upload five green dots (#8af0ae) must run along the upload path; while powered three yellow dots (#ffd25e) must run along the power path; while running a board's own signal dots must run along their paths. | robotics-bench-a.md §2.5 L311-312 | must | e2e |
| RBA-068 | Lit LEDs must glow with radial gradients in their colour (amber #f7a531, green #43c25c, blue #3e86d9, red #e2483d). | robotics-bench-a.md §2.5 L314 | must | screenshot |
| RBA-069 | The USB plug and its cable, the soldering iron, smoke and tags must be drawn over the board. | robotics-bench-a.md §2.5 L315; §2.7 | must | e2e |
| RBA-070 | A part counts as fitted once it has landed, and as soldered once soldered (a last-in part counts as soldered when fitted); parts drop in from 34 mm above the board. | robotics-bench-a.md §2.6 L338-340 | must | e2e |

## RBA · Engine: build flow and its messages

The Bench buttons, each guard and each message, in order.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-071 | The Bench buttons must come in this order: Strip to bare PCB, Pick & place SMD, Place a part ▾, Solder joints, the power button, the mode picker, Exploded view; every press plays the tick sound. | robotics-bench-a.md §2.7 L344 | must | e2e |
| RBA-072 | "Strip to bare PCB" must first unplug the board silently and reset the exploded view, the iron, pick and place, reflow and the selection. | robotics-bench-a.md §2.7 L347 | must | e2e |
| RBA-073 | "Strip to bare PCB" on a bare board must toast "The board is already bare". | robotics-bench-a.md §2.7 L348 | must | e2e |
| RBA-074 | "Strip to bare PCB" must lift every part off in group order (last-in parts first, SMD last), each rising and disappearing a little after the one before, with the whoosh sound, ending at status BARE PCB and Parts 0/N within about 1.6 s. | robotics-bench-a.md §2.7 L349-350 | must | e2e |
| RBA-075 | While plugged in, every build action must refuse with "Unplug the power first: never work on a live board". | robotics-bench-a.md §2.7 L353; §2.7 L370 | must | e2e |
| RBA-076 | While the view is exploded, Pick & place, Place a part, Solder joints and the power button must refuse with "Close the exploded view first". | robotics-bench-a.md §2.7 L353, L421 | must | e2e |
| RBA-077 | "Pick & place SMD" on a board with no SMD parts must toast "No SMD parts on this board: everything is through-hole. Use Place a part". | robotics-bench-a.md §2.7 L354 | must | e2e |
| RBA-078 | "Pick & place SMD" when every SMD part is already on must toast "The SMD parts are already on the board". | robotics-bench-a.md §2.7 L355 | must | e2e |
| RBA-079 | "Pick & place SMD" must drop the missing SMD parts one after another (a new one about every 0.09 s, each landing in about 0.42 s), with the machine sound as each starts and the place sound as each lands. | robotics-bench-a.md §2.7 L356-357 | must | e2e |
| RBA-080 | Pick and place should draw a placement head carrying each SMD part (the original simply drops them). | robotics-bench-a.md §2.7 L357; SPEC.md L49 | should | e2e |
| RBA-081 | Once every SMD part has landed, reflow must run for about 1.3 s with the oven sound and an orange glow, then solder every SMD part and toast "Reflow oven: 245 °C melts the solder paste under every pad" with the ding. | robotics-bench-a.md §2.7 L358-359; robotics-bench-b.md §1.2 L85 | must | e2e |
| RBA-082 | While SMD parts have landed but are not yet reflowed, the "To solder" stat must count them. | robotics-bench-a.md §2.7 L360 | must | e2e |
| RBA-083 | "Place a part ▾" must list every non-SMD part in board order, polar parts as two chips "{id} {orientation}" and others as one chip "{id} {short name}" (e.g. "SK1 socket", "J1 usb port", "TP1 tp+"). | robotics-bench-a.md §2.7 L363-364 | must | e2e |
| RBA-084 | A Place chip must be current when the part is fitted that way round, and unavailable (with its reason) when a rule blocks it. | robotics-bench-a.md §2.7 L365 | must | e2e |
| RBA-085 | On a board with SMD parts, placing any other part before they are all soldered must be refused with "SMD parts first: run pick and place + reflow. The oven would melt plastic parts". | robotics-bench-a.md §2.7 L367; robotics-bench-b.md §1.2 L80 | must | e2e |
| RBA-086 | Placing a tall part before every low part is in must be refused with "Low parts first: with tall parts on, the board rocks and loose parts fall out when you flip it to solder". | robotics-bench-a.md §2.7 L368; robotics-bench-b.md §1.2 L81, L83 | must | e2e |
| RBA-087 | Placing a socketed chip before everything else is soldered must be refused with "Solder everything first. Never heat a chip sitting in its socket"; any other last-in part with "Solder everything first: this part goes on last". | robotics-bench-a.md §2.7 L369; robotics-bench-b.md §1.2 L82 | must | e2e |
| RBA-088 | Picking a fitted part's other orientation must flip it (it re-drops, with the whoosh) and toast "Pulled {id} out and turned it round" for a last-in part or "Desoldered {id}, flipped it, soldered it again" for others, keeping it soldered. | robotics-bench-a.md §2.7 L374-375; robotics-bench-b.md §1.2 L89 | must | e2e |
| RBA-089 | A newly placed part must start unsoldered, become the selected part (Selected part card and accent tag) and play the whoosh, then the place sound when it lands (the snap sound for a last-in part). | robotics-bench-a.md §2.7 L376-377 | must | e2e |
| RBA-090 | "Solder joints" must solder every landed, unsoldered low and tall part from back to front; with nothing left it must toast "Every through-hole joint is already soldered", or "Nothing to solder yet: place a part first" with the error sound when no through-hole part is in. | robotics-bench-a.md §2.7 L381-382; robotics-bench-b.md §1.2 L85-87 | must | e2e |
| RBA-091 | must not copy: "Nothing to solder yet: place a part first" when reflowed SMD parts are on the board; the message must say the SMD joints are already reflowed and a through-hole part is needed. | robotics-bench-a.md §10 #17 L1392 | must | e2e |
| RBA-092 | Pressing "Solder joints" while the iron is already working must be ignored. | robotics-bench-a.md §2.7 L381 | must | e2e |
| RBA-093 | The soldering iron (metal tip, tomato handle) must glide to each joint in about 0.35 s, dwell with three smoke wisps and the solder sound, mark the joint soldered at about 0.9 s, fly away after the last one and toast "Every joint soldered: shiny, concave, no blobs" with the ding, the "To solder" stat counting down. | robotics-bench-a.md §2.7 L383-385 | must | e2e |
| RBA-094 | "Solder joints" must be usable between placements, soldering whatever has landed so far. | robotics-bench-a.md §2.8 L435 | must | e2e |
| RBA-095 | The power button on a plugged board must unplug it: power, running and any fault clear, an upload in progress is cancelled, "-- power off --" is logged and the unplug sound plays. | robotics-bench-a.md §2.7 L388 | must | e2e |
| RBA-096 | Plugging into a board whose USB socket is not fitted must be refused with "There's nothing to plug into: place {id} first". | robotics-bench-a.md §2.7 L389; robotics-bench-b.md §1.2 L90-91 | must | e2e |
| RBA-097 | Plugging in must slide the plug 22 mm into the socket over about 0.45 s with the whoosh, then play the plug sound and check the board. | robotics-bench-a.md §2.7 L390 | must | e2e |
| RBA-098 | The plug must match the board's socket (USB-B, micro-USB or USB-C) and its grey cable must run to the mat edge and along it. | robotics-bench-a.md §2.7 L391-392 | must | screenshot |
| RBA-099 | A board powered through a peripheral (USB into a Nano on the mat) must be pluggable even when the board itself is bare. | robotics-bench-a.md §2.7 L393 | must | e2e |
| RBA-100 | If the USB socket is not soldered, plugging in must leave the plug in, not power the board, and toast "{id} isn't soldered: the power pins don't touch the copper". | robotics-bench-a.md §2.7 L396; robotics-bench-b.md §1.2 L90 | must | e2e |
| RBA-101 | If a part the supply needs is missing or unsoldered, plugging in must leave the plug in, not power the board, and toast "No power: {id} ({name}) is missing or unsoldered". | robotics-bench-a.md §2.7 L397; robotics-bench-b.md §1.2 L91-92 | must | e2e |
| RBA-102 | When the supply is good the board must power up and log "-- power on --", then a soldered reversed polar part must fault (a dark fault still lets the program run). | robotics-bench-a.md §2.7 L398-399 | must | e2e |
| RBA-103 | If a part needed to run code is missing or unsoldered, the board must be powered but run nothing, play the power sound, show status POWERED and toast "Powered, but {id} ({name}) is missing: nothing runs" or "... is not soldered: nothing runs". | robotics-bench-a.md §2.7 L400; robotics-bench-b.md §1.2 L92-93 | must | e2e |
| RBA-104 | When everything checks out, the program must start in the current (or default) mode with the power sound and the board's power-up toast, then the mode's fault check. | robotics-bench-a.md §2.7 L401; robotics-bench-b.md §1.2 L93-94 | must | e2e |
| RBA-105 | The mode picker must list every mode title, the running mode's chip current and none current while stopped or uploading. | robotics-bench-a.md §2.7 L404 | must | e2e |
| RBA-106 | Picking an upload mode while unplugged must toast "Power the board first"; picking an instant mode while unplugged must set it and toast "Set. Now power the board to see it". | robotics-bench-a.md §2.7 L407; robotics-bench-b.md §1.2 L99-100 | must | e2e |
| RBA-107 | Picking a mode during a non-dark fault must be refused with "Fix the fault first: unplug, then correct {id}". | robotics-bench-a.md §2.7 L408 | must | e2e |
| RBA-108 | Picking a mode while plugged but not powered must be refused with "No power: check the supply parts". | robotics-bench-a.md §2.7 L409 | must | e2e |
| RBA-109 | Picking a mode during an upload must be refused with "Uploading: wait for it". | robotics-bench-a.md §2.7 L410 | must | e2e |
| RBA-110 | Picking an instant mode while powered must switch at once with the click sound, restart the clock, log "-- {title} --" and run the mode's fault check. | robotics-bench-a.md §2.7 L411 | must | e2e |
| RBA-111 | If a part uploads need is missing, an upload must log "avrdude: ser_open(): can't open device" and toast "{id} ({name}) is missing: the computer sees no board". | robotics-bench-a.md §2.7 L412 | must | e2e |
| RBA-112 | If no program can run (no working chip), an upload must log "avrdude: programmer is not responding" and toast "No working chip: the upload times out". | robotics-bench-a.md §2.7 L413; robotics-bench-b.md §1.2 L97-98 | must | e2e |
| RBA-113 | A good upload must log "Compiling {title} ..." and "Sketch uses {bytes} bytes of program storage" with the upload sound, show UPLOADING for about 2.2 s with RX/TX flicker and three laps of green dots, then run the new sketch and log "avrdude: flash verified" and "Done uploading." with the ding, followed by the mode's fault check. | robotics-bench-a.md §2.7 L414-416; robotics-bench-b.md §1.2 L95-97 | must | e2e |
| RBA-114 | must not copy: a refused pick that still changes the code panel or becomes the next sketch; a refused mode pick must change nothing, and the code panel must show which sketch is selected and which is running when they differ. | robotics-bench-a.md §10 #1 L1364-1367; §11 L1406; robotics-bench-b.md §1.2 L99-102; §6.7 L962; §10 #2 L1422 | must | e2e |
| RBA-115 | "Exploded view" on a bare board must toast "Nothing to take apart: the board is bare"; on a plugged board it must unplug silently first and toast "Unplugged before taking it apart". | robotics-bench-a.md §2.7 L418 | must | e2e |
| RBA-116 | "Exploded view" must toggle over about 0.63 s with the whoosh, lifting SMD parts 6 mm, low through-hole 12 mm, tall through-hole 18 mm and last-in parts 24 mm, with the footprints, pads and designators visible underneath. | robotics-bench-a.md §2.7 L419-420; robotics-bench-b.md §1.2 L109 | must | e2e |
| RBA-117 | While exploded, an upload pick must answer "Power the board first", and "Strip to bare PCB" must still work and close the exploded view. | robotics-bench-a.md §2.7 L422 | must | e2e |

## RBA · Engine: status, stats, faults and timing

The state machine, the status precedence, faults, LEDs and animation rates.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-118 | The bench must keep a build axis (bare, SMD placing, reflow, through-hole placing and soldering, last-in parts, ready) and an independent power axis (unplugged, inserting, not powered, fault, powered, running, uploading), with Strip, unplug and Exploded view returning power to unplugged and clearing faults. | robotics-bench-a.md §2.8 L426-447 | must | unit |
| RBA-119 | The Status stat must follow this precedence: FAULT (non-dark fault) > CHECK {id} (dark fault) > UPLOADING > RUNNING > POWERED > BARE PCB (no parts fitted) > ASSEMBLING (some fitted) > NEEDS SOLDER (all fitted, some unsoldered) > READY. | robotics-bench-a.md §2.8 L450-451; robotics-bench-b.md §1.1 L54-55 | must | unit |
| RBA-120 | The stats must show "Parts" as fitted/total (e.g. 24/24), "Status", "To solder" only while some fitted part is unsoldered, then the board's own stats only while running. | robotics-bench-a.md §2.8 L453-454; robotics-bench-b.md §1.1 L52-53 | must | e2e |
| RBA-121 | A reversed electrolytic must fault with "Pop! {id} is in backwards: reverse voltage vents an electrolytic. Unplug and flip it". | robotics-bench-a.md §2.9 L459; robotics-bench-b.md §1.2 L105-106 | must | e2e |
| RBA-122 | A reversed LED must fault with "{id} is in backwards: an LED only conducts one way, so it stays dark. Unplug and flip it". | robotics-bench-a.md §2.9 L460 | must | e2e |
| RBA-123 | Any other reversed part must fault with "{id} is in backwards: power lands on the wrong pins and it is cooking. Unplug and turn it round". | robotics-bench-a.md §2.9 L461 | must | e2e |
| RBA-124 | Only a soldered reversed part may fault; a reversed part that is placed but unsoldered must be ignored. | robotics-bench-a.md §2.9 L462 | must | unit |
| RBA-125 | A fault must stop the program (except a dark fault), play pop, error (dark) or buzz (hot), add the sizzle about 150 ms later for non-dark faults, and toast its message for about 3.6 s. | robotics-bench-a.md §2.9 L463-464; robotics-bench-b.md §1.2 L106-108 | must | e2e |
| RBA-126 | An overheating part must glow red (pulsing toward #e2483d) and smoke. | robotics-bench-a.md §2.9 L465 | must | e2e |
| RBA-127 | must not copy: only DIP, TO-92, TO-220 and Multiwatt parts showing the hot tint while other hot parts (the Fig. 03 diode) only smoke; every overheating part must show it is hot. | robotics-bench-a.md §2.9 L465 | must | e2e |
| RBA-128 | A popped electrolytic must bulge with a vent cross on its top, and a dead 5 mm LED must turn brown with no highlight. | robotics-bench-a.md §2.9 L465-466 | must | e2e |
| RBA-129 | Non-dark faults must emit grey smoke puffs (#8d887e) that grow, rise, drift and fade over about 1.1 s. | robotics-bench-a.md §2.9 L466-467 | must | e2e |
| RBA-130 | During a hot fault the power LEDs must flicker, and the faulted LED itself must stay dark. | robotics-bench-a.md §2.9 L468; §2.10 L473 | must | e2e |
| RBA-131 | A fault must clear only when the board is unplugged (Strip and Exploded view unplug). | robotics-bench-a.md §2.9 L469; robotics-bench-b.md §1.2 L108 | must | e2e |
| RBA-132 | must not copy: an instant mode switch clearing a dark fault (the original then shows RUNNING and 3.0 mA through a dark, reversed LED); only unplugging may clear any fault. | robotics-bench-a.md §2.9 L469; §10 #2 L1368-1369 | must | e2e |
| RBA-133 | Without power every LED must be dark; while uploading the RX LED must flicker and the TX LED flicker in the last quarter of the upload; otherwise LEDs follow the program. | robotics-bench-a.md §2.10 L473-474 | must | e2e |
| RBA-134 | Bench animations should run at about 60 fps with the step capped at 0.05 s, at these rates: drop 2.4/s, leave 2.8/s, explode 1.6/s, USB 2.2/s, reflow 1.3 s, upload 2.2 s. | robotics-bench-a.md §2.11 L478-479 | should | unit |
| RBA-135 | While powered and idle, blinking LEDs and running stats must keep animating at the program's timing. | robotics-bench-a.md §2.11 L480-481 | must | e2e |
| RBA-136 | must not copy: fixed power-up messages that describe the wrong mode (Fig. 03 says "pin 9 goes HIGH and the motor spins" in LOW mode, Fig. 06 says "both motors forward at full speed" in Brake, the Uno says "the factory Blink sketch starts" while running Serial hello); the power-up message must describe the mode actually running. | robotics-bench-a.md §10 #8 L1379-1380 | must | e2e |
| RBA-137 | must not copy: a "Pin 13 LOW" stat during a sketch that does not drive pin 13 (the Uno's Serial hello); live pin stats must show the pin's real state in every mode. | robotics-bench-a.md §10 #19 L1394 | must | e2e |

## RBA · Engine: terminal, selection, labels, palettes and lesson panel

The serial terminal, the Selected part card, tags, wobble, colour, the lesson columns and the code highlighter.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-138 | The terminal must start with "-- serial monitor --" ("-- bench notes --" on Fig. 02) and log the engine lines "-- power on --", "-- power off --", "-- {title} --", "Compiling {title} ...", "Sketch uses N bytes of program storage", "avrdude: flash verified", "Done uploading.", "avrdude: programmer is not responding" and "avrdude: ser_open(): can't open device" as they happen. | robotics-bench-a.md §2.12 L485-487 | must | e2e |
| RBA-139 | The terminal must keep at least the last 9 lines. | robotics-bench-a.md §2.12 L485; robotics-bench-b.md §1.2 L103-104 | must | e2e |
| RBA-140 | The terminal should be dark green (#1d2a26) with light green text (#8af0ae) in 12 px monospace, at least 128 px tall, wrapping long lines. | robotics-bench-a.md §2.12 L488 | should | screenshot |
| RBA-141 | Clicking a part on the board or its designator button must toggle its selection with the tick sound, and a newly placed part must be selected automatically. | robotics-bench-a.md §2.13 L492-493 | must | e2e |
| RBA-142 | The Selected part card must show "{id} · on the board" or "{id} · in the parts bin", the part's name in bold and its description; with nothing selected, "nothing selected" and "Click any part on the board, or a designator below.". | robotics-bench-a.md §2.13 L494-495; robotics-bench-b.md §1.1 L67-70 | must | e2e |
| RBA-143 | Every fitted part with a tag must show a cream pill (#fff4d6, ink border, bold mono, its short name) on a leader line to the part; working parts' pills must take the accent colour; the selected part must get its own accent pill. | robotics-bench-a.md §2.13 L496-499; robotics-bench-b.md §1.2 L118 | must | e2e |
| RBA-144 | The "Labels" button must show or hide every tag, including board-drawn ones such as MOTOR A, read "On" or "Off", carry aria-pressed, and appear only when the figure draws at least one tag. | robotics-bench-a.md §2.13 L500-501 | must | e2e |
| RBA-145 | must not copy: overlapping tags and overlays (Fig. 02's LED and JUMPER pills, the ESP32's WiFi waves running into the stats); tags and overlays must never overlap each other or the stats. | robotics-bench-a.md §10 #16 L1391 | must | e2e |
| RBA-146 | The "Hand-drawn wobble" slider must range 0 to 7 in steps of 0.1 and drive the hand-drawn displacement, with paper grain and blotch noise always on. | robotics-bench-a.md §2.14 L505-507 | must | e2e |
| RBA-147 | "Colour" must offer five round swatches, mustard (#f4b829/#d49c1f/#4e4a18), tomato (#ef6a4c/#cf5038/#4a2219), mint (#93d3b0/#71b693/#1f4034), cobalt (#76a0e2/#5a82c6/#1c2948) and blush (#f3a6bb/#d8869c/#4b2430), titled by name with the current one outlined, recolouring the PCB and the accent. | robotics-bench-a.md §2.14 L508-510; robotics-bench-b.md §1.1 L57 | must | e2e |
| RBA-148 | Each board must open in its own palette (Uno cobalt, LED trainer mint, transistor switch mint, ESP32 cobalt, TB6612 tomato, L298N tomato, and the part-B defaults). | robotics-bench-a.md §2.14 L510-511 | must | e2e |
| RBA-149 | The chosen palette should be remembered. | robotics-bench-a.md §2.14 L510 | should | e2e |
| RBA-150 | The lesson panel must have two columns: "Meet the board", "Selected part" and "Parts on this board" on the left; "{code label} · {mode title}" with the code, the terminal, "Check yourself" and (when the board has one) "Practice task" on the right. | robotics-bench-a.md §2.15 L515-522; robotics-bench-b.md §1.1 L60-62 | must | e2e |
| RBA-151 | Section headings should be small uppercase muted labels, and cards and code panels paper (#fbf8f0) with a 1.5 px ink border, 12 px radius and a hard 3 px shadow. | robotics-bench-a.md §2.15 L524 | should | screenshot |
| RBA-152 | "Parts on this board" must have one designator button per part in board order, titled with the part's name, faded when the part is not fitted and pressed when it is selected. | robotics-bench-a.md §2.15 L525-526 | must | e2e |
| RBA-153 | The code highlighter must colour strings, // comments and "# " comments, and the keywords void int bool float unsigned long for if else while return def import from class const uint8_t uint16_t True False None self, for both C++ and Python sketches. | robotics-bench-a.md §2.15 L527-529 | must | unit |
| RBA-154 | Highlight colours should be strings #a3471f, comments #8a8172 and keywords bold #2f5fa8. | robotics-bench-a.md §2.15 L527-529 | should | screenshot |

## RBA · Engine: quizzes and mastery

"Check yourself", the mastered state and its persistence.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-155 | Each board's full quiz must be available under "Check yourself" from the start, and a quiz must also appear after each major build step. | robotics-bench-a.md §2.16 L535; SPEC.md L105 | must | e2e |
| RBA-156 | Each question must show as "N. {question}" with its answers as chips. | robotics-bench-a.md §2.16 L535 | must | e2e |
| RBA-157 | A wrong answer must strike its chip through and dim it, play the buzz and toast "Not quite: think about what the hardware does" (plus the explanation iynk adds). | robotics-bench-a.md §2.16 L536; robotics-bench-b.md §1.2 L110-111 | must | e2e |
| RBA-158 | A right answer must turn its chip green (#43c25c) and play the chime; answers can be changed at any time. | robotics-bench-a.md §2.16 L536-537; robotics-bench-b.md §1.2 L111 | must | e2e |
| RBA-159 | When every question holds its right answer the quiz must show "Board mastered. Fig. NN is next." with a link to the next board, save the board as mastered and mark its nav entry "Fig. NN · done". | robotics-bench-a.md §2.16 L538-539; robotics-bench-b.md §1.2 L111-113 | must | e2e |
| RBA-160 | The mastered flag must survive a reload. | robotics-bench-a.md §2.16 L540 | must | e2e |
| RBA-161 | Quiz answers should be saved too, instead of resetting on reload and on every board switch. | robotics-bench-a.md §2.16 L540; §11 L1405 | should | e2e |
| RBA-162 | must not copy: hiding "Board mastered" after an answer changes while the nav still says done; the quiz and the nav must always agree on whether the board is mastered. | robotics-bench-a.md §2.16 L540-541; §10 #18 L1393 | must | e2e |

## RBA · Sound: lofi, effects and motor hum

Everything is synthesised; there are no audio files.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-163 | All bench sound must be synthesised with Web Audio (no audio files): a compressor before the output, a music bus (gain up to 0.9, 0.6 s on and 0.25 s off, low-passed at 2400 Hz) and an effects bus (gain 0.55), with a 2 s white-noise buffer and a 3 s vinyl-crackle buffer. | robotics-bench-a.md §2.17 L543-547 | must | review |
| RBA-164 | The "Lofi" toggle must start and stop the lofi loop, show a three-bar equaliser that animates while it plays and carry aria-pressed; it starts off. | robotics-bench-a.md §2.17 L548 | must | e2e |
| RBA-165 | The "Effects" toggle must start on, be saved across visits and play the chime when switched on. | robotics-bench-a.md §2.17 L549; robotics-bench-b.md §1.1 L58-59 | must | e2e |
| RBA-166 | must not copy: sounds attempted before any user gesture (the auto-plug at mount); the audio context must be created on the first user gesture, and nothing may try to play before it. | robotics-bench-a.md §2.17 L550-551; §10 #14 L1388-1389; §11 L1407 | must | e2e |
| RBA-167 | The lofi loop must run at 74 bpm in sixteenth-note steps over a 4-bar loop, with odd sixteenths swung late by 0.09 beat. | robotics-bench-a.md §2.17 L553 | must | e2e |
| RBA-168 | Lofi chords should be strummed rhodes voicings (sine, a quieter octave sine and a faint triangle, slightly detuned, about 3.6 beats) on step 0 of each bar: Dm9 [50,53,57,60,64], G13 [43,53,59,64], Cmaj9 [48,52,55,59,62] and the fourth bar's A minor chord [45,55,60,64,67]. | robotics-bench-a.md §2.17 L557 | should | unit |
| RBA-169 | must not copy: the fourth lofi chord labelled "Am9" while voiced as an Am7; it must either include the B (a real Am9) or be called Am7. | robotics-bench-a.md §2.17 L557; §10 #13 L1387 | must | review |
| RBA-170 | An answer chord (the chord without its root, its 4th and later notes raised an octave, strummed 20 ms apart, 1.2 beats, volume 0.03) should play on step 10 of bars 2 and 4. | robotics-bench-a.md §2.17 L558 | should | unit |
| RBA-171 | The lofi bass should be a sine on steps 0 (1.4 beats), 7 (a fifth up, 0.6 beat) and 10 (0.6 beat), on the roots D2, G1, C2 and A1. | robotics-bench-a.md §2.17 L559 | should | unit |
| RBA-172 | The lofi drums should be a kick (sine 110 to 42 Hz) on steps 0 and 9 plus 11 in bar 4, a snare (1700 Hz band-passed noise plus a 185 Hz triangle) on steps 4 and 12, and hats (7200 Hz high-passed noise) on every even step, louder on the beats. | robotics-bench-a.md §2.17 L560-562 | should | unit |
| RBA-173 | The lofi melody should play on steps 3, 6 and 14 with a 42% chance each, choosing from A4 C5 D5 E5 G5 A5 D5 C5 (two semitones lower in bar 2), with a faint octave. | robotics-bench-a.md §2.17 L563 | should | unit |
| RBA-174 | Vinyl crackle should play continuously under the lofi loop, band-passed at 3200 Hz. | robotics-bench-a.md §2.17 L564 | should | unit |
| RBA-175 | Turning Lofi off must fade the music out and stop the scheduler and the crackle about 900 ms later. | robotics-bench-a.md §2.17 L566 | must | e2e |
| RBA-176 | The tick effect (square 1800 Hz, 12 ms) must play on any Bench button, designator or part click and on soft refusals. | robotics-bench-a.md §2.17 L572 | must | e2e |
| RBA-177 | The place effect (sine 220 Hz 40 ms plus a 2500 Hz noise tick) must play when an SMD, low or tall part lands. | robotics-bench-a.md §2.17 L573 | must | e2e |
| RBA-178 | The snap effect (high-passed noise plus a 900 Hz square, 20 ms) must play when a last-in part (chip into socket, jumper cap) lands. | robotics-bench-a.md §2.17 L574 | must | e2e |
| RBA-179 | The machine effect (square 660 Hz then 330 Hz) must play as each SMD part starts to drop. | robotics-bench-a.md §2.17 L575 | must | e2e |
| RBA-180 | The oven effect (low-passed noise sweeping 400 to 1600 Hz over 1 s plus a 70 Hz sawtooth) must play when reflow starts. | robotics-bench-a.md §2.17 L576 | must | e2e |
| RBA-181 | The solder effect (5200 Hz high-passed noise 0.38 s plus a 2800 Hz band) must play as the iron reaches each joint. | robotics-bench-a.md §2.17 L577 | must | e2e |
| RBA-182 | The plug effect (1400 Hz noise plus a 140 Hz sine, 30 ms) must play when the plug is fully in. | robotics-bench-a.md §2.17 L578 | must | e2e |
| RBA-183 | The power effect (triangle C5, G5, C6, 70 ms apart) must play whenever the board powers up, running or not. | robotics-bench-a.md §2.17 L579 | must | e2e |
| RBA-184 | The unplug effect (triangle G5 down to C5) must play on an unplug that is not silent. | robotics-bench-a.md §2.17 L580 | must | e2e |
| RBA-185 | The upload effect (14 random square blips between 900 and 2300 Hz, 60 ms apart) must play when an upload starts. | robotics-bench-a.md §2.17 L581 | must | e2e |
| RBA-186 | The ding effect (sine E6 then B6) must play when reflow, soldering or an upload finishes. | robotics-bench-a.md §2.17 L582 | must | e2e |
| RBA-187 | The chime effect (sine E5, G#5, B5, E6, 60 ms apart) must play on a right quiz answer and when Effects is switched on. | robotics-bench-a.md §2.17 L583 | must | e2e |
| RBA-188 | The buzz effect (sawtooth 110 and 116 Hz, 0.18 s) must play on a wrong quiz answer and on a hot fault. | robotics-bench-a.md §2.17 L584 | must | e2e |
| RBA-189 | The error effect (triangle 330 Hz then 262 Hz) must play on refusals and on a dark fault. | robotics-bench-a.md §2.17 L585 | must | e2e |
| RBA-190 | The pop effect (a low-passed noise burst, a 70 Hz thump and a 0.9 s hiss) must play on a pop fault. | robotics-bench-a.md §2.17 L586 | must | e2e |
| RBA-191 | The sizzle effect (4000 Hz high-passed noise, 1.2 s) must play about 150 ms after every non-dark fault. | robotics-bench-a.md §2.17 L587 | must | e2e |
| RBA-192 | The whoosh effect (band-passed noise sweeping 500 to 2600 Hz, 0.45 s) must play on place, flip, the start of a plug-in, strip and the exploded-view toggle. | robotics-bench-a.md §2.17 L588 | must | e2e |
| RBA-193 | The click effect (square 1200 Hz, 10 ms) must play on an instant mode switch. | robotics-bench-a.md §2.17 L589 | must | e2e |
| RBA-194 | A running motor must hum: a sawtooth at 40 + 90·level Hz through a 420 Hz low-pass at gain 0.05·min(1, level), plus a 490 Hz square "PWM whine" in PWM mode, fading 250 ms after the motor stops and silent with Effects off or a level below 0.02. | robotics-bench-a.md §2.17 L591-593 | must | e2e |
| RBA-195 | With Effects off no effect or motor hum may play, and with Lofi off no music may play. | robotics-bench-a.md §2.17 L548-549 | must | e2e |

## RBA · URL hooks, test handles and tracking

Start-up parameters and what must not be copied.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-196 | The board key in the URL must choose the board, and changing it must remount the bench on that board. | robotics-bench-a.md §2.18 L599 | must | e2e |
| RBA-197 | ?bare=1 must open the board with nothing placed and no auto-plug. | robotics-bench-a.md §2.18 L600 | must | e2e |
| RBA-198 | ?usb=0 must open the board assembled but unplugged. | robotics-bench-a.md §2.18 L601 | must | e2e |
| RBA-199 | ?ex=1 must open the board exploded, which skips the auto-plug. | robotics-bench-a.md §2.18 L602 | must | e2e |
| RBA-200 | ?flip=ID,ID must open the board with those parts reversed (e.g. ?flip=C1 pops C1 at power-up). | robotics-bench-a.md §2.18 L603; robotics-bench-b.md §1.2 L119-120 | must | e2e |
| RBA-201 | ?sel=ID must open the board with that part selected. | robotics-bench-a.md §2.18 L604 | must | e2e |
| RBA-202 | ?mode=KEY must open the board in that mode (e.g. ?mode=hello prints "hello, robot #0.."). | robotics-bench-a.md §2.18 L605 | must | e2e |
| RBA-203 | ?pal=KEY must open the board in that palette and ?labels=0 with the labels hidden. | robotics-bench-a.md §2.18 L606-607 | must | e2e |
| RBA-204 | iynk should keep a scripted-press test hook (the original's ?press=Label@ms,Label>Choice@ms clicks buttons by label prefix at set times and records unknown labels as errors), off in production. | robotics-bench-a.md §2.18 L608; robotics-bench-b.md §1.2 L119-120 | should | e2e |
| RBA-205 | Any state handle or error log exposed for tests (the original's window.__st and data-errors) should be off or harmless in production. | robotics-bench-a.md §2.18 L611 | should | review |
| RBA-206 | must not copy: the original's usage tracking (a visitor id in localStorage, events beaconed to /api/track); iynk must not collect usage data or send analytics anywhere. | robotics-bench-a.md §2.19 L615-621 | must | review |

## RBA · Fig. 01 Arduino Uno R3

The factory-style Uno build: SMD and reflow, through-hole low to tall, socket before chip.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-207 | Fig. 01 must be "Arduino Uno R3" in "Start here", sub-line "meet the board", hint "build it part by part, solder, plug in, upload", palette cobalt, with the Bench buttons Strip to bare PCB, Pick & place SMD, Place a part ▾, Solder joints, Plug / unplug USB, Upload sketch ▾ and Exploded view. | robotics-bench-a.md §3 L627-628 | must | e2e |
| RBA-208 | Fig. 01 must use the shared Uno R3 figure at the real board's size and outline (68.58 × 53.34 mm with its bevelled corners and mounting holes at (13.97, 2.54), (15.24, 50.8), (66.04, 7.62) and (66.04, 35.56) mm, which the original rounds to 68.6 × 53.3 mm with a 2.4 mm corner radius) on 4 mm standoffs, with nothing on the mat but the board and its USB-B cable. | robotics-bench-a.md §3 L630-632; learn-arduino.md §2.5 L341; SPEC.md L125 | must | review |
| RBA-209 | Fig. 01's silkscreen must read "UNO", "ARDUINO", "DIGITAL (PWM~)", "POWER", "ANALOG IN", "RESET", "L", "TX", "RX", "ON", "ICSP" and "+" by C1 and C2, with fan-out traces to the headers and signal paths for upload (USB → 16U2 → 328P), power (fuse → regulators → power header) and pin 13 (328P → L LED). | robotics-bench-a.md §3 L634-636 | must | screenshot |
| RBA-210 | Fig. 01's 11 SMD parts must be U3 ATmega16U2 (label "16U2", drawn as the QFN-32 it really is, as Learn Arduino places it, not as the original's leaded QFP), Y1 16 MHz crystal ("16.000"), U5 LMV358 op-amp ("358"), U2 NCP1117 5 V regulator ("1117"), U4 LP2985 3.3 V regulator, F1 500 mA polyfuse, the amber L, TX and RX LEDs, the green ON LED, and RC, one group of 14 decoupling caps and resistors (9 caps, 5 resistors). | robotics-bench-a.md §3 L640-652; learn-arduino.md §2.5 L345 | must | e2e |
| RBA-211 | Fig. 01's through-hole parts must be, low: SK1 DIP-28 socket (14 pins a side), C1 47 µF (5 V), C2 47 µF (VIN), SW1 reset button, ICSP1 (16U2) and ICSP2 (328P) 2×3 headers; tall: J1 USB-B (overhanging the edge by 6.3 mm), J2 barrel jack, H1 digital 8–13 (10 pins), H2 digital 0–7 (8), H3 power (8) and H4 analog (6). | robotics-bench-a.md §3 L653-664 | must | e2e |
| RBA-212 | Fig. 01's last-in part must be U1 ATmega328P, seated 3 mm up in SK1, with the orientation chips "notch right" (correct) and "notch left", marked "ATMEGA328P" / "-PU  1842". | robotics-bench-a.md §3 L665 | must | e2e |
| RBA-213 | The one shared Uno figure must carry the parts of both originals: Robotics Bench's 24 buildable parts and Learn Arduino's hoverable parts, including the 16 MHz resonator, ferrite, protection diode, three SOT-23 transistors and resistor network that Robotics Bench folds into its passives. | robotics-bench-a.md §3 L638-666; learn-arduino.md §2.2 L275-304; SPEC.md L125 | must | review |
| RBA-214 | Fig. 01's chip descriptions must teach that U3 bridges laptop USB to the 328P's UART (which is why Serial.print and uploads work), Y1 clocks the 16U2 because USB needs a real crystal (the 328P's ceramic resonator would not do), and U5 buffers pin 13 for the L LED and chooses between USB and VIN power. | robotics-bench-a.md §3 L667-669 | must | e2e |
| RBA-215 | Fig. 01's power descriptions must teach that U2 turns 7–12 V from the jack into 5 V by burning the difference (12 V at 0.5 A is 3.5 W, so feed it 7–9 V), U4 makes 3.3 V at 150 mA at most (enough for a sensor, not Wi-Fi or a servo), and F1 resets itself after a 5 V short and protects the laptop's port. | robotics-bench-a.md §3 L669-671 | must | e2e |
| RBA-216 | Fig. 01's LED descriptions must teach that L is LED_BUILTIN on pin 13 through the op-amp, TX flickers when the board sends (Serial.print, the end of an upload) and RX when the computer sends (most of an upload), ON shows 5 V (dim or flickering means suspect the supply), and RC is 100 nF beside every IC plus pull-ups and LED resistors that absorb switching spikes. | robotics-bench-a.md §3 L671-673 | must | e2e |
| RBA-217 | Fig. 01's through-hole descriptions must teach that SK1 lets a dead chip be swapped in seconds, C1 is bulk capacitance on 5 V and C2 on VIN before the regulator (light stripe = minus, + on the silk = plus), SW1 restarts the sketch from setup() and erases nothing, ICSP1 programs or rescues the USB chip and ICSP2 burns the 328P's bootloader over SPI without USB. | robotics-bench-a.md §3 L673-676 | must | e2e |
| RBA-218 | Fig. 01's connector descriptions must teach that J1 carries power (5 V, 500 mA from a laptop) and data, J2 takes 2.1 mm centre-positive 7–12 V into the regulator (on a robot use the jack or VIN, never the 5V pin), H1 holds D8–D13, GND, AREF, SDA and SCL with D13 the L LED, H2 holds D0–D7 with PWM on 3, 5, 6, 9, 10 and 11 and D0/D1 shared with USB serial, H3 holds IOREF, RESET, 3.3V, 5V, GND, GND, VIN (fine for sensors, never motors: a stalling motor sags 5 V into a brown-out reset), H4 feeds A0–A5 to the 10-bit ADC with A4/A5 also I²C, and U1 is an 8-bit AVR at 16 MHz with 32 KB flash and 2 KB RAM, pin 1 by the notch. | robotics-bench-a.md §3 L676-679 | must | e2e |
| RBA-219 | Fig. 01 must take a USB-B plug into J1, need F1 to power, need U1 and SK1 to run, need U3 and Y1 to upload, and default to the Blink mode. | robotics-bench-a.md §3 L681-682 | must | e2e |
| RBA-220 | Fig. 01's power-up toast must name the sketch actually running ("Powered: ON lights, the factory Blink sketch starts" only when Blink runs). | robotics-bench-a.md §3 L682; §10 #8 L1380 | must | e2e |
| RBA-221 | Fig. 01's "Blink" mode (924 bytes) must blink the L LED 1 s on, 1 s off, print nothing, and show the Blink code with the comments "// pin 13 = the L LED" and "// blocks: nothing else runs". | robotics-bench-a.md §3 L688, L695-707 | must | e2e |
| RBA-222 | Fig. 01's "Blink without delay()" mode (1006 bytes) must toggle the L LED every 200 ms and show the millis() code with the comments "// non-blocking timing:", "// loop() stays free to read" and "// sensors, buttons, serial...". | robotics-bench-a.md §3 L689, L708-722 | must | e2e |
| RBA-223 | Fig. 01's "Fade on pin 13" mode (1132 bytes) must show the L LED off for about 1.03 s and on for about 1.03 s (analogWrite on a non-PWM pin is LOW below 128 and HIGH from 128), with the comments "// pin 13 has NO PWM:", "// below 128 it's LOW, above HIGH" and "// use a ~ pin (3,5,6,9,10,11)". | robotics-bench-a.md §3 L690, L723-731 | must | e2e |
| RBA-224 | Fig. 01's "Serial hello" mode (1490 bytes) must print "hello, robot #{n}" every second counting from 0, flash the TX LED briefly each second, and show the code with Serial.begin(9600) "// must match the monitor". | robotics-bench-a.md §3 L691, L732-745 | must | e2e |
| RBA-225 | While Fig. 01 runs, a "Pin 13" stat must show HIGH or LOW; in Serial hello, which never drives pin 13, it must show that pin 13 is unused rather than LOW. | robotics-bench-a.md §3 L747; §10 #19 L1394 | must | e2e |
| RBA-226 | Fig. 01 must run amber dots along the pin-13 path while the L LED is lit, yellow dots along the power path whenever powered and green dots along the upload path during uploads. | robotics-bench-a.md §3 L748 | must | e2e |
| RBA-227 | Fig. 01 must tag USB PORT (J1), RESET (SW1), DIGITAL PINS (H1), POWER JACK (J2), MICROCONTROLLER (U1) and ANALOG PINS (H4), accented while J1 is plugged, U1 runs and H1 while pin 13 is HIGH. | robotics-bench-a.md §3 L749-750 | must | e2e |
| RBA-228 | Fig. 01's full build must work end to end: Strip, Pick & place (11 SMD parts, reflow, toast), place SK1, C1, C2, SW1, ICSP1 and ICSP2 (tall parts and U1 refused until allowed), Solder joints, place J1, J2 and H1–H4, Solder joints, place U1 "notch right" (snaps in, no solder), plug in, RUNNING. | robotics-bench-a.md §3 L752-756 | must | e2e |
| RBA-229 | On Fig. 01, plugging in before J1 is placed must say "There's nothing to plug into: place J1 first", and with J1 unsoldered "J1 isn't soldered: the power pins don't touch the copper" (plug in, no power). | robotics-bench-a.md §3 L762-763 | must | e2e |
| RBA-230 | On Fig. 01, leaving out F1 must be possible and must refuse power with "No power: F1 (500 mA polyfuse) is missing or unsoldered" (the original cannot reach it). | robotics-bench-a.md §3 L764; §10 #7 L1377-1378 | must | e2e |
| RBA-231 | On Fig. 01 without U1, plugging in must say "Powered, but U1 (ATmega328P microcontroller) is missing: nothing runs" (status POWERED, ON lit, power dots flowing), and an upload must log "avrdude: programmer is not responding" and toast "No working chip: the upload times out". | robotics-bench-a.md §3 L765-766 | must | e2e |
| RBA-232 | On Fig. 01, leaving out U3 or Y1 must be possible, and an upload must then log "avrdude: ser_open(): can't open device" and toast "U3 (ATmega16U2) is missing: the computer sees no board" (or the Y1 equivalent). | robotics-bench-a.md §3 L767; §10 #7 L1377-1378 | must | e2e |
| RBA-233 | On Fig. 01, U1 fitted "notch left" must, at power-up, fault hot with "U1 is in backwards: power lands on the wrong pins and it is cooking. Unplug and turn it round": status FAULT, chip pulsing red, smoke, ON LED flickering, buzz then sizzle. | robotics-bench-a.md §3 L768 | must | e2e |
| RBA-234 | On Fig. 01, C1 or C2 fitted stripe back must pop at power-up with "Pop! C1 is in backwards: reverse voltage vents an electrolytic. Unplug and flip it", a bulged vent and smoke. | robotics-bench-a.md §3 L769 | must | e2e |
| RBA-235 | On Fig. 01, an upload during a fault must say "Fix the fault first: unplug, then correct U1", an upload during an upload "Uploading: wait for it", and placing or flipping while plugged "Unplug the power first: never work on a live board". | robotics-bench-a.md §3 L770-772 | must | e2e |
| RBA-236 | Fig. 01's "Meet the board" must explain that the Uno is built around the ATmega328P, is where digitalWrite, PWM, interrupts and serial debugging first appear, and is built here the way a factory builds it (machine-placed SMD and reflow, then through-hole low to tall, then the iron), then plugged in, uploaded, broken on purpose and fixed. | robotics-bench-a.md §3 L774-776 | must | e2e |
| RBA-237 | Fig. 01's practice task must be the reaction-timer game: an LED lights after a random delay, a button stops the clock and the time in ms goes to serial, using an interrupt, debouncing and millis() instead of delay(), small enough to show in a 15 s video. | robotics-bench-a.md §3 L776-777; SPEC.md L53 | must | e2e |
| RBA-238 | iynk must let the user build and run the reaction timer in the simulator and check that it uses an interrupt, debouncing and millis() instead of delay(). | robotics-bench-a.md §3 L776-777; SPEC.md L53, L103 | must | e2e |
| RBA-239 | Fig. 01's quiz must ask "You analogWrite() a fade to pin 13 and the L LED just snaps on and off. Why?" with "Pin 13 has no PWM hardware" (right), "The LED is burnt out" and "delay(8) is too short". | robotics-bench-a.md §9 L1340 | must | e2e |
| RBA-240 | Fig. 01's quiz must ask "Why solder the DIP socket before the ATmega328P goes in?" with "The chip only programs after soldering", "The iron never heats the chip" (right) and "Hot sockets grip better". | robotics-bench-a.md §9 L1341 | must | e2e |
| RBA-241 | Fig. 01's quiz must ask "The Uno resets every time a motor starts. First suspect?" with "A bug in setup()", "The USB cable is too long" and "The motor current sags the 5 V rail (brown-out)" (right). | robotics-bench-a.md §9 L1342 | must | e2e |
| RBA-242 | Fig. 01's quiz must ask "Which chip turns USB into serial for uploads?" with "ATmega16U2" (right), "NCP1117" and "LMV358". | robotics-bench-a.md §9 L1343 | must | e2e |

## RBA · Fig. 02 LED + resistor trainer

Ohm's law with a jumper-selected resistor and a series meter.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-243 | Fig. 02 must be "LED + resistor" in month 1, sub-line "Ohm's law", hint "build it, power it, move the jumper, read the meter", palette mint, with the buttons Strip to bare PCB, Pick & place SMD, Place a part ▾, Solder joints, "Plug / unplug 5V", "Move jumper ▾" and Exploded view, and the lesson headings "The math · {position}" and "Bench notes" (terminal starting "-- bench notes --"). | robotics-bench-a.md §4 L785-787 | must | e2e |
| RBA-244 | Fig. 02 must be a 40 × 60 mm teaching board (not a commercial product) with a 2 mm radius, holes at (3, 3), (57, 3), (3, 37) and (57, 37) on 4 mm standoffs, all through-hole. | robotics-bench-a.md §4 L789-790 | must | review |
| RBA-245 | A yellow multimeter must sit in front of Fig. 02 showing the current in "mA", with its red lead to TP1 and black lead to TP2 once each test point is fitted, and a USB-C cable into J1. | robotics-bench-a.md §4 L792-794 | must | e2e |
| RBA-246 | Fig. 02's jumper cap must sit on the JP1 row of the chosen position and move when a position is picked, even while unplugged. | robotics-bench-a.md §4 L793-794 | must | e2e |
| RBA-247 | Fig. 02's silkscreen must read "LED TRAINER", "I = V / R", "220", "1K", "10K", "NONE" beside the four rows, "D1", "+" at the LED's anode and "ON" at the switch, and its power path must run from J1 through the switch, the selected row and the LED. | robotics-bench-a.md §4 L796-797 | must | screenshot |
| RBA-248 | Fig. 02's parts must be, low: J1 USB-C power jack, SW1 slide switch, R1 220 Ω (red-red-brown-gold), R2 1 k (brown-black-red-gold), R3 10 k (brown-black-orange-gold), JL1 wire link (no resistor), TP1 red test point (+), TP2 black test point (COM); tall: JP1 2×4 jumper header, C1 100 µF capacitor, D1 red 5 mm LED with the chips "long leg +" (correct) and "long leg -". | robotics-bench-a.md §4 L799-813 | must | e2e |
| RBA-249 | Fig. 02's descriptions must teach that USB-C gives a regulated 5 V so the resistor is the only variable, the switch sits right after the supply as on a robot, the colour codes work out (22 × 10 = 220 for 13.6 mA, 10 × 100 = 1 k for 3 mA, 10 × 1000 = 10 k for 0.3 mA and the classic pull-up), the link is 0 Ω ("try it, once"), the meter in series reads the LED current (leads swapped only show a minus), the jumper picks the resistor, C1 smooths the plug-in, and the LED conducts only from anode (long leg) to cathode (flat side) with a red LED dropping about 2 V. | robotics-bench-a.md §4 L815-819 | must | e2e |
| RBA-250 | Fig. 02 must take USB-C into J1, need SW1 to power, need D1 and JP1 to run, default to 220 Ω, and toast "5 V on: current flows through the jumper, the resistor and the LED" on power-up. | robotics-bench-a.md §4 L821-822 | must | e2e |
| RBA-251 | Fig. 02 must compute I = (5 − 2.0) / R for R = 220, 1000, 10000 Ω and 0.5 Ω with no resistor, the meter showing I in mA while running and unfaulted (0 otherwise), formatted "OL" from 100 mA, two decimals below 1 mA and one decimal otherwise. | robotics-bench-a.md §4 L824-826 | must | unit |
| RBA-252 | Fig. 02's LED brightness must be clamp(log10(10·mA) / log10(200), 0.06, 1) with glow radius 4 + 9·brightness (220 Ω → 0.928, 1 k → 0.642, 10 k → 0.207). | robotics-bench-a.md §4 L827 | must | unit |
| RBA-253 | Fig. 02's "220 ohm" position must show 13.64 mA (meter 13.6), 40.9 mW in the resistor, and print "I = 3.0 V / 220 = 13.6 mA  bright, safe" every 4 s. | robotics-bench-a.md §4 L834 | must | e2e |
| RBA-254 | Fig. 02's "1 k" position must show 3.00 mA (meter 3.0), 9.0 mW, and print "I = 3.0 V / 1000 = 3.0 mA  dim" every 4 s. | robotics-bench-a.md §4 L835 | must | e2e |
| RBA-255 | Fig. 02's "10 k" position must show 0.30 mA (meter 0.30), 0.9 mW, and print "I = 3.0 V / 10000 = 0.30 mA  barely glowing" every 4 s. | robotics-bench-a.md §4 L836 | must | e2e |
| RBA-256 | Fig. 02's "No resistor" position must try to pass 6.0 A (18000.0 mW) and pop D1 with "Flash, then dark: with no resistor the LED tries to pass amps and burns out. Unplug, move the jumper back": status FAULT, meter 0.00, LED brown and dead, smoke, and the Current and Resistor stats gone. | robotics-bench-a.md §4 L837, L863 | must | e2e |
| RBA-257 | Fig. 02's "The math · {position}" panel must show the Ohm's-law worksheet (V_supply = 5.0 from USB-C, V_led = 2.0 for a red LED, R, I = (V_supply − V_led) / R worked out, "a red LED wants 5-20 mA", P = I·I·R in the resistor) with the verdict "OK." above 2 mA, "Works, but dim." at or below 2 mA, and for no resistor "R = 0.5 # just the copper: NO resistor", "I = (5.0 - 2.0) / 0.5 = 6.0 A" and "This is a short circuit.". | robotics-bench-a.md §4 L839-853 | must | e2e |
| RBA-258 | While Fig. 02 runs, the stats must show "Current" as "{value} mA" and "Resistor" as "220 R", "1000 R", "10000 R" or "NONE". | robotics-bench-a.md §4 L855 | must | e2e |
| RBA-259 | Fig. 02 must tag 5V IN (J1), POWER (SW1), JUMPER (JP1), LED (D1) and 220R (R1), accented while J1 is plugged, D1 runs without a fault and SW1 is powered. | robotics-bench-a.md §4 L856 | must | e2e |
| RBA-260 | On Fig. 02, picking "No resistor" while unplugged must say "Set. Now power the board to see it" and pop the LED at the next power-up, and moving the jumper during the pop fault must say "Fix the fault first: unplug, then correct D1". | robotics-bench-a.md §4 L864-865 | must | e2e |
| RBA-261 | On Fig. 02, D1 fitted "long leg -" must give a dark fault at power-up with "D1 is in backwards: an LED only conducts one way, so it stays dark. Unplug and flip it", status CHECK D1, the program still running and the meter at 0.00 mA. | robotics-bench-a.md §4 L866 | must | e2e |
| RBA-262 | On Fig. 02, C1 stripe back must pop with the default message, J1 unsoldered must say "J1 isn't soldered: the power pins don't touch the copper", SW1 missing "No power: SW1 (Slide switch) is missing or unsoldered", D1 or JP1 missing "Powered, but D1 (Red 5 mm LED) is missing: nothing runs", and Pick & place the no-SMD message. | robotics-bench-a.md §4 L868-872 | must | e2e |
| RBA-263 | must not copy: an LED that comes back to life after a pop; a burnt LED must stay dead until it is removed and a new one fitted. | robotics-bench-a.md §4 L874; §10 #10 L1382-1383 | must | e2e |
| RBA-264 | must not copy: a meter that never shows the surge; with no resistor the meter must show the spike (or "OL") before the LED dies. | robotics-bench-a.md §10 #10 L1382-1383 | must | e2e |
| RBA-265 | Fig. 02's build must be: no SMD; place the low parts (J1, SW1, R1, R2, R3, JL1, TP1, TP2), then the tall parts (JP1, C1, D1); solder; plug; and the board must accept the plug as soon as J1 is soldered, the power and run checks then explaining what is missing. | robotics-bench-a.md §4 L876-877 | must | e2e |
| RBA-266 | Fig. 02's "Meet the board" must explain the first circuit every roadmap skips: 5 V in, a red LED takes about 2 V, the resistor takes the other 3 V and sets the current (I = V / R), the jumper picks the resistor, the meter is in series, and every position should be tried, including no resistor. | robotics-bench-a.md §4 L879-881 | must | e2e |
| RBA-267 | Fig. 02's practice task must be a divider of two 10 k resistors: predict the middle voltage by hand, check it, then swap one for 4.7 k and predict again before looking. | robotics-bench-a.md §4 L881-882 | must | e2e |
| RBA-268 | The divider practice should be doable inside iynk (the original sends the user to the Falstad simulator). | robotics-bench-a.md §4 L881-882 | should | e2e |
| RBA-269 | Fig. 02's quiz must ask "5 V supply, red LED (2 V), 330 ohm resistor. Current?" with "15 mA", "9 mA" (right) and "1.5 mA". | robotics-bench-a.md §9 L1344 | must | e2e |
| RBA-270 | Fig. 02's quiz must ask "An LED in backwards does what at 5 V?" with "Explodes", "Stays dark, no damage" (right) and "Glows dimly". | robotics-bench-a.md §9 L1345 | must | e2e |
| RBA-271 | Fig. 02's quiz must ask "Why does the LED die with no resistor?" with "Too much voltage", "Nothing limits the current, so it tries to pass amps" (right) and "The jumper shorts the supply". | robotics-bench-a.md §9 L1346 | must | e2e |

## RBA · Fig. 03 Transistor switch

A Nano pin switching a battery-powered gear motor through a 2N2222, with a flyback diode.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-272 | Fig. 03 must be "Transistor switch" in month 1, sub-line "logic drives power", hint "a 20 mA pin switches a 250 mA motor", palette mint, with the default seven Bench buttons. | robotics-bench-a.md §5 L888-889 | must | e2e |
| RBA-273 | Fig. 03 must model a low-side NPN switch board: a 2N2222 (TO-92) with a 1 k base resistor, a 1N4007 flyback diode across the motor, a 100 µF bulk cap, a green indicator LED with a 1 k resistor, a 3-pin logic header and two 2-way screw terminals, on a 40 × 55 mm PCB (2 mm radius, holes at (2.5, 37.5), (52.5, 37.5), (52.5, 2.5)), all through-hole. | robotics-bench-a.md §5 L891-893 | must | review |
| RBA-274 | Fig. 03's mat must hold an Arduino Nano in front of the PCB with its micro-USB cable, a 4×AA holder beside it and a TT gear motor with a yellow-hub wheel to the left, wired with three jumpers from the Nano to H1 (yellow IN, red 5V, black GND), the battery leads into J1 and the motor leads into J2. | robotics-bench-a.md §5 L895-898 | must | e2e |
| RBA-275 | Fig. 03's silkscreen must read "NPN SWITCH", "GND 5V IN", "MOTOR", "BATT", two "+", "1K" twice and "1N4007", with signal paths for the base (header → R1 → Q1), the load (battery + → motor) and the return (motor → Q1 → battery −). | robotics-bench-a.md §5 L900-901 | must | screenshot |
| RBA-276 | Fig. 03's parts must be, low: R1 1 k base resistor (brown-black-red-gold), D1 1N4007 flyback diode (chips "band to +" correct, "band to -"), R2 1 k LED resistor; tall: Q1 2N2222 (chips "flat side front" correct, "flat side back"), LED1 green indicator LED, C1 100 µF, H1 logic header IN / 5V / GND, J1 battery terminal (green, two screws) and J2 motor terminal (blue, two screws). | robotics-bench-a.md §5 L903-915 | must | e2e |
| RBA-277 | must not copy: a non-polar indicator LED; Fig. 03's LED1 must be polar like any real LED, staying dark when fitted backwards. | robotics-bench-a.md §5 L911 | must | e2e |
| RBA-278 | Fig. 03's descriptions must teach that R1 limits the base current to (5 − 0.7) / 1000 = 4.3 mA (without it the pin and the transistor fight), D1 sits across the motor with its band toward + and catches the tens-of-volts kick when the coil switches off, R2 gives the LED about 3 mA, a few mA into Q1's base lets up to 600 mA flow (hFE about 100, which is how a 3.3 V pin controls a motor), LED1 looks half bright in PWM because the eye averages, C1 covers the start-up gulp of current, H1's GND must be shared with the battery or the base current has no way home, J1's 4 × AA (4.8–6 V) feeds only the motor so its spikes cannot reset the controller, and J2 puts the motor between battery + and Q1's collector (low-side switching). | robotics-bench-a.md §5 L917-922 | must | e2e |
| RBA-279 | Fig. 03 must take micro-USB into the Nano (so it can be plugged in on a bare board, which says "No power: J1 (Battery terminal) is missing or unsoldered"), need J1 to power, need Q1, R1, H1 and J2 to run, and default to "Input HIGH". | robotics-bench-a.md §5 L924-926 | must | e2e |
| RBA-280 | must not copy: the fixed power-up toast "Powered: pin 9 goes HIGH and the motor spins" shown even in LOW mode; Fig. 03's power-up message must describe the mode that is running. | robotics-bench-a.md §5 L925; §10 #8 L1379 | must | e2e |
| RBA-281 | Fig. 03's "Input HIGH" mode (742 bytes) must light LED1, run the motor at full speed, print "pin 9 HIGH -> Ib 4.3 mA -> Ic 250 mA (gain x58)" every 3 s, and show the code with "// ~4 mA into the base...", "// ...lets ~250 mA flow through the motor" and "// a pin gives 20 mA at most: never wire a motor to it". | robotics-bench-a.md §5 L932, L942-952 | must | e2e |
| RBA-282 | Fig. 03's "PWM 50%" mode (806 bytes) must light LED1 at about 0.45 brightness, run the motor at half speed with the PWM whine, print "analogWrite(9, 128) -> 490 Hz, 50% duty -> half speed" every 3 s, and show the code with "// a ~ pin: hardware PWM", "// 50% duty at 490 Hz:", "// Q1 switches on and off 490 times a second" and "// the motor averages it out: half speed (and a whine)". | robotics-bench-a.md §5 L933, L953-963 | must | e2e |
| RBA-283 | Fig. 03's "Input LOW" mode (690 bytes) must stop the motor (it coasts), print "pin 9 LOW -> Q1 off -> motor coasts to a stop" once, and show the code with "// no base current, Q1 is off" and "// the coil's energy dumps through D1". | robotics-bench-a.md §5 L934, L964-973 | must | e2e |
| RBA-284 | With D1 missing or unsoldered, uploading PWM 50% must burn Q1 with "No flyback diode: every PWM switch-off the motor coil kicks back ~50 V and punches through Q1. Unplug, fit D1", and switching to LOW after HIGH must burn Q1 with "No flyback diode: when Q1 switched off, the motor coil kicked back ~50 V and killed it. Unplug, fit D1". | robotics-bench-a.md §5 L936-938 | must | e2e |
| RBA-285 | must not copy: the missing-flyback failure being reachable only by a flip-and-solder timing trick; leaving out D1 must be a normal choice. | robotics-bench-a.md §5 L997-1000; §10 #7 L1377 | must | e2e |
| RBA-286 | While Fig. 03 runs, "Base current" must show 4.3 mA (HIGH), 2.1 mA (PWM) or 0.0 mA (LOW) and "Motor current" 250 mA, 125 mA or 0 mA (values from 1 A shown as x.xx A). | robotics-bench-a.md §5 L975-976 | must | e2e |
| RBA-287 | must not copy: an unlabelled average; in PWM mode the base and motor currents must be labelled as averages (4.3 mA and 250 mA while on, 50% duty). | robotics-bench-a.md §5 L975; §10 #19 L1394 | must | e2e |
| RBA-288 | Fig. 03's wheel must ease toward its target speed (full in HIGH, half in PWM, stopped in LOW or during a fault or an upload), faster speeding up than slowing down, turning at up to 13 rad/s, with the motor hum following the speed. | robotics-bench-a.md §5 L978-980 | must | e2e |
| RBA-289 | While Fig. 03's motor turns, yellow dots must run along the base path and amber dots along the load and return paths at a speed that follows the motor. | robotics-bench-a.md §5 L982 | must | e2e |
| RBA-290 | Fig. 03 must tag TRANSISTOR (Q1), MOTOR (J2), BATTERY (J1), FLYBACK (D1) and LOGIC IN (H1), accenting Q1 and J2 while the motor is driven, J1 while powered, H1 while running and D1 while running PWM. | robotics-bench-a.md §5 L983-984 | must | e2e |
| RBA-291 | On Fig. 03, D1 fitted "band to -" must fault hot at power-up with "D1 is in backwards: it now conducts straight across the battery, a dead short. It is cooking. Unplug and flip it (band to +)". | robotics-bench-a.md §5 L990 | must | e2e |
| RBA-292 | On Fig. 03, Q1 fitted "flat side back" must fault hot at power-up with "Q1 is in backwards: collector and emitter swap, it barely switches and overheats. Unplug, flat side to the front". | robotics-bench-a.md §5 L991 | must | e2e |
| RBA-293 | On Fig. 03, C1 stripe back must pop with the default message, and with D1 unsoldered the PWM fault must fire again at every later power-up while the mode stays PWM. | robotics-bench-a.md §5 L992-993 | must | e2e |
| RBA-294 | Fig. 03's "Meet the board" must explain that a pin gives about 20 mA while a small gear motor wants 250 mA (ten times that at stall), so wiring it to a pin kills the pin; a transistor lets a few mA of base current switch the battery current; and without the flyback diode the coil kills the transistor the first time it switches off. | robotics-bench-a.md §5 L1002-1004 | must | e2e |
| RBA-295 | Fig. 03's practice task must be: on a breadboard build a logic-input LED switch, then swap the LED for a small motor plus flyback diode, measure the base and collector currents and work out the gain. | robotics-bench-a.md §5 L1004-1005 | must | e2e |
| RBA-296 | Fig. 03's quiz must ask "Why not wire the motor straight to pin 9?" with "The pin gives ~20 mA; the motor wants 250 mA+" (right), "Pins only output 3.3 V" and "The motor needs AC". | robotics-bench-a.md §9 L1347 | must | e2e |
| RBA-297 | Fig. 03's quiz must ask "What is D1 protecting?" with "The battery from overcharge", "Q1 from the voltage spike when the coil switches off" (right) and "The LED from reverse voltage". | robotics-bench-a.md §9 L1348 | must | e2e |
| RBA-298 | Fig. 03's quiz must ask "The battery GND is not connected to the controller GND. What happens?" with "Nothing, they are separate", "The base current has no return path: Q1 never turns on" (right) and "The motor runs backwards". | robotics-bench-a.md §9 L1349 | must | e2e |

## RBA · Fig. 04 ESP32-S3 DevKitC-1

3.3 V Wi-Fi board on a breadboard, with a phone that loads its web page.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-299 | Fig. 04 must be "ESP32-S3 DevKit" in month 2, sub-line "WiFi + two cores", hint "plug into UART, upload, open the web page on the phone", palette cobalt, with the default seven Bench buttons. | robotics-bench-a.md §6 L1011-1012 | must | e2e |
| RBA-300 | Fig. 04 must model the Espressif ESP32-S3-DevKitC-1: a 62.7 × 25.4 mm PCB (1.2 mm radius, no holes) standing 11 mm up on its headers in a breadboard, with the ESP32-S3-WROOM-1 module (antenna at the end away from the two USB-C ports), a CP2102N USB-UART, an AMS1117-3.3, the WS2812 RGB LED, RST (EN) and BOOT (GPIO0) buttons, UART and native USB-C ports and 2 × 22-pin headers. | robotics-bench-a.md §6 L1014-1017 | must | review |
| RBA-301 | must not copy: the RGB LED on GPIO48 with no board revision stated; Fig. 04 must model the ESP32-S3-DevKitC-1 v1.1 and say so, with its RGB LED on GPIO38 (GPIO48 is the v1.0 pin) in the silk, code and descriptions. | robotics-bench-a.md §6 L1016; §10 #20 L1395 | must | review |
| RBA-302 | Fig. 04 must stand on a white breadboard (6 mm larger than the PCB on each side, 8.5 mm tall, red and blue rail stripes, two rows of holes at 2.54 mm, black header plastic between breadboard and PCB). | robotics-bench-a.md §6 L1019-1020 | must | screenshot |
| RBA-303 | A phone must lie in front of Fig. 04 showing "no network" when idle, "connecting..." while the WiFi sketch connects, and after about 2.6 s a light page with "Hello robot", "192.168.1.42" and a blue "LED ON" button that turns green "SENT" for 0.45 s every 3 s. | robotics-bench-a.md §6 L1020-1023 | must | e2e |
| RBA-304 | Fig. 04's silkscreen must read "ESP32-S3-DevKitC-1", "UART", "USB", "RST", "BOOT", "RGB 38" (the v1.1 pin, where the original reads "RGB 48") and "PWR", with an upload path from the UART USB-C through the CP2102N to the module and a power path. | robotics-bench-a.md §6 L1025 | must | screenshot |
| RBA-305 | Fig. 04's parts must be ten SMD parts, U3 CP2102N USB-UART ("2102"), U2 AMS1117 3.3 V regulator ("1117"), the WS2812 RGB LED, the red power LED, RC passives, SW1 RST (EN), SW2 BOOT (GPIO0), J1 USB-C (UART, takes the plug), J2 USB-C (native USB) and U1 ESP32-S3-WROOM-1, plus two low through-hole parts, H1 and H2 1 × 22 pin headers soldered from below. | robotics-bench-a.md §6 L1027-1042 | must | e2e |
| RBA-306 | Fig. 04's descriptions must teach that the CP2102N is the serial port the bootloader listens on and toggles EN/BOOT so uploads need no button presses, the LDO makes 3.3 V (never 5 V on a GPIO) while WiFi bursts pull up to 500 mA, the WS2812 sets any colour over one data wire (the protocol of robot status strips), the PWR LED is hard-wired and burns a few mA even in deep sleep (cut it on battery robots), and every chip gets 100 nF while the module wants 10 µF for WiFi bursts. | robotics-bench-a.md §6 L1044-1047 | must | e2e |
| RBA-307 | Fig. 04's descriptions must teach that RST restarts from setup(), holding BOOT and tapping RST forces download mode (the rescue when uploads refuse to connect), the UART port goes through the CP2102N (use it when in doubt), the native port lets the S3 act as a keyboard, MIDI device or webcam, the module has two Xtensa cores at 240 MHz, 512 KB RAM, 8 MB flash and WiFi + BLE under a shield (keep metal and hands off the zigzag antenna), and the 22-pin headers are soldered from below for breadboards (avoid the strapping pins GPIO 0, 3, 45 and 46). | robotics-bench-a.md §6 L1047-1050 | must | e2e |
| RBA-308 | Fig. 04 must take USB-C into J1 (the UART port), need U2 to power, need U1 to run, need U3 to upload, default to Blink RGB, toast "3.3 V up: the red PWR LED lights, the RGB starts cycling" when Blink RGB starts, and power and run right after reflow without its headers. | robotics-bench-a.md §6 L1052-1053 | must | e2e |
| RBA-309 | Fig. 04's "Blink RGB" mode (262144 bytes) must cycle the RGB LED through every hue in 4 s (HSL saturation 0.85, lightness 0.5) at 62 mA, and show the NeoPixel code (1 LED on the RGB pin, ColorHSV, "// any colour, 1 wire"). | robotics-bench-a.md §6 L1059, L1070-1083 | must | e2e |
| RBA-310 | must not copy: the Blink RGB serial line that always prints "hue 0 deg"; it must print the hue actually shown every 4 s (0, 90, 180, 270 deg in turn). | robotics-bench-a.md §6 L1059; §10 #3 L1370 | must | e2e |
| RBA-311 | Fig. 04's "WiFi web server" mode (812032 bytes) must blink the RGB blue (#3e86d9 / #1d2a4a, 0.5 s period) while connecting, then go green (#43c25c), print "Connecting to bench-lab ...", "....", "WiFi connected, IP 192.168.1.42" and then every 3 s "GET / from 192.168.1.17 (phone) 200 OK", draw 140 mA connecting and 105 mA connected, and show the WiFi/WebServer code with "// WiFi stack runs on core 0, your loop() on core 1". | robotics-bench-a.md §6 L1060, L1084-1103 | must | e2e |
| RBA-312 | Fig. 04's "Deep sleep" mode (241664 bytes) must wake for about 1.5 s every 12 s with the RGB pale blue (#cfe4ff), print "boot #N, sleeping 10 s" each boot, draw 48 mA awake and 10 µA asleep, and show the RTC_DATA_ATTR code with "// RTC memory survives deep sleep", "// chip: ~10 uA. board: the PWR LED" and "// and the LDO still burn mA!". | robotics-bench-a.md §6 L1061, L1104-1116 | must | e2e |
| RBA-313 | must not copy: avrdude wording on an ESP32 upload; Fig. 04's upload log must use esptool wording ("Connecting....", "Writing at 0x...", "Hash of data verified.", "Hard resetting via RTS pin...") with the real sketch size. | robotics-bench-a.md §10 #4 L1371-1372 | must | e2e |
| RBA-314 | Fig. 04 must glow the RGB in the sketch's colour, send three expanding blue arcs from the antenna end of U1 while WiFi is up, and send a green dot from the phone to the antenna in 0.45 s on every tap. | robotics-bench-a.md §6 L1063-1065 | must | e2e |
| RBA-315 | While Fig. 04 runs, "Current" must show the board's draw in mA (or "10 µA" below 1 mA), and a second stat must show "Board (LED+LDO)" 48 mA awake / ~8 mA asleep in Deep sleep, or otherwise "Core 0 / core 1" as "WiFi / loop" (WiFi sketch) or "idle / loop". | robotics-bench-a.md §6 L1118-1119 | must | e2e |
| RBA-316 | Fig. 04 must tag UART PORT (J1), BOOT (SW2), RGB LED (RGB), WIFI MODULE (U1) and GPIO (H1), accenting J1 while plugged, U1 while WiFi is up and the RGB while lit. | robotics-bench-a.md §6 L1120 | must | e2e |
| RBA-317 | Fig. 04 has no polar parts; leaving out U3 must be possible, and an upload must then report that the computer sees no board. | robotics-bench-a.md §6 L1122; §10 #7 L1378 | must | e2e |
| RBA-318 | Fig. 04's build must be Pick & place (10 parts), reflow, place H1 and H2, Solder joints, and the board must already power and run after reflow before the headers are fitted. | robotics-bench-a.md §6 L1126-1127 | must | e2e |
| RBA-319 | Fig. 04's "Meet the board" must explain that the S3 is the step up for WiFi, Bluetooth, speed and two cores at less than an Uno's price, that the DevKitC-1 adds the regulator, USB-UART, BOOT/RST and an RGB LED, that it is a 3.3 V part, and when to use the Arduino framework (speed of work), ESP-IDF (control of cores and power) and MicroPython (quick sensor tests, never a balancing loop). | robotics-bench-a.md §6 L1129-1131 | must | e2e |
| RBA-320 | Fig. 04's practice task must be: serve a web page with live sensor readings and buttons that drive a servo, opened from a phone on the same WiFi. | robotics-bench-a.md §6 L1131-1132 | must | e2e |
| RBA-321 | Fig. 04's quiz must ask "An upload says "Failed to connect to ESP32". The classic fix?" with "Hold BOOT, tap RST, upload again" (right), "Swap to 5 V" and "Reflash the CP2102N". | robotics-bench-a.md §9 L1350 | must | e2e |
| RBA-322 | Fig. 04's quiz must ask "Deep sleep: the chip draws ~10 uA, yet the battery drains in days. Likely culprit?" with "The WiFi antenna", "The always-on power LED and the LDO" (right) and "RTC memory". | robotics-bench-a.md §9 L1351 | must | e2e |
| RBA-323 | Fig. 04's quiz must ask "Why MicroPython is a bad fit for a balancing robot loop?" with "It cannot read I2C", "Garbage collection pauses wreck the loop timing" (right) and "It has no float maths". | robotics-bench-a.md §9 L1352 | must | e2e |

## RBA · Fig. 05 TB6612FNG dual motor driver

The recommended MOSFET H-bridge driving two gear motors from a 2S LiPo.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-324 | Fig. 05 must be "TB6612FNG driver" in the motors-and-drivers month, sub-line "H-bridge, PWM", hint "power the bench, then send drive commands", palette tomato, with the buttons Strip to bare PCB, Pick & place SMD, Place a part ▾, Solder joints, "Power the bench", "Send command ▾" and Exploded view. | robotics-bench-a.md §7 L1138-1139 | must | e2e |
| RBA-325 | Fig. 05 must be presented as the recommended motor driver, explaining that its MOSFET bridges drop about 0.5 V while the L298N's bipolar ones drop about 2 V as heat. | robotics-bench-a.md §7 L1167-1170; SPEC.md L46 | must | e2e |
| RBA-326 | Fig. 05 must model a SparkFun-style TB6612FNG breakout, 20.3 × 25.4 mm (0.8 × 1.0 in) with a 1.2 mm radius, on a mini breadboard with two 1 × 8 headers pointing down into it. | robotics-bench-a.md §7 L1141-1142 | must | review |
| RBA-327 | Fig. 05's mat must hold the mini breadboard, a Nano to the left, a 2S LiPo labelled "7.4V LIPO" in front of the Nano, and two TT motors in front of the PCB (A with a yellow hub, B with a red hub), wired Nano → PWMA (yellow), AIN1 (green), AIN2 (blue), STBY (white), PWMB (orange) and GND (black) with arching jumpers, the motors into A01/A02 and B01/B02, and the battery into VM and GND. | robotics-bench-a.md §7 L1144-1148 | must | e2e |
| RBA-328 | must not copy: Fig. 05 running motor B and the logic side with BIN1, BIN2 and VCC unwired; every pin the sketch and the chip need (BIN1, BIN2, VCC) must be wired on the mat. | robotics-bench-a.md §10 #11 L1384-1385 | must | e2e |
| RBA-329 | Fig. 05 must tag "MOTOR A" and "MOTOR B" (accented while spinning) and "NANO" (accented while running) besides its part tags. | robotics-bench-a.md §7 L1148-1149 | must | e2e |
| RBA-330 | Fig. 05's silkscreen must name the header pins VM VCC GND A01 A02 B02 B01 GND (motor side) and PWMA AIN2 AIN1 STBY BIN1 BIN2 PWMB GND (control side), with "+" by C3, and signal paths from the control pins to the IC and from the IC to the outputs. | robotics-bench-a.md §7 L1151-1152 | must | screenshot |
| RBA-331 | Fig. 05's parts must be, SMD: U1 TB6612FNG ("TB6612", 12 leads a side), C1 100 nF (VCC), C2 100 nF (VM), R1 1 k (LED) and D1 the green power LED; low: C3 10 µF (VM, polar); tall: H1 motor + power header 1 × 8 and H2 control header 1 × 8. | robotics-bench-a.md §7 L1154-1165 | must | e2e |
| RBA-332 | Fig. 05's descriptions must teach two MOSFET H-bridges at 1.2 A per channel (3.2 A peak), C1 keeping motor noise off the logic rail and C2 decoupling VM at the pins, R1 giving the LED (5 − 2) / 1 k = 3 mA, C3 as the bulk tank for per-PWM-cycle spikes (stripe = minus), H1's VM 2.5–13.5 V and VCC 2.7–5.5 V as two supplies on purpose, and H2's PWMA/PWMB for speed, AIN/BIN for direction and STBY that must be HIGH or the chip sleeps. | robotics-bench-a.md §7 L1167-1170 | must | e2e |
| RBA-333 | Fig. 05 must power from micro-USB into the Nano, need U1, H1 and H2 to run, default to Forward 50%, toast "Nano on USB, LiPo on VM: the driver is awake (STBY high)", and on a bare board say "Powered, but U1 (TB6612FNG dual H-bridge) is missing: nothing runs". | robotics-bench-a.md §7 L1172-1173 | must | e2e |
| RBA-334 | Fig. 05 must model VBAT 7.4 V and a 0.5 V bridge drop, with Duty = pwm/255 and Motor V = duty·(7.4 − 0.5) while driven: Forward 50% (H, L, 128) 50% 3.5 V; Forward 100% (H, L, 255) 100% 6.9 V; Reverse (L, H, 160) 63% 4.3 V; Brake (H, H, 255) 100% 0.0 V; Coast (L, L, 0) 0% 0.0 V. | robotics-bench-a.md §7 L1175-1185 | must | unit |
| RBA-335 | Fig. 05's wheels must keep their angle between modes, turn at s·2π·1.6 rad/s when driven (10.05 rad/s at 100%, −6.33 in reverse), stop at once on Brake, and on Coast spin down as v0·e^(−t/0.9). | robotics-bench-a.md §7 L1186-1188 | must | unit |
| RBA-336 | must not copy: both of Fig. 05's wheels sharing one angle; each motor must have its own angle and speed. | robotics-bench-a.md §7 L1188; §10 #11 L1385 | must | unit |
| RBA-337 | Fig. 05's commands must all be instant ("Send command"): the click sound and "-- {title} --" in the terminal, or "Set. Now power the board to see it" while unplugged. | robotics-bench-a.md §7 L1189 | must | e2e |
| RBA-338 | Fig. 05's serial lines must be: Forward 50% every 3 s "AIN1=H AIN2=L PWMA=128 -> forward, ~3.5 V average"; Forward 100% every 3 s "AIN1=H AIN2=L PWMA=255 -> forward, ~6.9 V at the motor"; Reverse every 3 s "AIN1=L AIN2=H PWMA=160 -> reverse"; Brake once "AIN1=H AIN2=H -> short brake: stopped hard"; Coast once "AIN1=L AIN2=L -> coast: spinning down freely". | robotics-bench-a.md §7 L1190-1191 | must | e2e |
| RBA-339 | Fig. 05's code must set pins 5–11 as outputs, drive STBY HIGH ("// LOW = whole chip asleep"), define drive(in1, in2, pwm) for both channels and end with the truth table "// IN1 IN2 -> motor:  H L fwd \| L H rev \| H H brake \| L L coast", the drive() line and its comment changing per command (half speed, full speed, reverse, short brake with both leads tied, coast with outputs open). | robotics-bench-a.md §7 L1193-1216 | must | e2e |
| RBA-340 | While Fig. 05 runs, the stats must show Duty, Direction and Motor V, yellow dots must run on the PWM paths and red dots on the output paths while a wheel turns, and DRIVER IC (U1), CONTROL PINS (H2) and MOTOR + POWER (H1) must be tagged (U1 and H1 accented while the wheels turn, H2 while running). | robotics-bench-a.md §7 L1218-1220 | must | e2e |
| RBA-341 | On Fig. 05, C3 fitted stripe back must pop with "Pop! C3 is in backwards: reverse voltage vents an electrolytic. Unplug and flip it". | robotics-bench-a.md §7 L1222 | must | e2e |
| RBA-342 | Fig. 05 should add breakable states the original lacks: STBY held LOW (the chip sleeps and nothing turns) and a stalled motor drawing its stall current. | robotics-bench-a.md §7 L1223; SPEC.md L102 | should | e2e |
| RBA-343 | Fig. 05's build must be Pick & place (5 SMD parts), reflow, place C3, place H1 and H2, Solder joints (3), Power the bench. | robotics-bench-a.md §7 L1225 | must | e2e |
| RBA-344 | Fig. 05's "Meet the board" must explain that a pin gives 20 mA at 5 V while a gear motor wants about an amp at 7 V, that an H-bridge is four switches connecting the motor one way, the other way or shorting it, that IN1/IN2 pick the direction and PWM sets the speed by switching thousands of times a second, that the MOSFETs lose about 0.5 V (why it replaced the L298N), and to try brake and coast back to back. | robotics-bench-a.md §7 L1227-1229 | must | e2e |
| RBA-345 | Fig. 05's practice task must be: drive one motor both ways at five PWM speeds, then add an encoder and turn exactly one revolution whatever the battery voltage (the first real closed loop). | robotics-bench-a.md §7 L1229-1231 | must | e2e |
| RBA-346 | Fig. 05's quiz must ask "AIN1 = HIGH and AIN2 = HIGH. What does motor A do?" with "Spins forward", "Short brake: stops hard" (right) and "Coasts to a stop". | robotics-bench-a.md §9 L1353 | must | e2e |
| RBA-347 | Fig. 05's quiz must ask "Why use the TB6612FNG instead of the L298N?" with "It drops ~0.5 V instead of ~2 V, so less heat and more speed" (right), "It has more pins" and "It needs no PWM". | robotics-bench-a.md §9 L1354 | must | e2e |
| RBA-348 | Fig. 05's quiz must ask "PWM at 50% duty from a 7.4 V pack. What does the motor see on average?" with "7.4 V", "About 3.5 V" (right) and "0 V, PWM is digital". | robotics-bench-a.md §9 L1355 | must | e2e |

## RBA · Fig. 06 L298N dual H-bridge module

The driver every tutorial uses, shown losing 2 V as heat.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBA-349 | Fig. 06 must be "L298N driver" in the motors-and-drivers month, sub-line "why not to use it", hint "power it, pick a direction, feel the heat", palette tomato, with the buttons Strip to bare PCB, Pick & place SMD, Place a part ▾, Solder joints, "Plug in nano + battery", Upload sketch ▾ and Exploded view. | robotics-bench-a.md §8 L1237-1238 | must | e2e |
| RBA-350 | Fig. 06 must carry its warnings: its bipolar bridges waste about 2 V as heat, it needs the big heatsink, and once understood it should be replaced by a TB6612FNG or DRV8833. | robotics-bench-a.md §8 L1277-1278; SPEC.md L46 | must | e2e |
| RBA-351 | Fig. 06 must model the red 43 × 43 mm L298N module: the L298N in a Multiwatt-15 bolted to a finned heatsink, a 78M05 regulator, 8 flyback diodes, two 220 µF caps, a 3-way power terminal (12V, GND, 5V out), two 2-way motor terminals, the IN1–IN4 header and the ENA/ENB headers with jumper caps, holes at (3, 3), (3, 40) and (40, 40). | robotics-bench-a.md §8 L1240-1242 | must | review |
| RBA-352 | Fig. 06's mat must hold a Nano and a 2S LiPo ("7.4V LIPO") left of the PCB and two TT motors with smaller wheels in front, wired battery red → 12V and black → GND, motor A red/black → J2, motor B orange/blue → J3, and Nano → IN1–IN4 (yellow, green, white, purple). | robotics-bench-a.md §8 L1244-1247 | must | e2e |
| RBA-353 | While Fig. 06 runs with heat above zero, four wavy cream strokes must rise and sway from the heatsink as heat shimmer. | robotics-bench-a.md §8 L1249-1250 | must | e2e |
| RBA-354 | Fig. 06's silkscreen must read "L298N MODULE", "OUT1 OUT2", "OUT3 OUT4", "12V GND 5V", "IN1 IN2 IN3 IN4" and "PWR". | robotics-bench-a.md §8 L1252 | must | screenshot |
| RBA-355 | Fig. 06's parts must be, SMD: U2 78M05 ("78M05"), D1 the eight flyback diodes, LED1 red power LED and RC resistors and 100 nF caps; low: C1 220 µF (12V), C2 220 µF (5V), J4 IN1–IN4 header, JEA and JEB headers; tall: U1 L298N on its heatsink (9 fins, 15 staggered legs, "L298N" / "ST  1834"), J1 power terminal 12V / GND / 5V, J2 motor A and J3 motor B terminals; last-in: JPA and JPB jumper caps. | robotics-bench-a.md §8 L1254-1272 | must | e2e |
| RBA-356 | Fig. 06's eight flyback diodes must be drawn as diodes with cathode bands, not as chip resistors as in the original. | robotics-bench-a.md §8 L1259; SPEC.md L26 | must | screenshot |
| RBA-357 | Fig. 06's descriptions must teach that the 78M05 makes 5 V for the logic while the 5V-EN jumper is on and the input stays under 12 V (above that pull the jumper and feed 5 V), the 8 diodes catch the coil kick, pull-downs stop floating inputs twitching the motor, C1/C2 are bulk caps on 12V and 5V, IN1/IN2 and IN3/IN4 set each motor's direction (equal = brake, 5 V logic), ENA/ENB jumpers mean always full speed (remove one and drive PWM for speed), U1's 1990s bipolar pairs drop about 1–1.5 V each so about 2 V becomes heat, J1 takes 5–35 V with the third screw the onboard 5 V output, swapping a motor's wires reverses it like swapping IN1/IN2, and the jumper caps go on last. | robotics-bench-a.md §8 L1274-1279 | must | e2e |
| RBA-358 | must not copy: Fig. 06 running without the ENA/ENB jumper caps; with a jumper missing (and no PWM wired to that EN pin) that motor must not run, as on the real module. | robotics-bench-a.md §8 L1281-1282; §10 #6 L1375-1376 | must | e2e |
| RBA-359 | must not copy: the fixed toast "Battery on, nano running: both motors forward at full speed" shown in Brake; Fig. 06's power-up message must describe the sketch that is running. | robotics-bench-a.md §8 L1282; §10 #8 L1379-1380 | must | e2e |
| RBA-360 | Fig. 06 must model VBAT 7.4 V, a 2.0 V bridge drop and 0.6 A per motor: "At motor" 5.4 V while a motor is driven (0 otherwise), "Heat" n·0.6·2.0 W (1.2 W per motor, 2.4 W for two), "Battery" 7.4 V. | robotics-bench-a.md §8 L1284-1285 | must | unit |
| RBA-361 | must not copy: Fig. 06's wheel angles resetting to 0 at every mode change; the wheels (7 rad/s when driven) must carry their angle across modes. | robotics-bench-a.md §8 L1286; §10 #12 L1386 | must | unit |
| RBA-362 | Fig. 06's "Forward" sketch (1180 bytes, IN1–IN4 H L H L) must drive both motors forward at 5.4 V and 2.4 W and print "battery 7.4 V -> motors 5.4 V, 2.0 V lost in the bridge" every 3 s. | robotics-bench-a.md §8 L1290 | must | e2e |
| RBA-363 | Fig. 06's "Reverse" sketch (1180 bytes, L H L H) must drive both motors backward and print "reverse: same 2.0 V lost, same heat" every 3 s. | robotics-bench-a.md §8 L1291 | must | e2e |
| RBA-364 | Fig. 06's "Spin on the spot" sketch (1180 bytes, H L L H) must drive A forward and B in reverse and print "A forward, B reverse: the robot pivots" every 3 s. | robotics-bench-a.md §8 L1292 | must | e2e |
| RBA-365 | Fig. 06's "Brake" sketch (1172 bytes, H H H H) must stop both motors at 0.0 V and 0.0 W and print "brake: motor terminals shorted, 0 A drawn" every 3 s. | robotics-bench-a.md §8 L1293 | must | e2e |
| RBA-366 | Fig. 06's code must set ENA = 9, IN1 = 8, IN2 = 7 (motor A) and ENB = 3, IN3 = 5, IN4 = 4 (motor B), write the IN levels and analogWrite(ENA/ENB, 255) "// jumper on ENA = always full speed", the last comment changing per sketch ("both forward", "swap IN pins = reverse", "A forward, B back = turn in place", "IN1 = IN2 shorts the motor: brake"). | robotics-bench-a.md §8 L1295-1312 | must | e2e |
| RBA-367 | While Fig. 06 runs, the stats must show Battery, At motor and Heat, green dots must run on the input path and yellow dots on the output paths while heat is above zero, and L298N (U1), POWER IN (J1), MOTOR A (J2), MOTOR B (J3) and CONTROL (J4) must be tagged (U1 accented while hot, J1 while powered, J2/J3 while their motor turns, J4 while running). | robotics-bench-a.md §8 L1314-1317 | must | e2e |
| RBA-368 | On Fig. 06, C1 or C2 stripe back must pop with the default message, plugging a bare board must say "No power: J1 (Power terminal 12V / GND / 5V) is missing or unsoldered", and fitting JPA before soldering must say "Solder everything first: this part goes on last". | robotics-bench-a.md §8 L1319-1320 | must | e2e |
| RBA-369 | Fig. 06 should be able to overheat (for example with the heatsink left off or a stalled motor), which the original never models. | robotics-bench-a.md §8 L1321 | should | e2e |
| RBA-370 | Fig. 06's build must be Pick & place (4 SMD parts), reflow, place C1, C2, J4, JEA and JEB, place U1, J1, J2 and J3, Solder joints (9 joints), place JPA and JPB (snap, no solder), then "Plug in nano + battery". | robotics-bench-a.md §8 L1323-1324 | must | e2e |
| RBA-371 | Fig. 06's "Meet the board" must explain that the L298N is in every Arduino car tutorial so it must be recognised, that it has two H-bridges with IN1/IN2 for direction and ENA for speed, that its 1990s bipolar switches drop about 2 V so a 7.4 V pack gives the motors about 5.4 V and the rest is heat (watch the shimmer), and to switch to a TB6612FNG or DRV8833 once that is understood. | robotics-bench-a.md §8 L1326-1328 | must | e2e |
| RBA-372 | must not copy: Fig. 06's overview saying the TB6612FNG "drops about 0.2 V"; every mention of the TB6612FNG's drop must say about 0.5 V (about 1 A through its ~0.5 Ω switches), as Fig. 05 does. | robotics-bench-a.md §8 L1328; §10 #5 L1373-1374 | must | e2e |
| RBA-373 | Fig. 06's practice task must be Fig. 05's task with the hint to pull the ENA jumper and wire ENA to a ~ pin for PWM. | robotics-bench-a.md §8 L1328-1329 | must | e2e |
| RBA-374 | Fig. 06's quiz must ask "7.4 V battery into an L298N. Roughly what reaches the motor?" with "7.4 V", "5.4 V" (right) and "3.3 V". | robotics-bench-a.md §9 L1356 | must | e2e |
| RBA-375 | Fig. 06's quiz must ask "IN1 = HIGH and IN2 = HIGH does what?" with "Full speed forward", "Brakes the motor" (right) and "Shorts the battery". | robotics-bench-a.md §9 L1357 | must | e2e |
| RBA-376 | Fig. 06's quiz must ask "Why does the L298N need that big heatsink?" with "Its bipolar transistors waste about 2 V as heat" (right), "Motors are hot" and "To hold the chip upright". | robotics-bench-a.md §9 L1358 | must | e2e |

## RBB · Shared behaviour on Figs 07-13

Only what part B adds; the engine items in RBA already carry the robotics-bench-b.md §1 sources where the rule is the same.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBB-001 | The part-B boards must each have their own URL (the original's keys are a4988, pca9685, mpu6050, hcsr04, qtr8, lm2596 and rpi5). | robotics-bench-b.md §1.3 L127-128 | must | e2e |
| RBB-002 | Figs 07 and 08 must sit under the motors-and-drivers month, Figs 09 to 11 under the sensors month, and Figs 12 and 13 under "Power + the ROS 2 brain". | robotics-bench-b.md §1.3 L124-126 | must | e2e |
| RBB-003 | Mastering the last board's quiz (Fig. 13) must show "Board mastered." with no next-board link. | robotics-bench-b.md §1.2 L111-112 | must | e2e |
| RBB-004 | must not copy: all-or-nothing SMD placement; the user must be able to leave out or remove a single SMD part (a sense resistor, a regulator, a level shifter), so the failures that need a missing SMD part can be reached. | robotics-bench-b.md §1.2 L84; §10 #10 L1430-1433 | must | e2e |
| RBB-005 | "Place a part ▾" must list only the non-SMD parts, each chip reading "{ID} {short label in lower case}", with polar parts listed twice, once per orientation. | robotics-bench-b.md §1.2 L76-78 | must | e2e |
| RBB-006 | The header must show "Fig. NN — {name}" on the left and the board's hint on the right. | robotics-bench-b.md §1.1 L48 | must | e2e |
| RBB-007 | must not copy: "nothing runs" when the missing part sits on a sensor or driver board while the Nano that holds the sketch is fine; the Nano must keep running and taking uploads, and the missing part's effect must show (no I2C device, no echo, motors still). | robotics-bench-b.md §4.8 L668; §5.5 L798-800; robotics-bench-a.md §7 L1173 | must | e2e |
| RBB-008 | must not copy: a mode picked while the board is unpowered showing in the code panel while the old mode keeps running after power-up; the running mode, the code panel, the mode chip and the serial output must always name the same mode. | robotics-bench-b.md §10 #2 L1422 | must | e2e |

## RBB · Fig. 07 A4988 stepper driver

Setting a current limit, full step against 1/16 microstep, and the motor you must never pull live.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBB-009 | Fig. 07 must be "A4988 stepper driver" with sub-line "microstepping", hint "set the current limit, then step the motor", palette mint, power button "Plug / unplug Nano", the mode picker "Upload sketch ▾", default mode "Full step", and the power-up toast "Powered: VMOT from the LiPo, logic from the Nano. The motor holds its position". | robotics-bench-b.md §2.1 L144-152 | must | e2e |
| RBB-010 | Fig. 07 must model a Pololu-style A4988 carrier, 0.6 × 0.8 in (15.2 × 20.3 mm) with a 1 mm corner radius, its 2 × 8 header pins soldered from below so only pin stubs and solder fillets show on top, a small five-fin aluminium heatsink stuck on the chip, and the silkscreen "A4988", "VMOT" and "STEP DIR". | robotics-bench-b.md §2.2 L156-158; §2.1 L146 | must | review |
| RBB-011 | Fig. 07's parts must be, SMD: U1 A4988 driver IC (QFP "A4988"), RV1 current-limit trimpot, RS1 and RS2 0.068 Ω sense resistors and CP the decoupling and charge-pump caps; low: H1 power + motor pins and H2 control pins (8 stubs each); last-in: HS1 stick-on heatsink. | robotics-bench-b.md §2.2 L160-171 | must | e2e |
| RBB-012 | Fig. 07's chip descriptions must teach that the A4988 is two H-bridges plus a current chopper (each STEP pulse advances the coil currents one microstep, DIR sets the direction, the current never exceeds the pot's limit), that RV1 sets Vref with I = Vref / (8 × Rs) and must be set before the motor ever runs with the meter on the wiper, that the coil current is read as the voltage across RS1/RS2 (one per coil, the source of the 8 × Rs), and that CP holds the decoupling and the charge-pump caps for the high-side switches while a 100 µF electrolytic is still needed across VMOT off-board. | robotics-bench-b.md §2.2 L162-166 | must | e2e |
| RBB-013 | Fig. 07's header descriptions must give H1's pin order VMOT, GND, 2B, 2A, 1A, 1B, VDD, GND (VMOT 8–35 V, VDD 3–5.5 V logic from the Nano) and H2's ENABLE, MS1, MS2, MS3, RESET, SLEEP, STEP, DIR (MS1–MS3 pick full, 1/2, 1/4, 1/8 or 1/16; tie RESET to SLEEP or it never wakes), and HS1's that above about 1 A per coil the A4988 overheats and shuts down, so the heatsink goes on last, after soldering. | robotics-bench-b.md §2.2 L167-169 | must | e2e |
| RBB-014 | Fig. 07 must tag U1 "A4988", RV1 "CURRENT POT", RS1/RS2 "RS", CP "CAPS", H1 "MOTOR + VMOT", H2 "STEP / DIR" and HS1 "HEATSINK", lighting HEATSINK and STEP / DIR while the motor moves, CURRENT POT while the limit is being set and MOTOR + VMOT while powered. | robotics-bench-b.md §2.2 L162-169; §2.7 L295-296 | must | e2e |
| RBB-015 | Fig. 07's mat must hold a NEMA17 stepper (42 × 42 × 40 mm, 8 mm metal end caps, black stator, 12 mm shaft with a red 16 mm pointer flag) behind the PCB without hiding it, an Arduino Nano in front supplying logic and STEP/DIR, and a 3S LiPo labelled "11.1V" / "LIPO" front-right. | robotics-bench-b.md §2.3 L175-177 | must | screenshot |
| RBB-016 | Fig. 07's wires must run STEP (yellow) and DIR (green) from the Nano onto H2's STEP and DIR pins, the LiPo red to VMOT and black to GND, and the four motor leads (black, green, red, blue) to 2B, 2A, 1A and 1B, each drawn only once its header is on the board. | robotics-bench-b.md §2.3 L181-186 | must | e2e |
| RBB-017 | must not copy: a circuit with connections missing; Fig. 07 must also show VDD and logic GND from the Nano, the MS1–MS3 straps for the chosen resolution, the RESET–SLEEP link and the 100 µF cap across VMOT. | robotics-bench-b.md §2.3 L187; SPEC.md L124 | must | screenshot |
| RBB-018 | Fig. 07's place chips must be "H1 motor + vmot", "H2 step / dir" and "HS1 heatsink", and its modes "Full step" (upload, 1210 bytes), "1/16 microstep" (upload, 1180 bytes), "Set current limit" (instant) and "Unplug motor (live!)" (instant, faults). | robotics-bench-b.md §2.4 L191-199 | must | e2e |
| RBB-019 | Fig. 07 must model RS = 0.068 Ω, a starting Vref of 0.30 V and I limit = Vref / (8 × RS). | robotics-bench-b.md §2.5 L203-204 | must | unit |
| RBB-020 | Fig. 07's set limit must be Vref = 1.0 × 8 × 0.068 = 0.544 V so the readout says 1.00 A (the original sets 0.54 V and reads 0.99 A against its 1.0 A target). | robotics-bench-b.md §2.13 L343-344; §2.11 L326-327 | must | unit |
| RBB-021 | In "Full step" the shaft must turn 50 steps (90°) in 0.25 s and hold for 0.75 s, every second, continuing from where it was, with the motor body jittering about 0.3 mm while stepping, green dots on the STEP path and yellow dots on the coil paths. | robotics-bench-b.md §2.5 L206-210 | must | e2e |
| RBB-022 | In "Full step" the serial monitor must print "moved 50 steps -> {90, 180, 270, 0 ...} deg" every second, adding "   warning: Imax {I} A, may skip steps" while Vref is below 0.4 V (at start "moved 50 steps -> 90 deg   warning: Imax 0.55 A, may skip steps"), and no warning once the limit is set. | robotics-bench-b.md §2.5 L210-214 | must | e2e |
| RBB-023 | Fig. 07's "Full step" code must set STEP = 3 and DIR = 4 ("// MS1-MS3 low = full step"), drive DIR HIGH, pulse STEP 50 times with delayMicroseconds(2500) high and low ("// 50 x 1.8 deg = 90 deg") and then delay(750) ("// holding torque keeps it put"), matching the 250 ms + 750 ms the simulation shows. | robotics-bench-b.md §2.5 L216-232 | must | e2e |
| RBB-024 | In "1/16 microstep" the shaft must turn smoothly at 90° per second (0.25 rev/s) and print "pos {800, 1600, 2400 ...} microsteps = {90.0, 180.0 ...} deg  (3200 / rev)" every second. | robotics-bench-b.md §2.5 L234-236 | must | e2e |
| RBB-025 | Fig. 07's "1/16 microstep" code must carry "// MS1, MS2, MS3 tied HIGH = 1/16 step: 3200 pulses per rev" and "// 1.8 / 16 = 0.1125 deg per pulse: smooth and quiet". | robotics-bench-b.md §2.5 L238-248 | must | e2e |
| RBB-026 | must not copy: the 1/16 sketch's 150 µs half-period (about 1.04 rev/s) against an animation and log at 0.25 rev/s; the sketch's timing and the simulation must agree (about 625 µs per half period for 800 microsteps a second). | robotics-bench-b.md §2.5 L249-250; §2.13 L345; §10 #4 L1424 | must | unit |
| RBB-027 | "Set current limit" must keep the motor still and ramp Vref from its current value to the target over 2.5 s with an ease-in-out, turning RV1's wiper to −135° + Vref × 250° (0.30 V at −60°, 0.54 V at 0°). | robotics-bench-b.md §2.5 L252-254 | must | e2e |
| RBB-028 | "Set current limit" must print "Vref = {v} V -> Imax = {I} A" for its first four seconds (live 0.30 / 0.55, 0.38 / 0.69, 0.52 / 0.96, then the target) and keep the new Vref for every later mode. | robotics-bench-b.md §2.5 L255-258 | must | e2e |
| RBB-029 | Fig. 07's trimpot should turn both ways, so the user can lower the limit again and watch the skip warning return (the original can only raise it, until a reload). | robotics-bench-b.md §2.5 L258 | should | e2e |
| RBB-030 | Fig. 07's "Set current limit" panel must show the worksheet "# set the limit BEFORE the motor runs (no STEP pulses)", "# meter: COM on GND, red probe on the pot's metal wiper", Rs = 0.068 ("# the two sense resistors on this board"), Imax = 1.0 ("# ~70% of a 1.5 A NEMA17's rating"), Vref = Imax * 8 * Rs and "# turn clockwise to raise Vref, a few degrees at a time". | robotics-bench-b.md §2.5 L261-269 | must | e2e |
| RBB-031 | "Unplug motor (live!)" must drop the four motor leads off H1 onto the mat and fault U1 hot at once with "You pulled the motor with VMOT on: the coil spike killed the A4988. Unplug power, then reconnect the motor": status FAULT, the run stopped, smoke from U1 and the heatsink, buzz then sizzle. | robotics-bench-b.md §2.5 L271-274; §2.8 L302 | must | e2e |
| RBB-032 | Fig. 07's "Unplug motor (live!)" code panel must read "// DON'T: pull the motor plug while VMOT is on.", "// Coil current can't stop instantly (V = L * di/dt):", "// the spike lands on the driver's outputs -> dead A4988." and "// Always: power off first, then unplug the motor.". | robotics-bench-b.md §2.5 L276-282 | must | e2e |
| RBB-033 | must not copy: the motor-pull fault firing again at every power-up because "Unplug motor (live!)" stays the current mode; once power is off the motor must go back on its pins and a new power-up must not repeat the pull. | robotics-bench-b.md §2.8 L304; §10 #1 L1421 | must | e2e |
| RBB-034 | Since the message says the spike killed the A4988, U1 should stay dead after this fault until it is replaced, as a burnt LED does. | robotics-bench-b.md §2.5 L272; robotics-bench-a.md §10 #10 L1382-1383 | should | e2e |
| RBB-035 | While Fig. 07 runs, the stats must show "Vref" (x.xx V, ramping while the limit is set), "I limit" (x.xx A), "Steps / rev" (3200 in 1/16 microstep, 200 otherwise) and "Per step" ("0.11 deg" in 1/16 microstep, "1.8 deg" otherwise). | robotics-bench-b.md §2.6 L286-291 | must | e2e |
| RBB-036 | On Fig. 07, picking any mode during the fault must say "Fix the fault first: unplug, then correct U1". | robotics-bench-b.md §2.8 L303 | must | e2e |
| RBB-037 | With the limit too low Fig. 07 should actually skip steps (the pointer flag drifting from where the log says it is), instead of only printing the warning. | robotics-bench-b.md §2.8 L305; §2.12 L335-337; §10 #11 L1434-1435 | should | e2e |
| RBB-038 | On Fig. 07, H1 missing or unsoldered must say "No power: H1 (Power + motor pins) is missing or unsoldered", H2 missing "Powered, but H2 (Control pins) is missing: nothing runs" (status POWERED), and HS1 placed before H1 and H2 are soldered "Solder everything first: this part goes on last". | robotics-bench-b.md §2.8 L306-308 | must | e2e |
| RBB-039 | Fig. 07 should model heat: above about 1 A per coil without the heatsink the A4988 should overheat and shut down (the original has no thermal model). | robotics-bench-b.md §2.8 L309; §2.2 L169; §10 #11 L1434-1435 | should | e2e |
| RBB-040 | Fig. 07's build must be Pick & place (U1, RV1, RS1, RS2, CP), reflow, place and solder H1 and H2, then snap HS1 on last, 8 parts in all, "To solder" showing 5 until the reflow toast. | robotics-bench-b.md §2.9 L313-315 | must | e2e |
| RBB-041 | Fig. 07's "Meet the board" must explain that a stepper moves in fixed 1.8° steps, 200 per revolution, with no encoder, so its position is open loop and only right while it never skips, that it holds with full torque at rest, and that the A4988 turns STEP/DIR pulses into chopped coil currents capped by the trimpot: set the cap before running, heatsink it above 1 A, and never unplug the motor with VMOT live. | robotics-bench-b.md §2.10 L319-322 | must | e2e |
| RBB-042 | Fig. 07 must teach the full A4988 microstep table: MS1 MS2 MS3 = L L L full (200 per rev), H L L 1/2 (400), L H L 1/4 (800), H H L 1/8 (1600), H H H 1/16 (3200). | robotics-bench-b.md §2.13 L341-342 | must | review |
| RBB-043 | Fig. 07 should simulate all five resolutions, not only full step and 1/16. | robotics-bench-b.md §2.13 L341-342 | should | e2e |
| RBB-044 | Fig. 07 must say that Imax = Vref / (8 × Rs) holds for carriers with 0.068 Ω sense resistors and that older carriers used 0.050 Ω. | robotics-bench-b.md §2.13 L343 | must | review |
| RBB-045 | Fig. 07 must state VMOT 8–35 V, VDD 3–5.5 V and about 1 A per coil without extra cooling, up to about 2 A with it. | robotics-bench-b.md §2.13 L346 | must | review |
| RBB-046 | Fig. 07's quiz must ask "Sense resistors are 0.068 ohm and you want a 1.0 A limit. What Vref?" with "0.068 V", "0.54 V" (right) and "8 V", explaining Vref = I × 8 × Rs = 1.0 × 8 × 0.068 = 0.544 V. | robotics-bench-b.md §2.11 L326-327 | must | e2e |
| RBB-047 | Fig. 07's quiz must ask "MS1, MS2 and MS3 all HIGH on an A4988 means..." with "Driver disabled", "1/16 microstepping: 3200 steps per rev" (right) and "Full step, 200 steps per rev", explaining that HHH selects sixteenth steps, 200 × 16 = 3200. | robotics-bench-b.md §2.11 L328-329 | must | e2e |
| RBB-048 | Fig. 07's quiz must ask "Why never unplug a stepper while the driver is powered?" with "The coil voltage spike can destroy the driver" (right), "It forgets its position" and "The heatsink falls off", explaining that the coil's inductance forces V = L·di/dt onto the outputs. | robotics-bench-b.md §2.11 L330-331 | must | e2e |
| RBB-049 | Fig. 07's practice task must be: wire an A4988 to a NEMA17, set Vref with a meter before the first move, turn exactly one revolution in full step and in 1/16 step, flag the shaft with tape and check it comes back to the same place after 10 revolutions (drift means skipped steps: raise the limit slightly or slow down). | robotics-bench-b.md §2.12 L335-337 | must | e2e |

## RBB · Fig. 08 PCA9685 servo board

Sixteen servo channels over two I2C wires, with logic power and servo power kept apart.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBB-050 | Fig. 08 must be "PCA9685 servo board" with sub-line "16 PWM over I2C", hint "two wires of I2C, sixteen servos", palette cobalt, power button "Plug / unplug USB" (micro-USB into the Nano), the mode picker "Upload sketch ▾", default mode Sweep, the power-up toast "Logic powered over the Nano: PWR lights, the sketch starts", nothing extra needed to power and U1 needed to run. | robotics-bench-b.md §3.1 L356-363 | must | e2e |
| RBB-051 | Fig. 08 must model an Adafruit-style 16-channel 12-bit PWM / servo driver on a 62 × 25 mm PCB (2 mm radius, holes at (2.5, 2.5), (2.5, 23), (59.5, 2.5), (59.5, 23)), with four 3 × 4 servo header blocks along the front edge (rows from the back: PWM yellow, V+ red, GND black) and six open address solder-jumper pairs A0–A5. | robotics-bench-b.md §3.1 L358; §3.2 L367-369 | must | review |
| RBB-052 | Fig. 08's silkscreen must read "PCA9685 16-CH 12-BIT PWM", "V+  GND", "ADDR", "PWR" and "I2C". | robotics-bench-b.md §3.2 L367-368 | must | screenshot |
| RBB-053 | Fig. 08's parts must be, SMD: U1 PCA9685 PWM controller (SOIC "PCA9685"), LP green power LED, RN series resistors and decoupling (8 resistors, 2 caps) and AJ address jumpers A0–A5; low: C1 220 µF (V+, polar), I2C1 I2C header in, I2C2 I2C header chain out (1 × 6 each) and the servo outputs S0 (0–3), S4 (4–7), S8 (8–11) and S12 (12–15); tall: J1 the blue V+ screw terminal. | robotics-bench-b.md §3.2 L371-384 | must | e2e |
| RBB-054 | Fig. 08's descriptions must teach that the PCA9685 has 16 12-bit channels on its own 25 MHz clock, so a width set once over I2C keeps pulsing and frees the Arduino; that the PWR LED shows logic VCC from the Arduino and says nothing about V+; that 220 Ω sits in every PWM line against reversed or shorted servo plugs, with 100 nF decoupling; that all address jumpers open is 0x40 and bridging A0 makes 0x41, for up to 62 boards and 992 servos on one bus; and that C1 is the bulk cap on the servo rail for start-up spikes (stripe = minus). | robotics-bench-b.md §3.2 L373-377 | must | e2e |
| RBB-055 | Fig. 08's header descriptions must teach that I2C1 carries GND, OE, SCL, SDA, VCC and V+ (four wires from the Arduino, SDA/SCL on A4/A5 of a Nano), that I2C2 passes the same six on to the next board at a different address, that each servo column is yellow PWM / red V+ / black GND with the orange servo wire on yellow (bench servos on channels 0 and 1), that any channel can also drive an LED or a motor-driver input, that a 6-DOF arm uses six channels and sixteen cover a hexapod leg set or two arms, and that J1 takes 4.8–6 V from a battery or a 5 V 4 A supply, never the Arduino's 5V pin, because a stalling servo pulls about 1 A. | robotics-bench-b.md §3.2 L378-384 | must | e2e |
| RBB-056 | Fig. 08 must tag U1 "PWM CHIP", LP "PWR", RN "220R", AJ "ADDR", C1 "220uF", I2C1 "I2C IN", I2C2 "CHAIN OUT", the servo blocks "SERVO 0-3" to "SERVO 12-15" and J1 "V+ SERVO POWER", lighting PWM CHIP and I2C IN while running with I2C up, V+ SERVO POWER while running with V+ present and SERVO 0-3 while the servos move. | robotics-bench-b.md §3.2 L373-384; §3.7 L490-491 | must | e2e |
| RBB-057 | Fig. 08's "CHAIN OUT" tag must light when a second board is chained, or never claim to be working (in the original it is never lit). | robotics-bench-b.md §3.7 L490-491 | must | e2e |
| RBB-058 | Fig. 08's mat must hold a Nano front-left, a 4 × AA holder front-right and two SG90-style servos (12 × 23 × 22 mm, blue #2d5fb8, white 11 mm horn) to the left, each horn turned to its channel's current angle. | robotics-bench-b.md §3.3 L388-391 | must | screenshot |
| RBB-059 | Fig. 08's wires must run the I2C jumpers from the Nano to I2C1 (black GND, yellow SCL, blue SDA, red VCC), each servo's black / red / orange ribbon into S0's channel 0 and channel 1 columns with orange on the PWM row, and the battery leads into J1, each drawn only once its header is on the board. | robotics-bench-b.md §3.3 L392-395 | must | e2e |
| RBB-060 | Fig. 08's place chips must be "C1 stripe front", "C1 stripe back", "I2C1 i2c in", "I2C2 chain out", "S0 servo 0-3", "S4 servo 4-7", "S8 servo 8-11", "S12 servo 12-15" and "J1 v+ servo power", and its uploads "Sweep" (5120 bytes), "Center 90" (4870) and "Arm wave" (5360). | robotics-bench-b.md §3.4 L399-401 | must | e2e |
| RBB-061 | Fig. 08 must model a 50 Hz (20 ms) frame with pulse = 1000 + deg / 180 × 1000 µs and ticks = round(pulse × 4096 / 20000) (one tick 4.88 µs), giving 0° 1.00 ms / 205, 45° 1.25 / 256, 90° 1.50 / 307, 135° 1.75 / 358 and 180° 2.00 / 410. | robotics-bench-b.md §3.5 L407-410 | must | unit |
| RBB-062 | Fig. 08's servos must move only while both I2C1 and J1 are soldered, and otherwise hold their last pose (90°, 90° at start). | robotics-bench-b.md §3.5 L411-412 | must | e2e |
| RBB-063 | In Sweep, channel 0 must swing through 5–175° and channel 1 must mirror it (180° − channel 0). | robotics-bench-b.md §3.5 L416 | must | e2e |
| RBB-064 | must not copy: a Sweep sketch that only says "// ...and back down again" and steps 1° every 10 ms while the servos swing on a 4.83 s sine; Fig. 08's Sweep sketch must sweep up and back down, and the servos must move at the sketch's rate. | robotics-bench-b.md §3.5 L416, L445-454 | must | e2e |
| RBB-065 | In "Center 90" both servos must hold 90°, with the code comments "// 1.5 ms: the middle" and "// centre before you fit a horn". | robotics-bench-b.md §3.5 L417, L457-464 | must | e2e |
| RBB-066 | In "Arm wave" the shoulder (channel 0) must lift slowly through 50–130° (90 + 40·sin(0.9 t)) and the hand (channel 1) wave quickly (90 + 45·sin(4.2 t)), with the code comments "// slow lift", "// quick wave" and "// one servo frame". | robotics-bench-b.md §3.5 L418, L466-476 | must | e2e |
| RBB-067 | must not copy: the Arm wave simulation damping the hand to 15% on the down stroke when the sketch does not; the servos must do what the sketch shown says. | robotics-bench-b.md §3.5 L418, L477 | must | e2e |
| RBB-068 | Fig. 08's serial monitor must print "I2C scan: no device at 0x40 (header not soldered)" every second while I2C1 is not soldered, otherwise "V+ terminal empty: the servos have no power, they just sit" every third second while J1 is not soldered, otherwise "ch0 {deg} deg -> {ms} ms -> setPWM(0, 0, {ticks})" every second (e.g. "ch0 90 deg -> 1.50 ms -> setPWM(0, 0, 307)"). | robotics-bench-b.md §3.5 L420-423 | must | e2e |
| RBB-069 | While I2C is up Fig. 08 must run blue dots on the SDA path and yellow on SCL, and orange dots on the PWM0 and PWM1 paths while the servos move. | robotics-bench-b.md §3.5 L425 | must | e2e |
| RBB-070 | Fig. 08's code must include Wire.h and Adafruit_PWMServoDriver.h, create pwm(0x40) ("// A0-A5 open = 0x40"), call pwm.setPWMFreq(50) ("// servos want a 20 ms frame"), state "// 1.0 ms = 0 deg, 1.5 ms = 90, 2.0 ms = 180" and "// one tick = 20 ms / 4096 = 4.88 us", and define ticks(deg) as map(deg, 0, 180, 205, 410). | robotics-bench-b.md §3.5 L429-443 | must | e2e |
| RBB-071 | While Fig. 08 runs, "CH0 pulse" must show channel 0's pulse in ms (two decimals) and "Ticks" its tick count, updating every frame in Sweep (live 1.04 ms / 214 up to 1.97 ms / 403) and freezing while the servos hold. | robotics-bench-b.md §3.6 L483-486 | must | e2e |
| RBB-072 | On Fig. 08, C1 stripe back must pop at power-up with "Pop! C1 is in backwards: reverse voltage vents an electrolytic. Unplug and flip it", refuse a fix while live, and after unplugging "C1 stripe front" must answer "Desoldered C1, flipped it, soldered it again". | robotics-bench-b.md §3.8 L497 | must | e2e |
| RBB-073 | Fig. 08 built without J1 must run with the servos frozen, the stats frozen, "V+ terminal empty: the servos have no power, they just sit" every 3 s, no V+ SERVO POWER tag and SERVO 0-3 unlit. | robotics-bench-b.md §3.8 L498 | must | e2e |
| RBB-074 | Fig. 08 without I2C1 must run with the servos frozen, "I2C scan: no device at 0x40 (header not soldered)" every second and PWM CHIP and I2C IN unlit. | robotics-bench-b.md §3.8 L499 | must | e2e |
| RBB-075 | Fig. 08 should let the user feed the servos from the Arduino's 5V pin and see the brown-out reset when a servo stalls. | robotics-bench-b.md §3.8 L502-503; §3.11 L519-520; §10 #11 L1435 | should | e2e |
| RBB-076 | Fig. 08 should let the user swap SDA and SCL and see the I2C scan find no device. | robotics-bench-b.md §3.8 L502-503 | should | e2e |
| RBB-077 | Fig. 08 should let the user chain a second board at the same address, see the clash, and fix it by bridging A0. | robotics-bench-b.md §3.8 L502-503; §3.11 L523-524; §10 #11 L1435 | should | e2e |
| RBB-078 | Fig. 08 should let a servo stall and show the current it pulls (about 1 A). | robotics-bench-b.md §3.8 L502-503 | should | e2e |
| RBB-079 | Fig. 08's build must be Pick & place (4 SMD parts), place and solder the 7 low parts (C1, the two I2C headers, the four servo blocks), then the tall blue V+ terminal J1: 12 parts. | robotics-bench-b.md §3.9 L507-508 | must | e2e |
| RBB-080 | Fig. 08's "Meet the board" must explain sixteen servos on two signal wires: the PCA9685 makes 16 independent 12-bit PWM channels from its own clock and the Arduino only sends a new width over I2C (address 0x40); servos want a pulse every 20 ms (1.0 ms = 0°, 1.5 ms = 90°, 2.0 ms = 180°); logic power comes from the Arduino and servo power through the blue V+ terminal, and that split is the lesson. | robotics-bench-b.md §3.10 L512-515 | must | e2e |
| RBB-081 | must not copy: a file header that puts the servos on channels 0 and 15; Fig. 08's bench servos must be on channels 0 and 1 in the wiring, the part text, the code and every comment. | robotics-bench-b.md §3.13 L534-535; §10 #8 L1428 | must | review |
| RBB-082 | Fig. 08 must note that 1.0–2.0 ms for 0–180° is the classic convention and that many real servos need about 0.5–2.5 ms for their full travel. | robotics-bench-b.md §3.13 L536-537 | must | review |
| RBB-083 | Fig. 08 must note that the PCA9685's 25 MHz oscillator is nominal, that 50 Hz needs prescale round(25e6 / (4096 × 50)) − 1 = 121, and that real boards often need the oscillator calibrated. | robotics-bench-b.md §3.13 L538-539 | must | review |
| RBB-084 | Fig. 08 must explain that the six address bits span 0x40 to 0x7F and that 0x70 is the All Call address by default, which is why one bus takes 62 boards (992 outputs). | robotics-bench-b.md §3.13 L540 | must | review |
| RBB-085 | Fig. 08's quiz must ask "Why do the servos get their own battery on V+ instead of the Arduino 5V pin?" with "The Arduino 5V is too high", "A stalling servo draws about an amp and browns the Arduino out" (right) and "I2C needs a separate ground", explaining that servo stall current collapses a USB-fed 5 V rail. | robotics-bench-b.md §3.11 L519-521 | must | e2e |
| RBB-086 | Fig. 08's quiz must ask "At 50 Hz, which pulse width puts a standard servo at 90 degrees?" with "1.5 ms" (right), "15 ms" and "0.5 ms", explaining it is the centre of the 1–2 ms range. | robotics-bench-b.md §3.11 L522 | must | e2e |
| RBB-087 | Fig. 08's quiz must ask "Two PCA9685 boards on one I2C bus both answer at 0x40. The fix?" with "Use a second Arduino", "Bridge an address jumper (A0) on one board" (right) and "Swap SDA and SCL on one board", explaining that A0 bridged makes 0x41. | robotics-bench-b.md §3.11 L523-524 | must | e2e |
| RBB-088 | Fig. 08's practice task (the simple arm) must be: build the open-source SO-101 arm, or start with an EEZYbotARM of MG996R servos on this board; centre every servo at 90° before fitting the horns, drive two joints from two potentiometers on A0/A1, and note which joint buzzes or stalls first and why. | robotics-bench-b.md §3.12 L528-530; SPEC.md L103 | must | e2e |

## RBB · Fig. 09 MPU-6050 IMU on a GY-521

Gyro drift, accelerometer noise and the complementary filter, drawn on a serial plotter.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBB-089 | Fig. 09 must be "MPU-6050 IMU" with sub-line "filters + drift", hint "power it, watch the gyro drift, then fuse it", palette cobalt, power button "Plug / unplug Nano", code heading "Sketch · {mode}", terminal "Serial plotter" (starting "-- serial plotter --"), default mode "Raw gyro (drift)", H1 and U2 needed to power, U1, R1 and R2 needed to run, and the power-up toast "Powered: the Nano finds the MPU-6050 at 0x68 and starts streaming pitch". | robotics-bench-b.md §4.1 L550-558 | must | e2e |
| RBB-090 | Fig. 09 must model a GY-521 breakout (about 21 × 16 mm, 1.2 mm radius, holes at (2.6, 13.4) and (18.4, 13.4)) with the MPU-6050 in a 4 × 4 mm QFN, a "662K" 3.3 V LDO, 4.7 kΩ I2C pull-ups, an 8-pin header and the silkscreen "GY-521" and "0x68". | robotics-bench-b.md §4.1 L552; §4.2 L562-563 | must | review |
| RBB-091 | Fig. 09's parts must be, SMD: U1 MPU-6050 6-axis IMU ("MPU6050"), U2 662K 3.3 V regulator (SOT-23), R1 4.7 k pull-up (SCL), R2 4.7 k pull-up (SDA), CP decoupling capacitors and LED1 the green power LED; low: H1 the 1 × 8 pin header. | robotics-bench-b.md §4.2 L565-573 | must | e2e |
| RBB-092 | Fig. 09's descriptions must teach that the MPU-6050 is a 3-axis gyro plus a 3-axis accelerometer at I2C 0x68 (0x69 with AD0 high) and the fusion is up to you; that the LDO lets the 3.3 V chip run from the Nano's 5 V while the I2C pins idle at 3.3 V through the pull-ups; that I2C is open-drain, so without pull-ups the bus reads 0; that two boards' pull-ups in parallel make 2.35 k (fine) but ten do not; that 100 nF sits at the chip pins because a clean supply is part of the measurement; that a dark PWR LED means no 3.3 V, so I2C scans find nothing; and that the header is VCC, GND, SCL, SDA, XDA, XCL, AD0, INT, where four wires are enough and INT can wake the Nano. | robotics-bench-b.md §4.2 L567-573 | must | e2e |
| RBB-093 | Fig. 09 must tag U1 "IMU", U2 "3V3 LDO", the pull-ups, CP "CAPS", LED1 "PWR" and H1 "I2C PINS", lighting IMU and I2C PINS while running, 3V3 LDO while powered, and the pull-ups while the bus is working (the original's "PULL-UPS" tag never lights). | robotics-bench-b.md §4.2 L565-573; §4.7 L660 | must | e2e |
| RBB-094 | Fig. 09's mat must hold a Nano in front of the breakout and a small screen on a stand (38 × 24 mm, dark green face) on the left as the serial plotter, wired VCC red, GND black, SCL yellow and SDA blue from H1 to the Nano once H1 is on the board. | robotics-bench-b.md §4.3 L577-581 | must | screenshot |
| RBB-095 | Fig. 09 must simulate the board's real pitch as 8·sin(1.1 t) + 3·sin(2.7 t) degrees, a gyro with a 2.4 °/s bias that integrates without bound, and an accelerometer angle that never drifts but jumps by up to ±8° (noise drawn afresh every 0.1 s). | robotics-bench-b.md §4.4 L585-591 | must | unit |
| RBB-096 | Fig. 09's serial values must follow the model (golden values: at k = 4 truth −10.6 and raw −1.0, at k = 8 truth 5.8 and raw 25.0). | robotics-bench-b.md §4.4 L593-594 | must | unit |
| RBB-097 | must not copy: a "filtered" line that is only the truth delayed 60 ms plus noise; Fig. 09 must run the complementary filter angle = 0.98·(angle + gyro·dt) + 0.02·accelAngle on the simulated readings, so its lag and noise come from the filter (time constant τ = α·dt / (1 − α), about 0.49 s at dt = 10 ms). | robotics-bench-b.md §4.4 L593; §4.12 L697-698; §10 #5 L1425 | must | unit |
| RBB-098 | Fig. 09's plotter must draw a dashed zero line and a 5 s window running left to right, clamped to ±30°, so the drifting gyro line reaches the top edge after about 8 s and stays pinned there from about 17 s. | robotics-bench-b.md §4.5 L598-600 | must | e2e |
| RBB-099 | Fig. 09's plotter must always draw the true pitch as a light dashed line (#cfd6cf), then the gyro line in orange (#f7a531) in raw mode, the accelerometer line in beige (#d9d4c8) in accel mode, and in filter mode faint raw and accel lines behind a bold green (#8af0ae) filtered line. | robotics-bench-b.md §4.5 L601-603 | must | e2e |
| RBB-100 | Fig. 09's plotter must label its corner "GYRO ONLY" (orange), "ACCEL ONLY" (beige) or "FILTERED" (green) plus "PITCH", and show "waiting for data" while powered but not running and "no signal" without power. | robotics-bench-b.md §4.5 L604-605 | must | e2e |
| RBB-101 | Fig. 09's uploads must be "Raw gyro (drift)" (4120 bytes) printing "gyro angle {raw} deg   (truth {truth})", "Accelerometer only (noisy)" (4310 bytes) printing "accel angle {acc} deg   jumps with every bump" and "Complementary filter" (4480 bytes) printing "raw {r}   acc {a}   filt {f}", once a second to one decimal (raw mode starts "gyro angle 0.0 deg   (truth 0.0)", "gyro angle 10.8 deg   (truth 8.4)"). | robotics-bench-b.md §4.6 L609-616 | must | e2e |
| RBB-102 | Fig. 09's "Raw gyro (drift)" code must read the gyro ("// deg/s from the chip at 0x68"), integrate it ("angle += gyro * dt;   // integrate rate -> angle") and print it with "// a tiny bias adds up every loop:" and "// hold it still, watch it drift". | robotics-bench-b.md §4.6 L618-628 | must | e2e |
| RBB-103 | Fig. 09's "Accelerometer only (noisy)" code must read the accelerometer ("// gravity, in g"), compute atan2(ax, az) * 180 / PI and print it with "// never drifts, but every" and "// vibration shows up as tilt". | robotics-bench-b.md §4.6 L630-637 | must | e2e |
| RBB-104 | Fig. 09's "Complementary filter" code must read the gyro ("// fast, drifts") and the accel angle ("atan2(ax, az) * 57.3;    // slow, noisy") and apply "angle = 0.98 * (angle + gyro * dt) + 0.02 * accelAngle;" under "// trust the gyro short-term, the accel long-term:". | robotics-bench-b.md §4.6 L639-650 | must | e2e |
| RBB-105 | While Fig. 09 runs, "Pitch raw" must show the integrated gyro angle to one decimal, growing about 2.4°/s for as long as it runs. | robotics-bench-b.md §4.7 L656 | must | e2e |
| RBB-106 | must not copy: a "Filtered" stat shown during "Raw gyro (drift)", whose sketch has no filter, and an accelerometer angle labelled "Filtered"; Fig. 09's second stat must show what the running sketch computes, under its own name. | robotics-bench-b.md §4.7 L657; §10 #5 L1425 | must | e2e |
| RBB-107 | While Fig. 09 runs, yellow dots must run on the SCL path and green on SDA, with the power-path dots while powered. | robotics-bench-b.md §4.7 L659 | must | e2e |
| RBB-108 | On Fig. 09, H1 missing must say "No power: H1 (1x8 pin header) is missing or unsoldered", and H1 placed but unsoldered must say the same with status NEEDS SOLDER. | robotics-bench-b.md §4.8 L666-667 | must | e2e |
| RBB-109 | must not copy: a missing pull-up reported as "nothing runs" with uploads that time out; with R1 or R2 missing the Nano must still run and take uploads, and the sketch must report that the I2C scan finds nothing at 0x68. | robotics-bench-b.md §4.8 L668; §4.10 L684-688 | must | e2e |
| RBB-110 | With U2 missing, Fig. 09 must refuse power with "No power: U2 (662K 3.3 V regulator) is missing or unsoldered" (reachable once single SMD parts can be left out). | robotics-bench-b.md §4.8 L668; §10 #10 L1430-1433 | must | e2e |
| RBB-111 | Fig. 09 should let the user set AD0 high and see the scan find the chip at 0x69 instead of 0x68. | robotics-bench-b.md §4.8 L670; §4.2 L567 | should | e2e |
| RBB-112 | Fig. 09 should model the I2C level question: the bus idles at 3.3 V through the board's pull-ups, and the lesson should say what happens with 5 V pull-ups. | robotics-bench-b.md §4.8 L670; §4.2 L568 | should | e2e |
| RBB-113 | Fig. 09 should let the user add vibration (a bump) and see the accelerometer trace jump while the filtered angle holds. | robotics-bench-b.md §4.8 L670 | should | e2e |
| RBB-114 | Fig. 09's "Meet the board" must explain a 6-axis IMU (the gyro measures rotation rate, the accelerometer the direction of gravity) on I2C 0x68 with pull-ups, that neither alone gives a good angle (the integrated gyro drifts even when still, the accelerometer never drifts but reads every bump as tilt), that fusing them gives both, and that the screen shows all three traces. | robotics-bench-b.md §4.9 L674-676 | must | e2e |
| RBB-115 | Fig. 09 must note that accelerometer pitch is atan2(ax, az) for small tilts and atan2(−ax, sqrt(ay² + az²)) for the full tilt range, and that 57.3 = 180/π. | robotics-bench-b.md §4.12 L699-700 | must | review |
| RBB-116 | Fig. 09's header order must stay VCC, GND, SCL, SDA, XDA, XCL, AD0, INT, as on the real GY-521. | robotics-bench-b.md §4.12 L701 | must | review |
| RBB-117 | Fig. 09's quiz must ask "You hold the board perfectly still and the integrated gyro angle keeps growing. Why?" with "The I2C bus is too slow", "A small gyro bias is added up every loop (drift)" (right) and "The accelerometer is noisy", explaining that integration accumulates the bias. | robotics-bench-b.md §4.10 L680-681, L687 | must | e2e |
| RBB-118 | Fig. 09's quiz must ask "In angle = 0.98*(angle + gyro*dt) + 0.02*accelAngle, what does the 0.02 part do?" with "Pulls the angle slowly back to gravity, cancelling drift" (right), "Removes accelerometer noise completely" and "Speeds up the loop", explaining that the small accel weight is a slow correction (a low-pass on the accelerometer, a high-pass on the gyro). | robotics-bench-b.md §4.10 L682-683, L687-688 | must | e2e |
| RBB-119 | Fig. 09's quiz must ask "An I2C scan finds nothing at 0x68. Most likely?" with "The filter constant is wrong", "Missing pull-ups or VCC/GND not connected" (right) and "The gyro is drifting", explaining that an I2C device needs power, ground and pull-ups before it can answer. | robotics-bench-b.md §4.10 L684-685, L688 | must | e2e |
| RBB-120 | Fig. 09's practice task must be: mount the IMU, print pitch, hold it still and watch it drift; add the four-line complementary filter and watch the drift vanish; move on to a Kalman filter only once you can explain where the complementary filter fails. | robotics-bench-b.md §4.11 L692-693 | must | e2e |

## RBB · Fig. 10 HC-SR04 ultrasonic rangefinder

Time of flight: a target on a clamp stand, sound rings out and back, and a foam pad that eats the echo.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBB-121 | Fig. 10 must be "HC-SR04 ultrasonic" with sub-line "time of flight", hint "power it, move the object, watch the echo come back", palette cobalt, power button "Plug / unplug USB", the instant picker "Move the object ▾" defaulting to "Object at 10 cm", J1, U1, U2, U3, Y1, T1 and R1 checked in that order to run, and the power-up toast "Powered: the Nano pings every 60 ms and times the echo". | robotics-bench-b.md §5.1 L711-718 | must | e2e |
| RBB-122 | Fig. 10 must model the classic 45 × 20 mm module lying flat with its transducers up (no standoffs, 1.2 mm radius): two 16 mm cans ("T" left, "R" right) with mesh tops 12 mm tall, the 4-pin header between them, the drive electronics, and the silkscreen "T", "R" and "HC-SR04". | robotics-bench-b.md §5.1 L713; §5.2 L722-723 | must | review |
| RBB-123 | Fig. 10's parts must be, SMD: U1 EM78P153 microcontroller ("EM78"), U2 LM324 op-amp ("324"), U3 MAX232 driver ("232") and RC passives; low: Y1 12 MHz crystal ("12.000") and J1 the 4-pin header; tall: T1 transmitter (T) and R1 receiver (R). | robotics-bench-b.md §5.2 L725-734 | must | e2e |
| RBB-124 | Fig. 10's descriptions must teach that the MCU waits for the 10 µs TRIG, fires the burst and holds ECHO high until the echo returns, so the Arduino only times that pulse; that the LM324 amplifies and filters the faint 40 kHz echo; that the MAX232 pumps 5 V up to about ±10 V to drive T hard (louder = longer range); that the passives set the amplifier bias and filter and decouple; that the crystal makes the 40 kHz burst and the timing exact; that J1 is VCC 5 V, TRIG (your 10 µs output), ECHO (high for the round trip) and GND; that T is a 40 kHz piezo speaker sending an 8-cycle burst into a cone of about 30°; and that R is the matching piezo microphone that hears the first thing in the cone, so two objects confuse it. | robotics-bench-b.md §5.2 L727-734 | must | e2e |
| RBB-125 | Fig. 10 must tag U1 "MCU", U2 "AMPLIFIER", U3 "DRIVER", RC "PASSIVES", Y1 "CRYSTAL", J1 "VCC TRIG ECHO GND", T1 "TRANSMIT" and R1 "RECEIVE", lighting TRANSMIT and VCC TRIG ECHO GND while running and RECEIVE while running on a hard target (dark on the foam). | robotics-bench-b.md §5.2 L725-734; §5.4 L790 | must | e2e |
| RBB-126 | Fig. 10's mat must hold a Nano in front of the module and a clamp stand on the left (a black 12 × 12 mm base, a metal post and an arm over the board) holding the target flat above the cans: clear 4 mm acrylic (half transparent, with a white glare streak) labelled "ACRYLIC  10 cm", "ACRYLIC  25 cm" or "ACRYLIC  50 cm", or a hatched pink 6 mm foam pad labelled "FOAM  25 cm". | robotics-bench-b.md §5.3 L738-742 | must | screenshot |
| RBB-127 | Fig. 10's target must ease to its new height over about 0.8 s whenever the object changes, powered or not, and in the exploded view stay at least 6 mm above the lifted cans. | robotics-bench-b.md §5.3 L743-745 | must | e2e |
| RBB-128 | Fig. 10 should say that its target height and its sound rings are not to scale (the height is compressed and one ping is slowed to 1.6 s; the real round trip at 25 cm is about 1.5 ms). | robotics-bench-b.md §5.3 L743, L746 | should | e2e |
| RBB-129 | While Fig. 10 runs, each ping must show three blue rings (#2f6fd6) rising from T, 0.07 s apart and widening with height, then three red echo rings (#e2483d) falling from the target to R; on the foam the red rings must die out about halfway down, thinner and fading, while pink dots scatter at the foam. | robotics-bench-b.md §5.3 L746-749 | must | e2e |
| RBB-130 | Fig. 10's wires must run VCC red, TRIG yellow, ECHO green and GND black from J1 to the Nano once J1 is on the board. | robotics-bench-b.md §5.3 L750 | must | e2e |
| RBB-131 | Fig. 10's wires must land on the Nano pins its sketch uses (TRIG on D9, ECHO on D10). | robotics-bench-b.md §5.3 L750; §5.4 L768 | must | review |
| RBB-132 | Fig. 10's objects must be "Object at 10 cm" (Echo 583 us, Distance 10.0 cm), "Object at 25 cm" (1458 us, 25.0 cm), "Object at 50 cm" (2915 us, 50.0 cm) and "Soft target (fails)" (foam at 25 cm: Echo "none", Distance "0.0 cm"), all instant. | robotics-bench-b.md §5.4 L754-759 | must | e2e |
| RBB-133 | Fig. 10 must compute the echo as cm × 2 / 0.0343 µs (10 cm → 583 µs, 25 cm → 1458 µs, 50 cm → 2915 µs). | robotics-bench-b.md §5.4 L761 | must | unit |
| RBB-134 | Fig. 10's serial monitor must print "distance: {cm} cm   echo {us} us" once a second with a small jitter (about ±0.15 cm, ±9 µs; e.g. "distance: 10.15 cm   echo 592 us"), and on the foam "distance: 0.00 cm   (no echo, pulseIn timed out)". | robotics-bench-b.md §5.4 L756-763 | must | e2e |
| RBB-135 | must not copy: stats that stay fixed while the serial log jitters; Fig. 10's stats must come from the same readings the serial monitor prints. | robotics-bench-b.md §5.4 L763 | must | e2e |
| RBB-136 | Fig. 10's code must set TRIG = 9 and ECHO = 10, pulse TRIG for 10 µs ("// a 10 us pulse makes T", "// send 8 cycles at 40 kHz"), time ECHO with pulseIn(ECHO, HIGH, 30000) ("// there and back"), convert with us * 0.0343 / 2 ("// sound: 343 m/s, halved"), wait 60 ms ("// let old echoes die out"), and end with the line for the current object ("// object at 10 cm: echo = 583 us", "... 25 cm: echo = 1458 us", "... 50 cm: echo = 2915 us", "// foam at 25 cm: no echo, pulseIn() times out -> 0"). | robotics-bench-b.md §5.4 L765-788 | must | e2e |
| RBB-137 | Fig. 10 should show TRIG and ECHO activity on its copper like the other boards (the original defines no signal paths for it). | robotics-bench-b.md §5.4 L791 | should | e2e |
| RBB-138 | Changing Fig. 10's object while powered but not running must move the target and log "-- {object} --", and while unplugged must move it and toast "Set. Now power the board to see it". | robotics-bench-b.md §5.5 L801-802 | must | e2e |
| RBB-139 | On Fig. 10, a missing receiver, crystal or header must name the part ("R1 (Receiver (R))", "Y1 (12 MHz crystal)", "J1 (4-pin header)") and the Nano's sketch must then report no echo ("distance: 0.00 cm   (no echo, pulseIn timed out)"). | robotics-bench-b.md §5.5 L798-800 | must | e2e |
| RBB-140 | Fig. 10 should model two objects in the cone, the nearer one answering first. | robotics-bench-b.md §5.5 L804; §5.2 L734; §10 #11 L1435 | should | e2e |
| RBB-141 | Fig. 10 should model an object outside the ~30° cone giving no reading. | robotics-bench-b.md §5.5 L804; §5.9 L828-829 | should | e2e |
| RBB-142 | Fig. 10 should model the 2 cm minimum range. | robotics-bench-b.md §5.5 L804; §5.9 L828 | should | e2e |
| RBB-143 | Fig. 10 should model angled glass bouncing the sound away so the reading drops out. | robotics-bench-b.md §5.5 L804; §5.8 L822-823 | should | e2e |
| RBB-144 | Fig. 10's "Meet the board" must explain that the HC-SR04 is the cheapest way to give a robot wall sensing, that it measures time of flight (a 10 µs TRIG makes T send 8 cycles at 40 kHz and ECHO stays high until R hears the bounce; distance = time × 343 m/s / 2), that it sees the first thing anywhere in a wide (~30°) cone, that it does badly on soft, sound-absorbing surfaces, and that a VL53L0X laser ToF sensor gives a narrower beam. | robotics-bench-b.md §5.6 L808-811 | must | e2e |
| RBB-145 | must not copy: calling the VL53L0X's field of view a "35 degree cone"; it is 25° (ST's figure), narrower than the HC-SR04's ~30° cone. | robotics-bench-b.md §5.9 L830-831; §10 #7 L1427 | must | review |
| RBB-146 | Fig. 10 must state that 0.0343 cm/µs is the speed of sound at about 20 °C (v ≈ 331.3 + 0.606·T m/s if temperature is modelled). | robotics-bench-b.md §5.9 L827 | must | review |
| RBB-147 | Fig. 10 must state that the 30 000 µs pulseIn timeout is about a 5.1 m one-way limit and that the HC-SR04 is specified for 2–400 cm with a 15° measuring angle (±15°, the ~30° cone). | robotics-bench-b.md §5.9 L828-829 | must | review |
| RBB-148 | Fig. 10's quiz must ask "ECHO stays high for 1166 us. How far is the object?" with "40 cm", "20 cm" (right) and "11.7 cm", explaining 1166 × 0.0343 / 2 = 20.0 cm. | robotics-bench-b.md §5.7 L815 | must | e2e |
| RBB-149 | Fig. 10's quiz must ask "Why divide by 2 in cm = us * 0.0343 / 2?" with "The sensor has two transducers", "The sound goes there and back" (right) and "To convert to inches". | robotics-bench-b.md §5.7 L816 | must | e2e |
| RBB-150 | Fig. 10's quiz must ask "Your robot drives into a sofa without slowing down. Most likely?" with "The sofa soaks up the sound, so no echo returns" (right), "The sofa is too close to see" and "TRIG was too short". | robotics-bench-b.md §5.7 L817-818 | must | e2e |
| RBB-151 | Fig. 10's practice task must be: print the distance ten times a second, aim at a wall, a sofa cushion and a glass bottle at an angle, log which readings jump or drop to zero and explain why, then repeat with a VL53L0X. | robotics-bench-b.md §5.8 L822-823 | must | e2e |

## RBB · Fig. 11 QTR-8RC reflectance array

Eight IR pairs over a paper strip with a black line, a weighted position and the P controller.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBB-152 | Fig. 11 must be "QTR-8RC line sensor" with sub-line "line following", hint "power it, move the line, upload the P controller", palette cobalt, power button "Plug / unplug USB", the mode picker "Upload sketch ▾" defaulting to "Line centred", H1 needed to run, and the power-up toast "Powered: the Nano pulls LEDON high and the 8 emitters switch on". | robotics-bench-b.md §6.1 L841-848 | must | e2e |
| RBB-153 | Fig. 11 must model the Pololu QTR-8RC: 75 × 12.7 mm (2.95 × 0.5 in) on 3 mm standoffs with holes at (2.5, 10.5) and (72.5, 10.5), eight IR emitter/phototransistor pairs at a 9.525 mm (0.375 in) pitch centred at 4.14 + i × 9.525 mm from the left edge, an RC network per sensor, an LEDON MOSFET and a 1 × 11 header in the order LEDON, OUT1–OUT8, VCC, GND, with the silkscreen "QTR-8RC", "1" under sensor 1 and "8" under sensor 8. | robotics-bench-b.md §6.1 L843; §6.2 L852-855 | must | review |
| RBB-154 | Fig. 11's parts must be, SMD: S1 to S8 the IR pairs (a clear emitter window beside a dark detector window), RC the caps and resistors (8 of each) and Q1 the LEDON MOSFET (SOT-23); low: H1 the 1 × 11 header. | robotics-bench-b.md §6.2 L857-862 | must | e2e |
| RBB-155 | Fig. 11's descriptions must teach that each IR LED shines down and its phototransistor measures what comes back (white reflects a lot, the black line almost nothing); that each phototransistor discharges a small cap, so after charging it the time to fall LOW is the reading (bright = fast, black = slow, up to 2500 µs, no ADC); that Q1 switches all 8 emitters from one pin (saving about 100 mA between reads) and that without it every sensor reads black; and that H1 carries LEDON, OUT1–OUT8, VCC and GND at 5 V or 3.3 V. | robotics-bench-b.md §6.2 L859-862 | must | e2e |
| RBB-156 | Fig. 11 must tag S1 "IR 1" and S8 "IR 8" (lit while that sensor reads black), RC "RC", Q1 "LEDON" (lit while running with the emitters on) and H1 "HEADER" (lit while running). | robotics-bench-b.md §6.2 L859-862; §6.6 L955 | must | e2e |
| RBB-157 | Fig. 11's mat must hold a white paper strip in front of the sensor row, 25 mm deep and as wide as the board, with the black line running away from the board at the line's position. | robotics-bench-b.md §6.3 L866-867 | must | screenshot |
| RBB-158 | Fig. 11's line must be 19 mm wide (the usual 0.75 in electrical tape), not the original's 13 mm, with the readings worked out from that width. | robotics-bench-b.md §6.11 L995 | must | review |
| RBB-159 | While Fig. 11 runs with its emitters on, an IR spot (3.2 mm radius) must show on the paper under each sensor, dark red (#7a2b3a) where it reads black and pink (#f3a6bb) where it reads white, presented as a camera view because IR is invisible to the eye. | robotics-bench-b.md §6.3 L868-869 | must | e2e |
| RBB-160 | Fig. 11's bar-graph screen on the left must draw eight bars (pink above 0.5, green otherwise) with a marker at the computed position and the caption "POS {pos}" (plus "  TURN {±n}" while following), "NO SKETCH" when powered but not running and "--" without power. | robotics-bench-b.md §6.3 L871-873 | must | e2e |
| RBB-161 | While Fig. 11 is unpowered or not running, the black line must sit at the selected mode's position, moving as soon as a mode is picked. | robotics-bench-b.md §6.3 L874-875 | must | e2e |
| RBB-162 | Moving Fig. 11's line should be an instant action separate from the sketch (the original uploads the same 3120-byte sketch three times to move the line). | robotics-bench-b.md §6.3 L874-875; §6.5 L901-903 | should | e2e |
| RBB-163 | must not copy: wiring only OUT1 and OUT8 of the eight outputs; Fig. 11 must wire LEDON and all eight outputs to the Nano pins the sketch sets (emitter pin 2, sensor pins 3 to 10), plus VCC and GND. | robotics-bench-b.md §6.3 L876-877; §6.5 L916-917 | must | e2e |
| RBB-164 | While Fig. 11 runs, every sensor that reads black must glow red with red dots on its OUT path, and a yellow dot must run on the LEDON path. | robotics-bench-b.md §6.3 L878-879 | must | e2e |
| RBB-165 | Fig. 11's line positions must be "Line under sensor 2" at sensor 2's centre (13.665 mm), "Line centred" at 37.5 mm and "Line under sensor 7" at sensor 7's centre (61.29 mm). | robotics-bench-b.md §6.4 L883-884 | must | e2e |
| RBB-166 | Each Fig. 11 sensor must read 1 (black) when its centre is within the line's half-width plus 3 mm of the line centre, falling linearly to 0 (white) 6 mm further out; a sensor not on the board must read 0, and with Q1 missing every fitted sensor must read 1. | robotics-bench-b.md §6.4 L885-887 | must | unit |
| RBB-167 | Fig. 11 must compute pos = round(Σ c_i × i × 1000 / Σ c_i) (0 under sensor 1, 3500 centred, 7000 under sensor 8), err = pos − 3500 and turn = round(Kp × err) with Kp = 0.05. | robotics-bench-b.md §6.4 L888-889 | must | unit |
| RBB-168 | Fig. 11's line-lost rule must follow the real library: readings below about 50 are ignored, the line counts as lost when no sensor is above about 200, and a lost line returns 0 or 7000 by the side it was last seen on. | robotics-bench-b.md §6.4 L888; §6.11 L992-994 | must | unit |
| RBB-169 | Fig. 11 must describe the real RC read: drive the line high for about 10 µs to charge, switch to input and time the fall, with the library's default 2500 µs timeout and per-sensor calibration to 0..1000. | robotics-bench-b.md §6.11 L992-993 | must | review |
| RBB-170 | Fig. 11's serial row must list each sensor's reading × 1000, rounded and padded to four characters, joined by single spaces, before "pos {pos}". | robotics-bench-b.md §6.4 L890 | must | e2e |
| RBB-171 | With the original's 13 mm line, Fig. 11's reading model should reproduce its values as a regression check: centred "   0    0    0  786  793    0    0    0  pos 3502" (Error +2), under sensor 2 pos 1000 (Error −2500), under sensor 7 pos 6000 (Error +2500). | robotics-bench-b.md §6.4 L892-895 | should | unit |
| RBB-172 | Fig. 11's uploads must be "Line under sensor 2", "Line centred" and "Line under sensor 7" (3120 bytes each, printing "{row}  pos {pos}") and "Follow (P controller)" (3584 bytes, printing "{row} pos {pos} err {err} turn {turn}"). | robotics-bench-b.md §6.5 L899-904 | must | e2e |
| RBB-173 | With Q1 missing Fig. 11 must print "all 1000: LEDON never switches the emitters on (Q1 missing)", show Position 3500 and Error 0, draw all eight bars pink and glow every sensor. | robotics-bench-b.md §6.5 L906; §6.7 L963; §10 #10 L1430-1433 | must | e2e |
| RBB-174 | With one sensor missing Fig. 11 must read it as 0 and shift the position (S4 gone, line centred: "   0    0    0    0  793    0    0    0  pos 4000", Error +500). | robotics-bench-b.md §6.7 L964; §10 #10 L1430-1433 | must | e2e |
| RBB-175 | Fig. 11's shared setup must include QTRSensors.h, call qtr.setTypeRC(), set the sensor pins {3,4,5,6,7,8,9,10} and the emitter pin 2 ("// LEDON"), calibrate 400 times ("// sweep over line + floor") and open Serial at 9600. | robotics-bench-b.md §6.5 L908-922 | must | e2e |
| RBB-176 | Fig. 11's line sketches must call qtr.readLineBlack(s) ("// 0 .. 7000") and compute error = pos − 3500 ("// 0 = line centred"). | robotics-bench-b.md §6.5 L924-931 | must | e2e |
| RBB-177 | Fig. 11's follow sketch must set "const float Kp = 0.05, Kd = 0.0;   // add D when it oscillates", compute turn = Kp * error + Kd * (error − last) and drive motors(base + turn, base − turn) ("// steer back onto the line"). | robotics-bench-b.md §6.5 L934-945 | must | e2e |
| RBB-178 | must not copy: sketches that do not match the monitor or would not compile; Fig. 11's line sketch must print what the monitor shows (the original prints only pos), and the follow sketch must define base and motors() and print its pos, err and turn. | robotics-bench-b.md §6.5 L924-945; §6.4 L890 | must | review |
| RBB-179 | While Fig. 11 runs, the stats must show "Position" (0..7000), "Error" with a "+" when positive ("+2", "-2500", "0") and, in follow mode only, "Turn" with a "+" when positive. | robotics-bench-b.md §6.6 L951-953 | must | e2e |
| RBB-180 | must not copy: an open-loop follow mode where the line moves on a fixed curve and the computed turn changes nothing; Fig. 11's follower must close the loop, with the turn steering the sensor (or a robot carrying it) back toward the line. | robotics-bench-b.md §6.7 L966-967; §10 #11 L1435; SPEC.md L103 | must | e2e |
| RBB-181 | Fig. 11 must let the user change Kp and Kd and see the weave grow as Kp rises and die out once a D term is added. | robotics-bench-b.md §6.7 L967; §6.9 L982-983; §6.10 L987-988 | must | e2e |
| RBB-182 | On Fig. 11, H1 missing must be named ("H1 (1x11 header)") while the Nano keeps running and taking uploads. | robotics-bench-b.md §6.7 L961 | must | e2e |
| RBB-183 | Fig. 11's "Meet the board" must explain eight IR emitter/phototransistor pairs, white paper reflecting IR and the black line absorbing it, the RC version timing each capacitor's discharge (fast = white, slow = black), and readLineBlack() folding the eight readings into one number (0 under sensor 1, 3500 centred, 7000 under sensor 8) whose difference from 3500 is the error a P controller steers on, the smallest closed loop in robotics. | robotics-bench-b.md §6.8 L971-974 | must | e2e |
| RBB-184 | Fig. 11's quiz must ask "Over a black line, an RC sensor reading is..." with "Low: the cap discharges fast", "High: little IR comes back, so it discharges slowly" (right) and "Exactly 3500". | robotics-bench-b.md §6.9 L978-979 | must | e2e |
| RBB-185 | Fig. 11's quiz must ask "readLineBlack() returns 1200. Where is the line?" with "Near sensor 2, left of centre" (right), "Dead centre" and "Near sensor 7", explaining that 1000 is sensor 2, so 1200 is just right of sensor 2 and left of centre. | robotics-bench-b.md §6.9 L980-981 | must | e2e |
| RBB-186 | Fig. 11's quiz must ask "With a P controller your robot weaves more and more. Next step?" with "Raise Kp", "Add a D term to damp the oscillation" (right) and "Remove the RC capacitors". | robotics-bench-b.md §6.9 L982-983 | must | e2e |
| RBB-187 | Fig. 11's practice task (the line follower) must be: build the line follower, tune a P controller, add the D term and watch the oscillation go, then film both versions side by side to show you understand the loop rather than a copied gain. | robotics-bench-b.md §6.10 L987-988; SPEC.md L103 | must | e2e |

## RBB · Fig. 12 LM2596 buck module

A 3S LiPo stepped down to 5 V for a Nano and a gear motor, the impossible 12 V setting and the stall brown-out.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBB-188 | Fig. 12 must be "LM2596 buck module" with sub-line "power + brown-outs", hint "connect the battery, turn the trimpot, stall the motor", palette cobalt, power button "Connect battery", the instant picker "Turn trimpot ▾" defaulting to "Set 5.0 V", code heading "The math · {mode}", terminal "Bench notes" (starting "-- bench notes --"), U1, L1 and D1 needed to power, C2, RV1 and J2 needed to run, and the power-up toast "Battery connected: the buck starts switching". | robotics-bench-b.md §7.1 L1005-1013 | must | e2e |
| RBB-189 | Fig. 12 must model the common blue LM2596 module with a built-in 3-digit LED voltmeter (66 × 35 mm, 1.5 mm radius, holes at (3, 3) and (63, 31)): a TO-263 regulator with its tab and five gull-wing leads ("LM2596S" "-ADJ"), an SS34 Schottky with a silver cathode band, a blue 3296 multi-turn trimpot ("103") whose brass screw turns, and a red 3-digit 7-segment display with decimal points and a slight italic. | robotics-bench-b.md §7.1 L1007; §7.2 L1017-1021 | must | review |
| RBB-190 | Fig. 12's silkscreen must read "IN", "OUT", "LM2596 DC-DC", "ADJ" and "+" by each terminal. | robotics-bench-b.md §7.2 L1017-1018 | must | screenshot |
| RBB-191 | Fig. 12's parts must be, SMD: U1 LM2596S-ADJ switching regulator, L1 33 µH power inductor ("330"), D1 SS34 Schottky diode, LED1 red power LED and RC the feedback divider and caps; low: RV1 10 k multi-turn trimpot and DS1 the 3-digit voltmeter display; tall: J1 input screw terminal, J2 output screw terminal, C1 220 µF 35 V input capacitor and C2 220 µF 35 V output capacitor (both polar). | robotics-bench-b.md §7.2 L1023-1035 | must | e2e |
| RBB-192 | Fig. 12's descriptions must teach that the LM2596 switches 150 000 times a second and the inductor and cap smooth it (about 90% efficient); that the inductor stores energy while the switch is on and releases it while off, trading voltage for current; that the Schottky carries the inductor current while the switch is off (about 0.4 V drop, fast); that the power LED shows the input is live and stays on even with the output shorted; that the feedback divider brings Vout down to 1.23 V for the comparator with the trimpot as half of it; and that the trimpot takes 25 turns end to end, clockwise raises Vout, and is set with the load unplugged and a meter on the output. | robotics-bench-b.md §7.2 L1025-1030 | must | e2e |
| RBB-193 | Fig. 12's descriptions must teach that the built-in display shows Vout but cheap ones read 0.05–0.1 V off (trust the meter); that J1 takes IN+ / IN− at 4.5–40 V (here a 3S LiPo) with no reverse protection; that J2 feeds both the Nano and the motor, and one shared rail is how brown-outs happen; that C1 supplies the switch's current pulses so they do not go up the battery leads; and that C2 smooths the output ripple, though nothing smooths a stalled motor at 3 A. | robotics-bench-b.md §7.2 L1031-1035 | must | e2e |
| RBB-194 | Fig. 12 must tag U1 "LM2596", L1 "INDUCTOR", D1 "DIODE", LED1 "PWR", RC "FEEDBACK", RV1 "TRIMPOT", DS1 "VOLTMETER", J1 "IN 11.1V", J2 "OUT", C1 "C IN" and C2 "C OUT", lighting LM2596 and INDUCTOR while running, VOLTMETER while powered, IN 11.1V while the battery is connected and TRIMPOT while it is being turned (the original never lights it). | robotics-bench-b.md §7.2 L1023-1035; §7.6 L1122-1123 | must | e2e |
| RBB-195 | Fig. 12's mat must hold a Nano fed from J2, a yellow multimeter face up (red probe on OUT+, black COM on OUT−, unit "V"), a TT gear motor (yellow gearbox, metal can, black tyre, yellow five-spoke hub) and a 3S LiPo labelled "11.1V" / "LIPO" whose lead runs to J1 and, when disconnected, lies on the mat ending in its yellow connector. | robotics-bench-b.md §7.3 L1039-1047 | must | screenshot |
| RBB-196 | must not copy: the battery lead drawn as a USB-C plug going into the J1 screw terminal; the battery must connect through its own leads or connector at the terminal. | robotics-bench-b.md §7.1 L1009; §7.3 L1045-1046 | must | screenshot |
| RBB-197 | Fig. 12's Nano power LED must follow its rail: lit while the rail keeps the Nano alive, dark when it dies, flickering when it browns out. | robotics-bench-b.md §7.3 L1039-1040 | must | e2e |
| RBB-198 | Fig. 12's wheel must turn at a speed set by the output (normal at 5 V, slower at 3.3 V, about double at 10.5 V), and in "Motor stall" a wooden block must jam it, the wheel only shaking. | robotics-bench-b.md §7.3 L1043, L1047 | must | e2e |
| RBB-199 | Fig. 12's wires must run J2 OUT− black and OUT+ red to the Nano, the motor's red and black leads low along the mat round the battery, and the meter leads to J2, all only once J2 is on the board. | robotics-bench-b.md §7.3 L1048-1049 | must | e2e |
| RBB-200 | In "Set 12 V (impossible)" the Nano must die about 1.2 s after the output rises and give off smoke. | robotics-bench-b.md §7.3 L1050; §7.7 L1129 | must | e2e |
| RBB-201 | Fig. 12 must model a 3S pack at 11.1 V with 0.08 Ω internal resistance, so the input sags as Vin = 11.1 − I × 0.08 (11.064 V at 0.45 A, 10.86 V at 3 A). | robotics-bench-b.md §7.4 L1054, L1063 | must | unit |
| RBB-202 | In "Set 5.0 V" Fig. 12's output must sit at 5.0 V with a small ripple (about ±0.015 V) at 0.45 A, the wheel at normal speed and the Nano alive. | robotics-bench-b.md §7.4 L1058 | must | unit |
| RBB-203 | In "Set 3.3 V" Fig. 12's output must sit at 3.3 V at 0.30 A with the wheel at about 55% speed and the Nano dropping out about 30% of the time (its LED flickering). | robotics-bench-b.md §7.4 L1059; §7.7 L1131 | must | unit |
| RBB-204 | In "Set 12 V (impossible)" Fig. 12's output must top out at the 10.5 V dropout ceiling at 0.80 A with the wheel at about double speed. | robotics-bench-b.md §7.4 L1060; §7.7 L1129 | must | unit |
| RBB-205 | In "Motor stall" Fig. 12's output must bounce between about 2.9 and 4.6 V at the current limit, the Nano alive only while Vout is above its threshold, in a brown-out and setup() loop. | robotics-bench-b.md §7.4 L1061; §7.7 L1130 | must | unit |
| RBB-206 | Fig. 12's built-in display must read 0.06 V high on purpose (always check a cheap display against a real meter), with one decimal from 9.95 V and two below, blank without power and "0.00" when powered but not running. | robotics-bench-b.md §7.4 L1066-1067 | must | e2e |
| RBB-207 | Fig. 12's multimeter must show Vout to two decimals (one from 9.995 V) and "0.00" when not running (live "4.99" / "5.01" in Set 5.0 V while the display reads about "5.06", "10.5" against "10.6" at 12 V, 2.90–4.56 in the stall). | robotics-bench-b.md §7.4 L1068-1069 | must | e2e |
| RBB-208 | Fig. 12's trimpot screw must turn 160° per volt of the chosen setting (5 V → 800°, 3.3 V → 528°, 12 V → 1920°) as soon as a setting is picked, powered or not. | robotics-bench-b.md §7.4 L1070-1071 | must | e2e |
| RBB-209 | While Fig. 12 runs, the stats must show "Vout" (x.xx V), "Iout" (x.xx A) and "Linear would burn" (x.x W), e.g. 5.00 V / 0.45 A / 2.7 W, 3.30 V / 0.30 A / 2.3 W, 10.50 V / 0.80 A / 0.4 W, and 2.90–4.56 V / 3.00 A / 23.9–18.9 W in the stall. | robotics-bench-b.md §7.5 L1075-1082 | must | e2e |
| RBB-210 | must not copy: two different "linear" figures (the stat uses the sagged input, 2.7 W at 5 V, while the math panel uses 11.1 V, 2.75 W); "Linear would burn" and the math panel must come from one calculation. | robotics-bench-b.md §7.5 L1079; §7.12 L1170-1171; §10 #6 L1426 | must | unit |
| RBB-211 | In "Set 5.0 V" Fig. 12's bench notes must log "Nano: boot OK on 5.00 V" at 1 s and "Vin 11.06 V  Vout 5.00 V  Iout 0.45 A  eff 90%" every 3 s. | robotics-bench-b.md §7.6 L1088 | must | e2e |
| RBB-212 | In "Set 3.3 V" Fig. 12's bench notes must log "Vout 3.30 V: fine for an ESP32 or a sensor", then the Nano's trouble at 16 MHz, then "Vout 3.30 V  Iout 0.30 A" every 3 s. | robotics-bench-b.md §7.6 L1089 | must | e2e |
| RBB-213 | must not copy: "a 16 MHz ATmega wants 4.5 V+"; the 16 MHz safe operating area starts at about 3.8 V (4.5 V is the 20 MHz figure), so at 3.3 V the Nano is outside it. | robotics-bench-b.md §7.6 L1089; §7.12 L1175-1177 | must | review |
| RBB-214 | In "Set 12 V (impossible)" Fig. 12's bench notes must log, once each, "Asked for 12 V from an 11.1 V pack: a buck only steps DOWN", "Vout tops out at ~10.5 V (dropout)", "10.5 V on the Nano's 5V pin... magic smoke" and "Rule: set the voltage BEFORE you connect the load". | robotics-bench-b.md §7.6 L1090 | must | e2e |
| RBB-215 | In "Motor stall" Fig. 12's bench notes must repeat "Wheel jammed: motor current 3.0 A (current limit)", "Vout sags to 2.9 V", "Nano: brown-out reset", "setup()", "Nano: brown-out reset", "setup()", with the current and voltage matching the model. | robotics-bench-b.md §7.6 L1091 | must | e2e |
| RBB-216 | Fig. 12's "The math" panel for each voltage setting must work out the buck: "# 3S LiPo: 3 cells x 3.7 V = 11.1 V nominal (12.6 full, ~9.9 empty)", V_in, V_out, the duty cycle D = V_out / V_in (45% at 5 V, 30% at 3.3 V, 95% at 10.5 V), I_out, P_out = V_out * I_out, the buck heat P_out / 0.90 − P_out and the linear heat (V_in − V_out) * I_out "in a 7805", with the 12 V case reading "V_out = 10.5  # asked for 12 V: a buck only steps DOWN". | robotics-bench-b.md §7.6 L1093-1108 | must | e2e |
| RBB-217 | Fig. 12's "The math" panel for "Motor stall" must show the stalled motor's resistance, the current it would draw, the LM2596's current limit, the sagging V_out, the Nano's threshold, "# The Nano shares this rail: below ~4.3 V it resets, again and again." and "# Fix: separate supply for logic, or a big cap + a diode for the Nano.". | robotics-bench-b.md §7.6 L1111-1119 | must | e2e |
| RBB-218 | must not copy: stall math that calls the motor about 2 Ω but computes V_out = I_limit × 1.0; Fig. 12 must use one stalled-motor resistance throughout, with V_out = I × R (at 2 Ω and 3 A the motor would see 6 V). | robotics-bench-b.md §7.6 L1112-1115; §7.12 L1172-1173; §10 #6 L1426 | must | unit |
| RBB-219 | Fig. 12's current limit must be the LM2596's real switch limit for the 3 A part (typically about 4.5 A, at least about 3.6 A), not exactly 3.0 A. | robotics-bench-b.md §7.12 L1174 | must | review |
| RBB-220 | must not copy: calling 4.3 V the Nano's brown-out threshold; a stock Nano's BOD is 2.7 V (the options are 1.8, 2.7 and 4.3 V), and Fig. 12 must either say the stall pushes the Nano out of its 16 MHz safe operating area (below about 3.8 V) or model the 4.3 V BOD option and say so. | robotics-bench-b.md §7.6 L1116-1117; §7.12 L1175-1177; §10 #6 L1426 | must | review |
| RBB-221 | Fig. 12 must use D = Vout / Vin for the ideal buck's duty cycle, Pout / η − Pout with η = 0.9 for the buck's loss and (Vin − Vout) × I for the linear loss. | robotics-bench-b.md §7.12 L1169 | must | review |
| RBB-222 | Fig. 12 must state the LM2596's 1.23 V feedback reference, 150 kHz switching and 4.5–40 V input, and the SS34 Schottky. | robotics-bench-b.md §7.12 L1178 | must | review |
| RBB-223 | Whenever current flows on Fig. 12, yellow dots must run on the power path faster as the current rises. | robotics-bench-b.md §7.6 L1121-1122 | must | e2e |
| RBB-224 | On Fig. 12, C1 or C2 stripe back must pop at power-up with "Pop! C1 is in backwards: reverse voltage vents an electrolytic. Unplug and flip it" (or C2). | robotics-bench-b.md §7.7 L1132 | must | e2e |
| RBB-225 | Fig. 12 without J2 must say "Powered, but J2 (Output screw terminal) is missing: nothing runs" with the display and meter at "0.00", and without C2 "Powered, but C2 (220 uF 35 V output capacitor) is missing: nothing runs". | robotics-bench-b.md §7.7 L1133-1134 | must | e2e |
| RBB-226 | On Fig. 12, "Connect battery" before J1 is fitted must say "There's nothing to plug into: place J1 first", and with J1 unsoldered "J1 isn't soldered: the power pins don't touch the copper". | robotics-bench-b.md §7.7 L1135-1136 | must | e2e |
| RBB-227 | Fig. 12 without C1 should still run but show its input ripple going up the battery leads (the original runs exactly as with it). | robotics-bench-b.md §7.7 L1137; §7.2 L1034; §10 #11 L1435-1436 | should | e2e |
| RBB-228 | With U1, L1 or D1 left out, Fig. 12 must refuse power with "No power: U1 (LM2596S-ADJ switching regulator) is missing or unsoldered", "No power: L1 (33 uH power inductor) is missing or unsoldered" or "No power: D1 (SS34 Schottky diode) is missing or unsoldered". | robotics-bench-b.md §7.7 L1138; §10 #10 L1430-1433 | must | e2e |
| RBB-229 | Fig. 12's build must be 5 SMD parts, then RV1 and DS1, then J1, J2, C1 and C2 (each cap with a stripe-front / stripe-back choice), with J1 placed and soldered before "Connect battery" works. | robotics-bench-b.md §7.8 L1142-1143 | must | e2e |
| RBB-230 | Fig. 12's "Meet the board" must explain that batteries are never the voltage you need (a 3S LiPo is 3 × 3.7 = 11.1 V nominal, 12.6 V full, about 9.9 V empty, while the Arduino wants 5 V), that a buck chops and smooths so it trades voltage for current instead of burning the difference, that the real lesson is the stall (the shared 5 V rail sags, the Arduino browns out and resets, which is why robots reboot when they hit a wall), and never to leave a LiPo charging unattended. | robotics-bench-b.md §7.9 L1147-1150 | must | e2e |
| RBB-231 | Fig. 12's quiz must ask "A 3S LiPo reads 12.6 V when full. Nominal and empty?" with "11.1 V nominal, about 9.9 V empty" (right), "12 V nominal, 6 V empty" and "3.7 V nominal, 3 V empty", explaining 4.2 / 3.7 / about 3.3 V per cell × 3. | robotics-bench-b.md §7.10 L1154-1155 | must | e2e |
| RBB-232 | Fig. 12's quiz must ask "Why does a stalling motor reset the Arduino on the same 5 V rail?" with "The motor injects noise into the code", "The stall current drags the rail below the brown-out threshold" (right) and "The buck shuts down on purpose". | robotics-bench-b.md §7.10 L1156-1157 | must | e2e |
| RBB-233 | Fig. 12's quiz must ask "11.1 V in, 5 V out at 2 A. Heat in a linear regulator vs this buck?" with "About the same", "Linear ~12 W, buck ~1 W" (right) and "Linear ~1 W, buck ~12 W", explaining (11.1 − 5) × 2 = 12.2 W against 10 W / 0.9 − 10 W = 1.1 W. | robotics-bench-b.md §7.10 L1158-1159 | must | e2e |
| RBB-234 | Fig. 12's practice task must be: power an Arduino and a gear motor from one 5 V output, print millis(), stall the wheel by hand and watch the count restart; then give the Arduino its own regulator (or a big cap behind a diode), repeat, record the difference and explain out loud why the first version reset. | robotics-bench-b.md §7.11 L1163-1165 | must | e2e |

## RBB · Fig. 13 Raspberry Pi 5, the ROS 2 brain

Linux boot, a ROS 2 teleop node, heat without the Active Cooler and undervoltage from a phone brick.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBB-235 | Fig. 13 must be "Raspberry Pi 5" with sub-line "ROS 2 brain", hint "build it, add the cooler, power it from a real 5 A supply", palette mint, power button "Plug / unplug 27W USB-C", the instant picker "Run ▾" defaulting to "Boot Linux", code heading "On the Pi · {mode}", terminal "Terminal (SSH)" (starting "-- terminal (ssh) --"), U4 needed to power, U1, U2 and U3 needed to run, and the power-up toast "Powered: PWR red, ACT flickers while Linux boots". | robotics-bench-b.md §8.1 L1188-1196 | must | e2e |
| RBB-236 | Fig. 13 must place every part in the real Pi 5's top-view millimetres (85 × 56 mm, 3 mm radius, holes at (3.5, 3.5), (61.5, 3.5), (3.5, 52.5) and (61.5, 52.5); X from the PCIe end to the USB/Ethernet end, Y from the USB-C/HDMI edge to the GPIO edge), drawn with the USB-C and micro-HDMI side facing viewer-left and the USB/Ethernet end facing the front. | robotics-bench-b.md §8.1 L1190; §8.2 L1200-1202 | must | review |
| RBB-237 | Fig. 13's silkscreen must read "Raspberry Pi 5", "PCIE", "CAM1", "CAM0", "ACT", "PWR", "RTC", "FAN" and "GPIO", and it must draw the SoC on a green substrate under a metal lid printed "BCM2712" / "2.4 GHz", white FFC connectors with black latches, white JST headers, an RJ45 with green link and amber activity LEDs, and stacked USB-A pairs with blue (USB 3) and black (USB 2) tongues. | robotics-bench-b.md §8.2 L1202-1206 | must | screenshot |
| RBB-238 | Fig. 13's SMD parts must be U1 BCM2712 SoC, U2 LPDDR4X RAM ("LPDDR4X / 4GB"), U3 RP1 I/O controller, U4 power management IC ("PMIC"), U5 Wi-Fi / Bluetooth module ("WIFI"), LED1 red power LED, LED2 green activity LED and RC decoupling caps and resistors. | robotics-bench-b.md §8.2 L1208-1217 | must | e2e |
| RBB-239 | Fig. 13's other parts must be, low: J2 PCIe FFC, J3 camera / display 0, J4 camera / display 1, SW1 power button, J5 RTC battery connector (2-pin JST) and J6 fan connector (4-pin JST); tall: J1 USB-C power jack, J9 and J10 micro HDMI 0 and 1, J8 the 40-pin GPIO header, J11 gigabit Ethernet, J12 USB 3.0 ports (blue) and J13 USB 2.0 ports (black); last-in: FAN the Active Cooler. | robotics-bench-b.md §8.2 L1218-1231 | must | e2e |
| RBB-240 | Fig. 13's micro-HDMI ports must be drawn as micro-HDMI (type D) sockets, not as reused USB-C shapes. | robotics-bench-b.md §8.2 L1225-1226; SPEC.md L26 | must | screenshot |
| RBB-241 | Fig. 13's chip descriptions must teach that the BCM2712 is a quad Cortex-A76 at 2.4 GHz under a heat spreader that runs Linux, ROS 2, SLAM and vision but is not real-time; that the 4 GB LPDDR4X (or 8/16 GB) sits right by the SoC for short traces at this speed; that the RP1 is Raspberry Pi's own I/O chip (USB, Ethernet, GPIO, cameras) linked to the SoC over PCIe; that the PMIC makes every rail from USB-C 5 V, negotiates 5 A with the 27 W supply and flags undervoltage; that the Wi-Fi / BT 5 module is fine for SSH and Foxglove but control traffic wants a cable; that a solid PWR LED means powered and a blinking one a supply below 4.63 V; that ACT flickers with SD activity, then beats a heartbeat once Linux is up; and that every fast chip needs its local energy reserve. | robotics-bench-b.md §8.2 L1210-1217 | must | e2e |
| RBB-242 | Fig. 13's connector descriptions must teach that the PCIe 2.0 x1 ribbon takes an NVMe HAT or an AI accelerator; that each 4-lane MIPI connector takes a camera or a DSI display (two make stereo; calibrate each camera with a chessboard first); that the power button, new on the Pi 5, boots and then shuts down cleanly; that a small RTC cell keeps the clock and the log timestamps right; that the 4-pin PWM fan header lets firmware ramp the fan with CPU temperature; that the official 27 W supply negotiates 5 A while a phone charger gives at most 3 A and USB power gets limited; that HDMI0 does 4K60 (mostly for first boot on a robot) and HDMI1 a second display; that the GPIO is 3.3 V logic with I2C, SPI, UART and PWM, never 5 V in, and motors go to a microcontroller; that Ethernet is the reliable way to stream topics and frames (green link, amber traffic); that the blue USB 3 ports (5 Gbit/s) take depth cameras, lidar and SSDs and the black USB 2 ports a keyboard, a teleop gamepad and USB-serial to the Nano/ESP32; and that the Active Cooler (heatsink and blower on spring pins with thermal pads on the SoC, RAM and RP1) keeps ROS 2 load from hitting 85 °C and throttling. | robotics-bench-b.md §8.2 L1218-1231 | must | e2e |
| RBB-243 | Fig. 13 must tag its parts (SOC, RAM, RP1, PMIC, WIFI, PWR, ACT, PASSIVES, PCIE, CAM0, CAM1, POWER BTN, RTC, FAN, USB-C 5V, HDMI0, HDMI1, GPIO, ETHERNET, USB 3, USB 2, ACTIVE COOLER), lighting USB-C 5V while plugged, ACTIVE COOLER while running with the cooler, USB 3 in teleop, ETHERNET while running and GPIO when the GPIO is in use (the original never lights it). | robotics-bench-b.md §8.2 L1208-1231; §8.6 L1338-1339 | must | e2e |
| RBB-244 | Fig. 13's Active Cooler must be drawn from the real part: an aluminium plate over X 14–57 × Y 21–46.5, a 9 mm blower block over X 13.5–36 with a 9-blade fan centred at (24.6, 33.75) that spins while running, 11 fins from X 37 to 57 spaced 2.38 mm apart, and a black cable to J6 when J6 is fitted and the view is not exploded. | robotics-bench-b.md §8.2 L1233-1235 | must | screenshot |
| RBB-245 | Fig. 13's mat must hold only the USB-C cable from the 27 W supply into J1. | robotics-bench-b.md §8.3 L1239 | must | screenshot |
| RBB-246 | Fig. 13's CPU temperature must settle around 52 °C booting, 61 °C under teleop and 48 °C throttled by undervoltage with the cooler (wobbling about ±1.5 °C), and without the cooler climb about 2.4 °C/s from 4 °C above that to 85 °C. | robotics-bench-b.md §8.4 L1243-1246 | must | unit |
| RBB-247 | must not copy: the temperature resetting on every mode switch (a cooler-less Pi at 85 °C dropping to 65 °C when teleop starts); Fig. 13 must keep its thermal state across mode switches. | robotics-bench-b.md §8.4 L1247-1248; §8.11 L1384; §10 #3 L1423 | must | unit |
| RBB-248 | Fig. 13 must start throttling at 80 °C and throttle hard at 85 °C, and describe the throttled 1.5 GHz as 62.5% of 2.4 GHz, never as "half speed". | robotics-bench-b.md §8.11 L1381-1382 | must | unit |
| RBB-249 | Fig. 13's cooler fan must spin faster under load (about 7 rad/s booting, 12 under teleop, 4 when throttled by undervoltage). | robotics-bench-b.md §8.4 L1249 | must | e2e |
| RBB-250 | Fig. 13's red PWR LED must be on while booting and in teleop and blink (0.4 s on, 0.4 s off) during undervoltage. | robotics-bench-b.md §8.4 L1250 | must | e2e |
| RBB-251 | Fig. 13's green ACT LED must flicker fast for the first 6 s of boot and then double-blink every 1.2 s, flicker busily in teleop, and give a short blink every 2 s during undervoltage. | robotics-bench-b.md §8.4 L1251-1253 | must | e2e |
| RBB-252 | Fig. 13's Ethernet LEDs must show green link while running and flicker amber for activity. | robotics-bench-b.md §8.4 L1254 | must | e2e |
| RBB-253 | While Fig. 13 runs, yellow dots must run on the Ethernet path, green dots on the USB path in teleop and orange dots on the HDMI path while booting, with power dots from USB-C to the PMIC while powered. | robotics-bench-b.md §8.4 L1255-1256 | must | e2e |
| RBB-254 | "Boot Linux" (supply 5.1 V) must print "[    0.000000] Booting Linux on physical CPU 0x0", "[    0.000000] Machine model: Raspberry Pi 5 Model B Rev 1.0", "[    1.204511] rp1: PCIe link up, x4 gen2", "[    2.981230] systemd[1]: Reached target multi-user.target", "raspberrypi login: pi" and "$ vcgencmd get_throttled  ->  throttled=0x0", then every third second "$ vcgencmd measure_temp  ->  temp={t}'C" with the modelled temperature. | robotics-bench-b.md §8.5 L1260-1270 | must | e2e |
| RBB-255 | "Boot Linux"'s panel must show "# first boot: Raspberry Pi OS (64-bit) on a good SD card", "sudo apt update && sudo apt full-upgrade", "vcgencmd measure_temp      # CPU temperature", "vcgencmd get_throttled     # 0x0 = the supply is healthy" and "# ROS 2 Jazzy: Ubuntu 24.04 is the Tier 1 target," / "# so many robots run Ubuntu (or Docker) on the Pi instead". | robotics-bench-b.md §8.5 L1272-1282 | must | e2e |
| RBB-256 | "ros2 run teleop" (supply 5.1 V) must print "$ source /opt/ros/jazzy/setup.bash", "$ ros2 run my_robot drive", "[INFO] [drive]: publishing /cmd_vel at 10 Hz" and "$ ros2 topic hz /cmd_vel  ->  average rate: 10.000", then once a second "linear.x: 0.20   angular.z: {value}", replaced every fourth second at 85 °C by "WARNING: CPU at 85.0C, throttling to 1.5 GHz (no cooler?)". | robotics-bench-b.md §8.5 L1284-1288 | must | e2e |
| RBB-257 | "ros2 run teleop"'s panel must show the rclpy Drive node: create_publisher(Twist, '/cmd_vel', 10), create_timer(0.1, self.tick) ("# 10 Hz"), linear.x = 0.2 ("# m/s forward"), angular.z = 0.5 ("# rad/s turn") and publish ("# an ESP32 turns this into PWM"), then rclpy.init() and rclpy.spin(Drive()). | robotics-bench-b.md §8.5 L1290-1310 | must | e2e |
| RBB-258 | must not copy: a terminal printing a varying angular.z (0.5·sin(k/2)) while the node shown publishes a constant 0.5; the logged values must be what the node publishes. | robotics-bench-b.md §8.5 L1286-1287; §8.11 L1383; §10 #9 L1429 | must | e2e |
| RBB-259 | "Undervoltage (5V 2A brick)" (supply 4.62 V, throttled) must alternate "hwmon hwmon1: Undervoltage detected!" and "$ vcgencmd get_throttled  ->  throttled=0x50005" in the terminal. | robotics-bench-b.md §8.5 L1312-1313 | must | e2e |
| RBB-260 | "Undervoltage (5V 2A brick)"'s panel must explain throttled=0x50005 bit by bit, then "# a phone brick sags under load: random reboots,", "# corrupted SD cards, USB devices dropping out." and "# fix: the official 5 V 5 A (27 W) USB-C supply". | robotics-bench-b.md §8.5 L1315-1324 | must | e2e |
| RBB-261 | Fig. 13's decoding of throttled=0x50005 must list all four bits it sets: 0 (under-voltage now), 2 (throttled now), 16 (under-voltage has happened) and 18 (throttling has happened); the original leaves out bit 18. | robotics-bench-b.md §8.5 L1317-1320; §8.11 L1380; §10 #9 L1429 | must | review |
| RBB-262 | While Fig. 13 runs, the stats must show "CPU" (rounded, e.g. "53 C"), "Clock" ("2.4 GHz", or "1.5 GHz" while throttled) and "Supply" ("5.10 V", or "4.62 V" on the phone brick). | robotics-bench-b.md §8.6 L1329-1336 | must | e2e |
| RBB-263 | Fig. 13 built without the Active Cooler must heat to 85 °C and throttle, show the 85 °C warning every 4 s in teleop, and show no ACTIVE COOLER tag. | robotics-bench-b.md §8.7 L1346 | must | e2e |
| RBB-264 | On Fig. 13, plugging in without J1 must say "There's nothing to plug into: place J1 first", and fitting the cooler before every connector is soldered "Solder everything first: this part goes on last". | robotics-bench-b.md §8.7 L1347-1348 | must | e2e |
| RBB-265 | With U4 left out Fig. 13 must refuse power with "No power: U4 (Power management IC) is missing or unsoldered", and with U1 left out show POWERED and "Powered, but U1 (BCM2712 SoC) is missing: nothing runs". | robotics-bench-b.md §8.7 L1349; §10 #10 L1430-1433 | must | e2e |
| RBB-266 | Fig. 13's power button must work: a press boots the Pi and a second press shuts it down cleanly. | robotics-bench-b.md §8.7 L1351; §8.2 L1221; SPEC.md L25 | must | e2e |
| RBB-267 | Fig. 13 should model SD-card corruption when the power is pulled without a clean shutdown. | robotics-bench-b.md §8.7 L1351; §10 #11 L1436 | should | e2e |
| RBB-268 | Fig. 13 should show what 5 V on a GPIO pin does (the pin, or the Pi, is damaged). | robotics-bench-b.md §8.7 L1351; §8.2 L1227 | should | e2e |
| RBB-269 | Fig. 13 should show real-time jitter: a control loop on Linux missing its deadlines while an ESP32 or Nano keeps time. | robotics-bench-b.md §8.7 L1351; §8.9 L1362-1363 | should | e2e |
| RBB-270 | Fig. 13's "Meet the board" must explain that the Pi 5 is the robot's brain, not its spinal cord: a 2.4 GHz quad-core Linux computer running ROS 2 Jazzy, SLAM Toolbox, Nav2 and the camera pipeline, while the motor and balance loops live on an ESP32 or Nano talking to it over USB serial (the split Waveshare's UGV Rover uses) because Linux is not real-time; and to use a real 5 V 5 A supply, fit the Active Cooler last and watch the terminal. | robotics-bench-b.md §8.8 L1355-1358 | must | e2e |
| RBB-271 | Fig. 13 must state the undervoltage warning at about 4.63 V, 27 W as 5 V × 5 A over USB-PD, the RP1 on PCIe 2.0 x4 and the external PCIe FFC as x1 Gen 2. | robotics-bench-b.md §8.11 L1385 | must | review |
| RBB-272 | Fig. 13 should name the real PMIC (Renesas DA9091) and the Wi-Fi/BT module class (CYW43455). | robotics-bench-b.md §8.11 L1385-1386 | should | review |
| RBB-273 | Fig. 13's quiz must ask "Why does the Pi run ROS 2 while an ESP32 runs the motor loop?" with "Linux is not real-time: the scheduler can pause your loop" (right), "The Pi has no PWM pins" and "ROS 2 only runs on Arm". | robotics-bench-b.md §8.9 L1362-1363 | must | e2e |
| RBB-274 | Fig. 13's quiz must ask "'Undervoltage detected!' with a phone charger. The fix?" with "Lower the CPU clock in software", "A 5 V 5 A (27 W) USB-C supply" (right) and "A bigger heatsink". | robotics-bench-b.md §8.9 L1364-1365 | must | e2e |
| RBB-275 | Fig. 13's quiz must ask "Which ROS 2 distro does the roadmap say to start on?" with "Noetic (ROS 1)", "Jazzy Jalisco" (right) and "Kilted Kaiju", explaining that Jazzy is the May 2024 LTS (supported to 2029) with Ubuntu 24.04 as its Tier 1 platform, Noetic is ROS 1 and Kilted is a short-support 2025 release. | robotics-bench-b.md §8.9 L1366-1368 | must | e2e |
| RBB-276 | Before shipping, Fig. 13's ROS 2 advice should be checked against the current LTS, and the May 2026 LTS mentioned if it has been released. | robotics-bench-b.md §8.9 L1368 | should | review |
| RBB-277 | Fig. 13's practice task must be: build a multi-node ROS 2 system with no robot (a sensor publisher, a processing node, a service-based config node and a parameterised aggregator) with custom .msg and .srv types, launched from a Python launch file with arguments, then record it with ros2 bag and replay it. | robotics-bench-b.md §8.10 L1374-1376 | must | e2e |

## RBB · Practice tasks and the original's quirks across Figs 01-13

What §9 and §10 add beyond the per-figure items.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| RBB-278 | Every practice task must be a checkable exercise: iynk checks it from a deterministic run, saves a pass as done["robotics:{bench}:task:{taskId}"], and lists every task across the benches so the user can see them all. | robotics-bench-b.md §9 L1392-1394; SPEC.md L66, L103; BASE_ARCHITECTURE.md D7, D14 | must | e2e |
| RBB-279 | Every board's practice task must be present: Fig. 01 reaction timer, 02 voltage divider, 03 transistor switch and gain, 04 ESP32 web page with servo buttons, 05 five PWM speeds then one encoder revolution, 06 the same with ENA on a PWM pin, 07 one revolution in full and 1/16 step with a tape flag, 08 robot arm, 09 drift then complementary filter then Kalman, 10 distance log against a wall, a cushion and an angled bottle, 11 line follower with P then D, 12 shared-rail brown-out then a separate regulator, 13 multi-node ROS 2 system with ros2 bag. | robotics-bench-b.md §9 L1396-1415 | must | review |
| RBB-280 | Each quirk and bug in robotics-bench-b.md §10 must be fixed as its per-figure item says, none copied (A4988 live-unplug re-fault, the stale-sketch code panel, the Pi's temperature reset, the 1/16 timing, the synthetic filter, the buck's numbers, the VL53L0X cone, the servo channels, the throttled bits, the unreachable SMD failures and the text-only failures). | robotics-bench-b.md §10 L1419-1436 | must | review |

## AUD · Build, checks, app shell and the figure bridge

current-iynk-audit.md §1, §2 and §3.1.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-001 | must not: figure sources left outside every lint and type check; figure code must be linted and type-checked, and a headless run must fail the build when a figure records data-errors. | current-iynk-audit.md §1 L83-84 | must | review |
| AUD-002 | must not: a one-shot "ready" from the figure that races React hydration and leaves the figure disconnected; the app and the figure must handshake (the parent says hello on iframe load and when its listener attaches, the figure answers every hello, patches queue until ready), and the figure must connect on every load, including on a 6× throttled CPU. | current-iynk-audit.md §3.1 P-01 (C) L111; §2 #1 L90 | must | e2e |
| AUD-003 | must not: clearing the figure's readiness on iframe load; readiness must be tracked per load and never cleared after a ready for the current load. | current-iynk-audit.md §3.1 P-02 (M) L112 | must | unit |
| AUD-004 | must not: posting every patch twice and rebuilding the whole figure for each (244 patches a second while armed); the app must send one memoised patch of changed keys, at most once per animation frame. | current-iynk-audit.md §3.1 P-03 (M) L113 | must | e2e |
| AUD-005 | must not: postMessage to "*" with a figure that accepts any sender; messages must target the app's own origin and the figure must check that they come from its parent. | current-iynk-audit.md §3.1 P-04 (L) L114 | must | review |
| AUD-006 | must not: an unknown board, robotics or drone slug answering HTTP 200 on its first request; every unknown slug must return 404 every time. | current-iynk-audit.md §3.1 P-05 (M) L115 | must | e2e |
| AUD-007 | must not: raw slugs as page titles ("uno-build — iynk robotics"), plain "iynk" on the index pages and one description for every page; each page must have a human title and its own description, with per-language alternates. | current-iynk-audit.md §3.1 P-06 (L) L116 | must | e2e |
| AUD-008 | must not: unguarded localStorage access in snapshots and setters; every access must be guarded and fall back to memory when storage throws. | current-iynk-audit.md §3.1 P-07 (L) L117 | must | unit |
| AUD-009 | must not: hidden routes that keep their figures mounted and animating; a figure on a hidden route must pause or unmount. | current-iynk-audit.md §3.1 P-08 (L) L118 | must | e2e |
| AUD-010 | must not: any code, figure source or built figure carried over from the audited build at commit 245763f; its src/app, src/components and src/lib files and its figures must be replaced by new code written during the hackathon, not patched. | current-iynk-audit.md L3; BASE_ARCHITECTURE.md D13 | must | review |

## AUD · Figures: the board and drone drawings

current-iynk-audit.md §3.2 (figure engine use, F-01 to F-24).

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-011 | must not: a breadboard sheet that throws and draws nothing; the breadboard view must render on every board. | current-iynk-audit.md §3.2 F-01 (C) L124; §2 #2 L91 | must | e2e |
| AUD-012 | must not: local names that shadow reserved Colorfigures core names (a const on in board.html, used before it is declared); figure code must never declare a reserved core name. | current-iynk-audit.md §3.2 F-01 (C) L124, F-22 (L) L145 | must | review |
| AUD-013 | must not: a colour string passed where a material is needed, blanking the schematic on every board and freezing the figure after the "Control a motor" lesson; the schematic must render on every board and the motor lesson must run with no errors. | current-iynk-audit.md §3.2 F-02 (C) L125; §2 #2 L91 | must | e2e |
| AUD-014 | must not: part boxes drawn up from the board's bottom so the PCB hides them (an empty micro:bit, Basys 3 and DE10-Lite showing only a USB block, Pi boards with no SoC, Nucleo without its left morpho header); every on-board part must sit on the PCB top and show from each of the skill's seven check angles. | current-iynk-audit.md §3.2 F-03 (H) L126; §2 #3 L92 | must | screenshot |
| AUD-015 | must not: the Nano drawn as a small Uno (DIP-28 chip, Uno-style female headers); the Nano must have a TQFP-32 ATmega328P, 2 × 15 male pins along its long edges, a mini-USB at one end and its reset button in the middle. | current-iynk-audit.md §3.2 F-04 (H) L127 | must | screenshot |
| AUD-016 | must not: an Uno R4 with no RA4M1, a 16U2 on the Minima and a 78 × 102 outline; the R4 must show the RA4M1 (LQFP-64), the ESP32-S3-MINI-1 module on the WiFi model, no 16U2, and the Uno's outline. | current-iynk-audit.md §3.2 F-05 (H) L128 | must | screenshot |
| AUD-017 | must not: one shared yellow drawing for the ESP32 DevKit, the ESP32-S3 DevKit and the NodeMCU (cans reading "ESP32" and "ESP", female headers, 15 pins on the S3); each must have its own layout with the antenna overhang, its USB-UART chip, the AMS1117, male pins, and on the S3 the second USB port, the RGB LED and 22 pins a side. | current-iynk-audit.md §3.2 F-06 (H) L129 | must | screenshot |
| AUD-018 | must not: the Pico's BOOTSEL drawn at the far end and "PICO" silk on the Pico 2; BOOTSEL must sit near the USB end and each variant must carry its own silk. | current-iynk-audit.md §3.2 F-07 (M) L130 | must | screenshot |
| AUD-019 | must not: the Pico W's LED driven from GP25; on the Pico W the LED hangs off the CYW43 wireless chip and must be driven through it. | current-iynk-audit.md §3.2 F-07 (M) L130; §2 #6 L95 | must | e2e |
| AUD-020 | must not: a mustard Pi with "GPIO 40" as one row of 20 pins, one USB-A block and no micro-HDMI, RP1, PCIe FFC or fan header; the Pi must be a green PCB with the 2 × 20 header, two stacked USB-A pairs and Ethernet, two micro-HDMI, the RP1, the PCIe FFC and, on the Pi 5, the power button. | current-iynk-audit.md §3.2 F-08 (M) L131 | must | screenshot |
| AUD-021 | must not: five push buttons on the DE10-Lite, the Basys 3's five buttons in a row, green DE10 LEDs, and no VGA, Pmod or Arduino header; the DE10-Lite must have KEY0 and KEY1 and red LEDR, the Basys 3 its five buttons in a plus, and each board its real VGA, Pmod and Arduino headers. | current-iynk-audit.md §3.2 F-09 (M) L132 | must | screenshot |
| AUD-022 | must not: unreadable seven-segment digits (about 4.6 × 3.4 units) with the ones digit leftmost; digits must be readable at real scale with the ones digit rightmost. | current-iynk-audit.md §3.2 F-10 (M) L133 | must | screenshot |
| AUD-023 | must not: one generic see-through die with four bond wires and a crystal at a fixed spot on every board, and callouts (POLYFUSE, 3V3 REG, CRYSTAL, the bridge) naming parts that are not drawn; see-through internals must sit under each board's real chip, and every label must name a part that is drawn. | current-iynk-audit.md §3.2 F-11 (H) L134 | must | screenshot |
| AUD-024 | must not: generic surface tags ("ANALOG PINS" on FPGA boards, "RESET" where none is drawn, "DIGITAL PINS" on the micro:bit); each board must tag only its own real parts. | current-iynk-audit.md §3.2 F-12 (M) L135 | must | screenshot |
| AUD-025 | must not: robotics modules drawn as coloured slabs beside the Uno with no pins, jumpers or load, and the HC-SR04 and MPU-6050 drawn twice; each module must be a full figure with its headers, its wiring to the controller and its driven load, drawn once. | current-iynk-audit.md §3.2 F-13 (H) L136 | must | screenshot |
| AUD-026 | must not: the wrong lesson peripheral (a TMP36 shown as an LDR, a soil probe as an LDR, an FSR as a push button, nothing at all for the RGB and tone lessons) or a DC motor that never spins on the board page; each lesson must show its own correct peripheral, and the motor must spin. | current-iynk-audit.md §3.2 F-14 (M) L137 | must | e2e |
| AUD-027 | must not: figure buttons that fight the app (the figure's Blink killed by the next patch, its Plug USB reverted, its Reset not resetting the sketch); an embedded figure must have one owner of state, hiding its own controls or routing them to the app. | current-iynk-audit.md §3.2 F-15 (M) L138 | must | e2e |
| AUD-028 | must not: drag-to-rotate that only works on empty paper; dragging anywhere, the object included, must turn it, with a click-or-drag threshold that keeps parts clickable. | current-iynk-audit.md §3.2 F-16 (M) L139 | must | e2e |
| AUD-029 | must not: a fixed 100 × 100 shadow square under every drone; each craft's shadow must follow its own hull. | current-iynk-audit.md §3.2 F-17 (L) L140 | must | screenshot |
| AUD-030 | must not: every prop spinning the same way; each motor must turn its real direction (two CW and two CCW on a quad, props-in or props-out as configured). | current-iynk-audit.md §3.2 F-18 (H) L141 | must | e2e |
| AUD-031 | must not: 3-bladed props on every craft at about 0.27 of the motor-to-motor diagonal; each prop must have its real blade count (2-bladed on the racer, the 7-inch and the wing) and true scale (about 0.58 of the diagonal on a 5-inch quad). | current-iynk-audit.md §3.2 F-18 (H) L141 | must | screenshot |
| AUD-032 | must not: a flying wing drawn as a flat 110 × 18 rectangle with a box pod; the wing must have a swept planform, moving elevons, winglets and a pusher prop. | current-iynk-audit.md §3.2 F-19 (H) L142 | must | screenshot |
| AUD-033 | must not: the agricultural sprayer drawn as a quad without booms, nozzles or landing gear, legless GPS, delivery and agricultural craft and a delivery craft without a gripper; each airframe must have its own frame (hexa, octo, tri, VTOL) and part set. | current-iynk-audit.md §3.2 F-20 (H) L143 | must | screenshot |
| AUD-034 | must not: a Crazyflie with an XT60, a capacitor, a camera, a VTX and a receiver, none of which it has; the nano craft must carry only its real parts. | current-iynk-audit.md §3.2 F-20 (H) L143 | must | review |
| AUD-035 | must not: a wiring sheet whose blocks carry no text; every node must be labelled and the sheet must have a legend. | current-iynk-audit.md §3.2 F-21 (H) L144; §2 #9 L98 | must | screenshot |
| AUD-036 | must not: a wiring sheet with only battery → XT60 → ESC → FC links and a video link ending at the ESC; it must draw ESC → motors, RX → FC, camera → FC/OSD and FC → VTX, with the video link ending at the VTX. | current-iynk-audit.md §3.2 F-21 (H) L144 | must | review |
| AUD-037 | must not: per-craft data that nothing reads (the stack field); data must be used or deleted. | current-iynk-audit.md §3.2 F-23 (L) L146 | must | review |
| AUD-038 | must not: figure sources that load a core.js that is not beside them; each source must open directly, or the build step that inlines the core must be documented. | current-iynk-audit.md §3.2 F-24 (L) L147 | must | review |

## AUD · Sketch runner and translator

current-iynk-audit.md §3.3 (src/lib/runner.ts, R-01 to R-20).

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-039 | must not: pinMode ignoring the mode so an idle INPUT_PULLUP button reads pressed ("Push a button" printing pressed at rest, "Mini piano" playing at rest); INPUT_PULLUP must idle HIGH, a press must pull it LOW, and INPUT must follow its sensor or float. | current-iynk-audit.md §3.3 R-01 (H) L153; §2 #4 L93 | must | unit |
| AUD-040 | must not: servo.write(angle) always moving the servo to 0; the servo must go to the angle written ("Spin the wheel" about 85). | current-iynk-audit.md §3.3 R-02 (H) L154 | must | unit |
| AUD-041 | must not: every .write( rewritten into a servo call (Serial.write(65) printing nothing); only declared Servo objects are servos, and Serial.write(65) must print "A". | current-iynk-audit.md §3.3 R-03 (H) L155 | must | unit |
| AUD-042 | must not: Serial.print ending its own line ("A0=" and "512" on two lines); print must append to the current line until println or a newline. | current-iynk-audit.md §3.3 R-04 (H) L156 | must | unit |
| AUD-043 | must not: Serial.println(255, HEX) failing with "HEX is not defined"; DEC, HEX, BIN and OCT bases and float digit counts must work. | current-iynk-audit.md §3.3 R-04 (H) L156 | must | unit |
| AUD-044 | must not: "Could not compile" for float, long, String, unsigned int, arrays, non-void functions and typed parameters; the runner must accept C types (qualifiers, arrays, pointers, char, double, uint8_t, int16_t, uint32_t, casts) in declarations, parameters and return types. | current-iynk-audit.md §3.3 R-05 (H) L157 | must | unit |
| AUD-045 | must not: dropping every # line so #define LED 13 fails; object-like #define must work and #include lines must be accepted. | current-iynk-audit.md §3.3 R-06 (H) L158 | must | unit |
| AUD-046 | must not: while (1); or any busy loop freezing the tab; sketches must run off the main thread or yield, and a runaway loop must stop with a message while the page stays responsive. | current-iynk-audit.md §3.3 R-07 (C) L159 | must | e2e |
| AUD-047 | must not: calls to the user's own functions that are not awaited, so delays inside helpers do not block; a helper with delay(1000) called four times must take about 4 s. | current-iynk-audit.md §3.3 R-08 (H) L160 | must | unit |
| AUD-048 | must not: inverted interrupt edges (the reaction timer measuring the release, 1404 ms for a 500 ms press); FALLING must fire on the press and RISING on the release of a pull-up button. | current-iynk-audit.md §3.3 R-09 (M) L161 | must | unit |
| AUD-049 | must not: a stale runner setting "Stopped" and disabling Stop while the new sketch keeps running; status from an old run must be ignored, and Stop must work whenever a sketch is running. | current-iynk-audit.md §3.3 R-10 (M) L162 | must | e2e |
| AUD-050 | must not: missing core API; the runner must implement delayMicroseconds, micros, pulseIn, map, constrain, abs, min, max, random, randomSeed, Serial.available, Serial.read, Wire, shiftOut, bitRead, analogReadResolution, ledcWrite, rgbLedWrite or neopixelWrite, and tone with a duration, as the lessons and originals use them. | current-iynk-audit.md §3.3 R-11 (M) L163 | must | unit |
| AUD-051 | must not: delay() silently capped at 4000 ms; delay must wait the full time asked. | current-iynk-audit.md §3.3 R-11 (M) L163 | must | unit |
| AUD-052 | must not: numbers 14 to 19 mapped to A0–A5 on every board; pin maps must be per board (ESP32 GPIO14–19 and Pico GP14–19 are ordinary pins). | current-iynk-audit.md §3.3 R-12 (M) L164 | must | unit |
| AUD-053 | must not: 8-bit PWM and a 10-bit ADC on every board, and only pin 13 marked non-PWM on the Uno and Nano; resolution and PWM pins must be per board (the ESP32's ADC is 12-bit; on the ATmega328P pins 0, 1, 2, 4, 7, 8, 12 and 13 have no PWM). | current-iynk-audit.md §3.3 R-13 (M) L165 | must | unit |
| AUD-054 | must not: FPGA "Verilog" run by regex dispatch ("assign led = sw & 16'h0000" showing led = sw, the word "chaser" forcing a rotation, "led <= btn" ignored); the FPGA editor must run a small Verilog subset (assign, always @(posedge), concatenation, shifts, counters) or be locked and clearly marked illustrative. | current-iynk-audit.md §3.3 R-14 (M) L166 | must | unit |
| AUD-055 | must not: DE10-Lite digits that never update because the runner sends four digits to a six-digit display; digit updates must use the board's own digit count. | current-iynk-audit.md §3.3 R-15 (M) L167 | must | e2e |
| AUD-056 | must not: int a = 7 / 2 giving 3.5; arithmetic on int types must truncate as in C. | current-iynk-audit.md §3.3 R-16 (L) L168 | must | unit |
| AUD-057 | must not: dead code in the runner (the write helper's unused prev, duplicate assignment and no-op return); unused code must be deleted. | current-iynk-audit.md §3.3 R-17 (L) L169 | must | review |
| AUD-058 | must not: compile and runtime errors shown as JavaScript messages ("Unexpected identifier 'mv'") with no C line number; errors must name the sketch's line in plain words. | current-iynk-audit.md §3.3 R-18 (L) L170 | must | e2e |
| AUD-059 | must not: "Serial began at …" printed on every Serial.begin with no monitor baud; the monitor must have a baud selector and show garbage when it does not match the sketch, as the IDE does. | current-iynk-audit.md §3.3 R-19 (L) L171 | must | e2e |
| AUD-060 | must not: a highlighter that treats # inside strings as a comment and misses long, char, String, unsigned and const; highlighting must come from a tokenizer. | current-iynk-audit.md §3.3 R-20 (L) L172 | must | unit |

## AUD · Board Lab UI

current-iynk-audit.md §3.4 (BoardLab.tsx and CodeBench.tsx, B-01 to B-15).

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-061 | must not: FPGA lessons that can never be marked done (0/5 on Basys 3 and DE10-Lite after running every lesson); FPGA lessons must count toward progress like any other. | current-iynk-audit.md §3.4 B-01 (H) L178; §2 #5 L94 | must | e2e |
| AUD-062 | must not: a lesson marked done the moment Run is pressed, even when the sketch fails to compile; a lesson is done only after it runs (setup ran and loop completed once) or the user marks it done. | current-iynk-audit.md §3.4 B-02 (M) L179 | must | e2e |
| AUD-063 | must not: the same five failure buttons on every board ("Reverse the barrel" on boards with no barrel jack, "Motor inrush" on an FPGA); each board must offer only the failures its hardware can have. | current-iynk-audit.md §3.4 B-03 (H) L180 | must | e2e |
| AUD-064 | must not: a reversed barrel plug that "opens the polyfuse" and kills USB; on the Uno R3 the series diode blocks the reversed barrel, the board stays dark on the jack, and USB still powers and programs it. | current-iynk-audit.md §3.4 B-04 (M) L181; §3.5 E-01 (H) L198; §2 #6 L95 | must | e2e |
| AUD-065 | must not: a "Control a motor" lesson that always browns out with no way to fix it; the lesson must include the driver, separate motor supply and common ground step that makes the motor run. | current-iynk-audit.md §3.4 B-05 (M) L182 | must | e2e |
| AUD-066 | must not: tone() that only prints "tone 440 Hz"; tone must sound through Web Audio, with a volume and a mute (the original's buzzer had a Sound setting). | current-iynk-audit.md §3.4 B-06 (M) L183 | must | e2e |
| AUD-067 | must not: one "Analog A0" slider feeding A0–A3 the same value; each lesson must have its own physical controls (lamp distance, hairdryer, soil, weight on the pad) bound to the pin it reads. | current-iynk-audit.md §3.4 B-07 (M) L184 | must | e2e |
| AUD-068 | must not: a pointer-only "Button on pin 2" fixed to pin 2; the lesson's button must work from the keyboard and click, on the pin the lesson uses. | current-iynk-audit.md §3.4 B-08 (M) L185 | must | e2e |
| AUD-069 | must not: a selected part shown by its raw id ("Selected part: mcu"); the card must show the part's designator, name and role. | current-iynk-audit.md §3.4 B-09 (M) L186 | must | e2e |
| AUD-070 | must not: translation keys for "Next lesson", "Mark lesson done", "Reset view" and "Continue" with no controls behind them; the controls must exist, or the keys must be deleted. | current-iynk-audit.md §3.4 B-10 (M) L187 | must | e2e |
| AUD-071 | must not: app buttons that duplicate the figure's with different words ("Unplug USB" against "Plug USB") and an exploded view that jumps with no animation; there must be one control set, and the explode must animate. | current-iynk-audit.md §3.4 B-11 (L) L188 | must | e2e |
| AUD-072 | must not: board variants that change only the drawing (the Minima titled "Arduino Uno R4 WiFi", Pico W and Pico 2 keeping GP25 and "133 MHz", the Pi 4 keeping the Pi 5's facts); a variant must change its title, facts and lessons too. | current-iynk-audit.md §3.4 B-12 (L) L189 | must | e2e |
| AUD-073 | must not: a serial monitor with no clear, autoscroll, timestamps, baud or input line; the monitor must match the IDE's. | current-iynk-audit.md §3.4 B-13 (L) L190 | must | e2e |
| AUD-074 | must not: a micro:bit whose "LED" is only the centre pixel; the micro:bit must expose its display API across the 5 × 5 matrix. | current-iynk-audit.md §3.4 B-14 (L) L191 | must | e2e |
| AUD-075 | must not: Run disabled while a sketch runs, so editing needs Stop then Run; Run must restart the sketch. | current-iynk-audit.md §3.4 B-15 (L) L192 | must | e2e |

## AUD · Lesson content and board facts

current-iynk-audit.md §3.5 (src/lib/boards.ts and the messages that teach, E-01 to E-24).

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-076 | must not: "Y1 16.000 MHz — MCU clock" on the Uno R3; on Rev3 the HC-49 16 MHz crystal clocks the ATmega16U2 and the ATmega328P runs from a 16 MHz ceramic resonator (checked against the Rev3 schematic before the copy is written). | current-iynk-audit.md §3.5 E-02 (M) L199 | must | review |
| AUD-077 | must not: "L LED: Pin 13, through a resistor"; on Rev3 the L LED is buffered by half of the LMV358, whose other half switches the USB/VIN power MOSFET. | current-iynk-audit.md §3.5 E-03 (L) L200 | must | review |
| AUD-078 | must not: the ESP32 and NodeMCU button lesson putting the button and the LED on GPIO2 (it oscillates at rest, and GPIO2 is a strapping pin); each board must use a separate button pin (BOOT/GPIO0 or GPIO4). | current-iynk-audit.md §3.5 E-04 (H) L201; §2 #5 L94 | must | e2e |
| AUD-079 | must not: undefined LED names (LD2 on the Nucleo, matrix on the micro:bit, ACT on the Pi 5, LEDR0 on the DE10); each board's blink and button lessons must compile and run with its real API (LED_BUILTIN on PA5 for the Nucleo, the micro:bit display API, gpiozero or libgpiod on the Pi, Verilog on the FPGA). | current-iynk-audit.md §3.5 E-05 (H) L202; §2 #5 L94 | must | e2e |
| AUD-080 | must not: Arduino C lessons (setup/loop, Serial.begin) on the Raspberry Pi 5; Pi lessons must be Python (gpiozero) or C (libgpiod) with a shell model, plus a ROS 2 node lesson. | current-iynk-audit.md §3.5 E-06 (H) L203; §2 #5 L94 | must | e2e |
| AUD-081 | must not: C sketches and a 16-bit Verilog module on the DE10-Lite; its lessons must be FPGA-only, using its 10-bit SW[9:0] and LEDR[9:0], HEX0–HEX5 and KEY[1:0]. | current-iynk-audit.md §3.5 E-07 (H) L204 | must | e2e |
| AUD-082 | must not: a C sketch (Serial.println("Basys 3")) as the Basys 3's "Meet the board"; FPGA lessons must use Verilog or no sketch. | current-iynk-audit.md §3.5 E-08 (M) L205 | must | e2e |
| AUD-083 | must not: the PWM lesson on pin 9 on every board (SPI flash on the ESP32-WROOM and most ESP8266 modules) with knob/4 overflowing the ESP32's 12-bit reading; each board must use a safe PWM pin (ESP32 LEDC on GPIO25 or similar) and scale with map(). | current-iynk-audit.md §3.5 E-09 (H) L206 | must | e2e |
| AUD-084 | must not: digitalWrite(48, HIGH) to light the ESP32-S3's RGB LED; it is a WS2812 (GPIO48 on DevKitC-1 v1.0, GPIO38 on v1.1) driven with rgbLedWrite(RGB_BUILTIN, r, g, b) or neopixelWrite. | current-iynk-audit.md §3.5 E-10 (M) L207 | must | e2e |
| AUD-085 | must not: "The ADC pin only wants 0–1 V" on the NodeMCU; the bare ESP8266 TOUT takes 0–1 V, but NodeMCU boards add a 220 k / 100 k divider so A0 takes about 0–3.2 V, and both must be stated. | current-iynk-audit.md §3.5 E-11 (M) L208 | must | review |
| AUD-086 | must not: the Pico W's LED on GP25, the Pico 2 at 133 MHz and "I²C and SPI are on any pin through the PIO"; the Pico W's LED is CYW43 WL_GPIO0 (arduino-pico LED_BUILTIN = 64), the Pico 2 (RP2350) runs at 150 MHz, and hardware I²C and SPI use fixed pin sets while only PIO can use any pin. | current-iynk-audit.md §3.5 E-12 (M) L209 | must | review |
| AUD-087 | must not: placeholder sketches printing canned strings ("wifi: station idle, rssi n/a", "i2c scan: 0x68 MPU-6050 ack", "gpio: keep motors off the header"); Wi-Fi, I²C and GPIO lessons must run real code (a WiFi scan, a Wire scanner) against simulated devices. | current-iynk-audit.md §3.5 E-13 (H) L210; §2 #9 L98 | must | e2e |
| AUD-088 | must not: servo sketches without #include <Servo.h>, Servo servo; and servo.attach(9), using knob/6; servo sketches must be complete and use map(knob, 0, 1023, 0, 180). | current-iynk-audit.md §3.5 E-14 (H) L211 | must | review |
| AUD-089 | must not: a "Mini piano" that promises "Five buttons, five notes" with one button and one note; it must have five pins and five notes (the original also offers tunes, octave and note-name options). | current-iynk-audit.md §3.5 E-15 (M) L212 | must | e2e |
| AUD-090 | must not: a motor sketch driving analogWrite(5, …) with no driver pins while the text says to use a TB6612; the sketch must drive the TB6612's AIN1, AIN2, PWMA and STBY. | current-iynk-audit.md §3.5 E-16 (M) L213 | must | review |
| AUD-091 | must not: heat, plant and force lessons on the generic slider with the wrong sensor art, a soil "probe is a resistor" and a button counter as "Build a project"; the original designs must come back (capacitive soil sensor v1.2 with an SSD1306 OLED at 0x3C, the HC-SR04 parking sensor with a traffic light). | current-iynk-audit.md §3.5 E-17 (M) L214 | must | e2e |
| AUD-092 | must not: dropping the original lessons "Read a sensor" (HC-SR04 with a Car, Box, Ball or Wall at 5–50 cm, "Drive back and forth while running") and "Spin the wheel" (a 28BYJ-48 on a ULN2003 turning an 8 × 256-step prize wheel), or reusing "Spin the wheel" for a pot-to-servo lesson; both originals must be restored under their own names. | current-iynk-audit.md §3.5 E-18 (M) L215 | must | e2e |
| AUD-093 | must not: quizzes on the Uno only; every board must have its own quiz. | current-iynk-audit.md §3.5 E-19 (M) L216 | must | e2e |
| AUD-094 | must not: an LED chaser that fills with ones at 100 MHz (invisible); the chaser must rotate {led[14:0], led[15]} from 16'h0001 behind a clock divider of about 24 bits so it can be seen. | current-iynk-audit.md §3.5 E-20 (L) L217 | must | e2e |
| AUD-095 | must not: a Buttons lesson that says "two flip-flops" over a one-flip-flop sketch; the sketch must be a two-flip-flop synchroniser. | current-iynk-audit.md §3.5 E-21 (L) L218 | must | review |
| AUD-096 | must not: a "Show a number" lesson whose code is assign led = sw; it must drive a multiplexed display with the Basys 3's active-low segments and anodes. | current-iynk-audit.md §3.5 E-22 (L) L219 | must | e2e |
| AUD-097 | must not: "JTAG, not a UART MCU" for the Basys 3's FT2232; it gives JTAG and a USB-UART. | current-iynk-audit.md §3.5 E-23 (L) L220 | must | review |
| AUD-098 | must not: an incomplete non-PWM pin list on the Uno and Nano; it must list 0, 1, 2, 4, 7, 8, 12 and 13. | current-iynk-audit.md §3.5 E-24 (L) L221; §3.3 R-13 (M) L165 | must | unit |

## AUD · Robotics Lab

current-iynk-audit.md §3.6 (RoboticsLab.tsx and robotics.ts, O-01 to O-20).

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-099 | must not: an upload that works on a bare PCB ("Sketch uploaded. Pin 13 is toggling." with no parts fitted); power must need the supply parts, an upload must need a working chip ("No working chip: the upload times out"), and a good upload must show the RX/TX flicker. | current-iynk-audit.md §3.6 O-01 (H) L227 | must | e2e |
| AUD-100 | must not: cooking the chip on insertion into an unsoldered socket, then "The socket can take the chip now." with the cooked chip in it; a chip in an unsoldered socket is loose, and soldering with the chip seated is what cooks it ("Solder everything first. Never heat a chip sitting in its socket"). | current-iynk-audit.md §3.6 O-02 (M) L228 | must | e2e |
| AUD-101 | must not: an uploaded Blink that toggles once per click; once uploaded, Blink must blink on its own. | current-iynk-audit.md §3.6 O-03 (M) L229 | must | e2e |
| AUD-102 | must not: missing guard rails ("Unplug the power first: never work on a live board", "Close the exploded view first", "Low parts first…", "No SMD parts on this board…", polarity choices with faults, "Fix the fault first") and a build for the Uno only; every one of the 13 boards must have the full bench engine and build. | current-iynk-audit.md §3.6 O-04 (M) L230 | must | e2e |
| AUD-103 | must not: side effects inside a state updater (log lines pushed from setBuild, doubled under StrictMode); compute the next state, then log. | current-iynk-audit.md §3.6 O-05 (L) L231 | must | review |
| AUD-104 | must not: a reaction timer that never re-arms after a success (the LED stays on and the next press says "too soon") and waits a fixed 1200 or 900 ms; it must re-arm after each report, wait random(1000, 3000) ms and time from the press. | current-iynk-audit.md §3.6 O-06 (H) L232 | must | e2e |
| AUD-105 | must not: a reaction editor that looks editable but drops every keystroke; the editor must either take edits or be read-only with a note saying so. | current-iynk-audit.md §3.6 O-07 (M) L233 | must | e2e |
| AUD-106 | must not: a pointer-only "Stop the clock" with no pointerleave or cancel; it must work from Space and Enter as well as click, and release when the pointer leaves. | current-iynk-audit.md §3.6 O-08 (H) L234 | must | e2e |
| AUD-107 | must not: a static line follower (straight line, "Error 0. Steering 0." forever, Kp changing nothing) and a made-up sensor pattern sent to the figure; the follower must have a curved track, differential drive and PD control, with the real sensor values sent to the figure and the original QTR modes available. | current-iynk-audit.md §3.6 O-09 (H) L235; §2 #9 L98 | must | e2e |
| AUD-108 | must not: an arm with forward kinematics only, an elbow that never reaches the figure and a "−40°" elbow that is not a servo angle; the arm must do 2-link IK to a draggable target and drive two PCA9685 channels in the figure, with servo angles in their real range. | current-iynk-audit.md §3.6 O-10 (M) L236 | must | e2e |
| AUD-109 | must not: placeholder module sketches ("pca9685 0x40 ch0 pulse 1500 us", "echo pulse / 58 = cm" with delay(1) as the trigger, "qtr position -3..3", "set the pot to 5.00 V before the MCU", "L298 drop ~2V"); each module must run real code (Adafruit_PWMServoDriver over Wire, pulseIn, a QTR read, an ADC readback) against a simulated device. | current-iynk-audit.md §3.6 O-11 (H) L237; §2 #9 L98 | must | e2e |
| AUD-110 | must not: an MPU-6050 sketch that fails to compile ("Unexpected identifier 'angle'") and uses constants instead of readings; it must compile and read a simulated gyro with bias and an accelerometer with noise. | current-iynk-audit.md §3.6 O-12 (H) L238 | must | e2e |
| AUD-111 | must not: module pages with constant readAnalog 400 and readDigital 0 and no controls; each module must offer the original's runnable modes (TB6612 Forward 50%, Forward 100%, Reverse, Brake, Coast; L298N Forward, Reverse, Spin on the spot, Brake; A4988 Full step, 1/16 microstep, Set current limit, Unplug motor (live!); PCA9685 Sweep, Center 90, Arm wave; MPU-6050 Raw gyro (drift), Accelerometer only (noisy), Complementary filter; HC-SR04 Object at 10/25/50 cm, Soft target (fails); QTR's four modes; LM2596 Set 5.0 V, Set 3.3 V, Set 12 V (impossible), Motor stall). | current-iynk-audit.md §3.6 O-13 (M) L239 | must | e2e |
| AUD-112 | must not: a logic-rail current that rises with motor duty under a sentence saying motor current stays on VM, shown on every module page; the logic rail must stay constant and the VM current come from a motor model, on the pages where it applies. | current-iynk-audit.md §3.6 O-14 (M) L240 | must | e2e |
| AUD-113 | must not: missing robotics figures (the LED + resistor trainer, the transistor switch, the ESP32-S3 DevKitC-1 and the Raspberry Pi 5 as ROS 2 brain linked away to the Board Lab) and a lede counting "three practice tasks" over four; all 13 figures must be in the Robotics Lab, and every count must match what is listed. | current-iynk-audit.md §3.6 O-15 (M) L241 | must | e2e |
| AUD-114 | must not: one quiz per module and no practice projects; the original's 39 questions (2–4 per figure, numeric ones included) and every practice task must be in the Robotics Lab. | current-iynk-audit.md §3.6 O-16 (M) L242 | must | e2e |
| AUD-115 | must not: "Vref times a factor printed on the silkscreen is the current" for the A4988; I_max = Vref / (8 × R_cs), so with 0.068 Ω a 1.0 A limit needs Vref ≈ 0.54 V. | current-iynk-audit.md §3.6 O-17 (L) L243 | must | review |
| AUD-116 | must not: "A 6 V motor on an L298N barely turns on a 7.4 V pack"; with about 1.8–3.2 V dropped at 1 A it sees roughly 4.2–5.6 V and turns, more slowly. | current-iynk-audit.md §3.6 O-18 (L) L244 | must | review |
| AUD-117 | must not: a TB6612 sketch that never drives AIN2 and relies on the internal pull-down; it must write AIN2 LOW. | current-iynk-audit.md §3.6 O-19 (L) L245 | must | review |
| AUD-118 | must not: robotics progress that is never recorded (only quiz ticks) and a header counter that ignores robotics; each robotics page must record progress, and the counter must include it. | current-iynk-audit.md §3.6 O-20 (L) L246 | must | e2e |

## AUD · Drone Lab and calculator

current-iynk-audit.md §3.7 (DroneLab.tsx and drones.ts, DR-01 to DR-17).

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-119 | must not: a fixed 46 g added to every airframe (the Crazyflie at 66 g and T:W 0.7 while its quiz says 27 g); every craft must carry its own fixed-parts list (id, name, grams, price, Electrical or Mechanical). | current-iynk-audit.md §3.7 DR-01 (H) L252; §2 #7 L96 | must | unit |
| AUD-120 | must not: hover throttle = clamp(8, 92, round(350 / TW)); hover throttle must be sqrt(AUW / (n × thrust)), about 49% at 4.2:1. | current-iynk-audit.md §3.7 DR-02 (H) L253; §2 #7 L96 | must | unit |
| AUD-121 | must not: battery cells and motor KV that are filled in but never read; voltage must be cells × 3.7, krpm KV × V / 1000 and thrust 1.06 × pf × krpm² g per motor. | current-iynk-audit.md §3.7 DR-03 (H) L254; §3.13 HY-02 (L) L340 | must | unit |
| AUD-122 | must not: a hover current that is a per-motor constant independent of AUW and voltage; hover power must be AUW / (5.4 g/W × eff), hover current hoverW / V, hover time mAh / 1000 × 0.8 / hoverA × 60, aggressive time hoverMin × 0.42 and max current n × thrust / (2 × eff) / V. | current-iynk-audit.md §3.7 DR-04 (H) L255 | must | unit |
| AUD-123 | must not: the flying wing run through multirotor maths ("Hover throttle 92%", "may not climb" at T:W 1.7); the wing must have its own model (wing loading, stall speed, cruise current). | current-iynk-audit.md §3.7 DR-05 (H) L256 | must | unit |
| AUD-124 | must not: "Parts match." printed with no compatibility checks; the calculator must warn on over-spin (KV × cells above 1750 × 6 × 1.15: "Desync! … the ESC lost a motor"), on T:W below the class minimum and on an under-rated ESC. | current-iynk-audit.md §3.7 DR-06 (M) L257 | must | unit |
| AUD-125 | must not: the agricultural craft as a quad with a 12S 16000 mAh pack weighing 2200 g, no tank liquid and a delivery quad carrying no parcel mass; the agricultural craft must be the original's hexacopter on 12S 22000 mAh with a realistic pack weight (a 12S 16 Ah LiPo is roughly 4–5 kg), and payloads must be selectable. | current-iynk-audit.md §3.7 DR-07 (M) L258 | must | unit |
| AUD-126 | must not: invalid CLI snippets (set mini_quad = ON in Betaflight, FRAME_CLASS 2 on ArduPlane, write as a MAVProxy command, GPS_TYPE where newer ArduPilot uses GPS1_TYPE, the Crazyflie's cflib under a "Betaflight CLI" heading); every snippet must be valid for its firmware, with INAV for the wing and cflib for the Crazyflie under their own headings. | current-iynk-audit.md §3.7 DR-08 (M) L259 | must | review |
| AUD-127 | must not: one wiring list for every craft (a 4-in-1 ESC on the wing and the brushed Crazyflie, a camera and VTX on the Crazyflie, no GPS, compass, gripper, pump or servos), in English only; each craft's wiring must come from its own data and be translated. | current-iynk-audit.md §3.7 DR-09 (M) L260 | must | e2e |
| AUD-128 | must not: a motor-direction test that passes with three parts and no ESC, FC or battery; the test must need its parts ("Wire the motors and mount the flight controller first", "Plug in a battery (USB alone can't spin motors)"), show each motor's CW/CCW, include a wrong-motor fault and be fixed by swapping two wires. | current-iynk-audit.md §3.7 DR-10 (H) L261 | must | e2e |
| AUD-129 | must not: an accelerometer calibration that passes with no FC and never fails; it must need the FC, fail when the craft is not level, and block arming until done. | current-iynk-audit.md §3.7 DR-11 (M) L262 | must | e2e |
| AUD-130 | must not: a smoke stopper with no polar parts (the XT60 "reversed" only a toggle); the test must include the original's fault, the capacitor in backwards ("The smoke stopper lamp lit up… The cap is in backwards"), with right and wrong orientation choices. | current-iynk-audit.md §3.7 DR-12 (M) L263 | must | e2e |
| AUD-131 | must not: arming and flying with nothing built, props off, a failed smoke test or no calibration; arming must be blocked as in the original ("Arming blocked: ACC not calibrated", "Arming blocked: throttle not at zero", "Finish building it first", "Props go on LAST…"), and a reversed FC, props on the wrong motors or an unchecked motor direction must flip the craft on take-off. | current-iynk-audit.md §3.7 DR-13 (H) L264; §2 #8 L97 | must | e2e |
| AUD-132 | must not: build steps shown as raw ids ("frame", "esc", "xt60"), untranslated and settable in any order, and a "Props on/off" button labelled with its state; build steps must have human labels per craft and order rules, and buttons must name their action. | current-iynk-audit.md §3.7 DR-14 (M) L265 | must | e2e |
| AUD-133 | must not: a constant bench price that ignores the picks; the price must be computed from the chosen parts and split into Electrical and Mechanical. | current-iynk-audit.md §3.7 DR-15 (M) L266 | must | unit |
| AUD-134 | must not: toggling the wiring sheet by changing the iframe src (a full reload that loses the rotation); the sheet must switch by patch. | current-iynk-audit.md §3.7 DR-16 (L) L267 | must | e2e |
| AUD-135 | must not: 10 of the original 13 crafts (no VTOL tiltrotor, tricopter or heavy-lift octocopter), three quizzes per craft of which two are generic, no per-craft flight modes and no extra tests; all 13 crafts must be present with four quizzes of their own, their flight modes (GPS rescue, Loiter, RTL, auto missions, spray mission, swarm formation, figure-8, motor-failure test, VTOL transition) and their extra tests (Check elevons, Tilt servo test, Servo test). | current-iynk-audit.md §3.7 DR-17 (M) L268 | must | e2e |

## AUD · Flight simulator

current-iynk-audit.md §3.8 (FlightSim.tsx, FS-01 to FS-09).

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-136 | must not: forward pitch (Arrow-Up) moving the craft backwards; forward pitch must move it along its nose. | current-iynk-audit.md §3.8 FS-01 (H) L274; §2 #8 L97 | must | e2e |
| AUD-137 | must not: a window-level key handler that swallows Space, the arrows and WASD on the whole drone page (Space cannot press a focused button and silently toggles arming; arrows cannot scroll); the sim must take keys only while it has focus. | current-iynk-audit.md §3.8 FS-02 (H) L275; §3.10 A-02 (H) L301; §2 #8 L97 | must | e2e |
| AUD-138 | must not: toggles (Space, V, Q, R) polled once a frame so a quick tap is lost; toggles must act on the keydown event. | current-iynk-audit.md §3.8 FS-03 (M) L276 | must | e2e |
| AUD-139 | must not: a fixed hover throttle (0.28 quad, 0.35 wing) whatever the calculator says, and a wing that can hover and stop in mid-air; thrust and mass must come from the calculator, and the wing must stall without airspeed. | current-iynk-audit.md §3.8 FS-04 (H) L277 | must | e2e |
| AUD-140 | must not: a sim with no crash, ground contact, ceiling, field bounds, battery drain or sag, wind, lap timer or best lap and only angle and acro; the original's flight model must be ported (altitude hold, angle, acro, race and the per-craft modes). | current-iynk-audit.md §3.8 FS-05 (M) L278 | must | e2e |
| AUD-141 | must not: an FPV view that is a tilted horizon and a box with "ARMED angle alt 11.6 laps 0" (no units) as its only text; FPV must show the gates and obstacles and the original's OSD (ALT x m, CP/GATE n/N, CRASHED, DISARMED, LOW BATTERY, HOME, a timer). | current-iynk-audit.md §3.8 FS-06 (M) L279 | must | e2e |
| AUD-142 | must not: on-screen sticks without V, Q or R, made of digital buttons that stay held when a finger slides off; touch controls must include FPV, mode and reset, use virtual sticks and release on pointer leave. | current-iynk-audit.md §3.8 FS-07 (M) L280; §3.11 MB-04 (M) L319 | must | e2e |
| AUD-143 | must not: five fixed rectangles as gates on one field for every craft, with laps counted but nothing timed; each craft must fly its own range, with timed laps. | current-iynk-audit.md §3.8 FS-08 (L) L281 | must | e2e |
| AUD-144 | must not: re-rendering the whole drone view on every frame's attitude callback; the sim must send only what the figure needs, at a lower rate. | current-iynk-audit.md §3.8 FS-09 (L) L282; §3.13 PF-01 (M) L335 | must | e2e |

## AUD · Languages

current-iynk-audit.md §3.9 (I-01 to I-07) and §8.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-145 | must not: about 170 visible strings left in English in every other language (failure buttons and messages, "Button on pin 2", "Analog A0", part roles, facts, robotics cards, the Uno build, the reaction, line and arm copy, the drone page, home cards, "Skip to content", "Fig."); every visible string must come from the dictionaries. | current-iynk-audit.md §3.9 I-01 (H) L288; §8; §2 #10 L99 | must | e2e |
| AUD-146 | must not: a figure UI that is always English (Plug USB, Reset, Blink, Exploded, STATUS, READY, PIN 13, See-through, Labels, Hand-drawn wobble, Colour, callouts, flash messages); the language must reach the figure and its UI must be translated. | current-iynk-audit.md §3.9 I-02 (H) L289 | must | e2e |
| AUD-147 | must not: translations that drop content (the MPU-6050 filter formula missing in es/fr/de/hi, the TB6612 "a 6 V motor still sees almost 6 V" sentence, the PCA9685 servo-current warning, the last sentences of the I²C, Verilog, GPIO and LM2596 bodies); each translation must carry all of the English content. | current-iynk-audit.md §3.9 I-03 (M) L290 | must | review |
| AUD-148 | must not: languages with no locale URLs (not shareable or indexable) and no browser-language detection; each of the six locales (en, es, fr, de, zh, hi) must have its own prerendered /{lang}/ URL, / must redirect by the iynk-lang cookie, then Accept-Language, then /en, and strings with live values must use {placeholder} templates. | current-iynk-audit.md §3.9 I-04 (M) L291; BASE_ARCHITECTURE.md D1, D2 | must | e2e |
| AUD-149 | must not: a language picker showing codes ("en", "es") with no lang on its options; it must show each language's native name with its lang attribute. | current-iynk-audit.md §3.9 I-05 (L) L292 | must | e2e |
| AUD-150 | must not: German "Start" for both home and run; run must be "Ausführen". | current-iynk-audit.md §3.9 I-06 (L) L293 | must | review |
| AUD-151 | must not: English-only types for board facts and part roles; every taught string's type must allow translation. | current-iynk-audit.md §3.9 I-07 (L) L294 | must | review |

## AUD · Accessibility

current-iynk-audit.md §3.10 (A-01 to A-11).

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-152 | must not: pointer-only controls (Button on pin 2, Stop the clock, every stick button); each must work from Space and Enter, down and up. | current-iynk-audit.md §3.10 A-01 (H) L300 | must | e2e |
| AUD-153 | must not: quiz feedback shown only by colour, with no "Correct" or "Not quite" text and no live region; feedback must use words and an icon, be announced in a live region, and meet 4.5:1 contrast in both themes (the current .bad and .good tokens reach 3.81–4.38:1). | current-iynk-audit.md §3.10 A-03 (M) L302 | must | e2e |
| AUD-154 | must not: transparent buttons and selects with a 16% ink border (1.37:1 light, 1.53:1 dark); control boundaries must reach 3:1 (WCAG 1.4.11). | current-iynk-audit.md §3.10 A-04 (M) L303 | must | screenshot |
| AUD-155 | must not: a 12 px mint "Done" marker at 3.4:1 (2.29:1 dark) and a white-on-mint Running pill at 4.31:1; text markers must reach 4.5:1. | current-iynk-audit.md §3.10 A-05 (M) L304 | must | screenshot |
| AUD-156 | must not: figure parts that cannot be focused (0 of 14 clickable parts have a tabindex); every clickable part must be focusable with a button role and work with Enter and Space. | current-iynk-audit.md §3.10 A-06 (M) L305 | must | e2e |
| AUD-157 | must not: a serial log that is an aria-live region rewritten on every line, flooding screen readers; announcements must be throttled or on demand. | current-iynk-audit.md §3.10 A-07 (M) L306 | must | e2e |
| AUD-158 | must not: a progress count ("0/71") labelled only by an aria-label on a span; the counter must have a visible label. | current-iynk-audit.md §3.10 A-08 (L) L307 | must | e2e |
| AUD-159 | must not: a theme toggle that changes its label and its aria-pressed together; it must keep a constant label with aria-pressed. | current-iynk-audit.md §3.10 A-09 (L) L308 | must | e2e |
| AUD-160 | must not: ignoring prefers-reduced-motion; the app and the figures must honour it and offer a Reduce motion setting, as the original did. | current-iynk-audit.md §3.10 A-10 (L) L309 | must | e2e |
| AUD-161 | must not: canvases with only an aria-label; the flight sim and the line follower must give a text readout (altitude, armed state, error). | current-iynk-audit.md §3.10 A-11 (L) L310 | must | e2e |

## AUD · Mobile and dark mode

current-iynk-audit.md §3.11 (MB-01 to MB-05) and §3.12 (DK-01 to DK-04).

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-162 | must not: a code editor with white-space: pre and no overflow that widens the phone's layout viewport to 485 px; long lines must scroll inside the editor and the page must never scroll sideways. | current-iynk-audit.md §3.11 MB-01 (M) L316; §2 #10 L99 | must | e2e |
| AUD-163 | must not: a highlighted pre and a transparent textarea that scroll separately so the caret drifts off the text; the two must scroll together, or a real editor component must be used. | current-iynk-audit.md §3.11 MB-02 (M) L317 | must | e2e |
| AUD-164 | must not: a phone figure about 190 px wide inside a 589 px frame crowded by the figure's own buttons and stats plus a second app control row; the embedded figure must hide its chrome and give the object the frame, and dragging the object must turn it. | current-iynk-audit.md §3.11 MB-03 (M) L318; §3.11 MB-05 (L) L320; §3.2 F-16 (M) L139 | must | e2e |
| AUD-165 | must not: a bright #f4efe4 figure panel on the dark theme; the theme must reach the figure, which must have a dark paper variant. | current-iynk-audit.md §3.12 DK-01 (M) L326 | must | screenshot |
| AUD-166 | must not: the arm's shoulder link drawn #231e16 on the #1d1a16 dark card (1.05:1, invisible); drawn ink must use the theme's ink token. | current-iynk-audit.md §3.12 DK-02 (M) L327 | must | screenshot |
| AUD-167 | must not: canvas colours hardcoded for the light theme; canvases must use a theme-aware palette. | current-iynk-audit.md §3.12 DK-03 (L) L328 | must | screenshot |
| AUD-168 | must not: accent tokens (good, bad, mint, tomato, mustard, cobalt) with no dark values; each must have a dark variant that keeps its contrast. | current-iynk-audit.md §3.12 DK-04 (L) L329 | must | screenshot |

## AUD · Performance, progress and hygiene

current-iynk-audit.md §3.13 (PF, PG and HY).

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-169 | must not: a frame rate that falls from 117 to 90 fps while armed under a 4× CPU throttle because every patch rebuilds the figure; patches must be diffed and limited to one per animation frame. | current-iynk-audit.md §3.13 PF-01 (M) L335; §3.1 P-03 (M) L113 | must | e2e |
| AUD-170 | must not: one state update, two posts and a full figure rebuild per digitalWrite (the A4988's STEP toggles every 2 ms); pin updates must be batched per frame. | current-iynk-audit.md §3.13 PF-02 (L) L336 | must | unit |
| AUD-171 | must not: one header counter that adds drone quizzes to the board-lesson total ("2/71" with no lessons done), can exceed its total and never counts robotics; each module must have its own counter. | current-iynk-audit.md §3.13 PG-01 (M) L337 | must | e2e |
| AUD-172 | must not: progress with no reset, no cross-tab sync and unguarded writes; there must be a "Reset progress" control, tabs must sync through the storage event, and writes must be guarded. | current-iynk-audit.md §3.13 PG-02 (L) L338 | must | e2e |
| AUD-173 | must not: unused UI keys (10 of 39: home, reset, theme, next, powered, draw, mark, open, sensors, continue); every key must be used or deleted. | current-iynk-audit.md §3.13 HY-01 (L) L339 | must | review |
| AUD-174 | must not: figure messages (power, usb, led, fault, name) that the app receives and never uses; each must be used or dropped. | current-iynk-audit.md §3.13 HY-03 (L) L341 | must | review |
| AUD-175 | must not: section headings at body size and fact lists with no bullets ("Break it on purpose", "Parts" and "Check yourself" reading as body text); headings must have a scale and lists their markers. | current-iynk-audit.md §3.13 HY-04 (L) L342 | must | screenshot |
| AUD-176 | must not: a README that claims broken or partial features (schematic and breadboard views, failure buttons that change the figure, a labelled wiring sheet); the README must describe what actually ships. | current-iynk-audit.md §3.13 HY-05 (L) L343; SPEC.md L130 | must | review |

## AUD · Coverage, crawl and interaction findings

current-iynk-audit.md §4 to §6: rows marked missing or broken that no defect ID above already covers.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-177 | must not: a release where npm run build, npx tsc --noEmit or npx eslint . --quiet reports an error (all three are clean at 245763f and must stay clean). | current-iynk-audit.md §1 L32-82; §4.1 #2 L356; SPEC.md L7 | must | e2e |
| AUD-178 | must not: errors on interaction; no route may log a console or page error, and no figure may record data-errors, during the full e2e run (loading, every lesson, every sheet, every failure, flight). | current-iynk-audit.md §4.1 #3 L357; §5 L437; §1 L84 | must | e2e |
| AUD-179 | must not: NaN, undefined or Infinity anywhere in figure geometry. | current-iynk-audit.md §5 L437 | must | e2e |
| AUD-180 | must not: a Board Lab Uno with no barrel supply; it must run from USB or a 7–12 V barrel, the USB path through the polyfuse and the barrel path through the reverse-protection diode and the regulator. | current-iynk-audit.md §4.2 #24 L383; §3.5 E-01 (H) L198 | must | e2e |
| AUD-181 | must not: failures that leak into each other ("Cold solder on the LED" then Run answering "USB is unplugged." because the earlier barrel fault left USB off); each failure must be independent, and clearing it must restore exactly what it broke. | current-iynk-audit.md §6.2 L489 | must | e2e |
| AUD-182 | must not: per-board fact lists in place of the original's per-lesson pinout and specification tables; every lesson must carry its pinout and spec table. | current-iynk-audit.md §4.2 #34 L393; §9 L586 | must | e2e |
| AUD-183 | must not: missing the original's view settings; Callout labels, Current flow, Floor grid, Turntable, Sound, Reduce motion and Reset progress must all be offered. | current-iynk-audit.md §4.2 #35 L394; §9 L587 | must | e2e |
| AUD-184 | must not: a flat card grid as the robotics home; boards must be grouped as Start here, Month 1 · electronics, Month 2 · microcontrollers, Month 3 · motors + drivers, Month 4 · sensors and Power + the ROS 2 brain. | current-iynk-audit.md §4.3 #45 L409 | must | e2e |

## AUD · Figure fidelity

current-iynk-audit.md §7: what each board and drone must look like, beyond the F- defects.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-185 | must not: an Uno R3 without its ICSP headers; both 2 × 3 ICSP headers must be drawn. | current-iynk-audit.md §7 L539 | must | screenshot |
| AUD-186 | must not: a yellow Nucleo with one morpho row and no buttons or Arduino headers; the Nucleo must be white with its ST-LINK section, both morpho rows, its user and reset buttons and the Arduino headers. | current-iynk-audit.md §7 L547 | must | screenshot |
| AUD-187 | must not: a yellow micro:bit; the micro:bit must be black with its 5 × 5 LED matrix, A and B buttons and the edge connector's five ring pads visible from the front. | current-iynk-audit.md §7 L548 | must | screenshot |
| AUD-188 | must not: the 5-inch freestyle, the racer, the 7-inch and the GPS quad drawn nearly the same; each must show its own frame, arm length, prop size and parts. | current-iynk-audit.md §7 L553 | must | screenshot |
| AUD-189 | must not: the tiny whoop and the cinewhoop carrying a 5-inch's part set; each must carry its own parts inside its ducts. | current-iynk-audit.md §7 L554 | must | screenshot |
| AUD-190 | must not: a delivery craft with no legs and no gripper; it must have landing legs and its gripper. | current-iynk-audit.md §7 L555 | must | screenshot |
| AUD-191 | must not: figures that do not look like their real objects (at 245763f only 4 of 12 boards and 3 of 10 drones are recognisable); every board and drone must pass a side-by-side check against a photo of the real one. | current-iynk-audit.md §4.1 #10 L364; §7 L537-558 | must | screenshot |

## AUD · Gap list against the three originals

current-iynk-audit.md §9: each bullet is a gap the rebuild must close; the LA, RBA and RBB items above (and part B for drones) hold the detail.

| id | statement | source | priority | verify |
|---|---|---|---|---|
| AUD-192 | must not: shipping without Learn Arduino's per-lesson parameter controls that regenerate the code (Blink On for, Off for and Resistance; Button Hold/Toggle; RGB presets and channels; Light lamp distance, lamp on and Dark below; Sound tune, note length and volume; Piano self-play, octave and note names; Motor top speed and ramp; Heat hairdryer distance, fan threshold, fan speed and on/off or ramp; Servo from, to and step delay; Stepper speed, acceleration, whole turns and direction; Plant thresholds, readings and light; Force pull-down, weight, bell threshold and hold; Project green and red distances). | current-iynk-audit.md §9 L585 | must | review |
| AUD-193 | must not: shipping without Learn Arduino's HC-SR04 and stepper lessons, the parking-sensor project, the OLED, the fan, buzzer audio, the per-lesson specs and pinout tables, callouts and the 3D stage. | current-iynk-audit.md §9 L586 | must | review |
| AUD-194 | must not: shipping without Learn Arduino's settings and panels (Callout labels, Current flow, Floor grid, Turntable, Sound, Reduce motion, Reset progress; the Components panel; part popovers with "Zoom to it" and "Hold it down in the scene"; the schematic overlay; collapsible code; the Uploading, Running and Stopped states). | current-iynk-audit.md §9 L587 | must | review |
| AUD-195 | must not: shipping any of the six locales (en, es, fr, de, zh, hi) incomplete, with placeholder text or without prerendered pages; Learn Arduino's seven other languages and its right-to-left Hebrew are out of scope by decision D1. | current-iynk-audit.md §9 L588; §3.9 I-04 (M) L291; BASE_ARCHITECTURE.md D1 | must | review |
| AUD-196 | must not: shipping without Robotics Bench's 13 figures, each with the build engine (height groups 0–3, polarity options, needs/run checks, pop/hot/dark faults, reflow, solder, upload with byte count and RX/TX flicker, guard rails), runnable modes with their serial output, 2–4 quiz questions, a practice project and the month-by-month groups. | current-iynk-audit.md §9 L591 | must | review |
| AUD-197 | must not: shipping without the Drone Lab's 13 crafts and its physical calculator (the DR-03 and DR-04 formulas) with over-spin and T:W warnings and the Electrical/Mechanical cost split. | current-iynk-audit.md §9 L594 | must | review |
| AUD-198 | must not: shipping without the Drone Lab's bench of real mistakes (polarity, wrong motor, FC orientation) with gated tests, wind, per-craft physics (wing, VTOL, tricopter, whoop, Crazyflie), flying ranges with obstacles, checkpoints and collisions, FPV with an OSD, lap and best-lap times, and crash, out-of-field, battery-empty and desync endings. | current-iynk-audit.md §9 L595 | must | review |
| AUD-199 | must not: shipping without the Drone Lab's per-craft modes and CLI and log styles (Betaflight, ArduPilot, INAV, cflib) and its four quizzes per craft. | current-iynk-audit.md §9 L596 | must | review |

## Gaps, conflicts and open questions

None of the items below has a source that settles it, so they are not rows yet (or a row exists but cannot be
checked until the decision is made). Each one needs a decision in `docs/DECISIONS.md`, or a fact sheet in
`docs/facts/`, before the phase that builds it. Once decided, it becomes a row in this list. Gap ids start with GA
so they never clash with part B's G ids.

### Brief needs that no part-A source settles

| gap | brief | what the sources say | decision needed |
|---|---|---|---|
| GA01 · The eleven boards after the Uno R3 | SPEC.md L71-83, L85-94 | Learn Arduino covers only the Uno R3 (learn-arduino.md §10 L1314). The Robotics Bench adds an ESP32-S3-DevKitC-1 (Fig. 04), a Nano behind a buck (Fig. 12) and a Raspberry Pi 5 (Fig. 13), and none of them has lessons. No part-A source gives the pinout, parts, assembly sequence, lessons, sensors or failure behaviour of the Uno R4, Nano, ESP32 DevKitC, NodeMCU, Pico family, Nucleo-F401RE, micro:bit V2, Pi 4/5, Basys 3 or DE10-Lite. The SPEC Board Lab rows only hold the brief's level. | One fact sheet per board in `docs/facts/<id>.md` (three exist so far: basys3, esp32-devkitc, microbit-v2) and a per-board checklist built from them before the boards are signed off. |
| GA02 · Verilog on the FPGA boards | SPEC.md L82-83, L96 | No original runs Verilog, and no part-A source covers it. | The Verilog subset, its parameter overrides and the Basys 3 and DE10-Lite lessons (switch-to-LED mapping, LED chaser, 7-segment) need their own rows and golden runs. |
| GA03 · MicroPython, Python and ROS 2 code | SPEC.md L88 | Learn Arduino's code is read-only C++ (learn-arduino.md §4.3 L1070; §10 L1311). Fig. 13 shows ROS 2 commands and rclpy text but runs nothing (robotics-bench-b.md §8.5 L1272-1288). No source covers a Python interpreter or the gpiozero and rclpy shims. | The Python subset, its board shims and the Pico, micro:bit and Pi lessons need their own rows and golden runs. |
| GA04 · The brief's four failures on every board | SPEC.md L92 | Learn Arduino has no failure modes at all (learn-arduino.md §10 L1313). The Robotics Bench has reversed parts, unsoldered joints and a brown-out on its own figures only (robotics-bench-a.md §2.9 L456-469; robotics-bench-b.md §7 L1005-1180). No source says what reverse polarity, brown-out, wrong voltage or a cold joint does on the other boards. | Per board, which inputs are protected (barrel-jack diode, polyfuse, regulator limits, 3.3 V-only pins) and what each failure looks like, taken from that board's fact sheet and datasheet. |
| GA05 · See-through, rotation and exploded view on the robotics figures | SPEC.md L21-24 | The Robotics Bench has no see-through, no rotation, no zoom and no drag (robotics-bench-a.md §0 L25-28). The only hint at what to show inside is §11 L1404-1405 (die and bond wires in DIP and QFP, the H-bridge inside the TB6612 and L298N, the transistor junction). | An inside-parts list per robotics figure, in that figure's prompt file. |
| GA06 · Which steps are "major" for the quizzes | SPEC.md L105 | The Robotics Bench has one quiz per figure, open from the start (robotics-bench-a.md §2.16 L535). Learn Arduino has no quiz (learn-arduino.md §10 L1312). No source says which build steps count as major, or what the Board Lab lessons ask. | The quiz points per bench and per board, and their questions, before the quiz rows can be checked. |
| GA07 · Practice tasks as checkable exercises | SPEC.md L53, L103 | The original practice tasks are text cards only (robotics-bench-b.md §9 L1396-1415): reaction timer, line follower, arm and the rest. No source gives a pass condition. | For each task, the inputs, the virtual-time run and the pass condition, so that the check is a pure function of the run (decision D14 c). |
| GA08 · Live current draw on every bench | SPEC.md L104 | Some benches compute currents in their stats and serial lines, but no source defines one current-draw readout for every bench, or the budget it is compared with. | What the current panel sums on each bench and which limit it warns against (USB 500 mA, the regulator, the driver). |
| GA09 · Sensors and actuators to wire in | SPEC.md L91 | Learn Arduino has fixed circuits per lesson and no free build (learn-arduino.md §10 L1314). No source lists which modules each board can take. | The module list per board, and whether wiring is free or per lesson. |
| GA10 · Dark mode outside the figures | SPEC.md L66 | Learn Arduino has no dark mode (learn-arduino.md §10 L1315), and the Robotics Bench research describes none. The paper-plate rule covers the figure only (part B, CF rows). | The dark tokens for the host panels, code editor, serial monitor and schematic. |
| GA11 · The home dashboard | SPEC.md L66, L94, L134 | No original has a dashboard, and no part-A source says what it counts. Decision D7 gives the store and the "done/total" form. | The total per board, bench and craft (lessons, assembly, steps, tasks, quizzes), so every count is reproducible. |
| GA12 · Failures the originals only describe | SPEC.md L92, L102 | The Robotics Bench describes, but never simulates, A4988 overheating without a heatsink, skipped steps at low current, a missing input capacitor on the buck and SD corruption on the Pi (robotics-bench-b.md §10 #11 L1434-1436). The RBB rows keep them as should. | Which of them become simulated failures (seed decision S7 asks for every designed failure to be reachable). |

### Conflicts between the sources and the fixed decisions

| conflict | sources | how the rows read now | decision needed |
|---|---|---|---|
| GA13 · Thirteen languages or six | learn-arduino.md §6 L1234-1241; current-iynk-audit.md §3.9 I-04 L291, §9 L588; BASE_ARCHITECTURE.md D1 | Learn Arduino ships 13 languages with right-to-left Hebrew, and the audit asks iynk to match it. Decision D1 fixes six locales (en, es, fr, de, zh, hi). The rows follow D1: Hebrew, right-to-left layout and the Korean date form are dropped. | Record the exception in `docs/DECISIONS.md`, as SPEC.md L153 requires. |
| GA14 · English at the root URL | learn-arduino.md §6 L1235-1236; BASE_ARCHITECTURE.md D2 | Learn Arduino serves English at the root and redirects on navigator.languages. D2 puts every locale under /{lang}/ and redirects / by the iynk-lang cookie, then Accept-Language, then /en. The rows follow D2. | None beyond recording it. |
| GA15 · What the store keeps | learn-arduino.md §7 L1252-1253; robotics-bench-a.md §2.16 L540; BASE_ARCHITECTURE.md D7 | Learn Arduino saves every lesson's parameter values and the floor grid, turntable, current flow and schematic settings. The Robotics Bench rows ask for saved quiz answers. D7's "iynk:v1" holds only done, quiz scores, best and five settings (theme, sound, lofi, labels, reduceMotion). The rows keep the originals' must. | Extend the D7 shape (for example a per-lesson params map and the four view settings) or record that they are not saved, before the store ships. |
| GA16 · When a lesson counts as done | learn-arduino.md §7 L1251; BASE_ARCHITECTURE.md D14 | Learn Arduino marks a lesson done on its first upload. D14 c asks lesson checks to be pure functions of a deterministic run. The row keeps "first upload completes". | Keep it, or require the run to meet the lesson's goal. |
| GA17 · Lesson links | learn-arduino.md §7 L1255; robotics-bench-a.md §2.18 L605; BASE_ARCHITECTURE.md D2, D14 | Learn Arduino names the lesson in the hash. D2 gives each lesson a route. The Robotics Bench's ?mode= start-up hook stays a query read on the client, so pages stay static. | None beyond recording it. |
| GA18 · The ESP32-S3 board revision | robotics-bench-a.md §6 L1016, §10 #20 L1395; current-iynk-audit.md §3.5 E-10 L207 | The original models the RGB LED on GPIO48 (DevKitC-1 v1.0). The orchestrator's seed decision S13 picks v1.1, whose RGB LED is on GPIO38, and the Fig. 04 rows follow it. BASE_ARCHITECTURE.md does not record S13. | Record S13 in `docs/DECISIONS.md` so every ESP32-S3 figure, sketch and lesson uses GPIO38. |

### Choices the rows leave open

| choice | sources | what is open |
|---|---|---|
| GA19 · The ADC divisor | learn-arduino.md §9.2 #9 L1302 | The rows require one conversion everywhere, /1024 or /1023, and a sentence saying which. Pick one. |
| GA20 · The 28BYJ-48 steps per turn | learn-arduino.md §9.2 #4 L1297 | The real gearbox is about 63.68 : 1 (about 2037.9 full steps per turn), not 2048. The rows allow either the real figure or 2048 with a note that it drifts about 10 steps a turn. Pick one for lesson 13. |
| GA21 · The brief's Blink | SPEC.md L37-39; learn-arduino.md §9.2 #6 L1299 | The brief's own Blink never writes LOW, so the LED only turns on. The rows show it as given and explain why it stays lit. Confirm that this reading of the brief is wanted. |
| GA22 · The lofi chord | robotics-bench-a.md §10 #13 L1387 | The original's "Am9" is voiced as an Am7 (no B). Add the B or call it Am7. |
| GA23 · The Fig. 12 stall model | robotics-bench-b.md §7 L1172-1177 | The original's stall maths does not match its own 2 Ω motor, and the LM2596's real switch limit is about 4.5 A typical (3.6 A minimum) rather than 3.0 A. A stock Nano's brown-out detector trips at 2.7 V, so the original's "reset below 4.3 V" is really the edge of the 16 MHz safe operating area (about 3.8 V): say it that way, or model the 4.3 V BOD option. The corrected model changes the golden values, which must go into `docs/DECISIONS.md`. |
| GA24 · The ROS 2 release to start on | robotics-bench-b.md §8.9 L1366-1368 | The Fig. 13 quiz answers Jazzy, the May 2024 LTS. ROS 2 ships a new LTS every other May, so a 2026 LTS should exist by now. Check the current LTS before shipping and update the quiz and its explanation if needed. |
| GA25 · The audit's scope | current-iynk-audit.md §1 L23 | The audit was written without the brief, so its coverage matrix used the README and the task text. The SPEC rows here check the brief directly; where an AUD row and a SPEC row differ, the SPEC row wins. |
