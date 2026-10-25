# iynk: Devpost write-up

Paste each section into the matching Devpost field; each paragraph is one line so it pastes cleanly. Values in [BRACKETS], and every sentence that depends on the morning's keys and deploy, are listed in "Confirm before submitting" at the end. Submit by 10:30, not 11:29.

Checked against the repo at gate 3, on 2026-10-25 at 05:53 CDT (commit `569b205`). Solana and the hardware twin are not claimed: both were planned for last and skipped, and their tabs stay hidden.

## Project name

iynk

## Elevator pitch (Devpost's short tagline)

Pick one:

- A free hardware lab in your browser. Wire, code, break and fly boards, robotics benches and drones, with an AI partner that finds you a friend before it answers.
- The hardware lab everyone can afford, where nobody builds alone.

## Links

- Try it: https://iynk.vercel.app
- Code: https://github.com/kushwahaamar-dev/iynk
- Video: [VIDEO_URL]

---

## Inspiration

Hardware is the most fun you can have with a computer, and one of the hardest things to learn on your own. It costs money: boards, parts, and the drone you crash on day one. It's scary: magic smoke, LiPo batteries that come with fire warnings. And it's lonely. Tutorials talk at you, and at 2 a.m. nobody is there to tell you why your LED flashed once and died.

Three small free sites showed us how good a hardware lesson can feel: Learn Arduino by Dilum Sanjaya, Robotics Engineer, and Drone Engineer. All three use interactive figures you can turn and take apart. Each covers one topic, though, and you use each one alone. We wanted one lab for boards, robotics and drones, and we wanted it to be social. Meta's track gave us the missing idea: the AI shouldn't replace the friend who could help you. It should find them.

## What it does

iynk is a hardware lab that runs in the browser. It does three things.

### Practice for free

There are 12 boards: Arduino Uno R3, Uno R4, Nano, ESP32 DevKitC, ESP32-S3, NodeMCU, Raspberry Pi Pico, STM32 Nucleo-F401RE, BBC micro:bit, Raspberry Pi 4/5, and two FPGA boards, the Basys 3 and the DE10-Lite. There are 13 robotics benches (an LED trainer, a transistor switch, four motor and servo drivers, sensors, a line follower, a buck converter, building an Uno and an ESP32-S3 board from parts, and a Raspberry Pi 5 as a ROS 2 robot brain) and 13 drones, from a Tiny Whoop and a 5-inch freestyle quad to a flying wing, a VTOL, a swarm and an octocopter. Each one is a hand-inked 3D figure you can turn all the way round, see through to labelled internals that work, and explode into parts.

You write code in an editor: an Arduino C++ subset, MicroPython or Python (with gpiozero and rclpy on the Pi), or a Verilog subset on the FPGA boards. It runs on a deterministic virtual clock and drives the figure and a serial monitor. There are 71 board lessons (16 on the Uno R3, at least 4 on every board), each with checks that tell you when it works. Break it lets you trigger any of 143 board failures, such as reverse polarity, a motor browning out the 5 V rail, 24 V on the barrel jack, a cold solder joint, a backwards capacitor that pops, or 5 V into a 3.3 V pin, and each one says what you'd see, why it happened and how to fix it. Robotics benches walk you through building and breaking a circuit step by step (272 steps and 106 faults across the 13), with 31 practice tasks. Drones have live numbers (weight, thrust to weight, hover throttle, current, flight time), a build in steps, a clickable wiring diagram, 77 bench tests such as the smoke stopper and the motor direction check, Betaflight, INAV and ArduPilot CLI snippets, and a flight sim with 22 courses, medal times, an FPV view, a daily challenge, and keyboard, gamepad or touch sticks.

Every lesson, step, quiz and screen is written in six languages, down to the labels inside the figures: English, Spanish, French, German, Chinese and Hindi.

### Build together

Open a room and share the link or QR code. There are no accounts. Up to eight people see where the others are pointing, take roles (wirer, coder, pilot, watcher), pass a keyboard baton, and every action lands in the same order on every screen.

The lab partner runs on Muse Spark. It reads your bench (the circuit, your code, the serial output, any active faults) and acts on it: it points at the part that's wrong in the 3D figure, gives a hint before it gives the answer, proposes a fix as a diff you accept or reject, and answers datasheet questions with citations. When someone in the room has passed the lesson you're stuck on, it asks them first, with a teach-back question. Chat and the partner's questions appear in each person's own language, and push-to-talk and voice messages go through Muse Voice Transcribe, so you can ask with your hands full of parts.

