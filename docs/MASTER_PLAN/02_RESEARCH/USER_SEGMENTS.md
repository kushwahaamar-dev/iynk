# iynk user segments (desk research)

Date of research: 2026-10-26. All sources accessed 2026-10-26.

## How to read this file

- This is desk research. No interviews, surveys or user tests were run. Nothing here is an interview result.
- Labels: TESTED (done hands-on), EXTERNAL (a cited source states it), ESTIMATED (my calculation, assumptions shown), HYPOTHESIS (judgement, needs testing), UNKNOWN (not established). Nothing in this file is TESTED; I did not use iynk or the competing tools.
- Source references look like [S12] and point to the Sources list at the end.
- Forum and Hacker News quotes are anecdotal. They show that a view exists, not how common it is.
- Reddit blocked automated fetches, so no Reddit threads were read. Subreddit sizes come from third-party trackers.
- Prices are "as of 2026-10-26" and in the currency the page showed. Where two fetches of the same page showed different currencies, both are noted.
- iynk's own facts (what it does today) come from the task brief, not from a source: catalogue items and lessons only, no original-project builder yet.

## 1. Summary

1. The strongest evidence for a paying buyer is institutional: Wokwi sells a classroom licence at EUR 30 per student per semester [S10][S11], Arduino sells a School plan at $20 per member per year (the page shows a dollar sign and does not name the currency) [S31], and FIRST/VEX teams already pay registration plus kit costs [S20][S21]. Individuals pay little for simulators (Liftoff and Velocidrone about USD 20 once) [S29].
2. Free incumbents are strong at the entry level. Tinkercad is reported to have 100 million users (Autodesk, self-reported, Nov 2025; UNCONFIRMED in the fact-check: the Autodesk page returned HTTP 403, so the figure rests on a search summary) [S9]. Wokwi has a free community tier with public projects only [S10].
3. The recurring complaints in public forums are narrow library support, weak analog simulation, one board at a time, and a paid tier for private projects or libraries [S12][S13][S14][S15][S16]. All anecdotal.
4. The "cannot create an original project" gap matters for almost every segment, because a project builder is how Wokwi, Tinkercad and Arduino Cloud are actually used. The evidence for this is indirect (HYPOTHESIS).
5. Several population numbers are weak or missing: VEX team count for 2025-26, FPV pilot count, bootcamp learners, Hindi-speaking learners. They are marked UNKNOWN.

## 2. Cross-segment market context

| Fact | Value | Label | Source |
|---|---|---|---|
| Stack Overflow Developer Survey 2025 sample | over 49,000 responses, 177 countries; 11.3% are students | EXTERNAL | [S1] |
| Stack Overflow 2025 share of embedded or Arduino users | page does not report it | UNKNOWN | [S1] |
| Arduino community size | "about 30 million active users based on the IDE downloads", February 2020 (Wikipedia citing Arduino) | EXTERNAL, dated, download-based | [S19] |
| Arduino ownership | acquired by Qualcomm, reported October 2025, price undisclosed | EXTERNAL | [S19] |
| Arduino licences | IDE 2.x AGPL-3.0; legacy IDE 1.x GPL/LGPL; hardware CC BY-SA | EXTERNAL | [S19] |
| Tinkercad users | 100 million (Nov 2025, Autodesk, self-reported); Circuits module count not published | EXTERNAL | [S9] |
| micro:bit | 11.5 million devices distributed, 70 million young people benefited since 2016, 3.7 million active users in 2025, 85+ countries | EXTERNAL | [S22] |
| r/arduino members | about 789K (tracker, synced 2026-10-02); older trackers 688K to 769K | EXTERNAL, third party | [S17][S18] |
| r/embedded members | about 214K to 272K (trackers, undated) | EXTERNAL, third party | [S18] |
| r/esp32 members | about 109K to 141K (trackers, undated) | EXTERNAL, third party | [S18] |
| r/fpv and r/robotics sizes | not found | UNKNOWN | [S18] |

## 3. Segments

Each segment has the same fields. Where a field has no evidence it says UNKNOWN.

### Segment 1. High-school students learning electronics

| Field | Finding | Label | Source |
|---|---|---|---|
| Goal | Finish a class or club project, build something that works, learn the basics. Inferred from the programmes they join (FIRST, VEX, CTE). | HYPOTHESIS | [S2][S24] |
| Current tools | Tinkercad (free, 100M total users across all of Tinkercad, not only Circuits); Wokwi free tier; physical kits in class | EXTERNAL | [S9][S10] |
| Tool survey data | No usage survey for high-school electronics found | UNKNOWN | none |
| Frustrations | Tinkercad restricted to bundled libraries (Arduino Forum, 2021-10-28); the "Uno only" claim from a 2021 blog is UNCONFIRMED; analog simulation is simplified (2018 review) | EXTERNAL, anecdotal | [S12][S14] |
| Why tools fall short | Free tools cover a fixed set of parts and boards; no evidence found about how they cope with original designs | HYPOTHESIS | [S12][S14] |
| Frequency | Weekly during a course, seasonal by school calendar | HYPOTHESIS | none |
| Accuracy vs ease | Ease matters more at this level | HYPOTHESIS | none |
| Repeat use | Medium; tied to school terms | HYPOTHESIS | none |
| Switching triggers | A teacher assigns a tool; a class blocks a site; a project outgrows Tinkercad | HYPOTHESIS | none |
| Who decides purchase | Teacher or school; parents for home kits | HYPOTHESIS | none |
| Recommend iynk if | It runs on a school laptop or Chromebook without install, needs no account, and the student can keep their own project | HYPOTHESIS | none |
| Population | US secondary CTE participants 7.8 million in 2022-23 (any CTE course, not electronics only); 3.5 million concentrators [S24]. FIRST: 109,000+ FTC students (ages 12-18) 2024-25 [S2]. Electronics-specific count UNKNOWN. | EXTERNAL | [S24][S2] |
| Ability to pay | Low for the student. Households buy kits: Elegoo Uno kits listed at USD 60.12 (36 components) and USD 95.68 (63 components) at Flinn Scientific, 2025 [S32]. No evidence of students paying for a simulator. | EXTERNAL | [S32] |

