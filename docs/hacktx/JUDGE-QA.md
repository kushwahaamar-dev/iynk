# SimLab: judge Q&A

The 25 questions judges are most likely to ask, each with a short answer and the page or file that shows it. Read it
once before judging, and open the file a question names if a judge wants to see the code.

Checked against the repo at gate 3, on 2026-10-25 at 05:53 CDT (commit `569b205`, `docs/verify/gate3.md`). Numbers
come from the content modules and from commands run then: `npx vitest run src/i18n/figure-strings.test.ts` for figure
text, the app-path lesson table, and `npx vitest run src/lib/drone`. Anything that depends on the
morning's keys and deploy is marked, and "Recheck before judging" at the end lists it.

## The product

### 1. What is SimLab, and who is it for?

A hardware lab in the browser for students who can't afford parts, are scared of frying them, or have nobody to ask.
You build, wire, code, break and fly 12 dev boards, 13 robotics benches and 13 drones, each a hand-inked 3D figure,
and an AI partner sends you to a friend before it gives you the answer. Start at `/en`, then "Start with the Arduino
Uno R3".

### 2. How much is really in it?

38 items, all with content and English prose: 71 board lessons (16 on the Uno R3, at least 4 on every board), 144
board failures, 13 benches with 272 build steps, 106 faults and 31 practice tasks, and 13 drones with 78 bench tests,
131 CLI snippets and 22 flying courses (21 with medal times). The lists live in `src/content/ids.ts`, the items in
`src/content/{boards,robotics,drones}/`, and every item's prose in `src/i18n/content/<lang>/`.

### 3. What works with no API keys at all?

The whole core: every figure, lesson, interpreter, check, Break it, bench, drone calculator, the budget optimiser on
catalogue prices, the flight sim with medals, ghosts of your own best lap and of the autopilot, the slow-motion crash
replay and the daily challenge. Each sponsor feature reads `/api/status` and says "not set up on this deployment"
when its key is missing (`src/lib/server/env.ts` `featuresOf`, `src/lib/features.ts`), so a missing key costs one
panel, never the page.

## How the simulator works

### 4. How does the code run?

In the browser, in our own interpreters: an Arduino C++ subset (with each chip's integer widths), MicroPython (Pico,
micro:bit), Python with `gpiozero` and `rclpy` (Raspberry Pi) and a Verilog subset (the two FPGA boards). Everything
runs on a deterministic virtual clock, so `delay(1000)` never freezes the page and the same code always gives the
same run (`src/lib/interp/`, `src/lib/interp/clock.ts`).

### 5. Is that real Arduino, MicroPython and Verilog?

It's real source code, interpreted, not compiled for the chip. The subsets cover what the lessons use, and the gaps
are written down: the Verilog simulator has no `function`, `task`, `generate` or `inout`, no UART and no ADC
(`docs/requests/P2-fpga-gaps.md`), and the micro:bit's `radio` has no second board to talk to
(`docs/requests/P2-pi-gaps.md`). A compile error shows its line and nothing runs (`e2e/boardlab.spec.ts`).

### 6. How does the drawing follow the code?

Each figure is a self-contained page embedded in an iframe, and one message bridge connects it to the lab
(`src/components/figure/protocol.ts`, `figures/engine/embed.js`). The interpreter's pin levels go to the figure, the
figure's circuit solver works out what every part does, and the figure reports back its LEDs, currents and faults,
which the page also shows as text ("What the figure shows" on the Blink lesson).

### 7. What is real physics and what is modelled?

Breadboard circuits go through a DC nodal solver: resistors as conductances, LEDs and diodes as piecewise-linear
junctions, transistors off, active or saturated, PWM solved per time slice (`figures/engine/bench-solve.js`). Motor
drivers, buck converters and steppers use a short per-bench model instead of a general solver
(`figures/robotics/<id>.js`, `model()`). Numbers no datasheet gives, such as a board's idle current, are marked as
estimates in the gap files (`docs/requests/P2-*-gaps.md`).

### 8. Why should we believe the failures are accurate?

Every board and drone has a fact sheet with its sources (`docs/facts/<id>.md`: maker schematics and Eagle files,
datasheets, firmware source), written before its content. Each failure carries what you see, why and the fix
(Break it on any board page), and the figure decides the outcome from its own power model: 24 V on the Uno's jack
damages the regulator, a backwards electrolytic pops and smokes, and 5 V shorted to GND takes the board down
(`figures/engine/bench.js`, `evaluate`). Facts we found wrong on the sites we learned from were corrected, not
copied.

