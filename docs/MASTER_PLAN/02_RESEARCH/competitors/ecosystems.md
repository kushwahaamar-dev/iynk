# Maker creation and project-sharing ecosystems competitors

Researcher: ecosystems. Date of research: 2026-10-26. Method: web fetches and searches plus GitHub API calls. Many sites (Autodesk, Printables, Thingiverse, Instructables terms, Hackaday blog) returned HTTP 403 or 404 to the fetch tool, so several facts rest on search-result summaries; these are marked. Training knowledge is not used as a source.

Label key: TESTED (done hands-on), EXTERNAL (a cited source states it), ESTIMATED (my calculation or reading, assumptions shown), HYPOTHESIS, UNKNOWN.

## Summary (what this category means for iynk)

- None of these products is a simulator except Wokwi. This category is where finished projects live, are shared and are credited. iynk has no "create and publish your own project" path today, so these are the places its users will go to share work instead. [S3][S8][S12]
- Sharing is link-first and fork-friendly. GitHub (forks), Wokwi (share a link, projects are public on the free plan) and Thingiverse/Printables (remix with licence choice) all let one person start from another's work and keep a credit trail. iynk needs a "fork and credit" model as its first creation feature. [S2][S21][S22][S17]
- Wokwi is the closest direct competitor for project sharing. Free Community plan: unlimited public projects, no private ones. Unlisted/private projects start at EUR 5.6/month billed annually. The pricing page lists no fully private option, only "unlisted". Its core simulator parts are MIT on GitHub (avr8js 852 stars, rp2040js 533, wokwi-elements 266, wokwi-cli 69), so a community already builds on them. [S21][S23]
- Public-by-default is the norm for free tiers (Onshape Free, Wokwi Community). Free plans trade privacy for cost. A free, private-by-default option for under-18 and classroom users would be a visible difference, but it must be weighed against moderation cost. [S4][S5][S21] (HYPOTHESIS)
- Manufacturers sponsor content through contests and branded platforms rather than ads. Hackster runs sponsor contests (Arduino, Autodesk, PCBWay, Qualcomm, Infineon, Nordic Semiconductor open as of 2026-10-26) and states 290+ company platforms. Hackaday uses small DigiKey-sponsored challenges. This is the revenue and distribution model iynk's board and parts vendors would plausibly use. [S8][S9][S15]
- Trust risk from platform ownership change is real. Arduino's terms update after the Qualcomm deal triggered public criticism (EEVblog thread); Thingiverse changed owner in February 2026 and is shifting policy to human-made content and new creator monetisation. iynk can state a clear content-ownership promise early. [S25][S26][S18][S19]
- Age policy varies. Hackster limits the site to ages 13+. Onshape requires a parent, school or educator to create accounts for under-13s (COPPA). iynk serves school-age users, so it needs a written age and moderation policy before enabling public publishing. [S10][S5]
- Corporate tutorial libraries (Adafruit 3,403 guides, SparkFun 956 tutorials, Arduino Project Hub 6,519 projects) are product marketing for the vendor's hardware. iynk could host or link "run this guide in the lab" versions, but must check each licence first (not stated on the pages read). [S24][S27][S28]
- Export to real toolchains is a norm among serious tools (Wokwi VS Code and CLI, Onshape/Fusion STEP/STL). iynk's Verilog and Arduino-subset interpreters are not real toolchains, so export of sketches that compile on real boards should be treated as a trust feature. [S22][S4] (HYPOTHESIS)

## Products

