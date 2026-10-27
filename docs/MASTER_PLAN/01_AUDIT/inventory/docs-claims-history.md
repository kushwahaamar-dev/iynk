# Documentation, decisions, git history and product claims

**Paths:** `README.md`, `HANDOFF.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/SPEC.md`, `docs/hacktx/*.md` (17 files incl. STRATEGY, PITCH, JUDGE-QA, DEVPOST-STORY, DEVPOST-WRITEUP, BUILD-PLAN, VIDEO, DEPLOY), `docs/audit/*.md`, `docs/verify/*.md`, `docs/research/*.md`, `docs/facts/*.md`, `docs/handoff/CONTEXT.md`, `docs/requests/*.md`, `docs/design/*.md`, plus landing copy in `src/i18n/messages/en/{shell,common,together,solana}.json`.   **Entry points:** `CLAUDE.md` -> `bash scripts/handoff-status.sh` -> `HANDOFF.md` -> `docs/handoff/CONTEXT.md`; for product claims `README.md`, `docs/hacktx/DEVPOST-WRITEUP.md`, `PITCH.md`, `JUDGE-QA.md`, `DEVPOST-STORY.md`.   **LOC:** 48,161 lines of markdown in scope (`cat README.md HANDOFF.md docs/ARCHITECTURE.md docs/DECISIONS.md docs/SPEC.md docs/hacktx/*.md docs/audit/*.md docs/verify/*.md docs/research/*.md docs/facts/*.md docs/handoff/CONTEXT.md docs/requests/*.md | wc -l`), of which facts 17,823, research 17,133, requests 5,265 (104 files), hacktx 3,238, verify 2,688.   **Owner today:** docs/ARCHITECTURE.md section 2 lists agent work packages, not people ("architect" owns ARCHITECTURE.md and DECISIONS.md; "verification, README" owns README.md). Those agents are gone. In practice Amar Kushwaha is the only person who has driven since 10-24 16:57 (776 of 792 commits); a teammate, Jagrati Kumari, authored 16 commits, all between 16:11 and 16:56 CDT on 10-24.

Audit baseline: commit `bb546d6`, 2026-10-26. All labels are VERIFIED, DOCUMENTED, EXTERNAL, ESTIMATED, HYPOTHESIS or UNKNOWN as defined in the audit rules. Nothing in the repo was changed except this file and CLAIMS.json. Scratch scripts are in `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/audit/docs/`.

## Purpose

This subsystem is everything that is not code but decides what the code is supposed to be and what has been promised about it: the verbatim brief (`docs/SPEC.md`), the binding architecture and decisions (`docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/hacktx/BASE_ARCHITECTURE.md`, `HX-CONTRACT.md`), the sourced fact sheets for every board and drone (`docs/facts/`), the agent hand-off system (`HANDOFF.md`, `docs/handoff/CONTEXT.md`, `docs/requests/`), the verification reports (`docs/verify/`), and the sales copy for the hackathon (`README.md`, `PITCH.md`, `JUDGE-QA.md`, `DEVPOST-WRITEUP.md`, `DEVPOST-STORY.md`, landing JSON). It is also the source of the 119-row claim register below, which the synthesis agent should check against the code audits.

The corpus was written almost entirely by AI agents for AI agents and for one hackathon deadline (HackTX 2026, hacking period 11:30 CDT 10-24 to 11:30 CDT 10-25, `docs/handoff/CONTEXT.md:12`). It is accurate on counts and honest about gaps in many places, but it is a time-stamped build diary, not maintained product documentation. Several files contradict each other because they were written at different hours and never reconciled (table in Known defects).

## Dependencies (imports in, imports out; third-party packages)

- **In:** nothing imports docs. Code points at docs in comments and tests only (for example `docs/verify/gate3-lessons.md` is written by `IYNK_LESSON_TABLE=... npx vitest run`, `gate3.md` "How to rerun"). `scripts/handoff-status.sh` reads `HANDOFF.md`.
- **Out:** docs reference code paths heavily. Every path I spot-checked in JUDGE-QA existed (`src/lib/interp/check-job.ts`, `src/lib/server/mcp/tools/*.ts`, `server/realtime/src/config.js`, `db/migrations/*.sql`). There is no link checker, so path rot is UNKNOWN beyond the sample.
- **Third-party material inside docs:** `docs/research/` contains reverse-engineering notes on three third-party sites (Learn Arduino, Robotics Engineer, Drone Engineer; `docs/research/learn-arduino.md`, `robotics-bench-a.md`, `robotics-bench-b.md`, `drone-lab-a.md`, `drone-lab-b.md`). `docs/SPEC.md` tells the agents to "reverse-engineer every interaction, visual style, lesson structure, calculation, failure mode" from those sites. `figures/vendor/colorfigures/LICENSE` is MIT (April Zhu, Tolga Cohce). No licence or permission from the three originals' authors is in the repo (grep "licen|permission" in docs/research returns only the Colorfigures line, `docs/research/colorfigures-guide.md:429`).
- **Repo licence:** none. No `LICENSE` file at the root and `package.json` has no `license` field; `gh repo view kushwahaamar-dev/iynk` returns `licenseInfo: null`, visibility PUBLIC (VERIFIED).

## Public interfaces (exported functions/types/components/messages, with path:line)

There is no code API. The "interfaces" are the contracts other agents and humans work from:

| Contract | Where | Status |
|---|---|---|
| Fixed decisions D1-D14 (locales, routes, ids, storage key `iynk:v1`, figure bridge envelope, seams for the hackathon layer) | `docs/hacktx/BASE_ARCHITECTURE.md:6-19` | VERIFIED present; D7 storage shape has since been extended (ARCHITECTURE.md v1.6/v1.7 add `settings.telemetry`, `iynk:ghost:v1:*`, `iynk:challenge:v1:*`) |
| Content schema and module map | `docs/ARCHITECTURE.md:1-108` (changelog v1 to v1.9, last entry 10-25 00:51 CDT) | Changelog stops at v1.9; later schema changes are not logged (HYPOTHESIS, not diffed) |
| Decisions A1-A17, calculator corrections, B1-B30 | `docs/DECISIONS.md:6-65` | B21 and B30 are stale (see defects) |
| Hackathon layer contract | `docs/hacktx/HX-CONTRACT.md` (342 lines) | not audited line by line |
| Hand-off protocol | `HANDOFF.md:9-60` (resume steps, driver, claims table, rules) | followed in practice: at least four takeovers are logged in the checkpoint log |
| Request queue between agents | `docs/requests/*.md`, 104 files, 15 `*-gaps.md` | no status field, no closure tracking |
| MCP tool list (public interface the docs advertise) | `JUDGE-QA.md:128-135` names 7 tools | VERIFIED: `search_catalog`, `get_item`, `drone_calc`, `price_parts`, `plan_build_night`, `create_room`, `get_passport` in `src/lib/server/mcp/tools/*.ts` |

## State ownership and persistence (stores, localStorage keys, server state, DB tables)

- Docs describe state; they do not own any. Persistence facts the docs assert and I verified in source: localStorage key `iynk:v1` (BASE_ARCHITECTURE D7), TimescaleDB events hypertable with 1-day compression and 30-day retention (`db/migrations/0001_events.sql:27,30`), buddy profiles `expires_at` default 24 h with a 15-minute cleanup job (`db/migrations/0003_profiles.sql:14,23,32`), relay room TTL 30 min (`server/realtime/src/config.js:14`), room cap 8 (`config.js:5`).
- **Project memory lives outside git for some items** (CONTEXT.md section 4): `.env.local`, the devnet wallet `Cxt17a9c...bW1S`, the program deploy keypair, session transcripts (`~/.claude/projects/...`), `~/simlab-scratch-backup/` (4 GB), and the local branch `backup/simlab-history`. The Devpost claim "more than 250 agents" rests on transcripts counted on Amar's Mac (DEVPOST-WRITEUP.md "Confirm before submitting"), not on anything in git. The 11:30 hackathon rule cannot be audited from git alone (see Git history).
- Naming debt that is state: DB migration name `simlab_migrations`, job `simlab_expire_profiles` (`db/migrations/0003_profiles.sql:32`), Vultr compose stack `simlab-realtime` in `/opt/simlab-realtime`, Vultr SSH key `simlab-realtime-deploy` (HANDOFF.md:129-133, CONTEXT.md section 5, 10-25 09:00). Lowercase "simlab" remains in 8 tracked files outside handoff docs (`grep -rIli simlab`).

## Current functionality (what VERIFIED works, how you know)

### Documentation corpus: what exists and how reliable it is

