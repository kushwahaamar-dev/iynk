# RS-09: Server-ordered op log for collaborative editing

## Question
Does a server-ordered operation log handle collaborative editing of a project document with 5 editors, undo, reconnect and invalid-edit rejection?

## Why it matters
It decides D5 (collaboration model): op log on the relay with Postgres for log and snapshots, or Yjs. It also gives input to RS-20 (what happens to a wire when its part is deleted concurrently).

## Exit condition (from TECHNICAL_RESEARCH.md, row 7)
Pass: no divergence after 10,000 randomised ops, reconnect under 2 s. Note: "ops" here counts generated steps (about 10,900 per run); about 6,000 per run are accepted. Across all runs the accepted total is far above 10,000.

## Environment
- Apple M4 Pro, 14 cores, macOS (Darwin 27.0.0, arm64). Node v24.8.0. No browser used (all Node, in-process plus localhost WebSocket).
- fast-check 4.10.2 (MIT), yjs 13.6.33 (MIT), ws 8.22.0 (MIT). All from npm.
- Load average (1 min) while timing: 2.4 to 3.8. Never above 10. Each timing row below lists its load.
- Not measured: phones, Chromebooks, real networks. CPU throttling was not applied, since there is no browser here and the numbers are server and Node client costs.

## What the repo does today
`server/realtime/src/room.js` stamps a per-room `seq` on each action (`appendAction`), keeps a bounded log (entry and byte limits) and replays `actionsAfter(since)` on reconnect, or asks a peer for a snapshot (`state` frame with the seq). The relay never looks inside an action: `protocol.js` checks only the frame shape (type string up to 64 chars). So today there is a total order and replay, but no validation, no rejection, no dedup of resent actions, and the snapshot comes from another peer, not the server. This spike adds those three things and tests them.

## Method
Source is in `src/` (about 700 lines). Files: `doc.js` (document and ops), `server.js` (ordering server), `client.js` (optimistic client), `sim.js` (virtual network and fast-check property), `mutants.js`, `dedup-unit.js`, `ws-bench.js`, `yjs-wire.js`.

Document: parts (id, type, x, y), wires (id, from {part, pin}, to {part, pin}), three code files (text).
Ops: addPart, movePart, delPart, restorePart, addWire, delWire, editCode (one range: pos, del, ins).

Server: assigns a global seq, validates each op against current state, appends to a log, and broadcasts. Rules enforced: duplicate id rejected, wire to a missing part rejected, move or delete of a missing part or wire rejected, bad field types and sizes rejected, part quota. `delPart` cascades: it removes the part's wires in the same op, so no dangling wire can exist. `editCode` carries a base revision; the server transforms the range over every later text op on that file (position shifting, server order wins ties). A base older than the retained log is rejected as `stale_base`. The server also keeps a hash chain per seq, checkpoints every N ops, and one dedup record per client (last opId and its result).

Client: keeps `confirmed` (server order only) plus a pending queue replayed on top as the visible view. One op in flight at a time. A rejection drops the op and the view is rebuilt (the rebase). Undo is an inverse op: the server computes the inverse against the pre-state and returns it in the ack to the author; the client keeps a stack. Text inverses carry the original seq as base, so the server transforms them over all later edits. A restore after delete re-adds the part and only those wires whose ends still exist. Reconnect: client sends its last seq; server answers with the tail if still retained, else the latest checkpoint snapshot plus the tail after it. An unacknowledged op is resent with the same opId.

Property test: fast-check generates 11,000 steps (client 0..4, op kind, random numbers, time step, connection event). About 10,900 become generated ops (some are skipped when there is nothing to pick); only about 6,000 per run are accepted by the server (10,900 generated). Mix: add part 14, move 18, delete part 10, add wire 12, delete wire 6, code edit 25, undo 15 (weights). 1 in 30 part adds reuses an existing id. 1 in 8 wires aims at a part id the client may not have. Virtual network: per-connection FIFO queues with random delays 1 to 90 ms. Roughly 3 to 4 percent of steps drop a client's connection (queued messages in both directions are lost), clients keep editing offline, and reconnect later. Retention was unlimited, 400 and 150 (checkpoint every half retention), and in a second set 25 with long offline spells to force the snapshot path.

