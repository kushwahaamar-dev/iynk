# Council memo: product and learning (CPO, HCI, learning science)

Seat: Chief Product Officer, human-computer interaction researcher, learning scientist.
Date: 2026-10-27. Scope: red-team questions 7, 10 and 13, the learning design of the current product, the browser walk read as a first-time user, the north-star metric, and the smallest product that shows real value to one segment.

Labels: VERIFIED (audit inspected or reproduced it), DOCUMENTED, EXTERNAL (cited), ESTIMATED (assumptions shown), HYPOTHESIS (with a test), UNKNOWN. No confidence percentages. No user demand is claimed anywhere in this memo: no user has been interviewed or tested (USER_SEGMENTS.md "How to read this file"; USER_RESEARCH_PLAN.md rank 0).

## 1. Bottom line

1. iynk today is a fast, honest, guided simulator with one excellent idea (Break it, then explain why). It is not yet a learning product, because nothing measures whether anyone learned, and the first lesson can be "completed" without the learner doing anything. VERIFIED (BROWSER_WALK.md step 2: the Blink starter already passes all three checks and shows "Done 1/16").
2. Do not build the open project builder first. The demand evidence is indirect only, the cost is the largest item on the list, and the people the mission names (no money, no kit, no place) are mostly novices. The learning-science evidence says novices need guidance and worked examples, and open building pays off later. The things every segment needs first are cheaper: keep the learner's work, share it, and make "pass" mean something.
3. Entertainment and education are being confused in the metrics and in the demo story. The live counters ("K drones flown", "M LEDs blinked"), the leaderboard, the daily challenge and the Most Entertaining track measure engagement. None of them measures a learner getting better at hardware. HYPOTHESIS that this is a problem for adoption; VERIFIED that no learning measure exists.
4. Multilingual is unproven as an adoption driver and unreviewed as a product. Key presence is verified in six languages; translation quality is not. Freeze at six, review quality, and let the data decide.
5. The smallest product that could show real value: a "no-kit lab at home" for one instructor-led intro course (first four to six Uno lessons plus Break it), with saved and shareable work, a diagnose-first fault mode, and an outcome test against the physical lab. Details in section 7.

## 2. Evidence reviewed (files)

Read in full or in the parts that matter to this seat. Paths under `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/` unless stated.

| File | Used for |
|---|---|
| `01_AUDIT/runs/BROWSER_WALK.md` (steps 1 to 16, gap fixes, WebKit) | First-time-user judgement, save/share gap, custom-project gap, hint and Partner behaviour |
| `01_AUDIT/FEATURE_VERIFICATION.md` (C002, C007, C021, C023, C053, C054 and the summary tables) | Lesson, check, quiz counts; translation claim; telemetry and privacy |
| `01_AUDIT/inventory/content-schema.md` | What a lesson, check, fault and quiz are in the data model |
| `01_AUDIT/inventory/server-data.md` | What telemetry can and cannot support as a metric |
| `02_RESEARCH/USER_SEGMENTS.md` | Segments, scores, population, ability to pay |
| `02_RESEARCH/USER_RESEARCH_PLAN.md` (questions, M2, M3, M7, gates) | Existing decision rules I reuse rather than reinvent |
| `02_RESEARCH/COMPETITOR_MATRIX.md` and `competitors/education.md` | What education products do; language lists; fidelity argument |
| `02_RESEARCH/MARKET_ANALYSIS.md` (language and test list T1 to T9, by grep) | Language and weekly-return benchmark |
| `/Users/amar/Codes/ak/simlab/docs/handoff/CONTEXT.md` | Founders' own words (09:58 entry: gave up robotics because of cost; "just a final prototype can be done") |
| `/Users/amar/Codes/ak/simlab/src/content/schema.ts` (Lesson, Check) and `src/lib/telemetry/kinds.ts` | Lesson structure (static `hints`, one `quiz`, ten check kinds); the 14 telemetry kinds |

Not read in full: the other audit files and the remaining research dossiers (other council seats own them). The competitor and market claims below are quoted from the research files and carry their labels.

External learning-science sources I added (web search, 2026-10-27; I read search summaries and abstracts, not the full papers, so each is EXTERNAL and secondary):

