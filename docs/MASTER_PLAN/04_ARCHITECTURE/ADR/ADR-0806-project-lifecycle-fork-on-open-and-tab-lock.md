# ADR-0806: Lifecycle: IndexedDB library plus files, one writer tab by Web Lock, fork-on-open for templates and lessons, archive and 30-day trash

Status: proposed, 2026-10-27; Web Locks coverage is a HYPOTHESIS. Author: Studio editor design seat.
Upstream: D-015; PDM 12; ADR-0106; ADR-0401. Downstream: F-092, F-093, F-089, F-143; STU-21 to STU-25. Spec: `03_PRODUCT/STUDIO_EDITOR.md`, STUDIO_EDITOR section 4.

## Problem

Projects live in the browser. Two tabs writing the same project would lose edits. Templates and lessons must never be edited in place.

## Constraints

1. No server in the default setup (D-015).
2. The person owns the bytes: a file export is always possible.
3. A shared fork must not leak a template solution.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| Edit templates in place | Open template, edit, save over | Rejected: destroys the template |
| Last writer wins across tabs | No lock | Rejected: silent loss |
| Library in IndexedDB plus files; one writer tab by Web Lock; fork-on-open; archive and 30-day trash | The second tab opens read-only with a banner; Take over makes the first read-only | **Chosen** |

## Decision

Opening a template or lesson creates a fork (`origin template {template}` or `fork {project, revision, stateHash}`) with a "Start" checkpoint; `x-iynk-solution` is not copied. One tab holds a Web Lock per project and writes; others are read-only. Delete moves to a 30-day trash; archive hides. Share is a copy or a room.

## Technical justification

- Two-slot autosave (PDM 12.1) gives crash safety.
- Fork-on-open keeps the template unchanged and gives Reset lesson as a checkpoint restore.

## Performance data

Autosave budget BUD-08: p95 under 50 ms at 500 parts and 1,000 wires (PROPOSAL). Serialisation is 3.84 ms to canonicalise and hash at that size, VERIFIED on Apple M4 Pro (ADR-0100). IndexedDB write time is not measured: UNKNOWN.

## Cost implications

Engineering only; no hosting cost.

## Licensing

No dependency. Web Locks API and IndexedDB are browser features (EXTERNAL).

## Security implications

Hidden checks are a UI convention, not secrecy: the values remain in the document and travel in files, share links and room snapshots. Real solutions live only in the template. The 30-day trash holds data on the device, so Empty trash must delete records, not flag them.

## Reversibility

Medium. The storage layout is behind PDM 12; the lock can be swapped for a BroadcastChannel election if Web Locks coverage is poor.

## Migration plan

Library and autosave first (ST-2), forks next, file import and export, then rooms (COLLAB phase).

## Known limitations

- Web Locks coverage across the browsers Amar uses is a HYPOTHESIS.
- Storage can be evicted unless `navigator.storage.persist()` is granted; the file reminder chip is the mitigation.
