# ADR-0802: Tools are pure functions from document and gesture to a batch of ops; net operations come from helper functions

Status: proposed, 2026-10-27. Author: Studio editor design seat.
Upstream: audit A5, D5; PDM N1 to N10, W1 to W8, 7.3; ADR-0101, ADR-0104. Downstream: F-077, F-081 to F-084; STU-04, STU-06, STU-10, STU-11. Spec: `03_PRODUCT/STUDIO_EDITOR.md`, STUDIO_EDITOR sections 6.4 to 6.7.

## Problem

Today the netlist is a by-product of the drawing and a typo in a hole name silently drops a wire (`figures/engine/bench-solve.js:41-42`, VERIFIED). The editor must never store wires as truth.

## Constraints

1. The only change path is `apply(state, op)` (ADR-0104).
2. A gesture is one undo entry, so it must be one batch.
3. Tools must be testable without a DOM.
4. A property test must be able to compare the result with an independent connectivity oracle.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| Tools mutate state directly | Each tool edits a store | Rejected: breaks the single change path and undo |
| Wires stored as truth, nets derived | The current Board Lab model | Rejected: audit A5 |
| Pure tool functions returning op batches; helpers `wireRecipe`, `reconcileStrips`, `cutAnalysis` compute net ops from the document | Tools read the document and a gesture and return ops | **Chosen** |

## Decision

Every tool is `(doc, gesture) => Batch`. Net ops are computed by three pure helpers: `wireRecipe` (which of `net.create`, `net.connect`, `net.merge` a new wire needs), `reconcileStrips` (net changes caused by legs entering or leaving breadboard strips) and `cutAnalysis` (what deleting a wire splits). A move is `view.place` only and never changes `nets` (PDM N6).

## Technical justification

- Pure functions are cheap to test; STU-10 runs 200 random gestures and checks V3 and a union-find oracle.
- RS-09 showed that rejecting invalid ops at apply time, not merging them, is the safe behaviour.

## Performance data

Not measured. Helpers work on the net of the touched pins, not the whole document; ESTIMATED to be small against a 500-part, 1,000-wire document that parses in 1.29 ms and validates in 0.63 ms (VERIFIED, ADR-0100, Apple M4 Pro).

## Cost implications

Engineering only, inside the STUDIO phase.

## Licensing

No new dependency.

## Security implications

Tools cannot bypass apply, so every limit and permission check in PDM 9.4 and 13 applies to editor gestures as to AI and room ops.

## Reversibility

High. Tools are replaceable one by one; the op vocabulary is the contract.

## Migration plan

Port the Board Lab wiring into `wireRecipe` first, run the 140 converted projects through it, then retire the old solver wiring code after parity.

## Known limitations

- A new connection rule needs a new helper branch and a test.
- Delete with `referenced_by` needs a multi-op batch with `test.set` (section 6.4).
