# ADR-0804: Unplaced parts: a tray in the breadboard view, computed auto layout elsewhere, frozen on first manual edit

Status: proposed, 2026-10-27. Author: Studio editor design seat.
Upstream: PDM 5.7 views, placements; AI and import producing parts without positions. Downstream: F-078, F-082; STU-13. Spec: `03_PRODUCT/STUDIO_EDITOR.md`, STUDIO_EDITOR sections 6.4 and 8.

## Problem

A part can exist in `components` without a placement in a given view (created by an import, the AI, or another view). The editor must show it, and the layout must not change the document unasked.

## Constraints

1. Opening a view must not write to the document.
2. Two openings of the same document must give the same layout.
3. Parts that need a breadboard surface cannot be auto placed on it without a decision.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| Store auto layout at view creation | Write positions when the view is made | Rejected: writes ops nobody asked for and forks histories |
| Hide unplaced parts | Show only placed parts | Rejected: a part disappears from the person's view |
| Tray plus computed layout, frozen on first manual edit | Breadboard view lists unplaced parts in a tray; other views compute `autoLayout` deterministically; the first manual move writes every current position in the same batch | **Chosen** |

## Decision

The breadboard view has a tray of unplaced parts. Schematic, board and mat views compute `autoLayout` (deterministic, same output for the same document) and draw from it. The first manual edit writes all current positions in one batch (STU-13).

## Technical justification

- Deterministic layout makes screenshots and tests stable.
- The document only changes when the person acts.

## Performance data

Not measured. Layout of 500 parts must fit inside the open budget (1 s, BUD-09 proposal); UNKNOWN until measured.

## Cost implications

Engineering only.

## Licensing

No new dependency; the layout is ours (a simple layered or grid algorithm, no library chosen).

## Security implications

No new surface; positions are quantised numbers validated by the schema.

## Reversibility

High. Storing the layout later is one batch.

## Migration plan

Write `autoLayout`, add the tray, add STU-13.

## Known limitations

- A computed layout of a messy circuit may be ugly; the person can move parts and freeze it.
- Q-S5 asks whether an explicit "removed from view" state is needed (default: no).
