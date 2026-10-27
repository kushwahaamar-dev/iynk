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

How the earlier decisions stand now:

| ID | Status after the reframe |
|---|---|
| D-001 beachhead | Shelved until the startup question |
| D-002 Fault Lab first | Replaced by D-014 (core first). Diagnose-first faults and save, share and export are still built, on the new core |
| D-003 funding | Shelved |
| D-004 audience | Shelved for the build. Security and privacy fixes still apply because the code is public and runs for friends |
| D-005 Step 0 | Kept as build phase B0, reframed: security fixes, CI, open-source basics (README, CONTRIBUTING, self-hosting guide, licence placeholder), bring-your-own keys, telemetry removed or opt-in, honest copy, bundle cleanup |
| D-006 freeze | Replaced. Robotics and drone labs are no longer frozen (they become real creation in later phases). Extras per D-016. The social layer comes back as buddies and invite-only rooms once the room takeover and flooding holes are fixed |
| D-007 honest fidelity labels | Kept: tier labels, "What it models", "not modelled yet" |
| D-008 free core and paid tiers | Shelved; nothing is paid |
| D-009 north star | Shelved |
| D-010 architecture | Kept and now leads: the project document, netlist, solver and runtime are built first |
| D-011 low-end devices | Kept as an engineering target: performance budgets on throttled CPUs and slow connections |
| D-012 the plan ends in a build | Kept; the business and handoff documents stay dropped |

## Strategy decisions (2026-10-27, before the reframe)

| ID | Decision | Status |
|---|---|---|
| D-001 | Beachhead: lecturers of first and second year electronics and embedded courses at US community and four-year colleges, then Indian engineering colleges with sponsored seats. Adults first. | Decided |
| D-002 | Primary strategy: a staged hybrid. Fault Lab first (strategy C), then the original-project Studio built straight after it (strategy A), the classroom layer kept thin until a buyer pays (strategy B). The spikes still pick Studio's technology; the human evidence gates run after the build as validation. | Decided by Amar, 2026-10-27 |
| D-003 | Funding: grants, sponsored seats and bootstrap for months 0 to 18. No venture raise until the gates in STARTUP_STRATEGY section 6 are met. | Decided |
| D-004 | Audience: terms say 13+. First wave is adults and university students. No service aimed at under-13s in the planning horizon. High school only after counsel's answer and a data processing agreement. | Decided |
| D-005 | Step 0 before any feature: security blockers, closed paid routes, a spend ledger, telemetry off by default, CI, a LICENSE and a counsel answer on content provenance, honest public copy. | Decided |
| D-006 | Freeze: drone and robotics labs stay as content, Solana stays on devnet and is not extended, no marketplace or SDK, no new languages, no new AI features, and the social layer (public rooms, chat, voice, buddies, stories, leaderboard) is off at relaunch. | Decided |
| D-007 | Fidelity: iynk calls its simulation a teaching model. It says "not modelled yet" instead of guessing, never says "validated", and checks 10 faults on a real board before the first pilot. | Decided |
| D-008 | Free core promise: running, editing, saving, sharing and exporting are never paid. Money comes from institution administration and metered compute. | Decided |
| D-009 | North star for phase 1: weekly learners with a verified diagnosis, reported with reach guardrails. The founders' broader north star becomes the phase 2 target once server replay and projects exist. | Decided |
| D-010 | Architecture: the codebase is a prototype to mine. A shared diagnosis record ships in phase 1; the Studio core (project document, netlist, orchestrator) is designed now and built only after the gate. Solver and editor choices wait on RS-08 and RS-01. | Pending evidence (RS-01, RS-08, interpreter coverage) |
| D-011 | Mission test: every gate includes learners on their own low-end devices, on a slow connection, in a non-English interface. | Decided |
| D-012 | The plan ends in a build. Agents build Step 0, Fault Lab and Studio in phases, stopping after each phase for Amar's OK. The remaining business documents and the handoff pack are dropped. | Decided by Amar, 2026-10-27 |

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
"validated" is not used until a bench programme runs (24 circuits, about USD 2.5k to 5k, ESTIMATED). Before the first
pilot, 10 non-destructive faults are checked on a real Uno with a multimeter (E4); 2 or more mismatches pause the pilot.

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