The Build Night planner takes what everyone wants to build and proposes one project, with a role and a first task for each person, steps and a parts list. Build Stories turn a session into a short story (what broke, who helped) with a Muse Image cover you can download or share. Build Buddies suggests people with complementary skills and says why. In the flight sim you race your own best lap, the autopilot's line, and your friends' ghosts with their names on them. iynk also runs an MCP server, so an MCP client such as Muse can search the catalogue, run the drone calculator, price parts, plan a build night or open a room.

### Go real

The Build it for real tab on every board, bench and drone prices the parts live through SerpApi (Google Shopping, Amazon and eBay) and adds them up. On a drone, give it a budget and the optimiser runs the drone calculator on every battery, motor and prop combination at those prices, so the cheaper build still has the thrust to weight and flight time it needs; one click puts it in the lab. The same tab finds makerspaces, electronics and hobby shops, and flying fields near you, plus maker events and tutorial videos.

The core lab works with every API key missing. Each sponsor feature checks whether it's set up and says so plainly when it isn't.

### Try it as a judge

Open https://iynk.vercel.app on a phone or laptop. No account needed. Board Lab, Robotics Lab and Drone Lab are in the top menu; "Start with the Arduino Uno R3" on the first page is the quickest way in. Together opens a room you can share with the person next to you.

## How we built it

iynk is a Next.js 16 app (React 19, TypeScript, Tailwind) on Vercel, with all six languages prerendered. The lab pages never need a server. The hackathon features are route handlers under /api, plus one small WebSocket relay.

**Figures.** Every board, part, bench and drone is a self-contained HTML page built with Colorfigures, April Zhu's MIT-licensed toolkit for hand-inked isometric figures: 80 figure pages in all. We vendored its core and patched it: real text measurement so Chinese and Hindi labels fit, a translation hook, an embedded mode and a dark mode. On top of it we wrote two engines, Board Bench (boards and robotics benches, with a DC nodal circuit solver) and a drone engine, plus a Python build step and a screenshot checker that runs against every figure. The app embeds each figure in an iframe and talks to it through one postMessage bridge.

**One store per lab.** Each lab page keeps its state in one serializable store that changes only through `dispatch(action)`, and every message to a figure goes through one component. That decision carried the whole hackathon layer: rooms relay the same actions, and the AI partner dispatches the same actions when you accept its change. Lesson checks are pure functions of the code and virtual time, so the page and the tests run exactly the same checks.

**Code.** Our interpreters cover an Arduino C++ subset (16-bit `int` on AVR boards, 32-bit elsewhere), MicroPython and Python, and a Verilog subset, all on a virtual clock where `delay()` never freezes the page. Checks run in a Web Worker with a time budget.

**Meta.** The server talks to Meta's OpenAI-compatible Model API. Muse Spark streams its answers over server-sent events with tool calling: server tools (datasheet search, parts prices) run in a loop of up to four rounds, and client tools (point at a part, propose a change, ask a peer, open a panel) run in the browser. The same model translates the chat, with code, pin names and values masked so they come back exactly as written; it also plans build nights, matches buddies and writes stories. Muse Image draws the covers in the figures' palette. Muse Voice Transcribe accepts WAV only, so the browser decodes each recording and writes a 16 kHz mono WAV itself.

**SerpApi.** The key stays on the server. Engines are whitelisted, results go through SerpApi's cache and a 6-hour cache of our own, and a budget guard refuses uncached searches past a set number. Each item's parts come from our content and map to search queries. The optimiser is a pure function, so it's easy to test.

**Realtime.** A Node 24 relay built on `ws`, packaged with Docker and Caddy for a Vultr VM, because Vercel functions can't hold WebSockets. It stamps every shared action with a sequence number, and clients apply actions only in that order, their own included, so there are no optimistic updates to reconcile. A late joiner gets a snapshot, then every action after it. Without a relay, rooms fall back to BroadcastChannel between tabs of one browser.

**Tiger Data.** One events hypertable holds anonymous, opt-out usage counts: flight samples, laps, lesson attempts and passes, faults, finished steps, room joins and actions, AI and search calls. A continuous aggregate computes the best lap per course per day for the flight leaderboard, and another counts activity per minute. Buddy profiles live in a regular table and expire after 24 hours; events are kept for 30 days.

