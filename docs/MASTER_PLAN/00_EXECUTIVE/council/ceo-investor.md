# Council memo: Founder/CEO and skeptical venture investor

Seat: vision, strategy, positioning, capital allocation, and the investor's view of defensibility, market size, growth and failure risk.
Written 2026-10-27. Repo state audited: commit `bb546d6`. No strategy had been chosen when this was written. This memo forms its own view from the evidence.

Labels used: VERIFIED (the audit inspected or reproduced it), DOCUMENTED (a project document says so, nobody tested it), EXTERNAL (a cited research file and its [S#]), ESTIMATED (assumptions shown), HYPOTHESIS (with a test), UNKNOWN. No confidence percentages are used.

## 1. Bottom line

1. **What exists is a good hackathon demo, not a product.** iynk is a guided viewer of 38 catalogue items. A learner cannot start a blank project, add a part, move a wire, save, export or share. Edited code is lost on reload. There are no accounts and no teacher features. VERIFIED (FEATURE_VERIFICATION section 6, browser walk steps 14 and 15).
2. **The core job in this category is "make my own project". iynk fails that job today.** Wokwi, Tinkercad, Falstad, MakeCode and Velxio all let a user create one. VERIFIED for Wokwi, Falstad, MakeCode (WORKFLOW_BENCHMARK 4.1, 6); EXTERNAL for Tinkercad and Velxio.
3. **iynk has one narrow, real edge: explaining why a wiring mistake breaks things.** In the only head-to-head test, iynk named the fault, showed the burnt part, gave the arithmetic and offered Repair. Wokwi and Falstad showed no message. TESTED, scripted, one run each (WORKFLOW_BENCHMARK 4.4, 6). Velxio, tested later the same day, also warns on all three faults, so the edge is now depth, not existence. The numbers inside the explanation are illustrative (a fixed 25 ohm pin constant, FV C010).
4. **The market for simulator licences is small.** Base case serviceable revenue is about $7.4M a year across the US, India and the EU, with a three-year capture of about $0.3M a year. High case capture is $2.4M. ESTIMATED (MARKET_ANALYSIS section 6). The free incumbents (Tinkercad, MakeCode) set the price anchor at zero for schools.
5. **So this is not a venture company yet, and may never be one.** The honest shape today is an open, mission-led project funded by grants and small institutional licences. It becomes fundable only if the evidence in section 7 appears. I would not take venture money in the next 6 to 9 months, and I would not raise before the product can keep a learner's work.
6. **The mission is real and under-served, but the evidence for it is desk research.** Nobody has been interviewed. Every segment has weak evidence (USER_SEGMENTS section 4; USER_RESEARCH_PLAN section 0). The founders' own story (CONTEXT.md section 5, 10-25 09:58) is a founder-market fit signal for an investor, not a demand signal.
7. **Recommendation in one line:** narrow to the Board Lab plus a minimal original-project builder, ship save/share/fork/export, measure retention and willingness to pay with cheap tests, freeze everything else, and fund the first year by bootstrap plus grants. Decide on pre-seed only after the gates in section 7.

## 2. Evidence reviewed

I read these in full unless noted. I did not have the budget to read every file in full; the "not read" list is at the end so the reader can judge coverage.

| File | How I used it |
|---|---|
| `docs/handoff/CONTEXT.md` | Read in full. Founders' words, decisions, team and process facts. |
| `docs/MASTER_PLAN/BRIEF.md` | Read section 31 (the 20 red-team questions) and the section index. Not read in full (73 KB). |
| `docs/MASTER_PLAN/RESUME.md` | Read the rules and status. |
| `02_RESEARCH/MARKET_ANALYSIS.md` | Read in full. Source of TAM/SAM/SOM, pricing comparables, grants, tests T1 to T10. |
| `02_RESEARCH/COMPETITOR_LANDSCAPE.md` | Read sections 0, 1 and 4 (four deep rival comparisons and copy-speed table) in full. Sections 2, 3, 5 to 10 only by heading. |
| `02_RESEARCH/WORKFLOW_BENCHMARK.md` | Read section 6 (what it means for iynk). Other sections by heading. |
| `02_RESEARCH/USER_SEGMENTS.md` | Read the summary, cross-segment table and segments 1 to 3. Not the other segments. |
| `02_RESEARCH/USER_RESEARCH_PLAN.md` | Read sections 0 and 1 (ranked research questions). |
| `02_RESEARCH/TECHNICAL_RESEARCH.md` | Read sections 1, 2 and 6 (decision summary, findings that change plans, spike list). |
| `02_RESEARCH/competitors/ecosystems.md`, `ai-hardware.md`, `education.md` | Read the summaries and "where iynk could be different" sections. |
| `01_AUDIT/FEATURE_VERIFICATION.md` | Read sections 0 to 2 and 4 to 7 in full. Claim register (section 3) by sampling. |
| `01_AUDIT/TECHNICAL_DEBT.md` | Read A1, B8, B11 and the section headings (A1 to A13, D1 to D5). |
| `01_AUDIT/SECURITY_BASELINE.md` | Read the summary and release blockers 1 to 5. |
| `01_AUDIT/inventory/solana.md` | Read the header, purpose, dependencies and interfaces. |
| `01_AUDIT/inventory/docs-claims-history.md` | Searched for provenance, hackathon and process facts. |
| Git (read only) | `git shortlog -sn`, commits per day, line count of `src server solana figures` excluding vendor. |

Not read (stated so the reader knows): `REPOSITORY_INVENTORY.md`, `PERFORMANCE_BASELINE.md`, `TEST_COVERAGE.md`, `SOURCE_REGISTER.md`, `REVIEW_GAPS.md`, `runs/*.md`, 12 of 14 inventory files, `COMPETITOR_MATRIX.md`, the `circuit-eda`, `embedded-sim`, `drone`, `robotics` dossiers (seen only through the synthesis), `tech/*.md`. I used no new web search.

Facts I measured myself, read only:

| Fact | Result | Label |
|---|---|---|
| Commit authors on `HEAD` | Amar Kushwaha 781, Jagrati Kumari 16 | VERIFIED (`git shortlog -sn HEAD`) |
| Commits by day | 353 on 2026-10-24, 439 on 2026-10-25, 5 on 2026-10-27 | VERIFIED (`git log --format=%ad`) |
| Hand-written code in `src server solana figures` (ts, tsx, js, rs; excluding `vendor`) | about 133,000 lines | ESTIMATED (one `wc -l` over a `find`; includes tests and generated figure builds) |

## 3. Weaknesses

Each has evidence and a label. Ordered by how much they hurt the company, not by how easy they are to fix.

| # | Weakness | Evidence | Label |
|---|---|---|---|
| W1 | **No project model.** The product cannot create, save, share or export a learner's work. Every route, content module and progress key is bound to 12/13/13 closed catalogue ids. | FV section 6 ("Original projects", "Persistence", "Export"); TECHNICAL_DEBT A4, A11, D1; walk steps 14, 15 | VERIFIED |
| W2 | **Zero evidence of demand, retention or willingness to pay.** No interviews, no pilot, no known user count. Production analytics were out of scope for the audit. | USER_RESEARCH_PLAN section 0; MARKET_ANALYSIS section 7 ("iynk's active user count is UNKNOWN") | UNKNOWN |
| W3 | **Fidelity is a teaching subset, not a simulator of real hardware.** C++, Python and Verilog are from-scratch subsets; the solver is DC only; flight is an arcade point mass; faults are scripted; no test compares anything to hardware or an independent simulator. | FV section 1 points 2 and 6, C005, C010, C015; TECHNICAL_DEBT A13 | VERIFIED |
| W4 | **The defensible asset (fault corpus) is narrower than it looks.** 144 board failures and 106 bench faults exist. The Repair flow was seen on 16 Uno-blink triggers plus a few walk cases, not on all 250. | FV section 2; COMPETITOR_LANDSCAPE finding 2 | VERIFIED (counts), TESTED (16 triggers) |
| W5 | **Almost every differentiator is copyable in weeks to months.** See answer to question 4. | COMPETITOR_LANDSCAPE 4.6 | HYPOTHESIS |
| W6 | **Not safe to give to children or schools today.** No auth, paid endpoints open to anyone, rooms with peer-id takeover and no moderation, telemetry on by default with no consent step, public buddy list, no privacy page. Release blockers 1 to 4. | SECURITY_BASELINE sections 1 and 8; TECHNICAL_RESEARCH F5 (COPPA amended rule compliance date 22 Apr 2026 passed) | VERIFIED (code), HYPOTHESIS (that the site is child-directed under COPPA) |
| W7 | **AI provider terms may bar the product's own audience.** Gemini's API terms require 18+ and prohibit clients "likely to be accessed by anyone under 18". Meta's terms were not read. | TECHNICAL_RESEARCH F2, RS-02 | EXTERNAL, conclusion HYPOTHESIS |
| W8 | **Legal and provenance exposure.** No LICENSE. Drone constants, lesson structure and test fixtures follow three third-party sites with no permission on file. Git cannot prove "all code written after 11:30 on 10-24" (first commit is 900 files stamped 15:30:42). | TECHNICAL_DEBT B11-01, B11-02; FV C042, C082, C083 | VERIFIED |
| W9 | **The honesty gap.** Eight claims are contradicted, including "the server re-runs your exact run" (a hand-written 7-event log gets a perfect score) and "priced live" (SerpApi quota was 0 of 250). An investor or a school will find these in an hour. | FV section 1 point 3, section 7 | VERIFIED |
| W10 | **Team capacity is one person plus agents.** 781 of 797 commits are one author. The 2-day build was run by AI agents; the project memory (wallet, keypair, env, transcripts, 4 GB scratch) lives on one Mac. No CI; production deploys by `vercel deploy --prod` from a laptop. | git shortlog; CONTEXT.md section 4; TECHNICAL_DEBT B11-03; FV section 5 "Deploy and ops" | VERIFIED |
| W11 | **Tests mostly prove self-consistency.** About 2,800 unit tests, 81.5% line coverage of loaded files, but expected values are the team's own earlier output. Under load 13 tests time out. A judge or a customer who wants "accurate" gets no independent evidence. | FV section 5 "Test oracle", section 1 point 6 | VERIFIED |
| W12 | **Low-resource reach is claimed, not shown.** The mission says anyone, anywhere. Lesson pages ship 2.2 MB of JavaScript uncompressed (about 700 KB gzip, ESTIMATED); idle figure pages use 48 to 65% of one core; only Chromium and Pixel 7 emulation were tested. | FV section 5 "Page weight", "Idle CPU"; walk step 13 | VERIFIED (sizes), UNKNOWN (real low-end devices) |
| W13 | **The business has no revenue mechanism built.** No billing code, no accounts, no seats. The live price feature is the only monetisable-looking feature and it depends on a paid search API that returned 429. | README "Free (no billing code exists)" per COMPETITOR_LANDSCAPE 2.1; FV C027 | VERIFIED |

## 4. Opportunities

| # | Opportunity | Why it might be real | Label |
|---|---|---|---|
| O1 | **Failure-based teaching as a product, not a feature.** "Break it, see exactly why, repair it" is a pedagogy with a content corpus that is slow to copy (authoring and checking are the cost). No education product found models failures. | FV section 2 (144 + 106 faults); COMPETITOR_LANDSCAPE 4.6 "Authored corpus: Slow"; education dossier gaps list | HYPOTHESIS, test: USER_RESEARCH_PLAN rank 4 and MARKET_ANALYSIS T4 |
| O2 | **Simulation-versus-bench mismatch is a documented user pain.** Forum threads show beginners seeing different currents than on a breadboard, with wiring errors a named cause. A tool that explains the mismatch addresses it. | USER_SEGMENTS segment 2 [S33]; COMPETITOR_LANDSCAPE 6.1 | EXTERNAL, anecdotal |
| O3 | **Hardware-less classrooms in countries with national lab programmes.** India has over 10,000 Atal Tinkering Labs and plans 50,000 more; 5,845 AICTE institutions; engineering enrolment 12.53 lakh B.Tech students. Public money flows to equipment, and a browser lab covers classes with too few boards. | MARKET_ANALYSIS 2.2 [S29][S31] | EXTERNAL; willingness to pay UNKNOWN |
| O4 | **Incumbent trust events.** Multisim Live ended 2026-09-15 (second-hand), Arduino's terms drew backlash after Qualcomm, LEGO retired SPIKE, Thingiverse changed owner. A visible, early promise on export, open file format and content ownership is a position. | COMPETITOR_LANDSCAPE finding 4; ecosystems summary; education summary | EXTERNAL |
| O5 | **AI grounded in a running simulation, with reviewable edits.** Flux reads a design; Arduino's assistant reads code; none documents an approve/reject/undo flow. Learner AI is thin. But iynk's partner today does not see the wiring. | ai-hardware summary; FV C020 | HYPOTHESIS, needs project model first |
| O6 | **Robotics electronics plus code in one free tab.** No row in the robotics tables joins robot body and electronics. Absence of evidence, not proof. | COMPETITOR_LANDSCAPE "Where it looks empty" | HYPOTHESIS |
| O7 | **Per-student pricing is already accepted.** Wokwi Classroom EUR 30 per student per semester; Velxio from USD 34 per student per year; Arduino School USD 20 per member per year; LabsLand from EUR 7.99. A classroom tier needs no pricing invention. | MARKET_ANALYSIS section 3 | EXTERNAL |
| O8 | **Grant fit.** The mission (access regardless of money, place, language) matches education and development funders better than it matches a venture thesis. | MARKET_ANALYSIS section 9 | EXTERNAL (programme existence), UNKNOWN (eligibility, odds) |
| O9 | **Cheap enough to learn fast.** A keyless build needs no backend cost; 2,797 tests pass on a quiet machine; the code can be restructured with AI help. The constraint is attention, not money. | COMMANDS.md via FV section 1 | VERIFIED |

## 5. Answers to the red-team questions in my remit

### Q1. Why would someone use iynk instead of Wokwi?

Today, almost nobody should, for anything involving their own project. Wokwi opens a blank Uno project without login, saves, downloads a ZIP, runs real compiled firmware on 18 MCU variants, has a debugger (beta), CI and VS Code (TESTED for the first items, EXTERNAL for the rest; COMPETITOR_LANDSCAPE 4.1).

Reasons that survive scrutiny, all narrow:

| Reason | Evidence | Strength |
|---|---|---|
| A guided lesson that tells you why your wiring failed, with the burnt part and the arithmetic | TESTED vs Wokwi and Falstad (no message shown in captured runs) | Real but one scripted run each; Velxio now also warns |
| No compile queue; first result in about 5 s | TESTED, one case; Wokwi showed queue #24 once | Real for beginners on slow networks (HYPOTHESIS); the cost is a subset interpreter, not a compiler |
| Robotics and drone labs | VERIFIED exist; Wokwi shows none | Different market, not a reason to leave Wokwi for circuits |
| No account, six UI languages | VERIFIED no sign-in; language quality unreviewed | Not an edge for languages: Cirkit Designer lists 12, Tinkercad reportedly 16 (low confidence) |

Verdict: iynk does not compete with Wokwi on Wokwi's job. It can only win where Wokwi's blind spot is, which is feedback on mistakes for people who are learning, and everything that is not a microcontroller. To use iynk instead of Wokwi, a user needs the builder (W1) first. Test: MARKET_ANALYSIS T4 (same task in iynk, Tinkercad, Wokwi with 10 students; pass if iynk wins on tasks needing boards the free tools lack).

### Q2. Why would someone use iynk instead of Tinkercad?

Tinkercad is the K-12 incumbent: class accounts, join by class code without email, free, huge install base (Autodesk claims 100 million Tinkercad users, vendor marketing, UNCONFIRMED; the page returned 403), a free-form circuit editor, a destroyed-LED display on wrong wiring (second-hand) (COMPETITOR_LANDSCAPE 4.2).

iynk's possible reasons: ESP32, STM32, Pico, FPGA boards in one place (reported unsupported or absent in Tinkercad, second-hand); robotics and drones; explained faults with Repair; no account. Against that: no class management, no builder, no saved work. For a teacher the choice is simple today: Tinkercad. The only teacher who picks iynk is one whose course needs a board Tinkercad lacks, or who wants the failure lessons as a supplement. Also, Autodesk can answer by attention rather than engineering; its priorities for Circuits are not visible (UNKNOWN).

Verdict: no switch reason for the mainstream K-12 case. A supplement role is plausible. This is HYPOTHESIS until teachers are asked (research plan rank 3).

### Q3. What can iynk do that existing tools cannot?

Stated narrowly and with the evidence it has:

1. **Explain a wiring fault in depth, free, no account, with a repair step.** TESTED against Wokwi, Falstad, MakeCode. Not tested against Tinkercad, Cirkit. Velxio comes close in one sentence. Depth and breadth (16 triggers named, 144 + 106 catalogued) is the edge.
2. **Robotics bench plus electronics plus code in one tab** and **drone calculator plus build steps plus flight in one tab with no login.** Absence of a rival in the pages read (HYPOTHESIS). Each lab has stronger single-purpose rivals: DroneBlocks (USD 695 a year school licence with a PX4 sim), VEXcode VR, Webots/Gazebo, eCalc.
3. **AI partner grounded in live pin state and check results.** Live smoke run 6 of 6 and one keyed walk step. Wiring is not sent to the model, so it cannot reason about circuits (FV C020, VERIFIED). Velxio, Cirkit and Arduino ship AI too.
4. **Rooms up to 8 with chat translation.** Same-browser only was exercised; cross-device is UNKNOWN. Not an established edge.

Honest summary: one thing iynk does that others do not (or not as deeply) is explain mistakes. Everything else is breadth or an unproven claim. A feature list is not value (BRIEF premise).

### Q4. Which advantages can competitors copy quickly?

From COMPETITOR_LANDSCAPE 4.6, all HYPOTHESIS (reasoning stated there):

| Advantage | Fastest copier | Time | Why |
|---|---|---|---|
| Explained faults | Velxio | Weeks to months | It already has ngspice and shows warnings |
| AI partner | Wokwi, Velxio (done), Arduino (done), Cirkit (done) | Weeks to months | MCP exists; built-in AI is a product choice |
| Six languages | Wokwi, Velxio | Months | UI translation is routine |
| Rooms | Wokwi | Months | Common web technique |
| Parts list and BOM | Velxio (Pro, done), Wokwi | Months | Easy data export |
| Robotics and drone labs | none visible | Year or more, or never | Different engines and markets (but also a smaller market, see Q5) |
| Authored corpus (fault explanations, 71 lessons, 272 robotics steps) | anyone with an AI pipeline | Slow if done carefully, fast if AI-generated | Content work, not engineering. The risk is that AI makes content cheap for rivals too |

Add one risk the dossiers state: Velxio reuses Wokwi's MIT emulators and ships often, and its AGPL license means iynk cannot embed Velxio code in a closed product. The durable moats available to a small team are therefore (a) a trusted, versioned, open project and part format that schools and contributors build on, (b) an evidence base that failure-based lessons teach better (none exists yet), (c) distribution through teacher and programme networks. None exists today.

### Q5. Is combining three labs strategically coherent?

As a mission story, yes: "experiment without buying parts" spans boards, robots and drones. As a product and a company, not yet.

| Test | Result | Evidence |
|---|---|---|
| Shared audience | No. Boards: students, CS-embedded, hackers. Robotics: clubs and FIRST/VEX. Drones: FPV hobbyists, schools with drone programmes. Three segments, three rival sets | COMPETITOR_LANDSCAPE audience table |
| Shared data model | Partly. Check, RunTrace, WorldModel are shared; three top-level content shapes; drones have 0 failures and different test/step types | TECHNICAL_DEBT A1 |
| Shared engine | No. Interpreters + DC solver; step state machines; fixed-step flight sim | FV section 4 |
| Shared buyer | Unknown. A school might want all three; a university lab wants boards | UNKNOWN |
| Maintenance per lab | High: 38 items, 80 committed figure pages (24 MB), 6 languages each, 579 build steps | FV section 2 |
| Rival depth per lab | Every lab has a deeper single-purpose rival | COMPETITOR_LANDSCAPE 2.1, 2.4, 2.5 |

Verdict: one brand, one navigation, but not one roadmap. Pick one lab as the product (Board Lab plus builder), keep Robotics as the second lab on the same project model later, and put the Drone Lab into maintenance mode (no new drones) until a buyer asks. The drone lab also carries the sharpest provenance risk (constants follow third-party sites, B11-01). This is my judgement (HYPOTHESIS), tested by which lab teachers and lecturers actually open in the pilot.

### Q8. Is the learning market large but difficult to monetise?

Yes. Both halves are supported.

| Fact | Evidence |
|---|---|
| Large: Tinkercad claims 100 million users; micro:bit reports 70 million young people and 3.7 million active users in 2025; Arduino says 33 million active users; 7.8 million US secondary CTE participants | MARKET_ANALYSIS 3, 5.1; USER_SEGMENTS [S9][S22][S24]. User counts are vendor claims |
| Hard to monetise: the buyer is not the user; free incumbents are funded by Autodesk, Microsoft and a foundation; individuals pay at most about USD 72 to 88 a year for a simulator | MARKET_ANALYSIS section 4 |
| Budgets are tightening: ESSER ran out in early 2026; a CoSN quote says schools are "back to where we were pre-pandemic"; districts hold about 2,591 tools (2022-23) | MARKET_ANALYSIS 4 [S38][S39] |
| Bottom-up institutional SAM: $7.4M; capture $0.3M a year in year 3 (base) | MARKET_ANALYSIS 6.2, ESTIMATED |
| Individuals: base $62k a year at 50,000 monthly users and 2.6% conversion; user counts are invented scenarios | MARKET_ANALYSIS 7, ESTIMATED |

Arithmetic an investor will do (ESTIMATED, my assumptions): to reach $1M a year at base ACVs, iynk needs about 833 US schools at $1,200 (35% of the 2,352 base SAM units, against a base win share of 5%), or about 222 colleges at $4,500 (37% of 605 units, against 4%). A $1M business inside this niche therefore needs a share far above the base case or a different revenue source. One state-wide or ministry deal could change the picture, but no such deal is sourced (MARKET_ANALYSIS 6.3, T10).

### Q9. Could institutions adopt faster than consumers?

Likely yes for revenue, no for adoption speed, and iynk is not ready for either.

- Every comparable that earns money charges institutions per seat (Wokwi Classroom, Arduino School, LabsLand, Velxio Classroom). Individuals pay little. EXTERNAL.
- But institutions need what iynk lacks: accounts, rosters, assignments, progress reports, DPA and COPPA routes, SSO or LMS links. Route B (child-directed) is estimated at 6 to 10 engineering weeks plus USD 6,000 to 20,000 legal; Clever 3 to 5 weeks; LTI 4 to 8 weeks (all ESTIMATED, USER_RESEARCH_PLAN rank 3 citing compliance-safety). None of it exists (FV section 6).
- Realistic pattern (HYPOTHESIS): a lecturer or teacher adopts for free, bottom-up, with a share link; the institution pays later if the classroom features exist. Procurement cycles are UNKNOWN.

Decision criteria (from MARKET_ANALYSIS, accepted as thresholds): T1, at least 3% of teacher visitors join a priced Classroom waitlist at USD 20 per seat (no payment taken); T2, most of 15 buyers name a fund and a purchase under USD 2,000; T3, two of 5 pilot lecturers ask for a purchase order.

### Q11. Are we building too many features before validating retention?

Yes. Evidence:

- 792 commits in about 2 days by two committers, one of them 98% of them; 38 items, 71 lessons, 6 languages, 3 labs, rooms, AI, Solana, price search, voice, MCP, leaderboard (CONTEXT.md; FV section 2).
- No retention number exists. The audit could not touch production analytics. An anonymous telemetry system exists and is on by default (FV, SECURITY D1), so the founders may already hold usage data in their own database. Whether anyone has looked is UNKNOWN.
- The feature that users of every competitor expect (a blank project) is the one missing.
- The test the market analysis proposes for retention, T5, has not been run: weekly return above 20%.

What is wrong is not the count but the direction: breadth went into catalogue, languages and sponsor integrations, not into the project loop that creates return visits. A learner who cannot keep their work has no reason to come back except the next lesson. Section 6 sets the first build around that.

### Q16. Is the Solana layer strategically important or distracting?

Distracting, at least for the next year. Evidence:

- It was built for a sponsor track. CONTEXT.md section 3: Solana was moved to "the last end of it" at 16:15 on 10-24, then built (decision log 10-25 09:03: deploy with about 3 devnet SOL).
- Its core claim is false as worded. The credential check folds a client-supplied event log; a 7-event forged log passes; anyone can mint to any wallet; 1 of 5 run kinds is mintable; the issuer key, fee payer and faucet treasury are one hot key (FV C030; TECHNICAL_DEBT B8-01 to B8-04). VERIFIED.
- It costs real load: 5,451 hand-written lines, plus the wallet stack is 467 KB raw in the first load of seven page types even for users who never touch it (B8-07), and unused dependencies (B8-06).
- Legal exposure is non-trivial before mainnet: escrowed bounties, a faucet, immutable wallet-linked records (B8-10, HYPOTHESIS, not legal advice).
- It conflicts with the mission. Access "regardless of money" and a requirement to hold a crypto wallet point in opposite directions, and children are a core audience.
- No segment evidence asks for it. The only mention is hackathon builders wanting "a credential judges can open" (USER_SEGMENTS segment 7, HYPOTHESIS).
- A valid core idea sits inside it: a verifiable skills record that a school, employer or ministry trusts. That does not need a chain. A signed, server-verified credential (Open Badges style) delivers it with no wallet.

Action: freeze the program on devnet, lazy-load the wallet code out of the first bundle, drop it from the product narrative, and revisit only on the trigger in section 7. It was also a good hackathon decision; that is a different question from a good company decision.

### Q17. Does a component marketplace need network effects we do not have?

Yes. A marketplace needs authors and consumers, a trust and licence process, moderation and discovery. iynk has no accounts, no project format, no custom-part capability (circuits are compiled into figures at build time; the interpreter has 11 fixed device kinds; FV section 6) and no known active-user count. Without users there are no authors; without authors there are no parts that matter.

The ecosystem dossier gives the right shape: link-first, fork-friendly, credited (Wokwi, GitHub, Thingiverse). Before any marketplace, iynk needs a plain data-file part (pins, a few rules, a picture), a fork-and-credit project model, and an age and moderation policy (ecosystems summary; Hackster limits to ages 13+, Onshape needs educator accounts for under-13s). Licence risk on imported component data is also unaddressed (question 19, not my remit, but it blocks any bulk import).

Instead of a marketplace: a curated, first-party part library authored by the founders and AI-assisted, reviewed by pull request, in the open. The trigger to build a marketplace is in section 7.

### Q20. Can a small founding team realistically maintain this scope?

No, not this scope. Maybe, with one lab.

| Signal | Evidence |
|---|---|
| Contributors | 781 commits by one author, 16 by the other (VERIFIED, git) |
| Code authored by AI agents in 2 days; the verification burden now falls on people | CONTEXT.md section 5; FV: tests are mostly self-consistent |
| No CI; deploys from a laptop; secrets and wallet on one Mac | TECHNICAL_DEBT B10, B11-03 |
| Surface: 827 prerendered pages, 80 committed figure builds (24 MB; 4 of 80 rebuilt byte-identical, the other 76 unchecked), 6 languages x 12,311 prose leaves (quality unreviewed), 3 engines | FV sections 2 and 5 |
| Test suite times out under load (13 failures at load 38 to 117) | COMMANDS.md via FV section 5 |
| Security, child safety, compliance and AI cost are all unbuilt | SECURITY_BASELINE section 8 |
| Core MCU engine path rests on single-maintainer projects (avr8js, rp2040js) | TECHNICAL_RESEARCH F6 |

What a two-person team can hold (my estimate, HYPOTHESIS): one product lab, one project model, one solver path, a small set of boards, a public contribution path, and support from outside programmes. Test: after the first build, count founder-hours per week on maintenance versus new work; if maintenance exceeds half, cut scope again.

## 6. What to build first (from the CEO and investor lens)

Principle: build only what moves the company toward evidence that someone returns and someone pays. Not what makes the demo bigger.

| Order | Item | Reason | Done when |
|---|---|---|---|
| 0 | **Measure what already exists.** Read the existing telemetry store (read-only) for unique browsers, return rate, lesson completion, countries, device types. Add privacy-friendly weekly return counting if absent. | Cheapest way to answer W2. MARKET_ANALYSIS T5. | A one-page number: weekly active browsers and weekly return rate |
| 1 | **Ten teacher/lecturer conversations and five student task tests** (USER_RESEARCH_PLAN rank 0 to 3; T2, T3, T4). No code. | Nobody has been asked. They decide whether the builder is first and whether schools or universities are the first buyer. | Notes in the repo; thresholds in section 7 evaluated |
| 2 | **Fix what an investor or school would catch in an hour.** Honesty rewrites (FV section 7), a LICENSE and provenance decision, a written audience decision (13+ general or child-directed; RS-02), remove or gate the open paid endpoints, turn telemetry off by default for under-18, remove the public buddy list. | A trust failure kills fundraising and school adoption. Release blockers 1 to 4 apply before school marketing. | SECURITY_BASELINE blockers 1 to 4 closed; copy matches evidence |
| 3 | **Project model for the Board Lab only.** A versioned, text project file (like Wokwi's `diagram.json`), blank project, add and wire parts, save, fork, share link, export code and project file. One board family first (spikes RS-01, RS-03 decide the engine path). | Table stakes in every rival; precondition for share, export, AI proposals, MCP (WORKFLOW_BENCHMARK 6; TECHNICAL_DEBT D1). 4 to 8 person-weeks for the editor core (ESTIMATED, low confidence). | A stranger builds LED + resistor + sketch, saves, reloads, shares, and a second person forks it, without help |
| 4 | **Classroom waitlist and fake-door price tests** (T1, T6). A priced Classroom tier page and a personal-plan page; collect emails and class sizes; take no money. | Tests revenue before building rosters. | T1 and T6 numbers in section 7 |
| 5 | **One pilot with one lecturer and one school class**, with the project model and fault lessons, a feedback loop and a recorded outcome. | Gives the first real retention and learning evidence (and the only story a funder will believe). | Written pilot report with numbers |
| 6 | **Open the repo properly**: LICENSE, CONTRIBUTING, SECURITY, a public content-ownership and export promise. | O4 (trust events) and the grant and nonprofit routes need it. Also lowers bus-factor risk. | Files exist and match the decision |

Build order rationale: items 0 and 1 are cheap and may change items 3 to 6. If conversations show teachers do not want a builder, the plan shifts to deepening the failure lessons and a teacher view instead.

## 7. What not to build yet, and the trigger that changes that

| Do not build | Why | Trigger to reconsider |
|---|---|---|
| Component marketplace | Needs authors and users we do not have (Q17) | At least 50 externally authored projects forked in a month and a part-data-file format in use by people outside the team |
| Solana mainnet, more credential kinds, bounties | Forgeable, legal exposure, mission mismatch (Q16) | A paying buyer asks for portable verifiable credentials, and server-side proof of work exists. Prefer a signed off-chain credential first |
| More drones or robotics benches; PX4 SITL; ROS 2 graph | Maintenance mode for drones; no buyer asked | Two institutions in the pilot ask for it in writing, or grant funding covers it |
| More languages (the original promise was 13) | Six exist with unreviewed quality; Cirkit has 12 so count is not an edge | Native-speaker review of the six passes, and the pilot country needs a seventh |
| Full SPICE/ngspice analog suite | RS-07, RS-08 unproven; heavy | RS-08 shows the in-house solver fails 5 or more of 20 reference circuits |
| Live AI image/voice and more AI features | Cost unknown (RS-11); provider terms may bar minors (F2) | Model cost per session measured, provider cleared for the chosen audience |
| Native apps, desktop client, hardware flashing | The loop to real hardware is better served first by code and project export | Users ask for flashing after export exists |
| Rooms beyond 8, persistent rooms | Rooms have no identity or moderation (R1 to R9) | Teacher pilot needs it and identity exists |
| Direct sales team, enterprise features | The market is small and the product has no accounts | One paid pilot converts without a salesperson, and a state or ministry buyer appears |
| A venture fundraise | See capital plan | The gates below pass |

## 8. Fundable company versus open-source project versus nonprofit

These are my judgements (HYPOTHESIS) from the market numbers above. Criteria are measurable so the founders can decide with data.

| Path | It fits if | Evidence for or against today |
|---|---|---|
| **Venture-backed company** | A credible path to a revenue stream above a few million dollars a year, a distribution engine that compounds, and a moat beyond content. Simulators alone do not give this (SAM $7.4M, SOM $0.3M base) | Against today. Needs a second engine that scales (for example parts referral revenue, credentials accepted by employers or ministries, AI tutoring with positive unit economics, or a ministry-scale licence) and proof of retention |
| **Open-source project with a sustaining company** (open core, hosted classroom tier, support, grants) | Many contributors can extend parts and content; schools value self-host and a promise they will not be locked in; revenue is modest but the project survives | Plausible fit. Free trust events at competitors (O4) help. Risk: Velxio is AGPL and open too, and MakeCode and Falstad are open already |
| **Nonprofit or grant-funded programme** | The goal is access in places that cannot pay; funders (education, development, CSR) pay for reach and outcomes | Plausible fit for the stated mission. Funding is project-based, short, and reporting-heavy; no foundation data was gathered (MARKET_ANALYSIS section 9 UNKNOWN) |

What would make it fundable, as a checklist an investor would use:

| Gate | Measure | Pass signal (HYPOTHESIS) |
|---|---|---|
| G1 Retention | Weekly active users and weekly return rate (T5) | Return above 20%, growing for 8 weeks without paid acquisition |
| G2 Willingness to pay | T1 waitlist, T3 purchase orders, T7 India stated prices | At least 3% waitlist at USD 20 per seat; two POs from 5 pilots; median India price at or above USD 2 per student per semester |
| G3 Learning outcome | Pilot study of failure-based teaching versus control on a debugging task (research plan rank 4) | A measurable gain, reported with the method; absence of one weakens the "learning" claim |
| G4 Wedge | A named beachhead segment with at least 10 reachable buyers and a channel (teacher network, programme, ministry) | Written list with names and one signed pilot |
| G5 Scale path | A route to $1M a year that does not need a share far above the base case | Either a ministry/state contract in discussion, or a second revenue line with a tested price |
| G6 Trust | Release blockers 1 to 4 closed; LICENSE and provenance settled; audience decision written | Checklist done |
| G7 Team | A named second builder with real hours, or a funded hire | Not 781 to 16 |

If G1 and G2 fail after a fair run (a 6-month window is my suggestion), the right call is to become an open, grant-funded project and say so.

## 9. The three ways it most likely dies

1. **It never becomes a place people return to.** It stays a lesson viewer while Wokwi, Velxio and Tinkercad own the "make my project" job, and nobody keeps work in iynk. Signals: weekly return under the T5 bar after builder launch; teachers say "we use Tinkercad". Why likely: W1, W2, Q1, Q2. Mitigation: build item 3 and measure item 0 first.
2. **A trust failure ends the school and funder route.** An abused open AI or search endpoint produces a bill or an outage; a child-safety incident in rooms or the buddy list; a COPPA or provider-terms problem; a reviewer finds the contradicted claims; a rights holder objects to the drone constants and lesson structure. Signals: provider 429s and quota bills, a complaint, a legal letter. Why likely: W6 to W9. Mitigation: item 2 before any outreach to schools.
3. **Breadth outruns two people, and the money does not arrive.** The founders keep the 3-lab, 6-language, AI, rooms, Solana surface alive on volunteer time, with no revenue in the first year, no CI and a one-laptop operation. Maintenance eats the build budget and the project goes quiet. Signals: maintenance above half of founder-hours, tests failing, content drifting from code. Why likely: W10, W11, Q20. Mitigation: scope to one lab, put the rest in maintenance, fund through grants, bring in contributors via an open repo.

Honorable mention (not top three): a free-access cost blow-up from AI. Cost per session is UNKNOWN (RS-11), and Gemini prices change (F4). A hard spend cap with a kill switch is mandatory before AI is open to anyone.

## 10. Capital plan options

Costs here are not quoted prices unless sourced. Founder time is the main cost and I do not value it.

| Option | What it funds | What must be true | Main risks |
|---|---|---|---|
| **A. Bootstrap (founders, near-zero cash)** | Infra only. Vercel Pro is required for commercial use (Hobby is non-commercial; Pro $20 with a $20 credit, EXTERNAL, TECHNICAL_RESEARCH F3); a relay VM; a domain. AI spend stays capped at near zero or off. | Both founders keep other income for 12 months; AI features are off or tightly capped; the scope is one lab; contributors help | Founder burnout and part-time pace (death way 3). Slow, but the cheapest way to run the tests in section 6 |
| **B. Grants (non-dilutive)** | Founder stipends and a pilot year | (1) An eligible entity and eligible people. NSF SBIR needs a US small business, a Project Pitch and an invitation; "up to $2 million" is stated on the NSF page, phase amounts come from an aggregator (EXTERNAL [S44][S45]). (2) IES SBIR FY2026 closed 2026-06-29 per an aggregator, IES page 404 (EXTERNAL, weak). (3) Erasmus+ small-scale partnerships (EUR 30,000 or 60,000) need two organisations from two eligible countries (EXTERNAL [S46]). (4) India CSR: education was about Rs 1,104 crore of about Rs 17,967 crore in FY2023-24 among listed companies, secondary figures (EXTERNAL [S33]). (5) Foundations: not searched, UNKNOWN. (6) The founders' citizenship and residency: UNKNOWN. | Grants need outcome evidence and reporting, which needs the pilot (G3). Application time is a real cost. Funders can steer the roadmap. NSF DRK-12 and ITEST pages show "archived" (EXTERNAL [S42][S43]). Acceptance odds UNKNOWN. T8 is the cheap test: one project pitch or one partnership application |
| **C. Pre-seed (equity)** | A hire or two and 12 to 18 months | Gates G1 to G7 mostly pass; a beachhead; a credible second revenue engine; a narrative that the business is bigger than classroom seats. I will not guess round sizes or valuations (UNKNOWN; no market data gathered) | Raising before G1 and G6 would value a demo, expose the honesty gap and the safety blockers, and dilute for a product that may only support a small business. VC-backed AI hardware tools exist (Flux raised $37M, EXTERNAL [ai-hardware S3]) but target working engineers, not learners |
| **D. Hybrid (my recommendation)** | A for 3 months while running items 0 to 2 in section 6; then B in parallel with the pilot; revisit C when G1 to G7 are measured | The founders accept a slower, evidence-first path and will say publicly what iynk does not do | Grant and pilot timing may not align; decide a stop-and-reassess date in advance |

## 11. Risks

| Risk | Type | Label | Mitigation |
|---|---|---|---|
| No learner retention after the demo | Product | HYPOTHESIS | Item 0 and 3 in section 6; kill criterion at G1 |
| Free incumbent adds iynk's edge (Tinkercad adds ESP32 and AI, Velxio keeps shipping) | Competitive | HYPOTHESIS | Choose the wedge where incumbents do not look; watch list in COMPETITOR_LANDSCAPE 7.3 |
| Velxio (AGPL, open source, classroom plan) wins the open-source community | Competitive | EXTERNAL | Differentiate on pedagogy, safety and local-language reach, not features |
| Simulation inaccuracy damages teaching trust (the "113 mA" illustrative figure; subset interpreters) | Scientific | VERIFIED | A visible "What it is not" box; label figures illustrative; independent reference cases (RS-08) |
| Child safety and privacy | Legal | VERIFIED (code), HYPOTHESIS (legal reading) | Blockers 1 to 4; written audience decision; counsel review (budget UNKNOWN) |
| AI provider terms and cost | Legal, financial | EXTERNAL, UNKNOWN | RS-02 and RS-11 before opening AI to the public; spend cap |
| IP and provenance of constants, lessons and component data | Legal | VERIFIED (no permission on file) | Counsel review or rewrite; LICENSE decision |
| Hackathon provenance (git cannot prove "after 11:30") | Reputational | VERIFIED | Do not repeat the claim; keep the transcripts; short PROVENANCE note |
| Bus factor: one dominant committer, project memory on one Mac | Operational | VERIFIED | Move keys to a secrets manager, CI, a second committer, written runbooks |
| Single-maintainer upstream engines (avr8js, rp2040js) | Technical | EXTERNAL | MIT allows a fork; keep the TS interpreters as fallback |
| Grant dependence | Financial | HYPOTHESIS | Pair grants with a paid classroom tier; track runway |
| Institution budgets shrinking | Market | EXTERNAL | Price test before building rosters (T1) |

## 12. Open questions and the cheapest way to answer each

| # | Question | Cheapest answer | Cost |
|---|---|---|---|
| 1 | How many people use iynk.tech and how many return? | Founders read their own telemetry table read-only; add weekly return counting (T5) | Hours |
| 2 | Do learners want to build original projects or follow guided lessons? | 5 observed task sessions (T4) plus 10 conversations; ask them to try their own idea | 1 to 2 weeks |
| 3 | Who pays, from which budget line, how much? | 15 short calls with CTE directors and department heads (T2); 10 colleges and 5 ATL schools for stated prices (T7) | 2 to 3 weeks |
| 4 | Will teachers take a no-account browser lab, or do they need rosters? | The same conversations, plus the Classroom waitlist (T1) | Days to build the page |
| 5 | Does failure-based teaching improve debugging skill? | Small pilot with a control group in one class or course | One term |
| 6 | Which segment is the beachhead (school CS, university embedded, India engineering colleges, hackathon builders, FIRST/VEX clubs)? | Rank segments by reachable buyers and conversation results; pick one in writing | After question 3 |
| 7 | Is the audience child-directed or 13+? Which AI providers allow it? | Founders decide in writing (RS-02); read Meta's terms; ask each provider's support | Days, plus counsel cost UNKNOWN |
| 8 | Who owns the rights to the drone constants and lesson structure? | Ask counsel or rewrite the data from primary sources; document the decision (B11-01) | Days to weeks |
| 9 | Are grants open to us? Which entity, which founders? | Check eligibility for NSF SBIR (US small business), Erasmus+ (EU partners), India CSR routes; submit one project pitch (T8) | 1 to 2 weeks |
| 10 | What does AI cost per learner session? | RS-11: 50 scripted conversations across models with caching measured | 1 to 2 weeks |
| 11 | Does Velxio or Tinkercad beat iynk on the fault task? | Run the same 3 faults by hand in Velxio, Cirkit and Tinkercad (the benchmark did not) | One afternoon |
| 12 | Can the two founders sustain this? What are the hours, income and runway? | A written 12-month commitment from each founder: hours per week and cash runway | One conversation |
| 13 | Do low-end devices in target regions run it? | Test a 3-year-old Android phone and a Chromebook (RS-01, RS-03); measure the 2.2 MB lesson page and idle CPU | 1 to 2 days |
| 14 | Is a second revenue engine real (parts referral, credentials, AI tutoring, ministry licence)? | A fake-door for each, plus one conversation with a state CTE office or ministry (T10) | 2 to 4 weeks |
| 15 | What did HackTX judging produce (prizes, feedback, contacts)? | Not recorded in the files I read: UNKNOWN. Ask the founders; any judge or sponsor contact is a free warm lead | Minutes |

## 13. Closing note to the founders

You asked for challenge. The hardest point is this one: the thing you built is more impressive as a demo than useful as a tool, and the market that pays for tools like it is small. The mission can still be right. The way to find out is to stop adding and start measuring: put a learner's work on a page they can keep, ask ten teachers, and let the numbers in section 8 decide whether this is a company, an open project or a programme.
