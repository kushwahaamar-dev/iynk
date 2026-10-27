export const meta = {
  name: 'master-plan-continue',
  description: 'Finish the master plan audit and research: browser walk, perf, coverage, research syntheses, refresh, adversarial review, gap fixes, competitor matrix',
  phases: [
    { title: 'Validate', detail: 'performance on a quiet machine first, then browser walk and coverage', model: 'sonnet' },
    { title: 'Research synthesis', detail: 'competitor landscape, user research plan, source register', model: 'sonnet' },
    { title: 'Refresh', detail: 'update the audit syntheses with every run report', model: 'sonnet' },
    { title: 'Review', detail: 'adversarial review of each audit and research synthesis, then a completeness critic', model: 'sonnet' },
    { title: 'Fix gaps', detail: 'one fixer per document closes the critic\'s blocker, high and medium gaps', model: 'sonnet' },
    { title: 'Matrix', detail: 'the evidence-backed competitor matrix with iynk in every row', model: 'sonnet' },
  ],
}

// Every subagent runs on Sonnet 5.5 (Amar, 2026-10-26); only the orchestrating session is Opus.
const sonnet = (prompt, opts = {}) => agent(prompt, { ...opts, model: 'sonnet' })

const repo = '/Users/amar/Codes/ak/simlab'
const commit = 'bb546d6a051f0b268576587c6f9f934dde9e766c'
const scratch = args?.scratch ?? '/Users/amar/iynk-master-plan-scratch'
const mp = `${repo}/docs/MASTER_PLAN`
const out = `${mp}/01_AUDIT`
const res = `${mp}/02_RESEARCH`
const today = '2026-10-27'

const RULES = `You are one agent in a council auditing the iynk repository (${repo}, audited commit ${commit}) for a master plan that turns a HackTX 2026
hackathon prototype into a real product. The founder's brief is ${mp}/BRIEF.md and the state of the plan is ${mp}/RESUME.md: read RESUME.md's rules
section before you start. Your findings feed engineers and a founder who will make decisions on them, so they must be true, specific and reproducible.

Rules:
- Read the code. Never describe the system from README.md, docs/ or memory of similar projects; quote file paths and line numbers.
- Change NOTHING in the repo except the output file(s) named in your task. No edits to source, tests, configs, package.json or lockfiles; no git commands
  that change state (status, log, diff, blame, show are fine); no deploys; nothing touches production (https://iynk.tech, rt.iynk.tech, Vercel, Vultr,
  Solana devnet beyond read-only RPC). Never use ports 3000 or 43117. Do not commit; the orchestrator commits.
- Scratch files, scripts and screenshots go under ${scratch}/audit/<your label>/ and nowhere else. Run any Python with -I.
- .env.local holds real keys: never print, log, copy or quote a value, only whether a variable is set.
- Label every important statement: VERIFIED (you inspected the source or reproduced it), DOCUMENTED (a project doc says so, not tested),
  EXTERNAL (identified outside source), ESTIMATED (your calculation, assumptions stated), HYPOTHESIS (needs validation), UNKNOWN.
- Count things with commands, not by eye, and show the command next to the number.
- Write plainly: short sentences, no marketing, no hedging filler, no em dashes. A finding is "what, where (path:line), evidence, why it matters,
  severity (blocker/high/medium/low)". Prefer tables.
- Distinguish what works from what is merely present.
- Big files: read in chunks of at most 400 lines; never assume one read showed a whole file.
- Your final text is returned as data to the orchestrator. The human reads your markdown file, so make it complete on its own.`

// Keyless server settings (RESUME.md rule 9): an empty variable in the shell wins over .env.local.
const KEYLESS = `NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL=`
// For the one deliberate keyed check: AI and search keys stay, every write path to production data is emptied, and SerpApi is capped.
const KEYED_SAFE = `NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL= SERPAPI_MONTHLY_BUDGET=12`

