// How a world input's value reaches the board's pins. The device models are the
// physics of the parts on the breadboard: a pull-down button reads HIGH when
// pressed, a pot divides the supply, a TMP36 gives 10 mV/°C over 0.5 V.

import type { WorldInput } from '@/content/schema';

export type PinDrive = { net: string; level: 0 | 1 | null } | { net: string; volts: number | null };

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Sensor resistance in ohms for a divider input's physical quantity. */
function sensorOhms(sensor: 'ldr' | 'fsr' | 'thermistor', value: number): number {
  switch (sensor) {
    case 'ldr':
      // GL5528-class photoresistor: about 10 kΩ at 10 lux, R ∝ lux^-0.7, about 1 MΩ in the dark.
      return value <= 0.1 ? 1_000_000 : Math.min(1_000_000, 10_000 * Math.pow(value / 10, -0.7));
    case 'fsr':
      // FSR 402: open (> 10 MΩ) untouched, about 10 kΩ at 1 N, roughly R ∝ 1/F above that.
      return value <= 0.05 ? 10_000_000 : Math.max(200, 10_000 / value);
    case 'thermistor': {
      // 10 kΩ NTC, B = 3950 K, 10 kΩ at 25 °C.
      const t = value + 273.15;
      return 10_000 * Math.exp(3950 * (1 / t - 1 / 298.15));
    }
  }
}

/**
 * What the pins see for one input value. `logicV` is the board's I/O level
 * (5 V on the Uno, 3.3 V on the ESP32), which is also the divider's supply.
 */
export function drivesFor(input: WorldInput, value: number, logicV: number): PinDrive[] {
  const [pin] = input.pins;
  if (!pin) return [];
  const d = input.device;
  switch (d.kind) {
    case 'button': {
      const pressed = value >= 0.5;
      const activeHigh = d.pull === 'external-down' || d.pull === 'internal-down';
      if (pressed) return [{ net: pin, level: activeHigh ? 1 : 0 }];
      // Released: the pull resistor sets the level (an internal pull is the pin's own, so let it float).
      if (d.pull === 'internal-up' || d.pull === 'internal-down') return [{ net: pin, level: null }];
      return [{ net: pin, level: activeHigh ? 0 : 1 }];
    }
    case 'switch':
      return [{ net: pin, level: value >= 0.5 ? 1 : 0 }];
    case 'pot': {
      const span = input.max - input.min || 1;
      return [{ net: pin, volts: clamp((value - input.min) / span, 0, 1) * logicV }];
    }
    case 'linear': {
      const span = input.max - input.min || 1;
      const f = clamp((value - input.min) / span, 0, 1);
      return [{ net: pin, volts: d.voltsAtMin + f * (d.voltsAtMax - d.voltsAtMin) }];
    }
    case 'tmp36':
      return [{ net: pin, volts: clamp(0.5 + value * 0.01, 0, logicV) }];
    case 'divider': {
      const r = sensorOhms(d.sensor, value);
      // sensorTo 'vcc': sensor on top, fixed resistor to GND, so more light (lower R) reads higher.
      const volts = d.sensorTo === 'vcc' ? (logicV * d.fixedOhms) / (r + d.fixedOhms) : (logicV * r) / (r + d.fixedOhms);
      return [{ net: pin, volts: clamp(volts, 0, logicV) }];
    }
    case 'onboard':
    case 'network':
    case 'hc-sr04':
    case 'mpu6050':
    case 'qtr-rc':
      // These talk through the interpreter's device models (timing, I²C, sockets), not a fixed level.
      return [];
  }
}
