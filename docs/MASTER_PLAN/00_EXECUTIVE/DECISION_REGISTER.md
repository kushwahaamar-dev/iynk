# Decision register

Written 2026-10-27 by the orchestrating agent from the strategy step: eight council memos (`00_EXECUTIVE/council/*.md`),
three strategy advocates and four independent judges (`06_BUSINESS/strategy-options/*.md`). Every later document in this
plan (product, architecture, roadmap, business, handoff) builds on these decisions. If a decision changes, change it here
first, with the date and the evidence, and then update the documents that depend on it.

Status values: **Decided** (the plan builds on it now), **Founder sign-off needed** (the plan builds on it, but it overrides
something the founders said, so Amar should confirm), **Pending evidence** (a named spike or experiment settles it).

Evidence labels follow the brief: VERIFIED, DOCUMENTED, EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN. No user has been
interviewed yet, so every statement about demand is a HYPOTHESIS until the user research plan runs
(`02_RESEARCH/USER_RESEARCH_PLAN.md`).

## Current decisions: the build reframe (Amar, 2026-10-27)

**Read this section first. It overrides the strategy decisions below wherever they disagree.**

Amar reframed the work after the strategy step: build iynk as a full open-source application that he uses himself with his
friends. Do not plan around customers, markets, pricing or paid tiers. He will return to the startup question after
everything is built. The strategy documents (`06_BUSINESS/`, `00_EXECUTIVE/council/`) stay as reference for that later
decision; they no longer steer the build.

| ID | Decision | Status |
|---|---|---|
| D-013 | Purpose: a complete open-source hardware lab for Amar and his friends. Engineering quality, completeness and the founders' full workflow (imagine, design, assemble, wire, program, simulate, debug, learn, collaborate, build for real) decide priorities, not market evidence. | Decided by Amar |
| D-014 | Build order, core first: B0 foundation; project core; Studio editor; collaboration with buddies; simulation fidelity; faults on any circuit; components; existing labs moved into Studio; AI partner; robotics creation; drone creation; export and physical build. Each build phase stops for Amar's OK; he may reorder or cut phases at any stop. | Decided by Amar |
| D-015 | Local-first and self-hostable. The app runs in the browser with projects kept locally (browser storage plus project files on disk). An optional self-hostable server provides rooms, share links and buddies, and anyone can run it (one documented setup). AI and search use keys the user brings; nothing depends on Amar's paid keys. | Decided by Amar |
| D-016 | Hackathon extras: remove Build Stories, Build Night and the Solana Proof of Build (wallet UI, mint and faucet routes, passport panel, the `solana/` program; git history keeps them). Keep Build Buddies and rebuild it as the friends feature: find your buddies and work on the same project together. Keep the leaderboard only among your buddies; no public board of strangers. | Decided by Amar (leaderboard scope by the orchestrator) |
| D-017 | Licence: decided later by Amar. The build leaves a clearly marked placeholder. Before the repo is published as open source, the content copied from the three third-party sites (lessons, timings, formulas, drone constants) must be checked and rewritten where needed. | Decided by Amar |
| D-018 | Identity and enrolment on the self-hosted server: a person is a P-256 key pair made in the browser; they enrol once with an operator-issued one-time code, sign a server challenge, and receive an opaque 12-hour bearer token. No email, no password, no profile. | Decided by orchestrator, Amar may overrule |
| D-019 | Server store: one SQLite file behind a `ServerStore` port (ADR-0004, ADR-0422). A Postgres adapter is optional and later. | Decided by orchestrator, Amar may overrule |
| D-020 | AI keys: the person's key lives in browser storage, or is sent per call through their own server's stateless relay. A key is never stored by the server and never enters a project, export, share, room, log or event. | Decided by orchestrator, Amar may overrule |
| D-021 | Share links are off by default per project and, when made, are immutable read-only snapshots with an expiry that the owner can revoke. | Decided by orchestrator, Amar may overrule |

How the earlier decisions stand now:

| ID | Status after the reframe |
|---|---|
| D-001 beachhead | Shelved until the startup question |
| D-002 Fault Lab first | Replaced by D-014 (core first). Diagnose-first faults and save, share and export are still built, on the new core |
| D-003 funding | Shelved |
| D-004 audience | Shelved for the build. Security and privacy fixes still apply because the code is public and runs for friends |
| D-005 Step 0 | Kept as build phase B0, reframed: security fixes, CI, open-source basics (README, CONTRIBUTING, self-hosting guide, licence placeholder), bring-your-own keys, telemetry removed or opt-in, honest copy, bundle cleanup |
| D-006 freeze | Replaced. Robotics and drone labs are no longer frozen (they become real creation in later phases). Extras per D-016. The social layer comes back as buddies and invite-only rooms once the room takeover and flooding holes are fixed |
| D-007 honest fidelity labels | Kept: tier labels, "What it models", "not modelled yet". The real-board check now comes before Amar relies on the diagnosis claims, not before a pilot |
| D-008 free core and paid tiers | Shelved; nothing is paid |
| D-009 north star | Shelved |
| D-010 architecture | Kept and now leads: the project document, netlist, solver and runtime are built first. Spikes folded in (see D-010 below) |
| D-011 low-end devices | Kept as an engineering target: device-throttle and slow-link budgets (PRD BUD-01 to BUD-15), no partner study |
| D-012 the plan ends in a build | Kept; the business and handoff documents stay dropped. Its phase list (Step 0, Fault Lab, Studio) is replaced by the D-014 order |

## Strategy decisions (2026-10-27, before the reframe)

