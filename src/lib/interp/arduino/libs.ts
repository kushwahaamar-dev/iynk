import { InterpError, notModelled } from '../errors';
import { Lcd1602, Mpu6050, Pca9685, Ssd1306 } from '../devices';
import type { Gen } from '../exec';
import type { BoardProfile } from '../profiles';
import { hasPwm, isKnownPin } from '../profiles';
import type { ArduinoRt, Ref } from './interp';
import { Bme280Class, SensorClass } from './lib-bme280';
import { T, type CValue, type Ty, type TypeEnv } from './types';

type Ret = string | ((ts: Ty[], env: TypeEnv) => Ty);

export interface Builtin {
  ret: Ret;
  min: number;
  max: number;
  fn?: (rt: ArduinoRt, a: CValue[], ts: Ty[]) => CValue;
  gen?: (rt: ArduinoRt, a: CValue[], ts: Ty[]) => Gen<CValue>;
  /** No side effects (reads only), so idle polling loops can be skipped. */
  pure?: boolean;
  fineClock?: boolean;
  header?: string;
  boards?: (p: BoardProfile) => boolean;
  boardHint?: string;
  fnArgs?: number[];
  constFold?: boolean;
}

export interface LibMethod {
  ret: Ret;
  min?: number;
  fn?: (rt: ArduinoRt, self: CValue, a: CValue[], ts: Ty[]) => CValue;
  gen?: (rt: ArduinoRt, self: CValue, a: CValue[], ts: Ty[]) => Gen<CValue>;
  pure?: boolean;
}

export interface LibClass {
  headers: string[];
  boards?: (p: BoardProfile) => boolean;
  create: (rt: ArduinoRt, a: CValue[], ts: Ty[]) => CValue;
  methods: Record<string, LibMethod>;
  /** Real methods of the library that the model lacks, so a call says so instead of reading as a typo. */
  unmodelledMethods?: readonly string[];
  statics?: Record<string, number>;
  props?: Record<string, { ret: string; get: (rt: ArduinoRt, self: CValue) => CValue }>;
}

const isAvr = (p: BoardProfile) => p.id === 'uno-r3' || p.id === 'nano';
const isEsp32 = (p: BoardProfile) => p.id === 'esp32-devkitc' || p.id === 'esp32-s3-devkitc-1';
const isEsp = (p: BoardProfile) => isEsp32(p) || p.id === 'nodemcu';

export function charsToString(a: unknown): string {
  if (typeof a === 'string') return a;
  if (!Array.isArray(a)) return '';
  let s = '';
  for (const c of a as number[]) {
    if (!c) break;
    s += String.fromCharCode(c & 0xff);
  }
  return s;
}

// Number formatting -------------------------------------------------------------

/** Arduino Print::printFloat: round half up at `digits`, then print digit by digit. */
export function printFloat(x: number, digits: number, f32: boolean): string {
  const r = f32 ? Math.fround : (v: number) => v;
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return 'inf';
  if (x > 4294967040 || x < -4294967040) return 'ovf';
  let s = '';
  if (x < 0) {
    s = '-';
    x = -x;
  }
  let rounding = 0.5;
  for (let i = 0; i < digits; i++) rounding = r(rounding / 10);
  x = r(x + rounding);
  const intPart = Math.floor(x);
  let rem = r(x - intPart);
  s += String(intPart);
  if (digits > 0) s += '.';
  for (let i = 0; i < digits; i++) {
    rem = r(rem * 10);
    const d = Math.trunc(rem);
    s += String(d);
    rem = r(rem - d);
  }
  return s;
}

/**
 * Format a value the way Serial.print (or String(), when `forString`) does:
 * char prints as a character, bool as 1/0, ints in a base, floats with 2 decimals.
 */
