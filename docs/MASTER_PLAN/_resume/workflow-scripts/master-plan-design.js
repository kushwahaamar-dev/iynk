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

const RULES = `You are on the team specifying iynk for its build (repo ${repo}). The assignment is ${mp}/BRIEF.md; read the sections your task names.
The DECISIONS are binding: ${mp}/00_EXECUTIVE/DECISION_REGISTER.md, starting with its section "Current decisions: the build reframe", which overrides
the older strategy decisions below it. If you believe a decision is wrong, say so in an "Objections" section with evidence, but still write the spec for
the decided direction. In short:
- D-013 purpose: a complete open-source hardware lab that Amar uses himself with his friends. Do not plan around customers, markets, pricing, paid
  tiers, classrooms, schools or institutions. Engineering quality, completeness and the full workflow (imagine, design, assemble, wire, program,
  simulate, debug, learn, collaborate, build for real) decide priorities.
- D-014 build order, core first: B0 foundation (security fixes, CI, open-source basics, bring-your-own keys, extras removed); project core (canonical
  project document, netlist independent of the drawing, solver and code runtime off the main thread, local save and load); Studio editor (Uno first,
  then all boards); collaboration with buddies; simulation fidelity (real-chip engines where the spikes say so, debugger, replay); faults and
  diagnose-first on any circuit; components and custom parts; the existing Board, Robotics and Drone labs moved into Studio as projects and templates; an
  AI partner that works on the project through reviewable operations; robotics creation (physics); drone creation (design to flight); export and
  physical build.
- D-015 local-first and self-hostable: the browser holds projects (IndexedDB plus project files on disk); an optional self-hostable server with one
  documented setup provides rooms, share links and buddies. AI and search use keys the user brings. Nothing depends on Vercel, Amar's paid keys or any
  paid service.
- D-016 remove Build Stories, Build Night and the Solana Proof of Build (wallet, mint, faucet, passport, the solana/ program). Keep Build Buddies, rebuilt
  as friends who find each other and work on the same project together; keep a leaderboard only among buddies.
- D-017 licence decided later (placeholder file); content copied from the three third-party sites must be checked or rewritten before publishing.
- Kept: D-007 honest fidelity labels ("What it models", "not modelled yet", never "validated"); D-010 one shared diagnosis record {cause_id, symptom_id,
  evidence, hint_level}; D-011 performance on low-end devices as an engineering budget; the SECURITY_BASELINE fixes, because the code is public.
- Shelved, do not plan around: beachhead, funding, pricing, north star, classroom and school compliance (D-001, D-003, D-004, D-008, D-009).

Evidence you build on (cite by path; do not re-derive what they establish):
- Audit: ${mp}/01_AUDIT/ (FEATURE_VERIFICATION, TECHNICAL_DEBT with A1-A13 and the five structural changes D1-D5, SECURITY_BASELINE,
  PERFORMANCE_BASELINE, TEST_COVERAGE, REPOSITORY_INVENTORY, inventory/*.md per subsystem, runs/*.md incl. BROWSER_WALK).
- Research: ${mp}/02_RESEARCH/ (COMPETITOR_LANDSCAPE, COMPETITOR_MATRIX, USER_SEGMENTS, USER_RESEARCH_PLAN, MARKET_ANALYSIS, TECHNICAL_RESEARCH,
  tech/*.md, competitors/*.md).
- Background only: ${mp}/00_EXECUTIVE/council/*.md has useful engineering views (cto-platform, fidelity, robotics-aero, ai, security-privacy). The
  business files in ${mp}/06_BUSINESS/ are shelved and do not steer the build.
- Spikes with measured results: ${mp}/08_RESEARCH_SPIKES/*/REPORT.md (if a spike was INCONCLUSIVE, design so the decision stays reversible). The spikes
  are still running while you work. If a spike's REPORT.md is missing or has no "Verdict" yet, do not wait and do not guess its result: write the options,
  the decision rule taken from the spike's exit condition in 02_RESEARCH/TECHNICAL_RESEARCH.md section 6, and mark the choice "PENDING RS-xx". A later pass
  folds the results in.
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

${P}/FEATURE_CATALOGUE.md already exists; it was written before the reframe. Revise it in place and keep every existing F-id stable. Changes:
mark Build Stories, Build Night and the Solana Proof of Build features REMOVED (D-016) and name the code that must be deleted; rewrite Build Buddies as
friends who find each other and edit the same project together, and the leaderboard as buddies-only; mark classroom, school, billing, pricing and other
market-only features OUT OF SCOPE (shelved, D-013) rather than deleting them; add with new ids anything the full workflow needs that is missing (local-first
project storage and project files, the self-hostable server and its setup, bring-your-own AI and search keys, removing telemetry or making it opt-in,
open-source docs, the licence placeholder, rewriting third-party content); replace any "which segment" column with "used by" (solo, with buddies). Check
that every existing feature in 01_AUDIT/FEATURE_VERIFICATION.md and every capability in BRIEF §7-§18 still has an id. Append "## Reframe changes
(${today})" listing what changed.`,
  { label: 'product:catalogue', phase: 'Product core', schema: DOC_SCHEMA })

