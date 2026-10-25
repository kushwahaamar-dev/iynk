# SimLab handoff

This file is the single place where the build's live state is kept. Two people (Amar and his teammate) take turns
driving the build, each with their own Claude sessions, and any session can die mid-step (context or usage limit).
So whoever is working updates this file after every step, commits and pushes, and the next person or agent carries
on from exactly where the last one stopped. Background, the users' own words and every decision so far are in
`docs/handoff/CONTEXT.md`.

## How to resume (every agent, every time)

1. Run `bash scripts/handoff-status.sh`. It pulls, then shows the driver, the claims, the last checkpoint, the newest
   commits and any uncommitted work.
2. Read this whole file, then `docs/handoff/CONTEXT.md`, then `docs/hacktx/BUILD-PLAN.md`, then the files the plan
   names for your step.
3. **Take over as driver** (below) before you change anything.
4. If the tree has uncommitted changes, someone stopped mid-step on this machine: read `git diff`, decide whether
   that work is usable, and tell your user what you found before you touch it. If the last checkpoint says a step was
   left half-done, finish that step first.
5. Find **Current status → Next step**. Do that step, and only that step, the way BUILD-PLAN.md describes it.
6. Verify before you call it done: the step's own checks plus `npm run typecheck`, `npx eslint . --quiet` and the
   tests for the paths you touched. Report real results, failures included.
7. **After every step:** commit the work, update **Current status**, add a **Checkpoint log** line, append the user's
   instructions and decisions from this step to `docs/handoff/CONTEXT.md` §5, commit that, push. A step is never
   "done" while it exists only on one machine.
8. If you are about to run out of context or usage, stop at a clean point and do step 7 first. A half-step is fine as
   long as the checkpoint says exactly what is done and what isn't (`WIP:` at the start of the commit message).
9. When your user stops for the session, **hand over** (below).

## Working as a team

- **One driver at a time.** The driver is named in **Current status → Driver**. Only the driver's sessions write to
  the repo; anyone else reads.
- **Take over:** `git pull --ff-only`; set **Driver** to your name, machine and the time; add a checkpoint line
  ("<name> takes over"); commit as "Take over as driver" and push. If the push is rejected, someone else committed
  first: pull, read what changed, and talk to them before going on.
- **Hand over:** finish or checkpoint the current step (step 7), set **Driver** to "none, free to take", write
  **Next step** so someone with no context can start it, commit as "Hand over", push. Tell the other person.
- **Working at the same time** (only if you both agree): claim whole rows of BUILD-PLAN.md §5 in the **Claims** table,
  commit and push the claim first, and touch only the files those rows own. Pull and rebase (`git pull --rebase`)
  before every push. Never edit a file the other person's row owns; file a request in `docs/requests/` instead.
- **Secrets travel privately.** `.env.local` and keypairs are never committed. If the other driver needs them, the
  person who has them sends them directly. See CONTEXT.md §4 for what lives on one machine only.
- **Workflow waves.** Commit the workflow script to `scripts/workflows/` before running it, and record the run id,
  the labels and their state in the checkpoint log. A run can't be resumed from another machine or session: the next
  driver relaunches the committed script with only the unfinished labels. Every workflow agent's last step is to
  commit **only its own files** (`git commit -m "…" -- <its paths>`; retry if `.git/index.lock` is busy) and push
  (`git pull --rebase` and retry if rejected), so a dead session loses at most one agent's work.

## Rules that never change

- **Hackathon rule.** HackTX 2026 requires every line of project code to be written during the hacking period,
  11:30 CDT on 2026-10-24 to 11:30 CDT on 2026-10-25. Never copy code from before then: the old app in git
  baseline `245763f`, the pre-event prototypes, or code blocks in `docs/research/`. Use those only as knowledge.
- **Commits.** Authored by the person driving, with their own git identity (check `git config user.name` before the
  first commit). Add no `Co-Authored-By`, "Generated with" or other agent attribution lines. Commit in small, honest
  steps with messages that say what changed and why.