export function fmtValue(v: CValue, t: Ty, fmt?: number, forString = false, f32 = false): string {
  switch (t.k) {
    case 'string':
    case 'cstr':
      return String(v);
    case 'array':
      return charsToString(v);
    case 'bool':
      return v ? '1' : '0';
    case 'float':
      if (forString) {
        const d = fmt ?? 2;
        if (!Number.isFinite(v)) return Number.isNaN(v) ? 'nan' : 'inf';
        return (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
      }
      return printFloat(v, fmt ?? 2, f32 || t.bits === 32);
    case 'int': {
      if (t.char && fmt === undefined) return String.fromCharCode(v & 0xff);
      const base = fmt ?? 10;
      if (base === 10) return String(v);
      const u = v < 0 ? (t.bits === 64 ? BigInt.asUintN(64, BigInt(v)) : (v >>> 0)) : v;
      const s = u.toString(base);
      return forString ? s : s.toUpperCase();
    }
    case 'obj':
      if (v && typeof v === 'object' && 'toString' in v && v.toString !== Object.prototype.toString) return String(v);
      return '';
    default:
      return String(v);
  }
}

/** printf / sprintf formatting for %d %i %u %ld %lu %x %X %o %c %s %f %e %g %%. */
export function cFormat(fmt: string, args: CValue[], types: Ty[]): string {
  let ai = 0;
  return fmt.replace(/%([-+ 0#]*)(\d+|\*)?(?:\.(\d+))?(hh|h|ll|l|z)?([diuxXocsfFeEgGp%])/g, (_m, flags: string, width: string | undefined, prec: string | undefined, _len, conv: string) => {
    if (conv === '%') return '%';
    let w = width === '*' ? Number(args[ai++]) : width ? Number(width) : 0;
    const v = args[ai];
    const t = types[ai];
    ai++;
    let s: string;
    switch (conv) {
      case 'd':
      case 'i':
        s = String(Math.trunc(Number(v)));
        if (flags.includes('+') && Number(v) >= 0) s = '+' + s;
        break;
      case 'u':
        s = String(Number(v) >>> 0);
        break;
      case 'x':
      case 'X':
        s = (Number(v) >>> 0).toString(16);
        if (conv === 'X') s = s.toUpperCase();
        if (flags.includes('#')) s = '0x' + s;
        break;
      case 'o':
        s = (Number(v) >>> 0).toString(8);
        break;
      case 'c':
        s = String.fromCharCode(Number(v) & 0xff);
        break;
      case 's':
        s = t?.k === 'array' ? charsToString(v) : String(v ?? '');
        if (prec !== undefined) s = s.slice(0, Number(prec));
        break;
      case 'e':
      case 'E':
        s = Number(v).toExponential(prec !== undefined ? Number(prec) : 6);
        s = s.replace(/e([+-])(\d)$/, 'e$10$2');
        if (conv === 'E') s = s.toUpperCase();
        break;
      case 'g':
      case 'G':
        s = String(Number(Number(v).toPrecision(prec !== undefined ? Math.max(1, Number(prec)) : 6)));
        break;
      default:
        s = Number(v).toFixed(prec !== undefined ? Number(prec) : 6);
        if (flags.includes('+') && Number(v) >= 0) s = '+' + s;
    }
    if (w && s.length < w) {
      if (flags.includes('-')) s = s.padEnd(w);
      else if (flags.includes('0') && /[diuxXofFeE]/.test(conv)) {
        const neg = s.startsWith('-') || s.startsWith('+');
        s = neg ? s[0] + s.slice(1).padStart(w - 1, '0') : s.padStart(w, '0');
      } else s = s.padStart(w);
    }
    w = 0;
    return s;
  });
}

// Pins helpers --------------------------------------------------------------------

function pinArg(rt: ArduinoRt, v: number, what = 'pin'): number {
  const n = Math.trunc(v);
  const p = rt.world.profile;
  if (!isKnownPin(p, n)) throw new InterpError('runtime', `${what} ${n} does not exist on ${p.name}`, null, p.notes.find((x) => /pin|GPIO|D\d/.test(x)));
  return n;
}

function writeServoPulse(rt: ArduinoRt, pin: number, us: number): void {
  const st = rt.world.pin(pin);
  if (st.servoUs !== us) {
    st.servoUs = us;
    st.mode = 'output';
    rt.world.touch();
  }
}

/** Wait helper used by delay(): sleeps unless inside an ISR, where delay() does not work. */
function* sleepMs(rt: ArduinoRt, ms: number): Gen<void> {
  if (rt.inIsr) {
    rt.warn('delay() inside an interrupt handler does not work on real hardware (millis stops counting); keep ISRs short');
    return;
  }
  if (ms <= 0) return;
  yield* rt.sleepUntil(rt.world.now + ms * 1000);
}

function serialObj() {
  return { baud: 0, timeout: 1000 };
}

// Builtin functions ----------------------------------------------------------------

const num = (ts: Ty[], env: TypeEnv, i = 0) => (ts[i] ? env.promote(ts[i]) : env.int);
const commonOf = (ts: Ty[], env: TypeEnv) => ts.reduce((a, b) => env.common(a, b), ts[0] ?? env.int);

export const BUILTINS: Record<string, Builtin> = {
  pinMode: {
    ret: 'void', min: 2, max: 2,
    fn: (rt, [pin, mode]) => {
      const n = pinArg(rt, pin);
      const m = mode === 0 ? 'input' : mode === 1 ? 'output' : mode === 2 ? 'input_pullup' : mode === 3 ? 'input_pulldown' : 'open_drain';
      if (m === 'input_pulldown' && !(isEsp32(rt.world.profile) || rt.world.profile.id === 'pico' || rt.world.profile.id === 'nucleo-f401re')) {
        throw new InterpError('runtime', `INPUT_PULLDOWN does not exist on ${rt.world.profile.name}`, null, 'use INPUT with an external 10 kΩ resistor to GND, or INPUT_PULLUP');
      }
      rt.world.setMode(n, m);
    },
  },
  digitalWrite: { ret: 'void', min: 2, max: 2, fn: (rt, [pin, v]) => rt.world.digitalWrite(pinArg(rt, pin), v) },
  digitalRead: {
    ret: 'int', min: 1, max: 1, pure: true,
    fn: (rt, [pin]) => {
      const n = pinArg(rt, pin);
      if (rt.world.profile.analogOnlyPins?.includes(n)) {
        rt.warn(`${rt.world.pinName(n)} is analog only: digitalRead() always returns 0 there; use analogRead()`);
        return 0;
      }
      return rt.world.level(n);
    },
  },
  analogRead: {
    ret: 'int', min: 1, max: 1, pure: true,
    fn: (rt, [pin]) => {
      const p = rt.world.profile;
      let n = Math.trunc(pin);
      if (isAvr(p) || p.id === 'uno-r4') {
        if (n >= 0 && n <= 7 && !p.analogPins.includes(n)) n += 14; // analogRead(0) means A0
      }
      if (!p.analogPins.includes(n)) throw new InterpError('runtime', `pin ${rt.world.pinName(n)} has no analog input on ${p.name}`, null, `analog pins: ${p.analogPins.map((x) => rt.world.pinName(x)).join(', ')}`);
      if (isEsp32(p) && rt.world.wifi.status === 'connected') {
        const adc2 = p.id === 'esp32-devkitc' ? [0, 2, 4, 12, 13, 14, 15, 25, 26, 27] : [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
        if (adc2.includes(n)) {
          rt.warn(`GPIO${n} is on ADC2, which the Wi-Fi radio uses: analogRead() fails while Wi-Fi is on; use an ADC1 pin`);
          return 0;
        }
      }
      return rt.world.analogRead(n);
    },
  },
  analogReadMilliVolts: {
    ret: 'unsigned long', min: 1, max: 1, pure: true, boards: isEsp32,
    fn: (rt, [pin]) => Math.round((rt.world.analogRead(Math.trunc(pin), 12) / 4095) * 3300),
  },
  analogWrite: {
    ret: 'void', min: 2, max: 2,
    fn: (rt, [pin, v]) => {
      const n = pinArg(rt, pin);
      const p = rt.world.profile;
      if (p.id === 'uno-r4' && n === 14) {
        // The R4's 12-bit DAC follows analogWriteResolution(), like PWM: 8 bits until a sketch asks for more.
        const max = (1 << rt.world.pwmBits) - 1;
        const st = rt.world.pin(n);
        st.dac = (Math.max(0, Math.min(max, v)) / max) * p.logicV;
        st.mode = 'output';
        rt.world.touch();
        return;
      }
      if (isAvr(p) && (n === 9 || n === 10) && rt.objects.get('__servoTimer1')) {
        rt.warn('the Servo library uses Timer1, so analogWrite() on pins 9 and 10 stops working');
      }
      const max = rt.objects.has('__pwmRange') ? (rt.objects.get('__pwmRange') as number) : (1 << rt.world.pwmBits) - 1;
      rt.world.analogWrite(n, Math.trunc(v), max, isAvr(p) && (n === 5 || n === 6) ? 980 : isAvr(p) ? 490 : isEsp(p) ? 1000 : 500);
    },
  },
  analogReadResolution: {
    ret: 'void', min: 1, max: 1, boards: (p) => !isAvr(p), boardHint: 'the ATmega328P ADC is fixed at 10 bits',
    fn: (rt, [bits]) => {
      const p = rt.world.profile;
      rt.world.adcBits = Math.max(1, Math.min(p.adcMaxBits || 12, Math.trunc(bits)));
    },
  },
  analogWriteResolution: {
    ret: 'void', min: 1, max: 1, boards: (p) => !isAvr(p),
    fn: (rt, [bits]) => {
      rt.world.pwmBits = Math.max(1, Math.min(16, Math.trunc(bits)));
      rt.objects.delete('__pwmRange');
    },
  },
  analogWriteRange: {
    ret: 'void', min: 1, max: 1, boards: (p) => p.id === 'nodemcu',
    fn: (rt, [range]) => void rt.objects.set('__pwmRange', Math.trunc(range)),
  },
  analogReference: { ret: 'void', min: 1, max: 1, fn: () => undefined },
  delay: { ret: 'void', min: 1, max: 1, gen: (rt, [ms]) => sleepMs(rt, Math.max(0, Math.trunc(ms) >>> 0)) },
  delayMicroseconds: {
    ret: 'void', min: 1, max: 1, fineClock: true,
    gen: function* (rt, [us]) {
      const d = Math.trunc(us) & (rt.world.profile.intBits === 16 ? 0xffff : 0xffffffff);
      // Busy-waits even inside an ISR.
      if (rt.inIsr) {
        rt.advance(rt.world.now + d);
        return;
      }
      yield* rt.sleepUntil(rt.world.now + d);
    },
  },
  millis: { ret: 'unsigned long', min: 0, max: 0, pure: true, fn: (rt) => Math.floor(rt.world.now / 1000) >>> 0 },
  micros: {
    ret: 'unsigned long', min: 0, max: 0, pure: true, fineClock: true,
    fn: (rt) => {
      const step = isAvr(rt.world.profile) ? 4 : 1; // 16 MHz AVR: 4 µs resolution
      return (Math.floor(rt.world.now / step) * step) >>> 0;
    },
  },
  yield: { ret: 'void', min: 0, max: 0, pure: true, fn: () => undefined },
  tone: {
    ret: 'void', min: 2, max: 3,
    fn: (rt, [pin, hz, ms]) => {
      const n = pinArg(rt, pin);
      const w = rt.world;
      if (isAvr(w.profile) && !w.warned.has('tone-pwm')) {
        w.warned.add('tone-pwm');
        rt.warn('tone() uses Timer2: PWM on pins 3 and 11 stops while a tone plays');
      }
      if (hz < 31) throw new InterpError('runtime', `tone(${Math.trunc(hz)} Hz) is too low: the lowest tone is 31 Hz`, null);
      const st = w.pin(n);
      st.mode = 'output';
      st.toneHz = Math.trunc(hz);
      st.duty = null;
      w.touch();
      const key = `__tone${n}`;
      (rt.objects.get(key) as (() => void) | undefined)?.();
      if (ms !== undefined && ms > 0) {
        rt.objects.set(key, w.clock.after(Math.trunc(ms) * 1000, () => {
          st.toneHz = 0;
          w.touch();
        }));
      }
    },
  },
  noTone: {
    ret: 'void', min: 1, max: 1,
    fn: (rt, [pin]) => {
      const st = rt.world.pin(Math.trunc(pin));
      if (st.toneHz) {
        st.toneHz = 0;
        st.out = 0;
        rt.world.touch();
      }
    },
  },
  pulseIn: { ret: 'unsigned long', min: 2, max: 3, fineClock: true, gen: (rt, [pin, level, timeout]) => pulseIn(rt, pin, level, timeout ?? 1_000_000) },
  pulseInLong: { ret: 'unsigned long', min: 2, max: 3, fineClock: true, gen: (rt, [pin, level, timeout]) => pulseIn(rt, pin, level, timeout ?? 1_000_000) },
  attachInterrupt: {
    ret: 'void', min: 3, max: 3, fnArgs: [1],
    fn: (rt, [irq, fn, mode]) => {
      const p = rt.world.profile;
      let pin = Math.trunc(irq);
      if (isAvr(p)) {
        if (pin === -1 || pin === 255) throw new InterpError('runtime', 'that pin has no external interrupt on the Uno: use pin 2 or 3', null);
        pin = pin === 0 ? 2 : pin === 1 ? 3 : -1;
        if (pin < 0) throw new InterpError('runtime', `interrupt number ${irq} does not exist: use digitalPinToInterrupt(2) or digitalPinToInterrupt(3)`, null);
      }
      const edge = mode === 1 ? 'change' : mode === 2 ? 'falling' : mode === 3 ? 'rising' : mode === 0 ? 'low' : mode === 4 ? 'high' : 'change';
      rt.world.attachInterrupt(pin, edge, () => rt.runSync(rt.invoke(fn)));
    },
  },
  detachInterrupt: {
    ret: 'void', min: 1, max: 1,
    fn: (rt, [irq]) => {
      let pin = Math.trunc(irq);
      if (isAvr(rt.world.profile)) pin = pin === 0 ? 2 : pin === 1 ? 3 : pin;
      rt.world.detachInterrupt(pin);
    },
  },
  digitalPinToInterrupt: {
    ret: 'int', min: 1, max: 1, pure: true, constFold: true,
    fn: (rt, [pin]) => {
      if (isAvr(rt.world.profile)) return pin === 2 ? 0 : pin === 3 ? 1 : -1;
      return Math.trunc(pin);
    },
  },
  interrupts: { ret: 'void', min: 0, max: 0, fn: (rt) => { rt.world.interruptsEnabled = true; rt.serviceIrqs(); } },
  noInterrupts: { ret: 'void', min: 0, max: 0, fn: (rt) => void (rt.world.interruptsEnabled = false) },
  sei: { ret: 'void', min: 0, max: 0, fn: (rt) => { rt.world.interruptsEnabled = true; rt.serviceIrqs(); } },
  cli: { ret: 'void', min: 0, max: 0, fn: (rt) => void (rt.world.interruptsEnabled = false) },
  map: {
    ret: 'long', min: 5, max: 5, pure: true, constFold: true,
    fn: (_rt, [x, a, b, c, d]) => {
      // Arduino's map() is integer (long) math and truncates.
      const den = Math.trunc(b) - Math.trunc(a);
      if (den === 0) throw new InterpError('runtime', 'map() with in_min == in_max divides by zero', null);
      return Math.trunc(((Math.trunc(x) - Math.trunc(a)) * (Math.trunc(d) - Math.trunc(c))) / den + Math.trunc(c)) | 0;
    },
  },
  constrain: { ret: commonOf, min: 3, max: 3, pure: true, constFold: true, fn: (_rt, [x, lo, hi]) => (x < lo ? lo : x > hi ? hi : x) },
  min: { ret: commonOf, min: 2, max: 2, pure: true, constFold: true, fn: (_rt, [a, b]) => (a < b ? a : b) },
  max: { ret: commonOf, min: 2, max: 2, pure: true, constFold: true, fn: (_rt, [a, b]) => (a > b ? a : b) },
  abs: { ret: (ts, env) => num(ts, env), min: 1, max: 1, pure: true, constFold: true, fn: (_rt, [a]) => (a < 0 ? -a : a) },
  sq: { ret: (ts, env) => num(ts, env), min: 1, max: 1, pure: true, constFold: true, fn: (_rt, [a]) => a * a },
  sqrt: { ret: 'double', min: 1, max: 1, pure: true, constFold: true, fn: (_rt, [a]) => Math.sqrt(a) },
  sqrtf: { ret: 'float', min: 1, max: 1, pure: true, fn: (_rt, [a]) => Math.sqrt(a) },
  pow: { ret: 'double', min: 2, max: 2, pure: true, constFold: true, fn: (_rt, [a, b]) => Math.pow(a, b) },
  sin: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => Math.sin(a) },
  cos: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => Math.cos(a) },
  tan: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => Math.tan(a) },
  asin: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => Math.asin(a) },
  acos: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => Math.acos(a) },
  atan: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => Math.atan(a) },
  atan2: { ret: 'double', min: 2, max: 2, pure: true, fn: (_rt, [a, b]) => Math.atan2(a, b) },
  exp: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => Math.exp(a) },
  log: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => Math.log(a) },
  log10: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => Math.log10(a) },
  floor: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => Math.floor(a) },
  ceil: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => Math.ceil(a) },
  round: { ret: 'long', min: 1, max: 1, pure: true, fn: (_rt, [a]) => (a < 0 ? -Math.round(-a) : Math.round(a)) },
  fabs: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => Math.abs(a) },
  fmod: { ret: 'double', min: 2, max: 2, pure: true, fn: (_rt, [a, b]) => a % b },
  isnan: { ret: 'bool', min: 1, max: 1, pure: true, fn: (_rt, [a]) => (Number.isNaN(a) ? 1 : 0) },
  isinf: { ret: 'bool', min: 1, max: 1, pure: true, fn: (_rt, [a]) => (Number.isFinite(a) || Number.isNaN(a) ? 0 : 1) },
  radians: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => (a * Math.PI) / 180 },
  degrees: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [a]) => (a * 180) / Math.PI },
  random: {
    ret: 'long', min: 1, max: 2,
    fn: (rt, [a, b]) => {
      if (b === undefined) return a <= 0 ? 0 : rt.random() % Math.trunc(a);
      if (a >= b) return Math.trunc(a);
      return (rt.random() % (Math.trunc(b) - Math.trunc(a))) + Math.trunc(a);
    },
  },
  randomSeed: { ret: 'void', min: 1, max: 1, fn: (rt, [s]) => void (s !== 0 && (rt.randState = Math.trunc(s) >>> 0)) },
  bitRead: { ret: 'int', min: 2, max: 2, pure: true, constFold: true, fn: (_rt, [v, b]) => (Math.trunc(v) >>> b) & 1 },
  bit: { ret: 'unsigned long', min: 1, max: 1, pure: true, constFold: true, fn: (_rt, [b]) => (1 << b) >>> 0 },
  lowByte: { ret: 'uint8_t', min: 1, max: 1, pure: true, constFold: true, fn: (_rt, [v]) => v & 0xff },
  highByte: { ret: 'uint8_t', min: 1, max: 1, pure: true, constFold: true, fn: (_rt, [v]) => (v >> 8) & 0xff },
  makeWord: { ret: 'uint16_t', min: 2, max: 2, pure: true, constFold: true, fn: (_rt, [h, l]) => ((h & 0xff) << 8) | (l & 0xff) },
  shiftOut: {
    ret: 'void', min: 4, max: 4,
    fn: (rt, [data, clock, order, val]) => {
      const w = rt.world;
      for (let i = 0; i < 8; i++) {
        const bitv = order === 0 ? (val >> i) & 1 : (val >> (7 - i)) & 1;
        w.digitalWrite(data, bitv);
        w.digitalWrite(clock, 1);
        w.digitalWrite(clock, 0);
      }
    },
  },
  shiftIn: {
    ret: 'uint8_t', min: 3, max: 3,
    fn: (rt, [data, clock, order]) => {
      const w = rt.world;
      let v = 0;
      for (let i = 0; i < 8; i++) {
        w.digitalWrite(clock, 1);
        const b = w.level(data);
        v |= order === 0 ? b << i : b << (7 - i);
        w.digitalWrite(clock, 0);
      }
      return v;
    },
  },
  isDigit: { ret: 'bool', min: 1, max: 1, pure: true, fn: (_rt, [c]) => (c >= 48 && c <= 57 ? 1 : 0) },
  isAlpha: { ret: 'bool', min: 1, max: 1, pure: true, fn: (_rt, [c]) => (/[A-Za-z]/.test(String.fromCharCode(c)) ? 1 : 0) },
  isSpace: { ret: 'bool', min: 1, max: 1, pure: true, fn: (_rt, [c]) => (/\s/.test(String.fromCharCode(c)) ? 1 : 0) },
  toupper: { ret: 'int', min: 1, max: 1, pure: true, fn: (_rt, [c]) => String.fromCharCode(c).toUpperCase().charCodeAt(0) },
  tolower: { ret: 'int', min: 1, max: 1, pure: true, fn: (_rt, [c]) => String.fromCharCode(c).toLowerCase().charCodeAt(0) },
  strlen: { ret: 'size_t', min: 1, max: 1, pure: true, fn: (_rt, [s], ts) => (ts[0].k === 'array' ? charsToString(s) : String(s)).length },
  strcmp: { ret: 'int', min: 2, max: 2, pure: true, fn: (_rt, [a, b], ts) => { const x = ts[0].k === 'array' ? charsToString(a) : String(a); const y = ts[1].k === 'array' ? charsToString(b) : String(b); return x < y ? -1 : x > y ? 1 : 0; } },
  atoi: { ret: 'int', min: 1, max: 1, pure: true, fn: (_rt, [s], ts) => parseInt(ts[0].k === 'array' ? charsToString(s) : String(s), 10) || 0 },
  atol: { ret: 'long', min: 1, max: 1, pure: true, fn: (_rt, [s], ts) => parseInt(ts[0].k === 'array' ? charsToString(s) : String(s), 10) || 0 },
  atof: { ret: 'double', min: 1, max: 1, pure: true, fn: (_rt, [s], ts) => parseFloat(ts[0].k === 'array' ? charsToString(s) : String(s)) || 0 },
  sprintf: {
    ret: 'int', min: 2, max: 20,
    fn: (_rt, [buf, fmt, ...rest], ts) => writeChars(buf, cFormat(String(ts[1].k === 'array' ? charsToString(fmt) : fmt), rest, ts.slice(2)), Infinity),
  },
  snprintf: {
    ret: 'int', min: 3, max: 20,
    fn: (_rt, [buf, n, fmt, ...rest], ts) => writeChars(buf, cFormat(String(ts[2].k === 'array' ? charsToString(fmt) : fmt), rest, ts.slice(3)), n),
  },
  dtostrf: {
    ret: 'cstr', min: 4, max: 4,
    fn: (_rt, [v, width, prec, buf]) => {
      let s = Number(v).toFixed(prec);
      if (Math.abs(width) > s.length) s = width < 0 ? s.padEnd(-width) : s.padStart(width);
      writeChars(buf, s, Infinity);
      return s;
    },
  },
  // ESP32 LEDC (core 3.x pin-based API and 2.x channel API).
  ledcAttach: {
    ret: 'bool', min: 3, max: 3, boards: isEsp32,
    fn: (rt, [pin, freq, res]) => {
      ledc(rt).pins.set(Math.trunc(pin), { freq, res });
      rt.world.setMode(Math.trunc(pin), 'output');
      return 1;
    },
  },
  ledcSetup: {
    ret: 'double', min: 3, max: 3, boards: isEsp32, boardHint: 'ledcSetup() is the old 2.x API; arduino-esp32 3.x uses ledcAttach(pin, freq, bits)',
    fn: (rt, [ch, freq, res]) => {
      ledc(rt).channels.set(Math.trunc(ch), { freq, res, pins: [] });
      return freq;
    },
  },
  ledcAttachPin: {
    ret: 'void', min: 2, max: 2, boards: isEsp32,
    fn: (rt, [pin, ch]) => {
      const c = ledc(rt).channels.get(Math.trunc(ch));
      if (!c) throw new InterpError('runtime', `LEDC channel ${ch} is not set up: call ledcSetup() first`, null);
      c.pins.push(Math.trunc(pin));
      rt.world.setMode(Math.trunc(pin), 'output');
    },
  },
  ledcWrite: {
    ret: 'void', min: 2, max: 2, boards: isEsp32,
    fn: (rt, [target, duty]) => {
      const l = ledc(rt);
      const t = Math.trunc(target);
      const byPin = l.pins.get(t);
      if (byPin) {
        rt.world.analogWrite(t, duty, (1 << byPin.res) - 1, byPin.freq);
        return;
      }
      const ch = l.channels.get(t);
      if (ch) {
        for (const p of ch.pins) rt.world.analogWrite(p, duty, (1 << ch.res) - 1, ch.freq);
        return;
      }
      throw new InterpError('runtime', `ledcWrite(${t}, …): pin ${t} is not attached; call ledcAttach(${t}, 5000, 8) first`, null);
    },
  },
  ledcWriteTone: {
    ret: 'double', min: 2, max: 2, boards: isEsp32,
    fn: (rt, [pin, hz]) => {
      const st = rt.world.pin(Math.trunc(pin));
      st.toneHz = Math.trunc(hz);
      rt.world.touch();
      return hz;
    },
  },
  dacWrite: {
    ret: 'void', min: 2, max: 2, boards: (p) => p.id === 'esp32-devkitc', boardHint: 'only the original ESP32 has DAC pins (GPIO25, GPIO26)',
    fn: (rt, [pin, v]) => {
      if (pin !== 25 && pin !== 26) throw new InterpError('runtime', 'dacWrite() only works on GPIO25 and GPIO26', null);
      const st = rt.world.pin(pin);
      st.dac = (Math.max(0, Math.min(255, v)) / 255) * 3.3;
      st.mode = 'output';
      rt.world.touch();
    },
  },
  rgbLedWrite: { ret: 'void', min: 4, max: 4, boards: isEsp32, fn: (rt, [pin, r, g, b]) => setPixels(rt, pin, [[r, g, b]]) },
  neopixelWrite: { ret: 'void', min: 4, max: 4, boards: isEsp32, fn: (rt, [pin, r, g, b]) => setPixels(rt, pin, [[r, g, b]]) },
  touchRead: { ret: 'uint16_t', min: 1, max: 1, pure: true, boards: isEsp32, fn: (rt, [pin]) => (rt.world.level(pin) ? 12 : 72) },
  // The die's own sensor, which runs warm: 41.5 °C unless a world input sets it.
  temperatureRead: { ret: 'float', min: 0, max: 0, pure: true, boards: isEsp32, fn: (rt) => rt.world.onboard.get('temperature') ?? 41.5 },
  esp_sleep_enable_timer_wakeup: { ret: 'int', min: 1, max: 1, boards: isEsp32, fn: (rt, [us]) => { rt.wakeAfter = us; return 0; } },
  esp_deep_sleep_start: {
    ret: 'void', min: 0, max: 0, boards: isEsp32,
    gen: function* (rt) {
      if (rt.wakeAfter < 0) rt.wakeAfter = Infinity;
      throw new DeepSleep(rt.wakeAfter);
    },
  },
  esp_random: { ret: 'uint32_t', min: 0, max: 0, boards: isEsp32, fn: (rt) => rt.world.rng.next() },
};

