import { VirtualClock } from './clock';
import { type BoardProfile, hasPwm } from './profiles';
import type { I2CDevice } from './devices';

export type PinMode = 'unset' | 'input' | 'input_pullup' | 'input_pulldown' | 'output' | 'open_drain';
export type Edge = 'rising' | 'falling' | 'change' | 'low' | 'high';

export interface PinState {
  mode: PinMode;
  /** Level the sketch drives (outputs). */
  out: 0 | 1;
  /** PWM duty 0..1 while a PWM signal is on the pin, else null. */
  duty: number | null;
  pwmHz: number;
  /** Square wave from tone(), Hz (0 = silent). */
  toneHz: number;
  /** Servo pulse width in µs (0 = no servo signal). */
  servoUs: number;
  /** Level forced from outside (button, sensor), or null when nothing drives the pin. */
  ext: 0 | 1 | null;
  /** Voltage applied from outside for analogRead (null = unconnected). */
  volts: number | null;
  /** DAC output voltage, if the pin is a DAC. */
  dac: number | null;
}

/** A pin as the figure sees it: compact and JSON friendly. */
export interface PinView {
  mode: PinMode;
  level: 0 | 1;
  duty?: number;
  hz?: number;
  servoUs?: number;
  volts?: number;
}

export interface Snapshot {
  /** Simulated time in ms. */
  t: number;
  pins: Record<number, PinView>;
  /** On-board LEDs by name, brightness 0..1. */
  leds: Record<string, number>;
  /** WS2812 / NeoPixel strings by data pin: one [r, g, b] per pixel (0..255). */
  pixels: Record<number, [number, number, number][]>;
  /** LED matrix brightness 0..1, row major (micro:bit 5x5, Uno R4 WiFi 12x8). */
  matrix?: { w: number; h: number; px: number[] };
  /** OLED framebuffer as hex rows (shapes), plus the text runs printed on it (the figure draws the glyphs). */
  oled?: { w: number; h: number; on: boolean; inverted: boolean; contrast: number; rows: string[]; texts: OledText[] };
  lcd?: { cols: number; rows: number; text: string[]; backlight: boolean; cursor: [number, number] };
  /** PCA9685 outputs by address: 16 duty cycles 0..1 and the frequency. */
  pwmDrivers?: Record<number, { hz: number; duty: number[] }>;
  /** FPGA port values (bit vectors as numbers). */
  ports?: Record<string, number>;
  /** 7-segment digits: per digit the lit fraction of segments a..g and dp over the last frame. */
  seg7?: number[][];
  tone?: { pin: number; hz: number } | null;
  wifi?: { status: string; ssid: string; ip: string; rssi: number };
  powered: boolean;
}

/** A run of text drawn on the OLED: top-left corner, text size (1 = 6x8 px cells) and colour. */
export interface OledText {
  x: number;
  y: number;
  size: number;
  color: number;
  text: string;
}

interface IrqHandler {
  pin: number;
  edge: Edge;
  fn: () => void;
}

export interface SerialSink {
  (text: string): void;
}

export interface WifiNetwork {
  ssid: string;
  password: string | null;
  rssi: number;
  channel: number;
}

export interface HttpRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  body: string;
  resolve: (res: { status: number; type: string; body: string }) => void;
}

export interface WorldOptions {
  /** Seed for every pseudo-random source (random(), floating inputs). */
  seed?: number;
  /** Wi-Fi networks visible to WiFi.scanNetworks() / WLAN.scan(). */
  networks?: WifiNetwork[];
  /** Fake internet for HTTP clients: URL → response body. */
  web?: Record<string, string>;
}

/** xorshift32: small, fast, deterministic. */
export class Rng {
  private s: number;
  constructor(seed = 0x2545f491) {
    this.s = seed >>> 0 || 0x2545f491;
  }
  seed(v: number): void {
    this.s = v >>> 0 || 0x2545f491;
  }
  next(): number {
    let x = this.s;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s = x >>> 0;
    return this.s;
  }
  /** Uniform float in [0, 1). */
  float(): number {
    return this.next() / 4294967296;
  }
}

/**
 * The board's electrical world: pins, ADC, PWM, interrupts, serial, I²C
 * devices, displays and the Wi-Fi/HTTP sim. Interpreters talk to it; the host
 * drives inputs and reads snapshots.
 */
