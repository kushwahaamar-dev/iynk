# ADR-0012: Offline application shell with an explicit update flow

Status: Decided, 2026-10-27: a hand-written service worker. Detail ADR: ADR-0406 (FRONTEND 10), which wins where the two differ. Author: system architecture seat.
Upstream: D-015, D-011; R-040, BUD-05, BUD-15; F-094; Next PWA guide (DOCUMENTED, names Serwist for service-worker caching).
Downstream: `SYSTEM_ARCHITECTURE.md` 12.3; AR-01, AR-19.

## Problem

Local-first means the app must open and work with the network off after the first load. Next.js does not provide this by itself. A service worker brings a version-skew problem: a tab on an old build, a cache on a new one, and project files of a newer schema.

## Constraints

1. Works with no server and no network after first load (R-040).
2. Never serve a half-updated mixture of asset versions.
3. Never reload a tab that has a run or a room open.
4. Heavy engines are cached only when used, with their size shown first (R-110).
5. A file of a newer `schemaVersion` is refused (ADR-0105).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Small hand-written service worker plus a build-time precache manifest | Few moving parts | Chosen as the default |
| B. Serwist | Maintained library with Next examples (DOCUMENTED) | Acceptable alternative; the behaviour below is the contract |
| C. Next's experimental `useOffline` | Connectivity-aware UI | Not sufficient alone: it does not cache assets (DOCUMENTED description) |
| D. No service worker; rely on HTTP cache | Nothing to maintain | Rejected: cannot guarantee offline |

## Decision

A build script emits `precache.json` (hashed asset URLs and a build id). The worker precaches the shell and base bundle on install, serves hashed assets cache-first, serves pages network-first with a short timeout then the cached shell, and caches engine files on first request. A new worker waits; the page shows "update available"; the person chooses when to reload; a tab with an active run or room defers the prompt. IndexedDB `onversionchange` closes the connection in the old tab and shows the same prompt. The worker is served with `no-cache` and its own CSP (Next PWA guide, DOCUMENTED).

## Technical justification

Cache-first for content-hashed files is safe by construction; network-first for HTML keeps a connected person current. An explicit prompt is the only update behaviour that cannot destroy an open run.

## Performance data

First-load JavaScript today: 727 KB transferred, 2.29 MB raw (MEASURED, PERFORMANCE_BASELINE); budget 400 KB gzip (BUD-05, PROPOSAL). Engine sizes: Rapier about 0.88 MB brotli, ngspice 5.7 MB gzip, Yosys 12.5 MB wire (spikes). Total cache size for a fully warmed install: not measured.

## Cost implications

None.

## Licensing

Serwist, if chosen, MIT (EXTERNAL, unchecked here).

## Security implications

A service worker is a persistent script on the origin: it must come from the same origin with correct headers, never from user content, and must never cache authenticated API responses. API calls (`/v1/*`) bypass the cache.

## Reversibility

High. Unregistering the worker returns the app to normal HTTP behaviour.

## Migration plan

CORE with the local store (X4). Test with the network off (AR-01) and across a deploy (AR-19).

## Known limitations

Safari and mobile browsers may evict Cache Storage; the app then falls back to the network and says so. iOS behaviour is UNKNOWN (no device). Cache size is not budgeted yet.
