# iynk security baseline

Audited commit: `bb546d6a051f0b268576587c6f9f934dde9e766c` (main), audit date 2026-10-26.
Method: read the source and run read-only commands (grep, git log, `npm audit --omit=dev`). Nothing was deployed, started or sent to production. No secret value was printed or copied. Scratch output (the two `npm audit` JSON files) is in `/Users/amar/iynk-master-plan-scratch/audit/security/`. Command and build runs for the same commit are in [runs/COMMANDS.md](runs/COMMANDS.md), [runs/E2E.md](runs/E2E.md) and [runs/BUILD_OUTPUT.md](runs/BUILD_OUTPUT.md); this document did not use them (see section 12).

Labels: VERIFIED (read in source or reproduced), DOCUMENTED (a project doc says so), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.
Severity: blocker (do not ship a real product with this), high, medium, low.

## 1. Summary

iynk has no user accounts and no authentication anywhere. VERIFIED: `grep -rniE "authorization|bearer|jwt|getServerSession|x-api-key" src/app/api src/lib/server` returns four lines: in route and library code only two, one CORS header list (`src/lib/server/mcp/http.ts:9`) and one outbound call to Meta (`src/lib/server/ai/provider.ts:177`); the other two are in `provider.test.ts:37,128`. None reads an incoming credential (re-run in review). All 23 route files (`find src/app/api -name route.ts | wc -l` = 23) are open to the internet.

The defences that exist suit a hackathon demo, and they are the only defences:

- zod validation and body size caps on every JSON route (`src/lib/server/http.ts:81-100`).
- A browser-only origin check (`http.ts:138-148`). It does nothing against curl, scripts or any server.
- An in-memory per-IP rate limiter, per server instance (`src/lib/server/ratelimit.ts:5-15`).
- A per-process counter for SerpApi and a per-instance hourly counter for AI calls.

For a product used by children, the three biggest gaps are:

1. Paid third-party calls (Meta Muse, Gemini, SerpApi) and the Solana issuer wallet are reachable by anyone. The limits reset per instance and are keyed by an IP header.
2. Rooms, chat and the buddy pool have no identity, no moderation, no report or block, and no age or consent flow. A room code is the only secret, and the relay lets any member take over another member's peer id.
3. The Proof of Build check trusts client-supplied flags, and credentials are minted to any wallet address with no proof the caller owns it.

Counts behind this summary:

| Item | Count | Command |
|---|---|---|
| API route files | 23 | `find src/app/api -name route.ts \| wc -l` |
| Routes with no authentication | 23 | same, plus the grep above |
| Routes with no origin check | 2 (`status`, `openapi.json`) | per-file grep, section 3 |
| Routes with CORS `*` | 3 (`/api/mcp`, `/api/mcp/tools/[name]`, `/api/openapi.json`) | `src/lib/server/mcp/http.ts:6-12` |
| Production dependency advisories | 15 (13 moderate, 2 high, 0 critical) | `npm audit --omit=dev --json` |
| Relay dependency advisories | 0 | same, in `server/realtime` |
| Real key-shaped strings in git history | 0 found | section 9 |
| Page groups that get any security header from the app | 1 (`/figures/*`) | `next.config.ts:22-31` |

## 2. Threat table

Entry points are `path:line`. "Control" is what exists today. Gaps are VERIFIED by reading source unless the last column says otherwise. "Not run" means the conclusion follows from the code path and was not executed, because production is off limits and no local relay or app was started.

### 2.1 Cost and quota

| ID | Asset | Threat | Entry point | Current control | Gap | Sev | Label |
|---|---|---|---|---|---|---|---|
| C1 | Meta Muse and Gemini credits | Anyone uses `/api/ai/chat` as a free LLM proxy, or drains credits to deny the feature to everyone | `src/app/api/ai/chat/route.ts:170`, `src/lib/server/ai/guard.ts:16-24` | Origin check (browsers only), 20 req/min/IP, 900 calls/h per instance | No auth. Counters are in memory per instance. One request runs up to 4 model rounds with `maxTokens: 6000` each (`chat/route.ts:17,109`) but counts as one call. A message can be 8,000 chars and the history 60 messages. No global spend cap, no alert | high | VERIFIED |
| C2 | Meta image credits | Same, for images | `src/app/api/ai/image/route.ts:16-19`, `guard.ts:9` | 3 req/min/IP, 60/h per instance | Free-text prompt (3 to 600 chars) goes to an image model. No output moderation of our own (A6) | high | VERIFIED |
| C3 | SerpApi plan | Search budget drained or bypassed | `src/lib/server/search/serpapi.ts:138,198-201,293`, `src/lib/server/env.ts:40`, `src/lib/search/schema.ts:29-36` | `SERPAPI_MONTHLY_BUDGET` default 200, 6 h LRU cache | The "monthly" counter `used` is a closure variable of `createSerpApi` (`serpapi.ts:138`, incremented at `:201`), and `createSerpApi` is called once per process (`serpapi.ts:293`). It resets on every cold start and differs on every serverless instance, so it is not monthly. One `/api/search/offers` POST can carry 25 parts, each asked of 3 shops: up to 75 searches per request (`schema.ts:33`, `DEFAULT_SOURCES`), at 20 requests/min/IP (`search/offers/route.ts:11`). Only unique queries cost; repeats hit the cache. SerpApi price per search is UNKNOWN | high | VERIFIED (code and per-process reset reproduced 2026-10-27, section "Gap fixes"), cost UNKNOWN |
| C4 | SerpApi plan, AI credits | MCP and REST tools bypass the per-route limits | `src/lib/server/mcp/rest.ts:12,19`, `mcp/transport.ts:32,116`, `mcp/tools/market.ts:100-111` | 60 req/min/IP (REST), 120/min/IP (MCP), origin check | `price_parts` calls `offers()` directly with up to 25 parts, so it skips the 15 to 30/min search limits. The origin check cannot refuse a browser: it accepts any `Origin` when `Host` is iynk's own host (`mcp/http.ts:29-33`), and CORS is `*` (`mcp/http.ts:7`). Any web page can call the tools from a visitor's browser | high | VERIFIED |
| C5 | MCP planner availability | One caller blocks `plan_build_night` for everyone | `src/lib/server/mcp/tools/together.ts:47`, `mcp/backends.ts:24`, `http.ts:128-132` | `/api/ai/plan` limit 6/min/IP | The tool calls its own `/api/ai/plan` from the server with no client IP header, so every MCP caller shares one key (6/min per instance). Locally that key is `ai:plan:unknown`. On Vercel the request goes out to the public URL and re-enters through the edge, which probably stamps the function's own egress IP, so the key name there is HYPOTHESIS; the shared-key effect is the same | medium | VERIFIED (no IP header is forwarded, `backends.ts:24-31`), prod key HYPOTHESIS, not run |
| C6 | Rate limiter | Limits are weaker than they look | `src/lib/server/ratelimit.ts:5-15,37-41` | Sliding window in a `Map`, 10,000 keys | Per instance: N warm instances give N times the limit; it resets on deploy and cold start. The file says this is acceptable as "abuse protection and quota guards" (DOCUMENTED), which is not enough for cost control. `MAX_KEYS` eviction (line 28) drops the oldest key under a many-IP flood | high | VERIFIED |
| C7 | Rate limiter keys | IP spoofing defeats every limit | `src/lib/server/http.ts:128-132` | Reads `x-real-ip`, else first `x-forwarded-for`, else `cf-connecting-ip` | The first `x-forwarded-for` value is client-controlled on any host that appends rather than overwrites. Safe only if the platform overwrites `x-real-ip` (Vercel: EXTERNAL, not tested). A missing header yields the shared key `unknown` | medium | VERIFIED code, platform behaviour HYPOTHESIS |
| C8 | Database | Telemetry flood fills the events table | `src/app/api/telemetry/route.ts:19-33`, `src/lib/telemetry/kinds.ts:45-50` | 1,200 req/min/IP, 200 events and 60 KB per request, 2 KB per event, 30 requests/min per session id (not events: `telemetry/route.ts:30-33` calls `rateLimit` once per distinct session per request, so one session can send 30 x 200 = 6,000 events/min), 30-day retention (`db/migrations/0001_events.sql:30`) | The per-session limit only counts sessions named in the batch, and the client picks the session id (any 8 to 64 chars). A batch of 200 events with 200 different ids passes. (Review correction: the original text said 30 events/min; the limit counts requests.) Upper bound per IP: 1,200 requests x up to 60 KB per minute. The pool is 3 connections per instance (`db/client.ts:19`) | medium | VERIFIED |
| C9 | Issuer wallet SOL | Drain by minting credentials or by faucet | `src/app/api/solana/attest/route.ts:7-14`, `faucet/route.ts:7-13`, `src/lib/server/solana/faucet.ts:18-30,56` | Attest 10/min/IP; faucet 5/min/IP plus 1 grant per address and per IP per hour; 0.2 SOL treasury reserve | The same key is issuer, fee payer and faucet treasury. Faucet grants live in an in-memory `Map` per instance. Each attest pays rent and fee for any fresh wallet. The cluster is a literal `"devnet"` (`env.ts:43`), so the value at risk is nil today | medium (devnet), blocker (mainnet) | VERIFIED |