/** Thrown by esp_deep_sleep_start(); the run reboots the sketch after `us`. */
export class DeepSleep {
  constructor(readonly us: number) {}
}

function writeChars(buf: unknown, s: string, n: number): number {
  if (!Array.isArray(buf)) throw new InterpError('runtime', 'the first argument must be a char array', null);
  const max = Math.min(buf.length, n);
  if (s.length + 1 > buf.length && n === Infinity) throw new InterpError('runtime', `the text "${s}" (${s.length + 1} bytes) overflows a ${buf.length}-byte buffer`, null, 'make the char array bigger or use snprintf');
  for (let i = 0; i < max; i++) buf[i] = i < s.length && i < max - 1 ? s.charCodeAt(i) : 0;
  return s.length;
}

function ledc(rt: ArduinoRt): { pins: Map<number, { freq: number; res: number }>; channels: Map<number, { freq: number; res: number; pins: number[] }> } {
  let l = rt.objects.get('__ledc') as ReturnType<typeof ledc> | undefined;
  if (!l) {
    l = { pins: new Map(), channels: new Map() };
    rt.objects.set('__ledc', l);
  }
  return l;
}

function setPixels(rt: ArduinoRt, pin: number, px: [number, number, number][]): void {
  rt.world.pixels.set(Math.trunc(pin), px.map(([r, g, b]) => [r & 255, g & 255, b & 255]));
  rt.world.touch();
}

