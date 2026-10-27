# Compliance, safety and accessibility research for iynk

Prepared 2026-10-26 for the master plan council. This is research, not legal advice. Every legal conclusion needs review by a lawyer who works in education privacy before iynk markets to schools or to children under 13.

Labels: TESTED, EXTERNAL (a cited source states it), ESTIMATED (my calculation, assumptions shown), HYPOTHESIS, UNKNOWN. Sources are numbered in "## Sources" at the end. All access dates are 2026-10-26. Where a page would not load I say so and mark the point UNKNOWN or label the fallback source.

## 0. What iynk does today that triggers law

From the repo audit (`docs/MASTER_PLAN/01_AUDIT/SECURITY_BASELINE.md` and `inventory/`, both read 2026-10-26):

| Feature | Fact today | Source |
|---|---|---|
| Accounts | None. No authentication on any of the 23 API routes. | [S40] (VERIFIED by the audit, not re-tested by me) |
| Telemetry | On by default, random per-browser id, events carry the room code, no consent step, no privacy policy page. IP hash goes to the model provider as a user id. | [S40] |
| Chat in rooms | Up to 8 people per room, join by 6-character code, no moderation, no report or block. Chat text goes to a third-party AI for translation. | [S40], [S41] |
| Voice | Push-to-talk audio is sent to Meta for transcription. Not stored by iynk. No consent text or age gate. | [S40] |
| AI lab partner | Meta Muse Spark with Gemini fallback. Free text from users goes into prompts. | [S40], task brief |
| Build Buddies | 24-hour opt-in pool with self-chosen name, language, interests, free-text "wants" (280 chars). No location field today. Public read of newest 50 profiles. | [S41] |
| Leaderboard | Public names and self-reported lap times. | [S40] |
| Solana credentials | Devnet only. Minted to any wallet address supplied by the caller. | [S40] |

Consequence: the product today is a general-audience site with child-friendly content and no age signal. Under COPPA that is the riskiest place to be, because the content is likely to attract children (see 1.1).

## 1. Privacy law for children and students

### 1.1 COPPA (US) and the FTC's 2025 amended rule

| Point | Finding | Label | Source |
|---|---|---|---|
| Amended rule published | 22 April 2025 (Federal Register vol. 90, no. 76). | EXTERNAL | [S1] |
| Effective date | 23 June 2025. | EXTERNAL | [S1] |
| Compliance date | 22 April 2026, except 16 CFR 312.11(d)(1), (d)(4) and (g), which the rule text carves out of that date (the part of the notice I re-read gives them no separate date, so their timing is UNKNOWN here). The date has passed, so iynk is already expected to comply. | EXTERNAL | [S1] |
| Core duty | Verifiable parental consent before any collection, use or disclosure of a child's (under 13) personal information. Re-consent for material changes. | EXTERNAL | [S2] |
| New: separate consent for third-party disclosure | If an operator discloses to third parties (unless integral to the service) it must offer parents a choice and get separate verifiable consent for the disclosure. | EXTERNAL | [S2], [S3] |
| New: data retention | Keep children's data only as long as reasonably necessary for the specific purpose. A written retention policy is required, stating purposes, business need and deletion timeframe, and it must appear in the notice. No indefinite retention. | EXTERNAL | [S4] |
| New: security program | A written information security program, a named coordinator, risk assessment at least yearly, safeguards tested, program updated at least yearly, and written assurances from third parties that receive the data. | EXTERNAL | [S5] |
| New: personal information definition | Adds biometric identifiers and government-issued identifiers. | EXTERNAL | [S1], [S3] |
| Mixed audience | Remains a subset of child-directed. Age screening is allowed only if the operator collects no personal information before asking age. A mixed-audience site may not block under-13 users altogether. | EXTERNAL | [S1], [S6] |
| Schools | The FTC did not finalize its proposed school authorization exception. It deferred it to avoid conflict with possible Department of Education FERPA changes and says it will keep enforcing COPPA in ed tech "under existing guidance". The FTC FAQ section on schools (section N) was not in the part of the page I could read. | EXTERNAL (final rule text); FAQ section N UNKNOWN to me | [S1], [S6] |
| Targeted ads / push limits | The proposed push notification limits and ed-tech changes were not finalized. | EXTERNAL | [S3] |
| AI chatbots and kids | On 11 Sept 2025 the FTC issued 6(b) orders to seven companies (Alphabet, Character Technologies, Instagram, Meta, OpenAI, Snap, xAI) about companion chatbots, including COPPA compliance and harm to minors. Shows regulator attention, not a rule on iynk. | EXTERNAL | [S7] |
| Penalty amount | UNKNOWN. I did not retrieve the current per-violation civil penalty figure from a primary source. One vendor blog states a figure, which I did not verify and do not repeat. | UNKNOWN | n/a |

Triggers in iynk:
- Telemetry with a persistent random id is a persistent identifier. For a child-directed or mixed-audience service this is personal information. Default-on telemetry with no consent step is a likely violation if users are under 13. HYPOTHESIS on whether iynk is "directed to children"; the FTC looks at content, imagery, language, and audience evidence, and iynk's own marketing to schools and under-13s would settle the question.
- Chat, voice, Build Buddies free text and names are personal information. Voice audio sent to Meta is a disclosure to a third party, which triggers the separate-consent rule if not integral to the service. The AI feature is arguably integral, but telemetry and any analytics are not.
- Leaderboard names are personal information if they can be a real name.
- Wallet addresses are persistent identifiers. Location (Build Buddies planned) is personal information under COPPA.

Minimum viable compliance step (two routes):
1. Route A, "not for under 13": state 13+ in terms, add a neutral age screen before any data collection or chat, and block data collection for under-13 users. Risk: if the site is still child-directed in content, the FTC treats it as child-directed and a mixed audience site may not block children. So Route A only works if the content and marketing are plausibly general or teen audience.
2. Route B, "child-directed, compliant": verifiable parental consent (email plus, card micro-charge, signed form, or an approved method), a privacy notice, a written retention policy, a written security program, telemetry off by default, no third-party sharing beyond processors under contract, and a parent dashboard to review and delete.

