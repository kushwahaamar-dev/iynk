import type { World } from './world';

/** A device on the I²C bus, modelled at register level. */
export interface I2CDevice {
  readonly address: number;
  readonly kind: string;
  attach?(world: World): void;
  write(bytes: number[]): void;
  read(n: number): number[];
  view?(): { pca9685: { hz: number; duty: number[] } } | Record<string, unknown>;
}

const clamp16 = (v: number) => Math.max(-32768, Math.min(32767, Math.round(v)));

/**
 * MPU-6050 IMU at 0x68 (0x69 with AD0 high). Registers follow the datasheet:
 * 0x3B..0x40 accel, 0x41..0x42 temperature, 0x43..0x48 gyro, 0x6B PWR_MGMT_1,
 * 0x75 WHO_AM_I = 0x68. It wakes up asleep (PWR_MGMT_1 = 0x40) and reads zeros
 * until the sketch clears the sleep bit, as the real chip does.
 */
export class Mpu6050 implements I2CDevice {
  readonly kind = 'mpu6050';
  readonly address: number;
  private regs = new Uint8Array(128);
  private ptr = 0;
  /** Physical inputs: acceleration in g and rotation in °/s, die temperature in °C. */
  accel = { x: 0, y: 0, z: 1 };
  gyro = { x: 0, y: 0, z: 0 };
  tempC = 24;
  /** Constant gyro bias in °/s, so integrating the raw rate drifts like a real part. */
  gyroBias = { x: 0.6, y: -0.4, z: 0.25 };

  constructor(address = 0x68) {
    this.address = address;
    this.regs[0x6b] = 0x40;
    this.regs[0x75] = 0x68;
  }

  private get asleep(): boolean {
    return (this.regs[0x6b] & 0x40) !== 0;
  }

  write(bytes: number[]): void {
    if (!bytes.length) return;
    this.ptr = bytes[0] & 0x7f;
    for (let i = 1; i < bytes.length; i++) {
      this.regs[this.ptr] = bytes[i] & 0xff;
      if (this.ptr === 0x6b && bytes[i] & 0x80) this.reset();
      this.ptr = (this.ptr + 1) & 0x7f;
    }
  }

  private reset(): void {
    this.regs.fill(0);
    this.regs[0x6b] = 0x40;
    this.regs[0x75] = 0x68;
  }

  private sample(): void {
    const afs = (this.regs[0x1c] >> 3) & 3; // ±2/4/8/16 g
    const gfs = (this.regs[0x1b] >> 3) & 3; // ±250/500/1000/2000 °/s
    const aLsb = 16384 / (1 << afs);
    const gLsb = 131 / (1 << gfs);
    const put = (reg: number, v: number) => {
      const w = this.asleep ? 0 : clamp16(v) & 0xffff;
      this.regs[reg] = w >> 8;
      this.regs[reg + 1] = w & 0xff;
    };
    put(0x3b, this.accel.x * aLsb);
    put(0x3d, this.accel.y * aLsb);
    put(0x3f, this.accel.z * aLsb);
    put(0x41, (this.tempC - 36.53) * 340);
    put(0x43, (this.gyro.x + this.gyroBias.x) * gLsb);
    put(0x45, (this.gyro.y + this.gyroBias.y) * gLsb);
    put(0x47, (this.gyro.z + this.gyroBias.z) * gLsb);
  }

  read(n: number): number[] {
    this.sample();
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      out.push(this.regs[this.ptr]);
      this.ptr = (this.ptr + 1) & 0x7f;
    }
    return out;
  }

  /** Tilt the board: roll/pitch in degrees, as gravity seen by the accelerometer. */
  tilt(rollDeg: number, pitchDeg: number): void {
    const r = (rollDeg * Math.PI) / 180;
    const p = (pitchDeg * Math.PI) / 180;
    this.accel = { x: -Math.sin(p), y: Math.sin(r) * Math.cos(p), z: Math.cos(r) * Math.cos(p) };
  }

  view() {
    return { accel: { ...this.accel }, gyro: { ...this.gyro }, asleep: this.asleep };
  }
}

/**
 * PCA9685 16-channel 12-bit PWM driver (default 0x40). MODE1 at 0x00 (SLEEP bit 4,
 * AI bit 5), LEDn_ON/OFF at 0x06 + 4n, PRE_SCALE at 0xFE; the internal oscillator is 25 MHz.
 */
export class Pca9685 implements I2CDevice {
  readonly kind = 'pca9685';
  readonly address: number;
  private regs = new Uint8Array(256);
  private ptr = 0;
  private world: World | null = null;

  constructor(address = 0x40) {
    this.address = address;
    this.regs[0x00] = 0x11; // SLEEP + ALLCALL at power-up
    this.regs[0xfe] = 0x1e; // 200 Hz
  }

  attach(world: World): void {
    this.world = world;
  }

  write(bytes: number[]): void {
    if (!bytes.length) return;
    this.ptr = bytes[0];
    const ai = (this.regs[0x00] & 0x20) !== 0;
    for (let i = 1; i < bytes.length; i++) {
      // PRE_SCALE can only be written while asleep.
      if (this.ptr === 0xfe && !(this.regs[0x00] & 0x10)) {
        this.world?.warn('PCA9685: PRE_SCALE is ignored unless MODE1 SLEEP is set');
      } else {
        this.regs[this.ptr] = bytes[i];
      }
      if (ai || i < bytes.length - 1) this.ptr = (this.ptr + 1) & 0xff;
    }
    this.world?.touch();
  }

  read(n: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(this.regs[(this.ptr + i) & 0xff]);
    return out;
  }

  get hz(): number {
    return Math.round(25_000_000 / (4096 * (this.regs[0xfe] + 1)));
  }

