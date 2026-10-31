export const meta = {
  name: 'master-plan-research',
  description: 'Master plan phase 1 research: competitors (desk + hands-on), users, market, technical options, compliance; fact-check every dossier; synthesize 02_RESEARCH',
  phases: [
    { title: 'Research', detail: 'one agent per competitor category, users, market, technology and compliance', model: 'sonnet' },
    { title: 'Fact-check', detail: 'a second agent re-checks each dossier against its sources and fixes it in place', model: 'sonnet' },
    { title: 'Synthesize', detail: 'COMPETITOR_LANDSCAPE, USER_SEGMENTS, USER_RESEARCH_PLAN, TECHNICAL_RESEARCH, SOURCE_REGISTER', model: 'sonnet' },
  ],
}

// Every subagent runs on Sonnet 5.5 (Amar, 2026-10-26); only the orchestrating session is Opus.
const sonnet = (prompt, opts = {}) => agent(prompt, { ...opts, model: 'sonnet' })

const repo = '/Users/amar/Codes/ak/simlab'
const scratch = args?.scratch
const out = `${repo}/docs/MASTER_PLAN/02_RESEARCH`
const today = '2026-10-26'

const RULES = `You are a researcher on a council writing a master plan for iynk (https://iynk.tech, repo ${repo}), a free browser hardware lab built at
HackTX 2026: Board Lab (Arduino Uno/Nano/R4, ESP32, ESP8266, Pico, STM32 Nucleo, micro:bit, Raspberry Pi, two FPGA boards; Arduino C++ subset,
MicroPython, Python and Verilog-subset interpreters written in TypeScript), Robotics Lab (motor drivers, servos, sensors, buck converter, line follower,
Pi + ROS 2 concepts, step-by-step bench assembly), Drone Lab (13 craft, drone calculator, assembly, safety checks, a flight sim), with a home-made circuit
solver, fault injection, rooms over a WebSocket relay, an AI lab partner (Meta Muse Spark, Gemini fallback), six UI languages, SerpApi live parts prices,
Solana devnet credentials and an MCP server. Today users can only open catalogue items and lessons; they cannot create an original project. The founders
want to grow it into a startup whose mission is accessible hardware experimentation for anyone, anywhere. Today is ${today}.

Rules:
- Use current sources. Load the web tools with ToolSearch (query "select:WebSearch,WebFetch") and use them. Official sources first (product pages,
  docs, pricing pages, changelogs, GitHub repos, papers, regulators), then credible community evidence (Reddit, forums, HN, reviews) clearly marked as
  such. Record for every source: URL, title, publisher, access date ${today}, and the version or date it describes.
- Never fabricate a capability, price, benchmark, user opinion or market number. If a page will not load or is paywalled, say so and move on. If you are
  inferring, label it. Labels: TESTED (you did it hands-on), EXTERNAL (a cited source states it), ESTIMATED (your calculation, assumptions shown),
  HYPOTHESIS, UNKNOWN. Your training knowledge is not a source; use it only to know where to look, and verify.
- Prices change: give the price, the currency, the plan name and the URL, and say "as of ${today}".
- Licensing matters for anything we might reuse: give the licence (SPDX id) and the repo URL for every open-source project you mention.
- Do not create accounts, enter payment details, post anything, contact anyone or submit forms. Free, no-login use of a public web app is allowed.
- Do not modify the iynk repo except your own output file(s). Scratch files go under ${scratch}/research/<your label>/. Run Python with -I.
- Write plainly: short sentences, tables for comparisons, no marketing language, no em dashes. Every row and claim carries a source reference like [S12]
  that points to a numbered "## Sources" list at the end of your file (URL, title, accessed ${today}).
- Your final text is returned as data; the human reads your file, so make the file complete on its own.`