function* pulseIn(rt: ArduinoRt, pin: number, level: number, timeout: number): Gen<number> {
  const w = rt.world;
  const n = Math.trunc(pin);
  const want = level ? 1 : 0;
  const deadline = w.now + Math.trunc(timeout);
  // Wait for any previous pulse to end, then for the start of a new one.
  if (!(yield* rt.waitFor(() => w.level(n) !== want, deadline))) return 0;
  if (!(yield* rt.waitFor(() => w.level(n) === want, deadline))) return 0;
  const start = w.now;
  if (!(yield* rt.waitFor(() => w.level(n) !== want, deadline))) return 0;
  return Math.round(w.now - start) >>> 0;
}

// Constants --------------------------------------------------------------------

const constCache = new WeakMap<BoardProfile, Record<string, { v: number; t: string }>>();

export function CONSTANTS(p: BoardProfile): Record<string, { v: number; t: string }> {
  const hit = constCache.get(p);
  if (hit) return hit;
  const c: Record<string, { v: number; t: string }> = {
    HIGH: { v: 1, t: 'int' }, LOW: { v: 0, t: 'int' }, INPUT: { v: 0, t: 'int' }, OUTPUT: { v: 1, t: 'int' }, INPUT_PULLUP: { v: 2, t: 'int' },
    INPUT_PULLDOWN: { v: 3, t: 'int' }, OUTPUT_OPEN_DRAIN: { v: 4, t: 'int' },
    CHANGE: { v: 1, t: 'int' }, FALLING: { v: 2, t: 'int' }, RISING: { v: 3, t: 'int' },
    DEC: { v: 10, t: 'int' }, HEX: { v: 16, t: 'int' }, OCT: { v: 8, t: 'int' }, BIN: { v: 2, t: 'int' },
    LSBFIRST: { v: 0, t: 'int' }, MSBFIRST: { v: 1, t: 'int' },
    SPI_MODE0: { v: 0, t: 'int' }, SPI_MODE1: { v: 1, t: 'int' }, SPI_MODE2: { v: 2, t: 'int' }, SPI_MODE3: { v: 3, t: 'int' },
    PI: { v: Math.PI, t: 'float' }, HALF_PI: { v: Math.PI / 2, t: 'float' }, TWO_PI: { v: Math.PI * 2, t: 'float' },
    DEG_TO_RAD: { v: Math.PI / 180, t: 'float' }, RAD_TO_DEG: { v: 180 / Math.PI, t: 'float' }, EULER: { v: Math.E, t: 'float' },
    NULL: { v: 0, t: 'int' }, NOT_AN_INTERRUPT: { v: -1, t: 'int' },
    DEFAULT: { v: 1, t: 'int' }, EXTERNAL: { v: 0, t: 'int' }, INTERNAL: { v: 3, t: 'int' },
    NEO_GRB: { v: 0x52, t: 'int' }, NEO_RGB: { v: 0x06, t: 'int' }, NEO_RGBW: { v: 0x1b, t: 'int' }, NEO_GRBW: { v: 0x5b, t: 'int' }, NEO_KHZ800: { v: 0, t: 'int' }, NEO_KHZ400: { v: 0x100, t: 'int' },
    SSD1306_SWITCHCAPVCC: { v: 2, t: 'int' }, SSD1306_EXTERNALVCC: { v: 1, t: 'int' }, SSD1306_WHITE: { v: 1, t: 'int' }, SSD1306_BLACK: { v: 0, t: 'int' }, SSD1306_INVERSE: { v: 2, t: 'int' },
    WHITE: { v: 1, t: 'int' }, BLACK: { v: 0, t: 'int' }, INVERSE: { v: 2, t: 'int' },
    WL_IDLE_STATUS: { v: 0, t: 'int' }, WL_NO_SSID_AVAIL: { v: 1, t: 'int' }, WL_SCAN_COMPLETED: { v: 2, t: 'int' }, WL_CONNECTED: { v: 3, t: 'int' },
    WL_CONNECT_FAILED: { v: 4, t: 'int' }, WL_CONNECTION_LOST: { v: 5, t: 'int' }, WL_DISCONNECTED: { v: 6, t: 'int' },
    WIFI_STA: { v: 1, t: 'int' }, WIFI_AP: { v: 2, t: 'int' }, WIFI_AP_STA: { v: 3, t: 'int' }, WIFI_OFF: { v: 0, t: 'int' },
    HTTP_GET: { v: 1, t: 'int' }, HTTP_POST: { v: 3, t: 'int' }, HTTP_ANY: { v: 0, t: 'int' },
    RGB_BRIGHTNESS: { v: 64, t: 'int' }, QTR_EMITTERS_ON: { v: 1, t: 'int' },
    SERIAL_8N1: { v: 0x06, t: 'int' },
    SENSORS_PRESSURE_SEALEVELHPA: { v: 1013.25, t: 'float' },
  };
  for (const [k, v] of Object.entries(p.aliases)) c[k] = { v, t: k === 'LED_BUILTIN' || k === 'RGB_BUILTIN' ? 'int' : 'uint8_t' };
  if (p.id === 'esp32-devkitc') delete c.LED_BUILTIN;
  constCache.set(p, c);
  return c;
}

// Library classes ------------------------------------------------------------------

const fmtArgs = (rt: ArduinoRt, a: CValue[], ts: Ty[]): string => {
  if (!a.length) return '';
  const f32 = rt.env.double.k === 'float' && rt.env.double.bits === 32;
  if (ts[0].k === 'obj' && a[0] && typeof a[0] === 'object' && 'ip' in a[0]) return String(a[0].ip);
  return fmtValue(a[0], ts[0], a[1], false, f32);
};

function* readTimeout(rt: ArduinoRt, timeout: number, until?: number): Gen<string> {
  const w = rt.world;
  let s = '';
  let deadline = w.now + timeout * 1000;
  while (true) {
    while (w.serialAvailable()) {
      const c = w.serialRead();
      if (until !== undefined && c === until) return s;
      s += String.fromCharCode(c);
      deadline = w.now + timeout * 1000;
    }
    if (w.now >= deadline) return s;
    yield Math.min(deadline, w.now + 1000);
  }
}

const SerialClass: LibClass = {
  headers: [],
  create: () => serialObj(),
  methods: {
    begin: { ret: 'void', fn: (_rt, self, [baud]) => void (self.baud = baud) },
    end: { ret: 'void', fn: (_rt, self) => void (self.baud = 0) },
    print: { ret: 'size_t', fn: (rt, _s, a, ts) => { const s = fmtArgs(rt, a, ts); rt.world.print(s); return s.length; } },
    println: { ret: 'size_t', fn: (rt, _s, a, ts) => { const s = fmtArgs(rt, a, ts) + '\r\n'; rt.world.print(s); return s.length; } },
    printf: { ret: 'size_t', min: 1, fn: (rt, _s, [fmt, ...rest], ts) => { const s = cFormat(String(fmt), rest, ts.slice(1)); rt.world.print(s); return s.length; } },
    write: {
      ret: 'size_t',
      fn: (rt, _s, [v], ts) => {
        const s = ts[0].k === 'cstr' || ts[0].k === 'string' ? String(v) : ts[0].k === 'array' ? charsToString(v) : String.fromCharCode(v & 0xff);
        rt.world.print(s);
        return s.length;
      },
    },
    flush: { ret: 'void', fn: () => undefined },
    available: { ret: 'int', pure: true, fn: (rt) => rt.world.serialAvailable() },
    availableForWrite: { ret: 'int', pure: true, fn: () => 63 },
    read: { ret: 'int', fn: (rt) => rt.world.serialRead() },
    peek: { ret: 'int', pure: true, fn: (rt) => rt.world.serialPeek() },
    setTimeout: { ret: 'void', fn: (_rt, self, [ms]) => void (self.timeout = ms) },
    readString: { ret: 'String', gen: (rt, self) => readTimeout(rt, self.timeout) },
    readStringUntil: { ret: 'String', gen: (rt, self, [c]) => readTimeout(rt, self.timeout, c) },
    parseInt: { ret: 'long', gen: function* (rt, self) { const s = yield* readTimeout(rt, self.timeout, 10); return parseInt(s.trim(), 10) || 0; } },
    parseFloat: { ret: 'float', gen: function* (rt, self) { const s = yield* readTimeout(rt, self.timeout, 10); return parseFloat(s.trim()) || 0; } },
  },
};

const unmodelledWrite = (name: string): LibMethod => ({ ret: 'size_t', fn: () => { throw notModelled(`Serial1.${name}()`, 'bus-device-not-modelled', null); } });

// A second UART has no device on it in the simulator: it stays silent and any output is an error, so text never lands in the Serial monitor.
const HardwareSerial1Class: LibClass = {
  ...SerialClass,
  methods: {
    ...SerialClass.methods,
    print: unmodelledWrite('print'),
    println: unmodelledWrite('println'),
    write: unmodelledWrite('write'),
    printf: { ...unmodelledWrite('printf'), min: 1 },
    available: { ret: 'int', pure: true, fn: () => 0 },
    availableForWrite: { ret: 'int', pure: true, fn: () => 0 },
    read: { ret: 'int', fn: () => -1 },
    peek: { ret: 'int', pure: true, fn: () => -1 },
    readString: { ret: 'String', gen: function* () { return ''; } },
    readStringUntil: { ret: 'String', gen: function* () { return ''; } },
    parseInt: { ret: 'long', gen: function* () { return 0; } },
    parseFloat: { ret: 'float', gen: function* () { return 0; } },
  },
};