- [L1] Sinha and Kapur (2021), "When problem solving followed by instruction works: evidence for productive failure", Review of Educational Research, doi 10.3102/00346543211019105. Meta-analysis, 53 studies, 166 comparisons, reported Hedges g = 0.87 after publication-bias correction for problem-solving-first over instruction-first. Kapur himself says that for learning a plain procedure, instruction first works as well. https://doi.org/10.3102/00346543211019105
- [L2] Kirschner, Sweller and Clark (2006), "Why minimal guidance during instruction does not work", Educational Psychologist 41(2). Argues from cognitive load that unguided discovery and inquiry fail novices. Atkinson, Derry, Renkl and Wortham (2000), Review of Educational Research, reviews the worked-example effect. Search summary only.
- [L3] Finkelstein et al. (2005), "When learning about the real world is better done virtually", Physical Review Special Topics, Physics Education Research 1, 010103. Intro physics DC circuits: students using the PhET circuit simulation did better than students with real bulbs and meters on a conceptual survey and on assembling a real circuit. One study, one simulator, university physics. Later PhET slides say simulations complement and do not replace real equipment and lack real-world "dirt". https://doaj.org/article/a86a7ac0a72641f2a000e4e2c86e5d61
- [L4] Bastani et al. (2025), "Generative AI without guardrails can harm learning", PNAS 122(26). About 1,000 high school maths students in one Turkish school. Unrestricted chat tutor: practice scores up, later exam scores about 17% lower than students who never had it (SSRN version; not confirmed in the PNAS version). A tutor with learning guardrails: practice up, exam about equal to control. https://papers.ssrn.com/abstract=4895486
- [L5] UNESCO mother-tongue schooling reviews (Ball 2011; Benson 2005 for the 2005 Education for All Global Monitoring Report). Support for early-years and primary instruction in a home language; Kenya and Ethiopia results are mixed on second-language literacy. None of this is about adult or secondary technical learners. Search summaries only. https://webarchive.unesco.org/web/20160813063209/http://unesdoc.unesco.org/images/0016/001611/161121e.pdf

## 3. Weaknesses (each with evidence and label)

### 3.1 Learning design against the evidence

| # | Weakness | Evidence | Label |
|---|---|---|---|
| W1 | "Lesson done" can be earned with no learning. Blink's starter code passes all 3 checks untouched and the page shows "Done 1/16". The audit's "starters fail" test uses an empty program for the 71 lessons, not the template a learner sees, so how many other starters already pass is not known. | BROWSER_WALK step 2; FEATURE_VERIFICATION C007 | VERIFIED for Blink; UNKNOWN for the other 70 |
| W2 | Checks test that the output matches, not that the learner understands. They are computed on a fixed virtual-clock script, include substring checks on the code (for example "LED_PIN is an output and the code turns it off"), and the quiz that does test understanding is separate from the pass state. 186 quizzes exist; passing a lesson does not require one. | content-schema.md ("What a check is"); BROWSER_WALK step 2 | VERIFIED (design); effect on learning HYPOTHESIS |
| W3 | Break it is a worked example, not productive failure. The learner presses a fault, then immediately gets "What you see / Why / Fix" and a Repair button. That fits novices (worked examples, [L2]) but it is not the generate-first-then-instruct sequence behind the productive-failure effect [L1]. The founders' pitch of "failure teaching" borrows the evidence of the second design for the first. | BROWSER_WALK step 3 (verbatim card); USER_RESEARCH_PLAN M7 says the learning literature was not read | VERIFIED (what the UI does); the claim that it improves debugging is UNKNOWN until M7 |
| W4 | Inconsistent scaffolding. L298N exposes "Load the reference solution"; Blink has no solution control and its hints are a static tab. There is no ladder (hint, bigger hint, partial solution, full solution) and no fading of support. Hint use is not recorded. | BROWSER_WALK steps 2 and 6; `schema.ts` `hints: TextKey[]`; telemetry kinds have no hint event | VERIFIED |
| W5 | Feedback latency and clarity. Checks read "Not checked yet" until the run reaches about 8 s; the third check needs the full 8 s with no hint saying so. Run leaves status "Running" forever; editing while running keeps the old program, so a learner can think the edit applied. | BROWSER_WALK step 2 | VERIFIED |
| W6 | The simulator teaches some wrong lessons. An unknown `#include` runs silently where a real board fails to compile. A wire on the wrong pin shows "LED1: not connected" instead of "your LED is on D13". Template errors show a generic "cannot run in this build" and the reason is thrown away (`run.ts:176`). Teaching that matches the physical result is the whole transfer claim. | BROWSER_WALK steps 4 and 15 | VERIFIED |
| W7 | Transfer to physical hardware is untested. The sim is a source interpreter with one fixed cost per statement, no registers or timers, a language subset, and nothing compared with a board. The one supportive external study [L3] used a different, validated circuit simulator in university physics. The founders' claim ("just a final prototype can be done") has no test behind it. | COMPETITOR_MATRIX.md row 3 of "not real firmware" (line 252); L3 | VERIFIED (fidelity limits); transfer UNKNOWN |
| W8 | Cognitive load is unmeasured and the screen is dense: figure, editor, serial, tabs, checks, a dock of panels. Counters such as "1/30" next to "0/24" have no explanation. The dock also fires AI and search calls on open. Some of this is good (the LED and pin readout sit beside the code, which is the contiguity principle), but I cannot call the load fine. | BROWSER_WALK steps 2, 6, 16 | HYPOTHESIS (test: M2 think-aloud plus a one-item mental effort rating after each task) |
| W9 | No spacing, no retention path. Nothing the learner writes survives a reload; progress is one `localStorage` key with done flags. A learner cannot return to their own work and the product cannot show them what they learned last week. | BROWSER_WALK step 14; server-data.md ("no project table") | VERIFIED |
| W10 | AI hints are guardrailed only by a prompt rule. "Hints first" is a prompt instruction; whether the model obeys was not tested (C021). One keyed check showed the right behaviour: it read the real bench state and stopped one step short, asking where the LED was wired. That is what the guardrail evidence in [L4] favours, but one sample proves nothing, and each question costs two model calls. | FEATURE_VERIFICATION C021; BROWSER_WALK step 16 | VERIFIED (one sample); behaviour in general UNKNOWN |

