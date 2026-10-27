# Startup strategy

Written 2026-10-27 by the orchestrating agent. It turns the decisions in `00_EXECUTIVE/DECISION_REGISTER.md` into a
sequence with gates, costs and stop rules. Positioning is in `POSITIONING.md`. Pricing, unit economics, growth,
partnerships and financial scenarios get their own files in step 7; this file sets the frame they work inside.

Evidence labels follow the brief. No user has been interviewed, so demand statements are HYPOTHESIS. Engineering costs
are ESTIMATED by the council and the strategy advocates and have not been checked by a spike yet.

## 1. Where iynk stands

- **A strong hackathon demo, not a product.** iynk is a guided viewer of 38 catalogue items (12 boards, 13 robotics
  benches, 13 drones). A learner cannot start a blank project, add a part, move a wire, save, export or share. Edited code
  is lost on reload (VERIFIED, `01_AUDIT/FEATURE_VERIFICATION.md`, `runs/BROWSER_WALK.md`).
- **One tested edge.** It explains why a wiring mistake breaks things, with the burnt part, the arithmetic and a Repair
  button. Wokwi and Falstad showed no warning text for the same three faults; Velxio warns before a run; Tinkercad is
  untested (TESTED, `02_RESEARCH/WORKFLOW_BENCHMARK.md`).
- **Not safe to relaunch as is.** No authentication on 23 of 23 routes, paid calls open to anyone, room host takeover and
  room exhaustion reproduced, a public list of strangers' buddy profiles (VERIFIED, `01_AUDIT/SECURITY_BASELINE.md`).
  Eight public claims are contradicted (FEATURE_VERIFICATION section 7).
- **No licence and unresolved content provenance.** The repo has no LICENSE, and the About page says lessons, timings and
  formulas were reused from three third-party sites (VERIFIED).
- **A small market for simulator seats.** About USD 7.4M a year serviceable in the US, India and EU, about USD 0.30M a
  year realistic capture in three years (ESTIMATED, `02_RESEARCH/MARKET_ANALYSIS.md` section 6).
- **One person wrote almost all of it.** 781 of 797 commits at the audited state; no CI (VERIFIED,
  `01_AUDIT/REPOSITORY_INVENTORY.md`).

## 2. The thesis

Hardware is hard to learn because when something does not work, a beginner cannot see why, and the parts, instruments and
lab time needed to find out cost money most learners do not have. iynk's bet is that a free browser lab that makes
failure visible and explainable lets more people practise the part of hardware that actually stops them: finding the
fault. Start where that job recurs every term and someone already pays for practice (introductory college courses).
Prove it changes what students can do. Then open the same engine to circuits learners design themselves (Studio), which is
the founders' long-term vision.

What would prove the thesis wrong, cheaply: Tinkercad or Velxio already explain cause and fix (E0, one day); lecturers do
not rank debugging as a top pain (E1); simulated symptoms disagree with a real board (E4); students in the pilot do not
finish the exercises (pilot).

## 3. The sequence

Week 0 is Monday 2 November 2026, the start date in `02_RESEARCH/USER_RESEARCH_PLAN.md`.

**Amended 2026-10-27 (D-002, D-012).** Amar decided to build Studio straight after Fault Lab, with agents doing the build in
phases. The table below is the evidence-first sequence the council recommended. In the build that follows, the Studio
go / no-go keeps only its technical part (the spikes pick the technology), and the human evidence (E0, interviews, the
real-board check, the pilot) runs after the build as validation. The stop and convert rules in section 7 still apply when
that evidence arrives.

