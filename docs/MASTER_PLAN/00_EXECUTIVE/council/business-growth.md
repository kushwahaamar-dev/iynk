# iynk council memo: business model, unit economics and growth

Seat: FinOps and business analyst, and growth strategist. Written 2026-10-27. Scope: what keeps a free core alive, what it costs at 1k, 10k and 100k weekly actives, how to reach the first 1,000, and whether the proposed north star can be measured without being gamed.

Labels: VERIFIED (the audit inspected or reproduced it), DOCUMENTED (a project document says so), EXTERNAL (a research file cites a source, shown as file and [S#]), ESTIMATED (my arithmetic, assumptions shown), HYPOTHESIS (needs a test, test named), UNKNOWN. No confidence percentages. No interviews exist anywhere in the evidence base, so no statement here is customer demand.

Paths below are relative to `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/` unless they start with `docs/handoff`. My cost model script is `/Users/amar/iynk-master-plan-scratch/strategy/business-growth/model.py`.

## 1. Bottom line

1. A simulator licence is not a venture-scale business on this evidence. Base-case serviceable revenue in the US, India and EU is about $7.4M a year and realistic year-3 capture is about $0.30M a year (ESTIMATED, `02_RESEARCH/MARKET_ANALYSIS.md` section 6). The high case is $2.43M. The comparables are free (Tinkercad, MakeCode) or cheap (Arduino School $20 per member per year [S3], LabsLand from EUR 7.99 per student per semester [S5]).
2. The free core is cheap to run. Browser-side simulation means infrastructure is about $0.2 to $1.5 per weekly active per year at every scale I modelled (ESTIMATED, section 4.3). The cost that can hurt is the AI tutor, and the one cost that can hurt without anyone noticing is the unauthenticated AI proxy (VERIFIED, `01_AUDIT/SECURITY_BASELINE.md` C1).
3. People and compliance cost more than servers. At 10k weekly actives the cash need is about $25k to $55k a year; at 100k it is about $280k to $540k (ESTIMATED). The 100k case needs more than the base-case year-3 serviceable revenue, so a free core at that size has to be half funded by grants and sponsors, not seats.
4. Simplest viable model: free for every learner, no ads, no data sale; never charge for running, editing or sharing an experiment. Charge only for (a) teacher and institution administration (roster, assignments, progress export, privacy contract, LMS), and (b) metered things that cost real money to serve (AI turns beyond a daily cap, server compiles, private storage). Fund the first 12 to 18 months with grants and sponsored seats. This is a recommendation, not a finding; the willingness to pay is UNKNOWN until the waitlist test (T1) runs.
5. Distribution is the moat in this category, not features (`02_RESEARCH/competitors/education.md` line 240, HYPOTHESIS). The cheapest route to the first 1,000 weekly actives is about 35 adopted classes, not a viral launch. That needs a teacher view, which does not exist.
6. "First 1,000 weekly active creators" cannot be reached today by definition. Nobody can create: there are no accounts, no projects, no save, and each lesson ships a fixed circuit (VERIFIED, `01_AUDIT/FEATURE_VERIFICATION.md` section 1 items 5 and 7). The first reachable number is 1,000 weekly active learners.
7. The proposed north star is not measurable today and is easy to game. Verification is client-side everywhere, and the one "server re-runs your run" claim is CONTRADICTED (`01_AUDIT/FEATURE_VERIFICATION.md` section 1 item 3). Use a two-tier metric (section 4.6) and do not set targets on it until server replay exists.
8. Before any revenue step there are three gates: the licence and provenance decision (no LICENSE file, constants and lesson structure follow three third-party sites, `01_AUDIT/TECHNICAL_DEBT.md` line 309), the audience decision for under-13s (`02_RESEARCH/tech/compliance-safety.md` section 9), and cost controls on paid routes. None of them is optional for an institution contract.

## 2. Evidence reviewed

Read in full unless noted.

| File | Used for |
|---|---|
| `02_RESEARCH/MARKET_ANALYSIS.md` | TAM, SAM, SOM, competitor prices, grants, tests T1 to T10 |
| `02_RESEARCH/USER_SEGMENTS.md` | Segment scores, buyers, populations, channels |
| `02_RESEARCH/TECHNICAL_RESEARCH.md` (D10, D11, G1 to G14, cost table) | Platform and AI cost, compliance cost ranges |
| `02_RESEARCH/tech/platform-options.md` (sections 5, 6, 7) | Vercel, Fly, Neon, R2, AI price lists, compile and SITL cost |
| `02_RESEARCH/tech/compliance-safety.md` (sections 1, 6, 9) | COPPA, DPDP, GDPR-K, DPA, release blockers, cost of compliance |
| `02_RESEARCH/COMPETITOR_LANDSCAPE.md` (hypothesis grading, section 8) | What is already done by someone |
| `02_RESEARCH/competitors/education.md` | Buyer structure, micro:bit, Code Club reach, LMS as the paid layer |
| `02_RESEARCH/USER_RESEARCH_PLAN.md` (channel list, lines 160 to 185) | Community list and recruiting caveats |
| `01_AUDIT/FEATURE_VERIFICATION.md` (sections 0 to 2) | What exists, what is client-side, what is contradicted |
| `01_AUDIT/SECURITY_BASELINE.md` (cost and quota, route table, change list) | AI proxy exposure, rate limiter, spend controls |
| `01_AUDIT/PERFORMANCE_BASELINE.md` (bundle and figure sections) | Page weight, bandwidth cost, low-bandwidth cost |
| `01_AUDIT/inventory/server-data.md` | Telemetry, session id, duplicates, opt-out default |
| `01_AUDIT/TECHNICAL_DEBT.md` (licence and provenance rows) | Commercial blockers |
| `01_AUDIT/runs/BROWSER_WALK.md` (price lookup step) | Live prices failed |
| `docs/handoff/CONTEXT.md` | Founders' words: personal motive (cannot afford hardware), deploy decisions, "freeze", Tiger/Vultr/Vercel set up |

Not read in full: `SOURCE_REGISTER.md`, `WORKFLOW_BENCHMARK.md`, the other inventory files. I did not run any web search; every external number comes from the files above and keeps their labels and caveats. Channel names that are not in those files are my own leads and are marked as such.

What the evidence base does not contain, and this memo cannot fill: iynk's real traffic or return rate (UNKNOWN, `MARKET_ANALYSIS.md` section 0 and test T5), any customer interview, any paying-unit count from Tinkercad, Wokwi, Arduino or MakeCode, any price for Proteus, Labster or Clever, and where the founders' legal entity sits (UNKNOWN; it decides which grants are open).

## 3. Weaknesses

Each has evidence and a label.

| # | Weakness | Evidence | Label |
|---|---|---|---|
| W1 | The paying market is small and crowded. Base year-3 capture is about $0.30M a year across three regions; even the high case is under $2.5M. K-12 is the largest line (38% of base SAM) and its buyer compares iynk with Tinkercad, which is free and entrenched. | `MARKET_ANALYSIS.md` sections 0, 4, 6.2, 6.3 | ESTIMATED (assumptions in the file); HYPOTHESIS on pays-share, test T1 |
| W2 | No product asset yet exists that a school would pay for. There are no accounts, no teacher view, no roster, no saved work. The "recommend iynk if" conditions in the segment file for educators are "a teacher view of student work" and "no student accounts needed". | `FEATURE_VERIFICATION.md` section 1 item 5; `USER_SEGMENTS.md` segment 8 | VERIFIED (absence); HYPOTHESIS (that these gate purchase) |
| W3 | The differentiators are mostly copyable or already done. Only the combined workflow is graded "hard", and only if it becomes real. Original projects, the thing every segment needs, is "table stakes that iynk lacks". Affordable access is "already done by someone". | `COMPETITOR_LANDSCAPE.md` hypothesis grading, rows 1, 6, 9 | DOCUMENTED (researcher judgement) |
| W4 | Analytics cannot yet say who the users are. A random browser session id exists and telemetry defaults to opt-out. Counters are not idempotent, so completions are inflated by retries. Real weekly actives, return rate and country mix are not known. Telemetry rows expire after 30 days. | `01_AUDIT/inventory/server-data.md` lines 64, 76, 82, 120; `MARKET_ANALYSIS.md` section 7 and T5 | VERIFIED (code); UNKNOWN (actual traffic) |
| W5 | The AI route is an open cost tap. No authentication on any route; the AI chat route is protected by a browser-only origin check, 20 requests per minute per IP and 900 calls per hour, all counted in memory per instance. One request may run up to 4 model rounds of up to 6,000 output tokens. More warm instances means a higher ceiling. | `SECURITY_BASELINE.md` C1, C6, C7 and route table | VERIFIED |
| W6 | Cost of a free AI tutor is the only variable cost that scales with success, and its price list is moving. Gemini 3.8 Flash and 3.6 Flash double on 2027-01-01 and Gemini 4 Argon doubles on 2026-12-01. Gemini's terms bar apps likely to be used by under-18s. Meta's Muse Spark API is US-only preview with no cache price. Quality per model for hardware tutoring has not been tested. | `TECHNICAL_RESEARCH.md` F4, D11; `compliance-safety.md` line 146 | EXTERNAL; HYPOTHESIS (that Haiku-class quality is enough; spike RS-11) |
| W7 | Live prices, the basis of the "build it for real" and any affiliate idea, do not work. The search key had 0 of 250 searches left and returned HTTP 429; the keyless build falls back to catalogue prices. The per-process budget counter resets on each cold start. | `FEATURE_VERIFICATION.md` section 1 item 3; `runs/BROWSER_WALK.md` line 141; `SECURITY_BASELINE.md` C3 | VERIFIED |
| W8 | The verification story behind the north star and the credential is contradicted. A hand-written seven-event log gets a perfect score and anyone can mint to any wallet. Lesson checks, lap times and logs are all computed in the browser. | `FEATURE_VERIFICATION.md` section 1 items 3 and 4 | VERIFIED |
| W9 | Compliance gates sit in front of the school and under-13 market. No age signal, opt-out telemetry with a persistent id, public rooms and chat, a wallet address as a persistent public identifier, and AI providers whose terms bar minors. The research lists 14 items as release blockers before marketing to schools or under-13s. | `compliance-safety.md` sections 1.1, 7, 9 | EXTERNAL (law and terms); HYPOTHESIS (that iynk counts as child-directed) |
| W10 | Licence and provenance are unresolved. No LICENSE file; drone constants, lesson structure and timings follow three third-party sites with no permission on file; git cannot prove authorship timing. An institution contract needs an IP warranty. | `TECHNICAL_DEBT.md` line 309, B3-04, B11-02; `FEATURE_VERIFICATION.md` section 1 item 8 | VERIFIED |
| W11 | The product is heavy for the places the mission names. First load is about 900 KB transferred (about 7 s at 1 Mbit/s, ESTIMATED by the audit); four large chunks, including a 467 KB wallet stack that a lesson does not need, arrive after load. Offline and low-end device behaviour were not tested. | `PERFORMANCE_BASELINE.md` B1 to B3, line 94; `COMPETITOR_LANDSCAPE.md` row 9 | VERIFIED (sizes); UNKNOWN (real low-end devices) |
| W12 | The hosting plan may not be commercial. Vercel describes Hobby as personal, non-commercial; a company needs Pro ($20 per month with $20 credit). Which plan runs iynk.tech now is not recorded in the files I read. | `TECHNICAL_RESEARCH.md` F3 | EXTERNAL; UNKNOWN (current plan) |
| W13 | Two founders and limited capacity. The first build ran on a hackathon clock and hit usage limits; ongoing support, sales and compliance work for schools is a different job from building. Team size and hours after the event are not in the evidence. | `docs/handoff/CONTEXT.md` sections 5 and 6 | UNKNOWN (capacity); DOCUMENTED (history) |
| W14 | Price anchors are less firm than they look. Wokwi showed EUR in one fetch and USD in a search summary; Arduino's page names no currency; the market model treats EUR as equal to USD; India price benchmarks do not exist. | `MARKET_ANALYSIS.md` section 3, 6.1 | EXTERNAL with noted gaps |

## 4. Opportunities

### 4.1 Business model options compared

Test of each option: does it keep the experiment free, does it have evidence that someone pays, and can two founders run it.

| Model | Evidence someone pays | Keeps core free? | Build cost | Verdict |
|---|---|---|---|---|
| Institutional subscription (school, department) | Arduino School $20 per member per year [S3]; LabsLand from EUR 7.99 per student per semester [S5]; Wokwi Classroom EUR 30 per student per semester, minimum 5 students [S2]. EXTERNAL. | Yes, if it sells administration | Teacher view, rosters by join code, export, DPA. Weeks to months | Primary revenue line. Price below the incumbents' per-seat anchors and sell per class or per school, not per child |
| Classroom plan (one teacher) | Same anchors. K-12 buyer is the teacher or CTE director, small purchases under about $2,000 is a hypothesis (test T2) | Yes | Same as above | Merge with the line above. Start here with a waitlist (T1) |
| University licence | Strongest price evidence in the segment file; a competitor already prints a per-student list price. University segment scores highest (26 of 35, HYPOTHESIS) | Yes | Needs syllabus boards, grading export, LMS later | Second line. Test with 5 lecturers (T3) |
| Compute or advanced tier for individuals (AI beyond a cap, server compile, private storage) | Arduino Maker $72 per year, Wokwi Hobby EUR 5.6 per month annual. Conversion benchmark 2.6% for EdTech is low-confidence vendor data [S41] | Yes, if it meters only what costs money | Needs accounts, billing, tax. Months | Later. Fake-door test first (T6) |
| Team plans (professional engineers) | Wokwi Pro EUR 20 per seat per month; Arduino Team $1,000 per year. Highest pay, but iynk fit is 1 of 5 today (interpreters are subsets) | Yes | CI, accuracy docs, SSO | Not now |
| API access (MCP, OpenAPI) | No demand evidence. The tools are unauthenticated and two are paid (price lookup, build plan) | Yes | Keys, quotas | A free developer perk after cost controls. Not a revenue line |
| Manufacturer partnerships | micro:bit is funded by corporate and institutional partners [S13]; Raspberry Pi shipped 7.6M boards and modules and 8.4M microcontroller units in FY2025 [S36]. Price for a simulator sponsorship: UNKNOWN | Yes, if it never buys ranking or accuracy claims | Relationship work | Test by asking 5 vendors for a sponsored "verified board support" quote. HYPOTHESIS |
| Affiliate commerce (parts, kits) | None in the files. My arithmetic: 10k weekly actives, 2% buy one $60 kit a year, 5% commission = about $600 a year (ESTIMATED, every input is my assumption) | Conflicts with the mission: a "cheapest path" advisor is paid more for dearer parts | Live prices, which currently fail (W7) | Do not build. Revisit only if commission data comes from a vendor |
| Sponsored programmes ("sponsor a classroom") | India CSR: education was the largest category, about Rs 1,104 crore of Rs 17,967 crore for listed companies in FY2023-24 (secondary sites, totals conflict) [S33]. micro:bit thanks Amazon, Arm, Google and UNICEF [S13] | Yes. This is how seats reach people who cannot pay | Reporting, an eligible entity | Second pillar. Needs an entity decision |
| Grants and non-profit | NSF Seed Fund "up to $2 million", no equity, invitation after a project pitch [S44]; IES SBIR Phase I $250k per an aggregator, FY2026 round closed 2026-06-29 [S45]; Erasmus+ small partnerships EUR 30,000 or 60,000 [S46]. DRK-12 and ITEST show archived [S42][S43] | Yes | Writing time, a US small business for SBIR | Funds months 0 to 18. Needs the legal entity answer first |
| Creator marketplace | None. Free sharing sites already exist (Hackster, Hackaday.io, Instructables, Arduino Project Hub; `COMPETITOR_LANDSCAPE.md` lines 164 to 169) | Neutral | Accounts, save, moderation, payouts, tax, minors | Not before there are saved projects and a community (section 7) |

### 4.2 Recommended model: free learner, funded access, paid administration

Rules that keep the core free and keep the company honest:

1. Never gate running, editing, saving locally, or sharing an experiment by link. Never gate a lab or a language.
2. No ads, no data sale, no tracking for under-13s. This is also the cheapest compliance posture.
3. Charge for what an institution needs and an individual does not: roster by join code (no student emails), assignments, progress export, private rooms, LMS and SSO, a signed privacy contract (NDPA v2.2 per `compliance-safety.md` line 81), invoices.
4. Meter only variable cost: AI turns beyond a daily cap, server compiles, large private storage. A free user gets a small capped AI allowance on a cheap model. A "bring your own key" option for AI costs iynk nothing and keeps the free tier free (HYPOTHESIS that users want it; test by a settings toggle and a count).
5. Use cross-subsidy by place only after a sponsor pays for it: institutions in high-income markets pay list price; sponsors fund seats where nobody can. Do not offer a discount that depends on unverified claims of poverty.
6. Price points to test, not to assert. K-12: three class-plan prices anchored under Arduino's $20 per member (for a class of 30 that is $600 a year). University: three per-student prices under Wokwi's EUR 30 and around LabsLand's EUR 7.99 to 19.99. India: 25% and 50% of the US figure, per the model's own assumption (HYPOTHESIS, test T7).

Unit margin check (ESTIMATED): infrastructure per weekly active is $0.2 to $1.5 a year, so a 30-student class costs $6 to $45 a year in servers against a $600 anchor. Servers are not the margin problem. Sales effort, support, privacy paperwork and procurement delay are.

### 4.3 Unit economics at 1k, 10k and 100k weekly actives

All ESTIMATED. Assumptions, in the open:

- Monthly actives are 2.5 times weekly actives.
- 10% of weekly actives use the AI tutor, 4 sessions a month each. A session is the research's 12-turn case with prompt caching (`TECHNICAL_RESEARCH.md` D11). The cost per 1,000 sessions is $7.60 on Haiku 5.5, $32.88 on an 80 percent Haiku, 20 percent Sonnet mix, and $134 on Sonnet 5.5 alone. These are price only; quality is untested.
- Transfer is 2 MB per monthly active (first-load about 0.9 MB, then cache, plus lazy chunks). It stays inside Vercel Pro's 1 TB included at all three scales.
- Server compiles do not exist today because the interpreters avoid compiling. If original Arduino projects need them, I assume 10 compiles per weekly active per month at $0.0005 to $0.00095 each before any cache (`platform-options.md` section 5.2, based on an unmeasured 10 s compile).
- Storage: 5 saved projects of 50 KB each per weekly active. Negligible (under 30 GB at 100k).
- Platform baseline is the research's $27 to $46 a month at tiny scale. The 10k and 100k platform lines are my judgement for more Fly machines, a larger database, a shared rate-limit store and monitoring. They are the weakest numbers in this table.

| Monthly cost | 1k weekly actives | 10k | 100k |
|---|---|---|---|
| Platform (hosting, rooms, database, object storage, monitoring) | $50 to $60 | $100 to $200 | $400 to $1,000 |
| AI tutor, Haiku only / 80-20 mix / Sonnet only | $3 / $13 / $54 | $30 / $132 / $536 | $304 / $1,315 / $5,360 |
| Server compiles (if built) | $5 to $10 | $50 to $95 | $500 to $950 |
| Infra total, Haiku-only to 80-20 mix | about $60 to $85 | about $180 to $430 | about $1,200 to $3,300 |
| Infra total, worst case (Sonnet only) | about $125 | about $830 | about $7,300 |
| Infra per weekly active per year | $0.7 to $1.5 | $0.2 to $1.0 | $0.2 to $0.9 |
| Stress: every weekly active runs 4 AI sessions a month on the mix | $132 | $1,315 | $13,152 |
| Support and community (people) | founders | 0.5 person, about $1.5k to $2.5k | 2 to 3 people, about $10k to $25k |

Not in the table, UNKNOWN: the search provider plan price (the key is on a 250-search plan that ran out), Solana mainnet costs (the program is on devnet only), the price of a consent-verification provider, SOC 2 cost (no source).

Open-weight models change the AI line sharply. gpt-oss-120B on Fireworks costs $8.80 per 1,000 cached sessions in the research (EXTERNAL via the secondary source `platform-options.md` section 7.2), about $350 for 40,000 sessions. Whether it tutors hardware well enough is the RS-11 question. Until that runs, treat the AI figures as price, not as plan.

The exposure that is not in the table: the open AI route. If someone abuses `/api/ai/chat` up to its own rate cap on one instance, 900 calls an hour is 648,000 calls a month. At the Muse Spark price ($1.25 in, $4.25 out per million tokens, secondary source), a typical 4-round call of 12k input and 4k output tokens costs about $0.032, which is about $21k a month. At the 6,000 output-token cap per round it is about $0.117 a call, about $76k a month. Every extra warm instance raises the ceiling (ESTIMATED; assumptions mine). Provider-side spend caps and a kill switch are not in the files I read. This is the single most expensive thing in the repo, and it costs nothing to fix compared with the rest of this plan.

### 4.4 What must be true to break even

Break-even here means paying cash costs, not founder salaries at market rate. Cash cost per year is infra, part-time support, an amortised share of legal and accessibility work (Route A audience decision $1.5k to $5k of lawyer time, a policy and privacy-contract set, a VPAT with an audit at $5k to $25k per `TECHNICAL_RESEARCH.md` G11, an unsourced figure), and tools.

| Scale | Annual cash cost (ESTIMATED) | Equivalent revenue | What must be true |
|---|---|---|---|
| 1k weekly actives | $3k to $8k (infra under $1.5k, legal one-off) | One small grant, or 3 to 7 US school licences at the model's base $1,200 | Nothing hard. This is a funding-the-first-year problem, not a business problem |
| 10k weekly actives | $25k to $55k (infra $2k to $10k, support $18k to $30k, compliance amortised $5k to $15k) | 21 to 46 US school licences at $1,200, or 6 to 12 college deals at $4,500, or 1,250 to 2,750 school seats at $20 | At least a quarter of weekly actives sit in classes that a paid contract covers, or sponsors fund the gap. The year-3 base case has 166 US units and 24 colleges, so this is inside the base case but near its limit |
| 100k weekly actives | $280k to $540k (infra $14k to $88k, 4 people at $60k to $100k loaded, audits $20k to $50k) | 93 to 180 percent of the three-region base-case year-3 capture ($0.30M) | The free core at 100k cannot be carried by seat revenue in the base case. It needs sponsors or grants for at least half, or the high case ($2.43M) |

Individual subscriptions as a cross-check: `MARKET_ANALYSIS.md` section 7 shows $62k a year at 50,000 monthly actives, 2.6 percent paying, $48 a year. With my 10k weekly actives (25,000 monthly), a 1 percent conversion at $48 gives about $12k a year (ESTIMATED). I use 1 percent because the free-by-mission users are the least able to pay and the 2.6 percent benchmark is vendor marketing data for a mostly B2B mix. Treat individuals as a rounding error until T6 says otherwise.

Decision criteria (measurable):

- Pursue the institution line if T1 gets at least 3 percent of teacher visitors onto a priced waitlist (the market file's own pass signal) and at least 2 of 5 lecturers ask for a purchase order (T3).
- Fall back to a grant and sponsor-funded non-profit model if both fail after 90 days of effort, or if the cost of the privacy and IP gates is more than the first year's pipeline.
- Do not hire for support until weekly actives pass 5,000 or three paying institutions exist, whichever comes first.

### 4.5 Distribution: the first 1,000 weekly actives

Why classes beat communities. If a community post brings new users and only 20 percent of last week's users return (the market file's own pass bar for T5, so it is an optimistic target, not a measurement), holding 1,000 weekly actives needs about 800 new users a week, every week (1,000 = N + 0.2 x 1,000). A class of 30 that adopts for a term returns most of its students weekly (HYPOTHESIS) and arrives in one conversation. About 35 classes of 30, or 8 college courses of 60 plus 17 classes of 30, give about 1,000 enrolled. Activation will be below 100 percent, so plan for 1.5 times that.

Real weekly actives, return rate and country mix are UNKNOWN today. None of the numbers below are demand; they are plans with a test.

| Channel | Why it can reach | Realistic first-1,000 contribution | Cash cost | Founder hours (ESTIMATED) | What must be true | Label |
|---|---|---|---|---|---|---|
| Direct outreach to instructors at Indian engineering colleges (5,845 AICTE institutions [S29]; B.Tech enrolment 12.53 lakh) | Hindi UI, cheap, large cohorts, the founders' own story | 8 to 10 course adoptions of 60 = 500 to 600 | Under $200 (email tool, domain) | 150 to 200 (about 500 personal messages at 15 minutes, plus demos) | The product runs on lab PCs and slow links; a lecturer can see class progress; a 5 percent adoption rate (no data for this rate) | HYPOTHESIS; test: send 100 messages, count replies and pilots |
| US and Indian school teachers: CTE, robotics clubs, Atal Tinkering Labs (10,000+ established, 50,000 more announced [S31]) | Teacher is the distribution unit; ATLs already have a government-funded lab with a budget line | 15 classes of 30 = 450 | Under $200 | 100 | A teacher can start with no student accounts; the Atal Innovation Mission route needs permission and is slow, so go through individual ATL teachers first | HYPOTHESIS; test T2 and T7 |
| FIRST (FLL 650,000+, FTC 109,000+, FRC 93,000+ students [S22]) and VEX (2,400+ teams at Worlds [S23]) rookie teams | Teams without a kit before the season | 5 to 10 teams of 8 to 15 = under 150 | $0 | 40 | iynk matches the exact parts a team will get; only 13 robotics items exist today, fit UNKNOWN | HYPOTHESIS; test: ask 10 coaches which parts they need first |
| Raspberry Pi Code Clubs (9,117 clubs, 111 countries; about 2,500 in India [education.md, USER_SEGMENTS S35]) and micro:bit | The real reach benchmark in this category | Near zero in year 1; large if accepted | $0 | 60 over 6 months to prepare content they can review | They accept third-party tools, UNKNOWN; their editors already cover Python and Pico | HYPOTHESIS; test: one email each to a programme manager |
| Reddit: r/arduino (about 789K), r/esp32 (109K to 141K), r/embedded (214K to 272K), third-party trackers [USER_SEGMENTS S17 S18] | Self-taught makers, the most reachable and the most likely to share a link | A spike of visits; a few dozen weekly returners (HYPOTHESIS) | $0 | 20 per launch | Subreddit rules allow it (UNKNOWN: Reddit was not fetchable); the product offers something Wokwi does not, e.g. a free blank-canvas project | HYPOTHESIS; measure return rate after one post |
| Hacker News (a "Show HN" for another browser ESP32 simulator drew the comment that Wokwi's tier "is limiting", 2026-10-18 [USER_SEGMENTS S16]) | A visible audience for browser simulators and free alternatives | Spike, low retention | $0 | 10 | A working original-project mode; showing today's catalogue gets "it is a lesson player" | HYPOTHESIS |
| YouTube creators. Leads from my own knowledge, not researched: DroneBot Workshop, Paul McWhorter, Joshua Bardwell (FPV). Hindi electronics channels: not researched | A creator who uses it in a video sends a steady trickle | 50 to 200 weekly if one mid-size channel adopts (pure guess) | $0 to unknown (sponsorship rates UNKNOWN) | 30 per creator | Original projects and shareable links exist, so a viewer can open the exact project from the video | HYPOTHESIS; test: ask 5 creators for a 20-minute call |
| Hackathons and MLH (150,000+ hackers, 184 events in the 2025 season [S26]) | Credibility and one-day builders; the segment is the lowest-scored (18 of 35) with low repeat use | Under 100 | Free to attend; sponsorship tiers UNKNOWN | 20 per event | A shareable demo link; builders hold hardware only on the day | HYPOTHESIS. Use for press and proof, not for weekly actives |
| STEM non-profits, Fab Labs (2,500 to 3,000 labs in about 160 countries [S26]), libraries and makerspaces | Mission fit, low volume per lab | 10 labs of 15 = 150 | $0 | 50 | A lab coordinator can run a session with no installs | HYPOTHESIS |
| Search (827 static pages in the keyless build [BUILD_OUTPUT]; 80 figure pages) | Free, compounding | UNKNOWN; 3 to 6 months of lag (my judgement) | $0 | 20 to set up Search Console and fix titles | Competes on queries with Wokwi and Tinkercad; no search data exists | HYPOTHESIS; test: read impressions after 8 weeks |
| Paid ads | No CPC in the evidence | Not recommended | n/a | n/a | Paying to acquire users of a free product is untestable before T5 analytics exist | UNKNOWN |

Plan for the first 1,000 (HYPOTHESIS, 12 to 16 weeks, about 300 founder hours, under $1,000 cash): instructors at Indian colleges and ATL and US class teachers carry about 900; communities, creators and competition teams add the rest and, more important, supply proof. Stop criterion: if after 400 personal outreach messages fewer than 8 instructors start a pilot, the channel assumption is wrong. Change the pitch or the segment, do not buy ads.

The one product dependency is the teacher view. A teacher needs to see that a class ran the lab. Build it as join-code classes with no student emails; that also keeps the product closer to the privacy posture that schools need.

### 4.6 The proposed north star: "weekly users completing meaningful, independently verified hardware experiments or original project milestones"

Verdict: right direction, not usable as written. It cannot be measured today and it is easy to game once it can.

| Test | Finding | Label |
|---|---|---|
| Is "independently verified" possible now? | No. Verification is client-side for lesson checks, lap times and credential logs. The server does not re-run anything. A forged seven-event log scores perfectly. | VERIFIED (`FEATURE_VERIFICATION.md` section 1 items 3 and 4) |
| Is "meaningful" defined? | No. There are 461 checks (292 lesson, 169 task), written by the same team that builds the simulator, so the suite "compares the project with itself" rather than with hardware. | VERIFIED (counts and suite finding, `FEATURE_VERIFICATION.md` section 2 and item 6) |
| Does "original project milestone" exist? | No. There are no original projects, no accounts and no save; there is no oracle for "this custom circuit works". | VERIFIED |
| Does verifying a simulated run verify learning or a working real build? | No. The interpreters are subsets and the circuit solver is DC only. The metric would count simulator success. | VERIFIED (limits); HYPOTHESIS (that this diverges from real-world success) |
| Can it be counted per week per person? | Only by browser session id, which undercounts people across devices and overcounts after storage clears. Duplicated telemetry inflates completions. | VERIFIED (`server-data.md`) |
| Is it seasonal? | Yes. School terms and exam weeks swing a weekly number. | HYPOTHESIS |
| Does it measure the mission? | No. The mission is access regardless of money, place, language and equipment. The metric ignores who is reached and counts only those who succeed, not those who give up (the founder's own story is about giving up). | DOCUMENTED (`docs/handoff/CONTEXT.md` section 5, 09:58 entry) |

Ways to game it, all cheap:

- Edit the browser state or send a crafted log; no server check today.
- Re-run the same easy lesson every week; the metric counts users, not depth.
- Teachers or students farm checks in a class; one sign-in per device equals one user.
- The team lowers check difficulty or splits a lesson into more checks to raise the count (Goodhart).
- Wallet farms for credentials: the faucet and mint paths accept any address.

Proposal (HYPOTHESIS; adopt after server replay exists):

1. Two tiers, always reported together.
   - Activated learner: a distinct anonymous session per 7 days that passed at least one check not passed before. Client-side is fine. Reportable now once telemetry is fixed (opt-in or privacy-safe, idempotent event ids).
   - Verified builder: a distinct session per 7 days whose passing run was re-executed by the server on the submitted program and circuit, within the 20 s budget the checks already use. The interpreters are deterministic subsets, so server replay should be feasible (HYPOTHESIS; test with 50 lesson runs and compare client and server results).
2. Count a learner once per week, require a new check each week, and cap credit per lab per 28 days so repeating the first lesson does not move the number.
3. Add guardrails shown next to it, never hidden: share of verified completions in non-English locales, on small screens or low-end devices, and from outside the top three countries (these approximate "place, language and equipment"); median time to first pass; replay failure rate (a rise means forgery or a broken check).
4. For original projects, define a milestone as a program of named predicates over the simulated run, written by the learner or chosen from a menu ("the LED blinks at 1 Hz plus or minus 10 percent over 5 s", "supply current under 500 mA"), replayed by the server. That verifies the project does what its author said, not that the idea is good.
5. Do not publish a target for the verified tier until replay exists. Until then the honest north star is activated learners in classes that ran at least 3 weeks, which is also the leading indicator for revenue.
6. Add a lagging real-world metric later: self-reported physical builds from verified builders, sampled by a survey. Do not call it verified.

## 5. Answers to the red-team questions in my remit

The red-team list was not supplied to this seat. These are the questions I would put to the founders in my remit, answered from the evidence.

| Question | Answer |
|---|---|
| Who pays, when Tinkercad is free? | Institutions that need administration, privacy paperwork or a feature the free tool lacks. The only price evidence is for universities (Wokwi, LabsLand) and a K-12 plan from Arduino. For iynk it is UNKNOWN. Test T1 (priced waitlist) and T3 (five lecturers). Individuals pay little and the benchmark is low-confidence (`MARKET_ANALYSIS.md` section 4). |
| Can the free core survive at 100k weekly actives? | On servers, yes: about $1.2k to $3.3k a month if AI is routed and capped (ESTIMATED, section 4.3). On the whole organisation, only with sponsors or grants covering at least half of about $280k to $540k a year, since the base-case year-3 seat revenue is about $0.30M (ESTIMATED). |
| Is a venture-scale outcome realistic? | Not on this evidence. Base SAM is $7.4M and the best case is $28.6M SAM (`MARKET_ANALYSIS.md` section 6.3). A grant-funded non-profit or a small profitable company fits the numbers; a venture plan needs a bigger wedge than licences (UNKNOWN whether one exists). |
| Is "free for anyone" compatible with a business? | Yes if the rule is "free to run, paid to administer or to consume metered compute". It fails if the free tier depends on a paid AI tutor with no cap, or if revenue comes from ads, data or advising on parts. |
| Why would a school pick iynk over Wokwi, Arduino or Tinkercad? | Not shown yet. The researchers grade the unique pieces as copyable or already done, and the combined workflow as hard only once real (`COMPETITOR_LANDSCAPE.md`). Possible wedges: no-account entry, six languages, multi-board coverage (ESP32, STM32, FPGA, drones), a failure-modelling corpus, and trust after Arduino's November 2025 terms backlash [embedded-sim S9]. Test T4 (same task, 10 students, three tools). |
| Do hackathons bring users? | They bring credibility and one-day builders, not weekly actives. The segment scores lowest (18 of 35) with low repeat use (`USER_SEGMENTS.md` segment 7). |
| Is the north star measurable and ungameable? | Not yet, see section 4.6. |
| What if AI prices or terms change? | Route through a provider-neutral layer, cap free use, keep the stronger model for hard cases, use open-weight models for the free tier if RS-11 passes, and clear provider terms for minors first. Gemini prices double in the next two quarters and its terms bar apps likely used by minors (`TECHNICAL_RESEARCH.md` F4, D11). |
| Is the Solana credential a revenue line? | No evidence of demand, a hot key does everything, minting is forgeable, and public identifiers for minors conflict with deletion duties (`SECURITY_BASELINE.md` S3, `compliance-safety.md` section 7). Keep it off the business plan and off for minors. |
| What does compliance cost versus revenue? | Route A (13+ general audience): 1 to 2 engineering weeks plus $1.5k to $5k of lawyer time. Route B (child-directed with parental consent): 6 to 10 weeks plus $6k to $20k (ESTIMATED on an unsourced $300 to 500 per hour lawyer rate, `compliance-safety.md` line 54). Against a base-case average contract of about $1,300 (A1, A2 mix), Route B costs the first 5 to 15 contracts. |
| Can two founders sell to schools? | UNKNOWN. A school sale needs procurement paperwork, a privacy contract and support. Choose one segment and one region first. |
| Can the numbers be wrong? | Yes. Most inputs are my judgement or a researcher's. The biggest levers are the pays-share of US schools, seats per school, and the AI usage rate. Each has a test in section 9. |

## 6. What to build first (from the business and growth lens)

Ordered by how much each unlocks per week of work. Each reason ties to a weakness.

1. Cost and abuse controls on paid routes: provider-side spend caps and a kill switch, a shared counter, an authentication token for AI, search and MCP routes (W5, W6). Reason: it is the only way a good week of traffic turns into a five-figure bill, and a school cannot sign anything with an open tap behind it. Cheap and urgent.
2. Privacy-safe analytics that answer "how many people, how often, from where": idempotent event ids, an opt-in or no-persistent-id default, weekly actives by locale and device class (W4, W9). Reason: every number in this memo is an assumption until this exists (T5).
3. The licence and provenance decision, plus the written audience decision (13+ general audience versus child-directed) (W9, W10). Reason: nothing is sellable without them and they take a lawyer's time, not engineering.
4. A priced waitlist page for a Classroom plan and a one-page university pilot offer, with no payment taken (T1, T3, T6). Reason: the cheapest way to learn whether anyone pays. A day of work.
5. Original-project editor with local save and share-by-link (W2, W3). Reason: the product asset every segment and every creator channel needs, and the only way "creator" can be a real count. This belongs to the engineering lens; it is listed here because the growth plan and the north star depend on it.
6. Teacher view with join-code classes and no student emails (W2). Reason: unlocks the class-based distribution plan, the paid line, and a sound privacy story. Build it before accounts.
7. Server replay for lesson checks (W8). Reason: makes the verified tier of the north star real, and makes any certificate or report a teacher exports credible.
8. A grant pipeline: one SBIR project pitch if a US small business exists, one Erasmus+ partner enquiry, one India CSR or foundation conversation (T8, T10). Reason: funds months 0 to 18 and the sponsored seats. Each starts with the entity decision, so list it as an open question.
9. A lighter lesson page: drop the wallet stack from lessons, lazy-load CodeMirror, test on a real low-end Chromebook and a throttled phone (W11). Reason: access in low-bandwidth places is the mission, and it costs nothing in recurring fees.

## 7. What not to build yet, and the trigger that would change it

| Do not build yet | Why | Trigger |
|---|---|---|
| Payments, billing, invoicing | No evidence anyone pays; adds tax, refunds and fraud work | 3 institutions or 10 teachers say yes to a priced offer in writing, or T1 hits 3 percent |
| Individual subscription tier | Low expected revenue ($12k a year at 10k weekly actives, ESTIMATED), needs accounts | T6 fake door click-through at least 2 percent and weekly actives above 5,000 |
| Creator marketplace or paid project sales | Two-sided, needs accounts, save, moderation, payouts, minors | At least 5,000 saved original projects and 1,000 public ones, and creators ask |
| Affiliate links or price-based revenue | Tiny (about $600 a year at 10k weekly actives, ESTIMATED), conflicts with the mission, live prices broken | A vendor offers a fixed sponsorship with a written no-ranking clause |
| Team and enterprise plans, SSO for companies, SOC 2 | Segment fit is 1 of 5; Wokwi Pro owns it; SOC 2 is 3 to 6 months (my estimate) | A paying company asks and brings a budget |
| Public API as a product | No demand evidence; the tools are unauthenticated | Cost controls done and 10 outside developers ask for keys |
| On-chain credential sales or tokens | Forgeable, hot key, minors | Server replay exists, the key moves to KMS, and a lawyer clears an adult-only opt-in |
| Server SITL and compile at scale as a free feature | Cost is small per run ($47 to $1,700 for 10,000 30-minute sessions); abuse and isolation are the real cost | RS-05 passes (median under 30 s, under $0.005 per compile, isolation confirmed) and an abuse control exists |
| Paid ads and sponsorships of influencers | No return model before analytics | Weekly return above 20 percent (T5) and a known cost per activated learner from unpaid channels |
| Clever, ClassLink and LTI integrations | 3 to 8 weeks each (my estimates) for a buyer not yet shown | Three paying schools ask for the same one |
| More languages | Six exist; quality is unreviewed and 12 figure labels still show English in es and hi (`FEATURE_VERIFICATION.md` section 2) | A partner pays or a native reviewer volunteers, and a usage count by locale shows demand |

## 8. Risks

| Risk | Why it matters | Mitigation or early signal |
|---|---|---|
| AI cost shock (abuse or success) | Open route (W5), price rises, minors' terms (W6) | Caps, kill switch, tiered routing, open-weight free tier. Signal: daily spend alert above a set limit |
| Free incumbents respond | A free classroom tier with progress tracking would push the pays-share toward the low case; Qualcomm-owned Arduino and Autodesk have scale | Re-check prices every quarter (T9). Sell no-account entry and board coverage they do not offer |
| No buyer: the paying market is smaller than hoped | Year-3 capture of about $0.30M | Grants and sponsors from the start. Decide early to be a mission organisation with a revenue line, not a growth company |
| Compliance event with minors | A persistent id, public rooms and chat, wallet addresses, an AI provider whose terms bar minors | The release-blocker list in `compliance-safety.md` section 9 before any school or under-13 push |
| Legal exposure over provenance | Third-party constants and structure with no permission on file; no LICENSE | Founder and counsel decision, permission requests or a clean re-derivation of data (`TECHNICAL_DEBT.md` B3-04) |
| Funding mismatch | SBIR needs a US small business (my general knowledge, verify); India CSR needs an eligible entity; grants archive (DRK-12, ITEST) | Decide the entity first; confirm in the current solicitations |
| Founder capacity | Sales, support, compliance and building at once | One segment, one region, one paid offer; hire support only on the triggers in section 4.4 |
| Seasonality | School-term demand and exam weeks | Measure by term, not by week, in reports |
| Metric theatre | A gameable north star drives the wrong product work | Two-tier metric and guardrails (section 4.6) |
| Mission drift to rich users | Revenue sits in universities in high-income markets | Report access metrics beside revenue; commit sponsored seats at fixed shares of revenue |
| Vendor lock and price changes | Vercel, Fly, Neon and AI vendors change price (Vercel Hobby is non-commercial; AI list prices double) | Provider-neutral AI layer, R2 for storage, an exit note per vendor |
| Heavy pages exclude the target users | 900 KB first load and 24 MB of figures; untested on weak devices | Item 9 in section 6 and a Chromebook test |

## 9. Open questions and the cheapest way to answer each

| # | Question | Cheapest answer | Pass signal / decision |
|---|---|---|---|
| 1 | How many people use iynk each week, and do they return? | Ship privacy-safe analytics (idempotent ids, no persistent id for unknown ages); read for 4 weeks | Weekly return above 20 percent (T5) |
| 2 | Will teachers pay when Tinkercad is free? | Priced waitlist page; count work emails and class sizes; no payment | At least 3 percent of teacher visitors join at the test price (T1) |
| 3 | What is a school's actual budget line? | 15 short calls with CTE directors or heads of department | Most name a fund and a purchase under $2,000 (T2) |
| 4 | Do universities buy per student or per course, and at what price? | A one-term pilot with 5 lecturers, then ask for a price expectation | Two ask for a purchase order (T3) |
| 5 | Is iynk better than the free tools where it matters? | Same task in iynk, Tinkercad and Wokwi with 10 students | iynk wins on tasks that need boards the others lack (T4) |
| 6 | Will Indian institutions pay 25 to 50 percent of US prices? | Ask 10 colleges and 5 ATL schools for a stated price | Median at or above $2 per student per semester (T7) |
| 7 | Where does the legal entity sit, and is it a company, a non-profit or both? | One hour with a lawyer; list which grants each choice opens | A written choice; unlocks SBIR, CSR, Erasmus+ (T8) |
| 8 | Does a manufacturer pay for verified board support? | Email 5 board vendors with a one-page offer and ask for a number | One written reply with a price or a pilot |
| 9 | Is a Haiku-class or open-weight model good enough to tutor, and does caching hit? | RS-11: 50 scripted conversations, rubric scoring, cache logs | At least 90 percent of the top score at the lowest price; 80 percent of prefix tokens cached |
| 10 | Can the server reproduce client check results? | Replay 50 lesson runs on the server; compare pass or fail | 100 percent agreement, or a list of non-deterministic checks |
| 11 | What does the open AI route cost today? | Read provider dashboards for the last 30 days; add spend alerts | Daily cap enforced; no day above the cap |
| 12 | Is iynk reachable on low-end devices and slow links? | Run the lesson page on one Chromebook and a throttled phone, 1 Mbit/s | Interactive within 10 s on the slowest device (target is my choice) |
| 13 | Do creators or Code Clubs accept the tool? | One email to each of 5 creators and 2 programme managers | At least one 20-minute call |
| 14 | Does anyone want "bring your own AI key"? | Settings toggle with a click counter | Over 5 percent of AI users click |
| 15 | Will the founders commit hours after the hackathon, and in which region? | A direct conversation; write down hours per week and the first segment | A one-page commitment; it sets how many of the channels in section 4.5 are run |
| 16 | Is a priced K-12 plan or a university plan the better first offer? | Run T1 and T3 together for 8 weeks; compare the sign-up rates and the effort per lead | The line with more qualified leads per founder hour goes first |
