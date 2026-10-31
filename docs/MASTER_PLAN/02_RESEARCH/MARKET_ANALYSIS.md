# iynk market analysis: who can pay, how many, and how much

Author: market researcher, master-plan council. Written 2026-10-26. All sources accessed 2026-10-26.

## 0. Read this first

Short answer: the bottom-up count of paying institutions for a browser simulator like iynk is small. Base case, serviceable revenue in the US, India and EU together is about $7.4M a year, and a realistic three-year capture is about $0.3M a year [E1]. The reason is simple. The comparable products are free (Tinkercad, MakeCode) or cheap (Arduino Cloud for Schools at $20 per member per year [S3]). Schools and colleges are many, but each pays little, and the free options are good.

This does not mean the mission is unfundable. It means a simulator licence alone is not a venture-scale business, and the plan must add other revenue (grants, parts and kit referrals, credentials, a lab-licence for universities). Those lines are listed in section 9 and tested in section 10.

Labels used: TESTED (done hands-on), EXTERNAL (a cited source states it), ESTIMATED (my arithmetic, assumptions shown), HYPOTHESIS, UNKNOWN. Source references like [S12] point to the Sources list at the end. Estimate references like [E1] point to section 6.

Limits of this research:
- The web-search quota for the session ran out part-way through. Grant sources for foundations, a VC-funding trend for edtech, and EU school counts were not searched. They are marked UNKNOWN.
- Several pages would not load (ABET facts page 404, ASEE report PDF 404, Autodesk blog 403, CSR portal 403, AICTE dashboard connection closed, IES SBIR page 404). Where I use a secondary report instead, I say so.
- No hands-on test of any competitor product was done in this task. Nothing here is TESTED.

## 1. Market definitions

| Term | Definition used here |
|---|---|
| Individual user | A person who opens iynk without paying. Counted as users, not payers. |
| Paying unit | A buyer that signs or renews: a school, a district, a university department or course, a library or makerspace, or a person with a subscription. |
| TAM | Every paying unit in the segment times a base annual contract value (ACV), if all of them bought. |
| SAM | Units that have a use (a physical-computing, electronics or robotics course) and a budget that buys paid software, in countries and languages iynk can serve now. |
| SOM | The share of SAM iynk can win in about three years, given it is new, small and competes with free tools. |
| Product scope | A browser lab for microcontroller boards, circuits, robotics and drones, with classroom features. It excludes hardware kit sales. |

Individuals are kept out of TAM, SAM and SOM. Their payments are modelled separately in section 7 because the number of active users is UNKNOWN.

## 2. Sourced unit counts

### 2.1 United States

| Unit | Count | Year | Confidence | Source |
|---|---|---|---|---|
| Operating public schools (all levels) | 99,409 | 2022-23 | EXTERNAL, NCES CCD | [S15] |
| Public schools, secondary and high | 23,519 | 2020-21 | EXTERNAL, NCES | [S14] |
| Operating public school districts (all agency types) | 19,204 | 2022-23 | EXTERNAL, NCES CCD | [S15] |
| Regular school districts | 13,318 | 2022-23 | EXTERNAL, NCES via press release and EdWeek, seen in search results only | [S16] |
| Public school student membership | 49,514,913 | 2022-23 | EXTERNAL | [S15] |
| High school graduates who earned at least one CTE credit | 85% (2019 graduates) | 2019 | EXTERNAL, ACTE summary of NCES; I did not find the NCES table | [S48] |
| Public high schools offering CTE programmes (national count) | UNKNOWN | | Not found. NCES CTE statistics and the Perkins Data Explorer hold it. | [S47] |
| ABET accredited programmes, worldwide | 4,674 programmes at 920 institutions in 42 countries/areas | 1 Oct 2023 | EXTERNAL, ABET | [S17] |
| ABET accredited programmes, US only | 3,611 programmes at 702 institutions | 1 Oct 2024 | EXTERNAL but secondary (a college-guide site), low confidence. Programmes cover computing, applied science and technology too, not only EE, CE, ME. | [S18] |
| Community colleges | 1,026 (AACC member-eligible) | 2024 | EXTERNAL | [S19] |
| Colleges awarding engineering technology bachelor's degrees | 354, of which 39 are community colleges | 2020 | EXTERNAL, ASEE via search result | [S19] |
| US bachelor's degrees in engineering | 126,037 | 2020-21 | EXTERNAL, Statista citing NCES; low confidence | [S21] |
| Academic makerspaces at US public colleges | 284 active, 35 planned, at 214 institutions | 2023 | EXTERNAL, journal article | [S25] |
| Makerspaces verified in Make: directory (worldwide) | over 700 | 2024 | EXTERNAL, user-curated, likely undercount | [S24] |
| Public libraries (administrative entities) | about 9,000, with about 17,000 outlets | recent PLS | EXTERNAL, IMLS description; no single year tied | [S27] |
| Libraries offering some maker programme | 89% of respondents | 2017 | EXTERNAL but self-selected survey of 404 | [S28] |
| FIRST Robotics Competition students | 93,000+ in 35 countries | 2025 season | EXTERNAL | [S22] |
| FIRST Tech Challenge students | 109,000+ in 81 countries | 2024-25 | EXTERNAL | [S22] |
| FIRST LEGO League students | 650,000+ in 77 countries | 2024-25 | EXTERNAL | [S22] |
| VEX teams at the 2025 World Championship | 2,400+ | 2025 | EXTERNAL, news report; total registered teams UNKNOWN | [S23] |

Notes:
- FIRST publishes student counts, not team counts, on its impact page [S22]. A Wikipedia table showed 3,468 FRC teams (2,937 in the US), but its year label conflicts with its own text, so I do not use it.
- Competition teams sit inside schools and clubs. Counting them as separate buyers would double count, so they are treated as a channel, not a segment.

### 2.2 India

