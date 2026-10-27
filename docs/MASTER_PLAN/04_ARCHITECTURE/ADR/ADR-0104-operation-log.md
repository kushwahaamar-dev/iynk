# ADR-0104: One operation vocabulary and one pure apply function for edits, rooms, undo, AI proposals and replay

Status: proposed, 2026-10-27. Author: project-data-model seat.
Upstream: audit D5, A7, A10, A12; TECHNICAL_RESEARCH D5; RS-09 (PASS); R-033, R-034, R-085 to R-089, R-157, R-158; DET-4, REF-4. Downstream: F-083, F-110, F-121, F-122. Spec: PROJECT_DATA_MODEL 7. Schema: `$defs/Op`, `OpEnvelope`, `Proposal`, `ReplayLog`.

## Problem

Four systems each invent their own way to change a lab (audit D5): dispatched actions with a keyboard baton (realtime), stored full-text `code/replace` proposals (AI), whole-state `localStorage` writes (progress) and a `{step, action}` log (flight). Two `dispatch` monkey-patches sit on top (`LabRoom.tsx:50,59`, `store-sync.ts:143,153`). A stale AI proposal can overwrite a user's edit. Rooms apply actions through each client's own reducer with no divergence check. Undo does not exist.

## Constraints

1. Local-only editing must work with no server (D-015); the same code path must serve a room.
2. Invalid edits are rejected, never half applied; no dangling wire, no duplicate id (RS-09 invariant).
3. Per-author undo; AI edits must be reviewable and reversible (F-110).
4. Replay from empty or from a checkpoint must give the same state hash (DET-4).
5. The relay is small and self-hostable; frames are capped at 64 KiB (`server/realtime/src/config.js:6`, VERIFIED).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Domain ops with a pure `apply`, server-ordered in rooms, local counter alone | RS-09's design, widened to nets | Chosen |
| B. CRDT (Yjs 13.6.33, Automerge, Loro) | Offline multi-writer merge | Rejected for the graph. RS-09 ran the same scenarios in Yjs: a concurrent part delete plus a wire add converged to a dangling wire, two offline adds of one id silently overwrote each other, a concurrent move was lost without notice, and undo after a remote overwrite had no effect (VERIFIED, RS-09). Held in reserve for source text only |
| C. Whole-state last-writer-wins sync | Simple | Rejected: loses edits, no undo, no review |
| D. Generic JSON Patch (RFC 6902) | One small vocabulary | Rejected: cannot express cascades (delete a part and its pins and wires) or invariants; validation by structure only |
| E. Event sourcing with a separate read model | Flexible | Rejected as over-built: one document and one `apply` is enough |

## Decision

1. The document changes only through `apply(state, op) -> { state', inverse[] } | { reject: code }`. It lives in one module used by the browser, the workers, the relay and the tests.
2. The vocabulary is 64 domain ops in the schema (the 55 of the first draft plus `actor.set`, `actor.remove`, `access.set`, `wire.set`, `view.set`, `group.set`, `group.remove`, `provenance.set`, `domain.patch`, added by the review fixes of 2026-10-27; PROJECT_DATA_MODEL 7.2 and 15.1): `meta.*`, `board.*`, `component.*`, `net.*`, `view.*`, `wire.*`, `junction.*`, `label.*`, `group.*`, `mech.*`, `source.*`, `sim.*`, `runtime.*`, `input.*`, `script.*`, `fault.*`, `instrument.*`, `param.*`, `test.*`, `asset.*`, `dep.*`, `guide.*`, `license.*`, `provenance.*`, `domain.*`, `actor.*`, `access.*`. Several ops with one `batch` id commit together or not at all; deferred invariants are checked at the end of a batch.
3. Order: in a room the server assigns `seq`; alone, a local counter does. Clients apply optimistically (`confirmed` plus pending queue), drop a rejected op, and rebuild. A resent `opId` returns its stored result (dedup).
4. Undo is per author: the inverse op list returned with the ack. Redo across authors is not provided.
5. A hash chain over envelopes detects divergence; checkpoints plus a bounded tail replace "the whole log".
6. AI and buddy proposals are batches of ops with a `base` revision, kept outside the document, dry-run before display, applied only on accept, with an overlap check against ops since `base`.
7. Text edits are `source.edit` range ops with a transform over later edits; single-writer by baton is the supported case. A text CRDT for source files only is the escape hatch if concurrent typing matters.
8. A simulation replay is a separate `ReplayLog`, not the edit history.

