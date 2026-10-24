# SimLab: Devpost write-up

Paste each section into the matching Devpost field. Values in [BRACKETS], and every sentence that depends on the final build, are listed in "Confirm before submitting" at the end. Submit by 10:30, not 11:29 (STRATEGY §8).

## Project name

SimLab

## Elevator pitch (Devpost's short tagline)

Pick one:

- A free hardware lab in your browser. Wire, code, break and fly boards, robotics benches and drones, with an AI partner that finds you a friend before it answers.
- The hardware lab everyone can afford, where nobody builds alone.

## Links

- Try it: [SITE]
- Code: [REPO_URL]
- Video: [VIDEO_URL]
- Proof of Build program on devnet: `https://explorer.solana.com/address/[PROGRAM_ID]?cluster=devnet`

---

## Inspiration

Hardware is the most fun you can have with a computer, and one of the hardest things to learn on your own. It costs money: boards, parts, and the drone you crash on day one. It's scary: magic smoke, LiPo batteries that come with fire warnings, mains power. And it's lonely. Tutorials talk at you, and at 2 a.m. nobody is there to tell you the LED is in backwards.

Three small free sites showed us how good a hardware lesson can feel: Learn Arduino by Dilum Sanjaya, Robotics Engineer, and Drone Engineer. All three use interactive figures you can turn and take apart. Each covers one topic, though, and you use each one alone. We wanted one lab for boards, robotics and drones, and we wanted it to be social. Meta's track gave us the missing idea: the AI shouldn't replace the friend who could help you. It should find them.

## What it does

SimLab is a hardware lab that runs in the browser. It does four things.

### Practice for free

There are 12 boards: Arduino Uno R3, Uno R4, Nano, ESP32 DevKitC, ESP32-S3, NodeMCU, Raspberry Pi Pico, STM32 Nucleo-F401RE, BBC micro:bit, Raspberry Pi 4/5, and two FPGA boards, the Basys 3 and the DE10-Lite. There are 13 robotics benches (motor drivers, sensors, a buck converter, a Raspberry Pi 5 as a ROS 2 robot brain) and 13 drones, including a Tiny Whoop, a 5-inch freestyle quad, a flying wing, a VTOL and an octocopter. Each one is a hand-inked 3D figure you can turn all the way round, see through to labelled internals that work, and explode into parts. Every pressable part does something.

You write code in an editor: an Arduino C++ subset, MicroPython or Python, or a Verilog subset on the FPGA boards. It runs on a deterministic virtual clock and drives the figure and a serial monitor. Failures really happen: reverse polarity, brown-out, wrong voltage, a cold solder joint, 5 V into a 3.3 V pin. The Uno R3 has 16 lessons and every board has at least four. Robotics benches walk you through building and breaking a board (strip the PCB, place parts, solder, upload), with practice tasks and quizzes. Drones are built part by part, with live numbers (weight, thrust-to-weight, hover throttle, current draw, flight time), a clickable wiring diagram, the three safety tests real pilots run, Betaflight and ArduPilot CLI snippets, and a flight sim with gates, an FPV view, angle and acro modes, and keyboard, gamepad or on-screen sticks.

Everything is in six languages: English, Spanish, French, German, Chinese and Hindi, down to the labels inside the figures.

### Build together

Open a room and share the link or QR code. There are no accounts. Up to eight people see each other's cursors, take roles (wirer, coder, pilot), pass a keyboard baton, and every action lands in the same order on every screen.

The lab partner runs on Muse Spark. It reads your bench (the circuit, your code, the serial output, any active faults) and acts on it. It flashes the part that's wrong in the 3D figure, proposes a fix as a diff you accept or reject, and answers datasheet questions with citations. Before it hands you the answer, it checks who in the room has passed that lesson and asks them, with a teach-back prompt. Chat and partner messages appear in each person's own language, and push-to-talk goes through Muse Voice Transcribe, so you can ask with your hands full of parts.

The Build Night planner takes what everyone wants to build and proposes one project, with a role for each person, a priced parts list and steps. Build Stories turn a session into a short story (what broke, who helped) with a Muse Image cover you can share. Buddy matching suggests people with complementary skills and says why. In the flight sim you race your friends' ghosts. SimLab also runs an MCP server, so Muse, Meta's personal agent, or any MCP client can search the catalogue, run the drone calculator, price parts, plan a build night or open a room.

### Go real

