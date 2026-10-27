# ADR-0107: Parts are referenced by `{ref, version}` and the project pins an interface snapshot

Status: proposed, 2026-10-27. Author: project-data-model seat.
Upstream: R-028 (unknown part placeholder), R-029 (descriptor and pinned version), R-138 (licence field); F-097, F-101, F-220; `schemas/component.schema.json` (another seat). Spec: PROJECT_DATA_MODEL 5.3.

## Problem

A component instance must say which part it is. Three requirements pull in different directions: a newer part version must never change an old project silently (R-029); a buddy's project that uses a custom part must still open on a machine that does not have it (R-028); and validation, the netlist and AI tools need pin ids without loading a whole library.

## Constraints

1. Part ids, versions and pin ids are defined by the component schema (`namespace.name`, semver, letter-first pin ids).
2. Offline: a project must be understandable without a registry lookup.
3. No second source of truth for pin data that can quietly drift.
4. Licences of part data travel with the part (R-138).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Reference only (`ref@version`), resolve through the library | Smallest | Rejected: a missing custom part leaves the project with unknown pins, so nets and wires cannot be checked or shown |
| B. Embed the full descriptor in every project | Self-contained | Rejected as the default: descriptors carry ratings, behaviour, artwork and models; duplicated across thousands of projects |
| C. Reference plus a pinned interface snapshot (pins, groups, parameters), digest for non-builtin parts, full descriptor only when embedded | Self-describing for structure, small | Chosen |
| D. Content-addressed digest only | Exact | Rejected: unreadable and still needs the library |

## Decision

`dependencies.components[]` has one entry per distinct `{ref, version}` used. Each entry has `origin` (`builtin`, `library`, `embedded`), a `digest` of the canonical descriptor for `library` and `embedded`, and an `interface` of `role`, `pins` (id, designator, type, class, polarity, position in the part frame, legacy leg name, legacy net name and header), `body_mm`, `mount`, `groups` (internal-short, strip, plane) and `params` (id, type, unit, default, values, min, max). Instances reference `{ref, version}`. For `embedded` parts the full descriptor sits beside it (bare JSON) or under `definitions/` (container). Version is an exact semver; the document never says "latest".

## Technical justification

- The interface is the minimum that structure needs: pin existence, groups for internal joins, parameter keys and types. Ratings, behaviour, artwork, models and failure modes stay in the descriptor.
- An unknown part becomes a labelled placeholder with its real pins (R-028 asked for pins "taken from the wires"; the snapshot is better).
- Drift is detectable: for builtin parts a CI test compares each example's interface with the shipped descriptor; for the others the digest does it. On a mismatch the loader reports `V6-INTERFACE-DRIFT` and uses the descriptor.
- The three examples validate with interfaces in place; the validator checks that every pin in a net, wire, check and world input exists on its instance.

## Performance data

Size cost, VERIFIED from the examples: the pinned interface of the Uno R3 (44 pins, 6 groups) is 4,032 bytes canonical. In the Uno blink starter the whole `dependencies` section is 4,764 of 8,865 bytes (54 percent); in the ESP32 monitor 5,036 of 13,700 (37 percent); in the converted lesson 5,188 of 28,568 characters (18 percent). Compression removes most of it (the blink starter gzips to 2.3 KB). At 500 components with about 10 distinct parts the interfaces are an estimated 10 to 15 percent of the document (ESTIMATED from these numbers).

## Cost implications

No run-time cost beyond bytes. Engineering: a function that derives an interface from a descriptor, a CI check, and a loader path for placeholders.

## Licensing

Part data carries its own licence in the descriptor (`provenance`). The project's `license` and `provenance.thirdParty[]` record outside content. A copied third-party library part is not accepted without a licence field (R-138). The interface snapshot is factual structure (pin names and types) derived from the descriptor and inherits its licence.

## Security implications

Pinned interfaces are untrusted input like everything else and are validated by the schema. An `embedded` descriptor can carry behaviour (a simulation model); running a model from a stranger's project is the component spec's sandbox question, not decided here. The digest stops a library part being swapped under the same version without notice.

## Reversibility

High. Making `interface` optional for `builtin` parts is a loosening (MINOR bump) and would drop the starter overhead; making it required again is a MAJOR bump. The reference shape `{ref, version}` does not change.

## Migration plan

1. The component spec ships `core.*` descriptors; the example ids here (`core.resistor`, `core.uno-r3`, ...) are assumptions except `core.led-5mm`, which exists in `schemas/examples/components/` (Q5 in PROJECT_DATA_MODEL 14.2).
2. The converter derives interfaces from descriptors; until a descriptor exists it derives them from the catalogue pinout with rule C-PIN.
3. The store resolves references through the library at load, falling back to the snapshot.

## Known limitations

- Duplication: the interface repeats data the library already has. The measured overhead above is the price of a self-describing file; the writer can drop it for builtin parts later if the overhead matters.
- Pin id rules come from the component spec; if it changes them, rule C-PIN and the examples change, not the document shape.
- An interface does not say what a pin does electrically beyond its `type`; the solver needs the descriptor.
- A part whose version is not in the local library cannot be simulated, only displayed.