Checked after quiescence (all clients reconnected, queues drained):
1. Every replica's confirmed state is byte-identical (canonical JSON, compared as strings, SHA-256 shown) to the server's.
2. Each replica's view equals its confirmed state, and the hash chain matches the server's at the final seq.
3. No wire refers to a missing part, on the server or any replica.
4. No lost acknowledged op: each op a client saw acked is in the server log once, at the acked seq; total acked equals total applied; generated = applied + rejected + locally invalid. (Checked with unlimited retention.)
Also checked every ~1000 steps mid-run: each client's chain at its own seq equals the server's chain at that seq.

## Results

### Property test
| Run set | Runs | Ops generated per run | Result |
|---|---|---|---|
| Main: retention unlimited/400/150, normal reconnect rate | 30 | 10,891 to 10,974 | PASS, 17.7 s total, load 2.4 |
| Retention 25, normal reconnect rate | 4 | about 10,900 | PASS |
| Retention 25, long offline spells (snapshot path) | 6 | about 10,700 | PASS |

Totals for the 30 main runs: 181,498 ops applied, 129,024 rejected by the server, 17,442 invalid already in the local view, 49,704 undos issued, 37,170 disconnects, 76,490 messages lost with them, 22,155 resent ops, 8,212 dedup hits. Rejections by reason: missing_part 69,874; dangling_wire 25,814; missing_wire 14,782; stale_base 18,554 (only with the small retention values). In the long-offline set: 311 snapshot-plus-tail reconnects and 3,128 tail reconnects, 2,118 resends. The main set never used the snapshot path (offline spells were short), so the long-offline set is what covers it.

The rejection rate is high on purpose: the document is small, five clients edit it at once from stale views, and clients disconnect often. It is a stress mix, not a user model.

Raw logs: `logs/prop-main.log`, `logs/prop-retention25.log`, `logs/prop-longoffline-ret25.log`. The failing case at retention 25 earlier in the work was a harness error (checkpoint interval larger than retention left no usable checkpoint); the rule is that retention must exceed the checkpoint interval.

### Does the checker detect bugs (sensitivity)
| Injected bug | Detected? | Message |
|---|---|---|
| Control (no bug) | passes | |
| Server skips wire cascade on part delete | yes | dangling wires on server and all 5 clients |
| Client skips applying 1 remote op in 500 | yes | `could not apply seq 2644: duplicate_id` |
| Server without dedup | not by the random test | see below |

The dedup mutant was not caught at random: with tail replay the resent op is already acknowledged from the tail, so dedup only matters on the snapshot path or for replayed rejections. `src/dedup-unit.js` builds it by hand (reply lost, op pushed out of the window, resend): with dedup the server answers `apply(dup)`; without it the server answers `reject:duplicate_id`, so the author would see its own accepted op as rejected and lose its undo entry. Keep dedup.

### Reconnect time (real WebSocket on localhost, Node client)
Server log of 15,492 ops (final state: 83 parts, 1 wire, about 9 KB of code, 14,058 bytes of state JSON). Client holds the replica up to a given seq, reconnects, and time runs from socket creation to the last op applied and state equal to the server's (the "identical" flag was true in every row). 9 repetitions, median shown.
| Case | Delivery | Median ms | Min to max ms | Bytes on wire | Load |
|---|---|---|---|---|---|
| Tail of 1,000 ops | one batched message | 2.8 | 2.4 to 8.0 | 143 KB | 3.5 |
| Tail of 10,000 ops | one batched message | 21.9 | 19.8 to 24.1 | 1,425 KB | 3.5 |
| Tail of 1,000 ops | one frame per op | 8.7 | 8.2 to 11.1 | 142 KB | 3.5 |
| Tail of 10,000 ops | one frame per op | 40.2 | 39.1 to 45.3 | 1,415 KB | 3.5 |
| Snapshot + tail, fresh join (retention 2,000, checkpoint 1,000) | batched | 1.4 | 1.3 to 2.4 | 84 KB | 3.5 |
| Snapshot + tail, client 10,000 behind | batched | 1.4 | 1.3 to 1.6 | 84 KB | 3.5 |
| Already caught up | batched | 0.4 | 0.3 to 0.6 | 0 | 3.5 |

Localhost has no latency or bandwidth limit, so these are the server and client CPU cost only. Gzip of the batched tail: 27 KB for 1,000 ops, 268 KB for 10,000 ops. Arithmetic only, not measured: 1,425 KB uncompressed at 5 Mbit/s is about 2.3 s, 268 KB gzip is about 0.4 s, and an 84 KB snapshot-plus-tail is about 0.13 s. So the 2 s target is met by CPU on any realistic tail, and on a slow school network it depends on compression or on using the snapshot path for long tails. A 10,000-op tail should not be sent raw.

