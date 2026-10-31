# ADR-0704: Robot code runs on the board runtime; the plant steps at 240 Hz; encoder edges are timestamped inside a step

Status: proposed, 2026-10-27. Author: robotics architecture seat.
Upstream: BRIEF 11.1 (control loop timing, PID); D-010; SIM_ARCH 5.5, 6.2, 17; ADR-0301. Downstream: F-214; R-167. Spec: ROBOTICS_ARCHITECTURE section 9.

## Problem

A control loop's behaviour depends on when it reads sensors and when its output takes effect. Hiding that behind a "robot API" would teach nothing.

## Considered options

| Option | Verdict |
|---|---|
| A. User code on the existing board runtime; the plant is an engine at P5; timing terms shown | Chosen |
| B. A robot API with blocking `drive(speed)` calls | Rejected: not what runs on a real board |
| C. Run the physics at the MCU's cycle rate | Rejected: cost; the plant dynamics are slow |

## Decision

Ordering follows SIM_ARCH 5.5 (P2 MCU, P3 resolve, P4 sample, P5 dynamics). The plant step is 1/240 s. A loop-timing instrument shows the user's loop period and jitter on the virtual clock. Encoder edges inside a step are placed by linear interpolation of joint angle between boundaries and delivered as P4 events. A PID reference law (derivative on measurement, filtered, conditional-integration anti-windup) ships as source templates and a read-only tuning plot.

## Technical justification

Latency terms: sensor period, code time (`opNs` per statement), PWM update (up to one period), motor electrical lag, 4.17 ms step quantisation, mechanical lag. Interpolation error is second order when speed changes little in a step (a motor from rest at full voltage changes speed by at most `h / tau_m`, 4 percent in the example); RA-09 tests it.

## Cost

Slice R3. Event cost: 1,600 edges per second for a 1,000-count wheel at 10 rad/s, within the queue's tested range (780 to 980 pin events per second per PWM pin, RS-03).

## Licensing

None.

## Security implications

User code runs under the existing run limits (ADR-0311). Nothing in this ADR adds a code path with I/O.

## Reversibility

High. Interpolation can be replaced by sub-stepping the engine in the step that contains an edge.

## Migration plan

Templates 2 and 3 are the first users. The PID templates are reviewed for correctness against the reference law before shipping.

## Known limitations

The linear interpolation is wrong during violent speed changes (impacts). Sample-and-hold of PWM across a step is exact only for periodic waveforms. `dmath` is needed for class B on the trigonometric parts.