export class World {
  readonly profile: BoardProfile;
  readonly clock = new VirtualClock();
  readonly rng: Rng;
  readonly pins = new Map<number, PinState>();
  readonly i2c = new Map<number, I2CDevice>();
  /** Pending interrupt handlers, run by the interpreter between statements. */
  readonly irqQueue: Array<() => void> = [];
  private irqs: IrqHandler[] = [];
  private pinListeners: Array<(pin: number, level: 0 | 1) => void> = [];
  private serialIn = '';
  serialOut: SerialSink = () => {};
  /** Warnings for the learner (wrong pin for PWM, 5 V into a 3.3 V pin...). */
  warn: (message: string) => void = () => {};
  adcBits: number;
  pwmBits: number;
  interruptsEnabled = true;
  /** Edge trace for lesson checks: [µs, pin, level]. Capped. */
  readonly trace: Array<[number, number, 0 | 1]> = [];
  readonly damaged = new Set<number>();
  /** Warnings already shown, so a loop does not repeat them. */
  readonly warned = new Set<string>();
  /** Pins with a cold solder joint: the connection drops out. */
  readonly coldJoints = new Set<number>();
  powered = true;
  supplyV: number;
  // Displays and peripherals the libraries write into.
  matrix: { w: number; h: number; px: number[] } | null = null;
  pixels = new Map<number, [number, number, number][]>();
  oled: { w: number; h: number; on: boolean; inverted: boolean; contrast: number; fb: Uint8Array; texts: OledText[] } | null = null;
  lcd: { cols: number; rows: number; text: string[]; backlight: boolean; cursor: [number, number] } | null = null;
  ports: Record<string, number> | null = null;
  seg7: number[][] | null = null;
  // Wi-Fi.
  readonly networks: WifiNetwork[];
  readonly web: Record<string, string>;
  wifi = { status: 'idle', ssid: '', ip: '0.0.0.0', rssi: 0, connectAt: 0 };
  readonly httpQueue: HttpRequest[] = [];
  httpServerPort = 0;
  private changed = true;
  /** Bumped on every observable change; interpreters use it to spot idle polling loops. */
  version = 0;

  constructor(profile: BoardProfile, opts: WorldOptions = {}) {
    this.profile = profile;
    this.rng = new Rng(opts.seed);
    this.adcBits = profile.adcBits;
    this.pwmBits = profile.pwmBits;
    this.supplyV = profile.logicV;
    this.networks = opts.networks ?? [
      { ssid: 'bench-lab', password: 'robotics', rssi: -48, channel: 6 },
      { ssid: 'simlab-guest', password: null, rssi: -67, channel: 11 },
      { ssid: 'HackTX', password: 'hackathon', rssi: -71, channel: 1 },
    ];
    this.web = opts.web ?? {
      'http://example.com/': '<h1>Example Domain</h1>',
      'http://worldtimeapi.org/api/ip': '{"datetime":"2026-10-24T12:00:00-05:00"}',
    };
  }

  get now(): number {
    return this.clock.now;
  }

  /** Mark the snapshot dirty (displays call this after drawing). */
  touch(): void {
    this.changed = true;
    this.version++;
  }

  takeChanged(): boolean {
    const c = this.changed;
    this.changed = false;
    return c;
  }

  pin(n: number): PinState {
    let p = this.pins.get(n);
    if (!p) {
      p = { mode: 'unset', out: 0, duty: null, pwmHz: 0, toneHz: 0, servoUs: 0, ext: null, volts: null, dac: null };
      this.pins.set(n, p);
    }
    return p;
  }

  /** The level an input on `n` reads right now. */
  level(n: number): 0 | 1 {
    const p = this.pin(n);
    if (this.damaged.has(n)) return 0;
    if (this.coldJoints.has(n) && this.rng.float() < 0.35) return (this.rng.next() & 1) as 0 | 1;
    if (p.mode === 'output') {
      if (p.duty !== null) return p.duty >= 0.5 ? 1 : 0;
      return p.out;
    }
    if (p.ext !== null) return p.ext;
    if (p.volts !== null) return p.volts > this.profile.logicV * 0.5 ? 1 : 0;
    if (p.mode === 'input_pullup') return 1;
    if (p.mode === 'input_pulldown') return 0;
    // A floating input picks up noise; deterministic per seed.
    return (this.rng.next() & 1) as 0 | 1;
  }