const StringClass: LibClass = {
  headers: [],
  create: () => '',
  methods: {
    length: { ret: 'unsigned int', pure: true, fn: (_rt, s) => s.v.length },
    charAt: { ret: 'char', pure: true, fn: (_rt, s, [i]) => s.v.charCodeAt(i) || 0 },
    substring: { ret: 'String', pure: true, fn: (_rt, s, [a, b]) => s.v.substring(a, b === undefined ? undefined : b) },
    indexOf: { ret: 'int', pure: true, fn: (_rt, s, [x, from], ts) => s.v.indexOf(ts[0].k === 'int' ? String.fromCharCode(x) : String(x), from ?? 0) },
    lastIndexOf: { ret: 'int', pure: true, fn: (_rt, s, [x], ts) => s.v.lastIndexOf(ts[0].k === 'int' ? String.fromCharCode(x) : String(x)) },
    toInt: { ret: 'long', pure: true, fn: (_rt, s) => parseInt(s.v, 10) || 0 },
    toFloat: { ret: 'float', pure: true, fn: (_rt, s) => parseFloat(s.v) || 0 },
    toDouble: { ret: 'double', pure: true, fn: (_rt, s) => parseFloat(s.v) || 0 },
    c_str: { ret: 'cstr', pure: true, fn: (_rt, s) => s.v },
    equals: { ret: 'bool', pure: true, fn: (_rt, s, [x]) => (s.v === String(x) ? 1 : 0) },
    equalsIgnoreCase: { ret: 'bool', pure: true, fn: (_rt, s, [x]) => (s.v.toLowerCase() === String(x).toLowerCase() ? 1 : 0) },
    startsWith: { ret: 'bool', pure: true, fn: (_rt, s, [x]) => (s.v.startsWith(String(x)) ? 1 : 0) },
    endsWith: { ret: 'bool', pure: true, fn: (_rt, s, [x]) => (s.v.endsWith(String(x)) ? 1 : 0) },
    isEmpty: { ret: 'bool', pure: true, fn: (_rt, s) => (s.v.length ? 0 : 1) },
    trim: { ret: 'void', fn: (_rt, s) => void (s.v = s.v.trim()) },
    toUpperCase: { ret: 'void', fn: (_rt, s) => void (s.v = s.v.toUpperCase()) },
    toLowerCase: { ret: 'void', fn: (_rt, s) => void (s.v = s.v.toLowerCase()) },
    replace: { ret: 'void', fn: (_rt, s, [a, b], ts) => void (s.v = s.v.split(ts[0].k === 'int' ? String.fromCharCode(a) : String(a)).join(ts[1].k === 'int' ? String.fromCharCode(b) : String(b))) },
    remove: { ret: 'void', fn: (_rt, s, [i, n]) => void (s.v = s.v.slice(0, i) + (n === undefined ? '' : s.v.slice(i + n))) },
    concat: { ret: 'bool', fn: (_rt, s, [x], ts) => { s.v += fmtValue(x, ts[0], undefined, true); return 1; } },
    setCharAt: { ret: 'void', fn: (_rt, s, [i, c]) => void (i < s.v.length && (s.v = s.v.slice(0, i) + String.fromCharCode(c) + s.v.slice(i + 1))) },
  },
};

/** Wire.endTransmission() return codes: 0 ok, 2 NACK on address, 3 NACK on data, 4 other. */
const WIRE_STATUS = { ok: 0, 'nack-address': 2, 'nack-data': 3, 'stuck-low': 4 } as const;
const TWI = { tx: -1, buf: [] as number[], rx: [] as number[] };
const WireClass: LibClass = {
  headers: ['Wire.h'],
  create: () => ({ ...TWI, buf: [], rx: [] }),
  methods: {
    begin: {
      ret: 'void',
      fn: (rt, _self, [sda, scl]) => {
        if (sda !== undefined && scl === undefined) throw notModelled('Wire.begin(address) as a slave', 'library-method-not-modelled', null);
        rt.world.bindI2c(sda, scl);
      },
    },
    setClock: {
      ret: 'void',
      fn: (rt, _self, [hz]) => {
        const applied = rt.world.bus.setClock(hz);
        if (applied !== Math.round(hz)) rt.warn(`Wire.setClock(${hz}) is outside what I²C allows: using ${applied} Hz`);
      },
    },
    beginTransmission: { ret: 'void', fn: (_rt, self, [addr]) => { self.tx = addr & 0x7f; self.buf = []; } },
    write: {
      ret: 'size_t',
      fn: (_rt, self, [v, n], ts) => {
        if (ts[0].k === 'array') {
          const arr = v as number[];
          self.buf.push(...arr.slice(0, n ?? arr.length));
        } else if (ts[0].k === 'cstr' || ts[0].k === 'string') self.buf.push(...[...String(v)].map((c) => c.charCodeAt(0)));
        else self.buf.push(v & 0xff);
        return 1;
      },
    },
    endTransmission: {
      ret: 'uint8_t',
      fn: (rt, self) => {
        const r = rt.world.i2cTransfer(self.tx, self.buf, 0);
        self.buf = [];
        rt.advance(rt.world.now + r.costUs);
        return WIRE_STATUS[r.error ?? 'ok'];
      },
    },
    requestFrom: {
      ret: 'uint8_t',
      fn: (rt, self, [addr, n]) => {
        const r = rt.world.i2cTransfer(addr & 0x7f, [], n);
        rt.advance(rt.world.now + r.costUs);
        self.rx = r.bytes;
        return self.rx.length;
      },
    },
    available: { ret: 'int', pure: true, fn: (_rt, self) => self.rx.length },
    read: { ret: 'int', fn: (_rt, self) => (self.rx.length ? self.rx.shift() : -1) },
  },
};

const SpiClass: LibClass = {
  headers: ['SPI.h'],
  create: () => ({}),
  methods: {
    begin: { ret: 'void', fn: () => undefined },
    end: { ret: 'void', fn: () => undefined },
    beginTransaction: { ret: 'void', fn: () => undefined },
    endTransaction: { ret: 'void', fn: () => undefined },
    transfer: {
      ret: 'uint8_t',
      fn: (rt, _self, [v]) => {
        const r = rt.world.spiTransfer(v & 0xff);
        if ('notModelled' in r) {
          throw notModelled('SPI.transfer()', r.causeId, null, 'No device is selected on this bus (SPI devices are not modelled yet). Add a chip-select pin and a part that has an SPI model, or use I²C.');
        }
        rt.advance(rt.world.now + r.costUs);
        return r.byte;
      },
    },
    setClockDivider: { ret: 'void', fn: () => undefined },
  },
};

const SPISettingsClass: LibClass = { headers: ['SPI.h'], create: () => ({}), methods: {} };

// Servo: 544–2400 µs for 0–180° (Servo.h defaults).
const ServoClass: LibClass = {
  headers: ['Servo.h', 'ESP32Servo.h'],
  create: () => ({ pin: -1, us: 1500, min: 544, max: 2400 }),
  methods: {
    attach: {
      ret: 'uint8_t',
      fn: (rt, self, [pin, mn, mx]) => {
        self.pin = Math.trunc(pin);
        if (mn !== undefined) self.min = mn;
        if (mx !== undefined) self.max = mx;
        if (isAvr(rt.world.profile)) rt.objects.set('__servoTimer1', true);
        writeServoPulse(rt, self.pin, self.us);
        return 1;
      },
    },
    detach: { ret: 'void', fn: (rt, self) => { if (self.pin >= 0) writeServoPulse(rt, self.pin, 0); self.pin = -1; } },
    write: {
      ret: 'void',
      fn: (rt, self, [v]) => {
        // Values below 544 are angles, larger ones are pulse widths (Servo.h rule).
        let us: number;
        if (v < 544) {
          const a = Math.max(0, Math.min(180, Math.trunc(v)));
          us = Math.round(self.min + ((self.max - self.min) * a) / 180);
        } else us = Math.trunc(v);
        self.us = us;
        if (self.pin >= 0) writeServoPulse(rt, self.pin, us);
      },
    },
    writeMicroseconds: { ret: 'void', fn: (rt, self, [us]) => { self.us = Math.trunc(us); if (self.pin >= 0) writeServoPulse(rt, self.pin, self.us); } },
    read: { ret: 'int', pure: true, fn: (_rt, self) => Math.round(((self.us - self.min) * 180) / (self.max - self.min)) },
    readMicroseconds: { ret: 'int', pure: true, fn: (_rt, self) => self.us },
    attached: { ret: 'bool', pure: true, fn: (_rt, self) => (self.pin >= 0 ? 1 : 0) },
  },
};

/** AccelStepper with its trapezoidal speed profile, stepping on the virtual clock. */
interface Stepper {
  pins: number[];
  type: number;
  pos: number;
  target: number;
  speed: number;
  maxSpeed: number;
  accel: number;
  lastStepUs: number;
  phase: number;
}
const FULL4 = [[1, 0, 1, 0], [0, 1, 1, 0], [0, 1, 0, 1], [1, 0, 0, 1]];
function stepperOutputs(rt: ArduinoRt, s: Stepper): void {
  if (s.type === 1) {
    rt.world.digitalWrite(s.pins[1], s.speed >= 0 || s.target > s.pos ? 1 : 0);
    rt.world.digitalWrite(s.pins[0], 1);
    rt.world.digitalWrite(s.pins[0], 0);
    return;
  }
  const pat = FULL4[((s.pos % 4) + 4) % 4];
  // AccelStepper FULL4WIRE takes (IN1, IN3, IN2, IN4) for a 28BYJ-48 on a ULN2003.
  s.pins.forEach((p, i) => rt.world.digitalWrite(p, pat[i]));
}
function stepperRun(rt: ArduinoRt, s: Stepper): boolean {
  const dist = s.target - s.pos;
  if (dist === 0 && Math.abs(s.speed) < 1) {
    s.speed = 0;
    return false;
  }
  const now = rt.world.now;
  const sp = Math.abs(s.speed) || Math.sqrt(2 * s.accel) || 1;
  const interval = 1_000_000 / sp;
  if (now - s.lastStepUs < interval) return dist !== 0;
  const dt = s.lastStepUs ? Math.min(now - s.lastStepUs, 100_000) / 1_000_000 : interval / 1_000_000;
  s.lastStepUs = now;
  // Speed up or slow down so the motor stops on the target.
  const stopDist = (s.speed * s.speed) / (2 * s.accel);
  const dir = Math.sign(dist);
  let v = Math.abs(s.speed);
  if (Math.abs(dist) <= stopDist + 0.5) v = Math.max(Math.sqrt(2 * s.accel), v - s.accel * dt);
  else v = Math.min(s.maxSpeed, v + s.accel * dt);
  s.speed = dir * v;
  if (dist !== 0) {
    s.pos += dir;
    stepperOutputs(rt, s);
  }
  if (s.pos === s.target) s.speed = 0;
  return s.pos !== s.target;
}
const AccelStepperClass: LibClass = {
  headers: ['AccelStepper.h'],
  statics: { FUNCTION: 0, DRIVER: 1, FULL2WIRE: 2, FULL3WIRE: 3, FULL4WIRE: 4, HALF3WIRE: 6, HALF4WIRE: 8 },
  create: (rt, [type = 4, a = 2, b = 3, c = 4, d = 5]) => {
    const s: Stepper = { type, pins: type === 1 ? [a, b] : [a, b, c, d], pos: 0, target: 0, speed: 0, maxSpeed: 1, accel: 1, lastStepUs: 0, phase: 0 };
    // The real constructor calls enableOutputs(): every motor pin becomes an OUTPUT.
    s.pins.forEach((p) => rt.world.setMode(p, 'output'));
    return s;
  },
  methods: {
    setMaxSpeed: { ret: 'void', fn: (_rt, s, [v]) => void (s.maxSpeed = Math.abs(v)) },
    setAcceleration: { ret: 'void', fn: (_rt, s, [v]) => void (s.accel = Math.max(0.0001, Math.abs(v))) },
    setSpeed: { ret: 'void', fn: (_rt, s, [v]) => void (s.speed = v) },
    moveTo: { ret: 'void', fn: (_rt, s, [v]) => void (s.target = Math.trunc(v)) },
    move: { ret: 'void', fn: (_rt, s, [v]) => void (s.target = s.pos + Math.trunc(v)) },
    run: { ret: 'bool', fn: (rt, s) => (stepperRun(rt, s) ? 1 : 0) },
    runSpeed: {
      ret: 'bool',
      fn: (rt, s) => {
        if (!s.speed) return 0;
        const interval = 1_000_000 / Math.abs(s.speed);
        if (rt.world.now - s.lastStepUs < interval) return 0;
        s.lastStepUs = rt.world.now;
        s.pos += Math.sign(s.speed);
        stepperOutputs(rt, s);
        return 1;
      },
    },
    runToPosition: {
      ret: 'void',
      gen: function* (rt, s) {
        while (stepperRun(rt, s)) {
          const sp = Math.abs(s.speed) || Math.sqrt(2 * s.accel) || 1;
          yield* rt.sleepUntil(Math.max(rt.world.now + 1, s.lastStepUs + 1_000_000 / sp));
        }
      },
    },
    stop: { ret: 'void', fn: (_rt, s) => { const stopDist = Math.round((s.speed * s.speed) / (2 * s.accel)); s.target = s.pos + Math.sign(s.speed) * stopDist; } },
    distanceToGo: { ret: 'long', pure: true, fn: (_rt, s) => s.target - s.pos },
    currentPosition: { ret: 'long', pure: true, fn: (_rt, s) => s.pos },
    targetPosition: { ret: 'long', pure: true, fn: (_rt, s) => s.target },
    setCurrentPosition: { ret: 'void', fn: (_rt, s, [v]) => { s.pos = Math.trunc(v); s.target = s.pos; s.speed = 0; } },
    speed: { ret: 'float', pure: true, fn: (_rt, s) => s.speed },
    isRunning: { ret: 'bool', pure: true, fn: (_rt, s) => (s.speed !== 0 || s.pos !== s.target ? 1 : 0) },
    disableOutputs: { ret: 'void', fn: (rt, s) => s.pins.forEach((p: number) => rt.world.digitalWrite(p, 0)) },
    enableOutputs: { ret: 'void', fn: (rt, s) => s.pins.forEach((p: number) => rt.world.setMode(p, 'output')) },
  },
};