Cost/effort ESTIMATED (assumptions: one founder-engineer, a part-time education privacy lawyer at USD 300 to 500 per hour, which I did not source):
- Route A: 1 to 2 engineering weeks, 5 to 10 lawyer hours (USD 1,500 to 5,000). 
- Route B: 6 to 10 engineering weeks (account system, parent flow, deletion, data map), 20 to 40 lawyer hours (USD 6,000 to 20,000), plus a consent-verification provider or card-charge fee (UNKNOWN price).
- FTC-approved safe harbor programs exist; I did not retrieve their fees. UNKNOWN.

### 1.2 FERPA (US) and the school official exception

| Point | Finding | Label | Source |
|---|---|---|---|
| Scope | FERPA protects education records held by schools that receive US Department of Education funds. It binds schools, not vendors directly. Rights pass to the student at 18. | EXTERNAL | [S8] |
| School official exception | A school may share records without consent with a contractor if the contractor performs a function the school would otherwise use employees for, is under the school's direct control for use and maintenance of the records, and follows the redisclosure limits in 34 CFR 99.33(a). The school must set criteria for "legitimate educational interests" in its annual notice. | EXTERNAL | [S8], [S9] |
| Directory information | Information that would not generally be harmful if disclosed (examples: name, address, enrollment status). A school may disclose it only after public notice with an opt-out. SSNs are excluded; student IDs only under conditions. | EXTERNAL | [S8] |

Triggers: only when a school gives iynk student data (rosters from Clever or ClassLink, student work, teacher dashboards). With no accounts today, iynk holds no education records.

Minimum viable step: a data processing agreement that states iynk acts as a school official under direct control, uses data only for the contracted purpose, does not redisclose, and deletes on request. Do not use student data for model training or advertising. Do not rely on "directory information" to get names into iynk; get roster data through the school's SSO or rostering flow.

Effort ESTIMATED: 1 to 2 weeks to write the contract set (lawyer 10 to 20 hours) and to build deletion on request.

### 1.3 State student-privacy laws

| Law | What it requires | Label | Source |
|---|---|---|---|
| California SOPIPA (Bus. & Prof. Code 22584) | For K-12 online services: bans targeted advertising, building profiles for non-educational purposes, selling student data; requires reasonable security and deletion on school request. Primary text page returned HTTP 403 to me, and the California AG SOPIPA page returned 404. The summary here is from the statute's known structure and is UNVERIFIED by me this session. | UNKNOWN until read at the link | [S10] (link only) |
| SDPC National Data Privacy Agreement (NDPA) | A shared contract between districts and vendors. Current listed version is NDPA v2.2 Standard. The SDPC home page [S11] shows 233,924 "active" DPAs uploaded to its registry and says over 295,000 standard DPAs have been executed since 2016; it also names 41 states with participating districts. The NDPA page [S12] says it supports more than 222,000 signed agreements across 13,000+ districts and 35 state alliances, and repeats 295,000 as the cumulative count since 2016. These are different measures (cumulative, active in registry, currently supported), not a conflict in one number; none is audited (as of 2026-10-26). The web copy is reference only; community members request a fillable copy. How a vendor signs and whether an "Exhibit E general offer" exists is not stated on the pages I could read. | EXTERNAL (existence, version, scale); signing process UNKNOWN | [S11], [S12] |
| Other states (for example New York Education Law 2-d, Illinois SOPPA) | Not researched. UNKNOWN. | UNKNOWN | n/a |

Minimum viable step: adopt NDPA v2.2 as the default DPA, so a district can sign without negotiation. Effort ESTIMATED 1 week plus lawyer review (5 to 10 hours). Membership or signatory badge costs: UNKNOWN.

### 1.4 GDPR Art. 8 and the UK Age Appropriate Design Code

| Point | Finding | Label | Source |
|---|---|---|---|
| GDPR Art. 8 | Where consent is the lawful basis and a service is offered directly to a child, processing is lawful from age 16; below that, the holder of parental responsibility must give or authorise consent. Member States may lower this, not below 13. The controller must make reasonable efforts to verify, taking technology into account. | EXTERNAL | [S13] |
| UK age | 13 under UK GDPR Art. 8. A service counts as offered directly to a child if it targets children, has no age restriction, or allows under-18s. An 18+ restriction must be enforced in practice. The ICO page is labelled "old", so check for changes after the Data (Use and Access) Act 2025. | EXTERNAL; Act changes UNKNOWN | [S14] |
| UK Children's code | 15 standards: best interests of the child, DPIAs, age appropriate application, transparency, detrimental use of data, policies and community standards, default settings, data minimisation, data sharing, geolocation, parental controls, profiling, nudge techniques, connected toys and devices, online tools. Applies to information society services likely to be accessed by children. | EXTERNAL | [S15] |

Triggers: any EU or UK visitor when iynk uses consent as the basis for telemetry, chat or AI. iynk is not geo-fenced and serves six UI languages, so EU/UK reach is assumed.

Minimum viable step: telemetry off by default; no consent-based processing for under-16 (EU) or under-13 (UK) without parental consent; high-privacy defaults (no public profile, no location, chat off or limited); a DPIA document; a privacy notice written for a child reader; geolocation off by default (standard 10). Effort ESTIMATED: 2 to 4 weeks of engineering on defaults, 1 week to write a DPIA, 10 to 20 lawyer hours. An EU representative (GDPR Art. 27) may be needed if iynk has no EU establishment; I did not research that. UNKNOWN.

### 1.5 India DPDP Act 2023 and Rules

| Point | Finding | Label | Source |
|---|---|---|---|
| Child | Anyone under 18. Data fiduciaries need verifiable consent of a parent or lawful guardian before processing a child's data and must not process in a way that harms child well-being. The PRS page summarises the Bill, which it lists as passed by the Lok Sabha on 7 Aug 2023 and the Rajya Sabha on 9 Aug 2023; the page does not itself confirm assent, so check the enacted Act text. | EXTERNAL (Bill summary) | [S16] |
| Penalty | Up to Rs 200 crore for breach of obligations towards children (Bill schedule as summarised by PRS). | EXTERNAL | [S16] |
| Rules | The DPDP Rules 2025 were notified on 14 November 2025 (SCC Online). Rules 1, 2 and 17 to 21 apply on publication; Rule 4 (consent managers) applies on a later date, which that article says is not yet notified (other law-firm summaries say about a year after publication; not confirmed); Rules 3, 5 to 16, 22 and 23 apply 18 months after publication. Rule 10 requires verifiable parental or guardian consent using reliable identity and age checks. Rule 12 gives narrow exemptions from the children's data restrictions for some classes of fiduciary and purposes (Fourth Schedule). Whether educational institutions are among them: UNKNOWN (the earlier claim of an educational exemption is not supported by the page I re-read). Secondary source, not the Gazette; official MeitY and PIB pages returned HTTP 403. | EXTERNAL (secondary); details UNKNOWN | [S17], [S47] |
| Date arithmetic | 18 months after 14 Nov 2025 is about 14 May 2027; law-firm summaries give 13 or 14 May 2027, so the exact day varies by source. | ESTIMATED | [S17], [S47] |

