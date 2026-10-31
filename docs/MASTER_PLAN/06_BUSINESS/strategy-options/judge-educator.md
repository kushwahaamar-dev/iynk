# Judge report: educator lens (learning scientist and electronics instructor)

Judge: educator. Date: 2026-10-27. Papers judged: `A-creator-builder.md`, `B-classroom.md`, `C-fault-lab.md` (all in this folder), read in full.
Labels: VERIFIED, DOCUMENTED, EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN. I ran no product and no interviews. I spot-checked the advocates' numbers against `02_RESEARCH/MARKET_ANALYSIS.md` and `02_RESEARCH/USER_SEGMENTS.md`. I did not re-read the full audit; where I lean on an audit fact I cite it as the advocate's citation of the audit.

## 1. How I read the three papers as an instructor

I have taught first-year circuits and embedded labs. Four things decide whether a lab tool survives in a course.

1. Does it fit a syllabus week that already exists? A tool that covers 3 weeks of a 14-week course gets used for 3 weeks.
2. Does it cost the teacher time? A teacher will not mark 40 code files, set up rosters, or answer privacy questionnaires for a free tool.
3. Does it run on what students own? Chromebooks, school networks that block sockets, phones, shared lab PCs.
4. Does it change what students can do on the real bench? The test is the physical board, not the simulator.

What I take from the evidence on each:

- **Learning science.** Novices learn better from guided tasks than from open building. The advocates cite Kirschner, Sweller and Clark through `product-learning.md`; I agree with that reading. Prediction, observation, explanation cycles and worked examples are well supported in physics and electronics education in general. Fault-finding training for electronics specifically has a thin base: C's own search found small single-site studies and a review calling the field "almost non-existent" (C, R3; EXTERNAL, weak, search summaries only). So all three strategies make a learning claim that nobody has evidence for. C is the only one that puts the claim at the centre and designs a test for it.
- **Classroom reality.** The main objections to B are not technical. They are teacher time, school IT review and budget. B's own K2 and E2 show it knows this.
- **What is verified in the product.** Per the papers' citations of the audit: Blink passes untouched (hollow completion), edited code is lost on reload, Break it lets the learner trigger the fault so they already know the answer, the 113 mA figure comes from a fixed 25 ohm pin constant, nothing has been compared with a real bench, client-side checks can be forged, the interpreters are a hand-written subset. These are the facts that limit every strategy.

## 2. Checks of the advocates' numbers

| Claim | Where | Check | Result |
|---|---|---|---|
| Base SAM USD 7.4M, three-year capture about USD 0.30M a year | A s7, B s0/s8.3, C s6 | `MARKET_ANALYSIS.md` lines 7, 205, 214 | Matches. All three use the same sizing. |
| US colleges SOM USD 109k; C's slice is about USD 149k (109k + 21k India + 19k EU) | C s6 | `MARKET_ANALYSIS.md` line 198 gives 109k for US colleges | Arithmetic matches. C says plainly this is half of the total and about one salary. |
| Segment 9 scores 26 of 35, highest | B s2, C s1 | `USER_SEGMENTS.md` line 280 | Matches. Line 292 also says it leads mainly because Wokwi already charges it. That shows willingness to pay exists for Wokwi, not for iynk. B and C both quote it; neither stresses the caveat enough. |
| A: segments 1-4 and 7 score 24, 24, 18, 20 | A s1 | Not re-checked line by line | Taken as stated. A also says ability to pay is scored 1 for segment 1 and 3 for makers. A is honest that its users are not its payers. |
| B: 17 / 31 / 50 engineer-weeks for M1 | B s9.1 | Sum of the table rows is 17 / 31 / 50 | Arithmetic correct. The table covers plumbing, not the content a teacher needs. |
| A: 27 / 43 / 72 | A s8 | Rows sum to 27 / 43 / 72 | Arithmetic correct. A rests on CTO's 22 / 37 / 61, which no spike has validated. |
| C: 11 / 17.5 / 29 | C s7 | Rows sum to 11 / 17.5 / 29 | Arithmetic correct. C counts only a data-free class mode, so it is cheaper partly by doing less (no teacher login, no dashboard). That is a fair scoping choice for a pilot, not a hidden saving. |
| A's cost to the mission: "does not address money, place, language, equipment directly" | A s12.7 | First-load JS is 2.2 MB raw, 701 KB gzip before any editor (A cites `PERFORMANCE_BASELINE.md` B3) | A admits this. B's E7 and A's E3 are the same device test; nobody has run it. |

