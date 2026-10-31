# AI partner, tool calling, translation, voice, stories, search/pricing/BOM, MCP server, OpenAPI

**Paths:** `src/lib/ai/**`, `src/components/ai/**`, `src/app/api/ai/**`, `src/lib/search/**`, `src/components/search/**`, `src/app/api/search/**`, `src/lib/hw/**`, `src/components/hw/**`, `src/app/api/mcp/**`, `src/app/api/openapi.json/**`. The server halves live outside the listed scope but are required to answer the questions, so they are included: `src/lib/server/ai/**`, `src/lib/server/search/**`, `src/lib/server/mcp/**`, `src/lib/server/{env,http,ratelimit}.ts`.
**Entry points:** `POST /api/ai/{chat,translate,transcribe,story,image,plan,match}`; `POST|GET /api/search/{offers,web,videos,nearby,events}`; `POST /api/mcp`; `POST /api/mcp/tools/[name]`; `GET /api/openapi.json`; client `PartnerPanel` (`src/components/ai/PartnerPanel.tsx`), `RealBuildPanel` (`src/components/search/RealBuildPanel.tsx`), `HardwareTwinPanel` (`src/components/hw/HardwareTwinPanel.tsx`).
**LOC:** audited commit bb546d6, 2026-10-26. Non-test TS/TSX, fixtures excluded, measured with `find <dirs> -name '*.ts' -o -name '*.tsx' ! -name '*.test.*' ! -path '*__fixtures__*' -exec cat {} + | wc -l`:

| Group | Non-test LOC | Test LOC | Test files |
|---|---|---|---|
| `src/lib/ai`, `src/components/ai`, `src/app/api/ai` | 4,148 | 1,816 | 15 |
| `src/lib/search`, `src/components/search`, `src/app/api/search` | 2,069 | 773 | 7 |
| `src/lib/hw`, `src/components/hw` | 1,955 | 894 | 6 |
| `src/app/api/mcp`, `src/app/api/openapi.json` | 58 | 0 | 0 |
| `src/lib/server/{ai,mcp,search}` (server halves) | 3,460 | 1,728 | 12 |
| **Total** | **11,690** | **5,211** | **40** |

Plus 1,264 lines of SerpApi sample JSON in `src/lib/server/search/__fixtures__/`.
**Owner today:** "hackathon layer (D14d)" in `docs/ARCHITECTURE.md:109-135`: `src/app/api/**`, `src/lib/{server,ai,search,solana,realtime,hw}/**`, `src/components/{ai,search,solana,realtime,hw}/**`. Work packages named hx:partner, hx:search, hx:server-ai, hx:mcp, hx:hardware in the docs. All of it was written 2026-10-24/25 during the hackathon window (VERIFIED: `docs/hacktx/AI.md` header; git history has 792 commits total).

**Scope correction (VERIFIED).** The task brief says `src/lib/hw/**` holds BOM, prices and the budget optimiser. It does not. `src/lib/hw` is the Web Serial / Firmata hardware twin (mirrors a simulated Uno onto a real Arduino). The BOM, price parsing and optimiser are in `src/lib/search/{bom,optimize,cost}.ts` and `src/lib/server/search/*`. Both are covered below.

---

## Purpose

Six things share this layer:

1. **AI lab partner.** A chat tab in every lab dock. It sees a text dump of the learner's bench, answers Socratically, and can call six tools (two on the server, four in the browser). One of the browser tools, `propose_change`, shows a diff the learner accepts or rejects.
2. **Side AI features.** Chat translation between room peers, voice-to-text, "Build Story" write-ups with a generated cover image, Build Night planner, buddy matcher.
3. **Real-build pricing.** Turns a catalogue item (board, robotics bench, drone) into a shopping list, prices it live through SerpApi (Google Shopping, Amazon, eBay, Walmart), and runs a budget optimiser over battery/motor/prop choices for drones. Also nearby makerspaces, maker events, tutorial videos.
4. **MCP server and OpenAPI.** Seven read-style tools (`search_catalog`, `get_item`, `drone_calc`, `price_parts`, `plan_build_night`, `create_room`, `get_passport`) exposed over MCP Streamable HTTP and as REST + OpenAPI 3.1, built for Meta's Muse connector platform.
5. **Hardware twin.** Optional Web Serial link that mirrors the simulated Uno-class board's pins onto a real Arduino running StandardFirmata.
6. **Provider gateway.** One OpenAI-compatible client for Meta Muse Spark with a Gemini fallback.

---

## Dependencies (imports in, imports out; third-party packages)

**Third-party (VERIFIED, `package.json`):** `zod 4.6.7` (all schemas, JSON Schema for tools and structured output), `@modelcontextprotocol/sdk 1.32.2` (devDependency use only in tests; the server is hand-written, `src/lib/server/mcp/transport.ts`), `@solana/web3.js` (only `get_passport`), `next 16.4.3`, `react 19.3.0`. No AI SDK: the provider is a raw `fetch` client (`src/lib/server/ai/provider.ts`). No SerpApi SDK: raw `fetch` (`src/lib/server/search/serpapi.ts:155`).

