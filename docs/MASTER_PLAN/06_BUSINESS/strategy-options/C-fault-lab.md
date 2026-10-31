# Strategy C: Fault Lab (debugging and failure-based learning as the wedge)

Author: advocate for strategy C, council of three advocates. Written 2026-10-27. Nothing in this file changes the repo except this file.

Paths are relative to `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/` unless they start with `src/`, `figures/` or `e2e/`. Short names: FV = `01_AUDIT/FEATURE_VERIFICATION.md`, WB = `02_RESEARCH/WORKFLOW_BENCHMARK.md`, CL = `02_RESEARCH/COMPETITOR_LANDSCAPE.md`, CM = `02_RESEARCH/COMPETITOR_MATRIX.md`, MA = `02_RESEARCH/MARKET_ANALYSIS.md`, US = `02_RESEARCH/USER_SEGMENTS.md`, URP = `02_RESEARCH/USER_RESEARCH_PLAN.md`, memos = `00_EXECUTIVE/council/*.md`.

Labels: VERIFIED, DOCUMENTED, EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN. No interviews, no learning data and no demand data exist for iynk. Every claim about demand below is a HYPOTHESIS.

## 0. The case in one page

**Thesis.** Among the free browser tools tested, iynk is the only one that told the learner why a wiring mistake breaks things. That is a narrow, tested lead (WB section 6, CL line 29), and Velxio now narrows it (WB 4.5). The strategy bets that explained failure is a teaching job that a lecturer can pay for, if iynk turns it from "press Break it and read the answer" into "see a symptom, diagnose it, get graded hints" and proves that this improves debugging before a student touches real parts.

**Why this and not "a simulator".** The memos agree on three points that make a generic simulator a bad business: the institutional simulator market is small (MA section 6: base SAM USD 7.4M, year-3 capture about USD 0.3M a year), the free baselines are strong (Tinkercad, MakeCode), and iynk has no project model (FV section 6). A wedge has to be something the free baselines do not do and a buyer cares about. Wiring faults are the one candidate with a head-to-head result.

**What I claim.** Strategy C has the narrowest and cheapest first product of the three possible strategies. It reuses the most existing code, needs no project model, and its central claim can be tested with an experiment already designed (URP M7, rule Q4). If the experiment fails, the loss is small and the result is publishable.

**What I do not claim.** That the fault engine will work on arbitrary circuits soon (it will not; section 7), that learning improves (UNKNOWN), that bootcamps are a market (UNKNOWN, no evidence found; US section "Not researched: coding bootcamps"), or that this is venture-scale (it is not; section 6).

## 1. Customer map

| Role | Who | Evidence and label |
|---|---|---|
| Target customer (buyer) | A lecturer or lab manager of a first or second year electronics or embedded course, where lab time or parts are scarce. Beachhead: US community and four-year colleges, then Indian engineering colleges. | US segment 9 scores highest of 13 (26 of 35) and has a published competitor list price (EUR 30 per student per semester, Wokwi) [US sec 4]. Scores are the researcher's judgement: HYPOTHESIS. |
| Payer | The department or lab budget, per course per term. A lecturer with a small discretionary fund may pay for a single course. Students do not pay. | HYPOTHESIS (US segment 9 "Who decides"). Funds named by actual buyers: UNKNOWN, tested by E1 and E5. |
| Daily user, free | Students in those courses, plus individuals: self-taught makers and hobbyists stuck on a "why does my circuit not work" problem. | Individual use free is a design choice. Size of the stuck-maker audience: UNKNOWN. A 2022 forum user noticed Tinkercad shows a failed LED and Wokwi does not (CL line 581, anecdote). |
| Who benefits financially | The department (fewer burnt parts, fewer repeated lab slots), the lecturer (less TA time), and kit vendors indirectly. | HYPOTHESIS. No parts-loss figure exists in the evidence. A Thai university paper piloted Wokwi because hands-on work "often face[s] interruption due to hardware issues" [US S37, abstract only]. |
| Influencer | The lecturer and the TA first; the lab manager second; students' complaints about the real lab third. | HYPOTHESIS. |
| Organic distributor | The lecturer, who hands a link to the next cohort each term (courses repeat; US segment 9 "Repeat use: High"), and shared exercise packs. For individuals, links to "diagnose this fault" pages posted in answers to troubleshooting questions on maker forums. | Course repeat is a HYPOTHESIS. Forum behaviour is a HYPOTHESIS; Reddit was not readable in the research run [US sec 1, 5]. |

