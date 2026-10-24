# Hackathon layer contract (binding for every hx:* agent)

Read with: docs/hacktx/STRATEGY.md (why), docs/hacktx/BASE_ARCHITECTURE.md (D1–D14, the core everyone else is building right now), docs/SPEC.md (the brief). The core is static and must keep working when every key below is missing. The hackathon layer is additive: it lives only in the paths D14(d) reserved, plus the paths assigned in H12.

Changes to this contract are additive only. Log them in a changelog at the bottom with your label and time.

## H1 Environment

Server-only unless the name starts with NEXT_PUBLIC_. Local values live in `.env.local` (gitignored). Never print, log or return a secret.

| Var | Use | Default |
|---|---|---|
| META_API_KEY | Meta Model API key | — |
| META_API_BASE | OpenAI-compatible base | https://api.meta.ai/v1 |
| META_MODEL | chat/vision/audio model | muse-spark-1.1 |
| META_IMAGE_MODEL | Muse Image model id (from dev.meta.ai/docs) | the documented id |
| META_TRANSCRIBE_MODEL | Muse Voice Transcribe id; if it isn't on the API, audio goes through META_MODEL's audio input | the documented id |
| GEMINI_API_KEY | optional second provider | — |
| GEMINI_MODEL | Gemini fallback model id (additive, from hx:server-ai) | gemini-3.8-flash |
| SERPAPI_KEY | SerpApi | — |
| SERPAPI_MONTHLY_BUDGET | quota guard (searches per process lifetime before refusing non-cached calls) | 200 |
| SOLANA_RPC_URL | server RPC | https://api.devnet.solana.com |
| SOLANA_ISSUER_KEYPAIR | JSON array of 64 numbers: issuer, fee payer and faucet treasury | — |
| NEXT_PUBLIC_SOLANA_CLUSTER | devnet | devnet |
| NEXT_PUBLIC_SOLANA_RPC_URL | client RPC | https://api.devnet.solana.com |
| NEXT_PUBLIC_SOLANA_PROGRAM_ID | simlab_passport program id | — |
| DATABASE_URL | Tiger Data (Postgres + Timescale) | — |
| NEXT_PUBLIC_REALTIME_URL | wss://…/ws of the relay | — |
| NEXT_PUBLIC_SITE_URL | absolute site URL for links and OG | http://localhost:3000 |
| VULTR_API_KEY, VULTR_HOST | deploy only (scripts), never read by the app | — |

`src/lib/server/env.ts` (hx:server-ai) parses these once with zod and exports `env` and `features = { ai, image, voice, search, solana, db, realtime, gemini }`, all booleans. Every other agent reads env only through this module. `.env.example` lists every var with a one-line comment.

## H2 Server conventions

- Route handlers only under `src/app/api/<area>/**/route.ts`. **Do not export `runtime` (or `dynamic`/`revalidate`):** next.config.ts sets `cacheComponents: true`, and the bundled Next 16.4.3 docs reject those segment configs; Node.js is already the default runtime. Under Cache Components a `GET` handler is prerendered at build time unless it reads request-time data, so every GET that must answer per request (status, credentials, leaderboard, live, buddies, search) calls `await connection()` from `next/server` first. POST handlers are always dynamic. Server-only code lives in `src/lib/server/**` and starts with `import 'server-only'`.
- The core's i18n, progress, figure and dock APIs are documented in docs/requests/shell-app.md ("For every page owner"): `getT`, `getMessages`, `getContentText`, `useLocale`, `alternatesFor`, the progress hooks, `FigureFrame`, `LabDock`. Use them; don't build parallel ones. Your namespace JSON loads at runtime through the template import in src/i18n/server.ts as soon as the files exist. The orchestrator adds `ai`, `search`, `solana`, `together` and `hw` to `NAMESPACES` and `Messages` in src/i18n/namespaces.ts once your English files exist, so create all six locale files early.
- Validate every body with zod. Errors are `{ error: { code, message } }` with the right status: 400 bad input, 429 rate limited, 502 upstream failed, 503 `not_configured`.
- `src/lib/server/http.ts` (hx:server-ai) provides `json()`, `fail()`, `parseBody(req, schema)`, `withTimeout(ms)` and `clientIp(req)`.
- `src/lib/server/ratelimit.ts` (hx:server-ai) provides `rateLimit(key, { limit, windowMs })`, an in-memory sliding window per instance. Every public endpoint uses it.
- Upstream calls always carry `AbortSignal.timeout()`. Retry once on 429/5xx with jitter. Never stream secrets or raw upstream errors to the client.
- `GET /api/status` (hx:server-ai) returns `features` (booleans only). The client hook `useFeatures()` in `src/lib/features.ts` (hx:server-ai) caches it. Every panel checks its feature and shows a real "not set up on this deployment" state. That is a state, not a placeholder.

