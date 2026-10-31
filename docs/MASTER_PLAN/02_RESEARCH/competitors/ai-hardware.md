# AI-native hardware design and engineering-assistant competitors

Research date: 2026-10-26. Labels: TESTED (done hands-on), EXTERNAL (a cited source states it), ESTIMATED, HYPOTHESIS, UNKNOWN. I did not log in to any product, so nothing here is TESTED. Page fetches were summarised by a fetch tool; where a page rendered blanks or failed, I say so. Prices are "as of 2026-10-26".

## Summary

- The funded AI hardware tools (Flux, Quilter, JITX, Diode, Circuit Mind, Celus) all target working electrical engineers who want a real PCB. None targets learners or "accessible experimentation". [S3][S11][S14][S20][S23][S25] EXTERNAL
- Flux is the nearest AI-in-the-editor product. Its Copilot is grounded in the live design: schematic, PCB, parts, netlist, plus selection and mouse focus. [S5] EXTERNAL. That is the same idea as iynk's "AI lab partner grounded in project state", but for PCBs, with no simulation of firmware running on a board.
- Flux raised $37M announced 2026-02-27 (Series B led by 8VC; SiliconANGLE implies about $27M for the Series B and calls the earlier $10M a seed round, the Flux blog gives no split) and states 1,099,361 builders and 6,425,482 projects. [S3][S4] EXTERNAL. This is the ecosystem benchmark and the best-funded competitor for "AI plus browser plus no install".
- Flux shipped a public MCP server in summer 2026 so Claude, Cursor, Codex and ChatGPT can read live board context. [S6] EXTERNAL. iynk already has an MCP server; the difference is that iynk's state includes a running simulation (UNKNOWN whether that is a durable edge; HYPOTHESIS).
- Nothing in this category shows a reviewable diff for AI edits. Flux docs say the agent "checks in before key steps" and explains changes but describe no approve/reject or undo flow. [S7][S5] EXTERNAL. A staged, reviewable, undoable AI edit to a project is a real gap (HYPOTHESIS that users want it).
- Code-defined hardware is becoming the standard surface for AI agents: atopile (MIT, 4.0k stars), tscircuit (MIT, 2.9k stars), JITX (Python-style code) and Diode (design as code). [S18][S42][S14][S20] EXTERNAL. Text is easy for LLMs to read and diff. iynk's project format should be text-first if it wants to be agent-friendly (HYPOTHESIS).
- The education-side AI is thin. Arduino's Cloud Editor AI (Claude-based, free tier 30 interactions per month) reads board, libraries and code, not a circuit. [S35][S36] EXTERNAL. Wokwi's docs and pricing mention no built-in AI, only an experimental MCP server in its CLI. [S38][S39][S40] EXTERNAL. Cirkit Designer has AI wiring and code help plus an AI simulation-part builder. [S28][S29] EXTERNAL. Cirkit Designer is the closest direct hit for iynk's learner audience.
- Evidence that general chatbots fail on Arduino: a 2025 r/arduino thread says to check every pin assignment against the datasheet, and describes models re-introducing fixed bugs. [S41] EXTERNAL (community, one thread). This supports a grounded, simulate-then-verify partner.
- New 2026 entrants are about verification and simulation for agents (Simantic, Hilstart, both YC 2026). [S43][S44] EXTERNAL. This says the market sees "agent plus simulator" as the next step. Funding for either is UNKNOWN.
- Nobody found combines AI help with robotics or drone simulation, six UI languages, and no-account entry. Cirkit Designer has 12 UI languages. [S28] EXTERNAL.

## Products

### 1. Flux (flux.ai)
- What: browser-based electronic CAD with an AI agent ("AI hardware engineer", earlier "Copilot") that plans, drafts a schematic, places and routes, runs ERC/DRC, and exports fab files. [S7] EXTERNAL
- Owner: Defy Gravity Inc., trading as Flux. [S4] EXTERNAL
- Audience: engineers and makers building real PCBs; trials also used by students (a student bug report exists). [S8] EXTERNAL
- Pricing (as of 2026-10-26): the official pricing page loaded with prices blank ("—") in my fetch, so I could not read official dollar amounts. UNKNOWN for official prices. Plan names on the page: individual Explore, Build, Pro; organisation Teams (per editor) and Enterprise (contact us). New individual trials last 7 days; Pro trial needs a payment method; Teams has no trial. [S1] EXTERNAL
  - Included monthly AI usage in Agent Compute Units (ACUs): Explore 40, Build 120, Pro 400, Teams 600 pooled plus 60 per extra seat; paid ACUs cost $2 each on Build and Pro. [S2] EXTERNAL
  - Third-party price claims conflict. anygen.io (checked Aug 2026) says Explore $20/mo, Build $60/mo, Pro $200/mo ($142 annual), Teams $158 per editor. [S10] EXTERNAL (third party). ProtoFlow, a competitor, says entry about $20 with 10 ACUs and $2.50 per extra ACU, pro about $140 or more. [S9] EXTERNAL (competitor, conflicts with S2). Treat all as unverified.
  - Free: no permanent free AI plan; trial only. After a trial you keep a basic account to view public projects and join the community; editing private projects, exporting and using AI need a paid plan (Flux pricing page itself). [S1] EXTERNAL. Chat mode is labelled "free to use". [S6] EXTERNAL
