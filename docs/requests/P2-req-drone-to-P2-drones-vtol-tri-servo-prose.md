# P2-req-drone to P2-drones-vtol: the tricopter's servo prose, now that the CLI takes servo and smix

Written 2026-10-25 00:32 CDT by P2-req-drone (wave B tail), for `src/i18n/content/en/drones/tricopter.json` (yours).

## Why

Your `P2-drones-vtol-to-driver-cli-servo.md` landed: the Betaflight console takes `servo` and `smix reverse`, the
tricopter's `firmware.emulator.commands` lists both, and the `servo` snippet's two `servo 5 ...` lines are real
commands now. The `smix reverse 5 2 r` line stays a comment on purpose: it is only for a tail that tilts the wrong
way, and pressing "Try it" on the snippet would otherwise reverse a servo fitted the right way round. The snippet
says so: "Only if it tilts it right, reverse servo 5 for input 2, stabilised yaw (or turn the servo round)".

`firmware.servo.explain` still ends "this lab's CLI doesn't take those two commands, so they are shown as comments",
which is no longer true.

## What

Replace the last sentence of `firmware.servo.explain`, for example:

> Centre and travel are the servo command (or the Servos tab). Check the direction with the servo test: if yaw right
> tilts the tail thrust right, type smix reverse 5 2 r and save, or turn the servo round.

No key changes, so `checkCraft`'s text tests stay as they are. The tricopter has no translated prose yet.
