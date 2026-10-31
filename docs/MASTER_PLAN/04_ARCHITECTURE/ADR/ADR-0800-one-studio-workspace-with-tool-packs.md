# ADR-0800: One Studio workspace; views are lenses over one document; domain tools are tool packs

Status: proposed, 2026-10-27. Author: Studio editor design seat.
Upstream: BRIEF 7; D-013, D-014; audit A5, D5; PDM P1, N7, W8, ADR-0104. Downstream: F-076 to F-094; ADR-0802. Spec: `03_PRODUCT/STUDIO_EDITOR.md`, STUDIO_EDITOR section 2.

## Problem

iynk will hold circuits, code, mechanical assemblies and flight designs. The workflow (imagine, design, assemble, wire, program, simulate, debug) crosses these in minutes. Today there are separate labs with separate stores (audit D5).

## Constraints

1. One document and one `apply` function are the only way state changes (ADR-0104).
2. Undo, autosave, rooms and AI proposals must read one op log.
3. A lens that is not on screen must cost nothing.
4. No dependence on one rendering technology (PDM 14.1).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. One workspace, views as lenses, tool packs through a seam | Shell owns store, op pipeline, selection, undo, run client, keymap. Lenses draw one view kind. Packs add tools and docks through the same `Tool` and `Lens` interfaces | **Chosen** |
| B. Specialised editors linked by project data | Circuit editor, code IDE, mechanical editor, flight designer | Rejected: each needs its own selection, undo and validation, or a shared runtime; undo per editor confuses a person who changed code then wiring |
| C. One shell, per-mode toolsets | The editor changes its tools with a mode | Rejected: a hidden mode is the commonest source of a stuck tool and the document has no place to store it |

## Decision

A. The Studio is one workspace. Breadboard, schematic, board and mat are lenses over `views[]` of one document. Code, serial, instruments, problems and the guide are docks. Mechanical and drone design plug in as tool packs. Nothing a lens does can bypass the shell op pipeline.

## Technical justification

- PDM already stores `views[]` of four kinds, all pointing at one `nets` array, so a lens cannot disagree about connectivity.
- Fritzing keeps breadboard, schematic and PCB views over one model (EXTERNAL, `02_RESEARCH/competitors/circuit-eda.md`).
- Lenses are lazy chunks; an unmounted lens cannot break another.

## Performance data

No measurement for this decision. The cost it implies (only the active lens costs frame time) rests on lazy chunks, ESTIMATED, not measured. Canvas numbers are in ADR-0801.

## Cost implications

Engineering only: the `Tool`, `Lens` and shell interfaces. No hosting cost (D-015). ESTIMATED as part of the STUDIO phase in section 16; no separate figure.

## Licensing

No new dependency. Fritzing is referenced as prior art only; no code is copied.

## Security implications

The shell is the single place that validates and applies ops, so a tool pack cannot write the document directly. Packs are first-party in the first phase; loading third-party packs is out of scope and would need a sandbox decision.

## Reversibility

High. If a domain needs an interaction model that cannot share selection and undo, its lens can run as its own route over the same project store; the interface does not assume the canvas is on the page. The document is view-agnostic.

## Migration plan

Create the shell and one lens (breadboard) first (ST-1); add the schematic, board and mat lenses on the same interfaces; move the Board, Robotics and Drone labs in as projects and templates (D-014), then delete the lab stores once parity tests pass.

## Known limitations

- Nine or more panes compete for the same screen on a phone; the shell must collapse docks into tabs (section 12.1).
- A tool pack with a very different model (3D editing) may strain the shared selection model; unproven until the ROBOT phase.