The Build it for real tab prices every item's parts live through SerpApi (Google Shopping, Amazon and eBay) and adds them up. Give it a budget and the optimizer swaps parts and re-runs the drone calculator, so the cheaper build still has the thrust-to-weight and flight time it needs. The same tab finds makerspaces, electronics and hobby shops, and flying fields near you, plus maker events and tutorial videos.

Have a real Arduino Uno? Flash StandardFirmata, plug it in, and the hardware twin connects over Web Serial. The sketch running in SimLab drives the real pins, and the real board's sensors move the figure.

### Prove it

When you pass a skill ([right now: a board's lessons and a drone's safety tests]), our server replays your run with the same checks the page used. Only then does our Solana program write a Proof of Build credential for your wallet and that skill, with a hash of the replayed run on-chain. It's bound to your wallet and can't be transferred. Anyone can post a bounty on a skill, and it pays out in the same transaction that issues the credential. You can also tip whoever helped you. Learners pay nothing: the server pays the fees, there's a one-click devnet wallet if you don't have Phantom, and a public /verify page shows any credential.

The core lab works with every API key missing. Each sponsor feature checks whether it's set up and says so plainly when it isn't.

### Try it as a judge

Open [SITE] on a phone or laptop. No account needed. Boards, Robotics and Drones are in the top menu. Together opens a room you can share with the person next to you. Passport has the one-click devnet wallet.

## How we built it

SimLab is a static Next.js 16 app (React 19, TypeScript, Tailwind) on Vercel, with all six languages prerendered. The lab pages never need a server. The hackathon features are route handlers under /api, plus one small WebSocket relay.

**Figures.** Every board, bench and drone is a self-contained HTML page built with Colorfigures, an MIT-licensed toolkit for hand-inked isometric figures. We vendored its core and patched it: real text measurement so Chinese and Hindi labels fit, a translation hook, an embedded mode and a dark mode. On top of it we wrote two engines, Board Bench (boards and robotics benches) and a drone engine, plus a Python build step and a screenshot checker that runs against every figure. The app embeds each figure in an iframe and talks to it through one postMessage bridge.

**One store per lab.** Each lab page keeps its state in one serializable store that changes only through `dispatch(action)`, and every message to a figure goes through one component. That decision carried the whole hackathon layer. Rooms relay the same actions. The AI partner dispatches the same actions when you accept its change. And the server can verify a run because lesson and test checks are pure functions of the inputs and virtual time.

**Code.** Our interpreters cover an Arduino C++ subset (16-bit `int` on AVR boards, 32-bit elsewhere), MicroPython and Python, and a Verilog subset, all on a virtual clock where `delay()` never freezes the page.

**Meta.** The server talks to Meta's OpenAI-compatible Model API. Muse Spark streams its answers over server-sent events with tool calling: server tools (datasheet search, parts prices) run in a loop of up to four rounds, and client tools (highlight a part, propose a change, ask a peer, open a panel) run in the browser. The same model translates, plans, matches buddies and writes stories. Muse Image draws the covers in our palette. Muse Voice Transcribe accepts WAV only, so the browser decodes each recording and writes a 16 kHz mono WAV itself.

**SerpApi.** The key stays on the server. Engines are whitelisted, results go through SerpApi's cache and a 6-hour cache of our own, and a quota guard refuses uncached searches past a set budget. Each item's parts come from our content and map to search queries. The optimizer is a pure function, so it's easy to test.

**Solana.** `simlab_passport` is an Anchor 0.31 program in Rust with Config, Credential and Bounty PDAs. `issue_credential` pays matching bounties through remaining accounts, and the program emits `CredentialIssued` and `BountyPaid` events. It's tested against a local validator, and its IDL is exported to the app. The app uses Wallet Standard (Phantom, Solflare, Backpack) plus an embedded devnet wallet with a faucet.

**Realtime.** A Node 24 relay built on `ws` runs on a Vultr VM, because Vercel functions can't hold WebSockets. It stamps every shared action with a sequence number, and clients apply actions only in that order, their own included, so there are no optimistic updates to reconcile. A late joiner gets a snapshot from the host, then every action after it. Without a relay, rooms fall back to BroadcastChannel between tabs.

**Tiger Data.** One events hypertable holds flight samples, laps, lesson attempts, faults, room actions, AI calls and issued credentials. Continuous aggregates compute the best lap per course per day and activity per minute, for the leaderboard and the live counter. Buddy profiles live in a regular table and expire after 24 hours.