Triggers: any user in India, which is likely given the mission. The age line is 18, so "teen" users in India are still children. Chat, voice, telemetry and AI all count as processing.

Minimum viable step: treat every user as a child in India until parental consent is captured; no tracking, behavioural monitoring or targeted advertising of children. Effort ESTIMATED: reuse Route B parent-consent flow; add 1 week for India-specific notice text. Legal reading of the Rules is needed. A Data Protection Board registration or consent-manager details: UNKNOWN.

### 1.6 Brazil LGPD, children (Art. 14)

| Point | Finding | Label | Source |
|---|---|---|---|
| Best interest | Processing of children's and adolescents' data must be in their best interest. | EXTERNAL | [S18] |
| Consent | For children's data, specific and prominent consent from at least one parent or guardian. | EXTERNAL | [S18] |
| Exceptions | Collection without consent only to contact the parent (once, not stored) or to protect the child, and no passing to third parties without consent. | EXTERNAL | [S18] |
| No excess data | A child's participation in games or apps cannot depend on providing more data than strictly needed. | EXTERNAL | [S18] |
| Notices | Information must be simple and suited to the child and parent. | EXTERNAL | [S18] |

The page read was the first 100,000 of 125,310 characters. In Brazilian law the child/adolescent split (12) comes from the ECA statute, which I did not read here. UNKNOWN.

Triggers: Brazilian users. Minimum viable step: same as Route B; a Portuguese notice. Effort ESTIMATED: 3 to 5 days over Route B.

## 2. EU AI Act and an educational AI tutor

| Question | Finding | Label | Source |
|---|---|---|---|
| Is education a high-risk use? | Annex III point 3 lists four uses: (a) determining access or admission or assigning people to institutions; (b) evaluating learning outcomes, including when used to steer the learning process; (c) assessing the appropriate level of education a person will receive; (d) monitoring and detecting prohibited behaviour of students during tests. A general lab partner that answers questions and explains circuits is not in that list. It becomes high-risk if iynk grades students, places them, steers a track from assessed outcomes, or proctors tests. | EXTERNAL (list); conclusion for iynk HYPOTHESIS | [S19] |
| Escape hatch | Art. 6(3): an Annex III system is not high-risk if it does only a narrow procedural task, improves a completed human activity, detects patterns without replacing human review, or does a preparatory task, but any Annex III system that profiles natural persons is always high-risk. The provider must document the assessment and register it. | EXTERNAL | [S20] |
| Prohibited practice: emotion inference in education | Art. 5(1)(f) bans inferring emotions in workplaces and education institutions, except for medical or safety reasons. iynk must not infer emotion from voice or camera for learners. | EXTERNAL | [S21] |
| Prohibited practice: age vulnerability | Art. 5(1)(b) bans AI that exploits vulnerabilities due to age and materially distorts behaviour causing significant harm. Relevant to engagement design for children. | EXTERNAL | [S21] |
| AI literacy | Art. 4: providers and deployers must take measures to ensure AI literacy of staff and others operating AI systems for them. Applies since 2 Feb 2025. The page shows Art. 4 as amended; the text of the amendment is unclear to me. | EXTERNAL; amendment details UNKNOWN | [S22], [S23] |
| Transparency | Art. 50(1): providers must design AI systems that interact directly with people so people are informed they are talking to an AI, unless obvious. Art. 50(2): providers of systems generating synthetic audio, image, video or text must mark outputs in a machine-readable way. Applies from 2 Aug 2026; a transition to 2 Dec 2026 applies to synthetic-content systems already on the market before 2 Aug 2026. | EXTERNAL | [S22], [S24] |
| High-risk dates | The Commission's timeline page lists Annex III high-risk obligations from 2 Dec 2027, marked as amended by the Digital Omnibus on AI, and Annex I from 2 Aug 2028. The page does not say whether the omnibus is adopted or proposed. I could not read the Commission's omnibus page (HTTP 403). The original date for Annex III was 2 Aug 2026 (the AI Act timeline page lists "24 months" after entry into force on 1 Aug 2024, and the Commission page shows 2 Aug 2026 for the start of most rules). | EXTERNAL; legal status of the omnibus UNKNOWN | [S22], [S25] |
| Provider vs deployer | iynk builds the lab partner on top of Meta Muse Spark and Gemini. iynk is a deployer of those general-purpose models, and a provider of its own AI system (the lab partner) under its own name. The model vendors carry general-purpose AI model duties (in application since 2 Aug 2025). Schools that adopt iynk are deployers of iynk's system. | HYPOTHESIS | [S22] |

Triggers: EU users of the AI partner, voice, any grading or "mastery score" feature, any adaptive path that steers learners from assessed outcomes, any proctoring of tests.

Minimum viable step: (1) label AI replies as AI inside the product and in chat; (2) do not add emotion detection; (3) do not add grading, placement or test proctoring without a high-risk plan; (4) write an Art. 6(3) memo if iynk later adds assessment; (5) a short staff AI literacy note. Effort ESTIMATED: 2 to 3 days of engineering, 1 to 2 days to write the memo, 5 lawyer hours. A conformity assessment for a real high-risk system would be much larger; I did not find a sourced cost. UNKNOWN.

Provider terms that touch children (important):