### Segment 2. University engineering students

| Field | Finding | Label | Source |
|---|---|---|---|
| Goal | Pass labs, finish course projects, capstone designs | HYPOTHESIS | none |
| Current tools | Tinkercad, Wokwi, LTspice, Multisim, Proteus, physical labs. A Thai university paper piloted Wokwi because hands-on activities "often face interruption due to hardware issues" (abstract only read). | EXTERNAL | [S37] |
| Frustrations | Simulation versus real mismatch: forum threads show beginners seeing different currents and switching points in simulation than on a breadboard; causes cited are parasitics, tolerances, meter loading, wiring errors | EXTERNAL, anecdotal | [S33] |
| Why tools fall short | Fixed free-tier limits (Wokwi Community projects must be public and only Arduino Library Manager libraries are allowed; custom library upload starts at Hobby) [S10]; analog fidelity [S13] | EXTERNAL | [S10][S13] |
| Frequency | Weekly in lab terms | HYPOTHESIS | none |
| Accuracy vs ease | Accuracy matters more than for school pupils, because results are graded against measurements | HYPOTHESIS | none |
| Repeat use | High within a course, then falls | HYPOTHESIS | none |
| Switching triggers | Instructor adopts a tool; lab access is limited; remote course | HYPOTHESIS | [S11] |
| Who decides | Instructor or department sets the tool; the student pays for personal kits | HYPOTHESIS | [S11] |
| Recommend iynk if | It handles the course's board and a real analog circuit, and shows faults the lab would show | HYPOTHESIS | none |
| Population | US: ASEE counted 616,557 engineering undergraduates in fall 2019. Electrical 51,387, Computer 35,199, Electrical/Computer 11,279 gives 97,865 in electrical or computer disciplines (ESTIMATED: sum of three rows of ASEE Table 31, full-time bachelor's candidates only; fact-check CORRECTED the Electrical/Computer row, which the first draft read as 20,690, the Engineering (General) row). India: see segment 11. | EXTERNAL + ESTIMATED | [S8] |
| Ability to pay | Students: low. Institutions: Wokwi Classroom EUR 30 per student per semester, minimum 5 students [S11]. | EXTERNAL | [S11] |

### Segment 3. CS students entering embedded

| Field | Finding | Label | Source |
|---|---|---|---|
| Goal | Run C/C++ or MicroPython on a microcontroller for a course, interview prep or a first embedded role | HYPOTHESIS | none |
| Current tools | Wokwi (supports Arduino, ESP32, RP2040, MicroPython per its podcast summary), vendor IDEs, real boards | EXTERNAL | [S16 context][S10] |
| Usage data | Stack Overflow 2019 embedded share of 8.9% of professional respondents is UNCONFIRMED (the survey page was not re-fetched; the 2025 page does not mention embedded); no 2025 figure found | UNKNOWN | [S1] |
| Frustrations | Wokwi: "Wokwi is SaaS emulator with a monthly cost" and "They want you to pay and that's limiting" (Hacker News, 2026-10-18, a comment on the Show HN "Esp32sim - Run ESP32 firmware in the browser", item 50139022. That is another browser ESP32 simulator, so a possible competitor for iynk; the comment may come from its author or a fan. Not otherwise read) | EXTERNAL, anecdotal | [S16] |
| Why tools fall short | Free tier is public-only; pay for private projects and libraries | EXTERNAL | [S10] |
| Frequency | Weekly to monthly | HYPOTHESIS | none |
| Accuracy vs ease | Code-level accuracy and a debugger matter; electrical detail matters less | HYPOTHESIS | none |
| Repeat use | Medium | HYPOTHESIS | none |
| Switching triggers | Paywall, a language not supported, a course moves tools | HYPOTHESIS | [S16] |
| Who decides | Self, or instructor | HYPOTHESIS | none |
| Recommend iynk if | Python/C++ and Verilog in one place with real peripherals, free, shareable by link | HYPOTHESIS | none |
| Population | UNKNOWN (no source separates CS students entering embedded). Context: r/embedded about 214K to 272K [S18]. | UNKNOWN | [S18] |
| Ability to pay | Low to medium. Wokwi Hobby EUR 5.6/month billed annually; Hobby+ EUR 8.1/month (page showed EUR; a search snippet showed USD 7 and USD 12 per month) [S10]. | EXTERNAL | [S10] |

### Segment 4. Self-taught makers

| Field | Finding | Label | Source |
|---|---|---|---|
| Goal | Build a specific device (home sensor, robot, gadget) | HYPOTHESIS | none |
| Current tools | Arduino IDE and Cloud, Wokwi, Tinkercad, Fritzing. Arduino claims about 30M IDE downloads-based users (Feb 2020) [S19]. Arduino Cloud: Free $0; Maker $72 per year, taxes included (as of 2026-10-26; currency not named on page) [S31]. | EXTERNAL | [S19][S31] |
| Community size | r/arduino about 789K; r/esp32 about 109K to 141K (third-party trackers) | EXTERNAL | [S17][S18] |
| Frustrations | "Tinkercad has no possibility to upload a file or select an other library then a few included libraries" (Arduino Forum, 2021-10-28). "For analog stuff it is is hopeless" about Wokwi (Arduino Forum, 2025-03-02). A Tinkercad user: "It worked for simple circuits, but for mine, the astable multivibrator, it didn't for some reason" (HN, 2025-07-29). | EXTERNAL, anecdotal | [S12][S13][S15] |
| Why tools fall short | Library limits, analog, multi-board setups not supported (one forum summary) | EXTERNAL, anecdotal | [S12][S13] |
| Frequency | Weekly to monthly, project-driven | HYPOTHESIS | none |
| Accuracy vs ease | Ease first, until a build fails on real hardware; then accuracy | HYPOTHESIS | none |
| Repeat use | High if projects can be saved and resumed | HYPOTHESIS | none |
| Switching triggers | Paywall on a tool they use, a tool that cannot do their part or board | HYPOTHESIS | [S16] |
| Who decides | Self | EXTERNAL-inferred | none |
| Recommend iynk if | Original projects with the parts they actually own, live prices, share link, free | HYPOTHESIS | none |
| Population | Not countable. Proxy: r/arduino about 789K members. | EXTERNAL | [S17] |
| Ability to pay | Medium: kits USD 36 to 96 [S32], Arduino Maker $72/yr (taxes included, currency not named) [S31], Wokwi Hobby EUR 5.6/month [S10]. | EXTERNAL | [S10][S31][S32] |

### Segment 5. Robotics clubs (FIRST, VEX, university clubs)

| Field | Finding | Label | Source |
|---|---|---|---|
| Goal | Design, wire and program a competition robot within a season | EXTERNAL-inferred | [S20] |
| Current tools | Vendor IDEs, CAD, physical kits. FTC first-year materials about USD 1,500 (Driver Kit USD 295, REV Control Hub USD 350, Build Kit USD 660) plus USD 350 registration [S20]. VEX: USD 175 RECF registration fee for 2026-27 [S21]. | EXTERNAL | [S20][S21] |
| Frustrations | No direct club quotes found | UNKNOWN | none |
| Why tools fall short | Not established. Hardware is shared and scarce, which is inferred from the cost of a single kit (HYPOTHESIS). | HYPOTHESIS | [S20] |
| Frequency | Daily in build season | HYPOTHESIS | none |
| Accuracy vs ease | Accuracy against the specific controller and motors matters; wiring errors are costly | HYPOTHESIS | none |
| Repeat use | High within season; teams return yearly | HYPOTHESIS | none |
| Switching triggers | Rookie teams without hardware yet; a mentor recommends it | HYPOTHESIS | none |
| Who decides | Mentor or coach; school or sponsor pays | HYPOTHESIS | [S20] |
| Recommend iynk if | It matches the exact competition parts (REV, VEX motors, motor drivers) and works before kit arrives | HYPOTHESIS | none |
| Population | FIRST 2024-25: FLL 650,000+ students (77 countries), FTC 109,000+ (81), FRC 93,000+ (35, season 2025); 5,400 events; 114 countries [S2]. VEX: Wikipedia lists "20,000+" registered teams and V5RC 11,400, with no season given [S4]; REC Foundation reports 300+ Event Region Championships in 2025-26 [S5]. Official VEX team count 2025-26: UNKNOWN. | EXTERNAL / UNKNOWN | [S2][S4][S5] |
| Ability to pay | Medium: USD 350 + about USD 1,500 for FTC rookies [S20]. Grants: the FIRST cost page points to a Team Grant Opportunities page and lists no amounts; the earlier "50% sibling grant" claim is UNCONFIRMED and should not be used [S20]. | EXTERNAL | [S20] |

### Segment 6. Drone hobbyists (FPV)

| Field | Finding | Label | Source |
|---|---|---|---|
| Goal | Learn to fly, build and tune a quad, avoid crashes | EXTERNAL-inferred | [S30] |
| Current tools | Simulators Liftoff (USD 19.99 on Steam, confirmed 2026-10-26) and Velocidrone (about USD 20, UNCONFIRMED); Betaflight configurator. Reviews 2021-2023; current prices not confirmed. | EXTERNAL, dated | [S29] |
| Cost context | Simulator and radio under USD 100; all-in-one starter kit GBP 140 to 230; digital video setups over GBP 500 (one UK retailer) | EXTERNAL, retailer | [S30] |
| Frustrations | A guide says pilots who skip simulator practice "crash their first drone within 30 seconds" (retailer claim, anecdotal) | EXTERNAL, anecdotal | [S30] |
| Why tools fall short | Flight simulators teach flying. Part selection, wiring and weight/thrust calculations are a separate need; not established whether pilots feel this as pain | HYPOTHESIS | none |
| Frequency | Weekly in season | HYPOTHESIS | none |
| Accuracy vs ease | Accuracy of flight feel matters for sims; calculators need accuracy for safety | HYPOTHESIS | none |
| Repeat use | High for flying, low for a build tool | HYPOTHESIS | none |
| Switching triggers | A part fails or a build is planned | HYPOTHESIS | none |
| Who decides | Self | HYPOTHESIS | none |
| Recommend iynk if | The calculator and checks prevent a bad order or fire; a build plan can be saved | HYPOTHESIS | none |
| Population | No FPV pilot count found. One academic survey drew 515 FPV pilots online (sample only) [S28]. FAA, Nov 2025: 371,334 recreational registrations out of 837,513 drones, all drone types, US only (UNCONFIRMED in the fact-check: faa.gov returned HTTP 403 on two URLs and the figures rest on a search summary) [S27]. | UNKNOWN for FPV; EXTERNAL for US recreational | [S27][S28] |
| Ability to pay | Medium to high on hardware (above); one-off about USD 20 for a sim [S29] | EXTERNAL | [S29][S30] |

### Segment 7. Hackathon builders

| Field | Finding | Label | Source |
|---|---|---|---|
| Goal | Ship a working hardware or software demo in 24 to 48 hours | HYPOTHESIS | none |
| Current tools | Whatever is in the hardware lab or the builder's bag; Wokwi for pre-build | HYPOTHESIS | none |
| Frustrations | No public quotes found | UNKNOWN | none |
| Why tools fall short | Not established | UNKNOWN | none |
| Frequency | A few events per year per person | HYPOTHESIS | none |
| Accuracy vs ease | Speed matters most | HYPOTHESIS | none |
| Repeat use | Low per person; high per event organiser | HYPOTHESIS | none |
| Switching triggers | Sponsor prize track, organiser recommendation | HYPOTHESIS | none |
| Who decides | Self; organisers (e.g. MLH) shape tooling | HYPOTHESIS | none |
| Recommend iynk if | It produces a shareable demo link and a credential judges can open | HYPOTHESIS | none |
| Population | MLH 2025 season: 150,000+ hackers across 184 hackathons and programmes; 12,500+ projects (all software and hardware) [S26]. Hardware share UNKNOWN. | EXTERNAL / UNKNOWN | [S26] |
| Ability to pay | Low (students). Sponsors pay organisers; no evidence of per-builder spend | HYPOTHESIS | [S26] |

### Segment 8. Educators and schools (K-12 CTE/STEM teachers)

| Field | Finding | Label | Source |
|---|---|---|---|
| Goal | Teach electronics, coding and robotics with limited budget, device and time | HYPOTHESIS | none |
| Current tools | Tinkercad Classrooms (about 1 million teachers, Autodesk, Nov 2025; UNCONFIRMED, Autodesk page returned HTTP 403) [S9]; Arduino Cloud School plan; micro:bit; physical kits | EXTERNAL | [S9][S22][S31] |
| Frustrations | A hobby library teacher says they "sometimes do a class on using" Tinkercad Circuits (HN, 2021-01-01), which shows classroom use but no pain. No K-12 teacher pain quotes found. | EXTERNAL, anecdotal | [S15] |
| Why tools fall short | UNKNOWN. Wokwi's classroom page targets universities and colleges, not K-12 [S11]. Whether K-12 teachers want something else: HYPOTHESIS. | EXTERNAL / HYPOTHESIS | [S11] |
| Frequency | Daily in term | HYPOTHESIS | none |
| Accuracy vs ease | Ease and classroom management matter most | HYPOTHESIS | none |
| Repeat use | High if adopted for a course | HYPOTHESIS | none |
| Switching triggers | Free tool starts charging; district privacy or account rules; curriculum alignment | HYPOTHESIS | none |
| Who decides | Teacher recommends; district or CTE director buys | HYPOTHESIS | none |
| Recommend iynk if | No student accounts needed, a teacher view of student work, lessons that map to standards | HYPOTHESIS | none |
| Population | US secondary CTE participants 7.8 million, concentrators 3.5 million, 2022-23 [S24]. State examples: Nevada 70,787 high school students (46.6%) in CTE programmes of study in 2023-24 [S25]. Teacher count UNKNOWN. | EXTERNAL | [S24][S25] |
| Ability to pay | School-level: Arduino School $20 per member per year (currency not named on the page); the page lists member tiers 5 to 50, 51 to 100 and 101+ but the lowest tier text is garbled, so the "5 to 50" start is UNCONFIRMED [S31]; Wokwi Classroom EUR 30 per student per semester (university-targeted) [S11]. | EXTERNAL | [S11][S31] |

### Segment 9. Universities and maker labs (instructors, lab managers)

| Field | Finding | Label | Source |
|---|---|---|---|
| Goal | Run labs for large cohorts, including remote students, within equipment and staff limits | EXTERNAL-inferred | [S11][S37] |
| Current tools | Wokwi Classroom. A University of Central Florida instructor testimonial on the vendor page: "backbone of our fully-online embedded-systems course" for 80+ undergraduates (vendor marketing) [S11]. | EXTERNAL, vendor | [S11] |
| Frustrations | Hardware faults interrupt practice [S37]. Instructor quotes beyond vendor testimonials not found. | EXTERNAL | [S37] |
| Why tools fall short | A paid per-seat model: EUR 30 x 30 students = EUR 900 per semester, which the page itself shows [S11] | EXTERNAL | [S11] |
| Frequency | Every lab session | HYPOTHESIS | none |
| Accuracy vs ease | Both. Accuracy of boards used in the syllabus; ease for instructors to deploy | HYPOTHESIS | none |
| Repeat use | High: course repeats each term | HYPOTHESIS | none |
| Switching triggers | Per-seat cost, a new syllabus board, going remote or hybrid | HYPOTHESIS | [S11] |
| Who decides | Instructor chooses; department or lab budget pays | HYPOTHESIS | none |
| Recommend iynk if | It covers the syllabus boards, supports grading or sharing of student projects, and has a cheaper or free education plan | HYPOTHESIS | none |
| Population | ASEE 2019: about 97,865 US full-time electrical or computer undergraduates (ESTIMATED, see segment 2) [S8]. Number of institutions or instructors: UNKNOWN. | ESTIMATED / UNKNOWN | [S8] |
| Ability to pay | Highest of all segments in the evidence: a vendor has a published list price of EUR 30 per student per semester [S11] | EXTERNAL | [S11] |

### Segment 10. Advanced engineers prototyping

| Field | Finding | Label | Source |
|---|---|---|---|
| Goal | Validate firmware and CI before hardware exists | EXTERNAL-inferred | [S10] |
| Current tools | Wokwi Pro, EUR 20 per seat per month billed annually, with 2,000 monthly CI minutes (VS Code plug-in not re-checked) [S10]; vendor SDK simulators; real hardware | EXTERNAL | [S10] |
| Frustrations | A Hacker News comment: "Being able to do integration tests without the physical device itself is an absolute game changer." (2026-07-05, item 48793010, on the story "If you're a button, you have one job"; shows demand for simulation in tests, not a pain with Wokwi) | EXTERNAL, anecdotal | [S16] |
| Why tools fall short | Home-made interpreters (as iynk uses) cannot match vendor SDK or cycle-accurate behaviour; not tested | HYPOTHESIS | none |
| Frequency | Daily when in firmware phase | HYPOTHESIS | none |
| Accuracy vs ease | Accuracy matters most | HYPOTHESIS | none |
| Repeat use | High if it enters CI | HYPOTHESIS | none |
| Switching triggers | Needs a part model the incumbent lacks | HYPOTHESIS | none |
| Who decides | Engineer proposes; company buys | HYPOTHESIS | none |
| Recommend iynk if | Accuracy is documented and the tool is scriptable (the MCP server may help) | HYPOTHESIS | none |
| Population | UNKNOWN. Stack Overflow 2019 embedded share (8.9%) is UNCONFIRMED, see segment 3 [S1]. | UNKNOWN | [S1] |
| Ability to pay | Highest per seat (EUR 20 per month per seat) [S10] | EXTERNAL | [S10] |

### Segment 11 (added). Indian engineering students and colleges

Why added: the founders ship a Hindi UI, and India has the largest engineering cohort in the evidence found.

| Field | Finding | Label | Source |
|---|---|---|---|
| Goal | Pass university labs, build projects for placement | HYPOTHESIS | none |
| Current tools | UNKNOWN for India specifically | UNKNOWN | none |
| Frustrations | A Keysight case study (vendor) says graduates miss industry expectations due to old curricula and limited practical exposure. A 2022 survey of 40 faculty in 6 states found 90% agreed new labs and skill training could improve employability (small sample) [S34]. | EXTERNAL, weak | [S34] |
| Why tools fall short | Not established | UNKNOWN | none |
| Frequency, accuracy, repeat use, triggers, buyer | Not researched; likely the college decides, but unsupported | HYPOTHESIS | none |
| Recommend iynk if | Works on low bandwidth and low-end devices, has Hindi, fits university syllabus | HYPOTHESIS | none |
| Population | AISHE: B.Tech plus B.E. enrolment about 36.6 lakh (3.66 million) in 2020-21, and Engineering and Technology 11.8% of undergraduate enrolment in 2021-22 [S7]. AICTE approved intake 25.4 lakh and enrolment 14.1 lakh in 2021-22; about 44% of approved seats unfilled by the article's own numbers [S6]. Note: 3.66 million is all years; 1.41 million is the year's admissions. | EXTERNAL | [S6][S7] |
| Ability to pay | Low per student (UNKNOWN price evidence). Hindi-language learning evidence: the Raspberry Pi Foundation says it supports about 2,500 Code Clubs in India (job listing, 2026) [S35]. Hindi-specific demand: UNKNOWN. | UNKNOWN | [S35] |

### Segment 12 (added). Learners in low-resource regions

| Field | Finding | Label | Source |
|---|---|---|---|
| Goal | Learn electronics and programming without access to parts | HYPOTHESIS | none |
| Evidence of demand | micro:bit reached 70 million young people in 85+ countries via donated and subsidised hardware, funded by corporate and institutional partners (Amazon, Arm, Google, UNICEF listed as thanked) [S22]. A browser tool avoids hardware cost. | EXTERNAL | [S22] |
| Frustrations | A Thai study cites hardware faults [S37]. No regional learner quotes found. | UNKNOWN | [S37] |
| Population | Not countable from found sources | UNKNOWN | none |
| Ability to pay | Very low from users; funding would come from donors or partners (HYPOTHESIS) | HYPOTHESIS | [S22] |
| Other fields | Not established | UNKNOWN | none |

### Segment 13 (added). Homeschoolers and after-school programmes

| Field | Finding | Label | Source |
|---|---|---|---|
| Goal | Parent-led STEM projects, clubs | HYPOTHESIS | none |
| Population | US: 3.4% of K-12 students were homeschooled in 2022-23 (NCES survey via Pew); about 1.8 million, which is my calculation on a weighted total of about 53 million (ESTIMATED). An advocacy (NHERI) estimate of 3.408 million for 2024-25 was in the first draft; the Pew page does not mention NHERI, so that figure is UNKNOWN until a NHERI source is read [S23]. | EXTERNAL + ESTIMATED | [S23] |
| Programmes | Raspberry Pi Code Club network in India 2,500 clubs [S35] | EXTERNAL | [S35] |
| Other fields | No evidence found on tools used, frustrations or willingness to pay | UNKNOWN | none |

### Not researched: coding bootcamps

No sources were found that tie bootcamps to hardware simulation. Status: UNKNOWN. It is not scored.

## 4. Scoring

Rule. Each segment gets an integer from 1 (low) to 5 (high) on each dimension. These are my judgements from the evidence above, so they are HYPOTHESIS. They are not measured.

- Pain severity: how costly the unmet need is to the segment (time, money, safety). Higher means worse pain.
- Frequency: how often the problem occurs (5 = daily, 1 = a few times a year).
- iynk fit today: how well the existing catalogue and lessons serve the segment (1 = no, 5 = fully).
- iynk fit after an original-project builder: same question, assuming a builder exists.
- Reachability: how cheaply iynk can reach them with free or low-cost channels (5 = easy).
- Ability to pay: evidence of budget for tools (5 = published list prices already exist at scale).
- Distribution power: how many other users one convert can bring (5 = a teacher or lab that brings a class every term).
- Evidence strength (confidence, not a quality score): 1 = no sources beyond inference, 5 = several strong sources. It is shown but not added into the total.
- Total = the sum of the first seven columns (maximum 35).

| # | Segment | Pain | Freq | Fit today | Fit after builder | Reach | Pay | Distribution | Evidence | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | High-school students | 3 | 3 | 3 | 4 | 3 | 1 | 3 | 2 | 20 |
| 2 | University engineering students | 4 | 4 | 3 | 5 | 3 | 2 | 3 | 3 | 24 |
| 3 | CS students entering embedded | 3 | 3 | 3 | 4 | 3 | 2 | 2 | 2 | 20 |
| 4 | Self-taught makers | 3 | 4 | 2 | 5 | 4 | 3 | 3 | 3 | 24 |
| 5 | Robotics clubs | 4 | 4 | 3 | 4 | 3 | 3 | 4 | 3 | 25 |
| 6 | FPV drone hobbyists | 4 | 3 | 3 | 4 | 3 | 3 | 3 | 2 | 23 |
| 7 | Hackathon builders | 3 | 2 | 2 | 4 | 3 | 1 | 3 | 2 | 18 |
| 8 | K-12 educators and schools | 4 | 4 | 3 | 4 | 2 | 2 | 4 | 3 | 23 |
| 9 | Universities and maker labs | 4 | 4 | 3 | 5 | 2 | 4 | 4 | 3 | 26 |
| 10 | Advanced engineers | 3 | 3 | 1 | 2 | 2 | 5 | 2 | 2 | 18 |
| 11 | Indian engineering students and colleges | 4 | 4 | 3 | 5 | 3 | 1 | 4 | 2 | 24 |
| 12 | Learners in low-resource regions | 5 | 3 | 3 | 4 | 2 | 1 | 3 | 2 | 21 |
| 13 | Homeschoolers and after-school | 3 | 3 | 3 | 4 | 3 | 2 | 3 | 1 | 21 |

### Provisional ranking (HYPOTHESIS)

By total, highest first: 9 (26), 5 (25), then 2, 4 and 11 tied (24), then 6 and 8 tied (23), then 12 and 13 tied (21), then 1 and 3 tied (20), then 7 and 10 tied (18).

Cautions:
- Gaps between totals of 1 to 2 points are inside my judgement error. Treat the ranking as groups: top (9, 5), middle (2, 4, 11, 6, 8), lower (12, 13, 1, 3, 7, 10).
- Segment 9 leads mainly because a competitor already charges a list price to it. That shows willingness to pay exists for Wokwi, not that it exists for iynk.
- Evidence strength is 3 or below for every segment. No customer has been interviewed.
- This file does not pick a beachhead. The strategy phase does that.

### What would raise confidence

1. Interviews or surveys with 5 to 10 people per top group (not done).
2. Reading Reddit threads in r/arduino, r/fpv, r/robotics, r/embedded (blocked for automated fetch in this run).
3. Official VEX team count and FPV pilot count.
4. Indian college lab-infrastructure data and Hindi-medium demand evidence.

## 5. Gaps

- Reddit could not be fetched; no Reddit quotes.
- No official VEX 2025-26 team count; Wikipedia figure has no season.
- No FPV pilot population; FAA numbers are US registrations of all drones.
- No evidence on bootcamps, Hindi demand, hackathon hardware share, or K-12 teacher pain.
- The ASEE sum (97,865) was re-read from the PDF text with layout kept in the fact-check; it covers full-time bachelor's candidates in three disciplines only and is fall 2019.
- Wokwi pricing showed EUR in my fetch and USD in a search snippet. Use the live page for decisions.
- Several figures are from search-result summaries, not from full page reads. They are marked in the Sources list.

## Sources

All accessed 2026-10-26.

- [S1] Stack Overflow Developer Survey 2025. https://survey.stackoverflow.co/2025/ (Stack Overflow; 2025). The embedded share of professionals in 2019 (8.9%) comes from https://survey.stackoverflow.co/2019 as reported by a search summary, not fetched.
- [S2] FIRST impact page. https://www.firstinspires.org/about/impact (FIRST; seasons 2023-24 to 2025).
- [S3] FIRST about page. https://www.firstinspires.org/about/ (FIRST; undated). Used only for "more than 100 countries" context; the impact page numbers are used instead.
- [S4] VEX Robotics. https://en.wikipedia.org/wiki/VEX_Robotics (Wikipedia; season not stated). Numbers came from a search summary of the infobox.
- [S5] REC Foundation impact newsletter, March 2026. https://recf.org/impact-newsletter-march-2026/ (REC Foundation; 2025-26 season).
- [S6] BTech in India: Waning seats, declining enrolment, shows AICTE data. https://news.careers360.com/btech-engineering-college-aicte-data-course-placement-admission-graduation-aishe-vacant-seats (Careers360, 2023-04-27; AICTE years 2019-20 to 2021-22).
- [S7] AISHE 2021-22 coverage and B.Tech/B.E. enrolment. https://news.careers360.com/aishe-report-2022-highest-enrolment-in-ba-courses-maximum-phd-students-in-engineering-and-tech-stream and the AISHE book https://education.gov.in/sites/upload_files/mhrd/files/statistics-new/AISHE%20Book_2021-22_4.pdf (Ministry of Education; 2021-22). The 36.6 lakh figure is for 2020-21 as reasoned by a search summary; neither page was fetched.
- [S8] Engineering by the Numbers 2021 (ASEE). https://ira.asee.org/wp-content/uploads/2021/02/Engineering-by-the-Numbers-FINAL-2021.pdf (ASEE; fall 2019 data). Read from the PDF with pdftotext.
- [S9] Autodesk, cloud CAD and Tinkercad 100 million users. https://www.autodesk.com/products/fusion-360/blog/autodesk-the-first-to-pioneer-cloud-cad-with-over-55-million-users-today/ (Autodesk; Nov 2025). From a search summary, not fetched.
- [S10] Wokwi pricing. https://wokwi.com/pricing (Wokwi; as of 2026-10-26, EUR in my fetch).
- [S11] Wokwi Classroom. https://wokwi.com/classroom (Wokwi; as of 2026-10-26, copyright 2019-2026).
- [S12] Looking for an Arduino simulator. https://forum.arduino.cc/t/looking-for-an-arduino-simulator/919632 (Arduino Forum; posts of 2021-10-28).
- [S13] Simulator. Which one is better? https://forum.arduino.cc/t/simulator-which-one-is-better/1359552 (Arduino Forum; posts of 2025-03-02 and 2025-03-03).
- [S14] A First Impression of Tinkercad Circuits. https://www.norwegiancreations.com/2018/11/a-first-impression-of-tinkercad-circuits/ (Norwegian Creations; 2018). From a search summary.
- [S15] Hacker News comments on Tinkercad Circuits, via https://hn.algolia.com/api/v1/search?query=tinkercad%20circuits&tags=comment (Hacker News; items https://news.ycombinator.com/item?id=44729536, 25600807, 31657664; 2021 to 2025).
- [S16] Hacker News comments on Wokwi, via https://hn.algolia.com/api/v1/search?query=wokwi&tags=comment (items https://news.ycombinator.com/item?id=50139022, 50137063, 48793010; 2026-07 and 2026-10). Thread context not read. Wokwi supported targets: confirmed from https://docs.wokwi.com/ (Arduino Uno and Mega, ESP32, STM32, ATtiny85, Raspberry Pi Pico, MicroPython on Pico; list not complete).
- [S17] r/arduino. https://thehiveindex.com/communities/r-arduino/ (The Hive Index; synced 2026-10-02, third party).
- [S18] Subreddit trackers. https://gummysearch.com/r/esp32 and https://thehiveindex.com/communities/r-embedded/ (third parties; undated; from search summaries).
- [S19] Arduino. https://en.wikipedia.org/wiki/Arduino (Wikipedia; Qualcomm acquisition October 2025; IDE 2.3.10 June 2026).
- [S20] FIRST Tech Challenge cost and registration. https://www.firstinspires.org/robotics/ftc/cost-and-registration (FIRST; 2026-27 season, USD).
- [S21] RECF 2026-2027 registration fee. https://recf.org/faq/what-is-the-team-registration-fee-for-the-2026-2027-recf-robotics-competition-season/ (REC Foundation; 2026-27, USD 175).
- [S22] micro:bit, our impact in 2025. https://microbit.org/news/2025-12-29/our-impact-in-2025/ (micro:bit Educational Foundation; 2025-12-29).
- [S23] A look at homeschooling in the US. https://www.pewresearch.org/short-reads/2025/02/20/a-look-at-homeschooling-in-the-us/ (Pew Research Center; 2025-02-20; NCES PFI survey 2023). NHERI figure from a search summary.
- [S24] OCTAE releases 2022-23 Perkins enrollment and performance data. https://www.acteonline.org/blog/cte-policy-watch/octae-releases-2022-23-perkins-enrollment-and-performance-data/ (ACTE; 2022-23). From a search summary.
- [S25] Nevada CTE report. https://www.leg.state.nv.us/App/InterimCommittee/REL/Document/30761 (Nevada Legislature; 2023-24). From a search summary.
- [S26] Welcome to the 2026 hackathon season. https://blog.mlh.com/welcome-to-the-2026-hackathon-season-07-08-2025 (Major League Hacking; 2025-07-08; the old news.mlh.io URL redirects here). Fetched in the fact-check.
- [S27] FAA Drones by the Numbers. https://www.faa.gov/node/54496 (FAA; November 2025). From a search summary.
- [S28] FPV pilot survey paper. https://ceur-ws.org/Vol-2617/paper6.pdf (CEUR-WS; 2020 volume). From a search summary.
- [S29] The Best FPV Drone Simulators. https://oscarliang.com/fpv-simulator/ and https://dronedj.com/2021/05/09/best-fpv-drone-simulators-in-2021/ (Oscar Liang, DroneDJ; 2021 to 2026). Prices from a search summary.
- [S30] What we tell every customer who asks how much does FPV cost. https://www.unmannedtechshop.co.uk/blogs/knowledge-base/how-much-does-it-cost-to-get-into-fpv (UK retailer; undated, GBP).
- [S31] Arduino Cloud plans. https://cloud.arduino.cc/plans/ (Arduino; as of 2026-10-26, USD symbol, currency not named).
- [S32] Flinn Scientific Elegoo Uno kits. https://www.flinnsci.com/arduino-super-starter-kit/ap9875 (Flinn; 2025 prices, USD). From a search summary.
- [S33] All About Circuits simulation vs real threads. https://forum.allaboutcircuits.com/threads/unable-to-understand-big-difference-between-simulation-and-real-life-circuit-simple-light-detector.191139/ and https://www.circuitlab.com/forums/support/topic/q4uhbkp8/modeled-circuit-wont-work (forums; various dates). From search summaries.
- [S34] Keysight PSG case study https://www.keysight.com/at/de/assets/7018-06641/case-studies/5992-4005.pdf (vendor); faculty survey https://zenodo.org/records/7887961 (Zenodo; 2022). From search summaries.
- [S35] Raspberry Pi Foundation National Program Manager (Code Club) listing. https://apply.workable.com/raspberrypifoundation/jobs/view/73604FF579.md (Raspberry Pi Foundation; 2026). From a search summary.
- [S37] Enhancing Embedded Systems Education Through Simulation: KMUTT Ratchaburi. https://kirim.kmutt.ac.th/converis/portal/detail/Publication/1533771335?lang=en_GB (KMUTT; 2025). Abstract only.

## Fact-check log (2026-10-26)

Checker: second researcher. Method: re-fetched the cited page (WebFetch) or recomputed from the downloaded file. The web search budget ran out mid-check, so claims that needed a search to find a better source stayed unconfirmed. Sources not listed in the Sources section above are added below the table.

| # | Claim | Verdict | Source |
|---|---|---|---|
| 1 | Wokwi Hobby EUR 5.60, Hobby+ EUR 8.10, Pro EUR 20 per seat, all annual billing; Pro 2,000 CI minutes; Community public-only, Library Manager only | confirmed (Community library wording refined) | [S10] |
| 2 | Wokwi Classroom EUR 30 per student per semester, minimum 5, universities and colleges not K-12, UCF quote | confirmed | [S11] |
| 3 | Arduino Cloud Free $0, Maker $72/yr, School $20 per member per year | confirmed on numbers; currency not named; Maker includes taxes; School lowest tier text garbled so "5 to 50" unconfirmed | [S31] |
| 4 | Tinkercad 100 million users; 1 million teachers | unconfirmed (HTTP 403 on two Autodesk URLs) | [S9] |
| 5 | FIRST 2024-25: FLL 650,000+ (77), FTC 109,000+ (81), FRC 93,000+ (35, 2025), 5,400 events, 114 countries | confirmed | [S2] |
| 6 | FTC 2026-27: USD 350 registration, about USD 1,500 materials, Driver Kit 295, Control Hub 350, Build Kit 660 | confirmed | [S20] |
| 6b | FTC 50% sibling grant | unconfirmed, page lists no grant amounts; marked UNCONFIRMED in text | [S20] |
| 7 | RECF 2026-27 registration USD 175 | confirmed | [S21] |
| 8 | micro:bit 11.5M devices, 70M young people, 3.7M active users 2025, 85+ countries, funders thanked | confirmed | [S22] |
| 9 | Arduino: Qualcomm October 2025 undisclosed price; 30M users Feb 2020 download-based; IDE 2.x AGPL-3.0, 1.x GPL/LGPL; IDE 2.3.10 | confirmed (read of first 100,000 characters of the Wikipedia page only; Wikipedia is secondary) | [S19] |
| 10 | Stack Overflow 2025: 49,000+ responses, 177 countries, 11.3% students; no embedded data | confirmed; the 2019 embedded 8.9% figure unconfirmed | [S1] |
| 11 | ASEE fall 2019: 616,557 undergraduates; Electrical 51,387, Computer 35,199, Electrical/Computer 20,690 | corrected: Electrical/Computer is 11,279 (20,690 is Engineering General); sum is 97,865 not about 107,000; total 616,557 confirmed | [S8] |
| 12 | MLH: 150,000+ hackers, 184 hackathons and programmes, 12,500+ projects | confirmed (URL updated to blog.mlh.com) | [S26] |
| 13 | Pew: 3.4% homeschooled 2022-23, base about 53 million, 1.8 million is a calculation | confirmed; NHERI 3.408 million not on that page, downgraded to UNKNOWN | [S23] |
| 14 | ACTE: 7.8 million secondary CTE participants, 3.5 million concentrators, 2022-23 | confirmed | [S24] |
| 15 | Hacker News quotes: "SaaS emulator with a monthly cost" (2026-10-18), "integration tests without the physical device" (2026-07-05), Tinkercad multivibrator (2025-07-29) | confirmed; context added (the first is on a Show HN for a competing browser ESP32 simulator) | [S16][S15] |
| 16 | Arduino Forum quotes: Tinkercad libraries (2021-10-28 reply), "For analog stuff it is is hopeless" about Wokwi (2025-03-02) | confirmed | [S12][S13] |
| 17 | VEX 20,000+ teams, V5RC 11,400, no season; RECF 300+ Event Region Championships 2025-26 | confirmed (Wikipedia gives no year) | [S4][S5] |
| 18 | Liftoff USD 19.99 on Steam | confirmed; Velocidrone about USD 20 unconfirmed | [S29][S36] |
| 19 | r/arduino about 789K members, synced 2026-10-02 | confirmed (third-party tracker) | [S17] |
| 20 | FAA Nov 2025: 371,334 recreational of 837,513 | unconfirmed (HTTP 403) | [S27] |
| 21 | Wokwi targets: Arduino, ESP32, RP2040/Pico, MicroPython | confirmed from Wokwi docs (Pico; RP2040 not named verbatim) | [S38] |
| 22 | "Uno only" Tinkercad claim from a 2021 blog; Velocidrone price; Keysight, KMUTT, Nevada, Raspberry Pi Code Club (2,500), CEUR 515 pilots, AAC forum threads, Flinn kit prices | unconfirmed, not re-opened in this check | [S14][S34][S37][S25][S35][S28][S33][S32] |

Counts: 22 rows checked. Wrong or corrected: 2 claims (ASEE Electrical/Computer row and sum; NHERI figure not on the cited page), plus 1 dead-redirect link replaced (MLH) and 1 weak source replaced (Wokwi targets). Unconfirmed items are in rows 3, 4, 6b, 10, 18, 20 and 22.

Added sources (accessed 2026-10-26):

- [S36] Liftoff: FPV Drone Racing. https://store.steampowered.com/app/410340/Liftoff_FPV_Drone_Racing/ (Steam, LuGus Studios; USD 19.99 as of 2026-10-26).
- [S38] Wokwi Docs. https://docs.wokwi.com/ (Wokwi; as of 2026-10-26).
- [S39] Original ASEE PDF text re-read with pdftotext -layout (same URL as [S8]), Table 31, page 24.