  setMode(n: number, mode: PinMode): void {
    const p = this.pin(n);
    if (mode === 'output' && this.profile.inputOnlyPins?.includes(n)) {
      this.warn(`GPIO${n} is input only: it cannot drive an output`);
      return;
    }
    if (this.profile.analogOnlyPins?.includes(n) && mode !== 'unset') {
      this.warn(`pin ${this.pinName(n)} is an analog input only: pinMode() has no effect`);
      return;
    }
    if (mode === 'input_pullup' && this.profile.inputOnlyPins?.includes(n)) {
      this.warn(`GPIO${n} has no internal pull-up: add an external 10 kΩ resistor`);
      mode = 'input';
    }
    if (p.mode === mode) return;
    const before = this.level(n);
    p.mode = mode;
    if (mode !== 'output') p.duty = null;
    this.touch();
    this.edge(n, before);
  }

  digitalWrite(n: number, v: number): void {
    const p = this.pin(n);
    const level: 0 | 1 = v ? 1 : 0;
    if (this.damaged.has(n)) return;
    if (p.mode === 'input' || p.mode === 'input_pullup' || p.mode === 'unset' || p.mode === 'input_pulldown') {
      if (this.profile.id === 'uno-r3' || this.profile.id === 'nano') {
        // AVR: writing HIGH to an input turns the pull-up on.
        const before = this.level(n);
        p.mode = level ? 'input_pullup' : p.mode === 'input_pullup' ? 'input' : p.mode;
        p.out = level;
        this.touch();
        this.edge(n, before);
        return;
      }
      p.out = level;
      return;
    }
    if (p.out === level && p.duty === null && !p.toneHz) return;
    const before = this.level(n);
    p.out = level;
    p.duty = null;
    p.toneHz = 0;
    this.touch();
    this.edge(n, before);
  }

  /** analogWrite(): real PWM on PWM pins; on other pins Arduino sets HIGH at >= half scale. */
  analogWrite(n: number, value: number, maxValue = (1 << this.pwmBits) - 1, hz = 490): void {
    const p = this.pin(n);
    const before = this.level(n);
    const prev = `${p.mode}${p.out}${p.duty}${p.pwmHz}`;
    if (p.mode !== 'output') p.mode = 'output';
    const v = Math.max(0, Math.min(maxValue, value));
    if (!hasPwm(this.profile, n)) {
      p.duty = null;
      p.out = v >= (maxValue + 1) / 2 ? 1 : 0;
      if (!this.warned.has(`pwm${n}`)) {
        this.warned.add(`pwm${n}`);
        this.warn(`pin ${this.pinName(n)} has no PWM: analogWrite() below half scale writes LOW, above it HIGH; use a ~ pin`);
      }
    } else if (v <= 0) {
      p.duty = null;
      p.out = 0;
    } else if (v >= maxValue) {
      p.duty = null;
      p.out = 1;
    } else {
      p.duty = v / maxValue;
      p.pwmHz = hz;
    }
    if (prev === `${p.mode}${p.out}${p.duty}${p.pwmHz}`) return;
    this.touch();
    this.edge(n, before);
  }

  /** Raw ADC reading from the voltage on the pin. */
  analogRead(n: number, bits = this.adcBits): number {
    const p = this.pin(n);
    const max = (1 << bits) - 1;
    let v = p.volts;
    if (v === null) {
      if (p.ext !== null) v = p.ext ? this.profile.adcVref : 0;
      else if (p.mode === 'output') v = this.level(n) ? this.profile.logicV : 0;
      else if (p.mode === 'input_pullup') v = this.profile.logicV;
      else return Math.floor(this.rng.float() * max * 0.25 + max * 0.3); // floating: noise
    }
    if (this.damaged.has(n)) return 0;
    return Math.max(0, Math.min(max, Math.round((v / this.profile.adcVref) * max)));
  }

  // Host inputs ---------------------------------------------------------------

  /** Drive a pin from outside (button, sensor output). null releases it. */
  drive(n: number, level: 0 | 1 | null): void {
    const p = this.pin(n);
    const before = this.level(n);
    p.ext = level;
    this.touch();
    this.edge(n, before);
  }

  /** Apply a voltage to a pin (potentiometer, LDR divider, TMP36...). */
  applyVolts(n: number, volts: number | null): void {
    const p = this.pin(n);
    if (volts !== null && volts > this.profile.logicV + 0.5 && !this.damaged.has(n)) {
      this.damaged.add(n);
      this.warn(`${volts.toFixed(1)} V on ${this.pinName(n)}, a ${this.profile.logicV} V pin: the pin is damaged`);
    }
    const before = this.level(n);
    p.volts = volts;
    this.touch();
    this.edge(n, before);
  }

