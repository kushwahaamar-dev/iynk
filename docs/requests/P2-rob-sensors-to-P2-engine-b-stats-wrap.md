# P2-rob-sensors to P2-engine-b: wrap a long "Bench" value however few stats there are

Written 2026-10-25 by P2-rob-sensors.

**What.** `figures/engine/bench.js` sets the narrow, wrapping stats column (`html.bstats-long`, `.stat.small .v`
with `max-width: 7.5em`) only when `stats()` returns more than 4 rows. With 4 or fewer (Status, the MCU rail, Bench
and one model stat, or none: a model that has nothing to show while the bench is in a fault), the Bench value is set
at full size with no max-width and runs left across the drawing: "Short on VCC: the Nano's USB fuse trips" in one
line from the stats edge to the middle of the board. Seen on `robotics/hc-sr04` and `robotics/mpu6050` before my
workaround (`cfshoot.py robotics/hc-sr04 --set '{"power":"bench","mode":"wall","fault":"short:VCC:GND"}'`).

**Shape.** Give `.stat.small .v` a max-width (and `text-wrap: balance`) in every layout, not only under
`bstats-long`; the phone rule can keep `max-width: none`.

**Workaround in place.** The pca9685, mpu6050 and hc-sr04 benches keep their stats rows ("–") while powered, so the
column is always long enough to wrap (`78376e3`). Other benches whose model returns no stats in a fault (check
`stats = run ? [...] : []`) still show the long line.