**Bootcamps are dropped from the beachhead.** The brief names them. No dossier found a link between bootcamps and hardware simulation (US "Not researched"). I will not argue for a segment with zero evidence. Reopen only if E1 interviews surface one.

**Not in scope for years:** children under 13, K-12 as a paying segment. The security memo says 13+ general terms and a data-free classroom mode, no direct under-13 service. K-12 teachers can use the free product; they are not the paying target.

## 2. The job and why the existing tools fail it

**Job to be done (HYPOTHESIS).** "When my students arrive at the bench without having seen what a wrong circuit looks like, I lose lab time and parts to mistakes that a few examples would have prevented. Give them those examples before the lab, and let me see which mistakes they could not diagnose."

For a self-taught learner: "When my circuit does not work, tell me what is likely wrong and why, so I learn rather than copy a fix."

| Tool | What it does for this job | Evidence |
|---|---|---|
| Wokwi | No warning in three captured wiring-fault runs (LED without resistor, reversed LED, 5 V to GND); simulation kept running. Beta AVR debugger and logic analyser help with code bugs, not wiring misconceptions. Classroom plan EUR 30 per student per semester, minimum 5, no teacher tools listed. | WB 4.1 and section 6; CL line 85; CL "Checked and held" line 756. One frame per case, one run each (TESTED, weak). |
| Falstad | LED without resistor glows fully with no message; short shows only current dots. | WB 4.2 (TESTED, one run). |
| MakeCode | Avoids wiring faults by having no wires. Strong debug mode for code. Not a rival on wiring faults, possibly a distribution partner. | WB 4.3; CL line 444 and 449. |
| Tinkercad Circuits | Reported to show a destroyed LED. Needs an Autodesk account, so it was not tested. Explanation depth UNKNOWN. | WB 4.4 note; CL line 413 and 419: the single biggest unknown for this strategy. |
| Velxio (open source, free tier, USD 34 per student per year classroom plan) | Warns before run on all three faults ("Circuit verification" dialog with the current and a "Run anyway" button). No burnt part, no worked sum, no repair in the dialog. Has ngspice, an Agent and a Tutor. | WB 4.5, CL line 26 and 635. TESTED 2026-10-27. |
| Arduino Cloud School ($20 per member per year) | Has an AI Assistant and Google Classroom integration; no failure modelling found. | CL; `02_RESEARCH/competitors/education.md` line 238. |
| LabsLand (EUR 7.99 to 19.99 per student per semester) | Real hardware, so real faults, but a learner cannot inject one. Queues. | CM line 140; education.md line 146 and 236. |
| Proteus | Does not enforce missing power or ground in older forum reports; a pro tool with price UNKNOWN. | CL line 583 (anecdote). |

**What nobody was found to do (UNKNOWN, not proven absent):** present a symptom first and grade the learner's diagnosis. CL line 693: "No education product advertised failure modelling in pages read (UNKNOWN)."

**Honest limit on the lead.** The tested lead is "explains after the fact", on three competitors, one scripted run each (WB section 6 says to repeat by hand before using it publicly). Tinkercad is untested. Velxio warns before run. The lead is real but small.

## 3. Unique value, and what is hard to copy