const SERVER = `A keyless production build already exists in ${repo}/.next-audit (built 2026-10-27 01:00 CDT from the audited commit with every key emptied,
so NEXT_PUBLIC_REALTIME_URL is empty and rooms fall back to tabs in one browser). Do not rebuild it. Start a server with
  cd ${repo} && env ${KEYLESS} NEXT_DIST_DIR=.next-audit npx next start --port <your port>
in the background (log to your scratch folder), wait for http://localhost:<port>/en to answer, and check curl -s localhost:<port>/api/status shows every
feature flag false before you begin. Kill your server (and any browser) when you finish, even on failure. Load Playwright from the repo in an .mjs file:
import { createRequire } from "node:module"; const { chromium, devices } = createRequire("${repo}/package.json")("playwright").`

const DOC_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    summary: { type: 'string' },
    topFindings: { type: 'array', items: { type: 'string' } },
    blockers: { type: 'array', items: { type: 'string' } },
    unverified: { type: 'array', items: { type: 'string' }, description: 'what you wanted to check but could not, and why' },
  },
  required: ['file', 'summary', 'topFindings'],
}

// ---------------------------------------------------------------- Validate (performance first, alone, while the machine is quiet)

const perfJob = () => sonnet(`${RULES}

Task: PERFORMANCE BASELINE (label validate:perf). Write ${out}/PERFORMANCE_BASELINE.md.
${SERVER}
Use port 47322. You run first and alone on purpose: record uptime (load average) before and after each measurement.
1. Bundle: from ${repo}/.next-audit and ${out}/runs/BUILD_OUTPUT.md, the First Load JS per route group, the largest chunks
   (ls -S .next-audit/static/chunks | head -20), which dependencies dominate (search chunk text for "solana", "codemirror", "anchor", "web3"), and gzipped
   sizes (gzip -c | wc -c). Which heavy dependencies load on the landing page and on a lesson page?
2. Figures: sizes of public/figures/**/*.html (total, largest, median, count) and the vendor core size; time for one figure iframe to report ready in
   Playwright (the host page receives a 'ready' message; find how e2e/boardlab.spec.ts waits for it).
3. Interpreter: a node or vitest micro-benchmark in scratch that imports src/lib/interp's headless runner (find the export used by
   src/lib/interp/lessons.test.ts) and times a Blink-style sketch for 5 s and 60 s of virtual time, a MicroPython loop and a Python/rclpy sample; report
   wall ms per virtual second and whether cost scales with virtual time or instruction count.
4. Circuit solver: time figures/engine/bench-solve.js on the largest bench circuit in the repo (use its tests as a template), ms per solve.
5. Flight: the physics step cost from the code (ESTIMATED) and the requestAnimationFrame rate on /en/drones/quad5/fly in headless Chromium over 5 s
   (state the headless GPU caveat).
6. Pages: Playwright navigation timings (DOMContentLoaded, load, LCP via PerformanceObserver) for the landing page, /en/boards/uno-r3/blink,
   a robotics bench, /en/drones/quad5 and its fly page; 3 runs each, median; desktop, and again with CPU throttling 4x
   (CDP Emulation.setCPUThrottlingRate) to approximate a cheap laptop.
7. Memory: JS heap after 60 s of running a lesson (CDP Performance.getMetrics), to spot leaks.
Say which numbers are measured (and at what load) and which are estimates. End with "Targets to set later" (do not invent targets) and link
runs/BUILD_OUTPUT.md.`, { label: 'validate:perf', phase: 'Validate', schema: DOC_SCHEMA })

