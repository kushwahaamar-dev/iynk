# ADR-0314: Faults are operations on the model; failures are derived; one shared diagnosis record

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: D-010; audit B3-11. Spec: SIMULATION_ARCHITECTURE.md section 13.
Downstream: ADR-0313; SA-23; PROJECT_DATA_MODEL (`fault.set`); ROBOTICS and DRONE cause ids; F-017 to F-029; J-06.

## Problem

Fault outcomes are scripted today (for example the flight faults), so they cannot appear on a circuit the person built, and each lab keeps its own list of cause ids.

## Constraints

1. D-010: one record `{cause_id, symptom_id, evidence, hint_level}`.
2. A fault must be an operation in the project history (reviewable, undoable).
3. The 79 catalogue circuits give no false alarms.

## Considered options

| Option | Verdict |
|---|---|
| A. Scripted outcomes per lesson | Rejected |
| B. Faults as `FaultOp` (change a value, open or swap a connection, force a state, `param`, `mount`, `sensor`, `swap-phase`); failures from rules over solved quantities with derivation records | Chosen |

## Decision

A fault is a cause; a failure is a consequence. Faults are operations (13.2). Failures are derived by rules with a `FailureModel` record: trigger expression, derivation text, reference data, assumptions, `evidenceRange`. The cause-id registry in 13.4 is the single list (45 ids); `x-` prefixes are extensions. Every diagnosis is `Diagnosis { cause_id, symptom_id, evidence[], hint_level 0..3 }`. Static rules run in the editor without a solve using the same ids.

## Technical justification

One record shape lets the editor, the AI partner and the learning flow share evidence. The BRIEF 30 swap fault is expressed as `swapped-pins` with symptom `i2c-no-ack` from the bus layer and the code-plus-netlist rule.

## Performance data

Target for generic rules: zero false alarms on the 79 catalogue circuits and 18 of 20 deliberate faults found (F-029 line). Not yet measured.

## Cost implications

Each cause needs a detector, a symptom text key and a three-step hint ladder.

## Licensing

None.

## Security implications

Fault operations pass through the same validation as any project operation (ADR-0104, ADR-0110).

## Reversibility

Low risk; ids are strings in the registry.

## Migration plan

SIM-8.

## Known limitations

Degradation has a model only for the flight battery at the first release; thermal derating waits for the solver (F-219).