**External services (VERIFIED in code):** Meta Model API `https://api.meta.ai/v1` (`src/lib/server/env.ts:35`), Gemini OpenAI-compat endpoint (`provider.ts:19`), SerpApi `https://serpapi.com/search.json` (`serpapi.ts:44`), Solana devnet RPC (passport tool).

**Imports out of this layer into other subsystems:**
- Lab stores and their action types: `@/lib/boardlab/store`, `@/lib/robotics/store`, `@/lib/dronelab/store` (bench adapters, `src/lib/ai/bench/*.ts`).
- Content catalogue: `@/content/ids`, `@/content/index.generated`, `@/content/schema` (BOM, catalog, MCP tools). Hard-wired to the three catalogue id unions `BoardId`, `RoboticsId`, `DroneId`.
- Drone calculator: `@/lib/drone/calc`, `@/lib/drone/design` (optimiser, `drone_calc`).
- Realtime room: `@/lib/realtime` (peers, chat, `ask_peer`), `@/lib/realtime/config` (`create_room`).
- Interpreter/board profiles for the twin: `@/lib/interp/profiles`, `@/lib/boardlab/inputs`.
- i18n: `@/i18n/*`, `src/i18n/messages/*/{ai,search,hw}.json` (6 locales).

**Imports in:** the dock (`src/components/dock/**`) mounts `PartnerPanel`, `RealBuildPanel`, `HardwareTwinPanel`; `src/app/[lang]/together/{Planner,Buddies}.tsx` call `/api/ai/plan` and `/api/ai/match`; `src/lib/realtime/translate.ts:32` calls `/api/ai/translate`; `src/components/realtime/VoiceButton.tsx` calls `/api/ai/transcribe`.

---

## Public interfaces (exported functions/types/components/messages, with path:line)

**HTTP routes (VERIFIED, read from each `route.ts`):**

| Route | Per-minute limit (per IP, in memory) | Notes |
|---|---|---|
| `POST /api/ai/chat` (`src/app/api/ai/chat/route.ts:170`) | 20 | SSE. Events `text`, `tool_call`, `citation`, `done{usage}`, `error{code}`. Up to 4 model rounds (`:17`). |
| `POST /api/ai/translate` | 60 | Up to 20 texts of 2 KB; JSON-schema output; 5,000-entry in-memory cache (`translate/route.ts:28`). |
| `POST /api/ai/transcribe` | 20 | Multipart, 4 MB, WAV to Muse Voice Transcribe, MP3 to Muse Spark `input_audio`. |
| `POST /api/ai/story` | 6 | Up to 300 session-log events in, JSON story out, capped at 250 words. |
| `POST /api/ai/image` | 3 (plus 60/h instance budget) | Muse Image, fixed "Colorfigures" style template. |
| `POST /api/ai/plan` | 6 | Build Night plan; `item` is an enum of catalogue keys. |
| `POST /api/ai/match` | 10 | Buddy matches; ids are enums of the pool. |
| `/api/search/offers` | 20 | GET (one part) or POST (up to 25 parts). |
| `/api/search/web` | 15 | `extract=true` costs up to 3 SerpApi searches. |
| `/api/search/{videos,nearby,events}` | see `routes.test.ts` | One search each. |
| `POST /api/mcp` | 120 | JSON-RPC, both MCP eras (2026-07-28 and 2025-03-26..2025-11-25). |
| `POST /api/mcp/tools/{name}` | 60 | REST twin of each MCP tool. |
| `GET /api/openapi.json` | none | OpenAPI 3.1 generated from the tool registry. |

**Partner tools (VERIFIED, `src/lib/ai/tools.ts`):** `search_datasheet` (server), `find_parts` (server), `highlight_part`, `propose_change`, `ask_peer`, `open_panel` (all client). One zod schema per tool is the single source for the model-facing JSON Schema and for argument validation (`tools.ts` (argSchemas and `parameters()`), `parseToolCall` at `:215`).

**Key exports:**
- `src/lib/ai/client.ts`: `streamChat`, `readSse`, `parseChatEvent`, `writeStory`, `drawCover`, `transcribe`, `AiError`.
- `src/lib/ai/conversation.ts`: `Conversation` class, `conversationFor(lab, itemId)` (`:230`), `toMessages`, `MAX_ROUNDS = 4`, `HISTORY = 24` (`:17`).
- `src/lib/ai/bench.ts`: `describeBench`, `renderBench`, `applyChange`, `BENCH_MAX_BYTES = 12 KB`.
- `src/lib/ai/run-tools.ts`: `runClientTool`, `openDockTab`.
- `src/lib/ai/session-log.ts`: `SessionLog`, `sessionLogFor`, `attachStore`.
- `src/lib/server/ai/provider.ts`: `chat`, `chatJson`, `generateImage`, `transcribeWav`, `ToolCallAssembler`, `AiError`, `safetyId`.
- `src/lib/server/ai/prompts/partner.ts`: `PARTNER_RULES`, `partnerContext`.
- `src/lib/server/search/serpapi.ts`: `createSerpApi`, `offers`, `web`, `nearby`, `events`, `videos`, `extract`, `searchUsage` (exported at `:307`, used nowhere, VERIFIED by `grep -rn searchUsage src`).
- `src/lib/search/bom.ts`: `droneBom`, `roboticsBom`, `boardBom`, `offerParts`; `optimize.ts`: `optimize`, `priceLines`, `costRange`.
- `src/lib/server/mcp/tools/index.ts:11`: `TOOLS` registry; `registry.ts`: `defineTool`, `runTool`, `describeTool`.