- **Never commit secrets.** `.env.local`, keypairs and `.next*/` are ignored; keep it that way and check
  `git status` before every commit. Never print a key's value. Session transcripts stay out of git (they hold file
  dumps and can hold secrets); summarise them in CONTEXT.md §5 instead.
- **Ask the user first** before creating cloud resources (Vultr), spending money, uploading env vars to Vercel,
  moving devnet SOL from a personal wallet, submitting on Devpost, or force-pushing. Normal `git push` to
  `origin main` is approved. Never push the local branch `backup/simlab-history`.
- **Workflow agents.** Never SendMessage a running Workflow agent by its id: it starts a duplicate copy instead.
  Talk to running agents through files they re-read, or through their follow-up agent.
- **Next.js 16.4 differs from what models know.** Read `AGENTS.md` and the guide in `node_modules/next/dist/docs/`
  before using a Next API. Builds that share the tree use `NEXT_DIST_DIR=.next-<label>`; delete that folder after,
  and remove the `.next-<label>` lines `next build` adds to `tsconfig.json`.
- Ownership and contracts: `docs/ARCHITECTURE.md` (§2 owners, §3–9 contracts), `docs/hacktx/HX-CONTRACT.md`
  (sponsor layer, H12 owners). Change schemas additively and log it at the top of ARCHITECTURE.md.

## Where state lives

| What | Where | In git? |
|---|---|---|
| Code, docs, this file, the plan, audits | this repo (`origin` = github.com/kushwahaamar-dev/sim) | yes |
| The users' requests, decisions, lessons, conversation log | `docs/handoff/CONTEXT.md` | yes |
| First build's resume notes, cut-off state, workflow scripts | `docs/handoff/first-build/` | yes |
| Secrets (`.env.local`: Solana program id and issuer keypair, later Meta/SerpApi/Tiger keys) | Amar's Mac | no: sent privately |
| Devnet wallet `Cxt17a9c…bW1S`, program deploy keypair | Amar's Mac | no |
| Session transcripts, first build's 4 GB scratch | Amar's Mac (`~/.claude/projects/…`, `~/simlab-scratch-backup/`) | no: summarised in CONTEXT.md |

Anything the next driver needs must end up in the repo. Machine-local state is only a convenience.

## Current status

- **Updated:** 2026-10-25 07:47 CDT (machine clock).
- **Driver:** Amar Kushwaha, Mac Amars-MacBook-Pro.local, since 2026-10-25 07:47 CDT (new session; the 18:22 session
  hit its weekly usage limit at 07:35). Amar is awake: his keys are in `.env.local` (07:32). The Mac is kept awake by
  `caffeinate -dimsu -t 54000` (pid 28721, from 23:08, until about 14:08).
- **Working tree:** `/Users/amar/Codes/ak/simlab`. It already had `node_modules` and `.env.local`. Do not build in
  `/Users/amar/Codes/sim`.
- **Phase:** every build phase is done and **gate 3 is green** (05:46-06:11 at `569b205`, all six languages,
  `docs/verify/gate3.md`). Phase 4 (Solana, Best Hardware Hack) is skipped (Amar, 22:20). What is left needs Amar:
  keys, deploy, video and Devpost ("Next step").
- **Plan:** `docs/hacktx/BUILD-PLAN.md`, written from the six audits in `docs/audit/`. Phases 1-3 build for Best
  Overall, SerpApi, Most Entertaining and Meta.
- **Gate 3:** typecheck, eslint and content:check clean; build with typecheck on, 826 pages; vitest 2788 passed, 5
  skipped (no database; no language missing prose); relay 39 of 39; figure strings 11 of 11 (4087 keys in every
  language); lesson table 102 of 102 (`docs/verify/gate3-lessons.md`); drone calculator 445 of 445; 13 of 13 bench
  probes; 79 of 79 figures through cfshoot; 120 figure views in six languages at laptop and phone size, none with
  overflowing text or English fallbacks; crawl 786 pages, 0 failed (`docs/verify/gate3-routes.md`); Playwright 114
  passed, 2 skipped (the untranslated-board pair, which has nothing left to show).