| Element | Hard to copy or merely convenient | Why |
|---|---|---|
| Fault detection and arithmetic ("113 mA against a 20 mA limit") | **Merely convenient.** | A DC solver with a fixed 25 ohm pin constant (`figures/engine/bench-solve.js:11`, FV C010, `01_AUDIT/inventory/figure-engine.md`). Velxio already has ngspice (CL line 382: "A rival with a real solver would find it easier"). |
| Authored corpus of 144 board failures and 106 bench faults with symptom, why and fix | **Slow to copy, not hard.** | Content work, months (CL line 503). A language model could draft a competitor's corpus; the review is the cost. The corpus is also bound to 38 hand-built figures (`01_AUDIT/inventory/content-schema.md` line 142), so it is an asset only inside the catalogue. |
| Diagnose-first grading with a hint ladder | **Convenient to copy once seen.** | A UI pattern. Not built yet. |
| **Aggregate misdiagnosis data** (which wrong cause learners pick for each fault, by course) | **Potentially hard to copy.** | It accrues only from classes using the product. It is also what a lecturer cannot get elsewhere: "40 percent of your class thought the LED was backwards when the resistor was missing." UNKNOWN whether lecturers value it; E1 tests it. |
| Trust and outcome evidence (a published pre/post result) | **Hard to copy if it exists.** | Competitors would need their own study. Today it does not exist for anyone (URP Q4: "No education product found models failures"). |
| Deterministic replay and no-account entry | Weak. | Replay is VERIFIED for flight only; no-account entry loses class management (CL line 414). |

So the durable value is not the engine. It is (1) a reviewed corpus, (2) the misdiagnosis data and (3) an outcome study. All three require running classes. That is why the first milestone is a class pilot, not a feature.

## 4. First milestone: Fault Lab for one course

Name: **iynk Fault Lab v0**. One lecturer, one course, one term. Smallest product that tests the thesis.

**What a student can do**

1. Open an exercise link from the lecturer (a class code, no email, a pseudonym chosen from a fixed list). Free, adults and 13+ only.
2. See a **symptom without the cause**: a running Uno R3 or breadboard figure from the existing catalogue in a faulty state, with serial output and visible readings. The Break it trigger is hidden. (Today the learner presses the trigger, so they already know the answer.)
3. Pick or write a diagnosis (what is wrong, why that gives the symptom), using structured choices drawn from the fault's own data. The learner may open hints in three steps: where to look, which measurement, the cause. Each hint open is logged.
4. Apply a fix, see the symptom clear, and answer one transfer question on a similar circuit.
5. Finish a pack of 8 to 10 exercises built from the existing 144 board failures (target: LED and resistor, polarity, pull-up and floating input, wrong voltage, brown-out, short, missing part, wrong pin in code).
6. Keep their progress in the browser and export a file.

**What the lecturer can do:** create a class code; pick a pack; after the deadline copy a CSV of per-exercise results by pseudonym and an aggregate "most common wrong diagnosis" table. No student accounts, no roster, no LMS.

**What the researcher (founders) can do:** run the M7 crossover (URP section M7): a correct-first build option that hides the trigger (the URP says the option does not exist today and its effort is UNKNOWN).

**Out of scope for v0**

| Out | Why |
|---|---|
| Arbitrary circuits, a project editor, a netlist | Needs CTO Steps 2 to 5 (section 7). The wedge must not wait for them. |
| AI hints | Security and AI memos: no ledger, no identity, abuse ceiling about USD 120 per hour per warm instance (ESTIMATED), minors' terms unresolved. v0 hints are authored data. |
| Rooms, buddies, voice, leaderboard, daily challenge, drones, robotics | The security memo says the networked layer is the compliance problem. The product-learning memo says counters measure activity, not skill. |
| Accounts, LMS, payment, certificates | No payment taken in v0. Credentials are forgeable (FV; solana inventory). |
| New languages | Frozen at six. The safety text in a fault (battery, voltage) must be reviewed by a native speaker before it ships in that language (product-learning risks). v0 ships English first. |
| Any claim "works on a real bench" | Fidelity memo: nothing has been compared with hardware. Copy says "teaching model; what it models" (section 8). |

