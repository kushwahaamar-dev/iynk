# ADR-0706: A native ROS-like graph, URDF import and export for a stated subset, and a real ROS 2 bridge only as an optional local helper

Status: proposed, 2026-10-27. Author: robotics architecture seat.
Upstream: BRIEF 11.1 (robot description formats, ROS 2 compatibility, URDF/SDF import, interoperability versus native); D-015, D-017; TECHNICAL_RESEARCH D6; platform-options rows for rosbridge, roslib, Foxglove SDK, urdf-loader; ADR-0109; R-146, R-171. Downstream: F-059, F-062. Spec: ROBOTICS_ARCHITECTURE sections 11, 12.

## Problem

ROS 2 uses DDS and Python or C++ client libraries that cannot run in a browser. People still want the vocabulary, URDF files, and sometimes real nodes.

## Considered options

| Option | Verdict |
|---|---|
| A. Native TypeScript graph on the simulation clock, `rclpy`-shaped Python API, `ros2` terminal emulation, labelled "ROS-like" | Chosen for the first release |
| B. Local helper speaking rosbridge v2 (BSD) to a real ROS 2 install | Chosen as a late, optional slice, on a stated need |
| C. `rclpy` or DDS in the browser | Rejected: not possible |
| D. micro-ROS on the simulated MCU | Rejected: needs real firmware and a transport |
| URDF: import and export subset | Chosen |
| SDF: import subset, later | Chosen as later; value is Gazebo worlds iynk does not run |

## Decision

The graph has nodes, topics, publishers, subscriptions, timers, services and parameters on the orchestrator clock; callbacks run at P2 in registration order; a typed message subset; QoS limited to reliable or best-effort and keep-last depth, others reported as not modelled. URDF maps links to bodies, joints to joints, inertials with unit conversion, boxes, cylinders, spheres and STL or OBJ meshes; planar and floating joints, DAE meshes, transmissions and Gazebo tags become loss items; xacro must be expanded first. The helper (if built) is local, allowlisted, size and rate limited, and its runs are tagged not replayable.

## Technical justification

The existing `rclpy` mock publishes only (`src/lib/interp/python/modules.ts:867-1000`, `onRos` at `run.ts:51`), so the extension is incremental. URDF's pose convention equals the document's (PDM 5.8), so export is direct; the unit conversions are `g to kg` and `g mm² to kg m²` (1e-9).

## Cost

Graph: slice R7, 2 to 3 weeks. URDF: slice R8, 2 to 3 weeks. Helper: slice R9, 2 to 3 weeks (ESTIMATED; assumes an open client library for the protocol exists, which the research file reports for roslib).

## Licensing

rosbridge_suite BSD; roslib BSD-2-Clause on npm (GitHub shows no licence file, platform-options); Foxglove SDK MIT; urdf-loader Apache-2.0. Sample URDFs used in tests need a licence check (D-017) and are chosen from permissive sources.

## Security implications

XML parsed in a worker with DTDs and entities disabled, 2 MiB cap, 512 links, depth 64; mesh caps; no `package://` or `file://` fetch; helper allowlist, localhost default, per-message 64 KB and 200 messages per second per topic caps; messages validated against the registry.

## Reversibility

High. The graph is behind a message-bus interface; the bridge is an adapter on the same interface.

## Migration plan

F-059's Pi 5 bench keeps its label "ROS-like" until a real node has joined through the helper.

## Known limitations

No DDS behaviour, no QoS beyond two settings, no actions, no real-time scheduling. Version coverage of the helper moves with ROS releases (RK-10).
