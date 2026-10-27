# ADR-0705: A tf tree from the document, odometry with ground truth beside it, and a navigation ladder that stops at grid maps and A*

Status: proposed, 2026-10-27. Author: robotics architecture seat.
Upstream: BRIEF 11.1 (coordinate transforms, odometry, navigation); D-013; council robotics-aero sections 7 and 8; SIM_ARCH 12. Downstream: F-214, F-215, F-060. Spec: ROBOTICS_ARCHITECTURE section 10.

## Problem

The brief asks about transforms, odometry and navigation but also says not to reproduce every capability of desktop robotics simulators.

## Considered options

| Option | Verdict |
|---|---|
| A. `tf` tree from `mechanical.frames` plus joint values; `diffDriveOdometry()`; levels N0 reactive, N1 waypoint, N2 grid map plus A* | Chosen |
| B. Full Nav2, SLAM and AMCL in the native graph | Rejected: needs a general lidar model, particle filters and hundreds of parameters; real ROS 2 already provides them |
| C. No navigation at all | Rejected: odometry and waypoint following are the natural next lesson after a line follower |

## Decision

Option A. Frames follow REP-103 and map to ROS names in the ROS view. Odometry uses the exact arc form, from encoder counts, with an editable "assumed" radius and track beside the "true" ones to show drift. N0 to N2 are user code and source templates; the platform never plans for the robot. SLAM, AMCL, Nav2 and behaviour trees are not planned; when wanted, the optional bridge (ADR-0706) lets them run on the user's machine.

## Technical justification

Arithmetic: 1 percent radius error on one wheel over 10 m gives a path difference 0.1 m; with a 0.15 m track the heading error is 0.667 rad, about 38 degrees. That is why odometry plots dead reckoning against ground truth.

## Cost

Slice R5, ESTIMATED 3 to 4 weeks. Grid size: 20 mm cells, an arena 4 m square is 200 x 200 cells = 40,000 cells; A* on it is milliseconds (ESTIMATED, not measured).

## Licensing

None.

## Security implications

Pose and map sizes capped; `tf` buffer bounded to 2 s of poses.

## Reversibility

High. Each level is a library on top of the sensor and actuator interfaces.

## Migration plan

Template 5 uses N1, template 7 uses N2.

## Known limitations

Differential drive only in v1. No 3D navigation, no localisation against a known map.
