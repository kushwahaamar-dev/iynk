export const meta = {
  name: 'master-plan-design',
  description: 'Master plan steps 4-5: product specification (03_PRODUCT) and architecture (04_ARCHITECTURE, ADRs, JSON Schemas), then a cross-document consistency review',
  phases: [
    { title: 'Product core', detail: 'feature catalogue, then prioritization, then requirements (feature ids flow down)', model: 'sonnet' },
    { title: 'Contracts', detail: 'project data model, component schema, simulation architecture (the contracts everything else cites)', model: 'sonnet' },
    { title: 'Specs', detail: 'product specs and the remaining architecture documents, in parallel', model: 'sonnet' },
    { title: 'Review', detail: 'cluster reviewers, a cross-document critic, one fixer per file', model: 'sonnet' },
  ],
}

// Every subagent runs on Sonnet 5.5 (Amar, 2026-10-26); only the orchestrating session is Opus.
const sonnet = (prompt, opts = {}) => agent(prompt, { ...opts, model: 'sonnet' })

const repo = '/Users/amar/Codes/ak/simlab'
const scratch = args?.scratch ?? '/Users/amar/iynk-master-plan-scratch'
const mp = `${repo}/docs/MASTER_PLAN`
const P = `${mp}/03_PRODUCT`
const A = `${mp}/04_ARCHITECTURE`
const today = '2026-10-27'

const RULES = `You are on the council writing the iynk master plan (repo ${repo}). The assignment is ${mp}/BRIEF.md; read the sections your task names.
The DECISIONS are binding: ${mp}/00_EXECUTIVE/DECISION_REGISTER.md (beachhead segment, primary market-entry strategy, what is rejected or deferred). Every
product and architecture choice must serve them; if you believe a decision is wrong, say so in an "Objections" section with evidence, but still write the
spec for the decided strategy.

Evidence you build on (cite by path; do not re-derive what they establish):
- Audit: ${mp}/01_AUDIT/ (FEATURE_VERIFICATION, TECHNICAL_DEBT with A1-A13 and the five structural changes D1-D5, SECURITY_BASELINE,
  PERFORMANCE_BASELINE, TEST_COVERAGE, REPOSITORY_INVENTORY, inventory/*.md per subsystem, runs/*.md incl. BROWSER_WALK).
- Research: ${mp}/02_RESEARCH/ (COMPETITOR_LANDSCAPE, COMPETITOR_MATRIX, USER_SEGMENTS, USER_RESEARCH_PLAN, MARKET_ANALYSIS, TECHNICAL_RESEARCH,
  tech/*.md, competitors/*.md).
- Strategy: ${mp}/00_EXECUTIVE/council/*.md, ${mp}/06_BUSINESS/strategy-options/*.md, ${mp}/06_BUSINESS/POSITIONING.md, STARTUP_STRATEGY.md.
- Spikes with measured results: ${mp}/08_RESEARCH_SPIKES/*/REPORT.md (if a spike was INCONCLUSIVE, design so the decision stays reversible).
- The code itself (${repo}/src, figures, server): read it when you specify a migration or reuse; quote path:line.

Rules:
- This is a specification, not aspiration: concrete names, fields, types, units, states, error cases, limits, and acceptance criteria. No marketing.
- Label important claims VERIFIED / DOCUMENTED / EXTERNAL / ESTIMATED / HYPOTHESIS / UNKNOWN. Never invent benchmark numbers; cite spikes or mark
  ESTIMATED with assumptions.
- Preserve working code until a replacement is measurably better (BRIEF §3.5): for each subsystem you touch, say preserve / extend / replace and why,
  from the audit's recommendation.
- Link upstream (the brief section, the decision id, the audit or research file) and downstream (feature ids F-xxx from ${P}/FEATURE_CATALOGUE.md once it
  exists; ADR ids). Use the shared id schemes: features F-001...; requirements R-001...; user journeys J-01...J-12; ADRs ADR-NNNN in your assigned range.
- Change nothing outside your output files. Scratch goes under ${scratch}/design/<your label>/. Do not commit.
- Write plainly: short sentences, tables, Mermaid where a picture helps, no em dashes. Your final text is returned as data; the file must stand alone.`

