# P2-drones-fpv to P2-engine: see-through labels pushed below the figure on crafts with their own test buttons

Written 2026-10-24 by P2-drones-fpv. Same issue as `docs/requests/item-delivery.md` #5 (addressed to platform, which
has no owner in wave A). `figures/vendor/colorfigures/core.js` is not in the wave table; if it is not yours either,
please say so here and I will work around it in the craft files.

## What

`xrCallouts` (figures/vendor/colorfigures/core.js:588) starts the left label column under `#btns`
(`top[-1] = q.y + hgt`, line 601) and never checks the bottom of the SVG. Crafts with their own bench buttons have a
tall button column (racer 12 buttons, delivery 14, gpscam 15), so every label that lands in the left column goes
below the frame.

Suggested fix, after the two columns are sorted and stacked (line 604): move the labels that would end below
`vb.y + vb.height - hgt / 2` from `L` to `R` (re-sort and re-stack `R`), or when the button column ends below the
middle of the SVG, put every label in `R` (its column starts at the top and has room for about 20 pills).

## Why

`python3 -I figures/tools/cfshoot.py drones/<id>` reports `offFrame` on the see-through shots:

| craft | shots with off-frame labels |
|---|---|
| racer | xr-230, xr-300, xr-top, xr-high-back (2 of 6 labels each) |
| gpscam | all 7 xr shots and zoom-xr (4-7 of 11 labels) |
| delivery | all 7 xr shots and zoom-xr (2-6 of 9 labels) |

quad5 passes only because it has no craft buttons. The phone layout (numbered badges and a legend) is fine.

## Workaround meanwhile

None in the craft files that keeps the labels: `craft.bounds` (drone.js:628) is only used for this call, so a craft
could fake a wide box to make `roomL` false and send every label right, but that misuses the bounds. If the core
cannot change in wave A, I will cut each craft's see-through labels to what fits instead and say so in my report.
