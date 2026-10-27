# Hardware and STEM education products: competitors

Researcher: education category. Accessed 2026-10-26 (all sources). Prices are "as of 2026-10-26" unless a source date is given.

Method note. Pages were read with a fetch tool that returns a model-written digest, not raw HTML, and web search returns digests too. Where a page returned 403, 404, a certificate error or only a title, that is stated. The web-search budget ran out before a few follow-ups (Brilliant for Educators, Sphero Edu tiers, Arduino compile-limit article), so those are marked UNKNOWN or EXTERNAL-via-search. Labels: TESTED (hands-on), EXTERNAL (a cited source states it), ESTIMATED, HYPOTHESIS, UNKNOWN. Nothing here is TESTED: I did not run any of these products hands-on, only read their public pages.

## Summary

- The category sells to schools and teachers, not to the learner. The buyer is a teacher, a department, a district or a national programme. Prices are per educator (VEXcode VR), per school licence (CoderZ), per member (Arduino Cloud School plan, USD 20/yr), per student per semester (LabsLand, from EUR 7.99), or bundled with robot hardware (LEGO, Edison, Sphero). Free tools (MakeCode, micro:bit Python Editor, Raspberry Pi Code Editor, Tinkercad Circuits) are funded by a corporation, a non-profit or hardware sales. [S8][S15][S29][S30][S41][S21]
- The strongest free tools need no account for the learner: micro:bit classroom needs "no registration or accounts" for teacher or student, VEXcode VR Free needs no sign-in, LEGO Coding Canvas has no student login. A no-account entry is already the norm in K-12 and iynk's no-login entry is table stakes there, not a differentiator. [S6][S29][S33]
- Almost none of these tools let a learner design an original circuit or board. They let learners write code for a fixed device or fixed virtual robot. Tinkercad Circuits is the one mainstream exception with a free-form circuit editor, and it is limited to a small set of boards (Uno, ATtiny, micro:bit per a 2021 forum post) and, per secondary sources, has no ESP32. [S45][S46]
- Simulators in this space are mostly high-level stand-ins, not instruction-level emulators. MakeCode's micro:bit simulator runs a JavaScript stand-in for the C++ runtime, which is why code that works on the board can error in the simulator. This gives iynk a fidelity argument only where iynk really interprets the real language subset and models the circuit. [S13]
- Assessment and LMS are where the paid tiers live: Arduino Cloud School plan (Google Classroom integration, course library, teacher view), LabsLand (6 LMS integrations: Moodle, Sakai, Canvas, ILIAS, Blackboard, Google Classroom), VEXcode VR paid tiers (class organisation, Virtual Skills). Free tools mostly offer session reports and shared links. [S15][S40][S29][S6]
- The vendor risk is real. LEGO retired SPIKE Prime and Essential (sales end 2026-06-30, app supported to 2031-06-30) and launched Computer Science & AI from USD 339.95 per kit. Robot Virtual Worlds lost its CS2N connection in 2021 and shows no current vendor page. Closed hardware-tied curricula can disappear; a free, open, hardware-agnostic lab is a hedge schools may value. [S32][S33][S31]
- AI literacy is the active growth theme: micro:bit CreateAI (Google.org-backed US pilot, announced 2026-02-19), Raspberry Pi Experience AI (reported 1,000,000 young people reached in 2025), LEGO CS&AI, mBlock AI blocks. None of them is an AI lab partner that guides hardware debugging; they teach AI concepts. This is an open slot for iynk's lab partner. [S9][S21][S33][S35]
- Reach benchmarks for a startup: micro:bit says 73.5 million children have learnt with it in 85+ countries; Raspberry Pi Code Clubs ran in 111 countries (9,117 clubs in 2025). Distribution through teacher networks, not search, is what scales. [S8][S21]
- The Raspberry Pi Code Editor is small in absolute terms: 36,477 users saved 163,993 projects in 2025, and 1,996 schools joined Code Editor for Education. A free browser lab can credibly reach that scale with modest marketing. [S21]
- Gaps iynk can claim (HYPOTHESIS): user-created circuits and boards with a real solver; fault injection (no education product found models failures); multi-board coverage (ESP32, STM32, FPGA) in one place; real-time rooms; six UI languages; parts prices and BOM. Whether schools value these over curriculum depth is UNKNOWN and needs teacher interviews.

## Products

### 1. Microsoft MakeCode (micro:bit editor, Arcade, extension model)

- What it is. A framework (PXT) plus per-device editors with a blocks editor, a text editor (Static TypeScript, a TypeScript subset), a simulator and a code generator that emits a HEX file. [S3] makecode.microbit.org is the micro:bit editor, arcade.makecode.com is the Arcade game editor. [S2] Fetching the two editor home pages returned only their titles, so I could not read Arcade's own feature list: UNKNOWN.
- Owner. Microsoft. Audience: ages roughly 8 to 16, classrooms. [S3]
- Pricing as of 2026-10-26. Free to use is UNKNOWN from the cited page: S6 does not state a price for MakeCode or the Python Editor (fact-check 2026-10-26); no price page found, and no charge is known to me. Projects attached to Microsoft Teams assignments need Teams accounts. [S6] EXTERNAL.
- Licence and repos. microsoft/pxt is MIT, 2.3k stars, 639 forks, 14,640 commits on master (page read 2026-10-26) [S2]. microsoft/pxt-microbit has 809 stars; its licence file was not shown, so the SPDX id is UNKNOWN [S14].
- What a user can do. Write blocks or text, run in a simulator, download a HEX and flash a micro:bit; share a project by public link; MakeCode mobile apps send code over Bluetooth. [S6][S7] The simulator "can test and run most BBC micro:bit programs" and emulates button, touch pin, temperature, compass and light inputs. [S12]
- Original projects. Yes, any program for the target device, but the device is fixed. Custom components: via extensions. Extensions add blocks and can be loaded dynamically from GitHub; targets may limit this to an approved list in pxtarget.json; editor extensions are HTML pages loaded in an iframe. [S4][S5] Whether extensions can add simulator behaviour is not covered on the pages I read: UNKNOWN.
- Debugging. Simulator plus on-device serial output (editor extensions can read serial data) [S4]. A step debugger is UNKNOWN from these sources.
- Collaboration. Public share links; micro:bit classroom lets a teacher view and edit students' code live, with no accounts. [S6]
- Education. Official micro:bit courses; Teams assignments. LMS beyond Teams: UNKNOWN.
- Export. HEX file for the device; JavaScript/Python view of blocks. No path to a vendor toolchain such as Arduino IDE is documented on pages read: UNKNOWN. [S3]
- Community signals. micro:bit foundation reports 73.5 million children have learnt with micro:bit (vendor-stated, page read 2026-10-26). [S8] A forum exists at forum.makecode.com. [S13]
- Limitations users report (forum threads found by search). Simulator shows stale program; simulator disabled on small devices in "light mode"; code that works on the board errors in the simulator when the stand-in has no definition for an API; unresolved questions about custom blocks toggling pins. [S13] Teachers also note some schools block the site. [S13]
- Learn or reuse. The extension model (GitHub-hosted packages, approved list for safety) is a proven way to grow a component library without owning every part. PXT is MIT, so it could be studied or embedded; iynk's device models are different in kind (real MCU interpreters), so reuse would be limited to UI patterns, HEX/flashing and the extension mechanism. HYPOTHESIS.