---

## State ownership and persistence (stores, localStorage keys, server state, DB tables)

| State | Where | Persistence | Evidence |
|---|---|---|---|
| Partner conversation (turns, tool records, change-card status) | module-level `Map` keyed `lab:itemId` | Memory only. Lost on page reload. No server copy. | `conversation.ts:230` |
| Session log for Build Stories (max 300 events) | module-level `Map`, `SessionLog` | Memory only | `session-log.ts:13`, `sessionLogFor` |
| Last Build Story per item | module-level `Map` | Memory only | `StoryCard.tsx:28` |
| Translation cache | module-level `Map`, 5,000 entries | Per server instance, lost on cold start | `translate/route.ts:28-29` |
| SerpApi cache (6 h, 1,000 entries) and search counter | closure in `createSerpApi` | Per server instance | `serpapi.ts:44-48,138` |
| Rate limits and AI budget | module-level `Map` (10,000 key cap) | Per server instance | `ratelimit.ts` |
| Twin session (Web Serial port, Firmata board) | `twinSession` singleton | Per tab | `session.ts:168` |
| Prices | React state in `RealBuildPanel` | Not stored; refetched per mount | `RealBuildPanel.tsx:95-131` |

No database tables, no localStorage keys, no cookies are used by this subsystem (VERIFIED: no `localStorage` or `sql` reference in the scoped dirs besides telemetry `track` calls). `DATABASE_URL` exists in env but belongs to other subsystems.

Consequence (VERIFIED by reading): there is no per-user identity, no stored chat history, no usage ledger and no durable budget anywhere. Everything that limits spend is in process memory.

---

## Current functionality (what VERIFIED works, how you know)

**Tests.** `npx vitest run` on the scoped dirs plus the three server dirs: 40 files, 344 tests, all passed in 6.4 s (VERIFIED, run 2026-10-26). One jsdom warning: canvas `getContext` not implemented.

**Live Meta check (VERIFIED, one run, ~free).** `node scripts/smoke-ai.mjs --no-image` against the real API with the key in `.env.local`: 6 of 6 checks passed.

| Check | Result |
|---|---|
| models list has our ids | pass, 0.4 s |
| plain chat | pass, 3.2 s, 15 tokens in, 174 out |
| streaming with usage chunk | pass, 4.7 s, 3 deltas |
| tool-call round trip | pass, 3.0 s |
| structured output | pass, 3.6 s |
| transcribe 1 s WAV | pass, 1.2 s |
| image | skipped (`--no-image`, to save the quota) |

Cost of this run: about 4 chat calls and 1 transcription, a few thousand tokens. Pricing per token is not in the repo (UNKNOWN). `smoke-search.mjs` was not run: it needs a running iynk server on a local port and spends SerpApi searches, and the SerpApi key had no searches left (see below).

**SerpApi account state (VERIFIED, `GET serpapi.com/account.json`, which does not count as a search, 2026-10-26).** `plan_name: Free Plan`, `searches_per_month: 250`, `this_month_usage: 250`, `plan_searches_left: 0`, `total_searches_left: 0`. A live `google_shopping` search with this key returned HTTP 429. So with the key in `.env.local`, every live price, nearby, events, videos and datasheet search fails today. Whether production (Vercel) uses the same key is UNKNOWN. I did not retry or probe further.

**Partner chat (VERIFIED in code and by `route.test.ts`, 12 cases, mocked upstream).**
- Validates the whole history shape Meta requires (every tool result answers the preceding assistant turn; chat ends with user or tool): `chat/route.ts:28-41`.
- Streams text, forwards client tool calls to the browser and ends the turn, runs server tools in parallel, feeds results back, caps at 4 rounds with no tools on the last: `route.ts:89-163`.
- Falls back from Meta to Gemini only before any byte was streamed: `provider.ts` `streamChat`.
- Client runs tools, shows cards, continues the chat with results; learner decisions on changes are fed back to the model as `[The learner accepted your proposed code change.]`: `conversation.ts:57-59`.

**Translation (VERIFIED).** Code spans, URLs, numbers with units and pin/part tokens are replaced by `⟦n⟧` placeholders before the model sees the text and restored after. If the model drops or invents a placeholder, the original text is returned (`translate.ts` `mask`/`unmask`; `translate/route.ts:79`). This is a real guard; 4 tests in `translate.test.ts` plus route tests.

**Voice (VERIFIED in code/tests, one live transcription).** Browser records webm/opus, decodes to 16 kHz mono WAV client-side (`voice-wav.ts`), server re-validates and resamples (`wav.ts`) and calls Muse Voice Transcribe. Detected language is a script heuristic, not from the API (`transcribe/route.ts:17-25`).

**Stories (VERIFIED in code/tests).** Session log (bench diffs, chat, passes, faults) goes to `/api/ai/story`, result capped to 250 words, then `/api/ai/image` for the cover, PNG export client-side (`story-png.ts`). Image path not exercised live in this audit.

