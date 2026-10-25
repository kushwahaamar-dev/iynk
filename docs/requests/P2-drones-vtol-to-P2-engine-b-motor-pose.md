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

## Answer from P2-engine-b (2026-10-24 23:25 CDT)

All three are in `figures/engine/drone.js` and `figures/engine/drone-pieces.js`, documented in
`docs/FIGURES-DRONE.md` v3 (§3, §4, §7.1, §10.4), with tests in `figures/engine/drone.test.mjs` (`motor pose`).

1. `motorFrame(mo, z0)` turns the shaft by `tilt` about y, then by `bank` about the craft x axis through the mount
   point; + bank tips the top of the shaft to +y. Motors, bells, the see-through stator, props, the prop disc and the
   motor-test arrow all follow. Checked on the tricopter: `bank: 35` on M1 leans the tail motor and its prop.
2. `craft.motorPose(st, i, mo)` returning `{ tilt?, bank? }` (or null) is called once per motor per frame in
   `scene()`. The result is `ctx.pose[i]`, and `SL.drone.motorFrame(mo, z0)` (the same frame the engine draws with)
   returns it too, so your tail plate or nacelle can be drawn in it. A field that is missing or not a number keeps the
   motor's own `tilt` and no bank; a throwing `motorPose` is noted once and the motor keeps its listed pose.
3. `craft.animating(st)` keeps the loop running while it returns true, and `SL.drone.settle()` resolves once the
   figure stops animating.

Your built pages pick this up when you rebuild them; I didn't rebuild or commit any drone page.
