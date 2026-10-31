import os from 'os';
import fs from 'fs';
import { makeSim, runUntil, py } from './harness.mjs';
import { hookFlash } from './flashhook.mjs';
import { attachI2CSlave } from './i2cslave.mjs';
import { I2CMode } from 'rp2040js';

const uf2 = process.argv[2];
const h = makeSim(uf2);
const { mcu, sim, out } = h;
const clk = sim.clock;
const flash = hookFlash(mcu);
const res = { uf2, loadStart: os.loadavg()[0] };

// boot
const w0 = performance.now(), c0 = process.cpuUsage();
res.boot = runUntil(h, () => out.text.includes('>>> '), 60000);
res.bootSimMs = +(clk.nanos / 1e6).toFixed(2); res.bootWallMs = +(performance.now() - w0).toFixed(1);
res.bootCpuMs = +((process.cpuUsage(c0).user + process.cpuUsage(c0).system) / 1000).toFixed(1);
res.bootText = out.text.replace(/\r/g, '').trim().slice(-120);
res.flashOps = { ...flash, table: undefined };

// 1. blink with GPIO 25 timing
const trans = [];
mcu.gpio[25].addListener((st) => trans.push([+(clk.nanos / 1e6).toFixed(3), st === 1 ? 1 : 0]));
let t0 = clk.nanos, wt = performance.now();
let r = py(h, "from machine import Pin\nimport time\nled = Pin(25, Pin.OUT)\nfor i in range(6):\n    led.toggle()\n    time.sleep_ms(100)\nprint('blink-done')", 5000);
res.blink = { ok: r.ok, text: r.text.split('\n')[0], simMs: +((clk.nanos - t0) / 1e6).toFixed(1), wallMs: +(performance.now() - wt).toFixed(1), transitions: trans };
res.blink.intervalsMs = trans.slice(1).map((x, i) => +(x[0] - trans[i][0]).toFixed(3));

// 2. ADC
const adc = [];
for (const [raw12, label] of [[0, 'zero'], [1000, 'raw1000'], [2048, 'mid'], [4095, 'full']]) {
  mcu.adc.channelValues[0] = raw12;
  const rr = py(h, "import machine\nprint(machine.ADC(26).read_u16())");
  adc.push({ injected12bit: raw12, read_u16: rr.text.split('\n')[0] });
}
res.adc = adc;

// 3. Filesystem
t0 = clk.nanos;
r = py(h, "f=open('t.txt','w'); n=f.write('hello iynk'); f.close()\nprint('wrote', n)\nprint('read', open('t.txt').read())\nimport os\nprint(os.listdir())\nprint(os.stat('t.txt')[6])", 20000);
res.fs = { ok: r.ok, text: r.text, simMs: +((clk.nanos - t0) / 1e6).toFixed(1), flashOps: { erase: flash.erase, program: flash.program, bytes: flash.bytesProgrammed } };
// persistence across a soft reset of Python state: reboot chip with same flash
const snapshot = Uint8Array.from(mcu.flash);

// 4a. Hardware I2C peripheral stub at 0x48 (readfrom / readfrom_mem)
const i2c = mcu.i2c[0]; const hwlog = []; let reg = 0; const regs = [0x12, 0x34, 0x56];
i2c.onStart = () => i2c.completeStart();
i2c.onConnect = (a, m) => { hwlog.push(`conn 0x${a.toString(16)} ${m === I2CMode.Read ? 'R' : 'W'}`); i2c.completeConnect(a === 0x48); };
i2c.onWriteByte = (v) => { hwlog.push('w ' + v); reg = v; i2c.completeWrite(true); };
i2c.onReadByte = () => { const v = regs[reg++ % 3]; hwlog.push('r ' + v); i2c.completeRead(v); };
i2c.onStop = () => i2c.completeStop();
t0 = clk.nanos;
r = py(h, "i2c0 = machine.I2C(0, sda=machine.Pin(4), scl=machine.Pin(5), freq=400000)\nprint(i2c0.readfrom_mem(0x48, 0, 3))\ni2c0.writeto(0x48, b'\\x01')\nprint(i2c0.readfrom(0x48, 2))\ntry:\n    i2c0.readfrom(0x49, 1)\nexcept OSError as e:\n    print('nack', e)", 20000);
res.i2cHardware = { ok: r.ok, text: r.text, log: hwlog.slice(0, 20), simMs: +((clk.nanos - t0) / 1e6).toFixed(1) };

// 4b. scan(): MicroPython probes with zero-length writes, which it bit-bangs on the pins
const sblog = attachI2CSlave(mcu, 6, 7, 0x48);
mcu.gpio[6].setInputValue(true); mcu.gpio[7].setInputValue(true);
t0 = clk.nanos; wt = performance.now();
r = py(h, "i2c1 = machine.SoftI2C(sda=machine.Pin(6), scl=machine.Pin(7), freq=100000)\nprint('scan', i2c1.scan())", 20000);
res.i2cScanSoft = { ok: r.ok, text: r.text, simMs: +((clk.nanos - t0) / 1e6).toFixed(1), wallMs: +(performance.now() - wt).toFixed(1), busEvents: sblog.slice(0, 6), nEvents: sblog.length };
// scan on hardware I2C 1 using pins 2/3 with the same pull-up model
const sblog2 = attachI2CSlave(mcu, 2, 3, 0x48);
mcu.gpio[2].setInputValue(true); mcu.gpio[3].setInputValue(true);
mcu.i2c[1].onStart = () => { }; // leave hw i2c1 unattached
t0 = clk.nanos;
r = py(h, "i2c2 = machine.I2C(1, sda=machine.Pin(2), scl=machine.Pin(3))\nprint('hwscan', i2c2.scan())", 20000);
res.i2cScanHw = { ok: r.ok, text: r.text, simMs: +((clk.nanos - t0) / 1e6).toFixed(1), busEvents: sblog2.slice(0, 4) };

res.loadEnd = os.loadavg()[0];
res.errs = [...new Set(globalThis.__errs ?? [])].slice(0, 10);
console.log(JSON.stringify(res, null, 1));
