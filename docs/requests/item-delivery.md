# Requests from item:delivery (Fig. 07 autonomous delivery quad)

## 1. engine:drone, figures/engine/drone-sheet.js: explicit edge end points (14:08 CDT)

What: two optional edge fields, `a: [x, y]` and `b: [x, y]` (sheet units), that replace the computed start and end
points (today always the centre of the nearest block side). Suggested change in `SD.sheet`: after `base` is built,
`if (e.a) base[0] = e.a; if (e.b) base[base.length - 1] = e.b;` (and use them in the elbow route when there is no
`via`).
Why: the Pixhawk 6C block has seven connections (POWER1 power module, MAIN 1-4 DShot, TELEM1 SiK, TELEM2
companion, TELEM3 CRSF receiver, GPS1, AUX1 winch). A block has four side centres, so three edges have to share a
point with another edge, which reads as a junction (two different buses joined). With `a`/`b` each port gets its
own point along the block edge, the way a real wiring diagram draws it.
Workaround meanwhile: delivery.js already writes `a`/`b` on those edges (ignored until this lands) and routes them
with `via` so the shared points are the least confusing ones.

## 2. engine:drone, figures/engine/drone.js: craft `report` hook (same as item-longrange #1)

What: merge `extra: craft.report ? craft.report(st) : {}` into `report(st)`.
Why: the delivery quad's own bench tests (compass calibration, GPS lock, winch test, failsafe test) are craft
buttons; `src/content/drones/delivery.ts` reads them as `extra.compassOk`, `extra.gpsFix`, `extra.winchOk` and
`extra.failsafeOk`. delivery.js keeps those flags itself and clears them when the part they were run on is taken
off or re-seated, so no `reset` hook is needed for this craft.

## 3. engine:drone, figures/engine/drone-pieces.js: XT90 size for the `xt60` piece

What: an optional `pc.size: [l, w, h]` on the `xt60` kind (default the XT60's 16 x 15.5 x 8 mm).
Why: a 6S 10 Ah heavy-lift pack uses an XT90(-S) (about 21 x 26 x 11 mm housing); today delivery.js draws an
XT60-sized housing labelled XT90.

## 4. engine:drone, figures/engine/drone-geo.js / drone.js: `'pal'` ignores the chosen palette (14:26 CDT)

What: `SD.mat('pal')` reads `SD.G.pal`, which starts as `'tomato'` and is never set from `st.pal` (the craft's
`palette` or the swatch the viewer picks). Suggest `G.pal = st.pal || craft.palette` at the top of `scene(st)`.
Why: every `'pal'` piece (motor bells, battery strap tab, plates) is tomato on every craft and does not follow
the colour swatches. Workaround: delivery.js sets `SL.drone.G.pal = ctx.st.pal` in its FRAME draw (the first part
drawn); remove it when the engine does this.

## 5. platform, figures/vendor/colorfigures/core.js `xrCallouts`: left labels pushed off the figure

What: when the left label column starts below `#btns` (`top[-1] = q.y + hgt`) and the column would end below the
SVG, put the labels that do not fit into the right column (or start the left column beside the buttons).
Why: crafts with their own bench checks have 13 buttons (delivery: compass, GPS, winch, failsafe), so the button
column reaches the bottom of the figure and every left see-through label lands below the frame (cfshoot
`offFrame` on every `xr-*` shot of drones/delivery). The phone layout (numbered badges + legend) is fine.

## 6. engine:drone: `tag: false` to hide a part's pill (optional)

What: skip `ctx.tags.push` when `part.tag === false` (the part stays clickable and listed).
Why: 16 parts on one airframe give 16 pills when labels are on; small parts (WIRES, TOP) could go without one.
