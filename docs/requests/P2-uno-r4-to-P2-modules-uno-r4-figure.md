# P2-uno-r4 → P2-modules: what the uno-r4 content needs from `figures/boards/uno-r4.js`

Filed 2026-10-24 ~19:50 CDT by P2-uno-r4 (owner of `src/content/boards/uno-r4.ts`, its test and prose). You own the
figure and its built page this wave. Ids below are the ones the content already uses; nothing here renames anything.

## 1. An `i2c-scan` circuit with the MPU-6050 (needs your module figure)

Lesson 5 (`i2c-scan`) runs on the MPU-6050 that P1-checks' world plumbing puts on the bus (device `mpu6050` at
0x68, world input `imu`, `part: 'MPU1'`); its reference passes the lesson table today. The figure has no circuit for
it, so the lesson shows the bare board (`circuit: null`) and the callout has nothing to point at. Asked, once
`figures/modules/mpu6050.js` exists:

```js
'i2c-scan': {
  title: 'MPU-6050 on the I2C header (SDA, SCL), 5 V', breadboard: 'half',
  parts: [{ id: 'MPU1', part: 'mpu6050', holes: [/* your module's legs: VCC, GND, SCL, SDA, (XDA, XCL, AD0, INT) */] }],
  wires: [
    { from: '5V', to: '<VCC hole>', color: 'red' }, { from: 'GND', to: '<GND hole>', color: 'black' },
    { from: 'SDA', to: '<SDA hole>', color: 'blue' }, { from: 'SCL', to: '<SCL hole>', color: 'yellow' },
  ],
},
```

Pins as the content's lesson table has them: SDA and SCL on the top header (same nets as A4/A5), 5V and GND from the
power header. AD0 left unconnected (it has a pull-down on the module, so the address is 0x68). When the circuit is in
the figure, tell me here and I switch the lesson to `circuit: 'i2c-scan'` (the content test checks every lesson
circuit exists in the figure, so I can't switch first).

## 2. Draw the parts the lesson circuits already name

Same as your brief: `button` uses `SW1` (`push-button`), `pot-pwm` uses `POT1` (`potentiometer`). The callouts in the
content point at `SW1`, `R1`, `POT1` and `LED1`.

## 3. Boot straps (after P2-engine answers `P2-uno-r4-to-P2-engine-straps.md`)

If P2-engine adds a declarative `straps` list to board defs, the uno-r4 figure would declare MD (`short:MD:GND`,
halts, ROM boot) on both variants and ESP_DOWNLOAD (`short:ESP_DOWNLOAD:GND`, ESP32-S3 download mode, USB bridge and
Serial gone, RA4M1 keeps running) on the WiFi, and drop its own `lastT`/`sample()` closure. The full shape is in that
request.

## 4. Nothing else changes

The assembly in the content uses only the toolbar's own ids (`strip`, `pnp`, `place` with `group-low` and
`group-tall`, `solder`, `upload` with `hello`, `ctl-pb1`), and both variants offer all of them today. If a rebuild
changes a group (a header moving from `low` to `tall`, the Qwiic box getting a group), the assembly still completes,
because its done conditions are `build` and `missing.length: 0`, not part counts.

## Answer from P2-modules (2026-10-24 ~20:50 CDT)

All three done in `figures/boards/uno-r4.js` and its built page (both variants):

1. **`i2c-scan` circuit**, ids as you asked: `MPU1` (`part: 'mpu6050'`, the new `figures/parts/mpu6050.js`) with its
   header in `i12`-`i19` (VCC GND SCL SDA XDA XCL AD0 INT); jumpers `5V → j12` (red), `GND → j13` (black),
   `SCL → j14` (yellow), `SDA → j15` (blue). AD0 stays open (the module's pull-down gives 0x68). The GY-521 lies over
   rows f-h, component side up, and its power LED lights on the live 5 V. You can switch the lesson to
   `circuit: 'i2c-scan'`; the circuit title is "MPU-6050 on the I2C header (SDA, SCL), 5 V". The part takes
   `params: { ad0: 'low' | 'high' }` (its tag then reads 0x68 or 0x69), if you want your address chip to map onto it
   with `figure: { part: 'MPU1', key: 'ad0' }`.
2. **Parts drawn**: the figure now bundles `parts/push-button.js`, `parts/potentiometer.js` and `parts/mpu6050.js`, so
   `SW1`, `POT1` and `MPU1` draw (`R1` and `LED1` always did). Checked every circuit of both variants in
   `?view=breadboard&circuit=<key>`: every part drawn, no engine notes.
3. **Straps**: both defs declare `straps` (Minima `[MD]`, WiFi `[MD, ESP_DOWNLOAD]`) with your shapes, and the
   `lastT`/`sample()`/`rom()` closure is gone. Checked on the built page: `short:MD:GND` on USB gives status `fault`
   with `fault.id` `short:MD:GND` and strap `rom` (Minima and WiFi); on the WiFi `short:ESP_DOWNLOAD:GND` keeps the
   sketch `running`, strap `esp-download`, and the Serial hello lines stop.

## P2-uno-r4, after the answer (2026-10-24 ~21:00 CDT)

Thanks, all three checked in `src/content/boards/uno-r4.test.ts` against the built page of both variants (parts,
header pins, circuits, every failure's report, both straps, the assembly from the panel's own commands). The i2c-scan
lesson now uses `circuit: 'i2c-scan'` with a callout on `MPU1` (`9994b79`). I left the address chip unmapped on
purpose: it picks the address the code asks, while the module stays at 0x68; the 0x69 option's note explains the
"No answer" it gets. One small thing left in your file, not blocking: the `dac-wave` circuit is still titled "DAC on
A0 read back on A1" with the A1 jumper in row 12, but the lesson no longer reads A1 (see
`P2-uno-r4-to-P2-modules-r4-dac.md`); "DAC on A0" with only the A0 jumper would match it.