const prioritization = await sonnet(`${RULES}

Write ${P}/FEATURE_PRIORITIZATION.md (BRIEF §25, adapted to the reframe) over every feature in ${P}/FEATURE_CATALOGUE.md. Scoring criteria (no market
or money criteria, D-013): value to the full workflow for Amar and his friends; how foundational it is (how many other features depend on it); technical
feasibility on this codebase; impact on simulation accuracy; security and privacy risk; engineering effort; dependency complexity; maintenance burden;
performance cost on low-end devices. State the scale (1-5, with what 1 and 5 mean for each), the weights and why, and an uncertainty grade per row.
Classify each feature: REQUIRED FOUNDATION, CORE WORKFLOW, NEAR-TERM, LATER, LONG-TERM RESEARCH, REMOVED, OUT OF SCOPE, with a one-line reason. Assign
every kept feature to one build phase of D-014 (B0 foundation, project core, Studio editor, collaboration, fidelity, faults, components, labs moved in,
AI partner, robotics, drones, export and physical build). Provide the full matrix (one table, all rows), then "Milestone 1, the smallest coherent Studio":
the exact F-ids that let Amar start a project from scratch, place an Uno and parts, wire them, write code, run it with serial output, save, close,
reopen, and open the same project with a buddy; say why it is coherent. Then a sensitivity check (do the classes change if weights move by 20 percent?).`, { label: 'product:prioritization', phase: 'Product core', schema: DOC_SCHEMA })

const requirements = await sonnet(`${RULES}

Write ${P}/PRODUCT_REQUIREMENTS.md: the requirements for every build phase of D-014, in order. Full detail for B0 foundation, the project core, the
Studio editor (Milestone 1 in ${P}/FEATURE_PRIORITIZATION.md) and collaboration with buddies; solid but shorter for the later phases (fidelity, faults,
components, labs moved in, AI partner, robotics, drones, export and physical build), enough that each later phase can be planned without guessing.
Sections: what iynk is for (D-013); goals and non-goals per phase; engineering success measures in place of market metrics (performance budgets,
determinism and replay, correctness against reference circuits and the spike results, test and accessibility pass rates); requirements R-001... each with
the F-id it implements, a user story written for Amar or a buddy, acceptance criteria (Given/When/Then), priority (must/should/could), and constraints
(performance on low-end devices, accessibility WCAG 2.2 AA, i18n (the six-language interface stays; new strings go through the existing i18n pipeline),
local-first and offline behaviour, self-hosting, bring-your-own keys, devices); the fidelity and honesty requirements (BRIEF §10.2 and §17.1); the
release checks per milestone (BRIEF §32 items product completeness, scientific correctness, reliability, security, performance, accessibility and
operational readiness for a self-hosted install; no business readiness), stating which thresholds come from measurements (cite) and which are proposals;
out of scope; open questions.`, { label: 'product:requirements', phase: 'Product core', schema: DOC_SCHEMA })

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
workspace vs specialised editors over shared project data (justify). Project lifecycle (create, save, open, fork, share with a buddy, export) with local-first
storage and the optional self-hosted server (D-015). The canvas: every interaction in §8.2 specified (pan/zoom, placement, rotation, snapping, wiring with valid/invalid connection rules
from the component schema, routing, breadboard and schematic views, multiselect, grouping, copy/paste, shortcuts, search, inspector, error highlighting,
simulation overlays, touch). Rendering technology from the RS-01 spike. Undo/redo model on the op log of PROJECT_DATA_MODEL. How lessons become templates
and how existing figures are reused or replaced. Must align with ${A}/PROJECT_DATA_MODEL.md and ${A}/COMPONENT_SCHEMA.md: cite their field names.` },
  { label: 'product:components', files: `${P}/COMPONENT_ECOSYSTEM.md`, task: `BRIEF §9: the component library scope for the first release and after (by
category, with counts and which existing parts carry over), the custom component editor (beginner and advanced modes) as a product, provenance and
licensing of component data (red-team question 19), sharing custom parts with buddies (a public marketplace is out of scope, D-013),
quality labels and verification. Cite ${A}/COMPONENT_SCHEMA.md.` },
  { label: 'product:education', files: `${P}/EDUCATION.md`, task: `BRIEF §15, adapted to D-013 (self-directed learning for Amar and his friends; no
classrooms, schools, LMS or compliance work): how the existing 71 lessons, 31 bench tasks, 461 checks and 250 faults move onto the project core as guided
projects and templates (what converts automatically, what needs rework); guided mode on any project (steps, hidden and visible checks as predicates over
the simulated run, hints); diagnose-first fault practice (symptom shown, cause hidden, hint ladder, fix, explanation) using the D-010 diagnosis record;
a pass that needs a real edit; challenges and partial projects that buddies can share; self-assessment and progress kept locally; and which content must
be checked or rewritten because it came from the three third-party sites (D-017). Sequence it against the D-014 build phases.` },
  { label: 'product:community', files: `${P}/COMMUNITY.md`, task: `BRIEF §16 and §17, adapted to D-013 and D-016. Buddies: how friends find each