- Licence: proprietary. UNKNOWN whether any component library is open.
- What the AI reads: active design (schematics, PCB, parts, netlist), part library with datasheets and metadata, editor context (selection, mouse focus), user "Copilot Knowledge". [S5] EXTERNAL. Via MCP, external agents read live board context. [S6] EXTERNAL
- What it can do: edit schematic, add components, change nets, flag inconsistencies, route whole boards, targeted layout edits, steering mid-build, voice input. [S5][S6] EXTERNAL
- Reviewability: it explains changes and checks in before key steps; Flux's own docs say "guide and verify every step" and that some actions only partly complete. No approve/reject or undo flow is described. [S5][S7] EXTERNAL
- Original projects / custom components: any design; imports from other EDA tools; boards up to eight layers. [S7] EXTERNAL. Custom parts UNKNOWN.
- Debugging: ERC/DRC and AI review of power ratings, missing connections, manufacturability. [S7] EXTERNAL. No firmware debugging found.
- Collaboration: Teams plan has a shared workspace. [S1] EXTERNAL. Real-time co-editing UNKNOWN from my sources.
- Education: no education plan found on the pricing page. [S1] EXTERNAL
- Export: Gerbers, drill, BoM, pick-and-place, netlists; JEP30 on Enterprise. [S7][S1] EXTERNAL
- Community size: 1,099,361 builders and 6,425,482 projects, vendor stated, Feb 2026. [S3] EXTERNAL
- Funding: $37M total, announced 2026-02-27. The Flux blog names 8VC as lead, with Bain Capital Ventures, Liquid 2 Ventures and Outsiders Fund participating, and gives no round split. [S3] EXTERNAL. SiliconANGLE says the Series B led by 8VC was about two thirds (roughly $27M, its implication) and that a $10M seed was backed by Outsiders Fund and Bain; it does not mention a Series A. [S4] EXTERNAL. The "$10M Series A" wording in the first draft is not supported; round naming is UNKNOWN. Dealroom lists $49M, which conflicts. [S4] EXTERNAL
- Complaints (links): Copilot looped for about an hour, charged credits, output no wires [S8]; another user reports work stopped after intensive use with a "please try again" error [S8b]. Flux admits plausible-sounding errors can occur if grounding data is missing or misread. [S5] EXTERNAL. I found no Reddit threads in the search, so no broader community opinion. UNKNOWN.
- iynk could learn: ACU-style metering, chat mode (cheap, no edits) versus agent mode, MCP exposure of live state, "checks in before key steps". Not reusable as code (proprietary).

### 2. JITX (jitx.com)
- What: code-based PCB design for high-frequency boards. Engineers write requirements, stackups and rules in Python; JITX generates schematic and layout, runs HFSS simulation setup and checks. An approved AI model edits the Python, the design is evaluated, results feed the next edit. [S14] EXTERNAL
- Owner/funding: JITX Inc., Berkeley. Trackers agree on a $12M Series A, Sept 2022 (Sequoia, Y Combinator, FundersClub, Liquid 2). No press release found, so aggregator-only. [S16] EXTERNAL (aggregators)
- Audience: RF and high-speed hardware teams. [S14] EXTERNAL
- Pricing: two plans. "Free and Open" is free indefinitely for open-source designs only under CERN OHL-Permissive v2, with KiCad and Altium integration. Enterprise is locally hosted with sales-only pricing. No dollar amounts shown. [S15] EXTERNAL
- Licence: the tool is proprietary; free use is bound to open hardware under CERN-OHL-P-2.0 (the designs, not the tool). Repo for docs not verified (my fetch of a guessed docs repo returned 404). UNKNOWN for tool source.
- AI reads: Python files with constraints, plus simulation or rule-check results. [S14] EXTERNAL. Edits are code, so diffable in git (ESTIMATED from the code-first design; JITX pages do not say so).
- Other: a LinkedIn post says an agentic signal-integrity optimisation would be shown at IEEE IMS 2026; no press release found. [S17] EXTERNAL
- Community: UNKNOWN. Education: none found.
- iynk could learn: code as the AI surface; a "generate, evaluate, feed back" loop with a checker in the loop.

### 3. Quilter (quilter.ai)
- What: physics-driven, reinforcement-learning placement and routing of PCBs. You upload from Cadence, Altium, KiCad, OrCAD or Siemens Xpedition; it returns candidates; you review and resubmit (2 to 5 cycles typical). [S11] EXTERNAL
- Audience: professional engineering teams (aerospace and defence, semiconductors, robotics, consumer electronics). [S11] EXTERNAL
- Pricing: pay per project, based on unrouted pins at upload; unlimited iterations if the BOM stays within 10 percent; cloud or self-hosted. No dollar amounts. A "Quilter for Free" page and "Quilter for Startups" exist; terms not shown on the pages I could read. [S12][S11] EXTERNAL
- Current limits (vendor): 100 to 1,000 components, through-hole vias only, BGA fanout beta, length matching and RF in development. [S11] EXTERNAL
- AI reads: schematic, board outline, fixed parts, stackup, circuit intent. [S11] EXTERNAL. Output is a layout candidate the engineer reviews in their own ECAD tool, which is a reviewable workflow by construction.
- Funding: $25M Series B led by Index Ventures; Pulse 2 dated 2025-10-16 and states $40M raised to date including this round. [S13] EXTERNAL. The Business Wire release date (2025-10-07/08 in the first draft) was not re-verified (403): UNKNOWN. The earlier "$35M total" aggregator figure conflicts with Pulse 2; use $40M (single secondary source).
- Security: SOC 2 Type II, no training on customer data, self-host option. [S11] EXTERNAL
- iynk could learn: very little for education; the "AI proposes, human reviews in own tool, resubmits" loop is the review pattern.

