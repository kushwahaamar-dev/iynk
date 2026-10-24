# Requests from content:quad5 (src/content/drones/quad5.ts)

Reconciled with figures/drones/quad5.js as of 14:19 CDT Oct 24: part ids, shorts, build order, design keys and
the seven wiring-sheet edges match it exactly (quad5.test.ts checks the ids against the figure file).

## 1. engine:drone (figures/drones/quad5.js, figures/engine/drone.js): a failsafe bench test (optional, nice to have)

What: a craft button `failsafe` (label `Failsafe test`) and a way for a craft button to report a passed check in
`state`, e.g. `api.pass('failsafe')` -> `state.checks.failsafe = true` (cleared by `Take it apart` and by re-fitting
`RX` or `FC`). Behaviour with Betaflight 2026.6 `failsafe_procedure = DROP`: needs FC, RX and BATT fitted and the
props off (the motor check's refusal); plugs in, arms on the bench, switches the radio off; after
`failsafe_delay` (1.5 s, stage 1) stage 2 DROP stops the motors and disarms. Log lines: `$ radio off: RXLOSS`,
`failsafe stage 1 (1.5 s)`, `failsafe stage 2: DROP, motors stopped`.
Why: docs/facts/quad5.md §6 lists the props-off failsafe test as a standard first-build check. The content does not
list the test yet, because a test whose button the figure lacks would be a dead button. When the button lands I add
`{ id: 'failsafe', kind: 'failsafe', button: 'failsafe', done: { 'checks.failsafe': true } }` and its texts.

## 2. engine:drone: the FC's power on the wiring sheet (optional)

The sheet has `FC -> ESC` (signal, DShot600) but no edge for the power the FC takes from the ESC: the same 8-pin
harness carries VBAT, GND, CUR and TEL up to the FC (its 5 V and 9 V BECs run from VBAT). The content folds this
into the `FC-ESC` label and note. If you prefer a separate `ESC -> FC` power edge (label `VBAT 8-pin`), tell me and
I add it to `wiring` with its note.

## 3. ui:dronelab: verdict lines and CLI effects for quad5

- Verdicts: `design.verdict.over` / `.weak` / `.ok` as in docs/ARCHITECTURE.md §5, plus `design.verdict.punch`:
  the original showed "Parts match. Plenty of punch." instead of the ok line when T:W > 10 (strictly greater).
  Placeholders: `{kv}` (motor KV), `{cells}` (battery cells), `{tw}` (T:W with one decimal, viewer's locale).
  `design.golden[].verdict` holds the text key of the line the original showed for that pick.
- CLI emulator effects (`firmware.emulator.effects[].set`): the numbers use the flight range's FlightCraft names
  (src/lib/flight/types.ts: `angleLimit`, `acroRate`, `climbRate`); two keys describe CLI state that must be
  combined with the bench before the craft flies:
  `fcReversed = (state.placed.FC === 1) !== (boardYaw === 180)`, so `set align_board_yaw = 180` fixes a backwards
  FC, exactly as the CLI comment says; and `motorDirUnchecked = !state.flight.motorChecked || yawReversed`, because
  `set yaw_motors_reversed = ON` tells the mixer the props spin "props out" while the build spins them "props in".
- Course ids: `race` (the five gates, flight modes `race` and `raceAcro`) and `bando` (the five checkpoints, mode
  `range`) give the progress keys `drone:quad5:course:race` and `drone:quad5:course:bando`, so race laps and range
  runs keep separate best times (the original shared one `best`).

## 4. flight: two small mismatches between the range and the quad5 CLI

- Acro yaw: the CLI sets yaw to a straight 200 deg/s (`yaw_rc_rate = 20`, `yaw_srate = 20`, `yaw_expo = 0`), but
  the sim applies the mode's expo (0.7) to yaw too, so acro yaw is only 60 deg/s around the centre. Please apply
  `expo` to roll and pitch only (or tell me and I change the CLI to `yaw_rc_rate = 6`, `yaw_expo = 54`).
- `src/lib/flight/courses/quad5.ts` labels the road decal `OLD ROAD` in English; it is not in any translation file.

## 5. architect (FYI): `satisfies` and StateCond arrays

`const item = { ... } satisfies DroneContent; export default item;` fails `tsc` in index.generated.ts as soon as an
array holds StateCond objects with different keys (`build[].done` = `{ 'placed.FRAME': 0 }`, `{ 'placed.MOTORS': 0 }`):
TypeScript widens the array element to a union with `'placed.X'?: undefined`, which the `Record<string, …>` index
signature rejects. quad5.ts uses `const quad5: DroneContent = { ... }` instead (same excess-property checks).

## 6. architect: golden-table corrections for docs/DECISIONS.md (quad5)

The calculator is the original's formula and stays unchanged; three cells of drone-lab-a Appendix A were printed
from twice-rounded values. Formula and tile values (what the Drone Lab shows), checked in
src/content/drones/quad5.test.ts:
- 6s1100 / 2207-1950 / 5x5x3, hover time: table 10.7 min, formula 10.646 -> 10.6 min.
- 6s1100 / 2306-2450 / 5x4.3x3, max current: table 282 A, formula 282.50 -> 283 A.
- 6s1800 / 2306-2450 / 5x4.3x3, max current: table 282 A, formula 282.50 -> 283 A.
Also from docs/facts/quad5.md (data kept identical, noted for the record): the fixed part TOP (22 g) partly
double-counts the frame kit; the 5.4 g/W hover efficiency makes hover time optimistic (12.3 min computed against
6-8 min real); the original's wiring label "BLHeli_32" is replaced by AM32 (BLHeli_32 ended 30 June 2024).