## H3 Shared client seams (from the core)

- `LabStore` and the LabDock props live in `src/components/dock/types.ts` (shell-app, D14e):
  - `LabStore<S, A extends { type: string }> = { getState(): S; subscribe(fn): () => void; dispatch(action: A): void }`
  - `LabDockProps = { lab: 'board'|'robotics'|'drone'; itemId: string; store: LabStore; figure: FigureHandle | null }`
- `FigureHandle.send(type, payload)` (D11) is the only way to touch a figure. Use `flash` to highlight a part and `labels` for callouts.
- Lab store state shapes and action types are defined by the ui:* agents in `src/lib/{boardlab,robotics,dronelab}/store.ts`, and they are being written right now. Read them when they exist. Until then, code against an adapter interface in your own folder and note the gap. Don't edit their files; write `docs/requests/<label>.md` instead.
- Each hackathon panel is a component taking `LabDockProps`, exported from your components folder. hx:dock (wave 2) mounts them in LabDock tabs: Partner, Together, Real, Passport, Hardware.
- Text: every visible string goes in per-locale JSON. New namespaces, each with all six locales (en first, then es/fr/de/zh/hi before you finish):

  | Namespace | Owner |
  |---|---|
  | ai | hx:partner |
  | search | hx:search |
  | solana | hx:solana-app |
  | together | hx:realtime-client |
  | hw | hx:hw |

  Load them the way the core's namespaces load. Read shell-app's src/i18n when it exists; it is being written now.
- Look: use src/components/ui (design-system) once it exists, in the Colorfigures palette (tomato, mustard, mint, cobalt, blush, ink, paper). Panels must work in a ~360 px wide dock and as a phone bottom sheet. Keyboard and ARIA throughout.

## H4 AI (Meta Model API, OpenAI-compatible)

Provider module `src/lib/server/ai/provider.ts`:

- `chat({ messages, tools?, stream?, json?, maxTokens?, reasoning? })` calls `${META_API_BASE}/chat/completions` with `model: META_MODEL`.
- It falls back to Gemini only if `GEMINI_API_KEY` is set and Meta failed, and reports `provider` in usage.
- Image input goes through `image_url` parts. Audio goes through the documented transcribe endpoint or audio input. Muse Image goes through the documented endpoint.
- Confirm every endpoint and model id against dev.meta.ai/docs before coding it, and record what you found in docs/hacktx/AI.md.

Routes (all POST, rate-limited, max body 256 KB unless stated):

