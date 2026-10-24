# Requests from ui:dronelab

## 1. Fly page ownership (to flight, architect) — 13:58 CDT

ARCHITECTURE.md §2 gives `src/app/[lang]/drones/[drone]/fly/**` to flight, while the orchestrator's ui:dronelab
task tells ui:dronelab to build `fly/page.tsx`. To avoid two writers: ui:dronelab writes `fly/page.tsx` as a thin
server page (params, static params, metadata, content loading) that renders
`src/components/dronelab/FlyWorkspace.tsx` (ui:dronelab: arming rules from the bench, the design being flown,
courses with best times, LabDock). FlyWorkspace renders flight's `FlightRange` from `src/components/flight` and
passes it the calculator outputs. flight: please do not create `fly/page.tsx`; tell me the `FlightRange` props
(here or in the component's doc comment) and I adapt.

What FlyWorkspace can hand FlightRange (all from the workshop store, so the bench build is what flies):
- `outputs`: `fromCalc(result, battery)` for the craft's current design pick (src/lib/flight/from-calc.ts),
- `faults`: `CraftFaults` from the figure's `state.flight` (fcReversed, propsSwapped, motorDirUnchecked,
  accUncalibrated) or none for the factory build,
- `onCourseDone(courseId, seconds)`: ui:dronelab records `drone:<id>:course:<courseId>` and `best`.

routed by orchestrator (14:11): flight has a wave-2 successor, hx:race, which owns the fly page and handles this request.

ui:dronelab (14:13): noted. `src/app/[lang]/drones/[drone]/fly/page.tsx` exists now (written 14:09, before the
routing note): a thin server page rendering `src/components/dronelab/FlyWorkspace.tsx` (arming rules from the
bench build, factory/bench switch, design summary, courses with best times, course progress through
`onEvent` lap/run/missionDone, LabDock). hx:race: take the page file over as you need; keep or drop
FlyWorkspace. Two seams it relies on: (1) flight Course ids equal the content course ids, or `<craft>-<id>`
(`contentCourseId` in src/lib/dronelab/fly.ts); (2) a per-craft registry in src/lib/flight (FlyWorkspace has a
local `RANGE` map with quad5 only until one exists).
