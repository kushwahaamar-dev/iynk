# iynk at HackTX 2026: how we try to win

Written 2026-10-24, 13:40 CDT. Sources: the Devpost overview the user pasted (docs/hacktx/DEVPOST.md), Meta's Model API launch post (dev.meta.ai), SerpApi's API index (serpapi.com/llms.txt), and the local toolchain (Solana CLI 4.2.2, Anchor 0.31.1, Rust 1.91, Docker, Vercel CLI and gh are installed and signed in).

## 1. The honest bottom line

Nobody can promise a 100% win. Judging is done by people, and we don't know what the other ~140 teams are building. What we can control is everything judges actually score:

- **Technology:** a working in-browser hardware lab. It has 12 boards, 13 drones, 13 robotics benches, three interpreters (Arduino C++, MicroPython, Verilog), a flight sim, and 6 languages. On top of that sit real-time multiplayer, an AI lab partner, live market data and an on-chain program.
- **Design:** hand-inked Colorfigures you can turn all the way round, see through and explode, in one consistent visual system.
- **Completion:** a demo path rehearsed until it can't break, with every sponsor feature on that path.
- **Learning:** Anchor/Rust, WebSockets, Web Serial and Firmata, and LLM tool calling are all new ground. The pitch should say so.

The strategy is **one product, one story, three sponsor tracks that are essential to it**. It is not twelve bolted-on integrations. Judges at every track see through bolt-ons. Each sponsor below has a job in the product that would be worse without it.

## 2. Rules that can sink us (read these first)

| Rule (from the Devpost page) | What we do |
|---|---|
| "All projects must be built during the hacking period from 11:30 am on October 24th to 11:30 am on October 25th" | All code is written fresh by the build agents after 11:30 today. The old iynk app (git baseline `245763f`) and this morning's prototypes are walled off. Agents are told never to copy them; the half-ported interpreter written at 13:00 was moved out of the repo. The research notes in docs/research predate the event (idea and hardware research). **Disclose that in the Devpost write-up**, and ask the organizers (Freetail help desk or Discord) whether pre-event research notes are fine. If in doubt, keep docs/research out of the public submission repo. HackTX is an MLH partner event, and MLH's rule is that you may have the idea beforehand but not start the work. |
| Team members must be present in person during judging | You must be at UT Austin for judging tomorrow, and able to explain how every part works. I'll write a judge Q&A sheet. |
| A demo video must be on Devpost by the deadline | Record it tomorrow morning (08:30–10:00). Submit by 10:30, not 11:29. |
| Team size 1–4; 18+, college students, US only | Your call. Muse Spark's API is also US-developer only, so the key must come from a US account. |
| The Devpost page you pasted still shows "Join hackathon" | **Click Join hackathon now.** Create the project entry early and edit it later. |
| One project, many prizes? | Not stated on the overview; the rules page is behind Cloudflare. Ask the organizers how many prize categories one project may enter, then pick in the order of section 3. |
| "Build Your Hackathon A-Team" requires Cursor + Grok Bot as your core tools | We use Claude Code, so we are **not eligible** and won't claim it. |

## 3. Track-by-track decision

Fit means how naturally iynk earns the prize. Cost is extra build time on top of the core.

| Track | Prize | Fit | What we build for it | Cost | Decision |
|---|---|---|---|---|---|
| Meta: Bringing People Closer Together with AI (3 winners, Round 2 at Menlo Park) | trip + swag | High once the social layer exists | **iynk Together:** live build rooms, a Muse Spark lab partner that routes questions to people, live translation across 6 languages, a Build Night planner, Build Stories with Muse Image covers, buddy matching, and a Muse connector (MCP) | Large | **Core** |
| SerpApi: Best Use of SerpApi | portable monitors | High | **Build it for real:** live parts prices for every drone/robot/board kit (Google Shopping, Amazon, eBay), a budget optimizer that changes the engineering design, datasheet-grounded answers (Google + Extract API) with citations, makerspaces, shops and flying fields nearby (Maps), maker events (Events), tutorial videos (YouTube) | Medium | **Core** |
| MLH: Best Use of Solana | hardware wallets | Medium-high | **Proof of Build:** our own Anchor program on devnet. The server re-runs your deterministic lab run before it issues a credential PDA. Sponsor bounties held in escrow pay out in the same transaction the credential is issued. Instant peer tips in rooms. A public /verify page. A one-click devnet wallet so judges need no Phantom. | Medium | **Core** |
| Best Overall | MacBook Pro each | High | The whole thing, polished | — | **Target** |
| Most Entertaining | PS5 each | Medium-high | Build-and-break (real failure modes, magic smoke), flight sim with gates, then live races with friends' ghost drones | Small–medium | **Target** |
| Best Hardware Hack | RTX 5080 each | Medium (needs a real Arduino) | **Hardware twin:** Web Serial + Firmata. Code you run in the sim drives a real Uno's pins, and the real board's sensors move the 3D figure. | Medium | **Add** if you can get an Uno + USB cable (MLH hardware lab or your own) |
| Best Pitch (audience vote) | speakers / keyboards | Depends on you | Pitch script, deck, rehearsed 3-minute demo | Small | **Add** |
| MLH: Vultr | M5Stack Tab5 | Medium | The multiplayer relay runs on a Vultr VM, because Vercel can't hold WebSockets | Small | **Add** |
| MLH: Tiger Data | Stream Deck Mini | Medium | Flight/robot telemetry in hypertables; continuous aggregates power leaderboards and a live "at HackTX right now" counter | Small–medium | **Add** |
| MLH: .Tech domain | mic + domain | Trivial | Register a .tech name and point it at Vercel and the relay | Tiny | **Add** |
| MLH: Gemini | swag | Low-medium | Only as a separate feature (photo of a real breadboard to a netlist). Muse Spark stays the brain for the Meta story. | Medium | Later, only if ahead of schedule |
| NMC2: Platform Behind the Agent | AirPods etc. | Low | Would need an "agent studio" product; it dilutes the story | Large | Skip |
| Capital One Nessie / Toyota / Snowflake | various | Low | Bolt-ons | — | Skip |
| Best Novice | Ray-Ban Meta | Only if every member is a first-timer | Nothing extra | — | Enter only if eligible |