const walkJob = () => sonnet(`${RULES}

Task: BROWSER WALK (label validate:browser-walk). Write ${out}/runs/BROWSER_WALK.md with screenshots saved under ${scratch}/audit/browser-walk/ (reference
their paths). Earlier partial screenshots in that folder came from a run that died; start fresh in a new subfolder walk-${today}/.
${SERVER}
Use port 47311 for the keyless server. Another agent is running the unit suite with coverage at the same time, so timings are under load: record uptime.
Walk the actual product as a careful new user at desktop (1440x900) and phone (Pixel 7 emulation). Capture console errors and failed network requests on
every page. For each step record what you did, what happened, time to interactive, pass / fail / partial, and the evidence.
Steps:
 1. / with no cookie: language redirect; landing page content; the live Uno figure; theme default (light).
 2. /en/boards, then /en/boards/uno-r3, then its first lesson (blink). Press Run with the starter code; wait for checks; read the serial monitor and the
    figure's LED state. Then make the checks pass (use the lesson's solution if the UI exposes one, else edit the code); confirm the pass state.
 3. In that lesson, trigger a "break it" failure with the UI's own control; record the explanation shown and whether the figure shows damage.
 4. Edit the code to something the interpreter may not support (a template class, pointer arithmetic, a String method, an unknown #include) and
    record the error message quality.
 5. An infinite loop without delay(): does the UI stay responsive, and what does it report?
 6. /en/robotics: open the L298N driver bench (or the first bench); walk the assembly steps; run the task; trigger a fault.
 7. /en/drones/quad5: calculator tiles; change a part (battery) and watch the results; run the bench safety checks; open "Build it for real" and record
    what the keyless build shows.
 8. /en/drones/quad5/fly: fly 20-30 s with the keyboard; crash; replay; count requestAnimationFrame callbacks over 5 s.
 9. Lab tools, Together: start a room. Without the relay URL, rooms fall back to tabs in one browser: open the room link in a second PAGE of the SAME
    browser context, act in each, and confirm sync. Say plainly that cross-device sync through the relay was not tested here (the relay's own tests are in
    runs/COMMANDS.md).
10. Lab tools, Partner: record what a keyless build shows.
11. Switch the language to es and hi on a lesson page: is everything translated, including figure labels? Note any English fallback.
12. /en/together, /en/passport (do not connect a wallet), /en/verify, /en/about: what each does with no wallet and no keys.
13. Phone: steps 1, 2, 6 and 8 again at Pixel 7 size; note overflow, unreachable controls and the touch sticks.
14. Save and share: is there any way to keep work beyond localStorage? Is there a share link for a lesson or room? Reload the lesson: is the code kept?
15. The key finding for the plan: try to do something the catalogue does not offer. Add a part that is not in the lesson, wire a different pin, start a
    blank project, use a board without a lesson. Record exactly what is and is not possible and where the UI stops you.
16. ONE deliberate keyed check, for the two claims that need keys (the AI partner reads the bench; live parts prices). Stop the keyless server first, then
    start a second server on port 47312 with  env ${KEYED_SAFE} NEXT_DIST_DIR=.next-audit npx next start --port 47312  (AI and SerpApi keys stay;
    the database, Solana and realtime are emptied so nothing is written to production; SerpApi is capped at 12 uncached searches). Confirm with
    /api/status that db, solana and realtime are false and ai and search are true. Then: ask the Partner ONE question on the Blink lesson after a
    deliberate wiring or code mistake, and record whether its answer refers to the actual bench state; and open quad5's "Build it for real" ONCE, record
    the total, the sources shown and how long it took. No other AI or search calls. Kill the server afterwards.
Write the report with a summary table (step, result, evidence), then per-step notes, then "What this means for the master plan". Note that the e2e run
(runs/E2E.md) found the "]" next-lesson shortcut failing on Blink; check it by hand once.`, { label: 'validate:browser-walk', phase: 'Validate', schema: DOC_SCHEMA })

const coverageJob = () => sonnet(`${RULES}

Task: TEST COVERAGE (label validate:coverage). Write ${out}/TEST_COVERAGE.md. A previous attempt died mid-run; its partial logs are in
${scratch}/audit/coverage* and are not a finished result.
1. Line coverage: cd ${repo} && npm install --no-save @vitest/coverage-v8@$(node -p "require('./node_modules/vitest/package.json').version")
   (--no-save must leave package.json and package-lock.json unchanged: confirm with git status; if either changed, run git checkout -- package.json
   package-lock.json and say so). Then run npx vitest run --coverage --coverage.provider=v8 --coverage.reporter=text-summary
   --coverage.reporter=json-summary --coverage.reportsDirectory=${scratch}/audit/coverage-${today} with --testTimeout=180000 (the default 60 s limit
   times out the slow figure-settling tests under load; runs/COMMANDS.md explains). Note coverage of figures/**/*.js comes only through jsdom imports, if
   at all. If the install or run fails, record why and fall back to a file-level map (which src files have a sibling test).
   Report per directory (src/lib/*, src/components/*, src/app/api/*, figures/engine) and overall: lines, branches, functions.
2. Taxonomy, by reading: for each test group (src/content/*/*.test.ts, src/lib/interp, figures/engine/*.test.mjs, src/lib/drone calc tests,
   src/lib/flight, src/lib/realtime, server/realtime/test, src/app/api/**/route.test.ts, e2e/*.spec.ts, solana/tests) answer: what oracle does it use?
   (a) external reference data (datasheets, measured hardware, a third-party simulator); (b) hand-derived expected values from first principles;
   (c) the implementation's own formulas re-run (tautological); (d) behavioural contract (an action produces a state); (e) smoke (does not throw).
   Give counts of tests per oracle class per group, with examples (path:line). This answers whether tests validate real hardware behaviour.
3. Gaps: what has no test at all (components, routes, stores, the AI tool loop, relay client reconnection, migrations, ...).
4. Flakiness: timeouts (the 13 timeouts in runs/COMMANDS.md), real-time animation in jsdom, network-dependent tests, randomness.
5. What a production test strategy must add (bullets, handed to 05_ENGINEERING/TEST_STRATEGY).
Link runs/COMMANDS.md and runs/E2E.md for the pass/fail baselines rather than re-deriving them.`, { label: 'validate:coverage', phase: 'Validate', schema: DOC_SCHEMA })

