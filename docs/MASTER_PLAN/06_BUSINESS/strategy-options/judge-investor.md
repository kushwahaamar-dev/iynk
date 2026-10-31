# Judge: investor lens

Date: 2026-10-27. Judge label: investor. I read A-creator-builder.md, B-classroom.md and C-fault-lab.md in full. I checked their money numbers against `02_RESEARCH/MARKET_ANALYSIS.md` (sections 6.2, 6.3) and the 113 mA claim against `01_AUDIT/FEATURE_VERIFICATION.md` (C010). I did not re-read the dossiers. I did not run any product. Labels follow the brief: VERIFIED, DOCUMENTED, EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.

## 1. The investor's first answer

None of the three is a venture business, and all three advocates say so. MARKET_ANALYSIS.md line 7 and 219: base serviceable revenue (SAM) is about USD 7.4M a year across US, India and EU, three-year capture (SOM) about USD 0.30M, high case USD 2.43M (ESTIMATED, bottom-up, no interviews behind it). I confirmed these figures and C's split (US colleges 109k + India engineering 21k + EU higher ed 19k = 149k, about half the SOM). A seed investor would not fund the simulator-seat market as sized. The right frame is a mission organisation that must be cheap to run, funded by grants and sponsors, with a revenue line that proves institutions value it. I score on that basis: which strategy gets decisive evidence fastest for the least money, and which keeps the founders alive and the mission credible.

Three facts shape every score.

1. Demand for anything is UNKNOWN. No interviews, no usage data, no revenue. Every segment score in USER_SEGMENTS.md has evidence strength 3 or below (A, B and C each state this).
2. The one measured edge is explained faults. It rests on one scripted run per competitor (WORKFLOW_BENCHMARK.md), Tinkercad untested, and Velxio already warns before run. The 113 mA number comes from a fixed 25 ohm pin constant (VERIFIED, FV C010), so the edge is illustrative, not accurate.
3. The codebase is "a prototype to mine, not a foundation to extend" (cto-platform.md, quoted by B). No project model, no identity, no persistence (VERIFIED, FV section 6).

## 2. Check of the advocates' claims

| Claim | Source | My check |
|---|---|---|
| A: 27 / 43 / 72 engineer-weeks for Uno Studio | A section 8 | CTO's 22 / 37 / 61 plus trims and additions. Plausible but no spike has run. A itself says "highest variance". Judge: the adverse case (72 weeks, about 50 calendar weeks for 2 to 3 students) is a year of runway with no external evidence. |
| A: differentiation is "the first row" (rule library) and unproven on user circuits | A section 4 | Agree. The fault edge is weakest exactly where A needs it most: uncurated circuits, a hard-coded 25 ohm pin model, no capacitors or regulators. A wrong confident diagnosis on a user's own circuit is a trust event. |
| A: the shared project link is the growth loop | A section 2 | EXTERNAL for Wokwi, HYPOTHESIS for iynk. Plausible and the only one of the three with a built-in viral mechanism. Test E7 needs 200 saved projects and 6 to 8 weeks live, so it is the slowest signal. |
| B: M1 17 / 31 / 50 engineer-weeks | B section 9.1 | Includes teacher accounts, DPA, WCAG, dashboard. Founder time for sales and support is excluded and B says it is 30 to 50 percent of the week. Effective cost is higher than C's. |
| B: compliance cost exceeds early revenue | B section 8.3 | Agree. USD 17k to 65k legal for the school tier (security-privacy.md, ESTIMATED) against a base SOM of USD 0.30M for the whole market. B's own arithmetic says the base case does not pay three people. |
| B: dashboard is easy to copy; the defensible part is diagnosis data | B section 7 | Agree. That is C's thesis, so B depends on C's core to be defensible. |
| C: smallest, cheapest first product, 11 / 17.5 / 29 engineer-weeks | C section 7 | Most credible estimate of the three because it reuses existing `FailureMode` rows and the figure bridge. Risk C names itself: hiding the trigger may need per-figure edits across 80 figure pages (adverse case). Unverified. |
| C: hard-to-copy assets are the reviewed corpus, misdiagnosis data and an outcome study | C section 3 | Honest and correct. All three need running classes, so C's pilot is also its moat-building step. |
| C: revenue ceiling about USD 149k a year | C section 6 | Checked. C has the lowest revenue ceiling of the three, but also the lowest spend. It is the only advocate that says plainly "this pays for about one person". |
| C: the fault engine on arbitrary circuits does not exist (Phase 2 = 35 expected engineer-weeks) | C section 12 | Agree. This is the central weakness: C's pilot does not serve "debug my own circuit", which is what the founders' vision wants. |
| C: general chatbots are a free substitute for debugging | C section 5 | Valid and the strongest competitor point in any file. Only C raises it as a standing risk. A and B ignore it. |