| Provider | Finding | Source |
|---|---|---|
| Google Gemini API | Terms say "You must be 18 years of age or older to use the APIs" and prohibit use in an API client directed towards or likely to be accessed by anyone under 18. Unpaid services let Google use prompts and responses to improve products, with human review possible; paid services do not (Google still logs for a limited time to detect policy violations). For API clients available to users in the EEA, only Paid Services may be used; in the EEA, Switzerland and UK the paid data terms apply to all services. Re-checked 2026-10-26. | [S26] |
| Meta Muse Spark API | Terms not retrieved. UNKNOWN. Must be read before any under-18 launch. | n/a |

This is a release blocker candidate: a Gemini fallback inside a product likely to be accessed by under-18s appears to conflict with the stated terms. Label: EXTERNAL (terms), conclusion HYPOTHESIS until a lawyer or Google confirms. Options: drop Gemini for minors, use a provider whose terms allow children under a DPA, or get written permission.

## 3. Accessibility

| Law | What it requires | When | Label | Source |
|---|---|---|---|---|
| WCAG 2.2 | W3C Recommendation, 12 Dec 2024. Adds six A/AA criteria: 3.2.6 Consistent Help (A), 3.3.7 Redundant Entry (A), 2.4.11 Focus Not Obscured (Minimum), 2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum), 3.3.8 Accessible Authentication (Minimum) (the other four are AA). Also adds three AAA criteria (2.4.12, 2.4.13, 3.3.9), nine new in total. Removes 4.1.1 Parsing. | Voluntary baseline | EXTERNAL | [S27] |
| ADA Title II web rule (US) | Applies to state and local government web content and mobile apps; technical standard WCAG 2.1 Level AA. After an Interim Final Rule published 20 April 2026, compliance dates are 26 April 2027 for entities with 50,000 or more people and 26 April 2028 for smaller ones and special districts. I could not read the IFR itself, and I did not retrieve the pre-extension dates from a primary source. | Dates above | EXTERNAL | [S28], [S29] |
| European Accessibility Act (Directive 2019/882) | Applies from 28 June 2025. Covers e-commerce and consumer banking among other products and services; services by microenterprises are exempt under Art. 4(5). Other details (for example EN 301 549 as the harmonised standard) were not on the pages I read. | Now | EXTERNAL (Art. 4(5) text via [S48]); 28 June 2025 date is from secondary guides only, since the EUR-Lex page returned empty text in the fact-check; microenterprise size test (cumulative or not) and whether Annex I Section IV services stay covered: UNKNOWN, needs a lawyer; EN 301 549 link UNKNOWN | [S30], [S48] |
| VPAT / ACR | ITI's VPAT 2.5 has editions for Section 508 (WCAG 2.0), EU (EN 301 549, WCAG 2.1), WCAG (2.2) and INT. Self-reported; ITI does not review or certify. Solicitations may demand third-party review. | Procurement | EXTERNAL | [S31] |

Triggers:
- ADA Title II binds public schools and districts, so they will ask iynk for a WCAG 2.1 AA ACR. That is the main commercial driver, from April 2027 for large districts.
- The EAA does not obviously cover a free learning web app. It covers e-commerce services. iynk would meet it for any paid store. A microenterprise exemption likely applies to a small company. HYPOTHESIS; needs a lawyer.
- The interactive simulators (drag to place parts, canvas) are the hard part: WCAG 2.5.7 requires a non-drag alternative; 2.5.8 sets a minimum target size.

Minimum viable step: audit against WCAG 2.2 AA with automated tools plus manual keyboard and screen-reader passes, fix blockers, publish a VPAT 2.5 INT as an ACR and an accessibility statement. Effort ESTIMATED: 3 to 6 engineering weeks to fix drag-only and canvas-only interactions; a third-party audit would cost USD 5,000 to 25,000 (ESTIMATED, no source retrieved; get quotes).

## 4. What school procurement asks

| Item | What I could establish | Label | Source |
|---|---|---|---|
| Data processing agreement | NDPA v2.2 is the common form (see 1.3). | EXTERNAL | [S11], [S12] |
| SOC 2 | AICPA says CPAs can report on system-level controls of a service organization, with Security, Availability, Processing Integrity, Confidentiality or Privacy as the criteria in scope. The page I read does not define Type I vs Type II. Cost and time: UNKNOWN (no source). | EXTERNAL; Type I/II and cost UNKNOWN | [S32] |
| 1EdTech LTI 1.3 / LTI Advantage | 1EdTech describes LTI Advantage as built on LTI 1.3 with Assignment and Grade Services, Names and Role Provisioning Services and Deep Linking. Certified products are listed in the TrustEd Apps Directory. Test suite is behind a login; fees and timeline are not on the page. | EXTERNAL; fees UNKNOWN | [S33] |
| Clever | A partner signs up for a developer account (simulated data), builds to Clever's integration requirements, asks for Clever's testing, keeps a sandbox school active, and updates to new API versions within six months of notice. Fees are set in an Order Form invoiced annually in advance, USD, non-refundable; amount not on the page. A partner may not charge schools a premium for using the app through Clever. Partner must keep an information security program and comply with FERPA, PPRA and COPPA. I did not create an account. | EXTERNAL; amount UNKNOWN | [S34] |
| ClassLink | Roster Server uses open data standards (not named on the page), has data sharing rules and a DataGuard option; the page claims 6,000+ digital learning resources connect via SSO. Vendor integration steps and fees: UNKNOWN (demo request only). | EXTERNAL; process UNKNOWN | [S35] |
| VPAT / ACR | See section 3. | EXTERNAL | [S31] |

Minimum viable step to be "sellable": a public privacy policy and terms, an NDPA-based DPA, a VPAT, a security overview page, a subprocessor list (Meta, Google, SerpApi, Vercel, Tiger Data, Solana RPC host), and one SSO route (Google or Microsoft sign-in is common but I did not source that; HYPOTHESIS). Clever, ClassLink and LTI come after the first pilot. SOC 2 can wait until a district asks and can be answered first with a security questionnaire (HYPOTHESIS about timing).

Effort ESTIMATED: policies and DPA 2 weeks; VPAT 1 week after the accessibility work; Clever integration 3 to 5 weeks; LTI 1.3 build 4 to 8 weeks; SOC 2 readiness 3 to 6 months. These are my estimates from general engineering experience, not from sources.

## 5. Physical safety

### 5.1 LiPo and lithium-ion batteries