const validateChain = async () => {
  const perf = await perfJob()
  log('Performance baseline done; browser walk and coverage start together')
  const [walk, coverage] = await parallel([walkJob, coverageJob])
  return { perf, walk, coverage }
}

// ---------------------------------------------------------------- Research synthesis (runs alongside Validate; little local CPU)

const RES_RULES = `You are a researcher on a council writing a master plan for iynk (https://iynk.tech, repo ${repo}), a free browser hardware lab built at
HackTX 2026. The founder's brief is ${mp}/BRIEF.md (read §5 and §6). Today is ${today}.

Rules:
- Load the web tools with ToolSearch (query "select:WebSearch,WebFetch") only if you must fill a specific gap; cite what you add with URL and access date.
- Never fabricate a capability, price, benchmark, user opinion or market number. Labels: TESTED, EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.
- Change nothing in the repo except your output file. Scratch goes under ${scratch}/research/<your label>/. Do not commit.
- Write plainly: short sentences, tables for comparisons, no marketing language, no em dashes. Keep the dossiers' [S#] source references, prefixed by the
  dossier name (e.g. [embedded-sim S4]) so a reader can find them.
- Your final text is returned as data; the human reads your file, so it must stand alone.

You are a synthesis agent. These dossiers exist and were fact-checked (each ends with a fact-check log); read them in full and keep their labels:
${res}/competitors/embedded-sim.md, circuit-eda.md, education.md, robotics.md, drone.md, ecosystems.md, ai-hardware.md;
${res}/WORKFLOW_BENCHMARK.md; ${res}/USER_SEGMENTS.md; ${res}/MARKET_ANALYSIS.md; ${res}/tech/simulation-options.md, platform-options.md,
compliance-safety.md; ${res}/TECHNICAL_RESEARCH.md. iynk's own verified capabilities are in ${out}/FEATURE_VERIFICATION.md and ${out}/runs/.`