No advocate inflated the market. All three admit the money is small. The overclaims are about pedagogy and moat, covered below.

## 3. Scores

Scale 1 to 5. For cost and risk, 5 means cheap and low risk. Total is the plain sum (maximum 40).

| Strategy | User value | Frequency of need | Differentiation | Monetisation | Feasibility on this codebase | Cost and risk | Mission fit | Speed to evidence | Total |
|---|---|---|---|---|---|---|---|---|---|
| A creator-builder | 3 | 3 | 2 | 2 | 2 | 1 | 4 | 2 | **19** |
| B classroom | 3 | 4 | 2 | 3 | 3 | 2 | 3 | 3 | **23** |
| C fault lab | 4 | 3 | 3 | 2 | 4 | 4 | 3 | 4 | **27** |

### A: creator-builder (19)

- **User value 3.** For a self-directed learner with a half-formed idea, own-project capability is the thing they ask for. For a novice it is the wrong condition (A admits this in s12.6). The Uno-only, 12-part, eight-fault scope is honest but small. Real student projects use libraries (DHT, Servo, SoftwareSerial, LCD) the interpreters lack (B s5, citing the interpreter inventory). A's E2 tests this, but the answer is unknown.
- **Frequency 3.** Project work is episodic. A says so in risk 10. A course project happens once a term; a hobbyist project is a weekend. Compare the repeated weekly use in B.
- **Differentiation 2.** A's whole edge is the fault-rule library on circuits the authors never saw, and A itself says that if it fails there is no edge over Velxio and Wokwi (A s4). The edge is a one-run test (n=1) that Velxio has narrowed.
- **Monetisation 2.** A's payers are a separate product (class mode). Individuals pay little. A says it is a mission organisation with a revenue line.
- **Feasibility 2.** 43 expected engineer-weeks, replacing the solver, editor and project model. CTO calls the repo a prototype to mine. The spikes (editor on phones, solver vs ngspice, 50-sketch coverage) are unrun. A 5.5-month expected calendar for 2 to 3 people, with an adverse case of about 50 weeks.
- **Cost and risk 1.** Largest spend, user-generated content with minors in the audience, fidelity risk moves from curated to uncurated circuits (A s12.5), and a confident wrong diagnosis on a student's own circuit is a trust event.
- **Mission fit 4.** It is the closest to the founders' stated vision (imagine to build). It addresses money (no kit). It does not yet address place or equipment, because no low-end device test exists.
- **Speed to evidence 2.** E1, E2, E3, E4 are cheap (2 weeks). But the thesis test E5 needs a working prototype, and E7 needs 6 to 8 weeks live with 200 saved projects.

### B: classroom (23)

