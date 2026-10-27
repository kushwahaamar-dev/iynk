# ADR-0420: The server is a separate Node process; the web app has no API routes

Status: proposed, 2026-10-27. Author: frontend and backend architecture seat.
Upstream: D-015, F-199, R-078, B5-04, B7-07, Next docs `backend-for-frontend.md`, `custom-server.md`, `output.md`. Downstream: F-116 to F-122, F-165, F-167, F-198, F-199. Spec: BACKEND_ARCHITECTURE section 4. Related: ADR-0003 (the system seat's record of the same choice; the two agree and one should be marked a duplicate when the ADR set is merged).

## Problem

Rooms need WebSockets and durable state. Today the HTTP API is 23 Next routes with no authentication and the relay is a second service with memory-only state. F-199 asks whether the API stays in Next or moves.

## Constraints

1. One documented setup on a machine Amar controls (K-SELF).
2. Route Handlers cannot hold a WebSocket open.
3. Standalone output does not trace a custom server.
4. The server may be absent; the app must say so plainly (R-012).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Next routes plus relay | Today | Rejected: two limiters, no durable state |
| B. Next custom server with `ws` | One process | Rejected: incompatible with standalone output; welds server to framework |
| C. Separate process | `server/` with HTTP, WebSocket, store and optional modules | **Chosen** |

## Decision

1. `server/` serves HTTP under `/v1` (plus `/healthz` and `/readyz`) and the WebSocket at `/ws`; the AI, search, MCP and compile modules are optional.
2. The web app keeps only `/config.json` (runtime server address).
3. Deploy shapes: none, laptop dev, compose with Caddy (kit under `deploy/`).
4. Hackathon routes are deleted; AI, search and MCP move in the AI phase; until then they sit behind one static `IYNK_SERVER_TOKEN` (slice BE-0, deleted in BE-1).

## Consequences

- Moving about 78 files costs effort but removes `server-only` coupling.
- One command means compose with three containers, not one process.
- R-007's route-file test becomes a registry test.

## Technical justification

The Next docs say a Route Handler cannot hold a WebSocket (`backend-for-frontend.md:927`) and that standalone output does not trace a custom server (`custom-server.md`), so rooms need a process that is not a Route Handler (DOCUMENTED). One process that owns HTTP, the socket, the store and the limiter gives one place for authentication, one limiter instead of two, and one data directory (R-078). Handlers are written as `(req: Request) => Promise<Response>` (SYSTEM_ARCHITECTURE 9.1), which most existing routes already are, so the move is mostly relocation. The same record exists from the system seat as ADR-0003; both reach option C.

## Performance data

The room core handles 52,000 to 57,700 ops per second on one core and acks with p50 0.6 ms, p95 0.73 ms, p99 1.05 ms with 5 clients (RS-09, VERIFIED, reproduced by the independent check). Those numbers are for the core in memory on a laptop. The process on a 1 vCPU, 512 MB machine with the store attached is UNKNOWN until RT-1 and RA-08 (BA-05, REALTIME RB-7: 20 live rooms, ESTIMATED). The extra loopback hop from Caddy to the server is small and not measured (HYPOTHESIS).

## Cost implications

No recurring cost: the server runs on a machine Amar already has, in the same compose file as the web app. One-time effort, ESTIMATED 1 to 2 weeks for relocating about 78 files and rewriting routes as Fetch-style functions, assuming one engineer and that the shared `core` and `protocol` folders exist (judgement, not measured). A third container (Caddy) is the operational cost of not serving the app from the server.

## Licensing

No new dependency is added by this decision. The server uses `ws` (MIT, EXTERNAL, not re-checked here); Caddy is Apache-2.0 (EXTERNAL, not re-checked); Node.js is MIT. The repository licence is decided later (D-017).

## Security implications

Removes the 23 unauthenticated Next routes (SECURITY_BASELINE section 1) and the three routes with CORS `*`. Every route has a class and a limiter entry, enforced by a registry test (BA-11). Origins are an allow-list; `/metrics` is on a separate loopback listener. Until the AI phase, the routes that remain in Next are gated by `IYNK_SERVER_TOKEN` (at least 32 random bytes, constant-time compare), which is removed when device tokens ship.

## Reversibility

High for HTTP, low for the socket. Because handlers are Fetch-style they can move back into Next route handlers; the WebSocket cannot, so a reversal would need a separate socket process anyway. Reverse if: Amar wants a single binary. Then serve a static export from the server process, after replacing the `redirects()` and `headers()` logic (see ADR-0401).

## Migration plan

BE-0: delete the hackathon routes, gate what remains behind `IYNK_SERVER_TOKEN`, add `/config.json`. BE-1: create the `server/` package from `server/realtime` with `git mv`, port the 39 relay tests, delete `IYNK_SERVER_TOKEN`. BE-4: move AI, search and MCP into `server/src/modules/`. After that the web app has no `src/app/api`.

## Known limitations

Three containers, not one process (Objection 4 in the backend file). The server is a single writer: more than one instance would need rooms pinned to one process, which is not planned. Whether the web build accepts the shared `.ts` sources is checked by BA-02, not assumed.