const researchSynth = () => parallel([
  () => sonnet(`${RES_RULES}

Write ${res}/COMPETITOR_LANDSCAPE.md: the founder-readable landscape. Sections: 1 Executive view (one page: who matters, who iynk actually competes with
for each audience, where the field is crowded, where it is empty). 2 Category maps (one table per category: product, audience, price, what it is best at,
threat level). 3 The nine standard workflow tasks of BRIEF §5.2: what WORKFLOW_BENCHMARK.md found, product by product, with TESTED vs documented kept
separate. 4 Deep comparisons with the four most important rivals for iynk (very likely Wokwi, Tinkercad Circuits, MakeCode and one more the evidence
picks): what each does better than iynk today, what iynk does that they don't (cite FEATURE_VERIFICATION and the run reports; mark anything not verified),
how fast they could copy iynk's differentiators. 5 Open-source we could build on (licence-checked table). 6 Signals of unmet need (with links).
7 Threats and watch list. 8 Differentiation hypotheses from BRIEF §5.4, each graded: genuinely hard to replicate / merely convenient / already done by
someone, with evidence. Link every dossier.`, { label: 'synth:landscape', phase: 'Research synthesis', schema: DOC_SCHEMA }),

  () => sonnet(`${RES_RULES}

Write ${res}/USER_RESEARCH_PLAN.md: an executable plan to validate demand before and during the build (BRIEF §6.2). Use USER_SEGMENTS.md and the
dossiers. Contents: research questions ranked by how much they would change the roadmap (do learners want original projects or guided lessons? will
teachers adopt a browser lab without accounts? does failure-based teaching improve debugging skill? does multilingual matter? who will pay?); for each
method (problem interviews, observational usability tests on the current product, a fake-door test on iynk.tech for "New Project", a prototype test of
the original-project builder, a teacher pilot, a willingness-to-pay study using Van Westendorp or Gabor-Granger, a learning-outcome pre/post test):
recruiting criteria and channels (named communities, with links), sample size with rationale (cite saturation literature for qualitative work, a power
calculation for quantitative), the full interview guide written out (non-leading, past-behaviour based), observation tasks, survey questions written out,
consent and minors (no under-13 participants without parental consent; school research approvals), bias controls, artefacts, decision thresholds written
as "if X then Y", timeline in weeks and budget (both ESTIMATED). No invented results.`, { label: 'synth:research-plan', phase: 'Research synthesis', schema: DOC_SCHEMA }),

  () => sonnet(`${RES_RULES}

Write ${res}/SOURCE_REGISTER.md: one consolidated, de-duplicated register of every source cited in ${res}/**/*.md (read each file's Sources list and its
fact-check log). Columns: global id (R001...), URL, title, publisher, type (official docs / pricing / repo / paper / regulator / news / community),
accessed date, what it supports (short), cited in (files and their local [S#]), status after fact-check (confirmed / corrected / unconfirmed /
unreachable). Then "Known limitations of this research" (paywalls, account-gated products not tested, regional data gaps, dates). Do not renumber the
dossiers; the register is an index across them. Use a script to extract URLs (grep -o 'https\\?://[^ )>]*') so nothing is missed, then fill the columns.`,
    { label: 'synth:sources', phase: 'Research synthesis', schema: DOC_SCHEMA }),
])

phase('Validate')
log('Validation chain and research synthesis start together; perf runs first on the quiet machine')
const [validation, research] = await parallel([validateChain, researchSynth])

// ---------------------------------------------------------------- Refresh the audit syntheses with every run report

phase('Refresh')
const RUNS = `Run reports now on disk: ${out}/runs/COMMANDS.md, runs/BUILD_OUTPUT.md, runs/E2E.md, runs/BROWSER_WALK.md; baselines:
${out}/PERFORMANCE_BASELINE.md, ${out}/TEST_COVERAGE.md, ${out}/SECURITY_BASELINE.md. Per-subsystem evidence: ${out}/inventory/*.md.
(If one of these files is missing, the agent that should have written it failed: say so in your log and leave the old wording.)`

const REFRESH = [
  { file: 'FEATURE_VERIFICATION.md', task: `Re-grade every claim whose status rested on "not run": the e2e run, the browser walk (especially steps 2, 3, 6, 7,
8, 9, 10, 11, 14, 15, 16), the build, the unit suite and the relay tests can now upgrade a claim to VERIFIED, downgrade it, or mark it CONTRADICTED.
Update the counts in §2 and the "What works end to end", "What is fragile" and "What is missing" sections, and the honesty fixes for README/landing copy.` },
  { file: 'TECHNICAL_DEBT.md', task: `Update the answers to A1-A13 where the runs add evidence (A4 and A11 from browser-walk steps 14-15; A12 replay; A13 from
TEST_COVERAGE's oracle taxonomy), and the debt register rows that cite runs, timings or test failures (the 13 timeouts, the "]" shortcut failure, perf
findings). Keep Part D unless the runs contradict it.` },
  { file: 'REPOSITORY_INVENTORY.md', task: `Replace the "run reports do not exist" caveat with the real results; add the build route table summary, bundle and
performance highlights, coverage per subsystem, and the browser walk's key findings to the per-subsystem digests and the cross-cutting observations.` },
]