### 3.2 Product and first-use weaknesses

| # | Weakness | Evidence | Label |
|---|---|---|---|
| W11 | Cannot do anything of one's own: no part palette, no free wiring, no blank project, no board without lessons. Code is free; the circuit is fixed. | BROWSER_WALK step 15 | VERIFIED |
| W12 | Cannot keep or share work. No account, save, export or project list; a lesson link carries no edited code. | BROWSER_WALK step 14 | VERIFIED |
| W13 | Rooms: a non-keyboard-holder's edit stays local and the two screens silently diverge. A teacher running a class would hit this first. | BROWSER_WALK step 9 | VERIFIED (single-browser fallback only; relay path UNTESTED) |
| W14 | Flight is the weakest first-use experience: a keyboard pilot flew off the field twice in 25 s, no gate completed, the 16 m height limit is a message not a limit, and the phone HUD drops current, mAh and crashes. It is fun, but it teaches flying, not hardware. | BROWSER_WALK steps 8 and 13 | VERIFIED |
| W15 | Translation quality is unreviewed. Keys exist in all six languages (2,064 UI keys, 12,311 content leaves), 12 figure-control labels in the accessible mirror stay English in es and hi, and the user research plan itself says only presence was verified. | FEATURE_VERIFICATION C023; BROWSER_WALK step 11 | VERIFIED (presence); quality UNKNOWN |
| W16 | Measurement is not usable for learning questions. Telemetry has 14 event kinds; for learning it has only `lesson.attempt`, `lesson.pass`, `fault`, `step.done`. It has no check-fail to check-pass transition, no code-changed flag, no hint, quiz-answer or time-to-first-edit event. It is opt-out and on by default, session ids are per browser (no cross-device retention), and the audit flags child-safety gaps. | kinds.ts; server-data.md; FEATURE_VERIFICATION C054, SECURITY_BASELINE refs in the summary | VERIFIED |

## 4. The browser walk, judged as a first-time user

I read BROWSER_WALK.md as a person who arrived because someone said "learn hardware free in your browser".

| Moment | What a new user feels | Judgement |
|---|---|---|
| Landing (step 1) | Warm page, clear headline "Learn hardware by building it", a live Uno with a blinking LED. Language chosen from the browser. | Good. Promise is bigger than the product: "building it" cannot be done with your own parts. |
| Blink (step 2) | Run, the LED toggles every 500 ms on screen, 1.6 s from click. Checks go green after about 8 s. "Done 1/16". | Fast and satisfying. But I did nothing and I got a tick. The feeling is of a demo, not of an achievement. The first lesson should need one edit. |
| Changing the code (step 2) | If I edit while it runs, nothing changes until I stop and rerun. | Confusing. I would think the editor is broken. |
| Reload (step 14) | My changes vanish; the tick stays. | A first-time user loses trust in the first minute of real use. Worse for a student who spent 40 minutes on a sketch. |
| Break it (step 3) | I press "LED with no resistor"; the LED burns in the figure, a banner gives mA, a card explains what I see, why, and the fix. | The best moment in the product. I understand something a real kit would have cost me an LED to learn. This is the thing to protect. |
| Wrong code (step 4) | Most messages name the line and suggest a fix. Templates give a generic refusal; a typo'd include is accepted. | Mostly good. The two bad cases mislead exactly the learner who needs help. |
| Infinite loop (step 5) | The UI stays alive, and nothing says my loop never delays. | Safe, not instructive. A one-line "your loop has no delay" would teach. |
| L298N bench (step 6) | Starts built and running; "Do it" plays the assembly as an animation; a task I can pass by loading the reference solution. | Works. "Do it" lets me skip the doing, so I can finish 24 steps without assembling anything. Counters 1/30 and 0/24 unexplained. |
| Drone calculator (step 7) | Three selects with three options; numbers move sensibly; warnings appear for an ESC overload; safety tests enforce "props off". | The ordered safety tests are the second teaching highlight. Three options per select is a demo, not a design tool. |
| Fly (step 8) | Crashes in 4.5 s, replay with a "Here's why" card that offers easier mode. | Fun. Crash explanation is good pedagogy. A beginner will mostly learn to fly a sim. |
| Together (step 9) | Rooms work between tabs; the baton works; my edit without the baton silently stays local. | Surprising and unlabelled. |
| Partner (steps 10, 16) | Off keyless with a clear note; keyed, it read my bench and pointed at the LED. | Good hint style (it asked a question). Slow, 8.1 s. |
| "Build it for real" (step 16) | Catalogue prices shown; live prices not shown; the error message says "wait a minute" when the real cause is an exhausted budget. | Misleading message. Untested live value. |
| "Make my own thing" (step 15) | There is no way. | The point where a curious user leaves, or asks for the one thing the product cannot do. |
| Phone (step 13) | No sideways scroll, targets 44 px, touch sticks work. | Fine for reading and lessons; flight is not designed for a phone. |

