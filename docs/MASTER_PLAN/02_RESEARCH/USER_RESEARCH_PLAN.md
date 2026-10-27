# iynk user research plan: validate demand before and during the build

Written 2026-10-27 for the master-plan council (BRIEF section 6.2). Synthesis of the dossiers in `02_RESEARCH/` and the audit in `01_AUDIT/`.

## 0. Read this first

This is a plan. No interview, survey, test or pilot has been run. There are no results in this file and none should be inferred from it. Every number marked ESTIMATED is my arithmetic or judgement. Every decision threshold is a HYPOTHESIS that the founders should accept or change before the first session, and then freeze (section 3.6).

Labels: TESTED (done hands-on), EXTERNAL (a cited source states it), ESTIMATED, HYPOTHESIS, UNKNOWN. Source tags keep the dossier name, for example [USER_SEGMENTS S12] or [education S13]. Sources I added for this plan are tagged [UR1] to [UR5] and listed at the end with access date 2026-10-27.

What the dossiers say that shapes this plan:

- Nobody has been asked. Evidence strength is 3 of 5 or lower for every segment, and no customer has been interviewed [USER_SEGMENTS section 4].
- The current product is a lesson and catalogue viewer. It has no original-project builder, no accounts, no save or share of a learner's work, and rooms hold at most 8 people [FEATURE_VERIFICATION C002, C018; WORKFLOW_BENCHMARK 4.4]. The only wiring-failure teaching in the free no-login tools tested was iynk's (16 named faults on the Uno blink lesson, TESTED once by script) [WORKFLOW_BENCHMARK 4.4, 6]. Review note: the browser walk later counted 15 Break it faults on the Uno R3 [FEATURE_VERIFICATION C009 refresh], so treat 15 or 16 as the figure. The benchmark's own caveats apply: Tinkercad was not tested (UNKNOWN) and the Wokwi evidence is one still frame per case, to be repeated by hand before it is used as a claim [WORKFLOW_BENCHMARK 6].
- The bottom-up serviceable market for simulator licences is small: about $7.4M a year across the US, India and the EU, with a three-year capture of about $0.3M in the base case (ESTIMATED) [MARKET_ANALYSIS 0, 6.2]. That is why "who will pay" is a first-order question and not a later one.
- The original-project builder is the largest build item. The editor core alone is ESTIMATED at 4 to 8 person-weeks, low confidence [TECHNICAL_RESEARCH D4]. Whether to build it first depends on question 1 below.
- The privacy position is weak for research with children. Telemetry is on by default with a random browser id, there is no consent step and no privacy policy page, chat and voice go to third parties, and the product likely attracts children [compliance-safety section 0, 1.1]. Section 2.1 turns that into rules for this plan.

What this plan does not do: it does not choose the beachhead (the strategy phase does), and it does not give legal advice. Consent forms, school approvals and the fake door need legal review (section 2.1).

## 1. Research questions, ranked by how much they could change the roadmap

Ranking rule (HYPOTHESIS): rank by the size of the build or business decision the answer swings, using the effort figures already in the dossiers. A question that can move many person-weeks, or the funding model, ranks above one that moves a few days.

| Rank | Question | Roadmap decision it swings | Size of the swing | Today's evidence | Main methods |
|---|---|---|---|---|---|
| 0 (gate) | Can a first-time user get value from the product as it is? | Whether to fix basics before anything else | Unknown, usually small, cheap to check | Scripted run only, no human tested [WORKFLOW_BENCHMARK 1] | M2 |
| 1 | Do learners want to build original projects, or follow guided lessons? | Phase 2 builder first, or deepen lessons and content | Builder core 4 to 8 person-weeks, ESTIMATED [TECHNICAL_RESEARCH D4]; plus project format, save, share | Indirect only. Every one of 14 live circuit products has original projects [circuit-eda summary]; almost no education product does [education summary]. Whether iynk's users want it: UNKNOWN [USER_SEGMENTS summary 4] | M1, M3, M4, M2 |
| 2 | Who will pay, for what, and how much? | Funding model: seats, grants, referrals, or free only. Decides how much classroom feature work is justified | Base SOM $0.3M a year versus high $2.4M; line A1 (US schools) is 38% of base SAM [MARKET_ANALYSIS 6.3] | Competitor list prices exist (Wokwi Classroom EUR 30 per student per semester, Arduino School $20 per member per year, LabsLand from EUR 7.99) [MARKET_ANALYSIS 3]. No evidence about iynk | M1 (budget holders), M6, M3, M5 |
| 3 | Will teachers adopt a browser lab without accounts? | Accounts, rosters, teacher view, DPA and SSO work, and COPPA route A or B | Route A 1 to 2 engineering weeks; Route B 6 to 10 weeks plus USD 6,000 to 20,000 legal, ESTIMATED [compliance-safety 1.1]; Clever 3 to 5 weeks, LTI 4 to 8 weeks [compliance-safety section 4] | micro:bit classroom works with no accounts [education 2], so no-account entry is common in K-12 [education summary]. Review note: that rests on micro:bit classroom and LEGO Coding Canvas; the VEXcode VR "no sign-in" claim is unconfirmed and Arduino Cloud for Schools, Sphero and Tinkercad Classrooms use accounts [education 1 to 3, 12, 16]. "Table stakes" is a HYPOTHESIS, not a finding. Whether teachers need roster and progress views: UNKNOWN | M1, M2, M5 |
| 4 | Does failure-based teaching (break it, see why, fix it) improve debugging skill? | Whether faults are the core differentiator and lesson design, or an optional extra | Faults already exist (144 board failures, 106 bench faults) [FEATURE_VERIFICATION section 2]; the swing is positioning and where new content effort goes | No education product found models failures: UNKNOWN, not proven absent [education section "Where iynk could be different" 2]. Learning benefit: no evidence read | M7, M2, M5 |
| 5 | Does multilingual matter? | Translation quality investment, new languages, India go-to-market | Six languages already present, 2,064 UI keys each, presence only checked [FEATURE_VERIFICATION C023]; the cost is quality review and upkeep, which is lower than ranks 1 to 3 | Hindi demand: UNKNOWN [USER_SEGMENTS segment 11]. Competitors' language lists mostly unpublished [education 7] | M1, M2, analytics |

Two notes on the order:

- Ranks 1 and 2 are tied in importance. I put the builder first because it blocks the largest engineering item and its answer arrives sooner. Rank 2 needs more time to answer honestly.
- Rank 5 is lowest in swing, not in value. If the beachhead is India (USER_SEGMENTS segment 11 scored 24 of 35, HYPOTHESIS), rank 5 moves up. The plan checks this at gate G1.

Secondary questions answered on the way (no separate method):

| Question | Where it is answered |
|---|---|
| Which segment is the beachhead? (BRIEF 6.3) | Interview coding by segment, section 4.1, gate G1 |
| Is the live-price "Build it for real" tab valued? | M2 task 7, M4 |
| Do rooms matter in a class? | M2 teacher task, M5 (rooms cap at 8, a class of 25 needs four rooms) |
| What AI help do learners want? | M1 section F, M4 |

## 2. Rules for every method

### 2.1 Consent, minors and approvals

This section states the rules of the plan. It is not legal advice. The law summary comes from the compliance dossier and is only as good as that dossier.

| Rule | Detail | Basis |
|---|---|---|
| No participant under 13 without verifiable parental consent | In this plan under-13s are excluded from M1, M2, M3 (individual data), M4 and M6. They may appear only in M5 through a school (M7 excludes under-13s), with school authorisation and parental consent or notice as the school's own rules require, and with no personal data collected by iynk. Review note: the FTC did not finalize a school-authorisation exception, and the FTC FAQ section on schools was not read [compliance-safety 1.1, S1, S6]; so school authorisation is not a settled COPPA basis here: UNKNOWN, a lawyer must confirm before any under-13 session | COPPA amended rule, compliance date 22 April 2026, verifiable parental consent before collecting a child's personal information [compliance-safety 1.1, S1, S2] |
| Parental permission and child assent for every participant under 18 | One simple rule that is at least as strict as each law below. India treats anyone under 18 as a child [compliance-safety 1.5, S16 (2023 Bill summary), S17 (secondary summary of the 2025 Rules); the enacted Act text and the Gazette were not read]. GDPR Art. 8 sets 16 unless a Member State lowers it, never below 13; the UK uses 13 [compliance-safety 1.4, S13, S14]. Brazil needs specific parental consent for children's data [compliance-safety 1.6] | as listed |
| Adults only for surveys on price (M6) | Do not ask minors what they would pay | HYPOTHESIS, avoids the consent question for pricing |
| Minimal data | No names in transcripts. Participant codes (P-001). Consent forms stored apart from data. Audio deleted after transcription, target within 30 days. No video of faces for anyone under 18 | HYPOTHESIS, data-minimisation practice |
| No third-party AI on participant data | Do not paste transcripts of minors into external AI services. Do not run the iynk AI partner, chat or voice features in sessions with minors; they send text or audio to third parties [compliance-safety section 0] | compliance-safety |
| Telemetry off in research sessions | The About page says anonymous counts can be switched off in Settings [WORKFLOW_BENCHMARK section 3]. Switch it off for every moderated session and say so in the consent form | UNKNOWN whether the switch is complete; check before the first session |
| School research approvals | Each school district or university has its own process. Many US districts want a written research request. The founders are not an institution with an ethics board. Whether independent review is required for market research of this kind: UNKNOWN. Resolve in week 1 with a lawyer, and consider a partner university or an independent review board. Cost: UNKNOWN | UNKNOWN |
| US student surveys | The Protection of Pupil Rights Amendment appears in the Clever partner terms [compliance-safety section 4, S34]. Its survey rules were not researched: UNKNOWN. Do not survey students in US schools until read | UNKNOWN |
| India | School principal permission plus parental consent; college head or department approval for adults. DPDP Rules 2025 apply their child-consent rule (Rule 10) 18 months after 14 Nov 2025, about May 2027, ESTIMATED [compliance-safety 1.5]. Follow the strict rule now | compliance-safety 1.5 |
| Voluntary and withdrawable | Participants can stop at any time and ask for their data to be deleted, with no effect on their class or grade | standard practice |
| Teachers must not pressure students | Teacher-led recruiting of students must offer a non-participation option with an equal alternative activity | standard practice |
| Incentives | Gift cards. For minors, given to the parent or teacher, not as cash to the child | HYPOTHESIS |
| Disclosure for deception | The fake door (M3) shows that the feature is not built as soon as it is clicked. No other deception is used | standard practice |
| Fake door and unknown ages | iynk is a general-audience site with child-friendly content and no age signal; a mixed audience site may not collect personal information before asking age [compliance-safety 1.1]. The fake door therefore counts clicks with no identifier and asks for an email only after a neutral "I am 18 or older" tick | compliance-safety 1.1 |

