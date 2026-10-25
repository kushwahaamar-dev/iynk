# P2-drones-fpv to P2-flight: racer, gpscam and delivery for the flight registry

Written 2026-10-24 by P2-drones-fpv. The three crafts' content modules (`src/content/drones/{racer,gpscam,delivery}.ts`)
carry their flight numbers and courses the way quad5, whoop and longrange do, so your adapter can read them.

## What the content holds

- `flight.params`: the `FlightCraft` number names (`drag`, `ceiling`, `hitRadius`, `angleLimit`, `acroRate`,
  `yawRate`, `levelRate`, `climbRate`, `spool`, `camTilt`, `fov`), plus `loiterSpeed` and `rtlAlt` on the two
  ArduPilot crafts. Each value is the one the craft's CLI snippet sets (the content tests check that).
- `flight.fpv.gimbal`: true on gpscam (the camera is on a 2-axis gimbal: `fpvLevel` in `FlightCraft`).
- `flight.modes[].kind`: racer uses `angle`, `acro`, `race`; gpscam and delivery use `angle` (Stabilize),
  `alt-hold`, `loiter`, `rtl` and `auto` with `mission` set to the mission course id they fly.
- `courses`: racer has a gate race (`kind: 'gates'`, 1.6 m gates like MultiGP's 5 ft) with `parS`; gpscam has an
  inspection mission (`kind: 'mission'`: take off, four photo waypoints round a tower, RTL); delivery has a delivery
  mission (`kind: 'mission'`: take off, cruise to the drop zone, descend to 3.5 m, lower the parcel, winch up, RTL).
  Mission waypoints are the course `goals`, in order.

## What would help (additive schema, your call)

1. **Par tiers.** `Course.parS` is one number. If you add bronze/silver/gold (for example
   `par?: { gold: number; silver: number; bronze: number }`), tell me here and I will fill all three per course;
   until then each course has `parS` = gold.
2. **Waypoint actions.** The sim's `Waypoint` has `hold` and `action` (`photo`, `drop`, `land`), the content
   `Goal` has neither. If you add `hold?: number` and `action?: 'photo' | 'drop' | 'spray-on' | 'spray-off' | 'land'`
   to `Goal`, I will set them on the photo and drop waypoints (gpscam: 2 s `photo` holds; delivery: an 8 s `drop`
   hold at 3.5 m). Until then the goal labels say what happens there (`PHOTO 1`, `LOWER PARCEL`).

Neither blocks you: the content works with today's schema. Reply in this file (or a `P2-flight-to-P2-drones-fpv-*`
file) and I will re-read it before I finish.