### Throughput (all on one Node process; server and 5 clients share one core, so this understates a separate server)
| Test | Result | Load |
|---|---|---|
| Server core, no network: validate, apply, seq, SHA-1 chain, log; 200,000 ops, mix of moves and text edits with stale bases | 55,000 to 57,700 ops/s (two runs) | 3.3 to 3.8 |
| 5 WebSocket clients, one op in flight each, 10 s, 69,873 resolved ops (57,236 applied, 12,637 rejected) | about 7,000 resolved ops/s, 5,700 applied/s; ack latency p50 0.6 ms, p95 0.73 ms, p99 1.05 ms. All 5 replicas identical after. | 3.1 |

A human editor makes a few ops per second, so a room is far from either limit. The one-op-in-flight rule caps one client at about 1 / RTT ops per second (about 10 per second at 100 ms RTT). Dragging a part would need to coalesce move ops (send the latest position only), which this prototype does not do.

### Yjs comparison (`logs/yjs.log`)
Same document in Yjs 13.6.33: Y.Map for parts and wires, Y.Text per file.
| Scenario | Result |
|---|---|
| Client A deletes part p2; client B, offline, adds a wire to p2; they sync | Replicas converge but the wire is dangling (wire w1 present, p2 gone). Yjs gives no rule against it. A sweep run on both replicas after merge removes it and they stay converged. |
| Two clients add the same part id offline | No rejection. One add silently overwrites the other (the one with x=99 survived, the other is lost). |
| One deletes a part, another moves it concurrently | Part is gone; the move is lost without notice. |
| Concurrent code inserts | Both preserved ("AAhelloBB"). This is where Yjs is better than my range transform. |
| Undo (Y.UndoManager) of own move after a remote overwrite | x stayed at the remote value (8); the undo had no visible effect. |
| Same 15,492-op workload replayed into Yjs | 233 KB full update (holds the whole history), 12.6 ms to load. Like-for-like: 233 KB (Yjs, full history) versus 929 KB (op log as JSON, full history). The 14 KB op-log state snapshot would be compared with a garbage-collected Yjs state, which was not measured (UNKNOWN). |

## Verdict: PASS for convergence; PASS-by-CPU for reconnect (under 2 s on real links only with gzip or snapshot-plus-tail)
- No divergence in 40 randomised runs. Each run generated about 10,900 ops (about 436,000 generated in total), of which about 6,000 per run were accepted by the server (range 5,500 to 6,700 in the independent check); the rest were rejected or locally invalid. Runs included connection drops, offline editing, resends and the snapshot path.
- Reconnect is far under 2 s for a 1,000-op tail (2.8 ms) and a 10,000-op tail (22 ms) on localhost, which measures CPU and serialisation only. On a 5 Mbit/s link a raw 10,000-op tail (1.4 MB) takes about 2.3 s (arithmetic, not measured), over the 2 s budget. The budget holds only with gzip (268 KB, about 0.4 s) or snapshot-plus-tail (84 KB, about 0.13 s). Real networks are not tested.
- The checker detects a missing cascade and a skipped op.

## Caveats
- Both the sim and the ws-bench use one process and a virtual or loopback network. Real latency, TCP resets, mobile sleep and proxies are not covered. Device question (phones, Chromebooks) stays open; Node numbers say nothing about them.
- Text edits converge, but intent is only roughly kept. A delete range that spans another editor's concurrent insert also deletes that inserted text. Pending, unsent edits are shifted only against remote ops, not against the user's own earlier unacked edits, so a user typing fast while others type can see a character land a few places off. Convergence was tested, intent preservation was not. If code collaboration matters, use a text CRDT for code files only (Yjs Y.Text did this correctly) and keep the op log for the circuit graph. HYPOTHESIS.
- Undo is per-author inverse, last-writer-wins for moves. Undoing a move after someone else moved the same part moves it back to the old spot. If an inverse is rejected (for example the part was deleted by someone else) it is dropped and the stack entry is lost. Redo is not implemented.
- The invariant "no dangling wire" holds because delPart cascades and addWire is validated against current state, not because of luck. New ops that touch several objects need the same care.
- Retention must exceed the checkpoint interval, otherwise a reconnect has nothing to resume from (found as a harness error). Small retention also rejects text edits with a stale base (18,554 rejections in the 30-run set at retention 150 and 400).
- Server state is in memory. Postgres persistence, auth, multi-room, rate limits and room recovery after a server restart were not built. The log is never compacted in the prototype beyond the retention cut.
- Rejection rate in the test is high by design; it says nothing about real user conflict rates.
- No comparison with an existing OT or CRDT library for text beyond the Yjs scenarios above.