// The comparison dimensions from the brief (§5.3). Every competitor dossier fills these so the matrix can be merged.
const DIMENSIONS = [
  'free usage', 'no-account entry', 'browser-based', 'user-created projects', 'circuit editor', 'custom hardware models',
  'firmware compatibility (real toolchain / binaries)', 'MCU simulation fidelity', 'analog circuit fidelity', 'failure modeling',
  'debugging tools', 'robotics simulation', 'drone simulation', 'AI guidance', 'multilingual UI', 'real-time collaboration',
  'curriculum integration / LMS', 'community features', 'physical BOM generation', 'component purchasing', 'export to real toolchains',
  'plugin extensibility', 'pricing', 'performance', 'target audience', 'ecosystem strength', 'moat',
]

const PRODUCT_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          url: { type: 'string' },
          category: { type: 'string' },
          owner: { type: 'string' },
          openSource: { type: 'string', description: 'SPDX licence + repo URL, or "proprietary"' },
          pricing: { type: 'string', description: 'plans and prices as of today with source ref' },
          audience: { type: 'string' },
          dimensions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dimension: { type: 'string' },
                value: { type: 'string', description: 'short answer: yes / no / partial + one line' },
                label: { type: 'string', enum: ['TESTED', 'EXTERNAL', 'ESTIMATED', 'HYPOTHESIS', 'UNKNOWN'] },
                source: { type: 'string', description: 'URL or [S#]' },
              },
              required: ['dimension', 'value', 'label'],
            },
          },
          strengths: { type: 'array', items: { type: 'string' } },
          weaknesses: { type: 'array', items: { type: 'string' } },
          threatToIynk: { type: 'string', enum: ['high', 'medium', 'low'] },
          reusableForIynk: { type: 'string', description: 'could iynk integrate, embed or learn from it (licence permitting)?' },
        },
        required: ['name', 'url', 'pricing', 'dimensions', 'threatToIynk'],
      },
    },
    sources: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, url: { type: 'string' }, title: { type: 'string' } }, required: ['id', 'url'] } },
    keyTakeaways: { type: 'array', items: { type: 'string' } },
  },
  required: ['file', 'products', 'sources', 'keyTakeaways'],
}

const DOSSIER_FORMAT = `Write ${'${FILE}'} with:
# <Category> competitors
## Summary (what this category means for iynk, 6-10 bullets)
## Products (one subsection per product: what it is, owner, audience, pricing as of ${today} with plan names, licence, what a user can actually do,
   how original projects / custom components / debugging / collaboration / education / export work, community size signals (GitHub stars, user
   counts the vendor states, forum activity) with dates, limitations users complain about (with links), and what iynk could learn or reuse)
## Comparison table (rows = products, columns = the dimensions below; cell = short value + label + [S#])
## Where iynk could be genuinely different here (HYPOTHESIS unless evidenced)
## Sources (numbered)
Dimensions to fill for every product (use UNKNOWN rather than guessing): ${DIMENSIONS.join('; ')}.`

