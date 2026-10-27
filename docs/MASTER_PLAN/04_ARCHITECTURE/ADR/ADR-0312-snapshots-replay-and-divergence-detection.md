# ADR-0312: Snapshots, replay and divergence detection

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: Audit A12; DET-1 to DET-4; R-107; R-090. Spec: SIMULATION_ARCHITECTURE.md sections 6.7, 6.9, 15, 17.4.
Downstream: ADR-0303, 0506 (rooms); SA-06, SA-12, SA-18; F-054, F-207, F-186.

## Problem

Replay exists for flight only. Collaboration needs peers to agree without streaming frames, and debugging needs "go back to just before it broke".

## Constraints

1. Replay must work across sessions and versions.
2. Peers simulate locally (D-015); the relay does not simulate.
3. Snapshot formats differ per engine.

## Considered options

| Option | Verdict |
|---|---|
| A. Stream frames from the host to peers | Fallback only |
| B. Replay = seed + versions + input log; per-engine versioned snapshot blobs; a state hash every 1,000 ms of simulated time compared between peers | Chosen |
| C. Record full traces | Rejected: size |

## Decision

A `ReplayRecord` holds the seed, the pinned versions (engines, registry models, `dmath`, Rapier and avr8js as `'<pkg>@<semver>+sha256:<hex>'`) and the ordered `InputEntry` log. Each engine provides a versioned snapshot. The orchestrator hashes engine state every 1,000 ms of simulated time (`checkpoints`). Rooms compare class B hashes (digital, MCU, serial) and class D hashes for analog; a mismatch resyncs from the host snapshot. Physics restore is keyframe replay every 5 simulated seconds with at most 64 kept until RA-08 passes.

## Technical justification

Inputs-as-data makes replay a pure function of the record. The host's hash is the reference, so one peer cannot silently drift.

## Performance data

Unmeasured. SA-18 records snapshot and restore cost for five runs.

## Cost implications

A snapshot function per engine and the record format; storage is a few kilobytes per minute of inputs.

## Licensing

None.

## Security implications

A replay record from another person is untrusted input: validated against the schema and replayed under the same budgets.

## Reversibility

Reverse if class B hashes diverge across peers in practice: stream frames from the host.

## Migration plan

SIM-4 (snapshot and replay), with SA-18; physics follows RA-08.

## Known limitations

avr8js state serialisation is UNKNOWN (6.7). Firefox and x86-64 hash agreement is open (SA-12).
