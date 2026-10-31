export const meta = {
  name: 'master-plan-audit',
  description: 'Phase 0 of the iynk master plan: forensic repository audit, command validation, browser walk, security/perf/test baselines, synthesis and adversarial review',
  phases: [
    { title: 'Inventory', detail: 'one reader per subsystem writes docs/MASTER_PLAN/01_AUDIT/inventory/<key>.md', model: 'sonnet' },
    { title: 'Validate', detail: 'typecheck, lint, vitest, build, e2e, browser walk, coverage, perf', model: 'sonnet' },
    { title: 'Synthesize', detail: 'the six 01_AUDIT documents from the inventories and the runs', model: 'sonnet' },
    { title: 'Review', detail: 'adversarial check of VERIFIED claims, then a completeness critic', model: 'sonnet' },
  ],
}

// Every subagent runs on Sonnet 5.5 (Amar, 2026-10-26); only the orchestrating session is Opus.
const sonnet = (prompt, opts = {}) => agent(prompt, { ...opts, model: 'sonnet' })

const repo = '/Users/amar/Codes/ak/simlab'
const commit = args?.commit ?? 'bb546d6a051f0b268576587c6f9f934dde9e766c'
const scratch = args?.scratch
const out = `${repo}/docs/MASTER_PLAN/01_AUDIT`

const RULES = `You are one agent in a council auditing the iynk repository (${repo}, git commit ${commit}, audited on 2026-10-26) for a master plan that
turns a HackTX 2026 hackathon prototype into a real product. Your findings feed engineers and a founder who will make decisions on them, so they must be
true, specific and reproducible.

Rules:
- Read the code. Never describe the system from README.md, docs/ or your memory of similar projects; quote file paths and line numbers.
- Change NOTHING in the repo except the output file(s) named in your task. No edits to source, tests, configs, package.json or lockfiles; no git commands
  that change state (status, log, diff, blame, show are fine); no npm install unless your task says so; no deploys; nothing touches production
  (https://iynk.tech, rt.iynk.tech, Vercel, Vultr, Solana devnet beyond read-only RPC). Do not start servers on port 3000 or 43117.
- Scratch files, scripts and screenshots go under ${scratch}/audit/<your label>/ and nowhere else. Run any Python with -I.
- .env.local holds real keys: never print, log, copy or quote a value, only whether a variable is set.
- Label every important statement: VERIFIED (you inspected the source or reproduced it), DOCUMENTED (a project doc says so, not tested),
  EXTERNAL (identified outside source), ESTIMATED (your calculation, assumptions stated), HYPOTHESIS (needs validation), UNKNOWN.
- Count things with commands (grep -c, find | wc -l, node -e), not by eye, and show the command next to the number.
- Write plainly: short sentences, no marketing, no hedging filler, no em dashes. A finding is "what, where (path:line), evidence, why it matters,
  severity (blocker/high/medium/low)". Prefer tables for inventories.
- Distinguish what works from what is merely present. "There is a file for X" is not "X works".
- Big files: read in chunks of at most 400 lines with sed -n; never assume one read showed a whole file. The tree is ~130k LOC of TypeScript plus
  ~190k lines of i18n JSON and 24k lines of figure JS; sample intelligently, say what you sampled and what you did not.
- Your final text is returned as data to the orchestrator. The human reads your markdown file, so make the file complete on its own.`

const INVENTORY_FORMAT = `Write the file in this shape (keep the headings exactly, so the synthesis agent can merge them):

# <Subsystem name>

**Paths:** ...   **Entry points:** ...   **LOC:** (command and number)   **Owner today:** (from docs/ARCHITECTURE.md §2 if listed)

## Purpose
## Dependencies (imports in, imports out; third-party packages)
## Public interfaces (exported functions/types/components/messages, with path:line)
## State ownership and persistence (stores, localStorage keys, server state, DB tables)
## Current functionality (what VERIFIED works, how you know)
## Known defects (with repro or evidence)
## Technical debt (table: item, path, evidence, severity, effort guess)
## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)
## Performance characteristics (measured if you can, else ESTIMATED/UNKNOWN)
## Security risks
## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)
## Required refactoring to get there
## Recommendation: preserve | extend | replace | deprecate | investigate (one line of reasoning)
## Open questions`

const INVENTORY_SCHEMA = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    file: { type: 'string' },
    loc: { type: 'number' },
    recommendation: { type: 'string', enum: ['preserve', 'extend', 'replace', 'deprecate', 'investigate'] },
    summary: { type: 'string', description: '3-6 sentences a CTO can act on' },
    keyFindings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          finding: { type: 'string' },
          evidence: { type: 'string', description: 'path:line or command + output' },
          label: { type: 'string', enum: ['VERIFIED', 'DOCUMENTED', 'EXTERNAL', 'ESTIMATED', 'HYPOTHESIS', 'UNKNOWN'] },
          severity: { type: 'string', enum: ['blocker', 'high', 'medium', 'low', 'info'] },
        },
        required: ['finding', 'evidence', 'label', 'severity'],
      },
    },
    debtItems: { type: 'array', items: { type: 'string' } },
    securityRisks: { type: 'array', items: { type: 'string' } },
    builderReusability: { type: 'string', description: 'can it serve user-created projects today? what blocks it?' },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['key', 'file', 'recommendation', 'summary', 'keyFindings', 'debtItems', 'securityRisks', 'builderReusability'],
}