Artefacts needed before the first session: consent form (adult), parental permission and assent form (minor), school permission letter, privacy notice for research data (plain language, written for a child reader for minors), data retention note, and a one-page incident process. Forms are translated for Hindi, Spanish and any other language recruited. Lawyer review: ESTIMATED 5 to 10 hours.

### 2.2 Bias controls used throughout

| Bias | Control |
|---|---|
| Founder as interviewer (participants flatter the maker) | Where possible a non-founder moderator. If a founder moderates, say "I am part of the team that works on this; negative answers help most" and never defend the product in session. Do not claim to be neutral if you are not |
| Leading questions | Questions are written in section 4 and checked against four rules: ask about the last time something happened, never ask "would you", no feature named before the participant raises it, no yes or no questions except screeners |
| Hypothetical answers | Past behaviour first. Stated intent is treated as weak evidence. Behaviour (clicks, repeat use, a purchase order, a named budget line) outranks opinion in every decision rule |
| Selection of friendly users | Do not recruit from the founders' friends, HackTX attendees only, or iynk's existing users alone. Keep existing iynk users as a labelled stratum (expected to be more positive) |
| Acquiescence and social desirability | Neutral wording, balanced scales, reverse-keyed items in surveys, an attention check |
| Order effects | Randomise task order within a usability session where tasks are independent; counterbalance conditions in M7; rotate price order in the surveys, except the Gabor-Granger ladder, which is run in a random start with a fixed ladder per respondent (see M6) |
| Anchoring in pricing | Show no competitor prices in the survey. Use the Van Westendorp questions first, since they do not state a price |
| Novelty effect in pilots | Pilot lasts at least 4 weeks and measures use in weeks 3 and 4 separately from weeks 1 and 2 |
| Enthusiast teacher bias | Pilot teachers who volunteer are not typical. A positive pilot is necessary evidence, not sufficient. Rules in M5 require adoption by a second, non-enthusiast teacher |
| Coder bias | Two coders on at least 20% of transcripts; target Cohen's kappa of 0.7 or more (HYPOTHESIS target). Keep a disconfirming-evidence log |
| Forking paths | Thresholds, outcomes and analysis steps are written before data collection (section 3.6) |
| Bots and duplicates in surveys | Attention check, duplicate-email and duplicate-IP review, minimum completion time of one-third of the median, open-text sanity check |

### 2.3 Sample-size rationale

Qualitative work (interviews, usability tests):

- Guest, Bunce and Johnson analysed 60 interviews with women in two West African countries. Saturation occurred within the first 12 interviews, and basic elements of the metathemes were present at 6 [UR1]. A secondary summary reports 70% of 114 themes in the first 6 and 92% within 12; another source says 73% for the first 6, so the paper should be checked before quoting a percentage [UR1]. This was one dataset from a fairly uniform group, so 12 is a benchmark, not a rule [UR1].
- Hennink, Kaiser and Marconi, in 25 interviews, reached code saturation (the range of issues) at 9 interviews, while meaning saturation (understanding each issue in depth) needed 16 to 24 [UR2]. This is one study, not a universal rule [UR2].
- Plan consequence (ESTIMATED): for a uniform segment, 8 interviews give a first read on breadth; 10 to 12 are the target; 16 or more are needed only where the segment is varied and the decision depends on depth. A simple miss probability (my calculation, assuming interviews are independent draws): with 10 interviews, a theme held by 20% of a segment is missed with probability 0.11, and a theme held by 10% is missed with probability 0.35. With 12, the figures are 0.07 and 0.28. So interviews find common themes; they do not size them. Sizing comes from the surveys and behavioural tests.
- Usability testing: Nielsen and Landauer's average finds 31% of problems per user, so 5 users find about 84% (formula N(1-(1-L)^n), 0.69^5) [UR3]. The same page says to run several small rounds rather than one large study, and to test 3 to 4 users per group when groups differ [UR3]. The 31% is an average across the projects studied, not a property of iynk.

Quantitative work (calculated in `/Users/amar/iynk-master-plan-scratch/research/userplan/power.py` and `extra.py`, normal approximation, two-sided alpha 0.05, power 0.8; all ESTIMATED):

| Design | Effect assumed | Sample needed |
|---|---|---|
| Paired pre/post or crossover (same students in both conditions), standardised difference of paired scores d_z | 0.3 / 0.4 / 0.5 / 0.8 | 90 / 51 / 34 / 15 students completing |
| Two independent groups, per group | d = 0.3 / 0.5 / 0.8 | 176 / 64 / 26 |
| Two independent groups with classes as clusters, 25 students per class, d = 0.5 | ICC 0.05 / 0.15 / 0.25 (assumed, not sourced) | 139 / 289 / 440 per arm; 6 / 12 / 18 classes per arm |
| Two proportions (fake door copy test), per arm | 5% vs 10% / 10% vs 15% / 3% vs 6% | 435 / 686 / 749 |
| One proportion, 95% margin of error at 50% | n = 60 / 100 / 150 / 200 | plus or minus 12.7 / 9.8 / 8.0 / 6.9 points |

The ICC values are my assumptions; I did not source a school ICC. The table shows why the learning study (M7) uses a within-student crossover: a two-group design with classes as the unit needs 12 classes per arm if ICC is 0.15, which is out of reach for a startup.

Gabor-Granger sample sizes of 200 to 400 per segment are a practitioner convention, not a statistical rule [UR4]. Van Westendorp has no sourced sample rule here: UNKNOWN. This plan uses 100 or more completes per segment and reports intervals.

## 3. Programme overview

### 3.1 Methods and the questions they answer

| Method | Q1 original vs guided | Q2 who pays | Q3 teacher no-account | Q4 failure teaching | Q5 multilingual | Gate Q0 |
|---|---|---|---|---|---|---|
| M1 Problem interviews | primary | primary (budget holders) | primary | context | primary | |
| M2 Observational usability tests, current product | supporting | | supporting | supporting | primary (non-English sessions) | primary |
| M3 Fake door "New Project" | primary (behaviour) | weak | | | | |
| M4 Prototype test, original-project builder | primary | | | | | |
| M5 Teacher pilot | supporting | supporting (ask) | primary | supporting | supporting | |
| M6 Willingness-to-pay study | | primary | supporting | | | |
| M7 Learning-outcome pre/post | | | | primary | supporting | |

### 3.2 Sequence and gates (week 1 starts Monday 2 November 2026)

| Weeks (dates) | Work | Gate at end |
|---|---|---|
| 1 (2 Nov) | Legal and ethics questions answered, consent set drafted, screener live, school and district approval requests sent (lead time is the long pole), telemetry switch checked | |
| 1 to 3 (2 to 20 Nov) | M1 wave 1 (about 30 interviews), M2 round 1 (10 sessions), fake door built and live | G0 end of week 3: usability blockers fixed? |
| 4 to 6 (23 Nov to 11 Dec) | M1 wave 2 (about 32), M6 surveys fielded and budget-holder calls, fake door continues. Late November and December holidays cut teacher availability (HYPOTHESIS), so teacher interviews go early | **G1 end of week 6**: beachhead shortlist, Q1 and Q2 first answers |
| 7 to 12 (14 Dec to 22 Jan) | M4 prototype rounds 1 to 3, M2 round 2 on new fixes, M5 recruiting and setup, fake door copy test | **G2 end of week 12**: builder go or no-go, pricing hypothesis |
| 9 to 16 (28 Dec to 19 Feb) | M5 teacher pilot: weeks 9 to 10 are set-up and recruiting over the holiday break, weeks 11 to 14 (11 Jan to 5 Feb) are the 4 weeks of use, weeks 15 to 16 are interviews. Spring term starts in January in many US schools (HYPOTHESIS) | |
| 13 to 20 (25 Jan to 19 Mar) | M7 learning-outcome study | **G3 end of week 16** (pilot): teacher adoption. **G4 end of week 20**: failure-teaching result |

Dates assume approvals arrive on time. If a school approval slips, M5 and M7 slip with it and the gates move. Adult-only methods (university lecturers and students, makers) do not wait for approvals, so the plan is ordered so that they run first.

### 3.3 Budget (ESTIMATED, USD)

| Line | Low | High | Assumption |
|---|---|---|---|
| Interview incentives | 1,240 | 2,880 | 62 to 72 sessions at $20 to $40 average (review: high end raised from 62 to 72 sessions) |
| Current-product usability incentives | 600 | 1,200 | 30 sessions at $20 to $40 |
| Prototype test incentives | 900 | 1,800 | 45 sessions at $20 to $40 |
| Survey incentives | 900 | 2,400 | about 300 completes at $3 to $8 |
| Survey panel fees | 0 | 2,000 | $0 if recruited from communities; panel price UNKNOWN (not researched) |
| Teacher pilot thank-yous | 400 | 1,200 | 8 teachers at $50 to $150 |
| Learning study materials | 200 | 600 | printing, class thank-you |
| Transcription and tools | 0 | 400 | tool prices UNKNOWN |
| Translation of consent forms and surveys | 300 | 800 | Hindi, Spanish, others |
| Legal review of forms | 1,500 | 5,000 | 5 to 10 hours at $300 to $500 per hour, the rate assumed in [compliance-safety 1.1] and itself unsourced |
| Ethics or independent review | 0 | 3,000 | UNKNOWN; placeholder |
| Outreach | 0 | 500 | |
| **Total** | **6,040** | **21,780** | |