other on a self-hosted server (lightweight identity without email; invite links or codes), buddy lists visible only to buddies (the audit found a public
list of strangers' profiles, SECURITY_BASELINE D1), sharing a project with a buddy, editing it together (with REALTIME_ARCHITECTURE), forks and remixes
with attribution, templates; the buddies-only leaderboard (what it ranks, so it rewards building rather than grinding); blocking and leaving; what is
removed (Build Stories, Build Night, the Solana Proof of Build) and the exact code paths to delete. No public discovery, galleries for strangers or
moderation teams. Then the physical-build path (§17): BOM generation from the project, part numbers, datasheets, substitutions, budget, wiring and
flashing instructions, assembly checklists, test procedures and reality-gap labels per project; parts prices only through a search key the user brings
(the audit found live pricing CONTRADICTED), with no affiliate links.` },
  { label: 'product:ux', files: `${P}/UX_DESIGN_SYSTEM.md`, task: `BRIEF §18: audit the current visual identity first (src/app/globals.css tokens,
src/components/ui, shell, figures' hand-inked style, light default; screenshots in ${scratch}/audit/browser-walk) and decide what to keep; the design
system for Studio (tokens, components, states, density modes for beginner/advanced, motion and reduced motion, colour independence, focus, target sizes
per WCAG 2.2 AA, the non-drag alternative for wiring), i18n as a core constraint (six languages, terminology dictionaries, RTL readiness, text
expansion), low-bandwidth and low-power behaviour, mobile layout rules, and accessible alternatives for simulation controls that cannot meet AA.` },
  { label: 'arch:system', files: `${A}/SYSTEM_ARCHITECTURE.md and ${A}/ADR/ (range ADR-0001 to ADR-0099)`, task: `BRIEF §19.1, §19.3, §19.4, adapted to D-015: a
local-first application in the existing Next.js repo (a modular monolith) plus one optional self-hostable server. Every domain that survives the reframe
(web app, editor, catalogue and templates, simulation orchestration, firmware runtime, circuit engine, mechanical and flight, AI with bring-your-own keys,
local persistence, the self-hosted server for rooms, share links and buddies, search with a user key, observability for a self-hoster): ownership (module
path), interfaces, deployment and failure behaviour. Billing, purchasing, credentials and analytics are out (D-013, D-016). Which workloads run on the UI
thread, Workers, WASM or the server, with security reasoning. Storage roles: IndexedDB and project files in the browser; on the server the smallest store
that works (justify SQLite versus Postgres for a friends-sized install; Tiger and Timescale stop being required). Packaging: one documented self-host
setup (for example a container compose file) and how the app runs with no server at all. Name what moves where in the current tree (src/lib/*), what is
deleted (D-016), and the order of extraction (TECHNICAL_DEBT Part D).` },
  { label: 'arch:frontend-backend', files: `${A}/FRONTEND_ARCHITECTURE.md, ${A}/BACKEND_ARCHITECTURE.md and ADRs in range ADR-0400 to ADR-0499`, task: `The
frontend: module structure for Studio and the labs, state management (the store/dispatch pattern of today vs the op log), the editor engine boundary,
Workers and WASM loading, routing and caching under Next 16.4 (read AGENTS.md and node_modules/next/dist/docs/ before naming any Next API), bundle budgets
(from PERFORMANCE_BASELINE), i18n loading, offline (service worker or not), testing seams. The backend (the optional self-hosted server, D-015): route handlers versus a
separate server process, lightweight buddy identity (no email; invite codes; signed tokens), the shared-project and share-link store, a rate limiter
for the server's own endpoints, how bring-your-own AI and search keys are held (in the browser or proxied, with the security trade-off), the compile
service if the spikes need one, secrets, environments, migrations, observability hooks for a self-hoster.` },
  { label: 'arch:api', files: `${A}/API_CONTRACTS.md and ${A}/schemas/openapi.yaml (OpenAPI 3.1)`, task: `BRIEF §19.5, adapted to D-015 and D-016: versioned API
contracts for the optional self-hosted server: buddy identity and invites, buddies, shared projects and share links, collaboration rooms, assets,
import and export, AI and search proxies if the architecture keeps any, data export and deletion. No classrooms, billing, credentials or public
community publishing. For each endpoint:
method, path (/api/v1/...), auth and permission, request and response schemas (reference schemas/project.schema.json and component.schema.json),
error schema (one shared error envelope), rate limits, pagination, retries, idempotency keys. Map existing routes in src/app/api/** to keep, version or
retire. Validate openapi.yaml with a linter in scratch (npm @redocly/cli lint) and report.` },
  { label: 'arch:realtime', files: `${A}/REALTIME_ARCHITECTURE.md and ADRs in range ADR-0500 to ADR-0599`, task: `BRIEF §14 and §19.5 (WebSocket
schemas): extend rooms to arbitrary projects. Use the RS-09 spike result (server-ordered op log vs CRDT) and the existing relay (server/realtime). Message
schemas with versions, the op format shared with PROJECT_DATA_MODEL, presence and cursors, roles and host permissions, spectators, invite links, team
ownership, reconnection and snapshot semantics, latency, offline edits, version conflicts, audit history; which simulation state is authoritative and where
it runs; what happens when users disagree over run controls, components or code; hosting as part of the self-hosted server (D-015) for a friends-sized group,
and how invite-only rooms for buddies replace public rooms; fixes for the reproduced host takeover and room flooding (SECURITY_BASELINE R3, R4);
authentication of sockets with the buddy identity.` },
  { label: 'arch:ai', files: `${A}/AI_ARCHITECTURE.md and ADRs in range ADR-0600 to ADR-0699`, task: `BRIEF §13: the AI lab partner grounded in the
structured project: the context it may read (project, components, wiring graph, code, simulation state, errors, selection, objectives, prior attempts by
retention setting, datasheets, tool docs), how that context is serialised and budgeted in tokens, the tool set, the operation-proposal system (proposals
are ops against a base revision per PROJECT_DATA_MODEL; preview, apply, reject, undo; schema validation; permission checks; logging; attribution),
pedagogical modes (Socratic, beginner, direct, debugging, advanced; no full solutions in guided mode), vendor-neutral adapters with keys the user brings (D-015;
at least one local-model option if feasible), routing, caching, a per-user spend cap the user sets, ESTIMATED cost per session (cite the AI price
research), observability, privacy, and the adversarial test
suite for prompt injection through project names, imported files, chat, and tool outputs. Build on src/lib/ai (preserve what the audit says works).` },
  { label: 'arch:robotics-drone', files: `${A}/ROBOTICS_ARCHITECTURE.md, ${A}/DRONE_ARCHITECTURE.md and ADRs in range ADR-0700 to ADR-0799`, task: `BRIEF
§11 and §12 in full: robotics and drones are not frozen any more (D-014 builds robotics creation and drone creation as later phases, after the existing
labs move into Studio). Robotics: kinematic trees, joints, rigid bodies, friction, collision, motors and limits, power, sensor noise, control timing, PID,
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