const SUBSYSTEMS = [
  {
    key: 'content-schema',
    title: 'Content model: schema, ids, item modules, generated index',
    scope: `src/content/schema.ts, src/content/ids.ts, src/content/index.generated.ts, scripts/gen-content-index.mjs, every module under
src/content/boards, src/content/robotics, src/content/drones (79 files, ~31k LOC: read schema.ts and ids.ts fully, then at least one board, one bench and one
drone module fully and skim the rest), the content .test.ts files, and how src/i18n/content/<lang>/<lab>/<id>.json prose keys bind to it (src/i18n/server.ts).
Questions you must answer with evidence: Is content declarative data or does it embed behaviour (functions, closures)? Are lessons, checks, faults and steps
reusable for a project a user invents, or bound to catalogue ids? What is a "check" and a "fault" structurally? What would a user-authored project need
from this schema? Count items, lessons, bench tasks, failures, faults, assembly steps and checks with commands (README claims 38 items, 71 board lessons,
31 bench tasks, 144 board failures, 106 bench faults, 272 assembly steps).`,
  },
  {
    key: 'interp',
    title: 'Interpreters and virtual hardware runtime (src/lib/interp)',
    scope: `src/lib/interp/** (36 files, ~13.5k LOC). Read the entry points (index, runHeadless, evaluateChecks, the virtual clock, device models,
checks.ts) fully and each language front-end (arduino-cpp, micropython, python, verilog) at least in its structure and main loop. Answer with evidence:
How is each language implemented (tokenizer/parser/tree-walker? transpile to JS? which subset)? What Arduino/MicroPython/gpiozero/rclpy APIs exist and
which are stubs? How is time modelled (virtual clock, delay, millis, interrupts, PWM, timers)? What peripherals/protocols exist (I2C, SPI, UART, Wi-Fi,
HTTP)? Is execution deterministic and reproducible (seeds, ordering, Date.now/Math.random use)? How are infinite loops and budgets handled (20 s
CHECK_BUDGET_MS, Web Worker)? Can an arbitrary user sketch with arbitrary pins/devices run, or does the runtime need a catalogue DeviceModel? Is the
"Verilog" execution anything like synthesis/simulation semantics? Compare honestly against a real toolchain (avr-gcc + simavr/Wokwi-style AVR
emulation). Micro-benchmark: time runHeadless on two or three lesson reference programs with node/vitest and report ms.`,
  },
  {
    key: 'figure-engine',
    title: 'Figure engines, circuit solver, embed protocol, vendor core',
    scope: `figures/engine/** (bench.js, bench-bb.js, bench-kinds.js, bench-props.js, bench-solve.js and its tests, drone*.js, sheets.js, embed.js,
testkit.mjs, probe.mjs), figures/vendor/colorfigures/** (LICENSE, PATCHES.md, the core's size and API), figures/tools/cfbuild.py and cfshoot.py,
docs/FIGURES.md, docs/FIGURES-BENCH.md, docs/FIGURES-DRONE.md, and src/components/figure/** (FigureFrame, the iframe message protocol). The circuit
solver (bench-solve.js) is the heart of this task: document exactly what it solves (DC only? nodal analysis? resistive network + ideal sources + LED/diode
models? how are transistors, motors, capacitors, regulators, brownouts and "damage" modelled?), the numerical method, convergence, what is a lookup/rule
versus a physical computation, and the fault thresholds' provenance (datasheet numbers in docs/facts? constants?). Is the solver independent of the
drawings (is a wire a modelled net, or a picture)? Can it take an arbitrary netlist from outside a figure file? Note the build pipeline (Python ->
public/figures/<kind>/<id>.html, sizes of built HTML), the iframe sandboxing and CSP, and licensing constraints of the vendor core.`,
  },
  {
    key: 'figure-items',
    title: 'Figure item slices: boards, parts, modules, robotics, drones; coupling to lessons',
    scope: `figures/boards/**, figures/parts/**, figures/modules/**, figures/robotics/**, figures/drones/**, figures/prompts/**, figures/_smoke, figures/flight
(only its relation to items), public/figures/** (built output: count and sizes), src/i18n/figures/<lang>.json (figure strings), scripts/figure-strings.mjs,
figure-langs.mjs, figure-thumbs.mjs. Read two or three item slices fully (e.g. figures/boards/uno-r3.js, one robotics bench, one drone). Answer: how is a
board/part geometrically and electrically described? Are pins, nets and components data the engine reads, or hand-placed drawing code? Are lesson ids,
fault ids or step ids hardcoded inside figure files (grep for lesson/fault/step ids from src/content)? Could a new user-defined component be rendered
without a hand-drawn slice? What is reusable (a parts library?) and what is per-item art? How long does a figure build take and what tools must be
installed (Python version, deps)?`,
  },
  {
    key: 'boardlab-robotics-ui',
    title: 'Board Lab and Robotics Lab: stores, pages, components, dock, code panel, checks UI',
    scope: `src/lib/boardlab/**, src/lib/robotics/**, src/components/boardlab/**, src/components/robotics/**, src/components/dock/**,
src/app/[lang]/boards/**, src/app/[lang]/robotics/**, and how they call src/lib/interp and src/components/figure. Answer: how is UI state owned
(store shape, dispatch(action), D14b)? Is simulation logic coupled to React components or cleanly behind the store? How does a lesson run (Run button ->
worker -> trace -> checks -> figure 'set' messages)? How are faults ("break it") triggered and displayed? What persistence exists (localStorage keys for
code, progress: src/lib/progress)? Is the code editor (CodeMirror) set up for one file only? Could the same store drive a user-defined project with
arbitrary parts, or does it assume a catalogue item id everywhere (show the places)? Mobile layout handling. Count components and note duplication
between the two labs.`,
  },
  {
    key: 'drone-calc-lab',
    title: 'Drone Lab: calculator, design/pick model, store, CLI emulator, assembly, safety tests, BOM',
    scope: `src/lib/drone/** (calc.ts and fixtures, ~10k LOC: read calc.ts fully, sample fixtures), src/lib/dronelab/**, src/components/dronelab/**,
src/app/[lang]/drones/[drone]/page.tsx and drones/page.tsx, src/lib/drone/cli.ts (Betaflight CLI emulator), docs/facts/<drone>.md for provenance,
docs/research/drone-lab-b-calc-matrix.md. Answer: what does the calculator compute (thrust-to-weight, hover throttle, current, flight time, ...) and from
which formulas/constants; where do motor/prop/battery data come from and are they manufacturer data (sourced) or invented; what does the 445-case
calculator test actually compare against (hand-computed expectations from the same formulas, or external reference data); how do assembly steps and
safety checks work; what does the CLI emulate; how the budget optimiser (src/lib/hw?) reuses the calc. Can a user define a drone from parts not in the
catalogue?`,
  },
  {
    key: 'flight',
    title: 'Flight simulator: dynamics, registry, courses, range figure, fly page, replay',
    scope: `src/lib/flight/** (19 files), src/components/flight/**, figures/flight/**, public/figures/flight/range.html, src/app/[lang]/drones/[drone]/fly,
src/i18n/messages/en/flight.json (keys only). Answer: what is the flight model (6-DoF rigid body? simplified point-mass with attitude? integration method
and step; motor/prop thrust model; drag; battery sag; wind; sensor noise; controller: rate/angle PID, acro)? Is it deterministic (fixed step, seeded, no
wall-clock in physics)? Is replay a real re-simulation or a recorded log? How are faults (reversed FC, swapped props, reversed servo) modelled? How is
rendering done (2D canvas? isometric SVG? WebGL?) and what is the frame budget? Can it fly a craft defined outside the registry/content? Compare honestly
against PX4/ArduPilot SITL style fidelity: name what is missing.`,
  },
  {
    key: 'realtime',
    title: 'Realtime rooms: relay server, client, protocol, together pages, deployment',
    scope: `server/realtime/** (server.js, src/*.js, tests, package.json, Dockerfile if any), deploy/**, scripts/realtime-deploy.sh,
scripts/realtime-vultr-create.sh, src/lib/realtime/**, src/components/realtime/**, src/app/[lang]/together/**, docs/hacktx/REALTIME.md. Answer: the
message protocol (schemas, versioning), ordering model (globally ordered ops? host authority?), what state is shared (store actions? snapshots?),
reconnection and snapshot semantics, authentication (none? room code entropy?), limits (bucket.js, limits tests), room expiry, how many participants, the
tabs fallback (BroadcastChannel?), what happens on conflicting actions, whether arbitrary documents (a user project) could be synced or only lesson
store actions. Load test file: what does it show? Deployment: Docker + Caddy on a 1 vCPU Vultr VM; single point of failure; no persistence?`,
  },
  {
    key: 'ai-search-mcp',
    title: 'AI partner, tool calling, translation, voice, stories, search/pricing/BOM, MCP server, OpenAPI',
    scope: `src/lib/ai/**, src/components/ai/**, src/app/api/ai/**, src/lib/search/**, src/components/search/**, src/app/api/search/**, src/lib/hw/**,
src/components/hw/** (BOM, prices, budget optimiser), src/app/api/mcp/**, src/app/api/openapi.json, docs/hacktx/AI.md, docs/hacktx/MUSE-CONNECTOR.md,
scripts/smoke-ai.mjs, scripts/smoke-search.mjs. Answer: which providers/models (Meta Muse Spark, Gemini fallback), how the system prompt is built, what
project context the model receives (the bench state? code? trace? how serialised, how many tokens), which tools exist and what they can mutate (can the
model change circuit state or code? is there any proposal/preview step?), prompt-injection exposure (user code, chat, room names, search results fed to
the model), caching, rate limits and budgets (SERPAPI_MONTHLY_BUDGET), cost per call ESTIMATED from token counts, how pricing results are parsed and how
reliable, MCP tools list and auth. Do not call paid APIs more than a couple of times; the smoke scripts may be run once each if keys are set, note cost.`,
  },
  {
    key: 'server-data',
    title: 'Server libs, API routes, database, telemetry, leaderboard, buddies, progress, settings',
    scope: `src/lib/server/** (78 files, ~8.2k LOC: list them all, read the shared ones fully: rate limiting, env, db client, validation), db/migrations/*.sql,
scripts/db-migrate.mjs, src/app/api/telemetry, leaderboard, buddies, live, status routes and their tests, src/lib/telemetry/**, src/lib/progress/**,
src/lib/settings/**, docs/hacktx/DATA.md. Answer: the DB schema (events hypertable, aggregates, profiles: columns, indexes, retention), what is written
and read, PII (names, locations in buddies?), rate limiting implementation (in-memory per serverless instance? effective?), input validation (zod?),
error handling, idempotency, what breaks without DATABASE_URL, whether any user project/persistence layer exists (none expected: say so), localStorage
schema versions (D7), telemetry opt-out, and how a future project store would fit.`,
  },
  {
    key: 'solana',
    title: 'Solana Proof of Build: Anchor program, server attest flow, wallet UI, verify page',
    scope: `solana/programs/iynk_passport/src/**, solana/tests/**, solana/scripts/**, solana/Anchor.toml, src/lib/solana/**, src/components/solana/**,
src/app/api/solana/**, src/app/[lang]/passport, src/app/[lang]/verify, docs/hacktx/SOLANA.md. Answer: what the program stores (accounts, PDAs, sizes,
rent), who can issue (issuer key on the server: custody risk), the faucet route (abuse surface), how "the server re-runs your exact run" works (replay of
a trace? deterministic?), bounty flow, devnet-only assumptions, cost per credential, what a real deployment would need (mainnet fees, key management,
legal), dependency weight in the bundle (@solana/web3.js, wallet adapters: KB), and an honest view of whether this is core or detachable.`,
  },
  {
    key: 'shell-i18n',
    title: 'App shell, routing, i18n, design system, catalogue pages, sound, settings, SEO',
    scope: `src/app/[lang]/layout.tsx, page.tsx, about, [...rest], not-found, src/components/shell/**, ui/**, catalogue/**, marketing/**, editorial/**,
data/**, settings/**, src/lib/sound/**, src/i18n/*.ts(x) and config, src/i18n/messages/<lang>/*.json (count keys per namespace per language with a node
one-liner and report any language missing keys), src/i18n/content coverage per language (files per lang), next.config.ts, src/app/globals.css, the theme
boot script (light default). Answer: routing model (static params per lang x item; how many pages), caching (cacheComponents), accessibility basics
(landmarks, focus, reduced motion, colour), RTL readiness, bundle composition (which heavy deps load on the landing page), design tokens, how
complete the six languages are (VERIFIED by counts), and what the shell assumes about a page being a catalogue item.`,
  },
  {
    key: 'tooling-tests-e2e',
    title: 'Tooling, test infrastructure, e2e suite, scripts, build/deploy config, CI absence',
    scope: `package.json, tsconfig.json, eslint.config.mjs, vitest.config.mts, vitest.setup.ts, playwright.config.ts, next.config.ts, .vercelignore,
.nvmrc, e2e/** (13 specs: read them all), scripts/*.mjs (crawl-routes, figure-*, gen-content-index, smoke-*), src/lib/verify/**, deploy/**, .github
(absent? confirm), Vercel settings in .vercel (do not print ids beyond project name). Answer: what each test layer really asserts (a taxonomy: content
self-consistency, interpreter semantics, figure DOM behaviour, API route contracts, e2e flows, axe), total test file and case counts by command, how long
the suites take (from docs/verify, or ask the Validate agent's numbers: you may just record "see FEATURE_VERIFICATION"), flakiness risks (real-frame
animation in jsdom, 60 s timeouts), what is NOT tested (list), no CI pipeline consequences, dependency pinning and known vulnerable/outdated packages
(npm outdated / npm audit --omit=dev, read-only), Node 24 requirement.`,
  },
  {
    key: 'docs-claims-history',
    title: 'Documentation, decisions, git history, and the complete list of product claims to verify',
    scope: `README.md, docs/ARCHITECTURE.md, docs/DECISIONS.md, docs/SPEC.md, docs/hacktx/BASE_ARCHITECTURE.md, STRATEGY.md, PITCH.md, JUDGE-QA.md,
DEVPOST-STORY.md, DEVPOST-WRITEUP.md, docs/audit/*.md, docs/verify/gate3.md and fresh-eyes.md, docs/research/current-iynk-audit.md, docs/facts/* (how
facts are sourced: count sheets, check 3 citations), docs/handoff/CONTEXT.md (the users' own requests and decisions: summarise the founder's stated
intent), git log (792 commits over ~2 days: commits per hour chart, authors, the hackathon window rule, the 245763f baseline), docs/requests (what
unresolved requests remain: grep for open items). Deliverable 1: ${out}/inventory/docs-claims-history.md in the inventory format but with these extra
sections: "## Claim register" (a numbered table of EVERY user-facing capability claim and number from README, landing copy
(src/i18n/messages/en/shell.json / marketing), PITCH and DEVPOST, with the exact wording and where it is written; the synthesis agent will fill in
verification status) and "## Founder intent" and "## Unfinished work and open requests". Deliverable 2: ${out}/CLAIMS.json, a JSON array of
{id, claim, source, kind: "feature"|"count"|"quality"|"integration"} for the register.`,
  },
]