**Definition of done for v0:** one lecturer's class of at least 25 students completes at least 5 exercises each at 60 percent or more; the lecturer exports the CSV and says in writing whether they would use it next term; the engineering gates in section 7 are green.

## 5. How competitors would respond, and how fast

All speeds are HYPOTHESIS. No dossier measured release pace for Tinkercad, Wokwi or Velxio (CL line 419: "UNKNOWN").

| Competitor | Likely response | Speed | What is left for iynk |
|---|---|---|---|
| Wokwi | Add electrical-rule warnings (an ERC-style check). Possibly a classroom assignment view. Unlikely to build a pedagogy layer; its audience is firmware developers. | Warnings: weeks to months. Teaching layer: UNKNOWN. | The graded diagnose-first loop and the class-level misdiagnosis data. |
| Tinkercad (Autodesk) | Could add richer failure explanations. Priority for Circuits is not visible. Has teacher classes already. | UNKNOWN: months to never (CL line 419). | If Tinkercad already explains faults well, the wedge shrinks to nothing. This is the biggest unknown; check it before building (E0). |
| MakeCode | Will not add wiring faults; no wires by design. | Never. | A partner for the code half. |
| Arduino (Qualcomm) | Extend its existing AI Assistant to "explain my error". Has Classroom integration. | Months. | Simulation-grounded cause (a computed number) versus a language-model guess. |
| Velxio | Closest. Already warns, has ngspice, AI tutor and a USD 34 per student classroom plan. Open source, AGPL. Could add a burnt-part visual and explanations in weeks. | Weeks to months (CL line 635: severity High). | The reviewed corpus and any outcome evidence. Not the engine. |
| General AI assistants | A student pastes a circuit description into a chatbot and gets a diagnosis today, for free. | Already true. | Honest answer: for novices this is the real competitor. iynk's position is graded, ungameable practice with a computed cause, not answers on demand. Untested. |

Net: a competitor can match the visible feature within a term. The strategy survives only if the corpus, data and evidence matter to buyers. That is the bet.

## 6. Money

**Free forever for learners:** running, editing, diagnosing, saving, sharing links to exercises. This follows the business memo (never gate running, editing or sharing).

**Paid (HYPOTHESIS, not tested):** instructor features around a course.

| Offer | Price hypothesis | Comparable | Basis |
|---|---|---|---|
| Course pack, per student per semester | EUR 5 to 8 | LabsLand Standard from EUR 7.99, Advanced EUR 19.99 per student per semester (MA table); Wokwi Classroom EUR 30; Arduino School USD 20 per member per year; Velxio USD 34 per student per year | Below LabsLand and Wokwi because iynk lacks projects, compile and LMS. URP rule Q2-e: keep per-seat revenue only if intended price point is at or above USD 20 per student per year for 30 percent or more of respondents; this price is lower, so rule Q2-g may apply. |
| Flat course licence | USD 250 to 400 per course per term, up to 60 students | Wokwi example: 30 students = EUR 900 per semester (MA section 3) | Flat prices avoid per-seat procurement. |
| First course | Free in exchange for pilot data | Standard pilot practice | Builds the evidence. |
| Research and education grants | Fund the M7 study and open exercise packs | MA section 9 (grants; several unread or archived: business memo risk) | Eligibility depends on legal entity: UNKNOWN. |

**Revenue arithmetic (ESTIMATED, assumptions shown).** 50 paying courses x 40 students x EUR 6.5 x 2 semesters = about EUR 26k a year. 200 such courses is about EUR 104k. My strategy's addressable slice is the college and university lines of MA section 6.2: US colleges SOM USD 109k, India engineering USD 21k, EU higher education USD 19k, total about USD 149k a year in year 3 (base case). **That is half of the three-region SOM of USD 0.30M, and it is the ceiling of this strategy unless something else is added.** The low case is USD 23k for all three regions combined; the high case USD 2.43M.

