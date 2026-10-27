export const meta = {
  name: 'master-plan-buildplan',
  description: 'Master plan step 6 as a build plan: reconcile the design documents and fold in spike results, then the core-first build roadmap, atomic task packages per build phase, test strategy and release checks, each reviewed for implementability',
  phases: [
    { title: 'Reconcile', detail: 'seven consistency sweeps and the spike fold-in scout, then one arbiter decides each disagreement', model: 'sonnet' },
    { title: 'Fix design', detail: 'one fixer per file applies the decisions and spike results, a verify round, then one more fix round', model: 'sonnet' },
    { title: 'Roadmap', detail: 'core-first build phases from B0 foundation to drones and export, each one approval unit', model: 'sonnet' },
    { title: 'Tasks', detail: 'one planner per build phase writes atomic task packages; test strategy and release checks in parallel', model: 'sonnet' },
    { title: 'Review', detail: 'an implementability reviewer and a fixer per phase, then a cross-document critic and fixers, then the task index', model: 'sonnet' },
  ],
}

// Every subagent runs on Sonnet 5.5 (Amar, 2026-10-26); only the orchestrating session is Opus.
const sonnet = (prompt, opts = {}) => agent(prompt, { ...opts, model: 'sonnet' })

const repo = '/Users/amar/Codes/ak/simlab'
const scratch = args?.scratch ?? '/Users/amar/iynk-master-plan-scratch'
const mp = `${repo}/docs/MASTER_PLAN`
const A = `${mp}/04_ARCHITECTURE`
const E = `${mp}/05_ENGINEERING`
const today = '2026-10-27'

// Agents write the same file as absolute, repo-relative or plan-relative paths, sometimes with a note or line number after it.
// Grouping on the raw string put two fixers on one file in the design run, and they undid each other.
const norm = p => {
  if (!p) return null
  let f = String(p).trim().replace(/^`+|`+$/g, '').split(/\s+\(/)[0].trim().replace(/:\d+(-\d+)?$/, '')
  if (f.startsWith(`${repo}/`)) return f
  if (f.startsWith('docs/MASTER_PLAN/')) return `${repo}/${f}`
  if (/^\d\d_[A-Z]/.test(f)) return `${mp}/${f}`
  return f.startsWith('/') ? f : `${repo}/${f}`
}
// The schemas, their examples and the check tools are validated together, so one agent owns all of them.
const SCHEMAS = `${A}/schemas`
const ownerOf = f => (f.startsWith(`${SCHEMAS}/`) ? SCHEMAS : f)
const groupByOwner = entries => {
  const units = {}
  for (const { file, kind, text } of entries) {
    const f = norm(file)
    if (!f) continue
    const u = ownerOf(f)
    if (!units[u]) units[u] = { reconcile: [], foldin: [], other: [] }
    units[u][kind].push(u === f ? text : `${text} (file: ${f})`)
  }
  return units
}
const isDataFile = f => /\.(json|ya?ml)$/.test(f)

const RULES = `You are planning the build of iynk (repo ${repo}). This step writes plans only: change nothing in src/, figures/, server/, solana/,
db/, e2e/, package.json or lockfiles, and do not commit. Scratch goes under ${scratch}/buildplan/<your label>/.

Binding inputs (read what your task names; cite by path):
- Decisions: ${mp}/00_EXECUTIVE/DECISION_REGISTER.md, starting with "Current decisions: the build reframe" (D-013 to D-017), which overrides the older
  strategy decisions. iynk is built as a complete open-source app for Amar and his friends (no customers, markets, pricing or classrooms). Build order,
  core first (D-014): B0 foundation; project core; Studio editor; collaboration with buddies; simulation fidelity; faults on any circuit; components; the
  existing labs moved into Studio; AI partner; robotics creation; drone creation; export and physical build. Local-first and self-hostable with
  bring-your-own keys (D-015). Build Stories, Build Night and the Solana Proof of Build are removed; Build Buddies becomes collaboration; the leaderboard is
  buddies-only (D-016). Licence later (D-017). Agents build each phase and the orchestrator stops after each phase for Amar's OK.
- Product: ${mp}/03_PRODUCT/ (FEATURE_CATALOGUE F-ids, FEATURE_PRIORITIZATION, PRODUCT_REQUIREMENTS R-ids, USER_JOURNEYS, STUDIO_EDITOR, EDUCATION, ...).
- Architecture: ${mp}/04_ARCHITECTURE/ (PROJECT_DATA_MODEL and schemas/project.schema.json, COMPONENT_SCHEMA and schemas/component.schema.json,
  SIMULATION_ARCHITECTURE, SYSTEM/FRONTEND/BACKEND/API/REALTIME/AI architecture, ADR/). Field and module names there are binding. Where two
  design documents still disagree, ${A}/RECONCILIATION.md decides (written in the first step of this run, once it exists).
- Spikes: ${mp}/08_RESEARCH_SPIKES/*/REPORT.md (verdicts and independent checks).
- Audit: ${mp}/01_AUDIT/ (TECHNICAL_DEBT Part D, SECURITY_BASELINE sections 8 and 10, FEATURE_VERIFICATION section 7, PERFORMANCE_BASELINE,
  TEST_COVERAGE, runs/COMMANDS.md for the commands that work keyless).
- The code: read it. Every existing path you cite must exist (check with ls or grep); quote path:line for anything you change. This repo runs Next.js
  16.4.3, which differs from older Next.js; read ${repo}/AGENTS.md and the guide in node_modules/next/dist/docs/ before naming any Next API.

Build constraints the plan must respect:
- The build happens on a local branch (build/v1, cut from main). One commit per task, authored as Amar Kushwaha, with no Co-Authored-By or
  "Generated with" lines. Never push (a push to main deploys production on Vercel) and never deploy. Production services, .env.local keys, and ports
  3000 and 43117 are off limits; verification runs keyless on a local build (see runs/COMMANDS.md for the exact keyless env).
- Each atomic task changes at most 5 source files, not counting its own test files, so one agent can finish and verify it in one sitting.
- Every task names the exact commands that prove it: npm run typecheck, npm run lint, the vitest files, the playwright specs.
- Work only a person can do (choosing the licence, checking simulated faults on a real board with a multimeter, reviewing third-party content for
  rewrite) is not an agent task. List it as "For Amar", never as a build task.

Write plainly: short sentences, tables, no em dashes, no marketing. Label claims VERIFIED / DOCUMENTED / EXTERNAL / ESTIMATED / HYPOTHESIS / UNKNOWN.
Your final text is returned as data; the file you write must stand alone.`

const DOC_SCHEMA = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    keyDecisions: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['files', 'summary'],
}

