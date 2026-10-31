// Isomorphic avr8js harness (Node and Web Worker). No node imports here.
import {
  CPU, avrInstruction, AVRIOPort, portBConfig, portCConfig, portDConfig,
  AVRTimer, timer0Config, timer1Config, timer2Config, AVRUSART, usart0Config, AVRADC, adcConfig,
} from 'avr8js';

export const F_CPU = 16_000_000;

export function parseHex(text) {
  const prog = new Uint8Array(0x8000);
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith(':')) continue;
    const len = parseInt(line.substr(1, 2), 16);
    const addr = parseInt(line.substr(3, 4), 16);
    const type = parseInt(line.substr(7, 2), 16);
    if (type !== 0) continue;
    for (let i = 0; i < len; i++) prog[addr + i] = parseInt(line.substr(9 + i * 2, 2), 16);
  }
  return prog;
}

/**
 * Build an Uno-class ATmega328P: 3 timers, ports B/C/D, USART0, ADC at 16 MHz.
 * opts.pinEvents: record every pin change as {us, pin, v}. Pins named like Arduino digital numbers (D0..D13).
 * opts.adcScript: [{ms, value}] 10-bit counts set on ADC channel 0 at that simulated time (first entry at t<=0 is the start value).
 */
export function createUno(hexText, opts = {}) {
  const prog = parseHex(hexText);
  const progWords = new Uint16Array(prog.buffer);
  const cpu = new CPU(progWords, 8192);
  const portB = new AVRIOPort(cpu, portBConfig);
  const portC = new AVRIOPort(cpu, portCConfig);
  const portD = new AVRIOPort(cpu, portDConfig);
  new AVRTimer(cpu, timer0Config);
  new AVRTimer(cpu, timer1Config);
  new AVRTimer(cpu, timer2Config);
  const usart = new AVRUSART(cpu, usart0Config, F_CPU);
  const adc = new AVRADC(cpu, adcConfig);

  const pinEvents = [];
  const serialBytes = [];
  const lines = [];
  let lineBuf = '';
  const us = () => (cpu.cycles * 1e6) / F_CPU;

  // Arduino digital pin d -> port and bit: D0-7 = PORTD 0-7, D8-13 = PORTB 0-5, A0-A5 = PORTC 0-5 (pin 14-19)
  const watch = (port, base, mask) => {
    port.addListener((value, old) => {
      const diff = value ^ old;
      if (!diff) return;
      for (let b = 0; b < 8; b++) if (diff & (1 << b) & mask) pinEvents.push({ us: us(), pin: base + b, v: (value >> b) & 1 });
    });
  };
  if (opts.pinEvents !== false) {
    watch(portD, 0, 0xff);
    watch(portB, 8, 0x3f);
    watch(portC, 14, 0x3f);
  }
  usart.onByteTransmit = (b) => {
    serialBytes.push({ us: us(), b });
    if (b === 10) {
      lines.push({ us: us(), text: lineBuf.replace(/\r$/, '') });
      lineBuf = '';
    } else lineBuf += String.fromCharCode(b);
  };

  const script = (opts.adcScript ?? []).slice().sort((a, b) => a.ms - b.ms);
  // counts -> volts so that the avr8js conversion floor(v / avcc * 1024) returns exactly `counts`
  const volts = (counts) => ((counts + 0.5) / 1024) * adc.avcc;
  let nextScript = 0;
  const applyDue = () => {
    while (nextScript < script.length && script[nextScript].ms * (F_CPU / 1000) <= cpu.cycles) {
      adc.channelValues[script[nextScript].channel ?? 0] = volts(script[nextScript].value);
      nextScript++;
    }
  };

  /** Run until `ms` of simulated time have passed since power-on. Returns wall milliseconds spent. */
  function runTo(ms, now = () => performance.now()) {
    const target = Math.floor((ms * F_CPU) / 1000);
    const t0 = now();
    applyDue();
    while (cpu.cycles < target) {
      // run in slices so scripted ADC changes land within ~16 us of their time
      const slice = Math.min(target, cpu.cycles + 256);
      while (cpu.cycles < slice) {
        avrInstruction(cpu);
        cpu.tick();
      }
      applyDue();
    }
    return now() - t0;
  }
  return { cpu, adc, usart, pinEvents, serialBytes, lines, runTo, us };
}