- **Since gate 3 (driver):** the Lab tools drawer no longer squeezes a lesson's code on a wide screen (`f43d420`,
  dock e2e at 1440 and 1920); PITCH, VIDEO, JUDGE-QA and DEVPOST-WRITEUP checked against the pages at 1920 x 1080 and
  given the gate-3 numbers (`b015738`); the catalogue cards show each board, bench and drone as its figure
  (`7f72ce5`, `scripts/figure-thumbs.mjs`, axe clean on the three index pages in light and dark), and so do the
  landing's lab cards (`bd80229`). Picking a board variant now draws it: the Uno R4 WiFi, Pico W and 2, Pi 4 and
  ESP32-S3 v1.0 had kept the default figure, and the R4's matrix and Wi-Fi lessons the Minima (`6f52be5`, e2e test);
  the engine reports a `set` key it doesn't read (`d851653`); board labels step past each other (`c33432c`); fr and es
  name the level shifter as the prose does (`00139d6`). All in `docs/verify/gate3.md`. Before the gate:
  the live Uno on the landing page (`ada2a24`), phone-sized figures without legend-less badges (`9898660`), the fly
  range's notes clear of the touch sticks (`569b205`), the drone workshop's progress label (`257daa0`).
- **Decided:** D1 (tracks). Amar: "Everything else looks fine." Jagrati (16:13): D2 confirmed; D4 keys stay
  placeholders until the morning; Vultr, the Vercel env upload and Tiger not approved yet; D3 (devnet SOL) only with
  phase 4, now skipped.
- **Interaction audit** `wf_e0b543cb-6eb` (`scripts/workflows/interaction-audit.js`, 07:19-07:40): all five find
  labels (boards, robotics, drones, fly, shell) died on the old session's usage limit, so it reported nothing. Not
  relaunched yet. Their leftover `scripts/.tmp-audit-*.mjs` were moved out of the repo.
- **Servers (this session's background tasks):** `next start` on http://127.0.0.1:3000 from `.next-keys` (Amar's
  keys, built 07:33) and the relay `server/realtime` on port 43117. `.next-tags` (no keys) was deleted.
- **Keys smoke (07:51, `docs/hacktx/DEPLOY.md`):** `/api/status` has ai, image, voice, search, realtime and gemini on
  (solana and db off); Meta 7 of 7, SerpApi 5 of 5, the partner answers in the app, and two browser profiles share a
  room through the relay in en and es with no console errors.
- **Runs before it, all done** (scripts in `scripts/workflows/`, `git log` shows what each label pushed): phase 1
  (gate 1 green at 19:21), wave A `wf_bde0e200-6a3` (9 labels, 20:17-21:27), wave B `wf_7b610548-7fb` (10 labels, from
  22:30), its tail `wf_759ed985-c9a`, prose T1 `wf_0e06f30a-c43`, figure dictionaries T2a `wf_07ad23ac-e47`, prose T2
  `wf_788dd7a3-f68` and UI strings `wf_c44031b5-93f` (every item in six languages), docs D `wf_d61de94b-466`, quizzes
  `wf_78186578-fbd`, figure sweep `wf_7513ba0c-9cb`, the final pass `wf_c95e5cdf-cda` (Fable research, audits,
  `docs/design/POLISH-SPEC.md`, builds, F-review's `docs/verify/ui-review.md`), review fixes `wf_62976d4a-988`, and
  four figure-string deltas (`wf_7bcff872-581`, `wf_f8a79fd5-c38`, `wf_4259a342-6a9`, `wf_0e7f6757-d55`). Gate 2
  02:20 (`docs/verify/gate2.md`), gate 3 06:11. No agent or workflow is running.
- **Next step (Amar):**
  1. Done 07:32: keys in `.env.local` (Meta, Gemini, SerpApi, relay URL). No `DATABASE_URL`, so no leaderboard.
  2. Answered 08:10: Vercel yes, relay on Vultr, no Tiger, app frozen (CONTEXT.md §3). Vercel project
     `simlab-hacktx` (scope `kushwahaamar2ak5-7403s-projects`, linked 08:12, GitHub repo connected, so every push to
     `main` builds production) has 10 production variables: the five `META_*`, `GEMINI_API_KEY`, `GEMINI_MODEL`,
     `SERPAPI_KEY`, `SERPAPI_MONTHLY_BUDGET`, `NEXT_PUBLIC_SITE_URL=https://simlab-hacktx.vercel.app`. Upload script
     trims whitespace (two keys have a space after `=` in `.env.local`). Vultr waits for `VULTR_API_KEY` in
     `.env.local` (asked 08:13); then `scripts/realtime-vultr-create.sh`, `REALTIME_ALLOWED_ORIGINS=https://simlab-hacktx.vercel.app
     VULTR_HOST=<ip> scripts/realtime-deploy.sh`, set `NEXT_PUBLIC_REALTIME_URL=wss://<ip-with-dashes>.sslip.io/ws`
     on Vercel and redeploy.
  3. Done locally 07:51 (see "Keys smoke") and on **https://simlab-hacktx.vercel.app** (`docs/hacktx/DEPLOY.md`
     "Production on Vercel"): everything on but db and solana. Rooms on the live site run through the Vultr relay
     `wss://216-128-138-203.sslip.io/ws` since the 08:38 redeploy, checked with two browser profiles. Still to do
     before judging: JUDGE-QA's "Recheck before judging" and PITCH's "Confirm before pitching".
  4. Video 08:30-10:00 from `docs/hacktx/VIDEO.md` (setup, shot list, clicks checked at gate 3). Devpost by 10:30
     from `docs/hacktx/DEVPOST-WRITEUP.md`, filling its [BRACKETS]; Amar submits.
  Optional, small, if someone has time: the robotics HUD verdict is English only (`benchStatus` fills English), the fr
  and es level-shifter wording differs between figure and prose, the Pico's flash label style, the live HackTX
  counter (`LiveCounter`) is not on a page, and a drone's bench empties on reload.
