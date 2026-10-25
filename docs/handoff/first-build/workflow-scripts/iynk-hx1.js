export const meta = {
  name: 'iynk-hx1',
  description: 'HackTX layer wave 1 for iynk: Meta Muse Spark gateway and lab partner, SerpApi build-it-for-real, Solana passport program and app, realtime rooms (relay + client), Muse/MCP connector, Tiger Data telemetry, hardware twin',
  phases: [
    { title: 'Build', detail: 'ten hackathon-layer agents in parallel, each owning its paths in HX-CONTRACT H12' },
  ],
}

const R = args.root
const S = args.scratch

const CONTEXT = `PROJECT: iynk at ${R} (Next.js 16.4.3 App Router, React 19.3, Tailwind v4, TypeScript). It is its own local git repo (branch main). Do NOT touch the parent git repo at /Users/amar/Codes. Read ${R}/AGENTS.md first: this Next.js has breaking changes versus what you know, so read the relevant guide in ${R}/node_modules/next/dist/docs (route handlers, server-only code, environment variables, streaming, caching) before relying on any Next API.

iynk is the user's HackTX 2026 entry. Read these in full before you design anything:
- ${R}/docs/hacktx/STRATEGY.md : why we build what we build, the tracks we target, the 3-minute demo
- ${R}/docs/hacktx/HX-CONTRACT.md : BINDING for you: env vars, server conventions, every API shape, the realtime protocol, the Solana program interface, ownership (H12) and the dependency rule (H13)
- ${R}/docs/hacktx/BASE_ARCHITECTURE.md : the core's fixed decisions D1-D14 (D14 are the seams you plug into)
- ${R}/docs/hacktx/DEVPOST.md : the tracks and how they are judged
Skim ${R}/docs/SPEC.md (the brief) and read lines 1-40 of ${R}/docs/research/nextjs16-primer.md (binding rules for pages: static, sync default export, params awaited in an async child inside Suspense, localStorage via useSyncExternalStore).

RIGHT NOW about thirty other agents are building the core in this same tree: shell-app (layout, i18n, progress, FigureFrame, src/components/dock types), design-system (src/components/ui, shell), interpreters (src/lib/interp), the figure engines, the drone calculator (src/lib/drone), and the three lab UIs (src/lib/{boardlab,robotics,dronelab}, src/app/[lang]/{boards,robotics,drones}). Their files appear and change while you work. Read them as they land and adapt; never edit them. Until a module you need exists, code against the contract and a small adapter in your own folder, and list the gap in your report.
SCRATCH: ${S}/gm/<your-label>/ for throwaway files. TOOLS: Python Playwright works (python3 -I; p.chromium.launch()); Google Chrome is not installed and Brave headless hangs. WebSearch and WebFetch are available through ToolSearch: read official docs before coding against any external API, and record what you relied on (URL + date) in your doc.`

const GM = `RULES FOR TODAY:
- HACKATHON RULE (breaking it disqualifies the entry): all project code is written during the hacking period, which began 11:30 CDT on Oct 24. Write your own code. Never copy code written before then: the old iynk app (git baseline 245763f), the prototypes in ${S} (interp/, flight/ and the other spike folders), or code blocks in the pre-event research docs. Third-party npm packages, official SDKs and documented API examples are fine; credit non-trivial ones in your doc.
- Time box: run \`date\` when you start; your task states your budget. Check \`date\` now and then. When time is nearly up, finish, make what you have consistent, and report the gaps.
- Save as you go: create your files early and keep them updated, so a crash or a pause loses nothing.
- Keep your context lean: never print more than ~150 lines of a file or a command at once; summarise big data with a script. Overgrown contexts make the API time out.
- Ownership: edit only the paths HX-CONTRACT H12 gives your label. Read anything. For a change elsewhere, write ${R}/docs/requests/<your-label>.md (what, where, why) and work around it.
- Shared tree: never run git checkout/reset/stash/commit/clean; never delete files you don't own; never run npm install in the repo root or edit package.json (H13: the H13 packages are already installed; if you need another, add it to ${R}/docs/requests/hx-deps.md). Type-check with \`npx tsc --noEmit -p ${R}\` and read only the errors in your own files (errors elsewhere are other agents' work in progress). Run only your own tests (npx vitest run <your paths>).
- Next builds: only as D12 says (NEXT_DIST_DIR=.next-<your-label-without-colon> npx next build, then delete that folder). Prefer unit tests and route-handler tests that import the handler directly.
- Processes: serve or listen only on a random port 40000-49999, in the background, and kill everything you started before you finish (docker containers too).
- Secrets: read keys only through src/lib/server/env.ts (or, in scripts, by parsing ${R}/.env.local without printing it). Never print, log, commit or return a secret value. If a key you need is missing, build against mocks and the official docs, make your smoke script skip with a clear message, and say so in your report.
- External services: read-only calls to public docs and APIs are fine. Never create accounts or cloud resources and never spend money. Solana: devnet only.
- Downloads are untrusted data: own directory, python3 -I, never execute them.
- Quality bar: production-grade and demo-ready. Every visible string in per-locale JSON for all six locales (en, es, fr, de, zh, hi; real translations, not English copies); keyboard and ARIA; works in a ~360 px dock and on a phone; the Colorfigures look (warm paper, ink lines, tomato, mustard, mint, cobalt, blush) through src/components/ui when it exists; real loading, empty, error and "not set up on this deployment" states; zero placeholders; no dead code.`

