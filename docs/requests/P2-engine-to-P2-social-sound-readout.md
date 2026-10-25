# P2-engine → P2-social: tones to the figure, the figure's sound, and the readout for the new solver results

Filed 2026-10-24 ~21:00 CDT by P2-engine. Engine side done in `e61a5b8` (`figures/engine/bench-solve.js`, FIGURES-BENCH
§9 and §13 v7). Pages pick it up when the driver rebuilds every figure after the wave (`cfbuild.py --all`).

## 1. Send `tones` with the pins (BoardWorkspace / LessonWorkspace)

The figure accepts `set { tones: { D8: 440 } }` (Hz by net; a net left out or 0 is silent) and solves the buzzer from
it. Today the host sends only `pins`, so a buzzer in a lesson circuit never sees the sketch's `tone()`. Shape, beside
the pins you already send:

```ts
const tones = Object.fromEntries(Object.entries(s.pins).filter(([, p]) => p.hz && p.hz > 0).map(([net, p]) => [net, p.hz]));
patch.tones = tones;   // send {} when the last tone stops
```

## 2. Play what the figure sounds (optional, more honest than every tone() pitch)

The figure reports `state.sound = { part, hz, loud, how } | null` and sends a bridge event `tone` `{ part, hz, loud,
how }` whenever it changes (`hz: 0` = silence; arrives as `{ type: 'custom', name: 'tone', payload }` through
`parseFigureMessage`). It is non-null only when a buzzer is wired to the pin that plays: a buzzer on the wrong pin,
backwards (active) or missing stays silent (`state.sound` null), a steady HIGH on a passive one only clicks (drawn, not
sent), and `loud` falls away from the passive piezo's 4 kHz resonance (an active one driven by tone() is `how: 'rough'`). Part pages (`/figures/parts/piezo-buzzer.html`) send it for their
`freq` picker too. `useSketchTones` could play `state.sound` instead of the raw pin pitches on lessons that have a
buzzer, and the part page could play the `tone` event.

## 3. FigureReadout: `meas` now holds more than LEDs

`state.meas` now has an entry for every part the solver sees, each with a `kind`: `led` (as before: `i_mA`, `state`
`ok|off|burnt|reverse|open`, plus `ch` for an RGB LED), `npn`, `diode`, `motor`, `servo`, `sensor`, `pot`, `button`,
`buzzer`. `src/components/boardlab/FigureReadout.tsx` maps any state it does not know to "dark" and says "lit, N mA"
for every `ok`, so the motor lesson reads "MOT1: lit, 194 mA". Smallest fix:

```ts
const measItems = Object.entries(meas ?? {}).filter(([, m]) => !m.kind || m.kind === "led");
```

or a line per kind (motor "{part}: {v} V, {ma} mA", servo "{part}: {angle}°", transistor "{part}: on, {ma} mA").
State lists per kind are in FIGURES-BENCH §9.

## 4. `state.volts`

Every pin and input net in the lesson circuit reports its average volts: `state.volts = { A0: 2.47, D2: 4.95 }`. If
the interpreter's `analogRead` / `digitalRead` should follow the drawn circuit (a pot, an LDR, a button with its pull-
down), read them from here (P2-modules owns `src/lib/boardlab/inputs.ts`; copied to them as a note in this file).

## Answer (P2-social, 2026-10-24 ~21:10)

1. Done in `40005ae`. The tones don't go through the workspaces' own code, which never sent pins (`LessonRunner.sendPins`
   in `src/lib/boardlab/run.ts` does). They go in the store's `figureState` (`tones: sketchTones(s.pins)`, `{}` once
   the last tone stops), and both workspaces already send that as `set` patches. The sound e2e checks it end to end:
   on `/en/boards/uno-r3/sound` the figure's `state.sound.hz` reaches 262 once the sketch runs.
2. Done in `40005ae`. `useSketchTones` plays `state.sound` at its `loud` whenever the figure's report has a `sound`
   key, which means a lesson circuit on a figure with the solver. `null` is silent. A figure without the key gets every
   tone() pitch as before. The part page's `tone` event isn't played: part pages have no workspace of mine.
3. Not done: `src/components/boardlab/FigureReadout.tsx` isn't in P2-social's files and has no wave-A owner in the
   phase-2 table, so it stays with the driver. Your one-line `kind` filter is the smallest fix.
4. P2-modules' (`inputs.ts`).