### 9. How do you know a lesson really passes?

The page and the tests use the same check path: `runHeadless` plus `evaluateChecks` (`src/lib/interp/headless.ts`,
`checks.ts`), run in a Web Worker with a 20-second budget. The table from `src/lib/interp/lessons.test.ts` runs every
lesson and bench task: at 05:53, 102 of 102 references passed and all 102 starters failed
(`docs/verify/gate3-lessons.md`).

### 10. How accurate is the drone calculator?

It follows the Drone Engineer site formula for formula and reproduces its 342 reference builds across 13 crafts at
their printed precision (`src/lib/drone/calc.ts`, fixtures in `src/lib/drone/__fixtures__/`). `npx vitest run
src/lib/drone` passed 445 of 445 tests at 05:53.

### 11. How does the flight sim work, and what does Break it do there?

Each craft flies from its own content and calculator numbers, with a physics class per kind: multirotor, fixed wing,
quadplane, tricopter and swarm, plus battery sag, wind and collisions (`src/lib/flight/sim.ts`,
`src/lib/flight/registry.ts`). On the fly page, Break it puts a real build mistake in (flight controller backwards,
props swapped, an unchecked motor): the craft flips, the crash replays at a third of the speed, "Here's why" explains
it, and one button fixes it (`src/components/flight/BreakIt.tsx`, `e2e/fly-fun.spec.ts`).

### 12. How did you make 80 figures?

With Colorfigures, April Zhu's MIT-licensed toolkit for hand-inked isometric figures, vendored and patched for real
text measurement, translation, an embedded mode and dark mode (`figures/vendor/colorfigures/PATCHES.md`). On top we
wrote the Board Bench and drone engines (`figures/engine/`), a Python build step and a screenshot checker
(`figures/tools/cfbuild.py`, `cfshoot.py`). Each figure has a prompt record describing what it draws and does
(`figures/prompts/`).

## AI and Meta

### 13. What does the lab partner actually do?

It's Muse Spark with tool calling, and it reads a compact description of your bench: circuit, code, serial output and
active faults (`src/lib/ai/bench.ts`). It can point at a part in the figure, propose a change you accept or reject as
a diff, ask a person in the room, open a dock tab, and (with SerpApi set up) search a datasheet or price parts
(`src/lib/ai/tools.ts`). It gives hints before answers ("Give me a hint", "Show me").

### 14. How does it send you to a person?

Everyone in a room shares their finished lessons and tests. When someone in the room has passed what you're stuck on,
the partner's `ask_peer` tool posts a teach-back question to them in the room chat, in their own language, before it
explains anything itself (`src/lib/ai/tools.ts`, `src/components/ai/PartnerPanel.tsx`). Without a room it says a
friend who has done this could explain it, and offers to invite one.

### 15. Which Meta models do what?

Muse Spark runs the partner, translates the room chat, plans a Build Night, matches buddies and writes Build Stories;
Muse Image draws the story cover; Muse Voice Transcribe turns push-to-talk and voice messages into text. Meta's
transcription takes 16 or 24 kHz mono WAV only, so the browser converts every recording itself
(`src/lib/ai/voice-wav.ts`; the gateway is described in `docs/hacktx/AI.md`). All three need `META_API_KEY`, which is
added on the morning of the 25th.

### 16. Can Muse use SimLab?

