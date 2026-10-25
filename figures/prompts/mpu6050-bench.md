# Fig. 09 — MPU-6050 tilt alarm (Robotics Bench, Colorfigures prompt)

The bench around the GY-521 module figure (`figures/modules/mpu6050.js`, its own prompt in `mpu6050.md`):
`figures/robotics/mpu6050.js`. Facts in `docs/facts/mpu6050.md`.

On the pale green mat (mustard palette) the blue GY-521 stands on its 8-pin header; an **Arduino Nano** lies to its left
and a black 12 mm **piezo buzzer** to its right. Jumpers: VCC to the Nano's 5V, GND, SCL to A5, SDA to A4; the buzzer's
+ to D8 and - to GND. While a sketch reads the chip, an orange arrow over the QFN shows gravity as the accelerometer
sees it, tipping as the board rocks.

What it does:

- **Set up the mat ▾**: the Nano and its four wires, then the buzzer.
- **Upload sketch ▾**: Raw readings (wake the chip, read 14 bytes from 0x3B once a second: about 1.00 g on Z and the
  gyro's few °/s of offset), Tilt alarm (roll = atan2(ay, az) while the board rocks 30° about X every 5 s; past 20° the
  buzzer sounds at 2 kHz and glows), Never woken (every reading 0, no arrow), I2C scan (0x68).
- **Model**: what the sketch reads, as counts turned into g and °/s; a read nobody answers comes back as -1 on every
  axis, roll -135°, and sets the alarm off on a robot standing still.
- **Break it ▾**: VCC reversed and 7.4 V on VCC (the 662K burns), C14 left out (the gyro reads noise), R6 left out
  (the chip moves to 0x69: false alarm), a cold SDA joint (short false alarms), C10 backwards (hot).

State the host reads: `status`, `power`, `mode`, `matStep`, `rails.VCC`, `rails.3V3`, `imu.roll`, `imu.az`, `imu.gx`,
`imu.addr`, `imu.alarm`, `imu.faulty`, `readings.BUZ`, `faults`, `missing`. The lesson is
`src/content/robotics/mpu6050.ts`.

Look: Colorfigures palette, warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble, paper grain. Works
on a phone and inside the SimLab host (embedded, bare).
