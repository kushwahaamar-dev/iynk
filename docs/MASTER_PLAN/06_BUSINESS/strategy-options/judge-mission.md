# Judge: mission lens

Judge label: mission. Date: 2026-10-27. Lens: would this make more people capable of building something they could not build before, including learners in low-resource regions (money, place, language, equipment)?

Labels: VERIFIED, DOCUMENTED, EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN. I read the three strategy files in full and spot-checked MARKET_ANALYSIS.md, USER_SEGMENTS.md and PERFORMANCE_BASELINE.md. No user demand, interviews or revenue exist for iynk. I add none.

## 1. What I checked, and where the advocates overclaim

| Claim | Check | Result |
|---|---|---|
| Base SAM USD 7.4M, year-3 capture USD 0.30M (A, B, C) | MARKET_ANALYSIS.md section 6: three-region total SAM $7.4M, SOM $0.30M. US colleges SOM $109k | Matches. C's "USD 149k" university ceiling is the sum of US colleges 109k + India 21k + EU 19k, stated by C itself. Honest. |
| Rest of world sizing | MARKET_ANALYSIS.md line 92: no sourced counts for Africa, Latin America, South-East Asia, Middle East. UNKNOWN | No strategy can claim low-resource demand or revenue. All three pay from the US/EU/India institutions. |
| Segment 12, low-resource learners | USER_SEGMENTS.md: score 21 of 35, "Population not countable", "No regional learner quotes found", ability to pay very low | Mission segment has the highest "user value" score (5) and the lowest evidence. Only EXTERNAL fact: micro:bit reached 70M young people via donated hardware [S22], so a no-hardware tool has a real gap to fill. |
| A: "addresses money" | A section 12 item 7 concedes it does not address place, language or equipment directly; first load of a lesson page is 2.2 MB raw, 701 KB gzip before any editor (PERFORMANCE_BASELINE.md). No real-device test exists (VERIFIED gap) | A's own E3 (phone + Chromebook p95 under 20 ms) is the mission-critical test and is not run. |
| B: "buyer and user differ" | B section 12 item 3 concedes it reaches "those with an institution first" and that revenue comes from rich-market universities (risk table: "Mission drift") | Mission-weak by its own admission. |
| C: "narrowest, cheapest" | C Phase 1 is 11 / 17.5 / 29 engineer-weeks, on the existing 38-item catalogue. C section 12 item 1: no general fault engine; a learner cannot debug their own circuit | Cost claim holds. It does not deliver "build something you could not build before". |
| Differentiation, "explained faults" | One scripted run per tool, n=1; Velxio already warns before run; Tinkercad not tested (all three papers agree) | Thin lead. Treat as HYPOTHESIS. |
| Solver fidelity | 113 mA comes from a fixed 25 ohm pin constant (C cites FV C010); never compared to hardware | A debugging trainer taught to learners who cannot check against a bench (the low-resource case) is a trust risk. |
| Provenance | No LICENSE; lessons/timings from three third-party sites (A risk 9, B risk, C R8) | Blocks every commercial step in every strategy. Not a differentiator. |

Observation across all three: each strategy's year-0 to year-2 money comes from grants and sponsors, not from the stated customer. So the real choice is which product is best to put in front of a funder and a first user group.

## 2. Scores (1 to 5; cost and risk: 5 = cheap, low risk)

| Criterion | A creator-builder | B classroom | C fault lab |
|---|---|---|---|
| User value | 4 | 3 | 3 |
| Frequency of need | 3 | 4 | 3 |
| Differentiation | 3 | 2 | 3 |
| Monetisation | 2 | 3 | 2 |
| Feasibility on this codebase | 2 | 3 | 4 |
| Cost and risk | 1 | 2 | 4 |
| Mission fit | 5 | 2 | 3 |
| Speed to evidence | 2 | 3 | 4 |
| **Total** | **22** | **22** | **26** |

### Reasons

