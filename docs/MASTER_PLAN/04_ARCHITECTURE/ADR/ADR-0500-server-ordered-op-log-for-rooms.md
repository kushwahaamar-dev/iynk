# ADR-0500: Rooms use the server-ordered operation log; no CRDT for the graph; a text CRDT is held in reserve

Status: proposed, 2026-10-27. Author: realtime-architecture seat.
Upstream: BRIEF 14; D-010, D-013, D-015; audit D5, A7; RS-09 (PASS for convergence, PASS-by-CPU for reconnect; independent check: Yes); RECONCILIATION RC-04, RC-06; ADR-0104; R-085 to R-090, R-094; F-121, F-123. Spec: REALTIME_ARCHITECTURE 8.

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
2. Source text uses `source.edit` with the RS-09 range transform. In M1 source code is baton-only: one writer at a time, which avoids concurrent text edits. `open` mode (several typists) is optional and off by default, because RS-09 says text edits converge but intent is only roughly kept when ranges overlap (`08_RESEARCH_SPIKES/RS-09-op-log-collab/REPORT.md`, VERIFIED).
3. Each op carries an `opId`. The server dedups resent ops (RS-09: 8,212 dedup hits in the 30 main runs) and returns the inverse in the ack to the author, who keeps the undo stack. Undo is per author; moves are last-writer-wins. Keep dedup: random testing does not kill the dedup mutant, the hand-built `src/dedup-unit.js` does (RS-09 report, VERIFIED).
4. Reconnect follows RC-06, one rule: the server sends a tail only if the gap is at most 1,000 ops and at most 200 KB gzipped, otherwise the latest checkpoint snapshot plus the tail since it. The tail is always gzipped. A raw 10,000-op tail is 1.4 MB, about 2.3 s on a 5 Mbit/s link (RS-09, arithmetic, not measured); 268 KB gzip is about 0.4 s and snapshot-plus-tail (84 KB) about 0.13 s. The checkpoint trigger is owned by ADR-0505 (RC-04): every 500 ops or 10 minutes with activity.
5. Trigger for a text CRDT: in the two-typist trial RA-13 (10 minutes, `open` mode) either person reports lost or misplaced text more than twice. Then add a `source.ytext` op kind carrying Yjs updates for one file; the graph and every other op stay. Without the trigger, no CRDT code ships.
6. Offline multi-user merge (RS-20, not run) is not offered (ADR-0508). F-123 (Yjs) stays out unless RS-20 shows a need.

## Technical justification

RS-09: no divergence in 40 randomised runs of about 10,900 generated ops with 5 clients, drops, resends, undo and snapshot resume; about 6,000 accepted per run; 129,024 rejections in the 30 main runs, all invisible after rebuild; mutants (missing cascade, skipped op) detected. Core throughput 52,000 to 57,700 ops/s; five WebSocket clients 6,229 to 7,000 resolved ops/s with p99 ack 1.05 to 1.28 ms.

## Performance data

See RS-09 as quoted in ADR-0104. Reconnect on loopback: 2.8 ms for a 1,000-op tail and 22 ms for a 10,000-op tail (independent check 3.4 ms and 22.1 ms). That is CPU only. Yjs held the same 15,492-op history in 233 KB against 929 KB for the op log as JSON (like-for-like, full history); the op log's 14 KB state snapshot has no garbage-collected Yjs peer (UNKNOWN). The prototype server is in memory only. New and UNKNOWN: SQLite commit cost (RT-1), reconnect on a real home network (RA-09, work for Amar).

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

RS-09 "10,000 ops" means generated steps (about 6,000 accepted per run). RS-09 did not cover nets, batches or cascades; RA-01 must before COLLAB relies on them. Text intent is only roughly kept when ranges overlap. Undo of a move after another move restores the old position. One submission in flight caps one client near 1 / RTT per second.

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RS-09 | Upstream line now states the verdict split (convergence PASS, reconnect PASS-by-CPU) and that the check reproduced it. |
| RS-09 | Decision 2 made explicit: baton-only source in M1, `open` mode optional and off, with the overlap-intent caveat. Line 30 was already baton by default, so the intent is unchanged. |
| RS-09 | New decisions 3 and 4: per-op dedup with the inverse in the ack, and the gzip or snapshot-plus-tail reconnect rule. Dedup is kept because only the hand-built unit test catches its removal. |
| RC-06 | Resume rule adopted: gap at most 1,000 ops and 200 KB gzipped, else snapshot plus tail. The "2,000" tail term is not used here. |
| RC-04 | Checkpoint trigger is owned by ADR-0505 (500 ops or 10 minutes). |
| RS-20 | Marked not run; F-123 stays out. Would change if RS-20 shows a need. |
| Performance, limitations | Added reconnect numbers, the Yjs size pair, the in-memory prototype caveat and the "generated steps" wording. |
| Skipped | ADR-0104, ADR-0508, ADR-0423, ADR-0505, ADR-0501 are not edited (single-file task). No wording here made Studio wait for interviews, a pilot or Fault Lab, so no D-014 reorder was needed. |

For Amar: measure reconnect on a real home network (not an agent task).
