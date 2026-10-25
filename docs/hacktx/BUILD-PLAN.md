# iynk build plan: the last stretch of HackTX 2026

Written 2026-10-24 15:45 CDT, from the six audits in `docs/audit/` (boards, robotics, drones, platform, sponsor-layer,
history). **Status: waiting for the user's approval.** Nothing in here is built until the user says go.

## 0. Read this first

### What the user asked for

Optimise for Best Overall, SerpApi, Most Entertaining, Meta and Solana, with nothing missing from the core and
everything working, built in about six hours, with a 90% chance of winning.

### What I can honestly promise

- **No plan gives 90% odds.** Judges are people and ~140 other teams are unknown. What we can control is every
  scored criterion (Technology, Design, Completion, Learning) and each sponsor's own wording. This plan maximises
  those, and puts the riskiest thing (a broken demo) last in the order of things that can go wrong.
- **The audits add up to ~190 agent-hours** for the full brief at the quality the brief describes (boards ~40,
  robotics ~60, drones ~27, platform ~38, sponsor layer ~25). Six hours of wall time can't absorb all of that with
  the agent count we can run (the first build died at 14:19 from a **usage limit**, with 56 agents in flight).
- So the plan does three things:
  1. **Orders the work so any cut-off still leaves a winning demo.** Phase 1 makes the judge path perfect and
     deployed before anything wide starts.
  2. **Makes every one of the 38 items functional**, with a written minimum for "functional" (§4) so nothing is
     a placeholder or a 404, and every item can be built, broken, checked and (for drones) flown.
  3. **Uses the time after the six hours.** The hacking period ends 11:30 tomorrow, so the night is for depth,
     translation, the video and rehearsal, not for first-time functionality.

### Things that need your decision before go (§9 has the full list)

- **D1 Tracks (decided 16:15).** Phases 1–3 build for Best Overall, SerpApi, Most Entertaining and Meta. **Solana
  and Best Hardware Hack come last, in phase 4, only if time is left after gate 3.** Until then their panels stay
  hidden behind feature flags, so nothing half-done shows.
- **D2 Prose translation.** Full lesson prose in 5 more languages is ~850k words. The plan translates all UI text,
  all figure text, and the prose of the judge path (Uno R3, quad5, the esp32-s3 bench), and shows English prose with
  a visible "not yet translated" notice elsewhere, instead of a 404. Everything else is translated overnight.
- **D3 Devnet SOL (phase 4 only).** Deploying the Solana program needs ~2.1 SOL; your CLI wallet `Cxt17a9c…bW1S`
  holds 4.998 devnet SOL. The OK to send 3 SOL from it to the deployer and issuer is asked only when phase 4 starts.
- **D4 Keys and accounts:** META_API_KEY (US account), SERPAPI_KEY, Tiger Cloud DATABASE_URL, Vultr access, a .tech
  domain, Vercel env upload. Each is a "yes" from you; the list and the order are in §9.

## 1. What each track's judges must see

Every track's story runs through **one product** and one 4-minute demo, so no track looks bolted on.

| Track | What the prize text rewards | What the judge sees in iynk | Where it lives |
|---|---|---|---|
| **Best Overall** | "technically and creatively difficult", "a unique vision", design, complexity, impact | A hand-inked hardware lab in the browser: 12 boards, 13 benches, 13 drones; three real interpreters; failures that really happen; a flight sim. Everything opens, nothing 404s, in 6 languages. | the whole app |
| **SerpApi** | "SerpApi plays a meaningful role in what your project does" | **Build it for real** on every board, bench and drone: live prices from Google Shopping/Amazon/eBay drive a **budget optimiser that changes the design** (cells, motors, props) and the calculator re-runs; datasheet answers cite Google + Extract; makerspaces, shops and flying fields nearby (Maps); maker events; tutorial videos. | `RealBuildPanel` in the dock; partner tool `search_datasheet` |
| **Most Entertaining** | "something we won't want to put down", "keep people coming back" | **Break it and watch it fail** (magic smoke, a drone that flips because the FC is backwards, slow-mo replay, "here's why", one click to fix); **race your friends' ghosts** live in a room and your own best lap; bronze/silver/gold par times; a **daily challenge** with a leaderboard; 10+ flyable crafts with missions; sound. | fly page, Break-it panels, leaderboard |
| **Meta** | strengthens human connection; AI essential; originality; working demo; Muse Spark/Image/Voice/Muse connector | **iynk Together**: live build rooms across languages (Muse Spark translates chat and voice); a lab partner that **sends you to a person first** ("Maya fixed this an hour ago, ask her") and credits helpers; Build Night planner that turns a group chat into a plan; Build Stories with a Muse Image cover; buddy matching by shared builds; Muse calling iynk as a connector over MCP. | dock tabs Partner/Together, `/together`, `/api/mcp` |
| **Solana** *(phase 4, if time is left)* | "instant, high-frequency transactions", identity, payments | **Proof of Build**: the server **re-runs your deterministic lab run** before issuing a non-transferable credential PDA; sponsor bounties in escrow pay out in the same transaction; **micro-tips per helpful answer** in rooms (the high-frequency part); one-click devnet wallet; public `/verify`. Every lab kind is verifiable, not only drone safety. | dock tab Passport, `/passport`, `/verify` |
| *(Best Hardware Hack, phase 4, if time is left)* | "push beyond the screen" | Code run in the sim drives a real Uno over Web Serial + Firmata; the real board's button moves the figure. | dock tab Hardware |

