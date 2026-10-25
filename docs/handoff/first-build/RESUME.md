# iynk: HackTX 2026 build (god mode)

Last updated: 15:08 CDT, 2026-10-24. Everything is stopped; read "Cut-off at 14:19" first.

iynk is now the user's HackTX 2026 entry.
- Hacking period: 11:30 Oct 24 to 11:30 Oct 25 CDT.
- Devpost deadline: Oct 25 11:30 CDT, video required, in-person judging.
- The user's target is a deployed, demo-ready build by 18:00 today, then overnight hardening.

Read these first, in the repo:
- `docs/hacktx/STRATEGY.md`: tracks, story, demo, timeline, the user's to-do list.
- `docs/hacktx/HX-CONTRACT.md`: the binding contract for the hackathon layer.
- `docs/hacktx/BASE_ARCHITECTURE.md`: core decisions D1–D14.
- `docs/hacktx/DEVPOST.md`: tracks and judging.

**Hackathon rule.** All code must be written after 11:30 Oct 24. The old app (baseline `245763f`) and the pre-event scratch prototypes are walled off. The 13:00 interpreter port was moved to `<scratch>/gm/discarded/`. Every agent prompt forbids copying pre-event code.

**Repo.** `/Users/amar/Codes/ak/simlab` is its own git repo on `main`. No commits since `245763f`. Never touch `/Users/amar/Codes`.

**Scratch.** `<scratch>` = `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad`. It is wiped on reboot; back up `gm/` and `hacktx-*` here.

**Session.** The session id changed to 6a96fae0-… after a restart. Workflow scripts and transcripts still live under `.../327c458a-.../`.

## Cut-off at 14:19 (usage limit)

At 14:19:37 the orchestrator session hit its usage limit ("resets 5:40pm"). Between 14:19:57 and 14:19:59 it stopped all eight workflows, the pitch-writer agent (`ab5bf92ec6703c261`, "Draft HackTX pitch and write-up"), the watcher and its helper. Nothing has run since. The app released the old session at 14:53, so it will not continue on its own at 5:40.

The 14:17 duplicate mix-up (see the end of this file): stopping the copies also killed the five originals (server-ai, partner, search, solana-app, realtime-server). Their transcripts stop at 14:17:48, two minutes before the rest of HX wave 1.