### 1. GitHub (de facto hardware project host)
- What it is: code and file hosting with forks, issues, pull requests, Pages and Actions. Hardware projects (firmware, KiCad files, Verilog) live here. Owner: GitHub, Inc. (Microsoft). [S1]
- Audience: all developers. Community size, per GitHub's about page (undated, page copyright 2026): 225M+ developers, 4M+ organisations, 800M+ repositories. [S1] EXTERNAL
- Pricing as of 2026-10-26 (USD): Free $0/month with unlimited public and private repos, 2,000 Actions minutes/month; Team $4/user/month for the first 12 months (page footnote not shown, so the price after month 12 is UNKNOWN; Team has 3,000 Actions minutes); Enterprise $21/user/month for the first 12 months (50,000 minutes). Actions minutes are free for public repos on every plan. Codespaces free allowance: 60 hours on a 2-core machine or 30 on 4-core, personal accounts only. [S2] EXTERNAL
- Licence: proprietary service. Each repo carries its own licence.
- Hands-on counts (TESTED, GitHub search API, 2026-10-26): topic:arduino 47,191 repositories; topic:esp32 27,646; topic:raspberry-pi 26,154; topic:verilog 7,616; topic:kicad 5,150. [S3] Other: arduino/arduino-cli 5,075 stars, GPL-3.0; KiCad source mirror 3,078 stars, GPL-3.0; arduino/Arduino 14,687 stars, licence reported as NOASSERTION (mixed). [S3] TESTED
- Original projects: any repo; fork to remix; credit via fork graph and licence file. Collaboration: pull requests, issues. Education: GitHub Education exists but was not verified here (UNKNOWN). No simulation, no circuit editor.
- Limitations: no hardware-aware preview of a circuit; beginners find git hard (ESTIMATED, no cited complaint gathered).
- iynk can learn/reuse: store iynk project files as plain JSON/text so they diff, fork and live in GitHub; offer "Open in iynk" badges and links from READMEs (like Wokwi's). (HYPOTHESIS)

### 2. Onshape (PTC)
- What it is: browser CAD with real-time multi-user editing, version history and branching. Owner: PTC. [S4]
- Pricing as of 2026-10-26 (USD, annual): Free $0 (non-commercial, all documents public); Standard $1,500/user/year; Professional $2,500/user/year (adds Simulation, Rendering, CAM, ECAD/MCAD exchange); Enterprise by quote. [S4] EXTERNAL
- Education: Student plan free for students of any age; Educator plan free for teachers and mentors, with Classes and Assignments and Simulation; no .edu address needed; homeschool families and coaches of qualified programs (e.g. robotics) can qualify; non-commercial only; accounts for under-13s must be created or authorised by a school, educator or parent (COPPA). Paid Education Enterprise adds CAM, PCB Studio, institutional sign-in. [S5] EXTERNAL (search summary of Onshape pages; full terms not read)
- Browser-based, no install. No-account entry: no (account needed). Collaboration model: share documents with live co-editing. Export: STEP/STL class formats (not verified on a page here; UNKNOWN).
- Licence: proprietary.
- Community size: UNKNOWN (no vendor figure retrieved).
- Limitations: free tier forces public documents, so students' work is publicly visible. [S4] (the cost of "free" is a documented tradeoff, not a user complaint)
- iynk can learn: a teacher-run Classes and Assignments flow is the LMS-like pattern to copy; the free-for-any-age student plan with parent/school authorisation is a ready policy model. [S5]

### 3. Autodesk Fusion
- What it is: desktop plus cloud CAD/CAM/ECAD. Owner: Autodesk. Autodesk pages returned 403 to my fetch tool; details below come from search-result summaries of Autodesk and third-party pages, so treat as EXTERNAL but unverified at source. [S6][S7]
- Fact-check: could not be re-verified (Autodesk page 403, search budget exhausted); all Fusion claims in this section are UNKNOWN until re-read at source.
- Personal use (free): individuals earning under $1,000/year, home and non-commercial projects, three-year term, renewable near expiry; no cloud rendering, simulation, generative design or paid extensions; community-forum support only. Export list varies by source (UNKNOWN which is current). [S6]
- Education: free one-year renewable licence for qualifying students and educators; educational purposes only. [S7]
- Commercial: paid subscription (price not retrieved; UNKNOWN).
- Licence: proprietary. Not browser-based as the primary app (UNKNOWN for web client).
- Limitations users raise: the long-standing forum thread "Please Autodesk don't limit the personal licenses" shows complaints about shrinking free-tier features (title only seen; content not read). [S6b]
- iynk can learn: a clear, short non-commercial eligibility line ("under $1,000 revenue") is how a free tier is policed.

### 4. Instructables (Autodesk)
- What it is: step-by-step project sharing with contests, Classes (launched Feb 2017) and a Pro membership. Owner: Autodesk (acquired announced 2011-08-01). [S11]
- Pro: launched June 2009 at roughly $2 to $4/month; free months for featured content; the Wikipedia page notes controversy and is flagged for update (Sept 2023). Current price UNKNOWN (site returned only "Loading" / 404 to fetch). [S11]
- Contests: many monthly, some Autodesk-sponsored; prizes mostly shirts and stickers, larger prizes depend on sponsors. [S11]
- Licence/terms, age policy, member count: UNKNOWN (page did not load). Searches for 2025-2026 Pro changes found nothing.
- Original projects: yes, authored as multi-step posts. No simulation or circuit editor.
- iynk can learn: the step-by-step "Instructable" format matches iynk's bench assembly steps; contests drive content supply at low prize cost.

### 5. Hackster.io (Avnet)
- What it is: hardware project community with sponsor platforms and contests. Owner: Avnet ("an Avnet Community", with Premier Farnell, element14, Newark). [S8]
- Size (vendor-stated, undated page, copyright 2026): 2.6M+ members in 150 countries; 46,000+ open-source projects; 290+ company platforms; 92,000+ contest participants; 8,500+ submissions; $2.2M+ in prizes. [S8] EXTERNAL
- Contests open as of 2026-10-26: Build the Autodesk University 2027 Product (Arduino, Autodesk, PCBWay, Qualcomm; to 2026-12-21), Infineon Boss Battle in the AI Arena (to 2027-01-04), Sustain the System (Nordic Semiconductor; to 2027-04-26). Prize values not shown. [S9] EXTERNAL
- Terms: ages 13+; creators keep ownership and grant Hackster a worldwide non-exclusive royalty-free licence; Hackster may edit or remove inappropriate descriptions and has not reviewed all content; spam and content meant to boost third-party search ranking are banned; sponsored-content rules not stated in the terms. [S10] EXTERNAL
- Pricing: free to join (not verified on a pricing page; UNKNOWN). Licence: proprietary service.
- Limitations: no complaints gathered (UNKNOWN).
- iynk can learn: sponsor-run contests with named company partners, and a "platform" page per vendor, is the model for board-maker partnerships.

### 6. Hackaday.io and the Hackaday Prize
- What it is: project logs, teams, private collaboration spaces, Q&A (/stack), chats, public API, sign-in via email, GitHub or X. Calls itself "the single largest online repository of Open Hardware Projects". [S12] EXTERNAL
- Owner: Supplyframe, which Siemens acquired in 2021. Hackaday.io began in 2014; about 100,000 members by 2015 (old figure). [S13] EXTERNAL
- Size now: the home page says "over a million members" (vendor-stated, undated; no project count given). The Hack Chat community lists 6,515 members (page snapshot 2026-10-26). Sign-up options seen on the page: standard join, GitHub, X (email login not confirmed). [S12] EXTERNAL (corrected in fact-check)
- Hackaday Prize: the prize site (prize.supplyframe.com) still shows the 2023 edition (First Place $50,000 plus residency; total tiers listed to $500 for top 50; sponsors DigiKey and Supplyframe). I found no 2025 or 2026 Hackaday Prize announcement. Status: UNKNOWN, possibly paused. [S14]
- Active contests instead: 2026 Retrocomputing Challenge (entries due 2026-10-27; the organisers pick three favourite projects for "a $150 gift certificate", and the post does not say whether that is per winner; DigiKey sponsors), 2026 Frikkin Lasers, 2025 Component Abuse, 2025 Pet Hacks. Entry = open a Hackaday.io project. [S15][S16]
- Pricing: free to use (not verified on a page; UNKNOWN). Licence: user content licences unverified (UNKNOWN).
- iynk can learn: entering a contest by simply publishing a project, with small sponsor gift-card prizes, keeps cost low.

### 7. Thingiverse
- What it is: 3D-model sharing site. Founded 2008. Ownership: Stratasys 2013, UltiMaker 2022, then MyMiniFactory acquired 100% in February 2026 (reported 2026-02-12 to 02-18); price undisclosed; new CEO Romain Kidd. [S17][S18][S19] EXTERNAL
- Size: "over eight million users" per trade press; combined with MyMiniFactory about 10 million; a 2024 Fabbaloo estimate of 6.78M models was not verified (page 403). Treat user figures as loosely defined. [S18][S19]
- Policy direction: new monetisation pathways and policies are said to favour human-made designs over automated or non-printable content (the CEO is quoted calling AI-generated content a threat to real creators); no formal policy text, fees or splits stated. Pulse 2 says Thingiverse has 6M+ designs and was founded in 2008. The claim that UltiMaker archived the Thingiverse forum on 2026-02-27 was not found in S18 or S19: UNKNOWN. [S18][S19]
- Licences: most designs under GPL or Creative Commons, chosen by the creator. Terms ban content that contributes to weapons or illegal materials. [S17]
- Terms page itself returned 403; age policy UNKNOWN.
- iynk can learn: the "remix" button with inherited licence and credit is the pattern; also the risk that owner changes upset communities.

### 8. Printables (Prusa Research)
- What it is: 3D-model platform with clubs, contests, a store, education section and Prusa Eshop links. Owner: Prusa Research a.s. (footer, 2026). [S20]
- Size: no current official total found. A Prusa post said it expected to pass one million uploaded files around May 2025 (about). A 2022 review gave 235,000 users and 120,000 models (old). [S20] EXTERNAL, dated
- Pricing: free; a premium/paid model section exists (3printr headline "premium section", not read). Licence list and age rules UNKNOWN (page 403).
- iynk can learn: contests plus a vendor-branded "Education" area.

### 9. Wokwi (project sharing)
- What it is: browser simulator for Arduino, ESP32, STM32, Pi Pico and more, with sharing by link, custom chips (C API), virtual logic analyzer, GDB for Arduino and Pico, WiFi simulation, SD card simulation, VS Code and CI. Free for personal use, paid for commercial use. [S22] EXTERNAL
- Pricing as of 2026-10-26 (page showed EUR, annual billing; a search summary showed USD $7/$12/$25 monthly, so the displayed currency may vary by locale): Community EUR 0 (open source projects, unlimited public projects); Hobby EUR 5.6/month (100 fast build minutes, unlisted projects, custom library uploads, private IoT gateway); Hobby+ EUR 8.1/month (500 minutes, VS Code); Wokwi Pro EUR 20/seat/month (1,000 build minutes, 2,000 CI minutes, team billing). Free plan: all projects public. [S21] EXTERNAL
- Open source: avr8js MIT 852 stars (last push 2026-08-31); rp2040js MIT 533 (2026-10-18); wokwi-elements MIT 266 (2026-10-25); wokwi-cli MIT 69 (2026-10-23). The full Wokwi service licence was not confirmed. [S23] TESTED (GitHub API)
- User count: UNKNOWN (no vendor figure found; Wokwi blog newest post is 2023). [S22b]
- Original projects: yes; sketch and diagram.json; custom chips; custom libraries need a paid plan. Firmware compatibility: runs compiled firmware including VS Code flow (EXTERNAL). Classroom offer: three months of Pro free (search summary). [S21]
- Limitations (EXTERNAL, forums, older): not all Arduino libraries available; one forum user said no transistors at that time (date not verified). [S29]
- iynk can learn/reuse: MIT parts (avr8js, rp2040js) are reusable with attribution; copy "share link, fork, public by default" and the CI idea. Wokwi is the main benchmark for an AVR/Pico fidelity claim.

### 10. Arduino Project Hub
- What it is: user projects on arduino.cc/projecthub; types: Tutorial, Showcase, Getting started, Teardown, Work in progress; filter by product and difficulty. Count shown: 6,519 projects over 109 pages (2026-10-26). Owner: Arduino, acquired by Qualcomm (Arduino FAQ states the deal is complete; dates UNKNOWN, see below). [S24][S30] EXTERNAL
- Licence of projects: not stated on the page (UNKNOWN). Terms: Arduino's 2025 terms update covering Project Hub, Forum and cloud apps drew criticism (broad content licence, reverse-engineering limits); Arduino replied 2025-11-21 that published content remains the creator's (usable to run features such as cloud services and collaboration), that inactive accounts are deactivated after 24 months, and that the reverse-engineering restriction applies only to its SaaS cloud applications, not to open-source hardware, software and libraries. [S25][S26] EXTERNAL. Qualcomm's release is titled "Qualcomm to Acquire Arduino" (URL path 2025/10); Arduino's FAQ now says Qualcomm "has acquired" Arduino, but gives no date, so the 2025-10-07 date and the closing date are UNKNOWN from sources read. [S30]
- Sponsored: Qualcomm hardware promoted (VENTUNO Q banner), Robotics Hub and Dragonwing Hub sections. [S24]
- iynk can learn: ownership-of-content wording is a trust issue; write it plainly.

### 11. Adafruit Learning System
- What it is: Adafruit's tutorial site: 3,403 tutorials in 34 categories (2026-10-26), difficulty levels, author credits, links to Forums and Playground. Guides can be contributed via a Git/GitHub fork workflow (image pages show Creative Commons Attribution labels on that guide's diagrams; overall licence UNKNOWN). [S27] EXTERNAL
- Owner: Adafruit Industries. Pricing: free to read. Revenue: sells the hardware the guides teach (ESTIMATED from the site's purpose; not stated on page).
- iynk can learn: guides as Git repos give version history and community fixes. A "simulate this guide" button is an obvious integration (HYPOTHESIS).

### 12. SparkFun tutorials
- What it is: "Viewing all 956 Tutorials" on learn.sparkfun.com, filter by tag, sort by date; links to a community forum and a GitHub profile. Licence and contribution rules not on the page (UNKNOWN). [S28] EXTERNAL
- Same pattern as Adafruit: vendor-run documentation as marketing for its parts.

### 13. Maker community forums
- Arduino Forum (forum.arduino.cc) hosts tool comparisons like Tinkercad vs Wokwi (2021 thread) [S29]; EEVblog forum carried the "RIP Arduino" thread on the 2025 terms change (5,000+ views at snapshot) [S26]; Dronebot Workshop forum hosts simulator questions [S29]. Hackaday.io has Hack Chat (6,515 members) [S12]. These are where first-time users ask for help; none offers hosted projects.
- Activity counts: UNKNOWN beyond the view counts above.
- iynk can learn: users compare simulators on these forums; being present with honest comparisons matters. Lab questions could link to forum-ready exports (HYPOTHESIS).

## Comparison table

None of these products except Wokwi simulates hardware. Cells for simulator-only dimensions are "No (not a simulator) ESTIMATED" unless the source says otherwise. To keep tables readable, dimensions are split into three tables. Abbreviations: GH GitHub, ON Onshape, FU Fusion, INS Instructables, HS Hackster, HIO Hackaday.io, TV Thingiverse, PR Printables, WK Wokwi, APH Arduino Project Hub, ALS Adafruit Learning System, SF SparkFun, FOR forums.

### Table A: access and creation

| Product | Free usage | No-account entry | Browser-based | User-created projects | Circuit editor | Custom hardware models | Pricing |
|---|---|---|---|---|---|---|---|
| GH | Yes, Free $0 EXTERNAL [S2] | Browse yes, create no EXTERNAL [S2] | Yes (repo UI) ESTIMATED | Yes EXTERNAL [S2] | No ESTIMATED | Files only ESTIMATED | Free/Team $4/Ent $21 [S2] |
| ON | Yes, non-commercial, public docs EXTERNAL [S4] | No UNKNOWN | Yes EXTERNAL [S4] | Yes EXTERNAL [S4] | CAD, PCB Studio on paid EXTERNAL [S5] | CAD parts EXTERNAL [S4] | Free/$1,500/$2,500 yr [S4] |
| FU | Personal use free, under $1,000 revenue EXTERNAL [S6] | No UNKNOWN | Not primary UNKNOWN | Yes EXTERNAL [S6] | ECAD in product UNKNOWN | CAD UNKNOWN | Price UNKNOWN |
| INS | Free reading; Pro paid, price UNKNOWN [S11] | Read yes ESTIMATED | Yes ESTIMATED | Yes (posts) EXTERNAL [S11] | No ESTIMATED | No ESTIMATED | Pro ~$2-4/mo in 2009 [S11] |
| HS | Yes UNKNOWN price | Read yes ESTIMATED | Yes ESTIMATED | Yes, 46,000+ EXTERNAL [S8] | No ESTIMATED | No ESTIMATED | UNKNOWN |
| HIO | Yes UNKNOWN price | Read yes ESTIMATED | Yes EXTERNAL [S12] | Yes EXTERNAL [S12] | No ESTIMATED | No ESTIMATED | UNKNOWN |
| TV | Yes UNKNOWN price | Browse yes ESTIMATED | Yes ESTIMATED | Yes EXTERNAL [S17] | No ESTIMATED | 3D models EXTERNAL [S17] | UNKNOWN |
| PR | Yes UNKNOWN price | Browse yes ESTIMATED | Yes ESTIMATED | Yes EXTERNAL [S20] | No ESTIMATED | 3D models ESTIMATED | UNKNOWN |
| WK | Yes, Community EUR 0 EXTERNAL [S21] | Yes, can run public link ESTIMATED | Yes EXTERNAL [S22] | Yes EXTERNAL [S22] | Yes, diagram editor EXTERNAL [S22] | Custom chips via C API EXTERNAL [S22] | EUR 0/5.6/8.1/20 mo annual [S21] |
| APH | Yes UNKNOWN | Read yes ESTIMATED | Yes EXTERNAL [S24] | Yes, 6,519 EXTERNAL [S24] | No ESTIMATED | No ESTIMATED | UNKNOWN |
| ALS | Free read EXTERNAL [S27] | Yes ESTIMATED | Yes EXTERNAL [S27] | Staff and contributors EXTERNAL [S27] | No ESTIMATED | No ESTIMATED | Free |
| SF | Free read EXTERNAL [S28] | Yes ESTIMATED | Yes EXTERNAL [S28] | Vendor-led UNKNOWN | No ESTIMATED | No ESTIMATED | Free |
| FOR | Free ESTIMATED | Read yes ESTIMATED | Yes ESTIMATED | Posts only ESTIMATED | No | No | Free |

### Table B: simulation and engineering depth

| Product | Firmware compat. | MCU sim fidelity | Analog fidelity | Failure modelling | Debugging tools | Robotics sim | Drone sim | AI guidance |
|---|---|---|---|---|---|---|---|---|
| GH | Hosts any; Actions can build EXTERNAL [S2] | No ESTIMATED | No ESTIMATED | No ESTIMATED | Issues only ESTIMATED | No | No | Copilot exists UNKNOWN in this research |
| ON | N/A | N/A | N/A | Simulation on Pro EXTERNAL [S4] | N/A | No ESTIMATED | No | UNKNOWN |
| FU | N/A | N/A | Simulation excluded in personal use EXTERNAL [S6] | N/A | N/A | No ESTIMATED | No | UNKNOWN |
| INS, HS, HIO, TV, PR, APH, ALS, SF, FOR | No (content sites) ESTIMATED | No | No | No | No | No | No | UNKNOWN |
| WK | Runs compiled firmware; VS Code and CLI EXTERNAL [S22] | UNKNOWN (AVR and Pico cores open: avr8js, rp2040js) [S23] | UNKNOWN | Heap-leak CI check only EXTERNAL [S22] | GDB (Arduino, Pico), logic analyzer EXTERNAL [S22] | No ESTIMATED | No ESTIMATED | Blog 2023 on ChatGPT; product feature UNKNOWN [S22b] |

### Table C: community, education, commerce

| Product | Multilingual UI | Real-time collab | Curriculum/LMS | Community features | BOM generation | Purchasing | Export to toolchains | Plugin extensibility | Target audience | Ecosystem strength | Moat |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GH | UNKNOWN | PRs, not live ESTIMATED | GitHub Education UNKNOWN | Issues, discussions ESTIMATED | No | No | Source files ESTIMATED | Apps, Actions EXTERNAL [S2] | All developers | 225M devs, 800M repos EXTERNAL [S1] | Network and default location |
| ON | Multi UI pages seen (de, it, es, ja) EXTERNAL [S5] | Yes ESTIMATED (core feature, not tested) | Classes and Assignments EXTERNAL [S5] | Public docs EXTERNAL [S4] | CAD only | No | UNKNOWN | UNKNOWN | CAD users, students | UNKNOWN | Cloud CAD and education reach |
| FU | Multi (es page seen) EXTERNAL [S6] | Collab limited in personal EXTERNAL [S6] | Edu licence EXTERNAL [S7] | Forum EXTERNAL [S6] | UNKNOWN | UNKNOWN | Formats list varies UNKNOWN | UNKNOWN | Hobby and pro | UNKNOWN | Autodesk install base |
| INS | UNKNOWN | No | Classes (2017) EXTERNAL [S11] | Contests, comments EXTERNAL [S11] | No | No | No | No | Makers, DIY | Brand since 2005 EXTERNAL [S11] | Content archive |
| HS | UNKNOWN | No | UNKNOWN | Contests, 290+ platforms EXTERNAL [S8] | Parts lists in projects ESTIMATED | Avnet family links EXTERNAL [S8] | No | No | Embedded devs | 2.6M members EXTERNAL [S8] | Vendor sponsors |
| HIO | UNKNOWN | Private team spaces EXTERNAL [S12] | No | Chat, Q&A, Prize EXTERNAL [S12] | UNKNOWN | UNKNOWN | No | Public API EXTERNAL [S12] | Hackers | "Over a million members" (vendor-stated) EXTERNAL [S12] | Hackaday media reach |
| TV | UNKNOWN | No | No | Remix, comments ESTIMATED | No | No | STL files ESTIMATED | No | 3D printing | 8M+ users EXTERNAL [S18] | Incumbent library |
| PR | UNKNOWN | No | Education section EXTERNAL [S20] | Clubs, contests EXTERNAL [S20] | No | Prusa Eshop link EXTERNAL [S20] | STL/3MF ESTIMATED | No | Prusa printer owners | ~1M files (2025) EXTERNAL [S20] | Printer vendor tie-in |
| WK | UNKNOWN | Not mentioned on docs home (link sharing only) UNKNOWN | Classroom offer EXTERNAL [S21] | Shared links, public projects EXTERNAL [S22] | UNKNOWN | UNKNOWN | VS Code, CLI EXTERNAL [S22] | Chips API EXTERNAL [S22] | Hobby to pro | OSS repos with 266 to 852 stars TESTED [S23] | Fidelity plus embeds |
| APH | Possibly multi UNKNOWN | No | UNKNOWN | Project types, difficulty EXTERNAL [S24] | UNKNOWN | Arduino store UNKNOWN | Arduino IDE ESTIMATED | No | Arduino users | 6,519 projects EXTERNAL [S24] | Official brand |
| ALS | UNKNOWN | Git forks EXTERNAL [S27] | Guides by level EXTERNAL [S27] | Forums, Playground EXTERNAL [S27] | UNKNOWN | Adafruit shop ESTIMATED | CircuitPython ESTIMATED | No | Beginners to advanced | 3,403 guides EXTERNAL [S27] | Quality and vendor |
| SF | UNKNOWN | No | UNKNOWN | Forum EXTERNAL [S28] | UNKNOWN | SparkFun shop ESTIMATED | No | No | Hobbyists | 956 tutorials EXTERNAL [S28] | Vendor docs |
| FOR | Mixed | No | No | Q&A EXTERNAL [S26][S29] | No | No | No | No | Beginners to pros | Large (counts UNKNOWN) | Trust and answers |

## Where iynk could be genuinely different here (HYPOTHESIS unless evidenced)

1. Publish a real original project (board plus parts plus code plus fault scenarios) as one forkable object, then embed it anywhere with a link. Only Wokwi does this for circuits, and only for microcontroller sketches [S22]. Robotics and drone builds have no equivalent shared format in this category.
2. Free, private-by-default for students and teachers, with roster and assignments modelled on Onshape's Classes and Assignments [S5], without forcing public work as Onshape Free and Wokwi Community do [S4][S21].
3. Fault-injection scenarios as a publishable artefact ("debug this broken circuit"), with credit and remix. No product here offers it; Wokwi's CI heap check is the nearest [S22].
4. Six UI languages: language support was visible on Onshape and Autodesk pages but is UNKNOWN on every maker-sharing site checked; a multilingual project gallery may be a gap. Needs verification. [S5][S6]
5. Vendor-sponsored contests on iynk, copying Hackster's model [S8][S9] at small prize sizes like Hackaday's DigiKey gift cards [S15].
6. A plain, early content-ownership and age policy, given recent trust losses at Arduino and the ownership change at Thingiverse [S25][S26][S18].
7. Reuse path: MIT-licensed avr8js, rp2040js and wokwi-elements could be studied or reused with attribution if iynk wants to cross-check its own cores [S23]. Licence check per file is still needed.

## Sources

Access date for all: 2026-10-26. "Describes" gives the version or date the page states. Where my fetch got 403/404, I say so and the source is a search-result summary.

- S1. https://github.com/about, "About GitHub", GitHub, Inc. Describes: undated stats, page copyright 2026.
- S2. https://github.com/pricing, "Pricing", GitHub, Inc. Describes: current plans on 2026-10-26.
- S3. GitHub REST API calls (`gh api search/repositories` and `repos/...`), GitHub, Inc. TESTED 2026-10-26 (counts and stars at that moment).
- S4. https://www.onshape.com/en/pricing, "Pricing", PTC/Onshape. Describes: current.
- S5. https://www.onshape.com/en/education/sign-up and https://www.onshape.com/en/blog/introducing-educator-plan, Onshape education pages, PTC. Seen via search-result summary; full terms not read.
- S6. https://www.autodesk.com/products/fusion-360/blog/fusion-for-personal-use-vs-autodesk-fusion/ and https://www.autodesk.com/es/products/fusion-360/personal-form, Autodesk. Direct fetch returned 403; content via search summary. S6b: https://forums.autodesk.com/t5/fusion-support-forum/please-autodesk-don-t-limit-the-personal-licenses/td-p/9750422, Autodesk forums (title only).
- S7. https://www.autodesk.com/education/edu-software/fusion, "Autodesk Fusion for education", Autodesk. Via search summary.
- S8. https://www.hackster.io/about, Hackster.io (Avnet). Describes: undated stats, copyright 2026.
- S9. https://www.hackster.io/contests, Hackster.io. Describes: contests on 2026-10-26.
- S10. https://www.hackster.io/terms, "Terms of Service", Hackster.io. Version date not shown.
- S11. https://en.wikipedia.org/wiki/Instructables, Wikipedia. Pro section flagged Sept 2023. instructables.com/about returned only "Loading"; terms returned 404.
- S12. https://hackaday.io/, Hackaday.io, Supplyframe. Snapshot 2026-10-26.
- S13. https://en.wikipedia.org/wiki/Hackaday, Wikipedia.
- S14. https://prize.supplyframe.com/, Hackaday Prize, Supplyframe. Describes: 2023 edition (stale).
- S15. https://hackaday.com/2026/08/18/announcing-the-2026-hackaday-retrocomputing-challenge/, Hackaday, 2026-08-18.
- S16. Search results for Hackaday contests, e.g. https://hackaday.com/2026/10/24/2026-retrocomputing-challenge-i-would-do-anything-for-serial-data/, https://hackaday.io/submissions/2025-pet-hacks-challenge/list, Hackaday.
- S17. https://en.wikipedia.org/wiki/Thingiverse, Wikipedia (tagged as leaning on primary sources).
- S18. https://3dprintingindustry.com/news/thingiverse-joins-myminifactory-in-major-3d-printing-community-consolidation-248924/, 3D Printing Industry, 2026-02-13.
- S19. https://pulse2.com/myminifactory-acquires-thingiverse-to-create-largest-creator-first-community, Pulse 2, 2026-02-18; also https://ultimaker.com/learn/myminifactory-acquires-thingiverse/ (not opened).
- S20. https://www.printables.com/ (footer "2026 Prusa Research a.s." seen in search results) and https://www.printables.com/article/a-milestone-worth-celebrating-Wd2bpwd, Printables/Prusa (search result only; 403 on direct fetch). Count figures from search summary.
- S21. https://wokwi.com/pricing, "Wokwi Pricing", Wokwi. Describes: current on 2026-10-26.
- S22. https://docs.wokwi.com/, Wokwi Docs. S22b: https://blog.wokwi.com/ (newest post 2023-03-05).
- S23. https://github.com/wokwi/avr8js, /rp2040js, /wokwi-elements, /wokwi-cli, GitHub API TESTED 2026-10-26.
- S24. https://projecthub.arduino.cc/, "Arduino Project Hub", Arduino. Snapshot 2026-10-26.
- S25. https://blog.arduino.cc/2025/11/21/the-arduino-terms-of-service-and-privacy-policy-update-setting-the-record-straight/, Arduino Blog, 2025-11-21 (search result only).
- S26. https://www.eevblog.com/forum/blog/eevblog-1721-rip-arduino-(new-tc-deep-dive)/, EEVblog forum (search result only; community opinion).
- S27. https://learn.adafruit.com/, Adafruit Learning System, Adafruit. Snapshot 2026-10-26.
- S28. https://learn.sparkfun.com/tutorials, SparkFun. Snapshot 2026-10-26.
- S29. https://forum.arduino.cc/t/virtual-online-arduino-and-esp32-simulator-wokwi-arduino-simulator-features/698481/3 and https://forum.dronebotworkshop.com/arduino/arduino-on-line-simulator/, community forums (search result only, 2021 and undated; community opinion).
- S30. https://www.arduino.cc/qualcomm-faq/ and https://www.opensourceforu.com/2025/10/qualcomm-embraces-open-hardware-with-arduino-deal/, Arduino and OpenSourceForU, Oct 2025 (search result only).

## Fact-check log (2026-10-26)

Checked by a second researcher on 2026-10-26. Fetch tool used on the cited URLs; the GitHub API was re-run. The web search budget ran out, so a few items could not be re-checked and are marked.

| # | Claim | Verdict | Source |
|---|---|---|---|
| 1 | GitHub Free $0, 2,000 Actions min, Team $4 and Enterprise $21 "first 12 months", Codespaces 60h/30h personal only | confirmed; added Team 3,000 and Enterprise 50,000 minutes, public-repo minutes free, and that the price after 12 months is UNKNOWN (footnote not shown) | [S2] https://github.com/pricing |
| 2 | GitHub topic counts (arduino 47,191; esp32 27,646; raspberry-pi 26,154; verilog 7,616; kicad 5,150) | confirmed, same numbers re-run (TESTED) | [S3] GitHub API |
| 3 | arduino-cli 5,075 stars GPL-3.0; Arduino/Arduino 14,687 NOASSERTION; KiCad mirror 3,078 GPL-3.0 | confirmed (TESTED) | [S3] GitHub API |
| 4 | Wokwi plans EUR 0 / 5.6 / 8.1 / 20, annual billing, minutes | confirmed | [S21] https://wokwi.com/pricing |
| 5 | Wokwi "unlisted/private" from EUR 5.6 | corrected: page lists only "unlisted", no private option | [S21] |
| 6 | Wokwi repos avr8js 852, rp2040js 533, wokwi-elements 266, wokwi-cli 69, all MIT | confirmed (TESTED) | [S23] GitHub API |
| 7 | Wokwi features (GDB Arduino and Pico, logic analyzer, WiFi, SD, Chips API, VS Code, CI heap check) | confirmed; paid plan needed for binary SD uploads; no AI or collaboration feature mentioned on docs home, so the "no live co-edit" cell is now UNKNOWN | [S22] https://docs.wokwi.com/ |
| 8 | Onshape Free $0 non-commercial, all documents public; Standard $1,500; Professional $2,500 with Simulation, Rendering, ECAD/MCAD, CAM | confirmed | [S4] https://www.onshape.com/en/pricing |
| 9 | Hackster 2.6M+ members, 150 countries, 46,000+ projects, 290+ platforms, 92,000+ participants, 8,500+ submissions, $2.2M+ prizes | confirmed | [S8] https://www.hackster.io/about |
| 10 | Hackster open contests and dates | confirmed; prize values are behind links, not read | [S9] https://www.hackster.io/contests |
| 11 | Hackaday.io size UNKNOWN; Hack Chat 6,515 | corrected: home page states "over a million members"; Hack Chat 6,515 confirmed; sign-up via GitHub or X seen | [S12] https://hackaday.io/ |
| 12 | Hackaday Prize site shows 2023 edition, no later edition | confirmed (First $50,000, 2nd $20,000 ... top 50 $500; Digi-Key and Supplyframe) | [S14] https://prize.supplyframe.com/ |
| 13 | Retrocomputing Challenge due 2026-10-27, "three winners get $150" | corrected: three favourite projects share "a $150 gift certificate", per-winner amount not stated; due date and DigiKey confirmed | [S15] |
| 14 | Thingiverse bought by MyMiniFactory, Feb 2026, CEO Romain Kidd, 8M+ users, ~10M combined | confirmed (articles dated 2026-02-13 and 2026-02-18; price undisclosed) | [S18] [S19] |
| 15 | "UltiMaker archived the Thingiverse forum on 2026-02-27" and "SoulCrafted" policy wording | unconfirmed: not in S18 or S19; text rewritten to what the sources say; SoulCrafted is a product name in S19, not a policy | [S18] [S19] |
| 16 | Arduino reply 2025-11-21: content stays the creator's, 24-month inactivity deactivation | confirmed; added that reverse-engineering limits apply only to cloud SaaS | [S25] Arduino Blog |
| 17 | Qualcomm announcement 2025-10-07, closing not verified | unconfirmed: FAQ says acquired but gives no date; Qualcomm release title seen, date not shown; dates now UNKNOWN | [S30] https://www.arduino.cc/qualcomm-faq/ |
| 18 | Adafruit 3,403 tutorials, 34 categories; SparkFun 956; Arduino Project Hub 6,519 over 109 pages | confirmed | [S27] [S28] [S24] |
| 19 | Fusion personal use under $1,000, three-year term, no simulation; education licence | unconfirmed: Autodesk page returned 403 and search was unavailable; marked UNKNOWN in the file | [S6] [S7] |

Counts: 19 claims checked, 4 corrected (rows 5, 11, 13, 16 partly), 3 unconfirmed (rows 15, 17, 19), the rest confirmed. Not re-checked: Instructables Pro price, Printables counts, EEVblog thread view counts, Onshape education terms, GitHub about page stats.