**Hardware.** Web Serial at 57600 baud, our own Firmata codec, and a bridge between the interpreter's pins and Firmata messages, with a guard that won't drive any pin the lesson treats as an input.

**How the work ran.** All of it was written during the event by AI coding agents: Claude Code orchestrating about [55] agents in parallel. Each agent owned a fixed set of files and worked from written contracts (14 fixed decisions for the core, and a second contract for the hackathon layer). Agents asked each other for changes by writing request files instead of editing each other's code. The gates were TypeScript, ESLint, Vitest unit tests, Playwright end-to-end tests with axe accessibility checks, figure screenshots, and smoke scripts that hit the real services when their keys exist.

## Challenges we ran into

**Many agents, one repo.** The core lab and the hackathon layer were built at the same time, by different agents, in the same codebase. What made it work was boring: strict file ownership, contracts that only change by adding things, one person allowed to install dependencies, and a separate build folder per agent so builds didn't overwrite each other. The core also had to reserve seams for features that didn't exist yet.

**Determinism.** Server verification only works if the same inputs always produce the same run. That meant a virtual clock in every interpreter, and checks written as pure functions before the server that would replay them existed.

**Ordering in rooms.** Shared state gets strange fast. The host leaves while two people are still joining. A phone reconnects holding stale state. Someone acts before their snapshot arrives. The relay holds a joiner's actions until their snapshot lands, promotes a new host when it has to, and replays missed actions after a short reconnect.

**Text inside figures.** Colorfigures estimated label widths from the number of characters. Chinese labels overflowed, and Hindi labels came out twice as wide as they needed to be. We now measure the real text with the canvas API.

**Voice and Next.js 16.** Meta's transcription endpoint accepts only 16 or 24 kHz mono WAV. Browsers record webm or mp4, and our server has no audio decoder, so the browser converts the audio instead. Separately, Next.js 16's Cache Components reject the usual route settings and prerender GET handlers at build time, so every GET that must answer per request calls `connection()` first.

## Accomplishments that we're proud of

- An AI partner whose first move, when someone in the room has passed the lesson, is to ask that person.
- Credentials the server issues only after replaying your run, with a bounty paid out in the same transaction.
- One visual system across every board, bench and drone, including the schematic and breadboard views, in six languages down to the labels inside the figures.
- A drone calculator checked against [342] reference rows from our research tables.
- The core lab works with every key missing, so a sponsor outage takes out one panel, not the app.
- About [55] agents producing one working product in 24 hours.

## What we learned

Most of the sponsor side was new ground for us: Anchor and Rust, ordering messages over WebSockets, Web Serial and the Firmata protocol, and LLM tool calling where some tools run on the server and some in the browser. The agents wrote the code, but we had to understand each piece well enough to write its contract, check what came back, and explain it to a judge.

The bigger lesson was about building with many agents at once. Prompts mattered less than contracts: a fixed list of decisions, one owner per file, and seams reserved early for features that didn't exist yet. The one-store-per-lab rule cost almost nothing on day one, and later it gave us multiplayer, AI actions, replays and on-chain verification.

We also learned how much of a hardware lesson is facts. Every board and drone got a fact sheet with sources before its content was written, and some numbers on the sites we learned from turned out to be wrong. We corrected them and logged each change.

## What's next for SimLab

- Photograph a real breadboard and have SimLab rebuild it in the sim, identifying parts through SerpApi's Google Lens API.
- List SimLab in Meta's Muse connector directory when it opens, and add Facebook Login after app review so stories can go to groups.
- Drive more boards than the Uno through the hardware twin.
- Try it with a real class or club, with chat moderation and teacher-run rooms in place first.
- Move credentials to mainnet once the issuer key lives in proper key management.

## Built with

next.js, react, typescript, tailwindcss, codemirror, colorfigures, svg, javascript, python, node.js, websockets, ws, vercel, vultr, docker, caddy, meta-model-api, muse-spark, muse-image, muse-voice-transcribe, model-context-protocol, facebook-share-dialog, serpapi, solana, anchor, rust, solana-web3.js, wallet-standard, tiger-data, timescaledb, postgresql, web-serial, firmata, arduino, zod, vitest, playwright, axe-core, claude-code

Drop docker and caddy if the relay isn't deployed that way, and arduino and firmata if the hardware twin isn't in the final build.

---

## Prize tracks we're entering

