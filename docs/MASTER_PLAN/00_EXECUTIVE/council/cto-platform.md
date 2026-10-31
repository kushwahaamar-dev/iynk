# Council memo: CTO and platform lens

Seat: CTO, principal frontend engineer, principal backend engineer, site reliability engineer, developer-ecosystem architect.
Date: 2026-10-27. Audited commit `bb546d6` (source unchanged since; HEAD is docs only).
Scope: is the code a foundation or a prototype to mine; can an original-project builder sit on it; what breaks at 10x and 100x; can a component SDK come first.

Labels: VERIFIED (the audit inspected or reproduced it), DOCUMENTED (a project doc says so), EXTERNAL (research file and [S#]), ESTIMATED (assumptions shown), HYPOTHESIS (test named), UNKNOWN. No confidence percentages. Effort numbers are my estimates, not measurements.

Paths below are relative to `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/` unless they start with `src/`, `figures/` or `server/` (repo code, as cited by the audit).

---

## 1. Bottom line

1. The codebase is a prototype to mine, not a foundation to extend. It is a very good lesson player: a catalogue of 38 authored items, each welded to a hand-built figure page by free strings. It is not yet a tool in which a stranger can make a thing. The audit's own walk could not add a part, move a wire, start a blank project, or keep edited code across a reload (VERIFIED, `01_AUDIT/runs/BROWSER_WALK.md` steps 14, 15).
2. Seven pieces are worth keeping as they are. They are pure, tested and already generic: the Arduino/Python/Verilog interpreters (189 tests), the `Check`/`WorldModel`/`CodeTemplate`/`FailureMode`/`BuildStep` types, the flight sim with replay (96 tests), the figure bridge protocol (`{source:'iynk', v:1}`), the payload-agnostic relay core, the zod-on-every-route server pattern with token-hash ownership, and the i18n scaffolding. (VERIFIED, `01_AUDIT/TECHNICAL_DEBT.md` A1, A2, A6, A7, A11.)
3. Three things must be built new, and they are one core, not three features: a canonical project document, a netlist derived from that document (not from breadboard hole names), and a thin simulation orchestrator that joins netlist, solver and interpreter. The circuit solver must be replaced by a pure one. The 80 hand-built figure pages stay as a catalogue and are not the builder's canvas. (VERIFIED, A3, A4, A5.)
4. Minimum original-project builder, team of 2 to 3 new to the codebase: best 22, expected 37, adverse 61 engineer-weeks, which is roughly 10, 20 and 43 calendar weeks (section 7 shows the build-up and assumptions). ESTIMATED.
5. A component SDK before the core is the wrong order. The part descriptor is the seam of the core and should be designed as an internal format first, proved by converting the 29 existing parts, and published only after it has survived that. Public SDK is deferred with a trigger (section 9).
6. At any scale the first thing to break is money and abuse, not compute: spend counters live in per-instance memory, search quota is already exhausted, and the UI spends it by itself on mount. The second is the single 1 vCPU relay. The database and Vercel static pages are not the first constraint. (Section 6.)
7. I would challenge the vision on one engineering point. "Imagine to build for real" has a hard step in it: the simulator accepts and rejects different code than a real compiler does, in both directions (unknown `#include` runs silently, templates are refused). Until there is a real compile path, "build for real" promises more than the engine can honour. Treat that as a scoped claim, not a headline.

---

## 2. Evidence reviewed

Read in full or in the sections named. Everything else was used only through these files' citations.

| File | What I took from it |
|---|---|
| `01_AUDIT/TECHNICAL_DEBT.md` | Part A (13 architecture questions), Part B register (B1 to B11), Part C (debt not to pay), Part D (five structural changes), refresh and review logs |
| `01_AUDIT/inventory/figure-engine.md` | Solver contract, refactoring list, recommendation, open questions |
| `01_AUDIT/inventory/interp.md` | Device model closure, language subset, memory failures, reuse list |
| `01_AUDIT/inventory/realtime.md` | Relay limits, load test, 1 vCPU estimate, memory ceiling, security notes |
| `01_AUDIT/inventory/server-data.md` | Tables, limiter, identity, deploy and migration state |
| `01_AUDIT/PERFORMANCE_BASELINE.md` | Bundle sizes, idle CPU, solver cost, interpreter cost |
| `01_AUDIT/SECURITY_BASELINE.md` | Threat rows C1 to C8, R3, R4, X4, S3, P3; what was not reproduced |
| `01_AUDIT/TEST_COVERAGE.md` | Oracle taxonomy, figure code unmeasured, no CI |
| `01_AUDIT/REVIEW_GAPS.md` | Label conflicts and known limits of the audit |
| `01_AUDIT/inventory/content-schema.md`, `figure-items.md`, `boardlab-robotics-ui.md`, `ai-search-mcp.md`, `flight.md`, `drone-calc-lab.md`, `solana.md` | Only through TECHNICAL_DEBT citations |
| `02_RESEARCH/TECHNICAL_RESEARCH.md` | D1 to D12, findings F1 to F11, spikes RS-01 to RS-20, ESTIMATED roll-up |
| `02_RESEARCH/tech/simulation-options.md` | avr8js, rp2040js, ngspice-WASM, licences, speed numbers |
| `02_RESEARCH/WORKFLOW_BENCHMARK.md` | Wokwi `diagram.json`, Falstad text format, fault-warning comparison, custom component row |
| `docs/handoff/CONTEXT.md` | Skimmed for founder intent; it holds hackathon-era requests and workflow history, little on the post-hackathon vision |

Not read: `COMPETITOR_*`, `MARKET_ANALYSIS.md`, `USER_*` (other seats). I did not open any earlier positioning draft. I did not run code, touch production, or contact anyone.

Limits that shape my conclusions:
- No production numbers exist in the evidence (traffic, rooms, DB size, Vercel plan). UNKNOWN. My 10x and 100x analysis is therefore by mechanism and ceiling, not by measured load. (`01_AUDIT/inventory/server-data.md` open questions; `SECURITY_BASELINE.md` "not inspected".)
- Every benchmark is one Apple Silicon laptop in Chromium. No phone, Chromebook, Safari or Firefox. (TECHNICAL_DEBT "Gaps in my inputs".)
- The relay was never run over a real network by any audit run. (TECHNICAL_DEBT A7.)

---

## 3. Verdict by subsystem: preserve, extend, replace

Evidence in each row is from the audit; the verdict is mine.

| Subsystem | Verdict | Why (evidence) | Label |
|---|---|---|---|
| Interpreters (Arduino C++, MicroPython, Verilog subsets), about 8,800 lines | Preserve, then wrap | Pure TypeScript, no DOM or network, plain-data entry points `createRun`, `runHeadless`, `CheckJob`; 189 tests. Per-frame op budget keeps the page responsive (`src/lib/interp/run.ts:244-256`). But: closed 11-kind device catalogue (`schema.ts:304-315`), SPI stub returns 0 silently (`libs.ts:787`), unknown `#include` runs with no error, three programs abort Node with out-of-memory, fixed cost per statement rather than cycles. | VERIFIED (interp inventory, BROWSER_WALK step 4, 5) |
| Content schema, generic types (`Check`, `WorldModel`, `CodeTemplate`, `FailureMode`, `BuildStep`) | Preserve and move to a neutral `core` module | Structurally generic; Board Lab already runs them on 12 profiles. | VERIFIED (A1) |
| Content schema, lab shapes, id unions, generated registry (`BoardContent`, `RoboticsContent`, `DroneContent`, `ids.ts`, `index.generated.ts`) | Replace for user content; keep for the catalogue | Closed `as const` id arrays plus a duplicate `BoardId` union; static import map of 38 items; TS-authored under Node type-stripping; no `schemaVersion`. | VERIFIED (A1, A8, B1-03 to B1-06) |
| Circuit solver (`figures/engine/bench-solve.js`, 431 lines) | Replace with a pure, data-driven module; keep the old one frozen for catalogue figures | DC only, 12 element types, no C, L, MOSFET, PNP, op-amp, regulator, Zener; reads `B.md`, `B.st`, calls `B.say`, `B.sfx`; connectivity from breadboard hole names; a typo yields a null end and the wire is silently skipped (`bench-solve.js:41-42,55`). Its speed is not the issue (0.038 ms median on the largest of 79 circuits). Its reuse and testability are. | VERIFIED (A2, A5; PERFORMANCE_BASELINE section 4) |
| Figure engine and 80 built figure pages (`figures/`, `public/figures/`) | Preserve as the catalogue and as a visual asset library; do not use as the builder canvas | One fixed page per object; circuits compiled in under lesson keys; host cannot send parts or wires; no iframe `sandbox`; `art.innerHTML` per frame costs 48 to 65 percent of a core idle on a fast laptop and saturates at 4x throttle (about 24 to 31 fps). | VERIFIED / MEASURED (A3, B9-13; PERFORMANCE_BASELINE section 6) |
| Figure bridge protocol | Extend | Versioned, origin-checked, whitelisted. Best-defined API in the repo. | VERIFIED (A6) |
| Lab stores (`LabStore`: Board reducer + `LessonRunner`, Robotics reducer with effects) | Reuse the pattern, replace the code for projects | Lesson-shaped; effect handlers live inside a React component (`BenchWorkspace.tsx:~128-165`). A project store needs revision-safe actions (D5). | VERIFIED (A2, A7) |
| Flight sim, drone calculator, 13 craft | Preserve, park | Pure, deterministic, 96 tests for the sim; correct for catalogue crafts. Not on the builder's path. Legal provenance of drone constants and golden fixtures is undecided (B3-04, B1-14). | VERIFIED / DOCUMENTED |
| Relay (`server/realtime`) | Extend later | Payload-agnostic, gapless `seq`, 39 tests, 0 gaps at 8 peers. Blocked by `LABS` enum, no auth, memory-only, single process. | VERIFIED (A7) |
| Server pattern (zod routes, 502/503 contract, token-hash ownership, coalesced inserts, `max: 3` connections with `prepare: false`) | Extend | Fits a `projects` table without a rewrite. | VERIFIED (A11; `src/lib/server/db/client.ts`) |
| Rate limiter, AI budget, SerpApi counter, translation cache | Replace | Per-instance `Map`, cap 10,000 keys, N instances give N times the limit, resets on cold start. | VERIFIED (B6-01, `ratelimit.ts:15`) |
| AI bench context | Replace | Guesses key names; adapters return `parts: []`, `nets: []`. Cannot see a user's circuit. | VERIFIED (B6-05) |
| Solana program and wallet stack | Detach | 467 KB raw (139 KB gzip) in the first load of 7 route types though optional; forgeable credentials; one hot key. | VERIFIED (B8-01, B8-03, B8-07) |
| Tests | Preserve as a regression corpus, do not mistake for fidelity | 1,677 declared tests; 15 transcribe a datasheet fact; none compares to hardware, SPICE or a vendor simulator. About 22,100 lines of figure code have 0 measured coverage. | VERIFIED (TEST_COVERAGE section 0) |

Plain answer to "foundation or prototype": the foundation is about six pure modules and a clean server pattern. Everything that makes it a product for makers (a model users can write, a renderer for it, a place to keep it) does not exist. Building the builder on the current shapes would mean editing `ids.ts`, `index.generated.ts`, `nav.ts`, `LABS` and the figure files for every new thing, which is what a user-created project cannot do.

---

## 4. Weaknesses

Each has evidence and a label.

| # | Weakness | Evidence | Label |
|---|---|---|---|
| W1 | Content is welded to figures by free strings (part ids, fault strings, power keys, circuit keys equal lesson ids). Tests are the only guard and some scrape figure source with indentation-sensitive regex. | `TECHNICAL_DEBT.md` A3, B1-01, B1-02; `uno-r3.test.ts:17`, `drones/_checks.ts:24-45` | VERIFIED |
| W2 | No netlist independent of the drawing. Connectivity is a by-product of breadboard hole names. The interpreter has no concept of wiring. Result seen in a browser: set `LED_PIN` to 12 and the pin readout says `D12: HIGH` while the figure LED stays dark. | A5; BROWSER_WALK step 15 | VERIFIED |
| W3 | Solver coverage is narrow and its failure mode is confident-wrong. No capacitor, inductor, transistor beyond the NPN cases, regulator or op-amp. A user circuit with a debounce capacitor or a motor driver gets an answer built from the wrong model. | `bench-solve.js:76-107`; figure-engine inventory | VERIFIED |
| W4 | The interpreter's subset fails silently in places and loudly in others. How many real beginner sketches fall outside it is not known. | A4; `run.ts:176`, `CodePanel.tsx:79` hide the unsupported reason; B2-28, B2-29 | VERIFIED (behaviour), UNKNOWN (share of real sketches) |
| W5 | Timing is statement-counted, not cycle-counted. Anything that depends on interrupts, `millis()` races or tight protocols will differ from hardware, and the product cannot say by how much. | A4, interp inventory | VERIFIED |
| W6 | No persistence and no identity. Learner code is lost on reload. No project, user or document table. Identity is a random per-device UUID. | A11; BROWSER_WALK step 14; migrations hold 1, 0, 1 `CREATE TABLE` | VERIFIED |
| W7 | Rooms are bound to three labs and one catalogue item, with no auth (6-character code, about 29.7 bits), memory-only state, whole-text baton edits, divergence undetected. | A7; `protocol.js:7`; `relay.js:235-241` | VERIFIED in code; takeover repro script exists but was not run (REVIEW_GAPS #3, #4) |
| W8 | "Passes the tests" does not mean "matches hardware". The strongest-looking tests (342 drone goldens) compare to the original third-party site's own output. | TEST_COVERAGE section 0 items 3, 4; B1-14 | VERIFIED |
| W9 | Delivery is a laptop. No CI, no hooks, no recorded Vercel settings, production deploy is `vercel deploy --prod` from one machine. The unit gate failed 13 tests in 9 files under outside load (timing only) and passed at repo config when run alone. Relay and Anchor tests sit outside `npm test`. | B10-01, B10-02, TEST_COVERAGE items 5, 6 | VERIFIED |
| W10 | Spend and abuse control is not real. 23 of 23 API routes unauthenticated; limiter and AI budget per instance; budget counts HTTP requests, not model calls (up to 16 calls per question); SerpApi plan shows 0 of 250; opening the dock fires price and video searches with no user action; a 429 `quota_exhausted` is shown as "wait a minute". | B6-01, B6-02, B6-03, B6-10, B6-16, B6-17 | VERIFIED |
| W11 | Provider terms may bar the current AI fallback for a product children use (Gemini requires 18+ and prohibits clients "likely to be accessed by anyone under 18"). Conclusion is a HYPOTHESIS until Google or counsel confirms. | `02_RESEARCH/TECHNICAL_RESEARCH.md` F2, RS-02 | EXTERNAL [S86], HYPOTHESIS |
| W12 | Weight on the client. Lesson page first load is 2.2 MB raw (701 KB gzip); the landing page fetches 2.29 MB raw in 23 scripts within 3 s because four large chunks arrive about 255 ms after load. Cause not read from source. Wallet stack is in 7 route types. Figure pages burn CPU idle. This is the page a low-end device and a metered connection meet first, which cuts against the mission. | B9-14, B8-07, B9-13; PERFORMANCE_BASELINE B1 | MEASURED, cause HYPOTHESIS |
| W13 | Figure pages are same-origin and unsandboxed. Any user-authored figure or part drawing would run with the app's origin. | `FigureFrame.tsx:351-357`; figure-engine refactor item 8 | VERIFIED |
| W14 | Breadth exceeds maintenance capacity. 827 prerendered pages, 38 catalogue modules (23,378 lines), 190,627 lines of i18n JSON in 6 languages with quality unreviewed, 12 boards, 13 drones, 13 robotics benches, Solana, MCP, voice. Each new builder string costs six translations. The audit lists "who maintains the engine now that the hackathon agent roles are gone" as open. | REPOSITORY_INVENTORY 1.1; B9-10; figure-engine open question 1 | VERIFIED (sizes), UNKNOWN (maintainer knowledge) |
| W15 | Legal and provenance gates are open: no LICENSE, lessons and fixtures derived from third-party sites, first commit is a 900-file, 310k-line import. A durable company cannot build a commercial platform on unresolved provenance. | B11-01, B11-02, B3-04 | VERIFIED / DOCUMENTED; legal conclusion is not mine to give |

Counter-weight, so the list is not one-sided: the audit found good bones in places. The `{done, quiz, best, settings}` store is versioned; the relay container is hardened (read-only, `cap_drop: ALL`); every server route uses zod; no key-shaped strings were found in 797 commits (SECURITY_BASELINE P3); the solver cost is trivial. The problems are model, persistence and operations, not craft.

---

## 5. Opportunities

| # | Opportunity | Why it is real | Label |
|---|---|---|---|
| O1 | Fault explanation as the product's edge. Wokwi showed no warning for LED-without-resistor, reversed LED, or 5 V to GND. iynk names 16 faults and explains them. Falstad-class tools showed no message either. Caveat: scripted entry, one run, and Velxio did warn. | `WORKFLOW_BENCHMARK.md` Task 4; TECHNICAL_RESEARCH F11 | TESTED once (external research), HYPOTHESIS that users value it |
| O2 | A plain-text project format makes AI editing, MCP, sharing, export and a regression corpus nearly free. Wokwi stores `diagram.json`; Falstad exports text. iynk's 38 items can be converted by `gen-content-index.mjs --emit` (`:156-163`) and become the first valid projects. | WORKFLOW_BENCHMARK Task 1 and 6 notes; TECHNICAL_DEBT D1 | DOCUMENTED + EXTERNAL |
| O3 | Headless, pure cores are agent-friendly. A `Project` JSON in, a netlist and a run trace out, no DOM. That is the shape an MCP tool or an AI proposal needs, and iynk already has 7 MCP tools and an interpreter that runs headless. | A2, A6 | VERIFIED (shape), HYPOTHESIS (value) |
| O4 | Use ngspice-WASM as a test oracle, not a runtime. `eecircuit-engine` ran RC and rectifier in 23 to 34 ms but is 5.7 MB gzip. As a CI and "check my answer" oracle it gives the solver a hardware-adjacent reference without shipping 5.7 MB to every learner. | TECHNICAL_RESEARCH D2 | TESTED (research), recommendation is mine |
| O5 | Pin-to-pin wiring (as Wokwi does) removes breadboard geometry from the MVP. A breadboard becomes just another part whose internal net groups are data, which is also the first test of the part descriptor. | WORKFLOW_BENCHMARK; A5 | HYPOTHESIS, test with 5 first-time-user sessions |
| O6 | Client-side persistence of code is a day or two and the cheapest visible win in the whole register (B4-01). | A11 | VERIFIED |
| O7 | Fork-ready emulators exist under MIT for later: avr8js (v0.21.1, MIT, runs in browser, 3.3x to 6.5x real time on an M4 Pro in a simple loop) and rp2040js (MIT). Both have one dominant maintainer (bus factor), and MIT allows a fork. | simulation-options 2.1, 2.2; F6 | EXTERNAL + TESTED |
| O8 | The relay core can serve any JSON action stream once `LABS` becomes an opaque namespace. That is an M-size change, not a rewrite. | A7 | VERIFIED |

---

## 6. Operations: what breaks first at 10x and 100x

Baseline traffic is UNKNOWN. I cannot say what 10x means in users. So this section ranks failure mechanisms and names the ceiling for each; the baseline is the first open question (section 10).

Deployment as documented: Vercel for the app (827 prerendered pages and 23 API routes), one Vultr 1 vCPU VM running the relay in Docker behind Caddy, Tiger Data (Postgres + TimescaleDB) for telemetry, leaderboard and buddy pool. Whether production is on Vercel Hobby or Pro, whether the DB is connected, and whether migrations ever ran in production are UNKNOWN (`server-data.md` open questions). The research says Hobby is non-commercial (F3, [S30]).

| Rank | Component | What breaks | Ceiling or mechanism | At 10x | At 100x | Label |
|---|---|---|---|---|---|---|
| 1 | AI and search spend | Cost and quota, not capacity. Budgets are per-instance `Map`s; total spend is instances times limit; no server cost ledger (`done.usage` goes to the browser and is dropped); SerpApi is already at 0 of 250; the dock spends searches on mount. | `ratelimit.ts:15`, `serpapi.ts:138,198-201`, `guard.ts:8,22`, B6-16 | Budget exhausted early every month; AI feature degrades for everyone; spend cannot be explained after the fact | A denial-of-wallet event is likely: no identity (23 of 23 routes open) and `x-forwarded-for` is trusted first | VERIFIED mechanism; ESTIMATED consequence |
| 2 | Realtime relay | One Node process on 1 vCPU; 500-room and 2,000-socket caps; per-room log up to about 1 to 1.5 MB, so 500 rooms is 500 to 750 MB against `mem_limit: 512m`; every deploy drops every room; no horizontal scaling because a room lives in one process. Throughput: about 3.8k frames/s outbound measured on a laptop core; a fully active 8-person room with cursors is about 1,120 frames/s, so roughly 3 such rooms use that laptop figure, and the VM core is slower. | `inventory/realtime.md` performance section; `compose.yaml:19` | Likely first compute limit if rooms are used by classes; OOM restart drops all rooms (reachable, HYPOTHESIS) | Needs more than one relay and shared room state or sticky routing; today there is neither | ESTIMATED; load test on the real VM not done |
| 3 | Persistence write path (new) | The builder adds a write-heavy path the current server was never sized for: autosave, JSONB documents, sessions. Rate limiter must be shared first or autosave becomes the abuse vector. | A11, D3 | Fine on Postgres if writes are debounced and bounded in size | Needs per-user quotas, blob store for large projects, backups, restore drill | HYPOTHESIS |
| 4 | Database connections | Serverless functions each open up to 3 connections (`max: 3`, `prepare: false`, so a pooler URL works). Many warm instances times 3 can still exceed a small DB's limit unless a pooler is in front. | `src/lib/server/db/client.ts:14-23` | Probably fine | Plausible connection exhaustion if no pooler | HYPOTHESIS; check Tiger's pooler and `max_connections` |
| 5 | Telemetry table | Not idempotent (no event id); `laps_best_daily` has no retention and no index; leaderboard scans all days. Limits: 1,200 requests/min/IP, 200 events and 60 KB per request. Hypertable has 30-day retention. | B7-02, B7-04, SECURITY_BASELINE C8 | Duplicates inflate counters; leaderboard slows | Leaderboard query is the first slow query; forgeable anyway (B7-03) | VERIFIED code; scale effect ESTIMATED |
| 6 | Vercel static delivery | Mostly fine: pages are prerendered. Cost driver is bandwidth. At 701 KB gzip per lesson first load, 1 TB of Pro's included fast transfer is about 1.4 million cold lesson loads (ESTIMATED: 10^12 / 701,192). Static assets are cached after the first visit. | PERFORMANCE_BASELINE route table; D10 | Fine on Pro | Bundle trimming (wallet stack, late-fetched chunks) becomes a cost lever as well as a UX one | ESTIMATED |
| 7 | Build and deploy | 827 pages generate in 18.5 s; one `.next` directory of 632 to 696 MB. A deploy from one laptop with no staging and no rollback procedure documented. | BUILD_OUTPUT; B10-01 | Human error becomes the dominant outage cause | Same, plus relay deploys (image built on the prod VM, `compose up --build`) take rooms down | VERIFIED |

SRE gaps that exist at 1x and do not scale: no CI (`.github/` absent); no documented alerting, SLOs, error tracking or uptime check (I found none in the audit; absence of evidence, UNKNOWN whether they exist outside the repo); `/metrics` is public through Caddy; migrations are not wired to deploy and the TimescaleDB DDL has never run in a test the audit could execute (B7-05); root SSH with `accept-new` (B5-13); the relay URL is inlined at build time (`config.ts:16-19`), so moving the relay needs a rebuild.

My read: the architecture of Vercel + one VM + one Postgres is fine for the next stage. Do not re-platform. Fix the shared state store (limiter, spend ledger, sessions) and the relay's single-process ceiling only when rooms become a measured load. TECHNICAL_RESEARCH D5/D10 suggests Fly Machines or a Cloudflare Durable Object for rooms; hosted PartyKit shut down on 23 Oct 2026 (F1, [S33][S34]), so do not pick a room platform that is a single startup's product without an exit path.

---

## 7. Can the engines support an original-project builder? Effort

### 7.1 What "minimum original-project builder" means here

Scope (so the estimate has edges):
- Start a blank project on one of the 12 existing boards.
- Place parts from a closed catalogue (the 29 existing parts' electrical models plus generic resistor, LED, button, potentiometer).
- Wire pin to pin on a schematic-style canvas, with a keyboard route for the same actions.
- Write one code file in the supported subset; run it against the wired circuit.
- See electrical faults named in plain words (not only a dead LED).
- Autosave, reload, export and import a project file, share by link.

Out of scope: custom components, simultaneous multi-user editing, AI-edited circuits, real compile or emulation, accounts beyond an anonymous signed session, classes, a public SDK, new boards.

### 7.2 Component-by-component answer

| Existing piece | Can the builder stand on it? | What is needed |
|---|---|---|
| Content schema | Partly. Generic types yes; lab shapes, ids and registry no. | New `Project` document; open string ids behind a registry; `schemaVersion`; runtime zod validation |
| Interpreters | Yes inside the subset, for a single board and the 11 device kinds | A netlist-to-pins adapter; loud failure for unsupported constructs; memory and output caps |
| Circuit solver | No | Pure `solve({nodes, elements, sources})` with structured results and a convergence flag; elements as data |
| Figure engines | No, for the canvas | A small generic SVG renderer driven by the document; catalogue figures remain for lessons |
| Stores | Pattern yes, code no | A `ProjectStore` with revision-stamped actions (undo, autosave, later rooms and AI proposals share it) |

So: a new core is needed. It is three modules, each small, each testable headless:
1. `project`: the canonical document, validation, migration, conversion of the 38 catalogue items.
2. `netlist`: derives nets and pin maps from the document, runs electrical rules checks, owns fault rules.
3. `orchestrator`: owns time. Interpreter pin writes become solver source changes; solver node voltages become ADC and digital reads; one deterministic step loop, no wall-clock reads (matches the provisional pattern in TECHNICAL_RESEARCH D2, HYPOTHESIS until RS-03 and RS-08 run).

Design rules I would hold the team to:
- Connectivity is stored; nets are derived. Layout (x, y, rotation) is stored separately and never read by the solver. This is the single change that removes the whole class of "typo in a hole name silently drops a wire".
- Parts are data: id, version, pins, an electrical model that names a built-in element type or a subcircuit of built-in elements, a symbol, optional device behaviour by reference to a registry entry, and fault rules.
- Units and ids are explicit. A user project carries its own locale-tagged text; the six-language machinery applies to product UI, not to user content.
- Every action on a project is a serialisable operation with a base revision (TECHNICAL_DEBT D5). Do this once; autosave, undo, rooms and AI proposals then share it.

### 7.3 Effort build-up

Unit: engineer-weeks of focused work by a competent engineer who is new to this repo. The audit's S/M/L scale assumes someone who already knows the code, so I add a ramp (below). ESTIMATED. None of these numbers has been validated by a spike; three spikes in section 8 would narrow them.

| Work package | Best | Expected | Adverse | Basis |
|---|---|---|---|---|
| A. Gates: CI, deterministic unit gate, figure-rebuild diff, security headers, kill mount-time searches and fix 429 mapping, shared limiter plus spend ledger | 1 | 2 | 3 | B10-01 to B10-04, B6-16, B6-17, D3; mostly S and M rows |
| B. Project document, validation, versioning, open ids, convert 38 items as corpus, dynamic project route | 3 | 5 | 8 | D1 says L (2 to 6 weeks) |
| C. Netlist derivation and electrical rules, fault rules over the graph | 2 | 4 | 7 | Seeded from the union-find in `bench-solve.js:44-60`; fault-as-rule is L in A8 |
| D. Pure solver for the existing 12 element types, parity with the 79 existing circuits, golden set against ngspice on 20 circuits | 3 | 5 | 8 | Figure-engine inventory says 3 to 5 weeks per engine extraction; RS-08 sets the 20-circuit test |
| E. Parts as data: convert the 29 parts' electrical models, generic symbol fallback | 1 | 2 | 3 | M-size in D1/D2 split |
| F. Editor: SVG canvas, palette, place, drag, wire, delete, undo, inspector, keyboard-only wiring, phone layout, 60 fps at 500 parts | 5 | 8 | 14 | Largest uncertainty. RS-01 has not run; SVG held 60 Hz at 50 to 500 parts on a desktop (F9), phones untested |
| G. Orchestrator and netlist-to-pins adapter, loud unsupported errors, memory and output caps, worker for the run | 3 | 5 | 8 | A4 lists adapter M, caps M, worker M |
| H. Persistence and identity: anonymous signed session, `projects` table, migrations wired to deploy, autosave, export and import, share link | 2 | 3 | 5 | D3 says L to XL for the full set; this is the narrow slice |
| I. Test hardening, accessibility pass (WCAG 2.2 drag and target-size cases), UI strings in six languages, bug fixing | 2 | 3 | 5 | RS-16; translation review is extra elapsed time |
| Total | 22 | 37 | 61 | |

Calendar time for a team of 2 to 3 (ESTIMATED; assumptions: 2 weeks ramp each, 70 to 80 percent of time on this work after reviews and incident load, packages B/C/D/E partly parallel, F starts after RS-01, G cannot finish before C and D):

| Case | Engineer-weeks | Team | Calendar weeks | Assumption that defines it |
|---|---|---|---|---|
| Best | 22 | 3 engineers | about 10 | RS-01, RS-08 pass first time; subset covers most sketches; no legal or provenance stop |
| Expected | 37 | 2.5 engineers on average | about 20 (about 4.5 months) | One spike fails and costs rework in F or D |
| Adverse | 61 | 2 engineers | about 43 (about 10 months) | Editor misses the phone budget and needs a Canvas hybrid; solver needs transient for common projects; interpreter coverage is poor and an emulator path is pulled in |

Not in these numbers: a real compile or emulator path (2 to 3 weeks for a sandboxed compile service plus 1 week elapsed for the arduino-cli licence answer, per TECHNICAL_RESEARCH D9; avr8js integration is a separate RS-03 spike, 3 days to test); classes and moderation (B7-09); a legal review; the translation review of builder strings.

### 7.4 Answers to my part of the red-team set

**Q14. Can the engines support custom components?**

Today: no. A custom component needs three things the engines do not offer: electrical behaviour, device behaviour, and a way to draw it.
- Electrical: the solver has 12 element types fixed in a file. A user part cannot be added without editing the figure source. VERIFIED.
- Device behaviour: the interpreter's world has only the 11 `DeviceModel` kinds in `src/content/schema.ts:304-315`. A new sensor needs a TypeScript class. VERIFIED (interp inventory, "Arbitrary external devices do not").
- Drawing: part art lives inside 80 prebuilt pages and a vendored drawing core. VERIFIED.

What becomes possible, in tiers, each depending on a piece of the new core:

| Tier | What a user can define | Needs | Rough size | Label |
|---|---|---|---|---|
| 0 | A variant of a known part (new resistor value, LED colour, a different pot range) | Project document with part params; no engine change | included in B/E | HYPOTHESIS, low risk |
| 1 | A passive or simple analog macro built from the 12 element types, with named pins and a generic symbol | Pure solver and subcircuits as data | included in D/E, plus about 1 week | HYPOTHESIS |
| 2 | A digital or I2C/SPI device described as data (register map, truth table, timing script) | Device registry replacing the closed `DeviceModel` union (D4); the SPI stub made real | L (2 to 6 weeks) | HYPOTHESIS |
| 3 | A part with code | Opaque-origin iframe on a separate origin plus Worker plus capability API, QuickJS-in-WASM if caps are needed; RS-15 red team must pass | 3 to 5 weeks (research dossier's own low-confidence estimate) plus ongoing security cost | EXTERNAL (TECHNICAL_RESEARCH D8) |

The benchmark found that no free no-login tool makes custom components easy for a beginner; Wokwi has a custom chips API in beta (C, Rust or WASM) and Falstad has subcircuits (menu seen, not run). A data-only part (tiers 0 to 2) beats a code API for the audience that the mission names. Ship tiers 0 and 1 with the builder or just after. Do not ship tier 3 until the trigger in section 9.

**Q15. Which architectural assumptions are most likely to fail?**

Ranked by my judgement of probability times cost. Each has a cheap test.

| # | Assumption | Why it may fail | Cheap test (decision criterion is mine) |
|---|---|---|---|
| 1 | "An interpreted subset is enough for original projects." | Learners paste sketches from tutorials; classes, templates, `#ifdef`, DHT, EEPROM, SoftwareSerial are rejected; SPI is a silent stub; share of real sketches inside the subset is UNKNOWN. Failing means a second execution track (compile + avr8js), a different timing model, and two behaviours to keep consistent. | Collect 50 public beginner Arduino sketches (tutorial repos, not iynk lessons). Run `runHeadless` on each. If more than 20 percent fail, plan the compile and emulator path in the first year. If under 10 percent, extend the subset and the messages. Cost: 2 to 3 days. |
| 2 | "A DC piecewise-linear solver is a fair model of user circuits." | The first original circuit with a capacitor, a transistor switching a motor, a regulator or an op-amp gets a confident wrong answer. | Run RS-08 (20 canonical circuits against ngspice, pass at 18 of 20 within 2 percent). Also make the solver refuse with "not modelled yet" when a circuit contains an element it cannot represent. Cost: 2 days plus 1 week for transient. |
| 3 | "Authored lesson faults generalise to user circuits." | Faults are written per lesson and match figure state. Rules over a free graph produce false alarms or silence; either destroys the trust that the fault panel earns. | Write 12 generic rules (LED without resistor, reversed LED, short rail to ground, floating input, over-current on a pin, unpowered part, and so on). Run on the 79 catalogue circuits plus 20 deliberately broken ones. Acceptable: zero false alarms on the 79, at least 18 of 20 bad ones caught. |
| 4 | "The editor is easy; it is just SVG." | Pointer wiring on phones, hit targets (WCAG 2.5.8), keyboard alternative, undo, and 500 parts at 60 fps are where editors usually cost twice the estimate. | RS-01 on a three-year-old mid-range Android phone and a school Chromebook. Fail trigger from the research: p95 over 33 ms. Cost: 3 to 5 days. |
| 5 | "The relay is reusable for project rooms." | Probably true for transport; the unknowns are auth, memory-only state, 512 KB snapshot cap, and the 1 vCPU ceiling. | Run `server/realtime/test/load.js` against a staging VM (needs the owner's approval; the audit did not touch production) and record CPU. Cost: 1 day. |
| 6 | "Client-side checks and credentials are good enough." | Checks run in the browser; the verifying server named in comments does not exist; 7-event forged log passes the credential fold; leaderboard forgeable. Fine for free play; false for classes, grading or credentials. | Do not claim grading or credentials until server-side replay exists (flight `replay()` is pure and can run on the server). |
| 7 | "Static prerender plus a catalogue scales to user content." | `ensureStatic = "navigation"`, compile-time id lists, prose loaded by path. A user project route is a different model, and so is translating user text. | Prototype one dynamic route with a DB-backed content loader beside the static ones. Cost: 3 days. |
| 8 | "We understand the code well enough to extend it." | 24-hour, agent-built; the audit asked who maintains the engine and got no answer; dense one-line engine style; 22,100 lines of figure code with no measured coverage. | Ask a new engineer (or a fresh Claude session with no handoff) to add one part to the solver following only the repo. Time it. If over 2 days, spend a week on onboarding docs and tests before the core work. |

---

## 8. What to build first (from this lens)

Order follows risk retirement and unlocks, not feature appeal.

| Step | What | Why first | Exit measure |
|---|---|---|---|
| 0 | Gates and the cheap wins, 2 to 3 weeks of one engineer: CI with `tsc`, `eslint`, content check, vitest and a figure-rebuild diff; make the unit gate deterministic; persist learner code in `localStorage`; stop mount-time searches; map `quota_exhausted` correctly; security headers; decide the licence and provenance question with counsel | They are S and M items; every later step ships blind without CI; code persistence is the cheapest visible fix (B4-01). Provenance is a business stop condition. | Green CI on main; reload keeps code; search spend is zero without a click; written provenance note |
| 1 | Spikes in parallel, 2 weeks: RS-01 (editor on phone and Chromebook), RS-08a (solver vs ngspice), the 50-sketch interpreter coverage test (new, my addition), RS-03 (avr8js on three lessons) | They decide the expensive branches before commitment. They are small. | Each spike passes or fails against its stated criterion |
| 2 | Core without UI: `project` document and validation, 38 items converted as corpus, `netlist` with rules, pure `solve`, `orchestrator`, parts as data. Headless tests only. | A canvas on the wrong model is the costliest rework. A headless core is also testable by an AI agent and by CI. The conversion corpus gives free regression. | All 38 items round-trip to valid projects; the 79 circuits solve within tolerance of the old solver; 20 golden circuits within 2 percent of ngspice; a project runs end to end with no figure page |
| 3 | Thin editor: pin-to-pin canvas, palette of existing parts, keyboard wiring, inspector, run, fault panel | Delivers the capability the founders named and the benchmark confirmed missing (WORKFLOW_BENCHMARK Task 1) | A first-time user builds and runs LED + resistor + code unaided; 5 moderated sessions (HYPOTHESIS test); p95 frame under 20 ms on the RS-01 devices |
| 4 | Persistence slice: anonymous signed session, `projects` table (token-hash ownership as in `profiles`), migrations wired into deploy, autosave, export and import JSON, share link | A builder that loses work is a demo. It also forces the shared limiter and spend ledger into existence. | Edit, close, reopen on another day: project intact; restore from export works; a write quota is enforced |
| 5 | Generic fault rules shown in plain words | The only place where the audit found a measurable lead over tools users already use (O1) | Section 7.4 Q15 row 3 criterion |

Stop and re-plan points: if step 1 shows interpreter coverage below 80 percent of the 50-sketch corpus, the sequence changes (the compile and emulator path moves up before the editor ships to strangers). If RS-01 fails on phones, decide Canvas for wires only, or declare the builder desktop-first and say so on the page (a mission cost to be chosen consciously).

---

## 9. What not to build yet, and the trigger that would change it

| Do not build yet | Why | Trigger to revisit |
|---|---|---|
| A public component SDK or plugin marketplace | The part descriptor is the core's seam and does not exist. Publishing a format before it has survived real use locks in its mistakes, and extension code is a large attack surface (D8). Also no demand evidence exists for third-party parts (UNKNOWN). | The internal part descriptor converted all 29 existing parts plus at least 10 new ones with no breaking change for 8 weeks, and a measured request signal (for example a "request a part" control collecting at least 20 distinct, unprompted requests; the number is my threshold, not a finding) |
| Code-bearing parts (tier 3) | Needs sandbox, caps and a red team (RS-15). | Tier 2 data-only parts shown insufficient for at least 5 of the collected requests |
| CRDT or simultaneous editing | The baton model is correct for teacher/student and driver/navigator (Part C). Revision-safe actions give most of the benefit first. | Observed demand for two people editing one file at once, in sessions or tickets |
| Real compile, avr8js, Renode or QEMU as a shipped path | Licence unknown for arduino-cli on a server (RS-17), no real compile time measured, single-maintainer engines, a second behaviour to keep consistent. | The 50-sketch test fails more than 20 percent, or users report "works in the simulator, will not compile on my board" at a recurring rate (count them) |
| ngspice-WASM as the product's solver | 5.7 MB gzip to every learner; batch only is inferred, not tested. | RS-08 shows the in-house solver cannot meet 1 percent on RLC and buck waveforms, or learners ask for waveforms in the first sessions. Even then, load it lazily behind an "analyse" button. |
| Rewriting the relay or moving to a new realtime platform | Single process is fine until rooms are measured as the load (Part C). | Peak concurrent rooms on `/metrics` above half of the 500-room cap, or a load test on the real VM showing CPU saturation |
| Re-platforming off Vercel/Tiger | The costs and ceilings in section 6 are not at Vercel or Tiger. | Bandwidth or function cost above a threshold the founders set; Tiger plan limits reached |
| Server-side verification, credentials, leaderboards as trust anchors | Forgeable by design today (B7-03, B8-01). Not on the builder's path. | A school or sponsor wants grades or certificates that mean something |
| Solana mainnet or program changes | Detach, do not extend (Part C); legal exposure is a HYPOTHESIS flagged for counsel (B8-10). | A written founder decision that credentials are in scope, plus counsel's answer |
| Custom flight model for user-built drones | The arcade model is tuned to the calculator and tested (Part C). | The product promises "predict how my design flies" |
| A 3D or WebGPU builder canvas | Firefox desktop ships WebGPU off by default through v161 (F8); phones untested; the hand-drawn 3D art does not compose from parts. | RS-01 passes with 2D and users clearly ask for 3D assembly views |
| New boards, new languages, new catalogue items | Each costs six translations and a figure; the builder multiplies the value of existing ones. | The builder ships and sessions show the missing board or language is the top blocker |
| A monorepo and package split | Real, but not on the critical path. | A second team or an open-source contributor arrives; or relay and Solana tests keep drifting outside `npm run check` |

---

## 10. Risks

| # | Risk | Likelihood and cost (qualitative) | Mitigation |
|---|---|---|---|
| R1 | Scope: "builder" grows into Wokwi plus Tinkercad plus Proteus. | High likelihood; the largest schedule risk | Freeze the section 7.1 scope in writing; every addition names what leaves |
| R2 | The editor misses the phone and Chromebook budget (RS-01). | Medium; costs 4 to 6 extra weeks in the adverse case | Spike first; choose desktop-first explicitly if it fails |
| R3 | The solver gives confident wrong answers on unmodelled elements. | Medium; trust loss is the cost | Refuse and say "not modelled yet"; ngspice oracle in CI; golden set |
| R4 | Interpreter subset excludes a large share of real sketches. | Unknown; high cost if large | 50-sketch test before the editor ships; loud errors now |
| R5 | Spend abuse or quota exhaustion makes AI and search fail visibly. | High at any scale | Shared limiter, server ledger, identity, remove mount-time fetches |
| R6 | Provider terms bar AI for under-18 users; COPPA applies if the site is child-directed and telemetry defaults on with a persistent id. | Unknown; high legal cost | Decide the audience in writing (RS-02) before the builder collects user content |
| R7 | Provenance and licence of inherited content and constants. | Unknown; stops commercial use if unfavourable | Counsel review (B11-01, B11-02, B3-04) in step 0 |
| R8 | Bus factor: code written in 24 hours by agent roles; upstream engines have one dominant maintainer each. | Medium; slow, error-prone changes | Onboarding timing test (Q15 row 8); fork rights (MIT) noted; tests as docs |
| R9 | Relay outage drops all rooms on any deploy; one VM is a single point of failure. | Medium; low for solo learners, high for classes | Do not sell classroom reliability until persistence and a second relay path exist |
| R10 | User-generated content and children: buddy pool and rooms have no moderation, report, block, age or consent flow. | High if opened; severe | Keep UGC private by default; no public gallery until moderation exists (B7-09) |
| R11 | Figure pages and a generic renderer co-exist and diverge (two part drawings, two solvers). | Medium | Freeze the old solver and add a parity test (79 circuits) before any new element lands |
| R12 | Cross-browser divergence. Replay and the interpreter were tested in Chromium only. | Unknown; costly if Safari differs | Add WebKit and Firefox to the e2e run (WebKit is installed; REVIEW_GAPS item 4) |

---

## 11. Open questions and the cheapest way to answer each

| # | Question | Cheapest way | Cost |
|---|---|---|---|
| Q1 | What is today's real traffic, room count, DB size, plan tier on Vercel and Tiger? | Read the Vercel and Tiger dashboards; `curl` the relay's public `/metrics` (it is public, B5-13) | 1 hour |
| Q2 | Does production use Vercel Hobby (non-commercial) or Pro? | Vercel settings page | 5 minutes |
| Q3 | Is the Tiger DB connected and have the 3 migrations ever run in production? | `node scripts/db-migrate.mjs --status` against production, read-only, owner's approval | 15 minutes |
| Q4 | What share of real beginner sketches run in the interpreter? | The 50-sketch test (Q15 row 1) | 2 to 3 days |
| Q5 | Is the in-house solver within 2 percent of ngspice on 20 canonical circuits? | RS-08a | 2 days |
| Q6 | Does an SVG editor hold 20 ms p95 at 500 parts on a phone and a Chromebook? | RS-01 | 3 to 5 days |
| Q7 | Does the relay's CPU saturate on the 1 vCPU VM, and at how many active rooms? | `test/load.js` against a staging copy with `top` recorded | 1 day (needs approval) |
| Q8 | Does the real-WebSocket client path reconnect and resync in a browser? | Run the e2e rooms spec against a local relay instead of the BroadcastChannel fallback | 1 day |
| Q9 | Are the performance findings stable on a mid-range Android phone and a Chromebook, and in Safari and Firefox? | Run the existing `pages.mjs`/`cpu.mjs` scripts on those devices (scratch dir named in PERFORMANCE_BASELINE) | 2 days |
| Q10 | Why does the landing page fetch four large chunks 255 ms after load? (`partialPrefetching: true` is the HYPOTHESIS) | Toggle the flag in a local build and re-run `init.mjs` | 2 hours |
| Q11 | Who on the team can modify the solver, interpreter and relay today? | The onboarding timing test (Q15 row 8) and a short founder conversation | 2 days |
| Q12 | Do the AI providers allow a product used by under-18s? | RS-02: read Meta and other provider terms, ask in writing | 1 to 2 weeks elapsed |
| Q13 | Does arduino-cli on a server in a commercial product need a commercial licence? | RS-17, written answer from Arduino or counsel | 1 week elapsed |
| Q14 | Does a user care about a plain-text project file and shareable links? | Five moderated sessions with step 3's prototype; count unprompted export or share attempts | 1 week |
| Q15 | Do Chromium-only results of deterministic replay hold across browsers? | Run flight replay and an interpreter trace comparison in WebKit and Firefox via Playwright | 1 day |
| Q16 | Is there monitoring or alerting outside the repo? | Ask the founders | 5 minutes |

---

## 12. Challenges to the vision, assumptions and preferences (not agreeable by design)

1. "One workflow from imagine to build for real" is eleven engines wearing one coat. Each stage has a different fidelity floor: schematic edit (cheap), DC simulation (cheap, narrow), firmware behaviour (interpreter now, emulator later), optimisation (needs a model of the real world), build for real (needs a BOM, a wiring sheet and firmware that compiles on the actual board). The honest first claim is "imagine, design, wire, program, simulate, debug, learn" for a defined set of boards and parts. "Build for real" should be a bill of materials and a wiring guide with an explicit statement of what was not checked, until a compile path exists.
2. A feature count is not value. The repo advertises 71 lessons, 31 tasks, 144 failures, 106 faults, 12 boards, 13 drones, Solana credentials, MCP, voice. The value for an original-project user is the small set that survives contact with a blank canvas. Everything else is maintenance load for a 2 to 3 person team.
3. A clever algorithm is not feasibility. The deterministic replay, op-budget interpreter and fault engine are clever. None answers "does the user's own circuit behave like the real one", and no test in the repo can say.
4. Architecture preference to reject: "authoring content as TypeScript modules". It gives type safety to engineers and excludes everyone else, including the user-created content that the mission needs.
5. Architecture preference to reject: "keep checks in the browser". Fine for free play; incompatible with classes, credentials and any leaderboard that means something.
6. Business-model interaction (not my seat, flagged): a free product with default-on AI and search costs real money per session (AI at 100,000 sessions a month is $760 to $13,400 depending on model, ESTIMATED in TECHNICAL_RESEARCH section 7), and the current stack cannot cap that per user. Any pricing decision should wait for the spend ledger.
7. Mission interaction: "regardless of money, place, language or equipment" is in tension with a 2.2 MB lesson page, 48 to 65 percent idle CPU on a fast laptop, and a builder canvas whose phone performance is untested. Accessibility to low-end devices is an engineering budget, not a value statement. Set a budget (for example, first-load JS and idle CPU on a named low-end device) and gate the build on it.

---

## 13. Sources inside this repo

All under `/Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/`:
`01_AUDIT/TECHNICAL_DEBT.md`, `01_AUDIT/PERFORMANCE_BASELINE.md`, `01_AUDIT/SECURITY_BASELINE.md`, `01_AUDIT/TEST_COVERAGE.md`, `01_AUDIT/REVIEW_GAPS.md`, `01_AUDIT/inventory/figure-engine.md`, `01_AUDIT/inventory/interp.md`, `01_AUDIT/inventory/realtime.md`, `01_AUDIT/inventory/server-data.md`, `01_AUDIT/runs/BROWSER_WALK.md`, `02_RESEARCH/TECHNICAL_RESEARCH.md`, `02_RESEARCH/tech/simulation-options.md`, `02_RESEARCH/WORKFLOW_BENCHMARK.md`. External [S#] numbers are as cited in those files and listed in `02_RESEARCH/SOURCE_REGISTER.md`. I added no web sources.
