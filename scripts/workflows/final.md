# Final pass: test everything, research, polish every page (Amar, 2026-10-25 02:02)

Amar's words (CONTEXT.md §5): "make sure every single thing is working and, if there can be made any improvement, do
research ... the UI should be top class, utilize the entire page dimension. Make it chic, minimalistic,
best-of-the-best UI. There should be literally no room for improvement." Planned by the driver at 02:30 CDT. Every
agent runs in the same working tree (`/Users/amar/Codes/ak/simlab`) and owns only the files its section lists.

| Phase | Labels | What |
|---|---|---|
| 1. Look | F-research, F-audit-shell, -boards, -robotics, -drones, -panels, F-fresh-eyes | research and audit, no code |
| 2. Decide | F-direction | one spec from the seven reports, no code |
| 3. Foundation | F-build-shell | the shared components, page frame and the pages no lab owns |
| 4. Surfaces | F-build-boards, -robotics, -drones, -panels | each lab and the panels, on the new foundation |
| 5. Check | F-review | every page again; what is still short of the spec |

The driver then fixes or relaunches what F-review lists, and runs gate 3 (BUILD-PLAN §6 in all six languages).

## Shared rules (every final-pass agent)

1. Shared rules 2, 3, 7, 8, 9, 10 and 13 of `scripts/workflows/phase2.md` apply word for word (the hackathon rule,
   Node 24 and Next.js 16.4, others' half-done work, careful git with only your paths and no agent attribution lines,
   secrets, phones, the last step). Read `HANDOFF.md` ("Rules that never change") and `docs/SPEC.md` (the brief).
2. **Research is knowledge, never code.** Read any site, article or design system you like for principles, but write
   every line yourself: no CSS, markup or snippets copied from a website, a library's docs beyond ordinary API use, or
   `docs/research/`. No new npm dependencies.
3. **The look stays SimLab's.** SPEC.md fixes it: hand-inked, paper texture, the five palettes (tomato, mustard, mint,
   cobalt, blush) plus technical monochrome, light and dark mode, and figures made with Colorfigures. "Chic and
   minimal" means within that: fewer borders and boxes, calmer type, more air where it helps and density where the
   work needs it, one clear action per area, and the figure (the product) as large as the screen allows. Don't
   restyle the figures themselves (`figures/**`, `public/figures/**` are out of scope).
4. **The whole screen.** On a laptop (1440 × 900) and a wide screen (1920 × 1080) a lab page is a workspace: the
   figure and its panels fill the viewport the way an IDE or a design tool does, with no wasted gutters and nothing
   important below the fold. Reading pages (landing, about, catalogues) keep a comfortable line length. On a phone
   (390 × 844) every page fits with no sideways scroll, and touch targets are at least 44 px.
5. **Six languages.** Every layout must hold German (long words), Hindi (tall script) and Chinese as well as English.
   A new UI string goes into all six `src/i18n/messages/<lang>/<ns>.json` files, translated by you in the register
   the file already uses (`src/i18n/messages.test.ts` checks parity). Keep new strings few.
6. **Don't break what works.** Keep every route, every `data-testid`, every keyboard shortcut and the reduced-motion
   path. Keep the visible labels that `docs/hacktx/VIDEO.md` and `docs/hacktx/PITCH.md` tell the presenter to click;
   if a label must change, list old and new in your report. The e2e specs (`e2e/*.spec.ts`) and the axe checks in them
   must still pass; change a spec only where a selector you deliberately changed requires it, in the spec your section
   names.
7. **Look at what you make.** Drive the pages with Playwright from a script in your own scratchpad subfolder
   (`<scratchpad>/<your label>/`, never the shared root: agents overwrite each other's files there), take screenshots
   at 1440 × 900, 1920 × 1080 and 390 × 844, and Read every PNG before you judge it. Light and dark. English plus at
   least one of de or hi.
8. **Servers.** Phases 1 and 2 use the driver's production server at `http://127.0.0.1:3430` (read only; never stop
   it). Phase 3 and 4 builders run their own dev server: `NEXT_DIST_DIR=.next-<your label> npx next dev -H 127.0.0.1
   -p <your port>` (ports in your section). Never commit `tsconfig.json` or `AGENTS.md` (`next dev` edits both; the
   driver cleans them), stop your server and delete `.next-<your label>` when you finish. F-review builds once.
9. **Done means:** `npx tsc --noEmit` and `npx eslint <your paths> --quiet` clean for your files; `npx vitest run
   src/components src/i18n` and the vitest files of your paths pass; your e2e specs pass on a production build, run
   once at the end (`NEXT_DIST_DIR=.next-<your label>-e2e npx playwright test e2e/<spec>`: the config builds into that
   folder and serves it on a random port; delete the folder after); screenshots after your change at the three sizes,
   read by you. Report real numbers, failures included.

