# ADR-0701: A robot is a Studio project; its physics data lives in `domains.robotics.data`

Status: proposed, 2026-10-27. Author: robotics architecture seat.
Upstream: BRIEF 8.3, 11.1; D-010, D-014; ADR-0100, ADR-0104, ADR-0107; PROJECT_DATA_MODEL 5.8, 5.14, 7.2; COMPONENT_SCHEMA 10. Downstream: F-213, F-215, F-060; R-164. Spec: ROBOTICS_ARCHITECTURE sections 2, 4.

## Problem

`mechanical` holds frames, bodies, joints and mounts, but not friction, damping, colliders, wheel data, surfaces, an arena or sensor queries, and its joint limits have no units. `domain.set` replaces a whole domain, so two buddies cannot edit one robot together.

## Considered options

| Option | Verdict |
|---|---|
| A. Keep `mechanical` as is; put the rest in `domains.robotics.data`; propose small schema fixes | Chosen |
| B. Grow `mechanical` with every robot field | Rejected: the core document would carry robot-only fields in every project (PDM 2.2) |
| C. A separate robot file | Rejected: two files, two hashes, two op logs (ADR-0100) |
| D. Store robot data as an extension in `ext` | Rejected: `ext` is unvalidated by the core and the robotics spec owns this data (PDM 5.14) |

## Decision

Robot = a project with a `mechanical` section whose joints form a tree over bodies, plus `domains.robotics.data` (schemaVersion 1.0) with `physics`, `surfaces`, per-body and per-joint extras, `wheels`, `sensors`, `arena`, `ros`. Part physics comes from part descriptors (a `mechanics` block, section 6.1 of the spec). Edits use `domain.patch` (to be added in opSchema 1.1). The validator rules RB-E-* and RB-W-* run with the core V3 rules. Requested schema minor 1.1: unit meaning for joint limits by kind, `effort` rename, `Body.inertia_g_mm2` and `com_mm`, `domain.patch`.

## Technical justification

Checked against `project.schema.json`: `Joint.limits {min, max, effort_n, velocity}` has no units; `Body` has `mass_g` and one `shape`; kinds are `fixed revolute continuous prismatic wheel`. URDF has `planar` and `floating`; those become import loss items. The tree rule (one root body) is what URDF and the engine both need.

## Cost

Schema and validator work ESTIMATED 2 to 3 weeks (slice R1). No hosting cost.

## Licensing

None added.

## Security implications

All numbers range-checked; ids in the domain must exist in `mechanical`; limits per project; `__proto__`, `constructor`, `prototype` keys are refused by V5 (PDM 13).

## Reversibility

Medium to high. The domain has its own `schemaVersion` and migration chain (PDM 10). Moving a field into the core later is a minor bump with a migration.

## Migration plan

1. Land the types and validator. 2. Land `domain.patch`. 3. Converter for the 13 benches keeps `domains.robotics` absent (they are electronics projects). 4. Robot templates are authored as projects.

## Known limitations

Until schema 1.1 exists the units rule is a convention enforced by the robot validator. The 64 body, 32 joint limits are HYPOTHESIS until RA-07.
