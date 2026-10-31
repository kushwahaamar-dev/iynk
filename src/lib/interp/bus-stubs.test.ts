import { describe, expect, it } from 'vitest';
import { InterpError } from './errors';
import { BOARD_IDS, PROFILES } from './profiles';
import { createRun, type RunOptions } from './run';

function boot(source: string, board: RunOptions['board'], language: RunOptions['language'] = 'arduino') {
  const run = createRun({ board, source, language });
  let serial = '';
  const errors: InterpError[] = [];
  run.on('serial', (t) => (serial += t));
  run.on('error', (e) => errors.push(e));
  run.start();
  for (let t = 0; t < 200; t += 16) run.step(16);
  return { run, out: () => serial, errors };
}

describe('devices the simulator does not model fail loudly', () => {
  it('SPI.transfer raises at its line and prints nothing', () => {
    const { errors, out } = boot(`#include <SPI.h>
void setup() {
  Serial.begin(9600);
  SPI.begin();
  byte v = SPI.transfer(0x55);
  Serial.println(v);
}
void loop() {}`, 'uno-r3');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('bus-device-not-modelled');
    expect(errors[0].kind).toBe('unsupported');
    expect(errors[0].line).toBe(5);
    expect(errors[0].message).toBe('SPI.transfer() is not modelled yet. Your code is not wrong.');
    expect(out()).not.toContain('0');
  });

  it('SPI configuration calls stay no-ops', () => {
    const { errors } = boot(`#include <SPI.h>
void setup() {
  SPI.begin();
  SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE0));
  SPI.endTransaction();
  SPI.setClockDivider(4);
}
void loop() {}`, 'uno-r3');
    expect(errors).toEqual([]);
  });

  it('Serial1 output raises while Serial and the monitor input are untouched', () => {
    const src = `void setup() {
  Serial.begin(115200);
  Serial1.begin(9600);
  Serial.println("ok");
  Serial1.println("x");
}
void loop() {}`;
    const { errors, out } = boot(src, 'esp32-devkitc');
    expect(out()).toContain('ok');
    expect(out()).not.toContain('x');
    expect(errors[0].code).toBe('bus-device-not-modelled');
    expect(errors[0].line).toBe(5);
  });

  it('Serial1 reads nothing and leaves the monitor bytes to Serial', () => {
    const run = createRun({
      board: 'esp32-devkitc',
      language: 'arduino',
      source: `void setup() {
  Serial.begin(115200);
  Serial1.begin(9600);
}
void loop() {
  Serial.print(Serial1.available());
  Serial.print(Serial1.read());
  Serial.print(" ");
  Serial.println(Serial.read());
  delay(100);
}`,
    });
    let serial = '';
    run.on('serial', (t) => (serial += t));
    run.world.feedSerial('A');
    run.start();
    run.step(16);
    expect(serial.split('\r\n')[0]).toBe('0-1 65');
  });

  it('Pico MicroPython refuses Pin(99) and machine.SPI / UART', () => {
    const pin = boot('from machine import Pin\nPin(99)\n', 'pico', 'python');
    expect(pin.errors[0].message).toBe('ValueError: invalid pin 99');
    expect(pin.errors[0].code).toBe('invalid-pin');
    expect(pin.errors[0].line).toBe(2);

    for (const bus of ['SPI(0)', 'UART(0)', 'SoftSPI(baudrate=1000)']) {
      const { errors } = boot(`import machine\nx = 1\nmachine.${bus}\n`, 'pico', 'python');
      expect(errors[0].code).toBe('bus-device-not-modelled');
      expect(errors[0].line).toBe(3);
    }
  });

  it('Pico MicroPython still takes real pins', () => {
    const { errors } = boot('from machine import Pin\nPin(25, Pin.OUT)\nPin("LED", Pin.OUT)\n', 'pico', 'python');
    expect(errors).toEqual([]);
  });

  it('Pin(1000) is refused on every board with machine.Pin', () => {
    for (const id of BOARD_IDS.filter((b) => PROFILES[b].languages.includes('python') && b !== 'microbit-v2' && b !== 'pi4-pi5')) {
      const { errors } = boot('from machine import Pin\nPin(1000)\n', id, 'python');
      expect(errors[0]?.code, id).toBe('invalid-pin');
    }
  });

  it('keeps a code through the position step', () => {
    const err = new InterpError('unsupported', 'x', null, undefined, { code: 'invalid-pin' });
    expect(err.at({ line: 4, col: 2 })).toMatchObject({ line: 4, col: 2, code: 'invalid-pin', kind: 'unsupported' });
  });
});