### 2. micro:bit Educational Foundation tools (Python Editor, classroom, CreateAI)

- What it is. A non-profit that runs the micro:bit tools: MakeCode, the Python Editor, micro:bit classroom, and CreateAI. [S6][S8]
- Owner and audience. Micro:bit Educational Foundation (non-profit); ages 8 and up. [S8][S9]
- Pricing. Software price not stated on S6 (fact-check 2026-10-26): UNKNOWN, though no charge was found. Hardware sold via resellers (price not checked).
- Python Editor. MicroPython editor with Pyright-based diagnostics and autocomplete, a simulator, reference docs, WebUSB-style connection to a real board, translations. MIT, 84 stars, 47 forks (read 2026-10-26). Repo: https://github.com/microbit-foundation/python-editor-v3 [S10]. Projects live in local browser storage unless downloaded. [S6]
- micro:bit classroom. Live coding session in MakeCode or the Python Editor; no registration for teacher or student; students join by link or class name and password; teacher can send code (overwrites), view and edit students' code, download a session report; sessions are saved as files. [S6]
- CreateAI. Free web ML tool: collect accelerometer movement data, train, test, then use the model in a MakeCode program. Runs in Chrome or Edge, or as iPad/Android apps. [S6][S7] Built on research from Aarhus University (ML-Machine). [S48] A pilot to take CreateAI to every US state is supported by Google.org (announced 2026-02-19); the page gives no user counts or language list. [S9] Repo https://github.com/microbit-foundation/ml-trainer is MIT, 16 stars, TypeScript, React, Vite, Capacitor (read 2026-10-26). [S11]
- Original projects, custom components. Original code and original ML models for a fixed device; no custom hardware. Export: HEX and .py files. [S6]
- Community. Foundation says 85+ countries. [S8] The community lists unofficial editors (EduBlocks, Mu, MicroBlocks, Arduino IDE C++, GNAT Ada and others) which the Foundation does not support. [S7]
- Limitations. Local-only project storage means cleared site data deletes work. [S6]
- Learn or reuse. Session-based classroom with no accounts (join by name and password, teacher sees all code, report download) is a model for iynk rooms in schools. CreateAI's "train on your own sensor data, then use it on device" is a strong creative loop; iynk's simulated sensors could generate data for the same loop. MIT licences allow reuse of the classroom and ML-trainer patterns. HYPOTHESIS.

### 3. Arduino Education (kits, curricula, Science Journal, Arduino Cloud for Schools)

- What it is. Kits plus open curricula plus a cloud IDE with a school plan. Kits listed: Alvik robot (Arduino Nano ESP32, blocks to MicroPython), PLC Starter Kit, Science Kit R3 (with Science Journal), Smart greenhouse. Tracks: K-12, Higher Education, Industry Ready. [S17]
- Owner. Arduino (company). Audience: schools, universities, industry training. [S17]
- Pricing (as of 2026-10-26). Arduino Cloud plans page: Free (2 Things, 1 day data retention; the page lists no price figure for Free, so USD 0 is implied, not stated); Maker $72/yr (25 Things); Team $1,000/yr (100 Things, 50 users); Enterprise custom; School $20 per member per year (seat tiers 5-50, 51-100, 101+, one $20 price shown), with 5 Things per member, 6 months data retention, shared space with roles, Advanced Editor, AI Assistant (1,500 interactions per month), course library, Google Classroom integration, 30-day free trial. A "Prototyping offer" of $240 per 6 months on the Team plan is also listed. The page shows "$" without naming a currency, so USD is assumed. Fact-check 2026-10-26: confirmed. [S15] Kit prices (store search, US store, USD): Plug and Make Kit 87.36 (a holiday listing shows 69.92 from 87.40), Alvik 220.00 on sale from 275.00; EU store Alvik EUR 156.00. These are snapshot listings and conflict, so treat as EXTERNAL and approximate. [S18]
- Who buys. Schools and districts buy kits, then register kits on the Cloud to unlock learning content before inviting students. [S16] The School plan is per member, so the school or teacher pays.
- Licence. Education content described as open source. [S17] Arduino IDE and core software are open source; SPDX ids not verified here: UNKNOWN. The Cloud service is proprietary.
- What a user can do. Write sketches in the Cloud Editor, compile, upload via the Cloud Agent, build IoT dashboards, share sketches/reports, use an AI Assistant. [S15][S16]
- Original projects and hardware. Yes: any sketch for real Arduino boards, with real toolchain and real hardware. This is the real-toolchain end of the market; there is no simulator in the pages I read: UNKNOWN. Collaboration: shared spaces with role permissions on the School plan. [S15] Assessment: progress monitoring, feedback, custom assignments. [S16]
- Limitations (complaints). Free tier compile limit of 25 per day: UNKNOWN (fact-check could not confirm; the support article returns 403 to fetch and the search budget was exhausted; the original figure came from a search digest only) and "disk limit reached" errors on free accounts in forum threads. [S20]
- Science Journal. Google stopped supporting its app on 2020-12-11 and Arduino took ownership and said it would stay free and open source. I could not confirm its 2026 status. [S19]
- Learn or reuse. Per-member annual pricing and a teacher dashboard are the template for a paid school tier. A Google Classroom integration is the one LMS feature that appears on the plan page itself. iynk can offer export to Arduino IDE/Cloud projects so a simulated project can move to real boards. HYPOTHESIS.

### 4. Raspberry Pi Foundation (Code Club, Code Editor, Experience AI, curricula)

- Owner and audience. Raspberry Pi Foundation (non-profit); ages 9 to 19 depending on the programme. [S21][S24]
- Pricing. Free. The teaching resources page says "All for free". [S24]
- Reach (Annual Review 2025, vendor-stated). 9,117 Code Clubs ran sessions in 111 countries (about 322,700 young people a month); 3,980 new clubs verified in 2025; Code Club says it has inspired over 2.3 million young people in 11 years. Experience AI: 1,000,000 young people reached in 2025 ("through Experience AI", headline figure), "an estimated 2.7m" in total (the review calls it an estimate), 27 partners in 30 countries, 28,328 educators trained, 706,024 lesson downloads. Code Editor: 36,477 users saved 163,993 projects; 96,376 projects by students in Code Editor for Education; 1,996 schools joined and educators created 4,431 classes. Ada Computer Science: 1,966,934 questions answered by students. Astro Pi Challenge: 27,247 young people from 27 countries ran code in space. [S21]
- Code Editor. Online editor for young people aged 9 and over to learn text-based programming; works on constrained devices and low connectivity; classroom management with real-time view of student work; safeguarding features. [S21] Component repo (editor-ui, web component `editor-wc`): 39 stars, 14 forks; licence file not read, so SPDX id UNKNOWN. Supports Python, HTML and Scratch; run/stop; text and visual output; step-by-step instructions; Astro Pi Sense HAT emulator; optional AI help with errors; login, save and remix when the host enables it; locale attribute. [S23]
- Curricula. The Computing Curriculum (ages 5 to 16, England, India, Kenya) and Ada Computer Science (ages 11 to 19, with University of Cambridge); licences not stated on the page. [S24] The learning-projects org on GitHub has 1,515 repositories; licence per repo not checked. [S25]
- Original projects. Learners create their own Python/HTML/Scratch projects in the Code Editor; Code Club Projects are guided. Hardware: Sense HAT emulator only; no circuit editor. [S21][S23] Pico/MicroPython in the Code Editor: UNKNOWN (search did not confirm).
- Learn or reuse. Embeddable web component with host-controlled panels is a good distribution pattern (partners can drop the editor into their own lessons). Their lesson content is a large guided-project catalogue; if licences are permissive (check per repo) iynk could write companion simulated-hardware versions of those projects. HYPOTHESIS.