**Pricing (VERIFIED in code/tests, NOT verified live).** See "Known defects" for the quota problem. Parsing is covered against SerpApi's published sample responses only (see Test coverage).

**Budget optimiser (VERIFIED by tests).** Enumerates all battery x motor x prop combinations (at most 27), runs the drone calculator on each, filters by min T:W, min flight time, a safety "danger" check and budget, ranks by headroom then cost then fewest swaps (`optimize.ts:116-150`).

**MCP (VERIFIED by tests, not by Muse).** Both protocol eras implemented by hand in `transport.ts`; `docs/hacktx/MUSE-CONNECTOR.md` states Muse itself was never tested and `price_parts`, `plan_build_night`, `create_room` were only tested with mocks (`MUSE-CONNECTOR.md:154-160`, DOCUMENTED).

**Hardware twin (VERIFIED by tests, no hardware used).** Firmata encode/parse tests assert exact byte strings (`firmata.test.ts:12-30`, e.g. `f4 0d 01`), derived from the Firmata protocol spec. Only `uno-r3`, `nano`, `uno-r4` can be mirrored (`twin.ts:15`).

---

## Known defects (with repro or evidence)

| # | Severity | Defect | Evidence |
|---|---|---|---|
| D1 | high | **Live prices are dead right now on the key in `.env.local`.** Free plan, 250 of 250 searches used this month. The app turns this into `quota_exhausted` and the panels show the catalogue estimate, so it fails soft, but the headline "real prices" feature does not work. | SerpApi `account.json` response and a 429 from a live search, 2026-10-26 (VERIFIED). |
| D2 | high | **`SERPAPI_MONTHLY_BUDGET` is not monthly and not a real guard.** The counter `used` is a closure variable in one process, never reset, never persisted. On serverless each warm instance has its own counter and its own cache, so total spend is `instances x 200`. The default (200) is also close to the whole free plan (250). `searchUsage()` is exported but never exposed. | `serpapi.ts:138,198-201`; `env.ts:40`; `HX-CONTRACT.md:21` says "per process lifetime" (VERIFIED). |
| D3 | high | **A single cold BOM view spends 17 to 22 percent of a month's free quota.** Searches per cold open, computed by running `droneBom/roboticsBom/boardBom` + `offerParts` on every catalogue item: quad5 42, delivery 54 (max), whoop 36, swarm 32; robotics benches 9 to 24; boards 18 (6 for FPGA boards). Sum over the 13 drones: 578. In-build lines query 3 engines, alternative options 1. | Probe run 2026-10-26 (scratchpad `audit/ai/bom.probe.ts`, command `npx vitest run --config .../vitest.config.mjs`), VERIFIED. |
| D4 | high | **`find_parts` (a partner tool the model can call at will) costs up to 30 searches per call** (10 parts x 3 engines). `search_datasheet` costs up to 3. Nothing meters tool calls per learner. | `serpapi.ts:123,220` (default sources = 3 engines), `src/lib/ai/tools.ts:44` (max 10 parts) (VERIFIED). |
| D5 | high | **Accepting a proposed code change can overwrite the learner's newer edits.** The change card stores the finished `after` text computed when the model proposed it. `decide(accept)` dispatches that stored `code/replace` action blindly. If the learner types between the proposal and the click, their edits are replaced. Same for robotics `task/edit`. No staleness check, no re-apply of the `find/replace` against current state. Repro: ask for a fix, edit the sketch while the card is pending, click Accept. | `bench/board.ts:62-69` (action built from `preview.change.after`), `conversation.ts:220` (dispatch without check), `store.ts:211-214` (replace whole code) (VERIFIED by reading; not reproduced in a browser). |
| D6 | medium | **The model cannot see board or robotics wiring or part ids.** The board and robotics adapters return `parts: []` and `nets: []`. Yet the system prompt tells the model to "use ids exactly as the bench ... write them" and to call `highlight_part` with "an id from the bench description". Highlights on boards/robotics rely on whatever ends up in the `figure:` summary or the model guessing. | `bench/board.ts:47-48`, `bench/robotics.ts:44-45`, `partner.ts` rules, tools section (VERIFIED). Whether this leads to wrong highlights in practice: UNKNOWN, needs a transcript run. |
| D7 | medium | **`propose_change` advertises wire and part changes that two of three labs reject.** Boards: only `code`. Robotics: only `code`. Drone: only `part`. The tool description and zod schema allow all three kinds in every lab, so the model learns by error ("on a board only the code can change") and burns a round. | `bench/board.ts:60-63`, `robotics.ts:60-63`, `drone.ts` apply (VERIFIED). |
| D8 | medium | **Guard budget counts HTTP requests, not model calls.** The comment says "upstream calls this instance makes per hour" but `guardAi` takes one unit per request, while one `/api/ai/chat` request can make up to 4 model calls plus tool searches, and the client re-posts after client tools (up to 4 more requests). Real upstream volume can be up to 16 model calls per user question against a "900 per hour" figure. | `guard.ts:8,22`; `chat/route.ts:17`; `conversation.ts:17` (VERIFIED). |
| D9 | medium | **MCP `plan_build_night` shares one rate-limit bucket for all callers.** The tool calls `/api/ai/plan` over HTTP on `NEXT_PUBLIC_SITE_URL` with no caller IP forwarded, so `/api/ai/plan`'s 6-per-minute limit applies to the server's own egress IP, not per MCP client. The docs admit it. | `backends.ts` (`postRoute`), `MUSE-CONNECTOR.md:138-141` (DOCUMENTED). Exact bucket key behind Vercel: HYPOTHESIS. |
| D10 | medium | **Token usage is returned to the browser but never logged or stored.** `done.usage` is summed per request and sent to the client, where `parseChatEvent` reads it and nothing uses it. There is no server log, counter or ledger of tokens, cached tokens or cost. Also the usage object drops `cachedTokens`. | `chat/route.ts:94,123-125`; `grep -rn inTokens src` shows no consumer (VERIFIED). |
| D11 | low | **Conversations vanish on reload and are not shared.** A learner loses the whole chat and any pending change card by refreshing. | `conversation.ts:230` (VERIFIED). |
| D12 | low | **MCP tool annotations claim every tool is `readOnlyHint: true`**, including `create_room` (mints a room code), `price_parts` and `plan_build_night` (spend money). It is true that none mutate stored state, but the hint hides cost. | `registry.ts:74` (VERIFIED). |
| D13 | low | **`GET /api/openapi.json` and MCP set `access-control-allow-origin: *`, and the Muse connector was never tested.** Whether a no-auth server is accepted, and whether Muse sends an `Origin` that the DNS-rebinding rule would 403, are open. | `mcp/http.ts:7,29-33`; `MUSE-CONNECTOR.md:149-153` (DOCUMENTED). |
| D14 | low | **Model id drift.** Default is `muse-spark-1.3` (works today per smoke test), but `AI.md` records `muse-spark-1.1` returning intermittent 404s and Gemini `3.8-flash` being rate-limited on 2026-10-25. Model ids are env strings with no startup check. | `env.ts:36,41`; `AI.md` models table (DOCUMENTED + VERIFIED for 1.3). |