| Route | Body | Returns |
|---|---|---|
| /api/ai/chat | `{ messages: [{role:'user'\|'assistant'\|'tool', content, tool_call_id?}], lab?, itemId?, bench?: string (≤ 12 KB description), locale, peers?: [{id,name,lang,done:string[]}] }` | SSE stream of `data: {type:'text',delta}` / `{type:'tool_call',id,name,args}` / `{type:'citation',url,title,snippet}` / `{type:'done',usage:{provider,inTokens,outTokens}}` / `{type:'error',code}` |
| /api/ai/translate | `{ texts: string[] (≤ 20, ≤ 2 KB each), to: locale, from?: locale }` | `{ texts: string[], from }`; cached in memory by hash |
| /api/ai/transcribe | multipart `audio` (webm/opus or wav, ≤ 4 MB), `lang?` | `{ text, lang }` |
| /api/ai/story | `{ lab, itemId, locale, peers:[{name,lang}], events:[{t, who, kind, text}] (≤ 300) }` | `{ title, story (markdown, ≤ 250 words), highlights: string[], imagePrompt }` |
| /api/ai/image | `{ prompt (≤ 600 chars), style:'colorfigures' }` | `{ image: dataURL }` (palette and hand-inked style enforced in the prompt) |
| /api/ai/plan | `{ locale, participants:[{name, lang, level:'new'\|'some'\|'lots', wants: string}], messages?: [{who,text}] }` | `{ title, item:{lab,id}, why, roles:[{name, role, firstTask}], steps: string[], parts?: string[] }` (the item must exist in src/content) |
| /api/ai/match | `{ me: Profile, pool: Profile[] (≤ 50) }` | `{ matches: [{id, score, why, sharedInterest, suggestedProject:{lab,id}}] }` |

`Profile = { id, name, lang, interests: string[], built: string[], wants: string }`. It holds no contact data; people connect by room invite.

Partner tools, defined in `src/lib/ai/tools.ts` (hx:partner) and executed either on the server inside /api/ai/chat or on the client:

| Tool | Runs | Effect |
|---|---|---|
| search_datasheet(query) | server (SerpApi google + extract) | returns snippets, emits citation events |
| find_parts(parts[]) | server (search lib) | offers summary |
| highlight_part(partId, note?) | client | `figure.send('flash', …)` plus a callout |
| propose_change(kind:'code'\|'wire'\|'part', patch, reason) | client | a card with a diff; Accept dispatches the store action, Reject declines |
| ask_peer(peerId, question) | client | posts a teach-back request in the room chat (realtime) |
| open_panel(tab) | client | switches the LabDock tab |

The server executes server tools in a loop of at most 4 rounds. Client tools come back to the client as `tool_call` events; the client executes them and continues with `role:'tool'` results.

The system prompt lives in `src/lib/server/ai/prompts/partner.ts`:
- Be Socratic: hints first, the answer when asked twice.
- Prefer a peer who has `done` the relevant lesson.
- Credit helpers.
- Give safety warnings (LiPo, mains, current limits).
- Answer in the user's locale.
- Never invent part numbers or pins; say you don't know.

## H5 Search (SerpApi)

Client `src/lib/server/search/serpapi.ts`:
- `GET https://serpapi.com/search.json?engine=…&api_key=…`, using SerpApi's cache (no `no_cache`).
- Our own in-memory LRU, 6 h TTL.
- A whitelist of engines: google, google_shopping, amazon, ebay, walmart, google_maps, google_events, youtube, google_lens, plus the Extract API.
- Read each engine's docs at serpapi.com/<engine>-api.md, and the Extract API's at serpapi.com/extract-api.md, before coding it. Record the parameters in docs/hacktx/SEARCH.md.

Routes (GET with query or POST JSON; rate-limited):

| Route | Input | Output |
|---|---|---|
| /api/search/offers | `{ parts: [{ key, query, qty }] (≤ 25), country?: 'us' }` | `{ parts: [{ key, offers: [{source:'google_shopping'\|'amazon'\|'ebay'\|'walmart', title, price:number, currency, url, seller?, rating?, inStock?, thumbnail?}], best?: offerIndex }], fetchedAt }` |
| /api/search/nearby | `{ kind:'makerspace'\|'electronics'\|'hobby'\|'flying-field', ll?: '@lat,lng,13z', near?: string }` | `{ places: [{ title, address, rating?, reviews?, hours?, url?, mapsUrl, distanceKm? }] }` |
| /api/search/events | `{ q?: string, near: string }` | `{ events: [{ title, when, venue, address?, url, thumbnail? }] }` |
| /api/search/videos | `{ q }` | `{ videos: [{ title, channel, duration?, url, thumbnail }] }` |
| /api/search/web | `{ q, extract?: boolean }` | `{ results: [{title,url,snippet}], extracts?: [{url, title, text (≤ 6 KB)}] }` |