### 2.2 Identity, rooms and the realtime relay (`server/realtime/src`)

| ID | Asset | Threat | Entry point | Current control | Gap | Sev | Label |
|---|---|---|---|---|---|---|---|
| R1 | Room privacy | Guess or leak of a room code | `server/realtime/src/protocol.js:9`, `src/lib/realtime/protocol.ts:79-80,104-115` | 6 chars from a 31-char alphabet, drawn with `crypto.getRandomValues` and rejection sampling | Entropy is 31^6 = 887,503,681 (about 29.7 bits; `node -e` check). With the 500-room cap (`config.js:29`), a random guess hits a live room with probability about 5.6e-7 (ESTIMATED: 500 / 887.5M). The code is the only credential: whoever holds the link or code joins, with no host approval, no password, and expiry only 30 min after empty (`config.js:14`). Codes travel in URLs (`?room=`) and are stored on telemetry rows (`src/lib/realtime/provider.tsx:171`, `telemetry/client.ts:123`) | medium | VERIFIED, probability ESTIMATED |
| R2 | Room existence and roster | Anyone can ask "is code X live, what item, who is in it" | `server/realtime/src/relay.js:219-299`, `src/lib/realtime/probe.ts:19-50` | Probe joins as an invisible `lobby` peer | The welcome message returns lab, item and the full peer list (names, languages, progress keys) to any joiner. There is no "room not found"; joining a code creates it. Enumerating costs about 1.8 million guesses per live room (ESTIMATED: 887.5M / 500), each a WebSocket join. Only the 64-sockets-per-IP cap (`config.js:31`) slows it | medium | VERIFIED |
| R3 | Room capacity | One IP fills all 500 rooms for 30 minutes | `relay.js:219-229,177-185`, `config.js:14,29,31` | `maxRooms` 500, 64 concurrent sockets per IP | A join to an unknown code creates a room. The cap is on concurrent sockets, not on join rate, so one IP can connect, join and close in a loop. Empty rooms stay 30 minutes (`roomTtlMs`). 500 junk rooms give `server_full` to every real user for that time | high | VERIFIED, reproduced 2026-10-27 (section "Gap fixes") |
| R4 | Peer identity | Impersonation and takeover of any member, including the host | `relay.js:231,248-264`, `protocol.js:136-153`, `room.js:47-50` | Peer id must match `^[A-Za-z0-9_-]{1,64}$` | The client chooses its peer id, and the relay broadcasts every id (`relay.js:273,285`). A second `join` with an existing id replaces that member's connection (`replaced`, close 4001) and inherits its role. Host is "first key in the Map" (`room.js:47-50`), so replacing the host's id makes the attacker the host. Any member can do this to any other | high | VERIFIED, reproduced 2026-10-27 (section "Gap fixes") |
| R5 | Moderation | Kick is trivially evaded; no report or block | `relay.js:86-94,230`, `room.js:121-128` | Host can kick; ban list holds 64 peer ids | Bans are by client-chosen peer id, so a new random id rejoins. See R4 for who can become host. `grep -rniE "report|\bmute|moderat|blocklist" src/components/realtime` finds no report, block or mute control (the original pattern with plain `block` matches CSS classes such as `inline-block`; the review re-ran with the narrower pattern and read the component list) | high (child safety) | VERIFIED |
| R6 | Authorisation of actions | The relay enforces almost nothing; the keyboard baton is client-side | `relay.js:53-58,178-179`, `src/lib/realtime/room.ts:589-596`, `store-sync.ts:39-42` | Relay checks frame shape and that the sender is synced. Honest clients drop build actions from non-holders | Any peer can send the `room/baton` action, and `applyOne` does not check the sender (`room.ts:589-596`). A modified client takes the baton and its edits are then accepted by everyone. An action is any JSON object up to 64 KB (`protocol.js:172-179`) | medium | VERIFIED |
| R7 | Spoofed system or AI lines | Fake "AI" or "system" chat messages | `protocol.js:6,188-194`, `relay.js:182-186` | Text capped at 500 graphemes; control and bidi characters stripped | The chat `kind` is client-chosen from `text, voice, ai, system`. Any member can post a line that renders with the AI chip (`src/components/realtime/ChatPanel.tsx:52-54`) or as a system line | medium | VERIFIED |
| R8 | Chat flood | Spam inside a room | `relay.js:155-160,182-186`, `config.js:9,24` | One token bucket per socket, 60 frames/s for all frame types; socket closed after 600 drops in 5 s | No chat-specific limit: 60 chat lines per second per member, up to 8 members. The last 50 lines replay to every new joiner (`relay.js:294`) | medium | VERIFIED |
| R9 | Snapshot trust | A malicious member poisons what new joiners load | `relay.js:35-51`, `src/lib/realtime/room.ts:555-565` | Snapshot accepted only from the peer the relay asked; item must match | The snapshot is any JSON up to 512 KB and goes to the lab store's `hydrate()`, including code text. The first synced member controls every joiner's starting state | medium | VERIFIED |
| R10 | Relay admin surface | `/metrics` is public | `server/realtime/src/relay.js:215-232`, `deploy/realtime/Caddyfile:4-7` | Counts only (rooms, peers, frame rates, memory) | No auth. Leaks load and room counts to anyone | low | VERIFIED |
| R11 | Relay origin policy | Origin check protects browsers only | `server/realtime/src/config.js:147-167` | Allowed-origin list from `REALTIME_ALLOWED_ORIGINS`; compose refuses to start without it (`deploy/realtime/compose.yaml:15`) | Clients with no `Origin` pass by design (`config.js:147-151`). `*` is accepted. The production value was not read (UNKNOWN) | low | VERIFIED code, prod value UNKNOWN |
| R12 | Relay hardening | Container and TLS | `deploy/realtime/Dockerfile:3-21`, `compose.yaml:18-22` | Non-root `node` user, read-only root, `cap_drop: ALL`, `no-new-privileges`, 512 MB cap, Caddy HTTPS, HSTS; `TRUST_PROXY` correct for Caddy (`relay.js:77-85`) | Single process, no persistence, no firewall rules in the repo. Sound for a demo | low | VERIFIED |

### 2.3 Code execution and the figures

| ID | Asset | Threat | Entry point | Current control | Gap | Sev | Label |
|---|---|---|---|---|---|---|---|
| X1 | Browser | User code evaluated as JavaScript | `src/lib/interp/**` | Hand-written interpreters | Not present. `grep -rnE "(^\|[^.\w])eval\(\|new Function\(\|importScripts\|vm\.run\|new Worker\("` over `src`, `server/realtime/src`, `figures/engine` finds: the Python interpreter's own method named `eval` (`python/runtime.ts:702`, a tree walker), one Worker for lesson checks (`check-client.ts:38`), and a build script that runs a trusted vendored file in `node:vm` (`src/components/shell/dashboard/hero.gen.mjs:32`). The C++, MicroPython and Verilog interpreters are parsers and tree walkers | none | VERIFIED |
| X2 | Tab availability | Learner code, or a room peer, freezes or crashes a tab | `src/lib/interp/python/runtime.ts:1071-1077`, `arduino/interp.ts:393-405`, `run.ts:88,244`, `exec.ts:15,116-130` | 400,000 statements per step, call depth caps 100 and 120 (`runtime.ts:227`, `interp.ts:63`), 5,000,000 ops inside one expression | No memory or size cap. `"x" * k` calls `s.repeat(k)` and `[0] * k` builds an array with `Array.from({length:k}, () => s.items).flat()` in one expression (`runtime.ts:1071-1077`). Review re-check in Node 24 (V8): the same call with `k=10**9` for a string and `k=10**8` for a list throws `RangeError` instead of freezing, so those two literals are not the attack; `k=5*10**7` for a list took 2.7 s on the main thread in Node and `k=10**7` took 0.4 s, which is the real freeze (ESTIMATED for browsers: same V8 limits in Chrome, other engines differ, not run in a browser); C arrays take any declared size (`interp.ts:393`). Interactive runs execute on the main thread; only lesson checks run in a Worker with a 20 s budget (`check-job.ts:11`). In a room a peer can push code to everyone with `code/replace` (`shared-actions.ts:57-63`), so one member can freeze every member's tab | medium | VERIFIED (no cap in source); freeze reproduced through the real interpreter 2026-10-27 (section "Gap fixes"), still not run inside an actual browser tab |
| X3 | Same-origin figures | A figure is attacked or reaches the host | `src/components/figure/FigureFrame.tsx:231,351-354`, `figures/engine/embed.js:30-34`, `next.config.ts:22-31` | Host checks `event.source === iframe.contentWindow` and `event.origin === window.location.origin`, and posts only to its own origin. The figure checks `ev.source === host`, host origin, `source:"iynk"`, `v:1`. Figures send `frame-ancestors 'self'` and `nosniff`. All 80 files in `public/figures` are first-party static HTML (`find public/figures -type f \| wc -l`) | The iframe has no `sandbox` attribute, so a figure has full same-origin access (localStorage including the devnet wallet key). Safe only while every figure is first-party and none renders room or AI text as HTML. Host strings do reach `innerHTML` inside figures (`figures/vendor/colorfigures/core.js:534` via `CF_L`) but they come from first-party i18n JSON over the checked channel. `?origin=` (`embed.js:12-13`) lets a framed figure post to any http or https origin; framing by other sites is blocked | low (today), blocker if user content is ever rendered in a figure | VERIFIED |
| X4 | Site pages | Clickjacking and weak default headers | `next.config.ts:19-33` | Only `/figures/:path*` gets `frame-ancestors 'self'` | No CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` or `frame-ancestors` for any page or API route (repo-wide grep finds only `next.config.ts:28`). No `middleware.ts` or `proxy.ts`. The inline boot script (`src/lib/settings/theme.tsx:11,21-26`) will need a nonce or hash when a CSP is added. HSTS on the Vercel domain: UNKNOWN (platform default, not read) | medium | VERIFIED |
| X5 | Model output rendered | Injected or off-topic links in the partner reply | `src/lib/ai/markdown.ts:22`, `src/components/ai/Markdown.tsx:41-52` | Output is parsed to a React tree, never HTML; links must be `http(s)://` and open with `rel="noopener noreferrer"` | Any https URL the model writes is clickable by a child. Search text reaches the model unfenced (A3) | medium | VERIFIED |

