# iynk as a Muse connector (and a tool for any MCP client)

Owner: hx:mcp. Updated 2026-10-24, 14:20 CDT. Code: `src/lib/server/mcp/**`, `src/app/api/mcp/**`,
`src/app/api/openapi.json/route.ts`. Contract: HX-CONTRACT H10.

iynk exposes its catalogue, the drone calculator, live parts prices, the Build Night planner, room links and the
Solana passport as tools that Meta's Muse agent (or any other MCP client) can call:

| Surface | URL | For |
|---|---|---|
| MCP server | `POST <site>/api/mcp` | Muse "Existing MCP" / custom connectors, Claude, MCP Inspector, any MCP client |
| OpenAPI 3.1 | `GET <site>/api/openapi.json` | Muse "Raw API" connectors, GPT-style actions, Postman |
| REST tools | `POST <site>/api/mcp/tools/<tool>` | the operations the OpenAPI document describes (body = the tool's arguments) |

`<site>` is `NEXT_PUBLIC_SITE_URL`. Muse runs in Meta's cloud, so it can only reach a public HTTPS deployment, never
`localhost`.

## The tools

Every tool only reads (MCP annotation `readOnlyHint: true`; Muse's guideline class "Read"). One registry
(`src/lib/server/mcp/tools/`) defines each tool once, with zod input and output schemas; MCP `tools/list`, the REST
endpoints and the OpenAPI document are all generated from it.

| Tool | What it does | Backed by | Needs on the deployment |
|---|---|---|---|
| `search_catalog(query, lab?, locale?, limit?)` | Finds boards, robotics benches and drones by name, tag, chip, language, firmware, module or part | `src/content/ids.ts` + item prose in `src/i18n/content` | nothing |
| `get_item(lab, id, locale?)` | One item: title, overview, lessons / tasks / bench tests, a drone's battery, motor and prop options, sources, page link | `src/content/index.generated.ts` data modules | nothing (details are `null` until the item's data module exists) |
| `drone_calc(drone, battery?, motor?, prop?)` | AUW, thrust-to-weight, hover throttle and current, hover and flight minutes, max current, cost, design checks and verdicts | `src/lib/drone` (`evaluateDesign`, `verdicts`, `checkLevel`) | the drone's data module |
| `price_parts(lab, id, pick?, parts?, locale?)` | The item's parts list (a drone's build as picked, a bench's board, modules and parts, a board's starter kit) or your own list, with live listings per part (Google Shopping, Amazon, eBay), the best one in stock, line cost, catalogue estimate and total | hx:search `boardBom`/`roboticsBom`/`droneBom`/`offerParts` (`src/lib/search/bom.ts`), `offers()` (`src/lib/server/search/serpapi.ts`), `lineCost`/`sumMoney` | `SERPAPI_KEY` |
| `plan_build_night(participants[], locale?, messages?)` | One project the whole group will enjoy, with roles, first tasks and steps | `POST /api/ai/plan` (hx:server-ai, Muse Spark) | `META_API_KEY` (or Gemini) |
| `create_room(lab?, id?, locale?)` | A fresh room link (6-character code) on one item, up to 8 people | `createRoom()` from `src/lib/realtime/config.ts` | `NEXT_PUBLIC_REALTIME_URL` |
| `get_passport(learner, locale?)` | The learner's Proof of Build credentials on devnet (skill id, score, replay hash, issue time, Explorer link), plus the public `/verify` link | hx:solana-app `readContext()` + `credentialsOf()` (`src/lib/solana/reads.ts`) | `NEXT_PUBLIC_SOLANA_PROGRAM_ID` |