const VALIDATE_RULES = `${RULES}

You are the only agent allowed to build and run suites. Run them SEQUENTIALLY so timings are honest; other agents are reading files concurrently, so note
the machine was shared (14 cores, 48 GB). Node must be 24 (.nvmrc; check node -v). Record exact commands, exit codes, durations (use /usr/bin/time -p or
date before/after), counts of passed/failed/skipped, and the first lines of any failure. Keep full logs under ${scratch}/audit/validate/.`

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    distDir: { type: 'string' },
    buildOk: { type: 'boolean' },
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          exitCode: { type: 'number' },
          durationS: { type: 'number' },
          summary: { type: 'string' },
        },
        required: ['command', 'exitCode', 'summary'],
      },
    },
    pageCount: { type: 'number' },
    notes: { type: 'string' },
  },
  required: ['file', 'distDir', 'buildOk', 'results'],
}

const DOC_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    summary: { type: 'string' },
    topFindings: { type: 'array', items: { type: 'string' } },
    blockers: { type: 'array', items: { type: 'string' } },
    unverified: { type: 'array', items: { type: 'string' }, description: 'things you wanted to check but could not, and why' },
  },
  required: ['file', 'summary', 'topFindings'],
}

// ---------------------------------------------------------------- Inventory + Validate run side by side

