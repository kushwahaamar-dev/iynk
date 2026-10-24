export const meta = {
  name: 'simlab-items',
  description: 'SimLab item wave: one agent per board, drone or parts group writes its figure data, its content and English text (Uno R3 and quad5 get content-only agents beside their engine slices)',
  phases: [
    { title: 'Items', detail: 'figure + content per item, a few at a time' },
  ],
}

const R = args.root
const S = args.scratch
const T = args.prev || {}
const tails = key => (T[key] || []).length ? `Transcripts of the interrupted runs, oldest first: ${T[key].join(' , ')}. Skim them only with \`python3 -I ${S}/tail_agent.py <transcript> 120\` (compact last steps); never open them any other way, they are large.` : ''

const CONTEXT = `PROJECT: SimLab at ${R} (Next.js 16.4.3 App Router, React 19.3, Tailwind v4, TypeScript). It is its own local git repo (branch main). Do NOT touch the parent git repo at /Users/amar/Codes. Read ${R}/AGENTS.md first: this Next.js has breaking changes versus what you know, so read the relevant guide in ${R}/node_modules/next/dist/docs before relying on any Next API.

THE BRIEF (the spec): ${R}/docs/SPEC.md. It holds the user's brief verbatim, their own instruction ("A lot of things are wrong here. See everything, cross-reference, cross-check everything, go on a long run. Make sure it is what I want.") and interpretation notes. Read it in full.

RESEARCH (long files: read with offset/limit in chunks; read what your task needs):
- ${R}/docs/research/learn-arduino.md : Learn Arduino (16 lessons, per-lesson simulations and constants, UI, i18n, shortcuts)
- ${R}/docs/research/robotics-bench-a.md : Robotics Bench engine (defineBoard, build flow, faults, sound, quiz) + Fig 01-06
- ${R}/docs/research/robotics-bench-b.md : Robotics Bench Fig 07-13 + practice tasks
- ${R}/docs/research/drone-lab-a.md : Drone Lab engine, flying range + FPV/OSD, Fig 01-04, Appendix A golden calc table
- ${R}/docs/research/drone-lab-b.md and drone-lab-b-calc-matrix.md : Fig 05-13, golden calc matrix
- ${R}/docs/research/colorfigures-guide.md : core.js API, embedded mode + postMessage bridge (tested), engine pattern for SimLab (sections 3.3-3.5), verification recipe, top-25 pitfalls; Appendices A-E hold tested cfshoot.py, cfbuild.py, embed.js and host code
- ${R}/docs/research/nextjs16-primer.md : verified Next.js 16 patterns; its "Rules for SimLab implementers" (lines 9-28) are binding
- ${R}/docs/research/coverage-checklist-b.md (and coverage-checklist-a.md once written): the requirement checklists
- ${R}/docs/research/current-simlab-audit.md : audit of the old SimLab code (what was wrong)
- ${R}/docs/facts/<id>.md : verified fact sheets per board, module and drone (being written right now; read the one for your item when it exists)
ORIGINAL SOURCES (downloaded copies of the three original sites): ${S}/orig/robotics/*.js, ${S}/orig/drone/*.js, ${S}/orig/arduino/*.js. Learn from them; write your own code.
COLORFIGURES SKILL: ~/.claude/skills/colorfigures (SKILL.md, README.md, assets/core.js, scripts/build.py, assets/examples/*.html)
SCRATCH: ${S}. Put throwaway files only in ${S}/gm/<your-label>/. Never write into the repo except the paths your task owns.
TOOLS: Python Playwright works (from playwright.async_api import async_playwright; p.chromium.launch()). Google Chrome is not installed and Brave headless hangs, so do not use them. Run Python with -I. WebSearch and WebFetch are available through ToolSearch.`