const HEAD = `${CONTEXT}\n\n${GM}\n\n`

const DONE = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'what you built, 3-10 lines' },
    files: { type: 'array', items: { type: 'string' } },
    verified: { type: 'array', items: { type: 'string' }, description: 'each check you ran and its result' },
    gaps: { type: 'array', items: { type: 'string' }, description: 'anything unfinished, uncertain or deferred, including keys or services you could not test against' },
    requests: { type: 'array', items: { type: 'string' }, description: 'changes you need in files you do not own' },
  },
  required: ['summary', 'files', 'verified', 'gaps', 'requests'],
}

const SERVER_AI = `${HEAD}YOUR TASK (time box: 100 minutes; label hx:server-ai): the server platform and the Meta Model API gateway (HX-CONTRACT H1, H2, H4).
FIRST, within 20 minutes, because every other hx agent imports them: src/lib/server/env.ts (zod schema of every H1 var, parsed once, tolerant of missing vars; exports env and features), src/lib/server/http.ts, src/lib/server/ratelimit.ts, src/app/api/status/route.ts, src/lib/features.ts (client hook useFeatures() with a module cache and an all-false SSR default) and .env.example. Small, typed, unit-tested.
THEN:
1. Read Meta's Model API docs before coding: https://dev.meta.ai/docs/ and the cookbook pages for streaming, tool/function calling, vision input and prompt caching; find the Muse Image and Muse Voice Transcribe docs from the site navigation. Record exact endpoints, model ids, request and response shapes and limits in docs/hacktx/AI.md with source URLs. If a model is not on the API, say so and use the documented alternative (for example audio input to Muse Spark instead of a transcribe model).
2. src/lib/server/ai/provider.ts per H4: fetch-based OpenAI Chat Completions format, an SSE stream parser, tool calls (including parallel calls split across chunks), image parts, structured or JSON output if documented, usage, timeouts and one retry; Gemini fallback through its OpenAI-compatible endpoint only when GEMINI_API_KEY is set. Shared request/response/event types go in src/lib/server/ai/types.ts WITHOUT 'server-only', so client code can import them with \`import type\`.
3. The H4 routes: chat (SSE; it declares the tools from src/lib/ai/tools.ts, which hx:partner writes right now, and runs the server-side ones in a loop of at most 4 rounds through a registry in src/lib/server/ai/tools.ts that calls hx:search's functions in src/lib/server/search once they exist; client-side tools pass through as tool_call events), translate (batched, cached by hash, leaves code, pin names, units and markdown untouched), transcribe (multipart), story, image (prompt template enforcing the Colorfigures style: hand-inked isometric, warm paper, flat light/mid/dark bands, the five palette colours), plan (must pick an item that exists in src/content via the generated index when present, otherwise from the D3 ids) and match.
4. Prompts in src/lib/server/ai/prompts/*.ts: partner (the H4 rules: Socratic, peer-first, credit helpers, safety, user's locale, never invent part numbers or pins), translate, story, plan, match.
5. Vitest with mocked fetch for every route and for the SSE parser: streaming deltas, tool-call assembly across chunks, upstream errors, rate limits, not_configured.
6. scripts/smoke-ai.mjs: when META_API_KEY is set, check chat (plain and streaming), one tool-call round trip, translate, image (if the model id is documented) and transcribe (with a tiny generated wav), printing PASS/FAIL per check without secrets; it skips with a message when the key is missing. Run it if the key exists.
You own: src/lib/server/env.ts, src/lib/server/http.ts, src/lib/server/ratelimit.ts, src/lib/server/ai/**, src/app/api/status/**, src/app/api/ai/**, src/lib/features.ts, .env.example, scripts/smoke-ai.mjs, docs/hacktx/AI.md.`