## 3. Scores

Scale 1 to 5. Cost and risk: 5 = cheap, low risk. Total is the plain sum of the eight criteria.

| Strategy | User value | Frequency of need | Differentiation | Monetisation | Feasibility on this codebase | Cost and risk | Mission fit | Speed to evidence | Total |
|---|---|---|---|---|---|---|---|---|---|
| A creator-builder | 4 | 3 | 3 | 2 | 2 | 1 | 5 | 2 | **22** |
| B classroom | 3 | 4 | 2 | 3 | 3 | 2 | 2 | 3 | **22** |
| C fault lab | 3 | 3 | 4 | 2 | 4 | 4 | 3 | 4 | **27** |

### A: creator-builder (22)

- User value 4. A learner with an own idea and no kit gets the most direct benefit of the three, and it is the founders' stated vision. But the novice majority is poorly served by unguided building (learning memo, A section 12 item 6).
- Frequency 3. Maker use is episodic (A risk 10); a course project forces use but only for a term. No retention data (E0 not run).
- Differentiation 3. No-account, private-by-default, export is a real trust position against Wokwi's paid privacy and Arduino's 2025 terms. But Velxio is the same shape, open, AI-built and free. Edge is "weeks, not years" (A section 6).
- Monetisation 2. A admits paying segments are small and different from this one (A section 12 item 3). Individuals: segment 1 ability to pay scored 1. Nothing sellable in 18 months.
- Feasibility 2. 37 expected engineer-weeks for editor, netlist, new solver, persistence, with two spikes (editor on a low-end Chromebook, solver vs ngspice) that could force a rewrite. First-load JS is already 2.2 MB raw (PERFORMANCE_BASELINE B3) before any editor.
- Cost and risk 1. Highest spend, highest fidelity risk (uncurated circuits), user-generated content with minors, and the most legal surface. 72-week adverse case.
- Mission fit 5. Closest to "anyone, anywhere, own projects, no kit". Limited by device and bandwidth until E3 passes.
- Speed to evidence 2. Interviews and cheap spikes (E1 to E4) give early signal in 2 to 3 weeks, which is good. But the thesis test (E5) and the share loop (E7) need a built prototype and 6 to 8 weeks live.

### B: classroom (22)

- User value 3. Real for a lecturer with no kits, but free Tinkercad, MakeCode and class codes already serve most teachers. Reason to switch not shown (B section 12 item 7).
- Frequency 4. Courses repeat each term; assignments recur weekly. Highest frequency of the three, if adopted.
- Differentiation 2. Rosters, assignments and a dashboard are easy to copy and Wokwi already owns the paying instructor (B section 7). Defensible only via C's diagnosis data.
- Monetisation 3. The only strategy with a different buyer and user and published comparables (Wokwi EUR 30, Velxio USD 34, LabsLand from EUR 7.99). But SOM 0.30M, and legal plus compliance can exceed revenue (B section 8.3, K8).
- Feasibility 3. Uses lessons and checks, but needs identity, a database, teacher UI, DPA, WCAG and a server re-run that does not exist (INTERP D8: checks can be forged client-side). 31 expected engineer-weeks plus 30 to 50 percent founder time on sales.
- Cost and risk 2. Procurement cycles run past a school year; minors' data law (COPPA, FERPA) is unresolved; the dashboard shows hollow passes until the "meaningful pass" fix ships (VERIFIED, Blink passes untouched).
- Mission fit 2. B itself says the mission drifts to institutions in rich markets and that self-directed makers get little. Sponsored seats help but are unproven.
- Speed to evidence 3. B's gate (E1, E2 wizard-of-oz on today's product, E3 fake door, E8 syllabi) is good, no-code and 4 to 6 weeks. But the decisive proof (purchase orders) takes 9 months or more (K3).

### C: fault lab (27)

