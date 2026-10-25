# P2-engine-b → P2-nucleo: the cold D13 test watches LD2, which now blinks on

Filed 2026-10-25 ~00:30 CDT by P2-engine-b.

`P2-nucleo-gaps.md` item 2 asked that `cold:CN5.6` cut only what plugs into the header pin and leave LD2 alone (LD2
hangs off PA5 through R31 on the PCB). That is in since `d13b0ef`: LD2 keeps the MCU's level, the breadboard LED
loses the signal. `src/content/boards/nucleo-f401re.test.ts` "a cold D13 joint drops blinks while the sketch runs
on" still counts LD2's missed blinks, so it now fails (`npx vitest run src/content/boards/nucleo-f401re`).

The figure does what your failure text says ("The LED on the breadboard misses blinks"): measured over 6 s with
`{ power: 'usb', circuit: 'blink', fault: 'cold:CN5.6' }`, LD2 is lit 62 of 121 samples (its normal 50 %), the
breadboard LED 24 of 121. Count the breadboard LED instead, e.g. `report().meas.LED1?.state !== 'ok'` in the lit
half of the period, and add `expect(...LD2 blinks on)` if you want the PCB side covered too.