// ---------------------------------------------------------------- Reconcile: find where the design documents disagree, decide each once

phase('Reconcile')
const SCOUT_SCHEMA = {
  type: 'object',
  properties: {
    spikes: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, verdict: { type: 'string' }, checkHolds: { type: 'string' }, decisionItInforms: { type: 'string' },
    }, required: ['id', 'verdict', 'decisionItInforms'] } },
    targets: { type: 'array', items: { type: 'object', properties: {
      file: { type: 'string', description: 'absolute path' },
      items: { type: 'array', items: { type: 'string' }, description: 'each PENDING marker or stale gate sentence, with its line number and what the spike says' },
    }, required: ['file', 'items'] } },
  },
  required: ['spikes', 'targets'],
}
const CONFLICT_SCHEMA = {
  type: 'object',
  properties: {
    conflicts: { type: 'array', items: { type: 'object', properties: {
      topic: { type: 'string' },
      variants: { type: 'array', items: { type: 'object', properties: {
        file: { type: 'string', description: 'absolute path' }, where: { type: 'string', description: 'section or line' }, says: { type: 'string' },
      }, required: ['file', 'says'] } },
      evidence: { type: 'string', description: 'decisions, spike numbers or ADRs that bear on which variant is right' },
      severity: { type: 'string', enum: ['blocker', 'high', 'medium', 'low'] },
    }, required: ['topic', 'variants', 'severity'] } },
    checksRun: { type: 'string', description: 'commands run and their result, if any' },
  },
  required: ['conflicts'],
}
const SWEEPS = [
  { key: 'storage', focus: `server store and local storage: SQLite settings (the synchronous default, WAL, IYNK_STORE_SYNC), snapshot and compaction
numbers (ADR-0423 against ADR-0505), retention and backups, any Postgres left as the server store (F-165 is SQLite per ADR-0004), and the IndexedDB
database and store names and numbers across SYSTEM, FRONTEND, AI, REALTIME and BACKEND architecture and ADR-0004, 0106, 0422 and 0505` },
  { key: 'identity', focus: `identity, enrolment and access: device keys (P-256) against HMAC tokens across ADR-0007, ADR-0421, ADR-0502 and
BACKEND sections 5 and 6; the setup or operator token against enrolment codes; the enrolment setting's name and modes (IYNK_ENROL or IYNK_ENROLLMENT;
invite, closed, code, open); instance roles; buddy and room invites; the share-link expiry default (30 or 7 days)` },
  { key: 'api', focus: `routes and contracts: schemas/openapi.yaml against API_CONTRACTS, BACKEND, FRONTEND, REALTIME, AI_ARCHITECTURE, COMMUNITY
and STUDIO_EDITOR: the path prefix (/v1 or /api/v1), routes one document has and another lacks (/projects/*, /me/exports, /usage, /parts, /search/*,
/ai/relay, getServerInfo software.version), operation ids, the Idempotency-Key count, error codes, and the server CLI command names` },
  { key: 'document', focus: `the project and component documents: PROJECT_DATA_MODEL against schemas/project.schema.json, the example project files,
COMPONENT_SCHEMA and schemas/component.schema.json, STUDIO_EDITOR, and the robot and drone domain data: what the stateHash covers, revision,
cause_id and the diagnosis record fields (D-010), surface pins and PinId rules, licence or license spelling, whether domains.*.data is opaque or
typed, provenance and fork origin, refdes prefixes, units. Run the checks too: cd ${SCHEMAS}/tools && npm run check (run npm install --no-audit
--no-fund first if node_modules is missing) and report every failure as a conflict` },
  { key: 'simulation', focus: `simulation, faults and runtime: the cause-id list (SIMULATION_ARCHITECTURE 13.4 is the canonical list; ROBOTICS 13 and
DRONE 10 should point to it), fault and lesson counts ("79", "20 deliberately broken circuits", 106 bench faults, 144 board failures), worker and
compile resource limits ("512 MB, 1 CPU"), and whether each engine choice matches its spike: solver (RS-08), AVR runtime (RS-03), RP2040 (RS-06),
Verilog (RS-12), physics engine (RS-13), editor rendering (RS-01); operatingRange against validRange` },
  { key: 'adr', focus: `the ADR set: ADR/README.md ranges and rows against the "ADR number ranges" section of 00_EXECUTIVE/DECISION_REGISTER.md and
the numbers each document really uses (STUDIO_EDITOR, EDUCATION, COMMUNITY, API_CONTRACTS, UX_DESIGN_SYSTEM, REALTIME); ids used twice; status lines
that disagree about what supersedes what (ADR-0421, 0422, 0430); ADR files missing sections of the BRIEF section 19.6 template (ADR-0601 to 0613 and
0700 to 0716 were reported as missing Performance data, Licensing and Migration plan); links to ADR files that do not exist` },
  { key: 'product', focus: `the product documents against each other and the reframe: FEATURE_CATALOGUE F-ids and phase codes against
FEATURE_PRIORITIZATION (class, phase, the Milestone 1 list and count), PRODUCT_REQUIREMENTS R-ids, USER_JOURNEYS J-ids (J-13, J-14, J-15), EDUCATION,
COMMUNITY, COMPONENT_ECOSYSTEM and UX_DESIGN_SYSTEM; any document that still plans something D-016 removed (Build Stories, Build Night, Solana,
wallet, mint, a public buddy list, the AI matcher) or D-013 put out of scope (classrooms, rosters, LMS, accounts, billing, pricing, marketplace,
the live counter); the leaderboard must be buddies only` },
]