SimLab is an MCP server at `/api/mcp` with seven tools: `search_catalog`, `get_item`, `drone_calc`, `price_parts`,
`plan_build_night`, `create_room` and `get_passport`, the last of which says Proof of Build is not set up while Solana
is off (`src/lib/server/mcp/tools/`). It answers `initialize` and `tools/list` locally (`docs/hacktx/DEPLOY.md`). It
has not yet been tried from Muse itself, which needs the public HTTPS URL (`docs/hacktx/MUSE-CONNECTOR.md`, "What is
unverified").

## SerpApi

### 17. What is SerpApi's role?

It turns the simulation into a real build. "Build it for real" on every board, bench and drone prices the parts list
live from Google Shopping, Amazon and eBay; "Near you" finds makerspaces, electronics and hobby shops and flying
fields on Google Maps, plus maker events; "Video help" searches YouTube; and the partner's datasheet answers come from
Google results read with the Extract API, with citations (`src/components/search/`, `src/lib/server/search/serpapi.ts`).

### 18. Do the prices change the design, or just sit there?

They change it. On a drone, the budget optimiser runs the calculator on every battery, motor and prop combination at
today's prices and proposes the build with the most headroom under your budget; "Use this build in the lab" applies it
and the numbers update (`src/lib/search/optimize.ts`). On catalogue prices, quad5 costs $346, and a $340 budget swaps
the 6S 1100 mAh pack for a 4S 1500 and the 1750KV motors for 2450KV ones: $330, thrust to weight 10.9.

### 19. How do you keep SerpApi fast and inside the quota?

The key stays on the server behind an engine whitelist; results go through SerpApi's own cache and a 6-hour cache of
ours, and a per-process budget refuses new uncached searches past `SERPAPI_MONTHLY_BUDGET` (default 200), after which
the panel falls back to catalogue prices and says so (`src/lib/server/search/serpapi.ts`).

## Rooms, languages and data

### 20. How do rooms stay in sync?

Each lab page keeps its state in one store that changes only through actions, so a room just relays actions. Our relay
(`server/realtime/`, Node 24 and `ws`, packaged for a Vultr VM with Docker and Caddy in `deploy/realtime/`) stamps
every action with a sequence number, every screen applies them in that order, and a late joiner gets a snapshot first
(`docs/hacktx/REALTIME.md`). One person holds the keyboard at a time; without the relay, rooms work between tabs of
one browser (`e2e/room.spec.ts`).

### 21. How is the chat translated without breaking code and pin names?

Each message is translated into each reader's own language by Muse Spark. Code, URLs, pin names, part numbers and
values with units are swapped for tokens before the model sees the text and put back byte for byte after
(`src/lib/server/ai/prompts/translate.ts`). The reader can always show the original. Without `META_API_KEY`, messages
show as written and the chat says so.

### 22. How much is really in six languages?

All 38 items' prose is in English, Spanish, French, German, Chinese and Hindi (228 files in `src/i18n/content/`), and
so is the UI, apart from names, units and code. Inside the figures, all 4087 strings are translated in each
language, and a test fails if a figure gains one that isn't (`src/i18n/figures/<lang>.json`,
`src/i18n/figure-strings.test.ts`). Serial output the checks match, firmware messages and CLI commands
stay English on purpose, as they do on a real board.

### 23. What do you store about people?

No accounts. Progress and settings stay in the browser. With a database, the labs send anonymous counts (a lesson
passed, a fault tried, a lap time) with a random browser id, never a name or code. "Share anonymous usage counts" at
the bottom of the board, lesson, bench and drone pages turns them off everywhere (`src/lib/telemetry/client.ts`).
Tiger Data keeps them 30 days, and buddy profiles expire after 24 hours (`db/migrations/`).

## How it was built

### 24. How did you build this in 24 hours, and what existed before?

Before 11:30 on October 24 we had a product brief (`docs/SPEC.md`), research notes on the three sites we learned from
(`docs/research/`), hardware fact sheets (finished during the event) and an earlier prototype app. Those were
knowledge only: the prototype is not in this repository, whose history starts at 15:30 that day, and every line of
code was written during the event by Claude Code agents working in waves, each owning a fixed set of files under
written contracts (`docs/ARCHITECTURE.md`, `docs/hacktx/HX-CONTRACT.md`, `docs/hacktx/BUILD-PLAN.md`), with typecheck,
lint, unit tests, the lesson table, figure probes, a route crawl and end-to-end tests as gates.

### 25. What isn't done, and why?

Proof of Build on Solana and the real-Uno hardware twin were planned last and skipped for time: their code is in the
repo, their tabs stay hidden behind feature flags, and we don't enter those tracks. The live "Right now at HackTX"
counter is built but not placed on a page, and the Verilog and micro:bit limits are in question 5. The partner, translation, voice, live prices, cross-device
rooms and the leaderboard need their keys or the relay, which go in on the morning of the 25th.

## Recheck before judging

Run these on the deployed build after gate 3, and change the answer above if one fails:

- `/api/status` shows `ai`, `image`, `voice`, `search`, `realtime` and `db` true (questions 13–21, 23).
- The partner asks a peer in a two-device room, and a Spanish voice message arrives in English (14, 15, 21).
- quad5's live total and what the optimiser swaps at your budget (18): the $346 and $340 figures are catalogue prices.
- Muse calling `/api/mcp` on the public URL (16).
- The figure-string count (22): rerun `node scripts/figure-strings.mjs --static` and the figure-strings test after the
  delta lands.
- Whether the live counter got a page (25), and the lesson table and drone tests at gate 3 (9, 10).
