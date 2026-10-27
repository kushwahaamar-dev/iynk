# Strategy B-classroom: classroom and course platform first

Advocate brief for the strategy council. Written 2026-10-27. This file argues for one market-entry strategy, then says where it is weak. It changes nothing else in the repo.

Labels: VERIFIED (the audit inspected or reproduced it), DOCUMENTED, EXTERNAL (research file and source tag), ESTIMATED (assumptions shown), HYPOTHESIS (test named), UNKNOWN. Paths are under `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/` unless stated. Short names: FV = `01_AUDIT/FEATURE_VERIFICATION.md`, TD = `01_AUDIT/TECHNICAL_DEBT.md`, SEC = `01_AUDIT/SECURITY_BASELINE.md`, INTERP = `01_AUDIT/inventory/interp.md`, MKT = `02_RESEARCH/MARKET_ANALYSIS.md`, SEG = `02_RESEARCH/USER_SEGMENTS.md`, LAND = `02_RESEARCH/COMPETITOR_LANDSCAPE.md`, EDU = `02_RESEARCH/competitors/education.md`, COMP = `02_RESEARCH/tech/compliance-safety.md`, URP = `02_RESEARCH/USER_RESEARCH_PLAN.md`. Council memos are under `00_EXECUTIVE/council/`.

## 0. Verdict in five lines

1. The case for this strategy is that it is the only one of the three where the buyer and the user are different people, the buyer has a published price list to compare against, and the product's one real edge (explained faults, deterministic checks) maps onto a teacher's job.
2. The case against it is also strong. The paying market is small (ESTIMATED base serviceable $7.4M a year, three-year capture about $0.30M, MKT section 6), the free incumbents are good, and iynk has none of the classroom plumbing today (VERIFIED, FV section 6).
3. My own recommendation inside this strategy: lead with university intro electronics and embedded courses (adult learners, a published competitor price, a decision made by one instructor), not high-school CTE. Run high school second, after a data processing agreement and counsel's answer exist.
4. Do not start building until a no-code evidence sprint passes. Three council memos already say teacher accounts and rosters wait for a trigger (Q3-b in `product-learning.md`). This strategy owns that trigger.
5. Classroom revenue alone will not pay a three-person team in the first two years. It has to be paired with grants and sponsored seats from the start (ESTIMATED, section 9).

## 1. Thesis

iynk becomes the lab a teacher assigns when the class has no kit, not enough kits, or a lab that is full. The teacher picks lessons and fault-diagnosis exercises, students do them in the browser with no email and no account, the checks run on a deterministic simulated board, and the teacher sees on one screen who ran the code, who passed, and who could not say why a wiring mistake broke the circuit.

Students pay nothing and are never gated. The institution pays for the teacher side: classes beyond a small free allowance, results export, verified results, a signed privacy contract, LMS links and support.

The original-project builder arrives later as the capstone tool inside courses. It is not the first product. That is a deliberate break from the founders' "original projects as a first-class capability" preference, and it is argued in section 12.

## 2. Target customer

Order of attack (HYPOTHESIS, tested in section 14):

| Wave | Customer | Why this order | Evidence |
|---|---|---|---|
| 1 | A lecturer or lab coordinator running an introductory electronics or embedded course, US/EU university or community college, 30 to 150 students per term | Adult learners avoid the child-privacy stack. A competitor already charges this segment (Wokwi Classroom EUR 30 per student per semester, LabsLand from EUR 7.99). SEG scores segment 9 highest (26 of 35, provisional, evidence strength 3). The instructor chooses; the department pays | EXTERNAL [SEG segment 9][MKT section 3]; scores are HYPOTHESIS |
| 2 | Indian engineering colleges (B.Tech lab courses), sponsored seats | Biggest cohort in the evidence (about 3.66 million B.Tech/B.E. enrolled, AISHE 2020-21), Hindi UI exists. Price per student is low and unproven | EXTERNAL [SEG segment 11]; ability to pay UNKNOWN |
| 3 | US high-school CTE and STEM teachers (electronics, engineering, robotics pathways) | 7.8 million CTE participants (2022-23), Perkins V is the likely budget line. But minors, COPPA, FERPA and state student-privacy laws apply, and Tinkercad and micro:bit are free and entrenched | EXTERNAL [SEG segment 8][MKT 5.3][COMP section 1] |

The brief names high school first. I put it third because the audit and the compliance research say the minor-data work is the most expensive part of this strategy (section 9) and the university buyer can be reached without it.

## 3. Who is who

