# ADR-0702: Motors, servos, steppers and drivers are coupled to joints by torque impulses; PWM uses a closed form per cycle

Status: proposed, 2026-10-27. Author: robotics architecture seat.
Upstream: BRIEF 11.1 (motor torque and limits, battery and power behaviour); D-007, D-010; SIM_ARCH 5.6, 7.2, 10.4; COMPONENT_SCHEMA 4.6, 4.10. Downstream: F-213, F-214, F-058; R-167. Spec: ROBOTICS_ARCHITECTURE sections 6.3, 7.

## Problem

SIM_ARCH 10.4 holds torque `kt * i` for a mechanical step and switches to an inductance-free motor when `L/R < 2 steps`. That prevents instability but does not make a PWM-driven motor right.

## Considered options

| Option | Result in the prototype (`motor2.mjs`, illustrative motor) | Verdict |
|---|---|---|
| A. Duty-averaged voltage, algebraic armature | exact for slow-decay (within 0.3 percent), 13 to 39 percent low in speed for coast at duty 0.25 to 0.75 | Rejected as the general form; kept for DC drive and unknown `L` |
| B. Closed form per PWM cycle | within 0.14 to 0.52 percent in both decay modes; about 98 ns per cycle | Chosen |
| C. Fine electrical sub-stepping (5 microseconds) | the reference; 200 sub-steps per millisecond | Rejected: cost for no gain over B |
| D. Hand it to the transient solver | | Rejected: waits on RS-08(b); B does not depend on it |

## Decision

The `MOTOR` element takes the pin waveform (a duty and frequency from the interpreter, or an edge list from avr8js), splits it into PWM cycles, and for each cycle computes the average armature current in closed form for the driver's decay mode (`slow`, `fast`, `coast`), holding speed constant inside the cycle. Torque is `kt * (i_avg - i0 sign(w))`. Gearbox efficiency applies in the direction of power flow. Torque reaches the engine as `applyTorqueImpulse(tau * dt)` on the child and the opposite on the parent. The loader computes `h * c` (step times inverse electromechanical time constant) and refuses `RB-E-COUPLING` above 1. Servo: rate and torque limited saturated position loop. Stepper: holding torque, pull-out table, deterministic lost-steps rule.

## Technical justification

Prototype: motor R 2.5 ohm, L 1.2 mH, ke 0.012, tau_m 104 ms, 490 Hz; the mechanical step is 4.17 ms and the PWM period 2.04 ms, so a step contains 2 to 4 cycles and the winding time constant (0.48 ms) is shorter than the period: the discontinuous-conduction regime where averaging fails. `h * c = 0.04`, far inside the stable region. The interpreter keeps `duty` and `pwmHz` per pin (`world.ts:17, 298-316`), which is already the periodic form.

## Cost

About 98 ns per PWM cycle per motor (prototype, one machine): 49 microseconds of CPU per simulated second per motor at 490 Hz. Engineering: 2 to 3 weeks (slice R2).

## Licensing

None.

## Security implications

None beyond input ranges: all motor constants are range-checked and a motor whose numbers produce NaN halts with `numeric-fault`.

## Reversibility

High. The element's interface is the same as the duty-averaged form; the closed form can be replaced by sub-stepping without touching the document.

## Migration plan

1. Land the element with the T1 conductance mode so the 106 existing faults and numbers do not move (RA-24). 2. Add the motor model to descriptors with sources. 3. Switch templates over one by one.

## Known limitations

The decay mode of each real driver module is unsourced (RK-4). The prototype motor is illustrative. Back-driving, gear backlash, cogging, heating and brush wear are not modelled.
