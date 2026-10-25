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

- **Updated:** 2026-10-24 19:26 CDT (machine clock).
- **Driver:** Amar Kushwaha, Mac Amars-MacBook-Pro.local, since 2026-10-24 18:22 CDT (new session).
- **Working tree:** `/Users/amar/Codes/ak/simlab`. It already had `node_modules` and `.env.local`. Fast-forwarded to
  `94d3caa`. Do not build in `/Users/amar/Codes/sim`.
- **Phase:** 1 done. All seven labels from `scripts/workflows/phase1.md` are done and none is running. Gate 1 reran
  locally at 19:21 and is green apart from phase-2 prose (below). Jagrati's session should not resume its own copies.
- **Plan:** `docs/hacktx/BUILD-PLAN.md`, written from the six audits in `docs/audit/` (boards, robotics, drones,
  platform, sponsor-layer, history). Phases 1–3 build for Best Overall, SerpApi, Most Entertaining and Meta.
  Solana and Best Hardware Hack are phase 4, only if time is left after gate 3 (Amar, 16:15). Don't start them
  earlier.
- **Checks on this tree (19:21, `06ac3f0`):** `npm run typecheck` exit 0. `npx eslint . --quiet` exit 0. Full
  vitest: 1347 passed, 4 skipped (TimescaleDB integration, no database), 8 todo, 0 failed. `npm run build` with
  typecheck on exits 0, 645 of 645 pages, one warning (`src/i18n/figures/<locale>.json` missing). Playwright 57/57.
  **`npm run content:check` exits 1:** `uno-r4` and drones `whoop`, `cinewhoop`, `longrange`, `wing` have data
  modules but no English prose, so they 404 in every language (phase-2 rows). Do not run `npm ci` here (a fresh
  install in `/Users/amar/Codes/sim` showed `PageProps` errors this install does not have).
- **Local smoke (18:24, `docs/hacktx/DEPLOY.md`):** `/` 307 to `/en`. `/en`, `/en/boards/uno-r3`,
  `/en/boards/uno-r3/blink`, `/en/drones/quad5`, `/en/drones/quad5/fly`, `/en/together` and
  `/figures/boards/uno-r3.html` are 200. `/api/mcp` POST `initialize` and `tools/list` 200 (7 tools).
  `/es/boards/uno-r3` was 404 then; since `3defc3d`–`6da9aac` it is 200 with the English prose under a "Aún sin
  traducir" note (BUILD-PLAN §3.2 item 5, ARCHITECTURE.md v1.4). The Uno board and Blink pages fit a 390 px
  screen in all six languages (`6f51a80`). Since `06ac3f0` no page in the route crawl scrolls sideways at 390 px.
- **Decided:** D1 (tracks, above). Amar: "Everything else looks fine."
- **Decided by Jagrati (16:13):** D2 confirmed (the plan's default). D4: API keys stay placeholders for now;
  `.env.local` on Jagrati's Mac is `.env.example` with empty values. Vultr, Vercel env upload and Tiger are not
  approved yet, so gate 1 runs without live Meta/SerpApi and rooms use the one-browser fallback until keys arrive.
  D3 (devnet SOL) is asked only when phase 4 starts.
- **Gate 1 (19:21 rerun, local, `docs/verify/gate1.md`): green apart from phase-2 prose.** Typecheck, eslint,
  build, vitest 1347/0, app-path 59/59, bench probe 17/17, cfshoot uno-r3 and quad5, Playwright 57/57, route crawl
  606 pages with 0 failed. Still red: `content:check` (uno-r4, whoop, cinewhoop, longrange, wing have no English
  prose), which phase 2 writes. The first run's reds and their fixes are in the report.
- **Next step:** phase 2 is planned in `scripts/workflows/phase2.md`: wave A (9 agents, about 2–2.5 h), then wave B
  (10 agents, about 2.5–3 h). Waiting for Amar's go on wave A (or a smaller wave). On his go, write the Workflow
  script for wave A's labels from that file, commit it to `scripts/workflows/`, launch it, and record the run id and
  labels in the checkpoint log. Never SendMessage a running workflow agent.
- **Agents:** P1-checks `1e6f87c4-b1ea-4a31-9425-b1de6de9a88f` done (`39cca43`, `c168147`). P1-health
  `d393e1cb-35bc-4db4-bc0b-37c02c1b8e14` done (`28d8564`). P1-voice `b337455f-1b6d-45d5-93d8-51efb828d421` done
  (`b1e5308`). P1-engine `1a0582c2-ec24-42ab-8b3c-e2ac162b8e48` done (`f104e10`, `a45ec96`, `03eaab0`, `9d49d45`,
  `af98853`, `a45e9c7`, `8ac4249`). P1-dock `b44c4546-65c6-4e1b-a979-d542a595b6e2` done (`0878815`). P1-uno
  `ba4b1927-c019-44ae-9e2a-ed6bc9d344fa` done (`eae2b0c`, `24e19bb`, `0415fcc`). Four powered-fault drawings still
  need an engine change (`docs/requests/P1-uno-to-P1-engine-assembly.md`). P1-deploy
  `99124c0b-fd27-4276-b13f-a2038f8c3767` files done (`544e92f`). The driver ran the smoke at 18:24 (`b62ebc0`). No
  phase-1 label is running.
- **Stopped (17:12):** an earlier wave in `/Users/amar/Codes/sim` was told to stop and not push. P1-checks
  `69f24d0b-22ca-48fe-9759-b3b2f8a29256` had already stood down. Also stopped: P1-checks
  `97b4fdff-0cfe-4a33-9392-efba74f27b24`, P1-uno `7bff6780-5777-4fc4-88ee-63de088785f4`, P1-health
  `233830a7-6774-4110-8784-e26b174ad48f` and `6c1a39de-53e3-4ed0-8e7d-b80eac4294e4`. That clone is ahead by unpushed
  `c3c61a7` and has uncommitted files. Leave both. Do not push them.

### Claims (only when both people work at the same time)

| BUILD-PLAN row | Who | Since | State |
|---|---|---|---|
| – | – | – | – |

## Checkpoint log (newest first)

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
