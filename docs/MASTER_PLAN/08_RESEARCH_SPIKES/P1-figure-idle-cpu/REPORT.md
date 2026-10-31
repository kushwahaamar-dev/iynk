Answers plan item: T-B1-25 (P1)

# S-B1-02. Figure idle redraw: what burns the main thread at rest

Run 2026-10-28 on `task/T-B1-S02` (from `build/v1` at `bc5bd2c`), headless Chromium 1.64 (Playwright), software paint, keyless production build, `next start` on port 47201. Raw output and probe scripts are in `/Users/amar/iynk-build/scratch/b1-spikes/P1/`. The measuring tool is `scripts/perf-idle.mjs` (committed): 2 s settle, then 5 s window, CDP `Performance.getMetrics` `TaskDuration` over `Timestamp`. Main thread percent of one core, one run per cell unless stated.

## Verdict

**Go, with a 500 ms idle redraw interval.** The cause in the card is half right: the frame driver redraws every frame (60 per second, about 400 KB of SVG each) while a step stays registered, but the registered step is the bench clock (`busy()` returns `st.power`), so the board is "animating" for as long as it is powered, and almost every one of those redraws produces an identical string. Skipping the identical `innerHTML` write alone is not enough. Throttling the redraw while the string stays identical gets all three pages under 5 percent at 1x.

## What was measured

### 1. Baseline, 1x CPU (this run) and 4x

| Route | 1x | 4x |
|---|---|---|
| `/en` | 70.0 | 99.9 |
| `/en/boards/uno-r3/blink` | 74.5 | 99.9 |
| `/en/robotics/uno-r3-build` | 55.4 | 96.0 |

The plan said 48 to 65 percent; this machine reads higher. The page is saturated at 4x.

### 2. Where the time goes

A `MutationObserver` on `#art` in each figure iframe counted 178 to 180 child-list mutations per 3 s on all three pages: one `innerHTML` replacement per frame, 60 per second. `art.innerHTML` is 264 KB to 395 KB.

Which step stays registered: `figures/engine/bench.js:546` (`kick` calls `ui.animate(step)`), and `step` returns `busy()`, which is true whenever `st.power` is true. The home hero (`circuit=blink`), the blink lesson and the robotics bench all show a powered board. So the step never returns `false` while the sketch runs. (Found by reading the code and counting; I did not log registrations in a copy of `core.js`.)

With a render counter and a write counter in a patched copy: `/en` made 180 renders and 3 `innerHTML` writes per 3 s once identical strings were skipped. The scene really changes about once per second (the blink), and not at all in between.

I did not take a CDP `Profiler` sampling profile; the top self-time functions are therefore not listed. The conclusion rests on the mutation counts and the before/after timings.

### 3. Experiments (patched copies of the generated `public/figures/boards/uno-r3.html` and `.../robotics/uno-r3-build.html`, restored afterwards)

| Experiment | `/en` | blink | uno-r3-build |
|---|---|---|---|
| Baseline, 1x | 70.0 | 74.5 | 55.4 |
| A: skip `art.innerHTML` when the string equals the last one, 1x | 22.8 | 25.3 | 16.6 |
| A, 4x | 93.5 | 99.0 | 69.4 |
| B: pause when hidden or off screen | not measured | | |
| C: A and B | not measured | | |
| D: A plus skip `ui.render()` in `frame` after 3 identical renders unless 250 ms passed, 1x | 4.7 / 4.7 | 5.6 / 4.5 | 4.2 / 4.4 |
| D at 250 ms, 4x | 16.3 | 19.0 | 15.0 |
| D at 500 ms, 1x, two runs | 4.6 / 3.8 | 4.6 / 3.6 | 3.9 / 3.1 |

B and C were not run: the hero, the lesson figure and the bench are on screen in every measured page, and `document.hidden` is false, so a pause on hidden or off screen cannot change these numbers. (`figures/engine/embed.js:135` already holds every step while the tab is hidden or the host sent `pause`.) The card's C therefore reduces to A, which is not enough.

D works because most of the remaining cost after A is building the scene string (`cfg.scene` plus `inkScale`) 60 times a second, not the DOM write. The floor is the per-frame `step` (the bench `evaluate()`), about 3 percent.

Experiment D at 250 ms read 4.1 to 5.6 in four runs, so it is not reliably under 5. At 500 ms every cell was under 5 (3.1 to 4.6). A change in the scene string resets the counter, so any real animation (a part drop, a camera turn, the explode view, a drag) still redraws every frame; only a scene that has been identical for four renders is throttled. A user press calls `ui.render()` directly and is not throttled. The cost is that a change that happens while the scene is at rest, such as the LED toggling in a running sketch, appears up to 500 ms late. That is the tradeoff Amar should know about; 250 ms halves it but misses the 5 percent line on this machine.

### 4. Figure tests

`npx vitest run figures src/components/figure` is 7 files, 130 tests, green before the change and green with the D patch in `core.js` at 250 ms and at 500 ms. No figure test changed.

## Caveat

Headless Chromium paints in software, so the share of paint cost is probably higher than on a real GPU; the share of the CPU spent building the scene string would be the same. The 4x numbers are CDP throttling, not a device. Battery effect stays a HYPOTHESIS. Pages that run the program clock but do not change their scene (every powered bench) are the winners; pages with a continuous animation are unchanged.

## What T-B1-25 must know

- `figures/vendor/colorfigures/core.js` says "do not edit by hand" (`PATCHES.md`): the fix is a new patch pair in `figures/vendor/colorfigures/vendor.py` (the `ui.render` line and the end of `frame`), then `python3 -I figures/vendor/colorfigures/vendor.py`, which regenerates `core.js`, then the figure rebuild that regenerates `public/figures/**`. The upstream core must be at `~/.claude/skills/colorfigures` for that step.
- The two edits, as tested:
  - `ui.render`: `const s = inkScale(cfg.scene(st, PALS[st.pal])); if (s !== art._last){ art._last = s; art.innerHTML = s; ui._still = 0; } else ui._still++;` in place of the plain assignment (`_still` must start at 0).
  - end of `frame`: `if (!(ui._still > 3 && now - ui._lastDraw < 500)){ ui._lastDraw = now; ui.render(); }` in place of `ui.render();`.
- Check that `ui.render` wrappers in `embed.js` and the bench (`const r0 = ui.render; ui.render = ...`) still run on a skipped frame the way they should: a skipped frame skips their `schedule()` call too, which is intended (nothing changed) but should be confirmed against the embed protocol tests.
- Verify with `node scripts/perf-idle.mjs http://localhost:<port> --route /en --route /en/boards/uno-r3/blink --route /en/robotics/uno-r3-build --cpu 1`; every line should read under 5.

files to edit: figures/vendor/colorfigures/vendor.py, figures/vendor/colorfigures/core.js