---

## Technical debt (table: item, path, evidence, severity, effort guess)

| Item | Path | Evidence | Severity | Effort |
|---|---|---|---|---|
| In-memory rate limit, budget, cache | `src/lib/server/ratelimit.ts`, `serpapi.ts`, `translate/route.ts` | Module-level `Map`s; breaks across serverless instances | high | M (move to Redis/Postgres or edge KV) |
| No auth or identity on any AI/search/MCP route | all `route.ts` | Only origin check (absent Origin passes) plus per-IP limit | high | M to L |
| Bench serialisation is heuristic and lossy | `src/lib/ai/bench/generic.ts`, per-lab adapters | Key-name guessing (`pick(state, ["code","source",...])`), JSON "other" fallback, `parts:[]` | medium | M |
| Changes applied as stored full-text replacement | `bench/*.ts`, `conversation.ts:220` | See D5 | high | S to M |
| Catalogue-only BOM: every part query is a hand-written string per item id | `src/lib/search/bom.ts:51,287,342` | `DRONE_PARTS`, `PART_QUERIES`, `BOARD_KITS` records keyed by catalogue ids | high for the builder goal | L |
| Drone BOM `query` strings are guesses at store search terms | `bom.ts` | e.g. `"F405 flight controller 30x30 Betaflight"`; no measured hit rate | medium | M (needs a measurement harness) |
| Search tool results unfenced in the prompt | `src/lib/server/ai/tools.ts:38-45` | Tool output is plain JSON; the injection warning only covers `<<< >>>` | medium | S |
| `ask_peer` executes with no confirmation | `src/lib/ai/run-tools.ts:76-86` | Posts `@name question` to room chat immediately | medium | S |
| Duplicate chat loop caps (client 4, server 4) | `conversation.ts:17`, `chat/route.ts:17` | Independent counters | low | S |
| Hand-rolled MCP transport for two protocol eras | `src/lib/server/mcp/transport.ts` (155 lines), `protocol.ts` | The official SDK is installed but used only in tests; the 2026-07-28 era checked against spec text only | medium | M |
| Docs/code drift | `AI.md` says budget counts "upstream calls"; `HX-CONTRACT.md:21` "per process lifetime" vs `env` name `..._MONTHLY_...` | see D2, D8 | low | S |
| Hackathon-only comments and ids (`HX-CONTRACT H4`, `hx:search`) in code | throughout | Coupling to a contract doc that will not outlive the hackathon | low | S |
| `searchUsage` export unused; no `/api/status` budget readout | `serpapi.ts:307` | grep | low | S |
| Live parsing relies on SerpApi field names | `normalize.ts` | Each engine reads documented fields; an upstream rename silently drops results | medium | M (contract tests against live fixtures) |

---

## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)

40 test files, 5,211 test lines, 344 tests, all passing (VERIFIED). Nature of the checks:

