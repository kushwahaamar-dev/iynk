# ADR-0310: The fidelity registry is data under version control

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: BRIEF 20.3; D-007; R-114. Spec: SIMULATION_ARCHITECTURE.md section 16.
Downstream: ADR-0302; SA-17; F-011, F-182; every document that prints a tier label.

## Problem

Fidelity claims live in UI strings, README text and lesson copy. Nothing stops a label from outrunning what a model does or from using the word "validated".

## Constraints

1. The label, the "What it models" panel and CI must read one source.
2. Entries must be reviewable in a pull request.
3. The registry must work offline.

## Considered options

| Option | Verdict |
|---|---|
| A. Strings in the UI | Rejected: drift |
| B. Registry as JSON files in the repository, validated in CI | Chosen |
| C. A database on the server | Rejected: needs a server (D-015) |

## Decision

One registry of entries (section 16.2): id, version, kind, tier, layers, `implements`, `mocked`, assumptions, `evidenceRange`, source citations, test ids. Labels, the panel and the CI oracle suite read it. The build fails if the asserted tier exceeds the computed tier, if a part or engine in the 38 converted projects has no entry, or if banned words appear (16.3, SA-17). Nothing prints a tier that is not in the registry.

## Technical justification

A single source removes the duplicate-state failure the project rules name. CI enforcement turns honesty from a habit into a check.

## Performance data

Loaded once at project open; entries are small JSON.

## Cost implications

Every new model needs an entry and a test; this is the intended cost.

## Licensing

Entries cite datasheets and papers by reference; quoted text is kept to short factual fields. Licence of the registry itself follows the repository licence (D-017, placeholder).

## Security implications

Registry text is rendered as plain text, never HTML.

## Reversibility

Low risk; the format is plain JSON.

## Migration plan

SIM-2 first entries (16.5); SIM-7 complete.

## Known limitations

Many entries have no reference data yet; the entry says so rather than inventing a tolerance.
