# P2-drones-fpv: what is shipped and what is not (racer, gpscam, delivery)

Written 2026-10-24 21:15 CDT at the end of wave A.

## Shipped

- `racer` (Fig. 05, Betaflight 2026.6.2), `gpscam` (Fig. 06, ArduCopter 4.7.2) and `delivery` (Fig. 07, ArduCopter
  4.7.2): content module, English prose, content tests, prompt record, rebuilt figure. Each has the design calculator
  with golden rows, the build in figure order with refusals, the wiring sheet edge for edge, the three safety tests
  plus the craft's own bench checks (racer: receiver, failsafe; gpscam: compass, GPS lock, failsafe, gimbal, pre-arm;
  delivery: compass, GPS lock, winch, failsafe), CLI snippets that the emulator accepts, quizzes, flight params and
  one course each with medal times that P2-flight's registry flies (demo and AUTO tests pass).

## Not done

1. **Racer default opens on an ESC over-current warning.** Needs `escAmps` 45 to 55 in
   `src/lib/drone/__fixtures__/models.ts` (no wave-A owner); the full change, both sides, is in
   `docs/requests/P2-drones-fpv-to-driver-racer-esc.md`.
2. **Racer LED strip lines are comments.** The Betaflight emulator (`src/lib/dronelab/cli.ts`, owner ui:dronelab) has
   no `led` command, so the LED snippet shows the eight `led` lines as comments and only `set ledstrip_profile` is
   typed. Adding `led` (and `led` with no argument listing the strip) to the emulator would let them be real lines.
3. **The parcel drop doesn't change the weight in flight.** The delivery mission's `drop` stop holds 8 s, but the sim
   flies the same mass after it (the calculator's hover throttle falls from 0.716 to 0.643 without the 1 kg).
   P2-flight could take `action: 'drop'` as the moment to subtract `design.fixed` `PARCEL` from the craft's mass.
4. **AUTO's last leg descends while it flies home.** `missionVelocity` (src/lib/flight/sim.ts) climbs or descends
   toward each waypoint's height on the way to it, so a `land: true` goal far from the last waypoint glides down
   across the field. Real ArduCopter flies to a NAV_LAND location at its current height and then descends. The
   delivery course works round it with a "HOME at 12 m" goal before the landing goal; gpscam's last leg is clear of
   everything, so it doesn't need one.
5. **Non-English prose** for the three crafts: phase 3 (translation).

P2-fun (wave B, 2026-10-24 ~22:50): 3 and 4 done. (3) A `drop` goal releases the craft's payload (`payloadG` in
`content.flight.params`, else the design's fixed `PARCEL` part; the registry sets it only on a craft whose course has a
drop): the sim flies `auw - dropped` from there (the battery's current curve keeps the full-weight reference, so the
current falls with the thrust), says "Parcel released: 1.0 kg off", and the range draws the parcel hanging on its
winch line and then lying at the drop zone; a reset puts it back on. Test: the delivery AUTO mission's cruise throttle
home is below 0.95 of the way out. (4) AUTO flies to a landing goal at its current height and comes down only within
1.5 m of it (ArduCopter's NAV_LAND); tested on a pad 15 m from the last waypoint. The delivery course's "HOME at 12 m"
goal can stay; it is no longer needed.
