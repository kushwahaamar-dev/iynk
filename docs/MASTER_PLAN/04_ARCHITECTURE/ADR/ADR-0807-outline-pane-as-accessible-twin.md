# ADR-0807: An outline pane is the accessible twin of the canvas; every canvas action has a list-based keyboard path emitting the same ops

Status: pending RS-16, 2026-10-27. RS-16 never ran. The keyboard half is tested by an agent (Playwright); the screen-reader pass is a For Amar check (Q-13) and does not gate the build (D-014, RC-67). Author: Studio editor design seat.
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

Build the outline in the Studio phase, in the same slice as the first lens (RC-67). Its exit measure is an agent-run Playwright keyboard test (place a part and wire two pins with no pointer, targets meeting WCAG 2.5.8) plus axe with zero serious or critical findings (STU-27). Amar's screen-reader pass (Q-13) later adds a verdict; it does not hold up the build.

## Known limitations

- The pointer-free path is verified by Playwright keyboard tests only. No screen-reader pass has run (RS-16 UNKNOWN; For Amar, Q-13). If it finds the outline unusable, the tree structure or live-region wording changes; the ops do not.
- Screen reader quality for drawn wires is UNKNOWN.

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RC-67 | Accessibility core (axe zero serious and critical, keyboard path, outline pane) is part of the Studio phase gate. Migration plan now builds the outline in that slice. |
| RS-16 | Never ran, no report. Removed "PENDING RS-16" from the status line, migration plan and known limitations. Keyboard test becomes an agent task; the screen-reader pass is listed as For Amar (Q-13). |
| D-014 | Studio no longer waits on the screen-reader result. |
| RS-01 | Noted only: the outline stays valid whichever renderer is chosen, because it reads the Selection store, not the canvas. The virtualised list figure stays UNKNOWN; no RS report measured it. |

## Reconcile, final nits (2026-10-27)

- RC-62: status line now reads `pending RS-16`, matching ADR/README.md.