## What this means for the architecture
The relay already has the total order and the replay window; the missing pieces are server-side validation (a pure `applyOp` shared by server and client), per-op dedup, an ack that carries the inverse for undo, and a checkpoint to serve long gaps. These were about 300 lines in this prototype and passed the test. The op log keeps invariants (no dangling wires, no duplicate ids) enforceable in one place, which Yjs cannot do; Yjs left a dangling wire and silently lost a duplicate id and a move. HYPOTHESIS: use the server-ordered op log (D5 as written) for the circuit and project graph, keep Yjs out of v1, and revisit only a text CRDT for shared code files if editing code concurrently turns out to matter. For RS-20, the finding is that a concurrent delete-part and add-wire is resolved cleanly only when the server validates at apply time; a CRDT needs a post-merge sweep that every replica runs.

## How to reproduce
```
mkdir -p /tmp/rs09 && cp -r src/* /tmp/rs09/ && cd /tmp/rs09 && npm install
node sim.js 30 11000            # main property run (about 18 s)
EV_UP=5 node sim.js 6 11000 25  # snapshot path, long offline spells
node mutants.js                 # checker sensitivity
node dedup-unit.js              # dedup on snapshot path
node ws-bench.js                # reconnect and throughput over localhost ws (port 47091)
node yjs-wire.js                # Yjs scenarios and size
```
Copy `src/package.json` as the package file so that `"type": "module"` and the dependency versions (fast-check 4.10.2, yjs 13.6.33, ws 8.22.0) apply.

## Independent check (2026-10-27)

What I ran: the report's reproduce commands from a fresh copy of `src/` in `/tmp/rs09chk`, with the dependencies already installed in `/Users/amar/iynk-master-plan-scratch/spikes/RS-09/` (fast-check, yjs, ws). Same Apple M4 Pro, Node v24.8.0. Commands: `node sim.js 30 11000`, `EV_UP=5 node sim.js 6 11000 25`, `node ws-bench.js`, `node yjs-wire.js`, plus `node mutants.js` and `node dedup-unit.js`. fast-check picks a new random seed each run, so counts differ by run; I compared ranges and pass/fail, not exact counts.

Tolerance: pass/fail results and flags (identical, detected) must match exactly. Counts per run within about 10 percent of the report's averages. Timings and throughput within 25 percent, because load was 3.7 to 6.8 here (the report ran at 2.4 to 3.8) and another lane was running.

| Measurement | Report | My run | Load | Match |
|---|---|---|---|---|
| Main property run, 30 x 11,000 steps | PASS, 17.7 s | PASS, 18.6 s; generated 10,914 to 10,959 per run; applied about 5,500 to 6,700 per run (report average 6,050); rejected about 3,600 to 4,800 (report average 4,300); welcomeSnap 0 in every run | 3.7 to 5.1 | yes |
| Snapshot path, retention 25, EV_UP=5, 6 runs | PASS | PASS, 4.5 s; welcomeSnap 39 to 55 per run (report: 311 over 6 runs) | 5.1 | yes |
| Reconnect, tail 1,000 batched | 2.8 ms | 3.4 ms | 6.1 | within 25 percent |
| Reconnect, tail 10,000 batched | 21.9 ms, 1,425 KB | 22.1 ms, 1,425 KB | 6.1 | yes |
| Reconnect, tail 1,000 / 10,000 per frame | 8.7 / 40.2 ms | 9.9 / 44.3 ms | 6.1 | within 25 percent (about 10 percent slower) |
| Snapshot + tail, fresh join / 10,000 behind | 1.4 / 1.4 ms, 84 KB | 1.5 / 1.6 ms, 83.9 KB | 6.1 | yes |
| Gzip of batched tail | 27 KB / 268 KB | 27,246 / 268,317 bytes | n/a | yes |
| Server core, 200,000 ops | 55,000 to 57,700 ops/s | 52,166 ops/s | 6.4 | within 10 percent |
| 5 ws clients, 10 s | about 7,000 resolved/s; p50 0.6, p95 0.73, p99 1.05 ms | 6,229 resolved/s; p50 0.66, p95 0.9, p99 1.28 ms; replicas identical | 6.8 | within 12 percent, latencies slightly worse, consistent with higher load |
| Yjs scenarios | dangling wire, silent id overwrite, lost move, undo no effect, 233 KB / 12.6 ms load | same outcomes; 233,351 bytes, load 14.1 ms | n/a | yes |
| Mutants | cascade skip and skipped op detected; no-dedup not caught at random | same; also the snapshot-heavy random run did not catch no-dedup | n/a | yes |
| dedup-unit | apply(dup) with dedup, reject:duplicate_id without | same | n/a | yes |

