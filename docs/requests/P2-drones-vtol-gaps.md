# P2-drones-vtol: what is shipped and what is not (vtol, tricopter, octo)

Written 2026-10-25 00:50 CDT at the end of wave B.

## Shipped

- `vtol` (Fig. 10, tiltrotor QuadPlane on ArduPlane 4.7.2), `tricopter` (Fig. 12, Betaflight 2026.6.2 with the
  tail servo) and `octo` (Fig. 13, heavy-lift cinema octocopter on ArduCopter 4.7.2): figure in its own palette,
  design calculator with golden rows, build sequence with refusals, wiring sheet edge for edge, the three safety
  tests plus the craft's own checks (VTOL: tilt servos, airspeed sensor, pre-arm; tricopter: tail servo, failsafe;
  octo: landing gear, dual GPS, pre-arm), CLI snippets the emulator runs, English prose, quizzes, prompt record,
  and flight with its own params and courses with par times and a mission.
- The three special behaviours fly on the range: the VTOL transitions in FBWA and comes back in QRTL; the
  tricopter banks its tail motor on the servo (and, with the driver's `flipServo` answer, pirouettes with the servo
  fitted backwards); the octo's Motor out mode stops a motor in the air and it keeps flying on seven
  (`octo.test.ts` checks height, position, throttle rise and the slow yaw).
- VTOL and tricopter defaults open with no design check. The octo's does not yet (item 1).

## Not done

1. **The octo's default opens on `hover-high`** (65.6 % against the 60 % rule of thumb). The fix is
   `hoverLimit: 0.7` in `src/lib/drone/__fixtures__/models.ts` and `octo.ts` in one commit, as HANDOFF planned:
   `docs/requests/P2-drones-vtol-to-driver-octo-hover-limit.md`. `octo.test.ts` passes before and after.
2. **MAVProxy `status` says `Mode STABILIZE` on the VTOL before any mode command.** ArduPlane boots in MANUAL. One
   line in `cli.ts`: `docs/requests/P2-drones-vtol-to-driver-mavproxy-boot-mode.md`.
3. **The VTOL's AUTO survey is flown as a VTOL all the way.** That is a real mission shape (the snippet and prose
   now say it carries `DO_VTOL_TRANSITION 3` after the take-off, per ArduPilot's QuadPlane AUTO Missions page), but
   the sim cannot fly a mission leg on the wing, so there is no fixed-wing AUTO mission. It would need a goal flag
   (an optional `cruise` on a course goal, additive in `schema.ts`) and the mission task in `src/lib/flight/sim.ts`
   to tilt, fly the leg with `wingStep`'s steering and come back to hover before the next VTOL goal.
4. **The VTOL's transition does not hold height.** In FBWA the throttle stays the pilot's while the rotors tilt;
   on Plane the VTOL motors hold height through the transition (`Q_ASSIST_SPEED`). The prose says "keep the
   throttle up", which is what the sim needs. A sim change in `vtolTransition` (`src/lib/flight/sim.ts`) for later.
5. **The VTOL's 4S2P Li-ion pack is not flagged `liion`.** With `liion: true, parallel: 2` the calculator caps it
   at 90 A (45 A a cell) and the default opens on `battery-overcurrent` (116 A at full throttle on all four
   motors), against the task's rule that the default opens clean. Full throttle on four motors is a moment in a
   VTOL's flight, so the check is too strict for it; a decision for the calculator's owner (a hover-current check
   for VTOLs, or a LiPo default).
6. **The range does not show which motor stopped.** The sim names it ("Motor 3 failed", ArduPilot's M3 on the
   octo) but `FlightRange` draws all eight props turning.
7. **Figure strings.** `node scripts/figure-strings.mjs --static` finds 1388 strings, across all figures, missing
   from `src/i18n/figure-keys.json`; the three new figures' strings are among them. Regenerating that file and
   translating it is phase 3.
8. **Non-English prose** for the three crafts: phase 3.