I could not load a fire service or university EHS page with usable text. Attempts that failed: NFPA battery pages (returned title only), London Fire Brigade (404), CPSC (404 or listing only), USFA (404), OSHA (403), Berkeley and Stanford EHS (listing or 404), MIT EHS (404), Cornell EHS (404), UCSD EHS (login redirect), California Fire (403). So the fire service citation the task asked for is UNKNOWN. What I do have:

| Point | Finding | Label | Source |
|---|---|---|---|
| NFPA page | NFPA has a "Lithium-Ion Battery Safety" page covering safe charging, proper storage, warning signs and choosing certified products. The page body did not load, so I cannot state its advice. | EXTERNAL (topics only) | [S36] |
| Wikipedia (community, not a regulator) | Cells swell at high state of charge or overcharge; LiPo visibly inflates. A protection circuit should prevent overcharge and over-discharge. A single cell runs from about 4.2 V full to 2.7 to 3.0 V discharged. Multi-cell packs need a balancing charger. Hobby storage at 3.6 to 3.9 V per cell. One hobbyist source (Dunn 2015, Tested) reports no storage fires and says known fires happened during charging, usually from the charger or the operator. | EXTERNAL (community) | [S37] |

Design consequence for iynk (HYPOTHESIS, to be confirmed against an NFPA or fire service page): the drone assembly lessons should say what to do with a puffed pack, never charge unattended, use a balance charger and a fireproof bag, store at storage voltage, and not buy uncertified packs. Mark these as lab guidance, not product certification. Effort ESTIMATED: 2 to 3 days to write and review safety copy; get a second-source citation first.

### 5.2 Propeller injury data

| Point | Finding | Label | Source |
|---|---|---|---|
| Child injuries | Khan and Brown, Cureus 2021, analysing US NEISS records for recreational drone injuries in children (2010 to 2019): 26 records. No records 2010 to 2014; 1 in 2015, 4 in 2016, 6 in 2017, 9 in 2018, 6 in 2019. Ages 3 months to 17, median 8. Head and face 58% (15), upper extremities 15% (4), lower extremities 15% (4). Lacerations 42% (11), contusions or abrasions 27% (7). The sample is small, the paper has an inconsistency on sex, and NEISS counts only emergency department cases. I did not read whether propellers caused each injury. | EXTERNAL | [S38] |
| Eye injury case | A 2018 case report describes an ocular globe rupture after a drone accident (Am J Ophthalmol Case Rep). I read only the search snippet. | EXTERNAL (title only) | [S39] |

Design consequence: eye protection and prop guards in the Drone Lab safety checks, "props off for bench work", "never hand-catch". These are standard practice; I did not source them. HYPOTHESIS.

### 5.3 Mains voltage boundaries for a hobby product

I did not find a usable primary source. The EUR-Lex Low Voltage Directive page and CPSC children's product pages returned empty text or 404. Therefore: UNKNOWN for sourced limits.