Founder and engineering time is not priced: ESTIMATED 600 to 800 hours over 20 weeks (about 155 for interviews, 60 for usability, 60 to 130 for the prototype, 25 for the fake door build and analysis, 65 for the pilot, 80 for the learning study, 40 for approvals and forms, 60 for synthesis, plus survey work). The prototype and fake door need code or design work that is not in the repo today; the founders must approve any change to the repository.

### 3.4 Recruiting channels

I did not open Reddit (blocked to automated fetch in the dossiers [USER_SEGMENTS summary]) or most community sites. Rows marked "link from dossier" were cited there; "link not opened" are from my own knowledge and need a check. Read each community's rules first. Many ban surveys or ads. Ask a moderator for permission before posting. Do not send unsolicited private messages.

| Channel | Segment reached | Link | Evidence in dossiers | Notes |
|---|---|---|---|---|
| r/arduino | makers, students | https://www.reddit.com/r/arduino/ (link not opened). Size tracker: https://thehiveindex.com/communities/r-arduino/ | About 789K members, third-party tracker [USER_SEGMENTS S17] | Self-selected, hobby heavy. Reddit rules on research posts: UNKNOWN |
| r/embedded, r/esp32 | CS students, makers, engineers | https://www.reddit.com/r/embedded/ and https://www.reddit.com/r/esp32/ (not opened) | 214K to 272K and 109K to 141K, trackers [USER_SEGMENTS S18] | More professional skew |
| r/fpv, r/robotics | drone hobbyists, robotics | https://www.reddit.com/r/fpv/ and https://www.reddit.com/r/robotics/ (not opened) | sizes UNKNOWN [USER_SEGMENTS S18] | Lower priority (drone segment scored 23, HYPOTHESIS) |
| Arduino Forum | makers, students | https://forum.arduino.cc/ (link from dossier, simulator threads at S12, S13 in USER_SEGMENTS) | Complaint threads on Tinkercad and Wokwi exist | Forum rules on recruitment UNKNOWN |
| MakeCode forum | K-12 teachers, learners | https://forum.makecode.com/ [education S13] | Teachers report some schools block sites | Same caution |
| Hacker News (Ask HN or comments) | engineers, CS students | https://news.ycombinator.com/ [USER_SEGMENTS S16] | Comment threads about Wokwi and a new browser ESP32 simulator | A post is public and uncontrolled |
| FIRST (FTC, FRC, FLL) mentors and coaches | robotics clubs | https://www.firstinspires.org/ [USER_SEGMENTS S2] | 109,000+ FTC students 2024-25 | Through regional partners; route and permission UNKNOWN |
| REC Foundation (VEX) | robotics clubs | https://recf.org/ [USER_SEGMENTS S5] | 300+ regional championships 2025-26 | Same |
| micro:bit Educational Foundation community | teachers, learners | https://microbit.org/ [USER_SEGMENTS S22] | 3.7 million active users in 2025 | Partnership route; UNKNOWN |
| Raspberry Pi Foundation Code Club (India has about 2,500 clubs) | teachers, volunteers, learners, India | https://codeclub.org/ (not opened) and job listing cited at [USER_SEGMENTS S35] | 9,117 clubs in 2025 in 111 countries [education summary] | Volunteer-run; consent via the club |
| ACTE (CTE teachers) | K-12 CTE teachers and directors | https://www.acteonline.org/ [USER_SEGMENTS S24] | 7.8 million CTE participants 2022-23 | Membership body; recruiting route UNKNOWN |
| CSTA | K-12 CS teachers | https://csteachers.org/ (not opened) | not in dossiers | Chapters are local |
| Atal Innovation Mission (ATL schools) | India school teachers | https://aim.gov.in/ (not opened) | Over 10,000 ATLs [MARKET_ANALYSIS S31] | Government channel; permission needed |
| Multisim Live users (reported end of life 2026-09-15, EXTERNAL, thinly sourced) | university students and lecturers needing a new tool | notice attributed to Digilent [circuit-eda S1, S2]; forum https://forum.digilent.com/ (not opened) | EOL date 2026-09-15 rests on a search snippet of the Digilent notice (page returned 403) and one competitor's comparison page [circuit-eda S1, S4]; whether the site is down now: UNKNOWN | Time-sensitive, may be a good source of non-iynk users |
| Hackster.io | makers | https://www.hackster.io/ [ecosystems S8] | 13+ site rule [ecosystems summary] | Adults only for this plan |
| Major League Hacking | hackathon builders | https://mlh.io/ (blog at [USER_SEGMENTS S26]) | 150,000+ hackers in the 2025 season | Lowest priority segment (18 of 35, HYPOTHESIS) |
| University lecturers in embedded systems | segment 9 | find from public course pages and department pages; cold email | A vendor testimonial shows a fully online course of 80+ students exists [USER_SEGMENTS S11] | Do not approach a competitor's named customers with a pitch. Research request only |
| Survey panel (Prolific or similar) | adult makers, for M6 only | https://www.prolific.com/ (not opened; price UNKNOWN) | none | Adults only; screening quality for "makers" untested |
| Snowball | all | ask each participant for two names | n/a | Limit to 30% of sample to avoid echo chambers |

Screener (used for every recruit; not shown as selection criteria to the candidate):

1. How old are you? [under 13 stop and route to school route only / 13 to 17 parent permission route / 18 or older]
2. Which of these best describes you now? [school student / university student / teacher or lecturer / robotics or club mentor / maker or hobbyist / working engineer / other]
3. In the last 12 months, have you done any of these? [built or wired a circuit / programmed a microcontroller board / built or programmed a robot / built or flew a drone / taught or ran a session on any of these / none] (select all)
4. When did you last do it? [past month / past 3 months / past 12 months]
5. Which tools did you use for it? (open text)
6. Which language do you mostly use for technical material? (open text)
7. Have you used iynk before? [no / yes, once / yes, several times]
8. Do you or anyone in your household work for a company that makes electronics learning products? [no / yes]
9. Availability and time zone. (open text)

Exclusions: founders, their relatives, anyone who answers yes to 8, anyone who did not do any of the activities in question 3 in the last 12 months (except teachers who have taught the topic). Quotas per segment are in each method. Include at least 30% women and at least 30% participants outside the US in M1, as a target (HYPOTHESIS), since the mission is global and the first reachable communities skew male and US.

### 3.5 Research artefacts (all to be created; none exist yet)

Store under `docs/MASTER_PLAN/` in a new folder `02_RESEARCH/user-research/` or a private location if participant data is involved. Participant data must not be committed to the repository.

| Artefact | File | Contents |
|---|---|---|
| Screener and recruiting log | `screener.md`, `recruiting-log.csv` | channel, date, response, outcome, no names |
| Consent set | `consent-adult.md`, `consent-parent-assent.md`, `school-letter.md` | per section 2.1 |
| Guides | `guide-M1-learner.md`, `guide-M1-educator.md`, `guide-M1-budget.md`, `tasks-M2.md`, `tasks-M4.md`, `survey-M6.md`, `test-M7.md` | section 4, final text |
| Pre-registration | `preregistration.md` | thresholds and analysis steps, dated before the first session |
| Evidence log | `evidence-log.csv` | one row per observation: participant code, segment, method, quote or behaviour, code, date |
| Codebook | `codebook.md` | codes with definitions and examples; version history |
| Session notes | `sessions/P-###.md` | notes, SEQ scores, task results |
| Fake door data | `fakedoor-counts.csv` | daily counts only |
| Survey data | `m6-responses.csv` | no emails |
| Synthesis | `synthesis-G1.md`, `-G2`, `-G3`, `-G4` | per gate: what we learned, what we decided, what changed in the roadmap |
| Roadmap diff | `roadmap-changes.md` | decisions linked to evidence log rows |

### 3.6 Pre-registration and how decisions are made

Before the first session, write and date `preregistration.md` containing the thresholds in section 4 (accepted or edited by the founders), the primary outcome of each method, the analysis steps and the stopping rules. After data arrive, thresholds are not changed. A change after the fact is recorded as a deviation with a reason. Where the data fall between thresholds, the answer is "unclear": run the stated follow-up, do not choose the favourable reading.

Interview stopping rule (HYPOTHESIS, my own rule, not from a source): in a segment, after at least 8 interviews, stop when three consecutive interviews add no new code to the codebook. Otherwise continue to 12, and to 16 only if the segment's answer would change the beachhead choice.

## 4. Methods

### M1. Problem interviews

Purpose: learn what people did, what went wrong, what it cost and who decided, without showing iynk. Answers: Q1 (what they built last), Q2 (budget holders), Q3 (teacher context), Q5 (language).

**Participants and sample**

| Segment (USER_SEGMENTS number) | Target n | Rationale | Notes |
|---|---|---|---|
| K-12 educators teaching electronics, coding, robotics (8) | 12 | Top-tier decision maker and distribution power 4 [USER_SEGMENTS section 4]; 12 matches the Guest benchmark [UR1]. Include 4 outside the US | Teachers, not students, for under-18 learning |
| University and maker-lab instructors, lab managers (9) | 10 | Highest scored segment (26) | |
| Budget holders: CTE directors, department heads, lab managers (8, 9) | 8 | MARKET_ANALYSIS test T2 asks for 15 short calls, so 8 here plus 7 in the M6 budget calls [MARKET_ANALYSIS section 10] | 30-minute guide G3 |
| Robotics club mentors and coaches (5) | 10 | Score 25 | |
| Self-taught makers (4) | 10 | Score 24 | adults |
| University engineering and CS students, at least 4 in India (2, 3, 11) | 10 | Score 24 (segments 2 and 11) | adults; also gives India signal |
| High-school learners aged 14 to 17 (1) | 6 | Exploratory only; consent route heavy. Under-14 excluded | Via teachers, with parent permission |
| FPV drone hobbyists (6) | 6 | Score 23, lower priority | |
| **Total** | **72** | | Estimated 62 to 72 after dropouts. The schedule (section 3.2) and gate G1 count about 62 by week 6; the other 10 are held for the least-covered segments |