const [scout, ...sweeps] = await parallel([
  () => sonnet(`${RULES}

You are the fold-in scout. Read every ${mp}/08_RESEARCH_SPIKES/*/REPORT.md, including its "Independent check" section, and record each spike's
verdict, whether the check upheld it, and which design decision it informs. Then grep ${mp}/03_PRODUCT and ${A} (including ADR/) for
"PENDING RS-", "RS-0", "RS-1", "Studio gate" and "go / no-go". List every place where (a) a choice waits on a spike that now has a result, or (b) text
says Studio waits for interviews, a pilot, a market gate or Fault Lab, or plans around customers, classrooms or pricing (Amar's reframe: core first,
D-013 and D-014; only the technical spikes steer the technology). Give absolute paths. Group by file. Change nothing.`,
    { label: 'scout', phase: 'Reconcile', schema: SCOUT_SCHEMA }),
  ...SWEEPS.map(s => () => sonnet(`${RULES}

You are the ${s.key} consistency sweep over the design: ${mp}/03_PRODUCT, ${A} (including ADR/ and schemas/) and
${mp}/00_EXECUTIVE/DECISION_REGISTER.md. Your focus: ${s.focus}.
Fixer notes from the last review are at ${scratch}/design/review-leftovers.md; use them as leads only, since some are already fixed and two fixers
edited some files at once. Read the documents themselves and grep for every variant. Report each place where two documents (or two sections of one)
state different values for the same thing within your focus, with absolute file paths, the section or line, and the exact words each uses, plus any
decision, spike number or ADR that bears on which is right. Report only disagreements that exist in the files now. Change nothing.`,
    { label: `sweep:${s.key}`, phase: 'Reconcile', schema: CONFLICT_SCHEMA })),
])

