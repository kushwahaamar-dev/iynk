# Judge: engineer lens

Date: 2026-10-27. Judge label: engineer. Lens: a principal engineer who read the audit and asks what this codebase can carry, what hides in the cost, how much survives, and who maintains it.

Labels: VERIFIED, DOCUMENTED, EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN. Paths are under `docs/MASTER_PLAN/` unless stated. I read the three advocate papers in full. I checked their numbers against `02_RESEARCH/MARKET_ANALYSIS.md` section 6, `00_EXECUTIVE/council/cto-platform.md` section 7.3, `01_AUDIT/inventory/content-schema.md`, `01_AUDIT/inventory/figure-engine.md`, `01_AUDIT/inventory/boardlab-robotics-ui.md` and `01_AUDIT/FEATURE_VERIFICATION.md`. I did not re-run the product and did not search the web.

## 1. What the code can carry (the facts all three papers must live with)

| Fact | Label | Source | Consequence |
|---|---|---|---|
| No project model, no persistence, no identity. Edited code is lost on reload. | VERIFIED | FEATURE_VERIFICATION.md section 6; BROWSER_WALK steps 14, 15 | Every strategy needs save and an anonymous signed session first. That is shared cost, not strategy cost. |
| A fault (`FailureMode`) is a row that names figure part ids and an opaque figure-side string such as `'cold:H1.20'`. The figure JS decides what it does. Tests check the strings are well formed, not that the physics is right. | VERIFIED | content-schema.md lines 71, 111, 142 | The 144 + 106 faults are an asset only inside the 38 hand-built figures. They do not transfer to a user circuit. |
| The solver is DC only, 12 element types, one solver-wide `PIN_R = 25` ohm for every board, silent exit after 40 rounds with no non-convergence flag, and it cannot take a netlist from outside a figure. | VERIFIED | figure-engine.md lines 64, 73, 79 | "113 mA against 20 mA" is a teaching number from a constant, not a measurement. Any strategy that sells diagnosis as trustworthy needs a bench check first. |
| Interpreters are hand-written subsets (no `class`, `template`, pointers, `#ifdef`; no DHT, SoftwareSerial, EEPROM). Three trivial programs abort the Node process. 189 tests pass. | VERIFIED | inventory/interp.md D1, D8 | Fine for scripted lessons. Pasted tutorial code will fail. Server re-run is unsafe until caps exist. |
| The CTO estimate for the minimum original-project builder is 22 / 37 / 61 engineer-weeks, unvalidated, with the editor (package F, 5 / 8 / 14) as the largest unknown. RS-01 (editor on a phone) has not run. | ESTIMATED | cto-platform.md section 7.3 | A's numbers inherit this uncertainty. |
| Suite is red under load (13 wall-clock timeouts). No CI. 23 of 23 routes have no authentication. In-memory rate limiter. | VERIFIED | FEATURE_VERIFICATION C039; SECURITY_BASELINE.md | Step 0 is a precondition for every strategy. |
| No LICENSE; lesson structure, timings and constants follow three third-party sites. | VERIFIED | FEATURE_VERIFICATION section 1 item 8; security-privacy.md | The authored corpus is the asset B and C sell. It is possibly encumbered. A's builder depends on it least. |

Market check. All three papers use USD 7.4M base SAM and USD 0.30M year-3 SOM. I confirmed these in MARKET_ANALYSIS.md section 6.2 (US colleges SOM $109k, India engineering $21k, EU higher education $19k, total of those three = $149k). C's "USD 149k ceiling" is arithmetically right. B's USD 0.30M includes US secondary schools ($141k), which B itself says to attack last. So B's near-term ceiling is also about $150k. None of the three is a revenue strategy. Both B and C say so. The cost comparison should therefore be about cost per unit of evidence and mission, not payback.

## 2. Cost comparison, normalised

The advocates count different things. I put them on one basis (engineer-weeks, best / expected / adverse, ESTIMATED).

