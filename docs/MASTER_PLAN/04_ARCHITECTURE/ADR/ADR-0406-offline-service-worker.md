# ADR-0406: A hand-written service worker; `useOffline` not enabled

Status: proposed, 2026-10-27, revised after review the same day. Author: frontend and backend architecture seat.
Upstream: R-040, D-011, F-094, SYSTEM ADR-0012, Next docs `offline-support.md`, `progressive-web-apps.md`. Downstream: F-094, F-200. Spec: FRONTEND_ARCHITECTURE section 10.

## Problem

R-040 asks for home, library, editor and a run to work offline after one online load. `experimental.useOffline` only retries failed navigations and Server Actions; it caches nothing.

## Constraints

1. Do not force-reload a Studio session under the user.
2. The 24.7 MB of figures cannot be precached.
3. A stale shell must not talk the wrong server protocol (R-079).
4. No new dependency for one file.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Workbox or a Next PWA plugin | Dependency | Rejected: 300 lines of own code is enough |
| B. `useOffline` only | Experimental | Rejected: does not satisfy R-040 |
| C. Hand-written `public/sw.js` | Versioned precache, runtime caches | **Chosen** |

## Decision

1. Precache of the shell for `/en`, `/en/studio`, `/en/settings`, boot script, CSS and the sim and project workers, under 1.5 MB gzip (ESTIMATED).
2. Cache-first for `/_next/static/*`; network-first with 3 s timeout for navigations; figures stale-while-revalidate with a 200 MB cap; engines by `loadEngine`; never cache `/api/v1/*` or sockets.
3. `BUILD_ID` from `generateBuildId` names the cache; a new worker waits and the page shows an update banner.
4. Whether Next RSC requests can be served from the cache is UNKNOWN; the fallback is a hard navigation answered from cached HTML (FA-09).

## Technical justification

`useOffline` is retry only (`offline-support.md`, VERIFIED). A service worker is the platform's way to answer a request with no network. Not calling `skipWaiting` means an open Studio session is never replaced mid-edit; the server's `426 upgrade_required` plus the banner covers a stale shell talking to a newer server (API_CONTRACTS section 3).

## Performance data

Shell about 400 KB gzip, sim worker about 150 KB, rest slack, giving the 1.5 MB gzip precache ceiling (ESTIMATED, FRONTEND section 11). Figures: 80 files, 24.7 MB raw, 8.1 MB gzip (PERFORMANCE_BASELINE section 2), cached on use. Engines are cached by `loadEngine` (RS-12 first-load times apply once). UNKNOWN: install time of the precache on a slow connection; whether RSC payloads can be served from cache (FA-09).

## Cost implications

One file under 300 lines, `scripts/gen-sw-manifest.mjs` and `local/sw/register.ts`. Device storage: shell plus whatever figures and engines the person uses, capped by the 200 MB figure limit and `navigator.storage.estimate()`.

## Licensing

No dependency. Workbox (MIT, EXTERNAL) was considered and not adopted.

## Security implications

Scope `/`, served `no-cache` with its own CSP (`default-src 'self'; script-src 'self'`, Next PWA guide). It caches only same-origin GETs and never anything under `/api/v1/*`, so tokens and project data from a server are not stored. A bug here can serve a stale or wrong page to every visit until the worker is replaced, which is why updates wait and the worker can be removed (below).

## Reversibility

High. Shipping a worker that unregisters itself and clears `iynk-*` caches removes the feature from every browser on the next visit.

## Migration plan

New in the first release; no existing worker. Caches are named by build id, and old ones are deleted on `activate`. `navigator.storage.persist()` is requested once on first save (ADR-0106).

## Known limitations

- `experimental.useOffline` is not used and is itself experimental.
- Client-side navigation offline may need a hard navigation (FA-09).
- Browsers may evict caches for sites they consider unused; the eviction policy differs by browser (EXTERNAL, HYPOTHESIS that Safari is the strictest), which is why the person is nudged to keep a file copy.
- Offline cannot run an engine that was never downloaded; the UI says so.
