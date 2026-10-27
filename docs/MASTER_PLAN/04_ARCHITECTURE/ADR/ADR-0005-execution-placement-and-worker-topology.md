# ADR-0005: Execution placement and worker topology

Status: proposed, 2026-10-27. Author: system architecture seat.
Upstream: BRIEF 19.3; D-011, D-015; `SIMULATION_ARCHITECTURE.md` 17 (ADR-0300, ADR-0311); RS-01, RS-03, RS-06, RS-08, RS-12, RS-13; PERFORMANCE_BASELINE P1; BUD-01 to BUD-15.
Downstream: `SYSTEM_ARCHITECTURE.md` 6.4 to 6.9, 7; AR-09, AR-15, AR-24.

## Problem

Which workload runs on the UI thread, in a Worker, in WebAssembly, or on the server, and why. SIMULATION_ARCHITECTURE answers it for simulation. Persistence, validation, hashing, zipping, AI and rooms need the same answer, and the document must have exactly one owner.

## Constraints

1. Anything that can exceed 16 ms runs off the main thread (K-PERF).
2. The editor needs synchronous reads of the document at frame rate.
3. Autosave commit under 50 ms p95 with no dropped frame (BUD-08).
4. No `SharedArrayBuffer`, so no cross-origin isolation headers (keeps self-hosting simple).
5. Never run unsafe arbitrary computation in a shared runtime (BRIEF 19.3).
6. Phone and Chromebook performance is UNKNOWN for every engine.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Main thread owns the live document; `ProjectWorker` does validation, hashing, IndexedDB, zip; `SimWorker` per run (check jobs are a message to it); `AiWorker` for the provider client and key access; optional `AnalysisWorker`, `HdlWorker` | Chosen split | Chosen |
| B. Document lives in a worker; main thread holds a mirror | One authority in the worker | Rejected: every frame read becomes a message or a mirror, which is a second copy to keep correct |
| C. Everything on the main thread | Simplest | Rejected: Ajv, hashing a 1.6 MB document and zip builds block frames; the interpreter at its statement cap costs about 27 ms per step (ESTIMATED, SIMULATION_ARCHITECTURE 17.1) |
| D. Simulation on the server | Cheap clients | Rejected: D-015, and rooms would stream frames; peers simulate locally from ordered operations instead (SIMULATION_ARCHITECTURE 17.4) |
| E. SharedArrayBuffer between workers | Faster frames | Rejected: needs COOP and COEP headers, which break third-party embeds and complicate Caddy; typed arrays by transfer are enough (no measurement says otherwise) |

## Decision

| Thread | Owns |
|---|---|
| Main | The live `ProjectSession` (immutable state, `apply`), the editor engine, hit tests, remote op application |
| `ProjectWorker` (one per tab, lives as long as the tab: it owns the shadow state, so it is not idle-terminated) | Folded copy of the document (a cache with a checksum), V1 to V5 validation (Ajv standalone), canonical JSON and state hash, IndexedDB, File System Access writes, `.iynkz` zip and unzip, converters, hostile-file parsing |
| `SimWorker` (one per open run) | Orchestrator and all real-time engines, check jobs, probe tap, snapshots, replay (protocol `v: 1`) |
| `AiWorker` (one per tab, on first AI call) | The provider client, streaming, and the only read access to the `keys` store, so UI code never holds a key (BACKEND ADR-0425) |
| `AnalysisWorker`, `HdlWorker` | ngspice and Yosys on request, on a snapshot of the input |
| Server | Op ordering and commit, shares, pairing, optional proxies, optional compile job |

The main-thread session is the single source of truth. If the `ProjectWorker`'s hash differs from the session's after a save, the worker copy is rebuilt from the session and the event is logged locally.

## Technical justification

Frame-rate reads are cheap only on the thread that owns the value. Work that scales with document size (hash, validate, zip) is off the interaction path. Engines that must stay in lockstep share one worker, which avoids message latency between MCU, digital nets and solver (SIMULATION_ARCHITECTURE 17.2).

## Performance data (all one Apple M4 Pro unless stated)

RS-01: with level of detail p95 10.3 to 10.7 ms at 1x, fails at 4x zoom (34.1 ms). RS-03: avr8js 6.1 to 7.5 times real time unthrottled, about 1.1 to 1.7 times under main-thread throttle (Workers cannot be throttled over CDP). RS-06: rp2040js 0.54 to 0.79 times real time and about 100 percent of a core (Pass clause not met; Fail clause not triggered). RS-08: solve 0.04 to 0.09 ms on the largest catalogue circuit. RS-12: Yosys 662 to 725 MB renderer memory. RS-13: physics step mean 0.07 to 0.09 ms at 20 bodies. `apply` cost per op: UNKNOWN (AR-09).

## Cost implications

None. Workers are free; the server does only ordering and storage.

## Licensing

Engines: avr8js and rp2040js MIT, Rapier Apache-2.0 (TECHNICAL_RESEARCH F6 and D6); ngspice has mixed per-file licences with no single licence for the whole (`02_RESEARCH/tech/simulation-options.md` line 121, with KLU LGPL-2.1+ kept out of the build); Yosys and DigitalJS licences are recorded in the RS-12 report. Notices are collected in `NOTICE` (R-015).

## Security implications

A Worker is a performance boundary, not a confidentiality boundary, for first-party code (section 7.2). User code never runs in the page; it is data for engines with caps. Third-party extension code needs an opaque-origin iframe (PENDING RS-15).

## Reversibility

High for each worker (a protocol-versioned boundary). Moving the document to a worker (option B) would need a mirror design; not planned.

## Migration plan

X4 adds `ProjectWorker`; X5 adds `SimWorker` and moves the check worker onto the protocol; the `AiWorker` arrives with the keys store in B0 (key access) and the adapters in AI; engines join in SIM. FRONTEND 8.2 must match this ADR on worker lifetime and on where hashing runs.

## Known limitations

Device speeds are UNKNOWN; `behindReal` makes slowness visible instead of hiding it. Two copies of the document exist (session and worker cache); the checksum is the control. Structured clone of large documents between threads is not measured.
