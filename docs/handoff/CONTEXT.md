# Shared context

Everything a new agent or a new person needs that isn't in the code: what the users asked for, in their words where
it matters, what was decided and why, and what lives only on one machine. `HANDOFF.md` holds the live state; this
file holds the background. Whoever drives appends to the conversation log (§5) after every step.

## 1. The project

SimLab is a hardware lab in the browser (Boards, Robotics, Drones, flight sim) entered at HackTX 2026. The brief is
`docs/SPEC.md`. The plan being built is `docs/hacktx/BUILD-PLAN.md`; the audits it rests on are in `docs/audit/`.

- Hacking period: 11:30 CDT 2026-10-24 to 11:30 CDT 2026-10-25. Devpost entry and demo video due by then; submit by
  10:30. Judging is in person at UT Austin.
- Target tracks: Best Overall, SerpApi, Most Entertaining, Meta. MLH Solana and Best Hardware Hack only if time is
  left at the end (BUILD-PLAN.md phase 4).
- Team: Amar Kushwaha and a teammate. They take turns driving the build (see `HANDOFF.md` → "Working as a team").

## 2. Rules that came from the users (never change without asking them)

- **Hackathon rule.** No code from before 11:30 on 2026-10-24: not the old app (git baseline `245763f`, kept only on
  Amar's local branch `backup/simlab-history`, never pushed), not the morning's prototypes, not code blocks in
  `docs/research/`. Those are knowledge only. Pre-event research is disclosed in the Devpost write-up.
- **Commit after every step and push**, so nothing is lost if a session dies or the other person takes over.
- **Commit authorship.** Amar asked that the author be him only, with no agent attribution. With two people, each
  commit is authored by the person driving (their own git identity), and no `Co-Authored-By` or agent lines are ever
  added. Confirm with Amar if he wants something else.
- **Plan before build.** When asked for a plan, write only the plan. The build starts when a user says go
  ("autonomous mode"). Phase gates in BUILD-PLAN.md §6 replace per-phase approval once autonomous mode is on.
- **Ask first** before: creating cloud resources (Vultr), spending money, uploading Vercel env vars, moving devnet
  SOL from a personal wallet, submitting on Devpost, force-pushing. Normal `git push` to `origin main` is approved.
- **Don't cut corners.** Every item functional to the bar in BUILD-PLAN.md §4; report real check results, failures
  included; never claim "done" without the gate checks.
- Leave the old repo `github.com/kushwahaamar-dev/simlab` as it is. The working repo is
  `github.com/kushwahaamar-dev/sim`.

## 3. Decisions on record, and why

| When (CDT) | Decision | Why |
|---|---|---|
| 10-24 13:02 | Meta, SerpApi and Solana are the core sponsor tracks; keep everything else integrated | Amar: "focus on meta, serpapi, solana as core while still keeping anything possible integrated … not losing any of the functionality" |
| 10-24 13:45 | 6 locales (en, es, fr, de, zh, hi), not the 13 first promised | BASE_ARCHITECTURE D1; it was never told to the user at the time, which the history audit flags |
| 10-24 15:31 | Repo moved to `sim` with a fresh history starting today | Amar asked that nothing look committed before now. The pre-event baseline was **left out**, not re-dated, because re-dating it would present pre-event code as built during the event |
| 10-24 15:40 | Optimise for the five tracks above, nothing missing, plan first | Amar's request (§5) |
| 10-24 15:50 | Plan written; D1–D4 open | BUILD-PLAN.md §0 and §9 |
| 10-24 16:15 | Solana and Hardware go last (phase 4), built only if time is left after gate 3; their UI stays hidden until then. Rest of the plan fine | Amar: put Solana and Hardware "as the last end of it. We will do that after only when we have time left. Don't put that into build phase yet. Everything else looks fine." |
| 10-24 16:13 | **D2 confirmed:** translate all UI and figure text, plus judge-path prose (Uno R3, quad5, esp32-s3 bench); English prose with a "not yet translated" notice elsewhere; the rest overnight | Jagrati: "for D2 confirm the default" |
| 10-24 16:13 | **D4: API keys stay placeholders for now.** No Meta, SerpApi, Gemini, Tiger or Vultr keys yet; Jagrati's `.env.local` is a copy of `.env.example` with empty values, so sponsor panels show "not set up" and the core lab works. Vultr VM, Vercel link/env upload and Tiger are **not** approved: still ask before creating or uploading anything | Jagrati: "leave the api keys as place holder" |
| 10-24 ~16:00 | Raw session transcripts are **not** committed; this file summarises them instead | The tool permission check blocked exporting them, and they can contain secrets and file dumps |

## 4. Things that live on one machine only

| What | Where | How the other person gets it |
|---|---|---|
| `.env.local` (Solana program id, issuer keypair, cluster; later Meta, SerpApi, Tiger, relay URL) | Amar's Mac | send it privately (not chat logs, not git); never print a value |
| Devnet wallet with ~5 SOL, `Cxt17a9c…bW1S` | Amar's `~/.config/solana/devnet.json` | stays with Amar; only he approves moving SOL |
| Program deploy keypair for `BYFLDTLNi946Z8jT4JnxgE8Cpzkr9ud7tSrnThFTv31w` | Amar's Mac (git-ignored) | the deploy runs on Amar's machine, or he shares it privately |
| First build's scratch (4 GB of downloads and probes) | `~/simlab-scratch-backup/` | not needed; its `RESUME.md` and `cutoff-1419.json` are copied into `docs/handoff/first-build/` |
| First build's workflow scripts | `~/.claude/projects/…/327c458a…/workflows/scripts/` | copied into `docs/handoff/first-build/workflow-scripts/` |
| Session transcripts | `~/.claude/projects/-Users-amar-Codes-ak-simlab/*.jsonl` | not in git (see §3); `docs/audit/history.md` and §5 summarise them |
| Claude memory notes | Amar's `~/.claude/projects/…/memory/` | their content is in this file (§2, §6) |

Machine setup for a new driver: Node 24 (at least 22.18; not pinned in the repo yet, BUILD-PLAN phase 1 adds it),
`npm ci`, `npx playwright install chromium`,
Python 3 (figures build: `python3 -I figures/tools/cfbuild.py`), and for Solana work Solana CLI 4.2+ and Anchor 0.31.1.

## 5. Conversation log (newest last; append after every step)

Short entries: who, when, what was asked or decided, in the user's words where it matters.

- **10-23 21:48 → 10-24 14:19, Amar, first build session.** Brief pasted at 01:27 ("A lot of things are wrong
  here … Make sure it is what I want"). Research, design, facts and build waves. 12:41 "god mode, we need it ready by
  6pm". 13:02 HackTX: Meta, SerpApi, Solana core. 14:17 SendMessage to workflow agents spawned duplicates (see §6).
  14:19 usage limit stopped every workflow with 56 agents in flight. Full timeline: `docs/audit/history.md`.
- **10-24 15:00, Amar.** Back up the scratch, stop the leftover dev server on port 45488, record the cut-off state in
  RESUME.md, leave caffeinate running. Done. Then "Not yet. Leave everything paused for now."
- **10-24 ~15:15, Amar.** Asked for a brutal track analysis. Answer: Hardware Hack + Overall + SerpApi fit best;
  Meta "shrink", Solana "cut from the demo".
- **10-24 ~15:20, Amar.** "Commit the previous things as well … The author should only be me … design the session such
  a way that I can take off through another agent and continue from exactly where you left off." → HANDOFF.md and
  CLAUDE.md created.
- **10-24 15:31, Amar.** Move to `github.com/kushwahaamar-dev/sim` with every commit dated now. Done with a fresh
  history (§3). "Leave the old simlab repo as it is."
- **10-24 15:40, Amar.** Optimise for Best Overall, SerpApi, Most Entertaining, Meta, Solana: "Don't cut any corners
  … We want the entire thing functional. Nothing's to be missing … create a bulletproof plan … Do thorough dynamic
  check on every single end … a proper, detailed architecture … tell me how the build phases will go. Then after I say
  [go] you can go on autonomous mode to build … in six hours now." → six audits, then BUILD-PLAN.md (15:50).
  Flagged: "four tracks" vs five rows; Hardware omitted; 90% can't be promised; ~190 agent-hours of work.
- **10-24 ~16:00, Amar.** Two people will take turns; "after every single step, the agent commits … when she's done,
  I can just take over … do it for multiple users as well. Make sure everything is committed, every single context,
  history, plans." → this file, `docs/handoff/first-build/`, the team protocol in HANDOFF.md, `scripts/handoff-status.sh`.
  Amar is pausing; the plan's D1–D4 are still unanswered, so the build has **not** started.
- **10-24 16:15, Amar.** Solana and Hardware moved to the end (phase 4, only if time is left); "Everything else looks
  fine." Asked for the hand-off prompt (with the GitHub link) for his teammate's agent and his own. D2 and D4 still
  open; build not started.
- **10-24 16:09, Jagrati (teammate), new session.** Cloned the repo and asked the agent to follow HANDOFF.md exactly:
  take over as driver under Jagrati's own git identity (Jagrati Kumari), continue from "Next step", commit and push
  after every step, log instructions and decisions here, ask before anything HANDOFF.md says needs a user's OK, and
  on "I'm stopping" hand over (checkpoint, Driver "none, free to take", clear Next step, commit "Hand over", push).
- **10-24 16:13, Jagrati.** "leave the api keys as place holder and for D2 confirm the default." → D2 confirmed,
  D4 keys left as placeholders (§3). Build not started: waiting for "autonomous mode".
- **10-24 16:23, Jagrati.** "autonomous mode" → phase 1 started with keys as placeholders. Machine set up (Node 24 via
  nvm, `npm ci`, Playwright chromium). Baseline re-measured: tsc 34 errors, eslint clean, vitest 11 failed of 1243.
  Seven agents launched from `scripts/workflows/phase1.md` (Agent tool in the shared tree, not a Workflow run).
- **10-24 ~16:40, Jagrati.** The session was interrupted and all seven phase-1 agents stopped; P1-deploy had been
  stopped by the user just before. Jagrati said "resume"; the stopped agents can't be resumed, so the agent asked
  whether to relaunch fresh ones.
- **10-24 16:46, Jagrati.** "do what's best" → relaunch all seven phase-1 agents fresh (P1-deploy included: it only
  touches local config and never deploys); each first reviews its own leftover uncommitted files.
- **10-24 16:57, Amar.** Cloned `https://github.com/kushwahaamar-dev/sim.git`, opened it, and asked the agent to
  follow HANDOFF.md exactly. Take over as driver under Amar's git identity. Continue from "Current status → Next
  step". Commit and push after every step. Add his instructions and decisions to this section as they happen. Ask
  before anything HANDOFF.md says needs a user's OK. When he says he is stopping, hand over. Checkpoint the step,
  set Driver to "none, free to take", write a clear Next step, commit "Hand over" and push.
  Decision: do not wait until 18:40 for Jagrati's session. That session is on another Mac, its agents already
  stopped, and its uncommitted files are not in this clone. Amar is the driver, so this machine relaunches all
  seven labels from committed `main`.
- **10-24 17:04, Amar.** "the thing is we already have the local setup here" and pointed at
  `/Users/amar/Codes/ak/simlab`. Continue from that checkout. It was 16 commits behind `origin/main`, with
  `node_modules` and `.env.local` already in place. Fast-forwarded to `94d3caa`. A whitespace-only change in
  `docs/hacktx/STRATEGY.md` was discarded. The extra clone at `/Users/amar/Codes/sim` is not the working tree.
  Decision: do not run `npm ci` here. A fresh install on the other clone reported `PageProps` errors this tree
  does not have. Typecheck on simlab is 24 errors in four files (see HANDOFF.md).
- **10-24 17:06, Amar (driver decision).** Relaunch all seven unfinished labels in the simlab tree. No user message
  at this minute. The next step in HANDOFF.md was the relaunch, and none of the labels were reported done.
- **10-24 17:12, Amar (driver decision).** One P1-checks per tree. Keep `1e6f87c4` in simlab. The copy in
  `/Users/amar/Codes/sim` (`69f24d0b`) stood down on its own. The earlier wave in that clone was told to stop
  and not push. Its uncommitted files and unpushed note `c3c61a7` stay there.
- **10-24 17:22, Amar (driver decision).** P1-checks meets its done line. Do not relaunch it. The S3 dimmer prose
  stays with P1-health, which already has that JSON file open. The Web Worker browser pass waits for gate 1.
- **10-24 17:30, Amar (driver decision).** P1-health meets its done line. Do not relaunch it. The touch-page
  prerender is a follow-up of its own, after the labels still running, using the request they filed.
- **10-24 17:31, Amar (driver decision).** P1-voice is done. Do not relaunch it. P1-deploy's runbook is enough for
  now. Rerun only the local smoke after the touch page prerenders. Do not link Vercel.
- **10-24 17:32, Amar (driver decision).** P1-engine meets its done line. Do not relaunch it. Leave the uno-r3
  figure source to P1-uno.
- **10-24 17:50, Amar (driver decision).** P1-dock meets its done line. Do not relaunch it. The Uno button-lesson
  string stays with P1-uno, who is still editing that board.
- **10-24 18:01, Amar (driver decision).** P1-uno meets its done line. Do not relaunch it. Do not relaunch
  P1-engine for the four powered-fault drawings. The color-string request is already fixed in the Uno content.
- **10-24 18:05, Amar (driver decision).** Fix the DevKitC pin strings now that every phase-1 label has stopped.
  The production build is green. The local smoke is the next step. Vercel stays unlinked.
- **10-24 18:22, Amar, new session.** Same instructions as 16:57: open `/Users/amar/Codes/ak/simlab`, read CLAUDE.md,
  run `scripts/handoff-status.sh`, follow HANDOFF.md exactly, take over as driver under his own git identity and
  continue from "Next step". Commit and push after every step and log his instructions and decisions here. Ask
  before anything HANDOFF.md says needs a user's OK. On "I'm stopping", hand over.
- **10-24 18:28, Amar (driver decision).** The local smoke is done and passes for every English demo route. The
  Spanish board page 404s, which is BUILD-PLAN §3.2 item 5 (no phase-1 row owned it). Do not fix it inside the
  smoke step. Raise it at gate 1. The dashboard title suffix is a phase-3 polish note. Vercel stays unlinked until
  Amar says yes.

## 6. Lessons learned (apply them)

- **Never SendMessage a running Workflow agent by its id.** It starts a duplicate copy working on the same files
  instead of reaching the live agent. Talk to running agents through files they re-read, or through their follow-up
  agent's prompt.
- **A usage limit can stop everything at once.** End waves at gates, commit after each agent, keep HANDOFF.md current.
- **Workflow runs can't be resumed from another session or machine.** Relaunch the script with only the unfinished
  labels; the first build's scripts pass `prev` only to core2's checklist-a, so a relaunch needs a script edit.
- **Private test runners hide failures.** Only the app's own path (`runHeadless` + `evaluateChecks`, figure probes,
  route crawl) counts as proof.
- **Missing prose silently 404s a page.** Check `node scripts/gen-content-index.mjs --check` before every deploy.
- Install npm packages in small groups: one combined Solana install hung npm's resolver.
- `next build` adds `.next-<label>` lines to `tsconfig.json`; remove them before committing.