const COMPETITOR_SETS = [
  {
    key: 'embedded-sim',
    title: 'Browser MCU / embedded simulators and embedded IDEs',
    products: `Wokwi (wokwi.com; also its VS Code extension, CI, custom chips API, pricing tiers, and the open-source emulators avr8js and rp2040js), Autodesk
Tinkercad Circuits (incl. its Arduino simulation and classroom features), Arduino Cloud and the Arduino Cloud Editor (plans, IoT features, education
plans), PlatformIO (IDE, Unified Debugger, its remote/CI features and pricing), and any credible newer browser MCU simulators or IDEs launched in
2024-2026 (search for them: e.g. browser ESP32 simulators, Velxio, Cirkit Designer's simulator, Arduino simulator apps; verify each exists).`,
  },
  {
    key: 'circuit-eda',
    title: 'Circuit simulators and EDA tools',
    products: `SimulIDE, Falstad CircuitJS (and its open-source fork lineage), Labcenter Proteus VSM (MCU co-simulation, pricing), NI Multisim and Multisim Live
(status: check whether Multisim Live still exists in 2026), EasyEDA (Standard/Pro, simulation, JLCPCB/LCSC integration), KiCad + ngspice (and ngspice's
WASM/browser builds such as EEcircuit), Fritzing (pricing change, breadboard view), CircuitLab, EveryCircuit, and any credible newer browser circuit
simulators (verify existence).`,
  },
  {
    key: 'education',
    title: 'Hardware and STEM education products',
    products: `Microsoft MakeCode (micro:bit, Arcade, its simulator and extension model), micro:bit Educational Foundation tools (Python Editor, CreateAI,
classroom), Arduino Education (kits, Science Journal, curricula, Arduino Cloud for Schools pricing), Raspberry Pi Foundation (Code Club, Code Editor,
Experience AI, curricula), Brilliant (interactive STEM, any electronics content, pricing), school robotics coding platforms (VEXcode VR, CoderZ, Robot
Virtual Worlds if alive, LEGO Education SPIKE app, Edison/EdBlocks, mBlock/Makeblock, Sphero Edu, FIRST virtual tools), and university remote-lab
offerings (e.g. LabsLand, MIT iLab-style remote labs). Focus on: how they reach schools (who buys), pricing per seat/school, LMS integration, assessment,
languages, and what learners can create beyond the curriculum.`,
  },
  {
    key: 'robotics',
    title: 'Robotics simulators and ROS learning environments',
    products: `Webots (Cyberbotics, open source since 2018, web streaming), Gazebo (Harmonic/Ionic/Jetty: which is current), The Construct / ROS Developers
Academy / ROSDS (pricing), NVIDIA Isaac Sim / Isaac Lab (requirements, licence), CoppeliaSim (licence for education vs commercial), MuJoCo (and its
WASM/browser builds), Foxglove (visualisation, pricing change), robotics simulators aimed at students or browsers (e.g. browser robot sims,
roboticsbackend-style, VEXcode VR robotics, Robot Ignite Academy), and URDF/SDF tooling in the browser. Focus on: what runs in a browser, hardware
needed (GPU), learning curve, fidelity, cost, and whether they let a student build an original robot.`,
  },
  {
    key: 'drone',
    title: 'Drone development, simulation and design tools',
    products: `PX4 SITL (with Gazebo, jMAVSim), ArduPilot SITL (incl. its built-in physics, RealFlight bridge, Mission Planner), FlightGear, FPV simulators
(Liftoff, Velocidrone, Uncrashed, DRL Sim, TRYP FPV: prices, physics claims, Betaflight-tune support), Betaflight Configurator / Blackbox Explorer, drone
design calculators (eCalc xcopterCalc and its pricing, Miniquad calculators, flyeval), drone education programmes (e.g. DroneBlocks, Drone Legends,
CoDrone/Robolink, Tello EDU), and any browser drone simulators. Also research flight-control and simulation fidelity standards and regulations relevant to
education (FAA TRUST/Part 107 basics, EASA open category) at a high level. Focus on: who designs a drone from parts and sees whether it flies, and how
much fidelity matters to each audience.`,
  },
  {
    key: 'ecosystems',
    title: 'Maker creation and project-sharing ecosystems',
    products: `GitHub (as the de facto hardware project host), Onshape (EDU plan, browser CAD, collaboration model), Autodesk Fusion (personal/education
licences), Instructables (Autodesk), Hackster.io (Avnet; contests, sponsored projects), Hackaday.io and the Hackaday Prize, Thingiverse, Printables
(Prusa), Wokwi's project sharing, Arduino Project Hub, Adafruit Learning System, SparkFun tutorials, and maker community forums. Focus on: how projects
are published, remixed and credited; moderation and age policies; how manufacturers sponsor content; monetisation; and traffic or community size signals
(with dates and sources).`,
  },
  {
    key: 'ai-hardware',
    title: 'AI-native hardware design and engineering-assistant startups',
    products: `Flux (flux.ai, Copilot, browser PCB, pricing), JITX, Quilter (AI PCB layout), Diode Computers, atopile (code-defined circuits, licence), Cirkit
Designer (AI + simulation), CircuitMind, Celus, Zoo/Text-to-CAD, Arduino's AI Assistant in the Cloud Editor, Wokwi's AI features if any, GitHub Copilot or
ChatGPT/Claude used for Arduino code (evidence of usage), and other 2024-2026 startups in "AI for electronics/embedded/robotics education" (search
funding announcements; verify each with an official page). Focus on: what the AI actually reads (schematic? netlist? code?), whether edits are
reviewable, pricing, funding (amount, date, source), and how close each is to iynk's "AI lab partner grounded in project state".`,
  },
]

