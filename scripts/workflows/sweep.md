# Figure sweep (alongside the final pass, 2026-10-25 03:20)

The open figure items of `docs/verify/sweep.md` and the figure-engine requests of `docs/design/POLISH-SPEC.md` §5
("Driver, figure engine"). The final pass's builders own `src/**` and are editing it right now; this sweep owns only
`figures/**` and `docs/FIGURES.md`. Two agents, run with `scripts/workflows/phase3-wave.js` (brief `sweep.md`).

## Shared rules

1. Shared rules 2, 3, 7, 8, 9, 10 and 13 of `scripts/workflows/phase2.md` apply word for word (the hackathon rule,
   Node 24, others' half-done work, careful git with only your paths and no agent attribution lines, secrets, the last
   step). Read `HANDOFF.md` ("Rules that never change"), `docs/FIGURES.md` (the bridge protocol) and
   `docs/FIGURES-BENCH.md` before changing the engine. The figures' look stays as it is.
2. **Only your paths.** Never edit `src/**` (the builders' files), `src/i18n/**` (the key list and the figure
   dictionaries: the driver collects and translates once you are done) or `public/figures/**`. Rebuild the pages you
   test with `python3 -I figures/tools/cfbuild.py <kind/id>` but don't commit them: the driver rebuilds every page
   with `--all` at the end and commits that.
3. **New or changed visible English.** List every figure string you add, change or remove in your report (old → new).
   A string with a live value is a template with its values (`['Hand at {cm} cm', { cm }]`, or
   `T('…{n}…', { n })`), never a concatenation: the collector (`scripts/figure-strings.mjs`) can't key a
   concatenation, so it stays English in every language. Keep the labels `docs/hacktx/VIDEO.md` and `PITCH.md` tell
   the presenter to click; if one must change, say old and new.
4. **Test first where the engine tests can express it.** A behaviour fix comes with a test that fails before it:
   `figures/engine/bench.test.mjs`, `drone.test.mjs`, a probe step, or a jsdom test through
   `figures/engine/testkit.mjs` (see `src/content/boards/nucleo-f401re.test.ts` for the pattern; such a test may live
   next to the engine tests). Run it red, then green.
5. **Done means:** `npx vitest run figures` passes; `node figures/engine/probe.mjs <bench>` passes for every bench
   whose figure or engine path you touched; `python3 -I figures/tools/cfshoot.py <kind/id> --out <your scratch>` is
   OK for every page you touched, and you read the screenshots; `npx eslint figures --quiet` is clean. The content
   tests that load figures (`npx vitest run src/content`) still pass. Report real numbers, failures included.
6. Screenshots, scripts and builds in your own scratchpad subfolder (`<scratchpad>/<your label>/`). Commit with
   `git commit -m "…" -- <your paths>` after each verified item and push (`git pull --rebase` and retry if rejected).
   An item that turns out to be already fixed: say so with the commit that fixed it, and move on.

## Sections

### S-engine

Owns `figures/engine/**`, `figures/vendor/colorfigures/**` and `docs/FIGURES.md`. In order:

1. **Host-controlled chrome** (POLISH-SPEC §5, FE U5, BO U3, DR B1 U8). The host pages draw their own Break it,
   assembly, power and upload controls, so the figure's own pill column repeats them. Add a bridge message
   `{ type: 'chrome', hide: [<button ids>] }` that hides those `#btns .act[data-id]` buttons (and their `.stepwrap`)
   while keeping them pressable through `press`, so the host decides what it duplicates; `hide: []` shows everything
   again. See-through, Labels, zoom and the HUD can't be hidden. The `ready` message already lists `buttons()`; keep
   that list complete (hidden ones included, marked `hidden: true`) so a host can still offer them. Document it in
   `docs/FIGURES.md`, test it, and in your report give the button ids each page kind's host duplicates today (read
   `src/components/boardlab/**`, `src/components/robotics/**`, `src/components/dronelab/**` to see what they draw;
   read only), so the driver can wire `FigureFrame` once the builders are done.