const PARTNER = `${HEAD}YOUR TASK (time box: 110 minutes; label hx:partner): the AI lab partner on every lab page, and Build Stories. This panel is the heart of the Meta demo (STRATEGY sections 5-7): it must feel fast and alive.
1. src/lib/ai/tools.ts FIRST (within 20 minutes; hx:server-ai imports it): partnerTools per H4 (name, description, JSON-schema parameters, runs: 'server' | 'client').
2. src/lib/ai/client.ts: typed client for /api/ai/* (fetch + ReadableStream SSE reader for chat, abort, error mapping to UI states). Import the shared types with \`import type\` from src/lib/server/ai/types.ts (hx:server-ai).
3. src/lib/ai/bench.ts and src/lib/ai/bench/<lab>.ts: describeBench(lab, itemId, state) -> compact text (12 KB max) of what is on the bench: board/drone/bench, lesson, parts and wiring nets, code, compile errors, the serial tail, active faults, test results, calculator numbers. Read the ui agents' store shapes in src/lib/{boardlab,robotics,dronelab}/store.ts as they land; until then a generic, size-capped JSON summariser keeps it working.
4. src/lib/ai/session-log.ts: a bounded log of shared store actions, chat lines, faults and passes with time and who, fed by the LabStore subscription and the room (for stories).
5. src/components/ai/PartnerPanel.tsx (takes LabDockProps): streaming chat with a small markdown subset (bold, inline code, code blocks, lists, links), citation cards, tool cards (highlight_part -> figure.send('flash', ...) plus a callout; propose_change -> a diff with Accept (store.dispatch) / Reject; ask_peer -> a teach-back request through useRoom() from src/lib/realtime (H7.1, written right now by hx:realtime-client; degrade to an "invite a friend" action when not in a room); open_panel), a hint ladder ("hint" then "show me"), suggested questions from the bench state (an active fault gives "Why is the LED off?"), and push-to-talk voice (MediaRecorder -> /api/ai/transcribe; hold the mic button, or M to toggle).
6. src/components/ai/StoryCard.tsx: the Build Story from the session log (/api/ai/story, then /api/ai/image for the cover), shown as a Colorfigures-styled card (title, cover, story, who helped whom), with PNG export (canvas), the Web Share API, copy link and Facebook's share dialog (https://www.facebook.com/sharer/sharer.php?u=<site url>).
7. The i18n namespace ai, in all six locales.
8. Vitest: the SSE reader, tool execution, bench adapters, the session log, plus a PartnerPanel test with mocked fetch.
You own: src/lib/ai/**, src/components/ai/**, src/i18n/messages/*/ai.json.`

