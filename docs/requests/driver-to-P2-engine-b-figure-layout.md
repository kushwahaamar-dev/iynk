# driver → P2-engine-b: figure layout problems seen after wave A's rebuild

Filed 2026-10-24 ~21:50 CDT by the driver, after `cfbuild.py --all` (`6576766`) and `cfshoot.py` on the 50 pages that
changed. 44 pass. The shots below are cfshoot's desktop shots (1350 × 1200); the old pages are the ones built at
`a45e9c7` (17:30) and by their owners in wave A, shot the same way for comparison.

## 1. Label pills overlap on six part pages (cfshoot fails)

| Page | Pair | Before the rebuild | After |
|---|---|---|---|
| `parts/dc-motor` | Ferrite magnet / Armature coils | xr-110 | xr-45, xr-110, xr-300, zoom-xr (worse) |
| `parts/servo-sg90` | Position pot (5 kΩ) / Control board | passed | xr-high-back (new); the horn is also drawn over the pot's pill |
| `parts/diode-1n4007` | Cathode band / Silicon PN chip | 4 angles | same |
| `parts/npn-2n2222` | Silicon die / Gold bond wires | 7 angles + zoom | same |
| `parts/stepper-28byj48` | 32-step rotor / Gears, windings / rotor | 6 angles + zoom | 5 angles + zoom |
| `parts/tip120` | Q1 / Q2 / Tab = collector | 7 angles + zoom | same |

The two that got worse moved with the P6 callout change (callouts under the stats panel, closing up under the buttons).
Done when `cfshoot.py parts/<id>` passes for all six.

## 2. Bench stats run over the drawing (cfshoot does not check this)

The right-hand stats are right-aligned and as wide as their longest value, so on the motor benches the values sit on
top of the art: `robotics/l298n` ("7.4 V · 378 mA", "5.8 V · 211 rpm" over the LiPo and the mat),
`robotics/transistor-switch` ("158 mA · 203 rpm", "3.4 mA" over the breadboard), `robotics/tb6612fng` ("Forward 50%"
over the Nano). The same before the rebuild. `robotics/uno-r3-build` and the board pages are clear because their stats
are short. Either frame the art clear of the stats column or let the column wrap a value onto two lines.

## 3. `robotics/tb6612fng` is not framed

At yaw 45 the rear motor and wheel run up past the frame into the title row and under the See-through button (same
before the rebuild). Since the rebuild the status toast at the top also covers the far wheel. The other benches fit.

## Why

These are what a judge sees first on a bench or part page. Item 1 is a cfshoot failure, so it also blocks gate 2's
figure check for those pages.
