# ADR-0106: IndexedDB for the working copy, `.iynk` and `.iynkz` files for the copy you own

Status: proposed, 2026-10-27. Author: project-data-model seat.
Upstream: D-015 (browser holds projects: IndexedDB plus project files on disk); audit A11 (only `iynk:v1` in `localStorage`, VERIFIED; edited code lost on reload, walk step 14); R-035 to R-040; F-087, F-092, F-168, F-200, F-201. Spec: PROJECT_DATA_MODEL 12.1.

## Problem

Nothing a person builds survives a reload today. D-015 wants projects to live in the browser and on disk, with an optional self-hosted server. The storage layout must survive browser eviction, a crash during a write, two tabs open on one project, and a person moving to another machine.

## Constraints

1. Works offline; no account (D-015).
2. A crash mid-write leaves a good copy.
3. Browsers can evict site data (Safari after a period of disuse under some settings; EXTERNAL, HYPOTHESIS for the exact policy, R-035). The design must not rely on IndexedDB alone.
4. File System Access API is available in Chromium only (EXTERNAL; not tested here). Firefox and Safari fall back to download and upload.
5. Assets are binary and must not bloat the JSON.
6. Autosave must not drop frames (BUD-08: under 50 ms p95 at 500 parts).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. IndexedDB working copy + `.iynk` JSON file + `.iynkz` container + optional server copy | Layered | Chosen |
| B. `localStorage` only | What exists | Rejected: about 5 MB limit (EXTERNAL), synchronous API on the main thread, one blob, no assets, no transactions |
| C. Origin Private File System (OPFS) as primary | Real files, fast | Rejected as primary: hidden from the user, not portable, Safari support differs (EXTERNAL); may be added for large assets |
| D. File System Access only | Real files | Rejected: Chromium only |
| E. SQLite WASM on OPFS | Queries | Rejected (ADR-0100) |
| F. Server only | Simple sync | Rejected by D-015 |

## Decision

1. IndexedDB database `iynk` with stores `projects`, `index`, `trash`, `backups` as in R-035, plus `assets` (sha256 to blob), `revisions`, `journal` (key `projectId`: uncommitted code-editor text edits, cleared on commit), `progress`, `proposals`, `keys` (AI and search provider keys only), `identity` (the non-extractable ECDSA P-256 device key pair, one per server origin; the access token is never stored), `server` (url, deviceId, actor, displayName, expiresAt, buddy cache; no secret), `events` and `errors` (opt-in local ring buffers) and the AI stores `ai_threads`, `ai_log`, `ai_usage`, `ai_memo`, `ai_debug` (AI_ARCHITECTURE 12.1; the same database, not a second one). The list is SYSTEM_ARCHITECTURE 8.1. The `index` row also holds `archived`, a library-only flag outside the document and the state hash (PROJECT_DATA_MODEL 12.1). Two-slot writes; the `index` row updates in the same transaction; each save compares `revision` and `hash` so a second tab cannot overwrite silently. Ask for persistent storage once and show the answer. Provider keys live only in `keys` and the device private key only in `identity`; neither is exported, and each has its own delete action.
2. `.iynk`: the R-037 envelope `{format: "iynk.file", version: 1, hash, project}` in pretty form. `.iynkz`: a zip with `project.iynk`, `assets/<sha256>`, `definitions/`, `history/`, `manifest.json`, written deterministically (sorted entries, fixed timestamp, no extra fields). Identity is the state hash, not the zip bytes.
3. Save in place with File System Access where it exists; download and upload elsewhere. A quiet chip says "not saved to a file" after 10 minutes of editing (R-037).
4. With the self-hosted server, the library syncs copies (COLLAB); the server is never required.
5. A "local data export and wipe" action exports everything the app holds as files (F-168).

## Technical justification

- IndexedDB handles structured values and blobs asynchronously and in transactions, which is what two-slot writes need.
- A plain file is the only copy the person owns outright, so the design makes it easy and visible, not hidden.
- Assets stored by hash dedupe automatically and keep the JSON small (the converted lesson is 32.9 KB with no binaries).
- Keeping `keys` apart from `projects` makes it structurally impossible for a key to ride into an export.

## Performance data

Serialisation cost is VERIFIED (3.4 ms canonicalise at 500 components, 16.5 ms at the limit; PROJECT_DATA_MODEL 9.6). IndexedDB write latency, open time from cold storage and quota behaviour were not measured (UNKNOWN). The CORE gate must measure them against BUD-08 and BUD-09 on a throttled CPU before the layout is called done. If a full-document write misses 50 ms, the fallback is writing only the changed top-level sections (the store keeps sections as separate keys), which does not change the file format.

## Cost implications

No hosting cost. Storage lives on the person's machine. Server copies use the self-hosted server's disk: a 500-part project is about 36 KB gzipped (VERIFIED), so 1,000 projects are about 36 MB before history.

## Licensing

IndexedDB and File System Access are web platform APIs. A zip library is needed for `.iynkz`; none is chosen (candidates: fflate, MIT, EXTERNAL; licence and size to be checked at selection, UNKNOWN until then). Hand-writing a store-only zip writer is possible if the licence or size is a problem.

## Security implications

Imported files and zips are untrusted: size checks before parse, entry count, per-entry and total size, compression ratio and path checks while streaming (PROJECT_DATA_MODEL 13). A file hash mismatch is a warning because the hash is not a signature. Keys are never in a project or export. IndexedDB is per origin; the audit's same-origin figure iframes can read it (X3, VERIFIED, low today), so figures stay first-party and sandboxed when user content can reach them.

## Reversibility

High. The file formats are documented; the IndexedDB layout is behind a store module with a migration (ADR-0105 applies to documents, a separate DB version applies to stores). Moving the working copy to OPFS later changes the store module only.

## Migration plan

1. Land the store with autosave of code and parameters for lesson pages first (the cheapest visible win in the audit, R-036).
2. Add projects, the library page and the trash.
3. Add `.iynk` save and open, then `.iynkz`.
4. One-time import of `iynk:v1` progress (PROJECT_DATA_MODEL 11.6); keep the old key for one release.
5. Server sync in COLLAB.

## Known limitations

- If the browser evicts IndexedDB and there is no file copy, the project is gone; the chip and the library mark exist to prevent this, they do not remove the risk.
- Firefox and Safari cannot save in place; each save is a download.
- The zip writer is deterministic only for one library version; do not hash containers.
- No cross-device sync without the optional server.
- The 128 MiB container cap is a chosen default with no measurement behind it.