const SEARCH = `${HEAD}YOUR TASK (time box: 100 minutes; label hx:search): "Build it for real" with SerpApi (HX-CONTRACT H5; STRATEGY sections 5-6).
1. Before coding, read SerpApi's docs for each engine you use (https://serpapi.com/google-shopping-api.md, amazon-search-api.md, ebay-search-api.md, walmart-search-api.md, google-maps-api.md, google-events-api.md, youtube-search-api.md, search-api.md, extract-api.md, google-lens-api.md; the index is https://serpapi.com/llms.txt). Record the exact parameters and response fields you rely on in docs/hacktx/SEARCH.md.
2. src/lib/server/search/serpapi.ts: client with an engine whitelist, SerpApi's own cache (never no_cache), our LRU (6 h), a quota guard (SERPAPI_MONTHLY_BUDGET), timeouts and one retry; normalisers per engine into the H5 shapes. Export typed functions offers(), nearby(), events(), videos(), web() and extract() that hx:server-ai's partner tools call (search_datasheet, find_parts).
3. The H5 routes under src/app/api/search/.
4. src/lib/search/bom.ts: parts lists from src/content (drone parts, robotics modules, board kits, as the content lands; until then from the content schema and the fact sheets in docs/facts) mapped to good shopping queries; src/lib/search/optimize.ts: the pure budget optimiser (per-slot options with prices + the drone calculator in src/lib/drone, written right now by the calc agent; read its API) -> the best feasible pick under the budget and constraints (min T:W, min flight minutes) with its trade-offs. Unit-test it hard.
5. src/components/search/: RealBuildPanel (LabDockProps; the BOM with live offers per part, cheapest total, in-stock flags, the budget slider driving the optimiser with the calculator's numbers updating), NearbyPanel (makerspaces, electronics and hobby shops, flying fields, plus maker events; uses the browser's geolocation only on request, otherwise a typed place), SourcesList (citations) and VideoHelp.
6. The i18n namespace search, in all six locales.
7. Tests: normalisers against fixtures (record real responses into fixtures with the key stripped when SERPAPI_KEY exists; otherwise from the docs' example JSON), routes with mocked fetch, the optimiser. scripts/smoke-search.mjs runs one call per engine when the key exists.
You own: src/lib/server/search/**, src/app/api/search/**, src/lib/search/**, src/components/search/**, src/i18n/messages/*/search.json, scripts/smoke-search.mjs, docs/hacktx/SEARCH.md.`

const SOL_PROGRAM = `${HEAD}YOUR TASK (time box: 120 minutes; label hx:solana-program): the iynk_passport Anchor program, exactly the H6 interface, deployed to devnet.
Tooling here: anchor-cli 0.31.1 (avm 1.0.0 installed), solana-cli 4.2.2 (Agave), cargo/rustc 1.91.1. Check the Anchor 0.31 docs for anything version-specific and pin the toolchain in solana/Anchor.toml.
1. Workspace in ${R}/solana/: Anchor.toml (cluster devnet), programs/iynk_passport (Config, Credential and Bounty PDAs; initialize, set_issuer, issue_credential with bounty payout through remaining_accounts, create_bounty, cancel_bounty; events; strict constraints: seeds, has_one, signer checks, string lengths, overflow-checked arithmetic, no double claim, learner match, sponsor-only cancel), and TypeScript tests in solana/tests run by anchor test on a local validator, covering every instruction and every failure path.
2. Keypairs live outside the repo in ~/.config/solana/iynk/ (deployer.json, issuer.json, program-keypair if you manage it). Never commit or print a secret key.
3. Deploy to devnet. Fund the deployer with \`solana airdrop\` on devnet (1-2 SOL per call, with backoff; keep the program buffer small with --max-len or the Anchor equivalent). If the public faucet refuses, finish everything else and report the deployer address and the SOL still needed in gaps (the user can use faucet.solana.com). After deploying, call initialize with the issuer's public key.
4. Append to ${R}/.env.local (create it with mode 600 if missing; add only lines that are not already there; never change or print other lines): NEXT_PUBLIC_SOLANA_PROGRAM_ID=<id>, SOLANA_ISSUER_KEYPAIR=<issuer JSON array>, NEXT_PUBLIC_SOLANA_CLUSTER=devnet.
5. After every build, export the IDL and TS types to src/lib/solana/idl/iynk_passport.json and .ts (hx:solana-app imports them). Do the first export as early as possible (within ~40 minutes), then keep it in sync.
6. docs/hacktx/SOLANA.md: the program design (accounts, seeds, instructions, events, checks), the deploy record (program id, upgrade authority, issuer pubkey, Explorer links, transaction signatures of initialize and a test bounty and credential), how to rebuild, test and redeploy, and a changelog of any H6 change (additive only).
You own: solana/**, src/lib/solana/idl/**, docs/hacktx/SOLANA.md, and the three .env.local lines above.`