- User value 3. Fault diagnosis before a real bench has plausible value, but the learning claim is unproven and the literature is thin (C risk R3). Value for individuals is limited to catalogue circuits in v0.
- Frequency 3. Per-course pack of 8 to 10 exercises: used for a few weeks a term, repeated each term (HYPOTHESIS). Individual "why is it broken" need is real but unsized.
- Differentiation 4. The only strategy that builds on the one tested lead and turns it into something harder to copy: graded diagnose-first practice, a reviewed corpus, misdiagnosis data, and potentially a published outcome study. I deduct a point because Velxio can match the visible feature in a term and a chatbot answers free.
- Monetisation 2. Lowest ceiling (about USD 149k a year, C section 6). Prices below the comparables. Honest that it is a bootstrap and grant case. Same score as A because neither is near venture-scale, but C costs far less to find out.
- Feasibility 4. Reuses `FailureMode`, `Check`, the figure bridge and 38 catalogue items. No project model, no solver rewrite. Unknown: whether the trigger can be hidden without 80 per-figure edits.
- Cost and risk 4. 17.5 expected engineer-weeks, about 8 calendar weeks, kill tests that cost days (E0 Tinkercad check, E4 bench check under USD 300). Remaining risk: teaching-model fidelity (a wrong 113 mA-style number shown to an EE) and counsel's provenance answer.
- Mission fit 3. Serves "no kit, no lab" students and is free for everyone, but narrows the vision to one verb (debug) and does not do original projects until Phase 2.
- Speed to evidence 4. E0, E1 and E3 before any code; a class pilot in about one term; a 13-week crossover study is the first hard learning evidence anyone in this market would have.

## 4. Recommendation

**Pick C as the base, with two precise grafts and one gate. Do not commit to A or B yet.** Call it "Fault Lab first, builder gated".

What to do, in order:

1. Weeks 0 to 2, no feature code. Run C's E0 (test the three faults by hand on Tinkercad and Velxio, record the text) and E1 (10 lecturer and TA conversations), plus B's E3 (priced fake-door waitlist, no payment) and A's E0 (read-only telemetry pull for return rate). Also do the Step 0 trust fixes every memo requires (CI, headers, buddy list off, telemetry default off, open routes closed, spend cap) and get the counsel answer on provenance (no LICENSE; the About page admits reuse of lesson structure and formulas from three sites). That legal question can end any strategy, so it goes first.
2. Weeks 2 to 10. Build C's packages A to G only: gates, diagnose-first mode, 40 reviewed items, instrumentation, class code with pseudonyms, trust minimums, teaching-wrong-lessons fixes. One lecturer, one course, free. Run C's E4 (10 faults on a real Uno with a multimeter, under USD 300) before the pilot, because a wrong fault number in front of a lecturer ends the pitch.
3. In parallel, run A's three cheap spikes (E2 interpreter coverage on 50 public sketches, E3 editor on a low-end Chromebook and phone, E4 solver vs ngspice). They cost 2 to 3 weeks together and settle whether the builder is feasible at all. The builder decision then rests on data, not on enthusiasm.
4. Gate for the builder (A's M1): only if the C pilot shows lecturers value the diagnosis (E5 pass) and the A spikes pass. The generic fault engine is the shared core: C's Phase 2 and A's packages C to G are the same 35 to 37 expected engineer-weeks. Build it once, and only after the demand for diagnosis is shown.
5. Keep B's teacher surface as thin as C's: class code, pseudonyms, CSV, aggregate wrong-diagnosis table. Do not build accounts, rosters, LMS or a DPA until a lecturer asks and pays or signs a letter of intent. This matches B's own section 13 and three council memos.

Why this and not A: A has the best vision fit and the worst cost to first evidence. It would spend 37 to 72 engineer-weeks of a two-to-three student team's year to learn whether the explanation edge survives on uncurated circuits, a question C answers on curated ones in 8 weeks. Why not B: its decisive evidence (purchase orders) is the slowest, its compliance cost is the highest relative to revenue, and without C's diagnosis data it has no moat.

Investor decision rule for follow-on support (HYPOTHESIS, thresholds mine): continue if, within about 6 months, (a) at least 4 of 10 lecturers name debugging or lost lab time as a top-3 pain unprompted, (b) at least 2 of 5 pilot lecturers or departments ask for a quote or purchase order or sign a letter of intent, and (c) the diagnosis pilot shows the exercise is completed by 60 percent of a class. If (a) fails, drop the lecturer buyer and consider A with grant funding. If (b) fails but (a) and (c) pass, treat classrooms as distribution and fund it with grants (B's K3 and the CEO memo's open-project fallback).

## 5. Ideas worth grafting from the others

| From | Idea | Where it goes |
|---|---|---|
| A | The three cheap spikes (E2 interpreter coverage, E3 editor on low-end hardware, E4 solver vs ngspice) | Run in weeks 2 to 10 as the builder's go/no-go |
| A | Project JSON, autosave, fork and unlisted share link for catalogue items | Small, useful in every strategy (A section 14: "what survives"). Add after the pilot, as the first step toward original projects |
| A | "Never gate running, editing, saving or sharing"; no-account, private-by-default, plain export as a trust position | Public promise from day one |
| A | Head-to-head test on timed diagnosis against Velxio and Wokwi (E5b) | Adapt to C's E2; it measures the real edge |
| A | Metric discipline: count saved, wired, run, returned projects, not empty saves | Use for any north-star number |
| B | University-first, adult-only first wave; high school only after counsel and a DPA | Adopt as C's audience rule |
| B | Wizard-of-oz pilot on today's product with a spreadsheet (E2) | Run it before building class code (cheapest possible test of C's lecturer demand) |
| B | Syllabus-fit test (E8): do 5 of 10 real syllabi map half their weeks to existing lessons? | Add to the evidence sprint; it tests whether content breadth blocks adoption |
| B | The meaningful-pass fix (a pass needs one real edit and one quiz answer) | Part of C's package G; without it any teacher view is hollow |
| B | Free teacher allowance; cap classroom features, not content | Pricing principle for later |
| B | Server re-run of checks, labelled "not verified; do not use for grading" until it exists | Label the CSV the same way |
| B | Sponsored seats for low-income and Indian cohorts via grants and CSR | Fund the mission part; test in the grant track, not in sales |
| C itself | Chatbots as the real novice competitor | Test in E2 think-aloud: do students use a chatbot as a substitute? |