### The demo path (rehearsed until it can't break)

1. Dashboard → Uno R3 → lesson "Blink": edit, Run, the LED blinks on the inked board. Reverse the LED → it doesn't
   light; short 5 V → magic smoke. *(Overall, Entertaining)*
2. A friend joins the room from a phone in Spanish. Cursors, translated chat, a translated voice note.
   The friend asks the partner a question; the partner points them to the host who just fixed it. *(Meta)*
3. Drone Lab → quad5 → Build it for real: "under $150" → the optimiser swaps the cells and motors, the calculator
   numbers change, the parts list prices are live. *(SerpApi)*
4. Fly: the room races; the friend's ghost flies beside you; a crash replay. Leaderboard updates. *(Entertaining)*
5. Build Story with the Muse Image cover; Muse (the agent) asks iynk "what did we build tonight?" over MCP. *(Meta)*

Added only if phase 4 lands: after step 4, pass the safety checks → Passport: the server re-runs the check, mints the
credential, the bounty pays, the friend tips 0.001 SOL for the help, Explorer link, `/verify` *(Solana)*; and the
sim's Blink code driving a real Uno on the table *(Hardware)*.

## 2. Where we are (from the audits)

| Area | Works | Broken or missing |
|---|---|---|
| Build health | eslint clean; 1228/1243 tests pass | **34 tsc errors → Vercel can't build**; `next build` fails prerendering esp32-s3 (missing `lessons.dimmer.*`); 15 failing tests |
| Boards | 7/12 boards; interpreters solid (41 tests); views and most failures | Uno R3/R4 **404** (no en prose); Uno circuits unmerged; **27/46 lessons** pass the app's check path (sensor/Wi-Fi plumbing, PWM rule, blink periods, variants); assembly step 1 refused on 6 boards; 5 boards never started |
| Robotics | UI complete; Uno and LED-trainer bench figures work | **No bench completable**; engine bugs B2/B3; no model hook; only 4/13 benches have content; 6 module figures missing; no line follower or arm; no sound |
| Drones | calculator perfect (342 golden rows); quad5 end to end; flight sim physics for every class | 12/13 cards placeholders; 4 crafts 404; only quad5 flies; palette bug; no ghosts; 5 crafts never started |
| Platform | shell, theming, progress, FigureFrame | no non-en item pages; UI strings untranslated (robotics 0%); LabDock renders null; no sound; README stale; 25/42 prompts missing; no `.vercelignore` |
| Sponsor layer | well built and tested (hx 471/482, relay 39, Anchor 34) | **none of it mounted or live**; voice 415; Solana undeployed; only drone-safety verifiable; telemetry has one caller; stores ignore room sync |
| Docs | PITCH, DEVPOST-WRITEUP, VIDEO drafts | JUDGE-QA missing; write-up overclaims; promises reversed silently (13 → 6 languages; "No tracking") |

## 3. Architecture

### 3.1 System