const SEEDS = `SEED DECISIONS from the orchestrator (the FIXED DECISIONS further below override them where they differ):
S1 One Next.js 16 App Router app in this repo, deployed to Vercel. Keep cacheComponents + partialPrefetching in next.config.ts unless the primer shows they block something.
S2 Figures use the Colorfigures skill core, vendored with documented patches. One HTML page per figure, built into public/figures and embedded in the host by iframe with the tested hello/ready postMessage bridge (guide 2.3, Appendices C and D). Lessons, quizzes, the code editor, the serial monitor, logs and translations live in the React host, not inside figures.
S3 Two shared figure engines, reimplemented from the originals' patterns (not copied): a Board Bench engine (every board and robotics module, breadboard, build flow, faults, see-through, exploded view) and a Drone engine (frames, pieces, build, tests, wiring). Part ids, pins, nets and modes have one source of truth.
S4 Schematic, breadboard and wiring views must look like Colorfigures (hand-ink filter, wobble, paper grain, the five palettes). They are generated from the same nets data, clickable, and synced with the 3D figure (selection, live pin values, current flow). The breadboard is a real iso scene; schematic and wiring sheets are flat hand-inked sheets.
S5 Editable code that really runs: an Arduino C++ subset interpreter with correct per-target int widths (16-bit int on AVR, 32-bit on ARM and ESP); a MicroPython/Python subset for Pico, micro:bit and Pi (with gpiozero and ROS 2 rclpy shims); a Verilog subset simulator for Basys 3 and DE10-Lite with parameter overrides. All run on a deterministic virtual clock with non-blocking delay, interrupts and millis(); world models drive the inputs, and a run updates the 3D figure.
S6 Every defect in the originals listed in the research docs is fixed, not copied. Firmware snippets (Betaflight, ArduPilot, INAV, cflib, ROS 2) use current, real syntax. The drone calculator stays identical to the originals' golden tables, which become unit tests, and the flight physics must agree with it.
S7 Every designed failure must be reachable from the UI: leave out / remove a part (including single SMD parts), on-board controls work (RESET, BOOT, BOOTSEL, slide switches, buttons A/B), and the brief's failures (reverse polarity, brown-out, wrong voltage, cold solder) on every board.
S9 Progress lives in localStorage, versioned. The home dashboard shows progress across the three labs.
S10 Sound is synthesised (lofi loop, named effects, motor hum) at host level so it survives navigation; figures emit sfx events. No analytics or tracking.
S11 The flight simulator: an iso chase view plus FPV with an OSD; per-craft courses and missions from the originals, fixed (visible gates, reachable checkpoints, correct horizon); keyboard (WASD/arrows, Space arm, V FPV, R reset), on-screen sticks, and the Gamepad API.
S12 Board Lab Uno R3 = Learn Arduino's 16 lessons plus the Robotics Bench build sequence. Every other board gets at least 4 progressive lessons (Blink/I-O, button + sensor, PWM/analog, one protocol or Wi-Fi), with breadboard + schematic, a serial monitor, failure modes and an assembly/power-up sequence. Variant boards (Uno R4 Minima/WiFi, Pico family, Pi 4/5) use a variant switch where layouts allow.
S13 Board picks: STM32 Nucleo-F401RE; Terasic DE10-Lite (MAX 10); ESP32-S3-DevKitC-1 v1.1 (RGB LED on GPIO38; v1.0 uses GPIO48); micro:bit V2.
S14 Robotics Lab = the 13 Robotics Bench figures, with practice tasks as real checkable exercises, a quiz after each major step, and live status, serial and current draw.
S15 Drone Lab = the original 13 crafts with all their modes, tests, ranges and missions, fixed, with corrected CLI/params.
S16 Testing: Vitest, Playwright, axe, cfshoot; tsc and eslint clean.`