### 4. Diode Computers (diode.computer)
- What: AI-assisted custom board design plus in-house fabrication and assembly in Brooklyn. Designs are written as code that the agent and engineers check. [S20] EXTERNAL
- Pricing: self-serve with the design agent (starts from a description, block diagram or KiCad project; instant fab and assembly quotes); Enterprise from $10,000 per design plus fab. Self-serve price not shown. [S20] EXTERNAL
- Funding: $11.4M Series A led by Andreessen Horowitz with Y Combinator, Caffeinated Capital, BoxGroup; Fenwick dates it 2025-07-26. [S21] EXTERNAL. A $14.5M seed in May 2025 appears in SeedTable at 90 percent confidence; conflicts. [S22] EXTERNAL
- Audience: robotics, radio and edge-AI hardware teams. Example boards: a 70 MHz to 6 GHz SDR and a Jetson Orin NX carrier. [S20] EXTERNAL
- Reads: requirements, block diagram, KiCad project; design as code. [S20] EXTERNAL
- iynk could learn: the "describe, get a checked design, order the physical thing" path (design to BOM to purchase).

### 5. atopile (atopile.io, github.com/atopile/atopile)
- What: a language, compiler and toolchain for electronics. `.ato` files, updates a `.kicad_pcb`, outputs BOM and fabrication data. [S18] EXTERNAL
- Licence: MIT (SPDX: MIT). Repo https://github.com/atopile/atopile. [S18] EXTERNAL
- Community: 4.0k stars, 256 forks (fetched 2026-10-26). GitHub "Latest" is v0.12.5 (20 Jan; year inferred 2026), with v0.14.x pre-releases up to 12 Feb (year inferred 2026). No newer release was visible, so the project may be quiet since February 2026 (HYPOTHESIS; check commit history). [S18][S19] EXTERNAL
- AI: repo contains AGENTS.md, CLAUDE.md, `.cursor`, topics "agent" and "ai"; release notes mention no user-facing AI feature. [S18][S19] EXTERNAL. YC company page exists; funding UNKNOWN (not on pages read).
- Pricing: free and open source; commercial side UNKNOWN.
- iynk could learn/reuse: MIT licence allows reuse of ideas or code. Text-defined circuits give diffable, reviewable AI edits. It targets KiCad, not learners.

### 6. tscircuit (github.com/tscircuit/tscircuit)
- What: "Create real electronics with TypeScript and React". [S42] EXTERNAL
- Licence: MIT (SPDX: MIT). 2.9k stars, 341 forks (fetched 2026-10-26). Publishes `llms.txt` for AI tools; a separate text-to-footprint AI tool exists. [S42] EXTERNAL
- Relevance to iynk: iynk is TypeScript, so a React-style circuit DSL is directly comparable and potentially reusable for footprints or schematic rendering (HYPOTHESIS; check licence per package before use).

### 7. Cirkit Designer (cirkitdesigner.com)
- What: online circuit designer and simulator. AI can wire components on the canvas, write Arduino, ESP32 and Pico code, answer circuit questions and write simulation code for custom parts. Embedded code runs in-browser with displays, sensors, buttons, motors and LEDs responding. [S28] EXTERNAL
- Audience: makers and learners. UI in 12 languages (English, Spanish, Portuguese-BR, French, German, Hindi, Filipino, Indonesian, Japanese, Korean, Simplified and Traditional Chinese). [S28] EXTERNAL
- Custom components: AI component builder researches datasheets and GitHub, writes and validates TypeScript simulation logic, tests it in the current simulator, takes 2 to 5 minutes per request. The "30,000+ community components" claim is NOT on the cheatsheet page [S29]; source unconfirmed, UNKNOWN. [S29] EXTERNAL
- Export: wiring diagrams, project documentation, share link, upload tested firmware to a connected Arduino, ESP32 or Pico. [S28] EXTERNAL
- Pricing: homepage says "Free to start · No installation", links to a membership page; the membership URL I tried returned 404 and no plan data was found. UNKNOWN. Note cirkit.io is a different "Launching Soon" placeholder, not this product. [S28][S30] EXTERNAL
- Owner, funding, user counts: UNKNOWN.
- Review of AI edits: not described. [S29] EXTERNAL
- Closest to iynk for learners. Key iynk differences to verify hands-on later: MCU interpreters, analog solver, fault injection, rooms, robotics and drone labs.

### 8. Circuit Mind (circuitmind.io)
- What: generates schematic and BOM from a block diagram and requirements; verification checks, reports (power, FMECA, derating), export to ECAD. Product named ACE. [S25][S26] EXTERNAL
- Plans: Individual, Professional, Enterprise; prices not shown. [S25] EXTERNAL
- Customer logos on site (names inferred from image filenames by the fetch tool): National Instruments, BAE Systems, Legrand and others. Los Alamos is listed as a case study, not a customer; the 60 to 80 hours to 4 h 13 min figure was not re-verified (UNKNOWN). [S25][S26] EXTERNAL
- Funding: conflicting. The company site says $15M raised since 2018. [S26] EXTERNAL. A Dealroom item says an $18.5M Series A led by Norwest, total $33.4M; I could not load it (404) or find a dated primary source, so treat as UNKNOWN. [S27]
- Audience: professional engineers. Education: none found.

### 9. CELUS (celus.io)
- What: AI agents turn a plain-language requirement into matched components, block diagram, schematic and BOM; export to Altium, Cadence, Siemens, Fusion and KiCad; connects to live component data via MCP; also sells to component makers. [S23] EXTERNAL
- Customers named: NXP, BrainChip, AGS Devices, Variscite. [S23] EXTERNAL
- Funding: EUR 25M (USD 25.6M) Series A led by Earlybird, 2022-07-06; TechCrunch says about EUR 5.4M seed came before, so the total then was roughly EUR 30.4M (ESTIMATED from that article; the earlier "over EUR 28M" is not stated there). No later round found. [S24] EXTERNAL
- Pricing: not on the page. UNKNOWN.
- Note: parts-maker sponsorship is its revenue model (inference from "parts recommender agent works for component manufacturers"; ESTIMATED).

