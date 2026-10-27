# ADR-0109: Each external format is a small converter that returns a loss report; no format is promised to round-trip until a test says so

Status: proposed, 2026-10-27. Author: project-data-model seat.
Upstream: BRIEF 8.4 ("Document fidelity losses and unsupported features. Never promise seamless interchange without testing it."), 17; R-051, R-134; F-090, F-091, F-160, F-210, F-211; J-11, J-12. Spec: PROJECT_DATA_MODEL 12.2.

## Problem

People bring sketches and circuits from elsewhere and want to take work to a bench or to other tools. Every outside format models less, or differently, than the project document. Claiming "import from X" without saying what is lost would be dishonest and, for a hardware tool, could lead to a wrong physical build.

## Constraints

1. Fidelity losses are documented per format (BRIEF 8.4).
2. No format is claimed until a round-trip or open-in-the-real-tool test passes.
3. Licences of formats and any bundled libraries are checked first (BRIEF 9.2 licensing; D-017).
4. The exporter must not hide risk: a firmware export from a tier-1 model carries a banner (F-090).
5. Imports are untrusted input (ADR-0110).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. One converter per format with `export` and `import` returning `{bytes or project, loss[]}` | Small, testable | Chosen |
| B. A universal intermediate format for all conversions | One abstraction | Rejected: the project document already is the hub; a second hub adds a lossy hop |
| C. Native import only | Smallest | Rejected: sketches, BOMs and netlists are the first things people need |
| D. Wide interchange promise (KiCad, Eagle, Fritzing, Wokwi) | Marketing | Rejected: unverifiable, licence unknown, and "never promise seamless interchange" |

## Decision

1. Converters share one interface and one loss record `{code, severity, path?, message}` (`$defs/LossItem`). The person sees the list before saving an import or after an export.
2. Loss codes are written to `exports[].loss` and `provenance.origin.loss` so the document remembers what was lost.
3. Phases: lossless first (`.iynk`, `.iynkz`), then text (sketch, MicroPython, Python, Verilog and constraints, BOM CSV, netlist text, SVG and PDF diagrams), then EDA (KiCad netlist, SPICE netlist), then third-party diagrams (Wokwi `diagram.json`) only after a licence check, then domain formats (URDF, firmware binaries).
4. Each format has an acceptance test named in PROJECT_DATA_MODEL 12.2. The table in that file is design intent (HYPOTHESIS) until the test passes, and the row's status changes only then.
5. No converter copies part definitions from another tool.

## Technical justification

- Converters over one hub keep each loss local and visible. Import of connection lists (Wokwi, KiCad) maps cleanly onto nets by union-find, which is the same algorithm as catalogue conversion (ADR-0108).
- Putting loss on the document keeps a later reader honest about where a project came from.
- The text formats are mostly file copy plus naming rules; the risky ones (KiCad, SPICE) are small and testable against the real tools.

## Performance data

None measured; no converter exists. Sizes are small: the examples are 8.9 KB to 32.9 KB canonical. The ngspice comparison data for the SPICE converter exists in RS-08 (20 circuits, VERIFIED there).

## Cost implications

Engineering per format, ESTIMATED: text formats 2 to 4 person-days each; BOM and netlist 1 to 2 days; KiCad netlist 1 to 2 person-weeks including tests (needs KiCad installed, UNKNOWN); SPICE 1 to 2 person-weeks; Wokwi import 1 week plus licence work (UNKNOWN). None has a measurement behind it. No run-time cost.

## Licensing

KiCad (GPL, EXTERNAL) and ngspice: reading and writing their text formats does not need their code, but this must be checked before building (UNKNOWN). Wokwi: file format and any part data licence UNKNOWN, so no code until checked. `arduino-cli` is GPL-3.0 (RS-03 report); it is called as a separate tool by the compile service, not linked (RS-17 pending). URDF and Verilog are open formats. A zip library for `.iynkz` is not chosen (ADR-0106).

## Security implications

Every import runs in a worker, with size, depth, entry and path limits, and the result goes through V2 to V5 before it is shown. Exported files are scanned for secret-shaped strings. A path in a source or asset is never used as a filesystem path without a sandbox check. Exporting firmware from a simulation must carry the fidelity banner so a person does not treat a teaching-model result as validated (D-007).

## Reversibility

High. Each converter is independent; removing one changes nothing else. Loss codes are open strings.

## Migration plan

1. CORE: `.iynk` and `.iynkz` with tests.
2. EXPORT phase: sketch folder, BOM, netlist text, SVG; then KiCad and SPICE with their real-tool tests.
3. Decide Wokwi after the licence check; if the answer is no, remove it from the list.
4. Add each format to the user-visible list only when its test passes.

## Known limitations

- Nothing in this ADR has been built or tested.
- A sketch has no wiring, so an imported sketch gives code without a circuit; the person wires it afterwards.
- Footprints and board layout do not exist in the model, so KiCad round trips will always lose them.
- Library versions are not pinned inside a sketch; the exporter lists them but cannot guarantee a compile.
- Interpreter coverage of arbitrary imported sketches is UNKNOWN (the 50-sketch test, F-091).