const SOL_APP = `${HEAD}YOUR TASK (time box: 110 minutes; label hx:solana-app): Proof of Build in the app (HX-CONTRACT H6 app side; STRATEGY sections 5-6).
1. src/lib/verify/**: RunLog and verifyRun(kind, itemId, sub, run) per H6: replay the inputs through the core's pure check functions (D14c) as they land in src/lib/{boardlab,robotics,dronelab} and src/lib/interp; implement drone-safety (smoke stopper, props-off motor direction, accelerometer calibration) and board-lesson first; replayHash = sha256 of the canonical JSON of the inputs. Unit-test passes, failures and tampered logs.
2. src/lib/solana/**: the client: a WalletProvider on Wallet Standard (@solana/wallet-adapter-react; check its React 19 compatibility and use our own small picker built on useWallet if the -react-ui package misbehaves) plus a "iynk devnet wallet" adapter (a Keypair in localStorage iynk:wallet:v1, read through useSyncExternalStore, clearly labelled devnet-only, with export and forget), the program client from src/lib/solana/idl (written right now by hx:solana-program; until it exists, code against the H6 interface), credential reads, tips (SystemProgram transfer plus a Memo instruction "iynk:tip:<roomId>") and bounty create/cancel.
3. src/lib/server/solana/** and src/app/api/solana/**: attest (verifyRun, then issue_credential signed by the issuer key with the matching open bounties as remaining accounts; 409 if already issued), faucet (0.02 SOL, once per address and IP per hour) and credentials, per H6.
4. src/components/solana/**: PassportPanel (LabDockProps: what you can earn on this item, the mint flow with progress states, success with the Explorer link and confetti, bounty payouts shown), TipButton (used in the room UI), BountyForm and CredentialCard.
5. Pages src/app/[lang]/passport/** (your wallet, credentials, bounties you sponsor) and src/app/[lang]/verify/** (static page; ?learner= or ?credential= read on the client; shows the on-chain data with Explorer links). Follow the primer's page patterns; the pages must prerender for all six locales.
6. The i18n namespace solana, in all six locales; docs/hacktx/SOLANA-APP.md (flows, routes, security notes).
7. Tests: verifyRun, the routes with a mocked connection and program, and the wallet store.
You own: src/lib/solana/** (except idl/), src/lib/server/solana/**, src/lib/verify/**, src/app/api/solana/**, src/components/solana/**, src/app/[lang]/passport/**, src/app/[lang]/verify/**, src/i18n/messages/*/solana.json, docs/hacktx/SOLANA-APP.md.`

const RT_SERVER = `${HEAD}YOUR TASK (time box: 90 minutes; label hx:realtime-server): the room relay (HX-CONTRACT H7), to run on a Vultr VM.
1. ${R}/server/realtime/: its own package.json and lockfile (you may npm install inside this folder only), the ws relay implementing H7 exactly (rooms, join, host election, snapshot-request routing, total-order seq for actions echoed to every peer including the sender, chat/cursor/presence/pose fan-out, limits, rate limiting, heartbeat, room expiry, origin allow-list from an env var), structured logs without message contents, graceful shutdown, a /healthz HTTP endpoint and a tiny /metrics JSON (rooms, peers, frames/s).
2. Tests with node:test: protocol, ordering, snapshot plus replay, limits, expiry, host handoff; a load test with 8 peers x 60 frames/s for 30 s on localhost (report p50/p99 relay latency).
3. deploy/realtime/: Dockerfile (node:24-alpine, non-root), compose.yaml with Caddy for TLS (a domain from REALTIME_DOMAIN, or <ip>.sslip.io when no domain is set), Caddyfile; scripts/realtime-deploy.sh (rsync plus ssh docker compose up -d, given VULTR_HOST and an SSH key path; idempotent) and scripts/realtime-vultr-create.sh (creates a small Ubuntu 24.04 VM in Dallas through the Vultr API v2 when VULTR_API_KEY is set). WRITE these scripts but do NOT run anything that creates cloud resources; the orchestrator runs them after the user approves.
4. docs/hacktx/REALTIME.md: protocol details beyond H7, limits, deploy steps, how to run locally (node server.js on a port) for the client agent's tests.
Write the relay early (within ~35 minutes) and say in REALTIME.md how to start it locally, because hx:realtime-client tests against it.
You own: server/realtime/**, deploy/realtime/**, scripts/realtime-*.sh, docs/hacktx/REALTIME.md.`

