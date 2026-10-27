import { Simulator, USBCDC } from 'rp2040js';
import { bootromB1 } from './bootrom.mjs';

function loadUF2(mcu, buf) {
  const dv = new DataView(buf);
  for (let o = 0; o + 512 <= buf.byteLength; o += 512) {
    const addr = dv.getUint32(o + 12, true), size = dv.getUint32(o + 16, true);
    mcu.flash.set(new Uint8Array(buf, o + 32, size), addr - 0x10000000);
  }
}
window.runSpike = async function (url, simMsTarget) {
  const buf = await (await fetch(url)).arrayBuffer();
  const sim = new Simulator(); const mcu = sim.rp2040; const clk = sim.clock;
  mcu.loadBootrom(bootromB1);
  mcu.logger = { debug() {}, info() {}, warn() {}, error() {} };
  loadUF2(mcu, buf);
  const cdc = new USBCDC(mcu.usbCtrl); let text = '';
  cdc.onSerialData = (v) => { text += new TextDecoder('latin1').decode(v); };
  cdc.onDeviceConnected = () => { cdc.sendSerialByte(13); cdc.sendSerialByte(10); };
  mcu.core.PC = 0x10000000;
  const run = (pred, maxMs) => {
    const t0 = clk.nanos;
    while (!pred() && clk.nanos - t0 < maxMs * 1e6) {
      for (let i = 0; i < 20000; i++) {
        if (mcu.core.waiting) { const n = clk.nanosToNextAlarm; clk.tick(n); i += n / 8; }
        else clk.tick(mcu.core.executeInstruction() * 8);
      }
    }
  };
  const w0 = performance.now();
  run(() => text.includes('>>> '), 60000);
  const boot = { simMs: clk.nanos / 1e6, wallMs: performance.now() - w0, text: text.slice(-60) };
  // REPL idle for simMsTarget sim ms
  const s1 = clk.nanos, w1 = performance.now();
  run(() => clk.nanos - s1 >= simMsTarget * 1e6, simMsTarget + 10);
  const idle = { simMs: (clk.nanos - s1) / 1e6, wallMs: performance.now() - w1 };
  // blink loop for simMsTarget sim ms
  const trans = []; mcu.gpio[25].addListener((st) => trans.push(clk.nanos / 1e6));
  const prog = "from machine import Pin\nimport time\nled=Pin(25,Pin.OUT)\nwhile True:\n    led.toggle()\n    time.sleep_ms(100)\n";
  for (const c of '\x05' + prog + '\x04') cdc.sendSerialByte(c.charCodeAt(0));
  const s2 = clk.nanos, w2 = performance.now();
  run(() => clk.nanos - s2 >= simMsTarget * 1e6, simMsTarget + 10);
  const blink = { simMs: (clk.nanos - s2) / 1e6, wallMs: performance.now() - w2, toggles: trans.length };
  return { boot, idle, blink, ua: navigator.userAgent };
};