```
Browser (Next.js 16 App Router on Vercel, 6 locales)
 ├─ Lab pages: Boards / Robotics / Drones / Fly            ← one shell, one progress store (iynk:v1)
 │   ├─ FigureFrame ⇄ Colorfigures iframe (public/figures/<kind>/<id>.html; embed.js message contract + pause/resume)
 │   ├─ Lab store (dispatch(action)) ── adapter ──► RoomProvider (sync/hydrate, baton)   [NEW wiring]
 │   ├─ Interpreters in a Web Worker: compile → run → trace → checks (one evaluator)     [NEW worker + plumbing]
 │   └─ LabDock (tabs: Partner · Together · Real · Passport · Hardware; sheet on phones) [NEW, replaces stub]
 ├─ /together (lobby, buddies, Build Night)   /passport   /verify   /fly
 └─ Sound (Web Audio, figure sfx + UI cues, off by default, a toggle in settings)       [NEW]
API routes (Vercel functions, `await connection()` on every GET)
 ├─ /api/ai/*  → Muse Spark/Image/Voice gateway (Gemini text fallback)
 ├─ /api/search/* → SerpApi (9 engines + Extract), 6 h cache, budget guard
 ├─ /api/solana/{attest,credentials,faucet} → re-run verifier → Anchor program (devnet)
 ├─ /api/telemetry, /api/leaderboard, /api/live → Tiger Data (Timescale)
 └─ /api/mcp, /api/mcp/tools/[name], /openapi.json → Muse connector
Realtime relay (server/realtime, Docker on a Vultr VM, Caddy TLS on 443, rooms.<domain>.tech)
Solana program iynk_passport (Anchor 0.31.1, devnet)
```