const FIXED = `FIXED DECISIONS (binding for every agent today; they make parallel work fit together):
D1 Locales: en, es, fr, de, zh, hi (zh = Simplified Chinese, html lang "zh-Hans"). The brief's six; ship all six complete and prerendered. English is written first; every non-English string is translated before the day ends; no placeholder text anywhere.
D2 Routes under src/app/[lang]: / (dashboard), /boards, /boards/[board], /boards/[board]/[lesson], /robotics, /robotics/[bench], /drones, /drones/[drone], /drones/[drone]/fly, /about (credits + the originals' MIT licence), [...rest] → notFound(). "/" redirects per the primer (cookie simlab-lang, then Accept-Language, then /en). Import alias @/* → src/*.
D3 Ids. Boards (12): uno-r3, nano, uno-r4, esp32-devkitc, esp32-s3-devkitc-1, nodemcu, pico, nucleo-f401re, microbit-v2, pi4-pi5, basys3, de10-lite. Drones (13): quad5, whoop, cinewhoop, longrange, racer, gpscam, delivery, agrihex, wing, vtol, swarm, tricopter, octo. Robotics benches (13): the 13 Robotics Bench figures, kebab-case ids fixed by the architect in src/content/ids.ts.
D4 Data: all content types live in src/content/schema.ts (architect). One data module per item: src/content/boards/<id>.ts, src/content/robotics/<id>.ts, src/content/drones/<id>.ts, each owned by that item's agent. scripts/gen-content-index.mjs (architect) scans those folders and writes src/content/index.generated.ts (a typed lazy registry); it runs before dev/build/typecheck so the build stays green while items are still being written; run it after adding an item.
D5 Text: every user-visible string lives in per-locale JSON. UI strings by namespace: src/i18n/messages/<lang>/<ns>.json with namespaces common (shell-app), shell (design-system), boardlab (ui:boardlab), robotics (ui:robotics), dronelab (ui:dronelab), flight (flight). Each namespace owner creates its file for all six locales at the start (English text) and translates es/fr/de/zh/hi before finishing. Content prose: src/i18n/content/<lang>/<lab>/<id>.json (English by the item's agent; other languages by the translation wave). Figure strings: src/i18n/figures/<lang>.json, sent to figures by the bridge "locale" message (CF_T).
D6 Figures: sources in figures/ (vendored core figures/vendor/colorfigures, engines figures/engine, tools figures/tools, items figures/{boards,parts,modules,robotics,drones}/<id>.js), built by figures/tools/cfbuild.py into public/figures/<kind>/<id>.html, verified with figures/tools/cfshoot.py. The host embeds them by iframe through the bridge of colorfigures-guide 2.3: envelope {source:'simlab', v:1, type}; host→figure hello, press, act, set, view, xr, labels, pal, locale, theme, flash, query; figure→host ready, part, button, state, labels, flash, focus, error. Every figure writes its Colorfigures prompt to figures/prompts/<id>.md (the README lists them all).
D7 Progress/settings: one localStorage key "simlab:v1" = { v:1, done: Record<string,true>, quiz: Record<string,{score:number,total:number}>, best: Record<string,number>, settings: { theme:'system'|'light'|'dark', sound:boolean, lofi:boolean, labels:boolean, reduceMotion:boolean } }. Keys: board:<id>:lesson:<lessonId>, board:<id>:assembly, robotics:<id>:step:<stepId>, robotics:<id>:task:<taskId>, robotics:<id>:quiz:<quizId>, drone:<id>:build, drone:<id>:test:<testId>, drone:<id>:quiz:<quizId>, drone:<id>:course:<courseId>. Store and hooks in src/lib/progress (shell-app). Progress is shown as "done/total", e.g. "0/16".
D8 Code execution: src/lib/interp (interpreters agent): Arduino C++ subset, MicroPython/Python subset, Verilog subset, deterministic virtual clock; a run drives the figure through the bridge ("set", at most 30 Hz) and the serial monitor.
D9 Flight: the range is a static page in an iframe like the figures (figures/flight → public/figures/flight/range.html), with a typed host API in src/lib/flight and the host component in src/components/flight (flight agent).
D10 Look: Colorfigures everywhere — warm paper, ink lines, the palette tomato, mustard, mint, cobalt, blush plus technical monochrome; dark mode uses the paper-plate rule (guide 2.3). Shared components in src/components/ui (design-system).
D11 FigureFrame (shell-app owns src/components/figure): <FigureFrame ref={handle} src="/figures/<kind>/<id>.html" title="…" initial={{…}} onEvent={(e) => …} className />. handle.send(type, payload) posts a host→figure message; "initial" is sent as "set" after "ready"; onEvent receives every figure→host message as {type, ...payload}. It does the hello/ready handshake, origin and source checks, pause-on-hide and re-hello on show (primer e), forwards theme and locale, and renders an accessible fallback list of the figure's pressable parts.
D12 Tooling: Vitest (unit), Playwright Test (e2e + axe), cfshoot (figures). npm scripts by shell-app: typecheck (next typegen && tsc --noEmit), test, e2e, check. next.config.ts reads distDir from NEXT_DIST_DIR (default .next) so agents can build without clobbering each other: NEXT_DIST_DIR=.next-<your-label> npx next build, then delete that folder. Errors in files you don't own are other agents' work in progress: ignore them, don't fix them.
D13 The old code is replaced, not patched. shell-app deletes the old src/app, src/components/*.tsx and src/lib/*.ts(x) files; platform clears the old figures/ and public/figures/ files. The old code predates the hackathon: never copy from it.
D14 Hackathon layer (built later today by other agents; keep these seams): (a) server code lives only in src/app/api/** route handlers and src/lib/server/**; pages stay static. (b) Each lab page keeps its state in one serializable store (src/lib/<lab>/store.ts) changed only through dispatch(action), and every host-to-figure message goes through FigureFrame's handle.send, so multiplayer rooms, an AI lab partner and replays can observe and drive the same actions. (c) Lesson checks and robotics/drone test results are pure functions of a deterministic run (inputs + virtual time), so a server can re-run and verify them. (d) Reserved for the hackathon layer, don't create: src/app/api/**, src/lib/server/**, src/lib/ai/**, src/lib/search/**, src/lib/solana/**, src/lib/realtime/**, src/lib/hw/**, src/components/{ai,search,solana,realtime,hw}/**. (e) Hackathon pages and panels: the layer adds the pages /[lang]/together, /[lang]/passport and /[lang]/verify, plus panels on every lab page. So the header navigation reads its entries from one exported array in src/components/shell/nav.ts (design-system agent); and every lab page (ui agents) renders <LabDock lab="board"|"robotics"|"drone" itemId={id} store={store} figure={figureHandle} /> beside the figure (a bottom sheet on phones). The shell-app agent writes src/components/dock/types.ts (export type LabStore<S = unknown, A extends { type: string } = { type: string }> = { getState(): S; subscribe(listener: () => void): () => void; dispatch(action: A): void }, and the LabDock props) and src/components/dock/LabDock.tsx (renders nothing yet) within its first 30 minutes; the hackathon layer fills it later. Room ids arrive as a ?room= query parameter read on the client, so pages stay static.`