- **User value 3.** The student gets what they get today plus autosave, a diagnose-first Break it and a meaningful-pass rule. The teacher gets a real benefit: a view of who is stuck. But B's M1 is formative only and warns "not for grading". Teachers who need marks cannot trust it until M2.
- **Frequency 4.** Weekly use during a term, and courses repeat each year. Best of the three on this measure, if adoption happens.
- **Differentiation 2.** B admits that roster, assignments and a dashboard are easy to copy, and Wokwi already owns the paying instructor (B s7). The defensible part is the diagnosis data, which is C's idea inside B.
- **Monetisation 3.** The only strategy where the buyer has a published comparable price (Wokwi EUR 30 per student per semester, LabsLand from EUR 7.99, Arduino USD 20, Velxio USD 34). Still small: B's own arithmetic says compliance cost (USD 25k to 55k a year at 10,000 weekly actives, ESTIMATED from `business-growth.md`) exceeds early revenue. Procurement is slow.
- **Feasibility 3.** Reuses lessons, checks and the Zod and token-hash patterns. But the pilot needs teacher sign-in, a database, migrations, rate limiter, privacy path and WCAG on two surfaces. 31 expected weeks. Only 16 Uno lessons; other boards 4 to 7 (B s11). Syllabus fit is UNKNOWN (B's E8 tests it).
- **Cost and risk 2.** Most non-engineering work: DPA, VPAT, counsel (USD 17k to 65k for the school tier, ESTIMATED), selling and support at 30 to 50 percent of team time (B s9.3, HYPOTHESIS). The buyer is someone the team has never spoken to.
- **Mission fit 3.** B concedes it serves institutions first and may drift toward rich-market universities. Sponsored seats and free students partly offset this. The mission says "anyone, anywhere"; a classroom-first product reaches people who already have a teacher.
- **Speed to evidence 3.** E1, E2 (Wizard-of-Oz on today's product), E3 and E8 need no classroom code and fit in 4 to 6 weeks. But a term is the natural unit; a real adoption signal (return next term, purchase order) takes 9 to 12 months (K3).

### C: fault lab (27)

- **User value 4.** It targets the one thing a bench instructor most wants students to have before the lab: seen failures. Diagnose-first with a hint ladder is the pedagogically strongest design in the three papers (prediction and explanation before the answer, hint use logged). The misdiagnosis table ("40 percent of your class thought the LED was backwards") is real formative assessment and costs the teacher no marking time. Value is capped by the thin evidence and by fidelity (see below).
- **Frequency 3.** Pre-lab packs recur each term, but a pack of 8 to 10 exercises is used for a few weeks. Individuals have a stuck-circuit moment episodically.
- **Differentiation 3.** The only tested lead of any of the three: iynk explained the cause in the benchmark, Wokwi and Falstad did not, Velxio warned but did not explain (C cites `WORKFLOW_BENCHMARK.md` 4.1 to 4.5). One run each, Tinkercad untested, so the lead is thin. A graded diagnose-first loop is not found in any education product page read (UNKNOWN, not proven absent). I give a 3, not a 4, because a chatbot gives a novice a diagnosis for free today (C s5 says so honestly).
- **Monetisation 2.** C's own ceiling is about USD 149k a year in the base case and its price (EUR 5 to 8 per student per semester) is below the comparables. Honest, and no better than B.
- **Feasibility 4.** Extends `FailureMode` (symptom, explanation, fix already exist), figure bridge messages `set` and `query`, 40 new items to author. 17.5 expected weeks. The risk is hiding the trigger in 80 figure pages; C names this as its adverse case. No project model needed for v0.
- **Cost and risk 4.** Smallest build, no accounts, no AI, no networked features. Cost left is legal (USD 4.5k to 15k) and the bench check (under USD 300, ESTIMATED).
- **Mission fit 3.** Free for every learner, no kit, no account, English first (not yet "language"). It owns one word of the founders' workflow ("debug") and C says so (s12.8). It is a wedge, not the vision.
- **Speed to evidence 4.** E0 takes one day (test Tinkercad and Velxio by hand). E1, E3, E4 take weeks and no code. E2 is a 3-week prototype. A pilot can run in one term, and the M7 study design already exists in `USER_RESEARCH_PLAN.md`.

## 4. What the educator lens adds that the advocates miss

1. **The strongest pedagogical idea in the whole set is diagnose-first, and it appears in both B (6.1) and C (s4).** B's pilot already contains it. So B and C are one product viewed from two sides: C is the learning design, B is the teacher wrapper. Treating them as rivals wastes the overlap.
2. **A fault lab trains a mental model, and the model is currently wrong in places.** The 25 ohm pin constant, no capacitors or regulators, silent non-convergence (C s12.4). A fault trainer is the product class that must be right about causes. C's bench check (E4, 10 faults on a real Uno with a multimeter, under USD 300) is the single cheapest high-value test in all three papers. A and B have no equivalent. I would make it a hard gate before any student sees a score.
3. **Catalogue coverage is the real classroom blocker, and only B tests it (E8, 10 syllabi, 5 of 10 with at least half the weeks covered).** C proposes 40 diagnose items from 144 failures; whether 40 items fit a lecturer's week plan is not tested. I would add E8 to C.
4. **The transfer claim is the claim that matters, and the evidence base is nearly empty.** Both C's E7 (physical transfer, 8 to 10 adults) and B's E9 test it. An instructor will ask "do my students fix a real board faster?" before "do they like the tool?". I would put the physical-transfer pilot ahead of the 51-completer crossover study, because it is cheaper and speaks directly to the buyer's question.
5. **Hollow completion corrupts every dashboard.** Blink passes untouched (per `runs/BROWSER_WALK.md` step 2, cited by B and the learning memo). Any teacher view built before the meaningful-pass rule would show green boxes that mean nothing. B has this in M1; C handles it with "diagnosis before fix".
6. **Teacher time is the scarce resource, so data-free beats account-based for the first pilot.** C's class code plus pseudonym plus CSV needs no teacher login, no roster and no privacy contract beyond a page. That is how a time-pressed lecturer actually adopts. B's full dashboard is justified only if B's Q3-b fires (6 of 12 teachers need per-student work view). The `security-privacy.md` and `product-learning.md` memos both say the same.
7. **School networks and devices are untested in all three.** B's E7 and A's E3 are the same Chromebook and mid-range phone test. Nobody has run it. It costs one week and should run first for any strategy.
8. **Privacy and age.** 13+ general terms and no direct under-13 service (security memo) rule out most K-12 primary-school classrooms. University and college is the right beachhead, as B and C both say. High-school CTE can use the free product but is not a paying target for years.

## 5. Recommendation

**Choose a precise hybrid: C as the product, with B's thin classroom wrapper and B's evidence sprint. Defer A.**

Parts taken, exactly:

| From | Take | Leave |
|---|---|---|
| C | Fault Lab v0 as the product: symptom-first view with the trigger hidden, diagnosis picker, 3-step hint ladder logged, fix, transfer question, 40 reviewed items, class code plus pseudonym plus CSV plus "most common wrong diagnosis" table, no accounts, no AI, no networked features, English first. Evidence plan E0, E3 (authoring time), E4 (bench check), E7 (physical transfer). | Phase 2 commitment (generic fault engine). It stays a gated option, not a plan. The M7 crossover study stays optional until E7 and the pilot read out. |
| B | The evidence sprint before code: E1 interviews (budget holders and teachers), E2 Wizard-of-Oz pilot on today's product, E3 priced waitlist, E8 syllabus-fit collection, E10 counsel opinion. The Step 0 trust fixes. The meaningful-pass rule (one edit plus one quiz answer) for the lessons used. University-first targeting, India second, high school third. Autosave of edited code. | Teacher accounts, full dashboard, LTI, LMS, server re-run of checks, DPA/VPAT work. Build them only if Q3-b fires (6 of 12 teachers need per-student work view) or a paid pilot asks. |
| A | Nothing in v0. | The builder. See graft list for what is cheap and worth lifting. |

Why this ordering:

- It is the cheapest way to answer the question that decides everything for an educator: does diagnose-first practice change what students can do on a real bench? Its expected cost is 17.5 engineer-weeks (C), against 31 (B) and 43 (A).
- It uses what exists (`FailureMode`, 144 failures, figure bridge, interpreters) and avoids the three biggest unvalidated builds (project model, solver replacement, editor).
- Every kill criterion is cheap to reach. If Tinkercad already explains faults well (E0, one day), the wedge dies in a day. If a bench check finds two mismatches in ten (E4), the model is fixed before any pilot. If 15 asked lecturers refuse a pilot, stop.
- It keeps the door open for the founders' vision: Phase 2 builds the engine the vision needs, but only after evidence.

Decision sequence I would hold the founders to:

1. Week 0 to 1: E0 (Tinkercad by hand, Velxio again), the device test on a Chromebook and a mid-range phone, Step 0 trust fixes that need no design, counsel brief.
2. Week 0 to 6: E1 interviews with 10 lecturers and TAs (C) and 8 budget holders (B), E8 syllabus collection, priced waitlist page. No new product code except the diagnose-first prototype for E2.
3. Week 4 to 8: E4 bench check of 10 faults; E3 authoring time for 5 items.
4. Gate at week 8: continue only if the C thresholds (at least 4 of 10 lecturers name debugging or lost lab time as a top-3 pain; EE reviewer at 2 hours or less per item; bench match 9 of 10) and B's Q2-b (at least 2 of 8 budget holders name a fund) hold, or grant money covers the build.
5. Then Fault Lab v0 pilot with one lecturer and one class of at least 25, with E7 running alongside.

## 6. Ideas worth grafting from the others

From A:
- Autosave and survive-reload for edited code. Every strategy needs it and it is small (TD A11 "S" per B).
- The "What it models" panel and a tier label on every exercise ("teaching model, not a bench test"). C already has it; A specifies it better.
- Refuse rather than guess: show "not modelled yet" instead of a confident wrong diagnosis. Essential for a fault trainer.
- A's fault-rule corpus gate (zero false alarms on 79 catalogue circuits, at least 18 of 20 deliberately broken ones caught) as the Phase 2 entry test.
- The three-spike discipline (editor budget, solver vs ngspice, 50-sketch interpreter coverage) before any builder spending. Run the 50-sketch coverage test early; it is a 3-day job and tells you how far "paste your own code" can go.
- Export of project JSON and wiring table, later, as a "take it to the bench" link back to physical work.
- Kill criterion 8: if Velxio or Wokwi ship free explained faults, repeat the head-to-head.

From B:
- The wedge price positioning and the comparables table. The pricing tests (waitlist, fake door, purchase order from 5 pilots).
- Syllabus fit test (E8).
- University-first wave, high school third.
- Server-differential test of checks (E6) before anyone says "verified" or uses results for grades.
- The council-tension note: build the full teacher dashboard only after Q3-b.
- Sponsored seats for low-income and Indian cohorts from the start, to protect the mission.
- Counsel opinion on pseudonymous class-code data (E10) and on provenance, early.

From C into the hybrid, for completeness: the misdiagnosis data as the future moat, and the physical-transfer pilot as the learning test.

## 7. Fatal flaws, per strategy

**A: creator-builder**
- The product it needs most (a fault engine that is right on circuits the authors never saw) is the one with no spike result, and a wrong confident diagnosis on a student's own circuit damages trust. If E5 fails, A has no edge.
- It aims at self-directed learners, who are the least able to pay. Revenue depends on a second product (class mode).
- 43 expected engineer-weeks with no revenue for at least 18 months, for a two- to three-person team that also has to do compliance.
- It cannot claim learning. Unguided building is the wrong condition for novices, the mission's likeliest users.
- Not fatal alone, but fatal combined: low-end device performance is unproven, and the first-load JS is already 701 KB gzip.

**B: classroom**
- The buyer has never been spoken to (B s12.1), and the free incumbents (Tinkercad, MakeCode) are good. Teacher adoption of a second tool needs a visible reason that does not yet exist.
- Compliance and sales cost more than the base revenue (B s8.3, s12.4). Even the high case is under USD 3M a year. Three memos say to wait for a trigger before building teacher accounts; B would contradict them if it builds before interviews.
- A dashboard on today's content is empty of meaning: pass-on-open completions, forgeable client-side checks, only 16 Uno lessons. A classroom product built before the diagnose-first and meaningful-pass work shows a teacher green boxes that mean nothing.
- Wokwi already owns the paying instructor and can copy the feature set in months.

**C: fault lab**
- Wrong-lesson risk: the solver is a teaching model with a fixed 25 ohm pin constant. If a bench check contradicts the simulated symptom, the product teaches students something false. Hard gate: E4 before any pilot.
- The lead is thin: one scripted run per tool, Tinkercad untested, Velxio already warns. A chatbot is a free substitute for novices.
- The educational claim is unsupported in the literature for novices at this scale; the effect may be zero. C's M7 design makes that visible, which is the right response, but the business may not survive a null result.
- It cannot serve "debug my own circuit" without Phase 2 (35 expected engineer-weeks). A lecturer asking for that in the pilot will find v0 does not do it.
- Hand-authored faults tied to 38 figures do not scale across boards and languages. The authoring-time test (E3) decides whether it is a content product with a small ceiling.
- Revenue ceiling about USD 149k a year in the base case. Mission project with a revenue line, not a growth company.

Shared by all three: provenance of the lessons (no LICENSE; structure, timings and formulas follow three third-party sites per `security-privacy.md` as cited by all three papers) and the 13+ audience decision are founder and counsel actions that precede any commercial step.

## 8. What would change my mind

| If this is found | Then |
|---|---|
| E0: Tinkercad already shows cause and fix with a visual and has classes | Drop C's wedge; reposition on an open exercise bank or move to A's gap (own project, private, no account, export). |
| Interviews: 6 or more of 12 self-directed learners describe an own project in the last 90 days and name a block (A's E1), and fewer than 4 of 10 lecturers name debugging as a pain | A moves ahead of C for the next gate. |
| Q3-b fires (6 of 12 teachers need a per-student work view) | Add B's teacher dashboard in front of the fault-lab data. |
| E4 fails (2 or more of 10 bench checks mismatch) | Stop instructional claims; fix the model first. |
| E7 shows no difference, or slower, on the physical task | Remove "learn debugging" from the headline; keep the product only as an open exercise bank. |