**Plain conclusion.** This pays for about one person at best by year three. It is a bootstrap and grant business, consistent with the CEO memo. It is not a venture case, and I do not argue that it is. The venture case would require the Phase 2 platform, which is a different strategy.

**Individuals:** no subscription. Revisit only if weekly actives exceed 5,000 and a T6 click-through reaches 2 percent (business memo trigger).

## 7. Engineering cost

Team: 2 to 3 engineers. Unit: engineer-weeks of focused work by a competent engineer new to the repo, as in `00_EXECUTIVE/council/cto-platform.md` section 7. ESTIMATED; no spike has validated these figures.

### Phase 1: Fault Lab v0 on the existing catalogue

| Package | Best | Expected | Adverse | Basis |
|---|---|---|---|---|
| A. Gates: CI (tsc, eslint, content check, vitest, figure-rebuild diff), deterministic unit gate, security headers | 1 | 2 | 3 | CTO package A. The suite is red under load (FV C039: 13 wall-clock timeouts at load 38 to 117). |
| B. Diagnose-first mode: hide the trigger, symptom-only view, diagnosis picker, hint ladder, fix, transfer question | 2 | 3 | 5 | New UI over `FailureMode` (`src/lib/content/schema.ts:243`: symptom, explanation, fix already exist). Figure bridge `set` and `query` messages exist. |
| C. Author and review 40 diagnose items (symptom variants, wrong-cause distractors, hints), English | 1.5 | 2.5 | 4 | Existing 144 failures carry text; distractors and hints are new. A lecturer or EE reviews. |
| D. Event instrumentation (code.changed, check.transition, hint.open, diagnose.answer), local save, file export | 1 | 1.5 | 2.5 | Product-learning memo items 1 and 5; telemetry exists but is thin. |
| E. Class code, pseudonyms, result CSV and aggregate table, with an anonymous signed session and per-class limiter | 2 | 3 | 5 | CTO package H (narrow slice); security memo data-free classroom mode. |
| F. Trust minimums: networked features off in this build, telemetry opt-in, remove buddy listing, 13+ terms, privacy page, copy fixes (FV section 7), licence and provenance decision with counsel | 2 | 3 | 5 | Security memo "Build first"; adult relaunch is 4 to 7 engineer-weeks in total; I count only what a data-free build needs. Legal cost is extra: USD 4.5k to 15k (security memo, ESTIMATED). |
| G. Fix feedback that teaches wrong lessons (silent unknown `#include`, "not connected" without the pin), "what it models" panel | 1 | 1.5 | 2.5 | Product-learning memo; fidelity memo (2 to 3 days for the panel). |
| H. Support the M7 study (correct-first option, fidelity log) | 0.5 | 1 | 2 | URP M7: effort UNKNOWN. |
| **Phase 1 total** | **11** | **17.5** | **29** | |

Calendar for 2 to 3 engineers with ramp and review (ESTIMATED): about 5, 8 and 15 weeks. Adverse assumes the figure bridge cannot hide the trigger without per-figure edits (80 figure pages), a security finding that needs relay work, and slow legal answers.

Not in these numbers: counsel's licence answer on the three-site content (security memo: founder action before any commercial step), native-speaker review of other languages, the study's participant recruitment, and any real-bench validation (USD 2.5k to 5k and 6 to 8 person-weeks, fidelity memo).

### Phase 2: fault engine on arbitrary circuits (only if Phase 1 evidence passes)

This is the CTO's minimum original-project builder minus items already counted: packages B to H and I of `cto-platform.md`: about 21 best, 35 expected, 58 adverse engineer-weeks (the CTO's 22 / 37 / 61 less package A). Calendar about 10, 20 and 43 weeks. It contains the generic fault rules that make the thesis real for "your own circuit" (CTO Step 5: zero false alarms on the 79 catalogue circuits and at least 18 of 20 deliberately broken ones caught). Section 12 explains why I do not pretend this away.