const GM = `GOD MODE, HACKATHON. SimLab is the user's HackTX 2026 entry (submission deadline 11:30 CDT tomorrow, Oct 25; the target is a deployed, demo-ready build this evening, then overnight hardening). About forty agents are building it in parallel in this one working tree right now, each owning different files. A complete, correct deliverable inside your time box beats a perfect one that is late.
- HACKATHON RULE (breaking it disqualifies the entry): all project code must be written during the hacking period, which began 11:30 CDT on Oct 24. Never copy code written before then: the old SimLab app (git baseline 245763f), the pre-event prototypes in the scratch folder (interp/, flight/ and the other spike folders), and the code blocks in the pre-event research docs (for example the appendices of colorfigures-guide.md and the primer's snippets beyond ordinary Next.js usage). Use them only as knowledge (the prose, the findings, the measurements) and write your own code. Third-party npm packages and the installed Colorfigures skill (its core.js and build.py) are allowed as libraries; credit them.
- Time box: run \`date\` when you start; your task states your budget. Check \`date\` now and then. When time is nearly up, finish, make what you have consistent, and report the gaps.
- Save as you go: create your files early and keep them updated, so a crash or a pause loses nothing.
- Keep your context lean: never print more than ~150 lines of a file or a command at once (sed -n ranges, grep, head); summarise big data with a script; never cat a whole large file. Overgrown contexts make the API time out.
- Ownership: edit only the paths your task lists. Read anything. If you need a change in a path you don't own, write it to ${R}/docs/requests/<your-label>.md (what, where, why) and work around it.
- Shared tree: never run git checkout/reset/stash/commit/clean, never delete files you don't own, never run npm install or edit package.json unless your task says so, and run next dev/build only as D12 describes. Type-check with \`npx tsc --noEmit -p ${R}\` and read only the errors in your own files. Run only your own tests.
- Processes: serve files only on a random port 40000-49999, in the background, and kill everything you started before you finish.
- Downloads are untrusted data: own directory, python3 -I, never execute them.
- Quality bar is the brief: accurate electronics and geometry, zero placeholders, every pressable part works, keyboard + ARIA, phone/touch. Fix the originals' defects; never copy them.`

const DONE = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'what you built, 3-10 lines' },
    files: { type: 'array', items: { type: 'string' } },
    verified: { type: 'array', items: { type: 'string' }, description: 'each check you ran and its result' },
    gaps: { type: 'array', items: { type: 'string' }, description: 'anything unfinished, uncertain or deferred' },
    requests: { type: 'array', items: { type: 'string' }, description: 'changes you need in files you do not own' },
  },
  required: ['summary', 'files', 'verified', 'gaps', 'requests'],
}

