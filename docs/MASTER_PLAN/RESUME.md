# Resume the iynk master plan

Read this first if you are picking up the master plan (Cursor, Claude Code or a person). It says what is done, what
is not, and exactly what to do next, in order.

- **Paused:** 2026-10-27 00:12 CDT by Amar's Claude Code session (Opus 5.5 orchestrating, Sonnet 5.5 subagents).
  Both running workflows were stopped cleanly; no agent was mid-edit on any file listed as done below.
- **Resumed:** 2026-10-27 00:22 CDT in Cursor. Step 1a finished at 01:00 CDT and is recorded below. Next is step 1b.
- **Assignment:** [BRIEF.md](BRIEF.md), the founder's full brief, verbatim. Every file in this folder answers a
  section of it. Read it before anything else.
- **Audited commit:** `bb546d6a051f0b268576587c6f9f934dde9e766c` (main, 2026-10-25 11:19 CDT). Source code has not
  changed since; the only new files are this `docs/MASTER_PLAN/` folder.
- **Repo:** `/Users/amar/Codes/ak/simlab` (GitHub `kushwahaamar-dev/iynk`, **public**).
- **Evidence scratch** (screenshots, scripts, logs the agents made): `/Users/amar/iynk-master-plan-scratch/`
  (a permanent copy of the session's temporary scratchpad). Use it as the `scratch` folder from now on.

## 1. Rules for whoever resumes

1. **Models.** Amar's instruction: the orchestrating agent is Claude Opus 5.5; every subagent, background agent or
   parallel agent is Claude Sonnet 5.5. In Cursor, pick Opus 5.5 for the main chat and Sonnet 5.5 for any background
   or parallel agents.
2. **Planning, not building.** The brief (§2.4) forbids production rewrites. Change nothing under `src/`, `figures/`,
   `server/`, `solana/`, `db/`, `e2e/`, `scripts/` (except `scripts/workflows/`), `package.json` or lockfiles.
   Proofs of concept and benchmarks go in `docs/MASTER_PLAN/08_RESEARCH_SPIKES/<spike>/` or the scratch folder.
3. **Evidence labels on every important statement:** VERIFIED, DOCUMENTED, EXTERNAL, ESTIMATED, HYPOTHESIS,
   UNKNOWN (BRIEF §2.2). Never invent interviews, demand, prices, benchmarks or revenue.
4. **Production is off limits.** No writes to https://iynk.tech, rt.iynk.tech, Vercel, Vultr or Solana devnet
   (read-only RPC is fine). Do not start anything on ports 3000 or 43117.
5. **Secrets.** `.env.local` holds real keys. Never print, copy or quote a value; only say whether a name is set.
6. **Git.** Commit locally as Amar Kushwaha with plain messages and **no** `Co-Authored-By` or "Generated with" lines
   (HANDOFF.md rule). **Do not push**: the repo is public and this folder holds business strategy and competitor
   analysis. Pushing is Amar's call.
7. **Next.js 16.4 differs from what models know.** Read `AGENTS.md` before reasoning about Next APIs.
8. **Builds** use their own folder: `NEXT_DIST_DIR=.next-audit npm run build`. `next build` may add a
   `.next-audit` line to `tsconfig.json`: revert it with `git checkout -- tsconfig.json`. Delete `.next-audit/` when
   the audit is finished.
9. **Keyless runs.** A plain build or `npm run e2e` reads the real keys in `.env.local`, and its
   `NEXT_PUBLIC_REALTIME_URL` would point test rooms at the production relay. For the audit, build **and** serve
   with these names set to empty (an empty variable in the shell wins over `.env.local`; VERIFIED in
   `node_modules/@next/env/dist/index.js`, `processEnv` only fills names that are undefined):

   ```bash
   export NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= \
     NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL=
   ```

   Then confirm `curl -s localhost:<port>/api/status` shows ai, search, db, solana and realtime off before running
   anything. Run a separate, deliberate keyed check only where a claim needs it, and say so in the report.
10. **Workflow agents in Claude Code:** never SendMessage a running workflow agent by its id (it spawns a duplicate).

## 2. Status

### Done (keep; build on these)

| Brief section | File(s) | Notes |
|---|---|---|
| §4.1 inventory | `01_AUDIT/inventory/*.md` (14 subsystems) | Each agent read the code and ran its own commands. |
| §4 claims | `01_AUDIT/CLAIMS.json`, register in `inventory/docs-claims-history.md` | Every README, landing, pitch and Devpost claim. |
| §4.4 | `01_AUDIT/REPOSITORY_INVENTORY.md` | Synthesis. Written before any run report existed (it says so). |
| §4.4 | `01_AUDIT/FEATURE_VERIFICATION.md` | Synthesis. Its author ran the unit suite and counts itself (table in §0). E2E and browser walk not run. |
| §4.3, §4.4 | `01_AUDIT/TECHNICAL_DEBT.md` | The 13 architecture questions (A1-A13), debt register (B), five structural changes (D1-D5). |
| §4.4, §21 | `01_AUDIT/SECURITY_BASELINE.md` | Threat table, release blockers, quick wins. |
| §5.1 | `02_RESEARCH/competitors/*.md` (7 categories) | Each fact-checked by a second agent (log at the end of each file). |
| §5.2 | `02_RESEARCH/WORKFLOW_BENCHMARK.md` | Hands-on runs in Wokwi, Falstad, MakeCode and iynk.tech; fact-checked. |
| §6.1 | `02_RESEARCH/USER_SEGMENTS.md` | Desk research only, no interviews; fact-checked. |
| §23.3 | `02_RESEARCH/MARKET_ANALYSIS.md` | Bottom-up TAM/SAM/SOM; fact-checked. |
| §10, §19 research | `02_RESEARCH/tech/simulation-options.md`, `platform-options.md`, `compliance-safety.md`, and the summary `02_RESEARCH/TECHNICAL_RESEARCH.md` | Fact-checked; TECHNICAL_RESEARCH lists the spikes to run. |
| §4.2 commands and build | `01_AUDIT/runs/COMMANDS.md`, `01_AUDIT/runs/BUILD_OUTPUT.md` | Run 2026-10-27 00:22–01:00 CDT by the validate:commands agent. Keyless `NEXT_DIST_DIR=.next-audit npm run build` exit 0 (72.8 s, Next 16.4.3, 827 static pages). `.next-audit` kept. `tsconfig.json` was reverted after the build added include lines. `content:check`, `typecheck` and `lint` exit 0. `server/realtime` tests 39/39. `npm ci` and `anchor test` were not run (`Anchor.toml` cluster is devnet). Machine was never quiet (1-minute load 38–117 on 14 cores). |

### Not done

| Step | What is missing | Why |
|---|---|---|
| 1b | `01_AUDIT/runs/E2E.md`, `runs/BROWSER_WALK.md`, `01_AUDIT/PERFORMANCE_BASELINE.md`, `01_AUDIT/TEST_COVERAGE.md` | Started 2026-10-27 01:02 CDT. All four Sonnet agents, plus one e2e retry, stopped when the Sonnet usage limit was hit. They were not switched to another model. None of the four reports was written. Scratch holds an unfinished Playwright log (119 tests started, no summary), keyless `/api/status` with every feature false on ports 47401 and 47322, a few browser screenshots, and a coverage log that died mid-run. Those are not finished runs. At 01:07 the three ports were free and `package.json`, the lockfile and `tsconfig.json` were clean. |
| 1c | FEATURE_VERIFICATION, TECHNICAL_DEBT and REPOSITORY_INVENTORY still say "not run" in places | They were written without the run reports. |
| 1d | Six adversarial reviews and `01_AUDIT/REVIEW_GAPS.md` | Stopped about 20 seconds in; they had changed nothing. |
| 2 | `02_RESEARCH/COMPETITOR_LANDSCAPE.md`, `USER_RESEARCH_PLAN.md`, `SOURCE_REGISTER.md`, `COMPETITOR_MATRIX.md` | Stopped mid-synthesis; nothing was written. The matrix was planned for step 3. |
| 3-10 | Everything in `00_EXECUTIVE/`, `03_PRODUCT/` to `08_RESEARCH_SPIKES/`, `MASTER_INDEX.md`, both JSON files | Not started. Step 3's script is written but was never run. |

### What we already know (so step 3 starts with context)

From `01_AUDIT/` (read the files for evidence and labels):

- **Original projects are not possible today.** A4 "partly, narrowly yes, broadly no"; A5 "no, there is a real
  netlist, but it is a by-product of the drawing data"; A11 "no" persistence for user content.
- **The five structural changes with the most leverage** (TECHNICAL_DEBT Part D): D1 a JSON project document with
  open ids and a schema version; D2 a pure, data-driven part and net graph, solver and sandboxed generic renderer;
  D3 identity and durable server state (projects table, shared limiter, usage ledger, server-side verification);
  D4 an execution runtime with limits (workers, device and library registries, an emulator path); D5 one
  revision-safe action protocol shared by rooms, AI proposals, persistence and replay. Two gates come first: CI, and
  the licence and provenance decision. Suggested order: gates, D3 client persistence and shared limiter, D1, then D5
  and D4 in parallel, then D2.
- **Unit tests** (`01_AUDIT/runs/COMMANDS.md`, 2026-10-27, load about 43–88, not a quiet machine): 2,802 cases,
  2,784 passed, 13 failed, 5 skipped, 357 s. All 13 failures are wall-clock timeouts. No assertion mismatch.
  Run alone after the suite: `octo.test.ts` 30 pass / 1 fail (`octo: still busy after 50000 ms` on the landing-gear
  press, `_checks.ts` `settle`; the figure advances at most 0.05 simulated seconds per frame, and that press needs
  7.1 s); `wing.test.ts` **27 of 27 pass** (the elevon test took 38.4 s of its 40 s limit, and it failed only inside
  the full suite); `basys3.test.ts` 23 pass / 1 fail (the display chip sweep, 95 `runChecks` calls, vitest's 120 s
  limit; the body finished and the checks passed). Whether a quiet machine would pass octo and basys3 is
  ESTIMATED, not measured. The realtime relay passed 39 of 39. Five skips: four Timescale tests (no Docker daemon)
  and one i18n test that does not run when nothing is untranslated.

## 3. What to do, in order

The prompts are already written. Each step below names the script and the line where its prompt starts. Copies of
the scripts are committed in [`_resume/workflow-scripts/`](_resume/workflow-scripts/); the live copies are in
`scripts/workflows/` (gitignored, this machine only).

**How to use a prompt in Cursor.** Open the script and copy the template string for the label you need (the
`${RULES}` or `${VALIDATE_RULES}` block it starts with is defined at the top of the file; paste that text in too).
Substitute the variables:

| Variable | Value |
|---|---|
| `${repo}` | `/Users/amar/Codes/ak/simlab` |
| `${commit}` | `bb546d6a051f0b268576587c6f9f934dde9e766c` |
| `${scratch}` | `/Users/amar/iynk-master-plan-scratch` |
| `${out}` | the script's `out` constant (for example `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/01_AUDIT`) |
| `${mp}` | `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN` |
| `${today}` | the actual date |

Give each label to its own Sonnet 5.5 agent. Labels in the same step that share no output file can run in
parallel. Ignore the `schema` objects: in Cursor, ask the agent to end with a short summary instead.

**If you are back in Claude Code instead:** do not relaunch the old scripts whole. `resumeFromRunId` only works in
the session that started the run, so a fresh launch would redo every finished agent. Write a small "finish" script
holding only the unfinished labels below, keep the `sonnet()` wrapper so every agent runs on Sonnet 5.5, commit it
to `scripts/workflows/`, then run it.

### Step 1: finish the audit (`master-plan-audit.js`)

1a. **`validate:commands`** (prompt at line 325, rules `VALIDATE_RULES` at line 246). Writes `01_AUDIT/runs/COMMANDS.md`
    and `runs/BUILD_OUTPUT.md`. Build keyless (rule 9). Run the suites one after another on a quiet machine.
1b. When 1a's build exists, run these four in parallel. Each starts its own server on its own port, never 3000:
    - **`validate:e2e`** (line 348) writes `runs/E2E.md`. Keyless, per rule 9. The prompt's "empty the env vars"
      step is covered by rule 9 already.
    - **`validate:browser-walk`** (line 362) writes `runs/BROWSER_WALK.md` with screenshots in scratch. Step 15
      (try to build something the catalogue doesn't offer) is the most important finding for the plan. Its AI,
      SerpApi and room steps need keys: skip them on the keyless build, or run them once deliberately on a keyed
      build with `NEXT_PUBLIC_REALTIME_URL` still empty, and say which you did.
    - **`validate:perf`** (line 390) writes `01_AUDIT/PERFORMANCE_BASELINE.md`.
    - **`validate:coverage`** (line 410) writes `01_AUDIT/TEST_COVERAGE.md`. Its `npm install --no-save` must
      leave `package.json` and `package-lock.json` unchanged. Check with `git status` and revert if not.
1c. **Refresh the syntheses** with the run reports. In `REPOSITORY_INVENTORY.md`, `FEATURE_VERIFICATION.md` and
    `TECHNICAL_DEBT.md`, update every row that says "not run" or "run reports missing". Re-label claims the runs now
    verify or contradict, and log the changes at the end of each file. The original synthesis prompts are at lines
    455, 469 and 481.
1d. **Adversarial review** (line 526), one agent per file, for all six `01_AUDIT` documents. Then the **completeness
    critic** (line 537), which writes `01_AUDIT/REVIEW_GAPS.md`. Close every blocker and high gap it lists before
    step 3.

### Step 2: finish the research synthesis (`master-plan-research.js`)

The rules are `RULES` at line 19 and the synthesis preamble is `SYNTH` at line 364. Run these three in parallel:

- **`synth:landscape`** (prompt at line 371) writes `02_RESEARCH/COMPETITOR_LANDSCAPE.md`.
- **`synth:research-plan`** (line 382) writes `02_RESEARCH/USER_RESEARCH_PLAN.md`.
- **`synth:sources`** (line 406) writes `02_RESEARCH/SOURCE_REGISTER.md`.

`synth:technical` is already done. The SYNTH preamble needs the list of dossier files; use the "Done" table above.

### Step 3: strategy (`master-plan-strategy.js`, never run)

1. **Council** (`LENSES` at line 43, rules at line 19). Eight memos go to `00_EXECUTIVE/council/<lens>.md`, covering
   all 20 roles in BRIEF §1 and red-team questions 1-20 (§31).
2. **Strategies** (`STRATEGIES` at line 151). Three advocates write `06_BUSINESS/strategy-options/A-creator-builder.md`,
   `B-classroom.md` and `C-fault-lab.md`.
3. **Judges** (`JUDGES` at line 213). Four judges write `06_BUSINESS/strategy-options/judge-<lens>.md` with scores.
4. **The decision.** The orchestrator, not a subagent, reads the judges and picks **one** primary market-entry
   strategy and a beachhead segment (BRIEF §5.4, §6.3). It explicitly rejects or defers the alternatives and records
   that in `00_EXECUTIVE/DECISION_REGISTER.md`: D-001 beachhead, D-002 primary strategy, then the
   rejected/deferred list. Each entry gives the evidence and the kill criteria. Then write
   `06_BUSINESS/POSITIONING.md`, `06_BUSINESS/STARTUP_STRATEGY.md` and `02_RESEARCH/COMPETITOR_MATRIX.md`. The matrix
   has every §5.3 dimension, iynk in every row, and TESTED kept separate from marketing claims; take iynk's cells
   from FEATURE_VERIFICATION.

### Steps 4-10: not scripted yet

Write them the same way as steps 1-3: one Sonnet agent per file, each told to read BRIEF.md's section, the audit,
the research and the decision register. Each step gets an adversarial review before the next one starts. Product
and architecture decisions must follow D-001 and D-002.

| Step | Writes | Brief sections |
|---|---|---|
| 4 Product | `03_PRODUCT/` PRODUCT_REQUIREMENTS, USER_JOURNEYS (12 flows with states, validation, accessibility, success criteria), FEATURE_CATALOGUE, FEATURE_PRIORITIZATION (scored matrix with weights and the seven classes), STUDIO_EDITOR, COMPONENT_ECOSYSTEM, EDUCATION, COMMUNITY, UX_DESIGN_SYSTEM (audit the current identity first) | §7, §8, §9, §15, §16, §17, §18, §25 |
| 5 Architecture | `04_ARCHITECTURE/` all 12 files plus `ADR/ADR-NNNN-*.md` (one per major choice, all 12 ADR fields), the 10 Mermaid diagrams in SYSTEM_DIAGRAMS, and JSON Schemas `04_ARCHITECTURE/schemas/project.schema.json` and `component.schema.json`. Start from the audit's D1-D5. | §8.3, §9.2-9.3, §10-§14, §19 |
| 5b Spikes | `08_RESEARCH_SPIKES/<spike>/REPORT.md` with measured results. Candidates are in TECHNICAL_RESEARCH.md: for example avr8js against the TypeScript interpreter as a differential oracle, SVG against Canvas at 50-500 parts, a server-ordered op log against Yjs for a project document, ngspice-WASM against bench-solve on the reference circuits. Each has a falsifiable question and an exit condition. | §2.4, §8.2, §10.4, §14 |
| 6 Engineering | `05_ENGINEERING/` IMPLEMENTATION_ROADMAP (phases 0-10, every one of the 22 phase fields, best/expected/adverse effort), DEPENDENCY_GRAPH, TASK_SPECIFICATIONS (atomic tasks for every near-term feature with all §27 fields), TEST_STRATEGY, VALIDATION_BENCHMARKS (with fidelity registry), PERFORMANCE_BUDGETS, SECURITY_THREAT_MODEL, DEPLOYMENT_ARCHITECTURE (with the 100 to 1M DAU capacity scenarios), OPERATIONS_RUNBOOK, RELEASE_GATES | §20-§22, §26, §27, §32 |
| 7 Business | `06_BUSINESS/` PRICING_STRATEGY, UNIT_ECONOMICS, GROWTH_STRATEGY (north star, launch plan), PARTNERSHIPS, FINANCIAL_SCENARIOS | §23, §24 |
| 8 Handoff | `07_HANDOFF/` all 7 files (FIRST_30_TASKS names the exact first engineering task), `MASTER_INDEX.md`, `implementation_manifest.json` (all §28.1 fields), `feature_dependency_graph.json`, `03_PRODUCT/DEMO_WALKTHROUGH.md` (the ESP32 environmental monitor plus a robotics and a drone example, with every step mapped to UI module, data, API, engine, persistence, security and validation), `00_EXECUTIVE/RED_TEAM.md` (§31) | §28, §29, §30, §31 |
| 9 Final review | One cross-disciplinary pass for contradictions, missing dependencies, unsupported assumptions, safety gaps and ambiguous instructions. Validate both JSON files (`node -e "JSON.parse(require('fs').readFileSync(f))"`) and check that every relative link in `docs/MASTER_PLAN` resolves. | §35 step 9 |
| 10 Report | `00_EXECUTIVE/EXECUTIVE_SUMMARY.md` answering A-K of §33, plus VISION_AND_THESIS and CRITICAL_FINDINGS. Then tell Amar the result and the first engineering task. | §33, §34 |

## 4. When you stop

Commit what is finished as Amar, with no agent attribution and no push. Update the Status tables in this file so the
next agent knows where you stopped, and add a line to the log below.

## Log

- 2026-10-26 14:27 CDT: first audit run (`wf_de462724-a87`) started on Fable 5.1; the session ended about 2 minutes
  in, before any agent finished. Nothing kept.
- 2026-10-26 23:37 CDT: audit relaunched (`wf_455b1c22-9bb`) and research launched (`wf_61bde6ad-a2b`), every
  subagent on Sonnet 5.5.
- 2026-10-27 00:12 CDT: paused at Amar's request, to resume in Cursor. Done and not done as above. Fixed the audit
  script's `pipeline([null], …)` bug, which had kept the validation agents from starting (now
  `pipeline(['validate'], …)`).
- 2026-10-27 01:00 CDT: step 1a finished. `runs/COMMANDS.md` and `runs/BUILD_OUTPUT.md` written. Keyless build exit 0.
  Full `npm test` exit 1 (2784 passed, 13 failed, 5 skipped). Alone: octo fails on the landing-gear settle, wing
  passes, basys3 display sweep times out. Load stayed 38–117, so every duration is under contention. `anchor test`
  not run. `.next-audit` kept for step 1b.
- 2026-10-27 01:07 CDT: step 1b did not finish. The four Sonnet agents and the e2e retry all stopped with "Other
  Models usage limit reached" and were not switched to Grok. No run report was written. Orphaned servers were
  stopped. Load was about 152. Step 1b still has to be run.