## Phase 1: look (no code; write only your one file)

Every phase-1 agent writes one Markdown file and commits it. Findings are concrete: where (URL, viewport, language,
theme), what is wrong, why it matters to a first-time judge, how bad (**blocker**: stuck, error, broken; **ugly**: works
but looks broken, cramped, wasteful or inconsistent; **nit**), the screenshot path, and a specific proposal (what
should go where, what to remove, sizes). Also note what is already good and must be kept. Order by how bad.

### F-research

Owns `docs/design/research.md`. Research what the best interfaces of 2025-26 do, for the kinds of page SimLab has:
canvas-plus-panels workspaces (circuit and robotics simulators, CAD and design tools, IDEs, flight sims), learning
products with lessons and checks, catalogue and landing pages of minimal, high-craft product sites. Use web search
and read primary sources (design-system docs, product pages, articles by their designers). Then look at SimLab on
`http://127.0.0.1:3430` (the landing page, one board lesson, one bench, one drone and its fly page, at 1440 and 390).
Write 15-30 principles, each with its source, what it looks like in practice, and exactly where it applies in SimLab
(page and component), most valuable first: layout of a full-screen workspace (resizable or collapsible panels, what
stays visible), type scale and density, colour use on a paper-and-ink style, motion, empty and loading states,
onboarding a first-time user in under a minute, phone layouts for a canvas app.

### F-audit-<surface> (shell, boards, robotics, drones, panels)

Owns `docs/verify/ui-audit-<surface>.md`. Walk every page of your surface as a demanding product designer would, at
the three sizes, light and dark, English plus de or hi. Measure: how much of a 1440 × 900 and 1920 × 1080 screen the
main content and the figure take; the type sizes, spacing and colours in use (read computed styles); inconsistent
components (two button styles for one job, three card styles); text that wraps badly or truncates; contrast; focus
rings; anything that doesn't work (click everything a judge would click). Surfaces:

- **shell**: header, footer, landing / dashboard (`/en`), `/en/about`, `/en/together`, `/en/passport`,
  `/en/verify`, a 404 (`/en/nope`), the settings and language controls, the untranslated notice.
- **boards**: `/en/boards`, every board's overview (12) and at least three lessons, all on `uno-r3`, `nucleo-f401re`,
  `basys3`, `microbit-v2`, `pi4-pi5`: code editor, run controls, serial monitor, lesson strip, checks, quiz, Break it.
- **robotics**: `/en/robotics` and every bench (13): steps, Place a part, faults, tasks, stats, serial.
- **drones**: `/en/drones`, every drone (13), the bench (Build it for me, wiring sheet, checks, CLI, tests), the
  fly page of at least quad5, wing, vtol, swarm and octo (range, HUD, crash replay, ghosts, Break it, daily challenge).
- **panels**: the lab dock on desktop and its phone sheet (lab partner, Build it for real / prices, nearby, rooms and
  together, hardware twin, settings), opened from a board lesson, a bench and a drone page.

### F-fresh-eyes

The section "P3-fresh-eyes" of `scripts/workflows/phase3.md`, on `http://127.0.0.1:3430`. Owns
`docs/verify/fresh-eyes.md`.

## Phase 2: decide

### F-direction

Owns `docs/design/POLISH-SPEC.md`. Read the seven phase-1 files, `docs/SPEC.md`, `src/app/globals.css`,
`src/components/ui/**` and the page frames (`src/components/shell/**`, the four workspaces). Write one spec that the
five builders can implement without asking, in about an hour each:

1. **Shared decisions** (F-build-shell implements them): the page frames (a full-viewport workspace frame for lab
   pages, a reading frame for the rest: widths, gutters, breakpoints), the spacing and type scale, colour roles in
   light and dark, the component set (buttons, chips, cards or panels, tabs, sheets, stats, kickers) with one style
   per job, header and footer, focus and motion. Name the exact classes, tokens and component props the builders will
   use.
2. **Per-surface task lists** for F-build-boards, -robotics, -drones and -panels: numbered, concrete (component and
   change), each tied to the audit or fresh-eyes entry it fixes. Every fresh-eyes blocker and ugly entry gets an
   owner or a written reason to leave it.
3. **What not to change** (what the audits say already works).

Commit the spec. Keep it to what fits in the time: the best version of this design, not a different product.

## Phase 3: foundation

### F-build-shell (dev server port 3441)