### What it reuses and what it does not

| Reuse (per audit verdicts) | Source |
|---|---|
| `FailureMode`, `Check`, `WorldModel`, `BuildStep` types and 250 authored faults | `01_AUDIT/inventory/content-schema.md` line 137, 163 ("extend for the catalogue") |
| The three interpreters (C++, Python, Verilog) as the code runner for exercises | CTO memo: keep |
| Figure bridge and `FigureFrame` | CTO memo: keep |
| The 38 catalogue items as the exercise bank | content-schema line 163 |
| i18n pipeline (6 languages, 2,064 UI keys each) | FV C023 (quality unreviewed) |
| Telemetry plumbing, e2e harness (116 of 119 passing) | FV; `01_AUDIT/runs/E2E.md` |

| Replace or do not use | Source |
|---|---|
| `bench-solve.js` as the engine for user circuits (DC only, no C, L, MOSFET, regulators; cannot take a netlist from outside a figure; silent non-convergence) | figure-engine inventory lines 59, 73, 79; CTO memo: "The circuit solver must be replaced" |
| Persistence and identity: none exists | FV section 6 |
| Realtime rooms, buddies, AI chat, wallets, leaderboard | Security and AI memos: off for this product |

## 8. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **Teaching a model, claiming a bench.** "Measurably improves debugging before students touch real hardware" is a transfer claim. The simulator was never compared with hardware, the tests are circular, and the 113 mA figure comes from a 25 ohm constant (FV C010; fidelity memo). A student could learn a wrong diagnosis rule. | High | Claim only concept-level diagnosis. Publish a tier badge and a "what it models" panel. Do not say "validated" before bench checks. Run E7 on 10 faults. |
| R2 | **Show-and-tell is not diagnosis.** Today's Break it lets the learner cause the fault. That teaches reading explanations, not diagnosing. The pedagogy this strategy relies on is not built (product-learning memo: "diagnose-first"). | High | Build it first (package B) and measure (E2). |
| R3 | **No learning evidence for anyone.** A web search for this file found small, single-site studies and a review saying troubleshooting research for electronics is "almost non-existent"; no large controlled trial of fault-diagnosis simulation for novices (EXTERNAL, search summary, see Sources below). A simulation with prediction-observation-explanation reduced diode misconceptions in 34 students (EXTERNAL, one 2013 study, abstract only). Effect size for iynk: UNKNOWN. | High | URP M7 with pre-registered rules. If Q4-b triggers, stop. |
| R4 | Authored content does not scale: every board, language and course adds hand-written faults. AI-drafted faults can be confidently wrong. | Medium | Reviewer in the loop; start with 40 items; measure hours per item (E8). |
| R5 | Small market and slow procurement. USD 149k a year is the base-case ceiling for the university lines. Budget cycles may exceed a term (URP Q2-b). | High | Bootstrap and grants. Free first course. Plan as a mission project with a revenue line. |
| R6 | Free competitor or Tinkercad already explains faults, or Velxio adds burn visuals and a classroom view. | High | E0 before building; track Velxio releases monthly. |
| R7 | Chatbots give a novice a diagnosis for free. | Medium | Differentiate with graded practice. Test whether students use it as a substitute (E2 think-aloud). |
| R8 | Trust failure: abused open endpoints, child-safety incident, provenance claim from the three original sites, no licence. | High | Phase 1 package F. The business stops until the licence decision exists. |
| R9 | Hollow passes: "Do it" and reference-solution buttons make completion meaningless (product-learning memo). | Medium | Diagnosis must be answered before a fix is offered; log the largest hint used. |
| R10 | Mistranslated safety text in other languages causes harm (battery, voltage). | Medium | English first. No other language until reviewed. |
| R11 | Bus factor of one and a green suite that is only green on a quiet machine. | Medium | Package A first. |
| R12 | Two-person founder capacity: teaching sales, a study, compliance and engineering at once (business memo). | High | One lecturer, one course first. |
| R13 | Strategy drift: the mission is original projects; this delays them. | Medium | Be explicit: C is a wedge, not the vision. Phase 2 builds the engine the vision also needs. |