Each item's parts list comes from src/content (drone parts, robotics modules, board kits). hx:search writes the mapping from content parts to queries in `src/lib/search/bom.ts`.

The budget optimizer in `src/lib/search/optimize.ts` is pure. It takes `{ options per slot with prices, calc from src/lib/drone, budget, constraints: {minTW, minFlightMin} }` and returns the best feasible pick and its trade-offs.

## H6 Solana (devnet)

Program `simlab_passport` (Anchor; workspace in `solana/`; hx:solana-program). Interface (implement exactly; changes are additive and logged in docs/hacktx/SOLANA.md):

```
Config     PDA ["config"]                                   { admin: Pubkey, issuer: Pubkey, bump: u8 }
Credential PDA ["cred", learner, skill_hash]                 { learner, skill_hash: [u8;32], skill_id: String (≤ 64), replay_hash: [u8;32], score: u16, issued_at: i64, issuer: Pubkey, bump }
Bounty     PDA ["bounty", sponsor, skill_hash, nonce.to_le_bytes()]  { sponsor, skill_hash, skill_id: String, learner: Option<Pubkey>, amount: u64, created_at: i64, claimed_by: Option<Pubkey>, nonce: u64, bump }  (lamports held in the PDA)

initialize(issuer: Pubkey)                                  signer admin; creates Config
set_issuer(issuer: Pubkey)                                  signer admin
issue_credential(skill_id: String, skill_hash: [u8;32], replay_hash: [u8;32], score: u16)
    signers issuer + payer; accounts config, credential (init), learner (unchecked), system_program
    remaining_accounts: Bounty PDAs to pay. Each must match skill_hash, be unclaimed, and have learner == None or the learner.
    Pays `amount` to the learner and marks claimed_by.
create_bounty(skill_id: String, skill_hash: [u8;32], learner: Option<Pubkey>, amount: u64, nonce: u64)   signer sponsor
cancel_bounty()                                             signer sponsor; only if unclaimed; closes to sponsor
events CredentialIssued { learner, skill_id, replay_hash, score }, BountyPaid { bounty, learner, amount }
skill_hash = sha256(utf8(skill_id))
skill_id forms: "board:<id>:lessons", "board:<id>:lesson:<lessonId>", "drone:<id>:safety", "robotics:<id>:bench", "flight:<course>:sub-<seconds>"
```

The IDL and TS types are exported to `src/lib/solana/idl/simlab_passport.json` and `.ts` after every build. The deployed program id goes into docs/hacktx/SOLANA.md and `.env.example`.

App side (hx:solana-app):

Wallets:
- Wallet Standard, which auto-detects Phantom, Solflare and Backpack.
- Plus "SimLab devnet wallet": a Keypair kept in localStorage `simlab:wallet:v1`, clearly labelled devnet-only, with export and forget.

Routes:

| Route | Body | Effect |
|---|---|---|
| POST /api/solana/attest | `{ kind:'board-lessons'\|'board-lesson'\|'drone-safety'\|'robotics-bench'\|'flight-course', itemId, sub?, learner: base58, run: RunLog }` | `verifyRun()` re-runs the check. If it passes, sends issue_credential (with matching open bounties as remaining accounts) and returns `{ signature, credential: address, skillId, replayHash, paid: [{bounty, amount}] }`. 409 if already issued. |
| POST /api/solana/faucet | `{ to: base58 }` | 0.02 SOL from the issuer treasury, once per address and IP per hour |
| GET /api/solana/credentials?learner= | | `{ credentials: [...] }` from `program.account.credential.all` filtered by learner |

`RunLog` and `verifyRun(kind, itemId, sub, run)` live in `src/lib/verify/**` (hx:solana-app):
- `RunLog = { v:1, kind, itemId, sub?, seed: number, inputs: [{t, action}] , result: { pass: boolean, score?: number }, client: { appVersion } }`.
- `verifyRun` replays the inputs through the core's pure functions (D14c) and returns `{ ok, score, replayHash (sha256 of the canonical JSON of the inputs) }`.
- Until the core's checks exist, implement drone-safety (smoke stopper, props-off motor direction, accelerometer calibration) and board-lesson from src/content and the interpreters as they land. Log the gaps.