**How the work ran.** All of it was written during the event by AI coding agents: two of us driving Claude Code, which ran more than 250 agents in parallel waves. Each agent owned a fixed set of files and worked from written contracts (fixed decisions for the core, and a second contract for the hackathon layer). Agents asked each other for changes by writing request files instead of editing each other's code. The gates were TypeScript, ESLint, Vitest unit tests, a table that runs every lesson's reference solution and starter code, figure probes and screenshots, a crawl of every route, and Playwright end-to-end tests with axe accessibility checks.

## Challenges we ran into

**Many agents, one repo.** The core lab and the hackathon layer were built at the same time, by different agents, in the same working tree. What made it work was boring: strict file ownership, contracts that only change by adding things, one person allowed to install dependencies, and a separate build folder per agent so builds didn't overwrite each other. The core also had to reserve seams for features that didn't exist yet.

**Determinism.** A lesson check only means something if the same code always gives the same run. That meant a virtual clock in every interpreter and checks written as pure functions, and a test table that proves every lesson's reference passes and its starter fails: 102 of 102 both ways at our last gate.

**Ordering in rooms.** Shared state gets strange fast. The host leaves while two people are still joining. A phone reconnects holding stale state. Someone acts before their snapshot arrives. The relay holds a joiner's actions until their snapshot lands, hands the room to the next person when the host leaves, and replays missed actions after a short reconnect.

**Text inside figures.** Colorfigures estimated label widths from the number of characters. Chinese labels overflowed, and Hindi labels came out twice as wide as they needed to be. We now measure the real text with the canvas API.

**Voice and Next.js 16.** Meta's transcription endpoint accepts only 16 or 24 kHz mono WAV. Browsers record webm or mp4, and our server has no audio decoder, so the browser converts the audio instead. Separately, Next.js 16's Cache Components reject the usual route settings and prerender GET handlers at build time, so every GET that must answer per request calls `connection()` first.

## Accomplishments that we're proud of

- An AI partner whose first move, when someone in the room has passed the lesson, is to ask that person.
- 144 board failures you can trigger on purpose, each with what you'd see, why and the fix, decided by the figure's own power model.
- One visual system across every board, bench and drone, including the schematic and breadboard views, with every lesson in six languages.
- A drone calculator that reproduces [342] reference builds from the Drone Engineer tables, and every lesson's reference solution passing its own checks.
- The core lab works with every key missing, so a sponsor outage takes out one panel, not the app.
- More than 250 agents producing one working product in 24 hours.

## What we learned

Most of the sponsor side was new ground for us: ordering messages over WebSockets, time-series aggregates, and LLM tool calling where some tools run on the server and some in the browser. The agents wrote the code, but we had to understand each piece well enough to write its contract, check what came back, and explain it to a judge.

The bigger lesson was about building with many agents at once. Prompts mattered less than contracts: a fixed list of decisions, one owner per file, and seams reserved early for features that didn't exist yet. The one-store-per-lab rule cost almost nothing on day one, and later it gave us multiplayer, AI actions and crash replays.

We also learned how much of a hardware lesson is facts. Every board and drone got a fact sheet with sources before its content was written, and some numbers on the sites we learned from turned out to be wrong. We corrected them and logged each change.

We also learned to cut. Proof of Build on Solana and a hardware twin for a real Uno were both started and both left switched off, because the night ran out and a half-working feature on stage is worse than none.

## What's next for iynk

- Finish Proof of Build on Solana and the real-Uno hardware twin, both built partway and switched off for this demo.
- Photograph a real breadboard and have iynk rebuild it in the sim, identifying parts through SerpApi's Google Lens API.
- List iynk in Meta's Muse connector directory when it opens, and add Facebook Login after app review so stories can go to groups.
- Translate the newest figure labels, and fill the Verilog gaps (functions, tasks, generate, a UART).
- Try it with a real class or club, with chat moderation and teacher-run rooms in place first.

## Built with

next.js, react, typescript, tailwindcss, codemirror, zod, colorfigures, svg, javascript, python, node.js, websockets, ws, vercel, vultr, docker, caddy, meta-model-api, muse-spark, muse-image, muse-voice-transcribe, model-context-protocol, facebook-share-dialog, serpapi, tiger-data, timescaledb, postgresql, vitest, playwright, axe-core, claude-code

---

