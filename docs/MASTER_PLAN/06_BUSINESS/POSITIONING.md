# Positioning

**Shelved 2026-10-27.** Amar decided to build iynk first as a full open-source app for himself and his friends and to return to the startup question afterwards (DECISION_REGISTER D-013). This file is kept as reference for that later decision and does not steer the build.

Written 2026-10-27 by the orchestrating agent. Answers brief section 5.4 (genuine differentiation, three positioning
strategies, one selected) and section 6.3 (beachhead). The decisions themselves live in
`00_EXECUTIVE/DECISION_REGISTER.md` (D-001, D-002); this file explains the positioning that follows from them.

Inputs: the competitor matrix and landscape (`02_RESEARCH/COMPETITOR_MATRIX.md`, `COMPETITOR_LANDSCAPE.md`), the hands-on
benchmark (`02_RESEARCH/WORKFLOW_BENCHMARK.md`), the audit (`01_AUDIT/FEATURE_VERIFICATION.md`, `runs/BROWSER_WALK.md`), the
three strategy files and four judge files in `06_BUSINESS/strategy-options/`, and the council memos in
`00_EXECUTIVE/council/`. No user has been interviewed, so demand statements are HYPOTHESIS.

## 1. The differentiation hypotheses, tested

The brief lists nine candidate differentiators and says not to assume any is unique. Verdicts use what the audit and the
benchmark observed.

| Hypothesis | What exists today | Who else has it | Verdict |
|---|---|---|---|
| One continuous workflow from circuit to robotics or flight | Three separate labs in one site. No project carries from one to another; there is no project model at all (VERIFIED, FV section 6) | No single rival covers all three; each lab faces a deeper specialist (COMPETITOR_MATRIX) | Convenient, not a workflow. The "three labs" lead rests on absence in the pages the research fetched |
| Intelligent, explainable fault simulation | 144 board failures and 106 bench faults, each with a burnt part, the arithmetic and a Repair button (VERIFIED, FV) | Wokwi and Falstad showed no warning text for the three standard faults (TESTED, WORKFLOW_BENCHMARK task 4). Velxio warns before a run (TESTED). Tinkercad untested | The one tested edge. The authored corpus is slow to copy; detection itself is not (Velxio already has ngspice). Faults are bound to 38 figures, not computed on arbitrary circuits |
| Learning through realistic failures | Break it shows the failure and explains it. Nothing asks the learner to diagnose first, and nothing measures learning (VERIFIED, `council/product-learning.md`) | No rival found that teaches diagnose-first in a simulator (absence, HYPOTHESIS) | Potentially hard to copy, once a diagnose-first design, aggregate misdiagnosis data and a published outcome study exist. None exists yet |
| AI guidance grounded in real project state | The partner answered from live bench state (D12 HIGH, LED1 0 mA) but did not name the fix (BROWSER_WALK) | Velxio, Arduino and Cirkit ship AI assistants (EXTERNAL) | Copyable in weeks. Unsafe for minors today (`council/ai.md`) |
| Seamless multilingual collaboration | Six interface languages, quality unreviewed, some English left in figures. Rooms synced in one browser; cross-device untested; host takeover reproduced (SECURITY_BASELINE R4) | Wokwi and MakeCode have shared links; few rivals have Hindi | Convenient. Collaboration is not safe to ship yet (D-006) |
| Student-authored projects | Do not exist: no blank project, no save, no export (VERIFIED) | Wokwi, Tinkercad, Velxio, Falstad all have them | A gap, not a differentiator. Studio is the plan to close it (D-002) |
| Community component ecosystem | Does not exist | Wokwi custom chips, Fritzing parts (EXTERNAL) | Needs network effects iynk does not have. Frozen (D-006) |
| Low-friction route to a physical prototype | A catalogue-price parts list works keyless (quad5: USD 346). "Priced live" is CONTRADICTED; the only download is a story PNG | Wokwi exports projects; Tinkercad exports code | Not present. Export ships in phase 1 for catalogue items |
| Affordable access in underserved markets | Free, no account, six languages. Lesson page first load 701 KB gzip; no real low-end device tested (PERFORMANCE_BASELINE) | Free no-account entry is matched by Wokwi, Falstad, MakeCode and Velxio (COMPETITOR_MATRIX) | Convenient. Becomes a position only with measured low-end performance and sponsored-seat partners (D-011) |