Not entering: the MLH A-Team track (it requires Cursor and Grok Bot as core tools; we used Claude Code), Gemini, NMC2, Capital One, Toyota and Snowflake. Best Novice only if every team member is a first-time hacker.

### [Title Sponsor: Meta/Facebook] Bringing People Closer Together with AI

SimLab's AI exists to get people to each other. The lab partner (Muse Spark with tool calling) reads your bench, points at the wrong part in the 3D figure, and before it gives you the answer it checks who in your room has passed that lesson and asks them, with a teach-back prompt. Everyone reads the room in their own language, and push-to-talk goes through Muse Voice Transcribe so you can talk while holding a breadboard. Meta's three examples are three of our features. The Build Night planner turns a group's wishes into one project with a role for each person. Build Stories turn a session's scattered events into a shared story with a Muse Image cover, shared through Facebook's share dialog. Buddy matching suggests partners with complementary skills and explains why; at HackTX the pool is everyone who opts in on the site. SimLab also exposes an MCP server, so Muse can plan a build night or open a room [tested as a custom connector in Muse / tested with an MCP client].

### [SerpApi] Best Use of SerpApi

SerpApi is what turns the simulator into a real build. Every drone, robotics bench and board kit has a parts list, and Build it for real sends it through Google Shopping, Amazon and eBay for live offers and a total. The budget optimizer then uses those prices to change the engineering: it swaps parts and re-runs the drone calculator so the cheaper build keeps its thrust-to-weight and flight time in range. Google Maps finds makerspaces, electronics and hobby shops, and flying fields nearby. Google Events finds meetups, and YouTube finds tutorials. The lab partner answers datasheet questions from Google results read through the Extract API, and cites them. The key stays on the server behind an engine whitelist, SerpApi's cache, our own 6-hour cache and a quota guard.

### [MLH] Best Use of Solana

Proof of Build is our own Anchor program, `simlab_passport`, on devnet ([PROGRAM_ID]). When you pass, the server replays your deterministic run with the same checks the page used, then calls `issue_credential`. That creates a credential account for your wallet and that skill, holding the replay hash and score. Sponsors, teachers or friends can lock SOL in a bounty for a skill, and the bounty pays out through remaining accounts in the same transaction that issues the credential. Learners need nothing: the server pays fees and rent, there's a one-click devnet wallet for anyone without Phantom, and a public /verify page shows any credential with Explorer links. Rooms add instant tips (a transfer plus a memo) for whoever helped you. Solana's speed and fees are what make it work: a credential can land the moment you pass, and a thank-you tip costs a fraction of a cent.

### [Best Overall] Cinderella's Castle

SimLab is one product with one job: make hardware affordable to learn, and never lonely. Underneath are hand-inked 3D figures for 12 boards, 13 robotics benches and 13 drones; interpreters for Arduino C++, MicroPython and Verilog on a deterministic clock; a drone calculator and flight sim; six languages; real-time rooms with a total order; an AI partner whose tools act on the bench; live parts data; and an on-chain credential that's only issued after a server replay. It's one visual system, and every sponsor feature has a job in the same story. The part we didn't know we needed until we built it is an AI that sends you to a person.

### [Most Entertaining] Jester's Court

SimLab is built to be broken. Reverse the polarity on a board, brown it out by drawing too much current, leave a cold solder joint, or skip the smoke stopper and let the magic smoke out, then find out why it happened and how to fix it. Then fly what you built: through gates in third person or FPV, in angle or acro mode, against your friends' ghosts in real time, with a leaderboard that updates as laps land. Every lesson, bench and drone keeps your progress, so there's always one more to finish.

### [Best Hardware Hack] Brick House

SimLab is about hardware from its first screen, and the hardware twin takes it off the screen. Plug in an Arduino Uno running StandardFirmata, connect over Web Serial, and the sketch running in the simulator drives the real board's pins (digital, PWM and servo). It runs the other way too: a real sensor's readings move the virtual figure and feed the running sketch. A safety guard refuses to drive any pin the lesson treats as an input, so an output never fights a button or a sensor. [Enter this track only if the real Uno demo works at judging.]

### [MLH] Best Use of Vultr

Vercel functions can't hold WebSockets, so SimLab's realtime relay runs on a Vultr VM [in Dallas]. It's a small Node 24 server built on `ws` [running in Docker behind Caddy]. It stamps every shared lab action with a sequence number so every screen applies them in the same order, relays chat, cursors, presence and flight ghosts, hands late joiners a snapshot, and keeps an empty room alive for 30 minutes in case people come back. Every multiplayer moment in our demo goes through it.

