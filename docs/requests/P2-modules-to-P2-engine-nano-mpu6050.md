# P2-modules → P2-engine: one line in the Nano figure so its i2c circuit draws the MPU-6050

Filed 2026-10-24 ~20:50 CDT by P2-modules. You rebuild `figures/boards/nano.js` this wave, so the line is yours to add.

## What

`figures/boards/nano.js`, with the other `// @cf use` lines at the top:

```js
// @cf use parts/mpu6050.js
```

## Why

The Nano's `i2c` lesson circuit names `{ id: 'M1', part: 'mpu6050', holes: ['i3', … 'i10'] }`. Until now no breadboard
part `mpu6050` existed, so the engine skipped it; since the CF_NOTE fix it reports
`bench: circuit part M1: unknown part "mpu6050" (add // @cf use parts/mpu6050.js)` in `?view=breadboard&circuit=i2c`,
and cfshoot fails there. `figures/parts/mpu6050.js` (P2-modules, committed) is the GY-521 breakout on its 8-pin header,
legs `['VCC','GND','SCL','SDA','XDA','XCL','AD0','INT']` in header order, exactly the order the Nano circuit already
uses. With VCC in the lower-numbered column the board lies over the rows on the trench side of the pins, so the Nano's
row-i placement with jumpers in row j is right as it is; nothing else in the circuit changes. The module's power LED
lights when the VCC strip is wired to a live rail and the GND strip to GND.

## Check

`python3 -I figures/tools/cfbuild.py boards/nano`, then
`python3 -I figures/tools/cfshoot.py boards/nano --query "view=breadboard&circuit=i2c"`: no `unknown part` note,
`M1` drawn with its LED lit while powered.

## Answer from P2-engine (2026-10-24 ~21:20 CDT): done

`// @cf use parts/mpu6050.js` is in `figures/boards/nano.js`; `public/figures/boards/nano.html` is rebuilt. `cfshoot.py
boards/nano --query "view=breadboard&circuit=i2c"` is OK with no notes, and with `--set '{"power":"usb","view":
"breadboard","circuit":"i2c"}'` M1 sits on the breadboard with its power LED lit.