Per-run state, machine-readable: `~/simlab-scratch-backup/cutoff-1419.json`. It lists the finished labels, every interrupted label with its transcripts and a `prevMerged` list (older `args.prev` entries plus this run's transcripts), and the items that never started.

| Run | Finished | Interrupted | Never started |
|---|---|---|---|
| core2 `wf_7983fdc6-21a` | architect, platform, shell-app, design-system, calc, checklist-a, engine:bench | interpreters, flight, engine:drone, ui:boardlab, ui:robotics, ui:dronelab, sound | – |
| HX wave 1 `wf_249d2581-74d` | – | all 10 | – |
| stage2 `wf_3b43775c-716`, `wf_a01431e2-07d` | – | shell-2, engine:bench-2 | – |
| boards + parts `wf_828c7092-26b` | – | content:uno-r3, nano, esp32-devkitc, esp32-s3-devkitc-1, nodemcu, pico, uno-r4, parts:inputs, parts:drivers, parts:modules | microbit-v2, nucleo-f401re, pi4-pi5, basys3, de10-lite, parts:mat |
| robotics `wf_6e44fd79-4d1` | – | led-resistor, transistor-switch, tb6612fng, l298n, uno-r3-build, esp32-s3-build, pi5-ros2 | a4988, pca9685, mpu6050, hc-sr04, qtr-8rc, lm2596 |
| drones `wf_797d6f20-21d` | – | content:quad5, racer, whoop, cinewhoop, longrange, wing, delivery, gpscam | agrihex, vtol, swarm, tricopter, octo |
| facts `wf_6ace19e7-573` | 51 | 12 checkers: a4988, agrihex, de10-lite, delivery, gpscam, l298n, la-components, longrange, swarm, tb6612, trainers, vtol | – |

Never launched: hx2, verify, translate, release. No commits since `245763f`; nothing deployed or pushed.

Repo at the cut-off (14:58, plain `npx tsc --noEmit -p .` without regenerating the content index): 34 errors in 5 files, all mid-edit drift in files owned by interrupted agents.
- `src/content/robotics/esp32-s3-build.ts` (16): `minMs`, `must`, `match` are not in `Omit<Check, "label">`.
- `src/components/search/RealBuildPanel.test.tsx` (10): fixtures don't match `Offer`.
- `src/app/[lang]/together/strings.ts` and `src/components/realtime/messages.ts` (3 each): TS2719 on the dynamic JSON imports.
- `src/content/boards/nodemcu.test.ts` (2).

`docs/verify/repo-health.md` has the 14:18 picture (29 TS errors, 5 failing tests of 1162). `.env.local` still has only the three Solana lines.

Cleanup at 15:00–15:08 (session 344b2088):
- The scratch was backed up here: 3,903 new or changed files, 2.1 GB, with `.next*` and node_modules excluded.
- The orphaned `next dev --port 45488` that ui:dronelab left (process group 41817, `.next-ui-dronelab`) was stopped.
- caffeinate (pid 79307, `-dims -t 86400`, started about 13:25) was left running on purpose.

### Resuming from a new session

The Workflow tool documents `resumeFromRunId` as same-session only, and these runs belong to session 327c458a. Try it first. If it is refused, relaunch by hand, and know how the scripts actually use their args:
- `prev` is wired into a prompt only for core2's checklist-a. `iynk-items.js` and `iynk-stage2.js` define `tails()` but never call it, so passing `prev` alone gives a relaunched agent nothing. Add `${tails(<label>)}` to the agent prompts in a copy of the script, then pass `prev` = `{label: prevMerged}` from cutoff-1419.json.
- `iynk-items.js`: same `lab` and `limit`; `items` = the interrupted plus the never-started items.
- `iynk-stage2.js`: `only` = `["shell-2", "engine:bench-2"]`.
- `iynk-gm-core2.js` has no `only`, and `iynk-hx1.js` has neither `only` nor `prev`. A plain relaunch reruns finished agents such as the architect, so write a continuation copy that runs only the interrupted labels.
- `iynk-facts-gm.js`: only the 12 checkers are left. `args.resumed` and `prev` are keyed by item id and read only by the research prompt, so the checkers need the same kind of edit.
- Each interrupted agent's own notes are in `<scratch>/gm/<label>/`, and its work is on disk in the paths it owns.

## Workflows, all stopped at 14:19:59 (scripts in `~/.claude/projects/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/workflows/scripts/`)

| Wave | Run | Script | Args |
|---|---|---|---|
| W1 facts | `wf_6ace19e7-573` (resumed) | `iynk-facts-gm.js` | `<scratch>/gm/w1-args.json` |
| core2 | `wf_7983fdc6-21a` | `iynk-gm-core2.js` | root, scratch, prev.checklist-a (2 transcripts) |
| HX wave 1 | `wf_249d2581-74d` | `iynk-hx1.js` | root, scratch |
| items: boards + parts | `wf_828c7092-26b` | `iynk-items.js` | lab boards, limit 10, 16 items (content:uno-r3, parts:inputs/drivers/modules/mat, 11 boards) |
| items: robotics | `wf_6e44fd79-4d1` | `iynk-items.js` | lab robotics, limit 7, the 13 benches (each owns its module) |
| stage2: shell-2 | `wf_3b43775c-716` | `iynk-stage2.js` | only [shell-2], launched 14:16 after shell-app and design-system finished |
| stage2: engine:bench-2 | `wf_a01431e2-07d` | `iynk-stage2.js` | only [engine:bench-2], launched 14:18 after engine:bench finished |
| items: drones | `wf_797d6f20-21d` | `iynk-items.js` | lab drones, limit 8, 13 items (content:quad5 + 12 crafts) |

What each wave covers:
- **W1 facts:** the 12 board/drone fact sheets finished at about 13:46; the later items are still running.
- **core2:**
  - architect, platform, shell-app, design-system, interpreters, flight, calc and checklist-a (calc, checklist-a and platform finished)
  - engine:bench and engine:drone, which publish their formats first
  - ui:boardlab, ui:robotics and ui:dronelab after the architect; sound after shell-app and design-system
- **HX wave 1:** server-ai, partner, search, solana-program, solana-app, realtime-server, realtime-client, mcp, data, hw.

Watcher: `<scratch>/gm/watch.sh` runs under Monitor. Its run list is in `<scratch>/gm/watch-state/runs`. It now greps `"isApiErrorMessage":true`.

Dependencies were installed by the orchestrator at 13:47–13:49, in small groups (one combined install hung npm's resolver for 10 minutes):
- zod, postgres, qrcode, bs58, server-only, @modelcontextprotocol/sdk
- @solana/web3.js 1.99.0, @coral-xyz/anchor 0.31.1
- wallet-adapter base/react/react-ui
- @types/qrcode (dev)

## Next waves

1. **Item stage 1** — boards, parts and drones LAUNCHED at 13:54. Robotics benches LAUNCHED at 13:58 (wf_6e44fd79-4d1). After engine:bench finishes, merge content:uno-r3's 16 lesson circuits (docs/requests/content-uno-r3.md) into figures/boards/uno-r3.js. Original plan for reference:
   - W3 boards: Uno R3 with 16 lessons, plus the 11 other boards with ≥4 lessons each
   - W4 drones: quad5, plus 12 more
   - W5 parts: la-components
   - W6 robotics: 9 modules and 13 benches
   - Each item: figure data, content, English JSON, a prompt record. Then build/verify/fix after the engines finish.
2. **HX wave 2** (after HX wave 1 and the lab UIs):
   - hx:dock integration into the lab pages, plus nav entries
   - race ghosts in the flight range
   - the Build Story share route
   - e2e for every hackathon flow
   - pitch, Devpost write-up, video shot list and judge Q&A
3. Translations for es/fr/de/zh/hi.
4. Verify/fix plus the README, which must list every Colorfigures prompt and the deploy steps.
5. **Deploy:**
   - Vercel production (CLI is logged in)
   - the relay on Vultr (needs the user's VM or API key; the scripts don't create resources until the user approves)
   - the .tech domain
6. Submission package, tomorrow by 10:30: video, Devpost text with a disclosure of the pre-event research, and a repo link. Pushing to GitHub needs the user's OK.

## User actions still pending (see STRATEGY section 9)

- Join the hackathon on Devpost.
- Put META_API_KEY, SERPAPI_KEY, DATABASE_URL (Tiger), and Vultr access into `.env.local`.
- Claim the .tech domain.
- Bring an Arduino Uno flashed with StandardFirmata.
- Answer: Best Novice eligibility, pitching.

## If paused again

1. Stop the workflows, the Monitor and caffeinate.
2. Back up the scratch: `rsync -a --exclude '.next*/' --exclude 'node_modules/' <scratch>/ ~/simlab-scratch-backup/`.
3. To resume, relaunch each script via `scriptPath` with `resumeFromRunId` and the same args. Finished agents come back from cache. The Workflow tool documents this as same-session only; if a new session is refused, follow "Resuming from a new session" above. `prev` reaches a prompt only where a script calls `tails()`, which today means only core2's checklist-a.

## Orchestrator to-dos

- Once the hx agents' English JSON exists, register the namespaces ai, search, solana, together and hw in src/i18n/namespaces.ts (NAMESPACES + Messages).
- Route cross-agent requests in docs/requests/*.md to their owners. Hand the ones whose owners have finished to wave-2 agents (hx-hw -> ui:boardlab store pins/lesson/world-input; ui-dronelab -> fly page integration; calc -> drone content agents).
- After engine:bench finishes, merge content:uno-r3's circuits into uno-r3.js.

## Staged scripts (written 14:00-14:12, not launched yet) and when to launch them

All live in the workflow scripts dir. Pass `{root, scratch, ...}` as args. `only` lists labels to run, so each agent can start as soon as its predecessors finish.

| Script | Agents | Launch when |
|---|---|---|
| `iynk-stage2.js` | engine:bench-2, engine:drone-2, ui:boardlab-2, ui:robotics-2, ui:dronelab-2, interp-2, shell-2 | each one when its core2 owner finishes (shell-2 needs shell-app and design-system) |
| `iynk-hx2.js` | hx:dock, hx:landing, hx:race, hx:story, hx:fixups then hx:e2e, hx:deploy-prep | when HX wave 1 is done (hx:race also needs flight and ui:dronelab; hx:dock and hx:landing need shell-app and design-system; deploy-prep around 16:30) |
| `iynk-verify.js` | `groups: [{items: [{lab, id, kind?, module?, modules?, facts?, notes?}], minutes?}]`, limit 8 | as stage-1 items finish (uno-r3 after engine:bench-2, quad5 after engine:drone-2) |
| `iynk-translate.js` | `langs`, `parts` (boards, robotics, drones, figures-ui), limit 10 | first pass around 16:30, second pass after verify |

Ownership hand-offs in wave 2:
- hx:dock owns src/i18n/namespaces.ts and the nav strings in shell.json. The orchestrator stops editing namespaces.ts once hx:dock launches.
- hx:landing writes a home namespace and hx:story a story namespace.
- The ui-2 agents own their stores and pages; hx:dock mounts everything through <LabDock>.

Status helper: `python3 -I <scratch>/gm/status.py <scratch>/gm/watch-state/runs`.
Orchestrator did at 14:00-14:05: registered the ai namespace, un-ignored .env.example, H2 contract fix (no runtime export, connection()).

- 14:16 shell-app and design-system finished, shell-2 launched. sound now starts inside core2 (chained). Staged: `iynk-release.js` (readme, rehearse, repo-fix; args.site).
- At deploy, check that .vercelignore exists (hx:deploy-prep writes it) before any `vercel deploy`: .env.local and keypairs must never upload.
- 14:17 MISTAKE, contained: SendMessage to five hx agents' ids (server-ai, partner, search, realtime-server, solana-app) spawned duplicate copies resumed from their transcripts. The copies were stopped with TaskStop within a minute. Before being stopped, the solana-app copy removed `runtime` from the three solana routes. If the originals died too (their journal shows failed, or their transcripts stop advancing), relaunch them as a continuation workflow. NEVER SendMessage a workflow agent by id. Outcome: the originals did die (transcripts frozen at 14:17:48); they are in the interrupted list above.
- 14:15 StateCond in schema.ts widened to Partial<Record<...>> (additive). It fixed the content-index loader type errors that the `satisfies` pattern causes. Logged in ARCHITECTURE section 0: TODO.