const DOC_SCHEMA = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    keyDecisions: { type: 'array', items: { type: 'string' } },
    ids: { type: 'array', items: { type: 'string' }, description: 'ids you defined (F-, R-, J-, ADR-)' },
    openQuestions: { type: 'array', items: { type: 'string' } },
    objections: { type: 'array', items: { type: 'string' } },
  },
  required: ['files', 'summary', 'keyDecisions'],
}

// ---------------------------------------------------------------- Product core: ids flow catalogue -> prioritization -> requirements

phase('Product core')
const catalogue = await sonnet(`${RULES}

Write ${P}/FEATURE_CATALOGUE.md: every candidate capability, existing and proposed, each with a stable id F-001... Sources: BRIEF §7-§18 (Studio,
project builder, components, simulation, robotics, drones, AI, collaboration, education, community, physical build, UX), every existing feature in
01_AUDIT/FEATURE_VERIFICATION.md (with its verification status), the council memos and the strategy options. For each feature: id, name, domain, one-line
description, user value, which segment, existing code (path) or new, verification status today, dependencies (other F-ids), and the BRIEF section.
Group by domain. Include the existing hackathon features (Solana Proof of Build, Build Night, Build Buddies, Build Stories, leaderboards, MCP server,
live prices) so prioritization can keep, defer or reject them explicitly. Aim for completeness: 80-150 features is normal.`,
  { label: 'product:catalogue', phase: 'Product core', schema: DOC_SCHEMA })

const prioritization = await sonnet(`${RULES}

Write ${P}/FEATURE_PRIORITIZATION.md (BRIEF §25) over every feature in ${P}/FEATURE_CATALOGUE.md. Scoring criteria: user value, frequency of need,
market differentiation, impact on retention, technical feasibility, simulation accuracy, security and privacy risk, infrastructure cost, engineering
effort, dependency complexity, maintenance burden, monetization relevance. State the scale (1-5, with what 1 and 5 mean for each), the weights and why
(derived from DECISION_REGISTER's strategy), and an uncertainty grade per row (evidence strength). Then classify each feature: REQUIRED FOUNDATION,
PRIMARY MARKET-ENTRY FEATURE, NEAR-TERM DIFFERENTIATOR, VALIDATED EXPANSION, LONG-TERM RESEARCH, DEFERRED, REJECTED, with a one-line reason and, for
DEFERRED, the trigger that would bring it back. Provide the full matrix (one table, all rows), then "The smallest coherent product" (the exact set of
F-ids for the first release, and why it is coherent: a user can complete the target job end to end), then a sensitivity check (do the classes change if
weights move by 20 percent?).`, { label: 'product:prioritization', phase: 'Product core', schema: DOC_SCHEMA })

const requirements = await sonnet(`${RULES}

Write ${P}/PRODUCT_REQUIREMENTS.md: the product requirements for the first release ("the smallest coherent product" in ${P}/FEATURE_PRIORITIZATION.md)
and the near-term differentiators. Sections: problem and target user (from DECISION_REGISTER); goals and non-goals; success metrics (north star and
activation/retention definitions, measurable, gaming-resistant; take them from the council and strategy files and sharpen them); requirements R-001...
each with the F-id it implements, a user story, acceptance criteria (Given/When/Then), priority (must/should/could), and constraints (performance,
accessibility WCAG 2.2 AA, i18n six languages, privacy by age band, offline/low-bandwidth, devices); the fidelity and honesty requirements (what the
product may claim, BRIEF §10.2 and §17.1); the release gates for this release (BRIEF §32: product completeness, scientific correctness, reliability,
security, performance, accessibility, user value, operational and business readiness), stating which numeric thresholds are set now from measurements
(cite) and which are deferred until baselines exist; out of scope; open questions.`, { label: 'product:requirements', phase: 'Product core', schema: DOC_SCHEMA })

// ---------------------------------------------------------------- Contracts: the documents everything else cites