### 5. Brilliant

- What it is. Subscription learning app: "Your Personal Tutor for Math & Coding" (home page tagline). [S28] Owner: Brilliant.org. Audience: adults and teens, self-paced.
- Pricing as of 2026-10-26. Subscribe page: Individual "$30/month", Family "$40/month" with 6 seats; "annual billing saves 33%". The page does not say whether $30 and $40 are the monthly-billing or the annualised monthly price, and does not name the currency; the real price is only on the checkout page. Treat the figures as UNKNOWN in basis. [S26] The help page names plans Annual, Monthly and Family, and says K-12 teachers and their students may qualify for free classroom access through Brilliant for Educators. [S27] Free trial: not stated on either page.
- Electronics content. I could not find any Brilliant electronics, circuits or hardware course through the pages fetched; the courses page returned only the tagline. UNKNOWN. Do not assume it has any.
- Original projects, custom hardware, export, community: UNKNOWN or not applicable. It is a guided-lesson product, not a lab.
- Learn or reuse. Short interactive problems with instant feedback are a format iynk's lessons could match. Low threat as a lab. HYPOTHESIS.

### 6. VEXcode VR (VEX Robotics)

- What it is. Browser virtual robot coding in "playgrounds." Owner: VEX Robotics (Innovation First). Audience: classrooms and VEX competition teams. The vexrobotics.com page returned 403 to my fetch; details below come from search digests of that page and VEX's knowledge base. [S29]
- Pricing as of 2026-10-26 (EXTERNAL via search digest). Free: USD 0, Blocks only, 15 playgrounds, basic graphics. Enhanced: USD 199 per educator per year. Premium: USD 499 per educator per year. Licences cover all of the educator's students at school and at home; the year starts when the licence is activated. [S29]
- Features by tier (same sources). Python in the browser in Enhanced and Premium; Premium adds Switch (blocks to text bridge), competition-simulating playgrounds, VEX PD+ certifications, and Virtual Skills access for VEX IQ and V5 (only Premium class codes unlock it). Enhanced adds Google Drive and Dropbox sharing and class organisation (not re-confirmed in the fact-check). A Google Classroom integration was not found. Fact-check additions from a 2026-10-26 search digest of VEX pages and a UK sales sheet [S49]: Enhanced also adds offline use and 18+ playgrounds; Premium adds 20+ playgrounds including AI and data science content. UK prices differ: GBP 149.99 and GBP 369.99 per year for the paid tiers (2025 sales sheet), so USD 199/499 is the US price. [S29][S49]
- Access. Claimed: no student accounts, no installation, no sign-in. The vexrobotics.com page returned 403 in the fact-check, so this "no account" claim is unconfirmed from the primary page: UNKNOWN beyond the search digest. [S29]
- 2026-27 season. Virtual Skills playgrounds for VEX V5 Override and VEX IQ Level Up are live. [S29]
- Original projects. Code your own program in a fixed set of virtual worlds; no custom robot or world editor on the pages read: UNKNOWN. Robotics simulation: yes (this is its job). Debugging: UNKNOWN.
- Learn or reuse. Per-educator pricing where one licence covers all that teacher's students is a simple unit to sell and budget. Competition-linked virtual playgrounds tie a free tool to a live community. HYPOTHESIS.

### 7. CoderZ (Intelitek)

- What it is. Cloud cyber-robotics learning platform with gamified missions, curricula (Cyber Robotics 101 and 102, Adventure, Python GYM), teacher resources and reporting consoles. Owner: Intelitek. The CoderZ home page failed with an expired TLS certificate when I fetched it, so all facts here are from search digests of reseller and procurement documents. [S30]
- Pricing (EXTERNAL, conflicting). A state procurement document lists unlimited-student school licences at USD 2,000 (Adventures) and USD 2,400 (Cyber Robotics 101, 102, Python GYM), one-year term; a reseller lists USD 2,400 and says outside the US the cap is 240 students; per-user USD 6.25 for the CoderZ League; remote PD USD 75 per educator. An older review lists a classroom subscription at USD 840 and home use at USD 6.25 per month billed annually. Current price sheet not found. [S30]
- Who buys. Schools and districts via licence or state contract. LMS/Google Classroom: UNKNOWN. Original projects: UNKNOWN beyond missions.
- Learn or reuse. Per-school unlimited-student licences are a sales model that avoids per-seat friction. Mission/league gamification is a retention device. HYPOTHESIS.

### 8. Robot Virtual Worlds (Robomatter / CMU)

- Status. Alive in a limited sense. Carnegie Mellon's Robotics Academy stated that support for RVW's connection to its CS2N platform ended in August 2021 because Amazon AWS and Heroku dropped TLS v1; the notice (dated 2021-08-24, re-read in the fact-check) is about CS2N connectivity, not a product shutdown; students can still use the virtual worlds and save progress through a "Local Account" on the local computer, and three ROBOTC/EV3/VEX courses stopped awarding badges for RVW work. [S31] I found only old product listings (ROBOTC-based, supports LEGO NXT/EV3, VEX, TETRIX) and no current vendor page, so treat as effectively legacy. [S31] Webots (Cyberbotics) is a separate project, Apache-2.0, https://github.com/cyberbotics/webots; search digest only, latest release unverified. [S31]
- Learn. Tying a simulator to a hardware-specific proprietary IDE and a vendor server is how these products aged out. Keep iynk's core self-contained. HYPOTHESIS.

### 9. LEGO Education SPIKE and Computer Science & AI

- SPIKE. LEGO announced it is retiring SPIKE Prime and SPIKE Essential: end of sales 2026-06-30, no new features after that, SPIKE App bug fixes and OS compatibility to 2031-06-30, lessons available to 2031-06-30, spares for 2 years after last sale. FIRST LEGO League teams can use SPIKE through the 2027-2028 season. App projects are stored on the local device. [S32]
- Computer Science & AI (also the FIRST LEGO League option from the 2026-2027 season [S32]). Announced January 2026, shipping from April 2026: kits start at USD 339.95 each (about USD 84.98 per student), for K-2, 3-5, 6-8. Coding Canvas is a block-based app with word and icon blocks, runs in a browser or on iOS, no student login, data saved locally. AI activities are described but specific tools are not listed. [S33]
- Owner and audience. LEGO Group, LEGO Education; primary and middle school. Buyers: schools via resellers. Licence: proprietary. LMS: UNKNOWN. Languages in the app: UNKNOWN.
- Original projects. Building with bricks plus coding; creative but within LEGO hardware. Simulator: UNKNOWN.
- Learn or reuse. A product line with a published sunset date shows schools carry hardware platform risk. Free, hardware-agnostic simulation lets a school keep teaching when kits age out. HYPOTHESIS.

### 10. Edison (Edison Robotics)

