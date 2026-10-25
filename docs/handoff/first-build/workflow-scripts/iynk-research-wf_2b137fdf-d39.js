export const meta = {
  name: 'iynk-research',
  description: 'Deep inventory of the three original sites, the current iynk, and the Colorfigures engine',
  phases: [
    { title: 'Research', detail: 'one agent per original-site slice, plus current-iynk audit and Colorfigures guide' },
  ],
}

const ROOT = args.root
const SP = args.scratch
const ORIG = SP + '/orig'
const DOCS = ROOT + '/docs/research'

const COMMON = `
Context: We are rebuilding "iynk", one Next.js (App Router) app with three modules: Board Lab, Robotics Lab, Drone Lab.
It must be strictly better than three original websites combined. Visuals are built with the Colorfigures skill
(~/.claude/skills/colorfigures: hand-inked isometric SVG figures, core.js engine, build.py). The project lives at ${ROOT}
(Next.js 16.4.3 / React 19.3; read ${ROOT}/AGENTS.md). Downloaded copies of the originals are in ${ORIG}:
  - ${ORIG}/arduino/        Learn Arduino (https://learn-arduino-red.vercel.app): Vite + three.js bundle chunks
                            (main-*.js = lessons/UI data, stage-*.js = 3D scene, kit-*.js = component models, locale chunks)
  - ${ORIG}/robotics/       Robotics Bench (https://robotics-engineer.vercel.app): one Colorfigures page split into scripts:
                            00-core.js (colorfigures core), 01-.js (Robotics Bench engine, defineBoard API), 02..14 = Fig 01..13, shell.html
  - ${ORIG}/drone/          Drone Lab (https://drone-engineer.vercel.app): 00-core.js, 01 shared pieces, 02 frames, 03 lab engine,
                            04 flying range (third-person iso + FPV with OSD), 05..17 = Fig 01..13 drones, shell.html
Python Playwright works here (from playwright.async_api import async_playwright; p.chromium.launch() uses a cached Chromium).
Save any screenshots under ${SP}/shots/<your-slug>/ (NOT inside the project). Look at only the screenshots you need.

Rules:
- Be exhaustive and precise. The rebuild must not miss a single feature, interaction, number, formula, failure mode,
  build step, quiz, status readout, sound, or UI pattern. When something is computed, write the formula and constants.
- UI labels and button texts: quote them verbatim. Long explanatory prose: summarise in your own words (do not copy paragraphs).
- Give source references as file:line so builders can look things up later.
- Do not modify anything in ${ROOT} except writing your own markdown file(s) under ${DOCS}/.
- Your final message is returned as structured data (schema enforced). Put the full detail in the markdown file;
  keep the structured return focused.`

const SCHEMA = {
  type: 'object',
  properties: {
    doc_path: { type: 'string' },
    summary: { type: 'string', description: '<= 250 words: what this slice contains and what matters most for the rebuild' },
    inventory: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, what_it_does: { type: 'string' } }, required: ['name', 'what_it_does'] },
      description: 'one entry per lesson / figure / drone / engine feature / defect, as appropriate' },
    beyond_pasted_spec: { type: 'array', items: { type: 'string' },
      description: 'features the original has that a short spec summary would likely miss' },
    accuracy_notes: { type: 'array', items: { type: 'string' },
      description: 'electronics / flight facts, numbers and formulas the rebuild must get right (or errors in the original to avoid)' },
    open_questions: { type: 'array', items: { type: 'string' } },
  },
  required: ['doc_path', 'summary', 'inventory', 'beyond_pasted_spec', 'accuracy_notes', 'open_questions'],
}

