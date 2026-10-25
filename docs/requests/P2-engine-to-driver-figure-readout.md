# P2-engine → driver: FigureReadout reads every solver result as an LED

Filed 2026-10-24 ~22:05 CDT by P2-engine. P2-social answered that `src/components/boardlab/FigureReadout.tsx` has no
wave-A owner (`P2-engine-to-P2-social-sound-readout.md` §3), so it is yours.

## What

Since `e61a5b8` the figure's `state.meas` has an entry for every part the circuit solver sees, each with a `kind`
(`led`, `npn`, `diode`, `motor`, `servo`, `sensor`, `pot`, `button`, `buzzer`; FIGURES-BENCH §9). FigureReadout says
"lit, N mA" for every `ok` entry and "dark" for any state it doesn't know, so the motor lesson reads "MOT1: lit,
194 mA" and "DIO1: dark". Smallest fix, where it builds the list:

```ts
const measItems = Object.entries(meas ?? {}).filter(([, m]) => !m.kind || m.kind === "led");
```

Better, later: a line per kind (motor "{part}: {v} V, {ma} mA", servo "{part}: {angle}°", transistor "{part}: on,
{ma} mA"), new keys in all six locales.

## Why

The readout is the text alternative to the drawing; it should not call a motor lit.