- What it is. Programmable robot for ages 4 to 16 with barcode programming, EdBlocks, EdScratch and EdPy (Python); all three languages free for unlimited users, no ongoing software fees. [S34] Owner: Edison Robotics (meetedison.com). Hardware: single robot USD 59.00, 30-robot class pack USD 1,199.00 (as of 2026-10-26). [S34] Free lesson plans, teacher guides, student sheets; schools can request quotes and grant support help. [S34]
- Editors run in a browser with no install or drivers (retailer text, EXTERNAL). [S34]
- Original projects: yes in code, fixed robot. Simulator, LMS, collaboration: UNKNOWN.
- Learn. A USD 59 robot with free software shows the price point schools accept. HYPOTHESIS.

### 11. mBlock (Makeblock)

- What it is. Scratch-based blocks plus Python editor; runs in browser at ide.mblock.cc and python.mblock.cc, desktop (Windows, Mac), Android and iOS; browser hardware connections work in Chrome and Edge. Supports CyberPi, mBot2, mBot2 Rover, Codey Rocky, mBuild, and third-party Arduino and micro:bit via developer tools. AI blocks: speech recognition, pose recognition, image recognition, generative AI, plus Microsoft Cognitive Services and Google Teachable Machine. mCloud collects IoT data. 8 K-12 lesson plans stated to meet CSTA/ISTE standards. [S35]
- Pricing. Software price not stated on the page; schools can request a quote and pay by purchase order. [S35] A software directory calls it free; unverified. mBot2 hardware retail about GBP 160.78 (March 2026) or USD 149.99, per retailer search digests. [S35]
- Licence. The old mBlock v3 repo (based on Scratch offline v2.0, ActionScript, 330 stars, 238 forks) exists; the licence is not shown on the org page. mBlock 5 appears proprietary. SPDX UNKNOWN. [S36]
- Simulator in mBlock 5: UNKNOWN (not confirmed).
- Learn. AI blocks wired to a camera/mic are a cheap way to feel "creative"; blocks-to-Python switching in one click is a good bridge. HYPOTHESIS.

### 12. Sphero Edu

- What it is. App to program Sphero robots (BOLT+, BOLT, RVR and older). The App Store listing (via search digest) says it is free, teachers can create and assign lessons, classrooms sign in and sync with Google and Clever. [S37] The Sphero Central page fetch returned only a topic list. Free versus paid account tiers: UNKNOWN.
- Hardware pricing (retail, EXTERNAL, varies): BOLT+ USD 239 (2025 guide); Blueprint Engineering Kit USD 449; 15-robot BOLT+ education pack NZD 6,500 incl. GST at one retailer. [S37]
- Programming modes: not verified (blocks and JavaScript are known to me but not sourced here): UNKNOWN.
- Learn. Clever and Google roster sync is how K-12 products avoid managing student accounts. HYPOTHESIS.

### 13. FIRST virtual tools (FRC/FTC) and WPILib simulation

- No official FIRST-run virtual lab found. FIRST's resource library URL returned 404. I did not find FTC virtual tools. [S38]
- WPILib (the FRC software library) has a desktop simulation: a Sim GUI, headless mode, Java and C++ (needs desktop support enabled and a native compiler), Python via RobotPy `robotpy sim`, and hardware-in-the-loop where vendors support it. Some vendor libraries may crash in simulation. [S38] Repo allwpilib: BSD-3-Clause, 1.3k stars (read 2026-10-26). https://github.com/wpilibsuite/allwpilib [S39]
- Learn or reuse. Same robot code runs in sim and on the real robot; this is the model for firmware compatibility. BSD-3-Clause allows reuse. HYPOTHESIS.

### 14. LabsLand (university and school remote labs)

- What it is. Network of remote labs with real equipment accessed by browser; 74 public labs, 21 institutions and lab providers (including DigiKey, Intel, Altera, STMicroelectronics, AMD), 6 LMS integrations (Moodle, Sakai, Canvas, ILIAS, Blackboard, Google Classroom). Also builds remote-lab hardware and custom labs. [S40]
- Pricing as of 2026-10-26. Universities: Higher Education Standard from EUR 7.99 per student per semester ("recommended", covers most labs); Advanced from EUR 19.99 per student per semester (all labs). Both are "from" starting prices and the page directs buyers to ask for a quote. Schools: annual school-wide pricing, amount not listed; companies and custom labs: scoped per project; individuals: licences mentioned, no prices. Fact-checked 2026-10-26: confirmed. "Pilots can start with one course" was not on the pricing page when re-fetched: UNKNOWN. [S41]
- Lab types. STM32 Nucleo (C, Mbed, binary upload), TI LaunchPad TM4C129 (ELF/HEX/AXF/BIN upload), ATmega328p assembly on an Uno, Arduino board and Arduino robot (code or visual, for elementary to university), FPGA labs (DE1-SoC, DE2-115; VHDL, Verilog, SystemVerilog; .sof upload; Nios V), digital trainers, Hive analog electronics, AC electronics. [S42]
- Mechanics. Queues, sessions and access rules are part of its software; one datasheet says a fast user-switching mode lets up to 120 students use a circuit lab at once. Latency and queue times: UNKNOWN. [S43]
- Original projects: yes, you can upload your own code or compiled binary; no custom hardware or circuit editing since it is fixed real equipment. Failure modeling: real hardware only (physical faults exist but not injectable by the learner: UNKNOWN). Debugging: depends on lab; UNKNOWN.
- Learn or reuse. LabsLand proves schools and universities pay per student-semester for real-toolchain access (binary upload) and LMS integration. iynk's simulated equivalent has no queue and no hardware cost. LabsLand's content is proprietary. HYPOTHESIS.

### 15. MIT iLab and iLab-style remote labs

- iLab Shared Architecture: three tiers (lab client, Service Broker, lab server) where the broker provides authentication, authorization, lab administration, scheduling and data storage; papers date from 2004 to 2008. [S44] The ilab.mit.edu host did not resolve when fetched, and search found no 2025 or 2026 status. Status: UNKNOWN, likely legacy or academic. Do not treat as a live competitor.
- Learn. The broker/lab-server split is the architecture LabsLand-type products descend from. HYPOTHESIS.

### 16. Tinkercad Circuits (added: credible discovery)

- What it is. Free browser circuit simulator from Autodesk with electronic components and Arduino simulation, with a code editor, serial monitor, blocks and text modes, and classroom features (third-party description via search). Whether an account is needed is UNKNOWN: the original claim cited the Autodesk page, but a re-fetch on 2026-10-26 returned only the page title. [S45] Autodesk's own education terms were not retrieved. All3DP (via search digest) recommends it for beginners and classroom use at the start of 2026. [S46]
- Original projects: yes, free-form breadboard circuits. Boards: Uno, ATtiny and micro:bit per a 2021 forum comparison; ESP32 is reported as not supported by two third-party blogs; Bluetooth not supported per a community post. Libraries cannot be used (2021 forum). Wokwi is named as the alternative with ESP32, Pico, Mega, ATtiny85. [S46]
- Owner Autodesk; licence proprietary. Pricing: free (secondhand). Failure modeling, LMS: UNKNOWN.
- Learn. This is the closest incumbent to iynk's circuit side for schools. The known gaps (boards, libraries, accuracy) are where iynk should be measurably better. Highest threat in this category for the circuit workflow. HYPOTHESIS for the gap list; EXTERNAL for the gaps themselves.

## Comparison table

Cell format: short value, label, source. U = UNKNOWN (no source read). Fixed device means the learner picks from a preset device or robot. Dimensions are split across three tables because there are 27.

