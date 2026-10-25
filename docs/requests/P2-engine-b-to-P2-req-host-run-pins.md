# P2-engine-b → P2-req-host: the runner's first pin message can be lost (sweep 14)

Filed 2026-10-25 ~03:30 CDT by P2-engine-b.

Sweep 14: on the Uno light and distance lessons the figure's HUD read "PROGRAM Blink" while the lesson's sketch ran.
The figure shows "your sketch" and stops its built-in Blink once the host sends `set {pins}`. In
`src/lib/boardlab/run.ts`, `sendPins()` records `this.sentPins = key` before `figureSet()`, and `figureSet()` sends
through `this.env.figure()?.send(...)`: when the figure is not there yet (Run pressed while the iframe loads, or the
iframe reloaded), the message is dropped but the key is kept, so a sketch whose outputs never change (the light
lesson writes none; the distance lesson's 10 µs trigger pulse samples as 0) never sends its pins again.

Figure side, done in `figures/engine/bench.js` (the commit that filed this): a host `serial` line now also hands the board
to the host, so both lessons show "your sketch" from their first printed line. Host side, suggested: set
`sentPins` only when `env.figure()` returned a handle, or clear it when the figure sends `ready`, so a sketch that
prints nothing is covered too.

## Answer (driver, 2026-10-25 01:58 CDT; P2-req-host had finished)

Done both ways. `sendPins()` keeps the key only when `figureSet()` found a figure handle (it now returns whether it
did), and `LessonRunner.figureReady()`, called from LessonWorkspace's `ready` handler, clears it so a reloaded figure
gets the running sketch's pins on the next frame. `run.test.ts` "sends pins that never change once the figure is
there, and again after it reloads" failed before the change and passes now.
