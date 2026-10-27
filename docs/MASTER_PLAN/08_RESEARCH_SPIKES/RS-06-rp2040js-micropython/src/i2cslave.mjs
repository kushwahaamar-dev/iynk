// Open-drain I2C bus on two rp2040js GPIO pins plus a tiny slave that ACKs one address.
// Pull-ups are modelled by the line being high unless the master or the slave pulls it low.
import { GPIOPinState } from 'rp2040js';
export function attachI2CSlave(mcu, sdaPin, sclPin, address, log = []) {
  const sda = mcu.gpio[sdaPin], scl = mcu.gpio[sclPin];
  let slaveSdaLow = false;
  let lastSda = true, lastScl = true;
  let state = 'idle', bits = 0, shift = 0, matched = false;
  const masterLow = (p) => p.value === GPIOPinState.Low;
  const resolve = () => {
    const s = !(masterLow(sda) || slaveSdaLow);
    const c = !masterLow(scl);
    return [s, c];
  };
  const update = () => {
    const [s, c] = resolve();
    sda.setInputValue(s); scl.setInputValue(c);
    if (s !== lastSda || c !== lastScl) {
      const sdaEdge = s !== lastSda, sclEdge = c !== lastScl;
      lastSda = s; lastScl = c;
      if (sdaEdge && !sclEdge && c) {
        if (!s) { state = 'addr'; bits = 0; shift = 0; matched = false; log.push('START'); }
        else { state = 'idle'; log.push('STOP'); }
      } else if (sclEdge && c && (state === 'addr' || state === 'data') && bits < 8) {
        shift = (shift << 1) | (s ? 1 : 0); bits++;
      } else if (sclEdge && !c) {
        if ((state === 'addr' || state === 'data') && bits === 8) {
          if (state === 'addr') { matched = (shift >> 1) === address; log.push('ADDR 0x' + (shift >> 1).toString(16) + (shift & 1 ? ' R' : ' W') + (matched ? ' ACK' : ' NACK')); }
          else log.push('BYTE 0x' + shift.toString(16));
          if (matched) { slaveSdaLow = true; state = state + 'ack'; } else state = 'idle';
          update();
        } else if (state === 'addrack' || state === 'dataack') {
          slaveSdaLow = false; state = 'data'; bits = 0; shift = 0;
          update();
        }
      }
    }
  };
  for (const p of [sda, scl]) p.addListener(() => update());
  update();
  return log;
}