phase('Inventory')
log(`Auditing ${commit.slice(0, 7)}: ${SUBSYSTEMS.length} subsystem readers, one validation chain, security baseline`)

const inventoryRun = () => parallel(SUBSYSTEMS.map(s => () =>
  sonnet(`${RULES}

Your subsystem: ${s.title}
Scope: ${s.scope}

Write ${out}/inventory/${s.key}.md. ${INVENTORY_FORMAT}

Return the structured summary. Set key="${s.key}" and file to the path you wrote.`,
    { label: `inv:${s.key}`, phase: 'Inventory', schema: INVENTORY_SCHEMA })))

const securityRun = () => sonnet(`${RULES}

Task: SECURITY BASELINE. Write ${out}/SECURITY_BASELINE.md.
Inspect: every route under src/app/api/** (auth? rate limits? input validation? what each can cost or leak), src/lib/server/** (env handling, the
Solana issuer keypair custody, SerpApi budget), the realtime relay (server/realtime: origin checks, auth, message size/rate limits, room code entropy,
host takeover), the interpreters (src/lib/interp: is user code ever eval'd or Function()'d? Worker isolation? memory/time limits?), the figures
(same-origin iframes: CSP frame-ancestors, postMessage origin checks in src/components/figure and figures/engine/embed.js, do figure HTML files run
arbitrary code from content?), the MCP server and OpenAPI (unauthenticated tools that call paid APIs or create rooms?), the Solana faucet and attest
routes (abuse, replay), the AI routes (prompt injection paths: user code, chat, room names, search results; can tools mutate anything?), client
storage (what localStorage holds; any PII), third-party scripts and tracking (grep for script tags, analytics), dependency risk (npm audit --omit=dev,
read-only; list findings by severity), secrets handling (.gitignore, .vercelignore, any key ever committed: git log -p -S for key-looking strings is
allowed but NEVER print a value; report only "a key-shaped string appears in commit X at path Y" if found), CORS and headers, child-safety relevant
surfaces (public rooms, chat, buddies profiles with free-text and location, stories, leaderboard names).
Format: a threat table (asset, threat, entry point path, current control, gap, severity, evidence label), then "Release blockers for a real product",
then "Quick wins", then "Needs design (see 05_ENGINEERING/SECURITY_THREAT_MODEL)". Every row cites a path.`,
  { label: 'security-baseline', phase: 'Inventory', schema: DOC_SCHEMA })