phase('Contracts')
const contracts = await parallel([
  () => sonnet(`${RULES}

Your ADR range: ADR-0100 to ADR-0199 (files ${A}/ADR/ADR-01NN-<slug>.md, each with Problem, Constraints, Considered options, Decision, Technical
justification, Performance data, Cost implications, Licensing, Security implications, Reversibility, Migration plan, Known limitations; BRIEF §19.6).
Write ${A}/PROJECT_DATA_MODEL.md and the machine-readable JSON Schema ${A}/schemas/project.schema.json (draft 2020-12) for the canonical project document
(BRIEF §8.3, §8.4, audit change D1 and D5). Cover: identity and schemaVersion; owners and permissions; board instances; component instances (referencing
component definitions by id and version); pin definitions; electrical nets as the source of truth (a visual wire references a net connection, never the
other way round: "a visual position must not be confused with an electrical connection"); mechanical relationships and coordinate systems/transforms;
source files (several); simulation configuration; parameters with canonical units (state the unit system); assets; dependencies; saved test cases
(checks); revision history (snapshot plus op log, the op format shared with collaboration, AI proposals and replay per D5); export metadata; provenance and
licensing. Specify stable ids, deterministic serialization (key order, number formatting, canonical JSON), validation rules, size limits, and migration
rules (how schemaVersion upgrades run; how the 38 catalogue items convert: read src/content/schema.ts and scripts/gen-content-index.mjs --emit, and map
every existing type: what is reused unchanged, what changes). Include 3 complete example documents in ${A}/schemas/examples/: an Uno blink project, the
ESP32 environmental monitor from BRIEF §30 (temperature sensor, display, power), and one converted catalogue lesson. Validate the examples against the
schema with a script in scratch (npm ajv) and report the result. Also specify import/export formats and their fidelity losses (BRIEF §8.4).`,
    { label: 'arch:data-model', phase: 'Contracts', schema: DOC_SCHEMA }),

  () => sonnet(`${RULES}

Your ADR range: ADR-0200 to ADR-0299 (format as BRIEF §19.6 lists).
Write ${A}/COMPONENT_SCHEMA.md and ${A}/schemas/component.schema.json (draft 2020-12): the machine-readable component definition (BRIEF §9.2): manufacturer
and model, datasheet source, pins and pin types, voltage/current ratings (manufacturer-stated vs simulation assumption vs experimentally validated, as
separate fields with provenance), protocols, power, dimensions, connectors, electrical behaviour (which solver element or behavioural model implements
it), simulation implementation and fidelity tier, failure thresholds with derivation and source, supported languages/libraries, compatibility rules,
visual assets (the breadboard/figure art and a generic fallback renderer), licence and attribution, version. Then the extension boundary (BRIEF §9.3):
beginner mode (declarative only) and advanced mode (a sandboxed behavioural model): the manifest, the API surface a model may call (pins, time, events,
no network, no DOM), the execution boundary (read 02_RESEARCH/tech/platform-options.md and any RS-15 result; WASM or Worker-in-opaque-iframe), resource
limits, determinism rules, the test harness, versioning and dependency rules, and the review/publishing process (marketplace deferred unless the decision
says otherwise). Convert three real existing parts to this schema as examples in ${A}/schemas/examples/components/ (an LED, the L298N driver and the
MPU-6050; read figures/parts, figures/modules and docs/facts for their data) and validate them with ajv in scratch.`,
    { label: 'arch:component-schema', phase: 'Contracts', schema: DOC_SCHEMA }),

  () => sonnet(`${RULES}

Your ADR range: ADR-0300 to ADR-0399.
Write ${A}/SIMULATION_ARCHITECTURE.md (BRIEF §10 in full): the layer model (shared model and units, event scheduling and clock, digital signals, analog
solver, MCU/firmware runtime, peripheral protocols, mechanical dynamics, flight dynamics, sensors and environment, faults and degradation, instrumentation,
replay and validation): for each layer say what exists today (cite the inventories: src/lib/interp, figures/engine/bench-solve.js, src/lib/flight,
src/lib/drone), what is missing, and the target design with interfaces (TypeScript signatures). The fidelity tiers (educational approximation,
behavioural, firmware-target) and exactly which boards/parts/languages sit in which tier at the first release, using the spike results (RS-03 avr8js,
RS-06 rp2040js, RS-08 MNA vs ngspice, RS-12 Yosys, RS-13 physics) to decide where to adopt open-source engines; the user-facing honesty labels. Determinism
(clock, event ordering, time-step policies, integration methods, seeds, cross-domain synchronization, snapshots, replay, pause/step, execution budgets,
cancellation, divergence detection, numerical tolerances). The circuit solver plan (§10.4: what to keep, the pure-module extraction of D2, transient,
nonlinear devices, convergence, brownouts, per-failure derivation records). Firmware and programming (§10.5): per board family, the execution model and
which APIs/peripherals are realistic; compile paths; debugging (breakpoints, variables, serial, logic analyser, GPIO tracing); limits and isolation (D4).
Instrumentation (§10.6) with "computed by a physical model" vs "approximation" per reading. The fidelity registry format (BRIEF §20.3) as a JSON shape and
its first entries for the existing models. Where execution happens (UI thread, Worker, WASM, server) with measured or estimated costs.`,
    { label: 'arch:simulation', phase: 'Contracts', schema: DOC_SCHEMA }),
])

