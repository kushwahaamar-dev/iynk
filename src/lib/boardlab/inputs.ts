// How a world input appears in the World panel. What a value does to the pins (a pull-down
// button reads HIGH when pressed, a pot divides the supply, an HC-SR04 echoes after 58 µs/cm)
// lives in src/lib/interp/lesson-world.ts, the same code the check run uses.

import type { WorldInput } from '@/content/schema';

export { drivesFor, type PinDrive } from '@/lib/interp';

export type InputControl =
  /** Held while pressed: buttons, touch pads. */
  | { kind: 'hold' }
  | { kind: 'switch' }
  /** A value between min and max: pots, light, distance, tilt, line position. */
  | { kind: 'slider' }
  /** One button per request a phone on the Wi-Fi can send ("GET /on"); the value is its index. */
  | { kind: 'requests'; requests: { value: number; label: string }[] }
  /** Nothing to drive by hand (the sketch makes the request itself). */
  | { kind: 'none' };

const isUrl = (path: string) => /^[a-z]+:\/\//i.test(path);

export function controlFor(input: WorldInput): InputControl {
  const d = input.device;
  if (d.kind === 'network') {
    const requests = d.requests
      .map((line, value) => ({ value, label: line.trim() }))
      .filter((r) => r.label && !isUrl(r.label.split(/\s+/)[1] ?? ''));
    return requests.length ? { kind: 'requests', requests } : { kind: 'none' };
  }
  if (d.kind === 'button' || input.quantity === 'button' || input.gesture === 'press' || input.gesture === 'tap') return { kind: 'hold' };
  if (d.kind === 'switch' || input.quantity === 'switch') return { kind: 'switch' };
  return { kind: 'slider' };
}