const validateRun = () => pipeline(['validate'],
  () => sonnet(`${VALIDATE_RULES}

Task: run the documented commands and record a baseline in ${out}/runs/COMMANDS.md (create the directory).
1. node -v, npm -v, git rev-parse HEAD, git status --short (must be clean apart from docs/MASTER_PLAN and scripts/workflows).
2. Do NOT run npm ci (node_modules exists and reinstalling would hit the network and disturb other agents); instead run npm ls --depth=0 2>&1 | tail -5 to
   confirm the tree resolves, and note that npm ci was not run and why.
3. npm run content:check
4. npm run typecheck
5. npm run lint
6. npm test (vitest, full; expect ~2800 tests and several minutes). Record passed/failed/skipped and the names of any failed or skipped tests with the
   reason (skips are usually "no database"/"no Docker").
7. NEXT_DIST_DIR=.next-audit npm run build  (production build with typecheck; capture the route table: count of static pages, and the First Load JS
   sizes per route from the build output; save the full output to the scratch log and put the route table in ${out}/runs/BUILD_OUTPUT.md).
   After the build: git diff --stat tsconfig.json; if next build added a ".next-audit" include line, run git checkout -- tsconfig.json so the repo stays
   clean, and say so. Do NOT delete .next-audit: three later agents serve it.
8. cd server/realtime && npm test (its own suite; if node_modules is missing there, run npm ci inside server/realtime only, note it).
9. cd solana && (cargo --version; anchor --version) 2>&1: report whether the Rust/Anchor toolchain exists. Do NOT run anchor test unless both exist and a
   local validator can start within 2 minutes; if you run it, cap at 10 minutes.
Write COMMANDS.md with a results table and the failure excerpts. Return the structured result; distDir=".next-audit".`,
    { label: 'validate:commands', phase: 'Validate', schema: BUILD_SCHEMA }),
  (build) => parallel([
    () => sonnet(`${VALIDATE_RULES}

A production build exists in ${repo}/${build?.distDir ?? '.next-audit'} (buildOk=${build?.buildOk}). If it does not exist or buildOk is false, build it first with
NEXT_DIST_DIR=.next-audit npm run build and record that.
Task: run the Playwright e2e suite against that build without rebuilding and record the baseline in ${out}/runs/E2E.md.
Command: E2E_SKIP_BUILD=1 NEXT_DIST_DIR=.next-audit npm run e2e   (Playwright picks a random port 40000-49999 and starts next start itself).
Record passed/failed/skipped per project (chromium, phone), durations, the name and first error lines of every failure. .env.local has real keys, so the
handful of tests written for a keyless deployment fail by design: identify exactly which (read the spec to confirm the assertion) and label them
"fails by design with keys" rather than hiding them. Then run ONLY those specs again with the key variables emptied for the server process
(for example: META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= DATABASE_URL= E2E_SKIP_BUILD=1 NEXT_DIST_DIR=.next-audit npx playwright test <spec> ; check
whether next start lets an empty env var override .env.local, and say what you observed). Return the structured result (file=E2E.md).`,
      { label: 'validate:e2e', phase: 'Validate', schema: BUILD_SCHEMA }),

    () => sonnet(`${VALIDATE_RULES}

A production build exists in ${repo}/${build?.distDir ?? '.next-audit'}. Start it yourself: NEXT_DIST_DIR=.next-audit npx next start --port 47311 (background,
log to scratch; kill it when done; never port 3000). Load Playwright from the repo in an .mjs under ${scratch}/audit/browser-walk/:
import { createRequire } from "node:module"; const { chromium, devices } = createRequire("${repo}/package.json")("playwright").
Task: BROWSER WALK of the actual product as a careful new user, desktop (1440x900) and phone (Pixel 7 emulation), and write ${out}/runs/BROWSER_WALK.md
with screenshots saved to scratch (reference their paths). Capture console errors and failed network requests on every page. For each step record:
what you did, what happened, time to interactive (performance.timing or PerformanceNavigationTiming), pass/fail/partial, and the evidence.
Steps:
 1. / with no cookie: language redirect; landing page content; the live Uno figure; theme default (light).
 2. /en/boards: catalogue; open /en/boards/uno-r3 then its first lesson (blink). Press Run with the starter code; wait for checks; read the serial
    monitor and the figure's LED state. Then paste the reference solution if the UI exposes one, or edit the code so the checks pass; confirm the pass state.
 3. In that lesson, trigger a "break it" failure (the UI's own control); record the explanation shown and whether the figure shows damage.
 4. Edit the code to something the interpreter may not support (a class with a template, pointer arithmetic, a String method, an unknown library
    include) and record the error message quality.
 5. An infinite loop without delay(): does the UI stay responsive, and what does it report?
 6. /en/robotics: open the L298N driver bench (or the first bench); walk the assembly steps; run the task; trigger a fault.
 7. /en/drones/quad5: calculator tiles; change a part (battery) and watch results; run bench safety checks; open "Build it for real" (live prices, may
    take a while; note the cost of a SerpApi call; do this once only).
 8. /en/drones/quad5/fly: fly for 20-30 s with keyboard; crash; replay; check framerate (requestAnimationFrame count over 5 s) on desktop.
 9. Lab tools -> Together: start a room; open the room link in a SECOND browser context (another profile); do an action in each and confirm sync.
10. Lab tools -> Partner: ask one question about the current lesson (one AI call only); record whether it references the actual bench state.
11. Switch language to es and hi on a lesson page: is everything translated, including figure labels? Note any English fallback.
12. /en/together, /en/passport (do not connect a wallet), /en/verify, /en/about: load and note what they do with no wallet.
13. Phone: steps 1, 2, 6, 8 again at Pixel 7 size; note overflow, unreachable controls, touch sticks.
14. Save/share: is there any way to save user work beyond localStorage? Is there a share link for a lesson/room? Reload the lesson: is code kept?
15. Try to do something the catalogue does not offer: add a part that is not in the lesson, wire a different pin, start a blank project. Record exactly
    what is and is not possible: this is the key finding for the master plan.
Return the structured result (file=BROWSER_WALK.md, buildOk=true if the server started).`,
      { label: 'validate:browser-walk', phase: 'Validate', schema: BUILD_SCHEMA }),

    () => sonnet(`${VALIDATE_RULES}

Task: PERFORMANCE BASELINE. Write ${out}/PERFORMANCE_BASELINE.md. A production build exists in ${repo}/${build?.distDir ?? '.next-audit'}.
1. Bundle: from .next-audit (or by re-reading the build output in ${out}/runs/BUILD_OUTPUT.md if written), the First Load JS per route group, the
   largest chunks (ls -S .next-audit/static/chunks | head), and which dependencies dominate (grep chunk names / use source-map-free heuristics: search
   chunks for "solana", "codemirror", "anchor"). Report KB gzipped if you can (gzip -c | wc -c).
2. Figures: sizes of public/figures/**/*.html (total, largest, median) and the vendor core size; time to load one figure iframe in Playwright (start your
   own server: NEXT_DIST_DIR=.next-audit npx next start --port 47322, kill it after; never port 3000).
3. Interpreter: write a node/vitest micro-benchmark in scratch that imports src/lib/interp's headless runner (find the export) and times a Blink-style
   sketch for 5 s of virtual time, a MicroPython loop, and a Python/rclpy sample; report wall ms per virtual second and whether the runtime is
   proportional to virtual time or to instruction count.
4. Circuit solver: time figures/engine/bench-solve.js on the largest bench circuit in the repo (use its tests as a template), ms per solve.
5. Flight: estimate the physics step cost from the code (ESTIMATED) and measure rAF rate on the fly page in headless Chromium for 5 s (note headless
   GPU caveats).
6. Pages: Playwright navigation timings (DOMContentLoaded, load, LCP via PerformanceObserver) for landing, a lesson, a bench, a drone page, fly page; 3
   runs each, median, desktop, with and without CPU throttling 4x (CDP Emulation.setCPUThrottlingRate) to approximate a cheap laptop.
7. Memory: JS heap after 60 s of running a lesson (CDP Performance.getMetrics) to spot leaks.
Say clearly which numbers were measured on a shared machine and which are estimates. End with "Targets to set later" (do not invent targets).`,
      { label: 'validate:perf', phase: 'Validate', schema: DOC_SCHEMA }),

    () => sonnet(`${VALIDATE_RULES}

Task: TEST COVERAGE. Write ${out}/TEST_COVERAGE.md.
1. Try line coverage: npm install --no-save @vitest/coverage-v8@$(node -p "require('./node_modules/vitest/package.json').version") (no-save keeps
   package.json and the lockfile unchanged: confirm with git status afterwards; if npm still modified package-lock.json, run git checkout -- package-lock.json
   and say so), then npx vitest run --coverage --coverage.provider=v8 --coverage.reporter=text-summary --coverage.reporter=json-summary
   --coverage.reportsDirectory=${scratch}/audit/coverage. If the install or run fails, record why and fall back to a file-level map (which src files
   have a sibling .test file: find | compare).
2. Taxonomy, by reading: for each test group (src/content/*/*.test.ts, src/lib/interp, figures/engine/*.test.mjs, src/lib/drone/calc tests,
   src/lib/flight, src/lib/realtime, server/realtime/test, src/app/api/**/route.test.ts, e2e/*.spec.ts, solana/tests) answer: what oracle does it use?
   (a) external reference data (datasheet values, measured hardware, a third-party simulator), (b) hand-derived expected values from first principles,
   (c) the implementation's own formulas re-run (tautological), (d) behavioural contract (an action produces a state), (e) smoke (does not throw).
   Give the count of tests per oracle class per group, with examples (path:line). This answers whether tests validate real hardware behaviour.
3. Gaps: list what has no test at all (components, routes, stores, the AI tool loop, the relay client reconnection, migrations, ...).
4. Flakiness: timeouts, real-time animation in jsdom, network-dependent tests, randomness.
5. What a production test strategy must add (bullet list, hand-off to 05_ENGINEERING/TEST_STRATEGY).`,
      { label: 'validate:coverage', phase: 'Validate', schema: DOC_SCHEMA }),
  ]).then(results => ({ build, after: results })),
)