| Unit | Count | Year | Confidence | Source |
|---|---|---|---|---|
| Schools, all | 1,471,473 | 2024-25 (UDISE+) | EXTERNAL, secondary analysis site of Ministry data; a later report gives 14,66,682 for 2025-26 | [S32] |
| Secondary-only and higher-secondary-only schools | 26,829 and 15,992 | 2024-25 | EXTERNAL but low confidence; the same site gives a conflicting higher-secondary figure of 1,64,644, so these do not reconcile | [S32] |
| Atal Tinkering Labs (ATLs) established | over 10,000 | Dec 2025 | EXTERNAL, Education Minister statement reported by news | [S31] |
| ATLs planned | 50,000 more | budget 2025-26 | EXTERNAL, news report; timeline from a weaker source | [S31] |
| ATL grant per school | Rs 20,00,000 (Rs 20 lakh) over five years | 2022 Lok Sabha answer | EXTERNAL | [S31] |
| AICTE approved engineering/technology institutions | 5,845 (2024-25); 5,875 (2025-26) | 2024-26 | EXTERNAL via news coverage of AICTE data; I could not load the AICTE dashboard | [S29] |
| AICTE approved intake, engineering | 14.90 lakh | 2024-25 | EXTERNAL via news | [S29] |
| B.Tech enrolment | 12.53 lakh | 2024-25 | EXTERNAL via news | [S29] |
| Universities, colleges, standalone institutions | 1,168; 45,473; 12,002 | 2021-22 | EXTERNAL, Ministry of Education AISHE | [S30] |
| Engineering and Technology share of undergraduate enrolment | 11.8% | 2021-22 | EXTERNAL, AISHE | [S30] |

1 lakh = 100,000. 1 crore = 10,000,000.

### 2.3 European Union and Europe

| Unit | Count | Year | Confidence | Source |
|---|---|---|---|---|
| Higher education institutions in ETER register | 2,673 in 36 countries | undated page | EXTERNAL; includes non-EU countries; ETER notes about 3,000 institutions award at least a bachelor's degree | [S34] |
| Upper secondary students, EU | 17.9 million | 2019-20 | EXTERNAL, Eurostat | [S35] |
| Tertiary students, EU | 18.0 million | 2019-20 | EXTERNAL, Eurostat | [S35] |
| Number of secondary schools, EU | UNKNOWN | | Not found in the search budget. Buying is national or regional, so a school count would need country-by-country work. | |

### 2.4 Rest of world (note only)

- Fab Foundation says over 3,000 fab labs in about 160 countries on its homepage, but the same page also says 2,500, and a 2024 post said 2,700. Treat it as roughly 2,500 to 3,000 [S26].
- micro:bit reports 11.5 million devices distributed since 2016 and about 70 million young people reached in 85+ countries [S13]. This shows demand for low-cost physical computing outside the US, EU and India.
- No sourced paying-unit counts for Africa, Latin America, South-East Asia or the Middle East were gathered. UNKNOWN. I do not size them.

## 3. Comparable pricing

All prices as of 2026-10-26 unless a row says otherwise. Currency is as shown on the page.

| Product | Plan | Price | Who it is for | Source and note |
|---|---|---|---|---|
| Tinkercad (Autodesk) | Free | 0 | Everyone, with teacher classes | Autodesk says 100 million Tinkercad users "as of November 2025" in a blog post first dated August 2022 and later updated, and adds over 10 million users a year; no newer or independent count found (EXTERNAL, vendor marketing). The App Store listing says free for everyone. [S12] |
| Microsoft MakeCode | Free | 0 | micro:bit and others | micro:bit reports 75 million blocks coded per month on MakeCode in 2025 [S13]. The MakeCode about page did not state pricing. Repo microsoft/pxt is MIT [S49]. |
| Wokwi | Community | EUR 0 | Open-source projects; unlimited simulations and public projects | [S1] (re-fetched 2026-10-26, confirmed). The page does not say whether an account is needed to simulate; no "no account" claim is made. |
| Wokwi | Hobby | EUR 5.6 per month, billed annually | Personal | Fetched page shows EUR. A search summary of the same page gave USD 7 per month. The re-fetched page showed EUR only and no regional variation; the USD figures are unconfirmed. [S1] |
| Wokwi | Hobby+ | EUR 8.1 per month, billed annually | Advanced users | USD 12 per month in the search summary. [S1] |
| Wokwi | Pro | EUR 20 per seat per month, billed annually | Commercial | USD 25 in the search summary. [S1] |
| Wokwi | Classroom | EUR 30 per student per semester (4 months), minimum 5 students; annual billing option | Universities, colleges, technical institutions | Fetched page shows EUR 30; a search summary of the same page gave USD 30. The page example shows 900, which equals 30 students. Includes Pro features. Annual option saves EUR 1,050 per year (annual price not shown). Re-fetched 2026-10-26: price confirmed in EUR only. [S2] |
| Arduino Cloud | Free | 0 | 2 Things, 1 user, 30 AI interactions per month | [S3] |
| Arduino Cloud | Maker | USD 72 per year | Individuals, 25 Things, 1,500 AI interactions per month | [S3] (re-fetched, confirmed; "$" currency not named) |
| Arduino Cloud | Team | USD 1,000 per year | Business, 50 users, 100 Things | [S3] |
| Arduino Cloud | School | USD 20 per member per year; tiers for 5 to 50, 51 to 100, 101+ members | Education, 5 Things per member, Google Classroom integration | The page does not list a price per tier. Currency is not named, shown with a $ sign. [S3] A retailer listed the School plan at AUD 35.20 incl. GST per member per year, third-party and possibly dated [S4]. |
| LabsLand | Higher Education Standard | from EUR 7.99 per student per semester | Universities | [S5] |
| LabsLand | Higher Education Advanced | from EUR 19.99 per student per semester | Universities, all labs | [S5] |
| LabsLand | Schools | annual school-wide access; price not shown | Schools | [S5] |
| The Construct | Basic | EUR 0 | Learners, 3 courses | [S6] |
| The Construct | Learner | EUR 39.97 per month or EUR 439 per year | Individuals | [S6] |
| The Construct | Enterprise | EUR 2,399 per user per year | Companies | [S6] |
| The Construct | Education | UNKNOWN. The re-fetched pricing page did not show an Education plan or discount (the first draft quoted a "special discount"); not confirmed. | Institutions | [S6] |
| Proteus (Labcenter) | Enterprise, Platinum, Custom, Education, cloud licence | Not shown. The pricing page displays placeholders. Education page says "massive educational discounts" and cloud licensing for classes. | Universities | UNKNOWN price. [S7] [S8] |
| eCalc | Demo free; Private membership; Teams and Campus | Prices not stated on the home page | Drone and RC propulsion calculators | Version V7.40, news to 2026-10-22. Commercial and university use is quoted on request. [S9] |
| Onshape | Student and Educator plans | Free | Students and teachers | Search results from Onshape blog. [S10] |
| Onshape | Education Enterprise | Paid, price not found | Institutions | UNKNOWN price. [S10] |
| Labster | Institutional licence | Quote only. Third-party estimates conflict (USD 3,000 a year for 50 students; USD 6,049 per user per year on Capterra; 2017 press said USD 19 per month for college students). | Universities | LOW confidence, do not rely. [S11] |