Time to first value: under three minutes to see the LED blink (VERIFIED, steps 1 and 2). Time to a first real achievement (change something, see the result, understand why): the product does not define it, so it cannot be timed.

What I would tell the founders: the engineering quality is not the problem. What is missing is the learner's own result. Everything the learner makes is thrown away, and the thing they are told they accomplished (a tick) did not need them.

## 5. Opportunities

1. A diagnose-first Break it. Show the symptom (LED dark, motor not turning, 36 V on a regulator) with the figure's live readouts, ask "what do you think is wrong?" with a short choice or free text, then reveal the existing explanation card. All the content already exists (144 board failures, 106 bench faults, VERIFIED in content-schema.md). This turns a worked example into a prediction task at nearly no content cost, and is also the instrument for the learning measure in section 6. Expected effect size: UNKNOWN; productive failure results [L1] are mostly conceptual knowledge, so the test should separate near and far transfer items (M7 already does).
2. A scaffolding ladder: hint, larger hint, partial solution, full solution, with each step logged. The data model has `hints` already; the ladder is UI plus events. It also gives the one signal that tells a lesson that is too hard.
3. Take the simulator's honesty further: the same fault-and-explain pattern applied to the code-side mistakes in W6 ("this LED is wired to D13, you drove D12"). This is the same teaching moment, available for free on every lesson.
4. A "kit sandbox": one fixed, richly wired standard starter kit per board (LED, button, potentiometer, buzzer, servo, a sensor) with free code and stored work. This gives learners original projects without the part graph and project document the full builder needs (TECHNICAL_DEBT D1 and D2 per the browser walk's note). HYPOTHESIS that this satisfies most of the "make my own" need for novices; test in section 8. Effort: UNKNOWN, needs the engineering seat.
5. Language as a vocabulary bridge, not only a UI switch: show the English term next to the translated term (for example "resistor / प्रतिरोधक") because datasheets, error messages and code keywords stay English. HYPOTHESIS; cheap to test in the Hindi sessions of M2.
6. A physical-transfer pilot is a differentiator no competitor in the research files claims to have run. UNKNOWN whether any has; the education dossier found no failure-modelling product (competitors/education.md, "Where iynk could be different").
7. The founders' own story (gave up robotics because of cost) is the right mission and a credible recruiting hook for the no-access segments, but it is not evidence of demand (see Q13 and section 9).

## 6. North-star metric, activation and retention

### 6.1 Principles

- The north star must count something the learner did, that a pass-by-default cannot satisfy, and that flight laps and LED counters cannot inflate.
- It must be computable from events the product can send without accounts, and be honest about undercounting (per-browser sessions).
- It needs one companion that is not computed from telemetry: the offline learning outcome (M7) and the physical-build follow-up. Telemetry shows behaviour, not learning.

### 6.2 Proposed north star

**Weekly learners with a verified diagnosis**: distinct anonymous browser sessions per calendar week that, on a lesson or bench, (a) change the starter or default (code diff or a parameter) and move a check from fail to pass, and (b) give a correct answer to a diagnose item (a fault symptom) on the first try without opening the largest hint.

Why this and not "lessons completed" or "minutes in lab": completions are inflated by W1; minutes are inflated by flight and idle tabs; the diagnosis item is the closest in-product proxy to the skill the physical world needs (find out why it does not work). Its weakness is that the diagnose items are written by us; the validation step is M7 (does an in-product diagnosis score predict the offline far-transfer test?). Until then label it a proxy.

### 6.3 Definitions

| Term | Definition | Events needed | Exists today |
|---|---|---|---|
| Activated learner | In the first session, within 15 minutes of first lesson open: edits code or a parameter, runs, and a check changes from not passing to passing. A pass from the unmodified starter does not count. | `lesson.attempt`, `lesson.pass` (exist); add `code.changed` (boolean, not the code), `check.transition` | Partly. Pass and attempt exist; no changed flag or transition. W16 |
| Meaningful return (retention) | A different calendar day within 7 days, same browser, opens a lesson not yet passed or a new lesson, and runs it. Opening the same passed lesson does not count. | `lesson.attempt` with item id (exists) plus `localStorage` first-seen date | Mostly. Needs a first-seen field and a rule |
| Weekly retained learner | Active in at least 2 of 4 consecutive weeks (course-length adjusted, see note). | same | Mostly |
| Fault engagement quality | Share of fault triggers followed by a diagnose answer before the explanation opened. | `fault` exists; add `diagnose.answer` with correct flag | No |
| Scaffold use | Hints requested per lesson, with the level. A lesson where most learners reach the full solution is too hard; a lesson with no hint use and instant pass is too easy (W1). | add `hint.open` with level | No |

Note: for school and course segments retention is by term, not by week. For them define retention as "returned for the next scheduled unit". MARKET_ANALYSIS test T5 uses "above 20% weekly return" as a pass signal; that is a threshold the market seat chose (HYPOTHESIS), and I use it only as a placeholder to be set from the first cohort, not as a target.

### 6.4 Counter-metrics (to stop the product drifting into entertainment)

| Metric | Why watch it |
|---|---|
| Share of passes from an unmodified starter | If it is high, the pass means nothing |
| Flight and daily-challenge minutes per learner against lesson minutes | If flight dominates, engagement is outrunning education |
| Hint ladder reaching the full solution in under N seconds | Copying behaviour; the failure mode seen in [L4] for unrestricted AI help |
| AI Partner questions per lesson attempt and whether the learner edits afterward | A partner that only produces answers raises practice and may lower learning [L4] |

### 6.5 Measurement constraints

- Telemetry is on by default and opt-out; for minors this needs a decision before any of it is used for research (compliance is another seat's remit; the research plan already flags it).
- No accounts means sessions are per browser. Cross-device and clear-storage users appear as new learners, so retention is undercounted in a known direction. For a pilot cohort, add an opt-in anonymous cohort code the learner types once.

## 7. Answers to the red-team questions in my remit

### Q7. Do users want custom project building enough to justify its expense? What evidence exists? What would test it cheaply?

**Answer: not shown, and not yet worth the full expense. Build the cheap prerequisites and a narrow version, and test demand with behaviour.**

What the evidence says:

| Evidence | Says | Label |
|---|---|---|
| Every one of 14 live circuit products in the research has original projects; almost no education product does (USER_RESEARCH_PLAN rank 1, citing the circuit-eda and education summaries) | Makers expect it; teachers of beginners may not | EXTERNAL |
| Forum quotes on Tinkercad and Wokwi (library limits, analog trouble) in USER_SEGMENTS | Some users hit limits when they leave the catalogue | EXTERNAL, anecdotal |
| iynk's own walk: a curious tester tried to add a part, rewire, start blank (step 15) | The product gives no way; says nothing about how many want one | VERIFIED (gap); demand UNKNOWN |
| USER_SEGMENTS scores: fit rises from 3 to 5 "after a builder" for segments 2, 4, 9, 11 | The scorer's own judgement | HYPOTHESIS |
| Learning science [L1][L2] | Novices do better with guidance, worked examples and structured problems; unguided building tends to fail them; experts gain from open tasks. Productive failure works because the task is designed, not open | EXTERNAL |
| Cost: builder core 4 to 8 person-weeks plus the project file format, save and share (TECHNICAL_RESEARCH D4, quoted in USER_RESEARCH_PLAN rank 1) | Largest single item | ESTIMATED (research seat's figure) |
| Mission segments (no kit, no money): beginners by definition | They need guided steps more than a blank canvas | HYPOTHESIS |

My view against the founders' preference: "original projects as a first-class capability" is a reasonable long-term goal and a bad first investment. Two reasons beyond cost. First, a blank canvas for a novice is the unguided condition [L2]. Second, the thing a learner most needs to make their own is cheaper: their code, their parameter choices, their pins. That is already half-possible (code is free). What stops it is that nothing is saved or shareable (W12).

Cheapest tests, in order of cost:

1. **Instrument divergence today (zero build).** Add a `code.changed` flag and a "edit depth" bucket to existing lesson events. Among lesson sessions, what share go well beyond the template (for example, add a function, change pins)? A low share says people follow; a high share says people are already trying to make their own things. Needs section 6 events.
2. **Fake door (M3 in the research plan).** "New Project" button with two labels, aggregate counts, no free text. The plan already specifies sample size (at least 1,000 views per variant, 14 days) and notes that traffic is UNKNOWN. If traffic is too low, report underpowered and do not use thresholds. This is the right cheap test; I add one caution: a fake door measures curiosity, not need. Pair it with test 3.
3. **Concierge test (8 to 10 learners, one week of founder time).** Give each learner a project brief of their own choosing from a short list ("an LED that responds to a light level", "a motor that stops when something is near"). Founders hand-build the closest existing lesson variant and watch what the learner tries to change. Count how many ask for something the catalogue cannot do and whether a "modify this lesson" answer satisfied them. This is the M2 task 6 observation done on purpose.
4. **Decision rules already written** (USER_RESEARCH_PLAN M1): Q1-a (6 of 10 in a segment started from their own idea) puts the builder first for that segment; Q1-b (3 or fewer) means deepen lessons and offer "modify this lesson". I adopt these unchanged.

Decision trigger to build the full builder: Q1-a holds for at least one segment AND the kit sandbox is live AND, in telemetry, a measurable share of sessions use the sandbox for code that is not a lesson (set the share from the first cohort; do not invent it now).

### Q10. Are we confusing entertainment engagement with educational value?

**Answer: partly yes, and the product cannot currently tell the difference.**

- What the team measures and celebrates: counters of drones flown and LEDs blinked, a leaderboard, a daily challenge, and a Most Entertaining track entry (CONTEXT.md decisions; telemetry kinds `flight.lap`, `led.blink`). DOCUMENTED. These count activity.
- What counts as success inside lessons: checks that confirm the output, with no step that requires understanding (W1, W2). VERIFIED for Blink.
- What the learning evidence warns about: practice performance rising while later performance falls when help does the thinking [L4]. iynk's AI partner and the "Do it" and "Load the reference solution" buttons can each skip the thinking. So engagement and completion can rise while skill does not. This is a mechanism, not a demonstrated harm for iynk.
- The strongest learning features (Break it with explanation, ordered safety tests, the crash explanation) are not what the headline counters count.

This is not an argument against fun. Fun is a legitimate route to the first session. It is an argument for a hard separation in what we report and optimise: engagement metrics are leading indicators of reach; the north star in section 6 and the M7 outcome test are the education claim. Until M7 reports, say "learn by trying things safely" in public text and not "teaches debugging" (FEATURE_VERIFICATION already proposes softer wording for similar claims).

A test that tells the two apart cheaply: compare, for the same learners, flight minutes against diagnosis scores; if they do not correlate, flight is entertainment for this purpose. And run M7 (pre/post, crossover, written in USER_RESEARCH_PLAN) once there are 51 completers; below that it can only detect a large effect.

### Q13. Does multilingual materially improve adoption?

**Answer: UNKNOWN. There is no evidence in the files that it does, and some reasons it may matter less than the founders expect.**

| Point | Evidence | Label |
|---|---|---|
| Six languages shipped: en, es, fr, de, zh, hi. 2,064 UI keys and 12,311 content leaves each; 4,087 figure strings each | FEATURE_VERIFICATION C023 | VERIFIED (presence) |
| Quality never reviewed by a native reader; 12 accessible-mirror labels untranslated in es and hi | C023; walk step 11 | VERIFIED |
| Competitor language lists are mostly unpublished, so "six languages" cannot be called an edge. Tinkercad 16 (low confidence), Cirkit Designer 12 (vendor claim), micro:bit Python Editor has translations | COMPETITOR_MATRIX.md ~line 263 | EXTERNAL / UNKNOWN |
| Hindi demand: UNKNOWN. India engineering enrolment is large (3.66 million B.Tech/B.E. all years in 2020-21, AISHE), but that is a population, not a demand for a Hindi lab | USER_SEGMENTS segment 11 | EXTERNAL; demand UNKNOWN |
| Home-language instruction helps early learners; evidence for adult technical learners is thin and elsewhere mixed | [L5] | EXTERNAL |
| The technical layer stays English anyway: code keywords, datasheets, part names, error messages from real toolchains | walk step 11 (code tokens identical in every language) | VERIFIED |
| Maintenance cost: every lesson edit now touches six files; the prose check validates English only | content-schema.md defect 1 | VERIFIED |

My view: translating prose lowers a real barrier for some learners (HYPOTHESIS), but the biggest language barrier in hardware is the English technical layer, which a UI translation does not remove. Also a poor translation of a safety message (for example the props-off warning) is worse than English. So the right move is quality first, expansion never until the data say so.

Test, already specified: USER_RESEARCH_PLAN rules Q5-a to Q5-d (interview count of 4 of 10 non-English-first participants reporting language trouble; task 10 in the learner's own UI language; bilingual reviewer rates 20 sampled strings, more than 3 wrong means fix before marketing). Add one cheap behavioural read: the language segment is in the URL (`/hi`, `/es`), so hosting logs give locale share of sessions with no new tracking. If the non-English share is small, freeze (Q5-b). Caveat: the redirect uses Accept-Language, so a share by locale shows reach, not preference.

## 8. What to build first (from my lens, with the reason)

Ordered by value to a learner per unit of effort. Each needs the engineering seat to size it; I give no effort numbers I cannot support.

1. **Keep and share the learner's work.** Save code and parameters locally; export a file; create a share link that carries the work (for example encoded in the URL) so no server or account is needed. Reason: W9 and W12; the research plan expects every segment to ask for it first (M2 tasks 6 and 7); prerequisite for retention, for teachers and for any project capability. VERIFIED gap.
2. **Make "pass" mean something.** First lesson needs one edit; an audit of all 71 starters for pass-on-open (the audit left this UNKNOWN); add an optional one-question check at the end of each lesson (quizzes exist) and show "done" only after it. Reason: W1, W2, Q10.
3. **Diagnose-first Break it plus the hint ladder, both logged.** Reason: converts the strongest existing feature into a measured one and gives the north-star event. Opportunity 1 and 2.
4. **Fix the feedback that teaches wrong things.** Show the real template error, reject unknown includes, change "not connected" to name the pin, make run restart on edit or say clearly that it did not. Reason: W5, W6; the transfer claim depends on the sim being right at the edges.
5. **Instrument the activation and retention events** from section 6. Reason: otherwise every later decision is a guess.
6. **Run the existing research plan's M2 round 1 (10 sessions) before anything else is built on top.** The plan's own gate G0 says fix basics first. Include 3 non-English-first participants and one teacher.
7. **Kit sandbox (blank Uno with a fixed standard kit)** only after 1 and 5, as the cheapest honest answer to "make my own".
8. **Physical-transfer pilot** (see section 9, open question 3). Start in parallel with 1 to 5.

## 9. What not to build yet (and the trigger that would change that)

| Do not build yet | Why | Trigger to revisit |
|---|---|---|
| Free-form part palette and wiring canvas | Demand indirect; largest cost; unguided for novices [L2] | Q1-a true for a segment, kit sandbox live, and non-lesson sandbox usage visible in telemetry |
| New boards, benches, drones or lessons | 38 items and 71 lessons already exist and nobody has shown that any teaches. More content multiplies the maintenance and translation cost | M7 shows lesson design works (Q4-a), or M2 shows a specific missing lesson blocks a target course |
| More languages | Existing six are unreviewed | Q5-a true, and a native reviewer budget exists |
| Expanding leaderboards, daily challenges, flight modes | Engagement only (Q10) | Evidence that flight practice raises diagnosis or build success, or a separate funded "fun track" with its own budget |
| Credential or on-chain "Proof of Build" as an education claim | A pass can be earned with no learning today (W1); a credential with no validity is worse than none | Pass validated against M7 far-transfer scores |
| Free-chat AI tutor features (voice, buddies, image generation) | Unrestricted help can lower later performance [L4]; child-safety gaps in the audit | A guardrail test of the Partner (solution leakage rate, hint-ladder compliance on 20 scripted learner states) and a moderation plan |
| Teacher accounts, rosters, LMS integration | Q3 unresolved; costs real weeks and legal work (USER_RESEARCH_PLAN rank 3) | Q3-b true (6 of 12 teachers need a view of student work) |
| Pricing, paid tiers | No iynk-specific willingness-to-pay evidence | Q2-h or Q2-j |

## 10. Risks

| Risk | Effect | Mitigation |
|---|---|---|
| The product is loved for the demo and does not teach | Growth with no outcomes; mission claim false | North star plus counter-metrics; M7; do not publish "teaches X" before it is shown |
| Sim fidelity misleads | Learners do the real build and it fails, or damages parts | W6 fixes; physical-transfer pilot; honest "model, not hardware" labels on safety content |
| Safety content mistranslated | Physical harm (batteries, mains-like voltages, props on) | Native review of safety strings first; keep English next to translated terms |
| Pass-on-open lessons plus "Do it" buttons teach nothing | Completion becomes meaningless; credentials hollow | Section 8 item 2 |
| Measurement bias: opt-out telemetry, per-browser sessions, small traffic | Wrong conclusions from thin data | State undercount direction; use cohort codes in pilots; report underpowered results as such |
| Minors in tests | Consent and privacy obligations | Research plan section 2.1; adults and universities first |
| Founders' personal story substitutes for evidence | Build the builder because it feels right | Pre-register the decision rules (Q1-a/b) now and follow them |
| AI help lowers learning while raising satisfaction | Hidden harm | Hint ladder, solution-leak test, delayed retention items [L4] |
| Search and AI costs per learner | Free mission cannot fund itself | Out of my remit; note that one Partner question is two model calls and one price check can need 36 searches (walk step 16) |

## 11. The smallest product that would show real value to one segment

Segment: learners in instructor-led intro electronics or embedded courses who lack enough kits or lab time (USER_SEGMENTS segments 2, 9, 11 and 12 overlap here; segment 9 scored highest at 26 of 35, segment 11 is the founders' mission case; all scores are HYPOTHESIS and evidence strength is 3 or below). I would pick one course at one institution, ideally where Hindi or Spanish is the home language of many students, so Q13 gets tested in the same pilot.

The product, in plain terms:

- 4 to 6 existing Uno lessons from blink to a sensor, chosen with the instructor to match their syllabus.
- Work saved and shareable by link or file (build-first item 1).
- Pass requires an edit and one quiz answer (item 2).
- Break it with predict-then-reveal, hint ladder, both logged (item 3).
- A one-page instructor guide and a cohort code so the pilot can be counted without accounts.
- No new boards, no builder, no leaderboard, no AI required (the Partner can be switched off so it does not confound the study).

How we know it showed real value (decision criteria, to fix before the pilot, using the plan's M7 design where possible):

1. Activation: how many students reach "activated learner" (section 6.3) in the first session. Report counts out of enrolled, not percentages under 20.
2. Learning: diagnose score gain on near and far items, fault-first against correct-first (M7 crossover; 51 completers detect d_z 0.4, so a class of 60 is the minimum useful pilot; a smaller class gives a story, not a result).
3. Transfer: students who then do the physical lab, or a physical task at home, succeed more often or faster than a comparison group. Needs kits (an Elegoo-type Uno kit lists at USD 60 to 96, [S32] in USER_SEGMENTS; ESTIMATED USD 600 to 960 for ten kits).
4. The instructor, unprompted, says they would use it again next term, and names where it fits (a behaviour: do they schedule it).

If criteria 1 and 2 are met and 3 is not measurable, claim only "practice with safe feedback". If 2 fails, stop expanding lessons and rework the lesson design before anything else.

## 12. Open questions and the cheapest way to answer each

| # | Question | Cheapest answer |
|---|---|---|
| 1 | How many of the 71 lesson starters already pass their checks? | A script that runs each starter template through the shared evaluator (engineering seat; hours, not weeks). Report the count. |
| 2 | Do first-time users find the product usable and understand what it is for? | M2 round 1, 10 sessions with think-aloud, tasks 1 to 7, plus a bilingual reviewer on 20 strings. Cost: founder time and a few gift cards (research plan budget). |
| 3 | Does practice in iynk transfer to a physical build? | 8 to 10 adults with no prior experience: half do Blink and Button in iynk, half read a worked-example page; all then wire a real LED and button on a kit. Compare time and errors. Kit cost ESTIMATED USD 60 to 96 each, reusable. |
| 4 | Does fault-first beat correct-first for debugging skill? | M7 as written; first run in a university class (no under-18 consent burden). |
| 5 | Do people want to make their own projects? | Section 7 Q7 tests 1 to 3 (divergence telemetry, fake door, concierge 8 to 10). |
| 6 | Is a "pass" a valid measure of learning? | Correlate lesson pass state and diagnose answers with the offline far-transfer test in the M7 cohort. |
| 7 | Does language materially change behaviour? | Q5 rules; locale share from hosting logs; task 10 in the learner's language. |
| 8 | Does the AI Partner follow "hints first" over many learner states? | A scripted test of 20 learner bench states, count how many answers contain the fix; compare against the guardrail pattern in [L4]. No users needed. |
| 9 | Is the screen too heavy for a novice? | Add a single mental-effort rating (1 to 9) after M2 tasks 1 to 5; compare the lesson page against a stripped variant if the median is high. HYPOTHESIS. |
| 10 | Who pays and would a teacher adopt without accounts? | Out of my remit; rules Q2 and Q3 in the research plan. |

## 13. Disagreements with the existing documents

- USER_RESEARCH_PLAN states (end of M7) that the learning-science literature was not read. This memo adds [L1] to [L5]; they change the framing, not the plan: Break it is currently a worked example, so the plan's "fault-first vs correct-first" test should be run as three arms if possible: worked-example Break it (today), diagnose-first, and no Break it. If only two arms are feasible, make them today's Break it and diagnose-first, since the interesting question is the sequence.
- The USER_SEGMENTS "fit after builder" column implies a builder lifts fit to 5 for four segments. For novices, I would score it lower; the scoring is judgement and unverified.
- The brief's 24-hour hackathon claim that "just a final prototype can be done" (CONTEXT.md 09:58) is a mission statement. As a product claim it is untested.