const conflicts = sweeps.flatMap((r, i) => (r?.conflicts ?? []).map(c => ({ sweep: SWEEPS[i].key, ...c })))
const deadSweeps = SWEEPS.filter((s, i) => !sweeps[i]).map(s => s.key)
if (deadSweeps.length) log(`Sweeps that returned nothing: ${deadSweeps.join(', ')}`)
log(`Reconcile: ${conflicts.length} disagreements from ${SWEEPS.length - deadSweeps.length} sweeps; scout found ${scout?.targets?.length ?? 0} files with spike fold-ins`)

const ARB_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    summary: { type: 'string' },
    decisions: { type: 'number' },
    edits: { type: 'array', items: { type: 'object', properties: {
      file: { type: 'string', description: 'absolute path of the one file this edit changes' },
      rid: { type: 'string', description: 'RC-01, RC-02, ...' },
      change: { type: 'string', description: 'the section, the wording or value it has now, and the wording or value it must have' },
    }, required: ['file', 'rid', 'change'] } },
    forAmar: { type: 'array', items: { type: 'string' } },
  },
  required: ['file', 'summary', 'edits'],
}
const arbiter = await sonnet(`${RULES}

You are the arbiter for the design documents. Seven sweeps found these disagreements (JSON):
${JSON.stringify(conflicts)}

Merge duplicates. Open the files and confirm each disagreement still exists; drop any that do not. For each one left, decide ONE canonical value by
this precedence, and name the rule you used:
1. DECISION_REGISTER D-013 to D-017 (Amar's decisions) and the kept D-007, D-010, D-011.
2. A measured spike result (cite the REPORT.md and its number).
3. The ADR that owns the topic per ADR/README.md, if its status is accepted.
4. The document that owns the topic: the contract schemas and PROJECT_DATA_MODEL own field names; API_CONTRACTS with schemas/openapi.yaml own routes;
   SYSTEM_ARCHITECTURE owns module layout and storage; SIMULATION_ARCHITECTURE owns cause ids; FEATURE_CATALOGUE owns F-ids and phase codes.
5. Otherwise the simpler, safer and more reversible option, labelled PROPOSAL.
Never decide what only Amar can (the licence, real-board checks, third-party content); list those under forAmar.

Write ${A}/RECONCILIATION.md: one row per decision (RC-01, RC-02, ...) with the topic, each variant with file and place, the decision, the rule used,
and every file that must change. Keep it plain and short. Then return the edits: one entry per file per decision with the exact change, so a fixer
who owns only that file can apply it without reading the others. Every file that states a losing variant gets an edit. Do not edit any other file.`,
  { label: 'arbiter', phase: 'Reconcile', schema: ARB_SCHEMA })

const spikeDigest = (scout?.spikes ?? []).map(s => `${s.id}: ${s.verdict}${s.checkHolds ? ` (check: ${s.checkHolds})` : ''}; informs ${s.decisionItInforms}`).join('\n')
log(`Arbiter: ${arbiter?.decisions ?? '?'} decisions, ${arbiter?.edits?.length ?? 0} file edits; for Amar: ${(arbiter?.forAmar ?? []).length}`)

// ---------------------------------------------------------------- Fix design: one fixer per file applies the decisions and the spike results

phase('Fix design')
const reconcileFile = norm(`${A}/RECONCILIATION.md`)
const unitsRound1 = groupByOwner([
  ...(arbiter?.edits ?? []).map(e => ({ file: e.file, kind: 'reconcile', text: `${e.rid}: ${e.change}` })),
  ...(scout?.targets ?? []).flatMap(t => t.items.map(x => ({ file: t.file, kind: 'foldin', text: x }))),
])
delete unitsRound1[reconcileFile]