Owns `src/components/ui/**`, `src/components/shell/**`, `src/components/settings/**`, `src/app/globals.css`,
`src/app/[lang]/layout.tsx`, `src/app/[lang]/page.tsx`, `src/app/[lang]/about/**`, `src/app/[lang]/[...rest]/**`,
`src/app/[lang]/passport/**`, `src/app/[lang]/verify/**`, `src/components/solana/**` (layout only),
`src/i18n/messages/*/common.json`, `shell.json`, `solana.json`, and the e2e specs no other builder names. Implement
POLISH-SPEC's shared decisions and the shell tasks. Keep component APIs backward compatible (the four surface builders
start from your work: a renamed prop or class breaks their pages until they adapt), or update every caller in the same
commit. Commit in small verified steps; your last commit must leave every page building.

## Phase 4: surfaces (in parallel, on F-build-shell's foundation)

Each owns its section's files and implements its POLISH-SPEC task list, then checks its pages at the three sizes.

### F-build-boards (dev server port 3442)

Owns `src/components/boardlab/**`, `src/app/[lang]/boards/**`, `src/i18n/messages/*/boardlab.json`,
`e2e/boardlab.spec.ts`.

### F-build-robotics (dev server port 3443)

Owns `src/components/robotics/**`, `src/app/[lang]/robotics/**`, `src/i18n/messages/*/robotics.json`,
`e2e/robotics.spec.ts`.

### F-build-drones (dev server port 3444)

Owns `src/components/dronelab/**`, `src/components/flight/**`, `src/app/[lang]/drones/**`,
`src/i18n/messages/*/dronelab.json`, `flight.json`, `e2e/dronelab.spec.ts`, `e2e/fly*.spec.ts`.

### F-build-panels (dev server port 3445)

Owns `src/components/{ai,dock,search,realtime,hw,data,figure}/**`, `src/app/[lang]/together/**`,
`src/i18n/messages/*/ai.json`, `search.json`, `together.json`, `hw.json`, `e2e/dock*.spec.ts`.

## Phase 5: check

### F-review

Owns `docs/verify/ui-review.md`. Build once (`NEXT_DIST_DIR=.next-review`, `npm run build`), `next start` on port
3446, and walk every surface as the phase-1 auditors did, against POLISH-SPEC. For each remaining problem: where,
what, how bad, screenshot, which builder's files it is in, and the exact fix. Then run
`node scripts/crawl-routes.mjs --base http://127.0.0.1:3446 --dist .next-review --workers 3 --out
<your scratchpad>/routes.md` and `E2E_SKIP_BUILD=1 NEXT_DIST_DIR=.next-review npx playwright test`, and report both
results. Stop the server and delete `.next-review` when done.

## Side job: the missing board quizzes (alongside phases 1-4)

BUILD-PLAN §4 asks for a quiz on every board lesson. Fourteen have none: all six on `pico`, three on
`esp32-devkitc`, three on `esp32-s3-devkitc-1`, two on `nodemcu`.

### F-quiz-<n>

F-quiz-pico owns `src/content/boards/pico.ts`, `pico.test.ts` and `src/i18n/content/<lang>/boards/pico.json` (all
six languages); F-quiz-esp the same three kinds of file for `esp32-devkitc`, `esp32-s3-devkitc-1` and `nodemcu`.
Touch nothing else in those files but the quizzes.

1. For each lesson without a `quiz`, add one in the shape `nano.ts` uses (`id` = the lesson id, `afterStep: null`,
   three questions, three options each, `answer` the index of the right one, a `why`), with its English text under
   `lessons.<lesson>.quiz` in `src/i18n/content/en/boards/<board>.json`. Ask what the lesson teaches and what a learner
   gets wrong on the real board, from the lesson's own prose and `docs/facts/<board>.md`: no fact the fact sheet
   doesn't support, no trick questions, the right answer not always in the same place.
2. Translate the new keys into the other five languages' `<board>.json` (es fr de zh hi), in the register and the
   terms each file already uses. Keep every other key as it is. Some of these files are hand-formatted: if
   `json.dumps(json.load(f), ensure_ascii=False, indent=2)` doesn't give back the file byte for byte, insert the new
   keys as text instead of rewriting the file.
3. Add a test to the board's test file: every lesson has a quiz with three questions whose answers are among their
   options (the way `basys3.test.ts` does it).
4. Verify: `npx vitest run src/content/boards/<board>.test.ts src/i18n/content.test.ts src/lib/interp/lessons.test.ts`,
   `npm run content:check` (no line for your boards), `npx tsc --noEmit`, `npx eslint src/content/boards --quiet`.
   Commit each board when it passes, with its six prose files.