| ID | Decision | Status |
|---|---|---|
| D-001 | Beachhead: lecturers of first and second year electronics and embedded courses at US community and four-year colleges, then Indian engineering colleges with sponsored seats. Adults first. | Decided |
| D-002 | Primary strategy: a staged hybrid. Fault Lab first (strategy C), then the original-project Studio built straight after it (strategy A), the classroom layer kept thin until a buyer pays (strategy B). The spikes still pick Studio's technology; the human evidence gates run after the build as validation. | Decided by Amar, 2026-10-27 |
| D-003 | Funding: grants, sponsored seats and bootstrap for months 0 to 18. No venture raise until the gates in STARTUP_STRATEGY section 6 are met. | Decided |
| D-004 | Audience: terms say 13+. First wave is adults and university students. No service aimed at under-13s in the planning horizon. High school only after counsel's answer and a data processing agreement. | Decided |
| D-005 | Step 0 before any feature: security blockers, closed paid routes, a spend ledger, telemetry off by default, CI, a LICENSE and a counsel answer on content provenance, honest public copy. | Decided |
| D-006 | Freeze: drone and robotics labs stay as content, Solana stays on devnet and is not extended, no marketplace or SDK, no new languages, no new AI features, and the social layer (public rooms, chat, voice, buddies, stories, leaderboard) is off at relaunch. | Decided |
| D-007 | Fidelity: iynk calls its simulation a teaching model. It says "not modelled yet" instead of guessing, never says "validated", and checks 10 faults on a real board before Amar relies on the diagnosis claims (the pilot is shelved). | Decided |
| D-008 | Free core promise: running, editing, saving, sharing and exporting are never paid. Money comes from institution administration and metered compute. | Decided |
| D-009 | North star for phase 1: weekly learners with a verified diagnosis, reported with reach guardrails. The founders' broader north star becomes the phase 2 target once server replay and projects exist. | Decided |
| D-010 | Architecture: the codebase is a prototype to mine. A shared diagnosis record ships in phase 1; the Studio core (project document, netlist, orchestrator) is built first under D-014. Solver and editor choices follow the spikes. | Decided; spikes folded in (2026-10-27) |
| D-011 | Low-end devices as an engineering target: budgets on a throttled CPU and a slow link (PRD BUD-01 to BUD-15). The learner-study gate is dropped (D-004, D-009 shelved). | Decided; rewritten for the reframe |
| D-012 | The plan ends in a build. Agents build in phases, stopping after each phase for Amar's OK (phase order now D-014; the Step 0, Fault Lab, Studio list was the pre-reframe order). The remaining business documents and the handoff pack are dropped. | Decided by Amar, 2026-10-27 |

## D-001. Beachhead segment

**Decision.** The first customer is the lecturer or lab coordinator who runs a first or second year electronics or embedded
course where lab time or parts are scarce. Wave 1 is US community and four-year colleges. Wave 2 is Indian engineering
colleges, funded by sponsored seats. Students use iynk free. US high-school CTE comes third, after D-004's conditions.

**Who is who** (brief section 6.3; all HYPOTHESIS until interviews E1 and E8 run):

| Role | Who | Evidence |
|---|---|---|
| Uses the free product | Students in those courses, plus individual makers stuck on a circuit | USER_SEGMENTS segments 2 and 9 |
| Benefits financially | The department (less lab time and fewer burnt parts per student), the student (no kit needed to practise) | HYPOTHESIS; no lab-cost data gathered |
| May eventually pay | The department or lab budget, per course per term; grants and CSR sponsors for Indian and low-income seats | MARKET_ANALYSIS section 6; which fund pays is UNKNOWN |
| Influences adoption | The lecturer and TAs first, then the lab manager, then an IT or privacy officer who can veto | strategy-options/B-classroom.md; HYPOTHESIS |
| Drives organic distribution | The lecturer who puts the link in a syllabus each term; students who pass it to the next cohort | HYPOTHESIS; course repeat untested |

**Why.**
- USER_SEGMENTS scores segment 9 (universities and maker labs) highest at 26 of 35. The scores are judgement, evidence
  strength 3 or below, and segment 9 leads mainly because Wokwi already charges it a list price (Wokwi Classroom EUR 30 per
  student per semester, EXTERNAL). That shows willingness to pay for Wokwi, not for iynk.
- All four judges put university and adult learners first because minors' data is the most expensive compliance work
  (`00_EXECUTIVE/council/security-privacy.md`).
- The recurring problem is concrete: students cannot find why a circuit does not work, and lab time is short. It recurs
  every term. iynk's one tested edge is explaining wiring faults (WORKFLOW_BENCHMARK task 4: Wokwi and Falstad showed no
  warning text for the three standard faults, TESTED).

**Rejected or deferred.**