const fixUnit = (unit, u, round) => {
  const scope = unit === SCHEMAS
    ? `everything under ${SCHEMAS} (the schemas, the example files and the check tools). After editing, run cd ${SCHEMAS}/tools && npm run check
(npm install --no-audit --no-fund first if node_modules is missing) and fix until it passes; recompute any hashes in the examples with the tools there,
never by hand.`
    : `${unit}. Edit no other file.`
  const record = unit === SCHEMAS || isDataFile(unit)
    ? 'Data files cannot carry a notes section: list each change in your summary instead.'
    : `Append "## ${round === 1 ? 'Reconcile and spike fold-in' : 'Reconcile, second pass'} (${today})" listing each change by RC id or spike id.`
  const register = unit.endsWith('/DECISION_REGISTER.md')
    ? '\nIn DECISION_REGISTER, never change a decision (D-001 to D-017), its status or its wording; change only cross-reference sections such as ADR number ranges.'
    : ''
  return sonnet(`${RULES}

You are the only agent editing ${scope}${register}
${u.reconcile.length ? `\nDecisions to apply (from ${reconcileFile}; read the row for each RC id first):\n${u.reconcile.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n` : ''}${u.foldin.length ? `\nSpike results:\n${spikeDigest}\nPlaces to update with them:\n${u.foldin.map((x, i) => `${i + 1}. ${x}`).join('\n')}
For each place, read the spike report, then replace the PENDING text with the decision the exit condition implies, citing the report path and its
numbers; if the spike was INCONCLUSIVE or its check disagreed, choose the reversible option and say what would change it. Replace any wording that
makes Studio wait for interviews, a pilot or Fault Lab with the D-014 order.\n` : ''}${u.other.length ? `\nLeftovers a verifier found after the first pass:\n${u.other.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n` : ''}
Check each item against the file as it is now. If the file already says the decided value, leave it. If an item misreads the file, skip it and say why.
Keep names consistent with the contract schemas. ${record}`,
    { label: `fix${round}:${unit.split('/').pop()}`, phase: 'Fix design', schema: DOC_SCHEMA })
}

log(`Fix design: ${Object.keys(unitsRound1).length} files, one fixer each`)
await parallel(Object.entries(unitsRound1).map(([unit, u]) => () => fixUnit(unit, u, 1)))

const rids = [...new Set((arbiter?.edits ?? []).map(e => e.rid))]
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    leftovers: { type: 'array', items: { type: 'object', properties: {
      file: { type: 'string', description: 'absolute path' }, rid: { type: 'string' }, change: { type: 'string' },
    }, required: ['file', 'change'] } },
    checksRun: { type: 'string' },
  },
  required: ['leftovers'],
}
const chunks = [0, 1, 2].map(k => rids.filter((_, i) => i % 3 === k)).filter(c => c.length)
const verified = await parallel(chunks.map((chunk, k) => () => sonnet(`${RULES}

You verify reconcile decisions ${chunk.join(', ')} in ${reconcileFile}. For each, grep ${mp}/03_PRODUCT, ${A} (including ADR/ and schemas/) and
${mp}/00_EXECUTIVE/DECISION_REGISTER.md for the decided value and for every losing variant. Report each place that still states a losing variant or
contradicts the decision, with the exact change needed.${k === 0 ? ` Also run cd ${SCHEMAS}/tools && npm run check and report any failure as a leftover
on the file that fails.` : ''} Change nothing.`, { label: `verify:${k + 1}`, phase: 'Fix design', schema: VERIFY_SCHEMA })))

const leftovers = verified.filter(Boolean).flatMap(v => v.leftovers ?? [])
const unitsRound2 = groupByOwner(leftovers.map(l => ({ file: l.file, kind: 'other', text: `${l.rid ? `${l.rid}: ` : ''}${l.change}` })))
delete unitsRound2[reconcileFile]
log(`Verify: ${leftovers.length} leftovers in ${Object.keys(unitsRound2).length} files; one more fix round, then the plan proceeds`)
const round2 = await parallel(Object.entries(unitsRound2).map(([unit, u]) => () => fixUnit(unit, u, 2)))
const unresolved = round2.filter(Boolean).flatMap(r => r.openQuestions ?? [])
if (unresolved.length) log(`After the second pass, fixers still list ${unresolved.length} open items (returned in the result)`)

// ---------------------------------------------------------------- Roadmap: the build phases