### Table A: access, creation, fidelity

| Product | Free usage | No-account entry | Browser | User-created projects | Circuit editor | Custom hardware models | Firmware / real toolchain | MCU sim fidelity | Analog circuit fidelity | Failure modeling |
|---|---|---|---|---|---|---|---|---|---|---|
| MakeCode micro:bit | Free: price not stated on S6, UNKNOWN | Yes for use; Teams needs account EXTERNAL [S6] | Yes EXTERNAL [S3] | Yes, fixed device EXTERNAL [S3] | No EXTERNAL [S3] | Via extensions, code-level EXTERNAL [S4] | HEX output EXTERNAL [S3] | JS stand-in for C++ runtime EXTERNAL [S13] | No U | No U |
| micro:bit Python Editor | Free EXTERNAL [S6] | Yes EXTERNAL [S6] | Yes EXTERNAL [S10] | Yes, fixed device EXTERNAL [S6] | No U | No U | MicroPython hex U | Simulator exists, fidelity U [S10] | No U | No U |
| CreateAI | Free EXTERNAL [S9] | U | Yes (Chrome/Edge) EXTERNAL [S6] | Own ML models EXTERNAL [S6] | No | No | Uses MakeCode HEX EXTERNAL [S11] | N/A | N/A | N/A |
| Arduino Cloud / Education | Free tier; compile cap UNKNOWN (25/day unconfirmed) [S15] | No, account U | Yes EXTERNAL [S16] | Yes EXTERNAL [S16] | No U | No U | Real Arduino toolchain, real boards EXTERNAL [S15] | No simulator seen U | No U | No U |
| RPF Code Editor | Free EXTERNAL [S21] | Account for saving EXTERNAL [S23] | Yes EXTERNAL [S21] | Yes (code) EXTERNAL [S23] | No | Sense HAT emulator only EXTERNAL [S23] | N/A | Sense HAT emulation EXTERNAL [S23] | No | No |
| Brilliant | Paid, "$30/month" (billing basis UNKNOWN) EXTERNAL [S26] | No U | Yes (app/web) U | Not a lab U | U | U | N/A | N/A | U | U |
| VEXcode VR | Free tier blocks-only EXTERNAL [S29] | Yes EXTERNAL [S29] | Yes EXTERNAL [S29] | Code in fixed worlds EXTERNAL [S29] | No | Fixed robot U | VEX code path U | Robot physics, MCU N/A U | No | No U |
| CoderZ | Paid licence EXTERNAL [S30] | No U | Yes EXTERNAL [S30] | Missions, U beyond | No | U | U | U | No | U |
| Robot Virtual Worlds | Legacy, U | U | No (desktop ROBOTC) EXTERNAL [S31] | Code in fixed worlds EXTERNAL [S31] | No | No | ROBOTC EXTERNAL [S31] | U | No | U |
| LEGO SPIKE / CS&AI | App free; kit USD 339.95+ EXTERNAL [S33] | Yes, no student login EXTERNAL [S33] | Yes EXTERNAL [S33] | Code on LEGO hardware EXTERNAL [S33] | No | No | LEGO runtime U | U | No | No |
| Edison | Software free EXTERNAL [S34] | U | Yes EXTERNAL [S34] | Code on fixed robot EXTERNAL [S34] | No | No | U | U | No | No |
| mBlock | Price not stated EXTERNAL [S35] | U | Yes EXTERNAL [S35] | Yes EXTERNAL [S35] | No U | Third-party boards via dev tools EXTERNAL [S35] | Arduino/micro:bit support EXTERNAL [S35] | U | No | No |
| Sphero Edu | App free EXTERNAL [S37] | No, Google/Clever sync EXTERNAL [S37] | U | Code on fixed robot U | No | No | N/A | N/A | No | No |
| WPILib sim | Free, BSD-3 EXTERNAL [S39] | N/A desktop | No (desktop) EXTERNAL [S38] | Yes EXTERNAL [S38] | No | Vendor libs EXTERNAL [S38] | Same robot code EXTERNAL [S38] | Physics-level U | No | No |
| LabsLand | Paid, from EUR 7.99/student/sem EXTERNAL [S41] | No U | Yes EXTERNAL [S40] | Upload code/binary EXTERNAL [S42] | No | Fixed real labs EXTERNAL [S42] | Real binaries (ELF, HEX, .sof) EXTERNAL [S42] | Real hardware EXTERNAL [S42] | Real hardware EXTERNAL [S42] | Real faults only U |
| MIT iLab | U, likely legacy | U | U | U | U | U | U | U | U | U |
| Tinkercad Circuits | Free secondhand EXTERNAL [S46] | Account needed: UNKNOWN (S45 returned title only) | Yes EXTERNAL [S45] | Yes EXTERNAL [S46] | Yes EXTERNAL [S46] | No, preset parts U | Own sim; no libraries EXTERNAL [S46] | Uno-class, U fidelity | U | U |

### Table B: tools, learning, community

| Product | Debugging tools | Robotics sim | Drone sim | AI guidance | Multilingual UI | Real-time collaboration | Curriculum / LMS | Community features |
|---|---|---|---|---|---|---|---|---|
| MakeCode micro:bit | Simulator, serial EXTERNAL [S4][S12] | No | No | No U | Translation docs exist, list U EXTERNAL [S3] | Classroom live view EXTERNAL [S6] | Teams assignments EXTERNAL [S6] | Public share links, forum EXTERNAL [S6][S13] |
| micro:bit Python Editor | Pyright diagnostics EXTERNAL [S10] | No | No | No U | Yes (lang folder) EXTERNAL [S10] | Classroom EXTERNAL [S6] | Courses U | Download .py EXTERNAL [S6] |
| CreateAI | Test model live EXTERNAL [S6] | No | No | Teaches ML EXTERNAL [S9] | Language selector, list U EXTERNAL [S9] | U | Taster lesson EXTERNAL [S47] | U |
| Arduino Cloud / Education | Serial, dashboards U | No | No | AI Assistant on School plan EXTERNAL [S15] | U | Shared spaces EXTERNAL [S15] | Course library, Google Classroom EXTERNAL [S15] | Forum, Project Hub EXTERNAL [S17] |
| RPF Code Editor | Friendly errors, AI error help EXTERNAL [S23] | No | No | Optional AI help EXTERNAL [S23] | locale attribute EXTERNAL [S23] | Teacher sees students live EXTERNAL [S21] | Classes, Code Club projects EXTERNAL [S21] | Remix, Coolest Projects EXTERNAL [S21][S23] |
| Brilliant | N/A | No | No | U | U | No | Free educator access mentioned EXTERNAL [S27] | U |
| VEXcode VR | U | Yes EXTERNAL [S29] | No | No U | U | Class sharing via Drive/Dropbox EXTERNAL [S29] | Class codes, PD+ EXTERNAL [S29] | Virtual Skills, competitions EXTERNAL [S29] |
| CoderZ | U | Yes EXTERNAL [S30] | No | No U | U | U | Reporting consoles EXTERNAL [S30] | CoderZ League EXTERNAL [S30] |
| Robot Virtual Worlds | U | Yes EXTERNAL [S31] | No | No | U | No | CS2N link ended 2021 EXTERNAL [S31] | U |
| LEGO SPIKE / CS&AI | U | U | No | AI activities EXTERNAL [S33] | U | No U | Lessons in app EXTERNAL [S32] | FLL EXTERNAL [S32][S33] |
| Edison | U | U | No | No U | U | No U | Free lesson plans EXTERNAL [S34] | U |
| mBlock | U | U | No | AI blocks (vision, speech, GenAI) EXTERNAL [S35] | U | U | 8 lesson plans, CSTA/ISTE EXTERNAL [S35] | Help Center, mCloud EXTERNAL [S35] |
| Sphero Edu | U | No | No | U | U | Teacher assigns EXTERNAL [S37] | Google, Clever sync EXTERNAL [S37] | U |
| WPILib sim | Sim GUI EXTERNAL [S38] | Yes EXTERNAL [S38] | No | No | U | Git U | FIRST programme U | Large FRC community U |
| LabsLand | Lab-dependent U | Arduino robot lab EXTERNAL [S42] | No U | No U | U | Queues, sessions EXTERNAL [S43] | 6 LMS EXTERNAL [S40] | U |
| MIT iLab | U | U | U | U | U | U | U | U |
| Tinkercad Circuits | Serial Monitor EXTERNAL [S46] | No | No | U | U | Classroom accounts EXTERNAL [S46] | Class management EXTERNAL [S46] | Public gallery U |

