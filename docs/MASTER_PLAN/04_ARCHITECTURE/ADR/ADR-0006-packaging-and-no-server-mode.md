# ADR-0006: Packaging, and how the app runs with no server

Status: proposed, 2026-10-27. Author: system architecture seat.
Upstream: D-015, D-013; R-005, R-006, R-014, R-040, R-078, R-079; Next docs `self-hosting.md`, `static-exports.md`, `building.md` (DOCUMENTED); `deploy/realtime/` (VERIFIED).
Downstream: `SYSTEM_ARCHITECTURE.md` 4, 12; AR-01, AR-04, AR-05; AX-01.

## Problem

One documented setup must run the whole thing for Amar and friends, and the app must run with no iynk server at all. The app is a Next.js 16 app with `cacheComponents`, redirects, headers, a language cookie and a catch-all route.

## Constraints

1. Nothing depends on Vercel or any paid service (F-202).
2. One command to start (R-079); TLS in front with the Caddy file already in the repo.
3. An image must not embed a domain or a secret.
4. Static export does not support redirects, headers, cookies, Proxy or request-dependent route handlers (Next docs, DOCUMENTED).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Compose with `web` (Next standalone), `server`, `caddy` on one origin | Chosen for mode B | Chosen |
| B. `web` alone (`npm start`) for mode A | No server | Chosen for mode A |
| C. Static export for mode A | Any file host | Not assumed; PENDING AX-01 |
| D. One image with web and server inside | One container | Rejected: two lifecycles in one container, restarts coupled |
| E. A hosted instance run by Amar | Easiest for friends | Rejected: D-015 |
| F. Electron or Tauri desktop app | No browser storage eviction | Not planned; revisit if eviction proves common (HYPOTHESIS); the portable modules would run unchanged |

## Decision

`deploy/compose.yaml`, `deploy/Caddyfile`, `deploy/Dockerfile.web` and `deploy/Dockerfile.server` as shown in `SYSTEM_ARCHITECTURE.md` 12.1. Same-origin: Caddy sends `/v1/*`, `/healthz` and `/mcp` to the server and everything else to the web container. The server URL in the browser defaults to `/`, so one image works under any domain. All configuration is environment variables (12.2). Mode A is `npm ci && npm run build && npm start`. Static export is tried in AX-01; the design does not depend on it.

## Technical justification

Same origin removes CORS from the app's own traffic and keeps the CSP simple (`connect-src 'self'`). Standalone output bundles only what runs (DOCUMENTED). The existing relay deployment already meets the container hardening list, so the new compose file extends it.

## Performance data

None for packaging. Image sizes are recorded when built (AR-04). First-load JavaScript is budgeted at 400 KB gzip with a CI regression check (BUD-05, PROPOSAL); today 727 KB transferred (MEASURED, PERFORMANCE_BASELINE).

## Cost implications

One small machine. The audit's relay ran on a Vultr VM (`scripts/realtime-vultr-create.sh`); that script is provider-specific and is replaced by documentation that works on any host with Docker.

## Licensing

Next.js MIT, Caddy Apache-2.0, Node MIT (EXTERNAL). `NOTICE` lists them (R-015).

## Security implications

Containers: non-root, read-only root filesystem, `cap_drop: ALL`, `no-new-privileges`, memory caps, log rotation. `/metrics` is never proxied. The `web` container holds no secret and no data.

## Reversibility

High. Compose is configuration. If AX-01 passes, mode A can additionally ship as static files.

## Migration plan

B0: remove Vercel files and variables; keep `npm start` working on any Node host (R-005). COLLAB: add the compose files and `docs/SELF_HOSTING.md`; run the guide on a clean VM (AR-05).

## Known limitations

Docker is assumed for the documented path; a Node-only path (`npm run server`) is documented second. Windows and macOS hosts are not tested. Browser eviction is not solved by packaging.