| Item | A | B | C |
|---|---|---|---|
| Their own M1 total | 27 / 43 / 72 | 17 / 31 / 50 | 11 / 17.5 / 29 |
| Step 0 gates and trust minimums inside it | about 6 to 10 (A counts 3/4/6 for security; gates sit in the CTO base) | 3 / 5 / 8 | 3 / 5 / 8 (A + F) |
| What M1 does not prove | learning, classroom, payment | learning, payment, server-verified grading | original projects, general fault engine |
| Cost to reach the vision's "own project" | Included | Add M3: 25 / 42 / 69 (22/37/61 + 3/5/8) | Add Phase 2: 21 / 35 / 58 |
| Cumulative to a project-capable product | 27 / 43 / 72 | 54 / 93 / 150 | 32 / 52 / 87 |
| Unpriced work | counsel, i18n review, moderation for any public content | sales and support at 30 to 50 percent of founder time (B's own HYPOTHESIS), DPA, VPAT, LTI | counsel, study recruitment, bench validation (USD 2.5k to 5k, 6 to 8 person-weeks, fidelity.md) |

Reading. C is cheapest to evidence. B is the most expensive path to the founders' vision (93 expected) because it builds a teacher layer and then the builder anyway. A is the cheapest path to the vision and the most expensive to first evidence. C then Phase 2 costs about 52 expected, which is more than A's 43 but spends the first 17.5 weeks on demand evidence instead of on the biggest bet. This is the key engineering point: the builder core (project document, netlist, pure solver, fault rules, packages B to G) is needed by A, by C Phase 2 and by B M3. It is the one block that all three eventually pay for if the vision stays. The strategy question is only whether to buy it first or after evidence.

Advocate overclaims I found:

| Claim | Check | Verdict |
|---|---|---|
| C: "needs no project model, reuses the most existing code" | True for v0. But v0 hides the Break it trigger, and the figure bridge only exposes `set` and `query`. Hiding the trigger per figure may need edits to many of the 80 figure pages. C admits this only in its adverse case. | Probably true, risk understated. Needs a one-day spike on 3 figures. |
| C: package E (class code, pseudonyms, CSV, aggregate table) is 2 / 3 / 5 | This is a server, a table, an anonymous session, a limiter and a lecturer page. B prices the same bundle at 4 / 7 / 11 plus 3 / 5 / 8 for the dashboard. | C is probably low by about 2x on this line. |
| C: "the audit's best idea" is the wedge | The audit measured an after-the-fact explanation on one run per tool. Diagnose-first is not built and was never tested. | The tested lead and the proposed product differ. |
| A: uniquely-A extra is 14 / 24 / 40 | Matches CTO packages C, D, E, F, G (2+3+1+5+3 = 14 best; 4+5+2+8+5 = 24; 7+8+3+14+8 = 40). Correct. | Fair. |
| A: E5 "zero false alarms on 79 catalogue circuits" as a pass gate | Good gate, but the 79 circuits were authored by people who knew the answers. A zero on a curated set says little about learner circuits. | Gate is necessary, not sufficient. Add a held-out set of learner-style circuits. |
| B: "checks as pure predicates, no compile queue" is hard to copy | CheckJob is plain data (VERIFIED). But client-side checks can be forged and server re-run aborts the process on 3 known probes (D1, D8). | True and useful, but the claim "hard to copy" is weak: Wokwi has CI scenarios. |
| B: M1 "pass needs one real edit and one quiz answer" is 1 / 2 / 3 weeks for 71 starters | FV notes the test starter is an empty program, not the template learners see. Auditing 71 items by hand with a check change is more content than code. | Low-ish, content-bound. |

## 3. Scores

Scale 1 to 5. Cost and risk: 5 = cheap and low risk. Total is the plain sum of the eight criteria below. Scores are my judgement from the evidence, not measurements.

| Strategy | User value | Frequency of need | Differentiation | Monetisation | Feasibility on this code | Cost and risk | Mission fit | Speed to evidence | Total |
|---|---|---|---|---|---|---|---|---|---|
| A creator-builder | 4 | 3 | 3 | 2 | 2 | 1 | 5 | 2 | **22** |
| B classroom | 3 | 4 | 2 | 3 | 3 | 2 | 2 | 2 | **21** |
| C fault lab | 3 | 3 | 3 | 2 | 4 | 4 | 3 | 4 | **26** |

### A creator-builder

| Criterion | Score | Why |
|---|---|---|
| User value | 4 | An own project, a diagnosis and an export is the whole imagine-to-build loop for the segments USER_SEGMENTS.md rates 18 to 24 of 35. Demand for original projects is forum-quote and founder-story evidence only (HYPOTHESIS). |
| Frequency | 3 | Maker use is episodic (A risk 10). University project courses give some regular use. |
| Differentiation | 3 | Own project + no account + private by default + explained faults is a combination nobody tested was found to cover, but only Wokwi, Falstad, Velxio were run. Velxio already warns before run. The edge is unproven on user circuits. |
| Monetisation | 2 | Nothing paid for 18 months by A's own plan. Individuals pay little (segment 1 ability to pay scored 1). Institutional revenue needs a second product. |
| Feasibility | 2 | Requires the CTO builder (22 / 37 / 61), whose largest block, the editor at 60 fps on phones, has no spike. Interpreter subset may reject pasted sketches (E2 unknown). Solver needs replacing. About 20 percent of the existing code (interpreters, check types, figure art, bridge) is reused; the rest is new. |
| Cost and risk | 1 | Highest cost. Adds fidelity risk moving from curated to uncurated circuits (one confident wrong diagnosis is a trust event; A lists 14 risks, 8 rated High). UGC and minors risk. |
| Mission fit | 5 | The only strategy that is the founders' stated vision and that removes the kit cost for an idea nobody sells a catalogue for. |
| Speed to evidence | 2 | Spikes E2, E3, E4 take 2 to 3 weeks and are cheap, but the thesis test E5 needs the prototype, and E7 needs 6 to 8 weeks live. First real demand evidence is months out. |

### B classroom

| Criterion | Score | Why |
|---|---|---|
| User value | 3 | Teacher gets who-ran, who-passed. Student gets save and a diagnose-first path. Value to the teacher is HYPOTHESIS: B says no budget-holder has been interviewed. |
| Frequency | 4 | A course term gives weekly use for 10 to 15 weeks with built-in repeat each term. Best of the three. |
| Differentiation | 2 | A roster and dashboard are easy to copy. Wokwi owns the paying instructor today; Velxio has a classroom at USD 34 and moves in weeks (B section 7 agrees). The defensible part is diagnosis data, which exists only after C's design ships. |
| Monetisation | 3 | The only strategy with a buyer and published comparable prices (EUR 30 Wokwi, EUR 7.99 LabsLand). But realistic ceiling is about USD 150k a year in year 3 for the university slice and B's own arithmetic says it does not pay a three-person team plus USD 25k to 55k a year compliance. |
| Feasibility | 3 | Server tables, teacher sign-in, join codes, pseudonym tokens are standard work on this stack (token-hash ownership exists). The risk is content fit to real syllabi (E8) and the hollow-pass problem. Interpreters are fine for scripted lessons. |
| Cost and risk | 2 | 17 / 31 / 50 for M1, then 12 / 20 / 31 for M2 (server re-run, LTI) before grades are trustworthy, plus counsel, DPA, VPAT, WCAG. Founder time lost to sales and compliance (30 to 50 percent, HYPOTHESIS). Cost to the vision: 93 expected. |
| Mission fit | 2 | Reaches people who already have an institution. Pays from those least in need. B says openly that it moves "imagine" and "build for real" to M3. |
| Speed to evidence | 2 | The evidence sprint (E1, E2, E3, E8) needs no code and is 4 to 6 weeks, which is good. But a term-length pilot and a year-long sales cycle (K3 gives 9 months) mean purchase evidence is slow. |

### C fault lab

| Criterion | Score | Why |
|---|---|---|
| User value | 3 | Debugging is a real, repeated pain. But the novice has a free chatbot substitute (C risk R7), and the literature on fault-diagnosis simulation is thin (C risk R3, EXTERNAL, weak). |
| Frequency | 3 | Inside a course, a pre-lab pack is used each term. For individuals, use is a stuck moment, not a habit. |
| Differentiation | 3 | The only tested lead: after-the-fact explanation vs Wokwi and Falstad (one run each). Velxio warns before run. Tinkercad not tested (C's E0 asks to test it first). The durable parts are reviewed corpus, misdiagnosis data and an outcome study, none of which exist yet. |
| Monetisation | 2 | Lowest per-seat price hypothesis (EUR 5 to 8 against a URP Q2-e threshold of USD 20). Ceiling about USD 149k. C says it is a bootstrap business. |
| Feasibility | 4 | v0 reuses `FailureMode`, `Check`, interpreters, figure bridge, 38 items. No project model, no solver rewrite. Risks: hiding the trigger per figure; per-figure edits could grow; package E is underpriced about 2x. |
| Cost and risk | 4 | 11 / 17.5 / 29 and a bounded loss if the pilot fails. Fidelity risk is contained to authored items where a human can bench-check 10 faults for under USD 300 (E4). Provenance risk is highest here because the corpus is the product. |
| Mission fit | 3 | It is "debug" and "learn" in the founders' chain, and it lowers the cost of failing safely, which is core to a lab without parts. It delays "imagine" and "design". C says so. |
| Speed to evidence | 4 | E0 (1 day), E1 (2 weeks), E3 and E4 before any code, prototype in 3 weeks, one-term pilot. Only strategy where a falsifiable learning test (URP M7) exists and is already designed. |

## 4. Recommendation: a staged hybrid, C first, A as the gated successor, B reduced to a thin option

Do not pick any single paper as written. The three are mostly one codebase at three stages. B's M1 and C's v0 are the same product (diagnose-first on the catalogue with class codes) pitched at the same buyer. A is what both reach in Phase 2 or M3. The decision is order and gating.

Exact scope, in order:

1. Step 0 (all strategies, 3 to 5 engineer-weeks expected). CI, deterministic unit gate, security headers, close open AI, search and MCP routes, shared limiter and spend ledger, telemetry off by default, buddy list off, copy fixes from FEATURE_VERIFICATION section 7. Counsel brief on provenance and audience. Nothing after this is safe without it.
2. Persistence and share for catalogue items (CTO package H slice, 2 to 3 weeks). Anonymous signed session, autosave of edited code, a share link that opens a runnable copy. Every strategy needs it. It is the first thing a user can feel.
3. From C: diagnose-first mode over existing `FailureMode` rows (C packages B, C, D, G), English only, 40 authored items, event log, "what it models" panel. Skip C package E (class codes, CSV) until step 5. Total about 8 to 10 expected engineer-weeks.
4. In parallel with 3, run A's three cheap spikes (about 2 weeks total, one engineer): E2 (50 public sketches through `runHeadless`), E3 / RS-01 (editor budget on a mid-range Android and a Chromebook), E4 / RS-08 (in-house DC solver vs ngspice on 20 circuits). Add C's E0 (Tinkercad and Velxio by hand) and E4 (10 faults on a real Uno with a meter). These decide the builder's real cost and the fidelity claim before any money goes into either.
5. Gate. If E0 and the C pilot results are positive (C's E1, E2, E5), add C package E in its narrow form (class code, pseudonym, CSV). That is the B-lite option. Do not build B's teacher accounts, dashboard, LTI or VPAT until a budget holder produces a quote request or purchase order (B's E4, K3).
6. If E2, E3, E4 pass and the pilot shows demand for more than the catalogue, start A's builder at Uno only (CTO packages B to G), with the fault rules emitting the same structured shape as the catalogue (see below).

One engineering rule that makes the hybrid coherent. In step 3 define the diagnosis record once: `{ cause_id, symptom_id, evidence, hint_level }`, where `cause_id` comes from a closed list of electrical causes (resistor missing, polarity reversed, floating input, wrong pin in code, and so on). Catalogue faults map their authored text to a `cause_id`. Later, the generic rule engine in A emits the same `cause_id` from a netlist. Then the misdiagnosis data, the hint ladder and the exercise packs from C carry over to user circuits, and the work in step 3 is not thrown away. Without this rule, C's corpus is bound to 38 figures forever (content-schema.md line 142).

What survives of today's code under the hybrid: interpreters and virtual clock, `Check` and `FailureMode` types, 71 lessons and checks, figure art and bridge, i18n scaffolding, Zod route pattern. What is replaced: `iynk:v1` as the only record, the in-memory limiter, and later the solver for user circuits. Frozen and not maintained: flight sim, drone calculator, robotics benches beyond what already passes, Solana, rooms, buddies, leaderboard. Maintenance load stays at the catalogue plus one new server table family until step 6.

Expected cost until the step 5 gate: about 17 to 22 engineer-weeks (Step 0 + persistence + diagnose-first + spikes), about 8 to 12 calendar weeks for 2 to 3 people (ESTIMATED, no spike has validated this). Expected cost of A after the gate: 37 to 43 more.

Why not A first. It spends 43 expected engineer-weeks before there is evidence that anyone starts from their own idea, and it carries the highest fidelity exposure. The mission fit is the reason to keep it as the destination, not the first step.

Why not B first. It spends more than C for a payer whose willingness is untested, and its differentiator (dashboard) is the easiest to copy. Its data-free class mode is cheap and already inside the hybrid.

Why not C alone. Its Phase 1 does not build the engine the vision needs, and a product that cannot debug the learner's own circuit stops at "pre-lab pack". The hybrid keeps C's pace but commits to a gate for A.

## 5. Worth grafting from the others

| From | Idea | Where it goes |
|---|---|---|
| A | The three spikes E2, E3, E4 as a pre-commit gate | Step 4 |
| A | Gate "zero false alarms on 79 catalogue circuits and 18 of 20 deliberately broken", plus a held-out set of learner-style circuits I add | Before any generic fault rule ships |
| A | Tier label and "What it models" panel on every project; "not modelled yet" instead of guessing | C package G, and builder later |
| A | Project JSON (versioned, text), `.ino` export, wiring table | After step 6; the cheap part of export is worth doing with step 2 |
| A | Kill criterion on AI cost and the kill switch before any new AI feature | Step 0 |
| B | Meaningful pass: one real edit and one answer, fixing Blink passes untouched | Step 3 (needed for C's hint log to mean anything) |
| B | Evidence sprint with no code: 12 teachers, 8 university instructors, 8 budget holders, syllabus fit (E8), priced waitlist | Runs in weeks 0 to 6 beside Step 0 |
| B | University-first, adult-only first wave; K-12 only after counsel | Target in step 5 |
| B | Differential test of Node vs Chromium check outcomes on all 102 references (E6) | Before any claim of "verified results" |
| B | Free teacher allowance and cap classroom features, not content | Pricing rule if step 5 happens |
| C | Tinkercad and Velxio hand test (E0) before building | Week 1, 1 day |
| C | Bench check of 10 faults on a real Uno (E4, under USD 300) | Before the pilot |
| C | M7 crossover study with pre-registered rules | Only if step 5 passes; it is the only design of a learning test in the evidence |
| C | Bootcamps removed for lack of evidence | Keep removed |

## 6. Fatal flaws

| Strategy | Flaw | Is it fatal? |
|---|---|---|
| All | Provenance and no LICENSE. The corpus, timings and constants follow three third-party sites. A counsel answer that needs licences or a rewrite hits B and C hard, because the corpus is the product. | Fatal for B and C as commercial plans if unresolved; for A only if the Uno templates need a rewrite (A kill 7: 6 engineer-weeks). Resolve in Step 0, before any invoice. |
| A | Builder may miss the phone and Chromebook budget (RS-01), which hits exactly the users the mission names. A's first-load JS is already 701 KB gzip before an editor (PERFORMANCE_BASELINE B3). | Not fatal, but it would force a desktop-first product that conflicts with "anywhere". |
| A | The diagnosis differentiator is unproven on user circuits and Velxio already warns. A has no edge if E5 fails. | Fatal to A as a standalone plan; this is why A is gated. |
| A | The solver would need transient behaviour for common projects (capacitors, regulators, motors) to be trusted. | Adverse case; moves A to 72 weeks. |
| B | Compliance and sales cost exceed revenue in the base case (B section 8.3), and the K-12 route needs COPPA, FERPA, DPA work counsel has not blessed. | Fatal as a venture plan. Survivable only as a grant-funded mission line. |
| B | Client-side checks can be forged; server re-run aborts the Node process on three trivial programs. Grades cannot be offered until M2. | Not fatal if sold as formative only; fatal if sold as grading. |
| B | The dashboard is not a moat and the buyer has never been interviewed. | Fatal if E1 fails (K1). |
| C | Phase 1 does not build a fault engine for user circuits. If the buyer wants to debug their own circuit, v0 cannot. | Not fatal for a pilot, fatal as the whole vision. |
| C | Trigger-hiding may need per-figure edits across many of the 80 figure pages. | Unknown until a one-day spike on 3 figures. |
| C | Fidelity: a debugging trainer must be right about causes, and the solver uses one 25 ohm constant for all boards and exits silently on non-convergence. | Not fatal if claims stay at concept level and E4 passes 9 of 10; fatal if two or more bench checks contradict the simulated symptom (C kill 4). |
| C | Free chatbots answer a novice's debugging question today. | Not fatal. It argues for graded practice over answers on demand, which is untested. |

## 7. What would change my mind

| Result | Effect |
|---|---|
| E2, E3 and E4 all pass in the first two weeks and 6 of 12 makers (A's E1) describe an own project in the last 90 days | Move step 6 forward and run it in parallel with step 3. A becomes the lead. |
| Tinkercad explains cause and fix for the three standard faults (C's E0 fails) | C loses its wedge. Fall back to A with the diagnosis as a feature, not the product. |
| Counsel says the inherited content cannot be used | Drop B and C as commercial plans. A with newly written templates survives. |
| 3 or more of 8 budget holders name a fund and ask for a quote (B's Q2-a, E4) | Add B's teacher layer after step 5, university first. |
| E4 bench check fails (two or more mismatches) | Pause all instructional claims until the model is fixed; this also blocks A's fault rules. |