const competitorJobs = COMPETITOR_SETS.map(c => ({
  key: `comp:${c.key}`,
  file: `${out}/competitors/${c.key}.md`,
  schema: PRODUCT_SCHEMA,
  prompt: `${RULES}

Your category: ${c.title}.
Products to cover (verify each still exists and is current; add credible ones you discover; drop dead ones with a note):
${c.products}

${DOSSIER_FORMAT.replace('${FILE}', `${out}/competitors/${c.key}.md`)}
Return the structured data (file = the path you wrote).`,
}))

const GENERIC_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    summary: { type: 'string' },
    keyFindings: { type: 'array', items: { type: 'string' } },
    sources: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, url: { type: 'string' }, title: { type: 'string' } }, required: ['id', 'url'] } },
    gaps: { type: 'array', items: { type: 'string' }, description: 'what you could not establish and why' },
  },
  required: ['file', 'summary', 'keyFindings', 'sources'],
}

const otherJobs = [
  {
    key: 'bench:hands-on',
    file: `${out}/WORKFLOW_BENCHMARK.md`,
    schema: GENERIC_SCHEMA,
    prompt: `${RULES}

Task: HANDS-ON WORKFLOW BENCHMARK. Actually perform a fixed set of tasks in the products that allow free, no-account use, with Playwright from the iynk
repo (.mjs under ${scratch}/research/bench/: import { createRequire } from "node:module"; const { chromium } = createRequire("${repo}/package.json")("playwright");
use headful=false; take screenshots into scratch and reference them). Products: Wokwi (https://wokwi.com, new Arduino Uno project), Falstad CircuitJS
(https://www.falstad.com/circuit/circuitjs.html), Microsoft MakeCode for micro:bit (https://makecode.microbit.org), and iynk itself on the public site
https://iynk.tech (read-only: do not create rooms, do not use the AI partner, do not use "Build it for real" or anything that calls paid APIs). For
Tinkercad, Arduino Cloud, Proteus, Multisim and others that need an account or install: do NOT sign up; mark the task "not tested (account required)"
and cite documentation for what is claimed instead.
Tasks (the brief's standard set): 1 create a simple LED circuit; 2 write and execute controller code; 3 add a sensor and inspect its response; 4
intentionally create a wiring failure (LED without resistor, reversed polarity, short) and see what the tool shows; 5 create a custom component; 6 save,
export and share a project; 7 add a collaborator; 8 debug an advanced project (breakpoints, logic analyser, variable view); 9 move from simulation to
physical implementation (export firmware/BOM/wiring).
For each product x task: supported? (yes / partial / no / not tested), time taken (wall-clock of your scripted run plus an ESTIMATED human time),
steps/clicks, where a user gets stuck, what access or payment is required, and evidence (screenshot path or doc URL). Write ${out}/WORKFLOW_BENCHMARK.md
with a product x task matrix, per-product notes, and a section "What this means for iynk" (especially tasks 1, 4, 5, 9 where iynk's positioning is
decided). Be honest about the limits of scripted testing (selectors, timing).`,
  },
  {
    key: 'users:segments',
    file: `${out}/USER_SEGMENTS.md`,
    schema: GENERIC_SCHEMA,
    prompt: `${RULES}

Task: USER SEGMENTS (desk research; no interviews have happened, so never present findings as interview results). Write ${out}/USER_SEGMENTS.md.
Segments: 1 high-school students learning electronics; 2 university engineering students; 3 CS students entering embedded; 4 self-taught makers; 5
robotics clubs (FIRST, VEX, university clubs); 6 drone hobbyists (FPV); 7 hackathon builders; 8 educators and schools (K-12 CTE/STEM teachers); 9
universities and maker labs (instructors, lab managers); 10 advanced engineers prototyping. Also consider a segment the founders did not list if evidence
points to it (e.g. learners in low-resource regions, coding bootcamps, homeschoolers, Indian engineering colleges given the Hindi UI).
For each segment, with sources: what they try to accomplish; current tools (cite usage surveys, e.g. Stack Overflow survey embedded numbers, Arduino
user stats, Reddit communities sizes with dates); most expensive frustrations (with quotes from public forums, linked, marked as anecdotal); why existing
tools fall short; frequency of the problem; whether accuracy or ease matters more; likely repeat use; switching triggers; who decides purchases; what
would make them recommend iynk; population size estimates with sources (e.g. number of US/India engineering undergrads, CTE enrolments, FIRST team
counts, FPV community sizes); ability and willingness to pay (evidence: what they pay today for kits, sims, courses).
End with a segment scoring table (pain severity, frequency, iynk fit today, iynk fit after an original-project builder, reachability, ability to pay,
distribution power, evidence strength) with the scoring rule stated, and a short provisional ranking labelled HYPOTHESIS. Do not pick the beachhead; the
strategy phase does that.`,
  },
  {
    key: 'market:sizing',
    file: `${out}/MARKET_ANALYSIS.md`,
    schema: GENERIC_SCHEMA,
    prompt: `${RULES}

Task: MARKET ANALYSIS. Write ${out}/MARKET_ANALYSIS.md. Do not multiply arbitrary populations by arbitrary prices. Build TAM, SAM and SOM bottom-up from
sourced counts of PAYING units (schools, districts, university departments/courses, makerspaces, individual subscribers) and sourced price points that
comparable products actually charge (Tinkercad free; Wokwi plans; Arduino Cloud for Schools; MakeCode free; Proteus licences; LabsLand; The Construct;
eCalc; Onshape EDU free...). Separate individual users from paying institutions. Cover US first (data is best), then India, EU and a "rest of world"
note, and explain the gap between users (large) and payers (small).
Required content: market definitions; sourced unit counts (e.g. NCES counts of public high schools and CTE programmes, ABET-accredited EE/CE/ME
programmes, AICTE engineering institutions in India, makerspace counts, FIRST/VEX team counts) with dates; comparable pricing table; TAM/SAM/SOM with each
assumption in a table and labelled ESTIMATED; a sensitivity table (low/base/high); adjacent signals (edtech spending trends 2024-2026, STEM kit market
reports: cite and mark analyst reports as low-confidence if methodology is opaque; Arduino/Raspberry Pi unit sales disclosures); grant and nonprofit
funding sources for accessible STEM (NSF, foundations, CSR programmes) with links; and "What would change these numbers" (the tests to run).`,
  },
  {
    key: 'tech:sim',
    file: `${out}/tech/simulation-options.md`,
    schema: GENERIC_SCHEMA,
    prompt: `${RULES}

Task: TECHNICAL RESEARCH, simulation engines we could adopt, embed or learn from. Write ${out}/tech/simulation-options.md.
Cover, with licence, maturity (last release, stars, maintainers), browser/WASM availability, performance figures from sources, and fit for iynk:
- MCU emulation: avr8js (Wokwi, MIT) and how Wokwi compiles Arduino sketches (server-side arduino-cli? hex upload?), rp2040js, simavr, QEMU (and Espressif's
  QEMU fork for ESP32/ESP32-S3/C3; any WASM build), Renode (Antmicro), Unicorn/WASM, STM32 emulation options, nRF52 for micro:bit (the micro:bit
  simulator the Python Editor uses), MicroPython's official WebAssembly port and PyScript/Pyodide (CPython) for "Python on a Pi", and arduino-cli / clang
  to WASM / browser compilation feasibility (e.g. compiling avr-gcc to WASM, Wokwi's build servers).
- Circuit simulation: ngspice (shared library, KLU, its WASM builds such as EEcircuit/eecircuit-engine), Falstad CircuitJS solver (MNA, licence GPL-2.0?
  verify), Xyce, Qucs-S, SPICE OPUS; numerical methods (MNA, Newton-Raphson, companion models for C/L, trapezoidal vs Gear integration) with a short
  explanation of what each buys and costs in a browser.
- HDL: Verilator, Icarus Verilog, Yosys/nextpnr via YoWASP (WASM), digitaljs, CIRCT/Arcilator, EDA Playground/Makerchip (browser HDL) for Basys 3 /
  DE10-Lite style teaching.
- Mixed-signal co-simulation: how Proteus, SimulIDE and Wokwi couple MCU and analog; event-driven vs time-stepped; deterministic scheduling patterns.
For every option: what it would give iynk over its own TypeScript interpreters/solver, integration cost (ESTIMATED), bundle size, licence compatibility
with a proprietary or open-core product (flag GPL/AGPL implications for linking/embedding/distribution in a web app), and risks. End with a ranked
shortlist per domain labelled HYPOTHESIS, and the research spikes worth running (falsifiable question + exit condition).`,
  },
  {
    key: 'tech:platform',
    file: `${out}/tech/platform-options.md`,
    schema: GENERIC_SCHEMA,
    prompt: `${RULES}

Task: TECHNICAL RESEARCH, platform building blocks. Write ${out}/tech/platform-options.md. For each: licence, maturity, browser support, performance figures
from sources, cost, and fit for an original-project hardware editor built on Next.js 16 / React 19 / TypeScript.
- Editor canvas: SVG vs Canvas 2D vs WebGL/WebGPU for node-and-wire editors with 50-500 parts; libraries (React Flow/xyflow, tldraw SDK (licence!),
  Konva, PixiJS, Fabric, JointJS (licence), maxGraph, GoJS (licence), Excalidraw); how Wokwi, Tinkercad, Flux and EasyEDA render; published perf numbers.
- Collaboration: Yjs, Automerge 2/3, Loro, Liveblocks, PartyKit/Cloudflare Durable Objects, Electric/Zero/Replicache; when a server-ordered op log beats a
  CRDT; offline/local-first patterns; persistence with Postgres.
- Physics and robotics: Rapier (WASM), MuJoCo (official WASM), Jolt, Ammo/Bullet, cannon-es; URDF loaders (urdf-loader), ROS 2 in the browser (rosbridge,
  Foxglove WebSocket, roslibjs), kinematics libraries.
- Flight: JSBSim (WASM?), PX4/ArduPilot SITL in a container streamed to a browser, Betaflight SITL, simple 6-DoF multirotor models used in research
  (cite papers), and the cost of running SITL server-side per session.
- Sandboxing untrusted user extensions: WASM component model / wasmtime, Extism, QuickJS-in-WASM, SES/Hardened JS (Endo), iframes with sandbox +
  postMessage, Web Workers limits; server-side compile isolation (gVisor, Firecracker, Docker rootless, nsjail) with cost per compile.
- Infra and cost: Vercel pricing for functions/bandwidth (2026), Cloudflare (Workers/Durable Objects/R2), Fly.io, Railway, Supabase/Neon/Tiger Data
  Postgres pricing, object storage pricing; WebSocket hosting options.
- AI economics: current list prices (USD per million tokens, as of ${today}, with URLs) for Claude (Fable/Opus/Sonnet/Haiku 5.x), OpenAI, Google Gemini
  (incl. 3.5 Flash), Meta Muse Spark API if public, open-weight models served via Groq/Together/Fireworks; prompt caching discounts; a worked ESTIMATED
  cost per tutoring session (state tokens per turn and turns per session).
End with a ranked recommendation per block labelled HYPOTHESIS and the spikes worth running (question + exit condition).`,
  },
  {
    key: 'tech:compliance',
    file: `${out}/tech/compliance-safety.md`,
    schema: GENERIC_SCHEMA,
    prompt: `${RULES}

Task: COMPLIANCE, SAFETY AND ACCESSIBILITY RESEARCH (not legal advice; say so). Write ${out}/tech/compliance-safety.md.
Cover with primary sources (regulator sites, statute text): COPPA including the FTC's 2025 amended rule and its compliance dates; FERPA (school official
exception, directory information) and state student-privacy laws (California SOPIPA, the Student Data Privacy Consortium's NDPA); GDPR Art. 8 and the UK
Age Appropriate Design Code; India's DPDP Act 2023 and Rules (children's data, verifiable parental consent); Brazil LGPD children; the EU AI Act
obligations relevant to an educational AI tutor (is education a high-risk use? which provisions apply to a deployer/provider and when); the EU Accessibility
Act (June 2025) and ADA Title II web rule (2024; compliance dates) and WCAG 2.2 AA; what school procurement asks (SOC 2, 1EdTech/LTI 1.3 certification,
Clever/ClassLink rostering, data processing agreements, accessibility VPAT/ACR).
Physical-safety and dual-use: LiPo battery hazards and safe-handling guidance (cite a fire service or university EHS page), propeller injury data, mains
voltage boundaries for a hobby electronics product, FAA recreational flyer rules (TRUST, Remote ID) and EASA open category basics, and export-control or
dual-use concerns for drone autonomy content (EAR/ITAR high level, any platform policies by peers). Also crypto: the regulatory posture of on-chain
credentials for minors and wallets for under-18s.
For each item: what it requires, when it applies to iynk (which features trigger it: accounts, chat, voice, AI, public profiles, location in Build
Buddies, leaderboards, wallets), the minimum viable compliance step, and the cost/effort ESTIMATED. End with a "release blockers before marketing to
schools or under-13s" list.`,
  },
]