// ---------------------------------------------------------------- Specs: product specs and remaining architecture in parallel

phase('Specs')
const SPECS = [
  { label: 'product:journeys', files: `${P}/USER_JOURNEYS.md`, task: `BRIEF §18.1: all 12 principal flows (J-01...J-12), each with an exact interaction
specification (screens, controls, keyboard paths), ASCII or Mermaid wireframes, every state (empty, loading, error, offline, success), validation
behaviour, accessibility requirements, the R-ids and F-ids it exercises, and measurable success criteria. Then §18.2 progressive complexity (beginner,
intermediate, advanced views on the same project data). Base the current-product flows on 01_AUDIT/runs/BROWSER_WALK.md.` },
  { label: 'product:studio', files: `${P}/STUDIO_EDITOR.md`, task: `BRIEF §7, §8.1, §8.2: iynk Studio, the original-project editor. Decide one universal
workspace vs specialised editors over shared project data (justify). Project lifecycle (create ... publish) with local-only vs cloud behaviour and the
no-account path. The canvas: every interaction in §8.2 specified (pan/zoom, placement, rotation, snapping, wiring with valid/invalid connection rules
from the component schema, routing, breadboard and schematic views, multiselect, grouping, copy/paste, shortcuts, search, inspector, error highlighting,
simulation overlays, touch). Rendering technology from the RS-01 spike. Undo/redo model on the op log of PROJECT_DATA_MODEL. How lessons become templates
and how existing figures are reused or replaced. Must align with ${A}/PROJECT_DATA_MODEL.md and ${A}/COMPONENT_SCHEMA.md: cite their field names.` },
  { label: 'product:components', files: `${P}/COMPONENT_ECOSYSTEM.md`, task: `BRIEF §9: the component library scope for the first release and after (by
category, with counts and which existing parts carry over), the custom component editor (beginner and advanced modes) as a product, provenance and
licensing of component data (red-team question 19), the marketplace decision (build, defer or reject, with the network-effects argument), moderation,
quality labels and verification. Cite ${A}/COMPONENT_SCHEMA.md.` },
  { label: 'product:education', files: `${P}/EDUCATION.md`, task: `BRIEF §15: learning architecture (lessons, demonstrations, fault diagnosis, partial
projects, challenges, original creations, capstones), assessment that rewards understanding, educator authoring (lessons, assignments, hidden/visible
checks, submissions, rubrics, tracking, classrooms, groups, galleries, exports, LMS/LTI 1.3), school readiness (FERPA, COPPA, GDPR/UK AADC, DPDP by the
age bands the decision serves), and the learning-effectiveness evaluation plan (comprehension, transfer to physical hardware, time to a working project,
debugging competence, retention, confidence, drop-off, long-term completion) with instruments and sample sizes. Sequence what launches when, per the
decision.` },
  { label: 'product:community', files: `${P}/COMMUNITY.md`, task: `BRIEF §16 and §17: publishing, remixes, galleries, templates, attribution, provenance,
challenges; what to do with Build Night, Build Buddies, Build Stories, leaderboards and Solana Proof of Build (keep, gate, freeze or remove, with the
evidence from the audit and council); moderation, privacy, age restrictions, blocking, reporting and abuse controls BEFORE any broad social discovery.
Then the physical-build path (§17): BOM generation, part numbers, datasheets, vendor comparison, regional availability, substitutions, budget
optimisation, wiring and flashing instructions, assembly checklists, test procedures, the reality-gap labels per project, a framework for submitted
real-world validation data, and affiliate/sponsor rules that keep recommendations honest.` },
  { label: 'product:ux', files: `${P}/UX_DESIGN_SYSTEM.md`, task: `BRIEF §18: audit the current visual identity first (src/app/globals.css tokens,
src/components/ui, shell, figures' hand-inked style, light default; screenshots in ${scratch}/audit/browser-walk) and decide what to keep; the design
system for Studio (tokens, components, states, density modes for beginner/advanced, motion and reduced motion, colour independence, focus, target sizes
per WCAG 2.2 AA, the non-drag alternative for wiring), i18n as a core constraint (six languages, terminology dictionaries, RTL readiness, text
expansion), low-bandwidth and low-power behaviour, mobile layout rules, and accessible alternatives for simulation controls that cannot meet AA.` },
  { label: 'arch:system', files: `${A}/SYSTEM_ARCHITECTURE.md and ${A}/ADR/ (range ADR-0001 to ADR-0099)`, task: `BRIEF §19.1, §19.3, §19.4: the concrete
production architecture as a modular monolith in the existing Next.js repo first; every domain in §19.1 (web app, editor, catalogue, simulation
orchestration, firmware runtime, circuit engine, mechanical/flight, AI, persistence, collaboration relay, search, community, education content, billing,
purchasing, notifications, observability, analytics, background jobs, integrations, credential verification): ownership (module path), interfaces,
deployment, and failure behaviour; which workloads run on the UI thread, Workers, WASM, serverless, compute workers, isolated compile workers, GPU (none
unless justified) and persistent services, with cost and security reasoning; storage roles (Postgres, Timescale's existing role, object storage, caches,
queues, search, IndexedDB, snapshots, event logs) avoiding extra databases without need. Name what moves where in the current tree (src/lib/*) and the
order of extraction (from TECHNICAL_DEBT Part D).` },
  { label: 'arch:frontend-backend', files: `${A}/FRONTEND_ARCHITECTURE.md, ${A}/BACKEND_ARCHITECTURE.md and ADRs in range ADR-0400 to ADR-0499`, task: `The
frontend: module structure for Studio and the labs, state management (the store/dispatch pattern of today vs the op log), the editor engine boundary,
Workers and WASM loading, routing and caching under Next 16.4 (read AGENTS.md and node_modules/next/dist/docs/ before naming any Next API), bundle budgets
(from PERFORMANCE_BASELINE), i18n loading, offline (service worker or not), testing seams. The backend: route handlers vs server actions, auth (anonymous
signed sessions then accounts; providers), the projects store, shared rate limiter and usage ledger (D3), background jobs, the compile service if any,
secrets, environments, migrations, observability hooks.` },
  { label: 'arch:api', files: `${A}/API_CONTRACTS.md and ${A}/schemas/openapi.yaml (OpenAPI 3.1)`, task: `BRIEF §19.5: versioned API contracts for
projects, components, simulation runs, assets, import/export, classrooms, sharing, collaboration, AI assistance, user profiles, community publishing,
billing (only if the decision includes it now; otherwise a stub marked deferred), telemetry preferences, data export and deletion. For each endpoint:
method, path (/api/v1/...), auth and permission, request and response schemas (reference schemas/project.schema.json and component.schema.json),
error schema (one shared error envelope), rate limits, pagination, retries, idempotency keys. Map existing routes in src/app/api/** to keep, version or
retire. Validate openapi.yaml with a linter in scratch (npm @redocly/cli lint) and report.` },
  { label: 'arch:realtime', files: `${A}/REALTIME_ARCHITECTURE.md and ADRs in range ADR-0500 to ADR-0599`, task: `BRIEF §14 and §19.5 (WebSocket
schemas): extend rooms to arbitrary projects. Use the RS-09 spike result (server-ordered op log vs CRDT) and the existing relay (server/realtime). Message
schemas with versions, the op format shared with PROJECT_DATA_MODEL, presence and cursors, roles and host permissions, spectators, invite links, team
ownership, reconnection and snapshot semantics, latency, offline edits, version conflicts, audit history; which simulation state is authoritative and where
it runs; what happens when users disagree over run controls, components or code; hosting (the RS-10 question stays open unless answered; single Vultr VM
today) and scaling; authentication of sockets.` },
  { label: 'arch:ai', files: `${A}/AI_ARCHITECTURE.md and ADRs in range ADR-0600 to ADR-0699`, task: `BRIEF §13: the AI lab partner grounded in the
structured project: the context it may read (project, components, wiring graph, code, simulation state, errors, selection, objectives, prior attempts by
retention setting, datasheets, tool docs), how that context is serialised and budgeted in tokens, the tool set, the operation-proposal system (proposals
are ops against a base revision per PROJECT_DATA_MODEL; preview, apply, reject, undo; schema validation; permission checks; logging; attribution),
pedagogical modes (Socratic, beginner, direct, debugging, advanced; no full solutions in guided mode), vendor-neutral adapters, routing, caching,
budgets and free-tier guardrails with ESTIMATED cost per session (cite the AI price research), observability, privacy and minors, and the adversarial test
suite for prompt injection through project names, imported files, chat, and tool outputs. Build on src/lib/ai (preserve what the audit says works).` },
  { label: 'arch:robotics-drone', files: `${A}/ROBOTICS_ARCHITECTURE.md, ${A}/DRONE_ARCHITECTURE.md and ADRs in range ADR-0700 to ADR-0799`, task: `BRIEF
§11 and §12, scoped by the decision (if robotics or drones are deferred, specify the minimum that keeps the existing labs alive and the architecture they
plug into later). Robotics: kinematic trees, joints, rigid bodies, friction, collision, motors and limits, power, sensor noise, control timing, PID,
transforms, odometry, navigation, URDF/SDF import, ROS 2 interop vs native, the engine choice from RS-13, progressive templates. Drones: what the current
calculator and flight model compute (from the audit), the design-to-flight workflow, 6-DoF dynamics, motors/props/battery models, controller, noise,
wind, failures, replay, PX4/ArduPilot SITL as an option (cost and value), safety and responsible use (§12.2 warnings, dual-use limits).` },
  { label: 'arch:diagrams', files: `${A}/SYSTEM_DIAGRAMS.md`, task: `BRIEF §19.2: the ten Mermaid diagrams (system context; container/deployment; module
dependency; project data model; simulation pipeline; AI tool-execution sequence; collaboration synchronization sequence; save/export lifecycle; identity
and access control; physical build/BOM integration). Draw them from the contract documents (${A}/PROJECT_DATA_MODEL.md, COMPONENT_SCHEMA.md,
SIMULATION_ARCHITECTURE.md) and the decisions; read the other 04_ARCHITECTURE files if they already exist, and use the same names. Validate every
diagram's Mermaid syntax with @mermaid-js/mermaid-cli in scratch (npx -p @mermaid-js/mermaid-cli mmdc) and fix errors; report the result.` },
]

