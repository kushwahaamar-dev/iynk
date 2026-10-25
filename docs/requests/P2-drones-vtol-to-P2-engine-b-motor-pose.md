# P2-drones-vtol to P2-engine-b: a motor pose a craft can change while the figure runs

Written 2026-10-24 23:15 CDT by P2-drones-vtol, for `figures/engine/drone-pieces.js` and `figures/engine/drone.js`.

## Why

Two of my crafts move a motor on the bench, and the engine draws every motor at a pose fixed when the craft is
defined:

- **Tricopter (Fig. 12)**: the tail motor sits on a plate hinged along the tail boom, and the tail servo rocks it
  left and right about the boom (the craft's x axis), about ±40°. `motorFrame` only turns a shaft about the y axis
  (`tilt`, towards the nose), so the figure cannot bank the tail motor. Today the servo test swings the servo horn and
  pushrod and shows the tilt with a thrust arrow and a "TAIL TILT 25° LEFT" pill over a motor that stays upright
  (`figures/drones/tricopter.js`, `tiltReadout`).
- **VTOL (Fig. 10)**: the two front motors tilt from straight up (hover) to straight forward (cruise) through the
  transition. That is the y-axis `tilt` the engine already has, but only as a constant.

## What (exact shape)

1. `motorFrame(mo, z0)` takes a second angle `bank` (deg, about the craft x axis through the motor's mount point,
   positive tips the top of the shaft to the left, +y), applied after `tilt`:

   ```js
   // shaft frame: tilt about y first (towards the nose), then bank about x
   const t = tilt * Math.PI / 180, b = bank * Math.PI / 180;
   // (a, b, h) -> rotate by tilt about y, then by bank about x, then translate to (mo.x, mo.y, zm)
   ```

   Pieces that use `motorFrame` (motors, bells, props, prop arrows, prop disc) then follow it with no other change.
2. A per-frame pose: if the craft defines `motorPose(st, i, mo)` returning `{ tilt, bank }` (either may be missing),
   `K.motors` and everything else that calls `motorFrame` uses it instead of `mo.tilt` / 0. Call it once per motor per
   frame in `scene()` and keep the result on `ctx` (e.g. `ctx.pose[i]`), so a craft's own custom pieces can draw a
   hinge, pushrod or nacelle that matches.
3. While a pose is changing the loop keeps animating: the craft can already hold it open with `st.later`; a
   `craft.animating(st)` hook that `settle` also waits on would let tests wait for a sweep without polling.

## Then (my side)

- `tricopter.js`: `motorPose: (st, i) => i === 0 ? { bank: tailTilt(st) } : null`, and the readout pill keeps only the
  number. The tail plate piece turns with it.
- `vtol.js`: `motorPose` returns the nacelle tilt for M1 and M2 during the transition test.

Until this lands both figures keep working as they are; nothing in them depends on it.