### Table C: business and moat

| Product | Physical BOM generation | Component purchasing | Export to real toolchains | Plugin extensibility | Pricing (as of 2026-10-26) | Performance | Target audience | Ecosystem strength | Moat |
|---|---|---|---|---|---|---|---|---|---|
| MakeCode micro:bit | No U | No U | HEX; no IDE project export U [S3] | Yes, GitHub extensions [S4] | Free EXTERNAL [S6] | Light mode on small devices EXTERNAL [S13] | Ages 8 to 16 | 73.5M children (vendor) EXTERNAL [S8] | Microsoft + micro:bit distribution; MIT PXT [S2] |
| micro:bit Python Editor | No | No | .py, HEX EXTERNAL [S6] | U | Free EXTERNAL [S6] | U | Classrooms | Same as above [S8] | Official editor status |
| CreateAI | No | No | HEX EXTERNAL [S6] | MakeCode extension pxt-microbit-ml EXTERNAL [S11] | Free EXTERNAL [S9] | Chrome/Edge only EXTERNAL [S6] | Ages 8+ | Google.org pilot EXTERNAL [S9] | Research + Foundation reach |
| Arduino Cloud / Education | No U | Kits via store EXTERNAL [S18] | Native Arduino EXTERNAL [S15] | Libraries U | School USD 20/member/yr; Maker USD 72/yr EXTERNAL [S15] | Compile cap on free EXTERNAL [S20] | K-12 to industry EXTERNAL [S17] | Very large (Arduino forum, Project Hub) EXTERNAL [S17] | Real boards + brand |
| RPF Code Editor | No | No | Download EXTERNAL [S23] | Host panels EXTERNAL [S23] | Free EXTERNAL [S24] | Works on constrained devices EXTERNAL [S21] | Ages 9+ | 111 countries clubs EXTERNAL [S21] | Non-profit scale, content |
| Brilliant | No | No | No | No | USD $30/mo individual EXTERNAL [S26] | U | Adults, teens | U | Brand, content |
| VEXcode VR | No | No | U | No U | $0 / $199 / $499 per educator per year EXTERNAL [S29] | U | K-12 and VEX teams | VEX competitions EXTERNAL [S29] | VEX ecosystem |
| CoderZ | No | No | U | No | USD 2,000 to 2,400 per school per course (conflicting) EXTERNAL [S30] | U | Schools | U | Missions + reseller network |
| Robot Virtual Worlds | No | No | ROBOTC EXTERNAL [S31] | No | U | Desktop | Legacy | Declining | None visible |
| LEGO SPIKE / CS&AI | No | Kits via resellers EXTERNAL [S32] | No | No | Kit from USD 339.95 EXTERNAL [S33] | U | Primary, middle | FLL EXTERNAL [S32] | LEGO brand, FLL link |
| Edison | No | Robot USD 59 EXTERNAL [S34] | No | No | Software free; class pack USD 1,199 EXTERNAL [S34] | U | Ages 4 to 16 | U | Low-cost hardware |
| mBlock | No | Makeblock hardware | Arduino/micro:bit EXTERNAL [S35] | Dev tools for 3rd-party devices EXTERNAL [S35] | Quote EXTERNAL [S35] | U | K-12 | 977 GitHub followers EXTERNAL [S36] | Makeblock hardware |
| Sphero Edu | No | Robots at retail EXTERNAL [S37] | No | No | App free; BOLT+ about USD 239 EXTERNAL [S37] | U | K-12 | U | Hardware brand |
| WPILib sim | No | No | Same code to real robot EXTERNAL [S38] | Vendor libs EXTERNAL [S38] | Free BSD-3 EXTERNAL [S39] | Desktop | FRC teams | 1.3k stars EXTERNAL [S39] | FIRST mandate |
| LabsLand | No | No | Binary upload EXTERNAL [S42] | Partners publish labs EXTERNAL [S40] | EUR 7.99 / 19.99 per student per semester EXTERNAL [S41] | Queues, concurrency EXTERNAL [S43] | Universities, schools | 21 institutions EXTERNAL [S40] | Physical lab hardware network |
| MIT iLab | No | No | U | U | U | U | Academic | U | Legacy |
| Tinkercad Circuits | No U | No U | None; no libraries EXTERNAL [S46] | No U | Free secondhand EXTERNAL [S46] | Browser, Chromebook OK EXTERNAL [S46] | Beginners, schools | Autodesk reach U | Autodesk accounts and 3D tools |

## Where iynk could be genuinely different here (HYPOTHESIS unless evidenced)

1. Learner-created hardware projects, not only code for a fixed device. Within this category only Tinkercad Circuits offers a free-form circuit editor, with a narrow board list and no libraries [S46]. A multi-board lab with a real solver could own "design it, break it, fix it." HYPOTHESIS.
2. Fault injection as a teaching tool. No product in this category advertised failure modeling in the pages I read: UNKNOWN is the most I can say, so verify with teachers before claiming it.
3. Firmware fidelity. MakeCode's simulator is a JavaScript stand-in for the runtime, and users report code that works on the board erroring in the simulator [S13]. If iynk's interpreters run the real language subset, "what you test is what you flash" is a defensible claim, but only within the subset iynk supports. HYPOTHESIS.
4. Remote-lab experience without remote-lab cost. LabsLand charges from EUR 7.99 per student per semester and has queues for physical stations [S41][S43]. A simulation has no queue and no hardware to host. Real-equipment value (true noise, true faults) remains LabsLand's. HYPOTHESIS.
5. Hardware platform risk hedge. LEGO retired SPIKE with a published 2031 end of app support [S32]; RVW lost its server link [S31]. A free, hardware-agnostic lab lets a school keep teaching on hardware it already owns. HYPOTHESIS.
6. AI lab partner for debugging, not AI literacy. Competitors teach about AI (CreateAI, Experience AI, mBlock AI blocks, LEGO) [S9][S21][S35][S33]; Arduino School plan has an AI Assistant [S15] and the Raspberry Pi editor has optional AI error help [S23]. A partner that reads the circuit and the error is a different product. HYPOTHESIS.
7. Six UI languages and no-account rooms. micro:bit classroom already does no-account sessions [S6]; language lists for most competitors were not published on pages I read (UNKNOWN), so language breadth cannot be claimed as a gap yet.
8. Distribution, not features, is the moat in this category: micro:bit (73.5M children), Raspberry Pi Code Clubs (111 countries), VEX competitions, LEGO FLL [S8][S21][S29][S32]. A startup should plan partnerships (clubs, competitions, reseller catalogues) from the start. HYPOTHESIS.
9. Likely objections from schools: no curriculum alignment or LMS integration yet; teachers buy what has lesson plans (mBlock cites CSTA/ISTE; Arduino has a course library; RPF has the Computing Curriculum) [S35][S15][S24]. HYPOTHESIS.

