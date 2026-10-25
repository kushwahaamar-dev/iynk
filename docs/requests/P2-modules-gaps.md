# P2-modules gaps

Filed 2026-10-24 ~21:30 CDT by P2-modules. Everything in the section is done except what is listed here.

## 1. Nano `i2c` circuit: one line in P2-engine's file

Re-probe at `635bc7b` (all 7 boards built from HEAD into a scratch folder): `cfshoot.py` passes on every board's
default view, and 44 of the 45 lesson circuits draw every part they name. The one left is the Nano's `i2c`
(`?view=breadboard&circuit=i2c`): `bench: circuit part M1: unknown part "mpu6050"`, because
`figures/boards/nano.js` (P2-engine this wave) does not bundle `parts/mpu6050.js` yet. Request:
`P2-modules-to-P2-engine-nano-mpu6050.md`. P2-engine's working copy already has the line; built with HEAD's engine,
that copy draws all four Nano circuits clean (checked), so it closes when they commit and rebuild the Nano.

## 2. UNO R4 DAC resolution (P2-uno-r4's request), left for the driver

`analogWrite()` on the R4's DAC pin ignores `analogWriteResolution()`, and `analogRead()` does not read the DAC back.
That is the Arduino output path in `src/lib/interp/arduino/libs.ts`, outside this section's sensor inputs; the two
small changes are written out in `P2-uno-r4-to-P2-modules-r4-dac.md`.

## 3. Noticed, not mine

`figures/parts/hc-sr04.js` (the breadboard part, committed earlier, no owner this wave) says "12 MHz crystal" in its
header comment; `docs/facts/hcsr04.md` §3.1 trusts 4 MHz, which the new module figure uses. The drawing prints no
frequency, so only the comment is off.