Pages: `src/app/[lang]/passport/**` (your wallet, your credentials, mint flow, bounties you sponsor) and `src/app/[lang]/verify/**` (static page; `?learner=` or `?credential=` read on the client; shows the on-chain data and Explorer links).

Tips: a SystemProgram transfer plus a Memo `simlab:tip:<roomId>`, signed by the sender's wallet. They are shown in the room and in the story.

## H7 Realtime (relay on Vultr; protocol shared by hx:realtime-server and hx:realtime-client)

WebSocket at `NEXT_PUBLIC_REALTIME_URL`, JSON text frames, `t` = message type.

```
client → server
  {t:'join', room, peer:{id, name, color, lang}, lab?, itemId?}
  {t:'action', action}                       relayed in total order (server seq)
  {t:'state', to, snapshot, seq}             host's reply to a snapshot-request
  {t:'chat', id, text, lang, kind:'text'|'voice'|'ai'|'system'}
  {t:'cursor', x, y}                          0–1 in the figure frame, ≤ 20 Hz
  {t:'presence', role?: 'wirer'|'coder'|'pilot'|'watcher', status?: string, baton?: boolean}
  {t:'pose', p:[x,y,z], q:[x,y,z,w], v?, gate?}   flight ghosts, ≤ 20 Hz
  {t:'ping'}
server → client
  {t:'welcome', you, room, peers, host, seq}
  {t:'peer', peer} | {t:'leave', id} | {t:'host', id}
  {t:'action', from, seq, action}             echoed to the sender too
  {t:'snapshot-request', from}                sent to the host when someone joins
  {t:'state', from, snapshot, seq}
  {t:'chat', from, id, text, lang, kind, ts}
  {t:'cursor'|'presence'|'pose', from, ...}
  {t:'pong'} | {t:'error', code, message}
```

- Room ids are 6 chars from `23456789abcdefghjkmnpqrstuvwxyz`. Max 8 peers. Frames ≤ 64 KB; a snapshot ≤ 512 KB.
- 60 frames/s per peer; above that, drop with an error. The host is the earliest present peer.
- A room expires 30 minutes after its last peer leaves. Heartbeat every 15 s; drop a peer after 45 s without one.
- **Consistency:** every client applies shared actions only in server `seq` order, its own included (no optimistic apply). A joiner applies the host's snapshot, then every action with a seq above the snapshot's.
- Purely local actions (camera, panel toggles, hover) are never sent. hx:realtime-client keeps the per-lab allow-list of shared action types in `src/lib/realtime/shared-actions.ts`.
- Code text is shared with a "keyboard baton": one editor at a time. The others see it live through debounced `code/replace` actions.
- Fallback when NEXT_PUBLIC_REALTIME_URL is unset: BroadcastChannel (same browser, for tabs), with the same client API.

### H7.1 Client API (`src/lib/realtime/index.ts`, hx:realtime-client; hx:partner and hx:solana-app code against it)

```ts
type Role = 'wirer' | 'coder' | 'pilot' | 'watcher'
type Peer = { id: string; name: string; color: string; lang: Locale; role?: Role; baton?: boolean; done: string[] }   // done = progress keys (D7) shared through presence, so the partner can find a helper
type ChatMsg = { id: string; from: string; text: string; lang: Locale; kind: 'text' | 'voice' | 'ai' | 'system'; ts: number; translations: Partial<Record<Locale, string>> }
type RoomApi = {
  id: string; link: string; you: Peer; peers: Peer[]; hostId: string; connected: boolean; transport: 'ws' | 'broadcast'
  messages: ChatMsg[]
  chat(text: string, kind?: ChatMsg['kind']): void
  setPresence(p: { role?: Role; status?: string; baton?: boolean }): void
  onPose(cb: (from: string, pose: unknown) => void): () => void; sendPose(pose: unknown): void
  leave(): void
}
useRoom(): RoomApi | null                                  // null when the page isn't in a room
<RoomProvider lab itemId store>{children}</RoomProvider>    // joins when ?room= is present; syncs the store's shared actions per H7
createRoom(lab, itemId): string                            // returns a room link with a fresh id
```