  /** Schedule an external level change on a pin (sensor echo, encoder...). */
  driveAt(atUs: number, n: number, level: 0 | 1 | null): void {
    this.clock.at(atUs, () => this.drive(n, level));
  }

  onPinWrite(fn: (pin: number, level: 0 | 1) => void): void {
    this.pinListeners.push(fn);
  }

  private edge(n: number, before: 0 | 1): void {
    const after = this.level(n);
    if (after === before) return;
    if (this.trace.length < 20000) this.trace.push([this.clock.now, n, after]);
    for (const l of this.pinListeners) l(n, after);
    for (const h of this.irqs) {
      if (h.pin !== n) continue;
      const hit =
        h.edge === 'change' ||
        (h.edge === 'rising' && after === 1) ||
        (h.edge === 'falling' && after === 0) ||
        (h.edge === 'low' && after === 0) ||
        (h.edge === 'high' && after === 1);
      if (hit) this.irqQueue.push(h.fn);
    }
  }

  attachInterrupt(n: number, edge: Edge, fn: () => void): boolean {
    const ok = this.profile.interruptPins === 'all' || this.profile.interruptPins.includes(n);
    if (!ok) {
      this.warn(`pin ${this.pinName(n)} cannot trigger an interrupt on ${this.profile.name}; use ${(this.profile.interruptPins as number[]).join(' or ')}`);
      return false;
    }
    this.detachInterrupt(n);
    this.irqs.push({ pin: n, edge, fn });
    return true;
  }

  detachInterrupt(n: number): void {
    this.irqs = this.irqs.filter((h) => h.pin !== n);
  }

  // Serial --------------------------------------------------------------------

  print(text: string): void {
    if (!text) return;
    this.version++;
    this.serialOut(text);
  }

  feedSerial(text: string): void {
    this.serialIn += text;
  }

  serialAvailable(): number {
    return this.serialIn.length;
  }

  serialRead(): number {
    if (!this.serialIn) return -1;
    const c = this.serialIn.charCodeAt(0);
    this.serialIn = this.serialIn.slice(1);
    return c;
  }

  serialPeek(): number {
    return this.serialIn ? this.serialIn.charCodeAt(0) : -1;
  }

  // I²C -------------------------------------------------------------------------

  addDevice(dev: I2CDevice): void {
    this.i2c.set(dev.address, dev);
    dev.attach?.(this);
    this.touch();
  }

  /** Write bytes to a device; returns false (NACK) when nothing answers. */
  i2cWrite(addr: number, bytes: number[]): boolean {
    const d = this.i2c.get(addr);
    if (!d) return false;
    d.write(bytes);
    this.touch();
    return true;
  }

  i2cRead(addr: number, n: number): number[] {
    const d = this.i2c.get(addr);
    if (!d) return [];
    return d.read(n);
  }

  // Wi-Fi -----------------------------------------------------------------------

  wifiConnect(ssid: string, password: string | null): void {
    const net = this.networks.find((x) => x.ssid === ssid);
    this.wifi.ssid = ssid;
    if (!net) {
      this.wifi.status = 'no_ssid';
      return;
    }
    if (net.password !== null && net.password !== (password ?? '')) {
      this.wifi.status = 'connecting';
      this.clock.after(2_000_000, () => {
        this.wifi.status = 'wrong_password';
        this.touch();
      });
      return;
    }
    this.wifi.status = 'connecting';
    // DHCP takes a while; deterministic 1.2 s.
    this.clock.after(1_200_000, () => {
      this.wifi.status = 'connected';
      this.wifi.ip = `192.168.4.${20 + (this.rng.next() % 200)}`;
      this.wifi.rssi = net.rssi;
      this.touch();
    });
  }

  wifiDisconnect(): void {
    this.wifi = { status: 'disconnected', ssid: '', ip: '0.0.0.0', rssi: 0, connectAt: 0 };
  }