**Decision.**
- The codebase is a prototype to mine, not a foundation to extend (`council/cto-platform.md`). Keep: the interpreters, the
  Check, WorldModel and FailureMode types, the flight sim, the figure bridge, the relay core and the zod route pattern.
- Phase 1 defines one diagnosis record, `{cause_id, symptom_id, evidence, hint_level}`, with a closed list of electrical
  cause ids. Catalogue faults emit it now, and Studio's netlist-based fault rules emit the same shape later (engineer
  judge). Without it, the fault corpus stays bound to 38 figures.
- Studio's core (a canonical project document, a netlist independent of the drawing, a simulation orchestrator) is designed
  in steps 4 and 5 and built only after the D-002 gate.
- Pending RS-08: whether `figures/engine/bench-solve.js` is kept, wrapped or replaced for user circuits.
- Pending RS-01: SVG, React SVG or Canvas for the Studio editor.
- Pending RS-03, RS-06, RS-12: whether real-firmware engines (avr8js, rp2040js, Yosys) join as an opt-in higher tier.

## D-011. Mission test at every gate

**Decision.** Each gate includes 8 to 10 learners in a low-resource setting, reached through an NGO or school partner, on
their own device, on a throttled connection, using a non-English interface. The gate measures first-lesson completion.
None of the advocates proposed this; the mission judge added it.

**Why.** The mission is access regardless of money, place, language and equipment. No real low-end device has been tested
(PERFORMANCE_BASELINE used CPU throttling only), and the lesson page's first load is 701 KB gzip.

## D-012. The plan ends in a build

**Decision (Amar, 2026-10-27).** The plan's output is a built product, not a business and handoff pack. After design (steps
4 and 5) and the spikes, step 6 becomes the build plan (`05_ENGINEERING/`: roadmap, atomic tasks, test strategy, release
checks). Agents then build it in phases: Step 0 (D-005), Fault Lab (release 1), Studio (release 2). Each phase is
implemented, type-checked, linted, tested (Vitest and Playwright), reviewed adversarially, fixed and committed locally, and
the orchestrator stops for Amar's OK before the next phase.

**Dropped:** `06_BUSINESS/` PRICING_STRATEGY, UNIT_ECONOMICS, GROWTH_STRATEGY, PARTNERSHIPS, FINANCIAL_SCENARIOS; the
`07_HANDOFF/` pack, `implementation_manifest.json`, `feature_dependency_graph.json`, DEMO_WALKTHROUGH, RED_TEAM and the
executive summary. The strategy, positioning and decision documents already written stay.

**Still needs Amar's OK every time:** deploying to iynk.tech or any production service, pushing to GitHub, new paid
services, and anything that spends money.

## Open founder decisions

These are not the agent's to make. The plan proceeds on the defaults shown.

| Question | Default the plan uses | Why it matters |
|---|---|---|
| Confirm D-002 (original projects second) | Confirmed by Amar on 2026-10-27, with Studio built straight after Fault Lab | It orders the build |
| Engage counsel on provenance and minors (USD 4.5k to 15k for the adult relaunch, ESTIMATED) | Yes, in phase 0 | Blocks any invoice or grant |
| Keep the Solana layer at all | Frozen on devnet | Time spent on it is time not spent on the pilot |
| A written 12-month commitment on hours and runway from each founder | Assumed 2 to 3 people at about 70 percent focus | Every estimate depends on it |
| Who signs grant applications and which entity applies | UNKNOWN | Grants are the months 0 to 18 funding |

## Change log

- 2026-10-27: D-001 to D-011 written after the strategy step (`wf_1b6e2ee6-315`). The positioning draft written early by a
  gap fixer was superseded and moved out of the plan tree.
- 2026-10-27: Amar confirmed D-002 with one change (Studio is built straight after Fault Lab; the human evidence becomes
  validation after the build) and added D-012 (the plan ends in a phased build; business and handoff documents dropped).
- 2026-10-27 14:10 CDT: Amar reframed the build (D-013 to D-017): an open-source app for himself and his friends, core
  first, local-first and self-hostable, hackathon extras removed except Build Buddies (now collaboration) and a
  buddies-only leaderboard, licence later. D-001, D-003, D-004, D-008 and D-009 are shelved; D-002 and D-006 replaced.