| Role | Who | Basis |
|---|---|---|
| Free user | The student. Also the teacher on a free allowance (one class, small cap) | Mission; MKT section 4 hypothesis that capping classroom features converts better than capping content |
| Benefits financially | The department or school: fewer kits to buy, break and replace, no lab-room queue, fewer sessions lost to hardware faults. Second order: the iynk team | SEG segment 9 cites hardware faults interrupting practice [S37]; saving not quantified, UNKNOWN |
| Payer | Department or lab budget (university), CTE budget (US school, Perkins V basic state grants USD 1.44B in FY2024 per ACTE, later years unconfirmed), college lab budget or CSR sponsor (India). Grants and sponsors for free or low-income seats | EXTERNAL [MKT section 5.3, 9]; who pays for the last comparable tool is UNKNOWN until T2 |
| Influencers | The instructor (chooses), CTE director or department head (signs), IT or privacy officer (can veto; wants a DPA, a VPAT, a subprocessor list), a colleague who already uses a free tool | COMP section 5 "sellable" list; HYPOTHESIS for who vetoes |
| Organic distributor | The teacher or lecturer, once. They put the link in a syllabus and repeat it every term. Second: students passing the link to the next cohort. Third: instructor-to-instructor talk (course syllabi are shared openly) | HYPOTHESIS. `business-growth.md` estimates about 35 adopted classes for the first 1,000 weekly actives (ESTIMATED) |

The distributor and the payer are often not the same person. That is the main commercial risk (section 10).

## 4. Job to be done, and why current tools fail it

Job (HYPOTHESIS, to be confirmed by Q3 interviews): "I teach intro electronics or embedded. I need every student to get hands-on practice this week, including students without a kit, and I need to see who is stuck without marking forty code files by hand."

| Tool | What it does for this job | Where it falls short for this job | Source |
|---|---|---|---|
| Tinkercad Circuits + Classrooms | Free, large school base, teacher classes, join by class code (third party), free-form circuits | Small board set (Uno, micro:bit, ATtiny), idealised analog, no ESP32 (second-hand). Whether it auto-checks work or explains faults is UNKNOWN. Autodesk pages returned errors, so most of this is second-hand | EXTERNAL [LAND 4.2][EDU 45-46] |
| micro:bit classroom + MakeCode | Free, no accounts, teacher sees and edits student code live, session report | One device family. Simulator is a JavaScript stand-in; board-fine code can error in it. No fault teaching found | EXTERNAL [EDU products 1-2] |
| Wokwi Classroom | Real firmware on 18 MCU variants, paid per student per semester (EUR 30, min 5), Pro features | University-targeted. No LMS shown, teacher tooling "not shown". No fault explanation in three captured runs (one frame each) | EXTERNAL [LAND 4.1]; TESTED in a narrow benchmark `02_RESEARCH/WORKFLOW_BENCHMARK.md` |
| Arduino Cloud School plan | USD 20 per member per year, Google Classroom, course library, teacher view | No simulator found in the pages read, needs real boards | EXTERNAL [EDU product 3] |
| Velxio Classroom | USD 34 per student per year, AI tutor, QEMU ESP32, ngspice. AGPL, 2026 entrant | Server-side emulation, cold ESP32 builds take minutes (vendor), early (3.5k stars) | EXTERNAL [LAND 2.1, 4] |
| LabsLand | Real remote hardware, 6 LMS integrations, from EUR 7.99 per student per semester | Queues, fixed equipment, no learner-made circuits | EXTERNAL [EDU product 14] |
| Physical kits | The real thing | Cost, breakage, loss, one kit per student, no view of what each student did | HYPOTHESIS |

Honest reading: none of these tools is shown to give the teacher a view of who could diagnose a wiring fault. That is a gap in the research as much as in the market. "Fault-diagnosis teaching is unserved" is HYPOTHESIS until Q4 and T4 run (`product-learning.md` carries the same caution).

## 5. Unique value, split into hard to copy and merely convenient

Hard to copy (months, not weeks):

| Asset | Evidence | Caveat |
|---|---|---|
| Authored lesson and check corpus: 71 board lessons, 31 bench tasks, 461 checks (292 lesson + 169 task), 144 board failures, 106 bench faults | VERIFIED, FV section 2 | Part of the structure and constants follow three third-party sites; no LICENSE; provenance unresolved (FV section 1 item 8, `security-privacy.md`). This asset may be encumbered |
| Checks as pure predicates over a deterministic virtual-clock trace. `CheckJob` is plain data, so it can run in a worker, a test or a server | VERIFIED, INTERP "Public interfaces" `check-job.ts:24-70` | Today client-side only; the "verifying server" in code comments does not exist (INTERP D8) |
| Fault explanation with a named cause ("113 mA is far above its 20 mA", Repair button) | VERIFIED in browser, FV section 4 | The 113 mA comes from a 25 ohm pin constant in the DC solver; models are teaching-grade, not validated against hardware (`fidelity.md`) |
| No compile queue: the Blink lesson's 8.5 s virtual run checked in about 7 ms of wall time in Node (the browser walk showed all three checks passing after about 8.5 s of running) | VERIFIED, FV section 4, INTERP performance table | Comes from the interpreter subset (below) |