phase('Roadmap')
const ROADMAP_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    summary: { type: 'string' },
    phases: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string', description: 'B0, B1, ...' },
      slug: { type: 'string', description: 'kebab-case' },
      name: { type: 'string' },
      goal: { type: 'string' },
      scope: { type: 'string', description: 'features (F-ids) and requirements (R-ids) in this phase, and what is explicitly not in it' },
      dependsOn: { type: 'array', items: { type: 'string' } },
      taskPrefix: { type: 'string', description: 'e.g. T-B0' },
      exit: { type: 'string', description: 'the automated checks and the user-visible result that end the phase' },
    }, required: ['id', 'slug', 'name', 'goal', 'scope', 'taskPrefix', 'exit'] } },
  },
  required: ['file', 'summary', 'phases'],
}
const roadmap = await sonnet(`${RULES}

Write ${E}/IMPLEMENTATION_ROADMAP.md: the build roadmap from today's code to the full app, as build phases B0, B1, ... in the D-014 order. Each build
phase is one approval unit: a coherent result Amar can look at and test, built by one workflow run, usually 8 to 25 atomic tasks. Split a D-014 phase
into several build phases where it is too big for one run (the project core and the Studio editor almost certainly are).
- B0 foundation: the security fixes that matter for public code and a friends' install (SECURITY_BASELINE sections 8 and 10); removing Build Stories,
  Build Night and the Solana Proof of Build with every route, component, dependency and test they own (D-016); bring-your-own AI and search keys in place
  of server keys, with a per-user spend cap (D-015); telemetry removed or opt-in; CI (a GitHub Actions workflow file; it runs only once Amar pushes);
  open-source basics (README for contributors, CONTRIBUTING, a self-hosting guide stub, a LICENSE placeholder that Amar fills, D-017); honest copy for the
  contradicted claims (FEATURE_VERIFICATION section 7); the bundle wins in PERFORMANCE_BASELINE (wallet code goes with Solana; prefetch); the figure
  redraw cost if cheap.
- Then the project core: the canonical project document and schema, the netlist independent of the drawing, the solver and code runtime in Workers as the
  spikes decided, deterministic run and replay, local save and load (IndexedDB plus project files), the shared diagnosis record (D-010).
- Then the Studio editor (rendering as RS-01 decided): Milestone 1 in 03_PRODUCT/FEATURE_PRIORITIZATION.md first (start from scratch, place an Uno and
  parts, wire, write code, run with serial, save, reopen), then the other boards.
- Then collaboration: the self-hosted server, buddy identity and invites, buddy lists visible only to buddies, shared projects, live co-editing on the op
  log (RS-09), invite-only rooms with the host takeover and flooding fixes, the buddies-only leaderboard.
- Then the later D-014 phases in order, each planned in enough detail to build: fidelity, faults on any circuit, components, labs moved in, AI partner,
  robotics, drones, export and physical build.
For every build phase give all BRIEF section 26 phase fields (business objective, user-visible outcomes, exact technical scope, non-goals,
dependencies, architecture changes, database changes, APIs, frontend components, simulation work, security, accessibility, testing, documentation,
effort best / expected / adverse in engineer-weeks with assumptions, operational cost, risks, mitigations, acceptance criteria, rollout, rollback, exit
gate). Rollout here means merging the branch and is always Amar's call; operational cost means a self-hoster's running cost. Then: a dependency diagram
(Mermaid) of the phases; "For Amar" (the licence choice, real-board checks of simulated faults, the third-party content review, when each matters); and
"Not in this build" (BRIEF section 26 phases 8 to 10 parts that are out of scope under D-013, such as classrooms and billing). Return the phase list.`, { label: 'roadmap', phase: 'Roadmap', schema: ROADMAP_SCHEMA })

const phases = roadmap?.phases ?? []
log(`Roadmap: ${phases.length} build phases: ${phases.map(p => p.id).join(', ')}`)

// ---------------------------------------------------------------- Tasks: one planner per phase, reviewed and fixed per phase

phase('Tasks')
const TASKS_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    taskCount: { type: 'number' },
    tasks: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, title: { type: 'string' }, dependsOn: { type: 'array', items: { type: 'string' } },
      parallelGroup: { type: 'string' }, files: { type: 'array', items: { type: 'string' } },
    }, required: ['id', 'title', 'dependsOn', 'parallelGroup', 'files'] } },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['file', 'taskCount', 'tasks'],
}
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    issues: { type: 'array', items: { type: 'object', properties: {
      what: { type: 'string' }, task: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'high', 'medium', 'low'] }, fix: { type: 'string' },
    }, required: ['what', 'severity', 'fix'] } },
  },
  required: ['issues'],
}

