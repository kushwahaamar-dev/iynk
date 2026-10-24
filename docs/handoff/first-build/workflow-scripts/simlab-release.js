export const meta = {
  name: 'simlab-release',
  description: 'SimLab release helpers: the README with every Colorfigures prompt and the deploy steps, a fresh-eyes rehearsal of the judges demo, and a repo-wide green-build pass',
  phases: [
    { title: 'Release', detail: 'release:readme, release:rehearse, release:repo-fix (args.only picks which; args.site is the live URL)' },
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

const SITE = args.site || null

const README = `${HEAD}YOUR TASK (time box: 70 minutes; label release:readme): write ${R}/README.md for three readers: HackTX judges skimming the repo, a developer cloning it, and the original brief (docs/SPEC.md), which asks for "a README listing every Colorfigures prompt plus the deploy steps".
Contents, in this order:
- What SimLab is, in two sentences, with the live URL (${SITE || 'read it from docs/hacktx/DEPLOY.md; if it is not deployed yet, leave a clear TODO line at the top'}).
- The three labs and the hackathon layer (Meta Muse Spark partner and rooms, SerpApi "build it for real", Solana Proof of Build, Vultr relay, Tiger Data, the hardware twin), each with one line on what it does and where it lives.
- Quick start: requirements (Node 24), npm ci, .env.example (every variable and which feature it turns on; everything works without keys), npm run dev, npm run check, the e2e and figure tools.
- Architecture: a short map of the code (src/app, src/content, src/lib, figures/, server/realtime, solana/), with links to docs/ARCHITECTURE.md, docs/hacktx/*.md and docs/FIGURES*.md.
- Deploy: the steps from docs/hacktx/DEPLOY.md (Vercel, env push, the relay on Vultr, the domain, the Solana program), shortened, with a link to the full runbook. The brief asks for a one-click Vercel deploy. If \`git -C ${R} remote get-url origin\` names a public GitHub repo, add the official Deploy with Vercel button (https://vercel.com/new/clone?repository-url=<that repo>&env=<the optional variables>). Otherwise write the one-command path (\`npx vercel deploy --prod\`, zero configuration) and leave the button out: no placeholder links.
- Every Colorfigures prompt: generate the section from figures/prompts/*.md with a small script, scripts/gen-readme-prompts.mjs. It writes the prompts between <!-- prompts:start --> and <!-- prompts:end --> markers, grouped by lab (boards, parts and modules, robotics benches, drones, flight range), each with its figure name and a link to the built page. Run the script; the README must list every prompt file that exists.
- Credits and licences: the originals (MIT, with their authors and links), the Colorfigures skill, sponsors' APIs, and every npm package whose licence asks for attribution (read package.json and node_modules/<pkg>/LICENSE).
- The hackathon disclosure: the idea and the hardware research notes predate the event; all code was written during the hacking period with AI coding agents.
Plain, human prose, no marketing words. Check every link and path exists.
You own: README.md, scripts/gen-readme-prompts.mjs.`

const REHEARSE = `${HEAD}YOUR TASK (time box: 80 minutes; label release:rehearse): be a HackTX judge who has never seen SimLab. Run the demo exactly as docs/hacktx/STRATEGY.md section 7 scripts it${SITE ? `, on the live site ${SITE}` : ', on a D12 production build (NEXT_DIST_DIR=.next-rehearse)'}, at desktop and phone sizes, and in two languages. Use Playwright for the clicks and screenshots, and look at every screenshot yourself.
For each demo beat, record: did it work the first time, how long it took, what confused you, what looked broken or unfinished, and what you expected to happen. Then click through everything else a curious judge would: every lab index, three random items per lab, the passport, verify, together, about, a 404, the language switcher, dark mode, keyboard only, a slow network.
Write docs/hacktx/REHEARSAL.md: the beats with PASS or FAIL, then every issue ranked by how much a judge would notice it, each with a screenshot path and the owning files (docs/ARCHITECTURE.md section 2, HX-CONTRACT H12). Fix the small ones yourself: copy, alignment, a missing label, a broken link. Only do this where the file's owner has finished (check docs/hacktx/RESUME-STATE.md if it exists, otherwise assume the labs' item agents may still be running and leave their files alone). List the rest for the orchestrator.
You own: docs/hacktx/REHEARSAL.md, e2e/rehearsal.spec.ts, and small fixes as described.`

const REPOFIX = `${HEAD}YOUR TASK (time box: 70 minutes; label release:repo-fix): make the whole repository green for the release. Run npx tsc --noEmit -p ${R}, npx eslint ${R} --quiet, npx vitest run and a production build (NEXT_DIST_DIR=.next-repo-fix npx next build; delete the folder after). Read docs/verify/repo-health.md too. For every failure, find its cause and fix it with the smallest correct change. Before editing a file, check its mtime: if it changed in the last 10 minutes, an agent may still own it, so leave it and list it instead. Re-run until everything passes or only listed files remain. Write the result to docs/verify/release.md: what failed, what you fixed and where, and what is left with its owner.
You own: fixes in any file not changed in the last 10 minutes, docs/verify/release.md.`

const ALL = { 'release:readme': README, 'release:rehearse': REHEARSE, 'release:repo-fix': REPOFIX }
const pick = (args.only || Object.keys(ALL)).filter(l => ALL[l])
phase('Release')
const results = await Promise.all(pick.map(l => agent(ALL[l], { label: l, phase: 'Release', schema: DONE })
  .then(r => { log(`${l}: ${r ? 'done' : 'FAILED'}`); return r })))
return Object.fromEntries(pick.map((l, i) => [l, results[i]]))
