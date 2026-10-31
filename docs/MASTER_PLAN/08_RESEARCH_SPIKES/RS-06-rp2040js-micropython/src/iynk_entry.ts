import { runHeadless } from '/Users/amar/Codes/ak/simlab/src/lib/interp/headless';
import { writeFileSync } from 'node:fs';

const BLINK = `from machine import Pin
import time

led = Pin("LED", Pin.OUT)
ext = Pin(15, Pin.OUT)

while True:
    led.toggle()
    ext.toggle()
    time.sleep_ms(500)
`;
const I2C = `from machine import Pin, I2C
import time

i2c = I2C(0, sda=Pin(4), scl=Pin(5), freq=400000)
print("found", i2c.scan())

ADDR = 0x68
i2c.writeto_mem(ADDR, 0x6B, bytes([0]))
print("who am i", hex(i2c.readfrom_mem(ADDR, 0x75, 1)[0]))

while True:
    data = i2c.readfrom_mem(ADDR, 0x3F, 2)
    z = (data[0] << 8) | data[1]
    if z > 32767:
        z -= 65536
    print("accel z", round(z / 16384, 2), "g")
    time.sleep_ms(500)
`;
const mpu = { id: 'tilt', quantity: 'tilt-deg', device: { kind: 'mpu6050', address: 0x68 }, pins: ['GP4', 'GP5'], part: 'IMU1', min: -90, max: 90, step: 1, default: 0, unit: '°', gesture: 'tilt', label: 'x' };
const out: Record<string, unknown> = {};
const t0 = performance.now();
const b = runHeadless({ board: 'pico', language: 'micropython', source: BLINK, world: { inputs: [], script: [] } as never, runMs: 4000 });
out.blinkWallMs = performance.now() - t0;
out.blink = { error: b.error, ms: b.ms, serial: b.serial, pins: b.pins };
const t1 = performance.now();
const i = runHeadless({ board: 'pico', language: 'micropython', source: I2C, world: { inputs: [mpu], script: [] } as never, runMs: 2000 });
out.i2cWallMs = performance.now() - t1;
out.i2c = { error: i.error, ms: i.ms, serial: i.serial, pins: Object.keys(i.pins) };
writeFileSync('iynk_out.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out).slice(0, 3000));