const phaseFile = p => `${E}/tasks/${p.id}-${p.slug}.md`

const planPhase = p => sonnet(`${RULES}

Write ${phaseFile(p)}: the atomic task packages for build phase ${p.id} (${p.name}). Goal: ${p.goal}
Scope: ${p.scope}
Exit: ${p.exit}
Depends on phases: ${(p.dependsOn ?? []).join(', ') || 'none'}. Read ${E}/IMPLEMENTATION_ROADMAP.md for the phase in full and the task files of earlier
phases if they exist, so ids, files and names line up.

Ids: ${p.taskPrefix}-01, ${p.taskPrefix}-02, ... For every task give all BRIEF section 27 fields: identity (id, subsystem, phase, priority,
dependencies, status "not started"); intent (problem, target user, user story, expected behaviour, success metric); implementation (existing files with
path:line, new files, modules and functions with TypeScript signatures, data model with field names from the contract schemas, input and output
schemas, API contracts, algorithms, state transitions, validation rules, error conditions, edge cases, permissions, performance constraints, migration);
verification (unit tests with file names and the cases they cover, integration tests, Playwright scenarios, fixtures, Given/When/Then acceptance
criteria, observability, release blockers); delivery (definition of done, the exact verify commands, documentation updates, rollback, what later tasks
need from it). Decompose until each task changes at most 5 source files plus its tests. Add a "Parallel groups" table: tasks in the same group touch
disjoint files and can be built by separate agents at once; groups run in order. Add a file-ownership table (file to task id) so two tasks never edit
one file in the same group. If something needs research the spikes did not answer, make it a spike task with a falsifiable question and exit
condition. Return the task list.`, { label: `tasks:${p.id}`, phase: 'Tasks', schema: TASKS_SCHEMA })

const reviewPhase = (t, p) => t ? sonnet(`${RULES}

You review ${phaseFile(p)} (build phase ${p.id}) as the agent who must implement it tomorrow with no one to ask. Check: every existing path exists
(ls it); every function, field and endpoint name matches 04_ARCHITECTURE contracts and schemas; every task changes at most 5 source files; tasks in one
parallel group never share a file; dependencies are complete and acyclic; verify commands are real (scripts exist in package.json; the test files are
named); acceptance criteria are testable; nothing contradicts DECISION_REGISTER or the roadmap; nothing needs production, keys, a push or a deploy; no
step says "build the X" without decomposing it. Do not edit. Return each issue with the task id and the exact fix.`,
  { label: `review:${p.id}`, phase: 'Review', schema: REVIEW_SCHEMA }).then(r => ({ t, r })) : null

const fixPhase = (x, p) => {
  if (!x) return null
  const issues = (x.r?.issues ?? []).filter(i => i.severity !== 'low')
  if (!issues.length) return x.t
  return sonnet(`${RULES}

You fix review issues in ${phaseFile(p)}; you are the only agent editing it. Issues:
${issues.map((i, n) => `${n + 1}. [${i.severity}] ${i.task ?? ''} ${i.what}\n   Fix: ${i.fix}`).join('\n')}
Apply each fix with evidence (check paths and contract names yourself). If an issue is wrong, do not apply it and say why. Keep the parallel-group and
file-ownership tables correct after your changes. Append "## Review fixes (${today})". Return the updated task list.`,
    { label: `fix:${p.id}`, phase: 'Review', schema: TASKS_SCHEMA })
}

