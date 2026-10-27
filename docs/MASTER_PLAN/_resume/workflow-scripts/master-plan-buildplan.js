export const meta = {
  name: 'master-plan-buildplan',
  description: 'Master plan step 6 as a build plan: fold spike results into the design, then the core-first build roadmap, atomic task packages per build phase, test strategy and release checks, each reviewed for implementability',
  phases: [
    { title: 'Fold-in', detail: 'replace PENDING spike markers and old gate wording in the design with the measured results', model: 'sonnet' },
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
const E = `${mp}/05_ENGINEERING`
const today = '2026-10-27'

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
  SIMULATION_ARCHITECTURE, SYSTEM/FRONTEND/BACKEND/API/REALTIME/AI architecture, ADR/). Field and module names there are binding.
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

// ---------------------------------------------------------------- Fold-in: spike results into the design documents

phase('Fold-in')
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
const scout = await sonnet(`${RULES}

You are the fold-in scout. Read every ${mp}/08_RESEARCH_SPIKES/*/REPORT.md, including its "Independent check" section, and record each spike's
verdict, whether the check upheld it, and which design decision it informs. Then grep ${mp}/03_PRODUCT and ${mp}/04_ARCHITECTURE (including ADR/) for
"PENDING RS-", "RS-0", "RS-1", "Studio gate" and "go / no-go". List every place where (a) a choice waits on a spike that now has a result, or (b) text
says Studio waits for interviews, a pilot, a market gate or Fault Lab, or plans around customers, classrooms or pricing (Amar's reframe: core first,
D-013 and D-014; only the technical spikes steer the technology). Group by file. Change nothing.`, { label: 'foldin:scout', phase: 'Fold-in', schema: SCOUT_SCHEMA })

const spikeDigest = (scout?.spikes ?? []).map(s => `${s.id}: ${s.verdict}${s.checkHolds ? ` (check: ${s.checkHolds})` : ''}; informs ${s.decisionItInforms}`).join('\n')
log(`Fold-in: ${scout?.targets?.length ?? 0} design files to update`)

await parallel((scout?.targets ?? []).map(t => () => sonnet(`${RULES}

You update ${t.file}; you are the only agent editing it. Spike results:
${spikeDigest}
Places to update:
${t.items.map((x, i) => `${i + 1}. ${x}`).join('\n')}
For each place, read the spike report, then replace the PENDING text with the decision the exit condition implies, citing the report path and its
numbers; if the spike was INCONCLUSIVE or its check disagreed, choose the reversible option and say what would change it. Replace any wording that makes
Studio wait for interviews, a pilot or Fault Lab with the D-014 order. Keep names consistent with the contract documents. Append "## Spike fold-in (${today})"
listing each change.`, { label: `foldin:${t.file.split('/').pop()}`, phase: 'Fold-in', schema: DOC_SCHEMA })))

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
for (const i of crossIssues) (crossByFile[i.targetFile] = crossByFile[i.targetFile] || []).push(i)
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
  foldedFiles: (scout?.targets ?? []).map(t => t.file),
  phases: phases.map((p, i) => ({ id: p.id, name: p.name, file: phaseFile(p), tasks: phaseTasks?.[i]?.taskCount ?? null })),
  support: (support ?? []).filter(Boolean).map(s => s.files),
  crossIssues: crossIssues.length,
  index: index?.files,
}