## Prize tracks we're entering

Entering: Meta, SerpApi, Best Overall, Most Entertaining, Best Pitch, MLH Vultr and MLH Tiger Data. Not entering: MLH .Tech (we have no .tech domain), Solana and Best Hardware Hack (both features are switched off), the MLH A-Team track (it requires Cursor and Grok Bot as core tools; we used Claude Code), Gemini, NMC2, Capital One, Toyota and Snowflake. Best Novice only if every team member is a first-time hacker.

### [Title Sponsor: Meta/Facebook] Bringing People Closer Together with AI

iynk's AI exists to get people to each other. The lab partner (Muse Spark with tool calling) reads your bench, points at the wrong part in the 3D figure, and gives hints before answers; when someone in your room has passed that lesson, it asks them first, with a teach-back question. Everyone reads the room in their own language, and push-to-talk and voice messages go through Muse Voice Transcribe, so you can talk while holding a breadboard. Meta's three examples are three of our features. The Build Night planner turns a group's wishes into one project with a role for each person. Build Stories turn a session's scattered events into a shared story with a Muse Image cover, shared through Facebook's share dialog. Build Buddies suggests partners with complementary skills and explains why; at HackTX the pool is everyone who opts in on the site. iynk also exposes an MCP server, so Muse can plan a build night or open a room [tested as a custom connector in Muse / tested with an MCP client only].

### [SerpApi] Best Use of SerpApi

SerpApi is what turns the simulator into a real build. Every board, robotics bench and drone has a parts list, and Build it for real sends it through Google Shopping, Amazon and eBay for live offers and a total. On a drone, the budget optimiser then uses those prices to change the engineering: it runs the drone calculator on every battery, motor and prop combination and picks the build that keeps its thrust to weight and flight time in range under your budget. Google Maps finds makerspaces, electronics and hobby shops, and flying fields nearby. Google Events finds meetups, and YouTube finds tutorials. The lab partner answers datasheet questions from Google results read through the Extract API, and cites them. The key stays on the server behind an engine whitelist, SerpApi's cache, our own 6-hour cache and a budget guard.

### [Best Overall] Cinderella's Castle

iynk is one product with one job: make hardware affordable to learn, and never lonely. Underneath are 80 hand-inked 3D figures for 12 boards, 13 robotics benches and 13 drones; interpreters for Arduino C++, MicroPython, Python and Verilog on a deterministic clock; a circuit solver that decides what breaks; a drone calculator and a flight sim; six languages; real-time rooms with a total order; an AI partner whose tools act on the bench; and live parts data that changes the design. It's one visual system, and every sponsor feature has a job in the same story. The part we didn't know we needed until we built it is an AI that sends you to a person.

### [Most Entertaining] Jester's Court

iynk is built to be broken. Leave the resistor off an LED and watch it flash once and die, fit a capacitor backwards and hear it pop, put a motor on the 5 V pin and brown the board out, then find out why and how to fix it. Then fly what you built: through gates in third person or FPV, in angle or acro mode, against your own best lap, the autopilot and your friends' ghosts. Break the drone on purpose (flight controller mounted backwards, props swapped round), watch it flip, and watch the crash again at a third of the speed with the reason on screen. Every course has gold, silver and bronze times, and there's a daily challenge with a link to send your friends.

### [MLH] Best Use of Vultr

Vercel functions can't hold WebSockets, so iynk's realtime relay runs on a Vultr VM in Dallas. It's a small Node 24 server built on `ws`, running in Docker behind Caddy. It stamps every shared lab action with a sequence number so every screen applies them in the same order, relays chat, cursors, presence and flight ghosts, hands late joiners a snapshot, and keeps an empty room alive for 30 minutes in case people come back. Every multiplayer moment in our demo goes through it.

### [MLH] Best Use of Tiger Data

iynk's anonymous usage counts live in Tiger Data. One events hypertable in one-day chunks, compressed to the columnstore after a day and kept 30 days, holds flight samples, laps, lesson attempts and passes, faults, room actions and AI and search calls. A real-time continuous aggregate of the best lap per course per day drives the flight leaderboard, so it reads precomputed rows instead of scanning raw events, and a second aggregate counts activity per minute. Opt-in buddy profiles sit in a regular table in the same database and expire after 24 hours.

### [Best Pitch] A Bard's Tale