**A, creator-builder**
- User value 4: the only strategy where a person with no kit and no teacher brings their own idea, saves it, shares it and exports a build list. That is the "could not build before" test. Capped at 4 because it is unproven on user-made circuits and on weak devices.
- Frequency 3: maker use is episodic (A risk 10); a course project forces it for students only.
- Differentiation 3: no-account, private-by-default, export is real vs Wokwi's paid privacy (EXTERNAL, A section 3), but A says the whole edge is the fault rules, unproven, and Velxio can copy in weeks.
- Monetisation 2: A admits no revenue for 18 months and that its paying segments are small (A section 12 item 3).
- Feasibility 2: no project model, no persistence, solver must be replaced, interpreter is a subset (VERIFIED, FV section 6, TD).
- Cost and risk 1: 27 / 43 / 72 engineer-weeks, adverse case about 50 calendar weeks. The adverse path also pulls in a compile service.
- Mission fit 5: it is the founders' stated vision and the only one that scales to anyone.
- Speed to evidence 2: cheap spikes (E2 to E4) take 1 to 3 weeks, but demand and the thesis (E5, E7) need a prototype or 6 to 8 weeks live.

**B, classroom**
- User value 3: students get no-kit practice but only if a teacher assigns it. Self-taught learners get nothing new.
- Frequency 4: course use recurs weekly and each term; the best of the three.
- Differentiation 2: dashboards and rosters are copyable in weeks; Wokwi already holds the paying instructor (B section 7). B says the defensible part is the diagnosis data, which is C's idea.
- Monetisation 3: only strategy with published per-seat comparables (Wokwi EUR 30, LabsLand EUR 7.99). Still base capture about USD 0.30M and compliance cost exceeds early revenue (B section 8.3).
- Feasibility 3: 17 / 31 / 50 engineer-weeks, much of it accounts, DPAs and WCAG, not simulation. Server-side verification does not exist (VERIFIED, FV C030).
- Cost and risk 2: the highest compliance exposure (USD 17k to 65k for the school tier, security memo via B), minors' data, procurement cycles.
- Mission fit 2: B's own brief puts US/EU universities first and calls mission drift a risk. Buyers are those least in need.
- Speed to evidence 3: B's E1, E3, E8 need no code (4 to 6 weeks), but a paid conversion needs a year-long sales cycle.

**C, fault lab**
- User value 3: learning to diagnose wiring faults without burning parts is a genuine gain for a kit-less learner, but only on the 38 catalogue items. No evidence it transfers to a real bench (R1, R3).
- Frequency 3: used during a course unit; a self-taught maker uses it when stuck. No data.
- Differentiation 3: narrow tested lead, graded diagnose-first is not found in any competitor page read (UNKNOWN, not proven absent). A chatbot is a free substitute (C R7).
- Monetisation 2: C itself computes about one person's salary by year 3 (USD 149k ceiling).
- Feasibility 4: 11 / 17.5 / 29 engineer-weeks, reuses `FailureMode` rows, interpreters, figure bridge. Hiding the trigger across 80 figure pages is the main unknown.
- Cost and risk 4: smallest spend; CI, trust fixes, and an offline-capable exercise pack are no-regret work.
- Mission fit 3: serves "no equipment" and can be free and account-free, but it does not let anyone build their own thing, and C admits it owns only the word "debug".
- Speed to evidence 4: E0 (Tinkercad check, 1 day), E1, E3 before code; a pilot in one term. Best of the three.

## 3. Recommendation: a gated hybrid, C first, A as the committed destination

The mission needs A's capability. A's cost and unproven low-end performance make it wrong to start there. C is the cheapest way to get real learners on the product and to harden the pieces A also needs. B's classroom features are not mission-aligned as a lead.

**Take from C (build now, Phase 1):**
1. Step 0 shared work: CI, security headers, close open routes, telemetry default off, provenance and audience decision with counsel.
2. Diagnose-first exercise packs on the existing Uno R3 catalogue (C packages B, C, D, G), with hints from authored data, no AI, English first. Free for every learner, no account.
3. C's E0 (Tinkercad and Velxio by hand), E1 interviews, E4 bench check of 10 faults. Hold any "validated" claim until E4 passes.