const [inventories, security, validation] = await parallel([inventoryRun, securityRun, validateRun])
const inv = (inventories ?? []).filter(Boolean)
log(`Inventory: ${inv.length}/${SUBSYSTEMS.length} subsystems written; validation chain ${validation ? 'done' : 'FAILED'}`)

// ---------------------------------------------------------------- Synthesis

phase('Synthesize')

const invIndex = inv.map(r => `- ${r.key}: ${r.file} (${r.recommendation}) ${r.summary}`).join('\n')
const findingsDump = inv.flatMap(r => r.keyFindings.map(f => `[${r.key}] (${f.label}, ${f.severity}) ${f.finding} :: ${f.evidence}`)).join('\n')
const debtDump = inv.flatMap(r => r.debtItems.map(d => `[${r.key}] ${d}`)).join('\n')
const builderDump = inv.map(r => `[${r.key}] ${r.builderReusability}`).join('\n')
const runsSummary = JSON.stringify({ build: validation?.build, after: validation?.after }, null, 1).slice(0, 12000)

const SYNTH_RULES = `${RULES}

You are a synthesis agent. The inventory files and run reports already exist; read them (they are the primary evidence) and go back to the code when
they disagree or leave a gap. Do not weaken labels: a claim is VERIFIED only if an inventory or run says it was inspected or reproduced. Keep the
per-subsystem files as they are; link to them.

Inventory files:
${invIndex}

Run reports: ${out}/runs/COMMANDS.md, BUILD_OUTPUT.md, E2E.md, BROWSER_WALK.md; baselines: ${out}/SECURITY_BASELINE.md, PERFORMANCE_BASELINE.md, TEST_COVERAGE.md.
Run summary (structured): ${runsSummary}`