## 9. Evidence required before committing

Pass or fail thresholds are my planning values unless a URP rule is named. None of these has been run.

| ID | Experiment | Cost | Pass | Fail |
|---|---|---|---|---|
| E0 | Run the three wiring faults by hand on Tinkercad (with an account) and on Velxio again; capture the text shown | 1 day | Tinkercad shows no explanation of why (a visual only) | Tinkercad explains cause and fix: kill or reposition |
| E1 | 10 conversations with lecturers and TAs of intro electronics or embedded courses (URP M1 style), no demo first | 2 weeks | At least 4 of 10 name student debugging, burnt parts or lost lab time as a top-3 pain unprompted, and at least 3 say they would pilot a pre-lab pack | Fewer than 2 name it |
| E2 | Diagnose-first prototype with 10 adults (3 non-English-first) on 6 faults, think-aloud (URP M2) | 3 weeks including build of package B | At least 7 of 10 correctly diagnose at least half the faults without the largest hint, and fewer than 3 of 10 skip to the answer | More than half guess or use the largest hint on most items: redesign |
| E3 | Fault authoring time | during C | An EE reviewer completes one reviewed item in 2 hours or less | Over 4 hours: corpus cannot scale |
| E4 | Real-bench check of 10 non-destructive faults on an Uno with a multimeter | 1 week, under USD 300 (ESTIMATED parts and meter) | Predicted symptom matches the bench in 9 of 10 | Two or more mismatches: fix copy and model before any pilot |
| E5 | Pilot: 1 lecturer, 1 class of 25 or more | one term | At least 60 percent finish 5 or more exercises; lecturer says in writing they would use it next term | Under 40 percent finish; blockers named by 3 or more are technical (URP Q3-g) |
| E6 | M7 crossover study (URP): 51 or more completers, fault-first versus correct-first | 13 weeks | Rule Q4-a: positive difference in gain, 95 percent interval excludes 0, d_z of 0.3 or more | Rule Q4-b: interval includes 0 and upper bound under 0.3 d_z |
| E7 | Physical-transfer pilot (product-learning memo): 8 to 10 adults, iynk Fault Lab versus a worked-example page, then fix a real faulty breadboard | 4 weeks | Fault Lab group finds and fixes the real fault faster by 25 percent or more in median time | No difference or slower |
| E8 | Fake-door price test and priced waitlist for a course pack, no payment taken (MA T1, T6; URP Q2-h) | 4 weeks | At least 3 of 15 budget holders ask for a quote, or at least 3 percent of teacher visitors join the priced waitlist | Fewer than 2 of 8 can name a fund (Q2-b): no bottom-up sales |
| E9 | Phase 2 gate, only after E1 to E6 pass: spike RS-08a (solver against ngspice on 20 circuits, 18 of 20 within 2 percent) and the 50-sketch interpreter coverage test (CTO Step 1) | 2 weeks | Both pass | Either fails: stay on the catalogue and become a content product |

Order: E0, E1 and E3 run before any code. E2 and E4 before the pilot. E5 and E6 run together. A funder or partner should see E1, E2, E4 and E5 results before Phase 2 is started.

## 10. Kill criteria

Stop or change course if any of these happens. Each is measurable.

1. E0 shows Tinkercad or Velxio already explains cause and fix, with a visual, for the three standard faults, and offers classes. Reposition to an open exercise bank, or stop.
2. E1: fewer than 2 of 10 lecturers name debugging or lost lab time as a top-3 pain.
3. E6 hits Q4-b (no benefit at the planned size). Drop "learn debugging" as the headline, as the URP already pre-commits.
4. E4: two or more of ten bench checks contradict the simulated symptom, and the fix needs the engine rewritten. Pause all instructional claims until the model is fixed.
5. 15 asked lecturers or departments and zero agree to a pilot within 6 months.
6. Authoring needs more than 4 hours per reviewed item (cannot reach 100 items in a year).
7. After 12 months: fewer than 3 courses use it in a second term, and fewer than 3 institutions say in writing they would pay. Convert to an open, grant-funded project (CEO memo fallback).
8. A rights holder of the three original sites objects and the licence cannot be resolved (security memo).