Merely convenient (a competitor can match each in weeks to months):

| Feature | Why it is not a moat |
|---|---|
| No student account | micro:bit classroom and VEXcode VR already do this (EDU summary) |
| Six UI languages | Present, quality unreviewed (FV section 4). Tinkercad lists 16 (low confidence) |
| Rooms for up to 8 | Common technique. Same-browser only in all runs; relay never exercised across machines (FV section 4) |
| Robotics and drone labs | Not part of this strategy; frozen (`robotics-aero.md`) |
| AI lab partner | Off in the first classroom version. Competitors ship one (Arduino, Velxio) |

The central weakness of the "hard" column: the interpreters are hand-written subsets, not emulators. No `class`, `template`, pointers, `#ifdef`; no DHT, SoftwareSerial, EEPROM; `SPI.transfer` returns 0 silently (INTERP). In a classroom, students leave the script. A student who pastes a library sketch from the web will hit "unsupported". For guided lessons that is acceptable. For a capstone it is not, which is why the capstone depends on the builder and probably on a real-firmware path (`fidelity.md`, `cto-platform.md`).

## 6. First milestone: "Classroom Pilot" (exact scope)

Goal: one lecturer and one class complete a four-to-six-lesson Uno unit with no email from students and a usable teacher view, then tell us whether they would pay and return next term. This matches the "smallest valuable product" in `product-learning.md` (no-kit lab at home for one instructor-led intro course) and the "data-free classroom mode" in `security-privacy.md`.

Gate before any code: the evidence sprint in section 14 (E1 to E3) and the trust fixes in "Step 0" below.

### 6.1 What a user can do

Teacher (the only person with an account; email magic link or Google sign-in; adult):
1. Create a class. Get a class join code and link. The code uses its own alphabet and is never a room code.
2. Create an assignment by choosing one to eight existing items from the Uno R3 Board Lab (16 lessons) and its Break-it faults. Set due date, hint ladder on or off, language.
3. See a table of students by assignment item: not started, ran, checks passing, diagnosed correctly, diagnosed with the largest hint, runs, minutes on task.
4. Open any student's latest code and the check trace behind a pass or fail.
5. Export CSV. Delete the class and all its data in one action.

Student (no email, no account):
1. Open the link, enter the class code, pick a pseudonym from a fixed list (no free text).
2. Do the assigned lesson in the existing lesson view. Edited code autosaves and survives reload (fixes FV section 6 "Persistence").
3. Diagnose-first Break it: see the broken circuit's effect, pick a cause from four options, then see the explanation. A logged hint ladder.
4. A "pass" needs one real edit and one quiz answer (fixes the Blink-passes-untouched finding, `runs/BROWSER_WALK.md` step 2).
5. Submit.

### 6.2 What is out of scope

Student accounts or emails. Rooms, chat, voice, buddies, leaderboard, daily challenge, AI partner, image or search routes, telemetry beyond what the dashboard needs (all off in classroom mode). LMS and LTI. Grades. Server re-run of checks (so results are labelled "not verified; do not use for grading"). Teacher-authored lessons. Original projects. Other boards, robotics, drones. Credentials and Solana. Payment processing (manual invoice or none). Parent portal. SSO beyond Google/Microsoft sign-in for teachers.

### 6.3 Step 0 that must precede it (shared with every council memo)

CI (tsc, eslint, content check, vitest), security headers, disable public buddy list, telemetry default off, remove or gate open AI/search/MCP routes, written audience decision, licence and provenance decision with counsel, copy fixes from FV section 7. Sources: `cto-platform.md` Step 0, `security-privacy.md` "Build first", `ceo-investor.md` item 2. Without these the pilot ships on an open, public-repo target with known host takeover and cost-abuse holes (VERIFIED, SEC: no authentication on 23 of 23 routes).

### 6.4 Pilot success definition

At least 3 classes at 2 or more institutions, at least 60 students, at least 3 assignments per class completed by more than half the class, teacher return next term (see E2 in section 14).

## 7. How the four named rivals would respond, and how fast

All timing is HYPOTHESIS, reasoned from the dossiers. None of these companies has been observed responding to iynk, and iynk is unknown to them.