| Alternative | Verdict | Reason |
|---|---|---|
| Robotics clubs and mentors (segment 5, 25 of 35) | Rejected for wave 1 | Most FIRST and VEX members are minors; the Robotics Lab is 13 electronics benches, not robots (`council/robotics-aero.md`, VERIFIED grep). A gap fixer proposed this beachhead before the strategy step; that draft is kept at `/Users/amar/iynk-master-plan-scratch/strategy/POSITIONING.gapfix-draft.md`. Revisit when a university club asks in writing. |
| Self-taught makers (segment 4, 24 of 35) | Served free, not sold to | Episodic use, no budget, and demand for original projects is indirect (strategy A's own risk list). They are Studio's users in phase 2. |
| High-school students and CTE teachers (segments 1 and 8) | Deferred to wave 3 | Needs counsel's opinion on pseudonymous class data for under-18s, a DPA and accessibility work (USD 17k to 65k legal and audit cash, ESTIMATED, `council/security-privacy.md`). |
| Learners in low-resource regions (segment 12) | Served free; tested at every gate (D-011) | Highest user-value score, least evidence, no payer. |
| Drone hobbyists, advanced engineers (segments 6 and 10) | Not targeted | FPV pilots already buy simulators for about USD 20; advanced engineers need fidelity iynk does not have (`council/fidelity.md`). |

**Kill or revisit.** Revisit if fewer than 2 of 10 lecturers name student debugging or lost lab time as a top-3 pain
(experiment E1), or if 15 lecturers or departments are asked and none agrees to a pilot within 6 months.

## D-002. Primary market-entry strategy

**Decision.** Staged hybrid, in this order:

1. **Phase 0 (weeks 0 to 2, no feature code).** Step 0 trust work (D-005) and the evidence sprint: test Tinkercad and Velxio
   by hand on the three standard faults (E0, one day), 10 lecturer and TA conversations (E1), a read-only pull of existing
   telemetry, a syllabus-fit check of 10 real course syllabi, a priced waitlist with no payment taken, and a counsel brief
   on provenance.
2. **Phase 1, Fault Lab v0 (about weeks 2 to 12).** On the existing Uno R3 catalogue: diagnose-first Break it (the learner
   sees the symptom with the cause hidden, picks a diagnosis, uses a logged three-step hint ladder, fixes it, answers one
   transfer question), 40 reviewed items, a pass that needs one real edit and one answer, autosave, fork, an unlisted
   share link and export (.ino, wiring table, project file) for catalogue items, a "What it models" panel and tier label,
   and a minimal class code with pseudonyms and a CSV for the lecturer. No accounts, no AI, no networked features. English
   first. Before the pilot: a real-board check of 10 faults (E4).
3. **Pilot (one lecturer, one course, one term).** Done means 25 or more students, 60 percent finishing 5 or more
   exercises, and the lecturer saying in writing they would use it next term.
4. **Studio gate (about weeks 8 to 12, in parallel with the pilot).** Commit to the original-project builder (Studio,
   brief section 7) only if the three spikes pass: RS-01 editor rendering (p95 under 20 ms at 500 parts and 1,000 wires),
   RS-08 solver against ngspice (18 of 20 circuits within 2 percent), and 50 public beginner sketches through the
   interpreter (40 of 50 run). Plus interviews show lecturers or makers want it. If RS-01 fails on low-end devices, make an
   explicit desktop-first decision rather than silently excluding weak devices.
5. **Classroom layer.** Teacher accounts, dashboards, LMS and a DPA are built only when a budget holder asks for a quote or
   a purchase order.

**Why.** All four judges scored strategy C highest (investor 27, educator 27, engineer 26, mission 26; A scored 22, 19, 22,
22; B scored 22, 23, 21, 22). Each judge recommended C first, and three of four named A as the destination. The engineer
judge's point decides the order: B's first milestone and C's v0 are nearly the same product, and A's builder is what
both need in their second phase, so the real question was sequence. C is the cheapest route to decisive evidence
(Phase 1 ESTIMATED at 11 / 17.5 / 29 engineer-weeks, best / expected / adverse) and reuses the most existing code (the
FailureMode type, 250 authored faults, the interpreters, the figure bridge).

**Why founder sign-off is needed.** The founders' vision (BRIEF.md; `docs/handoff/CONTEXT.md`) makes original projects a
first-class capability. This decision puts the original-project builder second, behind a gate. The council's reasons:
demand for original projects is only indirectly evidenced, it is the most expensive item (A ESTIMATED at 27 / 43 / 72
engineer-weeks), unguided building is the wrong condition for novices (`council/product-learning.md`, worked-example
literature, EXTERNAL), and three untested technical assumptions could each sink it. The plan still designs Studio in
full (steps 4 and 5) so it is ready to build the day the gate passes. Amar can overrule this; if so, the roadmap swaps
phases 1 and 2 and the gate spikes become phase 1 blockers.

**Amar's decision (2026-10-27).** Keep Fault Lab first, then build Studio straight after it without waiting for
interviews, the real-board check or the pilot. What changes from the sequence above:
- The Studio gate keeps only its technical part: RS-01 picks the editor rendering technology, RS-08 decides whether the
  solver is kept, wrapped or replaced, and the 50-sketch interpreter coverage test decides whether a compile path is
  needed. A failed spike changes how Studio is built, not whether.
- The human evidence (E0 hand test, lecturer interviews, the 10-fault real-board check, the pilot, counsel) moves from
  "before building" to "validation after building". Amar runs it. Until it has run, the public-claim limits in D-007 and
  POSITIONING section 6 still apply, and the kill criteria below still apply when the evidence arrives.
- The classroom layer stays thin, as above.

**Rejected or deferred.**

| Alternative | Verdict | Reason (judges' fatal flaws) | Revisit trigger |
|---|---|---|---|
| A first: Studio builder as the opening product | Deferred to the gate | Differentiator unproven on circuits the authors never saw; Velxio already warns before a run (TESTED); editor may miss the phone and Chromebook budget (lesson first load already 701 KB gzip, `01_AUDIT/PERFORMANCE_BASELINE.md`); no revenue for 18 months or more | RS-01, RS-08 and interpreter coverage pass, and interviews show demand |
| B first: classroom platform | Deferred, kept thin | Buyer never interviewed; compliance and sales cost exceed realistic revenue (about USD 150k ceiling against USD 25k to 55k a year compliance); a dashboard over pass-on-open lessons shows hollow green boxes | A budget holder asks for a quote or purchase order |
| C as the end state | Rejected | Narrows the mission to one verb; faults are hand-bound to 38 figures and the corpus does not transfer to user circuits | Not applicable |
| Positioning draft from the gap-fix agent (C plus robotics clubs) | Superseded | Picked before the council and judges ran | Not applicable |

**Kill criteria** (from strategy C, adopted):
- E0 shows Tinkercad or Velxio already explains cause and fix with a visual for the three standard faults and offers classes.
- Fewer than 2 of 10 lecturers name debugging or lost lab time as a top-3 pain.
- Two or more of 10 real-board checks contradict the simulated symptom and the fix needs an engine rewrite: pause all
  instructional claims.
- Authoring takes more than 4 hours per reviewed item.
- After 12 months, fewer than 3 courses use it in a second term and fewer than 3 institutions say in writing they would
  pay: convert to an open, grant-funded project.
- A rights holder of the three original sites objects and the licence question cannot be resolved.

## D-003. Funding model

**Decision.** Plan as a grant-funded mission organisation with a revenue line. Months 0 to 18: founders' time, grants
(NSF SBIR, Erasmus+, India CSR; eligibility UNKNOWN for these founders and this entity), sponsored seats. No venture raise
until the gates in STARTUP_STRATEGY section 6 are met.

**Why.** Base-case serviceable revenue across the US, India and EU is about USD 7.4M a year, with a realistic three-year
capture of about USD 0.30M a year (ESTIMATED, `02_RESEARCH/MARKET_ANALYSIS.md` section 6). Strategy C's college lines
cap at about USD 149k a year in the base case. Every judge and the CEO and business memos reached the same conclusion:
nothing here supports venture money as sized. The free core is cheap to run because simulation is in the browser (about
USD 0.2 to 1.5 infrastructure per weekly active per year, ESTIMATED, `council/business-growth.md`); people and compliance
are the real costs.

**Revisit.** If retention, willingness to pay, a learning outcome, the beachhead and a scale path all show evidence
(`council/ceo-investor.md` gates G1 to G7).

## D-004. Audience and age

**Decision.** Terms say 13+. Wave 1 is adults and university students. No product aimed at under-13s in the planning
horizon. High school only after counsel's written opinion on pseudonymous class data (COPPA, FERPA, state laws) and a
data processing agreement exist.

**Why.** No authentication on 23 of 23 routes, a public list of strangers' free-text buddy profiles, and telemetry on by
default (VERIFIED, `01_AUDIT/SECURITY_BASELINE.md`). The FTC has not finalized the school-authorisation exception, so
school consent is not a settled basis for under-13s (`02_RESEARCH/USER_RESEARCH_PLAN.md` review log, UNKNOWN). The Gemini
fallback's terms may bar under-18 products (`council/ai.md`, HYPOTHESIS until counsel reads them).

## D-005. Step 0 before any feature

**Decision.** No new feature ships before: the security release blockers 1 to 4 in SECURITY_BASELINE section 8; paid AI and
search routes closed or capped with a durable spend ledger and a kill switch; telemetry off by default or opt-in with
idempotent event ids; CI on every push; a LICENSE; a counsel answer on the content copied from the three original sites;
and public copy rewritten to match FEATURE_VERIFICATION section 7 (eight claims are CONTRADICTED, including "priced live"
and server re-run before a credential).

**Why.** The second of the three ways iynk most likely dies is a trust failure (`council/ceo-investor.md`). Every judge
listed provenance as fatal to any commercial step. The engineer judge sized Step 0 inside the 17 to 22 engineer-weeks to
the gate.

## D-006. What is frozen

| Area | Decision | Unfreeze trigger |
|---|---|---|
| Drone and robotics labs | Keep as content with safety labels (LiPo and prop panel, before-you-fly panel, autonomy content rule). No new benches, no physics engine. | Two institutions ask in writing, or a grant funds it (`council/robotics-aero.md`) |
| Solana layer | Stays on devnet; rename "Proof of Build" because the credential is forgeable (FV CONTRADICTED); no mainnet, no new credential kinds | A paying buyer asks for portable verifiable credentials and server-side proof of work exists |
| Component marketplace and SDK | Not built | 50 or more externally authored projects forked in a month, and a part file format used outside the team |
| New interface languages | Freeze at six; get native-speaker review of the existing ones | A pilot country needs one and review passes |
| New AI features, image and voice | Not built | Meter, kill switch, evaluation set and a provider cleared for the audience exist (`council/ai.md`) |
| Social layer: public rooms, chat, voice, buddies, stories, leaderboard | Off at relaunch | Host takeover and room exhaustion fixed (SECURITY_BASELINE R3, R4) and moderation designed |

## D-007. Fidelity and claims

**Decision.** iynk's simulators are teaching models (tier T1 in `council/fidelity.md`): adequate for concept-level cause
and effect in the catalogue, not a promise that a design will work on a bench. Every exercise shows a tier label and a
"What it models" panel. When a circuit is outside the model, iynk says "not modelled yet" instead of guessing. The word
"validated" is not used until a bench programme runs (24 circuits, about USD 2.5k to 5k, ESTIMATED). Before Amar
relies on the diagnosis claims, 10 non-destructive faults are checked on a real Uno with a multimeter (E4); 2 or more
mismatches pause every instructional claim until the engine is fixed. No pilot is planned (D-001, D-009 shelved).

**Why.** Nothing in the repo has been compared with a real board or an independent simulator (VERIFIED,
`01_AUDIT/TEST_COVERAGE.md`: no test uses measured hardware data). The solver is DC-only with a fixed pin resistance
(`council/fidelity.md`). One confident wrong diagnosis shown to a knowledgeable lecturer ends trust (all judges).

## D-008. The free core promise

**Decision.** Running, editing, diagnosing, saving, sharing and exporting are free forever, with no account needed. Paid
items are limited to institution administration (rosters, progress export, privacy contract, LMS) and metered compute
(heavier AI, server compile, storage beyond a free quota).

**Why.** It is the mission, and it is a position competitors who earn from private projects (Wokwi) are unlikely to copy
(HYPOTHESIS, strategy A). Price comparables for the paid side: Wokwi Classroom EUR 30 per student per semester, Velxio USD
34 per student per year, Arduino School USD 20 per year, LabsLand EUR 7.99 to 19.99 per semester (EXTERNAL, competitor
dossiers).

## D-009. North star

**Decision.** Phase 1 north star: **weekly learners with a verified diagnosis**. A distinct anonymous session in a week
that (a) changes the starter and moves a check from fail to pass, and (b) answers a diagnose item correctly on the first
try without the largest hint (`council/product-learning.md` section 6.2). It is a proxy until the M7 outcome study shows it
predicts an offline test. Report it next to reach guardrails: the share from non-English locales, from small screens or
low-end devices, and from outside the top three countries (`council/business-growth.md` section 4.6). Count each learner
once per week and require a new item each week.

The founders' north star ("weekly users completing meaningful, independently verified hardware experiments or original
project milestones") becomes the phase 2 target. It needs server replay of runs and original projects, neither of which
exists (VERIFIED).

## D-010. Architecture direction

**Status: Decided; spikes folded in (2026-10-27).** The older wording "built only after the D-002 gate" is void: D-014 builds
the core first, and the spikes shape how, not whether.

**Decision.**
- The codebase is a prototype to mine, not a foundation to extend (`council/cto-platform.md`). Keep: the interpreters, the
  Check, WorldModel and FailureMode types, the flight sim, the figure bridge, the relay core and the zod route pattern.
- One diagnosis record, `{cause_id, symptom_id, evidence, hint_level}`, with a closed list of electrical cause ids.
  Catalogue faults emit it now, and Studio's netlist-based fault rules emit the same shape (engineer judge). Without it,
  the fault corpus stays bound to 38 figures.
- The core (a canonical project document, a netlist independent of the drawing, a simulation orchestrator with the solver
  and code runtime off the main thread) is built first (D-014).

**What each spike decided** (reports in `08_RESEARCH_SPIKES/RS-xx/REPORT.md`; all MEASURED on one Apple M4 Pro, no real
phone or Chromebook):

| Spike | Verdict | What the build does |
|---|---|---|
| RS-01 editor rendering | INCONCLUSIVE (no real device). SVG with level of detail passes p95 under 20 ms at 1x; plain SVG misses in fit and zoom; 4x zoom with LOD misses at 34.1 ms | SVG DOM behind a `Renderer` interface with level of detail from the first commit, so Canvas stays swappable. Real-device run waits for devices |
| RS-03 avr8js differential | PASS for correctness and desktop speed (6.1 to 7.5x real time); not met under 4x throttle (about 1.7x); phone and Chromebook INCONCLUSIVE | avr8js joins as the real-firmware engine for Uno; speed under throttle is a budget item |
| RS-06 rp2040js MicroPython | Pass clause (CPU under 60 percent of a core) NOT MET: 0.54x to 0.79x real time, 100 percent of a core; fail clause not triggered; idle-skip untested | Pico engine stays opt-in, desktop, worker; the decision stays open until an idle-skip test |
| RS-08 MNA vs ngspice | Not a clean PASS: linear solve 20 of 20 matched, but device-model fidelity FAIL (10 of 20 within 2 percent, 6 off over 10 percent); transient INCONCLUSIVE | Keep the solver as the teaching tier, replace the LED, diode, BJT and motor models, add a transient, and label the tier honestly (D-007) |
| RS-09 op-log collaboration | PASS for convergence (no divergence in 40 runs); reconnect passes only with gzip or snapshot-plus-tail on a 5 Mbit/s link | Server-ordered log with snapshots and compression (ADR-0500) |
| RS-12 Yosys WASM | PASS on 10 of 10 lessons, desktop only; memory margin 10 to 15 percent; fails the 15 s load at 5 Mbps | Opt-in HDL tier, refused on low-memory devices |
| RS-13 physics determinism | PASS: identical hashes across Node, Chromium and WebKit, also under throttle | Deterministic physics for robotics and drone |

Still PENDING or not started (decision rule in `02_RESEARCH/TECHNICAL_RESEARCH.md` section 6): RS-04, RS-05, RS-17, RS-11,
RS-14 to RS-19. A later pass folds them in.

## D-011. Low-end devices as an engineering target

**Decision (rewritten 2026-10-27 for the reframe).** Performance on weak hardware and slow links is an engineering budget,
not a learner study. The budgets are PRD BUD-01 to BUD-15 (`03_PRODUCT/PRODUCT_REQUIREMENTS.md` section 3.1): editor frame
time at 500 parts and 1,000 wires at 1x, 4x CPU throttle and DPR 2; idle CPU; first-load JavaScript; Run to Running; autosave;
open time; and heavy engines refused with a reason on low-memory devices. CI enforces what can run headless; frame timing
runs as a scheduled Playwright job. Throttled runs (CDP CPU 4x and 6x, slow-link profiles) are the standing check. Real
phone and Chromebook runs happen when Amar has such devices and are recorded in `docs/device-results.md`; until then a
budget that was only throttle-tested is labelled that way, never "met on devices". Language support is an interface
requirement (UX_DESIGN_SYSTEM), not a gate.

**Why.** No real low-end device has been tested (PERFORMANCE_BASELINE used CPU throttling only; RS-01, RS-03, RS-06, RS-12
are all INCONCLUSIVE or desktop-only for devices). The lesson page's first load is 701 KB gzip. The former wording required 8
to 10 learners through an NGO or school partner at every gate; that belongs to the shelved audience decisions (D-004, D-009).

## D-012. The plan ends in a build

**Decision (Amar, 2026-10-27).** The plan's output is a built product, not a business and handoff pack. After design (steps
4 and 5) and the spikes, step 6 becomes the build plan (`05_ENGINEERING/`: roadmap, atomic tasks, test strategy, release
checks). Agents then build it in the phases of D-014 (B0 foundation first; Fault Lab as a release 1 is no longer a phase, its
diagnose-first faults are built on the core). Each phase is
implemented, type-checked, linted, tested (Vitest and Playwright), reviewed adversarially, fixed and committed locally, and
the orchestrator stops for Amar's OK before the next phase.

**Dropped:** `06_BUSINESS/` PRICING_STRATEGY, UNIT_ECONOMICS, GROWTH_STRATEGY, PARTNERSHIPS, FINANCIAL_SCENARIOS; the
`07_HANDOFF/` pack, `implementation_manifest.json`, `feature_dependency_graph.json`, DEMO_WALKTHROUGH, RED_TEAM and the
executive summary. The strategy, positioning and decision documents already written stay.

**Still needs Amar's OK every time:** deploying to iynk.tech or any production service, pushing to GitHub, new paid
services, and anything that spends money.

## Decisions made by the orchestrator (D-018 to D-021)

The product and architecture cluster made these four choices on its own and recorded them as PROPOSAL in several files.
They are decided here so that every document cites one source. Status for all four: **Decided by orchestrator, Amar may
overrule.** If he overrules one, change it here first, then the documents in its "Cited by" row.

### D-018. Identity and enrolment

**Decision.** There are no accounts. A person is a WebCrypto ECDSA P-256 key pair made in the browser (private key
non-extractable, kept in IndexedDB). To join a server they present a one-time enrolment code that the operator prints with
`iynk-server enroll` (12 Crockford base32 characters, 24 hours, one use), and sign a server challenge. Later visits sign a new
challenge and receive an opaque bearer token (256 bits, stored as SHA-256, 12 hours by default). Pairing makes two identities
buddies. A lost browser store means a new identity that re-pairs; there is no recovery by email. Enrolment modes: `code`
(default), `invite`, `open` (private networks only, with a start-up warning).

**Replaces the wording of** PRD R-077 ("signed device token on first visit, no gate"): the code gate is deliberate, because a
public URL that issues tokens to anyone lets strangers store data (API_CONTRACTS Objection O-2).
**Why.** D-015 and D-016 want friends who find each other with no email and no public list; the audit found no authentication
on 23 of 23 routes and self-asserted peer ids (`01_AUDIT/SECURITY_BASELINE.md` R1, R4).
**Evidence.** DOCUMENTED in `04_ARCHITECTURE/API_CONTRACTS.md` 5.1 and 5.2. RS-09 shows the log converges; it does not test
identity.
**Cited by.** ADR-0007, ADR-0421, ADR-0502, API_CONTRACTS ADR-0801, PRD R-075 to R-080, COMMUNITY (buddy identity),
STUDIO_EDITOR (authors in the operation log). COMMUNITY's own identity ADR becomes a pointer to these (see "ADR number
ranges").

### D-019. Server store

**Decision.** SQLite, one file in one data directory, behind a `ServerStore` port with forward-only migrations (ADR-0004,
ADR-0422). It holds identities, buddy pairs, rooms, the ordered operation log, snapshots and shares. A Postgres adapter is
allowed later as a second implementation of the same port, with contract tests; it is not built in the first release.

**Replaces the wording of** PRD R-083 ("must (file-backed); should (Postgres)"): read it as "must: SQLite; could: Postgres".
**Why.** One file to back up and no second service to run (R-078, R-098, BRIEF 19.4: no extra databases without a
demonstrated need). The existing Timescale code served the deleted counter, leaderboard and buddy pool (ADR-0004).
**Evidence.** DOCUMENTED. The single-writer limit is a known one-way door (ADR-0004). No load test exists; UNKNOWN beyond a
friend group.
**Cited by.** ADR-0004, ADR-0422, ADR-0505, PRD R-078 and R-083, USER_JOURNEYS J-13.

### D-020. AI keys

**Decision.** Keys are the person's. They are kept in browser storage or sent per call in one header (`X-Iynk-Provider-Key`)
through a stateless relay on the person's own server, for providers that block browser calls. The relay allowlists
destinations, guards against server-side request forgery, and does not log bodies. A buddy using the host's server sends
their key through the host's machine and the interface says so. A key never enters a project document, export, share, room,
log, telemetry or error report. The model never writes a project directly; changes are reviewable operations.

**Why.** D-015: nothing depends on Amar's paid keys; the audit found keys and spend on the operator's account
(SECURITY_BASELINE A1 to A7, C1 to C5).
**Evidence.** DOCUMENTED in ADR-0008, ADR-0425, ADR-0612, AI_ARCHITECTURE. RS-11 (provider behaviour) is PENDING.
**Cited by.** ADR-0008, ADR-0425, ADR-0612, PRD R-010 and R-011, API_CONTRACTS ADR-0806.

### D-021. Share links

**Decision.** A project has no link by default. When Amar creates one, the dialog says that anyone with the link can view and
fork before it is made. A link is an immutable read-only snapshot of one saved state with its own expiry (default 30 days,
settable, revocable), carried in the URL fragment and stored as SHA-256; missing and revoked links look the same. The
operator can switch links off server-wide (`IYNK_ALLOW_LINKS=0`). Editing together is a room, not a link. There is no public
gallery, no listing of links and no search over shares.

**Why.** Public by default was the old behaviour and conflicts with "stranger who finds the URL gets nothing" (R-007);
snapshots avoid an edit capability living in a URL (API_CONTRACTS ADR-0807).
**Evidence.** DOCUMENTED. The default expiry and size caps are PROPOSAL.
**Cited by.** ADR-0426, API_CONTRACTS ADR-0807, PRD R-095, COMMUNITY (shares), STUDIO_EDITOR (lifecycle), USER_JOURNEYS J-08.

Two smaller choices belong with these. The 13th journey **J-13** (set up your own server and invite a buddy) is kept: it is a
prerequisite of J-08 and J-09 (`03_PRODUCT/USER_JOURNEYS.md` section 15). The leaderboard scope in D-016 is made concrete in
COMMUNITY 3.10: tracks per kind of effort, personal bests once per subject, buddies who opted in, no combined score, no
streak, no season.

## ADR number ranges

ADR ids are unique across the plan. Every document owns one range and numbers its records inside it. A reference such as
"ADR-0804" must mean one record only. New documents take the next free block from 1020.

| Range | Owner | Records now | Notes |
|---|---|---|---|
| 0001 to 0014 | SYSTEM_ARCHITECTURE | 0001 to 0014 | Files in `04_ARCHITECTURE/ADR/` |
| 0100 to 0110 | PROJECT_DATA_MODEL | 0100 to 0110 | Files exist |
| 0200 to 0208 | COMPONENT_SCHEMA and COMPONENT_ECOSYSTEM | 0200 to 0208 | COMPONENT_ECOSYSTEM keeps citing these; it adds none |
| 0300 to 0314 | SIMULATION_ARCHITECTURE | | |
| 0400 to 0430 | FRONTEND_ARCHITECTURE (0400 to 0409) and BACKEND_ARCHITECTURE (0420 to 0430) | | Files exist |
| 0500 to 0599 | REALTIME_ARCHITECTURE | 0500 to 0511 | UX no longer uses this range |
| 0600 to 0699 | AI_ARCHITECTURE | 0600 to 0613 | |
| 0700 to 0799 | ROBOTICS_ARCHITECTURE (0700 to 0707) and DRONE_ARCHITECTURE (0710 to 0716) | | |
| 0800 to 0899 | API_CONTRACTS | 0800 to 0809 | Unchanged. No product document uses it |
| 0900 to 0919 | STUDIO_EDITOR | 0900 to 0908 (0909 free) | |
| 0920 to 0939 | COMMUNITY | 0920 to 0927 | 0920 is a pointer, not a record |
| 0940 to 0959 | EDUCATION | 0940 to 0945 | |
| 0960 to 0999 | Reserved | | Next product documents |
| 1000 to 1019 | UX_DESIGN_SYSTEM | 1000 to 1007 | |

**Renumbering map.** Each product file renumbers its table, its inline references and any record files to match. The new id
is the old id plus the offset shown. The nine STUDIO_EDITOR record files now sit in `04_ARCHITECTURE/ADR/` as `ADR-0800-*.md` to `ADR-0808-*.md`; rename them to
`ADR-0900-*.md` to `ADR-0908-*.md` and fix their headings and links.

| Document | Old ids | New ids | What changes |
|---|---|---|---|
| STUDIO_EDITOR | 0800 to 0808 (0809 free) | 0900 to 0908 (0909 free), offset +100 | Workspace 0900, renderer 0901, tools 0902, connection rules 0903, unplaced parts 0904, undo 0905, lifecycle 0906, outline pane 0907, edits during a run 0908 |
| COMMUNITY | 0800 to 0807 | 0920 to 0927, offset +120 | 0920 (buddy identity) is deleted as a record and becomes a pointer to ADR-0007, ADR-0421, ADR-0502 and D-018. 0921 visibility, 0922 shares, 0923 attribution, 0924 leaderboard, 0925 build inputs, 0926 flashing recipes, 0927 live prices. Its one reference to ADR-0500 is the realtime record and stays |
| EDUCATION | 0800 to 0805 | 0940 to 0945, offset +140 | 0940 guided plan, 0941 meaningful pass, 0942 diagnose item, 0943 hint ladder, 0944 challenge results, 0945 third-party clearance. Its "ADR-0809" is only the end of the range it claimed, not a record |
| UX_DESIGN_SYSTEM | 0500 to 0507 | 1000 to 1007, offset +500 | 1000 paper and ink with two registers, 1001 tokens, 1002 levels, 1003 structure tree, 1004 language as layout, 1005 performance ladder, 1006 motion contract, 1007 phone layout. Its mention of "ADR-0502" for levels becomes ADR-1002 |
| API_CONTRACTS | 0800 to 0809 | unchanged | STUDIO_EDITOR and the other product files no longer share its range. Its ADR-0801 (identity) is the contract side of D-018; its text at 0809 says BACKEND ADR-0420 to 0430 must be reconciled, which stays open |
| REALTIME_ARCHITECTURE | 0500 to 0511 | unchanged | |

The same ids appear in feature, requirement and journey files only as pointers; whoever renumbers a product file greps all of
`03_PRODUCT/` and `04_ARCHITECTURE/` for the old ids, including `PRODUCT_REQUIREMENTS.md`, `FEATURE_CATALOGUE.md` and
`USER_JOURNEYS.md`, and checks that "ADR-0800 to ADR-0809" now means API_CONTRACTS only.

## Open items

These are the current open questions. The plan proceeds on the defaults shown. The older table about counsel, runway,
grants and the Solana layer is gone: D-013 and D-016 settled or shelved all of it.

| Item | Default the plan uses | Why it matters |
|---|---|---|
| Licence choice (D-017) | A marked placeholder file; no licence granted | Needed before the repo is published; third-party content must be rewritten first |
| Buy or borrow a phone and a Chromebook (RS-01, RS-03, RS-06, RS-12 real-device runs) | Throttle-only numbers, labelled as such (D-011) | RS-01 is INCONCLUSIVE until a device run exists; BUD results are not "met on devices" |
| RS-04, RS-05, RS-17 | PENDING; options and decision rules in `TECHNICAL_RESEARCH.md` section 6 | Each could change an engine or storage choice |
| RS-11 (AI provider behaviour) | PENDING; the relay and browser-direct paths both stay (D-020) | Provider choice and fallback |
| RS-14 to RS-19 | PENDING | A later pass folds them in |
| RS-06 idle-skip test | Pico engine opt-in, desktop only | Decides whether MicroPython can reach real time |
| D-018 to D-021 | As written above | Amar may overrule any of them |
| 10-fault real-board check (E4) | Not run | Gate for relying on the diagnosis claims (D-007) |

## Change log

- 2026-10-27: D-001 to D-011 written after the strategy step (`wf_1b6e2ee6-315`). The positioning draft written early by a
  gap fixer was superseded and moved out of the plan tree.
- 2026-10-27: Amar confirmed D-002 with one change (Studio is built straight after Fault Lab; the human evidence becomes
  validation after the build) and added D-012 (the plan ends in a phased build; business and handoff documents dropped).
- 2026-10-27 14:10 CDT: Amar reframed the build (D-013 to D-017): an open-source app for himself and his friends, core
  first, local-first and self-hostable, hackathon extras removed except Build Buddies (now collaboration) and a
  buddies-only leaderboard, licence later. D-001, D-003, D-004, D-008 and D-009 are shelved; D-002 and D-006 replaced.
- 2026-10-27 (review fixes): D-007, D-010, D-011 and D-012 bodies brought in line with the reframe; D-018 to D-021 added;
  "ADR number ranges" added; "Open founder decisions" replaced by "Open items". See "Review fixes (2026-10-27)".

## Review fixes (2026-10-27)

| # | Issue | What I did | Evidence read |
|---|---|---|---|
| 1 | ADR number collisions (high) | Applied. Added "ADR number ranges" with one range per document and a renumbering map. Chose STUDIO_EDITOR 0900 to 0919, COMMUNITY 0920 to 0939, EDUCATION 0940 to 0959, UX_DESIGN_SYSTEM 1000 to 1019; 0500 to 0599 stays with realtime, 0800 to 0899 with API_CONTRACTS, 02xx with the component documents. COMMUNITY ADR-0800 becomes a pointer to ADR-0007, ADR-0421, ADR-0502 and D-018. I did not edit the product files (outside my output); each owner applies the map. Left open: the nine STUDIO_EDITOR record files (`ADR/ADR-0800-*` to `ADR-0808-*`) appeared while I worked and still carry the old numbers; the other `ADR/` files are untouched | `grep` of ADR ids in `03_PRODUCT/*.md` and API_CONTRACTS section 17; folder listing of `04_ARCHITECTURE/ADR/`; UX_DESIGN_SYSTEM line 40 (it took 0500 because it saw no range) |
| 2 | Stale register text (high) | Applied. D-011 rewritten as an engineering target tied to BUD-01 to BUD-15 and real-device runs when Amar has devices. D-010 status is "Decided; spikes folded in" with one row per spike verdict (RS-01 INCONCLUSIVE, RS-03 PASS desktop, RS-06 pass clause not met, RS-08 not clean with device models FAIL, RS-09 PASS, RS-12 PASS desktop, RS-13 PASS). "Pilot" removed from D-007 (body and table row). D-012 no longer names Fault Lab as release 1. Old "Open founder decisions" replaced by "Open items" | The seven `REPORT.md` verdict sections; PRD 3.1 |
| 3 | Orchestrator decisions missing (medium) | Applied. D-018 identity and enrolment, D-019 SQLite, D-020 AI keys, D-021 share links off by default, each "Decided by orchestrator, Amar may overrule", with the PRD wording they supersede (R-077 gate, R-083 read as SQLite must, Postgres could). J-13 and the buddies-only leaderboard tracks are recorded under them | API_CONTRACTS 5.1, 5.2 and 17; ADR-0004, ADR-0007, ADR-0008, ADR-0421, ADR-0422, ADR-0425, ADR-0426, ADR-0612; COMMUNITY 3.10; PRD R-077, R-083, R-095; USER_JOURNEYS section 15 |

Not applied: nothing was judged wrong. One caution on issue 3: I wrote D-021's default share expiry as 30 days from
API_CONTRACTS 5.1, while COMMUNITY's table says 7 days (maximum 30) for links. The two files disagree; the owner of each
should settle on one value and the register keeps "settable, default 30 days" until they do.
