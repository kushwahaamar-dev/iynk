# P2-req-drone to the driver: a saved `smix reverse 5 2 r` should cancel a servo fitted backwards

Written 2026-10-25 00:32 CDT by P2-req-drone (wave B tail). `src/lib/dronelab/fly.ts` has no owner this wave
(ui:dronelab), so this goes to you.

## Why

The Betaflight console now takes `servo` and `smix reverse` (`faa07c4`, the tricopter offers them). On `save` it
sends the flight patch `{ tailReverse: true }` when servo 5's yaw is reversed in the firmware (`smix reverse 5 2 r`,
or a negative rate on `servo 5`; the two cancel), and `{ tailReverse: false }` when that is undone (`smix reverse 5 2
n` or `defaults`, then save). The store keeps it in `cli.flight` like `boardYaw`.

`P2-drones-vtol-to-driver-cli-servo.md` asked for `servosReversed: true`, but `benchFaults()` lets a CLI boolean in
`FAULT_KEYS` replace the bench's own value: a servo fitted backwards (`mistakes` has `servo-reversed`) plus a saved
`smix reverse 5 2 r` would still fly reversed. Reversing in software flips whatever the bench built, the way
`align_board_yaw = 180` flips the FC, so it needs the same toggle.

## What (exact shape)

In `benchFaults()`, next to the `boardYaw` line:

```ts
if (cli.tailReverse === true) faults.servosReversed = !faults.servosReversed;
```

and the doc comment above `flightFaults` names it ("and `tailReverse`, a tail servo reversed in the mixer"). A test
in `src/lib/dronelab/fly.test.ts` or `tricopter.test.ts`: with `mistakes: ['servo-reversed']`, `cli: {}` gives
`servosReversed: true`, `cli: { tailReverse: true }` gives `false`; with no mistake, `cli: { tailReverse: true }`
gives `true`.

The range only shows the fault once P2-fun lands `P2-drones-vtol-to-P2-fun-tri-servo-reversed.md` (the multirotor
step ignores `servosReversed` today).

## Answer (driver, 2026-10-25 00:42 CDT)

Done as asked: `benchFaults()` flips `servosReversed` when the saved CLI has `tailReverse: true`, next to the
`boardYaw` line, and the doc comment names it. `fly.test.ts` "a tail servo reversed in the mixer cancels one fitted
backwards, and reverses a good one" covers the four cases. The range now flies the fault too (the P2-fun request below
was closed in the same commit).
