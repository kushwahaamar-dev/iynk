// A lesson's world spec (src/content/schema.ts WorldModel) wired into a Run: buttons, pots and
// dividers drive pins, an HC-SR04 answers on its trig/echo pins, an MPU-6050 sits on the I²C bus,
// a QTR-RC array sees the line, the board's own sensors read what their input says and a phone on
// the Wi-Fi sends HTTP requests. Board Lab's live run, the headless check run and the Robotics task
// runner all go through here.

import type { DeviceModel, WorldInput, WorldModel } from '@/content/schema';
import type { HcSr04, Mpu6050 } from './devices';
import type { DeviceKind, Run } from './run';
import type { WifiNetwork, WorldOptions } from './world';

export type PinDrive = { net: string; level: 0 | 1 | null } | { net: string; volts: number | null };

export interface HttpExchange {
  t: number;
  method: string;
  path: string;
  status: number;
  body: string;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function sensorOhms(sensor: 'ldr' | 'fsr' | 'thermistor', value: number): number {
  switch (sensor) {
    case 'ldr':
      return value <= 0.1 ? 1_000_000 : Math.min(1_000_000, 10_000 * Math.pow(value / 10, -0.7));
    case 'fsr':
      return value <= 0.05 ? 10_000_000 : Math.max(200, 10_000 / value);
    case 'thermistor': {
      const t = value + 273.15;
      return 10_000 * Math.exp(3950 * (1 / t - 1 / 298.15));
    }
  }
}

/** Darkness 0..1 each QTR sensor sees for a line at `position` (0 = under sensor 0, n-1 = under the last). */
export function qtrDarkness(sensors: number, position: number): number[] {
  return Array.from({ length: sensors }, (_, i) => Math.exp(-((i - position) ** 2) / (2 * 0.55 ** 2)));
}

/**
 * Fixed pin levels and voltages for one input value. `logicV` is the board's I/O level, which is
 * also a divider's supply. Devices that talk through timing, I²C or sockets return [] here.
 */
export function drivesFor(input: WorldInput, value: number, logicV: number): PinDrive[] {
  const [pin] = input.pins;
  const d = input.device;
  if (d.kind === 'qtr-rc') {
    const span = input.max - input.min || 1;
    const pos = clamp((value - input.min) / span, 0, 1) * (input.pins.length - 1);
    const dark = qtrDarkness(input.pins.length, pos);
    return input.pins.map((net, i) => ({ net, volts: Math.round(dark[i] * logicV * 1000) / 1000 }));
  }
  if (!pin) return [];
  switch (d.kind) {
    case 'button': {
      const pressed = value >= 0.5;
      const activeHigh = d.pull === 'external-down' || d.pull === 'internal-down';
      if (pressed) return [{ net: pin, level: activeHigh ? 1 : 0 }];
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
      const volts = d.sensorTo === 'vcc' ? (logicV * d.fixedOhms) / (r + d.fixedOhms) : (logicV * r) / (r + d.fixedOhms);
      return [{ net: pin, volts: clamp(volts, 0, logicV) }];
    }
    default:
      return [];
  }
}

const DEFAULT_NETWORKS: WifiNetwork[] = [
  { ssid: 'bench-lab', password: 'robotics', rssi: -48, channel: 6 },
  { ssid: 'iynk-guest', password: null, rssi: -67, channel: 11 },
  { ssid: 'HackTX', password: 'hackathon', rssi: -71, channel: 1 },
];

type NetworkDevice = Extract<DeviceModel, { kind: 'network' }>;

/** createRun options a world spec needs before power-on: I²C devices and the visible Wi-Fi networks. */
export function runOptionsFor(world: WorldModel): { devices: DeviceKind[]; world: WorldOptions } {
  const devices: DeviceKind[] = [];
  if (world.inputs.some((i) => i.device.kind === 'mpu6050' && i.device.address === 0x68)) devices.push('mpu6050');
  const networks = DEFAULT_NETWORKS.map((n) => ({ ...n }));
  for (const i of world.inputs) {
    if (i.device.kind !== 'network') continue;
    const d: NetworkDevice = i.device;
    const known = networks.find((n) => n.ssid === d.ssid);
    if (d.password !== undefined) {
      if (known) known.password = d.password;
      else networks.push({ ssid: d.ssid, password: d.password, rssi: -55, channel: 6 });
    } else if (!known) networks.push({ ssid: d.ssid, password: null, rssi: -55, channel: 6 });
  }
  return { devices, world: { networks } };
}

/** The HTTP request a network input's value stands for ("GET /on"), or null for an outgoing URL. */
function requestFor(d: NetworkDevice, value: number): { method: string; path: string } | null {
  const line = d.requests[Math.round(value)];
  if (!line) return null;
  const [method, ...rest] = line.trim().split(/\s+/);
  const path = rest.join(' ') || '/';
  if (/^[a-z]+:\/\//i.test(path)) return null;
  return { method, path };
}

export interface WorldBindingOptions {
  logicV: number;
  /** A board net ("D7", "GPIO5", "sw[3]") as the interpreter names it. */
  resolve: (net: string) => number | string | undefined;
  /** Every finished HTTP exchange with the sketch's web server. */
  onHttp?: (x: HttpExchange) => void;
}

/** Applies world input values to a live or headless Run. */
export class WorldBinding {
  private readonly run: Run;
  private readonly opts: WorldBindingOptions;
  private readonly sonars = new Map<string, HcSr04>();

  constructor(run: Run, world: WorldModel, opts: WorldBindingOptions) {
    this.run = run;
    this.opts = opts;
    for (const input of world.inputs) {
      if (input.device.kind !== 'hc-sr04') continue;
      const [trig, echo] = input.pins.map((p) => opts.resolve(p));
      if (trig === undefined || echo === undefined) continue;
      this.sonars.set(input.id, run.attachUltrasonic(trig, echo));
    }
  }

  /** Set one input to a value now. Network inputs send their request at this moment. */
  apply(input: WorldInput, value: number): void {
    const d = input.device;
    switch (d.kind) {
      case 'hc-sr04': {
        const s = this.sonars.get(input.id);
        if (s) s.distanceCm = value;
        return;
      }
      case 'mpu6050': {
        const dev = this.run.world.i2c.get(d.address) as Mpu6050 | undefined;
        if (!dev || dev.kind !== 'mpu6050') return;
        if (input.quantity === 'accel-g') dev.accel = { x: 0, y: 0, z: value };
        else if (input.quantity === 'angle-deg' || input.quantity === 'heading-deg') dev.gyro = { x: 0, y: 0, z: value };
        else {
          const rad = (value * Math.PI) / 180;
          dev.accel = { x: 0, y: Math.round(Math.sin(rad) * 1e4) / 1e4, z: Math.round(Math.cos(rad) * 1e4) / 1e4 };
        }
        return;
      }
      case 'network': {
        const req = requestFor(d, value);
        if (!req) return;
        const t = this.run.world.now / 1000;
        this.run.world.requestNow(req.method, req.path, '', (res) => this.opts.onHttp?.({ t, method: req.method, path: req.path, status: res.status, body: res.body }));
        return;
      }
      case 'onboard':
        this.run.world.onboard.set(d.sensor, value);
        this.run.world.touch();
        return;
      default:
        for (const drive of drivesFor(input, value, this.opts.logicV)) {
          const pin = this.opts.resolve(drive.net);
          if (pin === undefined) continue;
          if ('volts' in drive) {
            if (typeof pin === 'number') this.run.analog(pin, drive.volts);
          } else this.run.input(pin, drive.level);
        }
    }
  }
}