const synth = await parallel([
  () => sonnet(`${SYNTH_RULES}

Write ${out}/REPOSITORY_INVENTORY.md: the complete subsystem inventory for the master plan.
Sections: 1. Baseline (commit, date, LOC by directory with the commands, dependency list with versions, Node version, deploy targets). 2. System map
(a Mermaid diagram of the real module dependencies as the inventories found them, not the README's). 3. Subsystem table (one row each: paths, purpose,
LOC, state/persistence, tests, recommendation, link to inventory file). 4. Per-subsystem digest (10-20 lines each, the key findings with labels and
path:line, taken from the inventory files; do not re-derive). 5. Cross-cutting observations (what is shared between labs, what is duplicated, where
simulation is coupled to UI, where content is coupled to figures). 6. Recommendations table (preserve/extend/replace/deprecate/investigate with the one-line
reason). Keep it navigable: an engineer must find any subsystem in under a minute.

Key findings from the inventories:
${findingsDump}`,
    { label: 'synth:inventory', phase: 'Synthesize', schema: DOC_SCHEMA }),

  () => sonnet(`${SYNTH_RULES}

Write ${out}/FEATURE_VERIFICATION.md: every product claim with its verification status.
Input: ${out}/CLAIMS.json and the "Claim register" in ${out}/inventory/docs-claims-history.md; the run reports (COMMANDS, E2E, BROWSER_WALK); the
inventories' counts. For every claim: id, exact wording, source, status (VERIFIED by run/inspection | VERIFIED-PARTIAL with what part | DOCUMENTED only |
CONTRADICTED with evidence | UNKNOWN), evidence (path:line, command + number, or BROWSER_WALK step), and a one-line honest restatement a product page
could use without overclaiming (e.g. "an Arduino C++ subset interpreter" rather than "real code, really run"). Re-count every number claim yourself with
a command if the inventories did not (38 items, 71 lessons, 31 tasks, 144 failures, 106 faults, 272 steps, ~2800 tests, six languages complete, up to
eight in a room, etc.). Then sections: "What works end to end", "What is fragile", "What is missing for the stated mission (original projects, custom
components, persistence, accounts, educator tools, export to real toolchains)", "Honesty fixes recommended for README/landing copy".`,
    { label: 'synth:features', phase: 'Synthesize', schema: DOC_SCHEMA }),

  () => sonnet(`${SYNTH_RULES}

Write ${out}/TECHNICAL_DEBT.md.
Part A: the 13 architecture-debt questions from the master-plan brief, each answered with a verdict (yes/no/partly), evidence (path:line from the
inventories or your own reading) and what it would take to change:
 1 Do the labs share reusable data models? 2 Is simulation logic coupled to UI components? 3 Are figure assets coupled to specific lesson IDs?
 4 Can the coding environments support original projects? 5 Is circuit connectivity modelled independently from diagrams? 6 Do simulations expose stable
 APIs? 7 Do rooms support arbitrary project editing? 8 Is content declarative or hardcoded? 9 Do all supported languages have complete translations?
 10 Can AI responses safely trigger changes to a circuit? 11 Can project persistence support user-created content? 12 Is deterministic replay truly
 reproducible? 13 Do unit tests validate real hardware behaviour or internal expectations?
Part B: the debt register: a table of every debt item from the inventories (dedupe), with path, evidence, severity, estimated effort (S/M/L/XL with
your assumption), and which future capability it blocks (original-project builder, custom components, collaboration on projects, AI editing, fidelity,
accounts/persistence, educator tools). Part C: "Debt we should NOT pay" (things fine for the product as it will be). Part D: the five structural
changes with the best leverage, each in one paragraph with the evidence.

Debt items from the inventories:
${debtDump}

Builder reusability verdicts from the inventories:
${builderDump}`,
    { label: 'synth:debt', phase: 'Synthesize', schema: DOC_SCHEMA }),
])

