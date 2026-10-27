# Strategy A: creator-builder

Advocate paper for the independent council. Date: 2026-10-27. All paths below are under `docs/MASTER_PLAN/` unless they start with `src/` or `figures/`.

Labels: VERIFIED (the audit inspected or reproduced it), DOCUMENTED (a project document says so), EXTERNAL (a research file and its [S#] say so), ESTIMATED (assumptions shown), HYPOTHESIS (a test is named), UNKNOWN. No interviews, usage data or revenue exist for iynk. I invent none. Percent figures in the experiments are thresholds I propose, not predictions.

## 0. The case in one page

**Thesis.** Every free browser tool that lets a person make their own hardware project either costs money to keep it private (Wokwi), is limited to a few boards and parts (Tinkercad), or is a new open project with a classroom plan and an AI agent (Velxio). None of them reliably tells a learner why their own wiring failed. iynk's one measured edge is that explanation, and today it only works on 38 catalogue items. Strategy A turns that edge into a studio where the learner brings their own idea: wire a supported board and parts, write code, run it, break it on purpose, get a plain-words diagnosis and grounded help, then export a real build. Lessons become templates inside the studio.

**Why it might work.** The project is the unit people return to, share and show others. A save-able, shareable project is also the only way "weekly creators" can be a real number (business-growth.md). Share links are Wokwi's growth loop today (ecosystems.md S21).

**Why it might not.** It is the most expensive option, the demand for original projects is only indirectly evidenced, the paying segments are small, and the one differentiator must survive on circuits iynk's authors never saw. Section 12 lists where it is weak. I think a fair judge should rank A as the highest-variance of the three strategies, not the safest.

**What I ask the council to approve.** Not the full build. Approve a gated programme: 2 to 3 weeks of cheap evidence and spikes (section 11), then a 27 to 72 engineer-week first milestone (section 8) only if the gates pass.

## 1. Target customer

| Item | Choice | Label |
|---|---|---|
| Primary user | Self-directed learners and makers aged 13 and over, with an idea of their own: university engineering and CS-embedded students (segments 2, 3), self-taught makers (segment 4), hackathon builders (segment 7), and the more independent high-school students (segment 1) | HYPOTHESIS (USER_SEGMENTS.md rates these 24, 24, 18, 20 of 35; evidence strength 3 or below for every one; no interview done) |
| Why not younger | Terms say 13+. Security council: no direct-to-under-13 service in the horizon (security-privacy.md). Gemini fallback is barred for under-18 clients (ai.md) | DOCUMENTED |
| Beachhead inside it | University first-year to second-year electronics and embedded students whose course asks for a small project, and the maker clubs and hackathons they attend. One sentence test: "a student with a half-formed project and no kit on the table tonight" | HYPOTHESIS |
| Not the target | Novices with no idea who need a path (the learning council's concern), teachers as the first customer (strategy for another advocate), FPV and robotics (frozen, robotics-aero.md) | n/a |

Why this beachhead and not a school one: university students choose their own tools more than K-12 pupils do, a course project forces an original circuit, and the same students bring friends. UNKNOWN: how many pick a tool themselves. Test in E1.

## 2. Who does what

| Role | Who | Why they matter | Label |
|---|---|---|---|
| User of the free product | The student or hobbyist above. No account. Works on a laptop or Chromebook | They create and share the projects | HYPOTHESIS |
| Who benefits financially | (a) The learner, who avoids spending on parts they might burn: Elegoo Uno kits list at USD 60 to 96 (USER_SEGMENTS.md [S32]); (b) the lecturer, who gets lab work done at home without kit loss; (c) later, parts vendors, only through sponsored boards or contests, which conflicts with a no-ranking promise (business-growth.md) | EXTERNAL for (a), HYPOTHESIS for (b) and (c) |
| Who pays | Nobody in the first milestone. Months 0 to 18: founders, grants, sponsors. Later: a department or lecturer buying a classroom licence, and heavy users of metered AI | ESTIMATED, section 7 |
| Who influences adoption | University lecturers and lab technicians who put a link in a project brief; YouTube electronics educators who show a tool on screen; hackathon organisers (MLH: 150,000+ hackers, 184 events, hardware share UNKNOWN, USER_SEGMENTS.md [S26]); r/arduino moderators (about 789K members, third-party tracker [S17]) | HYPOTHESIS. No data on any YouTube channel was gathered in the research; that is a gap |
| Organic distributor | The shared project link itself. Each link opens a runnable circuit with a "fork and edit" button. People put it in GitHub READMEs, forum posts, Hackster write-ups and video descriptions. Wokwi's links work this way (ecosystems.md S21, S23) | EXTERNAL for Wokwi, HYPOTHESIS that iynk links will spread |

Honest note: the research found no evidence that a YouTube educator would pick iynk over Wokwi. Distribution is a bet on the explained-fault moment being worth showing on camera. E7 tests it cheaply.

## 3. The job to be done, and why existing tools fail it

**Job.** "I have an idea for something with a microcontroller and a few parts. I want to see whether my wiring and code can work, find out why it does not, and leave with something I can build or hand in. I do not want to buy parts, make an account or pay to keep my work private."

| Tool | What it does well | Where it fails this job | Evidence |
|---|---|---|---|
| Wokwi | 18 MCU variants, real firmware, VS Code, CI, share links. Opens with no login (TESTED) | Free projects are public; unlisted needs EUR 5.6 per month; custom libraries are paid. In the scripted fault test the page showed no message for LED without resistor, reversed LED or 5 V to GND (TESTED, one run). Analog called hopeless by one forum user (anecdote). Mouse wiring takes ESTIMATED 5 to 10 minutes | competitors/embedded-sim.md; WORKFLOW_BENCHMARK.md 4.1; COMPETITOR_LANDSCAPE.md |
| Tinkercad Circuits | Free, huge installed base, class codes, shows a destroyed LED (second-hand) | Only Uno, ATtiny, micro:bit; no custom libraries; limited part set; "100 million users" is vendor-stated and unconfirmed. Not run in the benchmark | competitors/embedded-sim.md S28, S31; USER_SEGMENTS.md [S9] |
| MakeCode | Free, big in schools (micro:bit) | No wires, one device, JavaScript stand-in simulator so code that works in the simulator can fail on the board | competitors/education.md S13 |
| Arduino Cloud | Real compile and upload, School plan USD 20 per member per year | No simulator. Owned by Qualcomm since Oct 2025; late-2025 terms (perpetual licence on uploads) drew public criticism | competitors/embedded-sim.md S9, S44 |
| Velxio | Open (AGPL), free tier without account (TESTED), QEMU ESP32, ngspice, AI agent, MCP, BOM, Classroom from USD 34 per student per year | Closest rival. In my own tested row it warned before run on all three faults but showed no burn visual or fix. Share links and saving not confirmed. Fast-moving, AI-built | WORKFLOW_BENCHMARK.md 4.5; COMPETITOR_LANDSCAPE.md line 226 |
| iynk today | Named fault, burnt LED, the arithmetic and a Repair button (TESTED, one run) | Only on 38 catalogue items. No blank project, no custom part, no save, no share, no export. Edited code is lost on reload (all VERIFIED, FEATURE_VERIFICATION.md section 6; BROWSER_WALK.md steps 14, 15) | |

The gap Strategy A fills is the intersection: own project, no account, private by default, explained faults, export. Nobody in the tested set covers all five (HYPOTHESIS; Tinkercad, Cirkit and Arduino were not run).

## 4. Unique value: hard to copy versus merely convenient

| Element | Hard to copy or convenient | Reasoning |
|---|---|---|
| A rule library that turns any wired circuit into a plain-words fault ("this LED has no resistor: 5 V over 1.7 V forward leaves 3.3 V, about 165 mA through a 20 mA part") with a burnt-part visual and a one-click repair | Hard, but only after it exists and is proven | It needs a netlist independent of the drawing (cto-platform.md section 3). The effort is real (package C, 2 to 7 engineer-weeks), and the proof is a test corpus: zero false alarms on 79 catalogue circuits and at least 18 of 20 deliberately broken ones caught. A rival can copy the idea in weeks (Velxio already warns); the tested corpus and the wording quality take longer. HYPOTHESIS |
| Deterministic replay of any project run | Moderately hard | The flight sim has it (96 tests) and the interpreters are deterministic; extended to a user's project it enables "send me the exact failing run". Cross-browser determinism untested (cto-platform.md R12) |
| A grounded Partner that reads the project and proposes revision-safe operations | Hard to do safely, easy to demo | Needs the project file first (ai.md step 6). Velxio already ships an agent and MCP, so the feature alone is not a moat. The moat would be an evaluation set of 40 to 60 cases for safety and invented-pin traps (ai.md step 4) |
| No account, private by default, plain export, written content-ownership promise | Convenient and easy to match | Wokwi can ship unlisted for free the day it wants. It earns money from that paywall, so it is slow to give it up (HYPOTHESIS). Valuable as a trust position after the Arduino terms row |
| Six UI languages | Convenient, unproven as a driver | Learning council: freeze at six; native review not done (product-learning.md) |
| 38 catalogue items as templates | Convenient | Content that took 24 hours of agent-assisted work to build; copyable by anyone with the same tools |

Plain statement: the whole of A's differentiation is the first row, and it is unproven on user-made circuits. If it fails, A has no edge over Velxio and Wokwi.

## 5. First milestone: "Uno Studio"

**Smallest product that proves the thesis.** A learner opens iynk with no account, starts a blank Arduino Uno project, and in under ten minutes has a circuit they wired, code they wrote, a run, a deliberate break, a diagnosis, a saved project and a file they can take to a real bench.

In scope (what a user can do):

1. Start blank, or start from one of about ten existing Uno lessons as a template (Blink, button, pot, etc.; exact list fixed after the interpreter-coverage test E2).
2. Place parts from a fixed palette of up to 12 of the 29 existing parts that the Uno lessons already use. Parts are data, not new code (package E).
3. Wire pin to pin with mouse, touch or keyboard. Wires follow connectivity, not breadboard hole names.
4. Edit code in the Arduino C++ subset. Unsupported constructs give a clear line-level error with the real reason, including unknown `#include` (fixes two of the learning council's "teaches wrong lessons" items).
5. Run, with serial output and part states, in the existing interpreter. Memory and output caps on.
6. Generic fault rules in plain words for about eight common mistakes (LED without resistor, reversed LED, 5 V to GND, floating input, code pin not matching the wire, two outputs on one net, part not powered, button without pull-up). The list is fixed from E5, not from imagination.
7. "Break it" on the learner's own circuit: pick a fault to inject, then diagnose.
8. Save with autosave to the browser, backed by an anonymous signed session; fork; unlisted read-only share link that opens a runnable copy.
9. Export: project JSON (versioned, text, diff-able), `.ino` file, wiring table and BOM as CSV without prices.
10. A "What it models" panel and a tier label on every project ("teaching model, not a bench test"), per fidelity.md.
11. Partner, read-only, grounded in the project (explain this fault, why does this pin read 0), with daily and global dollar caps and a kill switch. No write operations in this milestone.
12. English strings for the builder. The shell stays in six languages; builder strings in the other five are marked "not yet translated" (no machine translation shipped as truth).

Out of scope (each has a trigger in the council memos):

Other boards, ESP32, RP2040 firmware, Python, Verilog projects; analog transient (C, L); real compile to hex, flashing; custom parts or a part SDK; accounts, teacher view, rosters; public gallery, search, comments; rooms on user projects; drones, robotics, flight; Solana, credentials, leaderboards; AI image or voice; payments; LMS; native apps; marketplace.

Why one board: the Uno has 16 lessons, the most-tested path (BROWSER_WALK.md step 2), and avr8js is a later upgrade option (RS-03), not a requirement. A second board doubles the fault-rule and test work.

What this milestone deliberately does not do: prove learning outcomes (nothing here measures them; the learning council is right on that), prove classroom value, or prove willingness to pay.

## 6. How rivals would respond

| Rival | Likely response | Speed | Label |
|---|---|---|---|
| Velxio | Already warns before run on all three faults (TESTED). Could add burn visuals and explanations quickly; it is open, AI-built and shipping fast; AGPL means anyone can read its approach and it can read mine only if I publish under a compatible licence. It also has a classroom plan at USD 34 per student per year | Weeks to a few months | HYPOTHESIS |
| Wokwi | Owns real firmware and the share link habit. Fault explanation is not on its public roadmap that I found (UNKNOWN). Could make a free-tier unlisted option or add warnings; it earns from private projects, so giving that away is costly | Months; free-tier privacy change unlikely | HYPOTHESIS |
| Tinkercad (Autodesk) | Corporate pace; its strength is installed base and class management. It could add AI help and more boards; it already shows failed parts. Unlikely to chase no-account, export-first | Quarters to years | HYPOTHESIS |
| MakeCode | Not wiring-based; no direct response | n/a | HYPOTHESIS |
| Arduino (Qualcomm) | Cloud Editor plus School plan; it has AI Assistant (30 interactions a month on free). A bundled simulator or a Velxio-style acquisition is plausible. Trust problem from the 2025 terms limits how fast it can pose as the open choice | Months to a year | HYPOTHESIS |

The honest summary: against Velxio the lead is measured in weeks, not years. A survives only if the quality of explanation, the no-account privacy position and the distribution loop beat a faster-shipping open rival. That is why E5 includes a head-to-head with Velxio and Wokwi.

## 7. Monetisation path and pricing hypotheses

Principle from business-growth.md that I adopt: never gate running, editing, saving or sharing for a learner. Money comes from institutions and metered costs, and months 0 to 18 are funded by grants, sponsors and the founders.

| Stage | What is sold | To whom | Price hypothesis | Comparable | Label |
|---|---|---|---|---|---|
| 0 to 18 months | Nothing. Grants, sponsored seats, the founders | Funders | n/a | Grant list in MARKET_ANALYSIS.md section 9 | |
| After M1 evidence | Class mode: join-code roster, progress export, privacy contract. No student emails | Lecturer or department | USD 12 to 20 per student per year (K-12 style) or USD 8 to 15 per student per semester (university) | Arduino School USD 20 per member per year; Velxio Classroom USD 34 per student per year; LabsLand from EUR 7.99 to 19.99 per student per semester; Wokwi Classroom EUR 30 per student per semester (MARKET_ANALYSIS.md section 3) | ESTIMATED; assumes undercut of Wokwi and Velxio. Price is not evidence of demand: test T1, T6 |
| After 5,000 weekly actives | Higher AI quota, bigger storage, private-share links for adults, priority compile if it exists | Power users | USD 36 to 48 per year | Wokwi Hobby EUR 5.6 per month annual; Arduino Maker USD 72 per year; MARKET_ANALYSIS.md section 7 (base funnel USD 62k a year at 50,000 monthly actives and 2.6 percent conversion, invented scenario) | HYPOTHESIS; trigger from business-growth.md: T6 click-through at least 2 percent |
| Optional | Vendor-sponsored board support or contests | Parts makers | Not priced | Hackster contests (ecosystems.md S8) | Conflicts with honest part ranking; only with a written no-ranking clause |

Size: ESTIMATED base SAM for institutional simulator seats is USD 7.4M across US, India and EU; three-year capture about USD 0.30M a year, high case USD 2.4M (MARKET_ANALYSIS.md section 6.3). Individual subscriptions add at most low tens of thousands to a few hundred thousand USD in the invented funnel. This is not venture-scale on its own. Strategy A is a mission organisation with a revenue line unless the wider-market argument (original-project makers worldwide, beyond the three regions sized) is shown with data (UNKNOWN: rest of world not sized).

Cost of the free side: ESTIMATED USD 0.2 to 1.5 of infrastructure per weekly active per year (about USD 60 to 85 a month at 1,000 actives, 180 to 430 at 10,000; business-growth.md). Simulation runs in the browser; the AI is the variable cost. A routed small model is about USD 0.008 per 12-question session; a flagship about USD 0.27 (ai.md, ESTIMATED, 35 times apart). Free AI needs caps.

## 8. Engineering cost (ESTIMATED)

Unit: engineer-weeks of focused work by a competent engineer new to the repo, including a 2-week ramp each. None of these numbers has been validated by a spike. Source: cto-platform.md section 7.3 (22 / 37 / 61 for the minimum builder), adjusted below.

| Block | Best | Expected | Adverse | Notes |
|---|---|---|---|---|
| CTO minimum builder, packages A to I | 22 | 37 | 61 | Gates, project document, netlist and fault rules, pure solver, parts as data, editor, orchestrator, persistence, hardening |
| Less: builder strings only in English for M1; ngspice golden set cut to the 20-circuit spike, not CI | -2 | -3 | -4 | My trim |
| Add: export (project JSON already in B; `.ino`, wiring table, BOM CSV) | 1 | 1.5 | 3 | My estimate |
| Add: AI meter, kill switch, session caps, provider adapter, 40 to 60 case eval set, injection fixes, read-only project-grounded Partner | 3 | 4 | 6 | ai.md steps 1 to 6; CTO package A already counts the limiter and ledger, so I count only the rest |
| Add: security blockers for an adult relaunch (buddy list off, telemetry default off, relay authority limited to what M1 needs, headers, terms and privacy page) | 3 | 4 | 6 | security-privacy.md says 4 to 7 weeks for the whole adult relaunch; I count the part not in package A. Legal cost is separate: USD 4.5k to 15k (security-privacy.md, lawyer rate an assumption) |
| **Total** | **27** | **43** | **72** | |

Calendar for 2 to 3 people (ESTIMATED; 70 to 80 percent of time on this work): best about 11 weeks, expected about 24 weeks (about 5.5 months), adverse about 50 weeks. Assumptions that define the cases:

- Best: RS-01 and RS-08 pass first time; 80 percent or more of public beginner sketches run unmodified; no legal stop; no one leaves.
- Expected: one spike fails and costs rework in the editor or solver.
- Adverse: the editor misses the phone and Chromebook budget and needs a Canvas hybrid (CTO R2: 4 to 6 extra weeks), the solver needs transient for common projects, interpreter coverage is poor and a compile plus avr8js path is pulled in (2 to 3 weeks for a sandboxed compile service plus an arduino-cli licence answer, not in the numbers above).

Not included: counsel time, native-speaker review, accessibility audit beyond the WCAG drag and target-size cases, moderation for any public content, a teacher view, server-side replay, and the first 2 to 3 weeks of evidence work in section 11.

## 9. What it reuses and what it replaces

Verdicts from cto-platform.md section 3 and TECHNICAL_DEBT.md.

| Reuse as is | Replace or build new |
|---|---|
| Arduino C++ interpreter and its 189 tests (about 8,800 lines across the three interpreters); wrap with a device registry (VERIFIED) | Circuit solver `figures/engine/bench-solve.js`: DC only, 12 element types, reads breadboard hole names; replace with a pure data-driven solver; freeze the old one for catalogue figures (VERIFIED) |
| Generic `Check`, `WorldModel`, `CodeTemplate`, `FailureMode`, `BuildStep` types (move to a neutral core) | Closed content id unions and generated registry for user content (keep for catalogue) |
| Figure bridge protocol `{source:'iynk', v:1}` and the 29 parts' art as a visual library | Figure engine as a canvas: the 80 pages stay as catalogue only; `art.innerHTML` per frame costs 48 to 65 percent of a core |
| The 38 catalogue items and 79 circuits as the converted corpus and regression test set | A project document, a netlist derived from connectivity, an orchestrator (new headless core, cto-platform.md) |
| Zod-on-every-route server pattern and token-hash ownership | Rate limiter, AI budget, search counter: per-instance maps replaced by a shared store and ledger (B6-01) |
| Relay core (payload-agnostic) | Relay authority, only needed when rooms are reopened on projects (out of M1) |
| i18n scaffolding and the six-language shell | AI bench context: it guesses key names and cannot see a user's circuit (B6-05) |
| Break it content as the seed for the fault-rule corpus | Persistence: nothing exists beyond `iynk:v1` in `localStorage` |

Parked, not deleted: flight sim, drone calculator, robotics benches, Solana (all frozen in the council memos).

## 10. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | Demand for original projects is only indirectly evidenced (USER_SEGMENTS.md point 4, HYPOTHESIS). The builder is the biggest build on the list | High | E1 and E7 before committing; scope M1 to one board |
| 2 | Differentiator fails on user-made circuits (false alarms or misses). One wrong confident diagnosis costs trust | High | E5 corpus gate; refuse with "not modelled yet" rather than guess |
| 3 | Interpreter subset rejects too many real sketches (share UNKNOWN). Learners paste tutorial code | High | E2; second track (compile plus avr8js) costs more and conflicts with low-bandwidth users (fidelity.md) |
| 4 | Editor misses phone or Chromebook budget, which hits exactly the users the mission names | High | E3 spike first; choose desktop-first openly if it fails |
| 5 | Velxio or Wokwi close the gap in weeks | High | Track both monthly; the E5 head-to-head repeats before M2 |
| 6 | Fidelity: learner trusts a "works" result and a real build fails or damages parts (LiPo, inductive loads, 3.3 V pins) | High | Tier label, "What it models" panel, no "safe to build" claim, no power-source projects beyond USB or battery packs in the palette |
| 7 | User-generated content and minors: no moderation, report or block exists | High | Unlisted links, private by default, no gallery or comments, 13+ terms, written audience decision |
| 8 | AI cost abuse (about USD 120 per hour per warm instance, ESTIMATED, VERIFIED exposure) | High | Meter and kill switch before any new AI feature |
| 9 | Provenance: no LICENSE; lesson structure, timings and drone constants came from three third-party sites (security-privacy.md). The builder uses the Uno lessons, not the drone constants, but the lesson-structure question still applies | Medium to high | Founder and counsel decision before any commercial step; M1 templates are rewritten if needed |
| 10 | Maker use is episodic; retention may be low | Medium | E7 measures it; kill criteria |
| 11 | Scope creep into Wokwi plus Tinkercad plus Proteus (CTO's largest schedule risk) | High | Fixed M1 scope; every addition needs a trigger |
| 12 | Learning claim: building without guidance is the wrong condition for novices (product-learning.md citing Kirschner, Sweller, Clark) | Medium | Target is self-directed learners; templates first; no outcome claim; run the learning council's pre/post test (M7) on the studio before any such claim |
| 13 | Bus factor of one on agent-built code, single-maintainer avr8js and rp2040js | Medium | CI first; keep the interpreter as default |
| 14 | Chromium-only evidence; WebKit pass done only on macOS builds, Firefox not tested | Medium | Cross-browser run before launch |

## 11. Evidence required before committing

Run in this order. Costs are time, not money, unless stated. Thresholds are proposed by me; the CEO and learning memos have their own T and Q tests that I reuse where noted.

| # | Experiment | Method | Pass | Fail | Time |
|---|---|---|---|---|---|
| E0 | Existing demand signal | Read-only pull of existing telemetry: weekly active browsers, return rate, sessions with more than one lesson (ceo-investor.md step 0, T5) | Return rate within 14 days of 15 percent or more among browsers with 2+ sessions | Under 5 percent | 1 day |
| E1 | Do makers start from their own idea, and did tools block them? | 12 task interviews with self-directed learners recruited from r/arduino, two university clubs, one hackathon. Ask for their last own project and show iynk Blink then a blank request | At least 6 of 12 describe an own project in the last 90 days, and at least 4 name a block in Wokwi, Tinkercad or Velxio that iynk Studio would remove (save, privacy, board, explanation) | Fewer than 3 of 12 | 2 weeks |
| E2 | Interpreter coverage | Run `runHeadless` on 50 public beginner Arduino sketches (not iynk lessons) | At least 40 of 50 run without a rejected construct | More than 20 of 50 fail (CTO second-track threshold) | 3 days |
| E3 | RS-01 editor budget | 500 parts and 1,000 wires with real art on a 3-year-old mid-range Android phone and a school-grade Chromebook | p95 frame time under 20 ms on both | p95 over 33 ms on either, desktop-first decision forced | 1 week |
| E4 | RS-08 solver | In-house DC solver against ngspice on 20 reference circuits | Within 2 percent on 18 of 20, failures explained | More than 5 disagree | 1 week |
| E5 | Fault rules and head-to-head | (a) Run the rule set on the 79 catalogue circuits and on 20 deliberately broken ones. (b) 10 learners (5 novices, 5 makers) get 3 broken own-style circuits in iynk Studio prototype, Velxio, Wokwi; measure time to correct diagnosis, order randomised | (a) zero false alarms on 79 and at least 18 of 20 caught. (b) Median time to diagnosis in iynk at least 30 percent below the best rival, and at least 7 of 10 prefer iynk's explanation | (a) any false alarm on the 79, or fewer than 15 of 20 caught. (b) No difference from Velxio | 3 weeks, after E2 to E4 |
| E6 | First-session task | 8 unassisted learners, one hour each, start blank, make Uno plus LED plus button, save, share | At least 6 of 8 finish in under 10 minutes without help; the 2 who fail name causes we can fix | Fewer than 4 of 8 finish | 1 week, on the prototype |
| E7 | Share-loop and return | After the first public release with 200 or more projects saved: share-link opens per link, run rate, fork rate, 14-day return of savers | Mean 2 or more distinct browsers per shared link; at least 10 percent of openers run it; at least 3 percent fork; at least 25 percent of savers return within 14 days | Mean under 1.2 openers; return under 10 percent | 6 to 8 weeks live |
| E8 | AI unit cost | 100 real sessions with the Partner on a routed small model with caching | Median under USD 0.01 per session; p95 under USD 0.05 | Median over USD 0.05 | 2 weeks |
| E9 | Export honesty | 20 exported `.ino` files compiled locally with arduino-cli (test only; the server licence question RS-17 is separate) | At least 18 of 20 compile unchanged | Fewer than 15 of 20 | 2 days |
| E10 | Institutional willingness (for the later revenue line) | 10 lecturer conversations; priced waitlist, no payment (ceo-investor.md T1, T3, T6) | At least 3 of 10 would pilot in a term; waitlist click-through at least 3 percent | None would pilot, or click-through under 1 percent | 4 weeks, parallel |

Decision rule: commit to the full M1 only if E1, E2, E3 and E4 pass. E5 is the thesis test and must pass before public launch. If E2 or E3 fails, restate the scope (second track, or desktop-first) and re-estimate before spending.

## 12. Where Strategy A is weak (stated plainly)

1. **It is the most expensive path.** 27 / 43 / 72 engineer-weeks, with no revenue for at least 18 months. Two people cannot also run support, compliance and sales (ceo-investor.md death way 3).
2. **The demand evidence is indirect.** USER_SEGMENTS.md calls the missing original-project capability important for almost every segment, but it is a HYPOTHESIS built from forum quotes and the founders' own story. The CEO memo warns that the founders' personal story substitutes for evidence.
3. **The paying segments are not this segment.** Students and hobbyists pay little (segment 1 ability to pay scored 1, makers 3). Revenue depends on institutions, which are a separate strategy and a different product (teacher view, privacy contract).
4. **The edge is narrow and already contested.** Velxio warns before run; Wokwi has real firmware. iynk's explanation lead is one scripted run each (TESTED, n=1).
5. **It moves the fidelity risk from curated to uncurated.** The 38 items were authored by people who knew the answers. A learner's circuit can contain anything. Fidelity council: the simulators are teaching models (tier T1); an LED-current diagnosis on a circuit the model cannot judge is a trust event.
6. **Unguided building is the wrong condition for novices** (learning council). If the real majority of free users are novices, A will serve few of them. A's answer is segment choice, not a refutation.
7. **It does not address "regardless of money, place, language or equipment" directly.** It addresses money (no kit) for people with decent devices and bandwidth. Low-end devices are unproven (E3), and the first-load JS budget today is 2.2 MB raw on a lesson page, 701 KB gzip, before any editor (PERFORMANCE_BASELINE.md B3).
8. **It cannot claim learning.** No outcome is measured. A "creator" count is activity, not skill. A learning claim needs the learning council's M7 test.
9. **Legal and safety prerequisites sit on the critical path** and are not engineering: provenance, audience decision, provider terms for minors.
10. **Gaming of the north star.** A "weekly creators" metric is easy to inflate with empty saves. Use saved projects with a wired circuit, a successful run, and a return within 14 days, and set no target until baseline E0 exists.

## 13. What A shares with the other strategies, and what it costs the mission

The trust and cost-control work (security blockers, spend ledger, audience decision, honest copy) is needed in every strategy; I count it in section 8 so the comparison with the others is fair. If another advocate leaves it out of their estimate, their number is lower than mine for a reason that is not strategy. The project file, save and share link are also what the CEO memo and the learning memo both put on their own build-first lists. The part that is uniquely A is the editor, the generic netlist, the pure solver and the fault-rule library: 14 / 24 / 40 of the engineer-weeks above (packages C, D, E, F, G in cto-platform.md section 7.3, best / expected / adverse). That is the amount of extra bet A makes compared with a strategy that stops at save and share for catalogue lessons.

## 14. Kill criteria

Stop or restate the strategy if any of these happens. Each has a number.

1. E1 fewer than 3 of 12 interviewees have an own project, or none name a tool block.
2. E3 fails and a desktop-first editor is judged unacceptable to the mission within 2 weeks of the result.
3. E2 fails (more than 20 of 50 sketches rejected) and the second track would add more than 10 engineer-weeks.
4. E5 shows false alarms on the 79 catalogue circuits that cannot be removed by rule refinement in 3 weeks, or no advantage over Velxio in the head-to-head.
5. After 8 weeks live with 200 or more saved projects: 14-day return of savers under 10 percent, or fewer than 1.2 distinct openers per shared link.
6. AI median cost over USD 0.05 per session, with no cheaper routed option passing the safety cases.
7. Counsel says the inherited content or lesson structure cannot be used and a rewrite exceeds 6 engineer-weeks.
8. Velxio or Wokwi ship free, no-account, explained faults with burn visuals and a share link, and iynk cannot show a measured diagnosis advantage in a repeat of E5.
9. A safety incident traced to a "works" result on a user circuit.
10. The team has fewer than 2 people able to ship weekly for two consecutive months.

If A is killed after M1 spikes, what survives: CI, spend ledger, security fixes, project document and save/share/export for catalogue items. These are cheap and useful under any other strategy.

## 15. Sources used

Council memos: `00_EXECUTIVE/council/ceo-investor.md`, `product-learning.md`, `cto-platform.md`, `fidelity.md`, `robotics-aero.md`, `ai.md`, `security-privacy.md`, `business-growth.md`.
Audit: `01_AUDIT/FEATURE_VERIFICATION.md` (sections 6, 7), `01_AUDIT/runs/BROWSER_WALK.md`, `01_AUDIT/PERFORMANCE_BASELINE.md` (B1 to B3), `01_AUDIT/TECHNICAL_DEBT.md` (via cto-platform.md verdicts), `01_AUDIT/SECURITY_BASELINE.md`.
Research: `02_RESEARCH/USER_SEGMENTS.md` (segments 1 to 4, 7, scoring table), `COMPETITOR_LANDSCAPE.md`, `WORKFLOW_BENCHMARK.md` (via landscape rows), `competitors/embedded-sim.md`, `competitors/education.md`, `competitors/ecosystems.md`, `MARKET_ANALYSIS.md` (sections 3, 6, 7), `TECHNICAL_RESEARCH.md` (RS-01, RS-03, RS-08, RS-17).
Founders' words: `docs/handoff/CONTEXT.md`. It records hackathon decisions, not a product strategy; it holds no statement about original projects, which is itself a gap I flag.

I read the evidence files by section and by search, not line by line in full: the audit and research files total about 1.2 MB. Claims I rely on are cited to the file that states them. I did not run any product and did not use web search.