function hsv(h: number, s = 255, v = 255): number {
  // Adafruit_NeoPixel::ColorHSV maths: hue 0..65535 around the wheel.
  h = (h * 1530 + 32768) / 65536;
  h = Math.trunc(h) % 1530;
  let r: number, g: number, b: number;
  if (h < 510) {
    b = 0;
    if (h < 255) { r = 255; g = h; } else { r = 510 - h; g = 255; }
  } else if (h < 1020) {
    r = 0;
    if (h < 765) { g = 255; b = h - 510; } else { g = 1020 - h; b = 255; }
  } else if (h < 1530) {
    g = 0;
    if (h < 1275) { r = h - 1020; b = 255; } else { r = 255; b = 1530 - h; }
  } else { r = 255; g = 0; b = 0; }
  const v1 = 1 + v;
  const s1 = 1 + s;
  const s2 = 255 - s;
  const ch = (x: number) => ((((x * s1) >> 8) + s2) * v1) >> 8;
  return ((ch(r) & 255) << 16) | ((ch(g) & 255) << 8) | (ch(b) & 255);
}

const NeoPixelClass: LibClass = {
  headers: ['Adafruit_NeoPixel.h'],
  create: (_rt, [n = 1, pin = 6]) => ({ n, pin, px: Array.from({ length: n }, () => 0), bright: 255 }),
  methods: {
    begin: { ret: 'void', fn: (rt, s) => rt.world.setMode(s.pin, 'output') },
    show: {
      ret: 'void',
      fn: (rt, s) => {
        const k = s.bright;
        setPixels(rt, s.pin, s.px.map((c: number) => {
          const f = (x: number) => (k === 255 ? x : (x * (k + 1)) >> 8);
          return [f((c >> 16) & 255), f((c >> 8) & 255), f(c & 255)] as [number, number, number];
        }));
      },
    },
    setPixelColor: {
      ret: 'void',
      fn: (_rt, s, a) => {
        const i = Math.trunc(a[0]);
        if (i < 0 || i >= s.n) return;
        s.px[i] = a.length >= 4 ? ((a[1] & 255) << 16) | ((a[2] & 255) << 8) | (a[3] & 255) : a[1] >>> 0;
      },
    },
    getPixelColor: { ret: 'uint32_t', pure: true, fn: (_rt, s, [i]) => s.px[i] ?? 0 },
    fill: { ret: 'void', fn: (_rt, s, [c = 0, first = 0, count = 0]) => { for (let i = first; i < (count ? first + count : s.n); i++) s.px[i] = c >>> 0; } },
    clear: { ret: 'void', fn: (_rt, s) => s.px.fill(0) },
    setBrightness: { ret: 'void', fn: (_rt, s, [b]) => void (s.bright = b & 255) },
    getBrightness: { ret: 'uint8_t', pure: true, fn: (_rt, s) => s.bright },
    numPixels: { ret: 'uint16_t', pure: true, fn: (_rt, s) => s.n },
    Color: { ret: 'uint32_t', pure: true, fn: (_rt, _s, [r, g, b]) => (((r & 255) << 16) | ((g & 255) << 8) | (b & 255)) >>> 0 },
    ColorHSV: { ret: 'uint32_t', pure: true, fn: (_rt, _s, [h, sat, val]) => hsv(h & 0xffff, sat ?? 255, val ?? 255) >>> 0 },
    gamma32: { ret: 'uint32_t', pure: true, fn: (_rt, _s, [c]) => c >>> 0 },
  },
};

// SSD1306 with the Adafruit_GFX text cursor rules (6x8 cells per text size).
interface Oled {
  w: number;
  h: number;
  addr: number;
  cx: number;
  cy: number;
  size: number;
  color: number;
  buf: Uint8Array;
}
const oledDev = (rt: ArduinoRt) => rt.world.oled;
function oledPixel(o: Oled, x: number, y: number, c: number): void {
  x = Math.trunc(x);
  y = Math.trunc(y);
  if (x < 0 || y < 0 || x >= o.w || y >= o.h) return;
  const i = y * o.w + x;
  o.buf[i] = c === 2 ? o.buf[i] ^ 1 : c ? 1 : 0;
}
function oledText(rt: ArduinoRt, o: Oled, text: string): void {
  // Adafruit_GFX cursor rules: 6x8 px cells per text size, wrap at the right edge.
  const texts = rt.world.oled?.texts;
  let run = '';
  let rx = o.cx;
  let ry = o.cy;
  const flush = () => {
    if (run && texts) texts.push({ x: rx, y: ry, size: o.size, color: o.color, text: run });
    run = '';
  };
  for (const ch of text) {
    if (ch === '\r') continue;
    if (ch === '\n') {
      flush();
      o.cx = 0;
      o.cy += 8 * o.size;
      rx = o.cx;
      ry = o.cy;
      continue;
    }
    if (o.cx + 6 * o.size > o.w) {
      flush();
      o.cx = 0;
      o.cy += 8 * o.size;
      rx = o.cx;
      ry = o.cy;
    }
    if (!run) {
      rx = o.cx;
      ry = o.cy;
    }
    run += ch;
    o.cx += 6 * o.size;
  }
  flush();
}

const Ssd1306Class: LibClass = {
  headers: ['Adafruit_SSD1306.h'],
  create: (rt, [w = 128, h = 64]) => {
    const o: Oled = { w, h, addr: 0x3c, cx: 0, cy: 0, size: 1, color: 1, buf: new Uint8Array(w * h) };
    return o;
  },
  methods: {
    begin: {
      ret: 'bool',
      fn: (rt, o: Oled, [, addr = 0x3c]) => {
        o.addr = addr;
        if (!rt.world.i2c.has(addr)) rt.world.addDevice(new Ssd1306(addr, o.w, o.h));
        const d = oledDev(rt);
        if (!d) return 0;
        d.on = true;
        o.buf = d.fb;
        rt.world.touch();
        return 1;
      },
    },
    clearDisplay: { ret: 'void', fn: (rt, o: Oled) => { o.buf.fill(0); o.cx = 0; o.cy = 0; if (rt.world.oled) rt.world.oled.texts = []; } },
    display: { ret: 'void', fn: (rt) => rt.world.touch() },
    setTextSize: { ret: 'void', fn: (_rt, o: Oled, [s]) => void (o.size = Math.max(1, Math.trunc(s))) },
    setTextColor: { ret: 'void', fn: (_rt, o: Oled, [c]) => void (o.color = c) },
    setCursor: { ret: 'void', fn: (_rt, o: Oled, [x, y]) => { o.cx = Math.trunc(x); o.cy = Math.trunc(y); } },
    print: { ret: 'size_t', fn: (rt, o: Oled, a, ts) => { const s = fmtArgs(rt, a, ts); oledText(rt, o, s); return s.length; } },
    println: { ret: 'size_t', fn: (rt, o: Oled, a, ts) => { const s = fmtArgs(rt, a, ts); oledText(rt, o, s + '\n'); return s.length + 1; } },
    drawPixel: { ret: 'void', fn: (_rt, o: Oled, [x, y, c]) => oledPixel(o, x, y, c) },
    drawLine: {
      ret: 'void',
      fn: (_rt, o: Oled, [x0, y0, x1, y1, c]) => {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let i = 0; i <= n; i++) oledPixel(o, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
      },
    },
    drawRect: {
      ret: 'void',
      fn: (_rt, o: Oled, [x, y, w, h, c]) => {
        for (let i = 0; i < w; i++) { oledPixel(o, x + i, y, c); oledPixel(o, x + i, y + h - 1, c); }
        for (let j = 0; j < h; j++) { oledPixel(o, x, y + j, c); oledPixel(o, x + w - 1, y + j, c); }
      },
    },
    fillRect: { ret: 'void', fn: (_rt, o: Oled, [x, y, w, h, c]) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) oledPixel(o, x + i, y + j, c); } },
    drawCircle: {
      ret: 'void',
      fn: (_rt, o: Oled, [cx, cy, r, c]) => {
        for (let a = 0; a < 360; a += 2) oledPixel(o, Math.round(cx + r * Math.cos((a * Math.PI) / 180)), Math.round(cy + r * Math.sin((a * Math.PI) / 180)), c);
      },
    },
    fillCircle: { ret: 'void', fn: (_rt, o: Oled, [cx, cy, r, c]) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) oledPixel(o, cx + x, cy + y, c); } },
    invertDisplay: { ret: 'void', fn: (rt, _o, [v]) => { const d = oledDev(rt); if (d) d.inverted = !!v; rt.world.touch(); } },
    width: { ret: 'int', pure: true, fn: (_rt, o: Oled) => o.w },
    height: { ret: 'int', pure: true, fn: (_rt, o: Oled) => o.h },
    setRotation: { ret: 'void', fn: () => undefined },
    dim: { ret: 'void', fn: (rt, _o, [v]) => { const d = oledDev(rt); if (d) d.contrast = v ? 0 : 0x7f; } },
  },
};