**Take from A (run in parallel, as spikes only):**
4. A's E2 (50 public sketches through the interpreter), E3 (editor budget on a mid-range Android phone and a school Chromebook) and E4 (solver vs ngspice). These cost 1 to 3 weeks and decide whether A is feasible for the people the mission names.
5. Persistence, fork, unlisted share link and `.ino` / wiring-table export for catalogue items. A calls these what survives if A is killed; they also fix FV section 6 (edited code lost on reload).

**Do not take from B now:** teacher accounts, rosters, dashboards, DPAs, LMS. Keep only a data-free class code and pseudonym list so a lecturer can use C's packs (C package E).

**Then the commit decision (about week 8 to 10):** commit to A's builder (27 to 72 engineer-weeks) only if A's E2, E3, E4 pass and C's E1 shows lecturers or makers want it. If E3 fails, the mission answer is a desktop-first or low-weight path, decided openly, not a silent drop of low-end devices.

**Add one mission test that no advocate proposed (HYPOTHESIS to test):** before the commit, run the Uno Blink-to-diagnose flow with 8 to 10 learners in low-resource settings (through one NGO, library or school partner in India or sub-Saharan Africa, any language other than English among them). Measure: completes the first lesson in under 15 minutes on their own device and connection; loads on a throttled 3G profile; understands the explanation in their UI language. Pass: at least 6 of 8 finish. Fail: the mission claim for the next phase has to be dropped or reworked, whichever strategy is chosen. The lesson page is 701 KB gzip today (VERIFIED), so this may fail on first load.

## 4. Ideas worth grafting

| From | Idea | Why |
|---|---|---|
| A | Project JSON as versioned text, fork + unlisted share link, `.ino` and wiring table export | Zero-account ownership of work is the mission in code. Survives a kill. |
| A | Refuse with "not modelled yet" rather than guess a diagnosis; tier label and "What it models" panel | Honest fidelity for learners who cannot cross-check on a bench. |
| A | Kill criteria tied to numbers (E3 fail forces explicit desktop-first decision) | Stops quiet exclusion of weak devices. |
| B | Hollow-pass fix: a pass needs one real edit and one answer | Needed in any learning product (Blink passes untouched, BROWSER_WALK step 2). |
| B | Sponsored seats and grants from month 0; "cap classroom features, not content" | Only credible way to pay for free learners in low-resource regions. |
| B | Syllabus-fit test (E8: 10 real syllabi) | Cheap check of whether the 16 Uno lessons match real courses. |
| B | Counsel opinion on pseudonymous class-code data (E10) | Same legal gate protects C's class code. |
| C | Aggregate misdiagnosis data as the one asset that compounds | The only defensible thing B and C both point to. |
| C | M7 crossover study and physical-transfer pilot | Gives the funder a result, not a feature count. |
| C | Differential test of authoring time (E3) | Tests whether content can scale to 100 items. |

## 5. Fatal flaws to watch

1. **A, low-end devices.** If the editor or first load fails on a Chromebook or mid-range phone, A reaches only people with decent equipment, which fails the mission. 2.2 MB raw per lesson page before any editor (VERIFIED).
2. **A, uncurated circuits.** The 38 items were written by people who knew the answers. One confident wrong diagnosis on a learner's circuit is a trust event. No false-alarm data exists.
3. **B, mission drift.** Buyers are US/EU universities (B section 3). Revenue and the stated users do not meet. B reaches no one outside an institution.
4. **B, compliance before revenue.** B section 8.3: base capture does not cover a three-person team plus compliance. Minors' data on a server is an unresolved legal gate.
5. **C, no fault engine on arbitrary circuits.** The 25 ohm constant, DC-only solver and `FailureMode` rows bound to figure ids mean C cannot debug the learner's own circuit; Phase 2 is 21 / 35 / 58 engineer-weeks.
6. **C, unproven learning.** The literature gives small, single-site studies (EXTERNAL, C sources); the effect may be zero. A chatbot is a free alternative.
7. **All, provenance.** No LICENSE; inherited lesson structure from three sites. Any commercial step or grant application needs the counsel answer first.
8. **All, revenue.** None of the three is venture-scale on the sized markets; the rest of the world is UNKNOWN. This is a mission organisation funded by grants. Plan it that way.
9. **All, no demand evidence.** Every segment score is judgement, evidence strength 3 or less. The first work is interviews and a pilot, not features.