- **Stopped (17:12):** an earlier wave in `/Users/amar/Codes/sim` was told to stop and not push. That clone is ahead
  by unpushed `c3c61a7` and has uncommitted files. Leave both. Do not push them.

### Claims (only when both people work at the same time)

| BUILD-PLAN row | Who | Since | State |
|---|---|---|---|
| – | – | – | – |

## Checkpoint log (newest first)

- 2026-10-25 08:39 CDT (Amar): Amar added this Mac's SSH key to the Vultr VM; the relay now also lets in
  https://simlab-hacktx.vercel.app (localhost origins kept), Vercel has `NEXT_PUBLIC_REALTIME_URL` and was
  redeployed. Live rooms checked across two profiles. Next: Amar's video and Devpost; the app stays frozen.

- 2026-10-25 08:26 CDT (Amar): Vultr already has `simlab-realtime` (216.128.138.203, vc2-1c-1gb, dfw), created
  07:58 CDT by `scripts/realtime-vultr-create.sh` from somewhere else, with an SSH key `simlab-realtime-deploy` that
  is not on this Mac. Its relay is healthy at `wss://216-128-138-203.sslip.io/ws` (deployed about 08:04) and accepts
  the origin `http://localhost:3000` but refuses `https://simlab-hacktx.vercel.app` (403). This Mac can't SSH in, so
  nothing was changed and nothing new was created. Waiting for Amar: who set it up, and adding the Vercel origin.

- 2026-10-25 08:20 CDT (Amar): production live at https://simlab-hacktx.vercel.app (10 env vars; `.vercelignore`
  now leaves out two test helpers that broke the typecheck). Smokes green there. Next: the Vultr relay once
  `VULTR_API_KEY` is in `.env.local`, then `NEXT_PUBLIC_REALTIME_URL` on Vercel and a redeploy.

- 2026-10-25 07:51 CDT (Amar): keys smoke green locally (Meta 7/7, SerpApi 5/5, in-app partner, relay rooms across
  two profiles). The keys build serves on port 3000 with the relay, both from this session. Next: Amar's deploy OKs.

- 2026-10-25 07:47 CDT (Amar): Amar takes over in a new session on Amars-MacBook-Pro.local after the old one hit
  its weekly limit. Tree clean at `136467c` once the build lines in `tsconfig.json` were reverted. Next: start the
  keys build, run `/api/status` and the Meta and SerpApi smokes, and ask Amar for the deploy OKs.