| Stage | Weeks (calendar) | What happens | Exit gate |
|---|---|---|---|
| Phase 0: trust and evidence | 0 to 3 (2 to 22 Nov 2026) | Step 0 starts (D-005): security blockers, close or cap paid routes with a spend ledger and kill switch, telemetry off by default, CI, LICENSE, honest copy, counsel brief on provenance and minors. Evidence sprint, no feature code: E0 Tinkercad and Velxio hand test; E1 lecturer and TA conversations (10); read-only telemetry pull; syllabus fit on 10 real syllabi; priced waitlist with no payment taken | **Gate 0 (end of week 3):** E0 does not kill C; at least 4 of the first 10 lecturers name debugging or lost lab time as a top-3 pain; counsel engaged |
| Phase 1: Fault Lab v0 | 2 to 12 (16 Nov 2026 to 24 Jan 2027) | Finish Step 0. Build diagnose-first Break it on the Uno R3 catalogue: hidden trigger, diagnosis picker, logged three-step hint ladder, fix, transfer question; 40 reviewed items; a pass needs one real edit and one answer; autosave, fork, unlisted share link, export (.ino, wiring table, project file); tier label and "What it models" panel; class code with pseudonyms and a lecturer CSV with the most common wrong diagnosis. Define the shared diagnosis record (D-010). E2 diagnose-first prototype test with 10 adults. E4 real-board check of 10 faults. Mission test with 8 to 10 learners in a low-resource setting (D-011) | **Gate 1 (week 10 to 12):** E4 passes 9 of 10; E2 shows 7 of 10 diagnose half the faults without the largest hint; one lecturer has a course and a start date |
| Studio gate (in parallel) | 4 to 12 | RS-01 editor rendering, RS-08 solver against ngspice, 50 public beginner sketches through the interpreter; head-to-head against Velxio and Wokwi; interviews on original-project demand | **Studio go / no-go (week 12):** all three spikes pass and interviews show demand. If RS-01 fails on low-end devices, decide desktop-first explicitly |
| Pilot | One term (US spring term, about mid-January to May 2027) | One lecturer, one course, 25 or more students. Fault Lab v0 free. Weekly check-ins; usage and misdiagnosis data; physical-transfer pilot with 8 to 10 adults (E7) | **Gate 2 (end of term, about May 2027):** 60 percent finish 5 or more exercises; the lecturer commits in writing for next term; at least 2 of 5 pilots ask for a quote or letter of intent |
| Phase 2: Studio build | From week 12 if go | Studio core (project document, netlist, orchestrator), Uno-only builder, generic fault rules emitting the same diagnosis record; zero false alarms on the 79 catalogue circuits and at least 18 of 20 broken ones caught before any rule ships | Studio beta: 6 of 8 unassisted learners go from blank to wired, saved and shared in under 10 minutes |
| Year one review | About week 52 (November 2027) | Count courses, institutions, retention, outcome study status | **Gate 3:** at least 3 courses in a second term and at least 3 institutions saying in writing they would pay. If not, convert to an open, grant-funded project and say so |

**Calendar risk.** If v0 is not ready by mid-January 2027, the US spring pilot slips to a summer course or to fall 2027.
That is the most likely slip; plan the lecturer conversations so a summer course is lined up as a fallback. Indian term
dates are UNKNOWN and need checking in E1.

## 4. Cost to each gate

All ESTIMATED; assumptions are in the cited files.

| Item | Cost | Source |
|---|---|---|
| Step 0 plus Fault Lab v0, to Gate 1 | 17 to 22 engineer-weeks, 8 to 12 calendar weeks for 2 to 3 people | `strategy-options/judge-engineer.md` |
| Fault Lab phase 1 alone | 11 / 17.5 / 29 engineer-weeks (best / expected / adverse) | `strategy-options/C-fault-lab.md` |
| Studio core and Uno builder, after the go | 35 to 43 engineer-weeks expected (CTO minimum builder 22 / 37 / 61; strategy A 27 / 43 / 72) | `council/cto-platform.md`, `strategy-options/A-creator-builder.md` |
| Counsel for the adult relaunch and provenance | USD 4.5k to 15k | `council/security-privacy.md` |
| Counsel and audits for a school tier (not before wave 3) | USD 17k to 65k more | same |
| Real-board check of 10 faults | under USD 300 | `strategy-options/C-fault-lab.md` |
| Bench validation programme (before ever saying "validated") | USD 2.5k to 5k and 6 to 8 person-weeks | `council/fidelity.md` |
| User research (recruiting, incentives, tools) | USD 6,040 to 21,780 | `02_RESEARCH/USER_RESEARCH_PLAN.md` |
| Infrastructure for a free core | About USD 60 to 85 a month at 1k weekly actives; USD 180 to 430 at 10k, with tiered AI routing | `council/business-growth.md` |

Not counted: founders' time, which is the main cost. Founder time for sales, support and grants is HYPOTHESIS at 30 to 50
percent of the week (`strategy-options/B-classroom.md`).

## 5. Money

**Months 0 to 18: bootstrap plus grants plus sponsored seats** (D-003). The CEO memo's recommended capital plan is a
hybrid: bootstrap for the first three months while the evidence sprint and Step 0 run, then grant applications in
parallel with the pilot, then revisit equity only when the gates below are measured (`council/ceo-investor.md` section 10).

