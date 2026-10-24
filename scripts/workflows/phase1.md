# Phase 1 workflow (BUILD-PLAN.md §5, phase 1)

Launched by Jagrati's session on 2026-10-24 after "autonomous mode". Seven agents run at once in the same working
tree (`/Users/jagratikumari/sim`), each owning the files listed in its section. If a session dies, the next driver
relaunches only the unfinished labels with this file as the brief (see HANDOFF.md checkpoint log for their state).

## Shared rules (every agent)

1. **Read first:** `HANDOFF.md` ("Rules that never change"), `docs/hacktx/BUILD-PLAN.md` (§3.2, §4, §5 phase 1, §6),
   `AGENTS.md`, the audit(s) your section names in `docs/audit/`, and `docs/ARCHITECTURE.md` §2 for owners.
2. **Hackathon rule.** Write every line now. Never copy code from git baseline `245763f`, pre-event prototypes or
   code blocks in `docs/research/`; use them only as knowledge. `docs/audit/salvage/` content written today is fine.
3. **Node 24:** start every shell with `source ~/.nvm/nvm.sh >/dev/null && nvm use 24 >/dev/null`.
4. **Next.js 16.4 differs from what you know.** Read the guide in `node_modules/next/dist/docs/` before using a Next
   API. A `next build` uses `NEXT_DIST_DIR=.next-<your label>`; delete that folder after and remove the
   `.next-<label>` lines `next build` adds to `tsconfig.json` (don't commit them).
5. **Own only your files.** Six other agents edit this tree at the same time. Edit only the files your section owns.
   If you need a change in someone else's file, write `docs/requests/<your-label>-to-<owner-label>-<topic>.md`
   (what, why, exact change) and work around it; the owner re-reads `docs/requests/` before finishing.
   Shared files with one owner this wave: `src/lib/features.ts` (P1-voice), `package.json` (P1-deploy),
   `src/i18n` namespace registry (P1-dock), `src/content/schema.ts` (P1-checks), `figures/engine/*` (P1-engine).
6. **Other agents' half-done work will show up** in typecheck, eslint and tests. Judge your work by errors in your
   own files and by your own tests; mention others' failures in your report, don't fix them.
7. **Git, carefully.** Never `git add -A`/`.`, `git stash`, `git checkout -- <path>`, `git reset`, `git pull` or
   `git rebase`: they would grab or destroy other agents' work. Commit small steps with only your paths:
   `git add <your paths> && git commit -m "<what and why>" -- <your paths>` (retry after a few seconds if
   `.git/index.lock` is busy). Then `git push origin main` (retry if it races another agent's push). The author is
   the git config identity; add **no** `Co-Authored-By`, "Generated with" or other agent lines. Never commit
   `.env*` (except `.env.example`), keypairs, `.next*/` or transcripts. Check `git status --short` before each commit.
8. **Secrets.** API keys are placeholders on this machine (`.env.local` has empty values): every sponsor feature must
   degrade cleanly ("not set up on this deployment"). Never print a key. Don't create cloud resources, link Vercel,
   upload env vars or spend money: those need the user's OK (HANDOFF.md).
9. **Done means verified.** Run your section's checks plus `npx tsc --noEmit` (filter to your files),
   `npx eslint <your paths> --quiet` and the vitest files for your paths. Report real numbers, failures included.
10. **Last step:** commit and push your remaining files, then reply with: what you changed (files), what is verified
    (commands and results), what is not done, and any requests you filed.

## P1-health

Audits: `platform.md`, `boards.md`, `sponsor-layer.md`.
Owns: `src/app/[lang]/together/strings.ts`, `src/components/realtime/messages.ts`, `src/app/[lang]/robotics/fixture-preview/**`
(delete the dev route and anything only it uses), the esp32-s3-devkitc-1 prose/messages for `lessons.dimmer.*`,
the boardlab and dronelab locale JSON files under `src/i18n` (key parity only: add missing keys, drop extra ones),
together.json drift, `tsconfig.json`, `scripts/gen-content-index.mjs`.
Do: fix the tsc errors in your files; make `src/content/boards/esp32-s3-devkitc-1.test.ts` (dimmer) and
`src/i18n/messages.test.ts` pass; make `next build` (type-checking on, `NEXT_DIST_DIR=.next-health`) get past the
esp32-s3 prerender. When the other agents' files are green, re-run the whole build.
Done when: no tsc errors in your files; those tests green; `next build` passes or the only failures are in files other
agents own (name them).

## P1-checks

Audits: `boards.md`, `robotics.md`. BUILD-PLAN §3.2 items 1–4.
Owns: `src/lib/interp/**`, `src/content/schema.ts`, the board-lab lesson workspace (`LessonWorkspace` and its inputs
module), the content tests under `src/content/boards/*.test.ts` and `src/content/robotics/*.test.ts` (including
`nodemcu.test.ts`'s tsc errors and `tb6612fng.test.ts`), the board lessons' reference/starter code where a lesson's
code and its own text disagree (blink periods: change content, not the rule). Not uno-r3 (P1-uno) and not
`src/content/robotics/esp32-s3-build.ts` (P1-engine).
Do: export `runHeadless` and `evaluateChecks` from `src/lib/interp` and make Board Lab, Robotics and every content
test use only them (delete the private test runners); pwm rule accepts full duty; world plumbing (I²C devices,
`world.networks`, `request()`, `attachUltrasonic()`) from the lesson's world spec; inputs for hc-sr04, mpu6050,
network, qtr-rc; checks in a Web Worker with progress and a 20 s budget; lesson `variant` (Pico W, Uno R4 WiFi) with
a variant switch; AccelStepper `OUTPUT`. Schema changes additive only, logged at the top of `docs/ARCHITECTURE.md`.
Done when: every existing lesson's reference passes and its starter fails through `runHeadless` + `evaluateChecks`;
write the table to `docs/verify/phase1-lessons.md`.

## P1-uno

Audits: `boards.md`, `docs/audit/salvage/`. Owns everything for board `uno-r3`: its en prose JSON (~1000 keys), its
content module and test, its figure source and built output under `figures/` and `public/figures/` (not
`figures/engine/*`), the Uno circuits merge (R1→RES1, leg names, `@cf use`), the 3 failures that have no visible effect,
and the uno-r3 assembly data. The engine-side unplug-before-strip step belongs to P1-engine: file a request with the
exact data shape you need.
Do: make `/en/boards/uno-r3` and all 16 lessons render, their reference code pass through the app check path
(use P1-checks' `runHeadless`/`evaluateChecks` once pushed; until then the existing path) and the figure probe pass
(all views, circuits, failures change state, assembly completes). Rebuild the figure with
`python3 -I figures/tools/cfbuild.py`.
Done when: route renders, 16 lessons pass, probe green.

## P1-engine

Audits: `robotics.md`, `drones.md`. BUILD-PLAN §3.2 item 6. Owns `figures/engine/**` (bench.js, bench-bb.js,
drone.js, embed.js, assembly), `src/content/robotics/esp32-s3-build.ts` (fix its 16 tsc errors) and engine tests.
Do: B2 (bench.js:808 apply the board variant before merging the bench); B3 (`missing:<part>` faults in state and
`faultPresent`); a per-bench model hook `model(state, dt) → {readings, status}`; mat placement with fixed pre-routed
wires per bench step, one supply → several rails; `bench-bb.js:164` emits `CF_NOTE` for unknown parts; assembly: an
unplug step precedes strip, choice ids validated at build; drone.js `G.pal` palette fix, a craft hook in the report,
one `extra.*` path; embed.js `pause`/`resume` (and the FigureFrame side if it is only a message send: coordinate via
a request to P1-dock if FigureFrame needs changes). Rebuild affected figures with `python3 -I figures/tools/cfbuild.py`.
Read `docs/requests/` for P1-uno's assembly request.
Done when: the esp32-s3-build bench completes end to end in the figure probe; engine unit tests pass.

## P1-dock

Audits: `platform.md`, `sponsor-layer.md`. Owns the LabDock component and its tests, the nav/shell entries for
`/together` (and `/passport`, `/verify` hidden while `features.solana` is false), the RoomProvider wiring on the 5
lab workspaces (wrap at the page/layout level; don't edit `LessonWorkspace`, which P1-checks owns; file a request
if you must), the i18n namespace registry (register search, solana, together, hw) and new e2e specs for the dock.
Do: LabDock with Partner, Together and Real tabs, a bottom sheet on phones (390×844); Passport and Hardware tabs exist
but stay hidden behind `features.solana` / `features.hw` (P1-voice adds `hw`; until it lands, read it defensively).
Every tab must degrade cleanly with no keys.
Done when: all tabs open on every lab page (boards, lesson, bench, drone, fly); an e2e spec covers it, desktop and
phone.

## P1-voice

Audits: `sponsor-layer.md`. Owns `src/lib/features.ts`, the AI voice/transcribe paths (both voice paths: room voice
notes and the partner), `src/components/search/RealBuildPanel*`, `src/components/solana/**`, `src/app/api/solana/**`,
`src/lib/verify/**` and their tests.
Do: send WAV on both voice paths (fix the 415); `features.solana` false until the program's Config account exists;
add an additive `hw` flag (off until phase 4); fix the failing hx tests (RealBuildPanel incl. its 10 tsc errors,
PassportPanel, solana-routes, `verify.test.ts` whoop). Make sure no Solana or Hardware UI is visible anywhere.
Done when: those tests green; a recorded WAV reaches the transcribe route with the right content type (unit test with
the key absent → clean "not set up" message); no Solana/Hardware UI visible.

## P1-deploy

Audits: `platform.md`. Owns `package.json` (engines field), `.nvmrc`, `.vercelignore`, `.env.example`
(NEXT_PUBLIC_SITE_URL doc), `vercel.json` if needed, `docs/hacktx/DEPLOY.md`.
Do: `.vercelignore` (exclude docs/research, figures sources not needed at runtime, scratch, tests if safe; never
exclude `public/figures`), pin Node 24 (`engines` + `.nvmrc`), NEXT_PUBLIC_SITE_URL handled with a sane default,
a deploy runbook. **Do not** link the Vercel project, deploy or upload env vars: that waits for the user's OK. Instead,
run a local production build (`NEXT_DIST_DIR=.next-deploy`) and `next start` on a free port, and smoke the demo-path
routes (record which 404 and whose row fixes them).
Done when: files committed; local prod smoke table written in `docs/hacktx/DEPLOY.md`.