const specs = await parallel(SPECS.map(s => () => sonnet(`${RULES}

Write ${s.files}. ${s.task}
The contract documents already exist and are binding for names and fields: ${A}/PROJECT_DATA_MODEL.md, ${A}/schemas/project.schema.json,
${A}/COMPONENT_SCHEMA.md, ${A}/schemas/component.schema.json, ${A}/SIMULATION_ARCHITECTURE.md. Product ids: ${P}/FEATURE_CATALOGUE.md (F-),
${P}/PRODUCT_REQUIREMENTS.md (R-), ${P}/FEATURE_PRIORITIZATION.md (classes). Do not contradict them; if one is wrong, add an "Objections" section.`,
  { label: s.label, phase: 'Specs', schema: DOC_SCHEMA })))

// ---------------------------------------------------------------- Review: clusters, then a cross-document critic, then one fixer per file

phase('Review')
const CLUSTERS = [
  { key: 'contracts', files: `${A}/PROJECT_DATA_MODEL.md, ${A}/schemas/*.json, ${A}/COMPONENT_SCHEMA.md, ${P}/STUDIO_EDITOR.md, ${A}/API_CONTRACTS.md, ${A}/schemas/openapi.yaml` },
  { key: 'simulation', files: `${A}/SIMULATION_ARCHITECTURE.md, ${A}/ROBOTICS_ARCHITECTURE.md, ${A}/DRONE_ARCHITECTURE.md, ${mp}/08_RESEARCH_SPIKES/*/REPORT.md` },
  { key: 'platform', files: `${A}/SYSTEM_ARCHITECTURE.md, ${A}/FRONTEND_ARCHITECTURE.md, ${A}/BACKEND_ARCHITECTURE.md, ${A}/REALTIME_ARCHITECTURE.md, ${A}/AI_ARCHITECTURE.md, ${A}/SYSTEM_DIAGRAMS.md` },
  { key: 'product', files: `${P}/*.md and ${mp}/00_EXECUTIVE/DECISION_REGISTER.md` },
]
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    issues: { type: 'array', items: { type: 'object', properties: {
      what: { type: 'string' }, targetFile: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'high', 'medium', 'low'] }, fix: { type: 'string' },
    }, required: ['what', 'targetFile', 'severity', 'fix'] } },
  },
  required: ['issues'],
}
const clusterReviews = await parallel(CLUSTERS.map(c => () => sonnet(`${RULES}

You are an adversarial reviewer of the ${c.key} cluster: ${c.files}. Find: contradictions between these files (field names, ids, units, op formats,
endpoints, states), specs that ignore the decision register, claims without evidence or with inflated labels, numbers not traceable to a spike or
measurement, missing required content from the BRIEF sections each file answers, untestable acceptance criteria, security or privacy gaps, things a
separate implementation agent could not build without guessing. Do NOT edit files. Return every issue with the ONE file that must change and the exact
fix.`, { label: `review:${c.key}`, phase: 'Review', schema: REVIEW_SCHEMA })))