const [phaseTasks, support] = await parallel([
  () => pipeline(phases, planPhase, reviewPhase, fixPhase),
  () => parallel([
    () => sonnet(`${RULES}

Write ${E}/TEST_STRATEGY.md for the build. Cover: the test layers this repo already has (Vitest unit files beside sources, the Playwright e2e suite,
the relay's tests, the content check; the Anchor tests go away with Solana in B0) and how each build phase adds to them; conventions (file naming, fixtures, deterministic seeds,
no network, keyless env from runs/COMMANDS.md, ports to use and avoid); the slow tests that time out under load and how the build runs them (see
TEST_COVERAGE.md and E2E.md); differential tests (Node versus Chromium for checks; iynk interpreter versus avr8js where RS-03 makes that possible; solver
versus ngspice fixtures from RS-08); golden fixtures for the project document and schema validation (ajv) of every example; determinism and replay
tests; accessibility checks (axe with Playwright, keyboard paths for wiring); performance checks (a bundle budget script against the numbers in
PERFORMANCE_BASELINE and RS-01); security regression tests for each Step 0 fix; and the exact command sequence the build workflow runs after every
task and at the end of every phase.`, { label: 'test-strategy', phase: 'Tasks', schema: DOC_SCHEMA }),
    () => sonnet(`${RULES}

Write ${E}/RELEASE_GATES.md: for each build phase in ${E}/IMPLEMENTATION_ROADMAP.md, the automated exit checks an agent runs and their pass thresholds
(typecheck, lint with zero errors, unit and e2e pass counts with no new failures against the baseline in runs/COMMANDS.md and runs/E2E.md, bundle budgets,
accessibility checks, the security regression tests, schema validation), which thresholds come from measurements (cite) and which are proposals
(HYPOTHESIS). Then the milestone checks from BRIEF section 32 for each D-014 phase (product completeness, scientific correctness, reliability,
security, performance, accessibility, operational readiness for a self-hosted install; no business readiness, D-013): mark each item "checked by
agents" or "needs Amar", because merging and deploying are always his call.`, { label: 'release-gates', phase: 'Tasks', schema: DOC_SCHEMA }),
  ]),
])

// ---------------------------------------------------------------- Cross-document critic, fixers, index

phase('Review')
const CROSS_SCHEMA = {
  type: 'object',
  properties: {
    issues: { type: 'array', items: { type: 'object', properties: {
      what: { type: 'string' }, targetFile: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'high', 'medium', 'low'] }, fix: { type: 'string' },
    }, required: ['what', 'targetFile', 'severity', 'fix'] } },
  },
  required: ['issues'],
}
const critic = await sonnet(`${RULES}

You are the cross-document critic for ${E}: IMPLEMENTATION_ROADMAP.md, TEST_STRATEGY.md, RELEASE_GATES.md and tasks/*.md. Find: a roadmap scope item no
task implements; a task that implements nothing in scope; two phases' tasks that edit the same file without a dependency between them; an id used
twice; a task whose verify command contradicts TEST_STRATEGY; an exit check in RELEASE_GATES that no task makes pass; any must requirement R-id in
03_PRODUCT/PRODUCT_REQUIREMENTS.md for a planned phase with no task; any task that builds something removed (D-016) or out of scope (D-013). Do not edit. Return each issue with the ONE
file that must change and the exact fix.`, { label: 'critic', phase: 'Review', schema: CROSS_SCHEMA })

const crossIssues = (critic?.issues ?? []).filter(i => i.severity !== 'low')
const crossByFile = {}
for (const i of crossIssues) {
  const f = norm(i.targetFile)
  if (f) (crossByFile[f] = crossByFile[f] || []).push(i)
}
log(`Critic: ${crossIssues.length} blocker/high/medium issues across ${Object.keys(crossByFile).length} files`)

await parallel(Object.entries(crossByFile).map(([file, list]) => () => sonnet(`${RULES}

You fix cross-document issues in ${file}; you are the only agent editing it. Issues:
${list.map((i, n) => `${n + 1}. [${i.severity}] ${i.what}\n   Fix: ${i.fix}`).join('\n')}
Apply each with evidence; if one is wrong, say why and skip it. Keep task ids, parallel groups and file ownership consistent. Append
"## Cross-review fixes (${today})".`, { label: `xfix:${file.split('/').pop()}`, phase: 'Review', schema: DOC_SCHEMA })))

const index = await sonnet(`${RULES}

Write ${E}/TASK_SPECIFICATIONS.md: the index of every task in ${E}/tasks/*.md (read the files as they are now). One table per build phase: id, title,
depends on, parallel group, files, status. Then the order a build workflow should follow (phase by phase, group by group), the total task count per
phase, and any open questions the task files still carry. Do not change the task files.`, { label: 'index', phase: 'Review', schema: DOC_SCHEMA })

return {
  spikes: scout?.spikes ?? [],
  reconcile: {
    conflictsFound: conflicts.length,
    deadSweeps,
    decisions: arbiter?.decisions ?? null,
    forAmar: arbiter?.forAmar ?? [],
    filesFixed: Object.keys(unitsRound1),
    leftoversAfterVerify: leftovers.length,
    unresolved,
  },
  phases: phases.map((p, i) => ({ id: p.id, name: p.name, file: phaseFile(p), tasks: phaseTasks?.[i]?.taskCount ?? null })),
  support: (support ?? []).filter(Boolean).map(s => s.files),
  crossIssues: crossIssues.length,
  index: index?.files,
}