Reading the table:
- Per-student price points for education simulators cluster at EUR 8 to 30 per semester (LabsLand, Wokwi) or about USD 20 per year (Arduino School). The free baselines are Tinkercad and MakeCode.
- No comparable charges individuals more than about USD 72 to 88 a year (Arduino Maker, Wokwi Hobby annualised) except The Construct's course product at EUR 439.
- Wokwi Classroom is the closest direct comparable for universities. Its own page shows a per-student price, so the market has accepted per-student pricing at EUR 30 per semester.

## 4. Why users are many and payers are few

Evidence:
- Tinkercad reports 100 million users [S12]. It is free for everyone [S12]. Arduino says 33 million active users [S37]. These are user counts, not payer counts, and no one in this set discloses a paying count.
- Free-to-paid conversion for SaaS freemium averages 3.7%, with EdTech at 2.6%, from a single vendor-marketing dataset (71% B2B). Treat as indicative, low confidence [S41]. Other cited ranges are 2% to 8%.
- The people who use these tools are students and hobbyists. They do not hold the budget. The people who hold the budget (a teacher with a classroom, a department head, a district) buy per class or per seat. They compare you with a free tool that already works.
- Districts are crowded with tools. UNKNOWN for 2024-25: the figure of about 2,982 tools per district (up about 9%) could not be confirmed. The cited K-12 Dive page describes the 2022-23 report: 2,591 tools per district, up about 1.7% from 2,547 in 2021-22, against 895 before 2019-20 (EXTERNAL, LearnPlatform by Instructure via K-12 Dive, [S39]). The direction (many tools per district) is supported; the 2,982 value is not.
- Public money is tighter. ESSER pandemic funds are gone. EdTech Magazine (2026-08-07) says they "officially ran out for all districts in early 2026" [S38]; the earlier text here said January 2025, which that source does not support. The $190 billion total is not stated in that article and is UNKNOWN from the sources fetched. EY Parthenon estimated only 5 to 10% of ESSER went to materials and technology and expected the next 3 to 4 years to be stable [S38]. In August 2026 the CoSN CEO was quoted saying "We're back to where we were pre-pandemic" and that schools will tighten their belts on technology [S38]. The sources disagree on how severe the effect is.

HYPOTHESIS: a free tier with a hard cap on classroom features (class roster, assignments, progress, private rooms) converts better than a free tier that is limited by content. This is the Arduino School and Wokwi Classroom pattern. It needs a test (section 10).

## 5. Adjacent signals

### 5.1 Hardware volumes

| Signal | Number | Source |
|---|---|---|
| Raspberry Pi Holdings FY2025 (year to 31 Dec 2025) revenue | USD 323.2M, up 25% from USD 259.5M | [S36] |
| Raspberry Pi units shipped, boards and modules | 7.6M, up 9% from 7.0M; microcontroller units 8.4M | [S36] |
| Raspberry Pi education note | Management expects a competitive benefit in education and enthusiast markets from the end of the US de minimis exemption | [S36] |
| micro:bit | 11.5M distributed since 2016; about 70M young people; 85+ countries. The earlier "goal of 100M children by 2028" is not on the cited page and is UNKNOWN (fact-check 2026-10-26) | [S13] |
| Arduino | Qualcomm announced an agreement to acquire it on 2025-10-07; est. 33M active users; no price disclosed. The Tech.eu article said closing was pending regulatory approval; arduino.cc now says "Arduino is now a Qualcomm company" (EXTERNAL, [S50]), so the deal appears closed. The closing date is UNKNOWN (no completion release found). | [S37] [S50] |
| Arduino boards sold | About 10M by 2021 per IEEE Spectrum (search result); no newer figure found | [S37] |

Meaning: hardware volume is large and rising. A learner with a board does not need a simulator, but a class without enough boards does. That is iynk's core pitch and it is a HYPOTHESIS until tested.

### 5.2 STEM kit and robotics market reports (LOW confidence)

Analyst reports differ by a factor of three because they define the market differently. Methodology was not visible for any of them in what I saw.

| Report | Market | Size | Source |
|---|---|---|---|
| Market.us | STEM toys, global | USD 5.1B (2024), CAGR 7.5% to 2034 | [S40] |
| Global Market Insights | Educational toys, global | USD 30.3B (2025), CAGR 6.9% to 2035 | [S40] |
| HTF Market Intelligence | Educational kits, global | USD 5.24B (2025), growth 8.9% | [S40] |
| Next Move Strategy Consulting | STEM education and robotics, global | USD 14.4B (2025) to USD 63.0B (2035) | [S40] |
| Global Market Insights | North America STEM toys | USD 2.4B (2025) | [S40] |

None of these are used in the TAM. They measure hardware and toys, not software licences paid by institutions. They only show that parents and schools spend on physical STEM products.

### 5.3 Edtech spending trend 2024 to 2026

- Pandemic money ended in early 2026 per EdTech Magazine, 2026-08-07 [S38].
- Tool counts per district were 2,591 in 2022-23 [S39]; the 2024-25 value (2,982 in the first draft) is UNKNOWN. If tool counts stay high, buyers are consolidating, not adding, in the next budget cycle (HYPOTHESIS, from the EY forecast of vendor consolidation [S38]); the consolidation claim is not tested by any figure here.
- Perkins V basic state grants were USD 1.44B in FY2024 per ACTE [S47]. I did not confirm the final FY2025 or FY2026 appropriation. CTE funding is the most likely budget line that pays for school-level lab software, so it is the one to watch.
- A VC funding trend for edtech was not gathered. UNKNOWN.

## 6. TAM, SAM and SOM (bottom-up)