| Group | Files / lines | Reliability | Evidence |
|---|---|---|---|
| Product counts (README, WRITEUP, JUDGE-QA, STORY) | 5 files | High on counts, VERIFIED below | I imported all 38 content modules in Node 24 and counted: 12 boards, 13 benches, 13 drones; 71 lessons (16 on Uno R3, min 4); 144 board failures; 272 bench steps; 106 bench faults; 31 tasks; 78 drone tests; 22 courses (21 with `par`); 131 CLI snippets. Script `scratchpad/audit/docs/count2.mjs`. Also `find public/figures -name '*.html' \| wc -l` = 80; `find src/i18n/content -name '*.json' \| wc -l` = 228; figure strings = 4087 keys in each of es, fr, de, zh, hi (python `len`), no `en.json`; `LOCALES` has 6 (`src/i18n/config.ts:4`); 7 MCP tools; 34 `it(` in `solana/tests/iynk_passport.test.ts` |
| Fact sheets | 35 files, 17,823 lines, 849 lines containing a URL (`grep -c`) | High for what is cited; honest "(unverified)" and "(estimated ...)" flags | see citation check below |
| Hand-off diary (HANDOFF, CONTEXT) | 382 + 274 lines | High for chronology; the live status block is partly stale | HANDOFF.md:121-128 still lists a "Running" workflow and a "Servers" line from 09:55 |
| Verification reports | `docs/verify/` 2,688 lines | Point-in-time snapshots | `gate3.md` is dated 05:46-06:11 CDT 10-25 at `569b205`; `fresh-eyes.md` is 02:28-02:50 and its blockers are not all marked closed |
| Hackathon sales docs | PITCH 314, JUDGE-QA 218, WRITEUP 230, STORY 79, VIDEO 286 | Mixed; some sentences predate Solana/Tiger going live | see defects |
| Requests/gaps | 104 files | Stale as a queue | no status markers; e.g. `P2-social-gaps.md` item "usage opt-out isn't enforced" was closed by ARCHITECTURE.md v1.6 |

**Fact-sheet sourcing, 3 citations checked (EXTERNAL, network read-only):**
1. `docs/facts/hcsr04.md` source [1], the ElecFreaks HC-SR04 datasheet at `cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf`: downloaded and read with pdftotext. It says 5 V working voltage, 15 mA, "Working Frequency 40Hz" (the sheet's own typo, which the fact sheet flags as "(sic)"), 10 us trigger, eight 40 kHz pulses. Matches what the sheet says it took. The hcsr04 sheet's own status line says it was "written 14:00, improved 14:00-14:25" and the history audit lists it among 7 sheets whose adversarial check "never started" (`docs/audit/history.md:99-100`).
2. `docs/facts/gpscam.md:3,30`: "ArduCopter 4.7.2 ... released 2026-10-14". GitHub API `releases/tags/Copter-4.7.2` returns `published_at 2026-10-14T00:52:51Z`, `prerelease false`. Matches.
3. Betaflight "2026.6.2" tag cited in quad5/racer/whoop sheets: GitHub `git/ref/tags/2026.6.2` returns HTTP 200. Exists.
Limits: 849 URL lines were not all fetched. Several sources are marked "via search summary" or are retailer listings (hcsr04 [8]-[11], [14]). About 3 of 849 is a sample, not an audit. Fact sheets are checked by the same kind of agent that wrote them (adversarial pass, `uno-r3.md:501`).

### Git history

VERIFIED by `git log` (792 commits, `git log --oneline | wc -l`):

- Authors: Amar Kushwaha 776, Jagrati Kumari 16 (`git log --format=%an | sort | uniq -c`). Committer is the same as author. No `Co-Authored-By` anywhere (`git log --format=%B | grep -ci co-authored-by` = 0), as CONTEXT.md:25 requires.
- Span: first commit `d5bdf44` 2026-10-24 15:30:42 -0500, last `bb546d6` 2026-10-25 11:19:58 -0500. Commits after 11:30 on 10-25: 0 (VERIFIED, the deadline was respected). GitHub `pushedAt` 2026-10-25T16:20:00Z = 11:20 CDT.
- Volume: 4,938 file changes, +777,896 / -73,564 lines across history (`git log --shortstat` summed). 353 commits on 10-24, 439 on 10-25. One commit is a `WIP:` and none are reverts.
- Jagrati's 16 commits are all in 16:11-16:56 on 10-24 (phase 1 relaunch), under email `jagratikumari@rivianvw.tech` (an employer-looking domain, published in a public repo's history; HYPOTHESIS that this is unintended).
- No TODO/FIXME/XXX/HACK markers exist in `src server figures/engine figures/tools scripts solana/programs db` (grep, 0). Debt is tracked in `docs/requests/*-gaps.md` instead of in code.