### 10. Zoo (zoo.dev), Text-to-CAD and Zookeeper
- What: CAD app (Zoo Design Studio) with an AI agent (Zookeeper) and API; mechanical CAD, not electronics. Modeling in the app is unlimited; Zookeeper reasoning and API use are metered from one monthly allowance. [S31][S32] EXTERNAL
- Pricing: Free, Plus and Pro plans exist, but the pricing pages rendered unfilled template variables, so allowances and dollar prices are UNKNOWN. Pay-as-you-go is off by default. [S31][S32] EXTERNAL. A third-party listing says 40 free text-to-CAD credits per month; unverified. [S34]
- Licence: Zoo Design Studio app repo is MIT (SPDX: MIT), 1.3k stars, 135 forks. https://github.com/KittyCAD/modeling-app. Point-and-click actions are stored as KCL code. [S33] EXTERNAL
- Funding: CB Insights says $10.12M over 4 rounds, latest $5M seed on 2023-10-03; a job aggregator says $5M. Conflicts. [S34] EXTERNAL
- iynk relevance: robotics and drone labs need enclosures and frames. KCL as code plus an MCP server is a possible interop path (HYPOTHESIS).

### 11. Arduino AI Assistant (Cloud Editor)
- What: Claude-based assistant in the web Cloud Editor. Generates sketches from prompts, explains functions, fixes compile errors. Reads board type, libraries and current code. Web editor only, not the desktop IDE. Announced 2025-04-28. [S35] EXTERNAL
- Edit application: unclear whether fixes auto-apply; the article only says click the fix button. [S35] EXTERNAL
- Pricing (cloud.arduino.cc/plans, fetched 2026-10-26, shown in $, currency code not named): Free $0, 30 AI interactions/month; Maker $72/year, 1,500; Team $1,000/year, unlimited; School $20 per member/year, 1,500; Enterprise custom, unlimited; a "Prototyping offer (Business)" $240 for 6 months, unlimited. Maker, Team and School show a 30-day free trial. [S36] EXTERNAL. (The 2025 article quoted Maker at $6.99/month; the page now shows $72/year. [S35][S36])
- Ownership: Qualcomm announced the Arduino acquisition on 2025-10-22, subject to regulatory approval; Arduino is to stay an independent brand. Whether the deal has closed as of 2026-10-26 is UNKNOWN (I found no completion notice; a guessed Qualcomm URL returned 404). The UNO Q launched at US$44 (2GB/16GB) and US$59 (4GB/32GB) in October 2025 per Futurum; the Arduino EU store showed EUR 59.90 incl. VAT for the 2GB on 2026-10-26, so the US$44 is a launch-time price. App Lab IDE has Edge Impulse integration. [S47][S49] EXTERNAL
- Language/curriculum: School plan exists; UI language count UNKNOWN.
- iynk comparison: Arduino reads code only, not a wired circuit or a simulated run. No simulator in the Cloud Editor.

### 12. Wokwi (wokwi.com)
- AI: neither the docs home nor the pricing page mentions AI. The CLI has an experimental MCP server, which needs a CLI token and works with agents such as Copilot. [S38][S39][S40] EXTERNAL
- Pricing (EUR, annual billing, as of 2026-10-26): Community 0; Hobby 5.6/mo; Hobby+ 8.1/mo; Wokwi Pro 20 per seat/mo; Classroom is quote-only. [S39] EXTERNAL
- Free for personal use; commercial needs paid. Supports Arduino, ESP32, STM32, Pico (MicroPython), GDB for Arduino and Pico, VS Code and CI. [S38] EXTERNAL
- Relevance: the strongest simulation incumbent; AI via third-party agents plus MCP is the pattern iynk can match or beat.

### 13. ChatGPT, Claude, GitHub Copilot used for Arduino code (usage evidence)
- r/arduino thread "ChatGPT cannot be trusted" (2025-04-24): advice to check every pin assignment against the datasheet; reports of models re-adding fixed bugs; a counterpoint that it helps if you already know hardware. One thread, anecdotal. [S41] EXTERNAL (community)
- Usage numbers (how many makers use these tools) were not found. UNKNOWN.
- Implication: chatbots do not see wiring or simulation output. A tool that feeds the real project state removes the main failure mode (HYPOTHESIS).