const allJobs = [...competitorJobs, ...otherJobs]

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    checked: { type: 'number' },
    wrong: { type: 'number' },
    corrections: { type: 'array', items: { type: 'string' } },
    unreachable: { type: 'array', items: { type: 'string' } },
  },
  required: ['file', 'checked', 'wrong', 'corrections'],
}

phase('Research')
log(`${allJobs.length} research agents; each dossier is fact-checked as soon as it lands`)

const results = await pipeline(
  allJobs,
  job => sonnet(job.prompt, { label: job.key, phase: 'Research', schema: job.schema }),
  (res, job) => sonnet(`${RULES}

You are the fact-checker for ${job.file} (written by another researcher a moment ago). Assume it contains errors: stale prices, features that were
renamed or removed, capabilities inferred from marketing, invented numbers, dead links, wrong licences. Method: read the whole file; pick the 15 claims that
would most change a decision (prices, free tiers, "no account needed", simulation fidelity, collaboration, AI, licences, funding amounts, population
counts, regulatory dates); re-open each cited source with WebFetch (or search for a better one) and check it says exactly that, as of ${today}. Fix the file
in place: correct wrong claims, downgrade labels that the source does not support, replace dead links, add a missing source, and mark claims you cannot
confirm as UNKNOWN. Do not delete true but unflattering-to-iynk findings. Append "## Fact-check log (${today})" listing every claim checked, the verdict
(confirmed / corrected / unconfirmed) and the source. Return the counts.`, { label: `check:${job.key}`, phase: 'Fact-check', schema: VERIFY_SCHEMA })
    .then(check => ({ job: job.key, file: job.file, research: res, check })),
)