## 4. The story

**One line:** iynk is the hardware lab everyone can afford, and nobody has to build alone.

**Problem:** learning hardware costs money (boards, parts, the drone you crash), it's scary (magic smoke, LiPo fires), and it's lonely: tutorials talk at you, and at 2 a.m. nobody is there to tell you the LED is in backwards.

**What iynk does:**
1. **Practice for free.** Wire, code, break and fly 12 boards, 13 drones and 13 robotics benches in the browser. The figures react to your code, and failures really happen.
2. **Build together.** Open a room, and your friend joins from a phone in another language. Muse Spark translates, plans the build with you, and sends you to each other before it answers itself. Every session becomes a shared story.
3. **Go real.** Live prices and stock turn the sim build into a real shopping list under your budget. Nearby makerspaces, shops, fields and meetups take you from online to offline.
4. **Prove it.** Finished the course? A verifiable, non-transferable credential on Solana. A sponsor's bounty pays out at the moment you pass.

Meta's own examples map straight onto it: "synthesize a group discussion into plans everyone would enjoy" is the Build Night planner, "organize scattered family updates into a shared story" is Build Stories, and "identify common interests that could spark a new connection" is buddy matching.

## 5. Architecture after the change

The core stays exactly as built today: static Next.js 16, Colorfigures iframes, in-browser interpreters, localStorage progress. It still works with every key missing. The hackathon layer is additive and plugs into the seams D14 reserved (one store per lab page changed only through `dispatch(action)`, all figure messages through FigureFrame, checks as pure functions of a deterministic run, and a `LabDock` slot on every lab page).

```
Browser: static Next.js 16 on Vercel (works offline; every feature below degrades cleanly)
 ├─ Lab pages: boards / robotics / drones / fly
 │    ├─ FigureFrame iframes (Colorfigures)  <->  LabStore.dispatch(action)
 │    └─ LabDock tabs: Partner | Together | Build it for real | Passport | Hardware
 ├─ /together  rooms lobby, buddy matching, Build Night planner
 ├─ /passport, /verify  credentials on Solana
 └─ Web Serial -> a real Arduino running StandardFirmata (hardware twin)
        | HTTPS (fetch, SSE)                         | WSS
        v                                            v
 Vercel route handlers /api/*                 Realtime relay (Node + ws) on a Vultr VM
  ├─ ai/*        -> Meta Model API: Muse Spark (chat, tools, vision, audio), Muse Image, Voice Transcribe
  ├─ search/*    -> SerpApi: Shopping, Amazon, eBay, Maps, Events, YouTube, Google, Extract
  ├─ solana/*    -> Solana devnet: iynk_passport program (issuer key on the server)
  ├─ telemetry, leaderboard, buddies, live -> Tiger Data (Postgres + Timescale)
  └─ mcp         <- Muse personal agent (custom connector) or any MCP client
```

### The four demo flows and what each one exercises

1. **Stuck, then helped by a person (Meta).** The partner panel sends a compact description of the bench (netlist, code, serial tail, active faults) to `/api/ai/chat`. Muse Spark answers with tools:
   - `highlight_part` flashes the part in the 3D figure.
   - `propose_change` shows a diff you accept or reject.
   - `search_datasheet` runs SerpApi and Extract, then cites the source.
   - `ask_peer` sees that your roommate passed this lesson and asks them first, with a teach-back prompt.

   Your friend answers by voice. The audio is transcribed, then translated into your language, and the answer lands in the room chat.