I did not re-run the "unlimited retention" acked-op accounting separately; it ran inside the 30-run set (a third of runs use unlimited retention) and passed.

Judgement:
- Numbers reproduce within the stated tolerance. No divergence in 36 new runs (about 392,000 generated ops).
- Verdict PASS follows from the exit condition as written (no divergence after 10,000 randomised ops, reconnect under 2 s). One generosity to note: "10,000 ops" is counted as generated steps. Per run only about 5,500 to 6,700 ops are accepted by the server (the rest are rejected or locally invalid). The criterion is still met by the accepted count over a whole run only in aggregate, not per run. Divergence checking covers rejected ops too (they must leave no trace), so I judge the test meaningful, but the report should say "about 6,000 accepted per run" next to "10,900 generated". Across the 36 runs the accepted total is far above 10,000.
- Reconnect under 2 s is measured on loopback with a Node client, so it measures CPU and serialisation only. The report says so and does the bandwidth arithmetic separately, which is honest. The reconnect half of the verdict is therefore "passes by CPU, open on real networks". On a 5 Mbit/s link a raw 10,000-op tail (1.4 MB) is over the 2 s budget (about 2.3 s by the report's own arithmetic), so the PASS holds only with gzip or the snapshot path. I would write the verdict as PASS for convergence, PASS-by-CPU for reconnect, with that condition.
- Method: the property test measures the stated question (convergence under drops, resends, undo, invalid edits) directly, with an independent oracle (server state, hash chain, dangling-wire check, ack accounting). It is not a proxy. Weak spots: the network is a fixed list of eight delays, not a real transport; the dedup mutant is not killed by random testing even in snapshot-heavy mode, so dedup correctness rests on one hand-built unit test; stale_base rejections at small retention mean typed code edits are lost, which the test counts as normal rejections.
- Fairness of the Yjs comparison: the scenarios are the same document and the same intents, and the outcomes are real. Two points are less fair. (1) The size row compares a 233 KB Yjs full update (it holds the whole 15,492-op history) with a 14 KB op-log state snapshot; the matching figures are 233 KB versus 929 KB for the full op log, or 14 KB versus a garbage-collected Yjs state, which was not measured. (2) Yjs was run with no application rules, while the op log has server validation; "Yjs cannot enforce invariants" is true of the bare library, and the report itself shows a post-merge sweep fixes the dangling wire, so the real difference is where the rule lives, not whether it can be enforced. The undo scenario in Yjs is a single case and its result is ambiguous (the code comment says only tracked origins are undone).

Correction to the report: none to the PASS for convergence. Amend the reconnect line to "PASS by CPU on loopback; under 2 s on real links only with gzip or snapshot-plus-tail", and the size comparison to the like-for-like pair above. Device and real-network questions remain open, as the report states.

## Review fixes (2026-10-27)

Issue 1 [medium]: verdict stronger than the check supports. Applied after checking the numbers against the report's own tables and the independent check above (all three points were supported by evidence, so none was rejected).
- Verdict line changed to "PASS for convergence; PASS-by-CPU for reconnect (under 2 s on real links only with gzip or snapshot-plus-tail)". The reconnect bullet now states that a raw 10,000-op tail (1.4 MB) is about 2.3 s at 5 Mbit/s (arithmetic, not measured), and that gzip (268 KB, about 0.4 s) or snapshot-plus-tail (84 KB, about 0.13 s) is what keeps it under budget.
- Op counts: the verdict, the Method paragraph and the Exit condition now say "about 6,000 accepted per run (10,900 generated)", with the independent check's range of 5,500 to 6,700.
- Yjs size row replaced with the like-for-like pair: 233 KB (Yjs, full history) versus 929 KB (op log as JSON, full history). The 14 KB snapshot versus a garbage-collected Yjs state is marked not measured (UNKNOWN).
- Not changed: measured numbers, the Yjs scenario outcomes, and the earlier independent-check section (kept as the reviewer's record).