### 2.4 Solana, MCP and OpenAPI

| ID | Asset | Threat | Entry point | Current control | Gap | Sev | Label |
|---|---|---|---|---|---|---|---|
| S1 | Credential integrity | Forged "Proof of Build" | `src/lib/verify/drone-safety.ts:21-33`, `src/lib/verify/runlog.ts:14-26`, `src/lib/verify/index.ts:12,32-56` | Server re-runs the log and ignores the client `result`. Only `drone-safety` is verifiable; other kinds return `unsupported` (`index.ts:12`) | The replay starts from a client-supplied `init` event that includes `smokeOk`, `motorOk`, `accOk`, `plugged` and `fault` (`drone-safety.ts:21-33`), plus `assist` events. A script can write a log that passes (by reading the code; no forged log was submitted, so the exploit is not run). No server-issued session, nonce or timing check. Replay protection is only "one credential per wallet and skill" (PDA, `attest.ts:66-70,100`), and wallets are free | medium (devnet), blocker if credentials carry value | VERIFIED (source and forged-log replay), reproduced 2026-10-27 (section "Gap fixes") |
| S2 | Credential ownership | A credential is minted to any address | `src/lib/server/solana/attest.ts:11-17,64-86`, `attest/route.ts:6-14` | Address must be a valid ed25519 point (`common.ts:6-15`) | `learner` is not proven: no wallet signature. Anyone can issue a credential to someone else's wallet and trigger open bounties for it (`attest.ts:72`). Payout goes to the named learner | medium | VERIFIED |
| S3 | Issuer key custody | One hot key does everything | `src/lib/server/env.ts:18-29,42`, `src/lib/server/solana/context.ts:45-57`, `.env.example` | Key is a JSON array in the env var `SOLANA_ISSUER_KEYPAIR`, parsed once, never logged (`context.ts:5-7`). `.env.local` has mode 600 and is git-ignored | Same key is credential issuer, fee payer and faucet treasury. No rotation, no KMS or HSM, no spending limit. `.env.local` on the developer machine also holds model keys, `VULTR_API_KEY` and database credentials (names checked, values not read) | medium (devnet), blocker (mainnet) | VERIFIED |
| S4 | Faucet abuse | Many wallets, many IPs | `src/lib/server/solana/faucet.ts:18-30,37-76` | Per-address and per-IP hourly grant in memory; balance cap 0.05 SOL; treasury reserve | Per instance, so cold starts reset it. The treasury also pays attest fees, so draining it disables credentials (`faucet_dry`) | low (devnet) | VERIFIED |
| S5 | Client wallet | Secret key in `localStorage` | `src/lib/solana/devnet-wallet.ts:12,58-75` | Labelled "devnet only"; created on request | Base58 secret key in plain `localStorage` under `iynk:wallet:v1`. Any XSS or same-origin figure can read it. Fine for devnet only | low (devnet), blocker (mainnet) | VERIFIED |
| S6 | Anchor program | Rust program logic | `solana/programs/iynk_passport/src/` | Reviewed 2026-10-27, see section 13: signer, owner, PDA-seed, account-close and integer-maths check per instruction; `cargo clippy` run | No finding changes an existing severity. One new low item: `issue_credential`'s `pay_bounty` never closes the paid bounty PDA (only `cancel_bounty` does), so its rent-exempt lamports stay locked in the account after payout instead of returning to the sponsor (section 13) | low (new) | VERIFIED |
| M1 | MCP and REST tools | Unauthenticated tools that cost money | `src/lib/server/mcp/tools/index.ts:10`, `mcp/registry.ts:62-79` | Seven tools, zod input and output validation, annotations say read-only. Body caps 256 KB (MCP) and 64 KB (REST) | Paid: `price_parts` (SerpApi, 25 parts) and `plan_build_night` (model). `get_passport` is a devnet RPC read. `create_room` only builds a link and keeps no server state (`together.ts:55-80`). No tool mutates data. See C4 and C5 | high (cost) | VERIFIED |
| M2 | OpenAPI document | Public API description | `src/app/api/openapi.json/route.ts:11-14` | Cached 300 s, CORS `*`, no origin check, no rate limit | Intentional. It documents the paid tools to anyone | low | VERIFIED |
| M3 | MCP transport | DNS rebinding and browser abuse | `mcp/http.ts:21-33` | `Origin` must pair with a `Host` that is the site hostname or loopback | Stops rebinding. Does not stop an ordinary cross-site page (its `Host` is the real host), by design per the comment at `http.ts:23-28` | low | VERIFIED |

### 2.5 AI routes and prompt injection

Every AI route validates the model's reply with zod and renders it as React elements. No AI route writes to storage. The model has six tools; two run on the server (`src/lib/server/ai/tools.ts:21-30`), four in the browser (`src/lib/ai/run-tools.ts`).

| ID | Asset | Threat | Entry point | Current control | Gap | Sev | Label |
|---|---|---|---|---|---|---|---|
| A1 | Partner chat | Learner or bench text steers the model | `src/lib/server/ai/prompts/partner.ts:12-31`, `prompts/language.ts:18-21`, `chat/route.ts:45-66` | Rules first; untrusted text inside `<<< >>>` fences with the delimiters neutralised; `bench` capped at 12 KB; peer names at 24 | The fence is advice to the model, not enforcement. The chat history is not fenced, because it is the conversation. The route accepts `role: "assistant"` and `role: "tool"` messages from the client (`chat/route.ts:22-26`), so a caller can forge earlier assistant turns and tool results | medium | VERIFIED |
| A2 | Room text to the model | Another child's text reaches the model and the answer returns to the room | `src/app/api/ai/story/route.ts:63-68,76-80`, `src/lib/server/ai/plan.ts:55-56`, `translate/route.ts:66-70` | Story log, plan group chat and translation text pass through `quoted()` | Same advisory fence. Output goes to every room member (translation, story). The translation cache is shared across callers (`translate/route.ts:28-38`), keyed by a hash of the text, so a poisoned translation of a string is served to anyone who sends that string. Low likelihood | medium | VERIFIED |
| A3 | Search results to the model | Indirect injection from the web | `src/lib/server/ai/tools.ts:36-45`, `search/serpapi.ts:272-281` | Up to 3 results and 2 pages (3,000 chars each) go in a tool message with a "cite the url" note | Page text is not wrapped in `quoted()`. A page can instruct the model, and the model can then write a link a child clicks (X5) or call `ask_peer` (A4) | medium | VERIFIED |
| A4 | Model-initiated actions | The model acts without the learner | `src/lib/ai/run-tools.ts:62-107` | `propose_change` shows a diff the learner accepts or rejects. `highlight_part` and `open_panel` are cosmetic | `ask_peer` sends a model-written message to another person in the room immediately, with no confirmation (`run-tools.ts:76-88`, `ctx.room.ask`). Injection through A1 to A3 can therefore put model-written text in front of other children | medium (child safety) | VERIFIED |
| A5 | Buddy matching | Strangers' profile text enters the prompt | `src/app/api/ai/match/route.ts:16-27,45-46,62-72` | At most 50 profiles, `wants` capped at 300, reply locked by zod enums to known ids and catalog keys | `why` and `sharedInterest` are free model text shown to the user, based on strangers' free text. The client sends the pool, so a caller can inject any profile. No moderation of `wants` | medium | VERIFIED |
| A6 | Moderation | Harmful text or images reach children | all `/api/ai/*` | `safety_identifier` (hashed IP) sent to Meta (`provider.ts:113-115`) | No input or output moderation of our own. Safety depends entirely on the upstream providers. The image route is a general text-to-image endpoint with a style wrapper (`prompts/image.ts`) | high (child safety) | VERIFIED |
| A7 | Voice data | Children's audio leaves the site | `src/app/api/ai/transcribe/route.ts:48-85` | 4 MB cap, 120 s, WAV or MP3 sniffed, 20 req/min/IP | Audio goes to Meta. iynk does not store it (no write in the route). No consent text or age gate before the mic is used | medium | VERIFIED |