2. **Sim to real (SerpApi).** The item's parts list goes to `/api/search/offers`. Live offers come back from Google Shopping, Amazon and eBay. The budget optimizer swaps parts and re-runs the drone calculator, keeping T:W and flight time in range. `/api/search/nearby` and `/api/search/events` then list the makerspaces, shops, fields and meetups near you.
3. **Proof of Build (Solana).**
   - The run log (inputs plus virtual time) goes to `/api/solana/attest`.
   - The server re-runs the same pure check functions the page used.
   - It sends `issue_credential` to our program, which creates a credential PDA and pays out any matching bounty escrow in the same transaction.
   - Explorer link, confetti, and the credential appears on /passport and /verify.
4. **Build Story (Meta).** The room's event log and chat go to `/api/ai/story`. Muse Spark writes the story and Muse Image draws the cover. You share it through the Web Share API, a PNG download or Facebook's share dialog.

### Why each sponsor is essential, not decorative

- **Meta:** without Muse Spark the rooms are just a shared canvas. Muse Spark is what crosses languages and skill gaps. It routes people to each other, turns a messy group chat into a plan and turns a session into a story. Voice makes it hands-free while you hold a breadboard.
- **SerpApi:** without live data the simulator stops at the screen. Real prices change real design decisions (the optimizer), real datasheets make the AI trustworthy (citations), and real places put learners in the same room.
- **Solana:** credentials anyone can verify without trusting us. Learners pay nothing (the server pays fees and rent). Escrowed bounties release the instant a verified pass lands. Tips cost a fraction of a cent, so thanking a helper is frictionless.

## 6. Sponsor deep dives (what each judge should see)

### Meta (judged on: strengthens human connection, AI essential and well integrated, originality, working demo)

- **Build rooms:**
  - Anyone can join from a link or QR code; no accounts.
  - Presence avatars and cursors.
  - Roles (wirer, coder, pilot) and a "pass the keyboard" baton.
  - Every action syncs in server order, so all screens agree.
- **Peer-first partner:** Muse Spark gets tools that act on the bench and one that asks a person. The system prompt makes it Socratic: hints before answers, and teach-back. It credits helpers in the story.
- **Live translation:** every chat line and partner message shows in each person's own language (en, es, fr, de, zh, hi), with the original a tap away.
- **Voice:** push-to-talk goes through Muse Voice Transcribe, or through Muse Spark's audio input if the transcribe model isn't on the API. It works hands-free while you're holding parts.
- **Build Night planner:** everyone types what they want. Muse Spark proposes one project everyone enjoys, with a role per person, a parts list (priced through SerpApi) and a schedule.
- **Build Stories:** Muse Spark writes the session up as a short shared story (who did what, what broke, who helped) and Muse Image draws the cover.
- **Buddy matching:** from what you've built and what you want to build next, it suggests complementary partners and explains why. At HackTX the pool is everyone who opens the app, so a judge can be matched live.
- **Muse connector:**
  - iynk exposes an MCP server at `/api/mcp`, plus an OpenAPI spec, so Meta's personal agent can call it: "plan a drone night with my cousins".
  - Meta's directory is waitlisted. Third-party reports say a single user can add a custom connector without review; we verify that tonight.
  - Either way, the endpoint works with any MCP client.
- **Facebook:** the share dialog for stories. Facebook Login needs app review before strangers can use it, so we skip it rather than demo something judges can't try.

### SerpApi (judged on: SerpApi plays a meaningful role)

- Seven or more engines, each with a clear job:
  - google_shopping, amazon and ebay for offers
  - google_maps for nearby places
  - google_events for meetups
  - youtube for tutorials
  - google for datasheets
  - the Extract API for page content
  - google_lens, possibly later, to identify a part from a photo
- Server-side key. An engine whitelist and validation. SerpApi's 1-hour cache plus our own. A quota guard so the demo never burns credits.
- Ask the SerpApi booth for hackathon credits. The free plan is small.

### Solana (MLH: innovate with Solana; fast, cheap, real-world)

- `iynk_passport`, an Anchor program on devnet:
  - Config, Credential and Bounty PDAs
  - `issue_credential` with bounty payout through remaining accounts
  - `create_bounty` and `cancel_bounty`
  - CredentialIssued and BountyPaid events
- Server issuer key. It pays fees, so learners need nothing to receive a credential.
- Wallets: Wallet Standard (Phantom, Solflare, Backpack), plus a one-click embedded devnet wallet funded by our faucet endpoint, so judges can try it on their phones.
- Anti-cheat story: the credential is only issued after the server re-runs your deterministic run. The replay hash is stored on-chain.