We tell iynk through one person, Maya, who wants to build a drone, and we demo it live with a second person on a phone, in Spanish. An LED with no resistor flashes once and dies, the partner asks Lucía, her voice answer arrives translated, the drone is priced to Maya's budget, she races Lucía's ghost and crashes on purpose, and the night ends as a shared story. It takes three minutes, and the last line is the product: nobody builds alone.

---

## Before the event

The idea for iynk and our hardware research predate HackTX. Before 11:30 a.m. on October 24 we had the product brief (`docs/SPEC.md`), research notes on how the three sites named above teach (lesson structure, calculator tables, interactions), on the Colorfigures toolkit and on Next.js 16 (`docs/research/`), the first datasheet fact sheets (finished during the event), and an earlier iynk prototype. Those were used as knowledge only. The prototype is not in this repository, and nothing from it or from the code blocks in the research notes was copied. All of iynk's code, figures, content and tests were written during the hacking period, between 11:30 a.m. on October 24 and 11:30 a.m. on October 25, by Claude Code agents working from contracts we wrote at the start of the event. The repository's history starts at 15:30 on October 24, when the build moved to it; the timeline before that is in `docs/audit/history.md`. Colorfigures is a third-party MIT-licensed library; our changes to it are listed in `figures/vendor/colorfigures/PATCHES.md`. [We asked the organizers about the pre-event notes, and they said: ___.]

## Credits

- Colorfigures by April Zhu (MIT), built on iso-glow by April Zhu and iso-figure by Tolga Cohce. Credited on iynk's About page.
- Learn Arduino by Dilum Sanjaya, and the Robotics Engineer and Drone Engineer sites, which shaped our lesson structure. We reused facts (pinouts, formulas, constants), not their source code.

## Confirm before submitting

- Filled 08:39: the site (https://iynk.vercel.app) and the repo (https://github.com/kushwahaamar-dev/iynk, public). Still open: [VIDEO_URL]. No .tech domain, so no [DOMAIN].
- `/api/status` on production (checked 08:54): `ai`, `image`, `voice`, `search`, `realtime`, `db` and `gemini` true, `solana` false. Vultr and Tiger Data are entered; .Tech is not (no domain), and its section is gone.
- Meta model ids: `.env.example` has `muse-spark-1.1`, `muse-image-1.0` and `muse-voice-transcribe-1.0`; check them against `docs/hacktx/AI.md`. Fill in the Muse connector bracket (a custom connector in Muse, or an MCP client only): at 02:00 it had not been tried from Muse (`docs/hacktx/MUSE-CONNECTOR.md`). Confirm Facebook's share dialog opens from a story.
- The partner calling `ask_peer` with a real key, voice transcription, chat translation and the story cover, each tried once on the deployed site.
- SerpApi engines that actually ship. Keep Google Lens in "What's next" only.
- Content counts at gate 3 (05:53): 12 boards, 13 benches, 13 drones, 71 board lessons (16 on the Uno R3), 144 board failures, 272 bench steps, 106 bench faults, 31 bench tasks, 78 drone bench tests, 22 courses, 80 figure pages, six languages. If anything changes after that, change the numbers here and in PITCH.md, VIDEO.md and JUDGE-QA.md.
- "Every lesson, step, quiz and screen is written in six languages, down to the labels inside the figures": true at gate 3 for prose, the UI and all 4087 figure strings (`npx vitest run src/i18n/figure-strings.test.ts`). Names, units, code, serial output and CLI commands stay as they are on a real board.
- [342] reference builds: `npx vitest run src/lib/drone` passed 445 of 445 at 05:53, and the fixtures hold 342 rows. 102 of 102: the lesson table at gate 3 (`docs/verify/gate3-lessons.md`).
- Agents (filled 08:39): 253 agent transcripts on Amar's Mac start between 11:30 on 10-24 and 07:19 on 10-25 (141 in the first build, 6 in the 16:57 session, 106 in the 18:22 session), plus the teammate's phase-1 agents on her Mac; hence "more than 250".
- Vultr (confirmed 08:39): the relay runs on a `vc2-1c-1gb` VM in Dallas, in Docker behind Caddy with a Let's Encrypt certificate, and the live site's rooms use it.
- The organizers' answers: are pre-event research notes allowed, and how many prize tracks can one project enter.
- Credit lines: the authors of Robotics Engineer and Drone Engineer, if you can confirm them.
- "New ground for us" in What we learned: true for both of you?
