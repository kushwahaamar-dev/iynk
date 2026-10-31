# ADR-0805: Undo is per author, in memory, built from apply inverses, with two scopes (canvas and code)

Status: proposed, 2026-10-27. Author: Studio editor design seat.
Upstream: PDM 7.4; RS-09; R-034; ADR-0104. Downstream: F-087, F-088; STU-04, STU-12. Spec: `03_PRODUCT/STUDIO_EDITOR.md`, STUDIO_EDITOR section 11.

## Problem

In a room, one global stack would undo a buddy's work. A persistent stack would need its own storage and invalidation.

## Constraints

1. Undo must be an op in the log, so rooms and replays see it.
2. A text editor has its own expectation of Ctrl+Z.
3. The cost of keeping stacks must be small.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| One global stack | All authors share | Rejected: undoes other people's edits |
| Persistent undo | Stacks saved with the project | Rejected: stale inverses after other edits; extra storage |
| Per-author in-memory stacks from `apply` inverses; two scopes; code undo written as forward ops | 200 entries, cleared on close | **Chosen** |

## Decision

Each author has an in-memory stack (200 entries, PROPOSAL) of the inverses returned by `apply`. Undo submits the inverse as a new batch. The canvas scope and the code scope are separate stacks, so Ctrl+Z in the editor does not undo wiring. Code undo is written as forward `source.edit` ops.

## Technical justification

- RS-09 invariant: a rejected or inverted op is applied through the same function, so undo cannot create an invalid document.
- Per-author stacks match what a person expects in a shared room.

## Performance data

Memory only; 200 entries of small batches. Not measured. A drag costs one entry (one `view.place` per moved item at release).

## Cost implications

Engineering only.

## Licensing

No new dependency.

## Security implications

Undo goes through permission checks like any op; a viewer cannot undo into a document they cannot edit.

## Reversibility

High. A persistent log could be added later because inverses are already ops.

## Migration plan

Implement stacks over `apply`, then add the code scope when the code dock lands.

## Known limitations

- Undo does not survive a reload (R-034 accepts this).
- Undoing a change another author built on can be rejected with `stale_base`; the UI explains it.