| Rival | Likely response | Speed | Why |
|---|---|---|---|
| Tinkercad (Autodesk) | Ignore. If iynk ever has traction, add fault feedback or more boards | UNKNOWN. The barrier is attention, not engineering (LAND 4.2) | Already has classes and class codes; installed base. The risk to iynk is a quiet free upgrade, not a reaction |
| Wokwi | Adds assignment templates and a progress view to Classroom. Can use its CI "scenarios" as auto-checks (EXTERNAL, LAND 4.1 lists CI scenarios; use for grading is my HYPOTHESIS) | Months for dashboards. Fault explanations: months, slower for authored text | It already has the paid classroom customer and the engine. This is the most credible threat, and Wokwi's emulators are MIT (avr8js, rp2040js) |
| MakeCode / micro:bit | Do nothing about iynk | n/a | Non-profit, fixed device, free. They set the price floor, not a competing feature set |
| Arduino (Qualcomm-owned) | Partner or bundle a simulator into the School plan; add Wokwi/Tinkercad links | Quarters to a year (UNKNOWN) | School plan has Google Classroom and a teacher view already (EXTERNAL EDU product 3); it lacks a simulator. A trust problem since Qualcomm terms is noted in LAND |
| Velxio (AGPL) | Adds progress tracking and a teacher dashboard to its existing $34 classroom plan | Weeks to months. Moves fast, AI-built (LAND 2.1) | Its Classroom exists. Velxio is open, so it can also be forked by anyone |

What I take from this: a classroom feature set alone (roster, assignments, dashboard) is easy to copy and Wokwi already owns the paying instructor. The defensible part must be the diagnosis data: which fault, which hint, which mistake. That data only exists if the diagnose-first design ships and teachers use it.

## 8. Monetisation path and pricing hypotheses

### 8.1 Comparable prices

| Product | Price | Basis | Source |
|---|---|---|---|
| Wokwi Classroom | EUR 30 per student per semester, min 5 | per student | EXTERNAL [MKT 3][LAND 4.1] |
| Velxio Classroom | from USD 34 per student per year, min 5 | per student | EXTERNAL [LAND 2.1] vendor |
| Arduino Cloud School | USD 20 per member per year | per member (currency symbol only on page) | EXTERNAL [EDU 3][MKT 3] |
| LabsLand | from EUR 7.99 (Standard) and EUR 19.99 (Advanced) per student per semester | per student | EXTERNAL [EDU 14] |
| VEXcode VR | Free blocks; USD 199 / 499 per educator per year | per educator, covers all that educator's students | EXTERNAL via search digest [EDU 6] |
| CoderZ | USD 2,000 to 2,400 per school per course | per school, conflicting sources | EXTERNAL [EDU 7] |
| DroneBlocks | USD 695 per year school licence | per school | EXTERNAL [LAND 2.3] |

### 8.2 Hypotheses to test (not decisions)

| Cell | Offer | Price to test | Reasoning |
|---|---|---|---|
| H-U | University course licence | USD 8, 15 and 30 per student per semester, minimum USD 300 | Brackets LabsLand's low end, MKT base assumption (USD 15), and Wokwi's list |
| H-K | K-12 educator licence, all that educator's classes, up to 150 students | USD 99 and USD 199 per educator per year | VEXcode Enhanced is USD 199 per educator; per-educator avoids per-seat budgeting friction. The MKT base ACV is USD 1,200 per school at 60 seats and USD 20 |
| H-D | Department or school site licence | Quote, starting at 3 educators | CoderZ and DroneBlocks show school licences |
| H-S | Sponsored seats for low-income and Indian cohorts | Paid by a grant, CSR sponsor or partner | MKT section 9 lists the funding routes and their caveats |

What is free for ever: every student action (run, edit, save, share, do any lesson). Free teacher allowance: one class, up to 35 students, up to 3 active assignments (my number, HYPOTHESIS). Paid: more classes, CSV and LMS grade export, server-verified results, signed DPA and VPAT, priority support. `business-growth.md` and MKT section 4 agree on the pattern: cap classroom features, not content.

### 8.3 What the money looks like (ESTIMATED)

Base-case three-year capture is about USD 0.30M a year across US, India and EU (MKT 6.2: US 257k, India 24k, EU 19k). The high case is USD 2.43M (MKT 6.3). Assume a loaded cost of USD 100k per engineer per year (my assumption, not data). Then:

| Target | Count needed |
|---|---|
| One engineer's cost at university ACV USD 4,500 (MKT base) | about 22 departments |
| One engineer's cost at K-12 ACV USD 1,200 (MKT base) | about 83 schools |
| Three engineers, no compliance cost, base SOM USD 300k | covered only if the base case is fully achieved by year 3 |

The compliance and operating cost of a free base is separate: about USD 25k to 55k a year at 10,000 weekly actives (`business-growth.md`, ESTIMATED). So even the base case does not pay a three-person team plus compliance. Plan for grants (NSF SBIR needs a US small business; IES SBIR FY2026 closed 2026-06-29 per an aggregator; Erasmus+ needs two EU partners; India CSR needs an eligible entity; all with caveats in MKT section 9) and sponsored seats from month 0. The CEO memo's alternative, becoming an open grant-funded project, is a real fallback.

## 9. Engineering cost

