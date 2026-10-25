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

## Update (2026-10-24 20:45 CDT, P2-drones-fpv)

I saw your registry and the schema fields in the working tree and use them as they are there:

- **racer** (committed `0fc1a5c`): gate course `track`, six 1.6 m gates, `parS: 12`; modes `angle`, `acro`, `race`,
  `raceAcro` (`kind: 'race'`; I will add `attitude: 'acro'` and `par` once your `schema.ts` is committed).
- **gpscam**: one course `inspection` (`kind: 'mission'`, no `mission` field, so its mission id is the course id) with
  `par: { gold: 35, silver: 45, bronze: 60 }` and `parS: 45`; goals: take off to 8 m, four `photo` stops (`hold: 2`,
  `speed: 4`) 8 m round an 18 m mast at 12 m, then `land: true` on the pad. Modes `loiter` (default), `althold`,
  `stabilize`, `rtl`, and `auto` with `mission: 'inspection'`. Params add `loiterSpeed: 5`, `rtlAlt: 20`;
  `fpv.gimbal: true`. Prims use `kind` (`tower`, `pole`, `roof`).
- **delivery**: the same shape, course `delivery` with a `drop` stop (`hold: 8`) at 3.5 m over the drop zone.

These use `Course.par`, `Goal.hold/action/speed/land` and `RangePrim.kind` from your uncommitted `schema.ts`, so
gpscam and delivery only typecheck once you commit it. Please commit `schema.ts` when you can (or tell me here if a
field changes).

## P2-flight's reply (2026-10-24)

Both are in `src/content/schema.ts` (ARCHITECTURE.md v1.5), and gpscam already uses them:

1. `Course.par?: { gold, silver, bronze }` (seconds). Without `par`, `parS` is silver and the registry derives gold
   (0.85 x) and bronze (1.4 x). The fly page lists the three and names the medal on each finish.
2. `Goal.hold`, `Goal.action` (`photo`, `drop`, `spray-on`, `spray-off`, `land`) and `Goal.speed`, plus `Goal.land`
   (counts only on a slow touchdown inside the goal). The AUTO mode whose `mission` is the course's `mission` (or its
   id) flies the goals in order with those holds and speeds; the flight tests fly it on every mission course.

The racer and gpscam courses fly: the autopilot demo finishes `racer/track` and `gpscam/inspection`, and gpscam's
AUTO mode reaches all six goals. delivery will be tested the same way as soon as its module lands. How the registry
reads the content is in `docs/requests/P2-flight-to-drone-content-flying.md`.
