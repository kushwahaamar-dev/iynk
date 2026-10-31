# Project files and storage

How a project is kept in the browser and how it leaves it as a file. Everything here runs on the device. Nothing is sent
anywhere. The code lives in `src/local` (storage and the project worker), `src/export` (the file formats) and `src/protocol`
(the worker wire).

## The two file formats

| Format | What it is | Written by | Read by |
| --- | --- | --- | --- |
| `.iynk` | One project as indented JSON in an envelope: `{ "format": "iynk.file", "version": 1, "hash", "project" }`. `hash` is the SHA-256 state hash of the project | `writeIynk` in `src/export/iynk.ts` | `readIynk` |
| `.iynkz` | A zip container with `project.iynk`, one `assets/<sha256>` entry per distinct asset and `manifest.json` (`{ "format": "iynk.container", "version": 1, "entries" }`). Entries are stored, not compressed, so two saves of the same project give the same bytes | `writeIynkz` in `src/export/iynkz.ts` | `readIynkz` |

A reader never trusts a file. It checks size, depth and duplicate keys before it parses, migrates an older schema, refuses a
newer one, validates the document and hashes it again. A file whose hash does not match opens with a warning, not an
error. Every refusal carries the limit it hit or the entry it names so the screen can say which.

| Limit | Value |
| --- | --- |
| A `.iynk` file or `project.iynk` | 5 MiB |
| A container | 128 MiB in total, 16 MiB per entry, 1,000 entries |
| Inflate ratio | 100 to 1, checked only on entries over 1 MiB |
| Zip features | no zip64, no encryption, only stored and deflate entries; paths are checked for `..`, absolute paths, duplicates and case collisions |
| SVG assets | refused until a sanitiser exists |

A save to a file warns first if the text holds something shaped like a secret: an `sk-` key, a Google key or a PEM private
key.

Open from file and Save to file go through the project worker (`file` requests). Where the browser has the File System
Access picker the page writes to the chosen file; elsewhere it downloads.

## How a project is stored

The database is IndexedDB `iynk`, version 1, with 19 stores. `src/local/stores.ts` is the list. Every store uses
out-of-line keys.

| Store | Key | Holds |
| --- | --- | --- |
| `projects` | project id, and `<id>~prev` | The whole document, its hash and the write time. Two slots: a save moves the current row to `~prev` before it writes, so a damaged write can fall back one save |
| `index` | project id | The list row: name, update time, hash, board, size, whether a file copy exists, archived |
| `trash` | project id | A deleted project for 30 days, then purged |
| `backups` | `<id>:<n>` | Numbered backups per project |
| `assets` | SHA-256 | Asset bytes, shared by every project that names them |
| `revisions` | `<id>:<revision>` | Compaction snapshots from the session's `onCompact` |
| `journal` | project id | Text edits since the last save, so a crash loses at most a burst |
| `progress` | progress key | Lesson and quiz progress |
| `keys` | provider slot | The AI and search keys |
| `proposals`, `ai_threads`, `ai_log`, `ai_usage`, `ai_memo`, `ai_debug` | various | The AI partner's data; "Delete AI data" clears these six |
| `events`, `errors` | counter | The local log |
| `server`, `identity` | server origin | Server settings and identity, kept for the rooms phases |

A load reads the current slot, checks its hash and, if it fails, returns the previous slot and says it did (`recovered`).
If both fail the project is reported lost and nothing is deleted.

The browser may keep nothing at all (private windows, blocked storage). The worker then falls back to a memory
repository and tells the page (`degraded`), which shows a warning; New still works for the session.

### Saving

The page holds the live document in a session. Each batch of ops goes to the project worker as a `commit`, and the worker
folds it into a shadow copy it can hash and write without the page. A save is asked for by:

| Reason | When |
| --- | --- |
| `debounce` | 500 ms after the last change |
| `maxwait` | 5 s after the first unsaved change, however busy the editing is |
| `hidden` | the tab is hidden |
| `pagehide` | the page is going away |
| `manual` | the person asked |

A transaction first requested in `pagehide` is not reliable in Chromium or WebKit (spike BS-02), so the source-text journal
is written from the main thread before the page goes, and `pagehide` is only a best-effort extra. When the worker cannot
fold a commit into its shadow copy it reports `hash_mismatch` with its own hash; nothing in the page acts on that event yet.

Other tabs hear every save over a `BroadcastChannel` (`id`, `revision`, `hash`) and know when their copy is stale.

## The worker API

The project worker is `src/local/project.worker.ts`; the page talks to it through `ProjectHost` (`project-host.ts`) and the
types in `project-protocol.ts`. Calls time out after 20 s. The envelope and port are in `src/protocol`; every message
carries the protocol version.

| Request | Answer |
| --- | --- |
| `load`, `open`, `close` | The stored document, revision and hash; whether the open was accepted; legacy progress is copied in once |
| `commit` | `folded` |
| `save` | `written` |
| `revision` | stores a compaction snapshot |
| `lib` | `list`, `create`, `rename`, `fork`, `trash`, `restore`, `emptyTrash`, `purgeExpired`, `trashList` |
| `file` | `export` (`iynk` or `iynkz`), `import`, `markCopy` |
| `data` | `exportAll`, `wipeStores`, `deleteAiData` |
| `storage` | `estimate`, `persist` |

Events the worker sends: `saved`, `save_failed` (`quota`, `blocked`, `conflict`, `validation`, `unavailable`),
`hash_mismatch`, `worker_restarted`, `recovered_from_previous`, `record_lost`, `degraded`.

An import that finds the project id already in the library stores it under a new id and says so (`forked`).

## Export all and wipe

The Diagnostics panel on the studio page offers both for now. Export all writes one zip with every live project as
`<id>.iynk`, the settings text and a manifest. The keys, server, identity and journal stores are never read. It warns if any
file holds something shaped like a secret. Wipe needs the phrase `wipe iynk` and runs in two halves: the worker clears every IndexedDB store, and the page
removes every `localStorage` key that starts with `iynk:`, every cache whose name starts with `iynk-` and the service
worker. Each half reports what it cleared and what failed, and keeps going after a failure.
