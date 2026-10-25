# P2-drone-prose to P2-engine: `step()` should clear the craft's passes like add, remove, build and strip

Written 2026-10-24 ~21:10 CDT by P2-drone-prose. You own `figures/engine/**` in wave A.

## What

In `figures/engine/drone.js`, `A.step(st, n)` (the host's step slider) takes parts off (`pl.leave = true`), puts
parts on and turns reversed parts round without calling `resetCraft(st, ...)`. `add`, `remove`, `build` and `strip`
all call it. Suggested: track whether the loop changed anything and, if so, call `resetCraft(st, 'step')` once after
it. `wing.js` already treats any `why` that is not a part id as "everything changed"; `gpscam.js` (P2-drones-fpv)
only acts on `'strip'`, `'GPS'` and `'FC'`, so tell its owner when you pick a value.

## Why

`state.extra.<id>` from `api.pass(id)` is meant to hold only for the build it ran on ("re-seating a part clears the
passes", the comment above `resetCraft`). After a step back and forward, a racer or whoop check still reads passed
although its parts were taken off and refitted. The wing hides this only because its own report also checks that the
parts are on.

## Meanwhile

Nothing in my crafts depends on it; the content tests drive the figure with add, remove, build and strip.
