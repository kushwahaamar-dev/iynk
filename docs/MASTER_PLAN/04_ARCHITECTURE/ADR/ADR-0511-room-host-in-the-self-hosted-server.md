# ADR-0511: The room host is a module of the single self-hosted server

Status: proposed, 2026-10-27. Author: realtime-architecture seat.
Upstream: D-015; R-078, R-079, R-098; F-118, F-165, F-198, F-199; RS-09 throughput. Spec: REALTIME_ARCHITECTURE 17.

## Problem

Today the relay is its own deployment with its own env names and a Vercel-flavoured deploy script and `.env.example`. D-015 wants one documented server anyone can run, with the relay as part of it.

## Constraints

1. One process, one data directory, one documented setup.
2. Nothing depends on Vercel or paid services.
3. Safe by default for a public URL.

## Considered options

| Option | Verdict |
|---|---|
| A. One Node process with HTTP, WebSocket, `RoomCore`, store and admin CLI; Caddy in front | Chosen |
| B. Separate relay and API services | Rejected: two deployments, two configs, no shared transaction for invites |
| C. Serverless | Rejected by D-015 and by long-lived sockets |
| D. Clustered relays | Rejected: UNKNOWN need; friends-sized |

## Decision

Modules and env vars as in REALTIME_ARCHITECTURE 17.1 and 17.2 with an `IYNK_` prefix; enrollment by code by default; non-root, read-only root, `cap_drop: ALL`, memory cap (kept from `compose.yaml`); `/healthz`; `/metrics` only on loopback; HTTPS via Caddy, with the secure-context caveat documented; backup is stop and copy or `VACUUM INTO`.

## Technical justification

RS-09 core 52,000 to 57,700 ops/s on one core versus a few ops per second per human; RB-7 ESTIMATES 20 live rooms on 1 vCPU and 512 MB, checked by RA-08.

## Performance data

RB-1, RB-6, RB-7 are ESTIMATED until RA-08.

## Cost implications

S8 about 1 week plus the guide (F-198).

## Licensing

Caddy Apache-2.0 (EXTERNAL); Node, ws MIT.

## Security implications

Refuses to start with `*` origins or missing required settings; never logs tokens, secrets, project text or chat.

## Reversibility

High. Modules stay separable; the sockets could move to their own process later.

## Migration plan

`deploy/realtime/` becomes `deploy/server/`; the old env names print an error with the new names. Old Vultr scripts are deleted or rewritten (they mention Vercel).

## Known limitations

One process is a single point of failure by design. LAN-only HTTPS needs the extra step. Scale beyond a friends group is not planned.