// ---------------------------------------------------------------- Review

phase('Review')
const DOCS = [
  'REPOSITORY_INVENTORY.md', 'FEATURE_VERIFICATION.md', 'TECHNICAL_DEBT.md',
  'SECURITY_BASELINE.md', 'PERFORMANCE_BASELINE.md', 'TEST_COVERAGE.md',
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

const reviews = await parallel(DOCS.map(d => () => sonnet(`${RULES}

You are the adversarial reviewer of ${out}/${d}. Your job is to find statements in it that are wrong, overclaimed, under-labelled or unsupported, and
fix them in place. Method: read the whole document; pick at least 15 statements labelled VERIFIED (or stated as fact) that matter most to decisions,
spread across the document, and try to REFUTE each one against the repository (open the cited path and line, re-run the cited command). Also check:
every number has a command; every path exists (ls); labels are not inflated; no finding is a README restatement; the document links to the inventory
files or run reports that back it; nothing in it needs the orchestrator's conversation to be understood. Edit the document directly: correct wrong
statements, downgrade labels, add missing evidence, and append a short "## Review log (2026-10-26)" section listing what you checked, what was wrong
and what you changed. Do not soften true findings; do not delete findings you merely disagree with (add a counter-note instead). Return the counts.`,
  { label: `review:${d.replace('.md', '').toLowerCase()}`, phase: 'Review', schema: REVIEW_SCHEMA })))

const critic = await sonnet(`${RULES}

You are the completeness critic for Phase 0 (the audit) of the master plan. Read ${out}/*.md and ${out}/inventory/*.md and ${out}/runs/*.md. Against
section 4 of the brief (subsystem inventory fields; the validation list: npm ci, typecheck, lint, test, e2e, Solana tests, browser incl. mobile, lesson
completion, component interactions, simulation output, fault behaviour, code execution, save/share, with and without API keys; the 13 architecture-debt
questions; the six required deliverables), list what is MISSING or WEAK: a subsystem with no inventory, a validation never run, a question answered
without evidence, a deliverable section absent, a contradiction between two documents (e.g. two different counts for the same thing), a label that
contradicts a run report. For each gap give: what, where, why it matters, and the exact command or reading an agent should do to close it. Write the
list to ${out}/REVIEW_GAPS.md and return it as structured data. Do not fix anything yourself.`,
  { label: 'critic', phase: 'Review', schema: {
    type: 'object',
    properties: {
      file: { type: 'string' },
      gaps: { type: 'array', items: { type: 'object', properties: {
        what: { type: 'string' }, where: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'high', 'medium', 'low'] }, howToClose: { type: 'string' },
      }, required: ['what', 'where', 'severity', 'howToClose'] } },
      contradictions: { type: 'array', items: { type: 'string' } },
    },
    required: ['file', 'gaps'],
  } })

return {
  commit,
  inventories: inv.map(r => ({ key: r.key, file: r.file, recommendation: r.recommendation, summary: r.summary, findings: r.keyFindings.length })),
  security,
  validation: { build: validation?.build, after: validation?.after },
  synthesis: synth,
  reviews,
  critic,
}
