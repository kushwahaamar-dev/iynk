# ADR-0423: Server-ordered rooms with a durable op log, checkpoints and server-enforced authority

Status: proposed, 2026-10-27. Author: frontend and backend architecture seat.
Upstream: RS-09 (PASS), ADR-0104, R-075, R-089, R-090, R1 to R12, B5-01 to B5-11. Downstream: F-116 to F-122. Spec: BACKEND_ARCHITECTURE section 8; the wire is REALTIME_ARCHITECTURE 7. Related: ADR-0500 and ADR-0505 (the realtime seat's records of the same design; they own the frame and retention detail).

## Problem

The relay orders opaque actions and keeps them in memory; it cannot validate, dedup, rebase or recover. Host takeover and room creation by join are reproduced defects.

## Constraints

1. Same `apply` in browser and server (ADR-0104).
2. Ack only after a durable commit.
3. Retention must exceed the checkpoint interval (RS-09).
4. Frame caps are REALTIME 7.1; a compressed snapshot frame is needed (PROJECT_DATA_MODEL 7.1).
5. Net ops and batches are not covered by RS-09.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Keep the opaque relay and add checks |  | Rejected: cannot validate |
| B. Server-ordered op log | RS-09 design | **Chosen** |
| C. Yjs |  | Rejected for the graph; reserve for text only if needed (RS-20 not run) |

## Decision

1. The server loads a room from the latest checkpoint plus the tail, applies validated ops with the shared `apply`, commits them in a group commit per event-loop turn (256 ops or 4 MiB per transaction), then acks.
2. Snapshot and retention numbers are those of ADR-0505 only (checkpoint every 500 ops or 10 minutes with activity; keep 8 plus named; envelope payloads for the latest 20,000 ops, then NULL; resume sends a tail only within 1,000 ops and 200 KB gzipped, else snapshot plus tail (REALTIME 11.4)). This ADR states none of its own.
3. Members are authenticated devices (REALTIME 4.4), not client-chosen peer ids. Host is a database fact (`rooms.host_actor`). The baton is one holder per room and gates all `source.*` ops. Chat `kind` is set by the server.
4. The server sends `check{seq,chain}` every 100 ops or 30 s of activity (REALTIME 8.2); a mismatch is answered with a snapshot.
5. The dedup record is the persisted `submissions` table (last 8 per member), written in the commit transaction.
6. The property test is extended with net ops and batches before rooms are on by default.

## Consequences

- Server CPU per op with the store attached is UNKNOWN until measured (BA-05).
- A room is a thing with an owner and an invite, not a code anyone can type.

## Technical justification

RS-09 ran this design (server validates with the shared `apply`, orders, dedups, keeps a tail and a checkpoint) against a random client load and found no divergence in 36 runs (30 main plus 6 snapshot-path runs; the independent check reproduced 36 new runs), with about 10,900 generated and about 6,000 accepted ops per run. It also showed dedup is invisible to random testing and needs a hand-built unit test, and that a retention shorter than the checkpoint interval breaks resume. CRDT merge is not needed because the server is always reachable for a room; offline edits are rebased by replay (REALTIME 12).

## Performance data

VERIFIED in RS-09 on loopback: core 52,000 to 57,700 ops per second; ack p50 0.6 ms, p99 1.05 ms with 5 clients; a 1,000-op tail takes 2.8 ms and is 143 KB raw; a 10,000-op tail takes 22 ms, 1,425 KB raw and 268 KB gzipped; snapshot plus tail is 84 KB. A state hash costs 3.8 ms for 500 parts and 18.5 ms at the largest allowed document on an M4 Pro (ESTIMATED 4x slower on a small server). UNKNOWN: commit latency with the store on Linux (exit: p99 under 10 ms at 400 ops per second over 20 rooms, RT-1 and BA-05) and real-network reconnect (BA-07).

## Cost implications

ESTIMATED from REALTIME 18, assuming the document model and `apply` exist and RS-09's roughly 700-line prototype is reused: `RoomCore` and the op path 1.5 to 2.5 weeks, the client 1 to 2 weeks, the store 4 to 6 days. ADR-0104 puts the op log itself at 3 to 5 person-weeks. Running cost is the machine already used.

## Licensing

No new runtime dependency; the server keeps `ws` as its only production dependency (MIT, EXTERNAL, not re-checked). The property test uses `fast-check` as a dev dependency (its licence was not re-checked here).

## Security implications

Closes R1 to R9: private room ids with membership or invite, one answer for missing and forbidden rooms, no room creation by join, server-chosen identity, roles enforced on every frame, server-set chat kind, no peer-supplied snapshots. Residual: a member with edit rights can still send valid but unwanted ops (the host can mute or kick); the hostile-client suite (R-097, BA-08) is the gate.

## Reversibility

Medium. The room logic sits behind `RoomCore` and the store behind the `ServerStore` port. Reverse if hash mismatches between peers appear in practice (class B hashes diverge): stream frames from the host as the simulation architecture says (ADR-0312).

## Migration plan

REALTIME 18 slices S1 to S8, in this file's slices BE-1 and BE-2: authority on the v1 relay first, then identity, store, `RoomCore`, client, UI, run channel, hardening. The 39 relay tests are ported as the first suite and `snapshot.test.js` (peer-supplied snapshots) is deleted with the feature.

## Known limitations

Net ops, batches, `component.swap` and overlapping concurrent `source.edit` are not covered by RS-09; concurrent text edits converge but can lose intent (PROJECT_DATA_MODEL 7.4). Single process, single writer. Reconnect under 2 s is measured on loopback only. With `IYNK_STORE_SYNC=normal` an acknowledged op can be lost on power failure and the epoch break of REALTIME 11.5 applies.

## Reconcile, second pass (2026-10-27)

| Id | Change |
|---|---|
| RC-04 | Decision 2 no longer lists a resume tail window of 2,000. ADR-0505 owns the checkpoint and retention numbers only. |
| RC-06 | Decision 2 now states the reconnect rule: a tail only within 1,000 ops and 200 KB gzipped, else snapshot plus tail (REALTIME 11.4; ADR-0500 line 32). |
| RC-02 | Reversibility: "the `Store` port" is now "the `ServerStore` port". |