Unit: engineer-weeks of focused work (ESTIMATED). Team of 2 to 3. Calendar weeks = engineer-weeks divided by (people x 0.7 focus factor) with 3 / 2.5 / 2 people for best / expected / adverse. Part of every estimate is my own judgement from the audit; none is measured on iynk. The CTO memo uses a comparable method (`cto-platform.md`).

### 9.1 Milestone 1 (Classroom Pilot)

| Work item | Best | Expected | Adverse | Notes and basis |
|---|---|---|---|---|
| Step 0: CI, security headers, close open routes, telemetry off, copy fixes | 3 | 5 | 8 | `cto-platform.md` says 2 to 3 weeks for Step 0 with one engineer; `security-privacy.md` says adult relaunch 4 to 7 weeks. Overlaps; I take the upper range for the security part |
| Client and server code persistence, share link | 1 | 2 | 3 | TD A11: client persistence is "S"; fixes FV section 6 |
| Teacher sign-in, classes, join codes, pseudonym device tokens, assignments, submissions tables, migrations wired to deploy, shared rate limiter | 4 | 7 | 11 | TD D3 and A11: no user, project or save table exists; token-hash ownership pattern exists in `profiles` (`0003`); in-memory limiter must be replaced |
| Teacher dashboard (matrix, student code and trace view, CSV, class delete) | 3 | 5 | 8 | New UI; reuses lesson view components |
| Diagnose-first Break it and hint ladder, with event log | 2 | 4 | 6 | `product-learning.md` build-first items 3 and 5. Excludes authoring content for all 144 failures: pilot scope is the Uno R3 failures only |
| Meaningful pass: audit 71 starters for pass-on-open, one-edit and one-quiz rule | 1 | 2 | 3 | `product-learning.md` item 2. FV notes the unit test's "starter" is an empty program, not the template learners see |
| Classroom-mode privacy: terms, policy, DPA from NDPA v2.2 (engineering part), deletion path, subprocessor list, flags to turn off rooms/AI/chat | 2 | 4 | 7 | COMP section 5 estimates policies and DPA at 2 weeks |
| WCAG 2.2 AA on the classroom flows only (teacher dashboard, lesson runner) | 1 | 2 | 4 | COMP section 3 estimates 3 to 6 weeks for the whole app; I scope to two surfaces |
| **Milestone 1 total** | **17** | **31** | **50** | |
| Calendar weeks | about 8 | about 18 | about 36 | 3 / 2.5 / 2 people, 0.7 focus |

Legal and audit cash (not engineer-weeks): `security-privacy.md` ESTIMATES USD 17k to 65k for the school tier on top of USD 4.5k to 15k for the adult relaunch. The lawyer rate there is an assumption. A university-only first wave avoids part of that (UNKNOWN how much; ask counsel).

### 9.2 Later milestones

| Milestone | Scope | Best | Expected | Adverse | Basis |
|---|---|---|---|---|---|
| M2: summative and LMS | Server-side re-run of checks in an isolated process, signed results, LTI 1.3, full WCAG pass and VPAT, teacher selection and ordering of any catalogue item | 12 | 20 | 31 | Server re-run: INTERP D1 and D8 (three trivial programs abort the Node process; heap/time caps required), run-time of ESP32 web-switch check is 2.3 s unloaded and 17.3 s in a loaded sweep. LTI 1.3: COMP estimates 4 to 8 weeks. SOC 2, Clever, ClassLink deferred until a district names one |
| M3: capstone builder | Minimum original-project builder inside courses | 22 | 37 | 61 | `cto-platform.md` (site-wide estimate for 2 to 3 people). Add 3 / 5 / 8 for teacher view of projects, rubric, fork-from-assignment (mine) |
| Cumulative M1 + M2 + M3 | | 54 | 93 | 150 | Sum of the above |

### 9.3 Assumptions

1. The Step 0 gate and the trust fixes are not optional and are counted here; a competing strategy that ignores them has a lower number only because it is skipping them.
2. Cloud costs stay in the free or low tiers during the pilot. Vercel Hobby is non-commercial (`business-growth.md`), so a paid plan is needed once any invoice is sent. Cost figure: UNKNOWN.
3. Content for the pilot is the existing Uno R3 set. Authoring more diagnosis items is content time, not engineering, and is not counted. Rate per item: UNKNOWN.
4. Teacher support, interviews, pilot logistics, grant writing and sales take founder time that is not counted here and is likely to be 30 to 50 percent of the team's week (HYPOTHESIS; no measurement).
5. No new interpreter language features and no real-firmware path in M1 or M2.

## 10. What it reuses from the current code, and what it replaces

Audit verdicts: `cto-platform.md` calls the repo "a prototype to mine, not a foundation to extend" and keeps about six pure modules. TD Part C lists debt not worth paying.