## Sources

All accessed 2026-10-26. "Digest" means the page was read through a summarising fetch tool, or the fact comes from a web-search digest; I did not see raw HTML.

- S1 https://makecode.microbit.org (fetch returned title only) Microsoft MakeCode for micro:bit; Microsoft; current.
- S2 https://github.com/microsoft/pxt Microsoft MakeCode (PXT); Microsoft; page read 2026-10-26 (MIT, 2.3k stars, 639 forks, 14,640 commits).
- S3 https://makecode.com/about About MakeCode; Microsoft; undated.
- S4 https://makecode.com/extensions MakeCode extensions documentation; Microsoft; undated.
- S5 https://makecode.microbit.org/extensions Extensions, micro:bit editor; Microsoft; undated.
- S6 https://microbit.org/teach/teaching-tools/ Teaching tools; Micro:bit Educational Foundation; undated.
- S7 https://microbit.org/code/ Code editors; Micro:bit Educational Foundation; undated.
- S8 https://microbit.org/about/ About us (73.5 million children, 85+ countries); Micro:bit Educational Foundation; undated.
- S9 https://microbit.org/news/2026-02-19/microbit-createai-us-pilot-supported-by-googleorg/ micro:bit CreateAI US pilot supported by Google.org; Foundation; 2026-02-19.
- S10 https://github.com/microbit-foundation/python-editor-v3 micro:bit Python Editor V3; Foundation; MIT, 84 stars.
- S11 https://github.com/microbit-foundation/ml-trainer micro:bit ML trainer (CreateAI); Foundation; MIT, 16 stars.
- S12 https://makecode.microbit.org/device/simulator Simulator documentation; Microsoft; undated.
- S13 Search digest of forum threads: https://forum.makecode.com/t/problem-with-micro-bit-simulator-on-makecode/30330 ; https://forum.makecode.com/t/ledrgb-jacdac-simulator-not-fully-functional-on-mobile/11928 ; https://forum.makecode.com/t/what-causes-the-simulator-to-generate-this-error-the-code-works-in-the-board-hardware-fine/15610 ; https://forum.makecode.com/t/microbit-makecode-simulator/29814 ; https://support.microbit.org/support/solutions/articles/19000126744-makecode-simulator-does-not-load . Community evidence; dates not shown.
- S14 https://github.com/microsoft/pxt-microbit pxt-microbit; Microsoft; 809 stars, licence not shown.
- S15 https://cloud.arduino.cc/plans/ Arduino Cloud plans; Arduino; current.
- S16 https://cloud.arduino.cc/schools/ Arduino Cloud for Schools; Arduino; current.
- S17 https://www.arduino.cc/education/ Arduino Education; Arduino; includes 2025 catalogue mention.
- S18 Search digest of https://store.arduino.cc/products/plug-and-make-kit and https://store.arduino.cc/en-fr/products/alvik and holiday-deals collections; Arduino store; snapshot prices, not dated.
- S19 Search digest: https://blog.arduino.cc/2020/12/02/a-very-short-guide-to-help-you-transition-to-the-arduino-science-journal/ ; https://support.google.com/sciencejournal/answer/9176370 ; Arduino; 2020 to 2021.
- S20 Search digest: https://support.arduino.cc/hc/en-us/articles/4406236035858-About-compilation-limits-with-the-free-Cloud-plan (403 to direct fetch) ; https://forum.arduino.cc/t/cant-subscribe-to-maker-plan/1382630 ; https://forum.arduino.cc/t/rename-sketch-con-arduino-cloud-editor/1397019 . Support and community evidence.
- S21 https://static.raspberrypi.org/about/Raspberrypi_Pi_Foundation_Annual_Review_2025.pdf Raspberry Pi Foundation Annual Review 2025; Raspberry Pi Foundation; calendar year 2025. Read with pdftotext.
- S22 https://www.raspberrypi.org/code-club/ Code Club; Raspberry Pi Foundation; undated.
- S23 https://github.com/RaspberryPiFoundation/editor-ui editor-ui (Code Editor web component); Raspberry Pi Foundation; 39 stars, licence not read.
- S24 https://www.raspberrypi.org/teach/ Teach; Raspberry Pi Foundation; undated.
- S25 https://github.com/raspberrypilearning/ raspberrypilearning organisation; 1,515 repositories.
- S26 https://brilliant.org/subscribe/ Subscribe; Brilliant.org; current.
- S27 https://brilliant.org/help/pricing-and-plans/how-much-does-brilliant-premium-cost/ Pricing help; Brilliant.org; current.
- S28 https://brilliant.org/courses/ Courses (returned tagline only); Brilliant.org.
- S29 Search digests of https://www.vexrobotics.com/vr (403 to direct fetch), https://kb.vex.com/hc/en-us/articles/10237033931028-VR-Educators-Start-Here , https://kb.vex.com/hc/en-us/articles/51482588052372-Accessing-Virtual-Skills-with-a-VR-Class-Code ; VEX Robotics; 2026-2027 season.
- S30 Search digest: https://stemfinity.com/collections/virtual-reality/products/coderz-cyber-robotics-101-school-license ; https://bidopportunities.iowa.gov/Home/ShowContractDocument/2efba7d8-f86e-4e55-9693-6f014bb9df6f ; https://www.techlearning.com/ed-tech-ticker/product-review-coderz ; https://thejournal.com/articles/2017/05/10/intelitek-debuts-coding-platform-for-virtual-and-real-robots.aspx . coderz.io failed with an expired certificate.
- S31 https://www.cmu.edu/roboticsacademy/news/cmra-news-2021/rvw-no-longer-supported.html RVW no longer supported (CS2N); Carnegie Mellon Robotics Academy; 2021. Webots: https://github.com/cyberbotics/webots (Apache-2.0, search digest).
- S32 https://education.lego.com/en-us/spike-update-2026/ SPIKE update 2026; LEGO Education; 2026.
- S33 https://www.lego.com/en-us/aboutus/news/2026/january/lego-education-cs-ai LEGO Education announces Computer Science & AI; The LEGO Group; January 2026.
- S34 https://meetedison.com/ Edison; Edison Robotics; current.
- S35 https://www.mblock.cc/en/ mBlock; Makeblock; current. Hardware prices from retailer digests of core-electronics.com.au and coolcomponents.co.uk.
- S36 https://github.com/Makeblock-official Makeblock organisation on GitHub; 83 repositories, 977 followers.
- S37 Search digest: https://apps.apple.com/us/app/sprk-lightning-lab-programming/id1017847674 (Sphero Edu listing) ; https://engineering.purdue.edu/INSPIRE/EngineeringGiftGuide/2025/sphero-bolt-and-sphero-blueprint-engineering-kit ; https://edu.sphero.com/ (topic list only).
- S38 https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/introduction.html Robot simulation introduction; WPILib; current docs.
- S39 https://github.com/wpilibsuite/allwpilib allwpilib; WPILib; BSD-3-Clause, 1.3k stars.
- S40 https://www.labsland.com/en LabsLand home; LabsLand; current.
- S41 https://www.labsland.com/en/pricing LabsLand pricing; LabsLand; current.
- S42 https://www.labsland.com/en/labs Lab catalogue; LabsLand; current (digest says list may be truncated).
- S43 Search digest: https://labsland.com/en/hardware ; https://datasheets.labsland.com/licenses/LCAL9002 ; LabsLand.
- S44 Search digest: https://dspace.mit.edu/handle/1721.1/29393 ; https://www.mit.edu/people/klund/papers/ACC05_ilab.pdf ; MIT; 2004 to 2008. ilab.mit.edu did not resolve.
- S45 https://www.tinkercad.com/circuits Tinkercad Circuits; Autodesk; account required per digest.
- S46 Search digests: https://forum.arduino.cc/t/virtual-online-arduino-and-esp32-simulator-wokwi-arduino-simulator-features/698481/3 (2021) ; https://macmyths.com/how-to-add-esp32-in-tinkercad/ ; https://all3dp.com/pt/2/simulador-arduino-online-offline/ ; https://zbotic.in/tinkercad-arduino-simulation-teach-electronics-online-free/ (vendor blog). Secondary sources; Autodesk terms not retrieved.
- S47 https://microbit.org/teach/ Teach; Micro:bit Educational Foundation; mentions CreateAI taster lesson.
- S49 Search digest added in fact-check: https://www.vexrobotics.com/vexcode-vr ; https://machexhibition.com/wp-content/uploads/2026/03/7.-VR_SalesSheet_A4_UK_2025_Digital.pdf (VR UK sales sheet 2025) ; https://discourseaws.vex.com/t/vexcode-vr-enhanced-and-premium/595 ; VEX Robotics; accessed 2026-10-26.
- S48 https://cs.au.dk/news-events/news/show-news/artikel/microbit-createai-unleashes-ai-creativity-in-classrooms micro:bit CreateAI unleashes AI creativity in classrooms; Aarhus University; search digest, date not shown.

