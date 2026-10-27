# ADR-0707: Seven robot templates, finished one at a time, reusing the electronics benches

Status: proposed, 2026-10-27. Author: robotics architecture seat.
Upstream: BRIEF 11.2; D-007, D-014; FEATURE_PRIORITIZATION classes for F-060, F-215 (LATER); council robotics-aero W1; R-166, R-169. Downstream: F-060, F-215, F-057, F-058. Spec: ROBOTICS_ARCHITECTURE section 15.

## Problem

The brief says depth and correct behaviour over many shallow templates. The existing 13 benches teach electronics, not robots.

## Considered options

| Option | Verdict |
|---|---|
| A. A ladder of seven, each with a finish definition | Chosen |
| B. Many templates quickly | Rejected: the brief says no |
| C. Only a line follower | Rejected: it leaves odometry, arms and ROS-like graphs without an example |

## Decision

Order: (1) drive base open loop, (2) speed control with encoders, (3) line follower, (4) obstacle avoider, (5) differential-drive rover with odometry, (6) planar arm, (7) sensor-guided vehicle or maze, with a ROS-like variant. A template is finished only with: project file, wiring, code, arena, a hash test (RA-02 style), at least five faults from the cause list, passing checks, a "what it models" panel, a lesson path with the diagnosis flow, and a reference run. The benches supply parts and staged builds. Not scheduled: mecanum, tracked, legged, balancing (named first extension).

## Technical justification

Each template adds exactly one capability: motors and wheels (1), encoders and PID (2), surface sensing (3), ray sensing (4), tf and odometry (5), kinematics (6), grid map and graph (7). F-215 is classed LATER in the prioritization because it follows the builder; the ladder is how it is delivered.

## Cost

Template authoring is part of slices R4 to R7 (ESTIMATED in the spec). Each template also costs six translations of its text unless Amar limits languages (CTO memo, catalogue F-104 note).

## Licensing

Template text and code are written new; D-017 applies to anything adapted from the three third-party sites (provenance review state `unchecked` until cleared).

## Security implications

None beyond the project document rules.

## Reversibility

High. Templates are projects; they can be dropped or reordered.

## Migration plan

Template 1 is the R1 acceptance case; each later template is added at the end of its slice.

## Known limitations

Class and effort for F-215 are the catalogue's; this ADR changes neither.