| Reuse (keep) | Use in this strategy | Source |
|---|---|---|
| Interpreters (Arduino C++, MicroPython/Python, Verilog), virtual clock, `World` | Run lessons and checks. Pilot touches Arduino C++ on Uno R3 only | INTERP; 189 tests pass |
| `Check`, `WorldModel`, `FailureMode` types, `evaluateChecks` (10 check kinds), `CheckJob` | Auto-check and, in M2, server re-run | INTERP `checks.ts:122-165`, `check-job.ts:24-70`; TD A1 |
| 71 lessons, 461 checks, 144 failures, 106 faults, catalogue structure | Assignment units | FV section 2 |
| Lesson workspace and Break-it panel | Student UI | `01_AUDIT/inventory/boardlab-robotics-ui.md` |
| i18n (2,064 UI keys, 12,311 content leaves per language, six languages) | Teacher and student UI; content translation unreviewed, label it | FV section 2 |
| Zod route pattern and the 502/503 contract; token-hash ownership in `profiles` | Class and submission routes | TD A11 "Good base" |
| Relay core (baton) | Later: teacher joins a student's lab. Not in M1 | TD Part C: baton is correct for teacher/student |

| Replace or add | Why |
|---|---|
| `iynk:v1` progress blob in localStorage as the only record | Cannot serve a teacher; no code stored (VERIFIED, `runs/BROWSER_WALK.md` step 14) |
| In-memory per-instance rate limiter and AI budget | Open spend; ceiling about USD 120 an hour per warm instance (ESTIMATED, `ai.md`) |
| Identity (none today) | Anonymous signed device session for students; teacher account |
| Server verification (none today) | CLAIMS contradicted: "server re-runs your exact run" (FV C030) |

| Leave alone in this strategy | |
|---|---|
| Drone Lab, Robotics Lab, flight model, Solana credentials, Build Buddies, leaderboard, daily challenge | Frozen per `robotics-aero.md`, `security-privacy.md`, `product-learning.md` |
| The new project document, netlist and solver | Needed for the capstone (M3), not for M1 or M2 |

One dependency to state plainly: content is authored in TypeScript with closed id unions (FV section 6 "Original projects", TD A4). A teacher cannot author a new lesson in M1 or M2. If teachers say they must, the project-document work (TD D1) moves to the front and the estimate rises toward the builder's.

## 11. Risks

| Risk | Label | What it does |
|---|---|---|
| The free-tier incumbents are enough for most teachers | HYPOTHESIS; MKT 4 notes freemium conversion 2.6% for EdTech (low-confidence vendor dataset) | Revenue near the low case ($23k a year at year 3, MKT 6.3) |
| Budget cycle and procurement slower than a school year; ESSER gone in early 2026 | EXTERNAL [MKT 4, 5.3]; sources disagree on severity | Pilots do not convert to invoices |
| The influencer who vetoes is not the one we talk to | HYPOTHESIS | Stall at DPA, VPAT, security questionnaire. 15 production dependency advisories (2 high) block a clean report (SEC) |
| Minors' data on a server | VERIFIED gap (no consent flow, persistent ids); legal reading HYPOTHESIS (COPPA school-authorisation exception not finalised by the FTC [COMP 1.1]) | Direct launch to high schools before counsel's answer is unsafe |
| iynk's lessons do not fit real syllabi | UNKNOWN | Teachers need 3 lessons they would run in a term; only Uno R3 has 16, other boards have 4 to 7 |
| Interpreter subset fails student code beyond the lesson | VERIFIED subset limits (INTERP) | Teacher frustration; rate of failure on real student sketches is UNKNOWN (CTO spike: 50-sketch coverage test) |
| Fidelity: teaching model, never compared with hardware | VERIFIED (`fidelity.md`) | Instructors who check against a bench find a discrepancy and the claim of trust ends |
| Hollow completions (Do it, reference solution, pass-on-open) make the dashboard meaningless | VERIFIED pass-on-open for Blink | Teacher sees green boxes that mean nothing |
| Client-side checks can be forged | VERIFIED (FV C008, INTERP D8) | Fine for formative; unusable for grades until M2 |
| Provenance: About page admits reuse of "lessons, timings and formulas" of three sites; no LICENSE | VERIFIED, FV | A school's procurement asks for IP indemnity. Founder and counsel action before any invoice |
| Seasonality, teacher turnover, summer dip | HYPOTHESIS | Weekly active metrics swing; a sales cycle takes a year |
| Founder capacity: selling, supporting, compliance and building at once | HYPOTHESIS | The 3-person team cannot do all four; M1 realistically stalls at the adverse case |
| Mission drift to rich-market universities | `business-growth.md` | The strategy pays from those least in need. Counter with sponsored seats and the free student promise |
| Single-maintainer engines and bus factor of one | `ceo-investor.md`, `cto-platform.md` | Not binding in M1 (no avr8js use) but binds in M3 |
| Wokwi or Velxio ships what we ship, with real firmware | HYPOTHESIS | See section 7 |