const RT_CLIENT = `${HEAD}YOUR TASK (time box: 110 minutes; label hx:realtime-client): iynk Together on the client: rooms, chat with live translation, and the /together lobby (HX-CONTRACT H7 and H7.1; STRATEGY sections 5-6 Meta).
1. src/lib/realtime/index.ts FIRST (within 25 minutes; hx:partner and hx:solana-app code against it): the exact H7.1 API (RoomProvider, useRoom, createRoom), with a WebSocket transport (reconnect with backoff, resume, heartbeat) and a BroadcastChannel transport behind the same interface when NEXT_PUBLIC_REALTIME_URL is unset.
2. Store sync: wrap the LabStore so shared actions go to the room and every client applies them only in server seq order (H7 consistency), joiners take the host's snapshot then replay; src/lib/realtime/shared-actions.ts holds the per-lab allow-list (read the ui agents' action types in src/lib/{boardlab,robotics,dronelab}/store.ts as they land; until then, share everything except types starting with "local/" or "ui/"). The code editor uses the keyboard baton: one editor, others see debounced code/replace actions.
3. src/components/realtime/: RoomBar (invite link + QR code via the qrcode package, peer avatars with roles, the baton, leave), ChatPanel (each message shown in the reader's own language through /api/ai/translate with a cache, original on tap; voice messages through /api/ai/transcribe; system lines for joins and passes; host can remove a peer), a presence-cursor overlay component for the figure area, and a TogetherPanel (LabDockProps) that bundles them for LabDock.
4. src/app/[lang]/together/**: the lobby (static; prerendered for all six locales): create a room for any lab item, join by code, Build Buddies (opt-in profile -> /api/buddies (hx:data) -> /api/ai/match -> matches with "why" and "invite to room"), and the Build Night planner (participants and their wishes -> /api/ai/plan -> a plan card with roles and first tasks -> "start this build" opens a room on the chosen item).
5. The i18n namespace together, in all six locales.
6. Tests: unit tests for ordering and convergence with three simulated clients, snapshot plus replay, reconnect; and an integration test against the real relay in server/realtime (written right now by hx:realtime-server; start it on a random port per docs/hacktx/REALTIME.md once it exists; skip with a message until then).
You own: src/lib/realtime/**, src/components/realtime/**, src/app/[lang]/together/**, src/i18n/messages/*/together.json.`

const MCP = `${HEAD}YOUR TASK (time box: 75 minutes; label hx:mcp): iynk as a tool other agents can call: the Muse connector (HX-CONTRACT H10; STRATEGY section 6 Meta).
1. Research first: Meta's current Muse connector docs and submission form (search for "Muse connectors" on Meta's developer sites; third-party reports say custom connectors can be added for one user without review and that the form accepts a hosted MCP server URL or a raw API with an OpenAPI spec; verify what you can and record sources and dates). Also read the MCP spec for Streamable HTTP (modelcontextprotocol.io) and the installed @modelcontextprotocol/sdk's server API.
2. src/app/api/mcp/route.ts plus src/lib/server/mcp/**: a stateless Streamable HTTP MCP server (initialize, tools/list, tools/call; the SDK if it works cleanly in a Next route handler, otherwise a small hand-written JSON-RPC subset) with the H10 tools backed by src/content (the generated index), src/lib/drone (calculator), hx:search's server functions, the ai plan prompt (call hx:server-ai's provider) and the solana credentials read. Input schemas, helpful descriptions, and errors as MCP tool errors.
3. src/app/api/openapi.json/route.ts: an OpenAPI 3.1 document for the same tools, for raw-API connectors.
4. Tests: initialize, tools/list, each tool with mocks; an end-to-end check with the SDK's client against the route handler.
5. docs/hacktx/MUSE-CONNECTOR.md: what Muse can do with iynk (example prompts), how to add it as a custom connector, how to test with an MCP client, auth notes, and what is unverified.
You own: src/app/api/mcp/**, src/app/api/openapi.json/**, src/lib/server/mcp/**, docs/hacktx/MUSE-CONNECTOR.md.`

