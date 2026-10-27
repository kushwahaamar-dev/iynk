# ADR-0808: Edits during a run: every op kind has one class; circuit and program changes mark the run stale; layout changes do not

Status: proposed, 2026-10-27; decided for the first Studio phase. Author: Studio editor design seat.
Upstream: SA 17.2 (worker protocol); PDM 7.2; audit D5. Downstream: F-101, F-121; STU-17, STU-32. Spec: `03_PRODUCT/STUDIO_EDITOR.md`, STUDIO_EDITOR section 11.4.

## Problem

A run loads a netlist and a program at start. If the person edits during the run, the run no longer matches the document. A hot patch of every change is a large solver feature; stopping the run on any edit is hostile.

## Constraints

1. The class of every op kind must be defined, including kinds added later.
2. A world input slider is not an op and must work live.
3. Layout edits must never restart the run.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| Hot patch every change | Apply deltas to the running solver | Rejected for now: a solver feature with no spike behind it |
| Stop the run on any edit | Any op ends the run | Rejected: moving a part would kill a simulation |
| Class each op kind; mark the run stale on circuit, program or run-config changes and offer Restart | Table of 55 op kinds in five classes, a refinement predicate, a CI test that enumerates `$defs/Op` | **Chosen** |

## Decision

Each op kind of `project.schema.json` is in exactly one class: layout only, changes the circuit, changes the program, changes the run, or tests. The class of a batch is the highest class of its ops. A stale run shows "The design changed since this run began. Restart?" with Restart; "Restart automatically after a change" is off by default. `opClass.test.ts` fails on an unclassified, duplicated or unknown kind.

## Technical justification

- A table checked against the schema makes the unclassified-kind bug a build failure.
- It leaves hot apply of parameters as a later SIM decision (Q-S2) without changing the table.

## Performance data

Classing a batch is a table lookup per op, negligible. No measurement taken.

## Cost implications

Engineering only.

## Licensing

No new dependency.

## Security implications

The class affects the run only; permissions are unchanged. A buddy's circuit edit marks everyone's runs stale, which is intended and visible.

## Reversibility

High. Classes are data; hot apply can later move a kind from "circuit" to a new "hot" class.

## Migration plan

Write `opClass.ts` and the schema enumeration test with the first run client; add STU-17 and STU-32.

## Known limitations

- Every edit to a resistor value needs a Restart in the first phase.
- New op kinds added by PDM minor versions fail the build until classed; that is the intent.