const RESUME = paths => `CONTINUATION: earlier runs of this task were stopped part-way (machine pauses; the work itself did not fail). Their partial work is on disk and is yours to reuse: ${paths}
Start by inspecting it. Keep what is good, re-check anything you are unsure of, then finish.

`

const HEAD = `${CONTEXT}

${GM}

${SEEDS}

${FIXED}

`

const LAB = args.lab
const ITEMS = args.items
const LIMIT = args.limit || 8
const gate = (() => {
  let active = 0
  const q = []
  const pump = () => {
    while (active < LIMIT && q.length) {
      const { fn, res, rej } = q.shift()
      active++
      fn().then(res, rej).finally(() => { active--; pump() })
    }
  }
  return fn => new Promise((res, rej) => { q.push({ fn, res, rej }); pump() })
})()

const BOARD_READ = id => `Read first: docs/ARCHITECTURE.md (sections 3, 5, 7, 8 and 9, and the Board checklist in section 10, which is your definition of done); src/content/schema.ts and src/content/ids.ts (the types you fill and the fixed ids; after 14:00 they change only additively, logged at the top of ARCHITECTURE.md); docs/FIGURES.md and docs/FIGURES-BENCH.md (the figure data format; engine:bench is still building the engine, so re-read the FIGURES-BENCH changelog every ~20 minutes); figures/boards/uno-r3.js and figures/parts/*.js (the worked examples, being finished now); docs/facts/${id}.md (the verified fact sheet: the single source of truth for geometry, pins, power and quirks; never invent a position or a pin); the parts sheet docs/facts/la-components.md for anything you put on a breadboard; this board's items in docs/research/coverage-checklist-a.md and coverage-checklist-b.md; docs/research/learn-arduino.md for how lessons should feel; and src/lib/interp (the interpreters, being written now: the language subset, how a lesson runs and how checks evaluate a RunTrace).`

const BOARD_ITEM = it => `${HEAD}YOUR TASK (time box: 110 minutes; label ${it.label}): the complete ${it.title} for the Board Lab: its figure data and its content. ${it.notes}
${BOARD_READ(it.id)}
1. figures/boards/${it.id}.js per FIGURES-BENCH: outline and mounting holes in mm, every header pin with its printed label, ICs, passives, connectors, LEDs, buttons and switches, silkscreen, build groups, on-board controls that work (RESET, BOOT, BOOTSEL, slide switches, user buttons), power sources and rails, faults that really trigger (reverse polarity, brown-out, wrong voltage, cold solder, a removed part including one single SMD part, and the board's own: strapping pins, BOOTSEL, 5 V into a 3.3 V pin), modes, sheets, and the lesson circuits for your lessons (section 9). Write its Colorfigures prompt to figures/prompts/${it.id}.md.
2. Build it with figures/tools/cfbuild.py into public/figures/boards/${it.id}.html as soon as the engine renders (until then check your data with the validation FIGURES-BENCH describes), then verify with figures/tools/cfshoot.py against the FIGURES-BENCH section 14 checklist: turn it all the way round, see-through with labelled animated internals, exploded view, every pressable part works, every fault triggers, phone width. Look at the screenshots yourself and fix what is wrong.
3. src/content/boards/${it.id}.ts, src/content/boards/${it.id}.test.ts and src/i18n/content/en/boards/${it.id}.json per schema.ts and the Board checklist: the pinout rows, MCU and power facts, controls, the assembly / power-up sequence in the robotics style, at least 4 progressive lessons (io, input, analog, protocol or wireless${it.fpga ? '; this is an FPGA board: a Verilog LED chaser with parameter overrides, a switch-to-LED mapping and the 7-segment display' : ''}) whose starter code compiles and passes its checks on the scripted run in src/lib/interp (test that in your .test.ts once the interpreter exists; until then stay inside its documented subset), serial lines, wireables with real connections and level cautions, failure modes, variants, sources. If the interpreter lacks an API your lessons need, write docs/requests/${it.label.replace(':', '-')}.md for the interpreters agent and keep a lesson that works today. Run scripts/gen-content-index.mjs after adding the file, and the content check the architect documents.
4. In your report, list what you verified (with screenshot paths) and what is still open.
You own: figures/boards/${it.id}.js, figures/prompts/${it.id}.md, public/figures/boards/${it.id}.html, src/content/boards/${it.id}.ts, src/content/boards/${it.id}.test.ts, src/i18n/content/en/boards/${it.id}.json, docs/requests/${it.label.replace(':', '-')}.md.`