const crossCritic = await sonnet(`${RULES}

You are the cross-document critic for 03_PRODUCT and 04_ARCHITECTURE. Read every file in ${P} and ${A} (including ADR/ and schemas/). Against BRIEF
§7-§19 and §34 items 6-11, list: required content that is absent; a feature with no spec; a spec with no feature; any two documents that disagree;
ADR numbering collisions or ADRs missing required fields; JSON Schemas that do not match their documents; the BRIEF §30 walkthrough (ESP32 environmental
monitor; a robotics and a drone example) steps that the architecture cannot support yet. Do NOT edit files. Return each issue with the ONE file that must
change and the exact fix.`, { label: 'critic', phase: 'Review', schema: REVIEW_SCHEMA })

const allIssues = [...clusterReviews.filter(Boolean).flatMap(r => r.issues), ...(crossCritic?.issues ?? [])].filter(i => i.severity !== 'low')
const byFile = {}
for (const i of allIssues) (byFile[i.targetFile] = byFile[i.targetFile] || []).push(i)
log(`Review: ${allIssues.length} blocker/high/medium issues across ${Object.keys(byFile).length} files`)

const fixes = await parallel(Object.entries(byFile).map(([file, list]) => () => sonnet(`${RULES}

You fix review issues in ${file}; you are the only agent editing it. Issues:
${list.map((i, n) => `${n + 1}. [${i.severity}] ${i.what}\n   Fix: ${i.fix}`).join('\n')}
Apply each fix with evidence (read the other documents named; keep names consistent with the contract documents). If an issue is wrong, do not apply it:
say why in the log. Append "## Review fixes (${today})" listing each issue and what you did.`,
  { label: `fix:${file.split('/').pop()}`, phase: 'Review', schema: DOC_SCHEMA })))

return { catalogue, prioritization, requirements, contracts, specs, issues: allIssues.length, byFile: Object.fromEntries(Object.entries(byFile).map(([f, l]) => [f, l.length])), fixes }
