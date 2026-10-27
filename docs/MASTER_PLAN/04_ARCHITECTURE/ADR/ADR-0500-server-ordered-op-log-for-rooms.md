# ADR-0500: Rooms use the server-ordered operation log; no CRDT for the graph; a text CRDT is held in reserve

Status: proposed, 2026-10-27. Author: realtime-architecture seat.
Upstream: BRIEF 14; D-010, D-013, D-015; audit D5, A7; RS-09 (PASS); ADR-0104; R-085 to R-090, R-094; F-121, F-123. Spec: REALTIME_ARCHITECTURE 8.

## Problem

BRIEF 14 asks whether the existing globally ordered WebSocket operations suffice, or whether some document types need a CRDT or operational transform. The relay today orders any JSON action and validates nothing (`relay.js:383-388`, VERIFIED).

## Constraints

1. One rule set for local editing, rooms, undo, AI proposals and replay (ADR-0104).
2. Invalid edits are rejected, never half applied; no dangling wire, no duplicate id.
3. Self-hostable, small, no extra services (D-015). Friends-sized rooms.
4. "Do not introduce complex distributed editing systems without evidence" (BRIEF 14).

## Considered options

| Option | Verdict |
|---|---|
| A. Server-ordered op log with validation at apply time, per-author inverse undo | Chosen |
| B. Yjs or Automerge for the whole document | Rejected for the graph: RS-09's Yjs scenarios gave a dangling wire, a silent id overwrite, a lost concurrent move and a no-op undo (VERIFIED, reproduced by the independent check). A post-merge sweep can repair some, but the rule then lives in every replica |
| C. A text CRDT for source files only, graph on the log | Held in reserve with a trigger (below) |
| D. Whole-state last-writer-wins | Rejected: loses edits, no undo |
| E. Operational transform for everything | Rejected: a transform function per op pair across 55 kinds; the server order already removes the need |

## Decision

1. The server is the only ordering authority in a room. It validates each submission with the shared `apply`, appends it, and broadcasts it. Clients are optimistic (confirmed plus pending), one submission in flight, rebuild on reject.
2. Source text uses `source.edit` with the RS-09 range transform, default behind a baton, optional `open` mode.
3. Trigger for a text CRDT: in the two-typist trial RA-13 (10 minutes, `open` mode) either person reports lost or misplaced text more than twice. Then add a `source.ytext` op kind carrying Yjs updates for one file; the graph and every other op stay. Without the trigger, no CRDT code ships.
4. Offline multi-user merge (RS-20) is not offered (ADR-0508).

## Technical justification

RS-09: no divergence in 40 randomised runs of about 10,900 generated ops with 5 clients, drops, resends, undo and snapshot resume; about 6,000 accepted per run; 129,024 rejections in the 30 main runs, all invisible after rebuild; mutants (missing cascade, skipped op) detected. Core throughput 52,000 to 57,700 ops/s; five WebSocket clients 6,229 to 7,000 resolved ops/s with p99 ack 1.05 to 1.28 ms.

## Performance data

See RS-09 as quoted in ADR-0104. New and UNKNOWN: SQLite commit cost (RT-1), real networks (RA-09).

## Cost implications

Engineering ESTIMATED 1.5 to 2.5 weeks for `RoomCore` and the op path (S4), 1 to 2 weeks for the client (S5), on top of the shared `apply` from CORE. No services.

## Licensing

fast-check, yjs and ws, MIT, as used by the spike. Shipped code needs `ws` only.

## Security implications

Permission and quotas are checked per op on the server (ADR-0504). A member with edit rights can still make valid hostile edits; attribution, undo, checkpoints and kick are the controls.

## Reversibility

Medium. Ops are versioned with `opSchema`. The transport and the ordering authority can change without changing ops. Moving the whole graph to a CRDT would discard server-side validation and is not planned. Adding `source.ytext` is a minor schema bump.

## Migration plan

Slices S4 and S5 of REALTIME_ARCHITECTURE 18. The RS-09 property test is ported to the real `apply` first (RA-01).

## Known limitations

RS-09 did not cover nets, batches or cascades; RA-01 must before COLLAB relies on them. Text intent is only roughly kept when ranges overlap. Undo of a move after another move restores the old position. One submission in flight caps one client near 1 / RTT per second.