If a segment reaches the stopping rule early, move the remaining slots to the segment with the least coverage.

**Format.** 45 minutes (30 for budget holders), video call or phone, recorded with permission (audio only for anyone under 18). One interviewer and one note-taker where possible. Interviews are product-free. iynk is not mentioned and the participant is not told what is being built beyond "a free tool for learning electronics and hardware". The guide below is the final text. Probe words allowed: "tell me more", "what happened next", "how did you do that", "what did you do instead". Probe words not allowed: any word that names a feature or suggests an answer.

**Opening script (all guides).** "Thank you for your time. I work on a learning tool for electronics and hardware. I am not here to sell anything or to test you. There are no right answers. I am interested in what you actually did, so please tell me about real examples, including things that went badly. You can skip any question and stop at any time. May I record the audio? The recording is only used by the research team and is deleted after we write it up. [Confirm consent form received.]"

**Guide G1. Learners and makers (segments 1 to 6)**

A. Warm-up (5 min)
1. Tell me about the last time you worked on something with electronics, a microcontroller board, a robot or a drone. When was it?
2. What were you trying to make or learn?

B. The last project (15 min)
3. How did you decide what to work on? Walk me through what happened before you started.
4. Where did the plan or steps come from? (Probe only if unclear: your own idea, a tutorial, a course, a person.)
5. Tell me about the first hour. What did you do first, and then what?
6. Which tools or sites did you use at each stage? What did you use each one for?
7. Tell me about a point where you got stuck. What was happening? What did you do next?
8. Did anything break, get hot, not light up, or behave in a way you did not expect? What happened? How did you find the cause?
9. How long did that take? What would you have wanted at that moment?
10. How did it end? Did you finish? What did you do with the result?

C. Following steps versus going your own way (5 min)
11. Think of the last time you followed a tutorial or lesson exactly. What happened when it was finished?
12. Think of the last time you changed a design or tried something that no tutorial covered. What did you do, and what happened?
13. Tell me about the last time you started something from a blank page. How did that go?

D. Tools and money (7 min)
14. When did you last use a simulator or an online tool to test an idea before building it? Which one? How did you find it?
15. Tell me about the last time you stopped using a tool. What happened?
16. Think of the last time you paid for anything in this area (parts, a kit, software, a subscription, a course). What was it, how much, who paid, and what made you decide?
17. When you last bought parts, how did you decide what to buy and where? Was anything wrong or not needed?

E. Language and access (5 min)
18. Which language do you usually read technical instructions in? Which language was your last tutorial in?
19. Tell me about the last time language got in the way when you were learning or building. What did you do?
20. What device and internet connection did you use for your last project? Anything that did not work on it?

F. AI help (3 min)
21. Have you asked anyone or anything (a person, a forum, a chatbot) for help with a build? Tell me about the last time. What was the answer like, and what did you do with it?

G. Close (2 min)
22. Is there something I should have asked and did not?
23. Who else do you know who has built something like this recently?
Only after question 23, and only if time remains and the participant is willing: "I work on a tool called iynk. Have you heard of it? [no demonstration here; if they ask, offer a separate session]". Record answers separately from the rest, since they are primed.

**Guide G2. Educators (segments 5, 8, 9)**

A. Context (5 min)
1. Tell me about the course or club you taught most recently that involved electronics, microcontrollers or robotics. How many students, what ages or level, how long?
2. What devices and internet do students use in your room? Is anything blocked?

B. The last unit (15 min)
3. Tell me about the last time students did a hands-on activity in this area. Walk me through the lesson, from preparation to the end.
4. How did you choose the tool or kit for it? Who else was involved in the decision?
5. How long did setup take before students could start? What went wrong, if anything?
6. What did students do when it did not work? What did you do?
7. When students got a circuit or program wrong, how did you find out? How did you help them find the cause?
8. Last term, did students mostly follow worksheets and lessons, or design their own? Tell me about one example of each, if you have them.
9. How do you see what each student did? How do you check whether they understood?

C. Accounts and approvals (8 min)
10. Tell me about the last time you had students sign in to a tool. What happened? How long did it take?
11. Tell me about the last time you needed approval to use a new tool in class. Who approved it, what did they ask for, and how long did it take?
12. Tell me about a tool you stopped using. Why?

D. Money (7 min)
13. Think of the last software or equipment purchase for this course. What was it, how much, who approved, and from which budget?
14. How did you first hear about it? What did you compare it with?
15. Have you used any free tool as the main one for a term? Why free?

E. Language and students (5 min)
16. Which languages do your students use at home and in class? Tell me about the last time that mattered in a lesson.
17. Do you teach in the same language the tool is in? What happened when it was not?

F. Close (5 min)
18. What would you do next term if the tool you use now stopped being available?
19. What should I have asked? Who else teaches something like this?

**Guide G3. Budget holders (30 minutes)**
1. Tell me about your role and what you are responsible for buying.
2. Think of the last software or tool purchase for a course or programme. What was it, who asked for it, and who approved it?
3. How much was it, which fund paid, and how long from first request to purchase?
4. What did you have to collect before buying (data privacy agreement, accessibility statement, quotes, approvals)? Tell me about the last time something blocked a purchase.
5. What happens at renewal? Tell me about a tool you did not renew.
6. When a teacher asks to use a free tool, what is the process? Tell me about the last time.
7. What size of purchase can you approve without a formal process?
8. Who else must agree for a purchase of that kind?
9. What does your budget calendar look like? When do decisions get made?
10. What should I have asked?

Do not ask "would you pay". The price section is in the surveys (M6) and the budget-holder follow-up calls.

**Analysis.** Transcribe (audio, first 15 minutes of each interview checked by hand). Code with an initial codebook from the interview guide, adding codes freely. Record counts per code per segment, but do not report percentages for segments under 20. Output: per segment, a table of jobs, tools used, the "last time" failures, who decided and who paid, with quotes. Feed quotes into `evidence-log.csv`.

**Decision thresholds**

Rule inputs are counts of participants whose behaviour in the "last time" questions matches, not whether they say they would like something.

