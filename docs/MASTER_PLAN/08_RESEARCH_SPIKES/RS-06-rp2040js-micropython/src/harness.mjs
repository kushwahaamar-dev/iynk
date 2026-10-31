import fs from 'fs';
import { decodeBlock } from 'uf2';
import { Simulator, USBCDC, I2CMode } from 'rp2040js';
import { bootromB1 } from './bootrom.mjs';

export const FLASH_START = 0x10000000;
export function makeSim(uf2) {
  const sim = new Simulator();
  const mcu = sim.rp2040;
  mcu.loadBootrom(bootromB1);
  mcu.logger = { debug(){}, info(){}, warn(){}, error(m){ (globalThis.__errs ||= []).push(m); } };
  const buf = fs.readFileSync(uf2);
  for (let o = 0; o + 512 <= buf.length; o += 512) {
    const b = decodeBlock(new Uint8Array(buf.buffer, buf.byteOffset + o, 512));
    mcu.flash.set(b.payload, b.flashAddress - FLASH_START);
  }
  const cdc = new USBCDC(mcu.usbCtrl);
  const out = { text: '' };
  out.chunks = [];
  cdc.onSerialData = (v) => { const t = Buffer.from(v).toString('latin1'); out.text += t; out.chunks.push([sim.clock.nanos / 1e6, t]); };
  let connected = false;
  cdc.onDeviceConnected = () => { connected = true; cdc.sendSerialByte(13); cdc.sendSerialByte(10); };
  const send = (s) => { for (const c of Buffer.from(s, 'latin1')) cdc.sendSerialByte(c); };
  mcu.core.PC = 0x10000000;
  return { sim, mcu, cdc, out, send, isConnected: () => connected };
}

// Run the CPU synchronously (unpaced) in slices until predicate true or sim-time budget used.
export function runUntil(h, pred, maxSimMs = 20000) {
  const { mcu, sim } = h;
  const clock = sim.clock;
  const cycleNanos = 8;
  const t0 = clock.nanos;
  sim.stopped = false;
  while (!pred() && (clock.nanos - t0) < maxSimMs * 1e6) {
    for (let i = 0; i < 20000; i++) {
      if (mcu.core.waiting) {
        const n = clock.nanosToNextAlarm; clock.tick(n); i += n / cycleNanos;
      } else {
        clock.tick(mcu.core.executeInstruction() * cycleNanos);
      }
    }
  }
  return pred();
}

let n = 0;
// Run python in paste mode, wait for a marker that only the executed print can produce.
export function py(h, code, maxSimMs = 20000) {
  const tag = 'M' + (++n);
  const mark = h.out.text.length;
  h.send('\x05' + code + `\nprint("@@"+"${tag}")\n\x04`);
  const ok = runUntil(h, () => h.out.text.slice(mark).includes('\r\n@@' + tag), maxSimMs);
  let o = h.out.text.slice(mark);
  const i = o.lastIndexOf('===');
  // drop the paste-mode echo: everything up to the last marker-print echo
  const start = o.indexOf('\r\n', o.indexOf('print("@@"+"' + tag + '")')) ;
  return { ok, text: o.slice(start).replace('@@' + tag, '').trim() };
}