**Hard to copy versus merely convenient.**
- Hard to copy, if built: the reviewed fault corpus plus diagnose-first teaching plus aggregate data on which wrong
  diagnoses students make plus a published outcome study. A rival can match the visible feature within a term
  (strategy C's own estimate, HYPOTHESIS); it cannot quickly match a year of class data and an outcome result.
- A position rather than a technology: free, no account, private by default, plain export. Technically easy to copy, but at
  odds with a business that earns from private projects (Wokwi, HYPOTHESIS).
- Merely convenient: three labs in one tab, six languages, the AI partner, rooms, the Solana credential.

## 2. Three positioning strategies

Full cases are in `06_BUSINESS/strategy-options/`. Each advocate argued one strategy; four judges scored all three
independently, 1 to 5 on eight criteria (40 is the maximum).

| | A. Creator-builder | B. Classroom platform | C. Fault lab |
|---|---|---|---|
| Target customer | Self-directed learners and makers 13+; beachhead first and second year university students and their clubs | Lecturers at US/EU universities and colleges, then Indian colleges, then US high-school CTE | Lecturers and lab managers of first and second year electronics and embedded courses; US colleges, then India |
| Unique value | Plain-words explained faults on the learner's own circuit, no account, private by default, plain export | Authored corpus (71 lessons, 461 checks, 250 faults) as assignments with per-student diagnosis data | Diagnose-first practice: symptom shown, cause hidden, graded hints, class view of wrong diagnoses |
| Competitor response | Velxio could add burn visuals in weeks; Wokwi warnings in months | Wokwi could add assignments and a dashboard in months; Velxio in weeks | Visible feature matched within a term; Velxio closest; free chatbots already diagnose for novices |
| Monetisation | None for 18 months; later class mode USD 12 to 20 per student per year, AI quota tier | University course licence USD 8 to 30 per student per semester; K-12 USD 99 to 199 per educator per year | Course pack EUR 5 to 8 per student per semester, or USD 250 to 400 per course per term; base-case ceiling about USD 149k a year |
| Engineering cost (engineer-weeks, best / expected / adverse, ESTIMATED) | 27 / 43 / 72 | 17 / 31 / 50 for milestone 1; 54 / 93 / 150 cumulative | 11 / 17.5 / 29 for phase 1; 21 / 35 / 58 more for a fault engine on arbitrary circuits |
| Main risks | Demand indirect; differentiator unproven on user circuits; editor may miss low-end devices; no revenue | Buyer never interviewed; compliance cost exceeds revenue; hollow completions | No general fault engine; teaching model unvalidated; learning benefit unproven; small market |
| Evidence required | Interpreter coverage on 50 sketches, RS-01, RS-08, head-to-head vs Velxio and Wokwi, 12 learner interviews | Budget-holder interviews, wizard-of-oz pilot, priced waitlist, syllabus fit, counsel opinion | Tinkercad and Velxio hand test, 10 lecturer conversations, 10-fault bench check, one-term pilot, crossover study |
| Judge totals (investor / educator / engineer / mission) | 22 / 19 / 22 / 22 = 85 | 22 / 23 / 21 / 22 = 88 | **27 / 27 / 26 / 26 = 106** |

## 3. The selected position

**Selected: C first, A as the committed destination, B thin** (DECISION_REGISTER D-002, confirmed by Amar on 2026-10-27
with Studio built straight after Fault Lab).

Positioning statement (internal, for decisions, not marketing copy):

> For lecturers of introductory electronics and embedded courses whose students lose lab time because they cannot find
> why a circuit does not work, iynk is a free browser lab where students practise diagnosing realistic wiring and code
> faults before they touch hardware. A student sees the symptom, names the cause, and gets an explanation with the
> arithmetic. The lecturer sees which wrong diagnoses the class made. It runs with no account and no install, and the
> student's work can be saved, shared and exported.

The destination stays the founders' vision: once the gate passes, the same diagnosis engine works on circuits the
student designed in Studio.

**Explicitly rejected or deferred** (details and revisit triggers in D-002):
- A as the opening product: deferred to the Studio gate.
- B as the opening product: deferred; the classroom layer stays a thin class code and CSV until a budget holder pays.
- C as the end state: rejected.
- The early gap-fix draft (C plus a robotics-club beachhead): superseded; kept outside the plan tree.

## 4. Beachhead (brief section 6.3)

Decision D-001. Summary:

| Role | Who |
|---|---|
| Uses the free product | Students in first and second year electronics and embedded courses; individual makers stuck on a circuit |
| Benefits financially | The department (lab time, burnt parts); the student (practice without a kit) |
| May eventually pay | The department or lab budget per course per term; grants and CSR sponsors for Indian and low-income seats |
| Influences adoption | Lecturer and TAs, then the lab manager; an IT or privacy officer can veto |
| Drives organic distribution | The lecturer who links it in the syllabus each term; students passing it to the next cohort |

Why this segment: the problem recurs every term, a paying precedent exists in the segment (Wokwi Classroom EUR 30 per
student per semester, EXTERNAL), the users are adults, and the one tested edge (explained faults) maps onto the job. Why
not robotics clubs, makers, high schools or low-resource learners first: see the table in D-001.

## 5. Competitor response, and what keeps the position

| Competitor | Likely response | Speed (HYPOTHESIS) | What keeps iynk ahead |
|---|---|---|---|
| Velxio (open, AGPL, ngspice, tutor, Classroom USD 34 per student per year) | Adds burn visuals and plain explanations | Weeks to months | Diagnose-first design, reviewed corpus, class misdiagnosis data; re-run the head-to-head before every gate |
| Wokwi | Adds electrical-rule warnings; possibly assignment templates | Months | Teaching layer and free private export; Wokwi earns from private projects |
| Tinkercad Circuits | Already shows a destroyed LED; explanation depth unknown | Quarters to never | Unknown until E0; if Tinkercad already explains cause and fix with classes, kill or reposition (D-002) |
| Arduino (Qualcomm) | Bundles a simulator or AI into the School plan | Months to a year | Neutral, multi-board, no hardware purchase needed |
| MakeCode | None; no wiring | Not applicable | Not applicable |
| General chatbots | Already give novices a diagnosis today | Now | Grounded in the actual circuit and graded hints, not just an answer; test substitution in the think-aloud sessions |

## 6. What iynk may say in public now

| Allowed now | Not allowed until the evidence exists |
|---|---|
| "Learn by trying things safely" | "Teaches debugging" or "improves debugging" (needs the M7 crossover study) |
| "Break a circuit and see why it failed, with the numbers" | "Validated", "accurate", "works on a real bench" (needs the bench programme, D-007) |
| "Free, no account, runs in your browser" | "Priced live" (CONTRADICTED; FV section 7) |
| "A teaching model: here is what it models" (tier label) | "Verified on-chain proof of build" (the log is forgeable; CONTRADICTED) |
| "Six languages" | "Seamless multilingual collaboration" (rooms untested cross-device; social layer off at relaunch) |
| "Robotics and drone labs" as content | "Design and predict your drone" (calculator constants from a third-party site, no hardware data) |

## Change log

- 2026-10-27: written after the strategy step. Replaces the positioning draft a gap fixer wrote before the council ran.