## 6. Fatal flaws

Flaws that would end a strategy if they hold. Each is testable.

| # | Flaw | Applies to | Test |
|---|---|---|---|
| F1 | Provenance: no LICENSE, and the About page admits reuse of lesson structure, timings and formulas from three third-party sites. Institutions ask for IP indemnity. | All | Counsel opinion in writing before any invoice. Rewrite cost is the kill number (A: over 6 engineer-weeks; B: licence not obtained in 90 days). |
| F2 | Tinkercad or Velxio already explain cause and fix with a visual and offer classes. Then the tested lead is gone. | All, most of C | C's E0, one day. Do this first. |
| F3 | Fidelity: the solver is a teaching model (25 ohm pin constant, no capacitors or regulators, silent non-convergence). One wrong number shown to a knowledgeable lecturer ends trust. | C and A most | C's E4 on a real Uno; "what it models" panel; refuse with "not modelled" instead of guessing. |
| F4 | The general fault engine does not exist. C's pilot cannot debug a user's own circuit, so C cannot reach the founders' stated vision without 35 expected engineer-weeks. | C | Do not claim original projects until the A spikes and the Phase 2 gate pass. |
| F5 | A: demand for original projects is indirect (founders' story), the builder is the most expensive item, and the paying segment is not the using segment. | A | A's E1: 12 interviews, 6 describe an own project in 90 days. |
| F6 | B: the buyer has never been spoken to, procurement outlasts the runway, compliance cost exceeds base-case revenue. | B | B's E1 and E3; K1 at week 8. |
| F7 | Learning claim is unproven for iynk and thinly supported in the literature (C risk R3, one search, weak). Selling "learning" before a pilot repeats the over-claim the audit found on Solana and live prices. | B and C | Market as "practice with explained faults", not "improves debugging", until C's crossover study (E6) reports. |
| F8 | Founder capacity: 2 to 3 students cannot do build, sell, support, comply and run a study at once. | All, worst for B and A | Fix scope: one lecturer, one course, one term. Kill if fewer than 2 people ship weekly for two months (A kill 10). |
| F9 | Market size: SOM about USD 0.30M a year. No strategy supports venture capital as sized. | All | Outside the three regions and individuals the market is not sized (UNKNOWN). One state or ministry licence is the only sourced upside (MKT T10). Plan for grants and sponsors from month 0. |

## 7. Sources

Read in full: the three strategy files in this folder. Checked: `02_RESEARCH/MARKET_ANALYSIS.md` (lines 7, 176 to 219), `01_AUDIT/FEATURE_VERIFICATION.md` (C010). Other claims are cited as the advocates cite them and were not re-verified by me. No web search was used.
