# ADR-0202: Layered behaviour with named model kinds

Status: proposed, 2026-10-27. Author: component-schema design pass.
Spec: COMPONENT_SCHEMA.md (section 12 holds the pointer table).

## Problem

A part's behaviour is spread across the solver, power-tree rules, interpreter devices and figure code, with no common description

## Constraints

Keep working code (BRIEF §3.5); the solver's element list is fixed today; beginner mode must not need code

## Considered options

(a) one `model` per part; (b) layers, each a tagged union of element, subcircuit, builtin, logic, extension, none; (c) a general behavioural DSL; (d) require every part to be a SPICE subcircuit

## Decision

(b)

## Technical justification

Real parts need several domains at once (the MPU module has a regulator, an I2C register map and a LED). A DSL (c) is a language to design, test and secure; SPICE (d) is the wrong tool for firmware-visible devices and the in-house solver is DC only (RS-08 part b not run). `builtin` refs wrap what exists without a rewrite

## Performance data

RS-08: solver 10-digit agreement with ngspice on 80 DC circuits, 0.45 ms for the largest circuit at 6x CPU throttle (VERIFIED in that report). Layer dispatch adds no per-frame cost over today's `elec()` objects (design argument, not measured)

## Cost implications

Each `builtin` ref needs one registry entry; the conversion work is data entry

## Licensing

n/a

## Security implications

`builtin` is first-party code only; imported parts may name only allow-listed refs

## Reversibility

Medium. Model kinds are part of the format, but adding a kind is additive

## Migration plan

Table in section 5. Regulators and capacitors move from rules to elements when the SIM phase adds stamps; the descriptors then change `builtin` to `element` in a minor or major per ADR-0205

## Known limitations

No transient elements yet (4.9); no part can reach T2 until the registry's comparison and tolerance evidence exists
