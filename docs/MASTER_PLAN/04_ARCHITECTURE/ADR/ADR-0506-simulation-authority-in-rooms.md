# ADR-0506: Simulation in rooms: the server orders, the runner clocks, peers mirror

Status: proposed, 2026-10-27. Author: realtime-architecture seat. PENDING RT-2, DET-2, SA-12 for cross-machine behaviour.
Upstream: BRIEF 14 ("decide which simulation state is authoritative and where it runs"); D-015; SIMULATION_ARCHITECTURE 6.7, 6.9, 17.4, ADR-0312; R-090; F-121. Spec: REALTIME_ARCHITECTURE 13.

## Problem

SIMULATION_ARCHITECTURE 17.4 has each peer simulate locally from the ordered operations and a shared replay log, with the host's hash as the reference. It does not say how a human input gets one agreed instant in virtual time. The relay must not simulate (D-015: nothing runs on a paid or special server).

## Constraints

1. No simulation on the server.
2. Weak devices must still be able to take part.
3. Engines are deterministic within a stated class (B, N, D); cross-engine bit equality is not proven for analog, flight, or physics on Firefox and x86-64.
4. Honest labelling (D-007).

## Considered options

| Option | Verdict |
|---|---|
| A. Runner-clocked lockstep: runner stamps inputs and publishes time ticks; mirrors never pass the latest tick | Chosen |
| B. Host streams frames to everyone | Kept as fallback only: bandwidth and no local probing |
| C. Every peer applies inputs at its own current virtual time | Rejected: diverges at the first press |
| D. Server-side simulation | Rejected (D-015); also needs a trusted compute node |
| E. Rollback netcode | Rejected: needs snapshots of every engine (avr8js has none, SIMULATION_ARCHITECTURE 6.7) |

## Decision

Document state is server-authoritative. Simulation state has no authority; the runner (default host) owns time. Control and input events (`InputEntry` kinds) are stamped by the runner, ordered by the server with `rseq`, applied by everyone in `(tNs, rseq)` order. Ticks at 10 Hz bound the mirrors. Hash checks every 1,000 ms of simulated time: class B `hb` where proven, class D `hd` for analog, flight and physics until SA-12 and DET-2 pass. A diverged or version-mismatched mirror shows the runner's frames with a label. Sim-affecting edits halt the run with a reason at the commit's `seq`. Runner loss pauses everyone at the last tick. Late join replays the run log (cap 50,000 entries).

## Technical justification

Argument in REALTIME_ARCHITECTURE 13.2: mirrors cannot pass the runner's published time; stamps exceed all published time; per-connection order is preserved.

## Performance data

UNKNOWN: mirror lag and input latency (RB-9, RT-2). avr8js 6.1 to 7.5x real time on an M4 Pro, about 1.7x at 4x throttle (RS-03); rp2040js 0.54 to 0.78x (RS-06 FAIL), so a slow runner slows the room and the UI says so.

## Cost implications

S7: ESTIMATED 2 to 3 weeks including sim worker hooks.

## Licensing

None.

## Security implications

Only the runner may send `run.ev`, `run.tick`, `run.check` (`not_runner`); others send requests. Run frames are rate limited; the run log is capped. A hostile runner can lie about time, but it is chosen by the host among trusted buddies; the room shows who runs.

## Reversibility

High at the protocol level (run frames are a capability). If RT-2 fails, rooms fall back to frames for that engine class.

## Migration plan

S7 after S4 to S6. Flight ghosts and lap submission remain local (F-070).

## Known limitations

Mirror lag is a design cost. Physics and flight are class D across machines until DET-2. Run state is lost at server restart. Edit-while-running behaviour depends on the Studio spec (Q-R2).
