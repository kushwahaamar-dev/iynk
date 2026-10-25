# P2-drones-vtol to the driver: Betaflight `servo` and `smix` in the CLI emulator

Written 2026-10-24 23:10 CDT by P2-drones-vtol. `src/lib/dronelab/cli.ts` has no wave-B owner, so this goes to the
driver.

## Why

A tricopter's whole setup is its tail servo: centre, travel and direction. In Betaflight 2026.6.2 those are the
`servo` and `smix` commands (`docs/facts/tricopter.md` §5.2-5.3, sources [6] and [12]). The emulator knows `mixer TRI`
but not those two, so `checkCraft` would fail on any snippet line that starts with them. The tricopter's `servo`
snippet therefore shows them as comments:

```
#   servo 5 1000 2000 1520 100 -1   middle 1520 us levels this tail plate; -1 = no channel forwarding
#   servo 5 1100 1950 1520 100 -1   endpoints that stop short of the hinge binding, about 40 deg each way
#   smix reverse 5 2 r
```

A learner who types them gets `Unknown command`. That is the one place the tri's CLI is less real than its figure.

## What (exact shape)

In `src/lib/dronelab/cli.ts`, two Betaflight commands, offered only when the craft's `emulator.commands` lists them:

1. `BF_HELP.servo = "configure servos"`, `BF_HELP.smix = "servo mixer"`.
2. `servo` with no args prints the stored rules, one per line, `servo <i> <min> <max> <middle> <rate> <forward>`
   (default for slot 5: `servo 5 1000 2000 1500 100 -1`).
3. `servo <index> <min> <max> <middle> <rate> <forward>`: exactly six integers; index 0-7; min, max, middle in
   750-2250 with min <= middle <= max; rate -100..100; forward -1..17. Otherwise `###ERROR IN servo: PARSING
   FAILED###` (the same `error()` helper `aux` uses). On success store the line in `s.extra` (replacing any earlier
   `servo <same index> `) and echo it, like `aux` does.
4. `smix reverse` prints the reversals; `smix reverse <servo> <source> r|n` with servo 0-7 and source 0-29 stores or
   clears `smix reverse <servo> <source> r` in `s.extra`; anything else is `PARSING FAILED`. `smix reset` clears the
   reversals.
5. On `save`, a stored `smix reverse 5 2 r` (or a negative rate on `servo 5`) becomes the flight effect
   `servosReversed: true`, which `src/lib/dronelab/fly.ts` already maps through `FAULT_KEYS` into the range's faults.
   A bench build with the servo fitted reversed (`mistakes` has `servo-reversed`) and `smix reverse 5 2 r` saved
   then flies right, the same way `align_board_yaw = 180` cancels a backwards FC.

## Then (my side, once that lands)

`src/content/drones/tricopter.ts`: add `'servo'` and `'smix'` to `firmware.emulator.commands` and turn the three
commented lines into real ones. `src/content/drones/tricopter.test.ts` pins today's comments (`shows the servo and
smix lines the CLI cannot take as comments`), so that test changes with it. Whoever lands the CLI side may make both
edits; they are small.

## Answer

2026-10-25 00:32 CDT, P2-req-drone (wave B tail). Done, with four differences from the shape above, each from
Betaflight 2026.6.2's own `cli.c`, `servos.h` and `servo_impl.h` (read at that tag):

- **Limits and errors.** `servo` takes min and max in 500-2500 (`PWM_SERVO_MIN/MAX`, as `docs/facts/tricopter.md`
  §4.4 says, not 750-2250), middle between them, rate -100..100, forward below 18. The firmware's errors differ by
  case and the console prints them: a wrong count or an index outside 0-7 is `INVALID ARGUMENT COUNT`, anything but
  digits, `-` and spaces is `PARSING FAILED`, a value out of range is `ARGUMENT OUT OF RANGE`. `smix reverse` with
  fewer than three arguments is `INVALID ARGUMENT COUNT`; a servo outside 0-7, an input outside 0-13 (Betaflight has
  14 mixer inputs, not 30) or a flag other than `r`/`n` is `servo NOT BETWEEN 0 AND 8`, the firmware's text.
- **Listing.** `servo` with no arguments lists all eight servos (defaults `1000 2000 1500 100 -1`) and then the
  `smix reverse` lines, as the firmware does. `smix reverse` alone prints the reversed sources as `smix reverse
  <servo> <input> r` lines instead of the firmware's 8 x 14 r/n table, which would wrap on a phone. `smix reset`
  clears them; a bare `smix` prints nothing (no custom rules). Rule lines and `smix load` are not modelled
  (`PARSING FAILED`).
- **The flight effect is `tailReverse`, not `servosReversed`.** `benchFaults()` lets a CLI boolean in `FAULT_KEYS`
  replace the bench's value, so `servosReversed: true` would leave a servo fitted backwards flying reversed. On save
  the console sends `{ tailReverse: true }` when servo 5's yaw input becomes reversed (`smix reverse 5 2 r`, or a
  negative rate; both together cancel), `{ tailReverse: false }` when that is undone (also on `defaults`). The
  one-line toggle in `fly.ts`, like `boardYaw`, is `docs/requests/P2-req-drone-to-driver-tail-reverse.md`.
- **The smix line stays a comment.** `tricopter.ts` offers `servo` and `smix`, and the two `servo 5` lines are real
  commands. `smix reverse 5 2 r` is only for a tail that tilts the wrong way: as a real line, "Try it" on the snippet
  would reverse a servo fitted the right way round. The comment now says "Only if it tilts it right". The prose
  sentence that says the CLI can't take these commands is yours to change:
  `docs/requests/P2-req-drone-to-P2-drones-vtol-tri-servo-prose.md`.

Tests: `src/lib/dronelab/cli.test.ts` ("Betaflight servo and smix", 7 tests) and `tricopter.test.ts` (the snippet
lines, every snippet runs in its CLI without an error, and the servo snippet plus `smix reverse 5 2 r` and `save`
sends `{ tailReverse: true }`).
