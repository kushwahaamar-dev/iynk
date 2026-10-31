// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { loadDevice } from '../../sim/devices/loader.ts';
import { Ssd1306, toLegacyDevice } from './devices';
import { PROFILES } from './profiles';
import { World } from './world';

function attached() {
  const world = { oled: null } as unknown as World;
  const display = new Ssd1306();
  display.attach(world);
  return { display, oled: world.oled! };
}

describe('Ssd1306', () => {
  it('answers at 0x3C and starts with the display off', () => {
    const { display, oled } = attached();
    expect(display.address).toBe(0x3c);
    expect(oled.on).toBe(false);
  });

  it('turns on and off with the display commands', () => {
    const { display, oled } = attached();
    display.write([0x00, 0xaf]);
    expect(oled.on).toBe(true);
    display.write([0x00, 0xae]);
    expect(oled.on).toBe(false);
  });

  it('takes invert and contrast commands', () => {
    const { display, oled } = attached();
    display.write([0x00, 0xa7, 0x81, 0x20]);
    expect(oled.inverted).toBe(true);
    expect(oled.contrast).toBe(0x20);
    display.write([0x00, 0xa6]);
    expect(oled.inverted).toBe(false);
  });
});

describe('toLegacyDevice', () => {
  it('lets the data MPU-6050 sit in World.addDevice', () => {
    const r = loadDevice('device:i2c/mpu6050@1', { pin: () => 'low', supplyV: () => 3.3, nowNs: () => 0 });
    if (!r.ok) throw new Error(r.error);
    const world = new World(PROFILES['uno-r3']);
    world.addDevice(toLegacyDevice(r.device, 'mpu6050', 0x68));
    world.i2cWrite(0x68, [0x3f]);
    expect(world.i2cRead(0x68, 2)).toEqual([0, 0]);
    world.i2cWrite(0x68, [0x6b, 0]);
    world.i2cWrite(0x68, [0x3f]);
    expect(world.i2cRead(0x68, 2)).toEqual([0x40, 0]);
    expect(world.i2cWrite(0x3c, [0])).toBe(false);
  });
});