## H8 Data (Tiger Data / Postgres + Timescale)

- `db/migrations/*.sql` (hx:data) define the schema:
  - `events` hypertable: `ts timestamptz, kind text, session text, room text null, item text null, data jsonb`.
  - Continuous aggregates: `laps_best_daily` (course, name, min time_ms), `activity_1m` (count by kind per minute).
  - `profiles` table (buddy pool; opt-in; expires after 24 h).
  - Retention 30 days.
- `src/lib/server/db/**` holds the client (`postgres` package), the migrations runner `scripts/db-migrate.mjs`, and typed queries.
- Routes:

  | Route | Purpose |
  |---|---|
  | POST /api/telemetry | `{ events: [{ts, kind, session, room?, item?, data}] ≤ 200 }` |
  | GET /api/leaderboard?course= | leaderboard for a course |
  | GET/POST /api/buddies | opt-in profile; list a pool of ≤ 50 for /api/ai/match |
  | GET /api/live | counters from activity_1m for the last hour |

- Client: `src/lib/telemetry/**` (hx:data) exports `track(kind, data)`, batches, sends on `visibilitychange`, and is a no-op without the db feature.
- Kinds: `flight.sample` (1 Hz), `flight.lap`, `lesson.attempt`, `lesson.pass`, `fault`, `room.join`, `room.action`, `ai.call`, `hw.connect`, `credential.issued`.

## H9 Hardware twin (Web Serial + Firmata; hx:hw)

- `src/lib/hw/**`:
  - Web Serial transport at 57600 baud.
  - Firmata codec: version report, capability query, pin mode, digital port write, analog write (PWM), servo, analog and digital reporting, I2C optional.
  - The twin bridge maps the interpreter's pin I/O to Firmata and back. Read src/lib/interp's board I/O API as it lands; if it lacks a hook, write docs/requests/hx-hw.md.
- `src/components/hw/HardwareTwinPanel.tsx` provides connect, the detected board, live pin states, "drive the real board" and "real sensors into the sim" toggles, and safety notes.
- Feature-detect `navigator.serial`. Other browsers get a short explanation.
- Tests use a fake port. docs/hacktx/HARDWARE.md covers flashing StandardFirmata and the demo wiring.

## H10 MCP / Muse connector (hx:mcp)

- `src/app/api/mcp/route.ts`: MCP over Streamable HTTP, stateless JSON-RPC (initialize, tools/list, tools/call). Use the official SDK if it's already installed; otherwise hand-roll the small subset.
- Tools:

  | Tool | Backed by |
  |---|---|
  | search_catalog(query) | src/content |
  | get_item(lab, id) | src/content |
  | drone_calc(options) | src/lib/drone |
  | price_parts(lab, id) | search lib |
  | plan_build_night(participants) | ai plan |
  | create_room() | returns a room link |
  | get_passport(learner) | solana |

- `src/app/api/openapi.json/route.ts`: OpenAPI 3.1 for the same tools, for raw-API connectors.
- docs/hacktx/MUSE-CONNECTOR.md covers how to add SimLab to Muse as a custom connector, and how to test with an MCP client. Verify Meta's current connector docs first.

## H11 Security and privacy

- No accounts.
- Display names are self-chosen and capped at 24 chars. Chat is capped at 500 chars. The host can remove a peer.
- No personal data in telemetry. Profiles hold no contact info and expire after 24 h.
- Crypto is devnet-only, labelled as such, and opt-in.
- CORS: only our origin for the /api routes, except /api/mcp and /api/openapi.json.
- Every endpoint is rate-limited. Secrets live only in env.

## H12 Ownership (wave 1)