## 12. Where this strategy is weak (stated plainly)

1. It is the strategy most dependent on a buyer iynk has never spoken to. No interview has been run (SEG, MKT). Segment scores are my judgement, and every segment has evidence strength of 3 or less.
2. The money is small. Even the high case (USD 2.43M) is under USD 3M a year at year 3. This is a mission business with a revenue line, not a venture business (`ceo-investor.md`, `business-growth.md`).
3. It narrows the founders' vision: imagine, design, wire, program, simulate, debug, learn, build. A classroom-first iynk is "learn" and "debug" for an assigned syllabus. "Imagine" and "build for real" come last (M3). The founders asked for challenge: self-directed makers and anyone without a teacher get less from this strategy than from a builder-first one. The mission says "anyone, anywhere"; this strategy reaches those with an institution first.
4. It needs the most unglamorous work before any growth (privacy, DPAs, accessibility, dashboards), and it is the strategy where compliance cost exceeds early revenue (section 8.3 against the compliance estimates).
5. The edge it relies on, explaining faults, is narrow and is only evidenced in one hands-on benchmark (one run per tool, one Mac). Velxio narrows it already (`ceo-investor.md`).
6. Learning gains are unmeasured. The product-learning memo says the first lesson passes untouched and "iynk is not yet a learning product". Selling to teachers on the word "learning" before a pilot measures it would be the same kind of over-claim the audit contradicted on Solana and live prices.
7. Teachers already have free tools that need no account. Convincing them to adopt a second one needs a clear, visible reason, and that reason is not yet shown.
8. Formative-only first release: teachers who want grades cannot trust M1 results.

## 13. Council tension to resolve openly

The product-learning memo lists "Teacher accounts, rosters, LMS" under "Do not build" until Q3-b is true (6 of 12 teachers need a view of student work). The CEO memo lists an "enterprise sales team" and a venture raise as "Do not build". The security memo says to offer only a data-free class mode first and add accounts and a DPA when a paid pilot asks. B-classroom is compatible with all three only if it follows this order: interviews, then a data-free classroom mode, then accounts and a DPA on demand. If the founders want the full dashboard before a buyer has asked, this strategy contradicts three memos.

## 14. Evidence required before committing

Thresholds come from existing plans (T1 to T10 in MKT section 10, Q-rules in URP) where they exist. Where I add one, it is marked "mine" and is a judgement.