const UNO_CONTENT = it => `${HEAD}YOUR TASK (time box: 110 minutes; label ${it.label}): the complete Board Lab content for the Arduino Uno R3, the board the demo opens with. It is Learn Arduino's 16 lessons (docs/research/learn-arduino.md: every lesson's simulation, constants, code, serial output and quiz, with the original's defects fixed, never copied) plus the Robotics Bench build sequence as its assembly / power-up sequence (seed S12).
${BOARD_READ('uno-r3')}
The figure figures/boards/uno-r3.js belongs to engine:bench, which is finishing it now. Lesson circuits live inside the figure file (FIGURES-BENCH section 9), so:
1. Write all 16 lesson circuits as exact \`circuits:\` data (parts, holes, wires, params) using the part ids in src/content/ids.ts and the parts being written in figures/parts/ and figures/modules/, into docs/requests/content-uno-r3.md, ready to paste into uno-r3.js by a merge step after engine:bench finishes. Reference those circuit ids from your lessons.
2. src/content/boards/uno-r3.ts, src/content/boards/uno-r3.test.ts and src/i18n/content/en/boards/uno-r3.json per schema.ts and the Board checklist: the pinout, MCU and power facts, controls, the assembly / power-up sequence, the 16 lessons (each with editable code that compiles in src/lib/interp, param chips, world inputs, expected serial, checks that pass with the starter code on the scripted run, hints and the quiz), wireables, failure modes, sources. Test every lesson through the interpreter in your .test.ts once it exists; if it lacks an API a lesson needs, write the need into docs/requests/content-uno-r3.md for the interpreters agent. Run scripts/gen-content-index.mjs after adding the file, and the content check the architect documents.
You own: src/content/boards/uno-r3.ts, src/content/boards/uno-r3.test.ts, src/i18n/content/en/boards/uno-r3.json, docs/requests/content-uno-r3.md.`

const DRONE_READ = id => `Read first: docs/ARCHITECTURE.md (sections 3, 5 and 7, and the Drone checklist in section 10, which is your definition of done); src/content/schema.ts and src/content/ids.ts (DRONES meta gives the firmware and motor count); docs/FIGURES.md and docs/FIGURES-DRONE.md (the figure data format; engine:drone is still building the engine, so re-read its changelog every ~20 minutes); figures/drones/quad5.js (the worked example, being finished now); docs/facts/${id}.md (the verified fact sheet; it may still be in progress: check for it every ~20 minutes and reconcile with it when it lands; until then use primary sources); this craft's figure section in docs/research/drone-lab-a.md (Fig 01-04) or drone-lab-b.md (Fig 05-13) and its golden rows in drone-lab-b-calc-matrix.md or drone-lab-a.md Appendix A; src/lib/drone (the calculator API, finished); the original's figure file in ${S}/orig/drone/ (learn from it, write your own code).`

const DRONE_CONTENT_BODY = id => `src/content/drones/${id}.ts, src/content/drones/${id}.test.ts and src/i18n/content/en/drones/${id}.json per schema.ts and the Drone checklist: texts for every part of the part-by-part build, the 3 x 3 x 3 design catalogue and calc model with golden rows that reproduce the research tables (test them against src/lib/drone/calc; list corrections in your report), the wiring connections matching the figure's wiring sheet (real pads, protocols, voltages), the safety tests (smoke stopper, motor direction with props off, accelerometer calibration, plus the craft's own: compass, airspeed, CG, elevons, servo, tilt servos, failsafes), firmware (version; real, current CLI / params / cflib snippets per mode and for the build; CLI emulator settings, limits and effects), flight config (physics class and parameters, modes with angle vs acro where it applies, FPV, OSD, failsafes, controls, and courses with gates, checkpoints or missions that are visible and reachable), quizzes, practice text and sources. Run scripts/gen-content-index.mjs after adding the file, and the content check the architect documents.`

