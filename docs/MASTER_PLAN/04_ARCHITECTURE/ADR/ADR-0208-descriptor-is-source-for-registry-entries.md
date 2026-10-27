# ADR-0208: The descriptor is the authored source for part-model and failure-model registry entries

Status: proposed, 2026-10-27. Author: component-schema design pass.
Spec: COMPONENT_SCHEMA.md (section 12 holds the pointer table).

## Problem

`SIMULATION_ARCHITECTURE.md` section 16 keeps a hand-written fidelity entry per model, and section 13.3 keeps failure records. A part descriptor needs the same facts (what it models, sources, tests, thresholds). Written twice they drift (one source of truth)

## Constraints

The registry's CI rules (allowed tier, banned words, coverage, freshness) must keep working; the UI prints only what the registry says; a part must still be addable without touching engine code

## Considered options

(a) Descriptor and registry both hand-written; (b) the registry is the only source and the descriptor holds a pointer; (c) the descriptor is the authored source for `part-model` and `failure-model` entries and a build step generates them; (d) merge the two formats

## Decision

(c)

## Technical justification

The facts are per part and change with the part, so they belong in the part's file and in its version. (b) forces a second file edit for every part change and splits one rating's numbers from its tier claim. (d) mixes parts with engines, runtimes and rules, which have no pins or ratings. Generation keeps the registry's CI rules unchanged because they read the generated entries

## Performance data

None; generation runs at build time

## Cost implications

One build step and one mapping table (4.17). Removes an estimated second authoring pass per part (not measured)

## Licensing

n/a

## Security implications

Registry text from imported parts is rendered as text; imported parts can only claim tiers the CI rules allow, and are generated at import into the local registry, never into the shipped one

## Reversibility

High. The mapping is one function; moving authorship back to the registry changes the build step and not the runtime

## Migration plan

The three examples already carry the fields. The registry owner implements the generator; until then the examples validate on their own

## Known limitations

`primary` is unset in the examples because none is above T1; failure `spread` is not in the format; `implemented_as` needs a field in the registry's `FailureModel`