A tool whose feature is missing answers with a tool error whose text ends in `[not_configured]` ("… is not set up
on this deployment"); the REST twin answers `503 { error: { code: "not_configured" } }`. Bad arguments come back
as tool errors (`isError: true`) naming the field, so a model can correct itself; an unknown tool name is a JSON-RPC
error (`-32602`).

## What Muse can do with iynk (example prompts)

- "Plan a drone night for me and my cousins Ana (new to this, wants to fly fast) and Ravi (knows soldering). Then
  give us a room link." → `plan_build_night`, then `create_room` on the planned item.
- "I want to learn FPGAs. What can I practise on in iynk, and what's the first lesson?" → `search_catalog`
  ("fpga verilog"), `get_item` (basys3).
- "Would a 6S 1800 mAh pack with 2450 KV motors work on the 5-inch quad? Why not?" → `drone_calc` (it reports the
  over-spin check and the numbers).
- "How much would the 5-inch quad cost to build for real, with the bigger 1800 mAh pack?" → `price_parts`
  (drone quad5, `pick: { battery: "6s1800" }`).
- "Find me a motor-driver bench my 12-year-old can start with, in Spanish." → `search_catalog` with
  `locale: "es"`.
- "Has wallet 9xQe…VFin passed the drone safety tests? Send me proof I can share." → `get_passport`.

## Adding iynk to Muse

### 1. As a custom connector, for one person (no review)

What Meta's Help Center says (read 2026-10-24): "If you want to connect to a service not yet available in the
Connector list, you can ask Muse to create a Custom Connector. Muse will guide you through the process…", and
"Meta doesn't review custom connectors or how they use your information". Approval behaviour ("only retrieve data,
not take actions", when Muse asks for approval) is set in Muse's Settings.

Steps (deploy first; Muse cannot reach localhost):

1. In a Muse chat, send: *"Add a custom connector for iynk. It is a remote MCP server over streamable HTTP at
   `https://<site>/api/mcp`, with no authentication. Its OpenAPI spec is at `https://<site>/api/openapi.json`."*
2. Answer Muse's transport and auth questions: remote HTTP, no auth (no API key, no OAuth).
3. Ask Muse to list iynk's tools and to try `search_catalog` with "esp32". Seven tools should appear.
4. In Settings, keep iynk read-only (every tool already is).

Third-party guides disagree on the exact UI: anythingmcp.com describes Settings → Connectors → "Add custom connector"
with a pasted URL and OAuth sign-in (checked by them 2026-09-25); parallel.ai (2026-09-14) says there is no "add MCP
server" setting and the setup happens in chat. Try the Settings path first, then the chat path.

### 2. In Muse's connector directory (reviewed, for everyone)

Meta opened the Muse Connector Platform on 2026-09-18 (`muse.ai/platform`, which redirects to
`platform.muse.ai`). The form has three steps:

| Step | What it asks | iynk's answer |
|---|---|---|
| Overview | connector name, product website, example prompts, icon, privacy and terms URLs | "iynk", `<site>`, the prompts above, `<site>/icon.svg`, privacy/terms URLs (still to write, see gaps) |
| Technical specs | connection type **Existing MCP** (hosted endpoint + docs) or **Raw API** (API URL, optional OpenAPI URL, docs); auth: API keys, OAuth with PKCE, or Other | Existing MCP: `<site>/api/mcp`, docs: this file. Raw API alternative: `<site>`, `<site>/api/openapi.json`. Auth: none ("Other: public, read-only, rate-limited") |
| Review | confirm and agree to the Muse Connector Terms | — |

Meta then reviews "functional, security, and legal requirements" with end-to-end testing. The connector guidelines
at `platform.muse.ai/docs` ask for factual tool descriptions, a Read / Write / Sensitive-write class per tool (all of
iynk's are Read), privacy and terms URLs, support and security contacts, and a test account for reviewers (iynk has
no accounts, so none is needed). Review time is not published; for HackTX use path 1.

## Testing with an MCP client

Replace `$SITE` with the deployment (or `http://localhost:3000` under `next dev`; set `NEXT_PUBLIC_SITE_URL` to the
same origin so the returned links match).

Legacy handshake (MCP 2025-11-25, what today's SDKs speak):

```sh
curl -s $SITE/api/mcp -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'
curl -s $SITE/api/mcp -H 'content-type: application/json' -H 'mcp-protocol-version: 2025-11-25' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"drone_calc","arguments":{"drone":"quad5"}}}'
```

Modern request (MCP 2026-07-28: no handshake, version in `_meta`, method and tool name mirrored in headers):

```sh
curl -s $SITE/api/mcp -H 'content-type: application/json' -H 'mcp-protocol-version: 2026-07-28' \
  -H 'mcp-method: tools/call' -H 'mcp-name: search_catalog' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_catalog","arguments":{"query":"esp32"},"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}}'
```

REST twin: `curl -s $SITE/api/mcp/tools/search_catalog -H 'content-type: application/json' -d '{"query":"esp32"}'`.

Other clients:
- MCP Inspector: `npx @modelcontextprotocol/inspector`, transport "Streamable HTTP", URL `$SITE/api/mcp`.
- Claude Code: `claude mcp add --transport http iynk $SITE/api/mcp`.
- The repo's own end-to-end test drives the route handler with the official SDK client (`Client` +
  `StreamableHTTPClientTransport`): `npx vitest run src/lib/server/mcp`.

## Protocol behaviour

- Streamable HTTP, stateless. Each POST carries one JSON-RPC message and gets one `application/json` answer; no SSE,
  no `Mcp-Session-Id`. GET and DELETE answer 405 (both protocol eras allow that), batches answer 400.
- Dual-era. A request whose `params._meta` names `io.modelcontextprotocol/protocolVersion` is served as MCP
  2026-07-28: `MCP-Protocol-Version`, `Mcp-Method` and (for `tools/call`) `Mcp-Name` must match the body
  (base64 `=?base64?…?=` values are decoded), or the answer is 400 with `-32020 HeaderMismatch`; an unsupported
  version is 400 `-32022` listing the supported ones; an unknown method is 404 `-32601`; results carry
  `resultType: "complete"`; `server/discover` is implemented. Anything else is legacy: `initialize` echoes
  2025-11-25, 2025-06-18 or 2025-03-26 when asked, else offers 2025-11-25; a missing `MCP-Protocol-Version` means
  2025-03-26, an unknown one is 400.
- Tools: `tools/list` (no pagination; seven tools in a fixed order), `tools/call`, `ping`. No resources or prompts.

## Auth, limits and safety

- No authentication, on purpose: every tool reads public data, iynk has no accounts (H11), and the tools hold no
  personal data. `get_passport` reads a public blockchain address the caller already knows.
- Rate limits per IP (in-memory, per instance): 120 MCP requests/min, 60 REST tool calls/min, plus each backing
  route's own limit and SerpApi's `SERPAPI_MONTHLY_BUDGET` quota guard. `plan_build_night` spends Meta model quota and
  `price_parts` spends SerpApi searches; if a connector gets abused, the next step is an API key header (Muse's form
  supports API keys), not built today.
- DNS rebinding (MCP transport security rule): a request with an `Origin` header must arrive under a host iynk
  serves (`localhost`/`127.0.0.1`/`[::1]` or `NEXT_PUBLIC_SITE_URL`'s host), else 403. Agents send no Origin and are
  unaffected. CORS is open (`*`) on these three routes only, as H11 allows.
- Upstream errors never pass through: each failure becomes a short, safe message and a code
  (`bad_input`, `not_found`, `not_configured`, `rate_limited`, `upstream`, `internal`).
- `plan_build_night` calls iynk's own `/api/ai/plan` on `NEXT_PUBLIC_SITE_URL` (never on the request's Host
  header, so callers cannot redirect it).

## What is unverified or still open

- **Muse itself was not tested** (it needs a deployed HTTPS URL and a US Muse account). Unknown: which MCP version
  Muse speaks (the server handles both eras), whether a custom connector accepts a server with no auth (one guide
  mentions OAuth sign-in), and whether Muse sends an `Origin` header (if it does from a Meta host, the 403 rule above
  would block it: check the Vercel logs on the first try and widen the rule if needed).
- `plan_build_night` goes through HTTP to `/api/ai/plan` until hx:server-ai exports the plan pipeline as a server
  function (docs/requests/hx-mcp.md). Until then all MCP callers share the plan route's rate-limit bucket.
- Live checks on 2026-10-24 (dev server, official SDK client over HTTP): all seven tools answered; `get_item` returned
  the real data modules of five boards, two benches and quad5; `get_passport` read devnet for real; `price_parts`, `plan_build_night` and `create_room` answered "not set up" because this machine has
  no `SERPAPI_KEY`, `META_API_KEY` or `NEXT_PUBLIC_REALTIME_URL`. Their success paths are covered by unit tests
  with mocked SerpApi and plan responses only.
- The directory submission needs privacy and terms URLs that iynk does not have yet.
- The modern-era (2026-07-28) behaviour was checked against the spec text with hand-written requests; no 2026-07-28
  client SDK was installed to cross-check it. The legacy era was checked with the official SDK client 1.32.2.

## Sources (all read 2026-10-24)

- MCP Streamable HTTP, 2026-07-28: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http
- MCP versioning and backward compatibility: https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning
- MCP `server/discover`: https://modelcontextprotocol.io/specification/2026-07-28/server/discover
- MCP tools (result shapes, error handling): https://modelcontextprotocol.io/specification/2026-07-28/server/tools
- MCP transports, 2025-11-25 (legacy era): https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
- Meta Help Center, "How Muse works with Connectors": https://www.meta.com/help/artificial-intelligence/1687253048996149/
- Muse Connector Platform (Meta): https://platform.muse.ai/ and its guidelines https://platform.muse.ai/docs
- Stacktree, "Muse connector platform" (2026-09-19, form fields): https://stacktr.ee/blog/muse-connector-platform
- Parallel, "How to create custom integrations with Meta Muse" (2026-09-14): https://parallel.ai/articles/meta-muse-custom-integrations
- AnythingMCP, "Meta Muse MCP: add custom connectors" (checked 2026-09-25): https://anythingmcp.com/guides/clients/muse
- Installed `@modelcontextprotocol/sdk` 1.32.2 (`dist/esm/types.js`: latest protocol 2025-11-25), used only by the
  tests (MIT licence). JSON Schemas come from zod 4's `z.toJSONSchema`.