const DRONE_ITEM = it => `${HEAD}YOUR TASK (time box: 110 minutes; label ${it.label}): the complete ${it.title} for the Drone Lab: its figure data and its content. ${it.notes}
${DRONE_READ(it.id)}
1. figures/drones/${it.id}.js per FIGURES-DRONE: the frame layout and geometry from the fact sheet, pieces with part ids, the part-by-part build with its mistakes and refusals, the wiring sheet (node ids = part ids), the tests, the design options for the host calculator, see-through internals and the exploded view. Write its Colorfigures prompt to figures/prompts/${it.id}.md. Build it with figures/tools/cfbuild.py into public/figures/drones/${it.id}.html as soon as the engine renders, verify with figures/tools/cfshoot.py against the FIGURES-DRONE section 12 checklist, look at the screenshots yourself and fix what is wrong.
2. ${DRONE_CONTENT_BODY(it.id)}
3. In your report, list what you verified (with screenshot paths) and what is still open.
You own: figures/drones/${it.id}.js, figures/prompts/${it.id}.md, public/figures/drones/${it.id}.html, src/content/drones/${it.id}.ts, src/content/drones/${it.id}.test.ts, src/i18n/content/en/drones/${it.id}.json, docs/requests/${it.label.replace(':', '-')}.md.`

const QUAD5_CONTENT = it => `${HEAD}YOUR TASK (time box: 100 minutes; label ${it.label}): the complete Drone Lab content for the 5-inch freestyle quad (quad5), the craft the demo builds and flies.
${DRONE_READ('quad5')}
The figure figures/drones/quad5.js belongs to engine:drone, which is finishing it now: read it and match its part ids, wiring nodes, tests and design options exactly. If the figure lacks something the content needs, write it into docs/requests/content-quad5.md.
1. ${DRONE_CONTENT_BODY('quad5')}
You own: src/content/drones/quad5.ts, src/content/drones/quad5.test.ts, src/i18n/content/en/drones/quad5.json, docs/requests/content-quad5.md.`

const PARTS = it => `${HEAD}YOUR TASK (time box: 90 minutes; label ${it.label}): reusable figure parts for every Board Lab lesson circuit and robotics bench: ${it.title}.
Read first: docs/FIGURES.md; docs/FIGURES-BENCH.md (sections 0-2, 5, 6.4, 8, 9, 11-14; re-read its changelog every ~20 minutes); figures/parts/{breadboard,led,resistor,wire}.js (engine:bench's worked examples, being written now); docs/facts/la-components.md (the verified sheet: dimensions, pinouts, electrical behaviour, failure modes per part in section 29, internals for see-through in section 31); docs/facts/trainers.md if it exists (for the bench-side parts); docs/ARCHITECTURE.md sections 3-4 and src/content/ids.ts (PART_IDS and MODULE_IDS).
For each item: ${it.modules ? 'figures/parts/<id>.js for parts and figures/modules/<id>.js for modules (SL.bench.module)' : 'figures/parts/<id>.js'}: geometry in mm from the sheet; pins and leads with the real pitch so they sit in breadboard holes; the electrical model the circuit solver needs (FIGURES-BENCH section 9: what the engine solves and what a part must declare); the parameters the host can set; failure modes that really trigger (reverse polarity, over-current and burn-out, a missing resistor, the wrong supply); see-through internals with labels and animation where they teach something (servo gears and pot, stepper coils, the LDR track, the potentiometer wiper, the TIP120's two transistors); and its Colorfigures prompt in figures/prompts/<id>.md. If ARCHITECTURE section 3 defines content for parts or modules, write it too (its file and en JSON). Build each into its page under public/figures/ once the engine renders, verify with cfshoot, look at the shots and fix.
Items: ${it.ids.join(', ')}.
You own: ${it.ids.map(i => `${it.modules && it.modules.includes(i) ? 'figures/modules' : 'figures/parts'}/${i}.js`).join(', ')}, figures/prompts/{${it.ids.join(',')}}.md, the built pages for them under public/figures/parts/ and public/figures/modules/, and their content files if section 3 defines any.`

