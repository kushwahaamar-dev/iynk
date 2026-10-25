# P2-flight to every drone content owner (wave A and wave B): how a craft flies

Written 2026-10-24 by P2-flight for P2-drone-prose, P2-drones-fpv, and in wave B P2-drones-heavy, P2-drones-vtol and
P2-fun. Nothing to do in `src/lib/flight` for a new craft: the fly page flies whatever the content module holds.

## How it works

- `src/lib/flight/registry.ts` (`flightOf(content)`) builds the range's craft from `content.flight` and one range
  course per `content.courses` entry, with the same id. There is no `src/lib/flight/crafts/` or `courses/` any more.
- `flight.params` names it reads (all optional, defaults in the registry): every craft `drag ceiling hitRadius
  angleLimit acroRate yawRate levelRate climbRate spool camTilt fov loiterSpeed rtlAlt fpvProps`; fixed-wing
  `vstall vmin cd launchSpeed bankLimit pitchLimit rollRate pitchRate loiterRadius`; quadplane the wing's plus
  `transitionS hoverMotors`; tricopter `tailMaxDeg tailRateDegS`; swarm `swarmCount swarmSpacing`. Other names are
  ignored by the sim (fine for CLI-only numbers).
- `flight.look` (optional) overrides how the craft is drawn; otherwise arms, prop size and body come from `frame` and
  the default prop's label.
- Modes: `kind` picks the behaviour; `attitude`, `expo`, `angleLimit`, `rateScale` override it per mode. `mission`
  names a sim task (`gps-rescue`, `rtl`, `rth`, `wing-rth`, `qrtl`, `figure8`, `swarm`, `motorfail`, `yawdemo`,
  `transition`) or, on an `auto`/`mission` mode, the id of a mission course (the course's `mission`, else its id).
- Courses: `kind` decides what scores, in every flight mode: laps through `gates`, a timed run through `checkpoints`
  (goals in order), `missionDone` on a `mission` (goals in order). A goal with `land: true` counts only on a slow
  touchdown inside it; `hold`, `action` (`photo`, `drop`, `spray-on`, `spray-off`, `land`) and `speed` shape the
  AUTO mission. `ceiling`, `ground` and `wind` are per course.
- Medals: give each gates or checkpoints course `par: { gold, silver, bronze }` (seconds, gold fastest), or `parS`
  alone (it is silver; gold and bronze are derived). The fly page shows them and names the medal on each finish.

## What the tests check (src/lib/flight/flight.test.ts runs on every content module in src/content/drones)

1. Every number in `flight.params` that the range uses reaches the craft unchanged.
2. Every course has an autopilot demo route, and the demo flies it to the end (a lap, a run or the mission) on the
   craft's default design without a crash. A course the demo cannot fly is a course a learner cannot fly: move the
   goal or the obstacle, don't loosen the test. Ask here if a course needs something the planner can't do.
3. Every gates or checkpoints course has medal times in order.
4. A mission course flown by the craft's own AUTO mode reaches every goal.

`e2e/fly.spec.ts` then opens `/en/drones/<id>/fly` for all 13 crafts (skipping one whose content or English prose has
not landed), runs the demo and waits for the first gate or checkpoint.

## Open items for content owners

- P2-drone-prose: `src/content/drones/whoop.ts` line 535 still says the numbers go to
  `src/lib/flight/crafts/whoop.ts`; they are read from the content now (registry.ts). `wing` has no English prose
  yet, so `/en/drones/wing/fly` is a 404 and its e2e is skipped. `longrange/rescue` has no medal times (optional
  on a mission).
- P2-drones-fpv: `delivery` has no content module yet, so its fly page and e2e wait for it.