### 14. Other 2024-2026 startups found
| Company | What | Evidence |
|---|---|---|
| Simantic (YC Fall 2026, Waterloo) | Firmware simulation for AI agents, 4 people, founded 2025, funding not stated | [S43] EXTERNAL |
| Hilstart (YC Summer 2026, SF) | Physical agent harnesses so AI can debug, validate and ship hardware and software, 4 founders | [S44] EXTERNAL |
| Imagi | K-12 coding and AI literacy; $4.5M seed (Brighteye Ventures, Day One Capital, will.i.am; OpenAI gave $1M in credits), TechCrunch 2026-07-23; Lovable partnership. Not hardware | [S46] EXTERNAL |
| Architect Labs, VerifAIX | Chip design and verification AI (seeds $24.0M and $5.0M, per Semiconductor Engineering Q2 2026) | [S45] EXTERNAL |
I did not find an AI-plus-electronics-education startup with a funding announcement and an official product page. Searches for tutors surfaced only general K-12 tutors. [S46] EXTERNAL. Tinkercad Circuits: no AI feature found in search results (not checked on Autodesk's own site). [S48] UNKNOWN

## Comparison table

Legend: Y = yes, N = no, P = partial. Each cell has a label from the evidence behind it; "U" means UNKNOWN. Sources are in the product subsections above; the bracket here is the main one.

### A. Access and basics
| Product | Free usage | No-account entry | Browser | User-created projects | Circuit editor | Pricing (as of 2026-10-26) | Target audience |
|---|---|---|---|---|---|---|---|
| Flux | Trial only for AI; Chat mode free (EXTERNAL) [S1][S6][S9] | U | Y (EXTERNAL) [S3] | Y | Y (PCB) | Explore/Build/Pro/Teams; official prices unreadable; ACUs 40/120/400 (EXTERNAL) [S1][S2] | Engineers, makers |
| JITX | Free for open designs (EXTERNAL) [S15] | N (install) | N (local) [S14] | Y | Code | Free open; Enterprise quote [S15] | RF/high-speed teams |
| Quilter | "Quilter for Free" exists, terms U [S11] | U | Cloud service | Y (upload) | N (uses yours) | Per board by unrouted pins [S12] | Pro teams |
| Diode | Self-serve, price U [S20] | U | Y (web agent) | Y | Code/KiCad | Enterprise from $10,000 per design [S20] | Robotics, radio teams |
| atopile | Free, MIT [S18] | Y (OSS) | N | Y | Code | Free [S18] | Engineers |
| tscircuit | Free, MIT [S42] | Y | Y (web editor, U) | Y | Code | Free [S42] | Developers |
| Cirkit Designer | "Free to start" [S28] | U | Y [S28] | Y | Y | Plans U | Makers, learners |
| Circuit Mind | U | N | Y (U) | Y | Block diagram | Individual/Pro/Ent, prices U [S25] | Engineers |
| CELUS | U | U | Y | Y | Block diagram | U [S23] | Engineers, parts makers |
| Zoo | Free plan, metered AI [S32] | U | Desktop app + web (U) | Y | N (mech CAD) | Free/Plus/Pro, amounts U [S31] | Mech designers |
| Arduino Cloud AI | Free, 30 AI uses/mo [S36] | N | Y [S35] | Y | N (code) | $0 / $72 yr / $1,000 yr / $20 per member yr [S36] | Makers, schools |
| Wokwi | Free personal [S38] | U | Y | Y | Y | EUR 0 / 5.6 / 8.1 / 20 per mo [S39] | Makers, pros |
| ChatGPT/Claude/Copilot | Free tiers U | U | Y | Y | N | U | Everyone |

### B. Simulation and hardware fidelity
| Product | Custom hardware models | Firmware / real toolchain | MCU sim | Analog fidelity | Failure modeling | Debugging tools | Robotics sim | Drone sim |
|---|---|---|---|---|---|---|---|---|
| Flux | Custom parts U | Firmware headers via MCP (EXTERNAL) [S6] | N found | SPICE-style U | N found | ERC/DRC [S7] | N | N |
| JITX | Code-defined | N | N | HFSS setup [S14] | N | Rule checks | N | N |
| Quilter | N | N | N | Physics checks on layout [S11] | N | Physics checks | N | N |
| Diode | Code-defined | U | N | U | N | Fab rule checks [S20] | N | N |
| atopile | Code-defined | N | N | N | N | Build checks U | N | N |
| tscircuit | Code-defined | N | N | U | N | U | N | N |
| Cirkit Designer | Yes, AI builder [S29] | Upload to board [S28] | Y (Arduino/ESP32/Pico) [S28] | U | U | Logging [S29] | N | N |
| Circuit Mind | N | N | N | Power analysis, PSpice via Cadence [S26] | FMECA report [S25] | Verification checks | N | N |
| CELUS | N | N | N | N | N | Design checks | N | N |
| Zoo | N/A | N/A | N | N | N | N | N | N |
| Arduino Cloud AI | N | Real toolchain (cloud compile) [S35] | N | N | N | Compile-error fixes [S35] | N | N |
| Wokwi | Chips API [S38] | Real firmware binaries [S38] | Y (many) [S38] | Limited U | U | GDB, logic analyzer [S38] | N | N |
| ChatGPT etc. | N | Text only | N | N | N | Text only | N | N |

N means "not found in the sources read", not proof of absence (UNKNOWN strictly).

### C. AI, collaboration and ecosystem
| Product | What AI reads | AI edits reviewable | AI guidance | Multilingual UI | Real-time collab | Curriculum/LMS | Community | BOM | Purchasing | Export | Plugins |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Flux | Live schematic, PCB, parts, netlist (EXTERNAL) [S5] | P: explains, checks in; no diff described [S5][S7] | Y | U | Teams workspace [S1] | N found | 1.1M builders (vendor) [S3] | Y [S7] | Live prices/lead time [S7] | Gerber, BoM, PnP [S7] | MCP [S6] |
| JITX | Python constraints, check results [S14] | Code, git-diffable (ESTIMATED) | Y (agentic) | U | U | N | U | Y | U | KiCad/Altium [S15] | Python |
| Quilter | Schematic, outline, stackup [S11] | Y: candidates reviewed in own ECAD [S11] | Y | U | U | N | U | Uses yours | N | To your ECAD [S11] | N |
| Diode | Requirements, KiCad, code [S20] | Code checked by agent and engineers [S20] | Y | U | Slack for Ent [S20] | N | U | Y | Sources and assembles [S20] | Boards shipped | U |
| atopile | Code (AGENTS.md present) [S18] | Git diffs (ESTIMATED) | Agent files only | U | Via GitHub | N | 4.0k stars [S18] | Y [S18] | U | KiCad, BOM, fab [S18] | Packages U |
| tscircuit | Code, llms.txt [S42] | Git diffs (ESTIMATED) | Y | U | U | N | 2.9k stars [S42] | U | U | U | npm |
| Cirkit Designer | Canvas, code, docs [S28][S29] | U | Y | 12 languages [S28] | U | U | Component library exists; count UNKNOWN | Wiring docs [S28] | U | Firmware to board [S28] | AI part builder |
| Circuit Mind | Block diagram, requirements [S25] | U | Y | U | U | N | U | Y [S25] | Optimises cost/availability [S25] | ECAD files [S25] | U |
| CELUS | Plain-language requirements [S23] | Engineer can change any block [S23] | Y | U | U | N | U | Y, with alternates [S23] | Live data via MCP [S23] | 5 ECAD tools [S23] | MCP |
| Zoo | Prompts, CAD code (KCL) [S33] | KCL is code [S33] | Y | U | U | N | 1.3k stars app [S33] | N | N | CAD formats U | MCP, API [S31] |
| Arduino Cloud AI | Board, libraries, current code [S35] | U [S35] | Y | U | Team plan | School plan [S36] | Large forum (not measured) | N | Store separate | Arduino toolchain | Libraries |
| Wokwi | N/A built in | N/A | Via MCP agents [S40] | U | U | Classroom quote [S39] | Large (not measured) | N | N | Firmware, CI [S38] | Chips API, VS Code [S38] |
| ChatGPT etc. | Only what pasted | Chat text | Y | Yes (models) | N | N | Reddit threads [S41] | N | N | Copy-paste | N |

Moat and performance: Flux moat is user base plus funding (EXTERNAL [S3]); Quilter moat is trained layout models (vendor claim [S13]); atopile and tscircuit moat is open-source mindshare (EXTERNAL [S18][S42]); Arduino moat is the board brand and installed base (EXTERNAL [S47]); Wokwi moat is simulator depth and CI (EXTERNAL [S38]). Performance numbers: Quilter 100 to 1,000 components [S11]; Cirkit AI part builds take 2 to 5 min [S29]; no benchmarks for others (UNKNOWN).

## Where iynk could be genuinely different here

All HYPOTHESIS unless noted.
1. AI grounded in a running simulation, not only in files. Flux reads the design; Arduino reads code; neither reads a live simulated board with injected faults. Evidence for the gap: [S5][S35]. Evidence of user need: the r/arduino thread on wrong pins [S41].
2. Reviewable AI edits for learners: propose a change as a visible diff on the circuit or code, accept or reject, undo. No product in this set documents this. [S5][S7][S35]
3. Teach first, not ship first. Every funded tool here is professional. A learner-safe default (explain why, ask before changing, no credits anxiety) is open ground. [S3][S11][S25]
4. Free no-account AI entry. Flux trials need an account and paid plans for AI; Arduino caps the free tier at 30 interactions per month. [S1][S36] Whether iynk can afford free AI at scale depends on model cost (UNKNOWN; iynk's Muse Spark and Gemini costs are internal).
5. Robotics and drone labs plus board labs in one tool. No product found covers all three. [S28][S38]
6. Six UI languages versus Cirkit Designer's 12. Do not claim a language edge; Cirkit leads on count. [S28]
7. Interoperate rather than compete on PCB. Export to atopile or tscircuit style text, KiCad, or call Flux's MCP server from iynk's partner. Licences: MIT for atopile and tscircuit [S18][S42]; Flux is proprietary. Legal review needed before copying code.
8. Original projects are the table stakes iynk lacks. Cirkit Designer, Wokwi and Flux all let users create their own projects. [S28][S38][S7] Without that, the AI partner has little to ground in beyond catalogue items.
9. Risk: Flux's MCP server plus Claude or ChatGPT can already act as a grounded partner for PCBs; Wokwi's MCP server can do so for simulations. [S6][S40] iynk's edge must come from learning design, safety and robotics, not from "AI plus hardware" alone.

## Sources

All accessed 2026-10-26 unless noted. "Search" means I only saw the page through a web search result summary and could not fetch it, so treat as secondary.

- S1 https://www.flux.ai/pricing - Flux pricing page - Flux (Defy Gravity Inc.) - describes 2026 (footer). Prices blank in fetch.
- S2 https://docs.flux.ai/reference/copilot-credits - Copilot credits - Flux docs - current.
- S3 https://www.flux.ai/blog/we-raised-37m-to-take-the-hard-out-of-hardware - We raised $37M - Flux blog - Feb 2026.
- S4 https://siliconangle.com/2026/02/27/flux-nabs-37m-automate-printed-circuit-board-development-ai/ - Flux nabs $37M - SiliconANGLE - 2026-02-27 (Search; also Pulse 2 and AI Magazine results, and Dealroom $49M claim).
- S5 https://www.flux.ai/p/blog/flux-copilot-under-the-hood - Flux Copilot under the hood - Flux blog - Jun 2025.
- S6 https://email.flux.ai/p/blog/summer-2026-updates-flux-mcp-server-and-chat-mode - Summer 2026 updates: Flux MCP server and chat mode - Flux blog - Aug 2026.
- S7 https://www.flux.ai/docs/copilot/overview - Flux AI overview - Flux docs - current.
- S8 https://feedback.flux.ai/bugreports/p/copilot-looped-for-an-hour-and-charged-me-credits-but-didnt-output-any-of-the-co - bug report - Flux feedback board (Search). S8b https://feedback.flux.ai/bugreports/p/flux-ai-after-intensive-work-stopped-due-to-a-problem-please-try-again (Search).
- S9 https://www.protoflow.ai/blog/flux-ai-pricing - Flux.ai Pricing in 2026 - ProtoFlow (a competitor) - dated 2026-08-08.
- S10 https://www.anygen.io/showcase/fluxai-review/index.html - Flux.ai Review 2026 - anygen.io (third party, checked Aug 2026 per snippet; Search).
- S11 https://www.quilter.ai - Quilter home - Quilter - current.
- S12 https://www.quilter.ai/pricing - Quilter pricing - Quilter - current.
- S13 https://pulse2.com/quilter-25-million-series-b-raised-for-automating-pcb-design-with-physics-driven-ai - Quilter $25M Series B - Pulse 2 - 2025-10-16; Business Wire release 2025-10-07 (Search; Business Wire returned 403).
- S14 https://www.jitx.com - JITX home - JITX - current.
- S15 https://www.jitx.com/plans - JITX plans - JITX - current.
- S16 https://www.caplight.com/company/jitx and https://www.vcbacked.co/company/jitx - JITX funding trackers (Search; aggregators).
- S17 https://spectrum.ieee.org/startup-jitx-uses-ai-to-automate-complex-circuit-board-design and JITX LinkedIn post about IMS 2026 (Search).
- S18 https://github.com/atopile/atopile - atopile repo - atopile - MIT, 4.0k stars.
- S19 https://github.com/atopile/atopile/releases - atopile releases - GitHub.
- S20 https://www.diode.computer - Diode Computers - Diode.
- S21 https://www.fenwick.com/insights/experience/fenwick-represents-diode-in-11-4m-series-a-funding - Fenwick represents Diode - Fenwick - 2025-07-26.
- S22 https://seedtable.com/companies/diode-computers/funding-rounds/seed-2025-05 - Diode seed - SeedTable (Search; 90 percent confidence per its changelog).
- S23 https://www.celus.io - CELUS - CELUS - current.
- S24 https://techcrunch.com/2022/07/06/celus-which-uses-ai-to-automate-circuit-board-design-raises-25-6m/ - Celus raises - TechCrunch - 2022-07-06 (Search).
- S25 https://www.circuitmind.io - Circuit Mind - Circuit Mind - current.
- S26 https://www.circuitmind.io/mission and /product and Los Alamos case study at https://www.circuitmind.io/resource-center/ai-assisted-pcb-design-los-alamos-national-laboratory (Search; site says $15M raised since 2018).
- S27 https://dealroom.co/news/164658-circuit-mind-raises-18-5m-series-a-to-automate-circuit-board-design/ - Dealroom item (Search; fetch returned 404; undated; unverified).
- S28 https://www.cirkitdesigner.com - Cirkit Designer - current.
- S29 https://www.cirkitdesigner.com/docs/custom-simulation-parts/guides/ai-component-builder-cheatsheet - AI component builder cheatsheet - Cirkit docs.
- S30 https://www.cirkit.io - placeholder "Launching Soon" - not the same product.
- S31 https://zoo.dev/pricing - Zoo pricing - Zoo (table showed "Loading...").
- S32 https://zoo.dev/docs/faq - Zoo FAQ - Zoo (template variables unfilled).
- S33 https://github.com/KittyCAD/modeling-app - Zoo Design Studio - MIT, 1.3k stars.
- S34 https://www.cbinsights.com/company/kittycad/financials and https://simplify.jobs/c/Zoo - Zoo funding aggregators (Search; conflicting).
- S35 https://www.cnx-software.com/2025/04/28/arduino-cloud-editor-gets-claude-powered-ai-assistant-trained-on-arduino-docs-and-libraries/ - CNX Software - 2025-04-28.
- S36 https://cloud.arduino.cc/plans - Arduino Cloud plans - Arduino - current. Support article https://support.arduino.cc/hc/en-us/articles/19958917855132 returned 403; limits seen in search snippet.
- S37 reserved (unused).
- S38 https://docs.wokwi.com - Wokwi docs - Wokwi - current.
- S39 https://wokwi.com/pricing - Wokwi pricing - Wokwi - current (EUR).
- S40 https://docs.wokwi.com/wokwi-ci/mcp-support - Wokwi MCP support - Wokwi docs (Search; experimental).
- S41 https://redlib.hackliberty.org/r/arduino/comments/1k6tln6/chatgpt_cannot_be_trusted/ - r/arduino "ChatGPT cannot be trusted" - Reddit mirror - 2025-04-24 (Search; community). DEAD LINK on 2026-10-26 (host does not resolve); www.reddit.com is blocked for the fetch tool. Original thread URL https://www.reddit.com/r/arduino/comments/1k6tln6/chatgpt_cannot_be_trusted/ not re-read; content UNCONFIRMED.
- S42 https://github.com/tscircuit/tscircuit - tscircuit - MIT, 2.9k stars.
- S43 https://www.ycombinator.com/companies/simantic - Simantic - Y Combinator - Fall 2026.
- S44 https://www.ycombinator.com/companies/hilstart - Hilstart - Y Combinator - Summer 2026.
- S45 https://semiengineering.com/startup-funding-q2-2026/ - Startup Funding Q2 2026 - Semiconductor Engineering (Search).
- S46 https://techcrunch.com/2026/07/23/edtech-platform-raises-4-5m-to-help-teach-students-how-to-vibe-code/ - Imagi seed - TechCrunch - 2026-07-23 (Search).
- S47 https://futurumgroup.com/insights/qualcomms-arduino-acquisition-expands-edge-ai-access-for-developers - Qualcomm and Arduino - Futurum (Search; also App Lab 0.6 April 2026 item).
- S48 Tinkercad Circuits search (parse.gl, thejournal.com 2022) - no AI feature found; Autodesk site not checked.
- S49 https://store.arduino.cc/products/uno-q - Arduino UNO Q 2GB - Arduino store - EUR 59.90 incl. VAT, fetched 2026-10-26.

## Fact-check log (2026-10-26)

Checker re-opened sources with WebFetch on 2026-10-26. The WebSearch budget ran out partway, so some items could not be searched for better sources. Fetch summaries come from a small model, so a "confirmed" means the summary matched the claim.

| # | Claim | Verdict | Source |
|---|---|---|---|
| 1 | Flux ACUs 40/120/400/600+60, $2 per extra ACU on Build and Pro | confirmed | [S2] |
| 2 | Flux plan names, 7-day trials, Pro trial needs payment method, no Teams trial, no education plan, dollar prices blank | confirmed | [S1] |
| 3 | Flux has no permanent free AI plan (basic account only) | corrected: attributed to Flux's own pricing page instead of a competitor | [S1] |
| 4 | Flux $37M, Feb 2026, 8VC lead, 1,099,361 builders, 6,425,482 projects | confirmed | [S3] |
| 5 | Flux "$27M Series B plus $10M Series A led by Outsiders with Bain" | corrected: blog gives no split; SiliconANGLE calls the $10M a seed; round naming UNKNOWN | [S3][S4] |
| 6 | Flux MCP server, summer 2026, Claude/Cursor/Codex/ChatGPT, Chat mode "free to use" | confirmed (blog also names Devin and Notion AI) | [S6] |
| 7 | Flux Copilot reads schematic, PCB, parts, netlist, editor context; no approve/reject/undo described; checks in before key steps; up to eight layers | confirmed | [S5][S7] |
| 8 | Arduino Cloud plan prices and AI limits | confirmed, plus a missed "Prototyping offer (Business)" $240 per 6 months and 30-day trials added | [S36] |
| 9 | Arduino AI assistant is Claude-based, Cloud Editor only, Maker was $6.99/mo in Apr 2025 | confirmed | [S35] |
| 10 | Arduino/Qualcomm "is being acquired"; UNO Q US$44 | corrected: closing status UNKNOWN; US$44 was launch price, EU store shows EUR 59.90 incl. VAT on 2026-10-26 | [S47][S49] |
| 11 | Wokwi pricing EUR 0 / 5.6 / 8.1 / 20 per mo, annual billing, no AI on pricing page | confirmed | [S39] |
| 12 | Wokwi docs: no AI, GDB, free personal use; CLI MCP server experimental, needs token | confirmed | [S38][S40] |
| 13 | atopile MIT, 4.0k stars, 256 forks; release info | corrected: release years are inferred, v0.12.5 is still GitHub "Latest", possible quiet since Feb 2026 (HYPOTHESIS) | [S18][S19] |
| 14 | tscircuit MIT, 2.9k stars, 341 forks | confirmed (llms.txt claim not re-checked: unconfirmed) | [S42] |
| 15 | Zoo modeling-app MIT, 1.3k stars, 135 forks; pricing page unfilled | confirmed | [S33][S31] |
| 16 | Cirkit Designer 12 UI languages, AI features, "Free to start" | confirmed; account requirement not stated on page (stays UNKNOWN) | [S28] |
| 17 | Cirkit "30,000+ community components", 2 to 5 min per AI build | corrected: 2 to 5 min confirmed; 30,000 not on the cited page, now UNKNOWN | [S29] |
| 18 | Diode Enterprise from $10,000 per design; $11.4M Series A, a16z, 2025-07-26 | confirmed | [S20][S21] |
| 19 | Quilter $25M Series B, Index Ventures | confirmed; total raised $40M per Pulse 2 (replaces UNKNOWN); Business Wire date unconfirmed | [S13] |
| 20 | CELUS EUR 25M Series A, Earlybird, 2022-07-06 | confirmed; "total over EUR 28M" corrected to about EUR 30.4M (ESTIMATED from seed in article) | [S24] |
| 21 | Circuit Mind $15M since 2018; customers named; Los Alamos | corrected: Los Alamos is a case study not a customer; 4 h 13 min figure unconfirmed; Dealroom $18.5M stays UNKNOWN | [S25][S26] |
| 22 | JITX free plan under CERN OHL-Permissive v2, designs only; Enterprise sales-only | confirmed | [S15] |
| 23 | Simantic (YC Fall 2026, Waterloo, 4 people, founded 2025); Hilstart (YC Summer 2026, SF, 4 founders) | confirmed | [S43][S44] |
| 24 | Imagi $4.5M seed, 2026-07-23, Lovable | confirmed; investors added | [S46] |
| 25 | r/arduino "ChatGPT cannot be trusted" thread content | unconfirmed: mirror host is dead, reddit blocked to the fetch tool | [S41] |

Not re-checked (left as first drafted): JITX funding aggregators [S16], JITX IMS post [S17], Diode seed in SeedTable [S22], Zoo funding [S34], Architect Labs and VerifAIX funding [S45], Tinkercad [S48], Quilter limits [S11], Cirkit membership 404.
Counts: 25 claims checked, 9 corrected, 3 unconfirmed or now UNKNOWN (S41, Quilter Business Wire date, Circuit Mind Los Alamos figure), 13 confirmed.