Recommendation (HYPOTHESIS): iynk content should stay in extra-low voltage (battery, USB, bench supplies of a few tens of volts at most) and never instruct a learner to build, open, or probe mains-powered circuits. The simulator can show mains as a hazard label ("use a certified adapter") without teaching mains wiring. If iynk ever sells kits, kit rules (for example US CPSC children's product rules for ages 12 and under) apply and need a lawyer; I did not retrieve the CPSC rule.

### 5.4 FAA recreational flyer rules and EASA open category

| Point | Finding | Label | Source |
|---|---|---|---|
| US statute for recreational flying | 49 U.S.C. 44809 conditions: flown strictly for recreation; follow a community-based organization's safety guidelines; visual line of sight; give way to manned aircraft; authorization needed in Class B, C, D or surface Class E; stay at or below 400 ft AGL in Class G; pass the aeronautical knowledge and safety test (TRUST) and carry proof; aircraft registered and marked. | EXTERNAL | [S42] |
| Remote ID | 14 CFR 89.105: from 16 Sept 2023, no person may operate an unmanned aircraft in US airspace unless the operation meets 89.110 or 89.115, or an exception under 89.120 or an FAA authorization applies. Details of 89.110, 89.115, 89.120 and the 250 g registration threshold were not on the pages that loaded. | EXTERNAL; details UNKNOWN | [S43] |
| FAA recreational flyer pages | HTTP 403 for faa.gov pages I tried. TRUST page content not read. | UNKNOWN | n/a |
| EASA open category | Three subcategories (A1 over people but not assemblies, A2 close to people, A3 far from people); class marks C0 (250 g) to C4 (25 kg); 120 m max height; C0 needs no registration unless it has a camera or sensor and is not a toy; C1 to C4 need operator registration and online training; minimum remote pilot age 16, which a State may lower to 12 inside that State, and toys have no minimum age; most open category drones need remote identification; privately built drones are allowed without class marks, but the page limits this: under 250 g placed on the market before 1 Jan 2024 falls in A1 with no training; under 25 kg falls in A3 with registration and online training; a drone built from a ready-to-assemble kit sold as one product does not count as privately built. Matters for iynk, since the Drone Lab teaches assembly. Max height "below 120 m" is stated for the listed classes. | EXTERNAL | [S44] |

Triggers: the Drone Lab simulates flying and teaches assembly. A flight simulator does not need FAA or EASA approval. The legal exposure is advice quality: lessons that tell real learners to fly should state the rules or link to them, and should not suggest breaking them. Minimum viable step: a "before you fly for real" panel with the TRUST, registration, Remote ID, 400 ft / 120 m and visual-line-of-sight points, country-aware where possible. Effort ESTIMATED: 2 to 4 days of content, with a link to the official page for each country. Learners under 16 in the EU need the State rule. Verified against the primary pages only for the US statute and the EASA page.

## 6. Export controls and dual-use

| Point | Finding | Label | Source |
|---|---|---|---|
| EAR published information | 15 CFR 734.7: technology and software "made available to the public without restrictions upon its further dissemination" (for example posting on the Internet on public sites) is "published" and not subject to the EAR. Two carve-outs: some encryption software (ECCN 5D002) not meeting 742.15(b), and firearm production software or technology. | EXTERNAL | [S45] |
| ITAR | USML Category VIII(a)(5) lists UAVs "specially designed to incorporate a defense article"; unmanned aircraft with range of 300 km or more are flagged MT in the paragraph (a) introduction. VIII(i) controls technical data and defense services related to those articles. | EXTERNAL | [S46] |
| EAR top-level page | The BIS EAR page was too large to fetch (over 10 MB). Nothing else on EAR categories was verified. | UNKNOWN | n/a |
| Platform policies by peers | I did not retrieve any peer platform policy on drone autonomy content (for example Tinkercad, Wokwi, PX4 or ArduPilot policies). UNKNOWN. | UNKNOWN | n/a |

Reading for iynk (HYPOTHESIS): beginner flight sim, quiz and assembly content posted publicly is published information and outside the EAR under 734.7. The risk grows if iynk adds autonomy for payload release, target tracking, long-range navigation, swarming, or encrypted data links, or if it posts anything that looks like military-specific design. Keep the Drone Lab to hobby scale (short range, camera and race craft), keep a content rule against weaponisation, and keep an export note in the terms. Sanctions screening (OFAC) is separate and not researched. Effort ESTIMATED: 1 day for a content policy and terms; one lawyer consult (2 to 4 hours) before adding autonomy features.

## 7. Crypto: on-chain credentials for minors and wallets for under-18s

I found no primary source on this topic in this session. The SEC page I tried returned an unrelated list; the MiCA text did not load. So this section is largely UNKNOWN, and I will not state a regulatory posture.

Observations from iynk's own design (VERIFIED by the audit, [S40]): credentials are minted to any wallet address on Solana devnet with no proof the caller owns it; the issuer keypair is a server secret. Because the chain is public and permanent, a credential tied to a child's wallet address is a persistent public identifier that cannot be deleted. That conflicts in principle with COPPA deletion and retention duties (1.1, [S4]), GDPR erasure, and the UK Code's data minimisation standard ([S15]). HYPOTHESIS (the legal conflict is my reading, not a ruling).

Recommended posture, pending a lawyer: keep credentials off-chain as the default for any user under 18; make the on-chain badge opt-in, adult or parent initiated, with no personal data in the credential body; the child never holds a funded wallet; no tokens with market value; no purchase flow for minors. Minimum viable step: a feature flag that is off for minors. Effort ESTIMATED: 1 week. A proper opinion on securities, money transmission, and youth wallet rules by jurisdiction: 10 to 30 lawyer hours (ESTIMATED).

## 8. Feature-to-obligation map

| Feature | COPPA | FERPA / state | GDPR-K / UK | DPDP | LGPD | AI Act | Accessibility |
|---|---|---|---|---|---|---|---|
| Accounts (planned) | consent, retention, security | DPA, deletion | Art. 8, Code | parent consent <18 | parent consent | none | WCAG 3.3.8 |
| Telemetry | persistent id: consent if child-directed | school data use limits | consent, default off | no tracking of children | consent | none | none |
| Chat / rooms | personal information, moderation | school-managed rooms | Code standard 6 and 7 | monitor limits | best interest | Art. 50 for AI lines | keyboard and screen reader |
| Voice | audio is personal information; third-party disclosure | as above | as above | as above | as above | no emotion inference | captions |
| AI lab partner | third-party disclosure to model provider | processor terms | DPIA | as above | as above | Art. 50, Art. 4, Art. 5; high-risk only if grading | none |
| Public profiles / Build Buddies | PII risk in free text | none until school use | Code standard 7 | as above | as above | none | none |
| Location in Build Buddies (planned) | location is personal information | none | Code standard 10: off by default | as above | as above | none | none |
| Leaderboards | names are PII | school opt-out | Code standard 5 | as above | as above | none | table semantics |
| Wallets / on-chain credentials | persistent id, deletion conflict | none | erasure conflict | as above | as above | none | WCAG 3.3.8 |

## 9. Release blockers before marketing to schools or under-13s

Each blocker comes from a sourced duty above or from the repo audit [S40]. "Owner" is not assigned here.

1. Decide the audience in writing: 13+ general audience (Route A) or child-directed with parental consent (Route B). Without this, no other compliance step is well-founded (1.1, 1.4).
2. Telemetry off by default and no room code stamped on events; no persistent id for under-13 users without consent (1.1, [S40] D3).
3. A public privacy policy and terms, written for a child reader, with a subprocessor list: Meta, Google, SerpApi, Vercel, Tiger Data, Solana RPC (1.1, 1.4, 4).
4. A COPPA-grade written retention policy and written security program (312.10, 312.8) (1.1).
5. Age screen (neutral, before any data collection) and a parental-consent flow if under-13 users are allowed; a parent view for review and deletion (1.1, 1.4, 1.5, 1.6).
6. Chat, voice and Build Buddies: either off for under-13s or moderated with report and block; no free-text in the public buddy pool; name filtering on leaderboard; microphone consent text before any audio leaves the device ([S40] A6, A7, D2).
7. AI provider terms cleared for minors: the Gemini API terms bar apps likely to be accessed by under-18s; Meta's terms unread. Remove or replace until cleared (2, [S26]).
8. AI disclosure labels on every AI reply (Art. 50), no emotion inference (Art. 5(1)(f)), and a written decision that iynk does no grading, placement or proctoring; or a high-risk plan (2).
9. Authentication and cost controls on the AI, search and Solana routes, so a school pilot cannot be drained or abused ([S40] top gaps).
10. A signable DPA (NDPA v2.2) with school-official terms: direct control, no redisclosure, no training on student data, deletion on request (1.2, 1.3).
11. Accessibility: a WCAG 2.2 AA pass on the main flows, a non-drag alternative for drag interactions, and a published VPAT 2.5 INT ACR (3).
12. Credentials: on-chain minting off for minors; no wallet for under-18s; no personal data in on-chain data (7).
13. Physical safety copy for LiPo, propellers and flying legally, with a second-source citation for the LiPo guidance, and no mains-powered builds in lessons (5).
14. A lawyer review of the whole set, including the SOPIPA text and other state student-privacy laws, which I could not read (1.3).

Not blockers but likely asked for in procurement: SOC 2, Clever and ClassLink rostering, LTI 1.3 certification (4). Plan them after the first pilot.

## 10. Gaps in this research

- DPDP Rules 2025 text: official sites returned HTTP 403; the only content came from a community site. UNKNOWN beyond the phase structure.
- SOPIPA statutory text and California AG page: 403 and 404.
- Fire service or university LiPo guidance: no usable page loaded. Wikipedia only.
- FAA recreational pages and eCFR Part 89: 403 or a redirect to a block page.
- Mains-voltage sources, CPSC children's product rules, crypto regulation for minors, Meta API terms, peer platform policies on drone content: not retrieved.
- Search budget: the session WebSearch budget ran out partway through, so source discovery after that used direct fetches only.
- COPPA penalty amount, safe harbor fees, Clever and Clever/ClassLink fees, LTI certification fees, SOC 2 pricing: UNKNOWN.
- All cost and effort numbers are ESTIMATED from stated assumptions and should be replaced with quotes.

## Sources

All accessed 2026-10-26. "Describes" gives the version or date the page states.

- S1. https://www.govinfo.gov/content/pkg/FR-2025-04-22/html/2025-05904.htm. "Children's Online Privacy Protection Rule", Federal Register vol. 90 no. 76, FTC. Describes the final rule of 22 Apr 2025: effective 23 Jun 2025, compliance 22 Apr 2026. Only the first 100,000 of about 603,000 characters were read.
- S2. https://www.ecfr.gov/api/versioner/v1/full/2026-10-20/title-16.xml?part=312&section=312.5. 16 CFR 312.5, eCFR. Describes the text current 2026-10-20.
- S3. https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data. FTC press release, 16 Jan 2025. Describes the changes and what was not finalized.
- S4. https://www.ecfr.gov/api/versioner/v1/full/2026-10-20/title-16.xml?part=312&section=312.10. 16 CFR 312.10, eCFR, current 2026-10-20.
- S5. https://www.ecfr.gov/api/versioner/v1/full/2026-10-20/title-16.xml?part=312&section=312.8. 16 CFR 312.8, eCFR, current 2026-10-20.
- S6. https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions. "Complying with COPPA: Frequently Asked Questions", FTC. States the rule was amended 22 Apr 2025. Sections D and H read; section N (schools) not read.
- S7. https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-launches-inquiry-ai-chatbots-acting-companions. FTC press release, 11 Sep 2025.
- S8. https://studentprivacy.ed.gov/ferpa. "FERPA", Student Privacy Policy Office, US Department of Education. Summary of 34 CFR Part 99.
- S9. https://www.law.cornell.edu/cfr/text/34/99.31. 34 CFR 99.31, Legal Information Institute, Cornell. Current text at access.
- S10. https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22584. California Bus. & Prof. Code 22584 (SOPIPA). Link only: HTTP 403 for me. The companion page https://oag.ca.gov/privacy/sopipa returned 404.
- S11. https://privacy.a4l.org/. Student Data Privacy Consortium, A4L Community. Counts of executed DPAs as shown at access.
- S12. https://privacy.a4l.org/national-dpa/. National Data Privacy Agreement, A4L Community. Lists NDPA v2.2 Standard.
- S13. https://gdpr-info.eu/art-8-gdpr/. GDPR Article 8, gdpr-info.eu (unofficial reproduction of Regulation (EU) 2016/679).
- S14. https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/what-are-the-rules-about-an-iss-and-consent/. ICO guidance, page labelled "old".
- S15. https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/. "Age appropriate design: a code of practice for online services", ICO.
- S16. https://prsindia.org/billtrack/digital-personal-data-protection-bill-2023. PRS Legislative Research, summary of the DPDP Bill 2023 as introduced.
- S17. https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/. "Digital Personal Data Protection Rules 2025: key highlights", SCC Online, 26 Dec 2025. Describes Rules notified 14 Nov 2025. Secondary source. (Replaces the earlier dpdpa.in link, which on re-check is only a frameset of the Act text and says nothing about the Rules.) Official MeitY and PIB URLs returned 403.
- S18. https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm. Lei 13.709/2018 (LGPD), Presidency of Brazil, Article 14. First 100,000 of 125,310 characters read.
- S19. https://artificialintelligenceact.eu/annex/3/. "Annex III: High-Risk AI Systems", Future of Life Institute AI Act site (unofficial reproduction of Regulation (EU) 2024/1689).
- S20. https://artificialintelligenceact.eu/article/6/. Article 6, same site. Note the page cites Art. 6(5) guidelines due 2 Feb 2026; I did not check whether they were published.
- S21. https://artificialintelligenceact.eu/article/5/. Article 5, same site.
- S22. https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act. "Timeline for the implementation of the EU AI Act", European Commission AI Act Service Desk. Dates marked as amended by the Digital Omnibus on AI.
- S23. https://artificialintelligenceact.eu/article/4/. Article 4, same site.
- S24. https://artificialintelligenceact.eu/article/50/. Article 50, same site.
- S25. https://artificialintelligenceact.eu/ai-act-implementation-next-steps/. Implementation timeline page; states its own timeline is out of date. Used only for the original "24 months" structure.
- S26. https://ai.google.dev/gemini-api/terms. "Gemini API Additional Terms of Service", Google, as shown at access.
- S27. https://www.w3.org/TR/WCAG22/. "Web Content Accessibility Guidelines (WCAG) 2.2", W3C Recommendation, 12 Dec 2024.
- S28. https://www.ada.gov/resources/2024-03-08-web-rule/. "Fact Sheet: New Rule on the Accessibility of Web Content and Mobile Apps", US Department of Justice. Rule published 24 Apr 2024; page mentions the 20 Apr 2026 interim final rule.
- S29. https://www.ada.gov/resources/web-rule-first-steps/. "First Steps Toward Complying with the ADA Title II Web Rule", US Department of Justice. States the extended dates.
- S30. https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019L0882. Directive (EU) 2019/882 (European Accessibility Act), EUR-Lex. The fetch tool's summary gave the date and Art. 4(5); I did not read the text myself.
- S31. https://www.itic.org/policy/accessibility/vpat. "VPAT", Information Technology Industry Council. Describes VPAT 2.5.
- S32. https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2. "SOC 2", AICPA and CIMA.
- S33. https://www.1edtech.org/standards/lti. "Learning Tools Interoperability", 1EdTech.
- S34. https://www.clever.com/developers. Clever developer and partner page, as shown at access.
- S35. https://www.classlink.com/. ClassLink home page, as shown at access.
- S36. https://www.nfpa.org/education-and-research/home-fire-safety/lithium-ion-batteries. "Lithium-Ion Battery Safety", NFPA. Only title and outline loaded.
- S37. https://en.wikipedia.org/wiki/Lithium_polymer_battery. "Lithium polymer battery", Wikipedia (community source) at access.
- S38. https://pmc.ncbi.nlm.nih.gov/articles/PMC8171217/. Khan and Brown, "Recreational Drone-Related Injuries in Children: A Review of National Electronic Injury Surveillance System (NEISS) Data", Cureus, 2021.
- S39. https://pmc.ncbi.nlm.nih.gov/search/?term=consumer+drone+injuries+propeller. PMC search result listing PMC5956627, "Aerial drone misadventure: A novel case of trauma resulting in ocular globe rupture", Am J Ophthalmol Case Rep, 2018. Title and journal only.
- S40. /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/01_AUDIT/SECURITY_BASELINE.md. iynk security baseline, audited commit bb546d6, 2026-10-26.
- S41. /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/01_AUDIT/inventory/realtime.md and /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/01_AUDIT/inventory/server-data.md. iynk inventory, 2026-10-26.
- S42. https://www.law.cornell.edu/uscode/text/49/44809. 49 U.S.C. 44809, Legal Information Institute, Cornell.
- S43. https://www.law.cornell.edu/cfr/text/14/89.105. 14 CFR 89.105, Legal Information Institute, Cornell.
- S44. https://www.easa.europa.eu/en/domains/drones-air-mobility/operating-drone/open-category-low-risk-civil-drones. "Open category - low-risk civil drones", EASA. Last 1,795 characters not read.
- S45. https://www.law.cornell.edu/cfr/text/15/734.7. 15 CFR 734.7 "Published", Legal Information Institute, Cornell.
- S47. https://www.amsshardul.com/wp-content/uploads/2025/11/Regulatory-Alert-Enforcement-of-DPDP-Act-and-Notification-of-DPDP-Rules.pdf. AMS regulatory alert, Nov 2025, found by search; the search summary (not a full read) says verifiable consent for children's data sits in the 18-month phase and gives 13 or 14 May 2027.
- S48. https://www.legislation.gov.uk/eudr/2019/882/article/4. Directive (EU) 2019/882 Art. 4, legislation.gov.uk (UK-hosted copy of the EU text), found by search; the search summary states Art. 4(5) exempts microenterprises providing services from the Section III service requirements.
- S46. https://www.law.cornell.edu/cfr/text/22/121.1. 22 CFR 121.1 (US Munitions List), Legal Information Institute, Cornell. Only the first 100,000 of 234,830 characters read.

## Fact-check log (2026-10-26)

Checker re-opened each source on 2026-10-26. WebFetch answers come from a small summarising model, so quotes are as returned. Items 1 to 19 below were examined; claims not listed in the file keep their original labels.

| # | Claim | Verdict | Source |
|---|---|---|---|
| 1 | COPPA rule effective 23 Jun 2025, compliance 22 Apr 2026 | confirmed | [S1] |
| 2 | Compliance-date carve-out for 312.11(d)(1), (d)(4), (g) "took effect on the effective date" | corrected: text only says the date does not apply to them; no separate date found | [S1] |
| 3 | FTC 6(b) orders 11 Sep 2025 to seven named companies | confirmed | [S7] |
| 4 | Gemini API: 18+, no apps likely accessed by under-18s, paid vs unpaid data use | confirmed; EEA paid-only rule added | [S26] |
| 5 | EU AI Act dates: Art. 50 from 2 Aug 2026, 2 Dec 2026 transition for Art. 50(2), Annex III 2 Dec 2027, Annex I 2 Aug 2028 | confirmed; omnibus adoption status still not stated by the page (UNKNOWN) | [S22] |
| 6 | Annex III point 3 has four education uses (a) to (d) | confirmed | [S19] |
| 7 | ADA Title II dates 26 Apr 2027 (50,000+) and 26 Apr 2028, IFR April 2026 | confirmed (exact IFR day not on page; file said 20 April) | [S29] |
| 8 | NDPA v2.2 current; DPA counts | corrected: counts measure different things (233,924 active; 295,000 cumulative; 222,000 supported; 41 states vs 35 alliances) | [S11], [S12] |
| 9 | Cureus 26 records, year split, median age 8, body and injury percentages | confirmed | [S38] |
| 10 | EASA open category subcategories, classes, 120 m, age 16 or 12, C0 registration | confirmed; privately built drone limits added | [S44] |
| 11 | Clever: annual advance invoicing, non-refundable USD, no premium to schools, six-month API update, security programme, FERPA/PPRA/COPPA | confirmed | [S34] |
| 12 | DPDP child = under 18, Rs 200 crore penalty | confirmed; "Bill as introduced" corrected (PRS lists it as passed by both houses) | [S16] |
| 13 | DPDP Rules notified 13/14 Nov 2025; phases immediate, 12 months, 18 months; educational exemption | corrected: notified 14 Nov 2025; tiers are immediate, Rule 4 later date, 18 months; no 12-month tier and no educational exemption found; S17 link replaced because it was the wrong page | [S17], [S47] |
| 14 | WCAG 2.2 date 12 Dec 2024, six new A/AA criteria, 4.1.1 removed | confirmed; "all AA" wording corrected (two are level A); three AAA criteria noted | [S27] |
| 15 | 49 U.S.C. 44809 conditions | confirmed | [S42] |
| 16 | Remote ID 14 CFR 89.105, 16 Sep 2023 | confirmed | [S43] |
| 17 | EAA applies 28 Jun 2025, microenterprise service exemption Art. 4(5) | unconfirmed from the cited page (EUR-Lex returned empty); Art. 4(5) supported by a search summary of [S48]; date from secondary guides only | [S30], [S48] |
| 18 | Penalty, SOPIPA text, FAA pages, Meta API terms, LiPo regulator guidance | unconfirmed: file already marks these UNKNOWN; not re-attempted | none |
| 19 | Audit claims about iynk (S40, S41) | unconfirmed: internal files, not re-tested by the fact-checker | [S40], [S41] |

Counts: 19 items; 11 confirmed (some with added detail), 5 corrected (items 2, 8, 12, 13, 14), 3 unconfirmed (items 17, 18, 19).