| Rule | If | Then |
|---|---|---|
| Q1-a | In a segment of 10, 6 or more describe starting their last project from their own idea or changing a design beyond a tutorial (G1 Q3, Q12) | Treat original projects as that segment's primary job; put the builder first in the roadmap for that segment |
| Q1-b | In a segment of 10, 3 or fewer did that, and most followed a course or tutorial | Treat that segment as guided. Do not build the open canvas first for it. Deepen lessons, and offer "modify this lesson" as the first creation step |
| Q1-c | Between those | Unclear. Resolve with M3 and M4 behavioural data |
| Q2-a | At least 4 of 8 budget holders name a specific fund and a recent purchase under USD 2,000 for a comparable tool | Keep institutional seats as the first revenue test (T2's pass signal is "most name a specific fund"; 4 of 8 is only half, so this threshold is looser than T2: HYPOTHESIS) |
| Q2-b | Fewer than 2 of 8 can name a fund, or purchases routinely go through a procurement cycle longer than a school term | Do not plan on bottom-up teacher sales. Move weight to grants, partners or district-level conversations |
| Q3-a | At least 6 of 12 K-12 teachers say they chose their last tool at least partly because students did not need to sign in, or describe account setup as a past problem | Keep no-account entry as a positioning pillar and hold Route A privacy posture |
| Q3-b | At least 6 of 12 describe needing a view of each student's work or a roster to run a lesson | Move class view and rosters ahead of other classroom work; plan privacy Route B |
| Q5-a | At least 4 of the 10 non-English-first participants describe language getting in the way within the last year, and report no workaround that satisfied them | Treat multilingual as a differentiator for those segments. See M2 and analytics before investing further |
| Q5-b | Fewer than 2 of the 10 | Freeze languages at the current six. No new language work except fixing reported errors |

Beachhead shortlist (G1): rank segments by (1) intensity of the "last time" failures, (2) frequency, (3) who decides and whether they were reachable in this recruitment, (4) money seen. Keep at most three. The ranking is judgement, and it must be shown with the evidence log rows behind it.

### M2. Observational usability tests on the current product

Purpose: find out whether real first-time users can do things the product claims, and how they react to what is missing. This is the only method that tests today's build.

**Participants and sample.** Five rounds of 5 are not needed. Per Nielsen, 3 to 4 users per distinct group, and several small rounds [UR3]. Plan: round 1 (week 2 to 3), 10 sessions: 4 learners or makers (adults), 3 university students (at least 1 non-native English speaker), 3 teachers or lecturers. After fixes, round 2 (weeks 7 to 10), 10 sessions with new participants and 4 non-English-first participants testing in their own interface language (Hindi, Spanish, Chinese, French or German, as available). Add 10 sessions with 14 to 17 year olds via a school or club only if consent is in place (optional, for G2). **Total 20 to 30.** Exclude participants who joined M1 within the past two weeks.

**Format.** 40 minutes, moderated, remote screen share or in person, think-aloud. A founder may moderate but should not touch the keyboard or hint. Recording: screen and audio with consent. Telemetry switched off. The AI partner, chat and voice are not used.

**Moderator script.** "You will use a website that teaches electronics. It is a work in progress. We are testing the site, not you. Think aloud: say what you are looking at, what you expect and what confuses you. I cannot help during tasks. If you want to stop a task, say so. Ready?" Start with: "What do you expect to be able to do on this site?" (do not correct them).

**Tasks (scenario wording is read aloud; success criteria are for the observer).** Cap each task at 5 minutes. Order randomised, except task 1 first and task 9 last.

| # | Scenario | Success | Observe |
|---|---|---|---|
| 1 | "You want to learn how to make an LED blink. Find where you would start." | Opens a lesson with an LED on the Uno within 2 minutes | Where they look first, whether they find the language switcher or the catalogue |
| 2 | "Make the LED blink faster than it does now." | Edits the delay in the code and runs; serial or LED shows the change | Editing the code, whether Run is found, reaction to the compile messages. The benchmark run saw an "append rather than replace" editor issue in a scripted run [WORKFLOW_BENCHMARK 4.4], so note human behaviour |
| 3 | "Change the resistor and the LED colour and see what changes." | Uses the Parameters tab | Finds parameters unaided? |
| 4 | "Without changing the code, find out what happens if the resistor is left out." | Finds Break it and triggers the "no resistor" fault; reads the explanation | Does the participant understand the cause ("what you see, why, fix")? Ask afterwards: "Explain in your own words why the LED broke." |
| 5 | "Use a light sensor so the LED turns on when it is dark." | Opens the light lesson, changes the lux slider, sees the LED respond | Understanding of virtual versus real. Review note: the Uno R3 light lesson with a lux slider is read in code (`src/content/boards/uno-r3.ts`, quantity `light-lux`), not walked in a browser |
| 6 | "You want to build your own circuit that is not one of these. Show me what you would do." | No success criterion. Record what they try, how long they search and what they say | Direct evidence on Q1: do they look for a blank project at all? |
| 7 | "You want to keep what you made and show it to a friend. Show me how." | No success is possible today. Record the attempt | Expected: local-storage only, no export or share of work [WORKFLOW_BENCHMARK 4.4] |
| 8 | "You want to buy the parts for this. Find out what you would need and what it costs." | Finds the parts list tab | The price lookup failed with a rate-limit message in the one benchmark visit and the key had no searches left [WORKFLOW_BENCHMARK 4.4; FEATURE_VERIFICATION summary], so this task may fail for reasons outside the user's control. Note and exclude from the usability score. Review note: the browser walk found that opening Lab tools fires price searches by itself and one check of a 12-part drone needs about 36 searches (ESTIMATED) [BROWSER_WALK step 16], so live M2 sessions on the production site can spend search quota; use a keyless build or the catalogue-price view for task 8 |
| 9 (teachers only) | "Tomorrow 25 of your students will each do this blink lesson. Show me how you would set this up and how you would see what they did." | None expected. Record | Whether the teacher looks for accounts, a class code or a dashboard; rooms hold 8 [FEATURE_VERIFICATION C018] |
| 10 (non-English sessions) | Whole session in the participant's UI language: tasks 1, 2 and 4 repeated in that language | Same as above | Terms they do not understand; machine-sounding text; code and UI language mismatch. Ask a bilingual reviewer to rate 20 sampled strings |

**Measures per task.** Completion (complete, partial with help, fail); time on task; number of wrong paths; assists given; a Single Ease Question after each task ("Overall, how difficult or easy was this task? 1 very difficult to 7 very easy"); after the session the System Usability Scale (10 items, standard wording; the source was not fetched for this task: UNKNOWN until checked) plus these open questions:

1. What was the most confusing moment?
2. What did you expect that was not there?
3. What did you like, if anything? (asked last on purpose)
4. Tell me about the last tool you used for something like this. How did this compare, in what you did, not what you felt?
5. Would you use it again? When would that be? (record, but do not decide on it)

**Analysis.** Per-task completion with exact counts (no percentages under 20 sessions). Problem list with severity: blocks the task (3), slows (2), annoys (1). Count participants per problem. Two observers rate severity independently.

**Decision thresholds**

| Rule | If | Then |
|---|---|---|
| G0-a | In round 1, any task 1 to 5 is failed or needs help by 4 or more of 10 | Fix before M3 goes live and before M4. Re-test the task in round 2 |
| G0-b | Task 4 "explain why the LED broke": at least 7 of 10 give a correct cause in their own words | Supports the failure-teaching claim as understandable. It does not show learning (M7 does) |
| Q1-d | Task 6: at least 6 of 10 look for a way to make their own circuit or ask "where do I start my own", unprompted | Corroborates original-project demand. Combined with M1 rule Q1-a it moves the builder up |
| Q1-e | Task 6: at most 2 of 10 look for it | Counts against building first |
| Q3-c | Task 9: at least 6 of the teachers or lecturers look for accounts, class codes or a dashboard before anything else | Supports Q3-b (class view needed) |
| Q5-c | Task 10: non-English-first participants complete tasks 1, 2 and 4 faster or with fewer assists in their own language than English-first participants do in English, or at least 3 of 4 prefer the native UI to English and name a term they could not understand in English | Keep languages as a pillar for those languages and fund a native review. Otherwise treat language as hygiene |
| Q5-d | A bilingual reviewer rates more than 3 of 20 sampled strings as wrong or misleading | Quality review before any marketing in that language, since only key presence was verified [FEATURE_VERIFICATION C023] |

### M3. Fake-door test on iynk.tech for "New Project"

Purpose: a behavioural measure of demand for original projects, collected at scale from real visitors. Answers Q1 and gives a weak first signal for Q2.

**Design.** Add a "New Project" button (the founders must approve any code change and decide placement; the repository is not touched by this plan). Place it where a returning visitor would expect to start something: on the dashboard, and inside a lesson page next to the lesson title. When clicked, a panel appears at once:

> "New Project is not built yet. We are deciding whether to build it. Thank you for telling us you want it."
> Question 1 (optional): "What would you make first?" [a circuit with a board / a robot / a drone / something else / I just wanted to look]
> Question 2 (optional): "Which describes you?" [student / teacher or lecturer / maker or hobbyist / other]
> Tick box: "I am 18 or older and want an email when it is ready." If ticked, an email field appears. No email field appears otherwise.
> Free text is not offered, to avoid stray personal data from children.

Counting: aggregate counters only (page views of the button, clicks, answers), with no cross-session identifier. If the team uses the existing telemetry, note that it is on by default with a random browser id and no consent step, so a decision on that is needed first [compliance-safety section 0].

**Variants.** Two button texts, randomised per page load: A "New Project", B "Start from a blank board". Primary metric: unique page views where the button was visible for at least 1 second, versus clicks. Secondary: clicks on "New Project" versus lesson starts in the same sessions, as a ratio, to show original versus guided preference as behaviour.

**Sample and duration.** Visitors to iynk.tech: UNKNOWN. The audit has no active-user count [MARKET_ANALYSIS section 7]. Minimum 1,000 button views per variant (ESTIMATED: 435 per arm detects 5% vs 10%, 686 per arm detects 10% vs 15%; 1,000 gives margin for bot filtering). Minimum 14 days, to cover a weekly cycle, up to 6 weeks. If fewer than 1,000 views in 6 weeks, report as underpowered and do not use the thresholds below. At 30 clicks in 1,000 views the 95% Wilson interval is 2.1% to 4.3%; 50 in 1,000 is 3.8% to 6.5%; 100 in 1,000 is 8.3% to 12.0% (calculated).

**Bias notes.** Visitors are self-selected and include children and bots. Curiosity clicks happen; question 1's "I just wanted to look" option measures it. Traffic from a hackathon judging period is not representative. Do not run during a launch or press spike. Do not run the test on pages shown to a school group in a pilot.

**Decision thresholds** (HYPOTHESIS; no external benchmark was found for click rate on a fake door for this kind of site)

| Rule | If | Then |
|---|---|---|
| Q1-f | Click rate is 10% or more of button views, and "I just wanted to look" is under 30% of answers | Strong behavioural support for original projects. With M1 and M4 rules, schedule the builder |
| Q1-g | Click rate 3% to under 10% | Mixed. Decide from M1, M2 and M4 |
| Q1-h | Click rate under 3% with at least 1,000 views | Weak. Do not build the open canvas first. Reconsider "modify a lesson" |
| Q1-i | Among sessions that start any lesson or press New Project, New Project is at least 25% | Original projects compete with lessons on behaviour |
| Q2-c | The email opt-in (adults) exceeds 1% of button views | Supports a waitlist for a later pricing test; below that there is no basis for a waitlist test |
| Copy | Variant difference is only acted on if the 95% intervals do not overlap | Otherwise keep either |

### M4. Prototype test of the original-project builder

Purpose: before spending 4 to 8 person-weeks on an editor core [TECHNICAL_RESEARCH D4], learn whether the builder idea works for target users and what must be in it. Answers Q1 and shapes the design.

**What is tested.** A clickable prototype, not working code. Options in order of cost (ESTIMATED): (a) static HTML or design-tool screens with scripted paths, 3 to 5 days; (b) a thin working canvas using the circuit-file idea in the benchmark (`diagram.json`-style text); the technical dossier's own prototype target is under 400 lines in 3 days [TECHNICAL_RESEARCH D4]; (c) a "Wizard of Oz" session where a person moves parts on the participant's behalf. Use (a) in round 1, (b) in rounds 2 and 3 if G1 supports the builder. A comparison condition uses an existing tool (Wokwi or Tinkercad) with the same task, to anchor ease scores: this tests the claim that nobody makes custom parts easy for a beginner, which is a HYPOTHESIS [WORKFLOW_BENCHMARK section 6, task 5].

**Participants and sample.** Three rounds of 5 (15 sessions per segment group, 3 groups = 45), per Nielsen's several-small-rounds advice [UR3]. Groups: (1) adult makers and CS students, (2) university engineering students, (3) K-12 teachers and club mentors testing on behalf of learners (and optionally 14 to 17 year olds with consent). New participants each round. Existing M1 participants may return for round 3 only.

**Tasks.**

1. "Make the LED circuit from this picture: a battery, a resistor and an LED. Do it your way."
2. "Make a night light that turns on an LED when the room is dark." (Reproduces a lesson in the user's own layout.)
3. "Now change it so it does something the lesson did not do." (Free change, then ask what they chose and why.)
4. "A part you need is not in the list. What would you do?" (Checks the custom-part path. Record whether they give up, look for a file, ask for help or search the web.)
5. "Show a friend what you made." (Save, share and fork behaviour.)
6. First-choice test: before task 1, show the dashboard with both a lesson list and a New Project button, and say: "You have 20 minutes. What would you do?" Record the choice. Random half see the lessons first in layout order, half the New Project first, to separate preference from position.

**Measures.** Task completion, time, wrong paths, SEQ per task, SUS at end, number of parts used in task 3 (an effort proxy), whether task 3 involved a fault (so can link to failure teaching). Questions after:
1. What did you try first? What happened?
2. Tell me about a time you wanted to make something like this and could not. What did you do?
3. What would you need to keep using this next week? (record, do not treat as commitment)
4. Where in your last project would this have been used, if at all? (asks about a concrete past case)

**Decision thresholds**

| Rule | If | Then |
|---|---|---|
| Q1-j | Task 6: at least 60% of participants (of the 15 in a round) pick New Project first | Build order supports the builder first |
| Q1-k | Task 6: at most 30% pick it | Guided first; the builder starts as "modify a lesson" |
| B-1 | Task 1 completed unaided by at least 12 of 15 in round 3 | The interaction design is good enough to start the production editor |
| B-2 | Task 1 completed unaided by fewer than 9 of 15 after three rounds | Do not build the free-form canvas yet. Revisit the design (guided build, templates) |
| B-3 | In task 4, more than 8 of 15 give up | Plan the custom part as a first-class feature of the builder, not a later add-on |
| B-4 | Mean SEQ on task 1 is at least 5.5 of 7 (HYPOTHESIS cut-off) | Acceptable ease. Lower: redesign |

### M5. Teacher pilot

Purpose: test whether real teachers can run a class on the present product without accounts, and whether they would adopt it. Answers Q3, and gathers evidence for Q2, Q4 and Q5.

**Participants and sample.** 8 teachers (minimum 5), 4 K-12 (including at least 1 outside the US) and 4 higher education or club mentors. Rationale (ESTIMATED): this is a feasibility pilot with a homogeneous task in each group; the saturation literature [UR1, UR2] says 6 to 12 interviews per uniform group give most themes, and 8 allows two small subgroups. It cannot estimate adoption rates. At 5 of 8 successes the 95% Wilson interval for the rate is 30.6% to 86.3%, which is a reason to treat it as a feasibility check, not a prevalence estimate. Recruit through M1 follow-ups (ask at the end of M1 whether they would help in a trial) and through clubs. Include at least 3 teachers who did not volunteer enthusiastically (recruited cold) to limit enthusiast bias.

**Design.** Four weeks, a unit of the teacher's own choosing that uses 3 to 6 lessons that already exist (matched from the 71 board lessons, the robotics benches or drone lessons by topic). The teacher gets a one-page guide: how to open a lesson, how to use room codes (max 8 per room), the Break it tab, language switching, and an offline fallback (screenshots or a worksheet) because no export of student work exists. Because there is no teacher view, evidence of student work is a worksheet or screenshot collected by the teacher. No student account, name or personal data goes into iynk. The school's network allow-list is checked in advance (sites are blocked in some schools [education 1]).

**Under-13 students.** Only through the school, with the school's own consent process and no iynk data collection beyond aggregate counts; the AI partner, chat and voice are not used. If any of these cannot be guaranteed, restrict the pilot to ages 13 and over, or to higher education.

**Data collected.** (1) Pre-pilot interview (20 minutes): current tool, plan, concerns. (2) Weekly 10-minute check-in, with the same four questions each week: what did you do this week; what went wrong; what did you do when it did; what did you do instead of using iynk, if you did. (3) A one-page log kept by the teacher: date, class size, lesson, minutes of use, issues. (4) Post-pilot interview (45 minutes). (5) Aggregate counts, if telemetry is switched on by the teacher: sessions, lessons opened, Break it uses. (6) Student exit slip, optional, 3 questions, no names.

**Post-pilot interview guide.**
1. Tell me about the lesson you ran last. What happened from the time students arrived?
2. Tell me about a moment when something did not work. What did you do?
3. How did you know what students had done or understood?
4. What did you have to do outside the tool to make it work for your class?
5. Compare how long preparation took with the tool you used before.
6. Tell me about a time a student got something wrong. What did they do? What did you do?
7. How did students who speak other languages manage?
8. What would you have to change in your school to use it next term? Who would you need to ask?
9. Next term, what will you actually do? (record plans and say that plans are not commitments)
10. If you had to pay for it, who would pay and from where? (Ask only after Q9, after the participant has answered unprompted.)
11. What should I have asked?

**Adoption measures.** Primary: did the teacher run at least 3 lessons with the class in the four weeks? Secondary: used the tool in weeks 3 or 4 (not only 1 and 2); sought a colleague to adopt; asked to continue next term; described a concrete next-term plan; named a budget line.

**Decision thresholds**

| Rule | If | Then |
|---|---|---|
| Q3-d | At least 6 of 8 ran 3 or more lessons without accounts and at least 5 of 8 say they will use it again next term with a concrete plan | Keep the no-account class path as a core feature. Build a lightweight class link and teacher view only if the weekly check-ins show the same unmet need in 4 or more |
| Q3-e | 3 or more of 8 need a view of each student's work before they will use it again | Build class view and consider Route B privacy (parental consent flow, DPA) before school marketing |
| Q3-f | Fewer than 4 of 8 ran 3 lessons | The product is not yet classroom-ready. Stop school outreach; fix the top blockers from the logs |
| Q3-g | Network blocks, device problems or room limits are named by 3 or more as the main blocker | Treat as the first roadmap item (technical cause) before features |
| Q2-d | At least 3 of 8 name a specific person and budget they would ask, and at least 2 ask for a quote or purchase order | Supports T3 in MARKET_ANALYSIS section 10 (pass signal: two ask for a purchase order) |
| Enthusiast guard | Adoption is only counted as success if at least 2 of the 3 cold-recruited teachers meet the Q3-d adoption test | Otherwise the result is "enthusiasts only" |

### M6. Willingness-to-pay study

Purpose: estimate acceptable price ranges and the decision structure for the two paying groups the dossiers suggest, schools and universities (seats) and individuals (subscription), and detect whether either exists. Answers Q2.

**Method choice.** Van Westendorp's Price Sensitivity Meter (four questions: too expensive, too cheap, expensive, bargain) gives an acceptable price range through four curves; its points are PMC, PME, IPP and OPP. It does not estimate demand [UR5]. Gabor-Granger asks purchase intent at a ladder of prices and gives a demand and revenue curve, but it values one product on its own and is open to anchoring [UR4]. Use Van Westendorp first to find a range (no price shown to respondents), then Gabor-Granger to estimate demand inside it [UR4]. Both are stated-preference methods and people usually overstate what they would pay: the plan weights behavioural evidence higher (M3 waitlist, M5 purchase-order requests, budget-holder calls) and never uses stated intent alone for a decision.

**Samples.** Adults only.

| Group | Target completes | Margin of error on a proportion at 50% |
|---|---|---|
| Teachers, lecturers, club mentors, lab managers | 100 (floor 60) | plus or minus 9.8 points (12.7 at 60) |
| Individual makers and students (adult) | 200 (floor 100) | 6.9 (9.8 at 100) |
| Budget holders (calls, not survey) | 15 | qualitative; includes the 8 from M1 |

The practitioner convention for Gabor-Granger is 200 to 400 per segment [UR4], so the teacher sample will be underpowered by that convention; report intervals and treat as indicative. Recruit teachers through the channels in section 3.4 and M1, individuals through communities and optionally a panel. Report by segment and country; do not pool.

**Concept card shown to every respondent (neutral).** "iynk is a browser-based hardware learning lab. You can open it in a web browser with no installation and no account. It lets you practise wiring and programming boards, robots and drones in a simulator and see what happens when something is wrong. Part of it is free. [Group A:] Schools and universities could pay for extra features for classes: [list: class link, teacher view of student work, saved class projects, support]. [Group B:] People could pay for extra features for themselves: [list: saved and private projects, more storage, extra tools]. The final list is not decided."

(The features in brackets are placeholders: they must match what M1 says people value; the concept card is edited after wave 1 and frozen before fielding. This is a HYPOTHESIS about what a paid tier contains; MARKET_ANALYSIS section 4 suggests the paid tier is limited by classroom features, not content.)

**Survey, Group A (teachers and lecturers)**

Screener and context
1. What best describes your role? [school teacher / university lecturer or instructor / club mentor or coach / lab manager / department head or director / other]
2. In which country do you teach?
3. Which level? [primary / lower secondary / upper secondary / university / other]
4. In the last 12 months did you teach, run or supervise any activity with electronics, microcontrollers, robots or drones? [yes / no] (no: end)
5. About how many students did you teach in these activities in the last 12 months? [numeric ranges]
6. Which tools or kits did you use? (open text)
7. Which of these did your school or department pay for in the last 12 months? [software / kits or parts / a platform subscription / nothing / I don't know] (select all)
8. Of what you paid for, what was the most you paid for any one software tool, per year or per student, in your currency? (open text, "none" allowed)
9. Who decides about software for your course? [I decide alone / I decide with a colleague / I recommend and someone else decides / someone else decides / I don't know]
10. If a tool costs about the same as one lab kit, can you buy it without a formal approval? [no approval needed / approval from one person / formal process / not sure] (this question has no price)

Concept card shown.

Van Westendorp (per student, per year; the respondent's currency; the same four, in this order, free text numeric, minimum 0)
11. At what price per student per year would this be so expensive that you would not consider buying it?
12. At what price per student per year would it start to get expensive, so that you would have to think hard about buying it, but it is not out of the question?
13. At what price per student per year would it be a bargain, a great buy for the money?
14. At what price per student per year would it be so cheap that you would doubt its quality?
(The wording follows the standard four questions [UR5]. Enforce consistency: too cheap < bargain < expensive < too expensive; show a message if not and allow correction.)

Gabor-Granger
15. [random start price from the ladder of USD 0, 2, 5, 10, 20, 30 per student per year, shown in the respondent's currency] "If the price per student per year were [price], how likely are you to ask your school or department to buy this?" [definitely would / probably would / might or might not / probably not / definitely not]. If "definitely" or "probably": show the next higher price and ask again; otherwise the next lower price; stop when the answer flips or the ladder ends. (Review correction: the ladder is per student per year and tops out at USD 30, which is below one semester of Wokwi Classroom (EUR 30 per semester, confirmed on wokwi.com/classroom, 2026-10-27) and LabsLand's upper tier (EUR 19.99 per semester). It covers Arduino School (USD 20 per member per year) but cuts off the top of the university anchors, so Group A should add a higher rung or ask lecturers per semester.)

Decision and budget
16. If you wanted to buy this, what would you do first? (open text)
17. Who would you need to ask, and how long would it usually take? (open text)
18. Which budget would it come from? [department budget / school budget / grant / parent or student fees / personal money / I don't know / other]
19. What would stop you buying even at a low price? [select all: data privacy review / accessibility / no sign-in needed / lacks curriculum alignment / free alternative is good enough / students' devices / other: text]
20. Which free tool would you use instead? (open text)
21. In the last year, did you stop using a paid tool? Why? (open text)

Free-text and close
22. What, if anything, would make this worth paying for in your course? (open text)
23. Optional: Are you willing to take a 20-minute call? [yes / no] (contact only if yes, adults only)

**Survey, Group B (individual adult makers and students)**

Screener and context
1. How old are you? [17 or under: end / 18 to 24 / 25 to 34 / 35 to 44 / 45 and over]
2. In the last 12 months, did you build, wire, program or simulate any electronics, microcontroller, robot or drone project? [yes / no] (no: end)
3. Country.
4. How many projects did you start in the last 12 months? [numeric]
5. Which tools do you use? (open text)
6. In the last 12 months, did you pay for any of these for yourself: software or a subscription, a course, parts or kits? [yes / no]; if yes: which, how much in total (open text), and what made you pay (open text)
7. Did you stop using a free tool because it began to charge, or stop paying for one? Tell us what happened (open text)

Concept card B shown.

Van Westendorp (per month, in the respondent's currency)
8. At what price per month would it be so expensive that you would not consider it?
9. At what price per month would it start to get expensive, so that you would have to think hard, but it is not out of the question?
10. At what price per month would it be a bargain?
11. At what price per month would it be so cheap you would doubt its quality?

Gabor-Granger
12. [random start from USD 0, 2, 4, 6, 8, 10 per month; anchored to Wokwi Hobby at EUR 5.6 a month billed annually and the USD 4 per month test in MARKET_ANALYSIS T6, neither shown to the respondent] "If it cost [price] per month, how likely are you to subscribe?" [same five-point scale and flip rule as Group A]
13. Compared with the free tools you use now, what would have to be true for you to pay? (open text)
14. Optional: leave an email for an update. [adults only]

Attention check inside the Likert items: "To show you are reading, select 'probably not' here."

**Analysis.** For each group: median and interquartile range of each Van Westendorp question; the four curves and the points PMC, OPP, IPP, PME, with a bootstrap interval (resample respondents 1,000 times); the Gabor-Granger share at each price; revenue index (price times share) with its peak and interval; segments by country and role. Compare the ranges with the anchor prices (Wokwi Classroom EUR 30 per student per semester; Arduino School $20 per member per year; LabsLand from EUR 7.99 per student per semester; Arduino Maker $72 per year; Wokwi Hobby EUR 5.6 per month) [MARKET_ANALYSIS section 3]. Report the share of respondents who paid for something in the last 12 months (past behaviour) next to every stated-price result.

**Behavioural follow-up (must run with M6).** Budget-holder calls (15 total) use guide G3, then for willing participants: "If I send you a one-page quote for a class of 30 for one term at [price from the survey's IPP], what would happen with it?" and record who they would show it to and when. A waitlist page for a "Classroom" tier with a stated price, no payment (matches T1 in MARKET_ANALYSIS section 10), shown to teachers coming from the channels in section 3.4.

**Decision thresholds** (they tie to the three scenarios of the market model: seat price USD 12, 20 or 30 per student per year in line A1 [MARKET_ANALYSIS 6.1])

| Rule | If | Then |
|---|---|---|
| Q2-e | Group A IPP at or above USD 20 per student per year, and at least 30% say "definitely" or "probably" at USD 20 | Keep the base case for institutional seats. Build the minimum class features and run a paid pilot |
| Q2-f | IPP between USD 12 and 20, and at least 30% say yes at USD 12 | Plan at the low-to-base price. Budget the class features smaller |
| Q2-g | IPP under USD 12, or fewer than 15% say yes at USD 10 | Do not plan on per-seat school revenue. Re-rank funding: grants, partners, district contracts, referrals. Keep the core free |
| Q2-h | At least 3 of 15 budget holders ask for a quote, or at least 3% of teacher visitors join a priced waitlist (T1 pass signal [MARKET_ANALYSIS section 10]) | Behavioural support for institutional payment. Without these, stated willingness alone does not change the plan |
| Q2-i | Group B: fewer than 25% of respondents paid for anything in this area in the last 12 months, or the Gabor-Granger share at USD 4 per month is under 10% | Do not plan an individual subscription as a meaningful revenue line |
| Q2-j | Group B: at least 40% paid for something in the last year, and 20% or more say yes at USD 4 per month, and at least 2% click through a priced fake door (T6 [MARKET_ANALYSIS section 10]) | Test a paid personal tier |
| Gap | The Group A sample is under 60 | Report as inconclusive, add recruitment rounds, do not use the thresholds |

These cut-offs are my judgement. The market model's own conversion figures (2.6% free to paid, EdTech; 3.7% SaaS; single vendor-marketing dataset, low confidence [MARKET_ANALYSIS section 4]) are not used as thresholds.

### M7. Learning-outcome pre/post test (does failure-based teaching help debugging?)

Purpose: test whether learning from deliberately triggered faults (break it, read why, fix it) improves a learner's ability to diagnose faults, compared with the same lessons without the fault trigger. Answers Q4. This is the only method here that tests learning rather than opinion.

**Design: counterbalanced crossover inside classes.** Each class does two short units on different topics (Topic 1: LED and resistor circuits; Topic 2: sensor input circuits), each 1 to 2 sessions. Half the classes (or half the students in a class, if the teacher can split the room) do Topic 1 with "fault-first" lessons and Topic 2 with "correct-first" lessons; the other half reverse. Each student is tested before and after each unit.

- Fault-first condition (F): the learner triggers a fault in Break it, reads the what/why/fix panel, then fixes it. [WORKFLOW_BENCHMARK 4.4]
- Correct-first condition (C): the same lesson without the Break it tab, plus the same what/why/fix text shown as a static "common mistakes" note, so that information content is matched and only the experience of causing and fixing the fault differs. Hiding the tab needs a build option that does not exist today (UNKNOWN effort). If it cannot be done, instruct the teacher not to use the tab and log the use count as a fidelity check.

Why not a two-group design: with classes as the unit, 12 classes per arm are needed at ICC 0.15 (ESTIMATED, assumed ICC) for d = 0.5, which is out of reach; the crossover removes class and student differences from the comparison (section 2.3).

**Sample.** Target completers: 51 students for a standardised paired difference of d_z = 0.4 (80% power, alpha 0.05, calculated); 34 for 0.5; 90 for 0.3. Plan 75 enrolled at 30% attrition (ESTIMATED), from at least 4 classes (2 per order) with teachers from the pilot or M1. Ages 15 and over, or university students; no under-13s. For participants under 18: parental permission and assent; school research approval. If approvals are not available by week 13, run the study with university first-year students first.

**Outcome measures (test written before the study, pilot-tested with 5 people for clarity).**

*Primary:* Fault diagnosis score on a 10-item test per topic, parallel forms (A and B, randomised order within condition): each item shows a circuit diagram or breadboard picture plus a symptom ("the LED does not light" / "the LED gets very hot"); the student writes (1) what is wrong, (2) why it causes the symptom, (3) how to fix it. Score each answer 0 to 2 (0 wrong, 1 partly, 2 correct cause and fix). Items: 5 near-transfer (circuits used in the lessons) and 5 far-transfer (new circuit, new board, or a physical photo). Total 0 to 20 per test. Two raters score blind to condition and time point; Cohen's kappa target 0.7 or more.

*Secondary:* (1) time to fix one hands-on fault in a simulated circuit not taught in the lesson (a different tool, to avoid teaching to the test; if impossible, label it as same-tool and treat it as weaker); (2) confidence rating (1 to 5) for each item, to compute over- or under-confidence; (3) delayed retention test two weeks later with a form not seen before; (4) short self-efficacy items written for this study, not validated; (5) time spent and fault triggers used (fidelity).

*Language:* students take the tests in their own language; record the interface language of the lesson. A subgroup comparison by language is exploratory.

**Analysis (written in pre-registration).** For each student, difference in gain (post minus pre) in F versus C. Paired t-test or Wilcoxon signed-rank on the paired difference; 95% interval; report d_z. Check order effect (order of F and C) and topic effect with a mixed model including student as a random effect; teacher as an additional random effect if at least 4 classes. Report with and without students who used under 50% of the intended time. No subgroup claims.

**Bias controls.** Same teacher for both conditions in a class. Counterbalanced order and topic. Raters blind. Tests held back from the teacher so they cannot teach to them. Near and far items reported separately. Treatment fidelity logged. Both conditions use iynk, so novelty is equal. Floor and ceiling effects checked on the pilot.

**Decision thresholds**

| Rule | If | Then |
|---|---|---|
| Q4-a | Mean F minus C difference in gain on the primary score is positive, the 95% interval excludes 0, and d_z is 0.3 or more | Make fault-first the default lesson design and the first claim in positioning; plan more fault content |
| Q4-b | The interval includes 0 and the upper bound is under 0.3 d_z | No benefit seen at this size. Keep faults as an optional exploration feature, stop writing new fault content for lessons, and drop "learn debugging" as the headline |
| Q4-c | The interval includes 0 and the upper bound is 0.3 d_z or more | Inconclusive. Replicate with a larger sample, or in a single course, before changing the roadmap |
| Q4-d | Far-transfer improves but near-transfer does not (or the reverse) | Report the split. Fault-first claims are limited to the improving kind of item |
| Q4-e | Delayed retention gain is below half of the immediate gain | Report that the effect may fade; add spaced repetition to the lessons if Q4-a holds |
| Guard | Fewer than 51 completers | State the smallest effect detectable (d_z about 0.4 at 51, wider below) and do not use Q4-b |

I did not read the learning-science literature on failure-based or "productive failure" teaching for this plan, so the expected effect size is UNKNOWN; the effect sizes above are planning values and not predictions.

## 5. How findings change the roadmap

| Gate | Evidence available | Decision | If yes | If no |
|---|---|---|---|---|
| G0 (week 3) | M2 round 1 | Are the basics usable? | Proceed | Fix task 1 to 5 failures before M3 and M4. Delay M4 by up to 2 weeks |
| G1 (week 6) | M1 (about 62 interviews), M2 round 1, fake door first 3 weeks, M6 fielding | Beachhead shortlist (up to 3 segments). First answers to Q1, Q2, Q3, Q5 | Proceed to M4, M5 with the shortlisted segments | If no segment meets Q1-a, Q2-a or Q3-a, widen recruitment to 8 more interviews per top segment before choosing |
| G2 (week 12) | M3 complete, M4 three rounds, M6 analysed, M2 round 2 | Builder go or no-go; first pricing hypothesis; language stance | If Q1-a (or Q1-f) and B-1 and Q1-j hold: schedule the builder (Phase 2 of the brief) and write the project file format first. If Q1-b or Q1-h: replace the builder with "modify a lesson" and invest in lesson depth. If mixed: builder as "modify" first; revisit at G3 | |
| G3 (week 16) | M5 pilot | Teacher adoption path | Q3-d: ship class link and publish a teacher guide; Q3-e: schedule accounts, class view and privacy Route B before school marketing; Q3-f: stop school outreach | |
| G4 (week 20) | M7 | Role of fault-based design | Q4-a: faults as the core claim; Q4-b: demote | |
| Standing | Analytics (once privacy is settled) | Share of non-English sessions; weekly return (T5 pass: above 20% weekly return [MARKET_ANALYSIS section 10]) | Used to confirm Q5 rules | |

Each gate produces `synthesis-G#.md` and a diff to the roadmap. Any roadmap change cites rows in the evidence log. Results contradicting the founders' favoured option are reported first.

## 6. Risks to the plan

| Risk | Effect | Mitigation |
|---|---|---|
| School approvals slow | M5 and M7 slip by weeks | Send requests in week 1; run adult methods first; keep university fallback |
| iynk traffic is too low for the fake door | Thresholds unusable | Promote the test through the channels in 3.4; if under 1,000 views in 6 weeks, report as underpowered |
| Price service is broken (rate limit, no searches left) | Task 8 fails and hides the real opinion of the price feature | Exclude task 8 from usability scores; test a fixed example list |
| The prototype takes longer than planned | M4 delays G2 | Use static screens in round 1 |
| Recruiting skews to enthusiasts, US, male | Biased findings | Quotas, cold recruitment, non-US channels, label strata |
| Stated prices overstate | Wrong pricing | Behavioural follow-ups (waitlist, quote requests) outweigh survey data |
| A competitor moves (a free classroom tier, price changes) | Q2 answers date quickly | Re-check Wokwi, Arduino Cloud and LabsLand prices each quarter (T9 [MARKET_ANALYSIS section 10]) |
| Research with minors creates liability | Legal and reputational | Section 2.1; lawyer review; adult-first sequence |
| Single-run benchmark results (scripted, one machine) mislead M2 task design | Tasks miss real human problems | M2 is itself the check; add tasks from round 1 findings |

## 7. Limits of this plan

- Built from desk research and the dossiers. Nothing here was validated with a person.
- The UNKNOWN items that matter most: iynk's current traffic and return rate; whether a school ICC or ethics review applies to this work; Reddit and community recruiting rules; the cost of independent ethics review; whether the Break it tab can be hidden for a control condition; whether telemetry can be fully disabled.
- The thresholds are judgements. The only external anchors are the saturation and usability literature [UR1 to UR3], the pricing methods [UR4, UR5] and the market model's own pass signals [MARKET_ANALYSIS section 10].
- Saturation and sample size figures from the literature were read from abstracts and secondary summaries in a web search, not from the full papers (the SAGE and PubMed pages did not load: HTTP 403 and a reCAPTCHA page). Check the papers before quoting percentages.
- The SUS wording, Cohen's kappa conventions and the Newton-Miller-Smith extension were not checked against sources in this task.
- The sample-size scripts `power.py` and `extra.py` live outside the repository in `/Users/amar/iynk-master-plan-scratch/research/userplan/`; the results in section 2.3 were re-computed independently in the 2026-10-27 review (see the log).

## Sources added for this plan (accessed 2026-10-27)

- [UR1] Guest, G., Bunce, A., Johnson, L. (2006). How Many Interviews Are Enough? An Experiment with Data Saturation and Variability. Field Methods 18(1), 59-82. DOI 10.1177/1525822X05279903. Read through a web-search summary (abstract and secondary summaries), not the full paper. Search results listed https://library.alnap.org/node/58582 and https://researchforevidence.fhi360.org/riddle-me-this-how-many-interviews-or-focus-groups-are-enough . The SAGE page returned HTTP 403.
- [UR2] Hennink, M. M., Kaiser, B. N., Marconi, V. C. (2017). Code Saturation Versus Meaning Saturation: How Many Interviews Are Enough? Qualitative Health Research 27(4), 591-608. Read through a web-search summary; PubMed (https://pubmed.ncbi.nlm.nih.gov/27791902/) returned a verification screen.
- [UR3] Nielsen, J. Why You Only Need to Test with 5 Users. Nielsen Norman Group. https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/ (fetched). Reports L = 31% from Nielsen and Landauer; the page gives 84%, rounded to 85%, for 5 users.
- [UR4] Gabor-Granger method: SurveyMonkey https://www.surveymonkey.com/learn/gabor-granger/ and Solvimon https://www.solvimon.com/glossary/gabor-granger (web-search summary only; the 200 to 400 per segment figure is a practitioner convention from the second; no academic source found).
- [UR5] Van Westendorp's Price Sensitivity Meter, Wikipedia https://en.wikipedia.org/wiki/Van_Westendorp%27s_Price_Sensitivity_Meter (fetched; the article flags its own weak sourcing, so the original 1976 paper should be checked).

## Backing files

Market and price figures: `MARKET_ANALYSIS.md`. Segments and scores: `USER_SEGMENTS.md`. Benchmark: `WORKFLOW_BENCHMARK.md`. Technical effort: `TECHNICAL_RESEARCH.md`. Compliance: `tech/compliance-safety.md`. Competitors: `competitors/education.md`, `competitors/circuit-eda.md`, `competitors/ecosystems.md`. Product facts: `../01_AUDIT/FEATURE_VERIFICATION.md`, `../01_AUDIT/runs/BROWSER_WALK.md`. Brief: `../BRIEF.md` sections 6.2 and 6.3.

## Review log (2026-10-27)

Adversarial review. 24 statements checked against the cited dossiers, the audit and re-computation; 2 sources re-fetched (Nielsen Norman Group; Wokwi Classroom). 11 were wrong, overclaimed or under-labelled; all are fixed in place above and marked "Review note", "Review correction" or "review".

Checked and held up: $7.4M SAM, $0.3M base SOM, $2.4M high SOM, A1 = 38% of base SAM [MARKET_ANALYSIS 6.2, 6.3]; 4 to 8 person-weeks editor core and the 400-line prototype target [TECHNICAL_RESEARCH D4]; Route A and B effort and legal ranges, Clever and LTI weeks (all ESTIMATED in the source) [compliance-safety 1.1, 4]; COPPA compliance date 22 April 2026; DPDP Rule 10 at 18 months (about 14 May 2027); GDPR Art. 8; segment scores 26, 25, 24, 23, 18 [USER_SEGMENTS 4]; 144 board failures, 106 bench faults, 71 lessons, 2,064 UI keys, 8-person rooms [FEATURE_VERIFICATION]; list prices (Wokwi Classroom EUR 30 per semester re-fetched 2026-10-27; LabsLand EUR 7.99; Arduino Maker USD 72; Wokwi Hobby EUR 5.6); community sizes and S-tags in section 3.4; the Nielsen 31% and 84 to 85% figures and the "several small rounds, 3 to 4 per group" advice (re-fetched 2026-10-27); all numbers in section 2.3 and the Wilson intervals (recomputed, normal approximation; paired sample sizes match with the usual t-correction); the budget arithmetic except as below; all file paths named.

Wrong or overclaimed, and what changed:
1. 16 Uno blink faults: the walk counted 15; added a note and the benchmark's own caveats (Tinkercad untested, Wokwi one frame).
2. "No-account entry is table stakes in K-12": rests on two products with one unconfirmed; downgraded to common, HYPOTHESIS.
3. School authorisation for under-13s: the FTC did not finalize a school exception; marked UNKNOWN, lawyer needed; M7 does not include under-13s (text said M5 and M7).
4. India child definition cited only the 2023 Bill summary; added S17 and the unread Act text.
5. Multisim Live end of life: rests on a snippet and a competitor page; relabelled thinly sourced, "ended" removed.
6. Q2-a said it matched T2; T2 says "most", 4 of 8 is looser; stated.
7. Interview total 72 against a 62-interview budget and schedule; budget high end raised (total 21,380 to 21,780) and the difference explained.
8. Timeline: weeks 7 to 12 and 9 to 16 did not match their calendar dates (off by one and two weeks); dates corrected, pilot phases spelled out.
9. M6 price ladder (USD 30 per year at most) was said to span the university anchors that are per semester; corrected.
10. Task 5 relied on a lux lesson never walked; noted as code-read only.
11. Task 8 and live sessions: the walk shows Lab tools spend search quota unprompted; added.

Not resolved: SUS wording, Cohen's kappa conventions, the saturation percentages (full papers unread), lawyer rates, and the telemetry off-switch (no run toggled it) stay UNKNOWN or unverified as the plan already says. Reddit and community pages were not opened.