### [MLH] Best Use of Tiger Data

Telemetry lives in Tiger Data. One events hypertable holds flight samples, laps, lesson attempts, faults, room actions, AI calls and issued credentials. Continuous aggregates (best lap per course per day, activity per minute) drive the flight leaderboard and the live "at HackTX right now" counter, so those pages read precomputed rows instead of scanning raw events. Opt-in buddy profiles sit in a regular table in the same database and expire after 24 hours, and events are kept for 30 days.

### [MLH] Best .Tech Domain Name

SimLab lives at [SITE], and the realtime relay at rt.[DOMAIN]. [One sentence on why the name fits.]

### [Best Pitch] A Bard's Tale

We tell SimLab through one person, Maya, who wants to build a drone, and we demo it live with a second person on a phone, in Spanish. A backwards LED, a friend's voice answer translated as she speaks, a drone priced to Maya's budget, a race against a ghost, a credential on Solana and a shared story at the end. It takes three minutes, and the last line is the product: nobody builds alone.

---

## Before the event

The idea for SimLab and our hardware research notes predate HackTX. Before 11:30 a.m. on October 24 we had written the product brief and research notes on how the three sites named above teach (lesson structure, calculator tables, interactions), on the Colorfigures toolkit, and on Next.js 16. We also had an earlier SimLab prototype. It is the first commit in this repository (`245763f`), kept only so the rebuild could be audited against it. It was not used: the rebuild deleted it, and none of its code is in SimLab. All of SimLab's code, figures, content and tests were written during the hacking period, between 11:30 a.m. on October 24 and 11:30 a.m. on October 25, by AI coding agents (Claude Code orchestrating parallel agents) working from contracts we wrote at the start of the event. Colorfigures is a third-party MIT-licensed library; our changes to it are listed in `figures/vendor/colorfigures/PATCHES.md`. [We asked the organizers about the pre-event notes, and they said: ___.]

## Credits

- Colorfigures by April Zhu (MIT), built on iso-glow by April Zhu and iso-figure by Tolga Cohce. Credited on SimLab's About page.
- Learn Arduino by Dilum Sanjaya, and the Robotics Engineer and Drone Engineer sites, which shaped our lesson structure. We reused facts (pinouts, formulas, constants), not their source code.

## Confirm before submitting

- [SITE], [DOMAIN], [REPO_URL], [VIDEO_URL].
- [PROGRAM_ID]. `solana/Anchor.toml` declares `BYFLDTLNi946Z8jT4JnxgE8Cpzkr9ud7tSrnThFTv31w`, but at 14:05 CDT on Oct 24 there was no account at that address on devnet. Use the deployed id from docs/hacktx/SOLANA.md.
- Every sponsor feature is live on the production deployment: `/api/status` shows ai, image, voice, search, solana, db and realtime all true. Soften or cut any paragraph whose flag is false.
- Meta model ids. `.env.example` has `muse-spark-1.1`, `muse-image-1.0` and `muse-voice-transcribe-1.0`; check them against docs/hacktx/AI.md. Fill in the Muse connector bracket (custom connector in Muse, or an MCP client only). Confirm Facebook's share dialog works.
- SerpApi engines that actually ship. Keep Google Lens in "What's next" only.
- The credential kinds that work end to end (the "[right now: ...]" bracket under Prove it).
- Content counts: 12 boards, 13 benches, 13 drones, 16 Uno lessons, at least 4 lessons per board, 6 complete languages. If anything was cut, change the numbers here and in PITCH.md, VIDEO.md and JUDGE-QA.md.
- [342] reference rows: re-run `npx vitest run src/lib/drone` before quoting it. [55] agents: the final count.
- Hardware twin with a real Uno (the Best Hardware Hack paragraph and the Built-with tags).
- Vultr region, and whether the relay runs in Docker behind Caddy.
- The organizers' answers: are pre-event research notes allowed, and how many prize tracks can one project enter.
- The public repo: does it keep commit `245763f` and docs/research? If not, delete the sentence about `245763f`. Commit the event work as you go, so the history backs up the 24-hour claim.
- Credit lines: the authors of Robotics Engineer and Drone Engineer, if you can confirm them.
- "New ground for us" in What we learned: true for each team member? Use "I" instead of "we" if you're a team of one.