/** The library's setPWMFreq(): PRE_SCALE takes a write only while the chip sleeps, so sleep, set it, wake with auto-increment. */
function setPwmFreq(rt: ArduinoRt, addr: number, hz: number): void {
  const f = Math.max(24, Math.min(1526, hz));
  const pre = Math.round(25_000_000 / (4096 * f)) - 1;
  rt.world.i2cWrite(addr, [0x00, 0x30]);
  rt.world.i2cWrite(addr, [0xfe, pre]);
  rt.world.i2cWrite(addr, [0x00, 0x20]);
}

const PwmDriverClass: LibClass = {
  headers: ['Adafruit_PWMServoDriver.h'],
  create: (_rt, [addr = 0x40]) => ({ addr }),
  methods: {
    begin: {
      ret: 'bool',
      fn: (rt, s) => {
        if (!rt.world.i2c.has(s.addr)) rt.world.addDevice(new Pca9685(s.addr));
        // The library's begin() resets the chip and sets a 1 kHz frame (1017 Hz after rounding): a servo needs
        // setPWMFreq(50) after it.
        setPwmFreq(rt, s.addr, 1000);
        return 1;
      },
    },
    setPWMFreq: { ret: 'void', fn: (rt, s, [hz]) => setPwmFreq(rt, s.addr, hz) },
    setOscillatorFrequency: { ret: 'void', fn: () => undefined },
    setPWM: {
      ret: 'uint8_t',
      fn: (rt, s, [ch, on, off]) => {
        const b = 0x06 + 4 * (ch & 15);
        const ok = rt.world.i2cWrite(s.addr, [b, on & 0xff, (on >> 8) & 0x1f, off & 0xff, (off >> 8) & 0x1f]);
        return ok ? 0 : 2;
      },
    },
    setPin: {
      ret: 'void',
      fn: (rt, s, [ch, val, invert]) => {
        let v = Math.min(Math.max(0, val), 4095);
        if (invert) v = 4095 - v;
        const b = 0x06 + 4 * (ch & 15);
        if (v === 4095) rt.world.i2cWrite(s.addr, [b, 0, 0x10, 0, 0]);
        else if (v === 0) rt.world.i2cWrite(s.addr, [b, 0, 0, 0, 0x10]);
        else rt.world.i2cWrite(s.addr, [b, 0, 0, v & 0xff, v >> 8]);
      },
    },
    writeMicroseconds: {
      ret: 'void',
      fn: (rt, s, [ch, us]) => {
        const dev = rt.world.i2c.get(s.addr) as Pca9685 | undefined;
        const hz = dev?.hz ?? 50;
        const ticks = Math.round((us * hz * 4096) / 1_000_000);
        const b = 0x06 + 4 * (ch & 15);
        rt.world.i2cWrite(s.addr, [b, 0, 0, ticks & 0xff, (ticks >> 8) & 0x0f]);
      },
    },
  },
};

interface LcdObj {
  addr: number;
  cols: number;
  rows: number;
  parallel: boolean;
}
function lcdModel(rt: ArduinoRt, l: LcdObj) {
  if (!rt.world.lcd) rt.world.lcd = { cols: l.cols, rows: l.rows, text: Array.from({ length: l.rows }, () => ' '.repeat(l.cols)), backlight: l.parallel, cursor: [0, 0] };
  return rt.world.lcd;
}
function lcdPrint(rt: ArduinoRt, l: LcdObj, s: string): void {
  const m = lcdModel(rt, l);
  for (const ch of s) {
    const [c, r] = m.cursor;
    if (r < m.rows && c < 40) {
      if (c < m.cols) m.text[r] = m.text[r].slice(0, c) + ch + m.text[r].slice(c + 1);
      m.cursor = [c + 1, r];
    }
  }
  rt.world.touch();
}
const lcdMethods: Record<string, LibMethod> = {
  init: { ret: 'void', fn: (rt, l: LcdObj) => { if (!l.parallel && !rt.world.i2c.has(l.addr)) rt.world.addDevice(new Lcd1602(l.addr, l.cols, l.rows)); lcdModel(rt, l); } },
  begin: { ret: 'void', fn: (rt, l: LcdObj, [c, r]) => { if (c) { l.cols = c; l.rows = r ?? 2; } if (!l.parallel && !rt.world.i2c.has(l.addr)) rt.world.addDevice(new Lcd1602(l.addr, l.cols, l.rows)); lcdModel(rt, l); } },
  backlight: { ret: 'void', fn: (rt, l: LcdObj) => { lcdModel(rt, l).backlight = true; rt.world.i2cWrite(l.addr, [0x08]); rt.world.touch(); } },
  noBacklight: { ret: 'void', fn: (rt, l: LcdObj) => { lcdModel(rt, l).backlight = false; rt.world.i2cWrite(l.addr, [0x00]); rt.world.touch(); } },
  clear: { ret: 'void', fn: (rt, l: LcdObj) => { const m = lcdModel(rt, l); m.text = m.text.map(() => ' '.repeat(m.cols)); m.cursor = [0, 0]; rt.world.touch(); } },
  home: { ret: 'void', fn: (rt, l: LcdObj) => void (lcdModel(rt, l).cursor = [0, 0]) },
  setCursor: { ret: 'void', fn: (rt, l: LcdObj, [c, r]) => void (lcdModel(rt, l).cursor = [Math.trunc(c), Math.trunc(r)]) },
  print: { ret: 'size_t', fn: (rt, l: LcdObj, a, ts) => { const s = fmtArgs(rt, a, ts); lcdPrint(rt, l, s); return s.length; } },
  write: { ret: 'size_t', fn: (rt, l: LcdObj, [c]) => { lcdPrint(rt, l, String.fromCharCode(c & 0xff)); return 1; } },
  cursor: { ret: 'void', fn: () => undefined },
  noCursor: { ret: 'void', fn: () => undefined },
  blink: { ret: 'void', fn: () => undefined },
  noBlink: { ret: 'void', fn: () => undefined },
  display: { ret: 'void', fn: () => undefined },
  noDisplay: { ret: 'void', fn: () => undefined },
};
const LcdI2CClass: LibClass = { headers: ['LiquidCrystal_I2C.h'], create: (_rt, [addr = 0x27, cols = 16, rows = 2]) => ({ addr, cols, rows, parallel: false }), methods: lcdMethods };
const LcdClass: LibClass = { headers: ['LiquidCrystal.h'], create: () => ({ addr: -1, cols: 16, rows: 2, parallel: true }), methods: lcdMethods };

// MPU6050 (I2Cdevlib API) over the simulated bus.
function mpuRead(rt: ArduinoRt, addr: number, reg: number, n: number): number[] {
  rt.world.i2cWrite(addr, [reg]);
  return rt.world.i2cRead(addr, n);
}
const s16 = (h: number, l: number) => ((((h << 8) | l) << 16) >> 16);
const MpuClass: LibClass = {
  headers: ['MPU6050.h', 'I2Cdev.h'],
  create: (_rt, [addr = 0x68]) => ({ addr }),
  methods: {
    initialize: { ret: 'void', fn: (rt, s) => { if (!rt.world.i2c.has(s.addr)) rt.world.addDevice(new Mpu6050(s.addr)); rt.world.i2cWrite(s.addr, [0x6b, 0x01]); } },
    testConnection: { ret: 'bool', pure: true, fn: (rt, s) => (mpuRead(rt, s.addr, 0x75, 1)[0] === 0x68 ? 1 : 0) },
    getMotion6: {
      ret: 'void',
      fn: (rt, s, refs: Ref[]) => {
        const b = mpuRead(rt, s.addr, 0x3b, 14);
        const vals = [s16(b[0], b[1]), s16(b[2], b[3]), s16(b[4], b[5]), s16(b[8], b[9]), s16(b[10], b[11]), s16(b[12], b[13])];
        refs.forEach((r, i) => r.set(vals[i]));
      },
    },
    getAcceleration: { ret: 'void', fn: (rt, s, refs: Ref[]) => { const b = mpuRead(rt, s.addr, 0x3b, 6); refs.forEach((r, i) => r.set(s16(b[2 * i], b[2 * i + 1]))); } },
    getRotation: { ret: 'void', fn: (rt, s, refs: Ref[]) => { const b = mpuRead(rt, s.addr, 0x43, 6); refs.forEach((r, i) => r.set(s16(b[2 * i], b[2 * i + 1]))); } },
    getAccelerationX: { ret: 'int16_t', pure: true, fn: (rt, s) => { const b = mpuRead(rt, s.addr, 0x3b, 2); return s16(b[0], b[1]); } },
    getAccelerationY: { ret: 'int16_t', pure: true, fn: (rt, s) => { const b = mpuRead(rt, s.addr, 0x3d, 2); return s16(b[0], b[1]); } },
    getAccelerationZ: { ret: 'int16_t', pure: true, fn: (rt, s) => { const b = mpuRead(rt, s.addr, 0x3f, 2); return s16(b[0], b[1]); } },
    getRotationX: { ret: 'int16_t', pure: true, fn: (rt, s) => { const b = mpuRead(rt, s.addr, 0x43, 2); return s16(b[0], b[1]); } },
    getRotationY: { ret: 'int16_t', pure: true, fn: (rt, s) => { const b = mpuRead(rt, s.addr, 0x45, 2); return s16(b[0], b[1]); } },
    getRotationZ: { ret: 'int16_t', pure: true, fn: (rt, s) => { const b = mpuRead(rt, s.addr, 0x47, 2); return s16(b[0], b[1]); } },
    getTemperature: { ret: 'int16_t', pure: true, fn: (rt, s) => { const b = mpuRead(rt, s.addr, 0x41, 2); return s16(b[0], b[1]); } },
  },
};

// QTR-8RC reflectance array: readings come from analog volts on the sensor pins (0 V white, logic V black).
const QtrClass: LibClass = {
  headers: ['QTRSensors.h'],
  create: () => ({ pins: [] as number[], min: [] as number[], max: [] as number[], last: 3500, type: 'rc' }),
  methods: {
    setTypeRC: { ret: 'void', fn: (_rt, s) => void (s.type = 'rc') },
    setTypeAnalog: { ret: 'void', fn: (_rt, s) => void (s.type = 'analog') },
    setSensorPins: { ret: 'void', fn: (_rt, s, [arr, n]) => void (s.pins = (arr as number[]).slice(0, n)) },
    setEmitterPin: { ret: 'void', fn: () => undefined },
    setTimeout: { ret: 'void', fn: () => undefined },
    calibrate: {
      ret: 'void',
      fn: (rt, s) => {
        const r = qtrRaw(rt, s);
        r.forEach((v: number, i: number) => {
          s.min[i] = Math.min(s.min[i] ?? 2500, v);
          s.max[i] = Math.max(s.max[i] ?? 0, v);
        });
      },
    },
    read: { ret: 'void', fn: (rt, s, [out]) => qtrRaw(rt, s).forEach((v: number, i: number) => ((out as number[])[i] = v)) },
    readCalibrated: { ret: 'void', fn: (rt, s, [out]) => qtrCal(rt, s).forEach((v: number, i: number) => ((out as number[])[i] = v)) },
    readLineBlack: {
      ret: 'uint16_t',
      fn: (rt, s, [out]) => {
        const v = qtrCal(rt, s);
        v.forEach((x: number, i: number) => ((out as number[])[i] = x));
        let num = 0;
        let den = 0;
        let onLine = false;
        v.forEach((x: number, i: number) => {
          if (x > 200) onLine = true;
          if (x > 50) {
            num += x * i * 1000;
            den += x;
          }
        });
        if (!onLine) s.last = s.last < ((v.length - 1) * 1000) / 2 ? 0 : (v.length - 1) * 1000;
        else s.last = Math.round(num / den);
        return s.last;
      },
    },
  },
};
function qtrRaw(rt: ArduinoRt, s: { pins: number[] }): number[] {
  // RC timing: 2500 µs timeout; dark surfaces discharge slowly.
  return s.pins.map((p) => {
    const st = rt.world.pin(p);
    const v = st.volts ?? (st.ext ? rt.world.profile.logicV : 0);
    return Math.round(100 + (v / rt.world.profile.logicV) * 2400);
  });
}
function qtrCal(rt: ArduinoRt, s: { pins: number[]; min: number[]; max: number[] }): number[] {
  return qtrRaw(rt, s).map((v, i) => {
    const lo = s.min[i] ?? 100;
    const hi = s.max[i] ?? 2500;
    return hi > lo ? Math.max(0, Math.min(1000, Math.round(((v - lo) * 1000) / (hi - lo)))) : 0;
  });
}