| Label | Owns |
|---|---|
| hx:server-ai | src/lib/server/env.ts, src/lib/server/http.ts, src/lib/server/ratelimit.ts, src/lib/server/ai/**, src/app/api/status/**, src/app/api/ai/**, src/lib/features.ts, .env.example, scripts/smoke-ai.mjs, docs/hacktx/AI.md |
| hx:partner | src/lib/ai/**, src/components/ai/**, src/i18n/messages/*/ai.json |
| hx:search | src/lib/server/search/**, src/app/api/search/**, src/lib/search/**, src/components/search/**, src/i18n/messages/*/search.json, scripts/smoke-search.mjs, docs/hacktx/SEARCH.md |
| hx:solana-program | solana/**, src/lib/solana/idl/**, docs/hacktx/SOLANA.md |
| hx:solana-app | src/lib/solana/** (except idl/), src/lib/server/solana/**, src/lib/verify/**, src/app/api/solana/**, src/components/solana/**, src/app/[lang]/passport/**, src/app/[lang]/verify/**, src/i18n/messages/*/solana.json, docs/hacktx/SOLANA-APP.md |
| hx:realtime-server | server/realtime/** (own package.json and lockfile), deploy/realtime/** (Dockerfile, compose, Caddyfile), scripts/realtime-*.sh, docs/hacktx/REALTIME.md |
| hx:realtime-client | src/lib/realtime/**, src/components/realtime/**, src/app/[lang]/together/**, src/i18n/messages/*/together.json |
| hx:mcp | src/app/api/mcp/**, src/app/api/openapi.json/**, src/lib/server/mcp/**, docs/hacktx/MUSE-CONNECTOR.md |
| hx:data | db/**, src/components/data/**, src/lib/server/db/**, src/app/api/telemetry/**, src/app/api/leaderboard/**, src/app/api/buddies/**, src/app/api/live/**, src/lib/telemetry/**, scripts/db-migrate.mjs, docs/hacktx/DATA.md |
| hx:hw | src/lib/hw/**, src/components/hw/**, src/i18n/messages/*/hw.json, docs/hacktx/HARDWARE.md |

Wave 2 (later):
- hx:dock: LabDock and lab-page integration, nav entries.
- Race ghosts in the flight range.
- Story share page.
- e2e for every hackathon flow.
- Pitch, write-up and video plan.
- Deploy.

## H13 Dependencies

Never run npm install in the repo root and never edit package.json; the core's shell-app agent owns it, and parallel installs corrupt the lockfile.

- **Pre-installed** (by the orchestrator, before you start):
  - zod
  - @solana/web3.js, @coral-xyz/anchor (0.31.x, matching the CLI)
  - @solana/wallet-adapter-base, @solana/wallet-adapter-react, @solana/wallet-adapter-react-ui
  - bs58
  - postgres
  - qrcode, @types/qrcode
  - @modelcontextprotocol/sdk
  - server-only
- **Anything else:** write it in `docs/requests/hx-deps.md` (package, version, why), work around it until installed, and say so in your report.
- **Exempt:** `server/realtime/` and `solana/` have their own package.json files, which their owners install inside those folders.

## H14 Verification

- Unit tests: Vitest next to your code, with mocked fetch and RPC. The Anchor program uses `anchor test` against a local validator.
- Type-check with `npx tsc --noEmit -p <root>` and read only your own files' errors.
- Smoke scripts (`scripts/smoke-*.mjs`) hit the real services only when the key exists, and print pass/fail without secrets.
- Before you finish, run the smoke scripts for your area if keys exist, and report exactly what ran and what couldn't.

## Changelog

- 13:45 orchestrator: initial contract.
- 13:50 orchestrator: H7.1 client API (useRoom, RoomProvider, createRoom); hx:data also owns src/components/data/**.
- 14:00 orchestrator: H2 no longer asks for `export const runtime`. Never export runtime/dynamic/revalidate under cacheComponents; per-request GETs `await connection()`. H2 also points to the core's i18n, progress and figure APIs (docs/requests/shell-app.md) and says how new namespaces get registered. `.env.example` is un-ignored in .gitignore. H13 packages are all installed (docs/requests/hx-deps.md).
- 14:20 orchestrator: H1 adds GEMINI_MODEL (optional, default gemini-3.8-flash; parsed in src/lib/server/env.ts). The solana routes' runtime exports are gone. Wave-1 requests that are still open go to wave 2's hx:fixups.
