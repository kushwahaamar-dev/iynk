# P2-engine-b: what wave B did not reach

Written 2026-10-25 ~03:45 CDT by P2-engine-b, for the driver and phase 3.

## Engine features not built

- **Drone wiring sheet beside a long button column.** The sheet leaves 24 % of the width for the buttons; the
  delivery quad's widest buttons reach further. Shorter labels, or a sheet that opens over the buttons.
- **Boards in the breadboard** (`item-nano.md` 2): `circuit.board: 'in'` with `at: { 'J2.15': 'd5' }`, each pin's
  strip node joined to its board net in `netlist` (`bench-solve.js`).
- **Bottom-side parts** (`item-nano.md` 4-6, 8; `item-esp32-devkitc.md` 4): footprints of removed bottom parts,
  exploded bottom parts above the mat, a `wireZ(p)` kind hook, bottom headers drawn before the PCB, a library `male`
  header with `under: true`.
- **Download mode as a status** (`item-esp32-devkitc.md` 2). The ESP32-S3 and now the NodeMCU stop their sketch in
  ROM download mode and report `boot: 'download'`, but `status` stays `running`; a `status: 'download'` needs the
  host's status panel and run gate to know the value.
- **Library kinds from the FPGA boards** (`P2-fpga-to-P2-engine-b-fpga-boards.md` 9): Pmod socket, VGA D-sub, USB-A,
  2 x 20 box header, jumper row, decoupling cluster, tall-lever slides.
- **The whoop on library pieces.** `drone-pieces.js` takes whoop sizes now; `figures/drones/whoop.js` still draws its
  own motors and props.

## Sweep (`docs/verify/sweep.md`)

Done: 1-2 (Pico UF2 boot, scenario source), 3 (`upload.also`), 4 (`gpio5v` label), 5 (restart after a supply drop,
variant LED net), 6 (NodeMCU download mode), 7 (traffic-light lenses), 8 (figure numbers, parts and modules),
9 (circuit programs on the NodeMCU and ESP32-S3), 11 (silkscreen never translated), 13 (obstacle on the mat),
14 figure side (a host serial line hands over the board). Not mine: 10 (phase 3), 14 host side
(`P2-engine-b-to-P2-req-host-run-pins.md`), 15 (`P2-engine-b-to-P2-nucleo-cold-test.md`: the test counts LD2, which
P2-nucleo asked to keep blinking), 16 (micro:bit microphone).

## Pages other owners should rebuild

Every page embeds the engine. These were built by other wave-B owners and carry an older engine until they rebuild
them (`python3 -I figures/tools/cfbuild.py <kind>/<id>`): boards `microbit-v2`, `basys3`, `de10-lite`,
`nucleo-f401re`, `pi4-pi5`; robotics `a4988`, `lm2596`, `hc-sr04`, `mpu6050`, `pca9685`, `qtr-8rc`, `pi5-ros2`;
modules `a4988`, `lm2596`, `pca9685`, `qtr-8rc`; parts `nema17`, `multimeter`. Or the driver runs
`cfbuild.py --all` once wave B is in.

## Small things seen on the way

- `src/lib/boardlab/run.ts` `stop()` sends `pins: {}`, so a stopped sketch leaves the figure on "your sketch" with
  its outputs low rather than back on the built-in program. Fine for a lesson; worth a look with the run-pins request.
- When `figure-keys.json` is regenerated, silkscreen-only keys (e.g. "MOTOR") drop out and must leave the
  dictionaries too (`P2-engine-b-to-phase3-strings.md`).