Scope: institutional licences only. Dollar figures are USD per year. EU figures treat EUR as equal to USD for simplicity (ESTIMATED, no FX source used). Every number in the "ESTIMATED" columns is my assumption, not a measured fact. Model code is in the scratchpad: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/research/market/model.py`.

### 6.1 Assumptions

| # | Segment | Units (source) | Fit share (low / base / high) | Pays share of fit (low / base / high) | ACV USD (low / base / high) | Win share of SAM in 3 yrs (low / base / high) | Basis for ACV |
|---|---|---|---|---|---|---|---|
| A1 | US secondary schools | 23,519 [S14] | 25% / 40% / 55% | 10% / 25% / 40% | 360 / 1,200 / 2,700 | 1% / 5% / 10% | 30, 60 or 90 seats at USD 12, 20 or 30 per seat per year. Anchor: Arduino School USD 20 [S3]. ESTIMATED |
| A2 | US colleges: ABET institutions 702 plus community colleges 1,026 | 1,728 [S18] [S19] | 100% | 20% / 35% / 50% | 2,250 / 4,500 / 9,000 | 2% / 4% / 8% | 300 student-semesters at USD 7.5, 15 or 30. Anchor: LabsLand EUR 7.99 to 19.99, Wokwi EUR 30 [S2] [S5]. Overlap between the two counts is possible. ESTIMATED |
| A3 | US libraries and makerspaces | 9,700 (about 9,000 libraries [S27] plus about 700 directory makerspaces [S24]) | 100% | 2% / 5% / 10% | 120 / 300 / 600 | 2% / 5% / 10% | No direct comparable. Between Arduino Maker USD 72 and Team USD 1,000 [S3]. HYPOTHESIS |
| A4 | India engineering institutions | 5,845 [S29] | 100% | 8% / 15% / 25% | 600 / 1,200 / 2,400 | 1% / 2% / 5% | 150 students × 2 semesters × USD 2 / 4 / 8. Assumes a quarter to a half of US per-student price; no Indian price benchmark was found. HYPOTHESIS |
| A5 | India ATL schools | 10,000 [S31] | 100% | 2% / 5% / 10% | 50 / 100 / 200 | 2% / 5% / 10% | Small school licence. The ATL grant is Rs 20 lakh per school over five years [S31], but most goes to equipment. HYPOTHESIS |
| A6 | EU higher education | 2,673 [S34] | 100% | 5% / 10% / 20% | 1,200 / 2,400 / 4,800 | 1% / 3% / 6% | 200 student-semesters at USD 6, 12 or 24. ETER includes non-EU countries. ESTIMATED |

TAM uses the base ACV and all units. SAM and SOM follow each scenario.

### 6.2 Results, base case (ESTIMATED)

| Segment | TAM | SAM units | SAM | SOM units (yr 3) | SOM |
|---|---|---|---|---|---|
| US secondary schools | $28.2M | 2,352 | $2.82M | 118 | $141k |
| US colleges | $7.8M | 605 | $2.72M | 24 | $109k |
| US libraries and makerspaces | $2.9M | 485 | $146k | 24 | $7k |
| **US total** | **$38.9M** | 3,442 | **$5.69M** | 166 | **$257k** |
| India engineering institutions | $7.0M | 877 | $1.05M | 18 | $21k |
| India ATL schools | $1.0M | 500 | $50k | 25 | $3k |
| **India total** | **$8.0M** | 1,377 | **$1.10M** | 43 | **$24k** |
| EU higher education | $6.4M | 267 | $0.64M | 8 | $19k |
| **Three regions total** | **$53.3M** | | **$7.4M** | | **$0.30M** |

Rest of world: not sized (UNKNOWN).

### 6.3 Sensitivity (ESTIMATED)

| Scenario | SAM (three regions) | SOM yr 3 (three regions) | Main driver |
|---|---|---|---|
| Low | $1.5M | $23k | Few schools have a fitting course, almost none pay, 30 seats at USD 12 |
| Base | $7.4M | $300k | As in 6.2 |
| High | $28.6M | $2.43M | 55% fit, 40% pay, 90 seats at USD 30 in US schools |

What moves the answer most: the share of US schools that pay for any simulator (A1), and seats per school. The US K-12 line is 38% of base SAM and 49% of high-case SAM.

Reading the result: even the high case is under $3M a year at year three. A team that needs more than that must find revenue outside simulator seats, or win a large district or state contract (one state-wide deal could be a multiple of the base SOM, but no such deal is sourced here).

## 7. Individual subscribers (separate funnel, HYPOTHESIS)

I cannot size individual payers from counts. iynk's active user count is UNKNOWN in this task. A funnel is shown only to show the order of magnitude.

| Case | Monthly active users | Free to paid | Price USD per year | Revenue per year |
|---|---|---|---|---|
| Low | 10,000 | 1% | 36 | $3.6k |
| Base | 50,000 | 2.6% | 48 | $62k |
| High | 200,000 | 5% | 72 | $720k |

Anchors: 2.6% EdTech freemium rate [S41] (low confidence); Wokwi Hobby EUR 5.6 per month annual [S1]; Arduino Maker USD 72 per year [S3]. The user counts are invented scenarios, not data. Replace them with iynk's real analytics before using this table.

## 8. Geography notes

| Region | What is known | Gap |
|---|---|---|
| US | Best data. NCES gives school and district counts. Buying is by school or district, often through CTE funds. Free tools (Tinkercad) are entrenched in K-12 [S12]. | National count of CTE schools, ABET EE/CE/ME-only programmes, and per-school software budgets are UNKNOWN. |
| India | Large enrolment (12.53 lakh B.Tech students [S29]) and a government programme putting tinkering labs in schools (10,000+ ATLs, 50,000 more planned [S31]). Institutions are numerous, but I found no price benchmark for Indian institutions. | AICTE dashboard did not load. Willingness to pay in INR is UNKNOWN. I used 25 to 50% of the US per-student price (HYPOTHESIS). |
| EU | About 2,673 HEIs in the register [S34]. Language and procurement rules vary by country, and iynk ships six UI languages. | School counts UNKNOWN. GDPR and public procurement rules not researched here. |
| Rest of world | Demand shown by micro:bit and Fab Lab spread [S13] [S26]. | No paying-unit data. Mostly grant or donor funded in practice (HYPOTHESIS). |

## 9. Grants and non-profit funding for accessible STEM

Grants matter because the mission serves people who cannot pay. The table lists what I could verify. Status is as of the page date I saw, not a guarantee the programme is open.

| Source | What it offers | Status and caveat | Link |
|---|---|---|---|
| NSF SBIR/STTR (America's Seed Fund) | "Up to $2 million in seed funding", no equity. Phase I proposals need a Project Pitch and an invitation from a programme officer. | Page gave no award sizes or dates. A third-party aggregator says Phase I up to USD 305,000 for 6 to 18 months and Phase II up to USD 1,250,000 under NSF 26-510, and another listed a different ceiling (USD 275,000). Check the solicitation. US small businesses only. | [S44] |
| Dept. of Education, IES SBIR | Education-technology prototypes. Aggregator says Phase I USD 250,000 for 9 months. | Aggregator says the FY2026 solicitation closed 2026-06-29. IES page returned 404. Aggregator only. | [S45] |
| NSF DRK-12 (Discovery Research PreK-12) | Research and development of STEM learning resources. | NSF 23-596 page shows "archived", last updated 2025-08-25. Award sizes not on the page. Whether a successor exists is UNKNOWN. | [S42] |
| NSF ITEST | Pre-K-12 technology learning experiences. | NSF 24-500 (a resource-centre solicitation) shows "archived", updated 2024-03-27. Current status UNKNOWN. | [S43] |
| Perkins V basic state grants | Flow to states and then to districts and colleges for CTE. A buyer's budget line, not a grant to iynk. | USD 1.44B in FY2024 per ACTE. FY2025 and later amounts not confirmed. | [S47] |
| Erasmus+ Key Action 2 small-scale partnerships | Lump sums of EUR 30,000 or EUR 60,000. At least two organisations from two EU Member States or associated countries. 6 to 24 months (re-fetched, confirmed). | The page also says projects end by 2024-08-31, and its call ID is ERASMUS-SPORT-2026-SSCP, so the page text may mix years or the sport field. Deadlines shown: 5 March, optional extra round 1 October. Whether a 2026-27 school-education call applies is UNKNOWN; confirm with a National Agency. | [S46] |
| India CSR, Companies Act Schedule VII | Education is the largest CSR category. Listed companies spent about Rs 1,104 crore on education in FY2023-24 out of about Rs 17,967 crore. Total CSR is Rs 34,908.75 crore (Lok Sabha figure via TaxGuru; not re-checked) or Rs 35,917 crore (Dataful). | The two totals differ and sector splits come from secondary sites. The CSR portal (csr.gov.in) returned 403. | [S33] |
| India Atal Innovation Mission | Rs 20 lakh per ATL school over five years. A route into schools, not a grant to a vendor. | 2022 Lok Sabha answer. | [S31] |
| Private foundations (Google.org, Gates, Schmidt, Siegel and others) | UNKNOWN | Not searched; budget used. These names are leads from my own knowledge, not findings. | |

## 10. What would change these numbers (tests to run)

Run these before putting any number in a pitch.

| # | Question | Test | Number it moves | Pass signal |
|---|---|---|---|---|
| T1 | Do teachers pay when a free tool exists? | Put a "Classroom" tier (roster, assignments, progress, private rooms) behind a waitlist with a price. Count teachers who enter a work email and a class size. Do not take payment. | A1 pays share, ACV | At least 3% of teacher visitors join the waitlist at USD 20 per seat |
| T2 | What is a school's real budget line? | 15 short calls with CTE directors and department heads. Ask: who paid for the last software purchase and from which fund. | A1 and A2 fit and pays shares | Most name a specific fund and a purchase under USD 2,000 |
| T3 | Do universities buy per student or per course? | Offer a one-course pilot to 5 lecturers (free for a term) and ask for a quote-style price expectation afterwards. | A2 ACV | Two ask for a purchase order |
| T4 | Is iynk better than free where it matters? | Same lab task in iynk, Tinkercad and Wokwi with 10 students. Time to first working circuit, errors, and which they pick. | Win share | iynk wins on tasks that need boards the free tools lack (STM32, ESP32, FPGA, drones) |
| T5 | How many users does iynk really have and how many return? | Add privacy-friendly analytics. Measure weekly active users, return rate, and share who open a lesson versus create a project. | Section 7 funnel | Weekly return above 20% |
| T6 | Do individuals pay? | A price-test page for a personal plan (USD 4 per month) with a fake door, no charge. | Section 7 price and rate | At least 2% click through to a payment step |
| T7 | Will Indian institutions pay at 25 to 50% of US prices? | Ask 10 colleges and 5 ATL schools for a stated price. | A4, A5 | Median stated price at or above USD 2 per student per semester |
| T8 | Can grants carry free access? | Draft and submit a NSF SBIR project pitch or an IES SBIR; apply to one Erasmus+ small-scale partnership with a European school. Each only after the founders approve. | Section 9 | One invitation or award |
| T9 | Do competitors move? | Re-check Wokwi, Arduino Cloud and LabsLand prices every quarter. | Section 3 | A price drop or a free classroom tier would cut A1 and A2 |
| T10 | Is there a single large buyer? | Talk to one state CTE office or education ministry about a state-wide licence. | SOM upside | A written pilot scope |

Facts that would break the base case if found false:
- If a competitor offers a free classroom tier with progress tracking, A1 pays share falls toward the low case.
- If Perkins V funding is cut, K-12 CTE budgets shrink. I did not confirm the current appropriation [S47].
- If Wokwi Classroom's USD or EUR 30 per semester price does not hold at scale, the university price anchors drop.

## 11. Gaps

- Number of US public high schools with CTE programmes (NCES CTE statistics, Perkins Data Explorer).
- ABET accreditation counts by discipline for EE, CE and ME, and the ASEE 2024 report tables (PDF returned 404).
- AICTE dashboard totals; the numbers used are from news reports of the same data.
- EU school counts, EU public procurement rules, edtech VC funding trend 2024 to 2026.
- Any paying-user count from Tinkercad, Wokwi, Arduino or MakeCode.
- Private foundation programmes for accessible STEM (searches not run).
- Proteus, Onshape Enterprise, Labster and eCalc institutional prices. All are quote-only or unlisted.
- Reddit, Hacker News and forum evidence on what teachers pay for. One search returned no forum threads, so I make no claim about user opinion.

## 12. Open-source projects mentioned (licences checked by GitHub API on 2026-10-26)

| Project | Repo | SPDX |
|---|---|---|
| MakeCode PXT | https://github.com/microsoft/pxt | MIT |
| Wokwi avr8js | https://github.com/wokwi/avr8js | MIT |
| Wokwi rp2040js | https://github.com/wokwi/rp2040js | MIT |
| CircuitVerse | https://github.com/CircuitVerse/CircuitVerse | MIT |

Wokwi's hosted product, Tinkercad, Arduino Cloud, LabsLand, The Construct, Proteus and eCalc are not open source as far as the pages I read show. I did not verify their licence terms.

## Sources

All accessed 2026-10-26. "Fetched" means the page was loaded. "Search result" means I only saw it in a search summary.

| ID | Title and publisher | URL | Describes / notes |
|---|---|---|---|
| S1 | Wokwi Pricing, Wokwi | https://wokwi.com/pricing | Current plans. Fetched. EUR shown; search summary showed USD. |
| S2 | Wokwi Classroom, Wokwi | https://wokwi.com/classroom | Classroom licence. Fetched twice. The earlier note "offline support free to 2025-10-31" is not on the page now; offline VS Code support is "available on request". |
| S3 | Arduino Cloud plans, Arduino | https://cloud.arduino.cc/plans/ | Current plans. Fetched. |
| S4 | Arduino Cloud School Plan 1 year, Pakronics | https://www.pakronics.com.au/products/arduino-cloud-school-plan-1-year-subscription-for-1-member-ard-avx00050 | Retailer AUD 35.20. Search result. |
| S5 | LabsLand pricing, LabsLand | https://labsland.com/en/pricing/ | Current. Fetched. |
| S6 | The Construct pricing, The Construct | https://www.theconstruct.ai/pricing/ | Current. Fetched. |
| S7 | Proteus pricing, Labcenter Electronics | https://www.labcenter.com/pricing/ | Prices are placeholders. Fetched. |
| S8 | Proteus education, Labcenter Electronics | https://www.labcenter.com/education/ | Fetched. |
| S9 | eCalc, eCalc | https://www.ecalc.ch/ | V7.40, news to 2026-10-22. Fetched. |
| S10 | Introducing Educator Plan, Onshape (PTC) | https://www.onshape.com/en/blog/introducing-educator-plan | Search result only. |
| S11 | Labster pricing, Labster; plus fitgap, Capterra, VentureBeat listings | https://www.labster.com/es/precios | Search result. Low confidence. |
| S12 | (fact-check: still 403 on fetch; text confirmed via search snippet only) Autodesk cloud CAD users, Autodesk | https://www.autodesk.com/products/fusion-360/blog/autodesk-the-first-to-pioneer-cloud-cad-with-over-55-million-users-today/ | 100M Tinkercad users; page returned 403 on fetch, so figure is from a search result; date unclear. |
| S13 | Our impact in 2025, micro:bit Educational Foundation | https://microbit.org/news/2025-12-29/our-impact-in-2025/ | Dated 2025-12-29. Fetched. |
| S14 | Educational institutions, NCES Fast Facts | https://nces.ed.gov/fastfacts/display.asp?id=84 | 2020-21 school counts. Fetched. |
| S15 | CCD 2022-23 summary table 2, NCES | https://nces.ed.gov/ccd/tables/202223_summary_2.asp | 2022-23. Fetched. |
| S16 | NCES CCD press release, 2024-02-05 (hosted by The 74) and EdWeek explainer | https://www.the74million.org/wp-content/uploads/2024/02/NCES-CCD-Press-Release_2024_02_05_2024.docx-1.pdf | 13,318 regular districts. Search result. |
| S17 | ABET accredits 110 additional programs in 2023, ABET | https://www.abet.org/abet-accredits-110-additional-programs-in-2023/ | Dated 2023-10-06. Fetched. |
| S18 | Ultimate Guide to ABET-Accredited Schools and Programs, Road2College | https://www.road2college.com/abet-accredited-schools/ | US 3,611 programmes at 702 colleges, 1 Oct 2024. Secondary, search result. |
| S19 | AACC Fast Facts 2024, Community College Daily | https://www.ccdaily.com/2024/02/aacc-fast-facts-2024/ | 1,026 colleges. Search result. ASEE engineering technology note from ASEE CTC survey FAQ https://profiles-ctc.asee.org/?p=1954. |
| S20 | Engineering and Engineering Technology by the Numbers 2024, ASEE | https://ira.asee.org/wp-content/uploads/2025/10/Engineering-and-Engineering-Technology-by-the-Numbers-2024.pdf | Fetch returned 404. Not read. Listed so the next researcher can retry. |
| S21 | Number of bachelor's degrees by field, Statista | https://www.statista.com/statistics/185334/number-of-bachelors-degrees-by-field-of-research | 126,037 engineering degrees, 2020-21. Search result, low confidence. |
| S22 | FIRST impact, FIRST | https://www.firstinspires.org/about/impact | 2024-25 and 2025. Fetched. |
| S23 | 2,400 international teams converge on Dallas for VEX Worlds, Dallas Innovates | https://dallasinnovates.com/2400-international-teams-converge-on-dallas-for-vex-robotics-world-championship/ | VEX Worlds. Search result; article date not seen. |
| S24 | Make: relaunches its Makerspace Directory, All3DP | https://all3dp.com/4/make-relaunches-its-makerspace-directory/ | May 2024. Search result. |
| S25 | Census of US public academic makerspaces, Project MUSE | https://muse.jhu.edu/article/877785/summary | 2023. Search result. |
| S26 | Fab Foundation, Fab Foundation | https://fabfoundation.org/ | Homepage counts. Search result. |
| S27 | IMLS Public Libraries Survey (description on DataLumos and US Census) | https://www.datalumos.org/datalumos/project/219152/version/V1/view | About 9,000 libraries, 17,000 outlets. Search result. |
| S28 | Public Library Maker Survey, Library Journal | https://www.libraryjournal.com/story/making-it-happen-programming | 2017. Search result. |
| S29 | AICTE data shows BTech enrolment eight-year high, Education Post | https://educationpost.in/news/education/aicte-data-shows-btech-seat-enrolment-hits-eightyear-high-as-computer-science-drives-growth | Published 2025-08-03. Fetched. Institutions 5,845 / 5,875 from other news in search results (e.g. https://www.bodmaseducation.com/blog_details/btech-seats-reach-8-year-high-aicte-data-reveals-significant-increase). |
| S30 | AISHE 2021-22, Ministry of Education, India | https://education.gov.in/sites/upload_files/mhrd/files/statistics-new/AISHE%20Book_2021-22_4.pdf | Figures seen in search summary; PDF not opened. |
| S31 | Atal Tinkering Labs, news and Parliament answers | https://l-www.dinamalar.com/news/kalvimalar-news-en/over-10000-atal-tinkering-labs-driving-school-level-innovation-under-nep-2020-govt/58225 ; https://www.newsonair.gov.in/govt-to-establish-50000-new-atal-tinkering-labs-in-schools-across-country ; https://eparlib.nic.in/bitstream/123456789/2978489/1/AU1383_dp0Ntx.pdf | Dec 2025 statement re-fetched: newsonair (2025-12-03, Education Minister: over 10,000 ATLs; 50,000 new to be set up; no budget year in article) and Dinamalar (2025-12-05, over 10,000). The "budget 2025-26" attribution for the 50,000 is unconfirmed. 2022 grant answer not re-checked. |
| S32 | UDISE+ 2024-25 analysis, Education for All in India | https://educationforallinindia.com/school-education-in-india-where-do-we-stand-analysis-of-udiseplus-2024-25-data/ | Secondary analysis; search result. |
| S33 | CSR spending: Drishti IAS, TaxGuru, Dataful | https://taxguru.in/company-law/csr-spending-details-data-access.html ; https://csr.dataful.in/s/0e3be03a1f04466abc743b ; https://www.drishtiias.com/daily-updates/daily-news-analysis/growth-in-csr-spending/print_manually | FY2023-24. Search results; totals conflict. |
| S34 | ETER register summary, ACA Secretariat; ETER final report | https://aca-secretariat.be/?p=23116 ; https://eter-project.com/wp-content/uploads/2022/02/Final_report_ETERII_EN.pdf | Search results; undated. |
| S35 | Eurostat news, 2022-04-28 | https://ec.europa.eu/eurostat/web/products-eurostat-news/-/ddn-20220428-3 | 2019-20 enrolment. Search result. |
| S36 | Raspberry Pi Holdings FY 2025 Results, RNS 2026-03-31 | https://www.investegate.co.uk/announcement/rns/raspberry-pi-holdings-wi---rpi/fy-2025-results/9499135 | Year to 2025-12-31. Fetched (first 100,000 characters). |
| S37 | Qualcomm acquires Arduino, Tech.eu, 2025-10-07; IEEE Spectrum | https://tech.eu/2025/10/07/qualcomm-acquires-arduino-to-supercharge-the-global-maker-movement/ ; https://spectrum.ieee.org/qualcomm-arduino-acquisition-open-source | 33M active users. Tech.eu fetched; IEEE figure from search result. |
| S38 | ESSER and edtech: Oliver Wyman (2025-03), EY Parthenon (2024-06), EdTech Magazine (2026-08) | https://www.oliverwyman.com/our-expertise/insights/2025/mar/k-12-investment-strategies-stimulus-funds-end-2025.html ; https://info.ey.com/rs/520-RXP-003/images/EY-Parthenon_ESSER%20expiration%20impact%20on%20K-12.pdf ; https://edtechmagazine.com/k12/article/2026/08/esser-funds-are-gone-heres-how-k-12-it-leaders-replace-them-perfcon | Search results. |
| S39 | EdTech Top 40 2024-25, LearnPlatform by Instructure (via District Administration, K-12 Dive) | https://www.k12dive.com/news/school-districts-ed-tech-use/685995/ | Released 2025-06-30. Search result; secondary. |
| S40 | STEM and educational kit market reports: Market.us, Global Market Insights, HTF, Next Move | https://market.us/report/stem-toys-market/ ; https://www.gminsights.com/industry-analysis/educational-toys-market ; https://www.htfmarketintelligence.com/report/global-educational-kits-market ; https://www.nextmsc.com/report/stem-education-and-robotics-market-ic5514 | Analyst reports, methodology not seen. LOW confidence. Search results. |
| S41 | SaaS free trial and freemium benchmarks, First Page Sage | https://firstpagesage.com/seo-blog/saas-free-trial-conversion-rate-benchmarks/ | Updated 2025-09-05. Vendor marketing data. LOW confidence. Search result. |
| S42 | NSF 23-596 DRK-12, NSF | https://www.nsf.gov/funding/opportunities/drk-12-discovery-research-prek-12 | Archived; updated 2025-08-25. Fetched. |
| S43 | NSF 24-500 ITEST Resource Center, NSF | https://www.nsf.gov/funding/opportunities/itest-rc-innovative-technology-experiences-students-teachers-resource/5467/nsf24-500 | Archived; updated 2024-03-27. Fetched. |
| S44 | America's Seed Fund, NSF | https://seedfund.nsf.gov/ and https://seedfund.nsf.gov/solicitation-proposal/ | Fetched. |
| S45 | NSF SBIR and IES SBIR summaries, Granted AI (aggregator) | https://grantedai.com/blog/ed-ies-sbir-fy2026-june-29-deadline-250k-phase-i-1-million-direct-phase-ii-education-technology-startup-strategy ; https://manusights.com/blog/sbir-nsf-grant | Aggregators, search results. Verify against the solicitation. |
| S46 | Small-scale partnerships, Erasmus+ Programme Guide, European Commission | https://erasmus-plus.ec.europa.eu/programme-guide/part-b/key-action-2/small-scale-partnerships | Fetched. |
| S47 | Perkins V funding: ACTE Perkins 101 (Feb 2025); CTE state formula grants, US Dept. of Education | https://www.acteonline.org/wp-content/uploads/2025/03/ACTE-Perkins101-Funding-Feb2025.pdf ; https://cte.ed.gov/grants/state-formula-grants | FY2024 USD 1.44B. Search results. |
| S48 | NCES highlights CTE in 2024 Condition of Education, ACTE | https://www.acteonline.org/blog/cte-policy-watch/nces-highlights-cte-in-2024-condition-of-education-report/ | 85% of 2019 graduates earned a CTE credit. Search result. |
| S49 | GitHub repos: microsoft/pxt, wokwi/avr8js, wokwi/rp2040js, CircuitVerse/CircuitVerse | https://github.com/microsoft/pxt | Licence read by `gh api` on 2026-10-26: all MIT. TESTED. |
| S50 | Arduino home page, Arduino | https://www.arduino.cc/ | States "Arduino is now a Qualcomm company"; no date given. Fetched 2026-10-26 (fact-check). |

Estimate index: E1 is the model in section 6 and the script named there. Section 7 is a separate HYPOTHESIS funnel.

## Fact-check log (2026-10-26)

Checker re-opened sources with WebFetch on 2026-10-26. The web-search quota ran out during the check, so some items could not be searched again. Verdicts: confirmed (source says it), corrected (file changed), unconfirmed (marked UNKNOWN or flagged).

| # | Claim | Verdict | Source and what it said |
|---|---|---|---|
| 1 | Wokwi Hobby EUR 5.6, Hobby+ EUR 8.1, Pro EUR 20 per seat per month, annual billing; Community EUR 0 | confirmed. USD figures and "may vary by region" unconfirmed, noted | https://wokwi.com/pricing, EUR only, no regional note. Page does not say whether an account is needed. |
| 2 | Wokwi Classroom EUR 30 per student per semester, minimum 5 | confirmed. "Offline support free to 2025-10-31" removed | https://wokwi.com/classroom |
| 3 | Arduino Cloud Free/Maker USD 72/Team USD 1,000/School USD 20 per member | confirmed. Added Maker limits | https://cloud.arduino.cc/plans/ ; no currency code; no per-tier school prices |
| 4 | LabsLand Standard from EUR 7.99, Advanced from EUR 19.99 per student per semester; schools price not shown | confirmed | https://labsland.com/en/pricing/ |
| 5 | The Construct Basic free, Learner EUR 39.97/month or EUR 439/year, Enterprise EUR 2,399/year; Education "special discount" | corrected. Prices confirmed; Education discount unconfirmed, now UNKNOWN | https://www.theconstruct.ai/pricing/ |
| 6 | Proteus prices are placeholders; education cloud licensing | confirmed | https://www.labcenter.com/pricing/ |
| 7 | Tinkercad 100 million users | confirmed as vendor claim, date clarified (Nov 2025 text; page still 403) | Autodesk blog via search snippet [S12] |
| 8 | micro:bit 11.5M devices, 70M young people, 85+ countries, 75M MakeCode blocks per month | confirmed | https://microbit.org/news/2025-12-29/our-impact-in-2025/ |
| 9 | micro:bit goal of 100M children by 2028 | unconfirmed. Not on cited page; now UNKNOWN | same page |
| 10 | Raspberry Pi FY2025 revenue USD 323.2M (from 259.5M), 7.6M units (from 7.0M), 8.4M microcontroller units, de minimis benefit | confirmed (microcontroller units up 47% from 5.7M) | https://www.investegate.co.uk/announcement/rns/raspberry-pi-holdings-wi---rpi/fy-2025-results/9499135 (first 100,000 of 170,861 characters read) |
| 11 | Qualcomm agreement to acquire Arduino 2025-10-07, 33M users, no price | confirmed. Corrected: deal now appears closed, date UNKNOWN | https://tech.eu/2025/10/07/qualcomm-acquires-arduino-to-supercharge-the-global-maker-movement/ ; https://www.arduino.cc/ [S50]. A Qualcomm completion release URL guessed by the checker returned 404. |
| 12 | NCES 2022-23: 99,409 schools, 19,204 districts, 49,514,913 students | confirmed | https://nces.ed.gov/ccd/tables/202223_summary_2.asp |
| 13 | ABET 4,674 programmes, 920 institutions, 42 countries, 1 Oct 2023 | confirmed | https://www.abet.org/abet-accredits-110-additional-programs-in-2023/ |
| 14 | NSF Seed Fund "up to $2 million", no equity, project pitch invitation needed | confirmed. Phase I/II amounts (305,000 / 1,250,000) remain aggregator-only, unconfirmed | https://seedfund.nsf.gov/ ; https://seedfund.nsf.gov/solicitation-proposal/ (no amounts on page) |
| 15 | Erasmus+ small-scale partnerships EUR 30,000 / 60,000, 2 organisations, 6 to 24 months | confirmed; year and field of the page flagged (call ID is SPORT 2026; end date 2024) | https://erasmus-plus.ec.europa.eu/programme-guide/part-b/key-action-2/small-scale-partnerships |
| 16 | ESSER total USD 190B, last spent January 2025; CoSN quote | corrected. Quote by CoSN CEO Keith Krueger confirmed (2026-08-07); funds "ran out for all districts in early 2026"; USD 190B not in that article, UNKNOWN | https://edtechmagazine.com/k12/article/2026/08/esser-funds-are-gone-heres-how-k-12-it-leaders-replace-them-perfcon |
| 17 | Districts average about 2,982 tools in 2024-25, up 9% | corrected. Cited page gives 2,591 for 2022-23 (up about 1.7%); 2,982 now UNKNOWN. The Instructure 2024-25 report URL guessed by the checker returned 404. | https://www.k12dive.com/news/school-districts-ed-tech-use/685995/ |
| 18 | India: over 10,000 ATLs (Dec 2025), 50,000 more planned | confirmed for both; "budget 2025-26" attribution unconfirmed | https://www.newsonair.gov.in/govt-to-establish-50000-new-atal-tinkering-labs-in-schools-across-country (2025-12-03); Dinamalar article (2025-12-05) |
| 19 | FIRST: FLL 650,000+ in 77 countries, FTC 109,000+ in 81, FRC 93,000+ in 35 | confirmed | https://www.firstinspires.org/about/impact |
| 20 | Licences: pxt, avr8js, rp2040js, CircuitVerse all MIT | confirmed with `gh api` on 2026-10-26 | https://github.com/microsoft/pxt and the three other repos |

Not re-checked (no budget or page unavailable): AISHE, UDISE+, CSR totals, Eurostat, ETER counts, STEM market reports, Perkins V USD 1.44B, IES SBIR, Statista, Labster, eCalc, Onshape, Fab Foundation counts, Make directory. These keep their original labels and caveats.

Counts: 20 claims checked. Corrected: 5 (rows 2, 5, 11, 16, 17). Unconfirmed: 1 whole claim (row 9) plus unconfirmed parts of rows 14, 15 and 18. Confirmed in full: 11.