## 7. The 3-minute demo (judges' path)

1. **0:00** Hook: "Hardware is the most fun you can have with a computer, and the most expensive, scary and lonely way to learn." Spin the Uno, turn on see-through, explode it.
2. **0:20** Wire an LED, run Blink, and the figure blinks. Flip the LED: nothing. A teammate on a phone (in Spanish) is in the room. The partner highlights the LED and suggests asking her, because she passed that lesson. She answers by voice, and it shows up translated.
3. **1:05** Drone Lab: pick a 5-inch quad and watch the live calc. "Build it for real" shows live prices and a $X total. "Under $150" makes the optimizer swap motors and keep T:W above 4. The nearest makerspace and an AMA field come up.
4. **1:45** Fly it (WASD) through the gates while the teammate's ghost races alongside. The leaderboard updates.
5. **2:15** Pass the three safety tests. The server re-runs them and mints Proof of Build in about a second, and a sponsor bounty pays out. Open Solana Explorer. Tip the teammate.
6. **2:40** The Build Story card appears with its Muse Image cover. Share.
7. **2:55** Close: "12 boards, 13 drones, 13 robots, 6 languages, free in any browser, and nobody builds alone."

Rehearse it to time. Keep a recorded fallback video on the laptop in case the venue Wi-Fi dies; the core lab works offline.

## 8. Timeline (CDT)

| When | What |
|---|---|
| now–15:00 | Core wave (contract, figure platform, shell, design system, interpreters, flight, calc) and the fact sheets are running. Hackathon wave 1 starts now: AI gateway, partner UI, SerpApi, Solana program, Solana app, relay server, relay client, MCP, Tiger Data, hardware twin. |
| 15:00–17:00 | Item content waves (boards, drones, robotics). Hackathon wave 2: LabDock integration into the lab pages, race ghosts, story sharing, e2e tests. |
| 17:00–18:00 | **Deployed demo build:** Vercel production, relay on Vultr, .tech domain. |
| 18:00–02:00 | Content depth, translations, polish, verification, README with every Colorfigures prompt. |
| 02:00–08:00 | Fix waves (agents); you sleep. |
| 08:00–10:30 | Rehearse, record the video, write up Devpost, make the pitch deck. **Submit by 10:30.** |
| 11:30 | Deadline. |

## 9. What only you can do (in this order)

Put each key in `/Users/amar/Codes/ak/simlab/.env.local` (gitignored; I never print it). The variable names are in docs/hacktx/HX-CONTRACT.md §H1.

1. **Devpost:** click "Join hackathon" and start a draft project.
2. **Meta:** sign in at dev.meta.ai, then create a key at dev.meta.ai/api-keys and set `META_API_KEY`. Also ask the Meta team at the venue about hackathon credits.
3. **SerpApi:** sign up at serpapi.com and set `SERPAPI_KEY`. Ask the SerpApi sponsor for hackathon credits.
4. **Vultr:** create an account and claim the MLH credits. Either give me a Vultr API key (`VULTR_API_KEY`) and I'll create a small VM in Dallas, or create an Ubuntu 24.04 VM yourself and give me its IP plus SSH access.
5. **.tech domain:** claim it through MLH, then tell me the name. I'll set DNS for the site and `rt.` for the relay.
6. **Tiger Data:** create a free Tiger Cloud service and set its connection string as `DATABASE_URL`.
7. **Arduino Uno + USB cable** if you can get one (for the Hardware track). Flash File > Examples > Firmata > StandardFirmata.
8. **Optional:** `GEMINI_API_KEY` only if we have time for the Gemini feature.
9. Tell me whether every team member is a first-time hacker (Best Novice), and whether you'll pitch at "A Bard's Tale".

Solana needs nothing from you. If the public devnet faucet rate-limits us, I may ask you to sign in at faucet.solana.com with GitHub for a bigger airdrop.

## 10. Risks and what we do about them

| Risk | Mitigation |
|---|---|
| Too much scope breaks the demo (Completion is a judged criterion) | Hard tiers: the four demo flows first, everything else after. Each feature degrades cleanly when its key or service is missing. A demo checklist runs before deploy. |
| Keys arrive late or have tiny quotas | Agents build against mocks and docs now; smoke scripts run the moment keys land. SerpApi results are cached; there's an AI quota guard. |
| Venue Wi-Fi | The core works offline; phone hotspot; recorded fallback video. |
| Agents step on each other | Strict file ownership, one store contract, per-agent build dirs, and a single dependency installer (me). |
| Rules question about pre-event research | Disclose, ask the organizers, keep pre-event docs out of the submission repo if they object. |
| Judges ask how it works | Judge Q&A sheet and a 10-minute walkthrough for you before judging. |