2. **The drone wiring sheet fits its plate** (DR U6): when "Show the wiring sheet" opens, the sheet is scaled and
   centred to fill the plate (today about 275 × 140 px inside 633 × 475 at 1440 × 900), readable without the zoom
   buttons, on a laptop and a phone. `figures/engine/drone-sheet.js`, `drone.js`.
3. **"Built: every part on, smoke test, motor check and calibration done"** (DR U10): after Build it for me the Tests
   tab shows 0 of 3 run. Read how the drone host counts tests (`src/components/dronelab/**`, read only). If the build
   really runs them, report them the way the host counts; if not, make the toast say only what it did.
4. **Sweep items** in `docs/verify/sweep.md`: 1 (Pico BOOTSEL left in UF2 mode) and 3 (`upload.also`) look fixed in
   `figures/engine/bench.js`; check each in the built Pico and ESP32-S3 DevKitC-1 figures and say which commit fixed
   it. 2 (`def.levels` not read: a sensor-output supply with a range offers Too high / Too low). 4 (Break it shows the
   raw id `gpio5v:GPIO4`). 6 (NodeMCU straps: FLASH held while RST is released should leave the sketch stopped and
   the chip waiting in download mode, as on the real board; `docs/facts/nodemcu.md`). 11 (silkscreen and on-screen
   labels share keys): check whether silkscreen still goes through `CF_T`; if it does, give it a path that never
   translates.
5. **Strings the collector can't key** in the engine: find every visible string built by concatenation or by
   `'Press ' + name`-style composition ("Press RESET" and "Press BOOT" stay English in Hindi on
   `/hi/robotics/esp32-s3-build`) and make each a template or a literal. List them.
6. **axe nested-interactive** on the quad5 figure after Build it for me, the wiring sheet and Exploded view (DR
   audit, `docs/verify/ui-audit-drones.md`): find the interactive element nested in another and fix it.

### S-figures

Owns `figures/boards/**`, `figures/robotics/**`, `figures/modules/**`, `figures/parts/**`, `figures/drones/**` and
`figures/prompts/**`. If a fix needs an engine change, describe it in your notes (S-engine is editing the engine at
the same time) and fix what the figure source can. In order:

1. Sweep item 5: `robotics/esp32-s3-build` keeps its sketch clock and serial running through the J2 cold joint and
   the brown-out, while the lesson says the board restarts (ROM banner, "Brownout detector was triggered"); and
   `NET = 'GPIO38'` is hard-coded, so `?variant=v1.0` (RGB LED on GPIO48) leaves the LED dark.
2. Sweep item 9: the NodeMCU blink, web server and dimmer circuits and the ESP32-S3 dimmer and web-server circuits
   have no built-in mode that drives their LED on the figure page alone. Add one where the board has a built-in
   program list, the way the Uno's `blink` program drives D13.
3. Sweep item 16: micro:bit `microphone` LOUD/QUIET events never fire. Take the thresholds from the MicroPython
   micro:bit V2 documentation (`microphone.set_threshold`, its defaults) or `docs/facts/`; cite the source in a comment.
4. Sweep items 7 (`parts/traffic-light`: the green lens disappears at yaw 45, 230 and 300) and 8 (`soil-moisture`,
   `ssd1306`, `traffic-light`, `uln2003` titles read "Fig. — …": give them figure numbers the way the other part and
   module pages have them).
5. **Strings the collector can't key** in figure sources: every visible string built by concatenation (the a4988
   notice "Vref 0.544 V on the meter: the limit is 1.0 A" stays English on `/de/robotics/a4988`). Search every file
   you own for `+ '` and template literals with `${` that reach `say`, `T`, a status, a stat, a label or a toast, and
   make each a template with its values. List them.
