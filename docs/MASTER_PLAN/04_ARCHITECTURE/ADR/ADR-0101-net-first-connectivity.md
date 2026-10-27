# ADR-0101: Nets are the electrical truth; wires and breadboard holes are layout

Status: proposed, 2026-10-27. Author: project-data-model seat.
Upstream: BRIEF 8.3 ("A visual position must not be confused with an electrical connection. A rendered cable must correspond to an explicitly modeled connection."); audit A5, change D2; R-031; F-078, F-080, F-081. Spec: PROJECT_DATA_MODEL 5.6 and 5.7.

## Problem

Today connectivity is a by-product of the drawing. `netlist()` in `figures/engine/bench-solve.js:44-60` unions breadboard strips, rails, header pins and part legs from the figure's `c.parts` and `c.wires`. A typo in a hole name gives a null end and the wire is silently skipped (`bench-solve.js:41-42`, `:55`, VERIFIED, audit A5). The interpreter has no concept of connections at all, so with `LED_PIN = 12` the sketch drives D12 while the figure's LED stays dark and the page says "LED1: not connected" (BROWSER_WALK step 15, VERIFIED). A project editor needs one place that says what is connected, with drawings that cannot contradict it.

## Constraints

1. BRIEF 8.3: position is not connection; a drawn cable must correspond to a modelled connection.
2. Three or more views of one circuit (schematic, breadboard, board) must agree (R-031 acceptance).
3. Ids that checks, faults, room ops and AI proposals point at must survive edits.
4. Breadboards conduct by position, so the model must catch two nets sharing a strip.
5. Operations must be validated in one place (ADR-0104).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Wire-first | Store wires between pins; derive nets by union-find (the R-031 draft; Fritzing and Wokwi style) | Rejected: derived net ids change when pins join; a wire is both drawing and truth, so deleting a drawn line silently disconnects; several views cannot each own wires |
| B. Net-first | Store nets as pin sets with stable ids; wires reference a net and pins that are members of it | Chosen |
| C. Edge list | Store pin-to-pin connections, derive nets as connected components | Rejected as the stored form: no stable net identity, no net names, same id problem as A. It is the right shape for import (Wokwi `connections`, KiCad) and the converter maps it to B |
| D. Hole-level nets | Put every breadboard hole into the nets so strips are explicit | Rejected: 300 to 830 members per board with no meaning beyond the strip, ties the netlist to one layout, pollutes schematic views |

## Decision

Option B. `nets[]` lists pin addresses `{c, p}`; a pin is in at most one net. Only net membership, part-internal groups (from the part descriptor) and closed switches join pins. A wire has a `net` and ends that are member pins, junctions on the same net or holes on the view's breadboard surface. A wire adds no member; removing a wire never changes a net; cutting a connection is a net op (`net.disconnect`, `net.split`). Breadboard strips come from the surface descriptor; legs in holes are layout, and a strip that holds two nets is the error `V3-STRIP-SHORT`. Rules N1 to N10, W1 to W8, B1 to B6 are in PROJECT_DATA_MODEL 5.6 and 5.7.

## Technical justification

- Every consumer reads `nets` and nothing in `views` (rule N7): solver, interpreter pin adapter, checks, electrical rules check (F-028), AI.
- Net ids are stable, so `node-voltage` checks, faults and room ops stay valid when pins join or leave.
- Dangling references are impossible by construction (cascading ops) and checkable (V3).
- The prototype converter turned the `button` lesson (4 parts, 5 wires on a half breadboard) into 5 nets with no hole in any of them, matching a hand check (VERIFIED, PROJECT_DATA_MODEL 11.4). The prototype validator rejected a wire whose end is not in its net, two nets on one strip, a pin in two nets and a pin that does not exist (VERIFIED, 4 of 12 broken variants).
- The model fits what already exists: the figure engine's union-find becomes the converter's net extraction, so the 57 lessons with circuits can be converted by the same algorithm.

## Performance data

Validation of nets and wires is linear. Whole-document V2 validation measured 0.63 ms and parse 1.29 ms at 500 components, 1,000 nets and 1,000 wires; 2.14 ms at 2,000 components and 5,000 nets (VERIFIED, scratch bench). The original `solve` took 0.04 ms per DC solve (audit D2, VERIFIED). Incremental batch-end checks have not been implemented or timed (UNKNOWN).

## Cost implications

No runtime cost. Engineering: more ops per user gesture (a new wire is `net.create` or `net.connect` or `net.merge` plus `wire.add`), a cut-wire gesture needs a graph walk to decide `net.split`, and the editor must draw air wires (ratsnest) for undrawn connections. ESTIMATED 1 to 2 person-weeks on top of the editor core for the net ops and their inverses (assumes ADR-0104 exists).

## Licensing

None involved. Nothing is copied from Fritzing, KiCad or Wokwi. Import from their files is a separate converter with its own licence check (ADR-0109).

## Security implications

A closed set of reference rules makes malformed or hostile documents detectable before use. A room member with edit rights can still make a valid but unwanted change; permissions and review are the control (ADR-0104).

## Reversibility

High. Nets can be exported as an edge list at any time, and a wire-first view can be generated from nets ("route all"). Reverting to wire-first would mean deriving nets again and breaking stable net ids, which is the reason not to.

## Migration plan

1. Converter builds nets from the figure circuits (union-find over strips and legs), then records holes as layout (PROJECT_DATA_MODEL 11.4).
2. The interpreter pin adapter reads `nets` (F-047); until then `WorldInput.pins` carries board pins (kept as a bridge).
3. The editor writes batches (PROJECT_DATA_MODEL 7.3) so placement and connection change together.
4. R-031 text changes from "built from wires" to "stored nets with stable ids" (Objection O-1).

## Known limitations

- Not exercised by RS-09: its test document had wires between part pins and no nets. Net ops, cascades and batches need adding to the property test (REF-4) before collaboration relies on them. HYPOTHESIS that they converge.
- A user who thinks in wires ("delete this wire") gets two meanings: erase the drawing, or cut the connection. The default (cut) is a UX choice not yet tested with a person.
- The model does not describe analogue effects of long wires or contact resistance. A wire is ideal.
- `internal-short` groups come from descriptors; a wrong descriptor makes wrong nets. Descriptor tests (component spec) are the guard.
