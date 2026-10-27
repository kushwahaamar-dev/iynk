# ADR-0205: Versioning, pinning and immutability

Status: proposed, 2026-10-27. Author: component-schema design pass.
Spec: COMPONENT_SCHEMA.md (section 12 holds the pointer table).

## Problem

A changed model must not silently change an old project (R-029); replay needs stable behaviour

## Constraints

Local-first: no central registry; digests must be cheap; projects may be shared

## Considered options

(a) always latest; (b) semver with project pins `id@major`; (c) semver with exact pin plus digest for non-builtin parts; (d) content-addressed only

## Decision

(c): immutable `id@version` in the registry. The project stores `{ref, version}` per instance and per `dependencies.components[]` entry (ADR-0107), plus a `digest` of the canonical descriptor for `library` and `embedded` parts only. Patch, minor, major rules in 4.16

## Technical justification

Exact pin plus digest makes a share link reproduce a result byte for byte and detects tampering with library and embedded parts; (b) allows behaviour drift inside a major. Builtin parts need no digest because the app version fixes them and the CI interface-drift test compares each shipped example's interface snapshot with the shipped descriptor

## Performance data

n/a

## Cost implications

Storage grows with versions; descriptors are small (4.5 to 9 KB gzipped)

## Licensing

n/a

## Security implications

Digest mismatch blocks load for `library` and `embedded` parts. Builtin parts are protected by app version and the CI drift test, not a hash. Code parts need re-approval on change

## Reversibility

High

## Migration plan

Existing catalogue ids start at 1.0.0; the project document records `{ref, version}` and `origin` when a part is placed, and a `digest` when the origin is `library` or `embedded`

## Known limitations

No automatic security-fix propagation (a feature: the person approves upgrades)
