export const meta = {
  name: 'simlab-stage2',
  description: 'SimLab stage 2: follow-up agents for the engines, the three lab UIs, the interpreters and the shell take over their finished owners\' open requests and walk every item end to end (args.only picks which)',
  phases: [
    { title: 'Continue', detail: 'engine:bench-2, engine:drone-2, ui:boardlab-2, ui:robotics-2, ui:dronelab-2, interp-2, shell-2' },
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

const REQ2 = pred => `Before you start, read every file in ${R}/docs/requests/. Handle the requests addressed to you, to ${pred}, or to the paths you now own. Mark each one you handle with a line "handled by <your label>: <what you did>" in that same file. Read ${pred}'s docs and code first: you continue its work, you don't redo it. Item agents are still landing figures and content while you work, so loop over what exists, then check again before you finish. Playwright specs live in ${R}/e2e/ (playwright.config.ts testDir); build per D12 with NEXT_DIST_DIR=.next-<your-label>, E2E_PORT on a random port 40000-49999 and E2E_SKIP_BUILD=1 after your own build.`

const ENGINE_BENCH_2 = `${HEAD}${REQ2('engine:bench and platform')}
YOUR TASK (time box: 100 minutes; label engine:bench-2): continue engine:bench and platform, both finished, now that the item agents build on the bench engine.
1. Requests: every open request addressed to engine:bench, platform, the bench engine, the sheets or the figure tools (figures/engine/bench*.js, sheets*.js, embed.js, figures/tools/**). Change the engine additively, so item figure files written against today's format keep working. Log every change in the docs/FIGURES-BENCH.md changelog (item agents re-read it).
2. Uno R3 lessons: merge the lesson circuits content:uno-r3 wrote into docs/requests/content-uno-r3.md into figures/boards/uno-r3.js (FIGURES-BENCH section 9 format), rebuild public/figures/boards/uno-r3.html, and check that every lesson circuit renders on the breadboard and schematic sheets and matches src/content/boards/uno-r3.ts.
3. Fleet check: build every bench-family figure (figures/{boards,parts,modules,robotics}/*.js) with cfbuild into ${S}/gm/stage2/bench-build/ (not public/: the item agents own their built pages), shoot each one with cfshoot against FIGURES-BENCH section 14, and look at the screenshots. Fix engine-side defects in the engine. Write item-side defects per item to docs/verify/figures-bench.md (item, what, where, screenshot path); the item verify agents fix those.
4. The engine's own tests pass, and cfbuild and cfshoot run clean.
You own: figures/engine/bench*.js, figures/engine/sheets*.js, figures/engine/embed.js, figures/tools/**, figures/vendor/**, docs/FIGURES.md, docs/FIGURES-BENCH.md, figures/prompts/README.md, figures/boards/uno-r3.js, figures/prompts/uno-r3.md, public/figures/boards/uno-r3.html, docs/verify/figures-bench.md, ${S}/gm/stage2/bench-build/.`

const ENGINE_DRONE_2 = `${HEAD}${REQ2('engine:drone')}
YOUR TASK (time box: 100 minutes; label engine:drone-2): continue engine:drone, which has finished, now that the craft agents build on the drone engine.
1. Requests: every open request addressed to engine:drone or the drone engine (figures/engine/drone*.js). Known ones: docs/requests/item-longrange.md (a craft report hook merged as extra, craft.reset, the antenna shape field), docs/requests/item-whoop.md "To engine:drone" (motor and prop details scaled from the chosen parts, craft.messages and craft.logs overrides for every MSG and LOG key, a battery plug field), docs/requests/content-quad5.md (the failsafe bench test with api.pass and the ids content uses), and the other item-*.md requests to the engine. Change the engine additively, so craft files written against today's format keep working. Log every change in the docs/FIGURES-DRONE.md changelog. For an embed or cfbuild change, write docs/requests/engine-drone-2.md (engine:bench-2 owns the platform files).
2. quad5: apply what content:quad5 asked of figures/drones/quad5.js, rebuild public/figures/drones/quad5.html, and check it against src/content/drones/quad5.ts.
3. Fleet check: build every craft (figures/drones/*.js) with cfbuild into ${S}/gm/stage2/drone-build/ (not public/), shoot each one with cfshoot against the FIGURES-DRONE checklist, and look at the screenshots. Fix engine-side defects. Write craft-side defects per craft to docs/verify/figures-drone.md.
4. The engine's own tests pass.
You own: figures/engine/drone*.js, docs/FIGURES-DRONE.md, figures/drones/quad5.js, figures/prompts/quad5.md, public/figures/drones/quad5.html, docs/verify/figures-drone.md, docs/requests/engine-drone-2.md, ${S}/gm/stage2/drone-build/.`

const UI_BOARDLAB_2 = `${HEAD}${REQ2('ui:boardlab')}
YOUR TASK (time box: 120 minutes; label ui:boardlab-2): continue ui:boardlab, which has finished, and make the Board Lab work end to end for every board.
1. Requests: everything addressed to ui:boardlab or to the Board Lab host or store. Known ones:
- docs/requests/hx-hw.md items 1-3: the run's pins, the open lesson and a world-input action in the store.
- docs/requests/hx-realtime-client.md "For ui:boardlab, ui:robotics, ui:dronelab": handle sync/hydrate in the reducer, keep store.dispatch a property, and make the code editor read-only for everyone but the baton holder while in a room.
- docs/requests/design-system.md: map the CodeMirror highlight style to the shared .tok-* classes and --code-* variables.
- the shell-app notes for page owners, and anything item agents asked of the host (docs/requests/item-*.md, content-*.md).
hx:dock is mounting the hackathon layer through <LabDock>: keep rendering it with the store and the figure handle on every board page.
2. Every board: for each board in src/content/ids.ts that has content, open its pages in a D12 production build and walk the Board checklist (docs/ARCHITECTURE.md section 10):
- the pinout and the assembly sequence
- every lesson's code edits, runs and drives the figure
- the serial monitor, and the schematic and breadboard views
- sensors and actuators can be wired
- failure modes really trigger
- progress counts (0/N) move
- the FPGA boards' Verilog LED chaser
Fix host-side bugs. Write item-side bugs per board to docs/verify/boards-<id>.md for the item verify agents.
3. A Playwright spec, e2e/boardlab.spec.ts. It visits every board's overview and first lesson in en and one other locale, runs the lesson's reference solution and sees the check pass. Run axe on the lesson page.
You own: ui:boardlab's paths (docs/ARCHITECTURE.md section 2), e2e/boardlab.spec.ts, docs/verify/boards-*.md.`

const UI_ROBOTICS_2 = `${HEAD}${REQ2('ui:robotics')}
YOUR TASK (time box: 120 minutes; label ui:robotics-2): continue ui:robotics, which has finished, and make the Robotics Lab work end to end for every bench.
1. Requests: everything addressed to ui:robotics or to the robotics host or store. Known ones:
- docs/requests/hx-realtime-client.md "For ui:boardlab, ui:robotics, ui:dronelab": handle sync/hydrate and keep store.dispatch a property. Check the allow-list of shared actions in src/lib/realtime/shared-actions.ts; if it's wrong, write docs/requests/ui-robotics-2.md.
- the shell-app and design-system notes, and anything the bench agents asked of the host (docs/requests/item-*.md).
Keep rendering <LabDock> with the store and the figure handle on every bench page (hx:dock mounts through it).
2. Every bench (the ROBOTICS_IDS that have content): in a D12 production build, walk the Robotics bench checklist (docs/ARCHITECTURE.md section 10):
- build-and-break steps with their refusals, and faults with their fixes
- modes with code
- live status, serial and current draw, and the brown-out
- practice tasks that check
- the quiz after each major step and the end quiz
- progress
Fix host-side bugs. Write item-side bugs to docs/verify/robotics-<id>.md.
3. A Playwright spec, e2e/robotics.spec.ts. It opens every bench's page in en and one other locale, and completes the first build step and the first quiz. Run axe.
You own: ui:robotics's paths (docs/ARCHITECTURE.md section 2), e2e/robotics.spec.ts, docs/verify/robotics-*.md, docs/requests/ui-robotics-2.md.`

const UI_DRONELAB_2 = `${HEAD}${REQ2('ui:dronelab')}
YOUR TASK (time box: 120 minutes; label ui:dronelab-2): continue ui:dronelab, which has finished, and make the Drone Lab work end to end for every craft.
1. Requests: everything addressed to ui:dronelab or to the Drone Lab host or store. Known ones:
- docs/requests/calc.md section 2: evaluateDesign and its checks, tileDigits, the flyMin label per craft, the defaults that hover high.
- docs/requests/item-whoop.md "To the Drone Lab host": the alt mode hint.
- docs/requests/hx-realtime-client.md: sync/hydrate, and store.dispatch stays a property.
- the item-*.md requests to the host, and the shell-app and design-system notes.
The fly page belongs to hx:race now; for fly-page needs, write docs/requests/ui-dronelab-2.md. Keep rendering <LabDock>.
2. Every craft that has content: walk the Drone checklist (docs/ARCHITECTURE.md section 10):
- the part-by-part build
- live calculations (AUW, T:W, hover %, max current, flight times) that match src/lib/drone/calc.ts
- the clickable wiring diagram
- the safety tests: smoke stopper, motor direction with props off, accelerometer calibration, the craft's own tests
- the Betaflight or ArduPilot CLI emulator with the craft's real commands
- progress
Fix host-side bugs. Write item-side bugs to docs/verify/drones-<id>.md.
3. A Playwright spec, e2e/dronelab.spec.ts. For every craft in en and one other locale: build it, run the smoke stopper, change a design pick and see the numbers change. Run axe.
You own: ui:dronelab's paths (docs/ARCHITECTURE.md section 2), e2e/dronelab.spec.ts, docs/verify/drones-*.md, docs/requests/ui-dronelab-2.md.`

const INTERP_2 = `${HEAD}${REQ2('interpreters')}
YOUR TASK (time box: 110 minutes; label interp-2): continue interpreters, which has finished. Item content agents test every lesson's and practice task's reference solution through src/lib/interp, and they file what the interpreters lack.
1. Requests: everything addressed to interpreters or src/lib/interp in docs/requests/*.md (from ui:robotics, item-*, content-*, bench agents). That covers missing APIs, device models, libraries and check kinds, for example:
- Servo, Wire, LiquidCrystal, Adafruit_SSD1306, Stepper
- MicroPython machine, neopixel and time, and CircuitPython
- Arduino-ESP32 calls and STM32 HAL
- Verilog constructs for the FPGA boards
- the rclpy shim
Implement them additively, with tests.
2. Run every content test (npx vitest run src/content). List the failures the interpreter causes and fix them. Re-run until the interpreter causes none; write content-side failures to docs/verify/<lab>-<id>.md (append a section if the file exists).
You own: src/lib/interp/**, docs/verify/interp.md, and appended sections in docs/verify/*.md.`

const SHELL_2 = `${HEAD}${REQ2('shell-app and design-system')}
YOUR TASK (time box: 90 minutes; label shell-2): continue shell-app and design-system, both finished.
1. Requests: everything addressed to shell-app or design-system in docs/requests/*.md. That includes the tsconfig cleanup (drop the .next-<label> includes), the sound toggle in SiteHeader's actions once src/components/sound exports it (the sound agent may still be working, so mount it when it's there), and FigureFrame on a paper plate (.ink-plate).
2. Repo health: run npx tsc --noEmit -p ., npx eslint . --quiet and npx vitest run. Fix what fails in your files. For failures in other agents' files, write one line per failure to docs/verify/repo-health.md: the file, the error and its owner (docs/ARCHITECTURE.md section 2, docs/hacktx/HX-CONTRACT.md H12). Keep that file current every ~20 minutes until your time box ends.
3. Shell quality pass on /en, a lab index page and an item page:
- the build output's per-route size, layout shift, and figures loading lazily
- keyboard access and screen-reader landmarks
- the language switcher keeping the path
- the 404 page
- light and dark mode, and phone width
Fix shell-side issues.
You own: shell-app's and design-system's paths (docs/ARCHITECTURE.md section 2), EXCEPT these, which wave-2 agents own now: src/components/dock/**, src/components/shell/nav.ts, src/i18n/namespaces.ts, src/i18n/messages/*/shell.json (hx:dock), src/app/[lang]/page.tsx and src/app/[lang]/about/** (hx:landing). You also own docs/verify/repo-health.md.`

const ALL = {
  'engine:bench-2': ENGINE_BENCH_2, 'engine:drone-2': ENGINE_DRONE_2,
  'ui:boardlab-2': UI_BOARDLAB_2, 'ui:robotics-2': UI_ROBOTICS_2, 'ui:dronelab-2': UI_DRONELAB_2,
  'interp-2': INTERP_2, 'shell-2': SHELL_2,
}
const pick = (args.only || Object.keys(ALL)).filter(l => ALL[l])
phase('Continue')
const results = await Promise.all(pick.map(l => agent(ALL[l], { label: l, phase: 'Continue', schema: DONE })
  .then(r => { log(`${l}: ${r ? 'done' : 'FAILED'}`); return r })))
return Object.fromEntries(pick.map((l, i) => [l, results[i]]))
