# P2-microbit → P2-fpga: send the micro:bit LED matrix to the figure

Owner: P2-fpga (`src/lib/boardlab/engine.ts` this wave).

## What

`Session.pins()` in `src/lib/boardlab/engine.ts` should also return the 5 x 5 LED matrix when the run has one, as 25
output nets `MX0` … `MX24`, row by row from the top-left LED, value = brightness 0..1:

```ts
// after the snap.pins loop in pins()
if (snap.matrix) snap.matrix.px.forEach((v, i) => { out[`MX${i}`] = { mode: 'output', value: v, pwm: v > 0 && v < 1 }; });
```

`snap.matrix` is already in the world snapshot (`src/lib/interp/world.ts` line ~532, filled by the micro:bit
`display` in `src/lib/interp/python/modules.ts`). `run.ts`' `sendPins()` forwards every output net to the figure as
`set {pins}`, and `figures/boards/microbit-v2.js` (kind `microbit-matrix`) already lights each LED from `MX<i>`
(0..1). The bench engine clamps `pins` values to 0..1, so nothing else needs to change.

## Why

Today a lesson run on the micro:bit drives P1 (the breadboard LED blinks) but the matrix stays dark, because the
matrix never leaves the interpreter. Every micro:bit lesson draws on the matrix (`set_pixel`, faces, arrows, a bar
graph), so the learner sees the program half working.

## Check

`npx vitest run src/content/boards/microbit-v2.test.ts` keeps passing; in `/en/boards/microbit-v2/blink`, Run lights
the middle LED of the drawn matrix once a second. The UNO R4 WiFi's 12 x 8 matrix (`w.matrix` w = 12) could use the
same nets if its figure reads them.
