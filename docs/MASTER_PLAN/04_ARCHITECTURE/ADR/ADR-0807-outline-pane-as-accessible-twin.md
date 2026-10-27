# ADR-0807: An outline pane is the accessible twin of the canvas; every canvas action has a list-based keyboard path emitting the same ops

Status: proposed, 2026-10-27; final test PENDING RS-16. Author: Studio editor design seat.
Upstream: R-058, R-070; PRD accessibility requirements; D-013. Downstream: F-094; STU-15, STU-27. Spec: `03_PRODUCT/STUDIO_EDITOR.md`, STUDIO_EDITOR sections 9.2 and 12.2.

## Problem

A canvas of hundreds of shapes is not navigable by keyboard or screen reader by itself.

## Constraints

1. The same ops must result from keyboard and pointer.
2. Zero serious or critical axe findings (STU-27).
3. No second source of truth for selection.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| Spatial arrow-key navigation of the canvas only | Roving focus over drawn shapes | Rejected as the only path: order is arbitrary and large scenes are tedious |
| Outline tree beside the canvas, linked both ways | Boards, components, nets, wires, problems; pin rows show the net | **Chosen** |

## Decision

A tree pane lists boards, components with pins, nets, wires of the active view and problems. Selecting a row selects on the canvas and the reverse. Every canvas action has a path through the outline plus a "Connect to..." command that emits the same ops. A live region announces each committed batch.

## Technical justification

- The list is also faster for finding a part by refdes in a big project.
- It reuses the Selection store; nothing is duplicated (one source of truth).

## Performance data

Virtualised list above 100 rows. Not measured. UNKNOWN until the harness opens a 500-part project.

## Cost implications

Engineering only.

## Licensing

No new dependency chosen; a tree widget library is not assumed.

## Security implications

No new surface; strings are escaped text.

## Reversibility

High. The pane is an addition; removing it removes only the keyboard path.

## Migration plan

Build the outline with the first lens, then run RS-16 and replace the proposal with its verdict.

## Known limitations

- The pointer-free path is a proposal until RS-16 reports.
- Screen reader quality for drawn wires is UNKNOWN.
