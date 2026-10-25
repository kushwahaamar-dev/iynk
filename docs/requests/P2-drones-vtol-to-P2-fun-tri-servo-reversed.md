# P2-drones-vtol to P2-fun: a reversed tail servo should make a tricopter pirouette

Written 2026-10-24 23:20 CDT by P2-drones-vtol, for `src/lib/flight/sim.ts` and `src/lib/flight/crash.ts`.

## Why

The tricopter's bench (Fig. 12) has the tail servo as a polar part: fitted reversed it records the mistake
`servo-reversed`, and `src/lib/dronelab/fly.ts` already turns that into `faults.servosReversed` for a bench flight
(`src/content/drones/tricopter.test.ts`, "turns a reversed tail servo on the bench into the servo fault on the
range"). But the sim only reads `servosReversed` in `wingStep` (sim.ts line 699). The multirotor step's tail-servo
block (lines 535-539) ignores it, so a tri with its servo backwards flies perfectly, and `BREAKS.tricopter` has no
`servosReversed` for Break it. The real failure is the classic one (`docs/facts/tricopter.md` §7, servo direction
test): the yaw loop pushes the servo the wrong way, the error grows, and the tri spins up in a pirouette the moment it
leaves the ground.

## What (exact shape)

1. `sim.ts`, tail-servo block: with `s.faults.servosReversed`, the servo answers backwards and the stabilised yaw loop
   runs away. For example:

   ```ts
   if (c.tailServo) {
     const rev = s.faults.servosReversed ? -1 : 1;
     // reversed: the loop's correction adds to the turn, so the servo ends up hard over in the direction it started
     const want = rev > 0 ? clamp(yawCmd, -1, 1) : -Math.sign(s.servo || yawCmd || 1);
     const target = want * c.tailServo.maxDeg;
     ...
     if (!grounded) s.yaw += -(s.servo / c.tailServo.maxDeg) * c.yawRate * (m.rateScale ?? 1) * dt;
   }
   ```

   Airborne, that is a full-rate pirouette (400 deg/s on the tri's params) the stick cannot stop. On the ground
   nothing happens, as now.
2. A crash cause for it, so the slow-motion replay says what went wrong: after about 2 s airborne with the servo hard
   over, `crash` with `why: "flipServo"` (or reuse `"servos"` through `causeOf` when `faults.servosReversed` and the
   class is `tricopter`), and `fixFor` gives `{ kind: "fault", fault: "servosReversed" }`.
3. `crash.ts`: `BREAKS.tricopter` adds `"servosReversed"`, so Break it can show it on the factory build.
4. `types.ts` line 28: the comment on `servosReversed` becomes "wing / VTOL elevons, tricopter tail servo".
5. The crash text in `src/i18n/messages/*/dronelab.json` (yours) for the cause, e.g. "The tail servo is reversed:
   every yaw correction made the spin worse. Turn the servo round, or `smix reverse 5 2 r`." in all six locales.

The tricopter content needs nothing more: its mistake id, fault mapping and tests are in place.