const refreshed = await parallel(REFRESH.map(r => () => sonnet(`${RULES}

Task: refresh ${out}/${r.file}. It was written before the run reports existed. ${RUNS}
${r.task}
Edit the file in place. Do not delete true findings; correct what the runs contradict. Keep the evidence labels honest: VERIFIED only for what a run or
reading shows. Append "## Refresh log (${today})" listing every row or section you changed and the run that justified it.`,
  { label: `refresh:${r.file.replace('.md', '').toLowerCase()}`, phase: 'Refresh', schema: DOC_SCHEMA })))

// ---------------------------------------------------------------- Adversarial review of every synthesis, then a completeness critic

phase('Review')
const REVIEWED = [
  ...['REPOSITORY_INVENTORY.md', 'FEATURE_VERIFICATION.md', 'TECHNICAL_DEBT.md', 'SECURITY_BASELINE.md', 'PERFORMANCE_BASELINE.md', 'TEST_COVERAGE.md']
    .map(f => ({ path: `${out}/${f}`, kind: 'audit' })),
  ...['COMPETITOR_LANDSCAPE.md', 'USER_RESEARCH_PLAN.md', 'TECHNICAL_RESEARCH.md'].map(f => ({ path: `${res}/${f}`, kind: 'research' })),
]

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    claimsChecked: { type: 'number' },
    claimsWrong: { type: 'number' },
    corrections: { type: 'array', items: { type: 'string' } },
    stillUnverified: { type: 'array', items: { type: 'string' } },
  },
  required: ['file', 'claimsChecked', 'claimsWrong', 'corrections'],
}

const reviews = await parallel(REVIEWED.map(d => () => sonnet(`${d.kind === 'audit' ? RULES : RES_RULES}

You are the adversarial reviewer of ${d.path}. Find statements that are wrong, overclaimed, under-labelled or unsupported, and fix them in place.
Method: read the whole document; pick at least 15 statements labelled VERIFIED / TESTED / EXTERNAL (or stated as fact) that matter most to decisions,
spread across the document, and try to REFUTE each one: ${d.kind === 'audit'
    ? 'open the cited path and line, re-run the cited command (cheap commands only; do not rebuild or run the full suites), compare with the run reports in ' + out + '/runs/'
    : 'open the cited dossier and its fact-check log, and re-open the source URL with WebFetch for the most decision-relevant claims'}.
Also check: every number has a source or command; every path or link exists; labels are not inflated; nothing needs the orchestrator's conversation to
be understood; the document links to the files that back it. Correct wrong statements, downgrade labels, add missing evidence. Do not soften true
findings and do not delete findings you merely disagree with (add a counter-note). Append "## Review log (${today})": what you checked, what was wrong,
what you changed. Return the counts.`, { label: `review:${d.path.split('/').pop().replace('.md', '').toLowerCase()}`, phase: 'Review', schema: REVIEW_SCHEMA })))

const GAP_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    gaps: { type: 'array', items: { type: 'object', properties: {
      what: { type: 'string' }, targetFile: { type: 'string', description: 'absolute path of the one document that should change to close it' },
      severity: { type: 'string', enum: ['blocker', 'high', 'medium', 'low'] }, howToClose: { type: 'string' },
    }, required: ['what', 'targetFile', 'severity', 'howToClose'] } },
    contradictions: { type: 'array', items: { type: 'string' } },
  },
  required: ['file', 'gaps'],
}

const critic = await sonnet(`${RULES}

You are the completeness critic for the audit and research phases of the master plan. Read ${out}/*.md, ${out}/inventory/*.md, ${out}/runs/*.md and
${res}/*.md (skim the dossiers). Against BRIEF.md §4 (subsystem inventory fields; validation: npm ci, typecheck, lint, test, e2e, Solana tests, browser
incl. mobile, lesson completion, component interactions, simulation output, fault behaviour, code execution, save/share, with and without API keys; the
13 architecture-debt questions; the six audit deliverables), §5 (competitor coverage, the nine workflow tasks, differentiation) and §6 (segments, JTBD
fields, research plan), list what is MISSING or WEAK: a validation never run, a question answered without evidence, a required section absent, a
contradiction between two documents (e.g. two different counts for the same thing), a label that contradicts a run report. For each gap give what, the ONE
target document that must change to close it (absolute path), severity, and exactly how to close it (command or reading). Gaps that cannot be closed
without new resources (Docker for Timescale tests, a Solana toolchain, paid accounts, real users) are "low" with howToClose = "record as a known limit".
Write ${out}/REVIEW_GAPS.md and return it structured. Do not fix anything yourself.`, { label: 'critic', phase: 'Review', schema: GAP_SCHEMA })