## Fact-check log (2026-10-26)

Checker re-opened each source with WebFetch (digest, not raw HTML) or pdftotext for the PDF. Verdicts: confirmed (source says exactly this), corrected (file changed), unconfirmed (source unreachable or silent; marked UNKNOWN in the file).

| # | Claim | Verdict | Source checked |
|---|---|---|---|
| 1 | Arduino Cloud: Maker $72/yr, Team $1,000/yr, School $20/member/yr, 5 Things, 6 months retention, Google Classroom, 30-day trial | confirmed; added Maker 25 Things, AI Assistant 1,500/month, $240 Prototyping offer; Free "USD 0" is implied, page lists no figure; currency "$" unnamed | https://cloud.arduino.cc/plans/ |
| 2 | Arduino free plan 25 compiles per day | unconfirmed (support article 403, search budget exhausted); set to UNKNOWN | https://support.arduino.cc/hc/en-us/articles/4406236035858-About-compilation-limits-with-the-free-Cloud-plan |
| 3 | LabsLand EUR 7.99 and EUR 19.99 per student per semester | confirmed, but "from" prices; "pilots can start with one course" not on page, set UNKNOWN | https://www.labsland.com/en/pricing |
| 4 | micro:bit 73.5 million children, 85+ countries | confirmed | https://microbit.org/about/ |
| 5 | micro:bit classroom: no registration or accounts for teacher or student; projects in local storage | confirmed | https://microbit.org/teach/teaching-tools/ |
| 6 | MakeCode / Python Editor / micro:bit software are free | corrected: S6 does not state a price; downgraded to UNKNOWN in text and Table A | https://microbit.org/teach/teaching-tools/ |
| 7 | Edison robot $59.00, 30-pack $1,199.00 USD, software free for unlimited users | confirmed | https://meetedison.com/ |
| 8 | LEGO SPIKE: sales end 2026-06-30, app support and lessons to 2031-06-30, spares 2 years, FLL through 2027-2028 | confirmed; added CS&AI is the FLL option from 2026-2027 | https://education.lego.com/en-us/spike-update-2026/ |
| 9 | LEGO CS&AI from $339.95 per kit (~$84.98 per student), K-8, ships April 2026, no student login, data local | confirmed | https://www.lego.com/en-us/aboutus/news/2026/january/lego-education-cs-ai |
| 10 | Brilliant $30/month individual, $40/month family, 33% annual saving | corrected: figures are on the page, but whether they are monthly-billed or annualised, and the currency, are not stated; marked UNKNOWN in basis | https://brilliant.org/subscribe/ |
| 11 | VEXcode VR Free / $199 / $499 per educator per year | confirmed via search digest only (primary page 403); added UK GBP 149.99 / 369.99 and tier feature details; "no sign-in" unconfirmed, set to UNKNOWN | https://www.vexrobotics.com/vr (403); [S49] |
| 12 | microsoft/pxt MIT, 2.3k stars, 639 forks, 14,640 commits | confirmed | https://github.com/microsoft/pxt |
| 13 | python-editor-v3 MIT, 84 stars, 47 forks; ml-trainer MIT, 16 stars | confirmed | https://github.com/microbit-foundation/python-editor-v3 ; https://github.com/microbit-foundation/ml-trainer |
| 14 | allwpilib BSD-3-Clause, 1.3k stars; editor-ui 39 stars, 14 forks, licence not shown | confirmed (editor-ui SPDX remains UNKNOWN) | https://github.com/wpilibsuite/allwpilib ; https://github.com/RaspberryPiFoundation/editor-ui |
| 15 | CreateAI US pilot, Google.org, 2026-02-19, no user counts | confirmed; page targets Grade 4-8 teachers | https://microbit.org/news/2026-02-19/microbit-createai-us-pilot-supported-by-googleorg/ |
| 16 | Raspberry Pi Annual Review 2025: 9,117 clubs, 111 countries, 322,700/month, 2.3 million in 11 years, 36,477 Code Editor users, 163,993 projects, 1,996 schools, Experience AI 1,000,000 in 2025, 27 partners in 30 countries, 28,328 educators, 706,024 downloads, 27,247 Astro Pi, 1,966,934 Ada questions | confirmed; the 2.7 million total is labelled "estimated" in the review (wording fixed) | https://static.raspberrypi.org/about/Raspberrypi_Pi_Foundation_Annual_Review_2025.pdf |
| 17 | Robot Virtual Worlds lost CS2N connection in 2021 | confirmed (dated 2021-08-24); added that Local Account use continues, so "legacy" is inference | https://www.cmu.edu/roboticsacademy/news/cmra-news-2021/rvw-no-longer-supported.html |
| 18 | Tinkercad Circuits requires an account | unconfirmed (fetch returned title only); set to UNKNOWN in text and Table A | https://www.tinkercad.com/circuits |

Counts: 18 claims checked, 4 corrected (items 6, 10, plus Free/price basis in 1 and 3), 3 unconfirmed (items 2, 11 "no sign-in", 18), rest confirmed. Not re-checked: Sphero, CoderZ, mBlock, Tinkercad board list, LabsLand lab catalogue (secondary sources, no budget).