const done = results.filter(Boolean)
log(`Research: ${done.length}/${allJobs.length} dossiers researched and fact-checked`)

phase('Synthesize')
const fileList = done.map(d => `- ${d.job}: ${d.file} (checked ${d.check?.checked ?? '?'}, corrected ${d.check?.wrong ?? '?'})`).join('\n')
const SYNTH = `${RULES}

You are a synthesis agent. The dossiers below exist and have been fact-checked; read them in full (they are the evidence) and keep their source labels.
Do not add claims that are not in a dossier unless you research and cite them yourself.
${fileList}`

const synth = await parallel([
  () => sonnet(`${SYNTH}

Write ${out}/COMPETITOR_LANDSCAPE.md: the founder-readable landscape. Sections: 1 Executive view (one page: who matters, who iynk actually competes with
for each audience, where the field is crowded, where it is empty). 2 Category maps (one table per category: product, audience, price, what it is best at,
threat level). 3 The nine standard workflow tasks: what WORKFLOW_BENCHMARK.md found, product by product, with TESTED vs documented kept separate.
4 Deep comparisons with the four most important rivals for iynk (very likely Wokwi, Tinkercad Circuits, MakeCode, and one more the evidence picks):
what each does better than iynk today, what iynk does that they don't (cite iynk's audit if ${repo}/docs/MASTER_PLAN/01_AUDIT/FEATURE_VERIFICATION.md
exists, otherwise mark iynk capabilities DOCUMENTED from ${repo}/README.md), how fast they could copy iynk's differentiators. 5 Open-source we could
build on (licence-checked table). 6 Signals of unmet need (with links). 7 Threats and watch list. Links to every dossier.`,
    { label: 'synth:landscape', phase: 'Synthesize', schema: GENERIC_SCHEMA }),

  () => sonnet(`${SYNTH}

Write ${out}/USER_RESEARCH_PLAN.md: an executable plan to validate demand before and during the build. Use ${out}/USER_SEGMENTS.md and the landscape
dossiers. Contents: research questions ranked by how much they would change the roadmap (e.g. do learners want to build original projects or follow
guided lessons? will teachers adopt a browser lab without accounts? does the failure/fault teaching improve debugging skill? does multilingual matter?
will anyone pay, and who?); for each method (problem interviews, observational usability tests on the current product, a fake-door / smoke test on
iynk.tech for "New Project", a prototype test of the original-project builder, a teacher pilot, a willingness-to-pay study using Van Westendorp or
Gabor-Granger, a learning-outcome pre/post test): recruiting criteria and channels (named communities, with links), sample size with rationale (cite
Nielsen/Guest et al. saturation literature for qualitative, power calculation for quantitative), the full interview guide (questions written out, non-
leading, past-behaviour based, Mom Test style), observation tasks, surveys (questions written out), consent and minors (no under-13 participants without
parental consent; school research approvals), bias controls, artefacts to produce, decision thresholds that would change the roadmap (written as
"if X then Y"), timeline (in weeks, ESTIMATED) and budget (ESTIMATED: incentives, tools). No invented results.`,
    { label: 'synth:research-plan', phase: 'Synthesize', schema: GENERIC_SCHEMA }),

  () => sonnet(`${SYNTH}

Write ${out}/TECHNICAL_RESEARCH.md: the decision-oriented summary of ${out}/tech/simulation-options.md, ${out}/tech/platform-options.md and
${out}/tech/compliance-safety.md (link them; do not duplicate their detail). For each decision the architecture phase must make (MCU execution model per
board family; circuit solver strategy; HDL path; editor rendering; collaboration model; physics/robotics engine; flight model; extension sandbox; server
compile isolation; hosting; AI provider strategy and cost; compliance gates), give: options, evidence summary with source refs, licence constraints,
ESTIMATED cost and effort, a provisional recommendation labelled HYPOTHESIS, and the spike that would confirm it (question, method, exit condition). Then
the list of research spikes in priority order (these become docs/MASTER_PLAN/08_RESEARCH_SPIKES entries).`,
    { label: 'synth:technical', phase: 'Synthesize', schema: GENERIC_SCHEMA }),

  () => sonnet(`${SYNTH}

Write ${out}/SOURCE_REGISTER.md: one consolidated, de-duplicated register of every source cited in ${out}/**/*.md (read each file's Sources list and its
fact-check log). Columns: global id (R001...), URL, title, publisher, type (official docs / pricing / repo / paper / regulator / news / community),
accessed date, what it supports (short), cited in (files), status after fact-check (confirmed / corrected / unconfirmed / unreachable). Then a section
"Known limitations of this research" (paywalls, account-gated products not tested, regional data gaps, dates). Do not change the dossiers' numbering; the
register is an index across them.`,
    { label: 'synth:sources', phase: 'Synthesize', schema: GENERIC_SCHEMA }),
])

return {
  dossiers: done.map(d => ({ job: d.job, file: d.file, takeaways: d.research?.keyTakeaways ?? d.research?.keyFindings ?? [], check: d.check })),
  missing: allJobs.filter(j => !done.find(d => d.job === j.key)).map(j => j.key),
  synth,
}
