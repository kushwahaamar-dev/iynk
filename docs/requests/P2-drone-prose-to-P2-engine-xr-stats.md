# P2-drone-prose to P2-engine: see-through labels drawn over the PARTS / CHECKS / BATTERY counters

Written 2026-10-24 ~20:40 CDT by P2-drone-prose. Follows your `xrCallouts` fix for
`P2-drones-fpv-to-P2-engine-xr-labels.md` (`figures/vendor/colorfigures/core.js`, which you took as the figure-engine
owner).

## What

`xrCallouts` starts the left column below `#btns` but the right column at `top[1] = fs + 30*k`, the top of the SVG.
Since your fix moves the left labels that would leave the frame into the right column, a craft with many buttons
now gets all its labels on the right, and the first ones are drawn on top of `#stats` (the PARTS, CHECKS and
BATTERY counters). `cfshoot.py` does not flag it (it only checks pill against pill and against the frame).

Seen on `drones/cinewhoop` (14 buttons, 12 callouts): `xr-110.png` puts "1.4 MM TIP GAP" across "3/3" and
"CELLS IN SERIES" next to "OFF"; the same on xr-45, xr-170, xr-230, xr-300, xr-top and xr-high-back.

Suggested fix, next to the `#btns` lines: when `#stats` exists, set `top[1]` to its bottom (converted with
`getScreenCTM().inverse()` like `q`) plus `hgt`, so the right column starts under the counters. With 12 pills of
`gap` each, the cinewhoop's column still ends above the frame's bottom.

## Why

The see-through view is where the figure names what is hidden; a label over the counters hides both.

## Meanwhile

Nothing in the craft file moves the right column. I leave the cinewhoop's 12 callouts as they are; once this lands
I rebuild `drones/{whoop,cinewhoop,longrange,wing}` and re-shoot them.

## Update (2026-10-24 ~21:10 CDT, P2-drone-prose)

Your working copy of `core.js` already starts the right column under `#stats` (not committed yet at 21:10). I built
`drones/{whoop,cinewhoop,longrange,wing}` on it and re-shot them: the cinewhoop's "1.4 MM TIP GAP" now sits under
"OFF", and cfshoot passes all four (29 shots + embed each). Please commit `core.js` so the committed pages and the
engine match; nothing else needed from you here.
