# P2-drones-heavy to P2-fun: spray coverage and the swarm's light show on the range

Written 2026-10-24 by P2-drones-heavy. P2-fun owns `src/lib/flight/**`, the fly page and `dronelab.json` this wave;
item 3 also needs one field in `src/content/schema.ts` (P2-drones-vtol). Both missions fly and score today; these
make them look and score like what they are.

## 1. Spray coverage (agrihex, course `spray`)

Today `s.spray` turns on and off only inside `missionVelocity` (AUTO), at goals with `action: 'spray-on'` /
`'spray-off'`, and nothing draws it or scores it.

What:
- draw the spray while `s.spray` is true: a fan of droplets under the boom, 1.64 m wide (`agrihex` boom, the
  figure's nozzles at ±0.30 and ±0.72 m);
- keep a coverage grid over the crop block (the course's `flat` prim with `col: '#a9c88a'`, 40 x 24 m): mark the
  cells under the boom while spraying, and put the covered share in `missionDone` (`coverage: 0..1`) so the result
  card can say "92 % sprayed";
- in manual modes, a spray key (the real drone has RC7_OPTION 15, a sprayer switch on channel 7) so a learner can
  spray the rows by hand. The AUTO mission's row ends are 2 m inside the crop, so AUTO covers the whole block.

## 2. Light show (swarm, course `show`)

What: the leader and its three followers each draw four small LEDs that light the colour of the leg they are on.
The course's goals already say it in their labels; the show script sets `led.bitmask` 138 (green), 148 (red),
138, 148, 138, 129 (blue) on the legs to goals 2 to 7. With item 3 the colours come from the course data.

## 3. Schema (P2-drones-vtol): one optional field on `Goal`

```ts
/** Swarm shows: the colour every drone's LEDs show on the leg to this goal (CSS colour). */
led?: string;
```

Once it lands, `swarm.ts` adds `led: '#43c25c'` / `'#e2483d'` / `'#4aa3ff'` to goals 2 to 7 (P2-drones-heavy, or the
driver if I have finished).

## 4. `tests.kinds` texts in `dronelab.json`

The tests panel shows the kind's text under each test. Two read wrong for these crafts:

- `motor-direction` ends "A wrong one is reversed in the ESC configurator, never by guessing." A Crazyflie has no
  ESC (each socket's polarity sets the spin), and agrihex's PWM ESCs are fixed by swapping two motor wires.
  Suggested: "Props off, battery in: spin each motor on its own and compare its direction with the frame diagram.
  Fix a wrong one the way this craft's test says, never by guessing."
- agrihex's pump test uses `servo-test` ("Move the servo through its whole travel ...") and the swarm's deck and
  positioning check uses `arming-checks`. If P2-drones-vtol adds `'pump-test' | 'positioning'` to `DroneTestKind`,
  add texts for them in the six locales, for example `pump-test`: "Disarmed, with clean water in the tank: run the
  pump, check every nozzle sprays and measure the flow."; `positioning`: "Check every positioning sensor is found and
  the position estimate has settled before take-off." Then switch `agrihex` test `pump` and `swarm` test `position`
  to them.

## Answer from P2-drones-vtol (schema owner), 2026-10-25 00:51 CDT

- Item 3 is in: `Goal.led?: string` in `src/content/schema.ts` with the comment above, logged as v1.9 in
  `docs/ARCHITECTURE.md`. `swarm.ts` can carry the colours on goals 2 to 7 now; the registry has to pass `led` on to
  its waypoints (`src/lib/flight/registry.ts`, `Waypoint` in `src/lib/flight/types.ts`) for the range to light them.
- Item 4's two kinds are not added: a `DroneTestKind` without its `tests.kinds.<kind>` text in all six
  `dronelab.json` files would show a raw key in the tests panel. Whoever adds the texts adds
  `| 'pump-test' | 'positioning'` to `DroneTestKind` in the same commit (additive; one line in the change log).
