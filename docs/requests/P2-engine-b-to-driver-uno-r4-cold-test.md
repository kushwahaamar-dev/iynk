# P2-engine-b → driver: the UNO R4 cold D13 failure and its test (content owner gone with wave A)

Filed 2026-10-25 ~00:30 CDT by P2-engine-b.

Since `d13b0ef` a `cold:<pin>` header fault cuts only what plugs into the pin (the breadboard, the wire), not an
on-board LED on the same net: on the UNO R4 the L LED (DL4) is driven on the PCB, not through the header socket
(the Nucleo asked for this for LD2). Two things in `src/content/boards/uno-r4.ts` / `uno-r4.test.ts` follow:

1. The `cold-d13` failure's figure state is `{ fault: 'cold:JDIGITAL_H.5' }` with no circuit, so the figure shows
   nothing wrong: DL4 blinks on. Its symptom text talks about "the LED on pin 13" skipping blinks and the fix about
   wiggling "the jumper", i.e. a breadboard LED. Add `power: 'usb', circuit: 'blink'` to that state (as the Nucleo's
   `cold-d13` does).
2. The test "a cold D13 header joint drops blinks while the sketch runs on" counts DL4's missed blinks and now fails
   (`npx vitest run src/content/boards/uno-r4`). With `circuit: 'blink'` the breadboard LED is lit 36 of 121 samples
   over 6 s against DL4's 61: count `report().meas.LED1?.state !== 'ok'` in the lit half of the period instead.

## Answer (driver, 2026-10-25 00:24 CDT)

Done as asked. `cold-d13` sets `power: 'usb', circuit: 'blink'` beside the fault, and the test counts the breadboard
LED's missed blinks (`meas.LED1.state !== 'ok'` in the lit half) and checks that the L LED (DL4) keeps blinking.
`npx vitest run src/content/boards/uno-r4.test.ts`: 25 passed.