const TASKS = [
  { key: 'learn-arduino', prompt: `${COMMON}

Your slice: the ORIGINAL Learn Arduino site (by Dilum Sanjaya). Sources: ${ORIG}/arduino/*.js and the live site via Playwright
(also try /es/, /fr/, /de/, /zh/, /hi/ paths). Write ${DOCS}/learn-arduino.md covering:
1. Page structure top to bottom: header (title, tagline e.g. "Explore · Understand · Build"), loader, board explorer, lesson
   list/cards with thumbnails, progress counter ("0/16" or similar), footer. Layout at desktop and phone widths.
2. The board explorer: every clickable Uno part (USB port, microcontroller, digital pins 0-13 with ~PWM, power jack 7-12 V,
   power pins 5V/3.3V/GND/VIN, analog A0-A5, anything else) with what each card says (facts/numbers), and the spec table.
3. All 16 lessons, each with: title, goal, components and EXACT wiring (which Uno pin to which part, resistor values,
   breadboard rows if modelled), the full sketch code verbatim, what the 3D scene animates when the code runs, every
   interactive control (sliders, swatches, toggles like obstacle distance/colour, buttons you press in 3D), what the serial
   monitor prints, any "Try it yourself" challenge, hints, quizzes, completion rule (what marks a lesson done).
4. The simulator: how is Arduino code executed? (real interpreter? per-lesson canned behaviour? AST?). What happens when the
   user edits the code (does it re-run, validate, show errors)? Run/Stop states, Serial monitor states (Stopped / Running),
   baud handling, timing (delay, millis), PWM, analogRead, tone, Servo, etc.
5. Visual + interaction design: colours, fonts, the 3D style, camera controls, hover/selection, animations, sound.
6. i18n: languages offered, how switching works, what is translated (lesson text? code comments?).
7. Persistence: what is stored (localStorage keys), progress rules.
8. Anything named like "Scheggled" (the spec has this garbled word in the Learn Arduino list; find what it most plausibly
   refers to: scheduler? schematic? sketch gallery? scheduled lessons?) and report your best interpretation with evidence.
Screenshot the main page, the board explorer, at least 4 lessons running, and a phone-width view.` },

  { key: 'robotics-a', prompt: `${COMMON}

Your slice: the ORIGINAL Robotics Bench, part A. Read ${ORIG}/robotics/01-.js (the Robotics Bench engine, ~81 KB, read it fully
in chunks), 15-startbench.js, shell.html, and figures 02..07 = Fig 01 Arduino Uno R3, Fig 02 LED + resistor trainer,
Fig 03 Transistor switch, Fig 04 ESP32-S3 DevKitC-1, Fig 05 TB6612FNG, Fig 06 L298N. Also drive the live site with Playwright
(https://robotics-engineer.vercel.app) to confirm behaviour: press every button, open every picker, toggle see-through,
labels, exploded view, sound. Write ${DOCS}/robotics-bench-a.md covering:
1. The engine: defineBoard({...}) API (every field), KINDS registry of part kinds, how a board's parts/designators are listed,
   the build flow (Strip to bare PCB, Pick & place SMD, Place a part picker, Solder joints, Plug/unplug USB, Upload sketch
   picker, Exploded view) and its state machine, parts counter (e.g. 24/24), status readouts (STATUS RUNNING, PIN 13 HIGH,
   POWERED...), selected-part panel, "Parts on this board" designator list, the left navigation (roadmap months/sections),
   text panels ("Meet the board"), quizzes (how presented, when, scoring, persistence), progress tracking, sound
   (Lofi / Effects: what plays, how synthesised), the hand-drawn wobble/colour/labels controls, URL params, mobile layout.
2. For EACH of the 6 figures: real-world model (dimensions, parts with designators and part numbers), what is on the mat
   beside it (Nano, batteries, motors, multimeter, phone...), every button/mode/picker and what it does, every stat and its
   formula with constants (e.g. LED current = (Vs - Vf)/R, transistor base current, TB6612 drop 0.5 V, L298N ~2 V and heat),
   failure modes you can trigger and what happens, see-through internals and labels, the build sequence and the explicit
   rules (e.g. solder the DIP socket before inserting the ATmega328P), the lesson text summary, quiz questions with answers.
3. A list of every quiz question in your slice (question, choices, correct answer, explanation summary).` },

  { key: 'robotics-b', prompt: `${COMMON}

Your slice: the ORIGINAL Robotics Bench, part B. Skim ${ORIG}/robotics/01-.js only as needed for context (another agent
documents the engine), and read fully figures 08..14 = Fig 07 A4988 stepper driver, Fig 08 PCA9685 servo board, Fig 09 MPU-6050
(GY-521, complementary filter, drift), Fig 10 HC-SR04 (time of flight, clamp stand object), Fig 11 QTR-8RC (line sensor, readLine),
Fig 12 LM2596 buck module (3-digit voltmeter, brown-outs), Fig 13 Raspberry Pi 5 (ROS 2 brain). Drive the live site with
Playwright (https://robotics-engineer.vercel.app) to confirm behaviour for each figure: press every button/mode, read every stat.
Write ${DOCS}/robotics-bench-b.md covering, for EACH figure: real-world model (dimensions, parts with designators and part
numbers), what is on the mat beside it, every button/mode/picker and what it does, every stat and its exact formula and
constants (Vref -> current limit, steps/rev, microstep table, PWM pulse width for servo angles at 50 Hz, complementary filter
coefficients and noise model, echo time -> distance, QTR timing and readLine weighting, buck efficiency/heat vs linear
"Linear would burn", Pi 5 power/PMIC/RP1/ROS 2 topics...), failure modes you can trigger and what happens, see-through
internals and labels, build sequence specifics, the lesson text summary, every quiz question (question, choices, correct
answer, explanation summary). Also note the practice tasks the original offers (reaction timer with interrupt + debounce +
millis, line follower, arm, anything else) and where they live.` },

  { key: 'drone-a', prompt: `${COMMON}

Your slice: the ORIGINAL Drone Lab, part A: the engine and the flying range. Read fully ${ORIG}/drone/01-*.js (shared pieces),
02-*.js (frames), 03-*.js (the Drone Lab engine, ~62 KB), 04-.js (the flying range: world, collisions, checkpoints, iso third
person + perspective FPV with OSD), 18-startlab.js, shell.html, and 05 (Fig 01 5-inch freestyle, the template craft),
06 (Fig 02 Tiny Whoop), 07 (Fig 03 3-inch cinewhoop), 08 (Fig 04 7-inch long range). Drive the live site with Playwright
(https://drone-engineer.vercel.app): open each of these four drones, change battery/motor/prop pickers, step the build,
run safety tests, open the wiring diagram, fly (send keys: Space, W, arrows, V, T etc.) and screenshot the range and FPV.
Write ${DOCS}/drone-lab-a.md covering:
1. defineDrone({...}) API and the engine: design pickers and the calc (all-up weight, thrust, thrust:weight, hover throttle,
   max current, hover/aggressive flight time, cost) with EXACT formulas and constants; the step-by-step build (each step,
   the "real mistakes" you can make and what happens); the wiring diagram (what is clickable, what it shows); safety tests
   (smoke stopper, motor direction with props off, accelerometer calibration, CG check, servo/elevon checks) and their rules;
   arming rules; stats panels; sound; progress/tracking; quizzes; navigation; URL params; mobile layout.
2. The flying range: physics model (thrust from the design, drag, gravity, battery sag?), controls (keyboard map incl. WASD,
   arrows, Space arm/disarm, V FPV, angle vs acro/horizon modes, any others), on-screen sticks/keypad, camera modes, OSD
   fields, checkpoints/gates/courses, lap timing ("Best lap"), wind, crash handling, reset, missions/autopilot hooks.
3. For EACH of the four drones: every battery/motor/prop option with its numbers (grams, mAh, cells, thrust, current, price),
   frame and parts list, build steps, failure modes, safety tests, Betaflight/INAV/ArduPilot CLI or config snippets (verbatim),
   range/course (named gates), lesson text summary, quiz questions with answers.` },

  { key: 'drone-b', prompt: `${COMMON}

Your slice: the ORIGINAL Drone Lab, part B: nine drones. Skim ${ORIG}/drone/03-*.js and 04-.js only as needed for context
(another agent documents the engine and range), and read fully 09..17 = Fig 05 racing quad (8-gate track), Fig 06 GPS camera
drone (ArduPilot/Pixhawk, gimbal, Loiter/AltHold/RTL/auto mission), Fig 07 autonomous delivery drone (Pixhawk 6C + Pi 5,
winch, deliver mode), Fig 08 agricultural spray hexacopter (10 L tank, pump, boom, RTK, terrain radar, lawn-mower mission),
Fig 09 FPV flying wing on INAV (fixed-wing physics, stall, hand launch, RTH), Fig 10 VTOL tiltrotor (tricopter QuadPlane,
transition T), Fig 11 Crazyflie 2.1 swarm (Flow deck, formation, figure-8), Fig 12 tricopter (tail servo yaw), Fig 13 heavy-lift
octocopter (12S, 3-axis gimbal, motor-out redundancy). Drive the live site with Playwright (https://drone-engineer.vercel.app)
to confirm each drone's modes and missions. Write ${DOCS}/drone-lab-b.md covering, for EACH drone: every battery/motor/prop
option with its numbers, any custom calc (e.g. the wing's cruise/stall speed), frame and parts list with real proportions,
build steps and real mistakes, safety tests, flight modes and missions (waypoints, named gates/checkpoints), any custom
physics, failure scenarios (motor out, failsafe, GPS loss, wind), CLI/param snippets verbatim (Betaflight, INAV, ArduPilot,
Crazyflie), lesson text summary, quiz questions with answers.` },

  { key: 'current-audit', prompt: `${COMMON}

Your slice: audit the CURRENT iynk build in ${ROOT} against the pasted spec and against the originals. Steps:
1. cd ${ROOT}; run "npm run build" (report errors verbatim), "npx tsc --noEmit", "npx eslint . --quiet". Then start it with
   "npx next start -p 3311" in the background (and kill it when you finish).
2. With Playwright visit every route: /, /boards, /boards/<slug> for every board in src/lib/boards.ts, /robotics and every
   /robotics/<slug> (see src/app/robotics/[slug]/page.tsx), /drones and every /drones/<slug>. Collect console errors and
   page errors. Screenshot each page (desktop 1280x900) and a few at phone width (390x844).
3. Exercise interactions: on 4 boards (uno-r3, esp32, microbit, basys3) click every lesson and press Run, read the serial
   monitor, press the failure buttons, switch sheets (board/schematic/breadboard), toggle exploded view; inside the figure
   iframe toggle See-through and Labels and drag to rotate; check the figure actually changes. On robotics pages press every
   build button and run each sketch. On two drones step the build, run each safety test, toggle wiring, and fly with keys
   (Space, W, arrows, V, Q). Switch language to each of es/fr/de/zh/hi and theme to dark, and note what is NOT translated or
   what breaks in dark mode.
4. Open every figure page directly (/figures/board.html?id=<each board>, with &module=<each robotics module>, and
   /figures/drone.html?id=<each drone>) and check <html data-errors>, NaN in the SVG, and whether each board/drone actually
   looks like the real object (screenshot each; view at least the 12 boards and 4 drones).
5. Read every source file under src/ and figures/src/ and list concrete defects: wrong electronics facts, sketches that would
   not compile on real hardware, lessons whose sketch fails in the in-browser runner (e.g. type keywords the translator does
   not handle, undefined pin names like LD2/matrix/ACT), placeholder content (canned Serial strings instead of real logic),
   untranslated strings, a11y problems, mobile problems, missing features versus the spec.
Write ${DOCS}/current-iynk-audit.md: a table of every defect (file:line, severity, what is wrong, what correct looks like),
then a spec-coverage matrix (each spec requirement -> status: done / partial / missing / broken, with evidence).` },

  { key: 'colorfigures-guide', prompt: `${COMMON}

Your slice: write the authoring guide our figure builders will follow. Read fully ~/.claude/skills/colorfigures/SKILL.md,
assets/core.js (all 641 lines), scripts/build.py, and the three examples in assets/examples/ (toaster, lamp, claw). Then study
how the two originals EXTEND core.js into multi-figure labs: ${ORIG}/robotics/01-.js (Robotics Bench engine: defineBoard, KINDS,
startBench) and ${ORIG}/drone/01-*.js, 02-*.js, 03-*.js, 04-.js (Drone Lab engine and range). Write ${DOCS}/colorfigures-guide.md:
1. Precise API reference for every core.js global (signature, units, return value, gotchas), the mountFigure cfg options,
   xrGhost/xrCallouts/xrMount/xrWrap/xrUnder/xrGhostRings, mountKeypad, act/acts, tag, clipTo, castShadow, board, params(),
   ui.animate/flash/invalidate/camTo/render, window.__st, ?press= testing, ?yaw/pitch/free/xr/labels params, reserved names.
2. What build.py adds and how a built page behaves inside an <iframe> (layout, header, controls, credit footer, zoom chip,
   keyboard focus, pointer capture, sizing). Recommend how a figure page should run in "embedded" mode inside a Next.js host:
   which parts of the shell to hide, how to size to the iframe, how to accept commands from the parent via postMessage and
   report events (part clicked, button pressed, pin changes), how to localise button labels, how to support dark mode.
3. The engine pattern the originals used to share one engine across many figures (registries, part KINDS, state machines,
   per-figure scripts), what it does well, and a recommended design for iynk's own engines: a Board Bench engine
   (boards + modules + breadboard components + build flow + failure modes + see-through + schematic/breadboard sheets) and a
   Drone engine (frame/arms/motors/props/stack/battery + build steps + wiring sheet + safety tests). Be concrete: the API
   shape, the file layout, how a new board is added in ~200-400 lines.
4. A verification recipe that works on THIS machine (no Google Chrome; Python Playwright + cached Chromium works; Brave is at
   /Applications/Brave Browser.app): exact commands/scripts to shoot a figure at the 7 angles, closed and see-through, a ?press=
   sequence, phone width, and to read data-errors / grep NaN. Test your recipe on assets/examples/toaster.html built with build.py
   into ${SP}/cf-test/ and confirm it works.
5. The top 25 pitfalls (depth sorting, faces, text on faces, reserved names, clipping, performance with many parts) with fixes.` },
]

phase('Research')
const results = await parallel(TASKS.map(t => () =>
  agent(t.prompt, { label: 'research:' + t.key, phase: 'Research', schema: SCHEMA })
    .then(r => ({ key: t.key, ...r }))
))
return results.filter(Boolean)
