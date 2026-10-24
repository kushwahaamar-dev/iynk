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

- **Updated:** 2026-10-24 16:44 CDT (machine clock).
- **Driver:** Jagrati Kumari, Mac RVW-F0096FW3J2M, since 2026-10-24 16:09 CDT.
- **Phase:** 1 running ("autonomous mode" at 16:23). Seven agents from `scripts/workflows/phase1.md`: P1-health,
  P1-checks, P1-uno, P1-engine, P1-dock, P1-voice, P1-deploy. State per label in the checkpoint log.
- **Plan:** `docs/hacktx/BUILD-PLAN.md`, written from the six audits in `docs/audit/` (boards, robotics, drones,
  platform, sponsor-layer, history). Phases 1–3 build for Best Overall, SerpApi, Most Entertaining and Meta.
  Solana and Best Hardware Hack are phase 4, only if time is left after gate 3 (Amar, 16:15). Don't start them
  earlier.
- **Checks at the last code commit:** typecheck 34 errors; eslint clean; vitest 11 failed of 1243 (re-measured on Node 24); `next build`
  fails prerendering `/en/boards/esp32-s3-devkitc-1`.
- **Decided:** D1 (tracks, above). Amar: "Everything else looks fine."
- **Decided by Jagrati (16:13):** D2 confirmed (the plan's default). D4: API keys stay placeholders for now;
  `.env.local` on Jagrati's Mac is `.env.example` with empty values. Vultr, Vercel env upload and Tiger are not
  approved yet, so gate 1 runs without live Meta/SerpApi and rooms use the one-browser fallback until keys arrive.
  D3 (devnet SOL) is asked only when phase 4 starts.
- **Next step:** relaunch the phase-1 agents (all seven were stopped, see the 16:44 checkpoint) with their sections of
  `scripts/workflows/phase1.md`, telling each to first review and keep or redo its own uncommitted files. Then gate 1
  (BUILD-PLAN §6; live keys and the preview deploy wait for the user's OK).

### Claims (only when both people work at the same time)

| BUILD-PLAN row | Who | Since | State |
|---|---|---|---|
| – | – | – | – |

## Checkpoint log (newest first)

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