### 2.6 Data, storage and child-safety surfaces

| ID | Asset | Threat | Entry point | Current control | Gap | Sev | Label |
|---|---|---|---|---|---|---|---|
| D1 | Buddy pool | Public list of strangers' free-text profiles, usable for contact or grooming | `src/app/api/buddies/route.ts:27-56`, `src/lib/server/db/queries.ts:139-167`, `db/migrations/0003_profiles.sql` | Opt-in, 24 h expiry, owner token (SHA-256 stored), 120 reads and 30 writes per minute per IP, name cleaned of control and bidi characters | `GET /api/buddies` returns the newest 50 live profiles (name, language, interests, built list, `wants` up to 280 chars) to anyone, with no auth. `wants` and `interests` are only trimmed (`db/schema.ts:81-83`): phone numbers, handles, links and places pass. No report path, no blocklist, no age check. There is no location field (`schema.ts:77-84`), but free text can hold one | high (blocker for a child product) | VERIFIED |
| D2 | Leaderboard | Offensive names and faked times on a public board | `src/lib/server/db/schema.ts:30-34`, `queries.ts:53-87`, `db/migrations/0002_aggregates.sql:14` | Name cleaned of control chars, cut to 24 code points. The shipped client sends no name (`FlyWorkspace.tsx:123,125`) | The server accepts a `name` on any `flight.lap` event from any caller and shows it publicly. No profanity or PII filter. Lap time floor is 1 s (`kinds.ts:56`), self-reported, so anyone can post an impossible time and take rank 1 | medium | VERIFIED |
| D3 | Telemetry | Default-on tracking of children | `src/lib/progress/storage.ts:17-18,38`, `src/lib/telemetry/client.ts:99,123`, `src/i18n/messages/en/shell.json:138` | A setting turns it off; random per-browser id. DOCUMENTED copy: "anonymous usage counts ... never your name or your code" | Default is on (`telemetry: true`, `storage.ts:38`). Events carry the room code and item, and free-form `data` up to 2 KB for most kinds. No consent step, no parent route, no privacy policy page. A hash of the IP is sent to the model provider as a user id. Legal duty is EXTERNAL (COPPA and GDPR-K apply to under-13 and under-16 users); this is not legal advice | medium | VERIFIED (code), law EXTERNAL |
| D4 | Location | Approximate location sent to a third party | `src/components/search/NearbyPanel.tsx:129-146`, `src/lib/search/schema.ts:39-55`, `serpapi.ts:239-252` | Browser permission prompt; coordinates rounded to 3 decimals (about 100 m); copy says "never stored" (`search.json:95`) | Coordinates and typed places go to SerpApi and sit in the 6 h in-memory cache keyed by the query (`serpapi.ts:48`), so "never stored" is not strictly true. Typed text is free-form | low | VERIFIED |
| D5 | Local storage | What a browser holds | table below | Per browser; no PII fields | Devnet wallet secret in plain text (S5). Buddy id and token in plain text (`Buddies.tsx:32-39`); the token is the only credential for that profile | low | VERIFIED |
| D6 | Stories | Child-related content shared outside the room | `src/app/api/ai/story/route.ts`, `src/components/ai/StoryCard.tsx:205` | Generated on request; share opens a pop-up | Story text and image prompt can contain peers' names and chat. No retention on our side (no write). Moderation as in A6 | low | VERIFIED |
| D7 | Public rooms | Public chat with strangers | `src/lib/realtime/probe.ts`, `server/realtime/src/relay.js` | Join needs a code | The relay has no room-listing endpoint, so rooms are private by code. The risk is R1, R2, R4, R5 | see R rows | VERIFIED |

Browser storage inventory (`grep -rnE "localStorage|sessionStorage|document.cookie" src`):

| Key | Holds | Source |
|---|---|---|
| `iynk:v1` | Progress and settings, including the telemetry flag | `src/lib/progress/storage.ts` |
| `iynk:together:v1` | Self-chosen display name and colour | `src/lib/realtime/identity.ts:6` |
| `iynk:buddies:v1` | Buddy-pool id and owner token | `src/app/[lang]/together/Buddies.tsx:23` |
| `iynk:wallet:v1` | Devnet secret key, base58 | `src/lib/solana/devnet-wallet.ts:12` |
| telemetry session key | Random per-browser id | `src/lib/telemetry/client.ts:68-78` |
| flight pad, best lap, ghost, serial height, board values | Gameplay UI state | `src/lib/flight/*`, `src/components/boardlab/*` |
| `sessionStorage`, drone summary | Per-craft run summary | `src/lib/dronelab/session.ts` |
| cookie `LANG_COOKIE` | Language choice, `samesite=lax`, one year | `src/components/shell/LanguagePicker.tsx:26` |

No name, email, date of birth or contact-detail field exists in the product. Names are free text in rooms and in the buddy pool.

### 2.7 Supply chain and secrets

| ID | Asset | Threat | Entry point | Current control | Gap | Sev | Label |
|---|---|---|---|---|---|---|---|
| P1 | Production dependencies | Known advisories | `npm audit --omit=dev --json` (saved as `audit-root.json`) | Exact versions pinned in `package.json` (for example `next 16.4.3`, `@solana/web3.js 1.99.0`) | 15 advisories: 2 high, 13 moderate, 0 critical (section 6). All trace to the Solana packages and `@coral-xyz/anchor`; none to Next, React, zod or postgres. Relay: 0 | medium | VERIFIED (tool output) |
| P2 | Third-party scripts | Tracking and injected code | grep for `<script`, `next/script`, analytics names over `src/app` | None found | The only script tag is the first-party theme boot script (`theme.tsx`). No analytics, ads, tag managers, font CDNs or social widgets in `src/app`. External links are plain anchors | none | VERIFIED |
| P3 | Secrets in git | Keys committed | `git log --all -G` scans, section 9 | `.gitignore:39` ignores `.env*` except `.env.example`; `.env.example` has empty key values; `.vercelignore` drops env files, `/docs`, `/server`, scripts and tests from uploads | No key-shaped string found in 797 commits | none found | VERIFIED |
| P4 | Response fingerprint | Framework banner | `next.config.ts` | None | `poweredByHeader` is not set to false (0 hits), so `X-Powered-By: Next.js` is sent unless the platform strips it. Production: UNKNOWN | low | VERIFIED code |

## 3. Route-by-route inventory

Origin and rate columns come from a per-file grep of `checkOrigin|guardAi|originAllowed|handleSearch|handleMcpPost|handleToolPost|open(req` and the rate limit helpers. "Origin" means the browser-only same-origin check (`http.ts:138`). No route has authentication.

| Route | Methods | Origin check | Rate limit (per IP, per instance) | Validation | What it can cost or leak |
|---|---|---|---|---|---|
| `/api/ai/chat` | POST | yes | 20/min + 900/h shared | zod, 256 KB | Up to 4 model rounds, plus SerpApi via tools (3 pages or 10 parts per round) |
| `/api/ai/image` | POST | yes | 3/min + 60/h shared | zod, 8 KB | One image generation |
| `/api/ai/match` | POST | yes | 10/min + 900/h | zod, 256 KB, pool of 50 | One model call |
| `/api/ai/plan` | POST | yes | 6/min + 900/h | zod | One model call (8,000 tokens) |
| `/api/ai/story` | POST | yes | 6/min + 900/h | zod | One model call |
| `/api/ai/transcribe` | POST | yes | 20/min + 900/h | multipart, 4 MB, sniffed | One audio model call |
| `/api/ai/translate` | POST | yes | 60/min + 900/h | zod, 20 texts x 2 KB | One model call; cached in memory (5,000 entries) |
| `/api/buddies` | GET, POST, DELETE | yes | 120/min read, 30/min write | zod, 8 KB | Leaks the newest 50 live profiles to anyone |
| `/api/leaderboard` | GET | yes | 300/min | zod query | Public names and times |
| `/api/live` | GET | yes | 600/min | none needed | Aggregate counters; CDN cacheable |
| `/api/telemetry` | POST | yes | 1,200/min + 30/min/session | zod per event, 60 KB | Database writes |
| `/api/status` | GET | no | 120/min | none | Which features are on; one devnet RPC read |
| `/api/mcp` | POST, GET, DELETE, OPTIONS | host check | 120/min | JSON-RPC + zod, 256 KB | Calls `price_parts` and `plan_build_night`; CORS `*` |
| `/api/mcp/tools/[name]` | POST, OPTIONS | host check | 60/min | zod, 64 KB | Same tools |
| `/api/openapi.json` | GET, OPTIONS | no | none | none | Public document |
| `/api/search/web` | GET, POST | yes | 15/min | zod | 1 search, or 3 with `extract` |
| `/api/search/offers` | GET, POST | yes | 20/min | zod, 25 parts | Up to 75 searches per call |
| `/api/search/nearby` | GET, POST | yes | 30/min | zod | 1 search |
| `/api/search/events` | GET, POST | yes | 30/min | zod | 1 search |
| `/api/search/videos` | GET, POST | yes | 30/min | zod | 1 search |
| `/api/solana/attest` | POST | yes | 10/min | zod, replay re-run | Spends issuer SOL |
| `/api/solana/credentials` | GET | yes | 30/min | zod | One RPC read chain |
| `/api/solana/faucet` | POST | yes | 5/min + 1/h per address and IP | zod, 1 KB | Spends issuer SOL (0.02 SOL) |