## Technical justification

RS-09 (PASS): no divergence in 40 randomised runs of about 10,900 generated ops each (about 436,000 in total) with 5 clients, dropped connections, offline editing, resends and the snapshot path; the checker detected an injected missing cascade and a skipped op; reconnect for a 1,000-op tail 2.8 ms and for a 10,000-op tail 22 ms on localhost; core throughput 55,000 to 57,700 ops/s and 7,000 resolved ops/s over 5 WebSocket clients with p99 ack latency 1.05 ms. The server rejected invalid edits (69,874 `missing_part`, 25,814 `dangling_wire`) without trace, which is the property a CRDT could not give. The prototype was about 300 lines.

## Performance data

All from the RS-09 report (VERIFIED there, Node on an M4 Pro, loopback, no browser):

| Case | Result |
|---|---|
| Tail of 10,000 ops | 22 ms; 1,425 KB raw; 268 KB gzip |
| Snapshot plus tail, 10,000 behind | 1.4 ms; 84 KB |
| State snapshot vs full op log | 14 KB vs 929 KB (15,492 ops) |
| One client | about 1 / RTT ops per second with one op in flight |
| Server core | 55,000 to 57,700 ops/s |

Not measured: real networks, mobile sleep, proxies, phones (all UNKNOWN).

## Cost implications

Self-hosted: one small process; log and checkpoints in the server store. No per-seat service. Engineering ESTIMATED 3 to 5 person-weeks (TECHNICAL_RESEARCH D5 estimate) plus 1 to 2 person-weeks to extend `apply` and its tests to nets, batches and the wider vocabulary (assumes the document and schema exist).

## Licensing

The spike used fast-check 4.10.2, yjs 13.6.33 and ws 8.22.0, all MIT (from the report). The shipped design needs only `ws` or the existing relay stack.

## Security implications

Every op passes the same validation whether it comes from a keyboard, a buddy, an import or an AI (R-033). Permission is checked per op (`access`). Ops that change `access` or `actors` are accepted from an owner or from `author.kind = system` acting for a server-validated invite, route or fork (PROJECT_DATA_MODEL 5.1); the last owner cannot be removed. A `referenced_by` rejection lists its referrers, so a client can build the fixing ops and send them in one batch. Op size is capped (64 KiB). Dedup prevents replay of one op as two. A hostile member with edit rights can still make valid edits; per-author attribution (`author`) and undo are the control. The chain makes silent server-side tampering visible to clients that compare chains.

## Reversibility

Medium. The vocabulary is versioned with the schema (`opSchema` equals `MAJOR.MINOR`). Replacing the transport or the ordering authority does not change ops. Moving source text to a text CRDT later changes `source.edit` only. Moving the whole graph to a CRDT would discard the server-side validation that is the reason for this choice.

## Migration plan

1. `apply` and the vocabulary ship with the document in CORE, used by local undo and autosave only.
2. Replace the two `dispatch` monkey-patches with a single middleware that submits ops.
3. COLLAB: relay gains ordering, validation, dedup, checkpoints and compressed snapshot frames (the state-frame cap is 512 KiB plus 1 KiB today, `config.js:8`).
4. AI: the partner returns proposals; the current `code/replace` full-text path is removed (F-110).
5. Flight replay keeps its own log until DRONE, then adopts `ReplayLog`.

## Known limitations

- RS-09's test document had wires between part pins and no nets. The net ops, batches, cascades and the larger vocabulary here are not covered by its result. They must be added to the property test (REF-4) before COLLAB relies on them. HYPOTHESIS that they converge.
- Text edits converge but do not keep intent when ranges overlap with concurrent edits (RS-09 states this). Offsets count UTF-16 code units, which can split a surrogate pair if a client counts differently.
- Per-author undo moves a part back to its old position even if someone else moved it since; an inverse that is invalid when it arrives is dropped (RS-09).
- One op in flight per client caps rate at about 10 per second at 100 ms RTT; drags must send one op on release.
- The spike's server state was in memory only; persistence, multi-room, rate limits and recovery after a restart were not built.
- Proposal staleness needs the log since `base`; if the retained tail is shorter the proposal goes `stale`.