| # | Experiment | Pass | Fail or reroute | Source |
|---|---|---|---|---|
| E1 | Interviews: 12 K-12 teachers and 8 university instructors or lab coordinators, plus 8 budget holders. No product shown | Q2-a: at least 4 of 8 budget holders name a specific fund and a recent purchase under USD 2,000. Q3-b: at least 6 of 12 teachers need a view of each student's work | Q2-b: fewer than 2 of 8 name a fund: stop planning on bottom-up sales, move weight to grants and partners. Q3-b false: do not build a teacher dashboard | MKT T2; URP Q2-a, Q2-b, Q3-b |
| E2 | Wizard-of-Oz pilot: 8 teachers (3 cold-recruited) run 3 or more lessons on today's product with no accounts, with a shared spreadsheet and manual check of progress | Q3-d: at least 6 of 8 ran 3 or more lessons, at least 5 of 8 name a concrete plan for next term, and at least 2 of 3 cold-recruited teachers also pass | Q3-f: fewer than 4 of 8 ran 3 lessons: stop school outreach and fix blockers. Q3-g: network blocks, device problems or room limits named by 3 or more: fix these first | URP Q3-d, Q3-f, Q3-g |
| E3 | Priced waitlist and fake door for a Classroom plan, no payment taken. Cells from section 8.2. Teacher-qualified visitors only (work email, class size) | At least 3 percent of teacher visitors join at USD 20 per seat (T1). Minimum 200 qualified visits or the result is "inconclusive" (the 200 is mine) | Below 1 percent with 200 or more visits: classroom payer route not supported; keep teacher tools minimal | MKT T1; URP Q2-h |
| E4 | One-course pilot with 5 lecturers, free for one term, then ask for a quote-style price | Two ask for a purchase order (T3). Median stated price at or above USD 8 per student per semester (mine; anchored on LabsLand's low end) | Fewer than 1 PO or median under USD 4: university per-student route is weak; test department site licence or grants | MKT T3 |
| E5 | Same teacher task in Tinkercad Classrooms, Wokwi Classroom and iynk, 8 teachers: create an assignment, see who is stuck | At least 5 of 8 prefer iynk on the "who could diagnose the fault" part, or iynk is faster to the answer | Fewer than 3 of 8: no differentiated reason to switch; kill or reposition | MKT T4 (task-based); count mine |
| E6 | Differential test of server re-run: run `runChecks` in Node and in Chromium on all 102 lesson and task references and 100 deliberately wrong student-style submissions | 100 percent identical pass/fail outcomes on the 102 references; no memory abort on the three known probes (`x = [0]*10**9`, `int a[2000000000]`, append loop) after caps | Any mismatch on references: do not claim "verified" for grading | INTERP D1, D8; pass value mine |
| E7 | Device test on a school-type Chromebook and a mid-range Android phone: Uno R3 lesson load, run, check | p95 check run under 10 s for the 16 Uno lessons; page load under 2 s on the device (mine). Desktop 4x CPU throttle measured Blink load at 573 ms (VERIFIED, PERFORMANCE_BASELINE), a real device is not yet tested | Above threshold: classroom use on weak devices is not supported; cut scope | `fidelity.md` spike; mine |
| E8 | Syllabus fit: collect 10 real intro electronics or embedded syllabi (weeks, topics, boards) | At least 5 of 10 have 50 percent or more of their weeks covered by an existing lesson (mine) | Fewer than 3 of 10: content breadth is the blocker; new lessons or authoring tool come before dashboard | HYPOTHESIS |
| E9 | Learning outcome pilot: 4-lesson module, pre/post 10-item fault-diagnosis test, iynk-class vs the instructor's usual materials, at least 20 students per arm, then a real LED and button on a kit for 8 to 10 adults | iynk-arm mean gain is not lower than control, and no harm on the physical task. Exploratory, not a proof | iynk-arm worse than control: do not market as learning; revise Break-it design | `product-learning.md` M7 and physical-transfer pilot |
| E10 | Counsel opinion in writing on pseudonymous class-code data for under-18s (COPPA, FERPA, state student-privacy laws) and on the provenance of inherited content | A written answer that the class-code, pseudonym, DPA model is permissible with named conditions, and a clear route on provenance | Answer needs full COPPA Route B or a licence from the three sites first: university and adult-only first wave, and the commercial date moves | `security-privacy.md`; COMP 1.1, 1.2 |

Gate order: E1, E2, E8 and E3 run before M1 code (4 to 6 weeks, no engineering except the waitlist page and read-only telemetry pull, T5). E10 runs in parallel. E4, E5, E6, E7, E9 run during and after M1.

## 15. Kill criteria

Stop or change strategy if any of these is true by the date shown, counted from the start of the evidence sprint:

| # | Criterion | Date | Action |
|---|---|---|---|
| K1 | Q2-b holds (fewer than 2 of 8 budget holders name a fund) AND E3 is under 1 percent with 200 or more qualified visits | Week 8 | Drop the paid-classroom route. Keep teacher tools minimal and free. Move to grants, an open project, or another strategy |
| K2 | Q3-f holds (fewer than 4 of 8 teachers ran 3 lessons) twice after fixing named blockers | Week 20 | Stop school outreach |
| K3 | No institution gives a written purchase order, quote request or signed letter of intent after pilots in 5 or more institutions (G2 in `ceo-investor.md`: two POs from 5 pilots) | 9 months after the first pilot starts | Treat the classroom as a distribution channel, not a business. Open-source and grant-fund it |
| K4 | Wokwi, Tinkercad, MakeCode or Arduino ship free auto-checked assignments with a progress dashboard and pilot teachers cannot name a reason to stay with iynk (quarterly check, MKT T9) | Any quarter | Stop selling classroom seats. Reposition on what remains (explained faults) or stop |
| K5 | Counsel (E10) requires a licence from any of the three source sites or removal of content that is more than half of the lessons, and no licence is obtained within 90 days | 90 days after the answer | Do not sell. Rewrite from public sources or stop |
| K6 | E6 shows outcome mismatch on any reference lesson | Before M2 | No "verified results" claim; keep M1 formative |
| K7 | E9 shows iynk-arm worse than control on the physical task or on far-transfer | Pilot end | Remove learning claims; rework or stop |
| K8 | The compliance and legal bill for the school tier exceeds the secured grant money plus signed revenue by a factor of two | At the point of the first quote from counsel | Run universities and adults only until funded |

## 16. Immediate next steps (if the council picks this strategy)

1. Weeks 0 to 2: Step 0 trust fixes that cost no design (disable buddy listing, telemetry default off, close open routes, spend cap), counsel brief, audience decision in writing.
2. Weeks 0 to 6: E1 interviews, E8 syllabus collection, E3 waitlist page, T5 read-only telemetry pull. No classroom code.
3. Week 6: gate review against E1 to E3 and E8. If passed, start M1. If not, stop or change per section 15.
4. Weeks 7 onward: M1 in the order of section 9.1, with E2 running on the current product as the wizard-of-oz bridge.

## 17. Sources not in the repo

None added. All claims point to the research files above. Prices are as of 2026-10-26 in those files and need a live check before any decision (MKT 11 notes Wokwi shows EUR on the page and USD in a search digest).