Commits per hour (CDT, each # is about 5 commits):

```
10-24 15h  10 ##
10-24 16h  17 ###
10-24 17h  21 ####
10-24 18h  17 ###
10-24 19h  18 ####
10-24 20h  38 ########
10-24 21h  28 ######
10-24 22h  70 ##############
10-24 23h 134 ###########################
10-25 00h  53 ###########
10-25 01h 140 ############################
10-25 02h  53 ###########
10-25 03h  60 ############
10-25 04h  54 ###########
10-25 05h  26 #####
10-25 06h   9 ##
10-25 07h   8 ##
10-25 08h  11 ##
10-25 09h  16 ###
10-25 10h   7 #
10-25 11h   2 
```
(sum 792; command: `git log --format='%ad' --date=format:'%m-%d %H' | sort | uniq -c`). Two bursts (23h: 134, 01h: 140) are the agent waves pushing at once; the night shift ran while Amar slept (CONTEXT.md:182-189). Average over the 19.8 h span is about 40 commits per hour (ESTIMATED).

**The hackathon window and the baseline.** The rule is written in `HANDOFF.md:51-53`, `CONTEXT.md:20`, `DEVPOST-WRITEUP.md` "Before the event". What git shows:

- `245763f` ("Baseline: SimLab state before the rebuild audit", 2026-10-24 01:34:23 -0500, 43 files) exists in the object store and is reachable only from the local branch `backup/simlab-history` (`git branch --contains 245763f`; `git merge-base --is-ancestor 245763f main` fails). It is not in main's history, so HANDOFF.md:378-379 is correct. Only 3 blobs are identical between `245763f` and `d5bdf44` (`join` on blob ids), so the old app's code is not in the tree (VERIFIED at blob level; whether any code was retyped from it is UNKNOWN).
- `d5bdf44` ("SimLab HackTX build: labs, figure engines, interpreters and sponsor layer") adds 900 files and 310,462 lines in one commit, with the first three commits all stamped 15:30:42 (`git log --reverse`). HANDOFF.md:378 says "today's three commits were rebuilt from their identical trees". So the commit timestamps for everything made between about 13:28 and 14:19 on 10-24 (the first build's HX wave, item waves, core2) are collapsed into one 15:30 commit. The commit message itself records "34 type errors in 5 files, 15 failing tests of 1243, and the production build stops while prerendering the esp32-s3-devkitc-1 board page".
- The first build session ran 10-23 21:48 to 10-24 14:19 (`docs/audit/history.md:6-24`). Research, design and fact-sheet workflows ran from 01:36 to 10:27, before 11:30. `docs/audit/history.md:18` says the core build started 12:56-13:28 and "the 13:00 interpreter port moved to the discarded folder". The write-up discloses pre-event brief, research notes, "the first datasheet fact sheets (finished during the event)" and "an earlier iynk prototype" (`DEVPOST-WRITEUP.md` "Before the event").
- Consequence: **git alone cannot prove the claim "all code written between 11:30 on 10-24 and 11:30 on 10-25"** (claims C082, C083). The evidence is the session transcripts and workflow scripts on Amar's Mac and the copies in `docs/handoff/first-build/`. A judge or an organiser who reads `git log` sees a 310k-line first commit at 15:30. `docs/research/` also holds the pre-event audit of the pre-event app (`current-iynk-audit.md`, 618 lines, "Build under test ... at commit `245763f`") and `docs/design/research.md`. Severity high for the hackathon outcome, irrelevant for the post-hackathon product.
- `README.md` and `JUDGE-QA.md` Q24 / write-up say "an earlier prototype ... is not in this repository". True for the tree. The organisers' answer to "are pre-event research notes allowed" is still a blank `[___]` in the write-up (`DEVPOST-WRITEUP.md`, "Before the event", last sentence).

## Known defects (with repro or evidence)

Documentation and claim defects, each VERIFIED by reading both files:

| # | Defect | Where | Why it matters | Sev |
|---|---|---|---|---|
| D1 | `DECISIONS.md` B21 says the relay and Tiger Data "were never approved" and rooms run on BroadcastChannel; B30 says "Phase 4 is skipped: no Solana deploy". Production has the Vultr relay, Tiger and the deployed `iynk_passport` program (`HANDOFF.md:86-92,129-133`; WRITEUP says all three entered as tracks) | `docs/DECISIONS.md:56,65` | the decision log contradicts the live system; a new engineer would believe Solana is not deployed | medium |
| D2 | `JUDGE-QA.md` Q25 and Q16 say Proof of Build is skipped/"off" and `get_passport` "says Proof of Build is not set up while Solana is off"; Q15 says keys are "added on the morning of the 25th"; `PITCH.md:24,268` says "Not in this pitch: Solana" and "`solana` stays false". `DEVPOST-WRITEUP.md` enters MLH Solana and says it is live | `docs/hacktx/JUDGE-QA.md:128-135,201-209`; `PITCH.md:24,268` | a presenter reading Q&A would deny a feature the Devpost claims | medium |
| D3 | `DEPLOY.md:25,32` names the Vercel project `simlab-hacktx` and says `DATABASE_URL` and Solana values were "Not uploaded"; HANDOFF.md:88,129 says project `iynk` and both are on | `docs/hacktx/DEPLOY.md:25-32` vs `HANDOFF.md:88` | the runbook is wrong about production env | medium |
| D4 | Three different public URLs: README says `iynk.tech` (README.md:6), the Devpost write-up links `iynk.vercel.app` (`DEVPOST-WRITEUP.md` Links), HANDOFF says `iynk.vercel.app` is production and `iynk.tech` went live 10-25 11:09 | README.md:6; WRITEUP; HANDOFF.md:166 | which URL judges and users see differs by document | low |
| D5 | Test count differs by document: README "about 2,800", STORY "2,797", gate3.md "2788 passed, 5 skipped", HANDOFF "2797 passed, 5 skipped". Not re-run by me (static `it(` count is 1,432 in src+server; `it.each` expands) | README.md:131; DEVPOST-STORY.md; gate3.md | the numbers are from different commits, all plausible | low |
| D6 | Writeup still carries unfilled placeholders: `[342]` in "reproduces [342] reference builds", `[VIDEO_URL]`, the organisers' answer `___`, and a bracketed Muse-connector sentence (`DEVPOST-WRITEUP.md` accomplishments and links, "Confirm" list) | DEVPOST-WRITEUP.md | if pasted as is, the submission carries brackets | medium |
| D7 | `fresh-eyes.md` blocker B1 (FC mounted backwards: no flip, no crash, craft slides off the map) is demonstrated at 02:28; PITCH, VIDEO, README and WRITEUP promise "It flips on take-off, replays in slow motion". No doc records the fix verified. HANDOFF says a live claim check `check:break-fly` was running; its result is not in a file (HANDOFF.md:121-125). Status UNKNOWN | `docs/verify/fresh-eyes.md:27-47`; `PITCH.md` 1:50 | the single most-promoted "Most Entertaining" beat has no recorded pass | high until a code/e2e check confirms (see claim C017) |
| D8 | "Every course has gold, silver and bronze times" (WRITEUP, PITCH) vs JUDGE-QA "22 flying courses (21 with medal times)"; VERIFIED 21 of 22 have `par` | WRITEUP; Q2 | one course has none | low |
| D9 | "80 hand-inked 3D figures for 12 boards, 13 robotics benches and 13 drones" (WRITEUP Best Overall paragraph) but 80 = 12 + 13 + 13 + 12 module pages + 29 part pages + 1 flight range | WRITEUP; `public/figures/` | overstated by 42 | low |
| D10 | JUDGE-QA Q18 quotes quad5 at $346 catalogue price; PITCH says "$330 to $370 at catalogue prices" and quotes $291.50 live; both can be right, they are different bases | Q18; PITCH changes section | confusing in front of a judge | low |
| D11 | Story: "We had 24 hours and two people" and "All of it ... by Claude Code agents" (WRITEUP) vs README, which names no teammate; the teammate's 16 commits and her phase-1 work is in git | DEVPOST-STORY.md; README | credit | low |
| D12 | The PITCH tells the story through an invented persona ("Maya is a stand-in", `PITCH.md` Who's who) while the founder's real story (DEVPOST-STORY) is personal | PITCH.md | tone, no defect | info |
| D13 | `docs/ARCHITECTURE.md` changelog ends at v1.9 (10-25 00:51). Thirty hours of schema-adjacent work after it (translation, redesign, Solana, telemetry flags) is not logged | ARCHITECTURE.md:7 | cannot rely on the changelog for schema drift | medium |
| D14 | The hand-off rule "add no Co-Authored-By or agent attribution" (`HANDOFF.md:55`) conflicts with this audit session's harness attribution instruction. No commit has been made by this audit. A future agent will hit the same conflict | HANDOFF.md:55 | process | low |

Process defects visible in the history (DOCUMENTED, `docs/audit/history.md` section 3, 7): promised 13 languages became 6 without telling the user (B1); "No tracking" became "anonymous, opt-out" (B18); 7 of 35 fact sheets never got the adversarial check; per-phase verification gates were skipped in the first build; usage limits stopped 56 agents at 14:19 and again at 07:35.

## Technical debt (table: item, path, evidence, severity, effort guess)

| Item | Path | Evidence | Sev | Effort |
|---|---|---|---|---|
| Docs contradict production state (Solana, Tiger, relay, project name) | `docs/DECISIONS.md:56,65`, `docs/hacktx/JUDGE-QA.md`, `PITCH.md`, `DEPLOY.md` | defects D1-D3 | medium | 1 day to reconcile |
| 104 request files with no status | `docs/requests/` | no status marker in any file; the 15 `*-gaps.md` files (500 lines) were written 10-24 ~21:00 for wave B | medium | 2 days to triage into an issue tracker |
| Hackathon-only docs mixed with product docs | `docs/hacktx/` (17 files) | PITCH, VIDEO, STRATEGY, JUDGE-QA, DEVPOST-* are event artefacts | low | 0.5 day to move to `docs/archive/` |
| Repo has no licence and ships third-party-derived lesson content | root, `docs/research/`, About page text | no LICENSE; About says iynk "reuses their facts, formulas, timings and lessons" (`shell.json` about.originalsLede) | high (legal) | days of legal review, not engineering |
| Machine-local project memory | CONTEXT.md section 4 | transcripts, scratch, wallet, keypair, `.env.local` only on Amar's Mac | high (bus factor 1) | 1 day to back up and document |
| No doc build, link check or number check | none | counts live in prose in 6+ files; a count change needs 5 manual edits (WRITEUP "Confirm" says so) | medium | 1 day: generate counts from `src/content` |
| Rename leftovers | `db/migrations/0003_profiles.sql:32`, `figures/tools/cfshoot.py`, `scripts/db-migrate.mjs`, `docs/FIGURES-BENCH.md`, Vultr stack names | `grep -rIli simlab` lists 8 files | low | 0.5 day plus a DB job rename needing care |
| `HANDOFF.md` is an append-only 382-line log with stale "Running" state | `HANDOFF.md:121-133` | the live claim check and servers lines are 09:55 | low | 0.5 day |
| Fact sheets are 17,823 lines of prose with no machine-readable extract | `docs/facts/` | content tests cannot diff against them | medium | weeks to turn into structured data |
| No `CONTRIBUTING`, `LICENSE`, `SECURITY` or ops runbook outside DEPLOY.md | root | `ls` | medium | 1 day |

## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)

- **No test checks the prose.** No test asserts the README, Devpost, PITCH or JUDGE-QA numbers. Counts are re-derived by hand at each gate ("Confirm before submitting" lists). I found the numbers correct today by counting (see table above), but nothing prevents drift.
- **Tests that tie docs to code:** `src/i18n/figure-strings.test.ts` (4087 keys translated in 5 languages with placeholders; presence and placeholder parity, not translation quality, DOCUMENTED in gate3.md and consistent with my key count); `npm run content:check` (index vs files); the lesson table `src/lib/interp/lessons.test.ts` (102 references pass and 102 starters fail at gate 3). The references and the checks were authored by the same agents, so this is self-consistency with the implementation, not hardware truth. It does prove each lesson is solvable with its own checks.
- **Hardware-derived references:** the fact sheets are the only hardware-derived inputs (datasheets, Eagle/Altium files, firmware source). `quad5.test.ts` checks two cells against the original's printed table (10.6 min, 283 A) per `DECISIONS.md:28-29`. The "342 reference builds" fixtures come from the Drone Engineer website's printed tables (third-party calculator output, not bench measurements): they prove iynk equals that site's formula, including its generous constants (`DECISIONS.md` calculator corrections say the 12.3 min hover "against 6-8 min in real flying"). This is DOCUMENTED, not re-run.
- Verification reports are snapshots by the same agent family that wrote the code; `docs/audit/history.md` and `sweep.md` show earlier "false greens" from private test runners (B7).

## Performance characteristics (measured if you can, else ESTIMATED/UNKNOWN)

- Docs have no runtime cost. Git: repo checkout has 1,389 tracked files (`git ls-files | wc -l`); object store 3,113 loose objects plus 7,569 packed (`git count-objects -v`).
- Build-process performance recorded in docs (DOCUMENTED, not re-measured): production build 826 pages (gate 3), 827 later; crawl of 786 pages at 390 px with 0 failures; bench probes 7 to 26 s each (`gate3.md`).
- Agent productivity: 792 commits and about 5,000 file changes in 19.8 h (VERIFIED), more than 250 agent transcripts (DOCUMENTED, not in git). Cost in money or tokens: UNKNOWN.

## Security risks

1. **Public repo, no licence:** all rights reserved by default. Anyone reading it cannot legally reuse it; nor can a company acquire clear title without the founder's confirmation (VERIFIED `licenseInfo null`).
2. **Third-party content provenance:** About copy and SPEC say lessons, timings and facts were taken from three third-party sites; the brief says to "reverse-engineer every ... lesson structure, calculation, failure mode". Copyright and terms-of-use of those sites are UNKNOWN; the Drone Engineer fixtures are used as test oracles (342 rows). HYPOTHESIS: a rights-holder could object once the product is commercial.
3. **Personal data in git:** Jagrati Kumari's employer-style email on 16 commits; Amar's GitHub noreply email is used (good). Docs name the devnet wallet public key prefix and the Vultr VM IP `216.128.138.203` and the VM id `b2a815bf-...` (`DEPLOY.md`), which are not secrets but are operational detail in a public repo.
4. **Secrets hygiene:** the repo rules forbid committing keys and I found none in the docs I read; I did not scan git history for secrets (UNKNOWN). HANDOFF.md:172 records an ElevenLabs key that "was pasted in chat" and needs rotation: its rotation status is UNKNOWN. Only presence/absence of `.env.local` is relevant here; I did not read it.
5. **Operational docs describe production access:** `scripts/realtime-vultr-create.sh`, `docs/hacktx/DEPLOY.md`: how to create VMs with `VULTR_API_KEY`. The existing Vultr VM `iynk-realtime` was found at 08:13 already created at 07:58 "from another machine or session" with an SSH key this Mac did not have (HANDOFF.md:199); who created it is not recorded (UNKNOWN).
6. **Claims that could be misleading to users and regulators:** "No accounts" plus telemetry with a random browser id (honest copy, VERIFIED B18); "Solana credentials ... non-transferable" and "Anyone can verify" on devnet only, which has no value; "Proof of Build" suggests a credential recognised outside iynk. Marketing review needed before launch.
7. **Hackathon integrity exposure:** see Git history. If organisers read the first commit as pre-event code, the entry could be disqualified; the mitigation is the written disclosure and the transcripts. Not a product security issue.

## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)

- **The docs say the product is catalogue-only, by design.** `DECISIONS.md:48` (B13): "Mat parts sit in fixed places with pre-routed wires per bench step, no free wiring". B11 (`:46`): each bench uses a hand-written `model(state, dt)`, not a general solver. `JUDGE-QA.md` Q7: breadboard circuits go through a DC nodal solver, but only for circuits that exist in figure files (`lesson id = circuit key`, DECISIONS A5). `JUDGE-QA.md` Q5: interpreters are subsets that cover "what the lessons use". Grep for "own project", "custom circuit", "arbitrary", "user-created", "import sketch" across SPEC, STRATEGY, BUILD-PLAN and CONTEXT returns nothing: **no document in the repo plans or specifies user-created projects.** (VERIFIED absence.)
- What a builder would need from this subsystem: the fact sheets (`docs/facts/*.md`) are reusable as the sourcing standard for any new part (header table, numbered sources, "(unverified)" and "(estimated)" labels); the content schema (`docs/ARCHITECTURE.md`, `src/content/schema.ts`) is a reusable data contract only for items authored as code modules by agents. The hand-off system and `docs/requests` convention would need to become an issue tracker.
- What blocks reuse: figures are hand-written JS per item (`figures/boards/<id>.js`) built by a Python step; there is no schema for a user-authored circuit, no import of KiCad/Wokwi/Tinkercad projects, no user storage on the server (progress is localStorage only, "No accounts"). See the figure-engine and content-schema inventories for code-level detail.
- Founder intent on this point: none stated. The only forward-looking items are in "What's next" (hardware twin, breadboard photo to sim via Google Lens, rural/slow-connection mode, more boards and languages).

## Required refactoring to get there

For this subsystem only (code refactors belong to the other inventories):

1. Pick one truth for each fact and generate the rest: counts from `src/content` (a `scripts/counts.mjs` I would write is 40 lines; my `count2.mjs` shows it works under Node 24 type stripping), live URLs and project names from one file.
2. Archive `docs/hacktx` event artefacts; keep SPEC (as history), ARCHITECTURE, DECISIONS, facts, DEPLOY, SOLANA, REALTIME, AI, DATA as the maintained set. Rewrite DECISIONS B21 and B30 and the DEPLOY env table.
3. Convert `docs/requests/*-gaps.md` (500 lines) into tracked issues with status; close the ones obsolete after ARCHITECTURE v1.6-v1.9.
4. Add a LICENSE and a provenance note for third-party-derived content, after a decision by the founder; remove or re-source anything that cannot be defended.
5. Move machine-local state into a private, documented backup (transcripts, scratch, wallet and keypair custody, `.env.local` template). Consider squashing nothing: the first-commit gap should be explained in a `docs/PROVENANCE.md` and not rewritten again.
6. Add a docs test: a vitest that reads README/WRITEUP numbers and compares with `src/content` counts.

## Recommendation: preserve | extend | replace | deprecate | investigate (one line of reasoning)

**extend** - keep ARCHITECTURE, DECISIONS, the fact-sheet standard and the hand-off discipline, which are genuinely strong, but archive the hackathon sales documents, reconcile the contradictions above, replace the request folder with a tracker, and resolve licence and provenance before any commercial step.

## Open questions

1. Did the organisers answer whether pre-event research notes are allowed (the write-up still has `___`)? Does the final Devpost text say "all code written during the event" while git shows a 310k-line first commit stamped 15:30? Who will defend that in front of judges, and with what evidence?
2. Who owns the three source sites' content rights, and did anyone ask them? (The About page and brief both say lessons, timings, formulas and failure modes were rebuilt.)
3. Is `FC mounted backwards` now a verified crash in code or e2e? (D7.)
4. Which environment is canonical now: `iynk.tech` or `iynk.vercel.app`? Is the Devpost link right?
5. What is Jagrati's status (co-founder, contributor, employee at the domain shown in her commit email)? She contributed one hour of commits; the story says "my teammate ... had this idea".
6. Where are the 250+ agent transcripts to be kept, and may they be published as provenance?
7. Was the ElevenLabs key rotated, and who created the Vultr VM at 07:58 on 10-25?
8. Does the founder want the product to stay a catalogue of 38 authored items, or become a builder for user projects? No document answers it.

## Claim register

One row per user-facing capability claim or number from README, the landing and UI JSON, PITCH, VIDEO, JUDGE-QA and Devpost documents. "Exact wording" is a verbatim substring of the line named in "Where" (checked by script, `claims.py`). "Pre-check" is what this agent already established; the synthesis agent fills the last column. `[V]`= VERIFIED by me, `[D]`= DOCUMENTED only. Many rows share a single underlying fact; the kind is feature, count, quality or integration. Count: 119.

| # | Kind | Exact wording | Where | Pre-check (this agent) | Status (synthesis) |
|---|---|---|---|---|---|
| C001 | feature | "A free hardware lab in your browser." | README.md:3; docs/hacktx/DEVPOST-WRITEUP.md:15 |  | |
| C002 | quality | "no account, nothing to install" | README.md:6; src/i18n/messages/en/shell.json:126 |  | |
| C003 | count | "Three labs, 38 real items" | README.md:19; docs/hacktx/JUDGE-QA.md:22 | 12 board + 13 robotics + 13 drone modules in src/content (ls \| wc); VERIFIED 12/13/13 | |
| C004 | feature | "Every item is a hand-inked 3D figure you can turn all the way round, see through and take apart." | README.md:27; docs/hacktx/DEVPOST-WRITEUP.md:38 |  | |
| C005 | feature | "Write Arduino C++, MicroPython, Python (with gpiozero and rclpy on the Pi) or Verilog on" | README.md:31; docs/hacktx/JUDGE-QA.md:39 | Interpreters are subsets, not full languages (Q5 admits it) | |
| C006 | feature | "Interpreters inside the page drive the pins, the serial monitor and the figure on a" | README.md:32 |  | |
| C007 | count | "71 board lessons and 31 bench tasks pass only when your run meets their checks." | README.md:33; docs/hacktx/DEVPOST-WRITEUP.md:40 | Data count: 71 lessons, 31 tasks (node import of src/content): VERIFIED. Per-board lessons 4 to 16 | |
| C008 | quality | "pass only when your run meets their checks" | README.md:33; docs/hacktx/JUDGE-QA.md:79 | Gate 3 table (DOCUMENTED); not re-run | |
| C009 | count | "144 board failures and 106 bench faults, decided by a circuit solver" | README.md:34; docs/hacktx/DEVPOST-WRITEUP.md:40; docs/hacktx/DEVPOST-STORY.md:23 | Data count 144 and 106: VERIFIED. "decided by a circuit solver": breadboard circuits only, benches use per-bench model() hooks (DECISIONS B11, Q7) | |
| C010 | count | "(113 mA through a part rated for 20)" | README.md:35; docs/hacktx/PITCH.md:77; docs/hacktx/DEVPOST-STORY.md:19 |  | |
| C011 | feature | "put a motor on the 5 V pin and the board browns out" | README.md:36; docs/hacktx/DEVPOST-WRITEUP.md:40 |  | |
| C012 | count | "Benches go together step by step (272 steps) with live status and current draw." | README.md:37; docs/hacktx/DEVPOST-STORY.md:16 | Data count 272 steps: VERIFIED | |
| C013 | feature | "sized with a drone calculator (thrust to weight, hover throttle, flight time, current)" | README.md:38; docs/hacktx/DEVPOST-WRITEUP.md:40 |  | |
| C014 | feature | "checked with safety tests before the first flight" | README.md:39; docs/hacktx/DEVPOST-WRITEUP.md:40 |  | |
| C015 | feature | "A flight sim with gate races and freestyle courses in angle or acro mode, third person or FPV, against" | README.md:40; docs/hacktx/DEVPOST-WRITEUP.md:40 |  | |
| C016 | feature | "your best lap, the autopilot and your friends' ghosts." | README.md:41; docs/hacktx/DEVPOST-WRITEUP.md:50; docs/hacktx/PITCH.md:131 | Friends' ghosts need the relay (P table); cross-device ghost not verified | |
| C017 | feature | "a slow-motion replay shows why it flipped" | README.md:42; docs/hacktx/PITCH.md:134; docs/hacktx/DEVPOST-WRITEUP.md:187 | fresh-eyes B1 (02:28) found FC-backwards did NOT flip; later fix status UNKNOWN to this agent | |
| C018 | feature | "Share a link and up to eight people build on the same bench in real time, on any device." | README.md:48; src/i18n/messages/en/shell.json:113; docs/hacktx/DEVPOST-WRITEUP.md:46 | server/realtime/src/config.js:5 maxPeers: 8 (VERIFIED limit); real-time behaviour not tested here | |
| C019 | feature | "action is put in one order for everyone." | README.md:49; docs/hacktx/DEVPOST-WRITEUP.md:46 |  | |
| C020 | integration | "The AI partner (Meta Muse Spark with tool calling) reads your bench" | README.md:50; docs/hacktx/DEVPOST-WRITEUP.md:48 | Model ids are EXTERNAL (Meta API) | |
| C021 | feature | "points at the broken part in the figure and gives hints before answers." | README.md:51; docs/hacktx/JUDGE-QA.md:111 |  | |
| C022 | feature | "that lesson, it asks them first, with a question that makes them explain it." | README.md:52; docs/hacktx/DEVPOST-WRITEUP.md:48; docs/hacktx/DEVPOST-STORY.md:61 | ask_peer is model-discretion (P: "calls ask_peer only when it judges a peer can help") | |
| C023 | count | "The whole app is in English, Spanish, French, German, Chinese and Hindi, down to the labels inside" | README.md:53; docs/hacktx/DEVPOST-WRITEUP.md:42; src/i18n/messages/en/shell.json:121 | LOCALES = 6 (src/i18n/config.ts:4); 228 prose files = 38 x 6 (find\|wc); figure strings 4087 keys in es/fr/de/zh/hi (python len), no en.json | |
| C024 | integration | "Room chat and voice messages (Muse Voice Transcribe) are translated into each reader's language." | README.md:54; docs/hacktx/JUDGE-QA.md:170 |  | |
| C025 | feature | "Plan one project for a group with a role for each person" | README.md:55; docs/hacktx/DEVPOST-WRITEUP.md:50; src/i18n/messages/en/together.json:210 |  | |
| C026 | feature | "whose skills complement yours, and turn a session into a short story with an illustrated cover (Muse Image)." | README.md:56; docs/hacktx/DEVPOST-WRITEUP.md:50; src/i18n/messages/en/shell.json:117 | Buddies need DATABASE_URL + META key (T lobby.buddies.notSetUp) | |
| C027 | integration | "Every parts list is priced live across Google Shopping, Amazon and eBay (SerpApi)." | README.md:60; docs/hacktx/DEVPOST-WRITEUP.md:54; docs/hacktx/JUDGE-QA.md:140 |  | |
| C028 | feature | "a budget optimiser re-runs the drone maths on every battery, motor and prop combination at today's prices and picks" | README.md:61; docs/hacktx/DEVPOST-WRITEUP.md:54; docs/hacktx/JUDGE-QA.md:147 | src/lib/search/optimize.ts named by Q18; drones only (not boards or benches) | |
| C029 | integration | "It also finds makerspaces, electronics shops and flying fields near" | README.md:62; docs/hacktx/DEVPOST-WRITEUP.md:54; docs/hacktx/PITCH.md:123 |  | |
| C030 | integration | "Pass a drone's bench safety checks and the server re-runs your exact run before an Anchor program" | README.md:64; docs/hacktx/DEVPOST-WRITEUP.md:195; src/i18n/messages/en/solana.json:177 | src/lib/server/solana; board lessons do not earn credentials (HANDOFF 10:07) | |
| C031 | integration | "Anyone can verify it straight from the chain" | README.md:65; src/i18n/messages/en/solana.json:190 |  | |
| C032 | feature | "lock bounties that pay out in the same transaction." | README.md:66; docs/hacktx/DEVPOST-WRITEUP.md:195 |  | |
| C033 | integration | "Laps and lesson passes land in Postgres with TimescaleDB (Tiger Data), where real-time continuous" | README.md:67; docs/hacktx/DEVPOST-WRITEUP.md:199 | db/migrations/0001..0003 exist (VERIFIED); retention 30 d, profile expiry 24 h (VERIFIED in SQL) | |
| C034 | integration | "AI assistants can search the catalogue, run the drone calculator, price parts, plan a build night" | README.md:69; docs/hacktx/JUDGE-QA.md:130; docs/hacktx/DEVPOST-WRITEUP.md:50 | 7 tools named in src/lib/server/mcp/tools/*.ts: VERIFIED; never tried from Muse (Q16, MUSE-CONNECTOR) | |
| C035 | quality | "API keys stay on the server, every call is" | README.md:90; docs/hacktx/DEVPOST-WRITEUP.md:74 |  | |
| C036 | quality | "rate-limited, and Gemini takes over when Meta is busy." | README.md:91; docs/hacktx/DEVPOST-WRITEUP.md:143 |  | |
| C037 | feature | "The labs, the figures, the interpreters and the flight sim work with no keys at all." | README.md:107; docs/hacktx/DEVPOST-WRITEUP.md:56; docs/hacktx/JUDGE-QA.md:29 |  | |
| C038 | quality | "every key is optional; a feature without its key says it isn't set up" | README.md:103 |  | |
| C039 | count | "about 2,800 unit tests, including every lesson" | README.md:131; docs/hacktx/DEVPOST-STORY.md:46 | gate3.md: 2788 passed 5 skipped; HANDOFF 09:42: 2797 passed 5 skipped. Static it( count in src+server = 1432 (grep), it.each expands. Not re-run | |
| C040 | quality | "Playwright end-to-end tests with axe accessibility checks" | README.md:132; docs/hacktx/DEVPOST-STORY.md:46 | e2e/*.spec.ts = 12 files, 72 static test( lines; gate3: 114 passed 2 skipped; HANDOFF: 116 passed 2 skipped | |
| C041 | quality | "tested on a local validator" | README.md:95; docs/hacktx/DEVPOST-WRITEUP.md:195 | solana/tests/iynk_passport.test.ts has 34 it( lines: VERIFIED | |
| C042 | quality | "We reused facts (pinouts, formulas, constants), not their code." | README.md:157; src/i18n/messages/en/shell.json:141 | About page also says it reuses their "lessons" and "timings"; no licence from the three originals on file | |
| C043 | feature | "each a hand-inked 3D figure you can turn, wire, code and break on purpose." | src/i18n/messages/en/shell.json:51 |  | |
| C044 | feature | "From the Arduino Uno R3 to two FPGA boards: lessons, a live code editor, schematic and breadboard views, a serial monitor and failures that really trigger." | src/i18n/messages/en/shell.json:58 |  | |
| C045 | feature | "Motor drivers, sensors and power stages, built part by part on the bench, with practice tasks, quizzes after each step, live status and current draw." | src/i18n/messages/en/shell.json:63 |  | |
| C046 | feature | "From a Tiny Whoop to an octocopter: a part-by-part build, live weight and thrust maths, safety tests, real Betaflight and ArduPilot settings, and a flying range." | src/i18n/messages/en/shell.json:68 |  | |
| C047 | feature | "Drag to turn any figure all the way round, switch on See-through and watch the parts inside work, with labels that light up." | src/i18n/messages/en/shell.json:95 |  | |
| C048 | feature | "Edit Arduino C++, MicroPython or Verilog and press Run: the simulator drives the figure, the pins and the serial monitor." | src/i18n/messages/en/shell.json:99 |  | |
| C049 | feature | "Reverse the polarity, brown out the supply, leave out a part or make a cold joint, and see what really goes wrong." | src/i18n/messages/en/shell.json:103 |  | |
| C050 | feature | "Build a drone, check its numbers, run the smoke stopper and motor tests, then fly gates in angle or acro mode." | src/i18n/messages/en/shell.json:107 |  | |
| C051 | count | "The Uno R3 is the best place to begin: sixteen short lessons, from the parts of the board to a parking sensor." | src/i18n/messages/en/shell.json:74 | Uno R3 lessons = 16: VERIFIED | |
| C052 | quality | "iynk started as a rebuild of three teaching sites and aims to do everything they do, and more." | src/i18n/messages/en/shell.json:141 |  | |
| C053 | quality | "Progress and settings are saved in this browser's local storage. There are no accounts." | src/i18n/messages/en/shell.json:138; docs/hacktx/JUDGE-QA.md:185 |  | |
| C054 | quality | "never your name or your code" | src/i18n/messages/en/shell.json:138; docs/hacktx/JUDGE-QA.md:186 | telemetry kinds in src/lib/telemetry; not audited here | |
| C055 | quality | "A hands-on hardware lab in the browser: build, wire, code, break and fly boards, robots and drones." | src/i18n/messages/en/common.json:5 | meta description and OG tags (layout.tsx:36-44) | |
| C056 | feature | "Everyone sees the same bench, one person types at a time, and the chat shows each message in your own language." | src/i18n/messages/en/together.json:156 |  | |
| C057 | count | "Rooms close 30 minutes after the last person leaves." | src/i18n/messages/en/together.json:174; docs/hacktx/DEVPOST-WRITEUP.md:191 | server/realtime/src/config.js:14 roomTtlMs: 30 * 60_000: VERIFIED | |
| C058 | quality | "Your profile holds no contact details and is deleted after 24 hours." | src/i18n/messages/en/together.json:184; docs/hacktx/DEVPOST-WRITEUP.md:78 | db/migrations/0003_profiles.sql: expires_at default now()+24h, job every 15 min: VERIFIED. Note: profile also lists finished lessons (T builtNote) | |
| C059 | feature | "Credentials you earned in the lab, written to Solana devnet after the server re-ran your run." | src/i18n/messages/en/solana.json:177 |  | |
| C060 | count | "There are 12 boards:" | docs/hacktx/DEVPOST-WRITEUP.md:38; docs/hacktx/PITCH.md:154 | 12/13/13: VERIFIED | |
| C061 | count | "There are 71 board lessons (16 on the Uno R3, at least 4 on every board)" | docs/hacktx/DEVPOST-WRITEUP.md:40 |  | |
| C062 | count | "(272 steps and 106 faults across the 13), with 31 practice tasks" | docs/hacktx/DEVPOST-WRITEUP.md:40 | VERIFIED 272/106/31 | |
| C063 | count | "78 bench tests such as the smoke stopper and the motor direction check" | docs/hacktx/DEVPOST-WRITEUP.md:40 | Data count drone tests = 78: VERIFIED (field `tests`) | |
| C064 | count | "a flight sim with 22 courses, medal times" | docs/hacktx/DEVPOST-WRITEUP.md:40; docs/hacktx/JUDGE-QA.md:24 | courses 22, 21 with `par`: VERIFIED; CLI snippets 131 (firmware.snippets): VERIFIED | |
| C065 | feature | "Betaflight, INAV and ArduPilot CLI snippets" | docs/hacktx/DEVPOST-WRITEUP.md:40 |  | |
| C066 | count | "80 figure pages in all" | docs/hacktx/DEVPOST-WRITEUP.md:66; docs/hacktx/JUDGE-QA.md:96 | find public/figures -name *.html = 80: VERIFIED, but = 12 boards + 13 benches + 13 drones + 12 modules + 29 parts + 1 flight range. Item figures = 38; gate3 says "79 of 79" via cfshoot | |
| C067 | count | "Underneath are 80 hand-inked 3D figures for 12 boards, 13 robotics benches and 13 drones" | docs/hacktx/DEVPOST-WRITEUP.md:183 | Overstated: 80 pages include 41 module/part/range pages | |
| C068 | feature | "pass a keyboard baton" | docs/hacktx/DEVPOST-WRITEUP.md:46 |  | |
| C069 | feature | "proposes a fix as a diff you accept or reject, and answers datasheet questions with citations" | docs/hacktx/DEVPOST-WRITEUP.md:48; docs/hacktx/JUDGE-QA.md:109 |  | |
| C070 | integration | "push-to-talk and voice messages go through Muse Voice Transcribe" | docs/hacktx/DEVPOST-WRITEUP.md:48 | Meta endpoint takes WAV only; browser converts | |
| C071 | feature | "Build Stories turn a session into a short story (what broke, who helped) with a Muse Image cover you can download or share." | docs/hacktx/DEVPOST-WRITEUP.md:50 |  | |
| C072 | feature | "Share on Facebook opens Facebook's share dialog with a link to the lesson" | docs/hacktx/DEVPOST-WRITEUP.md:175 | HANDOFF: "the story's Facebook share links the lesson", not the story | |
| C073 | feature | "Without a relay, rooms fall back to BroadcastChannel between tabs of one browser." | docs/hacktx/DEVPOST-WRITEUP.md:76 |  | |
| C074 | quality | "server tools (datasheet search, parts prices) run in a loop of up to four rounds" | docs/hacktx/DEVPOST-WRITEUP.md:72 | src/app/api/ai/chat/route.ts:17 MAX_ROUNDS = 4: VERIFIED | |
| C075 | quality | "Checks run in a Web Worker with a time budget." | docs/hacktx/DEVPOST-WRITEUP.md:70; docs/hacktx/JUDGE-QA.md:78 | src/lib/interp/check-job.ts:11 CHECK_BUDGET_MS = 20_000: VERIFIED | |
| C076 | quality | "a budget guard refuses uncached searches past a set number" | docs/hacktx/DEVPOST-WRITEUP.md:74; docs/hacktx/JUDGE-QA.md:155 | env.ts:40 default 200: VERIFIED. Budget is in process memory on Vercel serverless, so it is per instance, not per month (HYPOTHESIS) | |
| C077 | quality | "results go through SerpApi's cache and a 6-hour cache of our own" | docs/hacktx/DEVPOST-WRITEUP.md:74 | serpapi.ts:44 CACHE_TTL_MS = 6h: VERIFIED | |
| C078 | quality | "Buddy profiles live in a regular table and expire after 24 hours; events are kept for 30 days." | docs/hacktx/DEVPOST-WRITEUP.md:78 | SQL: VERIFIED | |
| C079 | quality | "102 of 102 both ways at our last gate" | docs/hacktx/DEVPOST-WRITEUP.md:86; docs/hacktx/JUDGE-QA.md:79 | 71 lessons + 31 tasks = 102: arithmetic consistent. Not re-run | |
| C080 | count | "A drone calculator that reproduces [342] reference builds from the Drone Engineer tables" | docs/hacktx/DEVPOST-WRITEUP.md:99; docs/hacktx/JUDGE-QA.md:84 | Literal "[342]" brackets still in the write-up (unfilled placeholder) | |
| C081 | count | "which ran more than 250 agents in parallel waves" | docs/hacktx/DEVPOST-WRITEUP.md:80; docs/hacktx/DEVPOST-STORY.md:36; docs/hacktx/DEVPOST-WRITEUP.md:101 | W "Confirm" section: 253 transcripts counted on Amar's Mac; not in git | |
| C082 | quality | "All of it was written during the event by AI coding agents" | docs/hacktx/DEVPOST-WRITEUP.md:80; docs/hacktx/DEVPOST-STORY.md:48; docs/hacktx/PITCH.md:166; docs/hacktx/PITCH.md:206 | Git cannot show this: first commit d5bdf44 (900 files, 310k lines) is stamped 15:30:42; first-build session began 10-23 21:48; see Founder intent / history section | |
| C083 | quality | "All of iynk's code, figures, content and tests were written during the hacking period" | docs/hacktx/DEVPOST-WRITEUP.md:209; docs/hacktx/JUDGE-QA.md:196 | same as above | |
| C084 | quality | "The repository's history starts at 15:30 on October 24" | docs/hacktx/DEVPOST-WRITEUP.md:209; docs/hacktx/JUDGE-QA.md:196 | git log: first commit 2026-10-24 15:30:42 -0500: VERIFIED. Its 3 first commits share one timestamp (rebuilt) | |
| C085 | quality | "The prototype is not in this repository" | docs/hacktx/DEVPOST-WRITEUP.md:209 | 245763f is not reachable from main (git merge-base --is-ancestor: no); present in local branch backup/simlab-history only: VERIFIED | |
| C086 | quality | "Voice transcription came back in 1 to 2 seconds" | docs/hacktx/DEVPOST-WRITEUP.md:151 | EXTERNAL / anecdotal | |
| C087 | quality | "muse-spark-1.3 fixed it and was 2 to 4 times faster" | docs/hacktx/DEVPOST-WRITEUP.md:151 | EXTERNAL / anecdotal | |
| C088 | quality | "a 286 KB deploy over RPC crawled for 40 minutes" | docs/hacktx/DEVPOST-WRITEUP.md:155 | anecdotal, from HANDOFF | |
| C089 | integration | "Entering: Meta, SerpApi, Best Overall, Most Entertaining, Best Pitch, MLH Vultr, MLH Tiger Data and MLH Solana." | docs/hacktx/DEVPOST-WRITEUP.md:171 |  | |
| C090 | count | "The program has 34 tests on a local validator and is live at `BYFLDTLNi946Z8jT4JnxgE8Cpzkr9ud7tSrnThFTv31w`." | docs/hacktx/DEVPOST-WRITEUP.md:195 | 34 it( lines: VERIFIED; devnet account not queried by this agent | |
| C091 | feature | "one per learner and skill, with the score and a hash of the replay, signed by iynk's issuer" | docs/hacktx/DEVPOST-WRITEUP.md:195 |  | |
| C092 | feature | "A learner without a wallet gets a one-click devnet wallet kept in the browser." | docs/hacktx/DEVPOST-WRITEUP.md:195 |  | |
| C093 | integration | "so iynk's realtime relay runs on a Vultr VM in Dallas" | docs/hacktx/DEVPOST-WRITEUP.md:191; docs/hacktx/DEVPOST-WRITEUP.md:227 |  | |
| C094 | quality | "One events hypertable in one-day chunks, compressed to the columnstore after a day and kept 30 days" | docs/hacktx/DEVPOST-WRITEUP.md:199 | db/migrations/0001_events.sql:27,30: VERIFIED | |
| C095 | feature | "Every course has gold, silver and bronze times" | docs/hacktx/DEVPOST-WRITEUP.md:187; docs/hacktx/JUDGE-QA.md:24 | 21 of 22 courses have par; one does not: Q says so, W/P say "every course" | |
| C096 | quality | "The model can only pick from our real catalogue, so it can't invent a board or drone." | docs/hacktx/DEVPOST-WRITEUP.md:137; src/i18n/messages/en/together.json:235 |  | |
| C097 | quality | "Numbers and units like "220 Ω" are protected, and if the model changes one, we show the original instead." | docs/hacktx/DEVPOST-WRITEUP.md:135; docs/hacktx/JUDGE-QA.md:171 |  | |
| C098 | quality | "Solana credentials never trust the AI: the server re-runs your lab run before anything is issued." | docs/hacktx/DEVPOST-WRITEUP.md:143 |  | |
| C099 | count | "Today the whole build is $291.50." | docs/hacktx/PITCH.md:114; docs/hacktx/VIDEO.md:117 | Live SerpApi price from 10-25 09:13; volatile by nature | |
| C100 | count | "and swaps the 6S 1100 mAh battery for a 4S 1500" | docs/hacktx/PITCH.md:119; docs/hacktx/VIDEO.md:117 |  | |
| C101 | quality | "Thrust to weight stays above five, so it still flies." | docs/hacktx/PITCH.md:119 |  | |
| C102 | quality | "Maya is a stand-in." | docs/hacktx/PITCH.md:36 | Pitch is told as a persona story (Maya/Lucía); P admits it is invented | |
| C103 | integration | ""Muse can search our catalogue, size a drone, price a build and plan a build night."" | docs/hacktx/PITCH.md:215 | Never tried from Muse (Q16) | |
| C104 | quality | "Free in any browser." | docs/hacktx/PITCH.md:155 |  | |
| C105 | count | "131 CLI snippets and 22 flying courses (21 with medal times)" | docs/hacktx/JUDGE-QA.md:24 | VERIFIED | |
| C106 | count | "342 reference builds" | docs/hacktx/JUDGE-QA.md:84 | fixtures hold 342 rows (W Confirm); not re-counted | |
| C107 | count | "445 of 445 tests" | docs/hacktx/JUDGE-QA.md:86 | DOCUMENTED, not re-run | |
| C108 | count | "On catalogue prices, quad5 costs $346, and a $340 budget swaps" | docs/hacktx/JUDGE-QA.md:149 | conflicts with P: "quad5's parts cost $330 to $370 at catalogue prices"; P/V use $291.50 live | |
| C109 | count | "228 files in `src/i18n/content/`" | docs/hacktx/JUDGE-QA.md:177 | find \| wc = 228: VERIFIED | |
| C110 | count | "all 4087 strings are translated in each" | docs/hacktx/JUDGE-QA.md:178; docs/hacktx/DEVPOST-STORY.md:32 | python len(es..hi json) = 4087 each: VERIFIED (presence, not translation quality) | |
| C111 | quality | "It follows the Drone Engineer site formula for formula" | docs/hacktx/JUDGE-QA.md:84 |  | |
| C112 | feature | "Breadboard circuits go through a DC nodal solver" | docs/hacktx/JUDGE-QA.md:60 | figures/engine/bench-solve.js named; Motor drivers/buck/steppers use per-bench model() | |
| C113 | feature | "the partner's `ask_peer` tool posts a teach-back question to them in the room chat" | docs/hacktx/JUDGE-QA.md:116 |  | |
| C114 | quality | "Every board and drone has a fact sheet with its sources" | docs/hacktx/JUDGE-QA.md:68 | docs/facts: 35 sheets for 38 items (sheets cover parts and sub-families, e.g. trainers, la-components); 849 URL lines; 3 citations checked, see Current functionality | |
| C115 | quality | "In our live tests, the partner asked the classmate who had already passed the lesson three times out of three." | docs/hacktx/DEVPOST-STORY.md:61 | n=3, model-discretion tool; not reproducible from repo | |
| C116 | quality | "reproduced it 6 times out of 18" | docs/hacktx/DEVPOST-STORY.md:54 | DB array bug; fixed in 951ef39 | |
| C117 | count | "At 2:19 p.m. on day one, a usage limit stopped 56 agents mid-task." | docs/hacktx/DEVPOST-STORY.md:52 | docs/handoff/first-build/RESUME.md and audit/history.md agree on 14:19 | |
| C118 | quality | "We had 24 hours and two people" | docs/hacktx/DEVPOST-STORY.md:36 | git authors: Amar 776 commits, Jagrati Kumari 16 (all 16:xx on 10-24); Jagrati is not credited in README | |
| C119 | quality | "Every sponsor feature does a real job in the same story, and all of them are live: Meta, SerpApi, Vultr, Tiger Data and Solana." | docs/hacktx/DEVPOST-STORY.md:62 | HANDOFF: every /api/status flag on at 09:52 | |

## Founder intent

Sources: `docs/handoff/CONTEXT.md` sections 1-5 (the users' words, quoted there), `docs/hacktx/DEVPOST-STORY.md`, `docs/SPEC.md` (verbatim brief), `docs/audit/history.md` section 2.

- **Origin and motive (DOCUMENTED, the founder's own words):** "I gave up on my dream of robotics and computer engineering because of this", because every wrong wiring destroys a part, and in rural areas and countries where electronics are imported even a cheap sensor is not cheap (`DEVPOST-STORY.md` Inspiration; CONTEXT.md:243). The teammate, "a computer engineer", had the idea: do all the experimenting in a lab that behaves like real hardware "so the only thing you ever have to buy is the final prototype". The audience he names is people far from a lab or makerspace ("it's built for them"; CONTEXT.md:243).
- **Product he asked for (the brief, `docs/SPEC.md`):** one Next.js app, "strictly better than the three original websites combined": a Board Lab (12 or more boards), Robotics Lab (13 benches) and Drone Lab (at least 8 to 10 drones) with Colorfigures hand-inked 3D figures, real code running, deliberate failures, a flight simulator, six languages, progress in localStorage, accessibility, one-click Vercel deploy. "Zero placeholder text, zero broken interactions, zero missing features from the original three sites." His instruction: "A lot of things are wrong here. See everything, cross-reference, cross-check everything, go on a long run. Make sure it is what I want." (SPEC.md:147).
- **Goal at the time:** win HackTX 2026. "I want to win at any cost"; core sponsor tracks Meta, SerpApi, Solana "while still keeping anything possible integrated" (CONTEXT.md:40, history.md:35). Targets later fixed at Best Overall, SerpApi, Most Entertaining, Meta, then Solana, Vultr, Tiger Data, Best Pitch (WRITEUP tracks). He ordered Solana and Hardware to the end, then asked for Solana back at 09:00 on the last morning and had it deployed by 09:50.
- **Quality bar:** "Don't cut any corners ... We want the entire thing functional. Nothing's to be missing"; "the UI should be top class ... chic, minimalistic, best-of-the-best ... literally no room for improvement"; "'Wow, what a design taste.'" (CONTEXT.md:85, 198, 232-234).
- **Working style:** autonomy once he says go ("demon time full autonomy we need to win!!!"); plan before build; commit after every step; hand over cleanly between two people; no agent attribution on commits; ask before spending money, creating cloud resources, uploading env vars, moving devnet SOL, submitting on Devpost, force-pushing (CONTEXT.md section 2).
- **Honesty constraints he set:** keep the hackathon rule; "Nothing should be missing. Give it a final verdict" (asked for an honest verdict); report real failures (CONTEXT.md "Don't cut corners"). The repo acts on this: it records its own gaps (`docs/audit/*`, `docs/requests/*-gaps.md`, DECISIONS B1, B2, B18).
- **Forward-looking intent (DOCUMENTED, `DEVPOST-STORY.md` What's next, `DEVPOST-WRITEUP.md` What's next):** schools and community centres in rural areas, "a mode that works on slow connections"; finish the real-Uno hardware twin; photo of a real breadboard rebuilt in the sim (Google Lens); Solana to mainnet with sponsor-funded bounties and credentials that can turn into "a free kit for the person who earned it"; more boards, benches, drones, languages; trial with a real class or club with moderation and teacher-run rooms; list in Meta's Muse connector directory.
- **Not stated anywhere:** a business model, a price, a user count target, a plan after the event, any statement on user-created projects, who owns the company/IP between Amar and the teammate. (UNKNOWN; grep of CONTEXT, STRATEGY, BUILD-PLAN, SPEC finds none.)

## Unfinished work and open requests

Verified by grep and reading; "open" means not shown as closed in a document I could trust.

**Declared unfinished by the project itself**

| Item | Where stated | State |
|---|---|---|
| Hardware twin (real Uno over Web Serial/Firmata) | `docs/hacktx/HARDWARE.md`, WRITEUP "What we learned", `src/lib/features.ts:28,47` (`hw: false`, forced false) | code in repo, tab hidden, `features.ts:47 out.hw = false` (VERIFIED). Best Hardware Hack not entered |
| "Right now at HackTX" live counter | `JUDGE-QA.md` Q25, `gate3.md` "Still open" | `src/components/data/LiveCounter.tsx` exists, referenced only by data module and tests, no page mounts it (grep VERIFIED) |
| Muse connector (MCP) never tried from Muse | `JUDGE-QA.md` Q16, `MUSE-CONNECTOR.md` "What is unverified", WRITEUP bracket | UNKNOWN; claim C034, C103 and the P table depend on it |
| Verilog gaps: no `function`, `task`, `generate`, `inout`, UART, ADC | `JUDGE-QA.md` Q5, `P2-fpga-gaps.md`, DECISIONS B25 | open by design |
| micro:bit radio has no peer | Q5, DECISIONS B26 | open |
| VTOL transition does not hold height; AUTO survey flown as VTOL; Li-ion flag; hover-current check | `P2-drones-vtol-gaps.md` items 3-5, DECISIONS B17, B27 | open (DOCUMENTED) |
| Betaflight emulator lacks `led`; octo default opens on `hover-high` | `P2-drones-fpv-gaps.md`, `P2-drones-vtol-gaps.md` item 1 | open |
| Board lessons earn no Solana credential; only drone bench safety does | `HANDOFF.md:175` (10:07 entry) | open; BUILD-PLAN promised "every lab kind is verifiable" (`BUILD-PLAN.md:52`) |
| Micro-tips in rooms, peer tips | BUILD-PLAN:52, `solana.json` has a `tip` key | status UNKNOWN |
| Google Events often times out/empty | HANDOFF "Known and accepted" | accepted |
| A translated chat line that failed stays on "couldn't translate" until reload | HANDOFF "Known and accepted" | accepted |
| quad5 bench empties on reload; progress says done | `gate3.md` "Still open" | open |
| Interaction audit (boards, robotics, drones, fly, shell) died on usage limit and was never rerun | `HANDOFF.md:121-128` | never completed; the app was then frozen, then redesigned |
| 7 of 35 fact sheets never fact-checked: hcsr04, lm2596, mpu6050, octo, pca9685, qtr8rc, tricopter | `docs/audit/history.md:99-100` | HYPOTHESIS that some were later checked; hcsr04 sheet itself says only "improved in place 14:00-14:25" |
| Prompt records for every figure | SPEC requires "README listing every Colorfigures prompt used"; `docs/audit/platform.md` said 25 of 42 missing | the T2a wave "missing prompt records"; `figures/prompts/` count not verified by me (UNKNOWN) |
| `[342]`, `[VIDEO_URL]`, organisers' answer in the write-up | DEVPOST-WRITEUP | open |

**Request queue (`docs/requests/`)**

- 104 files (`ls docs/requests \| wc -l`), 5,265 lines. 15 are `*-gaps.md` (500 lines), each written by a wave-A or wave-B agent for its successor, 10-24 about 21:00. None carries a status field (grep for `Status:` finds 1 file, a header line, not a closure). Without reading code for every line I cannot say how many remain open. Sampled five gap files: of the 33 bullets I read, at least 4 were closed later (usage opt-out and privacy copy: ARCHITECTURE v1.6; "swarm, vtol and octo have no content module": all 13 drones now exist; English fallback; "relay not approved": relay on Vultr since 08:34). Estimate: well under half of the 15 gap files' items are still live (ESTIMATED, wide error bar).
- Code carries no TODO/FIXME markers (0), so this folder is the only debt ledger.

**What the git history says is not done**

- No release/tag, no CI config in the files I looked at (CI not in my scope; UNKNOWN).
- `docs/MASTER_PLAN/` is untracked (this audit's output folder).

## Appendix: scope notes and what I did not do

- Read in full: README, DEVPOST-WRITEUP, PITCH, JUDGE-QA, DEVPOST-STORY, SPEC, DECISIONS, BASE_ARCHITECTURE, HANDOFF (all), CONTEXT (all), history.md, gate3.md. Read in part: ARCHITECTURE (changelog and ownership), STRATEGY (first 60 lines), fresh-eyes (first 60 lines + headings), current-iynk-audit (first 40), the five other audits (first 14 lines), DEPLOY (first 60), VIDEO (VO lines), 5 gap files (first bullets). Not read: HX-CONTRACT, BUILD-PLAN beyond lines 16-53, AI, DATA, REALTIME, SOLANA, MUSE-CONNECTOR, HARDWARE, ui-audit-*, sweep, gate1/2, design/*, research/* beyond grep, 33 of 35 fact sheets, 100+ request files.
- I did not run the test suite, build, or any server. I did not read `.env.local`. Network use was read-only: one PDF download and two GitHub API reads, plus `gh repo view` on the public repo.
- Claim text was extracted by script from the exact lines; where a claim wraps across lines I used the line on which it begins.
