# ADR-0002: Local-first, with a capability probe instead of a hosted status route

Status: proposed, 2026-10-27. Author: system architecture seat.
Upstream: D-015, D-013; R-012, R-040, K-LOCAL, K-SELF; audit A11 (nothing survives a reload), `src/lib/features.ts:17`; ADR-0106.
Downstream: `SYSTEM_ARCHITECTURE.md` 6.1, 6.9, 9; AR-01, AR-16, AR-17.

## Problem

Today the app asks a server route (`GET /api/status`) which of nine features exist and treats an unreachable answer as "error". Nothing a person builds is saved (walk step 14). D-015 requires the opposite: the browser holds projects, every server feature is optional, nothing depends on a hosted service.

## Constraints

1. The default experience works with no network after the first load (R-040, R-012).
2. Browser storage can be cleared or evicted; a file copy must always be possible (ADR-0106, O-3).
3. A server may or may not exist, and may have only some features on.
4. No feature may call a service owned by Amar (D-015).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Browser is the system of record; the server is a relay and a store of copies; a probe discovers it | Local-first | Chosen |
| B. Server is the system of record, browser caches | Conventional | Rejected by D-015; needs accounts and a database, and fails the no-server mode |
| C. CRDT document synced peer to peer, no server | Pure local-first | Rejected: rooms need an ordering authority for validation and permissions (R-089); RS-09 passed with a server-ordered log |

## Decision

1. The working copy of every project is in IndexedDB (stores listed in `SYSTEM_ARCHITECTURE.md` 8.1); the copy the person owns is a `.iynk` or `.iynkz` file.
2. The server never holds the only copy: a room's base snapshot and op log are copies; each member's local store keeps a copy under the same project id marked shared (R-085).
3. Server capability is discovered by `GET {server}/v1/server` plus a connection state (`none`, `unreachable`, `needs-enrol`, `ready`). The hosted `/api/status` and `src/lib/features.ts` are removed.
4. A feature that needs a missing capability shows a labelled state with the one-line fix (R-012).
5. `navigator.storage.persist()` is requested, its result is shown, and the app reminds the person to keep a file copy when `hasFileCopy` is false.

## Technical justification

A tab that can open, edit, run and save with the network off is also the simplest thing to test: AR-01 is one end-to-end test with the network disabled. The probe is one small unauthenticated read that reveals nothing about rooms or devices.

## Performance data

Open a saved project under 1 s at 1x and 3 s at 4x; autosave commit under 50 ms p95 (BUD-08, BUD-09). Both are PROPOSAL budgets with no measurement; AR-24 measures them.

## Cost implications

None. Removes the hosted database and function costs the old design assumed.

## Licensing

None added.

## Security implications

Projects, keys and logs never leave the browser unless the person sends them (a room, a share, a provider call). Keys sit in the origin's IndexedDB, readable by any script on the origin; the CSP in `SYSTEM_ARCHITECTURE.md` 7.4 is the control. Eviction is a data-loss risk, not a confidentiality one; the file copy answers it.

## Reversibility

Medium. Moving the system of record to a server later would need accounts and a database, which D-013 and D-016 removed; the `ServerStore` port and the op log would make it possible but it is a different product.

## Migration plan

B0: probe and states. CORE: store and files. COLLAB: server. `localStorage` `iynk:v1` migrates to the `progress` store on first run of the new build (R-035) and is then removed.

## Known limitations

Per-browser eviction policy is EXTERNAL and HYPOTHESIS. A person who clears site data and has no file copy loses the project; the architecture can warn but cannot prevent it. Cross-device continuity is by file or by a share; there is no sync service.
