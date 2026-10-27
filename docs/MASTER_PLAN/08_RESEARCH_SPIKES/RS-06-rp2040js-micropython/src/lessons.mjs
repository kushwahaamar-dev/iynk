import os from 'os';
import fs from 'fs';
import { makeSim, runUntil } from './harness.mjs';
import { hookFlash } from './flashhook.mjs';
import { attachI2CSlave } from './i2cslave.mjs';

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
const which = process.argv[3];
const h = makeSim(process.argv[2]); const { mcu, sim, out } = h; const clk = sim.clock;
hookFlash(mcu);
runUntil(h, () => out.text.includes('>>> '), 60000);
const res = { lesson: which, load: os.loadavg()[0] };
const t0 = clk.nanos; const w0 = performance.now(), c0 = process.cpuUsage();
const mark = out.chunks.length;
if (which === 'blink') {
  const tr = { GP25: [], GP15: [] };
  for (const n of [25, 15]) mcu.gpio[n].addListener((st) => tr['GP' + n].push({ t: +((clk.nanos - t0) / 1e6).toFixed(3), v: st === 1 ? 1 : 0 }));
  h.send('\x05' + BLINK + '\x04');
  runUntil(h, () => clk.nanos - t0 > 4300e6, 10000);
  res.pins = tr;
} else {
  const regs = new Uint8Array(256); regs[0x75] = 0x68; regs[0x3f] = 0x40; regs[0x40] = 0x00;
  const i2c = mcu.i2c[0]; let ptr = 0, first = true;
  i2c.onStart = () => i2c.completeStart();
  i2c.onConnect = (a, m) => { first = m === 0; i2c.completeConnect(a === 0x68); };
  i2c.onWriteByte = (v) => { if (first) { ptr = v; first = false; } else regs[ptr++] = v; i2c.completeWrite(true); };
  i2c.onReadByte = () => i2c.completeRead(regs[ptr++]);
  i2c.onStop = () => i2c.completeStop();
  attachI2CSlave(mcu, 4, 5, 0x68);
  mcu.gpio[4].setInputValue(true); mcu.gpio[5].setInputValue(true);
  h.send('\x05' + I2C + '\x04');
  runUntil(h, () => clk.nanos - t0 > 2300e6, 10000);
}
res.simMs = +((clk.nanos - t0) / 1e6).toFixed(0);
res.wallMs = +(performance.now() - w0).toFixed(0);
res.cpuPct = +((process.cpuUsage(c0).user + process.cpuUsage(c0).system) / 1000 / (performance.now() - w0) * 100).toFixed(0);
res.serial = out.chunks.slice(mark).map(([t, s]) => [+(t - t0 / 1e6).toFixed(1), s]).filter(([, s]) => /found|who am|accel/.test(s));
res.tail = out.text.split('\r\n').filter((l) => /^(found \[|who am i 0x|accel z 1)/.test(l));
console.log(JSON.stringify(res));