| Source | What it needs | Status |
|---|---|---|
| Founders (bootstrap) | Both founders keep other income for 12 months; AI off or tightly capped | Founder decision |
| NSF SBIR | A US small business, a Project Pitch and an invitation | Eligibility UNKNOWN |
| Erasmus+ small-scale partnerships (EUR 30k or 60k) | Two organisations from two eligible countries | Partner UNKNOWN |
| India CSR (education was about Rs 1,104 crore of about Rs 17,967 crore in FY2023-24, EXTERNAL) | A company sponsor and an Indian implementing partner | Not approached |
| Foundations | Not searched | UNKNOWN |
| Course revenue (strategy C) | EUR 5 to 8 per student per semester, or USD 250 to 400 per course per term, first course free | Price is HYPOTHESIS; tested by the priced waitlist and pilot quotes |

What revenue can and cannot do: at the base case the college lines cap at about USD 149k a year, which pays for about one
person (ESTIMATED, `strategy-options/C-fault-lab.md`). Classroom revenue alone will not pay a three-person team plus
compliance. Grants and sponsors are part of the model from the start, not a bridge.

**When to consider venture money.** Only when the CEO memo's gates mostly pass: G1 retention (weekly return above 20
percent, growing for 8 weeks without paid acquisition), G2 willingness to pay (two purchase orders from 5 pilots), G3 a
measured learning outcome, G4 a named wedge with 10 reachable buyers and one signed pilot, G5 a scale path to USD 1M a
year, G6 trust (release blockers closed, LICENSE and provenance settled, audience decision written), G7 a second builder
with real hours. Raising before G1 and G6 would value a demo and expose the safety and honesty gaps.

## 6. How it dies, and what prevents it

| Way it dies (`council/ceo-investor.md` section 9) | Early signal | Prevention in this plan |
|---|---|---|
| It never becomes a place people return to; Wokwi, Velxio and Tinkercad own "make my project" | Weekly return under the bar; lecturers say "we use Tinkercad" | Measure return first (telemetry pull); give learners saved and shared work in phase 1; Studio gate decides the builder on evidence |
| A trust failure ends the school and funder route (open paid endpoint abused, child-safety incident, contradicted claims found, a rights holder objects) | Provider 429s or bills, a complaint, a legal letter | Step 0 before any outreach (D-005); 13+ terms and the social layer off (D-004, D-006); honest copy (POSITIONING section 6) |
| Breadth outruns two people and the money does not arrive | Maintenance above half of founder hours; tests failing; content drifting from code | One product (Fault Lab on Uno R3) and a freeze list (D-006); CI; grants from month 0; an open repo to bring in contributors |
| Honorable mention: AI cost blow-up | Spend per session rising | No new AI features until the meter, cap and kill switch exist; Fault Lab v0 has no AI |

## 7. Stop and convert rules

The plan turns iynk into an open, grant-funded project (and says so publicly) if any of these happen:
- Gate 0: E0 shows Tinkercad or Velxio already explains cause and fix with a visual and offers classes, and no
  repositioning survives a second look.
- Gate 0 or later: fewer than 2 of 10 lecturers name debugging or lost lab time as a top-3 pain, or 15 are asked and none
  agrees to a pilot within 6 months.
- Gate 1: 2 or more of 10 real-board checks contradict the simulated symptom and fixing it needs an engine rewrite (pause
  instructional claims first).
- Gate 3: after 12 months, fewer than 3 courses use it in a second term and fewer than 3 institutions say in writing they
  would pay.
- Any time: a rights holder objects and the licence question cannot be resolved; or fewer than 2 people can ship weekly
  for two consecutive months.

Converting is not failure of the mission. An open, grant-funded iynk with a fault corpus and an honest teaching model can
still reach the learners the founders care about.

## 8. Team

The plan assumes 2 to 3 people at about 70 percent focus. That is the single biggest assumption behind every calendar
estimate. Today one person wrote 781 of 797 commits, so the first team task is a written 12-month commitment on hours
and runway from each founder (open founder decision in DECISION_REGISTER). Roles the sequence needs by Gate 1: one
engineer on Step 0 and v0, one person on lecturer conversations, counsel and the pilot, and an electrical engineer
reviewer for the 40 fault items (contract, about 2 hours per item if E3 passes).

## 9. What this strategy does not do

- It does not build Studio first. Amar confirmed Fault Lab first, with Studio straight after (D-002).
- It does not market to schools or children in the first year (D-004).
- It does not extend drones, robotics, Solana, the marketplace, languages or AI (D-006).
- It does not claim learning gains or bench accuracy before the evidence exists (POSITIONING section 6).

## Change log

- 2026-10-27: first version, after the strategy step (`wf_1b6e2ee6-315`).
- 2026-10-27: amended for D-002 (Studio straight after Fault Lab) and D-012 (agents build the product; pricing, unit
  economics, growth, partnerships and financial scenario files dropped).