## 11. What a perfectionist and a pragmatist would say

| Perfectionist | Pragmatist |
|---|---|
| Do not start until Tinkercad is tested and the fault engine is honest. A teaching model sold as "better debugging before real hardware" is a trust bomb if one EE finds a wrong number. | One lecturer and 40 items is cheap. Run the pilot with the English catalogue and the "what it models" panel; the bench check E4 costs under USD 300. |
| Hand-authored faults on 38 figures is a dead end for a platform. Build the project model first. | The project model costs 37 expected engineer-weeks (CTO) and no one has asked for it (URP Q1-a untested). A narrow product that proves demand is the cheaper order. |

## 12. Where this strategy is weak (plain statement)

1. **The thesis needs a general fault engine, and there is none.** Faults today are `FailureMode` rows bound to figure part ids and hand-written fault strings (`01_AUDIT/inventory/content-schema.md` line 142). The solver cannot take an outside netlist (figure-engine inventory line 73). So "original projects follow once the fault engine works on arbitrary circuits" means Phase 2: 35 expected engineer-weeks, and it also needs the project model. Phase 1 proves demand; it does not build the engine. If the buyer wants to debug their own circuit, v0 cannot.
2. **The lead is thin and narrow.** One scripted run, three competitors, Tinkercad untested, and Velxio already warns. An honest reading is "equal on detection, ahead on explanation, behind on everything else."
3. **The core educational claim is unproven for iynk and weakly supported in the literature.** No large controlled trial found. The effect may be zero.
4. **Fidelity.** A debugging trainer is exactly the product that must be right about causes. The solver is a teaching model with a hard-coded 25 ohm pin resistance for every board, silent non-convergence, and no capacitors, regulators or MOSFETs. Realistic faults (regulator, brown-out) are rules.
5. **Revenue is small.** About USD 149k year-3 ceiling in the base case for this segment, and every price point is a HYPOTHESIS. It is not a growth company.
6. **No distribution evidence.** Lecturers handing links to the next cohort is plausible and untested. No teacher view exists today.
7. **Bootcamps have no evidence.** I removed them.
8. **It narrows the founders' vision.** Imagine, design, assemble, wire, program, simulate, debug, learn, collaborate, optimise, build for real: this strategy owns one word, "debug", and postpones "imagine" and "design". Whether the founders accept that is their call.
9. **A chatbot is a free substitute** for the novice's own debugging question, and iynk cannot stop that.
10. **The advocate's conflict.** The audit's best idea and my strategy are the same thing. That makes it easy to over-believe; the kill criteria above exist for that reason.

## Sources added by this file

Only one external search was run. Results are search summaries, not read in full; treat as EXTERNAL, weak.

- National Taiwan Normal University record, "correcting misconceptions on electronics: effects of a simulation-based learning environment" (34 engineering sophomores, diode misconceptions): https://scholar.lib.ntnu.edu.tw/en/publications/correcting-misconceptions-on-electronics-effects-of-a-simulation--2/
- Heriot-Watt University record, "Teaching the art of fault diagnosis in electronics by a virtual learning environment" (first-year students, 2002 and 2003): https://researchportal.hw.ac.uk/en/publications/teaching-the-art-of-fault-diagnosis-in-electronics-by-a-virtual-l/
- ASEE PEER paper on simulator troubleshooting with first-year students (Tinkercad, qualitative): https://peer.asee.org/59474
- The statement "engineering education research on fault-finding is almost non-existent" is from a review surfaced by the same search; the exact source URL was not opened.

Other evidence is cited by repo path above.