  /** The host (or a test) sends an HTTP request to the board's web server. */
  request(method: string, path: string, body = ''): Promise<{ status: number; type: string; body: string }> {
    return new Promise((resolve) => {
      if (this.wifi.status !== 'connected' || !this.httpServerPort) {
        resolve({ status: 0, type: 'text/plain', body: 'connection refused' });
        return;
      }
      const [p, qs = ''] = path.split('?');
      const query: Record<string, string> = {};
      for (const kv of qs.split('&').filter(Boolean)) {
        const [k, v = ''] = kv.split('=');
        query[decodeURIComponent(k)] = decodeURIComponent(v);
      }
      this.httpQueue.push({ method: method.toUpperCase(), path: p || '/', query, body, resolve });
    });
  }

  pinName(n: number): string {
    for (const [k, v] of Object.entries(this.profile.aliases)) if (v === n && /^(A\d|D\d|GP\d|P\d|GPIO\d)/.test(k)) return k;
    return String(n);
  }

  // Snapshot ------------------------------------------------------------------

  snapshot(): Snapshot {
    const pins: Record<number, PinView> = {};
    for (const [n, p] of this.pins) {
      if (p.mode === 'unset' && p.ext === null && p.volts === null && !p.servoUs) continue;
      const v: PinView = { mode: p.mode, level: this.level(n) };
      if (p.duty !== null) v.duty = round3(p.duty);
      if (p.toneHz) v.hz = p.toneHz;
      if (p.servoUs) v.servoUs = p.servoUs;
      if (p.volts !== null) v.volts = round3(p.volts);
      if (this.coldJoints.has(n) && p.mode === 'output') v.level = 0;
      pins[n] = v;
    }
    const leds: Record<string, number> = {};
    for (const led of this.profile.leds) {
      if (led.kind === 'ws2812') {
        const px = this.pixels.get(led.pin)?.[0];
        leds[led.name] = px ? round3(Math.max(...px) / 255) : 0;
        continue;
      }
      const p = this.pins.get(led.pin);
      let b = 0;
      if (p && p.mode === 'output' && this.powered) b = p.duty !== null ? p.duty : p.out;
      if (led.activeLow && p && p.mode === 'output') b = 1 - b;
      leds[led.name] = round3(b);
    }
    const pixels: Record<number, [number, number, number][]> = {};
    for (const [pin, arr] of this.pixels) pixels[pin] = arr.map((c) => [c[0], c[1], c[2]]);
    const snap: Snapshot = { t: Math.round(this.clock.now / 100) / 10, pins, leds, pixels, powered: this.powered };
    if (this.matrix) snap.matrix = { w: this.matrix.w, h: this.matrix.h, px: this.matrix.px.slice() };
    if (this.oled) snap.oled = { w: this.oled.w, h: this.oled.h, on: this.oled.on, inverted: this.oled.inverted, contrast: this.oled.contrast, rows: oledRows(this.oled.fb, this.oled.w, this.oled.h), texts: this.oled.texts.map((t) => ({ ...t })) };
    if (this.lcd) snap.lcd = { ...this.lcd, text: this.lcd.text.slice(), cursor: [this.lcd.cursor[0], this.lcd.cursor[1]] };
    const drivers: Record<number, { hz: number; duty: number[] }> = {};
    let anyDriver = false;
    for (const d of this.i2c.values()) {
      const view = d.view?.();
      if (view && 'pca9685' in view) {
        drivers[d.address] = (view as { pca9685: { hz: number; duty: number[] } }).pca9685;
        anyDriver = true;
      }
    }
    if (anyDriver) snap.pwmDrivers = drivers;
    if (this.ports) snap.ports = { ...this.ports };
    if (this.seg7) snap.seg7 = this.seg7.map((d) => d.map(round3));
    let tone: Snapshot['tone'] = null;
    for (const [n, p] of this.pins) if (p.toneHz) tone = { pin: n, hz: p.toneHz };
    snap.tone = tone;
    if (this.profile.hasWifi && this.wifi.status !== 'idle') snap.wifi = { status: this.wifi.status, ssid: this.wifi.ssid, ip: this.wifi.ip, rssi: this.wifi.rssi };
    return snap;
  }
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/** Pack a 1-bit framebuffer into hex rows (one string per pixel row) for the figure. */
function oledRows(fb: Uint8Array, w: number, h: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let s = '';
    for (let x = 0; x < w; x += 4) {
      let nib = 0;
      for (let b = 0; b < 4; b++) nib = (nib << 1) | (fb[y * w + x + b] ? 1 : 0);
      s += nib.toString(16);
    }
    rows.push(s);
  }
  return rows;
}