Search and Solana routes return only third-party or on-chain data. Only `/api/buddies`, `/api/leaderboard` and `/api/live` read user-originated rows.

## 4. CORS and headers

- VERIFIED: three routes set CORS (`mcp/http.ts:6-19`), all `access-control-allow-origin: *`, and they allow the `authorization` header though nothing reads it. Other routes send no CORS headers, so browsers block cross-origin reads. Servers and curl are not affected by CORS at all.
- VERIFIED: `json()` sets `cache-control: no-store` by default (`http.ts:16-20`). `/api/live` and `/api/status` allow shared caching on purpose.
- VERIFIED: no CSP, `X-Frame-Options`, `Referrer-Policy` or `Permissions-Policy` on pages or APIs. Only `/figures/*` has headers (`next.config.ts:22-31`). The relay sends `X-Content-Type-Options`, `Cache-Control: no-store` and echoes CORS only for allowed origins (`relay.js:215-232`); Caddy adds HSTS (`Caddyfile:11-15`).
- Camera, microphone and Web Serial are used by `VoiceButton` and the hardware twin. Without a `Permissions-Policy`, and with page framing allowed (X4), nothing narrows who may request them.

## 5. Interpreters, in short

VERIFIED: three hand-written interpreters (C++ in `arduino/`, MicroPython in `python/`, Verilog in `verilog/`), one clock and world model, a statement budget per step, a depth cap, and a 20 s Worker budget for lesson checks. No `eval`, no `Function`, no dynamic import of user text. The gaps are resource limits (X2). User code has no network or DOM access through the interpreter API: judged from the builtin names in `python/modules.ts` and `native.ts`, not fuzzed. Deeper escapes, for example host-object prototype access through the Python object model, are UNKNOWN.

## 6. Dependency advisories (`npm audit --omit=dev`, 2026-10-26)

Totals: 15 (high 2, moderate 13, low 0, critical 0). Relay (`server/realtime`): 0. Output saved as `audit-root.json` in the scratch folder.

| Package | Severity | Direct | Why flagged | Used where |
|---|---|---|---|---|
| `toml` (via `@coral-xyz/anchor`) | high | no | Five advisories: uncontrolled recursion, prototype pollution, quadratic and CPU DoS in `toml.parse()` | Through `@coral-xyz/anchor@0.31.1`, a direct dependency (`package.json:33`). `grep -rln "coral-xyz" src scripts solana` finds the only import at `solana/scripts/devnet-setup.ts`, and `solana/package.json:14` declares its own copy, so the root dependency looks unused by the app (VERIFIED by grep, review re-run). Moving it to devDependencies, or removing it, should drop `toml` (only `@coral-xyz/anchor` requires it in `package-lock.json`); that effect on `npm audit` was not run (HYPOTHESIS) |
| `@coral-xyz/anchor` | high | yes | Inherits `toml`, `@solana/web3.js`, borsh | as above |
| `stream-json` (via `jayson`) | moderate | no | O(depth^2) filters, JSONC rescans, prototype pollution in Assembler | Solana RPC client path |
| `jayson` | moderate | no | Inherits `stream-json`, `uuid` | `@solana/web3.js` RPC transport |
| `uuid` <11.1.1 | moderate | no | Missing bounds check in v3/v5/v6 when `buf` is given | via `jayson` |
| `@solana/web3.js` 1.99.0 | moderate | yes | Inherits `jayson` | Server (`context.ts`) and client |
| `@solana/wallet-adapter-base`, `-react`, `-react-ui`, and six transitive wallet packages | moderate | 3 direct | Inherit `@solana/web3.js` | Browser wallet UI |

Reading: npm reports no fix for most rows (`fixAvailable: false`). Realistic exposure is low, because the vulnerable code parses JSON or TOML from a Solana RPC endpoint that we choose, not from users (ESTIMATED). It still blocks a clean audit report. The fix path is a move to a newer Solana client (EXTERNAL, not checked here).

## 7. Child-safety surface summary

| Surface | Who can reach it | Free text from users | Moderation | Gap |
|---|---|---|---|---|
| Room chat | Anyone with the code | 500 chars per message | None; control and bidi chars stripped | R5, R7, R8; no report or block |
| Room names, peer status | Anyone in the room | 24 and 80 chars | Same | R4 impersonation |
| Buddy pool | Anyone, no code needed | name, interests, wants (280) | None | D1 |
| AI partner and translation | Anyone | 8,000 chars | Upstream provider only | A6 |
| AI image, story | Anyone | 600 chars | Upstream provider only | A6, D6 |
| Leaderboard | Anyone reads, anyone writes | name 24 | Control chars only | D2 |
| Voice | The user | audio | None | A7 |

The repo has no age gate, no parent or teacher account, no consent record, no privacy policy page and no terms of service. The only privacy text is `shell.json:31,138`. The DOCUMENTED claim "no accounts" is accurate, and it is also the root cause of most findings above.

## 8. Release blockers for a real product

These stop a public launch, and especially a launch to children, until fixed.