const DATA = `${HEAD}YOUR TASK (time box: 90 minutes; label hx:data): telemetry, leaderboards and live counters on Tiger Data (Postgres + TimescaleDB) (HX-CONTRACT H8; STRATEGY section 3).
1. Read Tiger Data's docs for hypertables, continuous aggregates, refresh policies, retention and compression (docs.tigerdata.com) and record what you used in docs/hacktx/DATA.md.
2. db/migrations/*.sql (idempotent): the events hypertable, laps_best_daily and activity_1m continuous aggregates with refresh policies, the profiles table with 24 h expiry, 30-day retention, compression on events. scripts/db-migrate.mjs applies them to DATABASE_URL in order and records versions.
3. src/lib/server/db/**: the client (the postgres package; one pooled instance; statement timeouts) and typed queries; the H8 routes (telemetry ingest with validation and batching, leaderboard, buddies GET/POST, live).
4. src/lib/telemetry/**: track(kind, data) with batching, flush on visibilitychange (sendBeacon), a session id, and a no-op when the db feature is off. src/components/data/: Leaderboard (per course, with the player's own rank) and LiveCounter ("right now at HackTX: N builders, M LEDs blinked, K drones flown") for the lobby and dashboard.
5. Tests against a real TimescaleDB in Docker when the daemon is available (docker run -d --rm -p <random>:5432 timescale/timescaledb:latest-pg17 with a throwaway password; stop it before you finish), otherwise mocked; plus route tests.
You own: db/**, src/components/data/**, src/lib/server/db/**, src/app/api/telemetry/**, src/app/api/leaderboard/**, src/app/api/buddies/**, src/app/api/live/**, src/lib/telemetry/**, scripts/db-migrate.mjs, docs/hacktx/DATA.md.`

const HW = `${HEAD}YOUR TASK (time box: 90 minutes; label hx:hw): the hardware twin: code running in the sim drives a real Arduino Uno over Web Serial, and the real board's inputs drive the sim (HX-CONTRACT H9; STRATEGY section 3, Best Hardware Hack).
1. Read the Firmata protocol spec (github.com/firmata/protocol: protocol.md, pin-state, analog mapping, servo) and the Web Serial API (MDN / WICG). Record what you used in docs/hacktx/HARDWARE.md.
2. src/lib/hw/: a Web Serial transport (57600 baud, open/close, read loop, disconnect handling), a Firmata codec (version and firmware report, capability and analog-mapping queries, set pin mode, digital port writes, analog write/PWM, servo config/write, analog and digital reporting) with exhaustive unit tests on byte sequences, and the twin bridge: map the interpreter's pin I/O (src/lib/interp, written right now by the interpreters agent: read its board I/O API as it lands; if it lacks a hook you need, write docs/requests/hx-hw.md and code against an adapter) to Firmata writes, and real digital/analog inputs back into the run, at sane rates.
3. src/components/hw/HardwareTwinPanel.tsx (LabDockProps): feature detection (navigator.serial; other browsers get a short explanation), connect, the detected board and firmware, live pin states, toggles "drive the real board" and "real sensors into the sim", a pin-safety guard (refuse output on pins the sim lesson treats as inputs; warn about current limits), and clear errors.
4. The i18n namespace hw, in all six locales.
5. Tests with a fake serial port (a ReadableStream/WritableStream pair) covering the handshake, writes, reports and disconnects.
6. docs/hacktx/HARDWARE.md: flashing StandardFirmata from the Arduino IDE (File > Examples > Firmata > StandardFirmata), the demo wiring (LED on pin 13 with a resistor; a potentiometer on A0), browser support, troubleshooting.
You own: src/lib/hw/**, src/components/hw/**, src/i18n/messages/*/hw.json, docs/hacktx/HARDWARE.md.`

const run = (prompt, label) => agent(prompt, { label, phase: 'Build', schema: DONE }).then(r => { log(`${label}: ${r ? 'done' : 'FAILED'}`); return r })

phase('Build')
const results = await Promise.all([
  run(SERVER_AI, 'hx:server-ai'),
  run(PARTNER, 'hx:partner'),
  run(SEARCH, 'hx:search'),
  run(SOL_PROGRAM, 'hx:solana-program'),
  run(SOL_APP, 'hx:solana-app'),
  run(RT_SERVER, 'hx:realtime-server'),
  run(RT_CLIENT, 'hx:realtime-client'),
  run(MCP, 'hx:mcp'),
  run(DATA, 'hx:data'),
  run(HW, 'hx:hw'),
])
const labels = ['server-ai', 'partner', 'search', 'solana-program', 'solana-app', 'realtime-server', 'realtime-client', 'mcp', 'data', 'hw']
return Object.fromEntries(labels.map((l, i) => [l, results[i]]))