| Area | Files | What they really check | Reference-value quality |
|---|---|---|---|
| Chat route | `src/app/api/ai/chat/route.test.ts` (235 lines, 12 cases) | Protocol handling against a fake upstream built by `__test__/upstream.ts` (hand-made SSE chunks). Round cap, tool pass-through, citation emission, origin, rate limit. | Self-consistency with Meta's documented wire format. No real model output. |
| Provider | `provider.test.ts` (254) | Retry/backoff, SSE chunking, tool-call assembly, Gemini fallback only before output. | Fake upstream. The live smoke script is the only real-API check (and it passed). |
| Translate masking | `prompts/translate.test.ts`, `translate/route.test.ts` | Round-trip of masked tokens, fallback to original. | Deterministic string logic, genuinely tested. |
| Bench / tools | `bench.test.ts`, `bench-labs.test.ts`, `tools.test.ts` | Byte cap (12 KB), section order, Zod validation, apply-change actions per lab against the real store types. | Self-consistency. No test with an adversarial or very large real lab state; no stale-change test (D5). |
| Prompt quality | none | **No evals of the partner's answers**, no Socratic-behaviour check, no safety-rule check, no prompt-injection test. `grep` for "inject/ignore previous" in tests returns nothing. | UNKNOWN quality. |
| Normalisers | `normalize.test.ts` (243), fixtures `*.docs.json` | Mapping of SerpApi **documentation sample** responses (e.g. an Amazon "Coffee" search) to Offer/Place/Video shapes. | Samples are SerpApi's docs examples, not captures of our queries. They prove shape handling, not relevance or price accuracy. |
| Ranking | `rank.test.ts` (75) | Synthetic offers: spec-token matching, 0.3 x median floor. | Self-consistency. No labelled set of real listings. |
| Optimiser | `optimize.test.ts` (200) | Uses a hand-copied quad5 design (`optimize.test.ts:9-45`) and the real calculator; checks ordering and constraint logic. | Self-consistency with `calc`; the calculator's own hardware-derived golden tests live in another subsystem. |
| SerpApi client | `serpapi.test.ts` (242) | Cache, in-flight dedupe, budget, retry, whitelist with a fake `fetch`. | Self-consistency. |
| MCP | `transport.test.ts`, `tools.test.ts`, `e2e.test.ts`, `openapi.test.ts` | JSON-RPC both eras, tool I/O schemas, official SDK client against the handler (legacy era only). | Spec-text derived. No Muse client. |
| Hardware twin | `firmata.test.ts`, `board.test.ts`, `twin.test.ts`, `serial.test.ts` | Exact Firmata byte sequences from the protocol; a fake serial port. | **Best reference quality in this layer** (bytes from the public Firmata spec). No real board was used. |
| UI | `PartnerPanel.test.tsx`, `StoryCard.test.tsx`, `RealBuildPanel.test.tsx`, `HardwareTwinPanel.test.tsx` | jsdom rendering and interactions with mocked fetch. | Component behaviour only. |

Not covered at all: the MCP `get_passport`/`create_room` success paths against real backends, image generation live, voice with real browser audio, search against live SerpApi, concurrency/load.

---

## Performance characteristics (measured if you can, else ESTIMATED/UNKNOWN)

**Latency (VERIFIED, n=1 each, 2026-10-26, from this machine):** chat 3.2 s for 174 output tokens, streaming first-to-last 4.7 s, tool call 3.0 s, structured output 3.6 s, transcribe 1.2 s. Not representative of a 7k-token partner prompt or of `reasoning: "low"` plus 4 rounds. Partner end-to-end latency: UNKNOWN.

**Prompt size per partner round (measured parts, ESTIMATED totals).**
- `PARTNER_RULES`: 2,623 bytes, about 710 tokens at 3.7 bytes/token (measured bytes with `node`, tokens ESTIMATED).
- Six tool specs as sent: 5,142 bytes, about 1,470 tokens at 3.5 bytes/token (measured bytes, tokens ESTIMATED). Sent every round except the last.
- Locale/context message: about 100 to 400 tokens depending on peers (up to 8 peers x up to 40 done-keys).
- Bench dump: capped at 12 KB (`bench.ts:BENCH_MAX_BYTES`, `chat/route.ts:53`), about 3,000 to 3,500 tokens at the cap (ESTIMATED). Typical lab states are smaller; a measured typical size is UNKNOWN.
- History: last 24 messages (`conversation.ts:17`), each up to 16,000 chars server side; client draft capped at 2,000 chars.
- Tool results: `search_datasheet` returns up to 3 results plus 2 pages of 3,000 chars each (`src/lib/server/ai/tools.ts:18`), about 1,700 tokens.
- **Typical round: about 5,500 to 7,500 input tokens, 100 to 600 output tokens** (ESTIMATED). Reasoning tokens count against `maxTokens: 6000` (`chat/route.ts:108-109`, `reasoning: "low"`).

**Caching (VERIFIED in code).** Prefix is rules (system), then context+bench (system), then history, with `prompt_cache_key: "iynk-partner"` on Meta (`provider.ts requestBody`). Whether tools are part of Meta's cached prefix is UNKNOWN. Provider returns `cached_tokens` but it is dropped before reaching any log (D10). No response caching for chat. Translation cached in memory; search cached 6 h per instance.

