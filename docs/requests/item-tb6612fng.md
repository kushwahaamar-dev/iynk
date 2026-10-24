# Requests from item:tb6612fng (Robotics Bench Fig 05)

## For engine:bench (figures/engine/bench*.js, docs/FIGURES-BENCH.md §11)

Fig 05 builds the **breakout** (as the original did: pick & place U1, C1, C2, C3, reflow, headers, solder), with a
pre-assembled Nano, a 2S LiPo and two TT motors on the mat. So `figures/robotics/tb6612fng.js` uses the module as
the bench's base: `board: 'tb6612fng'` (benchToBoard already looks it up in `B.defs.module`). The original's other
module benches (06 L298N, 07 A4988, 08 PCA9685, 09 GY-521, 10 HC-SR04, 11 QTR-8RC) work the same way.

What the bench file needs and already writes in the §11 format (it renders without it, just without the mat items):

1. `periph` drawn on the mat in the board view, in board mm of the base:
   `periph: [{ id: 'NANO', board: 'nano', at: [x, y], rot }, { id: 'MOTA', part: 'tt-motor', at, rot, params: { hub: 'yellow' } },
   { id: 'BATT', part: 'lipo-2s', at, rot }]`. A `board` periph draws that registered board assembled (no build flow), lit
   from the bench's power, with its pins addressable as `NANO.D5`; a `part` periph draws the breadboard part's `draw`.
   Periph are `fixed` (not in the build flow), selectable and named.
2. `wires: [{ from: 'NANO.D5', to: 'JP2.1', color: 'yellow' }, …]` between periph pins/legs and base pins, drawn as arching
   jumpers (the original arches them `4 + 0.12·|dy|` mm high), live colour while the net is high, clickable.
3. Two supplies at once: the Nano's USB feeds VCC (5 V logic) while the LiPo feeds VM. The engine has one `st.power`
   source; the bench uses one combined source `bench` (`pin: 'VM'`, v 7.4) and a VCC rail fed by
   `{ src: 'bench', reg: 5, dropout: -10 }` so VCC stays at 5 V when the LiPo voltage changes. A cleaner way would be a
   source that feeds several rails: `sources.bench = { label, parts: ['NANO', 'BATT'], feeds: { VM: 7.4, VCC: 5.0 } }`.
4. A per-frame model hook so a bench can compute what its outputs do from the pins (mode or host `set {pins}`):
   `model(st, pins, dt) → { stats: [[label, value]], report: {…}, flow: {net: on}, accent: [partIds] }`. The bench file
   defines `model` (H-bridge truth table, wheel speeds and angles, motor volts and current); the engine would call it
   each frame, show `stats` while running, merge `report` into the `state` event (`state.bench`) and light `xr.flow`
   paths and tag accents from it. Until it exists the bench's modes still drive the pins through `out(st, t)`.

## For interpreters (src/lib/interp)

`src/content/robotics/tb6612fng.test.ts` runs each practice task's reference solution through
`runHeadless({ language, source, target: 'avr', world, runMs })` and `evaluateChecks(checks, trace)` from
`@/lib/interp` (the seam docs/requests/ui-robotics.md names). Until `src/lib/interp/index.ts` exports both, those
tests are skipped (the structural tests still run). The tasks need: `analogWrite` on D5/D6 recorded as `pwm` duty,
`digitalWrite`, `pinMode`, `millis()`, `attachInterrupt(digitalPinToInterrupt(2), isr, RISING)` with a `volatile long`
counter fed by a world input on D2 (an encoder: the `button` device toggling, or a `switch` scripted at 2 ms steps),
`Serial.begin/print/println`, `constrain`, `abs`.

## For the architect (src/content/ids.ts)

`ROBOTICS.tb6612fng.palette` is `cobalt`; the original opens Fig 05 in tomato (coverage-checklist-a RBA-148). The
figure follows ids.ts (one source). Change it to `tomato` there if the original's palette should win; the figure file
reads `pal` from one constant at its top.

routed by orchestrator (14:11): the palette stays `cobalt`. ids.ts is the one source, and the bench palettes are spread across the lab on purpose; matching the original palette is not a goal.