// ---------------------------------------------------------------- Fix gaps: one fixer per target document, so no two agents edit one file

phase('Fix gaps')
const gaps = (critic?.gaps ?? []).filter(g => g.severity !== 'low')
const byFile = {}
for (const g of gaps) (byFile[g.targetFile] = byFile[g.targetFile] || []).push(g)
const lows = (critic?.gaps ?? []).filter(g => g.severity === 'low').length
log(`Critic: ${gaps.length} blocker/high/medium gaps across ${Object.keys(byFile).length} documents; ${lows} low gaps stay listed in REVIEW_GAPS.md`)

const fixes = await parallel(Object.entries(byFile).map(([file, list]) => () => sonnet(`${file.includes('02_RESEARCH') ? RES_RULES : RULES}

You close gaps the completeness critic found in ${file}. You are the only agent editing that file. The gaps:
${list.map((g, i) => `${i + 1}. [${g.severity}] ${g.what}\n   How to close: ${g.howToClose}`).join('\n')}
Close each one with real evidence (read the code, run cheap commands, read the run reports; never rebuild or rerun the full suites; for research files you
may use WebFetch). If a gap cannot be closed with what is available, say so in the document as a known limit with the reason. Edit ${file} in place and
append "## Gap fixes (${today})" listing each gap and what you did. Then mark each gap closed or "known limit" in ${out}/REVIEW_GAPS.md by appending one
line per gap under a heading "## Resolution (${file.split('/').pop()})" (append only; other fixers append to the same file, so re-read it right before
you write and never rewrite other sections).`, { label: `fix:${file.split('/').pop().replace('.md', '').toLowerCase()}`, phase: 'Fix gaps', schema: DOC_SCHEMA })))

// ---------------------------------------------------------------- Competitor matrix (BRIEF §5.3), with iynk in every comparison

phase('Matrix')
const matrix = await sonnet(`${RES_RULES}

Write ${res}/COMPETITOR_MATRIX.md, the evidence-backed comparison of BRIEF §5.3. Columns (dimensions): free usage; no-account entry; browser
compatibility; user-created projects; circuit editor; custom hardware models; firmware compatibility; MCU simulation fidelity; analog circuit fidelity;
failure modeling; debugging tools; robotics simulation; drone simulation; AI guidance; multilingual accessibility; real-time collaboration; curriculum
integration; community features; physical BOM generation; real component purchasing; export to real toolchains; plugin extensibility; pricing;
performance; target audience; strength of ecosystem; competitive moat. Rows: iynk first, then every product the dossiers rate high or medium threat
(at least Wokwi, Tinkercad Circuits, Arduino Cloud, MakeCode, SimulIDE, Falstad CircuitJS, Proteus, EasyEDA, Webots, Gazebo, The Construct, PX4/ArduPilot
SITL, Liftoff/Velocidrone, eCalc, Flux, Cirkit Designer, and any other the dossiers flag).
Each cell: a short value, a label, and a reference. For iynk, take cells ONLY from ${out}/FEATURE_VERIFICATION.md and ${out}/runs/BROWSER_WALK.md and
mark each VERIFIED (run or code reading), DOCUMENTED (marketing copy only) or CONTRADICTED. For competitors, TESTED (WORKFLOW_BENCHMARK) is kept separate
from EXTERNAL (their docs) and from marketing claims. Because 27 columns do not fit one table, split it into 4 thematic tables (access and price;
building and simulation; learning, AI and collaboration; physical build, extensibility and moat), each with iynk as the first row. End with
"Where iynk leads", "Where iynk trails", and "Parity that does not differentiate", each backed by the cells.`, { label: 'synth:matrix', phase: 'Matrix', schema: DOC_SCHEMA })

return {
  validation, research, refreshed, reviews,
  critic: { gaps: critic?.gaps?.length ?? 0, byFile: Object.fromEntries(Object.entries(byFile).map(([f, l]) => [f, l.length])), contradictions: critic?.contradictions },
  fixes, matrix,
}