**Cost per call (ESTIMATED, assumptions stated).** Meta and Gemini prices are not in the repo; `docs/hacktx/AI.md` links Meta's pricing page but quotes no numbers. Using placeholder prices of USD 1.00 per 1M input tokens and USD 5.00 per 1M output tokens (assumption, not a quote):
- One partner round, 6.5k in, 0.4k out: about USD 0.0085.
- One user question with one tool hop (2 rounds, second round about 8k in): about USD 0.02.
- Worst case 4 rounds: about USD 0.04.
- Story: 300 events x about 40 tokens = up to 12k in, plus 6k max out; plus one Muse Image call (price UNKNOWN).
Scale these linearly once real prices are known. At 20 requests/min/IP and 900/h/instance the cap is about USD 8/h/instance at the placeholder price (ESTIMATED), which is a ceiling per warm instance, not a global one.

**SerpApi cost (VERIFIED counts, price EXTERNAL).** See D3/D4. Free plan is 250 searches per month; paid-plan price per search is UNKNOWN here.

**Optimiser cost.** At most 27 calculator runs, pure CPU, negligible (ESTIMATED; not timed).

**MCP `price_parts` worst case:** 25 parts x 3 engines = 75 searches in one call, with a 30 s timeout (`market.ts`), allowed at 60 REST calls/min/IP before the process budget stops it.

---

## Security risks

1. **No authentication anywhere; spend is protected only by per-IP in-memory limits and per-process counters.** `checkOrigin` lets any request without an `Origin` header through (`http.ts checkOrigin`), so `curl` works. `clientIp` trusts `x-real-ip` then `x-forwarded-for`; safe only behind Vercel's edge (VERIFIED code; deployment behaviour DOCUMENTED). Anyone can drain Meta credits (bounded by budget per instance), Muse Image (60/h/instance), or SerpApi searches (D2, D4). Severity: high.
2. **Prompt injection through search results, unfenced.** `search_datasheet` and `find_parts` results (titles, snippets, 3,000 chars of page text per page from arbitrary websites) go to the model as `tool` messages with no `<<< >>>` fence (`src/lib/server/ai/tools.ts:38-45`). The system prompt's data-not-instructions sentence names only the `<<< >>>` blocks (`partner.ts`, last line). A malicious page can steer the model. What an injected model can do, all VERIFIED in `run-tools.ts`/`conversation.ts`:
   - `ask_peer`: posts an arbitrary 4 to 300 character message to the room chat as `@peer ...` immediately, with no confirmation (`run-tools.ts:76-86`). This is the strongest abuse: cross-user spam or social engineering in a room.
   - `propose_change`: gated by Accept/Reject with a diff, which is a real safeguard, except for the stale-overwrite flaw (D5).
   - `highlight_part`, `open_panel`: harmless UI effects.
   - Citation links are `http(s)` only (`normalize.ts safeUrl`, `client.ts parseChatEvent`), so no `javascript:` URL.
3. **Prompt injection through user-controlled and peer-controlled context placed in a `system` message.** The bench dump (code, serial output, error text) and the peer list (names up to 24 chars, `done` keys up to 120 chars) are put in the second **system** message inside `<<< >>>` (`partner.ts:49-53`). The fence neutralises literal `<<<` and `>>>` (`language.ts quoted`) but the model decides what to obey. The bench is entirely client-supplied (`bench: z.string().max(12 KB)`), so a learner can attack only themselves. Peer names and `done` lists come from other room members, so one room member can inject text into every other member's partner. Severity: medium.
4. **Client-forged history.** `messages` may contain assistant and tool turns with arbitrary content (`chat/route.ts:21-26`). Only newly generated calls run on the server, so forging does not execute tools, but it lets a caller fabricate "tool results" to the model. Self-inflicted only. Severity: low.
5. **Costly MCP/REST tools without auth, with open CORS.** `price_parts` and `plan_build_night` spend third-party quota for any caller, `access-control-allow-origin: *` (`mcp/http.ts:7`). `MUSE-CONNECTOR.md` already notes the next step is an API key header. Severity: medium.
6. **Safety identifier is a salted SHA-256 of the IP, 32 hex chars** (`provider.ts safetyId`). Reasonable; the salt `iynk:` is public, so the hash is reversible by brute force over IPv4. Severity: low.
7. **Secrets handling is sound in the code read:** keys read once into `env`, never logged, upstream error bodies reduced to `status type code param` (`provider.ts upstreamDetail`), SerpApi error text never echoed (`serpapi.ts:177`). Keys sit in the URL query string for SerpApi (`serpapi.ts` `api_key` param), which is how SerpApi works; any proxy or log that records URLs would record the key. Severity: low.
8. **Safety advice delivered by an LLM.** The prompt carries LiPo, mains and current-limit rules (`partner.ts` rule 4), but nothing verifies the model followed them and no eval exists. For a product aimed at beginners handling LiPos, this is a liability risk, not a code vulnerability. Severity: medium (HYPOTHESIS that failures occur; no test either way).
9. **Web Serial twin drives real pins.** Guard blocks pins 0/1 and pins wired to lesson inputs (`twin.ts:5-8`). Residual risk is a user connecting a non-Firmata or non-Uno board; `identifyUsb` and `supports()` handle capability. Not tested on hardware. Severity: low.

---

## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)

**Verdict: the AI chat plumbing can; the pricing, MCP and plan features cannot, today.**

