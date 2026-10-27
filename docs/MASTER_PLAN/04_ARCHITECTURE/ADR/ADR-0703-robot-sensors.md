# ADR-0703: Robot sensors read the physics world through five query types

Status: proposed, 2026-10-27. Author: robotics architecture seat.
Upstream: BRIEF 11.1 (sensor noise); D-007; SIM_ARCH 12.2, 6.5; F-209; R-168. Downstream: F-213, F-214, F-209. Spec: ROBOTICS_ARCHITECTURE section 8.

## Problem

Robot sensors today are world knobs (a number the lesson sets). A robot needs readings that depend on where the sensor is and what is near it.

## Considered options

| Option | Verdict |
|---|---|
| A. Five queries on the engine state: `ray-fan`, `surface-sample`, `contact`, `joint`, `body-rates`, each feeding the existing `SensorModel` transfer function | Chosen |
| B. Use engine raycasts for line sensing too | Rejected: the floor is a flat surface with painted tracks; a 9-point sample of the track polyline buffer is cheaper and deterministic |
| C. Cameras and lidar now | Rejected for v1: a 2D lidar is a 360-ray fan and is possible later; no demand or budget figure |

## Decision

Each sensor binding names a component, a mount and a query. Rays cast against the physics colliders; surface samples read the arena (tracks over a base surface) at 9 points per footprint; contact reads `contacts()`; encoder and IMU read joint and body state. Noise comes from stream `sensor:<component id>`; each sensor has `period_ns` and `latency_ns`; between samples output holds. Ultrasonic echo timing uses `2 d / c` of virtual time. All sensors are T1. Instruments show ground truth beside the reading with its provenance tag.

## Technical justification

The line sensor, ranger and IMU models already exist as register or timing models (SIM_ARCH 12.2 table: `qtrDarkness`, 58.3 us/cm, `round(accel_g * 16384)`); this ADR replaces only their input.

## Cost

Slice R3, ESTIMATED 2 to 3 weeks. Per tick cost: rays are `n_rays` engine queries per sensor sample, not per step (UNKNOWN until RA-07).

## Licensing

None.

## Security implications

Sensor parameters are range-checked; ray counts capped (360 per sensor, 2,000 per project per tick, HYPOTHESIS).

## Reversibility

High. A query type can be added or replaced without changing the document, because `SensorBinding` names the query.

## Migration plan

Existing bench sensors keep their world knobs; robot templates use bindings. A bench opened in a robot project gains a binding in place of the knob.

## Known limitations

Descriptor numbers (beam angles, noise, optimum height) are unsourced (RK-5). The 9-point footprint is an approximation. Texture, ambient light, cross-talk and multipath are not modelled.
