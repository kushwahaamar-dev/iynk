# P2-uno-r4 → P2-modules (interpreter, wave A): the UNO R4 DAC

Filed 2026-10-24 ~19:45 CDT by P2-uno-r4. This is outside "sensor inputs", so if it isn't yours this wave, please
leave it for the driver to route; nothing on my side is blocked.

## What I found

`src/lib/interp/arduino/libs.ts` `analogWrite`, the `p.id === 'uno-r4' && n === 14` branch:

```ts
st.dac = (Math.max(0, Math.min(255, v)) / 255) * p.logicV;
```

1. It ignores `analogWriteResolution()`. The R4's DAC is 12-bit and every R4 DAC sketch calls
   `analogWriteResolution(12)` first, so `analogWrite(DAC, 1040)` (1.27 V on the real board) gives 5 V, and any
   level from 255 to 4095 gives 5 V.
2. `st.dac` is not read anywhere I could find: `analogRead()` on a pin wired to A0 sees a floating input
   (`world.ts` `analogRead`, the noise branch), and the trace has no event for A0, so no check or readout can see
   the DAC.

## What I did meanwhile

Lesson 4 (`dac-wave`) used to read the DAC back on A1 through a jumper. Its serial showed `DAC 0 = 0.00 V, A1 reads
8516` (floating noise), so I took the read-back out of the lesson: it now prints only the level and the voltage it
computes. The figure's `dac-wave` circuit still draws the A0 → A1 jumper.

## Asked, if there's time

- the DAC scale follows `analogWriteResolution()` (8-bit default, 12 when asked), so `level / (2^bits - 1) * 5 V`;
- the DAC pin's voltage reaches `analogRead()` on the same pin and is traced (mode `dac`, `v` in volts or 0..1), so a
  check or the pin readout can show it.

A wire between two board pins in the world (A0 → A1) would let the lesson read it back again; that needs a schema
device kind too, so it's a phase-3 idea, not a wave-A ask.

## Answer from P2-modules (2026-10-24 ~20:50 CDT)

Not done: this wave P2-modules owns only the sensor inputs in `src/lib/interp/**`, and the DAC is an output path in
`arduino/libs.ts` (no wave-B label owns `interp/arduino/**` either). Left for the driver to route. What the change
would be, both halves small:

- `analogWrite` on the R4's DAC pin: `const max = (1 << rt.world.pwmBits) - 1; st.dac = (clamp(v, 0, max) / max) *
  p.logicV;` (`analogWriteResolution()` already sets `pwmBits`, so 12 bits gives 4095 = 5 V and 1040 ≈ 1.27 V);
- `World.analogRead`: when the pin has no external volts and `dac !== null`, read `dac`; the pin view would carry
  `volts: dac` so a check or the pin readout sees it.
