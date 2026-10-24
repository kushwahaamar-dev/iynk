# SimLab handoff

This file is the single place where the build's live state is kept. Whoever is working on SimLab (a Claude session, a
cloud agent, a human) updates it after every step, commits it and pushes it, so the next one can carry on from
exactly where the last one stopped.

## How to resume

1. Read this whole file, then `docs/hacktx/BUILD-PLAN.md` (the approved plan), then the files it names for your step.
2. Sync and check: `git pull --ff-only`, `git log --oneline -15`, `git status`. The newest "Checkpoint log" entry
   below must match the newest commit. If the tree has uncommitted changes, someone stopped mid-step: read
   `git diff`, decide whether that work is usable, and say what you found before you touch it.
3. Find **Current status → Next step**. Do that step, and only that step, the way BUILD-PLAN.md describes it.
4. Verify before you call it done: the step's own checks plus `npm run typecheck`, `npx eslint . --quiet` and the
   tests for the paths you touched. Report real results, failures included.
5. Commit (rules below), update **Current status** and add a **Checkpoint log** line, commit that, then push.
6. If you are about to run out of context or usage, stop at a clean point and do step 5 first. A half-step is
   fine as long as the log says exactly what is done and what isn't.

## Rules that never change

- **Hackathon rule.** HackTX 2026 requires every line of project code to be written during the hacking period,
  11:30 CDT on 2026-10-24 to 11:30 CDT on 2026-10-25. Never copy code from before then: the old app in git
  baseline `245763f`, the pre-event prototypes, or code blocks in `docs/research/`. Use those only as knowledge.
- **Commits.** The author is Amar Kushwaha only (the repo's git config already says so). Add no `Co-Authored-By`
  or other attribution lines. Commit in small, honest steps with messages that say what changed and why.
- **Never commit secrets.** `.env.local`, keypairs and `.next*/` are ignored; keep it that way and check
  `git status` before every commit. Never print a key's value.
- **Ask the user first** before creating cloud resources (Vultr), spending money, uploading env vars to Vercel,
  submitting on Devpost, or force-pushing. Normal `git push` to `origin main` is approved.
- **Workflow agents.** Never SendMessage a running Workflow agent by its id: it starts a duplicate copy instead.
  Talk to running agents through files they re-read, or through their follow-up agent.
- **Next.js 16.4 differs from what models know.** Read `AGENTS.md` and the guide in `node_modules/next/dist/docs/`
  before using a Next API. Builds that share the tree use `NEXT_DIST_DIR=.next-<label>`; delete that folder after.
- Ownership and contracts: `docs/ARCHITECTURE.md` (§2 owners, §3–9 contracts), `docs/hacktx/HX-CONTRACT.md`
  (sponsor layer, H12 owners). Change schemas additively and log it at the top of ARCHITECTURE.md.

## Where state lives

| What | Where | Survives a new machine? |
|---|---|---|
| Code, docs, this file, the plan, audit reports | this repo (`origin` = github.com/kushwahaamar-dev/sim) | yes |
| Secrets (Solana program id and issuer keypair, later Meta/SerpApi/Tiger keys) | `.env.local` on the user's Mac, never in git | no: ask the user |
| Agents' scratch notes and downloads from the first build | `~/simlab-scratch-backup/` on the user's Mac (`RESUME.md`, `cutoff-1419.json`) | no |
| First build's workflow scripts and agent transcripts | `~/.claude/projects/-Users-amar-Codes-ak-simlab/327c458a-…/` on the user's Mac | no |

Anything the next agent needs must end up in the repo. Machine-local state is only a convenience.

## Current status

- **Updated:** 2026-10-24 15:50 CDT.
- **Phase:** 0, the audit and the plan. Nothing is being built. The user asked for a full audit, an architecture
  and a phased build plan for five tracks (Best Overall, SerpApi, Most Entertaining, Meta, Solana), and will say when
  to start building ("autonomous mode").
- **Done in phase 0:**
  - The first build stopped at 14:19 (usage limit). Its state is recorded in `~/simlab-scratch-backup/RESUME.md`.
  - Today's work committed and pushed to github.com/kushwahaamar-dev/sim.
  - Checks at that commit:
    - `npm run typecheck`: 34 errors in 5 files.
    - ESLint: clean.
    - Vitest: 15 failed of 1243.
    - `next build`: fails while prerendering `/en/boards/esp32-s3-devkitc-1` (missing string
      `lessons.dimmer.title`).
    - Live crawl of 45 pages on a dev server: `/en/boards/uno-r3` has no figure, the esp32-devkitc lessons after
      blink throw, and only 7/12 boards, 4/13 benches and 5/13 drones have content.
  - Six area audits (boards, robotics, drones, platform, sponsor layer, history) are running.
- **Next step:** finish the audits, copy their reports into `docs/audit/`, write `docs/hacktx/BUILD-PLAN.md`
  (architecture and phases), and present it to the user for approval. Don't start phase 1 without the user's go.

## Checkpoint log (newest first)

- 2026-10-24 15:31 CDT: the repo moved to github.com/kushwahaamar-dev/sim at the user's request, with a fresh history
  that starts now: today's three commits were rebuilt from their identical trees. The pre-event baseline `245763f` is
  not in this history. The old history is kept only as the local branch `backup/simlab-history` (never push it).
  Never force-push `main` again unless the user asks.

- 2026-10-24 15:50 CDT: handoff system created (this file, `CLAUDE.md`). Pushed `57fbba9` and `74e41ce` to origin.
