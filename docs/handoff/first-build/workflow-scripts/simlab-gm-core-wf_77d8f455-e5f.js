export const meta = {
  name: 'simlab-gm-core',
  description: 'God mode core for SimLab: contract, figure platform, app shell, design system, interpreters, flight range, drone calc, checklist A; then both figure engines with the Uno R3 and 5-inch slices; then the Board, Robotics and Drone Lab UIs and sound',
  phases: [
    { title: 'Foundation', detail: 'architect, platform, shell-app, design-system, interpreters, flight, calc, checklist-a' },
    { title: 'Engines', detail: 'Board Bench engine + Uno R3 slice, Drone engine + 5-inch slice' },
    { title: 'Labs', detail: 'Board Lab, Robotics Lab and Drone Lab UIs, sound' },
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
D13 The old code is replaced, not patched. shell-app deletes the old src/app, src/components/*.tsx and src/lib/*.ts(x) files; platform clears the old figures/ and public/figures/ files. The old versions stay in git (baseline 245763f): git show 245763f:<path>.`

const GM = `GOD MODE, DEADLINE. The user needs SimLab finished and deployed on Vercel by 18:00 CDT today (2026-10-24). About forty agents are building it in parallel in this one working tree right now, each owning different files. A complete, correct deliverable inside your time box beats a perfect one that is late.
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

const ARCH = `${HEAD}YOUR TASK (time box: 35 minutes; label architect): write the binding contract that today's build agents code against. They work in parallel and never talk to each other, so it must be exact, and short enough to read in ten minutes.
Read first: SPEC.md; the primer's rules (nextjs16-primer.md lines 9-28); colorfigures-guide.md sections 2.3 and 3.3-3.5; the headings and must-items of coverage-checklist-b.md and of checklist A (docs/research/coverage-checklist-a.md if it exists, else the item files in ${S}/checklist-a/items/); then the parts of the research docs that define lesson content, practice tasks, quizzes, drone builds, tests, CLI and courses, so the types cover everything. Skim; don't read everything in full.
Write exactly these files:
1. src/content/schema.ts — the TypeScript types for all content:
   - Boards: identity, variants, MCU and logic voltage, power inputs and limits, the pinout as rows (header, pin, label, functions, voltage, current notes), on-board LEDs and controls, the figure page and the figure part ids it uses, wireable sensors/actuators, failure modes (trigger, symptom, explanation), the assembly / power-up sequence (steps with checks), lessons.
   - Lessons: id, language ('arduino-cpp' | 'micropython' | 'python' | 'verilog'), starter code, param chips, the figure circuit to show, world model, expected serial, checks that decide completion, hints.
   - Robotics benches: board + module ids, build-and-break steps, faults, live status fields, the current-draw model, practice tasks with checks, quizzes after each major step.
   - Drones: class, frame layout, the design catalogue options feeding src/lib/drone/calc (import its CalcInput / CalcResult types with "import type" from '@/lib/drone/calc'; the calc agent is writing it right now), parts, build steps, wiring connections, safety tests (smoke stopper, motor direction with props off, accelerometer calibration, plus others from the research), firmware ('betaflight' | 'ardupilot-copter' | 'ardupilot-plane' | 'inav' | 'crazyflie') with CLI/param snippets and the CLI emulator config, flight config (physics class and parameters) and courses/missions, quizzes.
   - Text fields are keys into the item's content JSON (D5), never literal prose.
2. src/content/ids.ts — BOARD_IDS, ROBOTICS_IDS (13, kebab-case, each with the board and module ids it uses, from robotics-bench-a/b.md), DRONE_IDS, and the small per-id metadata index pages need (title key, tags).
3. scripts/gen-content-index.mjs and its output src/content/index.generated.ts (D4). Run it once.
4. docs/ARCHITECTURE.md (at most 500 lines): the module map (ASCII); the ownership table for today's work packages (list below); each schema type and who fills it; the content JSON key scheme; the progress keys (D7); the figure ↔ host contract per lab (which set/act/view values each lab sends and which state/part reports it expects, referencing guide 2.3); the lesson run flow (interp → bridge → figure; serial); how each lab page composes components; and the PER-ITEM CONTENT CHECKLISTS — exactly what each item must contain to meet the brief:
   - board: accurate pinout; assembly / power-up sequence; at least 4 progressive lessons (Uno R3: Learn Arduino's 16), each with editable code that runs and updates the figure; schematic + breadboard; serial output; wireable sensors/actuators; failure modes that really trigger. FPGA boards include a Verilog LED chaser.
   - robotics bench: build-and-break steps; practice tasks with checks; a quiz after each major step; live status, serial and current.
   - drone: the full part-by-part build; live calculations; the clickable wiring diagram; the three safety tests; CLI; flight config and course; quiz.
5. docs/DECISIONS.md: each decision you make, one line of rationale.
Today's work packages (for the ownership table): platform (figures/vendor, figures/tools, figures/engine/embed.js, docs/FIGURES.md); shell-app; design-system; interpreters (src/lib/interp); flight (figures/flight, public/figures/flight, src/lib/flight, src/components/flight); calc (src/lib/drone); engine:bench (figures/engine/bench*, the Uno R3 slice); engine:drone (figures/engine/drone*, the quad5 slice); ui:boardlab, ui:robotics, ui:dronelab, sound; then per-item figure, content and verify agents for every board, part/module, robotics bench and drone; then translation agents per language; then verification and README agents.
When done, run \`npx tsc --noEmit -p ${R}\`: your files must be clean, apart from the calc import if calc has not landed yet.
You own: src/content/schema.ts, src/content/ids.ts, src/content/index.generated.ts, scripts/gen-content-index.mjs, docs/ARCHITECTURE.md, docs/DECISIONS.md.`

const PLATFORM = `${HEAD}YOUR TASK (time box: 30 minutes; label platform): set up the figure platform every figure agent uses today. Two engine agents start the moment you finish, so be quick and exact.
1. Clear the old figure files: everything under ${R}/figures and ${R}/public/figures (they stay in git).
2. figures/vendor/colorfigures/core.js: vendor ~/.claude/skills/colorfigures/assets/core.js with the patches the guide calls for (measured-text pill widths, CF_T strings, embedded mode, the dark-host paper plate, and the Appendix E defects); list each patch with its guide section in figures/vendor/colorfigures/PATCHES.md.
3. figures/engine/embed.js from guide Appendix C (the tested bridge), using the D6 envelope and message set.
4. figures/tools/cfbuild.py from Appendix B, adapted: build one figure (e.g. \`python3 -I figures/tools/cfbuild.py boards/uno-r3\`) or all; inline vendor core + engine files + the item's scripts and data; write public/figures/<kind>/<id>.html; fail loudly on missing files. figures/tools/cfshoot.py from Appendix A, adapted to the new paths: 7 angles closed + see-through + exploded, press runs, phone, report.json, into an output dir (default ${S}/shots/<kind>-<id>).
5. Prove it: build a tiny figure (figures/_smoke/smoke.js: one box with a pressable button), shoot it, look at the shots, then delete its build output.
6. docs/FIGURES.md: layout, build and shoot commands, the bridge messages, the reserved names and top pitfalls (point to guide sections instead of copying), and the rule that each figure writes figures/prompts/<id>.md.
You own: figures/vendor/**, figures/tools/**, figures/engine/embed.js, figures/_smoke/**, docs/FIGURES.md, and the deletion of the old files in figures/ and public/figures/.`

const SHELL_APP = `${HEAD}YOUR TASK (time box: 80 minutes; label shell-app): build the app frame, state, i18n, figure host and test tooling, following nextjs16-primer.md exactly. Its rules are binding and were verified on this machine; read the rules and the sections (a)-(k) you implement.
1. Delete the old code (D13): src/app/layout.tsx, src/app/page.tsx, src/app/globals.css (the design-system agent writes the new one), src/app/boards, src/app/robotics, src/app/drones, src/components/{Shell,DroneLab,HomeDash,CodeBench,FigureFrame,BoardLab,RoboticsLab,FlightSim}.tsx, src/lib/{boards,drones,progress,text,i18n,robotics,runner}.ts(x), public/{file,vercel,next,globe,window}.svg. Touch nothing else.
2. Dependencies (you are the only agent allowed to install, so do it in your first 10 minutes): vitest 5 with jsdom and the vite pin from primer (i), @testing-library/react, @playwright/test (then \`npx playwright install chromium\`), @axe-core/playwright, and CodeMirror 6 for the code editor (@codemirror/state, @codemirror/view, @codemirror/commands, @codemirror/language, @codemirror/lang-cpp, @codemirror/lang-python, @codemirror/legacy-modes, @lezer/highlight). Scripts: dev, build, start, lint, typegen, typecheck, test, e2e, check, and prebuild/predev/pretypecheck that run scripts/gen-content-index.mjs through a tiny wrapper that skips it if it does not exist yet. Add .next-*/ to .gitignore.
3. next.config.ts: keep cacheComponents + partialPrefetching; the "/" redirect of primer (b); distDir from NEXT_DIST_DIR (D12); headers for /figures/** per primer (h).
4. src/app/[lang]/layout.tsx (+ not-found.tsx, [...rest]/page.tsx) per primer (a), (c), (g), (k): html lang/dir, fonts, metadata with the hreflang helper, the inline theme script (InlineScript client component, suppressHydrationWarning), the skip link, and the header/footer from the design-system agent: import { SiteHeader, SiteFooter } from '@/components/shell' with props { lang: Locale } (written in parallel; keep the import even if it lands after you).
5. src/i18n: config.ts (LOCALES, DEFAULT_LOCALE, LOCALE_NAMES, LANG_COOKIE = 'simlab-lang', htmlLang()), the server dictionary loader of primer (f) that merges the namespace files (D5) — typed, with the English files defining the key types — a getContentText(lang, lab, id) loader for the content JSON, and a typed t() helper for server and client. A missing namespace or content file must fail the build with a clear message, never silently fall back. Your namespace is common: create all six locale files at the start (English), translate them before you finish.
6. src/lib/progress and src/lib/settings: the D7 store with useSyncExternalStore and a server snapshot (primer d), storage events across tabs, a versioned migration hook, and helpers (markDone, isDone, count(prefix, total) → {done,total}, recordQuiz, recordBest, useSettings, setSetting). Unit tests.
7. src/components/figure: FigureFrame and the bridge per D11, guide Appendix D and primer (e); typed message unions; unit tests for the message handling.
8. Tooling: vitest.config.ts; playwright.config.ts (webServer = next start on a random port with its own NEXT_DIST_DIR); e2e/shell.spec.ts (every locale's dashboard renders, the language switch keeps the path, the theme toggle persists, "/" redirects) with an axe check.
9. At the end: NEXT_DIST_DIR=.next-shell-app npx next build must pass for your routes (other routes may still be missing); run your e2e against it; delete .next-shell-app.
You own: package.json, package-lock.json, .gitignore, next.config.ts, tsconfig.json, eslint.config.mjs, vitest.config.ts, playwright.config.ts, e2e/shell.spec.ts, src/app/[lang]/layout.tsx, src/app/[lang]/not-found.tsx, src/app/[lang]/[...rest]/**, src/i18n/** except the other namespaces' message files, src/i18n/content/** and src/i18n/figures/**, src/lib/progress/**, src/lib/settings/**, src/components/figure/**, and the deletions in step 1.`

const DESIGN = `${HEAD}YOUR TASK (time box: 80 minutes; label design-system): build SimLab's look, its shared component library, the header/footer, and the dashboard and about pages.
Read: SPEC.md (visual engine, palette); the colorfigures skill (SKILL.md, README.md, and two or three example pages in assets/examples — screenshot them with Playwright to absorb the hand-inked look); colorfigures-guide.md 1.2 (palettes) and 2.3 (the dark-host paper-plate rule); primer (a), (d), (k); the UI sections of learn-arduino.md (sidebar, progress card, callouts, info-card tabs) and the old-UI findings in current-simlab-audit.md.
Build:
1. src/app/globals.css: Tailwind v4 theme tokens — paper, ink, the five palettes (tomato, mustard, mint, cobalt, blush; light/mid/dark bands as in core.js), technical monochrome greys; dark mode via [data-theme] and prefers-color-scheme with the paper-plate rule; hand-drawn ink borders and offset ink shadows; visible focus rings; reduced motion.
2. src/components/ui: Button, IconButton, Toggle, SegmentedControl, Tabs, Card, Chip, ProgressBadge ("3/16"), Meter, Stat, Callout, Kbd, Sheet (mobile drawer), Tooltip, Stepper, Dialog, CodeBlock, VisuallyHidden, SkipLink, plus an index.ts barrel. Correct roles, keyboard support and focus management; 44 px touch targets; responsive. Unit tests where behaviour matters (Tabs keyboard, Dialog focus trap).
3. src/components/shell: SiteHeader({ lang }) with the lab navigation, the language picker (writes cookie simlab-lang, then router.push to the same path in the new locale; primer b and d), the theme toggle (through src/lib/settings, written in parallel by shell-app — use its useSettings/setSetting), a slot for the sound toggle (added later by another agent), and mobile navigation; SiteFooter({ lang }) with credits. Export both from src/components/shell/index.ts.
4. src/app/[lang]/page.tsx: the dashboard — three lab cards (Board Lab, Robotics Lab, Drone Lab) with live progress from src/lib/progress and totals from src/content (ids.ts and the generated index from the architect), a "continue where you left off" card, and an ink-drawn hero. Use the primer's page pattern (sync default export; await params in an async child inside Suspense).
5. src/app/[lang]/about/page.tsx: what SimLab is, credits to the three originals with their MIT licence (see SPEC.md's interpretation notes), and the Colorfigures credit. Replace the default favicon with a SimLab icon (src/app/icon.svg; delete src/app/favicon.ico).
6. Your UI strings: namespace shell. Create src/i18n/messages/<lang>/shell.json for all six locales at the start (English) and translate es, fr, de, zh, hi before you finish.
You own: src/app/globals.css, src/app/icon.svg, src/app/favicon.ico (delete), src/components/ui/**, src/components/shell/**, src/app/[lang]/page.tsx, src/app/[lang]/about/**, src/i18n/messages/*/shell.json.`

const INTERP_TASK = `ORIGINAL TASK (for reference; the god-mode deliverables after it replace its step 4):
1. Requirements. Collect them from the brief and the research: every lesson sketch in learn-arduino.md, every mode or sketch in robotics-bench-a/b.md, and what each Board Lab board needs (Uno R3/R4, Nano, ESP32, ESP32-S3, NodeMCU, Pico family, Nucleo-F401RE, micro:bit V2, Pi 4/5, Basys 3, DE10-Lite).
   (a) Arduino C++ subset: types including float/double/long/unsigned/byte/bool/char/String/uint8_t-style; arrays, const, #define, functions, globals, static, volatile; integer width and overflow per target; the Arduino API (millis, micros, delay, delayMicroseconds, pinMode, digitalRead/Write, analogRead/Write, tone, pulseIn, attachInterrupt, map, constrain, random, bit ops); Serial; the libraries the lessons need: Servo, Wire, SPI if needed, AccelStepper, Adafruit_PWMServoDriver, an SSD1306/U8g2-style OLED, NeoPixel or rgbLedWrite, ESP32 ledc, WiFi/WebServer for ESP32 and ESP8266, Arduino_LED_Matrix for R4 WiFi, QTRSensors, an MPU6050 library or raw Wire.
   (b) A MicroPython/CPython subset: machine (Pin, PWM, ADC, I2C, Timer), time, network for Pico W; the microbit module; gpiozero; rclpy with Node, publishers, timers and geometry_msgs Twist; f-strings, classes with super(), and the exceptions lessons need.
   (c) A Verilog subset: module ports, wire/reg, assign, always @(posedge clk) with nonblocking assignment, always @*; case, if, vectors, slicing, concatenation, replication, parameter/localparam and parameter overrides, counters; 7-segment and LED chaser designs for Basys 3 (100 MHz clk, 16 sw, 16 led, 5 btn, 4-digit 7-seg) and DE10-Lite (50 MHz, 10 sw, 10 led, 2 keys, 6 HEX displays).
2. Survey existing options (done in your earlier runs; see their results).
3. The hard parts to prove: non-blocking delay on a virtual clock that the UI drives per frame, interrupts preempting loop(), 16-bit int overflow on AVR, friendly compile errors with line and column, an instruction budget so infinite loops cannot freeze the tab, and one simulated second of Blink in well under a millisecond of wall time. Golden programs: Learn Arduino's Blink, button (with debounce), knob (analogRead to analogWrite), TMP36 (float math) and servo sweep (Servo.h); a reaction timer with attachInterrupt + millis; a MicroPython Pico blink and button, a micro:bit display + button program, and a gpiozero LED + Button program; an rclpy teleop publisher on a timer; a Verilog LED chaser with a parameter override and a switch-to-LED + 7-seg decoder.`

const INTERP = `${RESUME(`${S}/interp/: survey-scripts/ and survey/ hold the library survey; sizes/ the minified sizes; results/ the measurements; proto/ the recommended prototype (src/, test/, bench/); patches/ edit notes. ${tails('interpreters')}`)}${HEAD}${INTERP_TASK}

GOD-MODE DELIVERABLES (time box: 100 minutes; label interpreters). The survey and prototypes exist; now ship the interpreters as production code:
1. src/lib/interp/** (strict TypeScript, no new npm dependencies): the Arduino C++ subset, the MicroPython/Python subset (machine, time, the network sim for Pico W, microbit, gpiozero, rclpy with Twist), the Verilog subset (with parameter overrides), the virtual clock and scheduler (non-blocking delay, interrupts preempting loop, millis/micros, an instruction budget), the board World (pins, ADC, PWM, timers, interrupts, serial in/out, I2C device models incl. MPU6050, PCA9685, SSD1306 and a 16x2 LCD, displays incl. the micro:bit matrix and 7-segment, a Wi-Fi/HTTP sim), friendly errors with line/column, and target profiles for all 12 boards (D3) in src/lib/interp/profiles.ts (int width, ADC bits, PWM pins, logic voltage, LED pins incl. active-low and RGB, aliases such as A0, LED_BUILTIN, D4, GP25).
2. A small host API with TSDoc, e.g. createRun({ board, language, source, world? }) → { start(), stop(), step(ms), reset(), input(pin, level), serialWrite(text), on('serial'|'pins'|'error'|'state', fn) }, plus compact pin snapshots that the Board Lab sends to the figure at most 30 times a second.
3. Vitest tests (src/lib/interp/**/*.test.ts) running all the golden programs; all pass; one simulated second of Blink < 1 ms wall time.
4. docs/research/interpreters.md, at most 300 lines: the recommendation and evidence (survey table, measurements), the API, the supported subsets, the unsupported-feature errors, the profiles, the test list.
You own: src/lib/interp/**, docs/research/interpreters.md.`

const FLIGHT_TASK = `ORIGINAL TASK (for reference; the god-mode deliverables after it replace its step 4):
1. Read the flight sections of drone-lab-a.md fully (multirotor physics, battery model, input, range API, checkpoints/gates, iso chase view, FPV + OSD, phone layout, defects) and drone-lab-b.md's flight content: each craft's modes, autopilots, wing and VTOL physics, ranges and missions. The original range code is ${S}/orig/drone/04-.js and the flight parts of ${S}/orig/drone/03-fig01-5-inch-freestyle-fpv-quad.js; write your own code.
2. A standalone range page in the Colorfigures ink look: an iso chase view of a moving craft over a world of about 150-300 primitives (boxes, houses, trees, poles, gates, a pad), and an FPV perspective view with near-plane clipping, ground, hills, solids, gate rings and an OSD (volts, amps/mAh, timer, altitude, speed, mode, a horizon with the correct pitch sign, an arrow to the next target). Rendering approaches compared and measured (done in your earlier runs).
3. The input layer: keyboard (WASD/arrows, Space arm/disarm, V FPV, R reset), two on-screen touch sticks (a throttle that does not spring back in manual modes) and the Gamepad API mapped to RC channels; a fixed-step physics loop (10 ms substeps, dt clamp).`

const FLIGHT = `${RESUME(`${S}/flight/ (src/ prototype modules: physics, course, world, iso-svg, iso-canvas, fpv, osd, input, gamepad-panel, loop, calc, pilot, battery, courses; test/ unit tests; tools/ bench, shots, e2e and filter-region probes; results/ bench logs and the filter-region study; dist/range.html the built page) and ${S}/shots/flight-spike/ (screenshots). ${tails('flight-render')}`)}${HEAD}${FLIGHT_TASK}

GOD-MODE DELIVERABLES (time box: 100 minutes; label flight):
1. The range as production code: sources in figures/flight/ (from your prototype), built into one self-contained page public/figures/flight/range.html (keep its build script in figures/flight/, or use figures/tools/cfbuild.py if it fits), hosted by iframe with the D6 bridge envelope.
2. src/lib/flight: the typed host API (config in: craft class, calculator outputs such as AUW, thrust per motor, battery cells/capacity and hover throttle, the mode, course/mission data; events out: armed, checkpoint, lap, crash, landed, battery, best lap, mission step); physics modules shared by multirotor, tricopter (servo yaw), octo (motor-out), wing, VTOL and swarm, with Vitest tests including agreement with the hover throttle of src/lib/drone/calc (the calc agent writes it now); and the course/mission data format, with the 5-inch quad's course fixed per the original's defect list (visible gates, reachable checkpoints, the correct horizon pitch sign, hover/battery cut-out, real wind, design changes don't wipe the flight, the craft never vanishes inside buildings).
3. src/components/flight/FlightRange.tsx: the host component on FigureFrame (D11; shell-app is writing it now; if it isn't there yet, code against the D11 API), with keyboard controls (WASD/arrows, Space arm, V FPV, R reset), on-screen sticks for touch, the Gamepad API with a mapping UI, angle/acro (and craft-specific) modes, and an accessible controls legend. UI strings: namespace flight — create src/i18n/messages/<lang>/flight.json for all six locales at the start (English) and translate before finishing.
4. docs/research/flight-render.md, at most 250 lines: the recommendation with measurements, the module layout, the host API, the data formats, the defect fixes, the budgets. Another agent will add the courses and physics parameters for the other twelve crafts from your doc and code, so make the data format exact.
You own: figures/flight/**, public/figures/flight/**, src/lib/flight/**, src/components/flight/**, src/i18n/messages/*/flight.json, docs/research/flight-render.md.`

const CALC = `${HEAD}YOUR TASK (time box: 40 minutes; label calc): the drone design calculator as a tested library.
Read: drone-lab-a.md (the calculator section and Appendix A, the golden table of 108 combinations), drone-lab-b-calc-matrix.md (234 combinations across Fig 05-13), and the per-craft calc notes in drone-lab-b.md. The originals' formulas, to be kept identical so the golden tables reproduce exactly: V = cells·3.7; krpm = KV·V/1000; thrust = kThrust·pf·krpm²; AUW = Σfixed + n(motor + prop) + batt; T:W = n·thrust/AUW; hoverThr = √(AUW/(n·thrust)); hoverA = AUW/(gPerW·eff)/V; hoverMin = 0.8·Ah/hoverA·60; fly = 0.42·hover; maxA = n·thrust/(2·eff)/V. Check these against the research docs first; the docs win.
Write src/lib/drone/calc.ts: exported types CalcInput and CalcResult (the content schema imports them), calc(), and helpers for the Drone Lab (warnings such as T:W too low, over-current, hover above 60 %, flight time). Each craft's catalogue of design options lives in its content file, not here. Write src/lib/drone/calc.test.ts reproducing every row of both golden tables; extract the tables with a script into src/lib/drone/__fixtures__/.
You own: src/lib/drone/**.`

const CHECK_A = `${RESUME(`${S}/checklist-a/: items/*.txt holds the section items written so far (01-spec through 54-aud); build.py and merge_sources.py assemble them; plus header.md, gaps.md and preview.md. ${tails('checklist-a')}`)}${HEAD}YOUR TASK (time box: 35 minutes; label checklist-a): write ${R}/docs/research/coverage-checklist-a.md, the first half of the master coverage checklist. It covers:
(1) every requirement in ${R}/docs/SPEC.md (global requirements, Board Lab, Robotics Lab, Drone Lab, execution order), split into atomic items with id prefix SPEC-;
(2) everything in learn-arduino.md (prefix LA-): every lesson's circuit, parameters, interactions, simulation constants and serial behaviour; the UI; i18n; persistence; accuracy corrections;
(3) everything in robotics-bench-a.md (prefix RBA-) and robotics-bench-b.md (prefix RBB-): the engine, every figure's parts, modes, stats, faults, quiz and practice task, every defect and accuracy note;
(4) the defects in current-simlab-audit.md (prefix AUD-), as must-not items.
The master checklist is a requirements traceability list that the verification wave will check against, so it must be complete, atomic and testable. Every item has: id (the prefix, then a 3-digit number); statement (one testable sentence: what SimLab must or must not do); source (file plus section or line numbers); priority (must or should: brief items and original features are must); verify (unit / e2e / screenshot / review). One markdown table per area, with a count summary at the top. For every defect the research lists in an original, write a must-not item with the corrected behaviour; for every accuracy correction, write the correct fact as a requirement. Do not invent features; list brief needs no source covers in a final gaps section. The language requirement is now D1's six locales.
You own: docs/research/coverage-checklist-a.md.`

const BENCH = `${HEAD}YOUR TASK (time box: 100 minutes; label engine:bench): build the Board Bench figure engine and the first complete board figure, the Arduino Uno R3. This is the vertical slice that every other board, part, module and robotics bench will copy from your code and your doc, starting the moment you finish.
Read: docs/FIGURES.md (the platform, just written); colorfigures-guide.md sections 1, 2.3, 3.1-3.4, 4, 5 and Appendix E; docs/ARCHITECTURE.md and src/content/schema.ts (the contract, being written now; read them as soon as they exist, at the latest before you write content); docs/facts/uno-r3.md (the verified fact sheet; if it isn't there yet, use ${S}/facts-dl/uno-r3/ and the research docs); learn-arduino.md (lesson 1 Blink and its circuit) and robotics-bench-a.md (the engine: defineBoard, build flow, faults, Fig 01 Uno).
Build:
1. figures/engine/bench.js (split into several files if large): define boards, modules and parts as data; board outline, holes, headers with pin labels, ICs, passives, connectors, LEDs, buttons, silkscreen; build groups smd/low/tall/last; the build flow (place part by part, polarity checks with refusal messages); faults (pop/hot/dark, plus the brief's reverse polarity, brown-out, wrong voltage and cold solder; leave out / remove any part, including single SMD parts); on-board controls (RESET, BOOT, BOOTSEL, slide switches, buttons); modes out(st,t) and serial; see-through with labelled, animated internals (e.g. current flow); exploded view; labels; palettes; phone. The breadboard scene, and the schematic and breadboard sheets: hand-inked, clickable, synced with the 3D figure (selection, live pin values). Embedded mode: accept "set" for pin levels/PWM from the host (interpreter output at up to 30 Hz), the lesson circuit to show, and the view (iso, breadboard, schematic, see-through, exploded); report discrete state, part clicks and button presses. The engine must also cover what the other boards need: Nano (mini-USB, TQFP), UNO R4 (RA4M1, LED matrix on the WiFi), ESP32/ESP32-S3 dev boards (modules with antennas, BOOT/EN, RGB LED), NodeMCU, Pico family (castellated pins), Nucleo-F401RE (Morpho headers, ST-LINK), micro:bit V2 (edge connector, 5x5 matrix, buttons A/B, touch logo), Pi 4/5 (40-pin header), Basys 3 and DE10-Lite (switches, LEDs, 7-segment displays).
2. figures/parts/: breadboard, LED (colours), resistor (colour bands from the value), jumper wire — the parts the Blink lesson needs, as reusable parts.
3. figures/boards/uno-r3.js: the Uno R3 with geometry and part positions from the fact sheet (68.6 x 53.3 mm, every IC, crystal/resonator, regulator, USB-B, DC jack, headers, LEDs L/TX/RX/ON, reset button, ICSP headers, mounting holes), pin map, power tree, faults, the Blink circuit.
4. Build public/figures/boards/uno-r3.html and verify with cfshoot (all angles, see-through, exploded, press runs, phone). Look at the screenshots yourself and fix what is wrong. Write its Colorfigures prompt to figures/prompts/uno-r3.md.
5. src/content/boards/uno-r3.ts plus src/i18n/content/en/boards/uno-r3.json: an initial content item per schema.ts with the pinout, the assembly sequence and lesson 1 Blink (code that runs in src/lib/interp once it lands), so the Board Lab UI has a real item to develop against. Another agent will add the other 15 lessons later. Run scripts/gen-content-index.mjs after adding the file.
6. docs/FIGURES-BENCH.md: how to author a board, a part, a module and a robotics bench with this engine — the data format, faults, sheets, bridge fields, the verification checklist, and the Uno as a worked example. The board, module and bench agents will work only from this doc and your code, so make it exact.
You own: figures/engine/bench*.js, figures/engine/sheets*.js, figures/parts/{breadboard,led,resistor,wire}.js, figures/boards/uno-r3.js, figures/prompts/uno-r3.md, public/figures/boards/uno-r3.html, src/content/boards/uno-r3.ts, src/i18n/content/en/boards/uno-r3.json, docs/FIGURES-BENCH.md.`

const DRONE = `${HEAD}YOUR TASK (time box: 100 minutes; label engine:drone): build the Drone figure engine and the first complete drone figure, the 5-inch freestyle quad (quad5). This is the vertical slice the other twelve drone agents will copy from your code and your doc, starting the moment you finish.
Read: docs/FIGURES.md (the platform); colorfigures-guide.md sections 1, 2.3, 3.1-3.3, 3.5, 4, 5 and Appendix E; docs/ARCHITECTURE.md and src/content/schema.ts (being written now; read them as soon as they exist, at the latest before you write content); docs/facts/quad5.md (if it isn't there yet, use ${S}/facts-dl/quad5/ and the research); drone-lab-a.md (the engine and Fig 01) and drone-lab-b.md (to see what the other crafts need).
Build:
1. figures/engine/drone.js (split into several files if large): frame layouts for every craft class (5-inch X, 65 mm whoop with ducts, 3-inch cinewhoop with ducts, 7-inch long-range X, stretched-X racer, F450/X500 GPS quad, delivery quad with a companion computer, hexacopter with a spray tank, flying wing, tricopter tiltrotor VTOL QuadPlane, Crazyflie swarm, Y3 tricopter with a tail servo, octocopter), the pieces with part ids FRAME MOTORS ESC WIRES FC XT60 CAM RX VTX TOP BATT PROPS (and craft-specific extras); the part-by-part build with polarity and order mistakes, "Build it for me" and "Take it apart"; the clickable wiring sheet (hand-inked, synced with the 3D figure); the safety tests: smoke stopper, motor direction with props off (correct spin directions per layout, prop orientation), accelerometer calibration (level), the XT60 plug fault; see-through with labelled, animated internals (current flow, ESC signals); exploded view; labels; palettes; phone. Embedded mode: accept "set" for the design options from the host calculator, the build step and the test to run; report discrete state, part clicks and button presses.
2. figures/drones/quad5.js: the 5-inch quad with real geometry from the fact sheet; build public/figures/drones/quad5.html; verify with cfshoot (all angles, see-through, exploded, press runs, phone); look at the shots and fix what is wrong. Write its Colorfigures prompt to figures/prompts/quad5.md.
3. src/content/drones/quad5.ts plus src/i18n/content/en/drones/quad5.json: an initial content item per schema.ts (catalogue options, parts, build steps, wiring, the three tests, the Betaflight CLI from the fact sheet), so the Drone Lab UI has a real item to develop against. Run scripts/gen-content-index.mjs after adding the file.
4. docs/FIGURES-DRONE.md: how to author a drone with this engine — the data format, build steps, tests, wiring sheet, bridge fields, the verification checklist, and quad5 as the worked example. The drone agents will work only from this doc and your code, so make it exact.
You own: figures/engine/drone*.js, figures/drones/quad5.js, figures/prompts/quad5.md, public/figures/drones/quad5.html, src/content/drones/quad5.ts, src/i18n/content/en/drones/quad5.json, docs/FIGURES-DRONE.md.`

const UI_COMMON = `Integrate with what exists and code against the contracts for what doesn't yet: docs/ARCHITECTURE.md + src/content/schema.ts (contract), src/components/ui and src/components/shell (design system), src/components/figure (FigureFrame, D11), src/lib/progress (D7). The figure engines and slice items (docs/FIGURES-BENCH.md, docs/FIGURES-DRONE.md, public/figures/boards/uno-r3.html, public/figures/drones/quad5.html, src/content/boards/uno-r3.ts, src/content/drones/quad5.ts) are being finished by other agents while you work; check for them at your start and again halfway, and integrate as soon as they exist. Until then use a small test fixture in your own folder.
Pages follow the primer's patterns (sync default export, await params in an async child inside Suspense, generateStaticParams from src/content for every locale, unknown ids → notFound()). Accessibility: a keyboard map (shown in a "?" dialog), ARIA for every control, focus handoff to and from the iframe, the FigureFrame part-button fallback. Phone: stacked panels and sheets, 44 px targets. Show progress as "done/total". No placeholder text.`

const UI_BOARD = `${HEAD}YOUR TASK (time box: 120 minutes; label ui:boardlab): build the Board Lab pages and components.
Read: docs/ARCHITECTURE.md (lab composition and figure contract), the UI sections of learn-arduino.md (code card, param chips, serial monitor, lessons strip, inspector, schematic panel, flow overlay, viewbar, settings, shortcuts, phone layout) and the Board Lab items of the coverage checklists.
Build:
- src/app/[lang]/boards/page.tsx: the 12 boards with key facts and progress "n/N".
- src/app/[lang]/boards/[board]/page.tsx: the board workspace — the figure, the pinout table, the assembly / power-up sequence with checks (progress board:<id>:assembly), and the lesson list with progress.
- src/app/[lang]/boards/[board]/[lesson]/page.tsx: the lesson — the figure in its iframe; the editable code (CodeMirror 6; C++, MicroPython/Python or Verilog by lesson); Run / Stop / Reset to lesson code; the serial monitor (status Stopped/Running/Uploading, input line, baud); param chips; schematic and breadboard toggles (figure views); a wire-in panel for sensors/actuators; a failure-mode panel that triggers faults in the figure and explains them; checks that mark the lesson done; next/previous lesson.
- The run loop in src/lib/boardlab: src/lib/interp's run API → the figure ("set" pin levels/PWM, at most 30 Hz) and the serial monitor; figure events (button presses, part clicks) → interpreter inputs. The interpreters land from another agent during your run; code against interpreters.md / their exported API.
- UI strings: namespace boardlab — create src/i18n/messages/<lang>/boardlab.json for all six locales at the start (English), translate es, fr, de, zh, hi before you finish.
- Tests: unit tests for the run loop (Blink toggles pin 13 every 1000 ms of virtual time; serial lines) and e2e/boardlab.spec.ts (Uno R3 Blink: open the lesson, Run, the figure's LED state changes, serial shows output; keyboard-only path; axe).
${UI_COMMON}
You own: src/app/[lang]/boards/**, src/components/boardlab/**, src/lib/boardlab/**, src/i18n/messages/*/boardlab.json, e2e/boardlab.spec.ts.`

const UI_ROBO = `${HEAD}YOUR TASK (time box: 110 minutes; label ui:robotics): build the Robotics Lab pages and components.
Read: docs/ARCHITECTURE.md; robotics-bench-a.md (the engine UI: build flow and refusal messages, status precedence, stats, serial, quiz, mastery, nav, sound, labels, URL hooks, mobile) and robotics-bench-b.md (Fig 07-13 and the practice tasks); the Robotics items of the coverage checklists.
Build:
- src/app/[lang]/robotics/page.tsx: the 13 benches (from src/content/ids.ts) with what each teaches and progress "n/N".
- src/app/[lang]/robotics/[bench]/page.tsx: the bench workspace — the figure (it reuses the board figures with motor drivers, sensors and power stages); the build-and-break workflow (steps with checks, "break it" faults and their diagnosis); live status, serial output and the current draw (a live meter from the bench's current model); practice tasks as real exercises with checks (e.g. reaction timer with interrupt + debounce + millis; closed-loop line follower with tunable Kp/Kd; a PCA9685 arm) that run code through src/lib/interp where the task needs code; a quiz after each major step (progress robotics:<id>:quiz:<quizId>); progress for steps and tasks.
- src/lib/robotics: the step/task/quiz logic and the current-draw model helpers, with unit tests.
- UI strings: namespace robotics — create src/i18n/messages/<lang>/robotics.json for all six locales at the start (English), translate before you finish.
- e2e/robotics.spec.ts: index renders; a bench page with a fixture or the first real bench; quiz flow; keyboard; axe.
${UI_COMMON}
You own: src/app/[lang]/robotics/**, src/components/robotics/**, src/lib/robotics/**, src/i18n/messages/*/robotics.json, e2e/robotics.spec.ts.`

const UI_DRONE = `${HEAD}YOUR TASK (time box: 120 minutes; label ui:dronelab): build the Drone Lab pages and components.
Read: docs/ARCHITECTURE.md; drone-lab-a.md (the lab engine UI: design calculator, build graph, Build it for me / Take it apart, smoke stopper, motor direction, accelerometer calibration, plug fault, arming rules, wiring diagram, lesson panels, stats, flight modes, phone layout) and drone-lab-b.md (Fig 05-13 differences); the Drone items of the coverage checklists.
Build:
- src/app/[lang]/drones/page.tsx: the 13 crafts with class, key stats and progress "n/N".
- src/app/[lang]/drones/[drone]/page.tsx: the workspace — the figure; the design options with live calculations from src/lib/drone/calc (AUW, T:W, hover %, max current, flight times; warnings); the part-by-part build (synced with the figure; progress drone:<id>:build); the clickable wiring diagram (figure sheet view); the safety tests with their real procedures (smoke stopper, motor direction with props off, accelerometer calibration, plus the craft's extras; progress drone:<id>:test:<testId>); a CLI console that emulates the craft's firmware (Betaflight, ArduPilot, INAV or cflib, per the content's CLI config: status/get/set/save/diff-style commands with real syntax and helpful errors); the quiz.
- src/app/[lang]/drones/[drone]/fly/page.tsx: the flight range through src/components/flight/FlightRange (flight agent), fed with this design's calculator outputs; arming rules; best laps saved (progress drone:<id>:course:<courseId>).
- src/lib/dronelab: build/test/CLI logic with unit tests (the CLI emulator especially).
- UI strings: namespace dronelab — create src/i18n/messages/<lang>/dronelab.json for all six locales at the start (English), translate before you finish.
- e2e/dronelab.spec.ts: quad5 — change a design option and see the calc update, run the three safety tests, use the CLI, open the fly page, arm with Space; keyboard; axe.
${UI_COMMON}
You own: src/app/[lang]/drones/**, src/components/dronelab/**, src/lib/dronelab/**, src/i18n/messages/*/dronelab.json, e2e/dronelab.spec.ts.`

const SOUND = `${HEAD}YOUR TASK (time box: 45 minutes; label sound): host-level synthesised audio (S10): a gentle lofi loop; named effects (click, snap, pop, beep, success, error, arm, disarm, fault); a motor hum whose pitch and level follow a 0-1 throttle value — all with the Web Audio API, no audio files. Off until the user opts in (autoplay policy); respects settings.sound and settings.lofi (src/lib/settings) and prefers-reduced-motion where relevant; survives navigation (one provider mounted in the layout).
Expose useSound() → { play(name), setHum(level | null) } and a SoundToggle (Effects / Lofi). Add the toggle to SiteHeader's sound slot in src/components/shell and mount the provider in src/app/[lang]/layout.tsx — the design-system and shell-app agents have finished those files; make only those small edits. Add your few strings to the existing namespaces (common for the provider, shell for the toggle) in all six locales, translated. Provide a helper that maps figure bridge events (see docs/FIGURES*.md) to effects. Unit-test the scheduling logic.
You own: src/lib/sound/**, src/components/sound/**, and the small edits named above.`

const run = (prompt, label, ph) => agent(prompt, { label, phase: ph, schema: DONE }).then(r => { log(`${label}: ${r ? 'done' : 'FAILED'}`); return r })

phase('Foundation')
const archP = run(ARCH, 'architect', 'Foundation')
const platP = run(PLATFORM, 'platform', 'Foundation')
const appP = run(SHELL_APP, 'shell-app', 'Foundation')
const dsP = run(DESIGN, 'design-system', 'Foundation')
const interpP = run(INTERP, 'interpreters', 'Foundation')
const flightP = run(FLIGHT, 'flight', 'Foundation')
const calcP = run(CALC, 'calc', 'Foundation')
const chkP = run(CHECK_A, 'checklist-a', 'Foundation')

const enginesP = platP.then(() => Promise.all([
  run(BENCH, 'engine:bench', 'Engines'),
  run(DRONE, 'engine:drone', 'Engines'),
]))
const labsP = Promise.all([archP, appP, dsP]).then(() => Promise.all([
  run(UI_BOARD, 'ui:boardlab', 'Labs'),
  run(UI_ROBO, 'ui:robotics', 'Labs'),
  run(UI_DRONE, 'ui:dronelab', 'Labs'),
  run(SOUND, 'sound', 'Labs'),
]))

const [arch, plat, app, ds, interp, flight, calc, chk, engines, labs] = await Promise.all([archP, platP, appP, dsP, interpP, flightP, calcP, chkP, enginesP, labsP])
return { arch, plat, app, ds, interp, flight, calc, chk, engines, labs }