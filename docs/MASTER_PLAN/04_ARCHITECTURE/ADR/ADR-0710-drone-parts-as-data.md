# ADR-0710: Drone parts are data in descriptors; the legacy calculator remains only for the 13 migrated crafts

Status: proposed, 2026-10-27. Author: drone architecture seat.
Upstream: BRIEF 12; D-010, D-013, D-017; drone-calc-lab.md "Reusability" and defects 1 to 8; COMPONENT_SCHEMA 4.6, 10; B3-03; R-172, R-173, R-148. Downstream: F-064, F-073, F-216, F-156, F-197. Spec: DRONE_ARCHITECTURE sections 3, 5, 6.1, 6.5.

## Problem

`designInput` throws on any pick outside a 3 x 3 x 3 list; the 13 calculator models are 13 regressions with per-craft scalars (`k`, `pf`, `gPerW`, `flyFactor`) copied from a third-party site; there is no input validation; the 342 golden rows prove copy fidelity, not physics.

## Considered options

| Option | Verdict |
|---|---|
| A. Part descriptors with a `mechanics` block; `legacy-calc@1` kept for the 13 crafts; one thrust source per craft | Chosen |
| B. Extend the dropdown lists | Rejected: no principled `k` for a new motor |
| C. Delete the legacy calculator now | Rejected: BRIEF 3.5; R-148 needs the golden rows during LABS |
| D. Mix sources per craft | Rejected: a hover test could pass while the rigid model flies another thrust (Objection 3) |

## Decision

Motor, propeller, ESC, battery, frame and flight-controller data live in descriptors (fields in spec 6.1, each with the three rating slots and sources). A craft has `thrustSource: 'legacy-calc' | 'parts'`; replacing one legacy part flips the whole craft with a visible message. `calc` gets input guards and typed errors regardless. The optimiser takes component ids.

## Technical justification

The legacy `CalcInput` is already data and `calc` has no UI dependency (drone-calc-lab), so it can be called as `legacy-calc@1` without change. The golden rows and their provenance are a publish gate (F-197).

## Cost

Slice D1: 5 to 7 weeks, ESTIMATED. Data entry for the first 10 motors and 10 propellers is not included in that figure and depends on licensable data (UNKNOWN).

## Licensing

Part data must be redistributable or typed by the user from a datasheet; each row carries source and licence. The legacy constants' licence is UNKNOWN until reviewed.

## Security implications

All numbers range-checked at the descriptor boundary; `Object.hasOwn` pattern kept for any key lookup (the present MCP tool already does it).

## Reversibility

High. `legacy-calc` stays selectable until every craft has part data reproducing its values within a stated tolerance.

## Migration plan

D0 guards; LABS converts crafts; D1 adds parts; D2 flies user builds on the game model.

## Known limitations

Real accuracy against hardware is unknown (DK-1). Open data availability unknown (DK-2).