1. **No authentication or abuse control on paid and sensitive endpoints** (C1, C2, C3, C4, C6, M1). Needed: a real identity (at minimum a signed anonymous device token), a shared rate limiter and spend counter (Redis, Upstash or Postgres), daily and monthly caps enforced across instances, spend alerts and a kill switch per provider.
2. **Room safety model** (R1 to R9). Needed: server-issued peer identity (the relay assigns the peer id and a secret and rejects a second join that lacks it), host and role enforcement in the relay, a join-approval or lock option, longer or per-room secret codes with expiry, chat rate limits, server-controlled message `kind`, report and block, and message retention rules. R3 (room-creation exhaustion) is also an outage risk.
3. **Child data and consent** (D1, D2, D3, A6, A7). Needed: age and consent flow, privacy policy and terms, telemetry off by default for minors, no free text in the public buddy pool (or pre-moderation of it), name filtering on every public surface, and a data map for the providers that receive children's text, audio and images (Meta, Google, SerpApi). Legal review is EXTERNAL and required.
4. **Moderation of AI input and output** (A1 to A6). Needed: provider moderation endpoints or a classifier on prompts and replies, web text treated as untrusted data, confirmation before `ask_peer` writes into a room, and logging of blocked content.
5. **Credential trust, if credentials will mean anything** (S1, S2, S3). Needed: server-owned lab sessions (the server issues the seed and starting state), a wallet-ownership signature on attest, the issuer key in a KMS or HSM with a separate treasury, rotation, and a program audit (S6, UNKNOWN).
6. **Security headers and CSP** (X4). Needed: CSP with a nonce for the boot script, `frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, and `sandbox` on the figure iframe if any figure content ever becomes non-first-party.
7. **Leaderboard integrity** (D2). Needed before any prize or ranking has value: server-verified laps (the server replays a flight log) or authenticated submission.

## 9. Secrets handling evidence

Read-only commands. Values were never printed.

- `git ls-files | grep -iE "\.env|\.pem|keypair|id\.json|secret|\.key$"` returns only `.env.example`. Redacting after `=` shows every key variable in `.env.example` is empty.
- `git check-ignore -v .env.local` returns `.gitignore:39:.env*`. `.vercelignore` repeats the rule and also drops `/docs`, `/HANDOFF.md`, `/server`, `/scripts/*` (except the content generator) and tests from Vercel uploads.
- `git log --all --diff-filter=A --name-only` filtered for env, pem, keypair, id.json and secret names: only `.env.example` and `src/app/api/solana/credentials/route.ts` (matches the word "credentials", not a secret).
- `git log --all -G<pattern>` over 797 commits. Google API key shape: 0 commits. `sk-` key shape: 0. GitHub token shape: 0. AWS key shape: 0. PEM private-key header: 0. Slack token shape: 0. Vercel token shape: 0. Single-line 64-number JSON array (Solana keypair shape): 0 commits, with JSON files included for the Google, `sk-`, PEM and keypair patterns (a pretty-printed multi-line keypair would not match; UNKNOWN for that form).
- Three commits (`d5bdf44`, `74e41ce`, and `ca09a95`, the rename commit that edits the same line) match a `postgres://user:password@host` shape (re-run in review; the original text listed two). The matched line is a `const DB = "postgres://...@localhost:5432/..."` test constant (password masked in the check), so it is a local test helper, not a credential. Counts: 801 commits with `git rev-list --all --count` today, 797 at the audited state (four master-plan commits since); the count includes branch `backup/simlab-history`.
- A 64-hex pattern matches 30 commits. At HEAD the matches are content hashes in generated figure HTML, a vendor patch note and one test (`git grep -cE '[0-9a-f]{64}' HEAD`), not keys.
- `.env.local` (names and set or empty only): set for Meta, Gemini, SerpApi, the Solana issuer, the realtime URL, `VULTR_API_KEY`, `VULTR_HOST`, Timescale and Postgres connection parts. File mode is `-rw-------`.
- Server keys are read once in `src/lib/server/env.ts`, which is `server-only`. The `NEXT_PUBLIC_*` values that reach the browser are the site URL, Solana cluster and RPC URL, program id and realtime URL. None is secret.
- `src/lib/server/ai/provider.ts` sends keys only in an `Authorization` header to the configured base URL. Log calls print error names and messages, not request bodies (`chat/route.ts:165`).
- Not inspected: Vercel and Vultr dashboards, GitHub secret scanning status (UNKNOWN). The repository is public (EXTERNAL: `gh repo view kushwahaamar-dev/iynk --json visibility` returned `PUBLIC` in review), which makes the clean-history result above matter: anything ever pushed is readable by anyone.

## 10. Quick wins

Each is small and local, and needs no design decision.

1. Add global response headers in `next.config.ts`: `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` limiting camera, microphone and geolocation to self, and `frame-ancestors 'self'` for pages. Add the CSP once the boot script has a hash. Set `poweredByHeader: false` (X4, P4).
2. Add a test that fails when `public/figures` contains a file the figure build did not produce, so the first-party-only assumption in X3 is enforced.
3. Cap Python string and list repeat in `src/lib/interp/python/runtime.ts:1071-1077` and C array sizes in `arduino/interp.ts:393-405` (for example 1,000,000 elements, with a clear `limit` error) (X2).
4. In `server/realtime/src/relay.js`: rate-limit room creation per IP and use a short TTL for rooms nobody used (R3); refuse a `join` that reuses a present peer id unless it carries a resume secret (R4); add a per-socket chat bucket of about 2 per second (R8); force `kind: "text"` for client chat (R7).
5. Apply `room/baton` only when the sender holds the baton, or when the holder is gone and the sender is host (`src/lib/realtime/room.ts:589`) (R6).
6. Limit distinct sessions per telemetry batch, and drop `name` from `lapPayload` (`src/lib/server/db/schema.ts:33`) (C8, D2).
7. Default `telemetry` to off (`src/lib/progress/storage.ts:38`) and stop stamping the room code on events (`telemetry/client.ts:123`) (D3).
8. Wrap search-result text in `quoted()` before it enters the tool message (`src/lib/server/ai/tools.ts:41-45`) (A3).
9. Ask the learner to confirm before `ask_peer` sends (`src/lib/ai/run-tools.ts:76-88`) (A4).
10. Return only `name` and interests from `GET /api/buddies`, or restrict interests to a fixed list; run `wants` through a moderation call before storing (`db/schema.ts:81-83`, `queries.ts:159-167`) (D1).
11. Forward a hashed client IP from `plan_build_night` to the internal `/api/ai/plan` call (`mcp/backends.ts:24-31`) (C5).
12. Make the SerpApi budget real: count in Postgres or Upstash under a month key, and lower the parts per call for MCP and REST tools (C3, C4).
13. Move `@coral-xyz/anchor` to `devDependencies` if `src` never imports it. Confirm first. This removes the two high advisories from the production audit (P1).
14. Do not proxy `/metrics` through Caddy (`deploy/realtime/Caddyfile:4`); keep it internal (R10).
15. Fix the copy in `src/i18n/messages/en/search.json:95` ("never stored") or stop caching coordinates (D4).

## 11. Needs design (see 05_ENGINEERING/SECURITY_THREAT_MODEL)

| Topic | Question to settle | Related rows |
|---|---|---|
| Identity model | Anonymous device token, optional email or school account, teacher and parent roles, or wallet only? This decides rate limits, bans, consent and deletion | C1 to C7, R4, R5, D1 |
| Shared state store | One place for rate limits, spend counters, faucet grants and room metadata (Redis, Upstash or Postgres) that works across Vercel instances | C3, C6, C9, S4 |
| Realtime authority | Move from a dumb relay to one that owns roles, host, baton, bans and room secrets; decide whether it keeps an audit log for safety review | R1 to R9 |
| Room discovery and privacy | Private by code (today), school-managed rooms, or public rooms with moderators; code length and expiry | R1, R2, D7 |
| Moderation system | Provider API or own classifier, human review queue, report flow, retention, who sees what | A6, D1, D2, R5, R7 |
| Child safety and legal | Target ages, COPPA, GDPR-K, FERPA for schools, consent records, deletion on request, data-processing terms with Meta, Google and SerpApi | D3, A7, D4 |
| Verified labs | What a credential means: server-issued seeds, signed submissions, teacher attestation; whether credentials leave devnet | S1, S2, S3, S6 |
| Key custody | KMS or HSM for the issuer, separate fee payer and treasury, rotation, spending limits, incident procedure | S3, C9 |
| AI safety architecture | Prompt-injection policy for web content and chat, confirmation for any model-initiated action, provider fallback and per-user cost budgets | A1 to A7, C1 |
| CSP and sandbox plan | Nonce-based CSP, sandboxed figures if third-party or user content is allowed, Trusted Types for any HTML sink | X3, X4 |
| Third-party API exposure | Whether MCP and REST tools stay anonymous, move to API keys with quotas, or lose the paid tools | M1, C4 |
| Telemetry design | Opt-in, aggregate-only, no room codes, retention shorter than 30 days, signed events for the leaderboard | C8, D2, D3 |

## 12. What was not reviewed

- Production configuration on Vercel, Vultr and Timescale (headers, firewall, environment values, database roles). No production system was contacted.
- Behaviour under load at the scale a real deploy would see (thousands of rooms, many IPs, sustained traffic): R3 and C3 were each reproduced only at the one mechanism the gap asked for (501 rooms from one process, two independent `createSerpApi()` calls), not at production scale or against the real SerpApi endpoint. See section 13 for the Anchor program (closes S6) and "Gap fixes (2026-10-27)" at the end of this document for R3, R4, X2, C3 and S1.
- The 190k lines of i18n JSON and 24k lines of figure JS, sampled only for `innerHTML` and `postMessage` handling (`figures/engine/embed.js`, `figures/vendor/colorfigures/core.js`).
- The Web Serial and Firmata hardware twin (`src/lib/hw`), which talks to USB devices from the browser.
- Test files, beyond what their names claim. This document ran no tests. The run reports ([runs/COMMANDS.md](runs/COMMANDS.md), [runs/E2E.md](runs/E2E.md)) show unit and e2e results for the same code, and the relay tests do exercise a flood cut-off (`server/realtime/test/limits.test.js:61`) and a same-id rejoin that replaces the first socket (`host.test.js:62`), which confirms the behaviour in R4 as intended, not as a defence. No test checks the spend, forged-log, takeover-of-host or room-exhaustion cases (grep of test names; not exhaustive).

## 13. Anchor/Rust program review (closes S6, gap fix 2026-10-27)

Read in full: `solana/programs/iynk_passport/src/lib.rs` (64 lines), `state.rs` (51), `error.rs` (31), `skill.rs` (24), `instructions/initialize.rs` (42), `instructions/set_issuer.rs` (22), `instructions/issue_credential.rs` (104), `instructions/create_bounty.rs` (65), `instructions/cancel_bounty.rs` (26); `wc -l` for the counts. Five instructions; `anchor-lang = "=0.31.1"`, `solana-sdk-ids = "=2.2.1"` (`programs/iynk_passport/Cargo.toml`).

| Instruction | Signer check | Owner check | PDA seeds | Account close | Integer maths |
|---|---|---|---|---|---|
| `initialize` | `admin: Signer` (`initialize.rs:10`) | `program_data.upgrade_authority_address == Some(admin.key())` (`:27-28`): only the program's current upgrade authority may create the Config, so the PDA cannot be front-run by someone else after deploy | `[CONFIG_SEED]` only (`:16`): one global Config, no per-admin seed | none | none |
| `set_issuer` | `admin: Signer` (`set_issuer.rs:8`) | `has_one = admin` on `config` (`:14`): the caller must be the admin already stored in Config | `[CONFIG_SEED]`, `bump = config.bump` (`:12-13`) | none | none |
| `issue_credential` | `issuer: Signer` (`issue_credential.rs:33`), `payer: Signer` (`:36`); `config.has_one = issuer` ties the signer to the configured issuer key (`:14`) | `learner` constrained to `owner = System::id()` (`:30`), so a program-owned account (e.g. a PDA) cannot be named learner; each `remaining_accounts` entry is deserialized with `Account::<Bounty>::try_from`, which Anchor only accepts when the account's owner is this program and its discriminator matches (`:84`, comment at `:75-77`) | `credential`: `[CREDENTIAL_SEED, learner, skill_hash]`, `init` (`:23-24`) — `init` makes the PDA one-per-(learner, skill) and fails if it already exists, so a credential cannot be reissued or overwritten | `credential` is never closed (by design: it is a permanent record). **New, low-severity finding**: a claimed `Bounty` is also never closed here (only `cancel_bounty` closes a bounty, and only while unclaimed) — `pay_bounty` moves out `bounty.amount` lamports (`:92-93`) but leaves the account's own rent-exempt balance locked in the PDA forever, instead of returning it to the sponsor the way `cancel_bounty` does | `bounty.sub_lamports(bounty.amount)` / `learner.add_lamports(bounty.amount)` (`:92-93`) use Anchor's checked lamport arithmetic, which errors rather than panics or wraps on underflow; `require!` guards (`:86-89`) stop a wrong-skill, already-claimed, or wrong-reserved-learner bounty from paying out. Re-entrancy within one call: `pay_bounty.exit(&crate::ID)` (`:96`) writes `claimed_by` back to the account's live data before the loop's next iteration reads it, so the same bounty pubkey listed twice in `remaining_accounts` fails the `claimed_by.is_none()` check on the second pass and the whole instruction (and the transaction) fails — VERIFIED by reading the `try_from`/`exit` semantics and the loop order, not executed on a validator |
| `create_bounty` | `sponsor: Signer` (`create_bounty.rs:21`) | none beyond the System Program CPI itself (`transfer` requires the `from` account to be a signer, enforced by the runtime, not this program) | `[BOUNTY_SEED, sponsor, skill_hash, nonce_le_bytes]`, `init` (`:15`) | none | `amount >= Rent::get()?.minimum_balance(0)` (`:37-40`) stops a bounty too small to keep its payout wallet rent-exempt; `amount` is a caller-supplied `u64` moved by a System Program `transfer` CPI, so it can never exceed the sponsor's real balance |
| `cancel_bounty` | `sponsor: Signer` (`cancel_bounty.rs:21`) | `has_one = sponsor` (`:14`) | seeds re-derived from the bounty's own stored `sponsor`/`skill_hash`/`nonce` fields rather than the caller's accounts, `bump = bounty.bump` (`:11-13`) — the code comment explains this gives a wrong caller `NotSponsor` instead of a generic seeds-mismatch error | `close = sponsor` (`:16`): returns the bounty's full lamport balance (rent plus any unclaimed `amount`) to the sponsor | `constraint = bounty.claimed_by.is_none()` (`:15`) stops cancelling a bounty that already paid out |

Also run: `cargo clippy -p iynk_passport --lib` (native `--lib` target, not the BPF/SBF build Anchor deploys — the full `anchor build`/`anchor test` was not re-run per the task's instruction not to rerun full suites). Result: 0 warnings from this program's own code; 1 warning is `anchor_lang`'s own `#[program]` macro using a deprecated `AccountInfo::realloc` internally (`solana/target` build log, scratch copy at `/Users/amar/iynk-master-plan-scratch/audit/security/` — see "Gap fixes" below), not a finding about this program. `cargo audit` is not installed on this machine (`cargo-audit not found`, `cargo audit` → "no such command: audit") and was not installed for this pass; dependency-advisory coverage of the two Solana crates is a known limit, UNKNOWN.

Who read it and what was checked: this agent, 2026-10-27, full-file reads (not a sample) of every `.rs` file in the program, the five checks above per instruction, plus `cargo clippy`. REPOSITORY_INVENTORY.md:499's "correct on the inventory's read" is a separate, earlier, narrower read by a different agent; this section supersedes it for security purposes. No finding here raises any instruction's severity; the one new item (bounty rent not returned to sponsor on payout) is cosmetic fund-locking of the sponsor's own rent deposit, not a path to drain or steal funds, so it is rated low rather than added to section 8's blockers.

## Review log (2026-10-27)

Adversarial review against source at HEAD (no `src/`, `server/` or `solana/` change since `bb546d6`; `git diff --stat bb546d6 HEAD -- src server solana next.config.ts package.json` is empty). Statements checked: 24.

| # | Statement | Result |
|---|---|---|
| 1 | Only two auth-like grep hits (section 1) | Wrong count: four lines, two in a test file. Fixed. |
| 2 | 23 route files; origin check absent only on `status` and `openapi.json` | Held (`find ... \| wc -l` = 23; per-file grep of the check helpers). |
| 3 | `used` counter at `serpapi.ts:131` (C3) | Line wrong: the function starts at 131, the counter is at 138. Fixed; confirmed one instance per process (`:293`). |
| 4 | C1/C2 limits, 900/h and 60/h shared buckets, `maxTokens: 6000`, 4 rounds | Held (`guard.ts:8-24`, `chat/route.ts:17,109`). |
| 5 | C4 MCP origin check accepts any Origin with the site Host, CORS `*` | Held (`mcp/http.ts:7,29-33`). |
| 6 | C5 shared key `ai:plan:unknown` | Overclaimed for production: kept for local, production key name HYPOTHESIS. Label changed. |
| 7 | C6 rate limiter in memory, 10,000 keys, eviction at line 28 | Held (`ratelimit.ts:14,28`). |
| 8 | C7 IP header order | Held (`http.ts:128-132`). |
| 9 | C8 "30 events/min per session" | Wrong: the limit counts requests, so 6,000 events/min per session is possible. Fixed. |
| 10 | R1 entropy 31^6 and 5.6e-7 | Held (`node -e`: 887503681, 29.7 bits, 5.63e-7). |
| 11 | R3 room-exhaustion, 500 rooms, 30 min TTL | Held in source (`relay.js:219-229`, `config.js:14,29`); still not run. |
| 12 | R4 duplicate peer id replaces the connection and inherits the host | Held (`relay.js:248-264`, `room.js:47-50`). |
| 13 | R5 "grep finds no report, block or mute control" | Conclusion held, grep as written matched CSS `inline-block`. Pattern corrected. |
| 14 | R7 client-chosen chat `kind`; R8 only a 60 frames/s socket bucket, 600 drops in 5 s | Held (`protocol.js:6,188-194`, `config.js:9,35-36`). |
| 15 | R6 `room/baton` applied with no sender check | Held (`room.ts:589-596`). |
| 16 | R10 `/metrics` proxied by Caddy | Held (`Caddyfile:4`). |
| 17 | X1 no `eval`/`Function`/dynamic import | Held: re-run of the grep gives exactly the three hits listed. |
| 18 | X2 `"x" * 10**9` and `[0] * 10**8` freeze a tab | Overclaimed: both throw `RangeError` in V8. The missing cap is real (a 5e7-element list took 2.7 s, 0.4 s at 1e7 in Node 24). Text and label corrected; not run in the app. |
| 19 | X3 80 first-party files in `public/figures`; no `sandbox`; `?origin=` | Held; `?origin=` accepts http as well as https. Fixed wording. `find public/figures -type f \| wc -l` = 80, all `.html`. |
| 20 | X4 headers only on `/figures/*`, no middleware or proxy file | Held (`next.config.ts:22-31`; `middleware.ts`, `proxy.ts` absent). |
| 21 | S1 forged proof of build "can pass" | Reasoning from source only; label now says forgery not run. |
| 22 | Section 6 numbers (15 = 2 high + 13 moderate; relay 0) | Held (parsed `audit-root.json` and `audit-rt.json` with `python3 -I`). Not re-run against the live registry. |
| 23 | Section 9 secret scans: 797 commits, 0 hits per pattern, two Postgres-shaped commits, env file modes, set variables | Commits 797 held (801 now); patterns held at 0; Postgres commits are three, not two. `.env.local` mode 600 and the variable list held (names only; no value was read). Fixed. |
| 24 | "Whether the repository is public: UNKNOWN" | Now EXTERNAL: public. Added. |

Also changed: evidence path moved from a temporary directory to the permanent scratch folder; the `@coral-xyz/anchor` quick win now cites the only import (`solana/scripts/devnet-setup.ts`) and says the audit effect was not run; section 12 now links the run reports and notes what they do and do not cover.

Counts: statements checked 24, wrong or overclaimed 9 (items 1, 3, 6, 9, 13, 18, 19, 23, 24), plus 1 label downgrade (21). Not re-checked: AI route injection findings (A1 to A7) beyond A4's `ask_peer` code, the Solana program, and production behaviour. Findings not softened.

## Gap fixes (2026-10-27)

The completeness critic found two gaps in this document. Both are closed below. Rules followed: local-only, non-default ports (40000-49999, the range the realtime test helpers already use), no production contact, no rebuild of the full suite, scratch files under `/Users/amar/iynk-master-plan-scratch/audit/security/`. Scratch node scripts were run with plain `node`, not Python, so `-I` does not apply; no `.env.local` value was read, printed or needed by any script here.

**Gap 1 — R3, R4, X2, C3 and S1 were source-level only; none executed.**

All five were executed against the real source (not a reimplementation) on this machine and now reproduce the finding:

| ID | What was run | Command / script | Result | Evidence |
|---|---|---|---|---|
| R4 (host takeover) | A local, ephemeral relay (`server/realtime/src/relay.js` via `server/realtime/test/helpers.js`, port chosen from 40000-49999) with a host and a guest joined by code. A third socket joins with the host's exact peer id. | `node /Users/amar/iynk-master-plan-scratch/audit/security/../realtime/hijack.mjs` (already in scratch from an earlier pass; re-run here) | The real host's socket got `error:replaced` and was closed; the attacker's `welcome` frame named it the room's host (`host":"hostid"`); the attacker then sent `kick` for the guest and the guest was removed (`error:kicked`). Host takeover and the kick it enables are both reproduced, not just read from source | `/Users/amar/iynk-master-plan-scratch/audit/security/r4_hijack_run.log` |
| R3 (500-room exhaustion) | The same local relay. One Node process opens a room with a fresh 6-character code (from the server's own `ROOM_ID` alphabet), waits for `welcome`, then closes that socket, 520 times in a row — never more than ~2 sockets open at once, well under the 64-per-IP cap, so the per-socket cap is never the thing being tested | `node /Users/amar/iynk-master-plan-scratch/audit/security/r3_room_exhaustion.mjs` (new; written for this gap) | `{"roomsOpened":500,"refusedAtAttempt":500}` — the 501st attempt got `server_full`. A genuine new "victim" joining a brand-new, never-before-used room code right after also got `server_full`: `{"t":"error","code":"server_full","message":"The relay is at its room limit; try again later."}`. Matches the baseline's claim exactly: rooms outlive their closed sockets until the 30-minute TTL, so a slow serial loop (not even a burst) exhausts the cap | `/Users/amar/iynk-master-plan-scratch/audit/security/r3_run.log`, script at `/Users/amar/iynk-master-plan-scratch/audit/security/r3_room_exhaustion.mjs` |
| X2 (huge list literal freezes the main thread) | The *real* Python interpreter and run loop (`src/lib/interp/run.ts` → `src/lib/interp/python/runtime.ts`), not a standalone JS snippet: `createRun({ board: "pico", language: "python", source: "x = [0] * 10**7" })`, `run.start()`, then one `run.step(16)` (one simulated animation frame) timed with `performance.now()`. Run via a scratch-only Vitest config (`include` pointed at the scratch folder, same jsdom env and tsconfig-paths resolution as the repo's own `vitest.config.mts`, nothing in the repo touched; a symlink `node_modules -> ../../../../Codes/ak/simlab/node_modules` inside the scratch folder lets Vite resolve packages) | `npx vitest run --config /Users/amar/iynk-master-plan-scratch/audit/security/x2/vitest.scratch.config.mts` | `[0]*10**7`: one `step()` call took **420.9 ms** on the main thread (3-run average 417-421 ms). `[0]*5*10**7` (the baseline's larger case): **2,778-2,816 ms**. A no-op control statement in the same harness: **0.015 ms**. No `RangeError`: both sizes are well under V8's array-length limit, consistent with the review log's correction (item 18) that `10**8`/`10**9` throw but `10**7`/`5*10**7` do not. This is the real interpreter and run loop, in jsdom, not a browser tab, so "freezes a tab" for a real Chrome/Blink main thread is still not run (ESTIMATED in the existing X2 row) | `/Users/amar/iynk-master-plan-scratch/audit/security/x2/x2_run.log`, test at `/Users/amar/iynk-master-plan-scratch/audit/security/x2/x2_freeze.test.ts`, config at `/Users/amar/iynk-master-plan-scratch/audit/security/x2/vitest.scratch.config.mts` |
| C3 (SerpApi budget is per-process) | The real `createSerpApi()` (`src/lib/server/search/serpapi.ts`) with a stubbed `fetch` (no network, no real SerpApi key — `key: "test-key"` is a placeholder string, nothing from `.env.local`). First: budget 3, three unique queries succeed, a fourth throws `quota_exhausted`. Second: a fresh `createSerpApi()` call (standing in for the module-level `const serp = createSerpApi(...)` at `serpapi.ts:293` running again on a new serverless instance or cold start) with budget 1 — it starts at `used: 0` and successfully serves one more search even though the first "instance" had already exhausted its budget | Same Vitest run as X2, test at `/Users/amar/iynk-master-plan-scratch/audit/security/x2/c3_quota.test.ts` | `{"instanceA_used":1,"instanceA_budget":1,"instanceB_used_at_start":0,"instanceB_used_after_one_search":1,"conclusion":"two independent createSerpApi() calls each got their own full budget; no shared counter"}` — confirms the row's claim: the counter is per-process and a new instance gets a full, independent budget, so it is not a monthly cap | `/Users/amar/iynk-master-plan-scratch/audit/security/x2/c3_run.log` |
| S1 (forged Proof of Build) | The real replay function, `src/lib/verify/drone-safety.ts`'s `replayDroneSafety`, called with a hand-written 7-event log (`init` with every check already `true`, then `test`/`test-end` pairs for smoke, motors and calibrate) that never touched a bench — the events are typed in, not derived from any run | `node --experimental-strip-types /Users/amar/iynk-master-plan-scratch/audit/solana/forge.mts` (already in scratch from an earlier pass; re-run here) | `{"pass":true,"score":100,"steps":{"smoke":true,"motors":true,"calibrate":true},"violations":[],"pops":0,"fault":null}` — the forged log passes with a perfect score. This is the server-side replay function itself, called directly; it was not sent through the live `/api/solana/attest` route (that would touch the issuer key and devnet) and no on-chain credential was minted | `/Users/amar/iynk-master-plan-scratch/audit/security/forge_run.log` (same output captured above; the script predates this pass and lives at `/Users/amar/iynk-master-plan-scratch/audit/solana/forge.mts`) |

All five are now labelled VERIFIED (reproduced) in the threat table in section 2, with a pointer back to this section. None of the five needed `.env.local`; none touched a port other than ephemeral ones in the 40000-49999 test range; none contacted iynk.tech, rt.iynk.tech, Vercel, Vultr or Solana devnet.

Known limit kept as HYPOTHESIS, not closed: the real cost impact of C3 against the live SerpApi endpoint (dollars per search) is still UNKNOWN, as the existing row says — reproducing the per-process reset does not require or provide a price. The X2 freeze is reproduced on the real interpreter but not inside an actual Chromium tab; Node's main thread and V8's and Blink's main thread share the same engine's array-construction cost, so the browser figure in the existing row stays an ESTIMATE, now backed by a same-engine measurement one layer closer to the browser than before (through the interpreter, not a bare JS snippet).

**Gap 2 — the Anchor/Rust program (S6) was not security-reviewed; the baseline didn't record who read it or what was checked.**

Closed in full: section 13 ("Anchor/Rust program review") now tabulates signer check, owner check, PDA seeds, account close and integer maths for each of the program's five instructions (`initialize`, `set_issuer`, `issue_credential`, `create_bounty`, `cancel_bounty`), read in full (every `.rs` file under `solana/programs/iynk_passport/src/`, `wc -l` for the line counts, not a sample). `cargo clippy -p iynk_passport --lib` was run (log at `/Users/amar/iynk-master-plan-scratch/audit/security/cargo_clippy_iynk_passport.log`): 0 warnings from the program's own code, 1 from `anchor_lang`'s macro-generated code (not a finding here). `cargo audit` is not installed on this machine and was not installed for this pass (known limit, UNKNOWN coverage of the two Solana crates' advisories) — `anchor build`/`anchor test` (the full BPF build and the on-chain test suite) were deliberately not rerun, per the instruction not to rerun full suites; clippy ran against the native `--lib` target only.

One new, low-severity finding came out of this read (added to the S6 row and to section 13, not escalated into section 8's blockers): `issue_credential`'s `pay_bounty` (`instructions/issue_credential.rs:78-104`) never closes the `Bounty` account it just paid out, so the bounty PDA's own rent-exempt lamports stay locked in that account forever instead of returning to the sponsor the way `cancel_bounty` does for an unclaimed bounty. This locks the sponsor's own rent deposit; it is not a path for anyone to take funds that are not theirs, so it is rated low, not a release blocker.

What is still a known limit, stated rather than silently skipped: production configuration (Vercel/Vultr/Timescale), the Web Serial/Firmata hardware twin, the i18n JSON and figure JS beyond the existing sample, and a second, independent reviewer's read of this same program (REPOSITORY_INVENTORY.md:499's "correct on the inventory's read" was one agent's read on an earlier pass; section 13 is a second, more detailed read by this agent, not a two-person review).