| Piece | Works on a user-created project? | Why |
|---|---|---|
| Provider gateway, SSE, tool loop, translation, voice, story, image | **Yes** | Take free text or an event list; no catalogue dependency. |
| Partner chat | **Partly** | `lab`/`itemId` are free-form in the request schema (`lab: enum of 3 labs`, `itemId: string max 64`), and the bench is a string. But the prompt text hard-codes the three labs, `highlight_part` needs a figure with part ids, and `propose_change` needs a bench adapter per lab (`bench.ts:adapters`) that knows each store's action types. A new project type needs a new adapter. `genericFacts` and `previewChange` give a read-only fallback by guessing field names. |
| Bench context | **Partly** | `genericFacts` handles unknown state by key names (`code`, `wires`, `faults`, `tests`...), so any store that uses these names gets a usable prompt. Anything else lands in a 2,000-char JSON blob. |
| BOM and `find_parts` | **No** | `droneBom/roboticsBom/boardBom` are keyed on the catalogue id unions (`bom.ts`); every query string is hand-written per item. `price_parts` can price an arbitrary `parts` list (`market.ts`), so free-form pricing exists, but there is no way to derive a BOM from an arbitrary circuit or code. |
| Budget optimiser | **No** | Hard-wired to drone battery/motor/prop slots and the drone calculator. |
| `plan_build_night`, `match` | **No** | Output is an enum of catalogue keys (`plan.ts:replySchema`, `catalog.ts`). A user-created project is not selectable. |
| MCP tools | **No for projects** | `search_catalog`/`get_item`/`drone_calc` read static content; `create_room` takes catalogue ids. There is no `project` concept. |
| Hardware twin | **Only Uno-class boards** | `TWIN_BOARDS = [uno-r3, nano, uno-r4]` (`twin.ts:15`). |
| Persistence | **No** | No chat history, no per-user state, no accounts. |

---

## Required refactoring to get there

1. **Introduce a project abstraction** the AI layer reads from (parts, nets, code, faults, tests, run trace) with a typed schema, replacing key-name guessing in `bench/generic.ts`. Keep adapters but make them implement one `ProjectSnapshot` interface. Same interface should carry apply-actions with a base revision so stale proposals are rejected (fixes D5).
2. **Make proposals revision-safe:** store `find/replace` plus a state hash, re-apply on Accept, show "the code changed since this suggestion" when the hash differs.
3. **Fence tool output and add a tool-result trust policy:** wrap search/page text in the `<<< >>>` fence, strip it of instruction-like lines, and add a confirm step for `ask_peer`.
4. **Replace in-memory guards with durable ones:** a shared store (Postgres, Redis or edge KV) for rate limits, the AI budget, the SerpApi monthly counter and a usage ledger (tokens in, cached, out, provider, route, user/session). Log `done.usage` server-side (D10).
5. **Add identity** (at minimum anonymous signed sessions; accounts later) so limits and budgets can be per user, and add an API key for MCP/REST.
6. **Generalise the BOM:** derive shopping queries from a structured part list with canonical part numbers (a parts table), not from per-item string maps; measure listing match rate on a labelled sample.
7. **Search quota strategy:** cache results in the shared DB, cap per-view search fan-out (3 engines to 1 by default, expand on demand), and move to a paid plan or another provider before launch.
8. **Evals:** a fixed set of 30 to 50 bench states with expected behaviours (Socratic hint first, safety warnings on LiPo/mains, refuses to invent pins, injection resistance) run against the real model on every prompt change.
9. **Decouple plan/match from the catalogue** so the enum is built from the user's project list plus the catalogue.
10. **Retire the hackathon contract naming** (`HX-CONTRACT`, `hx:*`) from code comments and docs.

---

## Recommendation: preserve | extend | replace | deprecate | investigate (one line of reasoning)

**extend** the AI client, tool loop, translation masking, voice pipeline, MCP registry and optimiser (they are tested, typed and structurally sound), but **replace** the in-memory guards, the catalogue-keyed BOM and the stale-apply change path before any public launch.

---

## Open questions

1. Does production (Vercel) use the same SerpApi key that has 0 searches left, and what plan will launch run on? (Changes whether "real prices" is a launch feature.)
2. What are Meta Muse Spark's and Gemini's real per-token prices, and is the tool schema part of Meta's cached prefix? (Cost model above uses placeholders.)
3. What is the real distribution of bench-dump sizes per lab (median, p95)? Only the 12 KB cap is known.
4. How often does `highlight_part` get a wrong or invented id on boards and robotics, given the model sees no part list there (D6)? Needs a recorded-transcript run.
5. Does Muse's connector platform accept a no-auth MCP server and what `Origin`/headers does it send (D13)?
6. Is the partner's safety behaviour (LiPo, mains) acceptable under adversarial and ordinary prompts? No eval exists.
7. What fraction of real SerpApi listings pass `rankOffers` for each BOM query, and how accurate are the chosen "best" prices? No live fixtures exist, and the quota is spent.
8. What retention and privacy stance applies to the bench dumps (user code) sent to Meta, given `safety_identifier` is a hash of the IP and the `-contributor` model ids are avoided (DOCUMENTED, `AI.md`)? No privacy policy exists (`MUSE-CONNECTOR.md:157`).
9. Should a user project be a first-class server object (with revisions), or stay a browser-only store the AI reads by snapshot?
