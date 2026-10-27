# ADR-0203: Failure modes as data, with derivation and implementation status

Status: proposed, 2026-10-27. Author: component-schema design pass.
Spec: COMPONENT_SCHEMA.md (section 12 holds the pointer table).

## Problem

Burn-out limits are code constants; some documented limits are not implemented; the shared diagnosis record needs cause and symptom ids from the part

## Constraints

D-010 record `{cause_id, symptom_id, evidence, hint_level}`; D-007 honesty; faults on any circuit (D-014)

## Considered options

(a) keep constants in code; (b) thresholds in data without status; (c) thresholds in data with `derivation`, `basis` and `implemented_as`; (d) a rule engine

## Decision

(c), plus a separate `injectable_faults` block

## Technical justification

The L298N cut-out and reverse-supply burn are scripted, not computed (VERIFIED, `l298n.js:56`, `bench.js:227`); (b) would state a threshold the engine ignores. (d) is more machinery than seven conditions need

## Performance data

None; evaluation reuses the existing per-frame checks

## Cost implications

Authors must write a derivation for each threshold

## Licensing

n/a

## Security implications

Data only

## Reversibility

High

## Migration plan

Existing fault strings keep working through `legacy_id`; thresholds move from code into data one part at a time with a test each

## Known limitations

Conditions are conjunctions of simple comparisons; no time-integrated damage (a thermal-mass model is a later layer)