const ROBO_ITEM = it => `${HEAD}YOUR TASK (time box: 110 minutes; label ${it.label}): the complete Robotics Lab bench "${it.title}" (Robotics Bench Fig ${it.fig}): its figure data${it.module ? ` (the bench and its module ${it.module})` : ''} and its content. ${it.notes}
Read first: docs/ARCHITECTURE.md (sections 3, 5, 7 and 8, and the Robotics bench checklist in section 10, which is your definition of done); src/content/schema.ts and src/content/ids.ts (the ROBOTICS meta gives this bench's board, modules and parts); docs/FIGURES.md and docs/FIGURES-BENCH.md (sections 0-2, 5, 6, 8, 9 and 11-14; re-read its changelog every ~20 minutes); figures/boards/uno-r3.js (the worked example) and the board file this bench puts on the mat (figures/boards/<board>.js, being written now by its item agent), figures/parts/*.js and figures/modules/*.js (being written now by the parts agents); docs/requests/ui-robotics.md (exactly what the Robotics Lab UI reads from your content: TextKeys, BuildStep.fault, Quiz.afterStep, StatusField.key, CurrentModel); the fact sheets ${it.facts.map(f => `docs/facts/${f}.md`).join(', ')} and docs/facts/trainers.md (some may still be in progress: check every ~20 minutes and reconcile when they land; until then use primary sources); this bench's section in docs/research/robotics-bench-a.md (Fig 01-06) or docs/research/robotics-bench-b.md (Fig 07-13 and the practice tasks); the original's figure file in ${S}/orig/robotics/ (learn from it and fix the defects the research lists; write your own code).
1. Figure. ${it.module ? `figures/modules/${it.module}.js: the module (SL.bench.module) with geometry, pins and electrical behaviour from its fact sheet, see-through internals and its own faults. ` : ''}figures/robotics/${it.id}.js: the bench (SL.bench.bench, section 11): the mat, the board, modules and parts; the build-and-break flow in the original's order with its refusals (strip, pick & place, reflow, low THT, tall THT, solder, last group, plug, upload, exploded, where they apply); break steps for each fault with the fix (the original's faults plus reverse polarity, brown-out, wrong voltage and cold solder where the bench can show them); modes with real code; live status fields and a current model with the supply limit (brown-out when exceeded). Write the Colorfigures prompts to figures/prompts/${it.id}.md${it.module ? ` and figures/prompts/${it.module}.md` : ''}. Build with figures/tools/cfbuild.py into public/figures/robotics/${it.id}.html${it.module ? ` and public/figures/modules/${it.module}.html` : ''} as soon as the engine renders, verify with figures/tools/cfshoot.py against the section 14 checklist, look at the screenshots yourself and fix what is wrong.
2. Content. src/content/robotics/${it.id}.ts, src/content/robotics/${it.id}.test.ts and src/i18n/content/en/robotics/${it.id}.json per schema.ts and the Robotics bench checklist: the build-and-break steps, faults with their fixes, modes with real code (the original's sketches with their defects fixed) and serial lines, status fields and the current model, practice tasks as checkable exercises (starter code, a reference solution that passes every check in src/lib/interp, a world script, hints), a quiz after each major step and an end quiz (the original's questions, corrected). Test the reference solutions through the interpreter in your .test.ts once it exists; if it lacks an API you need, write docs/requests/${it.label.replace(':', '-')}.md. Run scripts/gen-content-index.mjs after adding the file, and the content check the architect documents.
3. In your report, list what you verified (with screenshot paths) and what is still open.
You own: figures/robotics/${it.id}.js${it.module ? `, figures/modules/${it.module}.js, figures/prompts/${it.module}.md, public/figures/modules/${it.module}.html` : ''}, figures/prompts/${it.id}.md, public/figures/robotics/${it.id}.html, src/content/robotics/${it.id}.ts, src/content/robotics/${it.id}.test.ts, src/i18n/content/en/robotics/${it.id}.json, docs/requests/${it.label.replace(':', '-')}.md.`

const PROMPTS = { board: BOARD_ITEM, 'uno-content': UNO_CONTENT, drone: DRONE_ITEM, 'quad5-content': QUAD5_CONTENT, parts: PARTS, bench: ROBO_ITEM }

phase('Items')
const results = await Promise.all(ITEMS.map(it => gate(() => agent(PROMPTS[it.kind](it), { label: it.label, phase: 'Items', schema: DONE })
  .then(r => { log(`${it.label}: ${r ? 'done' : 'FAILED'}`); return r }))))
return Object.fromEntries(ITEMS.map((it, i) => [it.label, results[i]]))
