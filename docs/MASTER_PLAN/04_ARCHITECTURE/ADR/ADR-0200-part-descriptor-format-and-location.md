# ADR-0200: Part descriptor format and location

Status: proposed, 2026-10-27. Author: component-schema design pass.
Spec: COMPONENT_SCHEMA.md (section 12 holds the pointer table).

## Problem

Parts are JS beside drawings; ids are closed unions; adding a part edits the engine (`TECHNICAL_DEBT.md` B3-02, R-029, R-030)

## Constraints

Local-first, no server needed (D-015); lazy loading on low-end devices (D-011); checked in CI; human readable and diffable; work in browser and Node

## Considered options

(a) JSON files plus JSON Schema 2020-12; (b) TypeScript modules exporting objects; (c) YAML; (d) a database table on a server; (e) keep JS beside art

## Decision

(a): one `component.json` per `id@version`, schema `iynk.component/1`, repo folder `parts/`, built into `public/parts/` with a generated index; custom parts in IndexedDB and the project folder

## Technical justification

JSON parses safely with no code execution (TypeScript modules and JS do not); JSON Schema gives CI, editor validation and error paths from one source; YAML adds a parser and ambiguity; a server table breaks local-first

## Performance data

MEASURED sizes 12 to 29 KB minified, 4.5 to 9 KB gzipped for three parts. Parse and validate time: not measured (ESTIMATED under 5 ms)

## Cost implications

None recurring. Authoring effort per part is higher than JS because provenance is required (that is the point); conversion effort UNKNOWN until the draft tool exists

## Licensing

Ajv is MIT [EXTERNAL, not re-checked this pass]; the schema is part of the repo under the licence D-017 selects

## Security implications

Data only; validated before use; text rendered as text; `relPath` blocks traversal

## Reversibility

High. The loader returns a `PartDef`; the on-disk format can change with a migration chain (ADR-0205)

## Migration plan

Sections 5 and 3: extend, do not replace; `@cf data` lets figures read pins from the descriptor; `legacy_ids` keep old ids; closed unions removed last

## Known limitations

Large pin counts need a generator; no schema-level reuse of parts across a family (a `base` field could be added later); cross-reference rules live outside JSON Schema (6.2)