- 2026-10-25 06:18 CDT (Amar's session): gate 3 green in six languages (`d6a74aa`); drawer fix, docs checked
  against the pages, catalogue pictures; next is Amar's morning list.

- 2026-10-25 00:17 CDT (Amar's session): T2a done; collector rebuilt on acorn (`a516233`); R4 test and ids.ts fixed;
  wave B tail (driver requests, `wf_759ed985-c9a`) launched beside wave B's last three agents.

- 2026-10-24 23:41 CDT (Amar's session): prose T1 done (105 translated files). T2a launched beside wave B:
  figure dictionaries for 5 languages and the missing prompt records (`wf_07ad23ac-e47`).

- 2026-10-24 22:30 CDT (Amar's session): wave B launched (`wf_7b610548-7fb`, 10 agents) and phase 3 prose T1 beside
  it (`wf_0e06f30a-c43`, 5 agents, judge path first), under Amar's 22:20 full-autonomy go.

- 2026-10-24 22:30 CDT (Amar's session): wave A done at 21:27, all 9 labels pushed. Driver closed it: content index
  (`baa671a`), every figure rebuilt (`6576766`) and shot, layout problems filed for P2-engine-b (`a4c7e9f`), suite
  timeout (`0b71e59`), driver requests done (FigureReadout `73acdd8`, R4 DAC `e8ce4d3`, racer ESC `7f1f0db`,
  content-index heuristic `f2ee57b`), translated-prose test (`a2b8b9b`). Gate checks after wave A green (Current
  status). Amar went to sleep at 22:20 with full autonomy; wave B's script (`10b6951`) and phase 3's plan are next.

- 2026-10-24 20:17 CDT (Amar): Amar said "resume". Remote, tree and backup unchanged since the pause, nothing
  running. Wave A relaunched as `wf_bde0e200-6a3` with all 9 labels and the resume note.

- 2026-10-24 19:50 CDT (Amar): wave A paused at Amar's request ("Pause this simply. We will resume after one
  hour again"). Workflow stopped at 19:45; 7 commits pushed; uncommitted work left in the tree and copied to
  `~/simlab-scratch-backup/wave-a-pause-1945/`. `phase2-wave-a.js` now takes `{ labels, resume }` for the relaunch.
  Driver stays Amar (resuming in this session).

- 2026-10-24 19:29 CDT (Amar): Amar said "Launch wave A, 9 agents". Workflow run `wf_72d15e74-60a` from
  `scripts/workflows/phase2-wave-a.js` (`ea23cd2`): P2-engine, P2-uno-r4, P2-modules, P2-drone-prose, P2-drones-fpv,
  P2-flight, P2-rob-uno, P2-rob-motor, P2-social. All running.

- 2026-10-24 19:26 CDT (Amar): phase 2 planned in `scripts/workflows/phase2.md` from BUILD-PLAN §5 and the
  audits: 19 labels in two waves (A: engine, uno-r4, modules, drone prose, racer/gpscam/delivery, flight registry,
  uno-r3-build + led-resistor, motor benches, sync/sound/telemetry; B: engine, micro:bit, Nucleo, Pi + pi5-ros2, FPGA
  pair, sensor benches with the arm and line follower, a4988 + lm2596, agrihex + swarm, VTOL + tricopter + octo,
  ghosts and challenges), one owner per shared file per wave. Not launched: waiting for Amar's go.

- 2026-10-24 19:24 CDT (Amar): gate-1 reds (1) and (2) fixed and gate 1 rerun at `06ac3f0`: green apart from
  `content:check` (phase-2 prose). e2e: `fb0cc92` (robotics quiz test, CommonJS double default), `7860244` (quad5
  verdict repeated its check), `a9ca415` (`.on-fill` text on pastel fills, 8 components), `181b8fe` (serial log and
  pinout scroller reachable by keyboard). Phone: `06ac3f0` (SegmentedControl wraps, lesson links wrap, lobby
  `grid-cols-1`). Playwright 57/57, crawl 0 failed. Build dir deleted, `tsconfig.json` reverted. Next: plan phase 2.

- 2026-10-24 18:58 CDT (Amar): gate 1 ran locally on `.next-gate1` (`fcfb537`). Red on 4 e2e tests, 99 pages
  with sideways scroll at 390 px, and `content:check`. Everything else is green, including the demo-path pages.
  New `scripts/crawl-routes.mjs` (route crawl, BUILD-PLAN §6 item 5). Report: `docs/verify/gate1.md`, routes:
  `docs/verify/gate1-routes.md`. Build dir deleted, `tsconfig.json` reverted. Next: fix reds (1) and (2).

- 2026-10-24 18:48 CDT (Amar): BUILD-PLAN §3.2 item 5 done. `3defc3d` adds `getContentProse` (English prose when
  a language's file is missing) to the board, bench and craft loaders. `c08bc68` adds the translated
  `common.untranslated` note above those pages and an e2e test. `6f51a80` fixes two Spanish phone overflows on the
  Uno page (power picker, wrapping inspect button). `6da9aac` puts untranslated items in the dashboard and Together
  lobby lists and logs ARCHITECTURE.md v1.4. Typecheck and eslint exit 0. Full vitest is 1347 passed, 0 failed.
  3 boardlab e2e tests pass. Spanish, French and Hindi item pages return 200 with their note. `content:check` was
  already red (uno-r4 and four drones lack English prose). Next is gate 1, locally.

- 2026-10-24 18:31 CDT (Amar): Amar answered the gate-1 questions. Gate 1 runs locally with placeholder keys. No
  Vercel link, preview deploy or Vultr VM yet. The English prose fallback (§3.2 item 5) is built first.

- 2026-10-24 18:28 CDT (Amar): local `next start` smoke done and written into `docs/hacktx/DEPLOY.md` (`b62ebc0`).
  Build exit 0 with typecheck on, 645 of 645 pages. Every English demo route is 200. `/` redirects to `/en`.
  `/api/mcp` answers `initialize` and `tools/list` over POST (GET is 405 by design). `/es/boards/uno-r3` is 404
  because there is no Spanish prose and no English fallback. Also noted: the `/en` title lacks "· SimLab" (a
  layout's title template skips its own page). `npm run typecheck` and eslint exit 0. `.next-deploy` deleted and
  `tsconfig.json` reverted. Vercel stays unlinked. Next is gate 1, with the user's OK asked first.

- 2026-10-24 18:22 CDT (Amar): Amar takes over in a new session on Amars-MacBook-Pro.local. Git identity is Amar
  Kushwaha. The tree is clean at `70d019d` with nothing unpushed. Next is still the local `next start` smoke.

- 2026-10-24 18:05 CDT (Amar): ESP32 DevKitC pin rows for boot-button, touch, fade, and web-switch now point at
  that lesson's own prose. `npx vitest run src/content/boards/esp32-devkitc.test.ts` passed 10 of 10.
  `NEXT_DIST_DIR=.next-pin npx next build` exited 0 and generated 645 of 645 pages. One warning remains.
  `src/i18n/figure-strings.ts` cannot resolve `src/i18n/figures/<locale>.json`. `.next-pin` was deleted and its
  lines were removed from `tsconfig.json`. Next is the local smoke. Vercel stays unlinked.

- 2026-10-24 18:01 CDT (Amar): P1-uno done for its done line. `eae2b0c`, `24e19bb`, and `0415fcc` are `origin/main`.
  `src/i18n/content/en/boards/uno-r3.json` is in that history. Button, knob, and light use their own
  `params.color` keys, so the dock color-string request is closed. They report the route and 16 lessons render,
  81 tests pass, and the figure probe is green. Four failures still do not show the powered result. That request
  stays open and P1-engine is not relaunched. The tree is clean. Next is the ESP32 DevKitC pin strings.

- 2026-10-24 17:50 CDT (Amar): P1-dock done. `0878815` is `origin/main`. `LabDock.tsx`, `e2e/dock.spec.ts`, and
  `docs/requests/P1-dock-to-P1-uno-lesson-color-strings.md` are in that commit. They report 7 unit tests and 13 e2e
  tests (desktop and 390×844). Passport and Hardware stay hidden. `next build` still dies on
  `/en/boards/uno-r3/button` (`lessons.blink.params.color.red`). P1-uno still has uncommitted `uno-r3` files, so
  that request stays with them. Not relaunched.

- 2026-10-24 17:32 CDT (Amar): P1-engine done. Those seven commits are on `origin/main`, and
  `figures/engine/probe.mjs` is in the history. They report 19 of 19 engine tests and 17 of 17 bench steps in the
  Chromium probe. The uno-r3 figure was left unrebuild because `figures/boards/uno-r3.js` is still P1-uno's
  uncommitted edit. Note to P1-uno is `docs/requests/P1-engine-to-P1-uno-assembly.md`. Not relaunched.

- 2026-10-24 17:31 CDT (Amar): P1-voice done. `b1e5308` is on `origin/main`, and `src/lib/ai/voice-wav.ts` is in that
  history. They report 71 tests passed, Solana and hardware flags left off, and no SOL moved. P1-deploy's runbook
  is `544e92f` (`docs/hacktx/DEPLOY.md`). The smoke table marks every demo route "not requested" because `next build`
  still dies on `/en/boards/esp32-devkitc/touch`. Vercel was not linked. Neither label is relaunched.

- 2026-10-24 17:30 CDT (Amar): P1-health done. `28d8564` is on `origin/main`. It adds `lessons.dimmer` to the
  ESP32-S3 English prose, aligns together, boardlab, and dronelab keys, and deletes the fixture-preview route.
  Confirmed on `HEAD`. The route file is gone, and the dimmer object is in the JSON. Their build still dies on
  `/en/boards/esp32-devkitc/touch` because pin lines point at `lessons.blink.pins.*` after `lessonText` drops
  other lessons. Request is `docs/requests/P1-health-to-P1-checks-esp32-devkitc-pin-text.md`. Not relaunched.

- 2026-10-24 17:22 CDT (Amar): P1-checks done and on `origin/main`. `39cca43` puts Board Lab and Robotics on
  `runHeadless` and `evaluateChecks` in a Web Worker. `c168147` points the content tests at that path and writes
  `docs/verify/phase1-lessons.md`. The table in that commit says 59/59 references pass and 59/59 starters fail.
  Left open: the worker was not clicked through in a browser, and the S3 dimmer test still depends on uncommitted
  prose in `src/i18n/content/en/boards/esp32-s3-devkitc-1.json` (P1-health owns that file). Not relaunched.

- 2026-10-24 17:12 CDT (Amar): a second P1-checks in `/Users/amar/Codes/sim` stood down (`69f24d0b`, local note
  `c3c61a7`, not pushed). It reported 56 of 59 lessons passing on that clone at `94d3caa`. The 3 failures were
  pi5-ros2. That number is not a simlab result. The simlab P1-checks (`1e6f87c4`) keeps the label. The earlier
  clone wave was told to stop and not push. P1-engine has a local commit `f104e10` (esp32-s3-build check types)
  that this checkpoint pushes with the handoff update.

- 2026-10-24 17:06 CDT (Amar): relaunched all seven phase-1 labels in `/Users/amar/Codes/ak/simlab` from `2892524`.
  P1-health d393e1cb, P1-checks 1e6f87c4, P1-uno ba4b1927, P1-engine 1a0582c2, P1-dock b44c4546, P1-voice b337455f,
  P1-deploy 99124c0b. All running. Each commits only its own files.

- 2026-10-24 17:04 CDT (Amar): Amar pointed at the existing checkout `/Users/amar/Codes/ak/simlab` ("we already have
  the local setup here"). Fast-forwarded it from `1313ec8` to `94d3caa`. Discarded a whitespace-only edit in
  `docs/hacktx/STRATEGY.md`. `.env.local` is present and was not printed or committed. Typecheck on this tree is
  24 errors, not the stale 34. Next is still the seven-label relaunch.

- 2026-10-24 16:57 CDT (Amar): Amar takes over on Amars-MacBook-Pro.local. Git identity is Amar Kushwaha. The clone is
  clean at `e568153`. No phase-1 label is reported done. P1-checks, P1-voice, P1-dock and P1-deploy landed partial
  commits. P1-health, P1-uno and P1-engine have no code commits from the relaunch. Next is to relaunch all seven.

- 2026-10-24 16:56 CDT (Jagrati): WIP: usage limit hit (resets 18:40 CDT). P1-engine failed on it; the other six
  will stop too. Commits since the relaunch: b34de47 Tell P1-uno how to use the shared check path; e6fe88b One check path: runHeadless and evaluateChecks in src/lib/interp; 78865ae Fix solana route and verify tests: mock next/server connection, whoop now has a smoke stopper in its content; ff8b788 Add Together to the site nav, Passport and Verify behind features.solana, and the LabDock strings; 4da5459 Register the search, solana, together and hw namespaces so message parity covers them; b08fd2d Fix PassportPanel tests: render in async act so suspended loads resolve; Confetti skips when animate or matchMedia is missing; 732a030 Fix RealBuildPanel tests: typed offers, repeated names, prop pack size; 0cc0a7e Pin Node 24 and add a root-anchored .vercelignore. Uncommitted agent work stays in the tree on Jagrati's Mac.
  After 18:40: resume the agents with SendMessage (same session) or relaunch unfinished labels from
  `scripts/workflows/phase1.md`, each reviewing its own uncommitted files first.

- 2026-10-24 16:46 CDT (Jagrati): phase 1 relaunched, all seven labels, fresh agents (same brief).

- 2026-10-24 16:44 CDT (Jagrati): all seven phase-1 agents were stopped (the session was interrupted at ~16:40)
  and can't be resumed. Landed: P1-voice's `hw` flag (79ddcea). Uncommitted partial work left in the tree on
  Jagrati's Mac, not reviewed yet: P1-health (de/es/fr/hi/zh boardlab, dronelab, together JSON; tsconfig.json;
  fixture-preview page deleted), P1-engine (`src/content/robotics/esp32-s3-build.ts`), P1-voice
  (`src/lib/server/solana/live.ts`), P1-deploy (`package.json`, `.nvmrc`, `.vercelignore`). Nothing from P1-checks,
  P1-uno or P1-dock. Waiting for Jagrati to say whether to relaunch.

- 2026-10-24 16:23 CDT (Jagrati): "autonomous mode". Phase 1 launched: P1-health, P1-checks, P1-uno, P1-engine,
  P1-dock, P1-voice, P1-deploy all running (brief: `scripts/workflows/phase1.md`).

- 2026-10-24 16:13 CDT (Jagrati): D2 confirmed; D4 keys left as placeholders (CONTEXT.md §3). Waiting for
  "autonomous mode" to start phase 1.

- 2026-10-24 16:09 CDT (Jagrati): Jagrati takes over as driver on RVW-F0096FW3J2M. Next: confirm D2 and collect
  D4 with Jagrati. (Machine clock reads earlier than Amar's 16:15 entry; times are as each machine shows them.)

- 2026-10-24 16:15 CDT (Amar): Solana and Hardware moved to BUILD-PLAN.md phase 4 (only if time is left); the rest
  of the plan approved in principle. Driver still free.

- 2026-10-24 16:05 CDT (Amar): team handoff set up: driver and claims protocol in this file,
  `docs/handoff/CONTEXT.md` (requests, decisions, lessons, conversation log), the first build's RESUME.md,
  cut-off state and workflow scripts in `docs/handoff/first-build/`, `scripts/handoff-status.sh`. Amar paused;
  driver free.

- 2026-10-24 15:50 CDT (Amar): all six audits saved in `docs/audit/`; `docs/hacktx/BUILD-PLAN.md` written and
  waiting for approval.

- 2026-10-24 15:31 CDT (Amar): the repo moved to github.com/kushwahaamar-dev/sim at Amar's request, with a fresh
  history that starts now: today's three commits were rebuilt from their identical trees. The pre-event baseline
  `245763f` is not in this history. The old history is kept only as Amar's local branch `backup/simlab-history`
  (never push it). Never force-push `main` again unless a user asks.

- 2026-10-24 15:20 CDT (Amar): handoff system created (this file, `CLAUDE.md`).