// Wi-Fi and a small web server --------------------------------------------------------

const wifiStatusCode = (s: string) => ({ idle: 0, no_ssid: 1, connected: 3, wrong_password: 4, connecting: 6, disconnected: 6 })[s] ?? 0;

const WiFiClass: LibClass = {
  headers: ['WiFi.h', 'ESP8266WiFi.h', 'WiFiS3.h'],
  boards: (p) => p.hasWifi,
  create: () => ({ scan: [] as { ssid: string; rssi: number }[] }),
  methods: {
    begin: { ret: 'int', fn: (rt, _s, [ssid, pass]) => { rt.world.wifiConnect(Array.isArray(ssid) ? charsToString(ssid) : String(ssid), pass === undefined ? null : Array.isArray(pass) ? charsToString(pass) : String(pass)); return wifiStatusCode(rt.world.wifi.status); } },
    status: { ret: 'int', pure: true, fn: (rt) => wifiStatusCode(rt.world.wifi.status) },
    isConnected: { ret: 'bool', pure: true, fn: (rt) => (rt.world.wifi.status === 'connected' ? 1 : 0) },
    localIP: { ret: () => ({ k: 'obj', cls: 'IPAddress' }), pure: true, fn: (rt) => ({ ip: rt.world.wifi.ip, toString: () => rt.world.wifi.ip }) },
    RSSI: { ret: 'long', pure: true, fn: (rt, s, [i]) => (i === undefined ? rt.world.wifi.rssi : s.scan[i]?.rssi ?? 0) },
    SSID: { ret: 'String', pure: true, fn: (rt, s, [i]) => (i === undefined ? rt.world.wifi.ssid : s.scan[i]?.ssid ?? '') },
    macAddress: { ret: 'String', pure: true, fn: () => '24:0A:C4:12:34:56' },
    mode: { ret: 'bool', fn: () => 1 },
    disconnect: { ret: 'bool', fn: (rt) => { rt.world.wifiDisconnect(); return 1; } },
    setHostname: { ret: 'bool', fn: () => 1 },
    scanNetworks: {
      ret: 'int',
      gen: function* (rt, s) {
        yield* rt.sleepUntil(rt.world.now + 2_000_000); // an active scan takes about 2 s
        s.scan = rt.world.networks.map((n) => ({ ssid: n.ssid, rssi: n.rssi })).sort((a, b) => b.rssi - a.rssi);
        return s.scan.length;
      },
    },
    encryptionType: { ret: 'int', pure: true, fn: (rt, s, [i]) => (rt.world.networks.find((n) => n.ssid === s.scan[i]?.ssid)?.password === null ? 0 : 3) },
  },
};

const IPAddressClass: LibClass = { headers: [], create: () => ({ ip: '0.0.0.0', toString: () => '0.0.0.0' }), methods: { toString: { ret: 'String', pure: true, fn: (_rt: ArduinoRt, s: { ip: string }) => s.ip } } };

interface WebServer {
  port: number;
  routes: Map<string, unknown>;
  notFound: unknown;
  current: { query: Record<string, string>; path: string; method: string; resolve: (r: { status: number; type: string; body: string }) => void } | null;
}
const WebServerClass: LibClass = {
  headers: ['WebServer.h', 'ESP8266WebServer.h'],
  boards: (p) => p.hasWifi,
  create: (_rt, [port = 80]) => ({ port, routes: new Map(), notFound: null, current: null }) as WebServer,
  methods: {
    on: { ret: 'void', min: 2, fn: (_rt, s: WebServer, a) => void s.routes.set(String(a[0]), a[a.length - 1]) },
    onNotFound: { ret: 'void', fn: (_rt, s: WebServer, [fn]) => void (s.notFound = fn) },
    begin: { ret: 'void', fn: (rt, s: WebServer) => void (rt.world.httpServerPort = s.port) },
    handleClient: {
      ret: 'void',
      fn: (rt, s: WebServer) => {
        const req = rt.world.httpQueue.shift();
        if (!req) return;
        const h = s.routes.get(req.path) ?? s.notFound;
        s.current = req;
        if (!h) {
          req.resolve({ status: 404, type: 'text/plain', body: 'Not found' });
          return;
        }
        rt.runSync(rt.invoke(h));
        if (s.current) req.resolve({ status: 500, type: 'text/plain', body: 'handler sent no response' });
        s.current = null;
      },
    },
    send: {
      ret: 'void',
      fn: (_rt, s: WebServer, [code, type = 'text/plain', body = '']) => {
        s.current?.resolve({ status: code, type: String(type), body: String(body) });
        s.current = null;
      },
    },
    arg: { ret: 'String', pure: true, fn: (_rt, s: WebServer, [name]) => s.current?.query[String(name)] ?? '' },
    hasArg: { ret: 'bool', pure: true, fn: (_rt, s: WebServer, [name]) => (s.current && String(name) in s.current.query ? 1 : 0) },
    uri: { ret: 'String', pure: true, fn: (_rt, s: WebServer) => s.current?.path ?? '' },
  },
};

// Uno R4 WiFi 12x8 LED matrix.
const LedMatrixClass: LibClass = {
  headers: ['Arduino_LED_Matrix.h'],
  boards: (p) => p.id === 'uno-r4' && p.hasWifi,
  create: () => ({}),
  methods: {
    begin: { ret: 'bool', fn: (rt) => { rt.world.matrix = { w: 12, h: 8, px: new Array(96).fill(0) }; rt.world.touch(); return 1; } },
    loadFrame: {
      ret: 'void',
      fn: (rt, _s, [frame]) => {
        const m = (rt.world.matrix ??= { w: 12, h: 8, px: new Array(96).fill(0) });
        const words = frame as number[];
        for (let i = 0; i < 96; i++) m.px[i] = (words[i >> 5] >>> (31 - (i & 31))) & 1;
        rt.world.touch();
      },
    },
    renderBitmap: {
      ret: 'void',
      fn: (rt, _s, [bmp]) => {
        const m = (rt.world.matrix ??= { w: 12, h: 8, px: new Array(96).fill(0) });
        const rows = bmp as number[][];
        for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) m.px[y * 12 + x] = rows[y]?.[x] ? 1 : 0;
        rt.world.touch();
      },
    },
    clear: { ret: 'void', fn: (rt) => { if (rt.world.matrix) rt.world.matrix.px.fill(0); rt.world.touch(); } },
  },
};

const EspClass: LibClass = {
  headers: [],
  create: () => ({}),
  methods: {
    restart: { ret: 'void', gen: function* () { throw new DeepSleep(0); } },
    getFreeHeap: { ret: 'uint32_t', pure: true, fn: () => 281_000 },
    getChipModel: { ret: 'cstr', pure: true, fn: (rt) => (rt.world.profile.id === 'esp32-s3-devkitc-1' ? 'ESP32-S3' : rt.world.profile.id === 'nodemcu' ? 'ESP8266' : 'ESP32-D0WD-V3') },
    getCpuFreqMHz: { ret: 'uint32_t', pure: true, fn: (rt) => rt.world.profile.clockHz / 1e6 },
    getChipId: { ret: 'uint32_t', pure: true, fn: () => 0x00a1b2c3 },
  },
};

export const LIBS: Record<string, LibClass> = {
  HardwareSerial: SerialClass,
  HardwareSerial1: HardwareSerial1Class,
  String: StringClass,
  TwoWire: WireClass,
  SPIClass: SpiClass,
  SPISettings: SPISettingsClass,
  Servo: ServoClass,
  AccelStepper: AccelStepperClass,
  Adafruit_NeoPixel: NeoPixelClass,
  Adafruit_SSD1306: Ssd1306Class,
  Adafruit_PWMServoDriver: PwmDriverClass,
  LiquidCrystal_I2C: LcdI2CClass,
  LiquidCrystal: LcdClass,
  MPU6050: MpuClass,
  Adafruit_BME280: Bme280Class,
  Adafruit_Sensor: SensorClass,
  QTRSensors: QtrClass,
  WiFiClass: WiFiClass,
  IPAddress: IPAddressClass,
  WebServer: WebServerClass,
  ESP8266WebServer: WebServerClass,
  ArduinoLEDMatrix: LedMatrixClass,
  EspClass: EspClass,
};

export const GLOBAL_OBJECTS: Record<string, { cls: string; headers: string[] | null; boards?: (p: BoardProfile) => boolean }> = {
  Serial: { cls: 'HardwareSerial', headers: null },
  Serial1: { cls: 'HardwareSerial1', headers: null, boards: (p) => !isAvr(p) },
  Wire: { cls: 'TwoWire', headers: ['Wire.h'] },
  SPI: { cls: 'SPIClass', headers: ['SPI.h'] },
  WiFi: { cls: 'WiFiClass', headers: ['WiFi.h', 'ESP8266WiFi.h', 'WiFiS3.h'], boards: (p) => p.hasWifi },
  ESP: { cls: 'EspClass', headers: null, boards: isEsp },
};

export { T, hasPwm };

/** Headers of the Arduino core and the C library that need no simulated library behind them. */
const BUILTIN_HEADERS = ['Arduino.h', 'stdint.h', 'stdlib.h', 'string.h', 'math.h', 'stdio.h', 'avr/pgmspace.h', 'avr/io.h'];

/** Headers a simulated library answers to, sorted. */
export const LIBRARY_HEADERS: readonly string[] = [
  ...new Set([...Object.values(LIBS).flatMap((l) => l.headers), ...Object.values(GLOBAL_OBJECTS).flatMap((g) => g.headers ?? [])]),
].sort();

export function knownHeaders(): Set<string> {
  return new Set([...LIBRARY_HEADERS, ...BUILTIN_HEADERS]);
}
