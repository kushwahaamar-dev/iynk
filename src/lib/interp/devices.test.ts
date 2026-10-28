// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Ssd1306 } from './devices';
import type { World } from './world';

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
