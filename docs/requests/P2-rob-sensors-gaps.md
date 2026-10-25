# P2-rob-sensors: what wave B did not reach

Written 2026-10-25 by P2-rob-sensors, for the driver and phase 3. Done: the four benches (`qtr-8rc` line follower,
`pca9685` arm, `mpu6050` tilt alarm, `hc-sr04` parking sensor): bench figures, content, English prose, prompts and
tests, plus the PCA9685 and QTR-8RC module figures. `probe.mjs` passes on all four (22/22, 23/23, 18/18, 19/19), the
lesson table shows every task's reference passing and its starter failing (8 tasks), and `/robotics/<id>` crawls clean
in all six locales at 390 px (the non-English pages carry only the known "figure strings not translated" note).

- **Mat parts are not in `ids.ts`.** The benches' buzzer, battery holder, motor driver, motors and LiPo are drawn but
  not listed, so the kit list misses them. Request: `P2-rob-sensors-to-driver-ids.md`.
- **The PCA9685's pulses are not in the headless trace.** The arm's tasks check what the sketch prints and contains,
  not the servo pulses. Request: `P2-rob-sensors-to-driver-pca9685-trace.md`.
- **A long Bench status ran over the drawing** when a model returned few stats. Worked around in my benches;
  engine-side fix requested: `P2-rob-sensors-to-P2-engine-b-stats-wrap.md`.
- **HC-SR04: the target is not drawn.** The module page owns the targets (`target()` in `figures/modules/hc-sr04.js`)
  and draws the sound rings, not the wall, hand or cushion; the module lies face up on the mat, so a target would hang
  over it. The status line and stats name the target and its distance. A drawn target is the module owner's call.
- **Wiring mistakes on the mat cannot be drawn.** Mat wires are fixed (`def.wires`), so faults like Trig and Echo
  swapped or Vcc on the 3V3 pin are played by the model (status, readings, rings) without moving a wire. The engine's
  circuit-part fault edits (`docs/FIGURES-BENCH.md` §6.4) cover breadboard circuits, not mat wires.
- **Built pages.** `public/figures/robotics/{qtr-8rc,pca9685,mpu6050,hc-sr04}.html` were built from the working tree,
  which held other agents' uncommitted engine edits at the time (`figures/engine/bench.js`, `bench-bb.js`); the
  driver's `cfbuild.py --all` at the end of the wave rebuilds them from what is committed.
- **Prose in other languages.** The four `src/i18n/content/en/robotics/*.json` files are English only (phase 3). No UI
  message keys were added, so `src/i18n/messages/*/robotics.json` (mine this wave) is unchanged and no
  `-to-phase3-strings` list was needed.
- **Figure text** (status lines, stats labels, mat step and fault labels in the bench files) is English through the
  figures' `T()`, like the other benches.