Every sponsor feature degrades cleanly: with a key missing the panel says why and the core lab still works
(`getFeatures()`; `features.solana` becomes true only once the program's Config account exists).

### 3.2 The changes that unblock everything (shared code, built first)

These are the root causes behind most of the audits' blockers. Each has one owner in phase 1 or 2.

1. **One check path.** `src/lib/interp` exports `runHeadless` and `evaluateChecks`; Board Lab, Robotics and every
   content test call only these. Delete the content tests' private runners (they produced the false greens).
   Fix the rules: a `pwm` check accepts full duty (mode `out` at 100% counts as PWM high); blink periods follow the
   lesson's code default (change the content, not the rule, so the code and the text agree).
2. **World plumbing into the interpreter.** `engine.ts compile()` passes I²C `devices`, `world.networks`,
   `request()` and `attachUltrasonic()` from the lesson's world spec; `inputs.ts` returns controls for hc-sr04,
   mpu6050, network and qtr-rc. Fixes 10 lessons and the benches that use the same sensors.
3. **Checks run in a Web Worker** with a progress state and a 20 s budget, so a 15 s Wi-Fi run never freezes a tab.
4. **Lesson variants.** `LessonWorkspace` takes the lesson's `variant` (Pico W, Uno R4 WiFi) and a variant switch.
5. **Content never 404s for a language.** `loadBoardPage`/`loadBench`/`loadCraft` fall back to English prose with
   a `lang` notice when a translation is missing; a build-time check (`gen-content-index --check`) fails if **English**
   prose is missing for any item, so an unfinished item fails CI, not production.
6. **Engine fixes** (`figures/engine/`):
   - bench.js:808 apply the board variant before merging the bench (B2);
   - `missing:<part>` faults appear in state and in `faultPresent` (B3);
   - a per-bench **model hook** `model(state, dt) → {readings, status}` so a bench describes its electrical
     behaviour (transistor saturation, H-bridge levels, buck output, stepper current) in ~50 lines of JS, instead of
     a general solver for npn/diode/motor/stepper. This is the decision that makes 9 benches possible in time.
   - mat placement: boards and modules placed on the mat with fixed, pre-routed wires per bench step (no free
     wiring), one supply → several rails;
   - `bench-bb.js:164` emits `CF_NOTE` for unknown parts instead of skipping silently;
   - assembly: an unplug step precedes strip; choice ids validated at build;
   - drone.js: `G.pal` palette fix, a craft hook in the report, one `extra.*` path;
   - embed.js `pause`/`resume` (hidden figures stop animating).
7. **Room sync.** Each lab store implements `sync`/`hydrate` and an action filter; RoomProvider wraps the 5
   workspaces; the baton (only the holder dispatches build actions) is enforced in the adapter, not the UI.
8. **Ghosts.** The fly page sends poses at 20 Hz through the relay (`sendPose`/`onPose`); `replay()` drives your own
   best-lap ghost locally; par times per course.
9. **Telemetry.** `track()` calls on: lesson pass, bench step, fault triggered, flight lap, credential issued, ai call,
   search call. Leaderboard and live counter read the continuous aggregates. Disclosed in the privacy note; this
   replaces the old "No tracking" promise with "anonymous, opt-out".
10. **Verifiable everything.** `verifyRun` handles `board-lesson`, `bench-task`, `drone-safety`, `flight-lap`,
    re-running each through the same headless path as (1). Credentials can only be minted for what the server
    reproduced.

### 3.3 Contracts that don't change

The FigureFrame ↔ figure message contract, `dispatch(action)` stores, the content schema (`schema.ts`, additive
changes only, logged at the top of `docs/ARCHITECTURE.md`), the HX-CONTRACT API shapes, the progress key `iynk:v1`.

## 4. What "functional" means for each item

No item ships as a placeholder or a 404. Each one meets this bar, checked by machine (§6):

| Item kind | Minimum to count as done |
|---|---|
| **Board** (12) | figure with board/breadboard/schematic/power views; en prose; ≥4 lessons (Uno R3: all 16) whose reference code passes the app check path; ≥5 failures that visibly change the figure; assembly sequence completes; quiz per lesson; Build it for real parts list; a prompt record |
| **Bench** (13) | bench figure; every step reachable in strict order; ≥3 breaks that appear in state and the figure; ≥1 task whose reference solution passes the app runner and whose starter fails; quiz after each major step; serial/status output; sound cues; en prose; prompt record |
| **Drone** (13) | figure in its own palette; design calculator; build sequence; 3 safety tests; ≥1 craft test; CLI snippets for its firmware; en prose; **flies** with its own params and one course with par times and a mission; prompt record |
| **Locale** (6) | every UI and figure string translated; judge-path prose translated (D2); English prose with a notice elsewhere; zero 404s |

Robotics-specific brief items with no exceptions: the **line follower** lives on the qtr-8rc bench, the **simple
arm** on the pca9685 bench (fallback for both: the tb6612fng bench).

## 5. Build phases

Clock times assume go at **16:15**. Each phase ends at a gate (§6); a phase starts only when its gate is green.
CLAUDE.md asks for approval between phases; with "autonomous mode" the gates replace that approval, and I report at
each gate in HANDOFF.md instead of waiting.

Agents run as Workflow waves, 8–10 at a time (the session guideline), each owning a disjoint set of files, each given
the hackathon rule and its owner contract. Usage is watched: if the account nears its limit, the waves stop at a
gate, HANDOFF.md is updated, and the next session resumes.

### Phase 1: green, deployed, judge path perfect (16:15–17:45)

Goal: a deployed URL where the whole demo path works, before any breadth.

| Agent | Owns | Done when |
|---|---|---|
| P1-health | the 34 tsc errors, 15 failing tests, `lessons.dimmer.*`, together.json drift, tsconfig `.next-*` lines, fixture-preview route | `npm run typecheck`, eslint, vitest all green; `next build` passes |
| P1-checks | §3.2 items 1–4 (one check path, world plumbing, worker, variants), AccelStepper OUTPUT | all 46 existing lessons pass through `runHeadless` |
| P1-uno | uno-r3 en JSON (~1000 keys), circuit merge (R1→RES1, leg names, `@cf use`), assembly unplug step, the 3 no-effect failures, rebuild | `/en/boards/uno-r3` + all 16 lessons render and pass; probe green |
| P1-engine | §3.2 item 6 (B2, B3, model hook, CF_NOTE, assembly, palette, embed pause/resume) | esp32-s3-build bench completes end to end; engine unit tests |
| P1-dock | LabDock with Partner, Together and Real tabs + phone sheet (Passport and Hardware tabs exist but stay hidden by feature flag until phase 4), nav entries, RoomProvider on the 5 workspaces, namespaces registered | all tabs open on every lab page; e2e |
| P1-voice | WAV upload on both voice paths; `features.solana` false until the program's Config account exists; add a `hw` flag to `src/lib/features.ts` (additive, off until phase 4); fix the 7 failing hx tests | a translated voice note works end to end; no Solana or Hardware UI visible |
| P1-deploy | `.vercelignore`, Node 24 pin, NEXT_PUBLIC_SITE_URL, Vercel project link, preview deploy (env upload after D4) | preview URL serves the demo path |

The relay goes up in parallel as soon as Vultr is approved (Docker + Caddy, `rooms.<domain>.tech`).
**Gate 1** at 17:45: the demo path (§1) runs on the preview URL with live Meta and SerpApi.

### Phase 2: every item functional (17:45–20:45)

Three waves on disjoint files; all reuse phase 1's shared code.

- **Boards (5 agents):** uno-r4 en prose + variants; hc-sr04 + mpu6050 module figures and the missing part bundles
  (pico, nodemcu, uno-r4), then re-probe all 7; microbit-v2; nucleo-f401re; pi4-pi5 (shared with the pi5-ros2
  bench); basys3 + de10-lite (with `CompileOptions.ports`).
- **Robotics (5 agents):** uno-r3-build.ts (from the salvaged pieces) + led-resistor; transistor-switch +
  tb6612fng + l298n figures on the model hook; a4988 + lm2596 + the 5 mat parts; pca9685 (arm) + qtr-8rc (line
  follower) + mpu6050 + hc-sr04 benches; pi5-ros2 (needs `rclpy.executors`).
- **Drones (4 agents):** en prose for whoop, cinewhoop, longrange, wing; content for racer, gpscam, delivery;
  agrihex + swarm; vtol + tricopter + octo. A fifth agent: the **flight registry** (one adapter that reads
  `content.flight.params`, deleting the duplicate `crafts/<id>.ts`), a course + par times + mission per craft.
- **Fun and social (2 agents):** ghosts (§3.2 item 8), Break-it slow-mo replay with "here's why" and one-click fix,
  daily challenge + leaderboard; sound module and settings toggle; telemetry calls; store sync/hydrate + baton.
**Gate 2** at 20:45: the machine checks in §6 pass for all 38 items in English.

### Phase 3: translation, polish, release (20:45–22:15)

- UI strings (robotics, dronelab, boardlab fr/de/zh/hi, together de/zh/hi) and the new `src/i18n/figures/` for
  5 locales (1 agent per locale, 5 agents).
- Judge-path prose in 5 locales (D2).
- README rewritten (every prompt, setup, deploy, sponsor map, pre-event disclosure); the 25 missing prompt records;
  `docs/DECISIONS.md` records every scope decision (D2, model hook, translation tiers, telemetry wording).
- JUDGE-QA.md; PITCH, DEVPOST-WRITEUP and VIDEO updated so every claim matches what's live.
- Production deploy (after D4's OK), production smoke on the real domain, phone run of the demo path.

**Gate 3** at 22:15: production passes §6 on the live URL. **This is the "six hours" finish line.**

### Phase 4: Solana and Hardware, only if time is left (after gate 3)

Starts only when gate 3 is green, and must pass its own gate by 06:00 so the video isn't at risk; otherwise it's
dropped and the flags stay off (the write-up then doesn't mention either track).

- **Solana (1–2 agents, ~2 h):** ask the user for D3; fund the deployer and issuer; `npm run deploy:devnet`,
  `npm run setup:devnet -- --smoke`; turn `features.solana` on once the Config account exists; `verifyRun` for
  `board-lesson`, `bench-task`, `drone-safety`, `flight-lap` (§3.2 item 10); TipButton in rooms (micro-tips per
  helpful answer); seed a bounty for the demo; Passport tab; passport e2e.
- **Hardware (1 agent, ~1 h, needs an Uno + USB cable with StandardFirmata):** turn the `hw` flag on, show the
  Hardware tab, rehearse Blink and a button on a real board, update `docs/hacktx/HARDWARE.md` §10.

**Gate 4:** live devnet credential minted from production, `/verify` shows it, a tip lands; the Uno blinks from
the sim. Then the write-up and video add the Solana and Hardware beats.

### Overnight (22:15 → 10:30 submission)

Remaining prose translation (all items, 5 locales); deeper lessons on the new boards; bug sweep from a fresh-eyes
pass; demo rehearsal ×3 with two devices; video recorded 08:30–10:00; Devpost submitted by 10:30 (your click).

## 6. Verification (the "dynamic check on every end")

Every gate runs all of these; nothing is called done on a unit test alone.

1. **Static:** `npm run typecheck`, `npx eslint . --quiet`, `npm run check` (content index, message parity for all
   11 namespaces), `next build` with type-checking **on** (as Vercel runs it).
2. **Tests:** full vitest; Anchor tests; relay tests.
3. **App-path runner:** every lesson, bench task and craft safety test through `runHeadless` + `evaluateChecks`:
   reference passes, starter fails. Output table committed to `docs/verify/`.
4. **Figure probe:** Playwright drives every built figure through the bridge: all views, every circuit, every failure
   (must change state), every assembly/bench step in order. Zero console errors, zero `CF_NOTE` unknown parts.
5. **Route crawl:** every route × 6 locales on a production build: HTTP 200, no error overlay, no missing-string
   markers, no console errors. Expected: 0 × 404.
6. **e2e:** shell, boardlab, robotics, dronelab, plus new specs for the demo path, room with two browser contexts,
   ghosts, phone viewport (390×844) and dark mode; axe on one page per lab (passport e2e in phase 4).
7. **Live smokes** (with keys): `smoke-ai.mjs` (chat, translate, transcribe WAV, image), `smoke-search.mjs`
   (offers, nearby, extract), relay load test, Tiger
   migrations and a leaderboard read, Muse calling `/api/mcp` on the public URL; in phase 4, `setup:devnet -- --smoke` (credential + bounty + tip).
8. **Fresh-eyes pass:** an agent with no context walks the demo path on production as a new user and files friction.

## 7. Files and ownership

Owners follow `docs/ARCHITECTURE.md` §2 and `docs/hacktx/HX-CONTRACT.md`. Two agents never write the same file in
the same wave; shared files (`schema.ts`, `ids.ts`, `messages` registry, `features.ts`, engine files) have exactly one
owner per wave and everyone else files a request in `docs/requests/`. Each agent touches ≤8 files where the work
allows (CLAUDE.md's 5–8 per agent).

## 8. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Usage limit again mid-wave | Waves end at gates; HANDOFF.md updated after each agent; phase 1 lands a deployable demo first |
| Meta key late or Muse params differ from docs | Gemini text fallback keeps the partner and translation working; voice/image say "needs Meta key" |
| SerpApi free quota (~36 searches per cold drone kit) | 6 h cache, pre-warm the demo kits once, budget guard |
| Devnet faucet / RPC throttling (phase 4) | deploy from your funded wallet (D3); a free Helius devnet RPC |
| Vultr not approved | rooms fall back to BroadcastChannel (two tabs on one machine); the two-device demo needs the relay |
| A new board or bench can't hit §4 by gate 2 | it still ships with its figure, prose and the lessons that pass; the gap goes in DECISIONS.md and the Q&A, never hidden |
| Half-written content breaks the Vercel build | content freeze 1 h before each deploy; `npm run check` in the gate |
| Phone layout breaks the demo | phone e2e at every gate; the dock becomes a bottom sheet |

## 9. What I need from you, and when

| When | What | Why |
|---|---|---|
| Before go | Approve this plan (D1 decided); answer D2 (translation) | scope |
| By 17:00 | META_API_KEY (US developer account) and SERPAPI_KEY into `.env.local` (I never print them) | gate 1 live demo |
| By 17:00 | Vultr: OK to create one small VM; a .tech domain | relay for the two-device demo |
| By 17:30 | OK to link Vercel and upload env vars; Tiger Cloud DATABASE_URL | deploy, leaderboards |
| Phase 4 only | OK to send 3 devnet SOL from `Cxt17a9c…bW1S` to the deployer and issuer (D3) | Solana deploy |
| Phase 4 only | An Uno + USB cable with StandardFirmata | hardware twin rehearsal |
| Tonight | Ask organisers: pre-event research notes OK? how many tracks per project? | eligibility |
| 08:30–10:30 | Record the video (I write the shot list); click submit on Devpost | your account |

## 10. Handoff

After every agent finishes, `HANDOFF.md` gets the status and a checkpoint line, then commit and push (author: the
person driving, no agent attribution). If a session runs out, or the other teammate takes over, the next session
follows HANDOFF.md ("How to resume", "Working as a team") and picks up at the next unfinished row of §5.
