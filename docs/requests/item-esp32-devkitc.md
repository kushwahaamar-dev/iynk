# Requests from item:esp32-devkitc

Files: figures/boards/esp32-devkitc.js, src/content/boards/esp32-devkitc.ts (+ .test.ts),
src/i18n/content/en/boards/esp32-devkitc.json, figures/prompts/esp32-devkitc.md.

## To engine:bench (figures/engine/bench.js)

1. **`st.boot` is never cleared.** `A.press` sets `st.boot = 'download'` when a `reset` control is released while a
   `boot` control is held, but nothing sets it back: a later EN press without Boot, a power cycle and a finished upload
   all leave the board in download mode. Wanted: on every restart (reset release, `A.power(key)`, end of upload) set
   `st.boot = held boot control ? 'download' : null` (Boot held while power is applied also means download mode on an
   ESP32). Until then the ESP32 board does this itself at the first serial tick of each restart (its `log()` helper in
   figures/boards/esp32-devkitc.js sets `st.boot` from `st.ctl.SW1`); that line becomes a harmless no-op once the
   engine does it.
2. **Download mode and boot loops are reported as `status: 'running'`.** In download mode (`st.boot === 'download'`)
   the program should not run and the status should say so (e.g. `status: 'download'`, stats "WAITING FOR
   DOWNLOAD"). The ESP32 modes return no pins and print the ROM lines (`boot:0x3 (DOWNLOAD_BOOT…)`, `waiting for
   download`) themselves, but the host's status panel and run gate read `status`.
3. **Board-specific fault ids need labels and effects.** `def.faults` entries are shown in "Break it ▾" with `T(id)`
   as the label, so English users see raw ids (`strap:GPIO12`, `cold:J3.2`, `wrong-voltage:pin3v3:5`). Wanted:
   `faults: [[id, 'Label'], …]` (or a `faultLabels` map), and a generic strapping fault, e.g.
   `strap:<net>` with `def.straps: { GPIO12: { msg: 'GPIO12 high at reset: flash at 1.8 V, boot loop', status: 'fault' } }`,
   so the figure itself reports the boot loop (status, message, `fault` object). Today the ESP32 handles
   `strap:GPIO12` inside its own modes (no pins, `flash read err, 1000` every second) while status stays `running`.
4. **Down-pointing headers.** `side: 'bottom'` parts are drawn after the PCB, so they would paint over it. The DevKitC's
   male headers point down into the breadboard; the board file draws only the top side (pads, fillets, pin ends) with
   its own kind `esp32-devkitc-header`. If bottom parts were drawn before the PCB (and under it in see-through), the
   header plastic and the long pins could be shown and the board could stand on them. Move the kind into the library
   if other boards want it (Nano, Pico, NodeMCU have the same headers).
5. **Reverse polarity on a bare pin source burns `mcu.part`.** With `{ src: 'pin5' }` (no `via`) the burned part is
   the module. On the DevKitC the parts that usually die first are D3/D5 and the AMS1117 (U2). A per-source
   `burns: 'U2'` would let the figure smoke the right part; the content's `effect.damages` lists all four.
6. **xr callouts leave the frame** at yaw 45/110 (bottom label) and 230/300 (one side label) on this tall, narrow
   board (cfshoot `offFrame`), even with `height: 14`. The callout layout probably needs to clamp to the frame.

## To interpreters (src/lib/interp)

1. **MicroPython for `esp32-devkitc`.** ids.ts lists `languages: ['arduino-cpp', 'micropython']`, but
   `profiles.ts` gives the board `languages: ['arduino']` only. A MicroPython lesson (machine.Pin, PWM, ADC with
   `atten`, `TouchPad`, `network.WLAN`) would follow as soon as the Python subset runs on this target; the current
   lessons are all Arduino C++ and pass on today's interpreter.
2. **Devices the lessons use**, so the host's world runner matches the content test's stand-in
   (src/content/boards/esp32-devkitc.test.ts, `runLesson`):
   - `button` with `pull: 'internal-up'` on GPIO0: pressed drives the pin LOW, released lets the pull-up win.
   - `switch` on GPIO4 for the touch lesson: value 1 drives HIGH, 0 drives LOW (so `touchRead()`, which reads the
     level, is deterministic; an undriven GPIO4 reads random noise today).
   - `network` (`requests: ['GET /on', 'GET /off']`): value i sends `world.request(...requests[i].split(' '))` at the
     event time. The deterministic run joins `bench-lab` at 1.25 s and gets 192.168.4.55.
3. **checks.ts semantics this board relies on**: `responds` = the pin's level at `after.t + withinMs` is in `v` and
   differs from its level at `after.t`; `pwm` = `PinState.duty` at `atMs`; `pin-toggles` = every period between
   rising edges inside `periodMs`, at least `minCycles` periods.

## Answer from P2-engine (2026-10-24 ~22:00 CDT), engine items

1. **Partly.** Releasing a `reset` control sets `st.boot` from the held `boot` control (download, else clear). A power
   cycle and the end of an upload still leave it to the board's own `log()` at the first serial tick, which works.
2. **Not done as asked** (`status: 'download'`). The engine's `straps` (FIGURES-BENCH §6.3, v6) give a halting strap
   `status: 'fault'` with a `fault` object, which the run gate already knows; a download-mode status needs the host's
   status panel to learn a new value. In `P2-engine-gaps.md`.
3. **Done** (`4b4a878`, `f06d126`): `faults` entries may be `[id, label]`; unlabelled ids get one from their kind
   (now also "Wrong level on GPIO12 at reset" for `strap:<net>`), and `straps: [{ fault: 'strap:GPIO12', boot,
   halts: true, part, msg, fix }]` reports the boot loop as `status: 'fault'`. `esp32-devkitc.js` doesn't list
   `straps` yet: its content expects the figure's own `flash read err, 1000` lines, which a halting strap silences, so
   the board keeps its `strapped()` mode until its content owner moves the serial line into the strap's `msg`.
4. **Not done** (bottom-side headers drawn before the PCB). In `P2-engine-gaps.md`.
5. **Done** (`4b4a878`): feeds take `burns: '<part>'`.
6. **Done** (`f06d126`, `10d310d`, vendor patch P6): the callouts stay in the frame; cfshoot is clean on the DevKitC.
