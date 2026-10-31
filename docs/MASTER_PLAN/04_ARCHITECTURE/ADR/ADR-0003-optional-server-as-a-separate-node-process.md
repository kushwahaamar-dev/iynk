# ADR-0003: The optional server is one separate Node process, not Next route handlers

Status: proposed, 2026-10-27. Author: system architecture seat.
Upstream: D-015; R-007, R-078, R-005; SECURITY_BASELINE section 1 (23 routes, none authenticated), R1 to R12; inventories `realtime.md`, `server-data.md`, `ai-search-mcp.md`.
Downstream: `SYSTEM_ARCHITECTURE.md` 6.10, 9, 15; ADR-0004, ADR-0007, ADR-0008, ADR-0009; X8.

## Problem

Server code is split across two runtimes. 23 route handlers live inside the Next app (`src/app/api`) and share the web process; the relay is a separate Node process (`server/realtime`). The route handlers are open to the internet, use an in-memory rate limiter per instance, and several depend on the operator's paid keys. D-015 wants one documented self-hostable server, and the web app to be hostable without it.

## Constraints

1. One documented setup; one data directory to back up (R-078).
2. The web app must be servable without any iynk server (mode A).
3. Room state is memory plus a SQLite file in one process; restarting the web app must not drop rooms.
4. Handlers should be portable: tests and code reuse `http.ts` (`src/lib/server/http.ts`).
5. Next's static export forbids route handlers that read requests (Next docs, DOCUMENTED); keeping routes in Next would block that option.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Keep API routes in Next and the relay separate | Two server runtimes, today's shape | Rejected: two places to authenticate, two lifecycles, and web restarts and room restarts coupled to different processes |
| B. One plain Node process (`server/`) for relay, store, devices, shares, optional proxies; Next serves pages only | Single trust boundary, single writer | Chosen |
| C. A Next custom server hosting both | Single process | Rejected: ties the relay's lifecycle and memory to Next; custom servers disable some Next optimisations (EXTERNAL, not verified here) |
| D. Serverless functions per route | What Vercel gave | Rejected by D-015 and F-202 |

## Decision

`server/` is a TypeScript package run directly by Node 24 (ADR-0014). It owns devices, buddies, rooms, the op log, snapshots, shares, laps, and the optional AI, search, MCP and compile routes. Handlers have the signature `(req: Request) => Promise<Response>` and are mounted by a thin Node `http` adapter, so they can be mounted in Next route handlers again if this decision is reversed. The Next app has no `app/api` after the server package takes the routes at the start of COLLAB; until then the routes that exist are closed by R-007.

## Technical justification

One writer process makes SQLite safe and simple (ADR-0004). One authentication check on one entrance (the device token) replaces 23 independent route gates, and the allow-list test (AR-06) is a single enumeration. Caddy puts web and server on one origin, which removes CORS for the app's own calls and keeps cookies out of the design (no CSRF surface).

## Performance data

Relay load test (audit, loopback, 14-core Mac): 0 gaps at 8 peers in one process (`realtime` inventory, MEASURED by the audit). No measurement exists for the new server; AR-08 and AR-23 add them.

## Cost implications

One small machine runs three containers (web, server, caddy), each capped at 512 MB in the proposed compose file. No paid service.

## Licensing

`ws` (MIT, EXTERNAL) remains the only runtime dependency of the relay; Caddy is Apache-2.0 (EXTERNAL). `server/realtime/package.json` declares MIT today; D-017 requires the placeholder (Objection 7).

## Security implications

Removes unauthenticated routes (R-007), CORS `*` (MCP, OpenAPI), the public counter and the public buddy pool. All state-changing requests need a device token. The server's blast radius is the data directory.

## Reversibility

High by construction (Fetch-style handlers). A reversal costs the Next route files and a loss of the single-origin simplicity.

## Migration plan

X8: `git mv server/realtime server`; copy `src/lib/server/{http,ratelimit,env,ai,search,mcp}` into `server/src`; run both; switch the client to `/v1`; delete `src/app/api`. Keep the 39 relay tests and the route tests green at each step.

## Known limitations

Two TypeScript projects to check. One process means no horizontal scale; D-013 says that is acceptable. `ai`/`search` proxies share the process with the relay; a long upstream call must not block the event loop (all I/O is async).
