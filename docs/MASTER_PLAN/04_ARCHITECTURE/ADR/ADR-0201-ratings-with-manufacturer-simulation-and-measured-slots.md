# ADR-0201: Ratings with manufacturer, simulation and measured slots

Status: proposed, 2026-10-27. Author: component-schema design pass.
Spec: COMPONENT_SCHEMA.md (section 12 holds the pointer table).

## Problem

BRIEF §9.2 asks to separate maker ratings, simulation assumptions and validated behaviour; today one constant like `imax: .02` or `RSA = 12` carries all three meanings

## Constraints

D-007 (never "validated"); a model must have exactly one number to read; the UI must show where it came from

## Considered options

(a) one value plus a `source` string; (b) a `confidence` flag on a single value; (c) three slots per rating plus `used_by_model`; (d) separate files for datasheet data and simulation data

## Decision

(c)

## Technical justification

(a) and (b) cannot hold a datasheet value and the different value the model uses at once, which the L298N shows (50 mA maker typical, 50 mA taken; 2.0 V dropout assumed against 1.8 V stated). (d) splits one rating across files and makes "which one does the model read" implicit

## Performance data

None needed; resolution happens at load

## Cost implications

More fields per number. The three examples hold 49 ratings; 10 + 8 of them are read by no model, which is information the old code lost

## Licensing

Datasheet numbers are facts, cited not copied; sources carry their own licence text where they have one. Counsel question on "facts from datasheets" is RS-17-adjacent and UNKNOWN

## Security implications

None

## Reversibility

High: a loader can collapse to the used slot

## Migration plan

Convert constants from figure and interpreter code into the simulation slot with a rationale and source, then add the maker slot where a datasheet exists

## Known limitations

Vector quantities (the gyro bias x, y, z) are stored as literal model parameters, not ratings; ranges per instance (part spread) are not modelled