  /** Duty cycle 0..1 of channel `ch`. Full ON/OFF bits (bit 4 of the high bytes) win. */
  duty(ch: number): number {
    if (this.regs[0x00] & 0x10) return 0; // asleep: outputs off
    const b = 0x06 + 4 * ch;
    const on = this.regs[b] | ((this.regs[b + 1] & 0x0f) << 8);
    const off = this.regs[b + 2] | ((this.regs[b + 3] & 0x0f) << 8);
    if (this.regs[b + 3] & 0x10) return 0;
    if (this.regs[b + 1] & 0x10) return 1;
    return (((off - on) % 4096) + 4096) % 4096 / 4096;
  }

  /** Pulse width in µs on a channel (for a servo). */
  pulseUs(ch: number): number {
    return (this.duty(ch) * 1_000_000) / this.hz;
  }

  view() {
    return { pca9685: { hz: this.hz, duty: Array.from({ length: 16 }, (_, i) => Math.round(this.duty(i) * 4096) / 4096) } };
  }
}

/**
 * SSD1306 OLED (0x3C). The library writes a 1-bit framebuffer straight into
 * world.oled; at the bus level it ACKs and accepts the command and data streams
 * so I²C scanners and raw display-on/off commands behave.
 */
export class Ssd1306 implements I2CDevice {
  readonly kind = 'ssd1306';
  readonly address: number;
  private world: World | null = null;
  readonly w: number;
  readonly h: number;

  constructor(address = 0x3c, w = 128, h = 64) {
    this.address = address;
    this.w = w;
    this.h = h;
  }

  attach(world: World): void {
    this.world = world;
    world.oled ??= { w: this.w, h: this.h, on: false, inverted: false, contrast: 0x7f, fb: new Uint8Array(this.w * this.h), texts: [] };
  }

  write(bytes: number[]): void {
    const o = this.world?.oled;
    if (!o || !bytes.length) return;
    if (bytes[0] === 0x00) {
      for (let i = 1; i < bytes.length; i++) {
        const c = bytes[i];
        if (c === 0xaf) o.on = true;
        else if (c === 0xae) o.on = false;
        else if (c === 0xa7) o.inverted = true;
        else if (c === 0xa6) o.inverted = false;
        else if (c === 0x81 && i + 1 < bytes.length) o.contrast = bytes[++i];
      }
    }
  }

  read(): number[] {
    return [0x43];
  }
}

/** HD44780 16x2 character LCD behind a PCF8574 I²C backpack (0x27 or 0x3F). */
export class Lcd1602 implements I2CDevice {
  readonly kind = 'lcd1602';
  readonly address: number;
  private world: World | null = null;
  readonly cols: number;
  readonly rows: number;

  constructor(address = 0x27, cols = 16, rows = 2) {
    this.address = address;
    this.cols = cols;
    this.rows = rows;
  }

  attach(world: World): void {
    this.world = world;
    world.lcd ??= { cols: this.cols, rows: this.rows, text: Array.from({ length: this.rows }, () => ' '.repeat(this.cols)), backlight: false, cursor: [0, 0] };
  }

  write(bytes: number[]): void {
    // Backlight is bit 3 of every PCF8574 byte.
    const l = this.world?.lcd;
    if (l && bytes.length) l.backlight = (bytes[bytes.length - 1] & 0x08) !== 0;
  }

  read(n: number): number[] {
    return new Array(n).fill(0xff);
  }
}

/** A generic device that only ACKs its address (for I²C scanner lessons). */
export class GenericI2C implements I2CDevice {
  readonly kind: string;
  readonly address: number;
  constructor(address: number, kind = 'device') {
    this.address = address;
    this.kind = kind;
  }
  write(): void {}
  read(n: number): number[] {
    return new Array(n).fill(0);
  }
}

/**
 * HC-SR04 ultrasonic ranger on two pins. A HIGH pulse of at least 10 µs on TRIG
 * makes it send 8 cycles at 40 kHz (about 200 µs later the echo pin rises) and hold
 * ECHO HIGH for the round trip: 58.3 µs per cm at 343 m/s. Beyond 4 m or with no
 * object the echo stays high for 38 ms (timeout pulse).
 */
export class HcSr04 {
  distanceCm = 25;
  private risingAt = -1;
  constructor(
    readonly world: World,
    readonly trig: number,
    readonly echo: number,
  ) {
    world.drive(echo, 0);
    world.onPinWrite((pin, level) => {
      if (pin !== trig) return;
      if (level === 1) this.risingAt = world.now;
      else if (this.risingAt >= 0) {
        const width = world.now - this.risingAt;
        this.risingAt = -1;
        if (width < 10) return;
        const start = world.now + 200;
        const d = this.distanceCm;
        const echoUs = d >= 2 && d <= 400 ? (d * 2) / 0.0343 : 38_000;
        world.driveAt(start, echo, 1);
        world.driveAt(start + echoUs, echo, 0);
      }
    });
  }
}

/** Convenience: make the common lesson devices for a world. */
export function addStandardDevices(world: World, kinds: Array<'mpu6050' | 'pca9685' | 'ssd1306' | 'lcd1602'>): Record<string, I2CDevice> {
  const out: Record<string, I2CDevice> = {};
  for (const k of kinds) {
    const dev = k === 'mpu6050' ? new Mpu6050() : k === 'pca9685' ? new Pca9685() : k === 'ssd1306' ? new Ssd1306() : new Lcd1602();
    world.addDevice(dev);
    out[k] = dev;
  }
  return out;
}

/** Which segments a..g, dp are lit for a raw segment byte (bit 0 = a). */
export function litSegments(bits: number, activeLow: boolean): boolean[] {
  return Array.from({ length: 8 }, (_, i) => (((bits >> i) & 1) === 1) !== activeLow);
}
